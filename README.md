# Date Night 💕

A web app for couples to send and respond to date invitations — plan a date, your partner accepts, declines, or proposes a new time, with a confetti celebration on acceptance.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS + React Router + TanStack Query, served through Vite
- **Backend:** Node.js + Express, same process as Vite in dev (Vite runs in middleware mode)
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM
- **Auth:** Passport.js — `passport-local` (email/password) and `passport-google-oauth20` (Google sign-in). Signing up with Google using an email that already has a password account links to the same user instead of creating a duplicate.
- **Realtime:** polling (TanStack Query `refetchInterval`) for invitations/notifications — good enough for v1; swap for Socket.io later if needed.

## Getting started

```bash
npm install
cp .env.example .env   # set SESSION_SECRET; Google OAuth vars are optional
npm run dev             # http://localhost:5000
```

Google sign-in is automatically hidden until `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set in `.env`. Create OAuth credentials at the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with authorized redirect URI `http://localhost:5000/api/auth/google/callback`.

The SQLite database and session store are created automatically under `data/` on first run (git-ignored).

## Production build

```bash
npm run build
npm start
```

## Project structure

```
client/       React app (Vite root)
server/       Express app, Passport auth, routes, SQLite/Drizzle data layer
shared/       Drizzle schema + Zod validators shared by client and server
```

## Core flow

1. Sign up (email/password or Google) → create a couple space or join one with a 6-character invite code.
2. Either partner creates a date invitation (title, date, time, location, emoji theme, note).
3. The partner accepts 💚, declines 💔, or proposes a new time 🔄 (which goes back to the original sender to accept/decline/re-propose).
4. Accepted invitations show up under Upcoming Dates (with confetti on accept) and move to Past Dates once the date passes, where either partner can add a memory note and a 1–5 heart rating.
5. In-app notifications (bell + toast) fire on new invites, responses, and reschedule proposals.
