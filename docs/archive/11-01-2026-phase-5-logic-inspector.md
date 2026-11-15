# Complete Logic Inspector Implementation Plan

**Goal:** Connect in PPTB, select an enhanced-model site, scan actual configuration and handler text, review eligible findings, and export the captured review as Markdown or PDF.

**Architecture:** `src/services/pptb/` owns validated host operations, error provenance, paging and file retrieval; Inspector scan/model/report modules own domain facts, evidence interpretation and presentation-ready reports. An app-scoped Inspector session receives scan/evaluation dependencies from app composition and owns selection, cancellation, facts and review marks across tabs; export owns a separate immutable capture and save lifecycle. Each contract and implementation is defined once in its owning task below.

**Tech stack:** Existing React 19, strict TypeScript, Vite 8, Vitest/Testing Library, PPTB adapter and `@pptb/types`, shared Graphite components, Acorn analysis, jsPDF 4.2.1 and jspdf-autotable 5.0.8, locally bundled fonts and PowerShell.

**Scope:** The eight outcomes and P5.1–P5.8 requirements in the owner's delivery brief (`phasse5plan.md`, deleted from the tree; see `git show 686103c:phasse5plan.md`). Task 1 reconciles its policy decisions with [spec 4.0.1](../specs/001-server-logic-starter-inspector/spec.md); subsequent tasks implement the amended spec. Historical Phase 05 still means Starter domain.

**Out of scope:** Inline editing, handler upload/deployment, bulk remediation, runtime execution/debugging, standard-model sites, tenant-policy evaluation, persisted scan history and publication.

---

## Execution status

**Planning complete; execution has not started.** The linked task documents were reconciled against the planning checkout and their proposed code was verified through source overlays. That evidence does not close the live, rendered or final-artifact gates assigned below.

This entry point and its linked task documents form one plan. The task documents contain the required five-step execution sequence, complete new-file contents, anchored existing-file edits, exact commands/expected results and scoped commits. Read the owning task rather than copying its contracts into another document.

**Final planning review — 2026-11-01:** eight documents, ten owning tasks and sixteen five-step execution slices. Coverage, ownership, dependencies, destination-relative documentation snippets and plan links were reconciled. The [baseline evidence](11-01-2026-phase-5-baseline.md#final-planning-handoff) records structural checks and the final combined source-overlay verification.

## Grounded baseline and prerequisites

- Branch: `starter-objexts-prep`; HEAD at planning start: `6c0bdd5afbcf80a7c09ace02a1fd3132e2842169`.
- [Fresh baseline evidence](11-01-2026-phase-5-baseline.md) records commands, failures, later passing builds, documentation sources and model authorization. Its observations supersede the delivery brief's statement that no planning checks ran.
- The repository contains existing staged/unstaged work, and Starter edits changed during planning. Before execution, establish an agreed committed baseline containing intended owner changes. Preserve and reconcile existing work; do not apply these plan edits blindly over it. Commit commands assume that reconciliation is complete and contain no authorization to publish.
- Current icon ownership is resolved by spec **4.0.1**: `public/icons/logo.svg` → packaged `icons/logo.svg`. Do not repeat the obsolete rename task.
- At the later planning checkpoint, typecheck and both builds pass. Lint is blocked by the external `.scratch/fix7-host-probe-entry.ts` project-service error; the full audit reports two moderate package entries; online validator URL checks fail. Their current outcomes must be re-established before integration. No Inspector assertion is weakened to accommodate a baseline failure.
- Probe observations, proposed code, existing scratch implementations and historical green tests are distinct evidence classes. No live gate is closed by this plan's existence.

## Task ownership and delivery order

| Task | Owning plan section | Delivery brief | Depends on | Exclusive responsibility |
|---|---|---|---|---|
| 1 | [Requirements](11-01-2026-phase-5-policy.md#task-1-replace-the-blanket-api-restriction-with-the-phase-5-evidence-contract) | P5.1 | Baseline | Amend spec/rules and supersede conflicting execution instructions. |
| 2 | [S2 continuation](11-01-2026-phase-5-transport-reader.md) | P5.1 | 1 | Executable populated-file and host-evidence probe; Phase 12 evidence. |
| 3 | [Host transport](11-01-2026-phase-5-transport-reader.md) | P5.2 | 1 | File actions, retry/cancellation, sanitized provenance, partial rows and adapter/fake contracts. |
| 4 | [Evidence rules](11-01-2026-phase-5-rules.md) | P5.3 | 1 | Finding evidence contract, grant traversal, reason precedence, review rules and snapshot ownership. |
| 5 | [Site reader](11-01-2026-phase-5-transport-reader.md) | P5.4 | 3, 4 | Query/parse/envvar/download orchestration, bounded work, progress and scan identity. |
| 6 | [Session and page](11-01-2026-phase-5-session-export.md) | P5.5 | 5 | Confirmed connection lifecycle, app session, picker and finished Graphite inspection/review UI. |
| 7 | [Reports and PDF](../plans/11-01-2026-phase-5-reports-build.md) | P5.6 | 4 | Shared report inclusion/redaction, fonts and real vector PDF. |
| 8 | [Export lifecycle](11-01-2026-phase-5-session-export.md) | P5.7 | 6, 7 | Dialog-open capture, options, handoff validity, save outcomes and retry. |
| 9 | [Build completion gates](../plans/11-01-2026-phase-5-reports-build.md) | P5.8 | 8 | Behavioral completion and explicit inclusion/exclusion/package checks. |
| 10 | [Documentation and release proof](../plans/11-01-2026-phase-5-release-proof.md) | P5.8 | 2, 9 | Manuals/screenshots, final artifacts and required local/rendered/live evidence. |

```text
1 → 2 (live observations may remain pending during local implementation)
1 → 3 ─┐
1 → 4 ─┴→ 5 → 6 ─┐
    4 ───────→ 7 ─┴→ 8 → 9 → 10
2 (required live results) ─────────→ 10
```

Task 7 does not wait for the reader. Tasks 3 and 4 have disjoint ownership after Task 1 pins scope; Tasks 5 and 7 may proceed independently after their prerequisites. Task 4 owns its report-fixture type updates before Task 7 starts. The page's placeholder-marker change belongs to Task 6; Task 9 extends its build tests afterward. Shared source edits and build/output-directory checks are sequenced, even when independent analysis or drafting is parallelized.

Each slice must type-check and pass its focused regression gate before a dependent slice integrates. The final full suite runs after integration; repeat broader checks only for new changes or unresolved failures. Task 2's pending live evidence does not prevent contract-fixture development, but all required live results prevent release completion until closed.

## Authoritative contracts

| Contract | Single owner |
|---|---|
| Product scope, evidence matrix, review eligibility policy | Task 1 → spec FR-7/FR-8/FR-9 and AC-8.5. |
| Host method signatures, file target descriptor, provenance and cancellation | Task 3 → `src/services/pptb/host.types.ts`. |
| Byte protocol and validation | Task 3 → `src/services/pptb/dataverseFiles.ts`; raw actions injected by `pptbHost.ts`. |
| `Finding.hasUnscannedEvidence`, original reasons and optional snapshot separation | Task 4 → `src/types/inspector.ts`, model constructors and `canReviewFinding`. |
| Scan options and any necessary evidence-provenance additions | Task 5 → scan/types declaration at its implementation step. |
| Retained facts after failed final identity confirmation | Task 5 → `ScanConfirmationError` and `confirmScanIdentity`; Task 6 consumes them through injected dependencies. |
| App session state and injected dependencies | Task 6 → `src/app/inspector-site/`; shell consumes app context only. |
| Shared display-ready report, metadata and filenames | Task 7 → existing report model/build/filename owners. |
| Immutable report capture and idle/building/saving lifecycle | Task 8 → export controller/dialog; no mirrored saving state in session/page. |
| Final release evidence | Task 10 → `findings/logic/phase5-release-evidence.md`, referencing Phase 12 wire observations. |

Task 3's cancellation checks stop new logical requests without claiming to cancel already-dispatched host promises. Task 6 drains superseded scan work before dispatching its replacement or a connection-driven site-list reload, preserving the four-request budget across generations. A failed final identity refresh retains facts in `ScanConfirmationError`; the session retries confirmation without downloading the files again and keeps export unavailable until those facts are accepted. A confirmed different identity or null discards the pending candidate.

## Coverage and audit closure

Every row below identifies implementation ownership and the final observable closure. Detailed fixtures are defined once in the linked owning task.

| Requirement or audit item | Owner | Closure evidence |
|---|---|---|
| Outcome 1; CR-002 file transport; RG-003 | 2, 3, 5 | Populated real handler byte/text comparison; actual text reaches connector/function analysis. |
| Outcome 2; CR-001/CR-002 | 5, 6 | Production query/parse/page path, inventory and every specified empty/error/retry/progress state. |
| Outcome 3; WR-003/WR-004/WR-005 | 3, 5, 6 | Partial rows/evidence retained; confirmed-identity invalidation and stale-work rejection while hidden. |
| Outcome 4; PB-001/PB-002 | 1, 4, 6 | Mixed-evidence and ancestor fixtures, canonical review guard, counts/undo and all 64 output combinations. |
| Outcome 5; CR-003/CR-004/WR-001/WR-002 | 4, 7, 8 | Both scopes/formats and all include/redact combinations preserve original reasons, snapshots and provenance; actual save outcomes verified. |
| Outcome 6; RG-005 | 6, 8, 10 | Graphite rendered controls, desktop viewports/zoom, keyboard/screen-reader route and selectable PDF text. |
| Outcome 7; IN-001/RG-006 build half | 6, 8, 9 | Reachable completed journey in included builds; provider/picker/scan/rules/PDF removed from excluded builds. |
| Outcome 8; RG-001–RG-006 | 2, 10 | Dated local/rendered/live observations for the final intended artifact. |
| WR-006 | 4 | Wildcard reasons survive O2 intersections; O0/O1 priority and non-reviewable failures preserved. |
| PR-001 | 4 | One grant-set evaluation reused per file, with existing grant/status outputs preserved. |
| RG-001 | 2, 3, 10 | Verified paging/encoded literal/terminal-page behavior before relaxing the guard. |
| RG-002 | 2, 3, 6, 10 | Actual event/unsubscribe/error shapes plus identity-preserving refresh recovery. |
| RG-004 | 5, 7, 8, 10 | Real 50-handler timing, request budget, two export timing budgets and captured-output parity. |
| RG-006 publication half | 9, 10 | Final IIFE/assets/icon/package inspection, Desktop local load, offline and online validation. |
| Continuation F05/F07/F08 | 3, 5, 6, 8 | Failed code affects Table permissions and Outbound only; dependency-ordered page/export wiring; every save outcome settles. |
| FR-12 later-release dependency | 10 | Generator-behavior-harness plan (file removed in `820d7b8`; see `git show 820d7b8^:docs/plans/10-24-2026-generator-behavior-harness.md`) closes AC-4.12 when the v1.0.0-only exception no longer applies. |

## Completion and stop condition

Complete feature work only when all eight delivery outcomes and mapped audit closures have passing evidence, required RG-001–RG-006 live gates are closed, and the intended package contains the completed Inspector journey. Keep exact failed/unavailable gates open with their next evidence/change; a universal unreadable-code fallback, unsupported PDF glyph, unresolved host response, publication dependency or unmeasured budget is not a completion claim.

Source/static checks, automated tests/builds, rendered-browser checks and live PPTB/Dataverse observations remain separate in the evidence ledger. A fake host proves UI behavior; it cannot prove real action response shapes, permissions or native save timing. Publication follows the existing release process after the owner's confirmation.
