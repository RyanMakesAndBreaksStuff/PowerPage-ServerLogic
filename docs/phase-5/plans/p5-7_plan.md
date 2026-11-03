# P5.7 plan — The export lifecycle: captured report, dialog, native save (REVISED v3)

**Date:** 2026-11-03 (v1 2026-11-02; v2 2026-11-03 after the supervised review)
**Status:** Accepted plan, pending execution. Revised for the owner's decisions of 2026-11-03: **E-01 C** (the export job lives in the Inspector session store), **E-04 B** (`flushSync` in `ConnectionProvider`), **E-06 C** (a `Checkbox` primitive), **E-07 B** (the dialog can be closed while a job runs; the tool is guarded with `toolboxAPI.preventClose()`), **E-08 B** (close on failure), **E-11 B** (a build-phase watchdog), **E-12 B** (`holdSaves()` on the gated host). E-02, E-03, E-05, E-09 and E-10 keep their Adopted options as amended in "Choices deltas". The supervised review (`docs/plans/p5-7_supervised-review.md`) is dispositioned in the table at the end; several findings dissolve under the new choices and are marked so. Code blocks are sketches of contracts and the shape of each change, not paste-ready files; execution expands them in the P5.5 style (failing tests first, then implementation, per sub-slice).
**Baseline:** branch `logic-inspector-v2-build`, HEAD `8c84779` (`src/` identical to `493942a`). Every line number below was re-read at this HEAD on 2026-11-03. Last recorded gates: `npm test` 113 files / 1899 tests after `493942a` (`docs/phase-5/evidence/p5-5/execution.md` L114); `npm run build` 988.19 kB at `45b1fd3` (L72). Both are re-measured in the Baseline step and recorded in the evidence file.
**Spec:** `docs/specs/001-server-logic-starter-inspector/spec.md` 4.2.1: Story 9 (AC-9.1 to AC-9.10), FR-10, FR-1 (notifications), Error Scenarios L917 to L921 and L935 to L936, AC-7.4, AC-7.6 and AC-7.8, AC-7.10, accessibility L886 to L896. No spec delta is needed. Two readings are recorded: AC-9.1's "disabled while a scan runs" is met by having no Export report control in the scanning state (D-02 placement; owner sign-off under O-6); AC-9.9's "retry" after a failure is a re-open of the dialog (E-08 B), which Error Scenario L921 ("PDF fails, Markdown still available") still satisfies.
**Host API:** `toolboxAPI.preventClose()` and `toolboxAPI.releasePreventClose()`, both `Promise<boolean>`, require PPTB 1.2.6 (docs: tool-development/api-reference/toolbox-api, "Tool Lifecycle"; `node_modules/@pptb/types/toolboxAPI.d.ts` L499 to L513, top-level members, not under `utils`). The manifest `features.minAPI` is `1.2.7` (`package.json` L98), so no manifest change. While the guard is set, closing the tool tab or quitting PPTB shows a host warning with an "Ignore & Close" override; there is no close event the tool can observe.
**Brief:** `phasse5plan.md` §P5.7 (owns CR-004 and the Phase 24 save-failure gap) and §6 rows CR-004, RG-004, RG-005.
**Supersedes:** Tasks 8a and 8b of `docs/plans/11-01-2026-phase-5-session-export.md` and `docs/specs/001-server-logic-starter-inspector/plans/phase-24-export-dialog.md`, as reference only.

## Goal

Make Export report work. For a finished or stopped scan with at least one file, the title-tile button asks the Inspector session store to open an export job: an immutable copy of the evaluated `SiteResult` on screen, the selected file id and the session generation, captured inside the store. The 520 px "Export report" modal is a view of that job: Report (This file / Site summary), Format (Markdown / PDF) and three Include checkboxes with the AC-9.1 defaults. The primary button marks the job busy, sets the host's prevent-close guard, lets React paint the busy state, builds the report from the captured state through the P5.6 report functions, then hands the bytes and filename to `host.saveFile` with the right filter and releases the guard when the host answers. The user may close the dialog at any time; a running job finishes in the background and the Export report button explains that an export is still in progress until it settles. Every outcome settles the one owner: saved shows "<filename> exported"; a native cancel is silent; a build or save failure closes the dialog and shows "Couldn't save <filename>" with a plain-language reason, and the user re-opens to try another format; results cleared while the job is idle or building close the dialog with "Results changed, so the export was cancelled." and save nothing; results cleared while the host owns the save dialog close ours with the same notice, and the captured snapshot is still what gets saved. A build that runs past 5 s is reported with a warning toast; no timer ever reports a failure the host might not have. The connection provider commits a confirmed identity synchronously, so a host answer that arrives during a build invalidates the job before the handoff. Nothing under `report/`, `model/`, `scan/` or `src/app/shell/` changes; no runtime dependency is added.

## Spec items missing from the build (gap table, verbatim at `8c84779`)

| # | Spec item | Current code | Gap |
|---|---|---|---|
| G1 | AC-9.1: Export report opens the dialog for a finished or stopped scan with files | `ResultsView.tsx` L60 to L66: `// Export report is always disabled in P5.5 (D-09, D-17); P5.7 enables it and replaces the reason.` `const exportReport = (` `<Button disabledReason={EXPORT_REASON}>` | Permanently disabled; no click handler. |
| G2 | AC-7.4, AC-7.8: disabled with a reason that fits the state | `pageCopy.ts` L18 to L19 `EXPORT_REASON = 'Report export arrives in a later update.'`, used at `InspectorPage.tsx` L14, L188 and `ResultsView.tsx` L12, L62 | One placeholder; the page distinguishes "no server logic found" from "nothing was read" (`pageCopy.ts` L63) and the reason must too. |
| G3 | AC-9.1: the modal with Report, Format, Include and the primary button | no `ExportDialog` in `src`; no checkbox control anywhere in `src/components/` (`grep type="checkbox"`, `role="checkbox"`: none) | No dialog, no checkbox primitive (E-06 C). |
| G4 | AC-9.8, AC-9.9: capture, build, save, notify | `InspectorSnapshot` (`inspectorSession.types.ts` L23 to L34) has no export state; `InspectorDeps` (`inspectorDeps.ts` L7 to L12) carries `listSites`, `runScan`, `settleTimeoutMs` only; no non-test file outside `report/` imports from `report/`; the only non-test `jspdf` importer is `src/probe/libraryProbe.ts` (a separate bundle) | The store cannot build or save; jsPDF is not in the app bundle yet. |
| G5 | E-07 B: the tool must not close under a pending export | `PptbHost` (`host.types.ts` L37 to L53) has no close-guard member; `pptbHost.ts` never calls `preventClose`; `grep preventClose src`: none | No adapter surface for the host guard. |
| G6 | AC-9.1: "This file" `aria-disabled` with "Select a file first" when no file is selected | `buildReportModel.ts` L165 throws `Select a file first` | Rule exists only at build time. |
| G7 | Spec L890 (APG radio group): focus enters on the checked radio | `Modal.tsx` L16 to L17 `FOCUSABLE` matches `button:not([disabled])`, so a `PillGroup` radio with `tabIndex={-1}` (`PillGroup.tsx` L104 to L109) is a candidate; L63 to L70 focus the first non-close match | With no file selected the dialog would open with focus on the `aria-disabled` "This file" radio. |
| G8 | E-04 B: a confirmed identity commits before the export handoff | `ConnectionProvider.tsx` L30 to L36: `host.getActiveConnection().then((value) => { … setPending(false); setState(…) })`; `grep flushSync src`: none | The provider's state, the adopt effect (`InspectorSessionProvider.tsx` L50 to L52) and the store's `adopt` run on React's schedule, after the host answered. |
| G9 | E-12 B: a save the test can hold | `gatedHost.ts` L78 to L94 override `getActiveConnection`, `queryAll`, `downloadFileColumn` only; `saveFile` is spread from the base fake (L158 to L166, answers at once) | No held save; races cannot be driven. |
| G10 | Tests: a finished scan currently asserts the disabled control | `InspectorPage.test.tsx` L71 to L80 `expectDisabledExport`, called at L154, L374, L386; L396; `ResultsView.test.tsx` L149 to L167; `EXPORT_REASON` imports at `InspectorPage.test.tsx` L25 and `ResultsView.test.tsx` L12 | Assertions encode the placeholder; two imports fail `tsc -b` when it is removed. |

Already in place and reused as is: `buildReportModel(result, options, exportedAt)` (`buildReportModel.ts` L151; spreads `reportIdentity` at L184), `renderMarkdown(model): string` (`renderMarkdown.ts` L51), `renderPdf(model): Uint8Array` (`renderPdf.ts` L485, synchronous), `reportFileNameBeforeBuild(result, options)` (`reportFileName.ts` L42; equals `reportFileName(model)` by construction), `evaluateSite(facts, marks): SiteResult` (`model/rules.ts` L22, already imported by the provider at L5); `ReportOptions` (`src/types/report.ts`); the store's `publish`, `generation` discipline and `track`/`settle` chain (`inspectorSession.ts` L56 to L85); `createInspectorStore(host, deps)` (L48) created once in the provider (`InspectorSessionProvider.tsx` L38); `hostCall` (`pptbHost.ts` L55 to L62) and the `makeStubs`/`install` test pattern (`pptbHost.test.ts` L13 to L110); the fake's `FakeCall` union and `callsOf` (`fakeHost.ts` L54 to L88); `gateHost`'s parked-read shape (`gatedHost.ts` L10 to L13, L39 to L45, L78 to L114); `Modal` (focus trap, Esc, focus return at L77, `footer`, 520 default); `PillGroup` (`disabledReason`, anchor span always rendered); `Button` (`busy`, `disabledReason`, `variant`); `useDisabledReason`/`normalizeReason`; `useNotify` (`Notice = { title; body; type }`); `useHeadingFocus(scanning)` and `focus.request` (`InspectorPage.tsx` L36 to L66); fixtures `reportResult()`, `hostileReportResult()`, `longReportResult()`, `EXPORTED_AT`; `renderInspector` with `strict?: boolean`; `fixedDeps(facts, sites)` (`src/test/fixedDeps.ts`, returns an object literal, so it must spread `INSPECTOR_DEPS` once deps grow); `CONNECTION`, `OTHER_CONNECTION`, `SITE_ALPHA` ("Alpha portal"), `SITE_BETA`, `createInspectorHost`; `deferred`; the local helpers `mount`, `pick`, `graded`, `finished`, `connectionEvent` (`InspectorPage.test.tsx` L42 to L92, L320 to L326) and `scanned`, `open` (`ResultsView.test.tsx` L48 to L68); `setup(host, deps)` and `until` (`inspectorSession.test.ts` L30 to L43).

## Files

| Action | Path |
|---|---|
| Edit | `src/services/pptb/host.types.ts` (+`preventClose`, `releasePreventClose`), `pptbHost.ts` (two `hostCall`s), `fakeHost.ts` (two `FakeCall` variants, `closeGuard` behaviour), `pptbHost.test.ts` (+3 tests; `makeStubs` and the retrieval-only enumeration at L641), `src/test/gatedHost.ts` (+`holdSaves`, `releaseHeldSaves`, `pendingSaves`) |
| Create | `src/components/Checkbox.tsx`, `Checkbox.test.tsx` |
| Edit | `src/components/Modal.tsx` (`FOCUSABLE` skips `tabindex="-1"`), `Modal.test.tsx` (+1), `primitives.css` (+`.ui-checkbox` rules, +`.ui-pill--selected[aria-disabled='true']`) |
| Edit | `src/app/inspector-site/inspectorSession.types.ts` (+`ExportJob`, `exportJob`, `exportStaleCloses`, four actions), `inspectorDeps.ts` (+report functions, `now`, `yieldToHost`, `exportWatchdogMs`), `inspectorSession.ts` (export job lifecycle; `notify` parameter), `InspectorSessionProvider.tsx` (`useNotify`, pass-through), `inspectorSession.test.ts` (+export describe), `src/app/ConnectionProvider.tsx` (`flushSync`), `src/test/fixedDeps.ts` (spread `INSPECTOR_DEPS`) |
| Create | `src/features/inspector/export/ExportDialog.tsx`, `export.css`, `ExportDialog.test.tsx`, `exportCopy.ts` |
| Edit | `src/features/inspector/InspectorPage.tsx`, `ResultsView.tsx`, `pageCopy.ts`, `InspectorPage.test.tsx`, `ResultsView.test.tsx` |
| Create | `docs/phase-5/evidence/p5-7/execution.md` |
| Move on acceptance | `docs/plans/p5-7_plan.md`, `P5-7choices.md`, `p5-7_supervised-review.md` to `docs/phase-5/plans/`, plus the README row |

Not touched: `src/features/inspector/report/`, `model/`, `scan/`, `src/app/shell/`, `src/app/App.tsx`, `tests/buildShape.test.ts` (P5.8 owns build proof; a jsPDF-absence marker for the beta bundle is routed to P5.8), `package.json`, `vite.config.ts`, the spec.

## Execution convention

As P5.5: CRLF working tree, LF index; new files pasted whole; anchored edits as LF diffs matched once against the line numbers in this plan; `git diff --cached --check` before each commit; tests use only the public fake host and `src/test/` helpers; every test-first step runs with the implementation absent and its signal is recorded, including the existing tests this plan reverses (G10); `npm test --` form. Each sub-slice compiles with all tests passing and is committed on its own.

**Baseline step (before Sub-slice A, not committed):** `npm test`, `npm run build`, `npm run size` at `8c84779`; record the counts and the bundle size in the evidence header. P5.7 is the first change that puts jsPDF, jspdf-autotable and the bundled TTF fonts into `dist`; the expected growth is roughly +1 MB.

---

## Sub-slice A — Host close guard and the held save (E-07 B, E-12 B)

**Owns:** the adapter surface for `preventClose`/`releasePreventClose`; the test seam for a pending native save.

### Contracts

```ts
// src/services/pptb/host.types.ts (PptbHost, after openExternal)
/** Asks the host to warn before this tool instance closes (PPTB 1.2.6). Rejects as every other host call does. */
preventClose(): Promise<void>;
releasePreventClose(): Promise<void>;
```

`pptbHost.ts`: `preventClose: () => hostCall('preventClose', () => window.toolboxAPI.preventClose()).then(() => undefined)` and the same for `releasePreventClose`; the boolean the host returns is not needed (`false` means the host did not apply the guard; the export proceeds either way). The retrieval-only guarantee is unchanged: neither member touches `dataverseAPI`.

`fakeHost.ts`: `FakeCall` gains `{ method: 'preventClose' }` and `{ method: 'releasePreventClose' }`; `FakeHostInit.closeGuard?: SimpleBehaviour` ('ok' default, 'reject' rejects with `HostCallError('Host call failed: preventClose.')` or `…releasePreventClose.`); `setCloseGuard(behaviour)`.

```ts
// src/test/gatedHost.ts (GatedHost additions, same shape as holdDataReads at L107 to L114)
/** While true, `saveFile` parks before it reaches the fake; the fake's `save` behaviour applies when released. */
holdSaves(hold: boolean): void;
/** Releases the oldest `count` parked saves and keeps the hold on. */
releaseHeldSaves(count: number): void;
readonly pendingSaves: number;
```

A parked save records nothing until released (the fake records the call when it runs), so `host.callsOf('saveFile')` tells the test whether the handoff happened. E-12 B replaces `vi.spyOn(host, 'saveFile')`.

### Phase A1 — Failing tests

`pptbHost.test.ts`: in `makeStubs` add `preventClose` and `releasePreventClose` (`vi.fn().mockResolvedValue(true)`) to the `toolbox` object; tests "preventClose and releasePreventClose call the host once each and resolve" and "reject with a HostCallError when the host call fails, logging only the error name"; extend the retrieval-only enumeration at L641 ("touches only read members across every PptbHost method") with the two members.

`src/test/gatedHost.test.ts` does not exist and is not created; the seam is proven by its first users in Sub-slice C (`inspectorSession.test.ts`), which is how `holdDataReads` was proven. Record this in the evidence.

### Phase A2 — Implementation

The four edits. Commit: `feat(pptb): add the host close guard and a held save for tests`.

---

## Sub-slice B — Checkbox primitive and Modal entry focus (E-06 C)

**Owns:** the F47-style checkbox; spec L890 entry focus; the selected-busy pill rule.

```tsx
// src/components/Checkbox.tsx
export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** F47: a blocked choice stays focusable (aria-disabled, not disabled) and explains itself on hover and focus. */
  disabledReason?: string | null;
};
export function Checkbox(props: CheckboxProps): ReactElement
```

A `<label className="ui-checkbox">` wrapping a native `<input type="checkbox">` and the text, inside a `ui-reason-anchor` span that is always rendered (as `Button.tsx` L31 and `PillGroup.tsx` L63 do). With a reason: `aria-disabled`, the `useDisabledReason` trigger props, the tooltip, and `onChange` ignored (the input stays controlled, so the visual state cannot flip). CSS in `primitives.css` next to the pills: `accent-color: var(--primary)`, `--control-border` for the box, 12 px label, `.ui-checkbox[aria-disabled='true'] { color: var(--muted); cursor: not-allowed; }`.

`Modal.tsx` L16 to L17: `FOCUSABLE` excludes `[tabindex="-1"]` on every selector, so entry focus and the Tab trap consider tabbable controls only; a `PillGroup`'s checked radio (`tabIndex 0`) receives entry focus. `primitives.css`: `.ui-pill--selected[aria-disabled='true'] { color: var(--on-primary); }` so a blocked selected pill stays readable (today `.ui-pill[aria-disabled='true']` at L102, specificity 0,2,0, beats `.ui-pill--selected` at L72).

### Phase B1 — Failing tests

`Checkbox.test.tsx` (modelled on `PillGroup.test.tsx` L21 to L44 harness and the F47 describe at L128): "is a labelled checkbox that reflects checked"; "toggles on click and on Space and reports the new value"; "marks a blocked checkbox aria-disabled but leaves it focusable and described by its reason"; "never toggles a blocked checkbox by click or Space"; "shows the reason on hover and focus and hides it when they end".

`Modal.test.tsx`: "skips controls with tabindex -1 on entry and in the Tab trap" (a harness child `<button tabIndex={-1}>` placed first). The eleven existing Modal tests pass unchanged (the harness has no `tabindex=-1` control).

### Phase B2 — Implementation

Commit: `feat(components): add the Checkbox primitive and make Modal entry focus skip tabindex -1`.

---

## Sub-slice C — The export job in the session store (E-01 C, E-02, E-04 B, E-08 B, E-09, E-11 B)

**Owns:** AC-9.8 (capture, later changes ignored, cancellation before save, snapshot kept once the save started), AC-9.9 (build before save, failure toast with the filename and a plain reason, cancel silent), the AC-9.1 defaults and the "This file" rule, AC-9.5 to AC-9.7 as pass-through, the host close guard around a job, the build watchdog, synchronous identity commit.

### Contracts

```ts
// src/app/inspector-site/inspectorDeps.ts
export type InspectorDeps = {
  listSites: typeof listSites;
  runScan: typeof runScan;
  settleTimeoutMs?: number;
  // P5.7: what an export needs. Tests inject fakes the way they inject listSites/runScan.
  buildReportModel: typeof buildReportModel;
  renderMarkdown: typeof renderMarkdown;
  renderPdf: typeof renderPdf;
  reportFileNameBeforeBuild: typeof reportFileNameBeforeBuild;
  now: () => Date;
  /** One macrotask (`setTimeout(0)`), never rAF alone (a hidden document never paints and the job would hang). Used before the build so React paints the busy state, and after it so a host answer already delivered (E-04 B commits it synchronously) has invalidated the job before the handoff. Not a timeout. */
  yieldToHost: () => Promise<void>;
  /** E-11 B: a build still running this long after submit is reported with a warning toast. Default 5000. */
  exportWatchdogMs?: number;
};
export const INSPECTOR_DEPS: InspectorDeps; // real functions, `now: () => new Date()`, `yieldToHost` on setTimeout
```

```ts
// src/app/inspector-site/inspectorSession.types.ts
export type ExportPhase = 'idle' | 'building' | 'saving';
export type ExportJob = {
  readonly result: SiteResult;            // deep-frozen structuredClone of evaluateSite(facts, marks) at open
  readonly selectedFileId: string | null; // null when fileId is not in result.files
  readonly generation: number;            // snapshot.generation at open (E-02)
  readonly options: ReportOptions;        // fileId mirrors selectedFileId
  readonly phase: ExportPhase;
  /** False once the user closed the dialog or the results were cleared; the job may still be saving (E-07 B). */
  readonly open: boolean;
};
// InspectorSnapshot gains:
exportJob: ExportJob | null;
/** Counts the times an open dialog was closed because its results were cleared; the page moves focus to the heading on each change (E-10). */
exportStaleCloses: number;
// InspectorActions gain:
openExport: () => void;                                           // scan done, files > 0, no job
setExportOptions: (patch: Partial<Omit<ReportOptions, 'fileId'>>) => void; // idle only; scope 'file' ignored without a selection
closeExport: () => void;                                          // idle → job null; building/saving → open: false
submitExport: () => void;                                         // idle and open only
```

`INITIAL_SNAPSHOT` gets `exportJob: null, exportStaleCloses: 0`, so `blankFor` (`InspectorSessionProvider.tsx` L13 to L22) masks it automatically and `stop()` (L204 to L208) clears it. `createInspectorStore(host, deps, notify)`: the provider passes `useNotify()` (the harness and `App.tsx` already mount `NotifyProvider` above it). `InspectorSession` exposes `exportJob`, `exportStaleCloses` and the four actions.

**Invalidation (one place).** Every generation bump already in the store (`startScan` L135 to L140, the abandoned-scan path L165, `adopt` with a new identity L191 to L199, `stop` L207, the D-19 C drop L103 to L109, `setReviewed` L236) goes through `invalidateExport(patch)`: with no job the patch publishes as is; an idle or building job is removed; a saving job is kept with `open: false`. In both cases, if the job was open, the patch also increments `exportStaleCloses` and `notify` gets one info toast "Results changed, so the export was cancelled." (type `info`). This is the only place that toasts a cancellation. A mark cannot change while the modal is open (focus trap), so `setReviewed` reaching this path is theoretical and still correct.

**`submitExport()` in order.** Guard `job.phase === 'idle' && job.open` → publish `phase: 'building'` → start the watchdog (`setTimeout(exportWatchdogMs)`; on fire, if `snapshot.exportJob` is this job and still `building`, notify warning "The report is taking longer than expected." / "Building has run for more than 5 seconds. It will finish and the save dialog will open." (type `warning`)) → `host.preventClose()` (fire-and-forget; a rejection is logged by the adapter and ignored) → `await deps.yieldToHost()` (paint) → if `snapshot.exportJob !== job` return → `name = reportFileNameBeforeBuild(result, options)` → `model = buildReportModel(result, options, now())` → `content = format === 'markdown' ? renderMarkdown(model) : renderPdf(model)` → `await deps.yieldToHost()` (E-04) → if `snapshot.exportJob !== job` return → clear the watchdog → publish `phase: 'saving'` → `saved = await host.saveFile(name, content, [filter])` with `{ name: 'Markdown', extensions: ['md'] }` or `{ name: 'PDF', extensions: ['pdf'] }` → if `snapshot.exportJob` is this job (same object or its `open: false` copy): publish `exportJob: null`; `saved.status === 'saved'` ? success toast `${name} exported` : nothing. `catch`: `console.error(errorName(error))`; if the job is still the store's job: publish `exportJob: null`, error toast `Couldn't save ${name}` with the body from the message policy (E-08 B: the dialog closes with it). `finally`: clear the watchdog; `host.releasePreventClose()` (fire-and-forget). Because the job identity is checked after every `await`, a job removed by `invalidateExport` or `stop()` settles silently and still releases the guard. The watchdog can only fire after a synchronous build has returned, before the post-build yield's continuation, so it fires exactly when the build took longer than the budget and never while the host owns the save dialog (E-11 B, brief).

**Message policy (toast body).** `HostCallError` passes its message through (`Host call failed: saveFile.`). Any other throw (jsPDF internals, a `RangeError`, `pdfTable.ts` L109) shows `BUILD_FAILED_BODY` "The report couldn't be built." before `saving`, else `SAVE_FAILED_BODY` "The file couldn't be written."; the technical name goes to `console.error` only. Texts live in `src/features/inspector/export/exportCopy.ts` and are imported by the store (the store already imports from `features/inspector/scan`).

**`openExport()`.** Requires `scan.status === 'done'`, `evaluateSite(scan.facts, marks).files.length > 0` and `exportJob === null`; captures `freeze(structuredClone(evaluateSite(facts, marks)))`, `selectedFileId = files.some(f => f.fileId === fileId) ? fileId : null`, `options` = AC-9.1 defaults with `scope: selectedFileId === null ? 'site' : 'file'` (E-09: every open starts from the defaults), `phase: 'idle'`, `open: true`.

**E-04 B (`ConnectionProvider.tsx` L30 to L45).** Both `then` callbacks wrap their `setPending(false); setState(…)` in `flushSync(() => { … })` from `react-dom`. React commits the sync-lane render and flushes its passive effects before `flushSync` returns, so the provider's adopt effect (`InspectorSessionProvider.tsx` L50 to L52) runs `store.adopt` inside the host's answer callback and `invalidateExport` has run before any later task. What remains open is a host event whose `getActiveConnection` answer has not arrived yet; the post-build yield gives one macrotask for a delivered answer to run. The saved content is the captured snapshot AC-9.8 permits. `flushSync` is called from a promise callback, never during render.

### Phase C1 — Failing tests

`inspectorSession.test.ts`, new `describe('export job (P5.7)')`. Setup: `setup(host, deps, notify)` gains a `notify = vi.fn()` third argument; `deps` spreads `INSPECTOR_DEPS` with spied report functions, `now: () => EXPORTED_AT`, `yieldToHost` on real timers (fake timers where noted), `exportWatchdogMs: 5000`; a `finishedStore()` helper adopts `CONNECTION`, waits for `sites.status === 'ok'`, selects `SITE_ALPHA` with `fixedDeps`-style facts carrying files `customer-summary` and `order-sync`, and waits for `scan.status === 'done'`.

- "opens a job for a finished scan with files: a frozen evaluated clone, the selected file, the generation and the spec defaults" — `Object.isFrozen` on a nested finding; a later `setReviewed` changes `session` but not `exportJob.result`.
- "defaults to This file when the selected id is in the result, else Site summary; scope cannot become file without a selection".
- "resets to the spec defaults on every open" (E-09).
- "refuses to open with zero files, before a scan is done, or while a job exists".
- "saves every scope, format and include combination with the captured state" — `it.each` over the 32 combinations: `buildReportModel` called with the frozen clone, `{ ...options, fileId }` and `EXPORTED_AT`; `saveFile` called with `reportFileNameBeforeBuild(result, options)`, the Markdown string or a `Uint8Array` starting `%PDF-`, the one matching filter; the saved name equals the real `reportFileName(model)` of the built model (AC-9.10); success toast; job null; `callsOf('preventClose')` and `callsOf('releasePreventClose')` one each, in that order.
- "paints the busy phase before the build runs" — the `buildReportModel` stub asserts `snap().exportJob?.phase === 'building'` and that a `yieldToHost` call resolved before it.
- "closes an open dialog with one info toast and counts a stale close when the results are cleared while idle or building" — `it.each` over `store.rescan()`, `store.adopt(OTHER_CONNECTION)`, `store.adopt(null)`, `store.selectSite(SITE_BETA)`: job null, one info toast, `exportStaleCloses` 1; the building case triggers the bump from inside the `renderMarkdown` stub; `saveFile` never called; `releasePreventClose` still called once.
- "cancels silently when the results are cleared after the user already closed the dialog" — `closeExport()` while idle then `rescan()`: no toast, counter unchanged.
- "keeps a saving job through a results change, closes its dialog once, and settles saved, cancelled or rejected" — `host.holdSaves(true)`; submit; `until(() => host.pendingSaves === 1)`; `store.adopt(OTHER_CONNECTION)`: job present with `open: false`, one info toast, counter 1; `releaseHeldSaves(1)` with `setSave` of `save` / `cancel` / `reject`: success toast / nothing / error toast; job null; the bytes the fake received are the captured ones; no second info toast.
- "closes the dialog and reports a build, Markdown, PDF or save failure once with a plain reason; re-opening lets another format succeed" (E-08 B) — `it.each` over the four failure points; the three build-path failures toast `Couldn't save <name>` with `BUILD_FAILED_BODY`, the host rejection with `Host call failed: saveFile.`; `console.error` received the error name only; `exportJob` null; `openExport()` then PDF→Markdown saves.
- "ignores a second submit and option changes while building or saving; closeExport only hides the dialog" — `holdSaves`; `closeExport()` → `open: false`, phase still `saving`; `releaseHeldSaves(1)` → success toast, job null.
- "closes silently on closeExport while idle and on a native cancellation; writes nothing" — `callsOf('notify')` empty, `savedFiles` empty.
- "warns once when the build runs past the watchdog and never while the host owns the save" (E-11 B) — fake timers; `renderPdf` stub advances the fake clock by 6 s synchronously: one warning toast with the two texts, then the save proceeds and succeeds; a second case with `holdSaves(true)` and a 60 s advance during `saving`: no toast, phase still `saving`.
- "sets the host close guard for the life of a job and releases it on every outcome, including a rejected guard call" — `createFakeHost({ closeGuard: 'reject' })` through `gateHost`: the export still saves; `console.error` has `HostCallError`.
- "stop() during a pending save settles it silently and releases the guard" — `holdSaves`, `stop()`, release: no toast, `exportJob` null, `releasePreventClose` once.

`InspectorSessionProvider.test.tsx` (jsdom): "commits a confirmed connection synchronously when the host answers, so a job building at that moment is cancelled before the handoff" (E-04 B) — render the provider with a `Probe` that calls `openExport`/`submitExport`; `renderMarkdown` stub: `host.setConnection(OTHER_CONNECTION); host.emit({ kind: 'connection-changed' })`; after the store's post-build yield `saveFile` was never called, one info toast, `exportJob` null. With `flushSync` absent the adopt effect runs on React's schedule and the test is flaky or fails; with it the test is deterministic. A `ConnectionProvider` test asserts the existing behaviour is unchanged ("keeps the last confirmed identity through a rejected re-read" still passes).

`src/test/fixedDeps.ts`: returns `{ ...INSPECTOR_DEPS, listSites, runScan }` so every page test gets the real report functions.

### Phase C2 — Implementation

`inspectorDeps.ts`, `inspectorSession.types.ts`, `inspectorSession.ts` (`invalidateExport`, `openExport`, `setExportOptions`, `closeExport`, `submitExport`, `freeze`), `InspectorSessionProvider.tsx` (`const notify = useNotify(); useState(() => createInspectorStore(host, deps, notify))`; expose the new fields and actions), `ConnectionProvider.tsx` (`flushSync`), `exportCopy.ts`, `fixedDeps.ts`. The `freeze` helper is typed without `as`; if `tsc -b` needs a cast the TypeScript rule wins and the helper is reshaped, recorded as a deviation. Commit: `feat(inspector): own the export job in the session store, guard the tool while it saves`.

---

## Sub-slice D — The Export dialog, page wiring and the real Export report (E-03, E-05, E-06 C, E-07 B, E-10)

**Owns:** AC-9.1's dialog (520 px, scrim, APG modal, focus trap, entry focus, Esc, focus return, controls and defaults), the busy state, control-to-option mapping, CR-004 end to end, AC-7.4 and AC-7.8 reasons, focus after a stale close, StrictMode.

### Dialog

```tsx
// src/features/inspector/export/ExportDialog.tsx
export function ExportDialog({ job }: { job: ExportJob }): ReactElement // reads actions from useInspector()
```

Rendered by the page while `session.exportJob?.open === true`. `Modal` with title "Export report", width 520, `onClose={session.closeExport}` (Esc, the close button and Cancel all close, in every phase, E-07 B). Body: a muted context line "<site> · <file>" or "<site>" (text nodes, `overflow-wrap: anywhere`); `PillGroup` "Report" (`This file`, `Site summary`) and "Format" (`Markdown`, `PDF`); three `Checkbox`es "Questions to consider", "Configuration snapshot", "Redact environment and site names". While `phase !== 'idle'` every pill and checkbox carries the busy reason "Wait for the export to finish, or close this dialog." (`aria-disabled`, explained; the selected pill stays readable through the Sub-slice B rule); while idle only `This file` can be blocked, with "Select a file first" when `selectedFileId === null`. A polite `role="status"` line that is always mounted: empty while idle, "Building report…" or "Saving report…" otherwise. Footer: `Cancel` (ghost) and the primary `Export Markdown` / `Export PDF` with `busy={phase !== 'idle'}`. Entry focus is the checked Report radio through the Modal change; no dialog-level focus code.

### Page and copy

- `pageCopy.ts`: remove `EXPORT_REASON` (L18 to L19); add `EXPORT_NO_FILES_REASON` "Nothing to export: no server logic files were found." (`facts.inventoryComplete`), `EXPORT_NOTHING_READ_REASON` "Nothing to export: no server logic records were read." (zero files and `inventoryComplete === false`, the split `announcementFor` makes at L63), `EXPORT_NO_SITES_REASON` "Nothing to export: no sites were found." (E-05) and `EXPORT_IN_PROGRESS_REASON` "An export is still in progress." (E-07 B, `exportJob !== null`).
- `InspectorPage.tsx`: in `InspectorPage` (L254 to L268) render `{session.exportJob?.open === true ? <ExportDialog job={session.exportJob} /> : null}` after `<PageBody>` (L265). Stale-close focus (E-10): `const staleCloses = session.exportStaleCloses; const seen = useRef(staleCloses); useEffect(() => { if (seen.current !== staleCloses) { seen.current = staleCloses; focus.request(); } }, [staleCloses]);` — the store is an external system, the effect reacts to its counter, and the ref guards the mount run. `PageBody` (L118 to L124) needs no new prop: the `results` case (L237 to L245) passes `onExport={state.result.files.length === 0 ? null : session.openExport}` and `exportBusy={session.exportJob !== null}` from its own `useInspector()` (L125). The no-sites panel (L188) uses `EXPORT_NO_SITES_REASON`.
- `ResultsView.tsx`: props `onExport: (() => void) | null` and `exportBusy: boolean`; the button becomes `<Button variant="primary" onClick={onExport ?? undefined} disabledReason={exportBusy ? EXPORT_IN_PROGRESS_REASON : onExport === null ? (facts.inventoryComplete ? EXPORT_NO_FILES_REASON : EXPORT_NOTHING_READ_REASON) : null}>` keeping the glyph and label (`variant="primary"` is O-4).

### Phase D1 — Failing tests

`ExportDialog.test.tsx` (jsdom): mounts `<SitePill /><InspectorPage />` through `renderInspector` with `fixedDeps(graded())` as `ResultsView.test.tsx`'s `scanned()`/`open()` do (the dialog reads the session, so there is no lighter real harness); toasts are asserted on `host.callsOf('notify')` (the fake's default `notify: 'ok'` never renders a local toast, `NotifyProvider.tsx` L16 to L22; precedent `DownloadStarterButton.test.tsx` L116 to L140), `toEqual([])` for the silent paths; the status line is queried `within(dialog)`.

- "opens as a 520 px modal with the AC-9.1 controls, defaults and the primary label" — role `dialog` named "Export report", `style.width` 520, radios This file and Markdown checked, checkboxes on/on/off, "Export Markdown", an empty `status` inside the dialog.
- "opens with focus on the checked Report radio, with and without a selected file".
- "disables This file with 'Select a file first' and selects Site summary when no file is selected".
- "maps every control to its option" — `it.each` per control: Site summary → `scope: 'site'`; PDF → `format: 'pdf'`, filter `pdf`, label "Export PDF"; untick Questions → `questions: false`; untick Snapshot → `snapshot: false`; tick Redact → `redact: true` and the saved name `site-site-readiness.md`; the other options keep their defaults.
- "Cancel, Esc and the close button close while idle, return focus to Export report and write nothing".
- "shows Building report… and a busy primary before the build runs; every pill and checkbox explains itself" — `yieldToHost` held on `deferred` through `deps`.
- "while saving: the dialog can still be closed; the job finishes and toasts; Export report says an export is in progress meanwhile" (E-07 B) — `host.holdSaves(true)`; Esc; dialog gone; the button is `aria-disabled` with `EXPORT_IN_PROGRESS_REASON`; `releaseHeldSaves(1)`; success toast; the button is enabled again.
- "a saved result closes the dialog and toasts the filename; a native cancel closes silently".
- "a failed save closes the dialog with Couldn't save <filename>; re-opening offers Markdown and it saves" (E-08 B) — `host.setSave('reject')`, then `setSave('save')`.
- "hostile names render as text" — `hostileReportResult()`-shaped facts: literal characters; no `img`/`script`.

`ResultsView.test.tsx`, replacing "Export report (D-09, D-17)" (L149 to L167) with "Export report (P5.7)": "opens the Export report dialog for a finished scan with files"; "is disabled with the no-files reason for a complete empty result and the nothing-read reason for a stopped empty result"; "stays present and enabled for a stopped scan with files".

`InspectorPage.test.tsx`: existing tests this slice reverses or breaks (recorded as the failing signal): L25 import stops compiling; L372 to L376 "shows Export report disabled… for a finished scan (D-09, D-17)" is deleted; `expectDisabledExport` (L71 to L80) takes the expected reason and its callers become L154 (`EXPORT_NO_SITES_REASON`), L386 (`EXPORT_NO_FILES_REASON`), L396 (`EXPORT_NOTHING_READ_REASON`). New tests through `finished()`:

- "opens the export dialog from a finished scan, saves This file as Markdown and toasts the filename" — `savedFiles[0].defaultName === 'customer-summary-readiness.md'`; the content contains the H2 and the statuses shown on screen (AC-9.8); success toast; focus back on Export report.
- "exports Site summary as PDF with no file selected" — bytes start `%PDF-`; filename `Alpha-portal-site-readiness.pdf`.
- "a stopped scan's report carries the connection-lost notice" (AC-7.10) — `graded({ stopped: 'connection-lost', inventoryComplete: false })` with files.
- "shows Export report disabled with the right reason for an empty complete site, an empty stopped scan and under No sites found" (AC-7.4, AC-7.8).
- "closes the dialog with the Results changed toast and saves nothing when the connection changes while it is open; focus lands on the new panel's heading" — `host.setConnection(OTHER_CONNECTION)` + `connectionEvent(host)`; dialog gone; `savedFiles` empty; one info toast; `document.activeElement` is the heading.
- "keeps the dialog and the export when the connection is renamed while it is open" (AC-7.6, L936) — `setConnection({ ...CONNECTION, name: 'Renamed' })` + `connectionEvent`; dialog stays; Export Markdown saves.
- "closes the dialog when the connection changes during a pending save, finishes the save, and moves focus to the heading" — `holdSaves(true)`; Export Markdown; `setConnection(OTHER_CONNECTION)` + `connectionEvent`; dialog gone, one info toast; `releaseHeldSaves(1)`; success toast; heading focused.
- "exports under StrictMode" — `finished({ strict: true })`; Export Markdown; success toast; `exportJob` cleared.
- "another site while the dialog is open" has no page test: the scrim (`primitives.css` L251 to L254, `z-index: 1000`) covers the picker popup (`siteCombobox.css` L52, `z-index: 60`) and Tab is trapped, so the user cannot reach the picker; the store test covers `selectSite` and the connection-change test covers the page path. O-2 is closed on that basis.
- "keeps the captured review when a mark is undone before export" is unreachable with the modal open; covered by the store's frozen-clone test. Noted, not written.

### Phase D2 — Implementation

`ExportDialog.tsx`, `export.css` (tokens only; 12 px body; context line `overflow-wrap: anywhere`), the three page edits. Commit: `feat(inspector): wire Export report to the store-owned export dialog`.

---

## Rendered check (local, not committed)

A throwaway dev entry, made and removed the way P5.5's R1 files were (`docs/phase-5/evidence/p5-5/execution.md` L76): `index.dev.html` plus `src/devMain.tsx` rendering `<App host={gateHost(createFakeHost({ connection: CONNECTION }))} inspectorDeps={fixedDeps(graded())} />` with `holdSaves(true)` toggled from the console. Light and dark at 1024×700 and 1100×780: the dialog on its scrim, pills and checkboxes against `--tile`, the busy state (every control explained, selected pill readable, status line), the dialog closed mid-save with the title-tile button explaining the pending export, the 200 % zoom reachability of the footer buttons, long names in the context line. Keyboard route: Export report → Enter → focus on the checked Report radio → Tab cycle → Esc → focus on Export report. Screenshots to `.rm-frontend-review/p5-7/`, deleted with the dev entry before the final gates.

## Gates and commit order

After the Baseline step and the four slice commits:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run size
```

Expected: all exit 0; the test count and bundle size are recorded against the Baseline step (expected roughly +1 MB for jsPDF, autotable and the fonts entering `dist`). `npm run build:beta` is not run: `tests/buildShape.test.ts` L125 to L135 already builds `--mode beta` into `node_modules/.cache/build-shape/beta-mode` and asserts the Inspector markers absent, and `build:beta` writes to the same `dist` (`vite.config.ts` L111 changes `outDir` for `probe` only), which would overwrite the artifact `npm run size` measures.

## Evidence

Create `docs/phase-5/evidence/p5-7/execution.md` with the P5.5 sections: header (plan path, date, branch, baseline `8c84779`, the Baseline step's numbers), `## Commits`, `## Gate output` (each slice's failing signal including reversed tests, confirm run, full-suite count, final gates, size before and after), `## Rendered check`, `## Deviations from the plan text`, `## Observation`, `## Still open`:

- RG-004 live timings in PPTB Desktop on a production build: primary button to save dialog and save confirm to toast, both ≤ 5 s; captured-screen versus output parity for both formats and scopes; whether the watchdog toast ever fires on the reference machine.
- RG-005: screen-reader and host keyboard checks; control contrast in both themes; selectable PDF text.
- `preventClose` in PPTB Desktop: close the tab during a held save and confirm the host warning and the "Ignore & Close" override; confirm the guard is released after save, cancel and failure (no stale warning on a later close).
- PPTB save-dialog modality: does the webview receive input while `saveFile` is pending? It decides whether closing the dialog mid-save is reachable by a user (E-07 B) and whether the busy reasons are ever seen.
- Focus after a failed save: with E-08 B the dialog closes and the Modal returns focus to Export report; confirm in Chromium or PPTB that the busy primary's native `disabled` (`Button.tsx` L42) did not already send focus to `body` before the close.
- Context-line wrapping for a break-free name of about 70 characters or more.
- The E-04 B residual: a host event whose answer has not arrived by the post-build yield is seen only after the handoff; the saved snapshot is the one AC-9.8 permits.
- A jsPDF-absence marker for the beta bundle, routed to P5.8.

Move the plan, choices and supervised-review files to `docs/phase-5/plans/` and add the README row (only after the owner accepts the decisions).

## Exit proof for P5.7 (brief §P5.7, verbatim requirements → where proven)

| Brief requirement | Proof |
|---|---|
| Export action for finished/stopped scans with ≥1 file; disabled for a running scan or zero files | `ResultsView.test.tsx` "Export report (P5.7)"; `InspectorPage.test.tsx` reasons test; no control in the scanning state (D-02, O-6) |
| Immutable `SiteResult` and selected file id captured at open; defaults | `inspectorSession.test.ts` "opens a job…", "defaults to This file…", "resets to the spec defaults" |
| One controller owns snapshot and idle/building/saving; no mirrored booleans | the store's `exportJob.phase` is the only busy state; the dialog and `ResultsView` read `session.exportJob`; `grep useState src/features/inspector/export InspectorPage.tsx` finds only `useHeadingFocus`'s counter |
| Build report and filename from captured state before `saveFile`, correct filter, string or bytes; recheck validity at the handoff | 32-combination test; "closes an open dialog… while idle or building"; the provider's E-04 B test |
| Results clear before native save → one notification, nothing submitted; after native save starts the snapshot is saved | "closes an open dialog with one info toast…", "keeps a saving job through a results change…" |
| Settle on every outcome; success toast; cancel silent; failure one useful error and retry when valid; invalidation after a failed save still works | the lifecycle tests; "closes the dialog and reports a … failure once…; re-opening lets another format succeed" (under E-08 B a failed job no longer exists, so a later invalidation has nothing to cancel) |
| No duplicate submissions; Esc, focus trap, focus return preserved; no timeout that could misreport | "ignores a second submit…"; `Modal.test.tsx`; `ExportDialog.test.tsx` focus tests; "warns once when the build runs past the watchdog and never while the host owns the save" |
| Tests cover both scopes/formats and every include/redact combination, frozen review state, pre-save invalidation, changes during native save, rejection then invalidation/retry, cancellation and success; rendered keyboard checks; PPTB timings measured separately | sub-slices C and D; Rendered check; Evidence "Still open" |

## Spec coverage

| Requirement | Test |
|---|---|
| AC-9.1 modal, controls, defaults, entry focus, This file reason, primary label, disabled with zero files, stopped notice | `ExportDialog.test.tsx` first four tests; `InspectorPage.test.tsx` reasons and stopped-scan tests |
| AC-9.2 to AC-9.4, AC-9.6, AC-9.7, AC-9.10 content and names | P5.6 goldens; D1 "maps every control to its option"; 32 combinations; saved name equals `reportFileName(model)` |
| AC-9.5 include toggles | 32 combinations; D1 control mapping |
| AC-9.8 toast, screen match, capture at open, cleared results close with toast, native save keeps the snapshot | `InspectorPage.test.tsx` first test, connection-change and pending-save tests; store capture and saving-phase tests |
| AC-9.9 build before save, failure toast with filename and reason, no partial file, cancel silent | failure `it.each` with the message policy; cancel tests; `savedFiles` empty on failure |
| AC-7.6 / L936 same-identity re-read does not cancel | "keeps the dialog and the export when the connection is renamed" |
| FR-1 notifications through `useNotify` | all toasts asserted on `host.callsOf('notify')` |
| Error Scenarios L917, L918, L921, L935 | reasons tests; cancel test; failure-then-reopen test; connection-change test |
| Spec L890 to L891 | D1 entry-focus and busy-explanation tests; `Checkbox.test.tsx` F47 tests; `Modal.test.tsx` tabindex test |

## Choices deltas (applied to `docs/plans/P5-7choices.md` on 2026-11-03; kept here as the cross-reference)

- Header L5: baseline `8c84779`; record the owner decisions of 2026-11-03 on each entry's **Owner decision** line: E-01 C, E-04 B, E-06 C, E-07 B, E-08 B, E-11 B, E-12 B; E-02, E-03, E-05, E-09, E-10 Adopted.
- E-01 C: the store's new members, `createInspectorStore(host, deps, notify)`, `InspectorDeps` carrying the report functions; `src/app/` already imports from `features/inspector` (`inspectorDeps.ts` L1, `inspectorSession.ts` L1, `InspectorSessionProvider.tsx` L5), so no new direction.
- E-02 L30: bumps are at `inspectorSession.ts` L108, L139, L165 (abandoned scan, missing from the list), L198, L207, L236; no `observe`: the store invalidates its own job at each bump.
- E-03 L45: `InspectorPage.tsx` L240.
- E-04 B: `flushSync` wraps the provider's `setState` in both `then` callbacks; what it closes (the provider-to-store hop) and what it cannot (an answer not yet delivered); the post-build yield stays.
- E-05: a fourth reason, `EXPORT_IN_PROGRESS_REASON`, for E-07 B; the stopped-empty case gets its own text.
- E-06 C: `Checkbox` is F47-style (`aria-disabled` plus reason), so pills and checkboxes behave the same while busy.
- E-07 B: Esc, Cancel and the close button always close; the job finishes in the background; the host guard is `preventClose`/`releasePreventClose` through the adapter; AC-9.1's "Esc closes it" holds in every phase.
- E-08 B: on failure the job is removed and the dialog closes with the error toast; retry is a re-open.
- E-10: the heading request is driven by `exportStaleCloses`, incremented by the store whenever an open dialog is closed by a results change, in any phase.
- E-11 B: watchdog text and the fact that, with a synchronous build, it fires exactly when the build exceeded the budget and never during `saving`.
- E-12 B: `holdSaves`/`releaseHeldSaves`/`pendingSaves` on `gatedHost`.
- O-2 closed; O-4 `variant="primary"` in D2.

## Open items (resolved 2026-11-03)

The owner answered the choices file with E-01 C, E-04 B, E-06 C, E-07 B, E-08 B, E-11 B and E-12 B and stated that everything not named is accepted as proposed. The items below are therefore closed with the plan's proposal and kept for the record.

- **O-1 (E-04 B).** Accepted: `flushSync` commits a delivered answer synchronously; an answer not yet delivered is outside any option's reach and is recorded in Evidence "Still open".
- **O-2.** Closed: no page test for "another site while the dialog is open"; the store test and the connection-change page test cover the reachable paths.
- **O-3.** Keep the disabled button under "No sites found" with `EXPORT_NO_SITES_REASON` (E-05 A).
- **O-4.** Export report is `variant="primary"`; Scan again stays ghost.
- **O-5.** No BOM; the Markdown is a UTF-8 string.
- **O-6.** Signed off: "disabled while a scan runs" is met by having no Export report control in the scanning state (D-02); no spec delta.
- **O-7.** Wording accepted as written in this plan: the failure bodies, the watchdog warning and the two busy reasons.
- **O-8.** The `EXPORT_IN_PROGRESS_REASON` on the title-tile button is the feedback for a job that is still saving after the dialog was closed; no inline notice.

## Review disposition (supervised review §G → this plan)

| Finding | Where handled |
|---|---|
| export-controller-003 / dialog-modal-002 (busy never painted) | pre-build macrotask yield in `submitExport`; store test "paints the busy phase…"; D1 "shows Building report…" |
| export-controller-004 / dialog-modal-001 (one-shot dispose under StrictMode) | dissolved by E-01 C: the store is created once in the provider and `stop()` is already StrictMode-safe (`inspectorSession.test.ts` L479); D1 "exports under StrictMode" |
| export-controller-002 (rejected after move specified three ways) | dissolved by E-08 B plus the single invalidation path: a results change toasts once at the moment it happens; a failure always closes with the error toast; store test "keeps a saving job through a results change…" |
| dialog-modal-009 (entry focus on an `aria-disabled` radio) | Sub-slice B `FOCUSABLE`; Modal test; D1 entry-focus test; G7 |
| dialog-modal-005 (toast assertions vacuous) | D1 harness named; `host.callsOf('notify')`; `within(dialog)` |
| dialog-modal-006 (no control-to-option test) | D1 "maps every control to its option"; "Cancel, Esc and the close button close while idle…" |
| page-integration-002 (misleading no-files reason) | three state reasons; `ResultsView` picks by `facts.inventoryComplete`; tests in both files |
| page-integration-003 (jsPDF "already in the bundle" false) | G4 and Baseline step; `npm run size` in Gates and Evidence |
| page-integration-004 / export-controller-007 (stale baseline) | every anchor re-read at `8c84779`; Choices deltas |
| page-integration-014 (focus to `body` after a save settles post-invalidation) | dissolved: a results change during `saving` closes the dialog at once (`open: false`, counter, toast) and the page focuses the heading then; D1 pending-save test |
| export-controller-005 (redundant `reportFileName`) | one name computation; `reportFileName` not in `InspectorDeps`; four failure points; equality assertion kept |
| export-controller-006 (unreachable rechecks) | job-identity checks after each `await`; `invalidateExport` is the one cancel-and-toast place |
| page-integration-009 (redundant eslint line) | removed |
| export-controller-001 (E-04 overclaim; vacuous A1 test) | reframed under E-04 B: the provider test drives a real host answer; `yieldToHost` doc states what the yield covers; O-1 |
| export-controller-008 (raw `error.message`) | message policy |
| page-integration-001 and -007 (E-10 mechanism, `PageBody` plumbing) | `exportStaleCloses` counter read by one effect with a ref guard; `PageBody` reads the session itself, no new prop |
| dialog-modal-003, -004, -010 (busy pills, selected pill contrast, live region) | one busy treatment for pills and checkboxes; `primitives.css` rule; always-mounted status line |
| dialog-modal-007 (close-button style, `primitives.css` in Files) | dissolved by E-07 B (the close button is never refused); `primitives.css` is in Files for the checkbox and pill rules |
| page-integration-005 (run-on bullet, O-2) | bullet replaced; O-2 closed |
| page-integration-006 (wrong PDF literal) | `Alpha-portal-site-readiness.pdf` |
| page-integration-008 (unwritable `ResultsView` test; variant) | reworded "opens the Export report dialog"; `variant="primary"` in D2 |
| page-integration-010 (weak grep proof) | exit-proof row names the only `useState` allowed |
| page-integration-011 (rename while open untested) | D1 "keeps the dialog and the export when the connection is renamed" |
| page-integration-012 (dev harness; Still open gaps) | Rendered check describes the throwaway entry; Evidence extended |
| page-integration-013 (`build:beta`) | removed from Gates; marker routed to P5.8 |
| page-integration-015 (reversed tests not enumerated) | D1 lists every reversed or broken existing test |
| Unverified candidates | Evidence "Still open" (modality, focus after failure, break-free wrap, `preventClose` live check); pending save on unmount: `App.tsx` L43 to L59 keeps pages mounted with `hidden`, and `stop()` on app teardown settles a pending save silently and releases the guard (store test); `structuredClone` and freeze typing surface in C1/C2; U-2 jsPDF under `codeSplitting: false` surfaces at the Sub-slice C `npm run build`; U-3 is O-6 |

## Self-review

- Every file reference above exists at `8c84779` or is created by this plan; line numbers were re-read on 2026-11-03 by five read-only passes over `src/app/`, `src/features/inspector/`, `src/components/`, `src/services/pptb/`, `src/test/`, `tests/`, `node_modules/@pptb/types`, `package.json` and `vite.config.ts`.
- `src/services/pptb/` changes are additive (two members, two fake call variants, one behaviour) and keep the retrieval-only guarantee; `gatedHost.ts` gains a save gate shaped like its read gate.
- The session store stays plain TypeScript and testable without React; the export job follows its `generation` discipline and is reset on every path that resets the scan.
- `flushSync` is confined to `ConnectionProvider`'s two host-answer callbacks and never runs during render.
- Shared primitives change additively (`Modal` selector, `Checkbox`, two CSS rules); every existing `Modal`, `PillGroup` and `Button` test is expected to pass unchanged, proven by the Sub-slice B gate.
- Not in this slice: build-shape proof and the beta jsPDF marker (P5.8), README and usage-manual export sections (P5.8), live timings and the `preventClose` host check (open until measured in PPTB on a production build).
