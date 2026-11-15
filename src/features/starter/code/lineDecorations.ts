import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import type { Text } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';

const HIGHLIGHT = Decoration.line({ class: 'ui-code-highlight' });
const FLAG = Decoration.line({ class: 'starter-code__flag' });
// Renders nothing: it only marks the text of a highlighted line so the mark can follow edits.
const TRACK = Decoration.mark({});
const NO_LINES: readonly number[] = [];

/**
 * Line classes for 1-based line numbers: data-access highlights (AC-4.2) and FR-4 flags (AC-5.2).
 * Lines past the end of the document are skipped.
 */
export function lineDecorations(
  doc: Text,
  highlight: readonly number[],
  flags: readonly number[],
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const lines = [...new Set([...highlight, ...flags])].sort((a, b) => a - b);
  for (const n of lines) {
    if (n < 1 || n > doc.lines) continue;
    const from = doc.line(n).from;
    if (highlight.includes(n)) builder.add(from, from, HIGHLIGHT);
    if (flags.includes(n)) builder.add(from, from, FLAG);
  }
  return builder.finish();
}

/** Replaces the highlights with these 1-based lines of the transaction's new document. */
export const SET_HIGHLIGHTS = StateEffect.define<readonly number[]>();

function trackLines(doc: Text, lines: readonly number[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const n of [...new Set(lines)].sort((a, b) => a - b)) {
    if (n < 1 || n > doc.lines) continue;
    const line = doc.line(n);
    // An empty line has no text to follow, so it can't carry a highlight.
    if (line.from < line.to) builder.add(line.from, line.to, TRACK);
  }
  return builder.finish();
}

function trackedLines(doc: Text, tracked: DecorationSet): number[] {
  const lines: number[] = [];
  const it = tracked.iter();
  while (it.value !== null) {
    // A line break at either end of the range belongs to no highlighted line: skip a leading one, and
    // stop before a trailing one, so the highlight never spills onto the line next to its code.
    const from = doc.sliceString(it.from, it.from + 1) === '\n' ? it.from + 1 : it.from;
    const last = doc.lineAt(Math.max(from, it.to - 1)).number;
    for (let n = doc.lineAt(from).number; n <= last; n++) lines.push(n);
    it.next();
  }
  return lines;
}

/**
 * Data-access highlights that follow their code through edits (AC-4.2). Each highlighted line's
 * text is tracked as a range: typing above moves it, a merge keeps it on the merged line, and it
 * goes once all of its text is deleted. `SET_HIGHLIGHTS` replaces the set without mapping the old
 * one, so a whole-document replacement never carries the previous recipe's lines across.
 */
export const HIGHLIGHT_FIELD = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(SET_HIGHLIGHTS)) return trackLines(tr.newDoc, effect.value);
    }
    return value.map(tr.changes);
  },
  provide: (field) =>
    EditorView.decorations.compute([field], (state) =>
      lineDecorations(state.doc, trackedLines(state.doc, state.field(field)), NO_LINES),
    ),
});
