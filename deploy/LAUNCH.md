# Launch runbook — shabboswithadas.com

Everything here is copy-paste; no coding tools needed. Total time: ~40 minutes.
Do the steps in order.

## 1. Database (Neon, free) — 10 min

1. Go to **neon.tech** → sign up (Google login is fine) → "Create project".
   Name it `shabbos`, region **US West (Oregon)**.
2. When the project opens, click **SQL Editor** in the sidebar.
3. Open `deploy/setup.sql` from this repo (on GitHub: tap the file → "Raw" →
   select all → copy). Paste the whole thing into the SQL Editor and click
   **Run**. You should see "Success" — the tables and the commitment list are
   now created.
4. Click **Dashboard** → "Connection string" → copy it (starts with
   `postgresql://`). You'll paste it into Vercel in step 2 as `DATABASE_URL`.

## 2. Hosting (Vercel, free) — 15 min

1. Go to **vercel.com** → sign up **with your GitHub account** → authorize it.
2. "Add New… → Project" → import **danielgof369/adasshabbos**.
3. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `NEXT_PUBLIC_BASE_URL` | `https://shabboswithadas.com` |
   | `ADMIN_PASSWORD` | (the password Claude gave you in chat — or pick your own) |
   | `CRON_SECRET` | (the secret Claude gave you in chat) |

   (Email/Twilio variables can be added later — the site works without them.)
4. Click **Deploy**. ~2 minutes later you'll get a `*.vercel.app` URL —
   open it and confirm the site loads.

## 3. Domain (GoDaddy) — 10 min

1. In Vercel: your project → **Settings → Domains** → add
   `shabboswithadas.com` and `www.shabboswithadas.com`.
2. In GoDaddy: **My Products → shabboswithadas.com → DNS** and add:

   | Type | Name | Value |
   |------|------|-------|
   | A | `@` | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |

   (Delete any existing "Parked" A record on `@` first.)
3. Wait 10–60 minutes; Vercel's Domains page will show a green check when
   it's live. https://shabboswithadas.com now works, with HTTPS automatic.

## 4. Email reminders (Resend, free) — 15 min, can be done later

1. **resend.com** → sign up → **Domains → Add domain** → `shabboswithadas.com`.
2. Resend shows 3–4 DNS records (MX + TXT). Add each one in GoDaddy DNS the
   same way as step 3. Click Verify in Resend (may take a few minutes).
3. **API Keys → Create** → copy the key.
4. In Vercel → Settings → Environment Variables, add:
   - `RESEND_API_KEY` = the key
   - `EMAIL_FROM` = `The Elul Shabbos Project <shabbos@shabboswithadas.com>`
5. Redeploy (Vercel → Deployments → ⋯ → Redeploy). Thursday + Sunday
   reminder emails are now fully automated (schedule is in `vercel.json`,
   9am PT).

## 5. Smoke test — 5 min

- [ ] Homepage loads at shabboswithadas.com, logo showing
- [ ] Sign up a test family (use your own phone/email)
- [ ] The personal link (`/c/…`) opens and shows the family
- [ ] `/admin` opens with the admin password; the test signup is listed
- [ ] Admin → "Send Thursday reminder now" → with Resend configured, the
      email arrives (without it, nothing sends — that's expected)
- [ ] Delete test data before announcing: Neon SQL Editor →
      `DELETE FROM "Household";` (cascades to members/goals)

## Turning on texting later (optional)

Add to Vercel env and redeploy — nothing else changes:
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
(requires an approved A2P 10DLC registration on the Twilio number).

## Adding a collaborator on GitHub

Only the repo owner can do this, from the GitHub website:
**github.com/danielgof369/adasshabbos → Settings → Collaborators →
Add people** → enter their GitHub username → they accept the email invite.
They get push access; the Vercel project stays under your account.
