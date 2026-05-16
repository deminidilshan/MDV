// fileManager.js — Tauri file I/O
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';

let currentFilePath = null;
let isDirty = false;
const listeners = new Set();

export function onFileChange(fn) { listeners.add(fn); }
function notify() { listeners.forEach(fn => fn({ path: currentFilePath, dirty: isDirty })); }

export function getCurrentPath() { return currentFilePath; }
export function getIsDirty() { return isDirty; }

export function markDirty() {
  if (!isDirty) { isDirty = true; notify(); }
}
export function markClean() {
  if (isDirty) { isDirty = false; notify(); }
}

export async function newFile(getContent, setContent) {
  if (isDirty && !confirm('Discard unsaved changes?')) return false;
  setContent('');
  currentFilePath = null;
  isDirty = false;
  notify();
  return true;
}

export async function openFile(setContent) {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'] }],
    });
    if (!selected) return false;
    const path = typeof selected === 'string' ? selected : selected.path;
    if (!path) return false;
    const content = await readTextFile(path);
    setContent(content);
    currentFilePath = path;
    isDirty = false;
    notify();
    return true;
  } catch (e) {
    console.error('Open file error:', e);
    return false;
  }
}

export async function openFilePath(path, setContent) {
  try {
    const content = await readTextFile(path);
    setContent(content);
    currentFilePath = path;
    isDirty = false;
    notify();
    return true;
  } catch (e) {
    console.error('Open file path error:', e);
    return false;
  }
}

export async function saveFile(getContent) {
  if (!currentFilePath) return saveFileAs(getContent);
  try {
    await writeTextFile(currentFilePath, getContent());
    isDirty = false;
    notify();
    return true;
  } catch (e) {
    console.error('Save error:', e);
    return false;
  }
}

export async function saveFileAs(getContent) {
  try {
    const path = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: currentFilePath || 'untitled.md',
    });
    if (!path) return false;
    await writeTextFile(path, getContent());
    currentFilePath = path;
    isDirty = false;
    notify();
    return true;
  } catch (e) {
    console.error('Save As error:', e);
    return false;
  }
}
