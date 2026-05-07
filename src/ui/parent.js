// FILE: src/ui/parent.js
import { today } from '../utils/date.js';
import {
  kidState, getPoints, getMaxPoints, getLevel, isPro,
  getTasksSorted, reorderTasks, rebalancePoints, save,
} from '../state/store.js';
import { launchConfetti } from '../utils/helpers.js';

const TOD_META = {
  any:       { emoji: '⭐', label: 'Any' },
  morning:   { emoji: '🌅', label: 'AM' },
  afternoon: { emoji: '☀️', label: 'PM' },
  evening:   { emoji: '🌙', label: 'Eve' },
};

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
    const tasks = getTasksSorted(state, kid.id);
    const taskTotal = tasks.reduce((a, t) => a + (t.pts || 0), 0);

    const card = document.createElement('article');
    card.className = 'pKidCard';
    card.style.setProperty('--kid', kid.color);

    card.innerHTML = `
      <div class="pKidTop">
        <div class="pKidAvatar" style="background:${kid.color}22;border-color:${kid.color}">${kid.photo ? `<img class="kidAvImg" src="${kid.photo}" alt="">` : (kid.avatar || kid.initial)}</div>
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
        <span>Tasks (${tasks.length}) · <span class="pTotalPts ${taskTotal===100?'good':''}">total ${taskTotal} pts</span></span>
        <span class="pTaskHdrBtns">
          ${tasks.length > 0 && taskTotal !== 100
            ? `<button class="smallBtn" data-balance="${kid.id}" title="Auto-scale all task points so they sum to 100">≡ Balance to 100</button>` : ''}
          <button class="smallBtn green" data-add-task="${kid.id}">+ Add Task</button>
        </span>
      </div>
      <div class="pTaskList" id="pTasks_${kid.id}" data-kid-list="${kid.id}">
        ${tasks.map(t => {
          const doneKey = today() + '_' + t.id;
          const isDone = !!(ks.done || {})[doneKey];
          const tod = TOD_META[t.timeOfDay || 'any'];
          return `<div class="pTaskRow ${isDone ? 'done' : ''}" draggable="true" data-task-id="${t.id}">
            <span class="pDragHandle" title="Drag to reorder">⋮⋮</span>
            <span class="pTaskCheck" data-mark="${kid.id}" data-task="${t.id}" style="cursor:pointer">${isDone ? '✅' : '⬜'}</span>
            <span class="pTaskEmoji">${t.emoji || '✅'}</span>
            <span class="pTaskTitle">${t.title}</span>
            <span class="pTodBadge" title="${tod.label}">${tod.emoji}</span>
            ${t.timerSec ? `<span class="pTaskTimer" title="Timer">⏱${t.timerSec}s</span>` : ''}
            ${t.videoUrl ? `<span class="pTaskTimer" title="Has instruction video">🎥</span>` : ''}
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

    // Balance-to-100 button
    const balBtn = card.querySelector(`[data-balance="${kid.id}"]`);
    if (balBtn) balBtn.onclick = () => {
      rebalancePoints(state, kid.id, 100);
      // Re-render this whole grid so totals + per-row pts update
      renderParentKids(state, { onEditKid, onRemoveKid, onAddTask, onEditTask, onRemoveTask, onResetDay, onMarkTask, onPayAllowance });
    };

    // Drag-and-drop reorder
    enableDragReorder(card.querySelector(`[data-kid-list="${kid.id}"]`), kid.id, state, () => {
      renderParentKids(state, { onEditKid, onRemoveKid, onAddTask, onEditTask, onRemoveTask, onResetDay, onMarkTask, onPayAllowance });
    });
  });
}

/** Enable HTML5 drag-and-drop reordering for a task list element. */
function enableDragReorder(listEl, kidId, state, onChange) {
  if (!listEl) return;
  let dragId = null;

  listEl.querySelectorAll('.pTaskRow').forEach(row => {
    row.addEventListener('dragstart', (e) => {
      dragId = row.dataset.taskId;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch {}
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      listEl.querySelectorAll('.pTaskRow').forEach(r => r.classList.remove('dropTarget'));
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const over = e.currentTarget;
      if (over.dataset.taskId === dragId) return;
      over.classList.add('dropTarget');
    });
    row.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('dropTarget'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      const over = e.currentTarget;
      over.classList.remove('dropTarget');
      if (!dragId || dragId === over.dataset.taskId) return;
      // Build new order
      const ids = Array.from(listEl.querySelectorAll('.pTaskRow')).map(r => r.dataset.taskId);
      const fromIdx = ids.indexOf(dragId);
      const toIdx   = ids.indexOf(over.dataset.taskId);
      if (fromIdx < 0 || toIdx < 0) return;
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, dragId);
      reorderTasks(state, kidId, ids);
      onChange?.();
    });
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
