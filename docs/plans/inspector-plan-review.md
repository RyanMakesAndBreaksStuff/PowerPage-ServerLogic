# Complete Logic Inspector Implementation Plan

> **Review copy, 2026-11-01.** This is a verbatim copy of [`11-01-2026-phase-5-logic-inspector.md`](11-01-2026-phase-5-logic-inspector.md). Review callouts (`> **Review:**`) are inserted in place, and the findings are in [Plan review: baseline and Tasks 1–3](#plan-review-baseline-and-tasks-13) at the end. **Scope:** baseline prerequisites and Tasks 1–3 only; Tasks 4–10 were not reviewed. **Verdict:** not ready to execute as written. There is 1 blocker and 6 high findings. Two owner decisions are needed first: X-01 (the deleted `findings/logic/probe_findings.md`) and X-02 (the red lint gate).

**Goal:** Connect in PPTB, select an enhanced-model site, scan actual configuration and handler text, review eligible findings, and export the captured review as Markdown or PDF.

**Architecture:** `src/services/pptb/` owns validated host operations, error provenance, paging and file retrieval; Inspector scan/model/report modules own domain facts, evidence interpretation and presentation-ready reports. An app-scoped Inspector session receives scan/evaluation dependencies from app composition and owns selection, cancellation, facts and review marks across tabs; export owns a separate immutable capture and save lifecycle. Each contract and implementation is defined once in its owning task below.

**Tech stack:** Existing React 19, strict TypeScript, Vite 8, Vitest/Testing Library, PPTB adapter and `@pptb/types`, shared Graphite components, Acorn analysis, jsPDF 4.2.1 and jspdf-autotable 5.0.8, locally bundled fonts and PowerShell.

**Scope:** The eight outcomes and P5.1–P5.8 requirements in the owner's [delivery brief](../../phasse5plan.md). Task 1 reconciles its policy decisions with [spec 4.0.1](../specs/001-server-logic-starter-inspector/spec.md); subsequent tasks implement the amended spec. Historical Phase 05 still means Starter domain.

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

> **Review:** These bullets are stale.
> - The checkout is `logic-inspector-v2-build` at `820d7b8`, 13 commits after `6c0bdd5`. The "existing work" has been committed (`1c9bdf6`, `820d7b8`).
> - Spec 4.0.1 landed in `1c9bdf6`, not at `6c0bdd5`.
> - `820d7b8` deleted `findings/logic/probe_findings.md`, which Task 2 modifies (X-01).
> - Lint now fails with 98 errors, not one (X-02).
> - Typecheck passes, and `npx vitest run` passes 91 files and 1,402 tests.
>
> See X-01 to X-04.

## Task ownership and delivery order

| Task | Owning plan section | Delivery brief | Depends on | Exclusive responsibility |
|---|---|---|---|---|
| 1 | [Requirements](11-01-2026-phase-5-policy.md#task-1-replace-the-blanket-api-restriction-with-the-phase-5-evidence-contract) | P5.1 | Baseline | Amend spec/rules and supersede conflicting execution instructions. |
| 2 | [S2 continuation](11-01-2026-phase-5-transport-reader.md) | P5.1 | 1 | Executable populated-file and host-evidence probe; Phase 12 evidence. |
| 3 | [Host transport](11-01-2026-phase-5-transport-reader.md) | P5.2 | 1 | File actions, retry/cancellation, sanitized provenance, partial rows and adapter/fake contracts. |
| 4 | [Evidence rules](11-01-2026-phase-5-rules.md) | P5.3 | 1 | Finding evidence contract, grant traversal, reason precedence, review rules and snapshot ownership. |
| 5 | [Site reader](11-01-2026-phase-5-transport-reader.md) | P5.4 | 3, 4 | Query/parse/envvar/download orchestration, bounded work, progress and scan identity. |
| 6 | [Session and page](11-01-2026-phase-5-session-export.md) | P5.5 | 5 | Confirmed connection lifecycle, app session, picker and finished Graphite inspection/review UI. |
| 7 | [Reports and PDF](11-01-2026-phase-5-reports-build.md) | P5.6 | 4 | Shared report inclusion/redaction, fonts and real vector PDF. |
| 8 | [Export lifecycle](11-01-2026-phase-5-session-export.md) | P5.7 | 6, 7 | Dialog-open capture, options, handoff validity, save outcomes and retry. |
| 9 | [Build completion gates](11-01-2026-phase-5-reports-build.md) | P5.8 | 8 | Behavioral completion and explicit inclusion/exclusion/package checks. |
| 10 | [Documentation and release proof](11-01-2026-phase-5-release-proof.md) | P5.8 | 2, 9 | Manuals/screenshots, final artifacts and required local/rendered/live evidence. |

```text
1 → 2 (live observations may remain pending during local implementation)
1 → 3 ─┐
1 → 4 ─┴→ 5 → 6 ─┐
    4 ───────→ 7 ─┴→ 8 → 9 → 10
2 (required live results) ─────────→ 10
```

> **Review:** Three ordering points affect Tasks 1–3.
> - Task 2 cannot complete Step 3 or Step 5 until X-01 is resolved.
> - Task 3 depends on Task 1 having *landed*, not just being planned, because the current rule still bans `execute` (T3-11).
> - Neither Task 2 nor Task 3 can show a green lint gate until X-02 is resolved.
>
> Tasks 2 and 3 do not share files, and neither uses the other's output.

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
| FR-12 later-release dependency | 10 | Existing generator-behavior-harness plan closes AC-4.12 when the v1.0.0-only exception no longer applies. |

> **Review (outside Tasks 1–3):** `docs/plans/10-24-2026-generator-behavior-harness.md` was deleted in `820d7b8`. The FR-12 row above still cites it, and so do `11-01-2026-phase-5-release-proof.md:43` and `:281`. See the outside-scope notes at the end.

## Completion and stop condition

Complete feature work only when all eight delivery outcomes and mapped audit closures have passing evidence, required RG-001–RG-006 live gates are closed, and the intended package contains the completed Inspector journey. Keep exact failed/unavailable gates open with their next evidence/change; a universal unreadable-code fallback, unsupported PDF glyph, unresolved host response, publication dependency or unmeasured budget is not a completion claim.

Source/static checks, automated tests/builds, rendered-browser checks and live PPTB/Dataverse observations remain separate in the evidence ledger. A fake host proves UI behavior; it cannot prove real action response shapes, permissions or native save timing. Publication follows the existing release process after the owner's confirmation.

---

## Plan review: baseline and Tasks 1–3

**Reviewed:** 2026-11-01, against `logic-inspector-v2-build` at `820d7b8` with a clean tree.

**Method:**
- Four Sonnet sub-agents worked at medium effort and read only. Their scopes were Task 1, Task 2, Task 3, and baseline drift.
- They checked Dataverse facts against Microsoft Learn:
  - [Use file column data](https://learn.microsoft.com/power-apps/developer/data-platform/file-column-data)
  - [Service protection API limits](https://learn.microsoft.com/power-apps/developer/data-platform/api-limits)
  - The `powerpagecomponent` table reference
- The lead reviewer re-checked these findings directly against the repo: X-01, X-02, T1-01, T1-02, T1-03, T1-05, T2-03 and T3-01.

**Commands the sub-agents ran:**

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npx vitest run` | 91 files, 1,402 tests pass |
| `npm run lint` | 98 errors, all `.scratch/` project-service errors |
| `npx vitest run src/services/pptb src/types/contracts.test.ts` | 129 tests pass |

**Severity:**
- **Blocker:** execution fails, or produces wrong or unsafe behaviour.
- **High:** likely rework, or an incorrect contract.
- **Medium:** a gap or an ambiguity.
- **Low:** a nit.

| Area | Blocker | High | Medium | Low |
|---|---|---|---|---|
| Baseline / cross-cutting | 1 | 1 | 1 | 1 |
| Task 1 (policy) | 0 | 2 | 7 | 3 |
| Task 2 (S2 probe) | (X-01) | 2 | 3 | 3 |
| Task 3 (host transport) | 0 | 1 | 5 | 7 |

### Owner decisions required before execution

1. **X-01:** Decide whether the `820d7b8` deletions were intended. If not, restore them. If they were, retarget Task 2 and the brief's evidence file.
2. **X-02:** Choose how to make lint runnable. You can add `.scratch` to ESLint `globalIgnores` in a separate pre-execution commit, or clear the untracked scratch files.
3. **T1-01:** Choose between narrowing the read-only rule with a named two-action exception (recommended) and replacing it outright, as the plan does now.

### Baseline and cross-cutting

| ID | Sev | Location | Finding and evidence | Recommended fix |
|---|---|---|---|---|
| X-01 | **Blocker** | Entry "Grounded baseline"; Task 2 `transport-reader.md:42`, `:516-541`, `:565-566`; brief `phasse5plan.md:63`, `:312` | `findings/logic/probe_findings.md` was deleted in `820d7b8`, which the commit message describes only as "Document beta readiness and lock updates". `findings/` now has no tracked files. The same commit deleted 14 other files, including `findings/2026-11-01-starter-objects-review.md`, 4 `docs/plans/10-2x-*` plans and `docs/git-convention.md`. Task 2's Step 3 patch has no target, and Step 5's `git add` fails with a pathspec error. The brief's required append and the RG-001/RG-002 evidence record have no home. Task 10's `findings/logic/phase5-release-evidence.md` also assumes the directory exists. | Confirm the intent. If the deletion was unintended, restore it with `git checkout 1c9bdf6 -- findings/ docs/plans/10-24-2026-*.md …` in its own commit before Task 1. If it was intended, change Task 2 to *Create* the file (seeded from `git show 1c9bdf6:findings/logic/probe_findings.md`) and update the brief and the Task 10 paths. The Task 2 anchor row `\| Network and expired sign-in not run \| …` is verbatim and unique in the old version. |
| X-02 | High | Entry "Grounded baseline" bullet on lint; all lint gates | `npm run lint` reports 98 errors, all "not found by the project service", all in `.scratch/`. `.gitignore:28` ignores `/.scratch`, but `eslint.config.ts:10-26` `globalIgnores` does not. The baseline records only `.scratch/fix7-host-probe-entry.ts`; planning added more scratch files, such as `.scratch/phase5-2026-11-01/ui-probe-tests/*`. No `--max-warnings=0` gate can go green. | Add `'.scratch'` to `globalIgnores` as a pre-execution commit (owner decision), then update the baseline bullet. |
| X-03 | Medium | Entry "Grounded baseline" bullets 1–3; `phase-5-baseline.md` | The branch, HEAD and "existing staged/unstaged work" are stale (see the review callout above). `6c0bdd5` is "docs(spec): 3.0.2 PATCH"; spec 4.0.1 was committed in `1c9bdf6`. `820d7b8` added about 17 lines of "Fix 7" addendum to `spec.md` and kept the version at 4.0.1, so Task 1's new 4.1.0 changelog row must be ordered after it. Task 1's text "these documents already contain owner changes" (`policy.md` ~L185) no longer applies. | Re-baseline to `logic-inspector-v2-build@820d7b8`, or whatever commit follows X-01 and X-02. Mark the committed-baseline prerequisite as met, and record the Fix 7 addendum in Task 1's changelog handling. |
| X-04 | Low | Execution hygiene | `.scratch/` is gitignored but still contains 2 *tracked* files: `.scratch/phase23-page.tsx.txt` and `.scratch/write-root-plans.mjs`. | If you clear scratch for X-02, remove only untracked files (`git clean` scoped), not the whole folder. |

### Task 1: policy (`11-01-2026-phase-5-policy.md`)

Spec 4.0.1 matches the plan's expectation. All quoted old-text anchors that the plan *does* provide exist verbatim and uniquely: spec L52, L286, L625, L739, L750, L860, the README §05 strings, the rule bullets L7/L13/L16, and the `plan-starter.md` anchors. The four-line pre-change signal still matches. The evidence matrix agrees with `phasse5plan.md` L73-80 and with AC-8.1, AC-8.10 and AC-8.11. Learn confirms that file content needs the `InitializeFileBlocksDownload` and `DownloadBlock` POST actions, because PPTB `queryData` is JSON-only and cannot return `$value` bytes. It also confirms that `powerpagecomponent` type 35 is Server Logic, with a `filecontent` file column of at most 131,072 KB, so the plan's choice of protocol is sound.

| ID | Sev | Location | Finding and evidence | Recommended fix |
|---|---|---|---|---|
| T1-01 | High | `policy.md:128-131` (rule diff); Non-Goals, FR-7 "Must not" and Security diffs (~L58-78) | **The rewrite removes the read-only invariant instead of narrowing it.** The replacement rule bullet drops the whole ✗ list: `create`/`update`/`delete`/`*Multiple`/`associate`/`disassociate`/schema/`deploySolution`/`publishCustomizations`, and `Post`/`Put`/`Patch`/`Delete` on `powerplatformAPI`. It substitutes "documented, typed, feature-owned host operations within the current spec's scope". The new FR-7 "Must not" is a scope statement ("…as prerequisites for this delivery"), and Security says "operation purpose, not HTTP verb… determines eligibility". The Non-Goals edit drops "Starter only produces downloads". Inspector needs exactly two named unbound actions. `dataverseAPI.execute` in `@pptb/types` 1.2.7 (`dataverseAPI.d.ts:496`) accepts any `operationName`, so only the policy text and the adapter stop a write. | Keep "Dataverse is read-only" and the ✗ list. Add one narrow exception: `execute` with `operationType: 'action'` and `operationName` exactly `InitializeFileBlocksDownload` or `DownloadBlock`, inside `src/services/pptb/` only. Keep "Starter only produces downloads". State that the adapter rejects any other operation name; Task 3 implements the check (see T3-10). |
| T1-02 | High | `policy.md:167` | The claim "No active mandatory Prettier gate remains in `plan-starter.md`" is **false**. `plan-starter.md:34` reads: "Every phase must pass `npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .` and `npx vitest run`." Prettier was dropped on 2026-10-27 (`tooling.md`), and Task 1 has no edit for this line. | Add an anchored replacement for L34 that uses `npm run typecheck`, `npm run lint` and `npm test`. Add a Step 4 check that `plan-starter.md` contains no `prettier --check`. |
| T1-03 | Medium | Task 1 Files/staging lists | **Supersession is incomplete.** These still state the blanket restriction or other stale instructions that Task 1 does not edit: <br>- `.claude/memory/foundation.md:18`: "Read-only, always." <br>- `.claude/memory/steering/conventions.md:18`: "read-only Dataverse access", pointing at the rewritten rule. <br>- `.claude/memory/steering/tech-stack.md:17`: "(read-only)". <br>- `plan-inspector.md:3`: "spec (v4.0.0…)". <br>- `plan-inspector.md:24`: "**Read-only:**…". <br>- `plan-inspector.md:59`, `plan-starter.md:395` and `plan-server-objects.md:48` still use `npx pptb-validate --skip-url-checks`, a flag the new rule says v1.0.5 ignores. `plan-server-objects.md` is not in Task 1 at all. <br>- `src/services/pptb/pptbHost.ts:125` comment: "Dataverse is read-only:". | If you adopt T1-01's narrowing, the memory and steering lines stay true and only need a pointer to the exception. Either way, add anchored edits for `plan-inspector.md` L3/L24/L59, `plan-server-objects.md` L48 and `plan-starter.md` L395 to Files, staging and commit. Leave the `pptbHost.ts` comment to Task 3 and note it there. |
| T1-04 | Medium | `policy.md:79`, `:102` and the related spec edits | **Several spec edits give no verbatim old text,** although the plan states it uses "anchored existing-file edits": <br>- "Replace the Server logic code row": spec L673. <br>- "Replace the S2 file-download bullet": ~L706. <br>- "FR-7's Parent-chain Unknown bullet": the string "Parent-chain" does not exist; the target is the `- **Unknown:** an ancestor can't be read…` sub-bullet at L652. <br>- "AC-8.5 and the FR-8 review prohibition": L311-312 ("The button is also not shown when **any**…") and L747. <br>- "FR-9 Outbound clarify": L766. | Quote the exact old text for each edit, as the other edits already do. |
| T1-05 | Medium | `policy.md:159-163` | The `plan-starter.md` contract-block deletion runs from `// src/services/pptb/host.types.ts` (L128) through `SiteResult` (L245-249). That range also removes **Starter's** pinned host contracts: `ThemeName`, `NoticeType`, `Notice`, `Connection`, `HostEvent`, `FileFilter`, `SaveResult`, and `PptbHost.getTheme`/`notify`/`copyText`/`saveFile`/`openExternal`/`onEvent`. The replacement bullet names `host.types.ts` only as owner of "host errors, paging, file target and cancellation". | Remove only the Inspector-affected declarations. Otherwise, reword the bullet to say that `src/services/pptb/host.types.ts` owns the *entire* host contract, Starter and Inspector. |
| T1-06 | Medium | FR-10 report-contract paragraph | **Scope creep and contradictions.** This is PDF design provenance, not P5.1 policy. It says "split an oversized logical entry into labelled continuation rows", but spec L787 still says "rows aren't split". It also cites `src/features/inspector/report/pdfDrawing.ts` and `src/assets/fonts/PDF-FONTS.md`, which do not exist until Tasks 7b and 7c. The palette hexes are correct. | Move the paragraph to Task 7, or merge it with L787-788 and say in the changelog that Task 7 creates the cited paths. |
| T1-07 | Medium | `policy.md:79` | The Site settings row changes to "without a restrictive prefix query", but neither the brief nor Task 1 gives a reason. FR-7 still describes reading `ServerLogic/` settings, so the spec becomes internally inconsistent. The change may come from Spike S4's leading-space names. | Cite the reason (for example, Spike S4 trimming) and update the FR-7 settings bullets to match, or drop the change. |
| T1-08 | Medium | Task 1 Steps 1, 2 and 4 | Verification checks only the 4 pre-change patterns, and Steps 1 and 2 run the identical command. Nothing checks: <br>- the 11 supersession banners <br>- `Version:** 4.1.0` <br>- that `Dataverse is read-only` is gone from the rule and `plan-starter.md` (or retained, per T1-01) <br>- the README §05 replacements <br>- the Prettier fix (T1-02) | Add one `Select-String` per change with an expected count. For example: `Execution superseded` = 11; README §05 remains only at the historical lines. |
| T1-09 | Medium | `policy.md` ~L175 vs `plan-inspector.md:15` | The "Resolved risk" replacement overwrites a paragraph that holds Learn-derived evidence (the `retrieve` behaviour and the `$value` headers) with two sentences. That contradicts the task's own instruction to "preserve historical observations". | Prepend a superseded marker and keep the paragraph. |
| T1-10 | Low | Spec 4.1.0 changelog row; rule edits | No owner decision is cited, although other rows and the rule file cite dated owner decisions. The brief gives the direction (`phasse5plan.md:55`). Also consider whether removing behaviour warrants MAJOR, as 1.0.0 did. | Add "Owner decision 2026-10-31 (phasse5plan.md)". |
| T1-11 | Low | Supersession banners | The banners are inserted at line 1, above each H1. | Insert them directly after the title. The banner links resolve correctly. |
| T1-12 | Low | Task 1 Step 1 | For this docs-only task, a `Select-String` signal replaces the "no code without a failing test" gate. That is reasonable but not stated. | Record the substitution explicitly. |

### Task 2: S2 probe (`11-01-2026-phase-5-transport-reader.md:34-570`)

What was checked and holds:
- **Host calls:** they match `@pptb/types` 1.2.7 and `pptbHost.ts:104`.
- **Protocol:** it matches Learn, covering the `Target` with `@odata.type`, `FileAttributeName`, `FileContinuationToken`/`FileSizeInBytes`/`IsChunkingSupported`, base64 `Data`, 4 MiB blocks, and full-size `BlockLength` when chunking is unsupported.
- **Paging:** it uses `Prefer: odata.maxpagesize` with `$orderby` and no `$top`.
- **Privacy:** only types, counts, booleans, `error.name` and status are recorded, and the test asserts that IDs, tokens, filenames, URLs and source text never appear.
- **Lint and bundle:** `scripts/` is lint-ignored and not imported by the bundle.
- **Dependencies:** none on Task 3 or Task 5.
- **Execution:** the five steps are present.

| ID | Sev | Location | Finding and evidence | Recommended fix |
|---|---|---|---|---|
| T2-01 | **Blocker** | `:42`, `:516-541`, `:565-566` | The evidence file does not exist (see X-01). | Resolve X-01 first. |
| T2-02 | High | `:433-447` | **The probe can accept the wrong file attachment.** It selects `filename,filesizeinbytes,mimetype` from `{table}_FileAttachments` and accepts any row whose `filename` equals `filecontent_name`. Learn says this relationship returns attachments for *all* file columns on the row, and its example selects `regardingfieldname`. So the "populated" pre-flight can pass on a different column. | Add `regardingfieldname` to `$select`, and require `regardingfieldname === 'filecontent'`. Add it to the fixtures and the recorded shape. |
| T2-03 | High | `:376-404` (`s2Paging`) | **The paging walk is unbounded.** It pages the whole `powerpagecomponents` table, across all sites and all types, at `maxpagesize=1` with no cap. A large environment means thousands of live requests and likely 429s, for no extra evidence after a few pages. (`terminalFull` being true at page size 1 is intended: it tests the full-terminal-page edge. That part is fine.) | Filter to `powerpagecomponenttype eq 35` and the selected site, and cap at about 5 pages. Record `capped: true` when the cap stops the walk. |
| T2-04 | Medium | `:427-430`; `bytesOf` `:267-272` | `bytesOf` throws on an unexpected binary form, such as an `ArrayBuffer` or a cross-realm `Buffer`, *before* `record('local binary shape', …)` runs. The case where the shape matters most therefore records nothing. | Record the shape before decoding. Handle or record `ArrayBuffer`, and add a test. |
| T2-05 | Medium | `:110-217` (Step 1 tests) | **Untested paths:** <br>- `s2Versions`, `s2Connection`, `s2Literal`, `s2ReadFailure`, and the invalid-scenario rejection in `s2Environment`. <br>- The events `off` fallback. `toolboxAPI.events.on` returns `void` in `@pptb/types` 1.2.7 (`toolboxAPI.d.ts:412`), so this is the *real* path; the test covers only the disposer path. <br>- Non-chunked and multi-block downloads. <br>- A failed `s2VerifyWire`. <br>- A byte or text mismatch. | Add these tests, with the `off` fallback first. Update the "ten tests" count in Step 4. |
| T2-06 | Medium | `:419-447`; test `:107` | **Ordering and cast problems.** The native file picker and `readBinary` run *before* metadata validation, so an unpopulated record still prompts the owner. Separately, the test's `window as typeof window & Probe` is an `as` cast, which `typescript.md` bans. | Validate the metadata first, then pick the file. Replace the cast with a typed helper. |
| T2-07 | Low | `:485` | **Secret value is requested.** The environment-variable definition query selects `defaultvalue` before checking `type === 100000005` (Secret). The value is never recorded, but it is still requested. The type codes are unverified on Learn. | Select `environmentvariabledefinitionid,type` first, and read `defaultvalue` only for a non-secret type. |
| T2-08 | Low | `:237-510`; `:40`, `:43` | **Edits cannot be applied mechanically.** The script edits are `@@` hunks with elided context and no line numbers, so `git apply` cannot apply them. `phase-12-spike-s2.md:214` is a line-number anchor, and Task 1 also edits that file. | Supply the full replacement `scripts/s2-probe.js`, or label the hunks as manual edits. Anchor the Phase 12 insert by the row text ending `Blocks401mapping acceptance`, which is currently unique. |
| T2-09 | Low | `:505-509` | **Stale help text and checklist.** The new `console.info` help text omits `s2SaveBytes` and `s2Copy`, which are still installed. The Phase 12 doc's older checklist (L195-199) describes the old flow, and its "Task 2/Task 3" headings collide with this plan's task numbers. | Mention the helpers that are kept, or remove them. Mark which checklist entries are superseded. |

### Task 3: host transport (`11-01-2026-phase-5-transport-reader.md:571-1461`)

What was checked and holds:
- **Anchors:** every quoted anchor matches the current files. The 13 landed commits broke none of them, and none of the new files exist yet.
- **Types:** `ExecuteRequest`/`execute`/`queryData` signatures match `@pptb/types` 1.2.7. The `expectTypeOf` pins are valid under strict `exactOptionalPropertyTypes`. There is no import cycle, and the only consumers of the changed `PptbHost`/`FakeCall` shapes are files the plan edits.
- **Protocol:** the byte protocol matches Learn. Bytes are assembled first, then decoded once with `TextDecoder` `fatal: true`, stripping a single BOM, and an empty file issues no block request.
- **Paging:** each page sends the same `maxpagesize`, `$select` is required, `$top` cannot be smuggled in, and repeated links are detected.
- **Retries:** they are bounded, for idempotent reads only, and never for 401/403/404.
- **Provenance:** it contains no URL, token, body or ID.
- **Partial rows:** they survive later failures. The call counts were traced through `withRetry`/`fetchAllPages`.
- **Overlap:** none with Task 2.

| ID | Sev | Location | Finding and evidence | Recommended fix |
|---|---|---|---|---|
| T3-01 | High | `:820`; Steps 2 and 4 `:883-889`, `:1441-1449` | **Lint failure in the planned test, and no type or lint gate in this task.** `return Promise.reject({ status: 503 });` violates `@typescript-eslint/prefer-promise-reject-errors`, which is `'error'` in `strict-type-checked.js:92`. `eslint.config.ts` applies that config to `**/*.{ts,tsx}`, and `src/` tests are not exempt. Task 3 runs only vitest; L1449 defers typecheck and lint to "the integration owner". Vitest does not type-check, so the `expectTypeOf` pins never execute in this task. Because of X-02, the lint failure would also be hidden in the noise. | Reject with an `Error` that carries `status`. Add `npm run typecheck` and `npx eslint src/services/pptb src/types/contracts.test.ts --max-warnings=0` to Step 4. |
| T3-02 | Medium | `:971-972`, `:1021-1022` | **Host timeouts are treated as cancellations.** `isAbortError` matches any error whose `name` is `'AbortError'`, even when *our* signal never aborted. Task 5 (`:2239-2241`) treats it as a user cancel, so a host-originated abort or timeout is silently dropped and not retried. | Treat an error as an abort only when `signal?.aborted === true`. Otherwise map it with `toHostReadError`. Add a test for an un-aborted signal combined with an `AbortError`-named error. |
| T3-03 | Medium | `:1121-1128` | **No size cap before allocation.** `new Uint8Array(FileSizeInBytes)` runs for any safe integer, before any byte is verified. Learn gives `filecontent` a maximum of 131,072 KB (128 MiB). A corrupt size can allocate gigabytes, or throw a `RangeError` that is remapped to a generic error. | Add `FILE_MAX_BYTES` (spec-owned, at most 128 MiB) and reject before allocating. Add an oversize-initializer test. |
| T3-04 | Low | `:1119-1120` | **A valid download can be rejected.** The initializer requires a non-empty `FileName`, but `FileName` is never used. If PPTB omits it, which is a pending live gate, a valid file becomes unreadable. The brief (`phasse5plan.md:139`) does list it. | Require only the token, the size and `IsChunkingSupported`, or confirm the strictness with the owner. |
| T3-05 | Medium | `:1171-1172`, `:1310-1312`; test `:735-743` | **Scope leak.** `getActiveConnection` now rejects on `undefined`, a change not traceable to P5.2. Its test sits in `dataverseFiles.test.ts`, and the existing test titled "returns null when there is no connection" (`pptbHost.test.ts:262`) will assert a rejection. The consumer is safe: `ConnectionProvider.tsx:21-23` maps a rejection to `null`. | Cite the driving contract (Task 5's final-identity confirmation) in Task 3's Owns line. Move the test into `pptbHost.test.ts` and rename the existing test. |
| T3-06 | Medium | `:974-976` | **`Retry-After` is ignored.** 429 retries use fixed delays of 1, 2 and 4 s, 7 s in total. Learn says a 429 carries `Retry-After`, and recovery can take longer. Whether PPTB's errors expose headers is unverified. | Honour `Retry-After` if the error exposes it. Otherwise record its absence as a live-gate item, and add a 429-exhaustion case to the download tests. |
| T3-07 | Medium | `:928` | **`transport: true` is probably never set in production.** It is set only for `DOMException` with `name === 'NetworkError'`. Errors that cross PPTB's IPC are most likely plain objects, so Task 5's "drain on confirmed network loss" branch would never fire. | State the limitation in the Task 3 text, test Task 5's branch through the fake only, and close it with the live network-loss gate. |
| T3-08 | Low | `:976-977` | **Retry waits ignore abort.** `await sleep(delay)` does not observe the signal, so cancellation can wait up to 4 s. The behaviour is honest, but it is undocumented. | Pass the signal to `sleep`, or document the delay. |
| T3-09 | Low | `pptbHost.test.ts:107-113` | **`$orderby` is not enforced.** `queryAll` accepts `orderBy: null`. The rule requires a deterministic `$orderby` when paging. | Enforce it in `queryAll`, or state that Task 5's queries own the guarantee. |
| T3-10 | Low | `:1370-1390` | **No runtime operation-name check.** The `execute` allow-list is enforced only at compile time through `FileAction`. | Add a runtime adapter assertion that `operationName` is one of the two actions (pairs with T1-01). |
| T3-11 | Low | Task 3 header | **Precondition not stated.** `.claude/rules/pptb-host-and-output.md:7` still bans `execute` until Task 1 lands. | Add "Requires Task 1 applied" to the precondition. |
| T3-12 | Low | `:1187` | **Duplicate import.** `fakeHost.ts` gains a second `import type` from `./host.types`. | Merge `FileColumnRef` into the existing import. |
| T3-13 | Low | `:756-766`; `dataverseRead.phase5.test.ts` | **Test notes.** The `DOMException('NetworkError')` test depends implicitly on the jsdom default (`vite.config.ts:138`). The BOM and split-code-point test builds about 5.6 MB of base64, which is slow but within the timeout. | Add `// @vitest-environment jsdom` explicitly. Optionally shrink the fixture. |

### Live gates still open (by design, not defects)

These are pending until the S2 live run:
- Whether PPTB `execute` passes `Target` with `@odata.type` through unchanged.
- Whether `Data` arrives as base64.
- Whether `FileName` and `IsChunkingSupported` are present.
- What PPTB's error objects look like, including headers and transport errors.

Both Task 2 and Task 3 correctly fail closed, and neither claims them.

### Outside-scope observations (Tasks 4–10)

- `docs/plans/10-24-2026-generator-behavior-harness.md` was deleted in `820d7b8`, but it is still cited by the entry-plan FR-12 row and by `11-01-2026-phase-5-release-proof.md:43` and `:281`. Resolve this with X-01.
- `1c9bdf6` removed `npm-shrinkwrap.json` from `package.json` `files`, but `finalize-package` still runs `npm shrinkwrap`. This is relevant to Task 10's package inspection.
- `npm audit` (full) shows 2 moderate dev-only entries: `eslint-plugin-jsx-a11y` with nested `minimatch`, GHSA-g3hv-75wg-m249. `--omit=dev` shows 0. This matches the baseline statement.
