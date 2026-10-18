# Phase 07: Handlers R1, R2, R3, R8

**Implements:** FR-3 (the R1, R2, R3 and R8 rows of the recipe table, the recipe contract and Example requests tables, and the shared Musts: validate before any call, fail-closed missing setting, `toResult`, `IsSuccessStatusCode` check, Body decoding, logging rule F09, async only for `HttpClient`/`CloudFlow`, determinism), FR-4 (zero hits in generated server text) | **Satisfies:** AC-3.2 (server-text half: zero FR-4 hits and parses as ES2023; the method and client-language matrix is Phase 10 and Phase 17), AC-3.5 (R3 reads `ExternalApi/BaseUrl` through `Server.SiteSetting.Get`, never a literal), AC-3.8 (server half: R8 exports `getSummary()` and reads `Server.Context.Input` only), AC-3.10 (header comment from `headerComment`, which links R8's Learn page), AC-4.2 (the `highlightLines` the server pane shades), AC-4.10 (LF text that equals the download), Learn corrections 6, 7, 11, 13, 14, 16, 19, 20, 21 and 22 as listed in Decision 12
**Depends on:** 02 (`runBrowserChecks`), 05 (`getRecipe`, `snippets.ts`). Phase 03 (`exportedFunctionNames`, `detectConnectorUse`, `readsHttpOnlyContext`) is already merged and is used by Task 5's tests only.
**Files:**
- Replace the stubs: `src/services/generators/handlers/r1.ts`, `r2.ts`, `r3.ts`, `r8.ts`.
- Create tests: `r1.test.ts`, `r2.test.ts`, `r3.test.ts`, `r8.test.ts`, `handlers.core.test.ts` (all in `src/services/generators/handlers/`).
- Create goldens in `src/services/generators/handlers/__golden__/`: `R1.js.txt`, `R2.js.txt`, `R3.js.txt`, `R8.js.txt`.
- Edits no other file. Not touched: `index.ts` (registry), `r4.ts`–`r7.ts`, `r9.ts`, `r10.ts`, `demoPages.ts`, `snippets.ts`, `recipes.ts`, `package.json`.

**Interfaces:**
- **Consumes** (exact names):
  - `getRecipe(id: RecipeId): RecipeMeta` from `@/services/catalogue/recipes`.
  - From `./snippets`: `TO_RESULT`, `VALIDATION_MESSAGE`, `headerComment(recipe)`, `requireSettingsCode(names, indent)`, `failureReturn(message, indent?)`, `validationFailureReturnFor(errorsVar, indent?)`, `logLine({ level, operation, fields?, indent? })`. `validationFailureReturn` and `IS_GUID` are not needed by these four recipes.
  - `GeneratedHandler` from `@/types/recipe`.
  - Tests only: `runBrowserChecks` (`@/lib/code-analysis/browserChecks`); `exportedFunctionNames`, `detectConnectorUse`, `readsHttpOnlyContext` (`@/lib/code-analysis/structure`); `parse` from `acorn`; `generateHandler` from `./index`; `readFileSync` from `node:fs`.
- **Produces** (the stubs' own signatures, unchanged): `generateR1()`, `generateR2()`, `generateR3()`, `generateR8()`, each `(): GeneratedHandler`. The registry already maps them, so `generateHandler('R1' | 'R2' | 'R3' | 'R8')` starts working with no edit to `index.ts`.

Phase 07 replaces four stubs with pure generators that return the server text and `highlightLines` for the two simplest Core recipes that touch a connector or a request (R1 Dataverse read, R3 external GET), the pure-validation recipe (R2) and the Liquid-only recipe (R8). Each generator composes the Phase 05 snippets, builds every literal with `JSON.stringify`, and is pinned by a golden file hand-written from the spec before the generator exists. A shared cross-recipe test checks the catalogue, the structure analysers and the text format against all four. Nothing here runs the generated code: executing handlers against stubs is Phase 17, and the client pane, pills and package are Phases 10, 14, 18 and 21.

## Decisions

1. **Golden files** live at `__golden__/<id>.js.txt` (`R1.js.txt` and so on). The `.txt` suffix keeps ESLint, Prettier and tsc off them. Tests read them with `readFileSync(new URL('./__golden__/R1.js.txt', import.meta.url), 'utf8')` and compare with `toBe`. Never `toMatchFileSnapshot` or `-u`, so a golden cannot bless itself. Red first means the golden and its test are committed (`test(handlers): ...`) before the generator (`feat(handlers): ...`). The goldens are written by hand from the spec and these Decisions, never pasted from generator output.
2. **Text format (all four, and the convention Phases 08, 09 and 19 should copy).** LF only, no BOM, UTF-8, 2-space indent, double-quoted strings, semicolons. The text is `headerComment(recipe)`, a blank line, then the code, and **ends with exactly one `\n`**, so AC-4.10's download adds nothing. The generator builds an array of lines and joins with `"\n"`; no other string concatenation of code. `TO_RESULT` is emitted at top level (correction 22) only in R1 and R3, the two recipes that read a connector result.
3. **Shape of every function.** The whole body is in `try { ... } catch (e) { ... }`. The catch logs `logLine({ level: 'Error', operation, fields: ['exception'] })` (so `e.name` only) and returns a `failureReturn` with the recipe's fixed message. Reason: Body decoding says a parse failure "is a caught error that returns `status: "error"`", and an uncaught throw would break the return shape. Validation failures are not exceptions: they `return` `validationFailureReturnFor("errors")` with `errors` built at run time.
4. **Fixed messages and operation names** (the plan settles them because the spec fixes only the shape; goldens and tests pin them):

   | Recipe | Log operation | Failure message(s) | Validation `errors` entries |
   |---|---|---|---|
   | R1 | `R1 get` | `Couldn't read contacts.` (connector failure and catch) | none |
   | R2 | `R2 post rejected` (Warn, no fields) | none | `body`: `Body must be a JSON object.`; `name`: `Name is required and must be 100 characters or fewer.`; `email`: `Email must be a valid address of 254 characters or fewer.` |
   | R3 | `R3 get` | `The external API call failed.` (non-success status and catch) | `q`: `q must be 100 characters or fewer.` |
   | R8 | none | none | `input`: `Input must be a JSON object.`; `category`: `category must be a string of 50 characters or fewer.`; `maximumResults`: `maximumResults must be a whole number from 1 to 50.` |

   Connector failures log `logLine({ level: 'Error', operation, fields: ['status', 'reason'] })` on the result variable `r`. R2 also logs nothing on success; R1 and R3 log nothing on success. R8 has no `Server.Logger` call (FR-3 lists none).
5. **R1** (`function get()`, synchronous, correction 19). One statement: `const r = toResult(Server.Connector.Dataverse.RetrieveMultipleRecords("contacts", "$select=contactid,fullname,emailaddress1&$top=10"));` on a single line, option string without a leading `?` (correction 6). Not `async`, no `await`. On `!r.IsSuccessStatusCode` log status and reason and return the failure. On success decode a non-empty `r.Body` with `JSON.parse`, take `value` when it is an array (else empty), and return `{ status: "success", contacts: [{ id, fullname, email }] }` mapped from `contactid`, `fullname`, `emailaddress1` with an arrow function. An empty `Body` gives `contacts: []`. The entity set is a literal in the generator; Task 1 cross-checks it against `getRecipe('R1').tables[0]`.
6. **R2** (`function post()`, synchronous, no connector, no `toResult`). Parse `Server.Context.Body` inside its own `try`; a parse failure, `null`, an array or a non-object adds the single `body` error and returns at once. Otherwise trim `name` and `email` (only when strings), validate per the contract row (name non-empty and at most 100 after trimming; email at most 254 with exactly one `@` and a `.` after it, checked with `split("@")` and `indexOf(".", at + 1)`, never `startsWith`/`endsWith`), collect field errors, and on any return the validation failure after a `Warn` log. Success returns `{ status: "success", name, email }` with the trimmed values. Other body fields are ignored.
7. **R3** (`async function get()`, correction 7). Order is fixed: read `q` from `Server.Context.QueryParameters` (absent means `""`), validate (a non-string or more than 100 characters is a `q` error), then `requireSettingsCode(["ExternalApi/BaseUrl"], ...)` (variable `externalApiBaseUrl`), then the call. The URL is the setting value plus `"?q=" + encodeURIComponent(q)` only when `q` is non-empty. A generated comment says the setting must not contain a query string (Open question 3). Call: `toResult(await Server.Connector.HttpClient.GetAsync(url, { Accept: "application/json" }))`, headers per correction 12's `GetAsync(url, headers)`, no `contentType` (a GET sends no body). `!r.IsSuccessStatusCode` also catches the blocked-domain `StatusCode` 0 case (correction 20). Success decodes a non-empty `Body` as JSON into `data`; an empty `Body` gives `data: null`; non-JSON throws into the catch (Body decoding, F01). No `Server.User`, no literal URL in the text (AC-3.5).
8. **R8** (`function getSummary()`, synchronous, no connector, no Logger). Parse `Server.Context.Input || "{}"`; failure or a non-object gives the `input` error. `category` defaults to `""` and must be a string of at most 50 characters; `maximumResults` defaults to 5 and must satisfy `Number.isInteger(x) && x >= 1 && x <= 50`. All field errors are collected into one array. Success returns `{ status: "success", category, maximumResults, activityId, functionName, serverLogicName }` read from `Server.Context.ActivityId`, `.FunctionName` and `.ServerLogicName`. It reads no HTTP-only context member (correction 13) and `headerComment` links the Learn page. The two Liquid snippets of AC-3.8 belong to Phase 10.
9. **`highlightLines` (AC-4.2).** Each handler highlights exactly one line: the statement that uses the recipe's FR-3 "Main object": R1 the `RetrieveMultipleRecords` statement, R2 the line that reads `Server.Context.Body`, R3 the `GetAsync` statement, R8 the line that reads `Server.Context.Input`. Each such statement is kept on one line. R2 and R8 do no data access, so this is the plan's reading of "the lines that do the recipe's data access" (Open question 1). Tests assert the literal 1-based number counted in the committed golden, plus that the numbered line contains the marker text.
10. **Comments** are short plain `//` lines. Browser-API words (`fetch`, `window`, `document`, ...), `delete`, `prototype`, and any `<name> (` that spells a restricted pattern must not appear in them (correction 14); FR-4's zero-hit test enforces this on the whole text.
11. **No eval.** These tests parse (`acorn`, `ecmaVersion: 2023`, `sourceType: 'script'`) but never run the generated text; a handler first runs in Phase 17's `node:vm` harness.
12. **Corrections in play:** 6 (R1 option string), 7 and 19 (`async`/`await` only in R3), 11 (`toResult` in R1, R3), 12 (R3 headers, no body), 13 (R8 and R1 read no HTTP-only context; R2 and R3 do, so Liquid is correctly off), 14 (wording), 16 and 21 (none of the four reads `Server.User`, so there is no guard to emit; tests assert the text never mentions it), 20 (R3 status check), 22 (`toResult` as a top-level helper). Corrections 8, 9, 15 and 23 are client or README matters.

## Tasks

### Task 1: R1, Read Dataverse records
**Description:** Hand-write `R1.js.txt` from FR-3 (R1 row, contract row, Musts) and Decisions 2 to 5 and 9, then the test, then `generateR1`. This task also sets the test pattern (golden read helper, ES2023 parse helper, logging-rule regex) that Tasks 2 to 4 repeat inline; no shared test file is created, so parallel B1 phases never collide.
**Red first:** `r1.test.ts`, run against the throwing stub:
- "matches the golden file": `generateR1().text` `toBe` the golden text.
- "highlights the RetrieveMultipleRecords line": `highlightLines` equals the literal one-element array counted in the golden, and that line contains `RetrieveMultipleRecords`.
- "has zero FR-4 hits": `runBrowserChecks(text)` gives `hits` equal to `[]` and `parseFailed` false.
- "reads contacts synchronously with the fixed options": text contains the exact `RetrieveMultipleRecords("contacts", "$select=contactid,fullname,emailaddress1&$top=10")` call, contains `toResult(` and `IsSuccessStatusCode`, and contains neither `await` nor `async`.
- "logs only what the logging rule allows": every `Server.Logger.` line matches the allowed shapes (a JSON-string operation name, optionally joined with `r.StatusCode`, `r.ReasonPhrase`, `e.name` or `Server.Context.ActivityId`), and no line mentions `Body`, `message` or `Url`.
- "uses the catalogue's entity set": the call's first argument equals `getRecipe('R1').tables[0]?.entitySetName`.
**Acceptance criteria:**
- [ ] The text equals the golden byte for byte, ends with one `\n`, and starts with `headerComment(getRecipe('R1'))` (FR-3 deterministic output, AC-3.10, AC-4.10).
- [ ] No `await`/`async`, `toResult` applied, `IsSuccessStatusCode` checked, options string has no leading `?` (corrections 19, 11, 6).
- [ ] Zero FR-4 hits and one highlight on the data-access line (AC-3.2, AC-4.2).
**Verification:** `npx vitest run src/services/generators/handlers/r1.test.ts` (red before `r1.ts`, green after); then `npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check .`
**Files:** `__golden__/R1.js.txt`, `r1.test.ts`, `r1.ts`
**Scope:** S

### Task 2: R2, Validate a request
**Description:** Golden, test, then `generateR2` per Decisions 3, 4, 6 and 9. The key risk is the validation logic being right, so the test pins the rule text and the ordering ("reject before anything else"), not only the golden.
**Red first:** `r2.test.ts`:
- "matches the golden file" and "highlights the Body read" (literal line, contains `Server.Context.Body`).
- "has zero FR-4 hits".
- "validates the contract row": the text contains `JSON.parse(Server.Context.Body)`, the limits `100` and `254`, a `split("@")` and an `indexOf(".",` check, trims both fields, and uses `validationFailureReturnFor("errors")` output (the `errors` array and `VALIDATION_MESSAGE`).
- "never uses the banned string methods": no `startsWith`, `endsWith` or anonymous `function (` in the text (correction 14).
- "rejects before any data access": the text has no `Server.Connector`, no `Server.SiteSetting` and no `toResult`; it does use `Server.Logger.Warn` with only a fixed operation name.
**Acceptance criteria:**
- [ ] Text equals the golden; the failure shape is `{ status: "error", message, errors: [{ field, message }] }` with `field` values `body`, `name`, `email` (FR-3 return shape, contract table R2).
- [ ] Success returns the trimmed `name` and `email` only; no connector, setting or `Server.User` use (FR-3 R2 row).
- [ ] Zero FR-4 hits; one highlight on the Body read (AC-3.2, AC-4.2).
**Verification:** `npx vitest run src/services/generators/handlers/r2.test.ts`
**Files:** `__golden__/R2.js.txt`, `r2.test.ts`, `r2.ts`
**Scope:** S

### Checkpoint 1 (after Tasks 1 and 2)
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run` all green; `git status` shows only the Phase 07 files; `index.ts` unchanged.

### Task 3: R3, Call an external API
**Description:** Golden, test, then `generateR3` per Decisions 3, 4, 7 and 9. The test pins the order validate, read setting, call, because the spec requires validation first and fail-closed settings before any outbound call (FR-3 Musts, F57).
**Red first:** `r3.test.ts`:
- "matches the golden file" and "highlights the GetAsync line" (literal line, contains `GetAsync`).
- "has zero FR-4 hits".
- "validates, then reads the setting, then calls": in the text, the index of the `q` length check is less than the index of `Server.SiteSetting.Get("ExternalApi/BaseUrl")`, which is less than the index of `GetAsync(`.
- "fails closed on a missing setting": the text contains the `requireSettingsCode(["ExternalApi/BaseUrl"], ...)` output exactly (log of the name only, fixed message `Server logic isn't configured: missing site setting ExternalApi/BaseUrl`).
- "is async only because it awaits HttpClient": `async function get` is present, `await Server.Connector.HttpClient.GetAsync` is present, and there is no other `await`.
- "has no literal endpoint and encodes q": no `http://` or `https://` in the text (AC-3.5), `encodeURIComponent(q)` is present, and no `contentType` argument (GET).
- "logs only what the logging rule allows" (same regex as Task 1).
**Acceptance criteria:**
- [ ] The base URL comes only from `Server.SiteSetting.Get("ExternalApi/BaseUrl")`, with the missing-setting return before the call (AC-3.5, FR-3 Musts, F57).
- [ ] `toResult`, `IsSuccessStatusCode` check, JSON decode of a non-empty `Body` into `data`, and `data: null` for an empty one (corrections 11, 20; Body decoding F01).
- [ ] Zero FR-4 hits; one highlight on the outbound call (AC-3.2, AC-4.2).
**Verification:** `npx vitest run src/services/generators/handlers/r3.test.ts`
**Files:** `__golden__/R3.js.txt`, `r3.test.ts`, `r3.ts`
**Scope:** S

### Task 4: R8, Invoke from Liquid
**Description:** Golden, test, then `generateR8` per Decisions 8 and 9. R8 is the only handler whose single export is not an HTTP function name, so the test also proves the Liquid-only shape.
**Red first:** `r8.test.ts`:
- "matches the golden file" and "highlights the Input read" (literal line, contains `Server.Context.Input`).
- "has zero FR-4 hits".
- "exports only getSummary": `exportedFunctionNames(text)` equals `['getSummary']` (AC-3.8).
- "reads no HTTP-only context": `readsHttpOnlyContext(text)` is false, and the text has none of `Server.Context.Body`, `.Headers`, `.HttpMethod`, `.QueryParameters`, `.Url` (correction 13, AC-4.7).
- "parses input with defaults and limits": contains `JSON.parse(Server.Context.Input || "{}")`, the defaults `""` and `5`, the limits `50` and `1`, and `Number.isInteger`.
- "returns the context identifiers": success object has `activityId`, `functionName` and `serverLogicName` read from `Server.Context`; the text has no `Server.Logger`, `Server.Connector`, `Server.SiteSetting` or `Server.User`.
**Acceptance criteria:**
- [ ] `getSummary()` is the only export and is synchronous, with `Input` parsed and validated before use (AC-3.8, FR-3 R8 row, contract row R8).
- [ ] Failure errors use field `input`, `category` and `maximumResults`; success payload has exactly the five keys of the contract table plus `status`.
- [ ] Zero FR-4 hits; one highlight on the Input read (AC-3.2, AC-4.2).
**Verification:** `npx vitest run src/services/generators/handlers/r8.test.ts`
**Files:** `__golden__/R8.js.txt`, `r8.test.ts`, `r8.ts`
**Scope:** S

### Task 5: Cross-recipe guard (catalogue and analysers agree with the text)
**Description:** One test file that loops over `['R1','R2','R3','R8']` and checks what the per-recipe tests do not: that the generators agree with the Phase 05 catalogue and the Phase 03 analysers, and that the text format of Decision 2 holds. It needs no golden and is written after Tasks 1 to 4 (it is a guard, not a driver).
**Red first:** `handlers.core.test.ts` (it is written last, after the four generators exist, so it cannot start red; the author proves it can fail by locally flipping one expectation, for example the R2 Liquid flag, seeing it fail, and restoring it before the commit):
- "registry returns the same handler": `generateHandler(id)` deep-equals the per-file generator output.
- "parses as ES2023": `acorn.parse(text, { ecmaVersion: 2023, sourceType: 'script' })` does not throw (AC-3.2).
- "exports the catalogue's functions": `exportedFunctionNames(text)` equals `getRecipe(id).functions` (AC-2.6, AC-3.4 data).
- "connector use matches": `detectConnectorUse` reports Dataverse only for R1, HttpClient only for R3, neither for R2 and R8.
- "Liquid rule matches the catalogue": `!readsHttpOnlyContext(text)` equals `getRecipe(id).liquid` (R1 and R8 true, R2 and R3 false) (AC-4.7).
- "uses every object the catalogue lists": each entry of `getRecipe(id).serverObjects` appears in the text.
- "settings": every `siteSettings` name appears only inside a `Server.SiteSetting.Get(` argument and no recipe here with an empty list mentions `Server.SiteSetting` (AC-3.5).
- "format": no `\r`, no BOM, ends with exactly one `\n`, first lines equal `headerComment(getRecipe(id))`; two calls return equal text and `highlightLines` (determinism); `highlightLines` is non-empty, ascending, 1-based and within the line count.
**Acceptance criteria:**
- [ ] All four recipes agree with `RECIPES` on functions, connector use, Liquid eligibility and listed server objects (FR-3 table, AC-3.4, AC-4.7).
- [ ] Text is LF, newline-terminated, deterministic, and the header comment links match AC-3.10.
- [ ] Every site setting is read through `Server.SiteSetting.Get` only (AC-3.5).
**Verification:** `npx vitest run src/services/generators/handlers/handlers.core.test.ts`; then the full set in the Checkpoint.
**Files:** `handlers.core.test.ts`
**Scope:** XS

## Checkpoint 2 (after Tasks 3 to 5, the phase gate)
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run` all green. Also `git status --short` lists only the owned files, and `npx vitest run src/services/generators/handlers` shows the five new test files plus the existing `snippets*.test.ts` passing.

## Risks and open questions

1. **Highlight scope for R2 and R8** (owner to confirm). AC-4.2 shades "the lines that do the recipe's data access", but R2 and R8 do none. Decision 9 highlights the line using the recipe's FR-3 "Main object" (`Server.Context`: the Body read, the Input read). If the owner wants no highlight there, the change is two goldens and two assertions.
2. **Handlers are not executed in this phase.** Golden files are hand-written and parse-checked, but a logic slip (for example in R2's email check) first surfaces in Phase 17's behavior harness. Mitigation: Tasks 2 and 4's tests pin the rule text, and the author traces each golden against the contract row by hand. Prefer landing Phase 17 soon after B1.
3. **R3 URL composition is unspecified.** The spec says only that `q` is "sent URL-encoded" and that the base URL is the setting `ExternalApi/BaseUrl`; it names neither the upstream parameter nor whether the setting may hold a query string. Decision 7 sends `?q=<encoded>` and states in a comment that the setting must not contain a query string. Owner may prefer a different parameter name; Phase 14's README and the checklist text (Phase 05 data) should repeat the note.
4. **Text format must match across B1.** Decision 2 (trailing single `\n`, header then blank line, 2-space indent) is settled here first. The orchestrator should copy it into Phases 08, 09 and 19 before they start, or the 18a "edited" comparison and AC-4.10 could differ between recipes.
5. **Fixed messages are the plan's wording** (Decision 4). The spec fixes shape, not text. If the owner wants different copy, only goldens and the one table change.
6. **Phase 05 may adjust a snippet signature.** The plan consumes the committed `snippets.ts` as it stands (checked 2026-10-18). If `logLine` or `requireSettingsCode` output changes, goldens change with it, never the other way round.
7. **Branch name.** `plan-starter.md` names `001-server-logic-starter-inspector`; this work runs on the checked-out branch. Commits use `<type>(handlers): <message>` either way.

## Done when
- `generateHandler('R1' | 'R2' | 'R3' | 'R8')` returns real text and highlights; the four goldens, five test files and four generators exist and nothing else changed.
- Every Task's acceptance criteria are ticked, and Checkpoint 2 is green with fresh command output.
- Each of the four texts has zero `runBrowserChecks` hits, parses as ES2023, and matches the catalogue (functions, connector use, Liquid eligibility, server objects, site settings).
- The red-first order is visible in history: each golden and test commit precedes its generator commit.
