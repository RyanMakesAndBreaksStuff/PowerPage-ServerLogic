# Spec vs Build: Logic Starter and Server Objects

**Spec:** `docs/specs/001-server-logic-starter-inspector/spec.md` v3.0.0 (Approved)
**Plans:** `plan-starter.md`, `plan-server-objects.md`
**Build:** branch `001-logic-inspector` @ `ce7cc95`
**Date:** 2026-10-26
**Scope:** Stories 1–6, FR-1 to FR-6, FR-11, FR-12, and the Starter and Server Objects NFRs. The Inspector page (Stories 7–9, FR-7 to FR-10) is out of scope.

## Original audit verification run

| Check | Result |
|---|---|
| `npx tsc -b` | Clean |
| `npx vitest run` | **1,348 / 1,348 pass** |
| ESLint, Prettier, `npm run build`, `pptb-validate` | Not run in this audit |
| Live PPTB smoke, live Power Pages site | Not run (owner gates ◆) |

**Method.** Five read-only auditors went through the spec AC by AC. I then re-checked the headline findings against the code; two auditor verdicts were wrong and are corrected below.

**Microsoft Learn validation (2026-10-26).** The follow-up review uses the `microsoft-learn` MCP server and targeted repository evidence. Its corrections and sources are recorded in §5. The test results above belong to the original audit; the follow-up does not re-certify every acceptance criterion or live deployment.

---

## 1. Summary

The **behaviour** of Logic Starter and Server Objects is largely built and tested:

- all 10 recipes generate, with golden files;
- the FR-4 checker covers T1–T22;
- the client generator, request path, download zip, readiness ring and Mark reviewed are built; malformed-envelope handling remains defective (§3.1);
- the Server Objects catalogue, search, Insert and Copy work;
- the rule that Server Objects needs Starter in the build is enforced.

Two areas block a spec-conformant release:

1. **The Iris theme (FR-11 v3.0.0, Phase 25) is not started.** The whole UI still uses the superseded 11c/12e palette, with the dark "aurora" gradients and glass tiles. Several colour ACs fail because of this alone, and `tokens.test.ts` still locks in the old design.
2. **The AC-4.12 behaviour harness (Phase 17) is not built.** The repository's generated-code tests are static rather than executing handlers and clients under `node:vm`. The focused follow-up probe reproduced a client defect (§3.1), but permanent regression coverage is still missing.

---

## 2. Gaps by acceptance criterion

Legend:
- ✅ Implemented
- 🟡 Partial
- 🔶 Deviates from the spec
- ❌ Missing

ACs not listed are ✅.

### Story 1: Shell (FR-1, FR-12)

| AC / FR | Status | Finding |
|---|---|---|
| AC-1.2 | 🟡 | The site pill is a placeholder and never opens a site picker. This is expected until the Inspector plan replaces `SitePill`, but it ships visibly with Starter. |
| AC-1.5 | 🔶 | The focus ring and selected state use the old `--primary` colour (`#111111` in light), not Iris. |
| AC-1.6 | 🟡 | The theme-follow mechanism is correct, but the palette it applies is not Iris. |
| FR-12 events | 🔶 | `pptbHost.ts` registers listeners lazily and unregisters them on the last unsubscribe. There is no unload handler, yet the `App.test.tsx:71-82` test titled "removes it on unload" only exercises unmount. Check this against "register once at init". |
| FR-1 logging | 🟡 | `hostErrors.ts:30` logs the HTTP status alongside the error name. Check this against the logging rule. |

### Story 2: Inputs (FR-2)

| AC | Status | Finding |
|---|---|---|
| AC-2.5 | 🔶 | The selected method pill is black in light mode, where the spec asks for solid blue (Iris accent). |

All other Story 2 ACs (slugify, slug cap, collisions, method enablement, discard confirmation) are ✅.

### Story 3: Recipes (FR-3, FR-4, Learn corrections)

| AC / FR | Status | Finding |
|---|---|---|
| Recipe catalogue | ✅ | All 10 recipes match the FR-3 contract table, and none is stubbed. R7 is complete (`r7.ts`, a 210-line golden file, 20+ tests). |
| FR-4 | ✅ | All **27** restricted patterns and 6 project-enumerated browser APIs, the Blocked vs may-be-rejected split, and the tokenizer fallback are in place. T2–T22 are asserted row by row. Learn lists 27 restricted patterns and gives browser API examples rather than an exhaustive six-item list; the matching and severity rules come from the spec and Spike S4 (§5). |
| AC-3.2 / T1 | 🟡 | Zero hits are asserted per recipe, not as the literal recipe × method × language sweep the AC describes. Because server text doesn't vary by method or language, the gap is only in wording. |
| **AC-3.6** | 🟡 | AC-3.6 requires outbound domains and site settings in the **"Permissions needed" tile**. The tile in `ContextColumn.tsx:57-79` on the Server Objects page shows only tables, privileges and the web role. AC-6.9 (tables, privileges, roles) passes, so this is an AC-3.6 gap. Starter has the note tile and checklist but no "Permissions needed" tile, which is correct: plan-server-objects places that tile on Server Objects. |
| AC-3.7 / R7 README | 🔶 | **Overbroad guarantee.** `r7.ts:52-56` says a bad value cannot orphan a ticket; `readmeNotes.ts:13` warns of invalid choices failing after upload. Local validation runs first, but `event` is intentionally only integer-checked (`spec.md:462`). Correct wording: inputs failing local validation stop before calls; a later Dataverse rejection can leave an orphan. A particular choice value's rejection requires target-schema/runtime evidence. |
| FR-3 R4 | 🟡 | **Confirmed omission.** The README must say a newly created **contact** is not readable through the recipe's Account-scoped permission until linked to the caller's account (`spec.md:424`); only the checklist carries that note. Other grants can independently permit access. |
| Correction 18 | 🟡 (unverified) | The R5 demo extracts a session from `@odata.context`, validates it and falls back to an empty session (`demoPages.ts:436-443,603-615`). The spec asks for a "documented parse" but does not prohibit regex. Regex use alone does not prove a defect; identify a failing input or clarify the required parsing contract (§5). |
| Minor | — | The R6 demo page defaults an empty name to "World" (`demoPages.ts:700`), matching Learn's demo; its handler still rejects a missing name. The R2 and R7 email checks accept `a@.`; that is a validation-quality observation, not a Learn-specific API violation. |

### Story 4: Generated code and client call (FR-2a)

| AC | Status | Finding |
|---|---|---|
| AC-4.2 | 🔶 | The highlight uses a 10% `--primary` tint and a primary bar. The spec asks for `--code-accent` and 12% white (Iris). |
| AC-4.5, AC-4.6 | 🟡 | See the client defect in §3.1. A null or malformed envelope is not handled. |
| AC-4.7 | 🟡 | The Liquid → fetch reset fires its toast only on text edits. A recipe switch resets silently, and `starterReducer.test.ts:49-56` asserts the silent reset. Decide whether that is intended, then align the spec or the code. |
| **AC-4.12** | ❌ | **The behaviour harness is not built** (Phase 17: 0/18 steps; `status-2026-10-23.md:28` says "Not built"). Behavioural execution of the 36 configurations, 6 client failure cases, demo-page cases and sentinel-secret check is absent. Static enumeration and parsing of all 36 configurations already exist (`client.matrix.test.ts:93-121`). This harness is a project requirement, not a Microsoft-prescribed test architecture. |
| Unspecified behaviour | — | Highlights are hidden after any edit (`ServerPane.tsx:24`). The spec doesn't say this. Reasonable, but record it. |

### Story 5: Readiness and download (FR-5)

| AC | Status | Finding |
|---|---|---|
| AC-5.1 | 🟡 | The ring works, but its colours are pre-Iris. The ring can never read 0/3, because `validation` is typed `true` (`deriveStarter.ts:10-13`). This follows from the contract; worth stating in the spec. |
| AC-5.3 | 🟡 | The validation tooltip is on a separate info button (`StarterInputs.tsx:134-141`), not on the Validation pill itself. |
| AC-5.4 | 🟡 | The behaviour is correct: the exact reviewed text is stored and compared. The colours are pre-Iris. |
| AC-5.11 | 🟡 | Timing is unverified: the spec requires every recipe's download to finish within 2 s, from save-dialog confirmation to toast (`spec.md:236`). The original "one item is open" wording did not identify evidence. |
| Download | ✅ | Wired in `StarterPage.tsx:30`. Phase 14 is 16/18 steps ticked. |

### Story 6: Server Objects (FR-6)

| AC | Status | Finding |
|---|---|---|
| FR-6 catalogue | ✅ | 9 objects, with members, overloads, return types, sync/async marks, Context HTTP-only marks and variants. |
| AC-6.2 | 🔶 | The `used` pill is olive (`#4d6a1f`, `tokens.css:36`) in light and lavender in dark. The spec says purple. Iris maps Server objects to accent-2 teal, so the spec text and the Iris mapping also disagree with each other. |
| AC-6.9 | ✅ | All three tiles are present. "Another sample" always shows the next member's **first** variant. |
| Back / Clear search | 🔶 (minor) | Rendered as buttons where the spec says "link". |
| `User.fullname` | 🟡 (clarification) | `serverObjects.ts:195` puts the parent `Server.User` object's anonymous-null behavior in the `fullname` return field. Learn does not document that property's return type. The guarded sample is correct; catalogue `returns: null` means "Not documented on Learn", not a runtime null-return contract (§5). |
| AC-1.7 / Decision 1 | ✅ | `vite.config.ts:20-37` throws when `objects` is released without `starter`. `App.tsx:57-67` mounts the page inside `StarterSessionProvider`. Both are covered by `tests/buildShape.test.ts`. |
| No-results scenario | ✅ | `ServerObjectsPage.tsx:111-121`. |
| NFR: search within 100 ms | 🟡 | Search is synchronous with no debounce, but no test measures the time. |

### FR-11: Visual design (Iris, Phase 25)

❌ **Not started** (Phase 25: 0/17 steps).
- **Aurora and glass are still present:** the dark radial gradients in `tokens.css:52-55`, and `--tile-glass` with `backdrop-filter` in `primitives.css:17-21, 383-386`. The spec forbids both (A1).
- **No Iris token names are used:** there are 0 references to `--bg2`, `--accent`, `--danger`, `--code-*` or `--glow*`. About 89 references use the old names.
- **Light-mode code wells are light** (`--code: #f7f7f5`), not dark.
- **Weights are not converted:** `--weight-base` (550) and `--weight-strong` (650) are absent, and hard-coded 600 and 700 remain in `primitives.css`, `starter.css` and `serverObjects.css`.
- **What conforms:** the Segoe UI stack and JetBrains Mono.
- **The tests lock in the old design:** `tokens.test.ts:88` (aurora) and `:126` (14px blur) must be rewritten alongside Phase 25.
- **Contrast:** the WCAG contrast check with Iris tokens can't be done until the tokens exist.

### NFRs

| NFR | Status |
|---|---|
| Panes update within 300 ms; download within 2 s | 🟡 Not measured by any test. |
| Accessibility: APG patterns, `aria-disabled` reasons | ✅ Mostly in place. |
| Accessibility: Iris contrast | ❌ Blocked on Phase 25. |

---

## 3. Notable findings beyond AC status

### 3.1 Client envelope defect (reproduced; regression coverage missing)

`src/services/generators/client/client.ts:186-210`: the generated `handleEnvelope` reads `envelope.success` and `parsed.status` with no shape check. If the response is `null`, or `data` parses to `null`:
- the **fetch** client throws into its `.catch` and logs the misleading generic message "The call failed before a response envelope could be read.";
- the **jQuery** success callback throws `TypeError` without reaching `showError`.

The follow-up probe reproduced both paths using actual generated code (§5). It also confirmed that an envelope with valid `data` but **no `success` field is accepted**: checking only `success === false` does not enforce the spec's `success === true` prerequisite. Ordinary malformed JSON is already caught and produces "The response data could not be read." The defect is shape/success validation, not a complete absence of parse-error handling. `showError` currently writes to `console.error`, not a visible page element (`client.ts:182-183`).

This is already recorded as unfixed in `docs/plans/10-24-2026-generator-behavior-harness.md`. The AC-4.12 harness is exactly what should catch it.

### 3.2 The generated client logs response data

`client.ts:189-190` emits `console.log(parsed.<key>…)`. FR-3 says "Generated code may log only…", while AC-4.12 checks specifically for secret leakage through `Server.Logger`. The client scope is therefore an **owner clarification**, not an established handler-only exception. Learn's client examples use `console.log`; the project's stricter logging allowlist is not a general Microsoft API restriction (§5).

### 3.3 The default build would ship the Inspector placeholder

`releasedPages.ts` defaults to all three pages. If `VITE_RELEASED_PAGES` isn't set, the placeholder Inspector tab ships, with `scan.ts` and `renderPdf.ts` still throwing "not implemented". The release gate does set the variable, but consider making the default `starter,objects`, or failing the build when `inspector` is released while those stubs remain.

### 3.4 Unused shared component

`ExternalLink` (`src/app/ExternalLink.tsx`) has no non-test consumer. No Starter or Server Objects surface renders a Learn link through it. Check whether the design expects Learn links (for example, in recipe notes or object detail).

### 3.5 Layering: rule file vs plan

`.claude/rules/project-structure.md` lists the modules a feature may import (`components/`, `lib/`, `services/`, `types/`), and `app/` is not among them. The plan puts cross-feature state in `src/app/` on purpose (`useStarterSession`, `CopyButton`), and about 10 feature files import `@/app/`.

There is also one real inversion: `services/generators/package/buildPackageFiles.ts:4` and `readme.ts:4` import types from `app/`.

Suggested fixes:
- amend the rule to allow `app/` hooks and shared UI;
- move `StarterPackageInput`'s dependencies into `types/`.

### 3.6 Tooling drift

The `validate` script in `package.json` omits `--skip-url-checks`, which the host rule requires before release.

### 3.7 Plan bookkeeping lags the code

- **Phases 13 and 22 are built** (92 Server Objects tests pass), but 0 of their steps are ticked.
- **Phase 17:** 0/18 ticked, and it really is not built.
- **Phase 19:** 19/23 ticked; the behaviour cases wait on Phase 17.
- **Phase 25:** 0/17 ticked, and it really is not started.

Ticking 13 and 22, with execution evidence, would make the status honest.

### 3.8 Test performance

The original audit reports jsdom setup across 89 test files taking about 69 s. A different worker pool or environment strategy is an optional benchmark candidate; **a roughly 50% speedup has not been demonstrated**. Microsoft Learn cannot validate this Vitest performance estimate.

---

## 4. Recommended next steps (priority order)

1. **Phase 25 (Iris).** This fixes AC-1.5, AC-1.6, AC-2.5, AC-4.2, the colour halves of AC-5.1 and AC-5.4, AC-6.2 and FR-11, and it unblocks the contrast gate. While doing it, resolve the AC-6.2 conflict between "purple" and Iris teal through a spec PATCH.
2. **Phase 17 (behaviour harness),** together with the client envelope fix (§3.1). Then close Phase 19's remaining cases.
3. **Correct the R7 README guarantee** (AC-3.7): local validation precedes calls, but later Dataverse rejection can orphan an upload. Add the R4 Account-scope linkage caveat and correct R6's `err.message` attribution (§5).
4. **AC-3.6:** add outbound domains and site settings to the Server Objects "Permissions needed" tile.
5. **Spec PATCH for owner calls:**
   - the silent Liquid reset on recipe switch (AC-4.7);
   - highlights hidden after an edit;
   - client-side logging (§3.2);
   - links vs buttons;
   - the fixed `validation: true` in the ring.
   - R5's "documented parse" requirement and the `Server.User` versus `fullname` return metadata.
6. **Housekeeping:**
   - the FR-12 unload handler, or rename the test;
   - the `--skip-url-checks` flag;
   - the layering rule and the `services → app` import;
   - tick Phases 13 and 22;
   - the default released-pages guard.

---

## 5. Microsoft Learn validation

**Reviewed:** 2026-10-26, against branch `001-logic-inspector` at `ce7cc95` and the current Learn pages fetched through `microsoft-learn`. Repository-specific design, host integration and release gates retain their original audit status unless corrected above.

Local `spec.md` and `plans/…` citations in this section are relative to `docs/specs/001-server-logic-starter-inspector/`.

**Verdict:** The client shape defect and R4/R7 documentation gaps are supported. Correct the restricted-pattern count, qualify the R5 and `User.fullname` findings, and retain the recorded S4 decisions where Learn's examples disagree.

### Confirmed facts and important qualifications

| Finding | Validation |
|---|---|
| FR-4 restricted-pattern coverage | **Count corrected to 27.** [Author server logic — Limitations](https://learn.microsoft.com/power-pages/configure/author-server-logic#limitations) lists the same 27 labels as `src/lib/code-analysis/browserChecks.ts:14-45`. Learn prohibits browser APIs and names `fetch`, `XMLHttpRequest` and DOM-related features; the six-name checklist, tokenizer fallback and severity classifications are project policy informed by S4. |
| HTTP response casing | **Keep the lowercase client contract.** The [Author page's response example](https://learn.microsoft.com/power-pages/configure/author-server-logic#example-response) uses `Success`/`Data`, while the [Azure Function tutorial's client](https://learn.microsoft.com/power-pages/configure/server-logic-azure-function#step-3-call-server-logic-from-web-page) reads `data?.data`. The spec records this documentation inconsistency and S4's recorded live confirmation of lowercase `success`/`data` (`spec.md:97`, `plans/phase-00-skeleton.md:2380`). This discrepancy is not evidence of a new client casing defect. |
| jQuery wrapper | **Keep the S4-backed wrapper choice.** Learn's Author page uses `shell.safeAjax`, whereas its [CSRF wrapper example](https://learn.microsoft.com/power-pages/configure/web-api-http-requests-handle-errors#example-wrapper-ajax-function-for-the-csrf-token) defines `webapi.safeAjax`. The repository records that the tested host exposes `shell.ajaxSafePost`, with token/header handling and the supplied HTTP method (`spec.md:98`). Changing the generated client to the Author page's helper name would ignore that evidence. |
| HTTP versus Liquid | **Confirmed.** [Author server logic](https://learn.microsoft.com/power-pages/configure/author-server-logic#call-server-logic-from-liquid) requires a CSRF token for client HTTP calls but no client token for Liquid invocation. Liquid reads `Server.Context.Input`, returns parsed `result.data`, and requires escaping returned strings. [Server objects — Context](https://learn.microsoft.com/power-pages/configure/server-objects#context) confirms the HTTP-only property list. UI reset/toast behavior remains a local AC. |
| AC-3.6 permissions and networking | **Local gap and platform rationale confirmed.** `src/features/server-objects/ContextColumn.tsx:57-79` renders table grants and the role but omits domains and settings. [Server logic overview](https://learn.microsoft.com/power-pages/configure/server-logic-overview#secure-the-server-logic) requires web roles/table permissions and documents `ServerLogic/Enabled`, `AllowedDomains`, `AllowNetworkingToAllDomains` and `TimeoutInSeconds`. [Tenant governance](https://learn.microsoft.com/power-pages/security/disable-external-service-calls) can independently block outbound calls. Tile placement is the project's AC, not a Learn UI requirement. |
| Client logging (§3.2) | **Local policy needs clarification.** Learn's Author examples log client responses; its [overview](https://learn.microsoft.com/power-pages/configure/server-logic-overview#benefits-of-using-server-logic) requires secrets to stay server-side. That does not establish a blanket ban on logging ordinary client results. FR-3 says "Generated code may log only…" (`spec.md:438-445`), while AC-4.12's sentinel assertion specifically targets `Server.Logger` (`spec.md:208`); resolve that scope explicitly. |
| Server diagnostics | **Logging caution is supported.** [Power Pages DevTools](https://learn.microsoft.com/power-pages/configure/devtools-addon#enable-diagnostic-setting) documents diagnostics enabled by default on private sites and enabled by `UserTrace/Debug=true` on public sites; [Server objects — Logger](https://learn.microsoft.com/power-pages/configure/server-objects#logger) says server messages are viewable in DevTools. The exact permitted fields still come from FR-3. |
| Behaviour harness versus live verification | **Retain both gates.** [Debug server logic](https://learn.microsoft.com/power-pages/configure/server-logic-debug#limitations-and-considerations) explicitly warns that mocked local results may differ from production. Learn supports the need for live validation, but does not prescribe this repository's `node:vm` harness or 36-case matrix. |
| R6 empty-name default and README attribution | **Qualify the minor finding.** The [Azure Function tutorial's demo](https://learn.microsoft.com/power-pages/configure/server-logic-azure-function#step-3-call-server-logic-from-web-page) also defaults empty input to `World`; the generated handler separately enforces its stricter no-default contract (`src/services/generators/handlers/r6.ts:91-94`). However, `R6_DIFFERENCES` says "Learn logs err.message" (`r6.ts:43-46`), which the current tutorial does not do. Reword that README attribution as the recipe's logging policy rather than a claim about this Learn sample. |
| R4 Account-scope caveat | **Confirmed, with scope.** [Table permissions — Available access types](https://learn.microsoft.com/power-pages/security/table-permissions#available-access-types) limits Account access to records associated with the signed-in user's account. R4's default contact-create payload has no account binding (`src/services/catalogue/recipes.ts:167-170`). The note at `recipes.ts:146` reaches the checklist but not the README (`src/services/generators/package/readme.ts:170-200`, `readmeNotes.ts:6`). The [Learn Dataverse tutorial](https://learn.microsoft.com/power-pages/configure/server-logic-operations#step-3-configure-permissions) instead uses Global access for all CRUD privileges: R4's split Account/Global grants are an intentional local restriction. |
| R5 session parsing | **Original criticism is insufficient.** The [external-services tutorial](https://learn.microsoft.com/power-pages/configure/server-logic-external-services#step-2-create-webpage) reads `body['@odata.context']`. The generated parser validates its extracted segment and falls back to an empty string. `spec.md:111` asks to replace a fragile regex with a documented parse; neither that wording nor Learn establishes that every regex implementation is invalid. Parser contract/behaviour evidence is still needed to close the local requirement. |
| R7 validation and orphaned tickets | **README guarantee needs correction; validator matches the spec.** The [Graph/SharePoint tutorial](https://learn.microsoft.com/power-pages/configure/server-logic-graph-sharepoint#step-6-test-the-sharepoint-integration) uploads the ticket before creating the Dataverse row. So does `src/services/generators/handlers/r7.ts:334-338`, after local validation. The replaceable-table contract intentionally does not range-check integer choices (`spec.md:462`). If Dataverse rejects a row after upload, an orphan can remain; Learn does not prove that any particular supplied integer will be rejected. |
| `User.fullname` return metadata | **Catalogue/spec clarification, not a runtime bug.** [Server objects — User](https://learn.microsoft.com/power-pages/configure/server-objects#user) says the **User object** "Returns null if anonymous" and shows `Server.User.fullname`, but supplies no property return type. Keep the object-null note and guarded sample; represent the undocumented member return consistently. In `src/services/catalogue/serverObjects.ts:9`, `returns: null` is the undocumented marker. `spec.md:603` should distinguish these two levels clearly. |

**Additional R7 edge case:** `r7.ts:286-294` converts an unreadable/missing upload `webUrl` to `null`, then still attempts `CreateRecord` (`:301-312`). If Dataverse accepts that row, the handler reports success without a ticket URL, whereas Learn's successful-run description says the ticket URL field contains the link. This is a source-proven conditional path, not a reproduced live failure; include it when defining Phase 17's R7 response-shape cases.

### Follow-up verification

**Focused existing tests:** `npm exec -- vitest run src/lib/code-analysis/browserChecks.test.ts src/services/generators/client/client.matrix.test.ts src/services/catalogue/serverObjects.test.ts` — **108 passed across 3 files** (4.21 s). These verify the checker and static catalogue/client contracts, not live Power Pages behaviour.

**Generated-code probe:** Node v24.17.0, `node --input-type=module -`, importing `generateClient` through the installed `jiti` and executing R6/GET output under `node:vm.runInNewContext` with minimal `shell`/`fetch` stubs and captured console calls. Seven fixtures ran against each HTTP client, **14 executions** total; the jQuery variant's registered success callback was invoked directly. This is a focused local reproduction, not the missing permanent AC-4.12 harness or a real jQuery/Power Pages integration test.

| Fixture | fetch | jQuery success callback |
|---|---|---|
| `success: true`, valid success payload | Logs payload | Logs payload |
| Outer envelope `null` | Generic fetch catch message | Throws `TypeError`; no error-sink call |
| `success: true`, `data: "null"` | Generic fetch catch message | Throws `TypeError`; no error-sink call |
| `success: true`, malformed JSON `data` | Controlled parse-error message | Controlled parse-error message |
| Missing `success`, valid success payload | **Incorrectly logs payload** | **Incorrectly logs payload** |
| PascalCase `Success`/`Data` fixture | Controlled parse-error message | Controlled parse-error message |
| `success: false`, `error: "denied"` | Logs `denied` | Logs `denied` |

The PascalCase fixture illustrates Learn's conflicting example; it does not override S4's recorded lowercase contract.

### Evidence limits

- Iris colours, layout, links versus buttons, component layering, release-page defaults, plan checkboxes and the AC-4.12 matrix are repository requirements. Microsoft Learn does not independently certify those implementation verdicts.
- PPTB event lifecycle and `pptb-validate --skip-url-checks` require the PPTB contract and repository rules; Power Pages Learn pages do not establish them.
- The original suite totals, WCAG contrast, UI/search/download timing and the proposed Vitest speedup are not validated by documentation lookup. AC-5.11's timing and §3.8's estimate are qualified above.
- S4's outcomes are recorded in `plans/phase-00-skeleton.md:2376-2387`; that plan explicitly says the raw endpoint responses are not committed (`:2391`). They are prior recorded evidence, not fresh live verification from this review.
