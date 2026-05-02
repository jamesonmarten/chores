// FILE: src/utils/date.js

/**
 * Returns the current date as a YYYY-MM-DD string in local time.
 * @returns {string}
 */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Builds a namespaced key for a task on a given date.
 * @param {string} taskId
 * @param {string} [date]
 * @returns {string}
 */
export function taskKey(taskId, date = today()) {
  return `${date}_${taskId}`;
}
