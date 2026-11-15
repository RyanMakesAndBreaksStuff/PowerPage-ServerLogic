import { describe, expect, it } from 'vitest';
import type { CheckId, Finding, SiteFacts } from '@/types/inspector';
import {
  CODE_ANALYSIS_LIMIT,
  CODE_READ_FAILURE,
  CONNECTORS_UNKNOWN,
  FLOW_NOTE,
  OTHER_ROLES_NOTE,
} from './copy';
import { evaluateFileChecks } from './checks';
import { file, permission, read, role, settings, siteFacts, value } from './fixtures';

const HTTP_CODE =
  'async function get() { return await Server.Connector.HttpClient.GetAsync(url, {}); }';
const DATAVERSE_CODE =
  'function get() { return Server.Connector.Dataverse.RetrieveRecord("contacts", id); }';

function finding(facts: SiteFacts, check: CheckId): Finding {
  const result = evaluateFileChecks(facts, facts.files[0] ?? file());
  const item = result.findings.find((item) => item.check === check);
  if (item === undefined) throw new Error('Missing check');
  return item;
}

describe('AC-8.8 Web role', () => {
  it('flags no role and every anonymous assignment, even mixed roles and renamed defaults', () => {
    expect(finding(siteFacts({ files: [file({ roleIds: read([]) })] }), 'webRole').summary).toBe(
      'No web role assigned. No site user can call it yet.',
    );
    const facts = siteFacts({
      roles: read([role('staff'), role('anon', { name: 'Renamed visitor', anonymous: true })]),
      files: [file({ roleIds: read(['staff', 'anon']) })],
    });
    expect(finding(facts, 'webRole').summary).toBe('Callable by unauthenticated visitors.');
    expect(finding(facts, 'webRole').status).toBe('needs-review');
    expect(evaluateFileChecks(facts, facts.files[0] ?? file()).snapshot.roles).toContain(
      'Renamed visitor (Anonymous Users Role)',
    );
    expect(finding(siteFacts(), 'webRole').status).toBe('configured');
  });

  it('labels an inactive anonymous role in the reason and snapshot without changing any status (D2)', () => {
    const roles = read([
      role('staff', { active: false }),
      role('anon', { name: 'Old visitor', anonymous: true, active: false }),
    ]);
    const facts = siteFacts({
      roles,
      permissions: read([permission('p', { scope: 'Global', roleIds: ['anon'] })]),
      files: [file({ roleIds: read(['staff', 'anon']) })],
    });
    const active = siteFacts({
      roles: read([role('staff'), role('anon', { name: 'Old visitor', anonymous: true })]),
      permissions: read([permission('p', { scope: 'Global', roleIds: ['anon'] })]),
      files: [file({ roleIds: read(['staff', 'anon']) })],
    });
    const result = evaluateFileChecks(facts, facts.files[0] ?? file());
    const before = evaluateFileChecks(active, active.files[0] ?? file());
    expect(finding(facts, 'webRole').summary).toBe(
      'Callable by unauthenticated visitors through `Old visitor` (inactive).',
    );
    expect(result.findings.map((item) => item.status)).toEqual(
      before.findings.map((item) => item.status),
    );
    expect(result.findings[1].reasons).toEqual(before.findings[1].reasons);
    expect(result.snapshot.roles).toEqual([
      'staff (inactive)',
      'Old visitor (Anonymous Users Role) (inactive)',
      OTHER_ROLES_NOTE,
    ]);
    expect(before.snapshot.roles).toEqual([
      'staff',
      'Old visitor (Anonymous Users Role)',
      OTHER_ROLES_NOTE,
    ]);
  });

  it('does not infer anonymous flags from a role name', () => {
    const facts = siteFacts({ roles: read([role('staff', { name: 'Anonymous Users' })]) });
    expect(finding(facts, 'webRole').status).toBe('configured');
  });
});

describe('FR-9 Table permissions and AC-8.8 reason order', () => {
  it('names Global table, scope and source role before write-on-get, parent and scope limits', () => {
    const facts = siteFacts({
      permissions: read([
        permission('global', {
          table: 'account',
          scope: 'Global',
          privileges: ['Create', 'AppendTo'],
        }),
        permission('broken', { scope: 'Parent', parentId: 'missing' }),
        permission('unknown', { scope: null }),
      ]),
    });
    const result = finding(facts, 'tablePermissions');
    expect(result.reasons.map((reason) => reason.text)).toEqual([
      'Global access to `account` (Global) from role `staff`.',
      'Change privileges on a handler that only exports `get()`',
      "Couldn't evaluate parent permission `broken`",
      "Couldn't interpret the scope of `unknown`",
    ]);
    expect(result.summary).toBe(result.reasons[0]?.text);
    expect(result.detail).toContain('Change privileges found: Create, Append To.');
    expect(result.detail).toContain('Based on exported function names, not on what the code does.');
  });

  it.each(['Create', 'Write', 'Delete', 'Append', 'AppendTo'] as const)(
    'flags %s on get-only code with helpers',
    (privilege) => {
      const facts = siteFacts({
        permissions: read([permission('change', { privileges: [privilege] })]),
        files: [file({ code: read('function get() {} function getAccessToken() {}') })],
      });
      expect(finding(facts, 'tablePermissions').summary).toBe(
        'Change privileges on a handler that only exports `get()`',
      );
    },
  );

  it.each([
    'function post() {}',
    'function getSummary() {}',
    'function get() {} function post() {}',
    'const get = () => 1;',
  ])('does not call %s get-only', (code) => {
    const facts = siteFacts({
      permissions: read([permission('change', { privileges: ['Write'] })]),
      files: [file({ code: read(code) })],
    });
    expect(finding(facts, 'tablePermissions').status).toBe('configured');
  });

  it('requires linked active permissions only when Dataverse is detected', () => {
    expect(
      finding(siteFacts({ files: [file({ code: read(DATAVERSE_CODE) })] }), 'tablePermissions')
        .summary,
    ).toBe('Handler uses Dataverse but no table permissions are linked to its roles.');
    expect(finding(siteFacts(), 'tablePermissions').summary).toBe(
      'No Dataverse access in code, so no table permissions are needed.',
    );
    expect(
      finding(siteFacts({ permissions: read([permission('local')]) }), 'tablePermissions').status,
    ).toBe('configured');
  });

  it('overrides no-use reassurance when connectors cannot be determined', () => {
    const facts = siteFacts({
      files: [file({ code: read('const c = Server.Connector; c[name](x); function get() {}') })],
    });
    expect(finding(facts, 'tablePermissions').summary).toBe(CONNECTORS_UNKNOWN);
    expect(finding(facts, 'outbound').summary).toBe(CONNECTORS_UNKNOWN);
    const detected = siteFacts({
      permissions: read([permission('local')]),
      files: [file({ code: read('const { Dataverse } = Server.Connector; function get() {}') })],
    });
    expect(finding(detected, 'tablePermissions').status).toBe('configured');
  });

  it('keeps parent and unknown-scope analysis limits reviewable alongside valid grants', () => {
    const facts = siteFacts({
      permissions: read([
        permission('known'),
        permission('parent', { scope: 'Parent', parentId: 'missing' }),
        permission('scope', { scope: null }),
      ]),
    });
    expect(finding(facts, 'tablePermissions').reasons.map((reason) => reason.readFailure)).toEqual([
      false,
      false,
    ]);
    expect(finding(facts, 'tablePermissions').status).toBe('needs-review');
  });
});

describe('FR-9 O0–O6 and wildcard entries', () => {
  it.each([
    ['O0', 'const c = Server.Connector;', 'true', '', 'needs-review', CONNECTORS_UNKNOWN],
    [
      'O1',
      'function post() { return Server.Connector.CloudFlow.TriggerAsync(id, "{}"); }',
      'bad',
      'https://bad',
      'configured',
      'No HttpClient calls in code.',
    ],
    [
      'O2 domains',
      HTTP_CODE,
      'false',
      'https://bad',
      'needs-review',
      "Couldn't interpret `ServerLogic/AllowedDomains`: `https://bad`",
    ],
    [
      'O2 boolean',
      HTTP_CODE,
      'maybe',
      'api.example.com',
      'needs-review',
      "Couldn't interpret `ServerLogic/AllowNetworkingToAllDomains`",
    ],
    [
      'O3',
      HTTP_CODE,
      'true',
      '',
      'needs-review',
      'All domains allowed. Limit to the hosts it calls.',
    ],
    [
      'O4',
      HTTP_CODE,
      'true',
      'api.example.com',
      'needs-review',
      "`AllowedDomains` is set but `AllowNetworkingToAllDomains` isn't `false`, so the list doesn't apply and all domains are allowed.",
    ],
    [
      'O5',
      HTTP_CODE,
      'false',
      '',
      'needs-review',
      'Outbound calls are blocked. The handler calls HttpClient, but no domains are allowed.',
    ],
    [
      'O6',
      HTTP_CODE,
      'false',
      'a.example.com, b.example.com',
      'configured',
      "Allowed domains `a.example.com`, `b.example.com`. Whether they cover every host the handler calls isn't checked.",
    ],
  ] as const)('%s', (_row, code, all, domains, status, summary) => {
    const facts = siteFacts({
      settings: read(
        settings({
          'ServerLogic/AllowNetworkingToAllDomains': value(all),
          'ServerLogic/AllowedDomains': value(domains),
        }),
      ),
      files: [file({ code: read(code) })],
    });
    const result = finding(facts, 'outbound');
    expect(result.status).toBe(status);
    expect(result.summary).toBe(summary);
    if (status === 'configured') expect(result.reasons).toEqual([]);
  });

  it('adds the cloud-flow limit and O6 coverage question', () => {
    expect(finding(siteFacts(), 'outbound').detail).toContain(FLOW_NOTE);
    const facts = siteFacts({
      settings: read(
        settings({
          'ServerLogic/AllowNetworkingToAllDomains': value('false'),
          'ServerLogic/AllowedDomains': value('api.example.com'),
        }),
      ),
      files: [file({ code: read(HTTP_CODE) })],
    });
    expect(finding(facts, 'outbound').questions).toContain(
      'Do these domains cover every host this handler calls?',
    );
  });

  it('does not count wildcards and preserves the chosen row alongside every wildcard reason', () => {
    const facts = siteFacts({
      settings: read(
        settings({
          'ServerLogic/AllowNetworkingToAllDomains': value('false'),
          'ServerLogic/AllowedDomains': value('*.example.com, *.other.com'),
        }),
      ),
      files: [file({ code: read(HTTP_CODE) })],
    });
    expect(finding(facts, 'outbound').reasons.map((reason) => reason.text)).toEqual([
      "Wildcard entries aren't supported: `*.example.com` matches no host.",
      "Wildcard entries aren't supported: `*.other.com` matches no host.",
      'Outbound calls are blocked. The handler calls HttpClient, but no domains are allowed.',
    ]);
    const mixed = {
      ...facts,
      settings: read(
        settings({
          'ServerLogic/AllowNetworkingToAllDomains': value('false'),
          'ServerLogic/AllowedDomains': value('*.example.com, api.example.com'),
        }),
      ),
    };
    expect(finding(mixed, 'outbound').status).toBe('needs-review');
    expect(finding(mixed, 'outbound').detail).toContain(
      "Allowed domains `api.example.com`. Whether they cover every host the handler calls isn't checked.",
    );
  });

  it('collects both O2 issues and treats unreadable envvars as read failures', () => {
    const facts = siteFacts({
      settings: read(
        settings({
          'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' },
          'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable', cause: 'failed' },
        }),
      ),
      files: [file({ code: read(HTTP_CODE) })],
    });
    expect(finding(facts, 'outbound').reasons).toEqual([
      {
        text: "Couldn't read `ServerLogic/AllowedDomains` from its environment variable",
        readFailure: true,
      },
      { text: 'Duplicate `ServerLogic/AllowNetworkingToAllDomains`', readFailure: false },
    ]);
  });

  it('uses defaults only after settings were read, and requires settings only for HttpClient', () => {
    const http = siteFacts({ files: [file({ code: read(HTTP_CODE) })] });
    expect(finding(http, 'outbound').summary).toBe(
      'All domains allowed. Limit to the hosts it calls.',
    );
    expect(
      finding({ ...http, settings: { ok: false, reason: 'read-failed' } }, 'outbound').reasons,
    ).toEqual([{ text: "Couldn't read configuration", readFailure: true }]);
    expect(
      finding(siteFacts({ settings: { ok: false, reason: 'read-failed' } }), 'outbound').status,
    ).toBe('configured');
  });
});

describe('FR-8 read failures versus analysis limits', () => {
  it.each([
    '',
    '  ',
    '// only comments',
    'function get( { Server.Connector.HttpClient.X() }',
    'const text = "unterminated',
  ])('keeps downloaded %j reviewable', (code) => {
    const facts = siteFacts({ files: [file({ code: read(code) })] });
    for (const check of ['tablePermissions', 'outbound'] as const) {
      expect(finding(facts, check).reasons).toContainEqual({
        text: CODE_ANALYSIS_LIMIT,
        readFailure: false,
      });
      expect(finding(facts, check).status).toBe('needs-review');
    }
    expect(finding(facts, 'webRole').status).toBe('configured');
  });

  it('keeps only download failure as unreadable code', () => {
    const facts = siteFacts({ files: [file({ code: { ok: false, reason: 'read-failed' } })] });
    expect(finding(facts, 'webRole').status).toBe('configured');
    expect(finding(facts, 'tablePermissions').reasons).toContainEqual({
      text: CODE_READ_FAILURE,
      readFailure: true,
    });
    expect(finding(facts, 'outbound').reasons).toEqual([
      { text: CODE_READ_FAILURE, readFailure: true },
    ]);
  });

  it('preserves known reasons even when code or permissions could not be read', () => {
    const facts = siteFacts({
      permissions: read([permission('global', { scope: 'Global' })]),
      files: [file({ code: { ok: false, reason: 'read-failed' } })],
    });
    expect(finding(facts, 'tablePermissions').reasons).toEqual([
      { text: 'Global access to `contact` (Global) from role `staff`.', readFailure: false },
      { text: CODE_READ_FAILURE, readFailure: true },
    ]);
  });

  it('uses Not scanned only on checks needing interrupted evidence', () => {
    const facts = siteFacts({ files: [file({ code: { ok: false, reason: 'not-scanned' } })] });
    expect(finding(facts, 'webRole').status).toBe('configured');
    expect(finding(facts, 'tablePermissions').status).toBe('not-scanned');
    expect(finding(facts, 'outbound').status).toBe('not-scanned');
    const env = siteFacts({
      settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'not-scanned' } })),
      files: [file({ code: read(HTTP_CODE) })],
    });
    expect(finding(env, 'outbound').status).toBe('not-scanned');
    expect(finding(env, 'tablePermissions').status).toBe('configured');
  });

  it('keeps evidence snapshots and the other-role scope note', () => {
    const result = evaluateFileChecks(
      siteFacts({ permissions: read([permission('linked')]) }),
      file(),
    );
    expect(result.snapshot.tables).toContain('contact · Contact · Read · role staff');
    expect(result.snapshot.roles).toContain(OTHER_ROLES_NOTE);
    expect(result.findings).toHaveLength(3);
  });
});
