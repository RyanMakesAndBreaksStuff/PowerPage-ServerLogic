# Phase 17: Behavior harness

**Implements:** AC-4.12 (the behavior harness: handler, client and demo-page cases, the sentinel rule) and the harness half of FR-3 (validate before any call, fail-closed missing setting F57, `toResult`, `IsSuccessStatusCode`, Body decoding F01, created-record ID F55, logging rule F09, `contentType` rule) | **Satisfies:** AC-4.12, AC-3.9 (the demo page tables change only after an application success), AC-2.7 (request shape: a body only for POST, PUT and PATCH), F56 (parse tests didn't prove behavior), F09, F55, F57, F58, and Learn corrections 8, 9, 11, 13, 19 and 20 as listed in Decision 14. It also takes Phase 08's hand-off: the R4 option behavior cases (F08), Decision 8.
**Depends on:** 07, 08, 09, 10 (wave B1, merged). Phase 17 runs in wave B2a, in parallel with Phase 14. It reads `generateHandler`, `generateDemoPage`, `generateClient` and `CLIENT_PAYLOAD_KEYS` through their public exports only.
**Files:**
- Create the folder `src/services/generators/behavior/`. No product code imports it.
- Create the helper (not a test file): `behavior.testkit.ts`.
- Create tests: `handlers.behavior.test.ts`, `clients.behavior.test.ts`, `demoPages.behavior.test.ts`, `r4Options.behavior.test.ts`, `harness.selftest.test.ts`.
- Edits nothing else. Not touched: `package.json`, `vite.config.ts`, every file under `handlers/` and `client/`, `recipes.ts`, `http.ts`, and the goldens.

**Interfaces:**
- **Consumes** (exact names):
  - `generateHandler(id: RecipeId): GeneratedHandler` and `generateDemoPage(id: RecipeId, slug: string): string | null` from `@/services/generators/handlers/index`.
  - `generateClient(i: { slug; recipe; fn; method; language }): string`, `CLIENT_PAYLOAD_KEYS: Readonly<Record<string, readonly string[]>>` (keyed `<recipeId>.<fn>`) from `@/services/generators/client/client`.
  - `RECIPES`, `getRecipe`, `methodEnabled`, `EXAMPLE_GUID` from `@/services/catalogue/recipes`; `METHOD_FUNCTION` and the types `HttpMethod`, `ClientLanguage` from `@/types/http`; `RecipeId`, `RecipeMeta`, `ExampleRequest` from `@/types/recipe`.
  - `TO_RESULT` and the `logLine` output shapes from `@/services/generators/handlers/snippets` (read as text patterns in the self-test only; the harness never calls the snippet functions).
  - `vm` and `node:vm` types from Node (`@types/node` is already in `tsconfig.app.json` types). `JSDOM` or the Vitest jsdom `document` for the R6 page (jsdom is already a devDependency, and `vite.config.ts` runs Vitest in the jsdom environment).
- **Produces** (all from `behavior.testkit.ts`, used by this folder's tests only): `SENTINEL`, `runHandler(text, fn, scenario)`, `buildFakeServer(...)`, `runClient(text, clientScenario)`, `CLIENT_SINKS`, `renderLiquidSubset(template, result)`, `runDemoPage(html, pageScenario)`, `DEMO_PAGE_API`, `CONFIGURATIONS`, `PENDING_R7`. Nothing else in the repo imports them.

Phase 17 adds the proof that generated text behaves. It runs each B1 handler, client and demo page inside `node:vm` against fakes, and checks the outcomes the contract table promises: the right payload keys, fixed failure shapes, validation before any call, fail-closed settings, and a sentinel secret that never reaches `Server.Logger` or a failure return. It also runs the R4 option cases that Phase 08 handed over. These are tests over already-merged generators. They change no generator and no golden. R7 is a stub until Phase 19, so the harness lists it as pending and Phase 19 removes the exclusion. Passing this harness isn't live verification: Spike S4 stays the gate (F56).

## Decisions

1. **Folder and file roles.** Everything lives in `src/services/generators/behavior/`. `behavior.testkit.ts` holds the helpers and carries no `describe`. The five `*.test.ts` files are the only tests. The `.testkit.ts` suffix matches Phase 08's `tutorial.testkit.ts`. The folder is the only place in the repo allowed to run generated text, and a grep in Checkpoint 2 proves no file outside it imports `node:vm`.
2. **Runner: `node:vm`, one fresh context per case.** `vm.createContext` gets only the fakes (`Server` for handlers; `shell`, `fetch` and `console` for clients; `$`, `shell`, `alert`, `confirm` and a `document` for demo pages). The case runs `new vm.Script(text + "\n" + fn + "();")`. `fn` comes only from `recipe.functions`, never from the input under test, so a request cannot choose what runs. The result is the returned string, or a Promise for an `async` handler. The harness awaits it, then `JSON.parse`s it in the test realm, so assertions never compare cross-realm objects. A `timeout` applies to the script for synchronous code (a loop cannot hang the run); a Promise that never settles is cut off by an explicit race with a short test timer. `node:vm` is not a security boundary. It only runs our own generated text, in tests.
3. **Fake `Server`.** Built per case by `buildFakeServer`.
   - `Logger.Log`, `Warn` and `Error` record their arguments, and nothing else.
   - `Context` has `ActivityId`, `Body`, `FunctionName`, `Headers`, `HttpMethod`, `Input`, `QueryParameters`, `ServerLogicName` and `Url`. The values come from the recipe's example request: `EXAMPLE_GUID` replaces `<guid>`, and a query such as `?entitySetName=contacts&additionalParameters=$select=fullname,emailaddress1` is split on `&`, then on the first `=`, into a decoded `QueryParameters` object (Risk 5). `Body` is the example body as JSON text (`""` when none). `Input` is `""` except for R8.
   - `SiteSetting.Get(name)` reads a scenario map; a missing name returns `null`.
   - `User` is `null`.
   - `Connector.Dataverse.{RetrieveRecord, RetrieveMultipleRecords, CreateRecord, UpdateRecord, DeleteRecord, InvokeCustomApi}` are synchronous. `Connector.HttpClient.{GetAsync, PostAsync, PutAsync, PatchAsync, DeleteAsync}` and `Connector.CloudFlow.TriggerAsync` return Promises (correction 19, correction 7).
   - Every connector call is recorded with its method name and arguments.
   - A per-method scenario supplies the result: a single value or a queue. The default is a JSON string (Spike S4 saw string results). One extra case per connector type returns an object, so both `toResult` branches run (correction 11).
   - The result shape is `{ StatusCode, Body, IsSuccessStatusCode, ReasonPhrase, Headers }`. A `CloudFlow` result has no `Headers` (correction 11). A scenario may also make a method throw `new Error(SENTINEL)`.
4. **Handler cases: three per recipe function, so each of the 36 configurations maps to its function's set.** The handler set runs once per function (18 functions, 17 now that R7 is pending), not once per language. The client side runs per configuration (Decision 6).
   - **success:** the example request with a canned success result gives status `"success"`, and the payload keys (everything except `status`) equal `CLIENT_PAYLOAD_KEYS[id + "." + fn]` exactly. The payload follows the contract table, for example R1 returns `contacts` mapped to `{ id, fullname, email }` (Phase 10 risk 3).
   - **connector failure:** `IsSuccessStatusCode: false`, `StatusCode` 500, `ReasonPhrase` set. The return has status `"error"`, a non-empty string `message` and no `errors`, and there is exactly one `Server.Logger.Error` call. Exact fixed messages are not asserted for B1 recipes (that is the goldens' job), only the shape.
   - **empty Body:** `StatusCode` 200, or 204 for R4 and R5 `put` and `del`, `Body: ""`. The expected table is explicit:

     | Recipe and function | Expected |
     |---|---|
     | R1 `get` | success, `contacts: []` |
     | R3 `get` | success, `data: null` |
     | R4 `get` | success, `data: null` |
     | R4 `post` | success with `id` from `Headers.entityId`; the same with lowercase `Headers.entityid` (F55); status `"error"` when the header is missing |
     | R4 `put`, `del` | success, status only |
     | R5 `get`, `post` | success, `data: null` |
     | R5 `put`, `del` | success, status only (F58) |
     | R6 `get` | success, `message: ""` |
     | R9 `post` | `202` with empty Body: success, `flowResponse: null` |
     | R10 `get`, `post`, `patch` | success, `data: null` |

     R2 and R8 have no connector, so their three cases are different (next bullet).
   - **R2 and R8:** a valid example request (success); invalid input (validation `errors` with the right field names: R2 `name` and `email`, R8 `maximumResults`); and an empty request (R2 with `Body: ""` gives the single field `body`; R8 with `Input: ""` gives success with the defaults `category: ""` and `maximumResults: 5`).
   - **Extra handler cases:**
     - each connector stub throwing `new Error(SENTINEL)` gives status `"error"` with a fixed message (the catch path);
     - a missing site setting for R3 (`ExternalApi/BaseUrl`), R6 (`AZURE_FUNCTION_URL`) and R9 (`CLOUD_FLOW_ID`) returns exactly `Server logic isn't configured: missing site setting <name>`, makes zero connector calls, and logs only `Missing site setting <name>` (F57);
     - invalid input for every function that reads input returns the validation failure with zero connector calls (validate first);
     - R9 with a non-JSON text Body returns `flowResponse` as the raw string (F01), and with JSON returns the parsed value;
     - the R6 `name` appears URL-encoded in the `GetAsync` URL, and the URL follows `?` or `&` by whether the setting already holds a `?`;
     - every body-sending `HttpClient` call (R5 `post`, `put`) passes a `contentType` of `application/json`, `text/html` or `application/x-www-form-urlencoded` (correction 12), and the R5 `put` call is `PatchAsync`;
     - a blocked-host result (`StatusCode` 0, `IsSuccessStatusCode: false`) takes the failure branch (correction 20).
5. **Sentinel (F09).** `SENTINEL = "S3NT1NEL-do-not-log"` goes into: every site-setting value, every failure `Body`, response `Headers` (except the created-id header, which must stay a plain id), thrown exception messages, and request body and query values where the contract allows free text (R2 `name`, R3 `q`, R6 `name`, R9 body values, R4 body values). It is not placed in `ReasonPhrase`, because the logging rule allows logging `ReasonPhrase`. Across all handler cases: no argument of any `Server.Logger` call contains it, and no failure return contains it. Success returns may contain upstream data by design, so they are not checked for it. A request value that the handler echoes only in a success payload (R2 `name`) is fine; the check is on logs and failures.
6. **Client cases: three per configuration, plus the shared failure cases on every fetch and jQuery configuration.**
   - `CONFIGURATIONS` lists every recipe function with fetch and jQuery, except R8 (no HTTP method), plus Liquid where `recipe.liquid` is true (R1 and R8). That is 17 functions x 2 + 2 = 36 (R7 has one function, Risk 6). `PENDING_R7` marks the two R7 entries, so 34 run now.
   - **The three cases per configuration:** the envelope with `success: true` and `data` the JSON of a success payload built from `CLIENT_PAYLOAD_KEYS`; an envelope with `success: false` and an `error` string; and `success: true` with a `status: "error"` payload.
   - **Token rejection, transport failure and a malformed envelope run on every fetch and jQuery configuration (34 when R7 lands, 32 now),** not once per shared template. This is a superset of AC-4.12's 6 cases and costs milliseconds, so the result never depends on the shared-template claim in AC-4.12 or on Phase 10's byte-identical envelope test. A configuration that later gains its own client branch is covered with no edit.
   - **Each outcome is reported exactly once** through the client's observable sink. Task 3 reads the merged Phase 10 `client.ts` and goldens, then records the sinks in the testkit as `CLIENT_SINKS`. Expected: the error-display function that the maker replaces, and the success `console.log` line that prints the payload keys. A case fails if its outcome reaches zero sinks or two.
   - **Fakes:** `fetch` returns a Response-like `{ ok, status, json() }`; `json()` rejects for a malformed envelope. `shell.getTokenDeferred()` returns a jQuery-Deferred-like with `.done` and `.fail`, and token rejection fires `.fail`. `shell.ajaxSafePost(opts)` calls `opts.success(envelope)`, or fires the returned object's `.fail` handlers for token, transport and parse failure (correction 9). Both fakes record every call.
   - **Request-shape checks** (the same cases, no extra scenario): the URL is `/_api/serverlogics/<slug>` plus the decoded example query; the verb is `METHOD_FUNCTION`'s method; the `__RequestVerificationToken` header is on every fetch verb including GET; and a body exists only for POST, PUT and PATCH and equals the example body (AC-2.7). The jQuery fake checks `type`, `url`, `contentType`, and `data` by the same rule.
   - **Liquid:** `renderLiquidSubset` supports exactly the tags Phase 10 emits: `comment`/`endcomment`, `assign`, `serverlogic` (binding `result` from a scenario), `if`/`elsif`/`else`/`endif` with `and` and `==`, `for`/`endfor`, and `{{ path | escape }}`. Any other tag throws, so drift fails loudly. The three cases are: the success payload renders and a value containing `<b>` comes out escaped (F02); a `result.data.status` of `"error"` renders `result.data.message | escape`; and `result.success` false renders `result.status_code` (F02).
7. **Demo pages (R4, R5, R6).** `runDemoPage` extracts the single `<script id="demo-page-script">` from `generateDemoPage(id, 'customer-summary')` (Phase 08, Decision 17) and runs it in a vm context with:
   - a recording fake `$`: a callable where a function argument is the ready callback and runs, a selector returns a chainable recorder, and `$.ajax` returns a controllable deferred (R4 and R5 keep Learn's `webapi.safeAjax` wrapper, which calls `shell.getTokenDeferred()` then `$.ajax`);
   - a fake `shell` with `getTokenDeferred`;
   - fake `alert` and `confirm` (`confirm` returns true, since R4 and R5 keep Learn's prompts);
   - for R6, `fetch` plus a jsdom `document` built from the page fragment where element lookups are needed.
   The page's entry-function names and the exact jQuery and DOM methods used are read from the merged Phase 08 goldens in Task 4 and listed in the testkit as `DEMO_PAGE_API`. Any unlisted method throws, so a page that starts using a new method fails loudly.
   - **Four cases each:** success, envelope `success: false`, `status: "error"` payload, and non-JSON `data`.
   - **R4 and R5:** the table-mutating calls (row insert, row update, row removal) happen only in the success case (AC-3.9, AC-4.12). The other three cases show a message and mutate nothing.
   - **All three pages:** every inserted record value passes through escaping, so a `<img onerror>` value never appears raw in what the fake records. Every call targets `ENDPOINT`, which is `/_api/serverlogics/customer-summary`.
8. **R4 options (Phase 08 hand-off, F08).** `r4Options.behavior.test.ts` runs `get` against a connector scenario that records the `RetrieveMultipleRecords` option string:
   - `$top=10` is appended to a list `get` that has none, with `&` (or becomes `$top=10` alone);
   - a caller's `$top` from 1 to 50 is kept;
   - `$top` values 0, 51, 5.5, 05 and abc are rejected;
   - a duplicate option is rejected;
   - an option outside select, filter, top, orderby and expand is rejected;
   - more than 500 characters is rejected;
   - a single-record `get` (with `id`) gets no default;
   - errors use the field `additionalParameters`;
   - rejected requests make zero connector calls;
   - the accepted option string reaches `RetrieveMultipleRecords` exactly (no leading `?`, correction 6).
   The expected values come from the spec text (FR-3 R4 row, F08) and Phase 08 Decision 8. The leading-zero rejection is Phase 08's plan choice and is labelled that way in the test name.
9. **Self-test: the harness must be able to fail.** `harness.selftest.test.ts` runs hand-written bad handler texts (inline strings in the test file) and asserts the harness catches each:
   - one that logs `Server.Context.Body` (the sentinel in `Body` reaches `Server.Logger`);
   - one that calls a connector before validating (the validate-first check sees a connector call on invalid input);
   - one that returns the exception message (the sentinel in a thrown error reaches a failure return).
   Each bad text is run through the same check functions the real cases use, and the test asserts the check reports a violation. A control text that obeys the rules reports none. The self-test also proves `renderLiquidSubset` rejects an unknown tag, that `runClient` fails a client that reports an outcome twice, and that `runDemoPage` throws on an unlisted method.
10. **R7 is pending until Phase 19.** `generateHandler('R7')` still throws `not implemented: phase 19`. `PENDING_R7` is a constant set of the R7 configurations, and `CONFIGURATIONS` carries them with a `pending: true` flag. The handler and client tests skip pending entries by filtering, never by deleting them. A guard test asserts `generateHandler('R7')` still throws `not implemented: phase 19`, so the exclusion cannot linger after Phase 19 lands. The enumerator count test asserts 36 total, of which 2 are pending. Phase 19 removes `PENDING_R7`, deletes the guard and adds R7's cases (Decision 4's R7 rows, the sentinel in the SharePoint steps, and the three stage failures).
11. **No new dependency.** `package.json` is untouched, and no Liquid library is added (`renderLiquidSubset` is hand-written, Decision 6). Generated text is never evaluated outside this folder's tests.
12. **Expected values come from the spec, not from the goldens.** Each assertion is written from the FR-3 contract table, the Example requests table and the Musts, with the numbers and field names typed into the test. If a case fails, the cause is either a logic slip in a B1 generator (fix the generator and its golden in a separate `fix(handlers)` or `fix(client)` commit) or a harness mistake (fix the harness). The expectation table changes only with spec backing (Risk 4).
13. **Test style.** Tests are table-driven over `CONFIGURATIONS` and the 18 functions, with the recipe id, function and language in every test name, so a failure names the configuration. Fakes record calls in plain arrays. The testkit uses `unknown` at the vm boundary and narrows with hand-written guards; no `any`, no `!`, no `as` to silence errors (`.claude/rules/typescript.md`). `vm.runInContext` results are `unknown` until narrowed.
14. **Corrections in play:** 8 (the client reads `data` only after `success`, and the envelope has lowercase keys; the 401 `error` is a JSON string shown as text), 9 (`shell.ajaxSafePost` and its `.fail`), 11 (`toResult` with string and object results, `CloudFlow` has no `Headers`), 13 (the Liquid and HTTP `Server.Context` split; the fake `Context` carries all nine members, and R8 reads `Input` only), 19 (Dataverse is synchronous, so the fake returns values, not Promises; R3, R5, R6 and R9 return Promises), 20 (`StatusCode` 0 takes the failure branch).

## Tasks

### Task 1: Testkit core and the self-test
**Description:** Create `behavior.testkit.ts` with `SENTINEL`, `buildFakeServer` (Decision 3), `runHandler(text, fn, scenario)` (Decision 2), the violation checks the cases share (`loggedSentinel`, `calledConnectorBeforeValidating`, `failureLeaksSentinel`), `CONFIGURATIONS` (Decision 6, with the `pending` flag) and `PENDING_R7` (Decision 10). Then write `harness.selftest.test.ts` (Decision 9, handler half). The testkit exposes the checks as pure functions over a recorded run, so the self-test and the real cases call the same code.
**Red first:** these are tests over merged code, so "red first" means proving each test can fail, as Phase 07 Task 5 does. Here the self-test is that proof for the harness, and it is written before the checks it exercises. Run `harness.selftest.test.ts` against a testkit that exports the check functions as empty stubs (they report no violation) and watch the three "detects a bad handler" tests fail. Then implement the checks and see them pass. Tests:
- "detects a handler that logs the request Body": the bad text runs, the recorded `Server.Logger` calls contain the sentinel, and `loggedSentinel` reports it.
- "detects a handler that calls the connector before validating": invalid input still produces a connector call, and the check reports it.
- "detects a handler that returns the exception message": a thrown `new Error(SENTINEL)` appears in the failure return, and the check reports it.
- "passes a handler that follows the rules": a control text reports no violation from any of the three checks.
- "runs each case in a fresh context": a global set by one run is absent in the next.
- "stops a synchronous infinite loop": a looping text hits the script timeout and the run reports a failure, not a hang.
- "enumerates 36 configurations, 2 of them pending R7": the counts per language are 17 fetch, 17 jQuery, 2 Liquid (R1 and R8); R8 has no fetch or jQuery entry; every fetch and jQuery entry's `fn` equals `METHOD_FUNCTION[method]` for an enabled method (`methodEnabled`).
- "guards that R7 is still a stub": `generateHandler('R7')` throws `not implemented: phase 19`.
**Acceptance criteria:**
- [ ] The harness runs generated text only inside a fresh `node:vm` context holding fakes, with `fn` taken from `recipe.functions` (AC-4.12 harness, Decision 2).
- [ ] The three bad texts are each detected and the control text is not, so the checks can fail (F56, F09).
- [ ] `CONFIGURATIONS` has 36 entries, `PENDING_R7` marks 2, and the R7 stub guard passes (AC-4.12 "36 enabled configurations", Decision 10).
**Verification:** `npx vitest run src/services/generators/behavior/harness.selftest.test.ts`
**Files:** `behavior.testkit.ts`, `harness.selftest.test.ts`
**Scope:** M

### Task 2: Handler cases
**Description:** Write `handlers.behavior.test.ts`. It loops over the 17 non-pending functions, builds the scenario from the recipe's example request, and runs the three cases of Decision 4 plus the extra cases (the exception, F57, validate-first, R9 text fallback, R6 encoding, `contentType`, blocked host) and the sentinel rule of Decision 5. The empty-Body table is a literal table in the test file.
**Red first:** the harness exists (Task 1), so each test is proven able to fail by a temporary local edit that is reverted before the commit: change one expected payload key, one table row (R5 `put` from status only to `data: null`) and one F57 message, see each test fail with a name that identifies the configuration, then restore. Note the three mutations in the commit message body. Tests (names use the recipe id and function):
- "R1 get success returns contacts mapped to id, fullname, email" and the same success test for every function, asserting the payload keys equal `CLIENT_PAYLOAD_KEYS`.
- "<id> <fn> connector failure returns a fixed error and logs once": status `"error"`, non-empty `message`, no `errors`, one `Logger.Error`.
- "<id> <fn> empty Body gives the contract value": one test per row of the Decision 4 table, plus "R4 post reads the id from entityId", "R4 post reads the id from lowercase entityid (F55)" and "R4 post without the id header returns an error".
- "R2 and R8 validation": "R2 rejects a bad name and email with the fields name and email", "R2 empty Body gives the field body", "R8 rejects maximumResults 0, 51, 5.5 and a string with the field maximumResults", "R8 empty Input gives the defaults".
- "<id> <fn> exception from the connector gives a fixed error and no leak".
- "R3, R6 and R9 fail closed on a missing site setting (F57)": exact message, zero connector calls, one log of the name only.
- "<id> <fn> makes no connector call on invalid input" for every function that reads input.
- "R9 returns raw text when Body isn't JSON" and "R9 202 with an empty Body is success with flowResponse null".
- "R6 encodes name in the URL" and "R6 uses & when the setting already has a query".
- "body-sending HttpClient calls pass an allowed contentType" and "R5 put calls PatchAsync".
- "a blocked-host result takes the failure branch (correction 20)" for R3, R5, R6.
- "the string result and the object result both work (correction 11)": one object-result case per connector type (Dataverse, HttpClient, CloudFlow).
- "the sentinel never reaches Server.Logger or a failure return": runs every case's recorded run through the Task 1 checks, so one assertion covers all configurations.
**Acceptance criteria:**
- [ ] Every non-pending function has success, connector failure and empty-Body cases with the contract values (AC-4.12 handler set, FR-3 contract table).
- [ ] The sentinel appears in no log argument and no failure return across all cases (AC-4.12, F09).
- [ ] A missing setting, invalid input and an exception each behave as the Musts say, with zero connector calls where required (F57, FR-3 validate-first).
- [ ] Payload keys equal `CLIENT_PAYLOAD_KEYS` for every function (Phase 10 risk 3).
**Verification:** `npx vitest run src/services/generators/behavior/handlers.behavior.test.ts`
**Files:** `handlers.behavior.test.ts`, `behavior.testkit.ts` (additions only)
**Scope:** M

### Checkpoint 1 (after Tasks 1 and 2)
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run` all green; `git status` shows only files in `src/services/generators/behavior/`. If a handler case exposed a B1 logic slip, the fix is a separate commit in the owning phase's files (Decision 12), never an edited expectation.

### Task 3: Client cases, Liquid renderer
**Description:** Read the merged Phase 10 `client.ts` and its goldens (`fetch-r1-get`, `jquery-r4-del` and the rest) and name the sinks in `CLIENT_SINKS`. Add `runClient(text, clientScenario)` with the fake `shell`, `fetch`, `shell.ajaxSafePost` and `console` (Decision 6), and `renderLiquidSubset(template, result)`. Write `clients.behavior.test.ts` with the three cases for all 34 non-pending configurations, the shared failure cases on all fetch and jQuery configurations, the request-shape checks and the Liquid cases.
**Red first:** the self-test grows by two tests first (the client half of Decision 9): "fails a client that reports an outcome twice" and "renderLiquidSubset rejects an unknown tag", run against empty stubs, red. Then the cases are proven able to fail by temporary local edits, reverted before the commit: break one expected request header name and one `CLIENT_SINKS` entry and see the named configuration fail. Tests:
- "<language> <id> <fn> success reports the payload keys once" (the keys come from `CLIENT_PAYLOAD_KEYS`).
- "<language> <id> <fn> envelope success false shows the error once and never reads data" (correction 8).
- "<language> <id> <fn> status error shows the message once".
- "<language> <id> <fn> token rejection reports once" (fetch: `getTokenDeferred` `.fail`; jQuery: `ajaxSafePost` `.fail`; correction 9).
- "<language> <id> <fn> transport failure reports once" (fetch `.catch`; jQuery `.fail`).
- "<language> <id> <fn> malformed envelope reports once" (fetch `json()` rejects; jQuery response is not an object).
- "fetch <id> <fn> sends /_api/serverlogics/<slug>, the verb and the token header" including GET, and "jquery <id> <fn> sends type, url and contentType".
- "a body is sent only for POST, PUT and PATCH and equals the example body (AC-2.7)".
- "the query is the decoded example query".
- "a 401 envelope whose error is itself a JSON string is shown as text".
- Liquid: "R1 renders contacts with fullname and email escaped (a <b> value is escaped)", "R8 renders its five keys", "an error payload renders result.data.message escaped", "a failed call renders result.status_code (F02)", "the raw_result note is a comment and renders nothing", "renderLiquidSubset throws on an unknown tag", "R8's two snippets both render, the second with input".
**Acceptance criteria:**
- [ ] All 34 non-pending configurations run success, `success: false` and `status: "error"`, each reported exactly once through a named sink (AC-4.12 client set).
- [ ] Token rejection, transport failure and a malformed envelope run on every fetch and jQuery configuration, not once per template (AC-4.12, Decision 6).
- [ ] Request shape matches AC-2.7 and the example requests, with the token header on every fetch verb (FR-2a, Example requests table).
- [ ] The Liquid renderer supports only Phase 10's tags and escapes every value; the three branches are exercised (AC-4.7, F02).
**Verification:** `npx vitest run src/services/generators/behavior/clients.behavior.test.ts src/services/generators/behavior/harness.selftest.test.ts`
**Files:** `clients.behavior.test.ts`, `harness.selftest.test.ts` (client half), `behavior.testkit.ts` (additions)
**Scope:** M

### Task 4: Demo page cases
**Description:** Read the merged Phase 08 goldens (`R4.page.html.txt`, `R5.page.html.txt`, `R6.page.html.txt`) and list the entry functions and the exact jQuery and DOM methods they use in `DEMO_PAGE_API`. Add `runDemoPage(html, pageScenario)` (Decision 7) and write `demoPages.behavior.test.ts` with four cases per page.
**Red first:** the self-test gains "runDemoPage throws on an unlisted method" (red against an empty stub). Then temporary local edits, reverted before the commit: make one expectation say the R4 table changes on `success: false`, and drop one method from `DEMO_PAGE_API`; see each fail. Tests (for R4, R5 and R6 unless stated):
- "<id> page success shows the result" (R4 and R5 also insert, update or remove the row once).
- "<id> page envelope success false shows the error and mutates nothing".
- "<id> page status error shows the message and mutates nothing".
- "<id> page non-JSON data shows the fixed message and mutates nothing".
- "<id> page escapes every record value": a name of `<img src=x onerror=alert(1)>` never appears raw in recorded HTML.
- "<id> page calls ENDPOINT": the URL is `/_api/serverlogics/customer-summary`, with the verb and the token header.
- "R5 page falls back to an empty session when @odata.context has no valid session".
- "R4 page create reads the new id from the payload id".
**Acceptance criteria:**
- [ ] Each of R4, R5 and R6 runs success, `success: false`, `status: "error"` and non-JSON `data` (AC-4.12 demo-page set).
- [ ] R4 and R5 change their table only in the success case (AC-3.9, AC-4.12).
- [ ] No record value reaches the page unescaped, and every call targets `ENDPOINT` (AC-3.9, correction 18).
- [ ] An unlisted jQuery or DOM method throws, so page drift fails loudly (Decision 7).
**Verification:** `npx vitest run src/services/generators/behavior/demoPages.behavior.test.ts`
**Files:** `demoPages.behavior.test.ts`, `harness.selftest.test.ts` (one test), `behavior.testkit.ts` (additions)
**Scope:** M

### Checkpoint 2 (after Tasks 3 and 4)
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run` all green. `git status --short` lists only files in `src/services/generators/behavior/`. `grep -rl "node:vm" src` lists only files in that folder.

### Task 5: R4 option cases (Phase 08 hand-off)
**Description:** Write `r4Options.behavior.test.ts` with the Decision 8 list. It uses the same `runHandler` and a `RetrieveMultipleRecords` scenario that records the option string.
**Red first:** temporary local edits, reverted before the commit: change the expected default from `$top=10` to `$top=20`, and the cap from 50 to 51; see the named tests fail. Tests:
- "appends $top=10 to a list get that has none", "makes $top=10 the whole string when the options are empty or absent".
- "keeps a caller $top of 1, 25 and 50".
- "rejects $top 0, 51, 5.5, 05 and abc with the field additionalParameters" (the 05 case is named as Phase 08's leading-zero rule).
- "rejects a duplicate option", "rejects an option outside select, filter, top, orderby and expand", "rejects a segment that is empty", "rejects 501 characters and accepts 500".
- "a single-record get with id gets no default".
- "a rejected request makes zero connector calls".
- "the accepted option string reaches RetrieveMultipleRecords exactly".
- "an upper-case option name such as $SELECT is rejected" (Phase 08 Decision 8 says lower case).
**Acceptance criteria:**
- [ ] Every F08 rule in FR-3's R4 row has a passing and a failing case (F08, FR-3 R4 row).
- [ ] Errors use the field `additionalParameters` and rejected requests make zero connector calls (FR-3 validate-first).
- [ ] The accepted string reaches `RetrieveMultipleRecords` unchanged, with no leading `?` (correction 6).
**Verification:** `npx vitest run src/services/generators/behavior/r4Options.behavior.test.ts`
**Files:** `r4Options.behavior.test.ts`
**Scope:** S

## Checkpoint 3 (the phase gate)
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run` all green with fresh output. Then `git status --short` lists only the six files named under **Files** (the testkit and five tests), `git diff --stat -- package.json vite.config.ts src/services/generators/handlers src/services/generators/client src/services/catalogue` prints nothing, and `grep -rl "node:vm" src` lists only files under `src/services/generators/behavior/`. Commits use `test(behavior): <message>`.

## Risks and open questions
1. **The harness is not live verification.** The fake `Server` returns what the plan says the runtime returns. AC-4.12's last line and F56 say passing here is not a live check, and Spike S4 stays the gate. `CloudFlow.TriggerAsync` and the `InvokeCustomApi` identity have never run live (Phase 09 risks 4 and 5).
2. **The Liquid renderer is a subset, not real Liquid.** It supports exactly Phase 10's tags and throws on any other, so it catches drift and escaping slips, not Liquid semantics. Real behavior is covered only by the live gate.
3. **Client sink names and demo-page entry names depend on merged Phase 10 and Phase 08 text.** `CLIENT_SINKS` and `DEMO_PAGE_API` are read from the merged goldens in Tasks 3 and 4. If those phases rename an error-display function or an entry function, only the two constants change. The plan can't name them earlier because B1 may adjust them.
4. **A logic slip found here changes the B1 golden and generator, never the expectation table without spec backing.** Phase 07 risk 2 and Phase 08's "mirrored mistakes" risk both point at this phase. Two B1 plan choices are not spec text and are labelled so in the tests: the leading-zero `$top` rejection and the fixed failure messages. If the owner changes either, only that case changes.
5. **`QueryParameters` decoding is assumed (Phase 10 risk 1).** The harness feeds decoded values, so it cannot prove the runtime decodes `URLSearchParams` output. The Spike S4 extension probe stays on the live-gate list.
6. **The 36 count relies on R7 having one function.** `CONFIGURATIONS` derives its entries from `RECIPES`, so if Phase 19 adds a second R7 function the count test fails and must be updated deliberately. Until Phase 19, 2 of the 36 are pending, and the "all 34 fetch and jQuery" shared failure cases run on 32.
7. **Fake result shapes follow Spike S4's string results.** The object-result case per connector covers `toResult`'s other branch, but a real runtime result with extra keys (`IsBinaryBody`, `ServerError`, `ServerErrorMessage`) is not modelled except by adding them to the default fake result. Task 2 adds them to the default, so a handler that reads one by mistake is not hidden.
8. **`node:vm` timeouts cover only synchronous code.** A handler that awaits a Promise that never settles is cut by the test timer, not the vm. The fakes always settle, so this matters only for a future generator bug.
9. **Runtime cost.** About 18 handler functions x 3+ cases, 34 configurations x 6 cases and 3 pages x 4 cases, each in a fresh context. This should stay well under a few seconds. If it doesn't, share one compiled `vm.Script` per text and keep a fresh context per case.

## Done when
- `src/services/generators/behavior/` holds the testkit and five test files, and nothing else in the repo changed (`package.json`, `handlers/`, `client/`, `recipes.ts` untouched).
- The self-test detects all three bad handler texts, a double-reporting client, an unknown Liquid tag and an unlisted demo-page method, and passes the control text.
- All 36 configurations are enumerated, 2 pending R7 and 34 running; each non-pending function has its three handler cases; each non-pending configuration has its three client cases; the shared failure cases run on every non-pending fetch and jQuery configuration; R4, R5 and R6 each run their four demo-page cases; and the R4 option cases pass.
- The sentinel appears in no `Server.Logger` argument and no failure return in any handler case.
- Checkpoint 3 is green with fresh command output, and each task's acceptance criteria are ticked.
- The red-first order is visible in history: the self-test commit precedes the commit of the checks it exercises, and each test commit names the temporary mutation it was proven against.
