// FILE: src/ui/honeydue.js
// "Partner Mode" — the ✨billion-dollar wife-controls-husband✨ feature.
// Self-contained: own localStorage namespace, own modal renderer (reuses #parentModal box).
// Activated by ?couples=1 in the URL or localStorage.familyChoresCouples=1.

const STORE_KEY = 'familyChoresCouples';
const FLAG_KEY  = 'familyChoresCouplesEnabled';

// ── Activation ──────────────────────────────────────────────────────────────
export function maybeEnableCouplesMode() {
  try {
    const u = new URL(location.href);
    if (u.searchParams.get('couples') === '1') {
      localStorage.setItem(FLAG_KEY, '1');
      u.searchParams.delete('couples');
      history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
    }
  } catch {}
}
export function couplesEnabled() {
  return localStorage.getItem(FLAG_KEY) === '1';
}

// ── Storage ─────────────────────────────────────────────────────────────────
/**
 * @typedef {{ id:string, title:string, pts:number, assignee:'me'|'partner', dueAt:number, doneAt?:number, photo?:string, createdBy:'me'|'partner' }} HoneyTask
 * @typedef {{ id:string, title:string, costPts:number, owedBy:'me'|'partner', createdAt:number, redeemedAt?:number }} IOU
 * @typedef {{ myName:string, partnerName:string, tasks:HoneyTask[], ious:IOU[], history:{at:number,msg:string}[], scores:{me:number,partner:number} }} CouplesState
 */

/** @returns {CouplesState} */
function freshState() {
  return {
    myName: 'Me', partnerName: 'Partner',
    tasks: [], ious: [],
    history: [],
    scores: { me: 0, partner: 0 },
  };
}

export function loadCouples() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return freshState();
    const s = JSON.parse(raw);
    return { ...freshState(), ...s };
  } catch { return freshState(); }
}
export function saveCouples(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

// ── Quick-add parser ────────────────────────────────────────────────────────
// "trash, dishwasher, light bulb in hallway" → 3 tasks
// "@me dishes" / "@partner trash" → assignee override
export function parseQuickAdd(text, defaultAssignee = 'partner') {
  return text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean).map(line => {
    let assignee = defaultAssignee;
    let title = line;
    const m = line.match(/^@(me|partner|us)\s+(.+)/i);
    if (m) {
      assignee = m[1].toLowerCase() === 'us' ? 'partner' : m[1].toLowerCase();
      title = m[2];
    }
    return {
      id: 'h_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36),
      title,
      pts: scorePts(title),
      assignee, createdBy: 'me',
      dueAt: endOfToday(),
    };
  });
}

// Cheap heuristic point value (longer or contains keywords = more pts)
function scorePts(t) {
  const k = t.toLowerCase();
  if (/\b(deep clean|garage|yard|mow|gutter|paint|assembl)/.test(k)) return 50;
  if (/\b(grocer|laundry|vacuum|mop|fix|repair)/.test(k))            return 25;
  if (/\b(dish|trash|bin|wipe|fold|tidy)/.test(k))                   return 15;
  return 10;
}
function endOfToday() {
  const d = new Date(); d.setHours(23,59,59,999); return d.getTime();
}

// ── Modal helpers (reuses the existing parent modal shell) ──────────────────
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

// ── Main panel ──────────────────────────────────────────────────────────────
export function showHoneyDueModal() {
  const s = loadCouples();
  const open_ = s.tasks.filter(t => !t.doneAt);
  const done_ = s.tasks.filter(t =>  t.doneAt).slice(-8).reverse();
  const openIous = s.ious.filter(i => !i.redeemedAt);

  open(`
    <div class="honeyHero">
      <div class="honeyEm">💍</div>
      <h2 class="honeyTitle">Honey-Do</h2>
      <p class="honeySub">A shared chore + IOU bank for partners. Everything mutual, everything trackable.</p>
    </div>

    <div class="honeyNames">
      <label><span class="honeyLbl">You</span><input id="hdMe" value="${esc(s.myName)}" maxlength="20"></label>
      <label><span class="honeyLbl">Partner</span><input id="hdPartner" value="${esc(s.partnerName)}" maxlength="20"></label>
    </div>

    <div class="honeyScoreRow">
      <div class="honeyScore"><span class="honeyScoreNum">${s.scores.me|0}</span><span class="honeyScoreLbl">${esc(s.myName)}</span></div>
      <div class="honeyVs">vs</div>
      <div class="honeyScore"><span class="honeyScoreNum">${s.scores.partner|0}</span><span class="honeyScoreLbl">${esc(s.partnerName)}</span></div>
    </div>

    <div class="honeyAdd">
      <input id="hdQuick" placeholder='trash, dishwasher, light bulb… (try "@me dishes")' autocomplete="off">
      <select id="hdWho">
        <option value="partner">→ Partner</option>
        <option value="me">→ Me</option>
      </select>
      <button id="hdAddBtn" class="signupCTA small">Add</button>
    </div>
    <p class="honeyHint">Tip: comma-separate to add many. Prefix with <code>@me</code> or <code>@partner</code> to override.</p>

    <h3 class="honeySect">Open chores (${open_.length})</h3>
    <div class="honeyList">
      ${open_.length ? open_.map(t => taskRow(t, s)).join('') : `<div class="honeyEmpty">All clear. 🎉</div>`}
    </div>

    <h3 class="honeySect">IOU Bank (${openIous.length} open)</h3>
    <div class="honeyIous">
      ${openIous.length ? openIous.map(i => iouRow(i, s)).join('') : `<div class="honeyEmpty">No IOUs yet. Earn 25+ pts to redeem.</div>`}
      <div class="honeyIouSuggest">
        <span>Suggested:</span>
        ${suggestIous().map(t => `<button class="honeyChip" data-suggest="${esc(t.title)}|${t.cost}">${esc(t.title)} · ${t.cost}pts</button>`).join('')}
        <button class="honeyChip add" id="hdNewIou">+ Custom IOU</button>
      </div>
    </div>

    ${done_.length ? `
      <h3 class="honeySect">Recently completed</h3>
      <div class="honeyList faded">
        ${done_.map(t => taskRow(t, s, true)).join('')}
      </div>` : ''}

    <button id="honeyClose" class="linkBtn" style="margin-top:18px">Close</button>
  `);

  // Wire-up ──
  const re = () => { close(); requestAnimationFrame(showHoneyDueModal); };

  document.getElementById('hdMe').onchange      = e => { s.myName      = e.target.value.trim() || 'Me';      saveCouples(s); };
  document.getElementById('hdPartner').onchange = e => { s.partnerName = e.target.value.trim() || 'Partner'; saveCouples(s); };

  document.getElementById('hdAddBtn').onclick = () => {
    const inp = document.getElementById('hdQuick');
    const who = document.getElementById('hdWho').value;
    const text = inp.value.trim();
    if (!text) return;
    const newTasks = parseQuickAdd(text, who);
    s.tasks.push(...newTasks);
    s.history.unshift({ at: Date.now(), msg: `Added ${newTasks.length} chore${newTasks.length===1?'':'s'}` });
    saveCouples(s);
    re();
  };
  document.getElementById('hdQuick').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('hdAddBtn').click();
  });

  // Task actions
  modalBox().querySelectorAll('[data-done]').forEach(btn => btn.onclick = () => completeTask(s, btn.dataset.done, re));
  modalBox().querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => {
    s.tasks = s.tasks.filter(t => t.id !== btn.dataset.del); saveCouples(s); re();
  });
  modalBox().querySelectorAll('[data-photo]').forEach(inp => inp.onchange = e => attachPhoto(s, inp.dataset.photo, e.target.files?.[0], re));

  // IOU actions
  modalBox().querySelectorAll('[data-redeem]').forEach(btn => btn.onclick = () => redeemIou(s, btn.dataset.redeem, re));
  modalBox().querySelectorAll('[data-suggest]').forEach(btn => btn.onclick = () => {
    const [title, cost] = btn.dataset.suggest.split('|');
    createIou(s, { title, costPts: Number(cost), owedBy: 'partner' });
    re();
  });
  document.getElementById('hdNewIou').onclick = () => promptCustomIou(s, re);

  document.getElementById('honeyClose').onclick = close;
}

function taskRow(t, s, faded=false) {
  const who = t.assignee === 'me' ? s.myName : s.partnerName;
  const cls = t.assignee === 'me' ? 'me' : 'partner';
  const photoBtn = t.doneAt
    ? (t.photo ? `<img src="${t.photo}" class="honeyThumb" alt="">` : '')
    : `<label class="honeyPhotoBtn" title="Attach receipt photo">📷
         <input type="file" accept="image/*" capture="environment" data-photo="${t.id}" hidden></label>`;
  const action = t.doneAt
    ? `<span class="honeyDoneStamp">✓ ${new Date(t.doneAt).toLocaleDateString()}</span>`
    : `<button class="honeyDoneBtn" data-done="${t.id}">${t.photo ? '✓ Done' : 'Done'}</button>
       <button class="honeyDel" data-del="${t.id}" title="Delete">×</button>`;
  return `
    <div class="honeyTask ${cls} ${faded?'faded':''}">
      <span class="honeyTaskWho">${esc(who)}</span>
      <span class="honeyTaskTitle">${esc(t.title)}</span>
      <span class="honeyPts">+${t.pts}</span>
      ${photoBtn}
      ${action}
    </div>`;
}

function iouRow(i, s) {
  const debtor = i.owedBy === 'me' ? s.myName : s.partnerName;
  return `
    <div class="honeyIou">
      <div class="honeyIouMain">
        <span class="honeyIouTitle">${esc(i.title)}</span>
        <span class="honeyIouMeta">${esc(debtor)} owes · ${i.costPts} pts</span>
      </div>
      <button class="honeyIouRedeem" data-redeem="${i.id}">Redeem</button>
    </div>`;
}

function suggestIous() {
  return [
    { title: '1 hr uninterrupted gaming',      cost: 30 },
    { title: 'Saturday morning sleep-in',      cost: 50 },
    { title: 'Pick the restaurant',            cost: 20 },
    { title: 'Foot rub, no questions',         cost: 25 },
    { title: 'Movie night, your pick',         cost: 30 },
    { title: 'One day off chore duty',         cost: 75 },
    // 🌶️ Spicy tier — your dad's contribution. Hidden behind ?spicy=1.
    ...(spicyEnabled() ? [
      { title: '🌶️ More 😏 (whichever is the bigger reward)',   cost: 60 },
      { title: '🧊 No 😏 for a week (whichever is the bigger punishment)', cost: 60 },
      { title: '🛁 Long bath, door locked, no kids',                       cost: 40 },
      { title: '💃 Date night, you plan everything',                        cost: 45 },
    ] : []),
  ];
}

function spicyEnabled() {
  try {
    const u = new URL(location.href);
    if (u.searchParams.get('spicy') === '1') localStorage.setItem('familyChoresSpicy', '1');
    return localStorage.getItem('familyChoresSpicy') === '1';
  } catch { return false; }
}

// ── Logic ──────────────────────────────────────────────────────────────────
function completeTask(s, id, re) {
  const t = s.tasks.find(x => x.id === id);
  if (!t || t.doneAt) return;
  t.doneAt = Date.now();
  s.scores[t.assignee] = (s.scores[t.assignee] || 0) + t.pts;
  s.history.unshift({ at: Date.now(), msg: `${t.assignee==='me'?s.myName:s.partnerName} did "${t.title}" (+${t.pts})` });
  saveCouples(s);
  re();
}
function attachPhoto(s, id, file, re) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const t = s.tasks.find(x => x.id === id);
    if (t) { t.photo = r.result; saveCouples(s); re(); }
  };
  r.readAsDataURL(file);
}
function createIou(s, { title, costPts, owedBy }) {
  s.ious.push({
    id: 'i_' + Math.random().toString(36).slice(2,8) + Date.now().toString(36),
    title, costPts, owedBy, createdAt: Date.now(),
  });
  s.history.unshift({ at: Date.now(), msg: `New IOU: "${title}" (${owedBy==='me'?s.myName:s.partnerName} owes)` });
  saveCouples(s);
}
function redeemIou(s, id, re) {
  const i = s.ious.find(x => x.id === id);
  if (!i || i.redeemedAt) return;
  // The creditor (opposite of owedBy) spends their points to claim.
  const creditor = i.owedBy === 'me' ? 'partner' : 'me';
  if ((s.scores[creditor] || 0) < i.costPts) {
    alert(`Not enough points yet — need ${i.costPts}, have ${s.scores[creditor]|0}.`);
    return;
  }
  s.scores[creditor] -= i.costPts;
  i.redeemedAt = Date.now();
  s.history.unshift({ at: Date.now(), msg: `Redeemed: "${i.title}"` });
  saveCouples(s);
  re();
}
function promptCustomIou(s, re) {
  const title = prompt('What\'s the reward?');
  if (!title) return;
  const cost = Number(prompt('Cost in points?', '30'));
  if (!cost || cost < 1) return;
  const owedBy = confirm('Tap OK if PARTNER will owe this. Cancel if YOU owe it.') ? 'partner' : 'me';
  createIou(s, { title: title.trim(), costPts: cost, owedBy });
  re();
}

// ── utils ──
function esc(s='') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
