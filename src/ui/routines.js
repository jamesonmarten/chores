// FILE: src/ui/routines.js
// Routines = chore chains. Run a routine to auto-advance through its tasks
// with a per-step countdown, marking each as done.

import {
  getRoutines, addRoutine, removeRoutine,
  kidState, getPoints, setPoints, getMaxPoints, logHistory,
  updateStreak, save,
} from '../state/store.js';
import { today, taskKey } from '../utils/date.js';
import { playSfx } from '../utils/effects.js';
import { launchConfetti } from '../utils/helpers.js';
import { playVoice } from '../utils/voice.js';

const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const modal    = () => document.getElementById('parentModal');
const modalBox = () => document.getElementById('parentModalBox');

function open(html) {
  modalBox().innerHTML = html;
  modal().hidden = false;
  requestAnimationFrame(() => modal().classList.add('show'));
}
function close() {
  modal().classList.remove('show');
  setTimeout(() => { modal().hidden = true; modalBox().innerHTML = ''; }, 220);
}

/** Parent-side routine manager. */
export function showRoutinesModal(state, onUpdate) {
  if (!state.kids.length) {
    open(`<button class="pmClose modalCloseX">✕</button>
      <h2 class="pmTitle">🌟 Routines</h2>
      <p>Add a kid first, then come back to build routines.</p>
      <button class="btn" id="rtClose">Close</button>`);
    document.getElementById('rtClose').onclick = close;
    modalBox().querySelector('.pmClose').onclick = close;
    return;
  }
  open(`
    <button class="pmClose modalCloseX">✕</button>
    <h2 class="pmTitle">🌟 Routines</h2>
    <p class="pmSub">Chain chores into one-tap flows like "Bedtime" or "Get Ready for School".</p>
    <div class="rtTabs">
      ${state.kids.map((k, i) => `
        <button class="rwTab${i===0?' active':''}" data-kid="${k.id}" style="--kid:${k.color}">
          ${k.avatar || k.initial} ${esc(k.name)}
        </button>`).join('')}
    </div>
    <div id="rtBody"></div>
    <button id="rtCloseBtn" class="linkBtn" style="margin-top:18px">Close</button>
  `);
  modalBox().querySelector('.pmClose').onclick = close;
  document.getElementById('rtCloseBtn').onclick = close;

  const renderTab = (kidId) => {
    const tasks = (state.tasks[kidId] || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const routines = getRoutines(state, kidId);
    const body = document.getElementById('rtBody');
    body.innerHTML = `
      <div class="rtAddForm">
        <input id="rtName" placeholder="Routine name (e.g. Bedtime)" maxlength="40">
        <input id="rtEmoji" value="🌙" maxlength="4">
        <input id="rtStep" type="number" min="10" max="600" value="60" title="Seconds per step">
        <button id="rtAdd" class="btn green">+ Add Routine</button>
      </div>
      <div class="rtAddPicker">
        <div class="rtPickerLabel">Tap chores to include (in order):</div>
        <div class="rtPickerGrid">
          ${tasks.length ? tasks.map(t => `
            <button type="button" class="rtPickChip" data-task="${t.id}">
              <span>${t.emoji || '✅'}</span> ${esc(t.title)}
            </button>`).join('') : '<span class="rtEmpty">No tasks yet for this kid.</span>'}
        </div>
        <div class="rtPickedRow" id="rtPickedRow"></div>
      </div>

      <hr class="rtSep">
      <div class="rtList">
        ${routines.length === 0 ? '<div class="emptyTasks">No routines yet.</div>' :
          routines.map(r => {
            const titles = r.taskIds.map(id => tasks.find(t => t.id === id)?.title || '?').join(' → ');
            return `
              <div class="rtRow">
                <div class="rtRowMain">
                  <span class="rtEmoji">${r.emoji}</span>
                  <div class="rtInfo">
                    <strong>${esc(r.name)}</strong>
                    <div class="rtMeta">${r.taskIds.length} steps · ${r.stepSeconds}s each</div>
                    <div class="rtChain">${esc(titles)}</div>
                  </div>
                  <button class="tinyBtn red" data-rt-del="${r.id}">✕</button>
                </div>
              </div>`;
          }).join('')}
      </div>
    `;

    // Picker state
    const picked = [];
    const pickedRow = body.querySelector('#rtPickedRow');
    const renderPicked = () => {
      pickedRow.innerHTML = picked.length
        ? picked.map((id, i) => {
            const t = tasks.find(x => x.id === id);
            return `<span class="rtPickedChip">${i+1}. ${t?.emoji || '✅'} ${esc(t?.title || '?')}</span>`;
          }).join('') + ` <button type="button" class="linkBtn" id="rtClearPicked">clear</button>`
        : '<span class="rtPickerHint">No steps picked yet.</span>';
      const clr = body.querySelector('#rtClearPicked');
      if (clr) clr.onclick = () => { picked.length = 0; renderPicked(); };
    };
    renderPicked();
    body.querySelectorAll('.rtPickChip').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.task;
        const idx = picked.indexOf(id);
        if (idx >= 0) picked.splice(idx, 1);
        else picked.push(id);
        btn.classList.toggle('on', picked.includes(id));
        renderPicked();
      };
    });

    document.getElementById('rtAdd').onclick = () => {
      const name = document.getElementById('rtName').value.trim();
      if (!name || !picked.length) {
        alert('Give the routine a name and pick at least one step.');
        return;
      }
      addRoutine(state, kidId, {
        name,
        emoji: document.getElementById('rtEmoji').value || '🌟',
        taskIds: picked.slice(),
        stepSeconds: parseInt(document.getElementById('rtStep').value, 10) || 60,
      });
      renderTab(kidId);
      onUpdate?.();
    };
    body.querySelectorAll('[data-rt-del]').forEach(b => b.onclick = () => {
      removeRoutine(state, kidId, b.dataset.rtDel);
      renderTab(kidId);
      onUpdate?.();
    });
  };

  modalBox().querySelectorAll('.rwTab').forEach(tab => {
    tab.onclick = () => {
      modalBox().querySelectorAll('.rwTab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTab(tab.dataset.kid);
    };
  });
  if (state.kids[0]) renderTab(state.kids[0].id);
}

/**
 * Run a routine for a kid (kid-side). Full-screen overlay with current step,
 * countdown, "Done", "Skip". Auto-advances when timer expires.
 */
export function runRoutine(state, kidId, routineId, onComplete) {
  const routine = getRoutines(state, kidId).find(r => r.id === routineId);
  if (!routine) return;
  const tasks = state.tasks[kidId] || [];
  const steps = routine.taskIds
    .map(id => tasks.find(t => t.id === id))
    .filter(Boolean);
  if (!steps.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'routineOverlay';
  overlay.innerHTML = `
    <div class="rtoBox">
      <button class="rtoClose" id="rtoClose">✕</button>
      <div class="rtoTitle"><span id="rtoEmoji">${routine.emoji}</span> ${esc(routine.name)}</div>
      <div class="rtoStepCount" id="rtoStepCount"></div>
      <div class="rtoTaskEmoji" id="rtoTaskEmoji"></div>
      <div class="rtoTaskTitle" id="rtoTaskTitle"></div>
      <div class="rtoRing">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="9"/>
          <circle id="rtoArc" cx="60" cy="60" r="54" fill="none" stroke="#54b8ff" stroke-width="9"
            stroke-linecap="round" transform="rotate(-90 60 60)"
            stroke-dasharray="${2*Math.PI*54}" stroke-dashoffset="0"/>
        </svg>
        <span class="rtoTimeLeft" id="rtoTimeLeft">--</span>
      </div>
      <div class="rtoActions">
        <button class="btn green" id="rtoDone">✓ Done</button>
        <button class="btn" id="rtoSkip">Skip ➜</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let stepIdx = 0;
  let remaining = routine.stepSeconds;
  let intervalId = null;
  let curAudio = null;
  const ks = kidState(state, kidId);

  const cleanup = () => {
    if (intervalId) clearInterval(intervalId);
    if (curAudio) { try { curAudio.pause(); } catch {} }
    overlay.remove();
  };

  const finish = (didFinishAll) => {
    cleanup();
    if (didFinishAll) {
      launchConfetti();
      playSfx('reward');
    }
    onComplete?.(didFinishAll);
  };

  const renderStep = () => {
    const t = steps[stepIdx];
    document.getElementById('rtoStepCount').textContent = `Step ${stepIdx+1} of ${steps.length}`;
    document.getElementById('rtoTaskEmoji').textContent = t.emoji || '✅';
    document.getElementById('rtoTaskTitle').textContent = t.title;
    remaining = routine.stepSeconds;
    updateRing();
    if (curAudio) { try { curAudio.pause(); } catch {} curAudio = null; }
    if (t.voiceUrl) curAudio = playVoice(t.voiceUrl);
  };

  const updateRing = () => {
    const arc = document.getElementById('rtoArc');
    const lbl = document.getElementById('rtoTimeLeft');
    const C = 2 * Math.PI * 54;
    const pct = remaining / routine.stepSeconds;
    if (arc) arc.setAttribute('stroke-dashoffset', String(C * (1 - pct)));
    if (lbl) lbl.textContent = `${remaining}s`;
  };

  const markCurrentDone = () => {
    const t = steps[stepIdx];
    const dKey = taskKey(t.id);
    ks.done = ks.done || {};
    if (!ks.done[dKey]) {
      ks.done[dKey] = true;
      setPoints(state, kidId, getPoints(state, kidId) + t.pts);
      ks.totalPoints = (ks.totalPoints || 0) + t.pts;
      logHistory(state, kidId, { message: `Routine "${routine.name}": ${t.title}`, task: t.title, pts: t.pts });
      playSfx('done');
      const max = getMaxPoints(state, kidId);
      if (getPoints(state, kidId) >= max) {
        ks.treats = (ks.treats || 0) + 1;
        updateStreak(state, kidId);
      }
      save(state);
    }
  };

  const advance = (markDone) => {
    if (markDone) markCurrentDone();
    stepIdx++;
    if (stepIdx >= steps.length) return finish(true);
    renderStep();
  };

  document.getElementById('rtoDone').onclick = () => advance(true);
  document.getElementById('rtoSkip').onclick = () => advance(false);
  document.getElementById('rtoClose').onclick = () => finish(false);

  intervalId = setInterval(() => {
    remaining--;
    updateRing();
    if (remaining <= 5 && remaining > 0) playSfx('tick');
    if (remaining <= 0) { playSfx('warn'); advance(true); }
  }, 1000);

  renderStep();
}
