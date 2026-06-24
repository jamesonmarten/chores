# Family Chores & More

A modular, production-ready family chore tracker — Vite + Vanilla JS + Stripe + Capacitor (iOS + Android).

---

## Project Structure

```
src/
  data/         kids.js · tasks.js · eggs.js
  state/        store.js         (localStorage + Pro flag)
  utils/        date.js · helpers.js
  ui/           render.js · stats.js · tasks.js · calendar.js
  stripe/       checkout.js      (Stripe Checkout client)
  pwa/          register.js · deeplink.js
  main.js · style.css
server/
  index.js      (Express: Stripe Checkout + webhook)
ios/            (Capacitor Xcode project)
android/        (Capacitor Android Studio project)
```

---

## 1 — Local Development

```bash
npm install
cp .env.example .env   # fill in your Stripe keys

# Terminal 1 — Vite (port 5174)
npm run dev

# Terminal 2 — Express/Stripe (port 4242)
npm run dev:server
```

Vite proxies `/create-checkout-session`, `/webhook`, and `/pro-status` to port 4242.

---

## 2 — Stripe Setup

1. Create a Stripe account at https://dashboard.stripe.com
2. Create a Recurring price at $6/month — copy the `price_xxx` ID
3. Fill in `.env`:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
CLIENT_URL=https://your-deployed-url.com
```
4. Add a webhook at `https://your-server.com/webhook` and subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.deleted`

---

## 3 — Production Build

```bash
npm run build     # outputs to dist/
npm run preview   # local preview of production build
```

---

## 4 — Mobile Apps via Capacitor (iOS + Android)

### Prerequisites
- macOS + Xcode 15+
- `xcode-select --install`
- `sudo gem install cocoapods`

### First time
```bash
npm run cap:sync:all      # Build web + sync ios/ and android/
npm run cap:open:ios      # Open Xcode project
npm run cap:open:android  # Open Android Studio project
```

### Every web code change
```bash
npm run cap:sync:all
```

### In Xcode
1. Select your iPad device or simulator
2. Bundle ID: `com.devcabin.familychores`
3. Set your Development Team under Signing & Capabilities
4. Press Run

### In Android Studio
1. Open with `npm run cap:open:android`
2. Wait for Gradle sync to finish
3. Set applicationId in `android/app/build.gradle` if needed
4. Select emulator/device and press Run

### Quick commands
```bash
npm run ios      # Build + sync iOS + open Xcode
npm run android  # Build + sync Android + open Android Studio
```

### Stripe on iOS
`@capacitor/browser` opens Stripe Checkout in a native sheet.
On completion Stripe redirects to `familychores://pro?result=success|cancel`
which is caught by the deep-link listener in `src/pwa/deeplink.js`.

---

## 5 — Client Env Vars (Vite)

In `.env.local`:
```
VITE_API_URL=https://your-api-server.com
```
