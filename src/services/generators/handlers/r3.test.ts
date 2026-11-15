// @vitest-environment node
import { parse } from 'acorn';
import { describe, expect, it } from 'vitest';
import { readGolden } from '@/test/readGolden';
import { getRecipe } from '@/services/catalogue/recipes';
import { generateR3 } from './r3';
import { headerComment, requireSettingsCode, validationFailureReturnFor } from './snippets';
import { assertZeroHits } from './tutorial.testkit';

const golden = readGolden(import.meta.url, 'R3.js.txt');

/** ECMAScript 2023 script parse (AC-3.2). The generated text is parsed, never run. */
function parseEs2023(code: string): void {
  parse(code, { ecmaVersion: 2023, sourceType: 'script' });
}

/** Logging-rule regex: a JSON string, then only status, reason, e.name or ActivityId. */
const LOGGER_LINE =
  /^\s*Server\.Logger\.(?:Log|Warn|Error)\((?:"(?:[^"\\]|\\.)*")(?: \+ " " \+ (?:r\.StatusCode|r\.ReasonPhrase|e\.name|Server\.Context\.ActivityId))*\);$/;

/** Counted in R3.js.txt: the single GetAsync statement. */
const GET_ASYNC_LINE = 19;

describe('generateR3', () => {
  it('matches the golden file', () => {
    const { text } = generateR3();
    expect(text).toBe(golden);
    expect(text.startsWith(`${headerComment(getRecipe('R3'))}\n\n`)).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.includes('\r')).toBe(false);
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
    expect(text.includes('`')).toBe(false);
    expect(text).toContain('toResult(');
    expect(text).toContain('!r.IsSuccessStatusCode');
    expect(text).toContain('r.Body ? JSON.parse(r.Body) : null');
    expect(text).toContain('{ status: "success", data }');
    parseEs2023(text);
  });

  it('highlights the GetAsync line', () => {
    expect(generateR3().highlightLines).toEqual([GET_ASYNC_LINE]);
    expect(golden.split('\n')[GET_ASYNC_LINE - 1] ?? '').toContain('GetAsync');
  });

  it('has zero FR-4 hits', () => {
    const { text } = generateR3();
    assertZeroHits(text);
    parseEs2023(text);
  });

  it('validates, then reads the setting, then calls', () => {
    const text = generateR3().text;
    const qCheck = text.indexOf('q.length > 100');
    const validation = text.indexOf(validationFailureReturnFor('errors', '      '));
    const setting = text.indexOf('Server.SiteSetting.Get("ExternalApi/BaseUrl")');
    const call = text.indexOf('GetAsync(');
    expect(qCheck).toBeGreaterThanOrEqual(0);
    expect(validation).toBeGreaterThan(qCheck);
    expect(setting).toBeGreaterThan(validation);
    expect(call).toBeGreaterThan(setting);
  });

  it('fails closed on a missing setting', () => {
    const text = generateR3().text;
    expect(text).toContain(requireSettingsCode(['ExternalApi/BaseUrl'], '    '));
    expect(text).toContain('Server.Logger.Error("Missing site setting ExternalApi/BaseUrl");');
    expect(text).toContain(
      "Server logic isn't configured: missing site setting ExternalApi/BaseUrl",
    );
  });

  it('is async only because it awaits HttpClient', () => {
    const text = generateR3().text;
    expect(text).toContain('async function get');
    expect(text).toContain('await Server.Connector.HttpClient.GetAsync');
    expect(text.match(/await/g)).toEqual(['await']);
  });

  it('has no literal endpoint and encodes q', () => {
    const text = generateR3().text;
    expect(text).not.toContain('http://');
    expect(text).not.toContain('https://');
    expect(text).toContain('encodeURIComponent(q)');
    expect(text).not.toContain('contentType');
    expect(text).not.toContain('Server.User');
  });

  it('logs only what the logging rule allows', () => {
    const lines = generateR3()
      .text.split('\n')
      .filter((line) => line.includes('Server.Logger.'));
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(line).toMatch(LOGGER_LINE);
      // The missing-setting log names ExternalApi/BaseUrl. That name is allowed; a Url leak is not.
      expect(line.replaceAll('ExternalApi/BaseUrl', '')).not.toMatch(/Body|message|Url/);
    }
  });
});
