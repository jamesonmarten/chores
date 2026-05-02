// FILE: src/utils/calendar-push.js
// Push the current event list to the server so the live .ics feed stays fresh.

import { eventsFromState } from './calendar-export.js';
import { loadAccount } from '../state/account.js';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
let _timer = null;
let _lastHash = '';

function hashEvents(events) {
  // cheap hash to avoid spamming the server
  return events.length + ':' + events.map(e => e.uid).join('|').length;
}

export function schedulePush(state, delay = 1500) {
  if (!API) return;
  const acct = loadAccount();
  if (!acct) return;
  clearTimeout(_timer);
  _timer = setTimeout(async () => {
    const events = eventsFromState(state, { kidIds: [], includeCompleted: true, includeUpcoming: true });
    const h = hashEvents(events);
    if (h === _lastHash) return;
    _lastHash = h;
    try {
      await fetch(`${API}/calendar/${acct.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ events }),
      });
    } catch {/* offline — try later */}
  }, delay);
}
