// FILE: src/ui/report.js
// Builds a print-friendly weekly report and triggers window.print().
// No PDF library needed — users hit "Save as PDF" from the print dialog.

import { kidState, getMaxPoints } from '../state/store.js';
import { weekRange, weekTotalsByKid } from './leaderboard.js';

const isoOf = (d) => d.toISOString().slice(0, 10);

export function showWeeklyReport(state) {
  const existing = document.getElementById('printReport');
  if (existing) existing.remove();

  const { start, end, days } = weekRange();
  const totals = weekTotalsByKid(state).sort((a, b) => b.total - a.total);
  const top = totals[0]?.total || 0;

  const grandTotal = totals.reduce((a, t) => a + t.total, 0);
  const grandMax   = state.kids.reduce((a, k) => a + getMaxPoints(state, k.id) * 7, 0);

  const wrap = document.createElement('div');
  wrap.id = 'printReport';
  wrap.className = 'printOnly';
  wrap.innerHTML = `
    <div class="prHead">
      <h1>Family Chores — Weekly Report</h1>
      <p class="prSub">${start.toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric'})} – ${end.toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'})}</p>
    </div>

    <div class="prSummary">
      <div><strong>${grandTotal}</strong><span>Total points</span></div>
      <div><strong>${grandMax}</strong><span>Max possible</span></div>
      <div><strong>${grandMax ? Math.round(grandTotal/grandMax*100) : 0}%</strong><span>Family completion</span></div>
      <div><strong>${totals[0]?.kid.name || '—'}</strong><span>👑 Top performer</span></div>
    </div>

    <h2>Standings</h2>
    <table class="prTable">
      <thead><tr><th>#</th><th>Kid</th><th>Points</th><th>Perfect days</th><th>Streak</th></tr></thead>
      <tbody>
        ${totals.map((r, i) => `
          <tr>
            <td>${r.total > 0 && r.total === top ? '👑' : i+1}</td>
            <td>${r.kid.name}</td>
            <td>${r.total}</td>
            <td>${r.perfectDays}/7</td>
            <td>🔥 ${r.streak} (best ${r.bestStreak})</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <h2>Daily breakdown</h2>
    <table class="prTable prDaily">
      <thead>
        <tr><th>Kid</th>${days.map(d => `<th>${d.toLocaleDateString('en-US',{weekday:'short'})}<br><small>${d.getMonth()+1}/${d.getDate()}</small></th>`).join('')}<th>Total</th></tr>
      </thead>
      <tbody>
        ${state.kids.map(kid => {
          const ks = kidState(state, kid.id);
          const max = getMaxPoints(state, kid.id);
          let row = `<td><strong>${kid.name}</strong></td>`;
          let rowTotal = 0;
          days.forEach(d => {
            const p = (ks.pointsByDate || {})[isoOf(d)] || 0;
            rowTotal += p;
            const cls = max > 0 && p >= max ? 'prDone' : p > 0 ? 'prPartial' : '';
            row += `<td class="${cls}">${p > 0 ? p : '·'}</td>`;
          });
          row += `<td><strong>${rowTotal}</strong></td>`;
          return `<tr>${row}</tr>`;
        }).join('')}
      </tbody>
    </table>

    <h2>Tasks completed this week</h2>
    <ul class="prTaskList">
      ${state.kids.map(kid => {
        const ks = kidState(state, kid.id);
        const tasks = state.tasks[kid.id] || [];
        const isos = days.map(isoOf);
        const counts = {};
        tasks.forEach(t => {
          counts[t.id] = isos.filter(iso => !!(ks.done || {})[`${iso}_${t.id}`]).length;
        });
        const lines = tasks
          .filter(t => counts[t.id] > 0)
          .map(t => `<li>${t.emoji || '✅'} ${t.title} <span>×${counts[t.id]}</span></li>`)
          .join('');
        return `<li class="prKidBlock"><strong>${kid.name}</strong><ul>${lines || '<li class="prEmpty">No completions logged.</li>'}</ul></li>`;
      }).join('')}
    </ul>

    <p class="prFoot">Printed ${new Date().toLocaleString()} · Family Chores &amp; More</p>
  `;
  document.body.appendChild(wrap);

  document.documentElement.classList.add('printing');
  // Give layout a moment, then print
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.documentElement.classList.remove('printing');
      wrap.remove();
    }, 500);
  }, 80);
}
