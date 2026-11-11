import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type {
  CheckId,
  CheckStatus,
  Finding,
  Reason,
  ReviewKey,
  SettingValue,
  SiteFacts,
} from '@/types/inspector';
import { reportFinding } from '@/features/inspector/report/reportFixtures';
import { evaluateFileChecks } from '@/features/inspector/model/checks';
import {
  CODE_ANALYSIS_LIMIT,
  CODE_READ_FAILURE,
  CONNECTORS_UNKNOWN,
  ENVVAR_CACHE_NOTE,
  FLOW_NOTE,
  NOT_SCANNED_TEXT,
  OTHER_ROLES_NOTE,
} from '@/features/inspector/model/copy';
import {
  file,
  permission,
  read,
  role,
  settings,
  siteFacts,
  value,
} from '@/features/inspector/model/fixtures';
import * as grantSet from '@/features/inspector/model/grantSet';
import { canReviewFinding, evaluateSite } from '@/features/inspector/model/rules';

const UNREAD = { ok: false, reason: 'not-scanned' } as const;
const FAILED = { ok: false, reason: 'read-failed' } as const;
const HTTP_CODE =
  'async function get() { return await Server.Connector.HttpClient.GetAsync(url, {}); }';
const CONFIG_FAILURE: Reason = { text: "Couldn't read configuration", readFailure: true };
const CODE_FAILURE: Reason = { text: CODE_READ_FAILURE, readFailure: true };
const ANALYSIS_LIMIT: Reason = { text: CODE_ANALYSIS_LIMIT, readFailure: false };
const NO_ROLE: Reason = { text: 'No web role assigned. No site user can call it yet.', readFailure: false };
const GLOBAL: Reason = { text: 'Global access to `contact` (Global) from role `staff`.', readFailure: false };
const DOMAIN_FAILURE: Reason = {
  text: "Couldn't read `ServerLogic/AllowedDomains` from its environment variable",
  readFailure: true,
};
const BOOLEAN_FAILURE: Reason = {
  text: "Couldn't read `ServerLogic/AllowNetworkingToAllDomains` from its environment variable",
  readFailure: true,
};
const BOOLEAN_DUPLICATE: Reason = { text: 'Duplicate `ServerLogic/AllowNetworkingToAllDomains`', readFailure: false };
const WILDCARD: Reason = {
  text: "Wildcard entries aren't supported: `*.example.com` matches no host.",
  readFailure: false,
};

function httpFacts(patch: Partial<SiteFacts> = {}): SiteFacts {
  return siteFacts({ files: [file({ code: read(HTTP_CODE) })], ...patch });
}

function finding(facts: SiteFacts, check: CheckId): Finding {
  const result = evaluateFileChecks(facts, facts.files[0] ?? file());
  const match = result.findings.find((item) => item.check === check);
  if (match === undefined) throw new Error('Missing check');
  return match;
}

type IncompleteCase = {
  name: string;
  facts: SiteFacts;
  check: CheckId;
  status: 'needs-review' | 'not-scanned';
  reasons: readonly Reason[];
};

const INCOMPLETE_CASES: readonly IncompleteCase[] = [
  { name: 'failed role inventory plus unscanned file roles', facts: siteFacts({ roles: FAILED, files: [file({ roleIds: UNREAD })] }), check: 'webRole', status: 'needs-review', reasons: [CONFIG_FAILURE] },
  { name: 'unscanned role inventory plus failed file roles', facts: siteFacts({ roles: UNREAD, files: [file({ roleIds: FAILED })] }), check: 'webRole', status: 'needs-review', reasons: [CONFIG_FAILURE] },
  { name: 'known empty assignment plus unscanned role inventory', facts: siteFacts({ roles: UNREAD, files: [file({ roleIds: read([]) })] }), check: 'webRole', status: 'needs-review', reasons: [NO_ROLE] },
  { name: 'unscanned role inventory without an established finding', facts: siteFacts({ roles: UNREAD }), check: 'webRole', status: 'not-scanned', reasons: [] },
  { name: 'unscanned file roles without an established finding', facts: siteFacts({ files: [file({ roleIds: UNREAD })] }), check: 'webRole', status: 'not-scanned', reasons: [] },
  { name: 'wholly unavailable web-role evidence', facts: siteFacts({ roles: UNREAD, files: [file({ roleIds: UNREAD })] }), check: 'webRole', status: 'not-scanned', reasons: [] },
  { name: 'failed permission inventory plus unscanned code', facts: siteFacts({ permissions: FAILED, files: [file({ code: UNREAD })] }), check: 'tablePermissions', status: 'needs-review', reasons: [CONFIG_FAILURE] },
  { name: 'unscanned permission inventory plus failed code', facts: siteFacts({ permissions: UNREAD, files: [file({ code: FAILED })] }), check: 'tablePermissions', status: 'needs-review', reasons: [CODE_FAILURE] },
  { name: 'failed grant-role inventory plus unscanned assignment', facts: siteFacts({ roles: FAILED, files: [file({ roleIds: UNREAD })] }), check: 'tablePermissions', status: 'needs-review', reasons: [CONFIG_FAILURE] },
  { name: 'unscanned grant-role inventory plus failed assignment', facts: siteFacts({ roles: UNREAD, files: [file({ roleIds: FAILED })] }), check: 'tablePermissions', status: 'needs-review', reasons: [CONFIG_FAILURE] },
  { name: 'missing assigned role in a read inventory plus unscanned permissions', facts: siteFacts({ permissions: UNREAD, files: [file({ roleIds: read(['missing']) })] }), check: 'tablePermissions', status: 'needs-review', reasons: [CONFIG_FAILURE] },
  { name: 'known Global access plus unscanned code', facts: siteFacts({ permissions: read([permission('global', { scope: 'Global' })]), files: [file({ code: UNREAD })] }), check: 'tablePermissions', status: 'needs-review', reasons: [GLOBAL] },
  { name: 'known unknown scope plus unscanned code', facts: siteFacts({ permissions: read([permission('unknown', { scope: null })]), files: [file({ code: UNREAD })] }), check: 'tablePermissions', status: 'needs-review', reasons: [{ text: "Couldn't interpret the scope of `unknown`", readFailure: false }] },
  { name: 'downloaded analysis limit plus unscanned permissions', facts: siteFacts({ permissions: UNREAD, files: [file({ code: read('') })] }), check: 'tablePermissions', status: 'needs-review', reasons: [ANALYSIS_LIMIT] },
  { name: 'unscanned permissions without an established finding', facts: siteFacts({ permissions: UNREAD }), check: 'tablePermissions', status: 'not-scanned', reasons: [] },
  { name: 'wholly unavailable table-permission evidence', facts: siteFacts({ roles: UNREAD, permissions: UNREAD, files: [file({ roleIds: UNREAD, code: UNREAD })] }), check: 'tablePermissions', status: 'not-scanned', reasons: [] },
  { name: 'failed outbound settings plus unscanned code', facts: siteFacts({ settings: FAILED, files: [file({ code: UNREAD })] }), check: 'outbound', status: 'needs-review', reasons: [CONFIG_FAILURE] },
  { name: 'failed code plus unscanned outbound settings', facts: siteFacts({ settings: UNREAD, files: [file({ code: FAILED })] }), check: 'outbound', status: 'needs-review', reasons: [CODE_FAILURE] },
  { name: 'downloaded analysis limit plus unscanned outbound settings', facts: siteFacts({ settings: UNREAD, files: [file({ code: read('') })] }), check: 'outbound', status: 'needs-review', reasons: [ANALYSIS_LIMIT] },
  { name: 'failed domain variable plus unscanned Boolean variable', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable', cause: 'failed' }, 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' } })) }), check: 'outbound', status: 'needs-review', reasons: [DOMAIN_FAILURE] },
  { name: 'unscanned domain variable plus failed Boolean variable', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'not-scanned' }, 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'envvar-unreadable', cause: 'failed' } })) }), check: 'outbound', status: 'needs-review', reasons: [BOOLEAN_FAILURE] },
  { name: 'invalid domains plus unscanned Boolean variable', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': value('https://invalid.example'), 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' } })) }), check: 'outbound', status: 'needs-review', reasons: [{ text: "Couldn't interpret `ServerLogic/AllowedDomains`: `https://invalid.example`", readFailure: false }] },
  { name: 'unscanned domains plus duplicate Boolean setting', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'not-scanned' }, 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' } })) }), check: 'outbound', status: 'needs-review', reasons: [BOOLEAN_DUPLICATE] },
  { name: 'known wildcard plus unscanned Boolean variable', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': value('*.example.com, api.example.com'), 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' } })) }), check: 'outbound', status: 'needs-review', reasons: [WILDCARD] },
  { name: 'failed domain variable plus unscanned code', facts: siteFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable', cause: 'failed' } })), files: [file({ code: UNREAD })] }), check: 'outbound', status: 'needs-review', reasons: [DOMAIN_FAILURE] },
  { name: 'known wildcard and duplicate Boolean setting plus unscanned code', facts: siteFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': value('*.example.com'), 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' } })), files: [file({ code: UNREAD })] }), check: 'outbound', status: 'needs-review', reasons: [BOOLEAN_DUPLICATE, WILDCARD] },
  { name: 'failed code and duplicate Boolean setting plus unscanned domains', facts: siteFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'not-scanned' }, 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' } })), files: [file({ code: FAILED })] }), check: 'outbound', status: 'needs-review', reasons: [CODE_FAILURE, BOOLEAN_DUPLICATE] },
  { name: 'unscanned outbound code without an established finding', facts: siteFacts({ files: [file({ code: UNREAD })] }), check: 'outbound', status: 'not-scanned', reasons: [] },
  { name: 'unscanned outbound settings without an established finding', facts: httpFacts({ settings: UNREAD }), check: 'outbound', status: 'not-scanned', reasons: [] },
  { name: 'wholly unavailable outbound evidence', facts: siteFacts({ settings: UNREAD, files: [file({ code: UNREAD })] }), check: 'outbound', status: 'not-scanned', reasons: [] },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FR-8 precedence: mixed failed, unscanned and adverse evidence', () => {
  it('requires and initializes the incomplete-evidence flag in every finding factory', () => {
    expectTypeOf<Pick<Finding, 'hasUnscannedEvidence'>>().toEqualTypeOf<{ hasUnscannedEvidence: boolean }>();
    const result = evaluateFileChecks(siteFacts(), file());
    expect(result.findings.map((item) => item.hasUnscannedEvidence)).toEqual([false, false, false]);
    const states: readonly CheckStatus[] = ['configured', 'needs-review', 'reviewed', 'not-scanned'];
    for (const status of states) {
      expect(reportFinding('webRole', status).hasUnscannedEvidence).toBe(status === 'not-scanned');
    }
  });

  it.each(INCOMPLETE_CASES)('$name', ({ facts, check, status, reasons }) => {
    const result = finding(facts, check);
    expect(result.status).toBe(status);
    expect(result.summary).toBe(reasons[0]?.text ?? NOT_SCANNED_TEXT);
    expect(result.reasons).toEqual(reasons);
    expect(result.hasUnscannedEvidence).toBe(true);
    expect(result.detail).toContain(NOT_SCANNED_TEXT);
    expect(result.detail).toEqual(expect.arrayContaining(reasons.map((reason) => reason.text)));
    expect(canReviewFinding(result)).toBe(false);
    const marked = evaluateSite(facts, new Set<ReviewKey>([`file-1:${check}`]));
    expect(marked.files[0]?.findings.find((item) => item.check === check)).toEqual(result);
  });

  it('refuses an incomplete Needs-review finding independently of its reason text', () => {
    const complete = finding(siteFacts({ files: [file({ roleIds: read([]) })] }), 'webRole');
    expect(canReviewFinding(complete)).toBe(true);
    expect(canReviewFinding({ ...complete, hasUnscannedEvidence: true })).toBe(false);
  });

  it('refuses to review a missing parent that is an unreadable permission row', () => {
    const facts = siteFacts({
      permissions: read([permission('child', { scope: 'Parent', parentId: 'gone', roleIds: ['staff'] })]),
      unreadableRows: [{ type: 18, id: 'gone', name: 'broken' }],
    });
    expect(canReviewFinding(finding(facts, 'tablePermissions'))).toBe(false);
  });
});

describe('FR-9 outbound intersections (WR-006)', () => {
  it.each([
    ['invalid', value('maybe'), "Couldn't interpret `ServerLogic/AllowNetworkingToAllDomains`", true],
    ['duplicate', { kind: 'duplicate' }, BOOLEAN_DUPLICATE.text, true],
    ['unreadable', { kind: 'envvar-unreadable', cause: 'failed' }, BOOLEAN_FAILURE.text, false],
  ] satisfies readonly (readonly [string, SettingValue, string, boolean])[])(
    'keeps O2 first and every known wildcard with an %s Boolean',
    (_label, all, summary, reviewable) => {
      const facts = httpFacts({
        settings: read(settings({
          'ServerLogic/AllowedDomains': value('*.example.com, api.example.com, *.other.com'),
          'ServerLogic/AllowNetworkingToAllDomains': all,
        })),
      });
      const result = finding(facts, 'outbound');
      expect(result.status).toBe('needs-review');
      expect(result.summary).toBe(summary);
      expect(result.reasons.map((reason) => reason.text)).toEqual([
        summary,
        WILDCARD.text,
        "Wildcard entries aren't supported: `*.other.com` matches no host.",
      ]);
      expect(result.hasUnscannedEvidence).toBe(false);
      expect(canReviewFinding(result)).toBe(reviewable);
      const marked = evaluateSite(facts, new Set<ReviewKey>(['file-1:outbound']));
      expect(marked.files[0]?.findings[2]).toEqual({ ...result, status: reviewable ? 'reviewed' : 'needs-review' });
    },
  );

  it.each([
    ['O0', 'const c = Server.Connector;', 'needs-review', CONNECTORS_UNKNOWN],
    ['O1', 'function get() { return "{}"; }', 'configured', 'No HttpClient calls in code.'],
  ] as const)('%s remains code-based with irrelevant settings', (_row, code, status, summary) => {
    const irrelevant: readonly SiteFacts['settings'][] = [
      FAILED,
      UNREAD,
      read(settings({ 'ServerLogic/AllowedDomains': { kind: 'not-scanned' }, 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' } })),
      read(settings({ 'ServerLogic/AllowedDomains': value('*.example.com'), 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'envvar-unreadable', cause: 'failed' } })),
    ];
    for (const settingFacts of irrelevant) {
      const result = finding(siteFacts({ files: [file({ code: read(code) })], settings: settingFacts }), 'outbound');
      expect(result.status).toBe(status);
      expect(result.summary).toBe(summary);
      expect(result.hasUnscannedEvidence).toBe(false);
      expect(result.reasons).toEqual(status === 'configured' ? [] : [{ text: CONNECTORS_UNKNOWN, readFailure: false }]);
      expect(canReviewFinding(result)).toBe(status === 'needs-review');
      if (status === 'configured') expect(result.detail).toContain(FLOW_NOTE);
    }
  });

  it('does not make banner-only Enabled or timeout evidence a dependency of O6', () => {
    const result = finding(httpFacts({
      settings: read(settings({
        'ServerLogic/AllowedDomains': value('api.example.com'),
        'ServerLogic/AllowNetworkingToAllDomains': value('false'),
        'ServerLogic/Enabled': { kind: 'not-scanned' },
        'ServerLogic/TimeoutInSeconds': { kind: 'envvar-unreadable', cause: 'failed' },
      })),
    }), 'outbound');
    expect(result.status).toBe('configured');
    expect(result.hasUnscannedEvidence).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it('retains the environment-variable cache caveat as explanatory detail without setting rows', () => {
    const result = finding(httpFacts({
      settings: read(settings({
        'ServerLogic/AllowedDomains': value('api.example.com', true),
        'ServerLogic/AllowNetworkingToAllDomains': value('false'),
      })),
    }), 'outbound');
    expect(result.detail).toContain(ENVVAR_CACHE_NOTE);
    expect(result.detail.some((text) => text.startsWith('`ServerLogic/'))).toBe(false);
  });
});

describe('FR-7 unknown terminal ancestors (PB-002)', () => {
  it.each(['child', 'ancestor'] as const)(
    'keeps %s-linked descendants unresolved and reviewable with readable unknown scope',
    (link) => {
      for (const middle of [false, true]) {
        const facts = siteFacts({
          roles: read([role('staff'), role('other')]),
          permissions: read([
            permission('good'),
            permission('top', { scope: null, roleIds: [link === 'ancestor' ? 'staff' : 'other'] }),
            ...(middle ? [permission('middle', { scope: 'Parent', parentId: 'top', roleIds: [] })] : []),
            permission('child', { scope: 'Parent', parentId: middle ? 'middle' : 'top', roleIds: link === 'child' ? ['staff'] : [] }),
          ]),
        });
        const grants = grantSet.buildGrantSet(facts, file());
        expect(grants.grants.some((grant) => grant.permission.id === 'child')).toBe(false);
        expect(grants.reasons).toContainEqual({ text: "Couldn't evaluate parent permission `child`", readFailure: false });
        const result = finding(facts, 'tablePermissions');
        expect(result.status).toBe('needs-review');
        expect(result.hasUnscannedEvidence).toBe(false);
        expect(canReviewFinding(result)).toBe(true);
        const marked = evaluateSite(facts, new Set<ReviewKey>(['file-1:tablePermissions']));
        expect(marked.files[0]?.findings[1]).toEqual({ ...result, status: 'reviewed' });
      }
    },
  );

  it.each(['child', 'ancestor'] as const)(
    'excludes %s-linked descendants of a known inactive unknown-scope terminal',
    (link) => {
      const facts = siteFacts({
        roles: read([role('staff'), role('other')]),
        permissions: read([
          permission('top', { active: false, scope: null, roleIds: [link === 'ancestor' ? 'staff' : 'other'] }),
          permission('child', { scope: 'Parent', parentId: 'top', roleIds: link === 'child' ? ['staff'] : [] }),
        ]),
      });
      const grants = grantSet.buildGrantSet(facts, file());
      expect(grants.grants).toEqual([]);
      expect(grants.reasons).toEqual([]);
      expect(grants.ignored.find((grant) => grant.permission.id === 'child')?.reason).toBe('parent inactive, ignored');
      expect(finding(facts, 'tablePermissions').status).toBe('configured');
    },
  );

  it.each(['middle', 'child'] as const)('keeps a known inactive %s excluded', (inactive) => {
    const facts = siteFacts({
      roles: read([role('staff'), role('other')]),
      permissions: read([
        permission('top', { scope: null, roleIds: ['other'] }),
        permission('middle', { active: inactive !== 'middle', scope: 'Parent', parentId: 'top', roleIds: [] }),
        permission('child', { active: inactive !== 'child', scope: 'Parent', parentId: 'middle' }),
      ]),
    });
    const grants = grantSet.buildGrantSet(facts, file());
    expect(grants.grants).toEqual([]);
    expect(grants.reasons).toEqual([]);
    expect(grants.ignored.find((grant) => grant.permission.id === 'child')?.reason).toBe(
      inactive === 'child' ? 'inactive, ignored' : 'parent inactive, ignored',
    );
    expect(finding(facts, 'tablePermissions').status).toBe('configured');
  });

  it('does not invent an unknown-scope finding for a readable chain linked only to other roles', () => {
    const facts = siteFacts({
      roles: read([role('staff'), role('other')]),
      permissions: read([
        permission('top', { scope: null, roleIds: ['other'] }),
        permission('child', { scope: 'Parent', parentId: 'top', roleIds: [] }),
      ]),
    });
    expect(grantSet.buildGrantSet(facts, file()).reasons).toEqual([]);
    expect(finding(facts, 'tablePermissions').status).toBe('configured');
  });
});

describe('FR-8 finding detail and raw snapshot ownership (WR-001, PR-001)', () => {
  it('keeps raw-only role, permission and setting sentinels solely in FileResult.snapshot', () => {
    const facts = httpFacts({
      roles: read([role('staff', { name: 'snapshot-role-only' })]),
      permissions: read([permission('local', { table: 'snapshot_table_only' })]),
      settings: read(settings({
        'ServerLogic/AllowedDomains': value('snapshot-only.example'),
        'ServerLogic/AllowNetworkingToAllDomains': value('true'),
      })),
    });
    const result = evaluateFileChecks(facts, facts.files[0] ?? file());
    expect(result.findings[2].status).toBe('needs-review');
    for (const sentinel of ['snapshot-role-only', 'snapshot_table_only', 'snapshot-only.example']) {
      expect(JSON.stringify(result.snapshot)).toContain(sentinel);
      expect(JSON.stringify(result.findings)).not.toContain(sentinel);
    }
    expect(result.snapshot.roles).toContain(OTHER_ROLES_NOTE);
    expect(result.findings[1].detail).toContain(OTHER_ROLES_NOTE);
  });

  it('keeps configuration-bearing reasons, privilege explanations and reviewed originals', () => {
    const facts = httpFacts({
      permissions: read([permission('global', { table: 'required_table', scope: 'Global', privileges: ['Read', 'AppendTo'] })]),
      settings: read(settings({
        'ServerLogic/AllowedDomains': value('*.example.com'),
        'ServerLogic/AllowNetworkingToAllDomains': value('false'),
      })),
    });
    const tables = finding(facts, 'tablePermissions');
    const network = finding(facts, 'outbound');
    expect(tables.reasons).toContainEqual({ text: 'Global access to `required_table` (Global) from role `staff`.', readFailure: false });
    expect(tables.detail).toContain('Change privileges found: Append To.');
    expect(tables.detail).toContain('Based on exported function names, not on what the code does.');
    expect(network.reasons).toContainEqual(WILDCARD);
    for (const item of [tables, network]) {
      expect(item.detail).toEqual(expect.arrayContaining(item.reasons.map((reason) => reason.text)));
    }
    const marked = evaluateSite(facts, new Set<ReviewKey>(['file-1:tablePermissions', 'file-1:outbound']));
    expect(marked.files[0]?.findings[1]).toEqual({ ...tables, status: 'reviewed' });
    expect(marked.files[0]?.findings[2]).toEqual({ ...network, status: 'reviewed' });
    expect(marked.files[0]?.snapshot).toEqual(evaluateSite(facts, new Set()).files[0]?.snapshot);
  });

  it('builds exactly one grant set for each file and reuses it for the snapshot', () => {
    const spy = vi.spyOn(grantSet, 'buildGrantSet');
    const facts = siteFacts({ permissions: read([permission('local')]), files: [file(), file({ id: 'file-2' })] });
    const result = evaluateSite(facts, new Set());
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.files).toHaveLength(2);
    for (const evaluated of result.files) {
      expect(evaluated.snapshot.tables).toEqual(['contact · Contact · Read · role staff']);
      expect(evaluated.findings[1].status).toBe('configured');
    }
  });
});
