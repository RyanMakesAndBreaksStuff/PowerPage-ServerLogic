# P5.3 plan — Repair rules and separate finding explanation from snapshots

**Date:** 2026-11-01
**Baseline:** branch `logic-inspector-v2-build`, HEAD `820d7b8`; requires `p5-1_plan.md` Phase B (spec 4.1.0 precedence table, AC-8.5 and FR-7/FR-9 amendments). Independent of P5.2.
**Spec:** FR-7 grant set and Parent chain (4.1.0), FR-8 precedence table and finding ownership, FR-9 Table permissions and Outbound (O0–O6, wildcard rule), AC-8.1, AC-8.4, AC-8.5, AC-8.8, AC-8.10–AC-8.12, AC-9.2, AC-9.5.
**Audit items:** PB-001, PB-002, WR-006, WR-001 (model ownership half), PR-001.
**Supersedes:** Task 4 of `docs/plans/11-01-2026-phase-5-rules.md`. All four source files were re-read verbatim on 2026-11-01 and every case below was traced against them.
**Status:** Approved by the owner on 2026-11-01 (together with the P5.1 decisions X-01, X-02 and T1-01); ready for `sdd-superpowers:sdd-execute` after P5.1 Phase B lands.

## Goal

Findings keep every known reason when some required evidence is unscanned, cannot be marked reviewed until a scan supplies that evidence, treat a readable unknown-scope terminal ancestor as unresolved, keep wildcard reasons alongside O2, own only their explanation (raw configuration rows live in `FileResult.snapshot`), and compute each file's grant set once.

## Spec items missing from the build (gap table)

| # | Spec item | Current code (verbatim) | Gap |
|---|---|---|---|
| G1 | FR-8 precedence row 1–2 (PB-001) | `checks.ts` L64 `status: notScanned ? 'not-scanned' : reasons.length > 0 ? 'needs-review' : 'configured',` L65 `summary: notScanned ? NOT_SCANNED_TEXT : (reasons[0]?.text ?? configuredSummary),` | Any unscanned dependency forces Not scanned and hides known failures/adverse reasons from status and summary. |
| G2 | FR-8 precedence, `hasUnscannedEvidence` | `src/types/inspector.ts` L53–L61 `Finding` has `check, status, summary, reasons, guidance, questions, detail`. | No field represents unscanned required evidence. |
| G3 | AC-8.5 (4.1.0) | `rules.ts` L13–L15 `return finding.status === 'needs-review' && !finding.reasons.some((reason) => reason.readFailure);` | Incomplete evidence is reviewable; `evaluateSite` L20–L23 applies marks through this predicate, so fixing it covers both paths. |
| G4 | FR-7 Parent chain (PB-002) | `grantSet.ts` L31 `while (current.scope === 'Parent') {` … L39 `return { top: current, inactive, unresolved: false };` | A terminal ancestor with `scope === null` ends the loop as resolved; a linked descendant becomes a Configured grant with no reason. |
| G5 | FR-7 mixed evidence in the grant set | `grantSet.ts` L47–L52: read-failed returns one reason; not-scanned returns `notScanned: true`; never both. | Mixed failed + unscanned loses the unscanned part. |
| G6 | FR-9 Outbound wildcard rule (WR-006) | `checks.ts` L215–L217 `const invalid = [...domains.reasons, ...all.reasons]; if (invalid.length > 0 \|\| domains.value === null \|\| all.value === null) return makeFinding('outbound', '', invalid, snapshot);` | Wildcard reasons (L226–L229) are collected only after the O2 return. |
| G7 | FR-8 finding ownership (WR-001) | `checks.ts` L115 `const detail: string[] = [...permissionSnapshot(grants), OTHER_ROLES_NOTE];`; L181 `const snapshot = settingSnapshot(facts);` passed as detail on every outbound path; L103 web-role detail = role names. | Raw rows are copied into `Finding.detail`, so "Configuration snapshot off" still exports them. |
| G8 | PR-001 | `checks.ts` L113 `const grants = buildGrantSet(facts, file);` and L255 `tables: permissionSnapshot(buildGrantSet(facts, file)),` | Two grant-set traversals per file. |
| G9 | AC-8.1 | `rules.test.ts` L15–L23 `stateFinding` and `report/reportFixtures.ts` L15–L30 `reportFinding` build `Finding` literals. | Both need the new required field. |

Existing behaviour that must not change (checked against the current tests): the 64-state table and its aggregate `{ C: 48, V: 48, M: 48, U: 48, T: 192, K: 96 }`; "refuses every read failure even when a different reason leads the summary"; "allows analysis limits, but not Configured or Not scanned"; O2 ordering in "collects both O2 issues and treats unreadable envvars as read failures" (`[DOMAIN_FAILURE, BOOLEAN_DUPLICATE]`); wildcard-before-row ordering in the O5 wildcard test; the inactive-ancestor labels `'inactive, ignored'` / `'parent inactive, ignored'`; detail lines `Change privileges found: …`, `Based on exported function names, not on what the code does.`, `FLOW_NOTE` and the O6 row text (these are explanation, not snapshot).

---

## Phase A — Failing evidence tests

**Files:** create `src/features/inspector/model/evidence.test.ts`.

- [ ] **A1. Create `src/features/inspector/model/evidence.test.ts`**

```typescript
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
  { name: 'failed domain variable plus unscanned Boolean variable', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable' }, 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' } })) }), check: 'outbound', status: 'needs-review', reasons: [DOMAIN_FAILURE] },
  { name: 'unscanned domain variable plus failed Boolean variable', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'not-scanned' }, 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'envvar-unreadable' } })) }), check: 'outbound', status: 'needs-review', reasons: [BOOLEAN_FAILURE] },
  { name: 'invalid domains plus unscanned Boolean variable', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': value('https://invalid.example'), 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' } })) }), check: 'outbound', status: 'needs-review', reasons: [{ text: "Couldn't interpret `ServerLogic/AllowedDomains`: `https://invalid.example`", readFailure: false }] },
  { name: 'unscanned domains plus duplicate Boolean setting', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'not-scanned' }, 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' } })) }), check: 'outbound', status: 'needs-review', reasons: [BOOLEAN_DUPLICATE] },
  { name: 'known wildcard plus unscanned Boolean variable', facts: httpFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': value('*.example.com, api.example.com'), 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' } })) }), check: 'outbound', status: 'needs-review', reasons: [WILDCARD] },
  { name: 'failed domain variable plus unscanned code', facts: siteFacts({ settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable' } })), files: [file({ code: UNREAD })] }), check: 'outbound', status: 'needs-review', reasons: [DOMAIN_FAILURE] },
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
});

describe('FR-9 outbound intersections (WR-006)', () => {
  it.each([
    ['invalid', value('maybe'), "Couldn't interpret `ServerLogic/AllowNetworkingToAllDomains`", true],
    ['duplicate', { kind: 'duplicate' }, BOOLEAN_DUPLICATE.text, true],
    ['unreadable', { kind: 'envvar-unreadable' }, BOOLEAN_FAILURE.text, false],
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
      read(settings({ 'ServerLogic/AllowedDomains': value('*.example.com'), 'ServerLogic/AllowNetworkingToAllDomains': { kind: 'envvar-unreadable' } })),
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
        'ServerLogic/TimeoutInSeconds': { kind: 'envvar-unreadable' },
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
```

- [ ] **A2. Capture the signal**

```powershell
npm test -- src/features/inspector/model/evidence.test.ts
```

Expected: exit 1. Failing at the baseline: the type assertion (checked by `tsc`, see Phase C), every mixed case (status is `not-scanned` and the summary is `NOT_SCANNED_TEXT`), the O2 intersections (no wildcard reasons), both linked-ancestor variants (`child` is granted), the sentinel test (`snapshot-role-only` and the setting value appear in finding detail), and the spy count (4 calls instead of 2). The O0/O1, inactive-ancestor and "linked only to other roles" tests pass before and after.

---

## Phase B — Implementation

**Files:** `src/types/inspector.ts`, `src/features/inspector/model/checks.ts`, `grantSet.ts`, `rules.ts`, `rules.test.ts`, `src/features/inspector/report/reportFixtures.ts`.

- [ ] **B1. `src/types/inspector.ts`** (L53–L61)

```diff
 export type Finding = {
   check: CheckId;
   status: CheckStatus;
+  /** True when evidence this check needs was not read before the scan was interrupted (FR-8 precedence table). */
+  hasUnscannedEvidence: boolean;
   summary: string;
   reasons: readonly Reason[];
   guidance: string;
   questions: readonly string[];
+  /** Explanation only (reasons, notes, limits). Raw configuration rows live in `FileResult.snapshot`. */
   detail: readonly string[];
 };
```

- [ ] **B2. `src/features/inspector/model/grantSet.ts`** (L24–L40 and L42–L89)

```diff
 type ParentChain = {
   top: TablePermissionFact;
   inactive: boolean;
+  /** The chain could not be followed, or (PB-002) a Parent chain ends at a readable ancestor whose scope is unknown. */
   unresolved: boolean;
 };
@@
     current = parent;
     inactive ||= !current.active;
   }
-  return { top: current, inactive, unresolved: false };
+  return {
+    top: current,
+    inactive,
+    unresolved: permission.scope === 'Parent' && current.scope === null,
+  };
 }
 
 export function buildGrantSet(facts: SiteFacts, file: ServerLogicFileFacts): GrantSet {
-  const base: GrantSet = { grants: [], ignored: [], reasons: [], roleIds: [], notScanned: false };
   const evidence = [facts.roles, facts.permissions, file.roleIds];
+  // Unscanned and failed evidence are reported together (FR-8 precedence): a failure never hides the gap.
+  const base: GrantSet = {
+    grants: [],
+    ignored: [],
+    reasons: [],
+    roleIds: [],
+    notScanned: evidence.some((item) => !item.ok && item.reason === 'not-scanned'),
+  };
   if (evidence.some((item) => !item.ok && item.reason === 'read-failed')) {
     return { ...base, reasons: [{ text: "Couldn't read configuration", readFailure: true }] };
   }
-  if (evidence.some((item) => !item.ok && item.reason === 'not-scanned')) {
-    return { ...base, notScanned: true };
-  }
-  if (!facts.roles.ok || !facts.permissions.ok || !file.roleIds.ok) return base;
+  if (!facts.roles.ok || !file.roleIds.ok) return base;
   const roles = facts.roles.value;
   const byRoleId = new Map(roles.map((role) => [role.id, role]));
   if (file.roleIds.value.some((id) => !byRoleId.has(id))) {
     return { ...base, reasons: [{ text: "Couldn't read configuration", readFailure: true }] };
   }
+  if (!facts.permissions.ok) return base;
   const assigned = roles.filter((role) => file.roleIds.ok && file.roleIds.value.includes(role.id));
@@
-    } else if (chain.unresolved) {
+    } else if (chain.unresolved && (chain.top.scope !== null || linked.length > 0)) {
+      // A missing/looping chain is always reported; an unknown-scope terminal only when this file is linked to it.
       reasons.push({
         text: `Couldn't evaluate parent permission \`${permission.name}\``,
         readFailure: false,
       });
```

Order is preserved: `!permission.active` → `chain.inactive` → `chain.unresolved` → grant, so a known inactive ancestor still wins over an unknown scope.

- [ ] **B3. `src/features/inspector/model/checks.ts`** — full replacement (current 259 lines)

```typescript
import type { ConnectorUse } from '@/lib/code-analysis/codeAnalysis.types';
import { detectConnectorUse, exportedFunctionNames } from '@/lib/code-analysis/structure';
import { METHOD_FUNCTION } from '@/types/http';
import type {
  CheckId,
  FileResult,
  Finding,
  Reason,
  ServerLogicFileFacts,
  SiteFacts,
} from '@/types/inspector';
import {
  CHECK_COPY,
  CODE_ANALYSIS_LIMIT,
  CODE_READ_FAILURE,
  CONNECTORS_UNKNOWN,
  ENVVAR_CACHE_NOTE,
  FLOW_NOTE,
  NOT_SCANNED_TEXT,
  OTHER_ROLES_NOTE,
} from './copy';
import { buildGrantSet, permissionSnapshot } from './grantSet';
import type { GrantSet } from './grantSet';
import { parseAllowedDomains, parseBooleanSetting, settingSnapshot } from './settings';

type Analysis = {
  connectors: ConnectorUse | null;
  names: readonly string[] | null;
  reason: Reason | null;
  notScanned: boolean;
};

function analyse(file: ServerLogicFileFacts): Analysis {
  if (!file.code.ok) {
    return {
      connectors: null,
      names: null,
      reason:
        file.code.reason === 'read-failed' ? { text: CODE_READ_FAILURE, readFailure: true } : null,
      notScanned: file.code.reason === 'not-scanned',
    };
  }
  const connectors = detectConnectorUse(file.code.value);
  const names = exportedFunctionNames(file.code.value);
  return {
    connectors,
    names,
    reason:
      connectors === null || names === null
        ? { text: CODE_ANALYSIS_LIMIT, readFailure: false }
        : null,
    notScanned: false,
  };
}

/**
 * FR-8 precedence: any known reason makes the check Needs review, even when other required evidence is
 * unscanned; only a check with no reason and unscanned evidence is Not scanned. `hasUnscannedEvidence`
 * is recorded either way, and `canReviewFinding` refuses review while it is true.
 */
function makeFinding(
  check: CheckId,
  configuredSummary: string,
  reasons: readonly Reason[],
  detail: readonly string[],
  hasUnscannedEvidence = false,
): Finding {
  const copy = CHECK_COPY[check];
  return {
    check,
    status: reasons.length > 0 ? 'needs-review' : hasUnscannedEvidence ? 'not-scanned' : 'configured',
    summary: reasons[0]?.text ?? (hasUnscannedEvidence ? NOT_SCANNED_TEXT : configuredSummary),
    hasUnscannedEvidence,
    reasons,
    guidance: copy.guidance,
    questions: copy.questions,
    detail: [
      ...reasons.map((reason) => reason.text),
      ...(hasUnscannedEvidence ? [NOT_SCANNED_TEXT] : []),
      ...detail,
    ],
  };
}

function webRole(facts: SiteFacts, file: ServerLogicFileFacts): Finding {
  const evidence = [facts.roles, file.roleIds];
  const failed = evidence.some((item) => !item.ok && item.reason === 'read-failed');
  const notScanned = evidence.some((item) => !item.ok && item.reason === 'not-scanned');
  const roles = facts.roles.ok ? facts.roles.value : [];
  const ids = file.roleIds.ok ? file.roleIds.value : [];
  const reasons: Reason[] = [];
  if (file.roleIds.ok && ids.length === 0)
    reasons.push({
      text: 'No web role assigned. No site user can call it yet.',
      readFailure: false,
    });
  if (roles.some((role) => ids.includes(role.id) && role.anonymous)) {
    reasons.push({ text: 'Callable by unauthenticated visitors.', readFailure: false });
  }
  if (
    failed ||
    (facts.roles.ok && file.roleIds.ok && ids.some((id) => !roles.some((role) => role.id === id)))
  ) {
    reasons.push({ text: "Couldn't read configuration", readFailure: true });
  }
  // Assigned role names are snapshot rows (FileResult.snapshot.roles), not explanation.
  return makeFinding('webRole', 'Web role assigned.', reasons, [], notScanned);
}

function tablePermissions(grants: GrantSet, analysis: Analysis): Finding {
  const reasons: Reason[] = [];
  const detail: string[] = [OTHER_ROLES_NOTE];
  for (const grant of grants.grants) {
    if (grant.permission.scope === 'Global') {
      reasons.push({
        text: `Global access to \`${grant.permission.table}\` (Global) from role ${grant.roleNames.map((name) => `\`${name}\``).join(', ')}.`,
        readFailure: false,
      });
    }
  }
  const mapped =
    analysis.names?.filter((name) =>
      Object.values(METHOD_FUNCTION).some((method) => method === name),
    ) ?? [];
  const changes = [
    ...new Set(
      grants.grants
        .flatMap((grant) => grant.permission.privileges)
        .filter((privilege) => privilege !== 'Read'),
    ),
  ];
  if (mapped.length === 1 && mapped[0] === 'get' && changes.length > 0) {
    reasons.push({
      text: 'Change privileges on a handler that only exports `get()`',
      readFailure: false,
    });
    detail.push(
      `Change privileges found: ${changes.map((privilege) => (privilege === 'AppendTo' ? 'Append To' : privilege)).join(', ')}.`,
      'Based on exported function names, not on what the code does.',
    );
  }
  const noGrants = grants.grants.length === 0 && grants.reasons.length === 0 && !grants.notScanned;
  if (noGrants && analysis.reason === null && analysis.connectors?.dataverse) {
    reasons.push({
      text: 'Handler uses Dataverse but no table permissions are linked to its roles.',
      readFailure: false,
    });
  }
  if (
    noGrants &&
    analysis.reason === null &&
    analysis.connectors?.undetermined &&
    !analysis.connectors.dataverse
  ) {
    reasons.push({ text: CONNECTORS_UNKNOWN, readFailure: false });
  }
  reasons.push(...grants.reasons);
  for (const grant of grants.grants) {
    if (grant.permission.scope === null)
      reasons.push({
        text: `Couldn't interpret the scope of \`${grant.permission.name}\``,
        readFailure: false,
      });
  }
  if (analysis.reason !== null) reasons.push(analysis.reason);
  return makeFinding(
    'tablePermissions',
    noGrants
      ? 'No Dataverse access in code, so no table permissions are needed.'
      : 'Table permissions linked to the grant set.',
    reasons,
    detail,
    grants.notScanned || analysis.notScanned,
  );
}

function outbound(facts: SiteFacts, analysis: Analysis): Finding {
  const connectors = analysis.connectors;
  // O0 / O1: code-based rows are decided first and never depend on settings (FR-9).
  if (analysis.reason === null && connectors !== null && !connectors.httpClient) {
    return connectors.undetermined
      ? makeFinding('outbound', '', [{ text: CONNECTORS_UNKNOWN, readFailure: false }], [])
      : makeFinding('outbound', 'No HttpClient calls in code.', [], [FLOW_NOTE]);
  }
  const codeReason =
    analysis.reason ??
    (connectors === null && !analysis.notScanned
      ? { text: CODE_ANALYSIS_LIMIT, readFailure: false }
      : null);
  const reasons: Reason[] = codeReason === null ? [] : [codeReason];
  if (!facts.settings.ok) {
    if (facts.settings.reason === 'read-failed') {
      reasons.push({ text: "Couldn't read configuration", readFailure: true });
    }
    return makeFinding(
      'outbound',
      '',
      reasons,
      [],
      analysis.notScanned || facts.settings.reason === 'not-scanned',
    );
  }
  const domains = parseAllowedDomains(facts.settings.value['ServerLogic/AllowedDomains']);
  const all = parseBooleanSetting(
    'ServerLogic/AllowNetworkingToAllDomains',
    facts.settings.value['ServerLogic/AllowNetworkingToAllDomains'],
  );
  // O2 reasons lead; every known wildcard reason is kept with them (WR-006).
  const invalid = [...domains.reasons, ...all.reasons];
  reasons.push(
    ...invalid,
    ...(domains.value?.wildcards ?? []).map((entry) => ({
      text: `Wildcard entries aren't supported: \`${entry}\` matches no host.`,
      readFailure: false,
    })),
  );
  const notScanned = analysis.notScanned || domains.notScanned || all.notScanned;
  const detail = domains.fromEnvVar || all.fromEnvVar ? [ENVVAR_CACHE_NOTE] : [];
  if (
    codeReason !== null ||
    notScanned ||
    invalid.length > 0 ||
    domains.value === null ||
    all.value === null
  ) {
    return makeFinding('outbound', '', reasons, detail, notScanned);
  }
  const hosts = domains.value.hosts;
  const row = all.value
    ? hosts.length === 0
      ? 'All domains allowed. Limit to the hosts it calls.'
      : "`AllowedDomains` is set but `AllowNetworkingToAllDomains` isn't `false`, so the list doesn't apply and all domains are allowed."
    : hosts.length === 0
      ? 'Outbound calls are blocked. The handler calls HttpClient, but no domains are allowed.'
      : `Allowed domains ${hosts.map((host) => `\`${host}\``).join(', ')}. Whether they cover every host the handler calls isn't checked.`;
  if (all.value || hosts.length === 0) reasons.push({ text: row, readFailure: false });
  return makeFinding('outbound', row, reasons, [row, ...detail]);
}

export function evaluateFileChecks(facts: SiteFacts, file: ServerLogicFileFacts): FileResult {
  const analysis = analyse(file);
  const grants = buildGrantSet(facts, file);
  const web = webRole(facts, file);
  const tables = tablePermissions(grants, analysis);
  const network = outbound(facts, analysis);
  const roles =
    facts.roles.ok && file.roleIds.ok
      ? facts.roles.value
          .filter((role) => file.roleIds.ok && file.roleIds.value.includes(role.id))
          .map(
            (role) =>
              `${role.name}${role.anonymous ? ' (Anonymous Users Role)' : role.authenticated ? ' (Authenticated Users Role)' : ''}`,
          )
      : [web.summary];
  return {
    fileId: file.id,
    name: file.name,
    active: file.active,
    findings: [web, tables, network],
    snapshot: {
      roles: [...roles, OTHER_ROLES_NOTE],
      tables: permissionSnapshot(grants),
      outbound: [network.summary, ...settingSnapshot(facts)],
    },
  };
}
```

Behavioural notes verified against the current code: the only outbound path that changes for *complete* evidence is O2, which now also carries wildcard reasons; O3–O6 keep the wildcard-then-row order; a code read failure or analysis limit now also reports known setting problems instead of stopping at the code reason (conservative: no conclusive no-use result exists in that case), and the existing `checks.test.ts` fixtures for those cases use default (absent) settings, so their expected reasons are unchanged.

- [ ] **B4. `src/features/inspector/model/rules.ts`** (L13–L15)

```diff
 export function canReviewFinding(finding: Finding): boolean {
-  return finding.status === 'needs-review' && !finding.reasons.some((reason) => reason.readFailure);
+  return (
+    finding.status === 'needs-review' &&
+    !finding.hasUnscannedEvidence &&
+    !finding.reasons.some((reason) => reason.readFailure)
+  );
 }
```

`evaluateSite` (L20–L23) already routes every mark through this predicate, so marks for incomplete findings are refused there too.

- [ ] **B5. Fixture constructors** (G9)

`src/features/inspector/model/rules.test.ts` L15–L23:

```diff
 const stateFinding = (check: CheckId, status: CheckStatus): Finding => ({
   check,
   status,
+  hasUnscannedEvidence: status === 'not-scanned',
   summary: status,
```

`src/features/inspector/report/reportFixtures.ts` L15–L30:

```diff
   return {
     check,
     status,
+    hasUnscannedEvidence: status === 'not-scanned',
     summary: status === 'not-scanned' ? 'Not read before the connection was lost' : text,
```

`src/features/inspector/report/buildReportModel.test.ts` L52–L95 spreads `file.findings[1]` and inherits the field; no change.

---

## Phase C — Confirm

- [ ] **C1. Focused and neighbouring suites**

```powershell
npm test -- src/features/inspector/model/evidence.test.ts
npm test -- src/features/inspector/model src/features/inspector/report src/lib/code-analysis src/types/contracts.test.ts src/skeleton.test.ts
```

Expected: the first passes all 49 cases. The second passes with no changed expectations: the 64-state table and its aggregate, "refuses every read failure even when a different reason leads the summary", "allows analysis limits, but not Configured or Not scanned", "retains the Not scanned text and every unaffected check" (code unscanned, `stopped: 'connection-lost'`, all three marks → webRole `configured`, tablePermissions summary `NOT_SCANNED_TEXT`, outbound `not-scanned`), the O0–O6 table, both wildcard tests, "collects both O2 issues…", the grant-set and banner suites, settings, code analysis, and the Markdown goldens (`__golden__/file.md`, `__golden__/site.md` render the fixture's literal `detail`, which is untouched).

`checks.test.ts` "AC-8.8 Web role" already reads assigned role names from `snapshot.roles` (L36), not from `detail`, so removing the names from web-role detail (G7) breaks no existing assertion.

- [ ] **C2. Type, lint and build gates**

```powershell
npm run typecheck
npx --no-install eslint src/features/inspector/model src/features/inspector/report/reportFixtures.ts src/types/inspector.ts --max-warnings=0
npm test
npm run build
```

Expected: all exit 0. A diagnostic in any file listed in this plan is a P5.3 failure; unrelated diagnostics are recorded against the baseline, not fixed here.

- [ ] **C3. Commit**

```powershell
git add -- src/types/inspector.ts src/features/inspector/model/checks.ts src/features/inspector/model/grantSet.ts src/features/inspector/model/rules.ts src/features/inspector/model/rules.test.ts src/features/inspector/model/evidence.test.ts src/features/inspector/report/reportFixtures.ts
git commit -m "fix(inspector): preserve partial evidence and isolate snapshots"
```

---

## Exit proof for P5.3

- Every row of the FR-8 precedence table has at least one executed case per check in `evidence.test.ts`; review marks cannot hide incomplete evidence through `canReviewFinding` or `evaluateSite`.
- O2 intersections with an invalid, duplicate or unreadable Boolean keep the leading O2 reason and every wildcard reason; the unreadable case stays non-reviewable.
- A readable unknown-scope terminal ancestor never yields Configured for a linked descendant (child-linked and ancestor-linked, with and without a middle permission); known inactive ancestors still exclude.
- All 64 output-state combinations produce the same counts and results.
- Snapshot-only sentinels appear only in `FileResult.snapshot`; mandatory reasons and explanatory lines remain in `Finding.detail`. P5.6 can therefore drop `model.snapshot` without string-prefix filtering.
- One `buildGrantSet` call per file.

## Self-review

- Spec coverage: G1–G9 each map to B1–B5 and are asserted in A1.
- Placeholders: none; `checks.ts` is given in full, the other edits are anchored on verbatim current lines.
- Type consistency: `Finding.hasUnscannedEvidence: boolean` (required) matches `p5-1_plan.md`'s spec text and the P5.6 report fixtures; `GrantSet.notScanned` and `reasons` keep their existing shapes; `tablePermissions(grants: GrantSet, analysis: Analysis)` is module-private; `evaluateFileChecks`, `evaluateSite`, `canReviewFinding` signatures are unchanged.
