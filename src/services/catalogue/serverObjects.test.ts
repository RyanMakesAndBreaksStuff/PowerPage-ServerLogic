import { describe, expect, it } from 'vitest';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
import {
  planInsertion,
  readsHttpOnlyContext,
  usedServerMembers,
} from '@/lib/code-analysis/structure';
import { NOT_DOCUMENTED, SERVER_OBJECTS, isConnector } from './serverObjects';
import type { ObjectMember, ServerObject } from './serverObjects';

// FR-6's table, in order.
const FR6: readonly (readonly [string, readonly string[]])[] = [
  ['Server.Logger', ['Log', 'Warn', 'Error']],
  [
    'Server.Context',
    [
      'ActivityId',
      'Body',
      'FunctionName',
      'Headers',
      'HttpMethod',
      'Input',
      'QueryParameters',
      'ServerLogicName',
      'Url',
    ],
  ],
  ['Server.User', ['fullname']],
  [
    'Server.Connector.Dataverse',
    [
      'CreateRecord',
      'RetrieveRecord',
      'RetrieveMultipleRecords',
      'UpdateRecord',
      'DeleteRecord',
      'InvokeCustomApi',
    ],
  ],
  [
    'Server.Connector.HttpClient',
    ['GetAsync', 'PostAsync', 'PutAsync', 'PatchAsync', 'DeleteAsync'],
  ],
  ['Server.Connector.CloudFlow', ['TriggerAsync']],
  ['Server.Website', ['adx_primarydomain']],
  ['Server.SiteSetting', ['Get']],
  ['Server.EnvironmentVariable', ['get']],
];

const HANDLER = 'function get() {\n  return "{}";\n}\n';

function object(path: string): ServerObject {
  const found = SERVER_OBJECTS.find((o) => o.path === path);
  if (found === undefined) throw new Error(`no object ${path}`);
  return found;
}

function member(path: string, name: string): ObjectMember {
  const found = object(path).members.find((m) => m.name === name);
  if (found === undefined) throw new Error(`no member ${path}.${name}`);
  return found;
}

const ALL = SERVER_OBJECTS.flatMap((o) =>
  o.members.flatMap((m) => m.samples.map((s) => ({ object: o, member: m, sample: s }))),
);

describe('SERVER_OBJECTS (FR-6)', () => {
  it('lists the nine objects and their Learn members in order', () => {
    expect(SERVER_OBJECTS.map((o) => [o.path, o.members.map((m) => m.name)])).toEqual(FR6);
  });

  it('gives every object and member a description, and every member a signature naming it', () => {
    for (const o of SERVER_OBJECTS) {
      expect(o.description).not.toBe('');
      for (const m of o.members) {
        expect(m.description).not.toBe('');
        for (const signature of m.signatures) expect(signature.startsWith(m.name)).toBe(true);
      }
    }
  });

  it("lists Learn's overloads (options and skipCache)", () => {
    expect(member('Server.Connector.Dataverse', 'RetrieveRecord').signatures).toEqual([
      'RetrieveRecord(entitySetName, id)',
      'RetrieveRecord(entitySetName, id, options)',
      'RetrieveRecord(entitySetName, id, options, skipCache)',
    ]);
    expect(member('Server.Connector.Dataverse', 'RetrieveMultipleRecords').signatures).toHaveLength(
      3,
    );
  });

  it('marks properties: Context, User.fullname and Website.adx_primarydomain', () => {
    const properties = SERVER_OBJECTS.flatMap((o) =>
      o.members.filter((m) => m.kind === 'property').map((m) => `${o.path}.${m.name}`),
    );
    expect(properties).toEqual([
      ...object('Server.Context').members.map((m) => `Server.Context.${m.name}`),
      'Server.User.fullname',
      'Server.Website.adx_primarydomain',
    ]);
  });

  it('shows a return type only where Learn documents one (correction 11)', () => {
    for (const o of SERVER_OBJECTS) {
      for (const m of o.members) {
        if (isConnector(o)) {
          expect(m.returns).toContain('IsSuccessStatusCode');
          expect(m.returns?.includes('Headers')).toBe(o.path !== 'Server.Connector.CloudFlow');
        } else if (o.path === 'Server.User') {
          expect(m.returns).toBe('null when the caller is anonymous');
        } else {
          expect(m.returns).toBeNull();
        }
      }
    }
    expect(NOT_DOCUMENTED).toBe('Not documented on Learn');
  });

  it('marks HttpClient and CloudFlow async and Dataverse sync (corrections 7 and 19)', () => {
    for (const { object: o, member: m, sample } of ALL) {
      const expected =
        o.path === 'Server.Connector.Dataverse' ? 'sync' : isConnector(o) ? 'async' : null;
      expect(m.timing).toBe(expected);
      expect(/\bawait\b/.test(sample.code)).toBe(expected === 'async');
    }
  });

  it('marks each Context member by invocation context (correction 13)', () => {
    const marks = Object.fromEntries(
      object('Server.Context').members.map((m) => [m.name, m.context]),
    );
    expect(marks).toEqual({
      ActivityId: 'both',
      Body: 'http',
      FunctionName: 'both',
      Headers: 'http',
      HttpMethod: 'http',
      Input: 'liquid',
      QueryParameters: 'http',
      ServerLogicName: 'both',
      Url: 'http',
    });
    for (const o of SERVER_OBJECTS.filter((x) => x.path !== 'Server.Context')) {
      for (const m of o.members) expect(m.context).toBeNull();
    }
  });

  it("a Context member's samples read an HTTP-only property exactly when it is HTTP only (AC-4.7)", () => {
    for (const m of object('Server.Context').members) {
      for (const s of m.samples) expect(readsHttpOnlyContext(s.code)).toBe(m.context === 'http');
    }
  });

  it('has the sample variants FR-6 names', () => {
    const labels = (path: string, name: string): string[] =>
      member(path, name).samples.map((s) => s.label);
    expect(labels('Server.Connector.Dataverse', 'RetrieveMultipleRecords')).toEqual([
      'Filter by account',
      'Top N',
      'Expand lookup',
    ]);
    expect(labels('Server.Connector.Dataverse', 'InvokeCustomApi')).toEqual([
      'Bound function',
      'Bound action',
      'Unbound action',
    ]);
    expect(labels('Server.Context', 'HttpMethod')).toEqual(['Example', 'Request info']);
    for (const m of object('Server.Connector.HttpClient').members) {
      expect(m.samples).toHaveLength(1);
    }
  });

  it('passes OData options without a leading "?" (correction 6)', () => {
    for (const { sample } of ALL) expect(sample.code).not.toMatch(/"\?\$/);
  });

  it('passes a supported contentType on every HttpClient body call (correction 12)', () => {
    for (const m of object('Server.Connector.HttpClient').members) {
      const code = m.samples[0].code;
      if (m.signatures[0].includes('body')) expect(code).toContain('"application/json"');
    }
  });

  it('reads only fullname from Server.User, and guards null (corrections 16 and 21)', () => {
    for (const { sample } of ALL) {
      expect(sample.code).not.toMatch(/\b(contactid|parentcustomerid|Roles)\b/);
      if (sample.code.includes('Server.User')) expect(sample.code).toContain('Server.User ?');
    }
  });

  it('stores samples with LF line ends and no surrounding blank lines', () => {
    for (const { sample } of ALL) {
      expect(sample.code).not.toContain('\r');
      expect(sample.code).toBe(sample.code.trim());
    }
  });

  it('each sample references its own object and member (FR-6 used detection)', () => {
    for (const { object: o, member: m, sample } of ALL) {
      expect(usedServerMembers(sample.code).get(o.path)).toContain(m.name);
    }
  });
});

describe('every sample is insertable and has zero FR-4 hits (AC-3.2, AC-6.8)', () => {
  it.each(ALL.map((x) => [`${x.object.path}.${x.member.name} · ${x.sample.label}`, x.sample.code]))(
    '%s',
    (_name, code) => {
      expect(runBrowserChecks(code).hits).toEqual([]);
      const inserted = planInsertion(HANDLER, code, null, 'get');
      if (!inserted.ok) throw new Error(`insert failed: ${inserted.reason}`);
      expect(runBrowserChecks(inserted.text)).toEqual({ hits: [], parseFailed: false });
    },
  );
});
