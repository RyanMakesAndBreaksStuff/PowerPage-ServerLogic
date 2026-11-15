# P5.7 owner choices

**Date:** 2026-11-02 (decided 2026-11-03)
**Status:** Decided. The owner chose **E-01 C, E-04 B, E-06 C, E-07 B, E-08 B, E-11 B, E-12 B** and kept the Adopted option for E-02, E-03, E-05, E-09 and E-10 (the owner's rule: anything not named in the answer is accepted as proposed, which also closes the plan's open items O-1 to O-8 with the plan's proposal). Each entry's **Decision** paragraph records what the chosen option means for the plan (`docs/plans/p5-7_plan.md` v3); the original Adopted text and the option tables are kept for the record. Line numbers cited in the Context paragraphs were written at `45b1fd3`; the plan v3 carries the re-read anchors at `8c84779`.
**Plan:** `docs/plans/p5-7_plan.md` (export lifecycle), baseline `8c84779` (P5.5 complete, evidence committed in `c3bf110`, review follow-up in `493942a`), spec 4.2.1.
**Purpose:** the decisions the plan could not settle from the spec (Story 9, FR-10, Error Scenarios), the brief (`phasse5plan.md` §P5.7) or the P5.5 decisions (D-03, D-09, D-17) alone. Approving the plan approves the "Adopted" option unless a different one is named here. Where the spec and the brief disagree the spec wins; no spec edit is needed for any of these.

How to answer: edit the **Owner decision** line of each entry (Adopted / option letter / notes), or reply in chat with the IDs.

---

## E-01 — Who owns the export lifecycle: a plain TypeScript controller in the Inspector feature

**Context.** The brief says "give one controller ownership of the snapshot and idle/building/saving lifecycle; avoid mirrored saving booleans in page and dialog". The P5.5 session is a plain store read through `useSyncExternalStore` (S-01). Starter's download is a `useTransition` inside the button (`DownloadStarterButton.tsx` L17 to L43), which cannot hold a captured snapshot across a dialog.

**Adopted.** `src/features/inspector/export/exportController.ts`: `createExportController(host, notify, deps)` is plain TypeScript with `subscribe`/`getSnapshot`, read by one hook (`useExportReport`) in `InspectorPage`. It holds the one `ExportJob` (frozen `SiteResult` clone, selected file id, options, `phase: 'idle' | 'building' | 'saving'`, the session generation it captured). The dialog is a pure view of the job; the page passes `open` down to the Export report button. Report functions and `now` are injected through `EXPORT_DEPS` the way `INSPECTOR_DEPS` and `STARTER_DEPS` are.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: plain controller store in `features/inspector/export/`** | Testable without React (32 option combinations, every save outcome, races); same shape as the session store; no second source of truth for `saving`. | One more store; the page needs a small hook to subscribe. |
| **B. `useReducer` inside `InspectorPage`** | No store; all in React. | Async save outcomes land in a component that may unmount (results replaced), so "settle on every outcome" needs refs and guards; harder to test the races. |
| **C. Extend the Inspector session store with the export job** | One store for everything. | Puts report and `saveFile` knowledge into `src/app/`, which the P5.5 architecture kept feature-free; the session would need the report deps. |

**Owner decision:** **C** (2026-11-03).

**Decision.** `InspectorSnapshot` gains `exportJob: ExportJob | null` and `exportStaleCloses`; `InspectorActions` gain `openExport`, `setExportOptions`, `closeExport`, `submitExport`. `createInspectorStore(host, deps, notify)` takes the notifier from the provider's `useNotify()`. `InspectorDeps` carries `buildReportModel`, `renderMarkdown`, `renderPdf`, `reportFileNameBeforeBuild`, `now`, `yieldToHost` and `exportWatchdogMs`, injected the way `listSites`/`runScan` are. The store already imports from `features/inspector` (`inspectorSession.ts` L1, `inspectorDeps.ts` L1), so no new dependency direction. Every generation bump invalidates the job inside the store, which removes the need for an `observe` call from the page (E-02). The dialog is a pure view of `session.exportJob`.

---

## E-02 — What "results changed" means for a captured export: the session generation

**Context.** AC-9.8: the report is built from the state when the dialog opens; "if the results are cleared while the dialog is open (AC-7.6, a rescan or another site), the dialog closes, nothing is saved" with the info toast. The session bumps `generation` on a scan start, a connection identity change, a successful null, `stop()`, D-19 C and a review mark (`inspectorSession.ts` L88, L119, L145, L178, L187 and `setReviewed` at L213 to L219). A rename publishes `connection` only. The P5.5 plan exposed `generation` "for P5.7" (D-09).

**Adopted.** The job captures `session.generation` when it opens. The export is valid while the live generation equals the captured one. The page reports the live generation to the controller from an effect (`controller.observe(generation)`); the controller cancels an idle or building job whose generation moved, and leaves a saving job alone. A mark cannot change while the modal is open (focus trap), so in practice only clears and replacements cancel, as AC-9.8 lists.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: `generation`** | The store already documents it as "changes whenever what a report would capture is replaced"; one number; no feature knowledge of scan ids. | A review mark would cancel too; unreachable while the modal is open, so a theoretical over-cancel only. |
| **B. `result.facts.scanId` identity** (Phase 24 decision 1) | Marks never cancel. | A connection change that does not start a scan sets `scan` to `none`, so the check becomes "result is null or its scanId differs"; two conditions instead of one, and it ignores what the store already computes. |

**Owner decision:** Adopted (A), 2026-11-03.

**Decision.** With E-01 C the store owns both the job and the generation, so there is no `observe`: each bump (`inspectorSession.ts` at `8c84779`: L108 D-19 C drop, L139 scan start, L165 abandoned scan, L198 adopt with a new identity or a successful null, L207 `stop()`, L236 `setReviewed`) goes through one `invalidateExport` helper. An idle or building job is removed; a saving job is kept with `open: false` and settles later. If the dialog was open, the helper toasts "Results changed, so the export was cancelled." once and increments `exportStaleCloses`. The L165 abandoned-scan path was missing from the Context list above.

---

## E-03 — Where the dialog mounts: the page, not the results view

**Context.** `ResultsView` is mounted with `key={state.result.facts.scanId}` (`InspectorPage.tsx` L224) and only in the `results` state. A rescan or a connection change moves the page to another state, unmounting it. If the dialog lived there, the "Results changed" toast would never fire and the Modal's focus return would target a removed button.

**Adopted.** `InspectorPage` owns `useExportReport()` and renders `<ExportDialog>` beside `<PageBody>`, in every page state. `ResultsView` receives `onExport: (() => void) | null` and renders the Export report button enabled when it is a function and disabled with a reason when it is null. The dialog survives the state change long enough to close itself with the toast.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: page-level dialog, callback into the results view** | The dialog outlives the results it captured; one owner; the no-sites panel's disabled button needs no controller. | One more prop on `ResultsView`. |
| **B. Dialog inside `ResultsView`** | Everything export-related in one component. | Unmounted by the key change before it can report the cancellation; cannot meet AC-9.8. |

**Owner decision:** Adopted (A), 2026-11-03.

**Decision.** `InspectorPage` renders `<ExportDialog job={session.exportJob} />` while `session.exportJob?.open === true`, after `<PageBody>` (`InspectorPage.tsx` L265 at `8c84779`; the `ResultsView` key is at L240). `ResultsView` receives `onExport: (() => void) | null` and `exportBusy: boolean`; `PageBody` reads the session itself, so no new prop reaches it. The no-sites panel's disabled button needs no store access.

---

## E-04 — The window between a synchronous build and the native save

**Context.** The brief: "If results clear before native save starts, close with one notification and submit nothing. Once native save starts, the submitted snapshot is the content being saved." `buildReportModel`, `renderMarkdown` and `renderPdf` are synchronous. A host `connection:*` event that fires during a long PDF build is delivered after the build; its `getActiveConnection` promise, the provider's `setState`, the session's adopt effect and the page's observe effect all run on later ticks. A check right after the build can therefore still see the old generation.

**Adopted.** The controller rechecks validity synchronously at submit, again after an `await` of a `setTimeout(0)` yield that follows the build (so a host callback already queued during the build gets to run), and then calls `saveFile`. The residual window (an event whose provider re-render has not reached the page's effect yet) is accepted and recorded: the content saved is still the captured snapshot, which AC-9.8 permits once the native save starts. No `flushSync` in `ConnectionProvider` (the superseded draft's approach), and no save timeout.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: synchronous check, one task-queue yield, check, save** | Closes the common race (an event queued during the build) with one line and no cross-provider coupling. | A re-render that is still pending after the yield is not seen; the save proceeds with the valid captured snapshot. |
| **B. `flushSync` in `ConnectionProvider` so the identity commits before the handoff** | Closes the window completely. | Couples the connection provider to the export, which P5.5 kept apart; `flushSync` from a promise callback is allowed but unusual; the test for it is the hardest in the slice. |
| **C. No yield at all** | Simplest. | An event queued during a 2 s PDF build is ignored until after `saveFile` has been handed the bytes. |

**Owner decision:** **B** (2026-11-03).

**Decision.** `ConnectionProvider.tsx` wraps `setPending(false); setState(…)` in both host-answer callbacks (L30 to L45 at `8c84779`) in `flushSync` from `react-dom`, called from the promise callback and never during render. React commits the sync-lane render and flushes its passive effects before `flushSync` returns, so the provider's adopt effect runs `store.adopt` and the store invalidates the job inside the host's answer. The supervised review's correction stands and is recorded here: option A's "closes the common race" overclaimed, and option B's "closes the window completely" also overclaims, because a host event whose `getActiveConnection` answer has not arrived yet is outside any option's reach. What B closes is the provider-to-store hop. The store still yields one macrotask before the handoff (so a delivered answer runs) and one before the build (so React paints the busy state). The saved content is always the captured snapshot AC-9.8 permits. The residual is recorded in the evidence "Still open" (plan O-1).

---

## E-05 — Export report reasons in the states where it cannot run

**Context.** D-17 keeps the button in the title tile for every finished or stopped scan, including an empty site (AC-7.4), and under the AC-7.8 "No sites found" panel, with one reason "Report export arrives in a later update." P5.7 replaces that reason. While a scan runs, the scanning panel has no button (D-02 placement), so AC-9.1's "disabled while a scan runs" holds the way AC-7.4 and AC-7.8 held in P5.5: there is no enabled control.

**Adopted.** Two reasons in `pageCopy.ts`: `EXPORT_NO_FILES_REASON` "Nothing to export: no server logic files were found." (AC-7.4, finished or stopped with zero files) and `EXPORT_NO_SITES_REASON` "Nothing to export: no sites were found." (AC-7.8). The scanning state keeps no button.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: two state-specific reasons** | Tells the user why in that state. | Two strings to test. |
| **B. One reason "Nothing to export."** | One string. | Less helpful under the no-sites panel. |
| **C. Remove the button from the no-sites panel now that export exists** | No dead control. | Reverses D-17 A; AC-7.8 says "Export report is disabled". |

**Owner decision:** Adopted (A), 2026-11-03, with two more reasons.

**Decision.** Four reasons in `pageCopy.ts`: `EXPORT_NO_FILES_REASON` "Nothing to export: no server logic files were found." (zero files, `facts.inventoryComplete`), `EXPORT_NOTHING_READ_REASON` "Nothing to export: no server logic records were read." (zero files, inventory incomplete or stopped; the page already makes this split at `pageCopy.ts` L63 and tests assert the "no server logic" text is absent there, supervised review page-integration-002), `EXPORT_NO_SITES_REASON` "Nothing to export: no sites were found." (AC-7.8) and `EXPORT_IN_PROGRESS_REASON` "An export is still in progress." (E-07 B, while `exportJob !== null`). Wording is plan O-7. Whether the no-sites button stays at all remains plan O-3.

---

## E-06 — Dialog controls: PillGroup radios, native checkboxes

**Context.** AC-9.1 needs two radio groups (Report, Format) with "This file" `aria-disabled` and the reason "Select a file first", and three checkboxes. `PillGroup` is the repo's APG radio group with per-option `disabledReason` (`PillGroup.tsx` L7 to L18). No checkbox primitive exists (`grep type="checkbox"` finds none).

**Adopted.** Report and Format use `PillGroup`. Include uses three native `<input type="checkbox">` inside `<label>`s, styled in `export.css` with `accent-color: var(--primary)` and the control-border tokens; no new primitive until a second feature needs one.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: PillGroup plus labelled native checkboxes** | Reuses the tested radio keys and reason tooltip; native checkboxes are accessible as is. | Pill radios look different from the handoff's radio dots (reference 04 is an illustration, A3). |
| **B. Native radios and checkboxes, no PillGroup** | Closer to the handoff drawing. | Re-implements the `aria-disabled` reason on a radio; new keyboard tests. |
| **C. A `Checkbox` primitive in `components/`** | Reusable. | Speculative; one consumer. |

**Owner decision:** **C** (2026-11-03).

**Decision.** `src/components/Checkbox.tsx` with `Checkbox.test.tsx`: `{ label; checked; onChange(checked); disabledReason? }`, a native `<input type="checkbox">` inside a `<label className="ui-checkbox">` and the always-rendered `ui-reason-anchor` span. It follows F47 like `Button` and `PillGroup`: a blocked box is `aria-disabled`, stays focusable, explains itself on hover and focus, and ignores the change. That gives pills and checkboxes one busy treatment in the dialog (supervised review dialog-modal-003). Styles live in `primitives.css` (`accent-color: var(--primary)`, `--control-border`, 12 px label). Report and Format stay on `PillGroup`.

---

## E-07 — While building or saving: the dialog cannot be closed

**Context.** The brief: "prevent duplicate submissions; preserve Esc, focus trap and focus return". `Modal` closes on Esc and the close button unconditionally (`Modal.tsx` L35 to L38, L96 to L105). If the user could close the dialog during a native save, the Export report button would be live again and a second job could start while the host still owns the first save.

**Adopted.** `Modal` gains `closeDisabledReason?: string | null`: when set, Esc is ignored and the close button is `aria-disabled` with the reason (the F47 pattern via `useDisabledReason`). The dialog passes "Wait for the export to finish." while the phase is not idle; Cancel carries the same reason; the primary button is `busy`. Two `Modal.test.tsx` cases cover the new prop; existing Modal behaviour is unchanged when the prop is absent.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: `closeDisabledReason` on the shared Modal** | One lifecycle owner; no second job while the host saves; the user sees why Esc does nothing. | Edits a shared primitive (small, additive). |
| **B. Allow close; the controller finishes in the background and the button stays disabled while a job exists** | No Modal change. | A dialog that vanished still produces a toast later; the button's reason must explain a job the user cannot see. |

**Owner decision:** **B** (2026-11-03), plus the host close guard.

**Decision.** Esc, the close button and Cancel close the dialog in every phase (`closeExport`: idle removes the job; building or saving sets `open: false`). The job finishes in the background and toasts its outcome; the Export report button is `aria-disabled` with `EXPORT_IN_PROGRESS_REASON` until the job settles. `Modal` gets no `closeDisabledReason`; its only change is the entry-focus selector (supervised review dialog-modal-009). To keep the tool itself from closing under a pending export, the store brackets each job with `host.preventClose()` at submit and `host.releasePreventClose()` in `finally`, both added to the adapter as `hostCall`s. `toolboxAPI.preventClose()` / `releasePreventClose()` return `Promise<boolean>` and require PPTB 1.2.6 (docs: tool-development/api-reference/toolbox-api, "Tool Lifecycle"; `@pptb/types/toolboxAPI.d.ts` L499 to L513, top-level members); the manifest `minAPI` is 1.2.7, so no change. While set, the host shows a warning with an "Ignore & Close" override on tab close or quit; there is no close event the tool can observe, so the guard is state only. A rejected guard call is logged and never blocks the export. AC-9.1's "Esc closes it" holds in every phase. Whether the webview even receives input while the native save dialog is open is unknown and recorded in the evidence "Still open". Plan O-8 asks whether the button reason is enough feedback for a job the tool cannot cancel once the host owns the save dialog.

---

## E-08 — After a failed build or save

**Context.** AC-9.9: an error toast "Couldn't save <filename>" with the reason, no partial file. The brief adds: "permits retry when its snapshot is still valid. A later invalidation must still work after a failed save."

**Adopted.** On failure the job returns to `idle` with its options intact and the dialog stays open, so the user can switch format (PDF failure, Markdown still available, Error Scenarios L921) or try again. If the generation moved during the failed attempt, the controller closes with the info toast instead (error toast first, then info). The filename in the error toast comes from `reportFileNameBeforeBuild` when the build itself failed, else from the built model.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: stay open, idle, retry allowed** | Matches the brief and the "Markdown still available" scenario. | None found. |
| **B. Close on failure** | Simpler state. | The user re-opens and re-picks options to retry. |

**Owner decision:** **B** (2026-11-03).

**Decision.** On a build or save failure the store removes the job (the dialog closes), logs the error name only, and toasts "Couldn't save <filename>" with a plain-language body: a `HostCallError` passes its message through (`Host call failed: saveFile.`); any other throw shows "The report couldn't be built." before `saving` or "The file couldn't be written." after (supervised review export-controller-008; wording is plan O-7). Error Scenario L921 ("PDF fails, Markdown still available") is met by re-opening and picking Markdown. The filename always comes from `reportFileNameBeforeBuild`, which equals `reportFileName(model)` by construction (export-controller-005). The brief's "a later invalidation must still work after a failed save" has nothing to act on, because a failed job no longer exists.

---

## E-09 — Options reset on every open

**Context.** AC-9.1 gives the defaults (This file when a file is selected, Markdown, questions on, snapshot on, redact off). The brief forbids writes to `toolboxAPI.settings` (FR-5a removed).

**Adopted.** Each open starts from the spec defaults. Nothing is remembered between opens, not even within the session.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: spec defaults every time** | Literal AC-9.1; nothing to persist. | A user exporting PDF for several files re-picks PDF each time. |
| **B. Remember format and include toggles for the session** | Fewer clicks. | Not in the spec; the dialog would open in a state the AC does not describe. |

**Owner decision:** Adopted (A), 2026-11-03.

**Decision.** `openExport()` always builds the options from the AC-9.1 defaults, with `scope` `file` only when the selected id is in the captured result.

---

## E-10 — Focus after the dialog closes

**Context.** `Modal` returns focus to the element that was active when it opened (`Modal.tsx` L63, L78). After a success or a cancel that element is the Export report button, still mounted. After a "Results changed" close the button is usually gone (the page moved to scanning, choose-site or another state).

**Adopted.** Success, native cancel and Cancel: the Modal's own focus return lands on Export report. Results changed: the page requests the P5.5 heading focus (`useHeadingFocus().request()`), so focus lands on the heading of the panel now on screen, the way Scan again and Retry already behave.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: Modal return, with the heading fallback on cancellation** | Reuses two existing mechanisms; no focus lost to `body`. | The results-changed test needs a focus assertion. |
| **B. Modal return only** | No page change. | Focus falls to `body` when the opener unmounted. |

**Owner decision:** Adopted (A), 2026-11-03.

**Decision.** The hook is `useHeadingFocus(scanning)` since `493942a` (`InspectorPage.tsx` L36 to L66). The store increments `exportStaleCloses` whenever an open dialog is closed by a results change, in any phase; the page runs one effect on that counter, guarded by a ref so the mount run does nothing, and calls `focus.request()`. Success, native cancel, failure (E-08 B) and a user close land on Export report through the Modal's own return. The supervised review's page-integration-014 case (a save that settles after the results were cleared, opener detached) no longer exists, because the dialog closes at the moment of invalidation.

---

## E-11 — Timing is measured, not enforced

**Context.** AC-9.9 budgets 5 s for the build (primary button to save dialog) and 5 s from confirming the save dialog to the toast. The brief: "do not implement a timeout that reports failure while the host might still write the file". `saveFile` resolves only after the host returns; nothing tells the tool when the user confirmed.

**Adopted.** No timers. The dialog shows "Building report…" and "Saving report…" in a polite status line. Both budgets are measured in PPTB and recorded under RG-004 in the evidence file; a miss is a finding, not a toast.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: measure in PPTB, no timeout** | Cannot misreport a file the host wrote. | The 5 s numbers are evidence, not code. |
| **B. A build-phase watchdog that toasts after 5 s** | Visible to the user. | A slow build still finishes and saves; the toast would be wrong. |

**Owner decision:** **B** (2026-11-03).

**Decision.** `submitExport` starts a timer of `deps.exportWatchdogMs` (default 5000) when the phase becomes `building` and clears it when the phase becomes `saving` or the job settles. If it fires while the job is still `building`, the store toasts a warning, not a failure: "The report is taking longer than expected." / "Building has run for more than 5 seconds. It will finish and the save dialog will open." (type `warning`; wording is plan O-7). Because the build is synchronous, the timer can only run after the build returned and before the post-build yield's continuation, so it fires exactly when the build exceeded the budget and never while the host owns the save dialog; the brief's rule against a timeout that could misreport a host write holds. The AC-9.9 budgets are still measured in PPTB and recorded under RG-004.

---

## E-12 — Test seams: spy on the fake host's `saveFile`

**Context.** The fake host answers `saveFile` at once with `save`, `cancel` or `reject` (`fakeHost.ts` L158 to L166). Races (invalidate during a native save, a rejection after invalidation) need a save that stays pending. `gatedHost.ts` gates data reads and the connection read only.

**Adopted.** Tests use `vi.spyOn(host, 'saveFile').mockReturnValueOnce(deferred.promise)` with the existing `src/test/deferred.ts`; `host.savedFiles` and `host.callsOf('saveFile')` check what reached the host. No change under `src/services/pptb/` or to `gatedHost`.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: spy plus `deferred`** | No new seam; the same pattern the P5.5 connection tests used. | Spying on a method of the fake. |
| **B. Add `holdSave()` to `gatedHost`** | Symmetric with reads. | More test code for one slice. |

**Owner decision:** **B** (2026-11-03).

**Decision.** `src/test/gatedHost.ts` gains `holdSaves(hold)`, `releaseHeldSaves(count)` and `pendingSaves`, shaped like `holdDataReads`/`releaseHeldDataReads` (L107 to L114 at `8c84779`). A parked save reaches the fake only when released, so `host.callsOf('saveFile')` says whether the handoff happened and the fake's `save` behaviour applies on release. No `vi.spyOn` on the host. `src/services/pptb/` still changes in this slice, but only for the E-07 B close guard (two `PptbHost` members, two fake call variants, one `closeGuard` behaviour).
