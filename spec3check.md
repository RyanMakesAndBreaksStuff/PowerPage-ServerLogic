# Logic Inspector — Fresh Implementation and Blocker Audit

**Date:** 2026-10-26  
**Decision:** CHANGES REQUESTED — not ready for an Inspector-enabled release  
**Review mode:** User-defined scope; current implementation, not a branch diff  
**Baseline:** `001-logic-inspector`, HEAD `ce7cc955821188ac8512c2a2c3187350e3939092`  
**Scope:** Logic Inspector page, its connection/site integration, rules, scan reader, report/export logic, and the shared code directly supporting those paths.  
**Files scanned:** 61 complete text files listed below, plus supporting excerpts/searches and a nine-font binary presence inventory.  
**Total findings:** 12 — 4 critical, 6 warning, 1 safe simplification, 1 informational. Two policy questions and six unverified release gates are listed separately.  
**Pass 5 threshold review:** Long evaluator/builder/orchestration functions were inspected; duplicated grant computation and configuration/detail ownership were substantiated. No size-only finding or speculative module split was accepted.

## Summary

The production Inspector journey stops at a placeholder: site selection, scanning, results/review UI and report export are unavailable, and the scanner and PDF renderer throw immediately. Implemented rules and Markdown/report-model code have several independently reproduced defects, but those defects are currently latent because the page does not call those modules. Passing tests and a successful build establish a healthy scaffold, not a completed Inspector.

**Evidence policy:** `plan-inspector.md` and `spec.md` supplied intended requirements only. No finding or completion claim was inherited from previous reviews, documentation status tables, probe reports or project memory. Four specialist lanes inspected current production code; their candidates were reconciled against source and fresh checks. `.scratch/inspector-plan`, design demos and unrelated Starter/Server Objects behavior were excluded from implementation evidence.

### Scorecard

| Audit pass | Grade | Evidence summary |
| --- | --- | --- |
| 1. Wiring | F | Enabled page reaches a placeholder; scanner, evaluator and reports have no production page consumers. |
| 2. Error handling | D | Partial inventory is lost; transport provenance is unavailable; a rejected connection refresh becomes null. |
| 3. Completeness | F | Site/session, reader, results/review UI, PDF and export-controller stages are missing. |
| 4. Dead code / pruning | B | Planned modules are not deletion candidates; one redundant pure grant-set computation can be shared. |
| 5. Structure and bloat | C | Snapshot data is mixed into always-included detail; duplicate grant-set evaluation is avoidable. |
| 6. Hardcoding | A | No independently substantiated environment/policy-literal defect in scope. |
| 7. Security | C | Redaction misses a site hostname alias. Existing host reads are read-only; production dependency audit reports no advisories. |

**Overall grade:** F for an Inspector-complete release. All seven scoped static passes ran; live-host, visual, screen-reader and actual PDF/save acceptance did not.

## CRITICAL — Must Fix

Critical findings below block releasing Inspector as working functionality. They do not imply an Inspector-excluded build must be blocked.

### CR-001: The page and app-scoped site/session stage are missing

**File:** `src/features/inspector/InspectorPage.tsx:4-9`; `src/app/shell/SitePill.tsx:5-10`; `src/app/App.tsx:49-73`  
**Pass:** Wiring, completeness  
**Evidence:** `App` mounts `InspectorPage`, which renders only “Logic Inspector page placeholder.” The title-bar site pill is always `aria-disabled="true"`; there is no production Inspector-site/session provider. `vite.config.ts:20-21` enables all pages when the release list is unset.  
**Problem / impact:** A connected user cannot select a site or reach scan/results/review behavior. The same placeholder appears without a connection. Stories 7–8, including session invalidation while another tab is visible, are unavailable.  
**Fix:** Implement one app-scoped Inspector session owner and the gated site picker/page; reuse the existing rules rather than adding a second evaluator. Until then, explicitly omit `inspector` from release builds.

**Acceptance proof required: Update UI integration tests to demonstrate:**

- Distinct disconnected, loading, no-sites, failed-site-list-with-Retry and no-files states; no automatic site selection, including a single-site environment.
- Active sites selectable and inactive sites disabled; non-development/unknown warnings remain visible without blocking reads.
- Progress, active/inactive file inventory, findings, first-Needs-review selection, guidance/questions/detail and configuration snapshot.
- Review/undo updates counts and summaries; original reasons remain visible. Configured, Not scanned and any read-failure finding cannot be reviewed.
- All 64 three-check status combinations; required banners, partial-inventory notice and tenant-policy-not-verified footer.
- Connection identity changes, site changes and rescans clear results/marks; unchanged id/URL preserves them. Late superseded results are discarded even while Inspector is hidden; nothing is persisted.
- Keyboard-operable picker and results, and Inspector-excluded provider/picker bundle removal.

### CR-002: Both scan-reader entry points throw instead of reading

**File:** `src/features/inspector/scan/scan.ts:4-15`  
**Pass:** Wiring, error handling, completeness  
**Evidence:** Both `runScan()` and `listSites()` synchronously throw `not implemented: phase 15`. Neither issues reads nor reports progress.  
**Problem / impact:** Site acquisition and every real scan are impossible. Declared facts/readability types and adapter tests do not implement the reader.  
**Fix:** Implement the reader over the canonical host adapter, after resolving WR-003/WR-004 below. Do not treat fixture facts as a runtime scan.

**Acceptance proof required: Reader tests must demonstrate:**

- Correct enhanced-model site/component sources, active/inactive records, role links, permission chains, setting normalization and current/default nonsecret environment-variable resolution.
- One OData-literal helper for every filter string; explicit `$select`, deterministic ordering and complete paging.
- At most four in-flight reads, per-request retry behavior and `Scanned X of N`; no record-count cap.
- A failed configuration/file read affects only dependent checks. Unsupported file content becomes the non-reviewable handler-code read-failure fallback, not scan-wide connection loss.
- Partial inventory/evidence survives transport loss; untouched evidence is Not scanned. Confirmed connection changes clear rather than retain results.
- Scan identity and cancellation/supersession checks prevent stale publication and further avoidable reads after cancellation, including retry waits. Healthy 50-record timing must be measured separately.

### CR-003: PDF rendering is entirely unimplemented

**File:** `src/features/inspector/report/renderPdf.ts:3-4`; `src/assets/fonts/fonts.css:6,14,22`  
**Pass:** Completeness  
**Evidence:** `renderPdf()` unconditionally throws `not implemented: phase 20`. Local assets contain DM Sans and Space Grotesk TTFs, but JetBrains Mono exists only as WOFF2; no report PDF/font-coverage tests exist.  
**Problem / impact:** Neither PDF scope can be produced. Pagination, metadata, embedded-font assignments, vector check glyphs and selectable text are missing behavior—not demonstrated defects in an existing renderer.  
**Fix:** Implement the renderer using the installed PDF dependencies and the shared report model; add licensed static JetBrains Mono TTF and the required coverage/pagination tests.

**Acceptance proof:** Both scopes produce valid PDF bytes; redacted title metadata and required content match the model. Long fixtures prove repeated table headers, unsplit rows and no omitted content. Check each written character against the assigned font, draw `✓` as a vector, and verify selectable text. Existing OFL notices were found; no licence defect was established.

### CR-004: Report export has no production controller or save path

**File:** `src/features/inspector/InspectorPage.tsx:4-9`; `src/features/inspector/report/buildReportModel.ts:113`; `src/services/pptb/pptbHost.ts:137-148`  
**Pass:** Wiring, completeness  
**Evidence:** The page has no Export report action/dialog and no caller connecting report construction/rendering/filename generation to `host.saveFile`. The save adapter already accepts content up front and distinguishes saved/cancelled outcomes.  
**Problem / impact:** Markdown is also unavailable to users despite its implemented renderer. Scope/options, dialog-open snapshot capture, cancellation on cleared results and export feedback do not exist.  
**Fix:** Add the export dialog/controller: capture results when it opens, build the selected format from that snapshot, then call the host save adapter. Keep this separate from scanner/session responsibilities.

**Acceptance proof:** Finished/stopped scans with discovered files enable export; running/zero-file states do not. Verify scope/default/include/redact choices, focus trap/Esc/focus return, captured-state immutability, clearing-results cancellation before save, filename/content/filter handoff and success/failure/cancel notifications. Once the save dialog opens, its already-built snapshot remains the saved content. Measure both five-second budgets on the real host.

## WARNING — Should Fix

These are current defects in implemented supporting modules or concrete integration-contract blockers. They must be addressed before wiring a supposedly complete Inspector; current users cannot yet trigger the latent rules/report paths through the placeholder.

### WR-001: Disabling the snapshot still exports snapshot configuration

**File:** `src/features/inspector/report/buildReportModel.ts:55-71,175-182`; `src/features/inspector/report/renderMarkdown.ts:13-26`; `src/features/inspector/model/checks.ts:180-231`  
**Pass:** Structure, completeness  
**Evidence:** The evaluator embeds setting snapshot rows in `Finding.detail`. `checkModel()` always copies that detail; `findingSection()` always renders it. `options.snapshot=false` only removes the separate snapshot section.  
**Reproduction:** Evaluate an HttpClient handler with `AllowedDomains=snapshot-only.example` and `AllowNetworkingToAllDomains=true`. Export either scope with questions/snapshot off. The snapshot heading is absent and `model.snapshot` is null, but the report still prints the setting value. The O4 original reason does not contain that hostname.  
**Impact:** The include option does not exclude the configuration content it promises to omit.  
**Fix:** Give explanatory finding detail and optional snapshot rows distinct ownership; conditionally include snapshot data once. Do not use brittle string-prefix filtering or remove required original reasons.  
**Acceptance proof:** For Needs-review findings in both scopes, a snapshot-only sentinel is absent everywhere when off and present when on; reasons/guidance remain. Existing Reviewed-file exclusion fixtures do not exercise this path.

### WR-002: Redaction misses a site's bare hostname when its domain is a URL

**File:** `src/features/inspector/report/buildReportModel.ts:27-52`; `src/features/inspector/model/checks.ts:225,256`; `src/features/inspector/report/reportFixtures.ts:63-67`  
**Pass:** Security  
**Evidence:** The redactor registers exact connection/site strings only. URL-valued site domains are supported in existing inputs; host-only allow-list entries produce another representation of the same identifier.  
**Reproduction:** Use site domain `https://dev.example.com`, allow-list `dev.example.com` and all-domains false. With redact on, both scopes replace the explicit site identity but retain `dev.example.com` in outbound findings/snapshots. Parent probes reproduced the leak independently.  
**Impact:** A report requested as redacted still exposes an identifying site hostname.  
**Fix:** Register validated hostname aliases for URL identifiers as well as their original forms, without fetching anything. Preserve server-logic filenames as required.  
**Acceptance proof:** URL/bare-host cases in both scopes are redacted across summaries, reasons, details and snapshots; unrelated hosts and file names remain intact. PDF metadata also needs coverage when CR-003 is implemented.

### WR-003: Later-page failure discards inventory already read

**File:** `src/services/pptb/dataverseRead.ts:92-114`; `src/services/pptb/host.types.ts:17-24,38`  
**Pass:** Error handling, completeness  
**Evidence:** `fetchAllPages()` accumulates rows in a local array, then lets a later failure reject without exposing that array. `queryAll` returns only complete rows or a `HostReadError` with status; no partial inventory reaches a caller. The strict full-page/no-nextLink failure has the same loss.  
**Reproduction:** First page contains one component and a nextLink; second page rejects with 403. The public error has status 403 and no partial rows; the discovered component is unrecoverable through the host contract.  
**Impact:** The future reader cannot satisfy partial-listing/inventory-incomplete behavior using the mandated adapter path.  
**Fix:** Preserve accumulated rows on failure in the canonical paging/error contract, or provide an equivalent page-observation seam. Mark inventory incomplete and keep discovered records; do not silently accept the inventory as complete.  
**Acceptance proof:** Later-page 403, 401, exhausted 503 and strict-terminal-page rejection retain prior rows, preserve the failure classification and prevent an all-complete site result.

### WR-004: Transport provenance is lost before the reader can classify a failure

**File:** `src/services/pptb/hostErrors.ts:48-52`; `src/services/pptb/dataverseRead.ts:53-54,147`; `src/services/pptb/host.types.ts:17-24`  
**Pass:** Error handling, type/boundary structure  
**Evidence:** A raw no-status host rejection becomes `HostReadError/status:null`; locally detected malformed responses and unsupported file responses have the same public name/status shape. Original network error identity is logged, not retained in a typed classification.  
**Reproduction:** A synthetic `NetworkError` and a successful `{}` file response both surface as `HostReadError` with null status, without transport/cause classification. The file response is correctly non-retryable, but the future reader cannot safely use null status as “connection lost.”  
**Impact:** Blanket null-status classification would stop scans for local/protocol errors; treating all such errors as local would miss genuine network interruption. Actual live-host network/auth shapes remain unverified in this audit.  
**Fix:** Preserve minimal, sanitized error provenance/classification in the adapter. Distinguish local validation/protocol/file failures from confirmed transport/auth loss; do not expose raw payloads or infer transport from null status alone.  
**Acceptance proof:** Realistic network, 401, 403, transient no-status, malformed-page and unsupported-file fixtures exercise distinct reader outcomes; unsupported code content affects its file only. Pin live-host shapes before claiming transport support.

### WR-005: A transient connection refresh falsely clears the confirmed connection

**File:** `src/app/ConnectionProvider.tsx:13-29`; `src/app/ConnectionProvider.test.tsx:46-76`  
**Pass:** Error handling  
**Evidence:** Every rejected refresh calls `setConnection(null)`. Refreshes are scheduled on mount and connection events only; focus/visibility do not retry. Existing tests cover successful changes, not this rejection case.  
**Reproduction:** Load connection A, emit a connection event and reject that refresh without disconnecting. Consumers switch to null; subsequent focus/visibility events issue no recovery read. Parent React probes reproduced this.  
**Impact:** An uncertain host response is indistinguishable from a confirmed disconnect. Wiring Inspector invalidation directly to that value would discard valid results/marks. Existing result loss is not claimed, because those results do not yet exist.  
**Fix:** Preserve the last confirmed connection on refresh failure; distinguish failure from a successful null result and add recovery triggers. Keep the working latest-request/unmount protection.  
**Acceptance proof:** A rejected refresh preserves A and later focus/visibility can recover; successful B/null reads still propagate while Inspector is hidden.

### WR-006: A known unsupported wildcard reason disappears alongside O2

**File:** `src/features/inspector/model/checks.ts:208-229`  
**Pass:** Completeness  
**Evidence:** The O2 early return precedes collection of parsed wildcard reasons. A valid wildcard-containing domain list plus an invalid, duplicate or unreadable all-domains setting loses that independent warning.  
**Reproduction:** HttpClient code, `AllowedDomains=*.example.com,api.example.com`, all-domains `maybe` produces only “Couldn't interpret …”; there is no wildcard reason. The parent independently reproduced the invalid-Boolean intersection.  
**Impact:** Known configuration evidence is omitted from the finding and any subsequently Reviewed report. The intended rules require the wildcard explanation alongside the chosen row.  
**Fix:** Collect known wildcard reasons before returning O2, retaining O2's leading summary and the existing O0/O1 code-based precedence.  
**Acceptance proof:** Invalid, duplicate and unreadable-environment-variable Boolean intersections retain wildcard reasons. Read-failure cases stay non-reviewable; no-use O0/O1 outcomes remain unchanged.

## PRUNE — Safe Simplification

### PR-001: Share the grant-set computation within each file evaluation

**File:** `src/features/inspector/model/checks.ts:108-115,234-255`  
**Pass:** Pruning, structure  
**Evidence:** `tablePermissions()` computes `buildGrantSet(facts,file)`, and `evaluateFileChecks()` computes the same pure grant set again for the snapshot. Both evaluate the same facts without intervening mutation.  
**What:** Compute once in `evaluateFileChecks`, pass the grant set plus analysis into `tablePermissions`, and reuse it for the snapshot.  
**Why safe:** Removes a duplicate permission/parent-chain traversal without deleting policy, validation, snapshots or consumers. Preserve the existing output fixtures and verify one computation per file.  
**Measured savings:** One grant-set computation per file; line-count and timing savings were not measured. Non-blocking.

## INFO — Minor Observations

- **IN-001:** The green suite is not an Inspector completion gate. `tests/buildShape.test.ts:95-102` explicitly requires the placeholder string; `src/skeleton.test.ts:131-145` checks scanner/PDF signatures without executing them. There are no production page/reader/export/PDF behavior tests for the missing stages. Preserve useful scaffold checks, but add real behavior gates and replace the placeholder marker when implementing the page. Also check Inspector/jsPDF removal after those modules become reachable, not just removal of the current placeholder (`tests/buildShape.test.ts:105-118`).

## Potential Blockers / Policy Decisions

These are reproduced observations needing a policy decision, not counted as confirmed spec violations.

### PB-001: Mixed failed/unscanned evidence has inconsistent precedence

**Source:** `src/features/inspector/model/checks.ts:64-83,169-176,213-214`; `src/features/inspector/model/grantSet.ts:43-50`.

With failed role inventory and not-yet-scanned file-role assignment, Web role is Not scanned with a read-failure reason, while Table permissions is Needs review. Some other branches similarly let unscanned evidence mask already-known adverse evidence. The guide specifies both display states but does not settle every intersection. Decide the precedence before reader/UI integration; a conservative option is to keep known failures/adverse reasons visible as Needs review and reserve Not scanned for wholly unavailable dependent evidence. Add an evidence-state matrix rather than relying on the existing output-count matrix alone.

### PB-002: A Parent permission can appear configured despite an unknown terminal-ancestor scope

**Source:** `src/features/inspector/model/grantSet.ts:24-40,71-87`; `src/features/inspector/model/checks.ts:160-166`.

A Parent child linked to `staff`, whose terminal parent has unknown scope and is independently linked only to `other`, produces Configured/no reasons for the staff file. Traversal stops at any non-Parent scope, including null; only independently included grant scopes are checked afterward. Decide whether an unknown ancestor must make its linked descendants unresolved/Needs review. The conservative recommendation is yes. Test both role-link variants and preserve the inactive-ancestor exclusion rule.

## Unverified Release Gates and External Dependencies

No historical probe outcome is assumed here. These gates remain open because this audit did not execute them against a live PPTB environment or a completed page/export implementation.

| Gate | Current evidence / potential blocker | Required fresh proof |
| --- | --- | --- |
| RG-001: Paging and literal fidelity | `NEXT_LINK_UNVERIFIED=true` remains active (`dataverseRead.ts:13-19`); full final pages without links fail closed. | With multiple pages, inspect unchanged nextLinks/skiptoken encoding and the apostrophe/space filter. Verify terminal-full-page behavior. Select verified nextLink support or the required FetchXML-cookie alternative; do not simply disable the gate. |
| RG-002: Host lifecycle and error shapes | Event hub consumes argument two only (`pptbHost.ts:69-82`); network/auth classification needs WR-004. | Capture both callback shapes, re-read identity after changes/renames/other-connection events, verify unsubscribe, and separately exercise network loss, expired sign-in and denied 403 reads. Record names/status, not sensitive payloads. |
| RG-003: Real schema, file and environment-variable access | Reader is missing; adapter accepts text/value-text file bodies and rejects `{}` (`dataverseRead.ts:135-147`). No successful real handler download is claimed. | Use an owner-confirmed populated handler. If the host has no usable permitted read path, retain the specified per-file non-reviewable code-read fallback; do not introduce `execute` under a read-only contract. Verify nonsecret current/default/missing/denied envvars, secret definitions with no value read, and encoded schema names. The probe script's default object-shape output does not establish envvar row counts or populated-file metadata (`scripts/s2-probe.js:78-95`). |
| RG-004: Performance and actual export parity | A stub cannot establish the 30-second scan NFR; synthetic report tests cannot establish the real five-second build/save budgets. | Time a healthy 50-record scan with measured max concurrency; exercise stopped scans. For both scopes/formats compare actual output with the captured screen state, including all include/redact combinations, long content and save success/failure/cancel. |
| RG-005: Accessibility and rendered layout | Shared tabs/badges/modal primitives have tests, but the actual picker/results/export UI is absent. | Keyboard and screen-reader acceptance, both-theme contrast/glow measurement, selectable PDF text and minimum 1024×700 viewport checks with long labels/content. A suggested long-connection-name overflow risk was not promoted to a finding without rendered measurement. |
| RG-006: Package/publication gate | Installed validator CLI v1.0.5 failed URL accessibility checks even with `--skip-url-checks`. Its implementation hardcodes `skipUrlChecks:false` (`node_modules/@pptb/validate/dist/cli.js:54`). | Use the exported API for an explicit offline schema check; separately resolve/verify live repository/readme URL access before publication. The failure here is not proof those URLs are broken. No publish operation or owner release approval was performed. |

## Fresh Verification

| Check | Result | What it establishes |
| --- | --- | --- |
| `npm test` — parent, after reconciliation | **PASS: 89 files, 1,348 tests; 32.76 s** | Existing full suite, including all 12 build-shape tests. Not proof of missing Inspector behavior. |
| `npm run build` | **PASS** | TypeScript project build and production IIFE build. The generic >500 kB chunk warning is not an Inspector defect; IIFE output is intentional. |
| Scoped ESLint command below | **PASS, exit 0** | Existing Inspector/supporting code has no scoped lint errors. |
| `npm audit --omit=dev --json` | **PASS: 0 advisories** | Installed production dependency audit, not a penetration test or all-dev-dependency audit. |
| `npx --no-install pptb-validate --skip-url-checks` | **FAIL, exit 1** | CLI v1.0.5 reports repository/readme URL accessibility errors; the supplied flag does not disable its URL checks. |
| `validatePackageJson(...,{skipUrlChecks:true})` via installed API | **PASS: valid, no errors** | Offline manifest/schema validation. Only an optional website warning; no mandatory manifest defect found. |
| Temporary parent forensic probes | **PASS: 10 observations** | Independently reproduced WR-001 through WR-006 plus PB-001/PB-002; the two report defects were each exercised in both scopes. These assert observed current behavior, not desired behavior. |

The temporary probe file was removed before the full suite. An initial redaction probe assertion mistakenly expected unescaped Markdown brackets; correcting that test assertion preserved and verified the hostname-leak observation. No application source or permanent tests were changed.

Scoped lint command:

```powershell
npx eslint src/features/inspector src/services/pptb src/lib/code-analysis src/app/ConnectionProvider.tsx src/app/useActiveConnection.ts src/app/App.tsx src/app/shell/SitePill.tsx src/types/inspector.ts src/types/report.ts tests/buildShape.test.ts --max-warnings=0
```

Reproducible offline validator substitute:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {validatePackageJson} from '@pptb/validate'; const r=await validatePackageJson(JSON.parse(readFileSync('package.json','utf8')),{skipUrlChecks:true}); console.log(JSON.stringify(r,null,2)); process.exit(r.valid?0:1)"
```

Specialist focused runs were subsequently corroborated by the parent's full suite:

- Rules/analysis: `npx vitest run src/features/inspector/model src/lib/code-analysis` — 10 files / 382 tests passed.
- Scan adapter: `npx vitest run src/services/pptb src/features/inspector/scan` — 3 files / 113 tests passed; the scan directory itself has no behavior tests.
- Reports: `npx vitest run src/features/inspector/report` — 3 files / 18 tests passed. Both checked-in Markdown golden artifacts matched freshly generated bytes; no separate golden defect was found.
- UI context: `npx vitest run src/app/App.test.tsx src/app/releasedPages.test.ts src/app/shell/TopTabs.test.tsx src/components/StatusBadge.test.tsx` — 4 files / 23 tests passed.

**Not run:** Live PPTB/Dataverse acceptance, browser/screenshots, contrast or screen-reader measurement, completed PDF inspection, actual file saves and the three real-host performance budgets. No existing documentation result substitutes for these checks.

## Pruning and Simplification Plan

### Safe to Delete

None. Unwired planned Inspector modules are incomplete feature work, not proven obsolete code.

### Should Inline

None substantiated.

### Structural Simplifications

| Finding | Current complexity | Simpler end state | What disappears |
| --- | --- | --- | --- |
| PR-001 | Two identical grant-set/parent-chain traversals per file. | One computed grant set shared by finding and snapshot construction. | The second traversal and duplicate computation ownership. |
| WR-001 | Snapshot configuration appears both in optional snapshot data and always-included finding detail. | Separate explanatory detail from one optional snapshot representation. | Unconditional configuration duplication and inclusion-option leakage. |

### Should Split

No arbitrary file split recommended. Implement the already-required session, reader, renderer and export-controller responsibility boundaries; do not add pass-through layers.

### Dependencies to Remove

None proven safe or appropriate to remove; PDF dependencies are needed by the required renderer and already exercised by the library probe.

### Estimated Impact

- Lines/files removable and bundle reduction: not measured.
- Dependencies removable: none proposed.
- PR-001 removes one redundant grant-set computation per evaluated file.

## Action Items

1. [ ] Keep Inspector out of public release lists until the complete journey is proven; the unset default currently includes it.
2. [ ] Resolve mixed-evidence and unknown-ancestor policy questions; fix partial-row and failure-provenance contracts, plus transient connection recovery.
3. [ ] Implement and test the reader, then the app-scoped site/session and Inspector results/review UI.
4. [ ] Correct wildcard/O2 reason preservation, snapshot exclusion and hostname redaction with the reproduced intersection fixtures.
5. [ ] Implement PDF/font/pagination support and the snapshot-based export controller; add executable reader/page/export/PDF gates instead of relying on signature/placeholder tests.
6. [ ] Complete all six fresh release gates. Share grant computation if desired; do not expand into unrelated feature cleanup.

## Reviewed File Inventory

The following **61 text files** were read completely by a specialist or the parent. Executing other full-suite tests does not mean their unrelated feature source was audited.

```text
src/features/inspector/InspectorPage.tsx
src/features/inspector/model/checks.ts
src/features/inspector/model/copy.ts
src/features/inspector/model/grantSet.ts
src/features/inspector/model/rules.ts
src/features/inspector/model/settings.ts
src/features/inspector/model/checks.test.ts
src/features/inspector/model/grantSet.test.ts
src/features/inspector/model/rules.test.ts
src/features/inspector/model/settings.test.ts
src/features/inspector/model/fixtures.ts
src/features/inspector/scan/scan.ts
src/features/inspector/report/buildReportModel.ts
src/features/inspector/report/markdownEscape.ts
src/features/inspector/report/renderMarkdown.ts
src/features/inspector/report/renderPdf.ts
src/features/inspector/report/reportFileName.ts
src/features/inspector/report/reportModel.types.ts
src/features/inspector/report/buildReportModel.test.ts
src/features/inspector/report/markdownEscape.test.ts
src/features/inspector/report/renderMarkdown.test.ts
src/features/inspector/report/reportFixtures.ts
src/features/inspector/report/__golden__/file.md
src/features/inspector/report/__golden__/site.md
src/types/inspector.ts
src/types/report.ts
src/types/http.ts
src/lib/code-analysis/codeAnalysis.types.ts
src/lib/code-analysis/structure.ts
src/lib/code-analysis/structureAst.ts
src/lib/code-analysis/structureInsert.ts
src/lib/code-analysis/structure.connector.test.ts
src/lib/code-analysis/structure.names.test.ts
src/lib/ringGeometry.ts
src/services/pptb/dataverseRead.ts
src/services/pptb/dataverseRead.test.ts
src/services/pptb/pptbHost.ts
src/services/pptb/pptbHost.test.ts
src/services/pptb/hostErrors.ts
src/services/pptb/host.types.ts
src/services/pptb/fakeHost.ts
src/services/pptb/fakeHost.test.ts
src/app/App.tsx
src/app/App.test.tsx
src/app/ConnectionProvider.tsx
src/app/ConnectionProvider.test.tsx
src/app/useActiveConnection.ts
src/app/releasedPages.ts
src/app/shell/SitePill.tsx
src/app/PageErrorBoundary.tsx
src/assets/fonts/fonts.css
src/assets/fonts/OFL-DMSans.txt
src/assets/fonts/OFL-SpaceGrotesk.txt
src/assets/fonts/OFL-JetBrainsMono.txt
package.json
vite.config.ts
tsconfig.app.json
.gitignore
tests/buildShape.test.ts
scripts/s2-probe.js
src/skeleton.test.ts
```

Supporting review covered the title bar/tab/connection-label styling and primitives, main entry point, relevant guide requirements and installed validator implementation. The nine font binaries were inventoried for presence/references only; their glyph coverage was not tested. Transitive insertion/ring code was context only, not an additional feature audit. Prior documentation findings/statuses, scratch implementations and unrelated application features were excluded.
