# Phase 5 Documentation and Release Proof Implementation Plan

**Goal:** Document the completed Inspector journey and record passing evidence for the intended release artifact.

**Architecture:** Task 10 consumes the completed production path from Tasks 2–9. Phase 12 owns wire observations; the release ledger references them and owns final automated, rendered and live acceptance outcomes.

**Tech stack:** Existing npm scripts, installed PPTB validator API, PowerShell, Markdown and PPTB Desktop.

**Scope:** Task 10 in the [Phase 5 plan](../archive/11-01-2026-phase-5-logic-inspector.md).

**Out of scope:** Publishing, unrelated source fixes and assuming live acceptance from browser fakes.

---

### Task 10: Document the delivered journey and prove the intended release artifact

**Owns:** P5.8 release-facing documentation and RG-001–RG-006 evidence closure; this task consumes the production behaviors and build-shape checks from Tasks 2–9. It also enforces the separate FR-12 release dependency on the existing generator harness plan.

**Files:**

- Create: `scripts/validate-manifest.mjs` — script-file entry point for the installed validator's offline API.
- Create: `findings/logic/phase5-release-evidence.md` — dated evidence ledger for the completed Inspector artifact.
- Create: `docs/images/usage-inspector-review.png` — captured completed Inspector review UI with sample data.
- Create: `docs/images/usage-inspector-export.png` — captured completed export dialog with sample data.
- Modify: `README.md` — product entry point and Inspector journey.
- Modify: `docs/usage-manual.md` — scan/review/export instructions and troubleshooting.
- Modify: `docs/build-manual.md` — explicit included/excluded build commands and validation.
- Modify: `docs/archive/status-2026-10-23.md` — append current status/evidence link, preserving historical observations.
- Signal: `findings/logic/phase5-release-evidence.md` — every gate is explicitly Pending until observed.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `findings/logic/phase5-release-evidence.md` with these complete initial contents:

```markdown
# Phase 5 Inspector release evidence

Status: Pending — implementation and release checks must be executed.

Planning baseline: `docs/archive/11-01-2026-phase-5-baseline.md`.
Implementation plan: `docs/archive/11-01-2026-phase-5-logic-inspector.md`.
S2 wire evidence owner: `docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md`.
Generator release dependency: `docs/plans/10-24-2026-generator-behavior-harness.md` (removed in `820d7b8`; see `git show 820d7b8^:docs/plans/10-24-2026-generator-behavior-harness.md`).

## Build identity

Not captured. Record observation date, commit, dirty-worktree state, explicit release list, Node/npm versions, PPTB Desktop/API versions, runtime version, artifact digest and package file list at verification time. Do not record environment IDs, source text, tokens or credentials.

## Automated gates

| Gate | Status | Evidence |
|---|---|---|
| TypeScript | Pending | No integrated run recorded. |
| ESLint | Pending | No integrated run recorded. |
| Full Vitest suite | Pending | No integrated run recorded. |
| Default build | Pending | No integrated run recorded. |
| Explicit Inspector-excluded build | Pending | No integrated run recorded. |
| Explicit Inspector-enabled final build | Pending | No integrated run recorded. |
| Offline manifest API | Pending | Must validate the final artifact's manifest. |
| Online publication URLs | Pending | `npm run validate` must pass. |
| Full dependency audit | Pending | `npm audit` must pass under FR-12. |
| Package contents | Pending | Inspect final artifact and npm package listing. |
| FR-12 generator matrix dependency | Pending | v1.0.0-only exception is not inherited by a subsequent release. |

## Rendered and live gates

| Gate | Status | Evidence |
|---|---|---|
| RG-001 paging/literals | Pending | Link to dated Phase 12 wire observations. |
| RG-002 lifecycle/errors | Pending | Link to dated Phase 12 event/error observations and hidden-tab behavior. |
| RG-003 populated handler/schema/envvars | Pending | Link to dated Phase 12 metadata/byte-comparison observations. |
| RG-004 timing/output parity | Pending | Healthy 50-file scan, measured concurrency and both report timing budgets. |
| RG-005 rendered accessibility/PDF | Pending | Viewports, themes, zoom, keyboard/screen reader, contrast and selectable text. |
| RG-006 Desktop/package/publication | Pending | Final artifact local-load smoke, manifest and online URL checks. |

## Observations

None yet. For each observation record the command or user steps, versions, fixture/data conditions, viewport where relevant, actual output, pass/fail result and evidence path. A failed or unavailable check stays open with its exact next action. Separate source inspection, automated tests, rendered-browser proof and live-environment proof.

## Completion

Not release-ready. Change this statement only after every required gate above has a passing observation and every acceptance outcome in the delivery brief is mapped to that evidence. Publication follows the existing release process.
```

- [ ] **Step 2: Capture the current signal**

Run: `Select-String -Path 'findings/logic/phase5-release-evidence.md' -Pattern '\| (Pending|Failed|Blocked) \|'`

Expected: all 17 gate rows are Pending; no release-ready claim exists.

- [ ] **Step 3: Implement the minimum fix**

Create `scripts/validate-manifest.mjs` with these complete contents:

```javascript
import { readFileSync } from 'node:fs';
import { validatePackageJson } from '@pptb/validate';

const result = await validatePackageJson(
  JSON.parse(readFileSync('package.json', 'utf8')),
  { skipUrlChecks: true },
);
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.valid ? 0 : 1;
```

This uses the validator already present in the execution environment. If unavailable after a clean install, provide the existing PPTB development validator before running this task; an absent tool is a blocked gate, not a pass. Do not add another runtime dependency. The script-file form is necessary in LeanCTX environments that block inline `node -e`.

In `README.md`, replace the opening description with:

```markdown
Server Logic Tools is a Power Platform ToolBox (PPTB) tool for creating Power Pages server logic starters, looking up the `Server.*` APIs, and reviewing an enhanced-model site's server logic configuration before release.
```

Append to `## What you can do`:

```markdown
- **Logic Inspector** uses your PPTB connection to scan an enhanced-model site, inspect access and networking findings, mark eligible findings reviewed, and export the captured review as Markdown or PDF.
```

Insert this complete section immediately before `## Build from source`:

```markdown
## Review a site with Logic Inspector

1. Select the environment connection in PPTB and open **Logic Inspector**.
2. Open the title-bar site picker and choose an active enhanced-model site. No site is selected automatically.
3. Follow **Scanned X of N**, then select a file and inspect its Web role, Table permissions and Outbound networking findings.
4. Review the original reasons and configuration. Use **Mark as reviewed** only where available, or **Undo review** to restore a finding.
5. Choose **Export report**, select This file or Site summary, choose Markdown or PDF and the include/redaction options, then save through PPTB.

Inspector downloads existing handler bytes through Dataverse's `InitializeFileBlocksDownload` and `DownloadBlock` actions, using PPTB authentication. It analyses the downloaded text; it does not execute it. Review marks are session-only. Failed or missing required evidence cannot be made Ready by marking it reviewed.

Reports capture the review when the export dialog opens. They retain original reasons, scan provenance and the configuration-review/tenant-policy limitations. See the [Inspector guide](docs/usage-manual.md#use-logic-inspector) for partial scans, retries and export behavior.
```

Change the two Documentation table descriptions to include Inspector usage and explicit release contents. Replace the sentence about six screenshot placeholders with “The usage manual includes captured Inspector review and export examples.” Existing Starter screenshot placeholders remain outside this task. Replace README's source-build example with the explicit final-candidate PowerShell build below; explain that `build:beta` remains the Starter + Server Objects exclusion check.

In `docs/usage-manual.md`, add Logic Inspector to the opening audience sentence and add `[Use Logic Inspector](#use-logic-inspector)` to Contents. Insert this section immediately before `## Manage your session`:

```markdown
## Use Logic Inspector

### Connect and scan

Select a connection in PPTB, then open **Logic Inspector**. The title bar shows the last confirmed connection and environment label. If a refresh fails, Inspector reports that failure without treating it as a confirmed disconnect; refocus the tool or retry after the host recovers.

Open the title-bar site picker. It lists enhanced-model Power Pages sites; inactive sites are labelled and disabled. Choose an active site to start scanning. A single site still requires your selection. Test, UAT, Production and Unknown labels show a non-blocking development-site warning.

The scan lists active and inactive handler records and reports **Scanned X of N**. Inactive handlers are checked because they may be reactivated. An empty successful scan says **No server logic found on this site**. A failed site list shows **Couldn't load sites** and **Retry**, rather than pretending no sites exist.

### Interpret and review findings

Select a file, then choose **Web role assigned**, **Table permissions** or **Outbound networking**. The detail shows guidance, questions, original reasons and configuration. Learn links open through PPTB.

| Status | Meaning |
|---|---|
| Configured | The required evidence was obtained and this configuration check found no issue. |
| Needs review | A configuration finding, analysis limit, failed read or known issue with incomplete evidence requires attention. |
| Reviewed | You acknowledged an eligible finding; its original reasons remain visible. |
| Not scanned | Required evidence was not read before interruption, without an already-known failure or adverse finding. |

The ring counts Configured and Reviewed as addressed. **Mark as reviewed** is unavailable when any required evidence failed to read or remains unscanned. Successfully downloaded empty/unparseable code and other analysis limits may be reviewed. Reviewing does not repair configuration or prove effective access. **Undo review** restores the original finding and updates the ring and file summary.

![Logic Inspector showing file findings and review details](images/usage-inspector-review.png)

### Recover a partial scan

A network or authentication interruption on the same confirmed connection keeps obtained evidence. Unread dependencies remain Not scanned. A failed inventory displays **Inventory incomplete. Reconnect and rescan.**; the discovered set is not claimed to be the entire site.

Reconnect and choose **Rescan**. Rescanning, choosing another site, a confirmed connection ID/URL change or a confirmed disconnect clears old results and marks, including while another tab is visible. Renaming or relabelling the same connection preserves them. A successful retry replaces the previous scan; results are not persisted across tool sessions.

### Export a captured review

Export is available after a finished or stopped scan with at least one discovered file. It is disabled during scanning and for zero files.

1. Choose **Export report**. This captures the current results and selected file.
2. Choose **This file** or **Site summary**; the selected file is the default when available.
3. Choose **Markdown** or **PDF**. Markdown is the default.
4. Choose whether to include questions and configuration snapshots, and whether to redact environment/site identifiers. Questions and snapshots default on; redaction defaults off.
5. Choose **Export Markdown** or **Export PDF**, then complete PPTB's save dialog.

![Logic Inspector export options](images/usage-inspector-export.png)

Disabling snapshots removes optional raw configuration, while original finding reasons remain. Redaction covers environment/site names, URLs and matching hostname aliases, including site-report filenames and PDF metadata; server-logic filenames remain intact. Markdown and PDF preserve Configured, Reviewed, Needs review and Not scanned separately.

Later review changes do not alter the captured report. If results clear before native saving begins, the export closes with **Results changed, so the export was cancelled.** Once native saving begins, the submitted snapshot is the content being saved. Cancelling native save closes silently; a build/save failure reports an error and allows retry while its captured scan remains valid.

Every report states its scan interval, UTC offset, non-atomic collection, configuration-review scope and unverified tenant outbound policy. Validate effective access with a real site user. PDF uses locally bundled fonts; an unsupported character must produce an explicit error rather than silently omit text, and Markdown remains available.
```

Append these rows to the usage Troubleshooting table:

```markdown
| Couldn't load sites | Check the active PPTB connection and enhanced-model read access, then choose Retry. Standard-model sites are not listed. |
| Couldn't read handler code | Confirm access to the populated `powerpagecomponent.filecontent` column and the two Dataverse download actions, then rescan. Reviewing cannot replace missing source evidence. |
| A configuration check cannot be reviewed | Resolve its failed or unscanned required evidence and rescan. Analysis limits with obtained evidence remain reviewable. |
| An environment-variable-backed setting is unreadable | Check nonsecret definition/value access and the variable's current/default configuration. Inspector never reads secret values. Power Pages may retain a cached value until the site restarts. |
| PDF export rejects a character | Preserve the original text and export Markdown; report the character/font case. Do not replace or drop content to obtain a superficially successful PDF. |
| Export was cancelled after results changed | Open Export again after the replacement scan finishes. The previous capture belonged to an invalidated scan. |
```

In `docs/build-manual.md`, keep the existing two-page build section and add this complete section immediately before `## Run development workflows`; add its heading to Contents and update the introduction to cover all three pages:

````markdown
## Build an Inspector-enabled candidate

Select publication contents explicitly. A plain build defaults to all pages, while beta defaults to Starter and Server Objects; shell or Vite environment configuration can override those defaults.

```powershell
$previousPages = $env:VITE_RELEASED_PAGES
try {
  $env:VITE_RELEASED_PAGES = 'starter,objects,inspector'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Inspector-enabled build failed' }
} finally {
  if ($null -eq $previousPages) {
    Remove-Item Env:VITE_RELEASED_PAGES -ErrorAction SilentlyContinue
  } else {
    $env:VITE_RELEASED_PAGES = $previousPages
  }
}
```

Run the exclusion check first and this included build last before loading or packaging `dist/`. The final output must contain the completed picker, scan/review page and both report formats. An excluded build must omit the Inspector provider, picker, feature code and PDF implementation/dependencies.

Use `node scripts/validate-manifest.mjs` for offline manifest validation and `npm run validate` for online repository/README accessibility. Validator 1.0.5's CLI ignores `--skip-url-checks`; an offline pass does not close the online gate. Record the installed validator version. Run `npm audit` and inspect `npm pack --dry-run` before publication.

For live Inspector acceptance, follow [the release evidence ledger](../findings/logic/phase5-release-evidence.md). Load the repository root through Desktop **Debug → Load Local Tool**, select an enhanced-model site, scan actual handler files and exercise report saves. Browser fakes prove UI behavior but cannot prove Dataverse action responses, permissions or native save timing.
````

Add rows for `src/app/inspector-site/` and `src/features/inspector/` to the build manual's maintainer source map. Replace its old validation paragraph's generic pending instruction with the offline/online commands above and the observed external-tool prerequisite.

Capture the two PNGs from the completed page and actual dialog at **1100×780**, using sample/redacted display data. Store only the images listed in Files; do not substitute design mocks. Record capture conditions in the evidence ledger. Do not publish these documentation claims before the implementation and required acceptance gates pass.

Run the integration checks in this order from the repository root; stop on a failed command and record its output before proceeding with dependent gates:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: exit 0 from every command. The initial planning checkpoint had unrelated typecheck/lint failures; re-establish their status after existing work is reconciled. Do not alter expected results to hide those failures.

Run the explicit exclusion and final inclusion builds, restoring the caller's environment:

```powershell
$previousPages = $env:VITE_RELEASED_PAGES
try {
  $env:VITE_RELEASED_PAGES = 'starter,objects'
  npm run build:beta
  if ($LASTEXITCODE -ne 0) { throw 'Inspector-excluded build failed' }
  $env:VITE_RELEASED_PAGES = 'starter,objects,inspector'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Inspector-enabled build failed' }
} finally {
  if ($null -eq $previousPages) {
    Remove-Item Env:VITE_RELEASED_PAGES -ErrorAction SilentlyContinue
  } else {
    $env:VITE_RELEASED_PAGES = $previousPages
  }
}
```

Expected: both exit 0, with the enabled artifact left in `dist/`. Task 9's build-shape tests independently pin explicit inclusion/exclusion regardless of ambient overrides.

Run each remaining gate separately:

```powershell
node scripts/validate-manifest.mjs
npm run validate
npm audit
npm pack --dry-run
Get-ChildItem -Path dist/assets -File | Get-FileHash -Algorithm SHA256
```

Expected: offline `valid:true`/zero errors; online validator zero errors; audit zero advisories; package listing contains current `dist/index.html`, one IIFE, bundled styles/fonts/icon and the release's dependency artifact; hashes recorded against that same build. Run the repository's existing finalize-package step only as part of release preparation, with its lockfile changes reviewed by the release owner. This planning task does not authorize a publish.

For a release later than the FR-12 v1.0.0 exception, require completion evidence from `docs/plans/10-24-2026-generator-behavior-harness.md` (removed in `820d7b8`; see `git show 820d7b8^:docs/plans/10-24-2026-generator-behavior-harness.md`) for the full AC-4.12 matrix. Inspector tests do not satisfy that dependency. Record the release version and referenced evidence; if absent, leave that row open.

Execute these rendered/live checks and record separate observations:

| Gate | Exact verification route | Passing observation |
|---|---|---|
| RG-001 | Run Task 2's paging/literal probe on a multi-page fixture, including full terminal page and apostrophe/space literal; compare the transmitted nextLink/skiptoken. | Every row retained and encoded continuation preserved. `NEXT_LINK_UNVERIFIED` changes only after recorded wire proof; a required FetchXML change reopens its adapter tests before release. |
| RG-002 | Run Task 2's lifecycle/error observations; with Inspector results visible, switch to Starter, rename/relabel the same connection, simulate a refresh rejection/recovery, then confirm a real disconnect or different ID/URL. | Same identity/refresh uncertainty preserves results and marks; confirmed changes clear them while hidden; one host subscription is cleaned up; network, 401 and 403 outcomes are distinct. |
| RG-003 | Scan a known populated handler using Task 2's byte/text comparison and enhanced-model schema/envvar fixtures. | Actual downloaded text drives connector/function checks; nonsecret current/default/missing/denied cases match evidence; secret definitions issue zero value requests. |
| RG-004 | Scan a healthy 50-handler site with real downloads; capture monotonic duration and max in-flight requests. For each scope/format, run all eight question/snapshot/redaction combinations against a capture containing Configured, Reviewed, Needs review and Not scanned. Time primary-export-to-native-dialog and native-confirm-to-success-toast separately. | Scan ≤30 s; max four requests; complete stopped-scan preservation; report content matches its captured state; each export budget ≤5 s; native cancellation silent and failure retry reliable. |
| RG-005 | In both themes at 1024×700 and 1100×780, repeat with long names and at 200% zoom. Keyboard route: tabs → site combobox (arrows/Home/End/typeahead/Enter/Esc) → file choice → check choice → review/undo → export radios/checkboxes → Esc → restored trigger focus. Repeat with a screen reader. Open both PDF scopes in a PDF reader and select/copy beginning/middle/end of long continuation entries. | Full labels accessible; inactive choices explained; no focus trap outside modal; scrolling reaches every action; progress announcements polite; controls/focus meet rendered contrast; no omitted PDF text and embedded font coverage checked. |
| RG-006 | Load the final enabled `dist/` using Desktop Debug → Load Local Tool from repository root; complete scan/review/export, then inspect the package list and offline/online validator outputs from the same candidate. | Host-loaded completed journey, single IIFE/bundled assets/branded icon, matching included/excluded tests and accessible publication URLs. |

Every failed or unavailable gate retains its actual status and specific next evidence/change needed. A browser fake never closes a Dataverse/native-host gate. Append a dated status entry to `status-2026-10-23.md` linking this ledger and stating the actual release readiness; do not rewrite the older entry as if its probes had run.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `Select-String -Path 'findings/logic/phase5-release-evidence.md' -Pattern '\| (Pending|Failed|Blocked) \|'`

Expected at completion: no Pending/Failed/Blocked gate rows, every required row has a passing recorded observation, and the Completion paragraph links the final artifact and acceptance coverage.

Run: `git diff --check -- README.md docs/usage-manual.md docs/build-manual.md docs/archive/status-2026-10-23.md scripts/validate-manifest.mjs findings/logic/phase5-release-evidence.md`

Expected: exit 0. Confirm all eight delivery outcomes and every audit closure against the plan's coverage map. Stop feature work once they and the live gates pass; otherwise state the exact remaining blocker.

- [ ] **Step 5: Commit the coherent change**

```bash
git add -- README.md docs/usage-manual.md docs/build-manual.md docs/images/usage-inspector-review.png docs/images/usage-inspector-export.png scripts/validate-manifest.mjs findings/logic/phase5-release-evidence.md docs/archive/status-2026-10-23.md
git commit --only -m "docs(inspector): document scan review exports and release evidence" -- README.md docs/usage-manual.md docs/build-manual.md docs/images/usage-inspector-review.png docs/images/usage-inspector-export.png scripts/validate-manifest.mjs findings/logic/phase5-release-evidence.md docs/archive/status-2026-10-23.md
```

Commit completed documentation/evidence only after reconciling pre-existing staged changes. A checkpoint with open gates may be committed as evidence, but must continue to say Pending and must not make release-ready product claims.
