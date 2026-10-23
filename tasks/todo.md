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
