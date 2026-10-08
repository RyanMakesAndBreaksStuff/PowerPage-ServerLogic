# Feature 001: Power Pages Server Logic — Logic Starter & Logic Inspector

**Status:** Draft
**Version:** 0.6.0
**Created:** 2026-10-06
**Updated:** 2026-10-08
**Branch:** `001-server-logic-starter-inspector`
**Design source:** `design_handoff_server_logic_tools/` (README + references 01–06). High fidelity: the colours, type, spacing and copy in the handoff are final.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-10-06 | Initial draft. |
| 0.2.0 | 2026-10-07 | Aligned with the design handoff. Added: all 5 HTTP methods, Server Objects reference, client call pane (fetch/jQuery/Liquid), request path strip, 7 recipes (3 core + 4 Learn tutorials), editable handler with Insert-from-sample, Mark as reviewed, export dialog with Markdown **and PDF** in File and Site scopes, a site summary report and Learn-verified API corrections. Replaced name validation with slugify. Removed the shipped browser-check script; checks now run in the app. |
| 0.3.0 | 2026-10-07 | Spec review (sdd-review, Mode A) fixes, re-verified against Microsoft Learn on 2026-10-07. **FR-4:** defined matching semantics and a must-flag / must-not-flag table. **FR-7:** added a data-source table and a plan-time metadata spike (Learn doesn't document the `mspp_*` tables). **Open questions:** resolved theme, Inspector background and `User`/`Website` members; moved the rest to Assumptions. **Rules:** table-permissions "nothing to check" case, whether Reviewed counts as configured, "Not scanned" state, a mismatched method on single-function recipes, Ready definition, `TimeoutInSeconds`. **New ACs:** AC-2.10, AC-4.11, AC-5.10–5.11, AC-7.8–7.11, AC-8.10–8.12. **New FR:** FR-2a. **Goal verification:** the 5-minute goal now has a timed walkthrough. **Learn corrections 11–16 added** (connector responses are JSON strings, HttpClient content types, Liquid vs HTTP context, comment-text risk, Learn's invalid jQuery DELETE sample). |
| 0.4.0 | 2026-10-07 | Recipes now cover every sample on the Learn overview, author, server objects and four tutorial pages: **10 recipes** (R8 Liquid invocation, R9 cloud flow, R10 Dataverse custom API added). Tutorial recipes R4–R6 also ship Learn's demo web page as `<slug>.page.html`. Rebuilt R4–R7 against the full tutorial text. Added **Learn corrections 17–18** (tutorial sample defects and what the recipes do instead), AC-3.7–3.10, Spike S3 and a GitHub sample reference. |
| 0.5.0 | 2026-10-07 | Fixes from the second spec review (`001-server-logic-starter-inspector-review.md`), cross-checked against Learn and Microsoft's `power-platform-skills` plugin. **Corrections:** 8 rewritten (the envelope is lowercase: `success`, `data`), 11 rewritten (generated handlers accept a connector result as a string or an object), 14 extended (the runtime regex `with\s*\(` matches inside strings), and 19 added (Dataverse connector methods are synchronous). **FR-3:** a recipe contract table (inputs, validation, return shape, access type, logical and entity set names, whether Liquid is supported), and fail-closed handling of a missing site setting. **FR-4:** a general whitespace rule, `import … from`, and T15–T17. **FR-7:** facts from the enhanced data model are now verified on Learn; S1 is narrowed and S2 widened; Spike S4 is new. **FR-9:** the Web role check flags any assignment that *includes* the anonymous role; Outbound has a "no outbound calls in code" case and a settings decision table. **FR-11:** the site ring falls back to proportional arcs; four colour tokens are adjusted for AA (A8). Smaller fixes to AC-2.6, 2.8, 3.2, 3.7, 4.5–4.7, 4.11, 5.10, 5.11, 6.5, 6.8, 6.9, 7.2, 7.6, 8.8, 8.9, 9.2, 9.3, 9.4, 9.6, plus the error scenarios. |
| 0.6.0 | 2026-10-08 | Fixes agreed in the Opus/Sol review debate (`Opus-review-of-Sol-review.md`, `Opus_debate_round1_opus_rebuttal.md`, `Opus_Sol_Debate_Round2_Sol_reponse.md`). **Generated handlers:** a logging rule that never logs bodies, exception messages, URLs or tokens (F09); R7 HTML escaping, ActivityId-prefixed ticket names, `conflictBehavior=fail`, stage-specific failures and explicit retry consequences (F05, F06); R4 option rules, with a `$top` default of 10 and a cap of 50 (F08). **Starter:** Permissions review is tied to the reviewed server text (F13, F15); the Liquid rule uses every HTTP-only property (F16); Insert only at a statement position, with a trial parse and a Copy fallback (F17); slug cap, device names and a collision warning (F21, AC-2.11). **Inspector:** token-based connector detection where "couldn't determine" overrides the no-use outcomes (F24, row O0); inactive table permissions and ancestors are ignored, and an unresolved parent chain is Needs review (F26). **Reports:** the scan interval, plus a statement that the scan isn't an atomic snapshot (F37). **Tests:** a behavior harness, shared client failure fixtures and per-demo-page cases (F56, AC-4.12). **Spikes:** S1 adds parent links and the name limit; S3 adds a collision probe. Added Out of Scope items and the appendix dispositioning all 59 review findings. |

---

## Problem Statement

Power Pages server logic lets makers run JavaScript on the server, protected by web roles and table permissions, with outbound calls governed by site settings and tenant policy. Getting from an idea to a working handler is slow. Makers have to learn the `Server.*` object model, which browser APIs and keywords are blocked, how the client calls the endpoint with a CSRF token, and how to wire up web roles and table permissions across several studios. Access gaps are easy to miss, such as a Global table permission, write privileges on a read handler, a missing web role or unrestricted outbound domains. Often nobody notices them until the logic is live.

## Goals

- A maker can go from a blank start to a downloaded starter package in under 5 minutes without consulting external documentation. *Verified by a timed walkthrough with 3 makers who haven't used the tool: median ≤ 5 minutes, no external documentation opened.*
- Each `Server.*` object and method is documented in-app with an insertable sample that matches Microsoft Learn.
- Every Microsoft Learn server logic tutorial, and every scenario sample on the Learn overview, author and server objects pages, is available as a one-click recipe (R4–R10). One-line reference snippets are insertable samples in Server Objects.
- Before release, a maker can see which server logic files on a development site have web role, table permission or outbound networking gaps.
- Every Inspector finding states plainly whether it was confirmed from configuration, needs review or was manually reviewed.
- Reviews can be shared as Markdown or PDF reports, per file or for the whole site.

## Non-Goals

- Writing, publishing or changing anything in the environment or site. Starter only produces downloads; Inspector is read-only.
- Running, testing or debugging server logic at runtime.
- Confirming effective access for a real site user. Inspector reviews configuration, not runtime behavior.
- Reading or evaluating the tenant-level outbound network governance policy. It is always shown as "not verified".
- Verifying that hand-edited handler code still validates its input.

## Users and Context

**Primary users:** Power Pages makers and pro developers building server logic on a development site.
**Secondary users:** Reviewers or leads who receive exported reports (pasted into a PR or work item, or as a PDF for sign-off).
**Usage context:** One window, **Server Logic Tools**, with two top-level tabs:
- **Logic Starter**, with two sub-tabs: *Create Logic* and *Server Objects*.
- **Logic Inspector.**

Starter is used at the start of a handler; Inspector is used before promoting a site or opening a release PR.
**Host:** v1 ships only as a Power Platform ToolBox (PPTB) tool. The environment comes from the host's active connection, and the host handles sign-in. The code lives in a mono-repo so other hosts can be added later.
**User mental model:** Users already think in Power Pages terms: *server logic*, *web role*, *table permission*, *access type*, *Anonymous Users / Authenticated Users roles*, *allowed domains*, *`Server.*` objects*, *entity set name*. The tool uses this vocabulary unchanged.

## Reference Documentation (source of truth for generated code)

| Topic | Link |
|---|---|
| Server logic overview: methods → functions, API URL, site settings | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-overview |
| Author server logic: client calls, Liquid invocation, limitations | https://learn.microsoft.com/en-us/power-pages/configure/author-server-logic |
| Server objects | https://learn.microsoft.com/en-us/power-pages/configure/server-objects |
| Tutorial: Dataverse tables | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-operations |
| Tutorial: External services | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-external-services |
| Tutorial: Azure Function HTTP trigger | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-azure-function |
| Tutorial: Microsoft Graph and SharePoint | https://learn.microsoft.com/en-us/power-pages/configure/server-logic-graph-sharepoint |
| `serverlogic` Liquid tag | https://learn.microsoft.com/en-us/power-pages/configure/liquid/liquid-objects#serverlogic |
| Disable external service calls (tenant governance) | https://learn.microsoft.com/en-us/power-pages/security/disable-external-service-calls |
| Security best practices (server logic authorization) | https://learn.microsoft.com/en-us/power-pages/security/security-best-practices |
| Graph/SharePoint sample package (script lives in `event-registration.zip`) | https://github.com/microsoft/power-pages-samples/tree/main/samples/server-logic/sharepoint-integration |
| Site Component (`powerpagecomponent`) and Web Role (`mspp_webrole`) table references | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/powerpagecomponent |
| *Secondary (Microsoft-authored, not Learn):* `add-server-logic` skill and its frontend integration reference. Used only where Learn is silent or contradicts itself (corrections 8, 11, 14, 19) | https://github.com/microsoft/power-platform-skills/tree/main/plugins/power-pages/skills/add-server-logic |

### Design vs. Microsoft Learn: corrections that apply

Where the mocks and Learn disagree, Learn wins. The visual design still applies.

1. **DELETE handler function is `del()`**, not `delete()`. `delete` is a reserved word and is on the restricted list. The helper line reads "Exports `function del()`".
2. **Logger methods** are `Log`, `Warn` and `Error`; the mock's "Warning" is wrong.
3. The object is **`Server.SiteSetting`** (`Get`), not "Sitesetting".
4. **`Server.Connector.CloudFlow`** (`TriggerAsync`) is a documented object that the mock list omits. It's added, so there are 9 objects.
5. **`Server.Context` properties** follow Learn: ActivityId, Body, FunctionName, Headers, HttpMethod, Input, QueryParameters, ServerLogicName, Url.
6. **OData options** passed to `RetrieveRecord` / `RetrieveMultipleRecords` follow Learn's form: `"$select=…&$top=…"`, with no leading `?`.
7. **`HttpClient` methods and `CloudFlow.TriggerAsync` are asynchronous.** Handlers that use them are generated as `async function` and use `await`.
8. **Client responses are wrapped** in an envelope, and its keys are **lowercase**: `{ requestId, success, serverLogicName, data, error }`. Client samples check `success`, read `error` on failure, and read `data`, which is the string the handler returned. Learn contradicts itself here. The Author page's example response uses PascalCase (`Success`, `Data`), but all three tutorial demo pages read lowercase `res.data` / `resp.data` / `data?.data`, and Microsoft's `add-server-logic` frontend reference documents the lowercase envelope. The lowercase form is used; Spike S4 confirms it on a live site. On failure, `success` is `false`, `data` is `null` and `error` holds the message.
9. **The jQuery client variant uses `shell.safeAjax`** (per Author server logic). The fetch variant uses `shell.getTokenDeferred()` plus the `__RequestVerificationToken` header (per the tutorial's CSRF wrapper).
10. **Prototype 06's generated code is not a reference.** Its `context.table(...)` and `fetch()` calls are invalid in server logic; README §01 and Learn are the references.
11. **Connector results have the shape `{ StatusCode, Body, IsSuccessStatusCode, ReasonPhrase, ServerError, ServerErrorMessage, Headers }`** (`CloudFlow` has no `Headers`), and `Body` is a JSON string. Sources disagree on whether the result itself is a string: Learn's `CloudFlow` sample calls `JSON.parse(response)`, but Microsoft's `add-server-logic` reference reads `dvResponse.Body` directly. Generated handlers therefore normalise it with one helper, `const toResult = r => typeof r === "string" ? JSON.parse(r) : r;`. They then check `IsSuccessStatusCode`, log `ReasonPhrase` on failure, and parse `Body` only on success and only when it isn't empty. Spike S4 confirms the actual type. On the client, the envelope's `data` is the string the handler returned, so generated client code `JSON.parse`s it (FR-3 contract table).
12. **`HttpClient` request bodies support only `application/json`, `text/html` and `application/x-www-form-urlencoded`.** Generated calls pass one of these as `contentType`. Signatures are `GetAsync(url, headers)`, `DeleteAsync(url, headers)`, and `PostAsync`/`PutAsync`/`PatchAsync(url, body, headers, contentType)`.
13. **Liquid and HTTP expose different `Server.Context` properties.** `ActivityId`, `FunctionName` and `ServerLogicName` exist in both. `Body`, `Headers`, `HttpMethod`, `QueryParameters` and `Url` are HTTP only. `Input` is Liquid only. A handler invoked from Liquid reads `JSON.parse(Server.Context.Input || "{}")`.
14. **The restricted-pattern list is matched by Learn's validator, whose exact rules aren't documented.** Learn's own sample warns that the `delete` keyword "should not be used in script file", and its sample comments are written around that. Inspector therefore treats pattern text inside comments and strings as a risk, not as safe (FR-4). One rule is confirmed outside Learn: Microsoft's `add-server-logic` skill reports that the runtime rejects the regex `with\s*\(` **anywhere in the file**, including inside string literals. The rejection appears as `RTSL01: Script validation failed: prohibited pattern found`, and the function doesn't run. So the OData filter text `"startswith(name,'a')"` inside a string breaks the script. Generated code splits such literals (`"startswith" + "(name,'a')"`), and FR-4 treats `with(` in any position as Blocked.
15. **Learn's jQuery DELETE example is invalid JavaScript** (a comma is missing after `contentType`). The generated client sample must parse.
16. **`Server.User` returns `null` for anonymous callers**, so samples guard `Server.User` before reading `fullname`. `Server.SiteSetting` is for secrets and endpoints; Learn says to hold secrets in Azure Key Vault, surface them through an environment variable, and reference them through a site setting.
17. **Defects in Learn's tutorial server code**, which the recipes fix and list under "Differences from Learn" (AC-3.7):
    - *Dataverse tutorial:* the handler takes `entitySetName` and `id` straight from the query string, so any caller can pick any table, limited only by table permissions. The recipe uses an allowlist and a GUID check. Its `put` snippet hardcodes `"accounts"`, while its full listing uses `entitySetName`; the recipe follows the full listing. Its comments contain the word `delete`, which FR-4 would flag, so the recipe rewords them.
    - *External services tutorial:* the single-record `get` builds `${baseUrl}(${id})/People?…`, which doesn't match OData key syntax (`/People('<username>')`). The recipe uses the key syntax.
    - *Azure Function tutorial:* `functionUrl` is a literal that includes the function key, and the handler reads `name` but never sends it. The recipe reads the URL from a site setting and sends `name`, URL-encoded.
    - *Graph and SharePoint tutorial:* the token request `JSON.stringify`s the body but declares `application/x-www-form-urlencoded`. The Microsoft identity platform token endpoint expects a form-encoded body, so the recipe form-encodes it. The excerpt also has a stray `;;`. **Unverified against a live tenant**: confirm in Spike S3.
18. **Defects in Learn's tutorial demo pages**, fixed in `<slug>.page.html` (AC-3.9): the Azure Function page calls `fetch` without the CSRF token (add `shell.getTokenDeferred()` + `__RequestVerificationToken`); the External services page derives `serviceSession` from `@odata.context` with a regex that is fragile (use a documented parse and fall back to an empty session); the Dataverse and External services pages build HTML from record values without escaping (escape them); and the External services page runs `JSON.parse` on `resp.data` and `parsed.Body` without a guard, so a non-JSON error body throws (wrap it in try/catch, as the Dataverse page already does). Each demo page is also adapted to the recipe's return shape (FR-3 contract table), so it doesn't double-parse `Body`.
19. **`Server.Connector.Dataverse.*` methods are synchronous.** Learn shows them without `await`, and Microsoft's `add-server-logic` skill says not to `await` them. Generated handlers mark a function `async` only when it awaits `HttpClient` or `CloudFlow` (correction 7). Learn's Dataverse tutorial and the server objects page don't contradict this.

## User Stories

### Story 1: App shell and navigation

**As a** maker
**I want** one window with Starter and Inspector side by side as tabs
**So that** I can move between building and reviewing without switching tools

**Acceptance criteria:**

- [ ] **AC-1.1** Given the tool opens When it renders Then the title bar shows the app glyph, "Server Logic Tools" and the top tabs **Logic Starter** and **Logic Inspector**, with Logic Starter active.
- [ ] **AC-1.2** Given Logic Starter is active When it renders Then the sub-tab row shows the **Create Logic** and **Server Objects** pills, with Create Logic selected, and on the right the connection name with its environment classification (for example "Contoso · Development") and the selected site pill.
- [ ] **AC-1.3** Given no connection is active When the shell renders Then the context area reads "Not connected" and Starter remains fully usable.
- [ ] **AC-1.4** Given any tab or sub-tab When the user selects another Then the content area swaps immediately with no transition, and the previous tab's state is kept.
- [ ] **AC-1.5** Given any pill When it has keyboard focus Then it shows a 2px `#5aa9ff` outline at a 2px offset, and the selected pill is never orange.

### Story 2: Configure a handler (Create Logic)

**As a** maker
**I want** to choose a logic name, an HTTP method and a recipe
**So that** I get a working starting handler without writing boilerplate

**Acceptance criteria:**

- [ ] **AC-2.1** Given the Create Logic view When it renders Then it shows four tiles: Logic name, HTTP method, Recipe and Readiness.
- [ ] **AC-2.2** Given the user types `Customer Summary!` in Logic name When the value changes Then the slug becomes `customer-summary`: lowercase, runs of characters outside `a-z0-9` become `-`, and leading and trailing dashes are trimmed. The helper line reads "File `customer-summary.js`".
- [ ] **AC-2.3** Given the slug is empty after slugifying When the view renders Then the slug falls back to `untitled`.
- [ ] **AC-2.4** Given the slug changes When the view renders Then the file name, the server pane header, the endpoint `/_api/serverlogics/<slug>` in the request path strip and the client-call URL all update to the new slug.
- [ ] **AC-2.5** Given the HTTP method tile When it renders Then it shows exactly five single-select pills, `GET`, `POST`, `PUT`, `PATCH` and `DELETE`, with the selected pill solid blue.
- [ ] **AC-2.6** Given method X is selected When the handler renders Then it exports the function mapped per Learn: GET→`get`, POST→`post`, PUT→`put`, PATCH→`patch`, DELETE→`del`. For a single-function recipe the helper line reads "Exports `function <name>()`". For a multi-function recipe it lists every exported function and highlights the one the selected method targets (AC-3.4).
- [ ] **AC-2.7** Given POST, PUT or PATCH is selected When the client call renders Then it includes a request body (`JSON.stringify(...)`). Given GET or DELETE is selected, it includes no body.
- [ ] **AC-2.8** Given the user selects a recipe When the selection changes Then the handler regenerates, the method resets to the recipe's default method, and the Permissions readiness item resets to "needs review". If the current client language isn't supported by the new recipe (FR-3 contract table, "Liquid" column), the language resets to fetch. Switching away from R8 always resets the language to fetch.
- [ ] **AC-2.9** Given the server pane text differs from the text last generated for the current name, method, recipe and language When the user selects a different recipe Then a confirmation asks before discarding their edits, and Cancel keeps both the edits and the current recipe. Editing and then restoring the exact generated text clears the edited state.
- [ ] **AC-2.10** Given any recipe When the method pills render Then a pill is enabled only if the recipe exports that method's function (FR-3 table, "Functions" column). A disabled pill shows the tooltip "<Recipe> doesn't export `<function>()`". R4 and R5 enable GET, POST, PUT and DELETE (not PATCH). R10 enables GET, POST and PATCH. R8 enables none: it has no HTTP method (AC-3.8).
- [ ] **AC-2.11** Given any logic name When it is slugified (AC-2.2) Then:
  - the slug is at most 64 characters. It's cut at the last `-` at or before character 64, or at 64 if there's none, and trailing dashes are trimmed. Spike S1 confirms the Power Pages name limit;
  - a slug that is a Windows device name (`con`, `prn`, `aux`, `nul`, `com1`–`com9`, `lpt1`–`lpt9`) gets `-logic` appended, because a file such as `con.js` breaks zip extraction on Windows;
  - when the slug differs from the typed name, the helper line adds "Different names can produce the same slug, and so the same endpoint. Check that `<slug>` isn't already used on your site." Starter is offline and doesn't check the site (F21).

### Story 3: Recipes

**As a** maker
**I want** recipes for the common scenarios and for every Microsoft Learn tutorial
**So that** I start from a documented, working pattern

**Acceptance criteria:**

- [ ] **AC-3.1** Given the Recipe tile When it renders Then the three core recipes (Read Dataverse records, Validate a request, Call an external API) appear as pills, and the other seven are reachable from the same tile in two groups: "Learn tutorials" (R4–R7) and "Learn reference samples" (R8–R10).
- [ ] **AC-3.2** Given any recipe When it is selected Then the generated handler compiles as ECMAScript 2023 and contains no restricted pattern or browser API anywhere in its text, including comments and string literals (FR-4, Test T1 in FR-4's table). A unit test runs every enabled recipe × method × client language combination, plus every insertable Server Objects sample (AC-6.8), and asserts zero matches.
- [ ] **AC-3.3** Given a tutorial recipe When it is selected Then the handler includes a header comment linking to its Learn tutorial URL.
- [ ] **AC-3.4** Given a recipe that defines several functions (Dataverse CRUD, External service CRUD) When it is selected Then the handler contains every function from the tutorial, the method pills select which function the client call targets, and the helper line lists all exported functions.
- [ ] **AC-3.5** Given a recipe that needs secrets, keys or tenant-specific endpoints (R3, R6, R7, R9) When the handler renders Then those values are read through `Server.SiteSetting.Get(...)` with named settings, never as literals, and each required setting appears in the permission checklist. Learn's Azure Function tutorial puts the function URL and key in a literal; the recipe doesn't (Learn correction 17). R5's public demo base URL is the one allowed literal endpoint because it isn't secret or tenant-specific.
- [ ] **AC-3.6** Given any recipe When it is selected Then its table permissions (table and privileges), outbound domains and site settings populate the permission note tile, the "Permissions needed" tile and the checklist (FR-3 table).
- [ ] **AC-3.7** Given a tutorial recipe (R4–R7) When the handler is generated Then it is derived from the code in the Learn tutorial, and its only differences are the fixes in Learn correction 17 and the FR-3 Musts: input validation, connector-result normalisation and status checks (correction 11), `contentType` on body-sending calls (correction 12), the FR-3 return shape, the FR-3 logging rule (Learn's tutorials log `err.message`; the recipes don't), R4's `$top` default and cap, R7's ticket safety and failure stages (FR-3 R7 Must), the `Server.User` guard, the header comment and the recipe's access type. `README.md` lists every difference under "Differences from Learn", each with the reason.
- [ ] **AC-3.8** Given R8 (Liquid invocation) When it is selected Then the handler exports `getSummary()`, the method pills are all disabled with the tooltip "Liquid only: not callable over HTTP", the client language is fixed to Liquid, and the Liquid pane shows two snippets: without input and with `input:` (Learn's "Invoke server logic without input" and "Pass input to server logic" samples). The request path strip uses the Liquid variant (AC-4.8).
- [ ] **AC-3.9** Given a tutorial recipe that has a demo page on Learn (R4, R5, R6) When the user downloads the starter Then `<slug>.page.html` is included: Learn's demo page, with the endpoint changed to `/_api/serverlogics/<slug>` and the corrections in Learn correction 18. R7, R8, R9 and R10 have no demo page. The page file is not checked by FR-4, which applies to server code only.
- [ ] **AC-3.10** Given a recipe has a Learn source When it is selected Then the handler's header comment and `README.md` link that page (AC-3.3 applies to R4–R10, and R7 also links the GitHub sample package).

### Story 4: Generated code and client call

**As a** maker
**I want** to see the server handler and the matching client call side by side
**So that** I understand both ends before downloading

**Acceptance criteria:**

- [ ] **AC-4.1** Given valid inputs When the user changes the name, method, recipe or client language Then both panes update within 300 ms.
- [ ] **AC-4.2** Given the server pane When it renders Then its header shows `<slug>.js` and a purple `Server` pill. The lines that do the recipe's data access are highlighted. The footer reads "Runs on Power Pages with the caller's permissions".
- [ ] **AC-4.3** Given the server pane When the user types in it Then the code is editable, the Browser checks readiness item re-runs on the edited code, and edits persist until the recipe changes (AC-2.9) or the user selects Start over.
- [ ] **AC-4.4** Given the client call pane When it renders Then it offers single-select `fetch` (default), `jQuery` and `Liquid` pills. The footer reads "Paste into a page's custom JavaScript" for fetch and jQuery, or "Paste into a page or web template" for Liquid.
- [ ] **AC-4.5** Given `fetch` is selected When the pane renders Then it calls `/_api/serverlogics/<slug>` with the selected method inside `shell.getTokenDeferred().done(...)`, sends the `__RequestVerificationToken` header, checks `success` (showing `error` when it's false), reads `data` from the response envelope (Learn correction 8), parses it with `JSON.parse` inside a try/catch, and branches on the handler's `status` (FR-3 contract table). The token is sent for every method, including GET. Microsoft's skill says GET is exempt, but sending the token is harmless.
- [ ] **AC-4.6** Given `jQuery` is selected When the pane renders Then it calls `shell.safeAjax({ type, url, contentType, data?, success, error })` per Learn, and its `success` callback handles the envelope exactly as AC-4.5 does: it checks `success`, parses `data` and branches on `status`.
- [ ] **AC-4.7** The Liquid pill is enabled only when all three conditions hold: the recipe's "Liquid" column in the FR-3 contract table is "Yes", the server text contains no `async` function, and the server text references no `Server.Context` member that FR-6 marks HTTP only (`Body`, `Headers`, `HttpMethod`, `QueryParameters`, `Url`). The rule is evaluated on the current server text, so edits and inserts count as well as recipe changes.
  Given any condition fails When the client pills render Then the Liquid pill is disabled with the tooltip "Liquid can't call this handler: it reads HTTP-only request properties or is async". Only R1 and R8 support Liquid. Liquid can't supply HTTP-only properties (correction 13), and Learn doesn't document calling `async` functions from Liquid.
  Given the pill becomes disabled while Liquid is selected When it happens Then the language resets to fetch and a toast reads "Switched to fetch: this code can't be called from Liquid". Undoing the change re-enables the pill but doesn't switch the language back (F16).
  Given `Liquid` is selected When the pane renders Then it emits `{% serverlogic name: '<slug>', operation: '<function>', output: result %}`, adding `input:` when the recipe reads `Input`. The output has:
  - a `result.success` branch that escapes values read from `result.data`, which Learn says is the parsed JSON;
  - an else branch that shows `result.status_code`;
  - a note that `result.raw_result` holds the unparsed output when the handler returns non-JSON. Given Liquid is selected When the server pane is generated or shown Then a note states that Liquid invocation needs no token and reads `Server.Context.Input` rather than `Body` or `QueryParameters` (Learn correction 13), and warns that long operations delay page rendering.
- [ ] **AC-4.8** Given the request path strip When fetch or jQuery is selected Then it shows the five steps Page script → Token `__RequestVerificationToken` → Endpoint `/_api/serverlogics/<slug>` → Handler `function <name>()` → Returns `JSON string`. When Liquid is selected, it shows Page render → `serverlogic` tag → Handler `function <name>()` → Returns the `result` object, with no token step.
- [ ] **AC-4.9** Given either pane When the user selects Copy Then the pane's plain text, without line numbers, is copied and a toast "Code copied" shows centred at the bottom for 2.6 s.
- [ ] **AC-4.10** Given the server pane When it renders Then the text matches the downloaded `<slug>.js` byte for byte. Files are UTF-8 without a BOM, with LF line endings and one trailing newline, in the pane and in the download.
- [ ] **AC-4.11** Given any enabled recipe × method × client language When the client call is generated Then it parses as valid JavaScript (fetch, jQuery) or as a valid `serverlogic` tag (Liquid). A unit test asserts this for every combination, DELETE included (Learn correction 15).
- [ ] **AC-4.12** Given a behavior harness (a fake `Server` whose connector stubs return canned results, plus fake `shell`, `fetch` and `$.ajax`) When the tests run Then:
  - each of the 36 enabled configurations (recipe × function × client language) runs two sets of cases. The handler runs against success, connector failure and an empty `Body`. The client runs against success, envelope `success: false` and `status: "error"`;
  - token rejection, transport failure and a malformed envelope run once per shared client implementation, fetch and jQuery, for 6 cases. These cases cover a configuration only while its client is generated from that shared template unchanged. A configuration with its own client branch gets its own three cases;
  - each demo page (R4, R5, R6) runs its own behavior cases: success, `success: false`, `status: "error"` and non-JSON `data`. R4's and R5's tables change only after an application success (AC-3.9);
  - connector stubs, thrown exceptions and site settings carry a sentinel secret, and no `Server.Logger` call receives it (the FR-3 logging rule, F09).
  Live behavior stays a separate gate (Spike S4); passing this harness isn't live verification (F56).

### Story 5: Readiness and download

**As a** maker
**I want** a readiness ring and a single download
**So that** I know what's left and leave with everything I need

**Acceptance criteria:**

- [ ] **AC-5.1** Given the Readiness tile When it renders Then it shows a 3-segment ring labelled "K/3 ready" beside three pills: **Browser checks**, **Validation** and **Permissions**. Each pill is ✓ soft blue when complete and ! orange when it needs attention.
- [ ] **AC-5.2** Given the server pane code When it contains any restricted pattern or browser API (FR-4) Then Browser checks is "needs attention" and the offending lines are flagged in the pane.
- [ ] **AC-5.3** Given an unedited recipe When the view renders Then Validation is complete. It stays complete after manual edits, because the tool doesn't re-verify edited validation (see Non-Goals).
- [ ] **AC-5.4** Given Permissions needs attention When the user selects "Mark checklist reviewed" Then the Permissions segment turns blue and K increases by one; Browser checks and Validation keep their own state (F15). "Undo review" reverts it.
  When the user marks the review, the tool stores the server text at that moment. Permissions stays reviewed only while the current server text equals the stored text. An edit, insert or regeneration that changes the text resets it to "needs review"; returning to exactly the stored text, for example by undo, restores the mark. The checklist is labelled "For the <recipe> recipe. Review anything you've added." (F13)
- [ ] **AC-5.5** Given the note tile When it renders Then it shows a `! Permissions` pill and the recipe-specific instruction, for example "Grant Read on `contact` with Account access to the caller's web role, then validate on your development site." The tile names tables by logical name, with their access type (FR-3).
- [ ] **AC-5.6** Given any readiness state When the user selects **Download starter** Then `<slug>.zip` is saved through the host's save dialog, containing:
  - `<slug>.js`: the server pane content.
  - `<slug>.client.<js|liquid>`: the client call in the selected language.
  - `README.md`: setup steps, the endpoint, the request path, Learn links and the browser-check result.
  - `permission-checklist.md`: web role, table permissions with privileges, allowed domains and site settings, each as `- [ ]`.
  - `<slug>.page.html`, only for R4, R5 and R6 (AC-3.9).
  A toast confirms "<slug>.zip downloaded".
- [ ] **AC-5.7** Given readiness is below 3/3 When the download completes Then the incomplete items are marked "Needs attention" in `README.md` and `permission-checklist.md`.
- [ ] **AC-5.8** Given the user has set inputs, edited code and marked the review When the tool is closed and reopened on the same device Then the name, method, recipe, client language, edited code and review state are restored.
- [ ] **AC-5.9** Given saved Starter state When the user selects **Start over** Then everything resets to defaults (`customer-summary`, Read Dataverse records, GET, fetch) and the saved state is cleared.
- [ ] **AC-5.10** Given the host's save dialog fails or the zip can't be built When the user selects **Download starter** Then an error toast reads "Couldn't save <slug>.zip" with the reason, the inputs and edited code are untouched, and the tool leaves no partial file: it builds the zip in memory and hands the host the full bytes in one write. What the host does after a failed write is outside the tool's control. Cancelling the dialog writes nothing and shows no toast.
- [ ] **AC-5.11** Given any download When it completes Then, for any recipe, it finishes within 2 s, measured from the user confirming the save dialog to the toast. Time the dialog is open doesn't count.

### Story 6: Server Objects reference

**As a** developer
**I want** a browsable reference of the `Server.*` objects with insertable samples
**So that** I can extend the handler without leaving the tool

**Acceptance criteria:**

- [ ] **AC-6.1** Given the Server Objects sub-tab When it renders Then it shows three columns: the object list, the object detail, and a context column.
- [ ] **AC-6.2** Given the object list When it renders Then it lists the 9 objects from FR-6, each with its description and method or property count. Objects used by the current handler carry a purple `used` pill.
- [ ] **AC-6.3** Given the user types in "Search objects and methods" When the query matches an object or member name, case-insensitive Then only matching objects remain listed.
- [ ] **AC-6.4** Given the filter pills **All**, **Used here** and **Connectors** When one is selected Then the list shows all objects, only objects referenced in the server pane, or only `Server.Connector.*` objects respectively.
- [ ] **AC-6.5** Given the user selects an object When the detail renders Then it shows a breadcrumb (for example `Server.Connector › Dataverse`), a type pill (`Connector` for `Server.Connector.*`, `Object` for the rest), the description, member pills, the selected member's signature with its return type (or "Not documented on Learn", FR-6), a sample card with variant pills and an "All methods" table (name, signature, description). The selected row is tinted.
- [ ] **AC-6.6** Given the user selects a member pill or table row When the selection changes Then the signature, return type and sample update to that member.
- [ ] **AC-6.7** Given the sample card When the user selects **Copy** Then the sample is copied and the "Code copied" toast shows.
- [ ] **AC-6.8** Given the sample card When the user selects **Insert into handler** Then the sample is inserted as a statement into the server pane, the view switches to Create Logic, and Browser checks re-runs. The insertion follows these rules (F17):
  - **Target.** If the server pane has a last cursor position, it must be a statement position: inside a top-level function's body, at a statement boundary of a block (between two statements, just after `{` or just before `}`), and not inside a comment, a string, template or regex literal, or an expression. If there's no cursor, the target is the function mapped to the selected method (`getSummary` for R8). The sample goes before that function's last top-level `return`, or at the end of its body if it has none.
  - **Async.** If the sample contains `await` and the target function isn't `async`, the insert also adds `async` to that function's declaration.
  - **Trial parse.** The tool applies the insertion, and any `async`, to a copy of the text and parses it as ECMAScript 2023 (FR-4 code analysis). It applies the edit only if the copy parses. The insertion and the `async` change form one edit, so a single undo reverses them.
  - **Copy fallback.** If any rule fails, Insert is disabled and the sample stays copyable. The tooltip says why:
    - "No function to insert into; use Copy" when the code doesn't parse or there's no target function;
    - "Move the cursor between statements inside a function, or use Copy" when the cursor isn't at a statement position;
    - "Inserting here would break the code; use Copy" when the trial parse fails (for example, a duplicate `let` or `const`).
  - **Fixture:** in `function get(){ /* cursor */ return "{}"; }`, with the cursor inside the comment, Insert is disabled with the statement-position tooltip.
  There is no snippet-form contract, variable-conflict analysis or reachability analysis beyond these rules.
- [ ] **AC-6.9** Given the context column When it renders Then it shows:
  - "Used in <slug>": each used object with pills for the members called, plus a "← Back to Create Logic" link.
  - "Permissions needed": tables with privileges and roles, with the warn state when the checklist isn't reviewed.
  - "Another sample": the sample for the next member of the selected object in Learn's order, wrapping round. It is hidden for objects with one member.
- [ ] **AC-6.10** Given Create Logic When the user selects "Browse all in Server Objects" Then the Server Objects sub-tab opens. Given Server Objects, selecting "← Back to Create Logic" returns to it.

### Story 7: Connect Inspector to an environment and site

**As a** developer
**I want** Inspector to use my ToolBox connection
**So that** it can list and review that site's server logic

**Acceptance criteria:**

- [ ] **AC-7.1** Given no connection is active When the user opens Logic Inspector Then it tells them to select a connection in ToolBox, and no findings are shown.
- [ ] **AC-7.2** Given a connection When sites load Then only the Power Pages sites in that environment are offered for selection. Active sites (`powerpagesite` `statecode` = 0) are selectable; inactive sites are listed disabled with the label "Inactive". No site is preselected, and a single site is not auto-selected. Only enhanced data model sites appear, because sites are read from `powerpagesite`. Standard data model sites are out of scope.
- [ ] **AC-7.3** Given a site is selected When the scan completes Then the files tile lists "Server logic (N)" with each record's file name and status ("Active" or "Inactive", from `statecode`). Inactive records are listed and checked like active ones, because they can be reactivated.
- [ ] **AC-7.4** Given the site has no server logic When the scan completes Then the empty state reads "No server logic found on this site" and Export report is disabled.
- [ ] **AC-7.5** Given the connection is classified as Test, UAT or Production When Inspector connects Then a persistent warning reads "This isn't a development environment. Inspector is read-only but is designed for dev sites." and scanning stays available.
- [ ] **AC-7.6** Given the active connection changes When Inspector is open Then results and review marks are cleared and the site list reloads. Selecting a different site, or rescanning the same site, also clears results and review marks.
- [ ] **AC-7.7** Given the connected identity can't read some configuration When the scan runs Then the affected checks show "Needs review – couldn't read configuration" and never "Configured". These checks have the status Needs review, count toward M, and export as "Needs review" with that reason.
- [ ] **AC-7.8** Given the environment has no Power Pages sites When Inspector loads Then the empty state reads "No Power Pages sites in this environment", no scan runs and Export report is disabled.
- [ ] **AC-7.9** Given `ServerLogic/Enabled` is `false` for the selected site When the scan completes Then a banner above the files tile reads "Server logic is disabled on this site (`ServerLogic/Enabled` = false)". Files are still listed and checked, and the banner is repeated in every export.
- [ ] **AC-7.10** Given the connection is lost mid-scan When the scan stops Then the results already read are kept and shown. Each file or check not yet read shows the state **Not scanned**, a "Connection lost. Reconnect and rescan." prompt appears, and a rescan replaces the results. Not scanned is a fourth display state, defined in FR-8.
- [ ] **AC-7.11** Given the host doesn't report the environment type and Dataverse doesn't expose it When Inspector connects Then the environment classification shows "Unknown" and the AC-7.5 warning is shown.

### Story 8: Review a file's readiness

**As a** developer
**I want** each server logic file checked for web role, table permissions and outbound networking
**So that** I catch access and security gaps before release

**Acceptance criteria:**

- [ ] **AC-8.1** Given a selected file When the Inspector renders Then it shows:
  - The title tile: a `<file> · <status>` line, "Review server logic readiness" and the sub-line "Inspect access, permissions and outbound networking before release."
  - A 3-segment ring, "K/3 configured", with the legend "N OK · M review". **K = Configured + Reviewed. N = K. M = Needs review.** Not scanned segments are grey, count in neither K nor M, and add "· 1 not scanned" to the legend.
  - Three finding tiles: Web role assigned, Table permissions and Outbound networking.
  - A detail tile.
- [ ] **AC-8.2** Given each finding When it renders Then it shows an icon (✓ or !), the title, a one-line summary and a status: "Configured" (blue), "Needs review" (orange) or "Reviewed" (blue).
- [ ] **AC-8.3** Given a file is selected When no finding has been chosen Then the first "Needs review" finding is selected, or the first finding if none need review.
- [ ] **AC-8.4** Given the selected finding When the detail tile renders Then it shows the title, category, status, guidance text, a "Questions to consider" list and a configuration snapshot (web roles, tables with privileges, outbound).
- [ ] **AC-8.5** Given a "Needs review" finding When the user selects **Mark as reviewed** Then its status becomes "Reviewed", the file ring, the file's list summary and the snapshot update, and the button becomes "Undo review". The button isn't shown for findings that are "Configured".
- [ ] **AC-8.6** Given the files list When it renders Then each file shows its summary: "All configured", or "K/3 · M to review".
- [ ] **AC-8.7** Given the files tile When it renders Then its footer always shows "Tenant outbound policy: not verified. This tool doesn't read tenant network policy."
- [ ] **AC-8.8** Given the check rules (FR-9) When a file is evaluated Then:
  - With no role assigned, Web role is "Needs review: No web role assigned. No site user can call it yet."
  - When the assigned roles **include** the site's anonymous role (`mspp_anonymoususersrole` = true), whatever other roles are assigned, Web role is "Needs review: Callable by unauthenticated visitors." Roles are identified by that flag, never by name, because roles can be renamed.
  - With any Global access, Table permissions is "Needs review" and names the table and access type.
  - A file with only a `get` function whose roles hold Create, Write or Delete is "Needs review" with "Write-level privileges on a read-only handler".
  - With no table permissions linked to the file's roles, and Dataverse use detected in the handler code (FR-7 connector detection), Table permissions is "Needs review: Handler uses Dataverse but no table permissions are linked to its roles."
  - With no table permissions linked, and no Dataverse use detected, Table permissions is "Configured: No Dataverse access in code, so no table permissions are needed." It counts toward K. **Exception:** if connector use couldn't be determined (FR-7), Table permissions is instead "Needs review: Couldn't determine which connectors the code uses." That result overrides this reassuring outcome (F24).
  - Only active table permissions count as linked. A permission that is inactive, or that is Parent scope with an inactive ancestor, is ignored. When a Parent-scope permission's chain can't be read or resolved, Table permissions is "Needs review: Couldn't evaluate parent permission `<name>`", whatever other permissions are linked (FR-7, F26).
  - If several Needs-review conditions apply to one check, the summary shows the first in the order listed here and the detail tile lists all of them.
  - If `ServerLogic/TimeoutInSeconds` is set and is not a positive integer, or is greater than 240, the Outbound networking detail lists "Timeout setting isn't a positive integer up to Learn's 240 s maximum" as an extra Needs-review condition. It doesn't create a fourth check.
  - Outbound networking follows the FR-9 decision table. The code-based cases come first. If connector use couldn't be determined and no HttpClient use is detected, Outbound is "Needs review: Couldn't determine which connectors the code uses." (row O0). Otherwise, with no HttpClient use detected (FR-7), Outbound is "Configured: No outbound calls in code." (row O1).
- [ ] **AC-8.9** Given review marks When the session ends, the connection changes, another site is selected or the site is rescanned Then they're discarded. They aren't persisted.
- [ ] **AC-8.10** Given a file When all three checks are Configured or Reviewed Then its result pill reads "Ready". If any check is Needs review it reads "Needs review". If none is Needs review but any check is Not scanned it reads "Incomplete".
- [ ] **AC-8.11** Given a file with any check Not scanned When it renders Then that check shows a grey "Not scanned" status with the text "Not read before the connection was lost", no Mark as reviewed button, and no K contribution.
- [ ] **AC-8.12** Given a "Reviewed" finding When the report or screen shows it Then it also shows the original reason it needed review, so Reviewed is never read as "was fine".

### Story 9: Export reports

**As a** developer
**I want** to export the review as Markdown or PDF, for one file or the whole site
**So that** I can attach it to a PR or hand it to a reviewer

**Acceptance criteria:**

- [ ] **AC-9.1** Given a completed scan When the user selects **Export report** Then a 520px modal opens on a scrim with:
  - **Report:** *This file* or *Site summary*.
  - **Format:** *Markdown* (default) or *PDF*.
  - **Include:** Questions to consider (on), Configuration snapshot (on) and Redact environment and site names (off).
  - A primary button that reads "Export Markdown" or "Export PDF".
- [ ] **AC-9.2** Given This file + Markdown When the user exports Then `<file>-readiness.md` is saved, containing, in this order:
  - H2 "Server logic readiness: <file>".
  - **Environment**, **Scanned** and **Result** lines. Scanned reads "`<start>` – `<end>` (UTC±hh:mm)", followed by "Read as separate queries during this interval, not as one atomic snapshot." (F37)
  - The AC-7.9 banner as a blockquote, only when it applies.
  - A Check | Status | Finding table.
  - An H3 with guidance and a `- [ ]` question list per "Needs review" finding.
  - An H3 "Configuration snapshot" (web roles, tables with privileges, outbound), when that option is on.
  - The closing blockquote "Configuration review only. Tenant outbound policy not verified."
  
  `<file>` is the server logic record's name without `.js`.
- [ ] **AC-9.3** Given Site summary + PDF When the user exports Then `<site>-site-readiness.pdf` is saved with:
  - A header row (glyph, "Logic Inspector", "Site readiness report · <date>").
  - A hero: the site ring covering every check across all files (FR-11), "K/N checks configured" (K counts Configured and Reviewed, per AC-8.1), the environment/site path, the scan interval and not-atomic statement from AC-9.2, the headline "<F> server logic files, <R> findings to review" (R counts Needs review checks), and Ready, Needs review, Incomplete (AC-8.10) and "Not verified: Tenant outbound policy" counts.
  - A files table with a mini ring per file, the three checks and a result pill.
  - The AC-7.9 banner below the hero, only when it applies.
  - A "Review first" section listing each open (Needs review) finding, ordered by check (Web role, Table permissions, Outbound networking) and then by file name A–Z. If any checks are Not scanned, a separate "Not scanned" list follows it in the same order.
  - The footer "Configuration review only. Confirm effective access with a real site user. Exported <date-time with UTC offset>."
- [ ] **AC-9.4** Given This file + PDF, or Site summary + Markdown When the user exports Then the same content is produced in the other format: PDF uses the report page styling, and Markdown uses the H2 / table / H3 / checklist structure. File names follow `<file>-readiness.<ext>` and `<site>-site-readiness.<ext>`. In file names, every run of characters outside `A-Za-z0-9._-` becomes `-`, and leading and trailing `-` are trimmed. An empty result becomes `site`.
- [ ] **AC-9.5** Given "Questions to consider" or "Configuration snapshot" is off When exporting Then that content is left out of the report.
- [ ] **AC-9.6** Given "Redact environment and site names" is on When exporting Then the environment name, environment URL, site name and site domain or URL appear as `[environment]` and `[site]`, including in the file name of a Site summary export. Server logic file names are not redacted.
- [ ] **AC-9.7** Given findings marked "Reviewed" When exporting Then they appear as "Reviewed" (distinct from "Configured") in every format.
- [ ] **AC-9.8** Given any export When it completes Then a toast confirms "<filename> exported". When the report's statuses and reasons are compared with the screen, they match.

## Functional Requirements

### FR-1: Shell

**Must:**
- Provide the top tabs, the Starter sub-tabs, the connection/site context and bottom-centred toasts (2.6 s) as in Story 1.
- Keep each tab's state while switching.
- Keep Starter fully usable without a connection.

### FR-2: Starter inputs

**Must:**
- Slugify the logic name (AC-2.2, AC-2.3).
- Offer all five HTTP methods mapped to Learn's function names (AC-2.6).
- Offer ten recipes (FR-3).
- Offer three client languages: fetch, jQuery and Liquid.

### FR-2a: Client call generation

**Must:**
- Generate the client call for the selected slug, method, recipe function and language per AC-4.4–4.8.
- Generate the request path strip per AC-4.8.
- Use `shell.getTokenDeferred()` + `__RequestVerificationToken` for fetch, `shell.safeAjax` for jQuery and the `serverlogic` tag for Liquid.
- Emit a body only for POST, PUT and PATCH (AC-2.7). Check `success` and parse `data` per Learn corrections 8 and 11, then branch on the handler's `status` (FR-3 contract table).
- Offer Liquid only when the AC-4.7 rule holds: the recipe's "Liquid" column is "Yes", and the current server text has no `async` function and no HTTP-only `Server.Context` member.
- Produce output that parses as valid JavaScript or Liquid (AC-4.11).

**Must not:**
- Emit the `$pages.ajax` preview API (Out of Scope).

### FR-3: Recipe catalogue

Each recipe defines:
- its default method and its functions;
- its tables, each with its **logical name**, which table permissions use, and its **entity set name**, which code uses (Learn: "use the EntitySetName");
- the privileges and **access type** for each table;
- its outbound domains, its site settings and its Learn link;
- its contract (the second table below).

| # | Recipe | Group | Default | Functions | Server objects | Permissions / config |
|---|---|---|---|---|---|---|
| R1 | Read Dataverse records | Core | GET | `get` | Logger, Connector.Dataverse.RetrieveMultipleRecords | Read on `contact` (entity set `contacts`), access type Account |
| R2 | Validate a request | Core | POST | `post` | Context.Body, Logger | Web role only; rejects invalid input before any data access |
| R3 | Call an external API | Core | GET | `get` (async) | Connector.HttpClient.GetAsync, SiteSetting | Allowed domain for the target host; base URL in the site setting `ExternalApi/BaseUrl` |
| R4 | Dataverse CRUD | Learn tutorial: Dataverse tables | GET | `get`, `post`, `put`, `del`, each in `try`/`catch` with `Logger.Log` and `Logger.Error` | Context.QueryParameters/Body, Dataverse RetrieveRecord, RetrieveMultipleRecords (with `additionalParameters`), CreateRecord, UpdateRecord, DeleteRecord, Logger | Read, Create, Write and Delete on `contact` (entity set `contacts`), access type Account. Learn's tutorial uses Global, which Inspector flags, so this difference is listed in the README; a web role. The entity set comes from an allowlist (default `["contacts"]`), and `id` must be a GUID (correction 17). Demo page: the Learn contacts CRUD table |
| R5 | External service CRUD | Learn tutorial: External services | GET | `get`, `post`, `put` (uses `PatchAsync`), `del` (all async) | HttpClient GetAsync, PostAsync, PatchAsync, DeleteAsync, Context, Logger | Allowed domain `services.odata.org` (replaceable); `baseUrl` constant `https://services.odata.org/TripPinRESTierService` (public demo, the allowed literal in AC-3.5); web role Administrators in Learn. Demo page: the Learn OData people table |
| R6 | Call an Azure Function | Learn tutorial: Azure Function | GET | `get` (async) | HttpClient.GetAsync, Context.QueryParameters, SiteSetting | Function URL including key from the site setting `AZURE_FUNCTION_URL`, never a literal (correction 17); the `name` parameter is URL-encoded and sent; web role Authenticated Users; allowed domain `<function-app>.azurewebsites.net`, a placeholder the maker replaces with their function app's host. Learn doesn't document wildcard support in `AllowedDomains`, so no wildcard is suggested. Demo page: the Learn "Test Server Logic" card |
| R7 | Microsoft Graph & SharePoint | Learn tutorial: Graph and SharePoint | POST | `post` (async) plus a `getAccessToken` helper | SiteSetting (CLIENT_ID, CLIENT_SECRET, TENANT_ID, HOSTNAME, SITE_PATH), HttpClient PostAsync, GetAsync, PutAsync, Dataverse.CreateRecord | Allowed domains `login.microsoftonline.com` and `graph.microsoft.com`; Create on the registration table: logical name `crd69_eventregistration`, entity set `crd69_eventregistrations` (from Learn's sample solution, replaceable), access type Global with Create only. Inspector will flag the Global access for review, and the README says this is expected. The secret is held in Key Vault behind an environment variable. The README notes `Sites.Selected` as a least-privilege alternative to `Sites.ReadWrite.All`. Built from the two script excerpts Learn publishes; the full script is inside the GitHub sample package (Spike S3). The optional "Send confirmation email" step is not generated: Learn publishes no code for it. Ticket HTML escaping, file naming and failure stages follow the R7 Must below. No demo page |
| R8 | Invoke from Liquid | Learn reference: Author server logic | none (Liquid only) | `getSummary` | Context.Input, Context.ActivityId/FunctionName/ServerLogicName | A web role the visiting user holds; no table permissions. Input is parsed with `JSON.parse(Server.Context.Input \|\| "{}")` and validated before use. Liquid snippets with and without `input:` (AC-3.8) |
| R9 | Trigger a cloud flow | Learn reference: Server objects | POST | `post` (async) | CloudFlow.TriggerAsync, Logger | The flow must be created and added to the site with an authorized web role that the caller holds. Flow ID from the site setting `CLOUD_FLOW_ID`; payload from the validated request body. `202` with an empty `Body` is treated as success |
| R10 | Call a Dataverse custom API | Learn reference: Server objects | GET | `get` (bound function), `post` (unbound action), `patch` (bound action) | Dataverse.InvokeCustomApi, Context.QueryParameters/Body, Logger | Placeholder API names from Learn (`new_CustomBoundFunction`, `new_Action`, `new_CustomBoundAction`) that the maker replaces; bound calls target `accounts(<id>)` with `id` validated as a GUID; Read and Write on `account` (entity set `accounts`), access type Account; the custom API must exist in the environment. `patch` maps to the bound action because that action changes the bound record. `InvokeCustomApi` is still called with `"post"`, as Learn shows |

**Recipe contracts.**
- **Return shape for every handler** (Microsoft's `add-server-logic` "Approach C"):
  - Success returns `JSON.stringify({ status: "success", ... })`, with the payload keys listed below.
  - Failure returns `JSON.stringify({ status: "error", message })`.
  - `message` is a fixed, human-readable string. Exception text and connector bodies are never returned.
  - A validation failure adds `errors: [{ field, message }]` to the failure object.
- **Logging rule** (F09). Generated code may log only the following:
  - a fixed operation name;
  - for connector failures, `StatusCode` and `ReasonPhrase`;
  - for caught exceptions, `e.name`;
  - the name (never the value) of a missing site setting;
  - `Server.Context.ActivityId`.

  It never logs `Body`, `e.message`, request or response URLs, headers, tokens or site-setting values. Learn's DevTools page says diagnostics are on by default on private sites, and any public site can turn them on, so log output can reach the browser. Learn's tutorials log `err.message`, and dropping it is a listed difference (AC-3.7).
- **Parses to an object** means a non-null, non-array JSON object. Malformed JSON or another shape fails validation with `errors: [{ field: "body", message }]` (`"input"` for R8).
- **Client contract:** the client checks the envelope's `success`, parses `data`, then branches on `status`.
- **GUID** means `^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$`.
- Every free-text value placed in a URL is passed through `encodeURIComponent`.

| # | Inputs | Validation (before any data access or outbound call) | Success payload | Liquid |
|---|---|---|---|---|
| R1 | none | — | `contacts: [{ id, fullname, email }]` (fixed `$select=contactid,fullname,emailaddress1&$top=10`) | Yes (no input; synchronous) |
| R2 | Body JSON `{ name, email }` | `Body` parses to an object; `name` is a non-empty string of at most 100 characters after trimming; `email` is a string of at most 254 characters with exactly one `@` and a `.` after it; other fields are ignored | `name`, `email` (the trimmed values) | No (reads `Body`) |
| R3 | Query `q` (optional) | `q` is at most 100 characters; it's sent URL-encoded | `data`: the parsed upstream `Body` | No (async) |
| R4 | Query `entitySetName`, `id`, `additionalParameters` (`get` only); Body JSON object (`post`, `put`) | The entity set is in the allowlist; `id` is a GUID (required for `put` and `del`); `additionalParameters` is at most 500 characters, made of `&`-separated `$select=`, `$filter=`, `$top=`, `$orderby=` or `$expand=` segments only, with each option name at most once, and is otherwise rejected; `$top`, when present, is an integer from 1 to 50; a multi-record `get` (no `id`) without `$top` gets `$top=10` appended, so 10 is the default and 50 an enforced cap; other option values go to Dataverse unchanged, and a malformed one comes back as a 400 that returns `status: "error"` (F08); `Body` parses to an object | `get`: `data` (the record, or the `value` array); `post`: `id` (from the response `Headers.entityid`); `put`, `del`: nothing beyond `status` | No (reads the request) |
| R5 | Query `id` (username), `serviceSession`; Body JSON object (`post`, `put`) | `id` matches `^[A-Za-z0-9._-]{1,64}$`; `serviceSession` matches `^[A-Za-z0-9()]{0,64}$`; both are URL-encoded; `Body` parses to an object | `data`: the parsed upstream `Body`, or nothing for `del` | No (async) |
| R6 | Query `name` | `name` is required, 1–100 characters, and URL-encoded | `message`: the upstream `Body` text | No (async) |
| R7 | Body JSON (fields set by Spike S3) | Each field required by S3 is a non-empty string of at most 200 characters | `id`: the created registration's id | No (async) |
| R8 | `Input` JSON `{ category, maximumResults }` | `Input` parses to an object, defaulting to `{}`; `category` is a string of at most 50 characters (default `""`); `maximumResults` is an integer from 1 to 50 (default 5) | `category`, `maximumResults`, `activityId`, `functionName`, `serverLogicName` | Yes (Liquid only) |
| R9 | Body JSON object | `Body` parses to an object | `flowResponse`: the flow's `Body`, or `null` for a `202` with an empty `Body` | No (async) |
| R10 | Query `id` (`get`, `patch`); Body JSON object (`post`, `patch`) | `id` is required for `get` and `patch` and is a GUID; `Body` parses to an object | `data`: the parsed custom API `Body`, or `null` when it's empty | No (reads the request) |

**Must:**
- Validate request input before any data access or outbound call in every generated function that reads input, exactly as the contract table says.
- Read every required site setting before any outbound call. If one is missing or empty, log `Server.Logger.Error("Missing site setting <name>")` and return `{ status: "error", message: "Server logic isn't configured: missing site setting <name>" }`, without making the call.
- Never put the text `with(` (with or without whitespace before `(`) anywhere in generated code, including OData strings. Split such literals instead (correction 14).
- Don't `await` `Server.Connector.Dataverse.*` calls, and mark a function `async` only when it awaits `HttpClient` or `CloudFlow` (correction 19).
- Read secrets, keys and tenant-specific endpoints from site settings; never emit literal secrets (the one literal endpoint allowed is R5's public demo URL, AC-3.5). In R4 and R10, never take a table name or record ID from the request without checking it: R4 compares the entity set against an allowlist, and both check that `id` is a GUID. In R7, build the token request body as a form-encoded string (`key=value&…` with each value passed through `encodeURIComponent`), because the token request declares `application/x-www-form-urlencoded` (correction 17). Generated READMEs note Learn's guidance to hold secrets in Azure Key Vault and surface them through an environment variable behind a site setting.
- Generate output that's identical for identical inputs.
- Pass one of `application/json`, `text/html` or `application/x-www-form-urlencoded` as `contentType` on every `HttpClient` call that sends a body (Learn correction 12).
- Normalise every connector result with `toResult` (Learn correction 11), check `IsSuccessStatusCode`, log a failure with `Server.Logger.Error` as the logging rule allows, and parse `Body` only on success when it isn't empty.
- Follow the logging rule in every generated `Server.Logger` call (F09).
- **R7 ticket safety and failure behavior** (F05, F06):
  - Escape every value interpolated into the ticket HTML with an `escapeHtml` helper (`&`, `<`, `>`, `"`, `'`).
  - Name the ticket file `<Server.Context.ActivityId>-<name-slug>.html`. `<name-slug>` is built from `fullname` with the AC-2.2 slug rule and cut to 50 characters, and is `registrant` when empty. A slash, quote, `%` or `#` in the name can't change the Graph `root:/…:/content` path. Learn documents ActivityId as unique per invocation (Server objects), so the name doesn't depend on a timestamp.
  - Add `@microsoft.graph.conflictBehavior=fail` to the upload URL; Graph's default for PUT is `replace`. Intended behavior: a name collision fails the upload, and the handler returns an error before any Dataverse write. **Unverified** until the Spike S3 collision probe passes. Until then, neither the spec nor the README claims that the upload can't overwrite a file.
  - Run the steps in Learn's order: token and site lookup, upload, then `CreateRecord`. Each stage's failure logs its own fixed operation name, with `StatusCode` and `ReasonPhrase`, and returns its own fixed `message`:

    | Failed stage | Logged operation name | Returned `message` |
    |---|---|---|
    | Token or site lookup | `R7 connect` | "Couldn't connect to SharePoint." |
    | Upload | `R7 upload` | "Couldn't upload the ticket." |
    | `CreateRecord` after a successful upload | `R7 create after upload`, plus `ActivityId` (the file name's prefix, so the orphan can be found without logging the registrant's name) | "Registration failed after the ticket was uploaded." |

  - **Retry consequences:** the handler never deletes, reuses or reconciles files. A retry is a new request with a new ActivityId, so it uploads another ticket. A ticket from a failed create stays in SharePoint as an orphan. The README states this and tells the maker to find orphans by ActivityId and delete them manually. Compensation and idempotent retries are out of scope.
- Guard `Server.User` against `null` wherever it is read.
- Use only identifiers and comments that contain none of the FR-4 patterns as substrings (for example, avoid `startsWith(` and the word `delete` in comments).

**Must not:**
- Emit browser APIs or restricted patterns (FR-4).

### FR-4: Browser and restricted-pattern checks

**Code analysis.** Every rule that reads code structure uses one JavaScript tokenizer and parser at ECMAScript 2023, for example acorn. Those rules are FR-6 used-member detection, AC-4.7's Liquid rule, AC-6.8 insertion and FR-7's function names and connector detection. Comments are excluded from those rules' tokens. Code is never evaluated. The pattern matching below is unchanged in v0.6.0.

**Matching rules** (Learn doesn't document the validator's exact rules, so the check is deliberately conservative: it flags what the validator might reject, in two severities):

- **Blocked:** the pattern appears in code, meaning outside comments and string literals, as a whole token. Whole token means the match isn't preceded or followed by an identifier character `[A-Za-z0-9_$]`, except where the pattern itself ends in `(` or `.`. Matching is **case-sensitive**.
- **May be rejected:** the pattern appears as a plain substring anywhere, whether inside a comment, a string literal or a longer identifier (for example `startsWith(` contains `with(`). The message reads "May be rejected by Power Pages validation".
- **Whitespace:** for every pattern that ends in `(`, any whitespace between the name and `(` still matches (`with (`, `eval (`), mirroring the runtime regex `with\s*\(` (correction 14). This applies to both severities. Patterns ending in `.` allow no whitespace.
- **Exception, `with(`:** any occurrence counts as **Blocked**, including inside strings, comments and identifiers, because the runtime rejects it anywhere (correction 14). The match is case-sensitive, so `startsWith(` stays "May be rejected" (T9).
- **`import from`** matches a static import, `import` followed on the same statement by `from` (for example `import x from "y"`), and is Blocked.
- Both severities make Browser checks "needs attention" and flag the lines. `Server.Connector.*` member names (for example `DeleteRecord`, `DeleteAsync`) are not patterns: `delete` is case-sensitive, so `Delete…` doesn't match.
- Generated recipes must have **zero** matches of either severity (AC-3.2).

| # | Input text | Expected |
|---|---|---|
| T1 | Every generated recipe, any method or language | no matches |
| T2 | `Server.Connector.Dataverse.DeleteRecord(a, b)` | no match |
| T3 | `Server.Connector.HttpClient.DeleteAsync(u, h)` | no match |
| T4 | `function del() {}` | no match |
| T5 | `delete obj.x;` | Blocked, `delete` |
| T6 | `// never delete this` | May be rejected, `delete` |
| T7 | `const s = "fetch";` | May be rejected, `fetch` |
| T8 | `fetch(url)` | Blocked, `fetch` |
| T9 | `name.startsWith("a")` | May be rejected, `with(` |
| T10 | `getFunction(x)` | May be rejected, `Function(` |
| T11 | `const n = refs.length;` | May be rejected, `fs.` (inside the identifier `refs`) |
| T12 | `if (x) { with (o) {} }` | Blocked, `with(`; the space before `(` is normalised |
| T13 | `Object.getPrototypeOf(x)` | Blocked, `Object.getPrototypeOf` |
| T14 | `Server.Logger.Log("prototype")` | May be rejected, `prototype` |
| T15 | `const q = "$filter=startswith(name,'a')";` | Blocked, `with(` (inside a string; correction 14) |
| T16 | `import x from "y";` | Blocked, `import from` |
| T17 | `const r = eval ("1");` | Blocked, `eval(`; the space before `(` is normalised |

**Must:**
- Flag every occurrence in the server pane of:
  - Browser APIs: `fetch`, `XMLHttpRequest`, `window`, `document`, `localStorage`, `sessionStorage`.
  - Each restricted pattern on Learn's Limitations list: `__dirname`, `__filename`, `import(`, `import from`, `eval(`, `Function(`, `setTimeout(`, `setInterval(`, `setImmediate(`, `process.exit`, `process.kill`, `child_process`, `fs.`, `require(`, `constructor.constructor`, `this.constructor`, `arguments.callee`, `with(`, `delete`, `Object.getPrototypeOf`, `Object.setPrototypeOf`, `Proxy(`, `Reflect.`, `Symbol.for`, `__proto__`, `prototype` and `debugger`.
- Report the line numbers.
- Re-run the check on every edit or insert.

### FR-5: Readiness and download

**Must:**
- Show a 3-segment readiness ring (AC-5.1–5.4).
- Download `<slug>.zip` with exactly the files in AC-5.6: four for every recipe, five for R4–R6.
- Download at any readiness level, marking the open items.

**Must not:**
- Claim that permissions exist in any environment. Starter's Permissions item is self-reported.

### FR-5a: Starter persistence

**Must:**
- Persist the name, method, recipe, client language, edited code and review state in the host's tool settings. The review state includes the server text stored when Permissions was marked reviewed (AC-5.4).
- Restore that state on launch, and fall back to defaults if it's invalid.
- Offer Start over to clear it.

**Must not:**
- Persist Inspector results, review marks or environment data.

### FR-6: Server Objects catalogue

Learn-verified objects (9). Only members that Learn documents are listed. The extra `Server.User` members (contactid, Roles, parentcustomerid) and `Server.Website` members (adx_websiteid, name) shown in the mock are omitted, because Learn doesn't document them. Dataverse takes an `entitySetName` (for example `accounts`), and `options` strings have no leading `?`.

| Object | Members |
|---|---|
| `Server.Logger` | Log, Warn, Error |
| `Server.Context` | ActivityId, Body, FunctionName, Headers, HttpMethod, Input, QueryParameters, ServerLogicName, Url |
| `Server.User` | fullname (returns `null` when anonymous) |
| `Server.Connector.Dataverse` | CreateRecord, RetrieveRecord, RetrieveMultipleRecords, UpdateRecord, DeleteRecord, InvokeCustomApi |
| `Server.Connector.HttpClient` | GetAsync, PostAsync, PutAsync, PatchAsync, DeleteAsync |
| `Server.Connector.CloudFlow` | TriggerAsync |
| `Server.Website` | adx_primarydomain |
| `Server.SiteSetting` | Get |
| `Server.EnvironmentVariable` | get |

**Must:**
- Show each member's signature, including Learn's overloads (`options` and `skipCache`), a description and at least one sample. Show its return type only where Learn documents one: the connector result shape (correction 11) for `Dataverse.*`, `HttpClient.*` and `CloudFlow.TriggerAsync`, and `null` for an anonymous `Server.User`. Everywhere else the return type reads "Not documented on Learn". Mark `HttpClient.*` and `CloudFlow.TriggerAsync` as async, and `Dataverse.*` as synchronous (correction 19).
- Use the sample variants from the mock for RetrieveMultipleRecords (Filter by account, Top N, Expand lookup).
- Include the Learn samples:
  - InvokeCustomApi: bound function, bound action and unbound action.
  - CloudFlow.TriggerAsync.
  - HttpClient: one per verb.
  - Context: request info and Liquid `Input`.
- Mark each `Server.Context` member by invocation context, per correction 13:
  - **Both:** ActivityId, FunctionName and ServerLogicName.
  - **HTTP only:** Body, Headers, HttpMethod, QueryParameters and Url.
  - **Liquid only:** Input.

  AC-4.7 uses the HTTP-only mark.
- Detect "used" objects and members from the current server pane text, using FR-4 code analysis, so mentions in comments don't count.

### FR-7: Inspector connection and scan

**Must:**
- Use the host's active connection.
- List the Power Pages sites, and list the server logic records with their status for the selected site.
- For each record, read its web roles, the table permissions linked to those roles (table, access type, privileges), its code (to derive exported function names and connector use), and the `ServerLogic/Enabled`, `ServerLogic/AllowedDomains`, `ServerLogic/AllowNetworkingToAllDomains` and `ServerLogic/TimeoutInSeconds` site settings.
- Read each fact from the source in the data-source table below.
- Derive exported function names by parsing the code for top-level `function <name>(` and `async function <name>(` declarations, ignoring comments and strings. A handler "exports only `get`" when the only HTTP-mapped names (`get`, `post`, `put`, `patch`, `del`) are `get`. Helper names such as `getAccessToken` are not HTTP-mapped.
- Detect connector use from the code's tokens, with comments excluded (FR-4 code analysis, F24):
  - **Uses Dataverse:** an identifier or string-literal token `Dataverse` appears. **Uses HttpClient:** the same rule for `HttpClient`. Dotted, bracket, destructured and aliased uses all contain the token.
  - **Couldn't determine:** a `Server` or `Connector` identifier token is followed by anything other than `.` and an identifier, or `[`, a string literal and `]`. This catches `const c = Server.Connector;`, `const { Connector } = Server;`, `Server[k]` and `Server.Connector[name]`.
  - **Precedence:** Couldn't determine overrides both no-use outcomes: Table permissions' "No Dataverse access in code" (AC-8.8) and Outbound's O1 (FR-9). Each becomes Needs review: "Couldn't determine which connectors the code uses." A check where the connector is detected is evaluated normally.
  - There is no alias or data-flow tracking. Deliberately obfuscated access, for example `globalThis["Ser" + "ver"]`, is outside a configuration review.
  - **Fixtures:**

    | Code | Expected |
    |---|---|
    | `Server.Connector.Dataverse.RetrieveRecord(…)` | Uses Dataverse |
    | `Server.Connector["HttpClient"]` | Uses HttpClient |
    | `const c = Server.Connector; c[name](…)` | Couldn't determine |
    | `const { Connector } = Server;` | Couldn't determine |
    | `// Server.Connector.Dataverse` only | No use |
- Count a table permission as linked only when it's active (`statecode` = 0). A Parent-scope permission also needs its parent chain followed (F26):
  - **Known inactive:** if the permission or any ancestor is inactive (`statecode` = 1), the permission is ignored. The snapshot lists it as "(inactive, ignored)" or "(parent inactive, ignored)".
  - **Unknown:** an ancestor can't be read, the parent reference resolves to no readable record, or the chain loops. Table permissions is then Needs review, "Couldn't evaluate parent permission `<name>`", whatever other permissions are linked. An unresolved chain never leaves a clean Configured result.
  - If Spike S1 can't locate the parent link, every Parent-scope permission is Unknown.
  - The chain uses the type-18 components Inspector already reads, so it adds no query.
- Parse `ServerLogic/AllowedDomains` as a comma-separated list of hosts, trimmed, where a leading `*.` is accepted as written. Learn doesn't document the format; if the value can't be parsed as that list, the Outbound check is "Needs review – couldn't interpret `ServerLogic/AllowedDomains`" (FR-9, O2).
- Treat `ServerLogic/AllowNetworkingToAllDomains` as `true` when the setting is absent (Learn default), and `ServerLogic/Enabled` as `true` when absent. Treat `ServerLogic/AllowedDomains` as "no allow list" when it is absent, empty or Learn's default text "All domains allowed".
- Scan every server logic record on the site, with no cap. The 30 s NFR applies up to 50 records; above that, a progress count shows "Scanned X of N".
- Identify the default roles by the `mspp_anonymoususersrole` and `mspp_authenticatedusersrole` flags, never by name.
- Warn, without blocking, on a non-Dev connection, or when the type is unknown (AC-7.5, AC-7.11).

**Data sources:**

| Fact | Source | Status |
|---|---|---|
| Sites | Dataverse `powerpagesites` (`powerpagesite`): `powerpagesiteid`, `name`, `primarydomainname`, `statecode` (0 Active, 1 Inactive) | Verified on Learn |
| Server logic records and their status | `powerpagecomponents` (`powerpagecomponent`) where `powerpagecomponenttype` = 35 (Server Logic) and `powerpagesiteid` = the site: `name`, `statecode` (0 Active, 1 Inactive) | Verified on Learn |
| Server logic code | `powerpagecomponent` `content` (JSON) or `filecontent` (File) | **Spike S1** (which column) |
| Web roles | `powerpagecomponent` type 11 (Web Role), and `mspp_webrole` with `mspp_anonymoususersrole` and `mspp_authenticatedusersrole` | Verified on Learn |
| Web roles assigned to a record | The server logic ↔ web role link. PAC CLI site metadata names it `adx_serverlogic_adx_webrole`; in the enhanced model it is probably the N:N relationship `powerpagecomponent_powerpagecomponent` | **Spike S1** |
| Table permissions per role | `powerpagecomponent` type 18 (Table Permission). The table's logical name, access type, privileges (Read, Write, Create, Delete, Append, Append To), linked roles and, for Parent scope, the parent permission are stored in `content`; state from `statecode` | Component verified on Learn; **Spike S1** (JSON keys, role link and parent link) |
| Site settings | `powerpagecomponent` type 9 (Site Setting), filtered to the site and the `ServerLogic/` prefix | Component verified on Learn; **Spike S1** (where the value is stored) |
| Environment classification (Dev/Test/UAT/Prod) | The host's connection metadata if it provides one. Otherwise unknown (AC-7.11) | Host contract, **Spike S2** |

**Spike S1 (first plan task):** on a sample enhanced-model site, confirm six things:
1. which `powerpagecomponent` column holds server logic code (`content` or `filecontent`);
2. the relationship that links a server logic record to its web roles, and a table permission to its roles;
3. the JSON keys inside `content` for table permissions (table logical name, access type, privileges);
4. where a site setting's value is stored;
5. how a Parent-scope table permission references its parent (the parent-link metadata, F26);
6. the maximum length of a server logic name (AC-2.11).

Record the result in `plan.md`. Inspector ACs that read facts 1–5 are blocked until S1 is done. Other facts are verified on Learn.
**Spike S3 (before building R7):** unzip `event-registration.zip` from the GitHub sample package, read the full event-registration script, and reconcile R7 with it, including the form-encoded token request (Learn correction 17). Learn publishes only two excerpts. S3 also runs a **collision probe** on a test SharePoint site (F05). It uploads two files with the same name to the exact `root:/…:/content` path that R7 uses, with `@microsoft.graph.conflictBehavior=fail`, and confirms that the second upload fails and the first file is unchanged. Until the probe passes, R7's overwrite prevention is unverified. If the second upload doesn't fail, the spec is updated before R7 ships. This spike applies to Starter, not Inspector.
**Spike S2 (before Inspector and download work):** confirm what the PPTB host exposes for:
- the active connection: name, URL and environment type;
- a connection-changed event (AC-7.6);
- per-tool settings storage (FR-5a);
- a save dialog that writes binary files, for the zip and the PDF (AC-5.6, AC-5.10, AC-9.3);
- clipboard write (AC-4.9, AC-6.7);
- whether PDF generation needs a library or the host provides one.

Also confirm whether the signed-in identity's read access to `powerpagecomponent` and `mspp_webrole` can be tested up front.
**Spike S4 (before the client generator ships; a dev site):** deploy one recipe and call it from fetch, jQuery and Liquid. Confirm four things:
1. the casing of the envelope keys (correction 8);
2. whether connector results arrive as a string or an object (correction 11);
3. how `AllowNetworkingToAllDomains` and `AllowedDomains` interact (the FR-9 decision table);
4. whether Liquid can call an `async` function.

Each result either confirms the spec or becomes a PATCH or MINOR spec update.

**Must not:**
- Create, update or delete anything.

### FR-8: Finding model

**Must:**
- Give each check one of three statuses: Configured, Needs review or Reviewed. Reviewed is user-set, session-only, and only available for Needs review.
- Add one display state outside those three: **Not scanned** (grey, no icon colour beyond neutral). It applies only to evidence not yet read when a scan is interrupted (AC-7.10, AC-8.11). It is never user-settable.
- **"Couldn't read" is not a state.** It is Needs review with the reason "couldn't read configuration" (AC-7.7).
- Count Configured and Reviewed toward K, and Needs review toward M. Not scanned counts toward neither (AC-8.1).
- In exports, show Reviewed as "Reviewed" with the original reason (AC-8.12), and Not scanned as "Not scanned", in every format.
- Attach a category, a summary, guidance, questions and a snapshot to each finding.
- Default to Needs review when evidence can't be read.

### FR-9: Check rules

**Must:**
- **Web role:** Needs review when no role is assigned, or when the assigned roles include the anonymous role (`mspp_anonymoususersrole` = true).
- **Table permissions:** Needs review in four cases:
  - any Global access;
  - Create, Write or Delete privileges for a handler that exports only `get`;
  - the code uses Dataverse (FR-7 connector detection) and no active table permissions are linked;
  - a Parent-scope chain can't be resolved (FR-7).

  Configured, with the "no table permissions needed" summary, when none are linked and no Dataverse use is detected, unless connector use couldn't be determined (AC-8.8). Only active permissions count, and inactive ones and those with inactive ancestors are ignored. Non-Global access types aren't otherwise flagged in v1.
- **Outbound networking:** evaluate the first row that matches. "All" means `AllowNetworkingToAllDomains` is `true` or absent. "List" means `AllowedDomains` parses to at least one host (FR-7).

  | # | Condition | Result |
  |---|---|---|
  | O0 | No HttpClient use detected, and connector use couldn't be determined (FR-7) | Needs review: "Couldn't determine which connectors the code uses." |
  | O1 | No HttpClient use detected (FR-7) | Configured: "No outbound calls in code." |
  | O2 | `AllowedDomains` is set but can't be parsed | Needs review: "Couldn't interpret `ServerLogic/AllowedDomains`" |
  | O3 | All, no List | Needs review: "All domains allowed. Limit to the hosts it calls." |
  | O4 | All, with a List | Needs review: "`AllowedDomains` is set but `AllowNetworkingToAllDomains` isn't `false`, so the list may not apply." |
  | O5 | `AllowNetworkingToAllDomains` = `false`, no List | Needs review: "Outbound calls are blocked. The handler calls HttpClient, but no domains are allowed." |
  | O6 | `AllowNetworkingToAllDomains` = `false`, with a List | Configured: lists the domains |

  Learn doesn't document how the two settings interact. O4 follows Microsoft's `add-server-logic` guidance ("Set to `false` when restricting via AllowedDomains"), and Spike S4 confirms it. The Timeout condition (AC-8.8) is added to any row except O0 and O1.

### FR-10: Reports

**Must:**
- Export Markdown and PDF for both scopes, with the include and redact options, file names and content in Story 9.
- Always include the configuration-only and tenant-policy-not-verified statements, the scan interval and the not-atomic statement (AC-9.2, F37).

**Must not:**
- Export JSON or CSV.

### FR-11: Visual design

**Must:**
- Match the handoff tokens:
  - Surfaces: window `#202020`, surface `#282828`, tile `#2d2d2d`.
  - Status: blue `#5aa9ff` for OK, orange `#ffa24a` for review, purple `#c4a7ff` for objects.
  - Radii and type: Segoe UI Variable and JetBrains Mono.
  - Report palette per README §05.
- Use the glass treatment on Inspector tiles only, on the `#282828` window surface. The aurora gradient background is not used in v1 (Assumption A1).
- Ship dark only in v1 (Assumption A2).
- Draw rings as SVG arcs with 4° gaps. A ring has one segment per check up to 30 checks. Above 30, the site ring draws three arcs whose sizes are proportional to Configured + Reviewed, Needs review and Not scanned. Empty arcs are omitted, and the 4° gaps fall only between the arcs drawn.
- Apply the AA token adjustments in Assumption A8. Every other token is unchanged.
- Replace glyphs with Fluent System Icons.

## Non-Functional Requirements

### Performance

- Both panes update within 300 ms of any input change.
- Server Objects search filters within 100 ms.
- An Inspector scan of up to 50 server logic records completes within 30 s.
- An export completes within 5 s.
- A Starter zip download completes within 2 s (AC-5.11).

### Security

- Inspector uses only the signed-in user's permissions; the tool never handles access tokens, and all access goes through the host.
- Inspector requests read-only access.
- No configuration, findings or code are sent to third parties.
- No tokens or secrets are written to downloads or reports.
- Generated code never contains literal secrets.
- Generated code never logs bodies, exception messages, URLs, headers, tokens or site-setting values (the FR-3 logging rule).

### Reliability

- A failed read of one check or record doesn't block the others.
- A scan interrupted by connection loss keeps what was scanned and marks the rest "Not scanned".

### Accessibility

- All controls are keyboard operable, with the visible focus ring from AC-1.5.
- Status is never conveyed by colour alone: rings carry a text count, and statuses carry text and an icon.
- Meets WCAG 2.2 AA contrast. Glass tiles must also meet AA on the `#282828` window surface. Four handoff tokens fail AA as text, so they're adjusted per Assumption A8.
- The code panes and the export modal are reachable and operable with a screen reader.

## Error Scenarios

| Scenario | Expected behavior |
|---|---|
| Slug is empty | Falls back to `untitled` (AC-2.3) |
| Edited code has restricted patterns | Browser checks shows attention and lines are flagged; download is still allowed and the README notes it |
| Recipe change after edits | Confirm before discarding (AC-2.9) |
| Insert with no cursor position | Insert into the method's function, before its last top-level `return` (AC-6.8) |
| Insert target invalid (code doesn't parse, cursor not at a statement position, or the trial parse fails) | Insert disabled with a reason; Copy still works (AC-6.8) |
| Liquid selected and an edit or insert makes the code async or HTTP-only | Language resets to fetch with a toast (AC-4.7) |
| R7 `CreateRecord` fails after the ticket uploaded | Logs `R7 create after upload` with ActivityId; returns "Registration failed after the ticket was uploaded."; the ticket stays as an orphan (FR-3 R7 Must) |
| Inspector can't determine connector use | Table permissions and Outbound can't report a no-use Configured; they're Needs review (FR-7, O0) |
| A Parent-scope permission's chain can't be resolved | Table permissions: "Needs review – Couldn't evaluate parent permission `<name>`" (FR-7) |
| No active connection | Inspector prompts to select a connection; Starter keeps working |
| Environment has no Power Pages sites | Empty state; no scan; Export disabled (AC-7.8) |
| Connection lost mid-scan | Keep partial results, mark the rest "Not scanned", prompt to reconnect (AC-7.10, AC-8.11) |
| Insufficient read permission | Affected checks: "Needs review – couldn't read configuration" (AC-7.7) |
| `ServerLogic/Enabled` = false | Banner at site level; files are still listed and checked; banner repeated in exports (AC-7.9) |
| `ServerLogic/AllowedDomains` can't be parsed | Outbound: "Needs review – couldn't interpret `ServerLogic/AllowedDomains`" (FR-7) |
| Environment type unknown | Classification "Unknown"; non-dev warning shown (AC-7.11) |
| Export with zero files | Export report is disabled |
| Save dialog cancelled | No file is written and no toast shows |
| Zip can't be built or saved | Error toast "Couldn't save <slug>.zip", no partial file, state untouched (AC-5.10) |
| Method pill not exported by the recipe | Pill disabled with tooltip (AC-2.10) |
| PDF generation fails | Error toast; the Markdown export is still available |
| Site list can't be read | Error state "Couldn't load sites" with the reason and a Retry button; no scan runs |
| A record's code is empty or can't be parsed | Function names are treated as unknown, so the Table permissions write-on-read rule can't apply. Table permissions and Outbound are "Needs review – couldn't read handler code"; Web role is evaluated normally |
| Server Objects search matches nothing | "No objects or members match '<query>'", with a Clear search link |
| Liquid selected and the recipe changes to one without Liquid support | Language resets to fetch (AC-2.8) |
| Required site setting missing at runtime (generated code) | The handler logs an error and returns `{ status: "error", message: "Server logic isn't configured: missing site setting <name>" }` before any outbound call (FR-3) |
| More than 50 server logic records | All are scanned, with a "Scanned X of N" progress count (FR-7) |

## Open Questions

No blocking items remain in the spec itself. Four plan-time spikes are required, all in FR-7:
- **S1:** the `powerpagecomponent` code column, role links and JSON keys. Needed before Inspector work starts.
- **S2:** the host's connection, settings, save, clipboard and PDF APIs. Needed before Inspector and download work.
- **S3:** the full Graph/SharePoint script. Needed before R7 is built.
- **S4:** the envelope casing, the connector result type, the outbound settings precedence and whether Liquid can call async functions, checked on a live site. Needed before the client generator ships.

Spike checks are proposals until they run. Nothing in this spec counts as verified on a live site or host until the spike result is recorded in `plan.md`. That includes S1's parent links, S3's collision probe and every S4 runtime check.

**Implementation work added in v0.6.0.** The plan should estimate each item as a bounded task with acceptance examples:
- the shared code analysis (FR-4), connector token detection and fixtures (FR-7);
- parent-chain resolution for Parent-scope permissions (FR-7);
- safe insertion: statement positions, trial parse and the Copy fallback (AC-6.8);
- text-tied Permissions review (AC-5.4) and the derived Liquid rule (AC-4.7);
- R7 ticket safety and failure stages (FR-3);
- the behavior harness, shared client failure fixtures and demo-page cases (AC-4.12).

**Assumptions** (proposed defaults on 2026-10-07 to unblock planning; the owner can overturn any of them):

- **A1: Inspector background.** Tiles use glass on `#282828`; the aurora gradient is not used in v1. (This was the README's own open item; FR-11 already assumed it.)
- **A2: Theme.** v1 is dark only. A light variant is out of scope.
- **A3: Reference 04.** The two-pane Markdown view is an illustration of the export output, not an in-app screen. The export dialog and downloaded files are the only deliverables.
- **A4: Recipe tile layout.** Three core pills plus two groups ("Learn tutorials", "Learn reference samples"), per AC-3.1. Ten recipes is more than the mock's pills were drawn for, so design confirms the layout.
- **A7: Recipe scope.** One-line reference snippets from the server objects page (`SiteSetting.Get`, `EnvironmentVariable.get`, `Website`, `User`, `Logger`, each Dataverse method, each HttpClient verb, Context request info) are insertable samples in Server Objects (FR-6), not recipes. Scenario samples are recipes R8–R10.
- **A5: `Server.User` and `Server.Website` members.** Learn-documented members only (FR-6).
- **A6: "Granted but unused" / "used but not granted" table comparison.** Not in v1 (see Out of Scope).
- **A8: AA token adjustments.** The design called these handoff tokens final, but they fail the 4.5:1 text ratio. Each moves to the nearest value that passes:

  | Token | Was | Now | Ratio |
  |---|---|---|---|
  | Code comment on `#262626` | `#858585` (4.10) | `#8c8c8c` | 4.50 |
  | Line number on `#262626` | `#5f5f5f` (2.37) | `#8c8c8c` | 4.50 |
  | Report orange text, on white and on tint `#fdf0e3` | `#d9680a` (3.54 / 3.16) | `#b05408` | 5.10 / 4.55 |
  | Report blue chip on tint `#eaf2fd` | `#1f6fd1` (4.38) | `#1e6dcd` | 4.51 |

  Design confirms these values or supplies alternatives that pass.
- **A9: Outbound settings precedence.** As in FR-9 O3–O6, based on Microsoft's `add-server-logic` guidance. Spike S4 confirms it.

**Resolved:**
- 2026-10-07: Non-dev environment → warn, don't block.
- 2026-10-07: Host → PPTB only for v1.
- 2026-10-07: Non-Global access types → not flagged in v1; revisit later.
- 2026-10-07: Exports → Markdown and PDF, in File and Site scopes (design rule; supersedes Markdown-only).
- 2026-10-07: Methods → all five (design rule; supersedes GET/POST only).
- 2026-10-07: Recipes → the 3 core, all 4 Learn tutorials, and the 3 scenario samples from the author and server objects pages (10 in total).
- 2026-10-07: Review marks → session-only (AC-8.9), and also cleared on a rescan or a site switch.
- 2026-10-07: Response envelope → lowercase keys (correction 8). Learn's tutorials and Microsoft's `add-server-logic` reference agree; S4 confirms on a live site.
- 2026-10-07: Liquid client → R1 and R8 only (AC-4.7).
- 2026-10-07: Inspector → enhanced data model sites only (AC-7.2).

## Out of Scope (Future Considerations)

- Pushing generated handlers to a site (download only in v1).
- Guided or one-click fixes from Inspector findings.
- JSON or CSV export.
- Comparing two scans or tracking findings over time.
- CI/pipeline integration.
- Verifying input validation in hand-edited code.
- Reading the tenant-level outbound governance policy.
- A standalone web host.
- The `$pages.ajax` client API (preview) as a fourth client language.
- **REVISIT:** flagging Contact/Account/Self/Parent access types on sensitive tables (v1 flags Global only).
- Comparing the tables a handler's code uses with the tables its roles are granted ("granted but unused" / "used but not granted"). v1 only checks whether the code uses Dataverse at all (AC-8.8).
- A light theme variant.
- Automatic upload compensation or idempotent retries for R7. A retry uploads another ticket (FR-3 R7 Must).
- Alias or data-flow analysis of connector use. FR-7 uses a conservative token rule that fails toward Needs review.
- A general OData option validation engine. R4 checks only option names, duplicates and `$top`, and Dataverse rejects malformed values.
- Detecting configuration changes during a scan. Reports state the scan interval instead (AC-9.2).
- Effective-user authorization testing (see Non-Goals).

## Appendix: Review finding dispositions (v0.6.0)

All 59 findings from `sol-review.md`, with Opus's responses in `Opus-review-of-Sol-review.md` and the two debate rounds. Priority shows Sol's position, then Opus's final one.

- **Adopted:** in this spec as of v0.6.0.
- **Deferred → v0.7.0:** the remedy is agreed (Opus's position, not disputed in the debate) but isn't written into this revision. The remedy column summarises it.
- **Owner decision:** waiting on the owner.

P1 items that are deferred or waiting on a decision (F01, F03, F04, F34) must be resolved before the plan covers their areas.

| ID | Finding | Priority (Sol / Opus) | Disposition | Where, or agreed remedy |
|---|---|---|---|---|
| F01 | Universal JSON parsing contradicts text and flow payloads | P1 / P1 | Deferred → v0.7.0 | Decode `Body` per recipe row: R6 raw text; R9 JSON if it parses, else text, `null` when empty |
| F02 | Liquid treats `status: "error"` as success | P1 / P2 | Deferred → v0.7.0 | Three Liquid branches on `result.success` and `result.data.status` |
| F03 | R5 inputs don't match the Learn demo page | P1 / P1 | Deferred → v0.7.0 | Keep Learn's input names and locations (`username`, `serviceSession`, `UserName`) and validate them |
| F04 | Account scope lacks relationship and linkage setup | P1 / P1 | Owner decision | How R4 `post` creates within Account scope: S4 checks `Server.User.parentcustomerid`; otherwise a Global Create-only permission |
| F05 | R7 HTML and upload-path safety | P1 / P1 | Adopted | FR-3 R7 Must, AC-3.7, Spike S3 collision probe |
| F06 | R7 partial side effects | P2 / P3 | Adopted | FR-3 R7 Must (failure stages, retry consequences), Error Scenarios |
| F07 | R10 custom API prerequisites | P2 / P3 | Deferred → v0.7.0 | README and checklist lines; the identity checked by `ExecutePrivilegeName` is marked "maker verifies" |
| F08 | Validation rows aren't executable contracts | P2 / P3 | Adopted (partial) | Contract preamble ("parses to an object"), R4 options and `$top`, R10 `id`. The example-request column and R5's `id` rules are deferred with F03 |
| F09 | Logging raw exceptions and bodies | P1 / P1 | Adopted | FR-3 logging rule, AC-3.7, AC-4.12, Security |
| F10 | Caller-permissions footer misstates upstream identity | P2 / P3 | Deferred → v0.7.0 | Add "Upstream calls use this integration's own credentials" for R3, R5, R6, R7 and R9; the footer is unchanged |
| F11 | R8 inherits HTTP-only package wording | P3 / P3 | Deferred → v0.7.0 | The R8 README shows the Liquid tag; `method` is `null` in FR-5a |
| F12 | Regeneration vs. edit preservation | P2 / P2 | Deferred → v0.7.0 | Server text depends only on the recipe; reword AC-4.1 |
| F13 | Permissions review not invalidated by code changes | P2 / P3 | Adopted | AC-5.4, FR-5a |
| F14 | Validation limitation invisible | P3 / P3 | Deferred → v0.7.0 | "Generated validation; edits aren't rechecked"; define Browser checks as a text-pattern check |
| F15 | Marking Permissions forces 3/3 | P2 / P3 | Adopted | AC-5.4 (in the same sentence as F13) |
| F16 | Async insertion invalidates Liquid | P2 / P2 | Adopted | AC-4.7, FR-2a, FR-6 Context marks |
| F17 | No insertion applicability contract | P2 / P3 | Adopted | AC-6.8, Error Scenarios |
| F18 | Byte-for-byte vs. normalisation | P2 / P3 | Deferred → v0.7.0 | LF-only editor model; download adds a missing final newline |
| F19 | Persisted state lacks versioning | P2 / P3 | Deferred → v0.7.0 | `schemaVersion` and `catalogueVersion`; fallback toast; a catalogue change clears the review |
| F20 | No-secrets promise vs. user code | P2 / P3 | Deferred → v0.7.0 | Scope the guarantee to generated files; user code is kept exactly as written |
| F21 | Slug lacks limits and collision disclosure | P3 / P3 | Adopted | AC-2.11, Spike S1 item 6 |
| F22 | T9 can't pass case-sensitive matching | P2 / P2 | Deferred → v0.7.0 | T9 → no match; delete the last sentence of FR-4's `with(` exception |
| F23 | Lexical regions need tests | P2 / P2 | Deferred → v0.7.0 | v0.6.0 names the shared parser (FR-4 code analysis) that F17 and F24 need. The FR-4 tokenizer fallback and T18–T20 are deferred |
| F24 | No exact string ≠ no connector access | P1 / P1 | Adopted | FR-7 connector detection, FR-9 O0, AC-8.8 |
| F25 | `get`-only names don't prove read-only | P2 / P3 | Owner decision | Whether Append and Append To join the write rule; reword the summary as "handler that only exports `get()`" |
| F26 | Inactive or ineffective permissions count | P1 / P1 | Adopted | FR-7 parent chain, FR-9, AC-8.8, data sources, Spike S1 item 5 |
| F27 | Role-linked grants are a subset | P2 / P2 | Deferred → v0.7.0 | Add the Authenticated Users and Anonymous Users role permissions to the grant set; label the snapshot |
| F28 | Settings evidence states | P2 / P3 | Deferred → v0.7.0 | Trim, then match `true`/`false` case-insensitively; anything else, or a duplicate, is Needs review |
| F29 | S1 identity-join fixtures | P2 / P3 | Deferred → v0.7.0 | S1 records exact queries, redacted samples and environment-variable-backed settings |
| F30 | O6 proves only that a list exists | P2 / P2 | Deferred → v0.7.0 | Structural O6 wording plus a coverage question; the `*.` wildcard goes to S4 |
| F31 | Timeout conditional on HttpClient | P2 / P2 | Deferred → v0.7.0 | A site-level banner like AC-7.9; drop the row exclusion |
| F32 | "No outbound calls" excludes CloudFlow | P2 / P3 | Deferred → v0.7.0 | O1 → "No HttpClient calls in code", plus a CloudFlow detail line |
| F33 | Reviewing unknown evidence | P2 / P2 | Owner decision | Recommended: no Mark as reviewed when the only reason is "couldn't read". The decision also covers "couldn't determine" (F24) and "couldn't evaluate parent" (F26) |
| F34 | Connection changes need unconditional invalidation | P1 / P1 | Deferred → v0.7.0 | AC-7.6: drop "When Inspector is open"; a scan ID discards stale results |
| F35 | Inventory paging and recovery | P2 / P3 | Deferred → v0.7.0 | Follow `@odata.nextLink`; an "Inventory incomplete" state; retry handling belongs to the host (S2) |
| F36 | No-sites message overstates inventory | P3 / P3 | Deferred → v0.7.0 | AC-7.8 names enhanced data model sites |
| F37 | Scan provenance undefined | P2 / P3 | Adopted | AC-9.2, AC-9.3, FR-10; change detection is Out of Scope |
| F38 | "Configured" labels erase review | P2 / P3 | Owner decision | Legend "C configured · V reviewed · M review"; needs design sign-off |
| F39 | Count variables inconsistent | P2 / P3 | Deferred → v0.7.0 | C/V/M/U/T variables; pluralised "U not scanned"; a 64-combination test |
| F40 | Export eligibility vs. partial results | P2 / P3 | Deferred → v0.7.0 | Export after a finished or stopped scan with at least one file; disabled while a scan runs |
| F41 | Reviewed exports omit reasons | P2 / P3 | Deferred → v0.7.0 | A Reviewed Finding cell lists every original reason, whatever the toggles are |
| F42 | Report escaping | P2 / P2 | Deferred → v0.7.0 | Escape Markdown table cells; HTML-escape values for PDF; a hostile-name fixture |
| F43 | Redacted file names vs. sanitation | P2 / P3 | Deferred → v0.7.0 | Sanitise the stem after redaction; redact the PDF title metadata |
| F44 | PDF pagination | P2 / P3 | Deferred → v0.7.0 | PDF paginates, repeats table headers and doesn't truncate |
| F45 | Export snapshot coordination | P2 / P3 | Deferred → v0.7.0 | The report is built from the state at Export |
| F46 | Export timing and failure | P2 / P3 | Deferred → v0.7.0 | Mirror AC-5.10 and AC-5.11 for reports |
| F47 | Disabled choices rely on tooltips | P2 / P2 | Deferred → v0.7.0 | `aria-disabled`, tooltip on focus and `aria-describedby`; also applies to the new Insert reasons (AC-6.8) |
| F48 | Keyboard behavior loose | P2 / P3 | Deferred → v0.7.0 | APG radio group, tabs and modal dialog; Esc then Tab leaves the editor |
| F49 | Async state and recovery | P2 / P3 | Deferred → v0.7.0 | `role="status"` toasts; error toasts stay until dismissed; always show "Scanned X of N"; "Couldn't copy" |
| F50 | Smaller panels and enlarged text | P3 / P3 | Owner decision | Minimum window size, 1100×780 or 1024×700 |
| F51 | Search and filter selection | P3 / P3 | Deferred → v0.7.0 | Select the first visible object; a member match selects that member |
| F52 | Report file name and font scopes | P3 / P3 | Deferred → v0.7.0 | Separate the display name from the export stem; bundle the report fonts locally |
| F53 | Pending design confirmation | P2 / P3 | Owner decision | Sign off A4 and A8; reword Open Questions |
| F54 | S4 can't prove four claims with one recipe | P1 / P2 | Deferred → v0.7.0 | One throwaway probe (get, post, liquidSync, liquidAsync, CloudFlow); toggle O3–O6 |
| F55 | CreateRecord ID casing | P2 / P2 | Deferred → v0.7.0 | `entityid ?? entityId`; a missing ID returns `status: "error"` |
| F56 | Parse tests don't prove behavior | P2 / P2 | Adopted | AC-4.12 |
| F57 | Missing-setting example returns an object | P2 / P2 | Deferred → v0.7.0 | `return JSON.stringify({ status: "error", … })` in FR-3 and Error Scenarios |
| F58 | R5 empty `put` body | P2 / P3 | Deferred → v0.7.0 | R5 row: `put` and `del` return nothing beyond `status` when `Body` is empty (lands with F03) |
| F59 | Spike evidence requirements | P2 / P3 | Deferred → v0.7.0 | Each spike records its calls, versions and outcome in `plan.md`; pin the R7 package to `7efe699`. v0.6.0 adds the "proposals until they run" rule (Open Questions) |

**Totals:** Adopted 13 (F08 partial) · Deferred → v0.7.0 40 · Owner decision 6.
