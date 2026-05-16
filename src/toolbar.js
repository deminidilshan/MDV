// toolbar.js — Floating formatting toolbar
// Appears near cursor on text selection, can be pinned to top

let toolbarEl = null;
let isPinned = false;
let isVisible = false;
let wrapFn = null; // injected wrapSelection function
let insertFn = null; // injected insertText function

const ACTIONS = [
  { id: 'bold', icon: 'B', title: 'Bold (⌘B)', before: '**', after: '**', style: 'font-weight:700' },
  { id: 'italic', icon: 'I', title: 'Italic (⌘I)', before: '*', after: '*', style: 'font-style:italic' },
  { id: 'strike', icon: 'S', title: 'Strikethrough', before: '~~', after: '~~', style: 'text-decoration:line-through' },
  { id: 'code', icon: '<>', title: 'Inline Code', before: '`', after: '`', style: 'font-family:monospace;font-size:11px' },
  { id: 'sep1', sep: true },
  { id: 'h1', icon: 'H1', title: 'Heading 1', prefix: '# ' },
  { id: 'h2', icon: 'H2', title: 'Heading 2', prefix: '## ' },
  { id: 'h3', icon: 'H3', title: 'Heading 3', prefix: '### ' },
  { id: 'sep2', sep: true },
  { id: 'link', icon: '🔗', title: 'Link (⌘K)', before: '[', after: '](url)' },
  { id: 'quote', icon: '❝', title: 'Blockquote', prefix: '> ' },
  { id: 'ul', icon: '•', title: 'Bullet List', prefix: '- ' },
  { id: 'ol', icon: '1.', title: 'Numbered List', prefix: '1. ' },
  { id: 'codeblock', icon: '{ }', title: 'Code Block', before: '\n```\n', after: '\n```\n' },
  { id: 'sep3', sep: true },
  { id: 'pin', icon: '📌', title: 'Pin toolbar', toggle: true },
  { id: 'close', icon: '✕', title: 'Close toolbar' },
];

export function initToolbar(opts) {
  wrapFn = opts.wrapSelection;
  insertFn = opts.insertAtLineStart;

  toolbarEl = document.createElement('div');
  toolbarEl.id = 'format-toolbar';
  toolbarEl.className = 'format-toolbar';

  ACTIONS.forEach(action => {
    if (action.sep) {
      const sep = document.createElement('div');
      sep.className = 'tb-sep';
      toolbarEl.appendChild(sep);
      return;
    }

    const btn = document.createElement('button');
    btn.className = 'tb-btn';
    btn.title = action.title;
    btn.innerHTML = `<span style="${action.style || ''}">${action.icon}</span>`;
    btn.dataset.action = action.id;

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent blur
      e.stopPropagation();
      handleAction(action);
    });

    toolbarEl.appendChild(btn);
  });

  document.body.appendChild(toolbarEl);
}

function handleAction(action) {
  if (action.id === 'pin') {
    isPinned = !isPinned;
    toolbarEl.classList.toggle('pinned', isPinned);
    const pinBtn = toolbarEl.querySelector('[data-action="pin"]');
    if (pinBtn) pinBtn.classList.toggle('active', isPinned);
    return;
  }

  if (action.id === 'close') {
    hideToolbar();
    return;
  }

  if (action.before !== undefined) {
    wrapFn?.(action.before, action.after);
  } else if (action.prefix) {
    insertFn?.(action.prefix);
  }
}

export function showToolbar(x, y) {
  if (!toolbarEl) return;
  isVisible = true;
  toolbarEl.classList.add('visible');

  if (!isPinned) {
    // Position near cursor, above the selection
    const tbRect = toolbarEl.getBoundingClientRect();
    const maxX = window.innerWidth - tbRect.width - 8;
    const maxY = window.innerHeight - tbRect.height - 8;
    toolbarEl.style.left = Math.max(8, Math.min(x - tbRect.width / 2, maxX)) + 'px';
    toolbarEl.style.top = Math.max(8, Math.min(y - tbRect.height - 8, maxY)) + 'px';
  }
}

export function hideToolbar() {
  if (!toolbarEl || isPinned) return;
  isVisible = false;
  toolbarEl.classList.remove('visible');
}

export function updateToolbarPosition(x, y) {
  if (!toolbarEl || isPinned || !isVisible) return;
  const tbRect = toolbarEl.getBoundingClientRect();
  const maxX = window.innerWidth - tbRect.width - 8;
  toolbarEl.style.left = Math.max(8, Math.min(x - tbRect.width / 2, maxX)) + 'px';
  toolbarEl.style.top = Math.max(8, y - tbRect.height - 8) + 'px';
}

export function isToolbarPinned() { return isPinned; }
