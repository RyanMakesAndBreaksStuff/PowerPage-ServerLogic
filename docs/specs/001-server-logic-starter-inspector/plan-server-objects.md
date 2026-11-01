# Implementation Plan: Server Objects

**Spec:** docs/specs/001-server-logic-starter-inspector/spec.md (v4.0.0, Approved; v2.2.0 records Decision 1; v4.0.0 sets the 1a Graphite theme, already built)
**Depends on:** Part A of `plan-starter.md` (phases 00–06 and 18a) and **Phase 21** (Part C). Part A's Contracts are consumed unchanged. This plan pins `SERVER_OBJECTS` and its types (Phase 13) and moves nothing else.
**Index:** `plan.md`. **Split from `plan.md`:** 2026-10-17.
**Phase plans:** `plans/phase-NN-<slug>.md`, with the stable phase numbers from the original layout.

## Status (2026-10-20)
Planned. Phases 13 and 22 have implementation plans with full code. Both were drafted and run green against the repository on `001-server-objects` (`9ecf8ac`), then removed: 77 files and 1,118 tests passed, tsc, ESLint and Prettier were clean, and a 1100×780 render was checked in light and dark.
- Phase 13 can start now, in parallel with any Part B or C work.
- Phase 22 waits for Phase 21 and the spec PATCH.

## Scope
Spec Story 6 (AC-6.1–6.10, AC-6.4a), FR-6, AC-3.2 for the samples, AC-3.6's "Permissions needed" tile, the Server Objects no-results Error Scenario, and the NFR "Server Objects search filters within 100 ms".

## Decisions
1. **Server Objects ships only with Logic Starter** (owner, 2026-10-20).
   - The page reads the Starter session for:
     - the `used` pills, the "Used here" filter, Used in and Permissions needed;
     - Insert.
   - So `vite.config.ts` fails a build that releases `objects` without `starter`, and `App` mounts Server Objects only inside `StarterSessionProvider` (Phase 22, Task 1).
   - This supersedes Phase 18a Decision 3's `objects,inspector` smoke. It also makes the spec's "unreleased Starter" text unreachable: AC-1.7's Insert sentence, AC-6.8's last bullet, and FR-1's released-pages note.
   - The spec records it as v2.2.0 (MINOR, 2026-10-20), and Phase 22's preflight checks for it.
2. **CopyButton lives in `src/app/`.** Both pages use it, and a feature can't import another feature's internals. Phase 21 creates it there, with the shared toasts (AC-4.9, AC-6.7).
3. **"Browse all in Server Objects"** goes in Starter's action column, behind `__PAGE_OBJECTS__` (Phase 22 Decision 7).
4. **"All properties"** heads the members table for property objects; "All methods" heads it for the rest (Phase 22 Decision 8).
5. Catalogue decisions (statement-only samples, the return types, the sync and async marks, the variants) are in Phase 13's Decisions.

## Global Constraints
- Everything in `plan-starter.md` § Global Constraints applies:
  - a single IIFE bundle;
  - read-only toward the environment;
  - host globals only in `src/services/pptb/`;
  - strict TypeScript, React 19 with the Compiler, a feature-first layout;
  - the four checks on every phase.
- The page lives in `src/features/server-objects/` and never imports from `src/features/starter/`. Insert goes through `useStarterSession()` (Phase 18a) and `useView()` (Phase 06); Copy goes through `@/app/CopyButton` (Phase 21).
- Every sample has **zero** FR-4 hits and inserts cleanly (AC-3.2), checked by a test that runs `runBrowserChecks` and `planInsertion` over the whole catalogue.
- The Server Objects search filters within 100 ms (NFR): it runs synchronously on each keystroke, with no debounce.

## Phases

| Wave | Phase | Title | Depends on | Implements / Satisfies (summary) |
|---|---|---|---|---|
| S1 | 13 | Server Objects catalogue | 02, 03 | FR-6 (9 objects, signatures with overloads, return types, async/sync and context marks, samples and variants); AC-3.2 zero hits and a clean insert for every sample. Pinned: `SERVER_OBJECTS`, `ServerObject`, `ObjectMember`, `SampleVariant`, `NOT_DOCUMENTED`, `isConnector` in `src/services/catalogue/serverObjects.ts` |
| S2 | 22 | Server Objects page | 13, 21, Part A (03, 04, 06, 18a), spec v2.2.0 | Story 6 (AC-6.1–6.10, 6.4a), no-results state, used marks from `derived.usedMembers`, Insert through `planInsertion` then one `applyChanges` and `setView('starter')`, Copy through `CopyButton`, the Starter-required build rule, and Starter's "Browse all in Server Objects" |

## Release gate: Server Objects (after 22)
1. The full suite, `npm run build`, the IIFE build-shape test (which includes "objects without starter fails"), and `npx pptb-validate --skip-url-checks`.
2. ◆ PPTB smoke with Debug → Load Local Tool, on a build with `VITE_RELEASED_PAGES` naming `starter,objects` plus any page already released:
   - Insert lands in the server pane, with one undo.
   - Copy shows its toast.
   - "Browse all" and "Back to Create Logic" switch tabs.
3. ◆ The Phase 22 rendered check at 1100×780 in both themes.
4. ◆ Publish with the owner's confirmation. Logic Starter is released with or before this page (Decision 1).

## Coverage (this plan)
- FR-6: 13 (catalogue), 03 (used detection and insertion, Part A), 22 (page).
- AC-6.1–6.7, 6.4a, 6.9, 6.10 → 22.
- AC-6.8 → 03 (planner), 18a (transaction), 22 (control, reasons, cursor, view switch).
- AC-3.2 (samples) → 13.
- AC-3.6 ("Permissions needed") → 22.
- AC-4.7 (Context HTTP-only marks agree with the Liquid rule) → 13.
- AC-1.7 for Server Objects → 22 (build rule; spec PATCH).
- NFR 100 ms search → 22.

## Phase files

| Phase | File |
|---|---|
| 13 | `plans/phase-13-objects-catalogue.md` |
| 22 | `plans/phase-22-objects-page.md` |
