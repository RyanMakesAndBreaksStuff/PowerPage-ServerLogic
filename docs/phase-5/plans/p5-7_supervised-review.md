# Supervised Review — P5.7 plan (`docs/plans/p5-7_plan.md` + `docs/plans/P5-7choices.md`)

Reviewed 2026-11-02/03. Lead: main session (Fable 5.1, after an initial Opus 5.5 setup turn). Reviewers: three Sonnet 5.5 (high) subagents. Skeptics: three Opus 5.5 (medium) subagents, one isolated round per domain.

## A. Project-as-is

- **Status: complete.** Every scoped domain finished all seven passes and its skeptic round; every challenge has a decision; publication checks pass (below). Coverage limits and unverified candidates are listed in G and do not affect the admission or severity of any confirmed finding.
- **Source snapshot:** `src/` at `493942a` on `logic-inspector-v2-build`. The branch HEAD moved from `493942a` to `8c84779` during the review (docs-only: `docs/phase-5/evidence/p5-5/execution.md` +1). Working tree: `.claude/settings.json` modified, plan/choices files untracked. The plan under review states baseline `45b1fd3`; `git diff --stat 45b1fd3 493942a -- src` touches 5 source files (`inspectorDeps.ts`, `inspectorSession.ts`, `inspectorSession.test.ts`, `InspectorPage.tsx` +42, `InspectorPage.test.tsx`).
- **Stack / entry points:** TypeScript, React 19 (StrictMode, React Compiler), Vite 8 single IIFE bundle, Vitest + RTL, PPTB host adapter at `src/services/pptb/`. Relevant entry: `src/main.tsx` → `App` → `ConnectionProvider` → `InspectorSessionProvider` → `InspectorPage` → `ResultsView`; report functions in `src/features/inspector/report/`.
- **Requested scope:** the P5.7 draft plan and its decision record, judged for correctness against current code, the spec (4.2.1, Story 9, AC-7.4/7.8/7.10, FR-1, Error Scenarios), the project rules, and executability. Findings anchor to plan lines; code is evidence.
- **Exclusions / constraints (user):** audit only, no source edits, no fixes, no installs, no config changes, no commits. Skeptic on Opus 5.5 medium; retrieval/exploration on Sonnet 5.5 high. Existing tests permitted; recorded where run.
- **Unavailable checks:** PPTB Desktop (native save-dialog modality, IPC vs timer ordering, RG-004/RG-005 live timings); browser focus-fixup behaviour (jsdom does not implement it); no build or full test run was executed by the review.
- **Missing coverage / action to resume:** none blocking. Open candidates in G need a PPTB Desktop run or a browser run as named there.

## B. Domain Groups

| Domain | Scope (primary owner) | Rationale | Worker | Status |
|---|---|---|---|---|
| export-controller | plan L1–118 (header, goal, gap table, Files, convention, Sub-slice A); choices E-01, E-02, E-04, E-08, E-09, E-11, E-12 | the lifecycle controller and its contracts/tests | reviewer `rev-export-controller` (Sonnet 5.5 high); skeptic `skeptic-export-controller` (Opus 5.5 medium) | review complete; skeptic round complete (7 challenges) |
| dialog-modal | plan L119–160 (Sub-slice B); choices E-06, E-07, dialog side of E-10 | shared Modal change, ExportDialog, hook | reviewer `rev-dialog-modal`; skeptic `skeptic-dialog-modal` | review complete; skeptic round complete (8 challenges) |
| page-integration | plan L161–257 (Sub-slice C, rendered check, gates, evidence, exit proof, spec coverage, open items, self-review); choices E-03, E-05, E-10 | page wiring, tests, gates, evidence | reviewer `rev-page-integration`; skeptic `skeptic-page-integration` | review complete; skeptic round complete (5 challenges) |

File accounting: the two in-scope files are fully partitioned by line range (plan L1–257) and by decision ID (E-01…E-12); no line or decision is unowned. Supporting source was read-only evidence, not reviewed scope. No files excluded; none blocked.

## C. Domain Findings (raw)

The three reviewer results are reproduced verbatim below (no malformed rows; every result carried a 7-row coverage table). Commands run by reviewers: `git diff --stat 45b1fd3 493942a -- src` (exit 0, all three); `node -e "typeof structuredClone"` (exit 0, `function`, Node 24.17.0); `npx vitest run src/features/inspector/report/renderPdf.test.ts` (exit 0, 23 passed, 2.81 s) — export-controller reviewer only. Skeptic commands: react-dom 19.3.1 source greps (exit 0); `grep -c` on cached build output under `node_modules/.cache/build-shape/*` (exit 0); one `node -e` jsdom focus experiment (exit 0); no tests, build or lint run by any worker.



---

# Domain review: export-controller (supervised review, read-only)

Source snapshot: HEAD `493942a` on `logic-inspector-v2-build`. The plan states baseline `45b1fd3`; `git diff --stat 45b1fd3 493942a -- src` touches five files: `inspectorDeps.ts`, `inspectorSession.ts` (+28/-), `inspectorSession.test.ts`, `InspectorPage.tsx` (+42/-), `InspectorPage.test.tsx`.

## Coverage record

Reviewed (full):
- `docs/plans/p5-7_plan.md` L1-118
- `docs/plans/P5-7choices.md` (all of E-01 to E-12; mine are E-01, E-02, E-04, E-08, E-09, E-11, E-12)

Supporting source traced (read-only):
- `src/types/report.ts`, `src/types/inspector.ts`
- `src/features/inspector/report/{buildReportModel,reportFileName,reportFixtures}.ts`, `renderPdf` and `renderMarkdown` signatures
- `src/services/pptb/{host.types,pptbHost,fakeHost,hostErrors}.ts`
- `src/app/{useNotify,NotifyProvider,ConnectionProvider,useActiveConnection,App}.ts(x)`
- `src/app/inspector-site/{inspectorSession,inspectorSession.types,InspectorSessionProvider,inspectorTestHarness}.ts(x)`
- `src/components/Modal.tsx`, `src/features/starter/download/DownloadStarterButton.tsx`
- `src/test/{deferred,fixedDeps}.ts`
- Spec AC-9.1, AC-9.8 to AC-9.10; `phasse5plan.md` section P5.7

Excluded: plan L119-256 and E-03/E-05/E-06/E-07/E-10 (dialog and page domains own them). Nothing was blocked.

Commands run:
- `git diff --stat 45b1fd3 493942a -- src`: exit 0.
- `git show 45b1fd3:src/app/inspector-site/inspectorSession.ts | grep generation`: exit 0.
- `node -e "typeof structuredClone"`: exit 0, `function` on Node v24.17.0.
- `grep` for the G3, G4 and G5 gap-table claims: exit 0, claims hold.
- `npx vitest run src/features/inspector/report/renderPdf.test.ts`: exit 0, 23 tests in 2.81 s. 16 real PDF renders in the 32-combination `it.each` will not time out.
- `ctx_search` calls: exit 0.

All findings are source-verified, not reproduced. No new test or code was run.

Plan-claim checks that held: `reportFileNameBeforeBuild(result, options)` exists with that signature; `errorName` exists in `hostErrors.ts`; `SaveResult` has `status: 'saved'`; the fake host has `setSave`, `savedFiles` and `callsOf('saveFile')`; `reportResult`, `hostileReportResult`, `longReportResult`, `EXPORTED_AT` exist in `report/reportFixtures.ts`; `deferred` and `fixedDeps` exist; the Notice type allows `info`; `renderPdf` and `renderMarkdown` are synchronous; the 32-combination arithmetic is right (scope 2 x format 2 x questions/snapshot/redact 2^3 = 32); `SiteResult` is plain data, so `structuredClone` is safe.

## Coverage table

| Pass | Status | Evidence inspected / check result | Limitation or N/A reason |
|---|---|---|---|
| 1 WIRING | checked | Traced the event path through `pptbHost.createEventHub`, `ConnectionProvider.load`, `InspectorSessionProvider` (`stale`/`blankFor`, adopt effect), the store's `adopt` and generation bumps, and the Modal/Notify/saveFile contracts. Findings 001, 003, 004. | PPTB IPC timing not measurable here. |
| 2 ERROR HANDLING | checked | The `submit()` catch path, E-08, the A1 failure `it.each`, and rejection after a generation move. Findings 002, 006. | None. |
| 3 COMPLETENESS | checked | AC-9.1/9.8/9.9 against contracts and tests; the 32-combination arithmetic is correct. Findings 001, 002; finding 007 for the baseline. | None. |
| 4 DEAD CODE | checked | The post-yield generation check and the second filename computation. Findings 005, 006. | None. |
| 5 BLOAT | checked | Duplicate cancel path (006) and duplicate filename derivation (005). `selectedFileId` and `options.fileId` mirror each other, but `setOptions` omits `fileId`, so they cannot diverge. No finding. | None. |
| 6 HARDCODING | checked | The filter literals duplicate the md/pdf mapping in `reportFileName.ts` `filenameOf`. Not admitted: no demonstrated failure. Notice texts live in `exportCopy.ts`. | None. |
| 7 SECURITY | checked | The toast name goes through `reportIdentity` sanitisation (`[^A-Za-z0-9._-]`), so a hostile name cannot reach the title. `error.message` is `Host call failed: saveFile.` from the adapter's `hostCall`. `console.error(errorName)` only. `saveFile` is not a Dataverse operation, so retrieval-only holds. No finding. | Source review only. |

## Findings

| ID | Severity | Pass | File:Line | Problem | Evidence | Fix and verification |
|---|---|---|---|---|---|---|
| export-controller-001 | WARNING | 1 WIRING | `docs/plans/p5-7_plan.md:94` (also :63; E-04 option A, `P5-7choices.md:66`; O-1 at plan :244) | The E-04 yield cannot let a connection change reach the controller. A host `connection:*` event only starts the chain. After the event handler runs, `getActiveConnection()` needs a fresh host round trip, then `setState`, a render, the adopt effect, `store.publish` (generation+1), a page re-render and the page's `observe` effect. One `setTimeout(0)` covers at most the first hop. The controller learns the generation only through `observe`. Option B (`flushSync` in `ConnectionProvider`) has the same flaw: the identity is not available to flush yet. The A1 test at plan :106 calls `observe` directly from a `setTimeout(0)`, so it proves nothing about this chain. Impact: a connection switch during a PDF build is usually not seen before `saveFile`, which is the AC-9.8 "cancel before native save" case. | `pptbHost.ts:25-37` maps the event to `connection-changed`. `ConnectionProvider.tsx:56-58` calls `load()`, then :30 `host.getActiveConnection().then(setState…)`. `InspectorSessionProvider.tsx:62-65` `const view = stale ? blankFor(confirmed, snapshot.generation) : snapshot`, so `session.generation` is unchanged until the effect at :50-52 runs `store.adopt`. `inspectorSession.ts:~198` bumps generation inside `adopt`. | Replace the timing guess with a direct check: before `saveFile`, `await host.getActiveConnection()` and compare `connectionKey(result.facts.connection)` (id + URL, `@/app/useActiveConnection`) with the live result. Mismatch or a successful null: close with the info toast. A rejected read: keep going, as the provider does. Test with the fake host: `setConnection(OTHER)` from the build stub, then assert `saveFile` is not called. Drop the claim "closes the common race" from E-04 and re-frame O-1. |
| export-controller-002 | WARNING | 2 ERROR HANDLING | `docs/plans/p5-7_plan.md:94` vs :107 (and :84, E-08) | A failed save after the generation moved is specified three ways, and the needed state is missing. L94/E-08 say error toast, then info toast and close. L107 says "rejected -> one error toast". `observe` is defined as leaving a saving job alone, so nothing records the live generation, and the L94 check "if the generation is still current" cannot be answered. The page effect `[controller, generation]` fires once per change, so a move ignored during `saving` is never re-reported. After the failure the job returns to `idle` with the dialog open on invalidated results, and a retry would export them. | Contract at :84. The page effect is plan :170. | Pin one behaviour, then record `live` in every phase. Recommended: `observe` always stores `live`, then cancels only idle/building. On a failure with `live !== job.generation`, close with the error toast then the info toast, and fix L107 to expect both. Test: `observe(g+1)` while saving, reject, assert two toasts and the job cleared. |
| export-controller-003 | WARNING | 1 WIRING | `docs/plans/p5-7_plan.md:94` (E-11) | The `building` phase is never painted before the build. `submit()` runs from a click handler. The order is `phase:'building'`, then the synchronous `buildReportModel`/`renderPdf`, then the first `await`. React's sync-lane update from `useSyncExternalStore` flushes only after the handler returns, which is after the whole build. "Building report…", the busy primary button and the Esc refusal never show during a PDF build of up to 5 s. Esc and Cancel cannot fire anyway while the thread is blocked, so the busy state matters only after the build. | `renderPdf(model): Uint8Array` is synchronous (`renderPdf.ts:485`). `DownloadStarterButton.tsx:19-33` shows the same call shape. | Reorder to `phase:'building'`, a paint-yielding await (a rAF plus macrotask in `yieldToHost`), the build, the connection check (001), then `saving`. Add a test where the `renderMarkdown` stub reads `screen.getByRole('status')` and expects "Building report…". It fails with the plan's order and passes with the fix. |
| export-controller-004 | WARNING | 1 WIRING | `docs/plans/p5-7_plan.md:89` (hook at :155-156 belongs to the dialog/page domain) | `dispose()` is specified as terminal, but the app runs under StrictMode. The contract is "unmount: ignore late outcomes, no toast", and the A1 test at :113 requires a persistent disposed state. The hook is `useState(create)` plus `useEffect(() => () => controller.dispose(), [controller])`. StrictMode's simulated unmount calls `dispose()` once and the remount never re-arms it. In `npm run dev` and in `renderInspector({ strict: true })`, export outcomes would be silently swallowed. The plan's own dev-harness rendered check hits this. Production builds do not double-invoke effects, and pages stay mounted when hidden (`App.tsx` `Panel` uses `hidden`), so the impact is dev/test only. | `main.tsx:34` is `<StrictMode>`. `inspectorTestHarness.tsx:18,42` has the `strict` option. The existing precedent is `inspectorSession.stop()`, "Safe to adopt again", tested at `inspectorSession.test.ts:479`. | Make dispose reversible (follow `stop()`), or create the controller inside the effect. Test the page under `strict: true`: open, submit, toast appears. |
| export-controller-005 | PRUNE | 4 DEAD CODE | `docs/plans/p5-7_plan.md:60-61,94,108` | `reportFileName(model)` is redundant. Both `reportFileNameBeforeBuild(result, options)` and `reportFileName(model)` call `filenameOf` on `reportIdentity(result, options)`, and `buildReportModel` spreads that same identity into the model. They cannot differ. The second assignment `name = reportFileName(model)` and the "filename failure" case among the five failure points (:108) exercise a branch that cannot occur. | `reportFileName.ts:44-50`; `buildReportModel.ts` (`...reportIdentity(result, options)`). | Compute `name` once with `reportFileNameBeforeBuild`. Drop `reportFileName` from `ExportDeps`. Make the failure `it.each` four points. Keep one equality assertion against the real `reportFileName(model)` (spec coverage row :235). |
| export-controller-006 | INFO | 5 BLOAT | `docs/plans/p5-7_plan.md:94,84,106` | Two cancel paths for one condition. `observe` cancels a building job on a moved generation, and `submit()` rechecks after the yield and also toasts. The controller knows the generation only through `observe`. After the yield, "generation moved" therefore means observe already closed the job and toasted. A literal implementation can emit two info toasts, against the "one info toast" assertion at :106. | Plan text only. | After the yield (or the 001 check), only test "is this job still the current one" and return silently. Keep one place that toasts the cancellation. |
| export-controller-007 | INFO | 3 COMPLETENESS | `docs/plans/P5-7choices.md:30`, `docs/plans/p5-7_plan.md:4,252` | Stale anchors. E-02 cites `inspectorSession.ts` L88, L119, L145, L178, L187 and L213-219. At HEAD the same bumps are at L108, L139, L165, L198, L207 and L236. The plan says "every file reference exists at 45b1fd3", yet `InspectorPage.tsx` changed in `493942a` (42 lines). The plan's execution convention (anchored edits matched once) and the gap-table quotes need re-reading at HEAD. | `git diff --stat` output above; `git show 45b1fd3:… | grep generation` against the current file. | Rebase the baseline to `493942a` and re-read the L-numbers. The page-integration domain should re-check the `InspectorPage.tsx` quotes. |

## Unverified candidates

- E-04 timer ordering in the real host. Whether a PPTB IPC callback or a `setTimeout(0)` turn runs first is not measurable without PPTB Desktop. Finding 001 does not depend on it, because the chain needs a new IPC reply regardless. A live check would confirm only the margin.
- `structuredClone` of `SiteResult` under vitest's jsdom environment. The type is plain data (the marks `Set` is not in it) and Node 24 has the global. Confirm with the first A1 test.
- Typing of the recursive `freeze` helper. The rule bans `as` casts. `Object.freeze<T>` returns `Readonly<T>`; whether a generic deep-freeze compiles under strict settings without a cast is not checked. Check at A2 with `tsc -b`.
- Controller creation inside `useState` with the captured `notify`. `NotifyProvider.notify` is a fresh closure each render but closes over stable members only (`host`, a ref, `setToasts`), so a stale capture is harmless today. It becomes a hazard if the provider adds state to it.

## Cross-domain notes for the lead

- Dialog/page domains: finding 003 means the dialog's "Building report…" line and busy state must be tested as visible during the build, not only after. Finding 004 affects `useExportReport` (plan :155-156); its test should run under `strict: true`.
- Page domain:
  - During the `stale` window `session.result` is already `null` but `session.generation` is unchanged. The page's `observe` effect keyed on generation alone lags one adopt effect behind the visible state change. The C1 connection-change test (plan :183) awaits settled state, so it will not catch this.
  - The E-10 focus logic that compares job-null must also tolerate the 002 case, where a failed save is followed by an info-toast close.
  - `InspectorPage.tsx` quotes need a re-read at `493942a` (finding 007).
- Spec reading: AC-9.8 says "once the host's save dialog has opened, the snapshot is what gets saved". The plan matches that. The gap is only the pre-save boundary (finding 001), and no option can make that boundary exact, since a host event can always arrive after the read.


---

# Domain review: dialog-modal (plan L119-160, E-06, E-07, dialog side of E-10)

## Coverage record

**Snapshot.** HEAD 493942a on `logic-inspector-v2-build`. `git diff --stat 45b1fd3 493942a` over `src/components`, `src/app`, `src/services/pptb` touches only `src/app/inspector-site/` (inspectorDeps.ts, inspectorSession.ts, inspectorSession.test.ts). No plan claim in my scope drifted between 45b1fd3 and HEAD.

**Reviewed (primary).**
- `docs/plans/p5-7_plan.md` L119-160
- `docs/plans/P5-7choices.md` E-06, E-07, dialog side of E-10

**Reviewed (supporting, read-only).**
- `src/components/Modal.tsx`, `Modal.test.tsx`, `PillGroup.tsx`, `Button.tsx`, `useDisabledReason.tsx`, `DisabledReason.tsx`, `primitives.css`, `ToastStack.tsx`
- `src/app/theme/tokens.css`, `src/app/NotifyProvider.tsx`, `useNotify.ts`, `HostContext.ts`, `inspector-site/inspectorTestHarness.tsx`, `CopyButton.test.tsx`
- `src/main.tsx`, `src/services/pptb/fakeHost.ts`, `src/types/report.ts`, `report/reportFileName.ts`, `report/reportFixtures.ts`
- `src/features/starter/inputs/StarterInputs.tsx` L85-200 (the only existing Modal usage)
- Spec AC-9.1, 9.8, 9.9, 9.10, accessibility L890-894

**Excluded.** Plan L1-118 and L161-257, E-01..05 and E-08..12 (other domains). `PillGroup.test.tsx` read as signatures only. No design-handoff export dialog exists: glob `*export*` under `design_handoff_server_logic_tools` matched 0 files; search for "Export Markdown/Export PDF/checkbox/Configuration snapshot" found only the spec copy.

**Commands run.**
- `ctx_shell git diff --stat 45b1fd3 493942a -- src/components src/features/inspector/ResultsView.tsx src/app src/services/pptb; git status --short src`: exit 0, output as stated above.
- No tests run.

## Coverage table

| Pass | Status | Evidence inspected / check result | Limitation or N/A reason |
|---|---|---|---|
| 1 WIRING | checked | Traced `useExportReport` to `useHost`/`useNotify` (both exist). `NotifyProvider.notify` is a fresh function each render but closes over stable values only (`host`, `setToasts`, `nextId`), so first-render capture in `useState` is safe. `main.tsx` uses StrictMode. `Modal` has a `footer` prop; `PillGroup`/`Button`/`useDisabledReason` APIs match the plan's usage. | Page-side wiring belongs to page-integration |
| 2 ERROR HANDLING | checked | Busy/close refusal, failure display, and whether "Building report..." is observable | None |
| 3 COMPLETENESS | checked | AC-9.1 labels/defaults match the plan. Gaps found: busy styling of radios, contrast, test observability, option-mapping coverage, disabled close-button style. | No design reference for the dialog exists |
| 4 DEAD CODE | checked | `ExportDialog`, a checkbox primitive and `closeDisabledReason` do not exist yet. Reuse claims (`PillGroup.disabledReason`, `Button.busy`, `setSave`, `savedFiles`) are true. | None |
| 5 BLOAT | checked | Busy state derives from the single `job.phase`; no mirrored boolean. Busy rule is repeated in controller guard, Modal prop and per-control reasons, but the controller is authoritative. | None |
| 6 HARDCODING | checked | Tokens `--muted/--text/--primary/--control-border/--tile` all exist in `tokens.css`. Copy literals checked against spec. | Visual rendering not run |
| 7 SECURITY | checked | Hostile names go through React text nodes; plan forbids `dangerouslySetInnerHTML` and tests the hostile fixture. No finding. | Source review only |

## Findings

### dialog-modal-001 | WARNING | Pass 1 WIRING | `docs/plans/p5-7_plan.md:156`
**Problem.** The hook's `useEffect(() => () => controller.dispose(), [controller])` disposes the controller permanently under StrictMode, so in dev every outcome is silently dropped.
**Evidence.** Trigger: `src/main.tsx` renders `<StrictMode>`, which runs mount, cleanup, mount. The `useState` controller survives, but `dispose()` has already run once (plan L89: "unmount: ignore late outcomes, no toast"; plan L113 treats a disposed controller as dead). Nothing re-arms it, so toasts and state changes are suppressed. `renderInspector({ strict: true })` (`src/app/inspector-site/inspectorTestHarness.tsx:42`) hits the same path. The repo already treats StrictMode remount as a requirement (`inspectorSession.test.ts:479`). Source-verified from the plan's design; not run.
**Fix and verification.** Make dispose reversible: the effect arms and disarms (`useEffect(() => controller.attach(), [controller])`, where `attach()` clears `disposed` and returns the disarm function), or create the controller inside the effect. Add a test that renders the page with `strict: true`, saves, and expects the notify call.

### dialog-modal-002 | WARNING | Pass 2 ERROR HANDLING | `docs/plans/p5-7_plan.md:136`
**Problem.** "Building report..." and the busy primary cannot show during the build. Per plan L94 the build is synchronous: `phase: 'building'` is set, then `reportFileNameBeforeBuild`, `buildReportModel` and `renderPdf` run in the same call stack, and the first `await` comes after the build. React renders `building` only after the whole freeze. AC-9.9 allows a build of up to 5 s, so the dialog looks idle and frozen throughout.
**Evidence.** `renderPdf` is documented as synchronous (plan L55). The only yield is `yieldToHost` after the build (plan L94, L63). E-11 relies on the status line as the user's only feedback. B1 tests only `Saving report...` (plan L144) and A1 never observes `building`. Source-verified.
**Fix and verification.** Add a paint-yielding await between `phase: 'building'` and the build (for example `requestAnimationFrame` then `setTimeout(0)`, injected as a second dep). Keep the post-build yield for E-04. Test with a held yield dep: before it resolves the status reads "Building report..." and the primary is busy. Needs a lead decision because plan L94 belongs to export-controller.

### dialog-modal-003 | WARNING | Pass 3 COMPLETENESS | `docs/plans/p5-7_plan.md:136`
**Problem.** The busy state of the radios is underspecified. Only "This file" gets "the busy reason". "Site summary", "Markdown" and "PDF" keep a normal look, yet `setOptions` is ignored unless idle (plan L86). A click during building or saving does nothing and shows no reason.
**Evidence.** `PillGroup.tsx` `select` only blocks when the option has a reason (`normalizeReason(option.disabledReason) === null` then `onChange`), so without one it calls `onChange` and the controller drops it. Spec L891 requires blocked choices to be `aria-disabled` with a reason.
**Fix and verification.** Give all four options the busy reason while `phase !== 'idle'`. Add a B1 assertion that each radio is `aria-disabled` and described by "Wait for the export to finish.".

### dialog-modal-004 | WARNING | Pass 3 COMPLETENESS | `docs/plans/p5-7_plan.md:136`
**Problem.** When the busy reason lands on the currently selected pill (default "This file", or "Markdown"), `.ui-pill[aria-disabled='true'] { color: var(--muted) }` (`src/components/primitives.css:103`, specificity 0,2,0) overrides `.ui-pill--selected { color: var(--on-primary) }` (`primitives.css:72`, 0,1,0). The result is muted text on the `--primary` fill.
**Evidence.** Computed from `src/app/theme/tokens.css`: light `#555555` on `#111111` is about 2.5:1; dark `#a5a5a5` on `#f2f2f2` is about 2.2:1. Spec L893 claims WCAG 2.2 AA in both themes. No CSS handles selected plus aria-disabled. Contrast computed by hand; not rendered.
**Fix and verification.** In B2 (or `primitives.css`) add `.ui-pill--selected[aria-disabled='true'] { color: var(--on-primary); }`. Verify with a visual check in both themes or a `tokens.test.ts`-style pair assertion.

### dialog-modal-005 | WARNING | Pass 3 COMPLETENESS | `docs/plans/p5-7_plan.md:145`
**Problem.** The B1 test "notifications through `NotifyProvider`'s toast stack (`role="status"`/`alert`)" cannot see a toast as written. `NotifyProvider.notify` calls `host.notify` first and renders a local toast only if that rejects (`src/app/NotifyProvider.tsx:16-22`), and the fake host's default `notify` is `'ok'`.
**Evidence.** `fakeHost.ts` `notify: 'ok'` resolves, so `ToastStack` stays empty. Existing tests assert `host.callsOf('notify')` (`src/app/CopyButton.test.tsx`). The dialog's own polite `role="status"` line (plan L136) also shares the role with success/info toasts.
**Fix and verification.** Assert `host.callsOf('notify')`, or use `createFakeHost({ notify: 'reject' })` if the stack is the target. Query the dialog's status line by text or `within(dialog)`, not bare role.

### dialog-modal-006 | WARNING | Pass 3 COMPLETENESS | `docs/plans/p5-7_plan.md:140`
**Problem.** No B1 test checks that the controls drive the right option fields. The 32-combination test (plan L100) calls the controller directly. B1 covers only the defaults and the Markdown to PDF label. A checkbox bound to the wrong field (`questions`/`snapshot`/`redact`), or the Site summary/This file pills bound wrongly, would pass every listed test and export the wrong content (AC-9.5, AC-9.6).
**Evidence.** `ReportOptions` fields are `scope/format/questions/snapshot/redact` (`src/types/report.ts`). Plan L140-147 has no toggle or scope-click test and no Cancel-while-idle test.
**Fix and verification.** Add one B1 test per control: click it, submit, assert the options `buildReportModel` or `saveFile` received (redact on gives `[site]` in the file name). Add a test that Cancel closes while idle.

### dialog-modal-007 | INFO | Pass 3 COMPLETENESS | `docs/plans/p5-7_plan.md:127`
**Problem.** The refused close button has no disabled styling: `primitives.css` styles `[aria-disabled]` only for `.ui-button` (L186) and `.ui-pill` (L103), not `.ui-icon-button` (L191). It looks clickable and a click does nothing. The Files table also omits `primitives.css`. Wrapping the button in the anchor span only while a reason is set would remount it and drop focus on the busy to idle switch.
**Evidence.** `src/components/Modal.tsx:96-105` renders the bare button; plan L127 says "inside a `ui-reason-anchor` span" without saying when.
**Fix and verification.** Add `.ui-icon-button[aria-disabled='true']` (opacity and `cursor: not-allowed`), list `primitives.css` in the plan's Files table, and always render the anchor span.

### dialog-modal-008 | INFO | Pass 6 HARDCODING | `docs/plans/p5-7_plan.md:151`
**Problem.** `export.css` has no wrapping rule for the "<site> · <file>" context line. The repo's `longReportResult()` fixture has an unbroken 400-character file name, and `.ui-modal__body { overflow: auto }` (`primitives.css`) would show a horizontal scrollbar in the 520 px dialog. `ToastStack` already uses `overflow-wrap: anywhere` as precedent, and spec L894 wants a tooltip or accessible name for truncated values.
**Evidence.** `src/features/inspector/report/reportFixtures.ts` `LONG_FILE_NAME`. B1 covers only the hostile fixture.
**Fix and verification.** Add `overflow-wrap: anywhere` (or ellipsis plus `title`) to the context line. Add a B1 case with `longReportResult()` asserting no horizontal overflow.

## Unverified candidates

- **Focus after a failed export.** `Button busy` sets `disabled` (`src/components/Button.tsx:46`), so a focused primary is disabled during the attempt; after a failure focus may sit on `body`, and Modal's Tab handler then sends it to the first pill (`Modal.tsx:48-51`). Needed: check in Chromium/PPTB whether `document.activeElement` survives; if not, re-focus the primary on return to idle.
- **Live region mounting.** Plan L136 says "a polite `role="status"` line". If rendered only when text exists, screen readers may not announce it. Needed: keep the element always mounted and swap its text.
- **Pending save when the page unmounts.** If `InspectorPage` unmounts on a view switch during a pending native save, dispose drops the "exported" toast (AC-9.8: any completed export toasts). Not checked whether pages stay mounted; page-integration may know.

## Cross-domain notes

- **export-controller.** dialog-modal-002 needs a change to the `submit()` ordering at plan L94 and the `ExportDeps` shape (a second yield dep). dialog-modal-001 needs `dispose()` to become reversible (plan L89, L113); update the A1 test "a disposed controller ignores a late save outcome" accordingly.
- **page-integration.** The `observe`/`open` effect at plan L170 relies on the controller surviving a StrictMode remount (dialog-modal-001). Its tests should include `strict: true`.
- **Note.** The first-render `notify` capture in `useState(() => createExportController(host, notify, deps))` is safe today; it would break if `NotifyProvider.notify` ever closed over changing state. Worth a line in the plan.


---

# Review: page-integration

## Coverage record

- **Domain:** page-integration. **Snapshot:** the lead gave HEAD 493942a, but the branch HEAD is 8c84779 (docs-only on top of 493942a). `src/` is identical to 493942a.
- **Reviewed:**
  - `docs/plans/p5-7_plan.md` L161-257 and `docs/plans/P5-7choices.md` E-03, E-05, E-10, plus E-02 for the stale line numbers.
  - Supporting source, read-only:
    - `src/features/inspector/`: `InspectorPage.tsx`, `ResultsView.tsx`, `pageCopy.ts`, `pageState.ts`, `StatePanel.tsx`, `InspectorPage.test.tsx`, `ResultsView.test.tsx`, `report/reportFileName.ts`
    - `src/components/`: `Button.tsx`, `Modal.tsx`
    - `src/app/inspector-site/`: `inspectorSession.ts`, `inspectorSession.types.ts`, `inspectorTestHarness.tsx`
    - `src/test/fixedDeps.ts`, `src/test/inspectorWorld.ts`
    - `src/services/pptb/fakeHost.ts`, `src/main.tsx`, `src/app/App.tsx`, `src/app/ConnectionProvider.tsx`
    - `tests/buildShape.test.ts`, `package.json`, `vite.config.ts`
    - Spec L288, 292, 344, 370, 371, 915-937; `phasse5plan.md` section P5.7 and the RG-004/RG-005 rows
- **Excluded or unread:** `ResultsView.test.tsx` beyond L1-60 and L140-175, and `InspectorPage.test.tsx` beyond L1-262 and L340-410. `fakeHost.ts` and `inspectorWorld.ts` were only searched. The other two domains' plan sections were not audited.
- **Commands run:** all via `ctx_shell` or `ctx_search`, none failed. They were `git status`, `git log`, `git diff 45b1fd3 493942a`, `git show --stat 8c84779`, `git show 45b1fd3:<path> | grep`, `sed` on the spec, `grep` of source and `package.json`, and `ls`. No tests, build or lint were run.

## Coverage table

| Pass | Status | Evidence inspected / check result | Limitation |
|---|---|---|---|
| 1 WIRING | checked | Traced `InspectorPage` -> `PageBody` -> `ResultsView` -> `Button`, `session.generation` / `fileId`, `focus.request`, and the harness (`SitePill`, `fakeHost`). Findings 001, 007, 008. | Focus order after close not executed. |
| 2 ERROR HANDLING | checked | Cancellation and focus paths: page-level settle on connection change, other site, rejected save, native cancel. Finding 001 only. | Controller internals belong to the export-controller reviewer. |
| 3 COMPLETENESS | checked | Spec ACs against the plan's tests and exit proof; baseline drift; reason texts. Findings 002-005, 011, 012. | PPTB-live items not verifiable. |
| 4 DEAD CODE | checked | `EXPORT_REASON` is removed and every use is covered by the plan (`InspectorPage.tsx:14,188`, `ResultsView.tsx:12,62`, two test files). `expectDisabledExport` is reused at `InspectorPage.test.tsx:154`, `374` and `386`, and the plan does not say how it changes. Finding 009 (redundant gate). | |
| 5 BLOAT | checked | Previous-job tracking duplicates state (001). The `useState<boolean>` grep proof is weak (010). | |
| 6 HARDCODING | checked | Test literals against real `reportFileName` output (006). | |
| 7 SECURITY | checked | Retrieval-only holds: the new Inspector code only reaches `host.saveFile`. Nothing renders generated markup. No logging beyond controller `console.error(errorName)`. | Controller body is not in my scope. |

## Findings

| ID | Severity | Pass | File:Line | Problem | Evidence | Fix and verification |
|---|---|---|---|---|---|---|
| page-integration-001 | WARNING | 1 WIRING | `docs/plans/p5-7_plan.md:170` | The E-10 focus-on-cancel design cannot work as written and breaks the project rules. The effect has deps `[controller, session.generation]`. The job goes null inside that same effect (`observe` closes it synchronously). The effect does not re-run on that transition, so "compare previous and current `job`" never sees the null. Adding `job` to the deps needs a previous-job ref or state, a second source of truth. `request()` then calls `setRequests` from inside an effect, which `react.md` forbids ("chaining state updates", "no reading refs in render"). | `useHeadingFocus`: `request: () => { setRequests((count) => count + 1); }` (`InspectorPage.tsx:62-64`). `.claude/rules/react.md` effect bullet. Source-verified, not executed. | Let the controller report the cancellation, not the page diffing jobs. For example, `createExportController(..., { onCancelled })` is called where it emits the "Results changed" toast, and the page passes `focus.request`. Its identity may be stale, because it only calls the stable `setRequests`. This needs no effect and no previous-job state. Verify with the C1 connection-change test asserting `document.activeElement` is the heading, and eslint passing. |
| page-integration-002 | WARNING | 3 COMPLETENESS | `docs/plans/p5-7_plan.md:169` (also L171, L175) | `EXPORT_NO_FILES_REASON` ("Nothing to export: no server logic files were found.") is applied whenever `files.length === 0`. That includes stopped or incomplete scans where nothing was read. The page deliberately refuses to say "no server logic" in that case. The plan's own test "for a stopped empty result" would assert the misleading text. | `pageCopy.ts`: `NOTHING_READ_TEXT = 'No server logic records were read.'` and `announcementFor` (`files.length === 0` -> `inventoryComplete ? NO_FILES_TEXT : NOTHING_READ_TEXT`). Existing tests `InspectorPage.test.tsx:389-397` and `399-404` assert `queryByText(NO_FILES_TEXT)` is null. Source-verified. | Choose the reason from `facts.inventoryComplete`: complete uses the plan's text, incomplete or stopped uses "Nothing to export: no server logic records were read." Add a test for the second case beside L389-397. |
| page-integration-003 | WARNING | 3 COMPLETENESS | `docs/plans/p5-7_plan.md:211` | The claim "`renderPdf` and jsPDF were already in the all-pages bundle from P5.6" is false. Nothing in `src` outside tests imports `report/` except the probe entry, which is a separate bundle. P5.7 is the first change that puts jsPDF, autotable and the PDF fonts into `dist`. The plan makes no size or build-risk step. The plan also statically imports `renderPdf` through `EXPORT_DEPS`, and `App.tsx` statically imports `InspectorPage`. `react.md` says heavy modules (PDF) stay off the initial render path via `React.lazy` / dynamic import. | Search of `src` excluding tests: only `probe/libraryProbe.ts` imports `jspdf`. `report/*` imports are internal. `App.tsx:17` has a static `InspectorPage` import. The plan's G4 row says the report functions "have no caller outside tests". `package.json` has a `size` script. Source-verified. | Correct the sentence. Add a before/after `npm run size` to the Gates and Evidence. Decide whether `EXPORT_DEPS.renderPdf` loads via inlined `import()`. The controller already awaits, so only the dep type changes. |
| page-integration-004 | WARNING | 3 COMPLETENESS | `docs/plans/p5-7_plan.md:5` (also L252, `P5-7choices.md` E-02/E-03/E-10 headers) | The baseline is stale. The plan says "HEAD `45b1fd3` ... the P5.5 evidence commit and the P5-5 plan tick are still in the working tree" and that test and bundle counts are taken from that landing commit. HEAD has since gained c3bf110 (evidence and tick), 493942a (a code change) and 8c84779. 493942a changed `InspectorPage.tsx` (`useHeadingFocus(scanning)` with state-based `request`), the session, `inspectorDeps` and tests. Quoted anchors drifted: E-03 "`InspectorPage.tsx` L224" is now L240. E-02 session lines L88/L119/L145/L178/L187/L213-219 are now L108/L139/L165/L198/L207/L236. E-10 cites `useHeadingFocus().request()`, but the hook now takes a `scanning` argument. | `git diff 45b1fd3 493942a --stat` (8 files, +322/-77). `grep -n "generation"` on both versions. `grep -n "key={state.result"` shows L240 at HEAD and L224 at 45b1fd3. Source-verified. | Rebase the plan header, Evidence header and self-review on the branch HEAD, refresh the line citations, and fix E-10's hook signature. Test and bundle counts must be compared with the current HEAD's run. |
| page-integration-005 | WARNING | 3 COMPLETENESS | `docs/plans/p5-7_plan.md:184` | The "another site while the dialog is open" test is a run-on, unresolved item, so an executor cannot act on it. Its premise is also wrong for this harness. `mount()` renders `<SitePill />` next to `InspectorPage`, and `pick()` already drives the real combobox. `Modal` portals into `body` with no `inert` or `aria-hidden` on siblings, and the focus trap only acts on Tab and Esc. The spec lists "another site" explicitly. The coverage table (L240) maps L935 only to the connection-change test. | `InspectorPage.test.tsx:42-50, 58-61`. `Modal.tsx` (`createPortal`, `handleKey` handles Escape and Tab only). Spec L370. Source-verified; not executed (see Unverified). | Replace the bullet with a concrete test: scanning with `fixedDeps(graded(), [SITE_ALPHA, SITE_BETA])`, open the dialog, `await pick(view, /Beta/)`, then assert the dialog is gone, `savedFiles` is empty, one info toast, and the heading is focused. Delete the probe option and O-2. |
| page-integration-006 | INFO | 6 HARDCODING | `docs/plans/p5-7_plan.md:180` | The test literal `<site>-site-readiness.pdf` is not what the code produces. `fixedDeps` replaces the site with the picked `SITE_ALPHA` ("Alpha portal"), and `reportIdentity` sanitises it, so the name is `Alpha-portal-site-readiness.pdf`. L179's `customer-summary-readiness.md` is correct. | `fixedDeps.ts` (`{ ...facts, site, ... }`). `reportFileName.ts:23-26, 31-35`. Source-verified. | Write the literal in the test, or build it with `reportFileNameBeforeBuild`. |
| page-integration-007 | INFO | 1 WIRING | `docs/plans/p5-7_plan.md:170` | The plan says to pass `onExport` "in the `results` case". That case lives in `PageBody`, whose props are `{ state, focus }`, and the controller lives in `InspectorPage`. The plan does not say how `controller` reaches `PageBody`. | `InspectorPage.tsx:118-125, 237-245, 254-267`. | State that `PageBody` gains `controller` or `onExport` as a prop. Verify with `npm run typecheck`. |
| page-integration-008 | INFO | 3 COMPLETENESS | `docs/plans/p5-7_plan.md:175` | "calls onExport for a finished scan" cannot be written in `ResultsView.test.tsx`. Every test there mounts the whole `InspectorPage` through `scanned()` / `open()` and has no `onExport` spy. O-4 (L247) says the plan proposes `variant="primary"`, but the L171 button snippet has no variant. | `ResultsView.test.tsx:48-60`. | Reword the test as "opens the Export report dialog", or render `ResultsView` directly with a spy. Put the variant decision into L171 or remove it from the plan. |
| page-integration-009 | PRUNE | 4 DEAD CODE | `docs/plans/p5-7_plan.md:205` | `npx --no-install eslint src tests --max-warnings=0` is a strict subset of `npm run lint`, which is `eslint . --max-warnings=0`. | `package.json`: `"lint": "eslint . --max-warnings=0"`. | Drop the L205 line. |
| page-integration-010 | INFO | 5 BLOAT | `docs/plans/p5-7_plan.md:223` | The exit proof "grep for `useState<boolean>` in `export/` finds none" proves little. It misses `useState(false)`, `useTransition` pending and `useOptimistic`. It also ignores `InspectorPage.tsx`, which is outside `export/` and is named in the same row. The no-mirrored-busy rule is better proven by a test. | Plan L223. | Replace it with a test that the primary button is `busy` and the status line follows `job.phase` only, plus a grep for `useState` in `export/` and in `InspectorPage.tsx` against an allow-list. |
| page-integration-011 | INFO | 3 COMPLETENESS | `docs/plans/p5-7_plan.md:187` | No test covers a same-identity `connection:*` event (a rename) while the dialog is open. That path must keep the dialog and the export (spec Error Scenario L936, AC-7.6), and the whole E-02 choice depends on `generation` ignoring it. A regression would over-cancel. | Session `adopt` for the same key: `if (connection !== snapshot.connection) publish({ connection })`, with no generation bump (`inspectorSession.ts` ~L186-190). Spec L936. | Add a C1 test: `setConnection({ ...CONNECTION, name: 'Renamed' })` + `connectionEvent`; the dialog stays open and export then saves. |
| page-integration-012 | INFO | 3 COMPLETENESS | `docs/plans/p5-7_plan.md:197` | The Rendered check relies on a "dev harness" fake host with a held save that does not exist in the tree. `main.tsx` uses `createPptbHost`, `createFakeHost` appears only in test harnesses, and E-12 forbids changing the fake. P5.5 used throwaway R1 files that it created and removed. Evidence "Still open" (L215) also omits RG-004 captured-screen/output parity across both formats and scopes, and RG-005 control contrast and selectable PDF text. | Grep for `createFakeHost` in non-test `src`. `docs/phase-5/evidence/p5-5/execution.md:76`. Brief L300-301. | Say how the throwaway harness is made (as P5.5's R1 files) and removed. Add the missing RG-004/RG-005 items to "Still open". |
| page-integration-013 | INFO | 3 COMPLETENESS | `docs/plans/p5-7_plan.md:211` | `npm run build:beta` is redundant, because the `buildShape` test already builds `--mode beta` into `node_modules/.cache/build-shape/beta-mode` and asserts the markers. It also writes to the default `dist` (`vite.config.ts:111`), so running it after `npm run build` overwrites the artifact that `npm run size` and the recorded bundle numbers read. | `tests/buildShape.test.ts:124-138`. `package.json` scripts. | Remove the beta run, or run it before `build` and the size step. |

## Unverified candidates

- **U-1:** "Another site while the dialog is open" is reachable through `pick()`. Source says yes. To confirm, write the test from finding 005 and run `npx vitest run src/features/inspector/InspectorPage.test.tsx` once the dialog exists.
- **U-2:** The first production build that includes jsPDF may break the single-classic-script build-shape assertions or emit warnings, for example from jsPDF's optional dynamic imports under `codeSplitting: false`. This needs `npm run build` and `npx vitest run tests/buildShape.test.ts` after the code lands.
- **U-3:** "Disabled while a scan runs" is met only by having no control in the scanning state (assertions at `InspectorPage.test.tsx:228, 249`). The spec says "disabled" (AC-9.1 and Error Scenario L917), and the brief says "disable it for a running scan". This is an owner-reading decision, so it needs sign-off, not a code check. The plan's "no spec delta" claim is the owner's call.
- **U-4:** The `document.activeElement === heading` result depends on the order of Modal's unmount cleanup (`opener?.focus()`) against the heading-focus effect. This is only checkable by running the C1 test.

## Cross-domain notes for the lead

- **export-controller / dialog-modal (plan L153-157, `useExportReport`):** `useEffect(() => () => controller.dispose(), [controller])` is irreversible. `main.tsx` and the harness `strict: true` run StrictMode's mount, cleanup, mount cycle, so the controller stays disposed and every later outcome (including the success toast) is silently dropped in dev and strict tests. Dispose must be undoable, or `observe` / `open` must re-arm it.
- **export-controller:** `EXPORT_DEPS` statically imports `renderPdf`, which conflicts with the `react.md` lazy-PDF rule (see finding 003). `useExportReport(deps?)` is called without deps from the page, so page tests cannot inject a failing renderer.
- **export-controller (E-02):** the choices text lists the generation bumps but omits the `ScanAbandonedError` path (`generation: mine + 1`, `inspectorSession.ts:165`). Its line numbers are stale (finding 004).
- **dialog-modal:** E-07 makes Esc a no-op while busy, but AC-9.1 says "Esc closes it". The "no spec delta" claim should say that the busy-state deviation is intentional.


---


## D. Consolidated Plan v1

Three merges (same defect, same corrective action): export-controller-004 ⇐ dialog-modal-001 (terminal `dispose()` under StrictMode; source is the contract at plan L89); export-controller-003 ⇐ dialog-modal-002 (`building` never painted; source is the `submit()` order at plan L94); page-integration-004 ⇐ export-controller-007 (stale baseline; source is plan L5). Plan v1 admitted 22 records: 13 WARNING, 2 PRUNE, 9 INFO (lead-verified against source before dispatch: `ConnectionProvider.tsx`, `InspectorSessionProvider.tsx`, `reportFileName.ts`, `main.tsx`, `NotifyProvider.tsx`, `primitives.css`, `pageCopy.ts`, `InspectorPage.test.tsx` harness, `inspectorWorld.ts`, `package.json`, `vite.config.ts`).

| ID (aliases) | Domain | Pass | Plan line | Sev v1 |
|---|---|---|---|---|
| export-controller-001 | export-controller | 1 | L94, L63, E-04 | WARNING |
| export-controller-003 (dialog-modal-002) | export-controller | 1 | L94, L136 | WARNING |
| export-controller-004 (dialog-modal-001) | export-controller | 1 | L89, L156 | WARNING |
| export-controller-002 | export-controller | 2 | L94/L107/L84, E-08 | WARNING |
| page-integration-001 | page-integration | 1 | L170, E-10 | WARNING |
| dialog-modal-003 | dialog-modal | 3 | L136 | WARNING |
| dialog-modal-004 | dialog-modal | 3 | L136 | WARNING |
| dialog-modal-005 | dialog-modal | 3 | L145 | WARNING |
| dialog-modal-006 | dialog-modal | 3 | L140 | WARNING |
| page-integration-002 | page-integration | 3 | L169/171/175, E-05 | WARNING |
| page-integration-003 | page-integration | 3 | L211 | WARNING |
| page-integration-004 (export-controller-007) | page-integration | 3 | L5, L252, choices | WARNING |
| page-integration-005 | page-integration | 3 | L184, O-2 | WARNING |
| export-controller-005 | export-controller | 4 | L60-61, L94, L108 | PRUNE |
| page-integration-009 | page-integration | 4 | L205 | PRUNE |
| export-controller-006 | export-controller | 5 | L94, L84, L106 | INFO |
| dialog-modal-007 | dialog-modal | 3 | L127 | INFO |
| dialog-modal-008 | dialog-modal | 6 | L151 | INFO |
| page-integration-006 | page-integration | 6 | L180 | INFO |
| page-integration-007 | page-integration | 1 | L170 | INFO |
| page-integration-008 | page-integration | 3 | L175/171/247 | INFO |
| page-integration-010 | page-integration | 5 | L223 | INFO |
| page-integration-011 | page-integration | 3 | L187 | INFO |
| page-integration-012 | page-integration | 3 | L197, L215 | INFO |
| page-integration-013 | page-integration | 3 | L211 | INFO |

Unverified candidates carried from reviewers (not findings): E-04 timer order in real PPTB; `structuredClone` under jsdom; deep-freeze typing without `as`; `notify` identity captured in `useState`; focus after a failed export; live-region mounting; pending save on page unmount; U-1 `pick()` reachability; U-2 jsPDF under `codeSplitting:false`; U-3 "disabled while scanning" satisfied by no control (owner reading); U-4 `activeElement` ordering.

## E. Skeptic Transcripts (per domain)

Each skeptic received only its own domain's slice, coverage record, source pointers and the phase resources. Challenges are quoted in summary; full skeptic text is retained at `scratchpad/skeptic-<domain>.md` for this session.

### E.1 export-controller (SK-export-controller-001…007)

Input: slice 001, 002, 003, 004, 005, 006 (007 merged away); coverage all "checked"; skeptic read plan, choices, spec L366–371, `reportFileName.ts`, `buildReportModel.ts` L151–229, `ConnectionProvider.tsx`, `InspectorSessionProvider.tsx`, `inspectorSession.ts`, `pptbHost.ts`, `hostErrors.ts`, `Modal.tsx`, `NotifyProvider.tsx`, `main.tsx`, react-dom 19.3.1 client build. Limit: no PPTB Desktop.

- **SK-export-controller-001** — Challenge: 001's WARNING reads AC-9.8 "cleared" as any host connection change; the app clears only after a *confirmed* `getActiveConnection` round trip (AC-7.6), which cannot finish inside a build + one yield, so saving first is spec-compliant ("once the host's save dialog has opened, the snapshot already built is what gets saved"). The yield's first hop isn't guaranteed (IPC vs timer order unspecified) but the yield *does* cover microtask-chain store moves (sync-lane `useSyncExternalStore` renders in a microtask, react-dom L20687; passive effects flushed at commit, L20016) such as D-19 C `listSites` replies.
  **Lead Response — ACCEPT.** Rationale: spec L370 (lead re-read) ties clearing to AC-7.6; `ConnectionProvider.tsx:30-46` + `InspectorSessionProvider.tsx:50-52` confirm clearing needs a host round trip. The user-visible behaviour the plan produces is spec-compliant; what is wrong is E-04's rationale ("closes the common race") and the A1 test at L106, which calls `observe` from a `setTimeout(0)` and proves only timer FIFO. Delta: export-controller-001 WARNING → INFO; Problem rewritten: "E-04 option A's Pro and plan L63 overclaim what the yield guards (it covers microtask-chain generation moves, not a host connection change); A1 L106 proves nothing about the connection chain. Correct the rationale and the test's claim; keep the yield." Mechanism text drops "covers at most the first hop".
- **SK-export-controller-002** — Challenge: 001's proposed fix (extra `await host.getActiveConnection()` before `saveFile`) adds an IPC round trip to the AC-9.9 build budget, has no defined outcome on a rejected read (WR-005 keeps the last confirmed identity), leaves a TOCTOU window, duplicates the provider's identity authority, could toast "Results changed" while results are still on screen, and ignores other generation movers.
  **Lead Response — ACCEPT.** Rationale: each hole is traceable to `ConnectionProvider.tsx:11-16, 40-45` and `pptbHost.ts` `HostCallError`; the fix shifts failure to another layer. Delta: the proposed fix is withdrawn from export-controller-001; replacement fix = "reword E-04 (Adopted Pro and the residual-window sentence) and O-1 to state exactly what the yield covers; no additional host read".
- **SK-export-controller-003** — Challenge: 003 overstates: only the busy *paint* is lost. The `building` sync-lane commit runs in the microtask after the click handler, before any queued input task, so a queued Esc or second click sees the committed state (Modal reads `onClose` via `useEffectEvent`; controller idle guard). The fix's rAF yield never fires in a hidden document → export stuck in `building` with close refused.
  **Lead Response — ACCEPT (in part).** Rationale: react-dom 19.3.1 L3433-3445 / L20687 as cited; `Modal.tsx:34` uses `useEffectEvent` (lead-verified). The missing indicator during a ≤5 s synchronous freeze remains misleading feedback and E-11 names the status line as the only user feedback, so WARNING stands. Delta: export-controller-003 Problem narrowed to "no busy indicator is painted before or during the synchronous build; Esc refusal and duplicate-submit protection are unaffected"; Fix amended: "yield with a macrotask (`setTimeout(0)`) after `phase:'building'`, never rAF alone (hidden-document hang); the dep stays injectable so A1 fake timers (L112) control it".
- **SK-export-controller-004** — Challenge: 004's reachability cites "strict tests" but no planned test renders strict (one `strict: true` caller in the repo, `InspectorSessionProvider.test.tsx:154`), so it ships silently; dev-only. Impact worse than stated: L94's "no state change" for a disposed job leaves the dialog stuck in `saving` with close refused (E-07). Is RG-004 evidence gathered on a dev build?
  **Lead Response — ACCEPT.** Rationale: plan text contains no `strict`; L94 wording confirmed; dispose is controller-level per L89/L113. Delta: export-controller-004 Problem rewritten: "under StrictMode (`npm run dev`, `renderInspector({ strict: true })`) the one-time `dispose()` leaves every later job stuck in `saving` with close refused; no planned test renders strict so nothing turns red; production bundles are unaffected". Fix adds "a page test under `strict: true`". New "Still open" item for Evidence: confirm RG-004/RG-005 PPTB evidence uses a production build.
- **SK-export-controller-005** — Challenge: 002's "specified three ways / unanswerable" depends on reading L84 as "a saving job's observe call is discarded"; "left alone" can mean "record, don't cancel", under which the move isn't lost and no stale retry follows. The contradiction that survives every reading is L107 ("one error toast") vs L94/E-08 (error then info, close).
  **Lead Response — ACCEPT (in part).** Rationale: L84 is ambiguous as the skeptic says; L107 vs L94/E-08 is a hard contradiction that blocks a test-first step. Delta: export-controller-002 Problem narrowed to "L107 contradicts L94/E-08 on the rejected-after-move toast count; L84 must state that `observe` always records the live generation and cancels only idle/building"; the "retry would export invalidated results" impact is removed. WARNING retained (executor cannot write the A1 `it.each` without choosing).
- **SK-export-controller-006** — Challenge: under L84 the submit-time and post-yield generation rechecks are unreachable (observe already cancelled any idle/building job); A1 L106 would catch a double toast anyway; PRUNE rather than INFO.
  **Lead Response — ACCEPT.** Rationale: plan text only; the skeptic's trace holds. Delta: export-controller-006 INFO → PRUNE; Problem: "the generation rechecks in `submit()` (synchronous at submit and after the yield) are unreachable under L84; replace with a job-identity check ('is this job still the controller's current job') and let `observe` be the one place that cancels and toasts".
- **SK-export-controller-007** — Challenge: Pass 7 verified `error.message` only on the host path; build-path messages (jsPDF, runtime errors, `pdfTable.ts:109` "Report table row has more cells than columns") reach the toast unreviewed.
  **Lead Response — ACCEPT.** Rationale: `pdfTable.ts:109` confirmed; plan L94 passes `error.message` through for every error. Delta: Pass 7 coverage row → "checked for the host path; build-path toast text unverified"; new **export-controller-008 INFO, Pass 7, plan L94/L108**: "the error toast body is the raw `error.message` of any build-path throw; define a message policy for non-host errors (plain-language body, technical name to `console.error` only)".
  Notes recorded: 005 PRUNE supported by `buildReportModel.ts:184` spreading `reportIdentity` with no override (lead-verified). "notify identity captured" candidate closed as safe (closes over stable `host`, setter, ref).

### E.2 dialog-modal (SK-dialog-modal-001…008)

Input: slice 003, 004, 005, 006, 007, 008 (001/002 merged away); coverage all "checked"; skeptic read `PillGroup.tsx`, `Button.tsx`, `Modal.tsx`, `Modal.test.tsx`, `useDisabledReason.tsx`, `primitives.css`, `tokens.css`, `NotifyProvider.tsx`, `fakeHost.ts` L60–175, `reportFixtures.ts`, spec L344–372, L886–896. Limit: PPTB save-dialog modality unknown.

- **SK-dialog-modal-001** — Challenge: 003's spec basis (L891) describes how an explaining disabled choice behaves, not a mandate for every busy-blocked control; the same plan line uses native `disabled` for checkboxes and the busy primary; trigger unproven (build synchronous; during saving input reaches the webview only if the host dialog is non-modal — E-07 shares that premise); the fix widens 004 to the Format group.
  **Lead Response — ACCEPT (in part).** Rationale: `PillGroup.tsx:111-113` confirms the silent no-op; the inconsistency between pills and checkboxes on plan L136 is real but host reachability is unverified. Delta: dialog-modal-003 WARNING → INFO; Problem: "while busy, Site summary/Markdown/PDF are neither `disabled` nor explained, unlike the checkboxes and primary beside them; clicks are silently dropped; the plan must state one busy treatment for all pills and how a selected + `aria-disabled` pill renders". New unverified candidate: "PPTB save-dialog modality (does the webview take input while `saveFile` is pending?) — affects E-07's rationale and 003's reachability; check in PPTB Desktop".
- **SK-dialog-modal-002** — Challenge: 004's contrast numbers are right (2.53:1 / 2.20:1) but SC 1.4.3 exempts inactive components and spec L893 does not list `--muted` on `--primary`; state visible only behind the native dialog; WARNING unsupported.
  **Lead Response — ACCEPT.** Rationale: spec L893 (lead re-read) enumerates its pairs; the pair is absent. Delta: dialog-modal-004 WARNING → INFO; the "spec claims AA" basis is dropped; fix retained as a quality rule (`.ui-pill--selected[aria-disabled='true'] { color: var(--on-primary) }`).
- **SK-dialog-modal-003** — Challenge: 005 is understated — the L145 "native cancel closes silently" stack assertion is vacuous with fake `notify: 'ok'` (false green), and the plan does not say whether B1 builds the controller with `vi.fn()` or goes through `useExportReport` under `NotifyProvider`.
  **Lead Response — ACCEPT.** Rationale: `NotifyProvider.tsx:16-20` renders a local toast only in `.catch`. Delta: dialog-modal-005 Problem extended with the vacuous negative and the harness ambiguity; Fix: "name the harness at L138; assert on the `notify` spy, or on `host.callsOf('notify')` (precedent `DownloadStarterButton.test.tsx` L116/L138)". WARNING retained.
- **SK-dialog-modal-004** — Challenge: 006 overstates ("any wrong binding passes") — the L140 defaults test catches a Redact↔(Questions|Snapshot) `checked` swap; uncovered are a Questions↔Snapshot swap, every `onChange` misbinding and Report-pill click → `scope`; impact understated (misbound Redact → unredacted file, AC-9.6).
  **Lead Response — ACCEPT.** Delta: dialog-modal-006 reworded accordingly; impact: "a misbound Redact handler saves an unredacted report with every listed test green (AC-9.6)". WARNING retained.
- **SK-dialog-modal-005** — Challenge: 007's remount/focus-loss clause assumes a conditional anchor span the plan does not specify; `Button`/`PillRadio` always render it. Verified parts: no `.ui-icon-button[aria-disabled]` rule; `primitives.css` absent from the Files table.
  **Lead Response — ACCEPT.** Rationale: `Button.tsx:31`, `PillGroup.tsx:63` unconditional spans (lead-verified). Delta: remount clause removed from dialog-modal-007; INFO retained.
- **SK-dialog-modal-006** — Challenge: 008's trigger fails — `LONG_FILE_NAME` is `'long-segment-'.repeat(31)…` (hyphenated, wraps); L894 concerns truncated values and nothing is truncated; reachability needs a ~70+ char break-free name, not established.
  **Lead Response — ACCEPT.** Rationale: `reportFixtures.ts:121` (lead-verified). Delta: dialog-modal-008 removed from confirmed findings → unverified candidate "context-line wrapping for a break-free name ≥ ~70 chars; check Dataverse name rules or a rendered check; fix if reachable: `overflow-wrap: anywhere`".
- **SK-dialog-modal-007** — Challenge (coverage, Pass 3): Modal's `FOCUSABLE` (`button:not([disabled])`) ignores `tabindex=-1`; on open it focuses the first non-close match, the "This file" radio; with no file selected that radio is `aria-disabled`/`tabIndex -1`, yet it receives focus, its tooltip opens (`useDisabledReason` `onFocus`) and `onFocusRadio` moves the roving stop onto the disabled option; APG expects entry focus on the checked radio (spec L890). First Modal containing a PillGroup; no B1 test asserts initial focus.
  **Lead Response — ACCEPT (new finding).** Rationale: `Modal.tsx:16-17, 63-70`, `PillGroup.tsx:69-81, 104-109` (lead-verified); not reproduced. Delta: admit **dialog-modal-009 WARNING, Pass 3, plan L136/L141**: "in the no-file case the dialog opens with focus on the `aria-disabled` 'This file' radio with its tooltip open; APG radio-group entry rule broken; untested". Fix: explicit initial focus (a Modal `initialFocus` target or the dialog focusing the checked radio / first enabled control); B1 test "opens with focus on the checked Report radio when no file is selected". Pass 3 coverage row amended.
- **SK-dialog-modal-008** — Challenge (coverage): two "unverified" candidates are decidable from plan + source: (1) after a failed save focus sits on `body` because the busy primary becomes natively `disabled` (focus fixup); (2) plan L136 does not say the `role="status"` line stays mounted while idle, so the first announcement may be missed.
  **Lead Response — ACCEPT (part 2 admitted; part 1 stays unverified with a named check).** Rationale: (1) depends on browser focus-fixup behaviour, not reproducible in jsdom → check named: "browser run: reject a held save, read `document.activeElement`"; (2) is a plan under-specification. Delta: admit **dialog-modal-010 INFO, Pass 3, plan L136**: "the status live region must be always mounted (empty when idle); add to B2 and assert in B1". Pass 3 row lists the focus-after-failure candidate as open.

### E.3 page-integration (SK-page-integration-001…005)

Input: slice 001–013 (004 alias of export-controller-007); coverage all "checked" with excluded test-file ranges; skeptic read `InspectorPage.tsx`, `Modal.tsx`, `inspectorSession.ts`, `StatePanel.tsx`, `primitives.css` L248–262, `InspectorPage.test.tsx` L1–80/L365–404/L580–667, `ResultsView.test.tsx` L40–72/L149–167, `App.tsx`, `vite.config.ts`, `tests/buildShape.test.ts`, `package.json`, spec L288, L362–372, L915–937; cached build outputs; one jsdom experiment.

- **SK-page-integration-001** — Challenge: 001's premise is weak — one effect can compare the render-time `job` with `controller.getSnapshot()` after `observe()` (no ref), using `useEffectEvent` for `state.kind`; the proposed `onCancelled` fix still calls `setRequests` from inside the same effect; `react.md` permits effects for syncing with external systems; the L183 test catches a wrong build; U-4 benign (jsdom 29.1.1: `focus()` on a detached opener leaves focus on the `<h2>`, reproduced).
  **Lead Response — ACCEPT.** Rationale: the before/after snapshot comparison is implementable as traced; the controller is an external store so an effect reacting to it is within the rule; the callback fix does not remove the concern it cites. Delta: page-integration-001 WARNING → INFO; Problem: "L170 under-specifies the mechanism ('compare previous and current job'); state it as render-time `job` vs `getSnapshot()` after `observe()`, with `useEffectEvent` for the non-reactive page state"; the `onCancelled` fix is withdrawn. U-4 closed on the skeptic's reproduction.
- **SK-page-integration-002** — Challenge (coverage, Pass 1 / E-10): if the generation moves while the job is `saving`, the controller keeps the job (L84/L107); when the save settles the dialog unmounts with its opener already detached, so focus falls to `body` — E-10's "success… lands on Export report" is false there; neither the observe-tied rule nor a cancellation callback covers it; no C1 test holds a save and changes the connection.
  **Lead Response — ACCEPT (new finding).** Rationale: plan L84/L94/L107 treat the path as live; `Modal.tsx:75-78` cleanup confirmed; jsdom check by skeptic (`activeElement === BODY`). Host-side reachability of a `connection:*` event during a pending native save is unverified and recorded. Delta: admit **page-integration-014 WARNING, Pass 1, plan L170, E-10**: "after a generation move during `saving`, the settled save closes the dialog onto a detached opener and focus drops to `body`; E-10's success rule is wrong for this case". Fix: key the heading-focus rule on "job became null while the page is not in `results`", whatever the cause; C1 test: hold the save (`deferred`), `setConnection(OTHER)` + `connectionEvent`, resolve, assert heading focus and the toast outcome.
- **SK-page-integration-003** — Challenge: 005's "premise wrong" holds only in jsdom; for a real user `.ui-scrim` is `position: fixed; inset: 0; z-index: 1000` and the picker popup is `z-index: 60`, Tab is trapped — the picker is unreachable; the `pick()` test would exercise a path users cannot take; spec L370 is a list of causes; grade INFO with O-2 left to the owner.
  **Lead Response — ACCEPT.** Rationale: `primitives.css:251-254` and `siteCombobox.css:52` (lead-verified). Delta: page-integration-005 WARNING → INFO; Problem: "L184 is an unresolved run-on; the owner must decide O-2. Note for the decision: the user cannot reach the site picker while the dialog is open (scrim/trap), so 'another site' is covered by the controller-level test; a jsdom `pick()` test would assert an impossible interaction"; the mandated `pick()` test is withdrawn.
- **SK-page-integration-004** — Challenge (coverage, Pass 3/4): the C1 list omits existing tests P5.7 reverses or breaks — `InspectorPage.test.tsx:372-376` (finished scan asserts disabled), `:25` and `ResultsView.test.tsx:12` import `EXPORT_REASON` (removed in C2 → `tsc -b` fails until edited), `ResultsView.test.tsx:161-166` (stopped scan asserts disabled); the excluded L410+ range holds the 493942a focus tests E-10 relies on.
  **Lead Response — ACCEPT.** Rationale: all four locations lead-verified (`InspectorPage.test.tsx:25, 77, 372`; `ResultsView.test.tsx:12, 155, 161`). Plan L36 names the two test files generically; the executor's recorded "failing signal" would not match. Delta: admit **page-integration-015 INFO, Pass 3, plan L36, L173–187**: "C1 does not enumerate the existing tests P5.7 reverses (`InspectorPage.test.tsx:372-376`, `ResultsView.test.tsx:161-166`) or breaks at compile time (`EXPORT_REASON` imports at `InspectorPage.test.tsx:25`, `ResultsView.test.tsx:12`); list them with their new assertions so the failing-signal record is truthful; `expectDisabledExport` callers at :154 and :386 (empty site, no sites) remain valid with the new reasons". Pass 3/4 coverage rows amended with the unread-range limitation.
- **SK-page-integration-005** — Challenge: 003 is right (reproduced: cached all-pages build `index-AefNr2BD.js`, 1,234,692 B, has 0 `%PDF-`/`AcroForm` matches; probe build has them) but its `React.lazy` fix cannot shrink a single IIFE under `codeSplitting: false`; size unquantified (≈ +1 MB: jsPDF 344 KB, autotable 82 KB, 473 KB TTF ≈ 630 KB base64 → roughly +75–85 %); neither `build:beta` nor the buildShape markers check jsPDF absence from beta (leak unlikely: Inspector CSS already absent from the cached beta build).
  **Lead Response — ACCEPT.** Delta: page-integration-003 Fix rewritten: "correct the L211 sentence; add `npm run size` before/after to Gates and Evidence with the expected ≈ +1 MB on 1.23 MB; the `react.md` lazy point (inlined `import()` defers evaluation only) is a separate optional note, not a size remedy". page-integration-013 amended: "also, neither run checks jsPDF absence from the beta bundle; a `%PDF-`/`jsPDF` marker in `buildShape` would (route to P5.8, which owns build proof)". WARNING retained for 003.

## F. Patch Notes (per domain, v1 → final)

### export-controller
| Record | Change | Verification | Trigger |
|---|---|---|---|
| export-controller-001 | WARNING → INFO; problem = E-04/L63 rationale overclaim + vacuous A1 L106; proposed host-read fix withdrawn | spec L370; `ConnectionProvider.tsx:30-46`; `InspectorSessionProvider.tsx:50-52` | SK-export-controller-001, -002 |
| export-controller-003 (dialog-modal-002) | impact narrowed to missing busy paint; fix = macrotask yield, not rAF alone | react-dom 19.3.1 L3433-3445/L20687 (skeptic); `Modal.tsx:34` | SK-export-controller-003 |
| export-controller-004 (dialog-modal-001) | reachability = no planned strict test; impact = stuck `saving` + close refused in dev; add strict page test; Still-open item on evidence build type | plan L89/L94/L113; `main.tsx:34` | SK-export-controller-004 |
| export-controller-002 | narrowed to L107 vs L94/E-08 contradiction + L84 ambiguity; stale-retry impact removed | plan text | SK-export-controller-005 |
| export-controller-006 | INFO → PRUNE; unreachable rechecks → job-identity check | plan L84/L94/L106 | SK-export-controller-006 |
| export-controller-008 (new) | admitted INFO: raw `error.message` policy for build-path errors | `pdfTable.ts:109`; plan L94 | SK-export-controller-007 |
| Coverage Pass 7 | narrowed: host path checked, build-path toast text unverified | — | SK-export-controller-007 |
| Unverified "notify identity" | closed as safe | `NotifyProvider.tsx:15-21` | note |

### dialog-modal
| Record | Change | Verification | Trigger |
|---|---|---|---|
| dialog-modal-003 | WARNING → INFO; reworded (all-pill busy treatment unspecified) | `PillGroup.tsx:104-113`; plan L86/L136 | SK-dialog-modal-001 |
| dialog-modal-004 | WARNING → INFO; AA-violation basis dropped | spec L893; SC 1.4.3 | SK-dialog-modal-002 |
| dialog-modal-005 | extended: vacuous negative; harness unspecified | `NotifyProvider.tsx:16-20` | SK-dialog-modal-003 |
| dialog-modal-006 | reworded; AC-9.6 impact | plan L140; `types/report.ts` | SK-dialog-modal-004 |
| dialog-modal-007 | remount clause removed | `Button.tsx:31`; `PillGroup.tsx:63` | SK-dialog-modal-005 |
| dialog-modal-008 | removed → unverified candidate | `reportFixtures.ts:121` | SK-dialog-modal-006 |
| dialog-modal-009 (new) | admitted WARNING: initial focus on `aria-disabled` radio | `Modal.tsx:16-17,63-70`; `PillGroup.tsx:69-81` | SK-dialog-modal-007 |
| dialog-modal-010 (new) | admitted INFO: status live region always mounted | plan L136 | SK-dialog-modal-008 |
| Coverage Pass 3 | notes Modal×PillGroup focus gap (009) and open focus-after-failure candidate | — | SK-dialog-modal-007/008 |
| Unverified (new) | PPTB save-dialog modality (affects E-07, 003) | — | SK-dialog-modal-001 |

### page-integration
| Record | Change | Verification | Trigger |
|---|---|---|---|
| page-integration-001 | WARNING → INFO; mechanism under-specified; callback fix withdrawn; U-4 closed | plan L84/L94; skeptic jsdom run | SK-page-integration-001 |
| page-integration-014 (new) | admitted WARNING: focus to `body` after save settles post-invalidation | plan L84/L107; `Modal.tsx:75-78` | SK-page-integration-002 |
| page-integration-005 | WARNING → INFO; `pick()` test withdrawn; O-2 to owner with scrim fact | `primitives.css:251-254`; `siteCombobox.css:52` | SK-page-integration-003 |
| page-integration-015 (new) | admitted INFO: C1 omits reversed/broken existing tests | `InspectorPage.test.tsx:25,372`; `ResultsView.test.tsx:12,161` | SK-page-integration-004 |
| Coverage Pass 3/4 | limitation recorded: `InspectorPage.test.tsx` L410+ unread by reviewer (skeptic read L580–667) | — | SK-page-integration-004 |
| page-integration-003 | fix = size step + corrected sentence; lazy note separated | skeptic cached-build check | SK-page-integration-005 |
| page-integration-013 | amended: beta bundle jsPDF-absence unchecked (route to P5.8) | `tests/buildShape.test.ts` | SK-page-integration-005 |

## G. Final Issue List

Sorted by severity, then pass. "Plan line" is `docs/plans/p5-7_plan.md` unless prefixed `choices`.

### WARNING (10)

| ID (aliases) | Domain · Pass | Plan line | Trigger → impact | Evidence | Fix and verification | Changed by |
|---|---|---|---|---|---|---|
| export-controller-003 (dialog-modal-002) | export-controller · 1 | L94, L136 | Click Export → `phase:'building'` then a synchronous build of up to 5 s before the first `await`; React commits in the microtask after the handler, so no busy indicator, busy primary or "Building report…" is painted during the freeze (E-11 names that line as the user's only feedback). Esc refusal and duplicate-submit protection are unaffected. | `renderPdf(model): Uint8Array` synchronous; plan L94 order; react-dom 19.3.1 L20687 (skeptic) | Yield with a macrotask (`setTimeout(0)`, injectable dep) after `phase:'building'` and before the build; never rAF alone (hidden document never fires → stuck). B1 test with a held yield: status reads "Building report…" and the primary is busy before the build runs. | SK-export-controller-003 |
| export-controller-004 (dialog-modal-001) | export-controller · 1 | L89, L155-156, L113 | Under StrictMode (`npm run dev`, `renderInspector({ strict: true })`) the cleanup→remount cycle calls the one-time `dispose()`; every later job's outcome is dropped and, per L94 "no state change", the dialog stays in `saving` with close refused. No planned test renders strict, so it ships silently; production bundles unaffected. | `main.tsx:34`; `inspectorTestHarness.tsx` `strict` option; precedent `inspectorSession.stop()` re-armed by `adopt` | Make dispose reversible (arm in the effect, disarm in its cleanup) or create the controller inside the effect; page test under `strict: true`: open, submit, toast. Evidence "Still open": confirm PPTB timing evidence runs on a production build. | SK-export-controller-004 |
| export-controller-002 | export-controller · 2 | L84, L94, L107; choices E-08 | The rejected-after-generation-move case is specified as "error toast then info toast, close" (L94, E-08) and as "one error toast" (L107); L84's "a saving job is left alone" does not say whether `observe` records the live generation. An executor cannot write the A1 `it.each` without choosing. | plan text | Pin one behaviour (recommended: observe always records `live`, cancels only idle/building; on failure with `live !== job.generation` close with error toast then info toast); fix L107 to match; A1 test asserts two toasts and job cleared. | SK-export-controller-005 |
| dialog-modal-009 | dialog-modal · 3 | L136, L141 | Open the dialog with no file selected → Modal focuses the first `button:not([disabled])` that is not the close button, the `aria-disabled` "This file" radio (`tabindex=-1` is not excluded); its tooltip opens and the roving stop moves onto the disabled option while "Site summary" is checked. APG radio-group entry rule (spec L890) broken; no B1 test asserts initial focus. | `Modal.tsx:16-17, 63-70`; `PillGroup.tsx:69-81, 104-109`; source-verified, not reproduced | ExportDialog (or a Modal `initialFocus` option) focuses the checked radio / first enabled control on open; B1 test "opens with focus on the checked Report radio when no file is selected". | SK-dialog-modal-007 (new) |
| dialog-modal-005 | dialog-modal · 3 | L138, L145 | B1 asserts toasts via `NotifyProvider`'s stack, but `notify` calls `host.notify` first and renders a local toast only on rejection; fake default `notify: 'ok'` → stack always empty: positive assertions cannot pass and the "native cancel closes silently" negative is a false green. The plan does not say whether B1 hand-builds the controller or uses `useExportReport`. | `NotifyProvider.tsx:16-20`; `fakeHost.ts` default notify; precedent `DownloadStarterButton.test.tsx` L116/L138 | Name the harness at L138; assert on the `notify` spy, or on `host.callsOf('notify')` (incl. `toEqual([])` for the silent path). Query the dialog's status line `within(dialog)`. | SK-dialog-modal-003 |
| dialog-modal-006 | dialog-modal · 3 | L140-147 | No B1 test maps a control change to `ReportOptions`: `onChange` misbindings, a Questions↔Snapshot `checked` swap and Report-pill click → `scope` are undetected (the 32-combination test drives the controller directly). A misbound Redact handler saves an unredacted report (AC-9.6) with every listed test green. No Cancel-while-idle dialog test. | plan L100, L140; `types/report.ts` | One B1 test per control: change it, submit, assert the options `buildReportModel`/`saveFile` received (redact → `[site]` in the name); a Cancel-while-idle test. | SK-dialog-modal-004 |
| page-integration-002 | page-integration · 3 | L169, L171, L175; choices E-05 | Stopped/incomplete scan with zero files → button reason "Nothing to export: no server logic files were found." although nothing was read; the page deliberately distinguishes (`pageCopy.ts:63` `inventoryComplete ? NO_FILES_TEXT : NOTHING_READ_TEXT`; tests at `InspectorPage.test.tsx:389-404` assert `NO_FILES_TEXT` absent). The plan's own "stopped empty result" test would assert the misleading text. | `pageCopy.ts:8-9, 63` | Choose the reason from `facts.inventoryComplete` (complete → "…no server logic files were found."; otherwise "…no server logic records were read."); test both beside L389-397. | — |
| page-integration-003 | page-integration · 3 | L211 | "`renderPdf` and jsPDF were already in the all-pages bundle from P5.6" is false: today's all-pages build has 0 `%PDF-`/`AcroForm` markers (probe build has them); P5.7 is the first change to put jsPDF, autotable and ≈473 KB of TTF (≈630 KB base64) into `dist` — roughly +1 MB on a 1.23 MB IIFE — with no size step, so the evidence would misattribute the increase. | skeptic: `node_modules/.cache/build-shape/all/assets/index-AefNr2BD.js` (1,234,692 B) 0 matches; `report/` importers only inside `report/` and tests; `package.json` `size` script | Correct the sentence; add `npm run size` before/after to Gates and Evidence with the expected delta. Separately (optional, `react.md`): an inlined `import()` for `renderPdf` defers evaluation only and does not reduce size. | SK-page-integration-005 |
| page-integration-004 (export-controller-007) | page-integration · 3 | L5, L252; choices header, E-02, E-03, E-10 | Baseline `45b1fd3` is stale: `c3bf110` (docs), `493942a` (code: `InspectorPage.tsx` +42 incl. `useHeadingFocus(scanning)`, session settle chain, tests), `8c84779` (docs). Anchors drifted: E-03 `InspectorPage.tsx` L224 → L240; E-02 session lines L88/119/145/178/187/213-219 → L108/139/165/198/207/236; E-10 cites `useHeadingFocus().request()` but the hook now takes `scanning`. The plan's anchored-edit convention and "every file reference exists at 45b1fd3" claim need a re-read. | `git diff --stat 45b1fd3 493942a -- src` (5 files) | Rebase the header, Evidence baseline and self-review on the branch HEAD; refresh citations; fix E-10's hook signature; take test/bundle counts from the current HEAD. | — |
| page-integration-014 | page-integration · 1 | L84, L107, L170; choices E-10 | Connection (or any generation) change while the job is `saving` → the controller keeps the job; when the save settles the dialog unmounts onto a detached opener and focus drops to `body`. E-10's "success… lands on Export report" is wrong for this case; no C1 test holds a save and changes the connection. Host-side reachability of a connection event during a pending native save is unverified (recorded below). | plan L84/L94/L107; `Modal.tsx:75-78`; skeptic jsdom check (`activeElement === BODY`) | Key the heading-focus rule on "job became null while the page is not in `results`", whatever the cause; C1 test: hold the save, `setConnection(OTHER)` + `connectionEvent`, resolve, assert heading focus and the outcome toast. | SK-page-integration-002 (new) |

### PRUNE (3)

| ID | Domain · Pass | Plan line | Problem | Evidence | Fix | Changed by |
|---|---|---|---|---|---|---|
| export-controller-005 | export-controller · 4 | L60-61, L94, L108 | `reportFileName(model)` ≡ `reportFileNameBeforeBuild(result, options)`: both are `filenameOf(reportIdentity(…))` and `buildReportModel` spreads the identity with no override; the second computation and the "filename failure" case are unreachable except through injected deps. | `reportFileName.ts:32-44`; `buildReportModel.ts:184` | Compute the name once; drop `reportFileName` from `ExportDeps`; four failure points; keep one equality assertion against `reportFileName(model)` for spec row L235. | — |
| export-controller-006 | export-controller · 5 | L84, L94, L106 | Under L84, `observe` already cancels any idle/building job whose generation moved, so the submit-time and post-yield generation rechecks in `submit()` can never be true. | plan text | Replace with a job-identity check ("still the controller's current job"); `observe` is the only place that cancels and toasts. | SK-export-controller-006 |
| page-integration-009 | page-integration · 4 | L205 | `npx --no-install eslint src tests --max-warnings=0` is a strict subset of `npm run lint` (`eslint . --max-warnings=0`). | `package.json:9` | Drop L205. | — |

### INFO (16)

| ID | Domain · Pass | Plan line | Problem | Fix | Changed by |
|---|---|---|---|---|---|
| export-controller-001 | export-controller · 1 | L63, L94, L106; choices E-04, O-1 L244 | E-04's Pro ("closes the common race") and L63 overclaim: a host connection change needs a `getActiveConnection` round trip, provider `setState`, adopt effect and page effect, which one macrotask cannot cover (and IPC-vs-timer order is unspecified). The yield does cover microtask-chain store moves (e.g. D-19 C). A1 L106 calls `observe` from a `setTimeout(0)` and proves only timer FIFO. Saving before app-level confirmation is spec-compliant (AC-9.8 last sentence). | Reword E-04/L63/O-1 to what the yield covers; rename or reframe the L106 test; no additional host read. | SK-export-controller-001/-002 |
| export-controller-008 | export-controller · 7 | L94, L108 | The error toast body is the raw `error.message` of any build-path throw (jsPDF internals, `RangeError`, `pdfTable.ts:109` "Report table row has more cells than columns"); only the host path (`Host call failed: saveFile.`) was reviewed. | Define a message policy for non-host errors (plain-language body; technical name to `console.error`). | SK-export-controller-007 (new) |
| page-integration-001 | page-integration · 1 | L170; choices E-10 | "Compare the previous and current `job` in the same effect" is under-specified; implementable as render-time `job` vs `controller.getSnapshot()` after `observe()`, with `useEffectEvent` for the non-reactive page state. The L183 test catches a wrong build. | State the mechanism at L170. | SK-page-integration-001 |
| page-integration-007 | page-integration · 1 | L170 | `onExport` is passed "in the `results` case", which lives in `PageBody({ state, focus })` while the controller lives in `InspectorPage`; plumbing unspecified. | State that `PageBody` gains `onExport`/`controller`; `npm run typecheck`. | — |
| dialog-modal-003 | dialog-modal · 3 | L136 | While busy, Site summary/Markdown/PDF are neither `disabled` nor explained (unlike the checkboxes and primary beside them) and clicks are silently dropped by the controller guard. Host reachability during a native save unverified. | One busy treatment for all pills; specify the selected + `aria-disabled` rendering. | SK-dialog-modal-001 |
| dialog-modal-004 | dialog-modal · 3 | L136 | Selected pill with the busy reason renders `--muted` on `--primary` (≈2.5:1 / 2.2:1); SC 1.4.3 exempts inactive components and spec L893 does not promise the pair, so no violation, but the selected value is hard to read while saving. | `.ui-pill--selected[aria-disabled='true'] { color: var(--on-primary) }`. | SK-dialog-modal-002 |
| dialog-modal-007 | dialog-modal · 3 | L127, L34 | No `.ui-icon-button[aria-disabled]` style exists (`primitives.css:191-199`), so the refused close button looks clickable; `primitives.css` is absent from the Files table. | Add the rule; list `primitives.css`. | SK-dialog-modal-005 |
| dialog-modal-010 | dialog-modal · 3 | L136 | The plan does not say the `role="status"` line stays mounted while idle; a live region inserted with its text is often not announced. | Always mount it (empty when idle); B1 asserts presence while idle. | SK-dialog-modal-008 (new) |
| page-integration-005 | page-integration · 3 | L184; O-2 L245 | The "another site while the dialog is open" bullet is an unresolved run-on. For the owner's O-2 decision: the user cannot reach the site picker while the dialog is open (`.ui-scrim` z-index 1000 over the popup's 60; Tab trapped), so a jsdom `pick()` test would assert an impossible interaction; the controller-level test plus the connection-change page test cover the reachable paths. | Replace L184 with the decision. | SK-page-integration-003 |
| page-integration-008 | page-integration · 3 | L175, L171, L247 | "calls onExport" cannot be written in `ResultsView.test.tsx` (every test mounts the whole page via `scanned()/open()`; no spy). O-4's `variant="primary"` is not in the L171 snippet. | Reword as "opens the Export report dialog" or render `ResultsView` directly; put the variant decision into L171. | — |
| page-integration-011 | page-integration · 3 | L187 | No test for a same-identity `connection:*` event (rename) while the dialog is open; `adopt` for the same key publishes `connection` only (no bump); a regression would over-cancel (AC-7.6, Error Scenario L936). | C1 test: `setConnection({ ...CONNECTION, name: 'Renamed' })` + `connectionEvent`; dialog stays, export saves. | — |
| page-integration-012 | page-integration · 3 | L197, L215 | The rendered check relies on a dev harness with a fake host and a held save that does not exist (`main.tsx` uses `createPptbHost`; E-12 forbids changing the fake); P5.5 used throwaway R1 files. "Still open" omits RG-004 screen/output parity and RG-005 contrast / selectable PDF text. | Describe the throwaway harness and its removal; add the missing items. | — |
| page-integration-013 | page-integration · 3 | L211 | `npm run build:beta` duplicates `tests/buildShape.test.ts` (builds `--mode beta` into the cache) and overwrites `dist` read by `npm run size`. Neither checks jsPDF absence from beta (leak unlikely; route a `%PDF-` marker to P5.8). | Drop the run or sequence it before `build`/size. | SK-page-integration-005 |
| page-integration-015 | page-integration · 3 | L36, L173-187 | C1 does not enumerate the existing tests P5.7 reverses (`InspectorPage.test.tsx:372-376`, `ResultsView.test.tsx:161-166`) or breaks at compile time (`EXPORT_REASON` imports `InspectorPage.test.tsx:25`, `ResultsView.test.tsx:12`), so the recorded failing signal would not match; `expectDisabledExport` callers at :154/:386 stay valid with the new reasons. | List them with their new assertions. | SK-page-integration-004 (new) |
| page-integration-010 | page-integration · 5 | L223 | "grep for `useState<boolean>` in `export/`" proves little (misses `useState(false)`, `useTransition`, `useOptimistic`, `InspectorPage.tsx`). | Prove via a test that busy follows `job.phase` only, plus an allow-listed `useState` grep. | — |
| page-integration-006 | page-integration · 6 | L180 | `<site>-site-readiness.pdf` is really `Alpha-portal-site-readiness.pdf` (`fixedDeps` picks `SITE_ALPHA` "Alpha portal"; `reportIdentity` sanitises). | Write the literal or build it with `reportFileNameBeforeBuild`. | — |

### Unverified candidates (not findings)

| Candidate | Domain | Missing check |
|---|---|---|
| PPTB save-dialog modality: does the webview receive input while `saveFile` is pending? Affects E-07's rationale, dialog-modal-003 and page-integration-014's host-side reachability. | dialog-modal / page-integration | PPTB Desktop run with a held save. |
| Focus after a failed save: busy primary becomes natively `disabled` (`Button.tsx:42`) → browser focus fixup moves focus to `body`; E-08 returns to idle with focus unset. | dialog-modal | Browser run (jsdom lacks focus fixup): reject a held save, read `document.activeElement`. |
| Context-line wrapping for a break-free site/file name ≥ ~70 chars (the `LONG_FILE_NAME` fixture is hyphenated and wraps). | dialog-modal | Dataverse name rules, or a rendered check with such a name. |
| Pending save when the page unmounts (view switch): dispose drops the "exported" toast. | dialog-modal | Confirm `App.tsx` `Panel` keeps pages mounted (`hidden`) — reviewer export-controller reports it does; close if confirmed. |
| E-04 IPC-vs-timer ordering in PPTB; `structuredClone` of `SiteResult` under jsdom; deep-freeze helper typing without `as`. | export-controller | First A1 run / `tsc -b` at A2. |
| U-2: jsPDF under `codeSplitting: false` against the build-shape assertions. | page-integration | `npm run build` + `npx vitest run tests/buildShape.test.ts` after Sub-slice A lands. |
| U-3: AC-9.1 "disabled while a scan runs" satisfied by having no control in the scanning state (plan's "no spec delta" reading). | page-integration | Owner sign-off, not a code check. |

Closed during the review: "notify identity captured in `useState`" (safe: closes over stable `host`, setter, ref); U-4 `activeElement` ordering (skeptic jsdom reproduction: focus stays on the heading).

### Coverage limits

- All seven passes checked in every domain except: export-controller Pass 7 narrowed to the host path (build-path toast text unverified → export-controller-008); dialog-modal Pass 3 carries the open focus-after-failure candidate; page-integration Pass 3/4 — the reviewer did not read `InspectorPage.test.tsx` L410+ (the skeptic read L580–667) or `ResultsView.test.tsx` outside L1–60/L140–175.
- No design-handoff reference for the export dialog exists in the repo (glob `*export*` under `design_handoff_server_logic_tools` → 0 files); AC-9.1 text is the only design source.
- No worker ran the build, lint or full test suite; the only executed test file was `renderPdf.test.ts` (23 passed).

## Publication checks

- In-scope files (two) fully partitioned by line range and decision ID; one primary owner each; no exclusions or blocked files. ✓
- Every pass has a coverage status with evidence or a reason in all three domains (raw tables in C; amendments in F/G). ✓
- Confirmed findings satisfy admission (trigger, reachability, impact, evidence) and the severity guide; locations match snapshot `493942a`. ✓
- Raw results (C), Plan v1 (D), merges/aliases (D, G) and final IDs (G) reconcile: 22 v1 records → 29 final (3 merges kept as aliases; 1 removed to unverified; 5 new in-domain records: export-controller-008, dialog-modal-009, dialog-modal-010, page-integration-014, page-integration-015). No malformed rows. ✓
- Every domain's skeptic status is visible (E); every challenge carries a decision (20 challenges: 20 ACCEPT, 7 of them "in part"; 0 REJECT; 0 DEFER); deltas retain originating IDs (F). ✓
- Sections A–G present with content. Status reflects the open candidates listed above. ✓


---
