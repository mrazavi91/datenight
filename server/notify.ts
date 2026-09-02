import { storage } from "./storage";
import { emailEnabled, sendEmail, coupleUpdateEmail, welcomeEmail } from "./email";
import { PUBLIC_URL } from "./config";

// Same subject line per notification type so every call site (couple joined, invite sent,
// accepted, declined, rescheduled, token earned) gets a reasonable email without having to
// supply one itself. Keep these in sync with the `type` values passed to storage.createNotification
// — ToastWatcher.tsx also matches against these strings for its confetti trigger.
const EMAIL_SUBJECTS: Record<string, string> = {
  partner_joined: "Your partner joined MeetYah! 🎉",
  partner_left: "An update about your couple space",
  invite_received: "You've got a new date invite 💌",
  invite_accepted: "Your date invite was accepted! 💚",
  invite_declined: "An update on your date invite",
  invite_rescheduled: "New time proposed for your date 🔄",
  credit_earned: "You earned a date token 🎟️",
};

// Creates the in-app notification and, best-effort, a matching email so a partner who isn't
// sitting in the app right now still finds out and can get back to their account.
export async function notifyUser(params: {
  userId: string;
  type: string;
  message: string;
  invitationId?: string;
}): Promise<void> {
  await storage.createNotification({
    userId: params.userId,
    type: params.type,
    message: params.message,
    invitationId: params.invitationId,
  });

  if (!emailEnabled) return;

  const user = await storage.getUserById(params.userId);
  if (!user) return;

  const { subject, html } = coupleUpdateEmail({
    name: user.name,
    heading: EMAIL_SUBJECTS[params.type] ?? "An update from MeetYah",
    message: params.message,
    url: PUBLIC_URL,
  });
  try {
    await sendEmail({ to: user.email, subject, html });
  } catch {
    // Best-effort — the in-app notification above already carries the news.
  }
}

export async function sendWelcomeEmail(user: { name: string; email: string }): Promise<void> {
  if (!emailEnabled) return;
  const { subject, html } = welcomeEmail({ name: user.name, url: PUBLIC_URL });
  try {
    await sendEmail({ to: user.email, subject, html });
  } catch {
    // Signup shouldn't fail just because the email provider hiccuped.
  }
}
