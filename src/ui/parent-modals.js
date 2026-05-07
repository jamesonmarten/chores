// FILE: src/ui/parent-modals.js
// Provides open/close helpers for parent CRUD modals (add/edit kid, add/edit task, settings)

import { getTheme, setTheme } from '../utils/theme.js';
import { sfxOn, animOn, setSfx, setAnim, playSfx } from '../utils/effects.js';

const KID_PRESETS = [
  '#ff5ea8', '#ff8a3d', '#ffc83d', '#35c976',
  '#54b8ff', '#8b6cff', '#ff6b6b', '#3dd4c8',
];

function colorPickerHtml(name, value) {
  return `
    <div class="colorPickRow">
      <input type="color" name="${name}" value="${value}" class="colorPickWheel">
      <div class="colorPickPresets">
        ${KID_PRESETS.map(c => `<button type="button" class="cpSwatch" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}
      </div>
    </div>`;
}

function wireColorPickers(form) {
  form.querySelectorAll('.colorPickRow').forEach(row => {
    const wheel = row.querySelector('input[type=color]');
    row.querySelectorAll('.cpSwatch').forEach(sw => {
      sw.onclick = () => {
        wheel.value = sw.dataset.color;
        wheel.dispatchEvent(new Event('input', { bubbles: true }));
      };
    });
  });
}

function openParentModal(html, onClose) {
  const box = document.getElementById('parentModalBox');
  const modal = document.getElementById('parentModal');
  box.innerHTML = html;
  modal.hidden = false;
  modal.classList.add('show');

  const close = () => {
    modal.classList.remove('show');
    setTimeout(() => { modal.hidden = true; box.innerHTML = ''; }, 220);
    if (onClose) onClose();
  };

  modal.onclick = e => { if (e.target.id === 'parentModal') close(); };
  box.querySelector('.pmClose')?.addEventListener('click', close);
  return close;
}

/** Show Add Kid modal. Calls onSave({name, age, color, avatar, allowance}) */
export function showAddKidModal(onSave) {
  const html = `
    <button class="pmClose modalCloseX">✕</button>
    <h2 class="pmTitle">Add a Kid</h2>
    <form id="addKidForm" class="pmForm">
      <label>Name <input name="name" required placeholder="e.g. Emma" maxlength="30"></label>
      <label>Age <input name="age" placeholder="e.g. 8 years" maxlength="20"></label>
      <label>Avatar (emoji) <input name="avatar" placeholder="😊" maxlength="4"></label>
      <label>Color ${colorPickerHtml('color', '#35c976')}</label>
      <label>Allowance per full day ($) <input name="allowance" type="number" min="0" step="0.5" value="0"></label>
      <button type="submit" class="btn green">Add Kid</button>
    </form>`;

  const close = openParentModal(html);
  const form = document.getElementById('addKidForm');
  wireColorPickers(form);
  form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSave({
      name: fd.get('name').trim(),
      age: fd.get('age').trim() || '',
      avatar: fd.get('avatar').trim() || '😊',
      color: fd.get('color'),
      allowance: parseFloat(fd.get('allowance')) || 0,
    });
    close();
  };
}

/** Show Edit Kid modal. */
export function showEditKidModal(kid, onSave) {
  const html = `
    <button class="pmClose modalCloseX">✕</button>
    <h2 class="pmTitle">Edit ${kid.name}</h2>
    <form id="editKidForm" class="pmForm">
      <label>Name <input name="name" required value="${kid.name}" maxlength="30"></label>
      <label>Age <input name="age" value="${kid.age || ''}" maxlength="20"></label>
      <label>Avatar (emoji) <input name="avatar" value="${kid.avatar || '😊'}" maxlength="4"></label>
      <label>Color ${colorPickerHtml('color', kid.color)}</label>
      <label>Allowance per full day ($) <input name="allowance" type="number" min="0" step="0.5" value="${kid.allowance || 0}"></label>
      <button type="submit" class="btn green">Save Changes</button>
    </form>`;

  const close = openParentModal(html);
  const form = document.getElementById('editKidForm');
  wireColorPickers(form);
  form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSave({
      name: fd.get('name').trim(),
      age: fd.get('age').trim(),
      avatar: fd.get('avatar').trim() || kid.avatar,
      color: fd.get('color'),
      allowance: parseFloat(fd.get('allowance')) || 0,
    });
    close();
  };
}

/** Show Add Task modal */
export function showAddTaskModal(kidName, onSave) {
  const html = `
    <button class="pmClose modalCloseX">✕</button>
    <h2 class="pmTitle">Add Task for ${kidName}</h2>
    <form id="addTaskForm" class="pmForm">
      <label>Task Name <input name="title" required placeholder="e.g. Clean room" maxlength="50"></label>
      <label>Emoji <input name="emoji" placeholder="🧹" maxlength="4"></label>
      <label>Points <input name="pts" type="number" min="1" max="100" value="10"></label>
      <label>Helper text <input name="helper" placeholder="e.g. Tap when done" maxlength="60"></label>
      <label>Time of day
        <select name="timeOfDay">
          <option value="any">Any time</option>
          <option value="morning">🌅 Morning</option>
          <option value="afternoon">☀️ Afternoon</option>
          <option value="evening">🌙 Evening</option>
        </select>
      </label>
      <label>Timer (seconds, 0 = none) <input name="timerSec" type="number" min="0" max="3600" value="0"></label>
      <label>Instruction video URL (YouTube or .mp4, optional) <input name="videoUrl" type="url" placeholder="https://…"></label>
      <button type="submit" class="btn green">Add Task</button>
    </form>`;

  const close = openParentModal(html);
  document.getElementById('addTaskForm').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSave({
      title: fd.get('title').trim(),
      emoji: fd.get('emoji').trim() || '✅',
      pts: parseInt(fd.get('pts')) || 10,
      helper: fd.get('helper').trim() || 'Tap when done',
      timeOfDay: fd.get('timeOfDay') || 'any',
      timerSec: parseInt(fd.get('timerSec')) || 0,
      videoUrl: (fd.get('videoUrl') || '').trim(),
    });
    close();
  };
}

/** Show Edit Task modal */
export function showEditTaskModal(task, kidName, onSave) {
  const html = `
    <button class="pmClose modalCloseX">✕</button>
    <h2 class="pmTitle">Edit Task for ${kidName}</h2>
    <form id="editTaskForm" class="pmForm">
      <label>Task Name <input name="title" required value="${task.title}" maxlength="50"></label>
      <label>Emoji <input name="emoji" value="${task.emoji || '✅'}" maxlength="4"></label>
      <label>Points <input name="pts" type="number" min="1" max="100" value="${task.pts}"></label>
      <label>Helper text <input name="helper" value="${task.helper || ''}" maxlength="60"></label>
      <label>Time of day
        <select name="timeOfDay">
          <option value="any"${(task.timeOfDay||'any')==='any'?' selected':''}>Any time</option>
          <option value="morning"${task.timeOfDay==='morning'?' selected':''}>🌅 Morning</option>
          <option value="afternoon"${task.timeOfDay==='afternoon'?' selected':''}>☀️ Afternoon</option>
          <option value="evening"${task.timeOfDay==='evening'?' selected':''}>🌙 Evening</option>
        </select>
      </label>
      <label>Timer (seconds, 0 = none) <input name="timerSec" type="number" min="0" max="3600" value="${task.timerSec || 0}"></label>
      <label>Instruction video URL <input name="videoUrl" type="url" value="${task.videoUrl || ''}" placeholder="https://…"></label>
      <button type="submit" class="btn green">Save Changes</button>
    </form>`;

  const close = openParentModal(html);
  document.getElementById('editTaskForm').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSave({
      title: fd.get('title').trim(),
      emoji: fd.get('emoji').trim() || task.emoji,
      pts: parseInt(fd.get('pts')) || task.pts,
      helper: fd.get('helper').trim() || task.helper,
      timeOfDay: fd.get('timeOfDay') || 'any',
      timerSec: parseInt(fd.get('timerSec')) || 0,
      videoUrl: (fd.get('videoUrl') || '').trim(),
    });
    close();
  };
}

/** Show Settings modal (PIN change + theme + sounds + animations) */
export function showSettingsModal(currentPin, onSavePin) {
  const t = getTheme();
  const html = `
    <button class="pmClose modalCloseX">✕</button>
    <h2 class="pmTitle">⚙️ Settings</h2>

    <div class="settingsBlock">
      <div class="settingsBlockTitle">Appearance</div>
      <div class="themeToggle">
        <button type="button" class="themeOpt ${t==='light'?'active':''}" data-theme="light">☀️ Light</button>
        <button type="button" class="themeOpt ${t==='dark'?'active':''}"  data-theme="dark">🌙 Dark</button>
      </div>
    </div>

    <div class="settingsBlock">
      <div class="settingsBlockTitle">Effects</div>
      <label class="toggleRow">
        <span>🔊 Sound effects</span>
        <input type="checkbox" id="setSfx" ${sfxOn() ? 'checked' : ''}>
        <span class="toggleSwitch"></span>
      </label>
      <label class="toggleRow">
        <span>✨ Animations &amp; confetti</span>
        <input type="checkbox" id="setAnim" ${animOn() ? 'checked' : ''}>
        <span class="toggleSwitch"></span>
      </label>
      <button type="button" class="linkBtn" id="testSfx" style="margin-top:6px">▶ Test sound</button>
    </div>

    <div class="settingsBlock">
      <div class="settingsBlockTitle">Parent PIN</div>
      <form id="settingsForm" class="pmForm">
        <label>Current PIN <input name="currentPin" type="password" inputmode="numeric" maxlength="4" placeholder="Current PIN"></label>
        <label>New PIN <input name="newPin" type="password" inputmode="numeric" maxlength="4" placeholder="4 digits"></label>
        <label>Confirm PIN <input name="confirmPin" type="password" inputmode="numeric" maxlength="4" placeholder="4 digits"></label>
        <div class="pmError" id="pinError" hidden></div>
        <button type="submit" class="btn green">Change PIN</button>
      </form>
    </div>`;

  openParentModal(html);

  // Theme toggle (live)
  document.querySelectorAll('.themeOpt').forEach(btn => {
    btn.onclick = () => {
      setTheme(btn.dataset.theme);
      document.querySelectorAll('.themeOpt').forEach(b => b.classList.toggle('active', b === btn));
    };
  });

  // SFX + Anim toggles (live)
  document.getElementById('setSfx').onchange  = e => { setSfx(e.target.checked); if (e.target.checked) playSfx('done'); };
  document.getElementById('setAnim').onchange = e => setAnim(e.target.checked);
  document.getElementById('testSfx').onclick  = () => playSfx('reward');

  // PIN
  document.getElementById('settingsForm').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = document.getElementById('pinError');
    if (!fd.get('newPin')) { errEl.hidden = true; return; } // Allow saving without changing PIN
    if (fd.get('currentPin') !== currentPin) {
      errEl.textContent = 'Current PIN is incorrect.'; errEl.hidden = false; return;
    }
    if (fd.get('newPin') !== fd.get('confirmPin') || fd.get('newPin').length < 4) {
      errEl.textContent = 'PINs must match and be 4 digits.'; errEl.hidden = false; return;
    }
    onSavePin(fd.get('newPin'));
    document.getElementById('parentModal').classList.remove('show');
    setTimeout(() => { document.getElementById('parentModal').hidden = true; }, 220);
  };
}

/** Confirm dialog */
export function showConfirm(message, onConfirm) {
  const html = `
    <button class="pmClose modalCloseX">✕</button>
    <div class="pmConfirm">
      <div class="pmConfirmEmoji">⚠️</div>
      <p>${message}</p>
      <div class="pmConfirmBtns">
        <button id="confirmYes" class="btn red">Yes, remove</button>
        <button class="pmClose btn">Cancel</button>
      </div>
    </div>`;

  const close = openParentModal(html);
  document.getElementById('confirmYes').onclick = () => { onConfirm(); close(); };
}
