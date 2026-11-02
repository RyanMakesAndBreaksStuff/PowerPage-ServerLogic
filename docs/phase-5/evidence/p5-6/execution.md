# P5.6 execution record

**Plan:** `docs/phase-5/plans/p5-6_plan.md`
**Executed:** 2026-11-02, worktree branch `worktree-agent-ac4379e7036a10d6b`, based on `54117d5` (the worktree was created at `a6f5d19` and reset to `54117d5` before any work). One agent ran Phases A to C; `node_modules` is a junction to the main checkout's.

## Commits

| Phase | Commit | Message |
|---|---|---|
| A + B + C | `7a1a336` | feat(inspector): vector PDF reports, hostname redaction and snapshot ownership tests (16 files) |
| Docs | follow-up | evidence file and plan ticked |

## Phase A signal (A9), before any implementation

`npm test -- src/features/inspector/report`: `Test Files  6 failed | 1 passed (7)`, `Tests  6 failed | 30 passed (36)`, as the plan states.

- `pdfFonts.test.ts`, `pdfDrawing.test.ts`, `pdfTable.test.ts`, `renderPdf.test.ts` failed to load (missing modules).
- `buildReportModel.test.ts`: five failures, the four WR-002 cases (two `redacts the hostname of a URL…` cases, `redacts the environment URL host and an alias with a port…`, `keeps configured strings as exact substrings…`) and `labels an inactive file in the site table…`.
- `renderMarkdown.test.ts`: one failure, `labels an inactive file in the site table and lists, but not the H2 or snapshot heading`.

## B1 font provenance

Source: `https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip`, fetched with `curl` into a new empty directory in the session scratchpad, extracted (only `fonts/ttf/JetBrainsMono-Regular.ttf` and `OFL.txt`) into a second new directory. All four SHA-256 values and sizes match the plan:

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `JetBrainsMono-2.304.zip` | 5,622,857 | `6F6376C6ED2960EA8A963CD7387EC9D76E3F629125BC33D1FDCD7EB7012F7BBF` |
| `OFL.txt` as released | 4,399 | `30F0C136E3C88E422D0791ACD97238870F9054A9729BC34CF2FF0D4ED8CAC4AD` |
| `src/assets/fonts/JetBrainsMono_400Regular.ttf` | 273,900 | `A0BF60EF0F83C5ED4D7A75D45838548B1F6873372DFAC88F71804491898D138F` |
| `src/assets/fonts/OFL-JetBrainsMono.txt` (normalised, LF, trailing whitespace stripped) | 4,398 | `60D55F23C6CE05A81099A762CB67CA2C9B6EA251C7912720998B4C89EBFD4FAA` |

`git diff --stat` for the licence: 2 insertions, 2 deletions. `git status --short -- src/assets/fonts` printed exactly ` M src/assets/fonts/OFL-JetBrainsMono.txt` and `?? src/assets/fonts/JetBrainsMono_400Regular.ttf`.

## Gates

| Step | Command | Observed |
| --- | --- | --- |
| C1 | `npm test -- src/features/inspector/report` | exit 0; `Test Files  7 passed (7)`, `Tests  86 passed (86)` |
| C1 | `git diff --stat -- src/features/inspector/report/__golden__` | no output (goldens untouched) |
| C2 | `npm run typecheck` | exit 0, no output |
| C2 | `npx --no-install eslint src/features/inspector/report --max-warnings=0` | exit 0, no output |
| C2 | `npm run lint` | exit 0, no output |
| C3 | `npm test` | exit 0; `Test Files  99 passed (99)`, `Tests  1572 passed (1572)` |
| C3 | `npm run build` | exit 0; `index-vBv7NVh8.js  932.90 kB │ gzip: 304.37 kB` (unchanged, P-11) |
| C4 | `git diff --check` | no output |

## C5 PDFs

Generated with `INSPECTOR_PDF_OUT=1 npm test -- src/features/inspector/report/renderPdf.test.ts` (22 passed, six paths printed). Sizes: standard file 130,142 B, standard site 153,625 B, long file 173,875 B (4 pages), long site 642,473 B (29 pages), hostile file 134,229 B (2 pages), hostile site 140,333 B (2 pages); standard site 2 pages, standard file 1 page. The six files were deleted afterwards.

Checked with Git for Windows' `pdftotext` (no `pdfinfo`, no rasteriser, no human or PDF viewer available):

- (1) Text extraction works on all six; "Tenant outbound policy" is found in every file (site and file reports).
- (3, 4, 6) Not visually verified. By text: `inspector-report-long-site.pdf` has `Page 1 of 29` to `Page 29 of 29` (29 matches of `Page n of 29`), and the 400-character name appears as `… (continued 2/3)` and `… (continued 3/3)` continuation rows. Head-row repetition and no-row-cut are asserted by tests on AutoTable evidence, not seen.
- (5) The hostile names extract as literal text (`* <script> [x](y) #name.js`).
- (2) No `✓` character appears in any extracted text (0 matches), consistent with a vector tick; its drawn appearance was not seen.
- Not verified at all: ring arc proportions and gaps, tick shape, pill tints, overall appearance. A human check in a PDF reader remains open for P5.7/P5.8.

## Deviations

- The worktree started at `a6f5d19`, not `54117d5`; reset with `git reset --hard 54117d5` (clean tree, own branch) before starting.
- B1 used `curl`, `unzip` and `sed` in Git Bash into scratchpad directories instead of the plan's PowerShell script in `$env:TEMP` (PowerShell network access was denied). Same URL, same hashes, same normalisation; the licence file is LF with no trailing-space lines and ends with a newline, 4,398 bytes as the plan states.
- Existing source files are CRLF; edits were made on LF copies and every touched or new `.ts` file was restored to CRLF before the commit. Git reports an LF-to-CRLF working-copy warning for `OFL-JetBrainsMono.txt` (autocrlf), the committed blob is the LF text.
- No code, anchor or expected-number deviations; all expected counts matched.

## C5 rendered check (follow-up, 2026-11-02)

The six PDFs were regenerated on `logic-inspector-v2-build` with `INSPECTOR_PDF_OUT=1` and rasterised with `pypdfium2` (PDFium) in a throwaway scratchpad virtual environment, at 1.6x for whole pages and 4x to 5x for crops. Every page of all six files was rendered; the pages below were inspected as images. This is a rendered-image check, not a human check in a PDF reader inside PPTB; RG-005 stays open for that.

| Item | Seen | Result |
| --- | --- | --- |
| Tick | Every Configured and Reviewed cell, both scopes | Drawn vector checkmark in the blue role, aligned with the first text line |
| Pill tints | Result column, standard, long and hostile site reports | Ready blue tint, Needs review orange tint, Incomplete grey tint; text readable on each |
| Site ring, segmented | Standard site (9 checks), hostile site (3 checks) | One segment per check in file order with visible gaps; blue for Configured and Reviewed, orange for Needs review, grey for Not scanned |
| Site ring, proportional | Long site (180 checks) | Falls back to three proportional arcs (blue, orange, grey) with gaps between them |
| Row rings | Every site table row | Small per-file ring matches the row's checks |
| Head row | Long site pages 2, 5, 6 and 7; long file page 2 | The table head repeats at the top of each page |
| Row cuts | All table pages | No printed row is cut across a page; the 400-character entry is split into labelled rows `(continued 2/3)` and `(continued 3/3)` |
| Hostile text | Hostile file and site | Title, path, banner, table cell and Review first heading show the literal characters |
| Page numbers | All files | `Page n of m` bottom right on every page |

**Defect found and fixed.** The site ring's centre text was wider than the ring hole: "checks addressed" overlapped the ring on both sides in every site report, and the three-digit count `122/180` in the long report overlapped it too. `drawRingLabel` in `renderPdf.ts` now shrinks the count to fit, wraps the caption onto two lines and centres the block on the ring. The test `fits the ring count and caption inside the ring hole (P5.6 C5 reader check)` measures each label at the font and size it is drawn with; it failed before the fix (`expected [ '5/9', 'checks addressed' ] to deeply equal [ '5/9', 'checks', 'addressed' ]`) and passes after. Re-rendered crops of the standard, long and hostile rings show the text clear of the ring.

Gates after the fix: report suites 7 files / 87 tests; `npm test` 105 files / 1727 tests; `npm run typecheck`, `npm run lint` and `npm run build` exit 0 (bundle unchanged at 932.90 kB); `git diff --check` clean.

**Cosmetic, left as is** (no requirement is broken; recorded for P5.8 review):

- Continuation rows carry no tick, so their text starts at the cell padding instead of the tick indent the first row uses.
- With `rowPageBreak: 'avoid'`, a row taller than the space left moves to the next page. Long file page 1 is about half empty because the 3,000-character Table permissions row starts on page 2.
- The 400-character test name has no spaces, so the title and the File cell break it mid-word.
