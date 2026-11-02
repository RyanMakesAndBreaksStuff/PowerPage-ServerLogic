# Phase 16: Inspector Report Model and Markdown Implementation Plan

> **Execution superseded — 2026-11-01.** `../../../plans/p5-1_plan.md`, `../../../plans/p5-2_plan.md` and `../../../plans/p5-3_plan.md` (and later P5.x plans) own the remaining Inspector implementation, contracts and check commands. This file keeps the stable phase IDs, design choices and probe outcomes; its code blocks, `$value` fallback, blanket API prohibition, Prettier commands and sequencing are not current execution instructions.

**Goal:** Export complete file and site readiness reports as escaped Markdown from one immutable display model, preserving the scan interval, banners, all reviewed reasons, include toggles and redacted identities.

**Architecture:** `buildReportModel` owns report scope, display text, redaction, ordering, counts and provenance; it consumes Phase 11's evaluated `SiteResult` without another evaluation. `renderMarkdown` owns escaping and Markdown structure, while `reportFileName` returns a complete suggested filename from the model's format and sanitised stem. Phase 20 consumes the same model for PDF and Phase 24 owns snapshot capture, export eligibility and saving.

**Tech stack:** Existing TypeScript 6.0 strict, Vitest 5, Vite aliases, Node `fs` in tests, Phase 11 pure rules and copy. No dependency is added in this phase.

**Part / wave:** Logic Inspector, I2. Phase ID 16.

**Implements / Satisfies:**

- FR-10: both-scope report content, inline and cell escaping, include toggles, scan provenance and redaction; PDF rendering and fonts belong to Phase 20.
- AC-9.2: file H2, Environment / Scanned / Result lines, not-atomic statement, every site banner, three-check table, original reviewed reasons, open guidance/questions, optional snapshot and footer.
- AC-9.3: owns site counts, file rows, all-check ring data and ordered Review first / Not scanned sections consumed by Phase 20.
- AC-9.4: Site summary + Markdown and format-aware filenames for both scopes.
- AC-9.5: omits question lists and snapshots when their toggles are off.
- AC-9.6: redacts environment name/URL and site name/domain in derived values before filename sanitisation; file names are retained. PDF title uses `model.title` in Phase 20.
- AC-9.7 and AC-8.12: Reviewed stays distinct and original reasons survive every toggle.
- AC-9.8: a fresh model copies display data from the supplied snapshot; Phase 24 freezes the result at dialog open and controls cancellation.
- AC-9.10: hostile file/site/role names are literal escaped text with intact table columns.
- AC-7.7, 7.9, 7.10 and 7.12 export portions: preserve failed-read findings, stopped/incomplete states and Phase 11's authoritative banners without reclassifying them.

**Depends on:** 00 contract stubs; 11 `SiteResult`, nullable scope / inactive-settings amendments, `CHECK_COPY`, `countChecks`, `filePill`, `fileSummary`. Phase 15 is not required to exercise this pure phase. Phase 24 later supplies the actual scan snapshot.

**Files:**

- Modify: `src/features/inspector/report/reportModel.types.ts` — real display-model types replacing the Phase 00 placeholder.
- Modify: `src/features/inspector/report/buildReportModel.ts` — derive display data, scope and provenance.
- Modify: `src/features/inspector/report/reportFileName.ts` — complete suggested filename.
- Modify: `src/features/inspector/report/renderMarkdown.ts` — both-scope Markdown.
- Create: `src/features/inspector/report/markdownEscape.ts` — format-specific inline/cell escaping.
- Create: `src/features/inspector/report/reportFixtures.ts` — test-only report fixtures reused by Phase 20.
- Create: `src/features/inspector/report/buildReportModel.test.ts`, `src/features/inspector/report/markdownEscape.test.ts`, `src/features/inspector/report/renderMarkdown.test.ts`.
- Create: `src/features/inspector/report/__golden__/file.md`, `src/features/inspector/report/__golden__/site.md` — exact expected Markdown, one final LF.

**Interfaces — Consumes:** `SiteResult`, `FileResult`, `Finding`, `CheckId`, `CheckStatus`, `Counts` from `src/types/inspector.ts`; `ReportOptions` / `ReportScope` / `ReportFormat` from `src/types/report.ts`; the Phase 11 exports named above.

**Interfaces — Produces:** `ReportModel` and its named child types in `reportModel.types.ts`; pinned `buildReportModel(result: SiteResult, options: ReportOptions, exportedAt: Date): ReportModel`, `renderMarkdown(model: ReportModel): string`, `reportFileName(model: ReportModel): string`; `escapeCell(text: string): string` / `escapeInline(text: string): string`; `reportIdentity(result: SiteResult, options: ReportOptions): Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title'>` and `reportFileNameBeforeBuild(result: SiteResult, options: ReportOptions): string`. Phase 20 owns `renderPdf` and this phase leaves that stub untouched.

**Out of scope:** Host reads, React, export modal, save dialogs, toast timing, runtime access validation and persistence.

## Decisions

1. Phase 11 alone owns check titles and site banners. The report imports `CHECK_COPY[check].category`, counts and summaries; `result.banners` is copied once. Fabricated tests explicitly supply banners because they bypass `evaluateSite`.
2. `ReportModel` contains fresh transformed arrays and strings, with no `SiteFacts`, raw connection or raw URL retained. Include toggles apply once while constructing it. Reviewed reasons always remain in the check's Finding text and are shown by both renderers.
3. Redaction is one longest-match-first pass over configuration strings; a shorter identifier cannot alter a replacement token from an earlier match. Named file fields retain the stored file name as AC-9.6 requires. Site-redacted `[site]` is sanitised to `site`, yielding `site-site-readiness.md` or `.pdf`.
4. `reportFileName` includes the extension. `reportFileName.ts` also owns `reportIdentity` and `reportFileNameBeforeBuild`, so Phase 24 can name a building failure accurately before a full model exists. `ReportModel.format` preserves the existing one-argument function signature; Phase 24 must not append another extension. The stem follows AC-9.4 exactly and a trailing `.js` is removed only for file scope, case-insensitively.
5. File rows sort by name A–Z with a stable name/id tie-breaker. Sections sort by Web role, Table permissions, Outbound networking and then file name. C/V/M/U/T/K comes from `countChecks`; ready/review/incomplete counts come from `filePill`.
6. The interval uses the end Date's local UTC offset for both endpoints and prints that offset explicitly. Export time uses its own Date offset. Tests spy on `getTimezoneOffset` and restore the spy rather than changing `process.env.TZ` inside a worker.
7. Markdown values use exactly one inline helper outside cells and one cell helper inside cells, including headings, bold lines, blockquotes, questions and snapshots. Both replace CRLF/CR/LF with spaces. Direct PDF text is escaped by jsPDF's text serializer in Phase 20 and is never passed to HTML.
8. Goldens specify the emitted Markdown byte for byte, including unpadded tables. Check TypeScript files with Prettier; keep these exact-output artifacts out of automatic Markdown reformatting.

**Baseline:** Primary branch `001-logic-inspector`, commit `42c2809`, supplied Part A / Starter / Objects implementation; Inspector report files are the Phase 00 stubs. The shared scratch checkout is `.scratch/inspector-plan`. All commands below run from the checkout root. The primary full Prettier check already reports 176 unrelated files; this phase verifies owned code and documentation explicitly.

---

### Task 1: Build a scoped display model and a complete export filename

**Owns:** ReportModel shape, identities/provenance/counts/order/includes, and filename derivation.

**Files:**

- Modify: `src/features/inspector/report/reportModel.types.ts`, `src/features/inspector/report/buildReportModel.ts`, `src/features/inspector/report/reportFileName.ts`.
- Signal: `src/features/inspector/report/buildReportModel.test.ts`.
- Create: `src/features/inspector/report/reportFixtures.ts` — reused test data only.

- [x] **Step 1: Establish the observable pre-change signal**

Create `src/features/inspector/report/reportFixtures.ts`:

```ts
import type { CheckId, CheckStatus, FileResult, Finding, SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';

export const REPORT_OPTIONS: ReportOptions = {
  scope: 'file',
  format: 'markdown',
  fileId: 'customer',
  questions: true,
  snapshot: true,
  redact: false,
};
export const EXPORTED_AT = new Date('2026-10-22T11:02:00Z');

export function reportFinding(check: CheckId, status: CheckStatus): Finding {
  const text = {
    webRole: 'Members can call this handler.',
    tablePermissions: 'Global Read on account via Members.',
    outbound: 'No HttpClient calls in code.',
  }[check];
  return {
    check,
    status,
    summary: status === 'not-scanned' ? 'Not read before the connection was lost' : text,
    reasons:
      status === 'needs-review' || status === 'reviewed' ? [{ text, readFailure: false }] : [],
    guidance: `Review ${check} configuration.`,
    questions: [`Is ${check} configured for the intended users?`],
    detail: [`${check} detail.`],
  };
}

export function reportFile(
  fileId: string,
  name: string,
  states: readonly [CheckStatus, CheckStatus, CheckStatus],
): FileResult {
  return {
    fileId,
    name,
    active: true,
    findings: [
      reportFinding('webRole', states[0]),
      reportFinding('tablePermissions', states[1]),
      reportFinding('outbound', states[2]),
    ],
    snapshot: {
      roles: ['Members'],
      tables: ['account / Global / Read / Members'],
      outbound: ['ServerLogic/AllowedDomains = api.example.com'],
    },
  };
}

export function reportResult(): SiteResult {
  const files = [
    reportFile('customer', 'customer-summary.js', ['configured', 'needs-review', 'configured']),
    reportFile('reviewed', 'a-reviewed', ['configured', 'reviewed', 'configured']),
    reportFile('pending', 'z-pending', ['not-scanned', 'not-scanned', 'not-scanned']),
  ];
  return {
    facts: {
      scanId: 'scan-1',
      site: {
        id: 'site-1',
        name: 'Customer portal',
        domain: 'https://customer.powerappsportals.com',
        active: true,
      },
      connection: {
        id: 'connection-1',
        name: 'Contoso',
        url: 'https://contoso.crm.dynamics.com',
        environment: 'Dev',
      },
      startedAt: '2026-10-22T11:00:00Z',
      finishedAt: '2026-10-22T11:00:30Z',
      roles: { ok: true, value: [] },
      permissions: { ok: true, value: [] },
      settings: {
        ok: true,
        value: {
          'ServerLogic/Enabled': { kind: 'value', raw: 'true', fromEnvVar: false },
          'ServerLogic/AllowedDomains': { kind: 'absent' },
          'ServerLogic/AllowNetworkingToAllDomains': { kind: 'absent' },
          'ServerLogic/TimeoutInSeconds': { kind: 'absent' },
        },
      },
      inactiveSettings: [],
      files: [],
      inventoryComplete: true,
      stopped: null,
    },
    files,
    banners: [],
  };
}

export function hostileReportResult(): SiteResult {
  const result = reportResult();
  const hostile = '| * <script> [x](y)\n#name';
  const file = reportFile('hostile', `file ${hostile}.js`, [
    'configured',
    'needs-review',
    'configured',
  ]);
  return {
    ...result,
    facts: {
      ...result.facts,
      site: { ...result.facts.site, name: `site ${hostile}` },
      connection: { ...result.facts.connection, name: `environment ${hostile}` },
    },
    files: [{ ...file, snapshot: { ...file.snapshot, roles: [`role ${hostile}`] } }],
    banners: [`Site banner ${hostile}`],
  };
}
```
Create `src/features/inspector/report/buildReportModel.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { buildReportModel } from './buildReportModel';
import { EXPORTED_AT, REPORT_OPTIONS, reportFile, reportResult } from './reportFixtures';
import { reportFileName, reportFileNameBeforeBuild } from './reportFileName';

describe('buildReportModel', () => {
  it('retains the stored file name and creates the sanitised filename with its format', () => {
    const model = buildReportModel(reportResult(), REPORT_OPTIONS, EXPORTED_AT);
    expect(model.title).toBe('Server logic readiness: customer-summary.js');
    expect(model.stem).toBe('customer-summary');
    expect(reportFileName(model)).toBe('customer-summary-readiness.md');
    expect(reportFileNameBeforeBuild(reportResult(), REPORT_OPTIONS)).toBe(reportFileName(model));
    expect(reportFileName({ ...model, format: 'pdf' })).toBe('customer-summary-readiness.pdf');
    expect(model.counts).toEqual({ C: 2, V: 0, M: 1, U: 0, T: 3, K: 2 });
    expect(model.rows).toHaveLength(1);
  });

  it('orders site rows by name and sections by check, then name', () => {
    const result = reportResult();
    result.files = [
      reportFile('z', 'Z', ['needs-review', 'needs-review', 'configured']),
      reportFile('a', 'A', ['needs-review', 'configured', 'needs-review']),
    ];
    const model = buildReportModel(result, { ...REPORT_OPTIONS, scope: 'site' }, EXPORTED_AT);
    expect(model.rows.map((row) => row.name)).toEqual(['A', 'Z']);
    expect(model.reviewFirst.map((section) => [section.check, section.fileName])).toEqual([
      ['webRole', 'A'],
      ['webRole', 'Z'],
      ['tablePermissions', 'Z'],
      ['outbound', 'A'],
    ]);
    expect(model.counts).toEqual({ C: 2, V: 0, M: 4, U: 0, T: 6, K: 2 });
  });

  it('keeps reviewed original reasons even when both includes are off', () => {
    const model = buildReportModel(
      reportResult(),
      { ...REPORT_OPTIONS, fileId: 'reviewed', questions: false, snapshot: false },
      EXPORTED_AT,
    );
    expect(model.rows[0]?.checks[1]).toMatchObject({
      status: 'reviewed',
      statusText: 'Reviewed',
      finding: 'Global Read on account via Members.',
      reasons: ['Global Read on account via Members.'],
      questions: [],
    });
    expect(model.snapshot).toBeNull();
    expect(model.counts).toEqual({ C: 2, V: 1, M: 0, U: 0, T: 3, K: 3 });
  });

  it('redacts names and URLs across banners, detail, snapshot and site filename', () => {
    const result = reportResult();
    const identifiers = [
      result.facts.connection.name,
      result.facts.connection.url,
      result.facts.site.name,
      result.facts.site.domain,
    ];
    const text = identifiers.join(' / ');
    const file = reportFile('customer', 'customer-summary.js', [
      'configured',
      'needs-review',
      'configured',
    ]);
    result.files = [
      {
        ...file,
        findings: [
          file.findings[0],
          {
            ...file.findings[1],
            summary: text,
            reasons: [{ text, readFailure: false }],
            guidance: text,
            questions: [text],
            detail: [text],
          },
          file.findings[2],
        ],
        snapshot: { roles: [text], tables: [text], outbound: [text] },
      },
    ];
    result.banners = [text];
    const model = buildReportModel(
      result,
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    const serialised = JSON.stringify(model);
    for (const identifier of identifiers) expect(serialised).not.toContain(identifier);
    expect(serialised).toContain('[environment]');
    expect(serialised).toContain('[site]');
    expect(serialised).toContain('customer-summary.js');
    expect(reportFileName(model)).toBe('site-site-readiness.md');
    expect(
      reportFileNameBeforeBuild(result, { ...REPORT_OPTIONS, scope: 'site', redact: true }),
    ).toBe(reportFileName(model));
    expect(result.banners).toEqual([text]);
  });

  it('keeps stopped and inventory-incomplete notices plus all not-scanned checks', () => {
    const result = reportResult();
    result.facts.stopped = 'connection-lost';
    result.facts.inventoryComplete = false;
    result.banners = [
      'Connection lost. Reconnect and rescan.',
      'Inventory incomplete. Some server logic files may be missing.',
    ];
    const model = buildReportModel(result, { ...REPORT_OPTIONS, scope: 'site' }, EXPORTED_AT);
    expect(model.banners).toContain('Connection lost. Reconnect and rescan.');
    expect(model.banners).toContain(
      'Inventory incomplete. Some server logic files may be missing.',
    );
    expect(model.notScanned.map((section) => section.check)).toEqual([
      'webRole',
      'tablePermissions',
      'outbound',
    ]);
    expect(model.fileCounts).toEqual({ ready: 1, needsReview: 1, incomplete: 1 });
    expect(model.counts).toEqual({ C: 4, V: 1, M: 1, U: 3, T: 9, K: 5 });
  });

  it.each([
    ['  name | * <script>.js', 'name-script'],
    ['report.JS', 'report'],
    ['!!!', 'site'],
    ['a___b...c', 'a___b...c'],
  ])('sanitises %s after trimming a trailing .js', (name, stem) => {
    const result = reportResult();
    result.files = [reportFile('customer', name, ['configured', 'configured', 'configured'])];
    expect(buildReportModel(result, REPORT_OPTIONS, EXPORTED_AT).stem).toBe(stem);
  });

  it('uses Date offset without mutating the worker timezone', () => {
    const timezone = process.env.TZ;
    const spy = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-330);
    try {
      const model = buildReportModel(reportResult(), REPORT_OPTIONS, EXPORTED_AT);
      expect(model.lines.find((line) => line.label === 'Scanned')?.text).toBe(
        '2026-10-22 16:30:00 – 2026-10-22 16:30:30 (UTC+05:30)',
      );
      expect(model.header.exportedAt).toBe('2026-10-22 16:32:00 (UTC+05:30)');
      expect(process.env.TZ).toBe(timezone);
    } finally {
      spy.mockRestore();
    }
  });

  it('rejects a missing selected file rather than exporting a different file', () => {
    expect(() =>
      buildReportModel(reportResult(), { ...REPORT_OPTIONS, fileId: 'missing' }, EXPORTED_AT),
    ).toThrow('Select a file first');
  });
});
```

- [x] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/report/buildReportModel.test.ts`

Expected: `Tests 11 failed (11)`; model-dependent cases throw `not implemented: phase 16` and the missing-file case gets that stub error instead of `Select a file first`.

- [x] **Step 3: Implement the minimum fix**

Replace `src/features/inspector/report/reportModel.types.ts`:

```ts
import type { CheckId, CheckStatus, Counts } from '@/types/inspector';
import type { ReportFormat, ReportScope } from '@/types/report';

export type ReportLine = { readonly label: string; readonly text: string };
export type ReportCheck = {
  readonly check: CheckId;
  readonly title: string;
  readonly status: CheckStatus;
  readonly statusText: string;
  readonly finding: string;
  readonly reasons: readonly string[];
  readonly guidance: string;
  readonly questions: readonly string[];
  readonly detail: readonly string[];
};
export type ReportRow = {
  readonly fileId: string;
  readonly name: string;
  readonly active: boolean;
  readonly counts: Counts;
  readonly summary: string;
  readonly result: 'Ready' | 'Needs review' | 'Incomplete';
  readonly checks: readonly ReportCheck[];
};
export type ReportSection = {
  readonly fileName: string;
  readonly check: CheckId;
  readonly title: string;
  readonly summary: string;
  readonly reasons: readonly string[];
  readonly guidance: string;
  readonly questions: readonly string[];
  readonly detail: readonly string[];
};
export type ReportSnapshot = {
  readonly fileName: string;
  readonly roles: readonly string[];
  readonly tables: readonly string[];
  readonly outbound: readonly string[];
};

// Contains display-ready, redacted text; renderers alone own format-specific escaping.
export type ReportModel = {
  readonly scope: ReportScope;
  readonly format: ReportFormat;
  readonly stem: string;
  readonly title: string;
  readonly header: { readonly brand: string; readonly label: string; readonly exportedAt: string };
  readonly lines: readonly ReportLine[];
  readonly counts: Counts;
  readonly fileCounts: {
    readonly ready: number;
    readonly needsReview: number;
    readonly incomplete: number;
  };
  readonly headline: string;
  readonly banners: readonly string[];
  readonly rows: readonly ReportRow[];
  readonly needsReview: readonly ReportSection[];
  readonly reviewFirst: readonly ReportSection[];
  readonly notScanned: readonly ReportSection[];
  readonly snapshot: readonly ReportSnapshot[] | null;
  readonly footer: readonly string[];
};
```
Replace `src/features/inspector/report/buildReportModel.ts`:

```ts
import { CHECK_COPY } from '@/features/inspector/model/copy';
import { countChecks, filePill, fileSummary } from '@/features/inspector/model/rules';
import type { ReportCheck, ReportModel, ReportRow, ReportSection } from './reportModel.types';
import type { CheckId, CheckStatus, FileResult, Finding, SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';
import { reportIdentity } from './reportFileName';

const CHECK_ORDER: readonly CheckId[] = ['webRole', 'tablePermissions', 'outbound'];
const STATUS_TEXT: Readonly<Record<CheckStatus, string>> = {
  configured: 'Configured',
  'needs-review': 'Needs review',
  reviewed: 'Reviewed',
  'not-scanned': 'Not scanned',
};
const NOT_ATOMIC = 'Read as separate queries during this interval, not as one atomic snapshot.';

function stamp(date: Date, offset = date.getTimezoneOffset()): string {
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 19).replace('T', ' ');
}

function utcOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset();
  const magnitude = Math.abs(minutes);
  return `UTC${minutes < 0 ? '-' : '+'}${String(Math.floor(magnitude / 60)).padStart(2, '0')}:${String(magnitude % 60).padStart(2, '0')}`;
}

function redactor(result: SiteResult, enabled: boolean): (text: string) => string {
  if (!enabled) return (text) => text;
  const { connection, site } = result.facts;
  const replacements = [
    { value: connection.name, replacement: '[environment]' },
    { value: connection.url, replacement: '[environment]' },
    { value: site.name, replacement: '[site]' },
    { value: site.domain, replacement: '[site]' },
  ]
    .filter(({ value }) => value.length > 0)
    .sort((a, b) => b.value.length - a.value.length);
  // Replace in one pass so a shorter identifier never alters an already-redacted placeholder.
  return (text) => {
    let output = '';
    for (let index = 0; index < text.length;) {
      const match = replacements.find(({ value }) => text.startsWith(value, index));
      if (match === undefined) {
        output += text.slice(index, index + 1);
        index++;
      } else {
        output += match.replacement;
        index += match.value.length;
      }
    }
    return output;
  };
}

function checkModel(
  finding: Finding,
  questions: boolean,
  redact: (text: string) => string,
): ReportCheck {
  const reasons = finding.reasons.map((reason) => redact(reason.text));
  return {
    check: finding.check,
    title: CHECK_COPY[finding.check].category,
    status: finding.status,
    statusText: STATUS_TEXT[finding.status],
    finding: reasons.length === 0 ? redact(finding.summary) : reasons.join('; '),
    reasons,
    guidance: redact(finding.guidance),
    questions: questions ? finding.questions.map(redact) : [],
    detail: finding.detail.map(redact),
  };
}

function rowModel(
  file: FileResult,
  options: ReportOptions,
  redact: (text: string) => string,
): ReportRow {
  return {
    fileId: file.fileId,
    name: file.name,
    active: file.active,
    counts: countChecks(file.findings),
    summary: fileSummary(file),
    result: filePill(file),
    checks: CHECK_ORDER.flatMap((check) =>
      file.findings
        .filter((finding) => finding.check === check)
        .map((finding) => checkModel(finding, options.questions, redact)),
    ),
  };
}

function sections(rows: readonly ReportRow[], status: CheckStatus): readonly ReportSection[] {
  return CHECK_ORDER.flatMap((check) =>
    rows.flatMap((row) =>
      row.checks
        .filter((finding) => finding.check === check && finding.status === status)
        .map((finding) => ({
          fileName: row.name,
          check,
          title: finding.title,
          summary: finding.finding,
          reasons: finding.reasons,
          guidance: finding.guidance,
          questions: finding.questions,
          detail: finding.detail,
        })),
    ),
  );
}

export function buildReportModel(
  result: SiteResult,
  options: ReportOptions,
  exportedAt: Date,
): ReportModel {
  const files = result.files
    .filter((file) => options.scope === 'site' || file.fileId === options.fileId)
    .toSorted(
      (a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
        a.name.localeCompare(b.name, 'en') ||
        a.fileId.localeCompare(b.fileId, 'en'),
    );
  const selected = files[0];
  if (options.scope === 'file' && selected === undefined) throw new Error('Select a file first');
  const redact = redactor(result, options.redact);
  const rows = files.map((file) => rowModel(file, options, redact));
  const counts = countChecks(files.flatMap((file) => file.findings));
  const fileCounts = {
    ready: rows.filter((row) => row.result === 'Ready').length,
    needsReview: rows.filter((row) => row.result === 'Needs review').length,
    incomplete: rows.filter((row) => row.result === 'Incomplete').length,
  };
  const startedAt = new Date(result.facts.startedAt);
  const endedAt = new Date(result.facts.finishedAt ?? exportedAt.toISOString());
  const offset = endedAt.getTimezoneOffset();
  const scanned = `${stamp(startedAt, offset)} – ${stamp(endedAt, offset)} (${utcOffset(endedAt)})`;
  const exported = `${stamp(exportedAt)} (${utcOffset(exportedAt)})`;
  const siteName = options.redact ? '[site]' : result.facts.site.name;
  const environmentName = options.redact ? '[environment]' : result.facts.connection.name;
  const summary = `${String(counts.K)}/${String(counts.T)} checks addressed (${String(counts.C)} configured, ${String(counts.V)} reviewed)`;
  const review = sections(rows, 'needs-review');
  return {
    ...reportIdentity(result, options),
    header: {
      brand: 'Logic Inspector',
      label: `${options.scope === 'site' ? 'Site' : 'File'} readiness report · ${stamp(exportedAt).slice(0, 10)}`,
      exportedAt: exported,
    },
    lines: [
      {
        label: 'Environment',
        text: `${environmentName} · ${result.facts.connection.environment} / ${siteName}`,
      },
      { label: 'Scanned', text: scanned },
      { label: '', text: NOT_ATOMIC },
      {
        label: 'Result',
        text:
          options.scope === 'file' && selected !== undefined
            ? `${filePill(selected)} · ${fileSummary(selected)}`
            : summary,
      },
    ],
    counts,
    fileCounts,
    headline: `${String(files.length)} server logic ${files.length === 1 ? 'file' : 'files'}, ${String(counts.M)} ${counts.M === 1 ? 'finding' : 'findings'} to review`,
    banners: result.banners.map(redact),
    rows,
    needsReview: options.scope === 'file' ? review : [],
    reviewFirst: options.scope === 'site' ? review : [],
    notScanned: sections(rows, 'not-scanned'),
    snapshot: options.snapshot
      ? files.map((file) => ({
          fileName: file.name,
          roles: file.snapshot.roles.map(redact),
          tables: file.snapshot.tables.map(redact),
          outbound: file.snapshot.outbound.map(redact),
        }))
      : null,
    footer:
      options.scope === 'file'
        ? ['Configuration review only. Tenant outbound policy not verified.']
        : [
            `Configuration review only. Confirm effective access with a real site user. Exported ${exported}.`,
            'Tenant outbound policy not verified.',
          ],
  };
}
```
Replace `src/features/inspector/report/reportFileName.ts`:

```ts
import type { ReportModel } from '@/features/inspector/report/reportModel.types';
import type { SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';

type ReportIdentity = Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title'>;

export function reportIdentity(result: SiteResult, options: ReportOptions): ReportIdentity {
  const file = result.files.find((candidate) => candidate.fileId === options.fileId);
  const name =
    options.scope === 'file'
      ? (file?.name ?? 'site')
      : options.redact
        ? '[site]'
        : result.facts.site.name;
  const raw = options.scope === 'file' ? name.replace(/\.js$/i, '') : name;
  return {
    scope: options.scope,
    format: options.format,
    stem: raw.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'site',
    title:
      options.scope === 'file'
        ? `Server logic readiness: ${name}`
        : `Site readiness report: ${name}`,
  };
}

function filenameOf(model: Pick<ReportIdentity, 'scope' | 'format' | 'stem'>): string {
  const suffix = model.scope === 'file' ? 'readiness' : 'site-readiness';
  const extension = model.format === 'markdown' ? 'md' : 'pdf';
  return `${model.stem}-${suffix}.${extension}`;
}

export function reportFileName(model: ReportModel): string {
  return filenameOf(model);
}

export function reportFileNameBeforeBuild(result: SiteResult, options: ReportOptions): string {
  return filenameOf(reportIdentity(result, options));
}
```

- [x] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/report/buildReportModel.test.ts`

Expected: `Test Files 1 passed (1)` and `Tests 11 passed (11)`.

Run: `npx tsc -b`

Expected: exit 0 with no diagnostics.

- [x] **Step 5: Commit the coherent change**

```powershell
git add src/features/inspector/report/reportModel.types.ts src/features/inspector/report/buildReportModel.ts src/features/inspector/report/reportFileName.ts src/features/inspector/report/reportFixtures.ts src/features/inspector/report/buildReportModel.test.ts
git commit -m "feat(inspector): build scoped redacted report model"
```

---

### Task 2: Render complete literal Markdown in both scopes

**Owns:** Markdown escaping and section/table serialization; exact expected output.

**Files:**

- Create: `src/features/inspector/report/markdownEscape.ts`.
- Modify: `src/features/inspector/report/renderMarkdown.ts`.
- Signal: `src/features/inspector/report/markdownEscape.test.ts`, `src/features/inspector/report/renderMarkdown.test.ts`.
- Create: `src/features/inspector/report/__golden__/file.md`, `src/features/inspector/report/__golden__/site.md`.

- [x] **Step 1: Establish the observable pre-change signal**

Create `src/features/inspector/report/markdownEscape.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { escapeCell, escapeInline } from './markdownEscape';

describe('Markdown escaping', () => {
  it('escapes each table delimiter and collapses all newline forms', () => {
    expect(escapeCell('\\ | * _ ` [ ] < > #\r\nnext\rline\nend')).toBe(
      '\\\\ \\| \\* \\_ \\` \\[ \\] \\< \\> # next line end',
    );
  });

  it('also escapes heading syntax outside cells', () => {
    expect(escapeInline('# [x](y) <script>\n*value*')).toBe(
      '\\# \\[x\\](y) \\<script\\> \\*value\\*',
    );
  });
});
```
Create `src/features/inspector/report/renderMarkdown.test.ts`:

```ts
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildReportModel } from './buildReportModel';
import { escapeInline } from './markdownEscape';
import { EXPORTED_AT, REPORT_OPTIONS, hostileReportResult, reportResult } from './reportFixtures';
import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown', () => {
  it.each(['file', 'site'] as const)('matches the complete %s golden', (scope) => {
    const offset = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
    try {
      const result = reportResult();
      result.banners = ['Server logic is disabled on this site (ServerLogic/Enabled = false)'];
      const model = buildReportModel(result, { ...REPORT_OPTIONS, scope }, EXPORTED_AT);
      const golden = readFileSync(new URL(`./__golden__/${scope}.md`, import.meta.url), 'utf8');
      expect(renderMarkdown(model)).toBe(golden);
    } finally {
      offset.mockRestore();
    }
  });

  it('escapes hostile names in headings, lines, blockquotes, lists and table cells', () => {
    const result = hostileReportResult();
    const model = buildReportModel(result, { ...REPORT_OPTIONS, fileId: 'hostile' }, EXPORTED_AT);
    const report = renderMarkdown(model);
    expect(report).toContain(`## ${escapeInline(model.title)}`);
    expect(report).toContain('file \\| \\* \\<script\\> \\[x\\](y) \\#name.js');
    expect(report).toContain('role \\| \\* \\<script\\> \\[x\\](y) \\#name');
    expect(report).not.toContain('<script>');
    expect(report).not.toContain('[x](y)');
    expect(report).not.toContain('\n#name');
    for (const line of report.split('\n').filter((value) => value.startsWith('| '))) {
      expect(line.match(/(?<!\\)\|/g)).toHaveLength(4);
    }
  });

  it('leaves questions and snapshots out, but keeps reviewed reasons and provenance', () => {
    const model = buildReportModel(
      reportResult(),
      { ...REPORT_OPTIONS, fileId: 'reviewed', questions: false, snapshot: false },
      EXPORTED_AT,
    );
    const report = renderMarkdown(model);
    expect(report).not.toContain('- [ ]');
    expect(report).not.toContain('Configuration snapshot');
    expect(report).toContain(
      '| Table permissions | Reviewed | Global Read on account via Members. |',
    );
    expect(report).toContain(
      'Read as separate queries during this interval, not as one atomic snapshot.',
    );
    expect(report).toContain('Configuration review only. Tenant outbound policy not verified.');
  });

  it('exports stopped notices and the not-scanned list for both scopes', () => {
    const result = reportResult();
    result.facts.stopped = 'connection-lost';
    result.banners = ['Connection lost. Reconnect and rescan.'];
    for (const scope of ['file', 'site'] as const) {
      const model = buildReportModel(
        result,
        { ...REPORT_OPTIONS, scope, fileId: 'pending' },
        EXPORTED_AT,
      );
      const report = renderMarkdown(model);
      expect(report).toContain('> Connection lost. Reconnect and rescan.');
      expect(report).toContain('### Not scanned');
      expect(report).toContain('Not read before the connection was lost');
    }
  });
});
```
Create `src/features/inspector/report/__golden__/file.md`:

```markdown
## Server logic readiness: customer-summary.js

**Environment:** Contoso · Dev / Customer portal

**Scanned:** 2026-10-22 11:00:00 – 2026-10-22 11:00:30 (UTC+00:00)

Read as separate queries during this interval, not as one atomic snapshot.

**Result:** Needs review · 2/3 · 1 to review

> Server logic is disabled on this site (ServerLogic/Enabled = false)

| Check | Status | Finding |
| --- | --- | --- |
| Web role | Configured | Members can call this handler. |
| Table permissions | Needs review | Global Read on account via Members. |
| Outbound networking | Configured | No HttpClient calls in code. |

### Table permissions

Global Read on account via Members.

Review tablePermissions configuration.

tablePermissions detail.

- [ ] Is tablePermissions configured for the intended users?

### Configuration snapshot

**Web roles**

- Members

**Tables with privileges**

- account / Global / Read / Members

**Outbound**

- ServerLogic/AllowedDomains = api.example.com

> Configuration review only. Tenant outbound policy not verified.
```
Create `src/features/inspector/report/__golden__/site.md`:

```markdown
## Site readiness report: Customer portal

Logic Inspector · Site readiness report · 2026-10-22

3 server logic files, 1 finding to review

**Environment:** Contoso · Dev / Customer portal

**Scanned:** 2026-10-22 11:00:00 – 2026-10-22 11:00:30 (UTC+00:00)

Read as separate queries during this interval, not as one atomic snapshot.

**Result:** 5/9 checks addressed (4 configured, 1 reviewed)

Ready: 1 · Needs review: 1 · Incomplete: 1 · Not verified: Tenant outbound policy

> Server logic is disabled on this site (ServerLogic/Enabled = false)

| File | Addressed | Web role | Table permissions | Outbound networking | Result |
| --- | --- | --- | --- | --- | --- |
| a-reviewed | Ready · 1 reviewed | Configured | Reviewed: Global Read on account via Members. | Configured | Ready |
| customer-summary.js | 2/3 · 1 to review | Configured | Needs review | Configured | Needs review |
| z-pending | 0/3 · 0 to review | Not scanned | Not scanned | Not scanned | Incomplete |

### Review first

### Table permissions: customer-summary.js

Global Read on account via Members.

Review tablePermissions configuration.

tablePermissions detail.

- [ ] Is tablePermissions configured for the intended users?

### Not scanned

- Web role: z-pending — Not read before the connection was lost
- Table permissions: z-pending — Not read before the connection was lost
- Outbound networking: z-pending — Not read before the connection was lost

### Configuration snapshot: a-reviewed

**Web roles**

- Members

**Tables with privileges**

- account / Global / Read / Members

**Outbound**

- ServerLogic/AllowedDomains = api.example.com

### Configuration snapshot: customer-summary.js

**Web roles**

- Members

**Tables with privileges**

- account / Global / Read / Members

**Outbound**

- ServerLogic/AllowedDomains = api.example.com

### Configuration snapshot: z-pending

**Web roles**

- Members

**Tables with privileges**

- account / Global / Read / Members

**Outbound**

- ServerLogic/AllowedDomains = api.example.com

> Configuration review only. Confirm effective access with a real site user. Exported 2026-10-22 11:02:00 (UTC+00:00).

> Tenant outbound policy not verified.
```

- [x] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/report/markdownEscape.test.ts src/features/inspector/report/renderMarkdown.test.ts`

Expected: both suites fail to resolve `./markdownEscape` while the helper is absent. After creating the helper in Step 3, keeping the original renderer stub makes all five renderer cases throw `not implemented: phase 16`; replacing that stub changes the signal to the seven passing tests below.

- [x] **Step 3: Implement the minimum fix**

Create `src/features/inspector/report/markdownEscape.ts`:

```ts
export function escapeCell(text: string): string {
  return text.replace(/\r\n|\r|\n/g, ' ').replace(/[\\|*_`[\]<>]/g, '\\$&');
}

export function escapeInline(text: string): string {
  return escapeCell(text).replace(/#/g, '\\#');
}
```
Replace `src/features/inspector/report/renderMarkdown.ts`:

```ts
import type { ReportModel } from '@/features/inspector/report/reportModel.types';
import type { ReportCheck, ReportSection, ReportSnapshot } from './reportModel.types';
import { escapeCell, escapeInline } from './markdownEscape';

function tableRow(values: readonly string[]): string {
  return `| ${values.map(escapeCell).join(' | ')} |`;
}

function statusCell(check: ReportCheck): string {
  return check.status === 'reviewed' ? `${check.statusText}: ${check.finding}` : check.statusText;
}

function findingSection(section: ReportSection, siteScope: boolean): string[] {
  const title = siteScope ? `${section.title}: ${section.fileName}` : section.title;
  return [
    `### ${escapeInline(title)}`,
    '',
    escapeInline(section.summary),
    '',
    escapeInline(section.guidance),
    ...section.detail.map((detail) => `\n${escapeInline(detail)}`),
    ...(section.questions.length > 0
      ? ['', ...section.questions.map((question) => `- [ ] ${escapeInline(question)}`)]
      : []),
    '',
  ];
}

function snapshotSection(snapshot: ReportSnapshot, siteScope: boolean): string[] {
  const title = siteScope
    ? `Configuration snapshot: ${snapshot.fileName}`
    : 'Configuration snapshot';
  return [
    `### ${escapeInline(title)}`,
    '',
    '**Web roles**',
    '',
    ...snapshot.roles.map((role) => `- ${escapeInline(role)}`),
    '',
    '**Tables with privileges**',
    '',
    ...snapshot.tables.map((table) => `- ${escapeInline(table)}`),
    '',
    '**Outbound**',
    '',
    ...snapshot.outbound.map((outbound) => `- ${escapeInline(outbound)}`),
    '',
  ];
}

export function renderMarkdown(model: ReportModel): string {
  const lines = [`## ${escapeInline(model.title)}`, ''];
  if (model.scope === 'site') {
    lines.push(
      escapeInline(`${model.header.brand} · ${model.header.label}`),
      '',
      escapeInline(model.headline),
      '',
    );
  }
  for (const line of model.lines) {
    lines.push(
      line.label === ''
        ? escapeInline(line.text)
        : `**${escapeInline(line.label)}:** ${escapeInline(line.text)}`,
      '',
    );
  }
  if (model.scope === 'site') {
    lines.push(
      escapeInline(
        `Ready: ${String(model.fileCounts.ready)} · Needs review: ${String(model.fileCounts.needsReview)} · Incomplete: ${String(model.fileCounts.incomplete)} · Not verified: Tenant outbound policy`,
      ),
      '',
    );
  }
  for (const banner of model.banners) lines.push(`> ${escapeInline(banner)}`, '');
  if (model.scope === 'file') {
    lines.push(tableRow(['Check', 'Status', 'Finding']), '| --- | --- | --- |');
    for (const row of model.rows) {
      for (const check of row.checks)
        lines.push(tableRow([check.title, check.statusText, check.finding]));
    }
    lines.push('', ...model.needsReview.flatMap((section) => findingSection(section, false)));
  } else {
    lines.push(
      tableRow([
        'File',
        'Addressed',
        'Web role',
        'Table permissions',
        'Outbound networking',
        'Result',
      ]),
      '| --- | --- | --- | --- | --- | --- |',
    );
    for (const row of model.rows) {
      lines.push(tableRow([row.name, row.summary, ...row.checks.map(statusCell), row.result]));
    }
    lines.push('', '### Review first', '');
    lines.push(...model.reviewFirst.flatMap((section) => findingSection(section, true)));
  }
  if (model.notScanned.length > 0) {
    lines.push('### Not scanned', '');
    for (const section of model.notScanned) {
      lines.push(`- ${escapeInline(`${section.title}: ${section.fileName} — ${section.summary}`)}`);
    }
    lines.push('');
  }
  if (model.snapshot !== null) {
    lines.push(
      ...model.snapshot.flatMap((snapshot) => snapshotSection(snapshot, model.scope === 'site')),
    );
  }
  for (const footer of model.footer) lines.push(`> ${escapeInline(footer)}`, '');
  return `${lines.join('\n').trimEnd()}\n`;
}
```

- [x] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/report/markdownEscape.test.ts src/features/inspector/report/renderMarkdown.test.ts`

Expected: `Test Files 2 passed (2)` and `Tests 7 passed (7)`.

Run: `npx vitest run src/features/inspector/report/buildReportModel.test.ts`

Expected: `Test Files 1 passed (1)` and `Tests 11 passed (11)`.

Run: `npx tsc -b`

Expected: exit 0 with no diagnostics.

Run: `npx eslint src/features/inspector/report --max-warnings=0`

Expected: exit 0 with no diagnostics.

Run: `npx prettier --check src/features/inspector/report/*.ts`

Expected: `All matched files use Prettier code style!`.

- [x] **Step 5: Commit the coherent change**

```powershell
git add src/features/inspector/report/markdownEscape.ts src/features/inspector/report/markdownEscape.test.ts src/features/inspector/report/renderMarkdown.ts src/features/inspector/report/renderMarkdown.test.ts src/features/inspector/report/__golden__/file.md src/features/inspector/report/__golden__/site.md
git commit -m "feat(inspector): render escaped Markdown reports"
```

## Integration verification

Run: `npx vitest run src/features/inspector/report/buildReportModel.test.ts src/features/inspector/report/markdownEscape.test.ts src/features/inspector/report/renderMarkdown.test.ts`

Expected: 3 files, 18 tests pass. Inspect the file and site goldens against AC-9.2 / 9.3 / 9.4; all fields and original reviewed reasons are present once.

Run: `npx tsc -b`

Expected: exit 0.

Run: `npx eslint src/features/inspector/report --max-warnings=0`

Expected: exit 0.

Run: `npx prettier --check src/features/inspector/report/*.ts`

Expected: `All matched files use Prettier code style!`.

Run: `npx vitest run`

Expected: every existing and new test passes; baseline tests remain unchanged. Phase 20 adds seven report tests, so a checkout that includes it runs 25 report tests in four files.

## Verified while planning

On 2026-10-22, the code above was written at real paths in the shared scratch checkout on primary baseline `42c2809`, alongside Phase 11 and the other Inspector drafts. Model tests captured the Phase 16 stub failure before implementation; after dependencies resolved, restoring the renderer stub produced all five expected Phase 16 renderer failures, then restoring this source passed. The final report run passed 4 files / 25 tests including Phase 20 (this phase's 3 files / 18 tests). `npx tsc -b`, scoped ESLint and `npx prettier --check src/features/inspector/report/*.ts` exited 0.

Golden content was hand-written and reviewed against AC-9, then compared with `toBe`; it was not generated by the renderer during a test. The hostile fixture exercises file/site/role names with pipes, emphasis, a script tag, a link and a newline. Offset coverage includes UTC+05:30 without worker timezone mutation. The whole-directory formatter flags only the two intentionally unpadded golden tables in owned report files; the TypeScript check is clean.

This is source and automated proof. No report has yet been saved by the real PPTB host, and no rendered report/screen comparison is claimed here.

## Done when

- [x] **Source:** the two tasks are implemented with the exact exports and full model shape above; Phase 20 and Phase 24 consume this owner rather than redoing redaction/counts.
- [x] **Tests / build:** the 18 tests for this phase, TypeScript, scoped lint/format and the full regression suite pass. Both goldens remain exact output with one LF. Verified 2026-10-23 at `11d1647`: 3 files / 18 report tests, 89 files / 1348 full-suite tests, `tsc -b` and `eslint . --max-warnings=0` pass; the scoped Prettier glob flags only the untouched Phase 20 `renderPdf.ts` stub. Goldens are pinned `eol=lf` in `.gitattributes`.
- [ ] **Rendered browser:** after Phase 24, exported Markdown pasted into a PR/work item shows literal hostile names and complete sections; statuses/reasons equal the Inspector screen for the snapshot.
- [ ] **Live PPTB / site (◆):** after Phase 24, both scopes save through the real host; redacted site export has the expected filename and no environment/site identity; a stopped scan's notices and not-scanned findings match the screen.

