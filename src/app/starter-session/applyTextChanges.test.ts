import { describe, expect, it } from 'vitest';
import { applyTextChanges } from './applyTextChanges';

describe('applyTextChanges', () => {
  it('returns the text unchanged for no changes', () => {
    expect(applyTextChanges('abc', [])).toBe('abc');
  });

  it('applies every change against the original offsets, async first (AC-6.8)', () => {
    const original = 'function get() {\n  return "{}";\n}\n';
    const at = original.indexOf('  return');
    const result = applyTextChanges(original, [
      { from: 0, to: 0, insert: 'async ' },
      { from: at, to: at, insert: '  await x();\n' },
    ]);
    expect(result).toBe('async function get() {\n  await x();\n  return "{}";\n}\n');
  });

  it('replaces ranges and keeps array order for changes at the same offset', () => {
    expect(
      applyTextChanges('0123456789', [
        { from: 2, to: 4, insert: 'ab' },
        { from: 6, to: 6, insert: 'X' },
        { from: 6, to: 6, insert: 'Y' },
      ]),
    ).toBe('01ab45XY6789');
  });
});
