import { Router } from "express";
import { storage } from "../storage";
import {
  createOneTimeInvitationSchema,
  respondOneTimeInvitationSchema,
  INVITATION_PRICE_MINOR,
  INVITATION_PRICE_CURRENCY,
} from "../../shared/schema";
import type { User } from "../../shared/schema";
import { requireAuth } from "../middleware";
import { paymentsEnabled, stripe } from "../stripe";
import { emailEnabled, sendEmail, oneTimeResponseEmail } from "../email";
import {
  createOneTimeInvitationCheckoutSession,
  createOneTimeInvitationWithCredit,
  createOneTimeInvitationFree,
  fulfillOneTimePayment,
} from "../oneTimeInvitations";
import { reconcileOneTimeInvitationCredits } from "../credits";
import { freeMode } from "../pricing";

const router = Router();

// ----- Public: the recipient never needs an account to respond -----

function publicView(invite: Awaited<ReturnType<typeof storage.getOneTimeInvitationByToken>>, senderName?: string) {
  if (!invite) return null;
  return {
    title: invite.title,
    date: invite.date,
    time: invite.time,
    location: invite.location,
    note: invite.note,
    emoji: invite.emoji,
    status: invite.status,
    senderName: senderName ?? "Someone",
    recipientName: invite.recipientName,
  };
}

router.get("/public/:token", async (req, res) => {
  const invite = await storage.getOneTimeInvitationByToken(req.params.token);
  if (!invite) {
    return res.status(404).json({ message: "This invitation link isn't valid." });
  }
  if (invite.status === "pending" && invite.expiresAt < Date.now()) {
    await storage.updateOneTimeInvitation(invite.id, { status: "expired" });
    invite.status = "expired";
  }
  const sender = await storage.getUserById(invite.senderId);
  res.json({ invitation: publicView(invite, sender?.name) });
});

router.post("/public/:token/respond", async (req, res) => {
  const invite = await storage.getOneTimeInvitationByToken(req.params.token);
  if (!invite) {
    return res.status(404).json({ message: "This invitation link isn't valid." });
  }
  if (invite.status === "expired" || (invite.status === "pending" && invite.expiresAt < Date.now())) {
    if (invite.status !== "expired") {
      await storage.updateOneTimeInvitation(invite.id, { status: "expired" });
    }
    return res.status(410).json({ message: "This invitation has expired." });
  }
  if (invite.status !== "pending") {
    return res.status(400).json({ message: "This invitation has already been responded to." });
  }

  const parsed = respondOneTimeInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid response" });
  }

  const won = await storage.claimOneTimeInvitationResponse(invite.id);
  if (!won) {
    return res.status(400).json({ message: "This invitation has already been responded to." });
  }

  const accepted = parsed.data.action === "accept";
  await storage.updateOneTimeInvitation(invite.id, { status: accepted ? "accepted" : "declined" });

  const sender = await storage.getUserById(invite.senderId);
  const recipientLabel = invite.recipientName || invite.recipientEmail;

  if (sender) {
    await storage.createNotification({
      userId: sender.id,
      type: accepted ? "invite_accepted" : "invite_declined",
      message: accepted
        ? `${recipientLabel} said yes to "${invite.title}"! 💚`
        : `${recipientLabel} couldn't make "${invite.title}"`,
    });

    if (!accepted) {
      // No real refunds — the sender gets a date token back instead.
      await storage.incrementOneTimeCredits(sender.id, 1);
      await storage.createNotification({
        userId: sender.id,
        type: "credit_earned",
        message: `"${invite.title}" was declined, so you got a date token back 🎟️`,
      });
    }

    if (emailEnabled) {
      const { subject, html } = oneTimeResponseEmail({ senderName: sender.name, recipientLabel, title: invite.title, accepted });
      try {
        await sendEmail({ to: sender.email, subject, html });
      } catch {
        // Best-effort; the in-app notification above already carries the news.
      }
    }
  }

  const updated = await storage.getOneTimeInvitationByToken(req.params.token);
  res.json({ invitation: publicView(updated, sender?.name) });
});

// ----- Authenticated: sending a one-time invite -----

router.use(requireAuth);

router.get("/", async (req, res) => {
  const user = req.user as User;
  await reconcileOneTimeInvitationCredits(user.id);
  const list = await storage.getOneTimeInvitationsForSender(user.id);
  res.json({ invitations: list });
});

router.post("/checkout", async (req, res) => {
  const user = req.user as User;
  if (!paymentsEnabled) {
    return res.status(503).json({ message: "Payments aren't configured on this server yet. Set STRIPE_SECRET_KEY." });
  }
  if (!emailEnabled) {
    return res.status(503).json({ message: "Email isn't configured on this server yet, so there's no way to deliver the invite. Set RESEND_API_KEY." });
  }
  const parsed = createOneTimeInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  try {
    const { url } = await createOneTimeInvitationCheckoutSession({
      sender: user,
      origin,
      data: {
        recipientEmail: parsed.data.recipientEmail,
        recipientName: parsed.data.recipientName || undefined,
        title: parsed.data.title,
        date: parsed.data.date,
        time: parsed.data.time,
        location: parsed.data.location || undefined,
        note: parsed.data.note || undefined,
        emoji: parsed.data.emoji,
      },
    });
    res.json({ url });
  } catch (err) {
    console.error("Failed to create one-time invitation checkout session", err);
    res.status(502).json({ message: "Couldn't start checkout with Stripe. Please try again." });
  }
});

router.post("/use-credit", async (req, res) => {
  const user = req.user as User;
  if (!emailEnabled) {
    return res.status(503).json({ message: "Email isn't configured on this server yet, so there's no way to deliver the invite. Set RESEND_API_KEY." });
  }
  const parsed = createOneTimeInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const spent = await storage.spendOneTimeCredit(user.id);
  if (!spent) {
    return res.status(400).json({ message: "You don't have any date tokens to spend yet" });
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  const invite = await createOneTimeInvitationWithCredit({
    sender: user,
    origin,
    data: {
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName || undefined,
      title: parsed.data.title,
      date: parsed.data.date,
      time: parsed.data.time,
      location: parsed.data.location || undefined,
      note: parsed.data.note || undefined,
      emoji: parsed.data.emoji,
    },
  });

  res.status(201).json({ invitation: invite });
});

router.post("/free", async (req, res) => {
  const user = req.user as User;
  if (!freeMode) {
    return res.status(403).json({ message: "Free sending is turned off — pay or use a date token instead." });
  }
  if (!emailEnabled) {
    return res.status(503).json({ message: "Email isn't configured on this server yet, so there's no way to deliver the invite. Set RESEND_API_KEY." });
  }
  const parsed = createOneTimeInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  const invite = await createOneTimeInvitationFree({
    sender: user,
    origin,
    data: {
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName || undefined,
      title: parsed.data.title,
      date: parsed.data.date,
      time: parsed.data.time,
      location: parsed.data.location || undefined,
      note: parsed.data.note || undefined,
      emoji: parsed.data.emoji,
    },
  });

  res.status(201).json({ invitation: invite });
});

router.get("/checkout/complete", async (req, res) => {
  const user = req.user as User;
  const sessionId = String(req.query.session_id || "");
  if (!sessionId || !stripe) {
    return res.status(400).json({ message: "Missing session" });
  }

  const payment = await storage.getOneTimePaymentByStripeSessionId(sessionId);
  if (!payment || payment.senderId !== user.id) {
    return res.status(404).json({ message: "Checkout session not found" });
  }

  const origin = `${req.protocol}://${req.get("host")}`;

  if (!payment.oneTimeInvitationId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return res.status(402).json({ message: "Payment not completed" });
    }
    await fulfillOneTimePayment(payment.id, origin);
  }

  let final = await storage.getOneTimePaymentById(payment.id);
  for (let i = 0; i < 5 && final && !final.oneTimeInvitationId; i++) {
    await new Promise((r) => setTimeout(r, 200));
    final = await storage.getOneTimePaymentById(payment.id);
  }

  if (!final?.oneTimeInvitationId) {
    return res.status(202).json({ message: "Payment received, still finalizing your invite. Refresh in a moment." });
  }

  const invite = await storage.getOneTimeInvitationById(final.oneTimeInvitationId);
  res.json({ invitation: invite });
});

export default router;
