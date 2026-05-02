// FILE: src/data/eggs.js

/** @typedef {{ msg: string, chance: number, icon: string }} Egg */

/** @type {Egg[]} */
export const EGGS = [
  { msg: 'Extra treat unlocked!',                         chance: 0.004,  icon: '🍪' },
  { msg: '15 extra minutes of playtime unlocked!',        chance: 0.0035, icon: '⚽' },
  { msg: 'You pick the next show or movie tonight!',      chance: 0.0025, icon: '🎬' },
  { msg: '20 extra minutes of iPad time unlocked!',       chance: 0.0018, icon: '📱' },
  { msg: 'RARE JACKPOT: Go to your favorite restaurant!', chance: 0.0004, icon: '🍔' },
];
