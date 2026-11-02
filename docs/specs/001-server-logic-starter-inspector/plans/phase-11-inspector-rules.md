# Phase 11: Inspector rules engine implementation plan

> **Execution superseded — 2026-11-01.** `../../../plans/p5-1_plan.md`, `../../../plans/p5-2_plan.md` and `../../../plans/p5-3_plan.md` (and later P5.x plans) own the remaining Inspector implementation, contracts and check commands. This file keeps the stable phase IDs, design choices and probe outcomes; its code blocks, `$value` fallback, blanket API prohibition, Prettier commands and sequencing are not current execution instructions.

**Part:** `plan-inspector.md`, wave I1.

**Goal:** Evaluate every server logic file's web role, table permissions and outbound configuration, including interrupted and unreadable evidence.

**Architecture:** `model/settings.ts` owns setting interpretation, `model/grantSet.ts` owns role and parent-chain membership, and `model/checks.ts` owns the three findings. `model/rules.ts` owns site evaluation, review eligibility, counts and file labels. Phase 03 owns connector and exported-function analysis; Phase 15 owns reading facts.

**Tech stack:** Existing strict TypeScript, Vitest 5, Phase 03 code analysis and the Inspector contracts. No package or host call is added.

**Scope / Implements:** FR-7 setting, scope, grant and parent-chain rules; FR-8 statuses and counts; FR-9 Web role, Table permissions and Outbound O0–O6.

**Satisfies:**

- AC-7.7: failed configuration reads become Needs review with read-failure reasons and never become defaults.
- AC-7.9 and AC-7.12: Enabled and Timeout banners, including failed reads, duplicates and the 121–240 note.
- AC-8.1, 8.6 and 8.10: counts, legend, file summary and pill across all 64 one-file state combinations.
- AC-8.5 and 8.12: review eligibility excludes read failures; Reviewed retains original reasons.
- AC-8.8 and AC-8.11: check wording, ordered reasons, Not scanned text and no K contribution.

**Out of scope:** Dataverse reads, UI, reports, persistence and live host evidence.

**Depends on:** Phase 03 (`detectConnectorUse`, `exportedFunctionNames`) and the amended Contracts in `plan-starter.md`.

**Files:**

- Create: `src/features/inspector/model/settings.ts`, `grantSet.ts`, `checks.ts`, `copy.ts` and their tests.
- Replace the Phase 00 stub: `src/features/inspector/model/rules.ts`.
- Create: `rules.test.ts` and test-only `fixtures.ts`.

**Interfaces:**

- Consumes `ConnectorUse` and the two Phase 03 functions; `SiteFacts`, `Finding`, `Counts`, `ReviewKey` and related contracts.
- Produces `normalizeSettingName`, `parseBooleanSetting`, `parseAllowedDomains`, `parseTimeout`, `settingBanners`, `settingSnapshot`, `buildGrantSet`, `permissionSnapshot`, `defaultRoleBanners`, `evaluateFileChecks`, `CHECK_COPY`, `evaluateSite`, `countChecks`, `fileSummary`, `filePill`, `ringLegend` and `canReviewFinding`.
- Feature-internal only: `Grant`, `IgnoredGrant`, `GrantSet`, `ParsedSetting` and `DomainList`.

## Decisions

1. **Phase 11 interprets facts; Phase 15 reads them.** A successful query that proves absence remains `kind: 'absent'`. `not-scanned` is reserved for unread evidence and never becomes a default value.
2. **One setting matcher.** `normalizeSettingName` trims and compares case-insensitively. Phase 15 consumes it rather than duplicating the rule.
3. **Parent membership follows the resolved top permission.** Inactive ancestors are ignored. Unknown, missing, unreadable or looping ancestors make Table permissions Needs review regardless of other grants.
4. **Reason order is the AC-8.8 order.** The first reason supplies the summary when several apply; every reason remains in `reasons` and `detail`.
5. **Analysis limits stay reviewable; read failures do not.** Empty or unparseable code is "Couldn't analyse handler code". A failed download is "couldn't read handler code" and blocks Mark as reviewed.
6. **Reviewed is display state only.** `evaluateSite` changes status after the underlying finding is built, so its original reasons and guidance remain available to the screen and reports.

---

- [x] **Step 0: Preflight**

Run from the repository root on `001-logic-inspector`:

```powershell
git status --short
rg -n "not implemented: phase 11" src/features/inspector/model/rules.ts
npx tsc -b
npx vitest run src/lib/code-analysis/structure.connector.test.ts
```

Expected: unrelated work preserved; the Phase 11 stub remains; typecheck and connector fixtures pass.

### Task 1: Interpret settings and build the grant set

**Owns:** FR-7 setting, scope, default-role and parent-chain facts.

**Files:**

- Create: `src/features/inspector/model/settings.ts`, `settings.test.ts`, `grantSet.ts`, `grantSet.test.ts`.
- Signal: the two tests.

- [x] **Step 1: Establish the observable pre-change signal**

```ts file=src/features/inspector/model/settings.test.ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { SettingName, SettingValue, SiteFacts, TablePermissionFact } from '@/types/inspector';
import type { AccessType } from '@/types/recipe';
import { ENVVAR_CACHE_NOTE, TIMEOUT_NOTE } from './copy';
import { read, settings, siteFacts, value } from './fixtures';
import {
  normalizeSettingName,
  parseAllowedDomains,
  parseBooleanSetting,
  parseTimeout,
  SETTING_NAMES,
  settingBanners,
  settingSnapshot,
} from './settings';

describe('FR-7 settings contract', () => {
  it('models unknown scope, ignored settings and interrupted envvar reads', () => {
    expectTypeOf<TablePermissionFact['scope']>().toEqualTypeOf<AccessType | null>();
    expectTypeOf<SiteFacts['inactiveSettings']>().toEqualTypeOf<readonly SettingName[]>();
    expectTypeOf<Extract<SettingValue, { kind: 'not-scanned' }>>().toEqualTypeOf<{
      kind: 'not-scanned';
    }>();
  });

  it.each(SETTING_NAMES)('matches a trimmed, case-insensitive %s', (name) => {
    expect(normalizeSettingName(`  ${name.toUpperCase()}  `)).toBe(name);
  });

  it.each(['', 'ServerLogic/Other', 'xServerLogic/Enabled', 'ServerLogic/Enabled/'])(
    'rejects %s',
    (raw) => {
      expect(normalizeSettingName(raw)).toBeNull();
    },
  );

  it.each([
    [' true ', true],
    ['FALSE', false],
    ['TrUe', true],
    ['\tfalse\n', false],
  ])('normalizes boolean %s', (raw, expected) => {
    expect(parseBooleanSetting('ServerLogic/Enabled', value(raw)).value).toBe(expected);
  });

  it.each(['', '1', 'yes', 'true false'])('flags boolean %s', (raw) => {
    expect(
      parseBooleanSetting('ServerLogic/AllowNetworkingToAllDomains', value(raw)).reasons,
    ).toEqual([
      { text: "Couldn't interpret `ServerLogic/AllowNetworkingToAllDomains`", readFailure: false },
    ]);
  });

  it.each(['ServerLogic/Enabled', 'ServerLogic/AllowNetworkingToAllDomains'] as const)(
    'defaults %s only after a successful query',
    (name) => {
      expect(parseBooleanSetting(name, { kind: 'absent' }).value).toBe(true);
      expect(parseBooleanSetting(name, { kind: 'duplicate' }).reasons[0]?.text).toBe(
        `Duplicate \`${name}\``,
      );
      expect(parseBooleanSetting(name, { kind: 'envvar-unreadable' }).reasons).toEqual([
        { text: `Couldn't read \`${name}\` from its environment variable`, readFailure: true },
      ]);
      expect(parseBooleanSetting(name, { kind: 'not-scanned' }).notScanned).toBe(true);
    },
  );
});

describe('FR-7 strict AllowedDomains', () => {
  it.each(['', ' , , ', 'All domains allowed', '  All domains allowed  '])(
    'treats %s as no list',
    (raw) => {
      expect(parseAllowedDomains(value(raw)).value).toEqual({ hosts: [], wildcards: [] });
    },
  );

  it('trims comma entries, drops empty entries and separates wildcards', () => {
    expect(
      parseAllowedDomains(value(' api.example.com, , *.example.com, LOCAL-HOST ')).value,
    ).toEqual({
      hosts: ['api.example.com', 'LOCAL-HOST'],
      wildcards: ['*.example.com'],
    });
    expect(parseAllowedDomains({ kind: 'absent' }).value).toEqual({ hosts: [], wildcards: [] });
  });

  it.each([
    'https://api.example.com',
    'api.example.com/path',
    'api.example.com:443',
    'api .example.com',
    '*',
    'api.*.com',
    '.example.com',
    'a..b',
    'example.com/',
    'éxample.com',
  ])('names invalid entry %s', (raw) => {
    const parsed = parseAllowedDomains(value(`good.example.com, ${raw}`));
    expect(parsed.value).toBeNull();
    expect(parsed.reasons[0]?.text).toBe(
      `Couldn't interpret \`ServerLogic/AllowedDomains\`: \`${raw}\``,
    );
    expect(parsed.reasons[0]?.readFailure).toBe(false);
  });
});

describe('AC-7.9 / AC-7.12 banners and snapshot', () => {
  it.each(['1', '120', '121', '240', '0001', ' 0240 '])('accepts timeout %s', (raw) => {
    expect(parseTimeout(value(raw)).value).toBe(Number(raw.trim()));
    expect(parseTimeout(value(raw)).reasons).toEqual([]);
  });

  it.each(['', '0', '241', '-1', '+1', '1.0', '1e2', '0x10', 'NaN', '1 2'])(
    'flags timeout %s',
    (raw) => {
      expect(parseTimeout(value(raw)).reasons[0]?.text).toBe(
        "`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240",
      );
    },
  );

  it('defaults to 120, banners only failures and keeps 121–240 as a note', () => {
    expect(parseTimeout({ kind: 'absent' }).value).toBe(120);
    expect(settingBanners(siteFacts())).toEqual([]);
    const facts = siteFacts({
      settings: read(settings({ 'ServerLogic/TimeoutInSeconds': value('121') })),
    });
    expect(settingBanners(facts)).toEqual([]);
    expect(settingSnapshot(facts)).toContain(TIMEOUT_NOTE);
  });

  it.each([
    [{ kind: 'duplicate' }, 'Duplicate `ServerLogic/TimeoutInSeconds`'],
    [
      { kind: 'envvar-unreadable' },
      "Couldn't read `ServerLogic/TimeoutInSeconds` from its environment variable",
    ],
    [value('false'), "`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240"],
  ] satisfies readonly (readonly [SettingValue, string])[])(
    'banners timeout %j',
    (setting, message) => {
      expect(
        settingBanners(
          siteFacts({ settings: read(settings({ 'ServerLogic/TimeoutInSeconds': setting })) }),
        ),
      ).toEqual([message]);
    },
  );

  it('banners disabled, invalid, duplicate and unreadable Enabled', () => {
    const cases: readonly (readonly [SettingValue, string])[] = [
      [value('false'), 'Server logic is disabled on this site (`ServerLogic/Enabled` = false)'],
      [value(''), "Couldn't interpret `ServerLogic/Enabled`"],
      [{ kind: 'duplicate' }, 'Duplicate `ServerLogic/Enabled`'],
      [
        { kind: 'envvar-unreadable' },
        "Couldn't read `ServerLogic/Enabled` from its environment variable",
      ],
    ];
    for (const [setting, message] of cases) {
      expect(
        settingBanners(siteFacts({ settings: read(settings({ 'ServerLogic/Enabled': setting })) })),
      ).toEqual([message]);
    }
  });

  it('never applies reassuring defaults after a failed or interrupted read', () => {
    const failed = siteFacts({ settings: { ok: false, reason: 'read-failed' } });
    expect(settingBanners(failed)).toEqual([
      "Couldn't read `ServerLogic/Enabled`",
      "Couldn't read `ServerLogic/TimeoutInSeconds`",
    ]);
    expect(settingSnapshot(failed)).toEqual(["Couldn't read configuration"]);
    expect(settingBanners(siteFacts({ settings: { ok: false, reason: 'not-scanned' } }))).toEqual(
      [],
    );
    expect(
      settingBanners(
        siteFacts({
          settings: read(
            settings({
              'ServerLogic/Enabled': { kind: 'not-scanned' },
              'ServerLogic/TimeoutInSeconds': { kind: 'not-scanned' },
            }),
          ),
        }),
      ),
    ).toEqual([]);
  });

  it('labels inactive settings and envvar cache without displaying unread values', () => {
    const facts = siteFacts({
      settings: read(settings({ 'ServerLogic/AllowedDomains': value('api.example.com', true) })),
      inactiveSettings: ['ServerLogic/Enabled'],
    });
    expect(settingSnapshot(facts)).toContain('`ServerLogic/Enabled` (inactive, ignored)');
    expect(settingSnapshot(facts)).toContain(
      '`ServerLogic/AllowedDomains` = api.example.com (environment variable)',
    );
    expect(settingSnapshot(facts)).toContain(ENVVAR_CACHE_NOTE);
  });
});
```

```ts file=src/features/inspector/model/grantSet.test.ts
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
```

- [x] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/model/settings.test.ts src/features/inspector/model/grantSet.test.ts`

Expected: exit 1 because both implementation modules do not exist.

- [x] **Step 3: Implement the minimum fix**

```ts file=src/features/inspector/model/settings.ts
import type { Reason, SettingName, SettingValue, SiteFacts } from '@/types/inspector';
import { ENVVAR_CACHE_NOTE, NOT_SCANNED_TEXT, TIMEOUT_NOTE } from './copy';

export const SETTING_NAMES: readonly SettingName[] = [
  'ServerLogic/Enabled',
  'ServerLogic/AllowedDomains',
  'ServerLogic/AllowNetworkingToAllDomains',
  'ServerLogic/TimeoutInSeconds',
];

export type ParsedSetting<T> = {
  value: T | null;
  reasons: readonly Reason[];
  fromEnvVar: boolean;
  notScanned: boolean;
};
export type DomainList = { hosts: readonly string[]; wildcards: readonly string[] };

export function normalizeSettingName(raw: string): SettingName | null {
  const name = raw.trim().toLowerCase();
  return SETTING_NAMES.find((candidate) => candidate.toLowerCase() === name) ?? null;
}

function result<T>(
  value: T | null,
  reasons: readonly Reason[] = [],
  fromEnvVar = false,
  notScanned = false,
): ParsedSetting<T> {
  return { value, reasons, fromEnvVar, notScanned };
}

function unavailable<T>(name: SettingName, setting: SettingValue): ParsedSetting<T> | null {
  if (setting.kind === 'duplicate') {
    return result<T>(null, [{ text: `Duplicate \`${name}\``, readFailure: false }]);
  }
  if (setting.kind === 'envvar-unreadable') {
    return result<T>(
      null,
      [{ text: `Couldn't read \`${name}\` from its environment variable`, readFailure: true }],
      true,
    );
  }
  return setting.kind === 'not-scanned' ? result<T>(null, [], true, true) : null;
}

export function parseBooleanSetting(
  name: 'ServerLogic/Enabled' | 'ServerLogic/AllowNetworkingToAllDomains',
  setting: SettingValue,
): ParsedSetting<boolean> {
  const missing = unavailable<boolean>(name, setting);
  if (missing !== null) return missing;
  if (setting.kind === 'absent') return result(true);
  if (setting.kind !== 'value') return result<boolean>(null);
  const raw = setting.raw.trim().toLowerCase();
  return raw === 'true' || raw === 'false'
    ? result(raw === 'true', [], setting.fromEnvVar)
    : result<boolean>(
        null,
        [{ text: `Couldn't interpret \`${name}\``, readFailure: false }],
        setting.fromEnvVar,
      );
}

export function parseAllowedDomains(setting: SettingValue): ParsedSetting<DomainList> {
  const name = 'ServerLogic/AllowedDomains';
  const missing = unavailable<DomainList>(name, setting);
  if (missing !== null) return missing;
  if (setting.kind === 'absent') return result({ hosts: [], wildcards: [] });
  if (setting.kind !== 'value') return result<DomainList>(null);
  const raw = setting.raw.trim();
  const entries =
    raw === 'All domains allowed'
      ? []
      : raw
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
  const invalid = entries.filter(
    (entry) => !/^(\*\.)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*$/.test(entry),
  );
  if (invalid.length > 0) {
    return result<DomainList>(
      null,
      invalid.map((entry) => ({
        text: `Couldn't interpret \`${name}\`: \`${entry}\``,
        readFailure: false,
      })),
      setting.fromEnvVar,
    );
  }
  return result(
    {
      hosts: entries.filter((entry) => !entry.startsWith('*.')),
      wildcards: entries.filter((entry) => entry.startsWith('*.')),
    },
    [],
    setting.fromEnvVar,
  );
}

export function parseTimeout(setting: SettingValue): ParsedSetting<number> {
  const missing = unavailable<number>('ServerLogic/TimeoutInSeconds', setting);
  if (missing !== null) return missing;
  if (setting.kind === 'absent') return result(120);
  if (setting.kind !== 'value') return result<number>(null);
  const raw = setting.raw.trim();
  const seconds = Number(raw);
  return /^[0-9]+$/.test(raw) && seconds >= 1 && seconds <= 240
    ? result(seconds, [], setting.fromEnvVar)
    : result<number>(
        null,
        [
          {
            text: "`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240",
            readFailure: false,
          },
        ],
        setting.fromEnvVar,
      );
}

export function settingBanners(facts: SiteFacts): readonly string[] {
  if (!facts.settings.ok) {
    return facts.settings.reason === 'not-scanned'
      ? []
      : ["Couldn't read `ServerLogic/Enabled`", "Couldn't read `ServerLogic/TimeoutInSeconds`"];
  }
  const enabled = parseBooleanSetting(
    'ServerLogic/Enabled',
    facts.settings.value['ServerLogic/Enabled'],
  );
  const timeout = parseTimeout(facts.settings.value['ServerLogic/TimeoutInSeconds']);
  return [
    ...enabled.reasons.map((reason) => reason.text),
    ...(enabled.value === false
      ? ['Server logic is disabled on this site (`ServerLogic/Enabled` = false)']
      : []),
    ...timeout.reasons.map((reason) => reason.text),
  ];
}

export function settingSnapshot(facts: SiteFacts): readonly string[] {
  if (!facts.settings.ok) {
    return [
      facts.settings.reason === 'not-scanned' ? NOT_SCANNED_TEXT : "Couldn't read configuration",
    ];
  }
  const lines = SETTING_NAMES.map((name) => {
    const setting = facts.settings.ok ? facts.settings.value[name] : { kind: 'absent' as const };
    if (setting.kind === 'value')
      return `\`${name}\` = ${setting.raw.trim()}${setting.fromEnvVar ? ' (environment variable)' : ''}`;
    if (setting.kind === 'duplicate') return `Duplicate \`${name}\``;
    if (setting.kind === 'envvar-unreadable')
      return `Couldn't read \`${name}\` from its environment variable`;
    if (setting.kind === 'not-scanned') return `\`${name}\`: ${NOT_SCANNED_TEXT}`;
    const fallback =
      name === 'ServerLogic/AllowedDomains'
        ? 'no allow list'
        : name === 'ServerLogic/TimeoutInSeconds'
          ? '120'
          : 'true';
    return `\`${name}\` = ${fallback} (default)`;
  });
  const values = Object.values(facts.settings.value);
  const timeout = parseTimeout(facts.settings.value['ServerLogic/TimeoutInSeconds']);
  return [
    ...lines,
    ...facts.inactiveSettings.map((name) => `\`${name}\` (inactive, ignored)`),
    ...(values.some(
      (setting) =>
        setting.kind === 'envvar-unreadable' ||
        setting.kind === 'not-scanned' ||
        (setting.kind === 'value' && setting.fromEnvVar),
    )
      ? [ENVVAR_CACHE_NOTE]
      : []),
    ...(timeout.value !== null && timeout.value > 120 ? [TIMEOUT_NOTE] : []),
  ];
}
```

```ts file=src/features/inspector/model/grantSet.ts
import type {
  Reason,
  ServerLogicFileFacts,
  SiteFacts,
  TablePermissionFact,
} from '@/types/inspector';

export type Grant = { permission: TablePermissionFact; roleNames: readonly string[] };
export type IgnoredGrant = Grant & { reason: 'inactive, ignored' | 'parent inactive, ignored' };
export type GrantSet = {
  grants: readonly Grant[];
  ignored: readonly IgnoredGrant[];
  reasons: readonly Reason[];
  roleIds: readonly string[];
  notScanned: boolean;
};

type ParentChain = {
  top: TablePermissionFact;
  inactive: boolean;
  unresolved: boolean;
};

function parentChain(
  permission: TablePermissionFact,
  byId: ReadonlyMap<string, TablePermissionFact>,
): ParentChain {
  let current = permission;
  let inactive = !current.active;
  const visited = new Set<string>();
  while (current.scope === 'Parent') {
    visited.add(current.id);
    const parent = current.parentId === null ? undefined : byId.get(current.parentId);
    if (parent === undefined || visited.has(parent.id)) {
      return { top: current, inactive, unresolved: true };
    }
    current = parent;
    inactive ||= !current.active;
  }
  return { top: current, inactive, unresolved: false };
}

export function buildGrantSet(facts: SiteFacts, file: ServerLogicFileFacts): GrantSet {
  const base: GrantSet = { grants: [], ignored: [], reasons: [], roleIds: [], notScanned: false };
  const evidence = [facts.roles, facts.permissions, file.roleIds];
  if (evidence.some((item) => !item.ok && item.reason === 'read-failed')) {
    return { ...base, reasons: [{ text: "Couldn't read configuration", readFailure: true }] };
  }
  if (evidence.some((item) => !item.ok && item.reason === 'not-scanned')) {
    return { ...base, notScanned: true };
  }
  if (!facts.roles.ok || !facts.permissions.ok || !file.roleIds.ok) return base;
  const roles = facts.roles.value;
  const byRoleId = new Map(roles.map((role) => [role.id, role]));
  if (file.roleIds.value.some((id) => !byRoleId.has(id))) {
    return { ...base, reasons: [{ text: "Couldn't read configuration", readFailure: true }] };
  }
  const assigned = roles.filter((role) => file.roleIds.ok && file.roleIds.value.includes(role.id));
  const ids = new Set(file.roleIds.value);
  if (assigned.some((role) => !role.anonymous)) {
    roles.filter((role) => role.authenticated).forEach((role) => ids.add(role.id));
  }
  if (assigned.some((role) => role.anonymous)) {
    roles.filter((role) => role.anonymous).forEach((role) => ids.add(role.id));
  }
  const byId = new Map(facts.permissions.value.map((permission) => [permission.id, permission]));
  const grants: Grant[] = [];
  const ignored: IgnoredGrant[] = [];
  const reasons: Reason[] = [];
  for (const permission of facts.permissions.value) {
    const chain = parentChain(permission, byId);
    const linked = [...new Set([...permission.roleIds, ...chain.top.roleIds])].filter((id) =>
      ids.has(id),
    );
    const roleNames = linked.map((id) => byRoleId.get(id)?.name ?? id);
    if (!permission.active) {
      if (linked.length > 0) ignored.push({ permission, roleNames, reason: 'inactive, ignored' });
    } else if (chain.inactive) {
      if (linked.length > 0)
        ignored.push({ permission, roleNames, reason: 'parent inactive, ignored' });
    } else if (chain.unresolved) {
      reasons.push({
        text: `Couldn't evaluate parent permission \`${permission.name}\``,
        readFailure: false,
      });
    } else if (linked.length > 0) {
      grants.push({ permission, roleNames });
    }
  }
  return { grants, ignored, reasons, roleIds: [...ids], notScanned: false };
}

export function permissionSnapshot(grants: GrantSet): readonly string[] {
  const describe = ({ permission, roleNames }: Grant): string => {
    const privileges =
      permission.privileges
        .map((privilege) => (privilege === 'AppendTo' ? 'Append To' : privilege))
        .join(', ') || 'No privileges';
    return `${permission.table} · ${permission.scope ?? 'Unknown scope'} · ${privileges} · role ${roleNames.join(', ')}`;
  };
  return [
    ...grants.grants.map(describe),
    ...grants.ignored.map((grant) => `${describe(grant)} (${grant.reason})`),
    ...grants.reasons.map((reason) => reason.text),
  ];
}

export function defaultRoleBanners(facts: SiteFacts): readonly string[] {
  if (!facts.roles.ok) return [];
  const banners: string[] = [];
  for (const [flag, label] of [
    ['anonymous', 'Anonymous'],
    ['authenticated', 'Authenticated'],
  ] as const) {
    const defaults = facts.roles.value.filter((role) => role[flag]);
    if (defaults.length > 1) {
      banners.push(
        `More than one web role is marked as the ${label} Users Role (${defaults.map((role) => `\`${role.name}\``).join(', ')}). Learn allows one per site.`,
      );
    }
  }
  return banners;
}
```

- [x] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/model/settings.test.ts src/features/inspector/model/grantSet.test.ts`

Expected: exit 0; domains, timeout, unknown scope, default roles and parent chains match the fixtures.

Run: `npx vitest run src/lib/code-analysis/structure.connector.test.ts`

Expected: exit 0.

- [x] **Step 5: Commit the coherent change**

```bash
git add -- src/features/inspector/model/settings.ts src/features/inspector/model/settings.test.ts src/features/inspector/model/grantSet.ts src/features/inspector/model/grantSet.test.ts
git commit -m "feat(inspector): interpret settings and permission grants"
```

### Task 2: Evaluate the three checks and all 64 states

**Owns:** FR-8, FR-9, AC-8.1 and AC-8.5–8.12.

**Files:**

- Create: `src/features/inspector/model/checks.ts`, `checks.test.ts`, `copy.ts`, `rules.test.ts`, `fixtures.ts`.
- Replace: `src/features/inspector/model/rules.ts`.
- Signal: `checks.test.ts` and `rules.test.ts`.

- [x] **Step 1: Establish the observable pre-change signal**

```ts file=src/features/inspector/model/checks.test.ts
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
          'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable' },
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
```

```ts file=src/features/inspector/model/rules.test.ts
import { describe, expect, it } from 'vitest';
import type { CheckId, CheckStatus, FileResult, Finding, ReviewKey } from '@/types/inspector';
import { CODE_READ_FAILURE, NOT_SCANNED_TEXT } from './copy';
import { file, permission, read, role, settings, siteFacts, value } from './fixtures';
import {
  canReviewFinding,
  countChecks,
  evaluateSite,
  filePill,
  fileSummary,
  ringLegend,
} from './rules';

const STATES: readonly CheckStatus[] = ['configured', 'needs-review', 'reviewed', 'not-scanned'];
const CHECKS: readonly CheckId[] = ['webRole', 'tablePermissions', 'outbound'];
const stateFinding = (check: CheckId, status: CheckStatus): Finding => ({
  check,
  status,
  summary: status,
  reasons: [],
  guidance: '',
  questions: [],
  detail: [],
});
const statesFile = (states: readonly [CheckStatus, CheckStatus, CheckStatus]): FileResult => ({
  fileId: 'file-1',
  name: 'file',
  active: true,
  findings: [
    stateFinding('webRole', states[0]),
    stateFinding('tablePermissions', states[1]),
    stateFinding('outbound', states[2]),
  ],
  snapshot: { roles: [], tables: [], outbound: [] },
});
const COMBINATIONS = STATES.flatMap((a) =>
  STATES.flatMap((b) => STATES.map((c) => [a, b, c] as const)),
);

describe('AC-8.1 all 64 state combinations', () => {
  it.each(COMBINATIONS)('%s / %s / %s', (a, b, c) => {
    const states = [a, b, c] as const;
    const file = statesFile(states);
    const C = states.filter((state) => state === 'configured').length;
    const V = states.filter((state) => state === 'reviewed').length;
    const M = states.filter((state) => state === 'needs-review').length;
    const U = states.filter((state) => state === 'not-scanned').length;
    const K = C + V;
    const counts = countChecks(file.findings);
    expect(counts).toEqual({ C, V, M, U, T: 3, K });
    expect(C + V + M + U).toBe(3);
    expect(ringLegend(counts)).toBe(
      `${String(C)} configured${V > 0 ? ` · ${String(V)} reviewed` : ''} · ${String(M)} review${U > 0 ? ` · ${String(U)} not scanned` : ''}`,
    );
    expect(filePill(file)).toBe(M > 0 ? 'Needs review' : U > 0 ? 'Incomplete' : 'Ready');
    expect(fileSummary(file)).toBe(
      C === 3
        ? 'All configured'
        : K === 3
          ? `Ready · ${String(V)} reviewed`
          : `${String(K)}/3 · ${String(M)} to review`,
    );
  });

  it('covers all combinations once and sums counts across any number of files', () => {
    expect(COMBINATIONS).toHaveLength(64);
    expect(new Set(COMBINATIONS.map((states) => states.join(':'))).size).toBe(64);
    expect(countChecks(COMBINATIONS.flatMap((states) => statesFile(states).findings))).toEqual({
      C: 48,
      V: 48,
      M: 48,
      U: 48,
      T: 192,
      K: 96,
    });
    expect(countChecks([])).toEqual({ C: 0, V: 0, M: 0, U: 0, T: 0, K: 0 });
  });
});

describe('AC-8.5 / AC-8.12 reviewability and preserved reasons', () => {
  it('marks only eligible Needs review and leaves the reasons and snapshot intact', () => {
    const facts = siteFacts({ files: [file({ roleIds: read([]) })] });
    const original = evaluateSite(facts, new Set());
    const reviewed = evaluateSite(facts, new Set<ReviewKey>(['file-1:webRole']));
    expect(reviewed.files[0]?.findings[0]).toEqual({
      ...original.files[0]?.findings[0],
      status: 'reviewed',
    });
    expect(reviewed.files[0]?.snapshot).toEqual(original.files[0]?.snapshot);
    expect(countChecks(reviewed.files[0]?.findings ?? []).K).toBe(
      countChecks(original.files[0]?.findings ?? []).K + 1,
    );
    expect(evaluateSite(facts, new Set()).files[0]?.findings[0]?.status).toBe('needs-review');
  });

  it('refuses every read failure even when a different reason leads the summary', () => {
    const facts = siteFacts({
      permissions: read([permission('global', { scope: 'Global' })]),
      files: [file({ code: { ok: false, reason: 'read-failed' } })],
    });
    const result = evaluateSite(
      facts,
      new Set<ReviewKey>(['file-1:tablePermissions', 'file-1:outbound']),
    );
    expect(result.files[0]?.findings[1]?.status).toBe('needs-review');
    expect(result.files[0]?.findings[1]?.reasons).toContainEqual({
      text: CODE_READ_FAILURE,
      readFailure: true,
    });
    expect(
      canReviewFinding(
        result.files[0]?.findings[1] ?? stateFinding('tablePermissions', 'configured'),
      ),
    ).toBe(false);
  });

  it('allows analysis limits, but not Configured or Not scanned', () => {
    const facts = siteFacts({ files: [file({ code: read('') })] });
    const result = evaluateSite(
      facts,
      new Set<ReviewKey>(['file-1:tablePermissions', 'file-1:outbound', 'file-1:webRole']),
    );
    expect(result.files[0]?.findings.map((finding) => finding.status)).toEqual([
      'configured',
      'reviewed',
      'reviewed',
    ]);
    expect(canReviewFinding(stateFinding('webRole', 'configured'))).toBe(false);
    expect(canReviewFinding(stateFinding('webRole', 'not-scanned'))).toBe(false);
    expect(canReviewFinding(stateFinding('webRole', 'reviewed'))).toBe(false);
  });

  it('keeps marks file-specific and evaluates inactive files too', () => {
    const facts = siteFacts({
      files: [
        file({ id: 'a', active: false, roleIds: read([]) }),
        file({ id: 'b', roleIds: read([]) }),
      ],
    });
    const result = evaluateSite(facts, new Set<ReviewKey>(['a:webRole']));
    expect(result.files[0]?.active).toBe(false);
    expect(result.files[0]?.findings[0]?.status).toBe('reviewed');
    expect(result.files[1]?.findings[0]?.status).toBe('needs-review');
  });
});

describe('AC-7.9 / AC-7.12 and interrupted-site banners', () => {
  it('includes setting/default-role, inventory and connection-loss banners', () => {
    const facts = siteFacts({
      settings: read(
        settings({
          'ServerLogic/Enabled': value('false'),
          'ServerLogic/TimeoutInSeconds': value('241'),
        }),
      ),
      roles: read([role('a', { anonymous: true }), role('b', { anonymous: true })]),
      files: [file({ roleIds: read(['a']) })],
      inventoryComplete: false,
      stopped: 'connection-lost',
    });
    const result = evaluateSite(facts, new Set());
    expect(result.banners).toEqual([
      'Server logic is disabled on this site (`ServerLogic/Enabled` = false)',
      "`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240",
      'More than one web role is marked as the Anonymous Users Role (`a`, `b`). Learn allows one per site.',
      'Inventory incomplete. Reconnect and rescan.',
      'Connection lost. Reconnect and rescan.',
    ]);
    expect(result.files).toHaveLength(1);
  });

  it('does not change checks for Enabled or timeout banners', () => {
    const base = siteFacts();
    const changed = {
      ...base,
      settings: read(
        settings({
          'ServerLogic/Enabled': value('false'),
          'ServerLogic/TimeoutInSeconds': value('bad'),
        }),
      ),
    };
    expect(
      evaluateSite(base, new Set()).files[0]?.findings.map((finding) => finding.status),
    ).toEqual(evaluateSite(changed, new Set()).files[0]?.findings.map((finding) => finding.status));
  });

  it('retains the Not scanned text and every unaffected check', () => {
    const facts = siteFacts({
      files: [file({ code: { ok: false, reason: 'not-scanned' } })],
      stopped: 'connection-lost',
    });
    const result = evaluateSite(
      facts,
      new Set<ReviewKey>(CHECKS.map((check): ReviewKey => `file-1:${check}`)),
    );
    expect(result.files[0]?.findings[0]?.status).toBe('configured');
    expect(result.files[0]?.findings[1]?.summary).toBe(NOT_SCANNED_TEXT);
    expect(result.files[0]?.findings[2]?.status).toBe('not-scanned');
  });
});
```

- [x] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/model/checks.test.ts src/features/inspector/model/rules.test.ts`

Expected: exit 1 because the check module does not exist and `rules.ts` still throws `not implemented: phase 11`.

- [x] **Step 3: Implement the minimum fix**

```ts file=src/features/inspector/model/copy.ts
import type { CheckId } from '@/types/inspector';

export type CheckCopy = {
  title: string;
  category: string;
  guidance: string;
  questions: readonly string[];
};

export const CHECK_COPY: Readonly<Record<CheckId, CheckCopy>> = {
  webRole: {
    title: 'Web role assigned',
    category: 'Web role',
    guidance:
      'Assign a web role that the intended callers hold. Review anonymous access before release.',
    questions: [
      'Who should be able to call this handler?',
      'Should unauthenticated visitors have access?',
    ],
  },
  tablePermissions: {
    title: 'Table permissions',
    category: 'Table permissions',
    guidance:
      'Review the grant set for the intended callers. Confirm effective access with a real site user.',
    questions: [
      'Are these privileges and access types the minimum this handler needs?',
      'Have you tested access with a real site user?',
    ],
  },
  outbound: {
    title: 'Outbound networking',
    category: 'Outbound networking',
    guidance:
      'Limit outbound networking to the hosts this handler calls and review tenant policy separately.',
    questions: [
      'Do these domains cover every host this handler calls?',
      'Has tenant outbound policy been reviewed separately?',
    ],
  },
};

export const OTHER_ROLES_NOTE = "Other roles a user may hold aren't assessed.";
export const FLOW_NOTE =
  "Cloud flows (`CloudFlow.TriggerAsync`) aren't checked; their connections and network access are configured in the flow.";
export const ENVVAR_CACHE_NOTE =
  'The site uses a cached copy of environment-variable values until it restarts, so a recent change may not be live yet.';
export const TIMEOUT_NOTE =
  "Microsoft's Power Pages plugin reports that values above 120 are clamped to 120. Learn allows up to 240.";
export const TENANT_POLICY_NOTE =
  "Tenant outbound policy: not verified. This tool doesn't read tenant network policy.";
export const NOT_SCANNED_TEXT = 'Not read before the connection was lost';
export const CODE_READ_FAILURE = "Couldn't read handler code";
export const CODE_ANALYSIS_LIMIT = "Couldn't analyse handler code";
export const CONNECTORS_UNKNOWN = "Couldn't determine which connectors the code uses.";
```

```ts file=src/features/inspector/model/checks.ts
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
  FLOW_NOTE,
  NOT_SCANNED_TEXT,
  OTHER_ROLES_NOTE,
} from './copy';
import { buildGrantSet, permissionSnapshot } from './grantSet';
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

function makeFinding(
  check: CheckId,
  configuredSummary: string,
  reasons: readonly Reason[],
  detail: readonly string[],
  notScanned = false,
): Finding {
  const copy = CHECK_COPY[check];
  return {
    check,
    status: notScanned ? 'not-scanned' : reasons.length > 0 ? 'needs-review' : 'configured',
    summary: notScanned ? NOT_SCANNED_TEXT : (reasons[0]?.text ?? configuredSummary),
    reasons,
    guidance: copy.guidance,
    questions: copy.questions,
    detail: [...reasons.map((reason) => reason.text), ...detail],
  };
}

function webRole(facts: SiteFacts, file: ServerLogicFileFacts): Finding {
  const evidence = [facts.roles, file.roleIds];
  const failed = evidence.some((item) => !item.ok && item.reason === 'read-failed');
  const notScanned = evidence.some((item) => !item.ok && item.reason === 'not-scanned');
  if (failed || notScanned || !facts.roles.ok || !file.roleIds.ok) {
    return makeFinding(
      'webRole',
      '',
      failed ? [{ text: "Couldn't read configuration", readFailure: true }] : [],
      [],
      notScanned,
    );
  }
  const roles = facts.roles.value;
  const ids = file.roleIds.value;
  const reasons: Reason[] = [];
  if (ids.length === 0)
    reasons.push({
      text: 'No web role assigned. No site user can call it yet.',
      readFailure: false,
    });
  if (roles.some((role) => ids.includes(role.id) && role.anonymous)) {
    reasons.push({ text: 'Callable by unauthenticated visitors.', readFailure: false });
  }
  if (ids.some((id) => !roles.some((role) => role.id === id))) {
    reasons.push({ text: "Couldn't read configuration", readFailure: true });
  }
  return makeFinding(
    'webRole',
    'Web role assigned.',
    reasons,
    roles.filter((role) => ids.includes(role.id)).map((role) => role.name),
  );
}

function tablePermissions(
  facts: SiteFacts,
  file: ServerLogicFileFacts,
  analysis: Analysis,
): Finding {
  const grants = buildGrantSet(facts, file);
  const reasons: Reason[] = [];
  const detail: string[] = [...permissionSnapshot(grants), OTHER_ROLES_NOTE];
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
  const snapshot = settingSnapshot(facts);
  if (analysis.notScanned) return makeFinding('outbound', '', [], snapshot, true);
  if (analysis.reason !== null) return makeFinding('outbound', '', [analysis.reason], snapshot);
  const connectors = analysis.connectors;
  if (connectors === null)
    return makeFinding(
      'outbound',
      '',
      [{ text: CODE_ANALYSIS_LIMIT, readFailure: false }],
      snapshot,
    );
  if (!connectors.httpClient) {
    return connectors.undetermined
      ? makeFinding('outbound', '', [{ text: CONNECTORS_UNKNOWN, readFailure: false }], snapshot)
      : makeFinding('outbound', 'No HttpClient calls in code.', [], [FLOW_NOTE, ...snapshot]);
  }
  if (!facts.settings.ok) {
    return makeFinding(
      'outbound',
      '',
      facts.settings.reason === 'read-failed'
        ? [{ text: "Couldn't read configuration", readFailure: true }]
        : [],
      snapshot,
      facts.settings.reason === 'not-scanned',
    );
  }
  const domains = parseAllowedDomains(facts.settings.value['ServerLogic/AllowedDomains']);
  const all = parseBooleanSetting(
    'ServerLogic/AllowNetworkingToAllDomains',
    facts.settings.value['ServerLogic/AllowNetworkingToAllDomains'],
  );
  if (domains.notScanned || all.notScanned)
    return makeFinding('outbound', '', [...domains.reasons, ...all.reasons], snapshot, true);
  const invalid = [...domains.reasons, ...all.reasons];
  if (invalid.length > 0 || domains.value === null || all.value === null)
    return makeFinding('outbound', '', invalid, snapshot);
  const hosts = domains.value.hosts;
  const row = all.value
    ? hosts.length === 0
      ? 'All domains allowed. Limit to the hosts it calls.'
      : "`AllowedDomains` is set but `AllowNetworkingToAllDomains` isn't `false`, so the list doesn't apply and all domains are allowed."
    : hosts.length === 0
      ? 'Outbound calls are blocked. The handler calls HttpClient, but no domains are allowed.'
      : `Allowed domains ${hosts.map((host) => `\`${host}\``).join(', ')}. Whether they cover every host the handler calls isn't checked.`;
  const reasons: Reason[] = domains.value.wildcards.map((entry) => ({
    text: `Wildcard entries aren't supported: \`${entry}\` matches no host.`,
    readFailure: false,
  }));
  if (all.value || hosts.length === 0) reasons.push({ text: row, readFailure: false });
  return makeFinding('outbound', row, reasons, [row, ...snapshot]);
}

export function evaluateFileChecks(facts: SiteFacts, file: ServerLogicFileFacts): FileResult {
  const analysis = analyse(file);
  const web = webRole(facts, file);
  const tables = tablePermissions(facts, file, analysis);
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
      tables: permissionSnapshot(buildGrantSet(facts, file)),
      outbound: [network.summary, ...settingSnapshot(facts)],
    },
  };
}
```

```ts file=src/features/inspector/model/rules.ts
import type {
  Counts,
  FileResult,
  Finding,
  ReviewKey,
  SiteFacts,
  SiteResult,
} from '@/types/inspector';
import { evaluateFileChecks } from './checks';
import { defaultRoleBanners } from './grantSet';
import { settingBanners } from './settings';

export function canReviewFinding(finding: Finding): boolean {
  return finding.status === 'needs-review' && !finding.reasons.some((reason) => reason.readFailure);
}

export function evaluateSite(facts: SiteFacts, marks: ReadonlySet<ReviewKey>): SiteResult {
  const files = facts.files.map((file) => {
    const result = evaluateFileChecks(facts, file);
    const mark = (finding: Finding): Finding =>
      marks.has(`${file.id}:${finding.check}`) && canReviewFinding(finding)
        ? { ...finding, status: 'reviewed' }
        : finding;
    return {
      ...result,
      findings: [
        mark(result.findings[0]),
        mark(result.findings[1]),
        mark(result.findings[2]),
      ] as const,
    };
  });
  return {
    facts,
    files,
    banners: [
      ...settingBanners(facts),
      ...defaultRoleBanners(facts),
      ...(!facts.inventoryComplete ? ['Inventory incomplete. Reconnect and rescan.'] : []),
      ...(facts.stopped === 'connection-lost' ? ['Connection lost. Reconnect and rescan.'] : []),
    ],
  };
}

export function countChecks(findings: readonly Finding[]): Counts {
  const C = findings.filter((finding) => finding.status === 'configured').length;
  const V = findings.filter((finding) => finding.status === 'reviewed').length;
  const M = findings.filter((finding) => finding.status === 'needs-review').length;
  const U = findings.filter((finding) => finding.status === 'not-scanned').length;
  return { C, V, M, U, T: findings.length, K: C + V };
}

export function ringLegend(counts: Counts): string {
  return `${String(counts.C)} configured${counts.V > 0 ? ` · ${String(counts.V)} reviewed` : ''} · ${String(counts.M)} review${counts.U > 0 ? ` · ${String(counts.U)} not scanned` : ''}`;
}

export function fileSummary(f: FileResult): string {
  const { C, V, M, K } = countChecks(f.findings);
  return C === 3
    ? 'All configured'
    : K === 3
      ? `Ready · ${String(V)} reviewed`
      : `${String(K)}/3 · ${String(M)} to review`;
}

export function filePill(f: FileResult): 'Ready' | 'Needs review' | 'Incomplete' {
  const { M, U } = countChecks(f.findings);
  return M > 0 ? 'Needs review' : U > 0 ? 'Incomplete' : 'Ready';
}
```

Test-only fixtures:

```ts file=src/features/inspector/model/fixtures.ts
import type {
  Readable,
  ServerLogicFileFacts,
  SettingName,
  SettingValue,
  SiteFacts,
  TablePermissionFact,
  WebRoleFact,
} from '@/types/inspector';

export const read = <T>(value: T): Readable<T> => ({ ok: true, value });
export const value = (raw: string, fromEnvVar = false): SettingValue => ({
  kind: 'value',
  raw,
  fromEnvVar,
});

export const role = (id: string, patch: Partial<WebRoleFact> = {}): WebRoleFact => ({
  id,
  name: id,
  anonymous: false,
  authenticated: false,
  ...patch,
});

export const permission = (
  id: string,
  patch: Partial<TablePermissionFact> = {},
): TablePermissionFact => ({
  id,
  name: id,
  table: 'contact',
  scope: 'Contact',
  privileges: ['Read'],
  roleIds: ['staff'],
  active: true,
  parentId: null,
  ...patch,
});

export const file = (patch: Partial<ServerLogicFileFacts> = {}): ServerLogicFileFacts => ({
  id: 'file-1',
  name: 'customer-summary',
  active: true,
  roleIds: read(['staff']),
  code: read('function get() { return "{}"; }'),
  ...patch,
});

export function settings(
  patch: Partial<Record<SettingName, SettingValue>> = {},
): Readonly<Record<SettingName, SettingValue>> {
  return {
    'ServerLogic/Enabled': { kind: 'absent' },
    'ServerLogic/AllowedDomains': { kind: 'absent' },
    'ServerLogic/AllowNetworkingToAllDomains': { kind: 'absent' },
    'ServerLogic/TimeoutInSeconds': { kind: 'absent' },
    ...patch,
  };
}

export const siteFacts = (patch: Partial<SiteFacts> = {}): SiteFacts => ({
  scanId: 'connection-1:site-1:1',
  site: { id: 'site-1', name: 'Development site', domain: 'dev.example.com', active: true },
  connection: {
    id: 'connection-1',
    name: 'Development',
    url: 'https://example.crm.dynamics.com',
    environment: 'Dev',
  },
  startedAt: '2026-10-22T12:00:00.000Z',
  finishedAt: '2026-10-22T12:00:01.000Z',
  roles: read([role('staff')]),
  permissions: read([]),
  settings: read(settings()),
  inactiveSettings: [],
  files: [file()],
  inventoryComplete: true,
  stopped: null,
  ...patch,
});
```

- [x] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/model/checks.test.ts src/features/inspector/model/rules.test.ts`

Expected: exit 0, including all 64 state combinations, O0–O6, review eligibility and retained Reviewed reasons.

Run: `npx vitest run src/features/inspector/model src/lib/code-analysis`

Expected: exit 0.

- [x] **Step 5: Commit the coherent change**

```bash
git add -- src/features/inspector/model/checks.ts src/features/inspector/model/checks.test.ts src/features/inspector/model/copy.ts src/features/inspector/model/rules.ts src/features/inspector/model/rules.test.ts src/features/inspector/model/fixtures.ts
git commit -m "feat(inspector): evaluate readiness checks and counts"
```

## Integration verification

Run `npx tsc -b`, `npx eslint src/features/inspector/model --max-warnings=0` and `npx vitest run src/features/inspector/model`; expect exit 0. Run `npx prettier --check src/features/inspector/model`; expect the selected files to be formatted.

## Verified while planning

Detached scratch base `42c2809`, 2026-10-22: the model tests passed in the assembled Inspector suite (94 files, 1,391 tests). Typecheck, scoped ESLint and the IIFE build also passed. The primary checkout contains this documentation only. Live configuration and PPTB evidence remain Phase 12/15 gates.

## Done when

- [x] Source: one owner interprets each setting, scope and parent chain; Phase 15 does not duplicate those rules.
- [x] Tests: settings, grants, all 64 states, O0–O6 and review eligibility pass.
- [x] Build: typecheck and scoped lint pass.
- [ ] Live evidence remains explicitly unverified until the owner runs S2 and a dev-site scan.
