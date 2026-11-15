import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxHighlighting } from '@codemirror/language';
import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useEffectEvent, useRef } from 'react';
import type { ReactElement } from 'react';
import { minimalChange } from '@/lib/minimalChange';
import { CODE_HIGHLIGHT, CODE_THEME } from './codeTheme';
import { HIGHLIGHT_FIELD, SET_HIGHLIGHTS, lineDecorations } from './lineDecorations';
import './codePanes.css';

export type CodeEditorProps = {
  label: string;
  value: string;
  syntax: 'javascript' | 'plain';
  /** Lines of `value` to highlight. Null keeps the current highlights on their code through edits. */
  highlightLines?: readonly number[] | null;
  flagLines?: readonly number[];
  cursor?: number | null;
  /** Absent means read-only. */
  onEdit?: (text: string, cursor: number) => void;
  onCursor?: (cursor: number) => void;
};

const NO_LINES: readonly number[] = [];
const SYNTAX = new Compartment();
const LINES = new Compartment();
// Marks transactions that copy props into the editor, so they are not reported back as edits.
const FROM_PROPS = Annotation.define<boolean>();

/**
 * A CodeMirror 6 pane. The session text is the source of truth: the editor reports edits and
 * cursor moves, and takes outside changes (recipe switch, Start over, insert) as one undoable
 * change. CodeMirror splits on CRLF, CR and LF and joins with LF, so the model is LF-only (AC-4.10).
 * Esc then Tab leaves the editor (F48) through the tab-focus mode built into @codemirror/view.
 */
export function CodeEditor({
  label,
  value,
  syntax,
  highlightLines = null,
  flagLines = NO_LINES,
  cursor = null,
  onEdit,
  onCursor,
}: CodeEditorProps): ReactElement {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnly = onEdit === undefined;

  const initial = useEffectEvent(() => ({ doc: value, label, readOnly }));
  const reportEdit = useEffectEvent((text: string, head: number) => {
    onEdit?.(text, head);
  });
  const reportCursor = useEffectEvent((head: number) => {
    onCursor?.(head);
  });

  useEffect(() => {
    const parent = parentRef.current;
    if (parent === null) return;
    const config = initial();
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: config.doc,
        extensions: [
          lineNumbers(),
          CODE_THEME,
          syntaxHighlighting(CODE_HIGHLIGHT),
          SYNTAX.of([]),
          LINES.of([]),
          HIGHLIGHT_FIELD,
          EditorView.contentAttributes.of(
            config.readOnly
              ? { 'aria-label': config.label, 'aria-readonly': 'true' }
              : { 'aria-label': config.label },
          ),
          config.readOnly
            ? [EditorState.readOnly.of(true), keymap.of(defaultKeymap)]
            : [history(), keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap])],
          EditorView.updateListener.of((update) => {
            if (update.transactions.some((tr) => tr.annotation(FROM_PROPS) === true)) return;
            const head = update.state.selection.main.head;
            if (update.docChanged) reportEdit(update.state.doc.toString(), head);
            else if (update.selectionSet) reportCursor(head);
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view === null) return;
    const change = minimalChange(view.state.doc.toString(), value);
    view.dispatch({
      ...(change === null ? {} : { changes: change }),
      ...(change !== null && cursor !== null
        ? { selection: { anchor: Math.min(cursor, value.length) } }
        : {}),
      effects: [
        SYNTAX.reconfigure(syntax === 'javascript' ? javascript() : []),
        LINES.reconfigure(
          EditorView.decorations.of((v) => lineDecorations(v.state.doc, NO_LINES, flagLines)),
        ),
        // Built against the new text, so a replaced document never inherits the old highlights.
        ...(highlightLines === null ? [] : [SET_HIGHLIGHTS.of(highlightLines)]),
      ],
      annotations: FROM_PROPS.of(true),
    });
  }, [value, cursor, syntax, highlightLines, flagLines]);

  return <div ref={parentRef} className="starter-code__editor" />;
}
