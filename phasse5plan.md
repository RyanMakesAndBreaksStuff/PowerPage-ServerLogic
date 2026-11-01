# Phase 5 plan: Complete Logic Inspector and remove the read-only restriction

**Date:** 2026-10-31  
**Status:** Planned; implementation and acceptance checks remain to be executed.  
**Planning baseline:** `starter-objexts-prep`, HEAD `6c0bdd5afbcf80a7c09ace02a1fd3132e2842169`, including the current working-tree spec v4.0.0 and Graphite changes.  
**Approach:** `rm-react-typescript` for the existing React/PPTB experience; `lean-build` for a complete, bounded delivery.  
**Numbering:** Phase 5 is this delivery plan. Existing phase IDs 01, 11, 12, 15, 16, 20, 23 and 24 remain valid references; this does not replace historical Phase 05, Starter domain.

## 1. Outcome and scope

Deliver this working journey:

**Connect in PPTB → choose an enhanced-model Power Pages site → scan actual configuration and handler code → inspect findings → review or undo eligible findings → export the captured review as Markdown or PDF.**

The audience is Power Pages makers and developers preparing a site for release, with reviewers receiving the resulting reports. The primary action is selecting a site and scanning/rescanning it. Finding guidance and Microsoft Learn links provide the secondary path when a user needs to investigate a result.

### Read-only restriction: replacement decision

Remove the blanket product and implementation rule that Inspector may use only read-labelled Dataverse APIs. Required Inspector operations may use documented host APIs, including `dataverseAPI.execute`, through the existing adapter and the signed-in connection. HTTP verbs and the name `execute` no longer determine whether an operation is eligible.

The concrete capability needed for this phase is **handler-file download through `InitializeFileBlocksDownload` and `DownloadBlock`**. These are POST actions that retrieve existing file content. They address the JSON-only `queryData(.../filecontent/$value)` limitation that previously prevented useful code-dependent checks.

The acceptance scope is scan, review and report export. Inline configuration editing, handler upload/deployment, bulk remediation, runtime execution/debugging, standard-model sites, tenant-policy evaluation and persisted scan history are outside this delivery. Removing the old restriction does not make those additional products prerequisites for finishing Inspector.

### Observable acceptance

1. A populated handler is downloaded through PPTB and its actual text drives connector/function analysis; the normal path does not make every code-dependent check fall back to unreadable code.
2. Site selection, progress, active/inactive inventory, findings, detail and all specified empty/error/retry states work.
3. Partial evidence survives a same-connection interruption; connection/site changes and rescans discard obsolete results and marks, including while another tab is visible.
4. Review/undo updates every count and summary. Missing evidence cannot be turned into Ready through a review mark.
5. Both scopes and both report formats preserve statuses, original reasons, include options, redaction and scan provenance.
6. The shipped Inspector uses the current Graphite theme and the existing desktop interaction/accessibility contract.
7. Inspector-enabled builds contain the completed journey; Inspector-excluded builds omit its provider, picker, feature code and PDF implementation.
8. Local checks and the required live PPTB gates have recorded outcomes before Inspector is treated as release-ready.

## 2. Grounded starting point

The [fresh Inspector audit](spec3check.md) supplies the issue IDs. Current source inspection confirms the following starting points; its historical test results are not a fresh test run for this plan.

| Area | Current evidence | Phase 5 treatment |
|---|---|---|
| Page and picker | `InspectorPage.tsx` is a placeholder; `SitePill.tsx` is always disabled. There is no production Inspector session owner. | Implement the connected page and app-scoped session. |
| Reader | `runScan` and `listSites` in `scan/scan.ts` throw. | Implement against the canonical host adapter. |
| Handler transport | `downloadColumnContent` expects text from a JSON-oriented API. Historical S2 returned `{}`; populated-file comparison remains open. | Replace the production transport with the documented download actions and prove the host response. |
| Host reliability | `HostReadError` currently carries only status; paging loses earlier rows on failure; connection refresh rejection becomes `null`. | Implement provenance, partial rows, cancellation and confirmed-identity handling. |
| Rules | Settings, grants, analysis, counts and review functions exist. Wildcard/O2, mixed-evidence and unknown-ancestor gaps remain. | Repair these owners and reuse them. |
| Reports | Model, Markdown, escaping and filename logic exist. Snapshot detail and hostname redaction have gaps; `renderPdf` throws. | Repair shared presentation data and implement PDF. |
| Export | No production dialog/controller reaches `host.saveFile`. | Add the complete captured-state export lifecycle. |
| Release | `build:beta` defaults to Starter + Server Objects; an unset release list in a normal build includes Inspector. Build tests still assert placeholder text. | Use explicit release contents and behavior-based completion checks. |

Existing dirty/staged files and `.scratch/inspector-plan/` are not a clean implementation baseline. Reconcile against the current checkout at execution time. Scratch implementations and old plan code blocks are references, not evidence that production work is finished.

## 3. Amend the owning requirements first

Record the read-only removal and the evidence decisions below in the next revision of the existing spec. The user's direction supplies the policy change; avoid carrying contradictory restrictions into implementation.

| Owning document | Required amendment |
|---|---|
| `docs/specs/001-server-logic-starter-inspector/spec.md` | Replace the blanket read-only Non-Goal, FR-7 prohibition and security-NFR wording with operation-specific host access. Update the code data-source row and S2 download requirement. Amend AC-7.5 copy, FR-8/FR-9 evidence precedence and AC-8.5 review eligibility. |
| `.claude/rules/pptb-host-and-output.md` | Replace the blanket API prohibition with typed, feature-owned host operations. Retain the adapter boundary, response validation and host-managed authentication. Correct the instruction to rescan on every connection event: re-read identity, then invalidate only when it changes. |
| `docs/specs/001-server-logic-starter-inspector/plan-starter.md` | Update the shared host constraint, obsolete Inspector risk and canonical contracts for error provenance, partial rows and cancellation. |
| `docs/specs/001-server-logic-starter-inspector/plan-inspector.md` and relevant phase plans | Replace the forced `$value` fallback as the planned happy path. Align sequencing, contracts, Graphite references and current check commands with this plan. |
| `findings/logic/probe_findings.md` | Append a dated superseding decision and new evidence. Preserve the original `{}` observation and its historical context. |

Use the revised non-development message: **“This isn't a development environment. Inspector is designed for dev sites.”** The existing non-blocking treatment and Unknown classification remain applicable.

Preserve the operational boundary: PPTB supplies authentication and Dataverse enforces the connected user's permissions. Host globals stay in `src/services/pptb/`; feature components consume typed methods. Scan data and review marks remain session-only. Reports retain configuration-review, non-atomic-scan and tenant-policy-not-verified statements because those describe the evidence collected.

### Evidence decisions adopted by this plan

Apply these rules to dependencies actually needed by a check; an irrelevant unread setting must not defeat a conclusive code-based no-use result.

| Required evidence | Display result | Review eligibility |
|---|---|---|
| Known read failure, including a mixture with unscanned evidence | Needs review; retain all known reasons and identify missing evidence | Unavailable |
| Known adverse finding plus required evidence not yet scanned | Needs review; retain the adverse finding and incomplete-evidence explanation | Unavailable until a new scan supplies the evidence |
| Required evidence not yet scanned, with no known failure/adverse finding | Not scanned | Unavailable |
| Required evidence obtained and a configuration finding applies | Needs review, with all applicable reasons | Available, with original reasons retained |
| Evidence obtained but an analysis limit remains | Needs review | Available, with original reasons retained |
| Required evidence obtained and no finding applies | Configured | No review action |

Represent unscanned dependencies explicitly in `Finding`, for example with `hasUnscannedEvidence`, and make `canReviewFinding` enforce the rule. Do not mislabel unscanned evidence as a failed read. Retain the existing C/V/M/U/T counts and file-result precedence.

For **PB-002**, an active Parent permission whose terminal ancestor has an unknown scope is unresolved. It cannot produce Configured for a linked descendant. With successfully read records this is a reviewable analysis limit; an actual failed ancestor/configuration read remains non-reviewable. Preserve the known-inactive-ancestor exclusion.

## 4. Architecture and delivery order

| Owner | Responsibility |
|---|---|
| `src/services/pptb/` | Host calls, file-action protocol, paging, retries, sanitized failure classification and request cancellation checks. |
| `src/features/inspector/scan/` | Enhanced-model queries, row/content validation, bounded scheduling and `SiteFacts`. |
| `src/features/inspector/model/` | Evidence interpretation, grants, findings, review eligibility, counts and banners. |
| `src/app/ConnectionProvider.tsx` | Last confirmed connection and lifecycle refreshes. |
| `src/app/inspector-site/` | Selected site, scan identity, cancellation, results, selected file and review marks for shell and page. |
| `src/features/inspector/` | Inspector presentation and the separate report-export lifecycle. |
| `src/features/inspector/report/` | One report model, options/redaction/filenames and Markdown/PDF rendering. |

Use the established app-composition pattern: the app supplies Inspector scan/evaluation dependencies to the session provider, as Starter supplies `STARTER_DEPS`. The title-bar picker consumes app-owned context and does not import feature internals. Counts and evaluated results are derived from facts and marks, not synchronized copies in effects.

```text
P5.1 → P5.2 Transport and reliability
P5.1 → P5.3 Evidence/rule repairs
P5.2 + P5.3 → P5.4 Reader → P5.5 Session and page
P5.3 → P5.6 Reports and PDF
P5.5 + P5.6 → P5.7 Export → P5.8 Release proof
```

P5.6 depends on P5.3, not on completion of the reader. Each slice must compile and pass its focused checks before the next dependent slice is integrated.

## 5. Implementation slices

### P5.1 — Retire contradictory constraints and pin the download contract

**Owns:** the amendments in section 3 and the S2 continuation.  
**Files:** the owning documents above; `scripts/s2-probe.js`; the existing Phase 12 evidence table.

- [ ] Record the scope and evidence decisions, including the review-eligibility amendment.
- [ ] Extend S2 with a known populated type-35 component: verify `filecontent_name` and relevant FileAttachment metadata, then perform the two download actions through PPTB.
- [ ] Use the installed `@pptb/types` 1.2.7 `ExecuteRequest` shape: `operationName`, `operationType: 'action'`, and `parameters`. These are unbound actions; the record belongs in the initializer's `Target`, not in bound-action `entityName`/`entityId` fields.
- [ ] Record actual host/runtime versions, returned property types, byte count and a local comparison with the same stored handler. Keep source text, continuation tokens and environment identifiers out of committed evidence.
- [ ] Complete outstanding paging/literal, callback/unsubscribe, nonsecret environment-variable, network-loss and expired-sign-in observations in the same evidence record.

**Exit proof:** the contract and probe are executable, and each live observation is recorded as passed, failed or pending. Local implementation can proceed with contract fixtures while live access is unavailable; real handler download remains a release acceptance condition.

### P5.2 — Make Dataverse transport complete and cancellable

**Owns:** CR-002's transport dependency, WR-003, WR-004 and the download restriction's concrete replacement.  
**Files:** `host.types.ts`, `hostErrors.ts`, `dataverseRead.ts`, `pptbHost.ts`, `fakeHost.ts` and their tests under `src/services/pptb/`; add `dataverseFiles.ts` and its focused tests.

- [ ] Implement the already-planned `HostReadError.transport` and `partialRows` fields. A later-page failure retains every successfully received page, including rows retained when the strict terminal-page check fails. Partial rows still require domain validation.
- [ ] Preserve 401/authentication, 403/access denial, exhausted 429/5xx, protocol/shape failure and confirmed network failure as distinguishable outcomes. A null status alone is not connection loss. Unknown no-status failures remain local failures until live evidence supports a narrower mapping.
- [ ] Add optional cancellation to the existing read methods/retry helper. Check before each request, after each response and after retry waits. Cancellation is not a read-failure finding. Already-dispatched PPTB promises may finish; discard superseded results and prevent further requests.
- [ ] Implement a single file-download protocol behind `PptbHost.downloadFileColumn`. Make its target descriptor explicit: logical table, primary-key attribute, record ID and file column. For Inspector these are `powerpagecomponent`, `powerpagecomponentid` and `filecontent`; do not infer singular names from entity-set strings.
- [ ] Inject the raw host action call from `pptbHost.ts` into the protocol helper. Feature code does not need a generic `execute` API or a transport registry.

**File protocol:**

1. Call `InitializeFileBlocksDownload` with `Target` containing `@odata.type: Microsoft.Dynamics.CRM.powerpagecomponent` and the record's `powerpagecomponentid`; set `FileAttributeName` to `filecontent`.
2. Validate `FileContinuationToken`, `FileSizeInBytes`, `FileName` and `IsChunkingSupported`. Use safe integer offsets/sizes and reject malformed responses.
3. If chunking is supported, request sequential blocks of up to 4 MiB using `Offset`, `BlockLength` and the returned token. Otherwise request the entire file as documented.
4. Decode the returned binary `Data` from its verified JSON representation into bytes, assemble in order, and validate the final byte count. Decode UTF-8 after byte assembly so a multibyte character split across blocks survives. Handle the UTF-8 BOM deliberately.
5. Apply the existing bounded retry to these download requests. Retry a block at the same offset without appending it twice. Cancellation prevents subsequent blocks. Incomplete/invalid bytes never reach the code analyser.
6. Treat a successfully downloaded empty file as readable empty code, producing the existing analysis-limit result. A failed download affects Table permissions and Outbound as non-reviewable code-read failures; Web role still uses its configuration evidence.

**Exit proof:** focused adapter tests cover multi-block and nonchunked downloads, Unicode/BOM, empty content, malformed/base64 or byte-length failures, denied/missing files, retry and cancellation between blocks. Paging tests retain prior rows on later 401, 403, exhausted 503 and strict-terminal-page rejection. Continue to require wire evidence before disabling `NEXT_LINK_UNVERIFIED`; use the documented FetchXML-cookie strategy only if that evidence requires it.

### P5.3 — Repair rules and separate finding explanation from snapshots

**Owns:** WR-001's data ownership, WR-006, PB-001, PB-002 and PR-001.  
**Files:** `src/types/inspector.ts`; `model/checks.ts`, `grantSet.ts`, `rules.ts`, relevant fixtures/tests; report fixtures affected by the type contract.

- [ ] Apply the evidence matrix in section 3 and enforce it in `canReviewFinding`, including marks applied through `evaluateSite` rather than only hiding a button.
- [ ] Resolve unknown terminal-ancestor scope conservatively, with both child-linked and ancestor-linked role fixtures and inactive-ancestor controls.
- [ ] Collect known wildcard reasons before returning O2 for an invalid/duplicate/unreadable all-domains setting. Preserve the leading O2 summary and the established O0/O1 code precedence.
- [ ] Keep required reasons and explanatory detail in findings; keep optional raw configuration rows in `FileResult.snapshot`. Remove the unconditional copying of snapshot rows into finding detail. Include options must operate on structured ownership, not string-prefix filtering.
- [ ] Compute each file's grant set once within evaluation and reuse it for permission findings and snapshot construction.

**Exit proof:** existing rule/grant fixtures plus mixed failed/unscanned/adverse cases pass; review cannot hide incomplete evidence. Wildcard intersections retain every known reason. All 64 output-state combinations still produce the specified counts/results. A snapshot-only sentinel can be omitted without deleting mandatory original reasons.

### P5.4 — Implement the real site reader

**Owns:** CR-002 and FR-7's end-to-end facts path.  
**Files:** `src/features/inspector/scan/scan.ts`; add colocated query/literal, parser and bounded-pool helpers only where those responsibilities need them; reader/parser tests; scan contracts in `src/types/inspector.ts` if required.

- [ ] Implement `listSites` using `powerpagesites`, and `runScan` using site-scoped `powerpagecomponents` types 35, 11, 18 and 9. Parse each `content` JSON value at the boundary; use the S1 role and parent links, not an assumed N:N relationship.
- [ ] Give list queries explicit selects, deterministic ordering and complete paging. Use one OData string-literal encoder. Read enough site-setting rows to honor trimmed, case-insensitive name matching and active-duplicate detection; a restrictive name-prefix query must not hide those cases.
- [ ] Resolve only the four required `ServerLogic/*` settings. For environment-variable-backed values, inspect the definition/type before fetching values; use nonsecret current/default resolution, and retain missing/denied/unscanned evidence distinctly. Secret definitions never trigger a value read.
- [ ] Run all scan reads, paging and file-action requests through one effective concurrency budget of four. Avoid a file pool whose nested block pool multiplies the limit. Keep all discovered files, including inactive records; impose no record-count cap.
- [ ] Preserve completed evidence and partial inventory. Mark unread dependencies Not scanned after a same-connection transport/auth interruption, and return an incomplete inventory indicator after an inventory failure. A failed site list is an error with Retry, never a successful empty site list.
- [ ] Carry scan ID, start/end timestamps and an optional injected clock/signal through the operation. Publish `Scanned X of N` consistently, with incomplete-inventory context when N is only the discovered set.
- [ ] Respect the actual host contract: a connection target is a slot, not an arbitrary connection ID. Reconfirm identity before accepting a completed scan; confirmed identity changes abandon the old scan. Do not claim the separate reads form an atomic snapshot.

**Exit proof:** fake-host reader integration exercises the actual query/parse/download/evaluate path, complete and partial inventories, active/inactive records, settings/environment-variable cases, failed code reads, logical cancellation and stale work. Measured request concurrency never exceeds four. The healthy live 50-record timing is recorded later under RG-004.

### P5.5 — Build the app-scoped session and finished Inspector experience

**Owns:** CR-001 and WR-005.  
**Files:** `src/app/ConnectionProvider.tsx`, `useActiveConnection.ts`, their tests; new `src/app/inspector-site/`; `App.tsx`, `shell/SitePill.tsx`; `InspectorPage.tsx` and colocated presentation/CSS/tests; `tests/buildShape.test.ts`.

- [ ] Preserve the last confirmed connection after a refresh rejection and expose refresh failure separately from a confirmed disconnect. Recover on connection events, focus and visible-document changes. Preserve latest-request/unmount protection and remove every listener on cleanup.
- [ ] Mount the Inspector provider around the shell/page composition behind `__PAGE_INSPECTOR__`. It must continue handling lifecycle events while Starter or Server Objects is visible.
- [ ] Own selected site, scan generation/abort controller, facts, file selection and review marks once. A change of connection ID/URL, successful null connection, different site or rescan invalidates them. Same-identity rename/relabel events update displayed context without clearing results.
- [ ] Implement the title-bar APG select-only combobox, with active choices, labelled inactive disabled options and no preselection, even for a single site. Selecting an eligible site starts its scan; Rescan replaces prior results.
- [ ] Implement disconnected, initial/refresh failure, site-loading, no-sites, site-list error + Retry, scanning, no-files, finished and stopped/partial states. Show only actions that can complete their intended operation.
- [ ] Render the files rail, file/status heading, readiness ring, three finding tiles and detail/configuration tile. Select the first Needs-review finding initially, falling back to the first check. Display guidance, questions, original reasons, snapshot, all applicable site banners and the tenant-policy footer.
- [ ] Wire Mark as reviewed and Undo review to the canonical rules. Keep state changes and announcements consistent across the ring, file list, detail and later report capture.

**Visual and interaction contract:**

- Use layout 10a with current **1a Graphite** tokens from `src/app/theme/tokens.css`. Reuse `Tile`, `Ring`, `StatusBadge`, `Button`, `PillGroup`, `Modal`, `ExternalLink` and `useNotify` where applicable.
- Consume semantic roles such as `--tile`, `--text`, `--muted`, `--control-border`, `--primary` and `--review`; add a reusable token at the theme boundary only when needed. Preserve the existing Segoe UI/JetBrains Mono typography and host-driven themes.
- Selection uses the primary role; Needs review uses the review role. Status always includes text/glyphs and counts. Loading/progress announcements are polite and do not repeatedly interrupt a screen reader.
- Apply the repository's **1024×700 desktop minimum**, also checking the 1100×780 handoff size, long names/content and 200% zoom with reachable scrolling. The public-site skill's generic mobile breakpoint is not a new product requirement.
- Keyboard selection, visible focus, disabled explanations and accessible full names must work in both themes. Verify actual control boundaries and focus against their rendered surfaces; retain the flat Graphite direction.

**Exit proof:** page tests exercise real session/reader behavior with the fake host, including switching away during a delayed scan, connection refresh failure/recovery and review invalidation. Update the all-pages build marker when the placeholder disappears. Add export imports and its working action together in P5.7 so this slice compiles independently.

### P5.6 — Complete faithful reports and PDF output

**Owns:** CR-003, WR-001's export behavior and WR-002.  
**Files:** `report/buildReportModel.ts`, relevant report types/fixtures/goldens/tests, `renderPdf.ts`; PDF drawing/table helpers as needed; `src/assets/fonts/` for the static JetBrains Mono TTF and its licence/provenance.

- [ ] Have `buildReportModel` include optional snapshot content once, using P5.3's ownership boundary. Test a snapshot-only sentinel in Needs-review findings for both scopes, with snapshot on and off. Reasons remain mandatory even when they mention configuration.
- [ ] Expand redaction with validated hostname aliases for URL-valued site/environment identifiers, alongside original strings. Cover summaries, reasons, details, snapshots, filenames and PDF title metadata; preserve unrelated hostnames and server-logic filenames. Parse identifiers locally without fetching them.
- [ ] Retain one shared display-ready model for Markdown and PDF. Keep ordering, banners, active/inactive labels, Reviewed reasons, Not scanned entries, scan interval, UTC offset and non-atomic statement consistent.
- [ ] Implement vector PDF with installed `jspdf`/`jspdf-autotable`: DM Sans body, Space Grotesk headings, static JetBrains Mono paths, and a vector checkmark. Acquire the missing TTF as a locally bundled asset with its licence; no new runtime library is needed.
- [ ] Reuse the Phase 20 landscape-A4/36pt-margin design and report palette/A8 adjustments. Correct the stale report reference: the current root handoff README's section 5 is Accessibility, not a report specification. Pin the existing Phase 20 report choices in the owning spec/plan rather than relying on that missing section.
- [ ] Repeat table headings on every page; keep physical rows intact. Split an oversized logical entry into clearly labelled continuation rows so no text is lost or shrunk into unreadability. Draw text directly; the existing build aliases do not support adding HTML-to-PDF rendering.

**Exit proof:** both scopes yield real PDF bytes using the real renderer. Long and hostile-name fixtures prove complete text, row/page handling, metadata redaction and font coverage for the supported character set. Inspect selectable text in a PDF reader. Record any unsupported-character limitation explicitly rather than claiming universal font coverage or silently dropping content. Refresh Markdown goldens only for intended output changes.

### P5.7 — Finish the export lifecycle

**Owns:** CR-004 and the old Phase 24 save-failure gap.  
**Files:** `src/features/inspector/ExportDialog.tsx`, a colocated export-lifecycle hook if needed, `InspectorPage.tsx`, dialog/lifecycle tests; existing report/filename and host save owners.

- [ ] Add the working Export report action for finished/stopped scans with at least one discovered file; disable it for a running scan or zero files.
- [ ] Capture an immutable `SiteResult` and selected file ID when the dialog opens. Default to This file when selected, otherwise Site summary; default Markdown, questions on, snapshot on and redaction off.
- [ ] Give one controller ownership of the snapshot and idle/building/saving lifecycle. Avoid mirrored saving booleans in page and dialog. Reuse the existing 520px `Modal` and radio/checkbox controls.
- [ ] Build the selected report and filename from the captured state before invoking `host.saveFile`, passing the correct extension filter and string/PDF bytes. Recheck validity at the handoff boundary.
- [ ] If results clear before native save starts, close with one “Results changed, so the export was cancelled.” notification and submit nothing. Once native save starts, the submitted snapshot is the content being saved.
- [ ] Settle saving state on every outcome, including rejection. A saved result produces the filename success notice, cancellation closes silently, and a build/save failure produces one useful error and permits retry when its snapshot is still valid. A later invalidation must still work after a failed save.
- [ ] Prevent duplicate submissions; preserve Esc, focus trap and focus return behavior. Do not implement a timeout that reports failure while the host might still write the file.

**Exit proof:** tests cover both scopes/formats and every include/redact combination, frozen review state, pre-save invalidation, changes during native save, rejection followed by invalidation/retry, cancellation and success. Rendered keyboard checks cover the actual dialog. Measure build-to-dialog and confirm-to-toast separately in PPTB.

### P5.8 — Close release gaps and update the product documentation

**Owns:** IN-001, RG-001–RG-006 and release-facing Inspector claims.  
**Files:** `src/skeleton.test.ts`, `tests/buildShape.test.ts`, relevant manifest tests, `README.md`, `docs/usage-manual.md`, `docs/build-manual.md`, Inspector status/evidence records; release configuration/manifest only where the completed artifact requires it.

- [ ] Replace signature-only/placeholder completion assertions with the production reader/page/export/PDF behaviors above. Retain useful scaffold tests.
- [ ] Verify the Inspector provider, picker, scan/rule code and PDF dependencies are actually removed from an Inspector-excluded build after they become reachable. Preserve the single IIFE, bundled assets and PPTB HTML shape.
- [ ] Use the existing release-list mechanism for the candidate: `starter,objects,inspector`. Keep publication contents explicit while the plain build still defaults to all pages. Do not introduce another mode or runtime feature switch.
- [ ] Reconcile the current icon rename with `package.json.icon`, the packaged asset and manifest/build assertions. The planning worktree contains `public/icons/logo.svg` while the manifest/test still name `server-logic-tools.svg`; use the owner's final asset decision.
- [ ] Update README/manuals with the real Inspector journey, host-action download behavior, troubleshooting and report examples. Source screenshots from the completed page with appropriate sample/redacted data.
- [ ] Replace obsolete Prettier commands in active execution instructions with the repository's current scripts. The formatter has already been removed; this is not a formatting migration.
- [ ] Check the next release against FR-12's **v1.0.0-only** Starter harness exception. If that release also requires the deferred AC-4.12 matrix, track completion through the existing generator-behavior-harness plan; do not inherit the exception silently or declare it verified from Inspector tests.

**Exit proof:** the following gates pass for the intended release artifact, or a specific gate remains explicitly open and Inspector release readiness remains pending.

## 6. Audit closure map

| Audit item | Planned owner | Required closure signal |
|---|---|---|
| CR-001 | P5.5 | Production site/session/page journey, hidden-tab invalidation and keyboard operation. |
| CR-002 | P5.2, P5.4 | Real reader with complete paging, bounded work and retained partial evidence. |
| CR-003 | P5.6 | Both PDF scopes, embedded fonts, complete pagination and selectable text. |
| CR-004 | P5.7 | Captured report reaches native save with correct outcomes. |
| WR-001 | P5.3, P5.6 | Snapshot-only sentinel disappears in both scopes when excluded. |
| WR-002 | P5.6 | URL and hostname aliases redact throughout reports and metadata. |
| WR-003 | P5.2, P5.4 | Later-page errors preserve rows and mark inventory incomplete. |
| WR-004 | P5.2 | Protocol/file failure is distinguishable from confirmed transport/auth loss. |
| WR-005 | P5.5 | Failed refresh preserves confirmed identity; focus/visibility recover. |
| WR-006 | P5.3 | Wildcard evidence survives O2 intersections. |
| PR-001 | P5.3 | One grant computation reused, with existing grant/status output preserved. |
| IN-001 | P5.5–P5.8 | Completion tests exercise behavior instead of asserting scaffolding. |
| PB-001 | P5.1, P5.3 | Explicit mixed-evidence matrix and no incomplete-evidence review bypass. |
| PB-002 | P5.1, P5.3 | Unknown terminal ancestor cannot yield Configured. |
| RG-001 | P5.1, P5.2, P5.8 | Verified nextLink/literal transport or verified FetchXML replacement. |
| RG-002 | P5.1, P5.2, P5.5 | Host lifecycle, unsubscribe and observed error classifications. |
| RG-003 | P5.1, P5.2, P5.4 | Populated real handler download and schema/environment-variable access. |
| RG-004 | P5.4, P5.6, P5.7 | Live scan/export timings and captured-screen/output parity. |
| RG-005 | P5.5–P5.7 | Actual rendered keyboard/screen-reader/layout and PDF checks. |
| RG-006 | P5.8 | Offline manifest validity plus actual publication URL/package checks. |

The earlier continuation findings are also dispositioned: failed code reads affect both Table permissions and Outbound (F05); page/export integration lands in dependency order (F07); every save outcome clears the lifecycle correctly (F08); old formatter/theme assumptions are replaced with current repository instructions.

## 7. Verification and stop condition

### Local implementation checks

Establish a current baseline before implementation. Run the focused tests for each changed responsibility during its slice, then run the complete repository checks once after integration:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run build:beta
```

Relevant focused targets are `src/services/pptb`, `src/features/inspector/model`, `src/features/inspector/scan`, `src/features/inspector/report`, the new Inspector session/page/export tests, and `tests/buildShape.test.ts`. Use the resulting actual filenames rather than obsolete plan-only paths. Build-shape tests must exercise both explicit Inspector inclusion and exclusion regardless of local `VITE_RELEASED_PAGES` overrides.

Use the installed validator's exported API for the offline manifest check because v1.0.5's CLI has the documented `--skip-url-checks` defect:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {validatePackageJson} from '@pptb/validate'; const r=await validatePackageJson(JSON.parse(readFileSync('package.json','utf8')),{skipUrlChecks:true}); console.log(JSON.stringify(r,null,2)); process.exit(r.valid?0:1)"
```

Run `npm run validate` separately for actual URL accessibility/publication validation. Validate the final Inspector-enabled artifact after the beta exclusion check, inspect package contents and run the repository's dependency audit. An offline schema pass does not close the online gate.

### Rendered and live gates

| Gate | Evidence to capture |
|---|---|
| RG-001 Paging/literals | Multi-page query, unchanged encoded nextLink/skiptoken, full terminal page and apostrophe/space request fidelity. |
| RG-002 Lifecycle/errors | Actual callback shapes, one subscription with cleanup, same-identity events, successful disconnect, transient refresh rejection, network loss, expired sign-in and 403 denial. |
| RG-003 Real data | Populated handler metadata and byte/text comparison; enhanced-model roles/permissions/settings; nonsecret current/default/missing/denied variables; no value request for a secret definition. |
| RG-004 Timing/parity | Healthy 50-record scan ≤30 s including real file downloads, max four concurrent reads, stopped-scan behavior; report build ≤5 s and native-confirm-to-toast ≤5 s; both formats/scopes compared with captured state and all include/redact choices. |
| RG-005 Rendered UX | Light/dark at 1024×700 and 1100×780, long labels/content and 200% zoom; complete keyboard route, screen-reader announcements, focus/dialog behavior, actual control contrast and selectable PDF text. |
| RG-006 Packaging | Correct IIFE/assets/icon, Inspector inclusion/exclusion, Desktop Debug → Load Local Tool smoke, offline manifest validation and online repository/README reachability. |

Record source/static, automated build/test, rendered-browser and live-environment evidence separately with commands or steps, versions, viewport, fixture/data conditions and observed results. A browser using the fake host proves UI behavior; it does not prove Dataverse permissions, action response shape or native save timing.

**Stop condition:** all section 1 outcomes and the mapped audit closures have passing evidence, the live gates are closed, and the intended package contains the completed Inspector journey. At that point stop feature work. If a required host capability, supported glyph case, release dependency or performance gate remains unresolved, record the exact failing condition and the next evidence/change needed; do not convert the fallback into a completion claim. Publication follows the repository's existing release process.

## 8. Sources and planning evidence

Repository sources inspected for this plan:

- [Inspector audit](spec3check.md), [current spec](docs/specs/001-server-logic-starter-inspector/spec.md), [Inspector plan](docs/specs/001-server-logic-starter-inspector/plan-inspector.md), [continuation findings](docs/plans/10-24-2026-server-logic-remaining-work-findings.md), [S2 observations](findings/logic/probe_findings.md).
- Production Inspector, host adapter, connection/shell, rule/report code and build-shape tests; current `package.json`, installed `@pptb/types` 1.2.7, Graphite tokens and layout handoff.
- Existing Phase 15/20/23/24 plans for schema, PDF and sequencing context; their scratch results are not substituted for production acceptance.

Authoritative contracts refreshed on 2026-10-31:

- [PPTB Dataverse API — actions and functions](https://docs.powerplatformtoolbox.com/tool-development/api-reference/dataverse-api#actions-and-functions): `execute` request model and host transport boundary; installed types anchor compatibility with this repository.
- [Microsoft Learn — Use file column data](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/file-column-data#download-files): file identifiers versus bytes, initializer/block protocol, chunked and nonchunked cases.
- [Microsoft Learn — DownloadBlockResponse](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/downloadblockresponse): binary `Data` response contract.

This planning pass inspected source and documentation. Application tests/builds, rendered UI, live Dataverse actions and actual exports have not been executed as part of writing this plan.
