// FILE: api/calendar/[id].js — POST events array (client pushes on every change)
import { withCors } from '../_lib/cors.js';
import { getStore } from '../_lib/store.js';

export default withCors(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const { id } = req.query;
  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  const store = await getStore();
  await store.set(`cal:${id}`, { events, updatedAt: Date.now() });
  res.json({ ok: true, count: events.length });
});
