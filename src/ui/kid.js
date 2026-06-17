// FILE: src/ui/kid.js
import { today, taskKey } from '../utils/date.js';
import {
  kidState, getPoints, setPoints, getMaxPoints, getLevel,
  logHistory, updateStreak, save,
  getTasksSorted, TIME_PERIODS, currentPeriod,
  rotationOwnerOn,
} from '../state/store.js';
import { launchConfetti, rollEgg } from '../utils/helpers.js';
import { EGGS } from '../data/eggs.js';
import { showModal } from './render.js';
import { showTaskTimer, showTaskVideo } from './task-extras.js';
import { renderRewardChipsForKid } from './rewards.js';
import { playSfx } from '../utils/effects.js';
import { playVoice } from '../utils/voice.js';
import { renderNotesStrip } from './notes.js';
import { getRoutines } from '../state/store.js';
import { runRoutine } from './routines.js';
import { hapticTap, hapticSuccess, hapticCelebrate, hapticUndo } from '../utils/haptics.js';
import { showToast } from '../utils/toast.js';

let _activeKidId = null;
let _state = null;
let _onUpdate = null;
let _filter = 'all';   // 'all' | 'todo' | 'done'  — kid-chosen view filter

const FILTER_KEY = 'familyChoresKidFilter';
try { _filter = localStorage.getItem(FILTER_KEY) || 'all'; } catch {}

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
    <div class="kidAvatarBig">${kid.photo ? `<img class="kidAvImg" src="${kid.photo}" alt="">` : (kid.avatar || kid.initial)}</div>
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
  const iso = today();
  // Hide rotating tasks that aren't this kid's turn today.
  const tasks = getTasksSorted(_state, kid.id).filter(t => {
    const owner = rotationOwnerOn(t, iso);
    return !owner || owner === kid.id;
  });
  const main = document.getElementById('kidMain');
  if (!main) return;

  const pts = getPoints(_state, kid.id);
  const maxPts = getMaxPoints(_state, kid.id);
  const allDone = pts >= maxPts && tasks.length > 0;

  // Completion stats for the progress tracker
  const doneCount = tasks.filter(t => !!(ks.done || {})[taskKey(t.id)]).length;
  const totalCount = tasks.length;
  const donePct = totalCount ? Math.round(doneCount / totalCount * 100) : 0;

  // Group tasks by time-of-day
  const cur = currentPeriod();
  const groups = [
    ...TIME_PERIODS.map(p => ({ ...p, tasks: tasks.filter(t => t.timeOfDay === p.id) })),
    { id: 'any', label: 'Any time', emoji: '⭐', tasks: tasks.filter(t => !t.timeOfDay || t.timeOfDay === 'any') },
  ].filter(g => g.tasks.length > 0);

  main.innerHTML = `
    ${allDone ? `<div class="kidCelebration">
      <div class="celebEmoji">🎉</div>
      <div class="celebText">Amazing work, ${kid.name}!</div>
      <div class="celebSub">You completed all your chores today!</div>
    </div>` : ''}
    ${totalCount ? `
    <div class="kidProgressTracker" style="--kid:${kid.color}">
      <div class="kptTop">
        <div class="kptCount"><span class="kptDone">${doneCount}</span> <span class="kptOf">of ${totalCount} done</span></div>
        <div class="kptPct">${donePct}%</div>
      </div>
      <div class="kptBarOuter">
        <div class="kptBarInner" style="width:${donePct}%"></div>
      </div>
      <div class="kidFilters" role="tablist" aria-label="Filter chores">
        <button class="kidFilterChip${_filter === 'all' ? ' active' : ''}" data-filter="all" role="tab">All ${totalCount}</button>
        <button class="kidFilterChip${_filter === 'todo' ? ' active' : ''}" data-filter="todo" role="tab">To-do ${totalCount - doneCount}</button>
        <button class="kidFilterChip${_filter === 'done' ? ' active' : ''}" data-filter="done" role="tab">Done ${doneCount}</button>
      </div>
    </div>` : ''}
    <div id="kidNotesStrip" class="notesStripWrap"></div>
    <div id="kidRoutinesBar"></div>
    <div id="kidRewardsContainer"></div>
    <div id="kidGroupsWrap"></div>
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

  // Filter chip wiring
  main.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
    _filter = b.dataset.filter;
    try { localStorage.setItem(FILTER_KEY, _filter); } catch {}
    hapticTap();
    renderKidTasks();
  });

  // Reward chips
  renderRewardChipsForKid(_state, kid.id, main.querySelector('#kidRewardsContainer'));

  // Family notes (read-only on kid screen)
  renderNotesStrip(_state, main.querySelector('#kidNotesStrip'), { editable: false });

  // Routine launcher chips for this kid
  const routines = getRoutines(_state, kid.id);
  const rtBar = main.querySelector('#kidRoutinesBar');
  if (routines.length) {
    rtBar.innerHTML = `
      <div class="kidRoutinesBar">
        <div class="kidRoutinesTitle">🌟 Routines</div>
        <div class="kidRoutinesList">
          ${routines.map(r => `
            <button class="kidRoutineChip" data-routine="${r.id}" style="--kid:${kid.color}">
              <span class="krEmoji">${r.emoji}</span>
              <span class="krName">${r.name}</span>
              <span class="krSteps">${r.taskIds.length} steps</span>
            </button>`).join('')}
        </div>
      </div>`;
    rtBar.querySelectorAll('[data-routine]').forEach(b => b.onclick = () => {
      runRoutine(_state, kid.id, b.dataset.routine, () => {
        renderKidHeader();
        renderKidTasks();
        if (_onUpdate) _onUpdate();
      });
    });
  }

  // Render grouped task sections
  const wrap = main.querySelector('#kidGroupsWrap');
  let shownCards = 0;
  groups.forEach((g, gi) => {
    // Apply the kid's chosen filter (all / todo / done)
    const visible = g.tasks.filter(t => {
      const isDone = !!(ks.done || {})[taskKey(t.id)];
      if (_filter === 'todo') return !isDone;
      if (_filter === 'done') return isDone;
      return true;
    });
    if (!visible.length) return;

    const isCurrent = g.id === cur;
    const section = document.createElement('section');
    section.className = `kidGroup${isCurrent ? ' current' : ''}`;
    const gDone = g.tasks.filter(t => !!(ks.done || {})[taskKey(t.id)]).length;
    section.innerHTML = `
      <h3 class="kidGroupTitle">
        <span>${g.emoji} ${g.label}</span>
        <span class="kidGroupMeta">
          ${isCurrent ? '<span class="kidGroupNow">Now</span>' : ''}
          <span class="kidGroupCount">${gDone}/${g.tasks.length}</span>
        </span>
      </h3>
      <div class="kidChoreGrid"></div>
    `;
    const grid = section.querySelector('.kidChoreGrid');
    visible.forEach((t, i) => {
      const dKey = taskKey(t.id);
      const isDone = !!(ks.done || {})[dKey];
      // Use a div (not <button>) so the optional extra <button>s inside stay
      // valid HTML; we add full button semantics + keyboard support manually.
      const card = document.createElement('div');
      card.className = `choreCard${isDone ? ' done' : ''}`;
      card.style.setProperty('--kid', kid.color);
      card.style.animationDelay = `${(shownCards++) * 0.04}s`;
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.setAttribute('aria-pressed', isDone ? 'true' : 'false');
      card.setAttribute('aria-label', `${t.title}${isDone ? ', done' : ''}, ${t.pts} points`);
      card.innerHTML = `
        <div class="choreCheckCircle" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="choreEmoji">${t.emoji || '✅'}</div>
        <div class="choreTitle">${t.title}</div>
        <div class="choreHelper">${isDone ? '✓ Done — nice!' : (t.helper || 'Tap when finished')}</div>
        <div class="chorePts ${isDone ? 'done' : ''}">+${t.pts} pts</div>
        ${(t.timerSec > 0 || t.videoUrl || t.voiceUrl) && !isDone ? `
          <div class="choreExtras">
            ${t.voiceUrl ? `<button class="choreExtraBtn" data-voice="${t.id}" title="Play parent's voice">🔊 Listen</button>` : ''}
            ${t.videoUrl ? `<button class="choreExtraBtn" data-video="${t.id}" title="Watch instructions">🎥 How-to</button>` : ''}
            ${t.timerSec > 0 ? `<button class="choreExtraBtn" data-timer="${t.id}" title="Start ${t.timerSec}s timer">⏱ ${t.timerSec}s</button>` : ''}
          </div>` : ''}
      `;
      // Main card click → toggle (but not when clicking extras)
      card.onclick = (e) => {
        if (e.target.closest('.choreExtraBtn')) return;
        toggleChore(_activeKidId, t);
      };
      // Keyboard: Enter/Space toggles, just like a real button
      card.onkeydown = (e) => {
        if (e.target.closest('.choreExtraBtn')) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          toggleChore(_activeKidId, t);
        }
      };
      grid.appendChild(card);
    });
    wrap.appendChild(section);
  });

  if (tasks.length === 0) {
    wrap.innerHTML = '<div class="kidNoTasks">No chores yet! Ask a parent to add some. 🌱</div>';
  } else if (shownCards === 0) {
    // Filter hid everything — friendly empty state
    const msg = _filter === 'done'
      ? 'Nothing finished yet — you got this! 💪'
      : 'All done here! Tap “All” to see everything. 🎉';
    wrap.innerHTML = `<div class="kidNoTasks">${msg}</div>`;
  }

  // Tomorrow preview (collapsed by default)
  if (tasks.length > 0) {
    const tomorrow = document.createElement('details');
    tomorrow.className = 'kidTomorrow';
    const totalPts = tasks.reduce((a, t) => a + t.pts, 0);
    tomorrow.innerHTML = `
      <summary class="kidTomorrowSummary">
        🔮 <strong>Tomorrow</strong> · ${tasks.length} chores · up to ${totalPts} pts
      </summary>
      <div class="kidTomorrowList">
        ${tasks.map(t => `
          <div class="kidTomRow" style="--kid:${kid.color}">
            <span>${t.emoji || '✅'}</span>
            <span class="ktTitle">${t.title}</span>
            <span class="ktPts">+${t.pts}</span>
          </div>`).join('')}
      </div>
    `;
    wrap.appendChild(tomorrow);
  }

  // Wire extras
  wrap.querySelectorAll('[data-video]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const t = tasks.find(x => x.id === b.dataset.video);
    if (t) showTaskVideo(t);
  });
  wrap.querySelectorAll('[data-timer]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const t = tasks.find(x => x.id === b.dataset.timer);
    if (t) showTaskTimer(t, () => toggleChore(_activeKidId, t));
  });
  wrap.querySelectorAll('[data-voice]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const t = tasks.find(x => x.id === b.dataset.voice);
    if (t?.voiceUrl) playVoice(t.voiceUrl);
  });
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
    hapticUndo();
  } else {
    ks.done[dKey] = true;
    const pts = getPoints(_state, kidId);
    setPoints(_state, kidId, pts + task.pts);
    ks.totalPoints = (ks.totalPoints || 0) + task.pts;

    logHistory(_state, kidId, { message: `Completed "${task.title}"`, task: task.title, pts: task.pts });
    playSfx('done');
    hapticSuccess();

    // Quick, non-blocking feedback with an Undo (kids stay in flow)
    showToast({
      emoji: task.emoji || '✅',
      text: `+${task.pts} points!`,
      tone: 'success',
      actionText: 'Undo',
      onAction: () => toggleChore(kidId, task),
    });

    // Check for treats
    const newPts = getPoints(_state, kidId);
    const maxPts = getMaxPoints(_state, kidId);
    if (newPts >= maxPts) {
      ks.treats = (ks.treats || 0) + 1;
      updateStreak(_state, kidId);
      save(_state);
      launchConfetti();
      playSfx('levelUp');
      hapticCelebrate();
      const kid = _state.kids.find(k => k.id === kidId);
      showModal(`Amazing, ${kid?.name}! 🎉`, `You finished all your chores! You earned a treat! 🍬`, false, '🏆');
    }

    // Easter egg chance
    const egg = rollEgg(EGGS);
    if (egg) {
      ks.eggs = (ks.eggs || 0) + 1;
      launchConfetti();
      playSfx('reward');
      hapticCelebrate();
      showModal(egg.title, egg.text, false, egg.emoji);
    }
  }

  save(_state);
  renderKidHeader();
  renderKidTasks();
  if (_onUpdate) _onUpdate();
}

export function getActiveKidId() { return _activeKidId; }
