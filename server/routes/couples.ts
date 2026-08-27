import { Router } from "express";
import { storage } from "../storage";
import { joinCoupleSchema, toPublicUser } from "../../shared/schema";
import type { User } from "../../shared/schema";
import { requireAuth } from "../middleware";
import { reconcilePastDateCredits } from "../credits";

const router = Router();

router.use(requireAuth);

router.get("/me", async (req, res) => {
  const user = req.user as User;
  if (!user.coupleId) {
    return res.json({ couple: null, partner: null });
  }
  let couple = await storage.getCoupleById(user.coupleId);
  if (!couple) return res.json({ couple: null, partner: null });
  if (couple.user2Id) {
    await reconcilePastDateCredits(couple.id);
    couple = (await storage.getCoupleById(couple.id))!;
  }
  const partner = await storage.getPartner(user);
  res.json({
    couple: { id: couple.id, inviteCode: couple.inviteCode, paired: Boolean(couple.user2Id), credits: couple.credits },
    partner: partner ? toPublicUser(partner) : null,
  });
});

router.post("/create", async (req, res) => {
  const user = req.user as User;
  if (user.coupleId) {
    return res.status(400).json({ message: "You're already in a couple space" });
  }
  const couple = await storage.createCouple(user.id);
  res.status(201).json({ couple: { id: couple.id, inviteCode: couple.inviteCode, paired: false } });
});

router.post("/join", async (req, res) => {
  const user = req.user as User;
  if (user.coupleId) {
    return res.status(400).json({ message: "You're already in a couple space" });
  }
  const parsed = joinCoupleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid invite code" });
  }
  const couple = await storage.getCoupleByInviteCode(parsed.data.inviteCode);
  if (!couple) {
    return res.status(404).json({ message: "Invite code not found" });
  }
  if (couple.user2Id) {
    return res.status(409).json({ message: "This couple space is already full" });
  }
  if (couple.user1Id === user.id) {
    return res.status(400).json({ message: "You can't join your own couple space" });
  }
  await storage.joinCouple(couple.id, user.id);

  const owner = await storage.getUserById(couple.user1Id);
  if (owner) {
    await storage.createNotification({
      userId: owner.id,
      type: "partner_joined",
      message: `${user.name} joined your couple space! 🎉`,
    });
  }

  res.json({ couple: { id: couple.id, inviteCode: couple.inviteCode, paired: true } });
});

export default router;
