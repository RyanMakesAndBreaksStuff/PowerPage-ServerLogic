// @vitest-environment node
import { detectConnectorUse, exportedFunctionNames } from '@/lib/code-analysis/structure';
import { getRecipe } from '@/services/catalogue/recipes';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { R4_DIFFERENCES, generateR4 } from './r4';
import { headerComment } from './snippets';
import { assertZeroHits, loggingGuardViolations, readGolden } from './tutorial.testkit';

/** 1-based lines in R4.js.txt that call Server.Connector.Dataverse. */
const HIGHLIGHTS: readonly number[] = [91, 105, 134, 164, 187];

describe('R4 handler', () => {
  it('matches the golden file', () => {
    expect(generateR4().text).toBe(readGolden('R4.js.txt'));
  });

  it('highlights every Server.Connector call and no other line', () => {
    const { text, highlightLines } = generateR4();
    expect(highlightLines).toEqual([...HIGHLIGHTS]);
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      const listed = HIGHLIGHTS.includes(index + 1);
      expect(line.includes('Server.Connector.'), `line ${String(index + 1)}`).toBe(listed);
    });
  });

  it('is LF and ends with one newline', () => {
    const { text } = generateR4();
    expect(text.includes('\r')).toBe(false);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.includes('${')).toBe(false);
  });

  it('exports get, post, put and del', () => {
    expect(exportedFunctionNames(generateR4().text)).toEqual(['get', 'post', 'put', 'del']);
  });

  it('uses the Dataverse connector only', () => {
    expect(detectConnectorUse(generateR4().text)).toEqual({
      dataverse: true,
      httpClient: false,
      undetermined: false,
    });
  });

  it('is synchronous', () => {
    const { text } = generateR4();
    expect(text.includes('await')).toBe(false);
    expect(text.includes('async')).toBe(false);
    expect(text).toContain('toResult(');
    expect(text).toContain('IsSuccessStatusCode');
  });

  it('starts with the R4 header comment', () => {
    const header = headerComment(getRecipe('R4'));
    expect(generateR4().text.startsWith(`${header}\n\n`)).toBe(true);
  });

  it('rejects a table outside the allowlist', () => {
    const { text } = generateR4();
    expect(text).toContain('const ALLOWED_ENTITY_SETS = ["contacts"];');
    expect(text).toContain('field: "entitySetName"');
    expect(text).toContain('not in the allowlist');
    expect(text).not.toContain('"accounts"');
  });

  it('rejects a non-GUID id', () => {
    const { text } = generateR4();
    expect(text).toContain('isGuid(');
    expect(text).toContain('field: "id"');
  });

  it('returns the created id from entityId or entityid', () => {
    expect(generateR4().text).toContain('r.Headers && (r.Headers.entityid ?? r.Headers.entityId)');
  });

  it('does not bind an account or read Server.User', () => {
    const { text } = generateR4();
    expect(text).not.toContain('@odata.bind');
    expect(text).not.toContain('Server.User');
  });

  it('logs only what the logging rule allows', () => {
    expect(loggingGuardViolations(generateR4().text)).toEqual([]);
  });

  it('has zero FR-4 hits', () => {
    assertZeroHits(generateR4().text);
  });

  it.each(['post', 'put'])('%s drops body keys containing @ before the connector call', (name) => {
    const sent: unknown[] = [];
    const reply = {
      StatusCode: 204,
      Body: '',
      IsSuccessStatusCode: true,
      ReasonPhrase: 'No Content',
      Headers: { entityid: 'rec-1' },
    };
    const record = (...args: unknown[]): typeof reply => {
      sent.push(args[args.length - 1]);
      return reply;
    };
    const log = (): void => undefined;
    const sandbox = {
      Server: {
        Context: {
          ActivityId: 'act-1',
          QueryParameters: { entitySetName: 'contacts', id: '00000000-0000-0000-0000-000000000001' },
          Body: JSON.stringify({
            firstname: 'Ada',
            'parentcustomerid_account@odata.bind': '/accounts(00000000-0000-0000-0000-000000000002)',
            'firstname@OData.Community.Display.V1.FormattedValue': 'x',
          }),
        },
        Logger: { Log: log, Warn: log, Error: log },
        Connector: { Dataverse: { CreateRecord: record, UpdateRecord: record } },
      },
    };
    createContext(sandbox);
    runInContext(generateR4().text, sandbox);
    const text: unknown = runInContext(`${name}()`, sandbox);
    expect(typeof text === 'string' ? JSON.parse(text) : text).toMatchObject({ status: 'success' });
    expect(sent).toHaveLength(1);
    const body = sent[0];
    expect(typeof body === 'string' ? JSON.parse(body) : body).toEqual({ firstname: 'Ada' });
  });

  it('lists non-empty differences from Learn', () => {
    expect(R4_DIFFERENCES.length).toBeGreaterThan(0);
    for (const row of R4_DIFFERENCES) {
      expect(row.change.length).toBeGreaterThan(0);
      expect(row.reason.length).toBeGreaterThan(0);
    }
  });
});
