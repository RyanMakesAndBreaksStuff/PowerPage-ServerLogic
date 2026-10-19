# Phase 14: Starter package and Download

**Implements:** FR-5 (download `<slug>.zip` with exactly the AC-5.6 files: four for every recipe, five for R4–R6; download at any readiness level, marking the open items; never claim that permissions exist), FR-3 Musts that reach the README and checklist (upstream-credentials line F10, "Validation isn't authorization; table permissions are." F08, the Key Vault guidance for secrets, the logging rule for the button's own logs), the generated README and checklist text for the Learn corrections it touches (14, 20, 23) | **Satisfies:** AC-5.1 (the README half: the browser-check result and the text-pattern statement, F14), AC-5.3 (the "Generated validation; edits aren't rechecked." line), AC-5.4 (the checklist label, F13), AC-5.6 (zip contents, endpoint or Liquid tag F11, request path, Learn links, troubleshooting, toast), AC-5.7 ("Needs attention" marks), AC-5.10 (error toast, untouched inputs, one in-memory write, no toast on cancel), AC-5.11 (the in-tool build budget; the live 2 s measurement is a ◆ release-smoke item), AC-3.7 (the "Differences from Learn" section), AC-4.10 (the downloaded server text is the pane text), NFR Security F20 (the user's code is downloaded exactly as written, never scanned or redacted)
**Depends on:** 07, 08, 09, 10 (wave B1) and Part A (18a). Phase 19 (R7) is not required; it later extends this phase's tests and notes.
**Files:**
- Replace the stubs (whole files): `src/services/generators/package/buildPackageFiles.ts`, `src/services/generators/package/buildZip.ts`, `src/features/starter/download/DownloadStarterButton.tsx`.
- Create: `src/services/generators/package/readme.ts` (`buildReadme`, `readinessBlock`) and `src/services/generators/package/readmeNotes.ts` (data only).
- Create tests: `buildPackageFiles.test.ts`, `readme.test.ts`, `buildZip.test.ts` (all in `src/services/generators/package/`), `src/features/starter/download/DownloadStarterButton.test.tsx`, and `src/services/generators/package/package.integration.test.ts`.
- Create hand-written goldens in `src/services/generators/package/__golden__/`: `R1.README.md.txt`, `R4.README.md.txt`, `R8.README.md.txt`, `R1.permission-checklist.md.txt`, `R4.permission-checklist.md.txt`, `R10.permission-checklist.md.txt`.
- Edits no other file. Not touched: `package.json`, `recipes.ts`, the handlers, the client generator, `StarterPage` (Phase 18 mounts the button).

**Interfaces:**
- **Consumes** (exact names and paths):
  - Types: `StarterPackageInput` (`{ state; derived; clientText }`), `StarterState`, `StarterDerived` from `@/app/starter-session/starterSession.types`; `RecipeId`, `RecipeMeta` from `@/types/recipe`; `ClientLanguage` from `@/types/http`; `FileFilter`, `SaveResult`, `Notice` from `@/services/pptb/host.types`.
  - Catalogue: `getRecipe`, `checklistLines`, `UPSTREAM_CREDENTIALS_LINE` from `@/services/catalogue/recipes`. The README reads the fields `name`, `webRole`, `learnUrl`, `extraUrls`, `upstreamCredentials`, `prerequisites`, `demoPage`, `outboundDomains` and `functions`.
  - Generators: `generateDemoPage(id, slug)`, and `R4_DIFFERENCES`, `R5_DIFFERENCES`, `R6_DIFFERENCES` (each `readonly { change: string; reason: string }[]`) from `@/services/generators/handlers/r4`, `.../r5` and `.../r6` (Phase 08); `generateClient`, `requestPathSteps`, `LIQUID_SERVER_NOTE` from `@/services/generators/client/client` (Phase 10). `CLIENT_PAYLOAD_KEYS` is not used here.
  - Text: `normalizeLf` from `@/lib/text`. Zip: `zipSync`, `strToU8` (and `unzipSync`, `strFromU8` in tests only) from `fflate`.
  - UI: `Button` (`@/components/Button`, props `variant="primary"`, `fullWidth`, `busy`), `Icon` with the name `arrow-download` (`@/components/icons`), `useNotify` (`@/app/useNotify`), `useHost` (`@/app/HostContext`), `useStarterSession` (`@/app/starter-session/useStarterSession`).
  - Tests only: `initialStarterState`, `createStarterReducer` (`@/app/starter-session/starterReducer`), `deriveStarter` (`@/app/starter-session/deriveStarter`), `STARTER_DEPS` (`@/app/starter-session/starterDeps`), `StarterSessionContext` (`@/app/starter-session/useStarterSession`), `RESTRICTED_PATTERNS` (`@/lib/code-analysis/browserChecks`), `generateHandler` (`@/services/generators/handlers`), `createFakeHost` (`@/services/pptb/fakeHost`), `HostContext`, `NotifyProvider`, `RECIPES`.
- **Produces** (the stubs' own signatures, unchanged):
  - `buildPackageFiles(i: StarterPackageInput): readonly { path: string; content: string }[]`.
  - `buildZip(files: readonly { path: string; content: string }[]): Uint8Array`.
  - `DownloadStarterButton(): ReactNode`, with no props. It reads the session, host and notifier from context.
  - New and package-internal: `buildReadme(i: StarterPackageInput): string` and `readinessBlock(derived: StarterDerived): string` in `readme.ts`; `README_NOTES: Partial<Record<RecipeId, readonly string[]>>` in `readmeNotes.ts`.

Phase 14 replaces three stubs with the package: a pure function that turns the Starter session into four or five text files, a zip writer, and the Download button. The README and the checklist are built from fixed catalogue strings, the slug and the browser-check labels only. The user's server code goes into `<slug>.js` untouched. The button builds the zip in memory, hands the host the full bytes in one `saveFile` call, and reports the result with a toast. It never changes the session. The six golden files are written by hand from the spec before the builders exist. Exact wording beyond the quoted spec strings is this plan's, pinned by the goldens.

## Decisions

1. **Golden files** live at `__golden__/<id>.README.md.txt` and `__golden__/<id>.permission-checklist.md.txt`. The `.txt` suffix keeps ESLint, Prettier and tsc off them. Tests read them with `readFileSync(new URL('./__golden__/R1.README.md.txt', import.meta.url), 'utf8')` and compare with `toBe`. Never `toMatchFileSnapshot` or `-u`. Red first means the golden and its test are committed (`test(package): ...`) before the builder (`feat(package): ...`). Goldens are written by hand from this plan, never pasted from builder output. Each file ends with exactly one `\n`.
2. **File list and order** (FR-5). `buildPackageFiles` returns, in this order: `<slug>.js`, then `<slug>.client.js` (fetch, jquery) or `<slug>.client.liquid` (liquid), then `README.md`, then `permission-checklist.md`, then `<slug>.page.html` for R4 to R6 only, from `generateDemoPage(state.recipe, slug)`. That is exactly 4 or 5 files. The file set follows `recipe.demoPage`; if that flag is true and `generateDemoPage` returns `null`, the builder throws, so a fifth file is never silently dropped (covered by Task 5's file-count test, which would fail on a missing page). Paths are flat.
3. **File contents.** `<slug>.js` is `normalizeLf(state.serverText)` plus a final `\n` if missing (AC-4.10). The client file is `clientText` plus a final `\n` if missing. Neither is scanned, trimmed or redacted (F20). The builder is pure and deterministic: no `Date`, no randomness, no host call. The slug is `derived.slug`.
4. **README sections, in this order.** Every heading is `##` after the title.
   - Title `# <slug>`, then the recipe name on its own line.
   - **Set up.** Numbered steps from Learn's Author server logic page: Set up workspace, Server logic, + New server logic, name it exactly `<slug>` (the API resource name), + Add roles (the recipe's `webRole`), then Edit code, Open Visual Studio Code, replace the file content with `<slug>.js`, save. Then: configure the site settings, allowed domains and table permissions "as listed in permission-checklist.md". Then: paste the client file into a page's custom JavaScript, or, for Liquid, into a page or web template.
   - **Endpoint.** `/_api/serverlogics/<slug>`. For R8 it is instead the Liquid tag `{% serverlogic name: '<slug>', operation: 'getSummary', output: result %}`, plus a pointer to the client file for the version with `input:` (F11).
   - **Request path.** One line from `requestPathSteps(state.language, slug, derived.fn)`, each step as `label value`, joined with ` → `.
   - **Learn.** The recipe's `learnUrl` (when not null) and `extraUrls`, then the Server logic overview and Author server logic URLs. Each is a bare URL line.
   - **Browser checks.** Either "No restricted patterns or browser APIs found." or one line per hit, `Line N: <pattern> (Blocked)` or `(May be rejected)`. A line "Couldn't parse this code" is added when `parseFailed`. A closing line always says this is a text-pattern check, not a compile or runtime test (AC-5.1, F14).
   - **Validation.** "Validation isn't authorization; table permissions are." (F08). When `derived.edited`, also "Generated validation; edits aren't rechecked." (AC-5.3).
   - **Readiness.** `readinessBlock(derived)`: the heading line `K/3 ready`, then one line per item, `✓ <item>` or `! Needs attention: <item>` (AC-5.7). The three items are Browser checks, Validation and Permissions. Permissions reads "marked reviewed in Logic Starter; not checked against any environment" when done, and "not marked reviewed in Logic Starter; not checked against any environment" when not. No line claims that any permission exists (FR-5 Must not, AC-5.7).
   - **Troubleshooting.** Four bullets: (a) the `x-ms-user-trace` response header holds base64 JSON, a list of `{ Level, MessageCode, Message }`, including `Server.Logger` output (correction 23); (b) an `RTSL01` validation error means the whole file doesn't run and the caller gets HTTP 400 (correction 14); (c) HTTP 403 when the tenant's "Disable external service calls from Server Logic" governance control is on, with the Learn URL `https://learn.microsoft.com/en-us/power-pages/security/disable-external-service-calls`; (d) only for recipes whose `outboundDomains` is non-empty or whose text uses `HttpClient` (R3, R5, R6, R7, R9 by catalogue), a call to a host the outbound settings don't allow returns `StatusCode` 0 and the handler reports its fixed failure message (correction 20).
   - **Upstream credentials.** `UPSTREAM_CREDENTIALS_LINE` as its own paragraph, only when `recipe.upstreamCredentials` (F10). It has no heading and sits directly after Troubleshooting.
   - **Secrets.** Always present. One paragraph from Learn's guidance: hold secrets in Azure Key Vault, surface them through an environment variable, and reference them through a site setting. It adds that the generated code never holds a literal secret (FR-3 Must).
   - **Prerequisites.** `recipe.prerequisites` as bullets, only when the list is non-empty.
   - **Differences from Learn.** Only for tutorial recipes, from the `DIFFERENCES` map in `readme.ts` (`R4`, `R5`, `R6`; Phase 19 adds R7). One bullet per entry, `<change> Reason: <reason>` (AC-3.7).
   - **Notes.** `README_NOTES[recipe]` as bullets, only when present. When the language is Liquid, `LIQUID_SERVER_NOTE` is added as the last bullet, in a "Notes" section that exists for it alone if the recipe has no notes of its own.
5. **README notes data** (`readmeNotes.ts`): a `Partial<Record<RecipeId, readonly string[]>>`. Initial entries: R3, "`ExternalApi/BaseUrl` must not contain a query string." (Phase 07 risk 3); R4, "The Global Create grant is expected, and Logic Inspector flags it."; R9, "The flow must validate its own inputs, because the handler passes the validated body through." (Phase 09 risk 2). Phase 19 adds the R7 entries. The file holds data only, so it never imports from handlers.
6. **Checklist** (`permission-checklist.md`, built by an internal `buildChecklist` in `buildPackageFiles.ts`): `# Permission checklist for <slug>`; the AC-5.4 label "For the <recipe name> recipe. Review anything you've added." (F13); every `checklistLines(recipe)` entry prefixed `- [ ] `; then the same `readinessBlock(derived)` as the README (AC-5.7). The user's recipe edits do not change the checklist lines.
7. **Markdown safety.** README and checklist text comes only from the slug (`[a-z0-9-]`), fixed catalogue strings, `Line N` numbers and the check-pattern labels. A test asserts that no `RESTRICTED_PATTERNS` label contains a backtick, so single-backtick code spans are safe around them. Nothing the user typed other than the slug appears in either file. The tool never renders these files as HTML.
8. **`buildZip`.** fflate `zipSync` with `strToU8(content)` per file: flat paths, UTF-8, no BOM, built in memory (spec owner decision 2026-10-14; the async API is unusable under the CSP). It keeps fflate's default `mtime`, so the user sees real dates. It throws `Error('Duplicate path in zip: <path>')` on a repeated path, and on an empty path. Tests round-trip with `unzipSync` and compare names and contents, never bytes.
9. **`DownloadStarterButton`.** It renders `<Button variant="primary" fullWidth busy={pending}>` labelled "Download starter" with the `arrow-download` icon (layout 10a: the primary pill in the action row). `useTransition` gives `pending`. On click, inside `startTransition` with an async function (React 19 Actions):
   1. Build `clientText` with `generateClient({ slug: derived.slug, recipe: state.recipe, fn: derived.fn, method: state.method, language: state.language })`, then `buildPackageFiles`, then `buildZip`.
   2. Call `host.saveFile(`${slug}.zip`, bytes, [{ name: 'Zip archive', extensions: ['zip'] }])`. The full bytes go in one write (AC-5.10).
   3. `saved`: notify `{ title: '<slug>.zip downloaded', body: '', type: 'success' }` (AC-5.6). `cancelled`: nothing, no toast.
   4. Any build or save throw: notify `{ title: "Couldn't save <slug>.zip", body: <reason>, type: 'error' }`. The reason is the Error message, or "Unknown error" for a non-Error. No stack in the toast. `console.error` gets only the error name (logging rule, no message, no URL, no body).
   The button never dispatches to the session, so inputs and edited code stay untouched (AC-5.10). The host's `saveFile` already rejects with a `HostCallError`; the button relies on the rejection, not on the class. The slug is captured before the first await, so a later edit cannot change the toast.
10. **Where the client text is computed.** The button computes `clientText` itself with the call shape in Decision 9. Phase 21's client pane computes it from the same inputs. Task 5 pins that the zip's client file equals the `generateClient` output for every recipe and language, so the two cannot drift for this phase. Phase 21 should reuse the same call shape.
11. **AC-5.11.** A test builds the zip for every recipe through the real session (`initialStarterState(STARTER_DEPS)`, `createStarterReducer(STARTER_DEPS)`, `deriveStarter`) and each build must finish within 500 ms. This is the in-tool part of the budget. The live measurement from dialog confirm to toast (2 s) is a ◆ release-smoke item in the `plan-starter.md` release gate, not an agent task.
12. **R7 is still a stub until Phase 19.** The all-recipes tests use `PENDING_R7 = ['R7']` to exclude it. A guard test asserts that `generateHandler('R7')` still throws `not implemented: phase 19`, so the exclusion cannot outlive the stub. Phase 19 deletes both, adds R7 to `DIFFERENCES` (its `R7_DIFFERENCES` export, AC-3.7), and adds its `README_NOTES` entries.
13. **Learn check (2026-10-19).** Author server logic's create steps (Set up workspace → Server logic → + New server logic, name, + Add roles, Edit code → Open Visual Studio Code) match the Set up list. The Server logic overview gives the site settings and the endpoint format `https://<site-url>/_api/serverlogics/<server-logic-name>`, so the README shows the path `/_api/serverlogics/<slug>`. The "Disable external service calls" page says outbound calls return HTTP 403 when the control is on, as the Troubleshooting bullet states.

## Tasks

### Task 1: Checklist and the file list
**Description:** Hand-write the three checklist goldens, then the tests, then `buildPackageFiles` with `buildChecklist` and the server and client file entries (Decisions 2, 3 and 6). The README entry calls `buildReadme` and `readinessBlock`; this task adds both as the minimum that returns the `readinessBlock` text and a one-line placeholder title, and Task 2 completes the README. The goldens: R1 (one grant, default state, 2/3 with Permissions needing attention), R4 (two grants, Account relationship line, test-user line, Global Create grant), R10 (prerequisites, "maker verifies").
**Red first:** `buildPackageFiles.test.ts`, run against the throwing stub:
- "R1 checklist matches the golden", "R4 checklist matches the golden", "R10 checklist matches the golden": the `permission-checklist.md` entry `toBe` the golden.
- "returns four files for R1 in the fixed order": paths equal `[slug.js, slug.client.js, README.md, permission-checklist.md]`.
- "returns five files for R4, R5 and R6 with the page last": the fifth path is `<slug>.page.html` and its content equals `generateDemoPage(recipe, slug)`.
- "uses the client extension from the language": fetch and jquery give `.client.js`, liquid gives `.client.liquid`.
- "server file is the pane text, LF, one final newline": CRLF input comes out LF, a missing final newline is added, an existing one is not doubled, and a user line containing `fetch(` or a fake token string is kept byte for byte (F20).
- "client file is the client text plus a final newline".
- "every checklist line is a task": all `checklistLines(recipe)` entries appear as `- [ ] <line>`, in order, and nothing else starts with `- [ ]`.
- "checklist has the AC-5.4 label and the readiness block": the label for the recipe name, then the `readinessBlock` text.
- "no restricted-pattern label contains a backtick" (Decision 7).
- "is deterministic": two calls return deeply equal arrays.
**Acceptance criteria:**
- [ ] The checklist equals the three goldens byte for byte and carries the label and Readiness block (AC-5.4, AC-5.7, F13).
- [ ] Exactly 4 files, or 5 for R4 to R6, in the fixed order (AC-5.6, FR-5).
- [ ] The server file equals the pane text and is never altered beyond LF and the final newline (AC-4.10, F20).
**Verification:** `npx vitest run src/services/generators/package/buildPackageFiles.test.ts` (red before the builder, green after); then `npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check .`
**Files:** `__golden__/R1.permission-checklist.md.txt`, `__golden__/R4.permission-checklist.md.txt`, `__golden__/R10.permission-checklist.md.txt`, `buildPackageFiles.test.ts`, `buildPackageFiles.ts`, `readme.ts` (minimum `readinessBlock` and a placeholder `buildReadme`).
**Scope:** S

### Task 2: README builder and notes
**Description:** Hand-write the three README goldens, then `readme.test.ts`, then complete `buildReadme` and `readmeNotes.ts` per Decisions 4, 5 and 7. The fixtures: R1 is the default state (unreviewed, 2/3, fetch). R4 is the generated text with one line appended that contains the word `debugger` (one restricted-pattern hit, counted in the golden), then marked reviewed so `reviewedText` equals the edited text: Browser checks needs attention, Validation and Permissions are done, 2/3. The R4 README also shows "Generated validation; edits aren't rechecked.", the Differences from Learn list and the demo page in the file list of Set up. R8 uses language liquid and shows the Liquid tag in place of the endpoint.
**Red first:** `readme.test.ts`:
- "R1 README matches the golden", "R4 README matches the golden", "R8 README matches the golden".
- "sections appear in the specified order": the headings found in the text equal the Decision 4 order for R1 and R4.
- "set up names the file exactly": the step contains `<slug>` as the API resource name and the recipe's `webRole`.
- "endpoint is the path, and for R8 the Liquid tag": R1 contains `/_api/serverlogics/<slug>`; R8 contains `{% serverlogic name: '<slug>', operation: 'getSummary', output: result %}` and not the path as the endpoint.
- "request path joins the steps with arrows": the line equals the joined `requestPathSteps` output for fetch, jquery and liquid.
- "learn links": the recipe URL, each `extraUrls` entry and the two fixed URLs appear; R3 or any recipe with `learnUrl` null lists only the fixed ones.
- "browser checks: none, hits, parse failure": no hits gives the clean sentence; two hits give two `Line N: ... (Blocked | May be rejected)` lines in order; `parseFailed` adds "Couldn't parse this code"; the text-pattern statement is always present.
- "validation line appears only after an edit": "Generated validation; edits aren't rechecked." present when `derived.edited`, absent otherwise; "Validation isn't authorization; table permissions are." always present.
- "readiness marks": for each of the eight combinations of the three items, the `✓` or `! Needs attention` marks match `derived.readiness` and K matches `derived.ready`; the Permissions line is self-reported and no line contains "exists" or "granted".
- "troubleshooting has the four points": `x-ms-user-trace`, `RTSL01`, `403` with the governance Learn URL, and `StatusCode` 0 only for recipes with outbound domains.
- "upstream line for R3, R5, R6, R9 and not for R1, R2, R4, R8, R10": text contains `UPSTREAM_CREDENTIALS_LINE` exactly when `recipe.upstreamCredentials`. R7 is added by Phase 19.
- "secrets paragraph is always present": mentions Azure Key Vault, an environment variable and a site setting for all ten recipes.
- "prerequisites only when present": R10 and R4 list theirs; R1 has no Prerequisites heading.
- "differences only for tutorials": R4, R5 and R6 contain every `change` and `reason` of their `*_DIFFERENCES`; the other recipes have no such heading.
- "notes": R3, R4 and R9 contain their `README_NOTES` bullets; Liquid adds `LIQUID_SERVER_NOTE` (also for a recipe with no notes).
- "text is LF, ends with one newline, and is deterministic".
**Acceptance criteria:**
- [ ] The three READMEs equal their goldens, with sections in the Decision 4 order (AC-5.6).
- [ ] Browser-check result, text-pattern statement, edited-validation line and Needs-attention marks are correct for every readiness combination (AC-5.1, AC-5.3, AC-5.7, F14).
- [ ] No sentence claims that permissions exist in any environment (FR-5 Must not).
- [ ] Upstream line, Key Vault paragraph, Differences and Notes appear exactly where their rules say (F10, FR-3, AC-3.7).
**Verification:** `npx vitest run src/services/generators/package/readme.test.ts`; then `npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check .`
**Files:** `__golden__/R1.README.md.txt`, `__golden__/R4.README.md.txt`, `__golden__/R8.README.md.txt`, `readme.test.ts`, `readme.ts`, `readmeNotes.ts`
**Scope:** M

### Checkpoint 1 (after Tasks 1 and 2)
`npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check . && npx vitest run` all green. `git status --short` lists only Phase 14 files under `src/services/generators/package/`.

### Task 3: `buildZip`
**Description:** Replace the stub per Decision 8. It is the thinnest file in the phase; the tests carry the risk, because the zip is the only artifact the user opens outside the tool.
**Red first:** `buildZip.test.ts`:
- "round-trips names and contents": `unzipSync(buildZip(files))` has the same names in a flat layout and equal decoded contents for a four-file and a five-file input.
- "keeps non-ASCII text": `✓`, `→`, an accented letter and an emoji survive, and the decoded bytes start without a BOM.
- "keeps LF": a text with `\n` is not changed.
- "throws on a duplicate path" and "throws on an empty path".
- "returns a Uint8Array that starts with the zip signature `PK`".
**Acceptance criteria:**
- [ ] The zip holds each file under its flat path with UTF-8 content (AC-5.6).
- [ ] A duplicate or empty path throws, so a bad file list never reaches the save dialog (AC-5.10).
**Verification:** `npx vitest run src/services/generators/package/buildZip.test.ts`
**Files:** `buildZip.test.ts`, `buildZip.ts`
**Scope:** XS

### Task 4: `DownloadStarterButton`
**Description:** Replace the stub per Decision 9. The tests render the button inside `HostContext` with a `createFakeHost` host, `NotifyProvider` (so the host's `notify` records the toast) and a `StarterSessionContext` value. The success and cancel tests use the real `StarterSessionProvider` with `STARTER_DEPS`. The failure tests use a hand-made context value, so no module is mocked.
**Red first:** `DownloadStarterButton.test.tsx`, queries by role and name:
- "renders a primary Download starter button" (`getByRole('button', { name: 'Download starter' })`).
- "saves the zip once and shows the success toast": `callsOf('saveFile')` has one call with the default name `<slug>.zip`, a `Uint8Array`, and the filter `Zip archive` / `zip`; `unzipSync` of it has 4 files for R1; the host `notify` call is `{ title: '<slug>.zip downloaded', body: '', type: 'success' }`.
- "five files for R4": the same flow with R4 selected through the session has 5 files.
- "cancel shows no toast and writes nothing": save behaviour `cancel` gives no `notify` call and an empty `savedFiles`.
- "a rejected save shows the error toast with the reason": save behaviour `reject` gives `{ title: "Couldn't save <slug>.zip", body: <the rejection's message>, type: 'error' }`, `savedFiles` is empty and the toast body has no stack text.
- "a build failure shows the error toast and never calls saveFile": the hand-made session has `derived.fn` that does not match `state.method`, so `generateClient` throws its guard error; the toast is the error toast, `callsOf('saveFile')` is empty.
- "a non-Error throw gives the reason Unknown error".
- "state is unchanged after a failure and after a success": the hand-made context's `dispatch` is a spy that is never called, and the state object is the same reference afterwards.
- "is busy while the save is pending": the host's `saveFile` is wrapped with a promise the test resolves later; while it is pending the button has `aria-busy="true"`; after it resolves, the attribute is gone and the toast appears.
- "logs only the error name": `console.error` is spied; its arguments hold no message text.
**Acceptance criteria:**
- [ ] One click builds the zip in memory and makes one `saveFile` call with the full bytes (AC-5.10, AC-5.6).
- [ ] Saved gives "<slug>.zip downloaded"; cancel is silent; any build or save failure gives "Couldn't save <slug>.zip" with the reason and leaves the session untouched (AC-5.10).
- [ ] The button shows its busy state while pending, and uses the primary variant with the download icon (layout 10a, FR-11).
**Verification:** `npx vitest run src/features/starter/download/DownloadStarterButton.test.tsx`
**Files:** `DownloadStarterButton.test.tsx`, `DownloadStarterButton.tsx`
**Scope:** M

### Task 5: All recipes, all languages, and the timing budget
**Description:** One integration test file that builds the session state for every recipe and language, and checks the whole chain: handler, client, files, zip. It is a guard written after Tasks 1 to 4, so it cannot start red; the author proves it can fail by locally flipping one expectation (for example the R4 file count), seeing it fail, and restoring it before the commit.
**Red first:** `package.integration.test.ts`:
- "every recipe gives the right file count and names": for each of R1 to R10 except `PENDING_R7`, and for each language the recipe allows, the zip has 4 files (5 for R4 to R6) and the names equal the Decision 2 list.
- "zip client file equals generateClient output": the unzipped client file, minus its final newline normalisation, equals `generateClient` for that state (Decision 10).
- "zip server file equals the session's server text".
- "R8 uses the liquid extension and contains the Liquid tag in the README".
- "each build finishes within 500 ms" (AC-5.11 in-tool budget, per recipe, files plus zip).
- "R7 is still a stub": `generateHandler('R7')` throws `not implemented: phase 19`; the test name says that Phase 19 removes it and the `PENDING_R7` exclusion together.
- "no README or checklist line contains a character other than the slug, catalogue strings and labels": a smoke check that the slug `untitled` and a slug with digits and hyphens pass through unchanged.
**Acceptance criteria:**
- [ ] Every recipe except the pending R7 produces the right files for every enabled language (AC-5.6, FR-5).
- [ ] The zip's client file equals `generateClient` for the same inputs (Decision 10).
- [ ] Each build is within 500 ms; the 2 s live check remains a release-smoke item (AC-5.11).
- [ ] The R7 exclusion is guarded, so it cannot be left behind (Decision 12).
**Verification:** `npx vitest run src/services/generators/package/package.integration.test.ts`; then the full set in Checkpoint 2.
**Files:** `package.integration.test.ts`
**Scope:** S

## Checkpoint 2 (after Tasks 3 to 5, the phase gate)
`npx tsc -b && npx eslint . --max-warnings=0 && npx prettier --check . && npx vitest run` all green with fresh output. `git status --short` lists only the owned files, and `git diff --stat -- package.json src/services/catalogue src/services/generators/handlers src/services/generators/client` prints nothing.

## Risks and open questions

1. **A `Uint8Array` crossing PPTB's IPC through `saveFile` is unverified** until Spike S2 (Phase 12, `plan-inspector.md`). The fake host accepts it, so every test here passes either way. A fix, for example base64 encoding at the boundary, belongs in `src/services/pptb/pptbHost.ts`, not in this phase. The ◆ PPTB smoke in the release gate opens the saved zip to confirm it.
2. **The client text is computed in two places:** here and in Phase 21's pane. Task 5 pins equality for this phase. Phase 21 should reuse the call shape in Decision 9, and its plan should add a test that the pane text equals the zip's client file.
3. **README wording is the plan's choice.** The spec fixes the topics and a few quoted strings, not the sentences. If the owner wants other copy, only the three README goldens and the strings in `readme.ts` change.
4. **Phase 18 mounts the button.** Until then no page renders it, so the button is tested through its own providers only. Phase 18 owns its placement in the action row and the Start over button next to it.
5. **The "reviewed after an edit" R4 fixture depends on 18a's rule.** Permissions stays reviewed only while `serverText` equals `reviewedText`, so the fixture marks the review after the edit. If 18a changes that rule, the R4 README golden changes with it, never the reverse.
6. **The build-failure test relies on Phase 10's method and function guard.** Phase 10 Task 3 tests that `generateClient` throws on a mismatch. If that guard is ever relaxed, this test needs another throwing input. Phase 19 can add the R7 stub route back only while R7 is a stub.
7. **The Troubleshooting `StatusCode` 0 bullet is keyed on the catalogue's `outboundDomains` and `HttpClient` use,** not on the edited text. A user who adds an outbound call by hand to R1 gets no such bullet. This is accepted: the README describes the generated recipe.
8. **Fixed Learn URLs** (overview, Author server logic, governance page) are constants in `readme.ts`. Phase 05's catalogue does not hold them for every recipe, so the README owns them. If Learn moves a page, the URL check in a later release fixes one constant.

## Done when
- `buildPackageFiles`, `buildZip` and `DownloadStarterButton` no longer throw or render nothing; `readme.ts`, `readmeNotes.ts`, the six goldens and the five test files exist, and nothing else changed.
- Every Task's acceptance criteria are ticked and Checkpoint 2 is green with fresh command output.
- Every recipe except the pending R7 builds the right 4 or 5 files and a valid zip within the 500 ms budget, and the R7 guard test is in place for Phase 19 to remove.
- The red-first order is visible in history: each golden and test commit precedes its builder commit. Commits use `<type>(package): ...`.
