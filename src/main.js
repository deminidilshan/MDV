// main.js — App orchestrator
import './styles.css';
import 'highlight.js/styles/github-dark.min.css';
import { initEditor, setContent, getContent, onChange, onCursor, getWordCount, focus } from './editor.js';
import { initPreview, renderMarkdown, renderImmediate } from './preview.js';
import { loadSettings, getSettings, updateSetting, toggleMode, getThemes } from './themes.js';
import { newFile, openFile, openFilePath, saveFile, saveFileAs, markDirty, onFileChange } from './fileManager.js';

const listen = window.__TAURI__?.event?.listen;

// ===== State =====
let currentView = 'source'; // source | preview | split

// ===== DOM =====
const editorPane = document.getElementById('editor-pane');
const previewPane = document.getElementById('preview-pane');
const previewContent = document.getElementById('preview-content');
const divider = document.getElementById('divider');
const fileNameEl = document.getElementById('file-name');
const unsavedDot = document.getElementById('unsaved-dot');
const statCursor = document.getElementById('stat-cursor');
const statWords = document.getElementById('stat-words');
const viewToggle = document.getElementById('view-toggle');
const btnMode = document.getElementById('btn-mode');
const btnSettings = document.getElementById('btn-settings');
const settingsPanel = document.getElementById('settings-panel');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const iconMoon = document.getElementById('icon-moon');
const iconSun = document.getElementById('icon-sun');

// ===== Init =====
const settings = loadSettings();
initEditor(editorPane, { lineNumbers: settings.lineNumbers, wordWrap: settings.wordWrap });
initPreview(previewContent);
updateModeIcon(settings.mode);

// ===== Editor events =====
onChange((text) => {
  markDirty();
  renderMarkdown(text);
  updateWordCount();
});

onCursor((line, col) => {
  statCursor.textContent = `Ln ${line}, Col ${col}`;
});

onFileChange(({ path, dirty }) => {
  const name = path ? path.split('/').pop() : 'Untitled';
  fileNameEl.textContent = name;
  fileNameEl.title = path || 'Untitled';
  unsavedDot.classList.toggle('hidden', !dirty);
  document.title = `${dirty ? '● ' : ''}${name} — MDV`;
});

// ===== View switching =====
function setView(mode) {
  currentView = mode;
  // Toggle panes
  editorPane.classList.toggle('hidden', mode === 'preview');
  previewPane.classList.toggle('hidden', mode === 'source');
  divider.classList.toggle('hidden', mode !== 'split');

  // Toggle active button
  viewToggle.querySelectorAll('.vt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === mode);
  });

  // Re-render preview when showing
  if (mode !== 'source') {
    renderImmediate(getContent());
  }
  if (mode !== 'preview') {
    focus();
  }
}

viewToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.vt-btn');
  if (btn) setView(btn.dataset.view);
});

// ===== Dark/Light toggle =====
btnMode.addEventListener('click', () => {
  const mode = toggleMode();
  updateModeIcon(mode);
});

function updateModeIcon(mode) {
  iconMoon.classList.toggle('hidden', mode === 'light');
  iconSun.classList.toggle('hidden', mode === 'dark');
}

// ===== Settings panel =====
function openSettings() {
  settingsOverlay.classList.remove('hidden');
  settingsPanel.classList.remove('hidden');
  requestAnimationFrame(() => settingsPanel.classList.add('open'));
  populateSettings();
}

function closeSettings() {
  settingsPanel.classList.remove('open');
  setTimeout(() => {
    settingsPanel.classList.add('hidden');
    settingsOverlay.classList.add('hidden');
  }, 300);
}

btnSettings.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', closeSettings);

function populateSettings() {
  const s = getSettings();
  // Theme grid
  const grid = document.getElementById('theme-grid');
  grid.innerHTML = '';
  getThemes().forEach(t => {
    const el = document.createElement('div');
    el.className = `theme-swatch${t.id === s.theme ? ' active' : ''}`;
    el.style.background = `linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 60%, ${t.colors[2]} 100%)`;
    el.innerHTML = `<span class="theme-swatch-name">${t.name}</span>`;
    el.addEventListener('click', () => {
      updateSetting('theme', t.id);
      grid.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
      el.classList.add('active');
    });
    grid.appendChild(el);
  });

  // Font
  document.getElementById('set-font').value = s.fontFamily;
  document.getElementById('set-font').addEventListener('change', (e) => updateSetting('fontFamily', e.target.value));

  // Font size
  const fsEl = document.getElementById('set-fontsize');
  const fsVal = document.getElementById('font-size-val');
  fsEl.value = s.fontSize;
  fsVal.textContent = s.fontSize + 'px';
  fsEl.addEventListener('input', (e) => {
    fsVal.textContent = e.target.value + 'px';
    updateSetting('fontSize', parseInt(e.target.value));
  });

  // Line height
  const lhEl = document.getElementById('set-lineheight');
  const lhVal = document.getElementById('line-height-val');
  lhEl.value = s.lineHeight;
  lhVal.textContent = s.lineHeight;
  lhEl.addEventListener('input', (e) => {
    lhVal.textContent = e.target.value;
    updateSetting('lineHeight', parseFloat(e.target.value));
  });

  // Toggles
  document.getElementById('set-linenums').checked = s.lineNumbers;
  document.getElementById('set-wordwrap').checked = s.wordWrap;
  document.getElementById('set-autosave').checked = s.autoSave;
  document.getElementById('set-linenums').addEventListener('change', (e) => updateSetting('lineNumbers', e.target.checked));
  document.getElementById('set-wordwrap').addEventListener('change', (e) => updateSetting('wordWrap', e.target.checked));
  document.getElementById('set-autosave').addEventListener('change', (e) => updateSetting('autoSave', e.target.checked));
}

function updateWordCount() {
  const count = getWordCount();
  statWords.textContent = `${count} word${count !== 1 ? 's' : ''}`;
}

// ===== Split divider drag =====
let isDragging = false;
divider.addEventListener('mousedown', (e) => {
  isDragging = true;
  divider.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const workspace = document.getElementById('workspace');
  const rect = workspace.getBoundingClientRect();
  const ratio = ((e.clientX - rect.left) / rect.width) * 100;
  const clamped = Math.max(20, Math.min(80, ratio));
  editorPane.style.flex = `0 0 ${clamped}%`;
  previewPane.style.flex = `0 0 ${100 - clamped}%`;
});
document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    divider.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// ===== Menu events from Tauri =====
async function handleMenuEvent(eventId) {
  switch (eventId) {
    case 'new': await newFile(getContent, setContent); break;
    case 'open': await openFile(setContent); break;
    case 'save': await saveFile(getContent); break;
    case 'save-as': await saveFileAs(getContent); break;
    case 'view-source': setView('source'); break;
    case 'view-preview': setView('preview'); break;
    case 'view-split': setView('split'); break;
    case 'toggle-mode':
      const m = toggleMode();
      updateModeIcon(m);
      break;
    case 'settings': openSettings(); break;
  }
}

// Listen for Tauri menu events
if (listen) {
  listen('menu-event', (event) => handleMenuEvent(event.payload));
  listen('open-file', (event) => openFilePath(event.payload, setContent));
}

// ===== Keyboard shortcuts (fallback for non-menu shortcuts) =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!settingsPanel.classList.contains('hidden')) closeSettings();
  }
});

// ===== Initial state =====
setView('source');
updateWordCount();
document.title = 'MDV';
