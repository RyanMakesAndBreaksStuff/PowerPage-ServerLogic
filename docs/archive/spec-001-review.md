# Spec Review: Feature 001, Logic Starter & Logic Inspector

> **Historical (2026-10-07).** This review covers spec v0.4.0 (Draft). Its findings were applied in 0.5.0–0.7.0 and the spec is Approved (4.3.0 on 2026-11-03). Kept as the record of the review; nothing in it is current guidance.

- **Spec:** [001-server-logic-starter-inspector-spec.md](spec.md) (v0.4.0, Draft)
- **Review type:** SDD Mode A, a spec review before planning
- **Date:** 2026-10-07
- **Learn sources checked:**
  - [Server logic overview](https://learn.microsoft.com/en-us/power-pages/configure/server-logic-overview)
  - [Author server logic](https://learn.microsoft.com/en-us/power-pages/configure/author-server-logic)
  - [Server objects](https://learn.microsoft.com/en-us/power-pages/configure/server-objects)
  - The Liquid objects page
  - The 4 server logic tutorials
  - The `powerpagecomponent` and `mspp_webrole` table references

Line numbers (`L###`) refer to spec v0.4.0.

## Overall Assessment

**NEEDS REVISION.** There is 1 critical issue and 10 important ones. Each fix is small, mostly a sentence or a table row.

Learn corrections 1–7, 9 and 11–18 are accurate. Every defect that corrections 17 and 18 list is present in the current tutorials.

## Critical (blocking)

- **The casing of the response envelope is unverified, and Learn contradicts itself.**
  - Location: Learn correction 8 (L83), AC-4.5 (L165), FR-2a.
  - The Author page's response example uses `Success` and `Data`.
  - The Dataverse, External services and Azure Function tutorial demo pages all read lowercase `res.data`, `resp.data` and `data?.data`.
  - The spec assumes PascalCase. If that's wrong, every generated fetch and jQuery client breaks.
  - **Suggested fix:** add a spike (S4) that confirms the casing on a live site. Until then, generate code that tolerates both, such as `res.Data ?? res.data` and `res.Success ?? res.success`.

## Important (should fix before planning)

1. **The premise of Spike S1 is out of date.**
   - Location: FR-7 data-source table, Spike S1 (L467).
   - Learn now documents these tables:
     - `powerpagecomponent`, with `powerpagecomponenttype` 35 = Server Logic, 9 = Site Setting, 11 = Web Role and 18 = Table Permission. It also has a `powerpagesiteid` lookup, `statecode`, `content` (JSON) and `filecontent` (File).
     - `mspp_webrole`, with `mspp_anonymoususersrole` and `mspp_authenticatedusersrole`.
   - **Suggested fix:**
     - Change the data-source table to "Verified on Learn" for these.
     - Narrow S1 to three things: which column holds the server logic code (`content` or `filecontent`), how a server logic record links to its web roles (probably the `powerpagecomponent_powerpagecomponent` N:N relationship), and the JSON keys for table permissions.
     - State that v1 supports only the enhanced data model.

2. **The web role rule misses a case.**
   - Location: AC-8.8 (L262), FR-9 (L488), and the data-source table that identifies roles by name.
   - "Only the Anonymous Users role" lets *Anonymous Users + Customers* pass, yet unauthenticated visitors can still call it.
   - **Suggested fix:** flag when the assigned roles *include* the anonymous role. Identify that role by `mspp_anonymoususersrole = true`, not by its name, because roles can be renamed.

3. **The Outbound check flags every file on a default site.**
   - Location: FR-9 (L490), AC-8.8.
   - The allowed domains are a site-level setting, so a handler that never calls `HttpClient` still gets "Needs review".
   - This contradicts the handoff fixture `contact-form-helper.js | ✓ None` (handoff README L218).
   - The spec also doesn't define which setting wins when `AllowNetworkingToAllDomains` is absent (default true) and `AllowedDomains` is set. Learn doesn't document how the two interact.
   - **Suggested fix:** mirror the table permissions rule: no `Server.Connector.HttpClient` in the code means "Configured: no outbound calls". Define the precedence between the two settings as a decision table, and mark it unverified.

4. **AC-3.7 can't be satisfied as written.**
   - Location: AC-3.7 (L148).
   - It says tutorial recipes differ from Learn *only* by correction 17. FR-3's other requirements (L353–360) force more differences:
     - parsing the response and checking `IsSuccessStatusCode` (correction 11; Learn's R4–R6 return raw strings);
     - passing `contentType` (correction 12; Learn's R5 omits it);
     - input validation, the header comment and link, and the `Server.User` guard.
   - **Suggested fix:** change it to "correction 17 + FR-3 Musts, each listed in the README's Differences from Learn".

5. **No input/output contract is defined per recipe function.**
   - Location: the FR-3 recipe table.
   - The spec doesn't say:
     - what R2 validates, or what the R1, R3, R6 and R9 inputs are;
     - which query parameters each function needs (for example R4 `entitySetName`, R10 `id`);
     - what a handler returns on success and on error.
   - The client generator, AC-4.11's parse tests and Liquid `input:` all depend on this. Liquid's `result.data` is the parsed JSON, so it can't parse a nested string in `Body`.
   - **Suggested fix:** add the columns *Query params*, *Body schema*, *Validation* and *Returns (success/error)* to the FR-3 table.

6. **A Liquid client is paired with HTTP-only handlers.**
   - Location: AC-4.7 (L167), AC-2.9, AC-3.2.
   - R1–R7, R9 and R10 read `Body` or `QueryParameters`, which are undefined in Liquid (correction 13).
   - The spec doesn't say whether the handler is regenerated to read `Input` when Liquid is selected. AC-2.9 hints that it is ("…and language").
   - Learn doesn't document whether Liquid can call `async` functions.
   - **Suggested fix:** either regenerate the handler from `Input` when Liquid is selected, or allow Liquid only for R8.

7. **The site ring is geometrically impossible at scale.**
   - Location: AC-9.3 (L297), FR-11 (L511).
   - It has one segment per check with 4° gaps.
   - At 90 segments (30 files) the gaps alone take the whole 360°. The scan target of 50 files gives 150 segments.
   - **Suggested fix:** above a threshold, draw a proportional ring with 3 arcs (Configured / Needs review / Not scanned).

8. **The handoff tokens fail the WCAG AA requirement in the NFRs.**
   - Location: the FR-11 visual tokens vs. the accessibility NFR (L541).
   - Ratios measured:

     | Foreground | Background | Ratio |
     |---|---|---|
     | Code comment `#858585` | `#262626` | 4.10 |
     | Report orange `#d9680a` | white | 3.54 |
     | Report orange `#d9680a` | tint `#fdf0e3` | 3.16 |
     | Blue chip `#1f6fd1` | tint `#eaf2fd` | 4.38 |
     | Line number `#5f5f5f` | `#262626` | 2.37 |

   - All of these are small text, so AA needs 4.5:1. Line numbers might count as incidental text.
   - **Suggested fix:** decide whether to adjust the tokens or scope the NFR.

9. **The Starter's checklist never states an access type, but the Inspector flags Global.**
   - Location: FR-3 checklist, AC-8.8 (L263), R4, R10, AC-5.5.
   - Learn's Dataverse tutorial, the source for R4, configures Global. So a maker who follows R4 gets "Needs review" in the Inspector.
   - FR-3 says "by entity set name", but table permissions are keyed by logical name (`contact`, not `contacts`). R10 says "`accounts`".
   - **Suggested fix:** add an access type per recipe, and carry both the logical name and the entity set name in the recipe model.

10. **The host contract is under-spiked.**
    - Location: Spike S2 (L469).
    - S2 covers only connection metadata. These requirements also depend on unverified PPTB APIs:
      - FR-5a: tool-settings persistence;
      - AC-5.6 and AC-9.3: binary save for the zip and the PDF;
      - AC-4.9: clipboard;
      - AC-7.6: the connection-changed event.
    - **Suggested fix:** extend S2 to cover these.

## Minor (can address during planning)

- **AC-6.8:** inserting an `await` sample from Learn into a non-async function (for example R1's `get`) gives invalid code, and the pattern check doesn't catch it. State whether insertable samples must be clean under FR-4.
- **FR-3:** a site setting that is missing or empty (R3, R6, R7, R9) should fail closed: log the error and return a configuration error before any outbound call.
- **FR-6 / AC-6.5:** Learn documents no return type for most members (`SiteSetting.Get`, `CreateRecord`, the `Context` properties). Define what the UI shows when the type isn't on Learn.
- **AC-8.8 (L268):** Learn gives only a 240 s maximum and a 120 s default, so "Learn's 1–240" invents a lower bound.
- **FR-4 normalisation:**
  - Whitespace normalisation appears only in T12 (L387). State it in the matching rules, and say whether it applies to every pattern that ends in `(` or `.`.
  - `import from` never matches real `import x from` syntax.
- **AC-4.6:** jQuery doesn't check `Success` or parse `Data`, unlike FR-2a and correction 8.
- **AC-4.7:** Learn's `serverlogic` object also returns `status_code` and `raw_result`. Use `raw_result` as the fallback for non-JSON results.
- **Export file names:**
  - Define whether `<file>` includes `.js`.
  - Sanitise site names for the file system.
  - Say whether redaction covers the domain or URL.
  - AC-9.2 doesn't say where the configuration snapshot and the AC-7.9 banner go.
- **AC-9.3 (L299):** "Review first" lists Needs review findings, then says Not scanned items go last. That's contradictory.
- **Review marks:** the spec doesn't say what happens to them on a rescan or a site switch (AC-7.6, AC-7.10, AC-8.9).
- **R6:** whether `*.azurewebsites.net` works as a wildcard in `AllowedDomains` is undocumented. Prefer the placeholder `<app>.azurewebsites.net`.
- **R4 and R5 inputs:** R4 passes `additionalParameters` through without validation. R5 puts `serviceSession` and `username` into the URL unencoded.
- **R10:** the `patch` function calls a bound action, which Learn invokes with `"post"`. Add the rationale.
- **R7:** the README could note `Sites.Selected` as a least-privilege alternative to `Sites.ReadWrite.All`.
- **Unspecified behaviour:**
  - How AC-2.6's helper reads for a multi-function recipe (AC-3.4).
  - What happens to the method and the fixed client language when switching away from R8 (AC-2.8).
  - What "Another sample" means in AC-6.9, and the allowed values for the type pill.
  - Scans of more than 50 records, and failure to list sites.
  - Whether inactive server logic records (`statecode = 1`) are scanned.
  - Code that is empty or can't be parsed, and a Server Objects search with no results.
- **Timing and guarantees:** the 2 s in AC-5.11 should exclude the save dialog. The "no partial file" guarantee in AC-5.10 applies only to what the tool controls.
- **Housekeeping:** the change log lists 0.4.0 above 0.3.0. The status is still Draft; mark it Approved before planning.

## Confirmed Complete

- ✓ Every story has numbered acceptance criteria written as Given/When/Then.
- ✓ The goals are measurable; the 5-minute goal has a timed walkthrough.
- ✓ The performance NFRs are concrete (300 ms, 100 ms, 30 s per 50 records, 5 s, 2 s).
- ✓ The error scenarios table covers input, missing data, permissions, connection loss and save failure.
- ✓ The non-goals and out-of-scope list are explicit.
- ✓ Every FR maps to a story.
- ✓ The FR-4 test table (T1–T14) makes the pattern checker unit-testable.
- ✓ FR-4's list of restricted patterns matches Learn exactly.
- ✓ The 9 `Server.*` objects and their members match Learn exactly.
- ✓ The mapping from HTTP method to function (get, post, put, patch, del) matches Learn.
- ✓ The open questions are now assumptions (A1–A7) and spikes (S1–S3).

## Resolution (spec v0.5.0, 2026-10-07)

Every Critical, Important and Minor item has been applied. The status stays Draft until the owner approves it.

**Sources:**
- A Firecrawl search found Microsoft's `power-platform-skills` `add-server-logic` skill and its frontend integration reference. They supplied:
  - the lowercase envelope, which resolves the Critical item;
  - that connector results are objects and that Dataverse methods are synchronous;
  - the runtime regex `with\s*\(`;
  - the `adx_serverlogic_adx_webrole` link;
  - the precedence guidance for the outbound settings.
- The `microsoft-code-reference` search returned only Learn snippets that had already been reviewed.

**Facts still unconfirmed live** (Spike S4):
- the envelope casing;
- whether a connector result is a string or an object;
- the outbound settings precedence;
- whether Liquid can call async functions.

## Next Step

Apply the fixes with `sdd-superpowers:sdd-spec-update`, one severity tier at a time. Then re-run this review before `sdd-plan`.
