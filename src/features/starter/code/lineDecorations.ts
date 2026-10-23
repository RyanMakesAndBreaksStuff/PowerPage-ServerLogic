import { RangeSetBuilder } from '@codemirror/state';
import type { Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';

const HIGHLIGHT = Decoration.line({ class: 'ui-code-highlight' });
const FLAG = Decoration.line({ class: 'starter-code__flag' });

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
