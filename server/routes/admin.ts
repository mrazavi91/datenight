import { Router } from "express";
import { desc } from "drizzle-orm";
import { db } from "../db";
import { users, couples, invitations, oneTimeInvitations, supportRequests, accountDeletions } from "../../shared/schema";
import { storage } from "../storage";
import { deleteUploadedFile } from "../uploads";
import { emailEnabled, sendEmail, coupleUpdateEmail } from "../email";
import { PUBLIC_URL } from "../config";

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Deliberately not full auth — just a shared secret header, meant for the app owner to peek
// at the database from a simple page, not a real multi-user admin system.
router.use((req, res, next) => {
  if (!ADMIN_SECRET) {
    return res.status(503).json({ message: "Admin panel isn't configured. Set ADMIN_SECRET on the server." });
  }
  if (req.get("x-admin-secret") !== ADMIN_SECRET) {
    return res.status(401).json({ message: "Invalid admin secret" });
  }
  next();
});

router.get("/data", async (_req, res) => {
  const [userRows, coupleRows, invitationRows, oneTimeRows, supportRows, deletionRows] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)).all(),
    db.select().from(couples).orderBy(desc(couples.createdAt)).all(),
    db.select().from(invitations).orderBy(desc(invitations.createdAt)).all(),
    db.select().from(oneTimeInvitations).orderBy(desc(oneTimeInvitations.createdAt)).all(),
    db.select().from(supportRequests).orderBy(desc(supportRequests.createdAt)).all(),
    db.select().from(accountDeletions).orderBy(desc(accountDeletions.createdAt)).all(),
  ]);

  res.json({
    users: userRows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      authProvider: u.authProvider,
      emailVerified: Boolean(u.emailVerifiedAt),
      coupleId: u.coupleId,
      oneTimeCredits: u.oneTimeCredits,
      createdAt: u.createdAt,
    })),
    couples: coupleRows,
    invitations: invitationRows,
    oneTimeInvitations: oneTimeRows,
    supportRequests: supportRows,
    accountDeletions: deletionRows,
  });
});

// Same cascade as a user deleting their own account (server/routes/auth.ts): if the target is
// paired, their partner's account and the whole shared couple space go too — there's no
// well-defined way to delete just one half of a couple's shared history.
router.delete("/users/:id", async (req, res) => {
  const user = await storage.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await storage.createAccountDeletion({ name: user.name, email: user.email, reason: "Deleted by admin" });
  const { removedPartner, photoFilenames } = await storage.deleteUserAndCascade(user.id);
  photoFilenames.forEach((filename) => deleteUploadedFile(filename));

  if (removedPartner) {
    await storage.createAccountDeletion({
      name: removedPartner.name,
      email: removedPartner.email,
      reason: `Removed automatically — ${user.name}'s account was deleted by an admin`,
    });
    if (emailEnabled) {
      const { subject, html } = coupleUpdateEmail({
        name: removedPartner.name,
        heading: "Your MeetYah couple space has been closed",
        message: `${user.name}'s MeetYah account was removed, so your shared couple space — including its date history — has been removed too. You're welcome to sign up again anytime for a fresh start.`,
        url: PUBLIC_URL,
      });
      try {
        await sendEmail({ to: removedPartner.email, subject, html });
      } catch {
        // Best-effort — nothing more to do if this fails, the account is already gone.
      }
    }
  }

  res.json({ ok: true, removedPartner: removedPartner ? { name: removedPartner.name, email: removedPartner.email } : null });
});

export default router;
