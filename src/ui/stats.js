// FILE: src/ui/stats.js

import { KIDS } from '../data/kids.js';
import { getPoints, kidState } from '../state/store.js';

/**
 * Updates the top stat counters.
 * @param {object} state
 */
export function renderStats(state) {
  const total  = KIDS.reduce((a, k) => a + getPoints(state, k.id), 0);
  const treats = KIDS.reduce((a, k) => a + kidState(state, k.id).treats, 0);
  const eggs   = KIDS.reduce((a, k) => a + kidState(state, k.id).eggs, 0);

  document.getElementById('statPoints').textContent = total;
  document.getElementById('statTreats').textContent = treats;
  document.getElementById('statEggs').textContent   = eggs;
}
