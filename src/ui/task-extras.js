// FILE: src/ui/task-extras.js
// Two reusable, kid-friendly overlays:
//   showTaskTimer(task, onComplete)  — full-screen countdown, big numbers
//   showTaskVideo(task)              — instruction video (YouTube embed or <video>)
//
// Both build their own DOM (do NOT reuse #parentModal so they can sit above the kid view).

import { playSfx } from '../utils/effects.js';
import { playVoice } from '../utils/voice.js';

let timerInterval = null;

function buildOverlay(id, innerHtml, extraClass = '') {
  let el = document.getElementById(id);
  if (el) el.remove();
  el = document.createElement('div');
  el.id = id;
  el.className = `taskOverlay ${extraClass}`;
  el.innerHTML = innerHtml;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  return el;
}

function closeOverlay(el) {
  if (!el) return;
  el.classList.remove('show');
  setTimeout(() => el.remove(), 220);
}

const fmt = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Full-screen countdown timer for a task. Calls onComplete() when timer hits 0
 * (kid can also tap "I'm done early" for the same effect).
 */
export function showTaskTimer(task, onComplete) {
  let remaining = task.timerSec || 60;
  const el = buildOverlay('taskTimerOverlay', `
    <div class="ttoCard">
      <div class="ttoEmoji">${task.emoji || '⏱'}</div>
      <div class="ttoTitle">${task.title}</div>
      <div class="ttoHelper">${task.helper || ''}</div>
      <div class="ttoClock" id="ttoClock">${fmt(remaining)}</div>
      <div class="ttoRing">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="8"/>
          <circle id="ttoRingFill" cx="60" cy="60" r="54" fill="none"
            stroke="#35c976" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="${2*Math.PI*54}" stroke-dashoffset="0"
            transform="rotate(-90 60 60)"/>
        </svg>
      </div>
      <div class="ttoBtns">
        <button class="btn green" id="ttoDone">✓ I'm done!</button>
        <button class="btn" id="ttoCancel">Cancel</button>
      </div>
    </div>
  `, 'timerOverlay');

  const clockEl = document.getElementById('ttoClock');
  const ringEl = document.getElementById('ttoRingFill');
  const total = task.timerSec || 60;
  const circ = 2 * Math.PI * 54;

  if (timerInterval) clearInterval(timerInterval);

  // Play parent's voice reminder once at the start, if recorded
  let voiceAudio = null;
  if (task.voiceUrl) voiceAudio = playVoice(task.voiceUrl);

  const tick = () => {
    clockEl.textContent = fmt(remaining);
    ringEl.setAttribute('stroke-dashoffset', String(circ * (1 - remaining / total)));
    if (remaining <= 10 && remaining > 0) {
      clockEl.classList.add('warn');
      playSfx('tick');
    }
    if (remaining <= 0) {
      clearInterval(timerInterval);
      try { navigator.vibrate?.(300); } catch {}
      playSfx('warn');
      finish(true);
    }
    remaining--;
  };

  const finish = (auto) => {
    clearInterval(timerInterval);
    if (voiceAudio) { try { voiceAudio.pause(); } catch {} }
    closeOverlay(el);
    if (auto) onComplete?.();
  };

  tick();
  timerInterval = setInterval(tick, 1000);

  document.getElementById('ttoDone').onclick   = () => finish(true);
  document.getElementById('ttoCancel').onclick = () => finish(false);
}

/** Show an instruction video for a task. Supports YouTube + direct mp4. */
export function showTaskVideo(task) {
  const url = (task.videoUrl || '').trim();
  if (!url) return;
  const yt = parseYouTube(url);
  const player = yt
    ? `<iframe src="https://www.youtube.com/embed/${yt}?autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
    : `<video src="${url}" controls autoplay playsinline></video>`;

  const el = buildOverlay('taskVideoOverlay', `
    <div class="tvoCard">
      <button class="tvoClose" id="tvoClose">✕</button>
      <div class="tvoTitle">${task.emoji || '🎥'} ${task.title}</div>
      <div class="tvoPlayer">${player}</div>
      <div class="tvoHelper">${task.helper || ''}</div>
    </div>
  `, 'videoOverlay');

  document.getElementById('tvoClose').onclick = () => closeOverlay(el);
  el.onclick = e => { if (e.target === el) closeOverlay(el); };
}

function parseYouTube(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}
