// preview.js — Markdown rendering
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

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

marked.setOptions({
  gfm: true,
  breaks: true,
});

let previewEl = null;
let debounceTimer = null;

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
