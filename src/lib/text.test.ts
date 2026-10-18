import { describe, expect, it } from 'vitest';
import { normalizeLf } from '@/lib/text';

describe('normalizeLf', () => {
  it.each<[string, string]>([
    ['a\r\nb', 'a\nb'],
    ['a\rb', 'a\nb'],
    ['a\nb', 'a\nb'],
    ['a\r\n\r\nb', 'a\n\nb'],
    ['\r\r\n', '\n\n'],
    ['one\r\ntwo\rthree\nfour', 'one\ntwo\nthree\nfour'],
    ['', ''],
    ['no line breaks', 'no line breaks'],
  ])('%j becomes %j', (input, expected) => {
    expect(normalizeLf(input)).toBe(expected);
  });

  it('is idempotent and leaves no carriage return', () => {
    const once = normalizeLf('x\r\ny\rz\r\n');
    expect(once).not.toContain('\r');
    expect(normalizeLf(once)).toBe(once);
  });

  it('keeps a missing final newline missing (the download adds it, not this function)', () => {
    expect(normalizeLf('last line')).toBe('last line');
  });
});
