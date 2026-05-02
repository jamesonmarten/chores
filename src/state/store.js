// FILE: src/state/store.js

import { KIDS } from '../data/kids.js';
import { today } from '../utils/date.js';

const KEY = 'familyChoresAndMoreV1';

/**
 * Returns a fresh blank state for all kids.
 * @returns {object}
 */
function fresh() {
  return {
    kids: Object.fromEntries(
      KIDS.map(k => [k.id, { pointsByDate: {}, done: {}, treats: 0, eggs: 0 }])
    ),
  };
}

/**
 * Loads persisted state from localStorage, or returns fresh state.
 * @returns {object}
 */
export function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || fresh();
  } catch {
    return fresh();
  }
}

/**
 * Persists current state to localStorage.
 * @param {object} state
 */
export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/**
 * Returns the kid state object, initialising it if missing.
 * @param {object} state
 * @param {string} id
 * @returns {object}
 */
export function kidState(state, id) {
  state.kids[id] = state.kids[id] || { pointsByDate: {}, done: {}, treats: 0, eggs: 0 };
  return state.kids[id];
}

/**
 * Returns the points for a kid on a given date.
 * @param {object} state
 * @param {string} id
 * @param {string} [date]
 * @returns {number}
 */
export function getPoints(state, id, date = today()) {
  return kidState(state, id).pointsByDate[date] || 0;
}

/**
 * Sets the points for a kid on a given date, clamped 0–100.
 * @param {object} state
 * @param {string} id
 * @param {number} val
 * @param {string} [date]
 */
export function setPoints(state, id, val, date = today()) {
  kidState(state, id).pointsByDate[date] = Math.max(0, Math.min(100, val));
}
