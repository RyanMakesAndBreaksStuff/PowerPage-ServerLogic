# Remaining-work investigation: Server Logic Tools

Date: 2026-10-24. Planning only. The requested `status-2026-10-23.md` was read first. This record preserves findings locally while the continuation plan is completed.

## Repository and verification

- Current HEAD: `820c313` (spec v3.0.0 theme commit, superseded by spec v4.0.0), branch `001-logic-inspector`, 14 commits ahead of its tracking branch.
- `spec.md` is Approved, version 3.0.0, updated 2026-10-23. Its requirements take precedence over old phase assumptions.
- `npm run typecheck` and `npm run lint` completed successfully.
- Fresh full `npm test`: 89 files, 1,348 tests passed; duration 25.57 seconds. The full summary was recovered from the lean-ctx command log, rather than inferred from compressed output.
- `npm run build` completed successfully: one JavaScript bundle, one stylesheet and `dist/index.html`. The existing bundle-size warning is informational; introducing code-split chunks would violate the PPTB IIFE contract.
- Existing skill/design deletions, earlier edits to `tasks/todo.md`, untracked design inputs and `.scratch/inspector-plan/` are preserved. No application implementation, host/site changes, commits or pushes have been performed.

## Confirmed plan defects and remaining work

### F01: Phase 17 still assumes R7 is absent

`plans/phase-17-behavior-harness.md` Decisions 10 and its completion criteria require `PENDING_R7`, two skipped configurations and a guard asserting the R7 generator throws. That assumption predates the R7 commits recorded in the status brief. The continuation must include all 36 configurations from its first harness run and must not introduce an obsolete pending exclusion. Phase 17 is still a task-level outline; it does not supply the complete new helper/test files required by `ryan-makes-plan`.

### F02: Phase 19 must be resumed, not rebuilt

The status brief and history record the R7 generator/golden and S3 script reconciliation as built. The open work is behavior coverage and the owner-run collision probe. The continuation must separately verify current package/README coverage before scheduling any remaining Phase 19 Task 4 edits. It must preserve the warning that overwrite prevention remains unverified until the exact Graph path passes the collision probe.

### F03: Inspector scan and PDF remain explicit stubs

- `src/features/inspector/scan/scan.ts:4`: `runScan` throws `not implemented: phase 15`; `listSites` does likewise at line 14.
- `src/features/inspector/report/renderPdf.ts:3`: `renderPdf` throws `not implemented: phase 20`.
- `src/features/inspector/InspectorPage.tsx:4`: the page renders a placeholder.
- The export dialog and Inspector site provider have not been created in the primary checkout. The existing scratch checkout is evidence only, not the current application.

### F04: Missing HTTP status is not proof of connection loss

`plans/phase-15-inspector-scan.md` Decision 4 and its proposed `toHostReadError` override classify raw missing-status rejections as transport failures. `findings/logic/probe_findings.md:15` records a transient no-status active-connection error followed by success, while its later notes explicitly leave network-drop and expired-sign-in shapes unverified.

The continuation must preserve an existing explicit `HostReadError.transport` flag, stop on 401, and default unclassified no-status or local response-shape errors to non-transport. A narrow live network mapping belongs to the S2 evidence follow-up. Synthetic transport fixtures prove partial-scan behavior; they do not establish the host's live error shape.

### F05: Failed code download still affects readiness

Phase 15 Decision 1 incorrectly says role and permission checks are unaffected by failed code reads. Configuration reads still proceed, and the Web role check may be Configured. However, current `model/checks.ts:31` creates the nonreviewable code-read reason, the Table permissions check includes it at line 168, and Outbound returns it at line 183. Spec FR-9 requires the Table permissions result to be Needs review when code cannot be read.

Keep the built rules. Correct the prose and add a scan integration fixture proving the JSON-only file fallback cannot make a file Ready.

### F06: A transient active-connection rejection currently clears results

`src/app/ConnectionProvider.tsx:16` rereads the active connection and sets it to `null` on every rejection. Phase 23's site provider consumes that value as a true disconnection. This violates the October 23 retention requirement in `plan-inspector.md` and AC-7.6.

Phase 23 must also own `ConnectionProvider.tsx` and its test. Retain the last successful connection on rejection; accept a successfully returned `null`; reread on connection events, focus and visible-document changes; preserve the existing latest-request guard and clean up all subscriptions. Add a page integration test proving findings and review marks survive a transient refresh failure.

### F07: Phase 23 prematurely includes Phase 24

The full `InspectorPage` block in `plans/phase-23-inspector-page.md:904` imports the missing `ExportDialog` and includes snapshot/save lifecycle code, although the phase's Decisions assign that action to Phase 24. Phase 23 cannot compile independently as written.

Remove those Phase-24-only imports, state, effect, button action and dialog from the Phase 23 implementation. Keep its eligibility-only Export button and introduce the lifecycle exactly once in Phase 24. Apply the build-shape marker replacement before the Phase 23 full gate.

### F08: Phase 24 omits its save-failure callback

`plans/phase-24-export-dialog.md` implements `onSaveFailed` in `ExportDialog` and exercises it in the lifecycle test, but its page integration diff passes only `onSaving`. Add the missing callback to return the session to `saving: false`. Verify the native-save boundary: clearing results before native save cancels, while clearing during native save keeps the submitted snapshot; rejection then restores cancellability.

### F09: Existing rules and Markdown are reusable owners

Phase 11 rules/settings/grants/counts are implemented. `src/types/inspector.ts` already carries the amended unknown-scope, partial inventory and Not-scanned contracts. Phase 16's report model, filename owner, escaping, fixtures and Markdown renderer are implemented. Phase 20 can consume the current complete report model without rewriting it.

Pending acceptance remains separate: Phase 11's live S2 evidence, Phase 16's rendered comparison and real host save, and the screen/export comparison after Phase 24.

### F10: The formatting failure is larger than the old handoff says, but has a narrow cause

Fresh `npm run format:check` reports 350 files: 182 under `.scratch/`, 159 under `src/`, and nine other files. `git ls-files --eol` shows LF index content and CRLF working-tree content for the sampled source/configuration files. The existing `.gitattributes` pins generated/report goldens to LF.

Both diagnostic commands pass without modifying files:

```powershell
npx --no-install prettier --check src tests --end-of-line auto
npx --no-install prettier --check . '!**/.scratch/**' --end-of-line auto
```

The chosen continuation policy is to add `.scratch` to `.prettierignore` and `endOfLine: "auto"` to `.prettierrc.json`. Preserve all other formatting rules and the golden-file LF attributes. This repairs the exact existing global gate with two configuration edits and avoids a repo-wide rewrite. The 176-file exception and the earlier single-scratch-file explanation are stale for this checkout.

### F11: Owner evidence and release ordering remain open

The current `findings/logic/probe_findings.md` already accepts the clipboard paste and five-byte binary save from the October 22 run. Carry that evidence into Phase 12's table; do not repeat those as unbuilt S2 work. S2 still owes the Network-panel token/quote/space checks, event arguments and unsubscribe proof, populated-file metadata, environment-variable row counts, host/runtime version and network-drop/expired-sign-in probes. Keep `NEXT_LINK_UNVERIFIED` until wire bytes are established. The binary `$value` limitation is not permission to add direct authenticated transport, invoke `execute`, or invent a decoder for `{}`.

That findings file's old "Blocking" wording predates the October 23 fallback decision in `plan-inspector.md`. It blocks a live handler-code download, not Phase 15 implementation: configuration reads and nonreviewable couldn't-read-code findings can be built now. The continuation must update this documentation discrepancy after carrying forward the accepted probe evidence.

The S3 collision probe, R4 bound-create probe, live PPTB smoke, rendered/contrast checks, three-maker walkthrough, live scan timing and export/screen comparisons remain owner-run. Server Objects never releases before Logic Starter. Publishing requires a separate explicit owner confirmation for each release.

## Microsoft Learn refresh

Microsoft Learn MCP search, code-sample search and full-page fetch were used on 2026-10-24.

- [Server logic overview](https://learn.microsoft.com/en-us/power-pages/configure/server-logic-overview): retains the optional settings, 120-second default and 240-second maximum, CSRF authentication and tenant outbound governance.
- [Use file column data](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/file-column-data): file bytes require the documented download transport; metadata/record JSON does not supply them. The single-request `$value` download is binary, so a JSON-only host response does not establish a text download.
- [Page results using OData](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/page-results): reuse the returned next link without changing its encoded token and retain the same page-size preference.
- [Filter rows](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/filter-rows): double single quotes in scalar literals and URL-encode special characters.
- [Graph/SharePoint tutorial](https://learn.microsoft.com/en-us/power-pages/configure/server-logic-graph-sharepoint): current code-sample search still returns the JSON-stringified token body declared as form-urlencoded. Preserve the spec's form-encoding correction; do not copy that defect back into the built generator.

These documents establish platform contracts, not live PPTB compatibility or successful owner probes. Additional source-level harness/theme and owner-script checks are being completed before the final plan is saved.
