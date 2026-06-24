# Launch checklist — chores.devcabin.tech

Everything (frontend + API) is hosted on **one Vercel project**. No Render, no second domain.

```
chores.devcabin.tech/                → landing.html
chores.devcabin.tech/app             → index.html (the chore tracker)
chores.devcabin.tech/demo            → demo.html
chores.devcabin.tech/compare         → compare.html
chores.devcabin.tech/api/health      → JSON health check
chores.devcabin.tech/api/signup      → POST signup
chores.devcabin.tech/api/referral    → POST credit referrer
chores.devcabin.tech/api/referral/X  → GET stats
chores.devcabin.tech/api/calendar/:id     → POST events
chores.devcabin.tech/api/calendar/:id.ics → subscribable iCal feed
chores.devcabin.tech/api/create-checkout-session
chores.devcabin.tech/api/webhook     → Stripe webhook
chores.devcabin.tech/api/pro-status
```

---

## 1. Namecheap DNS

Domain List → **devcabin.tech** → Manage → Advanced DNS → add:

| Type  | Host    | Value                    | TTL       |
|-------|---------|--------------------------|-----------|
| CNAME | chores  | `cname.vercel-dns.com`   | Automatic |

Verify with https://www.whatsmydns.net/#CNAME/chores.devcabin.tech.

## 2. Add an Upstash Redis store on Vercel

Vercel dashboard → project **family-chores-more** → **Storage** → **Create Database** → search **Upstash for Redis** (Marketplace) → free tier is fine.

After creation, click **Connect Project** → it auto-injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Upstash also adds `UPSTASH_REDIS_REST_URL` / `_TOKEN` — both are read by `api/_lib/store.js`).

## 3. Stripe (live mode)

1. dashboard.stripe.com → toggle to **Live mode**.
2. Developers → API keys → roll the secret + publishable keys (the previous ones were briefly exposed). Save them.
3. Products → **Add product**: name `Family Chores Pro`, $6.00 USD/month recurring. Copy the resulting `price_…` id.
4. Developers → Webhooks → **Add endpoint**:
   - URL: `https://chores.devcabin.tech/api/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
   - Copy the signing secret (`whsec_…`).

## 4. Vercel project env vars

Project → Settings → Environment Variables → add for **Production**, **Preview**, **Development**:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY`            | `sk_live_…` from step 3.2 |
| `STRIPE_WEBHOOK_SECRET`        | `whsec_…`  from step 3.4 |
| `STRIPE_PRICE_ID`              | `price_…`  from step 3.3 |
| `CLIENT_URL`                   | `https://chores.devcabin.tech` |
| `VITE_STRIPE_PUBLISHABLE_KEY`  | `pk_live_…` from step 3.2 |

> Don't set `VITE_API_URL` — leaving it unset makes the client call `/api` on the same origin, which is what you want.

Trigger a redeploy (Deployments → … → Redeploy) so the new env vars are baked in.

## 5. Verify

```bash
curl https://chores.devcabin.tech/api/health | jq
# expect: { ok: true, storage: "upstash-redis", priceId: "set", webhookSecret: "set", stripeKey: "set", ... }

cd family-chores-more
npm run smoke   # hits all 4 pages + 5 API endpoints
```

## 6. GitHub Actions secrets (optional — for auto-deploy on push)

Repo → Settings → Secrets and variables → Actions:

- `VERCEL_TOKEN` — vercel.com/account/tokens, scope "Full Account"
- `VITE_STRIPE_PUBLISHABLE_KEY` — same `pk_live_…`

(`VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` are hard-coded in `.github/workflows/deploy.yml`.)

## 7. Mobile apps (Capacitor)

The iOS shell loads the **bundled** web assets (offline-friendly), but POSTs/fetches go to `https://chores.devcabin.tech/api`. `src/ui/calendar-sync.js` already detects `Capacitor.isNativePlatform()` and uses the absolute URL.

```bash
cd family-chores-more
npm run cap:sync:all      # build + copy into ios/ + android/
npm run cap:open:ios      # Xcode → set team → Archive → Distribute
npm run cap:open:android  # Android Studio → Generate Signed Bundle/APK
```

### Android release checklist

1. Install Android Studio + SDK + JDK 17.
2. Run `npm run cap:sync:android`.
3. Open Android project with `npm run cap:open:android`.
4. Configure package id/signing in Android Studio.
5. Build an AAB: Build → Generate Signed Bundle / APK → Android App Bundle.
6. Upload AAB to Google Play Console (internal test track first).
7. Verify checkout/deep-link flow on a real Android device.

## 8. Local dev

```bash
# Terminal 1 — Vercel functions on :3000
npx vercel dev

# Terminal 2 — Vite on :5173 (proxies /api → :3000)
npm run dev
```

Without `vercel dev`, the API uses an in-memory store (data lost on restart) — fine for UI work.

---

## Files of interest

- `api/`                   — Vercel serverless functions
- `api/_lib/store.js`      — Upstash Redis shim with memory fallback
- `vercel.json`            — page rewrites (`/`, `/app`, `/demo`, `/compare`)
- `scripts/smoke-test.mjs` — `npm run smoke`
- `.env.example`           — what each env var is for
