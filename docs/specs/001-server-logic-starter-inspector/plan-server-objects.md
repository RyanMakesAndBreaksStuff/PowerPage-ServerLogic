# Implementation Plan: Server Objects

**Spec:** docs/specs/001-server-logic-starter-inspector/spec.md (v2.0.0, Approved)
**Depends on:** Part A of `plan-starter.md` only (phases 00–06 and 18a). Its Contracts are consumed unchanged; this plan pins no new shared names.
**Index:** `plan.md`. **Split from `plan.md`:** 2026-10-17.
**Phase plans:** `plans/phase-NN-<slug>.md`, with the stable phase numbers from the original layout.

## Status (2026-10-17)
Outlined. Phase files 13 and 22 are not written yet; write each before its wave starts. Can start as soon as Part A is merged, in parallel with Starter Parts B and C and with `plan-inspector.md`.

## Scope
Spec Story 6 (AC-6.1–6.10, AC-6.4a), FR-6, and Server Objects' half of AC-1.7: **Insert into handler is hidden while Logic Starter is unreleased; Copy stays** (AC-6.8).

## Global Constraints
- Everything in `plan-starter.md` § Global Constraints applies: single IIFE bundle, read-only, host globals only in `src/services/pptb/`, strict TypeScript, React 19 with the Compiler, feature-first layout, the four checks on every phase.
- The page lives in `src/features/server-objects/` and never imports from `src/features/starter/`. Insert goes through `useStarterSession()` (`src/app/starter-session/`, Phase 18a) and `useView()` (Phase 06).
- Every insertable sample has **zero** FR-4 hits (AC-3.2), checked by a test that runs `runBrowserChecks` over the whole catalogue.
- The Server Objects search filters within 100 ms (NFR Performance).

## Phases

| Wave | Phase | Title | Depends on | Implements / Satisfies (summary) |
|---|---|---|---|---|
| S1 | 13 | Server Objects catalogue | 02 | FR-6 (9 objects, signatures, samples, context marks); AC-3.2 zero hits for every sample. Pinned: `SERVER_OBJECTS` in `src/services/catalogue/serverObjects.ts`; its `ServerObject` and `ObjectMember` types are this phase's and only the page consumes them |
| S2 | 22 | Server Objects page | 13, Part A (04, 06, 18a) | Story 6 (AC-6.1–6.10, 6.4a), no-results state, used-member marks from `derived.usedMembers`, Insert through `planInsertion` then `dispatch({ type: 'applyChanges' })` and `setView('starter')` (AC-6.8), Insert hidden while Starter is unreleased (`__PAGE_STARTER__`), Copy through `host.copyText` with the AC-4.9 toasts |

Notes for writing Phase 22:
- `useStarterSession()` exists only when Starter is released (the provider is mounted around this page only then; Phase 18a, Decision 3). Render the Insert control from a child component that is itself behind `__PAGE_STARTER__`, so the hook is never called without its provider and the Insert code is dropped from Starter-less builds.
- `planInsertion(code, sample, cursor, targetFn)` (Phase 03) gives the changes; `targetFn` is `derived.fn`, `cursor` is `state.cursor`. A failure reason maps to the AC-6.8 tooltip on `Button`'s `disabledReason` (Phase 04).

## Release gate: Server Objects (after 22)
1. Full suite, `npm run build`, the IIFE build-shape test, `npx pptb-validate --skip-url-checks`.
2. ◆ PPTB smoke with Debug → Load Local Tool, including a build with `VITE_RELEASED_PAGES=objects` to confirm Insert is absent and Copy works.
3. ◆ Glass contrast check (dark).
4. ◆ Publish with the owner's confirmation, with `VITE_RELEASED_PAGES` naming `objects` plus any pages already released.

## Coverage (this plan)
- FR-6: 13 (catalogue), 03 (used detection and insertion, Part A), 22 (page).
- AC-6.1–6.7, 6.4a, 6.9, 6.10 → 22; AC-6.8 → 03 (planner), 18a (transaction), 22 (control and reasons); AC-3.2 (samples) → 13; AC-1.7 (Insert hidden) → 22.
- NFR 100 ms search → 22.

## Phase files

| Phase | File |
|---|---|
| 13 | `plans/phase-13-objects-catalogue.md` (to write) |
| 22 | `plans/phase-22-objects-page.md` (to write) |
