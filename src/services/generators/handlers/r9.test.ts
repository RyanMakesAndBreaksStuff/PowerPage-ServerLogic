// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readGolden } from '@/test/readGolden';
import { getRecipe } from '@/services/catalogue/recipes';
import {
  TO_RESULT,
  headerComment,
  requireSettingsCode,
  validationFailureReturn,
} from '@/services/generators/handlers/snippets';
import { generateR9 } from './r9';
import { assertZeroHits } from './tutorial.testkit';

const GOLDEN = readGolden(import.meta.url, 'R9.js.txt');

/** A JSON string, optionally joined with StatusCode, ReasonPhrase, e.name or ActivityId. */
const LOGGING_RULE =
  /^ *Server\.Logger\.(?:Log|Warn|Error)\("(?:\\.|[^"\\])*"(\s*\+\s*" "\s*\+\s*(?:r\.StatusCode|r\.ReasonPhrase|e\.name|Server\.Context\.ActivityId))*\);$/;

/** Counted in R9.js.txt: the single TriggerAsync statement. */
const TRIGGER_LINE = 27;

const GUID_LITERAL = /[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/;

describe('generateR9', () => {
  it('matches the golden file exactly', () => {
    expect(generateR9().text).toBe(GOLDEN);
  });

  it('highlights only the TriggerAsync line', () => {
    const { text, highlightLines } = generateR9();
    expect(highlightLines).toEqual([TRIGGER_LINE]);
    expect(text.split('\n')[TRIGGER_LINE - 1] ?? '').toContain(
      'Server.Connector.CloudFlow.TriggerAsync(',
    );
    expect(
      text.split('\n').filter((item) => item.includes('Server.Connector.CloudFlow.TriggerAsync(')),
    ).toHaveLength(1);
  });

  it('has no restricted pattern or browser API and parses', () => {
    assertZeroHits(generateR9().text);
  });

  it('is deterministic and LF only', () => {
    const first = generateR9();
    const second = generateR9();
    expect(first).toEqual(second);
    expect(first.text.includes('\r')).toBe(false);
    expect(first.text.endsWith('\n')).toBe(true);
    expect(first.text.endsWith('\n\n')).toBe(false);
  });

  it('header comment names R9 and links the server-objects Learn page', () => {
    const text = generateR9().text;
    const recipe = getRecipe('R9');
    expect(text.startsWith(`${headerComment(recipe)}\n`)).toBe(true);
    expect(text).toContain('// R9: Trigger a cloud flow');
    expect(recipe.learnUrl).toBe(
      'https://learn.microsoft.com/en-us/power-pages/configure/server-objects',
    );
    expect(text).toContain(
      '// Learn: https://learn.microsoft.com/en-us/power-pages/configure/server-objects',
    );
  });

  it('structure', () => {
    const text = generateR9().text;
    expect(text).toContain('async function post');
    expect(text).toContain('const parseJsonObject = () => {');
    expect(text).not.toContain('function (');
    expect(text).toContain('await Server.Connector.CloudFlow.TriggerAsync(');
    expect(text).toContain('Server.SiteSetting.Get("CLOUD_FLOW_ID")');
    expect(text).not.toMatch(GUID_LITERAL);
    expect(text.split('\n')).toContain(TO_RESULT);
    expect(text).toContain('let flowResponse = null;');
    expect(text).toContain('flowResponse = r.Body;');
    expect(text).toContain('JSON.stringify({ status: "success", flowResponse })');
    const validation = text.indexOf(
      validationFailureReturn([{ field: 'body', message: 'Body must be a JSON object.' }], '    '),
    );
    const setting = text.indexOf(requireSettingsCode(['CLOUD_FLOW_ID'], '    '));
    const call = text.indexOf('await Server.Connector.CloudFlow.TriggerAsync(');
    expect(validation).toBeGreaterThanOrEqual(0);
    expect(setting).toBeGreaterThan(validation);
    expect(call).toBeGreaterThan(setting);
  });

  it('logging rule', () => {
    const lines = generateR9()
      .text.split('\n')
      .filter((line) => line.includes('Server.Logger.'));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).toMatch(LOGGING_RULE);
      expect(line).not.toMatch(/Body|message|Header|cloudFlowId|payload|(^|[^A-Za-z])Url/);
    }
  });
});
