import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const emailEnabled = Boolean(apiKey);

const resend = apiKey ? new Resend(apiKey) : null;

const usingSandboxDomain = !process.env.EMAIL_FROM;
const FROM = process.env.EMAIL_FROM || "MeetYah <onboarding@resend.dev>";

// Where support-form submissions get forwarded. Override with SUPPORT_NOTIFY_EMAIL if you
// want them going somewhere else later.
export const supportNotifyEmail = process.env.SUPPORT_NOTIFY_EMAIL || "mhrazavi99@gmail.com";

if (apiKey && usingSandboxDomain) {
  // Resend's shared onboarding@resend.dev address can only deliver to the Resend account's
  // own verified email — every other recipient fails silently from a user's point of view
  // (signup still "succeeds", no email ever shows up). This is almost always why "email
  // doesn't work" reports come in while support-request emails (always sent to the account
  // owner) keep working fine. Verify a domain at resend.com/domains and set EMAIL_FROM to
  // fix it for everyone, not just yourself.
  console.warn(
    "[email] EMAIL_FROM is not set, so MeetYah is sending from Resend's shared onboarding@resend.dev address. " +
      "That address can only deliver to your own Resend account email — verification, welcome, and invite emails " +
      "to anyone else will silently fail to arrive. Verify a domain at https://resend.com/domains and set EMAIL_FROM " +
      "to a real address on it (e.g. hello@yourdomain.com) to fix this for real users."
  );
}

export async function sendEmail(params: { to: string; subject: string; html: string; replyTo?: string }): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${params.to}: "${params.subject}"`);
    return;
  }
  try {
    // The SDK doesn't throw on API-level failures — it resolves with { data: null, error }.
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });
    if (result.error) {
      throw new Error(`Resend rejected the email: ${result.error.message}`);
    }
  } catch (err) {
    console.error("Failed to send email via Resend", err);
    throw err;
  }
}

function emailShell(bodyHtml: string): string {
  return `
    <div style="font-family: 'Quicksand', 'Nunito', sans-serif; background: #FFF8F0; padding: 32px 16px;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; box-shadow: 0 4px 20px -4px rgba(201,63,94,0.15);">
        <div style="text-align: center; font-size: 32px; margin-bottom: 8px;">💕</div>
        <div style="text-align: center; font-weight: 800; font-size: 20px; color: #B4502A; margin-bottom: 24px;">MeetYah</div>
        ${bodyHtml}
      </div>
      <p style="text-align: center; color: #EC9C74; font-size: 12px; margin-top: 20px;">Sent by MeetYah</p>
    </div>
  `;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display: inline-block; background: linear-gradient(to right, #E4794C, #E35D77); color: white; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; margin-top: 16px;">${label}</a>`;
}

export function verificationEmail(params: { name: string; url: string }): { subject: string; html: string } {
  return {
    subject: "Confirm your email for MeetYah",
    html: emailShell(`
      <p style="color: #8C3D20; font-size: 16px;">Hi ${escapeHtml(params.name)},</p>
      <p style="color: #8C3D20; font-size: 15px; line-height: 1.5;">Welcome to MeetYah! Please confirm your email address to finish setting up your account.</p>
      <div style="text-align: center;">${button(params.url, "Confirm email")}</div>
      <p style="color: #EC9C74; font-size: 13px; margin-top: 20px;">If you didn't sign up for MeetYah, you can safely ignore this email.</p>
    `),
  };
}

export function welcomeEmail(params: { name: string; url: string }): { subject: string; html: string } {
  return {
    subject: "Welcome to MeetYah! 💕",
    html: emailShell(`
      <p style="color: #8C3D20; font-size: 16px;">Hi ${escapeHtml(params.name)},</p>
      <p style="color: #8C3D20; font-size: 15px; line-height: 1.5;">You're in! Create a couple space (or join your partner's with their invite code) and start planning your next date.</p>
      <div style="text-align: center;">${button(params.url, "Go to MeetYah")}</div>
      <p style="color: #EC9C74; font-size: 13px; margin-top: 20px;">It's completely free to send invitations right now — no charge to get started.</p>
    `),
  };
}

// Generic lifecycle-notification email — shared by every couple event (partner joined, an
// invite was sent/accepted/declined/rescheduled, a date token was earned) so each call site
// only has to supply the specific heading/message rather than a bespoke template.
export function coupleUpdateEmail(params: { name: string; heading: string; message: string; url: string }): { subject: string; html: string } {
  return {
    subject: params.heading,
    html: emailShell(`
      <p style="color: #8C3D20; font-size: 16px;">Hi ${escapeHtml(params.name)},</p>
      <p style="color: #8C3D20; font-size: 15px; line-height: 1.5;">${escapeHtml(params.message)}</p>
      <div style="text-align: center;">${button(params.url, "Open MeetYah")}</div>
    `),
  };
}

export function resetPasswordEmail(params: { name: string; url: string }): { subject: string; html: string } {
  return {
    subject: "Reset your MeetYah password",
    html: emailShell(`
      <p style="color: #8C3D20; font-size: 16px;">Hi ${escapeHtml(params.name)},</p>
      <p style="color: #8C3D20; font-size: 15px; line-height: 1.5;">We got a request to reset your MeetYah password. Click below to set a new one — this link expires in an hour.</p>
      <div style="text-align: center;">${button(params.url, "Reset password")}</div>
      <p style="color: #EC9C74; font-size: 13px; margin-top: 20px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `),
  };
}

export function oneTimeInviteEmail(params: {
  senderName: string;
  recipientName?: string;
  title: string;
  url: string;
}): { subject: string; html: string } {
  const greeting = params.recipientName ? `Hi ${escapeHtml(params.recipientName)},` : "Hi,";
  return {
    subject: `${params.senderName} wants to meet up: "${params.title}"`,
    html: emailShell(`
      <p style="color: #8C3D20; font-size: 16px;">${greeting}</p>
      <p style="color: #8C3D20; font-size: 15px; line-height: 1.5;">
        <strong>${escapeHtml(params.senderName)}</strong> sent you a date invitation on MeetYah: <strong>"${escapeHtml(params.title)}"</strong>
      </p>
      <p style="color: #8C3D20; font-size: 15px; line-height: 1.5;">No account needed — just take a look and let them know.</p>
      <div style="text-align: center;">${button(params.url, "View invitation")}</div>
    `),
  };
}

export function oneTimeResponseEmail(params: {
  senderName: string;
  recipientLabel: string;
  title: string;
  accepted: boolean;
}): { subject: string; html: string } {
  const verb = params.accepted ? "said yes to" : "wasn't able to make";
  return {
    subject: params.accepted ? `${params.recipientLabel} said yes! 💚` : `An update on "${params.title}"`,
    html: emailShell(`
      <p style="color: #8C3D20; font-size: 16px;">Hi ${escapeHtml(params.senderName)},</p>
      <p style="color: #8C3D20; font-size: 15px; line-height: 1.5;">
        ${escapeHtml(params.recipientLabel)} ${verb} <strong>"${escapeHtml(params.title)}"</strong>${params.accepted ? " 🎉" : "."}
      </p>
    `),
  };
}

export function supportRequestEmail(params: { name: string; email: string; message: string }): { subject: string; html: string } {
  return {
    subject: `MeetYah support request from ${params.name}`,
    html: emailShell(`
      <p style="color: #8C3D20; font-size: 15px; line-height: 1.5;">
        <strong>${escapeHtml(params.name)}</strong> (${escapeHtml(params.email)}) sent a message from the Support page:
      </p>
      <p style="color: #8C3D20; font-size: 15px; line-height: 1.5; white-space: pre-wrap; background: #FFF1F2; border-radius: 12px; padding: 16px; margin-top: 12px;">${escapeHtml(params.message)}</p>
      <p style="color: #EC9C74; font-size: 13px; margin-top: 20px;">Reply directly to this email to respond to them.</p>
    `),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
