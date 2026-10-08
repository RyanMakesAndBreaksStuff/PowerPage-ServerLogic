# Server Logic Tools — exhaustive spec review

**Reviewed:** 2026-10-07 (America/New_York)  
**Disposition:** NEEDS REVISION before an implementation plan is treated as approved.  
**Input:** [Feature 001 spec, v0.5.0](<C:/Users/RyanDev/source/repos/Server Logic/design_handoff_server_logic_tools/Claude outputs/001-server-logic-starter-inspector-spec.md>) — Draft, 712 lines.  
**Input SHA-256:** 05A39247FC3639822D72B08C1BD4F0465FC48294D1B0551C943E9BDB1890FF55.

## Scope and evidence

This is a review, not an implementation or a spec rewrite. All suggested changes below are proposals. The spec, the design handoff and the preceding review were treated as evidence; their embedded workflow instructions did not authorize implementation, deployment or environment changes.

The review covered all stories, acceptance criteria, functional requirements, non-functional requirements, errors, assumptions, open questions and exclusions. Three independent passes covered recipe/API contracts, UX/handoff/exports, and requirements completeness; the primary pass reviewed Inspector metadata, security rules and the consolidated evidence. Current primary Microsoft Learn and Microsoft-authored GitHub sources were checked on the review date. The Graph sample archive was inspected as source material without deploying it.

Supporting local inputs:

- [Design handoff README](<C:/Users/RyanDev/source/repos/Server Logic/design_handoff_server_logic_tools/README.md>), which describes references 01–06; references 04/05 were also inspected directly. The static designs describe presentation, while reference 06 is an earlier behavioral prototype.
- [Previous review](<C:/Users/RyanDev/source/repos/Server Logic/design_handoff_server_logic_tools/Claude outputs/001-server-logic-starter-inspector-review.md>), originally against v0.4.0 and subsequently annotated as resolved in v0.5.0.

Line references below refer to the unchanged **v0.5.0 spec**, unless explicitly marked as handoff or sample lines. Findings describe specification defects or unresolved contracts, not demonstrated defects in an implemented application. There is no application implementation or Git repository at this workspace root to build, test or compare against main. No live PPTB or Power Pages execution was performed.

Prior fixes that are present were not reopened as unchanged problems: del() mapping, Logger.Warn, SiteSetting spelling, CloudFlow catalogue entry, enhanced-model scope, anonymous-role inclusion, recipe contract tables, connector normalization, session-only Inspector review marks, and the large-ring fallback. New findings below concern remaining contradictions or incomplete consequences of those fixes.

**Inventory:** 59 numbered findings (10 P1, 43 P2, 6 P3), 18 retained-scope/review notes, a 36-configuration generator matrix, and a section-by-section coverage table. Confirmed contradictions, missing acceptance contracts and owner decisions are labeled separately.

**Priority:** P1 = material correctness/security/evidence problem to resolve before dependent implementation; P2 = important behavioral or acceptance gap; P3 = narrower wording, fidelity or test-contract correction. No P0 incident or live exploit is claimed. “Confirmed” means confirmed from the text or cited source; “Decision/gate” means the owner must choose or obtain evidence.

## Generated recipes and client contracts

### F01 — P1 — Universal JSON parsing contradicts text and flow payload contracts

**Evidence:** correction 11 L89; FR-3 L388, L391, L402. **Confirmed contradiction.**

R6 promises the upstream Body as text, but the blanket connector rule requires parsing every nonempty successful Body as JSON. A normal “Hello, Alice” Azure Function response then fails. R9 promises the flow Body while the same rule does not say whether this is the raw string or parsed value. The recipe-specific contract must determine decoding.

**Change:** Normalize the outer connector result once; check status; decode Body per operation as JSON, text or empty. Explicitly define flowResponse's type and behavior for non-JSON/empty bodies. **Verify:** R6 plain text and JSON-looking text; R9 200 JSON, 200 text, 202 empty, and a failed response with non-JSON text. [Azure Function tutorial](https://learn.microsoft.com/en-us/power-pages/configure/server-logic-azure-function), [Server objects](https://learn.microsoft.com/en-us/power-pages/configure/server-objects).

### F02 — P1 — Liquid treats application-level failure as successful output

**Evidence:** AC-4.7 L172–175 versus FR-3 L372–377, R1/R8 L383/L390. **Confirmed contradiction.**

A handler can complete successfully while returning status: error. Liquid's result.success then remains true. The stated Liquid branch checks only that execution flag and may render empty “success” values for R1 connector failure or R8 invalid input.

**Change:** First check execution success, then check result.data.status; display the fixed application error message when status is error. Escape every rendered value. **Verify:** success, validation failure, caught connector failure and runtime failure in R1/R8. Learn defines result.success as successful execution and data as parsed handler output, not as the recipe's application status. [Liquid serverlogic object](https://learn.microsoft.com/en-us/power-pages/configure/liquid/liquid-objects#serverlogic).

### F03 — P1 — R5's request contract does not match the retained tutorial demo page

**Evidence:** R5 contract L387; AC-3.9 L154; corrections 17–18 L97/L100; AC-3.7 L152. **Confirmed source/spec mismatch.**

The spec moves id and serviceSession to query parameters. The tutorial page sends UserName/serviceSession in create/update bodies and uses username for the removal query. Changing only the endpoint and return decoding, as the specified demo-page fixes do, leaves requests incompatible with the generated handler.

**Change:** Define method-by-method R5 inputs and explicitly adapt both demo page and generated client calls to them; add those input remappings to “Differences from Learn.” **Verify:** list, single-record read, create, update and removal end to end against the same contract, including an empty session. [External services tutorial](https://learn.microsoft.com/en-us/power-pages/configure/server-logic-external-services).

### F04 — P1 — Account-scoped recipes lack the relationship and record-linkage setup they require

**Evidence:** R1/R4/R10 L360/L363/L369; contract L386; AC-3.6 L151; AC-5.5 L193. **Confirmed prerequisite gap; resulting CRUD behavior needs live proof.**

“Account access” alone is insufficient setup: the maker must choose a relationship, and test users/data must have the relevant account associations. R4's retained create form does not establish the new contact's account linkage. A record can therefore be created without becoming readable/updatable through the recipe's Account scope. R10's account scope likewise needs an explicit suitable relationship, rather than assuming the word Account supplies one.

**Change:** Specify relationship selection, signed-in contact/account prerequisites, fixture associations and how R4 creates records inside the intended scope. Add Append/Append To prerequisites if the chosen association needs them. Do not silently replace Account with Global. **Verify:** a linked user can complete CRUD and retrieve the created record; a different account cannot access it. [Table permission configuration](https://learn.microsoft.com/en-us/power-pages/security/table-permissions#configure-table-permissions).

### F05 — P1 — R7's allowed tutorial differences omit HTML and upload-path safety

**Evidence:** R7 L366/L389; AC-3.7 L152; correction 17 L99; sample event-registration.sl L79–88/L113. **Confirmed source risk and missing requirement, not a tested deployed exploit.**

The full Microsoft sample inserts fullname/event text/date directly into HTML and constructs a ticket filename from fullname with whitespace removed. Strings of at most 200 characters can still contain HTML or path/filename delimiters. The universal URL-encoding rule does not provide HTML escaping or a filename policy, and the “only differences” constraint currently omits these fixes.

**Change:** Add context-specific HTML escaping; define an allowed filename/path segment and collision behavior; list these as permitted differences from Learn. **Verify:** HTML-looking input renders as text; slash, quote, percent, hash and other filename characters cannot alter the upload path; repeated names behave as documented. [Microsoft sample archive](https://github.com/microsoft/power-pages-samples/blob/7efe69992663ce2629667a78549cc9d140c34bed/samples/server-logic/sharepoint-integration/event-registration.zip), [Graph tutorial](https://learn.microsoft.com/en-us/power-pages/configure/server-logic-graph-sharepoint).

### F06 — P2 — R7's error contract does not describe partial external side effects

**Evidence:** R7 L366/L389; universal failure L374–375; sample event-registration.sl L34/L113–115. **Confirmed sample ordering; recipe outcome needs a decision.**

The source uploads a SharePoint ticket before creating the Dataverse registration. A later Dataverse failure leaves the upload in place. A generic status: error does not tell the maker that an earlier operation succeeded, and retries may overwrite or duplicate work depending on the selected filename policy.

**Change:** Document operation order, possible partial completion and the intended retry/reconciliation behavior in R7's README and failure contract. A transaction/compensation framework is not required for a starter, but “error” must not imply no side effects. **Verify:** force each step to fail and record which resources remain. [Microsoft sample archive](https://github.com/microsoft/power-pages-samples/blob/7efe69992663ce2629667a78549cc9d140c34bed/samples/server-logic/sharepoint-integration/event-registration.zip).

### F07 — P2 — R10's custom API prerequisites are incomplete

**Evidence:** R10 L369/L392; FR-3 L353–356. **Confirmed contract gap; no authorization bypass is asserted.**

Placeholder API names plus account Read/Write do not define the replacement APIs' parameter schemas, return schemas, execution privileges or business authorization. Bound actions can have effects beyond the bound account. A maker can satisfy the stated checklist and still receive an authorization/schema failure.

**Change:** Identify which API metadata must be replaced, where its input/output contract is filled in, and that ExecutePrivilegeName and API/plugin authorization must be reviewed separately. Label the recipe as an API integration template until these prerequisites are supplied. **Verify:** missing API, wrong parameter, insufficient execution privilege and permitted invocation. [Custom API security](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/custom-api#secure-your-custom-api-by-requiring-a-privilege).

### F08 — P2 — Several validation rows are not executable method-level contracts

**Evidence:** FR-3 L381–396; R3–R5/R7/R9/R10 rows L385–392. **Confirmed underspecification.**

R3 limits q's length but not its type; R5 does not distinguish optional id for a list read from required id for update/removal; R4's options whitelist supplies segment names but no value grammar, duplicate policy or useful top bound; “Body parses to an object” does not say whether null/arrays are rejected. R7's fields remain unset pending S3. The client generator also lacks explicit sample query/body values for each enabled method.

**Change:** Expand to one contract per function with required/optional fields, type/default/length/range rules, allowed demo fields, exact example request and response. Reject malformed JSON and wrong shapes with the common serialized validation result. Explicitly say that arbitrary CRUD fields/query options are not a general authorization validation guarantee. **Verify:** absent, null, array, scalar, duplicate/invalid options, zero/negative/excessive top and each valid demo request.

### F09 — P1 — Logging raw exceptions and connector bodies is not a secrecy boundary

**Evidence:** FR-3 L375/L402 versus Security L616–617. **Confirmed unsafe logging instruction; exposure is diagnostic-configuration dependent.**

The spec sends exception text and connector bodies to Server.Logger.Error while treating them as “never returned.” These values can include credentials, secret-bearing URLs, tokens or personal data. Microsoft documents browser-visible diagnostics, and its server-logic skill describes UserTrace response headers. Excluding data from the JSON payload therefore does not establish confidentiality.

**Change:** Require sanitized operation/status/activity identifiers; prohibit raw token responses, upstream bodies and secret-bearing exception/URL logging. Describe the diagnostic caveat in recipe setup. **Verify:** error fixtures with a sentinel secret never place it in generated logging arguments or captured diagnostic output. [Power Pages DevTools](https://learn.microsoft.com/en-us/power-pages/configure/devtools-addon), [Microsoft server-logic troubleshooting](https://github.com/microsoft/power-platform-skills/blob/main/plugins/power-pages/skills/add-server-logic/SKILL.md#troubleshooting-server-logic-execution-errors).

### F10 — P2 — The universal caller-permissions footer misstates upstream identity

**Evidence:** AC-4.2 L166; R3/R6/R7/R9 L362/L365–368. **Confirmed wording error.**

“Runs on Power Pages with the caller's permissions” covers site invocation and applicable Dataverse authorization, but R7's client-credentials Graph calls use an application identity; shared API/function credentials and downstream flow connections also have their own permissions. The footer can be read as saying upstream access is delegated from the site user.

**Change:** Qualify the footer and checklist by recipe: site access is governed by the caller's role; upstream operations use the configured integration identity. Retain the downstream least-privilege question. **Verify:** R7's displayed instructions explicitly distinguish site authorization from Graph application permissions. [Graph/SharePoint tutorial](https://learn.microsoft.com/en-us/power-pages/configure/server-logic-graph-sharepoint), [Power Pages security best practices](https://learn.microsoft.com/en-us/power-pages/security/security-best-practices).

### F11 — P3 — The Liquid-only recipe still inherits HTTP-only package wording

**Evidence:** AC-3.8 L153; AC-5.6 L197; FR-2a L339–344; R8 L367. **Confirmed wording/state gap.**

R8 has no HTTP method, yet universal README requirements include “the endpoint,” and the persisted method model is otherwise one of five HTTP values. This can produce a package implying that getSummary is reachable at an HTTP endpoint.

**Change:** Represent the absence of an HTTP method explicitly; use the Liquid operation/tag and request-path variant in R8's README. State that any endpoint shown is not callable for this recipe. **Verify:** R8 creation, download, reopen and switching away have coherent method/language state and no misleading HTTP call.

## Editing, insertion, readiness and persistence

### F12 — P2 — Regeneration and manual-edit preservation have conflicting interpretations

**Evidence:** AC-2.9 L135; AC-4.1 L165; AC-4.3 L167; AC-4.10 L178. **Confirmed ambiguous transition.**

Both panes must update on name/method/language changes, while server edits persist until recipe change or Start over. The spec does not separate metadata/client updates from server regeneration or define the dirty baseline when those settings change. Regenerating loses work; preserving it may leave name comments/client contracts out of sync.

**Change:** Explicitly preserve edited server text during non-destructive input changes, update headers/client metadata separately and define the comparison baseline; alternatively, require discard confirmation for every regenerating transition. **Verify:** edit, rename, switch an enabled method/language, cancel a recipe switch, restore the baseline and switch again.

### F13 — P2 — Permission self-review is not invalidated by the code it reviews changing

**Evidence:** AC-2.8 L134; AC-3.6 L151; AC-4.3 L167; AC-6.8–6.9 L222–225. **Confirmed missing transition.**

A user reviews R1's Read checklist, then inserts CreateRecord or HttpClient. Only Browser checks reruns, and the checklist is still recipe-derived. The permission segment can remain reviewed for code with materially different requirements.

**Change:** Invalidate permission self-review on server-code mutation; label the checklist as guidance for the selected recipe and require review of additions. This does not require a new code-to-permissions inference engine. **Verify:** review, insert a write/outbound sample, undo, restore text and reopen persisted state; each review-validity transition follows the documented policy.

### F14 — P3 — Validation's deliberate limitation is invisible in the product contract

**Evidence:** AC-5.3 L191; Non-Goals L43; Error Scenarios L636. **Confirmed communication gap, not a request to implement edited-code validation.**

Validation stays complete even after validation is removed or syntax is broken. The scope choice is explicit in the spec, but the tile/download can still imply the current handler was validated.

**Change:** Show “Generated recipe checked; edits not revalidated” after edits, and carry that caveat into README/readiness output. Define Browser checks as a prohibited-pattern check, not a compile/runtime test. **Verify:** remove input validation or introduce an unmatched brace; the UI/package must not claim the edited code was verified.

### F15 — P2 — Marking Permissions reviewed incorrectly forces 3/3

**Evidence:** AC-5.1–5.4 L189–192. **Confirmed contradiction.**

If Browser checks needs attention, marking Permissions reviewed must not make all three items ready. The handoff also assumes initially clean code here.

**Change:** Change only the Permissions item and recompute K from the actual independent items. **Verify:** add fetch(url), mark review and observe 2/3; remove the prohibited text and observe 3/3.

### F16 — P2 — Automatic async insertion can invalidate the selected Liquid client

**Evidence:** AC-6.8 L222; AC-4.7 L171; S4 L542. **Confirmed incompatible transition under the present Liquid restriction.**

Inserting an await sample into R1 adds async while Liquid can remain selected. The recipe table still says Liquid is supported although runtime support for async Liquid is unresolved.

**Change:** Either switch to a supported client with an explicit explanation or refuse the insertion in that context until S4 supports it. Apply the policy to manual async edits as well; make undo restore every automatic change. **Verify:** insert an HttpClient sample into R1 with Liquid selected and exercise one-step undo.

### F17 — P2 — Insertable samples have no syntactic/context applicability contract

**Evidence:** AC-6.8 L222; FR-6 L485–492; error fallback L638. **Confirmed underspecification.**

“No cursor” assumes a selected function exists. The cursor can be in a comment, string, helper, global scope or unparsable manually edited code. Samples may contain function wrappers, variable declarations, returns or HTTP-only Context members. Adding async alone cannot make every insertion valid; an early return can also make appended code unreachable.

**Change:** Define insertable snippet forms, function selection, legal insertion points, variable conflicts and context requirements. Fall back to Copy with an explanation when no safe target exists; do not guess or silently rewrite unrelated code. **Verify:** repeated insert, no function, multiple functions, cursor inside a literal, malformed code, HTTP-only sample in R8 and insertion after return.

### F18 — P2 — Byte-for-byte downloads and editor normalization need one ordering rule

**Evidence:** AC-4.10 L178; AC-5.6 L195; editable pane L167. **Confirmed boundary ambiguity.**

UTF-8/LF/one trailing newline is mandatory both in the pane and ZIP. Pasting CRLF text, removing the final newline or adding several trailing blank lines conflicts with “pane content byte for byte” unless normalization is defined before the comparison.

**Change:** Define the canonical editor value and when line-ending/final-newline normalization occurs; dirty comparison, Copy and download must use that same value. Avoid silently exporting content different from what the user sees. **Verify:** CRLF paste, non-ASCII text, no final newline and multiple trailing newlines; compare the displayed canonical text, clipboard and ZIP bytes.

### F19 — P2 — Persisted state lacks version, validity and failure behavior

**Evidence:** AC-5.8–5.9 L202–203; FR-5a L461–463. **Confirmed acceptance gap.**

“Invalid” does not define mismatched recipe/method/language combinations, removed recipes, state from an older generator, storage failure or corrupt edited content. Restoring a review flag after a recipe contract changes can certify a different checklist; falling back wholesale to defaults can discard recoverable edits.

**Change:** Define a versioned state schema, validation of combinations, review invalidation across catalogue changes and a visible recovery policy that preserves recoverable user text. Define save timing and behavior when settings storage fails. **Verify:** corrupt JSON, unsupported combination, old catalogue version, failed persistence and Start over followed by reopen.

### F20 — P2 — The blanket no-secrets download promise contradicts verbatim user code

**Evidence:** Security L616–617; AC-4.10 L178; AC-5.6 L195; FR-5a L461. **Confirmed contradiction.**

A maker can paste a literal secret. Downloading and persisting that handler unchanged cannot simultaneously guarantee no secrets are written. FR-4 is not a secret detector, and the spec does not claim one.

**Change:** Scope the guarantee to generated templates and host/configuration data the tool obtains; state clearly that user-authored text is copied/persisted unchanged. Do not silently redact executable code. Keep generated templates secret-free and avoid reading unrelated secret settings. **Verify:** a synthetic user-edit sentinel follows the chosen contract while generated templates and reports contain no obtained credentials.

### F21 — P2 — Slug generation lacks deployable name and filesystem limits

**Evidence:** AC-2.2–2.4 L128–130; AC-5.6 L194; FR-2 L331. **Confirmed missing boundary; platform limits require verification.**

The regex accepts arbitrarily long names and Windows device stems such as con or nul. A host save can fail, and the generated package may have a name the runtime cannot use. The generic save-error handling does not establish a useful name contract.

**Change:** Verify Power Pages name limits and host filename restrictions; define maximum length and reserved-name handling while preserving the visible mapping to endpoint/files. Document slug collisions and non-Latin names collapsing to untitled; uniqueness need not be checked against a site in offline Starter. **Verify:** long input, device names, punctuation-only and non-Latin input, and two inputs producing the same slug.

## Restricted-pattern checks and code evidence

### F22 — P2 — T9 cannot pass under the stated case-sensitive matching rule

**Evidence:** correction 14 L92; FR-4 L413–416; T9 L431. **Confirmed contradiction.**

name.startsWith("a") contains uppercase With(, not lowercase with(. A case-sensitive substring matcher cannot report the expected with( match. The text says the case difference makes it “May be rejected,” but no alternate case-insensitive risk rule is defined.

**Change:** Either make T9 “no match” under the current rules, or explicitly define a separate case-insensitive advisory rule and its expected consequences. Keep the confirmed lower-case runtime rule distinct. **Verify:** startswith(, startsWith(, WITH (, string/comment variants and whitespace variants. A direct case-sensitive substring check of the stated T9 text returned false during this review.

### F23 — P2 — Lexical matching needs tests for JavaScript's actual code regions

**Evidence:** FR-4 L411–444; FR-7 function parsing L501. **Confirmed acceptance gap.**

“Outside comments and strings” does not specify template literal expressions, regex literals, escaped identifiers, multiline imports or member access with whitespace/comments. For example, interpolation contains executable code even though the surrounding template is a string. Implementing a comment/string stripping regex can misclassify it or distort line numbers. Static import can also be legal module syntax while forbidden by this runtime.

**Change:** Define tokenizer/parser mode and failure behavior; retain source locations. Add executable interpolation, literal-only templates, regexes, escapes, multiline imports and comment-separated syntax to the test table. Do not evaluate inspected code to obtain these facts. **Verify:** fixtures distinguish executable regions from literal text, preserve exact offending lines and still report prohibited text when the overall source has a syntax error.

### F24 — P1 — Absence of an exact connector string cannot prove absence of access

**Evidence:** FR-7 L499/L501; AC-8.8 L273–277; FR-9 L564/L569. **Confirmed false-negative path in the stated detection contract.**

Valid code can use Server.Connector["Dataverse"], destructuring or a connector alias without the contiguous text Server.Connector.Dataverse. The same applies to HttpClient. Such a file can receive “No Dataverse access” or “No outbound calls” despite calling the connector. Conversely, a comment containing that text can trigger unnecessary checks if detection is raw substring-based.

**Change:** Define supported AST reference forms and alias handling, with an Unknown result for unsupported dynamic access. Only a supported analysis with complete code evidence may establish a no-use result; use Needs review otherwise. Scope the summaries to detected direct connector use. **Verify:** direct/dotted-with-whitespace, bracket, destructured/aliased, comment-only, dynamic-property and unreadable-code cases.

### F25 — P2 — HTTP function names do not prove a handler is read-only

**Evidence:** FR-7 L501; AC-8.8 L272; FR-9 L564; privilege list L517. **Confirmed diagnostic overstatement and policy decision.**

get() can call CreateRecord or a mutating helper. A Liquid-only getSummary is not classified by the HTTP rule at all. “Write-level privileges on a read-only handler” therefore overstates what the function-name heuristic establishes. Append and Append To are also read but excluded from the alleged write-level rule.

**Change:** Say “write privileges on a handler exposing only GET”; disclose that it is a method-based heuristic. Decide explicitly whether relationship-mutation privileges belong in that policy. Keep semantic behavior analysis and effective-user authorization outside v1 unless separately approved. **Verify:** GET with a write helper, GET plus helper functions, Liquid-only code and Append/Append To-only grants. [Table permission privilege reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/mspp_entitypermission).

## Inspector configuration and scan correctness

### F26 — P1 — Inactive or ineffective permissions can count as grants

**Evidence:** FR-7 L499/L517; FR-9 L564; AC-8.8 L271–274. **Confirmed data/rule omission.**

The spec reads table/scope/privileges/roles but not permission state or parent dependencies. A linked inactive non-Global Read permission can satisfy “permissions linked” and leave the check Configured even though it grants no access. An active child can likewise be ineffective because its parent is inactive.

**Change:** Read permission/parent states; separate active applicable configuration from stored inactive configuration. List inactive items as evidence, but do not treat them as grants. If parent/relationship applicability cannot be resolved within v1, use Needs review and explain that limitation. **Verify:** inactive permission, inactive parent/active child, active scoped permission and broken parent relationship. Learn expressly describes deactivation and child effects. [Table permission lifecycle](https://learn.microsoft.com/en-us/power-pages/security/table-permissions#deactivateactivate-or-delete-table-permissions).

### F27 — P2 — Role-linked grants are only a subset of the caller's permission configuration

**Evidence:** FR-7 L499/L505; FR-9 L564; Non-Goals L41; Out of Scope L711. **Confirmed scope limitation requiring accurate communication.**

The scanner considers permissions linked to the handler's assigned roles. Site users can also hold default/authenticated and other roles with cumulative permissions. The non-goal appropriately excludes effective-user access, but “its roles hold” and the configuration snapshot can be read as a complete permission assessment.

**Change:** Label the grant set as “permissions linked to this handler's assigned roles”; state that other/default role grants and real-user combinations are not assessed. If default-role configuration is included, define that set explicitly without pretending it covers every user. **Verify:** a restrictive handler role alongside a broader default role; screen/export must state exactly what was examined. [Power Pages role model](https://learn.microsoft.com/en-us/power-pages/security/power-pages-security).

### F28 — P2 — Missing, unreadable, malformed and conflicting settings need distinct evidence

**Evidence:** AC-7.7 L243; FR-7 L502–503/L518; FR-9 L565–576. **Confirmed incomplete decision model.**

The table covers true/absent and false, but not empty or invalid boolean text. A value such as maybe matches neither branch. Duplicate settings and case/whitespace differences have no precedence policy. A failed/partial query cannot be treated as “absent,” because that would invent defaults.

**Change:** Define explicit evidence states and normalized accepted values; apply defaults only after a successful complete lookup establishes absence. Invalid or conflicting values produce Needs review. Specify duplicate and inactive-setting behavior. **Verify:** absent, empty, whitespace, True/False variants, invalid text, duplicates, denied read and partial enumeration for Enabled, AllDomains, AllowedDomains and Timeout.

### F29 — P2 — S1 needs explicit identity-join and effective-value fixtures

**Evidence:** data sources L514–518; S1 L521–527; S2 L537. **Confirmed missing spike deliverables; actual mapping remains unverified.**

Web roles are read through both generic components and mspp_webrole, but S1 does not explicitly prove how those identifiers/site identifiers join. The virtual table references and component relationship establish available structures, not which related records represent a given assignment. Stored setting JSON may also differ from the effective value when environment variables or solution layers participate.

**Change:** Record exact read queries, stable record/site/role identity mappings, N:N direction/type filtering, sample redacted payloads and resolved setting-value rules. Compare the result with the management UI for the same site. Consider the documented virtual tables for role/permission/setting fields if they provide a smaller reliable read path; do not prescribe raw JSON parsing before the spike. **Verify:** same-name roles on different sites, unrelated component links, normal and variable-backed settings, and restricted reads. [Enhanced data model](https://learn.microsoft.com/en-us/power-pages/admin/enhanced-data-model), [Site Component relationship reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/powerpagecomponent#powerpagecomponent_powerpagecomponent), [Web Role reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/mspp_webrole).

### F30 — P2 — O6 proves only that a list exists, not that it is usable for the handler

**Evidence:** FR-7 L502–503; FR-9 O6 L574; R6 L365; Goal L33. **Confirmed rule limitation; platform host/wildcard semantics remain a gate.**

A nonempty list containing unrelated.example is Configured even when the handler calls graph.microsoft.com. The parser also accepts leading *. despite wildcard support being undocumented. Neither presence nor syntactic parsing proves that destinations are permitted. It can miss an outbound configuration gap while using reassuring wording.

**Change:** Decide whether the check is merely structural. If so, say “A domain list is configured; destination coverage and wildcard behavior are not verified” and require that question in review. Alternatively compare statically known destinations and mark unresolved/dynamic destinations Needs review. Do not require reading secret endpoints solely to perform this comparison. Verify supported domain syntax/wildcards in S4. **Verify:** matching, mismatching, wildcard, URL-instead-of-host, IDN/IP and dynamic endpoint cases under the chosen scope.

### F31 — P2 — Timeout validation is incorrectly conditional on HttpClient use

**Evidence:** AC-8.8 L276–277; FR-9 L576. **Confirmed rule/source mismatch.**

The timeout condition applies to every row except O1, so a Dataverse-only or CloudFlow-only handler ignores an invalid ServerLogic/TimeoutInSeconds. Learn describes that setting as the maximum server logic execution time, not only HttpClient time.

**Change:** Evaluate the site timeout independently of the no-HttpClient case, while keeping the three-check design. Show it in the existing detail or a site-level configuration notice with an explicit count policy. **Verify:** timeout 0, text and 241 on R1 and R9, plus the absent default and valid positive values. [Server logic settings](https://learn.microsoft.com/en-us/power-pages/configure/server-logic-overview#site-settings).

### F32 — P2 — “No outbound calls” excludes CloudFlow and downstream integration behavior without saying so

**Evidence:** FR-9 O1 L569; R9 L368; tenant policy Non-Goal L42. **Confirmed wording overreach; no claim about runtime governance coverage.**

R9 performs a flow invocation without HttpClient in the script, and the flow can make downstream network calls. O1 says there are no outbound calls, although this scanner only detects one direct connector family. The tenant-policy disclaimer does not explain this distinction.

**Change:** Say “No direct HttpClient calls detected” and state that CloudFlow/downstream identities, permissions and network behavior are not inspected. If native CloudFlow is subject to a site networking setting, obtain that fact in a dedicated S4 case before encoding a rule. **Verify:** R9 is described accurately regardless of the flow's downstream actions. [Server objects](https://learn.microsoft.com/en-us/power-pages/configure/server-objects).

### F33 — P2 — Reviewing unknown evidence needs an explicit acknowledgment policy

**Evidence:** AC-7.7 L243; AC-8.5 L265; AC-8.10 L279; FR-8 L552–558. **Confirmed consequence of the defined state model; owner decision, not a contradiction in the assigned status rules.**

A failed read is Needs review and is eligible for Mark as reviewed. After doing so for every failed check, a file is Ready and contributes to “configured” counts even though no configuration was confirmed. Original reasons remain visible, but the aggregate loses the distinction between reviewing a risk and obtaining missing evidence.

**Change:** Choose and document how review of missing evidence is acknowledged. Retaining the existing status rule is possible, provided the result prominently says that evidence is incomplete and does not imply the missing configuration was confirmed. Alternatively keep evidence completeness separately or withhold Ready. This is an owner decision, not a mandate to add effective-user-access analysis. **Verify:** all reads denied, partially denied and deliberate risky-but-readable configuration; each has a distinct honest result.

### F34 — P1 — Connection changes and abandoned scans need unconditional invalidation

**Evidence:** AC-1.4 L116; AC-7.6 L242; AC-8.9 L278; FR-7 L497. **Confirmed async/context contract gap.**

Clearing results is conditional on Inspector being open. A connection can change while Starter is visible, and a delayed earlier scan can repopulate cleared state after a site/connection change or rescan. Old findings can then appear beneath new environment labels.

**Change:** Listen for context changes regardless of selected tab; bind every read/result/export to connection, site and scan identity. Discard obsolete callbacks and define cancellation/overlapping-scan behavior. **Verify:** hold an environment-A read; switch to Starter, connect B, reopen Inspector and release A; repeat for sites and rescans. No obsolete evidence or marks may appear/export.

### F35 — P2 — Complete inventory, paging and recovery are not part of scan acceptance

**Evidence:** AC-7.10 L246; FR-7 L504; Reliability L621–622; Performance L607. **Confirmed acceptance gap.**

“No cap” does not require following all site/component/role/permission pages or specify discovery failure. If inventory loading is interrupted, the tool cannot display every unread file because it does not know they exist. Large shared-role/permission sets can be paged even when there are fewer than 50 logic files. Throttling also differs from permission denial or disconnection.

**Change:** Define inventory completeness separately from per-check completeness; follow continuation pages with stable identity/deduplication. Bound retries or rely explicitly on host retry support, honoring service-protection delays; preserve an incomplete-inventory warning when discovery fails. Prevent an undiscovered tail from yielding “all files ready.” **Verify:** paged configuration, failure on page two, 429 with Retry-After, isolated record failure and a connection loss during discovery. [Dataverse paging](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/page-results), [Service protection limits](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/api-limits#retry-operations).

### F36 — P3 — The no-sites message overstates the supported inventory

**Evidence:** AC-7.2 L238; AC-7.8 L244; error L640. **Confirmed wording mismatch.**

An environment containing only standard-model sites has no entries in this enhanced-only selector, yet the message says there are no Power Pages sites in the environment. A restricted identity may also see only a subset.

**Change:** Say “No supported enhanced-model sites are visible to this connection,” with the standard-model limitation available nearby. Keep unreadable-site-list errors distinct. **Verify:** no sites, standard-only sites, all inactive enhanced sites and a denied list read.

### F37 — P2 — Scan provenance and changed configuration are undefined

**Evidence:** AC-9.2 L296–303; AC-9.3 L307–312; session-only results L278; FR-7 L499. **Confirmed report-evidence gap.**

File reports have no evidence timestamp; site reports show export date, not when configuration was read. Reads are not necessarily an atomic snapshot, and source configuration can change during/after a scan. A sign-off artifact needs to identify what stored configuration and time window its conclusions describe.

**Change:** Include scan start/completion or observed-at times, export time with timezone/offset, scan completeness and spec/rule version. Explain whether current stored/draft or published configuration is being examined. If changes are detected during reading, mark affected evidence stale or request rescan; do not imply an atomic runtime snapshot. **Verify:** export later in the session, alter a record mid-scan and compare artifact provenance with recorded scan facts.

## Finding presentation and report exports

### F38 — P2 — Aggregate “configured” and “OK” labels erase manual review

**Evidence:** Goal L34; AC-8.1 L259; AC-8.6 L266; AC-8.12 L281; AC-9.3 L308. **Confirmed wording contradiction.**

Counting Reviewed toward completion is an explicit product choice, but “All configured” and “K checks configured” then describe a known Global-access risk or a self-reviewed unknown as confirmed configuration.

**Change:** Use “addressed” or “review complete” for the combined count; display Configured and Reviewed counts separately. Preserve Reviewed in every table and its original reasons. **Verify:** all Configured, all Reviewed and mixed statuses produce different labels/counts even when the completion ring is full.

### F39 — P2 — Count variables and Not scanned text are inconsistent

**Evidence:** AC-8.1 L259; AC-9.3 L308. **Confirmed contradiction.**

AC-8.1 defines N = K for the OK legend, while the site report uses N as the total denominator. The file legend also hardcodes “1 not scanned” although two or three checks can be unread.

**Change:** Define C = Configured, V = Reviewed, M = Needs review, U = Not scanned, T = C+V+M+U. Addressed count is C+V, and missing count is U with correct pluralization. **Verify:** all 64 combinations of the four file-check states, cross-file totals, and totals above the ring threshold. Apply F33's separate evidence-completeness policy as well.

### F40 — P2 — Export eligibility conflicts with partial-result reporting

**Evidence:** AC-9.1 L291; AC-7.10 L246; AC-9.3 L311; FR-8 L556. **Confirmed contradiction.**

The dialog requires a completed scan, while exports explicitly include interrupted Not scanned results. Behavior during a running scan is also unstated.

**Change:** Define export availability for idle, running, completed, interrupted and failed-inventory states. Permit partial exports only with clear incomplete evidence/inventory labeling; keep zero-file behavior explicit. **Verify:** both scopes/formats after interruption, during a running scan and with no discovered records.

### F41 — P2 — Reviewed exports can omit secondary original reasons

**Evidence:** AC-8.8 L275; AC-8.12 L281; AC-9.2 L301; AC-9.3 L311; FR-8 L556. **Confirmed content gap.**

The detail contains every applicable condition, but summaries keep only the first. Detailed exported sections are required only for open Needs-review findings. After marking a multi-reason check Reviewed and disabling snapshots, its other original reasons may disappear.

**Change:** Always export all original conditions for Reviewed and Needs-review checks, independently of question/snapshot toggles. A human acknowledgment must not suppress evidence. **Verify:** one check with Global and write-on-GET conditions, marked Reviewed, snapshot/questions off, all four export variants.

### F42 — P2 — External report values lack an escaping contract

**Evidence:** AC-9.2–9.6 L296–315; FR-10 L580–582. **Confirmed output-safety gap; no implemented XSS is asserted.**

Environment/site/file/role/table/domain values can contain pipes, newlines, brackets or HTML-looking text. They can corrupt Markdown structure or alter an HTML-based PDF render. Demo-page escaping does not cover report values.

**Change:** Escape for each output context; do not interpret configuration values as active Markdown/HTML or fetch remote content from them. Preserve intended plain text and table structure. **Verify:** adversarial names with pipes, newlines, quotes, backticks, brackets and HTML-like values in every field/scope/format.

### F43 — P2 — Redacted filenames contradict filename sanitation

**Evidence:** AC-9.4 L313; AC-9.6 L315. **Confirmed contradiction.**

The safe filename charset excludes brackets, but the redaction rule requires [site] in the Site summary filename. Sanitizing afterward yields a different value and is not specified.

**Change:** Use an explicit safe stem such as site-site-readiness, while retaining [site]/[environment] in report text. Define transformation order and cover headers, hyperlinks, PDF metadata, diagnostics and configuration snapshots within the stated narrow redaction scope. File names intentionally remain identifying under the current scope; disclose that. **Verify:** both formats and scopes, names/URLs repeated in findings and a snapshot, and PDF metadata.

### F44 — P2 — Unbounded site reports have no PDF pagination contract

**Evidence:** AC-9.3–9.4 L306–313; FR-7 L504; handoff README L247/L258–262. **Confirmed capacity gap.**

The reference is a three-file single-sheet composition, but every file/finding must be included without a scan cap. Nothing specifies wrapping, repeated headers, section splitting or overflow.

**Change:** Define multipage PDF behavior, complete content retention, readable text, long-value wrapping, page numbering and table header repetition. Use the reference as page styling, not a fixed content limit. **Verify:** 0/1/10/50/large file sets, all checks needing review, long names/domains and mixed Not scanned states; compare all entries with the source report model.

### F45 — P2 — Export snapshot and asynchronous updates are not coordinated

**Evidence:** AC-9.8 L317; AC-8.5 L265; AC-7.6 L242; FR-10 L581. **Confirmed state contract gap.**

A maker can open the dialog, change a review mark or start a rescan while the report is being generated/saved. “Matches the screen” has no defined observation time. A connection change while a save dialog is open can also mix artifact evidence with new context labels.

**Change:** Freeze an immutable report model with its connection/site/scan identity at a defined export point. Either prevent conflicting actions or cancel/label the export when its context changes. Compare against that snapshot, not whichever screen exists later. **Verify:** toggle review, rescan and switch connections during delayed PDF generation/save.

### F46 — P2 — Export timing and failure guarantees are less defined than Starter download

**Evidence:** NFR L608; AC-5.10–5.11 L204–205; Story 9 L291–317; errors L647/L650. **Confirmed measurement/recovery gap.**

The 5-second export target includes no exclusion for human save-dialog dwell time and has no report-size fixture. PDF generation failure is covered, but Markdown save failure and late binary-write failure lack the same explicit state-preservation/outcome contract as ZIP downloads.

**Change:** Measure from save confirmation to completion toast, state representative sizes/hardware and throttling exclusions, and define cancellation/save/generation failures for both formats. Preserve report/state and display success only after a confirmed save. Limit no-partial-file claims to what the host contract can guarantee. **Verify:** ten-second dialog dwell, cancellation, failed Markdown/PDF writes, failed PDF generation and a representative 50-file export.

## UX, accessibility and design fidelity

### F47 — P2 — Disabled choices rely on explanations users may not reach

**Evidence:** AC-2.10 L136; AC-3.8 L153; AC-4.7 L171; keyboard NFR L626. **Confirmed accessibility contract gap.**

Disabled method/language pills explain themselves only through tooltips. Native disabled controls generally cannot receive focus, so keyboard and screen-reader users may never discover why an option is unavailable.

**Change:** Provide persistent accessible group help, or a reachable explanation mechanism with disabled semantics preserved. Explain Liquid-only R8 without requiring hover. **Verify:** complete these decisions using keyboard and screen reader only. [WAI tooltip guidance](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).

### F48 — P2 — Dialog, tab and editor keyboard behavior is too loosely specified

**Evidence:** AC-1.4–1.5 L116–117; AC-2.9 L135; AC-6.8 L222; AC-9.1 L291–295; NFR L626/L629. **Confirmed acceptance gap.**

“Keyboard operable” and “screen reader reachable” do not specify tab/radio navigation, dialog naming, initial focus, Escape/Cancel, trapped focus or restoration after closing/inserting. Code-editor tab behavior and line-number announcements are likewise unspecified.

**Change:** Require established accessible component behavior, name the relevant patterns and add observable acceptance cases. Keep background content inert in a modal; return focus to the invoking control or inserted code as appropriate. Ensure the editor can be entered and exited without a keyboard trap. **Verify:** both dialogs, all tab/pill groups and insertion/undo using only keyboard and screen reader. [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### F49 — P2 — Long operations and transient errors lack accessible state/recovery rules

**Evidence:** toasts L177/L200/L204/L317; scan NFR L607; progress L504; error table L631–656. **Confirmed acceptance gap.**

A scan can take 30 seconds, but progress is defined only above 50 records. Site loading, scans and exports have no common loading/disabled/retry contract. A 2.6-second error toast can vanish with its only reason or recovery path, and status announcements are unspecified.

**Change:** Define working states for every asynchronous action, prevent duplicate submission, provide screen-reader status announcements and keep actionable errors/retry available after a toast disappears. Preserve the designed brief success toasts. Specify clipboard failure behavior as well. **Verify:** slow reads, slow export, duplicate clicks, denied clipboard, rejected save and retry without losing user state. [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

### F50 — P3 — Reference dimensions do not define behavior in smaller host panels or enlarged text

**Evidence:** AC-6.1 L215; export width L291; FR-11 L590–598; handoff README L31/L50/L143. **Confirmed layout/verification gap.**

The reference assumes 1100×780, three fixed reference columns and a 520px dialog. PPTB panels, zoom and text enlargement can reduce the usable space. Long paths are truncated without an accessible full-value contract.

**Change:** State supported minimum viewport and overflow/reflow behavior; preserve control access at enlarged text/zoom. Code and data tables may use suitable scrolling, while ordinary controls/prose remain usable. Give truncated values an accessible full representation. Define whether PDF text and structure must be accessible/selectable. **Verify:** reference size, smaller supported panel, 200% text enlargement and relevant zoom/reflow cases. The spec promises WCAG contrast, not blanket WCAG conformance. [Resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

### F51 — P3 — Object search/filter selection behavior is undefined

**Evidence:** AC-6.3–6.6 L217–220; no-results error L653. **Confirmed interaction gap.**

A search matching DeleteRecord can leave RetrieveMultipleRecords displayed; a filter can hide the selected object without deciding what its detail column should show.

**Change:** Define search-plus-filter composition, selection when the current object disappears, matching-member highlighting/selection and no-results detail behavior. **Verify:** member-only match, hidden selection, no matches, clearing search and changing Used here after editing.

### F52 — P3 — Report filename/display identity and font rules need separate scopes

**Evidence:** AC-9.2 L297/L305; AC-9.4 L313; FR-11 L593–594; handoff README L250 and reference 04. **Confirmed fidelity ambiguity.**

The spec defines file as the record name without .js even for headings; reference 04 displays customer-summary.js but uses a stem for the saved report. App typography is Segoe UI/JetBrains Mono, while the report specifies DM Sans/Space Grotesk/JetBrains Mono. The broad visual rule does not clearly separate them.

**Change:** Define display name, record name and safe export stem separately; make app/report typography explicit. Decide local font packaging and fallbacks rather than copying the prototypes' remote font loading. **Verify:** records with/without a .js suffix, long names, report headings/filenames and app/report fonts with network access unavailable.

### F53 — P2 — Pending design confirmation contradicts the claim that nothing blocks the spec

**Evidence:** L660; A4 L671; A8 L675–684; high-fidelity promise L8/L77. **Confirmed approval-state inconsistency.**

The spec says no blocking items remain, but ten-recipe layout and token adjustments still await design confirmation. The original recipe tile was designed for three options. These decisions can be provisional, but approval has not been established by moving them into Assumptions.

**Change:** Record them as pending decisions or explicitly accepted defaults with an owner/date. Provide a ten-recipe layout acceptance artifact and source-precedence table for final copy/tokens versus revised spec rules. Separate approved requirements from proposed defaults. **Verify:** approved layout at the supported viewport and approved token mapping. The A8 values themselves pass their stated text backgrounds and should not be reported as failed contrast.

## Technical evidence gates and verification

### F54 — P1 — S4 cannot prove its four claims using one shipped recipe

**Evidence:** S4 L538–542; AC-4.7 L171; R1/R8 L383/L390; open items L664. **Confirmed unexecutable spike design.**

Only R1 and R8 support Liquid. R1 is synchronous and has no HttpClient; R8 has no HTTP operation or connector. No one shipped recipe can cover fetch, jQuery, Liquid, async Liquid and outbound-settings precedence as specified.

**Change:** Replace “one recipe” with a probe matrix: HTTP success/failure envelope; Dataverse read/create/custom API; HttpClient JSON/text/empty; CloudFlow success/empty; synchronous Liquid; experimental async Liquid; independent outbound-setting cases. Assign which observed result gates which feature and how contradictory evidence changes the spec. **Verify:** retain redacted request/response facts, host/site versions and per-case outcomes; do not mark a feature verified based on an unrelated probe.

### F55 — P2 — CreateRecord identifier casing is still an unresolved source discrepancy

**Evidence:** R4 L386; R7 L389; correction 11 L89; S4 L540. **Confirmed source disagreement; runtime answer unverified.**

R4 reads Headers.entityid. Microsoft's frontend reference uses that casing, while the full R7 package uses Headers.entityId. Normalizing the outer string/object result does not resolve this difference.

**Change:** Add successful creation and exact header/identifier casing to S4; define missing-ID handling. Use a deliberate compatibility accessor only if the observed supported runtimes justify it. **Verify:** R4 and R7 both return a usable created ID and never report a missing/undefined ID as successful creation. [Pinned frontend contract reference](https://github.com/microsoft/power-platform-skills/blob/6c662936fc9a2399a1b5524e8f81950ccfd419b8/plugins/power-pages/skills/add-server-logic/references/frontend-integration-reference.md#approach-c--unwrap-server-side-and-return-a-clean-shape-recommended-for-most-new-code), [Pinned R7 package](https://github.com/microsoft/power-pages-samples/blob/7efe69992663ce2629667a78549cc9d140c34bed/samples/server-logic/sharepoint-integration/event-registration.zip).

### F56 — P2 — Parsing tests do not prove that generated clients match handlers

**Evidence:** AC-3.2 L147; AC-4.5–4.7 L169–175; AC-4.11 L179; AC-3.9 L154. **Confirmed acceptance coverage gap.**

Valid syntax can still omit a required query, send the wrong schema, misread inner status, double-parse a body or mutate a demo table after failure. The required tests do not cover token rejection, network failure, non-JSON HTTP errors or bad envelope/data shapes.

**Change:** Add behavior/contract fixtures with fake Server, shell/token and network responses for every enabled configuration and all three downloaded pages. Generated snippets need explicit token/network/HTTP/parse/application failure paths. Update demo rows only after actual application success. **Verify:** use the minimum matrix below plus failure/empty-body fixtures; retain live S4 evidence as a separate requirement.

### F57 — P2 — Missing-setting examples return the wrong representation

**Evidence:** FR-3 L372–374 versus L396; error scenario L655. **Confirmed literal inconsistency.**

The general handler contract returns JSON.stringify(...), while the missing-setting instructions say to return a plain object. A literal implementation breaks the generated clients' string-decoding contract.

**Change:** Show return JSON.stringify({ status: "error", message: ... }) in both places. Keep the no-call requirement. **Verify:** every required setting missing/empty produces the same valid serialized application-error shape and makes no connector call.

### F58 — P2 — R5 update does not define success for a normal empty body

**Evidence:** R5 L364/L387; FR-3 L402. **Confirmed contract omission.**

R5's put invokes upstream PATCH. A normal TripPin update can return 204 No Content, while the contract permits missing data only for del.

**Change:** Specify status-only or data: null for an empty successful put response; use the same shape in both generated clients and the demo page. **Verify:** 204 empty and 200 with a body both take the documented success path. [Microsoft OData update response](https://learn.microsoft.com/en-us/odata/concepts/update-data).

### F59 — P2 — Spike completion and release acceptance lack durable evidence requirements

**Evidence:** S1–S4 L521–544; open questions L660–664; status L3; prior review resolution L163–178. **Confirmed process/evidence gap.**

Several central contracts remain provisional, but “No blocking items remain” and the preceding review's “every item applied” can be mistaken for proof. S1 records a result in plan.md; S2–S4 do not consistently define an evidence artifact, tested versions, acceptance thresholds or failure disposition. “PATCH or MINOR update” is versioning language, not a release decision.

**Change:** Define per-spike deliverables and dependent gates, including exact queries/API calls, redacted fixtures, host/runtime versions, observed results and decisions. Pin the R7 package/source revisions. Mark the spec Draft/pending until necessary facts and design defaults are resolved; allow independent work only where its contracts are stable. **Verify:** each dependent story has a link to passing evidence or an explicitly approved revised scope, with no “verified live” claim based solely on docs or mocks.

## Notes and deliberate limits to retain

These are review notes, not requests to expand v1:

1. **N01 — Configuration review remains the correct boundary.** Do not turn this review into deployment, runtime debugging, tenant-governance reading or effective-user authorization. The fixes above primarily make existing outputs truthful and existing recipes coherent.
2. **N02 — Table comparison exclusions need visible product wording.** v1 does not check whether the right table or required individual privilege is granted, nor granted-but-unused tables. A linked non-Global permission can pass even if it belongs to an unrelated table. This is an explicit L711 limitation; retain it, but display/export it prominently enough that Configured is not read as “all required access exists.”
3. **N03 — Broad access is a review heuristic.** Global may be intentional, particularly R7's Create-only registration permission. Non-Global does not establish safety. Guidance should ask about business purpose, data sensitivity and least privilege rather than equating every orange finding with a confirmed vulnerability.
4. **N04 — Runtime regex claims have a narrower evidential basis.** The with-whitespace regex and several envelope/connector decisions come from Microsoft-authored skill guidance, not a fully documented Learn validator contract. Keep source precedence explicit and distinguish conservative advisory matches from live-observed rejection.
5. **N05 — More catalogue context would prevent invalid use.** Mark properties versus methods, HTTP-only versus Liquid-only members, synchronous versus asynchronous methods, and sample prerequisites. A “not documented on Learn” return type is preferable to guessing. One-line snippets need not become extra recipes.
6. **N06 — R7's field/schema spike can now use concrete source evidence.** The reviewed package reads fullname, email, phone, event, date and eventText. Reconcile actual Dataverse types, event choice values and date/email formats in S3 rather than treating all fields as generic short strings. Source inspection does not prove successful Graph/Dataverse execution.
7. **N07 — R7 least-privilege guidance needs complete setup.** If Sites.Selected is recommended, document its additional site-specific grant prerequisite and necessary operation permissions; listing the permission name alone is not a working configuration. This is a documentation decision, not a mandate to change the sample's integration architecture. [Microsoft Selected permissions setup](https://learn.microsoft.com/en-us/graph/permissions-selected-overview).
8. **N08 — Static handoff samples are not platform proof.** The README's own sample uses a leading question mark in options and exposes exception text; the current spec deliberately corrects these. Prototype 06 includes invalid server APIs and must remain behavior evidence only.
9. **N09 — Do not reopen resolved contrast values.** The adjusted comment/line-number value on #262626 is approximately 4.50043:1; adjusted orange on its tint is approximately 4.55351:1; adjusted blue on its tint is approximately 4.51424:1. Actual composed glass/hover/focus/control states still need implementation contrast checks. Four passing pairs do not prove every rendered state.
10. **N10 — Fonts/assets must support offline Starter.** Bundle permitted fonts/icons or define fallbacks; verify that production runtime/report generation does not depend on the prototypes' Google Fonts requests. Record third-party notices and sample-source provenance during implementation planning.
11. **N11 — NFRs need a test environment.** Define reference host/hardware, editor/code size, configuration volume and measurement start/end. The 30-second network scan cannot be an unconditional guarantee under throttling/disconnection. Report separately normal-case performance and recovery behavior.
12. **N12 — Determinism and normalization need a boundary.** Clarify whether identical output applies to handler/client text only or to ZIP bytes as well. If byte-identical archives are required, ZIP timestamps/order must be fixed. Define recipe/method/object enumeration order and property mapping explicitly.
13. **N13 — The five-minute goal has a small wording mismatch.** “Under 5 minutes” is strict, while median <= 5 minutes admits exactly five. Specify start/end points, the task/recipe and allowed in-app help. Three makers and a median are a useful initial check but do not establish every recipe's usability.
14. **N14 — Standard model and inactive components stay distinct.** Enhanced-only is an explicit scope choice; inactive server logic may be inspected for future reactivation. Reports should retain each component's lifecycle state and avoid describing inactive code as currently callable.
15. **N15 — Tenant policy is intentionally unresolved.** Always include the tenant-policy limitation, including a completely blue/reviewed report. Do not infer tenant permission from site settings or from successful configuration reads.
16. **N16 — Framework selection belongs in the implementation plan.** The absence of package/module paths in a product spec is not itself a defect; the handoff explicitly permits choosing the implementation environment. S2 must establish a supported PPTB host/version before the plan assumes persistence/save/clipboard/connection events.
17. **N17 — Filename redaction is deliberately narrow.** Retaining logic filenames, role/table names and allowed external hosts can identify a project. Call the option exactly “Redact environment and site names,” not “anonymize report”; do not silently expand its scope.
18. **N18 — No live acceptance is established by this review.** API/metadata documentation, a parsed package and prototype inspection are source evidence. PPTB save/persistence behavior, effective permissions, runtime response casing, async Liquid and outbound precedence remain live evidence gates.

## Required validation additions

The current enabled recipe/method/language matrix has **36 configurations**:

| Recipe | Enabled HTTP/operation choices | Client choices | Configurations |
|---|---|---|---:|
| R1 | get | fetch, jQuery, Liquid | 3 |
| R2 | post | fetch, jQuery | 2 |
| R3 | get | fetch, jQuery | 2 |
| R4 | get, post, put, del | fetch, jQuery | 8 |
| R5 | get, post, put, del | fetch, jQuery | 8 |
| R6 | get | fetch, jQuery | 2 |
| R7 | post | fetch, jQuery | 2 |
| R8 | getSummary (Liquid only) | Liquid | 1 |
| R9 | post | fetch, jQuery | 2 |
| R10 | get, post, patch | fetch, jQuery | 6 |
| **Total** | | | **36** |

R8's with-input/without-input variants, all member/sample variants, and the three downloaded demo pages require additional cases. This matrix describes the current restricted method catalogue; it does not imply every recipe supports all five HTTP verbs.

| Area | Minimum evidence needed beyond the current parse tests |
|---|---|
| Generated handlers | ECMAScript syntax, zero restricted-pattern matches, required/default/invalid request cases, missing settings, connector status/shape/body cases, safe logging, consistent serialized return objects |
| Client handlers | Token rejection, network/HTTP errors, malformed envelope/data, execution error versus inner status error, empty success body and valid query/body examples |
| Demo pages | R4/R5 CRUD inputs match the handler; text escaping; update/removal/create UI state changes only after application success; token failure and retry |
| Sample insertion | Context compatibility, valid target, repeated insertion, variable conflicts, async conversion, Liquid compatibility and one-step undo |
| Starter state | Edit preservation for every control, review invalidation, normalization, persistence corruption/failure/version changes, Start over and download cancellation |
| Pattern checker | Every listed restricted token plus lexical/whitespace/case tests; T9 corrected; comments/strings/advisories; precise line numbers |
| Inspector evidence | Exact S1 mappings; active/inactive/parent permissions; complete paged inventory; unsupported code analysis; missing versus unreadable settings; invalid/duplicate settings |
| Inspector state | Each check state/count, original reasons, partial/failed inventory, connection/site changes, late responses, overlapping rescans and marked unknown evidence |
| Reports | Four scope/format combinations × include/redact options; escaping; all reviewed reasons; immutable snapshot; filename policy; large/multipage PDF; cancel/save errors |
| Accessibility/design | Keyboard and screen-reader walkthrough, dialog focus, disabled reasons, status announcements, code-editor exit, supported resizing/zoom, composed contrast and approved ten-recipe layout |
| Live probes | S2 host APIs and S4 matrix; each connector family; creation ID header; JSON/text/empty bodies; synchronous/experimental async Liquid; domain syntax/precedence and any CloudFlow-specific networking rule |
| Goal/performance | Defined timed maker walkthrough and reference fixtures for 100/300 ms, 2/5 s and 30 s targets |

## Coverage and proposed revision sequence

| Spec area | Review coverage |
|---|---|
| Problem, goals, users, non-goals | F10, F14, F27, F30, F33, F36–38; N01–04, N13–18 |
| Story 1 / FR-1 | F12, F34, F48–50 |
| Story 2 / FR-2 | F08, F11–13, F19, F21, F47, F53 |
| Story 3 / FR-3 | F01–11, F55–58; N03, N06–08 |
| Story 4 / FR-2a | F01–03, F08, F10, F12, F16, F18, F56 |
| Story 5 / FR-5 / FR-5a | F13–15, F18–21, F46, F49; N12–13 |
| Story 6 / FR-6 | F16–17, F23–24, F48, F50–52; N05 |
| FR-4 | F22–23, F56; N04 |
| Story 7 / FR-7 | F24–37, F54–55, F59; N14–16 |
| Story 8 / FR-8 / FR-9 | F24–33, F37–41; N02–03, N15 |
| Story 9 / FR-10 | F37–46, F48–52; N17 |
| FR-11 / accessibility | F39, F44, F47–53; N09–10 |
| Performance, security, reliability | F05–06, F09–10, F19–20, F23–35, F42, F45–50, F56; N11 |
| Errors, assumptions, open questions, exclusions | F11–21, F28, F33–36, F40, F46, F49, F53–59; all retained-scope notes |

Recommended order:

1. Repair recipe/response/security contracts first: F01–10, F55, F57–58. Reconcile the R7 package and R4/R5 demo inputs before building templates.
2. Resolve S1/S2/S4 evidence gates and Inspector no-use/permission/settings semantics: F23–35, F54–55, F59. Approve narrower wording where v1 deliberately cannot prove more.
3. Define edit/insertion/review state and immutable report models: F11–21, F33–46.
4. Resolve UX/fidelity acceptance, layout and accessibility contracts: F47–53.
5. Add the verification matrix to the implementation plan, retaining static, host and live runtime results as distinct evidence. Review the revised spec before treating it as approved.

## Review verification

- Every spec section and all 712 source lines were covered; findings were consolidated from four passes and deduplicated by cause.
- Current source links support the material API/security/metadata assertions; no external document's embedded instructions were executed as part of this review.
- The input spec is unchanged: before/after SHA-256 checks both returned 05A39247FC3639822D72B08C1BD4F0465FC48294D1B0551C943E9BDB1890FF55.
- Saved-file checks confirmed 59 sequential, unique finding headings; all finding references resolve; the report contains 18 numbered review notes and no pending placeholders.
- The output is the requested root sol-review.md plus the workflow tracking file tasks/todo.md. No application code, environment records, deployments or memory files were changed.
- Suggested acceptance scenarios are proposed future checks, not claims that those checks have passed on a live host.
