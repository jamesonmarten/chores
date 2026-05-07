// FILE: src/utils/theme.js
// Light/dark theme. Persists to localStorage; auto-detects on first load.

const KEY = 'familyChoresTheme';

export function getTheme() {
  return localStorage.getItem(KEY)
    || (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}

export function setTheme(t) {
  localStorage.setItem(KEY, t);
  document.documentElement.setAttribute('data-theme', t);
}

export function applyThemeBoot() {
  document.documentElement.setAttribute('data-theme', getTheme());
}

export function toggleTheme() {
  setTheme(getTheme() === 'light' ? 'dark' : 'light');
}
