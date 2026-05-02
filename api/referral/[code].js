// FILE: api/referral/[code].js — GET referral stats
import { withCors } from '../_lib/cors.js';
import { getStore } from '../_lib/store.js';

export default withCors(async (req, res) => {
  const { code } = req.query;
  const store = await getStore();
  const emails = await store.smembers(`ref:${code}`);
  res.json({ count: emails.length, emails });
});
