import { Router } from "express";
import { storage } from "../storage";
import type { User } from "../../shared/schema";
import { requireAuth } from "../middleware";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const user = req.user as User;
  const list = await storage.getNotificationsForUser(user.id);
  res.json({ notifications: list });
});

router.post("/:id/read", async (req, res) => {
  const user = req.user as User;
  await storage.markNotificationRead(req.params.id, user.id);
  res.json({ ok: true });
});

router.post("/read-all", async (req, res) => {
  const user = req.user as User;
  await storage.markAllNotificationsRead(user.id);
  res.json({ ok: true });
});

export default router;
