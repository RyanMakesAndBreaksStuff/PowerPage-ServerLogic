# Code Review Report — Server Logic Tools (PowerPage-ServerLogic)

**Date:** 2026-11-07
**Decision:** CHANGES REQUESTED
**Review Mode:** whole codebase (branch `review` vs `main` is the entire project; reviewed as a `src/` audit)
**Scope:** `src/` (147 non-test TS/TSX files, 15,181 lines), `vite.config.ts`, `eslint.config.ts`, `tsconfig*.json`, `package.json` (PPTB manifest section), `public/`, `tests/`, `scripts/`
**Baseline:** HEAD `d87d09e` (2026-11-05). `tsc -b` clean · `eslint --max-warnings=0` clean · Vitest 115 files / 2029 tests pass (37.6 s) · `npm audit --omit=dev` 0 vulnerabilities · `pptb-validate` fails (see IN-008)
**Pass 5 Threshold Review:** 23 files over a threshold investigated (file > 300, function > 50, component > 200, imports > 15, switch > 8, ternaries > 2). Two findings (WR-001, PR-004). Every other case is a justified exception: output templates with shared helpers (`demoPages.ts`, `r4.ts`, `r7.ts`), catalogue data (`recipes.ts`, `serverObjects.ts`), one cursor-based PDF layout already split from drawing/fonts/table (`renderPdf.ts`), a closure store whose lifecycle writes must land in one publish (`inspectorSession.ts`), exhaustive `never`-checked switches (`InspectorPage.tsx`, `starterReducer.ts`, `demoPages.ts`), and a select-only combobox that is not a duplicate of the editable one (`SiteCombobox.tsx`). Full table in `.omc/review-lane-5-7.md` §(d).
**Files Scanned:** 147 non-test source files read by at least one lane; 115 test files read by title, key groups in full; 13 golden handler files swept
**Excluded / Unavailable:**
- Live PPTB Desktop host behaviour (events on connection switch, real Dataverse error shapes, `Server.SiteSetting.Get` on a missing setting). Probe steps are given under IN-001 and IN-007.
- `pptb-validate --skip-url-checks` still ran URL checks in v1.0.5; the flag appears unhonoured.
- Rendered-browser and 320 px / 200 % zoom accessibility checks (rm-react-typescript quality gates) were not run; source-level a11y only.
- `ryan-makes-strict-code-review` skill is in `~/.claude/skills/.trash`, `rm-react-typescript` is disabled for model invocation; both were read from disk and followed manually.
**Total Findings:** 21 (0 critical, 3 warning, 9 prune, 9 info)
**Severity standard:** Rule standard. The `.claude/rules/*.md` files are the merge contract, so any pattern a rule marks ✗ is a WARNING regardless of runtime cost. The 2026-11-04 supervised review applied a consequence standard and dropped the same three items; under that standard this review has 0 WARNINGs and would APPROVE. The owner should pick one standard and record it.

## Summary

The codebase is in good shape: zero criticals, every security check clean, host globals confined to one adapter, `dataverseAPI.execute` runtime-gated to the two allowed download actions, generated handlers fail closed and never log bodies, URLs or tokens, and all 2029 tests pass. The biggest behaviour risk is a residual one (IN-001): a scan abandoned on a connection switch depends on the host's `connection:updated` event to recover, which live probe evidence says does fire. The strongest simplification is the unused external-link chain (PR-001) plus three redundant `ExportJob` fields (PR-005). The decision follows from three WARNINGs that are outright violations of the project's own `react.md` and `typescript.md` contracts (two in `RecipeCombobox.tsx`, one cast in `pptbHost.ts`); all three were raised in the 2026-11-04 supervised review, dropped there on "no concrete consequence" grounds, and remain open. This review applies the rule standard: the rules files are the merge contract.

### Scorecard

| Pass | Grade | Evidence summary |
|---|---|---|
| 1 Wiring | A | All tabs/pages/handlers reach real behaviour; one event hub registered once, unsubscribed on last use and `pagehide`; no floating promises; host globals only in `services/pptb/`. Dead chain in PR-001/PR-002. |
| 2 Error handling | A- | Every `catch` narrows and surfaces or rethrows; 401/403/404/429/5xx mapped; `saveFile` null = cancel; export/zip failures cannot read as success; `console.error` logs names/status only. Wording and boundary gaps are INFO. |
| 3 Completeness | A | No TODO/placeholder; 10 recipes registered and generated; all 4 export cells round-trip incl. PDF file scope; all 4 `ServerLogic/*` settings consumed; every union switch ends in `never`. |
| 4 Dead code | B | `tsc` + `noUnusedLocals` clean; 5 PRUNE groups found (link chain, fonts, SVGs, icons, generator helpers), none in the bundle. |
| 5 Structure | B | Discriminated unions used throughout; one effect-derived-state violation and one cast (WR-001, WR-002); redundant job fields (PR-005); duplicated emitters (PR-004). |
| 6 Hardcoding | B+ | Only env var is `VITE_RELEASED_PAGES`, validated at build; generated limits and a few regex/page-size constants defined twice (PR-006, PR-007). |
| 7 Security | A | No eval/innerHTML/dangerouslySetInnerHTML/fetch/Bearer in app code; execute allow-list enforced at runtime; OData values escaped; filenames `[A-Za-z0-9._-]`/slug-only; `cspExceptions` absent; `npm audit` 0. |

**Overall Grade:** C (three WARNINGs under the rule standard, no CRITICAL)

## CRITICAL — Must Fix

None

## WARNING — Should Fix

### WR-001: Recipe count is derived state pushed through an effect, with `useCallback` around a stable setter
**File:** `src/features/starter/inputs/RecipeCombobox.tsx:59-61` (also `:53-57`), `src/features/starter/inputs/StarterInputs.tsx:223-226, 236-239`
**Pass:** 5 (react.md: "avoid useEffect for derived state"; "don't add useCallback by default")
**Evidence:** `RecipeCombobox` owns `query` and computes `visible` (:46-50). An effect (:59-61) pushes `visible.length` to the parent, which stores it in `useState(RECIPES.length)` (`StarterInputs.tsx:223`) via a `useCallback` that wraps the already-stable setter (:224-226). A second `useCallback` at `RecipeCombobox.tsx:53` exists only to feed the effect dependency at :81. Spec AC-3.1 and the Phase 5 addendum (spec.md:1185) require the count to follow the typed query, so the parent cannot derive it without the query. Repeat of `starter-and-objects-004` from the 2026-11-04 review; still open.
**Problem:** Each keystroke renders child, runs effect, re-renders parent, re-renders child. Two `useCallback`s with no measured reason under the React Compiler. (Correction from the challenge round: no stale "N recipes" frame is painted, because the method filter starts empty and is not persisted and passive effects flush before paint on discrete events. The cost is one extra render, not a wrong label.)
**Impact:** Direct violation of two react.md rules in a file every Starter user hits; a reviewer holding the project to its own contract blocks on it.
**Fix:** Lift `query` into `RecipeTile`; export `visibleRecipes(query, methodFilter)` from `starterOptions.ts` and use it in both `RecipeTile` (count) and `RecipeCombobox` (list). Pass `query`/`onQueryChange` to the combobox; `close()` becomes `onQueryChange(null)` plus the two local resets, read inside the outside-click effect via `useEffectEvent`. Disappears: one state variable, one effect, two `useCallback`s, the `onVisibleCountChange` prop in three places. Move `RecipeCombobox.test.tsx:138-149` to a `StarterInputs`/`StarterPage` test that types and reads the "N recipes" caption. `StarterPage.test.tsx:25, :199` keep passing.

### WR-002: `as unknown as` cast in production code to tolerate jsdom
**File:** `src/features/starter/inputs/RecipeCombobox.tsx:65-70`
**Pass:** 5 (typescript.md: "no `as` casts to silence errors")
**Evidence:** `document.getElementById(...) as unknown as { scrollIntoView?: ... } | null` followed by a `typeof` guard, solely because jsdom lacks `scrollIntoView`. `src/test/setup.ts:9-17` already stubs jsdom layout gaps (`Range`). `RecipeCombobox.test.tsx:106-136` spies on `HTMLElement.prototype.scrollIntoView` and restores it, so a setup stub does not disturb it. Repeat of `starter-and-objects-004` (part c); still open.
**Problem:** A test-environment gap is encoded into the production type and bypasses the checker.
**Impact:** Rule violation; also the only double cast in the app.
**Fix:** Add a guarded `Element.prototype.scrollIntoView` no-op in `src/test/setup.ts` (`typeof Element !== 'undefined'`). Production becomes `document.getElementById(...)?.scrollIntoView({ block: 'nearest' })`. Disappears: the cast, the type literal, the `typeof` guard.

### WR-003: `as () => void` cast silences `no-unsafe-call` in the event hub
**File:** `src/services/pptb/pptbHost.ts:107-113`
**Pass:** 5 (typescript.md: "no `as` casts to silence errors")
**Evidence:** `events.on` is typed to return `unknown`; `typeof result === 'function'` narrows to `Function`, and calling that would trip `@typescript-eslint/no-unsafe-call`, so the cast at :111 exists to silence the lint rule. Repeat of `host-and-shell-004` from the 2026-11-04 review; still open. Under the consequence standard it is INFO (runtime-checked narrowing, no behaviour risk).
**Problem:** The one place the adapter accepts an untyped host return value relies on a cast instead of a typed boundary.
**Impact:** Same ✗ rule as WR-002; a reviewer applying the rules consistently cannot block one and pass the other.
**Fix:** Either type the `on` return as `(() => void) | void` on the local `events` shape (the `@pptb/types` declaration already says `on` returns void, so `unknown` is wider than needed) or call through `Reflect.apply(result, undefined, [])`, which accepts `Function` without a cast. Disappears: the cast.

## PRUNE — Safe Simplification

### PR-001: External-link chain has no production consumer
**File:** `src/app/ExternalLink.tsx:10`; `src/services/pptb/host.types.ts:46`; `src/services/pptb/pptbHost.ts:39-46, 189-194`; `src/services/pptb/fakeHost.ts:51, 66, 114, 175-180`
**Pass:** 4
**Evidence:** Non-test grep for `ExternalLink|openExternal|isHttpUrl` hits only the four defining files. No `<a href>` exists in the UI; Learn URLs appear only as text in generated README/handler comments (AC-3.3, AC-3.10). Commit `3a446bb` (2026-10-30) deliberately removed the last render site. Repeat of `host-and-shell-002` (accepted 2026-11-04); still open.
**What:** Delete `ExternalLink.tsx` and its test, `openExternal` from the `PptbHost` type, the adapter method and `isHttpUrl`, the fake's `openExternal`/`setOpenExternal`, their test cases, and the `'toolboxAPI.utils.openInConnectionBrowser'` entry in the `ALLOWED` list (`pptbHost.test.ts:645-658`) so the equality at :709-711 holds.
**Why safe:** Zero runtime, type or test consumers outside the chain; not in the bundle.
**Measured savings:** ~150 lines (component 30, test 63, adapter ~16, fake ~12, tests ~30)

### PR-002: Single-value `useActiveConnection()` hook unused
**File:** `src/app/useActiveConnection.ts:47-51`
**Pass:** 4
**Evidence:** Only caller is `ConnectionProvider.test.tsx:39`. Production uses `useConnectionState`, `useRefreshConnection`, `connectionKey` from the same module.
**What:** Delete lines 47-51 and the one test.
**Why safe:** Type imports (`Connection`) stay used at :2, :35.
**Measured savings:** 5 lines

### PR-003: Design-exploration SVGs ship in the published package
**File:** `public/variant-a.svg`, `public/variant-b.svg`, `public/variant-c.svg`
**Pass:** 4
**Evidence:** No reference in `src/`, `index.html`, `package.json` or tests. `variant-c.svg` is byte-identical to `public/icons/logo.svg` (md5 `7ffc0375…`). Vite copies `public/` into `dist/`, which `files` publishes.
**What:** Delete the three files.
**Why safe:** Manifest icon is `icons/logo.svg`.
**Measured savings:** 3 files, ~2 KB in the package

### PR-004: `{ field, message }` emitter copied across handler generators
**File:** `src/services/generators/handlers/r2.ts:9`, `r7.ts:95`, `r8.ts:10` (`fieldError`); `r10.ts:32` (`errorObject`); `r4.ts:76`, `r5.ts:69` (`pushError`); `r5.ts:65`, `r7.ts:91` (`q = JSON.stringify`); `snippets.ts:78` (inline)
**Pass:** 5
**Evidence:** Seven local copies emit identical text; `snippets.ts` already owns `FieldError`, `failureReturn`, `validationFailureReturn`.
**What:** Export one `fieldErrorLiteral` (and one `pushError`) from `snippets.ts`; call `JSON.stringify` directly instead of `q`; delete the local copies.
**Why safe:** Golden files pin every generator's output.
**Measured savings:** ~25 lines

### PR-005: `ExportJob` carries three fields the store already determines
**File:** `src/app/inspector-site/inspectorSession.types.ts:43-55`; `inspectorSession.ts:369-376, 391, 400`; `ExportDialog.tsx:30, 57`
**Pass:** 5
**Evidence:** `generation` is written at open and never read in production (grep for `.generation` reads outside tests returns nothing besides `snapshot.generation`). `selectedFileId` always equals `options.fileId` (the doc comment says "mirrors"; `setExportOptions` cannot change `fileId`). `open` is a boolean parallel to `phase`; idle-and-closed cannot occur because an idle job is deleted, not closed.
**What:** Drop `generation`; read `options.fileId` and drop `selectedFileId`; model the job as `idle` (always open) or `building|saving` with an `open` flag.
**Why safe:** No production read of the removed data; one test equality on `generation` to delete.
**Measured savings:** Not measured (3 fields, ~10 lines)

### PR-006: Each generated limit is written twice
**File:** `r2.ts:14-15, 38, 42`; `r3.ts:14, 63`; `r4.ts:24, 52, 125-126`; `r6.ts:27, 52, 92`; `r7.ts:81-85, 195-212`; `r8.ts:6-7, 32, 36`
**Pass:** 6
**Evidence:** Limits such as 100, 254, 500 and 50 appear in the user-facing message and again in the emitted check; `r4.ts` writes its caps three times including the differences prose.
**What:** One constant per limit; build the message from it.
**Why safe:** Golden files catch any drift.
**Measured savings:** Not measured

### PR-007: Constants defined in two layers
**File:** GUID regex `queries.ts:18` / `dataverseFiles.ts:20`; name regex `dataverseRead.ts:20` / `dataverseFiles.ts:19`; page size `queries.ts:4` / `dataverseRead.ts:23` (both 5000); entity names `scan.ts:103-106` beside `queries.ts`; Learn base `recipes.ts:15` vs full URLs `readme.ts:22-25`
**Pass:** 6
**Evidence:** Values are equal and tested today. Learn confirms 5000 is the `odata.maxpagesize` ceiling (page-results doc).
**What:** Export each once from the owning lower layer (`dataverseRead.ts` for page size and name pattern, catalogue for Learn URLs) and import it.
**Why safe:** Same values; types unchanged.
**Measured savings:** ~8 lines

### PR-008: Unused font files and install-only font devDependencies
**File:** `src/assets/fonts/DMSans_500Medium.ttf`, `SpaceGrotesk_400Regular.ttf`, `SpaceGrotesk_500Medium.ttf`; `package.json` devDependencies `@expo-google-fonts/dm-sans`, `@expo-google-fonts/space-grotesk`, `@fontsource/jetbrains-mono`
**Pass:** 4
**Evidence:** `pdfFonts.ts` imports only DM Sans 400/700, Space Grotesk 700, JetBrains Mono 400. No source, test or config references the three TTFs or imports the three packages (grep over `src`, `tests`, `scripts`, configs returns nothing). The Phase 00 plan names them as the one-time copy source; the copy is complete.
**What:** Delete the three TTFs; remove the three devDependencies; keep the OFL notices.
**Why safe:** Not in the bundle; not imported.
**Measured savings:** 229,576 bytes in the repo; 3 devDependencies

### PR-009: Three unused icons
**File:** `src/components/icons.ts` (`arrow-export`, `arrow-right`, `chevron-right`)
**Pass:** 4
**Evidence:** No non-test source or CSS uses the names; `Icon.test.tsx` iterates the map so removal needs no test edit.
**What:** Delete the three entries.
**Why safe:** Bundled via the map only.
**Measured savings:** ~6 lines

## INFO — Minor Observations

- **IN-001:** A scan abandoned on a connection switch (`connection-changed`) never itself triggers a `ConnectionProvider` refresh; recovery depends on the host's `connection:updated` event or a focus/visibility re-read. Downgraded from WARNING: `findings/logic/probe_findings.md` (S2 live probe, 2026-10-22) records three `connection:updated` rows after a connection change, and the challenger reports PPTB Desktop's `toolWindowManager.updateToolConnections` sends that event to the tool webview on every per-tool switch. Residual risk only if `events.on` registration fails (`pptbHost.ts:116-117` logs and continues). The challenger also reports the host preload passes the IPC event as argument 0 and the payload as argument 1, matching what `pptbHost.ts:76-77` reads; the S2 probe left that split unconfirmed, and Probe 1 step 1 closes it. If a payload ever arrives in argument 0, every `connection:*` event is dropped and this becomes CRITICAL. Optional hardening: call `useRefreshConnection().refresh()` once when `scan.status` becomes `connection-changed`, and make `selectSite` a no-op in that state. Live-host probe to close it formally is in Appendix A. (`src/features/inspector/scan/scan.ts:269-280`, `src/app/inspector-site/inspectorSession.ts:280-283`)
- **IN-002:** Shell providers and title bar sit outside every error boundary and `PageErrorBoundary` has no reset action. No throwing render path found today (acorn 8.19 converts stack exhaustion into `SyntaxError`, handled at `structureAst.ts:84-86, 117-119`). Latent only. (`src/app/App.tsx:69-103`)
- **IN-003:** Starter download shows `error.message` for any `Error`; reachable messages are internal invariant strings from `client.ts:137-152` and `buildZip.ts:7-8` or the fixed "Host call failed: saveFile." None carries a token, body, URL or stack. Mirror the export path's fixed copy for non-host errors. (`src/features/starter/download/DownloadStarterButton.tsx:37-39`)
- **IN-004:** Retry delays are fixed 1/2/4 s with no jitter and ignore `Retry-After`; PPTB's documented error shape exposes no headers, so nothing can be done until the host does. Learn: api-limits. (`src/services/pptb/dataverseRead.ts:11, 93-95`)
- **IN-005:** `pageState.ts:47-49` falls back to "choose a site" for a done scan with `result === null`. Unreachable today because the provider derives `result` from the same `status === 'done'` test (`InspectorSessionProvider.tsx:83`). Carrying `result` inside the `done` state would delete the branch.
- **IN-006:** Layering differs from `project-structure.md`: `services/generators/package/buildPackageFiles.ts:1-4` and `readme.ts:4` import Starter types from `app/starter-session`, and every feature imports `app/` session hooks, which the allowed-import list omits. Type-only, no runtime cycle. Move the three Starter types to `src/types/` or amend the rule text.
- **IN-007:** Generated handlers implement the FR-3 missing-site-setting rule as `if (!Server.SiteSetting.Get(name))`; Learn's server-objects page does not say whether a missing setting returns null or throws. R7 reads its five settings before the first `try` (`__golden__/R7.js.txt:94-118`), so a throwing `Get` would escape as an unhandled exception instead of the F57 JSON. Fail-closed either way (no outbound call). Settle in the next live probe: call a handler with one setting deleted. (`src/services/generators/handlers/r7.ts`, `snippets.ts`)
- **IN-008:** Release gate: `npx pptb-validate` fails because `configurations.repository` and `configurations.readmeUrl` return HTTP 404 (repository is private); `website` is unset; `description` names Starter and Server Objects but not Inspector. Not a code defect; blocks `npm publish` per the pptb rule. (`package.json:88-99`)
- **IN-009:** Hygiene: `liquidCheck.ts` is test-only but lives in a production folder (rename `*.testkit.ts`); `tsconfig.app.json:9` includes `node` types in the browser project; tracked root clutter (`CLAUDE2.md`, `fix-7.md`, `new-recipes.md`, `phasse5plan.md`, `spec3check.md`, `AGENTS.md.bak`, `LEAN-CTX.md.bak`); `GrantSet.roleIds` built but read only by tests (`grantSet.ts:12`); `r8.ts:49` highlights a fixed line where other generators search their text.

## Pruning and Simplification Plan

### Safe to Delete

| # | File / Range | Measured lines | Evidence |
|---|---|---:|---|
| 1 | `src/app/ExternalLink.tsx`, `ExternalLink.test.tsx`, `openExternal`/`isHttpUrl` in `pptbHost.ts`, `host.types.ts:46`, fake members, `ALLOWED` entry | ~150 | PR-001: zero consumers; last render site removed deliberately in `3a446bb` |
| 2 | `src/app/useActiveConnection.ts:47-51` + one test | 5 | PR-002 |
| 3 | `public/variant-{a,b,c}.svg` | 3 files | PR-003: unreferenced; c is the logo |
| 4 | `src/assets/fonts/{DMSans_500Medium,SpaceGrotesk_400Regular,SpaceGrotesk_500Medium}.ttf` | 229,576 bytes | PR-008 |
| 5 | `src/components/icons.ts` three entries | ~6 | PR-009 |

### Should Inline

| # | Symbol | Call site | Why clearer |
|---|---|---|---|
| 1 | `q()` in `r5.ts:65`, `r7.ts:91` | each `q(...)` | `JSON.stringify` is the project rule; wrapper adds nothing |
| 2 | `reportVisibleCount` useCallback | `StarterInputs.tsx:224` | disappears with WR-001 |

### Structural Simplifications

| Finding | Current complexity | Simpler end state | What disappears |
|---|---|---|---|
| WR-001 | child computes list, effect lifts count, parent stores it, two useCallbacks | parent owns `query`, both compute from one `visibleRecipes()` | 1 state, 1 effect, 2 useCallbacks, 1 prop ×3 |
| WR-002 | double cast + typeof guard | optional-chain call; jsdom stub in setup | cast, type literal, guard |
| WR-003 | `unknown` return + typeof + cast | typed `on` return or `Reflect.apply` | cast |
| PR-005 | 3 mirrored job fields | job = `idle` \| `building/saving { open }` | `generation`, `selectedFileId`, parallel boolean |
| PR-004 | 7 local emitters | 1 in `snippets.ts` | 6 copies |

### Should Split

| # | File | Responsibility boundary | Why split helps |
|---|---|---|---|
| — | None | All over-threshold files passed the evidence gate | A split would only relocate complexity |

### Dependencies to Remove

| Package | Evidence | Measured impact |
|---|---|---|
| `@expo-google-fonts/dm-sans` | no import; one-time copy source | 1 devDependency |
| `@expo-google-fonts/space-grotesk` | same | 1 devDependency |
| `@fontsource/jetbrains-mono` | same | 1 devDependency |

### Estimated Impact

- **Lines removable:** ~200 (measured items above)
- **Files removable:** 8 (component, test, 3 SVGs, 3 TTFs)
- **Dependencies removable:** 3 devDependencies
- **Bundle reduction:** none (nothing pruned is bundled); package reduction ~2 KB (SVGs)

## Action Items

1. [ ] WR-001: lift `query` into `RecipeTile`, add `visibleRecipes()` to `starterOptions.ts`, delete the effect and both `useCallback`s; move the count test to page level.
2. [ ] WR-002: stub `Element.prototype.scrollIntoView` in `src/test/setup.ts`; replace the cast with optional chaining.
2a. [ ] WR-003: type the `events.on` return or use `Reflect.apply`; remove the cast.
2b. [ ] Owner: record which severity standard (rule or consequence) applies to the `.claude/rules` ✗ items, so the 2026-11-04 and 2026-11-07 reviews stop disagreeing.
3. [ ] PR-001/PR-002: delete the external-link chain and the unused hook, including the `ALLOWED` list entry.
4. [ ] PR-003/PR-008/PR-009: delete variant SVGs, three TTFs, three font devDependencies, three icons.
5. [ ] PR-004/PR-006/PR-007: single emitter and single constants in generators and adapter; goldens verify.
6. [ ] PR-005: trim `ExportJob` to the fields the store reads.
7. [ ] IN-008 before release: public repository/README URLs or updated `configurations`; add `website`; mention Inspector in `description`.
8. [ ] IN-001/IN-007: run the live-host probes in Appendix A at the next PPTB Desktop session.

## Appendix A — Live-host probes (PPTB Desktop, Debug loader, DevTools open)

**Probe 1 — connection switch event (IN-001).** Two connections A and B, each with a Power Pages site; A's site large enough that a scan takes several seconds. `npm run build` (default mode includes Inspector), load via the Debug loader.
1. In the tool webview console: `toolboxAPI.events.on((_, p) => console.log('[probe]', p.event, JSON.stringify(p.data), p.timestamp))`
2. Open Logic Inspector on A; confirm title bar shows A and the site list loads.
3. Idle switch: switch the tool to B from the tool tab's connection selector, keeping focus inside the tool. Expect `[probe] connection:updated {"id":"<B id>"}` and the title bar/site list to show B with no "connection changed" panel. No `[probe]` line means IN-001 returns to WARNING.
4. Mid-scan switch: back on A, pick the large site, and while "Scanned X of N" shows, switch to B. Expect the same event and B's "choose a site" state; the "connection changed while scanning" panel should not appear because `adopt` aborts first. If it does appear, wait 5 s: it must leave on its own; if picking a site loops back to the panel, WARNING.
5. Switch without focus: repeat step 4 triggered from the main PPTB window so the webview does not regain focus.
6. Degraded path (optional): break on `events.on(hub)` in `pptbHost.ts`, force it to throw, repeat step 4 without clicking back in. Expected today: stays on the panel until focus/visibility. Confirms the residual risk is limited to this path.
7. Record `[probe]` lines, any `console.error` (expect none in 3–5), and screenshots of the title bar and page state.

**Probe 2 — missing site setting (IN-007).** On a dev site, deploy generated R3 and R7 handlers, delete one required `ServerLogic`-recipe site setting, call each endpoint. Record whether the response is the F57 "missing site setting" JSON (Get returns null) or a 500 / generic failure (Get throws). If it throws, wrap the F57 reads in `snippets.ts` with a try that maps to the same return.

## Appendix B — Microsoft Learn and host-doc lookups used

| Query | URL | Fact applied |
|---|---|---|
| Page results, `odata.maxpagesize`, `$top`, nextLink | https://learn.microsoft.com/power-apps/developer/data-platform/webapi/query/page-results | `$top` ignored when maxpagesize is sent; 5000 ceiling; same size every page; never modify the next link. Adapter matches (PR-007 duplicate constant). |
| File columns: `InitializeFileBlocksDownload`, `DownloadBlock` | https://learn.microsoft.com/power-apps/developer/data-platform/file-column-data | Block ≤ 4 MiB; `BlockLength` = file size when chunking unsupported; adapter validates both. |
| Service protection 429 / `Retry-After` | https://learn.microsoft.com/power-apps/developer/data-platform/api-limits | IN-004. |
| `powerpagecomponent` types | https://learn.microsoft.com/power-apps/developer/data-platform/reference/entities/powerpagecomponent | Types 9/11/18/35 and lookup/file columns match `queries.ts`. |
| Server logic overview | https://learn.microsoft.com/power-pages/configure/server-logic-overview | Four `ServerLogic/*` settings and defaults; timeout max 240 matches `settings.ts:118`. |
| Server objects (`SiteSetting.Get`) | https://learn.microsoft.com/power-pages/configure/server-objects | Missing-setting behaviour undocumented (IN-007); Key Vault via env vars matches R7 README. |
| Power Pages security best practices | https://learn.microsoft.com/power-pages/security/security-best-practices | Generated handlers follow: untrusted data escaped, no secrets in browser. |
| PPTB events API | https://docs.powerplatformtoolbox.com/tool-development/api-reference/events | Only `connection:created/updated/deleted` documented; no explicit "active switched" event (IN-001). |
| PPTB error handling | https://docs.powerplatformtoolbox.com/tool-development/api-reference/error-handling | Errors carry message/status/statusText, no headers (IN-004). |

Lane reports: `.omc/review-lane-1-2.md`, `.omc/review-lane-3-4.md`, `.omc/review-lane-5-7.md`; challenge round: `.omc/review-opus-challenge.md`.
