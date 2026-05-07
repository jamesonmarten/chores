// FILE: src/ui/leaderboard.js
import { kidState, getMaxPoints } from '../state/store.js';

const isoOf = (d) => d.toISOString().slice(0, 10);

/** Sun → Sat range for the week containing `ref`. */
export function weekRange(ref = new Date()) {
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end, days: Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  })};
}

export function weekTotalsByKid(state, ref = new Date()) {
  const { days } = weekRange(ref);
  const isos = days.map(isoOf);
  return state.kids.map(kid => {
    const ks = kidState(state, kid.id);
    let total = 0, perfectDays = 0;
    const max = getMaxPoints(state, kid.id);
    isos.forEach(iso => {
      const p = (ks.pointsByDate || {})[iso] || 0;
      total += p;
      if (max > 0 && p >= max) perfectDays++;
    });
    return { kid, total, perfectDays, streak: ks.streak || 0, bestStreak: ks.bestStreak || 0 };
  });
}

export function showLeaderboardModal(state) {
  const modal = document.getElementById('parentModal');
  const box   = document.getElementById('parentModalBox');
  if (!modal || !box) return;

  const { start, end } = weekRange();
  const rows = weekTotalsByKid(state).sort((a, b) => b.total - a.total);
  const top = rows[0]?.total || 0;

  box.innerHTML = `
    <button class="pmClose modalCloseX" id="lbClose">✕</button>
    <h2 class="pmTitle">🏅 Family Leaderboard</h2>
    <p class="lbSub">Week of ${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>
    <ol class="lbList">
      ${rows.map((r, i) => {
        const isWinner = r.total > 0 && r.total === top;
        const pctOfTop = top ? Math.round(r.total / top * 100) : 0;
        return `
          <li class="lbRow ${isWinner ? 'lbWinner' : ''}" style="--kid:${r.kid.color}">
            <span class="lbRank">${isWinner ? '👑' : '#' + (i+1)}</span>
            <span class="lbAvatar">${r.kid.photo ? `<img class="kidAvImg" src="${r.kid.photo}" alt="">` : (r.kid.avatar || r.kid.initial)}</span>
            <div class="lbInfo">
              <strong>${r.kid.name}</strong>
              <span>${r.total} pts · ${r.perfectDays}/7 perfect days · 🔥 ${r.streak}</span>
              <div class="lbBar"><div style="width:${pctOfTop}%;background:${r.kid.color}"></div></div>
            </div>
            <span class="lbScore">${r.total}</span>
          </li>`;
      }).join('') || '<li class="lbEmpty">No kids yet — add one to get started!</li>'}
    </ol>
    <div class="pmActions">
      <button type="button" class="btn" id="lbCloseBtn">Close</button>
    </div>`;

  modal.hidden = false;
  modal.classList.add('show');

  const close = () => { modal.classList.remove('show'); modal.hidden = true; };
  document.getElementById('lbClose').onclick = close;
  document.getElementById('lbCloseBtn').onclick = close;
}
