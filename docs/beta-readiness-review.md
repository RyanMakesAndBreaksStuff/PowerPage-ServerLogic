# Beta Readiness Review: Logic Starter and Server Objects

**Date:** 2026-10-27
**Branch:** `starter-objexts-prep` @ `ce7cc95`, with a dirty working tree
**Spec:** `docs/specs/001-server-logic-starter-inspector/spec.md` v3.0.0
**Input:** `docs/spec-build-ccompare.md`, the completeness check this review verifies
**Scope:** an early beta with Logic Starter and Server Objects only. Logic Inspector comes in a later release.

## Verdict: NOT READY

Seven items block publishing. Four of them are small:

- the release config (B1, B2);
- shipped text (B4, B7).

The client envelope fix (B3) is moderate. The two large items, the Iris theme (D1) and the behaviour harness (D2), need an owner decision. FR-12 says each release must "meet every AC of its released pages", so the spec doesn't allow either one to be skipped quietly. The fastest route to a beta is a spec PATCH that defers both, plus the targeted fixes below.

---

## 1. Verification run (fresh, 2026-10-27)

| Check | Result |
|---|---|
| `npx tsc -b` | ✅ Clean |
| `npx eslint . --max-warnings=0` | ✅ Clean |
| `npx prettier --check .` | ❌ **351 files** fail (repo-wide; a known open item) |
| `npx vitest run` | ✅ 89 files, 1,348/1,348 pass in an isolated run. One timing test (`browserChecks.test.ts:236`, 5 s timeout) **failed** in a run made while other test runs and agents were loading the machine. It is flaky under load. |
| `VITE_RELEASED_PAGES=starter,objects vite build` | ✅ One IIFE bundle (925 kB JS, 105 kB CSS) and a clean `index.html` (no `type="module"`, script at the end of `<body>`). Inspector code is excluded: there are 0 `jsPDF` and 0 `not implemented` strings in the bundle. |
| `npx pptb-validate` | ❌ **Exit 1**: `configurations.repository URL is not accessible` and `configurations.readmeUrl is not accessible` |
| `npm audit` (all deps and `--omit=dev`) | ✅ 0 vulnerabilities |
| Live PPTB smoke, timed maker walkthrough, contrast check | Not run; these are owner gates ◆ |

---

## 2. Release blockers (fix before publishing)

| # | Item | Evidence | Fix | Size |
|---|---|---|---|---|
| **B1** | **The validator fails because the GitHub repo is private.** | `gh repo view` reports `PRIVATE`. `readmeUrl` points at `main/README.md`, and `origin/main` has no README. `@pptb/validate` 1.0.5 hard-codes `skipUrlChecks: false` (`node_modules/@pptb/validate/dist/cli.js:54`), so `--skip-url-checks` is **silently ignored**. | Make the repo public, or point `configurations` at a public repo. Merge the work, or at least `README.md`, to `main` before publishing. Update `.claude/rules/pptb-host-and-output.md` (the flag rule is stale for this validator). | S |
| **B2** | **A plain `npm run build` ships the Inspector placeholder tab.** | `vite.config.ts:21` defaults to all three pages. No script, `.env` or CI file sets `VITE_RELEASED_PAGES`; it appears only as manual steps in the plan files. `App.tsx:14` imports `InspectorPage` unconditionally, gated by a build constant. `tests/buildShape.test.ts:95-101` asserts that the default build includes the placeholder. | Add a `build:beta` script (`VITE_RELEASED_PAGES=starter,objects`), and make `finalize-package` and the release use it. Alternatively, make the default fail while `scan.ts` or `renderPdf.ts` is a stub. Update `buildShape.test.ts` to match. | S |
| **B3** | **The generated client crashes or misreports on null or malformed envelopes (AC-4.5, AC-4.6).** This is code users paste into their sites. | `client.ts:192-209`. The handler only checks `success === false` (`:193`). A `null` envelope or `data: "null"` throws: fetch reports the wrong message, "failed before a response envelope could be read", and the jQuery success callback throws `TypeError` without reaching `showError`. An envelope missing `success` is **accepted**. A `node:vm` probe reproduced all three paths (ccompare §5). No test covers this. | Generate a shape guard that requires `envelope` to be an object, `success === true`, and `parsed` to be a non-null object. Route every failure to `showError`. Add the fixtures from the ccompare §5 table as `node:vm` tests now, even if the full Phase 17 harness waits. Regenerate the golden files. | M |
| **B4** | **The R7 README makes a false guarantee and contradicts itself.** | `r7.ts:53-55` (`R7_DIFFERENCES`) says "a bad value cannot orphan a ticket". `readmeNotes.ts:13` says an invalid choice orphans the ticket. Both reach the shipped README (`readme.ts:198`). `event` is only integer-checked (`r7.ts:209`), and the date regex accepts `2026-02-31`. | Reword `R7_DIFFERENCES`: inputs that fail local validation stop before any call, but a later Dataverse rejection can leave an uploaded ticket. Regenerate the golden files. | S |
| **B5** | **The Prettier gate fails on 351 files.** CI rules require `format:check` to pass. | Verification run above | Run one `prettier --write .` commit, or scope the gate (owner choice already pending in the remaining-work plan). | S |
| **B6** | **The release depends on a dirty tree and unpushed branches.** | Uncommitted `M .claude/settings.json`, `D sol-review.md`, `M tasks/*`, plus untracked files. `origin/main` doesn't contain the app. | Commit or stash, merge to `main`, and tag from a clean commit. Run `npm run finalize-package`: `files` lists `npm-shrinkwrap.json`, which doesn't exist yet. | S |
| **B7** | **Shipped copy advertises Inspector.** | `README.md:7` and `README.md:9`, and the `package.json` `description` ("…and review a site's existing server logic…"). These appear in the PPTB listing and the in-tool README. | Write beta-only copy with a "Logic Inspector: coming soon" line. The README is also only 24 lines and has no usage section for makers; add a short how-to. | S |

Owner gates ◆ that are still required by spec FR-12 and the status brief:

- a PPTB Desktop smoke test of the built `dist/`;
- the three-maker walkthrough (median ≤ 5 min);
- Server Objects rendered at 1100×780;
- explicit publish confirmation.

---

## 3. Owner decisions needed (spec PATCH or build)

| # | Item | Status | Options |
|---|---|---|---|
| **D1** | **FR-11 Iris theme (Phase 25)** | ❌ Not started (0/17). Confirmed: aurora gradients (`tokens.css:52-55`), glass with `backdrop-filter` (`primitives.css:17-18, 383-388`), 0 Iris token names, 119 old-name references, light code wells (`--code: #f7f7f5`), 11 hard-coded 600/700 weights. `tokens.test.ts:33-61, 88-94, 126-128` lock in the old design. This drives the colour failures in AC-1.5, AC-1.6, AC-2.5, AC-4.2, AC-5.1, AC-5.4 and AC-6.2. | **(a)** Build Phase 25: about 6 CSS files, around 120 renames, a rewrite of `tokens.test.ts`, and the CodeMirror theme. Medium effort. **(b)** A spec PATCH that lets the beta ship on the current palette with Iris as a fast follow. This is the quickest route; the current theme is coherent and passes its own tests. |
| **D2** | **AC-4.12 behaviour harness (Phase 17)** | ❌ Not built (0/18). The only `node:vm` use is the syntax check in `tests/buildShape.test.ts`. Phase 19's R7 behaviour cases wait on it. | **(a)** Build the full harness (large). **(b)** A spec PATCH: the beta ships with targeted `node:vm` tests for the client envelope (B3) and R7, and the full 36-configuration matrix follows. Recommended for speed. |
| **D3** | **AC-6.2 `used` pill colour** | The spec says purple; the Iris table maps server objects to teal `--accent2`. The code is olive or lavender (`tokens.css:36, 73`) and matches neither. | Pick one in the spec. If D1(b), leave the code alone for beta. |
| **D4** | **Generated client logs response data** | `client.ts:189-190` emits `console.log(parsed.<key>)`. R1 logs contacts with names and emails (golden `fetch-r1-get.js.txt:24`). The FR-3 rule ("Generated code may log only…") and the security NFR ("never logs bodies…") read as covering client code, but the list is written for `Server.Logger`. | State whether the client is in scope. If it is, change the client to log a fixed "done" message. |
| **D5** | **Site pill shows as a dead control** | `SitePill.tsx:4-11` is always disabled and shows "No site selected" on every page (`TitleBar.tsx:20`). This is per spec (AC-1.7), but beta users will see it. | Keep it per spec, or amend AC-1.7 to hide it while Inspector is unreleased. |
| **D6** | **External links** | FR-1 requires Learn and GitHub links through `openInConnectionBrowser`, but no UI link exists. `ExternalLink.tsx` has no consumer. | Trim the FR-1 wording for beta, or add one Learn link (for example, in object detail). |

---

## 4. Should fix (small, spec-conformance)

Each item is small and independent. They can be done in one pass after the blockers.

| Item | Evidence | Fix |
|---|---|---|
| AC-3.6: the "Permissions needed" tile lacks outbound domains and site settings | `ContextColumn.tsx:57-79`. The data exists in `RecipeMeta.outboundDomains` and `siteSettings` (`types/recipe.ts:25-26`). | Render both lists in the tile. |
| AC-4.7: switching recipe resets Liquid to fetch silently | `starterReducer.ts:64-70`. The toast is only in `withText` (`:40-49`). `starterReducer.test.ts:49-56` asserts the silent reset. The AC wording covers any way the pill becomes disabled. | Add the toast to `selectRecipe` and flip the test, or PATCH the AC. |
| AC-6.5: `User.fullname` shows "Returns: null when the caller is anonymous" | `serverObjects.ts:195`, rendered by `ObjectDetail.tsx:85`. The AC requires the type or "Not documented on Learn". | Set `returns: null` and move the note into the description (the object-level note at `:189` is already correct). |
| FR-3 R4: README lacks the Account-scope readability note | `spec.md:424`. The note is only in `recipes.ts:146` and reaches the checklist only. `readmeNotes.ts:6` and `r4.ts:47` don't have it. | Add it to the R4 README notes and regenerate the golden file. |
| R7: missing `webUrl` still creates the row and reports success | `r7.ts:268, 288-294, 304` | Fail before `CreateRecord` when `webUrl` is unreadable, or document the behaviour. |
| FR-1 logging: logs the HTTP status | `hostErrors.ts:30` against `spec.md:378` ("by error name only"). The file's own comment at `:27` says the same. | Drop the status, or PATCH FR-1. |
| FR-12: no unload handler | `pptbHost.ts:83-103` registers lazily and removes the handler on the last unsubscribe. `spec.md:834` requires "remove the handler on unload". The test title at `App.test.tsx:71` overstates what it covers. | Add a `pagehide` cleanup, or PATCH the spec, and rename the test. |
| AC-5.3: the validation tooltip is on a separate info button | `StarterInputs.tsx:129-145` | Move it onto the pill, or PATCH the AC. |
| A11y: no live result count on Server Objects search | `ServerObjectsPage.tsx:110`. The only `role="status"` mounts only when the results are empty. | Add an always-mounted, visually hidden `aria-live="polite"` count. |
| A11y: `aria-label` on `<pre>` | `ObjectDetail.tsx:28` (ARIA 1.2 prohibits names on generic elements) | Wrap it in `<figure>` or a labelled region. |
| A11y: the `used` pill's accessible name has no context | `ServerObjectsPage.tsx:94` | Add visually hidden text, for example "used by current handler". |
| No `LICENSE` file | `package.json` declares MIT | Add `LICENSE`. |
| Flaky timing test | `browserChecks.test.ts:236`: the default 5 s timeout fails under load, even though the assertion is CPU-timed | Give the test an explicit timeout. |
| Back / Clear search are buttons where the spec says "link" | `ContextColumn.tsx:48-55`, `ServerObjectsPage.tsx:115-121` | PATCH the spec wording; buttons are semantically correct for in-app actions. |

---

## 5. Not needed for beta (defer)

- **Bookkeeping:** tick Phases 13 and 22, which are built but have 0 steps ticked, and refresh the stale `plan.md` "Next step".
- **Layering:** 11 feature files import `@/app/`, and there are 2 type-only `services → app` inversions (`buildPackageFiles.ts:4`, `readme.ts:4`). Amend the rule or move the types.
- **Performance tests:** add timing for the 300 ms pane, 100 ms search and 2 s download NFRs. Search is synchronous over 9 objects, so the risk is low. `ServerObjectsPage.test.tsx:52` claims NFR coverage it doesn't measure.
- **R5 session parse** ("documented parse" against regex): no failing input has been identified.
- **FR-11 versus Phase 21:** FR-11 wants `Server.*` identifiers coloured; Phase 21 scoped that out (`codeTheme.ts:6-10`). Resolve this with D1.
- **Code and test hygiene:** the 925 kB bundle-size warning (expected; a single IIFE is required), and the jsdom-per-file test cost.

---

## 6. Corrections to `spec-build-ccompare.md`

| ccompare item | Correction |
|---|---|
| §3.6: add `--skip-url-checks` | **Wrong fix.** `@pptb/validate` 1.0.5 ignores all arguments. URL checks always run, and they fail now because the repo is private (B1). |
| §3.3: "the release gate does set the variable" | **Wrong.** Nothing sets `VITE_RELEASED_PAGES`; only manual plan steps mention it (B2). |
| §3.5: "about 10 feature files" | **11** production files, or 13 counting test harnesses. |
| FR-11: "about 89 old-name references" | **119** across `src`. The hard-coded weights are 11 declarations. |
| AC-5.1: `validation` typed `true` at `deriveStarter.ts:10-13` | The literal is at `deriveStarter.ts:29`; the type is at `starterSession.types.ts:37`. |
| `User.fullname` ("catalogue clarification, not a runtime bug") | It is user-visible: `ObjectDetail.tsx:85` renders the note as the return type, which violates AC-6.5. |
| §3.2 client logging | It also touches the security NFR ("never logs bodies"), and R1 logs PII (names and emails). |
| R6 "Learn logs err.message" | The verifiers disagree. ccompare §5 says the current Learn tutorial doesn't log `err.message`; the spec's FR-3 text says it does. Recheck the Learn page before rewording `r6.ts:43-46`. |
| New issues not in ccompare | B1 (private repo, validator), B5 (Prettier gate), B6 (tree and branch state), B7 (copy advertises Inspector), the missing LICENSE, the flaky timing test, R7 `webUrl` null, the date regex accepting impossible dates, the a11y gaps in §4. |

Everything else in ccompare §2 was **confirmed** by file:line re-reads.

---

## 7. Fastest path to beta

1. **Owner:** approve a spec PATCH for D1(b) and D2(b), and decide D3 to D6.
2. **Release config:** fix B2 (`build:beta`), B7 (copy and README), and add the LICENSE.
3. **Client envelope:** fix B3, with targeted `node:vm` tests and regenerated golden files.
4. **Shipped text:** fix B4 (R7 README), the R4 note, `User.fullname`, and the AC-3.6 tile.
5. **Formatting:** run the B5 Prettier commit.
6. **Repository:** handle B6 and B1. Clean the tree, merge to `main`, make the repo public, then confirm `npx pptb-validate` passes.
7. **Owner:** run the gates ◆ (PPTB smoke, walkthrough), then publish with explicit confirmation.


 ## Owner Decisions and Comments

 B1 - Ignore, will manually validate
 B2 - ignore finalize-package update portion
 B5 - Unless im missing something drop prettier compeltely
 b6 - No action merge into maim will be final action  before publish to npm.
 B7 - Defer - There will be a doc/usage pass before releeaase
 D1 - b for now - will need to look into why iris needs all new tokens
 D2 - b
 d4 - igore fr-4 ok to log to console
 d5 - amend until inspectyor
 d6 - as is -- here is a sample fromn other toll that is published --   <span style={{ fontSize: 11, color: T.fg3, fontFamily: T.font }}>
    <a href="https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/set-field-values-using-parameters-passed-form" target="_blank" rel="noreferrer" onClick={openDocsLink} style={{ color: T.accent }}>Set column values</a>
    {' · '}
    <a href="https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/configure-form-accept-custom-querystring-parameters" target="_blank" rel="noreferrer" onClick={openDocsLink} style={{ color: T.accent }}>Custom query-string params</a>
  </span>
  Ignore F1-Logging for '`hostErrors.ts:30` against `spec.md:378` ("by error name only"). The file's own comment at `:27` says the same."
  
  BSD-3 license

  patch spec for back/clear buttons 

#### -- B2, B4, B7 ALREADY IMEPLEMENTED

*** If not mentioned in my comments the item was fine as written
