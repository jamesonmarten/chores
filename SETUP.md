# Setup checklist — Family Chores & More

Everything left to wire up production. Estimated total time: **~15 minutes**.

---

## 1. 🔐 Rotate Stripe live keys (do this first — they were shared in plaintext earlier)

1. Go to https://dashboard.stripe.com/apikeys
2. Click **Roll** next to the live secret key (`sk_live_...`)
3. Copy the new **secret key** and the **publishable key**
4. Update `.env` locally:
   ```bash
   STRIPE_SECRET_KEY=sk_live_NEW_VALUE
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_NEW_VALUE
   ```

---

## 2. 💳 Find your Stripe price ID

1. Go to https://dashboard.stripe.com/products
2. Click your **Family Chores Pro $6/mo** product
3. Copy the price ID (starts with `price_...`)
4. Add to `.env`:
   ```bash
   STRIPE_PRICE_ID=price_xxxxxxxxxxxx
   ```

---

## 3. 🪝 Set up the Stripe webhook

1. https://dashboard.stripe.com/webhooks → **Add endpoint**
2. Endpoint URL: `https://your-api-host.com/webhook` (deployed in step 6)
3. Listen for events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
4. Copy the **signing secret** (`whsec_...`) into `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```

---

## 4. 🌐 DNS — point `chores.devcabin.tech` at Vercel

At your domain registrar:

| Type  | Host    | Value          | TTL |
|-------|---------|----------------|-----|
| A     | chores  | `76.76.21.21`  | 300 |

Or (CNAME alternative):

| Type  | Host    | Value                   | TTL |
|-------|---------|-------------------------|-----|
| CNAME | chores  | `cname.vercel-dns.com`  | 300 |

Verify after ~5 minutes:
```bash
dig +short chores.devcabin.tech
```

---

## 5. 🚀 Vercel environment variables

https://vercel.com/jameson-9426s-projects/family-chores-more/settings/environment-variables

Add for **Production**:

| Name                          | Value                                |
|-------------------------------|--------------------------------------|
| `STRIPE_SECRET_KEY`           | `sk_live_...` (step 1)               |
| `STRIPE_WEBHOOK_SECRET`       | `whsec_...` (step 3)                 |
| `STRIPE_PRICE_ID`             | `price_...` (step 2)                 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (step 1)               |
| `VITE_API_URL`                | `https://your-api-host.com` (step 6) |
| `CLIENT_URL`                  | `https://chores.devcabin.tech`       |

Then redeploy:
```bash
cd family-chores-more && npx vercel --prod
```

---

## 6. 🖥️ Deploy the API server

The Express server at `server/index.js` handles `/create-checkout-session`, `/webhook`, `/signup`, `/referral`. Vercel does NOT run it — host it on Render, Railway, or Fly.io.

### Recommended: Render.com (free tier)

1. https://render.com/dashboard → **New → Web Service**
2. Connect the `jamesonmarten/chores` GitHub repo
3. Settings:
   - **Root directory:** `family-chores-more/server`
   - **Build command:** `npm install`
   - **Start command:** `node index.js`
4. Add the same env vars from step 5 (server-side ones — `STRIPE_*`, `CLIENT_URL`)
5. Copy the resulting URL (e.g. `https://family-chores-api.onrender.com`)
6. Update Vercel's `VITE_API_URL` to that URL → redeploy

---

## 7. 🤖 GitHub Actions secrets (for auto-deploy on push)

https://github.com/jamesonmarten/chores/settings/secrets/actions → **New repository secret**

| Name                          | Value                                 | Where |
|-------------------------------|---------------------------------------|---|
| `VERCEL_TOKEN`                | A Vercel access token                 | https://vercel.com/account/tokens |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...`                         | Stripe (step 1) |
| `VITE_API_URL`                | `https://your-api-host.com`           | Step 6 |

---

## 8. 📱 iOS App Store build (optional)

```bash
cd family-chores-more
npm run build
npx cap sync ios
open ios/App/App.xcworkspace
```

In Xcode:
1. Select **App** target → Signing & Capabilities → choose your team
2. Bump build/version number
3. **Product → Archive** → Distribute App → App Store Connect

The `familychores://` URL scheme is already wired in `Info.plist` for Stripe deep-link return.

---

## ✅ Verify

After steps 1–6 are done:

- https://chores.devcabin.tech → clean landing with big DEMO button
- https://chores.devcabin.tech/demo → interactive sandbox (tap chores, see confetti)
- https://chores.devcabin.tech/app → real app, gated behind signup
- Try a signup → check your hosted server's `data/signups.json` for captured fields
- Click **Upgrade $6/mo** → real Stripe checkout opens with your live keys
- Copy your referral link from the dashboard → open it in incognito → sign up → both accounts get `+1 bonus month`
