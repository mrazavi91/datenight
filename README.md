# MeetYah 💕

A web app for couples to send and respond to date invitations — plan a date, your partner accepts, declines, or proposes a new time, with a confetti celebration on acceptance.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS + React Router + TanStack Query, served through Vite
- **Backend:** Node.js + Express, same process as Vite in dev (Vite runs in middleware mode)
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM
- **Auth:** Passport.js — `passport-local` (email/password) and `passport-google-oauth20` (Google sign-in). Signing up with Google using an email that already has a password account links to the same user instead of creating a duplicate.
- **Payments:** Stripe Checkout — sending an invitation costs £1.99, charged to the sender. No real refunds; a decline or a completed date earns a shared "date token" the couple can spend on a future invite instead of paying. **Currently free for everyone** via the `FREE_MODE` launch switch (see below) — the Stripe/token code is all still there, just bypassed until you turn pricing back on.
- **Email:** Resend — account email confirmation (soft reminder, doesn't block usage) and delivering one-time first-date invitations to people who don't have an account.
- **Uploads:** `multer`, storing memory photos on local disk under `data/uploads/` (served at `/uploads/...`) — swap for S3/Cloudinary if you deploy somewhere that needs it.
- **Realtime:** polling (TanStack Query `refetchInterval`) for invitations/notifications — good enough for v1; swap for Socket.io later if needed.

## Getting started

```bash
npm install
cp .env.example .env   # set SESSION_SECRET; Google OAuth vars are optional
npm run dev             # http://localhost:5000
```

Google sign-in is automatically hidden until `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set in `.env`. Create OAuth credentials at the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with authorized redirect URI `http://localhost:5000/api/auth/google/callback`.

The SQLite database and session store are created automatically under `data/` on first run (git-ignored).

### Free launch mode

`FREE_MODE=true` (the default) makes sending any invitation — couple or one-time — free, no Stripe or tokens required. This is meant for the early "get some users first" phase. The site says so wherever it's relevant (Home page badge, Dashboard, the create-invite modals). Date tokens keep accruing in the background exactly as before (a decline, or a date actually happening, still earns one) — they're just not needed to send anything while this is on, so they'll already have a balance once you flip pricing back on.

When you're ready to charge: set `FREE_MODE=false` in your environment and restart. Nothing else changes in the code — the £1.99 Stripe Checkout flow and the "use a token instead" option both come back immediately, exactly as documented below.

### Payments (Stripe)

Only relevant once `FREE_MODE=false`. At that point, sending an invitation is disabled with a clear message until `STRIPE_SECRET_KEY` is also set — there's no free path around it.

1. Create a free account at [dashboard.stripe.com](https://dashboard.stripe.com) (no business verification needed to start in test mode).
2. Grab your **test** keys from [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) and set `STRIPE_SECRET_KEY` in `.env`.
3. Restart `npm run dev`. The "Send invitation" button now redirects to a real Stripe Checkout page. Pay with a [test card](https://docs.stripe.com/testing#cards) like `4242 4242 4242 4242`, any future expiry, any CVC.
4. (Recommended, optional locally) For reliable fulfillment even if the user closes the tab right after paying, run the [Stripe CLI](https://docs.stripe.com/stripe-cli) alongside the dev server:
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```
   It prints a `whsec_...` secret — set that as `STRIPE_WEBHOOK_SECRET` in `.env` and restart. Without it, invitations still get created (via the fallback verification on the page Stripe redirects back to), just without the extra safety net of a webhook. In production, set `STRIPE_WEBHOOK_SECRET` from the webhook endpoint you configure in the Stripe dashboard — the server refuses unverified webhook calls once `NODE_ENV=production`.
5. Go live later by swapping in your Stripe **live** secret key once you've completed Stripe's account activation.

### Email (Resend)

Powers account email confirmation, a welcome email on signup, one-time first-date invitations, and lifecycle notification emails (partner joined, invite sent/accepted/declined/rescheduled, date token earned) — so a partner who isn't sitting in the app finds out by email and can get back to their account.

1. Sign up free at [resend.com](https://resend.com) (no card required).
2. Grab an API key from [resend.com/api-keys](https://resend.com/api-keys) and set `RESEND_API_KEY` in `.env`.
3. **Important:** by default, `EMAIL_FROM` sends from Resend's shared test address (`onboarding@resend.dev`), which can only deliver to your own Resend account email — every other recipient fails silently (the request still succeeds, the email just never arrives). This is the most common reason "email doesn't work" even though `RESEND_API_KEY` is set. Verify your own domain at [resend.com/domains](https://resend.com/domains) (a few DNS records, usually done in minutes) and set `EMAIL_FROM` to a real address on it, like `hello@meetyah.com`, to send to anyone. The server logs a warning on startup if you're still on the shared sandbox address.
4. Restart `npm run dev`.

### One-time first-date invitations

For meeting someone for the first time — no couple space required. Reachable from the Onboarding page (before pairing) or the "+" button's chooser on the Dashboard (after pairing). The sender pays £1.99 (or spends a token) same as a regular invite; the recipient gets an email with a link and can Accept/Decline right from that page — no MeetYah account needed. It's a single yes/no, not a back-and-forth: no reschedule option, and the link expires after 14 days. Declining credits the sender with a token (tracked separately from couple tokens, since the sender may not have a couple yet); so does the date actually happening.

Right after sending, the sender also gets the shareable link itself (`/first-date/:token`) with a share sheet (native share on mobile, plus explicit WhatsApp and copy-link buttons) — useful when email isn't the best way to reach someone, or as a backup if it lands in spam.

### Account settings

Signed-in users get a settings page (gear icon in the header) to change their display name — useful for Google sign-ups, where the name comes pre-filled from Google — and to delete their account. Deleting asks for an optional reason (a quick-pick list or free text, both skippable) before removing the account; if they were paired, their partner keeps the couple space and its history, just unpaired and notified (in-app + email) so they can invite someone new.

Email/password users who forget their password can request a reset link from the login page (`/forgot-password`), same token+expiry pattern as email verification. Google-only accounts don't have a password to reset, so that request is a no-op (the response is identical either way, so the endpoint can't be used to check who's registered).

### Admin page

Set `ADMIN_SECRET` and visit `/admin` to see every user (name, email, auth provider, verified status, couple, token balance), every couple, every invitation (couple and one-time), and support requests — a quick way to check the database without needing a SQLite client. It's gated by that shared secret only, not a real login; leave `ADMIN_SECRET` unset to disable the page entirely.

## Production build

```bash
npm run build
npm start
```

Data (SQLite DB, sessions, uploaded photos) lives under `DATA_DIR` (defaults to `<project root>/data`) — set `DATA_DIR` to wherever your host's persistent volume is mounted. See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the exact step-by-step to get this live on Railway, including the volume and env var setup.

## Project structure

```
client/       React app (Vite root)
server/       Express app, Passport auth, routes, SQLite/Drizzle data layer
shared/       Drizzle schema + Zod validators shared by client and server
```

## Core flow

1. Signed-out visitors land on a marketing Home page (with About/Support in the nav); sign up (email/password or Google) → create a couple space or join one with a 6-character invite code.
2. Either partner creates a date invitation (title, date, time, location, emoji theme, note) and sends it. While `FREE_MODE` is on (the default), that's free; once turned off, sending costs £1.99 via Stripe Checkout, or a date token instead if the couple has one — the invitation is only created once payment (or the token spend) succeeds.
3. The partner accepts 💚, declines 💔, or proposes a new time 🔄 (which goes back to the original sender to accept/decline/re-propose) — no additional charge for responding or rescheduling. A decline credits the sender's couple with a date token (no real refund).
4. Accepted invitations show up under Upcoming Dates (with confetti on accept) and move to Past Dates once the date passes — which also credits the couple with a date token. Either partner can add a memory note, a 1–5 heart rating, and up to 6 photos to a past date — click any photo to view it full-size.
5. In-app notifications (bell + toast) fire on new invites, responses, reschedule proposals, and earned tokens — each one also emails the recipient (when Resend is configured) so they find out even if they're not in the app.
6. A public Support page lets anyone (signed in or not) send a message, stored server-side.
7. Just met someone? Either partner can also send a one-time first-date invite by email — the recipient doesn't need an account to accept or decline, and it's a single yes/no with no reschedule option.
8. Email confirmation: signing up sends a welcome email plus a confirmation link (soft reminder banner if unconfirmed — never blocks using the app).
