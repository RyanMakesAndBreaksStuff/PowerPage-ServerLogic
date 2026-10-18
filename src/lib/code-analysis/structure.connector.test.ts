import { describe, expect, it } from 'vitest';
import type { ConnectorUse } from './codeAnalysis.types';
import { detectConnectorUse } from './structure';

const uses = (dataverse: boolean, httpClient: boolean, undetermined: boolean): ConnectorUse => ({
  dataverse,
  httpClient,
  undetermined,
});

// FR-7's fixtures table, row by row. The spec writes the arguments as an ellipsis; these use real ones.
const FIXTURES: readonly { row: string; code: string; expected: ConnectorUse }[] = [
  {
    row: 'Server.Connector.Dataverse.RetrieveRecord(...)',
    code: 'Server.Connector.Dataverse.RetrieveRecord("accounts", id, "$select=name");',
    expected: uses(true, false, false),
  },
  {
    row: 'Server.Connector["HttpClient"]',
    code: 'Server.Connector["HttpClient"].GetAsync(url, headers);',
    expected: uses(false, true, false),
  },
  {
    row: 'const c = Server.Connector; c[name](...)',
    code: 'const c = Server.Connector; c[name](url);',
    expected: uses(false, false, true),
  },
  {
    row: 'const { Connector } = Server;',
    code: 'const { Connector } = Server;',
    expected: uses(false, false, true),
  },
  {
    row: '// Server.Connector.Dataverse only',
    code: '// Server.Connector.Dataverse',
    expected: uses(false, false, false),
  },
];

describe('detectConnectorUse: the FR-7 fixtures table', () => {
  it.each(FIXTURES)('$row', ({ code, expected }) => {
    expect(detectConnectorUse(code)).toEqual(expected);
  });
});

describe('detectConnectorUse: uses', () => {
  it.each<readonly [string, string, ConnectorUse]>([
    ['empty code', '', uses(false, false, false)],
    ['HttpClient, dotted', 'Server.Connector.HttpClient.GetAsync(u, h);', uses(false, true, false)],
    [
      'both connectors in one file',
      'Server.Connector.Dataverse.X(); Server.Connector.HttpClient.Y();',
      uses(true, true, false),
    ],
    ['single-quoted bracket', "Server.Connector['Dataverse'].X();", uses(true, false, false)],
    [
      'bracket at both steps',
      'Server["Connector"]["HttpClient"].GetAsync(u, h);',
      uses(false, true, false),
    ],
    [
      'alias of a dotted path',
      'const d = Server.Connector.Dataverse; d.RetrieveRecord("a", i);',
      uses(true, false, false),
    ],
    [
      'destructured name; Connector ends the chain',
      'const { Dataverse } = Server.Connector;',
      uses(true, false, true),
    ],
    [
      'name held in a string; computed key',
      'const k = "HttpClient"; Server.Connector[k].GetAsync(u, h);',
      uses(false, true, true),
    ],
    ['Server[k]', 'Server[k].Dataverse.X();', uses(true, false, true)],
    ['Server.Connector[name]', 'Server.Connector[name](u);', uses(false, false, true)],
    ['Server on its own', 'const s = Server;', uses(false, false, true)],
    [
      'optional chaining is not a plain dot',
      'Server?.Connector?.Dataverse.X();',
      uses(true, false, true),
    ],
    [
      'template literal in brackets is not a string literal',
      'Server.Connector[`Dataverse`].X();',
      uses(false, false, true),
    ],
    ['Dataverse in a string argument', 'Server.Logger.Log("Dataverse");', uses(true, false, false)],
  ])('%s', (_name, code, expected) => {
    expect(detectConnectorUse(code)).toEqual(expected);
  });

  it('ignores line comments, block comments and regex literals', () => {
    const code = [
      '/* Server.Connector.Dataverse */',
      '// Server.Connector.HttpClient',
      'const r = /Dataverse|HttpClient/;',
      'const n = 1;',
    ].join('\n');
    expect(detectConnectorUse(code)).toEqual(uses(false, false, false));
  });

  it('needs the whole token: longer identifiers and property-less text do not count', () => {
    expect(
      detectConnectorUse('DataverseHelper(); myHttpClient.go(); const s = "HttpClients";'),
    ).toEqual(uses(false, false, false));
  });

  it('counts a Server or Connector token anywhere, including a property key', () => {
    expect(detectConnectorUse('const o = { Server: 1 };')).toEqual(uses(false, false, true));
  });

  it('reads code that tokenizes but does not parse', () => {
    expect(detectConnectorUse('function get( { Server.Connector.Dataverse.X() }')).toEqual(
      uses(true, false, false),
    );
  });

  it('is null when tokenizing fails', () => {
    expect(detectConnectorUse('const s = "Dataverse')).toBeNull();
    expect(detectConnectorUse('/* Dataverse')).toBeNull();
    expect(detectConnectorUse('const t = `Dataverse')).toBeNull();
  });
});
