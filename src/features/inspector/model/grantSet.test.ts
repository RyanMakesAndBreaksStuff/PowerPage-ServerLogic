import { describe, expect, it } from 'vitest';
import type { TablePermissionFact } from '@/types/inspector';
import { file, permission, read, role, siteFacts } from './fixtures';
import { buildGrantSet, defaultRoleBanners, permissionSnapshot } from './grantSet';

describe('FR-7 grant set', () => {
  it('includes assigned and every authenticated default role, identifying them by flags', () => {
    const facts = siteFacts({
      roles: read([
        role('staff'),
        role('auth-a', { name: 'Renamed one', authenticated: true }),
        role('auth-b', { name: 'Renamed two', authenticated: true }),
        role('anon', { anonymous: true }),
      ]),
      permissions: read([
        permission('assigned'),
        permission('auth-a-grant', { roleIds: ['auth-a'] }),
        permission('auth-b-grant', { roleIds: ['auth-b'] }),
        permission('anon-grant', { roleIds: ['anon'] }),
      ]),
    });
    const result = buildGrantSet(facts, file());
    expect(result.grants.map((grant) => grant.permission.id)).toEqual([
      'assigned',
      'auth-a-grant',
      'auth-b-grant',
    ]);
    expect(result.roleIds).toEqual(['staff', 'auth-a', 'auth-b']);
    expect(result.grants[1]?.roleNames).toEqual(['Renamed one']);
  });

  it('includes every anonymous default role when one is assigned', () => {
    const facts = siteFacts({
      roles: read([
        role('anon-a', { anonymous: true }),
        role('anon-b', { anonymous: true }),
        role('auth', { authenticated: true }),
      ]),
      permissions: read([
        permission('a', { roleIds: ['anon-a'] }),
        permission('b', { roleIds: ['anon-b'] }),
        permission('c', { roleIds: ['auth'] }),
      ]),
    });
    expect(
      buildGrantSet(facts, file({ roleIds: read(['anon-a']) })).grants.map(
        (grant) => grant.permission.id,
      ),
    ).toEqual(['a', 'b']);
    expect(buildGrantSet(facts, file({ roleIds: read([]) })).grants).toEqual([]);
  });

  it('includes both default groups for anonymous and nonanonymous assigned roles', () => {
    const facts = siteFacts({
      roles: read([
        role('staff'),
        role('anon', { anonymous: true }),
        role('auth', { authenticated: true }),
      ]),
    });
    expect(buildGrantSet(facts, file({ roleIds: read(['anon', 'staff']) })).roleIds).toEqual([
      'anon',
      'staff',
      'auth',
    ]);
  });

  it('inherits roles from the top parent plus its own, but not an intermediate parent', () => {
    const facts = siteFacts({
      roles: read([role('staff'), role('other'), role('own')]),
      permissions: read([
        permission('top', { roleIds: ['staff'] }),
        permission('middle', { scope: 'Parent', parentId: 'top', roleIds: ['other'] }),
        permission('child', { scope: 'Parent', parentId: 'middle', roleIds: ['own'] }),
      ]),
    });
    const staff = buildGrantSet(facts, file());
    expect(staff.grants.map((grant) => grant.permission.id)).toEqual(['top', 'middle', 'child']);
    expect(staff.grants[2]?.roleNames).toEqual(['staff']);
    expect(
      buildGrantSet(facts, file({ roleIds: read(['other']) })).grants.map(
        (grant) => grant.permission.id,
      ),
    ).toEqual(['middle']);
    expect(
      buildGrantSet(facts, file({ roleIds: read(['own']) })).grants.map(
        (grant) => grant.permission.id,
      ),
    ).toEqual(['child']);
  });

  it('excludes known inactive permissions and descendants but labels their provenance', () => {
    const facts = siteFacts({
      permissions: read([
        permission('top', { active: false }),
        permission('child', { scope: 'Parent', parentId: 'top', roleIds: [] }),
        permission('self', { active: false }),
        permission('other', { roleIds: ['other'], active: false }),
      ]),
    });
    const grants = buildGrantSet(facts, file());
    expect(grants.grants).toEqual([]);
    expect(grants.reasons).toEqual([]);
    expect(permissionSnapshot(grants)).toEqual([
      'contact · Contact · Read · role staff (inactive, ignored)',
      'contact · Parent · Read · role staff (parent inactive, ignored)',
      'contact · Contact · Read · role staff (inactive, ignored)',
    ]);
  });

  it.each([
    ['missing link', [permission('child', { scope: 'Parent', parentId: null, roleIds: [] })]],
    [
      'missing record',
      [permission('child', { scope: 'Parent', parentId: 'missing', roleIds: [] })],
    ],
    ['self loop', [permission('child', { scope: 'Parent', parentId: 'child', roleIds: [] })]],
    [
      'cycle',
      [
        permission('child', { scope: 'Parent', parentId: 'other', roleIds: [] }),
        permission('other', { scope: 'Parent', parentId: 'child', roleIds: [] }),
      ],
    ],
  ] satisfies readonly (readonly [string, readonly TablePermissionFact[]])[])(
    'keeps %s reviewable even alongside other grants',
    (_name, permissions) => {
      const grants = buildGrantSet(
        siteFacts({ permissions: read([permission('good'), ...permissions]) }),
        file(),
      );
      expect(grants.grants.map((grant) => grant.permission.id)).toEqual(['good']);
      expect(grants.reasons[0]).toEqual({
        text: "Couldn't evaluate parent permission `child`",
        readFailure: false,
      });
    },
  );

  it.each([
    ['its id', 'gone'],
    ['an empty id', ''],
  ])('marks a missing parent as a read failure when an unreadable permission row has %s', (_name, rowId) => {
    const grants = buildGrantSet(
      siteFacts({
        permissions: read([permission('child', { scope: 'Parent', parentId: 'gone', roleIds: [] })]),
        unreadableRows: [{ type: 18, id: rowId, name: 'broken' }],
      }),
      file(),
    );
    expect(grants.reasons).toEqual([
      { text: "Couldn't evaluate parent permission `child`", readFailure: true },
    ]);
  });

  it('does not treat unreadable role rows or other ids as an unreadable parent', () => {
    const grants = buildGrantSet(
      siteFacts({
        permissions: read([permission('child', { scope: 'Parent', parentId: 'gone', roleIds: [] })]),
        unreadableRows: [
          { type: 11, id: 'gone', name: 'role' },
          { type: 18, id: 'other', name: 'other' },
        ],
      }),
      file(),
    );
    expect(grants.reasons[0]?.readFailure).toBe(false);
  });

  it('keeps unknown scopes in the grant set for the check to flag', () => {
    const grants = buildGrantSet(
      siteFacts({ permissions: read([permission('unknown', { scope: null })]) }),
      file(),
    );
    expect(grants.grants[0]?.permission.scope).toBeNull();
    expect(permissionSnapshot(grants)).toEqual(['contact · Unknown scope · Read · role staff']);
  });

  it.each(['roles', 'permissions'] as const)(
    'marks failed %s evidence as a read failure',
    (field) => {
      const result = buildGrantSet(
        siteFacts({ [field]: { ok: false, reason: 'read-failed' } }),
        file(),
      );
      expect(result.reasons).toEqual([{ text: "Couldn't read configuration", readFailure: true }]);
      expect(result.notScanned).toBe(false);
    },
  );

  it('cannot infer roles that are missing from a successful role inventory', () => {
    const result = buildGrantSet(siteFacts(), file({ roleIds: read(['unknown']) }));
    expect(result.reasons).toEqual([{ text: "Couldn't read configuration", readFailure: true }]);
  });

  it('keeps interrupted evidence outside Needs review', () => {
    const result = buildGrantSet(
      siteFacts({ permissions: { ok: false, reason: 'not-scanned' } }),
      file(),
    );
    expect(result.notScanned).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});

describe('FR-7 default-role banners', () => {
  it('names all duplicate defaults and does not depend on their names', () => {
    expect(
      defaultRoleBanners(
        siteFacts({
          roles: read([
            role('a', { name: 'Renamed A', anonymous: true }),
            role('b', { name: 'Renamed B', anonymous: true }),
            role('c', { authenticated: true }),
            role('d', { authenticated: true }),
          ]),
        }),
      ),
    ).toEqual([
      'More than one web role is marked as the Anonymous Users Role (`Renamed A`, `Renamed B`). Learn allows one per site.',
      'More than one web role is marked as the Authenticated Users Role (`c`, `d`). Learn allows one per site.',
    ]);
    expect(defaultRoleBanners(siteFacts())).toEqual([]);
    expect(defaultRoleBanners(siteFacts({ roles: { ok: false, reason: 'read-failed' } }))).toEqual(
      [],
    );
  });
});
