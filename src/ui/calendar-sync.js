// FILE: src/ui/calendar-sync.js
// Modal for exporting / syncing chores to external calendars

import { loadAccount } from '../state/account.js';
import {
  buildICS, eventsFromState, downloadICS,
  googleAddUrl, webcalSubscribeUrl,
} from '../utils/calendar-export.js';

// Same-origin /api on web; absolute URL when running in Capacitor native shell (where window.origin is capacitor://).
const RAW_API = import.meta.env.VITE_API_URL
  || (window.Capacitor?.isNativePlatform?.() ? 'https://chores.devcabin.tech/api' : '/api');
const API = RAW_API.replace(/\/$/, '');

const modal    = () => document.getElementById('parentModal');
const modalBox = () => document.getElementById('parentModalBox');

function open(html) {
  modalBox().innerHTML = html;
  modal().hidden = false;
  requestAnimationFrame(() => modal().style.opacity = '1');
}
function close() {
  modal().style.opacity = '0';
  setTimeout(() => { modal().hidden = true; modalBox().innerHTML = ''; }, 180);
}

let _filterKidIds = [];
let _includeCompleted = true;
let _includeUpcoming  = true;

export function showCalendarSyncModal(state) {
  const acct = loadAccount();
  // Subscribe URL must be absolute (webcal:// can't resolve a relative path).
  // If API is same-origin "/api", convert it to a fully-qualified URL.
  const absApi = API.startsWith('http') ? API : `${window.location.origin}${API}`;
  const subUrl = acct ? `${absApi}/calendar/${acct.id}.ics` : null;

  open(`
    <div class="syncBox">
      <div class="syncEmoji">📅</div>
      <h2 class="syncTitle">Sync to your calendar</h2>
      <p class="syncText">Get every chore in Apple Calendar, Google Calendar, Outlook, or any app that supports iCal feeds.</p>

      <div class="syncTabs">
        <button class="syncTab active" data-tab="subscribe">🔁 Subscribe (recommended)</button>
        <button class="syncTab" data-tab="export">⬇️ Export .ics</button>
      </div>

      <!-- Filters -->
      <div class="syncFilters">
        <div class="syncFilterLabel">Include</div>
        <label class="syncCheck"><input type="checkbox" id="incUpcoming" ${_includeUpcoming?'checked':''}> Today's chores</label>
        <label class="syncCheck"><input type="checkbox" id="incCompleted" ${_includeCompleted?'checked':''}> Completed history</label>

        <div class="syncFilterLabel" style="margin-top:14px">Filter by kid</div>
        <div class="syncKidPills">
          ${state.kids.map(k => `
            <label class="syncKidPill" style="--kc:${k.color}">
              <input type="checkbox" data-kid="${k.id}" ${_filterKidIds.length===0||_filterKidIds.includes(k.id)?'checked':''}>
              <span>${k.avatar||'👶'} ${k.name}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Subscribe tab -->
      <div class="syncPanel" data-panel="subscribe">
        ${subUrl ? `
          <p class="syncHint">Adds a live, auto-updating feed to your calendar app. Changes sync within an hour.</p>
          <div class="syncLinkRow">
            <input id="subUrlInput" readonly value="${subUrl}">
            <button id="subUrlCopy" class="signupCTA small" type="button">Copy</button>
          </div>
          <div class="syncBtnGrid">
            <a class="syncBtn" id="subAppleBtn" href="${webcalSubscribeUrl(subUrl)}">
              <span class="syncBtnEm">🍎</span><span>Add to Apple Calendar</span>
            </a>
            <a class="syncBtn" id="subGoogleBtn" target="_blank"
               href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(subUrl)}">
              <span class="syncBtnEm">📆</span><span>Add to Google Calendar</span>
            </a>
            <a class="syncBtn" id="subOutlookBtn" target="_blank"
               href="https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addsubscription&url=${encodeURIComponent(subUrl)}&name=${encodeURIComponent('Family Chores')}">
              <span class="syncBtnEm">📧</span><span>Add to Outlook</span>
            </a>
          </div>` : `
          <p class="syncHint warn">⚠️ Live subscription requires an account and the API server to be online. You can still use one-time export below.</p>`}
      </div>

      <!-- Export tab -->
      <div class="syncPanel" data-panel="export" hidden>
        <p class="syncHint">Download a one-time snapshot. Drag it into Apple Calendar, or import via Google Calendar settings.</p>
        <button id="downloadIcsBtn" class="signupCTA">⬇️ Download .ics file</button>
        <div class="syncBtnGrid" style="margin-top:14px">
          <button class="syncBtn" id="exportShareBtn" type="button">
            <span class="syncBtnEm">📤</span><span>Share via system…</span>
          </button>
        </div>
      </div>

      <button id="syncCloseBtn" class="linkBtn" style="margin-top:18px">Close</button>
    </div>
  `);

  // ─ wire-up ─
  const checkUpcoming  = document.getElementById('incUpcoming');
  const checkCompleted = document.getElementById('incCompleted');
  checkUpcoming.onchange  = () => { _includeUpcoming  = checkUpcoming.checked; };
  checkCompleted.onchange = () => { _includeCompleted = checkCompleted.checked; };

  document.querySelectorAll('.syncKidPill input').forEach(cb => {
    cb.onchange = () => {
      _filterKidIds = Array.from(document.querySelectorAll('.syncKidPill input:checked'))
        .map(el => el.dataset.kid);
      // empty = all
      if (_filterKidIds.length === state.kids.length) _filterKidIds = [];
    };
  });

  // tabs
  document.querySelectorAll('.syncTab').forEach(t => {
    t.onclick = () => {
      document.querySelectorAll('.syncTab').forEach(x => x.classList.toggle('active', x === t));
      document.querySelectorAll('.syncPanel').forEach(p => p.hidden = p.dataset.panel !== t.dataset.tab);
    };
  });

  // copy
  document.getElementById('subUrlCopy')?.addEventListener('click', async () => {
    const inp = document.getElementById('subUrlInput');
    try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); }
    const b = document.getElementById('subUrlCopy');
    b.textContent = '✓ Copied'; setTimeout(() => b.textContent = 'Copy', 1500);
  });

  // .ics download
  document.getElementById('downloadIcsBtn')?.addEventListener('click', () => {
    const events = eventsFromState(state, {
      kidIds:           _filterKidIds,
      includeCompleted: _includeCompleted,
      includeUpcoming:  _includeUpcoming,
    });
    const ics = buildICS(events, { calendarName: 'Family Chores' });
    downloadICS(`family-chores-${new Date().toISOString().slice(0,10)}.ics`, ics);
  });

  // Native share (iOS/Android)
  document.getElementById('exportShareBtn')?.addEventListener('click', async () => {
    const events = eventsFromState(state, {
      kidIds:           _filterKidIds,
      includeCompleted: _includeCompleted,
      includeUpcoming:  _includeUpcoming,
    });
    const ics = buildICS(events, { calendarName: 'Family Chores' });
    if (navigator.share && navigator.canShare?.({ files: [new File([ics], 'family-chores.ics', { type: 'text/calendar' })] })) {
      const file = new File([ics], 'family-chores.ics', { type: 'text/calendar' });
      try { await navigator.share({ title: 'Family Chores', files: [file] }); } catch {}
    } else {
      downloadICS('family-chores.ics', ics);
    }
  });

  document.getElementById('syncCloseBtn').onclick = close;
}
