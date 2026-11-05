import { describe, expect, it } from 'vitest';
import { applyChanges } from './structureInsert';

describe('applyChanges', () => {
  it('returns the text unchanged for no changes', () => {
    expect(applyChanges('abc', [])).toBe('abc');
  });

  it('applies every change against the original offsets, async first (AC-6.8)', () => {
    const original = 'function get() {\n  return "{}";\n}\n';
    const at = original.indexOf('  return');
    const result = applyChanges(original, [
      { from: 0, to: 0, insert: 'async ' },
      { from: at, to: at, insert: '  await x();\n' },
    ]);
    expect(result).toBe('async function get() {\n  await x();\n  return "{}";\n}\n');
  });

  it('replaces ranges and keeps array order for changes at the same offset', () => {
    expect(
      applyChanges('0123456789', [
        { from: 2, to: 4, insert: 'ab' },
        { from: 6, to: 6, insert: 'X' },
        { from: 6, to: 6, insert: 'Y' },
      ]),
    ).toBe('01ab45XY6789');
  });

  it('applies changes given out of offset order against the original offsets', () => {
    expect(
      applyChanges('0123456789', [
        { from: 6, to: 7, insert: 'X' },
        { from: 2, to: 2, insert: 'ab' },
      ]),
    ).toBe('01ab2345X789');
  });
});
