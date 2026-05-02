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
  document.getElementById('modalPrice').style.display = price ? 'block' : 'none';
  document.getElementById('modal').classList.add('show');
}

/**
 * Hides the modal.
 */
export function hideModal() {
  document.getElementById('modal').classList.remove('show');
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
