# MeetYah — Product Overview

*(Prepared as a handoff brief for marketing. Product name is provisional — "MeetYah" was chosen as a placeholder and can change.)*

## One-liner

MeetYah is the fun, official way for couples — and people who just met — to turn "we should do something" into an actual plan, with a real yes-or-no answer.

## The problem it solves

Plans for a date die in group chats and get lost in the scroll. Calendars are for meetings, not romance. Asking someone out — even a long-term partner — should feel like an invitation, not a logistics negotiation. MeetYah makes sending a date invite feel like a small event in itself: a themed card, a real response (with celebration), and a growing archive of memories together.

## Who it's for

1. **Established couples** who want a low-effort, delightful way to keep planning time together instead of it fizzling out.
2. **People who just met** (a first date, someone met through mutual friends, dating apps, in person) who want to send a low-friction, no-pressure invite without demanding the other person create an account first.

## Core user journeys

### 1. Couples
- Sign up (email/password or Google), then either create a "couple space" and share a 6-character invite code, or join a partner's code.
- Either partner creates a date invitation: title, date, time, location, an emoji "theme," and a personal note.
- Sending costs **£1.99** (or a free "date token" earned previously) — paid via Stripe Checkout.
- The partner **Accepts** 💚 (confetti celebration), **Declines** 💔, or **Proposes a new time** 🔄 (which bounces back to the sender to accept/decline/re-propose — a real negotiation loop, not a dead end).
- Accepted dates land in "Upcoming Dates." Once the date passes, it moves to "Past Dates," where either partner can add a memory note, a 1–5 heart rating, and up to 6 photos — building a private shared archive over time.
- In-app notifications (bell + toast) fire for every new invite, response, and reschedule.

### 2. One-time "first date" invites
- No couple space required — for someone who just met another person and wants to propose a first date.
- Sender enters the other person's email, fills out the same invite details, and pays the same £1.99/token.
- **The recipient needs no account at all** — they get an email with a link to a simple page where they can Accept or Decline directly. This is the key differentiator: zero signup friction for the person being invited.
- It's intentionally a single yes/no (no back-and-forth negotiation) and expires after 14 days if unanswered — matches the "one-time, low-pressure" framing.
- A decline, or the date actually happening, earns the sender a free token toward their next invite.

## Monetization

- **£1.99 per invitation sent** (both the couple flow and the one-time flow), charged via Stripe Checkout.
- **No cash refunds.** Instead, a decline or a date that actually happens earns the sender a "date token" — a free credit redeemable for a future invite. This turns what would be a negative (a decline) into a retention mechanic instead of a refund cost.
- Couple invites and one-time invites use **separate token wallets** (couple tokens are shared between partners; one-time tokens belong to the individual sender, since they may not have a partner yet).

## Brand / design language

- **Name:** MeetYah (working name — open to a rename; several alternatives were explored: Nestled, Cadence, Rendezvu, Amora, Fondly).
- **Aesthetic:** warm, romantic, playful — blush pink / terracotta / cream palette, soft shadows, rounded cards, a friendly rounded display font (Baloo 2 / Quicksand). Deliberately *not* corporate or clinical.
- **Tone:** warm and a little cheeky, never salesy. Copy leans on small delights — confetti, hearts, emoji themes — over hard selling.
- **Emoji as a design element:** invitations get a theme emoji (🍽️ 🎬 🍷 🌅 🎨 🏖️ etc.) chosen by the sender, used throughout the UI as visual shorthand.

## Site structure (what a visitor/marketing page needs to link to)

- `/` — public marketing Home page for signed-out visitors (hero, "how it works" 3-step, feature grid, CTA); becomes the app dashboard once logged in.
- `/about` — brand story / mission page.
- `/support` — contact form (works for signed-in or anonymous visitors).
- `/login`, `/signup` — auth (email/password + optional Google sign-in).
- `/first-date/:token` — the public, no-login-required page a one-time invite recipient lands on.

## Current technical status (relevant for what can be demoed/marketed today)

- **Fully built and functional:** couple pairing, invitations (create/accept/decline/reschedule), memories with photo uploads, in-app notifications, the public marketing pages, one-time first-date invites, email confirmation.
- **Requires the founder to add API keys before going live** (all gracefully disabled with a clear message until configured, not broken):
  - **Stripe** — real payments (currently works in test mode).
  - **Resend** — transactional email (confirmation emails, one-time invite delivery).
  - **Google OAuth** — "Sign in with Google" button.
- **Database:** SQLite currently (fine for early launch on a host with persistent storage; will migrate to Postgres for larger-scale/serverless hosting later).
- **Not yet live on a domain** — currently a dev branch; deployment to a real domain (e.g., meetyah.com) is a pending next step.

## Suggested angles for marketing

- **"No account needed" is the headline feature for the first-date flow** — most invite/scheduling tools require the other person to sign up first; MeetYah's recipient just clicks a link.
- **Confetti/celebration moment** is a natural short-video/social hook (screen-record the accept flow).
- **The token system reframes rejection** — "even a no isn't wasted" is a good, slightly cheeky selling point.
- **Memory archive** (photos + ratings on past dates) is a retention/emotional-attachment hook distinct from purely transactional scheduling apps.
- Competitive framing: it's not a dating app (no swiping/discovery) and not a generic shared calendar (Duet, Twogether, etc. already crowd that space) — it's specifically the *invitation and response* moment, with money and stakes attached (which is itself part of the fun/whimsy — "put a little skin in the game for date night").
