# Phase 08: Handlers R4, R5, R6 + demo pages

**Implements:** FR-3 rows R4 (Dataverse CRUD), R5 (External service CRUD) and R6 (Call an Azure Function): their contract rows, example requests and the shared Musts; the tutorial demo pages (`generateDemoPage`) | **Satisfies:** AC-3.3, AC-3.4, AC-3.7, AC-3.9, AC-3.10 (header comment half), AC-3.2 (T1 for these three recipes), Learn corrections 17 and 18, and the touchpoints of corrections 11, 12, 14, 19 and 20 | AC-4.12 is only prepared here (behavior is Phase 17).
**Depends on:** 02 (`runBrowserChecks`), 05 (`getRecipe`, snippets). Phase 03's `exportedFunctionNames` and `detectConnectorUse` are also used in tests; Part A is merged before Part B, so this adds no edge.
**Files:**
- Replace the stubs: `src/services/generators/handlers/r4.ts`, `r5.ts`, `r6.ts`, `demoPages.ts`.
- Create tests: `r4.test.ts`, `r4.options.test.ts`, `r5.test.ts`, `r6.test.ts`, `demoPages.test.ts`, `tutorials.integration.test.ts`, plus the test helper `tutorial.testkit.ts` (not a test file), all in `src/services/generators/handlers/`.
- Create golden files in `src/services/generators/handlers/__golden__/`: `R4.js.txt`, `R5.js.txt`, `R6.js.txt`, `R4.page.html.txt`, `R5.page.html.txt`, `R6.page.html.txt`.
- Edits no other file: not `index.ts`, other `r*.ts`, `snippets.ts`, `recipes.ts`, `package.json`.

**Interfaces:**
- **Consumes:** `getRecipe` (`@/services/catalogue/recipes`); from `snippets.ts`: `headerComment`, `TO_RESULT`, `IS_GUID`, `requireSettingsCode`, `failureReturn`, `validationFailureReturn`, `validationFailureReturnFor`, `logLine`, `VALIDATION_MESSAGE`; types `GeneratedHandler`, `RecipeId`; test-only `runBrowserChecks` (Phase 02), `exportedFunctionNames` and `detectConnectorUse` (Phase 03), `normalizeLf` (Phase 05).
- **Produces:** `generateR4()`, `generateR5()`, `generateR6()` (each `(): GeneratedHandler`, the shape `index.ts` already calls); `generateDemoPage(id: RecipeId, slug: string): string | null`; and per recipe a `R4_DIFFERENCES`, `R5_DIFFERENCES`, `R6_DIFFERENCES` constant (`readonly { change: string; reason: string }[]`) exported from its own file for Phase 14's "Differences from Learn" README section (AC-3.7). `index.ts` does not re-export them; Phase 14 imports them from `./r4` etc.

This phase turns three stubs into the Learn-tutorial handlers and the three Learn demo pages. Each handler is derived from Learn's tutorial code and differs only by the fixes in correction 17 and the FR-3 Musts. Each demo page is Learn's page with the endpoint swapped to `/_api/serverlogics/<slug>` and the correction 18 fixes. Everything is a pure function of the recipe (and, for pages, the slug). Goldens are hand-written first; the generators are made to match them.

## Decisions

1. **Goldens first, byte for byte.** `__golden__/<id>.js.txt` and `<id>.page.html.txt` are hand-written from the spec and Learn, committed before the generator, and read with `readFileSync`; tests use `toBe`. Never `toMatchFileSnapshot` or `-u`. Red first = golden + test before the generator in every task.
2. **Learn is read once, at the start of Task 1.** The implementer reads the three tutorial pages and the Server objects page through the Learn MCP, writes the Learn revision date in the first commit message, and settles every argument order and header in the goldens. Any divergence from the spec's recipe table is an open question, not a silent change.
3. **Emission style.** Generators build an array of lines joined with `\n`; the text ends with exactly one LF; two-space indent; double-quoted strings; every literal through `JSON.stringify` (no string-concatenated code, no template literals in emitted code, so no `${` in generator output). The first lines are `headerComment(getRecipe(id))`, then a blank line, then the code (same convention as Phase 07, Decision 2; AC-3.3, AC-3.10). Other comments stay minimal and are checked by the zero-hit test.
4. **Helpers are `const` arrow functions, not function declarations.** `toResult` and `isGuid` already are (snippets); the R4/R5 body and option helpers follow. Phase 03's `exportedFunctionNames` counts every top-level `function` declaration, and Inspector (Phase 11) reads that list for the "exports only" rule. So each handler declares exactly its `recipe.functions` as functions: R4 `get`, `post`, `put`, `del`; R5 the same four (all `async`); R6 `get` (`async`). Correction 22 allows top-level helpers at runtime; this keeps the extra-function noise out of Inspector.
5. **`async` only where awaited.** R4 is fully synchronous (correction 19, no `await` on `Server.Connector.Dataverse.*`). R5 and R6 `await` `HttpClient` (correction 7).
6. **Highlights (AC-4.2).** `highlightLines` is the 1-based set of lines that call `Server.Connector.*` data-access methods, in text order. Tests assert the explicit arrays, and also that each listed line contains `Server.Connector.` and no other line does (the `toResult` line has none).
7. **Fixed R4 allowlist.** `const ALLOWED_ENTITY_SETS = ["contacts"]` (spec default). `entitySetName` is required: a missing value is "not in the allowlist" and fails validation with `field: "entitySetName"`. `id` is checked with `isGuid` (required for `put` and `del`, optional for `get`). Validation errors use `validationFailureReturn(For)` with the fields `entitySetName`, `id`, `additionalParameters`, `body`.
8. **R4 `additionalParameters` (F08).** Absent or empty is allowed. Otherwise: at most 500 characters; split on `&`; every segment (an empty segment is rejected) must match `^\$(select|filter|top|orderby|expand)=` (lower case); each option name at most once; `$top`, when present, must match `^[1-9][0-9]?$` and be 50 or less (the spec says "integer 1 to 50"; leading zeros are rejected as a plan choice). A multi-record `get` (no `id`) without `$top` has `$top=10` appended with `&` (or becomes `$top=10` alone). A single-record `get` is never given a default; a `$top` there is passed through and Dataverse's 400 returns `status: "error"`. All other values pass unchanged. The matching uses regexes only (no `.startsWith(`; correction 14), and a `&` inside a `$filter` value is not supported (documented as a limit in a Difference line).
9. **R4 payloads.** `post`: `CreateRecord(entitySetName, JSON.stringify(parsedBody))`; the id comes from `r.Headers && (r.Headers.entityid ?? r.Headers.entityId)` after `toResult` (F55); a missing id returns `status: "error"` and logs the operation name only. `put`: `UpdateRecord`; `del`: `DeleteRecord`; both return only `{ status: "success" }`. `get`: success `data` is the parsed record, or the parsed `value` array for a list; an empty `Body` gives `data: null` (the spec is silent for R4; this matches R10). The parsed body, not the raw request text, is what is sent.
10. **R4 permissions as built.** The handler is the Global Create-only shape (F04, owner decisions 2026-10-16): no `@odata.bind`, no `Server.User` read. The ◆ probe below can change this later; this phase must not pre-empt it.
11. **R4 logging and errors.** Each function has `try`/`catch` with `Server.Logger.Log` (operation name and `ActivityId`) and `Server.Logger.Error` (operation name plus `e.name`, or `StatusCode` and `ReasonPhrase` on a failed result). Messages returned to the caller are fixed strings per function (for example "The contact couldn't be read."). Everything goes through `logLine`; no `e.message`, `Body`, URL or header is ever logged (F09).
12. **R5 URL building.** `const baseUrl = "https://services.odata.org/TripPinRESTierService"` is the one literal endpoint (AC-3.5). The path is `baseUrl`, then `"/" + serviceSession` when the session is non-empty, then `/People`, then `('<encodeURIComponent(username)>')` for one person (correction 17, OData key syntax). `get` takes no session (Learn's names, F03); the demo page derives one from `@odata.context` for the other calls.
13. **R5 validation (F03, F58).** `username`/`UserName` must match `^[A-Za-z0-9._-]{1,64}$`; `serviceSession` must match `^[A-Za-z0-9()]{0,64}$`. `get`: `username` optional. `post`: Body object with `serviceSession` (string, may be empty) and a valid `UserName`. `put`: same, and the person fields to patch. `del`: `username` and `serviceSession` both present (an empty session string passes the pattern). `serviceSession` is stripped from the upstream body. `get` and `post` return `data` (the `Body` decoded as JSON; empty gives `null`); `put` (via `PatchAsync`) and `del` return only `status`, and never forward an upstream body. Every call that sends a body passes `"application/json"` as `contentType` (correction 12).
14. **R6.** Order: validate `name` (required string, 1 to 100 characters as received, no trimming), then `requireSettingsCode(["AZURE_FUNCTION_URL"], ...)` (F57), then the call. The URL appends `name` with `?` or `&` depending on whether the setting already contains `?` (Learn's function URL carries its key as a query parameter), using `encodeURIComponent`. Success returns `message: r.Body` raw (F01), `""` when `Body` is missing. The URL is never logged.
15. **Failures from the network layer.** Every outbound call result goes through `toResult`, then `IsSuccessStatusCode` is checked; `StatusCode` 0 from a blocked host (correction 20) therefore lands in the failure branch with the same fixed message and a `StatusCode`/`ReasonPhrase` log.
16. **Differences constants.** `R4_DIFFERENCES` etc. each hold one `{ change, reason }` per item in AC-3.7 that applies: R4 allowlist and GUID check, `put` uses `entitySetName` not a hardcoded table, reworded comments, narrower permissions (Account Read/Write/Delete plus Global Create versus Learn's all-Global), `$top` default 10 and cap 50 and option rules, fixed return shape, no `err.message` logging, `toResult` and status checks. R5: key syntax, input validation, `contentType`, return shape, logging. R6: URL from a site setting, `name` sent URL-encoded, fail-closed missing setting, return shape, logging. A test only checks the constants are non-empty and each `reason` is non-empty.
17. **Demo pages: one script block with a stable id.** Each page keeps Learn's overall shape and styling classes, with exactly one inline `<script id="demo-page-script">` holding named functions and a single `const ENDPOINT`. Phase 17 extracts that block by the id for its AC-4.12 cases. The page uses the token path from correction 9 (`shell.getTokenDeferred()` + `__RequestVerificationToken` for `fetch`, or `shell.ajaxSafePost`); the implementer records in the golden's first comment which style Learn used and uses the same.
18. **Demo page response handling (corrections 8, 18).** One shared pattern per page: check envelope `success`, then `try { JSON.parse(resp.data) } catch`, then branch on parsed `status === "success"`. A `success: false` envelope shows `error` as text; a `status: "error"` payload shows `message` (and `errors` when present); non-JSON `data` shows a fixed message. It never re-parses `Body`: it reads the recipe's return shape (`data` for R4/R5 get, `id` for post, `message` for R6). R4 and R5 tables change only after an application success.
19. **Demo page escaping.** Every record value placed in HTML goes through the page's own `escapeHtml` (`&`, `<`, `>`, `"`, `'`), per correction 18. R5 derives `serviceSession` from `@odata.context` with one bounded regex for the segment before `$metadata`, then validates it with the handler's own session pattern and falls back to `""`; it never throws.
20. **Slug safety in pages.** The endpoint is `"/_api/serverlogics/" + encodeURIComponent(slug)`, embedded in the script through `JSON.stringify` with `<` replaced by `\u003c`, and any visible slug text through the HTML escaper. A normal slug (`[a-z0-9-]`, AC-2.2) renders identically to the plain path. The function never throws; an empty slug is not special-cased (the Starter already falls back to `untitled`, AC-2.3).
21. **`generateDemoPage` return.** A string for `R4`, `R5`, `R6` and `null` for the other seven ids, matching `getRecipe(id).demoPage`. Output is LF and deterministic. Pages are not FR-4 checked (AC-3.9) and are never rendered with `dangerouslySetInnerHTML`.
22. **Static logging guard.** Each handler test scans every emitted `Server.Logger.` call and accepts only a fixed string literal followed by `.StatusCode`, `.ReasonPhrase`, `<var>.name` or `Server.Context.ActivityId` (F09). The sentinel-secret behavior test is Phase 17.
23. **No `node:vm` here; the F08 cases are handed to Phase 17.** The global rule lets only the AC-4.12 harness run generated text, so this phase proves the R4 option rules statically (the golden plus `r4.options.test.ts`, which asserts the emitted allowlist, the `$top` pattern and cap, the 500-character limit and the list-only default). The behaviour cases listed in Task 2 are recorded for Phase 17, which runs them in its `node:vm` harness.

## Tasks

### Task 1: R4 handler core (functions, allowlist, GUID, bodies)
**Description:** Read the Learn Dataverse tutorial and Server objects page (Decision 2). Write `R4.js.txt` for the four functions with the allowlist, `isGuid`, body-object check, `toResult`, status check and created-id rule, but with `additionalParameters` only length-checked (Task 2 completes it). Add `tutorial.testkit.ts` (`readGolden`, a logging-guard scanner, a zero-hit asserter) and `generateR4` plus `R4_DIFFERENCES`.
**Red first:** `r4.test.ts` ("R4 handler"): matches the golden byte for byte; `highlightLines` equals the explicit array and every `Server.Connector.` line is listed (Decision 6); text is LF, ends with one `\n`; `exportedFunctionNames` equals `["get","post","put","del"]`; `detectConnectorUse` is dataverse only; no `await` appears; first lines equal `headerComment(R4)`; a test for each of "rejects table outside the allowlist", "rejects a non-GUID id" and "returns the created id from entityId or entityid" asserts the corresponding literals in the text; the logging guard (Decision 22) passes; `R4_DIFFERENCES` is non-empty.
**Acceptance criteria:**
- [ ] The handler contains all four tutorial functions in `try`/`catch` with `Logger.Log` and `Logger.Error`, and the header comment links Learn (AC-3.3, AC-3.4, AC-3.10).
- [ ] Table and id come only from the allowlist and the GUID check; comments avoid the word forms FR-4 blocks (correction 17).
- [ ] `runBrowserChecks` returns no hits and `parseFailed: false` (AC-3.2, T1).
**Verification:** `npx vitest run src/services/generators/handlers/r4.test.ts` then `npx tsc -b`.
**Files:** `r4.ts`, `r4.test.ts`, `tutorial.testkit.ts`, `__golden__/R4.js.txt`
**Scope:** M

### Task 2: R4 option rules and `$top` default and cap (F08)
**Description:** Add the `additionalParameters` validation and the `$top=10` default to the golden and generator (Decision 8), and pin them with static checks (Decision 23). Running the handler is Phase 17's job.
**Red first:** update `R4.js.txt` first and see `r4.test.ts` fail; then `r4.options.test.ts` (static, parses the generated text with `acorn`): "emits the five-option allowlist select/filter/top/orderby/expand", "emits the $top pattern ^[1-9][0-9]?$ and the cap of 50", "emits the 500-character limit", "applies the $top=10 default only on the list branch of get", "reports errors under field additionalParameters".
**Hand-off to Phase 17 (behaviour cases):** appends `$top=10` when a list has none; keeps a caller `$top` between 1 and 50; rejects `$top` 0, 51, 5.5, 05 and abc; rejects a duplicate option; rejects an option outside the allowlist; rejects more than 500 characters; passes a single-record `get` through without a default; returns errors with field `additionalParameters`.
**Acceptance criteria:**
- [ ] The generated R4 `get` contains the list-only `$top=10` default and rejects a `$top` above 50 with `status: "error"`, as the golden shows (FR-3 R4 row, F08).
- [ ] Only the five option names are accepted, each once, in at most 500 characters (F08).
- [ ] The golden is still free of restricted patterns (`.startsWith(`, `with(`, anonymous `function (`).
**Verification:** `npx vitest run src/services/generators/handlers/r4.test.ts src/services/generators/handlers/r4.options.test.ts`
**Files:** `r4.ts`, `r4.options.test.ts`, `__golden__/R4.js.txt` (edit)
**Scope:** M

### Task 3: R5 handler (External service CRUD)
**Description:** Read the Learn External services tutorial. Write `R5.js.txt` with `get`, `post`, `put` (uses `PatchAsync`), `del`, all `async`, per Decisions 12 and 13, then `generateR5` and `R5_DIFFERENCES`.
**Red first:** `r5.test.ts`: golden byte match; explicit `highlightLines`; `exportedFunctionNames` is the four names and each is `async function`; `detectConnectorUse` is httpClient only; the text uses `PatchAsync` in `put`, `GetAsync`, `PostAsync`, `DeleteAsync`; contains the key-syntax path, both validation regexes, `baseUrl` as the only URL literal, and `"application/json"` on the `post` and `put` calls; no Dataverse connector; logging guard; zero-hit; header link.
**Acceptance criteria:**
- [ ] All four tutorial functions exist and `put` calls `PatchAsync` (AC-3.4, FR-3 R5 row).
- [ ] The single-record `get` uses `People('<username>')` and every URL value is URL-encoded (correction 17, F03).
- [ ] Inputs are validated before any outbound call, and `put`/`del` return only `status` (F58, FR-3 contract).
**Verification:** `npx vitest run src/services/generators/handlers/r5.test.ts` then `npx tsc -b`.
**Files:** `r5.ts`, `r5.test.ts`, `__golden__/R5.js.txt`
**Scope:** M

### Task 4: R6 handler (Call an Azure Function)
**Description:** Read the Learn Azure Function tutorial. Write `R6.js.txt` (Decision 14), `generateR6` and `R6_DIFFERENCES`.
**Red first:** `r6.test.ts`: golden byte match; explicit `highlightLines` (the `GetAsync` line); one async `get`; the text reads `AZURE_FUNCTION_URL` through `Server.SiteSetting.Get` with the exact F57 missing-setting return, before the call; no `https://` literal anywhere; the URL gets `name` through `encodeURIComponent`; returns `message` raw; logging guard (no URL logged); zero-hit; header link.
**Acceptance criteria:**
- [ ] The function URL and key come only from the site setting; no literal endpoint (AC-3.5, correction 17).
- [ ] `name` is validated as 1 to 100 characters, URL-encoded and sent (correction 17, FR-3 R6 row).
- [ ] A missing setting returns the fixed failure and logs only the setting name (F57).
**Verification:** `npx vitest run src/services/generators/handlers/r6.test.ts` then `npx tsc -b`.
**Files:** `r6.ts`, `r6.test.ts`, `__golden__/R6.js.txt`
**Scope:** S

### Checkpoint (after Tasks 3 and 4)
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run`.

### Task 5: `generateDemoPage` dispatcher, slug safety, R6 page
**Description:** Replace the `demoPages.ts` stub with the dispatcher, the shared `escapeHtml`/endpoint helpers (Decisions 17 to 21) and the R6 page ("Test Server Logic" card, with the CSRF token added). Read Learn's Azure Function page first and record its markup shape (fragment or full document) as the template for all three pages.
**Red first:** `demoPages.test.ts`: "returns null for R1, R2, R3, R7, R8, R9, R10"; "R6 page equals the golden for slug customer-summary"; "endpoint appears as /_api/serverlogics/customer-summary"; "sends the __RequestVerificationToken from shell.getTokenDeferred"; "same input gives the same output, LF only"; "hostile slugs do not break out": for `</script><script>x</script>`, `"><img onerror=x>`, `a'b&c` and `../x`, the number of `<script` tags equals the golden's, no raw `</script>` is added, and the endpoint string literal still parses as a JS string.
**Acceptance criteria:**
- [ ] The R6 page calls `/_api/serverlogics/<slug>` with the CSRF token (AC-3.9, correction 18).
- [ ] No slug can add markup or end the script block (decision 20).
- [ ] Other recipe ids return `null` (AC-3.9).
**Verification:** `npx vitest run src/services/generators/handlers/demoPages.test.ts`
**Files:** `demoPages.ts`, `demoPages.test.ts`, `__golden__/R6.page.html.txt`
**Scope:** M

### Task 6: R4 demo page (contacts CRUD table)
**Description:** Add the R4 page: list, create, update and delete rows in a contacts table, adapted to R4's return shape (`data` array, `id` on create), values escaped, table updated only after an application success.
**Red first:** extend `demoPages.test.ts`: "R4 page equals the golden"; "every record value is escaped before insertion" (the text routes each inserted field through `escapeHtml`); "parses data in try/catch and never double-parses Body"; "the table is refreshed only inside the status === success branch"; the example payloads in the page equal `getRecipe('R4').examples`' `entitySetName=contacts` shape.
**Acceptance criteria:**
- [ ] The page uses Learn's layout with the endpoint changed and the correction 18 escaping fix (AC-3.9).
- [ ] The four cases (success, `success: false`, `status: "error"`, non-JSON `data`) each have a visible path in the script (AC-4.12, for Phase 17).
- [ ] The table changes only after an application success (AC-3.9, AC-4.12).
**Verification:** `npx vitest run src/services/generators/handlers/demoPages.test.ts`
**Files:** `demoPages.ts`, `demoPages.test.ts`, `__golden__/R4.page.html.txt`
**Scope:** M

### Task 7: R5 demo page (OData people table)
**Description:** Add the R5 page: list people (read the session from `@odata.context`), create, update and delete by `UserName` with `serviceSession`, per Decision 19.
**Red first:** extend `demoPages.test.ts`: "R5 page equals the golden"; "session parse is bounded, validated and falls back to empty"; "both JSON.parse sites are guarded by try/catch" (the `resp.data` parse and the upstream-`data` parse the handler now does server-side); "values are escaped"; "the table changes only on application success"; "put/del read only status".
**Acceptance criteria:**
- [ ] `serviceSession` comes from a validated parse with an empty fallback, never from a fragile regex that can throw (correction 18).
- [ ] No unguarded `JSON.parse` and no unescaped record value (correction 18).
- [ ] The page matches R5's input names and locations (`username`, `serviceSession`, `UserName`, F03).
**Verification:** `npx vitest run src/services/generators/handlers/demoPages.test.ts`
**Files:** `demoPages.ts`, `demoPages.test.ts`, `__golden__/R5.page.html.txt`
**Scope:** M

### Checkpoint (after Tasks 5, 6 and 7)
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run`.

### Task 8: Wiring and cross-recipe guards
**Description:** Add one integration test that goes through the real registry and catalogue: no source edits expected beyond fixes the test exposes in the owned files.
**Red first:** `tutorials.integration.test.ts`: "generateHandler('R4'|'R5'|'R6') equals the generateR* output"; "for all ten ids, generateDemoPage is non-null exactly when getRecipe(id).demoPage"; "each header comment contains the recipe's learnUrl"; "every handler function listed in recipe.functions is exported, in order"; "R4/R5/R6 DIFFERENCES exports are non-empty".
**Acceptance criteria:**
- [ ] Registry and catalogue agree on which recipes have demo pages (AC-3.9).
- [ ] Each handler's header comment links its Learn page (AC-3.3, AC-3.10).
- [ ] Function lists match `RECIPES` data (AC-3.4).
**Verification:** `npx vitest run src/services/generators/handlers` then the full gate below.
**Files:** `tutorials.integration.test.ts`
**Scope:** XS

## Checkpoint (phase gate)
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run`, then `git diff --stat` shows only the files listed above.

## Owner gate ◆ (R4 bound-create probe)
This is an owner task on the dev site, not an agent task, and **it blocks nothing in this phase**. The phase ships the Global Create-only R4 (Decision 10). Steps: (1) deploy a throwaway server logic (not a shipped recipe, F54) whose `post` reads the caller's parent account (`RetrieveRecord("contacts", Server.User.contactid, "$select=_parentcustomerid_value")`, guarded for a null user) and calls `CreateRecord("contacts", ...)` with `parentcustomerid_account@odata.bind` set to that account; (2) run it as a test user with a parent account, under a web role whose contact permission is Account-scoped and includes Create, plus Append on `contact` and Append To on `account`; (3) record: the exact request and response, whether the record is created, whether it is then readable through the Account-scoped Read, and the error text when Append or Append To is missing or the caller has no parent account; (4) write the date, host and runtime versions and outcome under a "Probe result" heading appended to this file (F59). **Pass:** run `sdd-superpowers:sdd-spec-update` to change the R4 row (bind from the server-read account, never from the request; Create moves into the Account permission; Append and Append To added), then a follow-up phase edits `recipes.ts`, `r4.ts`, `R4.js.txt`, `R4.page.html.txt` and the Phase 14/17 tests. **Fail:** record the error and leave F04 as is.

## Risks and open questions
- **Open: Learn demo page markup.** The exact shape (fragment or full document, token style) is known only from reading Learn at Task 5; the three goldens follow what Learn does.
- **Open: R5 details Learn may settle differently.** Whether the PATCH body should also drop `UserName` (key property), whether `serviceSession` is required or optional on `post`/`put`, and `RetrieveMultipleRecords`' `additionalParameters` argument format (leading `?` or not). Task 1 and Task 3 settle them from Learn; changes to the spec go through `sdd-spec-update`.
- **Open: catalogue URLs.** R4's `learnUrl` in `recipes.ts` reads `.../configure/server-logic-operations`, while the spec names "Dataverse tables". If Learn disagrees, report it to the Phase 05 owner; this phase does not edit `recipes.ts`.
- **Resolved: text format.** Decision 3 copies Phase 07's convention (one final LF, header, blank line, 2-space indent); Phase 09 and 19 must match.
- **Open: Phase 14 source for "Differences from Learn".** Decision 16 puts it in the `*_DIFFERENCES` constants; Phase 14 may use them or ignore them.
- **Open: vm test (Decision 23)** brushes against the "only the harness runs generated code" rule; Phase 17 can absorb it.
- **Risk: mirrored mistakes.** The same agent writes golden and generator, so a spec misreading appears in both. The mitigations are the owner's review of the three server goldens against Learn, and Phase 17's behavior harness.
- **Risk: restricted words in emitted text.** Words such as `delete <name>`, `function (`, `with(` and `prototype` in a comment or message break the file at runtime (correction 14). The zero-hit test per recipe is the guard.
- **Risk: R5 depends on TripPin session behavior** (a shared public demo service); only the URL shape is tested here.

## Done when
- The four stubs are replaced; the six golden files and seven test files exist; `generateDemoPage` returns a page for R4, R5 and R6 only.
- The phase gate is green (`tsc -b`, `eslint --max-warnings=0`, `prettier --check`, `vitest run`), and each of R4, R5 and R6 has zero `runBrowserChecks` hits and `parseFailed: false`.
- AC-3.3, 3.4, 3.7, 3.9, 3.10 and corrections 17 and 18 are covered by the tests named above; the open questions are answered or forwarded; the ◆ probe is handed to the owner.
