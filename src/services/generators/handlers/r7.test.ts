// @vitest-environment node
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import type { Options } from 'acorn';
import { describe, expect, it } from 'vitest';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
import { detectConnectorUse, exportedFunctionNames } from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import { generateHandler } from '@/services/generators/handlers';
import { R7_DIFFERENCES, generateR7 } from '@/services/generators/handlers/r7';
import { headerComment, requireSettingsCode } from '@/services/generators/handlers/snippets';

const ACORN_OPTIONS = { ecmaVersion: 2023, sourceType: 'script' } as const satisfies Options;
const GOLDEN = readFileSync(new URL('./__golden__/R7.js.txt', import.meta.url), 'utf8');
const HIGHLIGHTS = [52, 135, 147, 176, 195] as const;
const CALLS = ['PostAsync(', 'GetAsync(', 'GetAsync(', 'PutAsync(', 'CreateRecord('] as const;
const SETTINGS = ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_ID', 'HOSTNAME', 'SITE_PATH'] as const;
const CHANGES = [
  'Site settings are read inside post with fail-closed checks, not at top level.',
  'The token body is form-encoded.',
  'Every call has a status check and each stage has its own failure.',
  'Ticket HTML is escaped.',
  'The ticket file name is built from ActivityId and a name slug, not the raw name.',
  'The upload sets conflictBehavior=fail.',
  'No err.message, id or URL logging.',
  'The return shape is the fixed { status, id }.',
  "Input is validated against the table's columns before any call.",
  'The optional email step and toBase64 are not generated.',
  'The stray ;; is removed.',
  'The table permission is Global with Create only.',
] as const;

const LOG_LINE =
  /^\s*Server\.Logger\.(?:Log|Warn|Error)\("(?:[^"\\]|\\.)*"(?: \+ " " \+ (?:[A-Za-z_$][\w$]*\.(?:StatusCode|ReasonPhrase)|[A-Za-z_$][\w$]*\.name|Server\.Context\.ActivityId))*\);$/;

function lineAt(rows: readonly string[], line: number): string {
  const value = rows[line - 1];
  if (value === undefined) throw new Error(`missing line ${String(line)}`);
  return value;
}

function indexAfter(text: string, needle: string, from: number): number {
  const index = text.indexOf(needle, from);
  if (index < 0) throw new Error(`missing ${needle}`);
  return index;
}

function awaitCallees(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/\bawait\s+([A-Za-z0-9_.]+)\s*\(/g)) {
    const name = match[1];
    if (name === undefined) throw new Error('await without a callee');
    found.push(name);
  }
  return found;
}

function loggerLines(text: string): string[] {
  return text.split('\n').filter((row) => row.includes('Server.Logger.'));
}

describe('generateR7', () => {
  it('matches the golden file', () => {
    const text = generateR7().text;
    expect(text).toBe(GOLDEN);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.startsWith(headerComment(getRecipe('R7')))).toBe(true);
  });

  it('highlights the five connector lines', () => {
    const { text, highlightLines } = generateR7();
    const rows = text.split('\n');
    expect(highlightLines).toEqual([...HIGHLIGHTS]);
    CALLS.forEach((call, index) => {
      const line = HIGHLIGHTS[index];
      if (line === undefined) throw new Error('missing highlight');
      expect(lineAt(rows, line)).toContain(call);
    });
  });

  it('has zero FR-4 hits', () => {
    const { text } = generateR7();
    const result = runBrowserChecks(text);
    expect(result.hits).toEqual([]);
    expect(result.parseFailed).toBe(false);
    expect(() => parse(text, ACORN_OPTIONS)).not.toThrow();
  });

  it('exports only post', () => {
    const { text } = generateR7();
    expect(exportedFunctionNames(text)).toEqual(['post']);
    expect(exportedFunctionNames(text)).toEqual([...getRecipe('R7').functions]);
    expect(detectConnectorUse(text)).toEqual({
      dataverse: true,
      httpClient: true,
      undetermined: false,
    });
  });

  it('async only where it awaits HttpClient', () => {
    const { text } = generateR7();
    expect(text.match(/\basync\b/g)).toEqual(['async', 'async']);
    expect(text).toContain('const getAccessToken = async (');
    expect(text).toContain('async function post()');
    expect(awaitCallees(text)).toEqual([
      'Server.Connector.HttpClient.PostAsync',
      'getAccessToken',
      'Server.Connector.HttpClient.GetAsync',
      'Server.Connector.HttpClient.GetAsync',
      'Server.Connector.HttpClient.PutAsync',
    ]);
    expect(text).not.toMatch(/\bawait\b[^;\n]*CreateRecord\s*\(/);
    expect(text).toContain('toResult(Server.Connector.Dataverse.CreateRecord(');
  });

  it('runs the stages in order', () => {
    const post = generateR7().text.slice(generateR7().text.indexOf('async function post'));
    const validation = indexAfter(post, "The request isn't valid.", 0);
    const setting = indexAfter(post, 'Server.SiteSetting.Get(', validation);
    const token = indexAfter(post, 'getAccessToken(', setting);
    const site = indexAfter(post, 'GetAsync(', token);
    const drive = indexAfter(post, 'GetAsync(', site + 'GetAsync('.length);
    const upload = indexAfter(post, 'PutAsync(', drive);
    const create = indexAfter(post, 'CreateRecord(', upload);
    expect(validation).toBeLessThan(setting);
    expect(setting).toBeLessThan(token);
    expect(token).toBeLessThan(site);
    expect(site).toBeLessThan(drive);
    expect(drive).toBeLessThan(upload);
    expect(upload).toBeLessThan(create);
  });

  it('form-encodes the token body', () => {
    const { text } = generateR7();
    const helper = text.slice(
      text.indexOf('const getAccessToken'),
      text.indexOf('async function post'),
    );
    expect(helper).toContain('"client_id=" + encodeURIComponent(');
    expect(helper).toContain('"&client_secret=" + encodeURIComponent(');
    expect(helper).toContain('"&scope=" + encodeURIComponent(');
    expect(helper).toContain('"&grant_type=client_credentials"');
    expect(helper).toContain('"Content-Type": "application/x-www-form-urlencoded"');
    expect(helper).toContain(', "application/x-www-form-urlencoded")');
    expect(helper).not.toContain('JSON.stringify(');
  });

  it('uploads to a safe, collision-checked path', () => {
    const { text } = generateR7();
    expect(text).toContain('TICKETS_FOLDER');
    expect(text).toContain('@microsoft.graph.conflictBehavior=fail');
    expect(text).toContain('Server.Context.ActivityId + "-" + nameSlug(');
    expect(text).toContain('".html"');
    expect(text).toMatch(/PutAsync\([\s\S]*?, "text\/html"\)/);
  });

  it('escapes every ticket value', () => {
    const { text } = generateR7();
    expect(text).toContain('escapeHtml(fullname)');
    expect(text).toContain('escapeHtml(eventText)');
    expect(text).toContain('escapeHtml(date)');
    const helper = text.slice(text.indexOf('const escapeHtml'), text.indexOf('const nameSlug'));
    for (const character of ['&', '<', '>', '"', "'"]) expect(helper).toContain(character);
  });

  it('uses the exact stage names and messages', () => {
    const { text } = generateR7();
    expect(text).toContain('"R7 connect"');
    expect(text).toContain('"R7 upload"');
    expect(text).toContain('"R7 create after upload"');
    expect(text).toContain('message: "Couldn\'t connect to SharePoint."');
    expect(text).toContain('message: "Couldn\'t upload the ticket."');
    expect(text).toContain('message: "Registration failed after the ticket was uploaded."');
    expect(text).not.toContain('Server.Logger.Log(');
    for (const row of loggerLines(text)) {
      const operation = /"((?:[^"\\]|\\.)*)"/.exec(row)?.[1];
      if (operation === undefined) throw new Error('logger line has no operation');
      expect(
        operation === 'R7 connect' ||
          operation === 'R7 upload' ||
          operation === 'R7 create after upload' ||
          operation.startsWith('Missing site setting '),
      ).toBe(true);
    }
  });

  it('logs the activity id after a failed create', () => {
    const post = generateR7().text.slice(generateR7().text.indexOf('async function post'));
    const createAt = post.indexOf('CreateRecord(');
    expect(createAt).toBeGreaterThanOrEqual(0);
    const before = loggerLines(post.slice(0, createAt));
    const after = loggerLines(post.slice(createAt));
    expect(before.length).toBeGreaterThan(0);
    expect(after.length).toBeGreaterThan(0);
    for (const row of before) expect(row).not.toContain('Server.Context.ActivityId');
    for (const row of after) expect(row).toContain('Server.Context.ActivityId');
  });

  it('obeys the logging rule', () => {
    const lines = loggerLines(generateR7().text);
    expect(lines.length).toBeGreaterThan(0);
    for (const row of lines) {
      expect(row).toMatch(LOG_LINE);
      expect(row).not.toMatch(/Body|message|Url|token|siteId|driveId|webUrl/);
    }
    expect(generateR7().text).not.toContain('Server.Logger.Log(');
  });

  it('reads the created id the F55 way', () => {
    const { text } = generateR7();
    expect(text).toContain('r.Headers && (r.Headers.entityid ?? r.Headers.entityId)');
    const missing = text.slice(text.indexOf('if (!id)'));
    expect(missing.startsWith('if (!id)')).toBe(true);
    expect(missing).toContain('Registration failed after the ticket was uploaded.');
  });

  it('validates the column-aware contract row', () => {
    const { text } = generateR7();
    expect(text).toContain('200');
    expect(text).toContain('100');
    expect(text).toContain('Number.isInteger(');
    expect(text).toContain('^\\d{4}-\\d{2}-\\d{2}$');
    expect(text).toContain('split("@")');
    expect(text).toContain('parts.length === 2');
    expect(text).toContain('indexOf(".")');
    for (const field of ['body', 'fullname', 'email', 'phone', 'event', 'eventText', 'date']) {
      expect(text).toContain(`field: "${field}"`);
    }
    expect(text).toContain('field: "event",');
    expect(text).not.toContain('startsWith');
    expect(text).not.toContain('endsWith');
  });

  it('reads no Server.User', () => {
    expect(generateR7().text).not.toContain('Server.User');
  });

  it('has no literal secret or endpoint value', () => {
    const { text } = generateR7();
    const header = headerComment(getRecipe('R7'));
    const body = text.slice(header.length);
    const urls = body.match(/https:\/\/[^\s"']+/g) ?? [];
    expect([...urls].sort()).toEqual(
      [
        'https://graph.microsoft.com/.default',
        'https://graph.microsoft.com/v1.0/drives/',
        'https://graph.microsoft.com/v1.0/sites/',
        'https://graph.microsoft.com/v1.0/sites/',
        'https://login.microsoftonline.com/',
      ].sort(),
    );
    expect(body).not.toMatch(/[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/);
    expect(body).not.toContain('sharepoint.com');
    expect(body).not.toContain('contoso');
  });

  it('reads the five settings only through Get', () => {
    const { text } = generateR7();
    expect(text).toContain(requireSettingsCode(SETTINGS, '  '));
    let stripped = text;
    for (const name of SETTINGS) {
      stripped = stripped
        .replaceAll(`Server.SiteSetting.Get(${JSON.stringify(name)})`, '')
        .replaceAll(`Missing site setting ${name}`, '')
        .replaceAll(`missing site setting ${name}`, '');
    }
    for (const name of SETTINGS) expect(stripped).not.toContain(name);
  });

  it('does not generate the email step', () => {
    const { text } = generateR7();
    expect(text).not.toContain('toBase64');
    expect(text).not.toContain('sendMail');
    expect(text).not.toContain('Mail.Send');
  });

  it('header links Learn and the sample package', () => {
    const recipe = getRecipe('R7');
    const header = headerComment(recipe);
    const { text } = generateR7();
    expect(text.startsWith(header)).toBe(true);
    expect(recipe.learnUrl).not.toBeNull();
    expect(header).toContain(recipe.learnUrl);
    const sample = recipe.extraUrls[0];
    if (sample === undefined) throw new Error('R7 has no sample package');
    expect(header).toContain(sample);
  });

  it('is deterministic and LF only', () => {
    const first = generateR7();
    expect(first).toEqual(generateR7());
    expect(first.text.includes('\r')).toBe(false);
    expect(first.text.charCodeAt(0)).not.toBe(0xfeff);
    expect(first.text.endsWith('\n')).toBe(true);
    expect(first.text.endsWith('\n\n')).toBe(false);
    const lineCount = first.text.split('\n').length - 1;
    expect(first.highlightLines.length).toBeGreaterThan(0);
    let previous = 0;
    for (const line of first.highlightLines) {
      expect(line).toBeGreaterThan(previous);
      expect(line).toBeGreaterThanOrEqual(1);
      expect(line).toBeLessThanOrEqual(lineCount);
      previous = line;
    }
  });

  it('R7_DIFFERENCES lists the twelve differences', () => {
    expect(R7_DIFFERENCES).toHaveLength(12);
    expect(R7_DIFFERENCES.map((row) => row.change)).toEqual([...CHANGES]);
    for (const row of R7_DIFFERENCES) {
      expect(row.change.length).toBeGreaterThan(0);
      expect(row.reason.length).toBeGreaterThan(0);
    }
  });

  it('registry returns the same handler', () => {
    expect(generateHandler('R7')).toEqual(generateR7());
  });
});
