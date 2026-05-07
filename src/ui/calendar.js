// filepath: /Users/jamesonmarten/dev/devcabin-ai-chores/family-chores-more/src/ui/calendar.js
// FILE: src/ui/calendar.js
import { getPoints, getMaxPoints, kidState, getTasksSorted } from '../state/store.js';
import { today } from '../utils/date.js';

let anchor = new Date();
let currentView = 'month';
let _state = null;
let _onDayClick = null;

const isoOf = (d) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const avatarOf = (kid) =>
  kid.photo ? `<img class="kidAvImg" src="${kid.photo}" alt="">` : (kid.avatar || kid.initial);

export function renderCalendarView(state, view = 'month', anchorDate) {
  _state = state;
  currentView = view;
  if (anchorDate instanceof Date) anchor = new Date(anchorDate);

  renderTodayStrip(state);
  updateHeaderLabel();

  if (view === 'week')      renderWeekGrid(state);
  else if (view === 'day')  renderDayGrid(state);
  else                      renderMonthGrid(state);
}

export function calNav(delta = 1) {
  if (currentView === 'month') anchor.setMonth(anchor.getMonth() + delta);
  else if (currentView === 'week') anchor.setDate(anchor.getDate() + 7 * delta);
  else anchor.setDate(anchor.getDate() + delta);
  renderCalendarView(_state, currentView);
}

export function calToday() {
  anchor = new Date();
  renderCalendarView(_state, currentView);
}

export function onCalendarDayClick(fn) { _onDayClick = fn; }

function updateHeaderLabel() {
  const hdr = document.getElementById('calGridHeader');
  if (!hdr) return;
  if (currentView === 'month') {
    hdr.textContent = anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else if (currentView === 'week') {
    const start = startOfWeek(anchor);
    const end   = new Date(start); end.setDate(start.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    hdr.textContent = sameMonth
      ? `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${end.getDate()}, ${end.getFullYear()}`
      : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else {
    hdr.textContent = anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
}

function startOfWeek(d) {
  const x = new Date(d);
  x.setDate(d.getDate() - d.getDay());
  x.setHours(0,0,0,0);
  return x;
}

function renderTodayStrip(state) {
  const el = document.getElementById('calTodayStrip');
  if (!el) return;
  const d = today();
  el.innerHTML = state.kids.map(kid => {
    const pts    = getPoints(state, kid.id, d);
    const maxPts = getMaxPoints(state, kid.id);
    const pct    = maxPts ? Math.min(100, Math.round(pts / maxPts * 100)) : 0;
    const tasks  = state.tasks[kid.id] || [];
    const ks     = kidState(state, kid.id);
    const done   = tasks.filter(t => !!(ks.done || {})[`${d}_${t.id}`]).length;
    const status = pct >= 100 ? '✅ All done!' : `${done}/${tasks.length} tasks · ${pts}/${maxPts} pts`;
    return `
      <div class="calKidStrip" style="--kid:${kid.color}">
        <span class="calKidAvatar">${avatarOf(kid)}</span>
        <div class="calKidStripInfo">
          <strong>${kid.name}</strong>
          <span>${status}</span>
          <div class="calMiniBar"><div class="calMiniFill" style="width:${pct}%;background:${kid.color}"></div></div>
        </div>
        <span class="calKidPct" style="color:${kid.color}">${pct}%</span>
      </div>`;
  }).join('');
}

function renderMonthGrid(state) {
  const el = document.getElementById('calGrid');
  if (!el) return;
  el.className = 'calMonthGrid';
  el.innerHTML = '';

  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const todayIso = today();
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(name => {
    const h = document.createElement('div');
    h.className = 'calDayHead';
    h.textContent = name;
    el.appendChild(h);
  });

  for (let i = 0; i < startDow; i++) {
    el.appendChild(Object.assign(document.createElement('div'), { className: 'calDayBlank' }));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const kidPoints = state.kids.map(kid => ({
      kid,
      pts:    getPoints(state, kid.id, iso),
      maxPts: getMaxPoints(state, kid.id),
    }));
    const allComplete = kidPoints.every(({ pts, maxPts }) => maxPts > 0 && pts >= maxPts);
    const anyProgress = kidPoints.some(({ pts }) => pts > 0);
    const timeClass   = iso < todayIso ? 'past' : iso === todayIso ? 'today' : 'future';
    const fillClass   = allComplete ? 'complete' : anyProgress ? 'partial' : 'empty';

    const box = document.createElement('button');
    box.type = 'button';
    box.className = `calDay clickable ${timeClass} ${fillClass}`;
    box.innerHTML = `
      <div class="calDate">${d}</div>
      <div class="calDayKids">
        ${kidPoints.map(({ kid, pts, maxPts }) => {
          const pct = maxPts ? Math.min(100, Math.round(pts / maxPts * 100)) : 0;
          return `<div class="calKidMiniRow" title="${kid.name}: ${pts}/${maxPts}">
            <span class="calKidDot" style="background:${kid.color}">${kid.initial}</span>
            <span class="calKidMiniTrack"><span class="calKidMiniFill" style="width:${pct}%;background:${kid.color}"></span></span>
            <span class="calKidMiniScore">${pct}%</span>
          </div>`;
        }).join('')}
      </div>
      ${allComplete ? '<div class="calDayComplete">🏆</div>' : ''}
    `;
    box.onclick = () => drillToDay(new Date(y, m, d));
    el.appendChild(box);
  }
}

function renderWeekGrid(state) {
  const el = document.getElementById('calGrid');
  if (!el) return;
  el.className = 'calWeekGrid';
  el.innerHTML = '';

  const todayIso = today();
  const start = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    return {
      iso:   isoOf(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      num:   d.getDate(),
    };
  });

  const headerRow = document.createElement('div');
  headerRow.className = 'calWeekHeaderRow';
  headerRow.innerHTML = `<div class="calWeekKidLabel"></div>` +
    weekDays.map(day => `
      <button type="button" class="calWeekDayHead clickable ${day.iso === todayIso ? 'today' : ''}" data-day="${day.iso}">
        <span class="calWDow">${day.label}</span>
        <span class="calWNum">${day.num}</span>
      </button>`).join('');
  el.appendChild(headerRow);

  state.kids.forEach(kid => {
    const row = document.createElement('div');
    row.className = 'calWeekKidRow';
    row.style.setProperty('--kid', kid.color);
    const maxPts = getMaxPoints(state, kid.id);
    row.innerHTML = `
      <div class="calWeekKidLabel">
        <span class="calWKidAvatar">${avatarOf(kid)}</span>
        <span class="calWKidName">${kid.name}</span>
      </div>` +
      weekDays.map(day => {
        const pts  = getPoints(state, kid.id, day.iso);
        const pct  = maxPts ? Math.min(100, Math.round(pts / maxPts * 100)) : 0;
        const cls  = pct >= 100 ? 'wDone' : pct > 0 ? 'wPartial' : 'wEmpty';
        const isToday = day.iso === todayIso;
        return `<button type="button" class="calWeekCell clickable ${cls} ${isToday ? 'wToday' : ''}" data-day="${day.iso}">
          <div class="calWeekBar" style="height:${pct}%;background:${kid.color}${pct>=100?'':'aa'}"></div>
          <span class="calWeekPct">${pct > 0 ? pct + '%' : ''}</span>
        </button>`;
      }).join('');
    el.appendChild(row);
  });

  el.querySelectorAll('[data-day]').forEach(btn => {
    btn.onclick = () => drillToDay(new Date(btn.dataset.day + 'T12:00:00'));
  });
}

function renderDayGrid(state) {
  const el = document.getElementById('calGrid');
  if (!el) return;
  el.className = 'calDayView';
  const iso = isoOf(anchor);
  const isToday = iso === today();

  el.innerHTML = `
    <div class="calDayHeader">
      <div class="calDayBig">${anchor.toLocaleDateString('en-US', { weekday: 'long' })}</div>
      <div class="calDayDate">${anchor.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      ${isToday ? '<span class="calDayBadge">Today</span>' : ''}
    </div>
    <div class="calDayKidsList">
      ${state.kids.map(kid => {
        const ks = kidState(state, kid.id);
        const tasks = getTasksSorted(state, kid.id);
        const pts = getPoints(state, kid.id, iso);
        const maxPts = getMaxPoints(state, kid.id);
        const pct = maxPts ? Math.min(100, Math.round(pts / maxPts * 100)) : 0;
        const completed = tasks.filter(t => !!(ks.done || {})[`${iso}_${t.id}`]);

        return `
          <article class="calDayKidCard" style="--kid:${kid.color}">
            <header class="calDayKidHead">
              <span class="calDayKidAv">${avatarOf(kid)}</span>
              <div class="calDayKidName">
                <strong>${kid.name}</strong>
                <span>${pts}/${maxPts} pts · ${completed.length}/${tasks.length} done · ${pct}%</span>
              </div>
              <div class="calDayKidBar"><div style="width:${pct}%;background:${kid.color}"></div></div>
            </header>
            <ul class="calDayTaskList">
              ${tasks.length ? tasks.map(t => {
                const isDone = !!(ks.done || {})[`${iso}_${t.id}`];
                return `<li class="calDayTask ${isDone ? 'done' : ''}">
                  <span class="cdtCheck">${isDone ? '✅' : '⬜'}</span>
                  <span class="cdtEmoji">${t.emoji || '✅'}</span>
                  <span class="cdtTitle">${t.title}</span>
                  <span class="cdtPts">+${t.pts}</span>
                </li>`;
              }).join('') : '<li class="calDayEmpty">No tasks set up.</li>'}
            </ul>
          </article>`;
      }).join('')}
    </div>
  `;
}

function drillToDay(d) {
  anchor = d;
  currentView = 'day';
  if (_onDayClick) _onDayClick();
  renderCalendarView(_state, 'day');
}
