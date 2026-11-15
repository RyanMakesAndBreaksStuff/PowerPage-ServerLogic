import { HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

// Colours are theme tokens, so both themes and a live host theme change need no editor change (FR-11).
export const CODE_HIGHLIGHT = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--keyword)' },
  { tag: [tags.string, tags.regexp], color: 'var(--string)' },
  { tag: tags.comment, color: 'var(--comment)' },
]);

export const CODE_THEME = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--code)', color: 'var(--text)', fontSize: '12px' },
  '&.cm-focused': { outline: '2px solid var(--primary)', outlineOffset: '-2px' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', fontWeight: '400', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--text)' },
  '.cm-gutters': { backgroundColor: 'var(--code)', color: 'var(--comment)', border: 'none' },
});
