// main.js — App orchestrator (v4 with Docs Mode + CSV Viewer)
import './styles.css';
import './pro-preview.css';
import './toolbar.css';
import './docs-mode.css';
import './csv-viewer.css';
import 'highlight.js/styles/github-dark.min.css';
import { initEditor, setContent, getContent, onChange, onCursor, getWordCount, focus, wrapSelection, insertAtLineStart, onSelectionChange } from './editor.js';
import { initPreview, renderMarkdown, renderImmediate, setEditable, onEditableChange } from './preview.js';
import { loadSettings, getSettings, updateSetting, toggleMode, getThemes } from './themes.js';
import { newFile, openFile, openFilePath, saveFile, saveFileAs, markDirty, onFileChange } from './fileManager.js';
import { enhanceProPreview, cleanupProPreview } from './pro-preview.js';
import { initToolbar, showToolbar, hideToolbar } from './toolbar.js';
import { initDocsMode, setDocsContent, getMarkdown as getDocsMarkdown, onDocsChange } from './docs-mode.js';
import { initCsvViewer, openCsv, closeCsv, isCsvOpen } from './csv-viewer.js';
import { getCurrentWindow } from '@tauri-apps/api/window';

const listen = window.__TAURI__?.event?.listen;

// ===== State =====
let currentView = 'source'; // source | preview | split | pro
let simpleMode = true; // true = markdown editor, false = docs mode
let syncingFromPreview = false;
let syncingFromDocs = false;

// ===== DOM =====
const editorPane = document.getElementById('editor-pane');
const previewPane = document.getElementById('preview-pane');
const previewContent = document.getElementById('preview-content');
const divider = document.getElementById('divider');
const docsPane = document.getElementById('docs-mode-pane');
const csvViewer = document.getElementById('csv-viewer');
const fileNameEl = document.getElementById('file-name');
const unsavedDot = document.getElementById('unsaved-dot');
const statCursor = document.getElementById('stat-cursor');
const statWords = document.getElementById('stat-words');
const statReadtime = document.getElementById('stat-readtime');
const statFiletype = document.getElementById('stat-filetype');
const viewToggle = document.getElementById('view-toggle');
const btnMode = document.getElementById('btn-mode');
const btnSettings = document.getElementById('btn-settings');
const settingsPanel = document.getElementById('settings-panel');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const iconMoon = document.getElementById('icon-moon');
const iconSun = document.getElementById('icon-sun');
const dropzone = document.getElementById('dropzone');
const workspace = document.getElementById('workspace');

// ===== Init =====
const settings = loadSettings();
simpleMode = settings.simpleMode !== false;
initEditor(editorPane, { lineNumbers: settings.lineNumbers, wordWrap: settings.wordWrap });
initPreview(previewContent);
initDocsMode(docsPane);
initCsvViewer(csvViewer);
initToolbar({ wrapSelection, insertAtLineStart });
updateModeIcon(settings.mode);

// Toolbar on text selection
onSelectionChange((info) => {
  if (simpleMode && info.hasSelection) showToolbar(info.x, info.y);
  else hideToolbar();
});

// ===== Editor events =====
onChange((text) => {
  if (syncingFromPreview || syncingFromDocs) return;
  markDirty();
  if (currentView !== 'source') {
    renderMarkdown(text);
    if (currentView === 'pro') setTimeout(() => enhanceProPreview(previewContent), 100);
  }
  updateStats();
});

onCursor((line, col) => { statCursor.textContent = `Ln ${line}, Col ${col}`; });

// Editable preview → sync to editor
onEditableChange((md) => {
  syncingFromPreview = true;
  setContent(md); markDirty(); updateStats();
  setTimeout(() => { syncingFromPreview = false; }, 50);
});

// Docs mode → sync to editor
onDocsChange((md) => {
  syncingFromDocs = true;
  setContent(md); markDirty(); updateStats();
  setTimeout(() => { syncingFromDocs = false; }, 50);
});

onFileChange(({ path, dirty }) => {
  const name = path ? path.split('/').pop() : 'Untitled';
  fileNameEl.textContent = name; fileNameEl.title = path || 'Untitled';
  unsavedDot.classList.toggle('hidden', !dirty);
  document.title = `${dirty ? '● ' : ''}${name} — MDV`;
});

// ===== Mode switching (Simple ↔ Docs) =====
function applySimpleMode(isSimple) {
  simpleMode = isSimple;

  if (isSimple) {
    // Show markdown editor views
    docsPane.style.display = 'none';
    viewToggle.style.display = 'flex';
    setView(currentView);
  } else {
    // Show Docs mode — hide all markdown views
    editorPane.classList.add('hidden');
    previewPane.classList.add('hidden');
    divider.classList.add('hidden');
    viewToggle.style.display = 'none';
    docsPane.style.display = 'flex';
    setDocsContent(getContent());
    hideToolbar();
  }
}

// ===== View switching (simple mode only) =====
function setView(mode) {
  if (!simpleMode) return;
  currentView = mode;
  const showEditor = mode === 'source' || mode === 'split';
  const showPreview = mode !== 'source';

  editorPane.classList.toggle('hidden', !showEditor);
  previewPane.classList.toggle('hidden', !showPreview);
  divider.classList.toggle('hidden', mode !== 'split');
  docsPane.style.display = 'none';

  viewToggle.querySelectorAll('.vt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === mode);
  });

  setEditable(mode === 'preview');

  if (showPreview) {
    renderImmediate(getContent());
    if (mode === 'pro') setTimeout(() => enhanceProPreview(previewContent), 50);
    else cleanupProPreview(previewContent);
  }
  if (showEditor) focus();
}

viewToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.vt-btn');
  if (btn) setView(btn.dataset.view);
});

// ===== Dark/Light toggle =====
btnMode.addEventListener('click', () => { const m = toggleMode(); updateModeIcon(m); });
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
  setTimeout(() => { settingsPanel.classList.add('hidden'); settingsOverlay.classList.add('hidden'); }, 300);
}
btnSettings.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', closeSettings);

function populateSettings() {
  const s = getSettings();

  // Simple Mode toggle
  const smToggle = document.getElementById('set-simplemode');
  smToggle.checked = s.simpleMode !== false;
  smToggle.onchange = (e) => {
    updateSetting('simpleMode', e.target.checked);
    applySimpleMode(e.target.checked);
    // When switching back to simple, sync docs content
    if (e.target.checked) {
      const md = getDocsMarkdown();
      if (md.trim()) setContent(md);
    }
  };

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

  document.getElementById('set-font').value = s.fontFamily;
  document.getElementById('set-font').onchange = (e) => updateSetting('fontFamily', e.target.value);

  const fsEl = document.getElementById('set-fontsize');
  const fsVal = document.getElementById('font-size-val');
  fsEl.value = s.fontSize; fsVal.textContent = s.fontSize + 'px';
  fsEl.oninput = (e) => { fsVal.textContent = e.target.value + 'px'; updateSetting('fontSize', parseInt(e.target.value)); };

  const lhEl = document.getElementById('set-lineheight');
  const lhVal = document.getElementById('line-height-val');
  lhEl.value = s.lineHeight; lhVal.textContent = s.lineHeight;
  lhEl.oninput = (e) => { lhVal.textContent = e.target.value; updateSetting('lineHeight', parseFloat(e.target.value)); };

  document.getElementById('set-linenums').checked = s.lineNumbers;
  document.getElementById('set-wordwrap').checked = s.wordWrap;
  document.getElementById('set-autosave').checked = s.autoSave;
  document.getElementById('set-propreview').checked = s.proPreview !== false;

  document.getElementById('set-linenums').onchange = (e) => updateSetting('lineNumbers', e.target.checked);
  document.getElementById('set-wordwrap').onchange = (e) => updateSetting('wordWrap', e.target.checked);
  document.getElementById('set-autosave').onchange = (e) => updateSetting('autoSave', e.target.checked);
  document.getElementById('set-propreview').onchange = (e) => updateSetting('proPreview', e.target.checked);
}

function updateStats() {
  const count = getWordCount();
  statWords.textContent = `${count} word${count !== 1 ? 's' : ''}`;
  if (statReadtime) {
    const mins = Math.max(1, Math.ceil(count / 200));
    statReadtime.textContent = `${mins} min read`;
  }
}

// ===== Split divider drag =====
let isDragging = false;
divider.addEventListener('mousedown', (e) => {
  isDragging = true; divider.classList.add('dragging');
  document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const rect = workspace.getBoundingClientRect();
  const clamped = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
  editorPane.style.flex = `0 0 ${clamped}%`; previewPane.style.flex = `0 0 ${100 - clamped}%`;
});
document.addEventListener('mouseup', () => {
  if (isDragging) { isDragging = false; divider.classList.remove('dragging'); document.body.style.cursor = ''; document.body.style.userSelect = ''; }
});

// ===== Drag & Drop (supports .md AND .csv) =====
let dragCounter = 0;
getCurrentWindow().onDragDropEvent(async (event) => {
  const type = event.payload.type;
  if (type === 'enter') {
    dragCounter++;
    if (dropzone) dropzone.classList.add('active');
  } else if (type === 'leave' || type === 'drop') {
    dragCounter = 0;
    if (dropzone) dropzone.classList.remove('active');
    
    if (type === 'drop') {
      const paths = event.payload.paths;
      if (!paths || !paths.length) return;
      const path = paths[0];
      
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      try {
        const text = await readTextFile(path);
        const name = path.split('/').pop() || path.split('\\').pop() || 'Untitled';
        
        if (path.match(/\.csv$/i)) {
          openCsv(text, name);
          statFiletype.textContent = 'CSV';
          fileNameEl.textContent = name;
          document.title = `${name} — MDV`;
          return;
        }

        if (path.match(/\.(md|markdown|mdown|mkd|txt)$/i)) {
          if (isCsvOpen()) closeCsv();
          setContent(text); markDirty();
          if (!simpleMode) setDocsContent(text);
          fileNameEl.textContent = name;
          statFiletype.textContent = 'Markdown';
          document.title = `${name} — MDV`;
        }
      } catch (e) {
        console.error('Drag & Drop Error:', e);
      }
    }
  }
});

// ===== Keyboard shortcuts =====
document.addEventListener('keydown', (e) => {
  const isMod = e.metaKey || e.ctrlKey;
  if (e.key === 'Escape') {
    if (isCsvOpen()) { closeCsv(); statFiletype.textContent = 'Markdown'; return; }
    if (!settingsPanel.classList.contains('hidden')) { closeSettings(); return; }
  }
  if (simpleMode) {
    if (isMod && e.key === 'b') { e.preventDefault(); wrapSelection('**', '**'); }
    if (isMod && e.key === 'i') { e.preventDefault(); wrapSelection('*', '*'); }
    if (isMod && e.key === 'k') { e.preventDefault(); wrapSelection('[', '](url)'); }
    if (isMod && e.shiftKey && e.key === 'K') { e.preventDefault(); wrapSelection('\n```\n', '\n```\n'); }
  }
});

// ===== Scroll sync =====
let syncScrolling = false;
function setupScrollSync() {
  const scroller = editorPane.querySelector('.cm-scroller');
  if (!scroller) return;
  scroller.addEventListener('scroll', () => {
    if (syncScrolling || currentView !== 'split') return;
    syncScrolling = true;
    const pct = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight || 1);
    previewPane.scrollTop = pct * (previewPane.scrollHeight - previewPane.clientHeight);
    requestAnimationFrame(() => { syncScrolling = false; });
  });
  previewPane.addEventListener('scroll', () => {
    if (syncScrolling || currentView !== 'split') return;
    syncScrolling = true;
    const pct = previewPane.scrollTop / (previewPane.scrollHeight - previewPane.clientHeight || 1);
    if (scroller) scroller.scrollTop = pct * (scroller.scrollHeight - scroller.clientHeight);
    requestAnimationFrame(() => { syncScrolling = false; });
  });
}
setTimeout(setupScrollSync, 500);

// ===== Menu events from Tauri =====
async function handleMenuEvent(eventId) {
  switch (eventId) {
    case 'new': await newFile(getContent, setContent); break;
    case 'open': {
      const res = await openFile();
      if (res) handleOpenedFile(res.path, res.content);
      break;
    }
    case 'save': await saveFile(simpleMode ? getContent : getDocsMarkdown); break;
    case 'save-as': await saveFileAs(simpleMode ? getContent : getDocsMarkdown); break;
    case 'view-source': setView('source'); break;
    case 'view-preview': setView('preview'); break;
    case 'view-split': setView('split'); break;
    case 'toggle-mode': const m = toggleMode(); updateModeIcon(m); break;
    case 'settings': openSettings(); break;
  }
}

function handleOpenedFile(path, text) {
  const name = path.split('/').pop() || path.split('\\').pop() || 'Untitled';
  if (path.match(/\.csv$/i)) {
    openCsv(text, name);
    statFiletype.textContent = 'CSV';
  } else {
    if (isCsvOpen()) closeCsv();
    setContent(text); 
    if (!simpleMode) setDocsContent(text);
    statFiletype.textContent = 'Markdown';
  }
  document.title = `${name} — MDV`;
}

if (listen) {
  listen('menu-event', (event) => handleMenuEvent(event.payload));
  listen('open-file', async (event) => {
    const res = await openFilePath(event.payload);
    if (res) handleOpenedFile(res.path, res.content);
  });
}

// ===== Init =====
applySimpleMode(simpleMode);
if (simpleMode) setView('source');
updateStats();
document.title = 'MDV';
