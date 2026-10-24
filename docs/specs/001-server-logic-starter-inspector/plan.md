# Implementation Plan: Server Logic Tools (index)

**Spec:** docs/specs/001-server-logic-starter-inspector/spec.md (v3.0.0, Approved)
**Decisions:** no ADRs; library and phasing decisions are in the spec's Resolved log, and the 2026-10-17 owner decisions are in `plan-starter.md`.
**Created:** 2026-10-16. **Split into three page plans:** 2026-10-17.

This file is now an index. The 25-phase layout was replaced by three plans, one per page, each ending at its own release gate:

| Plan                                               | Page                                                                                         | Depends on       | Status                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| [`plan-starter.md`](plan-starter.md)               | Logic Starter, **plus Part A, the shared foundation**, and the Contracts every plan consumes | —                | Part A fully planned (phases 00–06, 18a). Parts B and C outlined. Part D (Phase 25, Iris theme) planned for spec v3.0.0 |
| [`plan-server-objects.md`](plan-server-objects.md) | Server Objects                                                                               | Part A, Phase 21 | Planned (phases 13, 22); spec v2.2.0                             |
| [`plan-inspector.md`](plan-inspector.md)           | Logic Inspector and reports                                                                  | Part A only      | Planned (phases 11, 12, 15, 16, 20, 23, 24); spec v2.3.0         |

Phase numbers are stable IDs carried over from the original layout, so cross-references in the phase files stay valid. `18a` is the session state moved out of old Phase 18 into Part A.

## How the work runs

```
Part A (plan-starter.md): 00 → {01, 02, 03, 04, 05} → 06 → 18a
                                                          │
            ┌──────────────────────────────┬──────────────┴──────────────┐
            ▼                              ▼                             ▼
  plan-starter.md Parts B, C     plan-server-objects.md          plan-inspector.md
  07 08 09 10 → 14 17, ◆19       13 → 22                         11 → ◆12 → 15, 16 → 20, 23 → 24
  18 → 21 → Starter gate         → Server Objects gate           → Inspector gate

Part D (plan-starter.md, spec v3.0.0): 25 Iris theme, after 04, 06, 18, 21 and 22; all three gates wait for it.
```

Once Part A is merged, the three plans run in parallel. Shared names are pinned only in `plan-starter.md` § Contracts; the other plans consume them unchanged. Pages release in whatever order their gates pass, each build naming its released pages in `VITE_RELEASED_PAGES` (FR-1, FR-12).

## Part A completion record (2026-10-17)

The "Steps to finish Part A" from the previous version of this file, and where each landed:

1. **00/04 conflict fixed:** Phase 04 now uses Phase 00's JetBrains Mono woff2 (`src/assets/fonts/fonts.css`) and `@fluentui/react-icons`.
2. **Shell plan written:** `plans/phase-06-shell.md` (AC-1.1–1.7, FR-1 notify with in-tool fallback, theme follow, events registered once).
3. **Shared Starter session plan written:** `plans/phase-18a-starter-session.md` (reducer, derived values, provider; `readiness.browser` is `hits.length === 0 && !parseFailed`; `planInsertion` changes applied as one transaction, `async` first).
4. **New shared names pinned** in `plan-starter.md` § Contracts: `createPptbHost(options?)`, `HostCallError`, the Phase 04 components and props types (`Button`, `useDisabledReason` and the rest), Phase 05's `methodEnabled`, `checklistLines`, `UPSTREAM_CREDENTIALS_LINE`, `ACCOUNT_TEST_USER_LINE`, `EXAMPLE_GUID` and the snippet exports, the `ReportModel` placeholder, and the Phase 06 and 18a app names.
5. **Owner decisions taken:** the paging rule amended (`Prefer: odata.maxpagesize`, no `$top`); opaque dark tiles plus the glass layer; npm package `@ryanmakes/powerpages-serverlogic`; scaffold with the standard Vite template (`react-compiler-ts`, ESLint) instead of `yo pptb`, keeping the template's versions except ESLint 9.
6. **This file split** into the three plans above. Phase files 00–06 and 18a are listed under Part A in `plan-starter.md`; they stay in `plans/` so their paths do not change. Phase 05 moved from Part B to Part A because the session needs it.
7. **Committed** on `001-server-logic-starter-inspector`.

Changes made along the way, recorded in the phase files: Phase 01's `getTheme` now rejects on a host failure (for AC-1.6); Phase 00 scaffolds with create-vite 9.2.1 and Vite 8's `rolldownOptions`; the Starter session receives the Part B generators by injection (`StarterDeps`).

## Spec v3.0.0: Iris theme (2026-10-23)

The Iris theme replaces 11c and 12e (spec FR-11, A1, A2). Its handoff is at `design_handoff_server_logic_tools/Logic Tooling Design Directions/design_handoff_iris_theme/`.

- **New:** `plans/phase-25-iris-theme.md` (Part D of `plan-starter.md`). It replaces the tokens, renames the CSS variables to the `iris.css` names, removes aurora and glass, makes code wells dark in both themes, and sets Segoe UI to weights 550 and 650. JetBrains Mono stays for code.
- **Superseded in part:** Phase 04's token values, glass and highlight rule, and the colour variables in the CSS of Phases 06, 18, 21 and 22. Each of those files says so at the top. Their behaviour, structure and tests of behaviour stand.
- **To build against Iris:** Phase 23 (not built yet). It uses the Iris names directly if it merges after Phase 25.
- **Unchanged:** reports (Phases 16, 20, 24), layout 10a, the host-driven theme with no toggle.
- **Gates:** each page's "glass contrast check" becomes the Iris glow contrast check, in both themes.

## Next step

Start building Part A with Phase 00 (`plans/phase-00-skeleton.md`), then waves A1–A3 as listed in `plan-starter.md`. Write the Part B and Part C phase files (07–10, 14, 17–19, 21) before their waves; the first page to release is Logic Starter.
