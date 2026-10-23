import { describe, expect, it } from 'vitest';
import { minimalChange } from './minimalChange';

describe('minimalChange', () => {
  it('returns null for equal text', () => {
    expect(minimalChange('abc', 'abc')).toBeNull();
  });

  it.each([
    [
      'insert in the middle',
      'function get() {}',
      'function get() { x; }',
      { from: 16, to: 16, insert: ' x; ' },
    ],
    ['delete at the end', 'abc;\n', 'abc', { from: 3, to: 5, insert: '' }],
    ['replace everything', 'abc', 'xyz', { from: 0, to: 3, insert: 'xyz' }],
    ['repeated characters', 'aaa', 'aaaa', { from: 3, to: 3, insert: 'a' }],
    ['from empty', '', 'abc', { from: 0, to: 0, insert: 'abc' }],
  ])('%s', (_name, before, after, change) => {
    expect(minimalChange(before, after)).toEqual(change);
  });

  it('always rebuilds the target text', () => {
    const pairs = [
      ['const a = 1;\nconst b = 2;\n', 'const a = 1;\nlet c;\nconst b = 2;\n'],
      ['x', ''],
      ['ab', 'ba'],
    ] as const;
    for (const [before, after] of pairs) {
      const change = minimalChange(before, after);
      const rebuilt =
        change === null
          ? before
          : before.slice(0, change.from) + change.insert + before.slice(change.to);
      expect(rebuilt).toBe(after);
    }
  });
});
