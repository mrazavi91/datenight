import { Router } from "express";
import { storage } from "../storage";
import { createInvitationSchema, respondInvitationSchema, createMemorySchema, INVITATION_PRICE_MINOR, INVITATION_PRICE_CURRENCY } from "../../shared/schema";
import type { User } from "../../shared/schema";
import { requireAuth, requireCouple } from "../middleware";
import { paymentsEnabled, stripe } from "../stripe";
import { createInvitationCheckoutSession, fulfillPayment } from "../payments";

const router = Router();

router.use(requireAuth, requireCouple);

router.get("/", async (req, res) => {
  const user = req.user as User;
  const list = await storage.getInvitationsForCouple(user.coupleId!);
  res.json({ invitations: list });
});

router.get("/price", (_req, res) => {
  res.json({ amount: INVITATION_PRICE_MINOR, currency: INVITATION_PRICE_CURRENCY, paymentsEnabled });
});

// Starts a Stripe Checkout session for £1.99. The invitation itself is only created once
// payment succeeds (via the webhook, or the /checkout/complete fallback below).
router.post("/checkout", async (req, res) => {
  const user = req.user as User;
  if (!paymentsEnabled) {
    return res.status(503).json({ message: "Payments aren't configured on this server yet. Set STRIPE_SECRET_KEY." });
  }
  const parsed = createInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const partner = await storage.getPartner(user);
  if (!partner) {
    return res.status(400).json({ message: "Waiting for your partner to join before you can send invitations" });
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  try {
    const { url } = await createInvitationCheckoutSession({
      sender: user,
      recipient: partner,
      origin,
      invitation: {
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
    console.error("Failed to create checkout session", err);
    res.status(502).json({ message: "Couldn't start checkout with Stripe. Please try again." });
  }
});

// Fallback fulfillment for local dev / when the webhook hasn't landed yet: the browser
// hits this right after Stripe redirects back, so the invite shows up even without a
// webhook configured. The webhook (server/index.ts) is the reliable path in production.
router.get("/checkout/complete", async (req, res) => {
  const user = req.user as User;
  const sessionId = String(req.query.session_id || "");
  if (!sessionId || !stripe) {
    return res.status(400).json({ message: "Missing session" });
  }

  const payment = await storage.getPaymentByStripeSessionId(sessionId);
  if (!payment || payment.coupleId !== user.coupleId) {
    return res.status(404).json({ message: "Checkout session not found" });
  }

  if (!payment.invitationId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return res.status(402).json({ message: "Payment not completed" });
    }
    await fulfillPayment(payment.id);
  }

  // Give a concurrent webhook a brief moment to finish claiming/creating if we lost the race.
  let final = await storage.getPaymentById(payment.id);
  for (let i = 0; i < 5 && final && !final.invitationId; i++) {
    await new Promise((r) => setTimeout(r, 200));
    final = await storage.getPaymentById(payment.id);
  }

  if (!final?.invitationId) {
    return res.status(202).json({ message: "Payment received, still finalizing your invite. Refresh in a moment." });
  }

  const invite = await storage.getInvitationById(final.invitationId);
  res.json({ invitation: invite });
});

router.post("/:id/respond", async (req, res) => {
  const user = req.user as User;
  const invite = await storage.getInvitationById(req.params.id);
  if (!invite || invite.coupleId !== user.coupleId) {
    return res.status(404).json({ message: "Invitation not found" });
  }
  if (invite.awaitingResponseFrom !== user.id) {
    return res.status(403).json({ message: "This invitation isn't waiting on your response" });
  }
  if (invite.status === "accepted" || invite.status === "declined") {
    return res.status(400).json({ message: "This invitation has already been resolved" });
  }

  const parsed = respondInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid response" });
  }

  const otherUserId = invite.senderId === user.id ? invite.recipientId : invite.senderId;

  if (parsed.data.action === "accept") {
    const patch: Partial<typeof invite> = {
      status: "accepted",
      respondedAt: Date.now(),
    };
    if (invite.proposedDate && invite.proposedTime) {
      patch.date = invite.proposedDate;
      patch.time = invite.proposedTime;
    }
    await storage.updateInvitation(invite.id, patch);
    await storage.createNotification({
      userId: otherUserId,
      type: "invite_accepted",
      message: `${user.name} said yes to "${invite.title}"! 💚`,
      invitationId: invite.id,
    });
    const updated = await storage.getInvitationById(invite.id);
    return res.json({ invitation: updated });
  }

  if (parsed.data.action === "decline") {
    await storage.updateInvitation(invite.id, { status: "declined", respondedAt: Date.now() });
    await storage.createNotification({
      userId: otherUserId,
      type: "invite_declined",
      message: `${user.name} declined "${invite.title}"`,
      invitationId: invite.id,
    });
    const updated = await storage.getInvitationById(invite.id);
    return res.json({ invitation: updated });
  }

  // propose new time
  await storage.updateInvitation(invite.id, {
    status: "rescheduled",
    awaitingResponseFrom: otherUserId,
    proposedDate: parsed.data.proposedDate,
    proposedTime: parsed.data.proposedTime,
    proposedNote: parsed.data.proposedNote || null,
    proposedBy: user.id,
  });
  await storage.createNotification({
    userId: otherUserId,
    type: "invite_rescheduled",
    message: `${user.name} proposed a new time for "${invite.title}" 🔄`,
    invitationId: invite.id,
  });
  const updated = await storage.getInvitationById(invite.id);
  res.json({ invitation: updated });
});

router.post("/:id/memory", async (req, res) => {
  const user = req.user as User;
  const invite = await storage.getInvitationById(req.params.id);
  if (!invite || invite.coupleId !== user.coupleId) {
    return res.status(404).json({ message: "Invitation not found" });
  }
  if (invite.status !== "accepted") {
    return res.status(400).json({ message: "Only accepted dates can have a memory" });
  }
  const parsed = createMemorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const memory = await storage.upsertMemory(invite.id, {
    note: parsed.data.note || undefined,
    rating: parsed.data.rating,
  });
  res.json({ memory });
});

router.get("/:id/memory", async (req, res) => {
  const user = req.user as User;
  const invite = await storage.getInvitationById(req.params.id);
  if (!invite || invite.coupleId !== user.coupleId) {
    return res.status(404).json({ message: "Invitation not found" });
  }
  const memory = await storage.getMemoryByInvitationId(invite.id);
  res.json({ memory: memory ?? null });
});

export default router;
