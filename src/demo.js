// FILE: src/demo.js — interactive demo logic
const KIDS = [
  { id: 'lincoln', name: 'Lincoln', age: '4 yrs',  emoji: '🦁', color: '#4ade80' },
  { id: 'sienna',  name: 'Sienna',  age: '17 yrs', emoji: '⭐', color: '#a78bfa' },
  { id: 'josie',   name: 'Josie',   age: '4 mo',   emoji: '👶', color: '#f472b6' },
];
const TASKS = {
  lincoln: [
    { id: 'toys',    title: 'Pick up toys',     pts: 20, emoji: '🧩' },
    { id: 'clothes', title: 'Put away clothes', pts: 15, emoji: '👕' },
    { id: 'dishes',  title: 'Help with dishes', pts: 15, emoji: '🍽️' },
    { id: 'kind',    title: 'Be a kind helper', pts: 20, emoji: '💛' },
    { id: 'room',    title: 'Clean room',       pts: 30, emoji: '🏠' },
  ],
  sienna: [
    { id: 'room',    title: 'Clean room',     pts: 20, emoji: '🛏️' },
    { id: 'laundry', title: 'Do laundry',     pts: 20, emoji: '🧺' },
    { id: 'kitchen', title: 'Kitchen help',   pts: 15, emoji: '🍳' },
    { id: 'trash',   title: 'Take out trash', pts: 15, emoji: '♻️' },
    { id: 'help',    title: 'Help siblings',  pts: 30, emoji: '🤝' },
  ],
  josie: [
    { id: 'tummy',   title: 'Tummy time',     pts: 15, emoji: '🤸' },
    { id: 'feed',    title: 'Feeding time',   pts: 15, emoji: '🍼' },
    { id: 'diaper',  title: 'Diaper change',  pts: 10, emoji: '✨' },
    { id: 'nap',     title: 'Nap time',       pts: 20, emoji: '😴' },
    { id: 'bed',     title: 'Bedtime',        pts: 25, emoji: '🌙' },
  ],
};
const state = {
  view: 'parent',
  currentKid: 'lincoln',
  done: {
    lincoln: { toys: true, clothes: true },
    sienna:  { room: true, laundry: true, kitchen: true, trash: true, help: true },
    josie:   { tummy: true },
  },
};

const $ = id => document.getElementById(id);
const totalDone = id => Object.values(state.done[id] || {}).filter(Boolean).length;
const pointsFor = id => (TASKS[id] || []).reduce((a, t) => a + (state.done[id]?.[t.id] ? t.pts : 0), 0);
const maxFor    = id => (TASKS[id] || []).reduce((a, t) => a + t.pts, 0);
const pctFor    = id => Math.round(pointsFor(id) / maxFor(id) * 100);

function levelFor(pts) {
  if (pts < 30)  return { name: 'Rookie',    emoji: '🌱', next: 30,  prev: 0 };
  if (pts < 60)  return { name: 'Helper',    emoji: '⭐', next: 60,  prev: 30 };
  if (pts < 90)  return { name: 'Champion',  emoji: '🏆', next: 90,  prev: 60 };
  if (pts < 130) return { name: 'Hero',      emoji: '🦸', next: 130, prev: 90 };
  return                { name: 'Superstar', emoji: '💫', next: 200, prev: 130 };
}

const palette = ['#4ade80', '#38bdf8', '#a78bfa', '#f472b6', '#f59e0b'];
function burstConfetti() {
  const layer = $('confetti');
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confettiPiece';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.top  = '-10vh';
    p.style.background = palette[Math.floor(Math.random() * palette.length)];
    p.style.animationDelay = Math.random() * 0.2 + 's';
    p.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
    layer.appendChild(p);
    setTimeout(() => p.remove(), 2200);
  }
}

function renderParent() {
  const kidsCount = KIDS.length;
  const totalPts  = KIDS.reduce((a, k) => a + pointsFor(k.id), 0);
  const totalChor = KIDS.reduce((a, k) => a + totalDone(k.id), 0);
  const onTrack   = KIDS.filter(k => pctFor(k.id) >= 50).length;

  $('demoApp').innerHTML = `
    <div class="pv">
      <div class="pvHeader">
        <div>
          <div class="pvTitle">✨ Family Dashboard</div>
          <div class="pvSub">Tap any kid card to jump into their view</div>
        </div>
      </div>
      <div class="pvStats" data-tour="stats">
        <div class="pvStat"><div class="pvStatNum">${kidsCount}</div><div class="pvStatLbl">Kids</div></div>
        <div class="pvStat"><div class="pvStatNum">${totalChor}</div><div class="pvStatLbl">Chores done today</div></div>
        <div class="pvStat"><div class="pvStatNum">${totalPts}</div><div class="pvStatLbl">Points earned</div></div>
        <div class="pvStat"><div class="pvStatNum">${onTrack}/${kidsCount}</div><div class="pvStatLbl">On track</div></div>
      </div>
      <div class="pvKids" data-tour="kids">
        ${KIDS.map(k => {
          const pct = pctFor(k.id);
          return `
            <div class="pvKid" data-kid="${k.id}">
              <div class="pvKidTop">
                <span class="pvKidEm">${k.emoji}</span>
                <div>
                  <div class="pvKidName">${k.name}</div>
                  <div class="pvKidAge">${k.age}</div>
                </div>
              </div>
              <div class="pvKidBar"><div class="pvKidFill" style="width:${pct}%;background:${k.color}"></div></div>
              <div class="pvKidStats">
                <span>${totalDone(k.id)} / ${TASKS[k.id].length} chores</span>
                <span style="color:${k.color}">${pct}%</span>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div class="pvHint">👆 Tap a kid to switch to their view and try marking chores</div>
    </div>`;

  document.querySelectorAll('.pvKid').forEach(el => {
    el.onclick = () => {
      state.currentKid = el.dataset.kid;
      state.view = 'kid';
      updateTabs();
      render();
    };
  });
}

function renderKid() {
  const kid = KIDS.find(k => k.id === state.currentKid) || KIDS[0];
  const pts = pointsFor(kid.id);
  const max = maxFor(kid.id);
  const pct = pctFor(kid.id);
  const lvl = levelFor(pts);
  const lvlPct = Math.min(100, ((pts - lvl.prev) / (lvl.next - lvl.prev)) * 100);
  const r = 44, c = 2 * Math.PI * r;
  const dashOff = c * (1 - pct / 100);

  $('demoApp').innerHTML = `
    <div class="kv">
      <div class="kvSelect">
        ${KIDS.map(k => `
          <button class="kvSelectBtn ${k.id === kid.id ? 'active' : ''}" style="--kidColor:${k.color}" data-kid="${k.id}">
            <span class="kvSelectEm">${k.emoji}</span>
            <span class="kvSelectName">${k.name}</span>
          </button>`).join('')}
      </div>
      <div class="kvHeader">
        <div class="kvHi">Hi, ${kid.emoji}</div>
        <div class="kvName">${kid.name}!</div>
      </div>
      <div class="kvProgress" data-tour="progress">
        <div class="kvRing">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs><linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="${kid.color}"/>
              <stop offset="100%" stop-color="#a78bfa"/>
            </linearGradient></defs>
            <circle class="ringBg" cx="50" cy="50" r="${r}"></circle>
            <circle class="ringFg" cx="50" cy="50" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${dashOff}"></circle>
          </svg>
          <div class="kvRingPct">${pct}%</div>
        </div>
        <div class="kvLevel">
          <span class="kvLevelEm">${lvl.emoji}</span>
          <div class="kvLevelName">Level: ${lvl.name}</div>
          <div class="kvLevelBar"><div class="kvLevelFill" style="width:${lvlPct}%"></div></div>
          <div class="kvLevelPts">${pts} / ${max} points today</div>
        </div>
      </div>
      <div class="kvChores" data-tour="chores">
        ${TASKS[kid.id].map(t => {
          const done = !!state.done[kid.id]?.[t.id];
          return `
            <div class="kvChore ${done ? 'done' : ''}" data-task="${t.id}">
              <span class="kvChoreEm">${t.emoji}</span>
              <span class="kvChoreT">${t.title}</span>
              <span class="kvChoreP">+${t.pts}</span>
            </div>`;
        }).join('')}
      </div>
    </div>`;

  document.querySelectorAll('.kvSelectBtn').forEach(el => {
    el.onclick = () => { state.currentKid = el.dataset.kid; render(); };
  });
  document.querySelectorAll('.kvChore').forEach(el => {
    el.onclick = () => {
      const taskId = el.dataset.task;
      state.done[kid.id] = state.done[kid.id] || {};
      const wasDone = state.done[kid.id][taskId];
      state.done[kid.id][taskId] = !wasDone;
      render();
      if (!wasDone) {
        document.querySelector(`.kvChore[data-task="${taskId}"]`)?.classList.add('pop');
        if (pctFor(kid.id) === 100) burstConfetti();
      }
    };
  });
}

function updateTabs() {
  document.querySelectorAll('.tabBtn').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
}
document.querySelectorAll('.tabBtn').forEach(b => {
  b.onclick = () => { state.view = b.dataset.view; updateTabs(); render(); };
});
function render() { state.view === 'parent' ? renderParent() : renderKid(); }
render();

// ── Guided Tour ─────────────────────────────────────────────────────
// Each step targets a [data-tour="…"] element. `view` forces the right tab
// first, and `action` lets a step demo an interaction (e.g. complete a chore).
const TOUR_STEPS = [
  {
    view: 'parent', target: '[data-tour="stats"]',
    title: '1. Your family at a glance',
    body: 'The parent dashboard rolls up every kid: chores done, points earned today, and who\'s on track. No more nagging or spreadsheets.',
  },
  {
    view: 'parent', target: '[data-tour="kids"]',
    title: '2. One card per kid',
    body: 'Each kid gets a color-coded card with a live progress bar. Tap a card to jump straight into that child\'s view.',
  },
  {
    view: 'kid', target: '[data-tour="progress"]',
    title: '3. Kids see their own progress',
    body: 'A big, satisfying progress ring plus an XP-style level bar. Kids level up from Rookie → Superstar as they earn points.',
  },
  {
    view: 'kid', target: '[data-tour="chores"]',
    title: '4. Tap a chore = done 🎉',
    body: 'Tapping a chore marks it complete, adds points, and fills the ring. Finish them all and confetti rains down.',
    action: () => {
      const kid = state.currentKid;
      const firstUndone = (TASKS[kid] || []).find(t => !state.done[kid]?.[t.id]);
      if (firstUndone) {
        state.done[kid] = state.done[kid] || {};
        state.done[kid][firstUndone.id] = true;
        render();
      }
    },
  },
  {
    view: 'parent', target: '[data-tour="tabs"]',
    title: '5. Switch views anytime',
    body: 'Flip between the Parent dashboard and each Kid view with one tap. Parents manage; kids play.',
  },
  {
    view: 'parent', target: '[data-tour="cta"]',
    title: 'That\'s it! 🚀',
    body: 'Set this up for your own family in about 60 seconds — 7-day free trial, no credit card. Ready?',
    isLast: true,
  },
];

const tour = {
  i: 0,
  layer: $('tourLayer'),
  spot: $('tourSpotlight'),
  pop: $('tourPop'),
};

function showTourStep(idx) {
  const step = TOUR_STEPS[idx];
  if (!step) return endTour();
  tour.i = idx;

  // Ensure the right tab/view is active, then wait a frame for re-render.
  if (state.view !== step.view) {
    state.view = step.view;
    updateTabs();
    render();
  }
  if (step.action) step.action();

  requestAnimationFrame(() => requestAnimationFrame(() => positionTour(step)));
}

function positionTour(step) {
  const el = document.querySelector(step.target);
  if (!el) return;
  // Scroll the target into view first (it may be below the fold).
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    // The tour layer is position:fixed, so its children use viewport
    // coordinates directly — do NOT add window.scrollY (that pushed the
    // popover off-screen when the page was scrolled).
    const r = el.getBoundingClientRect();
    const pad = 8;
    Object.assign(tour.spot.style, {
      top:    `${r.top - pad}px`,
      left:   `${r.left - pad}px`,
      width:  `${r.width + pad * 2}px`,
      height: `${r.height + pad * 2}px`,
    });

    // Fill content BEFORE measuring the popover so its height is accurate.
    $('tourStepCount').textContent = `Step ${tour.i + 1} of ${TOUR_STEPS.length}`;
    $('tourTitle').textContent = step.title;
    $('tourBody').textContent = step.body;
    $('tourPrev').style.visibility = tour.i === 0 ? 'hidden' : 'visible';
    $('tourNext').textContent = step.isLast ? 'Start free trial →' : 'Next →';

    // Reveal the layer so the popover can be measured (display:none → 0 size).
    tour.layer.hidden = false;
    tour.layer.classList.add('show');

    // Now measure the real popover size and clamp it fully into the viewport.
    const margin = 16;
    const vw = window.innerWidth, vh = window.innerHeight;
    const pop = tour.pop.getBoundingClientRect();
    const popH = pop.height || 200;
    const popW = pop.width || 340;

    // Vertical: below the target if it fits, else above, else center.
    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;
    let top;
    if (spaceBelow >= popH + margin) {
      top = r.bottom + margin;
    } else if (spaceAbove >= popH + margin) {
      top = r.top - popH - margin;
    } else {
      top = (vh - popH) / 2;
    }
    // Final clamp — guarantees the whole popover stays on-screen.
    top = Math.max(margin, Math.min(top, vh - popH - margin));

    // Horizontal: center on the target, clamp to the viewport.
    let left = r.left + r.width / 2 - popW / 2;
    left = Math.max(margin, Math.min(left, vw - popW - margin));

    Object.assign(tour.pop.style, { top: `${top}px`, left: `${left}px` });
  }, 350);
}

function startTour() { showTourStep(0); }
function endTour() {
  tour.layer.classList.remove('show');
  setTimeout(() => { tour.layer.hidden = true; }, 250);
}

$('startTour').onclick = startTour;
$('tourSkip').onclick = endTour;
$('tourPrev').onclick = () => showTourStep(tour.i - 1);
$('tourNext').onclick = () => {
  const step = TOUR_STEPS[tour.i];
  if (step?.isLast) { window.location.href = '/app'; return; }
  showTourStep(tour.i + 1);
};
tour.layer.addEventListener('click', e => { if (e.target === tour.layer) endTour(); });
document.addEventListener('keydown', e => {
  if (tour.layer.hidden) return;
  if (e.key === 'Escape') endTour();
  if (e.key === 'ArrowRight') $('tourNext').click();
  if (e.key === 'ArrowLeft' && tour.i > 0) showTourStep(tour.i - 1);
});

// Reposition spotlight + popover on resize/scroll while the tour is open.
// Uses a lightweight reflow (no re-scroll) so it tracks the target instantly.
function reflowTour() {
  if (tour.layer.hidden) return;
  const step = TOUR_STEPS[tour.i];
  const el = document.querySelector(step?.target);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const pad = 8;
  Object.assign(tour.spot.style, {
    top: `${r.top - pad}px`, left: `${r.left - pad}px`,
    width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
  });
  const margin = 16;
  const vw = window.innerWidth, vh = window.innerHeight;
  const pop = tour.pop.getBoundingClientRect();
  const popH = pop.height || 200, popW = pop.width || 340;
  const spaceBelow = vh - r.bottom, spaceAbove = r.top;
  let top = spaceBelow >= popH + margin ? r.bottom + margin
          : spaceAbove >= popH + margin ? r.top - popH - margin
          : (vh - popH) / 2;
  top = Math.max(margin, Math.min(top, vh - popH - margin));
  let left = r.left + r.width / 2 - popW / 2;
  left = Math.max(margin, Math.min(left, vw - popW - margin));
  Object.assign(tour.pop.style, { top: `${top}px`, left: `${left}px` });
}
window.addEventListener('resize', reflowTour);
window.addEventListener('scroll', reflowTour, { passive: true });
