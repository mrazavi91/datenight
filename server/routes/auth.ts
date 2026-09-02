import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import passport from "../auth";
import { googleAuthEnabled } from "../auth";
import { storage } from "../storage";
import {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  deleteAccountSchema,
  toPublicUser,
} from "../../shared/schema";
import type { User } from "../../shared/schema";
import { requireAuth } from "../middleware";
import { emailEnabled, sendEmail, verificationEmail, resetPasswordEmail, coupleUpdateEmail } from "../email";
import { sendWelcomeEmail } from "../notify";
import { deleteUploadedFile } from "../uploads";
import { PUBLIC_URL } from "../config";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

async function sendVerificationEmail(user: User, origin: string) {
  if (!emailEnabled) return;
  const token = nanoid(32);
  await storage.updateUser(user.id, {
    verificationToken: token,
    verificationTokenExpiresAt: Date.now() + VERIFICATION_TOKEN_TTL_MS,
  });
  const { subject, html } = verificationEmail({ name: user.name, url: `${origin}/verify-email?token=${token}` });
  try {
    await sendEmail({ to: user.email, subject, html });
  } catch {
    // Signup/login shouldn't fail just because the email provider hiccuped.
  }
}

const router = Router();

router.get("/config", (_req, res) => {
  res.json({ googleAuthEnabled, emailEnabled });
});

router.post("/signup", async (req, res, next) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const { name, email, password } = parsed.data;

  try {
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      if (existing.passwordHash) {
        return res.status(409).json({ message: "An account with this email already exists. Try logging in." });
      }
      // Existing Google-only account signing up with a password too: link them.
      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateUser(existing.id, { passwordHash, authProvider: "both" });
      const updated = await storage.getUserById(existing.id);
      return req.login(updated as User, (err) => {
        if (err) return next(err);
        res.status(200).json({ user: toPublicUser(updated as User) });
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({ name, email, passwordHash, authProvider: "email" });
    const origin = `${req.protocol}://${req.get("host")}`;
    await sendVerificationEmail(user, origin);
    await sendWelcomeEmail(user);
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json({ user: toPublicUser(user) });
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  passport.authenticate("local", (err: Error | null, user: User | false, info: { message?: string }) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info?.message ?? "Invalid email or password" });
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.json({ user: toPublicUser(user) });
    });
  })(req, res, next);
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user as User) });
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const user = req.user as User;
  await storage.updateUser(user.id, { name: parsed.data.name });
  const updated = await storage.getUserById(user.id);
  res.json({ user: toPublicUser(updated as User) });
});

router.delete("/me", requireAuth, async (req, res, next) => {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const user = req.user as User;

  await storage.createAccountDeletion({ name: user.name, email: user.email, reason: parsed.data.reason || undefined });
  const { removedPartner, photoFilenames } = await storage.deleteUserAndCascade(user.id);
  photoFilenames.forEach((filename) => deleteUploadedFile(filename));

  if (removedPartner) {
    // Their account is already gone at this point, so there's no notification row to create
    // (nothing left to read it) — a direct email is the only way to reach them.
    await storage.createAccountDeletion({
      name: removedPartner.name,
      email: removedPartner.email,
      reason: `Removed automatically — ${user.name} deleted their MeetYah account`,
    });
    if (emailEnabled) {
      const { subject, html } = coupleUpdateEmail({
        name: removedPartner.name,
        heading: "Your MeetYah couple space has been closed",
        message: `${user.name} deleted their MeetYah account, so your shared couple space — including its date history — has been removed too. You're welcome to sign up again anytime for a fresh start.`,
        url: PUBLIC_URL,
      });
      try {
        await sendEmail({ to: removedPartner.email, subject, html });
      } catch {
        // Best-effort — nothing more to do if this fails, the account is already gone.
      }
    }
  }

  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
});

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  // Always respond the same way regardless of whether the account exists (or has a password
  // to reset), so this endpoint can't be used to check who's registered.
  const user = await storage.getUserByEmail(parsed.data.email);
  if (user && user.passwordHash && emailEnabled) {
    const token = nanoid(32);
    await storage.updateUser(user.id, { resetToken: token, resetTokenExpiresAt: Date.now() + RESET_TOKEN_TTL_MS });
    const origin = `${req.protocol}://${req.get("host")}`;
    const { subject, html } = resetPasswordEmail({ name: user.name, url: `${origin}/reset-password?token=${token}` });
    try {
      await sendEmail({ to: user.email, subject, html });
    } catch {
      // Best-effort — the generic response below doesn't reveal whether this failed.
    }
  }
  res.json({ ok: true });
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const user = await storage.getUserByResetToken(parsed.data.token);
  if (!user) {
    return res.status(404).json({ message: "That reset link isn't valid. It may have already been used." });
  }
  if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < Date.now()) {
    return res.status(410).json({ message: "That reset link has expired. Request a new one." });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await storage.updateUser(user.id, { passwordHash, resetToken: null, resetTokenExpiresAt: null });
  res.json({ ok: true });
});

router.post("/verify-email", async (req, res) => {
  const token = String(req.body?.token || "");
  if (!token) {
    return res.status(400).json({ message: "Missing verification token" });
  }
  const user = await storage.getUserByVerificationToken(token);
  if (!user) {
    return res.status(404).json({ message: "That verification link isn't valid. It may have already been used." });
  }
  if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < Date.now()) {
    return res.status(410).json({ message: "That verification link has expired. Request a new one from your account." });
  }
  await storage.updateUser(user.id, { emailVerifiedAt: Date.now(), verificationToken: null, verificationTokenExpiresAt: null });
  res.json({ ok: true });
});

router.post("/resend-verification", requireAuth, async (req, res) => {
  const user = req.user as User;
  if (!emailEnabled) {
    return res.status(503).json({ message: "Email isn't configured on this server yet." });
  }
  if (user.emailVerifiedAt) {
    return res.status(400).json({ message: "Your email is already confirmed." });
  }
  const origin = `${req.protocol}://${req.get("host")}`;
  await sendVerificationEmail(user, origin);
  res.json({ ok: true });
});

if (googleAuthEnabled) {
  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=google" }),
    (_req, res) => {
      res.redirect("/");
    }
  );
}

export default router;
