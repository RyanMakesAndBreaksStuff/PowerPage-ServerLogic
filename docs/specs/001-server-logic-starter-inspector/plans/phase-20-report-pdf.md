# Phase 20: Inspector Vector PDF Reports Implementation Plan

> **Execution superseded — 2026-11-01.** `../../../plans/p5-1_plan.md`, `../../../plans/p5-2_plan.md` and `../../../plans/p5-3_plan.md` (and later P5.x plans) own the remaining Inspector implementation, contracts and check commands. This file keeps the stable phase IDs, design choices and probe outcomes; its code blocks, `$value` fallback, blanket API prohibition, Prettier commands and sequencing are not current execution instructions.

**Goal:** Save the Phase 16 report content as a readable vector PDF for either scope, with locally embedded licensed fonts, accurate status rings, repeated table headings and complete text across pages.

**Architecture:** `renderPdf` consumes Phase 16's redacted `ReportModel` without rebuilding report facts. `pdfDrawing` owns the report palette and vector checkmark/ring paths and reuses `ringArcs`; `pdfTable` wraps over-page logical entries into explicit continuation rows before AutoTable lays them out. Text comes from the shared model; no HTML parser or remote resource loader is used.

**Tech stack:** Installed jsPDF 4.2.1 and jspdf-autotable 5.0.8, TypeScript 6.0 strict, Vitest 5, Vite inline static font imports, Phase 04 ring geometry. Adds one dev dependency: `@expo-google-fonts/jetbrains-mono@0.4.1` (OFL font mirror).

**Part / wave:** Logic Inspector, I3. Phase ID 20.

**Implements / Satisfies:**

- FR-10: both PDF scopes, vector text, three locally embedded static TTFs, vector `✓`, font coverage, repeated table heads, intact printed rows and no omitted text.
- AC-9.3: brand/report header, whole-site ring, K/T counts from the model, hero/headline/path/provenance, ready/review/incomplete counts, per-file rings/status cells/result, banners, ordered Review first / Not scanned and footer.
- AC-9.4: This file + PDF matches the file model/Markdown content and uses the report styling.
- AC-9.5: model-controlled questions/snapshot omission.
- AC-9.6: no reconstruction of identities; title metadata uses redacted `model.title`, and Phase 16 owns redacted filename derivation.
- AC-9.7 and AC-8.12: Reviewed remains distinct and lists original reasons.
- AC-9.8: same frozen model data as Markdown; Phase 24 owns the moment the snapshot is captured.
- AC-9.10: configuration containing HTML/Markdown syntax is direct literal vector text; nothing is fetched or executed.
- FR-11 and A8: `ringArcs` thresholds/gaps and report token adjustments independent of the host theme.

**Depends on:** 00 bundled DM Sans/Space Grotesk TTFs and jsPDF dependencies; 04 `src/lib/ringGeometry.ts`; 16 final `ReportModel`, `buildReportModel` and shared report fixtures. Saving/export UI belongs to Phase 24.

**Files:**

- Modify: `package.json`, `package-lock.json` — pin the JetBrains Mono mirror as a dev dependency only.
- Create: `src/assets/fonts/JetBrainsMono_400Regular.ttf` — locally bundled static path font.
- Create: `src/assets/fonts/OFL-JetBrainsMono-TTF.txt` — exact mirror font licence.
- Create: `src/features/inspector/report/pdfDrawing.ts` — report tokens/vector icons and rings.
- Create: `src/features/inspector/report/pdfTable.ts` — explicit over-page continuation rows.
- Modify: `src/features/inspector/report/renderPdf.ts` — layout/serialize the shared model.
- Create: `src/features/inspector/report/testCmap.ts` — test-only Unicode cmap formats 4 and 12.
- Signal: `src/features/inspector/report/renderPdf.test.ts` — real PDF draw/text/pagination/font coverage.

**Interfaces — Consumes:** Phase 16 `ReportModel` / `ReportCheck` / `ReportSection`; `ringArcs(states: readonly RingState[]): readonly RingArc[]`; installed `jsPDF` and `autoTable`; three static TTFs.

**Interfaces — Produces:** pinned `renderPdf(model: ReportModel): Uint8Array`; report-internal `drawCheckmark`, `drawRing`, `REPORT_PALETTE`, `preparePdfRows`; test-only `fontCodePoints(bytes: Uint8Array): ReadonlySet<number>`.

**Out of scope:** Host/file save, toast budgets, new UI, rasterising HTML, new report formats, runtime permission validation and font fallback for scripts outside the selected fonts' coverage.

## Decisions

1. The original handoff README §05 still governs report type and palette, with A8's `#b05408` orange text and `#1e6dcd` blue chip on `#eaf2fd`. Reports stay white in both host themes. Body is DM Sans 400, headings Space Grotesk 700, paths JetBrains Mono 400. The two Phase 00 TTFs are reused; only JetBrains is copied from the OFL mirror.
2. Use a landscape A4 page with 36pt margins, preserving the report's wide table layout. Text wraps without truncation; prose can continue on later pages. Tables repeat headings via `showHead: 'everyPage'`.
3. AutoTable's `rowPageBreak: 'avoid'` still splits a row taller than a whole page. `preparePdfRows` wraps each cell at its actual fixed width and splits only these oversized logical entries into explicit continuation rows; each physical row fits below the repeated head. This avoids shrinking long text to unreadability or dropping it. Real hooks assert no printed row has `spansMultiplePages`.
4. jsPDF 4.2.1 gives instances their own methods; `jsPDF.prototype.text` is undefined. Tests mock the constructor with a subclass of the real library, then spy on methods of the real instance. They still serialize genuine PDF bytes and use the real AutoTable; a wrapped AutoTable callback records row page/split evidence.
5. `✓` is a path of three points and is never written in a font. Rings use cubic Bézier arcs at most 90° each based on Phase 04 `ringArcs`, preserving the 4° gaps and proportional arcs above 30 checks. Needs review uses a font-supported `!` plus status words; not-scanned uses grey and text.
6. `model.title` is the only PDF title metadata source. Direct `doc.text`/AutoTable strings are treated as text, so HTML escaping is unnecessary; no `doc.html`, image API or URL loader is called.
7. The test-only cmap reader checks every emitted character across both scopes and the hostile fixture against the actual TTF of each write. It skips only line separators and explicitly proves U+2713 is missing from DM Sans / Space Grotesk; the glyph is drawn separately.
8. Phase 16 owns the test data; this phase imports `reportFixtures`. Its source and full `ReportModel` shape are not repeated here. The fixture covers the report glyphs and syntax; languages outside these fonts' glyph sets are not claimed as supported.

**Baseline:** Primary `001-logic-inspector` at `42c2809`, with Phase 16's draft applied in `.scratch/inspector-plan`. Existing report fonts are `DMSans_400Regular.ttf` and `SpaceGrotesk_700Bold.ttf` with their Phase 00 licences. The UI JetBrains Mono woff2 stays unchanged. All commands run from the implementation checkout root.

---

### Task 1: Produce complete vector PDFs with embedded fonts and intact printed rows

**Owns:** PDF layout, licensed path-font inclusion, vector drawing, continuation-row preparation and PDF serialization.

**Files:**

- Modify: `package.json`, `package-lock.json`, `src/features/inspector/report/renderPdf.ts`.
- Create: `src/assets/fonts/JetBrainsMono_400Regular.ttf`, `src/assets/fonts/OFL-JetBrainsMono-TTF.txt`, `src/features/inspector/report/pdfDrawing.ts`, `src/features/inspector/report/pdfTable.ts`.
- Signal: `src/features/inspector/report/renderPdf.test.ts`.
- Create: `src/features/inspector/report/testCmap.ts` — needed by the acceptance test.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/features/inspector/report/testCmap.ts`:

```ts
// Test-only OpenType cmap reader: formats 4 (BMP) and 12 (full Unicode) in the bundled TTFs.
export function fontCodePoints(bytes: Uint8Array): ReadonlySet<number> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number): number => view.getUint16(offset, false);
  const u32 = (offset: number): number => view.getUint32(offset, false);
  const tableCount = u16(4);
  let cmap = -1;
  for (let index = 0; index < tableCount; index++) {
    const offset = 12 + index * 16;
    if (u32(offset) === 0x636d6170) cmap = u32(offset + 8);
  }
  if (cmap < 0) throw new Error('TTF has no cmap table');
  const points = new Set<number>();
  const count = u16(cmap + 2);
  for (let index = 0; index < count; index++) {
    const record = cmap + 4 + index * 8;
    const platform = u16(record);
    const encoding = u16(record + 2);
    if (platform !== 0 && !(platform === 3 && (encoding === 1 || encoding === 10))) continue;
    const table = cmap + u32(record + 4);
    const format = u16(table);
    if (format === 12) {
      const groups = u32(table + 12);
      for (let group = 0; group < groups; group++) {
        const start = table + 16 + group * 12;
        const first = u32(start);
        const last = u32(start + 4);
        const firstGlyph = u32(start + 8);
        for (let point = first; point <= last; point++) {
          if (firstGlyph + point - first !== 0) points.add(point);
        }
      }
    } else if (format === 4) {
      const segments = u16(table + 6) / 2;
      const endCodes = table + 14;
      const startCodes = endCodes + segments * 2 + 2;
      const deltas = startCodes + segments * 2;
      const rangeOffsets = deltas + segments * 2;
      for (let segment = 0; segment < segments; segment++) {
        const first = u16(startCodes + segment * 2);
        const last = u16(endCodes + segment * 2);
        const delta = view.getInt16(deltas + segment * 2, false);
        const offsetAddress = rangeOffsets + segment * 2;
        const rangeOffset = u16(offsetAddress);
        for (let point = first; point <= last && point < 0xffff; point++) {
          const rawGlyph =
            rangeOffset === 0 ? point : u16(offsetAddress + rangeOffset + (point - first) * 2);
          const glyph = rangeOffset !== 0 && rawGlyph === 0 ? 0 : (rawGlyph + delta) & 0xffff;
          if (glyph !== 0) points.add(point);
        }
      }
    }
  }
  return points;
}
```
Create `src/features/inspector/report/renderPdf.test.ts`:

```ts
// @vitest-environment node
import { readFileSync } from 'node:fs';
import type { jsPDF, jsPDFOptions } from 'jspdf';
import type * as JsPdfModule from 'jspdf';
import type * as AutoTableModule from 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildReportModel } from './buildReportModel';
import {
  EXPORTED_AT,
  REPORT_OPTIONS,
  hostileReportResult,
  reportFile,
  reportResult,
} from './reportFixtures';
import { renderPdf } from './renderPdf';
import { fontCodePoints } from './testCmap';

type Write = { font: string; text: string; y: number; page: number };
type Drawing = {
  fonts: unknown[][];
  curves: unknown[][];
  lines: unknown[][];
  colors: unknown[][];
  properties: unknown[][];
  html: unknown[][];
  images: unknown[][];
};
const { documents, writes, drawings, rowsDrawn } = vi.hoisted(() => ({
  documents: new Array<jsPDF>(),
  writes: new Array<Write>(),
  drawings: new Array<Drawing>(),
  rowsDrawn: new Array<{ index: number; page: number; split: boolean }>(),
}));

function observeDocument(document: jsPDF): void {
  documents.push(document);
  const original = document.text.bind(document);
  vi.spyOn(document, 'text').mockImplementation((text, x, y, options) => {
    writes.push({
      font: document.getFont().fontName,
      text: Array.isArray(text) ? text.join('\n') : text,
      y,
      page: document.getCurrentPageInfo().pageNumber,
    });
    return original(text, x, y, options);
  });
  vi.spyOn(document, 'moveTo');
  drawings.push({
    properties: vi.spyOn(document, 'setProperties').mock.calls,
    curves: vi.spyOn(document, 'curveTo').mock.calls,
    lines: vi.spyOn(document, 'lineTo').mock.calls,
    colors: vi.spyOn(document, 'setDrawColor').mock.calls,
    fonts: vi.spyOn(document, 'addFileToVFS').mock.calls,
    html: vi.spyOn(document, 'html').mock.calls,
    images: vi.spyOn(document, 'addImage').mock.calls,
  });
}

vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof JsPdfModule>();
  return {
    ...actual,
    jsPDF: class extends actual.jsPDF {
      constructor(options?: jsPDFOptions) {
        super(options);
        observeDocument(this);
      }
    },
  };
});

vi.mock('jspdf-autotable', async (importOriginal) => {
  const actual = await importOriginal<typeof AutoTableModule>();
  return {
    ...actual,
    default(document: jsPDF, options: UserOptions): void {
      actual.default(document, {
        ...options,
        didDrawCell(data) {
          if (data.section === 'body') {
            rowsDrawn.push({
              index: data.row.index,
              page: data.pageNumber,
              split: data.row.spansMultiplePages,
            });
          }
          options.didDrawCell?.(data);
        },
      });
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  documents.length = 0;
  writes.length = 0;
  drawings.length = 0;
  rowsDrawn.length = 0;
});

function lastDocument(): jsPDF {
  const document = documents.at(-1);
  if (document === undefined) throw new Error('No PDF document was created');
  return document;
}

function lastDrawing(): Drawing {
  const drawing = drawings.at(-1);
  if (drawing === undefined) throw new Error('No PDF drawing was recorded');
  return drawing;
}

describe('renderPdf', () => {
  it.each(['file', 'site'] as const)(
    'writes a real %s PDF with locally embedded fonts and vector status paths',
    (scope) => {
      const model = buildReportModel(
        reportResult(),
        { ...REPORT_OPTIONS, scope, format: 'pdf' },
        EXPORTED_AT,
      );
      const bytes = renderPdf(model);
      expect(new TextDecoder().decode(bytes.slice(0, 8))).toMatch(/^%PDF-1\./);
      const drawing = lastDrawing();
      expect(drawing.fonts).toHaveLength(3);
      expect(drawing.curves.length).toBeGreaterThan(0);
      expect(drawing.lines.length).toBeGreaterThan(0);
      expect(drawing.colors).toContainEqual(['#1f6fd1']);
      expect(drawing.html).toHaveLength(0);
      expect(drawing.images).toHaveLength(0);
      expect(writes.map((write) => write.text).join('\n')).not.toContain('✓');
      expect(writes.some((write) => write.font === 'DMSans')).toBe(true);
      expect(writes.some((write) => write.font === 'SpaceGrotesk')).toBe(true);
      expect(writes.some((write) => write.font === 'JetBrainsMono')).toBe(true);
    },
  );

  it('paginates 50 complete rows with repeated heads and no lost file or review text', () => {
    const result = reportResult();
    result.files = Array.from({ length: 50 }, (_, index) =>
      reportFile(`file-${String(index)}`, `file-${String(index).padStart(2, '0')}`, [
        'configured',
        'needs-review',
        'configured',
      ]),
    );
    const model = buildReportModel(
      result,
      { ...REPORT_OPTIONS, scope: 'site', format: 'pdf' },
      EXPORTED_AT,
    );
    renderPdf(model);
    const document = lastDocument();
    const text = writes.map((write) => write.text).join('\n');
    expect(document.getNumberOfPages()).toBeGreaterThan(1);
    for (const file of result.files) expect(text).toContain(file.name);
    expect(writes.filter((write) => write.text === 'File').length).toBeGreaterThan(1);
    expect(text).toContain('Global Read on account via Members.');
    expect(text).toContain('Is tablePermissions configured for the intended users?');
    for (const write of writes)
      expect(write.y).toBeLessThanOrEqual(document.internal.pageSize.getHeight() - 24);
    expect(rowsDrawn.every((row) => !row.split)).toBe(true);
  });

  it('retains an over-page finding in explicit continuation rows that each stay on one page', () => {
    const result = reportResult();
    const file = reportFile('customer', 'customer-summary.js', [
      'configured',
      'reviewed',
      'configured',
    ]);
    const reason = `${'long reason '.repeat(1000)}END_OF_REASON`;
    result.files = [
      {
        ...file,
        findings: [
          file.findings[0],
          { ...file.findings[1], reasons: [{ text: reason, readFailure: false }] },
          file.findings[2],
        ],
      },
    ];
    const model = buildReportModel(result, { ...REPORT_OPTIONS, format: 'pdf' }, EXPORTED_AT);
    renderPdf(model);
    expect(writes.map((write) => write.text).join('\n')).toContain('END_OF_REASON');
    expect(lastDocument().getNumberOfPages()).toBeGreaterThan(1);
    expect(rowsDrawn.every((row) => !row.split)).toBe(true);
  });

  it('keeps reviewed reasons with includes off and redacts title metadata and all written identities', () => {
    const result = reportResult();
    result.banners = [`${result.facts.connection.name} / ${result.facts.site.domain}`];
    const model = buildReportModel(
      result,
      {
        ...REPORT_OPTIONS,
        scope: 'site',
        format: 'pdf',
        redact: true,
        questions: false,
        snapshot: false,
      },
      EXPORTED_AT,
    );
    renderPdf(model);
    expect(lastDrawing().properties).toContainEqual([{ title: 'Site readiness report: [site]' }]);
    const text = writes.map((write) => write.text).join('\n');
    expect(text).toContain('Reviewed');
    expect(text).toContain('Global Read on account via Members.');
    expect(text).not.toContain('[ ]');
    expect(text).not.toContain('Configuration snapshot');
    for (const value of [
      result.facts.connection.name,
      result.facts.connection.url,
      result.facts.site.name,
      result.facts.site.domain,
    ])
      expect(text).not.toContain(value);
  });

  it('renders hostile names as literal vector text and makes no resource request', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    try {
      const result = hostileReportResult();
      const model = buildReportModel(
        result,
        { ...REPORT_OPTIONS, fileId: 'hostile', format: 'pdf' },
        EXPORTED_AT,
      );
      renderPdf(model);
      const text = writes.map((write) => write.text).join('\n');
      expect(text).toContain('<script>');
      expect(text).toContain('[x](y)');
      expect(text).toContain('#name');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('covers every character actually written in each static TTF, with the checkmark drawn separately', () => {
    const paths = {
      DMSans: '../../../assets/fonts/DMSans_400Regular.ttf',
      SpaceGrotesk: '../../../assets/fonts/SpaceGrotesk_700Bold.ttf',
      JetBrainsMono: '../../../assets/fonts/JetBrainsMono_400Regular.ttf',
    };
    for (const scope of ['file', 'site'] as const) {
      renderPdf(
        buildReportModel(reportResult(), { ...REPORT_OPTIONS, scope, format: 'pdf' }, EXPORTED_AT),
      );
    }
    renderPdf(
      buildReportModel(
        hostileReportResult(),
        { ...REPORT_OPTIONS, fileId: 'hostile', format: 'pdf' },
        EXPORTED_AT,
      ),
    );
    const coverage = new Map(
      Object.entries(paths).map(([font, path]) => [
        font,
        fontCodePoints(readFileSync(new URL(path, import.meta.url))),
      ]),
    );
    for (const write of writes) {
      const supported = coverage.get(write.font);
      expect(supported, write.font).toBeDefined();
      for (const char of write.text) {
        if (char === '\n' || char === '\r') continue;
        expect(supported?.has(char.codePointAt(0) ?? 0), `${write.font}: ${char}`).toBe(true);
      }
    }
    expect(coverage.get('DMSans')?.has(0x2713)).toBe(false);
    expect(coverage.get('SpaceGrotesk')?.has(0x2713)).toBe(false);
  });
});
```
- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/inspector/report/renderPdf.test.ts`

Expected: 1 file and 7 tests fail with `not implemented: phase 20`. Phase 16 must already be present; without it the earlier model stub is the failure instead.

- [ ] **Step 3: Implement the minimum fix**

Run:

```powershell
npm install --save-dev --save-exact @expo-google-fonts/jetbrains-mono@0.4.1 --fetch-timeout=30000 --fetch-retries=0
```

Expected: exit 0; `package.json` gains this exact line between the existing DM Sans and Space Grotesk dev dependencies:

```json
"@expo-google-fonts/dm-sans": "^0.4.2",
"@expo-google-fonts/jetbrains-mono": "0.4.1",
"@expo-google-fonts/space-grotesk": "^0.4.1"
```

The npm-owned lockfile gains `node_modules/@expo-google-fonts/jetbrains-mono` version `0.4.1` with `MIT AND OFL-1.1`; preserve npm's lockfile update rather than copying a hand-written lock. On the verified baseline npm also synchronises stale root lock metadata from `scaffold` / `0.0.0` to the existing package's name/version/licence/engines. No transitive dependency version changes were required. If this read/write runs outside the sandbox, use the ordinary scoped npm install approval path.

Run:

```powershell
Copy-Item -LiteralPath node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf -Destination src/assets/fonts/JetBrainsMono_400Regular.ttf
```

Expected: the destination is the identical static TTF.

Run:

```powershell
Copy-Item -LiteralPath node_modules/@expo-google-fonts/jetbrains-mono/LICENSE_FONT -Destination src/assets/fonts/OFL-JetBrainsMono-TTF.txt
```

Expected: the exact OFL 1.1 copyright/licence text is retained alongside the font. These are upstream assets, copied byte for byte; do not retype a binary or a licence.

Run:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath src/assets/fonts/JetBrainsMono_400Regular.ttf,src/assets/fonts/OFL-JetBrainsMono-TTF.txt
```

Expected:

| File | SHA-256 |
| --- | --- |
| `JetBrainsMono_400Regular.ttf` | `B6B1FF4DDEFE36D7F2A6174E1D001CAB374E594519EE9049AF028D577B64C5F5` |
| `OFL-JetBrainsMono-TTF.txt` | `B2FE5E8987594E9FFD1D2CA52A2F5D73EB8335243893C5D6254B5AD69269591D` |

Create `src/features/inspector/report/pdfDrawing.ts`:

```ts
import type { jsPDF } from 'jspdf';
import { ringArcs } from '@/lib/ringGeometry';
import type { RingState } from '@/lib/ringGeometry';

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
} as const;

export function drawCheckmark(doc: jsPDF, x: number, y: number, size = 8): void {
  doc.setDrawColor(REPORT_PALETTE.blueChip).setLineWidth(1.5);
  doc
    .moveTo(x, y + size * 0.5)
    .lineTo(x + size * 0.35, y + size * 0.85)
    .lineTo(x + size, y)
    .stroke();
}

export function drawRing(
  doc: jsPDF,
  states: readonly RingState[],
  cx: number,
  cy: number,
  radius: number,
  width: number,
): void {
  for (const arc of ringArcs(states)) {
    doc
      .setDrawColor(
        arc.state === 'done'
          ? REPORT_PALETTE.blue
          : arc.state === 'review'
            ? REPORT_PALETTE.orange
            : REPORT_PALETTE.grey,
      )
      .setLineWidth(width)
      .setLineCap('butt');
    let start = (arc.startDeg * Math.PI) / 180;
    const end = (arc.endDeg * Math.PI) / 180;
    doc.moveTo(cx + radius * Math.sin(start), cy - radius * Math.cos(start));
    // Cubic arcs at most 90 degrees each keep the ring vector-based and reuse the SVG geometry.
    while (start < end - 1e-8) {
      const next = Math.min(end, start + Math.PI / 2);
      const k = (4 / 3) * Math.tan((next - start) / 4);
      const x0 = cx + radius * Math.sin(start);
      const y0 = cy - radius * Math.cos(start);
      const x1 = cx + radius * Math.sin(next);
      const y1 = cy - radius * Math.cos(next);
      doc.curveTo(
        x0 + k * radius * Math.cos(start),
        y0 + k * radius * Math.sin(start),
        x1 - k * radius * Math.cos(next),
        y1 - k * radius * Math.sin(next),
        x1,
        y1,
      );
      start = next;
    }
    doc.stroke();
  }
}
```
Create `src/features/inspector/report/pdfTable.ts`:

```ts
import type { jsPDF } from 'jspdf';
import type { CellDef } from 'jspdf-autotable';

type PreparedRow = { readonly owner: number; readonly cells: CellDef[] };

export function preparePdfRows(
  doc: jsPDF,
  rows: readonly (readonly CellDef[])[],
  widths: readonly number[],
  maxHeight: number,
): readonly PreparedRow[] {
  const maxLines = Math.max(1, Math.floor((maxHeight - 12) / 11.5));
  return rows.flatMap((row, owner) => {
    const wrapped = row.map((cell, index) => {
      const width = widths[index];
      if (width === undefined) throw new Error('Missing report column width');
      doc.setFont(cell.styles?.font ?? 'DMSans', 'normal').setFontSize(10);
      const content = cell.content ?? '';
      const text = Array.isArray(content) ? content.join('\n') : String(content);
      const padding = cell.styles?.cellPadding === undefined ? 12 : 22;
      const lines: unknown = doc.splitTextToSize(text, width - padding);
      if (
        !Array.isArray(lines) ||
        !lines.every((line: unknown): line is string => typeof line === 'string')
      ) {
        throw new Error('Could not lay out report table');
      }
      return lines;
    });
    const parts = Math.max(1, ...wrapped.map((lines) => Math.ceil(lines.length / maxLines)));
    return Array.from({ length: parts }, (_, part) => ({
      owner,
      cells: row.map((cell, column) => ({
        ...cell,
        content: wrapped[column]?.slice(part * maxLines, (part + 1) * maxLines) ?? [],
      })),
    }));
  });
}
```
Replace `src/features/inspector/report/renderPdf.ts` completely (Phase 00's five-line stub):

```ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CellDef } from 'jspdf-autotable';
import dmSans from '@/assets/fonts/DMSans_400Regular.ttf?inline';
import spaceGrotesk from '@/assets/fonts/SpaceGrotesk_700Bold.ttf?inline';
import jetBrainsMono from '@/assets/fonts/JetBrainsMono_400Regular.ttf?inline';
import type { RingState } from '@/lib/ringGeometry';
import type { ReportModel } from '@/features/inspector/report/reportModel.types';
import type { ReportCheck, ReportSection } from './reportModel.types';
import { drawCheckmark, drawRing, REPORT_PALETTE as palette } from './pdfDrawing';
import { preparePdfRows } from './pdfTable';

const MARGIN = 36;
const LINE_HEIGHT = 15;
type FontName = 'DMSans' | 'SpaceGrotesk' | 'JetBrainsMono';

function embedFont(doc: jsPDF, data: string, family: FontName): void {
  const filename = `${family}.ttf`;
  doc.addFileToVFS(filename, data.slice(data.indexOf(',') + 1));
  doc.addFont(filename, family, 'normal');
}

function ringStates(checks: readonly ReportCheck[]): readonly RingState[] {
  return checks.map((check) =>
    check.status === 'not-scanned'
      ? 'not-scanned'
      : check.status === 'needs-review'
        ? 'review'
        : 'done',
  );
}

function statusColor(check: ReportCheck): string {
  return check.status === 'not-scanned'
    ? palette.muted
    : check.status === 'needs-review'
      ? palette.orange
      : palette.blueChip;
}

function statusCell(check: ReportCheck): CellDef {
  return {
    content: `${check.status === 'needs-review' ? '! ' : ''}${check.statusText}`,
    styles: {
      textColor: statusColor(check),
      fillColor:
        check.status === 'needs-review'
          ? palette.orangeTint
          : check.status === 'not-scanned'
            ? palette.head
            : palette.blueTint,
      cellPadding: { top: 6, bottom: 6, left: 16, right: 6 },
    },
  };
}

function siteStatusCell(check: ReportCheck): CellDef {
  return {
    ...statusCell(check),
    content: `${check.status === 'needs-review' ? '! ' : ''}${check.statusText}${check.status === 'reviewed' ? `: ${check.finding}` : ''}`,
  };
}

export function renderPdf(model: ReportModel): Uint8Array {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: 'landscape',
    putOnlyUsedFonts: true,
  });
  embedFont(doc, dmSans, 'DMSans');
  embedFont(doc, spaceGrotesk, 'SpaceGrotesk');
  embedFont(doc, jetBrainsMono, 'JetBrainsMono');
  doc.setLineHeightFactor(1.15);
  doc.setProperties({ title: model.title });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  let y = MARGIN;

  function ensureSpace(needed: number): void {
    if (y + needed > height - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function paragraph(
    text: string,
    font: FontName = 'DMSans',
    size = 11,
    color: string = palette.ink,
    indent = 0,
  ): void {
    doc.setFont(font, 'normal').setFontSize(size).setTextColor(color);
    const wrapped: unknown = doc.splitTextToSize(text, width - MARGIN * 2 - indent);
    if (
      !Array.isArray(wrapped) ||
      !wrapped.every((line: unknown): line is string => typeof line === 'string')
    ) {
      throw new Error('Could not lay out report text');
    }
    const lineHeight = Math.max(LINE_HEIGHT, size * 1.3);
    for (const line of wrapped) {
      ensureSpace(lineHeight);
      // Configuration is passed only to vector text APIs, never parsed as HTML or a resource URL.
      doc.text(line, MARGIN + indent, y + size);
      y += lineHeight;
    }
    y += 6;
  }

  function heading(text: string): void {
    ensureSpace(40);
    paragraph(text, 'SpaceGrotesk', 15);
  }

  function table(head: string[], body: CellDef[][], widths: number[]): void {
    // Tall logical entries become explicit continuation rows; AutoTable never splits a physical row.
    const prepared = preparePdfRows(doc, body, widths, height - MARGIN * 2 - 60);
    autoTable(doc, {
      startY: y,
      margin: MARGIN,
      head: [head],
      body: prepared.map((row) => row.cells),
      theme: 'grid',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'DMSans',
        fontStyle: 'normal',
        fontSize: 10,
        overflow: 'linebreak',
        cellPadding: 6,
        lineColor: palette.rules,
        lineWidth: 0.5,
        textColor: palette.ink,
        valign: 'middle',
      },
      headStyles: {
        font: 'DMSans',
        fontStyle: 'normal',
        fillColor: palette.head,
        textColor: palette.muted,
      },
      columnStyles: Object.fromEntries(widths.map((cellWidth, column) => [column, { cellWidth }])),
      didDrawCell(data) {
        if (data.section !== 'body') return;
        const owner = prepared[data.row.index]?.owner;
        const row = owner === undefined ? undefined : model.rows[owner];
        const check =
          model.scope === 'file'
            ? owner === undefined
              ? undefined
              : model.rows[0]?.checks[owner]
            : row?.checks[data.column.index - 2];
        if (
          check !== undefined &&
          (model.scope === 'file'
            ? data.column.index === 1
            : data.column.index >= 2 && data.column.index <= 4)
        ) {
          if (check.status === 'configured' || check.status === 'reviewed') {
            drawCheckmark(doc, data.cell.x + 5, data.cell.y + data.cell.height / 2 - 4, 7);
          }
        }
        if (model.scope === 'site' && data.column.index === 0 && row !== undefined) {
          drawRing(
            doc,
            ringStates(row.checks),
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2,
            10,
            3,
          );
        }
      },
      didDrawPage(data) {
        if (data.cursor !== null) y = data.cursor.y + 16;
      },
    });
  }

  function findingSection(section: ReportSection): void {
    heading(model.scope === 'site' ? `${section.title}: ${section.fileName}` : section.title);
    paragraph(section.summary, 'DMSans', 11, palette.orange);
    paragraph(section.guidance);
    for (const detail of section.detail) paragraph(detail);
    for (const question of section.questions) paragraph(`[ ] ${question}`);
  }

  drawRing(doc, ['done', 'review'], MARGIN + 7, MARGIN + 4, 6, 2);
  paragraph(`${model.header.brand} · ${model.header.label}`, 'SpaceGrotesk', 11, palette.muted, 20);
  paragraph(model.title, 'SpaceGrotesk', 24);
  const allChecks = model.rows.flatMap((row) => row.checks);
  ensureSpace(90);
  drawRing(doc, ringStates(allChecks), MARGIN + 40, y + 40, 32, 8);
  doc.setFont('DMSans', 'normal').setFontSize(18).setTextColor(palette.ink);
  doc.text(`${String(model.counts.K)}/${String(model.counts.T)}`, MARGIN + 40, y + 45, {
    align: 'center',
  });
  y += 88;
  paragraph(model.headline, 'SpaceGrotesk', 18);
  for (const line of model.lines) {
    paragraph(
      line.label === '' ? line.text : `${line.label}: ${line.text}`,
      line.label === 'Environment' ? 'JetBrainsMono' : 'DMSans',
    );
  }
  if (model.scope === 'site') {
    paragraph(
      `Ready: ${String(model.fileCounts.ready)} · Needs review: ${String(model.fileCounts.needsReview)} · Incomplete: ${String(model.fileCounts.incomplete)} · Not verified: Tenant outbound policy`,
    );
  }
  for (const banner of model.banners) paragraph(banner, 'DMSans', 11, palette.orange);

  if (model.scope === 'file') {
    table(
      ['Check', 'Status', 'Finding'],
      allChecks.map((check) => [
        { content: check.title },
        statusCell(check),
        { content: check.finding },
      ]),
      [135, 145, width - MARGIN * 2 - 280],
    );
    for (const section of model.needsReview) findingSection(section);
  } else {
    table(
      ['', 'File', 'Web role', 'Table permissions', 'Outbound networking', 'Result'],
      model.rows.map((row) => [
        { content: '' },
        { content: row.name, styles: { font: 'JetBrainsMono' } },
        ...row.checks.map(siteStatusCell),
        {
          content: row.result,
          styles: {
            textColor:
              row.result === 'Ready'
                ? palette.blueChip
                : row.result === 'Needs review'
                  ? palette.orange
                  : palette.muted,
            fillColor:
              row.result === 'Ready'
                ? palette.blueTint
                : row.result === 'Needs review'
                  ? palette.orangeTint
                  : palette.head,
          },
        },
      ]),
      [30, 145, 135, 165, 165, width - MARGIN * 2 - 640],
    );
    heading('Review first');
    for (const section of model.reviewFirst) findingSection(section);
  }
  if (model.notScanned.length > 0) {
    heading('Not scanned');
    for (const section of model.notScanned)
      paragraph(`${section.title}: ${section.fileName} — ${section.summary}`);
  }
  if (model.snapshot !== null) {
    for (const snapshot of model.snapshot) {
      heading(
        model.scope === 'site'
          ? `Configuration snapshot: ${snapshot.fileName}`
          : 'Configuration snapshot',
      );
      paragraph('Web roles');
      for (const role of snapshot.roles) paragraph(role, 'DMSans', 11, palette.ink, 10);
      paragraph('Tables with privileges');
      for (const permission of snapshot.tables)
        paragraph(permission, 'DMSans', 11, palette.ink, 10);
      paragraph('Outbound');
      for (const outbound of snapshot.outbound) paragraph(outbound, 'DMSans', 11, palette.ink, 10);
    }
  }
  for (const footer of model.footer) paragraph(footer, 'DMSans', 10, palette.muted);
  return new Uint8Array(doc.output('arraybuffer'));
}
```
- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/inspector/report/renderPdf.test.ts`

Expected: 1 file / 7 tests pass. PDF signatures start with `%PDF-1.`, the 50-row report spans multiple pages with repeated File headings, every row is intact, and an over-page reason retains `END_OF_REASON`.

Run: `npx vitest run src/features/inspector/report`

Expected: 4 files / 25 tests pass; Phase 16's 18 model/Markdown tests still pass.

Run: `npx tsc -b`

Expected: exit 0 with no diagnostics.

Run: `npx eslint src/features/inspector/report --max-warnings=0`

Expected: exit 0 with no diagnostics.

Run: `npx prettier --check src/features/inspector/report/*.ts`

Expected: `All matched files use Prettier code style!`.

- [ ] **Step 5: Commit the coherent change**

```powershell
git add package.json package-lock.json src/assets/fonts/JetBrainsMono_400Regular.ttf src/assets/fonts/OFL-JetBrainsMono-TTF.txt src/features/inspector/report/pdfDrawing.ts src/features/inspector/report/pdfTable.ts src/features/inspector/report/renderPdf.ts src/features/inspector/report/renderPdf.test.ts src/features/inspector/report/testCmap.ts
git commit -m "feat(inspector): render vector readiness PDFs"
```

## Integration verification

Run: `npx vitest run src/features/inspector/report`

Expected: 4 files / 25 tests pass, including the exact file/site Markdown goldens.

Run: `npx tsc -b`

Expected: exit 0.

Run: `npx eslint src/features/inspector/report --max-warnings=0`

Expected: exit 0.

Run: `npx prettier --check src/features/inspector/report/*.ts`

Expected: `All matched files use Prettier code style!`.

Run: `npm run build`

Expected: TypeScript and Vite exit 0, one IIFE bundle with no split chunks. Phase 20's renderer is unreachable in the main app until Phase 24 wires the export dialog; the renderer tests still exercise inline fonts and real PDF serialization directly.

Run: `npx vitest run tests/buildShape.test.ts`

Expected: all existing IIFE/released-page build-shape tests pass. Phase 23 adds the Inspector exclusion test; its stronger no-Inspector/jsPDF assertion applies once Phase 23 is in place.

Run: `npx vitest run`

Expected: the full existing/new suite passes.

## Verified while planning

On 2026-10-22, the source was drafted at real paths in `.scratch/inspector-plan` on baseline `42c2809`, together with Phase 16 and other Inspector drafts. With Phase 16 in place, restoring the original `renderPdf` stub produced all 7 expected failures with `not implemented: phase 20`; restoring the source passed all 7. The combined report suite passed 4 files / 25 tests, TypeScript and scoped ESLint exited 0, and the owned TypeScript Prettier check passed. The TTF and exact OFL copy hashes above were verified.

The first sandboxed npm install timed out after 60 seconds; the same scoped command completed in the available approved context, audited 435 packages and reported 0 vulnerabilities. jsPDF prototype inspection proved `prototype.text` is absent and instance text is present; instance spies therefore test the actual library rather than an invalid prototype hook. Installed AutoTable source confirmed its over-page row exception; the continuation-row test uses its real drawing callbacks and asserts `spansMultiplePages === false`.

The real PDF test emits complete 50-file reports, checks headings on multiple table pages, checks vertical bounds of every text write, checks that an oversized reviewed reason ends with its final marker, and checks every fixture character against the embedded fonts. The test confirms no `html`, `addImage` or `fetch` call for hostile names. This is automated layout/source evidence, not a visual comparison in a PDF viewer or a real-host save.

The shared final scratch build/full-suite outcomes are recorded by the Inspector integration owner in the phase index/release gate; this phase's specific commands and acceptance tests are independently reproducible.

## Done when

- [ ] **Source:** only this renderer/drawing/table owner serializes PDF; fonts/licences are local, metadata uses the model title, and no HTML/resource fetch route exists.
- [ ] **Tests / build:** all seven PDF tests and Phase 16 regressions, TypeScript/lint/owned format, full suite, IIFE build and build-shape checks pass; explicit continuation rows remain intact.
- [ ] **Rendered browser / PDF viewer (◆):** after Phase 24, open file/site PDFs and compare with Markdown and the Inspector screen; confirm font/type/white-page A8 styling, long wrapping, rings, footer, repeated headings and literal hostile values at normal zoom.
- [ ] **Live PPTB / site (◆):** after Phase 24, both PDF scopes save through the real host within its separately timed budget, redacted filename/title contain no environment/site identity, and screen/report status and original reason comparison passes.

