// FILE: src/utils/notify.js
// Lightweight morning-reminder notifications (no service worker required).
// Falls back gracefully when Notification API isn't available.

const ENABLED_KEY = 'familyChoresNotifyOn';
const HOUR_KEY    = 'familyChoresNotifyHour'; // 0-23, default 7
const LAST_KEY    = 'familyChoresNotifyLast'; // YYYY-MM-DD of last fire

let _timer = null;

export function notifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notifyEnabled() {
  return notifySupported() &&
    Notification.permission === 'granted' &&
    localStorage.getItem(ENABLED_KEY) === '1';
}

export function notifyHour() {
  const h = parseInt(localStorage.getItem(HOUR_KEY) || '7', 10);
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 7;
}

export function setNotifyHour(h) {
  localStorage.setItem(HOUR_KEY, String(h));
  scheduleNextReminder();
}

/** Request permission and persist enabled state. Returns final enabled state. */
export async function enableNotifications() {
  if (!notifySupported()) return false;
  let perm = Notification.permission;
  if (perm === 'default') {
    try { perm = await Notification.requestPermission(); } catch { perm = 'denied'; }
  }
  if (perm === 'granted') {
    localStorage.setItem(ENABLED_KEY, '1');
    scheduleNextReminder();
    return true;
  }
  localStorage.setItem(ENABLED_KEY, '0');
  return false;
}

export function disableNotifications() {
  localStorage.setItem(ENABLED_KEY, '0');
  if (_timer) { clearTimeout(_timer); _timer = null; }
}

/** Schedule next reminder at the configured hour. Re-schedules itself daily. */
export function scheduleNextReminder() {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  if (!notifyEnabled()) return;

  const hour = notifyHour();
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const ms = Math.max(1000, next.getTime() - now.getTime());
  _timer = setTimeout(() => {
    fireReminder();
    scheduleNextReminder();
  }, ms);
}

function fireReminder() {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(LAST_KEY) === todayIso) return;
  if (!notifyEnabled()) return;
  try {
    new Notification('Good morning! ☀️', {
      body: 'Time for today\'s family chores. Tap to start the day strong!',
      tag: 'family-chores-morning',
      icon: '/icon-192.png',
    });
    localStorage.setItem(LAST_KEY, todayIso);
  } catch {}
}

/** Boot: if previously enabled, re-schedule. */
export function notifyBoot() {
  if (notifyEnabled()) scheduleNextReminder();
}
