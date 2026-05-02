// FILE: src/utils/helpers.js

/**
 * Launches confetti animation. Uses #confettiLayer if no container passed.
 * @param {HTMLElement} [container]
 */
export function launchConfetti(container) {
  const el = container || document.getElementById('confettiLayer');
  if (!el) return;
  el.innerHTML = '';
  const colors = ['#ffb13d', '#35c976', '#54b8ff', '#8b6cff', '#ff5ea8'];
  for (let i = 0; i < 110; i++) {
    const p = document.createElement('div');
    p.className = 'piece';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.35 + 's';
    el.appendChild(p);
  }
  setTimeout(() => { el.innerHTML = ''; }, 2300);
}

/**
 * Roll against a list of eggs by cumulative chance.
 * @param {import('../data/eggs.js').Egg[]} eggs
 * @returns {import('../data/eggs.js').Egg | null}
 */
export function rollEgg(eggs) {
  const roll = Math.random();
  let cumulative = 0;
  for (const egg of eggs) {
    cumulative += egg.chance;
    if (roll < cumulative) return egg;
  }
  return null;
}
