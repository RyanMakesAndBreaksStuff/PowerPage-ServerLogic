import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slug';

const BASIC: [string, string][] = [
  ['Customer Summary!', 'customer-summary'],
  ['customer-summary', 'customer-summary'],
  ['  Hello   World  ', 'hello-world'],
  ['a_b-c', 'a-b-c'],
  ['---x---', 'x'],
  ['Über Café', 'ber-caf'],
  ['Order #42 (v2)', 'order-42-v2'],
  ['UPPER', 'upper'],
  ['', 'untitled'],
  ['!!!', 'untitled'],
  ['日本語', 'untitled'],
];

const DEVICE_NAMES: [string, string][] = [
  ['CON', 'con-logic'],
  ['prn', 'prn-logic'],
  ['Aux', 'aux-logic'],
  ['NUL!', 'nul-logic'],
  ['com1', 'com1-logic'],
  ['COM9', 'com9-logic'],
  ['lpt1', 'lpt1-logic'],
  ['LPT9', 'lpt9-logic'],
  ['com0', 'com0'],
  ['com10', 'com10'],
  ['console', 'console'],
  ['con-x', 'con-x'],
  ['lpt', 'lpt'],
];

describe('slugify', () => {
  it.each(BASIC)('%j becomes %j', (input, expected) => {
    expect(slugify(input).slug).toBe(expected);
  });

  it('AC-2.2: "Customer Summary!" gives customer-summary and differs', () => {
    expect(slugify('Customer Summary!')).toEqual({ slug: 'customer-summary', differs: true });
  });

  it('AC-2.3: an empty slug falls back to untitled', () => {
    expect(slugify('')).toEqual({ slug: 'untitled', differs: true });
    expect(slugify('***').slug).toBe('untitled');
  });

  it.each(DEVICE_NAMES)('AC-2.11 device names: %j becomes %j', (input, expected) => {
    expect(slugify(input).slug).toBe(expected);
  });

  it('differs compares the slug with the typed name exactly', () => {
    expect(slugify('customer-summary').differs).toBe(false);
    expect(slugify('Customer-Summary').differs).toBe(true);
    expect(slugify(' customer-summary').differs).toBe(true);
    expect(slugify('CON').differs).toBe(true);
  });

  describe('AC-2.11 length cap of 64', () => {
    it('leaves a 64-character slug alone', () => {
      const name = 'b'.repeat(64);
      expect(slugify(name)).toEqual({ slug: name, differs: false });
    });

    it('cuts at 64 when there is no dash to cut at', () => {
      expect(slugify('x'.repeat(200)).slug).toBe('x'.repeat(64));
      expect(slugify(`${'a'.repeat(65)}-b`).slug).toBe('a'.repeat(64));
    });

    it('cuts at the last dash at or before index 64', () => {
      const name = `${'abcdefghi-'.repeat(10)}tail`;
      expect(slugify(name).slug).toBe(`${'abcdefghi-'.repeat(5)}abcdefghi`);
      expect(slugify(`${'a'.repeat(63)}-bbb`).slug).toBe('a'.repeat(63));
      expect(slugify(`${'a'.repeat(64)}-bbb`).slug).toBe('a'.repeat(64));
    });

    it('never returns more than 64 characters or a trailing dash', () => {
      for (const name of ['word '.repeat(40), 'a-'.repeat(80), 'ab cd '.repeat(30)]) {
        const { slug } = slugify(name);
        expect(slug.length).toBeLessThanOrEqual(64);
        expect(slug.endsWith('-')).toBe(false);
        expect(slug.startsWith('-')).toBe(false);
      }
    });
  });
});
