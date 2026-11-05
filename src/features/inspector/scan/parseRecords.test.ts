import { describe, expect, it } from 'vitest';
import { HostReadError } from '@/services/pptb/host.types';
import {
  parseComponentRow,
  parseDefinition,
  parsePermissions,
  parseRoles,
  parseServerLogic,
  parseSettings,
  parseSites,
  pickEnvVarValue,
} from './parseRecords';

function row(id: string, name: string, content: unknown, statecode = 0): Record<string, unknown> {
  return { powerpagecomponentid: id, name, statecode, content: JSON.stringify(content) };
}

const DEFINITION_ID = '0a1b2c3d-0000-4000-8000-000000000002';

describe('parseComponentRow', () => {
  it('validates the envelope and parses content', () => {
    expect(parseComponentRow(row('a', 'n', { x: 1 }))).toEqual({
      id: 'a',
      name: 'n',
      active: true,
      content: { x: 1 },
    });
    expect(parseComponentRow(row('a', 'n', {}, 1))?.active).toBe(false);
  });

  it.each([
    ['not an object', 'text'],
    ['an array', []],
    ['no id', { name: 'n', statecode: 0, content: '{}' }],
    ['an empty id', { powerpagecomponentid: '', name: 'n', statecode: 0, content: '{}' }],
    ['no name', { powerpagecomponentid: 'a', statecode: 0, content: '{}' }],
    ['an unknown state', { powerpagecomponentid: 'a', name: 'n', statecode: 2, content: '{}' }],
  ])('refuses a row that is %s', (_label, raw) => {
    expect(parseComponentRow(raw)).toBeNull();
  });

  it.each([['{not json'], ['[1]'], ['"text"'], [null], [5]])(
    'keeps the row but reports unreadable content %j',
    (content) => {
      const parsed = parseComponentRow({ powerpagecomponentid: 'a', name: 'n', statecode: 0, content });
      expect(parsed).toMatchObject({ id: 'a', content: null });
    },
  );
});

describe('parseSites', () => {
  it('maps sites in the given order and reads a missing domain as empty', () => {
    const rows = [
      { powerpagesiteid: 's1', name: 'B', primarydomainname: 'b.example.com', statecode: 0 },
      { powerpagesiteid: 's2', name: 'A', primarydomainname: null, statecode: 1 },
    ];
    expect(parseSites(rows)).toEqual([
      { id: 's1', name: 'B', domain: 'b.example.com', active: true },
      { id: 's2', name: 'A', domain: '', active: false },
    ]);
  });

  it('fails the whole list when one row cannot be read', () => {
    expect(() => parseSites([{ powerpagesiteid: 's1', name: 'B', statecode: 0 }, { name: 'x' }])).toThrow(
      HostReadError,
    );
  });
});

describe('parseServerLogic', () => {
  it('reads the role link from content and keeps inactive records', () => {
    const { records, skipped } = parseServerLogic([
      row('f1', 'one', { adx_serverlogic_adx_webrole: ['r1', 'r2'] }),
      row('f2', 'two', { display_name: 'no link key' }, 1),
    ]);
    expect(skipped).toBe(0);
    expect(records).toEqual([
      { id: 'f1', name: 'one', active: true, roleIds: { ok: true, value: ['r1', 'r2'] } },
      { id: 'f2', name: 'two', active: false, roleIds: { ok: true, value: [] } },
    ]);
  });

  it('marks the role link unreadable, not empty, when content or the link is malformed', () => {
    const { records } = parseServerLogic([
      { powerpagecomponentid: 'f1', name: 'one', statecode: 0, content: '{not json' },
      row('f2', 'two', { adx_serverlogic_adx_webrole: 'r1' }),
      row('f3', 'three', { adx_serverlogic_adx_webrole: ['r1', 2] }),
    ]);
    expect(records.map((record) => record.roleIds)).toEqual([
      { ok: false, reason: 'read-failed' },
      { ok: false, reason: 'read-failed' },
      { ok: false, reason: 'read-failed' },
    ]);
  });

  it('skips and counts a row without a readable id, name or state', () => {
    const { records, skipped } = parseServerLogic([{ name: 'x' }, row('f1', 'one', {})]);
    expect(records.map((record) => record.id)).toEqual(['f1']);
    expect(skipped).toBe(1);
  });
});

describe('parseRoles', () => {
  it('defaults an absent flag to false', () => {
    expect(parseRoles([row('r1', 'a', { anonymoususersrole: true }), row('r2', 'b', {})])).toEqual({
      items: [
        { id: 'r1', name: 'a', anonymous: true, authenticated: false },
        { id: 'r2', name: 'b', anonymous: false, authenticated: false },
      ],
      unreadable: [],
    });
  });

  it.each([
    ['a non-boolean flag', row('r1', 'a', { anonymoususersrole: 'yes' }), 'r1', 'a'],
    ['unreadable content', { powerpagecomponentid: 'r1', name: 'a', statecode: 0, content: '{x' }, 'r1', 'a'],
    ['empty content', { powerpagecomponentid: 'r1', name: 'a', statecode: 0, content: '' }, 'r1', 'a'],
    ['an unreadable envelope', { name: 'a' }, '', 'a'],
    ['no readable id or name', 'text', '', ''],
  ])('skips a role row with %s, keeps the others and reports it', (_label, bad, id, name) => {
    const parsed = parseRoles([row('r0', 'ok', {}), bad]);
    expect(parsed.items.map((role) => role.id)).toEqual(['r0']);
    expect(parsed.unreadable).toEqual([{ type: 11, id, name }]);
  });
});

describe('parsePermissions', () => {
  it('maps scope, privileges, roles and the parent link', () => {
    const parsed = parsePermissions([
      row('p1', 'top', {
        scope: 756150001,
        entitylogicalname: 'contact',
        read: true,
        write: true,
        create: false,
        delete: false,
        append: true,
        appendto: true,
        adx_entitypermission_webrole: ['r1'],
      }),
      row(
        'p2',
        'child',
        { scope: 756150003, entitylogicalname: 'account', parententitypermission: 'p1', read: true },
        1,
      ),
    ]);
    expect(parsed.unreadable).toEqual([]);
    expect(parsed.items).toEqual(
      [
        {
          id: 'p1',
          name: 'top',
          table: 'contact',
          scope: 'Contact',
          privileges: ['Read', 'Write', 'Append', 'AppendTo'],
          roleIds: ['r1'],
          active: true,
          parentId: null,
        },
        {
          id: 'p2',
          name: 'child',
          table: 'account',
          scope: 'Parent',
          privileges: ['Read'],
          roleIds: [],
          active: false,
          parentId: 'p1',
        },
      ],
    );
  });

  it.each([
    [756150000, 'Global'],
    [756150001, 'Contact'],
    [756150002, 'Account'],
    [756150003, 'Parent'],
    [756150004, 'Self'],
  ])('reads scope %i as %s', (scope, expected) => {
    const parsed = parsePermissions([row('p1', 'p', { scope, entitylogicalname: 'contact' })]);
    expect(parsed.items[0]?.scope).toBe(expected);
  });

  it.each([[756150005], ['756150000'], [null], [undefined]])('reads scope %j as unknown', (scope) => {
    const parsed = parsePermissions([row('p1', 'p', { scope, entitylogicalname: 'contact' })]);
    expect(parsed.items[0]?.scope).toBeNull();
  });

  it.each([
    ['a missing table name', { read: true }],
    ['a non-string table name', { entitylogicalname: 7 }],
    ['a non-boolean privilege', { entitylogicalname: 'contact', read: 'true' }],
    ['a non-array role link', { entitylogicalname: 'contact', adx_entitypermission_webrole: 'r1' }],
    ['a non-string parent link', { entitylogicalname: 'contact', parententitypermission: 7 }],
  ])('skips a permission row with %s and reports it', (_label, content) => {
    const parsed = parsePermissions([row('p0', 'ok', { entitylogicalname: 'contact' }), row('p1', 'p', content)]);
    expect(parsed.items.map((permission) => permission.id)).toEqual(['p0']);
    expect(parsed.unreadable).toEqual([{ type: 18, id: 'p1', name: 'p' }]);
  });

  it('skips a row with unreadable or empty content and keeps the good rows', () => {
    const good = row('p0', 'ok', { entitylogicalname: 'contact' });
    for (const content of ['{x', '']) {
      const bad = { powerpagecomponentid: 'p1', name: 'p', statecode: 0, content };
      const parsed = parsePermissions([good, bad]);
      expect(parsed.items.map((permission) => permission.id)).toEqual(['p0']);
      expect(parsed.unreadable).toEqual([{ type: 18, id: 'p1', name: 'p' }]);
    }
  });
});

describe('parseSettings', () => {
  const named = (name: string, content: unknown, statecode = 0): Record<string, unknown> =>
    row(`id-${name}-${String(statecode)}`, name, content, statecode);

  it('matches by trimmed, case-insensitive name and ignores every other row', () => {
    const parsed = parseSettings([
      named('Footer/OutputCache/Enabled', { value: 'True' }),
      { name: 5 },
      named('  serverlogic/ALLOWEDDOMAINS ', { value: 'a.example.com', source: 0 }),
    ]);
    expect(parsed?.bindings['ServerLogic/AllowedDomains']).toEqual({ kind: 'value', raw: 'a.example.com' });
    expect(parsed?.bindings['ServerLogic/Enabled']).toEqual({ kind: 'absent' });
  });

  it('reports two active matches as a duplicate and lists inactive matches', () => {
    const parsed = parseSettings([
      named('ServerLogic/Enabled', { value: 'true' }),
      named('serverlogic/enabled', { value: 'false' }),
      named('ServerLogic/TimeoutInSeconds', { value: '30' }, 1),
    ]);
    expect(parsed?.bindings['ServerLogic/Enabled']).toEqual({ kind: 'duplicate' });
    expect(parsed?.bindings['ServerLogic/TimeoutInSeconds']).toEqual({ kind: 'absent' });
    expect(parsed?.inactive).toEqual(['ServerLogic/TimeoutInSeconds']);
  });

  it('binds an environment-variable setting to its trimmed schema name', () => {
    const parsed = parseSettings([
      named('ServerLogic/AllowedDomains', { source: 1, envvar_schema: ' cfg_Domains ' }),
    ]);
    expect(parsed?.bindings['ServerLogic/AllowedDomains']).toEqual({ kind: 'envvar', schema: 'cfg_Domains' });
  });

  it.each([
    ['unreadable content', { powerpagecomponentid: 'a', name: 'ServerLogic/Enabled', statecode: 0, content: '{x' }],
    ['no value', named('ServerLogic/Enabled', { source: 0 })],
    ['a numeric value', named('ServerLogic/Enabled', { value: 1 })],
    ['a blank schema name', named('ServerLogic/Enabled', { source: 1, envvar_schema: '  ' })],
  ])('degrades only that setting to an unparseable binding for %s', (_label, bad) => {
    const parsed = parseSettings([bad, named('ServerLogic/TimeoutInSeconds', { value: '30' })]);
    expect(parsed?.bindings['ServerLogic/Enabled']).toEqual({ kind: 'unparseable' });
    expect(parsed?.bindings['ServerLogic/TimeoutInSeconds']).toEqual({ kind: 'value', raw: '30' });
  });

  it('is unreadable when a matched row has no readable id or state', () => {
    expect(parseSettings([{ name: 'ServerLogic/Enabled', statecode: 'x' }])).toBeNull();
  });
});

describe('environment variables', () => {
  const definition = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
    environmentvariabledefinitionid: DEFINITION_ID,
    schemaname: 'cfg_Domains',
    type: 100000000,
    defaultvalue: 'default.example.com',
    ...patch,
  });

  it('reads exactly one definition and recognises Secret by type', () => {
    expect(parseDefinition([definition()])).toEqual({
      id: DEFINITION_ID,
      secret: false,
      defaultValue: 'default.example.com',
    });
    expect(parseDefinition([definition({ type: 100000005, defaultvalue: null })])).toEqual({
      id: DEFINITION_ID,
      secret: true,
      defaultValue: null,
    });
  });

  it.each([
    ['no rows', []],
    ['two rows', [definition(), definition()]],
    ['a non-GUID id', [definition({ environmentvariabledefinitionid: 'x' })]],
    ['a non-numeric type', [definition({ type: 'Secret' })]],
    ['a numeric default', [definition({ defaultvalue: 3 })]],
  ])('is unreadable for %s', (_label, rows) => {
    expect(parseDefinition(rows)).toBeNull();
  });

  it('prefers the first value row, then the default, then nothing', () => {
    const withDefault = { id: DEFINITION_ID, secret: false, defaultValue: 'd' };
    const noDefault = { id: DEFINITION_ID, secret: false, defaultValue: null };
    expect(pickEnvVarValue([{ value: 'v1' }, { value: 'v2' }], withDefault)).toBe('v1');
    expect(pickEnvVarValue([{ value: null }], withDefault)).toBe('d');
    expect(pickEnvVarValue([], withDefault)).toBe('d');
    expect(pickEnvVarValue([], noDefault)).toBeNull();
    expect(pickEnvVarValue([{ value: '' }], withDefault)).toBe('');
  });
});
