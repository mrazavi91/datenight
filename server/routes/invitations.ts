import { Router } from "express";
import { storage } from "../storage";
import {
  createInvitationSchema,
  respondInvitationSchema,
  createMemorySchema,
  INVITATION_PRICE_MINOR,
  INVITATION_PRICE_CURRENCY,
  MAX_MEMORY_PHOTOS,
} from "../../shared/schema";
import type { User } from "../../shared/schema";
import { requireAuth, requireCouple } from "../middleware";
import { paymentsEnabled, stripe } from "../stripe";
import { createInvitationCheckoutSession, fulfillPayment } from "../payments";
import { reconcilePastDateCredits } from "../credits";
import { photoUpload, deleteUploadedFile } from "../uploads";
import { freeMode } from "../pricing";
import { notifyUser } from "../notify";

const router = Router();

// Public: static pricing info, also used by the one-time-invitation flow which doesn't
// require a couple.
router.get("/price", (_req, res) => {
  res.json({ amount: INVITATION_PRICE_MINOR, currency: INVITATION_PRICE_CURRENCY, paymentsEnabled, freeMode });
});

router.use(requireAuth, requireCouple);

router.get("/", async (req, res) => {
  const user = req.user as User;
  await reconcilePastDateCredits(user.coupleId!);
  const list = await storage.getInvitationsForCouple(user.coupleId!);
  res.json({ invitations: list });
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

// Spends one date token instead of paying — same invitation shape as the paid path,
// created directly since there's no external payment to wait on.
router.post("/use-credit", async (req, res) => {
  const user = req.user as User;
  const parsed = createInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const partner = await storage.getPartner(user);
  if (!partner) {
    return res.status(400).json({ message: "Waiting for your partner to join before you can send invitations" });
  }

  const spent = await storage.spendCoupleCredit(user.coupleId!);
  if (!spent) {
    return res.status(400).json({ message: "You don't have any date tokens to spend yet" });
  }

  const invite = await storage.createInvitation({
    coupleId: user.coupleId!,
    senderId: user.id,
    recipientId: partner.id,
    title: parsed.data.title,
    date: parsed.data.date,
    time: parsed.data.time,
    location: parsed.data.location || undefined,
    note: parsed.data.note || undefined,
    emoji: parsed.data.emoji,
    paidWithCredit: true,
  });

  await notifyUser({
    userId: partner.id,
    type: "invite_received",
    message: `${user.name} sent you a date invite: "${invite.title}" ${invite.emoji}`,
    invitationId: invite.id,
  });

  res.status(201).json({ invitation: invite });
});

// Launch mode: sending is free, no payment or token spent. Guarded server-side (not just
// hidden in the UI) so this can't be hit once FREE_MODE is turned off.
router.post("/free", async (req, res) => {
  const user = req.user as User;
  if (!freeMode) {
    return res.status(403).json({ message: "Free sending is turned off — pay or use a date token instead." });
  }
  const parsed = createInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
  }
  const partner = await storage.getPartner(user);
  if (!partner) {
    return res.status(400).json({ message: "Waiting for your partner to join before you can send invitations" });
  }

  const invite = await storage.createInvitation({
    coupleId: user.coupleId!,
    senderId: user.id,
    recipientId: partner.id,
    title: parsed.data.title,
    date: parsed.data.date,
    time: parsed.data.time,
    location: parsed.data.location || undefined,
    note: parsed.data.note || undefined,
    emoji: parsed.data.emoji,
  });

  await notifyUser({
    userId: partner.id,
    type: "invite_received",
    message: `${user.name} sent you a date invite: "${invite.title}" ${invite.emoji}`,
    invitationId: invite.id,
  });

  res.status(201).json({ invitation: invite });
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
    await notifyUser({
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
    // No real refunds — the sender gets a date token back instead, usable on a future invite.
    await storage.incrementCoupleCredits(invite.coupleId, 1);
    await notifyUser({
      userId: otherUserId,
      type: "invite_declined",
      message: `${user.name} declined "${invite.title}"`,
      invitationId: invite.id,
    });
    await notifyUser({
      userId: invite.senderId,
      type: "credit_earned",
      message: `"${invite.title}" was declined, so you got a date token back 🎟️`,
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
  await notifyUser({
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
  const photos = memory ? await storage.getMemoryPhotos(memory.id) : [];
  res.json({ memory: memory ?? null, photos: photos.map((p) => ({ id: p.id, url: `/uploads/${p.filename}` })) });
});

router.post("/:id/memory/photos", async (req, res, next) => {
  const user = req.user as User;
  const invite = await storage.getInvitationById(req.params.id);
  if (!invite || invite.coupleId !== user.coupleId) {
    return res.status(404).json({ message: "Invitation not found" });
  }
  if (invite.status !== "accepted") {
    return res.status(400).json({ message: "Only accepted dates can have photos" });
  }

  photoUpload.array("photos", MAX_MEMORY_PHOTOS)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Couldn't upload those photos" });
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      return res.status(400).json({ message: "No photos received" });
    }

    try {
      const memory = await storage.getOrCreateMemory(invite.id);
      const existingCount = await storage.countMemoryPhotos(memory.id);
      if (existingCount + files.length > MAX_MEMORY_PHOTOS) {
        files.forEach((f) => deleteUploadedFile(f.filename));
        return res.status(400).json({ message: `You can have at most ${MAX_MEMORY_PHOTOS} photos per date` });
      }

      for (const file of files) {
        await storage.addMemoryPhoto({ memoryId: memory.id, filename: file.filename, originalName: file.originalname });
      }

      const photos = await storage.getMemoryPhotos(memory.id);
      res.status(201).json({ photos: photos.map((p) => ({ id: p.id, url: `/uploads/${p.filename}` })) });
    } catch (e) {
      files.forEach((f) => deleteUploadedFile(f.filename));
      next(e);
    }
  });
});

router.delete("/:id/memory/photos/:photoId", async (req, res) => {
  const user = req.user as User;
  const invite = await storage.getInvitationById(req.params.id);
  if (!invite || invite.coupleId !== user.coupleId) {
    return res.status(404).json({ message: "Invitation not found" });
  }
  const memory = await storage.getMemoryByInvitationId(invite.id);
  const photo = memory ? await storage.getMemoryPhotoById(req.params.photoId) : undefined;
  if (!memory || !photo || photo.memoryId !== memory.id) {
    return res.status(404).json({ message: "Photo not found" });
  }

  await storage.deleteMemoryPhoto(photo.id);
  deleteUploadedFile(photo.filename);
  res.json({ ok: true });
});

export default router;
