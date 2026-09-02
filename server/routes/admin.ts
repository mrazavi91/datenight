import { Router } from "express";
import { desc } from "drizzle-orm";
import { db } from "../db";
import { users, couples, invitations, oneTimeInvitations, supportRequests, accountDeletions } from "../../shared/schema";

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

export default router;
