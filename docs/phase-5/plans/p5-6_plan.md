# P5.6 plan — Complete faithful reports and PDF output

**Date:** 2026-11-01
**Baseline:** branch `logic-inspector-v2-build`, HEAD `071415c`; requires `p5-3_plan.md` (commit `85de3ff`): raw configuration rows live only in `FileResult.snapshot`, `Finding.detail` is explanation only, `Finding.hasUnscannedEvidence` exists. Independent of P5.4 and P5.5.
**Spec:** FR-10 (4.1.0, L794–L805), FR-11 L832 and L835, Story 9 AC-9.1–AC-9.10 (L334–L370), AC-7.9, AC-7.12, AC-8.10, AC-8.12, Assumption A8 (L975–L982), Error Scenarios "PDF generation fails" (L918).
**Audit items:** CR-003, WR-001 (export behaviour), WR-002; the renderer's share of RG-004 and RG-005 (the live gates close in P5.7 and P5.8).
**Status:** Accepted by the owner 2026-11-02 (P-01 B, P-12, P-14 with (d) and (f)); not yet executed.
**Supersedes:** Tasks 7a–7c of `docs/plans/11-01-2026-phase-5-reports-build.md` (reference only; the defects not repeated are listed under Decisions). The design decisions 1–8 of `docs/specs/001-server-logic-starter-inspector/plans/phase-20-report-pdf.md` are adopted; its code blocks are not.

## Goal

Both report scopes produce a vector PDF from the one display-ready `ReportModel`: embedded licensed fonts, a vector `✓`, status rings, repeated table heads, intact rows, and no omitted or shrunk text. A redacted report also redacts the hostname of a URL-valued site or environment identifier, and its PDF title. A snapshot-only value is proven to appear only under the snapshot. Markdown output and both goldens stay byte-identical.

## Decisions adopted (the owner approves them with this plan)

| ID | Decision |
|---|---|
| P-01 | **JetBrains Mono TTF: option B, no new dependency (owner decision 2026-11-02).** jsPDF embeds TrueType only and the repository holds JetBrains Mono as woff2 only. The TTF is copied by hand from the official release `v2.304` (the latest release, published 2023-01-14): `https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip` (a HEAD request returns `302` to the release asset and the download returns `200`, 5,622,857 bytes). From the extracted zip, `fonts/ttf/JetBrainsMono-Regular.ttf` (273,900 bytes) is copied to `src/assets/fonts/JetBrainsMono_400Regular.ttf`, keeping the repository's naming. The zip's `OFL.txt` differs from the repository's `OFL-JetBrainsMono.txt` in three small ways: the repository copy appends `JetBrainsMono-Italic[wght].ttf: Copyright 2020 …` to the copyright line, it writes `http://` where the release writes `https://scripts.sil.org/OFL`, and the release has a trailing space on one line. `OFL-JetBrainsMono.txt` is therefore replaced by the release's text, normalised to LF line endings with trailing whitespace stripped (so `git diff --check` stays clean); the licence wording is otherwise the release's. No `package.json` or lockfile change, no network script, no runtime dependency, no hash manifest. **Provenance** is the pinned release URL plus the SHA-256 of the copied TTF, recorded in `docs/phase-5/evidence/p5-6/execution.md` and in the commit message. Note the official 2.304 face is a full font (1,363 code points) that does include U+2713; the report still draws the tick as a vector in every face, and the test asserts the glyph is absent only from DM Sans and Space Grotesk, as FR-10 states. |
| P-02 | **Faces.** DM Sans 400 body, DM Sans 700 for emphasis and labels, Space Grotesk 700 headings, JetBrains Mono 400 for file names, paths, setting names and the Environment line. Registered per `jsPDF` instance in `report/pdfFonts.ts` from `?inline` imports (the pattern `src/probe/libraryProbe.ts` already proves). `✓` is a three-point vector path (`drawCheckmark`, Phase 20 decision 5); `!` comes from the font. |
| P-03 | **Coverage is a test; characters are handled by P-12.** `pdfFonts.test.ts` parses each embedded TTF's cmap (formats 4 and 12, helper `report/testCmap.ts`), draws the standard, long and hostile fixtures in both scopes (redaction off and on), and asserts every character written is in the face it is written in, that no write contains U+2713, and that U+2713 is absent from DM Sans and Space Grotesk (so the vector glyph is required there). To see every string written, `drawReport(doc, model, observe?)` routes prose through one module-private `write()` and table cells through `drawPdfTable`, and both call the optional `observe(text, face)`. `renderPdf` itself stays `(model) => Uint8Array`, which `src/skeleton.test.ts` L145 pins. The observer records what the renderer hands to jsPDF, so `renderPdf.test.ts` also spies `doc.text` on the real instance (an own method in jsPDF 4.2.1, no cast needed) and asserts the strings the document receives equal the strings observed, for the standard and long fixtures in both scopes. Supported repertoire: see P-12. The cmaps hold 403 code points in DM Sans, 735 in Space Grotesk and 1,363 in JetBrains Mono 2.304. |
| P-04 | **Redaction aliases (WR-002).** `redactor` in `buildReportModel.ts` keeps `connection.name`, `connection.url`, `site.name` and `site.domain` exactly as today: case-sensitive substrings with no boundary rule, so `Contoso` inside `Contoso-Prod` is still redacted. It adds, for `connection.url` and `site.domain` only, the `hostname`, `host` and `origin` of the parsed URL as aliases. A value without `://` is parsed as `https://<value>`; a value `URL.canParse` rejects adds no alias (`URL.canParse` needs Chromium 120 or later, which current PPTB Desktop has). Aliases match case-insensitively and only at a boundary: the characters before and after must not be in `[A-Za-z0-9_-]`, so `other-contoso.crm.dynamics.com` stays while `x.dev.example.com`, `DEV.EXAMPLE.COM` and `https://dev.example.com/path` are redacted. A bare `site.domain` is also an original string, so it still redacts inside `other-dev.example.com`, as today. Replacement stays longest-first in one pass. `ReportRow.name`, section `fileName` and snapshot `fileName` are never passed through `redact` (confirmed in `rowModel`, `sections` and the snapshot map); that is kept and tested. Nothing is fetched. |
| P-05 | **Snapshot ownership (WR-001).** P5.3 already moved raw rows out of `Finding.detail`, so the new model, Markdown and PDF sentinel tests pass at the baseline. They are pins, not a failing signal: a Needs-review file whose `FileResult.snapshot.outbound` holds `snapshot-only.example` and whose reasons and summary do not. With `snapshot: false` the value appears nowhere in the model, Markdown or PDF writes for both scopes while reasons and guidance remain; with `snapshot: true` it appears once, under the snapshot. |
| P-06 | **Markdown output unchanged for the specified fixtures.** `renderMarkdown.ts`, `markdownEscape.ts` and both goldens (`__golden__/file.md`, `site.md`) stay byte-identical. The inactive-file label of P-14(d) reaches Markdown through the model's file names, but no golden fixture has an inactive file (`reportFixtures.ts` L41, in `reportFile`: `    active: true,`, and every fixture is built with it), so neither golden changes, and the label is proven by new tests (A3, A4, A8). A golden diff is a P5.6 failure. |
| P-07 | **PDF layout** (Phase 20 decisions 1, 2, 5, 6; A8). Landscape A4, 36 pt margins, a white page in both themes. Palette `ink #14213d`, `muted #55607a`, `rules #dfe4ee`, head `#f6f8fc`, blue chip `#1e6dcd` on `#eaf2fd`, orange text `#b05408` on `#fdf0e3`. File scope: header row (glyph and "Logic Inspector" left, `File readiness report · <date>` right), H1 title, Environment, Scanned, non-atomic sentence and Result lines, banners, a Check \| Status \| Finding table, a heading, summary, guidance, details and (when on) question checkboxes per Needs-review finding, "Not scanned" list, "Configuration snapshot" (when on), footer (plus the P-12 note when characters were replaced). Site scope (AC-9.3): header, H1 title, hero (site ring over every check via `ringArcs` as cubic Béziers of at most 90°, `K/T`, the model's Result line `K/T checks addressed (C configured, V reviewed)`, path, headline, interval, non-atomic sentence, Ready, Needs review, Incomplete and "Not verified: Tenant outbound policy"), banners below the hero, files table (mini ring, file, three check cells, result pill), "Review first" in model order, "Not scanned", snapshots, footer. Every page ends with a right-aligned `Page n of m` in the bottom margin, drawn once all pages exist: jsPDF has `putTotalPages(pageExpression: string): jsPDF;` (`node_modules/jspdf/types/index.d.ts` L1328), but a final pass over `setPage(1..m)` writes the real numbers, so no placeholder is needed and the numbers are observable. All text is drawn with `doc.text` or AutoTable; no `html()`, no image, no fetch; `setProperties({ title: model.title })` is the only metadata (already redacted for site scope by `reportIdentity`). The old handoff's report page spec (screens 04 and 05) survives only in `.scratch/inspector-plan/design_handoff_server_logic_tools/README.md`; the current root README's section 5 is Accessibility, so spec L8 and L832 ("README §05") are stale, and this decision is the pin. |
| P-08 | **Pagination.** AutoTable with `showHead: 'everyPage'` and `rowPageBreak: 'avoid'`. Before AutoTable, `preparePdfRows` wraps every cell at its real column width with `splitTextToSize` (wrapped in a typed helper that accepts only `string[]`; a word wider than the column is broken, nothing is cut), and splits a logical row taller than one empty page (`maxRowLines`, with one line of slack) into continuation rows whose label cell reads `<label> (continued k/m)`; the other cells carry the remaining lines. `didDrawCell` records each printed row's page and `spansMultiplePages`, and the head's pages, so tests assert no printed row spans pages and the head repeats. Prose uses a cursor that adds a page when the next line won't fit; a bar or tint is drawn per line so a block crossing a page keeps its styling. Known limit: a continuation row's label cell shows `<label> (continued k/m)` rather than the rest of the label, so a label longer than one page of lines (about 46 lines, thousands of characters) would still overflow; the 400-character name is fine. |
| P-09 | **Output.** `renderPdf(model)` returns `new Uint8Array(doc.output('arraybuffer'))`. `compress` stays at jsPDF's default (off): about 130 KB for the 3-file fixture and 640 KB for the 60-file site report, most of it the embedded fonts. Tests assert the `%PDF-` header and `%%EOF` trailer, page count 1 or more, more than one page for the long fixture, text operators with a `/ToUnicode` map and no `/Subtype /Image` (selectable text, partly), and a 5 s ceiling on building the 60-file site report. |
| P-10 | **Fixtures.** `reportFixtures.ts` gains `longReportResult()` (60 files, one of them with a 400-character name, a Reviewed table-permissions reason and a Needs-review outbound reason of 3,000 characters each), `LONG_FILE_NAME`, `LONG_REASON` and `REPORT_FIXTURE_CASES`. The Reviewed reason wraps to about 100 lines in the site table's narrow column and so exercises continuation rows; the Needs-review one exercises a long finding block crossing a page. Existing exports are unchanged. |
| P-11 | **No other dependency, build or configuration change.** `vite.config.ts` already aliases `html2canvas`, `canvg` and `dompurify` to an empty module (so `doc.html()` stays unusable, as intended) and `tests/buildShape.test.ts` already expects a TTF and jsPDF in the probe bundle. Nothing outside tests imports `renderPdf` yet, so the IIFE stays 932.90 kB (304.37 kB gzip) in P5.6. When P5.7 wires the export, the bundle grows by about 1,066 kB raw and 439 kB gzip (jsPDF, AutoTable and the four inline TTFs, with the 274 KB JetBrains Mono 2.304 face; measured by importing `renderPdf` into a scratch copy of `main.tsx`: 932.90 kB becomes 1,999.28 kB); P5.8's size gate decides whether that is acceptable or `renderPdf` moves behind `React.lazy` (inlined into the single bundle). |
| P-12 | **Unsupported characters (owner to confirm).** jsPDF omits, without a trace, any character the embedded font cannot map: probed with DM Sans, `doc.text('日本語a')` emits only `a`, and a file named `日本語-handler😀.js` would extract as `-handler.js`. The brief forbids silently dropping content, so every string passes through a module-private `pdfText` in `renderPdf.ts` and the table preparation, backed by `createTextGuard()` in `pdfFonts.ts`: each code point outside a static repertoire becomes `?` and is counted; CR and CRLF become LF (LF is a line break). When the count is non-zero the footer gains one line, `N characters outside the PDF font set were replaced with ?`, so nothing is silent. The repertoire is `SUPPORTED_RANGES`: U+0020–U+007E, U+00A0–U+017F except the points some embedded face lacks (U+00AD, U+0108–0109, U+011C–011D, U+0124–0125, U+0132–0135, U+0138, U+0149, U+015C–015D, U+0166–0167, U+017F), and U+2013, U+2014, U+2018, U+2019, U+201C, U+201D, U+2022, U+2026. `pdfFonts.test.ts` proves every code point of every range is in the cmap of all four faces, so the ranges are validated without a runtime cmap parse or a cast. A file named `日本語-handler😀.js` renders as `???-handler?.js` (one `?` per code point, so the emoji is one) with the footer note. **Alternative the owner may pick instead:** throw an `Error` naming the first unsupported character, which P5.7 maps to the AC-9.9 error toast (`Couldn't save <filename>` with the reason) and leaves Markdown available; that makes such names unexportable as PDF. |
| P-14 | **Layout choices.** Not fixed by the spec: (a) the result pill is a rounded tint drawn behind the text in AutoTable's `willDrawCell`; (b) the PDF files table has no "Addressed" column (AC-9.3 lists ring, file, three checks and pill; the Markdown table keeps its Addressed column); (c) a Reviewed check in the site table reads `Reviewed: <original reason>`, as in Markdown (AC-8.12); (e) only Needs-review findings get guidance and question lists (AC-9.2) and Not scanned is a list. **Adopted by the owner on 2026-11-02:** (d) **Inactive label.** A file whose `ReportRow.active` is false is shown as `<name> (Inactive)` wherever its name is a label in a list or table, in Markdown and PDF alike: the site-scope files table cell and the Review first and Not scanned entries. AC-9.2 (spec L356) says the H2 and the screen show the record name as stored, so the file-scope H2 and PDF title, the snapshot headings, the export stem and the file name keep the stored name. It is applied once in the model: `displayName(file)` in `reportFileName.ts`, used by `rowModel` in `buildReportModel.ts`, whose `name` feeds the table cell and every section's `fileName`. Sorting uses the stored name, and server logic file names are still never redacted. (f) **Page numbers.** `Page n of m` bottom-right on every page (P-07). |
| P-13 | **Palette has no green.** The Phase 20 palette block and the handoff ("6 blue, 3 orange") define blue, orange and grey only. Ring segments: Configured and Reviewed `#1f6fd1`, Needs review `#b05408`, Not scanned `#9aa3b5`. Text uses the A8 values. One token is added, `greyTint #eef0f4` for the Incomplete pill; a test holds every text pair at 4.5:1 or better. The ring grey is a graphic that also carries a count and text; its 2.5:1 on white is deliberate and asserted at that value. |

**Not repeated from the old draft (Tasks 7a–7c):** no "Reviewed details" or "Configured details" sections and no question lists for Configured, Reviewed or Not scanned findings; no `metadataTitle`; no change to the Finding cell (`reasons.join('; ')` stays); no "Active" suffixes on specified lines; no network font-download script, `public/licenses`, hash manifest or second licence file; no `compress: false` in production; no runtime throw on unsupported characters; no build gating (P5.8 owns it); no hand-rolled PDF stream parser.

## Spec items missing from the build (gap table)

| # | Spec item | Current code (verbatim) | Gap |
|---|---|---|---|
| G1 | FR-10, AC-9.3, AC-9.4, CR-003 | `renderPdf.ts` L3–L4 `export function renderPdf(_m: ReportModel): Uint8Array {` / `  throw new Error('not implemented: phase 20');` | Neither PDF scope can be produced. |
| G2 | FR-10 fonts | `src/assets/fonts/` holds `jetbrains-mono-latin-400-normal.woff2`, `-500-` and `-700-` only; `fonts.css` L6 `  src: url('./jetbrains-mono-latin-400-normal.woff2') format('woff2');`; `git ls-files 'src/assets/fonts/*.ttf'` lists six DM Sans and Space Grotesk files. | jsPDF embeds TrueType only; there is no JetBrains Mono TTF in the repository. |
| G3 | FR-10 coverage and F44 pagination tests | `src/features/inspector/report/` has `buildReportModel.test.ts`, `markdownEscape.test.ts` and `renderMarkdown.test.ts`; no `pdf*.test.ts`. | No test checks written characters against font coverage, pagination, row integrity, the vector glyph or the PDF title. |
| G4 | WR-002, AC-9.6 | `buildReportModel.ts` L31–L34 `{ value: connection.name, replacement: '[environment]' },` / `{ value: connection.url, replacement: '[environment]' },` / `{ value: site.name, replacement: '[site]' },` / `{ value: site.domain, replacement: '[site]' },`; L42 `const match = replacements.find(({ value }) => text.startsWith(value, index));` | Exact, case-sensitive strings only: with domain `https://dev.example.com`, the bare host `dev.example.com` in an allow-list reason survives redaction. |
| G5 | WR-001, AC-9.5 | `buildReportModel.ts` L70 `detail: finding.detail.map(redact),` and L175 `snapshot: options.snapshot` … L182 `: null,`; the only snapshot-off tests use the Reviewed file: `buildReportModel.test.ts` L35 `it('keeps reviewed original reasons even when both includes are off', () => {` and `renderMarkdown.test.ts` L38 `it('leaves questions and snapshots out, but keeps reviewed reasons and provenance', () => {` | P5.3 removed the duplication at the type level, but no test uses a Needs-review file with a snapshot-only value, in either format or scope. |
| G6 | AC-9.6 title metadata | `reportFileName.ts` L12–L14 `: options.redact` / `? '[site]'` / `: result.facts.site.name;` and L22–L23 ``? `Server logic readiness: ${name}` `` / ``: `Site readiness report: ${name}`,`` | `model.title` is already redacted for site scope; nothing yet writes it into a PDF or tests it. |
| G7 | Brief: active/inactive labels (owner decision 2026-11-02) | `buildReportModel.ts` L81 `    name: file.name,` (the table cell and every section's `fileName` read it) | `ReportRow.active` is carried (L82 `active: file.active,`) but no format shows an inactive file differently. |
| G8 | P-10 | `reportFixtures.ts` exports `REPORT_OPTIONS`, `EXPORTED_AT`, `reportFinding`, `reportFile`, `reportResult` and, last, L99 `export function hostileReportResult(): SiteResult {` | No long fixture for pagination. |
| G9 | Brief: page numbers (owner decision 2026-11-02) | `renderPdf.ts` is the 5-line stub | No page numbers; the PDF has to number its pages. |

---

## Phase A — Failing tests

**Files:** create `testCmap.ts`, `pdfFonts.test.ts`, `pdfDrawing.test.ts`, `pdfTable.test.ts`, `renderPdf.test.ts`; edit `reportFixtures.ts`, `buildReportModel.test.ts`, `renderMarkdown.test.ts` (all under `src/features/inspector/report/`).

- [ ] **A1. Create `src/features/inspector/report/testCmap.ts`** (test support; nothing in the application imports it)

```typescript
// Test-only: reads which code points a TrueType font maps to a glyph (cmap formats 4 and 12).
// Nothing in the application imports this file, so it is not part of the bundle.

function tableOffset(view: DataView, tag: string): number {
  const count = view.getUint16(4);
  for (let index = 0; index < count; index++) {
    const record = 12 + index * 16;
    const name = String.fromCharCode(
      view.getUint8(record),
      view.getUint8(record + 1),
      view.getUint8(record + 2),
      view.getUint8(record + 3),
    );
    if (name === tag) return view.getUint32(record + 8);
  }
  throw new Error(`Font has no ${tag} table`);
}

function addFormat4(view: DataView, start: number, codePoints: Set<number>): void {
  const segmentsX2 = view.getUint16(start + 6);
  const ends = start + 14;
  const starts = ends + segmentsX2 + 2;
  const deltas = starts + segmentsX2;
  const ranges = deltas + segmentsX2;
  for (let segment = 0; segment < segmentsX2 / 2; segment++) {
    const first = view.getUint16(starts + segment * 2);
    const last = view.getUint16(ends + segment * 2);
    const delta = view.getInt16(deltas + segment * 2);
    const rangeOffset = view.getUint16(ranges + segment * 2);
    for (let code = first; code <= last && code !== 0xffff; code++) {
      const glyph =
        rangeOffset === 0
          ? (code + delta) & 0xffff
          : view.getUint16(ranges + segment * 2 + rangeOffset + (code - first) * 2);
      if (glyph !== 0) codePoints.add(code);
    }
  }
}

function addFormat12(view: DataView, start: number, codePoints: Set<number>): void {
  const groups = view.getUint32(start + 12);
  for (let group = 0; group < groups; group++) {
    const record = start + 16 + group * 12;
    if (view.getUint32(record + 8) === 0) continue;
    for (let code = view.getUint32(record); code <= view.getUint32(record + 4); code++) {
      codePoints.add(code);
    }
  }
}

export function cmapCodePoints(font: Uint8Array): ReadonlySet<number> {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const cmap = tableOffset(view, 'cmap');
  const codePoints = new Set<number>();
  for (let index = 0; index < view.getUint16(cmap + 2); index++) {
    const subtable = cmap + view.getUint32(cmap + 4 + index * 8 + 4);
    const format = view.getUint16(subtable);
    if (format === 4) addFormat4(view, subtable, codePoints);
    if (format === 12) addFormat12(view, subtable, codePoints);
  }
  return codePoints;
}
```

- [ ] **A2. `src/features/inspector/report/reportFixtures.ts`: append after L117** (G8). Current tail, verbatim:

```typescript
      connection: { ...result.facts.connection, name: `environment ${hostile}` },
    },
    files: [{ ...file, snapshot: { ...file.snapshot, roles: [`role ${hostile}`] } }],
    banners: [`Site banner ${hostile}`],
  };
}
```

Append a blank line, then:

```typescript
// 400 characters with no space, so a PDF cell must break inside the word.
export const LONG_FILE_NAME = `${'long-segment-'.repeat(31).slice(0, 397)}.js`;
// 3,000 characters of ordinary words: taller than a PDF page once wrapped into a narrow cell.
export const LONG_REASON = 'Global Read on account via Members. '.repeat(84).slice(0, 3000);

const LONG_CYCLE = [
  ['configured', 'configured', 'configured'],
  ['configured', 'needs-review', 'configured'],
  ['reviewed', 'configured', 'configured'],
  ['not-scanned', 'not-scanned', 'not-scanned'],
] as const;

/** Sixty files: fifty-nine ordinary ones and `long-text`: a 400-character name and a 3,000-character Reviewed table-permissions reason and Needs-review outbound reason. */
export function longReportResult(): SiteResult {
  const result = reportResult();
  const files = Array.from({ length: 59 }, (_, index) => {
    const id = String(index + 1).padStart(2, '0');
    return reportFile(`file-${id}`, `handler-${id}`, LONG_CYCLE.at(index % 4) ?? LONG_CYCLE[0]);
  });
  const long = reportFile('long-text', LONG_FILE_NAME, ['configured', 'reviewed', 'configured']);
  return {
    ...result,
    files: [
      ...files,
      {
        ...long,
        findings: [
          long.findings[0],
          {
            ...reportFinding('tablePermissions', 'reviewed'),
            summary: LONG_REASON,
            reasons: [{ text: LONG_REASON, readFailure: false }],
          },
          {
            ...reportFinding('outbound', 'needs-review'),
            summary: LONG_REASON,
            reasons: [{ text: LONG_REASON, readFailure: false }],
          },
        ],
      },
    ],
  };
}

export const REPORT_FIXTURE_CASES: readonly {
  readonly name: string;
  readonly result: () => SiteResult;
  readonly fileId: string;
}[] = [
  { name: 'standard', result: reportResult, fileId: 'customer' },
  { name: 'long', result: longReportResult, fileId: 'long-text' },
  { name: 'hostile', result: hostileReportResult, fileId: 'hostile' },
];
```

- [ ] **A3. `src/features/inspector/report/buildReportModel.test.ts`** (G4, G5)

Add the type import after L1 (`import { describe, expect, it, vi } from 'vitest';`):

```diff
 import { describe, expect, it, vi } from 'vitest';
+import type { SiteResult } from '@/types/inspector';
 import { buildReportModel } from './buildReportModel';
```

Append after L155. Current tail, verbatim:

```typescript
  });

  it('rejects a missing selected file rather than exporting a different file', () => {
    expect(() =>
      buildReportModel(reportResult(), { ...REPORT_OPTIONS, fileId: 'missing' }, EXPORTED_AT),
    ).toThrow('Select a file first');
  });
});
```

Append a blank line, then:

```typescript
describe('snapshot ownership (WR-001)', () => {
  const sentinel = 'snapshot-only.example';

  function sentinelResult(): SiteResult {
    const result = reportResult();
    const file = reportFile('customer', 'customer-summary.js', [
      'configured',
      'needs-review',
      'configured',
    ]);
    result.files = [
      {
        ...file,
        snapshot: { ...file.snapshot, outbound: [`ServerLogic/AllowedDomains = ${sentinel}`] },
      },
    ];
    return result;
  }

  // The model keeps raw configuration rows only in FileResult.snapshot (P5.3), so this pins the boundary.
  it.each(['file', 'site'] as const)(
    'leaves a snapshot-only value out of the %s model when the snapshot is off, and keeps the reasons',
    (scope) => {
      const model = buildReportModel(
        sentinelResult(),
        { ...REPORT_OPTIONS, scope, snapshot: false },
        EXPORTED_AT,
      );
      expect(JSON.stringify(model)).not.toContain(sentinel);
      expect(model.snapshot).toBeNull();
      expect(model.rows[0]?.checks[1]?.reasons).toEqual(['Global Read on account via Members.']);
      const sections = scope === 'file' ? model.needsReview : model.reviewFirst;
      expect(sections[0]).toMatchObject({
        summary: 'Global Read on account via Members.',
        guidance: 'Review tablePermissions configuration.',
      });
    },
  );

  it.each(['file', 'site'] as const)(
    'carries it once, in the snapshot, in the %s model when the snapshot is on',
    (scope) => {
      const model = buildReportModel(
        sentinelResult(),
        { ...REPORT_OPTIONS, scope, snapshot: true },
        EXPORTED_AT,
      );
      expect(JSON.stringify(model).split(sentinel)).toHaveLength(2);
      expect(model.snapshot?.[0]?.outbound).toEqual([`ServerLogic/AllowedDomains = ${sentinel}`]);
    },
  );
});

describe('redaction aliases (WR-002)', () => {
  const unredacted =
    'Allowed dev.example.com, DEV.EXAMPLE.COM, https://dev.example.com/path, dev.example.com:8443 and x.dev.example.com, not other-dev.example.com, dev.example.com-sync or api.example.com.';
  const redacted =
    'Allowed [site], [site], [site]/path, [site]:8443 and x.[site], not other-dev.example.com, dev.example.com-sync or api.example.com.';

  // A bare domain is itself an original string, so it still redacts inside longer names.
  const redactedBare =
    'Allowed [site], [site], [site]/path, [site]:8443 and x.[site], not other-[site], [site]-sync or api.example.com.';

  function hostResult(domain: string): SiteResult {
    const result = reportResult();
    result.facts.site = { ...result.facts.site, domain };
    const file = reportFile('customer', 'dev.example.com.js', [
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
            summary: unredacted,
            reasons: [{ text: unredacted, readFailure: false }],
            guidance: unredacted,
            questions: [unredacted],
            detail: [unredacted],
          },
          file.findings[2],
        ],
        snapshot: { roles: [unredacted], tables: [unredacted], outbound: [unredacted] },
      },
    ];
    result.banners = [unredacted];
    return result;
  }

  it.each(['file', 'site'] as const)(
    'redacts the hostname of a URL, bare or pathed site domain everywhere in the %s model',
    (scope) => {
      for (const domain of [
        'https://dev.example.com',
        'dev.example.com',
        'https://dev.example.com/portal',
      ]) {
        const model = buildReportModel(
          hostResult(domain),
          { ...REPORT_OPTIONS, scope, redact: true },
          EXPORTED_AT,
        );
        const expected = domain === 'dev.example.com' ? redactedBare : redacted;
        const section = (scope === 'file' ? model.needsReview : model.reviewFirst)[0];
        expect(model.rows[0]?.checks[1]).toMatchObject({
          finding: expected,
          reasons: [expected],
          guidance: expected,
          questions: [expected],
          detail: [expected],
        });
        expect(section).toMatchObject({
          summary: expected,
          guidance: expected,
          detail: [expected],
        });
        expect(model.banners).toEqual([expected]);
        expect(model.snapshot?.[0]).toMatchObject({
          roles: [expected],
          tables: [expected],
          outbound: [expected],
        });
      }
    },
  );

  it('keeps server logic file names, even when they contain the site host', () => {
    for (const scope of ['file', 'site'] as const) {
      const model = buildReportModel(
        hostResult('https://dev.example.com'),
        { ...REPORT_OPTIONS, scope, redact: true },
        EXPORTED_AT,
      );
      expect(model.rows[0]?.name).toBe('dev.example.com.js');
      expect(model.snapshot?.[0]?.fileName).toBe('dev.example.com.js');
      expect((scope === 'file' ? model.needsReview : model.reviewFirst)[0]?.fileName).toBe(
        'dev.example.com.js',
      );
    }
  });

  it('redacts the title and stem of a site report and leaves a file report title alone', () => {
    const site = buildReportModel(
      hostResult('https://dev.example.com'),
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    expect(site.title).toBe('Site readiness report: [site]');
    expect(site.stem).toBe('site');
    const file = buildReportModel(
      hostResult('https://dev.example.com'),
      { ...REPORT_OPTIONS, redact: true },
      EXPORTED_AT,
    );
    expect(file.title).toBe('Server logic readiness: dev.example.com.js');
  });

  it('redacts the environment URL host and an alias with a port, ignoring case', () => {
    const result = hostResult('https://dev.example.com:8443/x');
    result.facts.connection = {
      ...result.facts.connection,
      url: 'https://contoso.crm.dynamics.com/main.aspx',
    };
    result.banners = [
      'dev.example.com:8443 dev.example.com contoso.crm.dynamics.com Contoso.CRM.dynamics.com',
    ];
    const model = buildReportModel(
      result,
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    expect(model.banners).toEqual(['[site] [site] [environment] [environment]']);
  });

  it('keeps configured strings as exact substrings and bounds only the host aliases', () => {
    const result = reportResult();
    result.banners = [
      'Contoso-Prod ContosoCRM contoso other-contoso.crm.dynamics.com CONTOSO.crm.dynamics.com',
    ];
    const model = buildReportModel(
      result,
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    expect(model.banners).toEqual([
      '[environment]-Prod [environment]CRM contoso other-contoso.crm.dynamics.com [environment]',
    ]);
  });

  it('skips an identifier that is not a URL and matches it exactly', () => {
    const result = reportResult();
    result.facts.site = { ...result.facts.site, name: 'Portal', domain: 'not a url' };
    result.banners = ['Portal portals my-portal not a url, Not A Url.'];
    const model = buildReportModel(
      result,
      { ...REPORT_OPTIONS, scope: 'site', redact: true },
      EXPORTED_AT,
    );
    expect(model.banners).toEqual(['[site] portals my-portal [site], Not A Url.']);
  });

  it('changes nothing when redaction is off', () => {
    const model = buildReportModel(
      hostResult('https://dev.example.com'),
      { ...REPORT_OPTIONS, scope: 'site', redact: false },
      EXPORTED_AT,
    );
    expect(model.banners).toEqual([unredacted]);
  });
});

describe('inactive files', () => {
  function inactiveResult(): SiteResult {
    const result = reportResult();
    const inactive = reportFile('old', 'old-handler', [
      'configured',
      'needs-review',
      'not-scanned',
    ]);
    result.files = [
      { ...inactive, active: false },
      reportFile('live', 'live-handler', ['configured', 'configured', 'configured']),
    ];
    return result;
  }

  it('labels an inactive file in the site table and the Review first and Not scanned entries', () => {
    const model = buildReportModel(
      inactiveResult(),
      { ...REPORT_OPTIONS, scope: 'site' },
      EXPORTED_AT,
    );
    expect(model.rows.map((row) => row.name)).toEqual(['live-handler', 'old-handler (Inactive)']);
    expect(model.reviewFirst.map((section) => section.fileName)).toEqual([
      'old-handler (Inactive)',
    ]);
    expect(model.notScanned.map((section) => section.fileName)).toEqual(['old-handler (Inactive)']);
    expect(model.snapshot?.map((snapshot) => snapshot.fileName)).toEqual([
      'live-handler',
      'old-handler',
    ]);
  });

  it('keeps the stored name in the file report title, stem and file name', () => {
    const model = buildReportModel(
      inactiveResult(),
      { ...REPORT_OPTIONS, fileId: 'old' },
      EXPORTED_AT,
    );
    expect(model.title).toBe('Server logic readiness: old-handler');
    expect(model.stem).toBe('old-handler');
    expect(reportFileName(model)).toBe('old-handler-readiness.md');
    expect(reportFileNameBeforeBuild(inactiveResult(), { ...REPORT_OPTIONS, fileId: 'old' })).toBe(
      'old-handler-readiness.md',
    );
  });

  it('leaves active files unlabelled', () => {
    const model = buildReportModel(
      inactiveResult(),
      { ...REPORT_OPTIONS, fileId: 'live' },
      EXPORTED_AT,
    );
    expect(model.title).toBe('Server logic readiness: live-handler');
  });
});
```

- [ ] **A4. `src/features/inspector/report/renderMarkdown.test.ts`** (G5)

Replace L6 (`reportFile` joins the import):

```typescript
import { EXPORTED_AT, REPORT_OPTIONS, hostileReportResult, reportResult } from './reportFixtures';
```

with:

```typescript
import {
  EXPORTED_AT,
  REPORT_OPTIONS,
  hostileReportResult,
  reportFile,
  reportResult,
} from './reportFixtures';
```

Insert before the final `});` (L72). Current tail, verbatim:

```typescript
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

Insert after L71 (`  });`), with a blank line before it:

```typescript
  it.each(['file', 'site'] as const)(
    'exports a snapshot-only value only under the snapshot, and keeps the reasons (%s)',
    (scope) => {
      const sentinel = 'snapshot-only.example';
      const result = reportResult();
      const file = reportFile('customer', 'customer-summary.js', [
        'configured',
        'needs-review',
        'configured',
      ]);
      result.files = [
        {
          ...file,
          snapshot: { ...file.snapshot, outbound: [`ServerLogic/AllowedDomains = ${sentinel}`] },
        },
      ];
      const off = renderMarkdown(
        buildReportModel(result, { ...REPORT_OPTIONS, scope, snapshot: false }, EXPORTED_AT),
      );
      expect(off).not.toContain(sentinel);
      expect(off).not.toContain('Configuration snapshot');
      expect(off).toContain('Global Read on account via Members.');
      expect(off).toContain('Review tablePermissions configuration.');
      const on = renderMarkdown(
        buildReportModel(result, { ...REPORT_OPTIONS, scope, snapshot: true }, EXPORTED_AT),
      );
      expect(on.split(sentinel)).toHaveLength(2);
      expect(on.indexOf(sentinel)).toBeGreaterThan(on.indexOf('### Configuration snapshot'));
      expect(on).toContain('Global Read on account via Members.');
    },
  );

  it('labels an inactive file in the site table and lists, but not the H2 or snapshot heading', () => {
    const result = reportResult();
    const inactive = reportFile('old', 'old-handler', [
      'configured',
      'needs-review',
      'not-scanned',
    ]);
    result.files = [{ ...inactive, active: false }];
    const file = renderMarkdown(
      buildReportModel(result, { ...REPORT_OPTIONS, fileId: 'old' }, EXPORTED_AT),
    );
    expect(file).toContain('## Server logic readiness: old-handler\n');
    expect(file).toContain('- Outbound networking: old-handler (Inactive) — ');
    const site = renderMarkdown(
      buildReportModel(result, { ...REPORT_OPTIONS, scope: 'site' }, EXPORTED_AT),
    );
    expect(site).toContain('| old-handler (Inactive) |');
    expect(site).toContain('### Table permissions: old-handler (Inactive)');
    expect(site).toContain('Outbound networking: old-handler (Inactive) — ');
    expect(site).toContain('### Configuration snapshot: old-handler\n');
  });
```

- [ ] **A5. Create `src/features/inspector/report/pdfFonts.test.ts`** (`@vitest-environment node`, because it reads the TTFs through `fs` with a `file:` URL, as `renderMarkdown.test.ts` does; the other three PDF test files run in the default jsdom environment)

```typescript
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as copy from '@/features/inspector/model/copy';
import { buildReportModel } from './buildReportModel';
import {
  PDF_FACE_FILES,
  PDF_FACE_NAMES,
  SUPPORTED_RANGES,
  createPdfDocument,
  createTextGuard,
  wrapText,
} from './pdfFonts';
import type { PdfFace } from './pdfFonts';
import { EXPORTED_AT, REPORT_FIXTURE_CASES, REPORT_OPTIONS } from './reportFixtures';
import { drawReport } from './renderPdf';
import { cmapCodePoints } from './testCmap';

const FONT_DIR = new URL('../../../assets/fonts/', import.meta.url);
const CHECK_MARK = 0x2713;

const coverage = new Map<PdfFace, ReadonlySet<number>>(
  PDF_FACE_NAMES.map((face) => [
    face,
    cmapCodePoints(readFileSync(new URL(PDF_FACE_FILES[face], FONT_DIR))),
  ]),
);

// A line break is layout, not a glyph; every other character must be in the face it is written in.
function uncovered(face: PdfFace, text: string): string[] {
  const codePoints = coverage.get(face);
  if (codePoints === undefined) throw new Error(`No coverage for ${face}`);
  return Array.from(text).filter(
    (char) => char !== '\n' && !codePoints.has(char.codePointAt(0) ?? 0),
  );
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(strings);
  return [];
}

describe('PDF fonts', () => {
  it('reads the cmap of each embedded TTF', () => {
    for (const face of PDF_FACE_NAMES) {
      expect(uncovered(face, 'Ab0 !|*<>[]#`')).toEqual([]);
      expect(uncovered(face, '· – —')).toEqual([]);
    }
    expect(() => cmapCodePoints(new Uint8Array(12))).toThrow('Font has no cmap table');
  });

  it('shows DM Sans and Space Grotesk have no U+2713, so the glyph is a vector', () => {
    for (const face of ['body', 'bodyBold', 'heading'] as const) {
      expect(coverage.get(face)?.has(CHECK_MARK)).toBe(false);
    }
  });

  it('embeds DM Sans 400/700, Space Grotesk 700 and JetBrains Mono 400', () => {
    const fonts = createPdfDocument().getFontList();
    expect(fonts.DMSans).toEqual(expect.arrayContaining(['normal', 'bold']));
    expect(fonts.SpaceGrotesk).toEqual(['bold']);
    expect(fonts.JetBrainsMono).toEqual(['normal']);
  });

  it('writes only characters its font covers, for the standard, long and hostile fixtures in both scopes', () => {
    const used = new Set<PdfFace>();
    for (const { name, result, fileId } of REPORT_FIXTURE_CASES) {
      for (const scope of ['file', 'site'] as const) {
        for (const redact of [false, true]) {
          const model = buildReportModel(
            result(),
            { ...REPORT_OPTIONS, format: 'pdf', scope, fileId, redact },
            EXPORTED_AT,
          );
          const writes: { text: string; face: PdfFace }[] = [];
          drawReport(createPdfDocument(), model, (text, face) => {
            writes.push({ text, face });
          });
          expect(writes.length, name).toBeGreaterThan(20);
          for (const { text, face } of writes) {
            used.add(face);
            expect(uncovered(face, text), `${name} ${scope} ${face}: ${text}`).toEqual([]);
            expect(text).not.toContain('✓');
          }
        }
      }
    }
    expect([...used].toSorted()).toEqual([...PDF_FACE_NAMES].toSorted());
  });

  it('covers every string of the check copy and notes in the body face', () => {
    for (const text of strings(copy)) expect(uncovered('body', text), text).toEqual([]);
  });

  it('has a glyph in every embedded face for every code point of the supported ranges', () => {
    for (const face of PDF_FACE_NAMES) {
      const missing = SUPPORTED_RANGES.flatMap(([first, last]) =>
        Array.from({ length: last - first + 1 }, (_, offset) => first + offset),
      ).filter((codePoint) => coverage.get(face)?.has(codePoint) !== true);
      expect(
        missing.map((codePoint) => codePoint.toString(16)),
        face,
      ).toEqual([]);
    }
  });

  it('replaces each code point outside the ranges with ? and counts it', () => {
    const guard = createTextGuard();
    expect(guard.clean('a日b😀 c\td')).toBe('a?b? c?d');
    expect(guard.replaced()).toBe(3);
    expect(guard.clean('x\r\ny\rz\u2713\u00ad')).toBe('x\ny\nz??');
    expect(guard.replaced()).toBe(5);
    expect(guard.clean('é Ł · – — … ‘ ’ “ ” •')).toBe('é Ł · – — … ‘ ’ “ ” •');
    expect(guard.replaced()).toBe(5);
  });

  it('flags a character outside the fonts, which jsPDF would otherwise drop silently', () => {
    expect(uncovered('body', 'file 日本語 ✓')).toEqual(['日', '本', '語', '✓']);
    expect(uncovered('mono', 'résumé-ł.js')).toEqual([]);
  });

  it('wraps long words and newlines without dropping characters', () => {
    const doc = createPdfDocument();
    const word = 'x'.repeat(400);
    const lines = wrapText(doc, word, 200, 'mono', 10);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe(word);
    for (const line of lines) expect(doc.getTextWidth(line)).toBeLessThanOrEqual(200.01);
    expect(wrapText(doc, 'a\r\nb\rc\nd', 200, 'body', 10)).toEqual(['a', 'b', 'c', 'd']);
  });
});
```

- [ ] **A6. Create `src/features/inspector/report/pdfDrawing.test.ts`**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { RING_GAP_DEG, ringArcs } from '@/lib/ringGeometry';
import type { RingState } from '@/lib/ringGeometry';
import { REPORT_PALETTE, drawCheckmark, drawRing, ringColor } from './pdfDrawing';
import { createPdfDocument } from './pdfFonts';

function luminance(hex: string): number {
  const channel = (offset: number): number => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].toSorted((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const many = (count: number, state: RingState): RingState[] =>
  Array.from({ length: count }, () => state);

describe('report palette', () => {
  it('holds the handoff colours with the A8 adjustments', () => {
    expect(REPORT_PALETTE).toMatchObject({
      ink: '#14213d',
      muted: '#55607a',
      rules: '#dfe4ee',
      blueChip: '#1e6dcd',
      blueTint: '#eaf2fd',
      orange: '#b05408',
      orangeTint: '#fdf0e3',
    });
  });

  it('keeps every text pair at 4.5:1 or better', () => {
    const { white, ink, muted, blueChip, blueTint, orange, orangeTint, grey, greyTint } =
      REPORT_PALETTE;
    for (const [foreground, background] of [
      [ink, white],
      [muted, white],
      [blueChip, white],
      [orange, white],
      [blueChip, blueTint],
      [orange, orangeTint],
      [ink, orangeTint],
      [muted, greyTint],
    ] as const) {
      expect(
        contrast(foreground, background),
        `${foreground} on ${background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    // The ring grey is a graphic, not text.
    expect(contrast(grey, white)).toBeGreaterThanOrEqual(2.5);
  });

  it('colours ring states blue, orange and grey', () => {
    expect([ringColor('done'), ringColor('review'), ringColor('not-scanned')]).toEqual([
      REPORT_PALETTE.blue,
      REPORT_PALETTE.orange,
      REPORT_PALETTE.grey,
    ]);
  });
});

describe('drawCheckmark', () => {
  it('is a three-point vector path and writes no text', () => {
    const doc = createPdfDocument();
    const moveTo = vi.spyOn(doc, 'moveTo');
    const lineTo = vi.spyOn(doc, 'lineTo');
    const stroke = vi.spyOn(doc, 'stroke');
    const text = vi.spyOn(doc, 'text');
    drawCheckmark(doc, 10, 20, 10, REPORT_PALETTE.blueChip);
    expect(moveTo.mock.calls).toEqual([[10, 25.5]]);
    expect(lineTo.mock.calls).toHaveLength(2);
    expect(lineTo.mock.calls[0]?.[0]).toBeCloseTo(13.8);
    expect(lineTo.mock.calls[1]).toEqual([20, 21]);
    expect(stroke).toHaveBeenCalledTimes(1);
    expect(text).not.toHaveBeenCalled();
  });
});

describe('drawRing', () => {
  const cx = 100;
  const cy = 100;
  const radius = 40;
  const at = (degrees: number): [number, number] => [
    cx + radius * Math.sin((degrees * Math.PI) / 180),
    cy - radius * Math.cos((degrees * Math.PI) / 180),
  ];

  function draw(segments: readonly RingState[]) {
    const doc = createPdfDocument();
    const moveTo = vi.spyOn(doc, 'moveTo');
    const curveTo = vi.spyOn(doc, 'curveTo');
    const stroke = vi.spyOn(doc, 'stroke');
    const color = vi.spyOn(doc, 'setDrawColor');
    drawRing(doc, cx, cy, radius, 10, segments);
    return { moveTo, curveTo, stroke, color };
  }

  it('draws one arc per check with the 4 degree gap, each Bezier at most 90 degrees', () => {
    const segments = [...many(6, 'done'), ...many(3, 'review')];
    const { moveTo, curveTo, stroke, color } = draw(segments);
    const arcs = ringArcs(segments);
    expect(arcs).toHaveLength(9);
    expect(moveTo).toHaveBeenCalledTimes(9);
    expect(curveTo).toHaveBeenCalledTimes(9);
    expect(stroke).toHaveBeenCalledTimes(9);
    expect(color.mock.calls.map(([value]) => value)).toEqual([
      ...many(6, 'done').map(ringColor),
      ...many(3, 'review').map(ringColor),
    ]);
    for (const [index, arc] of arcs.entries()) {
      const [x, y] = at(arc.startDeg);
      expect(moveTo.mock.calls[index]?.[0]).toBeCloseTo(x, 3);
      expect(moveTo.mock.calls[index]?.[1]).toBeCloseTo(y, 3);
      const next = arcs[index + 1];
      if (next !== undefined) expect(next.startDeg - arc.endDeg).toBeCloseTo(RING_GAP_DEG, 6);
    }
  });

  it('splits arcs wider than 90 degrees and lands each on its end angle', () => {
    const segments = many(3, 'done');
    const { curveTo } = draw(segments);
    const arcs = ringArcs(segments);
    let drawn = 0;
    for (const arc of arcs) {
      drawn += Math.ceil((arc.endDeg - arc.startDeg) / 90);
      const last = curveTo.mock.calls[drawn - 1];
      const [x, y] = at(arc.endDeg);
      expect(last?.[4]).toBeCloseTo(x, 3);
      expect(last?.[5]).toBeCloseTo(y, 3);
    }
    expect(curveTo).toHaveBeenCalledTimes(drawn);
    expect(drawn).toBe(6);
  });

  it('draws a single check as a full circle in four quarter arcs', () => {
    const { moveTo, curveTo } = draw(['done']);
    expect(moveTo).toHaveBeenCalledTimes(1);
    expect(curveTo).toHaveBeenCalledTimes(4);
    expect(curveTo.mock.calls[3]?.[4]).toBeCloseTo(cx, 3);
    expect(curveTo.mock.calls[3]?.[5]).toBeCloseTo(cy - radius, 3);
  });

  it('falls back to at most three proportional arcs above 30 checks', () => {
    const { moveTo, color } = draw([
      ...many(20, 'done'),
      ...many(6, 'review'),
      ...many(5, 'not-scanned'),
    ]);
    expect(moveTo).toHaveBeenCalledTimes(3);
    expect(color.mock.calls.map(([value]) => value)).toEqual([
      REPORT_PALETTE.blue,
      REPORT_PALETTE.orange,
      REPORT_PALETTE.grey,
    ]);
  });

  it('draws nothing for no checks', () => {
    const { moveTo, stroke } = draw([]);
    expect(moveTo).not.toHaveBeenCalled();
    expect(stroke).not.toHaveBeenCalled();
  });
});
```

- [ ] **A7. Create `src/features/inspector/report/pdfTable.test.ts`**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { REPORT_PALETTE } from './pdfDrawing';
import { createPdfDocument, wrapText } from './pdfFonts';
import {
  CELL_PADDING,
  TABLE_FONT_SIZE,
  drawPdfTable,
  maxRowLines,
  pdfCell,
  preparePdfRows,
} from './pdfTable';
import type { PdfColumn, PdfRow } from './pdfTable';

const COLUMNS: readonly PdfColumn[] = [
  { header: 'Check', width: 120 },
  { header: 'Status', width: 100 },
  { header: 'Finding', width: 300 },
];
const WORDS = Array.from({ length: 1500 }, (_, index) => `w${String(index)}`).join(' ');

function row(label: string, finding: string, extra: Partial<PdfRow> = {}): PdfRow {
  return {
    label,
    ring: null,
    cells: [
      pdfCell(label, { face: 'bodyBold' }),
      pdfCell('Configured', { tick: true, color: REPORT_PALETTE.blueChip }),
      pdfCell(finding),
    ],
    ...extra,
  };
}

describe('preparePdfRows', () => {
  it('keeps a row that fits as one printed row with its label', () => {
    const doc = createPdfDocument();
    const [only, ...rest] = preparePdfRows(
      doc,
      COLUMNS,
      [row('Web role', 'Members can call it.')],
      0,
      10,
    );
    expect(rest).toEqual([]);
    expect(only).toMatchObject({ owner: 0, part: 0, parts: 1 });
    expect(only?.cells.map((cell) => cell.lines)).toEqual([
      ['Web role'],
      ['Configured'],
      ['Members can call it.'],
    ]);
  });

  it('splits an oversized cell into labelled continuation rows and loses no text', () => {
    const doc = createPdfDocument();
    const original = row('Table permissions', WORDS, { ring: ['done', 'review', 'done'] });
    const printed = preparePdfRows(doc, COLUMNS, [original], 0, 10);
    const expected = wrapText(doc, WORDS, 300 - 2 * CELL_PADDING, 'body', TABLE_FONT_SIZE);
    expect(expected.length).toBeGreaterThan(30);
    expect(printed).toHaveLength(Math.ceil(expected.length / 10));
    expect(printed.flatMap((part) => part.cells[2]?.lines ?? [])).toEqual(expected);
    for (const part of printed) {
      expect(part.parts).toBe(printed.length);
      for (const cell of part.cells) expect(cell.lines.length).toBeLessThanOrEqual(10);
    }
    const labels = printed.map((part) => (part.cells[0]?.lines ?? []).join(' '));
    expect(labels[0]).toBe('Table permissions');
    expect(labels[1]).toBe(`Table permissions (continued 2/${String(printed.length)})`);
    expect(labels.at(-1)).toBe(
      `Table permissions (continued ${String(printed.length)}/${String(printed.length)})`,
    );
    // Marks and the ring belong to the first printed part only.
    expect(printed.map((part) => part.cells[1]?.cell.tick)).toEqual([
      true,
      ...Array.from({ length: printed.length - 1 }, () => false),
    ]);
    expect(printed.map((part) => part.ring !== null)).toEqual([
      true,
      ...Array.from({ length: printed.length - 1 }, () => false),
    ]);
  });

  it('breaks a word wider than its column without dropping characters', () => {
    const doc = createPdfDocument();
    const word = 'y'.repeat(2000);
    const printed = preparePdfRows(doc, COLUMNS, [row('Outbound networking', word)], 0, 8);
    expect(printed.length).toBeGreaterThan(1);
    expect(printed.flatMap((part) => part.cells[2]?.lines ?? []).join('')).toBe(word);
  });

  it('rejects a row with more cells than columns', () => {
    const doc = createPdfDocument();
    const wide: PdfRow = {
      label: 'x',
      ring: null,
      cells: [pdfCell('a'), pdfCell('b'), pdfCell('c'), pdfCell('d')],
    };
    expect(() => preparePdfRows(doc, COLUMNS, [wide], 0, 10)).toThrow('more cells than columns');
  });
});

describe('maxRowLines', () => {
  it('leaves room for the repeated head on a landscape A4 page', () => {
    const doc = createPdfDocument();
    const lines = maxRowLines(doc);
    const height = lines * TABLE_FONT_SIZE * doc.getLineHeightFactor() + 2 * CELL_PADDING;
    expect(lines).toBeGreaterThan(30);
    expect(height).toBeLessThan(doc.internal.pageSize.getHeight() - 2 * 36 - 20);
  });
});

describe('drawPdfTable', () => {
  const rows = [
    ...Array.from({ length: 30 }, (_, index) =>
      row(`Row ${String(index)}`, `short ${String(index)}`),
    ),
    row('Giant', WORDS),
    ...Array.from({ length: 30 }, (_, index) =>
      row(`After ${String(index)}`, `tail ${String(index)}`),
    ),
  ];

  it('repeats the head on every page and never lets a printed row span two pages', () => {
    const doc = createPdfDocument();
    const evidence = drawPdfTable(doc, { columns: COLUMNS, rows, labelColumn: 0, startY: 120 });
    const pages = [...new Set(evidence.rows.map((printed) => printed.page))];
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    expect(evidence.logicalRows).toBe(61);
    expect(evidence.physicalRows).toBeGreaterThan(61);
    expect(evidence.rows).toHaveLength(evidence.physicalRows);
    expect(evidence.rows.filter((printed) => printed.spansMultiplePages)).toEqual([]);
    expect(evidence.headPages).toEqual(pages);
    expect(evidence.rows.map((printed) => printed.page)).toEqual(
      evidence.rows.map((printed) => printed.page).toSorted((a, b) => a - b),
    );
    expect(evidence.finalY).toBeGreaterThan(36);
  });

  it('hands every word of every cell to the document exactly once', () => {
    const doc = createPdfDocument();
    const seen: string[] = [];
    drawPdfTable(doc, { columns: COLUMNS, rows, labelColumn: 0, startY: 120 }, (text) => {
      seen.push(text);
    });
    const tokens = (value: string): string[] =>
      value.split(/\s+/).filter((token) => /^w\d+$/.test(token));
    expect(seen.flatMap(tokens).toSorted()).toEqual(tokens(WORDS).toSorted());
    expect(seen.filter((text) => text.includes('(continued ')).length).toBeGreaterThan(1);
  });

  it('draws ring, tick and pill once for a row printed in several parts', () => {
    const doc = createPdfDocument();
    const curveTo = vi.spyOn(doc, 'curveTo');
    const pill = vi.spyOn(doc, 'roundedRect');
    const lineTo = vi.spyOn(doc, 'lineTo');
    const evidence = drawPdfTable(doc, {
      columns: COLUMNS,
      rows: [
        {
          ...row('Giant', WORDS, { ring: ['done', 'review', 'not-scanned'] }),
          cells: [
            pdfCell('Giant'),
            pdfCell('Ready', { pill: REPORT_PALETTE.blueTint, tick: true }),
            pdfCell(WORDS),
          ],
        },
      ],
      labelColumn: 0,
      startY: 100,
    });
    expect(evidence.physicalRows).toBeGreaterThan(1);
    // Three 116 degree arcs, two Beziers each, drawn once.
    expect(curveTo).toHaveBeenCalledTimes(6);
    expect(pill).toHaveBeenCalledTimes(1);
    expect(lineTo).toHaveBeenCalledTimes(2);
  });

  it('leaves the cell behind a pill unfilled so the pill shows', () => {
    const doc = createPdfDocument();
    const rect = vi.spyOn(doc, 'rect');
    drawPdfTable(doc, {
      columns: COLUMNS,
      rows: [
        {
          label: 'Result',
          ring: null,
          cells: [
            pdfCell('Ready'),
            pdfCell('x'),
            pdfCell('Ready', { pill: REPORT_PALETTE.blueTint }),
          ],
        },
      ],
      labelColumn: 0,
      startY: 100,
    });
    // Body cells are filled white by the grid theme; the pill cell must be stroked only.
    const styles = rect.mock.calls.map(([, , , , style]) => style);
    expect(styles.slice(-3)).toEqual(['DF', 'DF', 'S']);
  });

  it('prints a one-row table on the first page below its start', () => {
    const doc = createPdfDocument();
    const evidence = drawPdfTable(doc, {
      columns: COLUMNS,
      rows: [row('Web role', 'Members can call it.')],
      labelColumn: 0,
      startY: 100,
    });
    expect(doc.getNumberOfPages()).toBe(1);
    expect(evidence.headPages).toEqual([1]);
    expect(evidence.finalY).toBeGreaterThan(100);
  });
});
```

- [ ] **A8. Create `src/features/inspector/report/renderPdf.test.ts`**

```typescript
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';
import { buildReportModel } from './buildReportModel';
import { createPdfDocument } from './pdfFonts';
import type { PdfFace } from './pdfFonts';
import {
  EXPORTED_AT,
  LONG_FILE_NAME,
  LONG_REASON,
  REPORT_FIXTURE_CASES,
  REPORT_OPTIONS,
  hostileReportResult,
  longReportResult,
  reportFile,
  reportResult,
} from './reportFixtures';
import { drawReport, renderPdf } from './renderPdf';

const SCOPES = ['file', 'site'] as const;

function pdfOptions(scope: 'file' | 'site', fileId: string, patch: Partial<ReportOptions> = {}) {
  return { ...REPORT_OPTIONS, format: 'pdf', scope, fileId, ...patch } satisfies ReportOptions;
}

function draw(result: SiteResult, options: ReportOptions) {
  const model = buildReportModel(result, options, EXPORTED_AT);
  const doc = createPdfDocument();
  const writes: { text: string; face: PdfFace }[] = [];
  const table = drawReport(doc, model, (text, face) => {
    writes.push({ text, face });
  });
  return { model, doc, table, writes };
}

const squash = (text: string): string => text.replace(/\s+/g, '');
const latin1 = (bytes: Uint8Array): string => new TextDecoder('latin1').decode(bytes);

describe('renderPdf', () => {
  it.each(SCOPES)('returns real PDF bytes for the %s scope', (scope) => {
    const model = buildReportModel(reportResult(), pdfOptions(scope, 'customer'), EXPORTED_AT);
    const bytes = renderPdf(model);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(latin1(bytes.slice(0, 5))).toBe('%PDF-');
    expect(latin1(bytes.slice(-8))).toContain('%%EOF');
    expect(bytes.length).toBeGreaterThan(20_000);
    // RG-005, partly: text operators and a ToUnicode map per font make the text selectable; no raster.
    const pdf = latin1(bytes);
    expect(pdf).toContain(' Tj');
    expect(pdf.match(/\/ToUnicode/g)?.length).toBeGreaterThanOrEqual(1);
    expect(pdf).not.toContain('/Subtype /Image');
    expect(
      draw(reportResult(), pdfOptions(scope, 'customer')).doc.getNumberOfPages(),
    ).toBeGreaterThanOrEqual(1);
  });

  it('paginates the long fixture in both scopes without splitting a printed row', () => {
    for (const scope of SCOPES) {
      const { doc, table } = draw(longReportResult(), pdfOptions(scope, 'long-text'));
      expect(doc.getNumberOfPages()).toBeGreaterThan(1);
      expect(table.rows.length).toBe(table.physicalRows);
      expect(table.rows.filter((row) => row.spansMultiplePages)).toEqual([]);
      const pages = new Set(table.rows.map((row) => row.page));
      for (const page of pages) expect(table.headPages).toContain(page);
    }
  });

  it('repeats the site table head on every page and labels continuation rows', () => {
    const { table, writes } = draw(longReportResult(), pdfOptions('site', 'long-text'));
    expect(table.logicalRows).toBe(60);
    expect(table.physicalRows).toBeGreaterThan(60);
    expect(new Set(table.rows.map((row) => row.page)).size).toBeGreaterThan(1);
    expect(table.headPages).toEqual([...new Set(table.rows.map((row) => row.page))]);
    const labels = writes.filter((write) => write.text.includes('(continued '));
    expect(labels.map((write) => /\(continued \d\/\d\)$/.exec(write.text)?.[0])).toEqual([
      '(continued 2/3)',
      '(continued 3/3)',
    ]);
  });

  it('builds the 60-file site report far inside the 5 s build budget (AC-9.9)', () => {
    const model = buildReportModel(
      longReportResult(),
      pdfOptions('site', 'long-text'),
      EXPORTED_AT,
    );
    const started = performance.now();
    renderPdf(model);
    expect(performance.now() - started).toBeLessThan(5_000);
  });

  it('writes the whole long reason and the whole long file name', () => {
    expect(LONG_FILE_NAME).toHaveLength(400);
    expect(LONG_REASON).toHaveLength(3000);
    const { writes } = draw(longReportResult(), pdfOptions('file', 'long-text'));
    const text = squash(writes.map((write) => write.text).join(''));
    expect(text).toContain(squash(LONG_REASON));
    // Reviewed table cell, Needs-review outbound cell and the outbound finding block.
    expect(text.split(squash(LONG_REASON)).length - 1).toBe(3);
    expect(text).toContain(LONG_FILE_NAME);
  });

  it('writes what the model holds for the standard fixture in both scopes', () => {
    for (const scope of SCOPES) {
      const result = reportResult();
      result.banners = ['Server logic is disabled on this site (ServerLogic/Enabled = false)'];
      const { model, writes } = draw(result, pdfOptions(scope, 'customer'));
      const text = writes.map((write) => write.text).join('\n');
      for (const line of [model.header.brand, model.header.label, ...model.footer]) {
        expect(text).toContain(line);
      }
      for (const banner of model.banners) expect(text).toContain(banner);
      for (const row of model.rows) {
        expect(text).toContain(row.name);
        for (const check of row.checks) expect(text).toContain(check.statusText);
        if (scope === 'site') expect(text).toContain(row.result);
      }
      for (const line of model.lines) expect(text).toContain(line.text);
    }
  });

  it('keeps Reviewed distinct and shows its original reason in both scopes', () => {
    const site = draw(reportResult(), pdfOptions('site', 'customer'));
    // The cell wraps in its column, so compare without whitespace.
    expect(squash(site.writes.map((write) => write.text).join(''))).toContain(
      squash('Reviewed: Global Read on account via Members.'),
    );
    const file = draw(reportResult(), pdfOptions('file', 'reviewed', { questions: false }));
    const texts = file.writes.map((write) => write.text);
    expect(texts).toContain('Reviewed');
    expect(texts).toContain('Global Read on account via Members.');
  });

  it('numbers every page of the long site report and leaves no placeholder', () => {
    const { doc, writes } = draw(longReportResult(), pdfOptions('site', 'long-text'));
    const total = doc.getNumberOfPages();
    expect(total).toBeGreaterThan(20);
    const numbers = writes.map((write) => write.text).filter((text) => text.startsWith('Page '));
    expect(numbers).toEqual(
      Array.from({ length: total }, (_, index) => `Page ${String(index + 1)} of ${String(total)}`),
    );
    expect(latin1(new Uint8Array(doc.output('arraybuffer')))).not.toContain('total_pages_count');
  });

  it('labels an inactive file in the site PDF only, not in the file report title', () => {
    const result = reportResult();
    const inactive = reportFile('old', 'old-handler', ['configured', 'needs-review', 'configured']);
    result.files = [{ ...inactive, active: false }];
    const site = draw(result, pdfOptions('site', 'old'));
    expect(site.writes.map((write) => write.text)).toContain('old-handler (Inactive)');
    const file = draw(result, pdfOptions('file', 'old'));
    const texts = file.writes.map((write) => write.text);
    expect(texts).toContain('Server logic readiness: old-handler');
    expect(
      texts.some((text) => text.startsWith('Server logic readiness') && text.includes('Inactive')),
    ).toBe(false);
    expect(draw(result, pdfOptions('file', 'old')).model.stem).toBe('old-handler');
  });

  it('lists Review first and Not scanned in the model order', () => {
    const result = reportResult();
    result.files = [
      reportFile('z', 'Z', ['needs-review', 'needs-review', 'configured']),
      reportFile('a', 'A', ['needs-review', 'configured', 'needs-review']),
      reportFile('p', 'P', ['not-scanned', 'configured', 'not-scanned']),
    ];
    const { model, writes } = draw(result, pdfOptions('site', 'a'));
    const texts = writes.map((write) => write.text);
    const review = model.reviewFirst.map((section) => `${section.title}: ${section.fileName}`);
    const pending = model.notScanned.map(
      (section) => `${section.title}: ${section.fileName} — ${section.summary}`,
    );
    expect(review).toEqual([
      'Web role: A',
      'Web role: Z',
      'Table permissions: Z',
      'Outbound networking: A',
    ]);
    expect(pending).toHaveLength(2);
    for (const order of [review, pending]) {
      const positions = order.map((entry) => texts.indexOf(entry));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual(positions.toSorted((x, y) => x - y));
    }
    expect(texts.indexOf(review[0] ?? '')).toBeLessThan(texts.indexOf(pending[0] ?? ''));
  });

  it('draws text as text and never rasterises, fetches or embeds an image', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    try {
      const model = buildReportModel(
        hostileReportResult(),
        pdfOptions('file', 'hostile'),
        EXPORTED_AT,
      );
      const doc = createPdfDocument();
      const text = vi.spyOn(doc, 'text');
      const html = vi.spyOn(doc, 'html');
      const image = vi.spyOn(doc, 'addImage');
      drawReport(doc, model);
      expect(text.mock.calls.length).toBeGreaterThan(10);
      expect(text.mock.calls.some(([value]) => value === model.header.brand)).toBe(true);
      expect(html).not.toHaveBeenCalled();
      expect(image).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });

  it('keeps the hostile fixture literal in both scopes', () => {
    for (const scope of SCOPES) {
      const { doc, writes } = draw(hostileReportResult(), pdfOptions(scope, 'hostile'));
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
      expect(writes.map((write) => write.text).join('\n')).toContain('| * <script> [x](y)');
    }
  });

  it('redacts the title metadata and every written string for a redacted site report', () => {
    const result = reportResult();
    const options = pdfOptions('site', 'customer', { redact: true });
    const { doc, writes } = draw(result, options);
    const bytes = latin1(new Uint8Array(doc.output('arraybuffer')));
    expect(bytes).toContain('/Title (Site readiness report: [site])');
    const text = writes.map((write) => write.text).join('\n');
    for (const identifier of [
      'Contoso',
      'Customer portal',
      'contoso.crm.dynamics.com',
      'customer.powerappsportals.com',
    ]) {
      expect(text).not.toContain(identifier);
      expect(bytes).not.toContain(identifier);
    }
    expect(text).toContain('[environment]');
    expect(text).toContain('[site]');
  });

  it('sets the file report title from the model and keeps the file name unredacted', () => {
    const { doc, model } = draw(reportResult(), pdfOptions('file', 'customer', { redact: true }));
    const bytes = latin1(new Uint8Array(doc.output('arraybuffer')));
    expect(model.title).toBe('Server logic readiness: customer-summary.js');
    expect(bytes).toContain('/Title (Server logic readiness: customer-summary.js)');
  });

  it.each(SCOPES)(
    'writes snapshot-only configuration only when the snapshot is on (%s)',
    (scope) => {
      const result = reportResult();
      const file = reportFile('customer', 'customer-summary.js', [
        'configured',
        'needs-review',
        'configured',
      ]);
      result.files = [
        { ...file, snapshot: { ...file.snapshot, outbound: ['Allowed: snapshot-only.example'] } },
      ];
      const off = draw(result, pdfOptions(scope, 'customer', { snapshot: false }));
      expect(off.writes.some((write) => write.text.includes('snapshot-only.example'))).toBe(false);
      expect(off.writes.some((write) => write.text.includes('Configuration snapshot'))).toBe(false);
      const on = draw(result, pdfOptions(scope, 'customer', { snapshot: true }));
      expect(
        on.writes.filter((write) => write.text.includes('snapshot-only.example')),
      ).toHaveLength(1);
      expect(on.writes.some((write) => write.text.startsWith('Configuration snapshot'))).toBe(true);
      // Reasons and guidance stay with the snapshot off.
      expect(off.writes.some((write) => write.text.includes('Global Read on account'))).toBe(true);
      expect(off.writes.some((write) => write.text.includes('Review tablePermissions'))).toBe(true);
    },
  );

  it('writes the questions only when they are on', () => {
    const on = draw(reportResult(), pdfOptions('file', 'customer', { questions: true }));
    const off = draw(reportResult(), pdfOptions('file', 'customer', { questions: false }));
    const question = 'Is tablePermissions configured for the intended users?';
    expect(on.writes.some((write) => write.text === question)).toBe(true);
    expect(off.writes.some((write) => write.text.includes('Is tablePermissions'))).toBe(false);
    expect(off.writes.some((write) => write.text.includes('Global Read on account'))).toBe(true);
  });

  it('replaces characters outside the font set with ? and says so in the footer', () => {
    const result = reportResult();
    result.files = [
      reportFile('customer', '日本語-handler😀.js', ['configured', 'needs-review', 'configured']),
    ];
    for (const scope of SCOPES) {
      const { model, writes } = draw(result, pdfOptions(scope, 'customer'));
      const text = squash(writes.map((write) => write.text).join(''));
      expect(text).toContain('???-handler?.js');
      expect(text).not.toMatch(/[日本語😀]/u);
      const notes = writes.filter((write) => write.text.endsWith('replaced with ?'));
      expect(notes).toHaveLength(1);
      expect(notes[0]?.text).toMatch(
        /^[1-9]\d* characters outside the PDF font set were replaced with \?$/,
      );
      expect(latin1(renderPdf(model).slice(0, 5))).toBe('%PDF-');
    }
  });

  it('adds no replacement note when every character is in the font set', () => {
    for (const { result, fileId } of REPORT_FIXTURE_CASES) {
      for (const scope of SCOPES) {
        const { writes } = draw(result(), pdfOptions(scope, fileId));
        expect(writes.some((write) => write.text.includes('replaced with ?'))).toBe(false);
      }
    }
  });

  it('observes exactly the strings the document receives', () => {
    for (const { result, fileId } of REPORT_FIXTURE_CASES.filter(
      (item) => item.name !== 'hostile',
    )) {
      for (const scope of SCOPES) {
        const model = buildReportModel(result(), pdfOptions(scope, fileId), EXPORTED_AT);
        const doc = createPdfDocument();
        const text = vi.spyOn(doc, 'text');
        const seen: string[] = [];
        drawReport(doc, model, (value) => {
          seen.push(...value.split('\n'));
        });
        const drawn = text.mock.calls.flatMap(([value]) =>
          Array.isArray(value) ? value : [value],
        );
        const lines = (values: readonly string[]) =>
          [
            ...new Set(
              values.flatMap((value) => value.split('\n')).filter((value) => value !== ''),
            ),
          ].toSorted();
        expect(lines(drawn)).toEqual(lines(seen));
      }
    }
  });

  it('writes the evidence PDFs when INSPECTOR_PDF_OUT is set', () => {
    if (process.env.INSPECTOR_PDF_OUT === undefined) return;
    for (const { name, result, fileId } of REPORT_FIXTURE_CASES) {
      for (const scope of SCOPES) {
        const model = buildReportModel(result(), pdfOptions(scope, fileId), EXPORTED_AT);
        const path = join(tmpdir(), `inspector-report-${name}-${scope}.pdf`);
        writeFileSync(path, renderPdf(model));
        process.stdout.write(`${path}\n`);
      }
    }
  });
});
```

- [ ] **A9. Capture the signal**

```powershell
npm test -- src/features/inspector/report
```

Expected: exit 1, `Test Files  6 failed | 1 passed (7)` and `Tests  6 failed | 30 passed (36)`.

- `pdfFonts.test.ts`, `pdfDrawing.test.ts`, `pdfTable.test.ts` and `renderPdf.test.ts` fail to load: `Failed to resolve import "./pdfFonts"` (or `./pdfDrawing`, `./pdfTable`). Their 50 tests are not counted until Phase B. Once the three new modules exist and `renderPdf.ts` is still the stub, `renderPdf` throws `not implemented: phase 20` and `drawReport` is not exported; that is the CR-003 signal.
- `buildReportModel.test.ts` (26 tests): exactly five fail. Four fail on the exact-string redactor (WR-002): the two `redacts the hostname of a URL, bare or pathed site domain everywhere in the {file,site} model` cases, `redacts the environment URL host and an alias with a port, ignoring case`, and `keeps configured strings as exact substrings and bounds only the host aliases`. One fails because no inactive label exists yet: `labels an inactive file in the site table and the Review first and Not scanned entries`; `keeps the stored name in the file report title, stem and file name` passes at the baseline (a pin). The sentinel tests (WR-001), the file-name, title, non-URL-identifier and redaction-off tests pass at the baseline: they are pins, not signals (P-05).
- `renderMarkdown.test.ts` (8 tests): exactly one fails, `labels an inactive file in the site table and lists, but not the H2 or snapshot heading`; both golden tests and the sentinel test pass (P-05, P-06). `markdownEscape.test.ts` passes.

---

## Phase B — Implementation

**Files:** `src/assets/fonts/JetBrainsMono_400Regular.ttf`, `src/assets/fonts/OFL-JetBrainsMono.txt`, `src/features/inspector/report/buildReportModel.ts`, `src/features/inspector/report/reportFileName.ts`, and new `pdfFonts.ts`, `pdfDrawing.ts`, `pdfTable.ts`; `renderPdf.ts` is replaced in full.

- [ ] **B1. JetBrains Mono TTF from the pinned release** (G2, P-01). Work outside the repository.

```powershell
$tmp = Join-Path $env:TEMP 'jbmono-2.304'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
Invoke-WebRequest -Uri 'https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip' -OutFile "$tmp\JetBrainsMono-2.304.zip"
Expand-Archive -LiteralPath "$tmp\JetBrainsMono-2.304.zip" -DestinationPath "$tmp\x" -Force
Copy-Item -LiteralPath "$tmp\x\fonts\ttf\JetBrainsMono-Regular.ttf" -Destination src/assets/fonts/JetBrainsMono_400Regular.ttf
$ofl = [System.IO.File]::ReadAllText("$tmp\x\OFL.txt")
$lines = ($ofl -replace "`r`n", "`n") -split "`n" | ForEach-Object { $_.TrimEnd() }
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'src/assets/fonts/OFL-JetBrainsMono.txt'), ($lines -join "`n"), (New-Object System.Text.UTF8Encoding($false)))
Get-FileHash -Algorithm SHA256 -LiteralPath "$tmp\JetBrainsMono-2.304.zip", "$tmp\x\OFL.txt", src/assets/fonts/JetBrainsMono_400Regular.ttf, src/assets/fonts/OFL-JetBrainsMono.txt
git diff --stat -- src/assets/fonts/OFL-JetBrainsMono.txt
```

Expected SHA-256 (record all three in the evidence file and put the TTF's in the commit message):

| File | SHA-256 |
| --- | --- |
| `JetBrainsMono-2.304.zip` (5,622,857 bytes) | `6F6376C6ED2960EA8A963CD7387EC9D76E3F629125BC33D1FDCD7EB7012F7BBF` |
| `JetBrainsMono_400Regular.ttf` (273,900 bytes) | `A0BF60EF0F83C5ED4D7A75D45838548B1F6873372DFAC88F71804491898D138F` |
| `OFL.txt` as released (4,399 bytes) | `30F0C136E3C88E422D0791ACD97238870F9054A9729BC34CF2FF0D4ED8CAC4AD` |
| `OFL-JetBrainsMono.txt`, normalised (4,398 bytes) | `60D55F23C6CE05A81099A762CB67CA2C9B6EA251C7912720998B4C89EBFD4FAA` |

Record the zip, the released `OFL.txt`, the normalised licence and the TTF hashes in the evidence file, and the TTF's in the commit message. The licence file is replaced because the release's `OFL.txt` is not the repository's text (see P-01); the diff stat shows a small change. Copy the files; do not retype a binary. If the zip, TTF or released `OFL.txt` hash differs, stop: the pinned release is the only accepted source.

- [ ] **B2. `src/features/inspector/report/buildReportModel.ts`: redactor** (G4, P-04)

Replace L27–L53 (the whole `redactor`), verbatim:

```typescript
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
```

with:

```typescript
// A host alias counts only when it isn't part of a longer name; the configured strings themselves
// stay exact, case-sensitive substrings, as before.
const NAME_CHARACTER = /[A-Za-z0-9_-]/;

type Identifier = {
  readonly value: string;
  readonly alias: boolean;
  readonly replacement: string;
};

// Local parse only: nothing named by a configuration value is ever fetched (AC-9.10).
function hostAliases(value: string): readonly string[] {
  const candidate = value.includes('://') ? value : `https://${value}`;
  if (value.length === 0 || !URL.canParse(candidate)) return [];
  const url = new URL(candidate);
  return [url.hostname, url.host, url.origin];
}

function identifiers(
  names: readonly string[],
  urls: readonly string[],
  replacement: string,
): readonly Identifier[] {
  return [
    ...[...names, ...urls].map((value) => ({ value, alias: false, replacement })),
    ...urls.flatMap(hostAliases).map((value) => ({ value, alias: true, replacement })),
  ].filter(({ value }) => value.length > 0);
}

function atBoundary(text: string, index: number): boolean {
  return !NAME_CHARACTER.test(text.charAt(index));
}

function matches({ value, alias }: Identifier, text: string, index: number): boolean {
  if (!alias) return text.startsWith(value, index);
  return (
    text.slice(index, index + value.length).toLowerCase() === value.toLowerCase() &&
    atBoundary(text, index - 1) &&
    atBoundary(text, index + value.length)
  );
}

function redactor(result: SiteResult, enabled: boolean): (text: string) => string {
  if (!enabled) return (text) => text;
  const { connection, site } = result.facts;
  const replacements = [
    ...identifiers([connection.name], [connection.url], '[environment]'),
    ...identifiers([site.name], [site.domain], '[site]'),
  ].sort((a, b) => b.value.length - a.value.length);
  // Replace in one pass so a shorter identifier never alters an already-redacted placeholder.
  return (text) => {
    let output = '';
    for (let index = 0; index < text.length;) {
      const match = replacements.find((identifier) => matches(identifier, text, index));
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

Nothing else in the file changes: `rowModel` still passes `file.name` unredacted (L81), and `checkModel`, `sections` and the snapshot map still call `redact` on the same fields.

- [ ] **B2a. Inactive label** (G7, P-14(d)): `reportFileName.ts` and `buildReportModel.ts`

`src/features/inspector/report/reportFileName.ts`: insert `displayName` between the type alias and `reportIdentity`. Current L5–L7, verbatim:

```typescript
type ReportIdentity = Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title'>;

export function reportIdentity(result: SiteResult, options: ReportOptions): ReportIdentity {
```

becomes:

```typescript
type ReportIdentity = Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title'>;

/** The name shown where a file is a label in a list or table. Titles, stems and file names keep the stored name. */
export function displayName(file: { readonly name: string; readonly active: boolean }): string {
  return file.active ? file.name : `${file.name} (Inactive)`;
}

export function reportIdentity(result: SiteResult, options: ReportOptions): ReportIdentity {
```

`reportIdentity` itself is unchanged, so the file-scope title, stem and file name keep the stored name (AC-9.2).

`src/features/inspector/report/buildReportModel.ts` (two edits: L6 is the import, L81 is in `rowModel`):

```diff
-import { reportIdentity } from './reportFileName';
+import { displayName, reportIdentity } from './reportFileName';
```

```diff
-    name: file.name,
+    name: displayName(file),
```

- [ ] **B3. Create `src/features/inspector/report/pdfFonts.ts`** (P-02, P-03)

```typescript
import { jsPDF } from 'jspdf';
import dmSansRegular from '@/assets/fonts/DMSans_400Regular.ttf?inline';
import dmSansBold from '@/assets/fonts/DMSans_700Bold.ttf?inline';
import jetBrainsMonoRegular from '@/assets/fonts/JetBrainsMono_400Regular.ttf?inline';
import spaceGroteskBold from '@/assets/fonts/SpaceGrotesk_700Bold.ttf?inline';

/** body: DM Sans 400 · bodyBold: DM Sans 700 · heading: Space Grotesk 700 · mono: JetBrains Mono 400 */
export type PdfFace = 'body' | 'bodyBold' | 'heading' | 'mono';
/** Called with every string the renderer hands to the PDF, with the face it is written in. */
export type WriteObserver = (text: string, face: PdfFace) => void;

type FaceSpec = {
  readonly file: string;
  readonly family: string;
  readonly style: 'normal' | 'bold';
  readonly data: string;
};

const FACES: Readonly<Record<PdfFace, FaceSpec>> = {
  body: { file: 'DMSans_400Regular.ttf', family: 'DMSans', style: 'normal', data: dmSansRegular },
  bodyBold: { file: 'DMSans_700Bold.ttf', family: 'DMSans', style: 'bold', data: dmSansBold },
  heading: {
    file: 'SpaceGrotesk_700Bold.ttf',
    family: 'SpaceGrotesk',
    style: 'bold',
    data: spaceGroteskBold,
  },
  mono: {
    file: 'JetBrainsMono_400Regular.ttf',
    family: 'JetBrainsMono',
    style: 'normal',
    data: jetBrainsMonoRegular,
  },
};

export const PDF_FACE_NAMES = [
  'body',
  'bodyBold',
  'heading',
  'mono',
] as const satisfies readonly PdfFace[];

/** The TTF in `src/assets/fonts/` that each face embeds; the coverage test reads these files. */
export const PDF_FACE_FILES: Readonly<Record<PdfFace, string>> = {
  body: FACES.body.file,
  bodyBold: FACES.bodyBold.file,
  heading: FACES.heading.file,
  mono: FACES.mono.file,
};

/** A landscape A4 document in points with the four report faces embedded (FR-10). */
export function createPdfDocument(): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  for (const name of PDF_FACE_NAMES) {
    const face = FACES[name];
    doc.addFileToVFS(face.file, face.data.slice(face.data.indexOf(',') + 1));
    doc.addFont(face.file, face.family, face.style);
  }
  return doc;
}

export function setFace(doc: jsPDF, face: PdfFace): void {
  const spec = FACES[face];
  doc.setFont(spec.family, spec.style);
}

/** The AutoTable `font` and `fontStyle` that select a face. */
export function faceStyle(face: PdfFace): {
  readonly font: string;
  readonly fontStyle: 'normal' | 'bold';
} {
  const spec = FACES[face];
  return { font: spec.family, fontStyle: spec.style };
}

/** Wraps text to `width` points in a face and size. A word wider than the width is broken. */
export function wrapText(
  doc: jsPDF,
  text: string,
  width: number,
  face: PdfFace,
  size: number,
): string[] {
  setFace(doc, face);
  doc.setFontSize(size);
  // splitTextToSize is typed `any`; accept only a string[].
  const lines: unknown = doc.splitTextToSize(text.replace(/\r\n?/g, '\n'), width);
  if (
    !Array.isArray(lines) ||
    !lines.every((line: unknown): line is string => typeof line === 'string')
  ) {
    throw new Error('Could not lay out report text');
  }
  return lines;
}

/**
 * Code points every report face has a glyph for: printable ASCII, Latin-1 Supplement and Latin
 * Extended-A (minus the few points DM Sans or JetBrains Mono lack) and common punctuation.
 * `pdfFonts.test.ts` checks each range against the cmap of all four embedded TTFs.
 */
export const SUPPORTED_RANGES: readonly (readonly [number, number])[] = [
  [0x20, 0x7e],
  [0xa0, 0xac],
  [0xae, 0x107],
  [0x10a, 0x11b],
  [0x11e, 0x123],
  [0x126, 0x131],
  [0x136, 0x137],
  [0x139, 0x148],
  [0x14a, 0x15b],
  [0x15e, 0x165],
  [0x168, 0x17e],
  [0x2013, 0x2014],
  [0x2018, 0x2019],
  [0x201c, 0x201d],
  [0x2022, 0x2022],
  [0x2026, 0x2026],
];

const LINE_FEED = 0x0a;

function supported(codePoint: number): boolean {
  return (
    codePoint === LINE_FEED ||
    SUPPORTED_RANGES.some(([first, last]) => codePoint >= first && codePoint <= last)
  );
}

/**
 * jsPDF omits a character its embedded font cannot map, without a trace. The guard makes that
 * visible instead: every code point outside the repertoire becomes `?` and is counted, and CR and
 * CRLF become LF. The renderer reports the count in the footer.
 */
export type TextGuard = {
  readonly clean: (text: string) => string;
  readonly replaced: () => number;
};

export function createTextGuard(): TextGuard {
  let replaced = 0;
  return {
    clean: (text) =>
      Array.from(text.replace(/\r\n?/g, '\n'), (char) => {
        if (supported(char.codePointAt(0) ?? 0)) return char;
        replaced++;
        return '?';
      }).join(''),
    replaced: () => replaced,
  };
}
```

- [ ] **B4. Create `src/features/inspector/report/pdfDrawing.ts`** (P-07, P-13)

```typescript
import type { jsPDF } from 'jspdf';
import { ringArcs } from '@/lib/ringGeometry';
import type { RingState } from '@/lib/ringGeometry';

export const PAGE_MARGIN = 36;

// Original handoff report palette with the A8 adjustments: orange text #b05408, blue chip #1e6dcd.
export const REPORT_PALETTE = {
  ink: '#14213d',
  muted: '#55607a',
  rules: '#dfe4ee',
  head: '#f6f8fc',
  blue: '#1f6fd1',
  blueChip: '#1e6dcd',
  blueTint: '#eaf2fd',
  orange: '#b05408',
  orangeTint: '#fdf0e3',
  grey: '#9aa3b5',
  greyTint: '#eef0f4',
  white: '#ffffff',
} as const;

export function ringColor(state: RingState): string {
  switch (state) {
    case 'done':
      return REPORT_PALETTE.blue;
    case 'review':
      return REPORT_PALETTE.orange;
    case 'not-scanned':
      return REPORT_PALETTE.grey;
  }
}

/** The `✓` status glyph: a three-point vector path. Neither DM Sans nor Space Grotesk has U+2713. */
export function drawCheckmark(doc: jsPDF, x: number, y: number, size: number, color: string): void {
  doc
    .setDrawColor(color)
    .setLineWidth(size * 0.2)
    .setLineCap('round')
    .setLineJoin('round');
  doc
    .moveTo(x, y + size * 0.55)
    .lineTo(x + size * 0.38, y + size * 0.9)
    .lineTo(x + size, y + size * 0.1)
    .stroke();
}

/** Status ring from `ringArcs`: clockwise from 12 o'clock, gaps kept, cubic arcs of at most 90 degrees. */
export function drawRing(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  thickness: number,
  segments: readonly RingState[],
): void {
  doc.setLineWidth(thickness).setLineCap('butt');
  for (const arc of ringArcs(segments)) {
    doc.setDrawColor(ringColor(arc.state));
    let start = (arc.startDeg * Math.PI) / 180;
    const end = (arc.endDeg * Math.PI) / 180;
    doc.moveTo(cx + radius * Math.sin(start), cy - radius * Math.cos(start));
    while (start < end - 1e-8) {
      const next = Math.min(end, start + Math.PI / 2);
      const k = (4 / 3) * Math.tan((next - start) / 4);
      doc.curveTo(
        cx + radius * (Math.sin(start) + k * Math.cos(start)),
        cy - radius * (Math.cos(start) - k * Math.sin(start)),
        cx + radius * (Math.sin(next) - k * Math.cos(next)),
        cy - radius * (Math.cos(next) + k * Math.sin(next)),
        cx + radius * Math.sin(next),
        cy - radius * Math.cos(next),
      );
      start = next;
    }
    doc.stroke();
  }
}

export function drawDot(doc: jsPDF, x: number, y: number, radius: number, color: string): void {
  doc.setFillColor(color).circle(x, y, radius, 'F');
}

export function drawCheckbox(doc: jsPDF, x: number, y: number, size: number, color: string): void {
  doc.setDrawColor(color).setLineWidth(0.8).rect(x, y, size, size, 'S');
}
```

- [ ] **B5. Create `src/features/inspector/report/pdfTable.ts`** (P-08)

```typescript
import type { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { CellDef, CellHookData } from 'jspdf-autotable';
import type { RingState } from '@/lib/ringGeometry';
import { PAGE_MARGIN, REPORT_PALETTE, drawCheckmark, drawRing } from './pdfDrawing';
import { createTextGuard, faceStyle, setFace, wrapText } from './pdfFonts';
import type { PdfFace, TextGuard, WriteObserver } from './pdfFonts';

export const TABLE_FONT_SIZE = 9;
export const CELL_PADDING = 6;
const TICK_SIZE = 8;
const TICK_INDENT = 16;
const PILL_INDENT = 6;
const RING_RADIUS = 8;

export type PdfColumn = { readonly header: string; readonly width: number };
export type PdfCell = {
  readonly text: string;
  readonly face: PdfFace;
  readonly color: string;
  /** Draw the vector `✓` before the text. */
  readonly tick: boolean;
  /** Draw a rounded tint of this colour behind the text. */
  readonly pill: string | null;
};
export type PdfRow = {
  /** Names the row in a continuation label: `<label> (continued 2/3)`. */
  readonly label: string;
  readonly cells: readonly PdfCell[];
  /** Mini status ring drawn in the first column of the row's first printed part. */
  readonly ring: readonly RingState[] | null;
};
export type PdfTableSpec = {
  readonly columns: readonly PdfColumn[];
  readonly rows: readonly PdfRow[];
  /** The column whose cell carries the continuation label. */
  readonly labelColumn: number;
  readonly startY: number;
};
export type PreparedCell = { readonly lines: readonly string[]; readonly cell: PdfCell };
export type PreparedRow = {
  readonly owner: number;
  readonly part: number;
  readonly parts: number;
  readonly ring: readonly RingState[] | null;
  readonly cells: readonly PreparedCell[];
};
export type PdfTableEvidence = {
  readonly finalY: number;
  readonly logicalRows: number;
  readonly physicalRows: number;
  readonly rows: readonly {
    readonly index: number;
    readonly page: number;
    readonly spansMultiplePages: boolean;
  }[];
  readonly headPages: readonly number[];
};

export function pdfCell(
  text: string,
  options: {
    readonly face?: PdfFace;
    readonly color?: string;
    readonly tick?: boolean;
    readonly pill?: string;
  } = {},
): PdfCell {
  return {
    text,
    face: options.face ?? 'body',
    color: options.color ?? REPORT_PALETTE.ink,
    tick: options.tick ?? false,
    pill: options.pill ?? null,
  };
}

function leftPadding(cell: PdfCell): number {
  return CELL_PADDING + (cell.tick ? TICK_INDENT : cell.pill === null ? 0 : PILL_INDENT);
}

function lineHeight(doc: jsPDF): number {
  return TABLE_FONT_SIZE * doc.getLineHeightFactor();
}

/** The most text lines one printed row can hold under a repeated head row on an empty page. */
export function maxRowLines(doc: jsPDF): number {
  const usable = doc.internal.pageSize.getHeight() - 2 * PAGE_MARGIN;
  const head = lineHeight(doc) + 2 * CELL_PADDING;
  // One line of slack covers rounding between this measure and AutoTable's.
  return Math.max(1, Math.floor((usable - head - 2 * CELL_PADDING) / lineHeight(doc)) - 1);
}

/**
 * Wraps every cell at its column width and splits a logical row taller than `maxLines` into
 * continuation rows, so AutoTable never has to break a printed row across pages. Nothing is
 * shortened: the lines of all parts, in order, are the wrapped text of the cell.
 */
export function preparePdfRows(
  doc: jsPDF,
  columns: readonly PdfColumn[],
  rows: readonly PdfRow[],
  labelColumn: number,
  maxLines: number,
  guard: TextGuard = createTextGuard(),
): readonly PreparedRow[] {
  function wrap(cell: PdfCell, column: number, text: string): string[] {
    const width = columns[column]?.width;
    if (width === undefined) throw new Error('Report table row has more cells than columns');
    return wrapText(
      doc,
      guard.clean(text),
      width - leftPadding(cell) - CELL_PADDING,
      cell.face,
      TABLE_FONT_SIZE,
    );
  }

  return rows.flatMap((row, owner) => {
    const wrapped = row.cells.map((cell, column) => wrap(cell, column, cell.text));
    const parts = Math.max(1, ...wrapped.map((lines) => Math.ceil(lines.length / maxLines)));
    return Array.from({ length: parts }, (_, part) => ({
      owner,
      part,
      parts,
      ring: part === 0 ? row.ring : null,
      cells: row.cells.map((cell, column): PreparedCell => {
        if (part > 0 && column === labelColumn) {
          const label = `${row.label} (continued ${String(part + 1)}/${String(parts)})`;
          return { lines: wrap(cell, column, label), cell: { ...cell, tick: false, pill: null } };
        }
        const lines = (wrapped[column] ?? []).slice(part * maxLines, (part + 1) * maxLines);
        return { lines, cell: part === 0 ? cell : { ...cell, tick: false, pill: null } };
      }),
    }));
  });
}

function cellDef(prepared: PreparedCell): CellDef {
  const { cell } = prepared;
  return {
    content: prepared.lines.join('\n'),
    styles: {
      ...faceStyle(cell.face),
      textColor: cell.color,
      cellPadding: {
        top: CELL_PADDING,
        right: CELL_PADDING,
        bottom: CELL_PADDING,
        left: leftPadding(cell),
      },
    },
  };
}

/**
 * Draws a table with AutoTable: the head repeats on every page and no printed row spans two pages.
 * The returned evidence lets tests prove both without parsing the PDF.
 */
export function drawPdfTable(
  doc: jsPDF,
  spec: PdfTableSpec,
  observe?: WriteObserver,
  guard: TextGuard = createTextGuard(),
): PdfTableEvidence {
  const prepared = preparePdfRows(
    doc,
    spec.columns,
    spec.rows,
    spec.labelColumn,
    maxRowLines(doc),
    guard,
  );
  for (const column of spec.columns) observe?.(column.header, 'bodyBold');
  for (const row of prepared) {
    for (const { lines, cell } of row.cells) observe?.(lines.join('\n'), cell.face);
  }
  const rows: { index: number; page: number; spansMultiplePages: boolean }[] = [];
  const headPages = new Set<number>();
  let finalY = spec.startY;
  const pageNumber = (): number => doc.getCurrentPageInfo().pageNumber;

  function willDrawCell(data: CellHookData): void {
    if (data.section !== 'body') return;
    const cell = prepared[data.row.index]?.cells[data.column.index]?.cell;
    if (cell?.pill == null) return;
    const text = prepared[data.row.index]?.cells[data.column.index]?.lines[0] ?? '';
    setFace(doc, cell.face);
    doc.setFontSize(TABLE_FONT_SIZE);
    const width = doc.getTextWidth(text);
    doc
      .setFillColor(cell.pill)
      .roundedRect(
        data.cell.x + CELL_PADDING,
        data.cell.y + CELL_PADDING - 2,
        width + 2 * PILL_INDENT,
        lineHeight(doc) + 4,
        (lineHeight(doc) + 4) / 2,
        (lineHeight(doc) + 4) / 2,
        'F',
      );
    // AutoTable fills the cell rectangle after this hook; without this the tint covers the whole cell.
    data.cell.styles.fillColor = false;
  }

  function didDrawCell(data: CellHookData): void {
    if (data.section === 'head') {
      headPages.add(pageNumber());
      return;
    }
    if (data.section !== 'body') return;
    const row = prepared[data.row.index];
    const cell = row?.cells[data.column.index]?.cell;
    if (data.column.index === 0) {
      rows.push({
        index: data.row.index,
        page: pageNumber(),
        spansMultiplePages: data.row.spansMultiplePages,
      });
      if (row?.ring != null) {
        drawRing(
          doc,
          data.cell.x + data.cell.width / 2,
          data.cell.y + CELL_PADDING + RING_RADIUS,
          RING_RADIUS - 2,
          4,
          row.ring,
        );
      }
    }
    if (cell?.tick === true) {
      drawCheckmark(
        doc,
        data.cell.x + CELL_PADDING,
        data.cell.y + CELL_PADDING + (lineHeight(doc) - TICK_SIZE) / 2,
        TICK_SIZE,
        cell.color,
      );
    }
  }

  autoTable(doc, {
    startY: spec.startY,
    margin: PAGE_MARGIN,
    theme: 'grid',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    tableWidth: spec.columns.reduce((sum, column) => sum + column.width, 0),
    styles: {
      ...faceStyle('body'),
      fontSize: TABLE_FONT_SIZE,
      overflow: 'linebreak',
      cellPadding: CELL_PADDING,
      lineColor: REPORT_PALETTE.rules,
      lineWidth: 0.5,
      textColor: REPORT_PALETTE.ink,
      valign: 'top',
      minCellHeight: spec.rows.some((row) => row.ring !== null)
        ? 2 * (RING_RADIUS + CELL_PADDING)
        : 0,
    },
    headStyles: {
      ...faceStyle('bodyBold'),
      fillColor: REPORT_PALETTE.head,
      textColor: REPORT_PALETTE.muted,
      minCellHeight: 0,
    },
    columnStyles: Object.fromEntries(
      spec.columns.map((column, index) => [index, { cellWidth: column.width }]),
    ),
    head: [spec.columns.map((column) => column.header)],
    body: prepared.map((row) => row.cells.map(cellDef)),
    willDrawCell,
    didDrawCell,
    didDrawPage: (data) => {
      finalY = data.cursor?.y ?? finalY;
    },
  });

  return {
    finalY,
    logicalRows: spec.rows.length,
    physicalRows: prepared.length,
    rows,
    headPages: [...headPages].toSorted((a, b) => a - b),
  };
}
```

- [ ] **B6. Replace `src/features/inspector/report/renderPdf.ts` in full** (G1, P-07, P-09). Current file, verbatim:

```typescript
import type { ReportModel } from '@/features/inspector/report/reportModel.types';

export function renderPdf(_m: ReportModel): Uint8Array {
  throw new Error('not implemented: phase 20');
}
```

New file:

```typescript
import type { jsPDF } from 'jspdf';
import type { RingState } from '@/lib/ringGeometry';
import type { CheckStatus } from '@/types/inspector';
import {
  PAGE_MARGIN,
  REPORT_PALETTE as PALETTE,
  drawCheckbox,
  drawCheckmark,
  drawDot,
  drawRing,
} from './pdfDrawing';
import { createPdfDocument, createTextGuard, setFace, wrapText } from './pdfFonts';
import type { PdfFace, TextGuard, WriteObserver } from './pdfFonts';
import { drawPdfTable, pdfCell } from './pdfTable';
import type { PdfCell, PdfRow, PdfTableEvidence } from './pdfTable';
import type {
  ReportCheck,
  ReportModel,
  ReportRow,
  ReportSection,
  ReportSnapshot,
} from './reportModel.types';

type TextStyle = { readonly face: PdfFace; readonly size: number; readonly color: string };

// Mutable page cursor: every drawing helper below advances `y` and starts a page when a line won't fit.
type Ctx = {
  readonly doc: jsPDF;
  readonly observe: WriteObserver | undefined;
  readonly guard: TextGuard;
  readonly width: number;
  readonly bottom: number;
  y: number;
  indent: number;
  bar: string | null;
};

const LEADING = 1.4;
const LABEL_WIDTH = 78;
const BULLET_INDENT = 14;
const RING_RADIUS = 50;
const RING_THICKNESS = 12;

const TEXT: TextStyle = { face: 'body', size: 10, color: PALETTE.ink };
const MUTED: TextStyle = { face: 'body', size: 10, color: PALETTE.muted };
const SMALL: TextStyle = { face: 'body', size: 9, color: PALETTE.muted };
const LABEL: TextStyle = { face: 'bodyBold', size: 10, color: PALETTE.muted };
const PATH: TextStyle = { face: 'mono', size: 9, color: PALETTE.ink };
const BRAND: TextStyle = { face: 'heading', size: 12, color: PALETTE.ink };
const TITLE: TextStyle = { face: 'heading', size: 20, color: PALETTE.ink };
const HEADLINE: TextStyle = { face: 'heading', size: 16, color: PALETTE.ink };
const SECTION: TextStyle = { face: 'heading', size: 13, color: PALETTE.ink };
const ITEM: TextStyle = { face: 'heading', size: 11, color: PALETTE.ink };

// jsPDF drops a character its embedded font can't map without a trace, so every string goes through
// the guard first: characters outside the repertoire become `?` and are counted for the footer.
function pdfText(ctx: Ctx, text: string): string {
  return ctx.guard.clean(text);
}

// The only place text reaches the document, so the observer sees everything the renderer writes.
function write(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
  align: 'left' | 'center' | 'right' = 'left',
): void {
  const clean = pdfText(ctx, text);
  ctx.observe?.(clean, style.face);
  setFace(ctx.doc, style.face);
  ctx.doc.setFontSize(style.size).setTextColor(style.color);
  ctx.doc.text(clean, x, y, { baseline: 'top', align });
}

function ensure(ctx: Ctx, height: number): void {
  if (ctx.y + height > ctx.bottom && ctx.y > PAGE_MARGIN) {
    ctx.doc.addPage();
    ctx.y = PAGE_MARGIN;
  }
}

function drawBar(ctx: Ctx, height: number): void {
  if (ctx.bar !== null) ctx.doc.setFillColor(ctx.bar).rect(PAGE_MARGIN, ctx.y, 3, height, 'F');
}

function space(ctx: Ctx, height: number): void {
  ensure(ctx, height);
  drawBar(ctx, height);
  ctx.y += height;
}

function rule(ctx: Ctx): void {
  ctx.doc
    .setDrawColor(PALETTE.rules)
    .setLineWidth(0.8)
    .line(PAGE_MARGIN, ctx.y, PAGE_MARGIN + ctx.width, ctx.y);
}

// Wraps to the page width; a long line continues on the next page rather than being cut off.
function paragraph(ctx: Ctx, text: string, style: TextStyle, inset = 0): void {
  if (text === '') return;
  const step = style.size * LEADING;
  const width = ctx.width - ctx.indent - inset;
  for (const line of wrapText(ctx.doc, pdfText(ctx, text), width, style.face, style.size)) {
    ensure(ctx, step);
    drawBar(ctx, step);
    write(ctx, line, PAGE_MARGIN + ctx.indent + inset, ctx.y, style);
    ctx.y += step;
  }
}

function heading(ctx: Ctx, text: string, style: TextStyle): void {
  ensure(ctx, style.size * LEADING * 3);
  paragraph(ctx, text, style);
  space(ctx, 4);
}

function bullet(ctx: Ctx, text: string, style: TextStyle, marker: 'dot' | 'box'): void {
  ensure(ctx, style.size * LEADING);
  const x = PAGE_MARGIN + ctx.indent;
  if (marker === 'dot') drawDot(ctx.doc, x + 3, ctx.y + style.size * 0.55, 1.6, PALETTE.muted);
  else drawCheckbox(ctx.doc, x, ctx.y + style.size * 0.1, style.size * 0.8, PALETTE.muted);
  paragraph(ctx, text, style, BULLET_INDENT);
}

// A label column beside wrapped text: Environment, Scanned and Result.
function drawLines(ctx: Ctx, lines: ReportModel['lines']): void {
  for (const line of lines) {
    const style = line.label === '' ? MUTED : line.label === 'Environment' ? PATH : TEXT;
    const step = style.size * LEADING;
    const width = ctx.width - ctx.indent - LABEL_WIDTH;
    for (const [index, part] of wrapText(
      ctx.doc,
      pdfText(ctx, line.text),
      width,
      style.face,
      style.size,
    ).entries()) {
      ensure(ctx, step);
      const x = PAGE_MARGIN + ctx.indent;
      if (index === 0 && line.label !== '') write(ctx, line.label, x, ctx.y, LABEL);
      write(ctx, part, x + LABEL_WIDTH, ctx.y, style);
      ctx.y += step;
    }
    ctx.y += 2;
  }
}

// Items on one line, wrapping to the next when the right edge is reached.
function drawRun(
  ctx: Ctx,
  items: readonly { readonly text: string; readonly style: TextStyle }[],
): void {
  const left = PAGE_MARGIN + ctx.indent;
  let x = left;
  ensure(ctx, 10 * LEADING);
  for (const { text, style } of items) {
    setFace(ctx.doc, style.face);
    ctx.doc.setFontSize(style.size);
    const width = ctx.doc.getTextWidth(pdfText(ctx, text));
    if (x > left && x + width > PAGE_MARGIN + ctx.width) {
      x = left;
      ctx.y += style.size * LEADING;
      ensure(ctx, style.size * LEADING);
    }
    write(ctx, text, x, ctx.y, style);
    x += width + 16;
  }
  ctx.y += 10 * LEADING;
}

function ringState(status: CheckStatus): RingState {
  switch (status) {
    case 'configured':
    case 'reviewed':
      return 'done';
    case 'needs-review':
      return 'review';
    case 'not-scanned':
      return 'not-scanned';
  }
}

function drawHeader(ctx: Ctx, model: ReportModel): void {
  ctx.doc.setFillColor(PALETTE.blueChip).roundedRect(PAGE_MARGIN, ctx.y, 16, 16, 3, 3, 'F');
  drawCheckmark(ctx.doc, PAGE_MARGIN + 3.5, ctx.y + 3.5, 9, PALETTE.white);
  write(ctx, model.header.brand, PAGE_MARGIN + 24, ctx.y + 1, BRAND);
  write(ctx, model.header.label, PAGE_MARGIN + ctx.width, ctx.y + 2, MUTED, 'right');
  ctx.y += 24;
  rule(ctx);
  ctx.y += 14;
}

function drawBanners(ctx: Ctx, banners: readonly string[]): void {
  const step = TEXT.size * LEADING + 4;
  for (const banner of banners) {
    for (const line of wrapText(
      ctx.doc,
      pdfText(ctx, banner),
      ctx.width - 20,
      TEXT.face,
      TEXT.size,
    )) {
      ensure(ctx, step);
      ctx.doc.setFillColor(PALETTE.orangeTint).rect(PAGE_MARGIN, ctx.y, ctx.width, step, 'F');
      ctx.doc.setFillColor(PALETTE.orange).rect(PAGE_MARGIN, ctx.y, 3, step, 'F');
      write(ctx, line, PAGE_MARGIN + 12, ctx.y + 2, TEXT);
      ctx.y += step;
    }
    ctx.y += 6;
  }
}

// AC-9.3 hero: the site ring over every check, the path, headline, interval and the file counts.
function drawHero(ctx: Ctx, model: ReportModel): void {
  paragraph(ctx, model.title, TITLE);
  space(ctx, 10);
  ensure(ctx, 2 * RING_RADIUS + 8);
  const top = ctx.y;
  const cx = PAGE_MARGIN + RING_RADIUS + 4;
  const cy = top + RING_RADIUS + 4;
  const segments = model.rows.flatMap((row) => row.checks.map((check) => ringState(check.status)));
  drawRing(ctx.doc, cx, cy, RING_RADIUS - RING_THICKNESS / 2, RING_THICKNESS, segments);
  const total = `${String(model.counts.K)}/${String(model.counts.T)}`;
  write(ctx, total, cx, cy - 16, { face: 'heading', size: 20, color: PALETTE.ink }, 'center');
  write(ctx, 'checks addressed', cx, cy + 8, SMALL, 'center');
  ctx.indent = 2 * RING_RADIUS + 28;
  paragraph(ctx, model.headline, HEADLINE);
  space(ctx, 4);
  drawLines(ctx, model.lines);
  const bold = (color: string): TextStyle => ({ face: 'bodyBold', size: 10, color });
  drawRun(ctx, [
    { text: `Ready: ${String(model.fileCounts.ready)}`, style: bold(PALETTE.blueChip) },
    { text: `Needs review: ${String(model.fileCounts.needsReview)}`, style: bold(PALETTE.orange) },
    { text: `Incomplete: ${String(model.fileCounts.incomplete)}`, style: bold(PALETTE.muted) },
    { text: 'Not verified: Tenant outbound policy', style: MUTED },
  ]);
  ctx.indent = 0;
  ctx.y = Math.max(ctx.y, top + 2 * RING_RADIUS + 8) + 8;
}

function statusCell(check: ReportCheck, withReason: boolean): PdfCell {
  switch (check.status) {
    case 'configured':
      return pdfCell(check.statusText, { color: PALETTE.blueChip, tick: true });
    case 'reviewed':
      return pdfCell(withReason ? `${check.statusText}: ${check.finding}` : check.statusText, {
        color: PALETTE.blueChip,
        tick: true,
      });
    case 'needs-review':
      return pdfCell(`! ${check.statusText}`, { face: 'bodyBold', color: PALETTE.orange });
    case 'not-scanned':
      return pdfCell(check.statusText, { color: PALETTE.muted });
  }
}

function resultCell(result: ReportRow['result']): PdfCell {
  switch (result) {
    case 'Ready':
      return pdfCell(result, { face: 'bodyBold', color: PALETTE.blueChip, pill: PALETTE.blueTint });
    case 'Needs review':
      return pdfCell(result, { face: 'bodyBold', color: PALETTE.orange, pill: PALETTE.orangeTint });
    case 'Incomplete':
      return pdfCell(result, { face: 'bodyBold', color: PALETTE.muted, pill: PALETTE.greyTint });
  }
}

function drawFileTable(ctx: Ctx, model: ReportModel): PdfTableEvidence {
  const checks = model.rows.flatMap((row) => row.checks);
  const rows = checks.map((check): PdfRow => ({
    label: check.title,
    ring: null,
    cells: [
      pdfCell(check.title, { face: 'bodyBold' }),
      statusCell(check, false),
      pdfCell(check.finding),
    ],
  }));
  ensure(ctx, 80);
  return drawPdfTable(
    ctx.doc,
    {
      columns: [
        { header: 'Check', width: ctx.width * 0.2 },
        { header: 'Status', width: ctx.width * 0.15 },
        { header: 'Finding', width: ctx.width * 0.65 },
      ],
      rows,
      labelColumn: 0,
      startY: ctx.y,
    },
    ctx.observe,
    ctx.guard,
  );
}

function drawSiteTable(ctx: Ctx, model: ReportModel): PdfTableEvidence {
  const rows = model.rows.map((row): PdfRow => ({
    label: row.name,
    ring: row.checks.map((check) => ringState(check.status)),
    cells: [
      pdfCell(''),
      pdfCell(row.name, { face: 'mono' }),
      ...row.checks.map((check) => statusCell(check, true)),
      resultCell(row.result),
    ],
  }));
  ensure(ctx, 80);
  return drawPdfTable(
    ctx.doc,
    {
      columns: [
        { header: '', width: ctx.width * 0.05 },
        { header: 'File', width: ctx.width * 0.25 },
        { header: 'Web role', width: ctx.width * 0.17 },
        { header: 'Table permissions', width: ctx.width * 0.2 },
        { header: 'Outbound networking', width: ctx.width * 0.17 },
        { header: 'Result', width: ctx.width * 0.16 },
      ],
      rows,
      labelColumn: 1,
      startY: ctx.y,
    },
    ctx.observe,
    ctx.guard,
  );
}

function drawFinding(ctx: Ctx, section: ReportSection, siteScope: boolean): void {
  ensure(ctx, 60);
  ctx.bar = PALETTE.orange;
  ctx.indent = 12;
  paragraph(ctx, siteScope ? `${section.title}: ${section.fileName}` : section.title, ITEM);
  space(ctx, 2);
  paragraph(ctx, section.summary, TEXT);
  space(ctx, 3);
  paragraph(ctx, section.guidance, MUTED);
  for (const detail of section.detail) {
    space(ctx, 3);
    paragraph(ctx, detail, MUTED);
  }
  if (section.questions.length > 0) space(ctx, 4);
  for (const question of section.questions) bullet(ctx, question, TEXT, 'box');
  ctx.bar = null;
  ctx.indent = 0;
  ctx.y += 10;
}

function drawNotScanned(ctx: Ctx, sections: readonly ReportSection[]): void {
  if (sections.length === 0) return;
  heading(ctx, 'Not scanned', SECTION);
  for (const section of sections) {
    bullet(ctx, `${section.title}: ${section.fileName} — ${section.summary}`, TEXT, 'dot');
  }
  ctx.y += 10;
}

function drawSnapshot(ctx: Ctx, snapshot: ReportSnapshot, siteScope: boolean): void {
  heading(
    ctx,
    siteScope ? `Configuration snapshot: ${snapshot.fileName}` : 'Configuration snapshot',
    SECTION,
  );
  const groups = [
    ['Web roles', snapshot.roles],
    ['Tables with privileges', snapshot.tables],
    ['Outbound', snapshot.outbound],
  ] as const;
  for (const [label, items] of groups) {
    ensure(ctx, 3 * TEXT.size * LEADING);
    paragraph(ctx, label, { ...TEXT, face: 'bodyBold' });
    space(ctx, 2);
    for (const item of items) bullet(ctx, item, PATH, 'dot');
    space(ctx, 6);
  }
  ctx.y += 6;
}

function drawFooter(ctx: Ctx, footer: readonly string[]): void {
  ensure(ctx, 40);
  rule(ctx);
  ctx.y += 8;
  for (const line of footer) {
    paragraph(ctx, line, SMALL);
    space(ctx, 3);
  }
  const replaced = ctx.guard.replaced();
  if (replaced > 0) {
    paragraph(
      ctx,
      `${String(replaced)} characters outside the PDF font set were replaced with ?`,
      SMALL,
    );
  }
}

// "Page n of m" on every page, once all pages exist so the total is known and observable.
function drawPageNumbers(ctx: Ctx): void {
  const total = ctx.doc.getNumberOfPages();
  const y = ctx.doc.internal.pageSize.getHeight() - PAGE_MARGIN + 10;
  for (let page = 1; page <= total; page++) {
    ctx.doc.setPage(page);
    write(
      ctx,
      `Page ${String(page)} of ${String(total)}`,
      PAGE_MARGIN + ctx.width,
      y,
      SMALL,
      'right',
    );
  }
  ctx.doc.setPage(total);
}

/**
 * Draws the report onto `doc` as vector text and paths. `observe` sees every string written, so tests
 * can check each character against the font it is written in. Returns the table layout evidence.
 */
export function drawReport(
  doc: jsPDF,
  model: ReportModel,
  observe?: WriteObserver,
): PdfTableEvidence {
  doc.setProperties({ title: model.title });
  const ctx: Ctx = {
    doc,
    observe,
    guard: createTextGuard(),
    width: doc.internal.pageSize.getWidth() - 2 * PAGE_MARGIN,
    bottom: doc.internal.pageSize.getHeight() - PAGE_MARGIN,
    y: PAGE_MARGIN,
    indent: 0,
    bar: null,
  };
  drawHeader(ctx, model);
  if (model.scope === 'file') {
    paragraph(ctx, model.title, TITLE);
    space(ctx, 8);
    drawLines(ctx, model.lines);
  } else {
    drawHero(ctx, model);
  }
  drawBanners(ctx, model.banners);
  const table = model.scope === 'file' ? drawFileTable(ctx, model) : drawSiteTable(ctx, model);
  ctx.y = table.finalY + 18;
  if (model.scope === 'file') {
    for (const section of model.needsReview) drawFinding(ctx, section, false);
  } else {
    heading(ctx, 'Review first', SECTION);
    for (const section of model.reviewFirst) drawFinding(ctx, section, true);
  }
  drawNotScanned(ctx, model.notScanned);
  for (const snapshot of model.snapshot ?? []) drawSnapshot(ctx, snapshot, model.scope === 'site');
  drawFooter(ctx, model.footer);
  drawPageNumbers(ctx);
  return table;
}

export function renderPdf(model: ReportModel): Uint8Array {
  const doc = createPdfDocument();
  drawReport(doc, model);
  return new Uint8Array(doc.output('arraybuffer'));
}
```

---

## Phase C — Confirm

- [ ] **C1. Focused suites**

```powershell
npm test -- src/features/inspector/report
git diff --stat -- src/features/inspector/report/__golden__
```

Expected: `Test Files  7 passed (7)` and `Tests  86 passed (86)` (`buildReportModel` 26, `markdownEscape` 2, `pdfDrawing` 9, `pdfFonts` 9, `pdfTable` 10, `renderMarkdown` 8, `renderPdf` 22). The second command prints nothing: both goldens are untouched (P-06). No console warning from AutoTable ("units width could not fit page") appears.

- [ ] **C2. Type and lint gates**

```powershell
npm run typecheck
npx --no-install eslint src/features/inspector/report --max-warnings=0
npm run lint
```

Expected: all three exit 0 with no output (`npm run lint` is `eslint . --max-warnings=0`, the CI gate). `src/skeleton.test.ts` L145 (`expectTypeOf(renderPdf).toEqualTypeOf<(m: ReportModel) => Uint8Array>()`) is checked by `tsc`.

- [ ] **C3. Whole suite and build**

```powershell
npm test
npm run build
```

Expected: both exit 0. In the dry run on a copy of this tree, `vitest run src` passed 96 files and 1,536 tests; `npm test` also runs `tests/`. `npm run build` output is unchanged (index `932.90 kB`) because nothing outside tests imports `renderPdf` yet (P-11); the fonts enter the single IIFE when P5.7 imports it, and P5.8 measures the size with `npm run size`.

- [ ] **C4. Hygiene**

```powershell
git diff --check
git status --short -- src/assets/fonts
```

Expected: the first prints nothing. The second prints exactly ` M src/assets/fonts/OFL-JetBrainsMono.txt` and `?? src/assets/fonts/JetBrainsMono_400Regular.ttf`.

- [ ] **C5. Read the PDFs in a reader (RG-005, recorded not asserted)**

```powershell
$env:INSPECTOR_PDF_OUT = '1'
npm test -- src/features/inspector/report/renderPdf.test.ts
Remove-Item Env:INSPECTOR_PDF_OUT
Get-ChildItem (Join-Path $env:TEMP 'inspector-report-*.pdf') | Select-Object Name, Length
```

Expected: the test run passes and prints six paths; the listing shows `inspector-report-{standard,long,hostile}-{file,site}.pdf`, about 130 and 154 KB for the standard file and site reports, 642 KB for the long site report (29 pages) and 174 KB for the long file report (4 pages). The test writes these six files to `%TEMP%` and leaves them there; delete them afterwards. Open `inspector-report-standard-file.pdf`, `-standard-site.pdf`, `-long-site.pdf` and `-hostile-file.pdf` in a PDF reader and record in the evidence file: (1) text can be selected and copied, and search finds "Tenant outbound policy"; (2) each `✓` is a drawn tick, `!` is text; (3) ring arcs are proportional with visible gaps; (4) in `-long-site.pdf` the head row is on every page, no row is cut at a page bottom, and the 400-character file name has a continuation row `… (continued 2/3)`; (5) the hostile names read as literal text; (6) every page ends with `Page n of m`, bottom right. Optionally, if Xpdf's `pdftotext` is on hand (Git for Windows ships one at `C:\Program Files\Git\ucrt64\bin\pdftotext.exe`), run `pdftotext -enc UTF-8 -layout <pdf> -` and look for "Tenant outbound policy"; judge by content, since `-layout` can reorder cells. The author checked geometry numerically (cursor positions, arc end points, page and row evidence) but had no rasteriser, so this is the first look at the rendered appearance.

- [ ] **C6. Commit**

```powershell
git add -- src/assets/fonts/JetBrainsMono_400Regular.ttf src/assets/fonts/OFL-JetBrainsMono.txt src/features/inspector/report/buildReportModel.ts src/features/inspector/report/reportFileName.ts src/features/inspector/report/buildReportModel.test.ts src/features/inspector/report/renderMarkdown.test.ts src/features/inspector/report/reportFixtures.ts src/features/inspector/report/renderPdf.ts src/features/inspector/report/renderPdf.test.ts src/features/inspector/report/pdfFonts.ts src/features/inspector/report/pdfFonts.test.ts src/features/inspector/report/pdfDrawing.ts src/features/inspector/report/pdfDrawing.test.ts src/features/inspector/report/pdfTable.ts src/features/inspector/report/pdfTable.test.ts src/features/inspector/report/testCmap.ts
git commit -m "feat(inspector): vector PDF reports, hostname redaction and snapshot ownership tests" -m "JetBrainsMono_400Regular.ttf: JetBrains Mono v2.304 (https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip), fonts/ttf/JetBrainsMono-Regular.ttf, SHA-256 A0BF60EF0F83C5ED4D7A75D45838548B1F6873372DFAC88F71804491898D138F"
```

As for P5.2 and P5.3, the execution evidence (C1–C5 output, the reader check) goes to `docs/phase-5/evidence/p5-6/execution.md` in a follow-up docs commit that also ticks this plan.

---

## Exit proof for P5.6

- Both scopes yield `%PDF-` bytes from the real `renderPdf` (standard, long and hostile fixtures); the 60-file site report builds in well under 5 s (`renderPdf.test.ts`).
- `pdfFonts.test.ts` checks every character the renderer writes, for three fixtures in both scopes with redaction off and on, against the cmap of the face it is written in; U+2713 is absent from DM Sans and Space Grotesk (JetBrains Mono 2.304 has it, but the tick is a vector in every face) and from every write, so the tick is the vector path in `pdfDrawing.test.ts`.
- `pdfTable.test.ts` and `renderPdf.test.ts` prove, on real AutoTable output, that the head repeats on every page, no printed row spans two pages, every word of an oversized cell appears exactly once across its continuation rows, and the 3,000-character reason and 400-character name are written in full.
- The PDF title metadata is `Site readiness report: [site]` for a redacted site report and contains no environment or site identifier anywhere in the file; URL, bare, pathed and ported hostnames, any case, are redacted in summaries, reasons, guidance, questions, details, banners and snapshots in both scopes; unrelated hosts, `other-dev.example.com` and server logic file names are untouched.
- A snapshot-only sentinel is absent from the model, Markdown and PDF writes when the snapshot is off and appears once under the snapshot when on; reasons and guidance remain.
- Markdown output and both goldens are unchanged.
- **Unsupported characters (P-12, owner to confirm):** text outside the validated repertoire (CJK, emoji, most combining marks, a few Latin Extended-A points) is replaced by `?` in the PDF and counted in a footer line, never dropped silently; Markdown carries it intact. The owner may instead choose to throw (the AC-9.9 error toast) and make such names unexportable as PDF.
- **Bundle:** unchanged in P5.6 (932.90 kB); importing `renderPdf` in P5.7 adds about 1,066 kB raw / 439 kB gzip (1,999.28 kB), and P5.8's size gate decides.
- Inactive files read `<name> (Inactive)` in the site table and the Review first and Not scanned entries of both formats, while the file-scope H2 and title, stems and file names keep the stored name (AC-9.2); every PDF page carries `Page n of m` (P-14(d), (f); owner decisions 2026-11-02).
- Open for P5.7/P5.8: the C5 reader check on the six PDFs; export dialog, toasts, snapshot-at-open and save timing (AC-9.1, AC-9.8, AC-9.9, Error Scenarios "PDF generation fails": `renderPdf` throws an `Error` on a layout failure and P5.7 maps it to the toast); bundle size once `renderPdf` is imported; the spec text that still cites "README §05" (L8, L832) and should state the inactive label and page numbers; recording the font provenance in the evidence file.

## Self-review

- **Spec coverage.** FR-10 export both scopes: `renderPdf.test.ts` real bytes for each scope (dialog and format choice: P5.7). Configuration-only, tenant-policy, interval and not-atomic statements, banners (AC-7.9, AC-7.12), pill labels (AC-8.10): `writes what the model holds…`. Escaping and AC-9.10: the hostile-name tests plus the untouched Markdown hostile test and goldens. Pagination (F44): `pdfTable.test.ts` and the long-fixture tests. Local fonts and licences: P-01 and `embeds DM Sans 400/700…`. Fonts per role, vector `✓`: `pdfFonts.test.ts`, `pdfDrawing.test.ts`. **Characters (P-12):** `SUPPORTED_RANGES` is proven against all four cmaps (`has a glyph in every embedded face…`), `createTextGuard` by `replaces each code point outside the ranges with ? and counts it`, and the outcome by `replaces characters outside the font set with ? and says so in the footer` and `adds no replacement note…`. **Observer vs document:** `observes exactly the strings the document receives` spies `doc.text` and compares it with `observe` for the standard and long fixtures in both scopes. **Inactive label (P-14(d)):** the model, Markdown and PDF tests in A3, A4 and A8, including that the H2, title, snapshot headings and stem keep the stored name (AC-9.2 L356). **Page numbers (P-14(f)):** `numbers every page of the long site report and leaves no placeholder`. AC-9.3 header, hero, ring, files table, Review first and Not scanned order, footer: `drawReport`, `lists Review first and Not scanned in the model order`, ring geometry tests. AC-9.4: one shared model. AC-9.5: the questions and snapshot on/off tests. AC-9.6: the title test and the model alias tests. AC-9.7 and AC-8.12: `keeps Reviewed distinct…`. A8: palette and contrast tests. WR-001, WR-002: Phase A pins and signals. AC-9.1, AC-9.8, AC-9.9 and the toast rows of Error Scenarios: P5.7; the 5 s build ceiling here is a guard, not the measured gate.
- **Placeholders.** None: every created file is complete, the anchored edits (`buildReportModel.ts` L27–L53, L6 and L81, `reportFileName.ts` L5–L7, `renderMarkdown.test.ts` L6 and tail, `reportFixtures.ts` and `buildReportModel.test.ts` tails) quote the exact current lines, and the `package.json` is untouched (P-01 option B). No `TODO`, skipped or `.only` tests, `any`, `!` or `as` casts (`as const` and `satisfies` only).
- **Type consistency.** `renderPdf(model: ReportModel): Uint8Array` is unchanged for `skeleton.test.ts`; `drawReport(doc: jsPDF, model: ReportModel, observe?: WriteObserver): PdfTableEvidence`; `createTextGuard(): TextGuard` with `clean(text)` and `replaced()` is shared by `renderPdf.ts` and `pdfTable.ts`; `displayName(file: { name; active }): string` is used only by `rowModel`; `WriteObserver = (text: string, face: PdfFace) => void` is shared by `pdfFonts.ts`, `pdfTable.ts` and `renderPdf.ts`; `PdfTableEvidence` carries `finalY`, `logicalRows`, `physicalRows`, `rows[{ index, page, spansMultiplePages }]` and `headPages`, which is exactly what `pdfTable.test.ts` and `renderPdf.test.ts` read; `PDF_FACE_FILES` and `PDF_FACE_NAMES` tie `pdfFonts.test.ts` to the files the renderer embeds; `REPORT_FIXTURE_CASES`, `LONG_FILE_NAME` and `LONG_REASON` are exported once and imported where used.
- **Dry run.** Every file in this plan was run on a scratch copy of the `071415c` tree (node_modules linked, nothing installed): `tsc -b` exit 0; ESLint on `src` with `--max-warnings=0` exit 0; `vitest run src` 96 files, 1,536 tests passing (with the official JetBrains Mono 2.304 TTF); a lint of the whole repository (`eslint .`) exit 0; `vite build` succeeds; the four WR-002 cases fail against the original redactor and pass against the new one; the long site report is 29 pages. Not verified: the rendered appearance (C5) and the PowerShell download in B1 against the real working tree (the same zip was fetched and checked with `curl` and Python).
- **Reuse of Phase 20.** The ring maths, the oversized-row splitting idea and the palette come from Phase 20 (`REPORT_PALETTE` gains `greyTint` and `white`; the Phase 20 `blue #1f6fd1` is kept for ring arcs). Its "recording subclass" test mechanism, its `$value` and Prettier steps, and its npm-mirror font step are replaced as P-03 and P-01 state; page numbers come from a final `setPage` pass rather than `putTotalPages` (P-07).
