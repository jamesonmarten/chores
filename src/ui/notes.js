// FILE: src/ui/notes.js
// Family sticky notes — pinned strip at the top of parent + kid views.

import { getNotes, addNote, removeNote } from '../state/store.js';

const NOTE_COLORS = ['#ffd93d', '#ffb13d', '#ff8aa1', '#a4f0a4', '#a4d8ff', '#d4baff'];

const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Render the sticky-note strip into a container (creates it if needed). Read-only by default. */
export function renderNotesStrip(state, container, { editable = false, onChange } = {}) {
  if (!container) return;
  const notes = getNotes(state);
  if (!notes.length && !editable) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.innerHTML = `
    <div class="notesStrip">
      ${notes.map(n => `
        <div class="noteChip" style="background:${n.color}" data-note="${n.id}">
          <span class="ncEmoji">${n.emoji}</span>
          <span class="ncText">${esc(n.text)}</span>
          ${editable ? `<button class="ncDel" data-del="${n.id}" title="Remove">✕</button>` : ''}
        </div>`).join('')}
      ${editable ? `<button class="noteAdd" id="noteAddBtn">＋ Note</button>` : ''}
    </div>
  `;
  if (editable) {
    container.querySelector('#noteAddBtn').onclick = () => showNoteModal(state, () => {
      renderNotesStrip(state, container, { editable, onChange });
      onChange?.();
    });
    container.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      removeNote(state, b.dataset.del);
      renderNotesStrip(state, container, { editable, onChange });
      onChange?.();
    });
  }
}

/** Modal for composing a new note. */
export function showNoteModal(state, onAdded) {
  const modal = document.getElementById('parentModal');
  const box = document.getElementById('parentModalBox');
  if (!modal || !box) return;
  box.innerHTML = `
    <button class="pmClose modalCloseX">✕</button>
    <h2 class="pmTitle">📌 Family Note</h2>
    <form id="noteForm" class="pmForm">
      <label>Message
        <textarea name="text" required rows="3" maxlength="280" placeholder="Soccer 5pm! Pizza for dinner 🍕"></textarea>
      </label>
      <label>Emoji <input name="emoji" maxlength="4" value="📌"></label>
      <label>Color
        <div class="noteColorRow">
          ${NOTE_COLORS.map((c, i) => `<button type="button" class="ncSwatch ${i===0?'active':''}" data-color="${c}" style="background:${c}"></button>`).join('')}
        </div>
        <input type="hidden" name="color" value="${NOTE_COLORS[0]}">
      </label>
      <label>Auto-expire
        <select name="hours">
          <option value="24" selected>After 24 hours</option>
          <option value="6">After 6 hours</option>
          <option value="48">After 2 days</option>
          <option value="168">After 1 week</option>
          <option value="0">Never</option>
        </select>
      </label>
      <button type="submit" class="btn green">Pin Note</button>
    </form>`;
  modal.hidden = false;
  modal.classList.add('show');

  const close = () => { modal.classList.remove('show'); setTimeout(() => { modal.hidden = true; box.innerHTML = ''; }, 220); };
  box.querySelector('.pmClose').onclick = close;

  const form = document.getElementById('noteForm');
  const colorInput = form.querySelector('[name=color]');
  form.querySelectorAll('.ncSwatch').forEach(sw => sw.onclick = () => {
    form.querySelectorAll('.ncSwatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    colorInput.value = sw.dataset.color;
  });

  form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form);
    addNote(state, {
      text: fd.get('text').trim(),
      emoji: (fd.get('emoji') || '📌').trim(),
      color: fd.get('color'),
      hours: parseInt(fd.get('hours'), 10),
    });
    close();
    onAdded?.();
  };
}
