// FILE: src/utils/admin.js
// Owner / superadmin unlock. Client-side "god mode" so the owner can use the
// full app on any device without going through signup, the paywall, or the PIN.
//
// Usage:
//   1. Visit  https://chores.devcabin.tech/?god=devcabin-godmode-2026
//      (the param is stripped from the URL after it unlocks)
//   2. Or in DevTools console:  window.godOn('devcabin-godmode-2026')
//   3. Turn off with:           window.godOff()

// 🔑 Change this string to rotate your key.
export const GOD_KEY = 'devcabin-godmode-2026';

const FLAG = 'familyChoresGod';

/** Is superadmin / god mode currently active on this device? */
export function isGod() {
  try { return localStorage.getItem(FLAG) === '1'; }
  catch { return false; }
}

/** Enable god mode if the provided key matches. Returns true if enabled. */
export function enableGod(key) {
  if (key !== GOD_KEY) return false;
  try { localStorage.setItem(FLAG, '1'); } catch {}
  return true;
}

/** Disable god mode. */
export function disableGod() {
  try { localStorage.removeItem(FLAG); } catch {}
}

/**
 * Read ?god=KEY (or #god=KEY) from the URL. If it matches, enable god mode and
 * strip the param so it doesn't linger in history/share links.
 * Returns true if it just unlocked.
 */
export function captureGodFromUrl() {
  let unlocked = false;
  try {
    const url = new URL(window.location.href);
    let key = url.searchParams.get('god');

    // Also support hash form: #god=KEY
    if (!key && url.hash) {
      const m = url.hash.match(/god=([^&]+)/);
      if (m) key = decodeURIComponent(m[1]);
    }

    if (key && enableGod(key)) {
      unlocked = true;
      // Strip the secret from the visible URL.
      url.searchParams.delete('god');
      url.hash = url.hash.replace(/[#&]?god=[^&]+/, '');
      const clean = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + (url.hash || '');
      window.history.replaceState({}, document.title, clean);
    }
  } catch {}
  return unlocked;
}

/**
 * When god mode is active, force-grant Pro + unlock hidden feature flags so the
 * whole app is usable. Safe to call repeatedly on boot.
 */
export function applyGodBoot() {
  if (!isGod()) return false;
  try {
    // Unlock hidden partner/couples + spicy features.
    localStorage.setItem('familyChoresCouples', '1');
    localStorage.setItem('familyChoresSpicy', '1');

    // Make sure an account exists and is marked paid so the paywall never shows.
    const ACCOUNT_KEY = 'familyChoresAccount';
    let acct = null;
    try { acct = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null'); } catch {}
    if (!acct) {
      acct = {
        id: 'god-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)),
        name: 'Superadmin',
        email: 'owner@devcabin.tech',
        phone: '', zip: '', kidsCount: 1, ageRange: '', hearAbout: '',
        referredBy: null, referralCode: 'GODMODE',
        referrals: [], bonusMonths: 0,
        paid: true,
        signupAt: Date.now(),
        trialEndsAt: Date.now() + 3650 * 24 * 60 * 60 * 1000, // ~10 years
      };
    }
    acct.paid = true;
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acct));
  } catch {}
  return true;
}

/** Wire up console helpers: window.godOn('key') / window.godOff(). */
export function installGodConsole() {
  try {
    window.godOn = (key) => {
      if (enableGod(key)) { applyGodBoot(); location.reload(); return '👑 God mode ON'; }
      return '❌ Wrong key';
    };
    window.godOff = () => { disableGod(); location.reload(); return 'God mode OFF'; };
  } catch {}
}

/** Drop a small 👑 ADMIN badge into the parent header when active. */
export function renderGodBadge() {
  if (!isGod()) return;
  const brand = document.querySelector('#parentMode .headerBrand');
  if (!brand || brand.querySelector('.godBadge')) return;
  const badge = document.createElement('span');
  badge.className = 'godBadge';
  badge.textContent = '👑 ADMIN';
  badge.title = 'Superadmin mode active — tap to exit';
  badge.onclick = () => { if (confirm('Exit superadmin mode on this device?')) window.godOff(); };
  brand.appendChild(badge);
}
