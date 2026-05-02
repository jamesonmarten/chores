// FILE: src/ui/tasks.js

import { KIDS } from '../data/kids.js';
import { TASKS } from '../data/tasks.js';
import { EGGS } from '../data/eggs.js';
import { getPoints, setPoints, kidState } from '../state/store.js';
import { today, taskKey } from '../utils/date.js';
import { launchConfetti, rollEgg } from '../utils/helpers.js';
import { showModal } from './render.js';

/**
 * Renders all kid columns into the family grid.
 * @param {object} state
 * @param {Function} onRender - callback to re-render the full app
 */
export function renderColumns(state, onRender) {
  const familyGridEl = document.getElementById('familyGrid');
  familyGridEl.innerHTML = '';

  KIDS.forEach(k => {
    const s = kidState(state, k.id);
    const p = getPoints(state, k.id);
    const card = document.createElement('article');
    card.className = 'kidCard';
    card.style.setProperty('--kid', k.color);

    card.innerHTML = `
      <div class="kidTop">
        <div class="avatar">${k.initial}</div>
        <div>
          <div class="kidName">${k.name}</div>
          <div class="kidAge">${k.age}</div>
          <div class="badgeRow">
            <span class="badge">${s.treats} treats</span>
            <span class="badge">${s.eggs} eggs</span>
          </div>
        </div>
      </div>
      <div class="progressShell">
        <div class="meter"><div class="fill" style="width:${p}%"></div></div>
      </div>
      <div class="scoreRow">
        <span>${p}/100 today</span>
        <span>${Math.max(0, 100 - p)} left</span>
      </div>
      <div class="rewardText">${p >= 100 ? 'Reward unlocked. Great work.' : "Complete today\u2019s quest to unlock a treat."}</div>
      <div class="taskList" id="tasks_${k.id}"></div>
      <div class="actions">
        <button class="btn orange" data-upgrade="${k.id}">Upgrade Pro</button>
        <button class="btn red" data-reset="${k.id}">Reset Day</button>
      </div>`;

    familyGridEl.appendChild(card);

    const list = card.querySelector('#tasks_' + k.id);
    TASKS[k.id].forEach(t => {
      const done = !!s.done[taskKey(t.id)];
      const row = document.createElement('button');
      row.className = 'task ' + (done ? 'done' : '');
      row.type = 'button';
      row.innerHTML = `
        <span class="check">${done ? '✓' : ''}</span>
        <span>
          <span class="taskTitle">${t.title}</span><br>
          <span class="helper">${done ? 'Quest complete' : t.helper}</span>
        </span>
        <span class="pts">+${t.pts}</span>`;
      row.onclick = () => { toggle(state, k.id, t, onRender); };
      list.appendChild(row);
    });

    card.querySelector('[data-reset]').onclick   = () => { resetDay(state, k.id, onRender); };
    card.querySelector('[data-upgrade]').onclick = () => {
      showModal('Family Pro', 'Unlock custom rewards, printable charts, allowance mode, streaks, parent approval, bonus quests, and reward history.', true, '🚀');
    };
  });
}

/**
 * Toggles a task done/undone and handles rewards/eggs.
 */
function toggle(state, kidId, t, onRender) {
  const s = kidState(state, kidId);
  const doneKey = taskKey(t.id);
  const before = getPoints(state, kidId);

  if (s.done[doneKey]) {
    delete s.done[doneKey];
    setPoints(state, kidId, before - t.pts);
  } else {
    s.done[doneKey] = true;
    setPoints(state, kidId, before + t.pts);
    const after = getPoints(state, kidId);
    if (after >= 100 && before < 100) {
      s.treats++;
      const name = KIDS.find(k => k.id === kidId).name;
      showModal(name + ' unlocked a reward!', '100/100 points reached. Time for a treat, surprise, or family-approved prize.', false, '🎉');
      launchConfetti(document.getElementById('confettiLayer'));
    } else {
      maybeEgg(state, kidId);
    }
  }
  onRender();
}

/**
 * Attempts to award an Easter egg on task completion.
 */
function maybeEgg(state, kidId) {
  const reward = rollEgg(EGGS);
  if (reward) {
    kidState(state, kidId).eggs++;
    const name = KIDS.find(k => k.id === kidId).name;
    showModal('Ultra Rare Easter Egg!', name + ': ' + reward.msg, false, reward.icon);
    launchConfetti(document.getElementById('confettiLayer'));
  }
}

/**
 * Resets all tasks for a kid for today.
 */
function resetDay(state, kidId, onRender) {
  const s = kidState(state, kidId);
  const d = today();
  Object.keys(s.done).forEach(x => { if (x.startsWith(d + '_')) delete s.done[x]; });
  s.pointsByDate[d] = 0;
  onRender();
}
