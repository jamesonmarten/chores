// FILE: api/snapshot.js
// Read-only snapshot endpoint for "Grandma view" share links.
// POST { token, snapshot } → stores; GET ?token=... → returns latest snapshot.
// Snapshots TTL ~ 30 days via Upstash; family controls what fields are sent.

import { withCors } from './_lib/cors.js';
import { getStore } from './_lib/store.js';

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const KEY = (t) => `snapshot:${t}`;

function isToken(s) { return typeof s === 'string' && /^[a-z0-9]{8,40}$/i.test(s); }

export default withCors(async (req, res) => {
  const store = await getStore();

  if (req.method === 'POST') {
    const body = req.body || {};
    const { token, snapshot } = body;
    if (!isToken(token) || !snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ error: 'bad_request' });
    }
    // Cap stored payload size
    const payload = JSON.stringify(snapshot);
    if (payload.length > 50_000) {
      return res.status(413).json({ error: 'too_large' });
    }
    const record = { snapshot, updatedAt: Date.now() };
    try {
      // Upstash SDK supports `set(key, val, { ex })` — use plain set then expire if not.
      await store.set(KEY(token), record);
      // Best-effort TTL (memory shim ignores; redis path supports via raw)
      try {
        const { Redis } = await import('@upstash/redis');
        const r = new Redis({
          url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        await r.expire(KEY(token), TTL_SECONDS);
      } catch {}
    } catch (err) {
      return res.status(500).json({ error: 'store_failed', detail: err.message });
    }
    return res.json({ ok: true });
  }

  if (req.method === 'GET') {
    const token = String(req.query?.token || '').trim();
    if (!isToken(token)) return res.status(400).json({ error: 'bad_token' });
    const rec = await store.get(KEY(token));
    if (!rec) return res.status(404).json({ error: 'not_found' });
    return res.json(rec);
  }

  res.status(405).json({ error: 'method_not_allowed' });
});
