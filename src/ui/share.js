// FILE: src/ui/share.js
// "Grandma view" — generate a read-only snapshot link backed by /api/snapshot.

import { kidState, getPoints, getMaxPoints } from '../state/store.js';

const TOKEN_KEY = 'familyChoresShareToken';
const FAM_KEY   = 'familyChoresFamilyName';
const todayIso  = () => new Date().toISOString().slice(0, 10);

function getOrMakeToken() {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = (crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2))).replace(/-/g, '').slice(0, 24);
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}
export function getFamilyName() { return localStorage.getItem(FAM_KEY) || ''; }
export function setFamilyName(s) { localStorage.setItem(FAM_KEY, s); }

/** Build a small, safe snapshot of today's progress. Skips photos by default to keep size small. */
export function buildSnapshot(state, { includePhotos = false } = {}) {
  const iso = todayIso();
  return {
    familyName: getFamilyName() || 'Today at a glance',
    updatedAt: Date.now(),
    kids: state.kids.map(k => {
      const ks = kidState(state, k.id);
      const tasks = state.tasks[k.id] || [];
      const done = tasks.filter(t => !!(ks.done || {})[`${iso}_${t.id}`]).length;
      const pts = getPoints(state, k.id, iso);
      const max = getMaxPoints(state, k.id);
      return {
        name: k.name,
        avatar: k.avatar || k.initial,
        photo: includePhotos ? (k.photo || '') : '',
        color: k.color,
        pts, max,
        pct: max ? Math.round(pts / max * 100) : 0,
        done, total: tasks.length,
        streak: ks.streak || 0,
      };
    }),
  };
}

/** Push the latest snapshot to the API. Returns the share URL. */
export async function pushSnapshot(state, opts) {
  const token = getOrMakeToken();
  const snapshot = buildSnapshot(state, opts);
  const res = await fetch('/api/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, snapshot }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return new URL(`/snapshot.html?t=${token}`, location.origin).toString();
}

export function showShareModal(state) {
  const modal = document.getElementById('parentModal');
  const box   = document.getElementById('parentModalBox');
  if (!modal || !box) return;
  const token = localStorage.getItem(TOKEN_KEY);
  const url   = token ? new URL(`/snapshot.html?t=${token}`, location.origin).toString() : '';

  box.innerHTML = `
    <button class="pmClose modalCloseX">✕</button>
    <h2 class="pmTitle">👵 Grandma View</h2>
    <p class="pmSub">A read-only link family can open anytime — no app, no signup.</p>

    <form id="shareForm" class="pmForm">
      <label>Family name (shown to viewers)
        <input name="famName" maxlength="40" value="${esc(getFamilyName())}" placeholder="e.g. The Marten Family">
      </label>
      <label class="toggleRow">
        <span>Include kid photos</span>
        <input type="checkbox" id="incPhotos">
        <span class="toggleSwitch"></span>
      </label>
      <button type="submit" class="btn green">${url ? '🔄 Update Snapshot' : '🔗 Generate Link'}</button>
    </form>

    <div id="shareResult" class="shareResult" ${url ? '' : 'hidden'}>
      <div class="shareUrlBox">
        <input type="text" id="shareUrl" value="${esc(url)}" readonly>
        <button type="button" class="smallBtn" id="shareCopy">📋 Copy</button>
      </div>
      <div class="shareActionsRow">
        <button type="button" class="smallBtn" id="shareNative">📤 Share…</button>
        <button type="button" class="smallBtn red" id="shareRevoke">🚫 Revoke link</button>
      </div>
      <p class="pmHint">Anyone with this link sees today's progress only. Auto-expires after 30 days of no updates.</p>
    </div>
  `;
  modal.hidden = false;
  modal.classList.add('show');
  const close = () => { modal.classList.remove('show'); setTimeout(() => { modal.hidden = true; box.innerHTML = ''; }, 220); };
  box.querySelector('.pmClose').onclick = close;

  const form = document.getElementById('shareForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    setFamilyName(String(fd.get('famName') || '').trim());
    const btn = form.querySelector('button[type=submit]');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Working…';
    try {
      const link = await pushSnapshot(state, { includePhotos: document.getElementById('incPhotos').checked });
      const result = document.getElementById('shareResult');
      result.hidden = false;
      document.getElementById('shareUrl').value = link;
      btn.textContent = '✅ Updated!';
      setTimeout(() => { btn.textContent = '🔄 Update Snapshot'; btn.disabled = false; }, 1500);
    } catch (err) {
      btn.textContent = '⚠️ ' + (err.message || 'Failed');
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2200);
    }
  };

  const copyBtn = document.getElementById('shareCopy');
  if (copyBtn) copyBtn.onclick = async () => {
    const v = document.getElementById('shareUrl').value;
    try { await navigator.clipboard.writeText(v); copyBtn.textContent = '✅ Copied'; }
    catch { copyBtn.textContent = '⚠️ Manual copy'; }
    setTimeout(() => copyBtn.textContent = '📋 Copy', 1600);
  };
  const nativeBtn = document.getElementById('shareNative');
  if (nativeBtn) nativeBtn.onclick = () => {
    const v = document.getElementById('shareUrl').value;
    try { navigator.share?.({ title: 'Family Snapshot', text: 'Today\'s family chore progress', url: v }); } catch {}
  };
  const revokeBtn = document.getElementById('shareRevoke');
  if (revokeBtn) revokeBtn.onclick = () => {
    if (!confirm('Old links will stop working after the next snapshot expires. Continue?')) return;
    localStorage.removeItem(TOKEN_KEY);
    document.getElementById('shareResult').hidden = true;
    document.getElementById('shareUrl').value = '';
  };
}

function esc(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
