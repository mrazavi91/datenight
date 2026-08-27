import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import passport from "../auth";
import { googleAuthEnabled } from "../auth";
import { storage } from "../storage";
import { signupSchema, loginSchema, toPublicUser } from "../../shared/schema";
import type { User } from "../../shared/schema";
import { requireAuth } from "../middleware";
import { emailEnabled, sendEmail, verificationEmail } from "../email";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

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
