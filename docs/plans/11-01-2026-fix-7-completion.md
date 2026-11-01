# Fix 7 execution evidence

Date: 2026-11-01. Plan: [Fix 7](11-01-2026-fix-7.md).

All delegates used GPT6-Luna with high reasoning. The coordinator reviewed diffs and serialized path-scoped commits. Pre-existing staged, unstaged, and untracked work was preserved.

## Task evidence

| Task | Regression / pre-change evidence | Verified result | Commit |
| --- | --- | --- | --- |
| 1 | Focused `repeated table grants` test failed: R10 retained one contact row; duplicate React key warning. | `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`: 24/24 passed. Composite rendering key only. | `bd433cf` |
| 2 | R7 cards clipped at both viewport sizes, both themes. Column overflow was `visible`; cards' scroll heights exceeded their client heights. | Column overflow `auto`; scroll height 949px, client heights 710/630px. Wheel reaches final sample; cards retain content height. | `b590ad8` |
| 3 | Both new `explicit member` regressions failed before implementation: PostAsync checked state was false. | Page + objectList suites: 37/37 passed, including unchanged object-row/query-match test. Render repair now preserves explicit members; object-row clicks use their existing memberMatch. Coordinator simplified destructuring and reran the suites successfully. | `a7fb281` |
| 4 | Sample actions and Download starter 43.73px high; Start over 25.07px; icons 16px, gap 8px. | CopyButton + ServerObjectsPage + DownloadStarterButton suites: 3 files / 38 tests passed. Browser at both sizes/themes: Copy/Insert 24px, Download 29.07px, Start over unchanged 25.07px; requested icons 14px, gap 6px. Focus rings visible; Enter insertion returns to Starter. | `349950c` |
| 5 | At 1024×700, R7 expanded checklist left `.starter-code__panes` at 0px; at 1100×780, 107.10px. Two new strip-absence tests failed before implementation. | StarterPage + ClientPane + client generator + readme suites: 4 files / 65 tests passed. Browser: R7 panes 200px; both editors focusable by keyboard; all ten items mounted, wheel reaches final Key Vault item. R1/R8 have no strip, one code-row child and both panes visible. | `e157bef` |
| 6 | `npx vitest run src/services/generators/handlers/demoPages.test.ts`: 3 new failures, 22 existing passes before implementation. | Same command: 25/25 passed; exact three golden comparisons retained. Scoped diff check passed. | `802eb39` |
| 7 | Contract tests first showed four failures; consumer baseline showed nine expected failures for filters, toggle, scrolling and selection. | Four focused suites: 58/58 passed; including contract test: 71/71. Browser verified every POST/PUT/PATCH/DELETE eligible recipe's generated client target, text/no-results/count, clear restoring R8, ten-option keyboard wrap/visibility, Enter/Space toggle, Escape/outside dismissal, retained edits on filtering/cancel/same-recipe selection, confirmed R10 PATCH, and Start over clearing the filter. | `99cca3d` |
| 8 | `npm test -- src/services/pptb/pptbHost.test.ts`: 3 lifecycle failures before implementation. | Same command: 65/65 passed; wrapper removal, single delivery, pagehide terminal cleanup and void-return fallback. Scoped diff check passed. | `dcdcf62` |

## Browser evidence

The required dev command starts, but the page is blank with `Cannot use import statement outside a module`. Browser checks therefore use a Vite production build served at `http://127.0.0.1:4173/` with `npx vite preview --host 127.0.0.1 --port 4173 --strictPort`. This does not claim the dev transform failure is fixed.

Screenshots under repository `.playwright-mcp/`:

- Before: `fix7-before-objects-{1100,1024}-{light,dark}.png` and `fix7-before-starter-{1100,1024}-{light,dark}.png`.
- Context after: `fix7-after-context-{1100,1024}-{light,dark}.png`.
- Actions after: `fix7-after-actions-{objects,starter}-{1100,1024}-{light,dark}.png`.
- Expanded checklist after: `fix7-after-checklist-1024-{light,dark}.png`.
- Final matrix: `fix7-final-{starter,objects,dropdown}-{1100,1024}-{light,dark}.png`.

Task 5 execution correction: the exact proposed 7rem cap alone yielded only 154.33px at 1024×700. To meet the plan's >=200px acceptance condition, the grid rows now use `129px minmax(200px, 1fr) min-content`. The final row retains its content height instead of clipping the note; at 1024×700 the document can scroll to 730px. Both editor focus checks and final checklist reachability passed in both themes. The checklist retains the planned 7rem internal scroll cap.

Task 7 browser baseline: nine ArrowDown presses activate R10 at y=582.67–625.60 while listbox ends at y=455.20 with scrollTop=0. No Toggle recipes button exists. On R1, POST/PUT/PATCH/DELETE have aria-disabled=true.

Task 7 integration corrections: the new action was added to `src/types/contracts.test.ts`'s exact action-union assertion. The planned clear-button row collapsed the existing Uses description to 0px; moving a 24px clear action beside the count preserves the 129px input row and a 15.47px Uses description at both widths/themes. Its visible label is Clear filter; its accessible name remains Clear method filter. Popup and trigger widths match exactly. Strict-lint fixes retain optional scrolling capability in jsdom, restore the scroll spy by property descriptor, and handle Escape on native controls instead of a static div.

Final browser matrix: R7 editors measure 251.40px at 1100×780 and 200px at 1024×700 with the checklist open; all ten entries and the final Key Vault item are reachable. Context scroll height is 949px versus client heights 710/630px; final card reachable; Back focus ring visible. Sample actions remain 24px and Download starter 29.07px in both themes.

Browser runs without a PPTB host; expected host-access failures are logged and the shell reports Not connected. These runs prove browser behavior only.

## Final gates

- [x] Full test suite: `npm test`, 91 files / 1,402 tests passed after integration fixes.
- [x] TypeScript/Vite build: `npm run build`, exit 0. Existing chunk-size advisory remains.
- [x] Plan-scoped ESLint plus `src/types/contracts.test.ts`, `--max-warnings=0`, exit 0.
- [x] `git diff --check`, exit 0; only line-ending advisories.
- [x] Integrated browser acceptance, matrix and interaction evidence above.
- [x] Installed PPTB Insider `1.2.8-dev.20261030`: actual bridge event-delivery sequence passed, below.

Strict-check follow-up commit: `77b728b`. Generated response functions are executed using `node:vm` instead of Function constructors. Host registration uses a structural runtime signature returning unknown while retaining the real events receiver. The generated tests, lifecycle tests, full suite, build and lint pass after these changes. No check was disabled.

Insider installed at `C:\Program Files\Power Platform ToolBox Insider\Power Platform ToolBox Insider.exe`. Registry/FileVersion: `1.2.8-dev.20261030`; ProductVersion: `1.2.8.0`. Coordinator launched it; the user loaded the tool and opened its developer console at `pptb-webview://local-ryanmakes-powerpages-serverlogic/index.html`.

Temporary live diagnostic: `.scratch/build-fix7-host-probe.mjs` builds `.scratch/fix7-host-probe/fix7-host-probe.js` from an entry importing the production `createPptbHost`; no adapter source is copied or changed. The probe exposes `fix7Probe.begin()`, `pagehide()`, `resume()`, `report()` and `cleanup()`. It records subscriber names and event kinds only. `begin()` unsubscribes an old subscriber and subscribes the current one. A real event must increment only `current`; after `pagehide()` a real event must increment neither; after `resume()` a real event must increment only `resumed`. Build succeeded. The diagnostic is separate from the shipped `dist` package.

The host denied direct workspace `fileSystem.readText`; no filesystem grant was added. The console instead received the compiled event-hub function and its helper functions verbatim from the built diagnostic, with the same diagnostic subscriber harness. This exercises the production event-hub implementation against the actual bridge; it does not claim the preloaded application's private host instance was exported. A separate real `events.on` observer counts raw deliveries and records event names only. Insider returns a callable disposer. Re-saving unchanged tool-scoped settings emitted no events. A host theme save emitted exactly two raw events (`settings:updated`, `notification:shown`), exactly two current-subscriber deliveries, and zero deliveries to the unsubscribed subscriber.

The isolated sequence used `toolboxAPI.utils.showNotification` to emit one real `notification:shown` event per step. A temporary observer awaited each event before printing the counters; it was disposed after each step. Native console output (2026-11-01, `VM203:1`, displayed 06:23:16):

| Console label | Raw host events | Old subscriber | Current subscriber | Resumed subscriber |
| --- | ---: | ---: | ---: | ---: |
| FIX7_BASE | 3 | 0 | 3 | 0 |
| FIX7_ACTIVE | 4 | 0 | 4 | 0 |
| FIX7_AFTER_HIDE | 5 | 0 | 4 | 0 |
| FIX7_AFTER_RESUME | 6 | 0 | 4 | 1 |
| FIX7_AFTER_CLEANUP | 7 | 0 | 4 | 1 |

`FIX7_DONE` printed with no new error. These deltas prove one application delivery per host event while subscribed, no delivery after pagehide, no revival of previous subscribers, one delivery to only the new subscriber after resubscription, and no delivery after final unsubscribe. The raw observer was disposed. The tool was reloaded to remove diagnostic globals and restore its normal subscriptions after the simulated pagehide. Native console screenshot was captured inline in the execution chat.

Cleanup limitation: Insider closed during an interruption and was reopened for cleanup. Its original Dark theme has not been restored: the reopened host remains Light, and computer-use focus/click actions repeatedly failed to activate Settings. Restore Dark in host Settings when convenient. This does not affect the verified lifecycle result or repository implementation.

## Supplemental static audit

`py C:/Users/RyanDev/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py . --mode strict --output .scratch/fix7-premium-audit.json` returned exit 1 with six actionless-button detections: five in existing test fixtures and one at the existing StarterInputs Modal callback. These detections are retained as supplemental evidence, not silently treated as passed. This task does not introduce a new design system or alter unrelated test fixtures; the approved plan and existing shared primitives/theme remain authoritative.
