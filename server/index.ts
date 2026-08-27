import "dotenv/config";
import express from "express";
import session from "express-session";
import SQLiteStoreFactory from "connect-sqlite3";
import http from "http";
import path from "path";
import passport from "./auth";
import { migrate } from "./db";
import authRoutes from "./routes/auth";
import coupleRoutes from "./routes/couples";
import invitationRoutes from "./routes/invitations";
import notificationRoutes from "./routes/notifications";
import supportRoutes from "./routes/support";
import { setupVite, serveStatic } from "./vite";
import { stripe, webhookSecret } from "./stripe";
import { fulfillPayment } from "./payments";
import { uploadsDir } from "./uploads";
import type Stripe from "stripe";

migrate();

const app = express();

// Stripe requires the raw, unparsed body to verify the webhook signature, so this route
// must be registered before express.json() below.
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(503).end();

  // Without a signing secret we can't tell a real Stripe event from a forged one, since
  // the payload would otherwise be trusted as-is. That's an acceptable trade-off for local
  // dev (the /checkout/complete fallback path always re-verifies with the real Stripe API
  // regardless), but never in production — refuse instead of trusting unverified payloads.
  if (!webhookSecret && process.env.NODE_ENV === "production") {
    console.error("Refusing unverified Stripe webhook call: STRIPE_WEBHOOK_SECRET is not set in production.");
    return res.status(503).end();
  }

  let event: Stripe.Event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"] as string, webhookSecret)
      : (JSON.parse(req.body.toString()) as Stripe.Event);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.client_reference_id;
    if (paymentId && session.payment_status === "paid") {
      try {
        await fulfillPayment(paymentId);
      } catch (err) {
        console.error("Failed to fulfill payment from webhook", err);
      }
    }
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(uploadsDir));

const SQLiteStore = SQLiteStoreFactory(session);
const dataDir = path.resolve(import.meta.dirname, "..", "data");

app.set("trust proxy", 1);
app.use(
  session({
    store: new SQLiteStore({ dir: dataDir, db: "sessions.db" }) as any,
    secret: process.env.SESSION_SECRET || "date-night-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/couples", coupleRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/support", supportRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
});

const server = http.createServer(app);

async function main() {
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Date Night server running on http://localhost:${port}`);
  });
}

main();
