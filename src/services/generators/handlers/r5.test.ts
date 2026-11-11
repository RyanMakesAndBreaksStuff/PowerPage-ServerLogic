import { parse } from 'acorn';
import { describe, expect, it } from 'vitest';
import { readGolden } from '@/test/readGolden';
import { detectConnectorUse, exportedFunctionNames } from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import { headerComment } from './snippets';
import { R5_DIFFERENCES, generateR5 } from './r5';
import { assertZeroHits } from './tutorial.testkit';

/** Counted in the committed golden: the four `Server.Connector.` call lines (Decision 6). */
const CONNECTOR_LINES = [42, 68, 94, 122] as const;

/**
 * A logger call may be a fixed JSON string, then only StatusCode, ReasonPhrase, `<var>.name`
 * or ActivityId joined with ` + " " + ` (Decision 22).
 */
const LOGGER_LINE =
  /^\s*Server\.Logger\.(?:Log|Warn|Error)\("(?:[^"\\]|\\.)*"(\s*\+\s*" "\s*\+\s*(?:[A-Za-z_$][\w$]*\.(?:StatusCode|ReasonPhrase|name)|Server\.Context\.ActivityId))*\);\s*$/;

const assertLogging = (text: string): void => {
  const calls = text.split('\n').filter((line) => line.includes('Server.Logger.'));
  expect(calls.length).toBeGreaterThan(0);
  for (const line of calls) {
    expect(line).toMatch(LOGGER_LINE);
    expect(line).not.toMatch(/Body|e\.message|\bUrl\b|https?:/);
  }
  expect(text).not.toContain('e.message');
};

const functionText = (text: string, name: 'get' | 'post' | 'put' | 'del'): string => {
  const start = text.indexOf(`async function ${name}(`);
  const next = {
    get: 'async function post(',
    post: 'async function put(',
    put: 'async function del(',
    del: undefined,
  }[name];
  const end = next === undefined ? text.length : text.indexOf(next);
  return text.slice(start, end);
};

describe('generateR5', () => {
  it('matches the golden file', () => {
    const text = generateR5().text;
    expect(text).toBe(readGolden(import.meta.url, 'R5.js.txt'));
    expect(text.startsWith(`${headerComment(getRecipe('R5'))}\n\n`)).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.includes('\r')).toBe(false);
    expect(text).not.toContain('${');
  });

  it('highlights every Server.Connector call', () => {
    const { text, highlightLines } = generateR5();
    const lines = text.split('\n');
    expect(highlightLines).toEqual([...CONNECTOR_LINES]);
    expect(
      lines.flatMap((line, index) => (line.includes('Server.Connector.') ? [index + 1] : [])),
    ).toEqual([...CONNECTOR_LINES]);
    for (const lineNumber of CONNECTOR_LINES) {
      expect(lines[lineNumber - 1] ?? '').toContain('Server.Connector.');
    }
  });

  it('exports the four async functions and no other function declarations', () => {
    const text = generateR5().text;
    expect(exportedFunctionNames(text)).toEqual(['get', 'post', 'put', 'del']);
    expect(getRecipe('R5').functions).toEqual(['get', 'post', 'put', 'del']);
    for (const name of ['get', 'post', 'put', 'del'] as const) {
      expect(text).toContain(`async function ${name}(`);
    }
    expect(text.split('\n').some((line) => line.startsWith('function '))).toBe(false);
  });

  it('detectConnectorUse is httpClient only', () => {
    const text = generateR5().text;
    expect(detectConnectorUse(text)).toEqual({
      dataverse: false,
      httpClient: true,
      undetermined: false,
    });
    expect(text).not.toContain('Dataverse');
  });

  it('uses GetAsync, PostAsync, PatchAsync in put, and DeleteAsync', () => {
    const text = generateR5().text;
    expect(functionText(text, 'get')).toContain('HttpClient.GetAsync');
    expect(functionText(text, 'post')).toContain('HttpClient.PostAsync');
    expect(functionText(text, 'put')).toContain('HttpClient.PatchAsync');
    expect(functionText(text, 'put')).not.toContain('PutAsync');
    expect(functionText(text, 'del')).toContain('HttpClient.DeleteAsync');
    expect(text.match(/toResult\(await /g)?.length).toBe(4);
    expect(text.match(/!r\.IsSuccessStatusCode/g)?.length).toBe(4);
  });

  it('uses the key-syntax path, both validation regexes, one baseUrl and contentType on post and put', () => {
    const text = generateR5().text;
    const getFn = functionText(text, 'get');
    expect(text).toContain(`"/People('" + encodeURIComponent(username) + "')"`);
    expect(text).toContain(`"/People('" + encodeURIComponent(UserName) + "')"`);
    expect(getFn.match(/\?\$select=UserName,FirstName,LastName,MiddleName,Age/g)?.length).toBe(2);
    expect(text).toContain('/^[A-Za-z0-9._-]{1,64}$/');
    expect(text).toContain('/^[A-Za-z0-9()]{0,64}$/');
    expect(text).toContain('const baseUrl = "https://services.odata.org/TripPinRESTierService";');
    expect(text.match(/https:\/\/services\.odata\.org\/TripPinRESTierService/g)).toEqual([
      'https://services.odata.org/TripPinRESTierService',
    ]);
    expect(text.match(/https?:\/\/[^\s"]+/g)).toEqual([
      'https://learn.microsoft.com/en-us/power-pages/configure/server-logic-external-services',
      'https://services.odata.org/TripPinRESTierService',
    ]);
    expect(functionText(text, 'post')).toContain('"application/json"');
    expect(functionText(text, 'put')).toContain('"application/json"');
    expect(getFn).not.toContain('application/json');
    expect(functionText(text, 'del')).not.toContain('application/json');
  });

  it('validates before any outbound call, and put and del return only status', () => {
    const text = generateR5().text;
    const order = [
      ['get', 'isUserName(username)', 'GetAsync'],
      ['post', 'personErrors(body)', 'PostAsync'],
      ['put', 'personErrors(body)', 'PatchAsync'],
      ['del', 'isSession(serviceSession)', 'DeleteAsync'],
    ] as const;
    for (const [name, check, call] of order) {
      const body = functionText(text, name);
      expect(body.indexOf(check)).toBeGreaterThanOrEqual(0);
      expect(body.indexOf(check)).toBeLessThan(body.indexOf(call));
    }
    expect(functionText(text, 'get')).not.toContain('serviceSession');
    expect(functionText(text, 'post')).toContain('const { serviceSession, ...person } = body;');
    expect(functionText(text, 'put')).toContain(
      'const { serviceSession, UserName, ...changes } = body;',
    );
    expect(functionText(text, 'post')).toContain('r.Body');
    expect(functionText(text, 'get')).toContain('r.Body');
    for (const name of ['put', 'del'] as const) {
      const body = functionText(text, name);
      expect(body).not.toContain('r.Body');
      expect(body).not.toContain('data:');
      expect(body).toContain('return JSON.stringify({ status: "success" });');
    }
    expect(functionText(text, 'del')).not.toContain('readObject');
  });

  it('logs only what the logging rule allows', () => {
    assertLogging(generateR5().text);
  });

  it('has zero FR-4 hits', () => {
    assertZeroHits(generateR5().text);
  });

  it('parses as an ES2023 script and is not evaluated', () => {
    expect(() =>
      parse(generateR5().text, { ecmaVersion: 2023, sourceType: 'script' }),
    ).not.toThrow();
  });

  it('lists the Learn differences', () => {
    expect(R5_DIFFERENCES.length).toBeGreaterThan(0);
    for (const row of R5_DIFFERENCES) {
      expect(row.change).not.toBe('');
      expect(row.reason).not.toBe('');
    }
  });
});
