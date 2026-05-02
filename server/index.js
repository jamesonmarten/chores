// FILE: server/index.js
// Minimal Express server for Stripe Checkout + webhook

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

// ─── Raw body for Stripe webhooks (must come BEFORE express.json) ─────────────
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // session.metadata.familyId can be used to grant pro access per family
        console.log('✅ Checkout complete for family:', session.metadata?.familyId);
        // TODO: persist subscription in your DB / Supabase / etc.
        break;
      }
      case 'customer.subscription.deleted': {
        console.log('❌ Subscription cancelled:', event.data.object.id);
        break;
      }
    }
    res.json({ received: true });
  }
);

// ─── JSON body for all other routes ──────────────────────────────────────────
app.use(express.json());

/**
 * POST /create-checkout-session
 * Body: { familyId: string, successUrl: string, cancelUrl: string }
 */
app.post('/create-checkout-session', async (req, res) => {
  const { familyId, successUrl, cancelUrl } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: { familyId: familyId || 'default' },
      success_url: successUrl || `${process.env.CLIENT_URL}/?pro=success`,
      cancel_url:  cancelUrl  || `${process.env.CLIENT_URL}/?pro=cancel`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /pro-status?customerId=xxx
 * Quick check — swap for DB lookup when you have persistence
 */
app.get('/pro-status', async (req, res) => {
  const { customerId } = req.query;
  if (!customerId) return res.json({ isPro: false });

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    res.json({ isPro: subscriptions.data.length > 0 });
  } catch {
    res.json({ isPro: false });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`🚀 Stripe server listening on http://localhost:${PORT}`));
