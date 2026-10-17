# Implementation Plan: Logic Inspector and reports

**Spec:** docs/specs/001-server-logic-starter-inspector/spec.md (v2.0.0, Approved)
**Depends on:** Part A of `plan-starter.md` only (phases 00–06 and 18a). Its Contracts are consumed unchanged.
**Index:** `plan.md`. **Split from `plan.md`:** 2026-10-17.
**Phase plans:** `plans/phase-NN-<slug>.md`, with the stable phase numbers from the original layout.

## Status (2026-10-17)
Outlined. Phase files 11, 12, 15, 16, 20, 23 and 24 are not written yet; write each before its wave starts. Can start as soon as Part A is merged, in parallel with the other two plans.

**Open risk:** a file-column download through `queryData` is unverified until Spike S2 (Phase 12). If it fails, reading handler code needs `execute`, which the read-only rule forbids, so that would need a spec and rules change before Phase 15.

## Scope
Spec Stories 7–9, FR-7 to FR-10, Spike S2, AC-1.2's site picker (AC-7.2), and Inspector's half of AC-1.7 (the site pill stays disabled while Inspector is unreleased).

## Global Constraints
- Everything in `plan-starter.md` § Global Constraints applies.
- **Read-only:** Dataverse reads only through `PptbHost.queryAll` and `downloadFileColumn` (Phase 01). Every query carries `$select`, pages with `Prefer: odata.maxpagesize` and passes a deterministic `orderBy` (the primary key is enough; Phase 01, Decision 1).
- The Inspector reviews configuration only. Every report says so and states that the tenant outbound policy is **not verified**.
- Exports are Markdown and PDF only, for two scopes: **This file** and **Site summary**. No JSON.
- Report styling follows the original handoff's README §05 with the spec's A8 adjustments; the PDF uses the bundled DM Sans and Space Grotesk TTFs (Phase 00).
- Results, review marks and environment data are never persisted (FR-5a).
- A scan of up to 50 records completes within 30 s; an export within 5 s of the save being confirmed (NFR Performance).

## Phases

| Wave | Phase | Title | Depends on | Implements / Satisfies (summary) |
|---|---|---|---|---|
| I1 | 11 | Inspector rules engine | 03 | FR-7 grant set, parent chain, settings normalisation, AllowedDomains; FR-8; FR-9 O0–O6; AC-7.7/7.9/7.12 banners; AC-8.1 (64-combination test), 8.5, 8.6, 8.8, 8.10–8.12 |
| ◆ | 12 | Spike S2 + adapter fix-ups | 06 | The owner loads the build in PPTB and checks the S2 list (Phase 01's hand-off table); the evidence is recorded and an agent applies any adapter changes. A contradiction becomes a spec update first |
| I2 | 15 | Inspector scan reader | 01, 11, ◆12 | FR-7 data sources (S1), scan ID (F34), paging, "Scanned X of N", inventory incomplete, connection loss leading to Not scanned; AC-7.2, 7.3, 7.6, 7.10 |
| I2 | 16 | Report model + Markdown | 11 | FR-10 and AC-9.2, 9.4–9.8, 9.10 (Markdown), escaping, redaction, stem sanitising; replaces the `ReportModel` placeholder |
| I3 | 20 | PDF renderer | 16 | AC-9.3/9.4 PDF, F44 pagination, A8 tokens, fonts, PDF title redaction |
| I3 | 23 | Inspector page | 11, 15, Part A (04, 06) | Story 7/8 UI: site picker (replaces `src/app/shell/SitePill.tsx`, keeping its disabled cases for no connection and unreleased Inspector), files tile, banners, findings, detail, Mark as reviewed, warnings, empty and error states; AC-7.1, 7.4, 7.5, 7.8, 7.11, 8.2–8.4, 8.7, 8.9 |
| I4 | 24 | Export dialog | 16, 20, 23 | AC-9.1, 9.8, 9.9; snapshot at Export (F45) |

Notes for writing these phases:
- The site picker sits in the title bar but its state is Inspector's. Phase 23 keeps the selected site and the scan state in `src/app/` (for example `src/app/inspector-site/`), because the title bar (`app/shell/`) may not import from `features/inspector/`. The connection comes from `useActiveConnection()` (Phase 06); a `connection-changed` event clears results and review marks (AC-7.6).
- Use `useNotify()` for every toast and `ExternalLink` for Learn links (Phase 06).

## Release gate: Logic Inspector (after 23 and 24)
1. Full suite, `npm run build`, the IIFE build-shape test, `npx pptb-validate --skip-url-checks`.
2. ◆ PPTB smoke with Debug → Load Local Tool.
3. ◆ A scan on the dev site, timed against the 30 s / 50 records NFR.
4. ◆ Both export formats checked against the screen (AC-9.8).
5. ◆ Glass contrast check (dark).
6. ◆ Publish with the owner's confirmation, with `VITE_RELEASED_PAGES` naming `inspector` plus any pages already released.

## Coverage (this plan)
- FR-7: 01 (Part A), 11, 15; FR-8, FR-9: 11; FR-10: 16, 20, 24.
- **Story 7:** AC-7.1, 7.4, 7.5, 7.8, 7.11 → 23; AC-7.2, 7.3, 7.6, 7.10 → 15 (and 23 for the picker UI); AC-7.7, 7.9, 7.12 → 11.
- **Story 8:** AC-8.1, 8.5, 8.6, 8.8, 8.10–8.12 → 11; AC-8.2–8.4, 8.7, 8.9 → 23.
- **Story 9:** AC-9.1, 9.9 → 24; AC-9.2, 9.5–9.7, 9.10 → 16; AC-9.3 → 20; AC-9.4 → 16, 20; AC-9.8 → 16, 24.
- **NFRs:** 30 s scan → 15; 5 s export → 24.

## Phase files

| Phase | File |
|---|---|
| 11 | `plans/phase-11-inspector-rules.md` (to write) |
| 12 | `plans/phase-12-spike-s2.md` (to write) |
| 15 | `plans/phase-15-inspector-scan.md` (to write) |
| 16 | `plans/phase-16-report-markdown.md` (to write) |
| 20 | `plans/phase-20-report-pdf.md` (to write) |
| 23 | `plans/phase-23-inspector-page.md` (to write) |
| 24 | `plans/phase-24-export-dialog.md` (to write) |
