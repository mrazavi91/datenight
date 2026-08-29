import { Router } from "express";
import { storage } from "../storage";
import { supportRequestSchema } from "../../shared/schema";
import type { User } from "../../shared/schema";
import { emailEnabled, sendEmail, supportRequestEmail, supportNotifyEmail } from "../email";

const router = Router();

// Publicly reachable — someone locked out of their account still needs to be able to ask for help.
router.post("/", async (req, res) => {
  const parsed = supportRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const user = req.isAuthenticated?.() ? (req.user as User) : undefined;
  await storage.createSupportRequest({
    userId: user?.id,
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
  });

  if (emailEnabled) {
    const { subject, html } = supportRequestEmail({ name: parsed.data.name, email: parsed.data.email, message: parsed.data.message });
    try {
      await sendEmail({ to: supportNotifyEmail, subject, html, replyTo: parsed.data.email });
    } catch {
      // The request is already saved in the database either way — not fatal for the submitter.
    }
  }

  res.status(201).json({ ok: true });
});

export default router;
