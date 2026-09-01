# Going live on Railway

This is the exact path to get MeetYah on the internet today, on a free Railway subdomain (e.g. `meetyah-production.up.railway.app`). A custom domain is a 10-minute add-on once you've bought one — see the last section.

I can't create accounts or register domains for you (both need your payment/identity), but everything below that's just clicking through Railway's dashboard, I've written out exactly. If you'd rather I drive it directly, create the Railway project yourself, then go to **Account Settings → Tokens** and paste me a project token — I can run the rest (env vars, volume, redeploys) from here via the Railway CLI.

## 1. Create the Railway project

1. Go to [railway.app](https://railway.app) and sign up (GitHub login is easiest since you're deploying from GitHub anyway).
2. **New Project → Deploy from GitHub repo** → authorize Railway to see your repos → select `mrazavi91/datenight`.
3. When asked for a branch, pick `claude/date-night-web-app-83j5au` (or merge it to `main` first and deploy that — your call; say the word and I'll open that PR).
4. Railway will detect this is a Node app (via `railway.json` and `package.json`) and start a build automatically. Let it fail once — it needs the persistent volume and env vars from the next two steps before it can actually run.

**If the build fails on `better-sqlite3` with a Python/node-gyp error**: Railway picked a Node version too new for `better-sqlite3` to have a prebuilt binary for, so it tried (and failed) to compile it from source. A `.nvmrc` pinning Node 22 is already in the repo, which should make Railway pick the right version automatically — but if it still happens, add one more variable in the **Variables** tab: `NIXPACKS_NODE_VERSION` = `22`, then redeploy.

## 2. Add a persistent volume

Without this, every redeploy wipes the database and every uploaded memory photo. Non-negotiable before real users touch it.

1. In your service, go to the **Volumes** tab → **Add volume**.
2. Mount path: `/data`
3. That's it — the app already knows to look for its data there once you set `DATA_DIR` below.

## 3. Set environment variables

In your service's **Variables** tab, add:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | A long random string — generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste the output in. Don't reuse it anywhere else. |
| `DATA_DIR` | `/data` |
| `NODE_ENV` | `production` |

That's the minimum to run. Everything below is optional, matching what's already documented in the README — add these whenever you're ready for each feature, no redeploy of code needed, just add the variable and restart:

| Variable | Unlocks |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | "Sign in with Google" |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Real payments (only matters once `FREE_MODE=false`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Email confirmation + one-time invites |
| `SUPPORT_NOTIFY_EMAIL` | Already defaults to your email; only set this if you want it to go somewhere else |
| `FREE_MODE` | Defaults to free (`true`). Set to `false` when you're ready to charge. |

Railway sets `PORT` automatically — don't set it yourself.

## 4. Deploy and get your URL

1. Trigger a redeploy (Railway does this automatically when you save variables, or click **Deploy** manually).
2. Once it's live, go to **Settings → Networking → Generate Domain**. You'll get something like `meetyah-production.up.railway.app`.
3. Add one more variable: `PUBLIC_URL` = that URL (with `https://`), so links inside webhook-triggered emails point to the right place. Redeploy once more.
4. Visit the URL. Sign up, pair two test accounts, send an invite — confirm it all works exactly like it did in dev.

## 5. If you set up Google or Stripe later

- **Google OAuth**: add `https://<your-railway-domain>/api/auth/google/callback` (and later your custom domain's version) to the authorized redirect URIs in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
- **Stripe webhook**: once `FREE_MODE=false` and you're taking real payments, add a webhook endpoint in the Stripe dashboard pointing at `https://<your-domain>/api/stripe/webhook`, subscribed to `checkout.session.completed`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.

## 6. Adding a custom domain later

Once you've bought a domain (any registrar — Cloudflare, Namecheap, Google Domains successor Squarespace, etc.):

1. In Railway, go to **Settings → Networking → Custom Domain**, enter your domain (e.g. `meetyah.com` or `app.meetyah.com`).
2. Railway shows you a CNAME record to add at your registrar's DNS settings. Add it there (usually under "DNS" or "Manage DNS").
3. Wait for DNS to propagate (usually minutes, sometimes up to a few hours) — Railway auto-issues an SSL certificate once it verifies the record.
4. Update `PUBLIC_URL` to the new domain and redeploy.
5. If you're using Google OAuth, add the new domain's callback URL in Google Cloud Console too (keep the old Railway one as a fallback, or remove it — your call).

## A note on scale

This is all built on SQLite with a single persistent volume, which means **one Railway instance only** — don't turn on autoscaling or multiple replicas, they'd each get their own disk view and corrupt each other's writes. This is fine for launch; if you outgrow a single instance later, that's the point to migrate to a hosted Postgres (Neon, Supabase, Railway's own Postgres) — ask me when you're there and I'll do the migration.
