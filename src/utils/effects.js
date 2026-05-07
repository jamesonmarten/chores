// FILE: src/utils/effects.js
// Tiny synthesized SFX (WebAudio) + animation/SFX toggles.
// No external audio files — every sound is generated procedurally.

const SFX_KEY  = 'familyChoresSfxOn';
const ANIM_KEY = 'familyChoresAnimOn';

export function sfxOn()  { return localStorage.getItem(SFX_KEY)  !== '0'; } // default on
export function animOn() { return localStorage.getItem(ANIM_KEY) !== '0'; }
export function setSfx(on)  { localStorage.setItem(SFX_KEY,  on ? '1' : '0'); }
export function setAnim(on) {
  localStorage.setItem(ANIM_KEY, on ? '1' : '0');
  document.documentElement.classList.toggle('no-anim', !on);
}

/** Apply persisted animation pref to <html> on boot. */
export function applyEffectsBoot() {
  document.documentElement.classList.toggle('no-anim', !animOn());
}

let _ctx = null;
function ctx() {
  if (_ctx) return _ctx;
  try {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { _ctx = null; }
  return _ctx;
}

/** Play one quick tone. */
function tone({ freq, dur = 0.18, type = 'sine', gain = 0.18, attack = 0.005, release = 0.12, when = 0 }) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearTargetAtTime?.(gain, t0, attack);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + release + 0.05);
}

/** Public: play a named sound effect. Silent if user has SFX off. */
export function playSfx(name) {
  if (!sfxOn()) return;
  const c = ctx();
  if (!c) return;
  // Resume on first interaction (autoplay policy)
  if (c.state === 'suspended') c.resume().catch(() => {});

  switch (name) {
    case 'done':
      tone({ freq: 660, dur: 0.10, type: 'triangle', gain: 0.16 });
      tone({ freq: 990, dur: 0.14, type: 'triangle', gain: 0.14, when: 0.07 });
      break;
    case 'reward': {
      // Cheerful 4-note arpeggio
      const notes = [523, 659, 784, 1047]; // C E G C
      notes.forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'triangle', gain: 0.18, when: i * 0.09 }));
      break;
    }
    case 'levelUp': {
      const notes = [392, 523, 659, 784, 1047]; // G C E G C
      notes.forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'square', gain: 0.10, when: i * 0.07 }));
      break;
    }
    case 'tick':
      tone({ freq: 1200, dur: 0.04, type: 'square', gain: 0.06 });
      break;
    case 'warn':
      tone({ freq: 880, dur: 0.10, type: 'sawtooth', gain: 0.10 });
      tone({ freq: 660, dur: 0.10, type: 'sawtooth', gain: 0.10, when: 0.12 });
      break;
    case 'error':
      tone({ freq: 220, dur: 0.18, type: 'sawtooth', gain: 0.14 });
      break;
    default:
      tone({ freq: 880, dur: 0.10 });
  }
}
