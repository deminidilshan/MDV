// themes.js — Theme management
const THEMES = [
  { id: 'default', name: 'Midnight', colors: ['#0d1117', '#161b22', '#58a6ff'] },
  { id: 'nord', name: 'Nord', colors: ['#2e3440', '#3b4252', '#88c0d0'] },
  { id: 'dracula', name: 'Dracula', colors: ['#282a36', '#44475a', '#ff79c6'] },
  { id: 'solarized', name: 'Solarized', colors: ['#002b36', '#073642', '#268bd2'] },
  { id: 'rose', name: 'Rosé Pine', colors: ['#191724', '#26233a', '#c4a7e7'] },
  { id: 'monokai', name: 'Monokai', colors: ['#272822', '#3e3d32', '#f92672'] },
];

const STORAGE_KEY = 'mdv-settings';

let settings = {
  theme: 'default',
  mode: 'dark',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
  lineHeight: 1.6,
  lineNumbers: true,
  wordWrap: true,
  autoSave: false,
};

export function getThemes() { return THEMES; }
export function getSettings() { return { ...settings }; }

export function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) settings = { ...settings, ...JSON.parse(saved) };
  } catch (e) { /* ignore */ }
  applySettings();
  return settings;
}

export function updateSetting(key, value) {
  settings[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  applySettings();
}

function applySettings() {
  const root = document.documentElement;
  root.setAttribute('data-mode', settings.mode);
  if (settings.theme === 'default') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', settings.theme);
  }
  root.style.setProperty('--font-mono', settings.fontFamily);
  root.style.setProperty('--font-size', settings.fontSize + 'px');
  root.style.setProperty('--line-height', settings.lineHeight);
}

export function toggleMode() {
  settings.mode = settings.mode === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  applySettings();
  return settings.mode;
}
