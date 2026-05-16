// editor.js — CodeMirror 6 setup
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, defaultHighlightStyle } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { tags } from '@lezer/highlight';

// Custom highlight style that responds to CSS variables
const mdHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: '700', fontSize: '1.6em' },
  { tag: tags.heading2, fontWeight: '700', fontSize: '1.4em' },
  { tag: tags.heading3, fontWeight: '600', fontSize: '1.2em' },
  { tag: tags.heading4, fontWeight: '600', fontSize: '1.1em' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: '#58a6ff', textDecoration: 'underline' },
  { tag: tags.url, color: '#58a6ff' },
  { tag: tags.monospace, fontFamily: 'var(--font-mono)' },
  { tag: tags.processingInstruction, color: '#8b949e' }, // MD markers like # * -
  { tag: tags.meta, color: '#8b949e' },
  { tag: tags.comment, color: '#6a737d' },
  { tag: tags.string, color: '#a5d6ff' },
  { tag: tags.number, color: '#79c0ff' },
  { tag: tags.keyword, color: '#ff7b72' },
  { tag: tags.function(tags.variableName), color: '#d2a8ff' },
  { tag: tags.definition(tags.variableName), color: '#ffa657' },
  { tag: tags.atom, color: '#79c0ff' },
  { tag: tags.bool, color: '#79c0ff' },
  { tag: tags.contentSeparator, color: '#30363d' },
  { tag: tags.quote, color: '#8b949e', fontStyle: 'italic' },
]);

// Theme compartment so we can reconfigure dynamically
const baseTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--bg-primary)' },
  '.cm-content': { caretColor: 'var(--accent)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size)', lineHeight: 'var(--line-height)' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'none', borderRight: '1px solid var(--border-subtle)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  '.cm-activeLine': { backgroundColor: 'var(--bg-tertiary)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'rgba(88,166,255,0.15)' },
  '.cm-searchMatch': { backgroundColor: 'rgba(88,166,255,0.25)', outline: '1px solid rgba(88,166,255,0.5)' },
  '.cm-selectionMatch': { backgroundColor: 'rgba(88,166,255,0.1)' },
  '.cm-foldGutter': { color: 'var(--text-muted)' },
});

let view = null;
let onChangeCallback = null;
let onCursorCallback = null;

export function initEditor(parentEl, opts = {}) {
  const extensions = [
    baseTheme,
    syntaxHighlighting(mdHighlight),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    history(),
    drawSelection(),
    rectangularSelection(),
    indentOnInput(),
    bracketMatching(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && onChangeCallback) {
        onChangeCallback(update.state.doc.toString());
      }
      if (update.selectionSet && onCursorCallback) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        onCursorCallback(line.number, pos - line.from + 1);
      }
      if (update.selectionSet && _selectionChangeFn) {
        const { from, to } = update.state.selection.main;
        if (from !== to) {
          const coords = update.view.coordsAtPos(from);
          if (coords) _selectionChangeFn({ x: coords.left, y: coords.top, hasSelection: true });
        } else {
          _selectionChangeFn({ hasSelection: false });
        }
      }
    }),
  ];

  if (opts.lineNumbers !== false) extensions.push(lineNumbers());
  if (opts.wordWrap !== false) extensions.push(EditorView.lineWrapping);

  const state = EditorState.create({ doc: '', extensions });
  view = new EditorView({ state, parent: parentEl });
  return view;
}

export function getContent() {
  return view ? view.state.doc.toString() : '';
}

export function setContent(text) {
  if (!view) return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
  });
}

export function onChange(fn) { onChangeCallback = fn; }
export function onCursor(fn) { onCursorCallback = fn; }

export function getWordCount() {
  if (!view) return 0;
  const text = view.state.doc.toString().trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function focus() {
  if (view) view.focus();
}

export function destroyEditor() {
  if (view) { view.destroy(); view = null; }
}

export function wrapSelection(before, after) {
  if (!view) return;
  const { from, to } = view.state.selection.main;
  const selected = view.state.doc.sliceString(from, to);
  view.dispatch({
    changes: { from, to, insert: before + selected + after },
    selection: { anchor: from + before.length, head: from + before.length + selected.length },
  });
  view.focus();
}

export function insertAtLineStart(prefix) {
  if (!view) return;
  const { head } = view.state.selection.main;
  const line = view.state.doc.lineAt(head);
  view.dispatch({
    changes: { from: line.from, to: line.from, insert: prefix },
  });
  view.focus();
}

export function getSelectionCoords() {
  if (!view) return null;
  const { from, to } = view.state.selection.main;
  if (from === to) return null; // no selection
  const coords = view.coordsAtPos(from);
  if (!coords) return null;
  return { x: coords.left, y: coords.top };
}

export function onSelectionChange(fn) {
  if (!view) return;
  // We add a listener via the update listener - it's already in initEditor
  // So we store this callback externally
  _selectionChangeFn = fn;
}

let _selectionChangeFn = null;
export function _getSelectionChangeFn() { return _selectionChangeFn; }
