// FILE: src/main.js
import './style.css';
import {
  load, save, activatePro, isPro,
  getPin, setPin, checkPin,
  addKid, removeKid, updateKid,
  addTask, removeTask, updateTask,
  kidState, getPoints, setPoints, getMaxPoints, logHistory, updateStreak,
} from './state/store.js';
import { today, taskKey } from './utils/date.js';
import { initModal, showModal, hideModal } from './ui/render.js';
import { renderParentStats, renderParentKids, renderHistory } from './ui/parent.js';
import { initKidMode } from './ui/kid.js';
import { renderCalendarView } from './ui/calendar.js';
import {
  showAddKidModal, showEditKidModal,
  showAddTaskModal, showEditTaskModal,
  showSettingsModal, showConfirm,
} from './ui/parent-modals.js';
import { registerPwaShell } from './pwa/register.js';
import { registerDeepLinkHandler } from './pwa/deeplink.js';
import { startCheckout, getCheckoutResult } from './stripe/checkout.js';
import {
  captureReferralFromUrl, loadAccount, hasProAccess, markPaid,
} from './state/account.js';
import {
  ensureAccess, renderTrialBanner, showReferralModal, showPaywallModal,
} from './ui/signup.js';
import { showCalendarSyncModal } from './ui/calendar-sync.js';
import { schedulePush as schedulePushCal } from './utils/calendar-push.js';
import { maybeEnableCouplesMode, couplesEnabled, showHoneyDueModal } from './ui/honeydue.js';
import { showRewardsModal } from './ui/rewards.js';

// ── State ────────────────────────────────────────────────────────
captureReferralFromUrl();
maybeEnableCouplesMode();
const state = load();

// ── Screen helpers ───────────────────────────────────────────────
const screens = ['modeSelect','pinScreen','parentMode','calendarMode','kidSelectScreen','kidMode'];

function showScreen(id) {
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.hidden = s !== id;
  });
}

// ── Install banner ───────────────────────────────────────────────
const banner = document.getElementById('installBanner');
const dismissBtn = document.getElementById('dismissInstall');
if (dismissBtn) dismissBtn.onclick = () => { banner.hidden = true; };

// ── MODE SELECT ──────────────────────────────────────────────────
function goHome() { showScreen('modeSelect'); }

document.getElementById('btnParentMode').onclick = () => {
  showScreen('pinScreen');
  renderPinPad();
};

document.getElementById('btnKidMode').onclick = () => {
  if (state.kids.length === 1) {
    enterKidMode(state.kids[0].id);
  } else {
    showKidSelector();
  }
};

// ── PIN SCREEN ───────────────────────────────────────────────────
let pinBuffer = '';

function renderPinPad() {
  pinBuffer = '';
  updatePinDots();
  const pad = document.getElementById('pinPad');
  pad.innerHTML = '';
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  keys.forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'pinKey' + (k === '' ? ' pinEmpty' : '');
    btn.textContent = k;
    btn.type = 'button';
    if (k === '⌫') {
      btn.onclick = () => { pinBuffer = pinBuffer.slice(0,-1); updatePinDots(); };
    } else if (k !== '') {
      btn.onclick = () => {
        if (pinBuffer.length >= 4) return;
        pinBuffer += k;
        updatePinDots();
        if (pinBuffer.length === 4) setTimeout(submitPin, 120);
      };
    }
    pad.appendChild(btn);
  });
}

function updatePinDots() {
  const dots = document.querySelectorAll('#pinDots span');
  dots.forEach((d, i) => {
    d.classList.toggle('filled', i < pinBuffer.length);
  });
}

function submitPin() {
  if (checkPin(pinBuffer)) {
    enterParentMode();
  } else {
    const dotsEl = document.getElementById('pinDots');
    dotsEl.classList.add('shake');
    setTimeout(() => { dotsEl.classList.remove('shake'); pinBuffer = ''; updatePinDots(); }, 500);
  }
}

document.getElementById('pinBackBtn').onclick = goHome;

// ── PARENT MODE ──────────────────────────────────────────────────
function enterParentMode() {
  // Gate behind signup + trial/paywall
  const allowed = ensureAccess({
    onAllowed: () => {
      showScreen('parentMode');
      renderParent();
    },
    onPaywall: () => handleUpgrade(),
  });
  if (!allowed) return;
}

function renderParent() {
  renderParentStats(state);
  renderParentKids(state, {
    onEditKid: (kidId) => {
      const kid = state.kids.find(k => k.id === kidId);
      showEditKidModal(kid, updates => { updateKid(state, kidId, updates); renderParent(); });
    },
    onRemoveKid: (kidId) => {
      const kid = state.kids.find(k => k.id === kidId);
      showConfirm(`Remove ${kid?.name} and all their data?`, () => { removeKid(state, kidId); renderParent(); });
    },
    onAddTask: (kidId) => {
      const kid = state.kids.find(k => k.id === kidId);
      showAddTaskModal(kid?.name || 'Kid', task => { addTask(state, kidId, task); renderParent(); });
    },
    onEditTask: (kidId, taskId) => {
      const task = (state.tasks[kidId] || []).find(t => t.id === taskId);
      const kid = state.kids.find(k => k.id === kidId);
      if (task) showEditTaskModal(task, kid?.name || 'Kid', updates => { updateTask(state, kidId, taskId, updates); renderParent(); });
    },
    onRemoveTask: (kidId, taskId) => {
      const task = (state.tasks[kidId] || []).find(t => t.id === taskId);
      showConfirm(`Remove task "${task?.title}"?`, () => { removeTask(state, kidId, taskId); renderParent(); });
    },
    onResetDay: (kidId) => {
      const ks = kidState(state, kidId);
      const kid = state.kids.find(k => k.id === kidId);
      showConfirm(`Reset ${kid?.name}'s progress for today?`, () => {
        ks.done = {};
        setPoints(state, kidId, 0);
        logHistory(state, kidId, { message: 'Day reset by parent' });
        save(state);
        renderParent();
      });
    },
    onMarkTask: (kidId, taskId) => {
      const ks = kidState(state, kidId);
      const task = (state.tasks[kidId] || []).find(t => t.id === taskId);
      if (!task) return;
      const dKey = taskKey(task.id);
      ks.done = ks.done || {};
      if (ks.done[dKey]) {
        delete ks.done[dKey];
        setPoints(state, kidId, Math.max(0, getPoints(state, kidId) - task.pts));
        ks.totalPoints = Math.max(0, (ks.totalPoints || 0) - task.pts);
      } else {
        ks.done[dKey] = true;
        setPoints(state, kidId, getPoints(state, kidId) + task.pts);
        ks.totalPoints = (ks.totalPoints || 0) + task.pts;
        logHistory(state, kidId, { message: `"${task.title}" marked done by parent`, task: task.title });
        const pts = getPoints(state, kidId);
        const maxPts = getMaxPoints(state, kidId);
        if (pts >= maxPts) {
          ks.treats = (ks.treats || 0) + 1;
          updateStreak(state, kidId);
        }
      }
      save(state);
      renderParent();
    },
    onPayAllowance: (kidId) => {
      const kid = state.kids.find(k => k.id === kidId);
      const ks = kidState(state, kidId);
      ks.allowanceEarned = (ks.allowanceEarned || 0) + (kid.allowance || 0);
      logHistory(state, kidId, { message: `Allowance paid: $${kid.allowance}` });
      save(state);
      renderParent();
      showModal('Allowance Paid! 💰', `$${kid.allowance} logged for ${kid.name}.`, false, '💰');
    },
  });
  renderHistory(state);

  // Pro badge
  const proBadge = document.getElementById('proBadge');
  if (proBadge) proBadge.hidden = !(isPro(state) || (loadAccount()?.paid));

  // Honey-Do button (Partner Mode hidden feature)
  const honeyBtn = document.getElementById('btnHoneyDo');
  if (honeyBtn) honeyBtn.hidden = !couplesEnabled();

  // Trial banner + referral CTA wiring
  renderTrialBanner();
  const bUp = document.getElementById('bannerUpgrade');
  const bRf = document.getElementById('bannerReferOpen');
  if (bUp) bUp.onclick = handleUpgrade;
  if (bRf) bRf.onclick = showReferralModal;

  // Push latest events to subscribable calendar feed (debounced)
  schedulePushCal(state);
}

// Parent header buttons
document.getElementById('btnAddKid').onclick = () => {
  showAddKidModal(data => { addKid(state, data); renderParent(); });
};
document.getElementById('btnSettings').onclick = () => {
  showSettingsModal(getPin(), newPin => { setPin(newPin); showModal('PIN Updated', 'Your parent PIN has been changed.', false, '🔒'); });
};
document.getElementById('btnCalendar').onclick = enterCalendarMode;
document.getElementById('btnCalSync').onclick  = () => showCalendarSyncModal(state);
document.getElementById('btnHoneyDo').onclick  = () => showHoneyDueModal();
document.getElementById('btnRewards').onclick  = () => showRewardsModal(state, () => renderParent());
document.getElementById('btnSwitchToKid').onclick = () => {
  if (state.kids.length === 1) {
    enterKidMode(state.kids[0].id);
  } else {
    showKidSelector();
  }
};
document.getElementById('btnClearHistory').onclick = () => {
  state.kids.forEach(k => { kidState(state, k.id).history = []; });
  save(state);
  renderHistory(state);
};
document.getElementById('topUpgrade').onclick = handleUpgrade;

// ── CALENDAR MODE ─────────────────────────────────────────────────
let calView = 'month';

function enterCalendarMode() {
  showScreen('calendarMode');
  renderCalendar();
}

function renderCalendar() {
  // Update month label
  const hdr = document.getElementById('calGridHeader');
  if (hdr) {
    const now = new Date();
    hdr.textContent = calView === 'month'
      ? now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `Week of ${getWeekStart()}`;
  }
  renderCalendarView(state, calView);
  // Sync active button styles
  document.getElementById('btnCalMonth')?.classList.toggle('active', calView === 'month');
  document.getElementById('btnCalWeek')?.classList.toggle('active', calView === 'week');
}

function getWeekStart() {
  const now = new Date();
  const d   = new Date(now);
  d.setDate(now.getDate() - now.getDay());
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

document.getElementById('btnCalBack').onclick   = () => { showScreen('parentMode'); renderParent(); };
document.getElementById('btnCalMonth').onclick  = () => { calView = 'month'; renderCalendar(); };
document.getElementById('btnCalWeek').onclick   = () => { calView = 'week';  renderCalendar(); };
document.getElementById('btnCalSync2').onclick  = () => showCalendarSyncModal(state);

// ── KID SELECTOR ─────────────────────────────────────────────────
function showKidSelector() {
  showScreen('kidSelectScreen');
  const grid = document.getElementById('kidSelectGrid');
  grid.innerHTML = '';
  state.kids.forEach(kid => {
    const btn = document.createElement('button');
    btn.className = 'kidSelectBtn';
    btn.style.setProperty('--kid', kid.color);
    btn.innerHTML = `
      <span class="ksAvatar">${kid.avatar || kid.initial}</span>
      <span class="ksName">${kid.name}</span>
      <span class="ksAge">${kid.age || ''}</span>`;
    btn.onclick = () => enterKidMode(kid.id);
    grid.appendChild(btn);
  });
}

document.getElementById('btnKidSelectBack').onclick = goHome;

// ── KID MODE ─────────────────────────────────────────────────────
function enterKidMode(kidId) {
  showScreen('kidMode');
  initKidMode(state, kidId, () => {});
}

document.getElementById('btnKidBack').onclick = () => {
  if (state.kids.length === 1) goHome();
  else showKidSelector();
};

// ── STRIPE / PRO ─────────────────────────────────────────────────
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

function applyCheckoutResult(result) {
  if (result === 'success') {
    activatePro(state);
    markPaid();
    renderParent();
    showModal('Welcome to Family Pro! 🚀', 'Streaks, allowance tracking, and parent controls are now unlocked.', false, '🌟');
  } else if (result === 'cancel') {
    showModal('No worries!', 'Your free plan is still active. Upgrade any time.', false, '👋');
  }
}

// ── BOOT ─────────────────────────────────────────────────────────
initModal();
registerPwaShell();
registerDeepLinkHandler(result => applyCheckoutResult(result));
applyCheckoutResult(getCheckoutResult());

// Start on home screen
goHome();
