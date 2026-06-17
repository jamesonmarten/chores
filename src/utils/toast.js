// FILE: src/utils/toast.js
// Lightweight, non-blocking toast notifications. Used for quick kid feedback
// like "+10 points!" and "Undo" affordances without trapping them behind a modal.

let _wrap = null;

function ensureWrap() {
  if (_wrap && document.body.contains(_wrap)) return _wrap;
  _wrap = document.createElement('div');
  _wrap.className = 'toastWrap';
  _wrap.setAttribute('aria-live', 'polite');
  document.body.appendChild(_wrap);
  return _wrap;
}

/**
 * Show a toast.
 * @param {object} opts
 * @param {string} [opts.emoji]      Leading emoji.
 * @param {string} opts.text         Main message.
 * @param {string} [opts.actionText] Optional action button label (e.g. "Undo").
 * @param {() => void} [opts.onAction] Click handler for the action button.
 * @param {number} [opts.duration]   Auto-dismiss ms (default 3200).
 * @param {string} [opts.tone]       'success' | 'info' | 'warn'
 */
export function showToast({ emoji = '', text, actionText, onAction, duration = 3200, tone = 'info' } = {}) {
  const wrap = ensureWrap();
  const t = document.createElement('div');
  t.className = `toast toast-${tone}`;
  t.innerHTML = `
    ${emoji ? `<span class="toastEmoji">${emoji}</span>` : ''}
    <span class="toastText"></span>
    ${actionText ? `<button class="toastAction" type="button"></button>` : ''}
  `;
  t.querySelector('.toastText').textContent = text;

  let timer = null;
  const dismiss = () => {
    if (!t.isConnected) return;
    t.classList.add('toastOut');
    setTimeout(() => t.remove(), 220);
    if (timer) clearTimeout(timer);
  };

  if (actionText) {
    const btn = t.querySelector('.toastAction');
    btn.textContent = actionText;
    btn.onclick = () => { try { onAction?.(); } finally { dismiss(); } };
  }

  wrap.appendChild(t);
  // Force reflow then animate in
  requestAnimationFrame(() => t.classList.add('toastIn'));
  timer = setTimeout(dismiss, duration);

  return dismiss;
}
