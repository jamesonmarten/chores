// FILE: api/webhook.js — Stripe webhook (raw body required)
import { getStripe } from './_lib/stripe.js';

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const raw = await readRawBody(req);
    event = getStripe().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      console.log('✅ Checkout complete for family:', event.data.object.metadata?.familyId);
      break;
    case 'customer.subscription.deleted':
      console.log('❌ Subscription cancelled:', event.data.object.id);
      break;
  }
  res.json({ received: true });
}
