// FILE: api/referral.js — POST { referralCode, newEmail }
import { withCors } from './_lib/cors.js';
import { getStore } from './_lib/store.js';

export default withCors(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const { referralCode, newEmail } = req.body || {};
  if (!referralCode || !newEmail) {
    res.status(400).json({ error: 'referralCode and newEmail required' });
    return;
  }
  const store = await getStore();
  await store.sadd(`ref:${referralCode}`, newEmail.toLowerCase());
  const count = await store.scard(`ref:${referralCode}`);
  res.json({ ok: true, count });
});
