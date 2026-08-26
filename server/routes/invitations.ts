import { Router } from "express";
import { storage } from "../storage";
import { createInvitationSchema, respondInvitationSchema, createMemorySchema } from "../../shared/schema";
import type { User } from "../../shared/schema";
import { requireAuth, requireCouple } from "../middleware";

const router = Router();

router.use(requireAuth, requireCouple);

router.get("/", async (req, res) => {
  const user = req.user as User;
  const list = await storage.getInvitationsForCouple(user.coupleId!);
  res.json({ invitations: list });
});

router.post("/", async (req, res) => {
  const user = req.user as User;
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

  await storage.createNotification({
    userId: partner.id,
    type: "invite_received",
    message: `${user.name} sent you a date invite: "${invite.title}" ${invite.emoji}`,
    invitationId: invite.id,
  });

  res.status(201).json({ invitation: invite });
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
