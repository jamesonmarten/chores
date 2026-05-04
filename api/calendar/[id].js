// FILE: api/calendar/[id].js
// Handles BOTH:
//   POST /api/calendar/:id        → store events
//   GET  /api/calendar/:id.ics    → return subscribable iCal feed
// Vercel's [id] dynamic segment captures "smoketest.ics" as the literal id;
// we strip the .ics suffix below to decide which behavior to run.

import { withCors } from '../_lib/cors.js';
import { getStore } from '../_lib/store.js';

const pad = n => String(n).padStart(2, '0');
const toDateStamp = d => { const x = new Date(d); return `${x.getFullYear()}${pad(x.getMonth()+1)}${pad(x.getDate())}`; };
const toUtcStamp  = d => { const x = new Date(d); return `${x.getUTCFullYear()}${pad(x.getUTCMonth()+1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}${pad(x.getUTCSeconds())}Z`; };
const escICS = (t='') => String(t).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');

function buildIcs(events) {
  const now = toUtcStamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family Chores & More//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Family Chores',
    'X-PUBLISHED-TTL:PT1H',
  ];
  for (const ev of events) {
    if (!ev?.date || !ev?.uid || !ev?.title) continue;
    const stamp = toDateStamp(ev.date);
    const next  = new Date(ev.date); next.setDate(next.getDate()+1);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}@familychores.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${stamp}`,
      `DTEND;VALUE=DATE:${toDateStamp(next)}`,
      `SUMMARY:${escICS(ev.title)}`,
      ev.description ? `DESCRIPTION:${escICS(ev.description)}` : '',
      ev.kidName     ? `CATEGORIES:${escICS(ev.kidName)}`     : '',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}

export default withCors(async (req, res) => {
  let { id } = req.query;
  const wantsIcs = typeof id === 'string' && id.endsWith('.ics');
  if (wantsIcs) id = id.slice(0, -4);

  const store = await getStore();

  if (req.method === 'POST') {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    await store.set(`cal:${id}`, { events, updatedAt: Date.now() });
    res.json({ ok: true, count: events.length });
    return;
  }

  if (req.method === 'GET' && wantsIcs) {
    const data = await store.get(`cal:${id}`);
    const events = data?.events || [];
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buildIcs(events));
    return;
  }

  res.status(405).json({ error: 'Use POST /api/calendar/:id or GET /api/calendar/:id.ics' });
});
