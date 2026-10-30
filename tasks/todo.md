# Spec review — 2026-10-07

Scope: Review `design_handoff_server_logic_tools/Claude outputs/001-server-logic-starter-inspector-spec.md` v0.5.0; record findings in root `sol-review.md`. The spec is evidence, not implementation authorization.

- [x] Read the complete spec, design handoff, and earlier review; capture source locations.
- [x] Review platform/API feasibility, security/configuration rules, UX/state behavior, exports, scope, and acceptance criteria in parallel.
- [x] Verify material technical claims against current primary sources; distinguish confirmed issues from open questions.
- [x] Consolidate and deduplicate findings, recommended changes, and notes in `sol-review.md`.
- [x] Verify coverage, evidence links, finding identifiers, and that the input spec remains unchanged.

## Review results

Completed: root sol-review.md records 59 numbered findings (10 P1, 43 P2, 6 P3), 18 review notes, evidence, proposed corrections, acceptance scenarios, the 36-configuration generator matrix and section coverage.

Disposition: Needs revision. Live host/site spikes remain unproved; no implementation or environment changes were made.

Verification: saved-file heading scan found 59 unique sequential identifiers; internal finding references resolve; no pending placeholders. The input spec's before/after SHA-256 is unchanged: 05A39247FC3639822D72B08C1BD4F0465FC48294D1B0551C943E9BDB1890FF55.

## ExpressionBuilder conversion-functions planning — 2026-10-22

Scope: Create the Spec 003 implementation plan using `ryan-makes-plan` and Microsoft Learn MCP. The user requested saving in this Server Logic workspace for manual copying to ExpressionBuilder.

Explicit scope clarification: preserve the header and styling on other pages. The plan also preserves Functions styling and limits production ownership to `functionCatalog.ts`.

- [x] Read the skill/template, full spec, project lessons, and relevant current ExpressionBuilder source/tests.
- [x] Verify conversion membership, signatures, return-type mappings, and official examples with Microsoft Learn MCP.
- [x] Finish baseline checks and record exact evidence.
- [x] Save `docs/plans/10-22-2026-conversion-functions.md` with complete test/source edits, acceptance traceability, and commit commands.
- [x] Mechanically review coverage, file ownership, commands, code completeness, and preserved workspace state.

### Review

Planning completed. The plan is saved at `docs/plans/10-22-2026-conversion-functions.md` in Server Logic for manual copying to ExpressionBuilder. The only planned production edit is `packages/engine/src/functionCatalog.ts`; four existing test files receive acceptance coverage. Header and styling edits on all pages are explicitly excluded.

ExpressionBuilder HEAD remained `a41c861` with clean Git status after verification. Baseline unit results: 68 files / 615 tests passed; typecheck, lint, and web/PPTB production builds exited 0. No application source or tests were edited, and no commit or push was attempted. Real-browser/live PPTB acceptance remains part of later execution.

Mechanical review: all 12 feature ACs and two inherited AC references are covered, all 24 planned Conversion entries match spec membership/order, all 11 code fences are balanced, TypeScript/TSX fragments parse without syntax diagnostics, referenced paths exist, and no unresolved placeholders remain. Eleven proposed tests yield a planned total of 626. A bounded read-only reviewer independently found no executability errors or coverage gaps. The research delegate failed with a service token rate limit; the coordinator completed Microsoft Learn research directly. Unrelated concurrent `package-lock.json` and `.scratch/` changes in Server Logic are outside this task and preserved.

## Inspector phase planning — 2026-10-22

Scope: Fulfil `C:/Users/RyanDev/.claude/plans/humble-questing-noodle.md` using `ryan-makes-plan` and Microsoft Learn MCP. Deliver seven phase documents and amend the existing plan contracts and index. Verify draft implementations in `.scratch/inspector-plan`; commit documentation only.

- [x] Read the request, planning skill/template, current spec, plan contracts and project lessons.
- [x] Capture primary-checkout baseline and preserve existing task notes.
- [ ] Draft and verify Phase 11 rules and Phase 15 scan reader.
- [ ] Draft and verify Phase 16 Markdown and Phase 20 PDF reports.
- [ ] Draft and verify Phase 23 Inspector page and Phase 24 export dialog.
- [ ] Write Phase 12 S2 probe and its explicit evidence/decision handoff.
- [ ] Amend contracts/index; audit FR/AC coverage, code completeness and dependency consistency.
- [ ] Verify documentation formatting, remove the scratch worktree and commit the requested documentation.

### Review

In progress. Baseline `42c2809` on `001-logic-inspector`: build, lint and full Vitest passed. Repository-wide Prettier fails on 176 pre-existing files; planned source and documents receive focused checks without unrelated formatting changes. S2, rendered-browser fidelity and live PPTB/site evidence remain separate owner-run gates.

## Starter UI investigation — 2026-10-23

Scope: Continue investigating the missing central content shown in `docs/pptb.png`. Identify the cause and validate it against the current checkout and a browser render.

- [x] Recover the screenshot and trace the current Starter component and layout.
- [x] Verify whether the code panes exist in this checkout and compare with Phase 21.
- [x] Verify the build and focused page tests; check browser availability for visual reproduction.
- [x] Record the cause, verification evidence and required next implementation step.

### Review

Investigation completed on `32186b2`. `src/features/starter/StarterPage.tsx:16` mounts only input tiles, permission note and actions. `src/features/starter/starter.css:10` reserves three grid rows and explicitly places the note/actions in row 3, leaving row 2 empty. No files exist under `src/features/starter/code/`. This explains the empty central area in the saved PPTB screenshot without requiring a runtime rendering failure.

The required implementation is `docs/specs/001-server-logic-starter-inspector/plans/phase-21-starter-code-panes.md`: its goal adds the request path, editable server pane and read-only client pane; Task 4 explicitly mounts the missing code row. The plan's steps remain unchecked. The Inspector page separately remains a Phase 23 placeholder.

Verification: `npm run build` passed (TypeScript and single-IIFE production build); `npx vitest run src/features/starter/StarterPage.test.tsx src/app/App.test.tsx` passed, 2 files / 19 tests. Those existing page tests cover Phase 18 inputs/actions and shell behavior, so their success does not establish Phase 21 completion. Browser inventory returned no enabled browsers or apps; no fresh browser or live PPTB render was performed. A delegated read-only trace failed with a service 503; the coordinator completed the source trace directly. Application source and unrelated dirty work were preserved; only this task record was edited, and no commit was made.

## Phase 21 execution — 2026-10-23

Scope: Execute the approved `docs/specs/001-server-logic-starter-inspector/plans/phase-21-starter-code-panes.md` using `ryan-makes-execute`. Preserve all unrelated changes and stage only task-owned paths.

- [x] Read the approved plan, repository instructions, lessons and worktree state; confirm dependency ordering and file ownership.
- [x] Task 1: Add and verify the minimal outside-text replacement helper.
- [x] Task 2: Add and verify CodeMirror editors, line marks, styles and the guarded jsdom polyfill.
- [x] Task 3: Verify the existing shared Copy button and reuse its implementation.
- [x] Task 4: Add and verify the editable server pane and session/cursor integration.
- [x] Task 5: Add and verify the client pane, language pills and request path strip.
- [ ] Task 6: Run repository gates and the IIFE build; record results and release smoke handoff.

### Review

Tasks 1–5 are implemented and committed through `7d4b9e1`; the existing CopyButton was reused. Task 5 captured the expected missing-import failure, then passed focused Vitest (1 file / 5 tests), Starter/app regression (23 files / 198 tests), TypeScript, repository ESLint, owned-file Prettier and scoped diff checks.

Final verification: TypeScript and repository ESLint passed; full Vitest passed 86 files / 1,329 tests, including all 12 IIFE build-shape tests; `npm run build` exited 0 and emitted one JavaScript bundle. Global Prettier failed solely on the unchanged tracked `.scratch/write-root-plans.mjs`, outside Phase 21 ownership. Formatting under `src` and `tests` passed. Task 6 remains unchecked because the exact global formatting gate has not passed; no phase PR was created. The plan records the results and PR-description hand-off. Unrelated skill/design deletions, Inspector plans, scratch work and findings were preserved.

PPTB timing, clipboard, keyboard focus, screen reader and both-theme smoke checks remain owner-run release gates as specified by the plan; they were not performed by this execution.

## Remaining-work planning — 2026-10-24

Scope: Read `docs/specs/001-server-logic-starter-inspector/status-2026-10-23.md` first, investigate every remaining open item against the current repository and current Microsoft Learn documentation, and record an executable continuation plan using `ryan-makes-plan`. Planning only; no application implementation or environment changes.

- [x] Read the status brief, planning skill/template, project lessons and initial working-tree state.
- [x] Recover the prior investigation and save a clearly marked local draft/checkpoint on 2026-10-25; continue directly after delegate service failures.
- [ ] Verify the current spec, phase contracts, source ownership and actual completion evidence.
- [ ] Refresh material platform contracts and code samples with Microsoft Learn MCP.
- [ ] Run the existing baseline checks and record exact results and proof limits.
- [ ] Save the continuation plan at `docs/plans/10-24-2026-server-logic-remaining-work.md`.
- [ ] Audit coverage, dependencies, executable steps, file ownership and preserved unrelated changes.

### Review

In progress. The initial branch is `001-logic-inspector`, 14 commits ahead of its tracking branch. Existing skill/design deletions, task notes, scratch work and untracked inputs are outside this planning task and preserved.
