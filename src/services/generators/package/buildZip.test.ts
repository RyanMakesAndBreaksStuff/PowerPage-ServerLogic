// @vitest-environment node
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildZip } from './buildZip';

const FOUR = [
  { path: 'customer-summary.js', content: 'server' },
  { path: 'customer-summary.client.js', content: 'client' },
  { path: 'README.md', content: 'readme' },
  { path: 'permission-checklist.md', content: 'checklist' },
] as const;

const FIVE = [...FOUR, { path: 'customer-summary.page.html', content: '<p>page</p>' }] as const;

function decoded(files: readonly { path: string; content: string }[]): Record<string, string> {
  const opened = unzipSync(buildZip(files));
  const text: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(opened)) {
    expect(name.includes('/') || name.includes('\\')).toBe(false);
    const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    expect(bom).toBe(false);
    text[name] = strFromU8(bytes);
  }
  return text;
}

describe('buildZip', () => {
  it('round-trips names and contents', () => {
    for (const files of [FOUR, FIVE]) {
      const text = decoded(files);
      expect(Object.keys(text).sort()).toEqual(files.map((file) => file.path).sort());
      for (const file of files) expect(text[file.path]).toBe(file.content);
    }
  });

  it('keeps non-ASCII text', () => {
    const content = '✓ → café 😀';
    const text = decoded([{ path: 'README.md', content }]);
    expect(text['README.md']).toBe(content);
  });

  it('keeps LF', () => {
    const content = 'one\ntwo\n';
    const text = decoded([{ path: 'a.js', content }]);
    expect(text['a.js']).toBe(content);
  });

  it('throws on a duplicate path', () => {
    expect(() =>
      buildZip([
        { path: 'a.js', content: '1' },
        { path: 'a.js', content: '2' },
      ]),
    ).toThrow('Duplicate path in zip: a.js');
  });

  it('throws on an empty path', () => {
    expect(() => buildZip([{ path: '', content: 'x' }])).toThrow('Empty path in zip');
  });

  it('returns a Uint8Array that starts with the zip signature PK', () => {
    const bytes = buildZip(FOUR);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
