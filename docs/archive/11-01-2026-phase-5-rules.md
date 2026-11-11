# P5.3 Rule Evidence Implementation Plan

**Goal:** Produce faithful, non-bypassable findings from partial evidence while separating their explanations from optional configuration snapshots.

**Architecture:** Task 1 owns the amended FR-7–FR-9 evidence matrix and review policy. `evaluateFileChecks` derives findings and their snapshot from one grant set; `makeFinding` records incompleteness and `canReviewFinding` enforces eligibility for both direct callers and `evaluateSite` marks. Existing `SiteFacts`, `Readable`, setting parsers, connector analysis and count functions supply the inputs and downstream behavior.

**Tech stack:** Existing TypeScript 6, Vitest 5, Acorn-based analysis and repository fixtures.

**Scope:** P5.3; PB-001, PB-002, WR-006, WR-001's model ownership and PR-001; FR-7 grant/setting interpretation, FR-8 finding/review contracts and FR-9 intersections.

**Out of scope:** Work assigned to P5.2 and P5.4–P5.8.

**Dependency:** Execute after Task 1 in the [Phase 5 plan](11-01-2026-phase-5-logic-inspector.md) records the authoritative evidence matrix. P5.4, P5.5 and P5.6 consume this task's contract.

**Coordination:** Task 4 exclusively owns the required `Finding.hasUnscannedEvidence: boolean` declaration in `src/types/inspector.ts`, its production initialization in `checks.ts::makeFinding`, and migration of both existing literal factories: `rules.test.ts::stateFinding` and `report/reportFixtures.ts::reportFinding`. The report task references this migration rather than duplicating it. `model/fixtures.ts` constructs facts, not findings. `src/types/contracts.test.ts` and `src/skeleton.test.ts` reference the type without constructing findings; the new test below pins the required property without editing the dirty Starter contract test.

**Grounding:** CodeGraph traced `evaluateSite → evaluateFileChecks → tablePermissions/makeFinding` and the report consumers; the complete relevant FR-7–FR-9 and AC-7/AC-8 sections, current grant/settings/check implementations, model tests, report fixtures and plan template were inspected. Source references below are from the working tree on 2026-11-01, not merely HEAD.

**Planning evidence:** `npm test -- src/features/inspector/model src/features/inspector/report src/types/contracts.test.ts` passed: 8 files, 211 tests. The complete Step 1 suite was also run against unchanged production source through a temporary scratch-only Vitest config: `npm test -- --config .scratch/phase5-2026-11-01/rules-prechange.config.ts --reporter=dot` failed with **43 failed / 6 passed, 49 total**. Observed failures include Not scanned masking known failures, absent incompleteness flags, review eligibility accepting a flagged finding, discarded O2 wildcards, active descendants granted through unknown terminal scope, raw snapshot sentinels in detail, and four grant computations for two files. The temporary config/test are planning probes; execution creates the permanent test at Step 1.

**Plan-code verification:** The Step 1 test and every Step 3 hunk were extracted from this document and applied in memory over the current source. `npm test -- --config .scratch/phase5-2026-11-01/rules-postchange.config.ts` passed **16 files / 468 tests**, including all 49 new regressions and the existing 64 output-state combinations. `node .scratch/phase5-2026-11-01/rules-typecheck.mjs` typechecked the complete application program plus the planned test successfully. `node .scratch/phase5-2026-11-01/rules-lint.mjs` checked the seven planned files against that same TypeScript program: zero errors or warnings. These temporary read-only source overlays validate the plan, not an implemented production change; the probes are removed from the deliverable.

**External regression gates:** The [baseline evidence](11-01-2026-phase-5-baseline.md) owns current and earlier checkpoint outcomes. Existing work changed during planning; later typecheck and builds pass. Re-establish full-script gates at execution, without treating this task's source overlays as integrated release proof.

---

### Task 4: Preserve partial rule evidence, enforce review eligibility and isolate raw snapshots

**Owns:** The P5.3 contracts and implementation listed above; applies Task 1's matrix rather than introducing a second policy definition.

**Files:**

- Create: `src/features/inspector/model/evidence.test.ts` — complete evidence, ancestor, wildcard, snapshot and computation regressions.
- Modify: `src/types/inspector.ts:53` — required finding incompleteness field.
- Modify: `src/features/inspector/model/checks.ts:54` — classification, independent evidence collection and snapshot ownership.
- Modify: `src/features/inspector/model/grantSet.ts:24` — terminal-scope resolution and retained evidence availability.
- Modify: `src/features/inspector/model/rules.ts:13` — authoritative eligibility predicate.
- Modify: `src/features/inspector/model/rules.test.ts:16` — migrate the existing 64-state fixture constructor.
- Modify: `src/features/inspector/report/reportFixtures.ts:14` — migrate the existing report fixture constructor.
- Signal: `src/features/inspector/model/evidence.test.ts` — 49 executable regression cases.
- Signal: `src/features/inspector/model/rules.test.ts` — existing 64 combinations, aggregate counts, file result precedence and review/undo behavior.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/inspector/model/evidence.test.ts` with these complete contents:

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
const NO_ROLE: Reason = {
  text: 'No web role assigned. No site user can call it yet.',
  readFailure: false,
};
const GLOBAL: Reason = {
  text: 'Global access to `contact` (Global) from role `staff`.',
  readFailure: false,
};
const DOMAIN_FAILURE: Reason = {
  text: "Couldn't read `ServerLogic/AllowedDomains` from its environment variable",
  readFailure: true,
};
const BOOLEAN_FAILURE: Reason = {
  text: "Couldn't read `ServerLogic/AllowNetworkingToAllDomains` from its environment variable",
  readFailure: true,
};
const BOOLEAN_DUPLICATE: Reason = {
  text: 'Duplicate `ServerLogic/AllowNetworkingToAllDomains`',
  readFailure: false,
};
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
  {
    name: 'failed role inventory plus unscanned file roles',
    facts: siteFacts({ roles: FAILED, files: [file({ roleIds: UNREAD })] }),
    check: 'webRole',
    status: 'needs-review',
    reasons: [CONFIG_FAILURE],
  },
  {
    name: 'unscanned role inventory plus failed file roles',
    facts: siteFacts({ roles: UNREAD, files: [file({ roleIds: FAILED })] }),
    check: 'webRole',
    status: 'needs-review',
    reasons: [CONFIG_FAILURE],
  },
  {
    name: 'known empty assignment plus unscanned role inventory',
    facts: siteFacts({ roles: UNREAD, files: [file({ roleIds: read([]) })] }),
    check: 'webRole',
    status: 'needs-review',
    reasons: [NO_ROLE],
  },
  {
    name: 'unscanned role inventory without an established finding',
    facts: siteFacts({ roles: UNREAD }),
    check: 'webRole',
    status: 'not-scanned',
    reasons: [],
  },
  {
    name: 'unscanned file roles without an established finding',
    facts: siteFacts({ files: [file({ roleIds: UNREAD })] }),
    check: 'webRole',
    status: 'not-scanned',
    reasons: [],
  },
  {
    name: 'wholly unavailable web-role evidence',
    facts: siteFacts({ roles: UNREAD, files: [file({ roleIds: UNREAD })] }),
    check: 'webRole',
    status: 'not-scanned',
    reasons: [],
  },
  {
    name: 'failed permission inventory plus unscanned code',
    facts: siteFacts({ permissions: FAILED, files: [file({ code: UNREAD })] }),
    check: 'tablePermissions',
    status: 'needs-review',
    reasons: [CONFIG_FAILURE],
  },
  {
    name: 'unscanned permission inventory plus failed code',
    facts: siteFacts({ permissions: UNREAD, files: [file({ code: FAILED })] }),
    check: 'tablePermissions',
    status: 'needs-review',
    reasons: [CODE_FAILURE],
  },
  {
    name: 'failed grant-role inventory plus unscanned assignment',
    facts: siteFacts({ roles: FAILED, files: [file({ roleIds: UNREAD })] }),
    check: 'tablePermissions',
    status: 'needs-review',
    reasons: [CONFIG_FAILURE],
  },
  {
    name: 'unscanned grant-role inventory plus failed assignment',
    facts: siteFacts({ roles: UNREAD, files: [file({ roleIds: FAILED })] }),
    check: 'tablePermissions',
    status: 'needs-review',
    reasons: [CONFIG_FAILURE],
  },
  {
    name: 'missing assigned role in a read inventory plus unscanned permissions',
    facts: siteFacts({ permissions: UNREAD, files: [file({ roleIds: read(['missing']) })] }),
    check: 'tablePermissions',
    status: 'needs-review',
    reasons: [CONFIG_FAILURE],
  },
  {
    name: 'known Global access plus unscanned code',
    facts: siteFacts({
      permissions: read([permission('global', { scope: 'Global' })]),
      files: [file({ code: UNREAD })],
    }),
    check: 'tablePermissions',
    status: 'needs-review',
    reasons: [GLOBAL],
  },
  {
    name: 'known unknown scope plus unscanned code',
    facts: siteFacts({
      permissions: read([permission('unknown', { scope: null })]),
      files: [file({ code: UNREAD })],
    }),
    check: 'tablePermissions',
    status: 'needs-review',
    reasons: [{ text: "Couldn't interpret the scope of `unknown`", readFailure: false }],
  },
  {
    name: 'downloaded analysis limit plus unscanned permissions',
    facts: siteFacts({ permissions: UNREAD, files: [file({ code: read('') })] }),
    check: 'tablePermissions',
    status: 'needs-review',
    reasons: [ANALYSIS_LIMIT],
  },
  {
    name: 'unscanned permissions without an established finding',
    facts: siteFacts({ permissions: UNREAD }),
    check: 'tablePermissions',
    status: 'not-scanned',
    reasons: [],
  },
  {
    name: 'wholly unavailable table-permission evidence',
    facts: siteFacts({
      roles: UNREAD,
      permissions: UNREAD,
      files: [file({ roleIds: UNREAD, code: UNREAD })],
    }),
    check: 'tablePermissions',
    status: 'not-scanned',
    reasons: [],
  },
  {
    name: 'failed outbound settings plus unscanned code',
    facts: siteFacts({ settings: FAILED, files: [file({ code: UNREAD })] }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [CONFIG_FAILURE],
  },
  {
    name: 'failed code plus unscanned outbound settings',
    facts: siteFacts({ settings: UNREAD, files: [file({ code: FAILED })] }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [CODE_FAILURE],
  },
  {
    name: 'downloaded analysis limit plus unscanned outbound settings',
    facts: siteFacts({ settings: UNREAD, files: [file({ code: read('') })] }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [ANALYSIS_LIMIT],
  },
  {
    name: 'failed domain variable plus unscanned Boolean variable',
    facts: httpFacts({
      settings: read(settings({
        'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable' },
        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' },
      })),
    }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [DOMAIN_FAILURE],
  },
  {
    name: 'unscanned domain variable plus failed Boolean variable',
    facts: httpFacts({
      settings: read(settings({
        'ServerLogic/AllowedDomains': { kind: 'not-scanned' },
        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'envvar-unreadable' },
      })),
    }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [BOOLEAN_FAILURE],
  },
  {
    name: 'invalid domains plus unscanned Boolean variable',
    facts: httpFacts({
      settings: read(settings({
        'ServerLogic/AllowedDomains': value('https://invalid.example'),
        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' },
      })),
    }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [{
      text: "Couldn't interpret `ServerLogic/AllowedDomains`: `https://invalid.example`",
      readFailure: false,
    }],
  },
  {
    name: 'unscanned domains plus duplicate Boolean setting',
    facts: httpFacts({
      settings: read(settings({
        'ServerLogic/AllowedDomains': { kind: 'not-scanned' },
        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' },
      })),
    }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [BOOLEAN_DUPLICATE],
  },
  {
    name: 'known wildcard plus unscanned Boolean variable',
    facts: httpFacts({
      settings: read(settings({
        'ServerLogic/AllowedDomains': value('*.example.com, api.example.com'),
        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' },
      })),
    }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [WILDCARD],
  },
  {
    name: 'failed domain variable plus unscanned code',
    facts: siteFacts({
      settings: read(settings({ 'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable' } })),
      files: [file({ code: UNREAD })],
    }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [DOMAIN_FAILURE],
  },
  {
    name: 'known wildcard and duplicate Boolean setting plus unscanned code',
    facts: siteFacts({
      settings: read(settings({
        'ServerLogic/AllowedDomains': value('*.example.com'),
        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' },
      })),
      files: [file({ code: UNREAD })],
    }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [BOOLEAN_DUPLICATE, WILDCARD],
  },
  {
    name: 'failed code and duplicate Boolean setting plus unscanned domains',
    facts: siteFacts({
      settings: read(settings({
        'ServerLogic/AllowedDomains': { kind: 'not-scanned' },
        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' },
      })),
      files: [file({ code: FAILED })],
    }),
    check: 'outbound',
    status: 'needs-review',
    reasons: [CODE_FAILURE, BOOLEAN_DUPLICATE],
  },
  {
    name: 'unscanned outbound code without an established finding',
    facts: siteFacts({ files: [file({ code: UNREAD })] }),
    check: 'outbound',
    status: 'not-scanned',
    reasons: [],
  },
  {
    name: 'unscanned outbound settings without an established finding',
    facts: httpFacts({ settings: UNREAD }),
    check: 'outbound',
    status: 'not-scanned',
    reasons: [],
  },
  {
    name: 'wholly unavailable outbound evidence',
    facts: siteFacts({ settings: UNREAD, files: [file({ code: UNREAD })] }),
    check: 'outbound',
    status: 'not-scanned',
    reasons: [],
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('P5.3 evidence contract', () => {
  it('requires and initializes the incomplete-evidence flag in every finding factory', () => {
    expectTypeOf<Pick<Finding, 'hasUnscannedEvidence'>>().toEqualTypeOf<{
      hasUnscannedEvidence: boolean;
    }>();
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

describe('P5.3 outbound intersections', () => {
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
      expect(marked.files[0]?.findings[2]).toEqual({
        ...result,
        status: reviewable ? 'reviewed' : 'needs-review',
      });
    },
  );

  it.each([
    ['O0', 'const c = Server.Connector;', 'needs-review', CONNECTORS_UNKNOWN],
    ['O1', 'function get() { return "{}"; }', 'configured', 'No HttpClient calls in code.'],
  ] as const)('%s remains code-based with irrelevant settings', (_row, code, status, summary) => {
    const irrelevant: readonly SiteFacts['settings'][] = [
      FAILED,
      UNREAD,
      read(settings({
        'ServerLogic/AllowedDomains': { kind: 'not-scanned' },
        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'duplicate' },
      })),
      read(settings({
        'ServerLogic/AllowedDomains': value('*.example.com'),
        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'envvar-unreadable' },
      })),
    ];
    for (const settingFacts of irrelevant) {
      const result = finding(siteFacts({
        files: [file({ code: read(code) })],
        settings: settingFacts,
      }), 'outbound');
      expect(result.status).toBe(status);
      expect(result.summary).toBe(summary);
      expect(result.hasUnscannedEvidence).toBe(false);
      expect(result.reasons).toEqual(status === 'configured'
        ? []
        : [{ text: CONNECTORS_UNKNOWN, readFailure: false }]);
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

  it('retains the environment-variable cache caveat as required explanatory detail', () => {
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

describe('P5.3 unknown terminal ancestors', () => {
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
            permission('child', {
              scope: 'Parent',
              parentId: middle ? 'middle' : 'top',
              roleIds: link === 'child' ? ['staff'] : [],
            }),
          ]),
        });
        const grants = grantSet.buildGrantSet(facts, file());
        expect(grants.grants.some((grant) => grant.permission.id === 'child')).toBe(false);
        expect(grants.reasons).toContainEqual({
          text: "Couldn't evaluate parent permission `child`",
          readFailure: false,
        });
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
          permission('top', {
            active: false,
            scope: null,
            roleIds: [link === 'ancestor' ? 'staff' : 'other'],
          }),
          permission('child', {
            scope: 'Parent',
            parentId: 'top',
            roleIds: link === 'child' ? ['staff'] : [],
          }),
        ]),
      });
      const grants = grantSet.buildGrantSet(facts, file());
      expect(grants.grants).toEqual([]);
      expect(grants.reasons).toEqual([]);
      expect(grants.ignored.find((grant) => grant.permission.id === 'child')?.reason).toBe(
        'parent inactive, ignored',
      );
      expect(finding(facts, 'tablePermissions').status).toBe('configured');
    },
  );

  it.each(['middle', 'child'] as const)('keeps a known inactive %s excluded', (inactive) => {
    const facts = siteFacts({
      roles: read([role('staff'), role('other')]),
      permissions: read([
        permission('top', { scope: null, roleIds: ['other'] }),
        permission('middle', {
          active: inactive !== 'middle',
          scope: 'Parent',
          parentId: 'top',
          roleIds: [],
        }),
        permission('child', {
          active: inactive !== 'child',
          scope: 'Parent',
          parentId: 'middle',
        }),
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

describe('P5.3 finding detail and raw snapshot ownership', () => {
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
      permissions: read([permission('global', {
        table: 'required_table',
        scope: 'Global',
        privileges: ['Read', 'AppendTo'],
      })]),
      settings: read(settings({
        'ServerLogic/AllowedDomains': value('*.example.com'),
        'ServerLogic/AllowNetworkingToAllDomains': value('false'),
      })),
    });
    const tables = finding(facts, 'tablePermissions');
    const network = finding(facts, 'outbound');
    expect(tables.reasons).toContainEqual({
      text: 'Global access to `required_table` (Global) from role `staff`.',
      readFailure: false,
    });
    expect(tables.detail).toContain('Change privileges found: Append To.');
    expect(tables.detail).toContain('Based on exported function names, not on what the code does.');
    expect(network.reasons).toContainEqual(WILDCARD);
    for (const item of [tables, network]) {
      expect(item.detail).toEqual(expect.arrayContaining(item.reasons.map((reason) => reason.text)));
    }
    const marked = evaluateSite(facts, new Set<ReviewKey>([
      'file-1:tablePermissions',
      'file-1:outbound',
    ]));
    expect(marked.files[0]?.findings[1]).toEqual({ ...tables, status: 'reviewed' });
    expect(marked.files[0]?.findings[2]).toEqual({ ...network, status: 'reviewed' });
    expect(marked.files[0]?.snapshot).toEqual(evaluateSite(facts, new Set()).files[0]?.snapshot);
  });

  it('builds exactly one grant set for each file and reuses it for the snapshot', () => {
    const spy = vi.spyOn(grantSet, 'buildGrantSet');
    const facts = siteFacts({
      permissions: read([permission('local')]),
      files: [file(), file({ id: 'file-2' })],
    });
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

- [ ] **Step 2: Capture the current signal**

Run from `C:/Users/RyanDev/source/repos/Server Logic`:

```powershell
npm test -- src/features/inspector/model/evidence.test.ts
```

Expected: exit 1; 43 failed and 6 passed at the inspected baseline. The production constructors return `undefined` for the new field; mixed failures/adverse facts are hidden by Not scanned; the explicit incomplete finding remains reviewable; O2 loses wildcard reasons; both linked-ancestor variants grant `child`; the raw sentinel is in finding detail; `buildGrantSet` receives four calls instead of two. This is an assertion failure signal, not a module-resolution failure. The new type assertion is checked by TypeScript in Step 4.

- [ ] **Step 3: Implement the minimum fix**

Apply the following existing-file patches. Each hunk contains only changes and its locating context. `makeFinding` supplies the incomplete-evidence explanation using the existing `NOT_SCANNED_TEXT`; original reasons remain distinct from availability metadata. The environment-variable cache caveat remains explanatory detail when either outbound setting comes from a variable. For a readable unknown-scope terminal, role linkage is known and limits the descendant finding; missing links and cycles retain their existing conservative treatment. Known inactivity takes precedence during grant evaluation.

```diff
*** Begin Patch
*** Update File: src/types/inspector.ts
@@
 export type Finding = {
   check: CheckId;
   status: CheckStatus;
+  hasUnscannedEvidence: boolean;
   summary: string;
*** Update File: src/features/inspector/model/checks.ts
@@
   CONNECTORS_UNKNOWN,
+  ENVVAR_CACHE_NOTE,
   FLOW_NOTE,
@@
 import { buildGrantSet, permissionSnapshot } from './grantSet';
+import type { GrantSet } from './grantSet';
 import { parseAllowedDomains, parseBooleanSetting, settingSnapshot } from './settings';
@@ function makeFinding(
   detail: readonly string[],
-  notScanned = false,
+  hasUnscannedEvidence = false,
 ): Finding {
@@
     check,
-    status: notScanned ? 'not-scanned' : reasons.length > 0 ? 'needs-review' : 'configured',
-    summary: notScanned ? NOT_SCANNED_TEXT : (reasons[0]?.text ?? configuredSummary),
+    status: reasons.length > 0 ? 'needs-review' : hasUnscannedEvidence ? 'not-scanned' : 'configured',
+    summary: reasons[0]?.text ?? (hasUnscannedEvidence ? NOT_SCANNED_TEXT : configuredSummary),
+    hasUnscannedEvidence,
     reasons,
@@
     questions: copy.questions,
-    detail: [...reasons.map((reason) => reason.text), ...detail],
+    detail: [
+      ...reasons.map((reason) => reason.text),
+      ...(hasUnscannedEvidence ? [NOT_SCANNED_TEXT] : []),
+      ...detail,
+    ],
@@ function webRole(facts: SiteFacts, file: ServerLogicFileFacts): Finding {
   const notScanned = evidence.some((item) => !item.ok && item.reason === 'not-scanned');
-  if (failed || notScanned || !facts.roles.ok || !file.roleIds.ok) {
-    return makeFinding(
-      'webRole',
-      '',
-      failed ? [{ text: "Couldn't read configuration", readFailure: true }] : [],
-      [],
-      notScanned,
-    );
-  }
-  const roles = facts.roles.value;
-  const ids = file.roleIds.value;
+  const roles = facts.roles.ok ? facts.roles.value : [];
+  const ids = file.roleIds.ok ? file.roleIds.value : [];
   const reasons: Reason[] = [];
-  if (ids.length === 0)
+  if (file.roleIds.ok && ids.length === 0)
@@
-  if (ids.some((id) => !roles.some((role) => role.id === id))) {
+  if (
+    failed ||
+    (facts.roles.ok && file.roleIds.ok && ids.some((id) => !roles.some((role) => role.id === id)))
+  ) {
     reasons.push({ text: "Couldn't read configuration", readFailure: true });
@@
     'Web role assigned.',
     reasons,
-    roles.filter((role) => ids.includes(role.id)).map((role) => role.name),
+    [],
+    notScanned,
@@
-function tablePermissions(
-  facts: SiteFacts,
-  file: ServerLogicFileFacts,
-  analysis: Analysis,
-): Finding {
-  const grants = buildGrantSet(facts, file);
+function tablePermissions(grants: GrantSet, analysis: Analysis): Finding {
   const reasons: Reason[] = [];
-  const detail: string[] = [...permissionSnapshot(grants), OTHER_ROLES_NOTE];
+  const detail: string[] = [OTHER_ROLES_NOTE];
@@ function outbound(facts: SiteFacts, analysis: Analysis): Finding {
-  const snapshot = settingSnapshot(facts);
-  if (analysis.notScanned) return makeFinding('outbound', '', [], snapshot, true);
-  if (analysis.reason !== null) return makeFinding('outbound', '', [analysis.reason], snapshot);
   const connectors = analysis.connectors;
-  if (connectors === null)
-    return makeFinding(
-      'outbound',
-      '',
-      [{ text: CODE_ANALYSIS_LIMIT, readFailure: false }],
-      snapshot,
-    );
-  if (!connectors.httpClient) {
+  if (analysis.reason === null && connectors !== null && !connectors.httpClient) {
     return connectors.undetermined
-      ? makeFinding('outbound', '', [{ text: CONNECTORS_UNKNOWN, readFailure: false }], snapshot)
-      : makeFinding('outbound', 'No HttpClient calls in code.', [], [FLOW_NOTE, ...snapshot]);
+      ? makeFinding('outbound', '', [{ text: CONNECTORS_UNKNOWN, readFailure: false }], [])
+      : makeFinding('outbound', 'No HttpClient calls in code.', [], [FLOW_NOTE]);
   }
+  const codeReason = analysis.reason ?? (
+    connectors === null && !analysis.notScanned
+      ? { text: CODE_ANALYSIS_LIMIT, readFailure: false }
+      : null
+  );
+  const reasons: Reason[] = codeReason === null ? [] : [codeReason];
   if (!facts.settings.ok) {
+    if (facts.settings.reason === 'read-failed') {
+      reasons.push({ text: "Couldn't read configuration", readFailure: true });
+    }
     return makeFinding(
       'outbound',
       '',
-      facts.settings.reason === 'read-failed'
-        ? [{ text: "Couldn't read configuration", readFailure: true }]
-        : [],
-      snapshot,
-      facts.settings.reason === 'not-scanned',
+      reasons,
+      [],
+      analysis.notScanned || facts.settings.reason === 'not-scanned',
@@
-  if (domains.notScanned || all.notScanned)
-    return makeFinding('outbound', '', [...domains.reasons, ...all.reasons], snapshot, true);
   const invalid = [...domains.reasons, ...all.reasons];
-  if (invalid.length > 0 || domains.value === null || all.value === null)
-    return makeFinding('outbound', '', invalid, snapshot);
+  reasons.push(
+    ...invalid,
+    ...(domains.value?.wildcards ?? []).map((entry) => ({
+      text: `Wildcard entries aren't supported: \`${entry}\` matches no host.`,
+      readFailure: false,
+    })),
+  );
+  const notScanned = analysis.notScanned || domains.notScanned || all.notScanned;
+  const detail = domains.fromEnvVar || all.fromEnvVar ? [ENVVAR_CACHE_NOTE] : [];
+  if (
+    codeReason !== null ||
+    notScanned ||
+    invalid.length > 0 ||
+    domains.value === null ||
+    all.value === null
+  ) {
+    return makeFinding('outbound', '', reasons, detail, notScanned);
+  }
   const hosts = domains.value.hosts;
@@
-  const reasons: Reason[] = domains.value.wildcards.map((entry) => ({
-    text: `Wildcard entries aren't supported: \`${entry}\` matches no host.`,
-    readFailure: false,
-  }));
   if (all.value || hosts.length === 0) reasons.push({ text: row, readFailure: false });
-  return makeFinding('outbound', row, reasons, [row, ...snapshot]);
+  return makeFinding('outbound', row, reasons, [row, ...detail]);
@@ export function evaluateFileChecks(facts: SiteFacts, file: ServerLogicFileFacts): FileResult {
   const analysis = analyse(file);
+  const grants = buildGrantSet(facts, file);
   const web = webRole(facts, file);
-  const tables = tablePermissions(facts, file, analysis);
+  const tables = tablePermissions(grants, analysis);
@@
-      tables: permissionSnapshot(buildGrantSet(facts, file)),
+      tables: permissionSnapshot(grants),
       outbound: [network.summary, ...settingSnapshot(facts)],
*** Update File: src/features/inspector/model/grantSet.ts
@@ function parentChain(
-  return { top: current, inactive, unresolved: false };
+  return {
+    top: current,
+    inactive,
+    unresolved: permission.scope === 'Parent' && current.scope === null,
+  };
@@ export function buildGrantSet(facts: SiteFacts, file: ServerLogicFileFacts): GrantSet {
-  const base: GrantSet = { grants: [], ignored: [], reasons: [], roleIds: [], notScanned: false };
   const evidence = [facts.roles, facts.permissions, file.roleIds];
+  const base: GrantSet = {
+    grants: [],
+    ignored: [],
+    reasons: [],
+    roleIds: [],
+    notScanned: evidence.some((item) => !item.ok && item.reason === 'not-scanned'),
+  };
@@
-  if (evidence.some((item) => !item.ok && item.reason === 'not-scanned')) {
-    return { ...base, notScanned: true };
-  }
-  if (!facts.roles.ok || !facts.permissions.ok || !file.roleIds.ok) return base;
+  if (!facts.roles.ok || !file.roleIds.ok) return base;
   const roles = facts.roles.value;
@@
   if (file.roleIds.value.some((id) => !byRoleId.has(id))) {
     return { ...base, reasons: [{ text: "Couldn't read configuration", readFailure: true }] };
   }
+  if (!facts.permissions.ok) return base;
   const assigned = roles.filter((role) => file.roleIds.ok && file.roleIds.value.includes(role.id));
@@
-    } else if (chain.unresolved) {
+    } else if (chain.unresolved && (chain.top.scope !== null || linked.length > 0)) {
       reasons.push({
         text: `Couldn't evaluate parent permission \`${permission.name}\``,
*** Update File: src/features/inspector/model/rules.ts
@@
 export function canReviewFinding(finding: Finding): boolean {
-  return finding.status === 'needs-review' && !finding.reasons.some((reason) => reason.readFailure);
+  return (
+    finding.status === 'needs-review' &&
+    !finding.hasUnscannedEvidence &&
+    !finding.reasons.some((reason) => reason.readFailure)
+  );
 }
*** Update File: src/features/inspector/model/rules.test.ts
@@
 const stateFinding = (check: CheckId, status: CheckStatus): Finding => ({
   check,
   status,
+  hasUnscannedEvidence: status === 'not-scanned',
   summary: status,
*** Update File: src/features/inspector/report/reportFixtures.ts
@@ export function reportFinding(check: CheckId, status: CheckStatus): Finding {
     check,
     status,
+    hasUnscannedEvidence: status === 'not-scanned',
     summary: status === 'not-scanned' ? 'Not read before the connection was lost' : text,
*** End Patch
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run:

```powershell
npm test -- src/features/inspector/model/evidence.test.ts
```

Expected: exit 0; **49 tests pass**. All incomplete cases retain their reasons and refuse forged marks; O2 keeps its original leading reason plus every known wildcard; unknown linked ancestors are reviewable analysis limits; the snapshot-only sentinels occur solely in `snapshot`; two files produce two grant computations.

Run:

```powershell
npm test -- src/features/inspector/model src/features/inspector/report src/lib/code-analysis src/types/contracts.test.ts src/skeleton.test.ts
```

Expected: **16 files / 468 tests pass** at the inspected baseline, including the existing 64-state table, its aggregate `{ C: 48, V: 48, M: 48, U: 48, T: 192, K: 96 }`, review/undo, inactive/default-role grant behavior, O0–O6, setting defaults, code analysis and Markdown goldens. P5.6 adds the cross-format/include-option report proofs using the model boundary established here.

Run:

```powershell
npx --no-install eslint src/features/inspector/model src/features/inspector/report/reportFixtures.ts src/types/inspector.ts --max-warnings=0
```

Expected: exit 0 and no scoped errors.

Run:

```powershell
npm run typecheck
```

Expected: exit 0; the new required-property type assertion and every migrated constructor typecheck. Record any diagnostic against the current execution baseline; an error in a Task 4 file is a Task 4 failure.

Run:

```powershell
npm run build
```

Expected: exit 0; TypeScript and the production Vite build pass. The baseline document's later checkpoint already passes; record any new failure without carrying its resolved earlier Starter assertion forward.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add -- src/types/inspector.ts src/features/inspector/model/checks.ts src/features/inspector/model/grantSet.ts src/features/inspector/model/rules.ts src/features/inspector/model/rules.test.ts src/features/inspector/model/evidence.test.ts src/features/inspector/report/reportFixtures.ts
git commit --only -m "fix(inspector): preserve partial evidence and isolate snapshots" -- src/types/inspector.ts src/features/inspector/model/checks.ts src/features/inspector/model/grantSet.ts src/features/inspector/model/rules.ts src/features/inspector/model/rules.test.ts src/features/inspector/model/evidence.test.ts src/features/inspector/report/reportFixtures.ts
```

**Exit/handoff:** P5.3 is complete when Step 4's scoped signals pass and its constructor contract is type-correct; integrated build readiness remains subject to the explicitly recorded external gates. P5.6 consumes `Finding.detail` as required explanation and `FileResult.snapshot` as the optional raw rows, including cases where mandatory reasons themselves name configuration. No P5.3 requirement is deferred to an unspecified implementation step.
