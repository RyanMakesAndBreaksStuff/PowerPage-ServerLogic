import { Text } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { lineDecorations } from './lineDecorations';

const DOC = Text.of(['a', 'b', 'c', 'd']);

function classOf(spec: unknown): string {
  return typeof spec === 'object' && spec !== null && 'class' in spec ? String(spec.class) : '';
}

function classesByLine(highlight: readonly number[], flags: readonly number[]): [number, string][] {
  const out: [number, string][] = [];
  const iter = lineDecorations(DOC, highlight, flags).iter();
  while (iter.value !== null) {
    out.push([DOC.lineAt(iter.from).number, classOf(iter.value.spec)]);
    iter.next();
  }
  return out;
}

describe('lineDecorations', () => {
  it('marks highlighted and flagged lines, both on one line when they meet', () => {
    expect(classesByLine([2, 3], [3, 4])).toEqual([
      [2, 'ui-code-highlight'],
      [3, 'ui-code-highlight'],
      [3, 'starter-code__flag'],
      [4, 'starter-code__flag'],
    ]);
  });

  it('skips lines outside the document and ignores order and repeats', () => {
    expect(classesByLine([9, 1, 1, 0], [])).toEqual([[1, 'ui-code-highlight']]);
  });
});
