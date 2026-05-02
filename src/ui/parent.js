// FILE: src/ui/parent.js
import { today } from '../utils/date.js';
import { kidState, getPoints, getMaxPoints, getLevel, isPro } from '../state/store.js';
import { launchConfetti } from '../utils/helpers.js';

/** Render parent stats bar */
export function renderParentStats(state) {
  const el = document.getElementById('parentStats');
  if (!el) return;
  const totalPts = state.kids.reduce((a, k) => a + getPoints(state, k.id), 0);
  const totalMax = state.kids.reduce((a, k) => a + getMaxPoints(state, k.id), 0);
  const completedKids = state.kids.filter(k => getPoints(state, k.id) >= getMaxPoints(state, k.id)).length;
  const totalAllowance = state.kids.reduce((a, k) => {
    const ks = kidState(state, k.id);
    return a + (ks.allowanceEarned || 0);
  }, 0);

  el.innerHTML = `
    <div class="pStat"><strong>${totalPts}</strong><span>Points today</span></div>
    <div class="pStat"><strong>${totalMax}</strong><span>Max possible</span></div>
    <div class="pStat"><strong>${completedKids}/${state.kids.length}</strong><span>Kids done</span></div>
    <div class="pStat"><strong>$${totalAllowance.toFixed(2)}</strong><span>Allowance earned</span></div>
  `;
}

/** Render parent kid management cards */
export function renderParentKids(state, { onEditKid, onRemoveKid, onAddTask, onEditTask, onRemoveTask, onResetDay, onMarkTask, onPayAllowance }) {
  const grid = document.getElementById('parentKidsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  state.kids.forEach(kid => {
    const ks = kidState(state, kid.id);
    const pts = getPoints(state, kid.id);
    const maxPts = getMaxPoints(state, kid.id);
    const pct = Math.min(100, maxPts ? Math.round(pts / maxPts * 100) : 0);
    const lvlInfo = getLevel(ks.totalPoints || 0);
    const tasks = state.tasks[kid.id] || [];

    const card = document.createElement('article');
    card.className = 'pKidCard';
    card.style.setProperty('--kid', kid.color);

    card.innerHTML = `
      <div class="pKidTop">
        <div class="pKidAvatar" style="background:${kid.color}22;border-color:${kid.color}">${kid.avatar || kid.initial}</div>
        <div class="pKidInfo">
          <div class="pKidName">${kid.name}</div>
          <div class="pKidAge">${kid.age}</div>
          <div class="pKidLevel">${lvlInfo.emoji} ${lvlInfo.name} · Lv ${lvlInfo.level}</div>
        </div>
        <div class="pKidCardActions">
          <button class="smallBtn" data-edit-kid="${kid.id}">Edit</button>
          <button class="smallBtn red" data-remove-kid="${kid.id}">Remove</button>
        </div>
      </div>
      <div class="pProgressRow">
        <div class="pMeter"><div class="pFill" style="width:${pct}%;background:${kid.color}"></div></div>
        <span class="pPct">${pts}/${maxPts}</span>
      </div>
      <div class="pKidMeta">
        <span class="metaPill">🔥 ${ks.streak || 0} streak</span>
        <span class="metaPill">🏆 Best ${ks.bestStreak || 0}</span>
        <span class="metaPill">💰 $${(ks.allowanceEarned || 0).toFixed(2)} earned</span>
        ${kid.allowance ? `<button class="metaPillBtn" data-pay="${kid.id}">Pay $${kid.allowance}</button>` : ''}
      </div>

      <div class="pTaskListHeader">
        <span>Tasks (${tasks.length})</span>
        <button class="smallBtn green" data-add-task="${kid.id}">+ Add Task</button>
      </div>
      <div class="pTaskList" id="pTasks_${kid.id}">
        ${tasks.map(t => {
          const doneKey = today() + '_' + t.id;
          const isDone = !!(ks.done || {})[doneKey];
          return `<div class="pTaskRow ${isDone ? 'done' : ''}">
            <span class="pTaskCheck" data-mark="${kid.id}" data-task="${t.id}" style="cursor:pointer">${isDone ? '✅' : '⬜'}</span>
            <span class="pTaskEmoji">${t.emoji || '✅'}</span>
            <span class="pTaskTitle">${t.title}</span>
            <span class="pTaskPts">+${t.pts}</span>
            <button class="tinyBtn" data-edit-task="${t.id}" data-kid="${kid.id}">✏️</button>
            <button class="tinyBtn red" data-remove-task="${t.id}" data-kid="${kid.id}">✕</button>
          </div>`;
        }).join('')}
        ${tasks.length === 0 ? '<div class="emptyTasks">No tasks yet. Add one above.</div>' : ''}
      </div>

      <div class="pKidFooter">
        <button class="smallBtn orange" data-reset="${kid.id}">Reset Day</button>
        <span class="pKidAllowanceRate">${kid.allowance ? `Allowance: $${kid.allowance}/completion` : 'No allowance set'}</span>
      </div>
    `;

    grid.appendChild(card);

    card.querySelector(`[data-edit-kid="${kid.id}"]`).onclick = () => onEditKid(kid.id);
    card.querySelector(`[data-remove-kid="${kid.id}"]`).onclick = () => onRemoveKid(kid.id);
    card.querySelector(`[data-add-task="${kid.id}"]`).onclick = () => onAddTask(kid.id);
    card.querySelector(`[data-reset="${kid.id}"]`).onclick = () => onResetDay(kid.id);
    card.querySelectorAll(`[data-mark]`).forEach(btn => {
      btn.onclick = () => onMarkTask(kid.id, btn.dataset.task);
    });
    card.querySelectorAll(`[data-edit-task]`).forEach(btn => {
      btn.onclick = () => onEditTask(kid.id, btn.dataset.editTask);
    });
    card.querySelectorAll(`[data-remove-task]`).forEach(btn => {
      btn.onclick = () => onRemoveTask(kid.id, btn.dataset.removeTask);
    });
    const payBtn = card.querySelector(`[data-pay="${kid.id}"]`);
    if (payBtn) payBtn.onclick = () => onPayAllowance(kid.id);
  });
}

/** Render history list */
export function renderHistory(state) {
  const el = document.getElementById('historyList');
  if (!el) return;
  const entries = [];
  state.kids.forEach(kid => {
    const ks = kidState(state, kid.id);
    (ks.history || []).slice(0, 30).forEach(h => entries.push({ ...h, kidName: kid.name, kidColor: kid.color }));
  });
  entries.sort((a, b) => b.timestamp - a.timestamp);
  if (entries.length === 0) {
    el.innerHTML = '<div class="emptyHistory">No activity yet. Start completing chores!</div>';
    return;
  }
  el.innerHTML = entries.slice(0, 50).map(e => {
    const d = new Date(e.timestamp);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `<div class="historyRow">
      <span class="histDot" style="background:${e.kidColor}"></span>
      <span class="histKid">${e.kidName}</span>
      <span class="histMsg">${e.message || e.task || ''}</span>
      <span class="histTime">${dateStr} ${timeStr}</span>
    </div>`;
  }).join('');
}
