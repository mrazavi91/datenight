import { stripe } from "./stripe";
import { storage } from "./storage";
import { INVITATION_PRICE_MINOR, INVITATION_PRICE_CURRENCY } from "../shared/schema";
import type { User } from "../shared/schema";

interface PendingInvitationData {
  title: string;
  date: string;
  time: string;
  location?: string;
  note?: string;
  emoji: string;
}

export async function createInvitationCheckoutSession(params: {
  sender: User;
  recipient: User;
  origin: string;
  invitation: PendingInvitationData;
}): Promise<{ url: string }> {
  if (!stripe) {
    throw new Error("Payments are not configured on this server");
  }

  const payment = await storage.createPayment({
    coupleId: params.sender.coupleId!,
    senderId: params.sender.id,
    recipientId: params.recipient.id,
    pendingData: JSON.stringify(params.invitation),
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
            name: `Date invitation: ${params.invitation.title}`,
            description: `Send "${params.invitation.title}" to ${params.recipient.name} on Date Night`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${params.origin}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/?checkout=cancelled`,
    metadata: { paymentId: payment.id },
  });

  await storage.updatePayment(payment.id, { stripeSessionId: session.id });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return { url: session.url };
}

// Idempotent: safe to call from both the webhook and the success-page fallback. Only the
// caller that wins the atomic pending->paid claim creates the invitation; everyone else
// just returns the (possibly not-yet-committed) result of whoever won.
export async function fulfillPayment(paymentId: string): Promise<{ invitationId: string } | null> {
  const payment = await storage.getPaymentById(paymentId);
  if (!payment) return null;

  if (payment.invitationId) {
    return { invitationId: payment.invitationId };
  }

  const won = await storage.claimPaymentForFulfillment(paymentId);
  if (!won) {
    // Another request is fulfilling this payment concurrently; nothing more to do here.
    return null;
  }

  const data = JSON.parse(payment.pendingData) as PendingInvitationData;
  const invite = await storage.createInvitation({
    coupleId: payment.coupleId,
    senderId: payment.senderId,
    recipientId: payment.recipientId,
    title: data.title,
    date: data.date,
    time: data.time,
    location: data.location,
    note: data.note,
    emoji: data.emoji,
  });

  await storage.updatePayment(payment.id, { invitationId: invite.id });

  const sender = await storage.getUserById(payment.senderId);
  await storage.createNotification({
    userId: payment.recipientId,
    type: "invite_received",
    message: `${sender?.name ?? "Your partner"} sent you a date invite: "${invite.title}" ${invite.emoji}`,
    invitationId: invite.id,
  });

  return { invitationId: invite.id };
}
