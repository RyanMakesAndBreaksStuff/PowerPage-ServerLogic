# goodplan: implement the fixes from goodreview.md

**Source:** `goodreview.md` (2026-11-10, branch `review` at `686103c`) · **Planned:** 2026-11-11
**First step after approval:** copy this file verbatim to `goodplan.md` at the repo root.

## Context

`goodreview.md` found the code green at unit level but with two unlisted Inspector defects (N1, N2), three known-open ones (N3, N4, AC-9.8), a paging flag left on after its evidence passed, a spec that trails both code and evidence, and release blockers outside feature code (no publish guard, no CI, no Inspector docs, an unsettled working tree). This plan turns that review into sub-agent tasks grouped into waves whose tasks own disjoint files, so each wave runs in parallel.

Three Opus 5.5 (medium) explorers verified the review against the code first. Their corrections are folded in:

- `pptb-validate` is already installed (via `@pptb/types`); only the `validate` script and `build-manual.md:145` are wrong.
- `selectedFileId` is redundant with `options.fileId`, not dead.
- Only 2 docs link `phasse5plan.md` (14 mention it by name).
- Un-ignoring `scripts/` in ESLint lints nothing; it needs its own `files` block.
- N2's fall-through fix is correct but rarely matters: PPTB emits either a `0x` code or `HTTP n`. The useful half is the three untested throttling codes.
- The deviations table has 28 rows, 27 undecided (review said about 25).
- No product UI renders any external link, so FR-1 is unmet by absence, not by raw `<a>`.

## Owner answers (2026-11-11)

| Question | Answer |
|---|---|
| Open owner decisions | Use the planner's defaults (section "Defaults"), each open to veto |
| Optional scope | Include architecture moves and live site probes. Defer the AC-4.12 matrix and P5.8 release proof |
| `NEXT_LINK_UNVERIFIED` | Flip now on the 2026-11-10 evidence |
| Working tree | Restore `.claude/settings.json`; commit the other deletions; delete the pnpm files |

## Execution model

- **Orchestrator** (main session) runs Wave 0 and the merges; it writes no feature code.
- **Implementers:** `oh-my-claudecode:executor`, Sonnet 5.5 high (standing preference), one per task, each with `isolation: "worktree"`. All tasks of a wave are spawned in one message.
- **Read-only lanes** (design, review, verification): Opus 5.5 medium.
- **Per task:** write the failing test first where one is named, make it pass, run `npm run typecheck`, `npm run lint`, and the task's test files; commit once on the worktree branch (conventional message, no push). The orchestrator merges each wave into `review`, then runs the full gates before starting the next wave.
- **File ownership is exclusive within a wave.** A task that finds it needs a file it does not own stops and reports instead of editing it.
- **Rules that bind every task:** `.claude/rules/*` (no `any`, no `!`, no casts, no `useEffect` for derived state, named exports, no formatter, single IIFE bundle, retrieval-only host access).
- Nothing in this plan runs `npm publish` or pushes.

## Wave 0: settle the tree (orchestrator, serial)

1. Copy this plan to `goodplan.md`.
2. `git restore .claude/settings.json` (brings back the `npm publish` deny rule and the two hooks).
3. Delete untracked `pnpm-lock.yaml`, `pnpm-workspace.yaml`, the superseded `docs/plans/2026-11-08-live-pptb-probe-automation.md`, and the ignored `probes/reports/pending/`.
4. Commit the remaining deletions (`.claude/CLAUDE.md`, `.claude/integrations.md`, `CLAUDE2.md`, `phasse5plan.md`, `spec3check.md`, `tools/minimatch-compat/*`) and the `CLAUDE.md` edit. Commit the untracked review inputs (`goodreview.md`, `goodplan.md`, `tasks/*.md`, `full-review/`, the 11-09 probe plan) so worktrees see them.
5. Baseline: `npm run typecheck && npm run lint && npm test` (expect 116 files, 2046 tests), then `npm run build` and `npm run size`; record the gzip size for T8's budget.

## Wave 1: parallel, disjoint files

| Task | Owns | Work |
|---|---|---|
| **T1 N1 parent read failure** | `features/inspector/model/grantSet.ts`, `grantSet.test.ts`, `evidence.test.ts` | Build `unreadIds` from `facts.unreadableRows` (type 18). `parentChain` gains `unread`: parent missing and (`unreadIds.has(parentId)` or `unreadIds.has('')`). At `:91-96` set `readFailure: chain.unread`. Tests: beside the `it.each` at `grantSet.test.ts:111-138` using `siteFacts`/`permission`/`read` fixtures, both the matching-id and `id: ''` cases; one `canReviewFinding` assertion in `evidence.test.ts`. |
| **T2 Host adapter** | `services/pptb/hostErrors.ts`, `dataverseRead.ts`, `pptbHost.ts`, `dataverseRead.test.ts`, `dataverseRead.phase5.test.ts`, `pptbHost.test.ts` | (a) N2: try the code table, fall through to `HTTP n` and sign-in phrases when unmapped. Extend `it.each` at `dataverseRead.test.ts:48-63` with `0x80072321`, `0x80072326`, `0x8005f103` and a `'0x80040265: x: HTTP 503'` case. (b) Set `NEXT_LINK_UNVERIFIED = false`; rewrite the three tests that pin `true` (`dataverseRead.test.ts:208-210`, `phase5:49-55`, `pptbHost.test.ts:598-601`) to cover strict mode through explicit `strict: true`. (c) FR-7: export `isAllowedFileRequest(request: unknown)` checking name, `operationType === 'action'`, and no `entityName`/`entityId`; use it at `pptbHost.ts:147`; test in `describe('retrieval-only guarantee')`. (d) `tool:unloaded` detaches the hub; test mirrors the pagehide test. (e) Replace the cast at `:111` with `Reflect.apply(result, undefined, [])`. Lazy registration stays (Fix 7 design). |
| **T3 File download** | `services/pptb/dataverseFiles.ts`, `dataverseFiles.test.ts` | Drop the `btoa` round-trip (length and regex checks already validate), decode into a preallocated `Uint8Array`, give the oversized case its own `HostReadError` message. Cap stays 128 MiB. Assert the message in the `it.each` at `:100-110`. |
| **T4 N3 mid-scan switch** | `features/inspector/scan/scan.ts`, `scan.test.ts` | In `runScan`, subscribe with `host.onEvent` at start, set `changed` on `connection-changed`, unsubscribe in the existing `finally`; if `changed`, throw `ScanAbandonedError` before results are returned. Test in "runScan progress, time and identity" (`:734-792`): wrap `queryAll` so the first call switches to B and back, expect abandonment and `fake.listenerCount()` back to its start value. Then run the `listenerCount()` suites (`App.test.tsx`, `InspectorSessionProvider.test.tsx`, `InspectorPage.test.tsx`, `ConnectionProvider.test.tsx`) and report any that break rather than editing them. |
| **T5 Export session** | `app/inspector-site/inspectorSession.ts`, `inspectorSession.types.ts`, `features/inspector/**/exportCopy.ts`, `ExportDialog.tsx`, and tests `inspectorSession.test.ts`, `InspectorPage.test.tsx`, `ExportDialog.test.tsx` | (a) AC-9.8: for a job in `saving`, close the dialog and bump `exportStaleCloses` but send no "cancelled" toast; update the two tests that assert the double toast. (b) Save and build failures show `SAVE_FAILED_BODY` / `BUILD_FAILED_BODY`, never `HostCallError.message`. (c) N4: stop pretending the watchdog fires mid-build. Time the build; if it exceeded 5 s, show the slow notice once it returns. Rewrite the test at `:1115-1136` so it no longer advances timers inside `renderPdf`. (d) Remove `ExportJob.generation`; replace `selectedFileId` with `options.fileId`. |
| **T6 Starter small fixes** | `features/starter/inputs/RecipeCombobox.tsx`, `StarterInputs.tsx`, `starterOptions.ts`, `features/starter/download/DownloadStarterButton.tsx`, and their tests | (a) Remove the effect that pushes `visible.length` to the parent and the `useCallback`: lift `query` to `StarterInputs` or compute the count there. (b) Remove the `as unknown as` cast with an `in`/`typeof` guard on `scrollIntoView`. (c) AC-2.11: render the slug in `<code>` (the note is also a `title`, keep that plain). (d) AC-3.1: "1 recipe". (e) Download failures from the host show a plain-language constant; generator validation messages stay. |
| **T7 Error boundary** | `app/App.tsx`, `App.test.tsx` | Wrap everything `App` renders in the existing `PageErrorBoundary` (`label="Server Logic Tools"`), keeping the per-page boundary at `:56`. Test: a fake host whose `onEvent` throws yields `role="alert"`. |
| **T8 Release gate, CI, tooling** | `package.json`, `package-lock.json`, `scripts/**`, `.github/**`, `.nvmrc`, `eslint.config.ts`, `tsconfig.node.json`, `tests/manifest.test.ts` | (a) `validate` → `pptb-validate --skip-url-checks`. (b) New `scripts/verify-release.mjs` and `verify:release` script: typecheck, lint, test, `build:beta`, validate, size budget (Wave 0 gzip size plus 10 %, non-zero exit over budget), `npm pack --dry-run --json` must list only `dist/**` plus npm's defaults and no Inspector page. `prepack` runs it. Default `build` is unchanged because `probe-live.mjs` and `tests/buildShape.test.ts` depend on it. (c) `.github/workflows/ci.yml`: Node from `.nvmrc` (20.19), `npm ci`, typecheck, lint, test, `build:beta`. (d) ESLint: drop `scripts` from ignores and add a `files: ['scripts/**/*.{js,mjs}']` block with Node globals and `@eslint/js` recommended; fix what it finds. (e) `tsconfig.node.json`: add `exactOptionalPropertyTypes`, `noImplicitOverride`. (f) Remove `acorn-walk` and the three font devDependencies; update `tests/manifest.test.ts:82`. Confirm `npm run probe:live:pack` still packs. |
| **T9 Dead code** | `public/variant-{a,b,c}.svg`, the 3 unused TTFs in `src/assets/fonts/`, `components/icons.ts`, `app/useActiveConnection.ts`, `ConnectionProvider.test.tsx`, `app/ExternalLink.tsx` and its test, `services/generators/client/liquidCheck.ts` and its 2 importing tests | Delete the SVGs, TTFs (keep OFL texts), icons `arrow-export`/`arrow-right`/`chevron-right`, `useActiveConnection` (keep the file's other exports), `ExternalLink` and its test. Rename `liquidCheck.ts` to `liquidCheck.testkit.ts` (existing `*.testkit.ts` convention). Re-verify each with an importer search before deleting. |
| **T10 Generators** | `services/generators/handlers/r4.ts`, `r7.ts`, `r9.ts`, `r4.test.ts`, `r7.behavior.test.ts`, R4/R7/R9 files under `__golden__/` | (a) R4 `post`/`put`: drop caller keys containing `@` (covers `@odata.bind` and annotations) before `CreateRecord`/`UpdateRecord`; emit via `JSON.stringify` literals, no string-built code. (b) Move `Server.SiteSetting.Get` inside `try` in R7 and R9, as R3 and R6 already do. Regenerate the three goldens from `generateRn().text`, update `HIGHLIGHTS` at `r4.test.ts:10`, add a `Get`-throws case to `r7.behavior.test.ts` and an R4 case proving `@` keys are dropped. |
| **T11 Data hygiene** | `.gitignore`, `docs/specs/**/spikes/s1/*.json`, `spikes/s4/envvar.json`, `spikes/s4/page.json`, `.scratch/*` | Search for tests reading these files first. Then `git rm --cached` them and add ignore rules (`.gitignore` already lists `/.scratch`). History still holds the values; rewriting history is out of scope and is reported to the owner. |
| **T12 Docs housekeeping** | `findings/logic/probe_findings.md`, `docs/plans/**`, `docs/phase-5/**`, `tasks/**`, `fix-7.md`, `docs/specs/**/status-2026-10-23.md`, `docs/specs/**/review.md`, `probes/README.md` | Mark the old Pending table (`probe_findings.md:113-125`) superseded. Tick the 55 boxes of the 11-09 probe plan against commits through `686103c`. Mark Tasks 7a-7c of `11-01-…-reports-build.md` superseded by `p5-6_plan.md`; fix the dead `10-24-2026-generator-behavior-harness.md` reference. Repoint the 2 real `phasse5plan.md` links to git history. Move archive candidates (`tasks/todo.md`, `tasks/lessons.md`, `status-2026-10-23.md`, `fix-7.md`, spec `review.md`, the six finished 11-01 phase-5 drafts) into `docs/archive/`; keep `reports-build` and `release-proof` in place. Does not touch `spec.md`. |

**Wave 1 gate:** merge all twelve, then `npm run typecheck && npm run lint && npm test && npm run build && npm run build:beta && npm run verify:release`.

## Wave 2: parallel, after Wave 1 is merged

| Task | Owns | Work |
|---|---|---|
| **T13 Architecture moves** (one executor, serial steps, behaviour-preserving; full gates between steps) | The moved modules and their importers | Step 0, Opus read-only design: produce the move map for what features consume from `@/app`. Constraint: `features/**` must end with zero imports from `@/app/**`; `app` importing features stays (composition root). Then: (1) `StarterDerived`, `StarterPackageInput`, `StarterState`, `StarterAction` → `src/types/starter.ts` (~16 files), fixing `services → app`. (2) `components/checkStatusBadge.ts` → `features/inspector/` (4 files). (3) Context objects and consumer hooks (`HostContext`, `useNotify`, `useView`, `useStarterSession`, `useInspector`, `useConnectionState`, `inspectorSession.types`) move to the location the design names; providers stay in `app/`. (4) `CopyButton` → `components/` (5 files). If the design needs a new top-level folder, add one line to `.claude/rules/project-structure.md`. Verify with a search that `features/**` has no `@/app` imports. |
| **T14 Test environment** | `vite.config.ts` | Default `environment: 'node'`; add `// @vitest-environment jsdom` to the `.tsx` and DOM-using `.ts` tests that lack a pragma (about 14). Remove the misplaced `publicDir` under `build`. Report suite time before and after. No `isolate: false`. Runs after T13 merges if both touch the same test file headers. |
| **T15 Inspector user docs** | `README.md`, `docs/usage-manual.md`, `docs/build-manual.md` | README: Inspector bullet, doc table, connection requirement. Usage manual: "Use Logic Inspector" section between "Use Server Objects" and "Manage your session", plus contents entry. Build manual: three pages, the `build` vs `build:beta` vs `verify:release` distinction, fix `:145` (validate is installed), `:178` (no shrinkwrap file), `:170` (no reference link exists), `:210`. State plainly that the Inspector is unreleased in the beta build. `package.json` version and description are unchanged until the Inspector release. |
| **T16 Live site probes** (needs the owner at the PPTB host; writes to the Dev site) | `probes/live/**`, `scripts/probe-evidence.mjs`, `findings/logic/probe_findings.md` | Uses the `pptb-live-probe` skill. Before deploying anything, the orchestrator shows the owner the exact handlers and records to be written and waits for a go. Probes: (1) R4 `post` with an extra column and an `@odata.bind` key, before and after T10. (2) R7/R9 with a missing site setting: does `Get` throw or return null. (3) N5: deployed R1, R4, R7 goldens exercising top-level `const x = () =>` and `.map(row => …)`. Record redacted rows in `probe_findings.md`. If N5 shows HTTP 400, open a follow-up task to rewrite generators to function declarations; otherwise FR-3 line 523 stands. Clean up probe records afterwards. |

## Wave 3: spec reconciliation (one executor, owns `spec.md`)

Runs last so it records what actually landed. Version **4.4.0** (records new decisions), with a Change Log row that also covers the unlogged `90de5ef` edit.

- Header and line 1055: branch `review`, new HEAD, date, fresh test counts.
- FR-7 line 634: status is derived from PPTB message text (`hostErrors.ts`), recorded as a host contract observed on PPTB 1.2.8 fork `89028ff`, with the fallback behaviour if wording changes. Lines 633 and 1214: flag flipped, citing `probe_findings.md:139` and its caveat (tool-to-host comparison plus fork unit test, no Network-panel capture).
- S2 lines 948, 952, 1066: closed for the listed rows with caveats (fork build, injected network loss and expiry, fake 50-record data). Rows 1064 and 1067: "measured with an intercepted save on the fork; native save-confirm to toast not measured".
- Resolved list: `2026-11-10 (owner): secret environment variable not covered`; the 2026-11-11 answers above.
- Fix 7 stale clauses: AC-2.4 (156), AC-3.8 (183), Error Scenarios (922), FR-12 line 860.
- Deviation rows, per "Defaults" below; fixed rows marked `(resolved 2026-11-11)`.
- FR-1 line 389 reworded as conditional (no UI link exists; links live in the generated header comment and README).
- Release rows: validate passes with `--skip-url-checks`; publish guard exists; bundle budget number; Inspector still unreleased.

## Wave 4: independent verification (parallel, read-only, Opus 5.5 medium)

- `oh-my-claudecode:code-reviewer` over `686103c..HEAD`: rule compliance, N1-N4 fixes against spec lines 293, 296, 372, 658.
- `oh-my-claudecode:verifier`: re-run every gate, search changed files for `TODO`, `.skip`, `.only`, `any`, `as ` casts and `eslint-disable`; confirm each goodreview item is fixed, defaulted, or listed as deferred.
- Orchestrator fixes or re-delegates findings, then reports with gate output.

## Defaults (each open to veto)

| Item | Default | Task |
|---|---|---|
| N3 trigger | Any `connection-changed` during a scan abandons it; a mid-scan rename costs one rescan | T4 |
| N4 | Honest post-build notice now; chunked or off-thread PDF build deferred until the 5.6 s is profiled (blob workers are CSP-blocked) | T5 |
| AC-9.8 | No "cancelled" toast once the save dialog is open | T5 |
| File cap | Stays 128 MiB | T3 |
| R4 body | Drop keys containing `@`; no column allowlist | T10 |
| `SiteSetting.Get` | Inside `try` now, probe anyway | T10, T16 |
| N5 | Probe first, rewrite only on a live 400 | T16 |
| FR-1 links | Delete `ExternalLink`; keep the adapter method | T9 |
| Default build | Unchanged; `prepack` and `verify:release` guard a publish | T8 |
| Bundle budget | Wave 0 gzip size plus 10 % | T8 |
| Version, description | Unchanged until the Inspector release | T15 |
| Message-text classification | Accepted as a recorded host contract | Wave 3 |
| S2 | Closed with caveats written into the spec | Wave 3 |
| Rows 1080, 1081, 1094, 1102 | Fixed in code | T6, T2, T5 |
| Rows 1078, 1079, 1082-1084 (pill filter model, R8 helper, AC-4.7 wording, AC-5.3 info button, AC-5.5 tick) | Spec amended to match the code | Wave 3 |
| Rows 1085-1093, 1095-1100, 1103-1105 | Recorded as accepted deviations dated 2026-11-11; no code change | Wave 3 |

## Deferred, not in this plan

- AC-4.12 behaviour matrix (Phase 17, 18 boxes) and P5.8 release proof (Task 9a build gates, evidence ledger, RG-005, packed smoke).
- Human-only: screen-reader pass, three-maker walkthrough, real network drop and token expiry, native save-dialog timing, upstreaming the dialog-parent fix (`tasks/upstream-dialog-parent-fix.md`).
- Publishing the repo and README on `main` so `pptb-validate` passes without `--skip-url-checks`.
- Items the review did not carry over from `tasks/code-review.md` (PR-004, PR-006, PR-007, IN-001, IN-004, IN-005) and `ppreview.md` (IN-001, IN-003, IN-004, IN-006, IN-008); `logo.svg` fixed colours; `new-recipes.md` R11-R15.
- Git history rewrite for the dev-org captures.

## Verification

1. After each wave: `npm run typecheck`, `npm run lint`, `npm test`, all with zero warnings and failures.
2. After Wave 1: `npm run build`, `npm run build:beta`, `npm run verify:release` (budget and tarball listing pass; no Inspector assets in the beta tarball).
3. After Wave 2: search proves `src/features/**` has no `@/app` import and `src/services/**` none either; `npm run probe:live` (basic, host) and `npm run probe:live:connected` against the fork host, with the owner signed in, all groups passing; T16 rows present in `probe_findings.md`.
4. CI: push is out of scope, so validate `ci.yml` by running its steps locally in order from a clean `npm ci`.
5. Final: Wave 4 reviewer and verifier reports attached to the completion summary, with any item not done named explicitly.
