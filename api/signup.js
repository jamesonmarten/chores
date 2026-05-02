// FILE: api/signup.js
import { withCors } from './_lib/cors.js';
import { getStore } from './_lib/store.js';

export default withCors(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const acct = req.body || {};
  if (!acct.email) { res.status(400).json({ error: 'email required' }); return; }

  const store = await getStore();
  const key = `signup:${acct.email.toLowerCase()}`;
  const existing = await store.get(key);
  if (!existing) {
    await store.set(key, { ...acct, receivedAt: Date.now() });
    await store.lpush('signups:list', acct.email.toLowerCase());
  }
  if (acct.referredBy) {
    await store.sadd(`ref:${acct.referredBy}`, acct.email.toLowerCase());
  }
  res.json({ ok: true });
});
