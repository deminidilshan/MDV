// preview.js — Markdown rendering with editable WYSIWYG support
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import TurndownService from 'turndown';

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  })
);

marked.setOptions({ gfm: true, breaks: true });

// HTML → Markdown converter
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

let previewEl = null;
let debounceTimer = null;
let editCallback = null;
let isEditable = false;

export function initPreview(el) {
  previewEl = el;
}

export function renderMarkdown(mdText) {
  if (!previewEl) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    previewEl.innerHTML = marked.parse(mdText || '');
  }, 80);
}

export function renderImmediate(mdText) {
  if (!previewEl) return;
  previewEl.innerHTML = marked.parse(mdText || '');
}

/** Enable editable WYSIWYG mode on the preview */
export function setEditable(enabled) {
  if (!previewEl) return;
  isEditable = enabled;
  previewEl.contentEditable = enabled ? 'true' : 'false';
  previewEl.classList.toggle('editable', enabled);

  if (enabled) {
    previewEl.addEventListener('input', onPreviewEdit);
    previewEl.addEventListener('paste', onPreviewPaste);
  } else {
    previewEl.removeEventListener('input', onPreviewEdit);
    previewEl.removeEventListener('paste', onPreviewPaste);
  }
}

export function onEditableChange(fn) {
  editCallback = fn;
}

function onPreviewEdit() {
  if (!editCallback || !previewEl) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const md = turndown.turndown(previewEl.innerHTML);
    editCallback(md);
  }, 150);
}

function onPreviewPaste(e) {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
}
