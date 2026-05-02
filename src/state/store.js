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
  return {
    isPro: false,
    familyId: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    kids: DEFAULT_KIDS,
    tasks: DEFAULT_TASKS,
    kidData: Object.fromEntries(
      DEFAULT_KIDS.map(k => [k.id, {
        pointsByDate: {}, done: {}, treats: 0, eggs: 0,
        allowanceEarned: 0, history: [], streak: 0, bestStreak: 0, totalPoints: 0, level: 1,
      }])
    ),
  };
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
    return parsed;
  } catch { return fresh(); }
}

export function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

export function getPin() { return localStorage.getItem(PIN_KEY) || '1234'; }
export function setPin(pin) { localStorage.setItem(PIN_KEY, pin); }
export function checkPin(pin) { return pin === getPin(); }

export function activatePro(state) { state.isPro = true; save(state); }
export function isPro(state) { return !!state.isPro; }

export function addKid(state, { name, age, color, avatar, allowance }) {
  const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
  state.kids.push({ id, name, age, initial: name.trim()[0].toUpperCase(), color, avatar: avatar || '😊', allowance: Number(allowance) || 0 });
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

export function addTask(state, kidId, { title, pts, helper, emoji }) {
  state.tasks[kidId] = state.tasks[kidId] || [];
  state.tasks[kidId].push({ id: title.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), title, pts: Number(pts) || 10, helper: helper || 'Tap when done', emoji: emoji || '✅' });
  save(state);
}

export function removeTask(state, kidId, taskId) {
  state.tasks[kidId] = (state.tasks[kidId] || []).filter(t => t.id !== taskId);
  save(state);
}

export function updateTask(state, kidId, taskId, updates) {
  const task = (state.tasks[kidId] || []).find(t => t.id === taskId);
  if (task) Object.assign(task, updates);
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
