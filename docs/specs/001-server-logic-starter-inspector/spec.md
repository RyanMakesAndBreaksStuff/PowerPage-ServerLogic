# Feature 001: Power Pages Server Logic — Logic Starter & Logic Inspector

**Status:** Approved
**Version:** 4.5.0
**Created:** 2026-10-06
**Updated:** 2026-11-11
**Branch:** `review`
**Design source:** layout 10a, `design_handoff_server_logic_tools/Logic Tooling Design Directions/design_handoff_server_logic_tools/` (README + references 01–06, light and dark), for the shell, Logic Starter, Server Objects and Logic Inspector layout, copy and behaviour. The **1a Graphite** palette in FR-11 (built in `src/app/theme/tokens.css`) supplies all UI colours and the role mapping, and supersedes 10a §4 and the colours in references 01–06. Report styling still follows the original handoff's README §05 (`design_handoff_server_logic_tools/README.md`). High fidelity: colours, type, spacing and copy are final except where this spec overrides them (recipe list, A8, F38 labels, and FR-11).

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-10-06 | Initial draft. |
| 0.2.0 | 2026-10-07 | Aligned with the design handoff. Added: all 5 HTTP methods, Server Objects reference, client call pane (fetch/jQuery/Liquid), request path strip, 7 recipes (3 core + 4 Learn tutorials), editable handler with Insert-from-sample, Mark as reviewed, export dialog with Markdown **and PDF** in File and Site scopes, a site summary report and Learn-verified API corrections. Replaced name validation with slugify. Removed the shipped browser-check script; checks now run in the app. |
| 0.3.0 | 2026-10-07 | Spec review (sdd-review, Mode A) fixes, re-verified against Microsoft Learn on 2026-10-07. **FR-4:** defined matching semantics and a must-flag / must-not-flag table. **FR-7:** added a data-source table and a plan-time metadata spike (Learn doesn't document the `mspp_*` tables). **Open questions:** resolved theme, Inspector background and `User`/`Website` members; moved the rest to Assumptions. **Rules:** table-permissions "nothing to check" case, whether Reviewed counts as configured, "Not scanned" state, a mismatched method on single-function recipes, Ready definition, `TimeoutInSeconds`. **New ACs:** AC-2.10, AC-4.11, AC-5.10–5.11, AC-7.8–7.11, AC-8.10–8.12. **New FR:** FR-2a. **Goal verification:** the 5-minute goal now has a timed walkthrough. **Learn corrections 11–16 added** (connector responses are JSON strings, HttpClient content types, Liquid vs HTTP context, comment-text risk, Learn's invalid jQuery DELETE sample). |
| 0.4.0 | 2026-10-07 | Recipes now cover every sample on the Learn overview, author, server objects and four tutorial pages: **10 recipes** (R8 Liquid invocation, R9 cloud flow, R10 Dataverse custom API added). Tutorial recipes R4–R6 also ship Learn's demo web page as `<slug>.page.html`. Rebuilt R4–R7 against the full tutorial text. Added **Learn corrections 17–18** (tutorial sample defects and what the recipes do instead), AC-3.7–3.10, Spike S3 and a GitHub sample reference. |
| 0.5.0 | 2026-10-07 | Fixes from the second spec review (`001-server-logic-starter-inspector-review.md`), cross-checked against Learn and Microsoft's `power-platform-skills` plugin. **Corrections:** 8 rewritten (the envelope is lowercase: `success`, `data`), 11 rewritten (generated handlers accept a connector result as a string or an object), 14 extended (the runtime regex `with\s*\(` matches inside strings), and 19 added (Dataverse connector methods are synchronous). **FR-3:** a recipe contract table (inputs, validation, return shape, access type, logical and entity set names, whether Liquid is supported), and fail-closed handling of a missing site setting. **FR-4:** a general whitespace rule, `import … from`, and T15–T17. **FR-7:** facts from the enhanced data model are now verified on Learn; S1 is narrowed and S2 widened; Spike S4 is new. **FR-9:** the Web role check flags any assignment that *includes* the anonymous role; Outbound has a "no outbound calls in code" case and a settings decision table. **FR-11:** the site ring falls back to proportional arcs; four colour tokens are adjusted for AA (A8). Smaller fixes to AC-2.6, 2.8, 3.2, 3.7, 4.5–4.7, 4.11, 5.10, 5.11, 6.5, 6.8, 6.9, 7.2, 7.6, 8.8, 8.9, 9.2, 9.3, 9.4, 9.6, plus the error scenarios. |
| 0.6.0 | 2026-10-08 | Fixes agreed in the Opus/Sol review debate (`Opus-review-of-Sol-review.md`, `Opus_debate_round1_opus_rebuttal.md`, `Opus_Sol_Debate_Round2_Sol_reponse.md`). **Generated handlers:** a logging rule that never logs bodies, exception messages, URLs or tokens (F09); R7 HTML escaping, ActivityId-prefixed ticket names, `conflictBehavior=fail`, stage-specific failures and explicit retry consequences (F05, F06); R4 option rules, with a `$top` default of 10 and a cap of 50 (F08). **Starter:** Permissions review is tied to the reviewed server text (F13, F15); the Liquid rule uses every HTTP-only property (F16); Insert only at a statement position, with a trial parse and a Copy fallback (F17); slug cap, device names and a collision warning (F21, AC-2.11). **Inspector:** token-based connector detection where "couldn't determine" overrides the no-use outcomes (F24, row O0); inactive table permissions and ancestors are ignored, and an unresolved parent chain is Needs review (F26). **Reports:** the scan interval, plus a statement that the scan isn't an atomic snapshot (F37). **Tests:** a behavior harness, shared client failure fixtures and per-demo-page cases (F56, AC-4.12). **Spikes:** S1 adds parent links and the name limit; S3 adds a collision probe. Added Out of Scope items and the appendix dispositioning all 59 review findings. |
| 0.7.0 | 2026-10-08 | Applies the 40 deferred remedies and the 6 owner decisions from the review debate, plus design layout 10a. **Design (F53):** Server Objects is a top-level tab and the Starter sub-tab row is gone; the recipe tile is a searchable combobox (resolves A4); light (11c) and dark (12e) themes follow the host theme (reverses A2); dark uses aurora plus glass on every tile (reverses A1); the site pill in the title bar is Inspector's site picker; A8 keeps only the report tokens. **Owner decisions:** R4 `post` uses a Global Create-only permission until S4 proves the caller's account can be bound (F04); Account-scope checklists name the relationship; the write-on-read rule includes Append and Append To and is reworded (F25); no Mark as reviewed on read failures (F33); labels separate Configured from Reviewed with C/V/M/U/T counts (F38, F39); 1024×700 minimum viewport (F50). **Generated code:** per-recipe `Body` decoding (F01), three-branch Liquid (F02), Learn's R5 inputs (F03), R10 prerequisites (F07), example requests (F08), upstream-credentials note (F10), R8 wording (F11), server text depends only on the recipe (F12), `entityid ?? entityId` (F55), JSON missing-setting result (F57), R5 empty bodies (F58). **Checks:** T9 corrected and T18–T20 with a tokenizer fallback (F22, F23); grant set adds the Authenticated and Anonymous Users roles (F27); settings normalisation (F28); O1 and O6 wording (F30, F32); timeout is a site banner (F31). **Inspector and reports:** unconditional invalidation with scan IDs (F34), paging and "Inventory incomplete" (F35), AC-7.8 wording (F36), export eligibility, reasons, escaping, redaction, pagination, snapshot, timing and failure (F40–F46). **UX:** persistence versions (F19), LF model (F18), validation disclosure (F14), secrets scope (F20), `aria-disabled`, APG keyboard patterns, status toasts and search selection (F47–F49, F51), report fonts and stems (F52). **Spikes:** S1 evidence (F29), S4 probe design (F54), spike evidence rule and R7 pin (F59). |
| 1.0.0 | 2026-10-14 | **MAJOR.** Owner decisions from the PPTB Desktop review, checked against the PPTB tool-development docs and Learn. **Removed:** Starter persistence (FR-5a, AC-5.8, F19): Starter state isn't kept between sessions, and PPTB's guidance is to store only user preferences in tool settings. **Changed:** notifications use `toolboxAPI.utils.showNotification`, with an in-tool Bootstrap-style fallback when the host call fails (FR-1); theme is read from the host at launch and re-read on `settings:updated`, focus and visibility, defaulting to light (AC-1.6); the tool owns Dataverse paging and a bounded retry (FR-7); the environment classification is the PPTB connection label (AC-7.5). **Added:** FR-12 PPTB host and manifest (Desktop App 1.2.7 or later, optional connection, validator and verification fields), external links through `openInConnectionBrowser`. **Plan deltas:** D1 jQuery `.fail()` (AC-4.6), D2 bundle JetBrains Mono only (FR-10, FR-11), D3 title-bar wording (AC-1.2). S2 no longer covers settings, theme or PDF. |
| 1.1.0 | 2026-10-14 | **MINOR.** Owner decisions on build phasing. **Added:** per-page releases (Starter, Server Objects, Inspector, in the order each completes), with unreleased pages' tabs shown disabled and their code left out of the build (AC-1.7, FR-1, FR-12); AC-1.1 and AC-6.8 note the exception. **Changed:** spike evidence goes in the plan of the phase that runs the spike, since each phase has its own plan file. **Resolved log:** PDF via jsPDF and jspdf-autotable in the web view (no .NET worker), the zip via fflate `zipSync`, the code editor via CodeMirror 6. |
| 2.0.0 | 2026-10-16 | **MAJOR.** Results of Spike S1 (PG DEV, enhanced data model, 2026-10-14) and Spike S4 (live probe on PG DEV, 2026-10-15/16); evidence is in the phase-0 plan. **Rewritten:** FR-4 matching: the runtime matches Learn's restricted list as case-insensitive regexes over the raw text, so every hit is Blocked, including inside comments, strings and identifiers (correction 14, T6/T9–T11/T14, new T21–T22); the jQuery client calls `shell.ajaxSafePost`, because `shell.safeAjax` doesn't exist on a live site (correction 9, AC-4.6, FR-2a); FR-7's grant set follows a Parent-scope permission's chain to the roles of its top permission. **Changed:** corrections 8 and 11 confirmed live (failure envelopes have no `data`; connector results are JSON strings); AC-4.7 drops the `async` condition (Liquid calls async functions); FR-7 data sources record where S1 found each fact, read settings backed by environment variables, and flag `*.` entries in `AllowedDomains`, which match no host (FR-9). **Added:** corrections 20–23 (blocked HttpClient calls return `StatusCode` 0, `Server.User` is the whole contact record, top-level helpers are accepted, the `x-ms-user-trace` header) and a README troubleshooting note; S2 checks file-column download and environment-variable read access. **Unchanged:** R4 `post` keeps Global Create-only: S4 proved the caller's parent account is readable, not that a bound create works (F04). S4 item 6 and `CloudFlow.TriggerAsync` stay untested. |
| 2.1.0 | 2026-10-19 | **MINOR.** R7 contract row is column-aware (owner decision 2026-10-19, evidence in phase-19-handler-r7.md). Example request is the S3 sample body. S3 script half is done; the collision probe stays open. |
| 2.2.0 | 2026-10-20 | **MINOR.** Owner decision: Server Objects ships only with Logic Starter, because its used marks, "Used here" filter, Used in, Permissions needed and Insert all read the Starter session. **Added:** a build that releases `objects` without `starter` fails (FR-1 released pages). **Changed:** per-page releases keep their completion order, except that Server Objects is never released before Logic Starter (FR-1 release rule). **Removed:** the unreachable "unreleased Starter" cases in AC-1.7 and AC-6.8. |
| 2.3.0 | 2026-10-20 | **MINOR.** Fixes from the `plan-inspector.md` review, checked against Learn (Filter rows, file column download, web roles, server logic site settings, service protection limits), the PPTB events docs and Microsoft's Power Pages plugin. **Owner decisions:** results clear only when the active connection's id or URL changes, or no connection is active; other `connection:*` events keep them (AC-7.6); connection lost is a network or 401 read failure with the connection unchanged (AC-7.10); empty or unparseable code is the reviewable analysis limit "Couldn't analyse handler code", and only a failed download stays a read failure (AC-8.5, Error Scenarios); `TimeoutInSeconds` keeps Learn's 1–240 with a note for 121–240, because the plugin reports a 120 clamp (AC-7.12). **Added:** setting-name matching, inactive settings, `TimeoutInSeconds` and `AllowedDomains` parse rules, unknown table-permission scope, more than one default role (site banner), `$filter` literal escaping and at most 4 reads in flight (FR-7); export defaults, the snapshot point, cancel on cleared results and a build budget (AC-9.1, 9.8, 9.9); inline Markdown escaping, a vector `✓` and a JetBrains Mono TTF for the PDF (FR-10); the site pill's APG pattern (Accessibility). **Changed:** S2 adds connection-loss and event-payload checks and drops the up-front access test, which AC-7.7 covers per check. |
| 3.0.0 | 2026-10-23 | **MAJOR.** A theme rework to replace 11c Paper & Signal (light) and 12e Glass Bento (dark). Never built; superseded by 4.0.0, which replaces its FR-11, A1, A2, AC-4.2 and Accessibility text. **Unchanged:** layout 10a, reports (README §05 palette, A8, FR-10 fonts). |
| 3.0.1 | 2026-10-27 | **PATCH.** Owner decisions for the early beta (Logic Starter and Server Objects), from `docs/beta-readiness-review.md`. **Added:** an early-beta exception in FR-12: the current palette and targeted behavior tests ship first, and the full AC-4.12 matrix follows. **Changed:** AC-1.7 hides the site pill while Logic Inspector is unreleased; the FR-3 logging rule and the security NFR cover handlers, and the generated browser client may log to the console; "Back to Create Logic" and "Clear search" are buttons, not links. |
| 3.0.2 | 2026-10-30 | **PATCH.** Brings the spec in line with the code on branch `starter-objexts-prep`. **Added:** the Implementation Status section, which lists where the code does not yet meet a requirement. **Clarified:** FR-12 names the licence (BSD-3-Clause, with a `LICENSE` file at the root). **Unchanged:** every requirement, including FR-11 and the AC-4.12 matrix. |
| 4.0.0 | 2026-10-31 | **MAJOR.** Owner decision: the **1a Graphite** palette, already built in `src/app/theme/tokens.css`, is the UI theme; the 3.0.0 theme rework is dropped. Logic Starter and Server Objects are the v1.0.0 release (`npm run build:beta`). **Rewritten:** FR-11's token table now lists the Graphite values under the app's variable names (`--window`, `--tile`, `--primary`, `--review`, `--server`, …); code wells follow the theme (`--code`); the code highlight is 10% `--primary` over `--code` with a 2px inset `--primary` bar (AC-4.2); base text weight 600, emphasis 700; A1 (flat backgrounds, no aurora, glass or `backdrop-filter`) and A2 (Graphite light and dark, host-driven); the glow contrast gate is removed, because Graphite has no gradients and every text pair is tested on a solid surface (Accessibility). **Changed:** AC-1.5, AC-1.6, AC-2.5, AC-5.1, AC-5.4, AC-6.2 and AC-8.2 name Graphite token roles instead of hues; the Implementation Status is re-checked and adds the failing `pptb-validate` run; FR-12's early-beta exception becomes the v1.0.0 exception and keeps only the AC-4.12 matrix. **Unchanged:** layout 10a, reports (README §05 palette, A8, FR-10 fonts). |
| 4.0.1 | 2026-11-01 | **PATCH.** Owner decision: the manifest icon is the branded Server Logic Tools logo (`public/icons/logo.svg`, manifest `icons/logo.svg`), which keeps its own colours. **Rewritten:** the FR-12 `icon` bullet no longer requires `currentColor`. **Downstream:** `package.json` `icon`, `tests/manifest.test.ts`, `tests/buildShape.test.ts` and the Phase 00 icon steps follow the new file name; the manifest test drops its `currentColor` and no-hex-colour assertions. |
| 4.1.0 | 2026-11-01 | Phase 5 (owner decision 2026-10-31, `phasse5plan.md`). Inspector may call the two documented unbound retrieval actions `InitializeFileBlocksDownload` and `DownloadBlock` through `dataverseAPI.execute`, inside the host adapter only; every write operation stays prohibited. S2 must prove a populated-handler download. FR-8 gains the mixed-evidence precedence table and `hasUnscannedEvidence`; AC-8.5 excludes unscanned evidence from Mark as reviewed; FR-7 treats a readable unknown-scope terminal ancestor as unresolved; FR-9 collects wildcard reasons before O2; finding detail and `FileResult.snapshot` get distinct ownership. AC-7.5 copy drops "read-only". |
| 4.2.0 | 2026-11-02 | P5.4: environment-variable failure causes (R-15 B) and skipped unreadable rows (R-14 B). Owner decisions 2026-11-02. **Changed:** FR-7 reads an environment-variable failure as one of four causes with four texts (secret, missing, denied, failed); a web role or table permission row that cannot be read is skipped, the other rows are kept, findings are graded without the skipped row, and a site banner names the skipped rows (FR-7). **Unchanged:** the read-failure rules and FR-9. |
| 4.2.1 | 2026-11-02 | **PATCH.** P5.5 owner decision D-19 C (2026-11-02). **Changed:** AC-7.6 gains the site-list reload rule: when a reloaded site list no longer contains the selected site, Inspector resets to its no-selection state (the picker reads "No site selected") and that site's results and review marks are dropped, with no notice. **Unchanged:** the same-identity event rule and FR-7. |
| 4.3.0 | 2026-11-03 | **MINOR.** Brings the spec in line with the Phase 5 code (P5.1–P5.7, branch `refine-app`, HEAD `7f24e80`). **Added:** the "Implementation alignment — Phase 5" addendum, which records the owner decisions taken while P5.4–P5.7 were built (P-01, P-12, P-14, D-01 to D-21 except D-08, D-09, D-17 and D-20, and E-01 to E-12 in `docs/phase-5/plans/*choices.md`; R-06, R-14 B, R-15 B and D-19 C were already in 4.2.0 and 4.2.1) and names the clauses each one supersedes: a three-state connection, the site-picker copy, one site-notice list, no Stop control and a "Scan again" button, the connection-changed scan state, "No server logic records were read.", no file selected after a scan, needs-review tile tint, the export job in the session store, the close guard, the four Export-disabled reasons, closing the dialog while a job runs, failure closes the dialog, the 5 s build watchdog, " (Inactive)" labels, "Page n of m", `?` glyph substitution, all site banners in exports, and the `warning` notice type. **Rewritten:** Implementation Status, checked on `refine-app` on 2026-11-03, with a new table of code deviations that have no owner decision yet. **Changed:** Open Questions S2 wording (Inspector was built against fixtures; S2's continuation gates its release). **Unchanged:** every requirement of Stories 2–6, FR-2 to FR-6, FR-8, FR-9 and the Fix 7 addendum; Story 1 changes only in the AC-1.2 and AC-1.3 wording, and FR-1 only gains the `warning` notice type and the build-default note, both in the addendum. |
| 4.3.1 | 2026-11-04 | **PATCH.** Code fix for the AC-9.2 duplication recorded in the Implementation Status deviations table. **Changed:** `buildReportModel` drops detail lines that repeat a reason (and, when a check has no reasons, the summary), so the Markdown and PDF Needs-review sections print each reason once, as the screen does. **Unchanged:** every requirement; the Phase 5 deviation row stays, marked resolved. |
| 4.4.0 | 2026-11-11 | **MINOR.** Reconciles the spec with the `goodreview.md` fixes (`goodplan.md`, branch `review`, `686103c..b03ca6a`) and the 2026-11-10 live S2 evidence. Also logs the unversioned 2026-11-05 edit `90de5ef`, which reworded the FR-4 import-scan deviation row (whole-word `import` … `from` linear scan) and merged the two AC-9.2 rows into one resolved row. **Owner decisions (2026-11-11):** the planner defaults in `goodplan.md`; `NEXT_LINK_UNVERIFIED` is off; message-text status classification is a recorded host contract; S2 is closed with caveats; live site probes (T16) are deferred. **Added:** FR-7 "Status from message text", recorded as a host contract observed on PPTB 1.2.8 fork `89028ff`, with the fallback if the wording changes. **Changed:** FR-7 paging (flag off, with the evidence caveat), retry and allowlist bullets; FR-12 event registration (lazy hub; `tool:unloaded` is not a teardown signal, because the host broadcasts it to every open tool) and the validator bullet; FR-1 external links (conditional: no UI link exists; links live in the generated header comment and README); FR-3 R4 body keys, site-setting reads inside `try`, and the arrow-function bullet marked unverified (N5); AC-2.4, AC-3.8 and the Error Scenarios (Fix 7 leftovers: request path strip, disabled method pills, saving-state export, fixed failure copy); AC-2.5, AC-2.6, AC-2.10, AC-3.4, AC-4.7, AC-5.3, AC-5.5 and AC-5.9 amended to match the code; Open Questions S2 closed with caveats; six Resolved entries; Phase 5 addendum bullets for the paging guard, AC-9.8 saving jobs, export failure copy, the slow-build notice and host members. **Code fixes recorded:** N1 (`b7e6a46`), N2 and the FR-7 request guard (`691236c`), N3 (`0e84815`), N4 and AC-9.8 (`396e734`), file download (`20fe547`), Starter AC-2.11 and AC-3.1 (`7773019`, `3379c95`), the app-level error boundary (`d03db0f`, `3379c95`), R4/R7/R9 generators (`7648d5d`, `e717c7f`), dead code (`1a17754`), the release gate (`70ef023`), the `src/session/` architecture moves (`10893fd`..`fb5e8e8`) and the node-default test environment (`b03ca6a`). **Rewritten:** Implementation Status (checked on `review` at `b03ca6a`) and the code-deviations table, where every row now carries a decision: four fixed in code, five amended, eighteen accepted, plus the AC-9.2 row resolved in 4.3.1. **Not verified:** the live site probes (T16: N5, R4 `@odata.bind`, `SiteSetting.Get` throw or `null`) were deferred by the owner; the secret environment variable stays not covered. **Unchanged:** FR-2, FR-2a, FR-4 to FR-6, FR-8 to FR-11, and every AC not named above. |
| 4.5.0 | 2026-11-11 | **MINOR.** Owner decision (2026-11-11): Logic Inspector ships in v1.0.0, so v1.0.0 releases all three pages (Logic Starter, Server Objects, Logic Inspector) from `npm run build`. This supersedes the 2026-10-14 per-page release order, the 2026-10-31 decision that v1.0.0 is `npm run build:beta`, and the 3.0.1 and 4.0.0 wording that made Inspector a later release. **Changed:** FR-12 release bullets (v1.0.0 is the full build, the Inspector release gate is a condition of v1.0.0, and the AC-4.12 matrix exception stays); FR-1 released pages (v1.0.0 names all three, `build:beta` is a non-release partial build); Resolved log; Implementation Status (Logic Inspector release, release gate and bundle size rows, with the code, manifest and docs follow-ups); the Build and release addendum. **Unchanged:** every AC and every other FR. AC-1.7 and the build-time released-pages list stay as the mechanism for partial builds; a release build shows no disabled tab. |

---

## Problem Statement

Power Pages server logic lets makers run JavaScript on the server, protected by web roles and table permissions, with outbound calls governed by site settings and tenant policy. Getting from an idea to a working handler is slow. Makers have to learn the `Server.*` object model, which browser APIs and keywords are blocked, how the client calls the endpoint with a CSRF token, and how to wire up web roles and table permissions across several studios. Access gaps are easy to miss, such as a Global table permission, write privileges on a read handler, a missing web role or unrestricted outbound domains. Often nobody notices them until the logic is live.

## Goals

- A maker can go from a blank start to a downloaded starter package in under 5 minutes without consulting external documentation. *Verified by a timed walkthrough with 3 makers who haven't used the tool: median ≤ 5 minutes, no external documentation opened.*
- Each `Server.*` object and method is documented in-app with an insertable sample that matches Microsoft Learn.
- Every Microsoft Learn server logic tutorial, and every scenario sample on the Learn overview, author and server objects pages, is available as a one-click recipe (R4–R10). One-line reference snippets are insertable samples in Server Objects.
- Before release, a maker can see which server logic files on a development site have web role, table permission or outbound networking gaps.
- Every Inspector finding states plainly whether it was confirmed from configuration, needs review or was manually reviewed.
- Reviews can be shared as Markdown or PDF reports, per file or for the whole site.

## Non-Goals

- Writing, publishing or changing anything in the environment or site. Starter only produces downloads; Inspector only retrieves. Inline configuration editing, handler upload or deployment, bulk remediation and runtime execution are out of scope.
- Running, testing or debugging server logic at runtime.
- Confirming effective access for a real site user. Inspector reviews configuration, not runtime behavior.
- Reading or evaluating the tenant-level outbound network governance policy. It is always shown as "not verified".
- Verifying that hand-edited handler code still validates its input.
- Keeping Starter state between sessions. Closing the tool discards it; PPTB's Restore Session reopens the tab, not its state.

## Users and Context

**Primary users:** Power Pages makers and pro developers building server logic on a development site.
**Secondary users:** Reviewers or leads who receive exported reports (pasted into a PR or work item, or as a PDF for sign-off).
**Usage context:** One window, **Server Logic Tools**, with three top-level tabs, left to right:
- **Logic Starter** (*Create Logic*).
- **Server Objects.**
- **Logic Inspector.**

Starter is used at the start of a handler; Inspector is used before promoting a site or opening a release PR.
**Host:** v1 ships only as a Power Platform ToolBox (PPTB) tool. The target is the PPTB Desktop App (Electron), version 1.2.7 or later; the PPTB VS Code extension isn't targeted or tested (FR-12). The environment comes from the host's active connection, and the host handles sign-in.
**User mental model:** Users already think in Power Pages terms: *server logic*, *web role*, *table permission*, *access type*, *Anonymous Users / Authenticated Users roles*, *allowed domains*, *`Server.*` objects*, *entity set name*. The tool uses this vocabulary unchanged.

## Reference Documentation (source of truth for generated code)

| Topic | Link |
|---|---|
| Server logic overview: methods → functions, API URL, site settings | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-overview |
| Author server logic: client calls, Liquid invocation, limitations | https://learn.microsoft.com/en-us/power-pages/configure/author-server-logic |
| Server objects | https://learn.microsoft.com/en-us/power-pages/configure/server-objects |
| Tutorial: Dataverse tables | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-operations |
| Tutorial: External services | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-external-services |
| Tutorial: Azure Function HTTP trigger | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-azure-function |
| Tutorial: Microsoft Graph and SharePoint | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-graph-sharepoint |
| `serverlogic` Liquid tag | https://learn.microsoft.com/en-us/power-pages/configure/liquid/liquid-objects#serverlogic |
| Disable external service calls (tenant governance) | https://learn.microsoft.com/en-us/power-pages/security/disable-external-service-calls |
| Security best practices (server logic authorization) | https://learn.microsoft.com/en-us/power-pages/security/security-best-practices |
| Graph/SharePoint sample package (script lives in `event-registration.zip`) | https://github.com/microsoft/power-pages-samples/tree/main/samples/server-logic/sharepoint-integration |
| Site Component (`powerpagecomponent`) and Web Role (`mspp_webrole`) table references | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/powerpagecomponent |
| *Secondary (Microsoft-authored, not Learn):* `add-server-logic` skill and its frontend integration reference. Used only where Learn is silent or contradicts itself (corrections 8, 11, 14, 19) | https://github.com/microsoft/power-platform-skills/tree/main/plugins/power-pages/skills/add-server-logic |

### Design vs. Microsoft Learn: corrections that apply

Where the mocks and Learn disagree, Learn wins. The visual design still applies.

1. **DELETE handler function is `del()`**, not `delete()`. `delete` is a reserved word and is on the restricted list. The helper line reads "Exports `function del()`".
2. **Logger methods** are `Log`, `Warn` and `Error`; the mock's "Warning" is wrong.
3. The object is **`Server.SiteSetting`** (`Get`), not "Sitesetting".
4. **`Server.Connector.CloudFlow`** (`TriggerAsync`) is a documented object that the mock list omits. It's added, so there are 9 objects.
5. **`Server.Context` properties** follow Learn: ActivityId, Body, FunctionName, Headers, HttpMethod, Input, QueryParameters, ServerLogicName, Url.
6. **OData options** passed to `RetrieveRecord` / `RetrieveMultipleRecords` follow Learn's form: `"$select=…&$top=…"`, with no leading `?`.
7. **`HttpClient` methods and `CloudFlow.TriggerAsync` are asynchronous.** Handlers that use them are generated as `async function` and use `await`.
8. **Client responses are wrapped** in an envelope, and its keys are **lowercase**: `{ requestId, success, serverLogicName, data, error }`. Client samples check `success`, read `error` on failure, and read `data`, which is the string the handler returned. Learn contradicts itself here. The Author page's example response uses PascalCase (`Success`, `Data`), but all three tutorial demo pages read lowercase `res.data` / `resp.data` / `data?.data`, and Microsoft's `add-server-logic` frontend reference documents the lowercase envelope. The lowercase form is used, and Spike S4 confirmed it on a live site. A success envelope is `{ requestId, success, data, serverLogicName }` with no `error` key. On failure, `success` is `false`, the `data` key is absent (not `null`) and `error` holds the message. An anti-forgery rejection (HTTP 401) also has no `requestId`, and its `error` is itself a JSON string (`{"error":{"code":"90040107",…}}`). Clients therefore read `data` only after `success` is `true`, and show `error` as text.
9. **The jQuery client variant uses `shell.ajaxSafePost`.** Learn's Author page shows `shell.safeAjax`, but Spike S4 found it doesn't exist on a live site: `shell` exposes only `ajaxSafePost`, `getTokenDeferred` and `refreshToken`. `shell.ajaxSafePost(options)` gets the token, adds the `__RequestVerificationToken` header and runs `$.ajax` with the given `type`, so it works for every method despite its name, and returns a promise whose `.fail()` receives token and transport failures. The fetch variant uses `shell.getTokenDeferred()` plus the `__RequestVerificationToken` header (per the tutorial's CSRF wrapper).
10. **Prototype 06's generated code is not a reference.** Its `context.table(...)` and `fetch()` calls are invalid in server logic; README §01 and Learn are the references.
11. **Connector results have the shape `{ StatusCode, Body, IsSuccessStatusCode, ReasonPhrase, ServerError, ServerErrorMessage, Headers }`** (`CloudFlow` has no `Headers`), and `Body` is a JSON string. Sources disagree on whether the result itself is a string: Learn's `CloudFlow` sample calls `JSON.parse(response)`, but Microsoft's `add-server-logic` reference reads `dvResponse.Body` directly. Generated handlers therefore normalise it with one helper, `const toResult = r => typeof r === "string" ? JSON.parse(r) : r;`. They then check `IsSuccessStatusCode`, log `ReasonPhrase` on failure, and on success decode a non-empty `Body` as the recipe's contract row says (FR-3): JSON for most recipes, raw text for R6, and JSON-or-text for R9. `Body` is usually, not always, JSON (F01). Spike S4 found that Dataverse and HttpClient results both arrive as JSON strings whose parsed `Body` is a string; HttpClient results also carry an undocumented `IsBinaryBody` key. `toResult` stays, because a string result is the observed case and an object costs nothing to accept. On the client, the envelope's `data` is the string the handler returned, so generated client code `JSON.parse`s it (FR-3 contract table).
12. **`HttpClient` request bodies support only `application/json`, `text/html` and `application/x-www-form-urlencoded`.** Generated calls pass one of these as `contentType`. Signatures are `GetAsync(url, headers)`, `DeleteAsync(url, headers)`, and `PostAsync`/`PutAsync`/`PatchAsync(url, body, headers, contentType)`.
13. **Liquid and HTTP expose different `Server.Context` properties.** `ActivityId`, `FunctionName` and `ServerLogicName` exist in both. `Body`, `Headers`, `HttpMethod`, `QueryParameters` and `Url` are HTTP only. `Input` is Liquid only. A handler invoked from Liquid reads `JSON.parse(Server.Context.Input || "{}")`.
14. **The runtime matches Learn's restricted list as case-insensitive regexes over the raw file text.** Learn lists the patterns but not how they're matched. Spike S4 saw the validator reject a file for `Function\s*\(` on the anonymous callback `forEach(function (k) {…})`, and for `delete\s+[a-zA-Z_$]` on the comment `// Delete after the spike`. Neither text is a capital-F `Function(` or code, so matching ignores case and covers comments, strings and identifiers. Microsoft's `add-server-logic` skill reports the same for `with\s*\(`. The rejection appears as `RTSL01: Script validation failed: prohibited pattern found - Pattern: <regex>`, the whole file doesn't run, and the caller gets HTTP 400 "Exception occurred while processing this request". Consequences: the OData filter text `"startswith(name,'a')"` and the method calls `.startsWith(` and `.endsWith(` break the script; generated code splits such literals (`"startswith" + "(name,'a')"`) and uses no anonymous `function (…)` expressions. `delete` needs whitespace and a name after it, so `DeleteRecord(` is safe. FR-4 treats every match as Blocked.
15. **Learn's jQuery DELETE example is invalid JavaScript** (a comma is missing after `contentType`). The generated client sample must parse.
16. **`Server.User` returns `null` for anonymous callers**, so samples guard `Server.User` before reading `fullname`. `Server.SiteSetting` is for secrets and endpoints; Learn says to hold secrets in Azure Key Vault, surface them through an environment variable, and reference them through a site setting.
17. **Defects in Learn's tutorial server code**, which the recipes fix and list under "Differences from Learn" (AC-3.7):
    - *Dataverse tutorial:* the handler takes `entitySetName` and `id` straight from the query string, so any caller can pick any table, limited only by table permissions. The recipe uses an allowlist and a GUID check. Its `put` snippet hardcodes `"accounts"`, while its full listing uses `entitySetName`; the recipe follows the full listing. Its comments contain the word `delete`, which FR-4 would flag, so the recipe rewords them.
    - *External services tutorial:* the single-record `get` builds `${baseUrl}(${id})/People?…`, which doesn't match OData key syntax (`/People('<username>')`). The recipe uses the key syntax.
    - *Azure Function tutorial:* `functionUrl` is a literal that includes the function key, and the handler reads `name` but never sends it. The recipe reads the URL from a site setting and sends `name`, URL-encoded.
    - *Graph and SharePoint tutorial:* the token request `JSON.stringify`s the body but declares `application/x-www-form-urlencoded`. The Microsoft identity platform token endpoint expects a form-encoded body, so the recipe form-encodes it. The excerpt also has a stray `;;`. **Unverified against a live tenant**: confirm in Spike S3.
18. **Defects in Learn's tutorial demo pages**, fixed in `<slug>.page.html` (AC-3.9): the Azure Function page calls `fetch` without the CSRF token (add `shell.getTokenDeferred()` + `__RequestVerificationToken`); the External services page derives `serviceSession` from `@odata.context` with a regex that is fragile (use a documented parse and fall back to an empty session); the Dataverse and External services pages build HTML from record values without escaping (escape them); and the External services page runs `JSON.parse` on `resp.data` and `parsed.Body` without a guard, so a non-JSON error body throws (wrap it in try/catch, as the Dataverse page already does). Each demo page is also adapted to the recipe's return shape (FR-3 contract table), so it doesn't double-parse `Body`.
19. **`Server.Connector.Dataverse.*` methods are synchronous.** Learn shows them without `await`, and Microsoft's `add-server-logic` skill says not to `await` them. Generated handlers mark a function `async` only when it awaits `HttpClient` or `CloudFlow` (correction 7). Learn's Dataverse tutorial and the server objects page don't contradict this.
20. **An `HttpClient` call to a host the outbound settings don't allow doesn't throw** (Spike S4). It returns a result with `StatusCode` 0, and the runtime log reads "URL '<url>' is not allowed based on domain restrictions." (or "AllowNetworkingToAllDomains is disabled and no AllowedDomains are configured."). Generated handlers already check `IsSuccessStatusCode` (FR-3), which catches it; `try`/`catch` alone wouldn't.
21. **`Server.User` is the whole contact record** (Spike S4): about 70 attributes, including `adx_identity_*` fields such as the security stamp. `contactid` is a GUID string; `parentcustomerid` and `Roles` are objects. These members are observed, not documented, so samples read only `fullname` (correction 16), and generated code never returns or logs `Server.User` itself.
22. **Top-level helper functions are accepted** (Spike S4). A file with helper functions next to `get`/`post` and custom Liquid operations ran on a live site. Microsoft's `add-server-logic` validator allows only the five handler names, so it's stricter than the runtime and isn't used as an oracle for R7's helpers or R8's operation.
23. **Runtime diagnostics come back in the `x-ms-user-trace` response header** (Spike S4): base64-encoded JSON, a list of `{ Level, MessageCode, Message }` entries, including `Server.Logger` output and `RTSL01` validation errors. The header is listed in `access-control-expose-headers`, so page script can read it. Microsoft's skill spells it `X-Ms-UserTrace`; the observed name is `x-ms-user-trace`. Generated READMEs point to it for troubleshooting.

## User Stories

### Story 1: App shell and navigation

**As a** maker
**I want** one window with Starter and Inspector side by side as tabs
**So that** I can move between building and reviewing without switching tools

**Acceptance criteria:**

- [ ] **AC-1.1** Given the tool opens When it renders Then the title bar shows the app glyph, "Server Logic Tools" and the top tabs **Logic Starter** (`{ }`), **Server Objects** (`◇`, in the server-object colour) and **Logic Inspector** (`◎`), with Logic Starter active. There is no sub-tab row; Logic Starter is the Create Logic view (layout 10a §1). Until every page is released, AC-1.7 applies.
- [ ] **AC-1.2** Given any tab is active When the title bar renders Then, on the right of the title bar, it shows the connection name with its environment classification (for example "Contoso · Development") and the site pill, except while Logic Inspector is unreleased (AC-1.7). The site pill is Inspector's site picker (AC-7.2). It reads "No site selected" until a site is chosen, and Logic Starter and Server Objects ignore it.
- [ ] **AC-1.3** Given no connection is active When the shell renders Then the context area reads "Not connected", the site pill is disabled, except while Logic Inspector is unreleased, when the title bar doesn't render it (AC-1.7), and Starter and Server Objects remain fully usable.
- [ ] **AC-1.4** Given any tab When the user selects another Then the content area swaps immediately with no transition, and the previous tab's state is kept.
- [ ] **AC-1.5** Given any pill When it has keyboard focus Then it shows a 2px outline in the theme's primary colour (`--primary`) at a 2px offset, and the selected pill never uses the needs-review colour (FR-11).
- [ ] **AC-1.6** Given the host theme When the tool opens Then it reads `toolboxAPI.utils.getCurrentTheme()` and renders its first frame in that theme, Graphite light or Graphite dark. It re-reads the theme on `settings:updated`, on window focus and when the document becomes visible, because PPTB has no dedicated theme event. If the host can't answer, the tool keeps its current theme, or uses light at launch, as PPTB does. There is no in-tool toggle (FR-11).
- [ ] **AC-1.7** Given a build in which a page isn't released yet (FR-1 released pages) When the shell renders Then that page's top tab still shows with its glyph and label, in the disabled style, with `aria-disabled="true"`. It stays in the tab list's arrow-key order but can't be activated, and it has no tooltip; this is an owner-approved exception to F47 for unreleased pages only. The first released tab, in AC-1.1 order, is active instead of Logic Starter. While Logic Inspector is unreleased, the title bar doesn't render the site pill. Server Objects is never released without Logic Starter (FR-1), so it always has the Starter session and its Insert. The page's content never renders.

### Story 2: Configure a handler (Create Logic)

**As a** maker
**I want** to choose a logic name, an HTTP method and a recipe
**So that** I get a working starting handler without writing boilerplate

**Acceptance criteria:**

- [ ] **AC-2.1** Given the Create Logic view When it renders Then it shows four tiles: Logic name, HTTP method, Recipe and Readiness.
- [ ] **AC-2.2** Given the user types `Customer Summary!` in Logic name When the value changes Then the slug becomes `customer-summary`: lowercase, runs of characters outside `a-z0-9` become `-`, and leading and trailing dashes are trimmed. The helper line reads "File `customer-summary.js`".
- [ ] **AC-2.3** Given the slug is empty after slugifying When the view renders Then the slug falls back to `untitled`.
- [ ] **AC-2.4** Given the slug changes When the view renders Then the file name, the server pane header and the client-call URL (endpoint `/_api/serverlogics/<slug>`) all update to the new slug. The request path strip was removed by Fix 7 (addendum, AC-4.8).
- [ ] **AC-2.5** Given the HTTP method tile When it renders Then it shows exactly five single-select pills, `GET`, `POST`, `PUT`, `PATCH` and `DELETE`, with the selected pill solid `--primary` (FR-11). The pills are the recipe filter (Fix 7 addendum, amended 2026-11-11): no pill is selected at launch, and a "Clear filter" button (aria-label "Clear method filter") beside the recipe count clears the selection, because the radio group can't deselect.
- [ ] **AC-2.6** Given method X is selected When the views render Then the client call targets the function mapped per Learn: GET→`get`, POST→`post`, PUT→`put`, PATCH→`patch`, DELETE→`del`. The method doesn't change the server text (F12). For a single-function recipe the helper line reads "Exports `function <name>()`". For a multi-function recipe it reads "Exports" followed by every exported function ("`function get()` `function post()` …") and marks the one the client call targets with `aria-current` (AC-3.4; amended 2026-11-11 to match the code).
- [ ] **AC-2.7** Given POST, PUT or PATCH is selected When the client call renders Then it includes a request body (`JSON.stringify(...)`). Given GET or DELETE is selected, it includes no body.
- [ ] **AC-2.8** Given the user selects a recipe When the selection changes Then the handler regenerates, the method resets to the recipe's default method, and the Permissions readiness item resets to "needs review". If the current client language isn't supported by the new recipe (FR-3 contract table, "Liquid" column), the language resets to fetch. Switching away from R8 always resets the language to fetch.
- [ ] **AC-2.9** Given the server pane text differs from the text generated for the current recipe When the user selects a different recipe Then a confirmation asks before discarding their edits, and Cancel keeps both the edits and the current recipe. Editing and then restoring the exact generated text clears the edited state.
- [ ] **AC-2.10** Given any recipe When the method pills render Then a pill is enabled only if the recipe exports that method's function (FR-3 table, "Functions" column). A disabled pill uses `aria-disabled="true"` and stays focusable. It shows the tooltip "<Recipe> doesn't export `<function>()`" on hover and on focus, exposed through `aria-describedby` (F47). R4 and R5 enable GET, POST, PUT and DELETE (not PATCH). R10 enables GET, POST and PATCH. R8 enables none: it has no HTTP method, and its helper line shows "Liquid only" as visible text (AC-3.8). *Superseded by the Fix 7 addendum (method pills are always-enabled recipe filters) and amended 2026-11-11 to match the code:* the "<Recipe> doesn't export `<function>()`" tooltip is no longer produced; R8's helper line reads "Liquid only · Exports `function getSummary()`", and "Liquid only: not callable over HTTP" is the reason on R8's disabled fetch and jQuery language pills.
- [ ] **AC-2.11** Given any logic name When it is slugified (AC-2.2) Then:
  - the slug is at most 64 characters. It's cut at the last `-` at or before character 64, or at 64 if there's none, and trailing dashes are trimmed. Spike S1 found studio accepts at least 189 characters and the `name` column allows 400, so 64 always fits;
  - a slug that is a Windows device name (`con`, `prn`, `aux`, `nul`, `com1`–`com9`, `lpt1`–`lpt9`) gets `-logic` appended, because a file such as `con.js` breaks zip extraction on Windows;
  - when the slug differs from the typed name, the helper line adds "Different names can produce the same slug, and so the same endpoint. Check that `<slug>` isn't already used on your site." Starter is offline and doesn't check the site (F21).

### Story 3: Recipes

**As a** maker
**I want** recipes for the common scenarios and for every Microsoft Learn tutorial
**So that** I start from a documented, working pattern

**Acceptance criteria:**

- [ ] **AC-3.1** Given the Recipe tile When it renders Then it shows a searchable combobox (layout 10a §3): the caption "Recipe" with "10 recipes" in muted text at the right; a field with `⌕`, the selected recipe name (ellipsis) and `▾`; and below it "Uses `<object>`", where the object is the recipe's main object in the FR-3 table's "Main object" column. Opening the field lists all ten recipes, each with its main object, under three group headers: "Core" (R1–R3), "Learn tutorials" (R4–R7) and "Learn reference samples" (R8–R10). Typing filters the list by recipe name or object, case-insensitive. ↑ and ↓ move, Enter selects and Esc closes. The combobox follows the APG combobox pattern (F48).
- [ ] **AC-3.2** Given any recipe When it is selected Then the generated handler compiles as ECMAScript 2023 and contains no restricted pattern or browser API anywhere in its text, including comments and string literals (FR-4, Test T1 in FR-4's table). A unit test runs every enabled recipe × method × client language combination, plus every insertable Server Objects sample (AC-6.8), and asserts zero matches.
- [ ] **AC-3.3** Given a tutorial recipe When it is selected Then the handler includes a header comment linking to its Learn tutorial URL.
- [ ] **AC-3.4** Given a recipe that defines several functions (Dataverse CRUD, External service CRUD) When it is selected Then the handler contains every function from the tutorial, the method pills select which function the client call targets, and the helper line lists all exported functions. *Amended 2026-11-11 to match the code:* after Fix 7 the method pills are the recipe filter, so the client call targets the method chosen with the recipe (the filter method when the recipe exports it, otherwise the recipe's default, or the filter method on re-choosing the same recipe, AC-2.8); changing the filter alone doesn't change the target.
- [ ] **AC-3.5** Given a recipe that needs secrets, keys or tenant-specific endpoints (R3, R6, R7, R9) When the handler renders Then those values are read through `Server.SiteSetting.Get(...)` with named settings, never as literals, and each required setting appears in the permission checklist. Learn's Azure Function tutorial puts the function URL and key in a literal; the recipe doesn't (Learn correction 17). R5's public demo base URL is the one allowed literal endpoint because it isn't secret or tenant-specific.
- [ ] **AC-3.6** Given any recipe When it is selected Then its table permissions (table and privileges), outbound domains and site settings populate the permission note tile, the "Permissions needed" tile and the checklist (FR-3 table).
- [ ] **AC-3.7** Given a tutorial recipe (R4–R7) When the handler is generated Then it is derived from the code in the Learn tutorial, and its only differences are the fixes in Learn correction 17 and the FR-3 Musts: input validation, connector-result normalisation and status checks (correction 11), `contentType` on body-sending calls (correction 12), the FR-3 return shape, the FR-3 logging rule (Learn's tutorials log `err.message`; the recipes don't), R4's `$top` default and cap, R7's ticket safety and failure stages (FR-3 R7 Must), the `Server.User` guard, the header comment and the recipe's access type. `README.md` lists every difference under "Differences from Learn", each with the reason.
- [ ] **AC-3.8** Given R8 (Liquid invocation) When it is selected Then the handler exports `getSummary()`, the client language is fixed to Liquid (the fetch and jQuery language pills are disabled with the tooltip "Liquid only: not callable over HTTP"), and the Liquid pane shows two snippets: without input and with `input:` (Learn's "Invoke server logic without input" and "Pass input to server logic" samples). The method pills stay enabled as recipe filters (Fix 7 addendum), and any selected filter hides R8, which exports no HTTP function. There is no request path strip (Fix 7 addendum, AC-4.8).
- [ ] **AC-3.9** Given a tutorial recipe that has a demo page on Learn (R4, R5, R6) When the user downloads the starter Then `<slug>.page.html` is included: Learn's demo page, with the endpoint changed to `/_api/serverlogics/<slug>` and the corrections in Learn correction 18. R7, R8, R9 and R10 have no demo page. The page file is not checked by FR-4, which applies to server code only.
- [ ] **AC-3.10** Given a recipe has a Learn source When it is selected Then the handler's header comment and `README.md` link that page (AC-3.3 applies to R4–R10, and R7 also links the GitHub sample package).

### Story 4: Generated code and client call

**As a** maker
**I want** to see the server handler and the matching client call side by side
**So that** I understand both ends before downloading

**Acceptance criteria:**

- [ ] **AC-4.1** Given valid inputs When the user changes the name, method, recipe or client language Then, within 300 ms, the client pane and the server pane's header and highlights update. The server text depends only on the recipe: it changes only when the recipe changes (AC-2.9) or on Start over (F12).
- [ ] **AC-4.2** Given the server pane When it renders Then its header shows `<slug>.js` and a `Server` pill in the server-object colour. The lines that do the recipe's data access are highlighted with 10% `--primary` over `--code` and a 2px inset `--primary` bar (FR-11). The footer reads "Runs on Power Pages with the caller's permissions".
- [ ] **AC-4.3** Given the server pane When the user types in it Then the code is editable, the Browser checks readiness item re-runs on the edited code, and edits persist until the recipe changes (AC-2.9) or the user selects Start over.
- [ ] **AC-4.4** Given the client call pane When it renders Then it offers single-select `fetch` (default), `jQuery` and `Liquid` pills. The footer reads "Paste into a page's custom JavaScript" for fetch and jQuery, or "Paste into a page or web template" for Liquid.
- [ ] **AC-4.5** Given `fetch` is selected When the pane renders Then it calls `/_api/serverlogics/<slug>` with the selected method inside `shell.getTokenDeferred().done(...)`, sends the `__RequestVerificationToken` header, checks `success` (showing `error` when it's false), reads `data` from the response envelope (Learn correction 8), parses it with `JSON.parse` inside a try/catch, and branches on the handler's `status` (FR-3 contract table). The token is sent for every method, including GET. Spike S4 found a GET passes without it and a POST without it fails with HTTP 401, so sending it on GET is harmless.
- [ ] **AC-4.6** Given `jQuery` is selected When the pane renders Then it calls `shell.ajaxSafePost({ type, url, contentType, data?, success }).fail(...)` (Learn correction 9), and its `success` callback handles the envelope exactly as AC-4.5 does: it checks `success`, parses `data` and branches on `status`. Transport and token failures are reported once, from `.fail()`: a token failure rejects the returned promise without calling an `error` option, so an `error` option would miss it.
- [ ] **AC-4.7** The Liquid pill is enabled only when both conditions hold: the recipe's "Liquid" column in the FR-3 contract table is "Yes", and the server text references no `Server.Context` member that FR-6 marks HTTP only (`Body`, `Headers`, `HttpMethod`, `QueryParameters`, `Url`). The rule is evaluated on the current server text, so edits and inserts count as well as recipe changes.
  Given either condition fails When the client pills render Then the Liquid pill is disabled (`aria-disabled`, as in AC-2.10) with the tooltip "Liquid can't call this handler: it reads HTTP-only request properties". Only R1 and R8 support Liquid. Liquid can't supply HTTP-only properties (correction 13). An `async` function doesn't disable the pill: Spike S4 called sync and async operations from Liquid on a live site, and both returned `success` true with parsed `data`.
  Given the pill becomes disabled while Liquid is selected When it happens Then the language resets to fetch and a toast reads "Switched to fetch: this code can't be called from Liquid". Undoing the change re-enables the pill but doesn't switch the language back (F16).
  Given `Liquid` is selected When the pane renders Then it emits `{% serverlogic name: '<slug>', operation: '<function>', output: result %}`, adding `input:` when the recipe reads `Input`. The output has three branches (F02), because `result.success` only means the operation ran:
  - `{% if result.success and result.data.status == 'success' %}` renders the payload, escaping every value read from `result.data`, which Learn says is the parsed JSON;
  - `{% elsif result.success %}` renders `result.data.message | escape`, the handler's own failure message;
  - `{% else %}` shows `result.status_code`;
  - a note that `result.raw_result` holds the unparsed output when the handler returns non-JSON. Given Liquid is selected When the server pane is generated or shown Then a note states that Liquid invocation needs no token and reads `Server.Context.Input` rather than `Body` or `QueryParameters` (Learn correction 13), and warns that long operations delay page rendering, in the words "Long operations cause delayed rendering." (amended 2026-11-11 to match the code).
- [ ] **AC-4.8** Given the request path strip When fetch or jQuery is selected Then it shows the five steps Page script → Token `__RequestVerificationToken` → Endpoint `/_api/serverlogics/<slug>` → Handler `function <name>()` → Returns `JSON string`. When Liquid is selected, it shows Page render → `serverlogic` tag → Handler `function <name>()` → Returns the `result` object, with no token step. The request path strip was removed by Fix 7 (addendum, AC-4.8 and FR-2a), so this criterion is superseded and nothing renders it.
- [ ] **AC-4.9** Given either pane When the user selects Copy Then the pane's plain text, without line numbers, is copied and a success toast reads "Code copied" (FR-1). If the clipboard write fails, an error toast reads "Couldn't copy" (F49).
- [ ] **AC-4.10** Given the server pane When it renders Then the text matches the downloaded `<slug>.js` byte for byte, except that the download adds a final newline if one is missing. The editor model is LF-only: CRLF and CR are normalised to LF on load and paste. Copy, the edited-state comparison (AC-2.9), the Permissions review comparison (AC-5.4) and download all use that normalised value. Files are UTF-8 without a BOM (F18).
- [ ] **AC-4.11** Given any enabled recipe × method × client language When the client call is generated Then it parses as valid JavaScript (fetch, jQuery) or as a valid `serverlogic` tag (Liquid). A unit test asserts this for every combination, DELETE included (Learn correction 15).
- [ ] **AC-4.12** Given a behavior harness (a fake `Server` whose connector stubs return canned results, plus fake `shell`, `fetch` and `$.ajax`) When the tests run Then:
  - each of the 36 enabled configurations (recipe × function × client language) runs two sets of cases. The handler runs against success, connector failure and an empty `Body`. The client runs against success, envelope `success: false` and `status: "error"`;
  - token rejection, transport failure and a malformed envelope run once per shared client implementation, fetch and jQuery, for 6 cases. These cases cover a configuration only while its client is generated from that shared template unchanged. A configuration with its own client branch gets its own three cases;
  - each demo page (R4, R5, R6) runs its own behavior cases: success, `success: false`, `status: "error"` and non-JSON `data`. R4's and R5's tables change only after an application success (AC-3.9);
  - connector stubs, thrown exceptions and site settings carry a sentinel secret, and no `Server.Logger` call receives it (the FR-3 logging rule, F09).
  Live behavior stays a separate gate (Spike S4); passing this harness isn't live verification (F56).

### Story 5: Readiness and download

**As a** maker
**I want** a readiness ring and a single download
**So that** I know what's left and leave with everything I need

**Acceptance criteria:**

- [ ] **AC-5.1** Given the Readiness tile When it renders Then it shows a 3-segment ring labelled "K/3 ready" beside three pills: **Browser checks**, **Validation** and **Permissions**. Each pill shows ✓ in the theme's primary colour when complete and ! in the needs-review colour when it needs attention (FR-11). Browser checks is a text-pattern check (FR-4), not a compile or runtime test, and `README.md` says so (F14).
- [ ] **AC-5.2** Given the server pane code When it contains any restricted pattern or browser API (FR-4) Then Browser checks is "needs attention" and the offending lines are flagged in the pane.
- [ ] **AC-5.3** Given an unedited recipe When the view renders Then Validation is complete. It stays complete after manual edits, because the tool doesn't re-verify edited validation (see Non-Goals). After any edit, an "About validation" info button appears beside the Validation item; its tooltip and the `README.md` line read "Generated validation; edits aren't rechecked." (F14; amended 2026-11-11 to match the code, which shows the note on that button rather than on the pill).
- [ ] **AC-5.4** Given Permissions needs attention When the user selects "Mark checklist reviewed" Then the Permissions segment turns to the done colour (`--primary`) and K increases by one; Browser checks and Validation keep their own state (F15). "Undo review" reverts it.
  When the user marks the review, the tool stores the server text at that moment. Permissions stays reviewed only while the current server text equals the stored text. An edit, insert or regeneration that changes the text resets it to "needs review"; returning to exactly the stored text, for example by undo, restores the mark. The checklist is labelled "For the <recipe> recipe. Review anything you've added." (F13)
- [ ] **AC-5.5** Given the note tile When it renders Then it shows a `! Permissions` pill, which becomes ✓ "Permissions" once the checklist is marked as reviewed (AC-5.4; amended 2026-11-11 to match the code), and the recipe-specific instruction, for example "Grant Read on `contact` with Account access to the caller's web role, then validate on your development site." The tile names tables by logical name, with their access type (FR-3).
- [ ] **AC-5.6** Given any readiness state When the user selects **Download starter** Then `<slug>.zip` is saved through the host's save dialog, containing:
  - `<slug>.js`: the server pane content.
  - `<slug>.client.<js|liquid>`: the client call in the selected language.
  - `README.md`: setup steps, the endpoint (for R8, the Liquid tag instead; F11), the request path, Learn links, the browser-check result, a troubleshooting note (the `x-ms-user-trace` response header, `RTSL01` validation errors, and HTTP 403 when the tenant blocks outbound calls; corrections 14, 23) and, for R3, R5, R6, R7 and R9, the upstream-credentials line (FR-3, F10).
  - `permission-checklist.md`: web role, table permissions with privileges, access type and, for Account access, the relationship and the test-user prerequisite (FR-3), allowed domains, site settings and recipe prerequisites (R10, F07), each as `- [ ]`.
  - `<slug>.page.html`, only for R4, R5 and R6 (AC-3.9).
  A toast confirms "<slug>.zip downloaded".
- [ ] **AC-5.7** Given readiness is below 3/3 When the download completes Then the incomplete items are marked "Needs attention" in `README.md` and `permission-checklist.md`.
- **AC-5.8** Removed in v1.0.0: Starter state isn't kept between sessions (Non-Goals).
- [ ] **AC-5.9** Given any Starter state When the user selects **Start over** Then the name, method, recipe, client language, server text and review reset to defaults (`customer-summary`, Read Dataverse records, GET, fetch, unreviewed). The method filter also clears, so no method pill is selected (Fix 7 addendum; amended 2026-11-11 to match the code).
- [ ] **AC-5.10** Given the host's save dialog fails or the zip can't be built When the user selects **Download starter** Then an error toast reads "Couldn't save <slug>.zip" with the reason, the inputs and edited code are untouched, and the tool leaves no partial file: it builds the zip in memory and hands the host the full bytes in one write. What the host does after a failed write is outside the tool's control. Cancelling the dialog writes nothing and shows no toast.
- [ ] **AC-5.11** Given any download When it completes Then, for any recipe, it finishes within 2 s, measured from the user confirming the save dialog to the toast. Time the dialog is open doesn't count.

### Story 6: Server Objects reference

**As a** developer
**I want** a browsable reference of the `Server.*` objects with insertable samples
**So that** I can extend the handler without leaving the tool

**Acceptance criteria:**

- [ ] **AC-6.1** Given the Server Objects tab When it renders Then it shows three columns: the object list, the object detail, and a context column.
- [ ] **AC-6.2** Given the object list When it renders Then it lists the 9 objects from FR-6, each with its description and method or property count. Objects used by the current handler carry a `used` pill in the server-object colour (`--server`).
- [ ] **AC-6.3** Given the user types in "Search objects and methods" When the query matches an object or member name, case-insensitive Then only matching objects remain listed.
- [ ] **AC-6.4** Given the filter pills **All**, **Used here** and **Connectors** When one is selected Then the list shows all objects, only objects referenced in the server pane, or only `Server.Connector.*` objects respectively.
- [ ] **AC-6.4a** Given a search or filter changes the list When the selected object is no longer listed Then the first listed object is selected. When a search matches a member name, its object stays listed and the first matching member is selected. When nothing matches, the detail column shows the no-results message (Error Scenarios) (F51).
- [ ] **AC-6.5** Given the user selects an object When the detail renders Then it shows a breadcrumb (for example `Server.Connector › Dataverse`), a type pill (`Connector` for `Server.Connector.*`, `Object` for the rest), the description, member pills, the selected member's signature with its return type (or "Not documented on Learn", FR-6), a sample card with variant pills and an "All methods" table (name, signature, description). The selected row is tinted.
- [ ] **AC-6.6** Given the user selects a member pill or table row When the selection changes Then the signature, return type and sample update to that member.
- [ ] **AC-6.7** Given the sample card When the user selects **Copy** Then the sample is copied and the "Code copied" toast shows.
- [ ] **AC-6.8** Given the sample card When the user selects **Insert into handler** Then the sample is inserted as a statement into the server pane, the view switches to the Logic Starter tab with the insertion point kept, and Browser checks re-runs. The insertion follows these rules (F17):
  - **Target.** If the server pane has a last cursor position, it must be a statement position: inside a top-level function's body, at a statement boundary of a block (between two statements, just after `{` or just before `}`), and not inside a comment, a string, template or regex literal, or an expression. If there's no cursor, the target is the function mapped to the selected method (`getSummary` for R8). The sample goes before that function's last top-level `return`, or at the end of its body if it has none.
  - **Async.** If the sample contains `await` and the target function isn't `async`, the insert also adds `async` to that function's declaration.
  - **Trial parse.** The tool applies the insertion, and any `async`, to a copy of the text and parses it as ECMAScript 2023 (FR-4 code analysis). It applies the edit only if the copy parses. The insertion and the `async` change form one edit, so a single undo reverses them.
  - **Copy fallback.** If any rule fails, Insert is disabled (`aria-disabled`, as in AC-2.10) and the sample stays copyable. The tooltip says why:
    - "No function to insert into; use Copy" when the code doesn't parse or there's no target function;
    - "Move the cursor between statements inside a function, or use Copy" when the cursor isn't at a statement position;
    - "Inserting here would break the code; use Copy" when the trial parse fails (for example, a duplicate `let` or `const`).
  - **Fixture:** in `function get(){ /* cursor */ return "{}"; }`, with the cursor inside the comment, Insert is disabled with the statement-position tooltip.
  There is no snippet-form contract, variable-conflict analysis or reachability analysis beyond these rules.
- [ ] **AC-6.9** Given the context column When it renders Then it shows:
  - "Used in <slug>": each used object with pills for the members called, plus a "← Back to Create Logic" button.
  - "Permissions needed": tables with privileges and roles, with the warn state when the checklist isn't reviewed.
  - "Another sample": the sample for the next member of the selected object in Learn's order, wrapping round. It is hidden for objects with one member.
- [ ] **AC-6.10** Given Logic Starter When the user selects "Browse all in Server Objects" Then the Server Objects top-level tab opens. Given Server Objects, selecting "← Back to Create Logic" switches to the Logic Starter tab.

### Story 7: Connect Inspector to an environment and site

**As a** developer
**I want** Inspector to use my ToolBox connection
**So that** it can list and review that site's server logic

**Acceptance criteria:**

- [ ] **AC-7.1** Given no connection is active When the user opens Logic Inspector Then it tells them to select a connection in ToolBox, and no findings are shown.
- [ ] **AC-7.2** Given a connection When sites load Then the title-bar site pill (AC-1.2) offers only the Power Pages sites in that environment for selection. Active sites (`powerpagesite` `statecode` = 0) are selectable; inactive sites are listed disabled with the label "Inactive". No site is preselected, and a single site is not auto-selected. Only enhanced data model sites appear, because sites are read from `powerpagesite`. Standard data model sites are out of scope.
- [ ] **AC-7.3** Given a site is selected When the scan completes Then the files tile lists "Server logic (N)" with each record's file name and status ("Active" or "Inactive", from `statecode`). Inactive records are listed and checked like active ones, because they can be reactivated. If listing the records fails partway, the files tile shows "Inventory incomplete. Reconnect and rescan.", and the site result can't read as all Ready (F35).
- [ ] **AC-7.4** Given the site has no server logic When the scan completes Then the empty state reads "No server logic found on this site" and Export report is disabled.
- [ ] **AC-7.5** Given the PPTB connection is marked as Test, UAT or Production (its `environment` label, which the user sets in PPTB) When Inspector connects Then a persistent warning reads "This isn't a development environment. Inspector is designed for dev sites." and scanning stays available.
- [ ] **AC-7.6** Given the active connection changes, whichever tab is visible, Then Inspector's results and review marks are cleared and the site list reloads. The active connection has changed when its id or URL differs from the one the results were read with, or when no connection is active. PPTB fires `connection:created`, `connection:updated` and `connection:deleted` for any connection, so on each one the tool re-reads the active connection and compares; an event that leaves the id and URL unchanged (another connection added, edited or removed, or the active one renamed or relabelled) keeps results and review marks, and only the title bar and the AC-7.5 warning update. Selecting a different site, or rescanning the same site, also clears results and review marks. Results from a superseded scan are discarded and never shown (FR-7 scan ID, F34). When a successful site-list reload omits the selected site, the selection, its results and its review marks are dropped and the page returns to its no-selection state, with no notice (D-19 C, 4.2.1).
- [ ] **AC-7.7** Given the connected identity can't read some configuration When the scan runs Then the affected checks show "Needs review – couldn't read configuration" and never "Configured". These checks have the status Needs review, count toward M, and export as "Needs review" with that reason.
- [ ] **AC-7.8** Given the environment has no Power Pages sites When Inspector loads Then the empty state reads "No enhanced data model Power Pages sites found in this environment. Standard data model sites aren't supported.", no scan runs and Export report is disabled (F36). "Couldn't load sites" stays a separate error (Error Scenarios).
- [ ] **AC-7.9** Given `ServerLogic/Enabled` is `false` for the selected site When the scan completes Then a banner above the files tile reads "Server logic is disabled on this site (`ServerLogic/Enabled` = false)". Files are still listed and checked, and the banner is repeated in every export.
- [ ] **AC-7.10** Given the connection is lost mid-scan When the scan stops Then the results already read are kept and shown. Each file or check not yet read shows the state **Not scanned**, a "Connection lost. Reconnect and rescan." prompt appears, and a rescan replaces the results. Not scanned is a fourth display state, defined in FR-8. The connection is lost when a read fails with a network error or 401 while the active connection's id and URL are unchanged (Spike S2 records what the host returns for each). A 403 is AC-7.7, and a change of active connection is AC-7.6, which clears instead of keeping partial results.
- [ ] **AC-7.11** Given the host doesn't report the environment type and Dataverse doesn't expose it When Inspector connects Then the environment classification shows "Unknown" and the AC-7.5 warning is shown.
- [ ] **AC-7.12** Given `ServerLogic/TimeoutInSeconds` is set and isn't a positive integer up to 240 (Learn's maximum execution time) When the scan completes Then a site-level banner like AC-7.9 reads "`ServerLogic/TimeoutInSeconds` isn't a positive integer up to 240", and the banner is repeated in every export. It doesn't affect any check (F31). FR-7 defines how the value is read. For a value from 121 to 240 there's no banner, but the site detail notes "Microsoft's Power Pages plugin reports that values above 120 are clamped to 120. Learn allows up to 240." (owner decision 2026-10-20).

### Story 8: Review a file's readiness

**As a** developer
**I want** each server logic file checked for web role, table permissions and outbound networking
**So that** I catch access and security gaps before release

**Acceptance criteria:**

- [ ] **AC-8.1** Given a selected file When the Inspector renders Then it shows:
  - The title tile: a `<file> · <status>` line, "Review server logic readiness" and the sub-line "Inspect access, permissions and outbound networking before release."
  - A 3-segment ring, "K/3 addressed", with the legend "C configured · V reviewed · M review". **C = Configured, V = Reviewed, M = Needs review, U = Not scanned, T = total checks (3 per file), K = C + V** (F38, F39). The "· V reviewed" part appears only when V > 0. Not scanned segments are grey, count in neither K nor M, and add "· U not scanned" to the legend, pluralised as needed. A table-driven test covers all 4³ = 64 combinations of check states for one file.
  - Three finding tiles: Web role assigned, Table permissions and Outbound networking.
  - A detail tile.
- [ ] **AC-8.2** Given each finding When it renders Then it shows an icon (✓ or !), the title, a one-line summary and a status: "Configured" or "Reviewed" in the theme's primary colour, or "Needs review" in the needs-review colour (FR-11).
- [ ] **AC-8.3** Given a file is selected When no finding has been chosen Then the first "Needs review" finding is selected, or the first finding if none need review.
- [ ] **AC-8.4** Given the selected finding When the detail tile renders Then it shows the title, category, status, guidance text, a "Questions to consider" list and a configuration snapshot (web roles, tables with privileges, outbound).
- [ ] **AC-8.5** Given a "Needs review" finding When the user selects **Mark as reviewed** Then its status becomes "Reviewed", the file ring, the file's list summary and the snapshot update, and the button becomes "Undo review". The button isn't shown for findings that are "Configured".
  The button is also not shown when **any** of the finding's reasons is a read failure: "couldn't read configuration" (AC-7.7), "couldn't read handler code" (Error Scenarios) or a parent permission that couldn't be read; nor when the finding's required evidence is partly unscanned (`hasUnscannedEvidence`, FR-8 precedence table), even if its reasons are all analysis limits or configuration findings. The remedy is a rescan with better access, so a file can't become Ready on evidence nobody saw. Analysis limits stay reviewable: "Couldn't determine which connectors the code uses", "Couldn't analyse handler code" (the code downloaded but is empty or can't be parsed), "Couldn't interpret the scope of `<name>`" and a parent chain that loops or points at no record (F33). "Couldn't read handler code" means only that the download failed (owner decision 2026-10-20).
- [ ] **AC-8.6** Given the files list When it renders Then each file shows its summary: "All configured" when C = 3; "Ready · V reviewed" when K = 3 and V > 0; otherwise "K/3 · M to review" (F38).
- [ ] **AC-8.7** Given the files tile When it renders Then its footer always shows "Tenant outbound policy: not verified. This tool doesn't read tenant network policy."
- [ ] **AC-8.8** Given the check rules (FR-9) When a file is evaluated Then:
  - With no role assigned, Web role is "Needs review: No web role assigned. No site user can call it yet."
  - When the assigned roles **include** the site's anonymous role (`anonymoususersrole` = true in its `content`), whatever other roles are assigned, Web role is "Needs review: Callable by unauthenticated visitors." Roles are identified by that flag, never by name, because roles can be renamed.
  - Table permissions are evaluated over the grant set (FR-7): permissions linked to the file's roles, plus the Authenticated Users role's permissions when any assigned role isn't anonymous, plus the Anonymous Users role's permissions when the anonymous role is assigned (F27).
  - With any Global access in the grant set, Table permissions is "Needs review" and names the table, access type and the role it comes from.
  - A file that only exports `get()` whose grant set holds Create, Write, Delete, Append or Append To is "Needs review" with the summary "Change privileges on a handler that only exports `get()`". The detail lists the privileges found and adds "Based on exported function names, not on what the code does." (F25)
  - With no table permissions in the grant set, and Dataverse use detected in the handler code (FR-7 connector detection), Table permissions is "Needs review: Handler uses Dataverse but no table permissions are linked to its roles."
  - With no table permissions in the grant set, and no Dataverse use detected, Table permissions is "Configured: No Dataverse access in code, so no table permissions are needed." It counts toward K. **Exception:** if connector use couldn't be determined (FR-7), Table permissions is instead "Needs review: Couldn't determine which connectors the code uses." That result overrides this reassuring outcome (F24).
  - Only active table permissions count as linked. A permission that is inactive, or that is Parent scope with an inactive ancestor, is ignored. When a Parent-scope permission's chain can't be read or resolved, Table permissions is "Needs review: Couldn't evaluate parent permission `<name>`", whatever other permissions are linked (FR-7, F26).
  - When a permission in the grant set has a missing or unknown `scope`, Table permissions is "Needs review: Couldn't interpret the scope of `<name>`" (FR-7).
  - If several Needs-review conditions apply to one check, the summary shows the first in the order listed here and the detail tile lists all of them.
  - `ServerLogic/TimeoutInSeconds` is a site-level banner (AC-7.12), not part of any check (F31).
  - Outbound networking follows the FR-9 decision table. The code-based cases come first. If connector use couldn't be determined and no HttpClient use is detected, Outbound is "Needs review: Couldn't determine which connectors the code uses." (row O0). Otherwise, with no HttpClient use detected (FR-7), Outbound is "Configured: No HttpClient calls in code." with the detail "Cloud flows (`CloudFlow.TriggerAsync`) aren't checked; their connections and network access are configured in the flow." (row O1, F32).
- [ ] **AC-8.9** Given review marks When the session ends, the connection changes, another site is selected or the site is rescanned Then they're discarded. They aren't persisted.
- [ ] **AC-8.10** Given a file When all three checks are Configured or Reviewed Then its result pill reads "Ready". If any check is Needs review it reads "Needs review". If none is Needs review but any check is Not scanned it reads "Incomplete".
- [ ] **AC-8.11** Given a file with any check Not scanned When it renders Then that check shows a grey "Not scanned" status with the text "Not read before the connection was lost", no Mark as reviewed button, and no K contribution.
- [ ] **AC-8.12** Given a "Reviewed" finding When the report or screen shows it Then it also shows the original reason it needed review, so Reviewed is never read as "was fine".

### Story 9: Export reports

**As a** developer
**I want** to export the review as Markdown or PDF, for one file or the whole site
**So that** I can attach it to a PR or hand it to a reviewer

**Acceptance criteria:**

- [ ] **AC-9.1** Given a scan that has finished or stopped, with at least one file discovered, When the user selects **Export report** Then a 520px modal opens on a scrim. Export report is disabled while a scan runs, and a report from a stopped scan carries the AC-7.10 notice (F40). The modal follows the APG modal dialog pattern: focus is trapped, Esc closes it, and focus returns to Export report (F48). It has:
  - **Report:** *This file* or *Site summary*. *This file* is the default when a file is selected and exports that file. With no file selected, *This file* is `aria-disabled` with the reason "Select a file first", and *Site summary* is selected.
  - **Format:** *Markdown* (default) or *PDF*.
  - **Include:** Questions to consider (on), Configuration snapshot (on) and Redact environment and site names (off).
  - A primary button that reads "Export Markdown" or "Export PDF".
- [ ] **AC-9.2** Given This file + Markdown When the user exports Then `<file>-readiness.md` is saved, containing, in this order:
  - H2 "Server logic readiness: <file>".
  - **Environment**, **Scanned** and **Result** lines. Scanned reads "`<start>` – `<end>` (UTC±hh:mm)", followed by "Read as separate queries during this interval, not as one atomic snapshot." (F37)
  - The site banners (AC-7.9, AC-7.12 and the FR-7 default-role banner) as blockquotes, only when they apply.
  - A Check | Status | Finding table. A Reviewed check's Finding cell lists all its original reasons, whatever the Include toggles are set to (F41).
  - An H3 with guidance and a `- [ ]` question list per "Needs review" finding.
  - An H3 "Configuration snapshot" (web roles, tables with privileges, outbound), when that option is on.
  - The closing blockquote "Configuration review only. Tenant outbound policy not verified."
  
  The H2 and the screen show the record name as stored. `<file>` in the file name is the export stem: the record name without a trailing `.js`, sanitised per AC-9.4 (F52). Spike S1 found stored names have no `.js`; the trim stays for names a maker typed with it.
- [ ] **AC-9.3** Given Site summary + PDF When the user exports Then `<site>-site-readiness.pdf` is saved with:
  - A header row (glyph, "Logic Inspector", "Site readiness report · <date>").
  - A hero: the site ring covering every check across all files (FR-11), "K/T checks addressed (C configured, V reviewed)" with the AC-8.1 variables summed over the site (F38, F39), the environment/site path, the scan interval and not-atomic statement from AC-9.2, the headline "<F> server logic files, <R> findings to review" (R counts Needs review checks), and Ready, Needs review, Incomplete (AC-8.10) and "Not verified: Tenant outbound policy" counts.
  - A files table with a mini ring per file, the three checks and a result pill.
  - The site banners (AC-7.9, AC-7.12 and the FR-7 default-role banner) below the hero, only when they apply.
  - A "Review first" section listing each open (Needs review) finding, ordered by check (Web role, Table permissions, Outbound networking) and then by file name A–Z. If any checks are Not scanned, a separate "Not scanned" list follows it in the same order.
  - The footer "Configuration review only. Confirm effective access with a real site user. Exported <date-time with UTC offset>."
- [ ] **AC-9.4** Given This file + PDF, or Site summary + Markdown When the user exports Then the same content is produced in the other format: PDF uses the report page styling, and Markdown uses the H2 / table / H3 / checklist structure. File names follow `<file>-readiness.<ext>` and `<site>-site-readiness.<ext>`. In file names, the `<file>`/`<site>` stem is sanitised after redaction (AC-9.6): every run of characters outside `A-Za-z0-9._-` becomes `-`, leading and trailing `-` are trimmed, and an empty result becomes `site` (F43).
- [ ] **AC-9.5** Given "Questions to consider" or "Configuration snapshot" is off When exporting Then that content is left out of the report.
- [ ] **AC-9.6** Given "Redact environment and site names" is on When exporting Then the environment name, environment URL, site name and site domain or URL appear as `[environment]` and `[site]`, including in the file name of a Site summary export and the PDF's title metadata (F43). Server logic file names are not redacted.
- [ ] **AC-9.7** Given findings marked "Reviewed" When exporting Then they appear as "Reviewed" (distinct from "Configured") in every format.
- [ ] **AC-9.8** Given any export When it completes Then a toast confirms "<filename> exported". When the report's statuses and reasons are compared with the screen, they match. The report is built from the state at the moment the export dialog opens; later changes don't affect it (F45). If the results are cleared while the dialog is open (AC-7.6, a rescan or another site), the dialog closes, nothing is saved, and a status toast reads "Results changed, so the export was cancelled." Once the host's save dialog has opened, the snapshot already built is what gets saved.
- [ ] **AC-9.9** Given any export When the save is confirmed Then it finishes within 5 s, measured from the user confirming the save dialog to the toast. `saveFile` takes the content up front, so the report is built before the save dialog opens; building takes at most 5 s, measured from the primary button to the save dialog appearing, and doesn't count toward the save budget. If building or saving fails, an error toast reads "Couldn't save <filename>" with the reason, and no partial file is written. Cancelling the dialog writes nothing and shows no toast (mirrors AC-5.10 and AC-5.11, F46).
- [ ] **AC-9.10** Given configuration values containing Markdown or HTML syntax (a hostile-name fixture: a file, site and role named with `|`, `*`, `<script>`, `[x](y)` and a newline) When either format is exported Then the values render as literal text, the Markdown table keeps its columns, and nothing is fetched or executed (FR-10, F42).

## Functional Requirements

### FR-1: Shell

**Must:**
- Provide the three top tabs and the title-bar connection context and site picker, as in Story 1. The view state is `'starter' | 'objects' | 'inspector'`.
- Keep each tab's state while switching.
- Keep Starter and Server Objects fully usable without a connection.
- **Released pages:** a build-time list names the released pages (`starter`, `objects`, `inspector`). An unreleased page's tab follows AC-1.7, and its code is left out of the bundle. `objects` requires `starter`: Server Objects reads the Starter session, so a list that names `objects` without `starter` fails the build. The list isn't a runtime option or a tool setting, and users can't change it. Once all three pages are released, the list goes and AC-1.1 applies in full. v1.0.0 releases all three pages (FR-12), so the release build shows no disabled tab and renders the site pill; a build that names fewer pages (`npm run build:beta`) is a partial build for development and isn't published.
- Follow the host theme (AC-1.6, FR-11).
- Show every toast (success, info and error messages named in this spec) through `toolboxAPI.utils.showNotification({ title, body, type })`. Errors pass `duration: 0`, so they stay until dismissed. Success and info pass no `duration`, so they follow the user's PPTB notification duration setting. Toast text never includes stack traces.
- **Fallback:** when `showNotification` is missing, throws or rejects, show the same message as an in-tool toast styled like a Bootstrap toast: a stack at the bottom right of the tool, each toast with a header (title and a close button) and a body, fading in and out (no animation under `prefers-reduced-motion`). Success and info toasts hide after 5 s; error toasts stay until closed. Success and info toasts use `role="status"`; error toasts use `role="alert"`. Log the host failure with `console.error`, by error name only. A failing fallback never calls the host again.
- A button is disabled while its own action runs (F49).
- If the tool UI renders an external link (Learn or GitHub), open it only when the user selects it, through `toolboxAPI.utils.openInConnectionBrowser(url)`: the host blocks `target="_blank"` navigation. Never open a page on load. *As of 4.4.0 no UI link exists:* the unused `ExternalLink` component was deleted on 2026-11-11 (`1a17754`), and Learn and GitHub links live only in the generated handler header comment and README. The host adapter keeps `openInConnectionBrowser` for a future link.

### FR-2: Starter inputs

**Must:**
- Slugify the logic name (AC-2.2, AC-2.3).
- Offer all five HTTP methods mapped to Learn's function names (AC-2.6).
- Offer ten recipes (FR-3).
- Offer three client languages: fetch, jQuery and Liquid.

### FR-2a: Client call generation

**Must:**
- Generate the client call for the selected slug, method, recipe function and language per AC-4.4–4.8.
- Generate the request path strip per AC-4.8. The strip was removed by Fix 7 (addendum, AC-4.8 and FR-2a); nothing generates it.
- Use `shell.getTokenDeferred()` + `__RequestVerificationToken` for fetch, `shell.ajaxSafePost` for jQuery (correction 9) and the `serverlogic` tag for Liquid.
- Emit a body only for POST, PUT and PATCH (AC-2.7), using the recipe's example request (FR-3). Check `success` and parse `data` per Learn corrections 8 and 11, then branch on the handler's `status` (FR-3 contract table). The Liquid client uses the three branches in AC-4.7.
- Offer Liquid only when the AC-4.7 rule holds: the recipe's "Liquid" column is "Yes", and the current server text has no HTTP-only `Server.Context` member.
- Produce output that parses as valid JavaScript or Liquid (AC-4.11).

**Must not:**
- Emit the `$pages.ajax` preview API (Out of Scope).

### FR-3: Recipe catalogue

Each recipe defines:
- its default method and its functions;
- its tables, each with its **logical name**, which table permissions use, and its **entity set name**, which code uses (Learn: "use the EntitySetName");
- the privileges and **access type** for each table;
- its outbound domains, its site settings and its Learn link;
- its main object, shown in the recipe combobox (AC-3.1);
- its contract (the second table below).

**Main object** (AC-3.1): R1, R4, R10 `Server.Connector.Dataverse`; R2, R8 `Server.Context`; R3, R5, R6, R7 `Server.Connector.HttpClient`; R9 `Server.Connector.CloudFlow`. Recipes that call several objects show one; the Server objects column lists them all.

**Account access setup** (F04). Every Account-scoped grant (R1, R4, R10) adds two checklist lines: the relationship, and "Test users' contacts must have a parent account." The relationship for `contact` (R1, R4) is `contact_customer_accounts` (account → contact via `parentcustomerid`). For `account` (R10) it reads "maker verifies": Spike S1 found no single standard relationship (the sample site uses its own `msa_account_managingpartner`).

**Upstream credentials** (F10). R3, R5, R6, R7 and R9 add one line to the permission note and `README.md`: "Upstream calls use this integration's own credentials (site setting, app registration or flow connection), not the caller's." The server pane footer is unchanged.

| # | Recipe | Group | Default | Functions | Server objects | Permissions / config |
|---|---|---|---|---|---|---|
| R1 | Read Dataverse records | Core | GET | `get` | Logger, Connector.Dataverse.RetrieveMultipleRecords | Read on `contact` (entity set `contacts`), access type Account (relationship per Account access setup) |
| R2 | Validate a request | Core | POST | `post` | Context.Body, Logger | Web role only; rejects invalid input before any data access |
| R3 | Call an external API | Core | GET | `get` (async) | Connector.HttpClient.GetAsync, SiteSetting | Allowed domain for the target host; base URL in the site setting `ExternalApi/BaseUrl` |
| R4 | Dataverse CRUD | Learn tutorial: Dataverse tables | GET | `get`, `post`, `put`, `del`, each in `try`/`catch` with `Logger.Log` and `Logger.Error` | Context.QueryParameters/Body, Dataverse RetrieveRecord, RetrieveMultipleRecords (with `additionalParameters`), CreateRecord, UpdateRecord, DeleteRecord, Logger | Two table permissions on `contact` (entity set `contacts`), both on the recipe's web role: (1) Read, Write and Delete, access type Account (relationship per Account access setup); (2) Create only, access type Global, for `post` (F04). Learn binds no account on create, so an Account-scoped Create can't place the new contact in the caller's scope. Inspector flags the Global Create grant, and the README says this is expected and that the new contact isn't readable through the Account-scoped permission until it's linked to the caller's account. Learn's tutorial uses Global for all four privileges; the narrower setup is a listed difference. Spike S4 confirmed the server can read the caller's parent account (`RetrieveRecord("contacts", <contactid>, "$select=_parentcustomerid_value")`), but didn't try a bound create. **If the phase that builds R4 shows** that a create binding `parentcustomerid_account@odata.bind` to that account succeeds under an Account-scope Create permission, `post` binds it, never to a value from the request; Create moves into the Account permission; and the checklist adds Append on `contact` and Append To on `account`. That change lands as a spec update. The entity set comes from an allowlist (default `["contacts"]`), and `id` must be a GUID (correction 17). Demo page: the Learn contacts CRUD table |
| R5 | External service CRUD | Learn tutorial: External services | GET | `get`, `post`, `put` (uses `PatchAsync`), `del` (all async) | HttpClient GetAsync, PostAsync, PatchAsync, DeleteAsync, Context, Logger | Allowed domain `services.odata.org` (replaceable); `baseUrl` constant `https://services.odata.org/TripPinRESTierService` (public demo, the allowed literal in AC-3.5); web role Administrators in Learn. Demo page: the Learn OData people table |
| R6 | Call an Azure Function | Learn tutorial: Azure Function | GET | `get` (async) | HttpClient.GetAsync, Context.QueryParameters, SiteSetting | Function URL including key from the site setting `AZURE_FUNCTION_URL`, never a literal (correction 17); the `name` parameter is URL-encoded and sent; web role Authenticated Users; allowed domain `<function-app>.azurewebsites.net`, a placeholder the maker replaces with their function app's host. Learn doesn't document wildcard support in `AllowedDomains`, so no wildcard is suggested. Demo page: the Learn "Test Server Logic" card |
| R7 | Microsoft Graph & SharePoint | Learn tutorial: Graph and SharePoint | POST | `post` (async) plus a `getAccessToken` helper | SiteSetting (CLIENT_ID, CLIENT_SECRET, TENANT_ID, HOSTNAME, SITE_PATH), HttpClient PostAsync, GetAsync, PutAsync, Dataverse.CreateRecord | Allowed domains `login.microsoftonline.com` and `graph.microsoft.com`; Create on the registration table: logical name `crd69_eventregistration`, entity set `crd69_eventregistrations` (from Learn's sample solution, replaceable), access type Global with Create only. Inspector will flag the Global access for review, and the README says this is expected. The secret is held in Key Vault behind an environment variable. The README notes `Sites.Selected` as a least-privilege alternative to `Sites.ReadWrite.All`. Built from the two script excerpts Learn publishes; the full script is inside the GitHub sample package (Spike S3). The optional "Send confirmation email" step is not generated: Learn publishes no code for it. Ticket HTML escaping, file naming and failure stages follow the R7 Must below. No demo page |
| R8 | Invoke from Liquid | Learn reference: Author server logic | none (Liquid only) | `getSummary` | Context.Input, Context.ActivityId/FunctionName/ServerLogicName | A web role the visiting user holds; no table permissions. Input is parsed with `JSON.parse(Server.Context.Input \|\| "{}")` and validated before use. Liquid snippets with and without `input:` (AC-3.8) |
| R9 | Trigger a cloud flow | Learn reference: Server objects | POST | `post` (async) | CloudFlow.TriggerAsync, Logger | The flow must be created and added to the site with an authorized web role that the caller holds. Flow ID from the site setting `CLOUD_FLOW_ID`; payload from the validated request body. `202` with an empty `Body` is treated as success |
| R10 | Call a Dataverse custom API | Learn reference: Server objects | GET | `get` (bound function), `post` (unbound action), `patch` (bound action) | Dataverse.InvokeCustomApi, Context.QueryParameters/Body, Logger | Placeholder API names from Learn (`new_CustomBoundFunction`, `new_Action`, `new_CustomBoundAction`) that the maker replaces; bound calls target `accounts(<id>)` with `id` validated as a GUID; Read and Write on `account` (entity set `accounts`), access type Account (relationship per Account access setup); the custom API must exist in the environment. The README and checklist add (F07): "Replace the three placeholder API names. The custom API's request and response parameters must match what the handler sends and reads. Review what each API changes beyond the bound record." Which identity Dataverse checks for the API's `ExecutePrivilegeName` when server logic calls it is unverified: the checklist marks it "maker verifies" and Spike S4 probes it. `patch` maps to the bound action because that action changes the bound record. `InvokeCustomApi` is still called with `"post"`, as Learn shows |

**Recipe contracts.**
- **Return shape for every handler** (Microsoft's `add-server-logic` "Approach C"):
  - Success returns `JSON.stringify({ status: "success", ... })`, with the payload keys listed below.
  - Failure returns `JSON.stringify({ status: "error", message })`.
  - `message` is a fixed, human-readable string. Exception text and connector bodies are never returned.
  - A validation failure adds `errors: [{ field, message }]` to the failure object.
- **Logging rule** (F09). Generated handler code may log only the following:
  - a fixed operation name;
  - for connector failures, `StatusCode` and `ReasonPhrase`;
  - for caught exceptions, `e.name`;
  - the name (never the value) of a missing site setting;
  - `Server.Context.ActivityId`.

  It never logs `Body`, `e.message`, request or response URLs, headers, tokens or site-setting values. Learn's DevTools page says diagnostics are on by default on private sites, and any public site can turn them on, so log output can reach the browser. Learn's tutorials log `err.message`, and dropping it is a listed difference (AC-3.7).
- **Parses to an object** means a non-null, non-array JSON object. Malformed JSON or another shape fails validation with `errors: [{ field: "body", message }]` (`"input"` for R8).
- **Client contract:** the client checks the envelope's `success`, parses `data`, then branches on `status`.
- **GUID** means `^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$`.
- Every free-text value placed in a URL is passed through `encodeURIComponent`.
- **Body decoding** (F01): JSON means `JSON.parse` of the non-empty `Body`; a parse failure is a caught error that returns `status: "error"`. Raw means the `Body` string unchanged. Only R9 tries JSON and falls back to text.
- **Created record ID** (F55): `const id = r.Headers && (r.Headers.entityid ?? r.Headers.entityId);`, where `r` is the `toResult` value. A missing `id` returns `status: "error"`. Spike S4 found the runtime sends `entityId` (camelCase), next to `OData-EntityId` and `Location`.
- `README.md` notes "Validation isn't authorization; table permissions are." (F08)

| # | Inputs | Validation (before any data access or outbound call) | Success payload | Liquid |
|---|---|---|---|---|
| R1 | none | — | `contacts: [{ id, fullname, email }]` (fixed `$select=contactid,fullname,emailaddress1&$top=10`) | Yes (no input; synchronous) |
| R2 | Body JSON `{ name, email }` | `Body` parses to an object; `name` is a non-empty string of at most 100 characters after trimming; `email` is a string of at most 254 characters with exactly one `@` and a `.` after it; other fields are ignored | `name`, `email` (the trimmed values) | No (reads `Body`) |
| R3 | Query `q` (optional) | `q` is at most 100 characters; it's sent URL-encoded | `data`: the upstream `Body` decoded as JSON | No (async) |
| R4 | Query `entitySetName`, `id`, `additionalParameters` (`get` only); Body JSON object (`post`, `put`) | The entity set is in the allowlist; `id` is a GUID (required for `put` and `del`); `additionalParameters` is at most 500 characters, made of `&`-separated `$select=`, `$filter=`, `$top=`, `$orderby=` or `$expand=` segments only, with each option name at most once, and is otherwise rejected; `$top`, when present, is an integer from 1 to 50; a multi-record `get` (no `id`) without `$top` gets `$top=10` appended, so 10 is the default and 50 an enforced cap; other option values go to Dataverse unchanged, and a malformed one comes back as a 400 that returns `status: "error"` (F08); `Body` parses to an object | `get`: `data` (the record, or the `value` array); `post`: `id` (the created record ID rule); `put`, `del`: nothing beyond `status` | No (reads the request) |
| R5 | Learn's names and locations (F03): `get` query `username` (optional; absent lists people); `post` Body `{ serviceSession, …person }`; `put` Body `{ serviceSession, UserName, …changes }`; `del` query `username` and `serviceSession` (both required) | `username` and `UserName` match `^[A-Za-z0-9._-]{1,64}$`; `serviceSession` matches `^[A-Za-z0-9()]{0,64}$`; values placed in a URL are URL-encoded; `Body` parses to an object | `get`, `post`: `data`, the upstream `Body` decoded as JSON; `put`, `del`: nothing beyond `status` when `Body` is empty (TripPin returns 204) (F58) | No (async) |
| R6 | Query `name` | `name` is required, 1–100 characters, and URL-encoded | `message`: the upstream `Body` raw, not parsed (Learn's function returns plain text) (F01) | No (async) |
| R7 | Body JSON { `fullname`, `email`, `phone`, `event`, `eventText`, `date` } | `fullname` and `eventText`: non-empty strings of at most 200 characters after trimming; `email` and `phone`: non-empty strings of at most 100 characters (the column limits), and `email` also follows R2's rule (exactly one `@` and a `.` after it, checked with `split("@")` and `indexOf`, never `startsWith`/`endsWith`); `event`: a whole number (`Number.isInteger`), not range-checked, because the table is replaceable; `date`: a string matching `^\d{4}-\d{2}-\d{2}$`; the body parses to an object (field `body`) | `id`: the created registration's id (the created record ID rule) | No (async) |
| R8 | `Input` JSON `{ category, maximumResults }` | `Input` parses to an object, defaulting to `{}`; `category` is a string of at most 50 characters (default `""`); `maximumResults` is an integer from 1 to 50 (default 5) | `category`, `maximumResults`, `activityId`, `functionName`, `serverLogicName` | Yes (Liquid only) |
| R9 | Body JSON object | `Body` parses to an object | `flowResponse`: the flow's `Body` decoded as JSON if it parses, otherwise the raw string; `null` when empty, including a `202` (F01) | No (async) |
| R10 | Query `id` (`get`, `patch`); Body JSON object (`post`, `patch`) | `id` is required for `get` and `patch` and is a GUID; `post` takes no `id`; `Body` parses to an object | `data`: the custom API `Body` decoded as JSON, or `null` when it's empty | No (reads the request) |

**Example requests** (F08). Generated clients and the AC-4.12 harness use these. `<guid>` is the placeholder `00000000-0000-0000-0000-000000000000`.

| # | Function | Example request |
|---|---|---|
| R1 | `get` | no query, no body |
| R2 | `post` | Body `{ "name": "Alton Stott", "email": "alton@contoso.com" }` |
| R3 | `get` | `?q=contoso` |
| R4 | `get` | `?entitySetName=contacts&additionalParameters=$select=fullname,emailaddress1` |
| R4 | `post` | `?entitySetName=contacts`, Body `{ "firstname": "Alton", "lastname": "Stott", "emailaddress1": "alton@contoso.com" }` |
| R4 | `put` | `?entitySetName=contacts&id=<guid>`, Body `{ "telephone1": "555-123-4567" }` |
| R4 | `del` | `?entitySetName=contacts&id=<guid>` |
| R5 | `get` | `?username=russellwhyte` |
| R5 | `post` | Body `{ "serviceSession": "(S(abc123))", "UserName": "altonstott", "FirstName": "Alton", "LastName": "Stott" }` |
| R5 | `put` | Body `{ "serviceSession": "(S(abc123))", "UserName": "altonstott", "LastName": "Stott-Ray" }` |
| R5 | `del` | `?username=altonstott&serviceSession=(S(abc123))` |
| R6 | `get` | `?name=Alton` |
| R7 | `post` | Body `{ "fullname": "Alton Stott", "email": "alton@contoso.com", "phone": "555-123-4567", "event": 197360000, "eventText": "Tech Summit - General Admission", "date": "2026-11-05" }` |
| R8 | `getSummary` | Liquid `input: '{"category":"news","maximumResults":5}'` |
| R9 | `post` | Body `{ "message": "Hello" }` |
| R10 | `get` | `?id=<guid>` |
| R10 | `post` | Body `{}` |
| R10 | `patch` | `?id=<guid>`, Body `{}` |

**Must:**
- Validate request input before any data access or outbound call in every generated function that reads input, exactly as the contract table says.
- Read every required site setting before any outbound call. If one is missing or empty, log `Server.Logger.Error("Missing site setting <name>")` and `return JSON.stringify({ status: "error", message: "Server logic isn't configured: missing site setting <name>" })`, without making the call (F57). Read site settings inside the function's `try` (R3, R6, R7 and R9; R7 and R9 moved inside on 2026-11-11, `7648d5d`), so a `Server.SiteSetting.Get` that throws is handled like any other failure. Whether `Get` throws or returns `null` for a missing setting is unverified on a live site (the T16 probe was deferred on 2026-11-11).
- Never put the text `with(` (with or without whitespace before `(`) anywhere in generated code, including OData strings. Split such literals instead (correction 14).
- Don't `await` `Server.Connector.Dataverse.*` calls, and mark a function `async` only when it awaits `HttpClient` or `CloudFlow` (correction 19).
- Read secrets, keys and tenant-specific endpoints from site settings; never emit literal secrets (the one literal endpoint allowed is R5's public demo URL, AC-3.5). In R4 and R10, never take a table name or record ID from the request without checking it: R4 compares the entity set against an allowlist, and both check that `id` is a GUID. R4 `post` and `put` drop every body key that contains `@` (`@odata.bind` and annotations) before `CreateRecord` or `UpdateRecord`; there is no column allowlist (owner default 2026-11-11, `7648d5d`). The `@odata.bind` behaviour is not probed on a live site. In R7, build the token request body as a form-encoded string (`key=value&…` with each value passed through `encodeURIComponent`), because the token request declares `application/x-www-form-urlencoded` (correction 17). Generated READMEs note Learn's guidance to hold secrets in Azure Key Vault and surface them through an environment variable behind a site setting.
- Generate output that's identical for identical inputs.
- Pass one of `application/json`, `text/html` or `application/x-www-form-urlencoded` as `contentType` on every `HttpClient` call that sends a body (Learn correction 12).
- Normalise every connector result with `toResult` (Learn correction 11), check `IsSuccessStatusCode`, log a failure with `Server.Logger.Error` as the logging rule allows, and on success decode a non-empty `Body` as the recipe's contract row says (Body decoding, F01).
- Follow the logging rule in every generated `Server.Logger` call (F09).
- **R7 ticket safety and failure behavior** (F05, F06):
  - Escape every value interpolated into the ticket HTML with an `escapeHtml` helper (`&`, `<`, `>`, `"`, `'`).
  - Name the ticket file `<Server.Context.ActivityId>-<name-slug>.html`. `<name-slug>` is built from `fullname` with the AC-2.2 slug rule and cut to 50 characters, and is `registrant` when empty. A slash, quote, `%` or `#` in the name can't change the Graph `root:/…:/content` path. Learn documents ActivityId as unique per invocation (Server objects), so the name doesn't depend on a timestamp.
  - Add `@microsoft.graph.conflictBehavior=fail` to the upload URL; Graph's default for PUT is `replace`. Intended behavior: a name collision fails the upload, and the handler returns an error before any Dataverse write. **Unverified** until the Spike S3 collision probe passes. Until then, neither the spec nor the README claims that the upload can't overwrite a file.
  - Run the steps in Learn's order: token and site lookup, upload, then `CreateRecord`. Each stage's failure logs its own fixed operation name, with `StatusCode` and `ReasonPhrase`, and returns its own fixed `message`:

    | Failed stage | Logged operation name | Returned `message` |
    |---|---|---|
    | Token or site lookup | `R7 connect` | "Couldn't connect to SharePoint." |
    | Upload | `R7 upload` | "Couldn't upload the ticket." |
    | `CreateRecord` after a successful upload | `R7 create after upload`, plus `ActivityId` (the file name's prefix, so the orphan can be found without logging the registrant's name) | "Registration failed after the ticket was uploaded." |

  - **Retry consequences:** the handler never deletes, reuses or reconciles files. A retry is a new request with a new ActivityId, so it uploads another ticket. A ticket from a failed create stays in SharePoint as an orphan. The README states this and tells the maker to find orphans by ActivityId and delete them manually. Compensation and idempotent retries are out of scope.
- Guard `Server.User` against `null` wherever it is read.
- Use only identifiers, comments and strings that match none of the FR-4 patterns, ignoring case (correction 14). For example, avoid "Delete the record" in comments, the methods `.startsWith(` and `.endsWith(`, and anonymous `function (…)` expressions; use arrow functions or named functions instead. *Unverified (N5):* `new-recipes.md` reports HTTP 400 at runtime for `const` function expressions and anonymous `map`/`forEach` callbacks, which the generated handlers use. No live evidence settles it either way; the T16 probe was deferred on 2026-11-11, so this bullet stands unverified, not confirmed. If a live probe shows a 400, the generators move to function declarations.

**Must not:**
- Emit browser APIs or restricted patterns (FR-4).

### FR-4: Browser and restricted-pattern checks

**Code analysis.** Every rule that reads code structure uses one JavaScript tokenizer and parser at ECMAScript 2023, for example acorn. Those rules are FR-6 used-member detection, AC-4.7's Liquid rule, AC-6.8 insertion, FR-7's function names and connector detection, and the browser-API check below. Comments are excluded from those rules' tokens. Code is never evaluated.

**Restricted patterns** (correction 14): each pattern on Learn's list is matched the way the runtime matches it, as a case-insensitive regex over the raw text. So every match is **Blocked**, wherever it appears: code, a comment, a string, template text, a regex literal or the inside of a longer identifier. This check doesn't use the tokenizer, so a file that doesn't parse is still checked in full. The regex forms:

- A pattern ending in `(` is its name, optional whitespace, then `(` (for example `with\s*\(`, `Function\s*\(`, `eval\s*\(`).
- `delete` is `delete\s+[a-zA-Z_$]`, so `DeleteRecord(` doesn't match.
- `import from` is `import`, whitespace, then `from` as a word later in the same statement (for example `import x from "y"`).
- Every other pattern is its literal text, with `.` matched literally (for example `fs\.`, `Reflect\.`, `__proto__`, `prototype`, `debugger`).

Spike S4 observed the `with(`, `Function(` and `delete` forms on a live site; the other forms are inferred from them.

**Browser APIs** aren't on Learn's restricted list: the runtime doesn't define them, so code that calls them fails when it runs. They use the tokenizer (for example acorn's tokenizer, `ecmaVersion: 2023`) to classify code, comments, strings, template interpolations and regex literals, and to report line numbers:

- **Blocked:** the name appears in code, meaning outside comments and string literals, as a whole token. Whole token means the match isn't preceded or followed by an identifier character `[A-Za-z0-9_$]`. Matching is case-sensitive.
- **May be rejected:** the name appears inside a comment, a string literal or a regex literal. The message reads "May be rejected by Power Pages validation".
- **Tokenizer fallback** (F23): if tokenizing fails, the browser-API check falls back to raw substring matching, reports every hit as "May be rejected" and adds the note "Couldn't parse this code".

Both severities make Browser checks "needs attention" and flag the lines, so a parse failure never passes. Generated recipes must have **zero** matches of either severity (AC-3.2).

| # | Input text | Expected |
|---|---|---|
| T1 | Every generated recipe, any method or language | no matches |
| T2 | `Server.Connector.Dataverse.DeleteRecord(a, b)` | no match (`delete` needs whitespace and a name after it) |
| T3 | `Server.Connector.HttpClient.DeleteAsync(u, h)` | no match |
| T4 | `function del() {}` | no match |
| T5 | `delete obj.x;` | Blocked, `delete` |
| T6 | `// never delete this` | Blocked, `delete` (comments count; correction 14) |
| T7 | `const s = "fetch";` | May be rejected, `fetch` |
| T8 | `fetch(url)` | Blocked, `fetch` |
| T9 | `name.startsWith("a")` | Blocked, `with(` (matching ignores case; correction 14) |
| T10 | `getFunction(x)` | Blocked, `Function(` (inside a longer identifier) |
| T11 | `const n = refs.length;` | Blocked, `fs.` (inside the identifier `refs`) |
| T12 | `if (x) { with (o) {} }` | Blocked, `with(`; the space before `(` still matches |
| T13 | `Object.getPrototypeOf(x)` | Blocked, `Object.getPrototypeOf` |
| T14 | `Server.Logger.Log("prototype")` | Blocked, `prototype` (strings count) |
| T15 | `const q = "$filter=startswith(name,'a')";` | Blocked, `with(` (inside a string; correction 14) |
| T16 | `import x from "y";` | Blocked, `import from` |
| T17 | `const r = eval ("1");` | Blocked, `eval(`; the space before `(` still matches |
| T18 | `` const s = `${fetch(u)}`; `` | Blocked, `fetch` (a template interpolation is code) |
| T19 | `/fetch/.test(s)` | May be rejected, `fetch` (inside a regex literal) |
| T20 | `function get( { eval(x) }` (doesn't parse) | Blocked, `eval(` (restricted patterns don't need the tokenizer), with "Couldn't parse this code" |
| T21 | `list.forEach(function (k) {})` | Blocked, `Function(` (rejected live with `RTSL01`, Spike S4) |
| T22 | `// Delete after the spike` | Blocked, `delete` (rejected live with `RTSL01`, Spike S4) |

**Must:**
- Flag every occurrence in the server pane of:
  - Browser APIs: `fetch`, `XMLHttpRequest`, `window`, `document`, `localStorage`, `sessionStorage`.
  - Each restricted pattern on Learn's Limitations list: `__dirname`, `__filename`, `import(`, `import from`, `eval(`, `Function(`, `setTimeout(`, `setInterval(`, `setImmediate(`, `process.exit`, `process.kill`, `child_process`, `fs.`, `require(`, `constructor.constructor`, `this.constructor`, `arguments.callee`, `with(`, `delete`, `Object.getPrototypeOf`, `Object.setPrototypeOf`, `Proxy(`, `Reflect.`, `Symbol.for`, `__proto__`, `prototype` and `debugger`.
- Report the line numbers.
- Re-run the check on every edit or insert.

### FR-5: Readiness and download

**Must:**
- Show a 3-segment readiness ring (AC-5.1–5.4).
- Download `<slug>.zip` with exactly the files in AC-5.6: four for every recipe, five for R4–R6.
- Download at any readiness level, marking the open items.

**Must not:**
- Claim that permissions exist in any environment. Starter's Permissions item is self-reported.

### FR-5a: Starter persistence

Removed in v1.0.0. Starter state lives only while the tool is open (Non-Goals); Start over resets it (AC-5.9). The tool writes nothing to the host's tool settings. Inspector results, review marks and environment data are never persisted either.

### FR-6: Server Objects catalogue

Learn-verified objects (9). Only members that Learn documents are listed. The extra `Server.User` members (contactid, Roles, parentcustomerid) and `Server.Website` members (adx_websiteid, name) shown in the mock are omitted, because Learn doesn't document them. Dataverse takes an `entitySetName` (for example `accounts`), and `options` strings have no leading `?`.

| Object | Members |
|---|---|
| `Server.Logger` | Log, Warn, Error |
| `Server.Context` | ActivityId, Body, FunctionName, Headers, HttpMethod, Input, QueryParameters, ServerLogicName, Url |
| `Server.User` | fullname (returns `null` when anonymous) |
| `Server.Connector.Dataverse` | CreateRecord, RetrieveRecord, RetrieveMultipleRecords, UpdateRecord, DeleteRecord, InvokeCustomApi |
| `Server.Connector.HttpClient` | GetAsync, PostAsync, PutAsync, PatchAsync, DeleteAsync |
| `Server.Connector.CloudFlow` | TriggerAsync |
| `Server.Website` | adx_primarydomain |
| `Server.SiteSetting` | Get |
| `Server.EnvironmentVariable` | get |

**Must:**
- Show each member's signature, including Learn's overloads (`options` and `skipCache`), a description and at least one sample. Show its return type only where Learn documents one: the connector result shape (correction 11) for `Dataverse.*`, `HttpClient.*` and `CloudFlow.TriggerAsync`, and `null` for an anonymous `Server.User`. Everywhere else the return type reads "Not documented on Learn". Mark `HttpClient.*` and `CloudFlow.TriggerAsync` as async, and `Dataverse.*` as synchronous (correction 19).
- Use the sample variants from the mock for RetrieveMultipleRecords (Filter by account, Top N, Expand lookup).
- Include the Learn samples:
  - InvokeCustomApi: bound function, bound action and unbound action.
  - CloudFlow.TriggerAsync.
  - HttpClient: one per verb.
  - Context: request info and Liquid `Input`.
- Mark each `Server.Context` member by invocation context, per correction 13:
  - **Both:** ActivityId, FunctionName and ServerLogicName.
  - **HTTP only:** Body, Headers, HttpMethod, QueryParameters and Url.
  - **Liquid only:** Input.

  AC-4.7 uses the HTTP-only mark.
- Detect "used" objects and members from the current server pane text, using FR-4 code analysis, so mentions in comments don't count.

### FR-7: Inspector connection and scan

**Must:**
- Use the host's active connection.
- Host operations are typed and feature-owned. Handler code is retrieved with the unbound actions `InitializeFileBlocksDownload` and `DownloadBlock` through `dataverseAPI.execute`, called only inside `src/services/pptb/`, which rejects any other request at runtime: `isAllowedFileRequest` accepts only one of those two `operationName`s with `operationType: 'action'` and no `entityName` or `entityId` (since 2026-11-11, `691236c`). PPTB supplies authentication and Dataverse enforces the signed-in user's permissions. Feature components never receive a generic execute interface.
- Give each scan an ID made of the connection, the site and a counter. Results carrying a stale ID are discarded, and starting a rescan supersedes the running one (F34).
- Read every page of every query (F35). Spike S2 (2026-10-22) observed `@odata.nextLink` on `queryData` results and a second linked page from the relative link. The 2026-11-10 live run closed RG-001 ("Second request URL equals the issued nextLink", passed, `findings/logic/probe_findings.md`, Automated live evidence), so `NEXT_LINK_UNVERIFIED` is `false` since 2026-11-11 (`691236c`, owner decision): a full page with no next link is the last page. Caveat: the evidence is a tool-to-host comparison (the tool passed the issued link to the host unchanged) plus a unit test in the PPTB 1.2.8 fork `89028ff`; no Network-panel capture was recorded. The strict guard remains available to callers that pass `true` as the positional `strict` argument of `queryAllRows` or `fetchAllPages`. The `fetchXmlQuery` fallback isn't built; it would be needed only if a host altered the token.
- Retry a read that fails with 429 or 5xx up to 3 times, waiting 1 s, 2 s and 4 s (PPTB sends no `Retry-After`). After the last attempt the check is "Needs review – couldn't read configuration" (AC-7.7). PPTB's docs leave retries to the tool.
- **Status from message text (recorded host contract, 2026-11-11).** No numeric `status` crosses PPTB's Electron IPC, so `src/services/pptb/hostErrors.ts` derives the status from the error's message text when the error carries no numeric `status`: a Dataverse `0x…` code mapped in its table (PrivilegeDenied → 403, two not-found codes → 404, four service-protection and throttling codes → 429) wins; an unmapped code falls through to an `HTTP <n>` segment (since `691236c`, N2); four sign-in phrases mean 401; `Request failed:` marks a transport loss (AC-7.10). This wording was observed on PPTB 1.2.8 fork `89028ff` and isn't a published contract. If PPTB rewords it, an error with no recognisable text gets no status: it is reported with the generic "Couldn't read data from Dataverse.", 429 and 5xx stop retrying, a 403 environment-variable read reads as "failed" rather than "denied", and network loss stops counting as connection loss.
- Keep at most 4 reads in flight, so per-record reads and their retry waits overlap and a 50-record scan fits the 30 s NFR. Dataverse's service protection limit is 52 concurrent requests per user (Learn), so 4 stays well inside it. The retry rule applies to each request.
- In `$filter`, write every string value as an OData literal: double each `'` and URL-encode the result (Learn, "Filter rows using OData"). This covers values that come from configuration, such as environment-variable schema names, which may contain `'`.
- List the Power Pages sites, and list the server logic records with their status for the selected site.
- For each record, read its web roles, the grant set's table permissions (table, access type, privileges), its code (to derive exported function names and connector use), and the `ServerLogic/Enabled`, `ServerLogic/AllowedDomains`, `ServerLogic/AllowNetworkingToAllDomains` and `ServerLogic/TimeoutInSeconds` site settings.
- Read each fact from the source in the data-source table below.
- Derive exported function names by parsing the code for top-level `function <name>(` and `async function <name>(` declarations, ignoring comments and strings. A handler "exports only `get`" when the only HTTP-mapped names (`get`, `post`, `put`, `patch`, `del`) are `get`. Helper names such as `getAccessToken` are not HTTP-mapped.
- Detect connector use from the code's tokens, with comments excluded (FR-4 code analysis, F24):
  - **Uses Dataverse:** an identifier or string-literal token `Dataverse` appears. **Uses HttpClient:** the same rule for `HttpClient`. Dotted, bracket, destructured and aliased uses all contain the token.
  - **Couldn't determine:** a `Server` or `Connector` identifier token is followed by anything other than `.` and an identifier, or `[`, a string literal and `]`. This catches `const c = Server.Connector;`, `const { Connector } = Server;`, `Server[k]` and `Server.Connector[name]`.
  - **Precedence:** Couldn't determine overrides both no-use outcomes: Table permissions' "No Dataverse access in code" (AC-8.8) and Outbound's O1 (FR-9). Each becomes Needs review: "Couldn't determine which connectors the code uses." A check where the connector is detected is evaluated normally.
  - There is no alias or data-flow tracking. Deliberately obfuscated access, for example `globalThis["Ser" + "ver"]`, is outside a configuration review.
  - **Fixtures:**

    | Code | Expected |
    |---|---|
    | `Server.Connector.Dataverse.RetrieveRecord(…)` | Uses Dataverse |
    | `Server.Connector["HttpClient"]` | Uses HttpClient |
    | `const c = Server.Connector; c[name](…)` | Couldn't determine |
    | `const { Connector } = Server;` | Couldn't determine |
    | `// Server.Connector.Dataverse` only | No use |
- Build each file's **grant set** (F27): the table permissions linked to the file's roles, plus those linked to the Authenticated Users role (`authenticatedusersrole`) when any assigned role isn't anonymous, plus those linked to the Anonymous Users role when the anonymous role is assigned. Learn assigns every authenticated user the Authenticated Users role, so its grants always apply. A Parent-scope permission is linked to the roles of the top permission in its chain, plus any roles listed on the permission itself: Spike S1 found 41 of 42 Parent-scope permissions carry no roles of their own. The snapshot labels each permission with the role it comes from and states "Other roles a user may hold aren't assessed."
- Count a table permission as linked only when it's active (`statecode` = 0). A Parent-scope permission also needs its parent chain followed (F26):
  - **Known inactive:** if the permission or any ancestor is inactive (`statecode` = 1), the permission is ignored. The snapshot lists it as "(inactive, ignored)" or "(parent inactive, ignored)".
  - **Unknown:** an ancestor can't be read, the parent reference resolves to no readable record, or the chain loops. Table permissions is then Needs review, "Couldn't evaluate parent permission `<name>`", whatever other permissions are linked. An unresolved chain never leaves a clean Configured result. An active terminal ancestor whose `scope` is unknown (FR-7 scope rule) makes every linked descendant unresolved, whether the effective role link comes from the descendant or from the ancestor. When the records were read successfully this is the reviewable analysis limit "Couldn't evaluate parent permission `<name>`"; a failed ancestor or configuration read remains a non-reviewable read failure. A known inactive ancestor still excludes the permission.
  - The parent link is `content.parententitypermission`, the parent permission's `powerpagecomponentid` on the same site (Spike S1: 42 of 42 resolved).
  - The chain uses the type-18 components Inspector already reads, so it adds no query.
- Parse `ServerLogic/AllowedDomains` as a comma-separated list of hosts, each trimmed (Spike S4: entries with a leading space matched). Learn doesn't document the format, so the parse is strict: split on `,`, trim each entry and drop empty entries. An entry is a host when it matches `^(\*\.)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*$`. Any other entry (a scheme such as `https://`, a path, a port, inner whitespace, or `*` anywhere but a leading `*.`) means the value can't be parsed, and the Outbound check is "Needs review – couldn't interpret `ServerLogic/AllowedDomains`", naming the entry (FR-9, O2). A value with no entries left is "no allow list". An entry that starts with `*.` is a **wildcard entry**: Spike S4 found `*.example.com` matched neither `www.example.com` nor `example.com`, so wildcard entries are reported (FR-9) and don't count toward the list.
- Read a setting whose `content` has `source` 1 and an `envvar_schema` from its environment variable: the `environmentvariabledefinitions` row with that `schemaname`, its `environmentvariablevalue` `value`, or the definition's `defaultvalue` when there's no value (Spike S1). A variable that cannot be read is Needs review on the check that uses it, with one of four read-failure texts: a Secret-type variable (`type` 100000005; its value is never requested) is "Couldn't read `<setting>`: its environment variable is a secret"; no definition, or no value row and no default, is "Couldn't read `<setting>`: its environment variable isn't defined or has no value"; a 403 on either read is "Couldn't read `<setting>`: access to its environment variable was denied"; any other failure (an ambiguous definition, an unusable schema name, another failed read) is "Couldn't read `<setting>` from its environment variable". The finding's detail notes that the site uses a cached copy of environment-variable values until it restarts (Spike S4), so a recent change may not be live yet.
- Treat `ServerLogic/AllowNetworkingToAllDomains` as `true` when the setting is absent (Learn default), and `ServerLogic/Enabled` as `true` when absent. Treat `ServerLogic/AllowedDomains` as "no allow list" when it is absent, empty or Learn's default text "All domains allowed". These defaults apply only after the settings query succeeded; a failed read is AC-7.7.
- Normalise boolean settings (F28): trim, then match `true` or `false` case-insensitively. Any other value, empty included, is Needs review "Couldn't interpret `<setting>`" on the check that uses it (Outbound for `AllowNetworkingToAllDomains`; a site banner for `Enabled`). Two active settings with the same name on the same site are Needs review "Duplicate `<setting>`".
- Match setting names after trimming, case-insensitively. Learn doesn't say whether the runtime's lookup is case-sensitive, so this finds every setting that might apply. Only active settings (`statecode` = 0) count: an inactive setting is ignored, as if absent, and the snapshot lists it as "(inactive, ignored)". Duplicates are two active settings whose names match this way.
- Read `ServerLogic/TimeoutInSeconds` like the boolean settings, including from an environment variable: trim, then it's valid when it's only the digits `0`–`9` (leading zeros allowed) with a value from 1 to 240. Absent means Learn's default of 120 and no banner. Any other value, empty included, gets the AC-7.12 banner; a duplicate gets the banner "Duplicate `ServerLogic/TimeoutInSeconds`"; a failed read gets the banner "Couldn't read `ServerLogic/TimeoutInSeconds`". None of these affects a check.
- Treat a table permission whose `scope` is missing or isn't one of the five values in the data-source table as unknown. Table permissions is then Needs review "Couldn't interpret the scope of `<name>`", an analysis limit that can be marked as reviewed (AC-8.5). Microsoft's Power Pages plugin also rejects such values in its table-permission validator.
- If more than one web role on the site has `anonymoususersrole` = true, every one of them is treated as the anonymous role: each makes the Web role check flag an assignment, and each one's permissions join the grant set. The same applies to `authenticatedusersrole`. A site banner reads "More than one web role is marked as the Anonymous Users Role (`a`, `b`). Learn allows one per site." (or Authenticated Users Role) and is repeated in every export. It doesn't otherwise affect any check.
- A web role (type 11) or table permission (type 18) row whose envelope, `content` or required keys cannot be read is skipped, not guessed, and the other rows are kept. Findings are graded from the readable rows, so a skipped row can hide evidence and a Configured finding on that site may be unsound. One site banner names the skipped rows in row order, using the row id when a row has no name: "1 web role or table permission row couldn't be read and was skipped: `<name>`. Findings were graded without it; fix the row and rescan." for one row, or "N web role or table permission rows couldn't be read and were skipped: `<name>`, `<name>`. Findings were graded without them; fix the rows and rescan." for several. Like every banner, it is repeated in every export.
- Scan every server logic record on the site, with no cap. The 30 s NFR applies up to 50 records. The scan always shows a progress count, "Scanned X of N" (F49).
- Identify the default roles by the `anonymoususersrole` and `authenticatedusersrole` flags in each web role's `content`, never by name.
- Warn, without blocking, on a non-Dev connection, or when the type is unknown (AC-7.5, AC-7.11).

**Data sources:**

| Fact | Source | Status |
|---|---|---|
| Sites | Dataverse `powerpagesites` (`powerpagesite`): `powerpagesiteid`, `name`, `primarydomainname`, `statecode` (0 Active, 1 Inactive) | Verified on Learn |
| Server logic records and their status | `powerpagecomponents` (`powerpagecomponent`) where `powerpagecomponenttype` = 35 (Server Logic) and `powerpagesiteid` = the site: `name`, `statecode` (0 Active, 1 Inactive) | Verified on Learn |
| Server logic code | `powerpagecomponent` `filecontent`, a File column holding `<name>.sl`. Retrieved with `InitializeFileBlocksDownload` (`Target` = `{ "@odata.type": "Microsoft.Dynamics.CRM.powerpagecomponent", powerpagecomponentid }`, `FileAttributeName: "filecontent"`) and sequential `DownloadBlock` calls; `queryData` cannot return the `$value` byte body (Spike S2, 2026-10-22: `{}`). `content` holds only `display_name`, `description` and the role link | Spike S1; Spike S2 continuation proves a populated handler downloads and matches its stored bytes/text |
| Web roles | `powerpagecomponent` type 11 (Web Role). `content` keys `anonymoususersrole` and `authenticatedusersrole` (booleans) and an optional `key` | Spike S1 |
| Web roles assigned to a record | `content.adx_serverlogic_adx_webrole` on the server logic record: an array of web role `powerpagecomponentid`s. The N:N relationship `powerpagecomponent_powerpagecomponent` is empty for these links | Spike S1 |
| Table permissions per role | `powerpagecomponent` type 18 (Table Permission), state from `statecode`. `content` keys: `entitylogicalname`, `entityname`, `scope` (756150000 Global, 756150001 Contact, 756150002 Account, 756150003 Parent, 756150004 Self), the booleans `read`, `write`, `create`, `delete`, `append` and `appendto`, `contactrelationship` or `accountrelationship` for those scopes, roles in `adx_entitypermission_webrole` (an array of web role IDs), and for Parent scope `parententitypermission` (the parent's ID) and `parentrelationship` | Spike S1 |
| Site settings | `powerpagecomponent` type 9 (Site Setting), filtered to the site and the `ServerLogic/` prefix. `content.value` (a string) with `source` 0, or `envvar_schema` with `source` 1 and no `value` | Spike S1 |
| Environment-variable values | `environmentvariabledefinitions` (`schemaname`, `type`, `defaultvalue`) with `environmentvariabledefinition_environmentvariablevalue` (`value`) | Spike S1; Spike S2 checks nonsecret current/default/missing/denied reads and that a Secret-type definition never triggers a value read |
| Environment classification (Dev/Test/UAT/Prod) | The PPTB connection's `environment` label (`Dev`, `Test`, `UAT`, `Production`), set by the user in PPTB, not Power Platform's environment type. Missing or unrecognised reads as Unknown (AC-7.11) | PPTB docs |

**Spike S1 (first plan task):** on a sample enhanced-model site, confirm nine things:
1. which `powerpagecomponent` column holds server logic code (`content` or `filecontent`);
2. the relationship that links a server logic record to its web roles, and a table permission to its roles;
3. the JSON keys inside `content` for table permissions (table logical name, access type, privileges);
4. where a site setting's value is stored;
5. how a Parent-scope table permission references its parent (the parent-link metadata, F26);
6. the maximum length of a server logic name (AC-2.11);
7. whether a `ServerLogic/*` value can come from an environment variable, and how the effective value is read (F29);
8. whether a server logic record's stored `name` includes `.js` (F52);
9. the relationship that Account access uses on the `account` table (R10, F04).

S1 records the exact queries, one redacted sample record per component type, and a comparison against the studio UI for the same site (F29). Record the result in the plan of the phase that runs S1. Inspector ACs that read facts 1–5 are blocked until S1 is done. Other facts are verified on Learn.

**S1 result (done 2026-10-14, PG DEV, enhanced model; evidence in the phase-0 plan):** facts 1–5 and 7 are in the data-source table and FR-7. Fact 6: studio stored a 189-character name and the `name` column allows 400, so the 64-character slug always fits (AC-2.11). Fact 8: the stored `name` has no `.js`; only the code file has an extension (`.sl`). Fact 9: there's no single standard relationship for Account access on `account` (the sample site uses its own `msa_account_managingpartner`), so R10's checklist keeps "maker verifies". The studio comparison matched (display name and two roles).
**Spike S3 (before building R7):** unzip `event-registration.zip` from the GitHub sample package, pinned to commit `7efe699` (F59), read the full event-registration script, and reconcile R7 with it, including the form-encoded token request (Learn correction 17). Learn publishes only two excerpts. S3 also runs a **collision probe** on a test SharePoint site (F05). It uploads two files with the same name to the exact `root:/…:/content` path that R7 uses, with `@microsoft.graph.conflictBehavior=fail`, and confirms that the second upload fails and the first file is unchanged. Until the probe passes, R7's overwrite prevention is unverified. If the second upload doesn't fail, the spec is updated before R7 ships. This spike applies to Starter, not Inspector.
**Spike S2 (before Inspector and download work):** confirm what the PPTB host exposes for:
- the active connection: name, URL and environment type;
- a connection-changed event (AC-7.6);
- a save dialog that writes binary files, for the zip and the PDF (AC-5.6, AC-5.10, AC-9.3);
- clipboard write (AC-4.9, AC-6.7);
- whether `dataverseAPI.queryData` returns `@odata.nextLink` (FR-7);
- a populated type-35 handler downloaded through `InitializeFileBlocksDownload` and `DownloadBlock`: `filecontent_name` and the `regardingfieldname = filecontent` FileAttachment row confirm it is populated; record the initializer property types, `Data` encoding, byte count and local byte/text equality. A failed download stays a per-file non-reviewable read failure; a healthy path that falls back for every file does not meet acceptance;
- read access to `environmentvariabledefinitions` and `environmentvariablevalues` for settings backed by environment variables (FR-7);
- what a read returns (error name and `status`) when the network drops and when the connection's sign-in expires, so AC-7.10 can tell connection loss from a 403 (AC-7.7);
- whether `connection:*` events say which connection changed, or the tool must re-read the active connection on each one (AC-7.6).

Theme, notifications and external links are settled by working PPTB tools (AC-1.6, FR-1). The host has no PDF API, so the tool bundles a PDF library (FR-10). There's no up-front read-access test: a denied read is handled per check (AC-7.7).
**Spike S4 (before the client generator ships; a dev site):** deploy one throwaway probe server logic, not a shipped recipe (F54), with:
- `get`: Dataverse `RetrieveMultipleRecords`, an HttpClient GET of a JSON endpoint and of a text endpoint, and the raw `typeof` of each result;
- `post`: `CreateRecord`, recording the exact `entityid` header casing (F55);
- `liquidSync` and `liquidAsync`;
- a `CloudFlow.TriggerAsync` call, if a flow is available;
- a read of the caller's parent account from `Server.User` (for example `parentcustomerid`), for R4's bound create (F04);
- a bound custom API call whose `ExecutePrivilegeName` the caller lacks, if one is available (F07).

Call it from fetch, jQuery and Liquid, and toggle the two outbound settings through the O3–O6 cases, including an `AllowedDomains` entry with a leading `*.` (F30). Confirm:
1. the casing of the envelope keys (correction 8);
2. whether connector results arrive as a string or an object (correction 11);
3. how `AllowNetworkingToAllDomains` and `AllowedDomains` interact (the FR-9 decision table), and whether `*.` wildcards work;
4. whether Liquid can call an `async` function;
5. whether the caller's parent account is readable server-side (F04);
6. which identity the custom API privilege check uses (F07).

Each result either confirms the spec or becomes a spec update.

**S4 result (done 2026-10-15/16, PG DEV; evidence in the phase-0 plan):**
1. Lowercase envelope keys, confirmed (correction 8).
2. Connector results are JSON strings, for Dataverse and HttpClient (correction 11). `CreateRecord` returns `entityId` (F55).
3. O4: the list doesn't restrict while all-domains is on. O5: every call blocked. O6: the list applies, entries trimmed. `*.` entries match no host (FR-7, FR-9). Blocked calls return `StatusCode` 0 (correction 20). Environment-variable values stay cached until the site restarts.
4. Liquid calls sync and async operations (AC-4.7).
5. The caller's parent account is readable: `Server.User.parentcustomerid` is an object, and `RetrieveRecord("contacts", <contactid>, "$select=_parentcustomerid_value")` returns its GUID. A create bound to it under an Account-scope permission wasn't tried, so R4 `post` keeps Global Create-only (F04); the phase that builds R4 probes the bound create.
6. Not tested: the only custom APIs on the site were Microsoft's own, and some of them write data. `CloudFlow.TriggerAsync` wasn't tested either, because no flow was registered. R9 and R10 keep their current checklists.

The probe also found that the runtime matches the restricted list case-insensitively over the raw text (correction 14), that `shell.safeAjax` doesn't exist (correction 9), and that top-level helpers are accepted (correction 22).

**Spike evidence** (F59): each spike records, in the plan of the phase that runs it, the queries or calls it made, the host and runtime versions, and the outcome. A result that contradicts the spec becomes a spec update before dependent work starts.

**Must not:**
- Create, update or delete anything. The only actions Inspector executes are the two retrieval actions above; the adapter rejects any other operation name.

### FR-8: Finding model

**Must:**
- Give each check one of three statuses: Configured, Needs review or Reviewed. Reviewed is user-set, session-only, and only available for Needs review.
- Add one display state outside those three: **Not scanned** (grey, no icon colour beyond neutral). It applies only to evidence not yet read when a scan is interrupted (AC-7.10, AC-8.11). It is never user-settable.
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
- **"Couldn't read" is not a state.** It is Needs review with the reason "couldn't read configuration" (AC-7.7).
- Don't offer Mark as reviewed for a check when any of its reasons is a read failure (AC-8.5, F33).
- Count Configured (C) and Reviewed (V) toward K, Needs review toward M, and Not scanned toward U (AC-8.1, F39).
- In exports, show Reviewed as "Reviewed" with the original reason (AC-8.12), and Not scanned as "Not scanned", in every format.
- Each finding owns its category, summary, original reasons, guidance, questions and explanatory detail, plus `hasUnscannedEvidence`. `FileResult.snapshot` owns the optional raw configuration rows (web roles, tables with privileges, outbound settings); finding detail never copies them.
- Default to Needs review when evidence can't be read.

### FR-9: Check rules

**Must:**
- **Web role:** Needs review when no role is assigned, or when the assigned roles include the anonymous role (`anonymoususersrole` = true in its `content`).
- **Table permissions:** evaluated over the grant set (FR-7, F27). Needs review in six cases:
  - any Global access;
  - Create, Write, Delete, Append or Append To privileges for a handler that only exports `get()` (F25);
  - the code uses Dataverse (FR-7 connector detection) and the grant set has no active table permissions;
  - a Parent-scope chain can't be resolved (FR-7);
  - a permission in the grant set has an unknown scope (FR-7);
  - the code can't be read or analysed (Error Scenarios).

  Configured, with the "no table permissions needed" summary, when the grant set is empty and no Dataverse use is detected, unless connector use couldn't be determined (AC-8.8). Only active permissions count, and inactive ones and those with inactive ancestors are ignored. Non-Global access types aren't otherwise flagged in v1.
- **Outbound networking:** evaluate the first row that matches. "All" means `AllowNetworkingToAllDomains` is `true` or absent. "List" means `AllowedDomains` parses to at least one host that isn't a wildcard entry (FR-7). If any entry is a wildcard entry, Outbound is Needs review and adds the reason "Wildcard entries aren't supported: `<entry>` matches no host." The row below is still chosen with those entries left out, and its message shows as well, so a list of only wildcard entries reads as O5. Code-based rows O0 and O1 are decided first. Once HttpClient use requires the settings, every known wildcard reason is collected before an O2 result is returned, so an invalid, duplicate or unreadable `AllowNetworkingToAllDomains` keeps the leading O2 summary and all wildcard reasons.

  | # | Condition | Result |
  |---|---|---|
  | O0 | No HttpClient use detected, and connector use couldn't be determined (FR-7) | Needs review: "Couldn't determine which connectors the code uses." |
  | O1 | No HttpClient use detected (FR-7) | Configured: "No HttpClient calls in code." Detail: cloud flows aren't checked (AC-8.8, F32) |
  | O2 | `AllowedDomains` is set but can't be parsed, `AllowNetworkingToAllDomains` can't be interpreted, or either setting is duplicated (FR-7, F28) | Needs review: "Couldn't interpret `<setting>`" or "Duplicate `<setting>`" |
  | O3 | All, no List | Needs review: "All domains allowed. Limit to the hosts it calls." |
  | O4 | All, with a List | Needs review: "`AllowedDomains` is set but `AllowNetworkingToAllDomains` isn't `false`, so the list doesn't apply and all domains are allowed." |
  | O5 | `AllowNetworkingToAllDomains` = `false`, no List | Needs review: "Outbound calls are blocked. The handler calls HttpClient, but no domains are allowed." |
  | O6 | `AllowNetworkingToAllDomains` = `false`, with a List | Configured: "Allowed domains `a`, `b`. Whether they cover every host the handler calls isn't checked." The questions add "Do these domains cover every host this handler calls?" (F30) |

  Learn doesn't document how the two settings interact. O4 followed Microsoft's `add-server-logic` guidance ("Set to `false` when restricting via AllowedDomains"), and Spike S4 confirmed O4, O5 and O6 on a live site on 2026-10-16. `ServerLogic/TimeoutInSeconds` isn't part of this table; it's a site banner (AC-7.12, F31).

### FR-10: Reports

**Must:**
- Export Markdown and PDF for both scopes, with the include and redact options, file names and content in Story 9.
- Always include the configuration-only and tenant-policy-not-verified statements, the scan interval and the not-atomic statement (AC-9.2, F37).
- Escape every configuration value (F42). In Markdown table cells, escape `\ | * _ ` [ ] < >` and replace newlines with spaces. Everywhere else a value appears in Markdown (the H2, the Environment, Scanned and Result lines, headings, blockquotes and list items), one inline-escape function escapes the same characters plus `#`, and replaces newlines with spaces. In the PDF, HTML-escape every value when the PDF is rendered from HTML. Never fetch resources named by configuration values (AC-9.10).
- Paginate the PDF: table headers repeat on each page, rows aren't split, and no content is truncated (F44).
- Bundle the report fonts locally after checking their licences (DM Sans, Space Grotesk and JetBrains Mono are OFL). The app UI uses the Windows system font stack `'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif`; Segoe UI isn't redistributable, so it isn't bundled (F52).
- In the PDF, use DM Sans for body text, Space Grotesk for headings and JetBrains Mono for paths (README §05), each as a static TTF, which jsPDF needs; the UI's JetBrains Mono woff2 can't be embedded. Draw the `✓` status glyph as a vector path, because neither DM Sans nor Space Grotesk has U+2713 (checked 2026-10-20); `!` comes from the font. A test checks every character the report writes in each font against that font's coverage.

**Must not:**
- Export JSON or CSV.

### FR-11: Visual design

**Must:**
- Ship the two **1a Graphite** themes and follow the host theme as AC-1.6 describes. There is no in-tool theme toggle (Assumption A2). Tokens are plain CSS custom properties in `src/app/theme/tokens.css`, light on `:root` and `[data-theme='light']`, dark on `[data-theme='dark']`:

  | Token | Light | Dark |
  |---|---|---|
  | `--window` (window, title bar) | `#f6f6f6` | `#000000` |
  | `--surface` (content area) | `#fbfbfb` | `#060606` |
  | `--tile` (tiles and cards) | `#ffffff` | `#0f0f0f` |
  | `--code` (code well) | `#ececec` | `#000000` |
  | `--border` / `--control-border` | `#cfcfcf` / `#666666` | `#3a3a3a` / `#a0a0a0` |
  | `--text` / `--text-2` / `--muted` | `#0a0a0a` / `#333333` / `#555555` | `#fafafa` / `#d4d4d4` / `#a5a5a5` |
  | `--primary` (OK, selected, done) / `--primary-text` / `--on-primary` | `#111111` / `#111111` / `#ffffff` | `#f2f2f2` / `#f2f2f2` / `#0a0a0a` |
  | `--review` (needs review) / `--review-tint` | `#a8281f` / `#f5e5e4` | `#ff8f86` / `#352422` |
  | `--server` (server objects, `used`) / `--server-tint` | `#0a5aa8` / `#e2ebf5` | `#8ec5ff` / `#232c35` |
  | `--ok-tint` / `--ghost` | `#e2e2e2` / `#eeeeee` | `#333333` / `#191919` |
  | `--keyword` / `--string` / `--comment` (code, line numbers) | `#2a4bb0` / `#17663f` / `#555555` | `#92b2ff` / `#62d69b` / `#a5a5a5` |
  | `--tooltip-bg` / `--tooltip-text` | `#111111` / `#ffffff` | `#f2f2f2` / `#0a0a0a` |
  | `--scrim` | `rgba(0,0,0,.45)` | `rgba(0,0,0,.62)` |

- Code wells follow the theme: `--code` fill, plain text `--text`, keywords `--keyword`, strings and regexes `--string`, comments and line numbers `--comment`. Highlighted lines use `--code-highlight` (10% `--primary` mixed into `--code`) plus a 2px inset `--primary` bar.
- Use `--primary` fill with `--on-primary` text only for selected pills, the active recipe underline, the Download button and done ring segments; OK pills use `--ok-tint` with a `--primary` border and `--primary-text`. Use `--review` only for status: the `! Permissions` pill, unfinished ring segments, the `⇄` client-call icon and the Inspector tab icon, with `--review-tint` behind needs-review pills. Server-object pills use `--server` on `--server-tint`. Controls are outlined in `--control-border`.
- The content area is `--surface` and the window `--window`, both flat. Tiles and cards are `--tile` with a 1px `--border`, radius 10px (Inspector 12px). There is no aurora, no glass, no gradient and no `backdrop-filter` (Assumption A1); `--tile-glass` is `transparent` and `--tile-blur` and `--tile-shadow` are `none` in both themes.
- Type: the system stack `'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif` for UI text, at weight **600** for base text and **700** for emphasis (selected pills, needs-review pills, ring counts, page and Inspector titles). Nothing loads a font for the UI stack; where it falls back to a static Segoe UI or to `system-ui` (macOS), the browser picks the nearest available weight. Code uses JetBrains Mono, bundled locally.
- Reports keep the original handoff's README §05 palette in both themes, with the A8 adjustments. The UI theme doesn't apply to Markdown or PDF exports.
- Lay out Create Logic per layout 10a §2: grid rows `129px / minmax(0,1fr) / auto`, columns `220px repeat(3, minmax(0,1fr))`.
- Draw rings as SVG arcs with 4° gaps. A ring has one segment per check up to 30 checks. Above 30, the site ring draws three arcs whose sizes are proportional to Configured + Reviewed, Needs review and Not scanned. Empty arcs are omitted, and the 4° gaps fall only between the arcs drawn.
- Apply the AA report-token adjustments in Assumption A8. Every other token is as listed above.
- Replace glyphs with Fluent System Icons, bundled locally.

### FR-12: PPTB host and manifest

Sources: PPTB tool-development docs (manifest, `pptb-validate`, marketplace policy, security model).

**Must:**
- Target the PPTB Desktop App (Electron), version 1.2.7 or later. The tool uses no Desktop-only API (Terminal, Inter-Tool Invocation, MCP), but the VS Code extension isn't tested.
- Declare in `package.json`:
  - `features.connections: { "min": 0, "max": 1 }`, so the tool opens without a connection (AC-1.3). PPTB's default is one required connection;
  - `features.minAPI: "1.2.7"`, the first version with optional connections;
  - `name`, `version` (1.0.0 or later for release), `displayName` "Server Logic Tools", `description`, a `license` from PPTB's approved list (BSD-3-Clause, with a `LICENSE` file at the root), and `contributors`;
  - `configurations.repository` (a GitHub URL), `configurations.website` (the usage manual on GitHub) and `configurations.readmeUrl` (a `raw.githubusercontent.com` URL);
  - the standard npm `homepage`, `repository` and `bugs` links to the same GitHub repository;
  - `icon`: `icons/logo.svg`, the branded logo, an SVG under `dist/` that keeps its own colours (the host does not recolour it).
- Omit `cspExceptions`: every script, style, font and image is bundled, and all Dataverse traffic goes through the host. The default CSP allows only `'self'`, inline scripts and styles, and `data:` fonts and images.
- Don't set `enabledForPowerPlatformAPI`; the tool reads only through `dataverseAPI`.
- Pass `npx pptb-validate` with no errors before any release; `npm audit` is clean for a verified listing. Until the repository and README URLs are public, `npm run verify:release` runs the validator's checks through the `@pptb/validate` package API with URL checks skipped (Implementation Status).
- **v1.0.0 releases all three pages (spec 4.5.0).** The first release, v1.0.0, is the full build (`npm run build`): Logic Starter, Server Objects and Logic Inspector, with the site pill shown and no disabled tab. It meets every AC of Story 1 and Stories 2–9, passes the validator, and is published only with the owner's explicit confirmation. It supersedes the earlier per-page release order and the plan to publish v1.0.0 as `npm run build:beta`; `build:beta` (and any other build that names fewer pages) remains a partial build for development and isn't published. Server Objects still never builds without Logic Starter (FR-1).
- **Inspector release gate.** v1.0.0 isn't published until the items the Implementation Status lists for Logic Inspector are closed: a dev-site scan timed against the NFR, both exports checked against the screen, the RG-005 accessibility pass, the P5.8 release proof, and the release gate (`npm run verify:release`) checking the full build.
- **v1.0.0 exception (spec 3.0.1, narrowed in 4.0.0, scope widened in 4.5.0).** v1.0.0 needn't meet the previous bullets in one respect: it replaces the AC-4.12 36-configuration matrix with targeted `node:vm` tests for the client envelope (AC-4.5, AC-4.6) and for R7. The full matrix closes in a later release. Every other AC applies, FR-11 included.
- Register `toolboxAPI.events.on` once per host subscription and remove the handler on unload. As built (Fix 7 addendum, FR-12 event disposal), the adapter registers one hub on the first subscriber, not at start-up, and disposes it on the last unsubscribe and on `pagehide`; a later subscriber registers it again. The host's `tool:unloaded` event does not dispose it: PPTB broadcasts that event to every open tool view when any tool is unloaded, updated or uninstalled, so it is passed on to subscribers as an ordinary event, and `pagehide` covers this tool's own teardown.

**Must not:**
- Write to the host's tool settings (FR-5a).
- Load anything from a CDN or another origin.

## Non-Functional Requirements

### Performance

- Both panes update within 300 ms of any input change.
- Server Objects search filters within 100 ms.
- An Inspector scan of up to 50 server logic records completes within 30 s.
- Building an export takes at most 5 s, and saving it completes within 5 s of the save being confirmed (AC-9.9).
- A Starter zip download completes within 2 s (AC-5.11).

### Security

- Inspector uses only the signed-in user's permissions; the tool never handles access tokens, and all access goes through the host.
- Inspector performs retrieval only: list/record reads through `queryData` and handler-file retrieval through the two documented download actions, all inside the host adapter with validated responses and host-managed authentication. No write operation is ever issued.
- No configuration, findings or code are sent to third parties.
- Files and reports the tool generates contain no tokens or secrets the tool obtained. Code the user edits is downloaded exactly as written; the tool doesn't scan or redact it (F20).
- Generated code never contains literal secrets.
- Generated handler code never logs bodies, exception messages, URLs, headers, tokens or site-setting values (the FR-3 logging rule). The generated browser client may write response values to the console.

### Reliability

- A failed read of one check or record doesn't block the others.
- A scan interrupted by connection loss keeps what was scanned and marks the rest "Not scanned".

### Accessibility

- All controls are keyboard operable, with the visible focus ring from AC-1.5. Pill groups follow the APG radio group pattern (arrow keys), the top tabs follow APG tabs, the recipe picker follows the APG combobox, the site pill follows the APG select-only combobox (inactive sites are disabled options), and the export modal follows the APG modal dialog (AC-9.1). In the code editor, Esc then Tab moves focus out of the editor (F48).
- Disabled choices that explain themselves use `aria-disabled="true"`, stay focusable, and show their reason on focus and hover through `aria-describedby` (AC-2.10, AC-4.7, AC-6.8, F47).
- Status is never conveyed by colour alone: rings carry a text count, and statuses carry text and a `✓` or `!` glyph.
- Meets WCAG 2.2 AA contrast in both themes. The Graphite text tokens (`--text`, `--text-2`, `--muted`, `--primary-text`, `--review`, `--server`, `--keyword`, `--string`, `--comment`) pass 4.5:1 on `--window`, `--surface`, `--tile` and `--code`, and each pill's text passes on its tint (lowest 5.73:1, `--server` on the light `--server-tint`, computed 2026-10-31; `tokens.test.ts` asserts every pair). `--control-border` and the 2px `--primary` focus outline pass 3:1 on `--tile`. `--border` doesn't reach 3:1, so it outlines only decorative tiles, cards and code wells, never a control's only boundary. Done (`--primary`) and needs-review (`--review`) ring segments are under 3:1 apart (2.0:1 dark, 2.7:1 light), so the ring's text count and the `✓`/`!` glyphs carry status. Graphite has no gradients or glass, so no measurement gate remains at UI acceptance. The report tokens are adjusted per Assumption A8.
- The minimum supported viewport is **1024×700**, measured as the tool's viewport, not a container. Below it the window scrolls rather than reflowing. Truncated values expose their full text in a tooltip and the accessible name. Code panes and data tables may scroll, as WCAG exempts two-dimensional content from reflow. PDF text stays selectable (F50).
- The code panes and the export modal are reachable and operable with a screen reader.

## Error Scenarios

| Scenario | Expected behavior |
|---|---|
| Slug is empty | Falls back to `untitled` (AC-2.3) |
| Edited code has restricted patterns | Browser checks shows attention and lines are flagged; download is still allowed and the README notes it |
| Recipe change after edits | Confirm before discarding (AC-2.9) |
| Insert with no cursor position | Insert into the method's function, before its last top-level `return` (AC-6.8) |
| Insert target invalid (code doesn't parse, cursor not at a statement position, or the trial parse fails) | Insert disabled with a reason; Copy still works (AC-6.8) |
| Liquid selected and an edit or insert makes the code read HTTP-only properties | Language resets to fetch with a toast (AC-4.7) |
| R7 `CreateRecord` fails after the ticket uploaded | Logs `R7 create after upload` with ActivityId; returns "Registration failed after the ticket was uploaded."; the ticket stays as an orphan (FR-3 R7 Must) |
| Inspector can't determine connector use | Table permissions and Outbound can't report a no-use Configured; they're Needs review (FR-7, O0) |
| A Parent-scope permission's chain can't be resolved | Table permissions: "Needs review – Couldn't evaluate parent permission `<name>`" (FR-7) |
| No active connection | Inspector prompts to select a connection; Starter keeps working |
| Environment has no Power Pages sites | Empty state; no scan; Export disabled (AC-7.8) |
| Connection lost mid-scan | Keep partial results, mark the rest "Not scanned", prompt to reconnect (AC-7.10, AC-8.11) |
| Insufficient read permission | Affected checks: "Needs review – couldn't read configuration" (AC-7.7) |
| `ServerLogic/Enabled` = false | Banner at site level; files are still listed and checked; banner repeated in exports (AC-7.9) |
| `ServerLogic/AllowedDomains` can't be parsed | Outbound: "Needs review – couldn't interpret `ServerLogic/AllowedDomains`" (FR-7) |
| Environment type unknown | Classification "Unknown"; non-dev warning shown (AC-7.11) |
| Export with zero files, or while a scan runs | Export report is disabled (AC-9.1) |
| Save dialog cancelled | No file is written and no toast shows |
| Zip can't be built or saved | Error toast "Couldn't save <slug>.zip", no partial file, state untouched (AC-5.10). A host save failure shows the fixed body "The file could not be written. Check the folder and try again.", never the host's message; a failure while building the package still shows the generator's own error message |
| Method filter matches no recipe (with or without a search) | The recipe list shows an empty result and the count reads "0 recipes"; the loaded recipe is unchanged; "Clear filter" restores all ten (Fix 7 addendum, AC-2.10, AC-3.8) |
| PDF generation fails | Error toast "Couldn't save <filename>" with the fixed reason "The report couldn't be built."; the Markdown export is still available (AC-9.9) |
| Clipboard write fails | Error toast "Couldn't copy" (AC-4.9) |
| `showNotification` missing, throws or rejects | The message shows as an in-tool fallback toast; the host failure is logged by error name (FR-1) |
| Listing server logic records fails partway | "Inventory incomplete. Reconnect and rescan."; the site can't read as all Ready (AC-7.3) |
| A boolean `ServerLogic/*` setting can't be interpreted, or is duplicated | Needs review "Couldn't interpret `<setting>`" or "Duplicate `<setting>`" (FR-7, FR-9 O2) |
| `ServerLogic/TimeoutInSeconds` out of range | Site banner, repeated in exports (AC-7.12) |
| Connection changes while another tab is visible | Inspector results and review marks are cleared; stale scan results are discarded (AC-7.6) |
| Code can't be tokenized | Restricted patterns are still matched in full and reported as Blocked; the browser-API check falls back to substring matching and reports "May be rejected"; Browser checks notes "Couldn't parse this code" (FR-4) |
| Site list can't be read | Error state "Couldn't load sites" with the reason and a Retry button; no scan runs |
| A record's code can't be downloaded | Table permissions and Outbound are "Needs review – couldn't read handler code", a read failure with no Mark as reviewed (AC-8.5); Web role is evaluated normally |
| A record's code downloads as an empty file | Readable empty code: Table permissions and Outbound are "Needs review – Couldn't analyse handler code" (reviewable); Web role is evaluated normally |
| A record's code is empty or can't be parsed | Function names are treated as unknown, so the Table permissions write-on-read rule can't apply. Table permissions and Outbound are "Needs review – Couldn't analyse handler code", which can be marked as reviewed (AC-8.5, owner decision 2026-10-20); Web role is evaluated normally |
| A table permission's scope is missing or unknown | Table permissions: "Needs review – Couldn't interpret the scope of `<name>`" (FR-7) |
| More than one web role is marked as the Anonymous or Authenticated Users Role | Every flagged role is treated as that default role; site banner, repeated in exports (FR-7) |
| Results are cleared while the export dialog is open | Before the save dialog opens: the dialog closes, nothing is saved, and a status toast explains why. Once the save dialog is open: the dialog closes with no "cancelled" toast, the snapshot already built is saved, and its own outcome toast follows (AC-9.8) |
| A `connection:*` event leaves the active connection's id and URL unchanged | Results and review marks are kept; the title bar updates (AC-7.6) |
| Server Objects search matches nothing | "No objects or members match '<query>'", with a Clear search button |
| Liquid selected and the recipe changes to one without Liquid support | Language resets to fetch (AC-2.8) |
| Required site setting missing at runtime (generated code) | The handler logs an error and returns `JSON.stringify({ status: "error", message: "Server logic isn't configured: missing site setting <name>" })` before any outbound call (FR-3, F57) |
| More than 50 server logic records | All are scanned; the "Scanned X of N" progress count shows for every scan (FR-7) |

## Open Questions

No blocking product decisions remain. All 59 review findings are adopted (appendix), and the owner approved the design decisions on 2026-10-08. No contrast gate remains at UI acceptance: the Graphite tokens are flat and tested (Accessibility). Four plan-time spikes are required, all in FR-7:
- **S1:** the `powerpagecomponent` code column, role and parent links, JSON keys, setting values, name format and R10's Account relationship. Needed before Inspector work starts.
- **S2:** the host's connection, connection-change event, binary save, clipboard and `queryData` paging. Download work waited for it; the Inspector itself was built against fixtures in Phase 5 (owner decision 2026-10-31), so S2's continuation rows (`findings/logic/probe_findings.md`, 2026-11-01) gated the Inspector release, not its build. **Closed with caveats (owner, 2026-11-11):** every continuation row passed in the 2026-11-10 automated live run (`probe_findings.md`, Automated live evidence) except the secret environment variable, which is not covered (owner, 2026-11-10). Caveats: the runs used PPTB 1.2.8 fork `89028ff` (Electron 39.8.10), which carries the unparented save-dialog fix that stock PPTB lacks; network loss and sign-in expiry were injected host faults, not a real drop or expiry; the nextLink check is a tool-to-host comparison plus a fork unit test, with no Network-panel capture; the 50-record scan used canned data at a fixed 250 ms read latency, the export timing used canned scan data, and both the export and Starter download timings used an intercepted save (no native save dialog).
- **S3:** the script half is done on 2026-10-19 (source `power-pages-samples` commit `7efe699`, outcome in `plans/phase-19-handler-r7.md`). The collision probe stays open.
- **S4:** the envelope casing, the connector result type, the outbound settings precedence and wildcards, Liquid and async, the caller's parent account and the custom API privilege identity, checked with a throwaway probe on a live site. Needed before the client generator ships.

Spike checks are proposals until they run. Nothing in this spec counts as verified on a live site or host until the spike result is recorded in the plan of the phase that runs it. S1 (2026-10-14) and S4 (2026-10-15/16) are done, with their results in FR-7 and the corrections, and their evidence in the phase-0 plan; S4 item 6 and `CloudFlow.TriggerAsync` stay untested. S2 is closed with the caveats above (2026-11-11; evidence in `findings/logic/probe_findings.md`, run on 2026-11-10); the secret environment variable stays not covered. S3's script half is done on 2026-10-19, with evidence in `plans/phase-19-handler-r7.md`; the collision probe is still open.

**Implementation work added in v0.6.0.** The plan should estimate each item as a bounded task with acceptance examples:
- the shared code analysis (FR-4), connector token detection and fixtures (FR-7);
- parent-chain resolution for Parent-scope permissions (FR-7);
- safe insertion: statement positions, trial parse and the Copy fallback (AC-6.8);
- text-tied Permissions review (AC-5.4) and the derived Liquid rule (AC-4.7);
- R7 ticket safety and failure stages (FR-3);
- the behavior harness, shared client failure fixtures and demo-page cases (AC-4.12).

Of these, only the behavior harness (Phase 17) is still unbuilt on 2026-11-03; the others landed with Phases 07–22 and Phase 5.

**Implementation work added in v0.7.0:**
- two themes following the host theme, aurora and glass, and the glass contrast measurement (FR-11; aurora, glass and the glass gate superseded by 1a Graphite in v4.0.0);
- the top-level Server Objects tab, the title-bar site picker and the recipe combobox (Story 1, AC-3.1);
- the grant set with the Authenticated and Anonymous Users roles, and settings normalisation (FR-7);
- the scan ID, paging and the inventory-incomplete state (FR-7, AC-7.3);
- report escaping with the hostile-name fixture, PDF pagination, and export timing and failure (FR-10, AC-9.9, AC-9.10);
- the LF editor model (AC-4.10);
- the tokenizer fallback and T18–T20 (FR-4), and the 64-combination count test (AC-8.1).

**Assumptions** (A1–A9 proposed on 2026-10-07; A1, A2, A4 and A8 decided by the owner on 2026-10-08):

- **A1: Dark background.** Decided 2026-10-31 (1a Graphite): dark is flat black (`--window` `#000000`, content `--surface` `#060606`), and tiles are solid `--tile` `#0f0f0f`. No aurora, glow, glass or `backdrop-filter`. Reverses the 2026-10-08 aurora-and-glass decision.
- **A2: Theme.** Decided 2026-10-08, restated 2026-10-31: Graphite light and Graphite dark both ship and follow the host theme, with no in-tool toggle.
- **A3: Reference 04.** The two-pane Markdown view is an illustration of the export output, not an in-app screen. The export dialog and downloaded files are the only deliverables.
- **A4: Recipe tile layout.** Decided 2026-10-08: the searchable combobox from layout 10a §3, with group headers (AC-3.1). The design's own recipe list isn't adopted; the spec's R1–R10 stand.
- **A7: Recipe scope.** One-line reference snippets from the server objects page (`SiteSetting.Get`, `EnvironmentVariable.get`, `Website`, `User`, `Logger`, each Dataverse method, each HttpClient verb, Context request info) are insertable samples in Server Objects (FR-6), not recipes. Scenario samples are recipes R8–R10.
- **A5: `Server.User` and `Server.Website` members.** Learn-documented members only (FR-6).
- **A6: "Granted but unused" / "used but not granted" table comparison.** Not in v1 (see Out of Scope).
- **A8: AA report-token adjustments.** Decided 2026-10-08. The report palette (original README §05) has two tokens that fail the 4.5:1 text ratio. Each moves to the nearest value that passes:

  | Token | Was | Now | Ratio |
  |---|---|---|---|
  | Report orange text, on white and on tint `#fdf0e3` | `#d9680a` (3.54 / 3.16) | `#b05408` | 5.10 / 4.55 |
  | Report blue chip on tint `#eaf2fd` | `#1f6fd1` (4.38) | `#1e6dcd` | 4.51 |

  The v0.6.0 code-comment and line-number rows are obsolete: the Graphite code tokens pass on `--code` (FR-11). The 10a report screenshots still show the old orange.
- **A9: Outbound settings precedence.** As in FR-9 O3–O6, based on Microsoft's `add-server-logic` guidance. Spike S4 confirmed it on 2026-10-16.

**Resolved:**
- 2026-10-07: Non-dev environment → warn, don't block.
- 2026-10-07: Host → PPTB only for v1.
- 2026-10-07: Non-Global access types → not flagged in v1; revisit later.
- 2026-10-07: Exports → Markdown and PDF, in File and Site scopes (design rule; supersedes Markdown-only).
- 2026-10-07: Methods → all five (design rule; supersedes GET/POST only).
- 2026-10-07: Recipes → the 3 core, all 4 Learn tutorials, and the 3 scenario samples from the author and server objects pages (10 in total).
- 2026-10-07: Review marks → session-only (AC-8.9), and also cleared on a rescan or a site switch.
- 2026-10-07: Response envelope → lowercase keys (correction 8). Learn's tutorials and Microsoft's `add-server-logic` reference agree; S4 confirmed it on a live site on 2026-10-16.
- 2026-10-07: Liquid client → R1 and R8 only (AC-4.7).
- 2026-10-07: Inspector → enhanced data model sites only (AC-7.2).
- 2026-10-08 (owner): Design source → layout 10a for UI and tokens; reports keep the original README §05 (F53).
- 2026-10-08 (owner): R4 `post` → Global Create-only permission until S4 proves the caller's account can be bound (F04).
- 2026-10-08 (owner): Account-scope checklists name the relationship and the parent-account prerequisite (F04).
- 2026-10-08 (owner): Write-on-read rule → includes Append and Append To; summary "Change privileges on a handler that only exports `get()`" (F25).
- 2026-10-08 (owner): Mark as reviewed → not offered when any reason is a read failure (F33).
- 2026-10-08 (owner): Labels → Configured and Reviewed shown separately; "K/T checks addressed" (F38).
- 2026-10-08 (owner): Minimum viewport → 1024×700, measured as the viewport (F50).
- 2026-10-08 (owner): Site pill → Inspector's site picker in the title bar (AC-1.2).
- 2026-10-14 (owner): Starter state → not persisted (FR-5a removed).
- 2026-10-14 (owner): Toasts → `showNotification`, with an in-tool Bootstrap-style fallback (FR-1).
- 2026-10-14 (owner): Theme → read from the host at launch; light when the host can't answer (AC-1.6).
- 2026-10-14 (owner): External links → `openInConnectionBrowser` on user selection (FR-1).
- 2026-10-14 (owner): Host → PPTB Desktop App 1.2.7 or later; the VS Code extension isn't targeted (FR-12).
- 2026-10-14 (owner): Releases → per page, in completion order; unreleased tabs are shown disabled with no tooltip, and their code isn't built (AC-1.7, FR-1, FR-12).
- 2026-10-20 (owner): Server Objects → ships only with Logic Starter; a build naming `objects` without `starter` fails (FR-1, AC-1.7, AC-6.8).
- 2026-11-11 (owner): Logic Inspector → ships in v1.0.0 with Logic Starter and Server Objects, from `npm run build`. Supersedes the 2026-10-14 per-page release order and the 2026-10-31 "v1.0.0 via `npm run build:beta`" decision; the Inspector release gate becomes a v1.0.0 condition (spec 4.5.0, FR-1, FR-12).
- 2026-10-14 (owner): Build planning → walking skeleton, then thin vertical slices; one plan file per phase, and spike evidence goes in the plan of the phase that runs it.
- 2026-10-14 (owner): PDF → jsPDF and jspdf-autotable in the web view, drawn as vector text (never `html()` rasterising). Not a PPTB .NET worker: it needs a user-installed .NET 10 SDK, has a 1 MiB JSON-only message cap and runs unsandboxed (FR-10).
- 2026-10-14 (owner): Zip → fflate `zipSync`, built in memory; the async API is unusable because the CSP blocks blob workers (AC-5.6, AC-5.10).
- 2026-10-14 (owner): Code editor → CodeMirror 6, not Monaco, which needs separate worker files and is far larger; CodeMirror's tab-focus mode covers F48 (AC-4.10).
- 2026-10-16 (owner): Spec version for the S1 and S4 results → 2.0.0, because FR-4 matching and the jQuery client are rewritten. Nothing downstream existed to invalidate.
- 2026-10-16 (owner): R4 `post` → keeps Global Create-only. S4 proved the caller's parent account is readable, not that a bound create works; the phase that builds R4 probes it (F04).
- 2026-10-16 (owner): `AllowedDomains` wildcard entries → Needs review "Wildcard entries aren't supported", and left out of the list (FR-9), because `*.` matched no host in S4.
- 2026-10-16 (owner): FR-4 restricted patterns → every match is Blocked, matched case-insensitively over the raw text as the runtime does. "May be rejected" stays only for browser APIs in comments, strings and regex literals.
- 2026-10-27 (owner): No formatter; Prettier dropped (`.claude/rules/tooling.md`).
- 2026-10-31 (owner): Graphite palette is the UI theme (4.0.0); Logic Starter and Server Objects are v1.0.0 via `npm run build:beta`; Inspector may call the two download actions (4.1.0); Inspector is built against fixtures before Spike S2 closes (`phasse5plan.md`).
- 2026-11-02 (owner): P5.4/P5.6 decisions R-06 (`odataString` doubles `'` then percent-encodes; FR-7), R-14 B and R-15 B (4.2.0), P-01 B, P-12, P-14, and P5.5 decisions D-01 to D-21 and S-01 to S-08 (`docs/phase-5/plans/P5-4&6choices.md`, `P5-5choices.md`). Product-level ones are in the Phase 5 addendum; D-08 matches the existing AC-8.1, D-09 and D-17 are superseded by E-05, D-20 was not implemented, and S-01 to S-08 are architecture.
- 2026-11-03 (owner): P5.7 decisions E-01 to E-12 (`docs/phase-5/plans/P5-7choices.md`); recorded in the Phase 5 addendum.
- 2026-11-10 (owner): Secret environment variable → not covered by S2. The Dev environment has no Key Vault-backed secret variable; FR-7's "a Secret-type definition never triggers a value read" isn't verified on a live host.
- 2026-11-11 (owner): Open owner decisions → the planner's defaults in `goodplan.md` ("Defaults"), each open to veto. Recorded in FR-7, FR-3, FR-1, the Error Scenarios and the code-deviations table (4.4.0).
- 2026-11-11 (owner): Optional scope → include the architecture moves and the live site probes; defer the AC-4.12 behaviour matrix and the P5.8 release proof.
- 2026-11-11 (owner): `NEXT_LINK_UNVERIFIED` → flipped to `false` on the 2026-11-10 evidence (FR-7).
- 2026-11-11 (owner): Working tree → restore `.claude/settings.json`, commit the other deletions, delete the pnpm files.
- 2026-11-11 (owner): Live site probes (T16) → deferred. N5 (arrow functions and anonymous callbacks in the server-logic runtime), the R4 `@odata.bind` live check and whether `SiteSetting.Get` throws or returns `null` for a missing setting stay unverified on a live site; FR-3's arrow-function guidance stands unverified, not confirmed. When it runs: create the web role, table permissions and server logic records with the power-pages plugin rather than all by hand in design studio, and send the requests from a browser signed in to the site, because the PPTB harness can't call server-logic endpoints.

## Out of Scope (Future Considerations)

- Pushing generated handlers to a site (download only in v1).
- Guided or one-click fixes from Inspector findings.
- JSON or CSV export.
- Comparing two scans or tracking findings over time.
- CI/pipeline integration.
- Verifying input validation in hand-edited code.
- Reading the tenant-level outbound governance policy.
- A standalone web host, or the PPTB VS Code extension.
- The `$pages.ajax` client API (preview) as a fourth client language.
- **REVISIT:** flagging Contact/Account/Self/Parent access types on sensitive tables (v1 flags Global only).
- Comparing the tables a handler's code uses with the tables its roles are granted ("granted but unused" / "used but not granted"). v1 only checks whether the code uses Dataverse at all (AC-8.8).
- An in-tool theme toggle. The tool follows the host theme (FR-11).
- Automatic upload compensation or idempotent retries for R7. A retry uploads another ticket (FR-3 R7 Must).
- Alias or data-flow analysis of connector use. FR-7 uses a conservative token rule that fails toward Needs review.
- A general OData option validation engine. R4 checks only option names, duplicates and `$top`, and Dataverse rejects malformed values.
- Detecting configuration changes during a scan. Reports state the scan interval instead (AC-9.2).
- Effective-user authorization testing (see Non-Goals).

---

## Implementation Status

Checked against the source on branch `review` at `b03ca6a` on 2026-11-11 (typecheck and lint clean; 2071 Vitest tests in 116 files pass; after the review fixes that followed `d8182ca`, 2074 tests in 117 files pass). The previous full check was on `refine-app` at `7f24e80` on 2026-11-03 (`npm run build` passes, and `tests/buildShape.test.ts` asserts the `starter`-only, `--mode beta` and all-pages builds; `npm audit --omit=dev` found 0 vulnerabilities). This section records where the code does not yet meet a requirement, and where it differs from one and what was decided. It changes no requirement. Items not listed are met as far as this check went.

**Closed since the 2026-11-04 check (`goodreview.md` fixes, `goodplan.md` waves 0–2, `686103c..b03ca6a`):**
- **N1** (`b7e6a46`): a Parent-scope permission whose missing parent was an unreadable type-18 row is now a read failure (`readFailure: true`, no Mark as reviewed), as FR-7 and AC-8.5 require.
- **N2** (`691236c`): an unmapped Dataverse code falls through to the `HTTP <n>` and sign-in checks (FR-7); `NEXT_LINK_UNVERIFIED` is `false`; the FR-7 request guard `isAllowedFileRequest`. `691236c` also detached the event hub on any `tool:unloaded`; the review fix after `d8182ca` removed that, because the host broadcasts the event for every tool (FR-12).
- **N3** (`0e84815`): any `connection-changed` event during a scan abandons it; a mid-scan rename costs one rescan.
- **N4 and AC-9.8** (`396e734`): no mid-build watchdog; a build that took longer than 5 s shows the slow notice after it returns, before the save dialog. No "cancelled" toast once the save dialog is open. Build and save failures show fixed copy ("The report couldn't be built.", "The file couldn't be written."), never the host's error message.
- **File download** (`20fe547`): the 128 MiB cap stays, with its own message ("This file is larger than the 128 MiB limit and cannot be read."); blocks decode without a `btoa` round-trip.
- **Starter** (`7773019`, `3379c95`): the AC-2.11 slug renders in `<code>`; AC-3.1 reads "1 recipe" when one matches; a host save failure shows a plain-language body; the recipe query is lifted to `StarterInputs` (no effect pushes the count).
- **Error boundary** (`d03db0f`, `3379c95`): the whole app is wrapped in a top-level `PageErrorBoundary` ("Server Logic Tools"), with the theme sync inside it; the per-page boundaries stay.
- **Generators** (`7648d5d`, `e717c7f`): R4 `post` and `put` drop body keys containing `@`; R7 and R9 read site settings inside `try` (FR-3).
- **Dead code** (`1a17754`): `ExternalLink` and its test, unused icons, fonts and SVGs, and the `useActiveConnection` hook removed; `liquidCheck` became a `*.testkit.ts`.
- **Release** (`70ef023`): `npm run verify:release` and a `prepack` guard, a CI workflow, script linting (below).
- **Architecture** (`10893fd`..`fb5e8e8`): `features/`, `services/`, `components/` and `lib/` no longer import `@/app`. A new `src/session/` folder holds the context objects, consumer hooks and the pure Starter session logic; test harnesses live in `src/test/`; providers stay in `app/`.
- **Tests** (`b03ca6a`): Vitest defaults to the node environment, and DOM tests opt into jsdom.
- **Data hygiene** (`44e4e37`): the dev-org capture files under `spikes/` and `.scratch/` are untracked and ignored. Their values remain in git history; a history rewrite is deferred.

**Closed since the 2026-10-31 check (Phase 5, `docs/phase-5/evidence/p5-*/execution.md`):** the Inspector page, session store, scan and site reader (Stories 7–8, FR-7 to FR-9; P5.1–P5.5); the title-bar site picker as an APG select-only combobox (AC-1.2, AC-7.2; P5.5); the Markdown and PDF reports with hostname redaction (FR-10, AC-9.2–9.7, AC-9.10; P5.6); the export dialog and the store-owned export job (Story 9; P5.7). The default build now includes all three pages; `npm run build:beta` releases Logic Starter and Server Objects only and hides the site pill (AC-1.7). As of 4.5.0 `build:beta` is a partial build, not v1.0.0, which is the full build. The owner decisions taken while building are in the Phase 5 addendum below.

| Requirement | State | Note |
|---|---|---|
| FR-12 `pptb-validate` | Failing (CLI); passing with URL checks skipped | The `pptb-validate` CLI (`@pptb/validate` 1.0.5, installed by `@pptb/types`) ignores its arguments, including `--skip-url-checks`, and always checks URLs, so `npm run validate` (`pptb-validate --skip-url-checks`) exits 1 until `configurations.repository` and `configurations.readmeUrl` resolve: the repository isn't public and `origin/main` is the scaffold commit with no `README.md`. `npm run verify:release` runs the same `package.json` checks (and `pptb.config.json`, when one exists; none does) through the package API with `skipUrlChecks: true`. Warning: `configurations.website` isn't set. Merge to `main` and publish the repository before release, then the CLI must pass. |
| AC-4.12 behaviour matrix | Partial (v1.0.0 exception) | `node:vm` runs in three suites: `client.envelope.test.ts` (R1 `get`, fetch and jQuery, 8 envelope fixtures; no token-rejection or transport-failure case), `r7.behavior.test.ts` (sentinel secret, failure stages, escaping) and `demoPages.test.ts` (R4/R5/R6 response handlers against 9 invalid envelopes). No shared harness, no Server fake for R1–R6 and R8–R10; `client.matrix.test.ts` asserts the 36-configuration count and parse only. FR-12 lets v1.0.0 ship without it. |
| AC-3.2 (T1) | Partial | Zero hits are asserted per recipe and per Server Objects sample, not as the literal recipe × method × language sweep. Client text isn't FR-4-checked. |
| AC-5.11 download timing | Partly measured | `package.integration.test.ts` asserts package + zip build under 500 ms per recipe. Measured with an intercepted save on the fork: the host-calls probe (`probes/generated/host/host-calls.json`, "success notification within 2 s (AC-5.11)") passed in its 2026-11-10 report. Native save-confirm to toast isn't measured. |
| NFR: search within 100 ms | Not measured | Search is synchronous with no debounce, and no test measures it. |
| Stories 7–8, live evidence | Closed with caveats (2026-11-11) | The S2 continuation rows passed on 2026-11-10 (`findings/logic/probe_findings.md`, Automated live evidence): nextLink on the wire (RG-001, so `NEXT_LINK_UNVERIFIED` is `false`), populated-handler download, literal encoding, connection shape and events, unsubscribe, nonsecret environment-variable reads, the 403 shape (AC-7.7), the network-loss and expired-sign-in shapes (RG-002, AC-7.10) and retrieval only at runtime. Caveats as in Open Questions S2: PPTB 1.2.8 fork `89028ff`; network loss and sign-in expiry injected as host faults; nextLink proved by a tool-to-host comparison plus a fork unit test, no Network-panel capture; the secret environment variable not covered. The NFR "50 records within 30 s" passed on canned data at 250 ms per read (`scan-scale.json`), not on a live 50-record site. FR-7's `fetchXmlQuery` fallback isn't built and isn't needed on this evidence. |
| Story 9, AC-9.9 timings | Partly measured | Measured with an intercepted save on the fork: from the primary button to the "exported" notification within 5 s for a canned-site PDF (`scan-canned.json`, "pdf: exported notification within 5 s (AC-9.9)", passed in its 2026-11-10 report). Native save-confirm to toast isn't measured, nor a build on a large live site (a 60-file report took 5.6 s under load in the review). The slow-build notice appears only after the build returns (N4); a chunked or off-thread build is deferred until that 5.6 s is profiled (blob workers are CSP-blocked). The `preventClose` guard is exercised by the canned probe's held save; save-dialog modality on stock PPTB isn't confirmed. |
| RG-005 accessibility pass | Open (owner) | Screen reader, keyboard, contrast and selectable PDF text for the Inspector page and export dialog. |
| Bundle size | Budget in place | `renderPdf` is imported eagerly (`src/features/inspector/inspectorDeps.ts`), about +1,066 kB raw (P-11). `verify:release` fails over 817 KiB gzip: the default build's single bundle measured 742.7 KiB gzip on 2026-11-11, plus 10 %. Since 2026-11-11 the gate applies the budget to the full `npm run build` bundle it builds. The lazy-loading decision stays with the P5.8 size gate; any dynamic import must stay inlined (React rules). |
| Release gate | Built (2026-11-11, `70ef023`) | `npm run verify:release` runs typecheck, lint, test, `build` (the full build), the validator checks with URL checks skipped, the size budget, and an `npm pack --dry-run` listing that must hold only `dist/**`, npm's default files and the `main` file, and whose bundle must contain the Inspector page text. `prepack` runs it, so `npm pack` and `npm publish` both go through it. The root `index.html` ships in the tarball because `main` points at it. The 4.5.0 deviation (the gate checked `build:beta` and rejected Inspector text) was closed on 2026-11-11: the gate builds the full bundle, applies the size budget to it (817 KiB gzip against 742.7 KiB measured on 2026-11-11) and fails a tarball without the Inspector page text. `.github/workflows/ci.yml` runs `npm ci`, typecheck, lint, test and `build` on Node from `.nvmrc` (20.19); it hasn't run on GitHub (nothing pushed). |
| Live site probes (T16) | Deferred (owner, 2026-11-11) | Unverified on a live site: N5 (arrow functions and anonymous callbacks in generated handlers, FR-3), R4 `@odata.bind` handling, and whether `SiteSetting.Get` throws or returns `null` for a missing setting. See the 2026-11-11 Resolved entry for how to run it. |
| Logic Inspector release | In v1.0.0 (4.5.0); gate open | Built in the default build and out of `build:beta`. v1.0.0 includes it. The 4.5.0 follow-ups were closed on 2026-11-11: the `package.json` `description` names the Inspector; the README, usage manual and build manual describe the three-page release; the release gate and CI build and verify the full build (Release gate row). Still open for the Inspector gate (FR-12, plan-inspector.md): dev-site scan timed, both exports checked against the screen, RG-005, P5.8 release proof, publish with owner confirmation. |

### Code deviations and their decisions

Each row is a place where the code differed from the clause as written. Since 4.4.0 every row carries a decision (owner answer 2026-11-11: the planner defaults in `goodplan.md`, each open to veto). **(resolved)**: fixed in code, the clause stands. **(amended)**: the clause was changed to match the code, and the "Spec says" cell keeps the old text. **(accepted)**: an accepted deviation with no code change and no clause change; the "Code does" cell is what ships. Facts as of 2026-11-11.

| Clause | Spec says | Code does |
|---|---|---|
| AC-2.5, AC-3.4, AC-5.9 (amended 2026-11-11) | The selected method pill is solid `--primary`; pills select the client-call target; Start over resets the method to GET | After Fix 7 the pills render the recipe filter, which starts `null`: no pill is selected at launch or after Start over, and the client target changes only by re-choosing a recipe. A "Clear filter" button (aria-label "Clear method filter") clears it; the radio group can't deselect. Fix 7 superseded AC-2.10, AC-3.8 and AC-2.8 but not these three; all three clauses now describe the filter. |
| AC-2.6, AC-2.10 (amended 2026-11-11) | Helper "Exports `function <name>()`"; R8 helper "Liquid only" | Multi-function recipes list every function ("function get() function post() …", target marked `aria-current`); R8 reads "Liquid only · Exports function getSummary()". The tooltip "<Recipe> doesn't export `<fn>()`" is no longer produced; R8's "Liquid only: not callable over HTTP" moved to the fetch and jQuery language pills. AC-2.6 and AC-2.10 now say so. |
| AC-2.11 (resolved 2026-11-11) | "Check that `<slug>` isn't…" with the slug in code format | Was: plain text, no backticks. Fixed (`7773019`): the visible note renders the slug in `<code>`; the `title` copy stays plain text. |
| AC-3.1 (resolved 2026-11-11) | Caption "10 recipes" | Was: "N recipes", never singular ("1 recipes" for the R10-only PATCH filter). Fixed (`7773019`, `3379c95`): "1 recipe" when one matches, "N recipes" otherwise; the count stays dynamic per the Fix 7 addendum. |
| AC-4.7 (amended 2026-11-11) | Server-pane note "warns that long operations delay page rendering" | "Long operations cause delayed rendering." AC-4.7 now quotes it. |
| AC-5.3 (amended 2026-11-11) | The note sits on the Validation pill's tooltip | On a nested "About validation" info button shown only after an edit. AC-5.3 now says so. |
| AC-5.5 (amended 2026-11-11) | The note tile shows `! Permissions` | The badge flips to ✓ "Permissions" once the checklist is reviewed. AC-5.5 now says so. |
| FR-2a, FR-3 R8 (accepted 2026-11-11) | Liquid snippet `input: '{…}'` inline | `{% assign inputData = '…' %}` then `input: inputData`. The client also sends `Content-Type: application/json` and reports "The request token was rejected.", "The call failed before a response envelope could be read." and "The request failed."; the handler's `errors[]` is never shown. |
| FR-4 message (accepted 2026-11-11) | "May be rejected by Power Pages validation" | UI findings list and README print "(May be rejected)". |
| FR-4 T13, `import … from`, whole-token, parse (accepted 2026-11-11) | T13 names `Object.getPrototypeOf`; "import, whitespace, then from as a word later"; whole-token only for Blocked; "Couldn't parse" tied to a tokenizer failure | T13 also matches `prototype` (and `setPrototypeOf`); since 2026-11-04 (starter-and-objects-002) a linear scan finds whole-word `import`, then a whole-word `from` within 2000 characters before the next `;`, so `import{a}from"x"` is also reported and `reimport x from y` is not; whitespace is no longer required; the identifier-boundary rule also applies to May-be-rejected hits; `parseFailed` is set on any acorn error, keeping token severities. |
| FR-6, AC-6.5 (accepted 2026-11-11) | `Server.User` returns `null` when anonymous; context mark "Both"; table "All methods" | Returns shows "Not documented on Learn" (the description says "null when the caller is anonymous"); context marks read "HTTP and Liquid" / "HTTP only" / "Liquid only" plus "Async: use await" / "Synchronous"; property objects caption "All properties"; tile captions are uppercased by CSS. |
| FR-11 colour roles (accepted 2026-11-11) | `--primary` fill only for selected pills, active recipe underline, Download, done segments; `--review` only for status; no gradient | `--primary` fill also on "Insert into handler" and "Discard edits", and the underline also on "Logic name"; `--review` also on the flagged-line bar, the findings list and the app glyph ring; the app glyph is a `conic-gradient`; `.ui-tile` keeps a neutral `linear-gradient(var(--tile-glass)…)` and `backdrop-filter: var(--tile-blur)` (both no-ops), and dark `body` keeps `background-attachment: fixed`. |
| FR-11 layout (accepted 2026-11-11) | Create Logic rows `129px / minmax(0,1fr) / auto` | `129px minmax(200px,1fr) min-content` (200px from Fix 7); page height `max(calc(100vh - 42px), 658px)`. |
| FR-11 tokens (accepted 2026-11-11) | Table lists every token | `tokens.css` adds `--window-bg`, `--code-highlight` (named in the code-well bullet only), `--font-ui`, `--font-mono`. All listed values match. |
| NFR Accessibility (accepted 2026-11-11) | `tokens.test.ts` "asserts every pair" | It asserts text tokens on `--tile` and `--code` and six tint pairs; not on `--window` or `--surface`, and no 3:1 check for `--control-border` or the focus outline. |
| FR-1 fallback log (accepted 2026-11-11) | "by error name only" | `logHostFailure` logs the call label, error name and HTTP status (never message, body, URL or token). |
| FR-7 allowlist (resolved 2026-11-11) | The adapter "rejects any other `operationName`" | Was: checked at runtime by name only; `operationType: 'action'` was enforced by the TypeScript type alone. Fixed (`691236c`): `isAllowedFileRequest` checks the name, `operationType === 'action'`, and that no `entityName` or `entityId` is present, before `dataverseAPI.execute`; anything else is refused. |
| FR-7 data-source table (accepted 2026-11-11) | Site settings "filtered to the site and the `ServerLogic/` prefix" | The query filters by site and type 9 only; the name filter is applied in the tool (consistent with the FR-7 name rule). |
| FR-7 skipped rows (accepted 2026-11-11) | "Findings are graded from the readable rows" | A file whose assigned role id isn't among the readable roles gets the non-reviewable "Couldn't read configuration" on Web role and Table permissions instead of being graded without it. Tests cover only a skipped row no file references. |
| FR-8 (accepted 2026-11-11) | "Each finding owns its category"; Not-scanned detail "names the missing evidence" | `Finding` has `check`, not `category` (looked up from check copy); the detail is the generic "Not read before the connection was lost". |
| FR-9 O6 (accepted 2026-11-11) | O6 adds "Do these domains cover every host this handler calls?" | Every outbound finding carries that question and "Has tenant outbound policy been reviewed separately?". Guidance and question texts beyond the spec live in `model/copy.ts`. |
| FR-9, F26 (accepted 2026-11-11) | Unresolved Parent chain → Needs review on the affected file | Reported on every file, whether or not the chain links to the file's roles. |
| AC-8.5 (accepted 2026-11-11) | Mark as reviewed updates "the snapshot" | The ring and list summary update; the configuration snapshot is unchanged (it is evidence). |
| AC-9.2 (resolved 2026-11-04) | One H3 with guidance and questions per Needs-review finding | Was: the detail paragraphs started with the reasons again, so each reason appeared twice (three times for O3–O5); the screen de-duplicated and the goldens' fixture hid it. Code fix applied 2026-11-04 (4.3.1): `buildReportModel` drops detail lines that repeat a reason (and the summary when a check has no reasons), so reports match the screen. `makeFinding` still seeds `detail` with the reasons. No spec change needed. |
| AC-9.8 (resolved 2026-11-11) | Results cleared while the dialog is open → "nothing is saved"; once the save dialog has opened, the snapshot already built is saved | Was: a job already in `saving` closed its dialog and sent "Results changed, so the export was cancelled.", then the file still saved and "<name> exported" followed. Fixed (`396e734`, owner default 2026-11-11): a saving job closes its dialog with no "cancelled" toast and its own outcome toast follows; idle and building jobs are still cancelled with the toast. The slow-build notice can still appear for a job whose dialog was closed (E-07 B: closing never cancels the job). |
| AC-9.3 (accepted 2026-11-11) | Headline "<F> server logic files, <R> findings to review" | Singularised when 1. |
| FR-10 F44 (accepted 2026-11-11) | "rows aren't split" | A logical row taller than a page is divided into continuation rows labelled "<label> (continued k/m)"; a printed row never spans pages. |
| Header, FR-10, FR-11, A8 (accepted 2026-11-11) | Report styling follows "README §05" | The live handoff README's §05 is Accessibility; the report palette now exists only in the P5.6 plan and `pdfDrawing.ts` (P-07). `pdfDrawing.ts` also keeps `blue #1f6fd1` for the ring, outside A8's chip rule. |

---

## Appendix: Review finding dispositions (v0.7.0)

All 59 findings from `sol-review.md`, with Opus's responses in `Opus-review-of-Sol-review.md` and the two debate rounds. Priority shows Sol's position, then Opus's final one.

- **Adopted:** in this spec as of v0.6.0.
- **Adopted (v0.7.0):** Opus's agreed remedy, undisputed in the debate, written into v0.7.0.
- **Adopted (v0.7.0, owner):** decided by the owner on 2026-10-08; the column records the decision.

| ID | Finding | Priority (Sol / Opus) | Disposition | Where, or agreed remedy |
|---|---|---|---|---|
| F01 | Universal JSON parsing contradicts text and flow payloads | P1 / P1 | Adopted (v0.7.0) | Decode `Body` per recipe row: R6 raw text; R9 JSON if it parses, else text, `null` when empty |
| F02 | Liquid treats `status: "error"` as success | P1 / P2 | Adopted (v0.7.0) | Three Liquid branches on `result.success` and `result.data.status` |
| F03 | R5 inputs don't match the Learn demo page | P1 / P1 | Adopted (v0.7.0) | Keep Learn's input names and locations (`username`, `serviceSession`, `UserName`) and validate them |
| F04 | Account scope lacks relationship and linkage setup | P1 / P1 | Adopted (v0.7.0, owner) | R4 `post` uses a Global Create-only permission; S4 probes the caller's parent account, and a bound create replaces it if proven. Account-scope checklists name the relationship and the parent-account prerequisite (FR-3, Spike S4) |
| F05 | R7 HTML and upload-path safety | P1 / P1 | Adopted | FR-3 R7 Must, AC-3.7, Spike S3 collision probe |
| F06 | R7 partial side effects | P2 / P3 | Adopted | FR-3 R7 Must (failure stages, retry consequences), Error Scenarios |
| F07 | R10 custom API prerequisites | P2 / P3 | Adopted (v0.7.0) | README and checklist lines; the identity checked by `ExecutePrivilegeName` is marked "maker verifies" |
| F08 | Validation rows aren't executable contracts | P2 / P3 | Adopted | Contract preamble ("parses to an object"), R4 options and `$top`, R10 `id` (v0.6.0); example requests and R5's input rules (v0.7.0, with F03) |
| F09 | Logging raw exceptions and bodies | P1 / P1 | Adopted | FR-3 logging rule, AC-3.7, AC-4.12, Security |
| F10 | Caller-permissions footer misstates upstream identity | P2 / P3 | Adopted (v0.7.0) | Add "Upstream calls use this integration's own credentials" for R3, R5, R6, R7 and R9; the footer is unchanged |
| F11 | R8 inherits HTTP-only package wording | P3 / P3 | Adopted (v0.7.0) | The R8 README shows the Liquid tag; `method` is `null` for R8 |
| F12 | Regeneration vs. edit preservation | P2 / P2 | Adopted (v0.7.0) | Server text depends only on the recipe; reword AC-4.1 |
| F13 | Permissions review not invalidated by code changes | P2 / P3 | Adopted | AC-5.4 |
| F14 | Validation limitation invisible | P3 / P3 | Adopted (v0.7.0) | "Generated validation; edits aren't rechecked"; define Browser checks as a text-pattern check |
| F15 | Marking Permissions forces 3/3 | P2 / P3 | Adopted | AC-5.4 (in the same sentence as F13) |
| F16 | Async insertion invalidates Liquid | P2 / P2 | Adopted | AC-4.7, FR-2a, FR-6 Context marks |
| F17 | No insertion applicability contract | P2 / P3 | Adopted | AC-6.8, Error Scenarios |
| F18 | Byte-for-byte vs. normalisation | P2 / P3 | Adopted (v0.7.0) | LF-only editor model; download adds a missing final newline |
| F19 | Persisted state lacks versioning | P2 / P3 | Adopted (v0.7.0) | Superseded in v1.0.0: Starter state isn't persisted, so there is nothing to version |
| F20 | No-secrets promise vs. user code | P2 / P3 | Adopted (v0.7.0) | Scope the guarantee to generated files; user code is kept exactly as written |
| F21 | Slug lacks limits and collision disclosure | P3 / P3 | Adopted | AC-2.11, Spike S1 item 6 |
| F22 | T9 can't pass case-sensitive matching | P2 / P2 | Adopted (v0.7.0) | T9 → no match; delete the last sentence of FR-4's `with(` exception |
| F23 | Lexical regions need tests | P2 / P2 | Adopted (v0.7.0) | Shared tokenizer (FR-4 code analysis, v0.6.0); tokenizer fallback and T18–T20 (v0.7.0) |
| F24 | No exact string ≠ no connector access | P1 / P1 | Adopted | FR-7 connector detection, FR-9 O0, AC-8.8 |
| F25 | `get`-only names don't prove read-only | P2 / P3 | Adopted (v0.7.0, owner) | Append and Append To join the rule; summary "Change privileges on a handler that only exports `get()`", detail "Based on exported function names, not on what the code does." (AC-8.8, FR-9) |
| F26 | Inactive or ineffective permissions count | P1 / P1 | Adopted | FR-7 parent chain, FR-9, AC-8.8, data sources, Spike S1 item 5 |
| F27 | Role-linked grants are a subset | P2 / P2 | Adopted (v0.7.0) | Add the Authenticated Users and Anonymous Users role permissions to the grant set; label the snapshot |
| F28 | Settings evidence states | P2 / P3 | Adopted (v0.7.0) | Trim, then match `true`/`false` case-insensitively; anything else, or a duplicate, is Needs review |
| F29 | S1 identity-join fixtures | P2 / P3 | Adopted (v0.7.0) | S1 records exact queries, redacted samples and environment-variable-backed settings |
| F30 | O6 proves only that a list exists | P2 / P2 | Adopted (v0.7.0) | Structural O6 wording plus a coverage question; the `*.` wildcard goes to S4 |
| F31 | Timeout conditional on HttpClient | P2 / P2 | Adopted (v0.7.0) | A site-level banner like AC-7.9; drop the row exclusion |
| F32 | "No outbound calls" excludes CloudFlow | P2 / P3 | Adopted (v0.7.0) | O1 → "No HttpClient calls in code", plus a CloudFlow detail line |
| F33 | Reviewing unknown evidence | P2 / P2 | Adopted (v0.7.0, owner) | No Mark as reviewed when any reason is a read failure; analysis limits ("couldn't determine", a looping or missing parent chain) stay reviewable (AC-8.5, FR-8) |
| F34 | Connection changes need unconditional invalidation | P1 / P1 | Adopted (v0.7.0) | AC-7.6: drop "When Inspector is open"; a scan ID discards stale results |
| F35 | Inventory paging and recovery | P2 / P3 | Adopted (v0.7.0) | Read every page (S2 checks `queryData` paging); a tool-owned bounded retry; an "Inventory incomplete" state (v1.0.0) |
| F36 | No-sites message overstates inventory | P3 / P3 | Adopted (v0.7.0) | AC-7.8 names enhanced data model sites |
| F37 | Scan provenance undefined | P2 / P3 | Adopted | AC-9.2, AC-9.3, FR-10; change detection is Out of Scope |
| F38 | "Configured" labels erase review | P2 / P3 | Adopted (v0.7.0, owner) | Legend "C configured · V reviewed · M review"; "Ready · V reviewed"; "K/T checks addressed (C configured, V reviewed)"; design sign-off given (AC-8.1, AC-8.6, AC-9.3) |
| F39 | Count variables inconsistent | P2 / P3 | Adopted (v0.7.0) | C/V/M/U/T variables; pluralised "U not scanned"; a 64-combination test |
| F40 | Export eligibility vs. partial results | P2 / P3 | Adopted (v0.7.0) | Export after a finished or stopped scan with at least one file; disabled while a scan runs |
| F41 | Reviewed exports omit reasons | P2 / P3 | Adopted (v0.7.0) | A Reviewed Finding cell lists every original reason, whatever the toggles are |
| F42 | Report escaping | P2 / P2 | Adopted (v0.7.0) | Escape Markdown table cells; HTML-escape values for PDF; a hostile-name fixture |
| F43 | Redacted file names vs. sanitation | P2 / P3 | Adopted (v0.7.0) | Sanitise the stem after redaction; redact the PDF title metadata |
| F44 | PDF pagination | P2 / P3 | Adopted (v0.7.0) | PDF paginates, repeats table headers and doesn't truncate |
| F45 | Export snapshot coordination | P2 / P3 | Adopted (v0.7.0) | The report is built from the state at Export |
| F46 | Export timing and failure | P2 / P3 | Adopted (v0.7.0) | Mirror AC-5.10 and AC-5.11 for reports |
| F47 | Disabled choices rely on tooltips | P2 / P2 | Adopted (v0.7.0) | `aria-disabled`, tooltip on focus and `aria-describedby`; also applies to the new Insert reasons (AC-6.8) |
| F48 | Keyboard behavior loose | P2 / P3 | Adopted (v0.7.0) | APG radio group, tabs and modal dialog; Esc then Tab leaves the editor |
| F49 | Async state and recovery | P2 / P3 | Adopted (v0.7.0) | Host notifications with an in-tool fallback (v1.0.0); error toasts stay until dismissed; always show "Scanned X of N"; "Couldn't copy" |
| F50 | Smaller panels and enlarged text | P3 / P3 | Adopted (v0.7.0, owner) | Minimum viewport 1024×700, measured as the viewport; scrolls below it (Accessibility) |
| F51 | Search and filter selection | P3 / P3 | Adopted (v0.7.0) | Select the first visible object; a member match selects that member |
| F52 | Report file name and font scopes | P3 / P3 | Adopted (v0.7.0) | Separate the display name from the export stem; bundle the report fonts locally |
| F53 | Pending design confirmation | P2 / P3 | Adopted (v0.7.0, owner) | Layout 10a adopted; A1, A2, A4 and A8 decided; Open Questions reworded; glass contrast is a UI-acceptance gate (FR-11, Assumptions) |
| F54 | S4 can't prove four claims with one recipe | P1 / P2 | Adopted (v0.7.0) | One throwaway probe (get, post, liquidSync, liquidAsync, CloudFlow); toggle O3–O6 |
| F55 | CreateRecord ID casing | P2 / P2 | Adopted (v0.7.0) | `entityid ?? entityId`; a missing ID returns `status: "error"` |
| F56 | Parse tests don't prove behavior | P2 / P2 | Adopted | AC-4.12 |
| F57 | Missing-setting example returns an object | P2 / P2 | Adopted (v0.7.0) | `return JSON.stringify({ status: "error", … })` in FR-3 and Error Scenarios |
| F58 | R5 empty `put` body | P2 / P3 | Adopted (v0.7.0) | R5 row: `put` and `del` return nothing beyond `status` when `Body` is empty (lands with F03) |
| F59 | Spike evidence requirements | P2 / P3 | Adopted (v0.7.0) | Each spike records its calls, versions and outcome in `plan.md`; pin the R7 package to `7efe699`. v0.6.0 adds the "proposals until they run" rule (Open Questions) |

**Totals:** Adopted in v0.6.0 13 · Adopted in v0.7.0 40 · Owner decisions adopted in v0.7.0 6 · Open 0.

## Implementation alignment — Fix 7 (2026-11-01)

This dated addendum records the approved behavior changes delivered for Logic Starter and Server Objects. For the clauses listed below, this addendum supersedes conflicting text in the original acceptance criteria; unrelated requirements remain unchanged.

- **AC-2.10 and AC-3.8 — HTTP method filters.** GET, POST, PUT, PATCH and DELETE pills are always enabled and act as recipe filters, not as the loaded handler's invocation method. A selected filter marks eligible recipes by their exported functions, combining with text search; the recipe count reflects visible matches, and an empty result is shown when none match. Clearing the filter restores all ten recipes, including Liquid-only R8. Filtering alone never changes the loaded recipe, method or code. Selecting a different recipe retains the filter method when that recipe exports it, otherwise uses its default; the existing edited-handler confirmation still applies. The loaded handler method and client-call target remain independent from the filter until a recipe is selected.
- **AC-3.1 and AC-3.8 — recipe picker operation.** The picker includes a named chevron button that opens and closes the same filtered list as the field. It exposes expanded state and the listbox relationship, supports Enter and Space activation, Escape and outside-pointer dismissal, and preserves focus while choosing. The active option remains visible while navigating, including wraparound and filtered results. The prior recipe-count copy is dynamic rather than fixed at ten.
- **AC-4.8 and FR-2a — request-path strip removed.** Logic Starter does not render the Page script → Token → Endpoint → Handler → Returns strip in HTTP or Liquid mode, and reserves no layout row for it. The generated client call, endpoint and handler behavior remain governed by their existing requirements. This owner-approved removal supersedes AC-4.8 and FR-2a's strip-display requirements.
- **AC-2.8 — same-recipe filter selection.** Choosing the already-loaded recipe while a compatible method filter is selected updates the invocation method to that filter without regenerating the handler or discarding edits. Choosing a different recipe still follows the existing default/preferred-method rule above.
- **AC-4.1 and minimum-viewport layout.** With R7's checklist expanded at 1024×700, both editable panes retain at least 200 CSS px of height. The ten-item checklist has its own bounded scroll area so its final item remains reachable; at larger supported sizes, content may use the available pane space. The request-path strip occupies no layout space.
- **AC-6.4a and AC-6.6 — explicit member selection.** After a member search, an explicit member choice through either the member pill or table remains selected while its object remains listed. Query/filter changes still repair selection to a visible result, and object-row clicks retain the matching member when the row matches the query.
- **AC-3.6 and AC-6.9 — permission-row reconciliation.** Repeated table grants for one logical table are distinct by access scope. Changing recipes removes obsolete grants from the rendered permission list.
- **AC-3.9 — demo response envelopes.** R4/R5/R6 demo pages require an object envelope with `success === true` and string `data` before parsing; malformed JSON or non-object payloads produce readable errors without success handling. Application success is reported only for `payload.status === "success"`; explicit failure envelopes retain their error path.
- **AC-6.7/AC-6.8 and download action sizing.** Copy sample and Insert into handler, plus Download starter, use compact scoped sizing with a minimum 24 CSS px target and 14 px icons. Shared button defaults, other Copy buttons, Start over sizing, focus, busy/disabled states, copy feedback, insertion and download behavior remain unchanged.
- **FR-12 — PPTB event disposal.** The adapter invokes the disposer returned by runtime `events.on` on last unsubscribe and `pagehide`; it falls back to `events.off(hub)` only when no callable disposer is returned. Cleanup is idempotent and clears old subscribers before resubscription.

**Verification record:** implementation details, regression results, browser measurements, Insider `1.2.8-dev.20261030` event-delivery evidence and commits are in [the Fix 7 execution record](../../plans/11-01-2026-fix-7-completion.md). The full test suite passed 91 files / 1,402 tests; TypeScript/Vite build and scoped ESLint passed.


## Implementation alignment — Phase 5 (2026-11-03)

This dated addendum records the owner decisions taken while Logic Inspector and its reports were built (P5.4–P5.7; `docs/phase-5/plans/P5-4&6choices.md`, `P5-5choices.md`, `P5-7choices.md`, and the readings the accepted plans recorded). For the clauses listed, it supersedes conflicting text in the original acceptance criteria; unrelated requirements remain unchanged. Decision IDs are the choices files' IDs. Code deviations and their 2026-11-11 decisions are in the Implementation Status table above.

### Connection, site list and scan states (Story 7, FR-7)

- **AC-1.3, AC-7.1 — three-state connection (D-05 B).** The active connection is `pending`, `ok` or `failed`. The title bar reads "Checking connection…" while the first read is in flight and "Connection unavailable" when it fails; Inspector shows the panels "Checking the active connection" and "Couldn't read the active connection", the latter with a **Retry** button that re-reads the connection and hides while a read is in flight. "Not connected" stays the label for a successful read with no connection. A failed background refresh keeps the last confirmed identity (AC-7.6).
- **AC-1.2, AC-7.2 — site picker (D-04, D-13, D-16 A, S-08).** The pill reads "No site selected" in every no-selection state, including `connection-changed`. While unavailable it is `aria-disabled` with one reason: "Waiting for the active connection.", "Select a connection in Power Platform ToolBox first.", "Loading sites…", "Couldn't load sites. Open Logic Inspector to retry." or "No Power Pages sites in this environment.". The site list loads on mount, on Retry and on a confirmed identity change only. Keyboard: Tab commits only after the highlight moved; Home and End open on the first or last option; inactive options can be highlighted but never committed; blur or an outside click closes without committing. Long connection labels ellipsize with a tooltip (D-15).
- **AC-7.3, AC-7.9, AC-7.12, Error Scenarios — one site-notice list (D-10).** Every site banner renders once, in a fixed order (settings, default roles, skipped rows, inventory, connection lost), in a "Site notices" list above the files tile and grid. The files tile carries no banner; "Inventory incomplete. Reconnect and rescan." and "Connection lost. Reconnect and rescan." are site notices. On screen, backticks in banner, reason and summary text are dropped; reports keep them.
- **AC-7.4 — nothing read (D-11).** After an incomplete or stopped scan with zero files, the empty state reads "No server logic records were read." and Export report's reason is "Nothing to export: no server logic records were read."; "No server logic found on this site" is kept for a complete scan.
- **AC-7.5 — placement (D-07).** The non-dev warning sits at the top of the Inspector page only.
- **AC-7.8 — panel title (D-17, E-05).** The empty state has the title "No sites found" above the AC-7.8 sentence, and a disabled Export report with the reason "Nothing to export: no sites were found.".
- **AC-7.6, AC-7.10, FR-7 — scan lifecycle (D-01 A, D-02 C, D-14 B, S-02, S-03).** There is no Stop control; a scan ends by finishing, failing, being superseded or the connection changing, so "stopped" means connection loss. The rescan button is labelled **Scan again** (refresh glyph) and appears in the title tile after a finished or stopped scan and in the failed-scan panel; the notice text keeps "Reconnect and rescan.". A connection change mid-scan produces the scan state `connection-changed` with the panel "The connection changed while scanning" and no Scan again. A scan that throws produces the panel "Couldn't scan <site>" / "The scan stopped because of an unexpected error. Nothing was kept." with Scan again. A new scan or site-list read waits up to 10 s for the previous generation's reads to settle; the scan id is `<connection id>:<site id>:<generation>`. After the reads finish the connection is re-read, and a changed id or URL abandons the results; a transient re-read failure is accepted. An identity change the provider hasn't adopted yet is shown as already cleared.
- **FR-7, Error Scenarios — progress text.** "Scanned X of N" appears once the inventory read has settled; before that the panel reads "Reading server logic records…". When the inventory is incomplete the line continues "found so far. The record list is incomplete.". Inventory rows with no readable id, name or state are skipped and make the inventory incomplete.
- **FR-7 — settings read failure.** When the whole settings read fails, two banners appear: "Couldn't read `ServerLogic/Enabled`" and "Couldn't read `ServerLogic/TimeoutInSeconds`". When either value comes from an unreadable environment variable, the banner carries the 4.2.0 cause text instead.
- **FR-7 — paging guard (RG-001).** In strict mode a full page with no next link fails the read with "Dataverse returned a full page with no paging link, so the result may be incomplete.", keeping the rows read as partial evidence. Strict mode was the default while `NEXT_LINK_UNVERIFIED` was `true`; since 2026-11-11 (`691236c`, on the 2026-11-10 S2 evidence, FR-7) the flag is `false`, so by default a full page with no next link is the last page, and strict mode applies only when a caller passes `true` as the positional `strict` argument of `queryAllRows` or `fetchAllPages`. A repeated paging link stops the read. Only the path after `/api/data/vN/` is followed and it must start with the entity set. Cancellation surfaces after any backoff wait in progress (up to 4 s).
- **AC-7.7, AC-8.5, AC-8.8 — reason texts.** Reasons are shown with the status separately and capitalised: "Couldn't read configuration", "Couldn't read handler code", "Couldn't interpret `ServerLogic/AllowedDomains`: `<entry>`". Configured summaries read "Web role assigned." and "Table permissions linked to the grant set.".
- **AC-7.12 (121–240).** The clamp note is appended to each file's Outbound snapshot rows; there is no site-level detail view.

### Findings and review (Story 8, FR-8, FR-11)

- **AC-8.1, AC-8.3 — no file selected after a scan (D-03 C, D-18 A).** After a scan no file is selected: the title tile shows the site name and the grid shows "Select a file to review its readiness."; AC-8.3 applies once the user picks a file. The chosen finding is remembered per file for the scan. A zero-file result shows no ring, finding or detail tiles.
- **AC-8.1 — title line.** With a file selected the title tile line is `<file> · Active|Inactive`. The legend prints "N not scanned" without a pluralisation step (none is needed in English).
- **AC-8.2, FR-11 — needs-review tile tint (D-21 B).** Every Needs-review finding tile is filled `--review-tint` with a `--review` border, not only its pill. Not-scanned tiles use a dashed border and a third glyph.
- **AC-8.4, AC-8.5 — detail tile (D-12).** The detail tile is one scrolling grid cell (`tabIndex=0`) headed "Why this needs review" (Needs review) or "Original reasons" (Reviewed). A polite live region announces "Marked as reviewed: <check> in <file>." and "Review undone: <check> in <file>.".

### Export dialog and job (Story 9, FR-1, FR-12)

- **AC-9.1 — availability (E-05 A+).** Export report is rendered in the results view and the no-sites panel only; the scanning, failed and connection-changed states have no control, which satisfies "disabled while a scan runs". When disabled it carries one reason: "Nothing to export: no server logic files were found.", "Nothing to export: no server logic records were read.", "Nothing to export: no sites were found." or "An export is still in progress." (any existing job, dialog open or closed).
- **AC-9.1 — dialog (E-06 C, E-09 A).** Title "Export report"; a context line "<site> · <file>"; Report and Format as radio pill groups (group label as `aria-label`); the three Include options as a `Checkbox` primitive (`aria-disabled`, focusable) with no visible "Include" heading; **Cancel** and a header Close button; a `role=status` line "Building report…" / "Saving report…". Options reset to the AC-9.1 defaults on every open; This file is the default only when the selected file is in the captured result. Entry focus lands on the checked Report radio. While a job runs every control is `aria-disabled` with "Wait for the export to finish, or close this dialog." and the primary button is busy.
- **AC-9.8 — job ownership and invalidation (E-01 C, E-02 A, E-03 A, E-04 B).** The export job lives in the Inspector session store as a deep-frozen copy of the results taken when the dialog opens; the dialog mounts at page level. "Results changed" means the session generation moved: a scan start, an abandoned scan, a confirmed identity change, a site dropped on reload (D-19 C) or any review-mark change. A building job is then removed and the dialog closes with the info toast "Results changed, so the export was cancelled.". A job already saving (the host save dialog is open) is kept: its dialog closes with no "cancelled" toast, and the save's own outcome toast follows (owner default 2026-11-11, `396e734`). `ConnectionProvider` commits the identity with `flushSync`, and the build is bracketed by two macrotask yields so React paints first; a residual race is accepted. `exportedAt` is read when the build starts, one macrotask after submit.
- **AC-9.1, AC-9.9 — closing and failure (E-07 B, E-08 B).** Esc, Close and Cancel close the dialog in every phase without cancelling the job, which finishes in the background and toasts. `toolboxAPI.preventClose()` and `releasePreventClose()` bracket each job across build and save (PPTB 1.2.6+); a failing guard call is ignored. On a failed build or save the dialog closes, the job is removed and the error toast "Couldn't save <name>" carries "The report couldn't be built." (any failure before the save starts) or "The file couldn't be written." (any failure once it has started, host errors included), never the host's message; technical detail goes to the console by error name only (since 2026-11-11, `396e734`). If the file name itself failed, the title reads "Couldn't save the report". Retry is reopening the dialog. A native save cancel is silent. `saveFile` receives the content up front with the filter list `[{ name: 'Markdown', extensions: ['md'] }]` or `[{ name: 'PDF', extensions: ['pdf'] }]`.
- **AC-9.1 — focus after a stale close (E-10 A).** When results change while the dialog is open, focus moves to the heading of the panel now shown; in every other close it returns to Export report.
- **AC-9.9 — slow-build notice (E-11 B, amended 2026-11-11 for N4).** The build is synchronous and blocks the thread, so no timer can fire during it. The build is timed instead: when it took longer than the configurable threshold (5 s by default), a warning toast reads "The report took longer than expected to build." / "It has finished building. The save dialog opens next." once the build returns, before the save dialog opens (`396e734`). It is a warning, not a failure; AC-9.9's budgets stand. A chunked or off-thread build is deferred until the 5.6 s large-report build is profiled (blob workers are CSP-blocked).
- **FR-1 — `warning` notices.** A fourth notice type, used by the watchdog: sent to the host with no `duration`; the in-tool fallback treats it like an error (`role="alert"`, stays until closed).
- **FR-12 — host members.** `preventClose` and `releasePreventClose` join the host adapter; the scan does not use them. The events hub registers on the first subscriber and disposes on the last unsubscribe or `pagehide`, so it may register again later in the page's life. The host's `tool:unloaded` event is not a teardown signal: PPTB broadcasts it to every open tool view whenever any tool unloads, so the hub passes it on and keeps every subscriber. Since 2026-11-11 (`0e84815`, N3) the scan subscribes for its own duration, and any `connection-changed` event during it abandons the scan. Tests use a gated fake host with held saves and reads (E-12 B).

### Report content (FR-10, AC-9.2–9.4, AC-9.6)

- **AC-9.2, AC-9.3 — banners and lists.** Every site banner, not only AC-7.9, AC-7.12 and the default-role banner, is repeated in both scopes and formats, including the skipped-rows, couldn't-read-settings, "Inventory incomplete…" and "Connection lost…" notices. A "Not scanned" list is printed in both scopes when any check is Not scanned: after "Review first" in site scope, after the Needs-review sections in file scope. In site scope "Review first" is printed even when empty.
- **AC-9.3 — headers, headline and tables (P-14 a–c, e).** File scope header "File readiness report · <date>"; the site Markdown adds "Logic Inspector · Site readiness report · <date>", the headline and the counts line "Ready: n · Needs review: n · Incomplete: n · Not verified: Tenant outbound policy". The site H2 and PDF title read "Site readiness report: <site>". The file-scope Result line is `<Ready|Needs review|Incomplete> · <file summary>`. The PDF hero ring shows "K/T" with the caption "checks addressed"; the full "K/T checks addressed (C configured, V reviewed)" sentence is the Result line beside it. PDF files table: ring | File | Web role | Table permissions | Outbound networking | Result; the Markdown table adds an "Addressed" column. Pill tints are drawn behind the text. Reviewed cells read "Reviewed: <reasons>"; guidance is printed for Needs review only.
- **AC-9.3 — footer.** The site footer is two lines: "Configuration review only. Confirm effective access with a real site user. Exported <ts>." then "Tenant outbound policy not verified."; file scope keeps the single closing line. Timestamps are local `YYYY-MM-DD HH:mm:ss`, the Scanned line with one UTC offset from the end time. Every PDF page carries "Page n of m".
- **AC-7.3, AC-9.3 — Inactive label (P-14 d).** Inactive records get " (Inactive)" after the name wherever it is a label (tables, Review first, Not scanned); the H2, PDF title and file stem keep the stored name (the P5.6 plan narrowed P-14 d, which also named the file-scope title).
- **FR-10 — fonts and glyph coverage (P-01 B, P-12).** DM Sans 400 and 700, Space Grotesk 700 and JetBrains Mono 400 are embedded as base64 TTFs (JetBrains Mono from the official v2.304 release, SHA-256 in the P5.6 evidence). A character outside the embedded fonts' ranges is drawn as `?`, and the footer adds "N characters outside the PDF font set were replaced with ?". Non-Latin names therefore degrade; this is a known limitation.
- **FR-10 — PDF engine (P-07, P-09, P-11).** jsPDF 4.2.1 with jspdf-autotable 5.0.8, landscape A4, 36 pt margins, uncompressed, vector text only; `title` is the only metadata. Hero ring outer radius 50 pt and thickness 12 with one segment per check; mini rings outer radius 8 (stroke centre-line 6) and thickness 4 with three segments.
- **AC-9.6 — redaction aliases.** Besides the environment and site names and URLs, the hostname, host and origin of the connection URL and site domain are redacted (case-insensitive, at a name boundary) across banners, reasons, guidance, questions, detail and snapshot rows. The environment label ("Dev") is not redacted. With redaction on, the site stem is `site`, so the file is `site-site-readiness.<ext>`.
- **AC-9.2 — file order.** Files sort by name case-insensitively, then case-sensitively, then by id.

### Build and release (FR-1, FR-12)

- The default `npm run build` releases all three pages and is the v1.0.0 build (4.5.0); `npm run build:beta` releases `starter,objects` and hides the site pill, and is a partial build that isn't published. An explicit `VITE_RELEASED_PAGES` wins over the mode. The `objects`-without-`starter` rule and the unknown-page check are enforced at build time.
- `package.json` also carries `author`, a top-level `repository`, `keywords`, `engines.node >=20.19.0`, `files: ["dist"]` and `main: "index.html"`; `tests/manifest.test.ts` pins jspdf 4.2.1 and jspdf-autotable 5.0.8.

**Verification record:** commits, gate output, rendered checks and deviations are in `docs/phase-5/evidence/p5-1/execution.md` through `p5-7/execution.md` (P5.7 at `309eb14`, evidence `7f24e80`). Gates on 2026-11-03: typecheck and lint clean, 115 files / 2000 tests passing, `npm run build` OK. Live-host items RG-001 to RG-005 stayed open then; their 2026-11-11 state is in the Implementation Status (RG-001 and RG-002 closed with caveats, RG-004 partly measured, RG-005 open).
