import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const paymentsEnabled = Boolean(secretKey);

export const stripe = secretKey ? new Stripe(secretKey) : null;

export const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;
