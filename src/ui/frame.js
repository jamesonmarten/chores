// FILE: src/ui/frame.js
// Frame Mode — full-screen rotating family dashboard for a kitchen iPad / wall display.
// Pure DOM, requests Wake Lock, rotates one card per kid every ~10s.

import { kidState, getPoints, getMaxPoints, getNotes } from '../state/store.js';

let _wakeLock = null;
let _timer = null;
let _idx = 0;

const isoOf = (d) => d.toISOString().slice(0, 10);

export async function enterFrameMode(state) {
  document.documentElement.classList.add('frameMode');
  let layer = document.getElementById('frameLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'frameLayer';
    layer.className = 'frameLayer';
    document.body.appendChild(layer);
  }
  layer.hidden = false;

  // Build skeleton
  layer.innerHTML = `
    <button class="frameClose" id="frameClose" title="Exit Frame Mode (Esc)">✕</button>
    <div class="frameClock" id="frameClock"></div>
    <div class="frameStage" id="frameStage"></div>
    <div class="frameDots" id="frameDots"></div>
    <div class="frameNotes" id="frameNotes"></div>
  `;

  document.getElementById('frameClose').onclick = exitFrameMode;
  document.addEventListener('keydown', escClose);

  // Wake lock
  try {
    if ('wakeLock' in navigator) {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener?.('release', () => { _wakeLock = null; });
    }
  } catch {}

  _idx = 0;
  tick(state);
  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => { _idx++; tick(state); }, 10000);

  // Re-acquire wake lock on visibility resume
  document.addEventListener('visibilitychange', reacquireWakeLock);
}

function escClose(e) { if (e.key === 'Escape') exitFrameMode(); }

async function reacquireWakeLock() {
  if (document.visibilityState === 'visible' && !_wakeLock && 'wakeLock' in navigator) {
    try { _wakeLock = await navigator.wakeLock.request('screen'); } catch {}
  }
}

export function exitFrameMode() {
  document.documentElement.classList.remove('frameMode');
  const layer = document.getElementById('frameLayer');
  if (layer) layer.hidden = true;
  if (_timer) { clearInterval(_timer); _timer = null; }
  document.removeEventListener('keydown', escClose);
  document.removeEventListener('visibilitychange', reacquireWakeLock);
  if (_wakeLock) { try { _wakeLock.release(); } catch {} _wakeLock = null; }
}

function tick(state) {
  // Refresh clock every tick
  const clock = document.getElementById('frameClock');
  if (clock) {
    const now = new Date();
    clock.innerHTML = `
      <div class="fcTime">${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
      <div class="fcDate">${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    `;
  }

  // Notes ticker
  const notesEl = document.getElementById('frameNotes');
  const notes = getNotes(state);
  if (notesEl) {
    notesEl.innerHTML = notes.length
      ? notes.slice(0, 3).map(n => `<span class="frameNote" style="background:${n.color}">${n.emoji} ${escape(n.text)}</span>`).join('')
      : '';
  }

  const stage = document.getElementById('frameStage');
  const dots  = document.getElementById('frameDots');
  if (!stage) return;

  if (!state.kids.length) {
    stage.innerHTML = `<div class="frameEmpty">No kids yet — add one in Parent mode.</div>`;
    if (dots) dots.innerHTML = '';
    return;
  }

  const slides = ['family', ...state.kids.map(k => k.id)];
  const cur = slides[_idx % slides.length];

  if (cur === 'family') {
    stage.innerHTML = familyOverview(state);
  } else {
    stage.innerHTML = kidSlide(state, cur);
  }

  if (dots) {
    dots.innerHTML = slides.map((_, i) => `<span class="frameDot ${i === _idx % slides.length ? 'on' : ''}"></span>`).join('');
  }
}

function familyOverview(state) {
  const todayIso = isoOf(new Date());
  const rows = state.kids.map(k => {
    const pts = getPoints(state, k.id, todayIso);
    const max = getMaxPoints(state, k.id);
    const pct = max ? Math.round(pts / max * 100) : 0;
    const ks = kidState(state, k.id);
    return { kid: k, pts, max, pct, streak: ks.streak || 0 };
  });
  const allDone = rows.length && rows.every(r => r.max > 0 && r.pts >= r.max);
  return `
    <div class="frameSlide frameFamilySlide ${allDone ? 'frameAllDone' : ''}">
      <div class="frameHello">${allDone ? '🏆 Everyone crushed today!' : '✨ Today at a Glance'}</div>
      <div class="frameKidGrid">
        ${rows.map(r => `
          <div class="frameKidTile" style="--kid:${r.kid.color}">
            <div class="ftAv">${r.kid.photo ? `<img src="${r.kid.photo}" alt="">` : (r.kid.avatar || r.kid.initial)}</div>
            <div class="ftName">${escape(r.kid.name)}</div>
            <div class="ftPctBig" style="color:${r.kid.color}">${r.pct}%</div>
            <div class="ftMeta">${r.pts}/${r.max} pts ${r.streak ? `· 🔥 ${r.streak}` : ''}</div>
            <div class="ftBar"><div style="width:${r.pct}%;background:${r.kid.color}"></div></div>
          </div>`).join('')}
      </div>
    </div>`;
}

function kidSlide(state, kidId) {
  const kid = state.kids.find(k => k.id === kidId);
  if (!kid) return '';
  const ks = kidState(state, kid.id);
  const tasks = (state.tasks[kid.id] || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const todayIso = isoOf(new Date());
  const pts = getPoints(state, kid.id, todayIso);
  const max = getMaxPoints(state, kid.id);
  const pct = max ? Math.round(pts / max * 100) : 0;
  const remaining = tasks.filter(t => !(ks.done || {})[`${todayIso}_${t.id}`]).slice(0, 6);
  return `
    <div class="frameSlide frameKidSlide" style="--kid:${kid.color}">
      <div class="fksHead">
        <div class="fksAv">${kid.photo ? `<img src="${kid.photo}" alt="">` : (kid.avatar || kid.initial)}</div>
        <div>
          <div class="fksName">${escape(kid.name)}</div>
          <div class="fksMeta">${pts}/${max} pts · ${pct}% · 🔥 ${ks.streak || 0}</div>
        </div>
        <div class="fksPct" style="color:${kid.color}">${pct}%</div>
      </div>
      <div class="fksTasks">
        ${remaining.length ? remaining.map(t => `
          <div class="fksTask">
            <span>${t.emoji || '✅'}</span>
            <span class="fksTaskTitle">${escape(t.title)}</span>
            <span class="fksTaskPts">+${t.pts}</span>
          </div>`).join('')
          : `<div class="fksDone">🎉 All done for today!</div>`}
      </div>
    </div>`;
}

function escape(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
