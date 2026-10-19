# Phase 19: Spike S3 and Handler R7 (Microsoft Graph & SharePoint)

**Implements:** FR-3 (the R7 row of the recipe table, the R7 rows of the recipe contract and Example requests tables, and the shared Musts R7 touches: form-encoded token body, R7 ticket safety and failure behavior F05/F06 with the stage table, Created record ID F55, logging rule F09, missing-setting rule F57, Body decoding F01, `contentType` on body-sending calls, validate before any call), FR-4 (zero hits in the generated server text), Spike S3 (FR-7 and Open Questions) | **Satisfies:** AC-3.2 (R7 half: zero FR-4 hits and parses as ES2023), AC-3.5 (the five settings are read through `Server.SiteSetting.Get`, never literals), AC-3.7 (R7 differs from Learn only by correction 17 and the FR-3 Musts, and `R7_DIFFERENCES` lists each), AC-3.10 (header comment links Learn and the GitHub sample package), AC-4.2 (the `highlightLines`), AC-4.10 (LF text that equals the download), AC-4.12 (R7 behavior cases), F05, F06, F09, F55, F57, F59 (S3 evidence recorded here); Learn corrections 11, 12, 14, 17 and 22 as listed in Decision 14
**Depends on:** 02 (`runBrowserChecks`), 05 (`getRecipe`, `snippets.ts`, `slugify`), 03 (test-only analysers), 10 (`CLIENT_PAYLOAD_KEYS` already holds R7 `id`; the client emits whatever example body `recipes.ts` carries). S3's script half is done (below). It runs after the owner approves the spec update in Task 1, and after Phases 14 and 17 merge, because Tasks 4 and 5 remove their `PENDING_R7` exclusions and extend their tests with R7. The collision probe (◆ owner) does not block this phase.
**Files:**
- Replace the stub: `src/services/generators/handlers/r7.ts`.
- Create: `src/services/generators/handlers/r7.test.ts`, `src/services/generators/handlers/__golden__/R7.js.txt`.
- Edit: `src/services/catalogue/recipes.ts` (R7 `examples.post` only), `src/services/catalogue/recipes.test.ts` (the one R7 assertion), `docs/specs/001-server-logic-starter-inspector/spec.md` (Task 1, through `sdd-spec-update`, with owner approval).
- Edit (Phases 14 and 17 files, Tasks 4 and 5): `src/services/generators/package/readmeNotes.ts` (`README_NOTES.R7`), `src/services/generators/package/readme.ts` (the `DIFFERENCES` map), their Phase 14 tests (including `package.integration.test.ts`, which holds `PENDING_R7` and its guard), and `src/services/generators/behavior/*` with its Phase 17 tests. Edits no other file. Not touched: `index.ts` (registry), `snippets.ts`, `r1.ts`–`r6.ts`, `r8.ts`–`r10.ts`, `demoPages.ts`, `slug.ts`, `browserChecks.ts`, `package.json`.

**Interfaces:**
- **Consumes** (exact names):
  - `getRecipe(id: RecipeId): RecipeMeta` from `@/services/catalogue/recipes`. R7 supplies `tables[0].entitySetName` (`crd69_eventregistrations`), `siteSettings`, `learnUrl` and `extraUrls`.
  - From `./snippets`: `TO_RESULT`, `headerComment(recipe)`, `requireSettingsCode(names, indent)`, `failureReturn(message, indent?)`, `validationFailureReturnFor(errorsVar, indent?)`, `logLine({ level, operation, fields?, result?, error?, indent? })` with the fields `status`, `reason`, `exception`, `activity`.
  - `GeneratedHandler` from `@/types/recipe`.
  - Tests only: `runBrowserChecks` (`@/lib/code-analysis/browserChecks`); `exportedFunctionNames`, `detectConnectorUse` (`@/lib/code-analysis/structure`); `slugify` (`@/lib/slug`); `parse` from `acorn`; `generateHandler` from `./index`; `readFileSync` from `node:fs`.
- **Produces:**
  - `generateR7(): GeneratedHandler` (the stub's own signature). The registry already maps it.
  - `R7_DIFFERENCES: readonly { change: string; reason: string }[]`, exported from `r7.ts`. Phase 14's `DIFFERENCES` map reads it for the README's "Differences from Learn" section (AC-3.7).
  - A real `examples.post` for R7 in the catalogue (Decision 2).

Phase 19 closes Spike S3, replaces the last stub in the handler registry and finishes the two phases that waited for it. R7 is the only handler that chains three stages: it gets a Graph token and finds the site's drive, uploads an HTML ticket, then creates the registration record. The spec fixes the stage order, the failure messages and the logging. This plan fixes the rest: a column-aware contract row (owner decision 2026-10-19), a form-encoded token body, a ticket file name built from `ActivityId`, `conflictBehavior=fail`, and one `R7_DIFFERENCES` list. The golden is hand-written from the spec and these Decisions before the generator exists. Nothing here runs the generated code: the behavior cases go into Phase 17's `node:vm` harness (Task 5). The generated handler has never run against a live tenant (Risk 2).

## Spike S3 evidence

Spec F59: each spike records its calls, versions and outcome in the plan of the phase that runs it. S3 has two halves. The script half is done. The collision probe is still open and is an owner step.

**Script half (done 2026-10-19)**
- **Source.** `https://github.com/microsoft/power-pages-samples`, commit `7efe69992663ce2629667a78549cc9d140c34bed` (the spec's pin `7efe699`). The sample folder is unchanged in code at the current `main` head `80900fd`; only `readme.md` differs. File: `samples/server-logic/sharepoint-integration/event-registration.zip`, entry `powerpagecomponents/2ac33283-8798-f011-bbd2-7ced8d6f9f6a/filecontent/event-registration.sl`. Fetched with git (a blob-less fetch of `main`, then `git show <sha>:<path>`) and unzipped with Python's `zipfile`.
- **Request body.** Read from the sample page that calls it (component `c982ee2a-…`, which uses `shell.ajaxSafePost`, confirming correction 9). Fields: `fullname`, `email`, `phone`, `event` (`parseInt` of a choice value), `eventText` (the choice label) and `date` (from an `<input type=date>`, so `YYYY-MM-DD`).
- **Table columns** (from `customizations.xml`):
  - `crd69_name`: nvarchar 850, required.
  - `crd69_email`: nvarchar 100.
  - `crd69_phone`: nvarchar 100.
  - `crd69_event`: picklist, with 197360000 "Tech Summit - General Admission", 197360001 "AI & Cloud Workshop", 197360002 "Leadership Forum" and 197360003 "Startup Pitch Night".
  - `crd69_preferreddate`: datetime.
  - `crd69_ticketurl`: nvarchar 1000.
- **Script flow.**
  1. It reads the five site settings at top level.
  2. `post` parses the Body.
  3. `getAccessToken` POSTs to `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token` with a `JSON.stringify`'d body but the content type `application/x-www-form-urlencoded`. This is the correction 17 defect.
  4. `generateTicket` builds a template-literal HTML ticket with no escaping and the file name `Ticket_<name without whitespace>.html`. It does GET `https://graph.microsoft.com/v1.0/sites/<HOSTNAME>:<SITE_PATH>` for `id`, then GET `…/sites/<siteId>/drive` for `id`, then PUT `…/drives/<driveId>/root:/Tickets/<fileName>:/content` with `text/html` (no `conflictBehavior`, so Graph replaces) for `webUrl`.
  5. `CreateRecord("crd69_eventregistrations", { crd69_name, crd69_email, crd69_phone, crd69_event, crd69_preferreddate, crd69_ticketurl: webUrl })`, then a check for `StatusCode == 204` and `Headers.entityId`.
  - A commented-out "Send confirmation email" step uses a `toBase64` helper that nothing else calls.
- **Defects R7 fixes.** The sample logs `err.message`, `siteId`, `driveId` and `webUrl`. It returns `err.message`. It has no input validation, no status checks on the Graph calls and no stage failures. It does not escape HTML. Its file name is collision-prone.
- **Learn tutorial page (read 2026-10-19).** It shows the same two excerpts (the config block with a stray `;;`, `getAccessToken`, and the site, drive and upload calls). It says the record's `crd69_ticketurl` holds the link. Its prerequisites are `Sites.ReadWrite.All`, and `Mail.Send` only for the optional email.
- **Learn Graph check (2026-10-19).** `@microsoft.graph.conflictBehavior` (`fail`, `replace` or `rename`) goes in the URL, and the default for PUT is `replace` (driveItem resource). PUT `/drives/{id}/items/{parent-id}:/{filename}:/content` returns 201 with a driveItem. The client-credentials token request is a form body whose `client_secret` "must be URL-encoded" (identity platform client credentials flow).

**Reconciliation with the spec.** The sample confirms correction 17 and the R7 Must. It also shows that the spec's contract row ("each field required by S3 is a non-empty string of at most 200 characters") does not fit the table: `event` is a picklist number, `date` is a date string and two columns hold at most 100 characters. The owner chose a column-aware contract row on 2026-10-19. Task 1 proposes it.

**Still open (◆ owner): the collision probe.** On a test SharePoint site, send two PUTs of the same file name to the exact R7 path with `?@microsoft.graph.conflictBehavior=fail`. Record whether the second returns 409 `nameAlreadyExists` and whether the first file is unchanged. Record the date, the tenant (redacted), and the request and response. Append the result to this file under a "Probe result" heading.
- **Pass:** the README notes may state that a name collision fails the upload.
- **Fail:** run `sdd-spec-update` before R7 ships. This is a release-gate item.
- R7 can be built before the probe passes. Until then the README makes no overwrite claim (Decision 12).

## Decisions

1. **Contract row (owner decision 2026-10-19, "column-aware").** The R7 validation is:
   - `fullname` and `eventText`: non-empty strings of at most 200 characters after trimming;
   - `email` and `phone`: non-empty strings of at most 100 characters (the column limits), and `email` also follows R2's rule (exactly one `@` and a `.` after it, checked with `split("@")` and `indexOf`, never `startsWith`/`endsWith`);
   - `event`: a whole number (`Number.isInteger`), not range-checked, because the table is replaceable;
   - `date`: a string matching `^\d{4}-\d{2}-\d{2}$`;
   - the body parses to an object (field `body`).

   All checks run before any call, so a bad value cannot orphan a ticket. Errors are collected into one `errors` array with the field names `body`, `fullname`, `email`, `phone`, `event`, `eventText`, `date`. A non-object body adds the single `body` error and returns at once. The messages are the plan's wording, in the style of Phase 07 Decision 4: "Body must be a JSON object.", "fullname is required and must be 200 characters or fewer.", "email must be a valid address of 100 characters or fewer.", "phone is required and must be 100 characters or fewer.", "event must be a whole number.", "eventText is required and must be 200 characters or fewer.", "date must look like 2026-11-05." The trimmed strings are what the ticket and the record use. An invalid choice value (a number the table does not list) still fails at create, after upload. The README says so (Decision 12).
2. **Example request.** `{ "fullname": "Alton Stott", "email": "alton@contoso.com", "phone": "555-123-4567", "event": 197360000, "eventText": "Tech Summit - General Admission", "date": "2026-11-05" }`. Task 2 puts it in `examples.post` with `query: null` and `liquidInput: null`. Phase 10's client then emits it as the POST body. Phase 10 has no R7 golden, so nothing there changes.
3. **Text format** follows Phase 07 Decision 2: `headerComment(getRecipe('R7'))` (the Learn link and the sample package link), a blank line, LF only, no BOM, 2-space indent, double quotes, every literal built with `JSON.stringify`, the generator joins an array of lines with `"\n"`, and the text ends with exactly one `\n`. The emitted runtime code may join strings with `+`; it uses no template literals.
4. **Top level, in order.** `TO_RESULT`; `const TICKETS_FOLDER = "Tickets";`; `const REGISTRATION_SET` taken from `getRecipe('R7').tables[0].entitySetName`, so the handler and the checklist cannot drift; then four `const` arrow helpers (the B1 convention from Phase 09 Decision 8, so `exportedFunctionNames(text)` equals `recipe.functions`, which is `['post']`; the spec calls `getAccessToken` a helper):
   - `escapeHtml`: replaces `&`, `<`, `>`, `"` and `'`.
   - `nameSlug`: the AC-2.2 rule from `src/lib/slug.ts` (lowercase, runs outside `a-z0-9` become `-`, trim dashes), then cut to 50 characters with trailing dashes trimmed, and `"registrant"` when the result is empty (FR-3 R7 Must). It has no device-name rule, because the `ActivityId-` prefix already makes the name safe.
   - `parseJsonObject`: parse of `Server.Context.Body`, returns an object or `null`.
   - `getAccessToken`: `async (tenantId, clientId, clientSecret) =>` that builds the form body, awaits `PostAsync` and returns the `toResult` value. It does not check or log. `post` does, so each log carries its fixed operation name.

   Then `async function post()`. Top-level helpers are accepted at runtime (correction 22).
5. **Order inside `post`.**
   1. Parse and validate (Decision 1). On any error, return `validationFailureReturnFor("errors")` before anything else.
   2. `requireSettingsCode(["CLIENT_ID", "CLIENT_SECRET", "TENANT_ID", "HOSTNAME", "SITE_PATH"], …)` (F57). The variables are `clientId`, `clientSecret`, `tenantId`, `hostname`, `sitePath`. Validation comes first, so a request that is invalid anyway gets no configuration hint.
   3. Connect stage (Decision 6).
   4. Upload stage (Decision 7).
   5. Create stage (Decision 8).
   6. Success: `{ status: "success", id }`.
6. **Connect stage**, in its own `try`:
   - Token: `getAccessToken(tenantId, clientId, clientSecret)`. Inside it, the URL is `"https://login.microsoftonline.com/" + encodeURIComponent(tenantId) + "/oauth2/v2.0/token"`, the call is `PostAsync(url, form, { "Content-Type": "application/x-www-form-urlencoded" }, "application/x-www-form-urlencoded")`, and `form` is `"client_id=" + encodeURIComponent(clientId) + "&client_secret=" + encodeURIComponent(clientSecret) + "&scope=" + encodeURIComponent("https://graph.microsoft.com/.default") + "&grant_type=client_credentials"` (correction 17, FR-3 Musts).
   - Every call result goes through `toResult` and an `IsSuccessStatusCode` check. The token `Body` is decoded with `JSON.parse`, and `access_token` must be a non-empty string.
   - Site: GET `"https://graph.microsoft.com/v1.0/sites/" + hostname + ":" + sitePath`. Drive: GET `"https://graph.microsoft.com/v1.0/sites/" + siteId + "/drive"`. Both send `{ Authorization: "Bearer " + token }` and no content type (a GET sends no body, correction 12). `siteId` and `driveId` must be non-empty strings.
   - Any non-success status or missing value logs `R7 connect` with `status` and `reason` of the failing result and returns "Couldn't connect to SharePoint." A throw (including a bad JSON `Body`) logs `R7 connect` with `exception` and returns the same message. Each of the three results has its own variable, so `logLine`'s `result` option names the right one.
7. **Upload stage**, in its own `try`:
   - File name: `Server.Context.ActivityId + "-" + nameSlug(fullname) + ".html"`. `nameSlug` leaves only `a-z`, `0-9` and `-`, so a slash, quote, `%` or `#` cannot change the `root:/…:/content` path.
   - URL: `"https://graph.microsoft.com/v1.0/drives/" + driveId + "/root:/" + TICKETS_FOLDER + "/" + fileName + ":/content?@microsoft.graph.conflictBehavior=fail"`.
   - Call: `PutAsync(url, ticketHtml, { Authorization: "Bearer " + token, "Content-Type": "text/html" }, "text/html")`.
   - Ticket HTML: Learn's markup (heading, name, event, date and the thank-you line) with the name, event label and date each passed through `escapeHtml`. The generator emits the markup as a concatenation of string literals. The ticket text uses no word from FR-4's browser list.
   - A non-success status (including 409) logs `R7 upload` with `status` and `reason` and returns "Couldn't upload the ticket." A throw logs `R7 upload` with `exception` and returns the same message. No record is written.
   - `webUrl` is read from the decoded upload `Body`. An empty or unreadable `Body`, or a missing `webUrl`, gives `null` and the run continues, because the file exists and the status check passed. The decode sits in a small inner `try` that falls back to `null`, so it cannot turn a good upload into a failure.
8. **Create stage**, in its own `try`. The call is not awaited (correction 19): `toResult(Server.Connector.Dataverse.CreateRecord(REGISTRATION_SET, JSON.stringify({ crd69_name, crd69_email, crd69_phone, crd69_event, crd69_preferreddate, crd69_ticketurl })))`, with the six values taken from the trimmed fields and `webUrl`. The status check uses `IsSuccessStatusCode`, not the sample's `== 204`. The id is `const id = r.Headers && (r.Headers.entityid ?? r.Headers.entityId);` (F55, Spike S4). A failure or a missing id logs `R7 create after upload` with `status`, `reason` and `activity` (the `ActivityId` is the file name's prefix, so the orphan can be found without logging the name) and returns "Registration failed after the ticket was uploaded." A throw logs the same operation with `exception` and `activity`, and returns the same message (the F06 table). The ticket stays as an orphan. The handler never deletes, reuses or reconciles files (Out of Scope: no compensation).
9. **Logging (F09).** Only the three operation names `R7 connect`, `R7 upload` and `R7 create after upload`. The text never logs the token, the secret, the settings' values, ids, `webUrl`, any URL, the name, the Body or `e.message`. The learn sample's `Server.Logger.Log` lines are gone, and there is no log on success. The missing-setting lines from `requireSettingsCode` log the setting name only.
10. **Highlights (AC-4.2).** Five lines, ascending: the `PostAsync` line (inside `getAccessToken`), the site `GetAsync`, the drive `GetAsync`, the `PutAsync`, and the `CreateRecord`. These are "the lines that do the recipe's data access". Each statement is kept on one line. Tests assert the literal 1-based numbers counted in the committed golden and that each numbered line holds its call text.
11. **Not generated.** The optional email step and `toBase64`. Learn publishes no code beyond the commented sample, and the FR-3 R7 row says the step is not generated. The README says so (Decision 12).
12. **README notes (`README_NOTES.R7`).** Seven short notes, each from the spec or this plan:
    - Global access is expected, and Inspector will flag it for review.
    - `Sites.Selected` is a least-privilege alternative to Learn's `Sites.ReadWrite.All`.
    - Hold `CLIENT_SECRET` in Azure Key Vault behind an environment variable.
    - Retries: a retry is a new request with a new ActivityId and uploads another ticket. Find orphans by the ActivityId prefix of the file name and delete them manually.
    - No overwrite claim until the collision probe passes. After a pass, the note may say that a name collision fails the upload. The release gate records the pass.
    - An invalid choice value fails after the upload, so the ticket is orphaned.
    - The optional email step from Learn's sample is not generated.
13. **Trusted values in URLs.** `HOSTNAME`, `SITE_PATH` and the Graph-returned `siteId` and `driveId` go into URLs unencoded, as Learn does. `siteId` contains commas and `SITE_PATH` contains slashes, so encoding would break the Graph path. They are maker configuration or Graph output, not request text. The FR-3 rule "every free-text value placed in a URL is `encodeURIComponent`'d" applies to request values, and the only one here (the name) is slugged. Risk 5 lists this. `tenantId` is encoded, because it costs nothing and a GUID is unchanged.
14. **Corrections in play:** 11 (`toResult`, status checks, `Body` decoding), 12 (`contentType` on the token POST and the PUT, none on the GETs), 14 (wording), 17 (form-encoded token body, the stray `;;` dropped), 19 (`CreateRecord` is not awaited) and 22 (top-level helpers). Correction 20 is covered because every call has the `IsSuccessStatusCode` check, which catches `StatusCode` 0 for a blocked domain. Corrections 16 and 21 need no guard: R7 reads no `Server.User`, so there is nothing to emit. A test asserts the text never mentions it (Task 3).
15. **FR-4 wording rules** for every emitted line, comments and strings included (correction 14). No `fs.` anywhere (watch words that end in "fs." before a full stop), no anonymous `function (`, no `with(`, no `delete <name>`, no `prototype`, none of `fetch`, `window`, `document`. Comments are short plain `//` lines with no parenthesis after a name. `runBrowserChecks` is the oracle.
16. **`R7_DIFFERENCES`** lists these twelve entries, each with a one-sentence `reason` tied to a spec line (AC-3.7):
    - site settings are read inside `post` with fail-closed checks, not at top level (F57);
    - the token body is form-encoded (correction 17);
    - every call has a status check and each stage has its own failure (F06);
    - ticket HTML is escaped (F05);
    - the ticket file name is built from `ActivityId` and a name slug, not the raw name (F05);
    - the upload sets `conflictBehavior=fail` (F05; unverified until the probe passes);
    - no `err.message`, id or URL logging (F09);
    - the return shape is the fixed `{ status, id }`;
    - input is validated against the table's columns before any call;
    - the optional email step and `toBase64` are not generated;
    - the stray `;;` is removed;
    - the table permission is Global with Create only (F04).

    The text is the plan's wording. A drift test pins the list to the entries above by count and keys.
17. **Static checks only.** The tests in Task 3 parse the text and read its structure. They never run it. Phase 17 runs it in `node:vm` (Task 5).

## Tasks

### Task 0: Record the S3 evidence and hand off the probe
**Description:** This file is the record. The "Spike S3 evidence" section above holds the script half (source, commit, flow, columns, defects and the Learn checks). Hand the collision probe to the owner as a ◆ item: the owner runs it on a test SharePoint site and appends a "Probe result" heading to this file with the date, the tenant (redacted), the request and the response. Nothing else in the phase waits for it, except the README claim (Decision 12) and the release gate.
**Red first:** none (documentation). The check is that the evidence section names the commit, the file path, the request body fields, the table columns, the flow and the defects, and that the probe's pass and fail outcomes are written down.
**Acceptance criteria:**
- [x] The evidence section records the source commit (`7efe699`, full SHA), the sample file path, the request body, the columns, the script flow and the defects R7 fixes (F59, Spike S3).
- [x] The probe is listed as open, with the exact request, the pass outcome and the fail outcome (Spike S3, F05).
- [x] The probe is handed to the owner as a release-gate item, named in Risk 1.
**Verification:** Read the section against the spec's Spike S3 text; `npx prettier --check docs/specs/001-server-logic-starter-inspector/plans/phase-19-handler-r7.md`.
**Files:** this file.
**Scope:** XS

### Task 1: Spec update (owner approval before the golden)
**Description:** Invoke `sdd-superpowers:sdd-spec-update` and propose, in the spec:
- the R7 row of the recipe contract table: the column-aware validation of Decision 1, replacing "each field required by S3 is a non-empty string of at most 200 characters" and "fields set by Spike S3";
- the R7 row of the Example requests table: the body of Decision 2;
- Open Questions: mark S3's script half done on 2026-10-19 (source, commit, outcome, pointing to this file) and keep the collision probe open;
- a Change Log row for the update.

The owner approves the diff before Task 3 starts. Without approval, the golden would pin text the spec does not yet say.
**Red first:** none (document change). The owner's approval is the gate. The cross-check is Task 2's test, which reads the example from the spec's wording.
**Acceptance criteria:**
- [x] The R7 contract row and example request in the spec match Decisions 1 and 2 word for word on limits, rules and values (FR-3).
- [x] Open Questions say S3's script half is done and the probe is open (F59).
- [x] The owner approved the diff in this conversation or the PR before Task 3's first commit.
- [x] No other spec text changed.
**Verification:** `git diff -- docs/specs/001-server-logic-starter-inspector/spec.md` shows only the three edits and the Change Log row; `npx prettier --check docs/specs/001-server-logic-starter-inspector/spec.md`.
**Files:** `docs/specs/001-server-logic-starter-inspector/spec.md`
**Scope:** S

### Task 2: R7 example request in the catalogue
**Description:** Replace R7's `examples.post` (`NO_INPUT` and its deferral comment) in `recipes.ts` with `query: null`, the Decision 2 body and `liquidInput: null`. Rewrite the one deferred assertion in `recipes.test.ts`. Phase 10's client then emits the body with no edit.
**Red first:** in `recipes.test.ts`, change "R7 post is the one value deferred to Spike S3" into "R7 post carries the column-aware example": `getRecipe('R7').examples.post` equals `{ query: null, body: { fullname: "Alton Stott", email: "alton@contoso.com", phone: "555-123-4567", event: 197360000, eventText: "Tech Summit - General Admission", date: "2026-11-05" }, liquidInput: null }`. Add "the R7 example passes the R7 contract row": `fullname` and `eventText` are non-empty and at most 200 characters, `email` and `phone` are at most 100, `email` has one `@` and a `.` after it, `event` is an integer and `date` matches `^\d{4}-\d{2}-\d{2}$`. Run it and watch both fail on `NO_INPUT`, then edit `recipes.ts`.
**Acceptance criteria:**
- [x] R7's example body is the one in the spec's Example requests table (FR-3).
- [x] The example satisfies its own contract row (Decision 1).
- [x] No other recipe's example changed; the "no example keeps the literal `<guid>` placeholder" test still passes.
**Verification:** `npx vitest run src/services/catalogue/recipes.test.ts` (red, then green); `npx vitest run src/services/generators/client` stays green with no golden edited.
**Files:** `src/services/catalogue/recipes.ts`, `src/services/catalogue/recipes.test.ts`
**Scope:** XS

### Task 3: R7 golden, tests and generator
**Description:** Hand-write `__golden__/R7.js.txt` from the approved spec, the S3 evidence and Decisions 3 to 11 and 15. Then write `r7.test.ts`, then implement `generateR7` and `R7_DIFFERENCES` (Decision 16) by composing the Phase 05 snippets. The golden is never pasted from generator output. The commit with the golden and test (`test(handlers): R7 golden and checks`) comes before the generator commit (`feat(handlers): R7 Graph and SharePoint`).
**Red first:** `r7.test.ts`, run against the throwing stub, one test each:
- "matches the golden file": `generateR7().text` `toBe` the golden text, which ends with one `\n` and starts with `headerComment(getRecipe('R7'))`.
- "highlights the five connector lines": `highlightLines` equals the literal ascending array counted in the golden, and the numbered lines contain, in order, `PostAsync(`, `GetAsync(` (site), `GetAsync(` (drive), `PutAsync(` and `CreateRecord(`.
- "has zero FR-4 hits": `runBrowserChecks(text)` gives `hits: []` and `parseFailed: false`; `parse` at ES2023 does not throw.
- "exports only post": `exportedFunctionNames(text)` equals `['post']` and equals `getRecipe('R7').functions`; `detectConnectorUse` reports HttpClient and Dataverse.
- "async only where it awaits HttpClient": the only `async` tokens are on `post` and `getAccessToken`, the only `await` expressions are on `getAccessToken(` and the three-call `HttpClient` lines, and `CreateRecord` is never awaited (correction 19).
- "runs the stages in order": by text index inside `post` (the text sliced from `async function post`), the validation return comes before the first `Server.SiteSetting.Get(`, which comes before `getAccessToken(`, which comes before the site `GetAsync(`, then the drive `GetAsync(`, then `PutAsync(`, then `CreateRecord(`.
- "form-encodes the token body": the `getAccessToken` text builds `client_id=`, `&client_secret=`, `&scope=` and `&grant_type=client_credentials`, wraps each value with `encodeURIComponent(`, passes `application/x-www-form-urlencoded` as both the header and the `contentType`, and has no `JSON.stringify(` on the form (correction 17).
- "uploads to a safe, collision-checked path": the upload URL contains `TICKETS_FOLDER` and `@microsoft.graph.conflictBehavior=fail`; the file name expression is `Server.Context.ActivityId + "-" + nameSlug(` plus `".html"`; `PutAsync` passes `"text/html"` as the contentType.
- "escapes every ticket value": `escapeHtml(` is applied to `fullname`, `eventText` and `date` in the ticket text, and the helper replaces the five characters `&`, `<`, `>`, `"` and `'`.
- "uses the exact stage names and messages": the text contains `"R7 connect"`, `"R7 upload"` and `"R7 create after upload"`, and the `failureReturn` lines for "Couldn't connect to SharePoint.", "Couldn't upload the ticket." and "Registration failed after the ticket was uploaded.", and no other `Server.Logger.` operation name besides the `Missing site setting …` lines.
- "logs the activity id after a failed create": the create-stage log lines contain `Server.Context.ActivityId`; the connect and upload log lines do not.
- "obeys the logging rule": every `Server.Logger.` line matches the allowed shapes (a JSON-string operation name, optionally joined with `.StatusCode`, `.ReasonPhrase`, `e.name` or `Server.Context.ActivityId`), no `Server.Logger.Log(` exists, and no log line mentions `Body`, `message`, `Url`, `token`, `siteId`, `driveId` or `webUrl`.
- "reads the created id the F55 way": the text contains `r.Headers && (r.Headers.entityid ?? r.Headers.entityId)` and returns the failure when `id` is missing.
- "validates the column-aware contract row": the text holds the limits `200` and `100`, `Number.isInteger(`, the date pattern `^\d{4}-\d{2}-\d{2}$`, `split("@")` with `parts.length === 2` and `indexOf(".")`, and the seven field names in the `errors` array; it has no `startsWith` or `endsWith`.
- "reads no Server.User": the text never contains `Server.User`.
- "has no literal secret or endpoint value": no GUID-shaped literal and no tenant or host value; the only `https://` literals are the two Graph URL prefixes, the login URL prefix and the scope.
- "reads the five settings only through Get": each of `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `HOSTNAME` and `SITE_PATH` appears only inside its `Server.SiteSetting.Get(` argument and the two fixed missing-setting strings from `requireSettingsCode` (AC-3.5, F57).
- "does not generate the email step": the text has no `toBase64`, `sendMail` or `Mail.Send`.
- "header links Learn and the sample package": the first lines equal `headerComment(getRecipe('R7'))`, which holds the `learnUrl` and the `extraUrls[0]` (AC-3.10).
- "is deterministic and LF only": two calls are equal, no `\r`, no BOM, one trailing `\n`; `highlightLines` is non-empty, ascending, 1-based and within the line count.
- "R7_DIFFERENCES lists the twelve differences": the array has twelve entries, each with a non-empty `change` and `reason`, and the changes match Decision 16.
- "registry returns the same handler": `generateHandler('R7')` deep-equals `generateR7()`.
**Acceptance criteria:**
- [x] The text equals the golden byte for byte and the three stages run in the spec's order with their own fixed operation names and messages (FR-3 R7 Must, F05, F06).
- [x] The token body is form-encoded with `encodeURIComponent` on each value, every call has `toResult` and an `IsSuccessStatusCode` check, and `CreateRecord` is not awaited (correction 17, corrections 11, 19).
- [x] Input is validated against the column-aware contract row before any call; the five settings are read through `Server.SiteSetting.Get` and fail closed before the first outbound call (Decision 1, AC-3.5, F57).
- [x] The ticket HTML is escaped, the file name is `ActivityId-slug.html`, and the upload URL carries `conflictBehavior=fail` (F05).
- [x] The logging rule holds, and the text has zero FR-4 hits, one highlight per connector call, no `Server.User` and no email step (AC-3.2, AC-4.2, F09).
- [x] `R7_DIFFERENCES` has the twelve entries of Decision 16 (AC-3.7).
**Verification:** `npx vitest run src/services/generators/handlers/r7.test.ts` (red before `r7.ts`, green after); `npx eslint src/services/generators/handlers/r7.ts src/services/generators/handlers/r7.test.ts --max-warnings=0`; `npx prettier --check src/services/generators/handlers`; `npx tsc -b`.
**Files:** `__golden__/R7.js.txt`, `r7.test.ts`, `r7.ts`
**Scope:** M

### Checkpoint 1 (after Tasks 0 to 3)
`npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run` all green. `git status --short` lists only the Phase 19 files so far. `generateHandler('R7')` returns real text. Phases 14 and 17 must be merged before Task 4 starts.

### Task 4: Extend Phase 14 (package and README)
**Description:** In the Phase 14 files, remove `PENDING_R7` and the guard that uses it, so the package builds for R7. Add R7 to the `DIFFERENCES` map in `readme.ts`, reading `R7_DIFFERENCES`. Add `README_NOTES.R7` in `readmeNotes.ts` with the seven notes of Decision 12. The README keeps its existing shared lines (the upstream-credentials line, "Validation isn't authorization; table permissions are.", the `x-ms-user-trace` troubleshooting note). If the Phase 14 files name these differently, follow their names and record the mapping in Risk 7.
**Red first:** in the Phase 14 tests, first delete the R7 exclusion so the R7 cases fail on the guard, and add:
- "R7 builds a starter package": the zip holds `<slug>.sl`, `README.md` and the checklist for R7, with no `<slug>.page.html` (AC-3.9: R7 has no demo page).
- "R7 README lists every difference with its reason": each `R7_DIFFERENCES` entry appears under "Differences from Learn".
- "R7 README notes": Global access is expected, `Sites.Selected`, Key Vault, the retry and orphan wording (ActivityId prefix, delete manually), "invalid choice value", and "email step"; and it makes no claim that an upload "cannot overwrite" or "can't overwrite" a file while the probe is open.
- "R7 README carries the upstream-credentials line".
- "no recipe is pending": the guard list is empty for all ten recipes.
**Acceptance criteria:**
- [x] `PENDING_R7` and its guard no longer exist in Phase 14's code or tests (AC-5.6, AC-5.7).
- [x] The R7 README lists all twelve differences with reasons and carries the seven notes (AC-3.7, F05, F06, F10).
- [x] The README makes no overwrite claim until the probe passes (Spike S3, F05).
**Verification:** `npx vitest run src/services/generators/package`; then the full set in Checkpoint 2.
**Files:** `src/services/generators/package/readmeNotes.ts`, `src/services/generators/package/readme.ts`, and the Phase 14 test files that held the R7 exclusion
**Scope:** S

### Task 5: Extend Phase 17 (behavior harness)
**Description:** In `src/services/generators/behavior/*`, remove `PENDING_R7` and its guard, and add R7 to the configuration list. The 36 configurations stay 36, with none pending. Add the R7 cases below. The harness runs the real `generateR7().text` in `node:vm` against stub connectors with a call queue, a sentinel secret and a captured logger. The R7 queue has five calls in order: token, site, drive, upload, create.
**Red first:** in the Phase 17 tests, first drop the exclusion and watch the R7 cases fail, then add:
- "success through the five-call queue": the five calls run in order with the Decision 6 to 8 URLs, the handler returns `{ status: "success", id }`, and the returned keys equal `CLIENT_PAYLOAD_KEYS['R7.post']` plus `status`.
- "each stage's failure returns its exact message and stops": a failing token, site or drive result gives "Couldn't connect to SharePoint." with later calls uncalled; a failing upload gives "Couldn't upload the ticket." with no `CreateRecord`; a failing create or a missing id gives "Registration failed after the ticket was uploaded." and logs `R7 create after upload` with the ActivityId.
- "a 409 upload stops before CreateRecord": status 409 gives "Couldn't upload the ticket." and the stub records zero `CreateRecord` calls.
- "a thrown connector call takes the stage's catch": the same messages, with `e.name` only in the log.
- "each of the five settings missing gives F57 with zero calls": for `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `HOSTNAME` and `SITE_PATH` in turn, the handler returns "Server logic isn't configured: missing site setting <name>" and no connector is called.
- "invalid input makes zero calls": a non-object body, a missing `fullname`, an `email` without a dot after the `@`, a 101-character `phone`, an `event` of `"1"`, and a `date` of `"05/11/2026"` each return the `errors` entry for that field and call nothing.
- "a hostile name is escaped and slugged": `</p><script>`, a name with slashes, `%`, `#` and quotes gives escaped text in the uploaded HTML (the raw characters never appear) and a file name that matches `^<ActivityId>-[a-z0-9-]*\.html$`; an empty name (after trimming, a name of only symbols) gives a file name ending `-registrant.html`.
- "`nameSlug` agrees with `slugify`": for ordinary names whose slug is at most 50 characters, and one long single word, the file-name slug equals `slugify(name).slug` cut to 50 with trailing dashes trimmed.
- "the token body parses as form data": parsing the posted body with `URLSearchParams` gives the four keys, `client_secret` equals the sentinel after decoding, and the raw body contains the URL-encoded sentinel (a sentinel with `&`, `=`, `+` and a space proves the encoding); the header and `contentType` are `application/x-www-form-urlencoded`.
- "no sentinel in logs or failure returns": across every case above, the captured log lines and the returned text never contain the sentinel secret, the token, the site or drive id, the `webUrl` or the registrant's name.
- "the id comes from entityId or entityid": both header spellings give the same `id`.
- "a missing webUrl still creates the record": an upload `Body` without `webUrl` gives `crd69_ticketurl: null` in the create payload and a success.
**Acceptance criteria:**
- [ ] The harness runs R7 with the 36 configurations and none pending (AC-4.12).
- [ ] Every stage's failure gives its exact message, and a later stage is never called (FR-3 R7 Must, F06).
- [ ] The token body is form data with the sentinel secret URL-encoded, and no sentinel, token, id, URL or name reaches a log or a failure return (correction 17, F09).
- [ ] A hostile name cannot change the upload path or inject markup (F05).
**Verification:** `npx vitest run src/services/generators/behavior`; then the full set in Checkpoint 2.
**Files:** `src/services/generators/behavior/*` (the R7 exclusion, the configuration list and the new R7 test file), and the Phase 17 tests that held the exclusion
**Scope:** M

## Checkpoint 2 (after Tasks 4 and 5, the phase gate)
Run in order, all with zero warnings: `npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run`. Then:
- `git status --short` lists only the files named under **Files**.
- `grep -rn "PENDING_R7" src` prints nothing.
- The harness reports 36 configurations, none pending.
- `git diff --stat -- src/services/generators/handlers/index.ts src/services/generators/handlers/snippets.ts src/lib` prints nothing.

## Risks and open questions

1. **The collision probe is pending (◆ owner).** Until it passes, `conflictBehavior=fail` is documented Graph behavior but unverified for R7's exact path. The README makes no overwrite claim, and the release gate carries the probe. If it fails, `sdd-spec-update` runs before R7 ships (Spike S3).
2. **The live tenant run is unverified.** The form-encoded token body (correction 17) and Graph calls through `HttpClient` have never run against a real tenant. Phase 17 proves the shape against stubs only. The PPTB-and-site smoke in the release gate should include one real R7 registration. `HttpClient` also adds an undocumented `IsBinaryBody` key (Spike S4), which `toResult` ignores.
3. **A ticket can be orphaned.** An invalid choice value (Decision 1 does not range-check `event`), a missing column or a Dataverse-side rejection fails at create, after upload. The handler never compensates (Out of Scope), the README says so and explains how to find orphans by the ActivityId prefix.
4. **The spec update must be approved before the golden.** If the owner changes the contract row in Task 1, the golden, the example and two test lists change with it. Nothing else does.
5. **Trusted URL values are unencoded** (Decision 13). `HOSTNAME`, `SITE_PATH` and the Graph ids go into URLs as Learn does. A maker who sets `SITE_PATH` badly gets a Graph error and the "Couldn't connect" message, not an injection from a caller. The README should tell the maker to write `SITE_PATH` in the form Learn shows, with a leading colon and slash (for example `:/Events`).
6. **`webUrl` may be absent.** The record is still created with `crd69_ticketurl: null` (Decision 7). A maker who needs the link must check the column. The alternative, failing, would orphan a ticket that exists.
7. **The sample's columns are replaceable.** Makers with their own table must edit the field names, the entity set and the contract limits (Decision 1 follows the sample's column sizes). The checklist note and README say the table is replaceable. If the Phase 14 or 17 files name `PENDING_R7`, `README_NOTES`, `DIFFERENCES` or the behavior configuration list differently from this plan, Tasks 4 and 5 follow their names. Task 4's red-first line says `<slug>.sl`; Phase 14's zip uses `<slug>.js`. The R7 package test follows `.js`.
8. **Date column handling is unverified.** `crd69_preferreddate` is a datetime column and the handler sends the `YYYY-MM-DD` string as is. Dataverse should read it as midnight UTC. The live run in Risk 2 confirms it; if not, the spec update, golden and example change together.
9. **Phase 14 and 17 timing.** Tasks 4 and 5 edit files owned by those phases. Start them only after both merge, or two branches will edit the same lines.
10. **Fixed messages are the plan's wording** (Decision 1 for validation; the stage messages are the spec's). If the owner wants other copy for validation, only the golden and the tests change.
11. **Phase 10's client test pinned a null R7 body.** `client.test.ts` expected `examples.post.body` null and a `{}` fetch body. That assertion now expects the Decision 2 body. `client.ts` and the client goldens are unchanged.

## Done when
- `generateHandler('R7')` returns real text and highlights, `R7_DIFFERENCES` is exported, and the golden, `r7.test.ts` and the generator exist.
- The text has zero `runBrowserChecks` hits, parses as ES2023, matches the catalogue (functions, connector use, settings, server objects) and follows the logging rule.
- The spec update was approved and merged, and R7's example request is in the catalogue.
- `PENDING_R7` is gone from Phases 14 and 17, the R7 README notes and differences are in the package, and the harness runs all 36 configurations with none pending.
- The S3 script-half evidence is in this file, and the collision probe is recorded as open, with the owner holding it.
- Every Task's acceptance criteria are ticked, Checkpoint 2 is green with fresh command output, and the red-first order is visible in history: the golden and test commit precedes the generator commit.
