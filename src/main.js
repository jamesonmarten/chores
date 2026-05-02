// FILE: src/main.js

import './style.css';
import { KIDS } from './data/kids.js';
import { TASKS } from './data/tasks.js';
import { load, save, activatePro, isPro } from './state/store.js';
import { today } from './utils/date.js';
import { renderStats } from './ui/stats.js';
import { renderColumns } from './ui/tasks.js';
import { renderTodayFocus, renderCalendar } from './ui/calendar.js';
import { initModal, showModal } from './ui/render.js';
import { registerPwaShell } from './pwa/register.js';
import { registerDeepLinkHandler } from './pwa/deeplink.js';
import { startCheckout, getCheckoutResult } from './stripe/checkout.js';

const state = load();

/**
 * Full app render cycle.
 */
function render() {
  renderStats(state);
  renderColumns(state, render, handleUpgrade);
  renderTodayFocus(state);
  renderCalendar(state);
  save(state);
}

function runTests() {
  console.assert(!!document.getElementById('confettiLayer'), 'confettiLayer must exist');
  console.assert(!!document.getElementById('installBanner'), 'Install banner should exist');
  console.assert(TASKS.josie.reduce((a, t) => a + t.pts, 0) === 100, 'Josie tasks must total 100');
  console.assert(TASKS.lincoln.reduce((a, t) => a + t.pts, 0) === 100, 'Lincoln tasks must total 100');
  console.assert(TASKS.sienna.reduce((a, t) => a + t.pts, 0) === 100, 'Sienna tasks must total 100');
  console.assert(KIDS.length === 3, 'App should render three child columns');
  console.assert(typeof today() === 'string' && today().length === 10, 'today() should return YYYY-MM-DD');
  console.assert(KIDS.every(k => k.initial && k.initial.length === 1), 'Each kid should have a one-letter initial');
}

document.getElementById('topUpgrade').onclick = () => handleUpgrade();

/**
 * Handles the Pro upgrade button — launches Stripe Checkout.
 * If already Pro, shows a confirmation instead.
 */
async function handleUpgrade() {
  if (isPro(state)) {
    showModal('You\'re already Pro! 🎉', 'All Pro features are active for your family.', false, '⭐');
    return;
  }
  try {
    await startCheckout({ familyId: state.familyId });
  } catch (err) {
    showModal('Checkout Error', err.message || 'Something went wrong. Please try again.', false, '⚠️');
  }
}

/**
 * Apply a Stripe checkout result — called from both web redirect and iOS deep link.
 * @param {'success'|'cancel'|null} result
 */
function applyCheckoutResult(result) {
  if (result === 'success') {
    activatePro(state);
    render();
    showModal(
      'Welcome to Family Pro! 🚀',
      'Custom rewards, streaks, printable charts, allowance mode, and parent controls are now unlocked.',
      false,
      '🌟'
    );
  } else if (result === 'cancel') {
    showModal('No worries!', 'Your free plan is still active. Upgrade any time.', false, '👋');
  }
}

/**
 * Handle return from Stripe Checkout via web query param (?pro=success|cancel).
 */
function handleCheckoutReturn() {
  applyCheckoutResult(getCheckoutResult());
}

initModal();
registerPwaShell();

// Handle Stripe return on iOS (deep link) and on web (query param)
registerDeepLinkHandler((result) => applyCheckoutResult(result));
handleCheckoutReturn();

runTests();
render();
