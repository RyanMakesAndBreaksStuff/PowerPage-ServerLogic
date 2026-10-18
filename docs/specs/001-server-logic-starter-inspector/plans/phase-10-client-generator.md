# Phase 10: Client generator + request path

**Implements:** FR-2a (client call generation, request path strip, Liquid offered only under the AC-4.7 rule) | **Satisfies:** AC-2.7 (body only for POST, PUT, PATCH), AC-3.8 (R8 two Liquid snippets, Liquid request path), AC-4.4 (the three languages; footer text is Phase 21's), AC-4.5 (fetch), AC-4.6 (jQuery), AC-4.7 (Liquid tag, three branches, `input:`, `raw_result` note; `isLiquidAllowed`), AC-4.8 (request path strip), AC-4.11 (every enabled combination parses); Learn corrections 8, 9, 13 and 15 (and 11 for `data` parsing); F02, F16
**Depends on:** 03 (`readsHttpOnlyContext`), 05 (`getRecipe`, `RECIPES`, `methodEnabled`, `EXAMPLE_GUID`, recipe `examples`, `liquid`, `readsLiquidInput`)
**Files:**
- Replace the Phase 00 stub: `src/services/generators/client/client.ts`.
- Create tests: `src/services/generators/client/client.test.ts` (guards, `isLiquidAllowed`, `requestPathSteps`), `client.golden.test.ts`, `client.liquid.test.ts` (includes the hand-written Liquid syntax checker), `client.matrix.test.ts` (AC-4.11 over all 36 enabled configurations, plus shared-template invariants). Overwrite any Phase 00 placeholder at those paths.
- Create goldens in `src/services/generators/client/__golden__/` (11 files, listed in Decision 10).
- Edits no other file. `src/app/starter-session/starterDeps.ts` needs **no change** (Decision 12).

**Interfaces:**
- **Consumes** (exact names): `HttpMethod`, `METHOD_FUNCTION`, `ClientLanguage` (`@/types/http`); `RecipeId`, `RecipeMeta`, `ExampleRequest` (`@/types/recipe`); `getRecipe`, `RECIPES` (`@/services/catalogue/recipes`); `readsHttpOnlyContext(code: string): boolean` (`@/lib/code-analysis/structure`, Phase 03). Tests also use `acorn` (installed in Phase 00) and `EXAMPLE_GUID`.
- **Produces:** the three pinned functions, signatures unchanged from the stub: `generateClient(i: { slug: string; recipe: RecipeId; fn: string; method: HttpMethod | null; language: ClientLanguage }): string`, `requestPathSteps(language: ClientLanguage, slug: string, fn: string): readonly { label: string; value: string }[]`, `isLiquidAllowed(recipe: RecipeMeta, serverText: string): boolean`. Plus two additive exports from the same file: `CLIENT_PAYLOAD_KEYS: Readonly<Record<string, readonly string[]>>` (keyed `<recipeId>.<fn>`, read by Phase 17 to check handler payloads) and `LIQUID_SERVER_NOTE: string` (the AC-4.7 server-pane note, rendered by Phase 21).

Phase 10 turns a slug, recipe, function, method and language into the text of the client call pane, the five- or four-step request path strip, and the "is Liquid allowed" answer that the session already injects. All three are pure and deterministic, and the generator never evaluates anything it builds. fetch and jQuery share one envelope-handling block (check `success`, show `error`, parse `data` in a try/catch, branch on `status`), so the AC-4.12 "shared client implementation" claim stays true. Only the URL, verb, body and the success-payload line vary per recipe. Liquid is a separate branch with its own template.

## Decisions

1. **Query strings are emitted through `URLSearchParams`, not hand-encoded.** The spec's example queries (`?entitySetName=contacts&additionalParameters=$select=fullname,emailaddress1`, `?username=altonstott&serviceSession=(S(abc123))`) hold characters such as `$`, `=`, `,` and `(` raw, and Phase 05 stored them verbatim and left encoding to this phase. The generator splits the stored query on `&`, then on the first `=` only, and emits `new URLSearchParams({ key: value, ... })` with each key and value as a `JSON.stringify` literal; the URL is the endpoint plus `"?" + params`. Reasons: a raw `&` inside an `additionalParameters` value (R4 allows `&`-separated segments) would otherwise split into separate parameters; the maker can edit a readable object; and it needs no encode calls the maker must keep in sync. No query means the URL is the plain endpoint with no `URLSearchParams`. The runtime decoding of `QueryParameters` is unverified (Risk 1).
2. **`method` and `fn` must agree; `null` method means Liquid only.** For fetch and jQuery, `method` must be non-null and `METHOD_FUNCTION[method] === fn`, else `generateClient` throws an `Error` with a plain message (a wiring bug, never a user state: the reducer and `methodEnabled` already prevent it). `method: null` (R8) with fetch or jQuery throws "not callable over HTTP". For Liquid, `method` is ignored. An `fn` with no `recipe.examples[fn]` throws. `Liquid` for a recipe whose `liquid` is false throws too; callers gate on `derived.liquidAllowed`. The text-dependent half of the rule cannot be checked here because the signature carries no server text.
3. **Body rule (AC-2.7) follows the method, the content follows the example.** POST, PUT and PATCH emit `JSON.stringify(<literal>)`, where the literal is the example body rendered with `JSON.stringify(body, null, 2)` and re-indented. GET and DELETE emit no body and no `data`. A body method whose example body is `null` (R7 until Phase 19 replaces its entry) emits `{}`, so the output still parses and still carries a body.
4. **fetch shape (AC-4.5), fixed order.** (a) a header comment naming the slug, verb and function; (b) a `const url` for the endpoint, preceded by the `URLSearchParams` lines when there is a query; (c) a small error-display function that the maker replaces; (d) `shell.getTokenDeferred().done(...)` containing the `fetch(url, { method, headers, body? })` call, with the `__RequestVerificationToken` header on every method including GET (spike S4) and `Content-Type: application/json`; (e) the shared envelope block (Decision 5); (f) `.catch(...)` on the fetch promise for transport and unreadable-envelope failures; (g) `.fail(...)` on the token deferred for token rejection. Item (g) goes beyond AC-4.5's text; AC-4.12 requires a fetch token-rejection case, which has no meaning without it (Risk 4).
5. **Shared envelope block.** Used by fetch and jQuery with identical text: if `success` is false, show `error` as text and stop (the 401 `error` is itself a JSON string and is shown as-is); otherwise `JSON.parse(data)` inside try/catch (correction 8: `data` is read only after `success` is true); if `status` is not `"success"`, show `message`; otherwise a success line that logs the recipe's payload keys. Payload keys come from `CLIENT_PAYLOAD_KEYS`, built from the FR-3 contract table: R1 `contacts`; R2 `name`, `email`; R3 `data`; R4 `get` `data`, `post` `id`, `put` and `del` none; R5 `get` and `post` `data`, `put` and `del` none; R6 `message`; R7 `id`; R9 `flowResponse`; R10 `data` for `get`, `post`, `patch`; R8 `category`, `maximumResults`, `activityId`, `functionName`, `serverLogicName`. Functions with no payload log a plain "done" line. A drift test pins every key to the contract table, and Phase 17 asserts the handlers return the same keys.
6. **jQuery shape (AC-4.6, correction 9, correction 15).** One `shell.ajaxSafePost({ type, url, contentType, data?, success })` call, then `.fail(...)` once for token and transport failures. No `error` option. The option lines are built as a list and joined with commas, so a comma can never go missing: `contentType` is emitted for every method (as Learn's DELETE sample does, which is where its missing comma was) and `data` only for POST, PUT, PATCH. `success` reuses the Decision 5 block.
7. **Liquid shape (AC-4.7, AC-3.8, correction 13).** The tag is `{% serverlogic name: '<slug>', operation: '<fn>', [input: '<json>',] output: result %}`; the three attributes `name`, `operation` and `output` are always present, `input` is added when `recipe.readsLiquidInput` (R8 only), with the example's `liquidInput` as a single-quoted string. The result is branched exactly as the spec says: `{% if result.success and result.data.status == 'success' %}` renders the payload with every value `| escape`d; `{% elsif result.success %}` renders `result.data.message | escape`; `{% else %}` renders `result.status_code`; `{% endif %}`. A `{% comment %}` states that `result.raw_result` holds the unparsed output when the handler returns non-JSON. Payload markup exists only for R1 (`contacts` list of `fullname` and `email`) and R8 (the five keys); other recipes are not Liquid-enabled (Decision 2). Slugs contain only `a-z0-9-`, so single quotes cannot break the tag.
8. **R8 yields two snippets in one string (AC-3.8).** The Liquid text for R8 is two tag blocks, each introduced by a `{% comment %}` label using Learn's titles ("Invoke server logic without input" and "Pass input to server logic"), separated by one blank line. The "without input" block omits `input:`. R1 yields a single block.
9. **Request path steps (AC-4.8).** Label/value pairs, `<fn>` being the function argument as given (so `del`, `getSummary`). fetch: Page script `fetch()`; Token `__RequestVerificationToken`; Endpoint `/_api/serverlogics/<slug>`; Handler `function <fn>()`; Returns `JSON string`. jQuery: the same, with Page script `shell.ajaxSafePost()`. Liquid (four steps, no token): Page render `Liquid page`; Tag `serverlogic`; Handler `function <fn>()`; Returns `result object`. Values follow the 10a reference (`fetch()` pill). The array order is the display order.
10. **Golden matrix: 11 files, one per variation axis, not one per combination.** Named `<language>-<recipe>-<fn>.<ext>.txt` in `__golden__/`, hand-written from this plan and the spec before the generator exists, read with `readFileSync`, compared with `toBe`, never snapshot-updated. fetch (5): `fetch-r1-get`, `fetch-r2-post` (body), `fetch-r4-get` (raw `$` and `,` through URLSearchParams), `fetch-r4-put` (query plus body), `fetch-r5-del` (parentheses, no body). jQuery (4): `jquery-r1-get`, `jquery-r2-post`, `jquery-r4-del` (the correction 15 commas), `jquery-r10-patch` (PATCH, query plus body). Liquid (2): `liquid-r1-get`, `liquid-r8-getsummary` (two snippets, `input:`). That is every verb and body/no-body/query/no-query pairing at least once per language without 36 near-identical files; the other 25 combinations are held by the matrix test (Task 6), which also asserts the shared envelope block is byte-identical across all fetch outputs, and across all jQuery outputs. Output is LF with exactly one final newline.
11. **No new dependency; Liquid syntax is checked by a hand-written test helper.** Phase 00 owns `package.json` and installs no Liquid parser, so `client.liquid.test.ts` carries a small checker: every `{%` closes with `%}`, `if`/`elsif`/`else`/`endif` and `comment`/`endcomment` balance, and each `serverlogic` tag has only the keys `name`, `operation`, `input`, `output`, with `name`, `operation`, `output` required and string values single-quoted. fetch and jQuery are parsed with `acorn` at ECMAScript 2023 (script mode). Generated client text is never evaluated in product code; Phase 17 runs it in `node:vm`.
12. **`starterDeps.ts` needs no edit.** It already imports `isLiquidAllowed` from `@/services/generators/client/client` and puts it in `STARTER_DEPS`; the type matches the pinned signature (`skeleton.test.ts` pins it). It throws today only because the stub does. Once Task 1 lands, the reducer (Part A) gets the real rule with no change. Phase 10 adds one wiring assertion in `client.test.ts` that `STARTER_DEPS.isLiquidAllowed` behaves as the rule on a Body-reading text, and does not edit `deriveStarter.ts`, `starterReducer.ts` or `fakeStarterDeps.ts` (the fake keeps its Body-only shortcut; that is a Part A test helper).
13. **`isLiquidAllowed` is exactly two conditions (AC-4.7, F16).** `recipe.liquid && !readsHttpOnlyContext(serverText)`. No second parser, no member list of its own, no check on `async` (spike S4: async operations work from Liquid). When `recipe.liquid` is false the text is not analysed.
14. **Generator hygiene.** Pure functions, no `Date`, no randomness, no `.replace` with a replacement string built from example text (a `$` in `$select` is a replacement pattern). Every literal goes through `JSON.stringify`; templates are joined line arrays, not string concatenation chains. The Liquid note constant and all comments contain no FR-4 words (the client is page code, but the same wording keeps copy-paste into custom JS safe).

## Tasks

### Task 1: `isLiquidAllowed`
**Description:** Replace the stub with the two-condition rule from Decision 13, reusing Phase 03's `readsHttpOnlyContext`. Add the `STARTER_DEPS` wiring assertion from Decision 12.
**Red first:** `client.test.ts`, describe "isLiquidAllowed": "R1 with text reading no Context members is allowed"; "R8 with text reading `Server.Context.Input` and `ActivityId` is allowed"; "any recipe with `liquid: false` is refused even for clean text" (R3, R4); "an allowed recipe is refused when the text reads `Body`, `Headers`, `HttpMethod`, `QueryParameters` or `Url`" (table over the five); "an `async` function does not refuse it"; "a comment or string mentioning `Server.Context.Body` does not refuse it"; "STARTER_DEPS.isLiquidAllowed refuses a Body-reading R1 text".
**Acceptance criteria:**
- [ ] Liquid is allowed only when the recipe is Liquid-enabled and the text has no HTTP-only member (AC-4.7).
- [ ] An edited or inserted text is judged on the text passed in, not the recipe's original handler (AC-4.7 "current server text").
- [ ] Liquid-only members (`Input`) and shared members never refuse it (correction 13).
**Verification:** `npx vitest run src/services/generators/client/client.test.ts -t "isLiquidAllowed"`
**Files:** `client.ts`, `client.test.ts`
**Scope:** XS

### Task 2: `requestPathSteps`
**Description:** Implement Decision 9 as a pure function returning fresh arrays.
**Red first:** `client.test.ts`, describe "requestPathSteps": "fetch gives the five AC-4.8 steps in order with the slug and `function get()`"; "jquery differs only in the Page script value"; "liquid gives four steps and no step labelled Token"; "`del` and `getSummary` appear as `function del()` and `function getSummary()`"; "an `untitled` slug is shown as given".
**Acceptance criteria:**
- [ ] fetch and jQuery return exactly Page script, Token, Endpoint, Handler, Returns with the AC-4.8 values (AC-4.8).
- [ ] Liquid returns Page render, Tag, Handler, Returns with no token step (AC-4.8, AC-3.8).
- [ ] The endpoint value is `/_api/serverlogics/<slug>` for the slug passed (AC-2.4).
**Verification:** `npx vitest run src/services/generators/client/client.test.ts -t "requestPathSteps"`
**Files:** `client.ts`, `client.test.ts`
**Scope:** XS

### Task 3: fetch client
**Description:** Add the request model (guards from Decision 2, query parsing and `URLSearchParams` lines from Decision 1, body rule from Decision 3, `CLIENT_PAYLOAD_KEYS` from Decision 5) and the fetch template (Decision 4). Write the five fetch goldens first, by hand, from Decisions 1, 3, 4 and 5.
**Red first:** `client.golden.test.ts`, describe "fetch": five tests, each reading its golden and asserting `generateClient` output `toBe` it (names `fetch-r1-get`, `fetch-r2-post`, `fetch-r4-get`, `fetch-r4-put`, `fetch-r5-del`). `client.test.ts`, describe "generateClient guards and body rule": "GET and DELETE contain no `body:` and no `JSON.stringify(` (AC-2.7)"; "POST, PUT and PATCH (R4 post and put, R10 patch) contain `JSON.stringify(` (AC-2.7)"; "every verb sends the `__RequestVerificationToken` header, GET included"; "method null with fetch throws"; "method and fn mismatch throws"; "unknown fn throws"; "R7 post, whose example body is null, emits a `{}` body"; "the `$select` text survives unchanged in the output"; "output is LF only and ends with one newline"; "same input twice gives the same string"; "`CLIENT_PAYLOAD_KEYS` has an entry for every recipe function and matches the FR-3 contract table".
**Acceptance criteria:**
- [ ] fetch calls `/_api/serverlogics/<slug>` inside `shell.getTokenDeferred().done(...)` with the verb and token header, checks `success`, shows `error`, parses `data` in try/catch and branches on `status` (AC-4.5, correction 8).
- [ ] A body appears only for POST, PUT and PATCH, using the recipe example (AC-2.7, FR-2a).
- [ ] Example query values are passed through `URLSearchParams` unchanged by the generator, with no regex-replace corruption of `$` (Decisions 1 and 14).
**Verification:** `npx vitest run src/services/generators/client/client.golden.test.ts src/services/generators/client/client.test.ts`
**Files:** `client.ts`, `client.test.ts`, `client.golden.test.ts`, five `__golden__/fetch-*.js.txt`
**Scope:** M

### Task 4: jQuery client
**Description:** Add the jQuery template (Decision 6) reusing the Task 3 request model and the shared envelope block. Write the four jQuery goldens first.
**Red first:** `client.golden.test.ts`, describe "jquery": four golden comparisons (`jquery-r1-get`, `jquery-r2-post`, `jquery-r4-del`, `jquery-r10-patch`). `client.test.ts`: "jquery uses `shell.ajaxSafePost` and never `shell.safeAjax` or `$.ajax` (correction 9)"; "jquery has exactly one `.fail(` and no `error:` option (AC-4.6)"; "jquery DELETE output parses with acorn and has `contentType` followed by a comma or by the closing brace of the options, never by a missing separator (correction 15)"; "jquery GET and DELETE have no `data:` key, POST, PUT, PATCH have one (AC-2.7)".
**Acceptance criteria:**
- [ ] jQuery calls `shell.ajaxSafePost({ type, url, contentType, data?, success }).fail(...)` with `success` handling the envelope as fetch does (AC-4.6, correction 9).
- [ ] The DELETE sample parses as JavaScript (correction 15, AC-4.11).
- [ ] Token and transport failures are reported once, from `.fail()`, with no `error` option (AC-4.6).
**Verification:** `npx vitest run src/services/generators/client`
**Files:** `client.ts`, `client.test.ts`, `client.golden.test.ts`, four `__golden__/jquery-*.js.txt`
**Scope:** S

### Task 5: Liquid client and syntax checker
**Description:** Add the Liquid template (Decisions 7 and 8), export `LIQUID_SERVER_NOTE` (needs no token; reads `Server.Context.Input` rather than `Body` or `QueryParameters`; long operations delay page rendering), and write the helper checker from Decision 11 inside `client.liquid.test.ts`. Write the two Liquid goldens first.
**Red first:** `client.liquid.test.ts`: "the checker accepts a known-good tag and rejects an unclosed `{%`, an unbalanced `if`, an unknown attribute key, a missing `output`" (proves the helper fails when it should); "R1 output matches `liquid-r1-get`"; "R8 output matches `liquid-r8-getsummary` and has two tags, only the second with `input:`"; "the three branches appear in order and every `result.data` read is piped through `escape` (F02)"; "the `raw_result` note is present"; "method is ignored for Liquid"; "an R3 Liquid request throws (Decision 2)"; "`LIQUID_SERVER_NOTE` mentions no token, `Server.Context.Input`, and delayed rendering (AC-4.7)".
**Acceptance criteria:**
- [ ] Liquid emits `{% serverlogic name:, operation:, [input:,] output: result %}` with the three F02 branches and the `raw_result` note (AC-4.7).
- [ ] R8 shows the without-input and with-input snippets (AC-3.8).
- [ ] The Liquid output passes the tag checker for every Liquid-enabled recipe (AC-4.11).
**Verification:** `npx vitest run src/services/generators/client/client.liquid.test.ts src/services/generators/client/client.golden.test.ts`
**Files:** `client.ts`, `client.liquid.test.ts`, `client.golden.test.ts`, two `__golden__/liquid-*.liquid.txt`
**Scope:** S

### Task 6: The 36-configuration matrix and the wiring check
**Description:** Add the exhaustive AC-4.11 test and the shared-template invariants. Enumerate `RECIPES` by function and language, include Liquid only where `recipe.liquid`, skip fetch and jQuery for R8, derive the method from `METHOD_FUNCTION` by function name.
**Red first:** `client.matrix.test.ts`: "the enumeration yields 36 configurations (AC-4.12 count)"; "every fetch and jQuery output parses with acorn at ecmaVersion 2023, DELETE included (AC-4.11, correction 15)"; "every Liquid output passes the tag checker (AC-4.11)"; "removing each output's URL, verb, body and payload lines leaves an identical envelope block across all fetch outputs, and across all jQuery outputs (shared template, AC-4.12)"; "no output contains `$pages.ajax` (FR-2a Must not)"; "no output contains CRLF".
**Acceptance criteria:**
- [ ] All 36 enabled combinations parse as JavaScript or as a valid `serverlogic` tag (AC-4.11).
- [ ] The envelope block is identical across a language's outputs, so Phase 17's shared failure cases stay valid (AC-4.12).
- [ ] No `$pages.ajax` anywhere (FR-2a).
**Verification:** `npx vitest run src/services/generators/client`
**Files:** `client.matrix.test.ts` (and `client.ts` only if a failure exposes a generator bug)
**Scope:** S

## Checkpoint
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run`. All four are green with the stub replaced. `STARTER_DEPS.isLiquidAllowed` no longer throws, so Part A's session tests that import the real deps can run. Goldens use the `.txt` suffix and are untouched by ESLint, Prettier and tsc. No snapshot flags are used anywhere.

## Risks and open questions
1. **QueryParameters decoding is unverified.** `URLSearchParams` percent-encodes `$`, `,`, `(` and writes spaces as `+`. If `Server.Context.QueryParameters` hands the handler the raw encoded text, R4's `additionalParameters` and R5's `serviceSession` would fail validation. No spike probed it. Mitigation: Phase 17 cannot prove it (fake `Server`); add a read-QueryParameters probe to the next live gate (Spike S4 extension) before release. If it fails, the fix is local to Decision 1 (emit the spec's raw query strings).
2. **Who renders the AC-4.7 server-pane note** is not stated. This plan exports `LIQUID_SERVER_NOTE` for Phase 21 to show when Liquid is selected. Confirm, or move the note into the Liquid client text.
3. **`CLIENT_PAYLOAD_KEYS` can drift from the handlers** built in Phases 07, 08, 09 and 19. Phase 17's success case must assert handler payload keys equal this table. Phase 19 adds R7 `id` only if S3 keeps that key.
4. **The fetch token-failure handler (Decision 4g) goes beyond AC-4.5's wording.** It is required for AC-4.12's token-rejection case. If the owner prefers the spec text kept strictly, amend AC-4.5 in a spec update rather than dropping the handler.
5. **Liquid validity is checked by a small hand-written checker,** not a real Liquid parser. It catches malformed tags, branch imbalance and bad keys, not template semantics. Real behaviour is covered only by the live gate (spike S4 already ran `serverlogic` with `output`, `name`, `operation`, `input`).
6. **R7's example body is null until Phase 19,** so its POST client shows `{}`. Phase 19 changes `recipes.ts` only; no Phase 10 golden covers R7, so nothing here needs re-editing.

## Done when
- [ ] Both stubs (`generateClient`, `requestPathSteps`) and `isLiquidAllowed` are real, with the pinned signatures unchanged, and `CLIENT_PAYLOAD_KEYS` and `LIQUID_SERVER_NOTE` exported.
- [ ] 11 hand-written goldens match byte for byte; all 36 enabled configurations pass the AC-4.11 matrix.
- [ ] `starterDeps.ts`, `recipes.ts`, `handlers/` and `package/` are untouched; `git diff --stat` shows only `client/` files.
- [ ] The checkpoint commands pass with zero warnings, and Risks 1 and 2 are on the owner's list.
