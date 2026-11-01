# P5.6 Reports and P5.8 Build Gates Implementation Plan

**Goal:** Produce faithful, selectable Markdown/vector-PDF reports and executable Inspector inclusion/exclusion release gates.

**Architecture:** Task 4 owns raw configuration exclusively in `FileResult.snapshot` and the required `Finding.hasUnscannedEvidence: boolean` contract, including the existing `reportFixtures.ts` constructor. Task 7 owns display-ready report selection/redaction, shared section ordering, local PDF fonts, vector layout and PDF serialization. Task 9 consumes the completed production journey and inspects actual rendered build modules; Task 10 owns manuals, validator scripting, package verification and rendered/live evidence.

**Tech stack:** Existing TypeScript 6/Vitest 5/Vite 8, installed `jspdf@4.2.1`, `jspdf-autotable@5.0.8`, native URL parsing, PowerShell and Node standard-library test utilities. No package additions.

**Scope:** P5.6/Task 7, CR-003, WR-001 export ownership, WR-002; P5.8/Task 9 build-shape, manifest and scaffold-completion gates. Task numbers below are subdivisions of those owning tasks.

**Out of scope:** Production implementation during this planning session; Task 4 rule/fixture edits; Tasks 6/8 page/export wiring; Task 10 documentation/live acceptance; unrelated Starter type, lint, URL and audit failures.

**Parent plan:** [Complete Logic Inspector](11-01-2026-phase-5-logic-inspector.md).

---

## Integration contracts and grounded decisions

- Execute from `C:\Users\RyanDev\source\repos\Server Logic`. This document specifies implementation work; the overlay verification below does not mean integrated production tests have run.
- Dependency order: Task 4 → 7a; 7b can follow the already-installed font baseline independently; 7a + 7b → 7c; Tasks 5, 6, 7c, 8 → 9a. Stage/commit only the listed paths after reconciling already-staged user work.
- Keep `renderPdf(model: ReportModel): Uint8Array`, `renderMarkdown(model): string` and `reportFileName(model): string`. Export remains synchronous until Task 8 invokes the host. A PDF error is propagated before native save; Task 8 retains Markdown/retry.
- `ReportModel.metadataTitle` separately owns PDF title metadata; the renderer consumes it rather than the display title. With redaction enabled, file metadata is `[site] · <original server-logic filename>-readiness`; only the source filename is retained as an identifying value. Site metadata uses the redacted site title. The shared `reportGroups` selector exposes preserved Reviewed/Configured guidance/detail/questions and full Not-scanned explanations in both formats.
- Preserve source server-logic names in `row.name`, section/snapshot filenames, the file-report **display** title and filename stem. PDF metadata follows the separate contract above. Add explicit Active/Inactive display labels. URL aliases replace complete hostname tokens, including HTTP(S) forms, without replacing a prefix/suffix of an unrelated host. URL parsing never performs I/O.
- Task 6's marker handoff in [the session/export plan](11-01-2026-phase-5-session-export.md) is **`Review server logic readiness`**. Task 9 additionally asserts the real empty-state copy **`No server logic found on this site`**, **`Export report`** after Task 8 and rendered module paths. The provider is `src/app/inspector-site/InspectorProvider.tsx`, picker `src/app/shell/SitePill.tsx`, export `src/features/inspector/ExportDialog.tsx`.
- Task 1 pins the **Task 7c `REPORT_PALETTE`** values, white landscape A4, 36pt margins, DM Sans 400 body, Space Grotesk 700 headings, JetBrains Mono 400 paths, vector checks/rings, 10pt minimum table text and labelled continuation rows. These are grounded in `plans/phase-20-report-pdf.md` and A8, not the current handoff README §5 (Accessibility). UI Graphite tokens do not replace report tokens.
- Task 1's FR-10 contract also adopts the exact PDF repertoire/unsupported-character behavior in Task 7b's `PDF-FONTS.md`. Non-Latin scripts, combining marks, emoji and shaping are not universally supported. If required release data lies outside the accepted repertoire, RG-005/CR-003 remains open until the owner explicitly accepts that limitation or funds a separately specified renderer/font expansion.
- Current icon work is already resolved: `public/icons/logo.svg`, manifest `icons/logo.svg`, spec 4.0.1 and existing tests agree. No icon rename or package edit is planned here.
- `docs/plans/11-01-2026-phase-5-baseline.md` owns baseline evidence; its later checkpoint supersedes the initial failures: **1,402 full-suite tests and typecheck/build/build:beta pass**. Scratch-probe lint, online URL checks and the two moderate audit entries remain separate gates. This task's virtual overlays are not integrated release proof.
- Task 4 is complete in `docs/plans/11-01-2026-phase-5-rules.md`: 49 regression/468 focused overlay tests plus scoped typecheck/lint passed. Its `reportFinding` initialization is `hasUnscannedEvidence: status === 'not-scanned'`; `Finding.detail` retains original reasons, `OTHER_ROLES_NOTE` and `ENVVAR_CACHE_NOTE`, with raw configuration confined to the unchanged `FileResult.snapshot` shape. Consume that verified overlay; do not duplicate its constructor change.
- Documentation checked: Context7 jsPDF `/parallax/jspdf/v4.2.1` (TTF/VFS, Identity-H/ToUnicode), AutoTable `/simonbengtsson/jspdf-autotable` (row-height exception to `rowPageBreak: 'avoid'`, repeated heads), Vite `/vitejs/vite/v8.0.10` (programmatic builds/output hooks). Installed AutoTable declarations and Rolldown's `RenderedModule.renderedLength` were inspected directly.

## Plan-code verification — 2026-11-01

The complete new files and existing-file hunks below were extracted from this document. Task 4's stable plan was overlaid first, including its required flag, constructor migrations and snapshot fixes. Production files were not edited. Unique verification tooling and generated mirrors are under `.scratch/phase5-2026-11-01/report-verification/`; the normal execution commands remain in each task.

| Local check | Actual result |
|---|---|
| `node .scratch/phase5-2026-11-01/report-verification/typecheck.mjs` | **PASS:** local TypeScript **6.0.3**, 222 root files, 30 overlays, zero diagnostics. Uses `readConfigFile`, `parseJsonConfigFileContent`, `createProgram` and a virtual `CompilerHost`; no emit. Includes proposed Task 9 test code. |
| `node .scratch/phase5-2026-11-01/report-verification/lint.mjs` | **PASS:** 25 TypeScript files against the same virtual program, zero errors/warnings. |
| `npm exec -- vitest run --config .scratch/phase5-2026-11-01/report-verification/config.mts --reporter=json --outputFile=.scratch/phase5-2026-11-01/report-verification/post-result.json` | **PASS:** 14 targeted files, **292 tests**, zero skipped. Covers reports, all Task 4 model regressions, ring geometry and manifest checks. |
| Same focused config with `REPORT_VERIFY_MODE=privacy-red` after `node .scratch/phase5-2026-11-01/report-verification/prepare.mjs privacy-red` | **RED captured:** 4 failed / 2 passed; unchanged report model/Markdown with Task 4 applied. |
| Same focused config with `REPORT_VERIFY_MODE=pdf-red` after `node .scratch/phase5-2026-11-01/report-verification/prepare.mjs pdf-red` | **RED captured:** all 7 renderer tests fail against the original PDF stub; 7a/7b are present. |
| `node scripts/acquire-report-fonts.mjs --offline`, run from the scratch acquisition mirror | **PASS:** all three fonts and published licences match the manifest; no font payload was downloaded again. |

`prepare.mjs post` refreshes the scratch-only sources/config data before the green run. Set `INSPECTOR_PDF_EVIDENCE_DIR=.scratch/phase5-2026-11-01/report-verification/pdf-evidence` during that run to reproduce the saved outputs. `proof-summary.json` in the verification directory records their SHA-256 values and exact test outcomes.

Actual real-renderer artifacts:

- `pdf-evidence/file-stress.pdf`: **219,053 bytes, 12 pages, `%PDF-1.3`**.
- `pdf-evidence/site-stress.pdf`: **902,600 bytes, 91 pages, `%PDF-1.3`**, including the deliberately extreme 50-file/long-reason fixture.
- Both scopes passed ToUnicode extraction, every-written-character/font coverage, complete source-content checks, repeated headings, horizontal/vertical bounds and unsplit physical rows. The independent continuation test reconstructs each cell, preventing duplicated narrative text from masking table loss.

Verification corrected two concrete draft issues: Markdown sentinel assertions must use the escaped sentinel; AutoTable 5.0.8 coerces array cell content into comma-delimited text, so the implementation now passes newline-delimited strings. Six scoped lint findings were corrected. All source/test listings below contain those corrections.

**Metadata/path follow-up:** `ReportModel.metadataTitle` now separates PDF metadata from the source-preserving display title. Redacted file metadata uses `[site] · <original filename>-readiness`; the actual PDF-byte test supplies identifying site/connection names and URLs and verifies the source-derived filename is retained. The affected model/Markdown/privacy/PDF/manifest run passed **38 tests in 5 files** (`metadata-result.json`); local TypeScript passed **222 root files / 32 overlays / 0 diagnostics**, and scoped lint passed **27 files / 0 errors or warnings**. This focused follow-up supersedes the metadata behavior in the earlier 292-test checkpoint. Task 9 retains its existing `fileURLToPath(new URL('..', import.meta.url))` root, and manifest tests use the existing local `isRecord` function. No build process was run for this correction.

**Remaining gates:** Task 9's final Inspector-included/excluded artifact proof is **unexecuted** pending Tasks 5/6/8 integration; its proposed code is typechecked. An initial inherited Vitest include list accidentally reached baseline build tests and failed on scaffolding/missing production licences; it is not release evidence, and the corrected scoped run above excludes builds. Actual PDF-reader selection/copying, live PPTB timings and required-data glyph acceptance remain Task 10 gates. The explicitly bounded repertoire in `PDF-FONTS.md` is not universal Unicode support. Baseline lint/audit/online-URL status remains owned by the canonical baseline document.

### Task 7a: Make report options, redaction and complete section content faithful

**Owns:** Shared report presentation, alias redaction, snapshot-on/off consumption and full explanatory-content parity. Raw-snapshot construction and `hasUnscannedEvidence` remain Task 4's prerequisites.

**Files:**

- Create: `src/features/inspector/report/reportPrivacy.test.ts` — public-model/Markdown regressions.
- Create: `src/features/inspector/report/reportRedaction.ts` — bounded identity-token replacement.
- Create: `src/features/inspector/report/reportSections.ts` — check order and presentation groups shared by both formats.
- Modify: `src/features/inspector/report/buildReportModel.ts:8,27,55,74,94,144,163,173` — consume the shared selectors/redactor and retain summary plus reasons.
- Modify: `src/features/inspector/report/reportModel.types.ts:47`, `src/features/inspector/report/reportFileName.ts:5-24` — distinguish redacted metadata from source-preserving display/filename identity.
- Modify: `src/features/inspector/report/renderMarkdown.ts:3,84,98,100-109` — complete shared groups and state labels.
- Modify: `src/features/inspector/report/__golden__/file.md`, `src/features/inspector/report/__golden__/site.md` — only the intended content additions.
- Signal: `src/features/inspector/report/reportPrivacy.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/inspector/report/reportPrivacy.test.ts` with these complete contents:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SiteResult } from '@/types/inspector';
import { buildReportModel } from './buildReportModel';
import { escapeInline } from './markdownEscape';
import { EXPORTED_AT, REPORT_OPTIONS, reportFile, reportResult } from './reportFixtures';
import { reportFileName, reportFileNameBeforeBuild } from './reportFileName';
import { renderMarkdown } from './renderMarkdown';

const RAW = 'SNAPSHOT_ONLY_7A_491';
const IDENTITIES = [
  'Private Environment',
  'https://Tenant.Example.test/org/',
  'Private Site',
  'https://Portal.Example.test/',
  'TENANT.EXAMPLE.TEST',
  'portal.example.test',
  'http://PORTAL.EXAMPLE.TEST/path',
  'https://tenant.example.test/another',
];
const UNRELATED = [
  'other-tenant.example.test',
  'tenant.example.test.outside.test',
  'https://outside.test/PrivateEnvironment',
  'tenant.example.test.js',
];
const TEXT = [...IDENTITIES, ...UNRELATED].join(' / ');
const REDACTED = [
  '[environment]',
  '[environment]',
  '[site]',
  '[site]',
  '[environment]',
  '[site]',
  '[site]/path',
  '[environment]/another',
  ...UNRELATED,
].join(' / ');

function fixture(): SiteResult {
  const result = reportResult();
  result.facts.connection = {
    ...result.facts.connection,
    name: IDENTITIES[0] ?? '',
    url: IDENTITIES[1] ?? '',
  };
  result.facts.site = {
    ...result.facts.site,
    name: IDENTITIES[2] ?? '',
    domain: IDENTITIES[3] ?? '',
  };
  const file = reportFile('customer', 'handler.js', [
    'needs-review', 'reviewed', 'not-scanned',
  ]);
  result.files = [{
    ...file,
    active: false,
    findings: [
      { ...file.findings[0], summary: `Summary ${TEXT}`,
        reasons: [{ text: `Reason ${TEXT}`, readFailure: false }],
        guidance: `Guidance ${TEXT}`, detail: [`Detail ${TEXT}`],
        questions: [`Question ${TEXT}`] },
      { ...file.findings[1], summary: 'Reviewed summary',
        reasons: [{ text: 'Original reviewed reason', readFailure: false }],
        guidance: 'Reviewed guidance', detail: ['Reviewed explanation'],
        questions: ['Reviewed question'] },
      { ...file.findings[2], summary: 'Missing evidence',
        guidance: 'Not-scanned guidance', detail: ['Not-scanned explanation'],
        questions: ['Not-scanned question'] },
    ],
    snapshot: { roles: [RAW, TEXT], tables: ['table snapshot'], outbound: ['outbound snapshot'] },
  }, reportFile('ready', 'ready.js', ['configured', 'configured', 'configured'])];
  result.banners = [TEXT];
  return result;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('report privacy and presentation ownership', () => {
  it.each(['file', 'site'] as const)('keeps options structural in %s reports', (scope) => {
    for (const snapshot of [false, true]) {
      for (const questions of [false, true]) {
        const model = buildReportModel(fixture(), {
          ...REPORT_OPTIONS, scope, snapshot, questions,
        }, EXPORTED_AT);
        const markdown = renderMarkdown(model);
        expect(JSON.stringify(model.rows)).not.toContain(RAW);
        expect(JSON.stringify(model.needsReview)).not.toContain(RAW);
        expect(JSON.stringify(model.reviewFirst)).not.toContain(RAW);
        expect(markdown.includes(escapeInline(RAW))).toBe(snapshot);
        expect(markdown.split(escapeInline(RAW))).toHaveLength(snapshot ? 2 : 1);
        expect(markdown.includes('- [ ]')).toBe(questions);
        expect(markdown).toContain('Original reviewed reason');
        expect(markdown).toContain('Reviewed explanation');
        expect(markdown).toContain('Not-scanned explanation');
        expect(markdown).toContain('Inactive');
        expect(markdown).toContain('Summary');
        expect(markdown).toContain('Reason');
        expect(model.rows[0]?.checks[0]?.status).toBe('needs-review');
        expect(model.notScanned).toHaveLength(1);
        if (scope === 'site') {
          expect(markdown).toContain('Active');
          expect(markdown).toContain('No HttpClient calls in code.');
          expect(markdown).toContain('outbound detail.');
        }
      }
    }
  });

  it.each(['file', 'site'] as const)('redacts every selected text surface in %s', (scope) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = fixture();
    const before = JSON.stringify(result);
    const options = { ...REPORT_OPTIONS, scope, redact: true };
    const model = buildReportModel(result, options, EXPORTED_AT);
    const check = model.rows[0]?.checks[0];
    expect(check).toMatchObject({
      finding: `Summary ${REDACTED}; Reason ${REDACTED}`,
      reasons: [`Reason ${REDACTED}`],
      guidance: `Guidance ${REDACTED}`,
      detail: [`Detail ${REDACTED}`],
      questions: [`Question ${REDACTED}`],
    });
    expect(model.banners).toEqual([REDACTED]);
    expect(model.snapshot?.[0]?.roles).toEqual([RAW, REDACTED]);
    expect(model.lines.find((line) => line.label === 'Environment')?.text)
      .toBe('[environment] · Dev / [site]');
    expect(model.rows[0]?.name).toBe('handler.js');
    expect(model.title).toBe(scope === 'site'
      ? 'Site readiness report: [site]' : 'Server logic readiness: handler.js');
    expect(model.metadataTitle).toBe(scope === 'site'
      ? 'Site readiness report: [site]' : '[site] · handler.js-readiness');
    expect(reportFileName(model)).toBe(scope === 'site'
      ? 'site-site-readiness.md' : 'handler-readiness.md');
    expect(reportFileNameBeforeBuild(result, options)).toBe(reportFileName(model));
    const markdown = renderMarkdown(model);
    expect(markdown).toContain(escapeInline(REDACTED));
    for (const value of UNRELATED) expect(markdown).toContain(escapeInline(value));
    expect(JSON.stringify(result)).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('preserves hostname-like server-logic names in title, rows, sections and filename', () => {
    const result = fixture();
    const first = result.files[0];
    if (first === undefined) throw new Error('Missing fixture file');
    result.files = [{ ...first, name: 'tenant.example.test.js' }];
    const model = buildReportModel(result, { ...REPORT_OPTIONS, redact: true }, EXPORTED_AT);
    expect(model.title).toBe('Server logic readiness: tenant.example.test.js');
    expect(model.rows[0]?.name).toBe('tenant.example.test.js');
    expect(model.needsReview[0]?.fileName).toBe('tenant.example.test.js');
    expect(model.snapshot?.[0]?.fileName).toBe('tenant.example.test.js');
    expect(reportFileName(model)).toBe('tenant.example.test-readiness.md');
  });

  it('keeps literal identifiers when redaction is off and handles non-URL identifiers locally', () => {
    const result = fixture();
    expect(buildReportModel(result, REPORT_OPTIONS, EXPORTED_AT).banners).toEqual([TEXT]);
    result.facts.site.domain = 'not a URL';
    result.banners = ['not a URL / outside.test'];
    expect(buildReportModel(result, { ...REPORT_OPTIONS, redact: true }, EXPORTED_AT).banners)
      .toEqual(['[site] / outside.test']);
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npm exec -- vitest run src/features/inspector/report/reportPrivacy.test.ts`

Expected on the planning baseline after Task 4's type update: exit 1, **4 failed / 2 passed**, as captured in the virtual pre-change run. Required explanation/Active-Inactive content and distinct summaries are missing, and hostname aliases remain unredacted. Snapshot-only ownership controls can already pass after Task 4; do not misreport those as new failures.

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/inspector/report/reportRedaction.ts`:

```ts
import type { SiteResult } from '@/types/inspector';

type Replacement = { value: string; replacement: string; insensitive: boolean };
const WORD = /[\p{L}\p{N}_-]/u;

function boundary(text: string, index: number, length: number): boolean {
  const before = Array.from(text.slice(Math.max(0, index - 2), index)).at(-1) ?? '';
  const after = Array.from(text.slice(index + length, index + length + 2))[0] ?? '';
  const next = Array.from(text.slice(index + length + 1, index + length + 3))[0] ?? '';
  return !WORD.test(before) && before !== '.' && !WORD.test(after)
    && !(after === '.' && WORD.test(next));
}

export function reportRedactor(result: SiteResult, enabled: boolean): (text: string) => string {
  if (!enabled) return (text) => text;
  const replacements: Replacement[] = [];
  function add(value: string, replacement: string, insensitive = false): void {
    if (value !== '') replacements.push({ value, replacement, insensitive });
  }
  function urlAliases(value: string, replacement: string): void {
    add(value, replacement, true);
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      const hostname = url.hostname.replace(/\.$/, '');
      add(url.href, replacement, true);
      add(url.origin, replacement, true);
      add(`http://${hostname}`, replacement, true);
      add(`https://${hostname}`, replacement, true);
      add(hostname, replacement, true);
    } catch {
      // A non-URL identifier still participates as its original literal value.
    }
  }
  add(result.facts.connection.name, '[environment]');
  add(result.facts.site.name, '[site]');
  urlAliases(result.facts.connection.url, '[environment]');
  urlAliases(result.facts.site.domain, '[site]');
  replacements.sort((a, b) => b.value.length - a.value.length);
  return (text) => {
    let output = '';
    for (let index = 0; index < text.length;) {
      const match = replacements.find(({ value, insensitive }) => {
        const candidate = text.slice(index, index + value.length);
        return (insensitive ? candidate.toLowerCase() === value.toLowerCase() : candidate === value)
          && boundary(text, index, value.length);
      });
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
```

Create `src/features/inspector/report/reportSections.ts`:

```ts
import type { CheckId, CheckStatus } from '@/types/inspector';
import type { ReportModel, ReportRow, ReportSection } from './reportModel.types';

export const REPORT_CHECK_ORDER: readonly CheckId[] = ['webRole', 'tablePermissions', 'outbound'];

export function sectionsForStatus(
  rows: readonly ReportRow[], status: CheckStatus,
): readonly ReportSection[] {
  return REPORT_CHECK_ORDER.flatMap((check) => rows.flatMap((row) => row.checks
    .filter((finding) => finding.check === check && finding.status === status)
    .map((finding) => ({
      fileName: row.name, check, title: finding.title, summary: finding.finding,
      reasons: finding.reasons, guidance: finding.guidance,
      questions: finding.questions, detail: finding.detail,
    }))));
}

type ReportGroup = {
  title: string | null;
  status: CheckStatus;
  sections: readonly ReportSection[];
};

export function reportGroups(model: ReportModel): readonly ReportGroup[] {
  const groups: ReportGroup[] = [
    { title: model.scope === 'site' ? 'Review first' : null, status: 'needs-review',
      sections: model.scope === 'site' ? model.reviewFirst : model.needsReview },
    { title: 'Not scanned', status: 'not-scanned', sections: model.notScanned },
    { title: 'Reviewed details', status: 'reviewed',
      sections: sectionsForStatus(model.rows, 'reviewed') },
    { title: 'Configured details', status: 'configured',
      sections: sectionsForStatus(model.rows, 'configured') },
  ];
  return groups.filter((group) => group.sections.length > 0 || group.title === 'Review first');
}
```

In `reportModel.types.ts`:

```diff
@@ export type ReportModel
   readonly stem: string;
   readonly title: string;
+  readonly metadataTitle: string;
   readonly header: { readonly brand: string; readonly label: string; readonly exportedAt: string };
```

In `reportFileName.ts`:

```diff
@@ ReportIdentity
-type ReportIdentity = Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title'>;
+type ReportIdentity = Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title' | 'metadataTitle'>;
@@ reportIdentity before its return
   const raw = options.scope === 'file' ? name.replace(/\.js$/i, '') : name;
+  const title = options.scope === 'file'
+    ? `Server logic readiness: ${name}` : `Site readiness report: ${name}`;
   return {
@@ reportIdentity title fields
-    title:
-      options.scope === 'file'
-        ? `Server logic readiness: ${name}`
-        : `Site readiness report: ${name}`,
+    title,
+    metadataTitle: options.redact && options.scope === 'file'
+      ? `[site] · ${name}-readiness` : title,
```

`buildReportModel` already spreads `reportIdentity`, so both titles share one identity owner. `reportFileName` continues using only the existing source-derived `stem`, scope and format.

Apply these anchored changes in `buildReportModel.ts`; remove the old private `redactor` and `sections` declarations in their entirety (their exact enclosing signatures are shown):

```diff
@@ imports
-import type { ReportCheck, ReportModel, ReportRow, ReportSection } from './reportModel.types';
-import type { CheckId, CheckStatus, FileResult, Finding, SiteResult } from '@/types/inspector';
+import type { ReportCheck, ReportModel, ReportRow } from './reportModel.types';
+import type { CheckStatus, FileResult, Finding, SiteResult } from '@/types/inspector';
 import type { ReportOptions } from '@/types/report';
 import { reportIdentity } from './reportFileName';
+import { reportRedactor } from './reportRedaction';
+import { REPORT_CHECK_ORDER, sectionsForStatus } from './reportSections';
@@ remove the former local check-order constant
-const CHECK_ORDER: readonly CheckId[] = ['webRole', 'tablePermissions', 'outbound'];
@@ remove the former private redactor
-function redactor(result: SiteResult, enabled: boolean): (text: string) => string {
-  if (!enabled) return (text) => text;
-  const { connection, site } = result.facts;
-  const replacements = [
-    { value: connection.name, replacement: '[environment]' },
-    { value: connection.url, replacement: '[environment]' },
-    { value: site.name, replacement: '[site]' },
-    { value: site.domain, replacement: '[site]' },
-  ]
-    .filter(({ value }) => value.length > 0)
-    .sort((a, b) => b.value.length - a.value.length);
-  // Replace in one pass so a shorter identifier never alters an already-redacted placeholder.
-  return (text) => {
-    let output = '';
-    for (let index = 0; index < text.length;) {
-      const match = replacements.find(({ value }) => text.startsWith(value, index));
-      if (match === undefined) {
-        output += text.slice(index, index + 1);
-        index++;
-      } else {
-        output += match.replacement;
-        index += match.value.length;
-      }
-    }
-    return output;
-  };
-}
@@ function checkModel(
   const reasons = finding.reasons.map((reason) => redact(reason.text));
+  const summary = redact(finding.summary);
@@ return object in checkModel
-    finding: reasons.length === 0 ? redact(finding.summary) : reasons.join('; '),
+    finding: [...new Set([summary, ...reasons].filter((text) => text !== ''))].join('; '),
@@ function rowModel(
-    summary: fileSummary(file),
+    summary: redact(fileSummary(file)),
@@ check ordering in rowModel
-    checks: CHECK_ORDER.flatMap((check) =>
+    checks: REPORT_CHECK_ORDER.flatMap((check) =>
@@ remove the former private sections selector
-function sections(rows: readonly ReportRow[], status: CheckStatus): readonly ReportSection[] {
-  return CHECK_ORDER.flatMap((check) =>
-    rows.flatMap((row) =>
-      row.checks
-        .filter((finding) => finding.check === check && finding.status === status)
-        .map((finding) => ({
-          fileName: row.name,
-          check,
-          title: finding.title,
-          summary: finding.finding,
-          reasons: finding.reasons,
-          guidance: finding.guidance,
-          questions: finding.questions,
-          detail: finding.detail,
-        })),
-    ),
-  );
-}
@@ export function buildReportModel(
-  const redact = redactor(result, options.redact);
+  const redact = reportRedactor(result, options.redact);
@@ review sections in buildReportModel
-  const review = sections(rows, 'needs-review');
+  const review = sectionsForStatus(rows, 'needs-review');
@@ Result line's file-scope branch
-            ? `${filePill(selected)} · ${fileSummary(selected)}`
+            ? `${filePill(selected)} · ${fileSummary(selected)} · ${selected.active ? 'Active' : 'Inactive'}`
@@ returned ReportModel
-    notScanned: sections(rows, 'not-scanned'),
+    notScanned: sectionsForStatus(rows, 'not-scanned'),
```

In `renderMarkdown.ts`:

```diff
@@ imports
 import { escapeCell, escapeInline } from './markdownEscape';
+import { reportGroups } from './reportSections';
@@ file-scope table tail
-    lines.push('', ...model.needsReview.flatMap((section) => findingSection(section, false)));
+    lines.push('');
@@ site row loop
-      lines.push(tableRow([row.name, row.summary, ...row.checks.map(statusCell), row.result]));
+      lines.push(tableRow([
+        `${row.name} (${row.active ? 'Active' : 'Inactive'})`,
+        row.summary, ...row.checks.map(statusCell), row.result,
+      ]));
@@ after site row loop, before snapshot
-    lines.push('', '### Review first', '');
-    lines.push(...model.reviewFirst.flatMap((section) => findingSection(section, true)));
+    lines.push('');
   }
-  if (model.notScanned.length > 0) {
-    lines.push('### Not scanned', '');
-    for (const section of model.notScanned) {
-      lines.push(`- ${escapeInline(`${section.title}: ${section.fileName} — ${section.summary}`)}`);
-    }
-    lines.push('');
+  for (const group of reportGroups(model)) {
+    if (group.title !== null) lines.push(`### ${escapeInline(group.title)}`, '');
+    lines.push(...group.sections.flatMap((section) => findingSection(section, model.scope === 'site')));
   }
```

In `__golden__/file.md`:

```diff
-**Result:** Needs review · 2/3 · 1 to review
+**Result:** Needs review · 2/3 · 1 to review · Active
@@ immediately before ### Configuration snapshot
+### Configured details
+
+### Web role
+
+Members can call this handler.
+
+Review webRole configuration.
+
+webRole detail.
+
+- [ ] Is webRole configured for the intended users?
+
+### Outbound networking
+
+No HttpClient calls in code.
+
+Review outbound configuration.
+
+outbound detail.
+
+- [ ] Is outbound configured for the intended users?
+
 ### Configuration snapshot
```

In `__golden__/site.md`:

```diff
-| a-reviewed | Ready · 1 reviewed | Configured | Reviewed: Global Read on account via Members. | Configured | Ready |
-| customer-summary.js | 2/3 · 1 to review | Configured | Needs review | Configured | Needs review |
-| z-pending | 0/3 · 0 to review | Not scanned | Not scanned | Not scanned | Incomplete |
+| a-reviewed (Active) | Ready · 1 reviewed | Configured | Reviewed: Global Read on account via Members. | Configured | Ready |
+| customer-summary.js (Active) | 2/3 · 1 to review | Configured | Needs review | Configured | Needs review |
+| z-pending (Active) | 0/3 · 0 to review | Not scanned | Not scanned | Not scanned | Incomplete |
@@ ### Not scanned
-
-- Web role: z-pending — Not read before the connection was lost
-- Table permissions: z-pending — Not read before the connection was lost
-- Outbound networking: z-pending — Not read before the connection was lost
+
+### Web role: z-pending
+
+Not read before the connection was lost
+
+Review webRole configuration.
+
+webRole detail.
+
+- [ ] Is webRole configured for the intended users?
+
+### Table permissions: z-pending
+
+Not read before the connection was lost
+
+Review tablePermissions configuration.
+
+tablePermissions detail.
+
+- [ ] Is tablePermissions configured for the intended users?
+
+### Outbound networking: z-pending
+
+Not read before the connection was lost
+
+Review outbound configuration.
+
+outbound detail.
+
+- [ ] Is outbound configured for the intended users?
+
+### Reviewed details
+
+### Table permissions: a-reviewed
+
+Global Read on account via Members.
+
+Review tablePermissions configuration.
+
+tablePermissions detail.
+
+- [ ] Is tablePermissions configured for the intended users?
+
+### Configured details
+
+### Web role: a-reviewed
+
+Members can call this handler.
+
+Review webRole configuration.
+
+webRole detail.
+
+- [ ] Is webRole configured for the intended users?
+
+### Web role: customer-summary.js
+
+Members can call this handler.
+
+Review webRole configuration.
+
+webRole detail.
+
+- [ ] Is webRole configured for the intended users?
+
+### Outbound networking: a-reviewed
+
+No HttpClient calls in code.
+
+Review outbound configuration.
+
+outbound detail.
+
+- [ ] Is outbound configured for the intended users?
+
+### Outbound networking: customer-summary.js
+
+No HttpClient calls in code.
+
+Review outbound configuration.
+
+outbound detail.
+
+- [ ] Is outbound configured for the intended users?
 
 ### Configuration snapshot: a-reviewed
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm exec -- vitest run src/features/inspector/report/reportPrivacy.test.ts`

Expected: six tests pass; both scopes/each include choice preserve mandatory explanation, aliases become the expected placeholders, unrelated hosts and source filenames survive, and no fetch occurs.

Run: `npm exec -- vitest run src/features/inspector/report/buildReportModel.test.ts src/features/inspector/report/renderMarkdown.test.ts src/features/inspector/report/reportPrivacy.test.ts src/features/inspector/model`

Expected: all targeted tests pass, including exact Markdown goldens and Task 4's ownership/evidence matrix tests.

Run: `npm exec -- eslint src/features/inspector/report --max-warnings=0`

Expected: exit 0. Integrated TypeScript validation is Task 9's gate; the baseline document's latest checkpoint already passes typecheck.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add src/features/inspector/report/reportPrivacy.test.ts src/features/inspector/report/reportRedaction.ts src/features/inspector/report/reportSections.ts src/features/inspector/report/reportModel.types.ts src/features/inspector/report/reportFileName.ts src/features/inspector/report/buildReportModel.ts src/features/inspector/report/renderMarkdown.ts src/features/inspector/report/__golden__/file.md src/features/inspector/report/__golden__/site.md
git commit --only -m "fix(inspector): preserve report evidence and redact hostname aliases" -- src/features/inspector/report/reportPrivacy.test.ts src/features/inspector/report/reportRedaction.ts src/features/inspector/report/reportSections.ts src/features/inspector/report/reportModel.types.ts src/features/inspector/report/reportFileName.ts src/features/inspector/report/buildReportModel.ts src/features/inspector/report/renderMarkdown.ts src/features/inspector/report/__golden__/file.md src/features/inspector/report/__golden__/site.md
```

### Task 7b: Bundle licensed static fonts and reject unsupported PDF text explicitly

**Owns:** Pinned font acquisition/provenance, packaged licences and runtime glyph/repertoire validation. This task adds no npm dependency and does not change the existing UI woff2 fonts.

**Files:**

- Create: `src/assets/fonts/pdf-fonts.json` — authoritative paths, source pins and SHA-256 values.
- Create: `scripts/acquire-report-fonts.mjs` — pinned asset acquisition and idempotent offline verification.
- Create: `src/assets/fonts/JetBrainsMono_400Regular.ttf`, `src/assets/fonts/OFL-JetBrainsMono-TTF.txt` — exact upstream bytes acquired by the command below.
- Create: `src/assets/fonts/PDF-FONTS.md` — supported repertoire and release limitation.
- Create: `public/licenses/OFL-DMSans.txt`, `public/licenses/OFL-SpaceGrotesk.txt`, `public/licenses/OFL-JetBrainsMono-TTF.txt` — byte-identical licence copies shipped by Vite.
- Create: `src/features/inspector/report/pdfFonts.ts` — embed/validate/wrap text with the three actual faces.
- Create: `src/features/inspector/report/testFontCmap.ts` — independent test-only OpenType cmap reader.
- Signal/Create: `src/features/inspector/report/pdfFonts.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/inspector/report/testFontCmap.ts`:

```ts
// Independent test reader for the pinned static TTFs; never imported by production.
function tables(bytes: Uint8Array): ReadonlyMap<string, number> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0) !== 0x00010000) throw new Error('Expected a static TrueType sfnt');
  const entries = new Map<string, number>();
  for (let index = 0; index < view.getUint16(4); index++) {
    const offset = 12 + index * 16;
    const tag = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const start = view.getUint32(offset + 8);
    const length = view.getUint32(offset + 12);
    if (start + length > bytes.length) throw new Error(`Invalid TTF table ${tag}`);
    entries.set(tag, start);
  }
  return entries;
}

export function fontTableNames(bytes: Uint8Array): readonly string[] {
  return [...tables(bytes).keys()];
}

export function fontCodePoints(bytes: Uint8Array): ReadonlySet<number> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cmap = tables(bytes).get('cmap');
  if (cmap === undefined) throw new Error('TTF has no cmap');
  const u16 = (offset: number): number => view.getUint16(offset);
  const u32 = (offset: number): number => view.getUint32(offset);
  const points = new Set<number>();
  for (let index = 0; index < u16(cmap + 2); index++) {
    const record = cmap + 4 + index * 8;
    const platform = u16(record);
    const encoding = u16(record + 2);
    if (platform !== 0 && !(platform === 3 && (encoding === 1 || encoding === 10))) continue;
    const table = cmap + u32(record + 4);
    const format = u16(table);
    if (format === 12) {
      for (let group = 0; group < u32(table + 12); group++) {
        const start = table + 16 + group * 12;
        const first = u32(start);
        const last = u32(start + 4);
        const firstGlyph = u32(start + 8);
        if (last > 0x10ffff || last < first) throw new Error('Invalid cmap group');
        for (let point = first; point <= last; point++) {
          if (firstGlyph + point - first !== 0) points.add(point);
        }
      }
    } else if (format === 4) {
      const segments = u16(table + 6) / 2;
      const ends = table + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const ranges = deltas + segments * 2;
      for (let segment = 0; segment < segments; segment++) {
        const first = u16(starts + segment * 2);
        const last = u16(ends + segment * 2);
        const delta = view.getInt16(deltas + segment * 2);
        const address = ranges + segment * 2;
        const range = u16(address);
        for (let point = first; point <= last && point < 0xffff; point++) {
          const raw = range === 0 ? point : u16(address + range + (point - first) * 2);
          const glyph = range !== 0 && raw === 0 ? 0 : (raw + delta) & 0xffff;
          if (glyph !== 0) points.add(point);
        }
      }
    }
  }
  if (points.size === 0) throw new Error('TTF has no supported Unicode cmap');
  return points;
}
```

Create `src/features/inspector/report/pdfFonts.test.ts`:

```ts
// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { jsPDF } from 'jspdf';
import { describe, expect, it } from 'vitest';
import assets from '@/assets/fonts/pdf-fonts.json';
import { PDF_FONT_NAMES, registerPdfFonts, setPdfTextFont, wrapPdfText } from './pdfFonts';
import { fontCodePoints, fontTableNames } from './testFontCmap';

const fontsRoot = new URL('../../../assets/fonts/', import.meta.url);
const licencesRoot = new URL('../../../../public/licenses/', import.meta.url);
const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

describe('locally bundled PDF fonts', () => {
  it('pins static TTFs and redistributes byte-identical OFL licences', () => {
    expect(assets.map((asset) => asset.family)).toEqual([...PDF_FONT_NAMES]);
    for (const asset of assets) {
      const bytes = readFileSync(new URL(asset.file, fontsRoot));
      const licence = readFileSync(new URL(asset.license, fontsRoot));
      expect(digest(bytes), asset.file).toBe(asset.sha256);
      expect(fontTableNames(bytes)).not.toContain('fvar');
      expect(fontTableNames(bytes)).toContain('glyf');
      expect(digest(licence), asset.license).toBe(asset.licenseSha256);
      expect(licence.toString('utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1');
      expect(readFileSync(new URL(asset.license, licencesRoot))).toEqual(licence);
    }
  });

  it('checks real cmap coverage for all printable ASCII and the report punctuation', () => {
    const doc = new jsPDF({ unit: 'pt' });
    registerPdfFonts(doc);
    const sample = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32)).join('')
      + ' Café Noël Ångström naïve déjà vu – — ‘ ’ “ ” • …';
    for (const family of PDF_FONT_NAMES) {
      const asset = assets.find((candidate) => candidate.family === family);
      if (asset === undefined) throw new Error(`Missing asset ${family}`);
      const points = fontCodePoints(readFileSync(new URL(asset.file, fontsRoot)));
      for (const char of sample) expect(points.has(char.codePointAt(0) ?? -1), `${family}: ${char}`).toBe(true);
      expect(setPdfTextFont(doc, family, sample, 10)).toBe(sample);
      expect(wrapPdfText(doc, family, sample, 10, 160).join('')).not.toBe('');
    }
    for (const family of ['DMSans', 'SpaceGrotesk']) {
      const asset = assets.find((candidate) => candidate.family === family);
      if (asset === undefined) throw new Error(`Missing asset ${family}`);
      expect(fontCodePoints(readFileSync(new URL(asset.file, fontsRoot))).has(0x2713)).toBe(false);
    }
  });

  it.each([
    ['中', 'U+4E2D'], ['🙂', 'U+1F642'], ['e\u0301', 'U+0301'],
    ['\u00a0', 'U+00A0'], ['\t', 'U+0009'], ['✓', 'U+2713'],
  ])('rejects %s with a useful Markdown fallback message', (text, codePoint) => {
    const doc = new jsPDF();
    registerPdfFonts(doc);
    expect(() => setPdfTextFont(doc, 'DMSans', text, 10)).toThrow(codePoint);
    expect(() => setPdfTextFont(doc, 'DMSans', text, 10)).toThrow('Export Markdown');
  });

  it('preserves text through wrapping and treats CR/CRLF as layout line breaks', () => {
    const doc = new jsPDF({ unit: 'pt' });
    registerPdfFonts(doc);
    const text = `${'long-unbroken-file-name-'.repeat(60)}END.js\r\nsecond line\rthird line`;
    const lines = wrapPdfText(doc, 'JetBrainsMono', text, 10, 130);
    expect(lines.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
    for (const line of lines) expect(doc.getTextWidth(line)).toBeLessThanOrEqual(130.1);
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npm exec -- vitest run src/features/inspector/report/pdfFonts.test.ts`

Expected: exit 1 with unresolved `pdf-fonts.json`/`pdfFonts` import on the planning baseline. The static JetBrains TTF and a runtime unsupported-glyph check do not yet exist.

- [ ] **Step 3: Implement the minimum fix**

Create `src/assets/fonts/pdf-fonts.json` with these complete contents. Font/licence hashes were measured from the existing local Phase 00/20 assets. The pinned JetBrains 0.4.1 mirror's file metadata independently matches those SHA-256 values; this reuses local bytes for verification without another font download or package installation.

```json
[
  {
    "family": "DMSans",
    "file": "DMSans_400Regular.ttf",
    "sha256": "20ccb90498d8ca511bb0be31a74eccd5f29fbe1161852ef72781b703929e98ec",
    "license": "OFL-DMSans.txt",
    "licenseSha256": "9af36190332437f5ecd09974de43c1f7c77a310a996cdd8ceb25628b458840e1",
    "source": "Existing Phase 00 asset; @expo-google-fonts/dm-sans 0.4.2"
  },
  {
    "family": "SpaceGrotesk",
    "file": "SpaceGrotesk_700Bold.ttf",
    "sha256": "8fb63865c6afd083723dc1775548306b7751f20397bebcb79646032c598c81b9",
    "license": "OFL-SpaceGrotesk.txt",
    "licenseSha256": "564ce565c371c5e5bbf286006565a7c9aa55a9f56e7ca58d56e05d649dd61a72",
    "source": "Existing Phase 00 asset; @expo-google-fonts/space-grotesk 0.4.1"
  },
  {
    "family": "JetBrainsMono",
    "file": "JetBrainsMono_400Regular.ttf",
    "sha256": "b6b1ff4ddefe36d7f2a6174e1d001cab374e594519ee9049af028d577b64c5f5",
    "license": "OFL-JetBrainsMono-TTF.txt",
    "licenseSha256": "b2fe5e8987594e9ffd1d2ca52a2f5d73eb8335243893c5d6254b5ad69269591d",
    "source": "Existing Phase 20 asset; immutable npm version @expo-google-fonts/jetbrains-mono 0.4.1",
    "download": "https://cdn.jsdelivr.net/npm/@expo-google-fonts/jetbrains-mono@0.4.1/400Regular/JetBrainsMono_400Regular.ttf",
    "licenseDownload": "https://cdn.jsdelivr.net/npm/@expo-google-fonts/jetbrains-mono@0.4.1/LICENSE_FONT"
  }
]
```

Create `scripts/acquire-report-fonts.mjs` with these complete contents. It verifies hashes before creating assets, refuses mismatching existing files and supports offline verification without a package installation or inline interpreter:

```javascript
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const offline = process.argv.includes('--offline');
const assets = JSON.parse(await readFile(new URL('src/assets/fonts/pdf-fonts.json', root), 'utf8'));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function ensure(relative, expected, supply) {
  const target = new URL(relative, root);
  let fresh = false;
  let bytes;
  try {
    bytes = await readFile(target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    fresh = true;
    bytes = await supply();
  }
  if (digest(bytes) !== expected) throw new Error(`SHA-256 mismatch: ${relative}`);
  if (fresh) {
    await mkdir(new URL('./', target), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx' });
  }
  return bytes;
}

async function download(url, name) {
  if (offline) throw new Error(`Offline acquisition requires an existing verified ${name}`);
  if (typeof url !== 'string') throw new Error(`Missing existing bundled asset: ${name}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font acquisition HTTP ${String(response.status)}: ${name}`);
  return Buffer.from(await response.arrayBuffer());
}

for (const asset of assets) {
  await ensure(`src/assets/fonts/${asset.file}`, asset.sha256,
    () => download(asset.download, asset.file));
  const license = await ensure(`src/assets/fonts/${asset.license}`, asset.licenseSha256,
    () => download(asset.licenseDownload, asset.license));
  await ensure(`public/licenses/${asset.license}`, asset.licenseSha256, () => Promise.resolve(license));
  console.log(`${asset.family}: verified static font and published licence`);
}
```

Run: `node scripts/acquire-report-fonts.mjs`

Expected: three `verified static font and published licence` lines. The JetBrains font is 114,904 bytes and its licence 4,399 bytes, unmodified from the pinned mirror. An already-verified local copy skips every download branch.

Run: `node scripts/acquire-report-fonts.mjs --offline`

Expected: the same three verification lines with no network access; missing or mismatching local bytes fail rather than being substituted.

Create `src/assets/fonts/PDF-FONTS.md`:

```markdown
# PDF fonts and supported text

`pdf-fonts.json` owns each asset's source, immutable download URL where needed,
SHA-256 and OFL licence. DM Sans 400 is report body text, Space Grotesk 700 is
headings, and JetBrains Mono 400 is paths and filenames. All are static TTFs.
The licences are copied verbatim to `public/licenses/` and shipped in `dist`.
No runtime font or configuration-resource download occurs.

## Supported repertoire

PDF accepts printable ASCII U+0020–U+007E; precomposed U+00A1–U+017F except
U+00AD; and U+2013, U+2014, U+2018, U+2019, U+201C, U+201D, U+2022 and U+2026.
A character must also have a nonzero glyph in the actual face used for that
write. Thus the supported set is the intersection with that face's cmap,
not a promise that every point in those ranges exists in all three fonts.
LF is a layout break; CR and CRLF are converted to LF. Other controls, tabs,
nonbreaking space U+00A0 and combining marks are rejected rather than removed.

This is left-to-right precomposed Latin text and the listed punctuation.
There is no general script shaping, bidirectional layout, emoji or CJK
fallback. A missing/out-of-repertoire character throws `PDF cannot render
U+XXXX in <font>. Export Markdown to preserve this text.` before native save.
Markdown remains available and retains the original text under its documented
escaping/newline rules. The status checkmark is drawn as a vector path; a
checkmark supplied in configuration text is subject to the text repertoire.

## Release acceptance

Automated tests check actual TTF cmaps, every rendered character, embedded
ToUnicode mappings, complete extracted text and physical-row bounds.
Task 10 still verifies selection/copying in a PDF reader and the intended
release's real sample names/content. If that required sample needs an
unsupported character, the PDF release gate remains open until the owner
accepts the explicitly documented repertoire or specifies additional support.
Do not claim universal Unicode support or treat a rejected required sample as
a passing PDF release gate.
```

Create `src/features/inspector/report/pdfFonts.ts`:

```ts
import type { jsPDF } from 'jspdf';
import dmSans from '@/assets/fonts/DMSans_400Regular.ttf?inline';
import spaceGrotesk from '@/assets/fonts/SpaceGrotesk_700Bold.ttf?inline';
import jetBrainsMono from '@/assets/fonts/JetBrainsMono_400Regular.ttf?inline';

export const PDF_FONT_NAMES = ['DMSans', 'SpaceGrotesk', 'JetBrainsMono'] as const;
export type PdfFont = (typeof PDF_FONT_NAMES)[number];
const DATA: Readonly<Record<PdfFont, string>> = {
  DMSans: dmSans, SpaceGrotesk: spaceGrotesk, JetBrainsMono: jetBrainsMono,
};
const PUNCTUATION = new Set([0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026]);
type GlyphMap = { characterToGlyph(point: number): number };

function glyphMap(doc: jsPDF): GlyphMap {
  const metadata: unknown = doc.getFont().metadata;
  if (typeof metadata !== 'object' || metadata === null
      || !('characterToGlyph' in metadata) || typeof metadata.characterToGlyph !== 'function') {
    throw new Error('PDF font could not be embedded. Export Markdown and report the bundled-font error.');
  }
  return metadata as GlyphMap;
}

export function registerPdfFonts(doc: jsPDF): void {
  for (const family of PDF_FONT_NAMES) {
    const data = DATA[family];
    const comma = data.indexOf(',');
    if (!data.startsWith('data:') || comma < 0 || !data.slice(0, comma).endsWith(';base64')) {
      throw new Error(`PDF font ${family} is not bundled inline. Export Markdown.`);
    }
    const filename = `${family}.ttf`;
    doc.addFileToVFS(filename, data.slice(comma + 1));
    doc.addFont(filename, family, 'normal');
    doc.setFont(family, 'normal');
    if (doc.getFont().fontName !== family) throw new Error(`PDF font ${family} was not registered.`);
    glyphMap(doc);
  }
}

export function setPdfTextFont(doc: jsPDF, family: PdfFont, text: string, size: number): string {
  doc.setFont(family, 'normal').setFontSize(size);
  const metadata = glyphMap(doc);
  const normalized = text.replace(/\r\n?/g, '\n');
  for (const char of normalized) {
    const point = char.codePointAt(0) ?? 0;
    if (point === 10) continue;
    const allowed = (point >= 0x20 && point <= 0x7e)
      || (point >= 0xa1 && point <= 0x17f && point !== 0xad) || PUNCTUATION.has(point);
    const glyph = metadata.characterToGlyph(point);
    if (!allowed || !Number.isInteger(glyph) || glyph <= 0) {
      const code = point.toString(16).toUpperCase().padStart(4, '0');
      throw new Error(`PDF cannot render U+${code} in ${family}. Export Markdown to preserve this text.`);
    }
  }
  return normalized;
}

export function wrapPdfText(
  doc: jsPDF, family: PdfFont, text: string, size: number, width: number,
): string[] {
  if (!Number.isFinite(width) || width <= 0) throw new Error('Invalid PDF text width. Export Markdown.');
  const normalized = setPdfTextFont(doc, family, text, size);
  const wrapped: unknown = doc.splitTextToSize(normalized, width);
  if (!Array.isArray(wrapped)) throw new Error('Could not wrap PDF text. Export Markdown.');
  return wrapped.map((line: unknown) => {
    if (typeof line !== 'string' || doc.getTextWidth(line) > width + 0.1) {
      throw new Error('PDF text does not fit its column. Export Markdown.');
    }
    return line;
  });
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm exec -- vitest run src/features/inspector/report/pdfFonts.test.ts`

Expected: nine tests pass; all three static fonts/licences match their pins, supported fixture text has actual glyphs, unsupported characters throw useful errors and long paths survive wrapping.

Run: `npm exec -- vitest run src/features/inspector/report`

Expected: existing model/Markdown tests and Task 7a privacy tests pass.

Run: `npm exec -- eslint src/features/inspector/report/pdfFonts.ts src/features/inspector/report/pdfFonts.test.ts src/features/inspector/report/testFontCmap.ts --max-warnings=0`

Expected: exit 0. No package/lockfile diff is required.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add scripts/acquire-report-fonts.mjs src/assets/fonts/pdf-fonts.json src/assets/fonts/JetBrainsMono_400Regular.ttf src/assets/fonts/OFL-JetBrainsMono-TTF.txt src/assets/fonts/PDF-FONTS.md public/licenses/OFL-DMSans.txt public/licenses/OFL-SpaceGrotesk.txt public/licenses/OFL-JetBrainsMono-TTF.txt src/features/inspector/report/pdfFonts.ts src/features/inspector/report/pdfFonts.test.ts src/features/inspector/report/testFontCmap.ts
git commit --only -m "feat(inspector): bundle verified PDF fonts and validate text coverage" -- scripts/acquire-report-fonts.mjs src/assets/fonts/pdf-fonts.json src/assets/fonts/JetBrainsMono_400Regular.ttf src/assets/fonts/OFL-JetBrainsMono-TTF.txt src/assets/fonts/PDF-FONTS.md public/licenses/OFL-DMSans.txt public/licenses/OFL-SpaceGrotesk.txt public/licenses/OFL-JetBrainsMono-TTF.txt src/features/inspector/report/pdfFonts.ts src/features/inspector/report/pdfFonts.test.ts src/features/inspector/report/testFontCmap.ts
```

### Task 7c: Serialize complete vector PDFs with provable text and pagination

**Owns:** Both PDF scopes, Phase 20/A8 drawing, continuation rows, actual embedded text and renderer evidence. Depends on 7a/7b.

**Files:**

- Create: `src/features/inspector/report/reportStressFixtures.ts` — complete long/hostile report fixture.
- Create: `src/features/inspector/report/pdfTextEvidence.ts` — test-only extraction of this renderer's uncompressed PDF/ToUnicode output.
- Create: `src/features/inspector/report/renderPdf.test.ts` — real jsPDF/AutoTable integration, source-content, glyph and physical-page assertions.
- Create: `src/features/inspector/report/pdfTable.test.ts` — independent per-logical-cell reconstruction of continuation rows.
- Create: `src/features/inspector/report/pdfDrawing.ts` — authoritative report palette and vector icons/rings.
- Create: `src/features/inspector/report/pdfTable.ts` — fixed-size wrapping and labelled oversized logical entries.
- Modify: `src/features/inspector/report/renderPdf.ts:1-5` — replace the complete five-line stub.
- Signal: `src/features/inspector/report/renderPdf.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/inspector/report/reportStressFixtures.ts`:

```ts
import type { CheckStatus, FileResult, Finding, SiteResult } from '@/types/inspector';
import { reportFile, reportResult } from './reportFixtures';

export const PDF_SNAPSHOT_SENTINEL = 'SNAPSHOT_ONLY_7C_779';
export const PDF_LONG_TOKENS = Array.from({ length: 600 }, (_, index) =>
  `WORD${String(index).padStart(4, '0')}Z`);
export const PDF_HOSTILE_NAME = `file | * <script> [x](y)\n#Café-${'long-name-'.repeat(35)}END.js`;

export function reportStressResult(count = 50): SiteResult {
  const result = reportResult();
  result.facts.connection = { ...result.facts.connection,
    name: 'Private Environment', url: 'https://private.crm.example.test' };
  result.facts.site = { ...result.facts.site,
    name: 'Private Site', domain: 'https://private.portal.example.test' };
  const identity = 'Private Environment / private.crm.example.test / Private Site / private.portal.example.test';
  result.banners = [`Banner | * <script> [x](y)\n#Café / ${identity} / outside.example.test`];
  result.files = Array.from({ length: count }, (_, index): FileResult => {
    const id = `file-${String(index).padStart(2, '0')}`;
    const states: readonly [CheckStatus, CheckStatus, CheckStatus] = index === 2
      ? ['not-scanned', 'not-scanned', 'not-scanned']
      : ['configured', 'needs-review', 'reviewed'];
    const file = reportFile(id, index === 0 ? PDF_HOSTILE_NAME : `${id}-Café.js`, states);
    function finding(base: Finding): Finding {
      const key = `${id}-${base.check}`;
      const long = index === 0 && base.check !== 'webRole'
        ? ` ${PDF_LONG_TOKENS.join(' ')} END_OF_REASON` : '';
      return { ...base,
        summary: `SUMMARY_${key} ${identity}`,
        reasons: [{ text: `REASON_${key} ${identity}${long}`, readFailure: false }],
        guidance: `GUIDANCE_${key} <script> [x](y)`,
        detail: [`DETAIL_${key} | * <script> [x](y)\n#Café`],
        questions: [`QUEST_${key} Is this intended?`],
      };
    }
    return { ...file, active: index % 2 === 0,
      findings: [finding(file.findings[0]), finding(file.findings[1]), finding(file.findings[2])],
      snapshot: {
        roles: [`ROLE_${id} ${identity}`, ...(index === 0 ? [PDF_SNAPSHOT_SENTINEL] : [])],
        tables: [`TABLE_${id} account / Global / Read / Members`],
        outbound: [`OUTBOUND_${id} ${identity} / outside.example.test`],
      },
    };
  });
  return result;
}
```

Create `src/features/inspector/report/pdfTextEvidence.ts`. This is deliberately a strict test reader for the emitted jsPDF syntax, not a general PDF parser. It fails on missing CMaps, unresolved glyphs or unexpected text encoding instead of treating absent text as success.

```ts
// Test-only: extract the renderer's uncompressed Identity-H text from actual PDF bytes.
import { Buffer } from 'node:buffer';

function required(value: string | undefined, message: string): string {
  if (value === undefined) throw new Error(message);
  return value;
}

function stream(body: string): string {
  const start = body.indexOf('stream');
  if (/\/Filter\b/.test(body.slice(0, start))) throw new Error('Unexpected compressed evidence stream');
  return required(/stream\r?\n([\s\S]*?)\r?\nendstream/.exec(body)?.[1], 'Missing PDF stream');
}

function unicode(hex: string): string {
  if (hex.length % 4 !== 0) throw new Error('Invalid UTF-16 CMap value');
  let text = '';
  for (let index = 0; index < hex.length; index += 4) {
    text += String.fromCharCode(Number.parseInt(hex.slice(index, index + 4), 16));
  }
  return text;
}

export function extractPdfPages(bytes: Uint8Array): readonly string[] {
  const raw = Buffer.from(bytes).toString('latin1');
  if (!raw.startsWith('%PDF-1.')) throw new Error('Not PDF bytes');
  const objects = new Map<number, string>();
  for (const match of raw.matchAll(/(?:^|\n)(\d+) 0 obj\r?\n([\s\S]*?)\r?\nendobj/g)) {
    objects.set(Number(match[1]), required(match[2], 'Missing PDF object body'));
  }
  const body = (id: number): string => required(objects.get(id), `Missing PDF object ${String(id)}`);
  const fontMaps = new Map<string, ReadonlyMap<string, string>>();
  for (const resource of objects.values()) {
    const fonts = /\/Font\s*<<([\s\S]*?)>>/.exec(resource)?.[1];
    if (fonts === undefined) continue;
    for (const match of fonts.matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
      const name = required(match[1], 'Missing font resource name');
      const font = body(Number(match[2]));
      const reference = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(font)?.[1];
      if (reference === undefined) continue;
      const map = new Map<string, string>();
      for (const block of stream(body(Number(reference))).matchAll(/\d+\s+beginbfchar\s+([\s\S]*?)endbfchar/g)) {
        for (const pair of required(block[1], 'Missing CMap block').matchAll(/<([\da-fA-F]+)>\s*<([\da-fA-F]+)>/g)) {
          map.set(required(pair[1], 'Missing source glyph').toLowerCase(),
            unicode(required(pair[2], 'Missing Unicode value')));
        }
      }
      if (map.size === 0) throw new Error(`Empty ToUnicode map for ${name}`);
      fontMaps.set(name, map);
    }
  }
  const pages = [...objects.entries()].filter(([, value]) => /\/Type\s*\/Page\b/.test(value))
    .toSorted(([a], [b]) => a - b);
  if (pages.length === 0) throw new Error('No PDF pages');
  return pages.map(([, page]) => {
    const contentId = required(/\/Contents\s+(\d+)\s+0\s+R/.exec(page)?.[1], 'Missing page content');
    const writes: string[] = [];
    for (const block of stream(body(Number(contentId))).matchAll(/\bBT\s+([\s\S]*?)\bET\b/g)) {
      const commands = required(block[1], 'Missing text commands');
      const font = required(/\/(F\d+)\s+[-\d.]+\s+Tf/.exec(commands)?.[1], 'Missing text font');
      const map = fontMaps.get(font);
      if (map === undefined) throw new Error(`No selectable-text CMap for ${font}`);
      let found = false;
      for (const text of commands.matchAll(/<([\da-fA-F]*)>\s*Tj|\[([^\]]*)\]\s*TJ/g)) {
        const sequences = text[1] === undefined
          ? [...required(text[2], 'Missing TJ array').matchAll(/<([\da-fA-F]*)>/g)]
            .map((part) => required(part[1], 'Missing TJ glyphs'))
          : [text[1]];
        for (const hex of sequences) {
          if (hex.length % 4 !== 0) throw new Error('Invalid Identity-H glyph encoding');
          let decoded = '';
          for (let index = 0; index < hex.length; index += 4) {
            const glyph = hex.slice(index, index + 4).toLowerCase();
            decoded += required(map.get(glyph), `Unmapped selectable glyph ${font}:${glyph}`);
          }
          writes.push(decoded);
          found = true;
        }
      }
      if (!found) throw new Error('Expected selectable hexadecimal PDF text');
    }
    return writes.join('\n');
  });
}
```

Create `src/features/inspector/report/renderPdf.test.ts`:

```ts
// @vitest-environment node
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { jsPDF, jsPDFOptions } from 'jspdf';
import type * as JsPdfModule from 'jspdf';
import type * as AutoTableModule from 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import { afterEach, describe, expect, it, vi } from 'vitest';
import assets from '@/assets/fonts/pdf-fonts.json';
import { buildReportModel } from './buildReportModel';
import { EXPORTED_AT, REPORT_OPTIONS, reportResult } from './reportFixtures';
import { PDF_HOSTILE_NAME, PDF_LONG_TOKENS, PDF_SNAPSHOT_SENTINEL, reportStressResult } from './reportStressFixtures';
import { extractPdfPages } from './pdfTextEvidence';
import { fontCodePoints } from './testFontCmap';
import { renderMarkdown } from './renderMarkdown';
import { renderPdf } from './renderPdf';
import { reportFileName } from './reportFileName';

type Write = { font: string; text: string; x: number; y: number; width: number; size: number; page: number };
type Cell = { row: number; column: number; page: number; head: boolean;
  split: boolean; top: number; bottom: number; text: string };
type Evidence = { doc: jsPDF; writes: Write[]; cells: Cell[];
  fonts: unknown[][]; properties: unknown[][]; curves: unknown[][];
  lines: unknown[][]; colors: unknown[][]; html: unknown[][]; images: unknown[][] };
const { evidence } = vi.hoisted(() => ({ evidence: new Array<Evidence>() }));

function observe(doc: jsPDF): void {
  const writes: Write[] = [];
  const text = doc.text.bind(doc);
  vi.spyOn(doc, 'text').mockImplementation((value, x, y, options, transform) => {
    const lines = Array.isArray(value) ? value : value.split('\n');
    const width = Math.max(0, ...lines.map((line) => doc.getTextWidth(line)));
    const left = options?.align === 'right' ? x - width : options?.align === 'center' ? x - width / 2 : x;
    writes.push({ font: doc.getFont().fontName, text: Array.isArray(value) ? value.join('\n') : value,
      x: left, y, width, size: doc.getFontSize(), page: doc.getCurrentPageInfo().pageNumber });
    return text(value, x, y, options, transform);
  });
  evidence.push({ doc, writes, cells: [],
    fonts: vi.spyOn(doc, 'addFileToVFS').mock.calls,
    properties: vi.spyOn(doc, 'setProperties').mock.calls,
    curves: vi.spyOn(doc, 'curveTo').mock.calls,
    lines: vi.spyOn(doc, 'lineTo').mock.calls,
    colors: vi.spyOn(doc, 'setDrawColor').mock.calls,
    html: vi.spyOn(doc, 'html').mock.calls,
    images: vi.spyOn(doc, 'addImage').mock.calls,
  });
}

vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof JsPdfModule>();
  return { ...actual, jsPDF: class extends actual.jsPDF {
    constructor(options?: jsPDFOptions) { super(options); observe(this); }
  } };
});

vi.mock('jspdf-autotable', async (importOriginal) => {
  const actual = await importOriginal<typeof AutoTableModule>();
  return { ...actual, default(doc: jsPDF, options: UserOptions): void {
    const record = evidence.find((entry) => entry.doc === doc);
    if (record === undefined) throw new Error('Unobserved real PDF');
    actual.default(doc, { ...options, didDrawCell(data) {
      record.cells.push({ row: data.row.index, column: data.column.index,
        page: doc.getCurrentPageInfo().pageNumber, head: data.section === 'head',
        split: data.row.spansMultiplePages, top: data.cell.y,
        bottom: data.cell.y + data.cell.height, text: data.cell.text.join('\n') });
      options.didDrawCell?.(data);
    } });
  } };
});

const compact = (text: string): string => text.replace(/\s/g, '');
const coverage = new Map(assets.map((asset) => [asset.family,
  fontCodePoints(readFileSync(new URL(`../../../assets/fonts/${asset.file}`, import.meta.url)))]));

function latest(): Evidence {
  const record = evidence.at(-1);
  if (record === undefined) throw new Error('No real PDF created');
  return record;
}

function proveSerializedText(bytes: Uint8Array): string {
  const record = latest();
  const pages = extractPdfPages(bytes);
  expect(pages).toHaveLength(record.doc.getNumberOfPages());
  for (const write of record.writes) {
    expect(compact(pages[write.page - 1] ?? ''), write.text).toContain(compact(write.text));
    const points = coverage.get(write.font);
    expect(points, write.font).toBeDefined();
    for (const char of write.text) {
      if (char === '\n' || char === '\r') continue;
      expect(points?.has(char.codePointAt(0) ?? -1), `${write.font}: ${char}`).toBe(true);
    }
    expect(write.y).toBeGreaterThanOrEqual(36);
    expect(write.x).toBeGreaterThanOrEqual(35);
    expect(write.x + write.width).toBeLessThanOrEqual(record.doc.internal.pageSize.getWidth() - 35);
    expect(write.y + (write.text.split('\n').length - 1) * write.size * 1.15)
      .toBeLessThanOrEqual(record.doc.internal.pageSize.getHeight() - 35);
  }
  for (const cell of record.cells) {
    expect(cell.split).toBe(false);
    expect(cell.top).toBeGreaterThanOrEqual(36);
    expect(cell.bottom).toBeLessThanOrEqual(record.doc.internal.pageSize.getHeight() - 35);
  }
  const rows = new Map<number, Set<number>>();
  for (const cell of record.cells.filter((cell) => !cell.head)) {
    const pagesForRow = rows.get(cell.row) ?? new Set<number>();
    pagesForRow.add(cell.page);
    rows.set(cell.row, pagesForRow);
  }
  for (const rowPages of rows.values()) expect(rowPages.size).toBe(1);
  return pages.join('\n');
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); evidence.length = 0; });

describe('real Inspector vector PDF', () => {
  it.each(['file', 'site'] as const)('serializes the complete long hostile %s model', (scope) => {
    const request = vi.fn(() => { throw new Error('Unexpected report resource request'); });
    vi.stubGlobal('fetch', request);
    vi.stubGlobal('XMLHttpRequest', request);
    const result = reportStressResult();
    const model = buildReportModel(result, {
      ...REPORT_OPTIONS, scope, fileId: 'file-00', format: 'pdf',
    }, EXPORTED_AT);
    const bytes = renderPdf(model);
    const text = compact(proveSerializedText(bytes));
    const record = latest();
    expect(Buffer.from(bytes.subarray(0, 8)).toString('ascii')).toMatch(/^%PDF-1\./);
    expect(Buffer.from(bytes).toString('latin1').match(/\/FontFile2\b/g)).toHaveLength(3);
    expect(record.fonts).toHaveLength(3);
    expect(record.doc.internal.pageSize.getWidth()).toBeCloseTo(841.89, 1);
    expect(record.doc.internal.pageSize.getHeight()).toBeCloseTo(595.28, 1);
    expect(record.curves.length).toBeGreaterThan(0);
    expect(record.lines.length).toBeGreaterThan(0);
    expect(record.colors).toContainEqual(['#1f6fd1']);
    expect(record.colors).toContainEqual(['#b05408']);
    expect(record.colors).toContainEqual(['#1e6dcd']);
    expect(record.html).toHaveLength(0);
    expect(record.images).toHaveLength(0);
    expect(request).not.toHaveBeenCalled();
    expect(record.doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(text).toContain('continued');
    expect(text).toContain(compact(PDF_HOSTILE_NAME));
    expect(text).toContain('<script>');
    expect(text).toContain('[x](y)');
    for (const token of PDF_LONG_TOKENS) expect(text).toContain(token);
    expect(text).toContain('END_OF_REASON');
    const tablePages = new Set(record.cells.filter((cell) => !cell.head).map((cell) => cell.page));
    expect(tablePages.size).toBeGreaterThan(1);
    for (const page of tablePages) {
      const headings = record.cells.filter((cell) => cell.head && cell.page === page).map((cell) => compact(cell.text));
      expect(headings).toEqual(scope === 'file'
        ? ['Check', 'Status', 'Finding']
        : ['', 'File', 'Addressed', 'Webrole', 'Tablepermissions', 'Outboundnetworking', 'Result']);
    }
    for (const line of model.lines) expect(text).toContain(compact(line.text));
    for (const banner of model.banners) expect(text).toContain(compact(banner));
    for (const row of model.rows) {
      expect(text).toContain(compact(row.name));
      expect(text).toContain(compact(row.summary));
      expect(text).toContain(row.active ? 'Active' : 'Inactive');
      for (const check of row.checks) {
        for (const value of [check.finding, check.guidance, ...check.reasons, ...check.detail, ...check.questions]) {
          expect(text).toContain(compact(value));
        }
        expect(text).toContain(compact(check.statusText));
      }
    }
    for (const snapshot of model.snapshot ?? []) {
      for (const value of [...snapshot.roles, ...snapshot.tables, ...snapshot.outbound]) expect(text).toContain(compact(value));
    }
    for (const footer of model.footer) expect(text).toContain(compact(footer));
    const directory = process.env.INSPECTOR_PDF_EVIDENCE_DIR;
    if (directory !== undefined) {
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, `${scope}-stress.pdf`), bytes);
      writeFileSync(join(directory, `${scope}-stress.md`), renderMarkdown(model));
    }
  }, 60_000);

  it.each(['file', 'site'] as const)('honours every include/redact combination for %s', (scope) => {
    for (const snapshot of [false, true]) for (const questions of [false, true]) for (const redact of [false, true]) {
      const result = reportResult();
      result.banners = ['Contoso / contoso.crm.dynamics.com / Customer portal / customer.powerappsportals.com / outside.test'];
      const first = result.files[0];
      if (first === undefined) throw new Error('Missing fixture');
      result.files = [{ ...first, snapshot: { ...first.snapshot, roles: [PDF_SNAPSHOT_SENTINEL] } }, ...result.files.slice(1)];
      const model = buildReportModel(result, { ...REPORT_OPTIONS, scope, snapshot, questions, redact, format: 'pdf' }, EXPORTED_AT);
      const bytes = renderPdf(model);
      const text = proveSerializedText(bytes);
      expect(text.includes(PDF_SNAPSHOT_SENTINEL)).toBe(snapshot);
      expect(text.split(PDF_SNAPSHOT_SENTINEL)).toHaveLength(snapshot ? 2 : 1);
      expect(text.includes('[ ]')).toBe(questions);
      expect(text).toContain('Global Read on account via Members.');
      expect(text).toContain('outside.test');
      expect(text).toContain('customer-summary.js');
      expect(latest().properties).toContainEqual([{ title: model.metadataTitle }]);
      if (redact) {
        for (const identifier of ['Contoso', 'contoso.crm.dynamics.com', 'Customer portal', 'customer.powerappsportals.com']) {
          expect(compact(text)).not.toContain(compact(identifier));
        }
        if (scope === 'site') expect(Buffer.from(bytes).toString('latin1')).toContain('/Title (Site readiness report: [site])');
      }
    }
  }, 60_000);

  it('retains full Not-scanned content in a file report', () => {
    const model = buildReportModel(reportResult(), {
      ...REPORT_OPTIONS, fileId: 'pending', format: 'pdf',
    }, EXPORTED_AT);
    const text = proveSerializedText(renderPdf(model));
    expect(text).toContain('Not scanned');
    expect(text).toContain('Not read before the connection was lost');
    expect(text).toContain('outbound detail.');
  });

  it('redacts file metadata with identifying site/URLs while preserving the source filename', () => {
    const result = reportResult();
    result.facts.connection = { ...result.facts.connection,
      name: 'Private Environment', url: 'https://private.crm.example.test' };
    result.facts.site = { ...result.facts.site,
      name: 'Private Site', domain: 'https://private.portal.example.test' };
    const file = result.files[0];
    if (file === undefined) throw new Error('Missing fixture file');
    const name = 'private.crm.example.test.js';
    result.files = [{ ...file, name }];
    const identities = [result.facts.connection.name, result.facts.connection.url,
      result.facts.site.name, result.facts.site.domain];
    result.banners = identities;
    const model = buildReportModel(result, { ...REPORT_OPTIONS, format: 'pdf', redact: true }, EXPORTED_AT);
    expect(model.title).toBe(`Server logic readiness: ${name}`);
    expect(model.metadataTitle).toBe(`[site] · ${name}-readiness`);
    expect(reportFileName(model)).toBe('private.crm.example.test-readiness.pdf');
    const bytes = renderPdf(model);
    expect(latest().properties).toContainEqual([{ title: model.metadataTitle }]);
    expect(Buffer.from(bytes).toString('latin1'))
      .toContain(`/Title ([site] · ${name}-readiness)`);
    for (const identity of identities) expect(model.metadataTitle).not.toContain(identity);
    expect(proveSerializedText(bytes)).toContain(name);
  });

  it('fails before producing PDF bytes for unsupported text while Markdown remains usable', () => {
    const result = reportResult();
    result.banners = ['Required label 中'];
    const model = buildReportModel(result, { ...REPORT_OPTIONS, format: 'pdf' }, EXPORTED_AT);
    expect(() => renderPdf(model)).toThrow('U+4E2D');
    expect(() => renderPdf(model)).toThrow('Export Markdown');
    expect(renderMarkdown(model)).toContain('Required label 中');
  });
});
```

Create `src/features/inspector/report/pdfTable.test.ts`:

```ts
// @vitest-environment node
import { jsPDF } from 'jspdf';
import { describe, expect, it } from 'vitest';
import { registerPdfFonts } from './pdfFonts';
import { PDF_TABLE, preparePdfRows } from './pdfTable';
import type { PdfCell } from './pdfTable';

describe('PDF continuation rows preserve each original cell', () => {
  it('reconstructs all simultaneous long cells and caps every physical row', () => {
    const doc = new jsPDF({ unit: 'pt' });
    registerPdfFonts(doc);
    const rows: readonly (readonly PdfCell[])[] = [
      [{ text: 'Short check' }, { text: 'Reviewed' }, { text: 'Short reason' }],
      [
        { text: `${'hostile|*<script>[x](y)Café-'.repeat(80)}FILE_END`, font: 'JetBrainsMono' },
        { text: `${'Reviewed original reasons '.repeat(300)}STATUS_END`, inset: 10 },
        { text: `${'Known finding and required explanation '.repeat(500)}DETAIL_END` },
      ],
    ];
    const prepared = preparePdfRows(doc, rows, [135, 145, 350], 120, 0);
    expect(prepared.filter((row) => row.owner === 0)).toHaveLength(1);
    expect(prepared.filter((row) => row.owner === 1).length).toBeGreaterThan(1);
    for (const [owner, row] of rows.entries()) {
      for (const [column, original] of row.entries()) {
        const text = prepared.filter((part) => part.owner === owner).map((part) => {
          const content = part.cells[column]?.content;
          if (typeof content !== 'string') throw new Error('Expected newline-delimited PDF cell text');
          const lines = content.split('\n');
          const height = Math.max(PDF_TABLE.minHeight,
            lines.length * PDF_TABLE.lineHeight + PDF_TABLE.padding * 2);
          expect(height).toBeLessThanOrEqual(120);
          return lines.join('');
        }).join('').replace(/\s/g, '').replace(/Entry\d+(?:\(continued\d+\/\d+\))?/g, '');
        expect(text).toBe(original.text.replace(/\s/g, ''));
      }
    }
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npm exec -- vitest run src/features/inspector/report/renderPdf.test.ts`

Expected after 7a/7b: seven failing tests at the existing `not implemented: phase 20` exception. Tests wrap real instances and real AutoTable rather than replacing PDF output with a fake. `jsPDF.prototype.text` is not used.

- [ ] **Step 3: Implement the minimum fix**

Create `src/features/inspector/report/pdfDrawing.ts`:

```ts
import type { jsPDF } from 'jspdf';
import { ringArcs } from '@/lib/ringGeometry';
import type { RingState } from '@/lib/ringGeometry';

export const REPORT_PALETTE = {
  paper: '#ffffff', ink: '#14213d', muted: '#55607a', rules: '#dfe4ee', head: '#f6f8fc',
  blue: '#1f6fd1', blueChip: '#1e6dcd', blueTint: '#eaf2fd',
  orange: '#b05408', orangeTint: '#fdf0e3', grey: '#9aa3b5',
} as const;

export function drawCheckmark(doc: jsPDF, x: number, y: number, size = 8): void {
  doc.saveGraphicsState();
  doc.setDrawColor(REPORT_PALETTE.blueChip).setLineWidth(1.5);
  doc.moveTo(x, y + size * 0.5).lineTo(x + size * 0.35, y + size * 0.85)
    .lineTo(x + size, y).stroke();
  doc.restoreGraphicsState();
}

export function drawRing(
  doc: jsPDF, states: readonly RingState[], cx: number, cy: number, radius: number, width: number,
): void {
  doc.saveGraphicsState();
  for (const arc of ringArcs(states)) {
    doc.setDrawColor(arc.state === 'done' ? REPORT_PALETTE.blue
      : arc.state === 'review' ? REPORT_PALETTE.orange : REPORT_PALETTE.grey)
      .setLineWidth(width).setLineCap('butt');
    let start = arc.startDeg * Math.PI / 180;
    const end = arc.endDeg * Math.PI / 180;
    doc.moveTo(cx + radius * Math.sin(start), cy - radius * Math.cos(start));
    while (start < end - 1e-8) {
      const next = Math.min(end, start + Math.PI / 2);
      const k = 4 / 3 * Math.tan((next - start) / 4);
      const x0 = cx + radius * Math.sin(start);
      const y0 = cy - radius * Math.cos(start);
      const x1 = cx + radius * Math.sin(next);
      const y1 = cy - radius * Math.cos(next);
      doc.curveTo(x0 + k * radius * Math.cos(start), y0 + k * radius * Math.sin(start),
        x1 - k * radius * Math.cos(next), y1 - k * radius * Math.sin(next), x1, y1);
      start = next;
    }
    doc.stroke();
  }
  doc.restoreGraphicsState();
}
```

Create `src/features/inspector/report/pdfTable.ts`:

```ts
import type { jsPDF } from 'jspdf';
import type { CellDef } from 'jspdf-autotable';
import type { PdfFont } from './pdfFonts';
import { wrapPdfText } from './pdfFonts';

export const PDF_TABLE = { size: 10, padding: 6, lineHeight: 11.5, minHeight: 28 } as const;
export type PdfCell = {
  text: string; font?: PdfFont; color?: string; fill?: string; inset?: number;
};
export type PreparedPdfRow = {
  owner: number; part: number; parts: number; cells: CellDef[];
};

export function preparePdfRows(
  doc: jsPDF, rows: readonly (readonly PdfCell[])[], widths: readonly number[],
  maxHeight: number, labelColumn: number,
): readonly PreparedPdfRow[] {
  const maxLines = Math.floor((maxHeight - PDF_TABLE.padding * 2) / PDF_TABLE.lineHeight);
  if (maxHeight < PDF_TABLE.minHeight || maxLines < 1) throw new Error('PDF table has no usable row space. Export Markdown.');
  return rows.flatMap((row, owner) => {
    if (row.length !== widths.length) throw new Error('PDF table column count differs from its widths.');
    const wrapped = row.map((cell, column) => {
      const width = widths[column];
      if (width === undefined) throw new Error('Missing PDF column width');
      return wrapPdfText(doc, cell.font ?? 'DMSans', cell.text, PDF_TABLE.size,
        width - PDF_TABLE.padding * 2 - (cell.inset ?? 0));
    });
    const longest = Math.max(1, ...wrapped.map((lines) => lines.length));
    const label = row[labelColumn];
    const labelWidth = widths[labelColumn];
    if (label === undefined || labelWidth === undefined) throw new Error('Missing continuation label column');
    const wrapLabel = (text: string): string[] => wrapPdfText(doc, label.font ?? 'DMSans', text,
      PDF_TABLE.size, labelWidth - PDF_TABLE.padding * 2 - (label.inset ?? 0));
    const reserve = longest > maxLines
      ? wrapLabel(`Entry ${String(owner + 1)} (continued ${String(longest)}/${String(longest)})`).length : 0;
    const capacity = maxLines - reserve;
    if (capacity < 1) throw new Error('PDF continuation label leaves no text space. Export Markdown.');
    const parts = Math.ceil(longest / capacity);
    return Array.from({ length: parts }, (_, part) => ({
      owner, part, parts,
      cells: row.map((cell, column): CellDef => {
        const prefix = parts > 1 && column === labelColumn
          ? wrapLabel(part === 0 ? `Entry ${String(owner + 1)}`
            : `Entry ${String(owner + 1)} (continued ${String(part + 1)}/${String(parts)})`) : [];
        const content = [...prefix, ...(wrapped[column]?.slice(part * capacity, (part + 1) * capacity) ?? [])];
        if (content.length > maxLines) throw new Error('PDF continuation row exceeds the page. Export Markdown.');
        return { content: content.join('\n'), styles: {
          font: cell.font ?? 'DMSans', fontStyle: 'normal',
          cellPadding: { top: PDF_TABLE.padding, bottom: PDF_TABLE.padding,
            left: PDF_TABLE.padding + (cell.inset ?? 0), right: PDF_TABLE.padding },
          ...(cell.color === undefined ? {} : { textColor: cell.color }),
          ...(cell.fill === undefined ? {} : { fillColor: cell.fill }),
        } };
      }),
    }));
  });
}
```

Replace the five-line `renderPdf.ts` stub with these complete contents:

```ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CheckStatus } from '@/types/inspector';
import type { RingState } from '@/lib/ringGeometry';
import type { ReportCheck, ReportModel, ReportSection } from './reportModel.types';
import { drawCheckmark, drawRing, REPORT_PALETTE as palette } from './pdfDrawing';
import { registerPdfFonts, setPdfTextFont, wrapPdfText } from './pdfFonts';
import type { PdfFont } from './pdfFonts';
import { PDF_TABLE, preparePdfRows } from './pdfTable';
import type { PdfCell } from './pdfTable';
import { reportGroups } from './reportSections';

const MARGIN = 36;
function ringStates(checks: readonly ReportCheck[]): readonly RingState[] {
  return checks.map((check) => check.status === 'not-scanned' ? 'not-scanned'
    : check.status === 'needs-review' ? 'review' : 'done');
}
function color(status: CheckStatus): string {
  return status === 'not-scanned' ? palette.muted
    : status === 'needs-review' ? palette.orange : palette.blueChip;
}
function statusCell(check: ReportCheck, siteScope: boolean): PdfCell {
  return {
    text: `${check.status === 'needs-review' ? '! ' : ''}${check.statusText}${siteScope && check.status === 'reviewed' ? `: ${check.finding}` : ''}`,
    color: color(check.status), inset: 10,
    fill: check.status === 'needs-review' ? palette.orangeTint
      : check.status === 'not-scanned' ? palette.head : palette.blueTint,
  };
}

export function renderPdf(model: ReportModel): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape',
    putOnlyUsedFonts: true, compress: false });
  registerPdfFonts(doc);
  doc.setLineHeightFactor(PDF_TABLE.lineHeight / PDF_TABLE.size);
  setPdfTextFont(doc, 'SpaceGrotesk', model.title, 24);
  doc.setProperties({ title: model.metadataTitle });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  let y = MARGIN;

  function ensureSpace(needed: number): void {
    if (y + needed > height - MARGIN) { doc.addPage(); y = MARGIN; }
  }
  function paragraph(text: string, font: PdfFont = 'DMSans', size = 11,
    textColor: string = palette.ink, indent = 0): void {
    const lines = wrapPdfText(doc, font, text, size, width - MARGIN * 2 - indent);
    const lineHeight = Math.max(15, size * 1.3);
    doc.setTextColor(textColor);
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, MARGIN + indent, y + size);
      y += lineHeight;
    }
    y += 6;
  }
  function heading(text: string): void { ensureSpace(44); paragraph(text, 'SpaceGrotesk', 15); }
  function finding(section: ReportSection, status: CheckStatus): void {
    heading(model.scope === 'site' ? `${section.title}: ${section.fileName}` : section.title);
    paragraph(section.summary, 'DMSans', 11, color(status));
    paragraph(section.guidance);
    for (const detail of section.detail) paragraph(detail);
    for (const question of section.questions) paragraph(`[ ] ${question}`);
  }
  function table(head: readonly string[], body: readonly (readonly PdfCell[])[], widths: readonly number[]): void {
    const headLines = head.map((text, column) => {
      const cellWidth = widths[column];
      if (cellWidth === undefined) throw new Error('Missing PDF header width');
      return wrapPdfText(doc, 'DMSans', text, PDF_TABLE.size, cellWidth - PDF_TABLE.padding * 2);
    });
    const headHeight = Math.max(PDF_TABLE.minHeight,
      ...headLines.map((lines) => lines.length * PDF_TABLE.lineHeight + PDF_TABLE.padding * 2));
    const prepared = preparePdfRows(doc, body, widths,
      height - MARGIN * 2 - headHeight - 1, model.scope === 'site' ? 1 : 0);
    autoTable(doc, {
      startY: y, margin: MARGIN, head: [headLines.map((lines) => lines.join('\n'))], body: prepared.map((row) => row.cells),
      theme: 'grid', showHead: 'everyPage', rowPageBreak: 'avoid',
      styles: { font: 'DMSans', fontStyle: 'normal', fontSize: PDF_TABLE.size,
        overflow: 'visible', cellPadding: PDF_TABLE.padding, minCellHeight: PDF_TABLE.minHeight,
        lineColor: palette.rules, lineWidth: 0.5, textColor: palette.ink, valign: 'middle' },
      headStyles: { font: 'DMSans', fontStyle: 'normal', fillColor: palette.head, textColor: palette.muted },
      columnStyles: Object.fromEntries(widths.map((cellWidth, column) => [column, { cellWidth }])),
      didDrawCell(data) {
        if (data.section !== 'body') return;
        const entry = prepared[data.row.index];
        if (entry?.part !== 0) return;
        const row = model.rows[entry.owner];
        const check = model.scope === 'file'
          ? model.rows[0]?.checks[entry.owner] : row?.checks[data.column.index - 3];
        const isStatus = model.scope === 'file' ? data.column.index === 1
          : data.column.index >= 3 && data.column.index <= 5;
        if (isStatus && check !== undefined && (check.status === 'configured' || check.status === 'reviewed')) {
          drawCheckmark(doc, data.cell.x + 5, data.cell.y + data.cell.height / 2 - 4, 7);
        }
        if (model.scope === 'site' && data.column.index === 0 && row !== undefined) {
          drawRing(doc, ringStates(row.checks), data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2, 10, 3);
        }
      },
      didDrawPage(data) { if (data.cursor !== null) y = data.cursor.y + 16; },
    });
  }

  drawRing(doc, ['done', 'review'], MARGIN + 7, MARGIN + 7, 6, 2);
  paragraph(`${model.header.brand} · ${model.header.label}`, 'SpaceGrotesk', 11, palette.muted, 20);
  paragraph(model.title, 'SpaceGrotesk', 24);
  const checks = model.rows.flatMap((row) => row.checks);
  ensureSpace(88);
  drawRing(doc, ringStates(checks), MARGIN + 36, y + 36, 28, 8);
  const count = setPdfTextFont(doc, 'DMSans', `${String(model.counts.K)}/${String(model.counts.T)}`, 18);
  doc.setTextColor(palette.ink).text(count, MARGIN + 80, y + 42);
  y += 88;
  paragraph(model.headline, 'SpaceGrotesk', 18);
  for (const line of model.lines) paragraph(line.label === '' ? line.text : `${line.label}: ${line.text}`,
    line.label === 'Environment' ? 'JetBrainsMono' : 'DMSans');
  if (model.scope === 'file') {
    for (const row of model.rows) paragraph(row.name, 'JetBrainsMono');
  } else {
    paragraph(`Ready: ${String(model.fileCounts.ready)} · Needs review: ${String(model.fileCounts.needsReview)} · Incomplete: ${String(model.fileCounts.incomplete)} · Not verified: Tenant outbound policy`);
  }
  for (const banner of model.banners) paragraph(banner, 'DMSans', 11, palette.orange);
  if (model.scope === 'file') {
    table(['Check', 'Status', 'Finding'], checks.map((check) => [
      { text: check.title }, statusCell(check, false), { text: check.finding },
    ]), [135, 145, width - MARGIN * 2 - 280]);
  } else {
    table(['', 'File', 'Addressed', 'Web role', 'Table permissions', 'Outbound networking', 'Result'],
      model.rows.map((row) => [
        { text: '' }, { text: `${row.name}\n(${row.active ? 'Active' : 'Inactive'})`, font: 'JetBrainsMono' },
        { text: row.summary }, ...row.checks.map((check) => statusCell(check, true)),
        { text: row.result, color: row.result === 'Ready' ? palette.blueChip
          : row.result === 'Needs review' ? palette.orange : palette.muted,
          fill: row.result === 'Ready' ? palette.blueTint
            : row.result === 'Needs review' ? palette.orangeTint : palette.head },
      ]), [28, 150, 92, 104, 132, 142, width - MARGIN * 2 - 648]);
  }
  for (const group of reportGroups(model)) {
    if (group.title !== null) heading(group.title);
    for (const section of group.sections) finding(section, group.status);
  }
  for (const snapshot of model.snapshot ?? []) {
    heading(model.scope === 'site' ? `Configuration snapshot: ${snapshot.fileName}` : 'Configuration snapshot');
    paragraph('Web roles');
    for (const role of snapshot.roles) paragraph(role, 'DMSans', 11, palette.ink, 10);
    paragraph('Tables with privileges');
    for (const permission of snapshot.tables) paragraph(permission, 'DMSans', 11, palette.ink, 10);
    paragraph('Outbound');
    for (const outbound of snapshot.outbound) paragraph(outbound, 'DMSans', 11, palette.ink, 10);
  }
  for (const footer of model.footer) paragraph(footer, 'DMSans', 10, palette.muted);
  return new Uint8Array(doc.output('arraybuffer'));
}
```

`overflow: 'visible'` is intentional: content has already been measured/wrapped at the actual face/size/padding, and the prepared physical-row height accounts for the exact repeated header. Pass newline-delimited **strings**, not arrays: AutoTable 5.0.8's `Cell` constructor stringifies arrays with commas before splitting newlines. Real-renderer tests check both horizontal and vertical bounds. Only over-page logical entries acquire numbered continuation labels; no text is shrunk below 10pt.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm exec -- vitest run src/features/inspector/report/renderPdf.test.ts`

Expected: seven tests pass. Both stress scopes produce real PDF bytes, three embedded FontFile2 streams, matching extracted Unicode text, complete long tokens/tail markers, literal hostile text, repeated heads and one page per physical row. All sixteen include/redact/scope combinations retain their required content; source filenames survive in actual metadata. Unsupported text produces the documented error and still renders as Markdown.

Run: `npm exec -- vitest run src/features/inspector/report src/lib/ringGeometry.test.ts`

Expected: all report and ring geometry regressions pass, including `pdfTable.test.ts` reconstructing every original cell independently of the duplicated narrative sections.

Run: `npm exec -- eslint src/features/inspector/report --max-warnings=0`

Expected: exit 0.

To create the exact reader-inspection artifacts for Task 10, run once after passing tests:

```powershell
$previous = $env:INSPECTOR_PDF_EVIDENCE_DIR
try {
    $env:INSPECTOR_PDF_EVIDENCE_DIR = '.scratch/phase5-pdf-evidence'
    npm exec -- vitest run src/features/inspector/report/renderPdf.test.ts -t 'serializes the complete long hostile'
    if ($LASTEXITCODE -ne 0) { throw 'PDF evidence fixture generation failed' }
} finally {
    if ($null -eq $previous) { Remove-Item Env:INSPECTOR_PDF_EVIDENCE_DIR -ErrorAction SilentlyContinue }
    else { $env:INSPECTOR_PDF_EVIDENCE_DIR = $previous }
}
```

Expected: `.scratch/phase5-pdf-evidence/file-stress.pdf`, `site-stress.pdf` and matching `.md` files. Task 10 opens both PDFs in the actual reader, copies the hostile filename and final long-reason marker, visually verifies margins/rings/state labels/repeated headings/continuation rows, and records the reader/version and observations. Automated ToUnicode extraction is evidence of encoded selectable text, not a substitute for that reader check or real-host timing.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add src/features/inspector/report/reportStressFixtures.ts src/features/inspector/report/pdfTextEvidence.ts src/features/inspector/report/renderPdf.test.ts src/features/inspector/report/pdfTable.test.ts src/features/inspector/report/pdfDrawing.ts src/features/inspector/report/pdfTable.ts src/features/inspector/report/renderPdf.ts
git commit --only -m "feat(inspector): render complete selectable vector PDF reports" -- src/features/inspector/report/reportStressFixtures.ts src/features/inspector/report/pdfTextEvidence.ts src/features/inspector/report/renderPdf.test.ts src/features/inspector/report/pdfTable.test.ts src/features/inspector/report/pdfDrawing.ts src/features/inspector/report/pdfTable.ts src/features/inspector/report/renderPdf.ts
```

### Task 9a: Gate the actual Inspector artifact, exclusion boundary and executable entrypoints

**Owns:** P5.8 code gates. Tasks 5/6/7/8 own the production behavior these gates require; Task 10 owns the final candidate/validator/manual/live run. This is a test-coverage change, so its pre-change reproduction detects the missing gate, and its completion runs the new gates against real output.

**Files:**

- Modify: `tests/buildShape.test.ts:12-34,46-104,110,125` — record rendered modules; explicit included/excluded artifacts; loading/asset tests for both.
- Modify: `tests/manifest.test.ts:73-75` — published payload/font-licence/runtime-library contracts.
- Modify: `src/skeleton.test.ts:1,16,139-149` — retain useful API contracts and execute production reader/report entrypoints.
- Signal: the exact PowerShell source-gap reproduction below, followed by real build-shape/manifest/entrypoint tests.

- [ ] **Step 1: Establish the observable pre-change signal**

Run this complete one-off reproduction of the current gate gap. It changes no source:

```powershell
$gates = @{
    'tests/buildShape.test.ts' = 'phase5-rendered-module-evidence'
    'tests/manifest.test.ts' = 'ships the report font licences'
    'src/skeleton.test.ts' = 'production Inspector entrypoints execute'
}
foreach ($path in $gates.Keys) {
    if (!(Select-String -LiteralPath $path -SimpleMatch -Pattern $gates[$path] -Quiet)) {
        throw "Missing executable release gate: $path"
    }
}
Write-Output 'All three executable release gates are present'
```

- [ ] **Step 2: Capture the current signal**

Run: `if (!(Select-String -LiteralPath 'tests/buildShape.test.ts' -SimpleMatch -Pattern 'phase5-rendered-module-evidence' -Quiet)) { throw 'Missing executable Inspector module gate' }`

Expected on the planning baseline: `Missing executable Inspector module gate`, exit 1. The current all-pages build defaults to an unset list and its Inspector tests use placeholder text, not rendered provider/reader/PDF-module inclusion and exclusion. Source-gap detection itself is not a release pass.

- [ ] **Step 3: Implement the minimum fix**

Apply these changes in `tests/buildShape.test.ts`. Task 6 owns replacing the old page placeholder marker with `Review server logic readiness`; its exact marker handoff must already be integrated. This task consumes that edit and does not apply it a second time.

Retain the existing Windows-safe `import { fileURLToPath } from 'node:url'` and `const ROOT = fileURLToPath(new URL('..', import.meta.url));` exactly. Every proposed path continues using `ROOT`. In `tests/manifest.test.ts`, `isRecord` is already a local function at line 21; the added tests reuse it without another import.

```diff
@@ imports
 import { build } from 'vite';
+import type { Plugin } from 'vite';
+import pdfFonts from '@/assets/fonts/pdf-fonts.json';
@@ immediately after const BUILD_TIMEOUT = 300_000;
 const BUILD_TIMEOUT = 300_000;
+type BuildEvidence = { modules: string[]; imports: string[]; dynamicImports: string[] };
+const buildEvidence = new Map<string, BuildEvidence>();
+const BUILD_VARIANTS = [
+  { name: 'all', pages: 'starter,objects,inspector', inspector: true },
+  { name: 'without-inspector', pages: 'starter,objects', inspector: false },
+] as const;
@@ async function buildTool(, immediately after const outDir
   const outDir = `${CACHE}/${name}`;
+  const evidence: BuildEvidence = { modules: [], imports: [], dynamicImports: [] };
+  const capture: Plugin = {
+    name: 'phase5-rendered-module-evidence',
+    generateBundle(_options, bundle) {
+      for (const output of Object.values(bundle)) {
+        if (output.type !== 'chunk') continue;
+        evidence.imports.push(...output.imports);
+        evidence.dynamicImports.push(...output.dynamicImports);
+        for (const [id, module] of Object.entries(output.modules)) {
+          if (module.renderedLength > 0) evidence.modules.push(id.replace(/\\/g, '/'));
+        }
+      }
+    },
+  };
@@ buildTool's await build options
       logLevel: 'silent',
+      plugins: [capture],
@@ buildTool, after the finally block and before return outDir
+  buildEvidence.set(outDir, evidence);
   return outDir;
```

Add this complete helper immediately after `function read(dir: string, file: string): string`:

```ts
function assertInspectorBuild(dist: string, included: boolean): void {
  const evidence = buildEvidence.get(dist);
  if (evidence === undefined) throw new Error('No rendered-module evidence for this build');
  expect(evidence.modules.length).toBeGreaterThan(0);
  expect(evidence.imports).toEqual([]);
  expect(evidence.dynamicImports).toEqual([]);
  const modules = evidence.modules.join('\n');
  const required = [
    /\/src\/app\/inspector-site\/InspectorProvider\.tsx(?:\?|$)/m,
    /\/src\/app\/shell\/SitePill\.tsx(?:\?|$)/m,
    /\/src\/features\/inspector\/InspectorPage\.tsx(?:\?|$)/m,
    /\/src\/features\/inspector\/scan\/scan\.ts(?:\?|$)/m,
    /\/src\/features\/inspector\/model\/rules\.ts(?:\?|$)/m,
    /\/src\/features\/inspector\/ExportDialog\.tsx(?:\?|$)/m,
    /\/src\/features\/inspector\/report\/renderPdf\.ts(?:\?|$)/m,
    /\/node_modules\/jspdf\//,
    /\/node_modules\/jspdf-autotable\//,
    /\/src\/assets\/fonts\/DMSans_400Regular\.ttf\?inline/,
    /\/src\/assets\/fonts\/SpaceGrotesk_700Bold\.ttf\?inline/,
    /\/src\/assets\/fonts\/JetBrainsMono_400Regular\.ttf\?inline/,
  ];
  for (const pattern of required) expect(pattern.test(modules), pattern.source).toBe(included);
  if (!included) {
    expect(modules).not.toMatch(/\/src\/features\/inspector\//);
    expect(modules).not.toMatch(/\/src\/app\/inspector-site\//);
  }
  expect(modules).not.toMatch(/\/node_modules\/(?:html2pdf(?:\.js)?|html2canvas|dompurify|canvg)\//);
  expect(filesIn(dist, '.ttf')).toEqual([]);
  const [file] = filesIn(dist, '.js');
  if (file === undefined) throw new Error('No application IIFE emitted');
  const code = read(dist, file);
  for (const marker of [
    'Review server logic readiness', 'No server logic found on this site', 'Export report',
    'Read as separate queries during this interval, not as one atomic snapshot.',
  ]) expect(code.includes(marker), marker).toBe(included);
  expect(code).not.toContain('not implemented: phase 15');
  expect(code).not.toContain('not implemented: phase 20');
}
```

Parameterize the existing loading-shape describe so its **existing** single-JS/classic-script/body-end/CSP/CSS tests run for both explicit artifacts, and strengthen only the indicated individual assertions:

```diff
-describe('built tool: PPTB loading shape (all pages released)', () => {
+describe.each(BUILD_VARIANTS)('built tool: PPTB loading shape ($name)', ({ name, pages, inspector }) => {
   let dist = '';
   beforeAll(async () => {
-    dist = await buildTool('all', undefined);
+    dist = await buildTool(name, pages);
@@ it('copies the manifest icon into dist', ...)
     expect(existsSync(`${dist}/icons/logo.svg`)).toBe(true);
+    expect(readFileSync(`${dist}/icons/logo.svg`)).toEqual(readFileSync(`${ROOT}public/icons/logo.svg`));
   });
+  it('copies the report font licences into the distributed payload', () => {
+    for (const font of pdfFonts) {
+      expect(readFileSync(`${dist}/licenses/${font.license}`))
+        .toEqual(readFileSync(`${ROOT}src/assets/fonts/${font.license}`));
+    }
+  });
@@ existing it('includes all three pages', ...)
-  it('includes all three pages', () => {
+  it('includes the selected production pages and the exact Inspector boundary', () => {
@@ its final two assertions (Task 6's placeholder-marker replacement is the first line)
-    expect(code).toContain('Review server logic readiness');
-    expect(code).toContain('No site selected');
+    expect(code.includes('No site selected')).toBe(inspector);
+    assertInspectorBuild(dist, inspector);
@@ starter-only test, immediately after its buildTool call
       const dist = await buildTool('starter-only', 'starter');
+      assertInspectorBuild(dist, false);
@@ beta-mode test
-      const dist = await buildTool('beta-mode', undefined, 'beta');
+      const dist = await buildTool('beta-mode', 'starter,objects', 'beta');
+      assertInspectorBuild(dist, false);
@@ library probe test
-      const dist = await buildTool('probe', undefined, 'probe');
+      const dist = await buildTool('probe', 'starter,objects,inspector', 'probe');
```

Explicit `process.env.VITE_RELEASED_PAGES` values retain the existing try/finally restoration in `buildTool`; local `.env`/parent-shell overrides cannot choose a different candidate. These build tests run sequentially because they mutate the process environment. The unknown-page/Objects-without-Starter negative builds and the library probe remain meaningful. Task 10 separately verifies the ordinary beta default and rebuilds the final explicit included candidate last.

In `tests/manifest.test.ts`, add this import and these two complete tests after the existing icon test:

```diff
@@ imports
 import { describe, expect, it } from 'vitest';
+import pdfFonts from '@/assets/fonts/pdf-fonts.json';
```

```ts
  it('ships the report font licences with the dist-only published payload', () => {
    expect(manifest.files).toEqual(['dist']);
    expect(manifest.sideEffects).toEqual(['**/*.css']);
    for (const font of pdfFonts) {
      const source = readFileSync(`${ROOT}src/assets/fonts/${font.license}`);
      expect(readFileSync(`${ROOT}public/licenses/${font.license}`)).toEqual(source);
      expect(source.toString('utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1');
    }
  });

  it('keeps vector PDF on the installed libraries without a direct HTML renderer dependency', () => {
    if (!isRecord(manifest.dependencies)) throw new Error('dependencies missing');
    if (!isRecord(manifest.devDependencies)) throw new Error('devDependencies missing');
    for (const name of ['html2pdf.js', 'html2pdf', 'html2canvas', 'dompurify', 'canvg']) {
      expect(manifest.dependencies).not.toHaveProperty(name);
      expect(manifest.devDependencies).not.toHaveProperty(name);
    }
  });
```

The existing tests already pin `icons/logo.svg`, jsPDF 4.2.1 and AutoTable 5.0.8; preserve them. Offline validator API execution belongs to Task 10's `scripts/validate-manifest.mjs`; do not add the installed validator CLI's broken `--skip-url-checks` invocation here.

In `src/skeleton.test.ts`:

```diff
@@ start of file
+// @vitest-environment node
 import { describe, expect, expectTypeOf, it } from 'vitest';
@@ report imports
 import { buildReportModel } from '@/features/inspector/report/buildReportModel';
+import { EXPORTED_AT, REPORT_OPTIONS, reportResult } from '@/features/inspector/report/reportFixtures';
@@ Inspector contract test, replace only these exact old assertions
-    expectTypeOf(runScan).toEqualTypeOf<
-      (
-        host: PptbHost,
-        connection: Connection,
-        site: SiteRef,
-        scanId: string,
-        onProgress: (scanned: number, total: number) => void,
-      ) => Promise<SiteFacts>
-    >();
-    expectTypeOf(listSites).toEqualTypeOf<(host: PptbHost) => Promise<readonly SiteRef[]>>();
+    expectTypeOf(runScan).returns.toEqualTypeOf<Promise<SiteFacts>>();
+    expectTypeOf(listSites).returns.toEqualTypeOf<Promise<readonly SiteRef[]>>();
```

Append this complete runtime describe. The Node environment is deliberate for the real PDF serializer; the existing scaffold imports are inspected, not rendered. Page/dialog behavior remains exercised in Tasks 6/8's rendered tests.

```ts
describe('production Inspector entrypoints execute', () => {
  it('reads an empty inventory through the fake host and reaches evaluated results', async () => {
    const fixture = reportResult().facts;
    const connection: Connection = fixture.connection;
    const site: SiteRef = { ...fixture.site, id: '11111111-1111-4111-8111-111111111111' };
    const host = createFakeHost({ connection, responders: [() => []] });
    await expect(listSites(host)).resolves.toEqual([]);
    const facts = await runScan(host, connection, site, 'completion-scan', () => undefined);
    expect(facts).toMatchObject({ scanId: 'completion-scan', files: [], inventoryComplete: true, stopped: null });
    expect(facts.finishedAt).not.toBeNull();
    expect(host.callsOf('queryAll').length).toBeGreaterThan(0);
    expect(evaluateSite(facts, new Set()).files).toEqual([]);
  });

  it.each(['file', 'site'] as const)('builds a captured %s model and serializes both real formats', (scope) => {
    const result = reportResult();
    const markdownModel = buildReportModel(result, { ...REPORT_OPTIONS, scope }, EXPORTED_AT);
    const pdfModel = buildReportModel(result, { ...REPORT_OPTIONS, scope, format: 'pdf' }, EXPORTED_AT);
    expect(renderMarkdown(markdownModel)).toContain('Global Read on account via Members.');
    const bytes = renderPdf(pdfModel);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    expect(reportFileName(markdownModel)).toMatch(/\.md$/);
    expect(reportFileName(pdfModel)).toMatch(/\.pdf$/);
    expect(pdfModel.counts).toEqual(markdownModel.counts);
  });
});
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `if (!(Select-String -LiteralPath 'tests/buildShape.test.ts' -SimpleMatch -Pattern 'phase5-rendered-module-evidence' -Quiet)) { throw 'Missing executable Inspector module gate' }`

Expected: exit 0. Then run the actual gates:

Run: `npm exec -- vitest run tests/buildShape.test.ts tests/manifest.test.ts src/skeleton.test.ts`

Expected: all tests pass. The explicit `starter,objects,inspector` build contains provider/picker/page/readers/rules/export/PDF and three inline TTFs; explicit `starter,objects` and beta/starter-only builds contain none of those rendered modules or PDF dependencies. Both principal artifacts are one classic-script IIFE with bundled CSS/fonts, no module/crossorigin or external HTML resources, body-end script tags and byte-identical icon/licences. Production reader and both report formats execute.

Run: `npm exec -- eslint tests/buildShape.test.ts tests/manifest.test.ts src/skeleton.test.ts src/features/inspector/report --max-warnings=0`

Expected: exit 0.

Run: `npm run typecheck`

Expected: exit 0 against the baseline document's latest passing checkpoint; report any new diagnostics under their owning task.

Run: `npm exec -- vitest run src/features/inspector src/app/inspector-site src/app/App.test.tsx src/app/Inspector.integration.test.tsx`

Expected: reader/rules/reports/session/page/export and shell integration pass. This includes Task 8's native-save failure/cancellation/invalidation coverage; a direct `saveFile` unit call is not substituted for the export controller.

Task 10 runs the full suite, lint, ordinary build/beta, final explicit Inspector build, package listing, offline script, online validator, audit and live/rendered gates once after integration. Remaining scratch lint, two moderate audit findings and failed online URLs retain their separate blocked status until their owners reconcile them. No package publication is performed by this task.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add tests/buildShape.test.ts tests/manifest.test.ts src/skeleton.test.ts
git commit --only -m "test(inspector): gate production reports and released build boundaries" -- tests/buildShape.test.ts tests/manifest.test.ts src/skeleton.test.ts
```

## Completion handoff

- Task 7 local closure: all report tests, scoped lint and integrated typecheck pass; both real PDF evidence artifacts exist; no unsupported required sample is described as a pass.
- Task 9 local closure: explicit included/excluded artifacts satisfy rendered-module and loading-shape checks; manifest asset/licence checks and real entrypoint tests pass.
- Task 1 owns the palette/repertoire and supplemental report-content requirements; Task 6 owns the compatible placeholder-marker replacement; Task 10 owns the validator script, manuals and release ledger. Live timing, PDF reader selection/copying, actual host action behavior, release URLs/audit and the FR-12 generator-harness release dependency remain Task 10's gates.
- Stop these tasks after their owned tests/checks pass. Additional script shaping/font fallback is a separate material scope decision if release data requires it.
