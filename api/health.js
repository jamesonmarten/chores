// FILE: api/health.js
import { withCors } from './_lib/cors.js';
import { hasPersistentStore } from './_lib/store.js';

export default withCors(async (_req, res) => {
  res.json({
    ok: true,
    runtime: 'vercel-functions',
    storage: hasPersistentStore() ? 'upstash-redis' : 'memory (ephemeral)',
    priceId:       process.env.STRIPE_PRICE_ID       ? 'set' : (process.env.STRIPE_PRODUCT_ID ? 'product-id-set' : 'missing'),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'missing',
    stripeKey:     process.env.STRIPE_SECRET_KEY     ? 'set' : 'missing',
    clientUrl:     process.env.CLIENT_URL || null,
    time: new Date().toISOString(),
  });
});
