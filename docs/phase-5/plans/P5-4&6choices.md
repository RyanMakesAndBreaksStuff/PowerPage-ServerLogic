# P5.4 and P5.6 owner choices

**Date:** 2026-11-01
**Plans:** `docs/phase-5/plans/p5-4_plan.md` (site reader) and `docs/phase-5/plans/p5-6_plan.md` (reports and PDF), both accepted by the owner on 2026-11-02, baseline `071415c`.
**Purpose:** the six decisions the plans could not settle from the spec (4.1.0) or the brief (`phasse5plan.md`) alone. Each entry records the context, the option the plan adopts, the alternatives, and what changes if the owner picks differently. Approving a plan approves the "Adopted" option unless a different one is named here.

How to answer: edit the **Owner decision** line of each entry (Adopted / option letter / notes), or reply in chat with the IDs.

---

## R-06 — OData string literals: no URL-encoding in the reader (P5.4)

**Context.** Spec FR-7 L632 says: in `$filter`, "write every string value as an OData literal: double each `'` and URL-encode the result". The only string literal P5.4 writes is an environment-variable schema name (`schemaname eq '<name>'`); every other filter value is a validated GUID or an integer. The P5.2 adapter (`buildQueryPath`, `dataverseRead.ts` L36-45) inserts the filter text verbatim into a relative path and PPTB's `dataverseAPI.queryData` builds the request URL from it. Whether the token reaches the wire unchanged is the still-open RG-001 live gate (probe_findings "apostrophe and space request fidelity"). The old draft hard-coded `%27`/`%20` as if the gate were settled.

**New evidence (2026-11-02, owner-supplied).** A working PPTB tool, `mohsinonxrm/pptb-mxrm-fetchxml-studio` (`src/features/fetchxml/api/odata.ts`, dev branch), documents that the PPTB host builds the request URL from the query as given, so the caller must percent-encode free text itself; its `functionWithString` emits `'${encodeURIComponent(odataString(value))}'` with `odataString` doubling each `'` (its issues #173 and #176 record hosts putting the value in the URL raw). That removes the double-encoding fear behind the first draft's option and makes FR-7 L632 the correct form.

**Adopted (revised).** `odataString(value)` doubles each `'`, percent-encodes the result with `encodeURIComponent`, and wraps it in single quotes, exactly as FR-7 L632 says. Control characters still throw `RangeError` (the adapter rejects them anyway). GUIDs are validated and inserted bare; spaces around `eq`/`and` stay raw as in P5.2. Spec and code agree; RG-001's live probe now only confirms wire fidelity.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: double quotes, then `encodeURIComponent`, as FR-7 L632 says** | Matches the spec sentence and a working PPTB tool's proven pattern; `& # % +` in a schema name are safe (`%26 %23 %25 %2B`) and pass the adapter's filter check; no spec amendment needed. | Relies on the external tool's observation of the host until the RG-001 probe captures our own request; a half-encoded filter (`eq`, `and` and their spaces raw) is the convention, not a proof. |
| **B. First draft: double quotes only, reject `& # % +`, defer encoding** | Cannot double-encode under any host behaviour. | Contradicted by the evidence above; spec and code would disagree on one sentence until P5.8; schema names with `%` or `+` would be unreadable. |
| **C. Encode the whole filter with `encodeURIComponent` in the adapter** | One place owns encoding. | Would also encode `eq`/`and`/spaces/parentheses that the Web API expects raw; changes P5.2's committed adapter and tests. |

**Owner decision:** Adopted (revised 2026-11-02 on the owner's evidence)

---

## R-14 — One unreadable role or permission row fails the whole list (P5.4)

**Context.** Web roles (type 11) and table permissions (type 18) arrive as `powerpagecomponents` rows whose `content` is a JSON string. The model needs every role's `anonymoususersrole`/`authenticatedusersrole` flag and every permission's grants to build a file's grant set (FR-7 L651-656). The brief does not say what to do with a row whose `content` is empty, not JSON, or missing a required key. The S1 captures (7 roles, 69 permissions) all parse. The plan author added this decision beyond the brief.

**Adopted.** Such a row makes that whole list `{ ok: false, reason: 'read-failed' }`. Consequence: every Web role and Table permissions finding on the site becomes the non-reviewable "couldn't read configuration" (AC-7.7) until the row is fixed or the scan is repeated with better access. A matched `ServerLogic/*` setting row whose id or state cannot be read fails the settings list the same way (the duplicate count cannot be trusted); other setting rows with unreadable content are per-setting "Couldn't interpret" (R-08). A permission with no `entitylogicalname` is an invalid row, never `table: ''`.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: fail the list closed** | A dropped role could hide the anonymous flag (false "not callable by visitors"); a dropped permission could hide a Global grant; failing closed cannot produce a false Configured, which is the brief's standing rule. | One corrupt row blocks review of every file on the site; the user sees "couldn't read configuration" for data they can read, with no pointer to the bad row (the cause goes to `console.error` only). |
| **B. Skip the bad row, keep the list, add a site banner naming it** | Review continues for every other role/permission; the user is told exactly which row is unreadable. | A skipped row can hide evidence, so any Configured on that site is unsound; needs a new banner and a `SiteFacts` field (`skippedRows`) the model does not have, which widens P5.4 into `model/` and the report. |
| **C. Skip the bad row and mark every finding `hasUnscannedEvidence`** | Reuses the P5.3 field; findings stay visible but cannot be marked reviewed. | Mislabels a read defect as "not scanned" (the brief says not to); still hides the dropped row's evidence from the grant set. |

**Owner decision:** Option B (2026-11-02). The bad row is skipped and kept out of the grant set, the readable rows stay in the list, and a new `SiteFacts.unreadableRows` field (`UnreadableRow = { type: 11 | 18; id: string; name: string }`) records what was skipped. The model grades Web role and Table permissions from the readable rows exactly as before: findings, reasons, detail lines, `hasUnscannedEvidence` and reviewability do not change, and FR-8 and AC-8.11 are not amended. One site banner names the skipped rows, in row order, with the id when a name is empty ("1 web role or table permission row couldn't be read and was skipped: `broken-role`. Findings were graded without it; fix the row and rescan.", and the plural form), and it is repeated in every export because banners already flow into them. P5.4 may edit `model/` only in `copy.ts`, `rules.ts` and `fixtures.ts` for this (plus `settings.ts` for R-15). Accepted consequence: a skipped row can hide evidence (a role's anonymous flag, a permission's Global grant), so a Configured finding on that site may be unsound; the banner names the rows so the reader can fix them and rescan.

---

## R-15 — Environment-variable failure causes collapse to one kind (P5.4)

**Context.** A `ServerLogic/*` setting with `source` 1 is read from an environment variable: definition by `schemaname`, then its active value, else the definition's `defaultvalue`; a Secret-type definition (100000005) must never trigger a value read (FR-7 L658). The brief (P5.4 bullet 3) says "retain missing/denied/unscanned evidence distinctly". The model's `SettingValue` type (`src/types/inspector.ts` L22-27) has `envvar-unreadable` (one kind for secret, missing and failed) and `not-scanned`, and the spec gives all of the first group one text: "Couldn't read `<setting>` from its environment variable".

**Adopted.** Missing or ambiguous definition, denied or failed read, Secret type, unusable schema name, and a missing value with no default all map to `{ kind: 'envvar-unreadable' }`. Unscanned stays distinct as `{ kind: 'not-scanned' }`. The cause (setting name plus one cause word, no values or names from the environment) is written with `console.error` where it is classified. No field is added to the public type.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: one kind, cause logged** | Matches the spec text, which shows one message for all causes; no change to `model/`, P5.3's 49 evidence tests or the report fixtures; the DevTools console still tells a developer which cause it was. | The user cannot tell "variable missing" from "access denied" from "secret" on screen or in a report; the brief's "distinctly" is met only at the log. |
| **B. Add `cause: 'secret' \| 'missing' \| 'denied' \| 'invalid'` to `envvar-unreadable`** | Distinct on screen and in reports; cheap to carry. | Changes `src/types/inspector.ts` and needs copy for four messages in `model/settings.ts`, a spec amendment to L658 (one text today), fixture updates in P5.3's tests and the report goldens; widens P5.4 beyond the reader. |
| **C. Fold the cause into the setting detail line only** | No type change; visible in the detail tile. | The detail is built in `model/checks.ts` from the kind, so it still needs the cause to reach the model: same change as B without the type honesty. |

**Owner decision:** Option B (2026-11-02). `envvar-unreadable` gains `cause: 'secret' | 'missing' | 'denied' | 'failed'`; the model renders four texts (secret, not defined or no value, access denied, generic failed); spec L658 is amended in a 4.2.0 change-log row by the P5.4 plan; P5.3 fixtures and tests are updated; no console log.

---

## P-01 — JetBrains Mono TTF via a pinned dev dependency (P5.6)

**Context.** FR-10 L801-802 requires the PDF to use DM Sans, Space Grotesk and JetBrains Mono as static TTFs, bundled locally after a licence check; jsPDF cannot embed woff2. The repo has the DM Sans and Space Grotesk TTFs (from the `@expo-google-fonts/dm-sans` and `space-grotesk` dev dependencies), `OFL-JetBrainsMono.txt`, and JetBrains Mono only as woff2 (from `@fontsource/jetbrains-mono`, which ships no TTF). The old draft downloaded the TTF from jsDelivr with a script and added a hash manifest and a licence folder; the project rule forbids CDN-loaded assets and the brief says "acquire the missing TTF as a locally bundled asset with its licence; no new runtime library".

**Adopted.** Add the exact dev dependency `@expo-google-fonts/jetbrains-mono@0.4.1` (npm: version `0.4.1`, licence `MIT AND OFL-1.1`), copy `node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf` (114,904 bytes) into `src/assets/fonts/`, and record package, version, tarball and SHA-256 in the evidence file. The existing OFL file covers it. One `devDependencies` line and one lockfile entry change.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: pinned `@expo-google-fonts/jetbrains-mono` dev dependency** | Same provenance family as the two fonts already in the repo; reproducible from the lockfile; no network script; licence already present. | One more dev dependency (not shipped); the TTF is committed as a binary (115 kB) like the other six. |
| **B. Copy the TTF from the official JetBrains Mono GitHub release by hand** | No dependency. | Provenance lives only in a commit message; not reproducible from the lockfile; same binary committed. |
| **C. Drop JetBrains Mono and set monospace cells in DM Sans** | No new font or dependency; smaller inline bundle in P5.7. | Contradicts FR-10 L802 and the handoff's monospace paths; needs a spec amendment. |

**Owner decision:** Option B (2026-11-02). No dev dependency: the TTF is copied from the official JetBrains Mono GitHub release (pinned v2.304 zip, `fonts/ttf/JetBrainsMono-Regular.ttf` → `src/assets/fonts/JetBrainsMono_400Regular.ttf`), with the release URL and SHA-256 recorded in the P5.6 evidence file and commit message; the OFL text is checked against the release.

---

## P-12 — Characters the PDF fonts cannot draw become `?` with a footer count (P5.6)

**Context.** The three OFL faces cover Latin, Latin-1 and most of Latin Extended-A. Probed on 2026-11-01: jsPDF silently omits any character the embedded font cannot map (`doc.text('日本語a')` emits only `a`), so a site or file named in Japanese, or with an emoji, would lose those characters with no trace. The brief says to "record any unsupported-character limitation explicitly rather than claiming universal font coverage or silently dropping content"; FR-10 L802 requires a test that every written character is covered. The old draft threw on the first unsupported character.

**Adopted.** Every string passes through a guard: each code point outside a static validated repertoire (printable ASCII, Latin-1 Supplement and Latin Extended-A minus the points some face lacks, and eight common punctuation marks) becomes `?` and is counted; when the count is non-zero the footer adds `N characters outside the PDF font set were replaced with ?`. A test proves every code point in the repertoire is in all four embedded faces, so no runtime cmap parse or cast is needed. `日本語-handler😀.js` renders as `???-handler?.js` plus the footer line. Markdown carries the text intact.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: substitute `?` and count in the footer** | PDF export keeps working for every site; nothing is dropped silently, the footer says how many; Markdown stays the lossless format. | A name made of unsupported characters becomes `???`, which can make two files indistinguishable in the PDF; the reader must notice the footer line. |
| **B. Throw on the first unsupported character** | Never emits altered content; the AC-9.9 toast ("Couldn't save <filename>" with the reason) already exists in spec and leaves Markdown available. | Any single CJK character or emoji anywhere in the site makes the whole PDF unexportable; the failure arrives after the user chose PDF and confirmed the save dialog. |
| **C. Bundle a fallback font with wide coverage (e.g. Noto Sans CJK)** | Real glyphs for most scripts. | Tens of megabytes inline in a single-IIFE PPTB bundle; a new font family and licence; shaping still absent for complex scripts; a spec amendment. |

**Owner decision:** Adopted

---

## P-14 — PDF layout choices the spec leaves open (P5.6)

**Context.** AC-9.2 and AC-9.3 list the sections and tables of each report but not every cell; the original handoff README §05 (report styling) exists only in the untracked `.scratch` copy, and the current handoff's section 5 is Accessibility. Phase 20's design decisions 1-8 (landscape A4, 36 pt margins, A8 palette, vector `✓`, repeated heads, continuation rows) are adopted outright. Six smaller choices remained.

**Adopted.** (a) The result pill is a rounded tint drawn behind the text in AutoTable's `willDrawCell` (the cell's own fill is turned off so the pill is visible). (b) The PDF files table has the columns AC-9.3 names: ring, file, three checks, result; no extra "Addressed" column (Markdown keeps its Addressed column as today). (c) A Reviewed check in the site table reads `Reviewed: <original reason>`, as Markdown does (AC-8.12). (d) `ReportRow.active` is rendered in neither format, because neither AC defines an inactive label and the two formats must match. (e) Only Needs-review findings get guidance and question lists; Not scanned is a plain list (AC-9.2, AC-9.3). (f) No page numbers.

| Item | Alternative | Why not adopted |
|---|---|---|
| (b) Addressed column | Add `K/3` as a column in the PDF too | AC-9.3 does not list it; the mini ring already shows it; the column costs width in a seven-column landscape table. |
| (d) Active/Inactive label | Append "(Inactive)" to inactive file names in both formats | Brief line 205 mentions "active/inactive labels" but no AC defines the text; adding it changes the Markdown goldens, which P-06 keeps byte-identical. If wanted, it is one line in `buildReportModel` plus a golden refresh in both formats; the owner should name the label. |
| (f) Page numbers | "Page n of m" in the footer | Not in AC-9.3; cheap to add later with `didDrawPage` if reviewers ask. |

**Owner decision:** Adopted with (d) and (f) added (2026-11-02): (d) an inactive file's name is followed by " (Inactive)" wherever it appears as a label in both formats (file-scope title, site files table, Review first and Not scanned lists; the export stem is unchanged) and both Markdown goldens are refreshed as an intended change; (f) a right-aligned "Page n of m" footer on every PDF page.

---

## Summary

| ID | Plan | Adopted | Changes if rejected |
|---|---|---|---|
| R-06 | P5.4 | Double quotes, then `encodeURIComponent`, per FR-7 L632 (revised on owner evidence) | `odataString` + its tests; nothing else |
| R-14 | P5.4 | **Option B:** skip the row, `SiteFacts.unreadableRows`, findings graded without it, site banner names the rows | touches `types/inspector.ts`, `model/rules.ts`, `copy.ts`, fixtures |
| R-15 | P5.4 | **Option B:** `cause` field with four texts, spec L658 amended (4.2.0) | `types/inspector.ts`, `model/settings.ts`, P5.3 fixtures, spec |
| P-01 | P5.6 | **Option B:** hand copy from the pinned JetBrains Mono v2.304 release, SHA-256 in evidence | no `package.json` change |
| P-12 | P5.6 | `?` substitution with footer count | B: one guard function throws instead; one test changes |
| P-14 | P5.6 | Layout choices plus (d) " (Inactive)" label in both formats and (f) "Page n of m" | goldens refreshed; `buildReportModel.ts`, `renderPdf.ts` |

All six are recorded in the plans' Decisions tables with the same IDs. Owner answers recorded 2026-11-02: R-06 adopted (revised), R-14 B, R-15 B, P-01 B, P-12 adopted, P-14 adopted plus (d) and (f).
