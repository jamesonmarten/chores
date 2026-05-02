// FILE: src/main.js

import './style.css';
import { KIDS } from './data/kids.js';
import { TASKS } from './data/tasks.js';
import { load, save } from './state/store.js';
import { today } from './utils/date.js';
import { renderStats } from './ui/stats.js';
import { renderColumns } from './ui/tasks.js';
import { renderTodayFocus, renderCalendar } from './ui/calendar.js';
import { initModal, showModal } from './ui/render.js';
import { registerPwaShell } from './pwa/register.js';

const state = load();

/**
 * Full app render cycle.
 */
function render() {
  renderStats(state);
  renderColumns(state, render);
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

document.getElementById('topUpgrade').onclick = () => {
  showModal(
    'Family Pro',
    'Unlock custom rewards, printable charts, allowance mode, streaks, parent approval, bonus quests, and reward history.',
    true,
    '🚀'
  );
};

initModal();
registerPwaShell();
runTests();
render();
