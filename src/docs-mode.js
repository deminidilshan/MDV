// docs-mode.js — Google Docs / MS Word-like rich text editor
// Renders markdown as rich text, edits as WYSIWYG, saves back to markdown
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import TurndownService from 'turndown';

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
      return hljs.highlightAuto(code).value;
    },
  })
);
marked.setOptions({ gfm: true, breaks: true });

const turndown = new TurndownService({
  headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-',
});

// Toolbar actions
const TOOLBAR = [
  { group: 'history', items: [
    { cmd: 'undo', icon: '↩', title: 'Undo (⌘Z)' },
    { cmd: 'redo', icon: '↪', title: 'Redo (⌘⇧Z)' },
  ]},
  { group: 'heading', items: [
    { type: 'select', id: 'doc-heading', title: 'Paragraph style', options: [
      { value: 'p', label: 'Normal text' },
      { value: 'h1', label: 'Heading 1' },
      { value: 'h2', label: 'Heading 2' },
      { value: 'h3', label: 'Heading 3' },
      { value: 'h4', label: 'Heading 4' },
    ]},
  ]},
  { group: 'font', items: [
    { type: 'select', id: 'doc-fontsize', title: 'Font size', options: [
      { value: '1', label: '10' }, { value: '2', label: '12' },
      { value: '3', label: '14' }, { value: '4', label: '16' },
      { value: '5', label: '20' }, { value: '6', label: '24' },
      { value: '7', label: '36' },
    ]},
  ]},
  { group: 'format', items: [
    { cmd: 'bold', icon: 'B', title: 'Bold (⌘B)', style: 'font-weight:700' },
    { cmd: 'italic', icon: 'I', title: 'Italic (⌘I)', style: 'font-style:italic' },
    { cmd: 'underline', icon: 'U', title: 'Underline (⌘U)', style: 'text-decoration:underline' },
    { cmd: 'strikeThrough', icon: 'S', title: 'Strikethrough', style: 'text-decoration:line-through' },
  ]},
  { group: 'color', items: [
    { type: 'color', id: 'doc-textcolor', cmd: 'foreColor', icon: 'A', title: 'Text color' },
    { type: 'color', id: 'doc-highlight', cmd: 'hiliteColor', icon: '🖍', title: 'Highlight' },
  ]},
  { group: 'align', items: [
    { cmd: 'justifyLeft', icon: '≡', title: 'Align left' },
    { cmd: 'justifyCenter', icon: '≡', title: 'Align center', style: 'text-align:center' },
    { cmd: 'justifyRight', icon: '≡', title: 'Align right', style: 'text-align:right' },
  ]},
  { group: 'list', items: [
    { cmd: 'insertUnorderedList', icon: '•≡', title: 'Bullet list' },
    { cmd: 'insertOrderedList', icon: '1≡', title: 'Numbered list' },
  ]},
  { group: 'insert', items: [
    { action: 'link', icon: '🔗', title: 'Insert link' },
    { action: 'code', icon: '<>', title: 'Insert code block' },
    { action: 'quote', icon: '❝', title: 'Insert blockquote' },
    { action: 'hr', icon: '—', title: 'Horizontal rule' },
    { action: 'table', icon: '⊞', title: 'Insert table' },
  ]},
];

let editorEl = null;
let toolbarEl = null;
let changeCallback = null;
let debounceTimer = null;

export function initDocsMode(container) {
  // Create toolbar
  toolbarEl = document.createElement('div');
  toolbarEl.className = 'docs-toolbar';
  buildToolbar(toolbarEl);

  // Create editor area
  editorEl = document.createElement('div');
  editorEl.className = 'docs-editor';
  editorEl.contentEditable = 'true';
  editorEl.spellcheck = true;

  container.appendChild(toolbarEl);
  container.appendChild(editorEl);

  // Listen for edits
  editorEl.addEventListener('input', onEdit);
  editorEl.addEventListener('paste', onPaste);

  // Track selection for active states
  document.addEventListener('selectionchange', updateActiveStates);
}

function buildToolbar(el) {
  TOOLBAR.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'docs-tb-group';

    group.items.forEach(item => {
      if (item.type === 'select') {
        const sel = document.createElement('select');
        sel.id = item.id;
        sel.className = 'docs-tb-select';
        sel.title = item.title;
        item.options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          sel.appendChild(o);
        });
        sel.addEventListener('change', () => handleSelect(item.id, sel.value));
        groupEl.appendChild(sel);
      } else if (item.type === 'color') {
        const wrap = document.createElement('label');
        wrap.className = 'docs-tb-color';
        wrap.title = item.title;
        wrap.innerHTML = `<span>${item.icon}</span>`;
        const input = document.createElement('input');
        input.type = 'color';
        input.value = item.id === 'doc-textcolor' ? '#ffffff' : '#ffff00';
        input.addEventListener('input', () => {
          document.execCommand(item.cmd, false, input.value);
          editorEl.focus();
        });
        wrap.appendChild(input);
        groupEl.appendChild(wrap);
      } else {
        const btn = document.createElement('button');
        btn.className = 'docs-tb-btn';
        btn.title = item.title;
        btn.innerHTML = `<span style="${item.style || ''}">${item.icon}</span>`;
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          if (item.cmd) {
            document.execCommand(item.cmd, false, null);
          } else if (item.action) {
            handleAction(item.action);
          }
        });
        groupEl.appendChild(btn);
      }
    });

    el.appendChild(groupEl);
  });
}

function handleSelect(id, value) {
  if (id === 'doc-heading') {
    document.execCommand('formatBlock', false, value === 'p' ? 'p' : value);
  } else if (id === 'doc-fontsize') {
    document.execCommand('fontSize', false, value);
  }
  editorEl.focus();
}

function handleAction(action) {
  switch (action) {
    case 'link': {
      const url = prompt('Enter URL:');
      if (url) document.execCommand('createLink', false, url);
      break;
    }
    case 'code': {
      document.execCommand('insertHTML', false,
        '<pre style="background:var(--bg-secondary);padding:12px;border-radius:8px;font-family:monospace;"><code>code here</code></pre><p><br></p>');
      break;
    }
    case 'quote': {
      document.execCommand('insertHTML', false,
        '<blockquote style="border-left:3px solid var(--accent);padding:8px 16px;margin:8px 0;color:var(--text-secondary);">Quote text</blockquote><p><br></p>');
      break;
    }
    case 'hr': {
      document.execCommand('insertHorizontalRule', false, null);
      break;
    }
    case 'table': {
      document.execCommand('insertHTML', false,
        '<table><thead><tr><th>Header 1</th><th>Header 2</th><th>Header 3</th></tr></thead><tbody><tr><td>Cell 1</td><td>Cell 2</td><td>Cell 3</td></tr><tr><td>Cell 4</td><td>Cell 5</td><td>Cell 6</td></tr></tbody></table><p><br></p>');
      break;
    }
  }
  editorEl.focus();
}

function updateActiveStates() {
  if (!toolbarEl) return;
  // Could update bold/italic/etc button states here
}

function onEdit() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (changeCallback) changeCallback(getMarkdown());
  }, 200);
}

function onPaste(e) {
  e.preventDefault();
  const html = e.clipboardData.getData('text/html');
  const text = e.clipboardData.getData('text/plain');
  if (html) {
    document.execCommand('insertHTML', false, html);
  } else {
    document.execCommand('insertText', false, text);
  }
}

export function setDocsContent(mdText) {
  if (!editorEl) return;
  editorEl.innerHTML = marked.parse(mdText || '');
}

export function getMarkdown() {
  if (!editorEl) return '';
  return turndown.turndown(editorEl.innerHTML);
}

export function onDocsChange(fn) {
  changeCallback = fn;
}

export function showDocsMode(container) {
  container.style.display = 'flex';
}

export function hideDocsMode(container) {
  container.style.display = 'none';
}
