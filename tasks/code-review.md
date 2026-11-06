# Code Review Report — Server Logic Tools (PowerPage-ServerLogic)

**Date:** 2026-11-06
**Scope:** branch `review` at `d87d09e` — `src/` (TypeScript + React 19 PPTB tool), `tests/`, `scripts/`, `public/`, `tools/`, build and manifest config. All seven audit passes (Wiring, Error handling, Completeness, Dead code, Bloat, Hardcoding, Security), plus the React/TypeScript and Web Security quality gates, with Microsoft Learn used to verify generated-code claims.
**Files Scanned:** 326 (315 under `src/`, 112 of them test files)
**Total Findings:** 28 (0 critical, 8 warning, 5 prune, 15 info)

> The review was invoked with the argument `A`. That is not a mode the code-review skill defines, so it was treated as a full seven-pass review. The `rm-pptb-desktop-review-debug` and `microsoft-docs:microsoft-code-reference` skills were not installed in this session; the PPTB rule file `.claude/rules/pptb-host-and-output.md` and the Microsoft Learn MCP tools were used in their place.

---

## Summary

The codebase is in good shape. Typecheck, lint (zero warnings), 2029 tests and both production builds pass; the host boundary is airtight (one module touches `window.*API`, `execute` is gated to the two file-download actions, every OData fragment is validated, nothing logs bodies, URLs or tokens); and the generated handlers meet the spec's security rules and match current Learn, including the envelope-casing contradiction the spec already documents and resolved on a live site. The single biggest risk is that the Inspector rules engine runs in a provider render above every error boundary, so one unexpected exception on live Dataverse facts blanks the whole tool, including Logic Starter. The single best thing is the adapter layer: validated inputs, retry with named delays, fail-closed paging and name-only logging, all covered by tests.

### Scorecard

| Category | Score | Notes |
|---|---|---|
| Pass 1: Wiring | A | Every control has a working handler; host events registered once and routed. One complete component (`ExternalLink`) has no caller (see WR-002). |
| Pass 2: Error handling | B | No swallowed errors, plain-language status mapping, boundaries per page. Gap: provider render above the boundaries (WR-001); two toasts show internal messages (IN-001). |
| Pass 3: Completeness | B | All ten recipes, five methods, both export scopes and formats reachable; no stubs or TODOs. Manual advertises a Learn link that does not exist (WR-002); manifest `readmeUrl` targets a README that is not on `main` (WR-003); project `CLAUDE.md` guidance missing on this branch (WR-004). |
| Pass 4: Dead code | B | `tsc` with unused-locals on is clean; every `src` file is imported. Three unreferenced SVGs ship in `dist/`, an unreferenced ESLint shim, three unused font devDependencies, a duplicate `CLAUDE2.md`. |
| Pass 5: Bloat | B | Long files are mostly catalogue data or emitted templates. Real duplication in `demoPages.ts` (WR-005), an effect-derived state (WR-006) and a double cast (WR-007) in `RecipeCombobox`. |
| Pass 6: Hardcoding | B | Timers and status codes are named once. The `TimeoutInSeconds` 120/240 bounds are literal in five places (WR-008); a few duplicated constants (IN-005 to IN-008). |
| Pass 7: Security | A | No eval/innerHTML/fetch/token handling in tool code; `npm audit` 0/0/0/0; OData and Graph URL inputs validated or encoded; Markdown/PDF output escaped; CSP clean (single IIFE, no CDN). |

**Overall Grade: B**

### Verification evidence (source and static analysis, local build and tests only)

| Check | Result |
|---|---|
| `npx tsc -b` | exit 0 |
| `npx eslint . --max-warnings=0` | exit 0 |
| `npx vitest run` | 115 files, 2029 tests passed |
| `npx vite build` | exit 0, `dist/assets/index-*.js` 2 072 kB (768 kB gzip), single IIFE, no `type="module"`, no `crossorigin` |
| `npx vite build --mode beta` | exit 0, 935 kB (306 kB gzip) |
| `npm audit` (prod and full) | 0 critical, 0 high, 0 moderate, 0 low |
| `npx pptb-validate --skip-url-checks` | **exit 1**: `configurations.repository` and `configurations.readmeUrl` "not accessible" (see WR-003) |

Rendered-browser behaviour inside PPTB Desktop and live-site behaviour of generated handlers were **not** verified in this review.

---

## CRITICAL — Must Fix

None found.

---

## WARNING — Should Fix

### WR-001: Inspector rules engine runs in a provider render above every error boundary
**File:** `src/app/inspector-site/InspectorSessionProvider.tsx:83` (mounted at `src/app/App.tsx:74`; boundaries at `App.tsx:56`)
**Pass:** 2 (Error handling)
**Problem:** The provider computes `result: view.scan.status === 'done' ? evaluateSite(view.scan.facts, view.marks) : null` during its own render. `InspectorScope` wraps the whole shell, so it sits above `TitleBar` and above every per-page `PageErrorBoundary`. Nothing between `createRoot` and this provider catches a render error; `onUncaughtError` in `main.tsx:9-11` only logs the error name. No test exercises a throw inside the provider or inside `TitleBar`/`SitePill`.
**Impact:** One unexpected exception in `evaluateSite` over live Dataverse facts (the spec's own status notes the Inspector was built against fixtures and the live gate S2 is still open) blanks the entire tool, including Logic Starter and Server Objects, with no message. The per-page boundaries give a false sense of containment.
**Fix:** Remove the `result` member from the provider (`InspectorSessionProvider.tsx:83`) and from the `InspectorSession` type in `inspectorSession.types.ts`. Compute it inside `derivePageState` in `src/features/inspector/pageState.ts`, which already receives `scan` and the session and runs inside `InspectorPage` under `PageErrorBoundary`:
```ts
const result = scan.status === 'done' ? evaluateSite(scan.facts, session.marks) : null;
```
`SitePill` only needs `selectedSite`, which does not depend on `result`. Optionally wrap `<TitleBar />` in its own `PageErrorBoundary label="Title bar"` so a shell failure degrades to one alert line. Add a test that throws from a child of the provider and asserts the Starter panel still renders.

### WR-002: Manual advertises a Learn link; the component that would render it has no caller
**File:** `docs/usage-manual.md:178`, `docs/usage-manual.md:218`, `src/app/ExternalLink.tsx:1-30`, `src/services/pptb/host.types.ts:46`, `src/services/pptb/pptbHost.ts:189-194`
**Pass:** 1 and 3 (Wiring, Completeness)
**Problem:** The manual says "The Learn link opens its reference through PPTB" and has a troubleshooting row for "a Learn link fails in a browser preview"; spec FR-1 describes external links opening through `openInConnectionBrowser`. No production component renders an `<a>` or calls `host.openExternal`. `ExternalLink` is imported only by its own test; `RecipeMeta.learnUrl` is consumed only by the generators (`snippets.ts:52`, `readme.ts:109`); the Server Objects catalogue has no URL field. The string "Couldn't open the link" is absent from the built bundle, confirming the component is tree-shaken out.
**Impact:** A maker following the manual looks for a link that does not exist. `ExternalLink`, `openExternal`, `isHttpUrl` and their tests are a complete, tested implementation wired to nothing.
**Fix:** Decide one way. (a) Wire it: render `{recipe.learnUrl === null ? null : <ExternalLink href={recipe.learnUrl}>Learn: {recipe.name}</ExternalLink>}` where recipe metadata is already shown (`ContextColumn` or `PermissionNote`), and add a `learnUrl` to the Server Objects catalogue so `ObjectDetail` can render one. (b) Drop it: delete `src/app/ExternalLink.tsx` and `ExternalLink.test.tsx` (93 lines), remove `openExternal` and `isHttpUrl` from `host.types.ts`, `pptbHost.ts:39-46,189-194` and `fakeHost.ts` (~40 lines), and rewrite manual lines 178 and 218 to drop the Learn link.

### WR-003: Manifest `readmeUrl` points at a README that does not exist on `main`; `pptb-validate` fails
**File:** `package.json` (`configurations.readmeUrl`, `configurations.repository`)
**Pass:** 3 (Completeness)
**Problem:** `readmeUrl` is `https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/main/README.md`. `origin/main` is still the initial scaffold commit (`a6f5d19`) and has no `README.md`. `npx pptb-validate --skip-url-checks` exits 1 with both URLs "not accessible"; the installed validator 1.0.5 ignores `--skip-url-checks`, so the command CLAUDE.md names as the release gate cannot pass offline either.
**Impact:** PPTB shows no README for the tool until the app branch reaches `main`; the documented release gate is red.
**Fix:** Merge this branch (or at least `README.md`) to `main` before publishing, or point `readmeUrl` at the branch that carries the README. Add `configurations.website` to clear the validator warning. Update the CLAUDE.md release note to say the validator needs network access for the URL checks.

### WR-004: Project `CLAUDE.md` guidance replaced by a generic agent file; `CLAUDE2.md` is a byte-identical copy
**File:** `CLAUDE.md:1-28`, `CLAUDE2.md:1-28`
**Pass:** 3 and 4 (Completeness, Dead code)
**Problem:** `main` carries a project `CLAUDE.md` (what the tool is, where the spec and design live, standing product rules, PPTB constraints, commands). On this branch that file was deleted in `ce7cc95` and re-added in `1c9bdf6` as a 28-line generic "Agent Instructions" file about CodeGraph and lean-ctx, which also points at `LEAN-CTX.md`, a path listed in `.gitignore`. `CLAUDE2.md` (added in `b8fe06c`) is `cmp`-identical to it and referenced by nothing.
**Impact:** Future sessions on this branch lose the product rules (five HTTP methods, Markdown/PDF only, read-only toward the environment, single IIFE) and the commands; the same merge to `main` will overwrite the project guidance there.
**Fix:** Restore the project guidance from `origin/main:CLAUDE.md` (updating the "Status: pre-code" paragraph and paths for the built app), keep the CodeGraph/lean-ctx notes only if the tools are actually in use, and `git rm CLAUDE2.md`.

### WR-005: `pageR4` and `pageR5` are near-identical 200-line template emitters
**File:** `src/services/generators/handlers/demoPages.ts:256-446` and `:460-676`
**Pass:** 5 (Bloat)
**Problem:** 62 of the ~110 distinct non-trivial lines are byte-identical after trimming (the `render()` table builder, `$("#dataTable").html(`, `beginEdit`/`cancelEdit`/`saveClick`/`removeClick`/`addClick` glue, `applyRows`). They differ only in column list, id field (`contactid` vs `UserName`), endpoint and the `notifyFn(300)` vs `notifyFn(200)` delay. The file is 829 lines holding shared JS helpers, CRUD CSS and three page bodies.
**Impact:** A fix to the escaping or edit flow in one demo page silently misses the other.
**Fix:** Extract one `crudPageScript({ columns, idField, endpoint, notifyDelayMs })` emitter used by both, keep `pageR6` separate (it is a form page), and split into `handlers/demo/{shared,r4,r5,r6}.ts`. `__golden__/R4.page.html.txt` and `R5.page.html.txt` lock the output, so the refactor is safe. Make the notify delay one named constant.

### WR-006: Recipe combobox pushes render-derived state to its parent through an effect
**File:** `src/features/starter/inputs/RecipeCombobox.tsx:59-61`, `src/features/starter/inputs/StarterInputs.tsx:224-226`
**Pass:** 5 (Bloat; React rule "no effect-derived state")
**Problem:** `useEffect(() => { onVisibleCountChange(visible.length); }, [...])` reports a value computed during render up to `StarterInputs`, which stores it with `setVisibleCount` only to render it.
**Impact:** Every filter keystroke renders twice (child, then parent), the count lags one commit behind, and the parent holds state that is a pure function of the child's query.
**Fix:** Lift the `query` state to `StarterInputs`, compute `visibleCount` there from the same `matches()` filter during render, and delete the effect, the `onVisibleCountChange` prop, the `reportVisibleCount` callback and the `visibleCount` state.

### WR-007: Double `as` cast to satisfy jsdom in production code
**File:** `src/features/starter/inputs/RecipeCombobox.tsx:65-67`
**Pass:** 5 (TypeScript rule "no `as` casts to silence errors")
**Problem:** `document.getElementById(...) as unknown as { scrollIntoView?: ... } | null` widens a typed DOM element so a `typeof activeOption?.scrollIntoView === 'function'` guard passes lint, only because jsdom lacks `scrollIntoView`.
**Impact:** Type information is discarded in production to satisfy the test environment.
**Fix:** Replace with `document.getElementById(\`${id}-${activeId}\`)?.scrollIntoView({ block: 'nearest' })` and add `Element.prototype.scrollIntoView ??= () => {};` to `src/test/setup.ts`. Alternatively reuse the `list.scrollTop` approach `SiteCombobox.tsx:109-117` already uses without a cast.

### WR-008: `ServerLogic/TimeoutInSeconds` default and ceiling are literal in five places
**File:** `src/features/inspector/model/settings.ts:11,114,118,165,182`, `src/features/inspector/model/copy.ts:49`
**Pass:** 6 (Hardcoding)
**Problem:** `return result(120)`, `seconds >= 1 && seconds <= 240`, `? '120'`, `timeout.value > 120`, the invalid-text string "up to 240", and `TIMEOUT_NOTE` prose "values above 120 are clamped to 120. Learn allows up to 240" each carry the numbers independently.
**Impact:** When Learn or the Power Pages plugin changes the clamp, six places must change together and the note can disagree with the code silently.
**Fix:** Add `export const TIMEOUT_DEFAULT_SECONDS = 120; export const TIMEOUT_MAX_SECONDS = 240;` to `settings.ts`, use them in every expression (`String(TIMEOUT_DEFAULT_SECONDS)` at line 165) and build `TIMEOUT_INVALID_TEXT` and `TIMEOUT_NOTE` from them with template literals.

---

## PRUNE — Consider Removing

### PR-001: Three unreferenced icon explorations ship in every build
**File:** `public/variant-a.svg`, `public/variant-b.svg`, `public/variant-c.svg`
**What:** Three SVGs copied to `dist/variant-*.svg` by `publicDir`, and into the npm package through `"files": ["dist"]`.
**Why:** Zero references in `src/`, `index.html`, `package.json`, docs or tests; the manifest icon is `icons/logo.svg` (asserted by `tests/manifest.test.ts`).
**Lines saved:** 27 lines, 3 files, ~2 KB in `dist/`.

### PR-002: Unreferenced ESLint minimatch shim
**File:** `tools/minimatch-compat/index.js:1-3`, `tools/minimatch-compat/package.json:1-8`
**What:** A shim "so eslint-plugin-jsx-a11y can run on minimatch 11".
**Why:** Nothing references it (not `package.json` overrides, lockfile, scripts or docs); `eslint-plugin-jsx-a11y` resolves its own nested `minimatch` 3.1.5; lint passes without it.
**Lines saved:** ~15 lines, 2 files.

### PR-003: Three unused font devDependencies
**File:** `package.json` devDependencies `@expo-google-fonts/dm-sans`, `@expo-google-fonts/space-grotesk`, `@fontsource/jetbrains-mono`
**What:** Packages with zero references in `src`, `tests`, `scripts`, `vite.config.ts`, `eslint.config.ts` or tsconfig.
**Why:** The font files are committed under `src/assets/fonts/` and imported from there (`fonts.css`, `pdfFonts.ts`, `libraryProbe.ts`); nothing copies from `node_modules`. Provenance is already inconsistent (the phase-20 plan names `@expo-google-fonts/jetbrains-mono@0.4.1`, which is not installed).
**Lines saved:** 3 devDependencies; record each font's source package and version next to the OFL texts.

### PR-004: Two `useCallback` calls under React Compiler
**File:** `src/features/starter/inputs/RecipeCombobox.tsx:53-57`, `src/features/starter/inputs/StarterInputs.tsx:224-226`
**What:** The only two memo hooks in the codebase.
**Why:** React Compiler is enabled (`vite.config.ts:93`), and `react.md` says not to add memo hooks without a measured reason. The second disappears with WR-006.
**Lines saved:** ~4.

### PR-005: Three copies of `fieldError`, two of `pushError` and `q` across handler generators
**File:** `src/services/generators/handlers/r2.ts:9`, `r7.ts:95`, `r8.ts:10` (`fieldError`); `r4.ts:76`, `r5.ts:69` (`pushError`); `r5.ts:65`, `r7.ts:91` (`q`)
**What:** Identical local helper bodies emitting the FR-3 validation-error literal.
**Why:** `snippets.ts` is already the shared emitter module and exports `FieldError` and `validationFailureReturn`, which builds the same literal inline. Goldens guard the output.
**Lines saved:** ~20.

---

## INFO — Minor Observations

- **IN-001:** Both save paths put an exception's `message` into the user-facing toast: Inspector shows the adapter's internal "Host call failed: saveFile." (`src/app/inspector-site/inspectorSession.ts:305`, asserted by its test) and Starter shows any `Error.message`, including invariant strings such as "Duplicate path in zip" (`src/features/starter/download/DownloadStarterButton.tsx:38`). Use the existing `SAVE_FAILED_BODY` / `BUILD_FAILED_BODY` copy and keep `console.error(errorName(error))`.
- **IN-002:** Identical `dismissOutside` pointerdown effect in both comboboxes, and two different "scroll active option into view" implementations (`src/app/shell/SiteCombobox.tsx:98-117`, `src/features/starter/inputs/RecipeCombobox.tsx:63-82`). Extract `useDismissOnOutsidePointer` and `useScrollActiveOption` into `src/components/`.
- **IN-003:** `runScan` takes 6 positional parameters (`src/features/inspector/scan/scan.ts:289-296`); `preparePdfRows` (`pdfTable.ts:99`) and `drawRing` (`pdfDrawing.ts:49`) also take 6. Move `scanId` and `onProgress` into the existing `ScanOptions` object.
- **IN-004:** `createInspectorStore` is a 323-line closure owning snapshot plumbing, the site loader, the scan runner and the export job state machine (`src/app/inspector-site/inspectorSession.ts:89-411`). Move the export job into `inspectorExport.ts` behind a small controller.
- **IN-005:** `MAX_PAGE_SIZE = 5000` (`src/services/pptb/dataverseRead.ts:23`) and `PAGE_SIZE = 5000` (`src/features/inspector/scan/queries.ts:4`) encode the same limit independently; export one and derive the other.
- **IN-006:** Two `CheckStatus → label` maps with the same four strings (`src/components/checkStatusBadge.ts:6-13`, `src/features/inspector/report/buildReportModel.ts:9-14`); badge and report wording can diverge. One `CHECK_STATUS_LABEL` constant in `model/copy.ts`.
- **IN-007:** The Learn base URL is a constant in `src/services/catalogue/recipes.ts:15` but re-spelled in full in `src/services/generators/package/readme.ts:22-25`.
- **IN-008:** Colour literals outside `tokens.css`: `rgba(0,0,0,0.35)` and `rgba(0,0,0,0.3)` elevation shadows (`src/components/primitives.css:295,345`) and `#000` in a mask (`src/app/shell/shell.css:25`, alpha-only, harmless). Add a per-theme `--overlay-shadow` token.
- **IN-009:** Generated R7 builds `siteUrl`/`driveUrl` by concatenating `hostname`, `sitePath` and Graph's `siteId` without encoding (`src/services/generators/handlers/r7.ts:240,250`). These are admin site settings and Graph's own response, not caller input; every caller-controlled segment is encoded or escaped. Optionally say so in `R7_DIFFERENCES`.
- **IN-010:** Generated R9 forwards a non-JSON flow body verbatim to the browser (`src/services/generators/handlers/r9.ts:67-71`, `catch { flowResponse = r.Body; }`). Mirrors the spec's F01 decision for R6; either pass `null` or record the pass-through in `R9_DIFFERENCES`.
- **IN-011:** `checkLiquidSyntax` (`src/services/generators/client/liquidCheck.ts`) is imported only by tests and is tree-shaken from the bundle; rename to `liquidCheck.testkit.ts` to match `tutorial.testkit.ts`.
- **IN-012:** Nine value exports are used only inside their own file (`EXPORT_WATCHDOG_MS`, `SETTLE_TIMEOUT_MS`, `INITIAL_CONNECTION_REFRESH`, `BLOCK_BYTES`, `FILE_MAX_BYTES`, `PAGE_SIZE`, `SCAN_CONCURRENCY`, `DEFAULT_RECIPE`, `isAstNode`); drop `export`. Type exports stay.
- **IN-013:** Repo hygiene: four dated working notes at the root (`fix-7.md`, `new-recipes.md`, `phasse5plan.md`, `spec3check.md`, 919 lines); `.scratch/phase23-page.tsx.txt` and `.scratch/write-root-plans.mjs` are tracked although `/.scratch` is ignored; `docs/dataverseAPI-type35-query.txt` is a 5-line DevTools snippet; the design-directions zip and its extracted copy are both tracked. Owner decision; no runtime effect.
- **IN-014:** Learn now documents `$pages.ajax.request` (automatic CSRF token, `AjaxError`, `AbortSignal`) as the client call for `/_api/serverlogics/<name>` at `learn.microsoft.com/power-pages/configure/client-api/ajax`. The spec lists it as out of scope (preview); the generated `fetch` client still uses `shell.getTokenDeferred()`. Worth a spec revisit, not a defect. The author page's PascalCase envelope example still contradicts the lowercase keys the generated clients read; the spec's correction 8 records this and the lowercase form was confirmed on a live site, so no change.
- **IN-015:** Rolldown warns that `import.meta` inside `jspdf.es.min.js` is replaced with `{}` under IIFE output. Harmless for the paths used; silence it with `transform.define: { 'import.meta': {} }` if the noise matters.

---

## Pruning Plan

### Safe to Delete

| # | File / Range | Lines | Description |
|---|---|---|---|
| 1 | `public/variant-a.svg`, `variant-b.svg`, `variant-c.svg` | 27 | Zero references; copied into `dist/` |
| 2 | `tools/minimatch-compat/` (entire) | ~15 | Zero references; lint passes without it |
| 3 | `CLAUDE2.md` | 28 | Byte-identical duplicate of `CLAUDE.md` (see WR-004) |
| 4 | `docs/dataverseAPI-type35-query.txt` | 5 | DevTools snippet, unreferenced |
| 5 | `src/app/ExternalLink.tsx` + `ExternalLink.test.tsx` and `openExternal` in the adapter/fake | 93 + ~40 | Only if WR-002 option (b) is chosen |

### Should Inline

| # | File:Function | Called From | Recommendation |
|---|---|---|---|
| 1 | `src/features/starter/inputs/RecipeCombobox.tsx:close` (`useCallback`) | 3 sites in file | Plain `function close()`; the compiler handles identity |
| 2 | `src/features/starter/inputs/StarterInputs.tsx:reportVisibleCount` | 1 site | Disappears with WR-006 |

### Should Split

| # | File | Lines | Recommendation |
|---|---|---|---|
| 1 | `src/services/generators/handlers/demoPages.ts` | 829 | `handlers/demo/{shared,r4,r5,r6}.ts`; one parametrised CRUD-page emitter for R4/R5 |
| 2 | `src/app/inspector-site/inspectorSession.ts` | 411 | Export job state machine into `inspectorExport.ts`; store stays ~250 lines |
| 3 | `src/app/shell/SiteCombobox.tsx` | 262 | Shared `useDismissOnOutsidePointer` / `useScrollActiveOption` hooks; key-action reducer for the 14-case switch |

Over-threshold files judged acceptable as-is: `renderPdf.ts` (489, single renderer, no function over 50 lines), `recipes.ts` (468) and `serverObjects.ts` (403) (catalogue data), the three feature stylesheets, `client.ts` (368, one generator for three languages, golden-guarded), `r7.ts`/`r4.ts` (emitted code), `scan.ts` (343), `structure.ts` (335), `fakeHost.ts` (test double, tree-shaken), `InspectorPage.tsx` (283, one panel per discriminated state), `pdfTable.ts` (287).

### Dependencies to Remove

| Package | Reason |
|---|---|
| `@expo-google-fonts/dm-sans` (dev) | Fonts committed in `src/assets/fonts`; no build-time reference |
| `@expo-google-fonts/space-grotesk` (dev) | Same |
| `@fontsource/jetbrains-mono` (dev) | woff2 committed in `src/assets/fonts`; no build-time reference |

### Estimated Impact

- **Lines removable:** ~75 (≈210 with the `ExternalLink` option)
- **Files removable:** 7 (9 with the `ExternalLink` option)
- **Dependencies removable:** 3 devDependencies, 0 runtime
- **Est. bundle reduction:** ~2 KB of `dist/` (static SVGs); 0 KB in the JS bundle, which already tree-shakes the dead code

---

## Action Items (Priority Order)

1. [ ] WR-001: move `evaluateSite` out of the provider render into `derivePageState` under the page boundary; add a throw-in-provider test.
2. [ ] WR-003: get `README.md` onto `main` (or retarget `readmeUrl`) so `pptb-validate` passes before release; add `configurations.website`.
3. [ ] WR-004: restore the project `CLAUDE.md` from `main`, delete `CLAUDE2.md`.
4. [ ] WR-002: wire the Learn link or delete `ExternalLink`/`openExternal` and fix the manual.
5. [ ] WR-006 + WR-007 + PR-004: lift `query` to `StarterInputs`, drop the effect, the cast and both `useCallback`s; polyfill `scrollIntoView` in test setup.
6. [ ] WR-008: name the timeout bounds once.
7. [ ] WR-005 + PR-005: dedupe `pageR4`/`pageR5` and the handler helper copies (goldens guard both).
8. [ ] PR-001, PR-002, PR-003: delete the SVGs, the shim and the three font devDependencies.
9. [ ] IN-001: replace exception messages in toasts with the fixed copy.
10. [ ] IN-014: revisit `$pages.ajax` in the spec now that Learn documents it as the client call.
