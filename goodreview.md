# Project review: unfinished work and spec drift

**Date:** 2026-11-10 · **Branch:** `review` at `686103c` · **Spec:** `docs/specs/001-server-logic-starter-inspector/spec.md` v4.3.1 (last changed 2026-11-05, `90de5ef`)

**Method.** Five read-only Opus sub-agents audited (1) Starter, Server Objects and shell against Stories 1-6, (2) Inspector, reports and export against Stories 7-9, (3) host adapter, manifest, build and probe evidence, (4) every tracking and review document against the code, (5) a rule and dead-code sweep. I ran the gates and spot-checked the headline findings in code. Nothing was changed apart from adding this file.

**Gates today:** `typecheck` pass, `lint` pass (0 warnings), `test` pass (116 files, 2046 tests, 47.6 s). Not run: `build`, `pptb-validate` (recorded as failing in spec line 1061), live probes.

**Confidence.** Items marked *(checked)* I confirmed in code myself. The rest are sub-agent findings with file evidence that I did not re-open. Live-host behaviour was not re-tested.

---

## 1. Summary

- The code is healthy at the unit level: gates are green, no TODOs, skips, `any`, non-null assertions or `@ts-ignore` anywhere.
- **Starter and Server Objects** have no regressions. Every gap the spec's Implementation Status lists for them is still open exactly as written; none has closed.
- **Inspector** is built and its live S2 evidence mostly passed on 2026-11-10, but the code and spec were not updated to match: the paging gate flag is still on and the spec still says S2 is pending.
- **The spec is behind the code in one place and behind the evidence in several.** Only one source change landed after the last spec edit (`5cc190f`, host error classification), and it contradicts FR-7's stated premise.
- **Two new Inspector defects** were found that no document lists (section 3).
- **Release is blocked** on things outside the feature code: `pptb-validate` fails, the default build ships the Inspector with nothing guarding a publish, there is no CI, and there are no Inspector user docs.
- Almost everything raised in `tasks/code-review.md` (20 of 21) and `full-review/ppreview.md` (25 of 27) is still open, because only one source fix has landed since they were written.

---

## 2. Where the repo differs from the latest spec

### 2.1 Code moved, spec did not

| Spec clause | Spec says | Code does | Evidence |
|---|---|---|---|
| FR-7 (line 634), AC-7.10 | PPTB's error object carries `status` | Status is derived from PPTB's message text when no numeric status exists: Dataverse `0x…` codes, `HTTP n`, four sign-in phrases, `Request failed:` | `src/services/pptb/hostErrors.ts:27-64` *(checked)* |

The behaviour agrees with AC-7.7 and AC-7.10, but it is not recorded in the spec or in the deviations table, and it reverses the fallback that plan-starter P5.1 dropped. It depends on host wording that is not a published contract and is not pinned to a host version. If PPTB rewords its messages, failures fall back to the generic message without any signal: 429 and 5xx stop retrying and network loss stops counting as connection loss.

### 2.2 Evidence moved, spec and code did not

| Item | State | Evidence |
|---|---|---|
| `NEXT_LINK_UNVERIFIED` | Still `true`, although the live nextLink wire check passed on 2026-11-10. FR-7 line 633 says the flag stays on only until that check passes. Full pages with no link are still reported as possibly incomplete. | `src/services/pptb/dataverseRead.ts:18` *(checked)*; `findings/logic/probe_findings.md:139` |
| Spec S2 status | Lines 948, 952 and 1066 still say S2 is open and all rows pending. Live rows now pass except the secret environment variable. | `findings/logic/probe_findings.md:134-147` |
| Spec rows AC-5.11 and AC-9.9 "not measured" (lines 1064, 1067) | Contradicted by the 2026-11-10 probe evidence, per the reconciliation agent. Worth re-reading before editing the rows. | same file |
| `probe_findings.md` | Keeps the old 2026-11-01 "Pending" table (lines 113-125) above the new passing table. | |
| Spec header and Implementation Status | Name branch `refine-app` and HEAD `7f24e80`; work is on `review`. | spec lines 7, 1055 |

### 2.3 Spec text left stale by Fix 7

The code follows the Fix 7 addendum; these earlier clauses still describe what it replaced and are not in the Implementation Status table.

- AC-2.4 (line 156): endpoint shown "in the request path strip". The strip was removed.
- AC-3.8 (line 183): R8 method pills disabled, strip uses the Liquid variant.
- Error Scenarios (line 922): "Method pill not exported by the recipe → pill disabled with tooltip".

### 2.4 Known deviations, re-verified as still open

All are already listed in spec lines 1057-1105. Listed here so the count is visible; none needs rediscovery.

**Starter, Server Objects, shell**
- AC-4.12 behaviour matrix: only three `node:vm` suites exist (`client.envelope.test.ts`, `r7.behavior.test.ts`, `demoPages.test.ts`). No shared `Server` fake for R1-R6 or R8-R10, no token-rejection or transport-failure client case, no sentinel-secret harness. Phase 17 plan is 18 boxes unchecked. FR-12 allows v1.0.0 to ship without it; there is no owner decision on how much to build afterwards.
- AC-2.5, AC-3.4, AC-5.9: method filter starts with no pill selected (`starterReducer.ts:26`).
- AC-2.6, AC-2.10: helper text lists every function (`StarterInputs.tsx:72-85`).
- AC-2.11: collision note shows the slug as plain text (`starterOptions.ts:14`).
- AC-3.1: caption reads "1 recipes" (`StarterInputs.tsx:136`).
- AC-4.7 note wording (`client.ts:31`); AC-5.3 validation note behind an info button (`StarterInputs.tsx:211`); AC-5.5 badge flips to a tick (`PermissionNote.tsx:30`).
- FR-2a R8 client: `{% assign inputData %}`, `Content-Type`, custom error strings (`client.ts:237-351`).
- FR-11: glyph `conic-gradient` (`shell.css:24`) and `.ui-tile` gradient plus `backdrop-filter` (`primitives.css:17-18`) remain despite A1; layout rows and page height differ (`starter.css:6,10`); four extra tokens.
- Accessibility NFR: contrast tests cover only the 4.5:1 pairs on tile, code and tints; nothing for `--window`, `--surface`, the 3:1 control border or focus outline (`tokens.test.ts:198-225`).
- FR-6: `Server.User` shows "Not documented on Learn" (`serverObjects.ts:21,192-199`).
- NFR 100 ms search: not measured.

**Inspector**
- FR-7 allowlist checks the action by name only; `operationType` is enforced by type alone (`pptbHost.ts:128-150`).
- FR-7 site-settings query filters by site and type 9 only (`queries.ts:51-59`).
- FR-7 skipped role rows produce a non-reviewable "Couldn't read configuration" (`checks.ts:100-105`).
- FR-8: `Finding` has `check`, not `category`; Not-scanned detail is generic (`checks.ts:68-80`).
- FR-9 F26: an unresolved Parent chain is reported on every file (`grantSet.ts:91`).
- FR-9 O6: every outbound finding carries both questions (`copy.ts:37-40`).
- AC-9.8: an export already in `saving` is not cancelled; the user gets the "cancelled" toast and then the "exported" toast (`inspectorSession.ts:117,155-157`).
- AC-8.5 snapshot unchanged on review; F44 continuation rows (`pdfTable.ts:129`); AC-9.3 singular headline.

About 25 rows in spec lines 1076-1105 still have no owner decision.

---

## 3. New defects not listed anywhere

| # | Severity | Finding | Evidence |
|---|---|---|---|
| N1 | High | **An unreadable parent table permission is offered for "Mark as reviewed".** `parsePermissions` drops unreadable rows, then `parentChain` treats the missing parent as "points at no record" and sets `readFailure: false`. AC-8.5 and FR-7 (line 658) say an unread parent is a read failure with no review option. | `src/features/inspector/scan/parseRecords.ts:195-203`; `src/features/inspector/model/grantSet.ts:34-36,91-95` |
| N2 | Medium | **Errors with an unmapped Dataverse code lose their HTTP status.** `statusFromMessage` returns `null` as soon as it sees a `0x…` code that is not in the table and never tries the `HTTP n` pattern. A 500 or 503 carrying such a code gets no retry, and a 403 with a code other than PrivilegeDenied makes the environment-variable cause `failed` instead of `denied`. Impact depends on how PPTB words 5xx errors. | `src/services/pptb/hostErrors.ts:50-52` *(checked)* |
| N3 | Medium | **A to B to A connection switch during a scan can mix two environments' results.** The scan compares identity at the end but has no generation counter. (Raised as ppreview WR-004; still open.) | `src/features/inspector/scan/scan.ts` |
| N4 | Medium | **The 5 s export watchdog cannot fire during a build.** `renderPdf` is synchronous, so the "export is slow" warning appears only after the build finishes. A 60-file report measured 5.6 s under load, during which the web view is frozen. The test retry (`renderPdf.test.ts:86`) and 10 s poll (`inspectorSession.test.ts:71`) work around this cost rather than a race. | `src/app/inspector-site/inspectorSession.ts:133-150` |
| N5 | Low, needs a live retest | `new-recipes.md` reports HTTP 400 at runtime for `const` function expressions and anonymous `map`/`forEach` callbacks. The generated handlers use both (`__golden__/R4.js.txt:11,30`, `R7.js.txt:10,23`, `R1.js.txt:14`), and FR-3 (line 523) tells generators to use arrow functions. No live evidence for these exact forms either way. | goldens under `src/services/generators/handlers/__golden__/` |

Test gap tied to N2: only `0x80072322` of the four throttling codes is tested (`dataverseRead.test.ts:48-73`).

---

## 4. Release blockers

1. **`pptb-validate` fails.** `origin/main` is the scaffold commit with no README, so `configurations.repository` and `readmeUrl` return 404. The `validate` script omits `--skip-url-checks` and `pptb-validate` is not a dependency (`docs/build-manual.md:145` says otherwise in the wrong direction).
2. **The default build ships the Inspector and nothing guards a publish.** `npm run build` releases all three pages (`vite.config.ts:22` *(checked)*); only `build:beta` gates it. There is no `prepack` or `verify:release` script, and the uncommitted deletion of `.claude/settings.json` removes the `npm publish` deny rule (per `tasks/open-items-2026-11-08.md` C2).
3. **No CI.** `.github/` does not exist, although `tooling.md` says CI runs typecheck, lint and test. `scripts/` is excluded from lint (`eslint.config.ts:15`).
4. **No Inspector user documentation.** README, `docs/usage-manual.md` and `docs/build-manual.md` describe two pages only. `package.json` version is 1.0.0 and the description names only Starter and Server Objects.
5. **S2 evidence caveats.**
   - It ran on a PPTB fork (1.2.8, `89028ff`) that includes the unparented-dialog fix. Upstream PPTB does not have it, so `saveFile` can open out of sight on stock hosts (`tasks/upstream-dialog-parent-fix.md`).
   - Network loss and token expiry were injected, not real.
   - The secret environment variable is "not covered" (owner decision 2026-11-10).
   - "50 records within 30 s" used fake data.
   - The host and basic probe reports predate `5cc190f`.
6. **P5.8 is not started.** `docs/plans/11-01-2026-phase-5-reports-build.md` (20 boxes) and `-release-proof.md` (5 boxes) have no evidence folder. This includes the bundle-size budget and the `renderPdf` lazy-load decision.
7. **Not yet done for release proof:** dev-site scan with both exports compared against the screen, the RG-005 pass (screen reader, 200% zoom, contrast), the three-maker timed walkthrough.

---

## 5. Other open items worth attention

### Generated handler safety (affects what makers ship)
- **R4 `post` and `put` forward the whole caller body**, including `@odata.bind`, to `CreateRecord` and `UpdateRecord` with no field allowlist (`src/services/generators/handlers/r4.ts:228-230,247-249`). Not probed live.
- **`Server.SiteSetting.Get` sits outside `try`** in R7 and R9 (`__golden__/R7.js.txt:94-114`, `R9.js.txt:21`). Whether `Get` throws on a missing setting is unprobed.
- Spike S3 collision probe, S4 item 6 and `CloudFlow.TriggerAsync` remain untested.

### Robustness
- Shell, providers and title bar sit outside any error boundary; `App.tsx:56` has the only one.
- Saves show the raw `HostCallError.message` (`inspectorSession.ts:166`, `DownloadStarterButton.tsx:38`).
- File download uses a `btoa` round-trip with a 128 MiB cap and a misleading error message (`dataverseFiles.ts:17,51`).
- `tool:unloaded` is not handled; `events.on` registers lazily rather than once at init (`pptbHost.ts:102-123`).
- `logo.svg` uses fixed colours.

### Data hygiene
- Dev-org captures naming the environment are tracked in `docs/specs/.../spikes/s1/*.json` and `s4/envvar.json`; two `.scratch` files are tracked.

### Rule violations (small)
- `RecipeCombobox.tsx:59-61` pushes derived state to the parent through an effect; `StarterInputs.tsx:223-226` mirrors it with an unexplained `useCallback`.
- Two production casts: `RecipeCombobox.tsx:65` (`as unknown as`, a jsdom workaround) and `pptbHost.ts:111`.
- `tsconfig.node.json` lacks `exactOptionalPropertyTypes` and `noImplicitOverride`.

### Architecture
- `src/app` and `src/features` depend on each other: features take session hooks from `app/` (18 imports) and `app/inspector-site` imports Inspector internals (`inspectorDeps.ts:1-5`, `inspectorSession.ts:8-10`).
- `services/generators/package/buildPackageFiles.ts:4` and `readme.ts:4` import types from `@/app/starter-session`, so services depend on app. The types belong in `src/types`.
- `src/components/checkStatusBadge.ts` is Inspector-only; `CopyButton` and `ExternalLink` are generic but live in `src/app`.

### Dead code
- `src/app/ExternalLink.tsx` is imported only by its test, so `openInConnectionBrowser` is unreachable in the product (FR-1 line 389).
- `useActiveConnection`, `public/variant-{a,b,c}.svg`, three unused TTFs, three font devDependencies plus `acorn-walk`, three unused icons, `ExportJob.generation` and `selectedFileId`.
- `liquidCheck.ts` is a test-only module inside production `src`.

### Working tree and docs
- Uncommitted deletions: `.claude/CLAUDE.md`, `.claude/integrations.md`, `.claude/settings.json`, `CLAUDE2.md`, `phasse5plan.md`, `spec3check.md`, `tools/minimatch-compat/*`. Ten documents still link to the deleted `phasse5plan.md`.
- **Two package managers.** npm is authoritative (`npm ci`, `npm shrinkwrap`, tracked `package-lock.json`). The untracked `pnpm-lock.yaml` and `pnpm-workspace.yaml` look accidental: the workspace file holds a placeholder value and the pnpm lock ignores the npm `overrides` for minimatch.
- Two near-duplicate probe plans: `docs/plans/11-09-2026-…` is current (55 boxes unchecked though implemented through `686103c`); `2026-11-08-…` is the superseded draft.
- Stale plan checkboxes: phases 07-10, 13, 15, 18, 20, 22-24 are built but entirely unchecked. Phase 21's open box is the Prettier gate, now moot.
- Stale report `probes/reports/pending/site-list-failures.json` shows 6 failures; the passing run is under `connected/`.
- Candidates to archive: `tasks/todo.md`, `tasks/lessons.md` (empty), `status-2026-10-23.md`, `specs/.../review.md`, `fix-7.md` (all 11 items done), the 11-01 phase-5 drafts in `docs/plans/`.
- `new-recipes.md` R11-R15 are candidates only; none is built or in the spec.
- Vitest reports 262 s spent creating jsdom 116 times; a shared environment would cut suite time.

---

## 6. Suggested order

1. Fix N1 and N2, add tests for the three untested throttling codes.
2. Decide and flip `NEXT_LINK_UNVERIFIED`; update spec S2 status, Implementation Status rows, branch name, the Fix 7 stale clauses, and record the message-text classification as a host contract in FR-7.
3. Add a release gate (build, validate, size, packed probe), restore the publish deny rule, add CI.
4. Settle the working tree: commit or restore the deletions, remove the pnpm files, drop the stale probe report.
5. Probe R4 body forwarding and `SiteSetting.Get` on a live site, with N5 in the same session.
6. Owner decisions: the 25 deviation rows, AC-4.12 scope, AC-9.8 saving-state behaviour, secret environment variable coverage, PDF build off the UI thread.
7. Inspector docs, version and description, then P5.8.

---

## 7. Not covered

- `build`, `pptb-validate` and all live probes were not run in this review.
- AC-4.5 and AC-4.6 client bodies, AC-6.5 detail rendering, every AC-3.7 "Differences from Learn" entry.
- AC-7.2 combobox keyboard behaviour, AC-8.2 and AC-8.4 rendering, export dialog focus behaviour, the PDF tick glyph and font-coverage test.
- Rendered checks of layout, contrast and screen-reader output.
- Dead-export detection used word matching, so dynamic references could be missed.
- Whether v1.0.0 beta has already been published.
