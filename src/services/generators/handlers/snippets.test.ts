import { describe, expect, it } from 'vitest';
import { EXAMPLE_GUID, RECIPES, getRecipe } from '@/services/catalogue/recipes';
import {
  GUID_PATTERN,
  IS_GUID,
  TO_RESULT,
  VALIDATION_MESSAGE,
  failureReturn,
  headerComment,
  logLine,
  requireSettingsCode,
  settingVar,
  validationFailureReturn,
  validationFailureReturnFor,
} from '@/services/generators/handlers/snippets';

describe('constants', () => {
  it('TO_RESULT is the exact correction-11 line', () => {
    expect(TO_RESULT).toBe('const toResult = r => typeof r === "string" ? JSON.parse(r) : r;');
  });

  it('GUID_PATTERN is the FR-3 GUID regex source', () => {
    expect(GUID_PATTERN).toBe('^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$');
    const re = new RegExp(GUID_PATTERN);
    expect(re.test(EXAMPLE_GUID)).toBe(true);
    expect(re.test('A1b2C3d4-0000-1111-2222-333344445555')).toBe(true);
    expect(re.test('not-a-guid')).toBe(false);
    expect(re.test('00000000000000000000000000000000')).toBe(false);
    expect(re.test(`${EXAMPLE_GUID} `)).toBe(false);
  });

  it('IS_GUID embeds the pattern as a regex literal', () => {
    expect(IS_GUID).toBe(
      'const isGuid = s => typeof s === "string" && /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(s);',
    );
  });

  it('VALIDATION_MESSAGE is fixed', () => {
    expect(VALIDATION_MESSAGE).toBe("The request isn't valid.");
  });
});

describe('headerComment (AC-3.3, AC-3.10)', () => {
  it('R1 to R3 have a name line only', () => {
    expect(headerComment(getRecipe('R1'))).toBe('// R1: Read Dataverse records');
    expect(headerComment(getRecipe('R3'))).toBe('// R3: Call an external API');
  });

  it('R4 links its Learn tutorial', () => {
    expect(headerComment(getRecipe('R4'))).toBe(
      [
        '// R4: Dataverse CRUD',
        '// Learn: https://learn.microsoft.com/en-us/power-pages/configure/server-logic-operations',
      ].join('\n'),
    );
  });

  it('R7 links the tutorial and the GitHub sample package', () => {
    expect(headerComment(getRecipe('R7'))).toBe(
      [
        '// R7: Microsoft Graph & SharePoint',
        '// Learn: https://learn.microsoft.com/en-us/power-pages/configure/server-logic-graph-sharepoint',
        '// Sample package: https://github.com/microsoft/power-pages-samples/tree/main/samples/server-logic/sharepoint-integration',
      ].join('\n'),
    );
  });

  it('every R4 to R10 header contains the recipe Learn URL; every header line is a comment', () => {
    for (const r of RECIPES) {
      const text = headerComment(r);
      if (r.id !== 'R1' && r.id !== 'R2' && r.id !== 'R3') {
        expect(r.learnUrl).not.toBeNull();
        expect(text).toContain(r.learnUrl ?? '');
      }
      for (const line of text.split('\n')) expect(line.startsWith('// ')).toBe(true);
    }
  });

  it('is deterministic', () => {
    for (const r of RECIPES) expect(headerComment(r)).toBe(headerComment(r));
  });
});

describe('settingVar', () => {
  it.each<[string, string]>([
    ['ExternalApi/BaseUrl', 'externalApiBaseUrl'],
    ['AZURE_FUNCTION_URL', 'azureFunctionUrl'],
    ['CLIENT_ID', 'clientId'],
    ['CLIENT_SECRET', 'clientSecret'],
    ['TENANT_ID', 'tenantId'],
    ['HOSTNAME', 'hostname'],
    ['SITE_PATH', 'sitePath'],
    ['CLOUD_FLOW_ID', 'cloudFlowId'],
  ])('%s becomes %s', (name, expected) => {
    expect(settingVar(name)).toBe(expected);
  });

  it('rejects a name that cannot form an identifier', () => {
    expect(() => settingVar('1/2')).toThrow();
    expect(() => settingVar('///')).toThrow();
  });

  it('every catalogue site setting maps to a distinct variable', () => {
    const all = RECIPES.flatMap((r) => r.siteSettings);
    expect(new Set(all.map(settingVar)).size).toBe(all.length);
  });
});

describe('requireSettingsCode (FR-3 missing-setting Must, F57)', () => {
  it('emits the read, the exact log text and the exact return text', () => {
    expect(requireSettingsCode(['ExternalApi/BaseUrl'], '  ')).toBe(
      [
        '  const externalApiBaseUrl = Server.SiteSetting.Get("ExternalApi/BaseUrl");',
        '  if (!externalApiBaseUrl) {',
        '    Server.Logger.Error("Missing site setting ExternalApi/BaseUrl");',
        '    return JSON.stringify({ status: "error", message: "Server logic isn\'t configured: missing site setting ExternalApi/BaseUrl" });',
        '  }',
      ].join('\n'),
    );
  });

  it('emits one block per setting, in order, with no indent when asked', () => {
    const text = requireSettingsCode(['CLIENT_ID', 'TENANT_ID'], '');
    expect(text.split('\n')).toHaveLength(10);
    expect(text.indexOf('clientId')).toBeLessThan(text.indexOf('tenantId'));
    expect(text.startsWith('const clientId = Server.SiteSetting.Get("CLIENT_ID");')).toBe(true);
  });

  it('returns an empty string for no settings', () => {
    expect(requireSettingsCode([], '  ')).toBe('');
  });

  it('rejects two settings that would share a variable name', () => {
    expect(() => requireSettingsCode(['A/B', 'A_B'], '')).toThrow();
  });

  it('never logs the setting value, only its name', () => {
    const text = requireSettingsCode(['CLIENT_SECRET'], '');
    const logLines = text.split('\n').filter((l) => l.includes('Server.Logger'));
    expect(logLines).toEqual(['  Server.Logger.Error("Missing site setting CLIENT_SECRET");']);
  });
});

describe('failure returns (return shape, FR-3)', () => {
  it('failureReturn', () => {
    expect(failureReturn("Couldn't connect to SharePoint.")).toBe(
      'return JSON.stringify({ status: "error", message: "Couldn\'t connect to SharePoint." });',
    );
    expect(failureReturn('x', '    ')).toBe(
      '    return JSON.stringify({ status: "error", message: "x" });',
    );
  });

  it('failureReturn escapes quotes and backslashes through JSON.stringify', () => {
    expect(failureReturn('say "hi" \\ now')).toBe(
      'return JSON.stringify({ status: "error", message: "say \\"hi\\" \\\\ now" });',
    );
  });

  it('validationFailureReturn adds errors: [{ field, message }]', () => {
    expect(
      validationFailureReturn([{ field: 'body', message: 'Body must be a JSON object.' }], '  '),
    ).toBe(
      `  return JSON.stringify({ status: "error", message: "The request isn't valid.", errors: [{ field: "body", message: "Body must be a JSON object." }] });`,
    );
  });

  it('validationFailureReturn lists several errors in order', () => {
    const text = validationFailureReturn([
      { field: 'name', message: 'Name is required.' },
      { field: 'email', message: 'Email is not valid.' },
    ]);
    expect(text).toContain(
      'errors: [{ field: "name", message: "Name is required." }, { field: "email", message: "Email is not valid." }]',
    );
  });

  it('validationFailureReturnFor returns a runtime errors array', () => {
    expect(validationFailureReturnFor('errors', '  ')).toBe(
      `  return JSON.stringify({ status: "error", message: "The request isn't valid.", errors: errors });`,
    );
    expect(() => validationFailureReturnFor('errors; evil()')).toThrow();
  });
});

describe('logLine (FR-3 logging rule, F09)', () => {
  it('logs a fixed operation name only', () => {
    expect(logLine({ level: 'Log', operation: 'R4 get', indent: '  ' })).toBe(
      '  Server.Logger.Log("R4 get");',
    );
  });

  it('logs StatusCode and ReasonPhrase for connector failures', () => {
    expect(logLine({ level: 'Error', operation: 'R7 upload', fields: ['status', 'reason'] })).toBe(
      'Server.Logger.Error("R7 upload" + " " + r.StatusCode + " " + r.ReasonPhrase);',
    );
  });

  it('logs e.name for caught exceptions and honours variable names', () => {
    expect(logLine({ level: 'Error', operation: 'R4 post', fields: ['exception'] })).toBe(
      'Server.Logger.Error("R4 post" + " " + e.name);',
    );
    expect(
      logLine({
        level: 'Warn',
        operation: 'R9 trigger',
        fields: ['status'],
        result: 'flow',
        error: 'err',
      }),
    ).toBe('Server.Logger.Warn("R9 trigger" + " " + flow.StatusCode);');
  });

  it('logs the ActivityId', () => {
    expect(
      logLine({
        level: 'Error',
        operation: 'R7 create after upload',
        fields: ['status', 'reason', 'activity'],
      }),
    ).toBe(
      'Server.Logger.Error("R7 create after upload" + " " + r.StatusCode + " " + r.ReasonPhrase + " " + Server.Context.ActivityId);',
    );
  });

  it('emits the operation as a JSON string literal', () => {
    expect(logLine({ level: 'Log', operation: 'a"b' })).toBe('Server.Logger.Log("a\\"b");');
  });

  it('never emits Body, e.message or any other member', () => {
    const all = logLine({
      level: 'Error',
      operation: 'op',
      fields: ['status', 'reason', 'exception', 'activity'],
    });
    expect(all).not.toMatch(/\.Body|\.message|\.Headers|Url|Token/);
  });

  it('rejects a result or error name that is not an identifier', () => {
    expect(() =>
      logLine({ level: 'Error', operation: 'x', fields: ['status'], result: 'r; evil()' }),
    ).toThrow();
    expect(() =>
      logLine({ level: 'Error', operation: 'x', fields: ['exception'], error: 'e.x' }),
    ).toThrow();
  });
});

describe('golden: a composed sample', () => {
  it('matches the committed text byte for byte', () => {
    const sample = [
      headerComment(getRecipe('R6')),
      'async function get() {',
      requireSettingsCode(['AZURE_FUNCTION_URL'], '  '),
      logLine({ level: 'Error', operation: 'R6 call', fields: ['status', 'reason'], indent: '  ' }),
      failureReturn("Couldn't call the function.", '  '),
      '}',
    ].join('\n');
    const golden = [
      '// R6: Call an Azure Function',
      '// Learn: https://learn.microsoft.com/en-us/power-pages/configure/server-logic-azure-function',
      'async function get() {',
      '  const azureFunctionUrl = Server.SiteSetting.Get("AZURE_FUNCTION_URL");',
      '  if (!azureFunctionUrl) {',
      '    Server.Logger.Error("Missing site setting AZURE_FUNCTION_URL");',
      `    return JSON.stringify({ status: "error", message: "Server logic isn't configured: missing site setting AZURE_FUNCTION_URL" });`,
      '  }',
      '  Server.Logger.Error("R6 call" + " " + r.StatusCode + " " + r.ReasonPhrase);',
      `  return JSON.stringify({ status: "error", message: "Couldn't call the function." });`,
      '}',
    ].join('\n');
    expect(sample).toBe(golden);
  });
});
