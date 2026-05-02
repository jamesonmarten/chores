// FILE: src/state/account.js
// Account, 7-day trial, and referral system. Stored locally and synced to backend if available.

const ACCOUNT_KEY  = 'familyChoresAccount';
const REFERRAL_KEY = 'familyChoresReferralCode';
const TRIAL_DAYS   = 7;
const MS_DAY       = 24 * 60 * 60 * 1000;

const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// ── Referral code (read once from URL) ────────────────────────────
export function captureReferralFromUrl() {
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (ref && !localStorage.getItem(REFERRAL_KEY)) {
      localStorage.setItem(REFERRAL_KEY, ref);
    }
  } catch {}
}
export function pendingReferral() { return localStorage.getItem(REFERRAL_KEY) || null; }

// ── Account CRUD (local) ──────────────────────────────────────────
export function loadAccount() {
  try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null'); }
  catch { return null; }
}
export function saveAccount(acct) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acct));
}
export function hasAccount() { return !!loadAccount(); }

function generateCode(name = '') {
  const slug = (name || 'fam').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 5) || 'fam';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${slug.toUpperCase()}-${rand}`;
}

export async function createAccount(form) {
  const referredBy = pendingReferral();
  const acct = {
    id:           crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    name:         form.name?.trim() || '',
    email:        form.email?.trim().toLowerCase() || '',
    phone:        form.phone?.trim() || '',
    zip:          form.zip?.trim() || '',
    kidsCount:    Number(form.kidsCount) || 1,
    ageRange:     form.ageRange || '',
    hearAbout:    form.hearAbout || '',
    referredBy:   referredBy || null,
    referralCode: generateCode(form.name),
    referrals:    [],          // emails of people who signed up via your code
    bonusMonths:  0,           // free months earned from referrals
    paid:         false,       // true after Stripe success
    signupAt:     Date.now(),
    trialEndsAt:  Date.now() + TRIAL_DAYS * MS_DAY,
  };
  saveAccount(acct);

  // Best-effort backend sync (non-blocking)
  if (API) {
    try {
      await fetch(`${API}/signup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(acct),
      });
    } catch {}
  }
  return acct;
}

export function updateAccount(patch) {
  const acct = loadAccount();
  if (!acct) return null;
  Object.assign(acct, patch);
  saveAccount(acct);
  return acct;
}

export function markPaid() {
  return updateAccount({ paid: true });
}

// ── Trial / access ────────────────────────────────────────────────
export function trialDaysLeft(acct = loadAccount()) {
  if (!acct) return 0;
  const ms = (acct.trialEndsAt || 0) - Date.now() + (acct.bonusMonths || 0) * 30 * MS_DAY;
  return Math.max(0, Math.ceil(ms / MS_DAY));
}
export function trialActive(acct = loadAccount()) {
  return trialDaysLeft(acct) > 0;
}
export function hasProAccess(acct = loadAccount()) {
  if (!acct) return false;
  return !!acct.paid || trialActive(acct);
}

// ── Referrals ─────────────────────────────────────────────────────
export function buildReferralLink(acct = loadAccount()) {
  if (!acct) return '';
  const base = window.location.origin;
  return `${base}/?ref=${encodeURIComponent(acct.referralCode)}`;
}

export async function notifyReferralSignup(referralCode, newEmail) {
  if (!API) return;
  try {
    await fetch(`${API}/referral`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ referralCode, newEmail }),
    });
  } catch {}
}

// Earn 1 free month per referral signup (called when redeeming a confirmation)
export function recordReferralReward(email) {
  const acct = loadAccount();
  if (!acct) return null;
  acct.referrals = acct.referrals || [];
  if (!acct.referrals.includes(email)) {
    acct.referrals.push(email);
    acct.bonusMonths = (acct.bonusMonths || 0) + 1;
    saveAccount(acct);
  }
  return acct;
}
