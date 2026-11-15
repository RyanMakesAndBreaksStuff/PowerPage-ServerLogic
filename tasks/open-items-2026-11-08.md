# Open items inventory, 2026-11-08

Sources: four Sonnet 5.5 (medium) read-only explorers covering docs/, the trackers and reviews, src/ with tests/ and scripts/, and the validation gates. Results were merged and deduped. Source IDs are kept in brackets: D = docs, T = trackers, C = code, V = validation.

Baseline at HEAD `d87d09e`:
- Passing: `typecheck`, `lint` (0 warnings), `npm test` (115 files, 2,029 tests, 37 s) and `build`.
- Failing: `npx pptb-validate --skip-url-checks` exits 1.
- There is no CI.
- Fixed: the code findings from the 2026-11-04 supervised review and `docs/archive/fix-7.md` #1–11.

Legend:
- **Host**: needs the PPTB Desktop host (debug fork + `pptb_debug_*` MCP).
- **Site**: needs a deployed Power Pages dev site.
- **Owner**: needs an owner decision or an owner-supplied input.

---

## A. Live PPTB-host probes (S2 / RG-001…RG-006). Host required; partly scriptable via `pptb-live-probe`

Evidence home: `findings/logic/probe_findings.md`. Every row there is "Pending" as of 2026-11-01. The driver script is `scripts/s2-probe.js`. Nothing runs JSON scenarios (no `*.probe.json` exists).

| ID | Item | Code/spec anchor | Automatable | Owner input |
|---|---|---|---|---|
| A1 | `@odata.nextLink` token reaches the wire unchanged. Then flip `NEXT_LINK_UNVERIFIED`, or build the FR-7 `fetchXmlQuery` fallback (D-22) [D-01, C-02, T-02] | `src/services/pptb/dataverseRead.ts:18,147` | Partial: probe plus a CDP Network capture | Multi-page seeded site |
| A2 | Literal encoding: apostrophe/space encoded exactly once (`O%27%27Brien`) [C-03, T-03] | `dataverseRead.ts` | Partial (same capture as A1) | — |
| A3 | Real rejection shapes for 401, 403, 429, 5xx and network loss; expired sign-in; refresh-rejection recovery. `statusOf` assumes a numeric `status` [D-02, T-01, AC-7.7] | `src/services/pptb/hostErrors.ts:20` | Partial: 403 and 429 can be scripted; network drop and token expiry need setup | Restricted test user |
| A4 | `connection:*` event payload keys, unsubscribe after `off`, mid-scan switch, no-focus switch [C-04, T-05, D-03] | `createEventHub` in `pptbHost.ts` | Y: the probe fires host events | — |
| A5 | S2 second run: host version, `s2StopEvents`, env-var scenarios (current, default, missing, denied, secret), File metadata row [D-03, T-08] | `s2-probe.js` `s2Environment` | Y | — |
| A6 | Type-35 block download live: `Target @odata.type`, base64 `Data`, `FileName`/`IsChunkingSupported`, byte and UTF-8 equality with studio text (RG-003) [D-04, C-05, T-04] | `src/services/pptb/dataverseFiles.ts` | Partial | **Record ID** |
| A7 | RG-004 timings: 50-handler scan ≤30 s; export build ≤5 s; save-confirm→toast ≤5 s (AC-9.9) and ≤2 s (AC-5.11); whether the watchdog toast fires [D-05, D-06, D-19] | — | Y (except the native save dialog) | Seeded site |
| A8 | PDF `saveFile` with `Uint8Array` (only a 5-byte save is proven) [T-09] | — | Partial | — |
| A9 | `getCurrentTheme()` launch latency vs AC-1.6 light fallback (unbounded await in `main.tsx`) [T-10] | `src/main.tsx` | Y: CDP timing | — |
| A10 | Close guard: `preventClose` guard/release, save-dialog modality, focus after a failed or stale close [D-08] | — | Partial: a native dialog is hard to drive | — |
| A11 | Page smokes: Starter (Load Local Tool), Server Objects (Insert with one undo, Copy toast, Browse all/Back, 1100×780 in both themes), Inspector dev-site scan with exports checked against the screen [D-11, D-12, D-13] | — | Y: probe plus screenshots | — |
| A12 | RG-006 final `dist/` Desktop local-load smoke and package contents [D-09] | — | Partial | — |
| A13 | fix-7 #7 event disposer on the installed Insider host; rendered check of #8–11 [T-12] | — | Partial | — |

## B. Live Power Pages site probes (deployed handlers). Site required

| ID | Item | Anchor | Automatable | Owner input |
|---|---|---|---|---|
| B1 | **R4 post/put forward the whole caller body** (any column, including `@odata.bind`) to `CreateRecord`/`UpdateRecord`. There is no field allowlist; this is confirmed in the generator source. Impact (bounded by table permissions?) is unverified live [T-07] | `src/services/generators/handlers/r4.ts:150-182,230,249` | Partial: deploy plus HTTP calls | Dev site; spec call on an allowlist |
| B2 | `Server.SiteSetting.Get` on a missing setting: null or throw? R7 and R9 read settings outside `try` [T-06] | R7/R9 generators | Partial | Dev site |
| B3 | R4 bound-create probe (Contact bound to the caller's parent account). A pass becomes a spec update [D-15] | `plans/phase-08…:148` | Partial | Dev site |
| B4 | S3 SharePoint collision: two PUTs with `conflictBehavior=fail` should give 409 `nameAlreadyExists` [D-14] | `plans/phase-19…:51,256` | Partial: Graph calls | SharePoint test site |
| B5 | S4 leftovers: item 6, `CloudFlow.TriggerAsync`, R5 TripPin redirect, custom-API privilege identity [D-16] | `usage-manual.md:104` | Partial | Site and cloud flow |
| B6 | Recipe A/B parity on the live site: the PP "Recipe Behavior A/B" doc and the RG-001 multi-page site seed [D-01/D-05 prerequisites] | — | Partial | Seeded site |

## C. Hostless gaps. Fully automatable in Vitest / CI

| ID | Item | Anchor |
|---|---|---|
| C1 | **No CI.** Add a workflow running typecheck, lint, test, build, `size` and `pptb-validate` (Node ≥20.19) [V-02] | — |
| C2 | Lost local gate: the deleted `.claude/settings.json` held the Stop hook (`verify-on-stop.cjs`: `tsc -b` plus vitest), lint-on-edit, and a deny list (`npm publish`, `git reset --hard`). Restore it, or replace it with C1 [V-08] | `git show HEAD:.claude/settings.json` |
| C3 | No `verify`/`prerelease` script chaining validate, build and size before publish (`npm publish` stays manual) [V-05, T-21] | `package.json` |
| C4 | Bundle size has no budget (2.0 MiB raw, 742 KiB gzip). Also the `renderPdf` lazy-load decision (+1,066 kB) and a jsPDF-absence check for beta [V-06, D-21] | `scripts/bundle-size.mjs` |
| C5 | `scripts/` is outside lint and typecheck (`s2-probe.js`, `*.mjs`) [V-07] | `eslint.config.ts`, `tsconfig.node.json` |
| C6 | AC traceability: about 100 spec ACs are still `- [ ]` and there is no AC→test matrix. 15 ACs have no test reference: 2.5, 3.4, 3.9, 4.11, 5.7, 5.8, 5.10, 5.11, 7.7, 8.10, 9.2, 9.4, 9.5, 9.6, 9.7. Generate the matrix from test names and tag or write the tests [C-09, C-10, D-24] | `spec.md:137-374` |
| C7 | Perf tests: AC-5.11 download ≤2 s (fake host); NFR search ≤100 ms [C-09, D-19] | — |
| C8 | AC-9.9 render-budget test uses `{ retry: 1 }`, the only retry in the repo. Measure the median, re-budget, drop the retry; also check the `App.inspector.test.tsx:40` journey flake [C-08, T-28] | `src/features/inspector/report/renderPdf.test.ts:84-86` |
| C9 | AC-4.12 behaviour harness: the shared Phase 17 `node:vm` harness, Server fakes for R1–R6/R8–R10, token-rejection and transport-failure cases; R7 has 36 configurations [D-17]. Three `node:vm` suites already exist; consolidate on them | `plans/phase-17-behavior-harness.md` |
| C10 | AC-3.2 (T1) literal recipe × method × language sweep; client text is not FR-4-checked [D-18] | — |
| C11 | Accessibility automation (RG-005): keyboard route, 200% zoom, 320 px, contrast in both themes, selectable PDF text via Playwright/axe. Screen reader stays manual [D-07, T-11] | — |
| C12 | Doc link-check and stale plan checkboxes (phases 07–10, 13, 18, 22, `11-01-2026-*`, `todo.md`) [D-25, D-26, T-34]. Note: `probe_findings.md` was restored in `1669c7c`, but `10-24-2026-generator-behavior-harness.md` is still cited and missing | — |
| C13 | Probe code is now redundant: `src/probe/libraryProbe.ts`, the `--mode probe` branch in `vite.config.ts`, and the `probe:size` script. It does not ship in the app bundle [C-06, C-07] | `vite.config.ts:90,111-125` |
| C14 | Docs say `pptb-validate` isn't a dependency; it ships through `@pptb/types` (`@pptb/validate` 1.0.5). `--skip-url-checks` still runs the URL checks in 1.0.5 [V-03, V-10] | `docs/build-manual.md:145,210` |

## D. Code fixes from reviews. Automatable, goldens and tests verify

| ID | Item | Anchor |
|---|---|---|
| D1 | RecipeCombobox derived-state effect plus 2 `useCallback`s; `as unknown as` for `scrollIntoView` [T-13, T-14] | `RecipeCombobox.tsx:59-66` |
| D2 | `result as () => void` cast in the event hub [T-15] | `pptbHost.ts:111` |
| D3 | Prune: ExternalLink chain, `useActiveConnection`, variant SVGs, 3 TTFs, 3 font devDeps, `acorn-walk`, 3 icons, 9 needless exports [T-17–T-19] | `knip` |
| D4 | Dedupe generator emitters and limit constants; trim `ExportJob` fields [T-20] | generators |
| D5 | Shell, providers and title bar sit outside any error boundary [T-22] | `App.tsx:56` |
| D6 | Starter download shows the raw `error.message` [T-23] | `DownloadStarterButton.tsx:38` |
| D7 | A→B→A connection switch mid-scan can mix environments (add a generation counter) [T-24] | — |
| D8 | Logo SVG uses fixed colours, not `currentColor` [T-26] | `public/icons/logo.svg` |
| D9 | Download decodes 3 copies; 128 MiB cap; wrong oversized-file message [T-27] | `dataverseFiles.ts:17` |
| D10 | PDF edge cases: unguarded `setProperties` title, no file-name stem cap, `pdfTable` continuation drops label lines [T-29] | `renderPdf.ts:450` |
| D11 | INFO batch: shared limiter, unhandled `tool:unloaded`, busy "Cancel" label, magic `120`/`240`, rolldown warnings, `liquidCheck.ts` placement, `tsconfig.app` node types [T-28] | — |
| D12 | Unconfirmed candidates: `parseRole` ignores `active`; site list not identity-confirmed; touch, IME and caret in the combobox and editor; slug re-escape [T-30] | triage first |
| D13 | `tools/minimatch-compat` shim: remove once `eslint-plugin-jsx-a11y` supports minimatch ≥11 [C-12] | periodic check |

## E. Owner decisions and manual-only items

| ID | Item |
|---|---|
| E1 | `pptb-validate` fails because `repository` and `readmeUrl` return 404 (private repo, or no README on `main`), and `website` is unset. Publish the repo or merge to main [D-10, V-01, T-21] |
| E2 | Was the deletion of `.claude/settings.json`, `.claude/CLAUDE.md` and `.claude/integrations.md` intended? (`integrations.md` was an empty table.) [V-08] |
| E3 | Untracked `.omc/`, `full-review/` and `tasks/*.md`; deleted `phasse5plan.md` and `spec3check.md` (superseded, nothing lost) [V-09] |
| E4 | Real dev-org captures committed (policyguarddev host, GUIDs) and `.scratch/` tracked. Untrack and scrub, and decide on a history rewrite [T-25] |
| E5 | About 25 spec deviations awaiting a spec change or a code fix (pills vs recipe filter, FR-11 roles, `Finding.category`, FR-7 allowlist check, FR-8 Not-scanned, F26 scope…) [D-23] |
| E6 | AC-9.8: a job in `saving` shows both "cancelled" and "exported"; the watchdog fires after the dialog is closed [D-20] |
| E7 | Severity standard (rule vs consequence) for review findings [T-16] |
| E8 | Release gating: beta ships Starter and Objects only; Inspector is unreleased; the description and README omit the Inspector [C-13, T-21] |
| E9 | R11–R15 recipe candidates; is R11 (preview) in scope; is R15 a recipe or a note [T-31, T-32] |
| E10 | Agent debug access proposal (CDP port / MCP tools): no recorded decision [T-33] |
| E11 | Manual-only: screen reader pass, 3-maker timed walkthrough (median ≤5 min), `npm publish` [D-07, D-11] |
