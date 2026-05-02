// FILE: src/utils/calendar-export.js
// Generate iCalendar (.ics) feeds and per-event Add-to-Calendar links
// Compatible with Apple Calendar, Google Calendar, Outlook, Fantastical, etc.

function pad(n) { return String(n).padStart(2, '0'); }

// 2026-05-02 → 20260502
function toDateStamp(date) {
  const d = new Date(date);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
// Date → 20260502T140000Z
function toUtcStamp(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
         `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeICS(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function fold(line) {
  // RFC 5545: lines should not exceed 75 octets
  if (line.length <= 73) return line;
  const chunks = [];
  let i = 0;
  chunks.push(line.slice(0, 73));
  i = 73;
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 72));
    i += 72;
  }
  return chunks.join('\r\n');
}

/**
 * Build .ics text from an array of events.
 * @param {Array<{uid:string, title:string, description?:string, date:string, kidName?:string, points?:number}>} events
 * @param {{calendarName?:string}} [opts]
 */
export function buildICS(events, { calendarName = 'Family Chores' } = {}) {
  const now = toUtcStamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family Chores & More//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    `X-WR-TIMEZONE:${Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}`,
  ];

  for (const ev of events) {
    const stamp = toDateStamp(ev.date); // YYYYMMDD for all-day
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}@familychores.app`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${stamp}`);
    // All-day end is exclusive — next day
    const nextDay = new Date(ev.date);
    nextDay.setDate(nextDay.getDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${toDateStamp(nextDay)}`);
    lines.push(fold(`SUMMARY:${escapeICS(ev.title)}`));
    const desc = ev.description ||
      (ev.kidName ? `${ev.kidName}${ev.points ? ` · ${ev.points} pts` : ''}` : '');
    if (desc) lines.push(fold(`DESCRIPTION:${escapeICS(desc)}`));
    if (ev.kidName) lines.push(fold(`CATEGORIES:${escapeICS(ev.kidName)}`));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Convert app state into a flat list of calendar events.
 * Filter by kid IDs (empty array = all kids), include scheduled / completed / both.
 */
export function eventsFromState(state, { kidIds = [], includeCompleted = true, includeUpcoming = true } = {}) {
  const events = [];
  const kids = state.kids.filter(k => kidIds.length === 0 || kidIds.includes(k.id));

  for (const kid of kids) {
    const ks = state.kidData?.[kid.id];
    if (!ks) continue;

    // Completed chores from history
    if (includeCompleted && Array.isArray(ks.history)) {
      for (const h of ks.history) {
        if (!h.task || !h.timestamp) continue;
        events.push({
          uid:         `done-${kid.id}-${h.timestamp}`,
          title:       `✓ ${kid.name}: ${h.task}`,
          description: `${kid.name} completed "${h.task}"`,
          date:        new Date(h.timestamp).toISOString().slice(0, 10),
          kidName:     kid.name,
        });
      }
    }

    // Upcoming = today's tasks not yet done
    if (includeUpcoming) {
      const today = new Date().toISOString().slice(0, 10);
      const tasks = state.tasks?.[kid.id] || [];
      const doneMap = ks.done || {};
      for (const t of tasks) {
        const key = `${t.id}-${today}`;
        if (doneMap[key]) continue;
        events.push({
          uid:         `task-${kid.id}-${t.id}-${today}`,
          title:       `⭐ ${kid.name}: ${t.title}`,
          description: `${t.title} · ${t.pts} pts · ${kid.name}`,
          date:        today,
          kidName:     kid.name,
          points:      t.pts,
        });
      }
    }
  }
  return events;
}

/** Trigger a download of a generated .ics file */
export function downloadICS(filename, icsText) {
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename || 'family-chores.ics';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
}

/**
 * Google Calendar quick-add URL for a single event
 * Format: YYYYMMDD/YYYYMMDD (all-day end exclusive)
 */
export function googleAddUrl(ev) {
  const start = toDateStamp(ev.date);
  const next = new Date(ev.date); next.setDate(next.getDate() + 1);
  const end = toDateStamp(next);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text:   ev.title,
    dates:  `${start}/${end}`,
    details: ev.description || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Outlook.com quick-add URL
 */
export function outlookAddUrl(ev) {
  const date = new Date(ev.date);
  const start = date.toISOString();
  const end   = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    path:     '/calendar/action/compose',
    rru:      'addevent',
    subject:  ev.title,
    body:     ev.description || '',
    startdt:  start,
    enddt:    end,
    allday:   'true',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Webcal subscription URL (Apple/Google honor this) */
export function webcalSubscribeUrl(httpsUrl) {
  return httpsUrl.replace(/^https?:\/\//, 'webcal://');
}
