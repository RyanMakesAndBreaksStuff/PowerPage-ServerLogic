// @vitest-environment node
import { parse } from 'acorn';
import { describe, expect, it } from 'vitest';
import { readGolden } from '@/test/readGolden';
import { getRecipe } from '@/services/catalogue/recipes';
import { generateR1 } from './r1';
import { headerComment } from './snippets';
import { assertZeroHits } from './tutorial.testkit';

const golden = readGolden(import.meta.url, 'R1.js.txt');

/** ECMAScript 2023 script parse (AC-3.2). The generated text is parsed, never run. */
function parseEs2023(code: string): void {
  parse(code, { ecmaVersion: 2023, sourceType: 'script' });
}

/** FR-3 logging rule: a JSON-string operation, then only status, reason, e.name or ActivityId. */
const LOGGER_LINE =
  /^\s*Server\.Logger\.(?:Log|Warn|Error)\((?:"(?:[^"\\]|\\.)*")(?: \+ " " \+ (?:r\.StatusCode|r\.ReasonPhrase|e\.name|Server\.Context\.ActivityId))*\);$/;

const READ_CALL =
  'RetrieveMultipleRecords("contacts", "$select=contactid,fullname,emailaddress1&$top=10")';

describe('generateR1', () => {
  it('matches the golden file', () => {
    const { text } = generateR1();
    expect(text).toBe(golden);
    expect(text.startsWith(`${headerComment(getRecipe('R1'))}\n\n`)).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.includes('\r')).toBe(false);
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
    expect(text.includes('`')).toBe(false);
    parseEs2023(text);
  });

  it('highlights the RetrieveMultipleRecords line', () => {
    expect(generateR1().highlightLines).toEqual([7]);
    expect(golden.split('\n')[6] ?? '').toContain('RetrieveMultipleRecords');
  });

  it('has zero FR-4 hits', () => {
    const { text } = generateR1();
    assertZeroHits(text);
    parseEs2023(text);
  });

  it('reads contacts synchronously with the fixed options', () => {
    const text = generateR1().text;
    expect(text).toContain(READ_CALL);
    expect(text).toContain('function get()');
    expect(text).toContain('toResult(');
    expect(text).toContain('IsSuccessStatusCode');
    expect(text).not.toContain('await');
    expect(text).not.toContain('async');
    expect(text).not.toContain('Server.User');
    expect(text).not.toContain('startsWith');
    expect(text).not.toContain('endsWith');
    expect(text).not.toMatch(/function\s*\(/);
    expect(text).not.toContain('?$');
  });

  it('logs only what the logging rule allows', () => {
    const lines = generateR1()
      .text.split('\n')
      .filter((line) => line.includes('Server.Logger.'));
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toMatch(LOGGER_LINE);
      expect(line).not.toMatch(/Body|message|Url/);
    }
  });

  it("uses the catalogue's entity set", () => {
    const entitySet = getRecipe('R1').tables[0]?.entitySetName;
    const argument = /RetrieveMultipleRecords\(([^,]*),/.exec(generateR1().text)?.[1];
    const parsed: unknown = JSON.parse(argument ?? 'null');
    expect(parsed).toBe(entitySet);
  });
});
