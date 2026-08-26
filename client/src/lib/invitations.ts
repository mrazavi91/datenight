import type { Invitation, PublicUser } from "@shared/schema";

export function invitationDateTime(inv: Invitation): Date {
  const date = inv.status === "rescheduled" && inv.proposedDate ? inv.proposedDate : inv.date;
  const time = inv.status === "rescheduled" && inv.proposedTime ? inv.proposedTime : inv.time;
  return new Date(`${date}T${time}`);
}

export function categorize(invitations: Invitation[], userId: string) {
  const now = new Date();

  const pending = invitations.filter((i) => i.status === "pending" || i.status === "rescheduled");
  const awaitingYou = pending.filter((i) => i.awaitingResponseFrom === userId);
  const awaitingPartner = pending.filter((i) => i.awaitingResponseFrom !== userId);

  const accepted = invitations.filter((i) => i.status === "accepted");
  const upcoming = accepted
    .filter((i) => invitationDateTime(i) >= now)
    .sort((a, b) => invitationDateTime(a).getTime() - invitationDateTime(b).getTime());
  const past = accepted
    .filter((i) => invitationDateTime(i) < now)
    .sort((a, b) => invitationDateTime(b).getTime() - invitationDateTime(a).getTime());

  const declined = invitations
    .filter((i) => i.status === "declined")
    .sort((a, b) => (b.respondedAt ?? 0) - (a.respondedAt ?? 0));

  return { awaitingYou, awaitingPartner, upcoming, past, declined };
}

export function otherPersonName(inv: Invitation, userId: string, partner: PublicUser | null): string {
  const isSender = inv.senderId === userId;
  return isSender ? partner?.name ?? "Your partner" : "You";
}

export function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
