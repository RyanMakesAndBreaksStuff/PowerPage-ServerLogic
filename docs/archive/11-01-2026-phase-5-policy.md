# Phase 5 Requirements Implementation Plan

**Goal:** Make the owning requirements permit the complete, bounded Inspector scan/review/export journey.

**Architecture:** The spec owns product scope and evidence precedence. The host rule owns adapter/authentication conventions; historical phase plans point to the current implementation tasks.

**Tech stack:** Existing Markdown specifications and PowerShell documentation checks.

**Scope:** Task 1 in the [Phase 5 plan](11-01-2026-phase-5-logic-inspector.md).

**Out of scope:** Production implementation and live acceptance.

---

### Task 1: Replace the blanket API restriction with the Phase 5 evidence contract

**Owns:** P5.1's requirement amendments; PB-001/PB-002 policy; active-plan precedence. The spec owns product behavior. Production TypeScript definitions own implementation contracts. The following tasks own their implementation, with no second evaluator or transport registry.

**Files:**

- Modify: `docs/specs/001-server-logic-starter-inspector/spec.md` — operation scope, evidence matrix and review eligibility.
- Modify: `.claude/rules/pptb-host-and-output.md` — adapter/authentication/lifecycle instructions.
- Modify: `docs/specs/001-server-logic-starter-inspector/plan-starter.md` — shared constraints and contract references.
- Modify: `docs/specs/001-server-logic-starter-inspector/plan-inspector.md` — active Inspector execution pointer.
- Modify: `docs/specs/001-server-logic-starter-inspector/plans/phase-01-host-adapter.md` — superseded transport-plan pointer.
- Modify: `docs/specs/001-server-logic-starter-inspector/plans/phase-11-inspector-rules.md` — superseded rule-plan pointer.
- Modify: `docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md` — retain historical evidence; direct new observations to the S2 continuation.
- Modify: `docs/specs/001-server-logic-starter-inspector/plans/phase-15-inspector-scan.md` — superseded reader-plan pointer.
- Modify: `docs/specs/001-server-logic-starter-inspector/plans/phase-16-report-markdown.md` — superseded report-plan pointer.
- Modify: `docs/specs/001-server-logic-starter-inspector/plans/phase-20-report-pdf.md` — retain report design provenance; supersede implementation instructions.
- Modify: `docs/specs/001-server-logic-starter-inspector/plans/phase-23-inspector-page.md` — superseded page-plan pointer.
- Modify: `docs/specs/001-server-logic-starter-inspector/plans/phase-24-export-dialog.md` — superseded export-plan pointer.
- Signal: the PowerShell documentation query below — exposes the three active blanket prohibitions and old warning copy.

- [ ] **Step 1: Establish the observable pre-change signal**

Run from the repository root:

```powershell
Select-String -Path 'docs/specs/001-server-logic-starter-inspector/spec.md' -Pattern 'Inspector is read-only','Inspector requests read-only access','^- Create, update or delete anything\.$','Inspector is read-only but is designed for dev sites'
```

- [ ] **Step 2: Capture the current signal**

Run: `Select-String -Path 'docs/specs/001-server-logic-starter-inspector/spec.md' -Pattern 'Inspector is read-only','Inspector requests read-only access','^- Create, update or delete anything\.$','Inspector is read-only but is designed for dev sites'`

Expected: four matching lines: Non-Goals, AC-7.5, FR-7 Must not and Security. The source baseline is spec 4.0.1; these clauses contradict the approved delivery brief.

- [ ] **Step 3: Implement the minimum fix**

In `spec.md`, replace the active clauses at their unique anchors:

```diff
 ## Non-Goals
- - Writing, publishing or changing anything in the environment or site. Starter only produces downloads; Inspector is read-only.
+ - Inline configuration editing, handler upload/deployment and bulk remediation. Starter produces downloads; Inspector's delivered journey is scan, session-only review and report export. Required operations use documented host APIs through the signed-in connection, including retrieval actions; HTTP verbs and API names do not define eligibility.

- - [ ] **AC-7.5** Given the PPTB connection is marked as Test, UAT or Production (its `environment` label, which the user sets in PPTB) When Inspector connects Then a persistent warning reads "This isn't a development environment. Inspector is read-only but is designed for dev sites." and scanning stays available.
+ - [ ] **AC-7.5** Given the PPTB connection is marked as Test, UAT or Production (its `environment` label, which the user sets in PPTB) When Inspector connects Then a persistent warning reads "This isn't a development environment. Inspector is designed for dev sites." and scanning stays available. Unknown retains the same non-blocking warning under AC-7.11.

 # FR-7, immediately after “Use the host's active connection.”
+ - Inspector consumes typed, feature-owned host operations. Handler downloads use the unbound `InitializeFileBlocksDownload` and `DownloadBlock` actions via `dataverseAPI.execute`, behind `src/services/pptb/`; PPTB supplies authentication and Dataverse enforces the signed-in user's permissions. A generic execute interface is not exposed to feature components.

 # FR-7 Must not
- - Create, update or delete anything.
+ - Implement inline editing, upload/deployment, bulk remediation or runtime execution as prerequisites for this scan/review/export delivery.

 # Security
- - Inspector requests read-only access.
+ - Required Inspector operations use the documented host adapter with response validation and host-managed authentication; operation purpose, not HTTP verb or the name `execute`, determines eligibility within the delivered scope.
```

Replace the Server logic code row in FR-7's data-source table with:

```markdown
| Server logic code | `powerpagecomponent.filecontent`, a File column holding the handler. `InitializeFileBlocksDownload` receives `Target` with `@odata.type: Microsoft.Dynamics.CRM.powerpagecomponent` and `powerpagecomponentid`, plus `FileAttributeName: filecontent`; `DownloadBlock` retrieves bytes. `content` holds metadata/role links, not handler source. | S1 identifies the column; S2 must verify a populated handler through PPTB and compare stored and downloaded bytes/text. |
```

Replace the Site settings data-source row's “filtered to the site and the `ServerLogic/` prefix” with “filtered to the site; required names are matched after trimming and case-folding, without a restrictive prefix query”. Replace the S2 file-download bullet with:

```markdown
- a populated type-35 handler download through `InitializeFileBlocksDownload` and `DownloadBlock`: verify file metadata, response property types, byte count and local byte/text equality. The historical `$value` response of `{}` remains evidence of that transport's limitation. Failed downloads retain per-file non-reviewable findings; universal code-read fallback does not satisfy healthy-path acceptance.
```

In FR-8, replace “Attach a category, a summary, guidance, questions and a snapshot to each finding” with “Each finding owns its summary, original reasons, guidance, questions and explanatory detail; `FileResult.snapshot` owns optional raw configuration rows.” Add this authoritative evidence table after the Not-scanned definition, and reference it from FR-9 before the check rules:

```markdown
Apply this precedence only to dependencies actually required by the check. An irrelevant unread setting does not defeat a conclusive code-based no-use result.

| Required evidence | Result | Review action |
|---|---|---|
| A known failed read, including mixed failed/unscanned dependencies | Needs review; preserve all known reasons and identify missing evidence | Unavailable |
| A known adverse finding plus required unscanned evidence | Needs review; preserve the adverse reason and incomplete-evidence explanation | Unavailable |
| Unscanned dependencies without a known failure/adverse finding | Not scanned | Unavailable |
| Required evidence obtained and a configuration finding applies | Needs review; preserve all applicable reasons | Available |
| Required evidence obtained but an analysis limit remains | Needs review | Available |
| Required evidence obtained and no finding applies | Configured | Unavailable |

Findings represent required unscanned dependencies separately from failed reads. `canReviewFinding` and `evaluateSite` both enforce eligibility, including when callers supply review marks directly. Existing C/V/M/U/T/K counts and file-result precedence remain authoritative in AC-8.1 and AC-8.10.
```

In AC-8.5 and the FR-8 review prohibition, extend the exclusion to any required unscanned dependency. Add to FR-7's Parent-chain Unknown bullet: “An active terminal ancestor with unknown scope makes linked descendants unresolved, whether their effective role link comes from the descendant or the terminal ancestor. Successfully read unknown scope is a reviewable analysis limit; an actual failed configuration/ancestor read is non-reviewable. Known inactive ancestors still exclude the permission.”

In FR-9 Outbound, clarify that O0/O1 retain code precedence; once HttpClient evidence requires settings, collect every known wildcard reason before an O2 result, while keeping O2's leading summary.

Add this paragraph under FR-10's Must list, immediately before its font bullets:

```markdown
- **Report contract:** Preserve Phase 20's white landscape-A4 pages, 36pt margins and report-only palette, implemented by Task 7c's `REPORT_PALETTE` in `src/features/inspector/report/pdfDrawing.ts`: paper `#ffffff`, ink `#14213d`, muted `#55607a`, rules `#dfe4ee`, head `#f6f8fc`, blue `#1f6fd1`, blue chip `#1e6dcd`, blue tint `#eaf2fd`, orange `#b05408`, orange tint `#fdf0e3`, grey `#9aa3b5`. A8 owns these contrast corrections. Use DM Sans 400 body text, Space Grotesk 700 headings and static JetBrains Mono 400 paths; the UI's Graphite palette does not apply to reports. Table text is at least 10pt; checks and rings are vectors. Repeat table headings on each page; split an oversized logical entry into labelled continuation rows while keeping each physical row intact. All text remains selectable and complete. The locally bundled fonts' supported repertoire and explicit unsupported-character behavior are recorded in `src/assets/fonts/PDF-FONTS.md`; unsupported input must not be silently dropped, and Markdown remains available after a PDF build error.
```

Replace these exact active-reference strings in `spec.md`; historical changelog/disposition rows stay historical:

| Existing string | Replacement |
|---|---|
| ``Report styling still follows the original handoff's README §05 (`design_handoff_server_logic_tools/README.md`).`` | `Report styling follows the pinned FR-10 report contract.` |
| `JetBrains Mono for paths (README §05)` | `JetBrains Mono for paths (FR-10 report contract)` |
| `Reports keep the original handoff's README §05 palette in both themes, with the A8 adjustments.` | `Reports follow the FR-10 report contract in both themes, with the A8 adjustments.` |
| `The report palette (original README §05) has two tokens` | `The report palette (FR-10 report contract) has two tokens` |

Increment the spec to **4.1.0**, date it **2026-11-01**, and add this changelog entry:

```markdown
| 4.1.0 | 2026-11-01 | Phase 5: replace the blanket read-only API restriction with typed operation-specific host access; require action-based populated-handler download, explicit mixed-evidence precedence, incomplete-evidence review exclusion and conservative unknown-ancestor handling. Separate finding explanation from optional snapshots; pin the existing Phase 20 report design. Scope remains enhanced-model scan, session-only review and Markdown/PDF export. |
```

In `.claude/rules/pptb-host-and-output.md`, replace the three bullets anchored below:

```diff
- - ✓ Dataverse is read-only: use `retrieve`, `queryData`, `fetchXmlQuery` and the metadata getters only. ✗ Never call `create`, `update`, `delete`, `*Multiple`, `associate`, `disassociate`, `execute` actions, schema authoring, `deploySolution` or `publishCustomizations`. ✗ No `Post`/`Put`/`Patch`/`Delete` on `powerplatformAPI`.
+ - ✓ Use documented, typed, feature-owned host operations within the current spec's scope. Handler-file retrieval uses `InitializeFileBlocksDownload` and `DownloadBlock` through `dataverseAPI.execute` inside `src/services/pptb/`. Validate responses at the boundary. PPTB owns authentication; components consume typed adapter methods, not globals or generic action execution.
- - ✓ Register `toolboxAPI.events.on` once at init and route on `payload.event`, including re-scanning on `connection:updated`. ✗ This tool writes nothing to `toolboxAPI.settings` (spec FR-5a removed).
+ - ✓ Register one host event handler at init and unsubscribe on unload. Connection events trigger an identity refresh; invalidate Inspector only on a confirmed ID/URL change or successful null result. Preserve the last confirmed identity on refresh rejection; retry on focus and visible-document changes. This tool writes nothing to `toolboxAPI.settings`.
- - ✓ Run `npx pptb-validate --skip-url-checks` before any release. ✗ Never run `npm publish` without explicit confirmation, because it is irreversible.
+ - ✓ Use the installed validator's exported API for offline manifest checks; v1.0.5's CLI ignores `--skip-url-checks`. Run `npm run validate` separately for publication URLs. Publication follows FR-12 and requires the owner's explicit confirmation.
```

In `plan-starter.md`:

Replace the `**Open risk (Inspector, not Starter):**` bullet with:

```markdown
- **Inspector transport (superseded 2026-11-01):** handler code is read through the typed action-based file download owned by [Task 3](11-01-2026-phase-5-transport-reader.md#task-3-make-host-reads-complete-cancellable-and-byte-correct). The historical `$value` probe and its failed-read fallback remain Phase 12 evidence, not current execution instructions.
```

In Global Constraints, replace the bullet beginning `Host globals are touched only in` with:

```markdown
- Host globals are touched only in `src/services/pptb/`. Inspector uses documented, typed, feature-owned host operations within spec FR-7; handler-file retrieval uses `InitializeFileBlocksDownload` and `DownloadBlock` through `dataverseAPI.execute` inside the adapter. Reads page with `Prefer: odata.maxpagesize` and a deterministic `$orderby`, never `$top` (rule amended 2026-10-17). The tool writes nothing to tool settings.
```

Change the contract heading:

```diff
-## Contracts (Phase 00 commits these verbatim; every later phase consumes them unchanged)
+## Contracts (Phase 00 baseline; Phase 5 supersedes the host and Inspector portions)
```

Inside that section's TypeScript fence, remove the contiguous range from `// src/services/pptb/host.types.ts` through the closing `SiteResult` declaration immediately before `// src/types/report.ts`. Preserve the fence and its remaining declarations. Immediately after the closing fence, before `**Pinned function signatures**`, insert these Markdown bullets:

```markdown
- Host errors, paging, file target and cancellation: [Task 3](11-01-2026-phase-5-transport-reader.md#task-3-make-host-reads-complete-cancellable-and-byte-correct), owned by `src/services/pptb/host.types.ts`.
- Inspector facts, findings, evidence and review contracts: [Task 4](11-01-2026-phase-5-rules.md#task-4-preserve-partial-rule-evidence-enforce-review-eligibility-and-isolate-raw-snapshots) and [Task 5](11-01-2026-phase-5-transport-reader.md#task-5-read-actual-enhanced-model-site-facts-and-retain-partial-work), owned by `src/types/inspector.ts`.
- Inspector session: [Task 6](11-01-2026-phase-5-session-export.md#task-6b-own-one-inspector-session-and-serialize-superseding-reads), owned by `src/app/inspector-site/inspectorSession.ts`.
```

No active mandatory Prettier gate remains in `plan-starter.md`. The line-1 supersession note on each phase file replaces its historical Prettier, `$value`-fallback and provisional no-status instructions; preserve historical observations and result records.

At line 1 of `plan-inspector.md` and each phase file listed in Files, insert the following note (adjust only the relative link: `../../plans/11-01-2026-phase-5-logic-inspector.md` from `plan-inspector.md`, `../../../plans/11-01-2026-phase-5-logic-inspector.md` from a phase file):

```markdown
> **Execution superseded — 2026-11-01.** [Phase 5](11-01-2026-phase-5-logic-inspector.md) owns the remaining Inspector implementation, contracts and current check commands. This file preserves historical phase IDs, design choices and probe outcomes; its old code blocks, `$value` fallback, blanket API prohibition, formatter commands and sequencing are not current execution instructions. New S2 observations are appended to Phase 12 without rewriting historical observations.
```

In `plan-inspector.md`, also replace its “Resolved risk (2026-10-23)” paragraph with: “The historical JSON-only `$value` path returned `{}`. Phase 5 replaces that path with typed action-based file download; a populated-handler wire comparison remains a release gate.” The preceding note makes remaining historical copies explicitly non-authoritative.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `Select-String -Path 'docs/specs/001-server-logic-starter-inspector/spec.md' -Pattern 'Inspector is read-only','Inspector requests read-only access','^- Create, update or delete anything\.$','Inspector is read-only but is designed for dev sites'`

Expected: no matches in active requirements. Historical audit and probe observations are preserved in their owning records.

Run: `git diff --check -- docs/specs/001-server-logic-starter-inspector .claude/rules/pptb-host-and-output.md`

Expected: exit 0; no whitespace errors. Review the staged/unstaged diff against the planning baseline before staging, because these documents already contain owner changes.

- [ ] **Step 5: Commit the coherent change**

After the parent plan's committed-baseline prerequisite is satisfied, stage only this task's owned documents:

```bash
git add -- .claude/rules/pptb-host-and-output.md docs/specs/001-server-logic-starter-inspector/spec.md docs/specs/001-server-logic-starter-inspector/plan-starter.md docs/specs/001-server-logic-starter-inspector/plan-inspector.md docs/specs/001-server-logic-starter-inspector/plans/phase-01-host-adapter.md docs/specs/001-server-logic-starter-inspector/plans/phase-11-inspector-rules.md docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md docs/specs/001-server-logic-starter-inspector/plans/phase-15-inspector-scan.md docs/specs/001-server-logic-starter-inspector/plans/phase-16-report-markdown.md docs/specs/001-server-logic-starter-inspector/plans/phase-20-report-pdf.md docs/specs/001-server-logic-starter-inspector/plans/phase-23-inspector-page.md docs/specs/001-server-logic-starter-inspector/plans/phase-24-export-dialog.md
git diff --cached --stat
git commit --only -m "docs(inspector): define phase 5 operation and evidence contracts" -- .claude/rules/pptb-host-and-output.md docs/specs/001-server-logic-starter-inspector/spec.md docs/specs/001-server-logic-starter-inspector/plan-starter.md docs/specs/001-server-logic-starter-inspector/plan-inspector.md docs/specs/001-server-logic-starter-inspector/plans/phase-01-host-adapter.md docs/specs/001-server-logic-starter-inspector/plans/phase-11-inspector-rules.md docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md docs/specs/001-server-logic-starter-inspector/plans/phase-15-inspector-scan.md docs/specs/001-server-logic-starter-inspector/plans/phase-16-report-markdown.md docs/specs/001-server-logic-starter-inspector/plans/phase-20-report-pdf.md docs/specs/001-server-logic-starter-inspector/plans/phase-23-inspector-page.md docs/specs/001-server-logic-starter-inspector/plans/phase-24-export-dialog.md
```

Execute commits only after the existing staged work has been reconciled into the execution baseline; these commands do not authorize committing unrelated staged work.
