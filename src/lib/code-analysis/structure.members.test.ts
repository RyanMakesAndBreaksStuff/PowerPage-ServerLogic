import { describe, expect, it } from 'vitest';
import { readsHttpOnlyContext, usedServerMembers } from './structure';

/** The map as sorted-by-first-use entries, so a failure shows the whole picture. */
const used = (code: string): [string, readonly string[]][] => [...usedServerMembers(code)];

describe('usedServerMembers', () => {
  it('records the members of all nine FR-6 objects, in first-use order', () => {
    const code = [
      'async function get() {',
      'Server.Logger.Log("a");',
      'const c = JSON.parse(Server.Context.Input || "{}");',
      'const name = Server.User ? Server.User.fullname : "";',
      'const d = Server.Website.adx_primarydomain;',
      'const s = Server.SiteSetting.Get("Key");',
      'const e = Server.EnvironmentVariable.get("Name");',
      'Server.Connector.Dataverse.RetrieveRecord("accounts", id);',
      'await Server.Connector.HttpClient.GetAsync(url, headers);',
      'await Server.Connector.CloudFlow.TriggerAsync(url, body);',
      '}',
    ].join('\n');
    expect(used(code)).toEqual([
      ['Server.Logger', ['Log']],
      ['Server.Context', ['Input']],
      ['Server.User', ['fullname']],
      ['Server.Website', ['adx_primarydomain']],
      ['Server.SiteSetting', ['Get']],
      ['Server.EnvironmentVariable', ['get']],
      ['Server.Connector.Dataverse', ['RetrieveRecord']],
      ['Server.Connector.HttpClient', ['GetAsync']],
      ['Server.Connector.CloudFlow', ['TriggerAsync']],
    ]);
  });

  it('lists a member once and keeps first-use order', () => {
    const code =
      'Server.Logger.Log(a); Server.Logger.Error(b); Server.Logger.Log(c); Server.Logger.Warn(d);';
    expect(used(code)).toEqual([['Server.Logger', ['Log', 'Error', 'Warn']]]);
  });

  it('records an object referenced without a member, with an empty list', () => {
    expect(used('if (Server.User) { go(); }')).toEqual([['Server.User', []]]);
    expect(used('const d = Server.Connector.Dataverse;')).toEqual([
      ['Server.Connector.Dataverse', []],
    ]);
  });

  it('ignores comments, strings, template text and regex literals, but not template interpolations', () => {
    const code = [
      '// Server.Logger.Log("x");',
      '/* Server.Context.Body */',
      'const a = "Server.Context.Url";',
      'const b = `Server.Context.Headers`;',
      'const r = /Server.Context.Body/;',
      'const c = `${Server.Context.HttpMethod}`;',
    ].join('\n');
    expect(used(code)).toEqual([['Server.Context', ['HttpMethod']]]);
  });

  it('reads bracket access with a string literal, and optional chaining', () => {
    expect(used('Server.Connector["HttpClient"].GetAsync(u, h);')).toEqual([
      ['Server.Connector.HttpClient', ['GetAsync']],
    ]);
    expect(used("Server['Logger']['Log'](a);")).toEqual([['Server.Logger', ['Log']]]);
    expect(
      used('const n = Server.User?.fullname; const q = Server?.Context?.QueryParameters;'),
    ).toEqual([
      ['Server.User', ['fullname']],
      ['Server.Context', ['QueryParameters']],
    ]);
  });

  it('stops at a computed key that is not a string literal', () => {
    expect(used('const v = Server.Context[key];')).toEqual([['Server.Context', []]]);
    expect(used('const v = Server.Context[key].Body;')).toEqual([['Server.Context', []]]);
  });

  it('keeps members the catalogue does not know, and ignores unknown objects', () => {
    expect(used('Server.Logger.Debug(a);')).toEqual([['Server.Logger', ['Debug']]]);
    expect(
      used(
        'Server.Foo.Bar(); Server.Connector.Other.X(); other.Server.Logger.Log(a); Logger.Log(a);',
      ),
    ).toEqual([]);
  });

  it('reads object-pattern destructuring of an object', () => {
    expect(used('const { Body, Url: u, "Headers": h } = Server.Context;')).toEqual([
      ['Server.Context', ['Body', 'Url', 'Headers']],
    ]);
    expect(used('const { Dataverse } = Server.Connector;')).toEqual([
      ['Server.Connector.Dataverse', []],
    ]);
    expect(used('const { Logger } = Server;')).toEqual([['Server.Logger', []]]);
  });

  it('does not follow aliases', () => {
    expect(used('const c = Server.Context; const b = c.Body;')).toEqual([['Server.Context', []]]);
  });

  it('is empty for code with no Server object', () => {
    expect(used('')).toEqual([]);
    expect(used('function get() { return "{}"; }')).toEqual([]);
    expect(used('const c = Server.Connector;')).toEqual([]);
  });

  describe('code that does not parse (read from its tokens)', () => {
    it('finds the same chains, with comments and strings still excluded', () => {
      const code = [
        'function get( {',
        '  // Server.Logger.Warn("x")',
        '  const a = "Server.Context.Url";',
        '  Server.Logger.Log(1); Server.Context.Body;',
        '  Server.Connector["HttpClient"].GetAsync(u, h);',
      ].join('\n');
      expect(used(code)).toEqual([
        ['Server.Logger', ['Log']],
        ['Server.Context', ['Body']],
        ['Server.Connector.HttpClient', ['GetAsync']],
      ]);
    });

    it('skips a Server that is a property of something else, and stops at a computed key', () => {
      expect(used('function get( { x.Server.Logger.Log(1); Server.Context[k].Body; }')).toEqual([
        ['Server.Context', []],
      ]);
    });

    it('uses the tokens read before a tokenizing failure', () => {
      expect(used('Server.Logger.Log("ok"); const s = "unterminated')).toEqual([
        ['Server.Logger', ['Log']],
      ]);
    });

    it('does not read destructured members', () => {
      expect(used('function get( { const { Body } = Server.Context; }')).toEqual([
        ['Server.Context', []],
      ]);
    });
  });
});

describe('readsHttpOnlyContext (AC-4.7)', () => {
  it.each(['Body', 'Headers', 'HttpMethod', 'QueryParameters', 'Url'])(
    '%s is HTTP only',
    (member) => {
      expect(readsHttpOnlyContext(`const v = Server.Context.${member};`)).toBe(true);
    },
  );

  it.each(['Input', 'ActivityId', 'FunctionName', 'ServerLogicName'])(
    '%s is not HTTP only',
    (member) => {
      expect(readsHttpOnlyContext(`const v = Server.Context.${member};`)).toBe(false);
    },
  );

  it('is false for the Liquid-style Input read', () => {
    expect(readsHttpOnlyContext('const input = JSON.parse(Server.Context.Input || "{}");')).toBe(
      false,
    );
  });

  it('counts every way of referencing a member in code', () => {
    expect(readsHttpOnlyContext('const v = Server.Context["Body"];')).toBe(true);
    expect(readsHttpOnlyContext('const v = Server?.Context?.QueryParameters;')).toBe(true);
    expect(readsHttpOnlyContext('const { Url } = Server.Context;')).toBe(true);
    expect(readsHttpOnlyContext('function get() { return JSON.parse(Server.Context.Body); }')).toBe(
      true,
    );
  });

  it('does not count comments, strings or other objects', () => {
    expect(readsHttpOnlyContext('// Server.Context.Body')).toBe(false);
    expect(readsHttpOnlyContext('/* Server.Context.Url */ const a = 1;')).toBe(false);
    expect(readsHttpOnlyContext('const s = "Server.Context.Headers";')).toBe(false);
    expect(readsHttpOnlyContext('const b = Server.User.Body; const c = Other.Context.Body;')).toBe(
      false,
    );
    expect(readsHttpOnlyContext('const v = Server.Context.body;')).toBe(false);
  });

  it('does not count the whole object or a computed key', () => {
    expect(readsHttpOnlyContext('log(Server.Context);')).toBe(false);
    expect(readsHttpOnlyContext('const v = Server.Context[key];')).toBe(false);
  });

  it('reads code that does not parse from its tokens', () => {
    expect(readsHttpOnlyContext('function get( { return Server.Context.QueryParameters; }')).toBe(
      true,
    );
    expect(readsHttpOnlyContext('function get( { // Server.Context.Url\n return 1; }')).toBe(false);
  });

  it('is false for empty code', () => {
    expect(readsHttpOnlyContext('')).toBe(false);
  });
});
