// FILE: api/create-checkout-session.js
import { withCors } from './_lib/cors.js';
import { getStripe, resolvePriceId } from './_lib/stripe.js';

export default withCors(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const { familyId = 'default', successUrl, cancelUrl } = req.body || {};

  try {
    const priceId = await resolvePriceId();
    if (!priceId) { res.status(500).json({ error: 'Stripe price ID not configured' }); return; }

    const base = process.env.CLIENT_URL || `https://${req.headers.host}`;
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { familyId },
      success_url: successUrl || `${base}/?pro=success`,
      cancel_url:  cancelUrl  || `${base}/?pro=cancel`,
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
