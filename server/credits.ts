import { storage } from "./storage";
import { notifyUser } from "./notify";

// A date "happened" once its (possibly rescheduled) date/time has passed while still
// accepted. There's no cron here, so this runs lazily whenever a couple's invitations are
// read — cheap at this app's scale, and each award is claimed atomically so re-running it
// concurrently (or repeatedly) never double-credits the same invitation.
export async function reconcilePastDateCredits(coupleId: string): Promise<number> {
  const candidates = await storage.getUnawardedAcceptedInvitations(coupleId);
  const now = Date.now();
  let awarded = 0;

  for (const invite of candidates) {
    const happenedAt = new Date(`${invite.date}T${invite.time}`).getTime();
    if (Number.isNaN(happenedAt) || happenedAt > now) continue;

    const won = await storage.claimCreditAward(invite.id);
    if (!won) continue; // another concurrent reconcile pass already got it

    await storage.incrementCoupleCredits(invite.coupleId, 1);
    awarded++;

    const sender = await storage.getUserById(invite.senderId);
    const recipient = await storage.getUserById(invite.recipientId);
    for (const user of [sender, recipient]) {
      if (!user) continue;
      await notifyUser({
        userId: user.id,
        type: "credit_earned",
        message: `"${invite.title}" happened! You earned a date token 🎟️`,
        invitationId: invite.id,
      });
    }
  }

  return awarded;
}

// Same idea as reconcilePastDateCredits, but for one-time invitations — the token goes to
// the sender's personal (not couple) balance, since the recipient isn't a MeetYah user.
export async function reconcileOneTimeInvitationCredits(senderId: string): Promise<number> {
  const candidates = await storage.getUnawardedAcceptedOneTimeInvitations(senderId);
  const now = Date.now();
  let awarded = 0;

  for (const invite of candidates) {
    const happenedAt = new Date(`${invite.date}T${invite.time}`).getTime();
    if (Number.isNaN(happenedAt) || happenedAt > now) continue;

    const won = await storage.claimOneTimeInvitationCreditAward(invite.id);
    if (!won) continue;

    await storage.incrementOneTimeCredits(invite.senderId, 1);
    awarded++;

    await notifyUser({
      userId: invite.senderId,
      type: "credit_earned",
      message: `"${invite.title}" happened! You earned a date token 🎟️`,
    });
  }

  return awarded;
}
