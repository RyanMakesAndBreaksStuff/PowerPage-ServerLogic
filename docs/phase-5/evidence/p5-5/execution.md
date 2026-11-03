# P5.5 execution record

**Plan:** `docs/phase-5/plans/p5-5_plan.md`
**Executed:** 2026-11-02, branch `logic-inspector-v2-build`, baseline `1e0156b` (plan baseline) plus `8c70979` (the pre-execution commit: spec 4.2.1 D-19 C delta, plan and choices moved to `docs/phase-5/plans/`, README row). P5.1 to P5.4 and P5.6 were already merged.
**Owner decisions recorded:** D-01 to D-21 and S-01 to S-08 as listed in `docs/phase-5/plans/P5-5choices.md` (2026-11-02, with the D-16 A and D-19 C reversals).

## Commits

| Slice | Commit | Message |
|---|---|---|
| Pre-execution | `8c70979` | docs(spec): 4.2.1 D-19 C site-list reload rule; P5.5 plan and choices accepted |
| A | `028e480` | fix(app): keep the last confirmed connection when a refresh fails and recover on focus (9 files, +637 / -35) |
| B | `be49471` | feat(app): add the app-scoped Inspector session and the title-bar site picker |
| C | `1901518` | feat(inspector): build the Inspector page states, files rail and site banners |
| D | `45b1fd3` | feat(inspector): add the readiness ring, finding tiles, detail tile and review actions |
| E1 | see `git log` (next commit on this branch) | docs(phase-5): P5.5 execution evidence, plan ticked |

## Gate output

### Slice A

| Command | Observed | Expected |
|---|---|---|
| A4 `npm test -- src/test/gatedHost.test.ts src/app/ConnectionProvider.test.tsx src/app/shell/connectionLabel.test.ts src/app/App.test.tsx` (implementation absent) | exit 1; `Test Files  4 failed (4)`, `Tests  5 failed \| 6 passed (11)`. Three suites failed to resolve `@/test/gatedHost` / `./gatedHost`; five `connectionStateLabel` cases failed with `connectionStateLabel is not a function` | same |
| A7 same command | exit 0; `Test Files  4 passed (4)`, `Tests  44 passed (44)` | 4 / 44 |
| A8 `npm run typecheck` | exit 0, no output | exit 0 |
| A8 `npx --no-install eslint src/app src/test --max-warnings=0` | exit 0, no output | exit 0 |
| A8 `npm test` | exit 0; `Test Files  106 passed (106)`, `Tests  1754 passed (1754)` | 106 / 1754 |
| A9 `git diff --cached --check` | nothing | nothing |

### Slice B

| Command | Observed | Expected |
|---|---|---|
| B9 `npm test -- src/features/inspector/scan/scan.test.ts src/app/inspector-site src/app/shell/SiteCombobox.test.tsx src/app/shell/SitePill.test.tsx src/app/App.test.tsx` (implementation absent) | exit 1; `Test Files  6 failed (6)`, `Tests  4 failed \| 52 passed (56)`. Two new `scan.test.ts` settle-all tests failed `expected true to be false`; four suites failed to resolve `./inspectorDeps`, `./SiteCombobox`, `./InspectorSessionProvider`; `App.test.tsx` CR-001 test got 0 site-list reads, AC-1.2 test got `null` for the title | same (the plan names `./useInspector` for the harness import; the observed unresolved import is `./InspectorSessionProvider`, same count) |
| same command after B2 | exit 0; `Test Files  6 passed (6)`, `Tests  129 passed (129)` | 6 / 129 |
| `npm run typecheck` | exit 0, no output | exit 0 |
| `npx --no-install eslint src/app src/test src/features/inspector/scan --max-warnings=0` | exit 0, no output | exit 0 |
| `npm test` | exit 0; `Test Files  110 passed (110)`, `Tests  1830 passed (1830)` | 110 / 1830 |
| `git diff --cached --check` | nothing | nothing |

### Slice C

| Command | Observed | Expected |
|---|---|---|
| C5 `npm test -- src/features/inspector/InspectorPage.test.tsx src/app/App.inspector.test.tsx tests/buildShape.test.ts` (implementation absent) | exit 1; `Test Files  3 failed (3)`, `Tests  4 failed \| 12 passed (16)`. `InspectorPage.test.tsx` failed to resolve `./pageCopy`; the three `App.inspector.test.tsx` tests could not find the heading "Select a site"; `buildShape` "includes all three pages" lacked `Review server logic readiness` | same |
| C13 same command | exit 0; `Test Files  3 passed (3)`, `Tests  51 passed (51)` (after deviation 2 below; the first run had 2 focus failures) | 3 / 51 |
| `npm run typecheck` | exit 0, no output | exit 0 |
| `npx --no-install eslint src tests --max-warnings=0` | exit 0, no output | exit 0 |
| `npm test` | exit 0; `Test Files  112 passed (112)`, `Tests  1868 passed (1868)` | 112 / 1868 |
| `git diff --cached --check` | nothing | nothing |

### Slice D

| Command | Observed | Expected |
|---|---|---|
| D2 `npm test -- src/features/inspector/ResultsView.test.tsx` (implementation absent) | exit 1; `Test Files  1 failed (1)`, `Tests  23 failed \| 4 passed (27)`, all "Unable to find" (ring `img` names, finding buttons, regions, "Select a file to review its readiness.") | same |
| D7 same command | exit 0; `Test Files  1 passed (1)`, `Tests  27 passed (27)` | 1 / 27 |
| D8 `npm run typecheck` | exit 0, no output | exit 0 |
| D8 `npx --no-install eslint src tests --max-warnings=0` | exit 0, no output | exit 0 |
| D8 `npm test` | exit 0; `Test Files  113 passed (113)`, `Tests  1895 passed (1895)` | 113 / 1895 |
| `git diff --cached --check` | nothing | nothing |

### Final gates (after `45b1fd3`)

| Command | Observed | Expected |
|---|---|---|
| `npm run typecheck` | exit 0, no output | exit 0 |
| `npx --no-install eslint src tests --max-warnings=0` | exit 0, no output | exit 0 |
| `npm run lint` | exit 0, no output | exit 0 |
| `npm test` | exit 0; `Test Files  113 passed (113)`, `Tests  1895 passed (1895)` | 113 / 1895 |
| `npm run build` | exit 0; `dist/assets/index-CAPfcpe8.js` 988.19 kB (gzip 323.12 kB) | about 988.32 kB |

## Rendered check

Run 2026-11-02 against `45b1fd3` (fake host, Chromium via Playwright MCP; R1 files created, R3 removed, no tracked file touched). Port 5178 was held by another process, so Vite served on 5179. Screenshots are outside the repository at `%LOCALAPPDATA%\Temp\claude\C--Users-RyanDev-source-repos-Server-Logic\d16dc462-f3af-43e6-925e-3c7e670b1060\scratchpad\p5-5-screens\` (`{WxH}_{theme}_{world}[-prod]_{state}.png`).

| Check | Viewport | Theme | scrollWidth == width | Result |
|---|---|---|---|---|
| Picker open, finished no file, Export reason on hover, file chosen (`world=default`) | 1024×700 | light / dark | true in every state | pass |
| same | 1100×780 | light / dark | true | pass |
| `world=long`, `env=prod`: 14 files, long names, non-Dev warning | 1024×700 | light / dark | true | pass |
| same | 1100×780 | light / dark | true | pass |
| Refresh-failed notice with Retry (reject, then ok) | 1024×700 | light / dark | true | pass |
| The connection changed while scanning; picker resets to No site selected | 1024×700 | light / dark | true | pass |

Confirmed: rail and detail tile scroll inside their cells (page scroll stays 0), selected file has the primary border, selected finding tile the 2 px primary inset ring, Needs-review tiles use `--review-tint` / `--review` with the tinted `!`, the Configured tile is untinted, the connection label, site name and file names ellipsize, nothing is clipped, focus rings are visible on files, tiles and the picker. Not staged (as the plan says the preview cannot): the first-read "Couldn't read the active connection" Retry panel; its tests cover it.

**Observation:** the finding-tile focus ring (1.6 px outline, offset inward) and the selected-tile inset ring are the same colour and nearly the same geometry, so a focused unselected tile is hard to tell from the selected one (`1024x700_light_row3_focus-unselected-tile.png`). Recorded for the owner under Still open; D-21 B is otherwise honoured.

## Deviations from the plan text

- **Pre-execution commit:** the plan file carries five lines whose only content is a single space (blank context lines inside anchored-diff blocks at plan lines 578, 747, 1327, 2584, 5951). `git diff --cached --check` flags them as trailing whitespace. They are meaningful to the diff format, so the docs commit `8c70979` was made with that warning standing; every code commit's cached check printed nothing.
- **Spec delta:** recorded directly as 4.2.1 (change-log row plus one sentence appended to AC-7.6) rather than through the `sdd-spec-update` conversation.
- **Slice B tests (2 assertions):** the plan's `SiteCombobox` places `aria-disabled` on the `role="combobox"` element, so `getByText('No site selected')` (the inner label span) has no such attribute. `SitePill.test.tsx` "is disabled and explains itself while no connection is active" and the existing `App.test.tsx` AC-1.3 test now read the attribute from `getByRole('combobox', { name: 'Power Pages site' })`. Component unchanged.
- **Slice C implementation (1 line):** two `InspectorPage.test.tsx` focus tests ("moves focus to the panel heading when Retry hides itself …") failed because a Retry click only changes the refresh context's `pending`, which the page did not read, so it never re-rendered and `useHeadingFocus`'s effect never ran. `useHeadingFocus` now calls `useRefreshConnection()` (one line plus a comment) to subscribe. `useRefreshConnection` was already imported.
- **Slice D diff context (1 block):** the first `ResultsView.tsx` block expected `import type { ReactElement } from 'react';`; after slice C the line is `import type { ReactElement, Ref } from 'react';`. The `useState` import was added above it as the plan intends, with `Ref` kept.
- **Slice B harness import:** the failing-signal unresolved import is `./InspectorSessionProvider` (from `inspectorTestHarness.tsx`), where the plan says `./useInspector`; count and kind match.
- **Line endings:** new files were written CRLF; `src/app/App.tsx` and `src/app/App.test.tsx` are LF and stayed LF; every anchored diff was applied by a script that normalised to LF, matched the block exactly once, and restored the file's endings. No file has mixed endings.
- `src/features/inspector/scan/scan.test.ts` carries only the two B3a additions; `createWorld` and the existing tests are unchanged. `src/services/pptb/` is untouched (`git diff 8c70979..45b1fd3 -- src/services/pptb` is empty). No dependency added.
- Executors ran on Sonnet 5.5 (slices B to D) and Opus (slice A); the plan does not prescribe a model.
- The plan's rendered-check paragraph ("Observed while drafting …") is the drafter's record; this execution's own R2 run is recorded under Rendered check.

## Observation

The repo stop hook ran the full suite between slices B1 and B2; that run showed the expected B1 failures and was not a gate. No gate run failed on a timeout; nothing was rerun. After the slice D gates `.claude/settings.json` showed an unstaged change (`power-pages@power-platform-skills` toggled to `false`), not made by this execution and not staged.

## Still open

- RG-002: the real `connection:*` payload and refresh-rejection shapes in the PPTB host.
- RG-005: screen-reader announcements, the full keyboard route in the PPTB Desktop host, 200% zoom and real-host control contrast.
- RG-001, RG-003 and RG-004 from P5.4.
- P5.7: the export dialog and save; it should capture `session.result`, compare `session.generation` before saving (generation also changes on a mark or undo), and a file-scope export needs `session.fileId` (D-03 C).
- Independent code review of `028e480..45b1fd3` (Sonnet 5.5, 2026-11-02): verdict ship, no critical or high findings. Follow-ups it names: (1) the store's `settled` chain has no timeout, so a host call that never settles would leave "Loading sites" with no Retry after a connection change (S-02 trade-off; the adapter cannot interrupt an in-flight call); (2) focus is not restored when the scanning panel unmounts into results (accepted by the plan's Risks note; the status region announces it); (3) `useHeadingFocus` subscribes to the refresh context only to re-render, where a local state counter or callback ref would be cleaner; (4) low items: the D-19 C guard is unreachable through the UI (by design), the combobox keeps `open` across an unavailable interval, `<div role=combobox>` sits inside a `<span>` anchor, and Retry hiding on a focus-triggered re-read can drop focus.
- Focus ring vs selected ring on finding tiles (rendered-check observation above).
