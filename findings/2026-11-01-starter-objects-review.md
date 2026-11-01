# Logic Starter and Server Objects — review

**Date:** 2026-11-01  
**Result:** Seven confirmed issues prevent full agreement with the current spec. The existing automated suite passes; the additional review probes and rendered-browser checks expose the gaps below.

## Scope and environment

- Reviewed the current working tree on `starter-objexts-prep`, based on commit `6c0bdd5`.
- Acceptance baseline: [spec v4.0.1](../docs/specs/001-server-logic-starter-inspector/spec.md), Stories 1–6, the applicable functional requirements, and the supported 1024×700 minimum viewport. Layout 10a and the approved Graphite theme apply.
- Release artifact: `npm run build:beta`, which includes Logic Starter and Server Objects.
- PPTB Insider **1.2.8.0** is running locally. Its tool webview was not agent-accessible. Host integration was exercised through the real **`@shko.online/pptb-mock` 1.0.12** package, installed in an isolated temporary directory.
- Project versions: **`@pptb/types` 1.2.7**, React **19.3.1**, Vite **8.3.5**, Vitest **5.0.5**; npm with `package-lock.json`.
- The v1.0.0 exception explicitly defers the full AC-4.12 behavior matrix. That missing matrix is not counted as a release defect in this review.

## Confirmed findings

### 1. [Medium] Recipe switching leaves obsolete table permissions on screen

**Location:** `src/features/server-objects/ContextColumn.tsx:87–94`  
**Requirements:** AC-3.6, AC-6.9.

**Reproduction:** Select **Dataverse CRUD**, then **Call a Dataverse custom API**, and open Server Objects.

**Observed:** Permissions needed contains both:

- `contact · Read, Write, Delete` — Account access;
- `account · Read, Write` — Account access.

Only the account grant belongs to the current R10 recipe. The stale contact grant gives the maker incorrect configuration guidance.

**Cause:** R4 deliberately has two grants for the same logical table. Both rows use `key={table.logicalName}`, so React cannot reconcile their identities correctly. The R4→R10 transition retains the first contact row. This was reproduced in both React Testing Library and the production beta bundle.

**Correction:** Give each grant a unique, stable identity that distinguishes the Account and Global grants, and verify transitions between recipes that share a table name.

**Evidence:** [Rendered stale permissions](../.rm-frontend-review/starter-objects-20261101/objects-stale-permissions.png); review probe `AC-3.6/6.9: R4 to R10 replaces the complete table-permission list`.

### 2. [Medium] Server Objects clips its context content at supported sizes

**Location:** `src/features/server-objects/serverObjects.css:300–315`; inherited clipping in `src/components/primitives.css:8–16`  
**Requirements:** AC-3.6, AC-6.9, Accessibility minimum viewport.

**Reproduction:** Select **Microsoft Graph & SharePoint**, then open Server Objects at **1100×780** or **1024×700**.

**Observed:** The Back to Create Logic button is clipped, the permissions/settings content is cut off, and Another sample is reduced to its heading. Mouse-wheel scrolling over the context column does not reveal the content.

At 1100×780, the Used in card has 339px of content inside a 289px client height; Permissions needed has 431px inside 366px. Both have `overflow: hidden`. At 1024×700 their client heights shrink to 254px and 321px. Another sample has only 28px of client height.

**Cause:** The fixed-height page places shrinking flex cards in a context column without a usable vertical overflow path.

**Correction:** Make the context column scrollable with non-collapsing cards, or provide an explicit scroll area inside each card. Keep the back action and all recipe guidance reachable.

**Evidence:** [1100×780](../.rm-frontend-review/starter-objects-20261101/objects-r7-dark-1100.png), [1024×700](../.rm-frontend-review/starter-objects-20261101/objects-r7-dark-1024.png).

### 3. [Medium] Expanding R7's checklist collapses both code panes

**Location:** `src/features/starter/starter.css:4–16`; `src/features/starter/code/codePanes.css:56–61`  
**Requirements:** Story 4's editable side-by-side panes, FR-11 layout, Accessibility minimum viewport.

**Reproduction:** At **1024×700**, select **Microsoft Graph & SharePoint** and expand **View checklist**.

**Observed:** Both code panes disappear. `.starter-code__panes` measures **0px high**, while the document remains 700px high, so page scrolling cannot recover the editors. Closing the checklist restores them.

**Cause:** The fixed-height grid's `auto` permission row consumes the remaining space, and `minmax(0, 1fr)` permits the code row to collapse.

**Correction:** Bound and scroll the expanded checklist, or preserve a usable minimum editor height and allow the page to scroll when needed.

**Evidence:** [Expanded checklist at the supported minimum](../.rm-frontend-review/starter-objects-20261101/starter-r7-checklist-1024.png).

### 4. [Medium] Searching for a member prevents selecting another member

**Location:** `src/features/server-objects/ServerObjectsPage.tsx:32–42`; `src/features/server-objects/objectList.ts:46–59`  
**Requirements:** AC-6.4a, AC-6.6.

**Reproduction:** Search for **GetAsync**, then click **PostAsync** in the member pills or table.

**Observed:** GetAsync remains selected and the signature/sample remains `GetAsync(url, headers)`. The PostAsync radio remains `aria-checked="false"` after the click.

**Cause:** `reselect()` runs on every render. A deliberate selection that does not match the still-active query is immediately replaced with the matching member. Search-driven selection is being reapplied to manual member changes.

**Correction:** Apply the search-selection rule when the query/filter changes, and repair selection when the object leaves the list, while allowing subsequent explicit member selections.

**Evidence:** [Production-bundle reproduction](../.rm-frontend-review/starter-objects-20261101/objects-search-selection.png); review probe `AC-6.6: selecting a different member after searching remains selected`.

### 5. [Medium] Generated demo pages do not validate response envelopes consistently

**Location:** `src/services/generators/handlers/demoPages.ts:60–76` and `:679–695`  
**Requirements:** AC-3.9, FR-3 client contract, Learn correction 8.

**Reproduction:** Execute the actual generated R4/R5 response handler or R6 `showEnvelope` with:

```js
{ data: '{"status":"success","data":[],"message":"accepted"}' }
```

**Observed:** All three accept this as success despite the missing envelope `success: true`. R4/R5 invoke their application-success callback; R6 renders a successful result.

A second fixture, `{ success: true, data: 'null' }`, makes the generated helpers dereference `payload.status` after JSON parsing has succeeded. R4/R5 throw from their response callback rather than reporting a readable error. R6 also throws inside `showEnvelope`, although its outer fetch chain has a catch.

**Cause:** The demo generators check only `success === false`, and do not guard the decoded payload before reading it. The corrected envelope handling in the standalone fetch/jQuery client generator was not applied to the demo pages.

**Correction:** Require a valid envelope with `success === true` before consuming `data`, and validate the decoded payload before reading `status`. Keep the existing explicit failure-envelope path.

**Evidence:** Six failing generated-demo probes, with three passing valid-success controls. These execute the generated functions under `node:vm`; they do not execute a live Power Pages request.

### 6. [Medium] Keyboard recipe navigation moves the active option out of view

**Location:** `src/features/starter/inputs/RecipeCombobox.tsx:48–55`; popup height in `src/features/starter/starter.css:143–150`  
**Requirements:** AC-3.1 and the APG combobox requirement under Accessibility.

**Reproduction:** Open the recipe picker on R1 and press ArrowDown nine times.

**Observed:** R10 becomes the active descendant and Enter selects it, but the list never scrolls. At 1100×780, the active option occupies y=582.7–625.6 while the popup ends at y=455.2; `scrollTop` stays 0. A sighted keyboard user cannot see the option they are about to select.

**Correction:** Scroll the active option into the listbox's visible area when keyboard navigation changes it. Browsers do not perform this automatically for `aria-activedescendant`, as the [WAI APG example explains](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/#accessibilityfeatures).

**Evidence:** [Off-screen active recipe](../.rm-frontend-review/starter-objects-20261101/recipe-keyboard-offscreen.png) and measured element bounds.

### 7. [Medium] Host-event cleanup does not remove PPTB 1.2.7's registered listener

**Location:** `src/services/pptb/pptbHost.ts:84–99`  
**Requirement:** FR-12, remove the host event subscription on unload.

**Trigger:** Subscribe, unsubscribe, and resubscribe through the same adapter; or deliver an event after its `pagehide` cleanup.

**Observed with the version-pinned host behavior:** A single event reaches the new subscriber **twice** after resubscription. An event delivered after `pagehide` still reaches the application callback.

**Cause:** [Desktop 1.2.7's preload](https://github.com/PowerPlatformToolBox/desktop-app/blob/v1.2.7/src/main/toolPreloadBridge.ts#L414-L422) registers a wrapper and returns its disposer. `off(originalCallback)` cannot remove that wrapper. The adapter ignores the disposer and calls `off(hub)`. Installed types 1.2.7 declare `on` as returning `void`; the default mock does not model the wrapper, so existing call-count tests miss the mismatch.

**Correction:** Retain and invoke the returned disposer, narrowing an `unknown` return value to a function where necessary. Verify delivery after cleanup, rather than only verifying that `off` was called.

**Evidence:** Two failing lifecycle probes using actual PPTB-Mock objects configured to mirror the pinned preload. This confirms the supported 1.2.7 contract defect; live Insider 1.2.8 behavior remains to be observed.

## Release-check results

| Check | Observed result |
|---|---|
| `npm test` | **91 files / 1,386 tests passed**. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm run build:beta` | Passed; single IIFE and CSS emitted. Vite reports its 500kB chunk-size advisory. |
| Focused review probes | **10 failed / 6 passed**, reproducing findings 1, 4, 5 and 7. The passing controls cover valid demo responses and real-mock copy/download/cancel/fallback behavior. |
| `npm pack --dry-run --json` | Eight files; built JS/CSS, `dist/index.html`, branded logo, manifest, README and LICENSE are included. |
| Release-bundle mock check | No `pptb-mock`, `PptbReviewMock` or `__review` bootstrap markers in the release JS. Review fixtures are outside the application entry. |
| Installed `pptb-validate --help` | **Exit 1**: repository and readme URLs are inaccessible. Version 1.0.5 treats this as a validation run. |
| Validator API with `{ skipUrlChecks: true }` | Manifest shape passes; optional website warning only. This does not satisfy the online release gate. |
| `npm audit --json` | **Exit 1**, two moderate entries from the same minimatch advisory through the development dependency `eslint-plugin-jsx-a11y`. The clean-audit requirement for a verified listing remains open. |

The installed validator CLI (`node_modules/@pptb/validate/dist/cli.js:54`) hardcodes `skipUrlChecks: false` and does not parse CLI flags. `--skip-url-checks` therefore cannot be treated as an offline pass. The URL failure is already recorded in the spec's Implementation Status and was reconfirmed here.

### Rendered and application behavior that passed

The beta bundle was served through an explicit local review harness that installs PPTB-Mock before the production entry runs. Browser evidence covers light at 1100×780, and dark at 1100×780 and 1024×700.

- No-connection startup, navigation and the disabled Inspector tab.
- Editing, copying the complete server text and generating a ZIP whose server file matches that text plus its final newline.
- Inserting an HttpClient sample at a statement boundary adds `async`; one undo restores the prior handler.
- The same insertion changes readiness from 3/3 to 2/3; undo restores the reviewed text and 3/3.
- An HTTP-only context edit resets Liquid to fetch and emits the specified notice.
- Cancel keeps edited code and the current recipe; Discard changes the recipe and method.
- R8 disables all five HTTP methods and emits both Liquid invocation snippets.
- Start over restores the default recipe, GET and fetch.
- Save cancellation emits no success notification; rejected saving plus rejected host notification produces the in-tool persistent error.
- Eight R7-context searches took **6.9–12.8ms** from input to the next animation frame in the browser fixture, below the 100ms target for those samples.
- The catalogue was cross-checked with [Microsoft Learn's Server objects reference](https://learn.microsoft.com/en-us/power-pages/configure/server-objects), including overloads, invocation contexts and the asynchronous connector methods.

The only incidental browser resource error observed was the local harness's missing `favicon.ico`.

## Reproduction artifacts

- [Review probes](../.rm-frontend-review/starter-objects-20261101/review.test.mjs)
- [Machine-readable probe results](../.rm-frontend-review/starter-objects-20261101/review-results.json)
- [Mock/bootstrap and browser harness](../.rm-frontend-review/starter-objects-20261101/)

These artifacts live in the repository's existing ignored `.rm-frontend-review` area. To rerun the focused probes from the repository root in PowerShell:

```powershell
& '.\node_modules\.bin\vitest.cmd' run --config '.rm-frontend-review/starter-objects-20261101/review.vitest.config.mts'
```

The configuration uses PPTB-Mock installed under `%LOCALAPPDATA%\Temp\opencode\server-logic-review-20261101`.

## Remaining Desktop verification

1. Run `npm run build:beta`. In PPTB, close the existing tool tab and use **Debug → Load Local Tool** to load `C:\Users\RyanDev\source\repos\Server Logic`.
2. Open the **tool's** DevTools. With no connection selected, confirm both released pages open, Copy updates the real clipboard, and Download starter saves the complete ZIP. Cancel a second save: no file and no success toast should appear. Measure the successful save from dialog confirmation to notification against the **2-second** AC-5.11 target.
3. Repeat the listed UI reproductions at the actual tool-webview sizes, particularly R4→R10 and R7's long guidance. Their expected behavior is stated with each finding.
4. Check the event disposer/cleanup behavior on the installed Insider version. The lifecycle evidence above is tied to supported Desktop 1.2.7 source and a matching fixture.

Native dialogs, clipboard/IPC, live Power Pages execution, the complete deferred AC-4.12 matrix, and the three-maker five-minute usability goal were not established by the local passes. The 300ms pane-update target was not separately timed.
