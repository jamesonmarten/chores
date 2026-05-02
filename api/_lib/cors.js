// FILE: api/_lib/cors.js
// Permissive CORS — same-origin in prod, but native iOS / dev tools need wildcard.
export function withCors(handler) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin',  process.env.CLIENT_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    return handler(req, res);
  };
}
