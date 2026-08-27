# Run the Elul Shabbos Project at YOUR shul — plug-n-play setup

This repo powers shabboswithadas.com (Adas Torah & LINK Kollel, Los Angeles).
It is built to be forked: every shul-specific detail — name, dates, partner,
charity, logos — comes from settings, not code. You can have your own copy
live in about 45 minutes, for **$0/month** on free tiers.

**What your community gets:** family signup (adults & children, multiple
commitments each), automatic Thursday + Motzei Shabbos email reminders with
personal check-in links, streaks, a public "who's joined" wall, a live
shul-wide dashboard, a weekly pizza-raffle tool, and an admin page for it all.

**What you need:** a free GitHub account, a free Vercel account, a free Neon
account, a free Resend account, and a domain (~$12/year — the only real cost;
you can also use the free `yourproject.vercel.app` address to start).

> **Free-tier limits that matter:** Resend's free plan sends 100 emails/day.
> Fine up to ~90 families; beyond that upgrade Resend to Pro ($20/mo for the
> campaign month). Everything else fits free tiers at shul scale.

---

## Step 1 — Get the code (5 min)

1. Ask the Adas team for the repo link, and click **Fork** (or **Use this
   template** if offered) into your own GitHub account.
2. That's it — no code edits needed.

## Step 2 — Create the database (5 min)

1. Sign up at [neon.tech](https://neon.tech) (free tier) and create a project.
2. Open the **SQL Editor**, paste the entire contents of
   [`deploy/new-shul-setup.sql`](./new-shul-setup.sql), and Run. This creates
   all tables and loads the commitment list (you can edit every item later
   from the admin page).
3. From the Neon dashboard, copy the **pooled connection string** (the host
   contains `-pooler`) — you'll paste it into Vercel next.

## Step 3 — Set up email (10 min)

1. Sign up at [resend.com](https://resend.com) (free tier).
2. **Domains → Add Domain** → your domain → add the DNS records Resend shows
   at your domain registrar → wait for "Verified".
3. **API Keys → Create** — copy the key for Vercel.
4. Your sender will be something like
   `The Elul Shabbos Project <shabbos@yourdomain.com>`.

## Step 4 — Deploy on Vercel (10 min)

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account and
   **Import** your forked repo (defaults are fine — it's a Next.js app).
2. Before (or after) the first deploy, open **Settings → Environment
   Variables** and add:

| Variable | Value | Example |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled connection string | `postgresql://...-pooler...` |
| `RESEND_API_KEY` | from Resend | `re_...` |
| `EMAIL_FROM` | your sender | `The Elul Shabbos Project <shabbos@yourdomain.com>` |
| `EMAIL_REPLY_TO` | (optional) where replies go | `office@yourshul.org` |
| `ADMIN_PASSWORD` | password for `/admin` — pick something strong | |
| `CRON_SECRET` | any long random string (protects the reminder crons) | |
| `NEXT_PUBLIC_BASE_URL` | your site's URL | `https://shabboswithyourshul.com` |
| `NEXT_PUBLIC_SHUL_NAME` | your shul's name | `Young Israel of Example` |
| `NEXT_PUBLIC_SHUL_CITY` | city for the footer | `Baltimore` |
| `NEXT_PUBLIC_PARTNER_NAME` | partner org, or `none` | `none` |
| `CAMPAIGN_SHABBOS_DATES` | your campaign Shabbosos, comma-separated | `2026-08-22,2026-08-29,2026-09-05,2026-09-19` |
| `CAMPAIGN_TZ_OFFSET` | your UTC offset during the campaign | `-04:00` (US East) |
| `CAMPAIGN_TIMEZONE` | your IANA timezone | `America/New_York` |

3. **Deployments → Redeploy** so the variables take effect.
4. Your domain: **Settings → Domains → Add**, then set the DNS records Vercel
   shows at your registrar (typically `A @ → 76.76.21.21` and
   `CNAME www → cname.vercel-dns.com`).

The reminder crons (Thursday 9am + Sunday/Tuesday 9am, in the timezone
implied by the cron schedule — see note below) deploy automatically from
`vercel.json`. Vercel calls them with your `CRON_SECRET`; nothing to set up.

> **Cron timing note:** the schedules in `vercel.json` are in UTC
> (`0 16 * * 4` = 16:00 UTC = 9am Pacific). If your shul is elsewhere, edit
> the two `schedule` values in `vercel.json` in your fork (GitHub → edit file
> → commit; Vercel redeploys automatically). E.g. 9am Eastern = `0 13 * * 4`.

## Step 5 — Make it yours (10 min)

1. **Logos:** in your fork, replace `public/logo.png` (color, for light
   backgrounds) and `public/logo-white.png` (white/knockout, for the navy
   header) with your shul's logo. Delete `public/link-logo.png` and
   `public/link-logo-white.png` unless you set a partner. Until you add
   files, a clean text wordmark shows instead — nothing breaks.
2. **Commitment list:** log into `yoursite.com/admin` with your
   `ADMIN_PASSWORD` — every option's text, audience (adult/child), homepage
   counter units, and visibility is editable there. Ten extra ready-made
   ideas ship hidden; toggle them on if you like.
3. **Campaign settings** (also in admin): campaign name, charity name, and
   the $-per-family pledge.
4. **Children's PDF:** `public/shabbos-helpers-guide.pdf` is the kids'
   "Shabbos Helpers Guide" (linked from the homepage and signup). It carries
   Adas branding — replace it with your own version or remove the links in
   `app/page.tsx` / `app/signup/SignupForm.tsx`.
5. **"Why we're doing this"** on the homepage: forks automatically get a
   generic version of this text. If you want your own Rav's framing, edit
   the paragraph in `app/page.tsx`.

## Step 6 — Test before you announce (5 min)

1. Sign up a test family on your live site; confirm the welcome email arrives
   (check spam the first time — it stops once your domain warms up).
2. Open your family page from the email link and check the buttons work.
3. In `/admin`, delete the test family, and press both reminder buttons once
   to confirm sends log (already-sent families are skipped, so this is safe).

## Weekly rhythm during the campaign

- **Thursday & Sunday/Tuesday:** reminder emails go out automatically.
- **Motzei Shabbos:** paste the ready-made WhatsApp blast from `/admin`.
- **Monday night or later:** draw the 🍕 pizza raffle in `/admin` and paste
  the winner announcement.
- Watch the homepage numbers climb. That's it.

## Troubleshooting

- **Site errors after deploy** → almost always a missing/typo'd env var;
  check Vercel → Logs.
- **Emails not arriving** → Resend → Emails tab shows every send + errors;
  a 429 means the free-tier daily cap (upgrade to Pro).
- **"too many connections"** in logs → make sure `DATABASE_URL` is the
  **pooled** Neon string (host contains `-pooler`).
- **Wrong dates/weeks showing** → re-check `CAMPAIGN_SHABBOS_DATES` and
  `CAMPAIGN_TZ_OFFSET`, then Redeploy (env changes need a redeploy).
