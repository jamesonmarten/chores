// FILE: src/ui/render.js

/**
 * Shows the modal with given content.
 * @param {string} title
 * @param {string} text
 * @param {boolean} [price]
 * @param {string} [icon]
 */
export function showModal(title, text, price = false, icon = '') {
  document.getElementById('eggIcon').innerHTML = icon ? `<div class="egg">${icon}</div>` : '';
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalText').textContent = text;
  const priceEl = document.getElementById('modalPrice');
  if (priceEl) priceEl.hidden = !price;
  const m = document.getElementById('modal');
  m.hidden = false;
  m.classList.add('show');
}

/**
 * Hides the modal.
 */
export function hideModal() {
  const m = document.getElementById('modal');
  m.classList.remove('show');
  setTimeout(() => { m.hidden = true; }, 220);
}

/**
 * Wires up modal close interactions.
 */
export function initModal() {
  document.getElementById('closeModal').onclick = hideModal;
  document.getElementById('modal').onclick = e => {
    if (e.target.id === 'modal') hideModal();
  };
}
