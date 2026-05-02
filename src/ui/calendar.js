// FILE: src/ui/calendar.js
import { getPoints, getMaxPoints, kidState } from '../state/store.js';
import { today } from '../utils/date.js';

/**
 * Render the full calendar view: today-focus strip + month or week grid.
 * @param {object} state
 * @param {'month'|'week'} view
 */
export function renderCalendarView(state, view = 'month') {
  renderTodayStrip(state);
  if (view === 'week') {
    renderWeekGrid(state);
  } else {
    renderMonthGrid(state);
  }
}

/** "Today's snapshot" strip — one row per kid */
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
        <span class="calKidAvatar">${kid.avatar || kid.initial}</span>
        <div class="calKidStripInfo">
          <strong>${kid.name}</strong>
          <span>${status}</span>
          <div class="calMiniBar"><div class="calMiniFill" style="width:${pct}%;background:${kid.color}"></div></div>
        </div>
        <span class="calKidPct" style="color:${kid.color}">${pct}%</span>
      </div>`;
  }).join('');
}

/** Full month grid — each day cell shows a mini row per kid */
function renderMonthGrid(state) {
  const el = document.getElementById('calGrid');
  if (!el) return;
  el.className = 'calMonthGrid';
  el.innerHTML = '';

  const now     = new Date();
  const y       = now.getFullYear();
  const m       = now.getMonth();
  const todayIso = today();
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // Day-of-week headers
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(name => {
    const h = document.createElement('div');
    h.className = 'calDayHead';
    h.textContent = name;
    el.appendChild(h);
  });

  // Blank padding cells
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

    const box = document.createElement('div');
    box.className = `calDay ${timeClass} ${fillClass}`;
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
    el.appendChild(box);
  }
}

/** Week grid — columns = days of this week, rows = kids */
function renderWeekGrid(state) {
  const el = document.getElementById('calGrid');
  if (!el) return;
  el.className = 'calWeekGrid';
  el.innerHTML = '';

  const now      = new Date();
  const todayIso = today();
  const dow      = now.getDay();

  // Build 7-day range (Sun–Sat of current week)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - dow + i);
    return {
      iso:   d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      num:   d.getDate(),
    };
  });

  // Header row: blank + day columns
  const headerRow = document.createElement('div');
  headerRow.className = 'calWeekHeaderRow';
  headerRow.innerHTML = `<div class="calWeekKidLabel"></div>` +
    weekDays.map(day => `
      <div class="calWeekDayHead ${day.iso === todayIso ? 'today' : ''}">
        <span class="calWDow">${day.label}</span>
        <span class="calWNum">${day.num}</span>
      </div>`).join('');
  el.appendChild(headerRow);

  // Kid rows
  state.kids.forEach(kid => {
    const row = document.createElement('div');
    row.className = 'calWeekKidRow';
    row.style.setProperty('--kid', kid.color);

    const maxPts = getMaxPoints(state, kid.id);
    row.innerHTML = `
      <div class="calWeekKidLabel">
        <span class="calWKidAvatar">${kid.avatar || kid.initial}</span>
        <span class="calWKidName">${kid.name}</span>
      </div>` +
      weekDays.map(day => {
        const pts  = getPoints(state, kid.id, day.iso);
        const pct  = maxPts ? Math.min(100, Math.round(pts / maxPts * 100)) : 0;
        const cls  = pct >= 100 ? 'wDone' : pct > 0 ? 'wPartial' : 'wEmpty';
        const isToday = day.iso === todayIso;
        return `<div class="calWeekCell ${cls} ${isToday ? 'wToday' : ''}">
          <div class="calWeekBar" style="height:${pct}%;background:${kid.color}${pct>=100?'':'aa'}"></div>
          <span class="calWeekPct">${pct > 0 ? pct + '%' : ''}</span>
        </div>`;
      }).join('');
    el.appendChild(row);
  });
}
