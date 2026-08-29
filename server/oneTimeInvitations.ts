import { nanoid } from "nanoid";
import { stripe } from "./stripe";
import { storage } from "./storage";
import { emailEnabled, sendEmail, oneTimeInviteEmail } from "./email";
import { INVITATION_PRICE_MINOR, INVITATION_PRICE_CURRENCY, ONE_TIME_INVITATION_EXPIRY_DAYS } from "../shared/schema";
import type { User, OneTimeInvitation } from "../shared/schema";

export interface PendingOneTimeInvitationData {
  recipientEmail: string;
  recipientName?: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  note?: string;
  emoji: string;
}

async function createAndSendOneTimeInvitation(params: {
  sender: User;
  data: PendingOneTimeInvitationData;
  origin: string;
  paidWithCredit: boolean;
}): Promise<OneTimeInvitation> {
  const invite = await storage.createOneTimeInvitation({
    senderId: params.sender.id,
    recipientEmail: params.data.recipientEmail,
    recipientName: params.data.recipientName,
    title: params.data.title,
    date: params.data.date,
    time: params.data.time,
    location: params.data.location,
    note: params.data.note,
    emoji: params.data.emoji,
    paidWithCredit: params.paidWithCredit,
    responseToken: nanoid(32),
    expiresAt: Date.now() + ONE_TIME_INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });

  if (emailEnabled) {
    const { subject, html } = oneTimeInviteEmail({
      senderName: params.sender.name,
      recipientName: params.data.recipientName,
      title: invite.title,
      url: `${params.origin}/first-date/${invite.responseToken}`,
    });
    try {
      await sendEmail({ to: invite.recipientEmail, subject, html });
    } catch {
      // The invite still exists even if this particular send failed; not fatal.
    }
  }

  return invite;
}

// Sends the invite immediately by spending a token — no external payment to wait on.
export async function createOneTimeInvitationWithCredit(params: {
  sender: User;
  origin: string;
  data: PendingOneTimeInvitationData;
}): Promise<OneTimeInvitation> {
  return createAndSendOneTimeInvitation({ sender: params.sender, data: params.data, origin: params.origin, paidWithCredit: true });
}

// Launch mode: sends the invite for free, no payment or token spent.
export async function createOneTimeInvitationFree(params: {
  sender: User;
  origin: string;
  data: PendingOneTimeInvitationData;
}): Promise<OneTimeInvitation> {
  return createAndSendOneTimeInvitation({ sender: params.sender, data: params.data, origin: params.origin, paidWithCredit: false });
}

export async function createOneTimeInvitationCheckoutSession(params: {
  sender: User;
  origin: string;
  data: PendingOneTimeInvitationData;
}): Promise<{ url: string }> {
  if (!stripe) {
    throw new Error("Payments are not configured on this server");
  }

  const payment = await storage.createOneTimePayment({
    senderId: params.sender.id,
    pendingData: JSON.stringify(params.data),
    amount: INVITATION_PRICE_MINOR,
    currency: INVITATION_PRICE_CURRENCY,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: payment.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: INVITATION_PRICE_CURRENCY,
          unit_amount: INVITATION_PRICE_MINOR,
          product_data: {
            name: `First-date invitation: ${params.data.title}`,
            description: `Send "${params.data.title}" to ${params.data.recipientEmail} on MeetYah`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${params.origin}/one-time/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/?checkout=cancelled`,
    metadata: { oneTimePaymentId: payment.id },
  });

  await storage.updateOneTimePayment(payment.id, { stripeSessionId: session.id });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return { url: session.url };
}

// Idempotent, same pattern as fulfillPayment for couple invites: only the caller that wins
// the atomic pending->paid claim creates + emails the invite.
export async function fulfillOneTimePayment(paymentId: string, origin: string): Promise<{ invitationId: string } | null> {
  const payment = await storage.getOneTimePaymentById(paymentId);
  if (!payment) return null;

  if (payment.oneTimeInvitationId) {
    return { invitationId: payment.oneTimeInvitationId };
  }

  const won = await storage.claimOneTimePaymentForFulfillment(paymentId);
  if (!won) return null;

  const sender = await storage.getUserById(payment.senderId);
  if (!sender) return null;

  const data = JSON.parse(payment.pendingData) as PendingOneTimeInvitationData;
  const invite = await createAndSendOneTimeInvitation({ sender, data, origin, paidWithCredit: false });

  await storage.updateOneTimePayment(payment.id, { oneTimeInvitationId: invite.id });
  return { invitationId: invite.id };
}
