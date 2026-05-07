// FILE: src/ui/rewards.js
// Reward Board — earnable rewards on daily/weekly/monthly/custom cadences.
// Uses the existing #parentModal shell.

import {
  getRewards, addReward, removeReward, updateReward,
  rewardProgress, claimReward, save,
} from '../state/store.js';
import { launchConfetti } from '../utils/helpers.js';

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

const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const CADENCE_LABEL = {
  daily:   '☀️ Daily',
  weekly:  '📅 Weekly',
  monthly: '🗓️ Monthly',
  custom:  '⏱ Custom',
};

/** Parent-side reward manager modal. */
export function showRewardsModal(state, onUpdate) {
  const allKids = state.kids;
  open(`
    <button class="pmClose modalCloseX">✕</button>
    <h2 class="pmTitle">🏆 Reward Board</h2>
    <p class="pmSub">Set up earnable rewards. Kids see live progress on their screen.</p>

    <div class="rwTabs">
      ${allKids.map((k, i) => `
        <button class="rwTab${i===0?' active':''}" data-kid="${k.id}" style="--kid:${k.color}">
          ${k.avatar || k.initial} ${esc(k.name)}
        </button>`).join('')}
    </div>

    <div id="rwBody"></div>
    <button id="rwClose" class="linkBtn" style="margin-top:18px">Close</button>
  `);

  const renderTab = (kidId) => {
    const kid = state.kids.find(k => k.id === kidId);
    const rewards = getRewards(state, kidId);
    const body = document.getElementById('rwBody');
    body.innerHTML = `
      <div class="rwAddForm">
        <input id="rwTitle" placeholder="Reward (e.g. Movie night)" maxlength="50">
        <input id="rwEmoji" placeholder="🎬" maxlength="4" value="🎁">
        <input id="rwCost" type="number" min="10" step="10" value="100" title="Points cost">
        <select id="rwCadence">
          <option value="daily">☀️ Daily</option>
          <option value="weekly" selected>📅 Weekly</option>
          <option value="monthly">🗓️ Monthly</option>
          <option value="custom">⏱ Custom days</option>
        </select>
        <input id="rwCadenceN" type="number" min="1" value="7" title="Days (custom only)" hidden>
        <button id="rwAdd" class="btn green">+ Add</button>
      </div>

      <div class="rwList">
        ${rewards.length === 0 ? '<div class="emptyTasks">No rewards yet. Add the first one above.</div>' :
          rewards.map(r => {
            const p = rewardProgress(state, kidId, r);
            return `
              <div class="rwRow" style="--kid:${kid.color}">
                <div class="rwRowMain">
                  <span class="rwEmoji">${r.emoji}</span>
                  <div class="rwInfo">
                    <div class="rwTitle">${esc(r.title)}</div>
                    <div class="rwMeta">${CADENCE_LABEL[r.cadence] || r.cadence}${r.cadence==='custom'?` · ${r.cadenceN}d`:''} · ${r.costPts} pts</div>
                  </div>
                  <button class="tinyBtn red" data-rw-del="${r.id}">✕</button>
                </div>
                <div class="rwBar"><div class="rwBarFill" style="width:${p.pct}%;background:${kid.color}"></div></div>
                <div class="rwProgress">${p.earned} / ${p.target} pts (${p.pct}%) ${p.earned >= p.target ? '· Ready to claim!' : ''}</div>
                ${p.earned >= p.target ? `<button class="btn green small" data-rw-claim="${r.id}">🎉 Claim Reward</button>` : ''}
              </div>`;
          }).join('')
        }
      </div>
    `;

    // wire add
    document.getElementById('rwCadence').onchange = e => {
      document.getElementById('rwCadenceN').hidden = e.target.value !== 'custom';
    };
    document.getElementById('rwAdd').onclick = () => {
      const title = document.getElementById('rwTitle').value.trim();
      if (!title) return;
      addReward(state, kidId, {
        title,
        emoji: document.getElementById('rwEmoji').value.trim() || '🎁',
        costPts: Number(document.getElementById('rwCost').value) || 100,
        cadence: document.getElementById('rwCadence').value,
        cadenceN: Number(document.getElementById('rwCadenceN').value) || 7,
      });
      renderTab(kidId);
      onUpdate?.();
    };

    body.querySelectorAll('[data-rw-del]').forEach(b => b.onclick = () => {
      removeReward(state, kidId, b.dataset.rwDel);
      renderTab(kidId);
      onUpdate?.();
    });
    body.querySelectorAll('[data-rw-claim]').forEach(b => b.onclick = () => {
      if (claimReward(state, kidId, b.dataset.rwClaim)) {
        launchConfetti();
        renderTab(kidId);
        onUpdate?.();
      }
    });
  };

  // Tab wiring
  modalBox().querySelectorAll('.rwTab').forEach(tab => {
    tab.onclick = () => {
      modalBox().querySelectorAll('.rwTab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTab(tab.dataset.kid);
    };
  });

  document.getElementById('rwClose').onclick = close;
  if (allKids[0]) renderTab(allKids[0].id);
}

/** Compact progress chips shown on a kid's main screen. */
export function renderRewardChipsForKid(state, kidId, container) {
  const rewards = getRewards(state, kidId).filter(r => r.active !== false);
  if (!rewards.length) { container.innerHTML = ''; return; }
  const kid = state.kids.find(k => k.id === kidId);
  container.innerHTML = `
    <div class="kidRewardsBar">
      <div class="kidRewardsTitle">🏆 Rewards</div>
      <div class="kidRewardsList">
        ${rewards.map(r => {
          const p = rewardProgress(state, kidId, r);
          const ready = p.earned >= p.target;
          return `
            <div class="kidRwChip ${ready?'ready':''}" data-kid-rw="${r.id}">
              <span class="kidRwEmoji">${r.emoji}</span>
              <div class="kidRwTextWrap">
                <div class="kidRwLabel">${esc(r.title)}</div>
                <div class="kidRwBar"><div class="kidRwFill" style="width:${p.pct}%;background:${kid.color}"></div></div>
                <div class="kidRwSub">${p.earned}/${p.target} ${ready ? '· Ready! 🎉' : ''}</div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
  // Tap a "ready" chip to claim
  container.querySelectorAll('.kidRwChip.ready').forEach(chip => {
    chip.onclick = () => {
      if (claimReward(state, kidId, chip.dataset.kidRw)) {
        launchConfetti();
        renderRewardChipsForKid(state, kidId, container);
      }
    };
  });
}
