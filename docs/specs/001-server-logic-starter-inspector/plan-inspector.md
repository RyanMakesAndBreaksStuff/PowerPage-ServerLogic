# Implementation Plan: Logic Inspector and reports

**Spec:** docs/specs/001-server-logic-starter-inspector/spec.md (v4.0.0, Approved; v4.0.0 sets the 1a Graphite theme, and reports are unchanged)
**Branch:** `001-logic-inspector`
**Depends on:** Part A of `plan-starter.md` only (phases 00–06 and 18a). Its Contracts include the Inspector amendments recorded on 2026-10-22.
**Index:** `plan.md`. **Split from `plan.md`:** 2026-10-17.
**Phase plans:** `plans/phase-NN-<slug>.md`, with the stable phase numbers from the original layout.

## Status (2026-10-23)

Phase 12 Task 1 is done (`scripts/s2-probe.js`). Task 2 ran once in PPTB on 2026-10-22; the shape-only evidence is in `findings/logic/probe_findings.md` and the Phase 12 table. Accepted: connection shape, `Uint8Array` save, clipboard. Observed but open: paging (second request not seen in Network), `connection:updated` payload key names, environment-variable reads (not denied, row counts unknown), the quote/space literal URI. Not run: network drop, expired sign-in, `s2StopEvents()` follow-up, host version. Phase files 11, 15, 16, 20, 23 and 24 remain written and unexecuted.

**Contract amendments:** `plan-starter.md` § Contracts owns the declarations and changelog: unknown scope, ignored settings, per-setting Not scanned, transport/partial inventory evidence, the optional scan clock/abort, and the real ReportModel. Phase 11 owns rules and banners; Phase 15 owns reads/errors; Phase 16 owns report presentation data.

**Resolved risk (2026-10-23): the handler-code download has no read-only path in PPTB 1.2.7.** `queryData('powerpagecomponents(<id>)/filecontent/$value')` returned an empty object. That is the expected result, not a host fault: Learn ("Use file column data", "Download a file in a single request") says `$value` answers with a raw byte body plus `x-ms-file-size`, `x-ms-file-name` and `mimetype` headers, and `@pptb/types` declares `queryData` as returning parsed JSON (`{ value: [] }`), so a non-JSON body cannot come through it. The other documented routes are `InitializeFileBlocksDownload` and `DownloadBlock` (actions, so `dataverseAPI.execute`, which the read-only rule forbids), a `Range` GET (still `$value`, still bytes) and `retrieve`/`$select=filecontent` (returns only the file id and `filecontent_name`, per Learn "Behavior when retrieving"). Spec FR-7 already names the fallback: "Without one, every check that needs the code is 'Needs review – couldn't read handler code'." So Phase 15 is **not** blocked. `downloadFileColumn` maps the empty-object shape to a per-file, non-transport read failure, the outbound check reports "couldn't read handler code" (not reviewable, Phase 11), and the web-role and table-permission checks still run from `content`. Before accepting that outcome, Phase 12 confirms the file is populated (the `filecontent_name` and `powerpagecomponent_FileAttachments` metadata reads below), because an empty file could also yield `{}`. Lifting the limit later is a spec change (allow `execute` for the two documented download messages, which only read) or a PPTB host feature; it is not a Phase 15 decision.

## Scope

Spec Stories 7–9, FR-7 to FR-10, Spike S2, AC-1.2's site picker (AC-7.2), and Inspector's half of AC-1.7 (the site pill stays disabled while Inspector is unreleased).

## Global Constraints

- Everything in `plan-starter.md` § Global Constraints applies.
- **Read-only:** Dataverse reads only through `PptbHost.queryAll` and `downloadFileColumn` (Phase 01). Every query carries `$select`, pages with `Prefer: odata.maxpagesize` and passes a deterministic `orderBy` (the primary key is enough; Phase 01, Decision 1).
- The Inspector reviews configuration only. Every report says so and states that the tenant outbound policy is **not verified**.
- Exports are Markdown and PDF only, for two scopes: **This file** and **Site summary**. No JSON.
- Report styling follows the original handoff's README §05 with the spec's A8 adjustments. The PDF embeds three TTFs (FR-10): DM Sans and Space Grotesk (bundled in Phase 00) and JetBrains Mono for paths, which Phase 20 adds as a TTF because the UI's woff2 can't be embedded. `✓` is drawn as a vector path; neither DM Sans nor Space Grotesk has U+2713.
- Every `$filter` string value goes through one OData-literal helper that doubles `'` and URL-encodes (FR-7). At most 4 reads are in flight (FR-7).
- Inspector code (the site provider, the site pill's picker, the report and PDF modules, jsPDF) stays behind `__PAGE_INSPECTOR__`, so a build without `inspector` contains none of it (FR-1).
- Results, review marks and environment data are never persisted (FR-5a).
- A scan of up to 50 records completes within 30 s; an export within 5 s of the save being confirmed (NFR Performance).

## Phases

| Wave | Phase | Title                      | Depends on              | Implements / Satisfies (summary)                                                                                                                                                                                                                                                    |
| ---- | ----- | -------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1   | 11    | Inspector rules engine     | 03                      | FR-7 grant set, parent chain, settings normalisation, AllowedDomains; FR-8; FR-9 O0–O6; AC-7.7/7.9/7.12 banners; AC-8.1 (64-combination test), 8.5, 8.6, 8.8, 8.10–8.12                                                                                                             |
| ◆    | 12    | Spike S2 + adapter fix-ups | 06                      | The owner loads the build in PPTB and checks the S2 list (Phase 01's hand-off table); the evidence is recorded and an agent applies any adapter changes. A contradiction becomes a spec update first                                                                                |
| I2   | 15    | Inspector scan reader      | 01, 11, ◆12             | FR-7 data sources (S1), scan ID (F34), paging, "Scanned X of N", inventory incomplete, connection loss leading to Not scanned; AC-7.2, 7.3, 7.6, 7.10                                                                                                                               |
| I2   | 16    | Report model + Markdown    | 11                      | FR-10 and AC-9.2, 9.4–9.8, 9.10 (Markdown), escaping, redaction, stem sanitising; replaces the `ReportModel` placeholder                                                                                                                                                            |
| I3   | 20    | PDF renderer               | 16                      | AC-9.3/9.4 PDF, F44 pagination, A8 tokens, fonts, PDF title redaction                                                                                                                                                                                                               |
| I3   | 23    | Inspector page             | 11, 15, Part A (04, 06) | Story 7/8 UI: site picker (replaces `src/app/shell/SitePill.tsx`, keeping its disabled cases for no connection and unreleased Inspector), files tile, banners, findings, detail, Mark as reviewed, warnings, empty and error states; AC-7.1, 7.4, 7.5, 7.8, 7.11, 8.2–8.4, 8.7, 8.9 |
| I4   | 24    | Export dialog              | 16, 20, 23              | AC-9.1, 9.8, 9.9; snapshot at Export (F45)                                                                                                                                                                                                                                          |

Notes for writing these phases:

- The site picker sits in the title bar but its state is Inspector's. Phase 23 keeps the selected site and the scan state in `src/app/` (for example `src/app/inspector-site/`), because the title bar (`app/shell/`) may not import from `features/inspector/`. The connection comes from `useActiveConnection()` (Phase 06). A `connection-changed` event clears results and review marks only when the re-read active connection's id or URL differs from the scanned one, or there is none (AC-7.6). Phase 01's `toHostEvent` maps `connection:created`, `updated` and `deleted` all to `connection-changed`, so the comparison lives in Phase 23's site provider, not in the adapter.
- Use `useNotify()` for every toast and `ExternalLink` for Learn links (Phase 06).
- **Phase 11** pins in fixtures (spec v2.3.0, FR-7): the `AllowedDomains` host regex and the entries it rejects; case-insensitive, trimmed setting names, inactive settings ignored, and duplicates; `TimeoutInSeconds` (digits only, 1–240, absent = no banner, and the 121–240 note); unknown or missing `scope`; more than one default role (all count, plus a site banner); "Couldn't analyse handler code" (reviewable) versus "couldn't read handler code" (download failed, not reviewable).
- **Phase 12** checks the spec's full S2 list, including a network drop and an expired sign-in (error name and `status`, to tell AC-7.10 from AC-7.7), what `connection:*` payloads carry, and read access to the two environment-variable tables. It ships a copy-paste script for Tool DevTools that runs each check and prints the evidence to record. There is no up-front access test. After the 2026-10-22 run, the second pass must: open the Network panel once for the second paging request (literal `$skiptoken` and `%25` unchanged, no `%2525`; Learn: the link is never modified or encoded further) and for the quote/space filter (`O%27%27Brien`, `%20`); print the `(event, payload)` key names with `Object.keys` rather than `console.table`; run `s2StopEvents()` and one more connection change; record the row counts of the two environment-variable reads; add the two file-metadata probes (`$select=filecontent_name` on the type-35 row, and `$expand=powerpagecomponent_FileAttachments($select=filename,filesizeinbytes,mimetype)`) so a populated file is on record; and note the host version. Each `$top=1` read came back with `@Microsoft.Dynamics.CRM.totalrecordcount*` annotations, so the host adds its own `Prefer: odata.include-annotations`; the paging probe shows `odata.maxpagesize=1` still took effect.
- **Phase 15** runs reads through a fixed pool of 4, with Phase 01's retry per request, and records the 50-record timing. Its Decision 4 (a raw no-status rejection is provisionally connection loss) must not swallow two observed shapes: `downloadFileColumn`'s empty-object result is a local `HostReadError` and stays `transport: false`; and the first `getActiveConnection()` call in the 2026-10-22 run rejected with a no-status `Error` after about 10 s, then succeeded on the next call, so a single no-status host rejection is not evidence of loss until the network-drop and expired-sign-in probes record their shapes.
- **Phase 16** uses one inline-escape function for every value outside table cells (the H2, the Environment, Scanned and Result lines, headings, blockquotes and lists), plus the table-cell escape (FR-10). Site banners include the default-role banner.
- **Phase 20** adds the JetBrains Mono TTF (OFL, from the `@expo-google-fonts` mirror like the other two) and a test that every character written in each font is in that font's coverage.
- **Phase 23** implements the site pill as an APG select-only combobox with inactive sites as disabled options, gates the site provider and picker behind `__PAGE_INSPECTOR__`, updates the `tests/buildShape.test.ts` marker, and adds a test that a build without `inspector` contains no jsPDF or Inspector strings. The live connection `id` is a digit string, not a GUID, and the `connection:updated` payload's `data.url` is not a string (2026-10-22 evidence), so the AC-7.6 comparison re-reads the active connection on every event and never reads the payload. A transient `getActiveConnection()` rejection must not clear results or review marks; the provider keeps the last good connection and retries on the next event, focus or visibility change.
- **Phase 24** takes the snapshot when the dialog opens, closes the dialog with the "Results changed, so the export was cancelled." toast if results clear while it's open, defaults the scope per AC-9.1, builds the report before `saveFile` (≤ 5 s), and times only the write against the 5 s save budget (AC-9.9).

## Release gate: Logic Inspector (after 23 and 24)

1. Full suite, `npm run build`, the IIFE build-shape test, `npx pptb-validate --skip-url-checks`.
2. ◆ PPTB smoke with Debug → Load Local Tool.
3. ◆ A scan on the dev site, timed against the 30 s / 50 records NFR.
4. ◆ Both export formats checked against the screen (AC-9.8).
5. ◆ Publish with the owner's confirmation, with `VITE_RELEASED_PAGES` naming `inspector` plus any pages already released.

## Coverage (this plan)

- FR-7: 01 (Part A), 11, 15; FR-8, FR-9: 11; FR-10: 16, 20, 24.
- **Story 7:** AC-7.1, 7.4, 7.5, 7.8, 7.11 → 23; AC-7.2, 7.3, 7.6, 7.10 → 15 (and 23 for the picker UI); AC-7.7, 7.9, 7.12 → 11.
- **Story 8:** AC-8.1, 8.5, 8.6, 8.8, 8.10–8.12 → 11; AC-8.2–8.4, 8.7, 8.9 → 23.
- **Story 9:** AC-9.1, 9.9 → 24; AC-9.2, 9.5–9.7, 9.10 → 16; AC-9.3 → 20; AC-9.4 → 16, 20; AC-9.8 → 16, 24.
- **Story 1:** AC-1.2 site pill → 23; AC-1.7 Inspector half (site pill disabled while unreleased, no Inspector code in the bundle) → 23.
- **Error Scenarios (Inspector rows):** the check-result rows → 11; inventory incomplete, connection lost and site list errors → 15; empty, error and banner states → 23; export rows → 24.
- **NFRs:** 30 s scan → 15; 5 s build and 5 s save → 24; accessibility (site pill combobox → 23, export modal → 24, status glyphs and text → 11, 23).

## Phase files

| Phase | File                                |
| ----- | ----------------------------------- |
| 11    | `plans/phase-11-inspector-rules.md` |
| 12    | `plans/phase-12-spike-s2.md`        |
| 15    | `plans/phase-15-inspector-scan.md`  |
| 16    | `plans/phase-16-report-markdown.md` |
| 20    | `plans/phase-20-report-pdf.md`      |
| 23    | `plans/phase-23-inspector-page.md`  |
| 24    | `plans/phase-24-export-dialog.md`   |

## Plan Changelog

| Version    | Phase                      | Change                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.3.0      | 11, 12, 15, 16, 20, 23, 24 | Notes for spec v2.3.0: AC-7.6 compares connection id and URL; S2 adds connection-loss and event-payload checks and a DevTools script; fixture rules for settings, scope, default roles and code analysis; 4 reads in flight; inline Markdown escaping; JetBrains Mono TTF and vector `✓`; Inspector code gated out of other builds; export snapshot, cancel and build budget. Coverage adds AC-1.2, AC-1.7, error scenarios and accessibility. |
| 2026-10-22 | 11, 12, 15, 16, 20, 23, 24 | Seven executable phase files added. Scratch verification exposed necessary partialRows and per-setting Not scanned contracts, logical scan cancellation, instance-level jsPDF spies and PDF continuation rows. Formatting checks are scoped because the existing full-repository check fails on 176 files; rendered/live gates remain explicitly pending.                                                                                      |
| 2026-10-23 | 12, 15, 23                 | First S2 run reviewed against Learn (file column data, page results, filter rows, server logic site settings). The `$value` empty object is the documented binary body seen through a JSON-only `queryData`; the plan now follows spec FR-7's "couldn't read handler code" fallback instead of blocking Phase 15. Phase 12 gains file-metadata probes and the Network checks still owed; Phase 15 and 23 gain the no-status rejection and non-GUID connection id notes. |
| 4.0.0      | 23                         | Spec v4.0.0 (1a Graphite theme). Phase 23 uses the Graphite variable names in `src/app/theme/tokens.css`. The gate's glass contrast check is removed. Reports (Phases 16, 20, 24) are unchanged. |
