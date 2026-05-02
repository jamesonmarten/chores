// FILE: api/pro-status.js  — GET ?customerId=cus_xxx
import { withCors } from './_lib/cors.js';
import { getStripe } from './_lib/stripe.js';

export default withCors(async (req, res) => {
  const customerId = req.query.customerId;
  if (!customerId) { res.json({ isPro: false }); return; }
  try {
    const subs = await getStripe().subscriptions.list({ customer: customerId, status: 'active', limit: 1 });
    res.json({ isPro: subs.data.length > 0 });
  } catch {
    res.json({ isPro: false });
  }
});
