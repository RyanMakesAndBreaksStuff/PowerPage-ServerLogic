# P5.1 plan — Retire contradictory constraints and pin the download contract

**Date:** 2026-11-01
**Baseline:** branch `logic-inspector-v2-build`, HEAD `820d7b8`, clean tree apart from the untracked `CLAUDE2.md` and `docs/phase-5/review/inspector-plan-review.md`.
**Spec:** `docs/specs/001-server-logic-starter-inspector/spec.md` v4.0.1 (Approved).
**Brief:** `phasse5plan.md` §3 and §5 P5.1.
**Status:** Executed 2026-11-01; commits `7e8b97d`, `1669c7c`, `478898c`, `f8eeb31`. The C1 test block was adjusted during execution so `install` is synchronous (ESLint `require-await`).
**Supersedes:** `docs/archive/11-01-2026-phase-5-policy.md` (Task 1) and Task 2 of `docs/archive/11-01-2026-phase-5-transport-reader.md`. Those drafts are not trusted; every anchor below was re-read from the checkout on 2026-11-01, and the corrections from `docs/phase-5/review/inspector-plan-review.md` (X-01…X-04, T1-01…T1-12, T2-01…T2-09) are applied.

## Goal

Make the owning requirements, rules and plans permit the Inspector scan/review/export journey, and give the Spike S2 continuation an executable, shape-only probe for the populated-handler download through `InitializeFileBlocksDownload` and `DownloadBlock`. No production TypeScript changes; P5.2 and P5.3 implement against the amended documents.

## Decisions adopted by this plan (owner accepted 2026-11-01)

| ID | Decision | Why |
|---|---|---|
| X-01 | **Restore** `findings/logic/probe_findings.md` from `820d7b8^` before appending to it. | `820d7b8` deleted the whole `findings/` tree; the brief requires appending a dated decision to that file and keeping the original `{}` observation. |
| X-02 | Add `'.scratch'` to `globalIgnores` in `eslint.config.ts` in its own commit. | `npm run lint` currently fails with 98 project-service errors, all in `.scratch/`. No later slice can pass `--max-warnings=0` otherwise. |
| T1-01 | **Narrow** the read-only rule instead of deleting it: keep the write-prohibition list; allow exactly two named unbound actions inside `src/services/pptb/`. | The brief's principle ("purpose, not verb or the name `execute`, decides eligibility") is honoured, and nothing in the spec needs a write, so the ✗ list stays true. |
| T1-06 | The README §05 → "FR-10 report contract" replacement is **not** done here. | It is PDF provenance and belongs to P5.6, which creates the files it would cite. |
| T2-08 | `scripts/s2-probe.js` is replaced whole, not patched by hunks. | Hunks with elided context cannot be applied mechanically. |

## Spec items missing from the build (gap table)

| # | Spec item | Current text (verbatim, line) | Gap |
|---|---|---|---|
| G1 | Non-Goals | L52 `- Writing, publishing or changing anything in the environment or site. Starter only produces downloads; Inspector is read-only.` | Blanket read-only clause blocks the two download actions. |
| G2 | AC-7.5 | L286 `… a persistent warning reads "This isn't a development environment. Inspector is read-only but is designed for dev sites." …` | Copy must drop "read-only". The same copy is in `plans/phase-23-inspector-page.md` L337 and L973. |
| G3 | FR-7 paging | L627 `- Read every page of every query (F35). \`dataverseAPI.queryData\` documents only \`value\`, so Spike S2 checks whether it also returns \`@odata.nextLink\`. If it doesn't, list queries use \`fetchXmlQuery\` with its paging cookie.` | Phase 12 observed `@odata.nextLink`; wire fidelity is still open (RG-001). Spec should say so. |
| G4 | FR-7 code data-source row | L673 `| Server logic code | \`powerpagecomponent\` \`filecontent\`, a File column holding \`<name>.sl\`, downloaded from \`powerpagecomponents(<id>)/filecontent/$value\`. …` | `$value` returned `{}` through `queryData`; the row must name the two actions. |
| G5 | FR-7 env-var row | L678 `… | Spike S1; Spike S2 checks read access |` | S2 must also cover secret definitions (no value read) and nonsecret current/default/missing/denied. |
| G6 | Spike S2 bullet | L702 `- a way to download a file column, for the server logic code in \`filecontent\` (Spike S1). Without one, every check that needs the code is "Needs review – couldn't read handler code";` | Must require a populated type-35 download and byte/text comparison. |
| G7 | FR-7 Must not | L739 `- Create, update or delete anything.` | Keep, but add what *is* allowed (the two retrieval actions). |
| G8 | FR-8 precedence | L741–L751; no evidence matrix exists. L750 `- Attach a category, a summary, guidance, questions and a snapshot to each finding.` | Add the mixed failed/unscanned/adverse matrix and `hasUnscannedEvidence`; separate finding detail from `FileResult.snapshot`. |
| G9 | AC-8.5 | L312 `The button is also not shown when **any** of the finding's reasons is a read failure: …` | Must also exclude any finding whose required evidence is unscanned. |
| G10 | FR-7 Parent chain (PB-002) | L652 `  - **Unknown:** an ancestor can't be read, the parent reference resolves to no readable record, or the chain loops. …` | Add: a readable terminal ancestor with unknown scope makes linked descendants unresolved (reviewable). |
| G11 | FR-9 Outbound (WR-006) | L766 `… If any entry is a wildcard entry, Outbound is Needs review and adds the reason "Wildcard entries aren't supported: \`<entry>\` matches no host." …` | State that wildcard reasons are collected before an O2 result. |
| G12 | Security NFR | L860 `- Inspector requests read-only access.` | Replace with operation-specific wording. |
| G13 | Error scenario | L913 `| A record's code can't be downloaded | Table permissions and Outbound are "Needs review – couldn't read handler code", …` | Keep; add the empty-download case explicitly (readable empty code → analysis limit). |
| G14 | Rule file | `.claude/rules/pptb-host-and-output.md` L7 `- ✓ Dataverse is read-only: … ✗ Never call … \`execute\` actions …` and L13 `… including re-scanning on \`connection:updated\`. …` | Narrow the prohibition; replace "re-scan on every event" with "re-read identity, invalidate only on change". |
| G15 | `plan-starter.md` | L16 `- **Open risk (Inspector, not Starter):** …`; L27 `- Host globals are touched only in \`src/services/pptb/\`. Dataverse is read-only: …`; L34 `- Every phase must pass \`npx tsc -b\`, \`npx eslint . --max-warnings=0\`, \`npx prettier --check .\` and \`npx vitest run\`.`; L168 `queryAll(q: ODataQuery): Promise<readonly unknown[]>; …`; L169 `downloadFileColumn(entitySet: string, id: string, column: string): Promise<string>;` | Obsolete risk, read-only constraint, Prettier gate (dropped 2026-10-27) and the host contract lines for `queryAll`/`downloadFileColumn` (no signal, no `FileColumnRef`). |
| G16 | `plan-inspector.md` | L3 `**Spec:** … (v4.0.0, Approved; …)`; L11 status paragraph; L15 `**Resolved risk (2026-10-23): the handler-code download has no read-only path in PPTB 1.2.7.** …`; L24 `- **Read-only:** Dataverse reads only through \`PptbHost.queryAll\` and \`downloadFileColumn\` (Phase 01). …` | `$value` fallback is still the planned happy path. |
| G17 | Phase plans 01, 11, 12, 15, 16, 20, 23, 24 | Old code blocks, `$value` fallback, Prettier commands. | Need a supersession banner directly under the H1. |
| G18 | `findings/logic/probe_findings.md` | Deleted in `820d7b8`. | Restore; append the dated superseding decision and the continuation table. |
| G19 | `scripts/s2-probe.js` | Runs every probe on paste (L3 `(async () => {`); calls only `queryData`; never calls `execute`; `$top=1` reads; no `filecontent_name`/FileAttachments check; no unsubscribe check. | Replace with installed-only manual operations incl. the two actions. |
| G20 | Phase 12 evidence table | `plans/phase-12-spike-s2.md` L201–L213; last row `| Expired sign-in | … | Blocks401mapping acceptance |` | Add the action-download continuation row. |
| G21 | Memory/steering | `.claude/memory/foundation.md` L18, `steering/conventions.md` L18, `steering/tech-stack.md` L17 still say "read-only". | With T1-01 they stay true; add a pointer to the named exception. |

Not in scope here: README §05 strings (P5.6), `npx pptb-validate --skip-url-checks` lines (P5.8), `src/services/pptb/pptbHost.ts` L125 comment (P5.2).

---

## Phase A — Baseline hygiene (X-01, X-02)

**Implements:** execution prerequisites only. **Files:** `eslint.config.ts`, `findings/logic/probe_findings.md` (restored).

- [x] **A1. Capture the signal**

```powershell
npm run lint 2>&1 | Select-String -Pattern 'scratch' | Measure-Object | Select-Object -ExpandProperty Count
Test-Path findings/logic/probe_findings.md
```

Expected: a non-zero count (98 at `820d7b8`) and `False`.

- [x] **A2. Fix**

In `eslint.config.ts`, inside `globalIgnores([` … `])`, add one entry after `'tasks',`:

```diff
     'mocks',
     'tasks',
+    '.scratch',
   ]),
```

Restore the evidence file verbatim (its historical content is the baseline the continuation appends to):

```powershell
git checkout 820d7b8^ -- findings/logic/probe_findings.md
```

- [x] **A3. Confirm**

```powershell
npm run lint
Test-Path findings/logic/probe_findings.md
Select-String -Path findings/logic/probe_findings.md -Pattern '^\| Network and expired sign-in not run \|' | Measure-Object | Select-Object -ExpandProperty Count
```

Expected: lint exit 0 with zero warnings; `True`; count `1` (the unique anchor Phase C appends after).

- [x] **A4. Commit (two commits)**

```powershell
git add -- eslint.config.ts
git commit -m "chore(lint): ignore .scratch in eslint globalIgnores"
git add -- findings/logic/probe_findings.md
git commit -m "docs(inspector): restore S2 probe findings deleted in 820d7b8"
```

---

## Phase B — Amend the owning requirements

**Implements:** brief §3 table; G1–G17, G21. **Satisfies:** FR-7, FR-8, FR-9, AC-7.5, AC-8.5, Security. **Files:** `spec.md`, `.claude/rules/pptb-host-and-output.md`, `plan-starter.md`, `plan-inspector.md`, `plans/phase-{01,11,12,15,16,20,23,24}.md`, three memory files.

Docs-only task: the "failing test" gate is replaced by the `Select-String` signal below (T1-12).

- [x] **B1. Capture the signal**

```powershell
Select-String -Path 'docs/specs/001-server-logic-starter-inspector/spec.md' -Pattern 'Inspector is read-only','Inspector requests read-only access','Inspector is read-only but is designed for dev sites','filecontent/\$value' | Select-Object LineNumber, Line
Select-String -Path '.claude/rules/pptb-host-and-output.md' -Pattern 'Dataverse is read-only','re-scanning on' | Select-Object LineNumber
Select-String -Path 'docs/specs/001-server-logic-starter-inspector/plan-starter.md' -Pattern 'prettier --check','Dataverse is read-only','Open risk \(Inspector' | Select-Object LineNumber
```

Expected: spec hits at L52, L286, L673, L860; rule hits at L7 and L13; plan-starter hits at L16, L27, L34.

- [x] **B2. Edit `spec.md`** — each edit replaces the quoted old text exactly once.

1. Header L3–L5: set `**Version:** 4.1.0` and `**Updated:** 2026-11-01`. Insert after the `| 4.0.1 |` changelog row (L33; the Fix 7 addendum committed in `820d7b8` kept 4.0.1, so this row follows it):

```markdown
| 4.1.0 | 2026-11-01 | Phase 5 (owner decision 2026-10-31, `phasse5plan.md`). Inspector may call the two documented unbound retrieval actions `InitializeFileBlocksDownload` and `DownloadBlock` through `dataverseAPI.execute`, inside the host adapter only; every write operation stays prohibited. S2 must prove a populated-handler download. FR-8 gains the mixed-evidence precedence table and `hasUnscannedEvidence`; AC-8.5 excludes unscanned evidence from Mark as reviewed; FR-7 treats a readable unknown-scope terminal ancestor as unresolved; FR-9 collects wildcard reasons before O2; finding detail and `FileResult.snapshot` get distinct ownership. AC-7.5 copy drops "read-only". |
```

2. L52 Non-Goal:

```diff
-- Writing, publishing or changing anything in the environment or site. Starter only produces downloads; Inspector is read-only.
+- Writing, publishing or changing anything in the environment or site. Starter only produces downloads; Inspector only retrieves. Inline configuration editing, handler upload or deployment, bulk remediation and runtime execution are out of scope.
```

3. L286 AC-7.5:

```diff
-… Then a persistent warning reads "This isn't a development environment. Inspector is read-only but is designed for dev sites." and scanning stays available.
+… Then a persistent warning reads "This isn't a development environment. Inspector is designed for dev sites." and scanning stays available.
```

4. L627 FR-7 paging bullet:

```diff
-- Read every page of every query (F35). `dataverseAPI.queryData` documents only `value`, so Spike S2 checks whether it also returns `@odata.nextLink`. If it doesn't, list queries use `fetchXmlQuery` with its paging cookie.
+- Read every page of every query (F35). Spike S2 (2026-10-22) observed `@odata.nextLink` on `queryData` results and a second linked page from the relative link; whether the token reaches the wire unchanged is still open (RG-001), so `NEXT_LINK_UNVERIFIED` stays on until the Network panel shows it. If the token is altered, list queries use `fetchXmlQuery` with its paging cookie.
```

5. Insert after the FR-7 bullet `- Use the host's active connection.` (L625):

```markdown
- Host operations are typed and feature-owned. Handler code is retrieved with the unbound actions `InitializeFileBlocksDownload` and `DownloadBlock` through `dataverseAPI.execute`, called only inside `src/services/pptb/`, which rejects any other `operationName` at runtime. PPTB supplies authentication and Dataverse enforces the signed-in user's permissions. Feature components never receive a generic execute interface.
```

6. L652 Parent-chain Unknown sub-bullet — append to the end of the bullet text:

```markdown
 An active terminal ancestor whose `scope` is unknown (FR-7 scope rule) makes every linked descendant unresolved, whether the effective role link comes from the descendant or from the ancestor. When the records were read successfully this is the reviewable analysis limit "Couldn't evaluate parent permission `<name>`"; a failed ancestor or configuration read remains a non-reviewable read failure. A known inactive ancestor still excludes the permission.
```

7. L673 data-source row:

```markdown
| Server logic code | `powerpagecomponent` `filecontent`, a File column holding `<name>.sl`. Retrieved with `InitializeFileBlocksDownload` (`Target` = `{ "@odata.type": "Microsoft.Dynamics.CRM.powerpagecomponent", powerpagecomponentid }`, `FileAttributeName: "filecontent"`) and sequential `DownloadBlock` calls; `queryData` cannot return the `$value` byte body (Spike S2, 2026-10-22: `{}`). `content` holds only `display_name`, `description` and the role link | Spike S1; Spike S2 continuation proves a populated handler downloads and matches its stored bytes/text |
```

8. L678 env-var row, source column:

```diff
-| Spike S1; Spike S2 checks read access |
+| Spike S1; Spike S2 checks nonsecret current/default/missing/denied reads and that a Secret-type definition never triggers a value read |
```

9. L702 Spike S2 bullet:

```diff
-- a way to download a file column, for the server logic code in `filecontent` (Spike S1). Without one, every check that needs the code is "Needs review – couldn't read handler code";
+- a populated type-35 handler downloaded through `InitializeFileBlocksDownload` and `DownloadBlock`: `filecontent_name` and the `regardingfieldname = filecontent` FileAttachment row confirm it is populated; record the initializer property types, `Data` encoding, byte count and local byte/text equality. A failed download stays a per-file non-reviewable read failure; a healthy path that falls back for every file does not meet acceptance;
```

10. L739 FR-7 Must not:

```diff
-- Create, update or delete anything.
+- Create, update or delete anything. The only actions Inspector executes are the two retrieval actions above; the adapter rejects any other operation name.
```

11. L750 FR-8 bullet and the new precedence block. Replace L750:

```diff
-- Attach a category, a summary, guidance, questions and a snapshot to each finding.
+- Each finding owns its category, summary, original reasons, guidance, questions and explanatory detail, plus `hasUnscannedEvidence`. `FileResult.snapshot` owns the optional raw configuration rows (web roles, tables with privileges, outbound settings); finding detail never copies them.
```

Insert after L745 (the Not scanned bullet):

```markdown
- Apply this precedence only to evidence a check actually needs; an irrelevant unread setting never defeats a conclusive code-based no-use result (FR-9 O0/O1).

  | Required evidence | Result | Mark as reviewed |
  |---|---|---|
  | A known read failure, including mixed failed and unscanned dependencies | Needs review; all known reasons kept; detail names the missing evidence | Unavailable |
  | A known adverse finding plus unscanned required evidence | Needs review; the adverse reason kept; detail names the missing evidence | Unavailable until a new scan supplies it |
  | Unscanned required evidence with no known failure or adverse finding | Not scanned | Unavailable |
  | Evidence read and a configuration finding applies | Needs review with every applicable reason | Available; original reasons retained |
  | Evidence read but an analysis limit remains | Needs review | Available; original reasons retained |
  | Evidence read and no finding applies | Configured | None |

  `canReviewFinding` enforces the table, including marks supplied to `evaluateSite` directly. Unscanned evidence is never labelled a read failure. C/V/M/U/T/K counts and the file-result precedence (AC-8.1, AC-8.10) are unchanged.
```

12. L312 AC-8.5 — replace the first sentence:

```diff
-The button is also not shown when **any** of the finding's reasons is a read failure: "couldn't read configuration" (AC-7.7), "couldn't read handler code" (Error Scenarios) or a parent permission that couldn't be read.
+The button is also not shown when **any** of the finding's reasons is a read failure: "couldn't read configuration" (AC-7.7), "couldn't read handler code" (Error Scenarios) or a parent permission that couldn't be read; nor when the finding's required evidence is partly unscanned (`hasUnscannedEvidence`, FR-8 precedence table), even if its reasons are all analysis limits or configuration findings.
```

13. L766 FR-9 Outbound — append to the bullet:

```markdown
 Code-based rows O0 and O1 are decided first. Once HttpClient use requires the settings, every known wildcard reason is collected before an O2 result is returned, so an invalid, duplicate or unreadable `AllowNetworkingToAllDomains` keeps the leading O2 summary and all wildcard reasons.
```

14. L860 Security:

```diff
-- Inspector requests read-only access.
+- Inspector performs retrieval only: list/record reads through `queryData` and handler-file retrieval through the two documented download actions, all inside the host adapter with validated responses and host-managed authentication. No write operation is ever issued.
```

15. L913 error-scenario row — append a new row after it:

```markdown
| A record's code downloads as an empty file | Readable empty code: Table permissions and Outbound are "Needs review – Couldn't analyse handler code" (reviewable); Web role is evaluated normally |
```

- [x] **B3. Edit `.claude/rules/pptb-host-and-output.md`**

```diff
-- ✓ Dataverse is read-only: use `retrieve`, `queryData`, `fetchXmlQuery` and the metadata getters only. ✗ Never call `create`, `update`, `delete`, `*Multiple`, `associate`, `disassociate`, `execute` actions, schema authoring, `deploySolution` or `publishCustomizations`. ✗ No `Post`/`Put`/`Patch`/`Delete` on `powerplatformAPI`.
+- ✓ Dataverse access is retrieval only, decided by purpose: use `retrieve`, `queryData`, `fetchXmlQuery`, the metadata getters, and `dataverseAPI.execute` **only** with `operationType: 'action'` and `operationName` exactly `InitializeFileBlocksDownload` or `DownloadBlock` (spec FR-7, 4.1.0), called inside `src/services/pptb/` where the adapter rejects any other operation name at runtime. ✗ Never call `create`, `update`, `delete`, `*Multiple`, `associate`, `disassociate`, any other action, schema authoring, `deploySolution` or `publishCustomizations`. ✗ No `Post`/`Put`/`Patch`/`Delete` on `powerplatformAPI`.
```

```diff
-- ✓ Register `toolboxAPI.events.on` once at init and route on `payload.event`, including re-scanning on `connection:updated`. ✗ This tool writes nothing to `toolboxAPI.settings` (spec FR-5a removed).
+- ✓ Register `toolboxAPI.events.on` once at init, route on `payload.event`, and unsubscribe on unload. On any `connection:*` event re-read the active connection and compare id and URL; invalidate Inspector results only on a confirmed change or a successful `null`. Keep the last confirmed identity when the refresh rejects, and retry on window focus and visible-document changes (AC-7.6). ✗ This tool writes nothing to `toolboxAPI.settings` (spec FR-5a removed).
```

- [x] **B4. Edit `plan-starter.md`**

L16:

```diff
-- **Open risk (Inspector, not Starter):** a file-column download through `queryData` is unverified until Spike S2 (`plan-inspector.md`). If it fails, reading handler code needs `execute`, which the read-only rule forbids, so that would need a spec and rules change.
+- **Inspector transport (resolved 2026-11-01, spec 4.1.0):** `queryData` cannot return a file column (`$value` gave `{}`, Spike S2 2026-10-22). Handler code is retrieved with the two documented download actions through the host adapter; see `docs/phase-5/plans/p5-2_plan.md`. A populated-handler wire comparison remains a release gate (`docs/phase-5/plans/p5-1_plan.md` Phase C).
```

L27:

```diff
-- Host globals are touched only in `src/services/pptb/`. Dataverse is read-only: `queryData`, `fetchXmlQuery`, `retrieve` and the metadata getters. Reads page with `Prefer: odata.maxpagesize` and a deterministic `$orderby`, never `$top` (rule amended 2026-10-17). The tool writes nothing to tool settings.
+- Host globals are touched only in `src/services/pptb/`. Dataverse access is retrieval only: `queryData`, `fetchXmlQuery`, `retrieve`, the metadata getters, and `dataverseAPI.execute` for exactly `InitializeFileBlocksDownload` and `DownloadBlock` (spec FR-7, 4.1.0; `.claude/rules/pptb-host-and-output.md`). Reads page with `Prefer: odata.maxpagesize` and a deterministic `$orderby`, never `$top` (rule amended 2026-10-17). The tool writes nothing to tool settings.
```

L34 (T1-02):

```diff
-- Every phase must pass `npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .` and `npx vitest run`.
+- Every phase must pass `npm run typecheck`, `npm run lint` and `npm test` (Prettier was dropped by owner decision 2026-10-27, `.claude/rules/tooling.md`).
```

Contracts block (T1-05: Starter's declarations stay). Replace only these two lines inside the `host.types.ts` section of the TypeScript fence (L168–L169):

```diff
-  queryAll(q: ODataQuery): Promise<readonly unknown[]>; // all pages; 429/5xx retried 1s/2s/4s; throws HostReadError with successful page rows in partialRows
-  downloadFileColumn(entitySet: string, id: string, column: string): Promise<string>;
+  queryAll(q: ODataQuery, signal?: AbortSignal): Promise<readonly unknown[]>; // all pages; 429/5xx retried 1s/2s/4s; HostReadError carries status, transport and partialRows; AbortError on cancellation
+  downloadFileColumn(ref: FileColumnRef, signal?: AbortSignal): Promise<string>; // InitializeFileBlocksDownload + DownloadBlock; see docs/phase-5/plans/p5-2_plan.md
```

And insert immediately before `export class HostReadError extends Error {` (L144):

```typescript
export type FileColumnRef = {
  entityLogicalName: string; // 'powerpagecomponent'
  primaryIdAttribute: string; // 'powerpagecomponentid'
  recordId: string;
  fileAttributeName: string; // 'filecontent'
};
```

Append to the amendments table (after L451's `| 2026-10-22 | 16 |` row, keeping date order):

```markdown
| 2026-11-01 | P5.1 | `queryAll` and `downloadFileColumn` take an optional `AbortSignal` and reject with `AbortError` on cancellation; `downloadFileColumn` takes a `FileColumnRef`. `HostReadError.transport` is true only for a platform-confirmed network exception; an unknown no-status failure is local (`transport: false`), superseding the 2026-10-22 provisional mapping. `partialRows` keeps every row received before a later-page failure, including the strict terminal-page rejection. |
```

- [x] **B5. Edit `plan-inspector.md`**

L3: replace `(v4.0.0, Approved; v4.0.0 sets the 1a Graphite theme, and reports are unchanged)` with `(v4.1.0, Approved; 4.0.0 set the 1a Graphite theme, 4.1.0 permits the two download actions and the FR-8 precedence table)`.

Insert directly after the H1 (L1) this banner (T1-11):

```markdown
> **Execution superseded — 2026-11-01.** `docs/phase-5/plans/p5-1_plan.md`, `p5-2_plan.md` and `p5-3_plan.md` (and later P5.x plans) own the remaining Inspector implementation, contracts and check commands. This file keeps the stable phase IDs, design choices and probe outcomes; its code blocks, `$value` fallback, blanket API prohibition, Prettier commands and sequencing are not current execution instructions.
```

L15 (T1-09: keep the Learn-derived paragraph, mark it): prepend to the paragraph the text `**Superseded 2026-11-01 (spec 4.1.0): the two download actions are now permitted inside the adapter; P5.2 implements them.** ` so the original paragraph follows unchanged.

L24:

```diff
-- **Read-only:** Dataverse reads only through `PptbHost.queryAll` and `downloadFileColumn` (Phase 01). Every query carries `$select`, pages with `Prefer: odata.maxpagesize` and passes a deterministic `orderBy` (the primary key is enough; Phase 01, Decision 1).
+- **Retrieval only:** Dataverse access only through `PptbHost.queryAll` and `downloadFileColumn` (the latter runs `InitializeFileBlocksDownload` and `DownloadBlock`; spec FR-7 4.1.0). Every query carries `$select`, pages with `Prefer: odata.maxpagesize` and passes a deterministic `orderBy` (the primary key is enough; Phase 01, Decision 1).
```

- [x] **B6. Phase-plan banners and old copy**

Insert the same banner as B5 directly after the H1 of each of: `plans/phase-01-host-adapter.md`, `phase-11-inspector-rules.md`, `phase-12-spike-s2.md`, `phase-15-inspector-scan.md`, `phase-16-report-markdown.md`, `phase-20-report-pdf.md`, `phase-23-inspector-page.md`, `phase-24-export-dialog.md`, with the links written as `../../../phase-5/plans/p5-1_plan.md` etc. For Phase 12 append to the banner: `New S2 observations are appended below the existing table without rewriting historical rows.`

In `plans/phase-23-inspector-page.md` L337 and L973 replace `Inspector is read-only but is designed for dev sites.` with `Inspector is designed for dev sites.` (the banner marks the rest historical).

- [x] **B7. Memory and steering pointers (T1-03)**

`.claude/memory/foundation.md` L18: `3. **Read-only, always.** Starter only produces downloads, and Inspector only reads.` → `3. **Retrieval only, always.** Starter only produces downloads, and Inspector only retrieves (reads plus the two documented file-download actions, spec FR-7 4.1.0). Nothing is ever written to, published to or changed in an environment or site.`

`.claude/memory/steering/conventions.md` L18: replace `read-only Dataverse access` with `retrieval-only Dataverse access (two named download actions allowed inside the adapter)`.

`.claude/memory/steering/tech-stack.md` L17: replace `(read-only)` with `(retrieval only: reads plus `InitializeFileBlocksDownload`/`DownloadBlock`)`.

- [x] **B8. Confirm (T1-08: one check per change)**

```powershell
$spec = 'docs/specs/001-server-logic-starter-inspector/spec.md'
(Select-String -Path $spec -Pattern 'Inspector is read-only','Inspector requests read-only access','Inspector is read-only but is designed for dev sites' | Measure-Object).Count   # 0
(Select-String -Path $spec -Pattern '^\*\*Version:\*\* 4\.1\.0' | Measure-Object).Count                                    # 1
(Select-String -Path $spec -Pattern 'hasUnscannedEvidence' | Measure-Object).Count                                       # >= 2 (FR-8 bullet, AC-8.5)
(Select-String -Path $spec -Pattern 'InitializeFileBlocksDownload' | Measure-Object).Count                               # >= 4 (changelog, FR-7 bullet, data row, S2 bullet)
(Select-String -Path '.claude/rules/pptb-host-and-output.md' -Pattern 'Dataverse is read-only|re-scanning on' | Measure-Object).Count   # 0
(Select-String -Path 'docs/specs/001-server-logic-starter-inspector/plan-starter.md' -Pattern 'prettier --check|Dataverse is read-only|Open risk \(Inspector' | Measure-Object).Count   # 0
(Select-String -Path 'docs/specs/001-server-logic-starter-inspector/plan-inspector.md','docs/specs/001-server-logic-starter-inspector/plans/phase-*.md' -Pattern '^> \*\*Execution superseded' | Measure-Object).Count   # 9
(Select-String -Path 'docs/specs/001-server-logic-starter-inspector/plans/phase-23-inspector-page.md' -Pattern 'read-only but is designed' | Measure-Object).Count   # 0
git diff --check -- docs .claude
```

Expected: the counts in the comments; `git diff --check` exit 0.

- [x] **B9. Commit**

```powershell
git add -- docs/specs/001-server-logic-starter-inspector/spec.md .claude/rules/pptb-host-and-output.md docs/specs/001-server-logic-starter-inspector/plan-starter.md docs/specs/001-server-logic-starter-inspector/plan-inspector.md docs/specs/001-server-logic-starter-inspector/plans/phase-01-host-adapter.md docs/specs/001-server-logic-starter-inspector/plans/phase-11-inspector-rules.md docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md docs/specs/001-server-logic-starter-inspector/plans/phase-15-inspector-scan.md docs/specs/001-server-logic-starter-inspector/plans/phase-16-report-markdown.md docs/specs/001-server-logic-starter-inspector/plans/phase-20-report-pdf.md docs/specs/001-server-logic-starter-inspector/plans/phase-23-inspector-page.md docs/specs/001-server-logic-starter-inspector/plans/phase-24-export-dialog.md .claude/memory/foundation.md .claude/memory/steering/conventions.md .claude/memory/steering/tech-stack.md
git commit -m "docs(spec): 4.1.0 permit download actions and pin evidence precedence"
```

---

## Phase C — S2 continuation: executable, shape-only probe

**Implements:** brief P5.1 bullets 2–5; G18–G20; RG-001/002/003 evidence homes. **Files:** `scripts/s2-probe.js` (replace), `tests/s2Probe.test.ts` (new), `findings/logic/probe_findings.md` (append), `plans/phase-12-spike-s2.md` (append row).

Facts the probe relies on (verified in `node_modules/@pptb/types` 1.2.7): `dataverseAPI.execute(request: ExecuteRequest, …): Promise<Record<string, unknown>>` with `ExecuteRequest = { operationName: string; operationType: 'action' | 'function'; entityName?: string; entityId?: string; parameters?: Record<string, unknown> }` (`dataverseAPI.d.ts` L114–L244, L496); `toolboxAPI.fileSystem.selectPath(options?: SelectPathOptions): Promise<string | null>` (`toolboxAPI.d.ts` L362); `toolboxAPI.fileSystem.readBinary(path: string): Promise<Buffer>` (L309); `toolboxAPI.events.on` returns `void` in 1.2.7, so the `off` fallback is the real path. `scripts/` is in ESLint `globalIgnores`, and `tests/**/*.test.ts` is in the Vitest include list (`vite.config.ts` L142).

- [x] **C1. Create `tests/s2Probe.test.ts`** (complete file; T2-05 cases included; no `as` casts, T2-06)

```typescript
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const ID = '00000000-0000-0000-0000-000000000001';
const SITE = '00000000-0000-0000-0000-00000000000a';
const bytes = new TextEncoder().encode('\uFEFFfunction get() { return "雪😀"; }');
const SECRETS = [ID, SITE, 'TOKEN-PRIVATE', 'PRIVATE.sl', 'private.invalid', 'function get', 'C:/PRIVATE'];

type Evidence = Record<string, unknown>;
type Probe = {
  s2Evidence: Evidence[];
  s2Versions(host: string, runtime: string): void;
  s2Connection(): Promise<void>;
  s2StartEvents(): void;
  s2StopEvents(): void;
  s2CheckStopped(): void;
  s2Paging(siteId: string): Promise<void>;
  s2Literal(): Promise<void>;
  s2VerifyWire(kind: 'nextLink' | 'literal', actualUrl: string): void;
  s2DownloadKnown(id: string): Promise<void>;
  s2Environment(scenario: string, schema: string): Promise<void>;
  s2ReadFailure(label: string): Promise<void>;
};
type Listener = (event: unknown, payload: unknown) => void;

function isProbe(value: unknown): value is Probe {
  return typeof value === 'object' && value !== null && 's2Evidence' in value && 's2DownloadKnown' in value;
}

const populatedRow = (extra: Record<string, unknown> = {}) => ({
  value: [{
    powerpagecomponentid: ID,
    powerpagecomponenttype: 35,
    filecontent_name: 'PRIVATE.sl',
    powerpagecomponent_FileAttachments: [
      { regardingfieldname: 'filecontent', filename: 'PRIVATE.sl', filesizeinbytes: bytes.length, mimetype: 'text/plain' },
    ],
    ...extra,
  }],
});

function install(options: { onReturnsDisposer?: boolean } = {}) {
  const query = vi.fn<(path: string, target?: unknown, headers?: unknown) => Promise<unknown>>()
    .mockResolvedValue({ value: [] });
  const execute = vi.fn<(request: DataverseAPI.ExecuteRequest) => Promise<unknown>>();
  execute.mockImplementation((request) => {
    if (request.operationName === 'InitializeFileBlocksDownload') {
      return Promise.resolve({ FileContinuationToken: 'TOKEN-PRIVATE', FileSizeInBytes: bytes.length,
        FileName: 'PRIVATE.sl', IsChunkingSupported: true });
    }
    const offset = request.parameters?.Offset;
    const length = request.parameters?.BlockLength;
    if (typeof offset !== 'number' || typeof length !== 'number') return Promise.reject(new Error('bad block request'));
    return Promise.resolve({ Data: Buffer.from(bytes.subarray(offset, offset + length)).toString('base64') });
  });
  const handlers = new Set<Listener>();
  const on = vi.fn((handler: Listener) => {
    handlers.add(handler);
    return options.onReturnsDisposer === true ? () => { handlers.delete(handler); } : undefined;
  });
  const off = vi.fn((handler: Listener) => { handlers.delete(handler); });
  const selectPath = vi.fn<() => Promise<string | null>>().mockResolvedValue('C:/PRIVATE/handler.sl');
  const readBinary = vi.fn<(path: string) => Promise<unknown>>().mockResolvedValue(Buffer.from(bytes));
  const connection = vi.fn<() => Promise<unknown>>()
    .mockResolvedValue({ id: 'PRIVATE-CONNECTION', name: 'PRIVATE', url: 'https://private.invalid', environment: 'Dev' });
  const sandboxWindow: Record<string, unknown> = {
    dataverseAPI: { queryData: query, execute },
    toolboxAPI: {
      connections: { getActiveConnection: connection },
      events: { on, off },
      fileSystem: { selectPath, readBinary, saveFile: vi.fn().mockResolvedValue(null) },
      utils: { copyToClipboard: vi.fn().mockResolvedValue(undefined) },
    },
  };
  // A fresh V8 context has its own ECMAScript built-ins. Only host/Web globals are supplied; `Uint8Array` and
  // `ArrayBuffer` come from this realm so that `instanceof` checks match the Buffers the fixtures hand over.
  runInNewContext(readFileSync(new URL('../scripts/s2-probe.js', import.meta.url), 'utf8'), {
    window: sandboxWindow, Uint8Array, ArrayBuffer, TextDecoder, atob, btoa,
    console: { table: vi.fn(), info: vi.fn() },
  });
  if (!isProbe(sandboxWindow)) throw new Error('probe did not install');
  return { api: sandboxWindow, query, execute, handlers, on, off, selectPath, readBinary, connection };
}

const saved = (api: Probe): string => JSON.stringify(api.s2Evidence);

describe('manual S2 continuation', () => {
  it('installs without calling the host or subscribing', () => {
    const p = install();
    expect(p.query).not.toHaveBeenCalled();
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.connection).not.toHaveBeenCalled();
    expect(p.on).not.toHaveBeenCalled();
    expect(p.api.s2Evidence).toEqual([]);
  });

  it('records versions only in a bounded shape and records connection facts without values', async () => {
    const p = install();
    p.api.s2Versions('1.2.7', '10.0.26200');
    expect(() => { p.api.s2Versions('', 'x'); }).toThrow();
    await p.api.s2Connection();
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'versions', host: '1.2.7', runtime: '10.0.26200' }));
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'connection', hasId: true, hasUrl: true, environmentKnown: true, disconnected: false }));
    for (const secret of SECRETS) expect(saved(p.api)).not.toContain(secret);
  });

  it('validates metadata before the file picker, downloads with the two unbound actions and records comparison facts only', async () => {
    const p = install();
    p.query.mockResolvedValue(populatedRow());
    await p.api.s2DownloadKnown(ID);
    expect(p.query.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(p.selectPath.mock.invocationCallOrder[0] ?? 0);
    expect(p.selectPath).toHaveBeenCalledWith(expect.objectContaining({ type: 'file' }));
    expect(p.readBinary).toHaveBeenCalledWith('C:/PRIVATE/handler.sl');
    expect(p.execute.mock.calls[0]?.[0]).toEqual({
      operationName: 'InitializeFileBlocksDownload', operationType: 'action',
      parameters: { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.powerpagecomponent', powerpagecomponentid: ID }, FileAttributeName: 'filecontent' },
    });
    expect(p.execute.mock.calls[1]?.[0]).toEqual({
      operationName: 'DownloadBlock', operationType: 'action',
      parameters: { FileContinuationToken: 'TOKEN-PRIVATE', Offset: 0, BlockLength: bytes.length },
    });
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'file metadata', matchingPopulatedAttachment: true }));
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', outcome: 'returned', bytes: bytes.length, localBytes: bytes.length, blocks: 1, chunked: true, bytesMatch: true, textMatch: true }));
    for (const secret of SECRETS) expect(saved(p.api)).not.toContain(secret);
  });

  it('does not download when no FileAttachment row belongs to filecontent', async () => {
    const p = install();
    p.query.mockResolvedValue(populatedRow({
      powerpagecomponent_FileAttachments: [{ regardingfieldname: 'otherfile', filename: 'PRIVATE.sl', filesizeinbytes: 9, mimetype: 'text/plain' }],
    }));
    await p.api.s2DownloadKnown(ID);
    expect(p.selectPath).not.toHaveBeenCalled();
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'file metadata', matchingPopulatedAttachment: false }));
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', outcome: 'rejected' }));
  });

  it('records the local binary shape before decoding and handles Buffer views, serialized Buffers and ArrayBuffers', async () => {
    for (const form of ['buffer-view', 'serialized-buffer', 'array-buffer'] as const) {
      const p = install();
      const allocation = Buffer.alloc(bytes.length + 8, 204);
      Buffer.from(bytes).copy(allocation, 4);
      const view = allocation.subarray(4, 4 + bytes.length);
      const local: unknown = form === 'buffer-view' ? view : form === 'serialized-buffer' ? view.toJSON()
        : view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
      p.readBinary.mockResolvedValue(local);
      p.query.mockResolvedValue(populatedRow());
      await p.api.s2DownloadKnown(ID);
      expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'local binary shape', bytes: bytes.length }));
      expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', bytesMatch: true, textMatch: true }));
    }
  });

  it('records a byte and text mismatch as facts, not as a failure', async () => {
    const p = install();
    p.readBinary.mockResolvedValue(Buffer.from('function get() { return 1; }'));
    p.query.mockResolvedValue(populatedRow());
    await p.api.s2DownloadKnown(ID);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', bytesMatch: false, textMatch: false }));
  });

  it('downloads a non-chunked file in one block and a multi-block file sequentially', async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 3).fill(97);
    for (const chunked of [false, true]) {
      const p = install();
      p.readBinary.mockResolvedValue(Buffer.from(big));
      p.query.mockResolvedValue(populatedRow({ powerpagecomponent_FileAttachments: [
        { regardingfieldname: 'filecontent', filename: 'PRIVATE.sl', filesizeinbytes: big.length, mimetype: 'text/plain' }] }));
      p.execute.mockImplementation((request) => {
        if (request.operationName === 'InitializeFileBlocksDownload') {
          return Promise.resolve({ FileContinuationToken: 'TOKEN-PRIVATE', FileSizeInBytes: big.length, FileName: 'PRIVATE.sl', IsChunkingSupported: chunked });
        }
        const offset = request.parameters?.Offset;
        const length = request.parameters?.BlockLength;
        if (typeof offset !== 'number' || typeof length !== 'number') return Promise.reject(new Error('bad block request'));
        return Promise.resolve({ Data: Buffer.from(big.subarray(offset, offset + length)).toString('base64') });
      });
      await p.api.s2DownloadKnown(ID);
      expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', blocks: chunked ? 2 : 1, chunked, bytesMatch: true }));
    }
  });

  it('requires explicit owner arguments before starting host work', async () => {
    const p = install();
    await p.api.s2DownloadKnown('');
    await expect(p.api.s2Environment('current', '')).rejects.toThrow();
    await expect(p.api.s2Paging('')).rejects.toThrow();
    await expect(p.api.s2ReadFailure('anything')).rejects.toThrow();
    expect(() => { p.api.s2VerifyWire('nextLink', ''); }).toThrow();
    expect(p.selectPath).not.toHaveBeenCalled();
    expect(p.query).not.toHaveBeenCalled();
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', outcome: 'rejected' }));
  });

  it('never queries values or defaultvalue for a secret definition', async () => {
    const p = install();
    p.query.mockResolvedValue({ value: [{ environmentvariabledefinitionid: ID, type: 100000005 }] });
    await p.api.s2Environment('secret', 'cfg_Secret');
    expect(p.query).toHaveBeenCalledTimes(1);
    expect(String(p.query.mock.calls[0]?.[0])).not.toContain('defaultvalue');
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'environment secret', resolved: 'secret', valueRead: false }));
  });

  it('resolves current, default and missing nonsecret values without recording them', async () => {
    const p = install();
    p.query
      .mockResolvedValueOnce({ value: [{ environmentvariabledefinitionid: ID, type: 100000000 }] })
      .mockResolvedValueOnce({ value: [{ environmentvariabledefinitionid: ID, defaultvalue: 'PRIVATE-DEFAULT' }] })
      .mockResolvedValueOnce({ value: [{ environmentvariablevalueid: ID, value: 'PRIVATE-VALUE' }] });
    await p.api.s2Environment('current', 'cfg_Current');
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'environment current', resolved: 'current', valueRead: true, valueRows: 1 }));
    expect(saved(p.api)).not.toContain('PRIVATE-');
    p.query.mockReset();
    p.query.mockResolvedValueOnce({ value: [] });
    await p.api.s2Environment('missing', 'cfg_Missing');
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'environment missing', resolved: 'missing', valueRead: false }));
  });

  it('pages the type-35 site inventory, caps the walk and follows the encoded nextLink unchanged', async () => {
    const p = install();
    const next = (n: number) => `https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B${String(n)}`;
    p.query.mockImplementation((path) => {
      const n = /skiptoken=A%25B(\d+)/u.exec(path)?.[1];
      const page = n === undefined ? 1 : Number(n) + 1;
      return Promise.resolve({ value: [{ id: page }], '@odata.nextLink': next(page) });
    });
    await p.api.s2Paging(SITE);
    expect(String(p.query.mock.calls[0]?.[0])).toContain(`_powerpagesiteid_value eq ${SITE}`);
    expect(String(p.query.mock.calls[0]?.[0])).toContain('powerpagecomponenttype eq 35');
    expect(p.query.mock.calls[1]?.[0]).toBe('powerpagecomponents?$skiptoken=A%25B1');
    expect(p.query).toHaveBeenCalledTimes(5);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'paging', pages: 5, rows: 5, capped: true, wireCheck: 'pending' }));
    expect(saved(p.api)).not.toContain('A%25B');
  });

  it('detects a full terminal page', async () => {
    const p = install();
    p.query.mockResolvedValueOnce({ value: [{ id: 1 }], '@odata.nextLink': 'https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=Z' })
      .mockResolvedValueOnce({ value: [{ id: 2 }] });
    await p.api.s2Paging(SITE);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'paging', pages: 2, rows: 2, terminalFull: true, capped: false }));
  });

  it('records the literal read and verifies wire URLs while retaining only outcomes', async () => {
    const p = install();
    p.query.mockResolvedValueOnce({ value: [{ id: 1 }], '@odata.nextLink': 'https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B' })
      .mockResolvedValueOnce({ value: [] });
    await p.api.s2Paging(SITE);
    await p.api.s2Literal();
    expect(String(p.query.mock.calls[2]?.[0])).toContain("name eq 'S2%20O%27%27Brien%20name'");
    p.api.s2VerifyWire('nextLink', 'https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B');
    p.api.s2VerifyWire('literal', "https://private.invalid/api/data/v9.2/powerpagecomponents?$filter=name%20eq%20'S2%20O%27%27Brien%20name'");
    p.api.s2VerifyWire('literal', 'https://private.invalid/api/data/v9.2/powerpagecomponents?$filter=name%2520eq%2520S2%2527');
    expect(p.api.s2Evidence).toContainEqual({ item: 'apostrophe/space literal', outcome: 'returned', rows: 0, wireCheck: 'pending' });
    expect(p.api.s2Evidence).toContainEqual({ item: 'nextLink wire', outcome: 'passed' });
    expect(p.api.s2Evidence.filter((row) => row.item === 'literal wire').map((row) => row.outcome)).toEqual(['passed', 'failed']);
    expect(saved(p.api)).not.toContain('private.invalid');
  });

  it('subscribes once, uses events.off when on() returns void, and verifies a later callback is absent', () => {
    const p = install();
    p.api.s2StartEvents();
    p.api.s2StartEvents();
    expect(p.on).toHaveBeenCalledTimes(1);
    for (const handler of p.handlers) handler(undefined, { event: 'connection:updated', data: { id: 'PRIVATE-CONNECTION' }, timestamp: '' });
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'connection event', event: 'connection:updated', dataHasId: true }));
    p.api.s2StopEvents();
    expect(p.off).toHaveBeenCalledTimes(1);
    expect(p.handlers.size).toBe(0);
    p.api.s2CheckStopped();
    expect(p.api.s2Evidence).toContainEqual({ item: 'unsubscribe check', outcome: 'passed' });
  });

  it('prefers a disposer when on() returns one', () => {
    const p = install({ onReturnsDisposer: true });
    p.api.s2StartEvents();
    p.api.s2StopEvents();
    expect(p.off).not.toHaveBeenCalled();
    expect(p.handlers.size).toBe(0);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'event subscription', disposerType: 'function' }));
  });

  it('records a read failure by name and status only', async () => {
    const p = install();
    p.query.mockRejectedValue(Object.assign(new Error('PRIVATE-MESSAGE https://private.invalid'), { status: 403 }));
    await p.api.s2ReadFailure('403 denial');
    expect(p.api.s2Evidence).toContainEqual({ item: '403 denial', outcome: 'rejected', errorName: 'Error', status: 403 });
    expect(saved(p.api)).not.toContain('PRIVATE-MESSAGE');
  });
});
```

- [x] **C2. Capture the signal**

```powershell
npm test -- tests/s2Probe.test.ts
node --check scripts/s2-probe.js
```

Expected: the test file fails (the current script runs host calls on paste and exposes none of the `s2*` entry points except `s2StopEvents`, `s2ReadFailure`, `s2SaveBytes`, `s2Copy`); `node --check` exits 0.

- [x] **C3. Replace `scripts/s2-probe.js`** with this complete file

```javascript
// Paste this entire script into Tool DevTools in PPTB. Installing it makes NO host calls.
// Run the named operations manually. Export only `s2Evidence`: it holds types, counts, booleans,
// error names and statuses. No source text, filename, path, ID, URL, token or setting value is recorded.
(() => {
  const evidence = [];
  const record = (item, result) => {
    evidence.push({ item, ...result });
    console.table(evidence);
  };
  const shape = (value) => ({
    type: typeof value,
    constructor: value?.constructor?.name ?? null,
    keys: value && typeof value === 'object' ? Object.keys(value).length : 0,
    bytes: value?.byteLength ?? value?.length ?? null,
  });
  const probe = async (item, call, inspect = shape) => {
    try {
      const value = await call();
      record(item, { outcome: 'returned', ...inspect(value) });
      return value;
    } catch (error) {
      record(item, {
        outcome: 'rejected',
        errorName: error?.name ?? typeof error,
        status: Number.isInteger(error?.status) ? error.status : null,
      });
      return null;
    }
  };
  const read = (path, headers = {}) => window.dataverseAPI.queryData(path, undefined, headers);
  const literal = (value) =>
    `'${encodeURIComponent(value.replaceAll("'", "''")).replaceAll("'", '%27')}'`;
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const requireValue = (condition) => {
    if (!condition) throw new Error('Unexpected probe response.');
  };
  const rows = (value) => {
    requireValue(object(value) && Array.isArray(value.value) && !value['@odata.nextLink']);
    return value.value;
  };
  const relative = (url) => url.replace(/^https?:\/\/[^/]+\/api\/data\/v\d+(?:\.\d+)?\//u, '');
  const bytesOf = (value) => {
    if (value instanceof Uint8Array) return new Uint8Array(value);
    if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
    requireValue(object(value) && value.type === 'Buffer' && Array.isArray(value.data));
    requireValue(value.data.every((n) => Number.isInteger(n) && n >= 0 && n <= 255));
    return new Uint8Array(value.data);
  };
  const decodeBlock = (value, count) => {
    requireValue(typeof value === 'string' && value.length % 4 === 0);
    requireValue(!/[^A-Za-z0-9+/=]/u.test(value));
    const binary = atob(value);
    requireValue(btoa(binary) === value && binary.length === count);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  };
  const textOf = (bytes) =>
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes).replace(/^\uFEFF/u, '');
  const BLOCK = 4 * 1024 * 1024;
  const PAGE_CAP = 5;

  window.s2Versions = (host, runtime) => {
    requireValue([host, runtime].every((v) => typeof v === 'string' && /^[0-9][0-9A-Za-z.+_-]{0,79}$/u.test(v)));
    record('versions', { host, runtime });
  };

  window.s2Connection = async () => {
    await probe('connection', () => window.toolboxAPI.connections.getActiveConnection(), (value) => ({
      ...shape(value),
      hasId: typeof value?.id === 'string',
      hasName: typeof value?.name === 'string',
      hasUrl: typeof value?.url === 'string',
      environmentKnown: ['Dev', 'Test', 'UAT', 'Production'].includes(value?.environment),
      disconnected: value === null,
    }));
  };

  let eventCount = 0;
  let stoppedAt = null;
  let dispose = null;
  const listener = (eventArg, payloadArg) => {
    const payload = typeof payloadArg?.event === 'string' ? payloadArg : eventArg;
    if (['connection:created', 'connection:updated', 'connection:deleted'].includes(payload?.event)) {
      eventCount += 1;
      record('connection event', {
        event: payload.event,
        firstArgument: shape(eventArg),
        secondArgument: shape(payloadArg),
        payloadKeyCount: Object.keys(payload).length,
        hasData: object(payload.data),
        hasTimestamp: typeof payload.timestamp === 'string',
        dataHasId: typeof payload.data?.id === 'string',
        dataHasUrl: typeof payload.data?.url === 'string',
      });
    }
  };
  window.s2StartEvents = () => {
    if (dispose !== null) return;
    const result = window.toolboxAPI.events.on(listener);
    const offAvailable = typeof window.toolboxAPI.events.off === 'function';
    dispose = typeof result === 'function' ? result : () => window.toolboxAPI.events.off(listener);
    stoppedAt = null;
    record('event subscription', { disposerType: typeof result, offAvailable });
  };
  window.s2StopEvents = () => {
    if (dispose !== null) dispose();
    dispose = null;
    stoppedAt = eventCount;
  };
  window.s2CheckStopped = () =>
    record('unsubscribe check', {
      outcome: stoppedAt === null ? 'pending' : eventCount === stoppedAt ? 'passed' : 'failed',
    });

  let secondPath = null;
  window.s2Paging = async (siteId) => {
    requireValue(typeof siteId === 'string' && guid.test(siteId));
    secondPath = null;
    await probe('paging', async () => {
      let path = `powerpagecomponents?$select=powerpagecomponentid&$filter=powerpagecomponenttype eq 35 and _powerpagesiteid_value eq ${siteId}&$orderby=powerpagecomponentid`;
      let pages = 0;
      let count = 0;
      let terminalFull = false;
      let capped = false;
      const seen = new Set();
      while (path !== null) {
        requireValue(!seen.has(path));
        seen.add(path);
        const page = await read(path, { Prefer: 'odata.maxpagesize=1' });
        requireValue(object(page) && Array.isArray(page.value));
        pages += 1;
        count += page.value.length;
        const next = page['@odata.nextLink'];
        if (next === null || next === undefined || next === '') {
          terminalFull = page.value.length === 1;
          path = null;
        } else {
          requireValue(typeof next === 'string');
          path = relative(next);
          requireValue(path.startsWith('powerpagecomponents?'));
          if (pages === 1) secondPath = path;
          if (pages >= PAGE_CAP) {
            capped = true;
            path = null;
          }
        }
      }
      return { pages, rows: count, terminalFull, capped, wireCheck: 'pending' };
    }, (value) => value);
  };

  window.s2Literal = async () => {
    await probe('apostrophe/space literal', () => read(
      `powerpagecomponents?$select=powerpagecomponentid&$filter=name eq ${literal("S2 O'Brien name")}&$orderby=powerpagecomponentid`,
    ), (value) => ({ rows: value?.value?.length ?? null, wireCheck: 'pending' }));
  };

  window.s2VerifyWire = (kind, actualUrl) => {
    requireValue((kind === 'nextLink' || kind === 'literal') && typeof actualUrl === 'string' && actualUrl !== '');
    let outcome;
    if (kind === 'nextLink') {
      outcome = secondPath === null ? 'pending' : relative(actualUrl) === secondPath ? 'passed' : 'failed';
    } else {
      outcome = actualUrl.includes('S2%20O%27%27Brien%20name') && !actualUrl.includes('%2527') && !actualUrl.includes('%2520')
        ? 'passed' : 'failed';
    }
    record(`${kind} wire`, { outcome });
  };

  window.s2DownloadKnown = async (id) => {
    await probe('known populated handler', async () => {
      requireValue(typeof id === 'string' && guid.test(id));
      const connection = await window.toolboxAPI.connections.getActiveConnection();
      requireValue(object(connection) && typeof connection.id === 'string' && typeof connection.url === 'string');
      const metadata = rows(await read(
        `powerpagecomponents?$select=powerpagecomponentid,powerpagecomponenttype,filecontent_name&$filter=powerpagecomponentid eq ${id}&$expand=powerpagecomponent_FileAttachments($select=regardingfieldname,filename,filesizeinbytes,mimetype)`,
      ));
      requireValue(metadata.length === 1 && metadata[0].powerpagecomponenttype === 35);
      const row = metadata[0];
      const attachments = Array.isArray(row.powerpagecomponent_FileAttachments) ? row.powerpagecomponent_FileAttachments : [];
      const populated = attachments.some((a) => object(a) && a.regardingfieldname === 'filecontent' &&
        a.filename === row.filecontent_name && Number.isSafeInteger(a.filesizeinbytes) && a.filesizeinbytes > 0);
      record('file metadata', {
        fileNameType: typeof row.filecontent_name,
        attachmentRows: attachments.length,
        attachmentTypes: attachments.map((a) => ({
          regardingfieldname: typeof a?.regardingfieldname, filename: typeof a?.filename,
          size: typeof a?.filesizeinbytes, mimetype: typeof a?.mimetype,
        })),
        matchingPopulatedAttachment: populated,
      });
      requireValue(populated);
      const path = await window.toolboxAPI.fileSystem.selectPath({
        type: 'file', title: 'Select the local copy of that stored handler',
        filters: [{ name: 'Server logic', extensions: ['sl', 'js'] }],
      });
      if (path === null) return { outcome: 'cancelled' };
      const binary = await window.toolboxAPI.fileSystem.readBinary(path);
      record('local binary shape', {
        type: typeof binary, constructor: binary?.constructor?.name ?? null,
        typedArray: binary instanceof Uint8Array, arrayBuffer: binary instanceof ArrayBuffer,
        bytes: binary?.byteLength ?? (Array.isArray(binary?.data) ? binary.data.length : null),
      });
      const local = bytesOf(binary);
      const init = await window.dataverseAPI.execute({
        operationName: 'InitializeFileBlocksDownload', operationType: 'action',
        parameters: { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.powerpagecomponent', powerpagecomponentid: id }, FileAttributeName: 'filecontent' },
      });
      record('file initializer', { types: Object.fromEntries(
        ['FileContinuationToken', 'FileSizeInBytes', 'FileName', 'IsChunkingSupported'].map((key) => [key, typeof init?.[key]]),
      ) });
      requireValue(object(init) && typeof init.FileContinuationToken === 'string' && init.FileContinuationToken !== '' &&
        Number.isSafeInteger(init.FileSizeInBytes) && init.FileSizeInBytes > 0 && init.FileSizeInBytes <= 128 * 1024 * 1024 &&
        typeof init.IsChunkingSupported === 'boolean');
      const downloaded = new Uint8Array(init.FileSizeInBytes);
      let blocks = 0;
      for (let offset = 0; offset < downloaded.length;) {
        const length = init.IsChunkingSupported ? Math.min(BLOCK, downloaded.length - offset) : downloaded.length;
        const block = await window.dataverseAPI.execute({
          operationName: 'DownloadBlock', operationType: 'action',
          parameters: { FileContinuationToken: init.FileContinuationToken, Offset: offset, BlockLength: length },
        });
        if (blocks === 0) record('file block shape', { dataType: typeof block?.Data, keys: object(block) ? Object.keys(block).length : 0 });
        downloaded.set(decodeBlock(block?.Data, length), offset);
        offset += length;
        blocks += 1;
      }
      const current = await window.toolboxAPI.connections.getActiveConnection();
      requireValue(current?.id === connection.id && current?.url === connection.url);
      let textMatch = false;
      try {
        textMatch = textOf(downloaded) === textOf(local);
      } catch {
        record('utf8 decode', { outcome: 'failed' });
      }
      return {
        bytes: downloaded.length, localBytes: local.length, blocks, chunked: init.IsChunkingSupported,
        bytesMatch: downloaded.length === local.length && downloaded.every((b, i) => b === local[i]),
        textMatch,
      };
    }, (value) => value);
  };

  window.s2Environment = async (scenario, schema) => {
    requireValue(['current', 'default', 'missing', 'denied', 'secret'].includes(scenario) &&
      typeof schema === 'string' && schema.trim() !== '');
    await probe(`environment ${scenario}`, async () => {
      const definitions = rows(await read(
        `environmentvariabledefinitions?$select=environmentvariabledefinitionid,type&$filter=schemaname eq ${literal(schema)}&$orderby=environmentvariabledefinitionid`,
      ));
      if (definitions.length === 0) return { definitionRows: 0, resolved: 'missing', valueRead: false };
      requireValue(definitions.length === 1);
      const definition = definitions[0];
      if (definition.type === 100000005) return { definitionRows: 1, resolved: 'secret', valueRead: false };
      requireValue(Number.isInteger(definition.type));
      requireValue(guid.test(definition.environmentvariabledefinitionid));
      const withDefault = rows(await read(
        `environmentvariabledefinitions?$select=environmentvariabledefinitionid,defaultvalue&$filter=environmentvariabledefinitionid eq ${definition.environmentvariabledefinitionid}`,
      ));
      requireValue(withDefault.length === 1);
      const values = rows(await read(
        `environmentvariablevalues?$select=environmentvariablevalueid,value&$filter=_environmentvariabledefinitionid_value eq ${definition.environmentvariabledefinitionid} and statecode eq 0&$orderby=environmentvariablevalueid`,
      ));
      requireValue(values.length <= 1);
      const current = values[0]?.value;
      requireValue(current === null || current === undefined || typeof current === 'string');
      return {
        definitionRows: 1, valueRows: values.length, valueRead: true, typeCode: definition.type,
        resolved: typeof current === 'string' ? 'current' : typeof withDefault[0].defaultvalue === 'string' ? 'default' : 'missing',
      };
    }, (value) => value);
  };

  window.s2ReadFailure = async (label) => {
    requireValue(['network drop', 'expired sign-in', '403 denial'].includes(label));
    await probe(label, () => read('powerpagesites?$select=powerpagesiteid&$orderby=powerpagesiteid', { Prefer: 'odata.maxpagesize=1' }));
  };

  window.s2SaveBytes = () =>
    probe('Uint8Array save', () =>
      window.toolboxAPI.fileSystem.saveFile('s2-bytes.bin', new Uint8Array([0, 1, 127, 128, 255]), [
        { name: 'Binary', extensions: ['bin'] },
      ]),
    );
  window.s2Copy = () =>
    probe('clipboard', () => window.toolboxAPI.utils.copyToClipboard('S2 clipboard probe'));

  window.s2Evidence = evidence;
  console.info(
    'Installed only; nothing has been called. Run: s2Versions(host, runtime); await s2Connection(); s2StartEvents(); await s2Paging(siteId); await s2Literal(); s2VerifyWire("nextLink"|"literal", actualUrlFromNetworkPanel); await s2DownloadKnown(recordId); await s2Environment("current"|"default"|"missing"|"denied"|"secret", schemaName); await s2ReadFailure("network drop"|"expired sign-in"|"403 denial"); s2StopEvents(); then change a connection and s2CheckStopped(). s2SaveBytes() and s2Copy() remain available. Export only s2Evidence.',
  );
})();
```

Line 1 of `.claude/rules/pptb-host-and-output.md` after B3 covers this script: it is not bundled and lives under the lint-ignored `scripts/`.

- [x] **C4. Append to `findings/logic/probe_findings.md`** after the unique line `| Network and expired sign-in not run | Do not classify no-status errors from this session. |`:

```markdown

## 2026-11-01 Phase 5 continuation — superseding transport decision

Spec 4.1.0 permits `InitializeFileBlocksDownload` and `DownloadBlock` through `dataverseAPI.execute` inside the host adapter (owner decision 2026-10-31, `phasse5plan.md`). The 2026-10-22 `$value` → `{}` observation above stays valid: `queryData` returns parsed JSON and cannot carry a byte body. It says nothing about the two actions, which Microsoft Learn ("Use file column data") documents for downloading existing content. Local fixture success (`tests/s2Probe.test.ts`) is not a live result.

`scripts/s2-probe.js` now installs manual operations and makes no host call on paste. `s2DownloadKnown(recordId)` requires the owner's populated type-35 record ID, validates `filecontent_name` and a `regardingfieldname = filecontent` FileAttachment row *before* opening the native file picker, performs the two actions, and records shape, byte-count and byte/text comparison facts only. `s2Environment(scenario, schema)`, `s2Paging(siteId)` and `s2VerifyWire(kind, actualUrl)` also require explicit DevTools arguments. `readBinary` is declared as `Promise<Buffer>` in `@pptb/types` 1.2.7; the probe records the returned shape first, then copies the exact byte view. No source, filename, path, connection/site/record identifier, request URL, continuation token or setting value belongs in committed evidence.

| Observation | Manual operation | Status on 2026-11-01 |
| --- | --- | --- |
| Host and runtime versions | `s2Versions(host, runtime)` from the PPTB About dialog | Pending |
| Populated handler: metadata, initializer property types, `Data` base64, byte count, UTF-8 text equality | `await s2DownloadKnown(recordId)` | Pending — fixture coverage only |
| Site-scoped type-35 paging (max 5 pages at page size 1), full terminal page | `await s2Paging(siteId)` | Pending |
| Second request URL equals the issued nextLink | `s2VerifyWire('nextLink', urlFromNetworkPanel)` | Pending; `NEXT_LINK_UNVERIFIED` stays true |
| Apostrophe/space literal encoded once | `await s2Literal()` then `s2VerifyWire('literal', urlFromNetworkPanel)` | Pending |
| Connection shape; callback argument shapes on created/updated/deleted | `await s2Connection()`; `s2StartEvents()`; edit another connection, rename and relabel the active one | Pending |
| Unsubscribe after a further connection change | `s2StopEvents()`; change a connection; `s2CheckStopped()` | Pending |
| Nonsecret current/default/missing/denied; secret → no value read | `await s2Environment(scenario, schema)` for each scenario | Pending; owner supplies schema names locally |
| Network-loss rejection shape | drop the network; `await s2ReadFailure('network drop')` | Pending; an unknown no-status error stays a local failure |
| Expired sign-in rejection shape | expire sign-in in the host UI; `await s2ReadFailure('expired sign-in')` | Pending |
| Explicit 403 denial | `await s2ReadFailure('403 denial')` with a denied identity | Pending |

When a live gate runs, replace only that row's status with passed/failed plus the versions from `s2Versions`; keep failed observations. A byte or text mismatch, or a `Data` shape other than base64, requires a targeted protocol correction in `src/services/pptb/dataverseFiles.ts` before release; never guess a decoder or disable the paging guard.
```

- [x] **C5. Append to the Phase 12 table** in `plans/phase-12-spike-s2.md`, immediately after the row beginning `| Expired sign-in |` (its cell `Blocks401mapping acceptance` is unique):

```markdown
| Phase 5 action continuation | Manual `s2DownloadKnown(recordId)`: owner-selected populated type 35, `filecontent_name` + `regardingfieldname = filecontent` attachment, unbound initializer + sequential blocks, local byte/text comparison | Not measured | Pending — no live action during planning | See `findings/logic/probe_findings.md`, 2026-11-01 continuation. The `$value` and no-status rows above stay historical; fixtures permit local implementation (P5.2), not release acceptance. |
```

Also mark the older checklist items at L190–L199 as superseded by prefixing each `- [ ]` line with `~~(superseded 2026-11-01)~~ ` is **not** done; instead add one line above the checklist: `> The checklist below describes the 2026-10-22 flow. The 2026-11-01 continuation operations are listed in `findings/logic/probe_findings.md`.` (T2-09).

- [x] **C6. Confirm**

```powershell
node --check scripts/s2-probe.js
npm test -- tests/s2Probe.test.ts
npm run lint
Select-String -Path scripts/s2-probe.js -Pattern "\(async \(\) =>" | Measure-Object | Select-Object -ExpandProperty Count
```

Expected: `node --check` exit 0; 16 tests pass and no live API is contacted (the sandbox has no network); lint exit 0; count 0 (installation is synchronous).

- [x] **C7. Commit**

```powershell
git add -- scripts/s2-probe.js tests/s2Probe.test.ts findings/logic/probe_findings.md docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md
git commit -m "test(pptb): manual shape-only S2 download continuation"
```

---

## Exit proof for P5.1

- Phase B counts all match; `npm run lint`, `npm run typecheck`, `npm test` pass on the branch.
- Every row of the continuation table in `findings/logic/probe_findings.md` reads Pending, passed or failed; none reads done without a live run.
- Live gates still open by design until the owner runs the probe in PPTB Desktop: whether `execute` forwards `Target` with `@odata.type` unchanged, whether `Data` is base64, whether `FileName`/`IsChunkingSupported` are present, and the real shapes of network-loss, expired-sign-in and 403 errors. P5.2 implements against contract fixtures while these stay pending; a populated real handler download remains a release acceptance condition (RG-003).

## Self-review

- Spec coverage: G1–G21 each have a step (B2 items 1–15, B3, B4, B5, B6, B7, C3–C5). README §05 and `pptb-validate` lines are explicitly deferred to P5.6/P5.8.
- Placeholders: none; every edit quotes old text or gives the full new file.
- Names used by later plans: `FileColumnRef`, `HostReadError.transport`/`partialRows`, `hasUnscannedEvidence`, `canReviewFinding`, `dataverseFiles.ts` match `p5-2_plan.md` and `p5-3_plan.md`.
