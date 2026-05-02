// FILE: src/ui/calendar.js

import { KIDS } from '../data/kids.js';
import { TASKS } from '../data/tasks.js';
import { getPoints, kidState } from '../state/store.js';
import { today, taskKey } from '../utils/date.js';

/**
 * Renders the "Today's remaining work" focus panel.
 * @param {object} state
 */
export function renderTodayFocus(state) {
  const d = today();
  let html = '<h3>Today\u2019s remaining work</h3><div class="todayGrid">';

  KIDS.forEach(k => {
    const p = getPoints(state, k.id, d);
    const remaining = Math.max(0, 100 - p);
    const doneCount = TASKS[k.id].filter(t => kidState(state, k.id).done[taskKey(t.id, d)]).length;
    const total = TASKS[k.id].length;

    html += `
      <div class="todayKid" style="--kid:${k.color}">
        <strong>${k.name}</strong>
        <span>${p >= 100 ? 'Done for today' : remaining + ' points left'} \u2022 ${doneCount}/${total} tasks</span>
        <div class="miniBar"><div class="miniFill" style="width:${p}%"></div></div>
      </div>`;
  });

  html += '</div>';
  document.getElementById('todayFocus').innerHTML = html;
}

/**
 * Renders the full month calendar grid.
 * @param {object} state
 */
export function renderCalendar(state) {
  const calendarEl = document.getElementById('calendar');
  calendarEl.innerHTML = '';

  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(dayName => {
    const h = document.createElement('div');
    h.className = 'dayHead';
    h.textContent = dayName;
    calendarEl.appendChild(h);
  });

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayIso = today();
  const start = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < start; i++) {
    calendarEl.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= days; d++) {
    const iso = new Date(y, m, d).toISOString().slice(0, 10);
    const box = document.createElement('div');
    const dayPoints = KIDS.map(k => getPoints(state, k.id, iso));
    const total = dayPoints.reduce((a, b) => a + b, 0);
    const allComplete = dayPoints.every(p => p >= 100);
    const timeClass = iso < todayIso ? 'past' : iso === todayIso ? 'today' : 'future';
    const progressClass = allComplete ? 'complete' : total > 0 ? 'partial' : 'empty';

    box.className = `day ${timeClass} ${progressClass}`;

    let rows = '';
    let doneKids = 0;
    KIDS.forEach(k => {
      const p = getPoints(state, k.id, iso);
      if (p >= 100) doneKids++;
      rows += `
        <div class="kidDayRow" style="--kid:${k.color}">
          <span class="kidMiniDot" title="${k.name}">${k.initial}</span>
          <span class="kidMiniTrack"><span class="kidMiniFill" style="width:${p}%"></span></span>
          <span class="kidMiniScore">${p}</span>
        </div>`;
    });

    const status = allComplete ? 'All done' : total > 0 ? `${doneKids}/3 done` : 'Not started';
    box.innerHTML = `
      <div class="date">${d}</div>
      <div class="dayStatus">${status}</div>
      <div class="dots">${rows}</div>`;

    calendarEl.appendChild(box);
  }
}
