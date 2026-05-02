// FILE: api/_lib/stripe.js
import Stripe from 'stripe';

let _stripe = null;
let _resolvedPriceId = process.env.STRIPE_PRICE_ID || null;

export function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  _stripe = new Stripe(key);
  return _stripe;
}

export async function resolvePriceId() {
  if (_resolvedPriceId) return _resolvedPriceId;
  const productId = process.env.STRIPE_PRODUCT_ID;
  if (!productId) return null;
  try {
    const prices = await getStripe().prices.list({ product: productId, active: true, limit: 10 });
    const recurring = prices.data.find(p => p.recurring);
    _resolvedPriceId = (recurring || prices.data[0])?.id || null;
    return _resolvedPriceId;
  } catch (err) {
    console.error('Failed to resolve price:', err.message);
    return null;
  }
}
