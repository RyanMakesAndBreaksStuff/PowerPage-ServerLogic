# P5.7 execution record

**Plan:** `docs/phase-5/plans/p5-7_plan.md` (v3, 2026-11-03; moved from `docs/plans/` with `P5-7choices.md` and `p5-7_supervised-review.md` in the evidence commit)
**Executed:** 2026-11-03, branch `logic-inspector-v2-build`, baseline `8c84779` (plan baseline; `src/` identical to `493942a`).
**Owner decisions applied:** E-01 C, E-04 B, E-06 C, E-07 B, E-08 B, E-11 B, E-12 B; E-02, E-03, E-05, E-09, E-10 as adopted (`docs/plans/P5-7choices.md`, 2026-11-03).
**Execution shape:** four executors under the team workflow (Sub-slices A and B in parallel, C alone, D after C), one verify pass (verifier plus code reviewer, read-only), one fix round, one rendered check. Lead committed each slice after `git diff --cached --check`.

**Baseline step (at `8c84779`, not committed):** Node v24.17.0.

| Command | Observed |
|---|---|
| `npm test` | exit 0; `Test Files  113 passed (113)`, `Tests  1899 passed (1899)` |
| `npm run build` | `dist/assets/index-yi5QNX8k.js   988.70 kB │ gzip: 323.29 kB` |
| `npm run size` | `index-yi5QNX8k.js  raw 965.5 KiB  gzip 312.7 KiB` |

## Commits

| Slice | Commit | Message |
|---|---|---|
| A | `9b24ba7` | feat(pptb): add the host close guard and a held save for tests |
| B | `c092062` | feat(components): add the Checkbox primitive and make Modal entry focus skip tabindex -1 |
| C | `58d1fcb` | feat(inspector): own the export job in the session store, guard the tool while it saves |
| D | `7f25c01` | feat(inspector): wire Export report to the store-owned export dialog |
| Fix round | `309eb14` | fix(inspector): keep the stale-close count through a connection change, settle a failed filename, drop test casts |
| Evidence | see `git log` (next commit on this branch) | docs(phase-5): P5.7 execution evidence |

## Gate output

### Slice A

| Command | Observed | Expected |
|---|---|---|
| A1 `npm test -- src/services/pptb/pptbHost.test.ts` (implementation absent) | exit 1; `Test Files  1 failed (1)`, `Tests  4 failed \| 58 passed (62)`. All four `TypeError: host.preventClose is not a function`: the three new tests plus the existing "touches only read members across every PptbHost method", which now enumerates both members | red on the missing members, existing tests otherwise intact |
| A2 same command | exit 0; `Tests  62 passed (62)` | 62 |
| `npm run typecheck` | exit 0, no output | exit 0 |
| `npx --no-install eslint src/services/pptb src/test --max-warnings=0` | exit 0, no output | exit 0 |
| `npm test` (with B's files already in the tree) | `Test Files  114 passed (114)`, `Tests  1908 passed (1908)` | 113 / 1899 + A's 4 + B's 6 (see B) |
| `git diff --cached --check` | nothing | nothing |

`src/test/gatedHost.test.ts` was not created; the save seam is proven by its first users in Slice C (`inspectorSession.test.ts`), as the plan records.

### Slice B

| Command | Observed | Expected |
|---|---|---|
| B1 `npm test -- src/components/Checkbox.test.tsx src/components/Modal.test.tsx` (implementation absent) | exit 1; `Test Files  2 failed (2)`, `Tests  1 failed \| 11 passed (12)`. `Checkbox.test.tsx`: `Failed to resolve import "./Checkbox"`; Modal "skips controls with tabindex -1 on entry and in the Tab trap": `expected <button tabindex="-1">Roving</button> to be <input type="text">`; the eleven existing Modal tests passed | same |
| B2 same command | exit 0; `Tests  17 passed (17)` (12 Modal, 5 Checkbox) | 17 |
| `npm run typecheck` | exit 0, no output | exit 0 |
| `npx --no-install eslint src/components --max-warnings=0` | exit 0, no output | exit 0 |
| Combined A+B gate before committing: `npm run typecheck`, `npm run lint`, `npm test` | all exit 0; `Test Files  114 passed (114)`, `Tests  1908 passed (1908)` | 114 / 1908 |
| `git diff --cached --check` | nothing | nothing |

### Slice C

| Command | Observed | Expected |
|---|---|---|
| C1a `npm test -- src/app/inspector-site src/app/ConnectionProvider.test.tsx` (implementation and `exportCopy.ts` absent) | `Test Files  2 failed \| 1 passed (3)`; both new suites fail to compile: `Failed to resolve import "@/features/inspector/export/exportCopy"` | compile failure |
| C1b same, with only `exportCopy.ts` present | `Tests  62 failed \| 63 passed (125)`: `TypeError: store.openExport is not a function` for the 61 new store tests, `session.openExport is not a function` for the provider test | behaviour failures |
| C1 reversed tests | none at runtime; `tsc -b` reports 126 errors, all in the two test files (the `createInspectorStore(host, deps, notify)` arity and the new session members) | recorded |
| C2 same command | `Test Files  3 passed (3)`, `Tests  125 passed (125)` | 125 |
| E-04 B with `flushSync` replaced by an inline call, 5 runs | `Tests  1 failed` 5/5: `expected [ { method: 'saveFile', … } ] to have a length of +0 but got 1` | fails without `flushSync` |
| E-04 B with `flushSync`, 5 runs | `Tests  1 passed` 5/5 | deterministic |
| `npm run typecheck` | first run 4× TS2740 in `InspectorPage.test.tsx` (hand-built `InspectorDeps` literals at L183, L220, L260, L569); after spreading `...INSPECTOR_DEPS` into each: exit 0 | exit 0 |
| `npm run lint` | exit 0 | exit 0 |
| `npm test` | `Test Files  114 passed (114)`, `Tests  1971 passed (1971)` | 1908 + 63 |
| `npm run build` | `dist/assets/index-BV11Cd03.js   2,065.51 kB │ gzip: 765.82 kB`; one JS and one CSS asset; no `type="module"` or `crossorigin` in `dist/index.html` | about +1 MB, single IIFE |
| `npm run size` | `index-BV11Cd03.js  raw 2017.1 KiB  gzip 740.3 KiB` | about +1 MB |
| `git diff --cached --check` | nothing | nothing |

jsPDF, jspdf-autotable and the bundled fonts build under `codeSplitting: false` without change to `vite.config.ts` (U-2 closed).

### Slice D

| Command | Observed | Expected |
|---|---|---|
| D1 `npm test -- src/features/inspector/export src/features/inspector/InspectorPage.test.tsx src/features/inspector/ResultsView.test.tsx` (implementation absent) | `Test Files  3 failed (3)`, `Tests  33 failed \| 58 passed (91)`: missing `EXPORT_*_REASON` constants (`getByText(undefined)`), no `dialog` role, the Export report button still permanently disabled | same |
| D1 reversed existing tests | `InspectorPage.test.tsx`: the `EXPORT_REASON` import replaced by the three reasons; `expectDisabledExport(user)` became `(user, reason)`; "shows Export report disabled, with its reason, for a finished scan (D-09, D-17)" deleted; the AC-7.8 no-sites, AC-7.4 and "does not claim 'no server logic'" callers now assert `EXPORT_NO_SITES_REASON`, `EXPORT_NO_FILES_REASON`, `EXPORT_NOTHING_READ_REASON`. `ResultsView.test.tsx`: the "Export report (D-09, D-17)" describe replaced by "Export report (P5.7)" | as listed in the plan's D1 |
| D2 same command | `Test Files  3 passed (3)`, `Tests  91 passed (91)` | 91 |
| `npm run typecheck` | exit 0 | exit 0 |
| `npm run lint` | exit 0 | exit 0 |
| `npm test` | `Test Files  115 passed (115)`, `Tests  1998 passed (1998)` | 1971 + 27 |
| `npm run build` | `index-BA9P0r6x.js   2,070.70 kB │ gzip: 767.81 kB` | single IIFE |
| `npm run size` | `raw 2022.2 KiB  gzip 742.0 KiB` | recorded |
| `useState` under `src/features/inspector/export` and `InspectorPage.tsx` | only `InspectorPage.tsx` L42, `useHeadingFocus`'s counter | exit-proof row |
| `git diff --cached --check` | nothing | nothing |

### Verify pass (read-only, at `7f25c01`)

- Verifier: PASS on all eight checks (gates, exit-proof rows, spec-coverage rows, not-touched list via `git diff --stat 8c84779..HEAD` over the protected paths printing nothing, `submitExport` order, `flushSync` placement, rule scan, retrieval-only). The E-04 B test was mutation-checked in a scratch copy: it fails without `flushSync`. Non-blocking items: four `as HTMLInputElement` casts in `ExportDialog.test.tsx`; this evidence file absent.
- Code reviewer: ship, no fix round required; two MEDIUM observations. (1) `blankFor` in `InspectorSessionProvider.tsx` spread `INITIAL_SNAPSHOT`, so the view read `exportStaleCloses` as 0 during the stale render after a connection change and N again after the adopt effect; the page's E-10 effect then requested heading focus on every later connection change. (2) An open dialog in `saving` gets the "Results changed" info toast and later the success toast for the same export (by plan design; see Still open). LOW: watchdog warns after a closed building dialog; `reportFileNameBeforeBuild` outside `try`.

### Fix round (`309eb14`)

| Command | Observed | Expected |
|---|---|---|
| New page test "moves focus to the heading only for a close, not for a later connection change with no dialog open (E-10)" at `7f25c01` | failed at `InspectorPage.test.tsx:576`: `expect(document.activeElement).toBe(picker())` (focus had been pulled to the "Select a site" heading) | red |
| After `blankFor(connection, snapshot)` carries `exportStaleCloses` | `InspectorPage.test.tsx` 46 passed (46) | green |
| New store test "settles a job whose filename cannot be built…" before the fix | unhandled `RangeError` from `runExport` (`inspectorSession.ts:131`); the guard-release wait never completed | red |
| After moving the name into `try` (`let name = 'the report'` fallback, title "Couldn't save the report") | passed | green |
| `ExportDialog.test.tsx` casts replaced by `toBeChecked()` / `.not.toBeChecked()` | 17 passed (17) | green |
| `npm run typecheck`, `npm run lint` | exit 0 | exit 0 |
| `npm test` | `Test Files  115 passed (115)`, `Tests  2000 passed (2000)` | 1998 + 2 |

### Final gates (at `309eb14`, dev entry removed)

| Command | Observed |
|---|---|
| `npm run typecheck` | exit 0, no output |
| `npm run lint` | exit 0, no output |
| `npm test` | `Test Files  115 passed (115)`, `Tests  2000 passed (2000)` |
| `npm run build` | `dist/assets/index-CIbqg8WO.js   2,070.76 kB │ gzip: 767.83 kB`, `built in 3.37s` |
| `npm run size` | `index-CIbqg8WO.js  raw 2022.2 KiB  gzip 742.0 KiB` |

Size against the Baseline step: +1,082.06 kB raw (vite), +1056.7 KiB raw / +429.3 KiB gzip (size script), from jsPDF, jspdf-autotable and the bundled TTF fonts entering `dist`. `npm run build:beta` was not run (plan: `tests/buildShape.test.ts` already builds `--mode beta` under `node_modules/.cache`).

## Rendered check

Throwaway `index.dev.html`, `src/devMain.tsx` and `vite.dev.config.ts` (see Deviations) rendering `<App host={gateHost(createFakeHost({ connection: CONNECTION, notify: 'missing' }))} inspectorDeps={fixedDeps(facts)} />` under StrictMode, with the host on `window.devHost`; Playwright (Chromium) at 1024×700 and 1100×780, light and dark; 24 screenshots in `.rm-frontend-review/p5-7/` (gitignored; kept for the owner's review).

- Dialog: 520 px on its scrim; selected pills readable in both themes; checkboxes on/on/off; context line "Alpha portal · customer-summary".
- Busy (`holdSaves(true)`, Export Markdown): status line "Saving report…"; the primary `disabled` with `aria-busy`; all seven pills and checkboxes `aria-disabled` and described by "Wait for the export to finish, or close this dialog."; selected pills readable; Cancel and Close active.
- Closed mid-save (Esc): focus on Export report, `aria-disabled` with "An export is still in progress."; `pendingSaves` 1. `releaseHeldSaves(1)`: "customer-summary-readiness.md exported" toast; button enabled again.
- 200 % (512×350 viewport): dialog 465×305 inside the viewport; footer buttons visible outside the scrolling body; the body scrolls to the Redact checkbox. A lingering toast from an earlier export overlapped the footer once (toast stacking, not a dialog defect); the shell shows a horizontal page scrollbar at 512 px (pre-existing shell minimum width).
- Long names (80-character break-free site and file names): the context line wraps by character onto four lines; no horizontal overflow in the body.
- Keyboard route (`document.activeElement`): Export report → Enter → checked "This file" radio → Tab: Markdown → Questions → Snapshot → Redact → Cancel → Export Markdown → Close → This file (wrap); Shift+Tab from This file → Close; Esc → Export report.
- Not captured: "Building report…" and the failure states (covered by jsdom tests); true browser zoom (viewport equivalent used).

## Deviations from the plan text

1. **Slice A.** One extra test, "resolves when the host reports it did not apply the guard" (`false` from the host still resolves). `makeStubs` also exposes the two stubs at the top level, as the other members are.
2. **Slice B.** No `--control-border` on the native checkbox box: recolouring it needs `appearance: none` and a hand-drawn box; `accent-color: var(--primary)` only. Label colour uses `--text-2`, matching `.ui-pill`. The Space test uses `@testing-library/user-event` (a `keyDown` does not toggle a native checkbox in jsdom).
3. **Slice C.** `stop()` publishes `INITIAL_SNAPSHOT` directly (clears the job and the counter, no toast) instead of going through `invalidateExport`; the plan's own `stop()` test wants silence. Job identity is the captured `result` reference (`structuredClone` makes it unique), so `open: false` and phase copies count as the same job without a new field. `freeze<T>(value: T): T` needed no cast. The store's own `console.error` for a rejected close-guard call (added by the executor to satisfy the plan's `console.error` assertion through the fake, which does not log) was removed by the lead: the adapter already logs it, as the plan's E-07 text says; the assertion was dropped. Extra tests: a 32-combination distinctness guard, a non-host throw from `saveFile` (`SAVE_FAILED_BODY`), a `HostCallError` thrown during the build, and a closed building dialog cleared silently. `InspectorPage.test.tsx` received `...INSPECTOR_DEPS` in its four hand-built `InspectorDeps` literals so the slice compiles on its own.
4. **Slice D.** The E-10 effect reads `focus.request` through `useEffectEvent` (listing only `[staleCloses]` trips `exhaustive-deps` under `--max-warnings=0`). The busy-reason test asserts `aria-describedby` and the tooltip's `data-visible`, since every tooltip stays in the DOM. The AC-9.8 page test compares status words by position (report rows read "Web role", the tile "Web role assigned"). The three-reason page test is an `it.each` of two cases; the no-sites case stays in the existing AC-7.8 test.
5. **Fix round.** `blankFor` takes the whole snapshot (`generation` and `exportStaleCloses` carried). `runExport` computes the filename inside `try` with the fallback title "Couldn't save the report" when the name itself throws (message policy unchanged).
6. **Rendered check.** `fixHtmlForPPTB` strips `type="module"` in dev too, so the real `index.html` and the first dev page were blank under `vite`; a throwaway `vite.dev.config.ts` without that plugin was used and deleted. The fake host's `notify: 'missing'` was set to see the in-tool toast. Screenshots were kept (gitignored) rather than deleted.
7. **Line endings.** New files are LF in the working tree; git normalises to LF in the index (`--check` clean on every commit).

## Observation

- `ConnectionProvider` now commits every host answer synchronously (`flushSync`), including focus and visibility re-reads; cheap, accepted under E-04 B.
- `openExport` clones and deep-freezes the whole `SiteFacts` (including every file's code) on the click; no visible delay on the fixture site, unmeasured on a large site.
- The team hook that runs `eslint --fix` on `Edit` flips an unassigned `let` to `const` mid-edit; executors declared and assigned in one edit.

## Still open

- RG-004 live timings in PPTB Desktop on a production build: primary button to save dialog, save confirm to toast, both ≤ 5 s; captured-screen versus output parity; whether the watchdog toast ever fires on the reference machine.
- RG-005: screen-reader and host keyboard checks; control contrast in both themes (the dark dialog surface and the dimmed page are close in luminance; border and primary button keep them distinct); selectable PDF text.
- `preventClose` in PPTB Desktop: close the tab during a held save and confirm the host warning and "Ignore & Close"; confirm the guard is released after save, cancel and failure.
- PPTB save-dialog modality: whether the webview receives input while `saveFile` is pending (decides whether closing the dialog mid-save and the busy reasons are reachable).
- Focus after a failed save in Chromium or PPTB: whether the busy primary's native `disabled` sends focus to `body` before the Modal's close returns it to Export report (jsdom returns it).
- Focus after a stale close in Chromium or PPTB: the Modal's `opener?.focus()` cleanup targets a button that has already unmounted; the page's heading request wins in jsdom.
- Owner decision: an open dialog in `saving` receives "Results changed, so the export was cancelled." and later "<name> exported" for the same export (plan design under AC-9.8); consider skipping the info toast in `saving` or rewording it.
- Owner decision: the watchdog warning ("…the save dialog will open") still fires for a building job whose dialog the user closed; no test either way.
- Toast stacking over the dialog footer at small viewports.
- `fixHtmlForPPTB` strips `type="module"` in dev, so `vite` dev serving of `index.html` is blank (pre-existing; affects local dev only).
- The E-04 B residual: a host event whose answer has not arrived by the post-build yield is seen only after the handoff; the saved snapshot is the one AC-9.8 permits.
- A jsPDF-absence marker for the beta bundle, routed to P5.8.
- Close-guard count: the real host guard is assumed to tolerate a `preventClose` from a new job landing before the previous job's `releasePreventClose` (one 0 ms window); if it is a boolean, track an in-flight count.
