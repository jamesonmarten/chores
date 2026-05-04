// FILE: src/ui/signup.js
// Signup, paywall, and referral panels — rendered into existing #parentModal.

import {
  loadAccount, createAccount, hasProAccess, trialDaysLeft,
  buildReferralLink, pendingReferral,
} from '../state/account.js';

const modal    = () => document.getElementById('parentModal');
const modalBox = () => document.getElementById('parentModalBox');

function open(html) {
  modalBox().innerHTML = html;
  modal().hidden = false;
  // Add .show on next frame so the CSS transition can run AND pointer-events flip on.
  requestAnimationFrame(() => modal().classList.add('show'));
}
function close() {
  modal().classList.remove('show');
  setTimeout(() => { modal().hidden = true; modalBox().innerHTML = ''; }, 220);
}

// ── SIGNUP FORM ────────────────────────────────────────────────────
export function showSignupModal(onComplete) {
  const refCode = pendingReferral();
  open(`
    <div class="signupHero">
      <div class="signupBadge">${refCode ? `🎁 Referred by <strong>${refCode}</strong> — both of you get a free month!` : '✨ 7-day free trial — no card required'}</div>
      <h2 class="signupTitle">Create your family account</h2>
      <p class="signupSub">We'll only use this to sync your chores and unlock referral rewards.</p>
    </div>
    <form id="signupForm" class="signupForm">
      <label>Your name<input name="name" required placeholder="Alex Parent"></label>
      <label>Email<input name="email" type="email" required placeholder="alex@family.com"></label>
      <label>Phone (optional)<input name="phone" type="tel" placeholder="+1 555 123 4567"></label>
      <div class="signupRow">
        <label>ZIP / Postcode<input name="zip" placeholder="80202"></label>
        <label># of kids
          <select name="kidsCount">
            <option>1</option><option selected>2</option><option>3</option><option>4</option><option>5+</option>
          </select>
        </label>
      </div>
      <label>Kids' age range
        <select name="ageRange">
          <option value="">Select…</option>
          <option>Under 5</option>
          <option>5 – 9</option>
          <option>10 – 14</option>
          <option>15+</option>
          <option>Mixed</option>
        </select>
      </label>
      <label>How did you hear about us?
        <select name="hearAbout">
          <option value="">Select…</option>
          <option>Friend or family</option>
          <option>Social media</option>
          <option>Search engine</option>
          <option>Skylight comparison</option>
          <option>Other</option>
        </select>
      </label>
      <button type="submit" class="signupCTA">🚀 Start free 7-day trial</button>
      <p class="signupFinePrint">Free trial ends after 7 days. No charge unless you upgrade.</p>
    </form>
  `);

  document.getElementById('signupForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const acct = await createAccount(data);
    close();
    onComplete?.(acct);
  };
}

// ── PAYWALL (trial expired) ────────────────────────────────────────
export function showPaywallModal(onUpgrade, onLogout) {
  open(`
    <div class="paywallBox">
      <div class="paywallEmoji">🎁</div>
      <h2 class="paywallTitle">Your free trial has ended</h2>
      <p class="paywallText">Hope you and the kids loved Family Chores! Continue with Pro for just <strong>$6/month</strong>, cancel anytime.</p>
      <ul class="paywallList">
        <li>✓ Unlimited kids and chores</li>
        <li>✓ Streaks, allowance, full history</li>
        <li>✓ Calendar views and PIN lock</li>
        <li>✓ Earn free months by referring friends</li>
      </ul>
      <button id="paywallUpgrade" class="signupCTA">Upgrade to Pro — $6/mo</button>
      <button id="paywallLogout" class="linkBtn" style="margin-top:12px;">Sign out</button>
    </div>
  `);
  document.getElementById('paywallUpgrade').onclick = () => { close(); onUpgrade?.(); };
  document.getElementById('paywallLogout').onclick  = () => { close(); onLogout?.(); };
}

// ── TRIAL BANNER (top of parent dashboard) ─────────────────────────
let _bannerHandlers = { onUpgrade: null };

export function renderTrialBanner({ onUpgrade } = {}) {
  if (onUpgrade) _bannerHandlers.onUpgrade = onUpgrade;
  const acct = loadAccount();
  let host = document.getElementById('trialBanner');
  if (!host) {
    host = document.createElement('div');
    host.id = 'trialBanner';
    host.className = 'trialBanner';
    const main = document.querySelector('#parentMode .parentMain');
    if (main) main.prepend(host);
  }
  if (!acct) { host.hidden = true; return; }
  if (acct.paid) {
    host.hidden = false;
    host.className = 'trialBanner pro';
    host.innerHTML = `<span>⭐ <strong>Pro active</strong> · Thanks for supporting us!</span>
      <button class="linkBtn" id="bannerReferOpen">Refer & earn free months →</button>`;
  } else {
    const days = trialDaysLeft(acct);
    host.hidden = false;
    host.className = 'trialBanner ' + (days <= 2 ? 'warn' : '');
    host.innerHTML = `<span>${days > 0
      ? `🎉 <strong>${days} day${days===1?'':'s'} left</strong> in your free trial`
      : `⏰ <strong>Trial expired</strong>`}</span>
      <button class="linkBtn" id="bannerReferOpen">Earn free months →</button>
      <button class="iconBtn proUpgradeBtn" id="bannerUpgrade">Upgrade $6/mo</button>`;
  }
  document.getElementById('bannerReferOpen')?.addEventListener('click', showReferralModal);
  document.getElementById('bannerUpgrade')?.addEventListener('click', () => _bannerHandlers.onUpgrade?.());
}

// ── REFERRAL PANEL ─────────────────────────────────────────────────
export function showReferralModal() {
  const acct = loadAccount();
  if (!acct) return;
  const link = buildReferralLink(acct);
  open(`
    <div class="referBox">
      <div class="referEmoji">🎁</div>
      <h2 class="referTitle">Give a month, get a month</h2>
      <p class="referText">When a friend signs up with your link, you both get a <strong>free month of Pro</strong>. Refer 12 friends → free year!</p>

      <div class="referStats">
        <div class="referStat"><span class="referStatNum">${acct.referrals?.length || 0}</span><span class="referStatLbl">Friends signed up</span></div>
        <div class="referStat"><span class="referStatNum">${acct.bonusMonths || 0}</span><span class="referStatLbl">Free months earned</span></div>
        <div class="referStat"><span class="referStatNum">${acct.referralCode}</span><span class="referStatLbl">Your code</span></div>
      </div>

      <label class="referLinkLabel">Your referral link
        <div class="referLinkRow">
          <input id="referLink" readonly value="${link}">
          <button id="referCopy" type="button" class="signupCTA small">Copy</button>
        </div>
      </label>

      <div class="referShareRow">
        <a class="shareBtn" target="_blank" href="sms:&body=${encodeURIComponent(`Try Family Chores — kids actually love it: ${link}`)}">💬 Text</a>
        <a class="shareBtn" target="_blank" href="mailto:?subject=Family%20Chores&body=${encodeURIComponent(`I've been using this — try it: ${link}`)}">✉️ Email</a>
        <a class="shareBtn" target="_blank" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`Family Chores & More — kids love it. Try free: ${link}`)}">🐦 Tweet</a>
      </div>

      <button id="referClose" class="linkBtn" style="margin-top:18px;">Close</button>
    </div>
  `);

  document.getElementById('referCopy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(link);
      const b = document.getElementById('referCopy');
      b.textContent = '✓ Copied'; setTimeout(() => b.textContent = 'Copy', 1500);
    } catch {
      document.getElementById('referLink').select();
    }
  };
  document.getElementById('referClose').onclick = close;
}

// ── ACCESS GUARD ───────────────────────────────────────────────────
export function ensureAccess({ onSignup, onPaywall, onAllowed }) {
  const acct = loadAccount();
  if (!acct)             { showSignupModal(() => onAllowed?.()); onSignup?.(); return false; }
  if (!hasProAccess(acct)) { showPaywallModal(onPaywall, () => { localStorage.removeItem('familyChoresAccount'); location.reload(); }); return false; }
  onAllowed?.();
  return true;
}
