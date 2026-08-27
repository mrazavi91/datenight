import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const emailEnabled = Boolean(apiKey);

const resend = apiKey ? new Resend(apiKey) : null;

const FROM = process.env.EMAIL_FROM || "MeetYah <onboarding@resend.dev>";

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${params.to}: "${params.subject}"`);
    return;
  }
  try {
    // The SDK doesn't throw on API-level failures — it resolves with { data: null, error }.
    const result = await resend.emails.send({ from: FROM, to: params.to, subject: params.subject, html: params.html });
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
