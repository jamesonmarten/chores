// FILE: src/state/store.js
import { today } from '../utils/date.js';

const KEY = 'familyChoresV2';
const PIN_KEY = 'familyChoresParentPin';

const DEFAULT_KIDS = [
  { id: 'josie',   name: 'Josie',   age: '4 months', initial: 'J', color: '#ff5ea8', allowance: 0,  avatar: '👶' },
  { id: 'lincoln', name: 'Lincoln', age: '4 years',  initial: 'L', color: '#35c976', allowance: 5,  avatar: '🦁' },
  { id: 'sienna',  name: 'Sienna',  age: '17 years', initial: 'S', color: '#8b6cff', allowance: 20, avatar: '⭐' },
];

const DEFAULT_TASKS = {
  josie: [
    { id: 'toys',    title: 'Tummy time',       pts: 15, helper: 'Mom or Dad checks', emoji: '��' },
    { id: 'feeding', title: 'Feeding time',     pts: 15, helper: 'After bottle',      emoji: '🍼' },
    { id: 'diaper',  title: 'Diaper change',    pts: 10, helper: 'After change',      emoji: '✨' },
    { id: 'nap',     title: 'Nap time',         pts: 20, helper: 'After good nap',    emoji: '😴' },
    { id: 'bath',    title: 'Bath time',        pts: 15, helper: 'After bath',        emoji: '🛁' },
    { id: 'bed',     title: 'Bedtime routine',  pts: 25, helper: 'Settled for bed',   emoji: '🌙' },
  ],
  lincoln: [
    { id: 'toys',    title: 'Pick up toys',     pts: 20, helper: 'Toys put away',     emoji: '🧩' },
    { id: 'clothes', title: 'Put away clothes', pts: 15, helper: 'Clothes in place',  emoji: '👕' },
    { id: 'dishes',  title: 'Help with dishes', pts: 15, helper: 'After helping',     emoji: '🍽️' },
    { id: 'kind',    title: 'Kind helper',      pts: 20, helper: 'Great helper',      emoji: '💛' },
    { id: 'room',    title: 'Clean room',       pts: 30, helper: 'Room is clean',     emoji: '🏠' },
  ],
  sienna: [
    { id: 'room',    title: 'Clean room',       pts: 20, helper: 'Room reset',        emoji: '🛏️' },
    { id: 'laundry', title: 'Do laundry',       pts: 20, helper: 'Laundry handled',   emoji: '🧺' },
    { id: 'dishes',  title: 'Kitchen help',     pts: 15, helper: 'Kitchen cleaned',   emoji: '🍳' },
    { id: 'trash',   title: 'Take out trash',   pts: 15, helper: 'Trash taken out',   emoji: '♻️' },
    { id: 'help',    title: 'Help siblings',    pts: 30, helper: 'Helped little ones',emoji: '🤝' },
  ],
};

function fresh() {
  const tasks = {};
  Object.entries(DEFAULT_TASKS).forEach(([kidId, list]) => {
    tasks[kidId] = list.map((t, i) => ({ ...t, order: i, timeOfDay: 'any', timerSec: 0, videoUrl: '', voiceUrl: '' }));
  });
  return {
    isPro: false,
    familyId: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    kids: DEFAULT_KIDS,
    tasks,
    rewards: {}, // { kidId: Reward[] }
    routines: {}, // { kidId: Routine[] }
    notes: [],   // FamilyNote[]
    kidData: Object.fromEntries(
      DEFAULT_KIDS.map(k => [k.id, {
        pointsByDate: {}, done: {}, treats: 0, eggs: 0,
        allowanceEarned: 0, history: [], streak: 0, bestStreak: 0, totalPoints: 0, level: 1,
      }])
    ),
  };
}

/** Migrate older saved state to the latest schema. Mutates in place. */
function migrate(state) {
  state.rewards = state.rewards || {};
  state.routines = state.routines || {};
  state.notes = state.notes || [];
  Object.values(state.tasks || {}).forEach(list => {
    list.forEach((t, i) => {
      if (typeof t.order     !== 'number') t.order = i;
      if (typeof t.timeOfDay !== 'string') t.timeOfDay = 'any';
      if (typeof t.timerSec  !== 'number') t.timerSec = 0;
      if (typeof t.videoUrl  !== 'string') t.videoUrl = '';
      if (typeof t.voiceUrl  !== 'string') t.voiceUrl = '';
    });
  });
  return state;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw);
    parsed.kids?.forEach(k => {
      parsed.kidData = parsed.kidData || {};
      parsed.kidData[k.id] = parsed.kidData[k.id] || {
        pointsByDate: {}, done: {}, treats: 0, eggs: 0,
        allowanceEarned: 0, history: [], streak: 0, bestStreak: 0, totalPoints: 0, level: 1,
      };
    });
    return migrate(parsed);
  } catch { return fresh(); }
}

export function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

export function getPin() { return localStorage.getItem(PIN_KEY) || '1234'; }
export function setPin(pin) { localStorage.setItem(PIN_KEY, pin); }
export function checkPin(pin) { return pin === getPin(); }

export function activatePro(state) { state.isPro = true; save(state); }
export function isPro(state) { return !!state.isPro; }

export function addKid(state, { name, age, color, avatar, photo, allowance }) {
  const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
  state.kids.push({ id, name, age, initial: name.trim()[0].toUpperCase(), color, avatar: avatar || '😊', photo: photo || '', allowance: Number(allowance) || 0 });
  state.tasks[id] = [];
  state.kidData[id] = { pointsByDate: {}, done: {}, treats: 0, eggs: 0, allowanceEarned: 0, history: [], streak: 0, bestStreak: 0, totalPoints: 0, level: 1 };
  save(state);
}

export function removeKid(state, kidId) {
  state.kids = state.kids.filter(k => k.id !== kidId);
  delete state.tasks[kidId];
  delete state.kidData[kidId];
  save(state);
}

export function updateKid(state, kidId, updates) {
  const kid = state.kids.find(k => k.id === kidId);
  if (kid) Object.assign(kid, updates);
  save(state);
}

export function addTask(state, kidId, { title, pts, helper, emoji, timeOfDay, timerSec, videoUrl, voiceUrl, rotation }) {
  state.tasks[kidId] = state.tasks[kidId] || [];
  const order = state.tasks[kidId].length;
  const task = {
    id: title.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
    title, pts: Number(pts) || 10,
    helper: helper || 'Tap when done',
    emoji: emoji || '✅',
    order,
    timeOfDay: timeOfDay || 'any',
    timerSec: Number(timerSec) || 0,
    videoUrl: (videoUrl || '').trim(),
    voiceUrl: voiceUrl || '',
  };
  if (rotation && Array.isArray(rotation.kidIds) && rotation.kidIds.length >= 2) {
    task.rotation = {
      kidIds: rotation.kidIds.slice(),
      startDate: rotation.startDate || new Date().toISOString().slice(0, 10),
    };
  }
  state.tasks[kidId].push(task);
  save(state);
}

export function removeTask(state, kidId, taskId) {
  state.tasks[kidId] = (state.tasks[kidId] || []).filter(t => t.id !== taskId);
  save(state);
}

export function updateTask(state, kidId, taskId, updates) {
  const task = (state.tasks[kidId] || []).find(t => t.id === taskId);
  if (!task) return;
  // Special-case rotation: undefined means "leave alone"; null/empty means clear; valid object replaces.
  if ('rotation' in updates) {
    const r = updates.rotation;
    if (r && Array.isArray(r.kidIds) && r.kidIds.length >= 2) {
      task.rotation = { kidIds: r.kidIds.slice(), startDate: r.startDate || new Date().toISOString().slice(0,10) };
    } else {
      delete task.rotation;
    }
    const { rotation: _ignore, ...rest } = updates;
    Object.assign(task, rest);
  } else {
    Object.assign(task, updates);
  }
  save(state);
}

export function kidState(state, id) {
  state.kidData[id] = state.kidData[id] || { pointsByDate: {}, done: {}, treats: 0, eggs: 0, allowanceEarned: 0, history: [], streak: 0, bestStreak: 0, totalPoints: 0, level: 1 };
  return state.kidData[id];
}

export function getPoints(state, id, date = today()) { return kidState(state, id).pointsByDate[date] || 0; }
export function setPoints(state, id, val, date = today()) { kidState(state, id).pointsByDate[date] = Math.max(0, val); }
export function getMaxPoints(state, kidId) { return (state.tasks[kidId] || []).reduce((a, t) => a + t.pts, 0) || 100; }

export function getLevel(totalPoints) {
  if (totalPoints < 100)  return { level: 1, name: 'Rookie',    emoji: '🌱', next: 100 };
  if (totalPoints < 300)  return { level: 2, name: 'Helper',    emoji: '⭐', next: 300 };
  if (totalPoints < 600)  return { level: 3, name: 'Champion',  emoji: '🏆', next: 600 };
  if (totalPoints < 1000) return { level: 4, name: 'Hero',      emoji: '🦸', next: 1000 };
  if (totalPoints < 2000) return { level: 5, name: 'Legend',    emoji: '🌟', next: 2000 };
  return                         { level: 6, name: 'Superstar', emoji: '💫', next: Infinity };
}

export function logHistory(state, kidId, entry) {
  const ks = kidState(state, kidId);
  ks.history = ks.history || [];
  ks.history.unshift({ ...entry, timestamp: Date.now() });
  if (ks.history.length > 200) ks.history = ks.history.slice(0, 200);
}

export function updateStreak(state, kidId) {
  const ks = kidState(state, kidId);
  const maxPts = getMaxPoints(state, kidId);
  const t = today();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const yIso = yest.toISOString().slice(0, 10);
  const todayDone = (ks.pointsByDate[t] || 0) >= maxPts;
  const yestDone  = (ks.pointsByDate[yIso] || 0) >= maxPts;
  if (todayDone) {
    ks.streak = yestDone ? (ks.streak || 0) + 1 : 1;
    ks.bestStreak = Math.max(ks.bestStreak || 0, ks.streak);
  }
}

// ── Sorting & time-of-day ──────────────────────────────────────────────────
export const TIME_PERIODS = [
  { id: 'morning',   label: 'Morning',   emoji: '🌅', startHr: 5,  endHr: 12 },
  { id: 'afternoon', label: 'Afternoon', emoji: '☀️', startHr: 12, endHr: 17 },
  { id: 'evening',   label: 'Evening',   emoji: '🌙', startHr: 17, endHr: 24 },
];

export function currentPeriod(d = new Date()) {
  const h = d.getHours();
  return TIME_PERIODS.find(p => h >= p.startHr && h < p.endHr)?.id || 'evening';
}

export function getTasksSorted(state, kidId) {
  const list = (state.tasks[kidId] || []).slice();
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return list;
}

/** Reorder a kid's task list by an array of task ids (in their new order). */
export function reorderTasks(state, kidId, orderedIds) {
  const list = state.tasks[kidId] || [];
  const map = Object.fromEntries(list.map(t => [t.id, t]));
  const next = [];
  orderedIds.forEach((id, i) => {
    if (map[id]) { map[id].order = i; next.push(map[id]); delete map[id]; }
  });
  // Append leftovers (defensive)
  Object.values(map).forEach(t => { t.order = next.length; next.push(t); });
  state.tasks[kidId] = next;
  save(state);
}

/** Rescale a kid's task points so the daily total = target (default 100). */
export function rebalancePoints(state, kidId, target = 100) {
  const list = state.tasks[kidId] || [];
  const total = list.reduce((a, t) => a + (t.pts || 0), 0);
  if (!list.length || !total) return;
  const scale = target / total;
  let runningSum = 0;
  list.forEach((t, i) => {
    if (i === list.length - 1) {
      t.pts = Math.max(1, target - runningSum);
    } else {
      t.pts = Math.max(1, Math.round((t.pts || 0) * scale));
      runningSum += t.pts;
    }
  });
  save(state);
}

// ── Rewards ────────────────────────────────────────────────────────────────
/**
 * @typedef {{ id:string, title:string, emoji:string, costPts:number,
 *   cadence:'daily'|'weekly'|'monthly'|'custom', cadenceN:number,
 *   history:{at:number,ptsSpent:number}[], active:boolean }} Reward
 */
export function getRewards(state, kidId) {
  state.rewards = state.rewards || {};
  return state.rewards[kidId] || [];
}

export function addReward(state, kidId, { title, emoji, costPts, cadence, cadenceN }) {
  state.rewards = state.rewards || {};
  state.rewards[kidId] = state.rewards[kidId] || [];
  state.rewards[kidId].push({
    id: 'r_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36),
    title, emoji: emoji || '🎁',
    costPts: Number(costPts) || 100,
    cadence: cadence || 'weekly',
    cadenceN: Number(cadenceN) || 1,
    history: [], active: true,
  });
  save(state);
}

export function updateReward(state, kidId, rewardId, updates) {
  const r = (state.rewards?.[kidId] || []).find(x => x.id === rewardId);
  if (r) Object.assign(r, updates);
  save(state);
}

export function removeReward(state, kidId, rewardId) {
  if (!state.rewards?.[kidId]) return;
  state.rewards[kidId] = state.rewards[kidId].filter(r => r.id !== rewardId);
  save(state);
}

/** Returns { earned, target, pct } toward a reward's current cadence window. */
export function rewardProgress(state, kidId, reward) {
  const ks = kidState(state, kidId);
  const now = new Date();
  let windowStart;
  if (reward.cadence === 'daily') {
    windowStart = new Date(now); windowStart.setHours(0,0,0,0);
  } else if (reward.cadence === 'weekly') {
    windowStart = new Date(now); windowStart.setDate(now.getDate() - now.getDay()); windowStart.setHours(0,0,0,0);
  } else if (reward.cadence === 'monthly') {
    windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    windowStart = new Date(now); windowStart.setDate(now.getDate() - (reward.cadenceN || 7)); windowStart.setHours(0,0,0,0);
  }
  let earned = 0;
  Object.entries(ks.pointsByDate || {}).forEach(([dateIso, pts]) => {
    const d = new Date(dateIso + 'T12:00:00');
    if (d >= windowStart) earned += pts;
  });
  (reward.history || []).forEach(h => { if (h.at >= windowStart.getTime()) earned -= h.ptsSpent; });
  earned = Math.max(0, earned);
  const target = reward.costPts;
  return { earned, target, pct: Math.min(100, Math.round(earned / target * 100)) };
}

export function claimReward(state, kidId, rewardId) {
  const r = (state.rewards?.[kidId] || []).find(x => x.id === rewardId);
  if (!r) return false;
  const { earned, target } = rewardProgress(state, kidId, r);
  if (earned < target) return false;
  r.history = r.history || [];
  r.history.unshift({ at: Date.now(), ptsSpent: target });
  logHistory(state, kidId, { message: `Claimed reward: "${r.title}" (-${target} pts)`, pts: -target });
  save(state);
  return true;
}

// ── Routines (chore chains) ────────────────────────────────────────────────
/**
 * @typedef {{ id:string, name:string, emoji:string, taskIds:string[],
 *   stepSeconds:number, active:boolean }} Routine
 */
export function getRoutines(state, kidId) {
  state.routines = state.routines || {};
  return state.routines[kidId] || [];
}
export function addRoutine(state, kidId, { name, emoji, taskIds, stepSeconds }) {
  state.routines = state.routines || {};
  state.routines[kidId] = state.routines[kidId] || [];
  state.routines[kidId].push({
    id: 'rt_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36),
    name: name || 'Routine',
    emoji: emoji || '🌟',
    taskIds: Array.isArray(taskIds) ? taskIds : [],
    stepSeconds: Number(stepSeconds) || 60,
    active: true,
  });
  save(state);
}
export function updateRoutine(state, kidId, routineId, updates) {
  const r = (state.routines?.[kidId] || []).find(x => x.id === routineId);
  if (r) Object.assign(r, updates);
  save(state);
}
export function removeRoutine(state, kidId, routineId) {
  if (!state.routines?.[kidId]) return;
  state.routines[kidId] = state.routines[kidId].filter(r => r.id !== routineId);
  save(state);
}

// ── Family notes (sticky announcements) ───────────────────────────────────
/** @typedef {{ id:string, text:string, emoji:string, color:string, expiresAt:number, createdAt:number }} FamilyNote */
export function getNotes(state) {
  state.notes = state.notes || [];
  const now = Date.now();
  state.notes = state.notes.filter(n => !n.expiresAt || n.expiresAt > now);
  return state.notes;
}
export function addNote(state, { text, emoji, color, hours }) {
  state.notes = state.notes || [];
  const h = Number(hours) || 24;
  state.notes.push({
    id: 'n_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36),
    text: String(text || '').slice(0, 280),
    emoji: emoji || '��',
    color: color || '#ffd93d',
    createdAt: Date.now(),
    expiresAt: h > 0 ? Date.now() + h * 3600 * 1000 : 0,
  });
  save(state);
}
export function removeNote(state, noteId) {
  state.notes = (state.notes || []).filter(n => n.id !== noteId);
  save(state);
}

// ── Auto-rotating chores ────────────────────────────────────────────────
// Each task may carry: rotation: { kidIds: string[], startDate?: 'YYYY-MM-DD' }
// We resolve which kid "owns" the task on a given date by counting days from
// startDate (or task creation epoch) modulo kidIds.length. The task is duplicated
// (in-memory only) onto the owning kid for display purposes.

function _epochDay(iso) {
  const d = new Date(iso + 'T12:00:00');
  return Math.floor(d.getTime() / 86400000);
}

/** Returns the kid id that owns this rotating task on `iso`, or null if not rotated. */
export function rotationOwnerOn(task, iso) {
  const r = task?.rotation;
  if (!r || !Array.isArray(r.kidIds) || r.kidIds.length < 2) return null;
  const start = r.startDate || iso;
  const offset = _epochDay(iso) - _epochDay(start);
  const idx = ((offset % r.kidIds.length) + r.kidIds.length) % r.kidIds.length;
  return r.kidIds[idx];
}

/** Set/clear rotation on a task. */
export function setTaskRotation(state, kidId, taskId, rotation) {
  const t = (state.tasks[kidId] || []).find(x => x.id === taskId);
  if (!t) return;
  if (!rotation || !rotation.kidIds?.length) delete t.rotation;
  else t.rotation = { kidIds: rotation.kidIds.slice(), startDate: rotation.startDate || new Date().toISOString().slice(0,10) };
  save(state);
}
