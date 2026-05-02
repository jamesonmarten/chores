// FILE: src/ui/kid.js
import { today, taskKey } from '../utils/date.js';
import { kidState, getPoints, setPoints, getMaxPoints, getLevel, logHistory, updateStreak, save } from '../state/store.js';
import { launchConfetti, rollEgg } from '../utils/helpers.js';
import { EGGS } from '../data/eggs.js';
import { showModal } from './render.js';

let _activeKidId = null;
let _state = null;
let _onUpdate = null;

/** Initialize kid mode for a specific kid */
export function initKidMode(state, kidId, onUpdate) {
  _state = state;
  _activeKidId = kidId;
  _onUpdate = onUpdate;
  renderKidHeader();
  renderKidTasks();
}

function renderKidHeader() {
  const kid = _state.kids.find(k => k.id === _activeKidId);
  if (!kid) return;
  const ks = kidState(_state, kid.id);
  const pts = getPoints(_state, kid.id);
  const maxPts = getMaxPoints(_state, kid.id);
  const pct = Math.min(100, maxPts ? Math.round(pts / maxPts * 100) : 0);
  const lvlInfo = getLevel(ks.totalPoints || 0);

  const header = document.getElementById('kidHeader');
  if (header) header.style.setProperty('--kid', kid.color);

  const info = document.getElementById('kidHeaderInfo');
  if (!info) return;
  info.innerHTML = `
    <div class="kidAvatarBig">${kid.avatar || kid.initial}</div>
    <div class="kidHInfoText">
      <div class="kidHName">${kid.name}</div>
      <div class="kidHLevel">${lvlInfo.emoji} ${lvlInfo.name} · Level ${lvlInfo.level}</div>
      <div class="kidStreakRow">
        ${ks.streak ? `<span class="streakBadge">🔥 ${ks.streak} day streak!</span>` : ''}
        ${ks.bestStreak > 1 ? `<span class="streakBadge dimmed">🏆 Best: ${ks.bestStreak}</span>` : ''}
      </div>
    </div>
    <div class="kidHPoints">
      <div class="kidBigPts">${pts}</div>
      <div class="kidPtsLabel">of ${maxPts} pts</div>
      <div class="kidProgressRing">
        <svg viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="5"/>
          <circle cx="28" cy="28" r="24" fill="none" stroke="${kid.color}" stroke-width="5"
            stroke-dasharray="${2 * Math.PI * 24}"
            stroke-dashoffset="${2 * Math.PI * 24 * (1 - pct / 100)}"
            stroke-linecap="round" transform="rotate(-90 28 28)"/>
        </svg>
        <span class="ringPct">${pct}%</span>
      </div>
    </div>
  `;
}

function renderKidTasks() {
  const kid = _state.kids.find(k => k.id === _activeKidId);
  if (!kid) return;
  const ks = kidState(_state, kid.id);
  const tasks = (_state.tasks[kid.id] || []);
  const main = document.getElementById('kidMain');
  if (!main) return;

  const pts = getPoints(_state, kid.id);
  const maxPts = getMaxPoints(_state, kid.id);
  const allDone = pts >= maxPts && tasks.length > 0;

  main.innerHTML = `
    ${allDone ? `<div class="kidCelebration">
      <div class="celebEmoji">��</div>
      <div class="celebText">Amazing work, ${kid.name}!</div>
      <div class="celebSub">You completed all your chores today!</div>
    </div>` : ''}
    <div class="kidChoreGrid" id="kidChoreGrid"></div>
    <div class="kidLevelBar">
      <div class="kidLevelInfo">
        ${(() => {
          const lvl = getLevel(ks.totalPoints || 0);
          const prev = lvl.level > 1 ? [0,100,300,600,1000,2000][lvl.level-1] : 0;
          const next = lvl.next === Infinity ? (ks.totalPoints || 0) : lvl.next;
          const lpct = next === Infinity ? 100 : Math.min(100, ((ks.totalPoints || 0) - prev) / (next - prev) * 100);
          return `<span>${lvl.emoji} ${lvl.name}</span>
          <div class="lvlBarOuter"><div class="lvlBarInner" style="width:${lpct}%;background:${kid.color}"></div></div>
          <span>${ks.totalPoints || 0} pts total</span>`;
        })()}
      </div>
    </div>
  `;

  const grid = main.querySelector('#kidChoreGrid');
  tasks.forEach((t, i) => {
    const dKey = taskKey(t.id);
    const isDone = !!(ks.done || {})[dKey];
    const card = document.createElement('button');
    card.className = `choreCard${isDone ? ' done' : ''}`;
    card.style.setProperty('--kid', kid.color);
    card.style.animationDelay = `${i * 0.06}s`;
    card.type = 'button';
    card.innerHTML = `
      <div class="choreEmoji">${t.emoji || '✅'}</div>
      <div class="choreTitle">${t.title}</div>
      <div class="choreHelper">${isDone ? '✓ Done!' : t.helper}</div>
      <div class="chorePts ${isDone ? 'done' : ''}">+${t.pts}</div>
      ${isDone ? '<div class="choreCheck">✓</div>' : ''}
    `;
    card.onclick = () => toggleChore(_activeKidId, t);
    grid.appendChild(card);
  });

  if (tasks.length === 0) {
    grid.innerHTML = '<div class="kidNoTasks">No chores yet! Ask a parent to add some.</div>';
  }
}

function toggleChore(kidId, task) {
  const ks = kidState(_state, kidId);
  const dKey = taskKey(task.id);
  ks.done = ks.done || {};
  const wasDone = !!ks.done[dKey];

  if (wasDone) {
    delete ks.done[dKey];
    const pts = getPoints(_state, kidId);
    setPoints(_state, kidId, pts - task.pts);
    ks.totalPoints = Math.max(0, (ks.totalPoints || 0) - task.pts);
  } else {
    ks.done[dKey] = true;
    const pts = getPoints(_state, kidId);
    setPoints(_state, kidId, pts + task.pts);
    ks.totalPoints = (ks.totalPoints || 0) + task.pts;

    logHistory(_state, kidId, { message: `Completed "${task.title}"`, task: task.title, pts: task.pts });

    // Check for treats
    const newPts = getPoints(_state, kidId);
    const maxPts = getMaxPoints(_state, kidId);
    if (newPts >= maxPts) {
      ks.treats = (ks.treats || 0) + 1;
      updateStreak(_state, kidId);
      save(_state);
      launchConfetti();
      const kid = _state.kids.find(k => k.id === kidId);
      showModal(`Amazing, ${kid?.name}! 🎉`, `You finished all your chores! You earned a treat! 🍬`, false, '🏆');
    }

    // Easter egg chance
    const egg = rollEgg(EGGS);
    if (egg) {
      ks.eggs = (ks.eggs || 0) + 1;
      launchConfetti();
      showModal(egg.title, egg.text, false, egg.emoji);
    }
  }

  save(_state);
  renderKidHeader();
  renderKidTasks();
  if (_onUpdate) _onUpdate();
}

export function getActiveKidId() { return _activeKidId; }
