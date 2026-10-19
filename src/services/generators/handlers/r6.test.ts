// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
import { detectConnectorUse, exportedFunctionNames } from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import { R6_DIFFERENCES, generateR6 } from '@/services/generators/handlers/r6';
import {
  headerComment,
  requireSettingsCode,
  validationFailureReturn,
} from '@/services/generators/handlers/snippets';

const GOLDEN = readFileSync(new URL('./__golden__/R6.js.txt', import.meta.url), 'utf8');
const MISSING_SETTING = "Server logic isn't configured: missing site setting AZURE_FUNCTION_URL";
const NAME_MESSAGE = 'Name is required and must be from 1 to 100 characters.';
const GET_ASYNC_LINE = '    const r = toResult(await Server.Connector.HttpClient.GetAsync(url));';
const HIGHLIGHT_LINE = 19;

function lineAt(rows: readonly string[], line: number): string {
  const value = rows[line - 1];
  if (value === undefined) throw new Error(`missing line ${String(line)}`);
  return value;
}

describe('generateR6', () => {
  it('matches the golden file', () => {
    expect(generateR6().text).toBe(GOLDEN);
  });

  it('highlights the GetAsync line', () => {
    const { text, highlightLines } = generateR6();
    const rows = text.split('\n');
    expect(highlightLines).toEqual([HIGHLIGHT_LINE]);
    expect(lineAt(rows, HIGHLIGHT_LINE)).toBe(GET_ASYNC_LINE);
    const connectorLines = rows.flatMap((row, index) =>
      row.includes('Server.Connector.') ? [index + 1] : [],
    );
    expect(connectorLines).toEqual([HIGHLIGHT_LINE]);
    expect(lineAt(rows, 4)).toBe(
      'const toResult = r => typeof r === "string" ? JSON.parse(r) : r;',
    );
    expect(lineAt(rows, 4)).not.toContain('Server.Connector.');
  });

  it('exports one async get', () => {
    const { text } = generateR6();
    expect(exportedFunctionNames(text)).toEqual(getRecipe('R6').functions);
    expect(exportedFunctionNames(text)).toEqual(['get']);
    expect(text).toContain('async function get() {');
    expect(text.match(/\basync\b/g)).toEqual(['async']);
    expect(text.match(/\bawait\b/g)).toEqual(['await']);
  });

  it('validates name, then reads AZURE_FUNCTION_URL, then calls', () => {
    const { text } = generateR6();
    const lengthCheck = text.indexOf('name.length < 1 || name.length > 100');
    const setting = text.indexOf('Server.SiteSetting.Get("AZURE_FUNCTION_URL")');
    const missing = text.indexOf(MISSING_SETTING);
    const call = text.indexOf('Server.Connector.HttpClient.GetAsync(');
    expect(lengthCheck).toBeGreaterThanOrEqual(0);
    expect(lengthCheck).toBeLessThan(setting);
    expect(setting).toBeLessThan(missing);
    expect(missing).toBeLessThan(call);
    expect(text).toContain('typeof name !== "string"');
    expect(text).not.toContain('trim');
    expect(text).toContain(
      validationFailureReturn([{ field: 'name', message: NAME_MESSAGE }], '      '),
    );
    expect(text).toContain(requireSettingsCode(['AZURE_FUNCTION_URL'], '    '));
  });

  it('returns the fixed F57 message for a missing setting', () => {
    const { text } = generateR6();
    expect(text).toContain(
      `return JSON.stringify({ status: "error", message: "${MISSING_SETTING}" });`,
    );
    expect(text).toContain('Server.Logger.Error("Missing site setting AZURE_FUNCTION_URL");');
  });

  it('has no https:// literal outside the Learn header', () => {
    const { text } = generateR6();
    const header = headerComment(getRecipe('R6'));
    const learnUrl = getRecipe('R6').learnUrl;
    expect(learnUrl).toContain('https://');
    expect(text.startsWith(header)).toBe(true);
    expect(text.slice(header.length)).not.toContain('https://');
    expect(text.slice(header.length)).not.toContain('http://');
  });

  it('appends name with encodeURIComponent, using ? or &', () => {
    const { text } = generateR6();
    expect(text).toContain('const separator = azureFunctionUrl.indexOf("?") === -1 ? "?" : "&";');
    expect(text).toContain(
      'const url = azureFunctionUrl + separator + "name=" + encodeURIComponent(name);',
    );
    expect(text).not.toContain('${');
    expect(text).not.toContain('`');
  });

  it('returns message as the raw Body, empty when Body is missing', () => {
    const { text } = generateR6();
    expect(text).toContain(
      'return JSON.stringify({ status: "success", message: r.Body == null ? "" : r.Body });',
    );
    expect(text).not.toMatch(/JSON\.parse\(\s*r\.Body/);
    expect(text.match(/JSON\.parse/g)).toEqual(['JSON.parse']);
    expect(text.split('The Azure Function call failed.').length - 1).toBe(2);
  });

  it('logs only a fixed string plus StatusCode, ReasonPhrase or the exception name', () => {
    const { text } = generateR6();
    const allowed =
      /^\s*Server\.Logger\.(?:Log|Warn|Error)\("(?:[^"\\]|\\.)*"(?: \+ " " \+ (?:r\.StatusCode|r\.ReasonPhrase|[A-Za-z_$][\w$]*\.name|Server\.Context\.ActivityId))*\);$/;
    const lines = text.split('\n').filter((row) => row.includes('Server.Logger.'));
    expect(lines).toHaveLength(3);
    for (const row of lines) {
      expect(row).toMatch(allowed);
      expect(row).not.toMatch(/https?:|azureFunctionUrl|Body|\.message/i);
      expect(row).not.toMatch(/\burl\b/i);
    }
  });

  it('has zero FR-4 hits', () => {
    const { text } = generateR6();
    const result = runBrowserChecks(text);
    expect(result.hits).toEqual([]);
    expect(result.parseFailed).toBe(false);
  });

  it('header links the Learn tutorial', () => {
    const { text } = generateR6();
    const recipe = getRecipe('R6');
    const header = headerComment(recipe);
    expect(text.startsWith(`${header}\n\n`)).toBe(true);
    expect(recipe.learnUrl).not.toBeNull();
    expect(header).toContain(recipe.learnUrl);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.includes('\r')).toBe(false);
    expect(generateR6()).toEqual(generateR6());
  });

  it('uses HttpClient only', () => {
    expect(detectConnectorUse(generateR6().text)).toEqual({
      dataverse: false,
      httpClient: true,
      undetermined: false,
    });
  });

  it('lists non-empty differences from Learn', () => {
    expect(R6_DIFFERENCES.length).toBeGreaterThan(0);
    for (const row of R6_DIFFERENCES) {
      expect(row.change.length).toBeGreaterThan(0);
      expect(row.reason.length).toBeGreaterThan(0);
    }
  });
});
