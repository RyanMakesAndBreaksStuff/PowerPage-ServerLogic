<!-- Supervised review of src/ at HEAD 8dff4f1a (refine-app), run 2026-11-04 with the supervised-review skill v1.2.1,
     grounded on the typescript-react-reviewer skill. Shareable page: https://claude.ai/artifact/7mEXKAFxDHXYTBQfzGWVG7
     This document records findings only; no source was changed by the audit. -->

# Supervised Review — PowerPage-ServerLogic (`src/`)

Lead: this session (Claude, acting as lead engineer). Reviewers: five Sonnet 5.5 subagents (effort high), one per domain. Skeptics: five Opus 5.5 subagents (effort high), one isolated round per domain. Grounding skill for candidate detection: the user-supplied `typescript-react-reviewer` skill (SKILL.md, checklist.md, antipatterns.md, react19-patterns.md). Audit contract: the user-supplied `supervised-review` skill v1.2.1 and its references.

## A. Project-as-is

- **Status: complete** under SKILL.md's completion rule, with recorded coverage limits. All five scoped domains completed their seven passes and an isolated skeptic round; every challenge has a decision (no DEFER); no material verification remains open that could change a confirmed finding's admission, severity, domain or fix. The limits below are coverage limits, not unresolved verifications.
- **Source snapshot:** repository `/home/user/PowerPage-ServerLogic`, branch `refine-app`, HEAD `8dff4f1a2d55f085f7a98a16e19f72656dd52808`, working tree clean at scope time and unchanged throughout (no source was edited by any worker; all scratch work lived in the session scratchpad). The two commits after `309eb14` (the owner's last recorded gate run) touch only docs; `git diff --stat 309eb14 HEAD -- src tests eslint.config.ts package.json` is empty.
- **Stack, entry points, architecture:** a Power Platform ToolBox (PPTB) tool. TypeScript strict (TS 6.0, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), React 19 with the React Compiler, Vite 8 producing one IIFE bundle (`fixHtmlForPPTB`, no code splitting), Vitest + React Testing Library, ESLint 9 flat config (typescript-eslint strictTypeChecked + stylistic, react-hooks, react-refresh, jsx-a11y, zero warnings). Entry `index.html` → `src/main.tsx` (reads the host theme, then `createRoot`) → `src/app/App.tsx` (HostContext, NotifyProvider, ConnectionProvider, ViewContext, InspectorScope, shell, three pages behind `PageErrorBoundary`). Host globals are wrapped once in `src/services/pptb/` (retrieval-only Dataverse access: `queryData` plus the two file-download actions). Features: Logic Starter (`src/app/starter-session`, `src/features/starter`), Server Objects (`src/features/server-objects`), Logic Inspector (`src/app/inspector-site`, `src/features/inspector`), pure generators and catalogue (`src/services/generators`, `src/services/catalogue`), pure libraries (`src/lib`). Spec of record: `docs/specs/001-server-logic-starter-inspector/spec.md` v4.3.0.
- **Requested scope:** everything under `src/` (316 files; 15,081 non-test TS/TSX lines, 20,765 test lines). **Exclusions:** 13 font binaries and licence texts under `src/assets/fonts/` were excluded from content review (listed in B); their references were still checked. **Execution constraints:** the skill's audit-scope paragraph (no source edits, no fixes, no dependency installation, no configuration changes). `node_modules/` is absent, so `npm run typecheck`, `npm run lint`, `npm test` (Vitest) could not be run by anyone in this audit and no reviewer claims a reproduced test result. The `codegraph` CLI is not on PATH, so the repository's `.codegraph/` index was not used; ripgrep 14.1.0 was used instead.
- **Checks the lead executed:** `npm audit --omit=dev --json` from `package-lock.json` (no install): exit 0, 0 vulnerabilities across 39 production dependencies (dev dependencies not audited). **Owner-recorded, not reproduced:** at `309eb14` the owner recorded `npm run typecheck` exit 0, `npm run lint` exit 0 and `npm test` 115 files / 2000 tests passed (`docs/phase-5/evidence/p5-7/execution.md:104-110`); `src` is unchanged since.
- **Missing coverage and how to resume:** (1) Install dependencies in an environment where that is permitted and run `npm run typecheck && npm run lint && npm test`; this is the only way to confirm the PDF layout tests, the client/package golden comparisons and lint on the React Compiler rules in this audit's own evidence. (2) Live-site checks named in Section G (R4 `@odata.bind` behaviour, `Server.SiteSetting.Get` with Key Vault-backed settings, how an empty `ServerLogic/AllowedDomains` row is stored, `getCurrentTheme` launch latency, PDF title metadata with non-Latin-1 names). (3) Test bodies were read by title only in several domains (listed per domain in C); the audit's conclusions rest on full reads of the non-test source. (4) `starter.css` and `serverObjects.css` were not read, so the visual/layout ACs (AC-4.1, AC-6.7, AC-6.8) are unverified.

## B. Domain Groups

| Domain | Path scope | Rationale | Files | Non-test lines | Reviewer (status) | Skeptic (status) |
|---|---|---|---|---|---|---|
| host-and-shell | `src/services/pptb/`, `src/app/*` (except `starter-session/`, `inspector-site/`), `src/app/shell/`, `src/app/theme/`, `src/components/`, `src/types/`, `src/test/`, `src/probe/`, `src/assets/`, `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/skeleton.test.ts` | The host adapter is the tool's security boundary; the entry, providers, shell and shared primitives form one behaviour (launch, theme, connection, notifications) | 103 (90 reviewed, 13 excluded) | 3,229 | Sonnet 5.5 (completed) | Opus 5.5 (completed, 8 challenges) |
| starter-and-objects | `src/app/starter-session/`, `src/features/starter/`, `src/features/server-objects/`, `src/lib/` | Logic Starter session + page, Server Objects page and the pure code-analysis/text libraries they drive | 67 | 2,729 | Sonnet 5.5 (completed) | Opus 5.5 (see E) |
| generators-and-catalogue | `src/services/generators/`, `src/services/catalogue/` | Pure `(model) => string` generators for handlers, client calls, README/checklist and zip, plus the recipe and Server.* catalogue | 81 | 4,177 | Sonnet 5.5 (completed) | Opus 5.5 (completed, 7 challenges) |
| inspector-session-and-scan | `src/app/inspector-site/`, `src/features/inspector/scan/`, `src/features/inspector/model/` | Inspector state store, scan orchestration, Dataverse queries/parsing, rule model | 29 | 2,236 | Sonnet 5.5 (completed) | Opus 5.5 (completed, 5 challenges) |
| inspector-ui-and-report | `src/features/inspector/*.tsx|*.ts|*.css`, `src/features/inspector/export/`, `src/features/inspector/report/` | Inspector page components, export dialog, Markdown/PDF report generation | 36 | 2,710 | Sonnet 5.5 (completed) | Opus 5.5 (completed, 7 challenges) |

File accounting: 316 files under `src/`; 316 assigned; 0 unowned; 0 duplicated owners (verified by the lead with `find`/`comm` before dispatch; the ownership table is `ownership.tsv` in the audit work folder, and each domain's concrete file list was passed in its packet). Test files and golden fixtures are owned by the domain of their subject and were reviewed as evidence of promised behaviour. Entry points and dependencies to trace were named in each packet (App.tsx → providers → pages; host adapter consumers; generator callers; store consumers).

Excluded files (13, all in host-and-shell):
- `src/assets/fonts/DMSans_400Regular.ttf` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/DMSans_500Medium.ttf` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/DMSans_700Bold.ttf` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/JetBrainsMono_400Regular.ttf` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/OFL-DMSans.txt` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/OFL-JetBrainsMono.txt` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/OFL-SpaceGrotesk.txt` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/SpaceGrotesk_400Regular.ttf` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/SpaceGrotesk_500Medium.ttf` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/SpaceGrotesk_700Bold.ttf` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/jetbrains-mono-latin-400-normal.woff2` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/jetbrains-mono-latin-500-normal.woff2` (binary or licence text; content not reviewed; references checked by the lead)
- `src/assets/fonts/jetbrains-mono-latin-700-normal.woff2` (binary or licence text; content not reviewed; references checked by the lead)

Packet correction recorded during the run: the starter-and-objects packet said `browserChecks.ts` is consumed by the Inspector scan; the reviewer showed (and the lead confirmed with `rg`) that the Inspector imports only `detectConnectorUse`/`exportedFunctionNames` from `structure.ts`, while `runBrowserChecks` is imported by `deriveStarter.ts` and the generators' `tutorial.testkit.ts`.


## C. Domain Findings (raw)

Each domain's reviewer result is reproduced verbatim as returned (no malformed results were received; no correction requests were needed; each worker used its single result, so no recovery action was consumed). The lead's admission note for each domain follows its raw result. Corrections agreed in the skeptic rounds are NOT applied to these raw texts; they are recorded in E and F and reflected in G.


### C.1 host-and-shell — raw reviewer result (Sonnet 5.5)

#### Domain review: host-and-shell

Reviewer: Domain Reviewer (Sonnet). Method: source-verified reading plus ripgrep. No test, typecheck, lint or audit command could run (node_modules absent). No claim below is "reproduced".

##### Coverage record

- Domain: `host-and-shell`. Snapshot: git branch `refine-app`, HEAD `8dff4f1a2d55f085f7a98a16e19f72656dd52808`. `git status --short` was clean when last checked.
- Assigned: 103 files. Reviewed: 90. Excluded: 13 (binary fonts and licence text). Blocked/unreviewed: 0.

###### Reviewed, read in full (non-test source)
- Host adapter: `src/services/pptb/pptbHost.ts`, `dataverseRead.ts`, `dataverseFiles.ts`, `hostErrors.ts`, `host.types.ts`, `fakeHost.ts`.
- Entry, providers, shell: `src/main.tsx`, `src/app/App.tsx`, `HostContext.ts`, `ConnectionProvider.tsx`, `NotifyProvider.tsx`, `PageErrorBoundary.tsx`, `useActiveConnection.ts`, `useHostTheme.ts`, `useNotify.ts`, `useView.ts`, `releasedPages.ts`, `CopyButton.tsx`, `ExternalLink.tsx`, `src/app/shell/{TitleBar,TopTabs,SitePill,SiteCombobox}.tsx`, `connectionLabel.ts`.
- Shared UI: `src/components/{ToastStack,Modal,Button,Checkbox,DisabledReason,Icon,Pill,PillGroup,Ring,StatusBadge,Tile}.tsx`, `useDisabledReason.tsx`, `usePrefersReducedMotion.ts`, `checkStatusBadge.ts`, `icons.ts`.
- Types, probe, test infra: `src/types/{http,inspector,recipe,report}.ts`, `src/probe/libraryProbe.ts`, `src/test/{setup,deferred,fixedDeps,gatedHost,inspectorWorld}.ts`, `src/vite-env.d.ts`, `src/index.css`.
- CSS: `src/app/theme/tokens.css` and `src/app/shell/shell.css` read in full. `src/components/primitives.css` and `src/app/shell/siteCombobox.css` read in part (toast, combobox list, grep for colours, z-index and motion).
- `src/assets/fonts/fonts.css` read in full.

###### Reviewed as test evidence
- Read substantially: `src/skeleton.test.ts`, `src/probe/libraryProbe.test.ts`, `src/test/toolchain.test.tsx`. In `src/services/pptb/pptbHost.test.ts` I read the harness (lines 1-130) and the retrieval-only block (640-733). From `src/app/shell/SitePill.test.tsx` I read lines 30-70, and from `src/app/App.test.tsx` lines 1-60.
- Case titles and describe blocks only, bodies not read: the remaining tests in `src/services/pptb/` (`dataverseRead*.test.ts`, `dataverseFiles.test.ts`, `fakeHost.test.ts`), `src/app/*.test.tsx`, `src/app/shell/*.test.*`, `src/app/theme/tokens.test.ts`, `src/components/*.test.tsx`, `src/test/gatedHost.test.ts`.
- Not read at all: `src/types/contracts.test.ts`, `src/app/releasedPages.test.ts`, `src/app/shell/connectionLabel.test.ts`. A test I only skimmed cannot rule out a masked defect.

###### Excluded (binary or licence text, per packet)
`src/assets/fonts/DMSans_400Regular.ttf`, `DMSans_500Medium.ttf`, `DMSans_700Bold.ttf`, `JetBrainsMono_400Regular.ttf`, `SpaceGrotesk_400Regular.ttf`, `SpaceGrotesk_500Medium.ttf`, `SpaceGrotesk_700Bold.ttf`, `jetbrains-mono-latin-400-normal.woff2`, `jetbrains-mono-latin-500-normal.woff2`, `jetbrains-mono-latin-700-normal.woff2`, `OFL-DMSans.txt`, `OFL-JetBrainsMono.txt`, `OFL-SpaceGrotesk.txt`.
Reference search only (not a content review): three TTFs have no source reference; see Unverified candidates U3.

###### Supporting files read (outside the assigned list)
- `docs/specs/001-server-logic-starter-inspector/spec.md`: FR-1, FR-12, AC-1.6, AC-7.6 and the Phase 5 addendum, via grep and `sed` ranges.
- `index.html`, `vite.config.ts` (lines 95-150), `tsconfig.app.json`, `package.json` (manifest keys).
- `src/features/inspector/scan/queries.ts`, plus grep-level reads of `src/app/inspector-site/*`, `src/features/*` and `docs/` to establish reachability only.
- External: PPTB Events API docs (https://docs.powerplatformtoolbox.com/tool-development/api-reference/events) via a Firecrawl search. They confirm that only `connection:created`, `connection:updated` and `connection:deleted` exist.

##### Commands run

Every Bash call below returned exit 0 unless noted. Where I piped through `head`, `cut` or `awk`, the status I saw is the pipeline's last command, not ripgrep's own status. For those, "no matches" is read from empty output.

| # | Command (abbreviated) | Result |
|---|---|---|
| 1 | Read of packet-base.md, packet-reviewer-extra.md, files-host-and-shell.txt (Read tool) | ok |
| 2 | `cat` of domain-reviewer.md, audit-passes.md, severity-guide.md, SKILL.md, checklist.md (the last piped through `head -300`) | 0 |
| 3 | `wc -l` over the assigned non-binary files; `git rev-parse HEAD` | 0; HEAD 8dff4f1a... |
| 4 | `cat -n` of the six `services/pptb` sources | 0 |
| 5 | `cat -n` of `main.tsx`, `App.tsx`, `HostContext.ts`, `ConnectionProvider.tsx`, `NotifyProvider.tsx`, `PageErrorBoundary.tsx` | 0 |
| 6 | `cat -n` of the app hooks, shell components, `types/http.ts`, `index.css`, `vite-env.d.ts` | 0 |
| 7 | `cat -n` of the `components/` sources | 0 |
| 8 | `cat -n` of `types/{inspector,recipe,report}.ts`, `probe/*`, `fonts.css`, `test/*` | 0 |
| 9 | `rg` for importers of the probe, `fakeHost`, font names, `font-family` | 0 (matches) |
| 10 | `sed` of `vite.config.ts` and `pdfFonts.ts`; `rg` for unreferenced fonts; `rg probe` in package.json and tsconfig*.json | 0 |
| 11 | `rg` for `queryData(`, `events.on/off`, `window.*API` and `toolboxAPI.` outside `services/pptb`, `alert(`, `innerHTML`, `eval(`, `fetch(`, storage | 0 (no unsafe-sink hits in domain files) |
| 12 | `rg` for `orderBy\|pageSize` and `queryAll(` consumers | 0 |
| 13 | `grep -n` of the spec for `connection:`, AC-1.6, AC-7.6, FR-12, FR-5, FR-1 | 0 |
| 14 | `sed` ranges of spec FR-1 (377-400) and FR-12 (842-870) | 0 |
| 15 | `grep -n -E "^\s*(it\|describe)\("` over the service and UI test files | 0 |
| 16 | `rg` for consumers of shared components and symbol counts per exported name | 0 |
| 17 | `rg` for `useActiveConnection(`, `HandlerFunction`, `FILE_ACTIONS`, `preventClose` | 0 |
| 18 | `sed` of `siteCombobox.css` and `primitives.css`; `grep` for colours, motion, z-index | 0 |
| 19 | `rg` for `autoFocus`, `.focus()`, `<form`, `type="submit"` | 0 |
| 20 | `rg` for `https?://\|setTimeout\|setInterval`, `catch`, `TODO\|FIXME\|stub` over domain files | 0 (no TODO/FIXME/stub hits) |
| 21 | Loop `rg -l -w <sym>` for every export in domain files, listing exports with 0 non-test importers | 0 |
| 22 | `rg -n "learnUrl\|extraUrls\|ExternalLink\|openExternal"`, `<a\b`, `target=`, spec grep for "Learn link" | 0 |
| 23 | `rg "Refused host operation\|FILE_ACTIONS"` over `src` and `tests` | rg 0; matches only in `pptbHost.ts` (no test) |
| 24 | `cat index.html`; `grep` manifest keys in package.json | 0 |
| 25 | `sed -n` for the cited line numbers | 0 |
| 26 | Firecrawl search of the PPTB Events API docs (not a shell command) | ok, docs confirm three `connection:*` events |
| 27 | One call used the lowercase tool name `bash` | error "No such tool available" (case-sensitive name). Re-run as `Bash`, exit 0 |
| 28 | `ls -la src/assets/fonts; ls public` | exit 2 because `ls public/licenses` does not exist. The font listing printed correctly |

Blocked checks (not run, per packet): `npm run typecheck`, `npm run lint`, `npm test`, `npm audit`. Nothing here claims those pass.

##### Coverage table

| Pass | Status | Evidence inspected / check result | Limitation or N/A reason |
|---|---|---|---|
| 1 WIRING | checked | Traced `index.html` to `main.tsx` (theme first, then `createRoot`) to `App.tsx` to HostContext, NotifyProvider, ConnectionProvider, ViewContext, InspectorScope and the three Panels behind PageErrorBoundary. The event hub (`createEventHub`) registers once on first subscriber, routes on `payload.event`, and disposes on last unsubscribe or `pagehide` via the returned disposer, with `events.off(hub)` only as a fallback. This matches FR-12 and spec line 1193. `ConnectionProvider` re-reads on connection events, window focus and visibility. `useHostTheme` re-reads on `settings:updated`, focus and visibility. No host global is used outside `services/pptb/`. | Cannot run the app or tests. ExternalLink and `useActiveConnection` have no production caller (see findings). |
| 2 ERROR HANDLING | checked | `hostCall` turns missing, throwing or rejecting host members into `HostCallError` and logs name and status only. `toHostReadError` maps 401/403/404/429/5xx to plain messages. `withRetry` retries 429/5xx at 1/2/4 s and checks the abort signal. `fetchAllPages` keeps `partialRows`. `NotifyProvider` falls back to an in-tool toast when `host.notify` rejects, and a failing fallback never calls the host again. `CopyButton` and `ExternalLink` surface errors through `notify`. `console.error` calls in domain files log error names only. | Real PPTB error shapes (RG-002) are not verifiable offline; spec records them as open. |
| 3 COMPLETENESS | checked | Checked FR-1 (notify and fallback, 5 s auto-hide, role=status/alert, warning behaves as error), AC-1.6 (theme at launch, focus, visibility, `settings:updated`), AC-7.6 (id+URL identity, last confirmed kept on rejected read), FR-12 (`events.on` once, minAPI 1.2.7 and `connections` min 0 max 1 in package.json). One gap: the refusal branch of the `execute` guard is not covered by any test (finding host-and-shell-001). | Live PPTB behaviour (nextLink on the wire, event payloads) is open per spec; `NEXT_LINK_UNVERIFIED = true` is a documented, owner-approved fail-closed gate, not a defect. |
| 4 DEAD CODE | checked | Computed, for every export in domain files, the count of non-test importers. Two items are demonstrably unused in production (host-and-shell-002, -003). `src/probe/libraryProbe.ts` is not dead: it is the entry of `vite build --mode probe` (`vite.config.ts` lib entry, `package.json` `probe:size`, `tests/buildShape.test.ts`). Type-only and props-type exports with no importers were not treated as dead (public prop types). | `vite`/`knip`-style analysis unavailable; conclusion rests on ripgrep across `src` and `tests`. |
| 5 BLOAT | checked | No demonstrated divergence risk. `NoticeType` (host.types.ts) and `ToastType` (ToastStack.tsx) are the same four-member union declared twice, but `NotifyProvider` spreads a `Notice` into a `ToastItem`, so `tsc` would fail if they diverged; not admitted. `skeleton.test.ts` duplicates signature checks that `tsc` already enforces, but it is a deliberate pin and not demonstrably harmful. | None. |
| 6 HARDCODING | checked | Retry delays (1/2/4 s), `MAX_PAGE_SIZE` 5000, block size 4 MiB, `FILE_MAX_BYTES` 128 MiB, toast timings (5 s, 150 ms) and the fallback labels are protocol or spec constants (FR-1, FR-7, Learn). Non-test domain files contain no URL literals; test fixtures use `example.crm.dynamics.com`. No credentials. | None. |
| 7 SECURITY | checked | Adapter contract: `queryData` for reads; `execute` only through `FILE_ACTIONS` guard (`pptbHost.ts:142`) with call sites in `dataverseFiles.ts` hard-coding `operationType: 'action'` and the two names; `create/update/delete/associate/*Multiple`, `powerplatformAPI`, `settings` are never touched (grep, and the Proxy test at `pptbHost.test.ts:642`). Query builder validates entity set, select columns (`^[A-Za-z_][A-Za-z0-9_]*$`), page size 1-5000, rejects `&`, `#` and control characters in `$filter`/`$orderby`; no `$top`; `Prefer: odata.maxpagesize=N` is sent on every page; next links must start with `<entitySet>?` after `/api/data/vX/`. File refs validate names and GUID. No `fetch`, `eval`, `new Function`, `innerHTML`, `dangerouslySetInnerHTML`, `alert`, storage, or token handling in domain files. `openExternal` only accepts http(s). Notifications and logs carry no message, body or URL. | Not a penetration test. `npm audit` blocked. Behaviour of the real host on odd paths unverifiable. |

##### Findings

Sorted by severity, then pass.

| ID | Severity | Pass | File:Line | Problem | Evidence | Fix and verification |
|---|---|---|---|---|---|---|
| host-and-shell-001 | WARNING | 7 SECURITY (secondary 3 COMPLETENESS) | `src/services/pptb/pptbHost.test.ts:726` (guard under test: `src/services/pptb/pptbHost.ts:142-144`) | Trigger: a maintenance change that removes or weakens the runtime `FILE_ACTIONS` check in `createPptbHost`. Impact: the project's top rule (retrieval only; "the adapter rejects any other operation name at runtime") has no failing test. The test named "refuses to execute any operation other than the two download actions" only runs the normal download path and asserts the names that were sent are the two allowed ones. It never calls the injected `execute` with a disallowed name, so the "Refused host operation." branch is never executed. The `files.execute` closure is also unreachable from the public `PptbHost` API (its only caller, `downloadColumnContent`, hard-codes both names), so no public-API test can reach it. | Source-verified. `rg "Refused host operation\|FILE_ACTIONS" src tests` matches only `pptbHost.ts:128,142,143`. `pptbHost.test.ts:726-731` comment says "prove no other name can be sent" and asserts only allowed names. `dataverseFiles.test.ts:200` ("sends only the two download actions") likewise tests only the normal path. Removing lines 142-144 would leave every test green (this is a reading of the tests, not a mutation run). | Extract the guard so it is testable (for example `createFileExecutor(api: { execute })` exported from `pptbHost.ts` or `dataverseFiles.ts`) and add a test that calls it with `operationName: 'CreateRecord'` (and with `operationType: 'function'`) and expects a `HostReadError` and zero calls to `window.dataverseAPI.execute`. Optionally also check `operationType === 'action'` in the guard, to match the rule text. Verify with `npx vitest run src/services/pptb/pptbHost.test.ts`, then temporarily delete the guard and confirm the new test fails. |
| host-and-shell-002 | PRUNE | 4 DEAD CODE | `src/app/ExternalLink.tsx:10` | `ExternalLink` has no production render site, so `PptbHost.openExternal` and its `isHttpUrl` path (`pptbHost.ts:184-189`), plus the fake's `openExternal` behaviour, are reachable only from tests. Trigger: none today; it is unused weight and extra surface. Caveat for the owner: FR-1 mandates this mechanism for any external link, and old plans (phase-23, `docs/plans/11-01-2026-phase-5-session-export.md:1683`) intended a Learn link in the finding detail that was not built. | Source-verified. `rg "<ExternalLink\|ExternalLink" src -g '!*.test.*'` finds only its own definition. `rg "<a[ >]\|target=" src -g '!*.test.*'` finds only the anchor inside `ExternalLink.tsx:26`. `rg "learnUrl\|extraUrls" src -g '!*.test.*'` shows the Learn URLs are consumed only by `readme.ts:103-104` and `snippets.ts:52-53` (generated text), never rendered. No AC requires a clickable link in the UI (spec AC-3.3 and AC-3.10 require comments and README text). Not in the bundle, because nothing imports the component. | Owner decision first: either remove `ExternalLink.tsx`, `ExternalLink.test.tsx`, `PptbHost.openExternal`, the fake's `openExternal`/`setOpenExternal`, and the related cases in `pptbHost.test.ts` and `fakeHost.test.ts`, or keep and record it as deliberate FR-1 infrastructure. Verify with `rg ExternalLink\|openExternal src` returning nothing and `npm run typecheck && npm test`. |
| host-and-shell-003 | PRUNE | 4 DEAD CODE | `src/app/useActiveConnection.ts:48` | `useActiveConnection()` (confirmed connection or null) has no production caller. The app reads connection state through `useConnectionState()` (`TitleBar`, `SitePill`, `InspectorPage`, `InspectorSessionProvider`). The only caller is the `ShowLegacy` helper in `ConnectionProvider.test.tsx:36-39`, in a case literally titled "keeps the legacy hook null until a connection is confirmed". | Source-verified. `rg "useActiveConnection\(" src` returns `useActiveConnection.ts:48` and `ConnectionProvider.test.tsx:39` only. It is an in-app hook, not a package export, so there are no outside consumers. | Delete lines 47-51 of `useActiveConnection.ts`, delete `ShowLegacy` and the "legacy hook" case in `ConnectionProvider.test.tsx`, and keep the unused `Connection` import only if still needed. Verify with `npm run typecheck && npx vitest run src/app/ConnectionProvider.test.tsx`. |
| host-and-shell-004 | INFO | 2 ERROR HANDLING (project rule typescript.md) | `src/services/pptb/pptbHost.ts:111` | `(result as () => void)()` is a type assertion on a host return value that is only known to be `typeof 'function'`. `.claude/rules/typescript.md` forbids `as` casts used to silence errors and requires narrowing `unknown` with a guard. Impact is limited to the disposer path (the call sits inside `detach`'s try/catch, line 95-100): if the host returned a callable that is not a nullary disposer, it would be invoked with the wrong contract. Spec line 1193 states the runtime returns a disposer, so no failure is demonstrated. | Source-verified. `pptbHost.ts:108-113` assigns `disposeHost` from `typeof result === 'function'` then casts at 111. ESLint could not run, so I cannot say whether `no-unsafe-call` or an assertion rule flags it. | Replace the cast with a small guard, for example `function isDisposer(value: unknown): value is () => void { return typeof value === 'function'; }`, or keep the call but comment why the narrowing is safe. Verify with `npm run lint` and `npx vitest run src/services/pptb/pptbHost.test.ts` (existing disposer cases at lines 381-430). |

##### Unverified candidates

These are not findings.

- U1. No error boundary around the providers and `TitleBar`.
  - Location: `src/app/App.tsx:70-101`. Only the three page Panels sit inside `PageErrorBoundary`.
  - Why it matters: `TitleBar`, `SitePill`, `StarterSessionProvider` and `InspectorSessionProvider` render outside any boundary, so a render error there would unmount the whole tree. `main.tsx` logs the error name via `onUncaughtError` and shows nothing.
  - Missing evidence: a concrete trigger. I found no render path that throws on valid input.
  - Check needed: write a test that makes `useInspector()` or a provider throw, and look at the DOM; or confirm with the owner whether a shell-level fallback is wanted (`.claude/rules/react.md` says to wrap feature areas).
- U2. `main.tsx` waits on `host.getTheme()` before the first render, with no timeout.
  - Location: `src/main.tsx:21-38`. A rejected call is handled (light theme). A call that never settles would leave a blank window.
  - Missing evidence: whether `toolboxAPI.utils.getCurrentTheme()` can hang in PPTB 1.2.7 or later.
  - Check needed: observe the call on a live PPTB host while the host is busy or loading. If it can hang, race it with a short timeout and fall back to light.
- U3. Three TTFs with no source reference: `src/assets/fonts/DMSans_500Medium.ttf`, `SpaceGrotesk_400Regular.ttf`, `SpaceGrotesk_500Medium.ttf` (about 230 KB tracked).
  - Evidence: `rg` finds them only in a phase-00 plan doc. They are not imported, not in `fonts.css`, and no test enumerates the directory (`pdfFonts.ts` and the probe import only DMSans 400/700, SpaceGrotesk 700, JetBrainsMono 400).
  - Not admitted as PRUNE because binaries are excluded from this review and licence or acquisition-script implications (`scripts/`, `public/licenses`) were not checked.
  - Check needed: confirm no `scripts/` file or licence manifest lists them, then delete.
- U4. ESLint `react-hooks` React Compiler rules on `ConnectionProvider.tsx:25-76` (`load()` calls `setPending(true)` from the effect body; `reload.current` is assigned in the effect). Lint is blocked, so I cannot tell whether `npm run lint --max-warnings=0` accepts it.
  - Check needed: `npm run lint` once dependencies are installed.

##### Cross-domain notes for the lead (not findings)

- `src/features/inspector/scan/queries.ts` builds filters with `odataString`/`odataGuid` and `queries.test.ts` runs `buildQueryPath` on them, so the fake host's lack of query validation (it ignores `$select`/`$filter`) is compensated for the Inspector's four query shapes. A new consumer that bypasses that test would not be validated by `createFakeHost`.
- `src/app/inspector-site/inspectorSession.ts:138,174` is the only production caller of `preventClose` and `releasePreventClose`; both ignore failures by design (spec line 1229).
- `NEXT_LINK_UNVERIFIED = true` (`dataverseRead.ts:18`) fails a read whose last page is exactly `pageSize` (5000) rows with no next link. This is documented in the spec (Implementation Status, RG-001) and is owner-approved. It is only a risk for a table with exactly 5000 rows.


#### Lead admission note for host-and-shell (pre-skeptic)

##### Plan v1 slice — domain host-and-shell

Lead consolidation note: the reviewer returned 1 WARNING, 2 PRUNE, 1 INFO and 4 unverified candidates. The lead re-checked: pptbHost.test.ts:726-731 (the "refuses" test only exercises the normal download path; `rg "Refused host operation|FILE_ACTIONS" src tests` matches only pptbHost.ts), `rg ExternalLink src --glob '!*.test.*'` (definition only), `rg "useActiveConnection\(" src` (definition + ConnectionProvider.test.tsx:39 only; the other exports of that module — useConnectionState, connectionKey, useRefreshConnection, ConnectionState — are used in production), and pptbHost.ts:108-113 (the `as () => void` cast). All four findings are admitted with original IDs and no changes.

Lead's open question for the skeptic on host-and-shell-001: the File:Line points at a test file while the reviewer procedure says File:Line must identify the source of the defect; and the guard at pptbHost.ts:142-144 is defence in depth behind a closure whose only caller (`dataverseFiles.ts`) hard-codes the two names and whose `FileAction` type restricts `operationName` statically. The lead wants the skeptic's view on whether "demonstrated maintenance hazard" (WARNING) is established, or whether this is INFO or an unverified candidate.

Plan v1 slice (admitted):
- host-and-shell-001 (WARNING, pass 7) — FILE_ACTIONS refusal branch untested and unreachable from the public API
- host-and-shell-002 (PRUNE, pass 4) — ExternalLink.tsx has no production render site (owner decision; FR-1 mandates the mechanism)
- host-and-shell-003 (PRUNE, pass 4) — useActiveConnection() hook has no production caller
- host-and-shell-004 (INFO, pass 2) — pptbHost.ts:111 `as () => void` cast against typescript.md

Unverified candidates U1–U4 stay outside the confirmed list. The full raw reviewer result is review-host-and-shell.md next to this file; it is the authoritative slice and coverage record.


### C.2 starter-and-objects — raw reviewer result (Sonnet 5.5)

#### Domain review: starter-and-objects

Reviewer role: Domain Reviewer (Sonnet). Repository HEAD per packet: 8dff4f1a2d55f085f7a98a16e19f72656dd52808 (branch `refine-app`). No repository file was edited; no package was installed. All finding statements are **source-verified** unless a scratch replica is named.

##### 1. Coverage record

###### Reviewed files (67 assigned, every one accounted for)
Read in full (source): `src/app/starter-session/{starterSession.types,starterReducer,applyTextChanges,deriveStarter,StarterSessionProvider,starterDeps,fakeStarterDeps,useStarterSession}.ts(x)`; `src/features/starter/{StarterPage,code/CodeEditor,code/ServerPane,code/ClientPane,code/lineDecorations,code/codeTheme,code/codePanes.css,download/DownloadStarterButton,inputs/StarterInputs,inputs/RecipeCombobox,inputs/starterOptions,inputs/PermissionNote}`; `src/features/server-objects/{ServerObjectsPage,ObjectDetail,InsertButton,ContextColumn,insertion,objectList}`; `src/lib/{classNames,text,slug,minimalChange,ringGeometry,emptyModule}.ts`; `src/lib/code-analysis/{structure,structureAst,structureInsert,browserChecks,codeAnalysis.types}.ts`.

Test and harness files read in full: `CodeEditor.test.tsx`, `ServerPane.test.tsx`, `starterTestHarness.tsx`, `objectsTestHarness.tsx` (first 60 lines, the rest is the same shape). Browser-checks performance block (`browserChecks.test.ts` lines 214-248) read.

Partially read (test names / `it(` titles only, bodies not read): `starterReducer.test.ts`, `deriveStarter.test.ts`, `StarterSessionProvider.test.tsx`, `RecipeCombobox.test.tsx`, `slug.test.ts`, `insertion.test.ts`, `structure.insertion.test.ts`, `ServerObjectsPage.test.tsx`, `StarterPage.test.tsx`, `DownloadStarterButton.test.tsx`, `browserChecks.test.ts` (other than the perf block).

Not opened (listed so the account is complete; their titles were not inspected either): `applyTextChanges.test.ts`, `lineDecorations.test.ts`, `ClientPane.test.tsx`, `objectList.test.ts`, `starterOptions.test.ts`, `classNames.test.ts`, `text.test.ts`, `minimalChange.test.ts`, `ringGeometry.test.ts`, `browserChecks.table.test.ts`, `structure.connector.test.ts`, `structure.members.test.ts`, `structure.names.test.ts`.

CSS: `codePanes.css` read in full. `starter.css` (254 lines) and `serverObjects.css` (385 lines) were NOT read in full; they were only searched for `url(`, `@import`, `http` (no matches, rg exit 1). Layout/visual ACs (AC-4.1 minimum-viewport heights, AC-6.7/6.8 24 px target sizing) are therefore unverified by this review.

Excluded: none. Blocked: none by file; see Pass limits below for blocked checks.

###### Supporting files read (labelled, not owned)
`src/app/App.tsx`, `src/main.tsx`, `src/app/PageErrorBoundary.tsx`, `src/app/useNotify.ts`, `src/app/CopyButton.tsx`, `src/components/Button.tsx`, `src/services/generators/client/client.ts` (lines 1-60), `src/services/generators/package/buildPackageFiles.ts` (1-80), `src/services/catalogue/recipes.ts` (`getRecipe`, `methodEnabled`), `src/services/catalogue/serverObjects.ts` (1-40 + multi-line-template search), `src/services/pptb/host.types.ts` (SaveResult), `src/types/http.ts`, spec `docs/specs/001-server-logic-starter-inspector/spec.md` (FR-2, FR-2a, FR-3 head, FR-4, FR-5, FR-5a, FR-6, AC-2.x, AC-3.x, AC-4.x, AC-5.x, AC-6.x, amendments at lines 1184-1192).

Packet discrepancy: the task brief says `browserChecks.ts` is consumed by the Inspector scan. `rg` shows `runBrowserChecks` / `RESTRICTED_PATTERNS` are imported only by `src/app/starter-session/deriveStarter.ts`; the Inspector imports only `detectConnectorUse` and `exportedFunctionNames` from `structure.ts` (`src/features/inspector/model/checks.ts:2`).

###### Commands run (Bash tool; cwd noted; exit status)
Exit statuses marked (*) are the status of the last pipeline stage (`head`/`grep`/`echo`), not of `rg`/`cat`.
1. `cat` of packet-adjacent resources: domain-reviewer.md, audit-passes.md, severity-guide.md, typescript-react-reviewer SKILL.md and checklist.md (`| head -300`) - exit 0 (*).
2. `wc -l $(cat files-starter-and-objects.txt) | sort -n | tail -80` - exit 0.
3. `cat -n` of starter-session files, lib files, structure/browserChecks files, starter feature files, server-objects files - each exit 0.
4. `rg -n '^#+ .*FR-[2-6]|...AC-[2-6]...' docs/specs/.../spec.md | head -150` - exit 0 (*); `grep -n 'AC-2.2|AC-4.7...' | cut | head -60` - exit 0 (*); `sed -n` ranges of spec (150-215, 225-232, 242-244, 254-280, 380-420, 520-625) - exit 0.
5. `rg -n 'isLiquidAllowed' ...; sed -n 1,60p client.ts; rg getRecipe/methodEnabled; cat types/http.ts` - exit 0.
6. `rg -n 'it\.(skip|todo|only)|eslint-disable|@ts-ignore|\bany\b' <scope dirs> | head -30` - exit 0 (*); only prose matches plus one justified `eslint-disable-next-line` in `DownloadStarterButton.test.tsx:82`.
7. `rg -n 'url\(|@import|http' starter.css codePanes.css serverObjects.css` - exit 1 (no matches).
8. `rg -n 'runBrowserChecks|RESTRICTED_PATTERNS' ...`, `rg -n "browserChecks|code-analysis/" ...` - exit 0.
9. Export-usage loop (`rg` per symbol: applyTextChanges, applyChanges, plan.text, ringArcs, arcPath, RING_*, detectConnectorUse, exportedFunctionNames, readsHttpOnlyContext, emptyModule, LIQUID_RESET_NOTICE, DEFAULT_*, StarterPackageInput, fakeStarterDeps, RESTRICTED_PATTERNS, normalizeLf, minimalChange) - exit 0 (*).
10. Sink/hardcoding/catch/host searches over non-test scope files: `rg -e 'eval\(|new Function\(|innerHTML|dangerouslySetInnerHTML'` (only the pattern table in browserChecks.ts:21), `rg -e 'https?://|setTimeout|setInterval'` (only pattern table :23-24), `rg -e 'catch|\.catch\('` (5 sites, all read), `rg -e 'localStorage|sessionStorage|window\.(toolboxAPI|dataverseAPI)|fetch\('` (only the BROWSER_APIS list) - each exit 0 (*).
11. `node --version` -> v22.23.4, exit 0. `find / -type d -name acorn` -> `/opt/node-tools/node_modules/acorn` (acorn 8.18.0; the project pins ^8.19.0, so results are indicative only), exit 0.
12. Scratch experiments in `<scratchpad>/exp-so/` (copies of project lib files; repository untouched):
    - `node deep.cjs` (acorn nesting + walk replica) - exit 0.
    - `node redos.cjs` (regex timing for `import\s+[^;]{0,2000}?\s+from\b`) - exit 0.
    - `node --experimental-strip-types t1.ts` (planInsertion, runBrowserChecks, slugify, usedServerMembers on copies of project files) - exit 0.
    - `node --experimental-strip-types t2.ts` (runBrowserChecks timing with whitespace after `import`) - exit 0.
    - `node --experimental-strip-types t3.ts` (first version, looped member-chain n up to 8000) - exceeded 120 s and was stopped with TaskStop (O(n^3) member-chain cost, see unverified U5); replaced by a single-argument version run as `t3.ts bin 3000|4000|4500|5000|5500|6000|7000|7500|8000` and `t3.ts mem 200|500` - each exit 0 (`timeout 25`).
13. `npm run typecheck|lint|test`, `npm audit`: NOT run (node_modules absent, per packet). Global `tsc` not used.

###### Blocked checks (apply to all passes)
No typecheck, lint, Vitest or React Testing Library run was possible, so no claim here is "reproduced in the app". The CodeMirror / React runtime behaviour (history, listeners, effects) is source-reasoned; CodeMirror, React and `@testing-library` are not installed.

##### 2. Coverage table

| Pass | Status | Evidence inspected / check result | Limitation or N/A reason |
|---|---|---|---|
| 1 WIRING | checked | Traced App.tsx -> StarterSessionProvider -> reducer/derive -> StarterPage/ServerPane/CodeEditor; ServerObjectsPage -> ObjectDetail -> InsertButton -> `planInsertion` -> `applyChanges` action -> reducer `withText` -> CodeEditor props-sync effect; DownloadStarterButton -> buildPackageFiles -> `host.saveFile`; Provider notice effect. One wiring defect admitted (-001). Effect Event use in CodeEditor ruled sound (called only from effect-registered CM listener; native key/input events are discrete so React flushes the sync render and passive effect before the next key task, so a typing/props echo race was considered and dropped). | Runtime CM/React behaviour unexecuted (no node_modules). |
| 2 ERROR HANDLING | checked | Acorn SyntaxErrors are converted to `null`/`failed` in `parseScript`/`scanTokens` and to `parseFailed` in `runBrowserChecks`, so malformed code surfaces as "Couldn't parse this code" and never crashes. Non-SyntaxError exceptions are rethrown by `structureAst.ts` and are not caught between `deriveStarter` and the root (-003). Download errors: caught, name-only `console.error`, toast with reason, cancel path silent (matches AC-5.10). | Browser stack limits differ from Node; -003 threshold measured in Node only. |
| 3 COMPLETENESS | checked | Compared implementation with FR-2/2a/4/5/6 and AC-2.2-2.11, 3.1, 4.7, 4.10, 5.1-5.4, 5.9, 5.10, 6.1-6.10 and amendments 1184-1192. Slug rules, reviewed-text tie, Liquid reset, statement-position / trial-parse / async insertion, Copy fallback tooltips, used-member detection all present. NFR "300 ms for a 2 000-line file" is not met for whitespace-heavy `import` text (-002); its test does not cover that shape. | Visual ACs (CSS) not verified; `starter.css`/`serverObjects.css` unread. |
| 4 DEAD CODE | checked | Export-usage search (cmd 9). `applyTextChanges` and `structureInsert.applyChanges` are both live (duplicate, see -005). `ringGeometry`, `emptyModule` (vite alias), `detectConnectorUse`/`exportedFunctionNames` (Inspector) are consumed. `InsertResult.text` is produced by `planInsertion` but not read by app code (`InsertButton` re-applies via the reducer); retained as a documented result field and test oracle, not admitted for deletion. `fakeStarterDeps.ts` and the two test harnesses are test-only, not reachable from `main.tsx`. | No unused-symbol analyzer could run (no tooling). |
| 5 BLOAT | checked | Duplicate change-application rule (-005); RecipeCombobox / StarterInputs rule deviations (-004). Observed but not admitted: `deriveStarter` plus each rendered `InsertButton` re-parse the full text several times per state change (4 parses and 2 walks in `deriveStarter` alone, since `isLiquidAllowed` recomputes `usedServerMembers`); the hidden `ServerObjectsPage` still re-renders on every keystroke. Cost is small at handler sizes; no demonstrated failure. | Cost not profiled. |
| 6 HARDCODING | checked | Constants: slug cap 64, device-name list, import look-ahead 2 000, ring gap 4 deg and 30 segments are spec/FR-11 constants. No URLs, secrets or timers in scope (cmd 10). `LIQUID_RESET_NOTICE` text matches AC-4.7. Nothing admitted. | none |
| 7 SECURITY | checked | No `eval`/`new Function`/`innerHTML`/`dangerouslySetInnerHTML`, no host global access outside the adapter, no fetch, no storage in scope (cmd 10). `codeSpans()` renders catalogue text as React nodes. Code from the editor is only parsed/tokenized, never evaluated. Generated zip file names come from the slug (`[a-z0-9-]`, device names suffixed), so no path traversal. Regex cost issue (-002) is a self-inflicted availability problem, not an attacker boundary. | Zip contents/README built in generators domain (supporting only). |

##### 3. Findings

| ID | Severity | Pass | File:Line | Problem | Evidence | Fix and verification |
|---|---|---|---|---|---|---|
| starter-and-objects-001 | WARNING | 1 WIRING | src/features/starter/code/CodeEditor.tsx:101 | Trigger: user selects another recipe (or presses Start over), clicks into the Server pane and presses Ctrl+Z. The recipe switch is applied to the editor as a normal, history-recorded transaction, so undo restores the previous recipe's text and the listener reports it as a user edit. Impact: session state becomes recipe B (README, permission checklist, permission note, client call, method, "Permissions" review target) with recipe A's code as `serverText`; the user can then "Mark checklist reviewed" for the wrong checklist and Download a zip whose `<slug>.js` does not belong to the README/permission-checklist.md in it. Undo can also step back through edits made before the switch. | `CodeEditor.tsx:97-114`: props-sync `view.dispatch({ changes: minimalChange(...), annotations: FROM_PROPS })` has no `Transaction.addToHistory.of(false)`; `history()` is installed at :80 for the editable pane. Listener :81-86 skips only transactions carrying FROM_PROPS, so an undo transaction reaches `reportEdit` -> `dispatch({type:'editServer'})` (`ServerPane.tsx:43-45`) -> `starterReducer.ts:101-102` `withText` which keeps `recipe`, `generatedText`, `method`, `language` and sets only `serverText`/`cursor`. `selectRecipe` is at `starterReducer.ts:64-90`, `startOver` at :111-112. `buildPackageFiles.ts:48-52` writes `state.serverText` as `<slug>.js` and builds README/checklist from `state.recipe`. The existing test `CodeEditor.test.tsx:66-75` demonstrates that undoing an outside change is reported as an edit; `ServerPane.test.tsx:55-62` checks only the forward recipe change, no test undoes it. Source-verified; not run. Recoverable: Redo (Ctrl+Y/Shift+Ctrl+Z) or re-selecting the recipe; Phase 18a Decision 1 intends undo only for Server Objects inserts (AC-6.8). | Make only inserts undoable: have the reducer tag how the last outside change arose (for example a `textSource: 'insert' \| 'regenerate'` or a `revision` counter on `selectRecipe`/`startOver`), and in the props-sync effect add `Transaction.addToHistory.of(false)` (and clear history, e.g. recreate history state) for the regenerate case. Verify with a ServerPane test: dispatch `selectRecipe` R2, `undo(view)`, assert `session().state.serverText` still equals `generatedText`; keep the existing insert-undo test green. |
| starter-and-objects-002 | WARNING | 7 SECURITY (secondary 3 COMPLETENESS) | src/lib/code-analysis/browserChecks.ts:20 | Trigger: the server text contains the word `import` followed by a long run of whitespace (spaces, tabs, blank/indented lines) with no `;` nearby, in code, a comment or a string. The `import from` pattern `import\s+[^;]{0,2000}?\s+from\b` backtracks over every split of the whitespace run, so cost grows roughly as n^2.7. Impact: `deriveStarter` runs `runBrowserChecks` on every state change (every keystroke and every caret move), so the tool freezes on the main thread: about 1.3 s per keystroke at 2 000 spaces, 7.6 s at 4 000, minutes beyond that; also breaks the AC-4.1 300 ms and "300 ms / 2 000-line file" NFR. Self-supplied input only (pasted code); recoverable by waiting or Start over. | Regex at `browserChecks.ts:20` (comment at :19 claims it "stays linear"); applied by `restrictedHits` :86-96 inside `runBrowserChecks` :159-180; called from `deriveStarter.ts:18` on every render of `StarterSessionProvider.tsx:19`. Scratch measurement with the same regex (`redos.cjs`, Node 22.23.4): `import` + 100 / 500 / 1000 / 2000 / 4000 spaces = 2 / 24 / 167 / 1213 / 7640 ms. Through the real module copy (`t2.ts`): `// import` + 2 000 spaces in a 4-line handler = 1 296 ms; `// import` followed by 300 indented blank lines (1 500 chars) = 598 ms. The guarding test `browserChecks.test.ts:244-247` repeats `// import note N` lines (words, not whitespace), so it does not exercise this shape. Measured by a scratch replica in Node, not in the app. | Remove the ambiguity between `\s+` and `[^;]`: e.g. match `import` then a bounded sequence of non-whitespace words separated by single `\s+` runs, or scan with `indexOf('import')` and a manual bounded forward walk to the next `;` checking for a whole-word `from`. Verify: add a `browserChecks.test.ts` case with `import` + 5 000 spaces and with 2 000 indented blank lines under the existing `fastestRun` < 300 ms budget, and keep tests T16 and the multi-line import test (:68-72) green. |
| starter-and-objects-003 | WARNING | 2 ERROR HANDLING | src/lib/code-analysis/structureAst.ts:47 | Trigger: server text that parses but is extremely deep, for example a single expression of about 4 000 chained terms (`1+1+1+...`, about 8 KB), pasted into the Server pane. `walk` (and `chainOf`, structure.ts:113-125) recurse once per AST level with no depth guard; the resulting `RangeError` is not a `SyntaxError`, so `parseScript` does not apply, and nothing catches it. Impact: `usedServerMembers` throws inside `deriveStarter`, which is called during render of `StarterSessionProvider`; the provider sits outside every `PageErrorBoundary` (`App.tsx:79-89`; the boundary wraps only each Panel), so the root unmounts to a blank tool and all Starter state (edits) is lost until the host reopens it. Narrow trigger band: larger inputs fail inside acorn as a handled SyntaxError and take the safe token fallback. | `structureAst.ts:47-56` `walk` recursion; `structure.ts:180` `walk(parsed.program, ...)` in `usedServerMembers` (documented "Never throws", :171); `deriveStarter.ts:19,27` (`usedServerMembers`, and `isLiquidAllowed` -> `readsHttpOnlyContext` at `client.ts:41-42`); `StarterSessionProvider.tsx:19`; `main.tsx:30-32` only logs uncaught errors. Scratch run on a copy of the real module under Node 22.23.4 with acorn 8.18: `usedServerMembers` for `return 1` + `'+1'.repeat(n)`: n=3000 ok, **n=4000 throws RangeError**, n=4500-8000 ok (parse fails, fallback path). Browser stack depth differs, so the exact band is environment dependent; the unguarded path is source-verified. `InsertButton.tsx:17` (`planInsertion` -> `walk`) is inside the Panel boundary, so there it degrades to the "page couldn't load" message instead. | Make the walk iterative (explicit stack) and `chainOf` loop-based, or wrap the analysis entry points (`usedServerMembers`, `readsHttpOnlyContext`, `planInsertion`) in a catch that maps non-SyntaxError failures to the unparsed/fallback result (the file already rethrows by design, so add the catch at the boundary and state the contract). Also place a `PageErrorBoundary`/error boundary inside `StarterSessionProvider` or move derivation below it. Verify: unit test calling `usedServerMembers` with a 4 000-term chain expecting no throw; confirm the provider test still passes. |
| starter-and-objects-004 | INFO | 5 BLOAT | src/features/starter/inputs/RecipeCombobox.tsx:59 | Deviations from `.claude/rules/react.md` and `typescript.md` with a small concrete cost. (a) The combobox pushes a derived value (`visible.length`) to its parent through an effect, which causes a second render of `RecipeTile` and one frame of stale "N recipes" text after a method-filter change. (b) `useCallback` is used with no measured reason (`RecipeCombobox.tsx:53`, `StarterInputs.tsx:224-226`), solely to feed effect dependencies. (c) `document.getElementById(...) as unknown as {...}` double cast (:65-67) bypasses the type checker. | `RecipeCombobox.tsx:59-61` effect; `StarterInputs.tsx:223-226,236-239` state `visibleCount`; the count depends only on `methodFilter` plus the combobox-private `query`, so it can be computed where the list is rendered (the tile aside could be rendered by the combobox, or the filtered count lifted by lifting `query`). Rules: react.md "Avoid useEffect for derived state / chaining state updates; don't add useCallback by default"; typescript.md "no `as` casts to silence errors". Source-verified; lint behaviour unverified (cannot run eslint). | Render the count from the same render pass (lift `query` or pass a render prop for the aside); drop the two `useCallback`s; replace the cast with an `instanceof HTMLElement` check plus a feature test for `scrollIntoView` (or add the jsdom stub in test setup). Verify: `npm run lint` and `RecipeCombobox.test.tsx` "reports the resulting count" (:138). |
| starter-and-objects-005 | INFO | 5 BLOAT | src/app/starter-session/applyTextChanges.ts:4 | The "apply a set of offset-based `TextChange`s to the original text" rule exists twice with different contracts: the reducer's `applyTextChanges` assumes the array is already ordered by `from` and applies back to front, while `structureInsert.applyChanges` sorts first. A future caller of the `applyChanges` action that supplies unordered changes would silently corrupt the text (and `cursorAfter` in `insertion.ts:16-24` also assumes order). | `applyTextChanges.ts:3-11` vs `structureInsert.ts:75-82`; `starterReducer.ts:105-106` is the only consumer of the first; `starterSession.types.ts:26` accepts any `readonly TextChange[]`. Today the single producer (`planInsertion`) emits async-first, insertion-second, which is ordered. | Export `applyChanges` from `structureInsert.ts` (or `lib/`) and use it in the reducer, then delete `applyTextChanges.ts`; keep `applyTextChanges.test.ts` cases against the shared function. Verify with the existing reducer test "applies the async change and the insertion in one step" (`starterReducer.test.ts:180`) plus an unordered-input case. |
| starter-and-objects-006 | INFO | 3 COMPLETENESS | src/lib/code-analysis/browserChecks.ts:62 | Browser-check line numbers use acorn's line terminators (LF, CR, CRLF, U+2028, U+2029), but the editor shows lines split only on LF/CR/CRLF. For text containing U+2028/U+2029 (valid inside JS strings; typical from pasted rich text), hits after that character get line numbers one (or more) too high: the flagged-line bar lands on the wrong line, or is dropped when the number exceeds `doc.lines`, and the "Line N" list item does not match the gutter. | `browserChecks.ts:62-72` `lineStarts` (comment says it deliberately follows acorn); consumed by `ServerPane.tsx:42` `flagLines` and `lineDecorations.ts:21-24` (`doc.line(n)`, skipped when `n > doc.lines`). Scratch check (`t1.ts`, copy of the real module): for a handler whose second line is `const s = "a<U+2028>b"; eval(1)`, `runBrowserChecks` reports `eval(` on line 3. CodeMirror 6 splits documents only on `\r\n?|\n` (library behaviour recalled from memory; CodeMirror is not installed, so this half is not verified here), so the editor would hold 2 lines and the hit belongs on line 2. | Count lines the way the editor does (LF, CR, CRLF only) in `lineStarts`, keeping acorn only for offsets; or build `lineStarts` from the CodeMirror `Text`. Verify: test with U+2028 inside a string before a flagged token expecting the editor's line number. |

##### 4. Unverified candidates

| # | Location | Candidate | Missing evidence / check needed |
|---|---|---|---|
| U1 | `src/features/starter/code/CodeEditor.tsx:97-114`, `ServerPane.tsx:42` | The props-sync effect runs on every caret move and keystroke because `flagLines`/`highlightLines` get new array identities each time `deriveStarter` is recomputed (state changes on every cursor move) unless React Compiler memoises them structurally; each run dispatches an extensions-reconfigure transaction (new `javascript()` and decoration facet). Possible cost and IME-composition interference. | A browser profile with the compiled bundle and IME typing; React Compiler output for `ServerPane`. |
| U2 | `src/features/starter/code/CodeEditor.tsx` | Selection after an outside recipe switch: `cursor` is `null`, so the editor selection is whatever CodeMirror maps through the minimal change, while session `cursor` is `null`. Looks consistent (null means "use target function") but the visual caret position was not checked. | Run in a browser; observe caret after recipe switch and Insert. |
| U3 | `src/features/starter/inputs/PermissionNote.tsx:57` | `key={line}` on checklist lines would warn / mis-reconcile if two checklist lines are identical (AC-3.6/AC-6.9 mention repeated grants distinct by access scope). | Check `checklistLines()` output for every recipe for duplicates (needs the TS catalogue executed; `recipes.ts` imports `@/` aliases, not run). |
| U4 | `src/lib/code-analysis/structureAst.ts` | Behaviour against the pinned `acorn ^8.19.0` (only 8.18.0 was available at `/opt/node-tools`). The "Not enough stack space" SyntaxError conversion relied on in -003's safe band is an acorn feature; confirm it in 8.19. | Install-free check not possible; run Vitest after `npm ci` in CI. |
| U5 | `src/lib/code-analysis/structure.ts:112-125` | `chainOf` copies arrays (`[...head, key]`) and `walk` calls it for every `MemberExpression`, so a long member chain costs O(n^3): a scratch run with a 500-segment chain `a.b.b...` took 87 ms and a looped run to 2 000+ segments did not finish in 120 s. Not realistic handler code, therefore not admitted. | If long generated chains are expected, profile with real handlers; otherwise ignore. |
| U6 | `src/features/starter/inputs/RecipeCombobox.tsx:118-122` | `onBlur` closes the list when focus leaves the root; combined with the toggle's `onMouseDown preventDefault`, keyboard Tab from the toggle is fine, but touch/pen focus behaviour on option taps was not checked (options use `onMouseDown`, no `onPointerDown`/`onClick`). | Test on a touch device or with Playwright touch emulation. |
| U7 | `src/features/starter/code/ServerPane.tsx:24` | Highlight lines come from the real `generateHandler` while the session text comes from the injected `StarterDeps`; with `FAKE_STARTER_DEPS` (the default of `renderStarter`) the highlighted lines belong to a different text. Production is unaffected (same generator). Test-only coupling, not admitted. | None needed unless tests start relying on highlights with the fake deps. |


#### Lead admission note for starter-and-objects (pre-skeptic)

##### Plan v1 slice — domain starter-and-objects

Lead consolidation note: the reviewer returned 3 WARNING, 3 INFO and 7 unverified candidates. The lead re-read CodeEditor.tsx:78-116 (history() installed at :80; the props-sync dispatch at :101-113 carries only the FROM_PROPS annotation and no `addToHistory` field; the listener at :81-86 skips only FROM_PROPS transactions), browserChecks.ts:17-24 (the `import\s+[^;]{0,2000}?\s+from\b` pattern at :20 and the "stays linear" comment at :19), structureAst.ts:46-56 (recursive `walk`), App.tsx:70-101 (StarterSessionProvider wraps the Panels, so it sits outside PageErrorBoundary), RecipeCombobox.tsx:53-67 (useCallback, count-lifting effect, `as unknown as` cast), applyTextChanges.ts vs structureInsert.ts:76-82 (unsorted vs sorted apply), and browserChecks.ts:62-72 (lineStarts counts U+2028/U+2029). All six findings are admitted with original IDs and no changes. The reviewer's measurements (regex timing, RangeError at a 4,000-term chain) come from scratch replicas under Node 22 with acorn 8.18, not from the project tests; they are labelled as such.

Packet correction recorded by the lead: the reviewer packet said browserChecks.ts is consumed by the Inspector scan. `rg` confirms the Inspector imports only `detectConnectorUse`/`exportedFunctionNames` from structure.ts; `runBrowserChecks` is imported by deriveStarter.ts and the generators' tutorial.testkit.ts. The reviewer's correction stands.

Plan v1 slice (admitted):
- starter-and-objects-001 (WARNING, pass 1) — CodeEditor.tsx:101 recipe-switch / Start-over text enters CodeMirror undo history; Ctrl+Z restores the old recipe's code as a "user edit", leaving session metadata for the new recipe
- starter-and-objects-002 (WARNING, pass 7) — browserChecks.ts:20 `import … from` regex backtracks superlinearly on long whitespace runs; runs on every keystroke
- starter-and-objects-003 (WARNING, pass 2) — structureAst.ts:47 recursive `walk`/`chainOf` with no depth guard; a RangeError escapes `parseScript`, propagates through deriveStarter during render of StarterSessionProvider, which sits outside every PageErrorBoundary
- starter-and-objects-004 (INFO, pass 5) — RecipeCombobox.tsx:59 derived count lifted via effect, two useCallbacks, `as unknown as` cast
- starter-and-objects-005 (INFO, pass 5) — applyTextChanges.ts:4 duplicates structureInsert.applyChanges with a different ordering contract
- starter-and-objects-006 (INFO, pass 3) — browserChecks.ts:62 line numbers count U+2028/U+2029 as line breaks; the editor does not

Unverified candidates U1–U7 stay outside the confirmed list. The full raw reviewer result is review-starter-and-objects.md next to this file; it is the authoritative slice and coverage record.


### C.3 generators-and-catalogue — raw reviewer result (Sonnet 5.5)

#### Domain review: generators-and-catalogue

##### Coverage record

- Domain: `generators-and-catalogue` (81 assigned files). Snapshot: branch `refine-app`, HEAD 8dff4f1a2d55f085f7a98a16e19f72656dd52808 (as stated in the packet; not re-checked).
- Source files read in full: `src/services/catalogue/recipes.ts`, `serverObjects.ts`; `src/services/generators/handlers/{snippets,index,r1..r10,demoPages}.ts`; `src/services/generators/client/{client,liquidCheck}.ts`; `src/services/generators/package/{buildPackageFiles,buildZip,readme,readmeNotes}.ts`.
- Tests read (as evidence, not line by line): `handlers.core.test.ts`, `client.golden.test.ts` in full; heads/greps of `client.matrix.test.ts`, `readme.test.ts`, `r*.test.ts` (logging-regex assertions), `buildZip.test.ts`. The remaining test files were scanned by grep for `.skip/.todo/.only`, `any`, `eslint-disable`, `@ts-ignore` (no hits) and golden-read patterns. They are listed below as "skimmed".
- Golden fixtures: all 10 handler goldens, 3 demo-page goldens, `client/__golden__/jquery-r10-patch.js.txt`, `package/__golden__/R4.*` and `R10.permission-checklist` and `R9.js.txt` read; the other client and package goldens were not opened one by one (see Unreviewed/partial).
- Supporting files read (outside domain, labelled): `src/lib/slug.ts`, `src/app/starter-session/{deriveStarter,starterSession.types}.ts`, `src/app/starter-session/starterReducer.ts` (grep only), `src/features/starter/download/DownloadStarterButton.tsx`, `src/lib/code-analysis/browserChecks.ts` (lines 1-150), spec `docs/specs/001-server-logic-starter-inspector/spec.md` (FR-3 lines 411-526, FR-4 lines 527-560, selected grep hits).
- Reviewed file list: every file in the assigned list was accounted for as follows.
  - Read in full: the 21 source files above.
  - Golden fixtures (read or checked by program): `handlers/__golden__/R1..R10.js.txt` (compared byte-for-byte to generator output, see Commands), `R4/R5/R6.page.html.txt` (compared to `generateDemoPage(id, "customer-summary")`), `R9.js.txt`, `client/__golden__/jquery-r10-patch.js.txt`, `package/__golden__/R4.README.md.txt`, `R4.permission-checklist.md.txt`, `R10.permission-checklist.md.txt`.
  - Skimmed/not individually opened: `client/__golden__/{fetch-r1-get,fetch-r2-post,fetch-r4-get,fetch-r4-put,fetch-r5-del,jquery-r1-get,jquery-r2-post,jquery-r4-del}.js.txt`, `liquid-r1-get.liquid.txt`, `liquid-r8-getsummary.liquid.txt`, `package/__golden__/R1.README.md.txt`, `R1.permission-checklist.md.txt`, `R8.README.md.txt`. These are compared only by tests that cannot run here.
  - Test files (skimmed as evidence): `recipes.test.ts`, `serverObjects.test.ts`, `client.{envelope,golden,liquid,matrix}.test.ts`, `client.test.ts`, `demoPages.test.ts`, `handlers.core.test.ts`, `r1..r10 *.test.ts`, `r4.options.test.ts`, `r7.behavior.test.ts`, `r9r10.catalogue.test.ts`, `snippets*.test.ts`, `tutorial.testkit.ts`, `tutorials.integration.test.ts`, `buildPackageFiles.test.ts`, `buildZip.test.ts`, `package.integration.test.ts`, `readme.test.ts`.
- Excluded: none from the packet's exclusion list fall in this domain.
- Blocked: `npm run typecheck`, `lint`, `test` (vitest) and `npm audit` (no `node_modules`). Consequently no vitest result is claimed anywhere below; where I say "matches golden" it is from my own scratch program, not from the project tests.

##### Commands run (all from the repo root unless noted; scratch scripts live in the scratchpad `gc/` dir, outside the repo)

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `cat` packet files, severity guide, audit-passes, reviewer prompt | 0 | read |
| 2 | `cat -n`/`sed -n` on the 21 domain source files, `wc -l` on assigned files | 0 | read |
| 3 | `rg -n -i "slug" ...`, `rg -n "SLUG\|slugPattern..."` | 0 | slug only produced by `slugify` (`[a-z0-9-]`, <=64) |
| 4 | `rg -n "generateClient\|generateDemoPage\|buildPackageFiles\|buildZip\|generateHandler\|buildReadme" src` | 0 | call sites confirmed (DownloadStarterButton, ServerPane, ClientPane, starterDeps) |
| 5 | `rg` for `.skip/.todo/.only/eslint-disable/@ts-ignore/any` in generators+catalogue | 0 | no suppressions or skipped tests (only prose matches) |
| 6 | `rg -n "liquidCheck\|checkLiquidSyntax\|..." src` | 0 | `liquidCheck.ts` imported only by tests |
| 7 | `node probe.js` (scratchpad `gc/probe.js`): executes the committed handler goldens in a `node:vm` with stubbed `Server` object and adversarial inputs (R2, R3, R4, R5, R6, R7, R8, R9, R10) | 0 | results summarised under pass 7; stubs are mine, so this shows golden-text behaviour only |
| 8 | `node --import ./reg.mjs cmp.mjs` (scratchpad): loads real generators via Node 22 type stripping plus a path-alias hook and compares `generateHandler(id).text` to each handler golden | 0 | R1..R10 all `golden-match` |
| 9 | `node --import ./reg.mjs cmp3.mjs` | 0 | R4/R5/R6 demo pages equal their goldens for slug `customer-summary`; hostile slug is escaped in `data-slug` (`&quot;`, `&lt;`) and URL-encoded in `ENDPOINT` |
| 10 | `node --import ./reg.mjs cmp2.mjs` | 1 | `ERR_MODULE_NOT_FOUND: acorn` (client.ts imports `@/lib/code-analysis/structure`, which needs acorn; no node_modules). Tool error, not a clean check: `generateClient`, `buildReadme`, `buildPackageFiles` were NOT executed |
| 11 | `node fr4.js` (scratchpad): my copy of the FR-4 restricted-pattern and browser-API regexes run over `handlers/__golden__/R*.js.txt` | 0 | all 10 goldens: zero hits |
| 12 | `node --version` | 0 | v22.23.4 |
| 13 | `rg -n "pattern" ...codeAnalysis.types.ts`, `rg -n "pattern:" src/lib/code-analysis` | 0 | README `hit.pattern` values come from fixed label lists, not user text |
| 14 | `rg -n "serverObjects" src`, `rg -n "mtime\|determin..." buildZip tests/spec` | 0 / 1 | catalogue `serverObjects` consumed only by `readme.ts` HttpClient check; no zip-determinism promise found (rg 1 = no match) |

##### Coverage table

| Pass | Status | Evidence inspected / check result | Limitation or N/A reason |
|---|---|---|---|
| 1 WIRING | checked | `DownloadStarterButton` -> `generateClient` -> `buildPackageFiles` -> `buildZip` -> `host.saveFile`; `ServerPane` -> `generateHandler`; `starterDeps` -> `generateHandler`/`isLiquidAllowed`; demo page reachable only via `buildPackageFiles` (`recipe.demoPage`). Slug source is `slugify` only (deriveStarter). Liquid-vs-edited-code reset handled in the reducer (supporting). Registry `GENERATORS` is `satisfies Record<RecipeId, ...>` so a missing generator fails typecheck. | vitest not runnable; `generateClient`/package path not executed here (acorn missing) |
| 2 ERROR HANDLING | checked | Generated handlers: every connector call is in try/catch, logs `e.name` only, returns the fixed envelope; non-success results short-circuit. Exceptions in `Server.SiteSetting.Get` in R7/R9 sit outside try (see Unverified U2). Builders throw on programmer errors (`buildZip` empty/duplicate path, `requireExample`, `liquidQuoted`), and `DownloadStarterButton` catches and notifies. | none beyond the stated blocks |
| 3 COMPLETENESS | checked | Every `RecipeId` R1-R10 has a generator, a handler golden, and the registry. R4/R5/R6 (the `demoPage: true` recipes) have a demo page and golden; R1-R3, R7-R10 return `null`. Client goldens and package goldens exist only for a subset (client: 11 files; package: 6) but `client.matrix.test.ts` enumerates every recipe x function x language and the early-beta exception in spec 3.0.1 defers the full matrix, so this is not a gap against a stated promise. Spec FR-3 Musts checked against code: validate-before-call, settings read before call with exact log/message text, `toResult`, `contentType` on body calls, created-id rule, R7 stages/names/conflictBehavior, R4 allowlist/GUID/option rules/`$top` default 10 cap 50, deterministic output (verified: same text twice and equals golden). | package goldens/client goldens not compared programmatically (blocked by acorn import) |
| 4 DEAD CODE | checked | `liquidCheck.ts` and `tutorial.testkit.ts` have only test importers (production tree, test-only role); they are needed by tests, so not PRUNE. `methodEnabled`, `checklistLines`, `requestPathSteps`, `R*_DIFFERENCES`, `LIQUID_SERVER_NOTE` all have non-test consumers. No unused exports found in domain. | no unused-symbol tool (no node_modules) |
| 5 BLOAT | checked | Repetition of the JSON.stringify-literal pattern in r1..r9 is stylistic and enforced by the project rule; `fieldError` is duplicated in r2/r7/r8/r10 and `pushError` in r4/r5 (each 1-line helper, same output). No demonstrated divergence hazard beyond that. No finding. | none |
| 6 HARDCODING | checked | Literal endpoints: only R5 `https://services.odata.org/TripPinRESTierService` (the spec-allowed demo URL), R7 `login.microsoftonline.com` / `graph.microsoft.com` protocol constants, `Tickets` folder, `crd69_*` columns (replaceable per spec). No secrets; secret-bearing values come from site settings. | none |
| 7 SECURITY | checked | See notes below. No injection, escaping, logging or fail-closed defect found. Candidates in Unverified. | handler behaviour verified on committed goldens via stubbed `Server` object (command 7), not on a live Power Pages runtime |

###### Pass 7 detail (what was checked and found clean)

- Literal interpolation: every value placed in generated JS goes through `JSON.stringify` (`snippets.ts`, r1-r10). Identifier-position values (`settingVar`, `logLine` variable names, `validationFailureReturnFor`) are guarded by an `IDENTIFIER` regex and throw otherwise. Slug is never interpolated into handler JS. In `client.ts` the slug is placed in a JS comment (`// ${slug} | ...`), a `JSON.stringify` literal, and Liquid via `liquidQuoted` (throws unless `^[A-Za-z0-9-]+$`). README/checklist Markdown embeds slug in backticks and headings. All of these are safe only because `slugify` limits the slug to `[a-z0-9-]`; the sole production caller passes `derived.slug`.
- Demo pages: all record values are rendered through `escapeHtml` (includes `'` and `"`) before `.html(...)`; slug goes through `escapeHtml` for the attribute and `encodeURIComponent` + `JSON.stringify` + `<` escape for the script literal (verified with a hostile slug, command 9). R6 page uses `textContent`. The R5 `serviceSession` is re-validated by regex before reuse in a URL. CSRF token is sent on fetch/ajax.
- R7 (executed against the golden with a hostile `fullname`): ticket HTML shows `&quot;&lt;img ...&gt;` (escaped); file name is `act-1-x-img-src-x-onerror-1-23.html` (slug `[a-z0-9-]` plus ActivityId); upload URL carries `conflictBehavior=fail`; token body is form-encoded with `encodeURIComponent`; logs contain only fixed names, `StatusCode`, `ReasonPhrase`, `e.name`, `ActivityId`.
- R4: executed: `entitySetName` array/non-allowlisted rejected; `$top=0` rejected; repeated options rejected by design; `id` GUID regex rejects trailing `\n` and `)/x` suffix (R10 too, so no OData path injection through `accounts(<id>)/...`).
- R3/R6: query value passed through `encodeURIComponent`; setting missing -> `Server.Logger.Error("Missing site setting <name>")` + fixed failure, no outbound call (executed). URL (which holds a function key for R6) is never logged.
- Logging: grep of all `Server.Logger.*` emitters shows only operation literal, `StatusCode`, `ReasonPhrase`, `e.name`, `ActivityId`, or the missing-setting name. No `e.message`, `Body`, URL, header, token.
- FR-4: no restricted pattern or browser API hit in any handler golden (command 11, my own regex copy of `RESTRICTED_PATTERNS`).
- `buildZip`: names are fixed (`README.md`, `permission-checklist.md`) or `${slug}.js` / `${slug}.client.(js|liquid)` / `${slug}.page.html` with a dot-free slug, so no traversal and no collisions between the five names; explicit duplicate-path guard also present. fflate `zipSync` embeds the current time as mtime, so the bytes differ between runs; the spec only demands deterministic handler text, not zip bytes.

##### Findings

| ID | Severity | Pass | File:Line | Problem | Evidence | Fix and verification |
|---|---|---|---|---|---|---|
| generators-and-catalogue-001 | INFO | 3 COMPLETENESS | src/services/generators/handlers/demoPages.ts:538 | In the generated R5 demo page, clearing the `Age` cell and saving sends `Age: 0` instead of `null`/omitting it. Trigger: user double-clicks a row, empties the Age input, presses save. `Number("")` is `0`, so `Number.isNaN(age)` is false and `updates.Age = 0` is PUT to the TripPin demo service and then merged into the local row. Impact is limited to the demo page's behaviour on a public demo service (misleading data in the table), no security effect. | source-verified: lines 531-541 (`var value = String(input.val() \|\| "").trim(); if (attr === "Age") { var age = Number(value); updates[attr] = Number.isNaN(age) ? null : age; ...`). Page is reachable via `buildPackageFiles` for R5 (`recipe.demoPage`). Golden `R5.page.html.txt` matched the generator (command 9), so the golden encodes this too. | Treat `value === ""` as `null` (`value === "" \|\| Number.isNaN(age) ? null : age`), regenerate `R5.page.html.txt`, and add a `demoPages.test.ts` case that blanks Age. |
| generators-and-catalogue-002 | INFO | 3 COMPLETENESS | src/services/generators/package/readme.ts:192 | For R3, R5, R6, R7, R9 the "Upstream calls use this integration's own credentials..." sentence is pushed as a bare paragraph with no heading, directly after the Troubleshooting section, so in the rendered README it reads as the last item of Troubleshooting. Spec FR-3 (F10) only requires that README.md contains the line. A maker reading the README sees a credentials statement under "Troubleshooting". | source-verified: `blocks` order at lines 181-193: `section('Troubleshooting', ...)` then `blocks.push(UPSTREAM_CREDENTIALS_LINE)` then `section('Secrets', ...)`; blocks are joined with `\n\n`. `readme.test.ts:280-289` asserts only `toContain`, so it would not catch placement. No golden README exists for an upstream-credential recipe (goldens are R1, R4, R8), so it is unreviewed by fixtures. | Put the line inside a `section('Upstream credentials', ...)` or at the top of Secrets, and add a golden README for one upstream recipe (for example R6). |
| generators-and-catalogue-003 | INFO | 3 COMPLETENESS | src/services/generators/package/readme.ts:72 | README step 5 renders the recipe's web-role description as if it were a literal role name: "Select + Add roles and add `A web role the caller holds`" (R1-R4, R7, R10), "`An authorized web role that the caller holds`" (R9), "`A web role the visiting user holds`" (R8). Only R5 (`Administrators`) and R6 (`Authenticated Users`) are real role names. A maker following the numbered steps literally is told to add a role that does not exist. Same strings appear in `permission-checklist.md` ("Web role: A web role the caller holds"), where it reads as a description. | source-verified: `recipes.ts` `webRole` values (lines 49, 72, 87, 331, 360, 400) flow into `setupBody` template at readme.ts:72; golden `package/__golden__/R4.README.md.txt` line 9 shows the rendered sentence. | In `setupBody`, branch on whether the role is a fixed name; for descriptive roles write "add a web role the caller holds" without backticks. Update the README goldens (R1, R4, R8). |

No CRITICAL or WARNING findings.

##### Unverified candidates

| # | Candidate | Location | Missing evidence | Check needed |
|---|---|---|---|---|
| U1 | R4 `post`/`put` forward the caller's whole JSON body to `CreateRecord`/`UpdateRecord` with no column allowlist (only "parses to an object"). A caller could include OData lookup binds such as `parentcustomerid_account@odata.bind` (executed: the body reaches `CreateRecord` unchanged, command 7). If the server-logic connector does not require Append/Append To, a caller with Account-scoped Write on its own contact could rebind its contact to another account and thereby widen its Account-scoped access. The spec itself says the checklist would need Append/Append To for a bound create, which suggests Dataverse enforces it, but the recipe grants neither. | src/services/generators/handlers/r4.ts:230 and :249 (emitted lines), spec FR-3 R4 row | Whether Dataverse/Power Pages server logic denies `@odata.bind` on `contact` without Append (on contact) and Append To (on account) table permissions. Cannot be determined from source; needs a test on a dev site (the spec's Spike S4 style probe). If it is not denied, severity would be WARNING (generated handler ships an over-permissive write path) and the fix is a field allowlist for `post`/`put` or rejecting any key containing `@`. |
| U2 | R7 (`Server.SiteSetting.Get` x5) and R9 (`Server.SiteSetting.Get("CLOUD_FLOW_ID")`) read settings outside any try/catch, unlike R3/R6 where the read is inside the try. If `Get` throws, the exception escapes the handler's fixed-envelope contract and could surface runtime text to the caller. | src/services/generators/handlers/r9.ts:55, src/services/generators/handlers/r7.ts:335 | Whether `Server.SiteSetting.Get` ever throws (Learn says it returns a value; behaviour for missing names unverified). My stub test only confirmed the exception would propagate (R9 `THROW boom`, command 7). | Probe `Server.SiteSetting.Get("DoesNotExist")` on a dev site. If it can throw, move the read into the existing try (R9) or wrap it (R7) and add a test with a throwing stub. |
| U3 | `generateClient`, `buildReadme`, `buildPackageFiles` and the package/client goldens were not executed here (acorn missing, command 10), so README/checklist/client byte equality against goldens is unverified by me. | package/__golden__/*, client/__golden__/* | vitest run | Run `npm test -- src/services/generators` after `npm ci` in an environment where install is permitted. |
| U4 | Defence in depth: `client.ts` (comment line and endpoint literal), `readme.ts` and `buildPackageFiles.ts` do not escape the slug themselves and rely on `slugify`. Not exploitable today (only caller passes `derived.slug`; `liquidQuoted` throws on unsafe slugs). Not admitted because there is no attacker-controlled path. | src/services/generators/client/client.ts:116, :171 | n/a | If a future caller passes a non-slugified name, add a slug-shape assertion at the top of `generateClient`/`buildPackageFiles`. |


#### Lead admission note for generators-and-catalogue (pre-skeptic)

##### Plan v1 slice — domain generators-and-catalogue

Lead consolidation note: the reviewer returned 3 INFO findings and 4 unverified candidates. The lead re-read demoPages.ts:528-545, readme.ts:60-80 and 178-195, and recipes.ts webRole values; all three findings' File:Line, trigger and evidence hold. All three are admitted to Plan v1 with their original IDs and no changes. No merges (single domain). The 4 unverified candidates (U1–U4) stay outside the confirmed list.

Plan v1 slice (admitted):
- generators-and-catalogue-001 (INFO, pass 3) — demoPages.ts:538 blank Age → 0
- generators-and-catalogue-002 (INFO, pass 3) — readme.ts:192 upstream-credentials line without heading
- generators-and-catalogue-003 (INFO, pass 3) — readme.ts:72 descriptive web role rendered as literal name

The full raw reviewer result (coverage record, commands, coverage table, findings table, unverified candidates) is the file review-generators-and-catalogue.md next to this file; it is the authoritative text of the slice and coverage record.


### C.4 inspector-session-and-scan — raw reviewer result (Sonnet 5.5)

#### Domain review: inspector-session-and-scan

##### Coverage record

- Domain: `inspector-session-and-scan`. Repository `/home/user/PowerPage-ServerLogic`, branch `refine-app`, HEAD 8dff4f1a2d55f085f7a98a16e19f72656dd52808 (working tree clean per `git status --short`, empty output).
- Method: source review only (node_modules absent; typecheck, lint, vitest and npm audit are blocked and were not attempted). No conclusion below is "reproduced"; all are "source-verified".
- Non-test source read in full: `src/app/inspector-site/{InspectorSessionProvider.tsx, inspectorDeps.ts, inspectorSession.ts, inspectorSession.types.ts, useInspector.ts, inspectorTestHarness.tsx}`, `src/features/inspector/model/{checks.ts, copy.ts, fixtures.ts, grantSet.ts, rules.ts, settings.ts}`, `src/features/inspector/scan/{limiter.ts, parseRecords.ts, queries.ts, scan.ts}`.
- Tests (read as evidence, via full test-name listings plus targeted reads of `scan.test.ts` lines 528-604; not line-by-line): `inspectorSession.test.ts`, `InspectorSessionProvider.test.tsx`, `checks.test.ts`, `envvarCause.test.ts`, `evidence.test.ts`, `grantSet.test.ts`, `rules.test.ts`, `settings.test.ts`, `unreadableRows.test.ts`, `limiter.test.ts`, `parseRecords.test.ts`, `queries.test.ts`, `scan.test.ts`. I listed test names for grantSet, unreadableRows, checks, parseRecords, limiter, scan and inspectorSession; `InspectorSessionProvider.test.tsx`, `rules.test.ts`, `settings.test.ts`, `queries.test.ts`, `evidence.test.ts` and `envvarCause.test.ts` were not opened beyond their file names (limitation, see Coverage table).
- Supporting (outside ownership, read only to establish contracts): `src/services/pptb/dataverseRead.ts`, `dataverseFiles.ts`, `hostErrors.ts`, `host.types.ts` (HostReadError), `pptbHost.ts` (hostCall, preventClose, queryAll wiring), `src/app/useActiveConnection.ts`, `src/app/NotifyProvider.tsx`, `src/app/useNotify.ts`, `src/types/inspector.ts`, `src/features/inspector/report/markdownEscape.ts` (grep only), `src/features/inspector/ResultsView.tsx` / `pageCopy.ts` (grep only), `eslint.config.ts` (grep only), spec FR-7/FR-8/FR-9, AC-7.x, AC-9.8-9.9 and the Phase 5 addendum.
- Excluded / blocked / unreviewed: none of the 29 assigned files was unreviewed. Depth varies: the 5 test files named above were not read past their names.

##### Commands run (cwd /home/user/PowerPage-ServerLogic unless noted)

| # | Command (abridged) | Exit |
|---|---|---|
| 1 | `cat` packet-base.md, packet-reviewer-extra.md, files-inspector-session-and-scan.txt | 0 |
| 2 | `cat` domain-reviewer.md, audit-passes.md, severity-guide.md | 0 |
| 3 | `cat`/`head` typescript-react-reviewer SKILL.md, checklist.md, antipatterns.md, react19-patterns.md | 0 |
| 4 | `wc -l` on assigned files plus dataverseRead.ts, dataverseFiles.ts, browserChecks.ts | 0 |
| 5 | `cat -n` inspectorSession.ts, inspectorSession.types.ts | 0 |
| 6 | `cat -n` Provider, inspectorDeps, useInspector, harness | 0 |
| 7 | `cat -n` scan.ts, limiter.ts, queries.ts | 0 |
| 8 | `cat -n` dataverseRead.ts, dataverseFiles.ts; `sed -n 1,200p` hostErrors.ts | 0 |
| 9 | `cat -n` parseRecords.ts; `cat -n src/types/inspector.ts \| head -250` | 0 |
| 10 | `cat -n` rules.ts, grantSet.ts, settings.ts | 0 |
| 11 | `cat -n` checks.ts, copy.ts, fixtures.ts | 0 |
| 12 | `cat -n src/app/useActiveConnection.ts \| head -80`; `ls src/app`; `grep -n inventoryComplete\|stopped\|unreadableRows -r src -l` | 0 |
| 13 | `grep -n` spec headings/IDs (FR-7..10, AC-7.x, R-14, D-14/16/19); `sed -n` spec 626-670, 747-797, 1220-1234 | 0 |
| 14 | `cat -n useNotify.ts`; `sed -n 1,120p NotifyProvider.tsx`; `grep` host.types.ts / `ls` services/pptb | 0 |
| 15 | `grep -n inventoryComplete\|stopped\|filePill...` in src/features/inspector/*.tsx,*.ts | 0 |
| 16 | `grep -n` test names (`it(`/`describe(`) in scan.test.ts, inspectorSession.test.ts, grantSet/unreadableRows/checks/parseRecords/limiter tests | 0 |
| 17 | `grep -n` malformed/degrade in spec; `sed -n` scan.test.ts 528-550, 590-604 | 0 |
| 18 | `grep -n` eslint.config.ts for react-refresh/ignores; `grep -rn inspectorTestHarness` | 0 |
| 19 | `grep -n preventClose`/`hostCall` in pptbHost.ts | 0 |
| 20 | `grep -rn escapeInline`; `grep -n banner` renderMarkdown/buildReportModel | 0 |
| 21 | `rg -w <symbol>` loop for dead-code candidates (30 symbols) | 0 |
| 22 | `rg` `as`/`any`/`eslint-disable`/`@ts-`/non-null scan with look-around (no --pcre2) | 2 (regex error, tool error, not a clean result) |
| 23 | Same scan re-run with `--pcre2` over app/inspector-site, model, scan | 0 (only comment/template-literal text matched; no code hits) |
| 24 | `rg` TODO/FIXME/XXX/HACK | 1 (no matches) |
| 25 | `rg` `https?://\|setTimeout\|setInterval` (non-test) | 0 (setTimeout in inspectorSession.ts/inspectorDeps.ts, one fixture URL) |
| 26 | `rg` `eval(\|new Function(\|innerHTML\|dangerouslySetInnerHTML` | 1 (no matches) |
| 27 | `sed -n` parseRecords.ts 218-225, checks.ts 228-237, scan.test.ts 530-532; `git status --short` | 0 (status output empty) |
| 28 | Write of this report file (scratchpad only) | 0 |

##### Coverage table

| Pass | Status | Evidence inspected / check result | Limitation or N/A reason |
|---|---|---|---|
| 1 WIRING | checked | `App.tsx` -> `InspectorSessionProvider` (not read; supporting expectation) -> `createInspectorStore`; adopt effect (Provider:54-56), stop effect (58-63), `useSyncExternalStore(subscribe, getSnapshot)`; adopt -> loadSites -> `deps.listSites`; selectSite/rescan -> startScan -> `deps.runScan` -> `createReader` -> `host.queryAll`/`downloadFileColumn` (`pptbHost.ts:222-224`); abort propagation store -> `own.signal` -> reader `external` -> `run.signal` -> adapter `throwIfAborted`; listener subscribe/unsubscribe; timers (`settle`, watchdog) cleared in `finally`; StrictMode double-effect path (stop then re-adopt) traced and covered by `inspectorSession.test.ts:501`. | `App.tsx` and `InspectorPage.tsx` not read (owned elsewhere). |
| 2 ERROR HANDLING | checked | Per-read outcomes (`ok`/`failed`/`unread`) and their mapping to `Readable` reasons and `SettingValue` (scan.ts 41-135, 196-260); `Promise.allSettled` + `fulfilledValue` so no read outlives the scan; scan failure -> `failed` state (store 285-286); `ScanAbandonedError` -> `connection-changed`; identity refresh rejection accepted with `console.error` (scan.ts 267-278); partial pages kept only for the inventory (scan.ts 156-157); export failures (store 158-171) always release the close guard. One finding (domain-001). | Live error shapes (RG-002) not verifiable here. |
| 3 COMPLETENESS | checked | Compared code against FR-7 (grant set, parent chain, settings parse, env var causes, unreadable rows, default-role banner), FR-8 precedence table (`makeFinding`, `canReviewFinding`), FR-9 O0-O6 and table-permission cases, AC-7.6/7.7/7.10, AC-9.8/9.9 and D-14/D-19 C. Matches spec except domain-001 (settings content unreadable). `fetchXmlQuery` fallback is documented as not built. | Spec items for UI rendering are other domains. |
| 4 DEAD CODE | checked | `rg -w` over 30 exported symbols (command 21): every one has a production or test consumer. `fixtures.ts` is imported only by tests (5 test files) and not by app code, so it is test support, not a PRUNE candidate. `inspectorTestHarness.tsx` is imported only by tests. Unreachable defensive branches (`settings.ts:263`, `settings.ts:359`) are trivial and not worth a finding. | No unused-symbol analyser available (no node_modules). |
| 5 BLOAT | checked | Duplicate role-id-mismatch predicate in `checks.ts:100-103` and `grantSet.ts:139` and the default values 120 / `true` / "no allow list" in `settings.ts` parse functions vs `settingSnapshot` were examined; both pairs are kept in step by tests and neither has a demonstrated divergence, so no finding. | |
| 6 HARDCODING | checked | `PAGE_SIZE` 5000 (Dataverse maximum, adapter cap), `SCAN_CONCURRENCY` 4 (FR-7), `SETTLE_TIMEOUT_MS`, `EXPORT_WATCHDOG_MS` (spec E-11), component type ids and scope option values (spec data-source table) are protocol or spec constants; test seams exist for the timers. No URLs or secrets in non-test source (command 25). | |
| 7 SECURITY | checked | OData injection: `odataGuid` (strict GUID regex) for site and definition ids; `odataString` doubles `'`, percent-encodes, rejects control chars and lone surrogates; adapter `buildQueryPath` additionally rejects `&`, `#`, control chars. Schema names come from site-setting content (maker-controlled) and flow only through `odataString`. No `eval`/`innerHTML` (command 26). Logging: only error names and fixed strings (`console.error` calls in scan.ts 81, 272; store 159, 232, 285). Retrieval-only: the scan uses `queryAll` and `downloadFileColumn` only. | Live behaviour of host URL building for encoded filters is unverified (see Unverified U-3). |

##### Findings

| ID | Severity | Pass | File:Line | Problem | Evidence | Fix and verification |
|---|---|---|---|---|---|---|
| inspector-session-and-scan-001 | WARNING | 2 ERROR HANDLING | src/features/inspector/scan/parseRecords.ts:219 | A matched `ServerLogic/*` site-setting row whose `content` is not a JSON object (or whose `value` is not a string, line 224) is silently converted to an empty string value. For `ServerLogic/AllowedDomains` an empty value means "no allow list", so with `AllowNetworkingToAllDomains` = `false` and a handler that calls HttpClient the Outbound finding states "Outbound calls are blocked. The handler calls HttpClient, but no domains are allowed." (`checks.ts:233`), which is a false statement about a row the tool could not read. The finding is an ordinary reviewable Needs review (reason `readFailure: false`), so Mark as reviewed is offered and an exported report repeats the false statement. There is no site banner for the unreadable setting row, unlike skipped role/permission rows. Trigger: a hand-edited or corrupted AllowedDomains row. Impact is limited: the status is never Configured (hosts stays empty), and a rescan after fixing the row recovers. | source-verified. Path: `readSettings` (scan.ts:233-243) -> `parseSettings` (parseRecords.ts:238-260, only the envelope is validated for a matched row, line 244) -> `bindingOf` (227-231) -> `bindingFromContent` (218-225) -> `{kind:'value', raw:''}` -> `parseAllowedDomains` (settings.ts:274-309) gives `hosts: []` -> `outbound` (checks.ts:177-238). Intent: `scan.test.ts:530` ("degrades one malformed setting to an empty value") pins this for Timeout; no spec text found (grep "malformed\|degrade") that sanctions it for AllowedDomains, while FR-8 says "Default to Needs review when evidence can't be read" and AC-7.7 says unreadable configuration must read "couldn't read configuration". | Return a distinct binding for unreadable content (for example `{kind:'unreadable'}` mapped to `SettingValue` `envvar-unreadable`-style read failure, or a new `read-failed` kind) so the check carries `readFailure: true` and Mark as reviewed is withheld; keep the current behaviour for a readable object without `value`. Verify with a scan test: AllowedDomains `content: '{not json'` + `AllowNetworkingToAllDomains` = `false` + HttpClient code expects a read-failure reason and no "no domains are allowed" text. Needs an owner decision because `scan.test.ts:530` encodes the current behaviour for Timeout. |

No other candidate met all four admission criteria.

###### Verified-clean areas (the focus items asked for; no finding row)

- Cancellation and stale results when the connection changes mid-scan: `adopt` aborts the controller and bumps `generation`; every late `onProgress`, success and failure path checks `mine === snapshot.generation` (store 262, 270, 276, 279); `runScan` re-reads the host identity after all reads settle (`confirmIdentity`), re-checks the signal, and abandons on a different id, URL or null; a rejected re-read is accepted by owner decision (AC-7.6/P5.5). Mixed A-B-A switching inside one scan would not be detected (the host reads are not pinned to a connection id), which is an inherent limit of the adapter contract, not a defect in this domain.
- Partial-failure truthfulness: failed roles, permissions, settings, inventory and downloads each map to `Readable{ok:false}` or a `SettingValue` failure, never to an empty "clean" list; inventory rows skipped as unreadable or a failed page set `inventoryComplete: false`; connection loss yields `stopped: 'connection-lost'` and `not-scanned` for everything unread; partial pages are discarded for roles, permissions and settings and kept only for the inventory (spec WR-003). Role-id references missing from a successful role list become a non-reviewable read failure in both `webRole` and `buildGrantSet`.
- Limiter: slot hand-off in `finally` frees the slot on rejection and on synchronous throw; no nested acquisition, so no deadlock; a task that finds the signal aborted or the reader lost exits immediately, draining the queue (`limiter.test.ts:53`, `scan.test.ts:799-870`).
- Pagination (supporting, `dataverseRead.ts`): same `Prefer: odata.maxpagesize=N` header on every page, no `$top`, deterministic `$orderby` on every query in `queries.ts`, repeated-link detection via a seen set, same-table check on the next link, fail-closed on a full page with no link while `NEXT_LINK_UNVERIFIED` is true.
- Schema validation: every row is `unknown` and narrowed by `isObject`, `typeof` and `activeFlag`; no `as`, `any` or `!` in non-test code in the domain (commands 22-23); unreadable role/permission rows are counted in `unreadableRows` and named in a banner per R-14 B (the spec explicitly accepts that findings are graded without them).
- Rule logic: inactive permission, inactive ancestor, missing parent, loop, self-parent and unknown-scope terminal ancestor follow FR-7 (`grantSet.ts:100-175`); Authenticated and Anonymous default-role inclusion matches the FR-7 wording, including several anonymous roles; O0-O6 and wildcard collection match FR-9.
- Store subscription and cleanup: `subscribe` returns a delete closure; `stop()` aborts, bumps `listToken` and `generation`, resets to the initial snapshot and allows re-adopt (StrictMode); settle and watchdog timers are cleared in `finally`; the `settled` chain never rejects.
- React 19 / TypeScript rules: function components only, `<Context value>`, `use()` for context, no `useMemo`/`useCallback`, effects used only to sync with the external store and cleaned up, no components in components, no index keys. `NotifyProvider.notify` is recreated every render but only closes over stable values (`host`, `setToasts`, a ref), so capturing the first instance in `useState(() => createInspectorStore(...))` is safe.

##### Unverified candidates

| # | Location | Candidate | Missing evidence / check needed |
|---|---|---|---|
| U-1 | `src/features/inspector/scan/parseRecords.ts:96-117`, `scan.ts:159` | A type-35 inventory row with an unreadable id, name or state sets `inventoryComplete` to false, so the user sees "Inventory incomplete. Reconnect and rescan." for a condition a reconnect cannot fix, with no row named (roles/permissions get a named banner). Dataverse makes `name` and `statecode` non-null with values 0/1, so reachability is doubtful. | Live evidence that such a row can occur; an owner decision on whether to name skipped inventory rows. If confirmed it is INFO. |
| U-2 | `src/features/inspector/scan/parseRecords.ts:129-137` | `parseRole` ignores the role row's `active` flag, so an inactive web role assigned to a file still reads as "Web role assigned". FR-7/FR-9 define activity only for table permissions and settings. | Spec or Learn confirmation that an inactive web role is not effective; if so the webRole check and grant set need an inactive-role rule. |
| U-3 | `src/features/inspector/scan/queries.ts:21-27` (R-06) | `odataString` percent-encodes the literal and relies on the host not encoding the path again; a double-encoded `%2527` would change which definition matches. | A live PPTB request log (Network panel) for an env-var schema name containing `'`, `&` or a space (S2 continuation row). |
| U-4 | `src/app/inspector-site/inspectorSession.ts:204-243` | The site list is not identity-confirmed after the read (the scan is, via `confirmIdentity`). If the host switches connection after `adopt` and the provider's re-read keeps failing, the list could show the new connection's sites under the old identity until the provider adopts. Window is small and focus/visibility retries exist. | Observe ConnectionProvider behaviour when `getActiveConnection` rejects persistently after a `connection:*` event (owned by host-and-shell). |
| U-5 | `src/app/inspector-site/inspectorSession.ts:345-347` | `selectFile` does not check the id against `facts.files`; a stale or foreign id would be stored. `openExport` already tolerates a mismatch; whether `ResultsView` does is outside this domain. | Read `ResultsView.tsx` selection handling; likely INFO or nothing. |
| U-6 | Whole domain | `npm run typecheck`, `lint` (including `no-unnecessary-condition`, `switch-exhaustiveness-check`) and `vitest` could not run, so type and lint cleanliness and test pass state are unconfirmed. | Run the three project scripts after dependencies are installed by the owner. |


#### Lead admission note for inspector-session-and-scan (pre-skeptic)

##### Plan v1 slice — domain inspector-session-and-scan

Lead consolidation note: the reviewer returned 1 WARNING and 6 unverified candidates. The lead re-read parseRecords.ts:63-71 (unreadable `content` becomes `content: null`), 218-231 (`bindingFromContent(null)` → `{kind:'value', raw:''}`), 238-260, checks.ts:228-237 (the "no domains are allowed" row with `readFailure: false`) and scan.test.ts:530 (the pinned degrade behaviour for TimeoutInSeconds). The path holds. The finding is admitted with its original ID and no changes.

Plan v1 slice (admitted):
- inspector-session-and-scan-001 (WARNING, pass 2) — parseRecords.ts:219 unreadable AllowedDomains content degrades to "no allow list" and yields a false, reviewable "Outbound calls are blocked" finding

Unverified candidates U-1–U-6 stay outside the confirmed list. The full raw reviewer result is review-inspector-session-and-scan.md next to this file; it is the authoritative slice and coverage record.


### C.5 inspector-ui-and-report — raw reviewer result (Sonnet 5.5)

#### Domain review: inspector-ui-and-report

##### Coverage record

- Domain: `inspector-ui-and-report` (36 assigned files).
- Source snapshot: repository `/home/user/PowerPage-ServerLogic`, branch `refine-app`, HEAD `8dff4f1a2d55f085f7a98a16e19f72656dd52808` (confirmed with `git rev-parse HEAD`, exit 0). No repository file was edited; nothing was installed.
- Blockers (from the base packet): `node_modules/` absent, so `npm run typecheck`, `lint`, `test` (vitest) and `npm audit` could not run. Every conclusion below is source-verified, none is reproduced. The jsPDF 4.2.1 and jspdf-autotable 5.0.8 source is not on disk, so library behaviour is inferred from tests and the P5.6 plan (see Unverified candidates).

###### Reviewed files (all 36 read)

Source files read in full:
`FilesRail.tsx`, `FindingDetail.tsx`, `FindingTile.tsx`, `InspectorPage.tsx`, `ReadinessTile.tsx`, `ResultsView.tsx`, `StatePanel.tsx`, `pageCopy.ts`, `pageState.ts`, `inspector.css`, `export/ExportDialog.tsx`, `export/exportCopy.ts`, `export/export.css`, `report/buildReportModel.ts`, `report/markdownEscape.ts`, `report/pdfDrawing.ts`, `report/pdfFonts.ts`, `report/pdfTable.ts`, `report/renderMarkdown.ts`, `report/renderPdf.ts`, `report/reportFileName.ts`, `report/reportFixtures.ts`, `report/reportModel.types.ts`, `report/testCmap.ts` (test-only helper, not imported by app code).

Golden files read in full as evidence of promised behaviour: `report/__golden__/file.md`, `report/__golden__/site.md`.

Test files, read as evidence: `report/markdownEscape.test.ts`, `report/renderMarkdown.test.ts`, `report/pdfFonts.test.ts` and `report/renderPdf.test.ts` were read in full. `report/buildReportModel.test.ts`, `report/pdfTable.test.ts`, `report/pdfDrawing.test.ts`, `InspectorPage.test.tsx`, `ResultsView.test.tsx` and `export/ExportDialog.test.tsx` were read by test name plus the export, hostile-name, sanitisation and focus bodies (not every line). I found no test that masks a defect in the admitted findings. The fixtures do hide finding 001, as the spec's deviation register says.

Excluded: none of the 36 assigned files. Blocked/unreviewed: none.

###### Supporting files read (outside ownership, only to validate contracts)

- `src/app/inspector-site/inspectorSession.ts`, `inspectorSession.types.ts`, `inspectorDeps.ts` (export job, `runExport`, `invalidateExport`, deps wiring). Owned by inspector-session-and-scan.
- `src/app/App.tsx` (lines 1-80), `src/components/Modal.tsx`, `Button.tsx`, `PillGroup.tsx`, `Checkbox.tsx`, `Tile.tsx`, `checkStatusBadge.ts`, `src/lib/ringGeometry.ts` (first 60 lines), `src/lib/emptyModule.ts`, `src/services/pptb/host.types.ts` and `pptbHost.ts` (`saveFile`). Owned by host-and-shell.
- `src/features/inspector/model/checks.ts` (lines 50-100), `model/copy.ts` (whole file; the `rules.ts` grep was by pattern only), `src/types/report.ts`, `src/types/inspector.ts` (lines 35-50), `src/app/theme/tokens.css` (token names).
- `vite.config.ts`, `package.json` (jspdf versions), spec sections AC-8.x, AC-9.x, FR-10 and the deviation register, and `docs/phase-5/plans/p5-6_plan.md` lines 18-28.

##### Commands run (all from the repository root unless noted; exit status in brackets)

1. `Read` of the two packet files, the file list, the reviewer procedure, audit passes, severity guide and four grounding-skill files via `cat` [0].
2. `wc -l` over the 36 files; `git rev-parse HEAD` [0].
3. `cat -n` / `sed -n` of every assigned source file, supporting files and spec ranges listed above [0].
4. `ls`, `find / -type d -name 'jspdf*'` (no match), `ls ~/.npm/_cacache`, `grep -rl jspdf ~/.npm/_cacache/index-v5` (no output: jspdf is not in the npm cache) [0 for the pipeline].
5. `rg -n "jspdf|jsPDF" src --glob '!*.test.*' -l` [0]; `rg -n "\.html\(|addSvgAsImage|addImage|\.svg\(" src --glob '!*.test.*'` [0; only generated-page template strings in `src/services/generators/handlers/demoPages.ts` and golden files, none in the report path].
6. `rg -n ... (look-around pattern)` scan for `as` casts, `!`, `any`, `eslint-disable`, `dangerouslySetInnerHTML`, `eval`, `fetch(`, `useMemo/useCallback/memo`, `forwardRef` over the domain [2: regex parse error, look-around needs `--pcre2`]; re-run with `--pcre2` [0: only comment and copy-text matches, no violations].
7. `rg -nE '#[0-9a-fA-F]{3,8}|rgba?\(|hsl\('` over `inspector.css` and `export/export.css` [1: no hard-coded colours]; token cross-check loop for every `var(--*)` in both CSS files against `src/app/theme/tokens.css` [0: all 11 defined].
8. Dead-code reference scans with `rg -l -w <symbol>` for 17 exports [0]; `rg "\.stem\b|model\.format|\.format\b"` [0].
9. `rg` over spec and phase-5 docs for `lazy`, `backtick`, bundle size, finishedAt semantics [0].
10. A `mkdir` + `curl` download of the jsPDF 4.2.1 source into the scratchpad was attempted and was DENIED by the permission system. It did not run. Nothing was fetched.
11. A first `Bash` call with a lower-case tool name `bash` failed (tool name error, no effect).

##### Coverage table

| Pass | Status | Evidence inspected / check result | Limitation or N/A reason |
|---|---|---|---|
| 1 WIRING | checked | Traced `App.tsx` `InspectorScope` > `InspectorSessionProvider` > `InspectorPage` > `PageBody` > `ResultsView`/`ExportDialog` > `session.openExport/submitExport/closeExport` > `inspectorSession.runExport` > `deps.buildReportModel/renderMarkdown/renderPdf` > `host.saveFile`. Focus wiring (`useHeadingFocus`, `exportStaleCloses` effect) and the `focusin` cleanup path read end to end. | Live PPTB round trip of binary `saveFile` is not evidenced in source (see Unverified U-2). |
| 2 ERROR HANDLING | checked | `runExport` try/catch/finally: build failure and save failure toast with `BUILD_FAILED_BODY`/`SAVE_FAILED_BODY`/host message, cancel returns `{status:'cancelled'}` and shows no toast, `releasePreventClose` in `finally`, stale job returns silently. `wrapText` throws on a non-`string[]` layout and surfaces as the build-failed toast. `buildReportModel` throws `Select a file first`. No swallowed errors in the domain files. | Host-adapter message text ("Host call failed: saveFile.") belongs to host-and-shell; noted in Unverified U-5. |
| 3 COMPLETENESS | checked | Compared against AC-8.1 to 8.12, AC-9.1 to 9.10, FR-10: results layout, ring and legend, rail pills, tenant-policy footer, dialog controls and defaults, Markdown order (golden files), PDF header/hero/table/Review first/Not scanned/snapshot/footer/`Page n of m`, redaction aliases, file-name sanitising, scan interval and not-atomic statement. One gap found (finding 001, a registered deviation). | PDF rendering itself (pagination, ring fit) is proven only by tests that cannot run here. |
| 4 DEAD CODE | checked | Reference scans for the exports of `report/`, `export/`, `pageCopy.ts`. `reportFileName`, `ReportModel.format` and `ReportModel.stem` have no production reader (finding 003). `testCmap.ts` is test-only and not bundled. | None. |
| 5 BLOAT | checked | Found the duplicated CheckStatus mappings (finding 002). The `Ctx` cursor helpers in `renderPdf.ts` and the two-pass cleaning in `paragraph`/`write` are intentional and tested. | None. |
| 6 HARDCODING | checked | `rg` for URLs/timers in the domain: none besides spec-fixed values (5 s watchdog text in `exportCopy.ts`, `en` locale for sorting, `42px` title bar in CSS, `'Dev'` label). All are spec-driven or host enums. | None. |
| 7 SECURITY | checked | Markdown: `escapeCell`/`escapeInline` cover `\ \| * _ \` [ ] < >` and `#` as FR-10 requires; newlines collapsed; hostile fixture tested. PDF: every drawn string passes `createTextGuard`; no `doc.html`, `addSvgAsImage`, `addImage` or `fetch` anywhere in `src` (rg), and `html2canvas`/`canvg`/`dompurify` are aliased to `src/lib/emptyModule.ts` in `vite.config.ts`, so no path reaches them. No `dangerouslySetInnerHTML`/`eval`. File names sanitised to `[A-Za-z0-9._-]`. One unverified metadata path (U-1). | jsPDF source not available, `npm audit` blocked; no advisory check for jspdf 4.2.1 / jspdf-autotable 5.0.8 (U-4). |

##### Findings

| ID | Severity | Pass | File:Line | Problem | Evidence | Fix and verification |
|---|---|---|---|---|---|---|
| inspector-ui-and-report-001 | INFO | 3 COMPLETENESS | `src/features/inspector/report/buildReportModel.ts:108` | Each finding's reasons are printed again as "detail" paragraphs in both formats. Trigger: export any report with a Needs-review finding that has reasons (every real finding). Impact: in file-scope Markdown a reason appears in the table Finding cell, in the H3 summary line and again as a detail paragraph; the same happens in the PDF finding block. The on-screen detail tile removes the repeats, so the report no longer "matches the screen" (AC-9.8) and reads as redundant text. | Source-verified. `model/checks.ts:77-81` (supporting) builds `detail` as `[...reasons.map(text), ...notScanned, ...detail]`. `buildReportModel.ts:104` sets `finding` to the joined reasons and `buildReportModel.ts:108` keeps `detail` unfiltered; `sections()` at `buildReportModel.ts:141,145` passes both on. Renderers print both: `renderMarkdown.ts:18` (summary) and `renderMarkdown.ts:21` (each detail), `renderPdf.ts:361` and `renderPdf.ts:364-366`. The screen filters with `FindingDetail.tsx:58` (`notes = detail.filter(line => !reasons.includes(line))`). The fixtures give `detail` without the reasons (`reportFixtures.ts:29`), so the goldens and the long-text count of 3 hide it. Spec deviation register already lists it ("AC-9.2 ... each reason appears twice"), and it is still present at HEAD. | In `checkModel` (`buildReportModel.ts:108`) use `detail: finding.detail.map(redact).filter((line) => !reasons.includes(line))` (both sides already redacted). Verify: add a fixture whose `detail` starts with its reasons (as `makeFinding` produces) and assert each reason appears once in the H3 block of the Markdown golden and in the `drawReport` writes; update the long-text expected count in `renderPdf.test.ts` only if it changes. |
| inspector-ui-and-report-002 | INFO | 5 BLOAT | `src/features/inspector/report/renderPdf.ts:176` | The CheckStatus to RingState mapping and the CheckStatus to status-word mapping each exist twice (screen and report), with no test tying them. Trigger: a maintenance change such as giving Reviewed its own ring segment or renaming a status word. Impact: the screen ring (`ReadinessTile.tsx:9-14`) and the PDF ring (`renderPdf.ts:176-186`) can diverge, and `STATUS_TEXT` (`buildReportModel.ts:9-14`) can drift from `components/checkStatusBadge.ts`, breaking AC-9.7/AC-9.8 ("report matches the screen") silently. | Source-verified: the two ring mappings are the same three-way table in different shapes; `checkStatusBadge.ts` (supporting) and `STATUS_TEXT` carry the same four labels. No test imports both. | Export one `ringStateOf(status)` (e.g. beside `RingState` in `src/lib/ringGeometry.ts`, host-and-shell) and one label lookup, and use them in `ReadinessTile`, `renderPdf` and `buildReportModel`. Verify with an existing ring/status test plus a table test over all four statuses. |
| inspector-ui-and-report-003 | PRUNE | 4 DEAD CODE | `src/features/inspector/report/reportFileName.ts:38` | `reportFileName(model)` and the `ReportModel` fields `format` and `stem` (`reportModel.types.ts:45-46`) have no production reader. Production names the file only through `reportFileNameBeforeBuild` (`inspectorSession.ts:140`, via `inspectorDeps.ts`). | Source-verified by `rg`: non-test references to `reportFileName` are its definition only; `model.stem`/`model.format` are read only inside `filenameOf`, which the dead wrapper and `reportFileNameBeforeBuild` (via `reportIdentity`) both call. Five test assertions use `model.stem`, and `inspectorSession.test.ts:761` and `buildReportModel.test.ts:12-14,99` use `reportFileName` as a parity check between the two paths. Both paths already share `filenameOf`, so the parity holds by construction. No package or external consumer exists (single app bundle). | Remove `reportFileName` and, if the tests are rewritten to call `reportFileNameBeforeBuild`, drop `format` and `stem` from `ReportModel`. Verify with `npm run typecheck && npm test` (blocked here) and by confirming the saved default name is unchanged (`customer-summary-readiness.md`). Low value; may be left if the parity tests are wanted. |

No CRITICAL or WARNING findings were admitted. Checked and clean (no finding row):

- Markdown escaping meets FR-10/AC-9.10 for every field the renderer emits; remaining unescaped characters (`&`, `~`, `(`, `!`, leading `1.`/`-` inside list items) change only formatting, cannot form links, images, raw HTML or extra table columns, because `[`, `<`, `>`, `|`, backtick and newline are neutralised.
- File-name safety: `reportIdentity` replaces every run outside `A-Za-z0-9._-` with `-`, trims `-`, falls back to `site`; no separators, no reserved names (the `-readiness` suffix is always appended).
- Export job truthfulness: cancel returns `null` -> `{status:'cancelled'}` -> silent close; failure toasts; `preventClose`/`releasePreventClose` bracket every job; dialog controls are `aria-disabled` with a reason while busy; a second job cannot start while one exists.
- Dialog a11y (via shared `Modal`): `role="dialog"`, `aria-modal`, labelled title, Tab trap, Esc closes in every phase, focus returns to the opener, entry focus on the checked radio, `role="status"` line.
- Keys: `keyedLines` makes repeated reason/snapshot lines unique; `FilesRail` keys by `fileId`; findings by `check`; `ResultsView` keyed by `scanId`. Effects: only DOM focus and a store counter; both clean up or are one-shot. React 19 and TypeScript rules: no `any`, `!`, `as`, `forwardRef`, `useMemo/useCallback`, `eslint-disable`; discriminated `PageState` with `never` exhaustion.
- Known-and-recorded items I did not re-report: jsPDF/autotable/fonts are statically imported through `inspectorDeps.ts` (spec Implementation Status "Bundle size: Open", P5.8 size gate; react.md prefers `React.lazy`), and the AC-9.8 "saving job is not cancelled" deviation.

##### Unverified candidates

| ID | Source location | What is unresolved | Check needed |
|---|---|---|---|
| U-1 | `src/features/inspector/report/renderPdf.ts:450` (`doc.setProperties({ title: model.title })`) | `model.title` is the only string that reaches jsPDF without `createTextGuard`. For a file-scope report it holds the stored file name unredacted (by spec). If jsPDF 4.2.1 writes the Info `/Title` through `pdfEscape` only (escaping `\`, `(`, `)`) and `output('arraybuffer')` truncates UTF-16 code units to bytes, a name containing characters whose low byte is 0x28, 0x29 or 0x5C (for example U+0428, U+0429, U+0128, U+0129, U+015C, which includes Cyrillic and some CJK letters) could close the Info string early or corrupt the metadata, giving a malformed PDF. Existing tests only use an ASCII title (`renderPdf.test.ts:264,283`) and the Japanese test covers drawn text only. Not verified because the jsPDF source is not on disk and my attempt to download it was denied. | With dependencies installed: build a model whose file name is `Щ(handler)ĩ` and `Ш`, run `renderPdf`, decode bytes as latin1 and inspect the `/Title (...)` entry, then open the file in a PDF validator. If confirmed, pass `model.title` through the same guard (or ASCII-fold it) before `setProperties`; severity would be WARNING (limited failure with a Markdown workaround). |
| U-2 | `src/app/inspector-site/inspectorSession.ts:154` -> `pptbHost.ts:170` | Whether the live PPTB `fileSystem.saveFile` accepts a `Uint8Array` (PDF, about 130 KB to 640 KB per P-09) and writes it byte for byte. The spec lists this as not measured in PPTB (RG-004). | Manual run in PPTB Desktop: export a PDF and open it; also export a Markdown file containing non-ASCII names and confirm UTF-8. |
| U-3 | `src/features/inspector/report/reportFileName.ts:24` | The stem has no length limit. A very long file or site name (the PDF fixture uses 400 characters) gives a default file name over 255 characters, which the OS save dialog may reject. Maximum real name length is not stated in the repository. | Check the Power Pages server logic name limit; try a save with a 400-character name in PPTB. If the limit allows long names, cap the stem (for example 100 characters) after sanitising. |
| U-4 | `package.json` (`jspdf` 4.2.1, `jspdf-autotable` 5.0.8) | `npm audit` could not run, and no advisory data is available offline. Reachability looks small (no `html()`, SVG or image path, fonts are bundled), but I did not check advisories. | Run `npm audit --omit=dev` once `node_modules` exist and map any jspdf advisory to the APIs used (`text`, `splitTextToSize`, `addFont`, `output('arraybuffer')`). |
| U-5 | `src/app/inspector-site/inspectorSession.ts:163-168` (inspector-session-and-scan) | For a host-call failure the error toast body is `error.message`, which the test fixture shows as "Host call failed: saveFile." That is a technical string rather than the plain-language text the host rule asks for. Owned by host-and-shell/session domains; route to the lead. | Read `HostCallError` messages in `src/services/pptb/hostErrors.ts` and decide whether the adapter should map `saveFile` failures to a plain sentence. |
| U-6 | `src/features/inspector/report/pdfTable.ts:128-130` | A continuation row replaces the label column's text with `<label> (continued k/n)`, so any of the label cell's own wrapped lines beyond the first `maxLines` (about 46) would be dropped. Reachable only for a label-column value of roughly 1,400 or more unbroken characters (File column, site scope). Not reachable with the 400-character fixture. | Add a pdfTable test with a 2,000-character file name; if it loses text, split the label column the same way as the other columns. |


#### Lead admission note for inspector-ui-and-report (pre-skeptic)

##### Plan v1 slice — domain inspector-ui-and-report

Lead consolidation note: the reviewer returned 2 INFO, 1 PRUNE and 6 unverified candidates. The lead re-read buildReportModel.ts:100-110 (`detail: finding.detail.map(redact)` unfiltered), checks.ts:74-83 (detail is built as reasons + notScanned + detail), FindingDetail.tsx:58 (screen filters reasons out of detail), renderPdf.ts:176-186 vs ReadinessTile.tsx:9-14 (two CheckStatus→RingState tables), `rg reportFileName` (production uses only reportFileNameBeforeBuild; `reportFileName(model)` has no non-test caller), and spec.md:1100 (deviation register row for AC-9.2). All three findings are admitted with original IDs and no changes.

Plan v1 slice (admitted):
- inspector-ui-and-report-001 (INFO, pass 3) — buildReportModel.ts:108 reasons repeated as detail paragraphs in Markdown and PDF (registered spec deviation AC-9.2, still present)
- inspector-ui-and-report-002 (INFO, pass 5) — renderPdf.ts:176 duplicated CheckStatus→RingState and status-label tables with no tying test
- inspector-ui-and-report-003 (PRUNE, pass 4) — reportFileName.ts:38 `reportFileName(model)` plus `ReportModel.format`/`stem` have no production reader

Unverified candidates U-1–U-6 stay outside the confirmed list. U-5 (export error toast body is the technical `HostCallError` message "Host call failed: saveFile.") is cross-domain and is routed to the lead. The full raw reviewer result is review-inspector-ui-and-report.md next to this file; it is the authoritative slice and coverage record.


## D. Consolidated Plan v1

Plan v1 is the proposed issue list after the lead applied the reviewer admission rules to the raw results and before the skeptic rounds. Every row below was re-checked by the lead against the cited source lines (per-domain notes in the `planv1-*.md` slice files, reproduced in C). No merges were needed at this stage (no two domains reported the same defect). IDs are the reviewers' original IDs; none was renumbered.

| # | ID | Severity | Pass | Primary domain | File:Line | One-line problem |
|---|---|---|---|---|---|---|
| 1 | host-and-shell-001 | WARNING | 7 | host-and-shell | src/services/pptb/pptbHost.test.ts:726 | Retrieval-only `FILE_ACTIONS` refusal branch has no test; the test titled as proving it runs only the normal path |
| 2 | starter-and-objects-002 | WARNING | 7 | starter-and-objects | src/lib/code-analysis/browserChecks.ts:20 | `import … from` regex backtracks superlinearly on long whitespace runs; runs on every keystroke |
| 3 | starter-and-objects-001 | WARNING | 1 | starter-and-objects | src/features/starter/code/CodeEditor.tsx:101 | Recipe switch / Start over text enters undo history; Ctrl+Z restores old recipe code as a user edit |
| 4 | starter-and-objects-003 | WARNING | 2 | starter-and-objects | src/lib/code-analysis/structureAst.ts:47 | Recursive `walk`/`chainOf` without depth guard; RangeError escapes to the root outside every error boundary |
| 5 | inspector-session-and-scan-001 | WARNING | 2 | inspector-session-and-scan | src/features/inspector/scan/parseRecords.ts:219 | Unparseable AllowedDomains content degrades to "no allow list" and yields a reviewable "Outbound calls are blocked" finding |
| 6 | host-and-shell-002 | PRUNE | 4 | host-and-shell | src/app/ExternalLink.tsx:10 | `ExternalLink` has no production render site |
| 7 | host-and-shell-003 | PRUNE | 4 | host-and-shell | src/app/useActiveConnection.ts:48 | `useActiveConnection()` has no production caller |
| 8 | inspector-ui-and-report-003 | PRUNE | 4 | inspector-ui-and-report | src/features/inspector/report/reportFileName.ts:38 | `reportFileName(model)` and `ReportModel.format`/`stem` have no production reader |
| 9 | host-and-shell-004 | INFO | 2 | host-and-shell | src/services/pptb/pptbHost.ts:111 | `as () => void` cast against typescript.md |
| 10 | generators-and-catalogue-001 | INFO | 3 | generators-and-catalogue | src/services/generators/handlers/demoPages.ts:538 | R5 demo page sends `Age: 0` when the cell is blanked |
| 11 | generators-and-catalogue-002 | INFO | 3 | generators-and-catalogue | src/services/generators/package/readme.ts:192 | Upstream-credentials line rendered without a heading |
| 12 | generators-and-catalogue-003 | INFO | 3 | generators-and-catalogue | src/services/generators/package/readme.ts:72 | Descriptive web role rendered as a literal role name in README step 5 |
| 13 | inspector-ui-and-report-001 | INFO | 3 | inspector-ui-and-report | src/features/inspector/report/buildReportModel.ts:108 | Reasons repeated as detail paragraphs in Markdown and PDF |
| 14 | starter-and-objects-006 | INFO | 3 | starter-and-objects | src/lib/code-analysis/browserChecks.ts:62 | Line numbers count U+2028/U+2029; the editor does not |
| 15 | inspector-ui-and-report-002 | INFO | 5 | inspector-ui-and-report | src/features/inspector/report/renderPdf.ts:176 | CheckStatus→RingState and status-label tables duplicated |
| 16 | starter-and-objects-004 | INFO | 5 | starter-and-objects | src/features/starter/inputs/RecipeCombobox.tsx:59 | Derived count lifted via effect; redundant `useCallback`s; `as unknown as` cast |
| 17 | starter-and-objects-005 | INFO | 5 | starter-and-objects | src/app/starter-session/applyTextChanges.ts:4 | Duplicates `structureInsert.applyChanges` with a different ordering contract |

Plan v1 totals: 0 CRITICAL, 5 WARNING, 3 PRUNE, 9 INFO (17 findings). Unverified candidates (27 across the five domains) and coverage limits were kept separate in each raw result (Section C) and were not promoted.


## E. Skeptic Transcripts (per domain)

One isolated Opus 5.5 skeptic round per domain. Each packet carried only that domain's Plan v1 slice, its raw result, the admission and coverage standards, the skeptic procedure, round template and severity guide; no skeptic saw another domain's findings (each confirmed the isolation check). The lead's responses are recorded inline. No targeted follow-up round was needed: the one new finding (host-and-shell-005) arose inside its own domain's round from the skeptic's own evidence and was verified by the lead, and the one merge (U5 into starter-and-objects-003) stayed within its domain. No round could not run.


### E.1 host-and-shell

### Skeptic Round — Domain: host-and-shell

#### Input

- Source snapshot: /home/user/PowerPage-ServerLogic, branch `refine-app`, HEAD `8dff4f1a2d55f085f7a98a16e19f72656dd52808` (`git rev-parse HEAD`, re-checked this round). `git diff --stat 309eb14 HEAD -- src tests eslint.config.ts package.json tsconfig*.json vite.config.ts` printed nothing: the only commits after `309eb14` (`7f24e80`, `8dff4f1`) are docs.
- Domain's Plan v1 slice: `planv1-host-and-shell.md` admits four findings under their original IDs, no aliases: host-and-shell-001 (WARNING, pass 7), -002 (PRUNE, pass 4), -003 (PRUNE, pass 4), -004 (INFO, pass 2). Unverified candidates U1–U4 are kept outside the confirmed list. The lead asked an open question about -001's severity and File:Line.
- Coverage record and limitations: `review-host-and-shell.md`, the authoritative slice and coverage record. It says 90 of 103 files were reviewed and 13 binaries or licence files were excluded. Seven passes are marked "checked". node_modules is absent, so typecheck, lint, test and audit were blocked. Most test files were read by title only, three were not read at all, and `pptbHost.test.ts` was read at lines 1-130 and 640-733 only.
- Relevant source evidence and access limits: I read these myself with `cat -n`, `sed -n`, `rg` and `git log/show/diff`:
  - Source: `src/services/pptb/pptbHost.ts` (all 226 lines), `dataverseFiles.ts` (in full), `pptbHost.test.ts` (1-80, 130-140, 600-733, plus every `it`/`describe` title), `dataverseFiles.test.ts:198-206`, `ConnectionProvider.tsx` (in full), `ConnectionProvider.test.tsx` (1-60, 104-128, titles), `useActiveConnection.ts`, `ExternalLink.tsx`, `main.tsx`, `App.tsx`, `useHostTheme.ts`, `NotifyProvider.tsx`, `eslint.config.ts`, and `package.json` (versions).
  - Spec (`docs/specs/001-server-logic-starter-inspector/spec.md`): lines 141 (AC-1.6), 259 (AC-6.5), 375-400 (FR-1), 405-425, 630, 745, 1075-1110 (Implementation Status deviation table) and 1241.
  - Docs: `docs/phase-5/evidence/p5-7/execution.md:44-112` and `findings/logic/probe_findings.md:15-19`.
  - Git: commit `3a446bb` (diff of `src/features`).
  - Limits: nothing was executed. No vitest, lint, typecheck or mutation run. Every statement below is source-verified or owner-recorded, never reproduced. The packet contains no other domain's findings. I did not open any other domain's review or plan file.

#### Challenges and Lead Responses

- **ID:** SK-host-and-shell-001
- **Challenge:** host-and-shell-001's WARNING grade ("demonstrated maintenance hazard") is not established. The stated trigger is "a maintenance change that removes or weakens the runtime FILE_ACTIONS check". That edit alone causes no failure. A disallowed operation reaches `window.dataverseAPI.execute` only if a second, independent edit also widens the static contract. Two edits are needed:
  - `FileAction.operationName` is the two-member literal union `'InitializeFileBlocksDownload' | 'DownloadBlock'` and `operationType: 'action'` (`dataverseFiles.ts:8-13`). `FileDeps.execute` accepts only `FileAction`.
  - The only callers (`dataverseFiles.ts:75-85`, `:97-101`) hard-code both names. The `files` closure (`pptbHost.ts:140-148`) is never exported, and spec line 630 forbids handing features a generic execute.
  
  The finding names no change scenario in which one plausible edit sends a forbidden operation. Without one, the hazard is hypothetical, and the severity guide asks for demonstrated impact under the trigger, not a pattern.
- **Failure mode:** an untested defence-in-depth line is graded above the threshold the guide sets. It would then rank above real limited failures in the report and overstate a retrieval-only risk to the owner.
- **Evidence:**
  - host-and-shell-001 row.
  - `pptbHost.ts:128` types `FILE_ACTIONS` as `ReadonlySet<string>`. The runtime check at `:142-144` tests `operationName` only.
  - The spec already records the runtime check's scope as a known deviation: spec.md:1093 says "Checked at runtime by name only; `operationType: 'action'` is enforced by the TypeScript type, not re-checked (the project rule asks for both)." The reviewer does not cite this row, but its optional fix ("also check `operationType === 'action'`") targets that documented, owner-visible deviation.
  - The fix also exports a new `createFileExecutor` from `services/pptb/`. That adds a public execute-shaped factory to the adapter module, which spec line 630 wants to avoid exposing.
  - The claim that "no public-API test can reach it" is true only if `vi.mock` of `./dataverseFiles` is ruled out. `.claude/rules/tooling.md` discourages ad hoc module mocks but does not make the branch technically unreachable from tests.
- **Questions:**
  - Which single maintenance edit, under the current types, leads to a forbidden `execute` call? If none, does the item meet WARNING, or only INFO (a concrete consequence: a spec-mandated runtime control, spec 630/745, has no failing test)?
  - Does the fix's export of an execute factory conflict with spec 630?
  - Should the `operationType` suggestion be dropped or re-framed, given that spec.md:1093 already records it?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read dataverseFiles.ts:8-13 (`FileAction.operationName` is the two-member literal union and `operationType: 'action'`), :75-85 and :97-101 (both callers hard-code the names), pptbHost.ts:128-148 (the guard and the unexported `files` closure) and spec.md:630, :745, :1093. No single maintenance edit under the current types can send a forbidden operation; the guard is defence in depth behind a static contract, so a "demonstrated maintenance hazard" is not shown and WARNING is not supported. A concrete, low consequence remains: a spec-mandated runtime control (spec.md:630, :745) has no test that exercises its refusal branch, and the test whose title claims to prove it does not. That meets INFO. The `operationType` suggestion is dropped because spec.md:1093 already records that deviation for the owner; the `createFileExecutor` export is dropped because it adds an execute-shaped surface that spec.md:630 wants kept out of reach.
  - **Plan Delta:** host-and-shell-001: Severity WARNING → INFO. Fix before → after: "Extract the guard so it is testable (createFileExecutor …) … optionally also check operationType" → see SK-host-and-shell-002 for the chosen cause and fix. Evidence adds spec.md:630, :745, :1093 and dataverseFiles.ts:8-13.

- **ID:** SK-host-and-shell-002
- **Challenge:** host-and-shell-001's File:Line (`pptbHost.test.ts:726`) and its Problem text describe two different defects. Each would need a different source location and a different fix. The reviewer procedure (domain-reviewer.md:46) says "File:Line must identify the source of the defect".
  - Defect A: the test titled "refuses to execute any operation other than the two download actions" (`pptbHost.test.ts:726-731`) asserts only that the normal path sent allowed names. Its comment says "prove no other name can be sent". It duplicates `:625-634` and `dataverseFiles.test.ts:200-205` and never runs the refusal branch. The source of this defect is the test file. The smallest fix is to the test (title or body), not an adapter refactor.
  - Defect B: the guard cannot be exercised through the public API. Its source is `pptbHost.ts:140-146`, and that is where the proposed fix edits.
  
  The row cites one location and fixes the other.
  
  A similar case sits in the same block: `:714-724` ("refuses to reach a write member, as the guard proves") exercises only the test file's own `guarded` Proxy, not adapter code. It is harmless, because `:681-712` is the real check, but it shows test titles in this block over-claiming. The reviewer read this block and did not note it.
- **Failure mode:** the lead admits a finding whose location and fix don't match. A patcher either edits the wrong file or applies a structural refactor where renaming or rewriting a misleading test was the established cause.
- **Evidence:** `pptbHost.test.ts:625-634`, `:714-731` (read this round). `dataverseFiles.test.ts:200-205`. `rg -n "vi\.mock|vi\.doMock|Refused" src/services src/app src/test` (exit 0) matches only `pptbHost.ts:143` for "Refused" and finds no module mocks, so the conclusion that no test runs the branch holds.
- **Questions:**
  - Is host-and-shell-001 Defect A (mislabelled test, File:Line in the test file) or Defect B (untestable guard, File:Line `pptbHost.ts:140-146`)?
  - Does the recommended fix match the chosen cause?
  - Does pointing File:Line at a test file satisfy domain-reviewer.md:46 when the fix edits production code?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read pptbHost.test.ts:625-634, :714-731 and dataverseFiles.test.ts:200-205. The established cause is Defect A: a test whose title and comment ("refuses to execute any operation other than…", "prove no other name can be sent") promise a refusal check that the body does not perform; it duplicates :625-634. Defect B (the guard is unreachable through the public API) is the reason the test cannot be written as titled without a code change, and is recorded as context, not as the defect. The reviewer procedure's File:Line rule is satisfied by the test file because the defect is in the test. The smallest change is to the test. If the owner wants the refusal branch itself covered, the minimal production change is a pure exported predicate (e.g. `isFileAction(name: string): boolean` used by the guard), which is not an execute interface; that option is recorded as secondary.
  - **Plan Delta:** host-and-shell-001: File:Line stays src/services/pptb/pptbHost.test.ts:726 (defect A). Problem before → after: "the retrieval-only guard is untested and unreachable…" → "the test titled 'refuses to execute any operation other than the two download actions' (:726-731) runs only the normal download path and duplicates :625-634; the guard's refusal branch (pptbHost.ts:142-144) has no test, and cannot be reached through the public API because `FileAction` and its callers fix the names." Fix before → after: "retitle the test to what it asserts (e.g. 'sends only the two download actions on the normal path') or delete the duplicate; optionally extract the name check into an exported pure predicate in pptbHost.ts and unit-test it with 'CreateRecord'. Do not export an execute factory. Verify with `npx vitest run src/services/pptb/pptbHost.test.ts` once dependencies are installed." Also recorded as an observation: :714-724 exercises only the test file's own Proxy.

- **ID:** SK-host-and-shell-003
- **Challenge:** host-and-shell-002's admission evidence is incomplete in both directions, and its fix is not a single change.
  - (a) Both the slice note's "FR-1 mandates the mechanism" and the reviewer's caveat misread FR-1. Spec.md:388 reads "Open external links (Learn or GitHub) only when the user selects them, through `openInConnectionBrowser`". That is a constraint on any link that exists, not a requirement that one exists. No AC asks for a clickable link: AC-3.3, AC-3.10 and AC-6.5 (spec.md:177, 184, 259) require generated comments, README text and an object detail with no Learn link.
  - (b) The reviewer cites old plans that intended a Learn link (phase-23 plan:776, and `plan-inspector.md:54` "Use … `ExternalLink` for Learn links"). It misses commit `3a446bb` (2026-10-30), whose message says "Removed external link to Microsoft Learn from `ObjectDetail.tsx`". That commit deleted the last `<ExternalLink>` render site (`git log -S"<ExternalLink" -- src` → `3a446bb`, `813a0ab`). It is direct evidence that the owner removed the use on purpose. That supports "demonstrably unnecessary" more strongly than the stale plans weaken it.
  - (c) The fix still reads "Owner decision first: either remove … or keep". A PRUNE has to be demonstrably unnecessary, with the smallest change. An either/or that defers to the owner is not that.
  - (d) The verification step is incomplete. Removing `openExternal` changes the `PptbHost` interface (`host.types.ts:46`, also specified in `plan-starter.md:176`). It also requires removing `'toolboxAPI.utils.openInConnectionBrowser'` from the `ALLOWED` list in `pptbHost.test.ts:645-658`, because `:709-711` asserts that the touched set equals `ALLOWED` minus `events.off`. The proposed check, `rg ExternalLink|openExternal src` returning nothing, would not catch that leftover string. There is also no runtime or bundle cost today, since nothing imports the component. The only benefit is maintenance surface.
- **Failure mode:** the item is graded on stale plan intent and a mis-stated FR-1 mandate. Either a demonstrably dead path stays hedged, or a removal is applied that fails the retrieval-only test and silently drops an adapter contract named in the plan.
- **Evidence:**
  - spec.md:177, 184, 259, 388.
  - `git show 3a446bb -- src/features | grep ExternalLink`, which shows the import and `<ExternalLink href={SERVER_OBJECTS_LEARN_URL}>` removed.
  - `rg -n "SERVER_OBJECTS_LEARN_URL|_LEARN_URL" src tests` exits 1 (no leftover constant).
  - `rg -n "openExternal|ExternalLink" src tests -g '!*.test.*'` finds only `ExternalLink.tsx`, `fakeHost.ts:51,66,114,175-176`, `pptbHost.ts:184` and `host.types.ts:46`.
  - `pptbHost.test.ts:645-658` and `:709-711`.
- **Questions:**
  - With FR-1 read as a constraint and `3a446bb` as the owner's removal, is host-and-shell-002 a plain PRUNE with one fix?
  - Must the fix and its verification name the `PptbHost` contract change and the `ALLOWED`-list edit?
  - If the lead keeps the owner-decision hedge, does the item still meet PRUNE admission?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read spec.md:388 (FR-1 constrains how links open; it does not require one), :177, :184, :259 (no AC asks for a clickable link), `git log -S'<ExternalLink' -- src` (3a446bb, 813a0ab) and the 3a446bb message ("Removed external link to Microsoft Learn from ObjectDetail.tsx and corresponding tests"). The owner removed the last render site deliberately on 2026-10-30, which makes the component demonstrably unnecessary; the "owner decision first" hedge is withdrawn and the slice note's "FR-1 mandates the mechanism" is corrected. The fix must name the `PptbHost.openExternal` contract change (host.types.ts:46), the fake host members, and the `ALLOWED` list and equality assertion in pptbHost.test.ts:645-658 and :709-711, which the reviewer's `rg` verification would not catch.
  - **Plan Delta:** host-and-shell-002: Evidence before → after: adds spec.md:388 read as a constraint, AC-3.3/3.10/6.5 (no link required), commit 3a446bb (last `<ExternalLink>` removed deliberately), and `rg SERVER_OBJECTS_LEARN_URL` exit 1. Fix before → after: "Owner decision first: either remove … or keep" → "Remove ExternalLink.tsx and ExternalLink.test.tsx, `openExternal` from the `PptbHost` type (host.types.ts:46), pptbHost.ts:184-189 and `isHttpUrl`, the fake's `openExternal`/`setOpenExternal` (fakeHost.ts:51,66,114,175-176), the related cases in pptbHost.test.ts and fakeHost.test.ts, and the `'toolboxAPI.utils.openInConnectionBrowser'` entry in the `ALLOWED` list (pptbHost.test.ts:645-658) so the equality at :709-711 still holds. Verify with `rg -n 'openExternal|ExternalLink|openInConnectionBrowser' src tests` returning nothing and `npm run typecheck && npm test`." Severity unchanged (PRUNE).

- **ID:** SK-host-and-shell-004
- **Challenge:** host-and-shell-004 has no concrete consequence and should not be graded INFO.
  - The reviewer itself states "no failure is demonstrated".
  - The only possible consequence would be a lint gate failure. The owner-recorded final gates at `309eb14` show `npm run lint` exit 0 (`docs/phase-5/evidence/p5-7/execution.md:104-110`), and `src` is unchanged from `309eb14` to HEAD. This is recorded evidence, not reproduced here.
  - The proposed fix, `isDisposer(value: unknown): value is () => void { return typeof value === 'function'; }`, makes the same unchecked claim as the cast, moved into a type predicate. Runtime behaviour is identical, so the fix changes nothing observable.
  - That leaves a stylistic or rule-letter preference, which severity-guide.md excludes from INFO ("Do not use this category for … stylistic preferences").
  - The row also omits the related widening at `pptbHost.ts:106` (`const events: { on: (callback: typeof hub) => unknown } = window.toolboxAPI.events;`). That assignment is what makes the cast necessary.
- **Failure mode:** a rule-letter observation with no behavioural or gate impact is reported as a verified finding. The suggested fix would not change behaviour.
- **Evidence:** `pptbHost.ts:106-113`. execution.md:104-110. Empty `git diff --stat 309eb14 HEAD -- src …`. severity-guide.md INFO row.
- **Questions:**
  - What concrete consequence, below WARNING, does the cast have under any trigger?
  - If there is none, should host-and-shell-004 leave the confirmed list (dropped, or kept as a coverage note on typescript.md compliance)?
  - Does a `typeof`-based predicate meet typescript.md's "narrow with a type guard" any better than the cast?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read pptbHost.ts:106-113 and docs/phase-5/evidence/p5-7/execution.md:104-110 (owner-recorded `npm run lint` exit 0 at 309eb14) and confirmed `git diff --stat 309eb14 HEAD -- src tests eslint.config.ts package.json` is empty. The cast has no behavioural consequence (the call sits inside detach's try/catch), the lint gate is recorded green on identical source, and the proposed `typeof` predicate is behaviourally identical to the cast. That leaves a rule-letter preference, which the severity guide excludes from INFO.
  - **Plan Delta:** host-and-shell-004: REMOVED from confirmed findings (INFO → not admitted). Retained as a non-finding observation on typescript.md compliance: pptbHost.ts:106 widens `events` to `{ on: (callback) => unknown }` and :111 casts the result; both could be replaced by a type guard without behaviour change. ID reserved, not reused.

- **ID:** SK-host-and-shell-005
- **Challenge:** U4 (React Compiler lint on `ConnectionProvider.tsx`) is left "unverified, lint blocked", but evidence available offline resolves the question it poses.
  - The project's own P5.7 execution record lists `npm run lint` exit 0 at `309eb14`. It is the final gate, run with `--max-warnings=0` per `package.json`/tooling.md. Earlier slices also record lint exit 0 (execution.md:64, 80, 101).
  - `ConnectionProvider.tsx` last changed in `58d1fcb`, before `309eb14` (`git log -- src/app/ConnectionProvider.tsx`).
  - `src`, `eslint.config.ts` and `package.json` are unchanged since then.
  - `eslint.config.ts:34` enables `reactHooks.configs.flat.recommended` with `eslint-plugin-react-hooks` `^7.1.1`.
  
  The same unused evidence also bears on the whole coverage record. A recorded `npm test` of 115 files and 2000 tests passing at the same snapshot appears nowhere in the coverage table, where it should be recorded as owner-recorded rather than executed.
- **Failure mode:** an answerable candidate stays open. That inflates the unverified list and understates what is known about the blocked lint, typecheck and test checks.
- **Evidence:** `docs/phase-5/evidence/p5-7/execution.md:44-112`. `git log --format='%h %s' -- src/app/ConnectionProvider.tsx` → `58d1fcb`, `028e480`. `git log --oneline 309eb14..HEAD` → two docs commits. `eslint.config.ts:28-37`. `package.json:58`. No command here re-ran lint.
- **Questions:**
  - Does owner-recorded gate evidence at an unchanged `src` snapshot close U4, recorded as "owner-recorded lint exit 0, not reproduced"?
  - Should the coverage record list these recorded results next to the "Blocked checks" line, distinct from checks this audit ran?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read execution.md:100-112: at 309eb14 the owner recorded `npm run typecheck` exit 0, `npm run lint` exit 0 and `npm test` 115 files / 2000 tests passed; `git log -- src/app/ConnectionProvider.tsx` shows its last change (58d1fcb) precedes 309eb14, and src, eslint.config.ts and package.json are unchanged to HEAD. Owner-recorded evidence on identical source answers U4's question. It is recorded as owner-recorded, not reproduced, and applies to every domain's blocked typecheck/lint/test checks.
  - **Plan Delta:** Unverified U4 → resolved, no finding (owner-recorded lint exit 0 at 309eb14, source unchanged; not reproduced here). Coverage record gains a line next to Blocked checks: "Owner-recorded at 309eb14 (docs/phase-5/evidence/p5-7/execution.md:104-110): typecheck exit 0, lint exit 0, 2000/2000 tests passed; src unchanged since. Not reproduced in this audit." The lead also ran `npm audit --omit=dev --json` from the lockfile (exit 0, 0 vulnerabilities across 39 production dependencies; dev dependencies not audited); recorded as a lead-executed check.

- **ID:** SK-host-and-shell-006
- **Challenge:** U2 (`main.tsx:21-38` waits on `host.getTheme()` with no timeout) frames the missing evidence too narrowly.
  - The reviewer asks only whether `getCurrentTheme` can hang. But AC-1.6 (spec.md:141) says "If the host can't answer, the tool keeps its current theme, or uses light at launch". `.claude/rules/pptb-host-and-output.md` says "before first render (light if it fails)".
  - A call that is slow or never settles leaves an empty `#root`. The tool then does not "use light at launch". It renders nothing until the host answers, and `hostCall` adds no time bound (`pptbHost.ts:55-62`).
  - The project has recorded host latency of this kind at startup: `findings/logic/probe_findings.md:17` reports a first `getActiveConnection()` call that "rejected … after about 10 seconds". That observation was on a different host API, so it does not prove the trigger for `getCurrentTheme`. It does make the trigger more than speculative, and the reviewer's own cross-domain note cites it.
- **Failure mode:** if the host answers slowly at launch, the user sees a blank tool window for the length of the delay, against AC-1.6's "uses light at launch". It recovers once the call settles, which would make it a WARNING-class limited failure. If it never settles, the window stays blank. Leaving U2 under "no concrete trigger" hides the spec clause it would breach.
- **Evidence:** `src/main.tsx:21-38`, `src/services/pptb/pptbHost.ts:151-156` and `:55-62`, spec.md:141, `findings/logic/probe_findings.md:17`. Live PPTB timing for `getCurrentTheme` is unavailable to me.
- **Questions:**
  - Does AC-1.6's "can't answer → light at launch" cover a delayed or unanswered call, making the untimed wait a spec gap rather than a hypothetical?
  - Is the 10 s startup rejection on another host API enough of a trigger to admit U2, or does it stay unverified with the S2-style live check named?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read main.tsx:18-40 (first render awaits `getTheme()` with only a `.catch` for rejection), pptbHost.ts:55-62 and :151-156 (no time bound), spec.md:141 (AC-1.6: "If the host can't answer … uses light at launch") and findings/logic/probe_findings.md:17 (a different startup host call rejected after about 10 s). The reframing is correct: a slow or unsettled `getCurrentTheme` leaves #root empty, which is not "light at launch". Admission still fails on impact evidence: no observation of `getCurrentTheme` delaying exists, and a rejection (the observed failure shape) is handled. U2 stays unverified with the stronger framing and a provisional grade.
  - **Plan Delta:** Unverified U2, before → after: trigger adds "a slow or never-settling `getCurrentTheme()`; AC-1.6 requires light at launch when the host can't answer"; evidence adds spec.md:141 and probe_findings.md:17 (10 s startup rejection on getActiveConnection, different API); provisional grade "WARNING if a live PPTB launch shows a measurable delay"; check needed: time `getCurrentTheme()` at launch in PPTB Desktop, and if it can exceed about one second, race it with a short timeout falling back to light. Still not a confirmed finding.

- **ID:** SK-host-and-shell-007
- **Challenge:** U3's stated blocker is mostly answered, and what remains is a scope question, not a missing check.
  - The spec names exactly the four embedded faces (spec.md:1241: "DM Sans 400 and 700, Space Grotesk 700 and JetBrains Mono 400").
  - `pdfFonts.test.ts:19-27` reads only `PDF_FACE_FILES[face]` by name, with no directory enumeration.
  - `rg` finds `DMSans_500Medium|SpaceGrotesk_400Regular|SpaceGrotesk_500Medium` only in `plans/phase-00-skeleton.md:2085-2089` (the copy commands). `scripts/`, `src`, `tests`, `vite.config.ts` and `package.json` contain no reference to them.
  - `public/` has no `licenses` directory.
  
  The open question is whether the packet's exclusion of binary fonts ("not reviewable source"; "Respect the user's exclusions") bars a reference-only dead-file conclusion about them. If it does, U3 belongs in an excluded or out-of-scope note, not among unverified candidates awaiting a check. If it doesn't, the evidence may now meet PRUNE.
- **Failure mode:** U3 sits in the unverified list implying a pending check that is mostly done. Or a PRUNE is admitted on files the user excluded.
- **Evidence:** spec.md:1241. `src/features/inspector/report/pdfFonts.test.ts:19-27`. `ls src/assets/fonts public`. The `rg` above (exit 0, matches in the phase-00 plan only).
- **Questions:**
  - Does the binary-font exclusion forbid any finding on those files?
  - If so, should U3 be recorded as an out-of-scope observation and removed from the unverified candidates? If not, does the evidence above satisfy the DEAD CODE pass for PRUNE?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** The binary exclusion set by the lead covered content review of the font files, not reference analysis of whether they are used; a DEAD CODE conclusion from references is within scope for files under src/. Lead verified: `rg -n 'DMSans_500Medium|SpaceGrotesk_400Regular|SpaceGrotesk_500Medium' src tests scripts vite.config.ts package.json public` exits 1 (no matches); fonts.css references only the three JetBrains Mono woff2 files; pdfFonts.ts imports DMSans 400/700, SpaceGrotesk 700 and JetBrainsMono 400; libraryProbe.ts imports DMSans 400; spec.md:1241 names exactly those four faces. The three TTFs (about 229 KB tracked) are not imported, not bundled, not enumerated by any test and not required by the spec. Deletion preserves supported behaviour and external contracts; the OFL licence texts stay because the remaining DM Sans and Space Grotesk faces still need them. Admitted as a new PRUNE finding with the next unused ID in this domain, triggered by this challenge.
  - **Plan Delta:** NEW finding host-and-shell-005 (PRUNE, pass 4 DEAD CODE), File:Line src/assets/fonts/DMSans_500Medium.ttf:1 (also SpaceGrotesk_400Regular.ttf, SpaceGrotesk_500Medium.ttf). Problem: three tracked font binaries with no importer, no CSS reference and no spec role. Evidence: rg exit 1 as above; fonts.css; pdfFonts.ts:2-5; libraryProbe.ts:12; spec.md:1241. Fix: delete the three files; verify with `rg -n 'DMSans_500Medium|SpaceGrotesk_400Regular|SpaceGrotesk_500Medium' .` returning only docs/plans text and `npm run build && npm test`. Unverified U3 → superseded by host-and-shell-005. Triggering challenge: SK-host-and-shell-007.

- **ID:** SK-host-and-shell-008
- **Challenge:** Several "checked" rows rest on test evidence the reviewer did not read, and their Limitation cells don't say so.
  - The Coverage record admits that most test bodies were read as titles only, three test files were not read at all, and `pptbHost.test.ts:130-640` was not read. The per-pass table still shows passes 1, 2, 3 and 7 as "checked", with limitations that mention only "cannot run the app or tests" or live-host behaviour.
  - The domain's own admitted finding (host-and-shell-001) is a test whose title claims a behaviour its body does not exercise. SK-host-and-shell-002 notes a second one at `:714`. In this suite, titles are demonstrably not reliable evidence of what is asserted.
  - Specific dependencies on unread bodies:
    - host-and-shell-004's verification cites "existing disposer cases at lines 381-430", which is inside the unread range.
    - Pass 3's "the refusal branch … is not covered by any test" leans on `dataverseFiles.test.ts:200` read by title. I confirmed the conclusion independently (SK-host-and-shell-002 evidence), but the record does not show that the reviewer did.
    - Pass 4's per-export importer counts come from loop command #21, whose per-symbol output is not recorded, so the "checked" claim cannot be audited from the record.
- **Failure mode:** a reader treats passes 2, 3 and 7 as clean, including "a test masks no defect", when the bodies that could mask defects in the notify fallback, theme re-read, connection-identity and event-hub behaviours were never read.
- **Evidence:** the review's "Reviewed as test evidence" list, the coverage table rows 1-4 and 7, and commands table rows 15 and 21. `pptbHost.test.ts:381-430` (titles at 381, 397, 408, 418, 430 only, by my `grep`). `pptbHost.test.ts:714-731`.
- **Questions:**
  - Should the Limitation cells for passes 1, 2, 3 and 7 state that test bodies were read by title only, and say whether masked defects were ruled out?
  - Should pass 4 record the export-loop output, or downgrade its status, so the dead-code coverage is auditable?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead compared the reviewer's 'Reviewed as test evidence' list with the coverage rows: passes 1, 2, 3 and 7 say checked with limitations that mention only execution and live-host behaviour, while pptbHost.test.ts:130-640 and three test files were unread and most others were read by title. Source for every pass was read in full, so the statuses stand, but the limitation cells must say that test bodies were largely unread and that masked defects were not ruled out from tests. Pass 4's export-importer loop output was not preserved; the lead spot-checked the two PRUNE conclusions (ExternalLink, useActiveConnection) and the new font PRUNE with its own rg runs, which is recorded.
  - **Plan Delta:** Coverage table before → after: passes 1, 2, 3, 7 limitation cells add "test bodies read by title only (pptbHost.test.ts:130-640 and contracts/releasedPages/connectionLabel tests unread); masked defects not ruled out from tests; conclusions rest on source". Pass 4 limitation adds "per-export loop output not recorded; lead re-ran `rg` for ExternalLink, useActiveConnection( and the three font names (results in the round file)". Statuses unchanged. host-and-shell-004's reference to pptbHost.test.ts:381-430 is moot (finding removed under SK-004).

Checked with no challenge raised:
- host-and-shell-003: `rg` shows `ConnectionState`, `useConnectionState`, `useRefreshConnection`, `connectionKey` and the contexts in production use (`InspectorPage.tsx:4-5`, `pageState.ts:2`, `SitePill.tsx:4-5`, `TitleBar.tsx:3`, `connectionLabel.ts:1`, `inspector-site/*`, `ConnectionProvider.tsx:5-10`). Only lines 47-51 are deleted, so the PRUNE is safe for type importers. The fix's parenthetical about the `Connection` import is moot because it stays used at `useActiveConnection.ts:12, 35`.
- U1 (no shell-level error boundary): `App.tsx:69-103` matches the reviewer's description. No throwing render path was found, so it stays unverified.


### E.2 starter-and-objects

### Skeptic Round — Domain: starter-and-objects

#### Input

- **Source snapshot:** /home/user/PowerPage-ServerLogic, branch `refine-app`, HEAD `8dff4f1a2d55f085f7a98a16e19f72656dd52808` (re-checked with `git rev-parse HEAD`, exit 0; `git status --short` was empty). No repository file was edited and nothing was installed.
- **Domain's Plan v1 slice:** `work/planv1-starter-and-objects.md`. Admitted with their original IDs and no aliases: starter-and-objects-001 (WARNING, pass 1), -002 (WARNING, pass 7), -003 (WARNING, pass 2), -004 (INFO, pass 5), -005 (INFO, pass 5), -006 (INFO, pass 3). Unverified candidates U1–U7 sit outside the confirmed list. The authoritative slice text and coverage record are in `work/review-starter-and-objects.md`.
- **Coverage record and limitations (as the reviewer states them):** all 7 passes are marked "checked". 13 test files were not opened, 11 more were read by title only, and `starter.css` / `serverObjects.css` were searched but not read. Typecheck, lint and Vitest are blocked because `node_modules` is absent. Regex and RangeError results come from scratch replicas run under Node 22 with acorn 8.18, while the project pins acorn 8.19.0 (`package-lock.json:1958-1961`).
- **Isolation check:** the packet holds only this domain's slice. Other domains' files are in the work directory, and I did not open any of their review, plan or skeptic files.
- **Source evidence I read and checks I ran myself:**
  - Read with `cat -n` / `sed -n`:
    - `CodeEditor.tsx`, `ServerPane.tsx`, `starterReducer.ts`, `deriveStarter.ts`, `StarterSessionProvider.tsx`, `applyTextChanges.ts` (+ `.test.ts`)
    - `structureAst.ts`, `structure.ts:25-98,100-260`, `structureInsert.ts:60-82`, `browserChecks.ts` (+ perf block of its test)
    - `RecipeCombobox.tsx:1-140`, `StarterInputs.tsx:215-245`, `PermissionNote.tsx:40-63`, `insertion.ts`, `lineDecorations.ts`, `lib/text.ts`
    - `CodeEditor.test.tsx:60-80`, `ServerPane.test.tsx:50-90`
    - supporting files: `App.tsx`, `main.tsx`, `PageErrorBoundary.tsx`, `client.ts:30-50`, `recipes.ts` (checklistLines, R4/R7/R9/R10)
    - spec: undo/300 ms/NFR lines and the Implementation alignment section
    - plans: `phase-18a-starter-session.md:25-45`, `phase-21-starter-code-panes.md:128-136,250-270`, `phase-02-browser-checks.md:10`
  - acorn 8.18 `dist/acorn.js:625,764-773` (`catchStackOverflow`).
  - CodeMirror `lineSeparator` facet docs, read through Context7 (`/codemirror/state`).
  - Scratch runs in `<scratchpad>/exp-so/`, on copies only:
    - `node redos.cjs` (exit 0)
    - `t3.ts mem 4000|4500|8000|12000|20000|50000` (exit 0 each, under `timeout 30`)
    - new `sk-realistic.ts` (exit 0)
    - new `sk-ties.cjs` (exit 0)
  - Blocked: fetching the acorn 8.19.0 tarball to confirm `catchStackOverflow` was denied by the permission system, so the pinned version is unverified. CodeMirror and React runtime behaviour could only be reasoned from source and docs.
- **Checked with no challenge:** -006. The CodeMirror half that the reviewer recalled from memory is now documented. With no `lineSeparator` facet configured, "any of `\n`, `\r\n`, `\r` is treated as a separator" (Context7, `@codemirror/state` `lineSeparator`). `normalizeLf` (`lib/text.ts:2-4`) leaves U+2028/U+2029 in place. Plan `phase-02-browser-checks.md:10` records the intent that lines "match the editor", which supports the finding. The lead may raise its evidence label from "recalled" to "documented".

#### Challenges and Lead Responses

##### SK-starter-and-objects-001

- **ID:** SK-starter-and-objects-001
- **Challenge:** starter-and-objects-001 is admitted as a WIRING defect "against intended behaviour". The approved Phase 21 plan explicitly specifies this behaviour, and the code documents it. The reviewer's claim that "Phase 18a Decision 1 intends undo only for Server Objects inserts (AC-6.8)" misreads that decision.
- **Failure mode:** The finding stays a WARNING for behaviour the owner chose. Its fix (`addToHistory.of(false)` plus clearing history on regenerate) would then remove a planned behaviour and break the plan's contract rather than repair a defect.
- **Evidence:**
  - `plans/phase-21-starter-code-panes.md:134` says: "Recipe switches and Start over are undoable like any outside change: Ctrl+Z after them restores the old text as an ordinary edit, which the session then treats as edited." `:7` says the editor "takes outside changes (recipe switch, Start over, Server Objects insert) as one minimal, undoable change".
  - `CodeEditor.tsx:32-34` repeats this: "takes outside changes (recipe switch, Start over, insert) as one undoable change". The reviewer read this file in full but did not address the comment.
  - Phase 18a Decision 1 (`phase-18a-starter-session.md:32`) says only that one `applyChanges` is one reducer step "and the editor's matching dispatch gives one undo". It does not restrict undo to inserts. The CodeEditor test cites Decision 1 for a generic outside change (`CodeEditor.test.tsx:66`, "takes an outside change as one undo step").
  - The spec treats undo as text-only elsewhere. AC-4.7/F16 (`spec.md:202`) says undoing "re-enables the pill but doesn't switch the language back". AC-5.4 (`spec.md:231`) says returning to the stored text "for example by undo" restores the mark.
  - The resulting state (recipe B metadata with recipe A text, `edited` true, Permissions "needs review" because `selectRecipe` sets `reviewedText: null` at `starterReducer.ts:87`) is the same state a user reaches by pasting recipe A's code under recipe B. The checklist reads "Review anything you've added" (`PermissionNote.tsx:54`).
- **Questions:**
  1. Does the Phase 21 plan text (and the code comment) establish intended behaviour under the admission rule "Trace existing mitigations and intended behavior"?
  2. If it does, is anything left that contradicts the spec (I found no spec text on undo across a recipe switch)? If not, the item should be rejected, or recorded as an owner/spec question outside the confirmed findings.
  3. If the lead keeps it, the Evidence column's Decision 1 statement and the "fix" must say they reverse a planned behaviour.
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read docs/specs/001-server-logic-starter-inspector/plans/phase-21-starter-code-panes.md:7 and :134 ("Recipe switches and Start over are undoable like any outside change: Ctrl+Z after them restores the old text as an ordinary edit, which the session then treats as edited"), phase-18a-starter-session.md:32 (Decision 1 gives one undo per `applyChanges`; it does not restrict undo to inserts), CodeEditor.tsx:32-34 (the same contract in the code comment) and starterReducer.ts:84-90 (`selectRecipe` clears `reviewedText`, so Permissions returns to needs-review). The spec has no text on undo across a recipe switch (grep). The behaviour is planned and documented, the resulting state is the one a user reaches by pasting recipe A's code under recipe B, and the Permissions review is reset, so the admission rule "trace intended behaviour before proposing a fix" was not met. The reviewer's reading of Decision 1 was wrong. The zip-mismatch consequence is real but is a consequence of the planned design; whether the design should change is an owner/spec question.
  - **Plan Delta:** starter-and-objects-001: REMOVED from confirmed findings (WARNING → not admitted). Retained as an owner/spec observation: "Undo after a recipe switch or Start over restores the previous recipe's code as an edit (planned, phase-21:134); the zip then carries recipe B's README/checklist with recipe A's code. If unwanted, the spec must say so first." ID reserved, not reused.

##### SK-starter-and-objects-002

- **ID:** SK-starter-and-objects-002
- **Challenge:** -002 is filed under pass 7 SECURITY, yet the reviewer's own pass-7 coverage row says it "is a self-inflicted availability problem, not an attacker boundary". The finding also cites a "300 ms / 2 000-line file" NFR that the spec does not contain. Neither the finding nor the rationale shows how realistic the trigger is.
- **Failure mode:** The finding is sorted under the wrong pass, and its severity rests on a shape of input that realistic handler code may never produce.
- **Evidence:**
  - Inputs reaching `runBrowserChecks` are the user's own editor text and catalogue samples. The Inspector does not call `runBrowserChecks` (Plan v1 packet correction). So no third-party input reaches it.
  - The spec NFR is "Both panes update within 300 ms of any input change" (`spec.md:869`). "2 000-line file" is only the Vitest describe title (`browserChecks.test.ts:214`) and phase-02 plan wording.
  - The reviewer's timings reproduce. With `redos.cjs`, `import` + 1000/2000/4000 spaces took 161/1122/7689 ms, and 200 lines of `// import` + 300 spaces took 19.2 s.
  - Realistic shapes are cheap (`sk-realistic.ts`, best of 3, copy of `browserChecks.ts`):

    | Input | Time |
    |---|---|
    | 2,000-line semicolon-free handler (125,855 chars) with `// import note` at top | 25.6 ms |
    | 500-line tab-indented semicolon-free code with five `// import x` lines | 6.1 ms |
    | `import` then 10 blank lines indented 8 spaces | 0.4 ms |
    | `import` then 50 blank lines indented 8 spaces | 19.7 ms |
    | `import` + 1000 spaces then `;` | 158 ms |

  - Breaking 300 ms needs one contiguous whitespace run of roughly 1,000+ characters, or 150+ consecutive indented blank lines, with no `;` before `from`.
  - The reviewer's "runs on every keystroke and caret move" holds. `setCursor` returns a new state object (`starterReducer.ts:103-104`), and `deriveStarter` runs on every provider render (`StarterSessionProvider.tsx:19`).
- **Questions:**
  1. Should the primary pass be 3 COMPLETENESS (the NFR) rather than 7?
  2. Should the NFR citation be corrected to `spec.md:869`?
  3. Given that the trigger is a single contiguous whitespace run of about 1,000 characters (or 150+ blank indented lines) after the word `import`, does WARNING still hold? Or should the finding name that trigger shape so the reader can judge its likelihood?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read spec.md:869 ("Both panes update within 300 ms of any input change"; the "2,000-line file" is the Vitest describe title, not a spec clause) and the reviewer's pass-7 row ("not an attacker boundary"). The input is self-supplied, so pass 3 COMPLETENESS (the NFR) is the right primary pass; pass 7 was wrong. The skeptic's re-measurement reproduces the reviewer's numbers and adds the realistic-shape table, which the record now carries so a reader can judge likelihood. Severity stays WARNING: the trigger (one contiguous whitespace run of about 1,000+ characters, or about 150+ consecutive indented blank lines, after the word `import` with no `;` before `from`) is reachable by pasting a file, the failure is a main-thread freeze on every keystroke (limited, recoverable by waiting or Start over), and the same realism standard is applied to -003 and the former U5 (SK-007).
  - **Plan Delta:** starter-and-objects-002: Pass 7 SECURITY → 3 COMPLETENESS (secondary: none). Evidence before → after: "breaks the AC-4.1 300 ms and '300 ms / 2 000-line file' NFR" → "breaks the NFR at spec.md:869 ('Both panes update within 300 ms of any input change'); the '2,000-line file' is the test title at browserChecks.test.ts:214". Trigger restated: "the word `import` followed by roughly 1,000+ contiguous whitespace characters or 150+ consecutive indented blank lines with no `;` before `from`; realistic shapes measured at 0.4–26 ms (skeptic table), the trigger shapes at 158 ms (1,000 spaces), 1.1–1.3 s (2,000) and 7.6 s (4,000), reproduced by the skeptic on replicas". Severity unchanged (WARNING).

##### SK-starter-and-objects-003

- **ID:** SK-starter-and-objects-003
- **Challenge:** -003 says the trigger band is narrow ("larger inputs fail inside acorn as a handled SyntaxError and take the safe token fallback"). That holds for the binary chain the reviewer tested, but not for member chains. acorn parses subscripts in a loop, so `usedServerMembers` throws a RangeError for any member chain above about 8,000 segments, with no upper bound in my runs. The safe band also depends on acorn's `catchStackOverflow`, which is unverified for the pinned 8.19.0 (U4).
- **Failure mode:** The finding understates its reachable input range. U4 stays open even though the claim about the safe band rests on it.
- **Evidence:**
  - Scratch `t3.ts mem n` builds `function get(){ return a` + `'.b'.repeat(n)` + `; }` against copies of `structure.ts` / `structureAst.ts` under Node 22.23.4 with acorn 8.18:

    | n | `usedServerMembers` | `runBrowserChecks` |
    |---|---|---|
    | 4000 | ok | ok |
    | 4500 | ok | ok |
    | 8000 | RangeError (20 ms) | ok |
    | 12000 | RangeError (24 ms) | ok |
    | 20000 | RangeError (33 ms) | ok |
    | 50000 | RangeError (51 ms) | ok |

  - The throwing path is the recursion in `chainOf` (`structure.ts:113-125`), called from `walk`'s visitor (`structure.ts:180-183`). Neither is guarded.
  - acorn 8.18 converts stack overflow to a SyntaxError only inside `catchStackOverflow` (`dist/acorn.js:764-773`, wrapping `parseTopLevel` at `:625`). The pattern matches "stack … exceeded|overflow" and "too much recursion", which covers V8/Electron messages. I could not confirm it in 8.19.0 (download denied).
  - The render-path claim holds:
    - `deriveStarter` runs in the `StarterSessionProvider` render (`StarterSessionProvider.tsx:19`).
    - `PageErrorBoundary` wraps only `Panel` children (`App.tsx:54-58,80-89`).
    - `main.tsx:26-32` only logs.
    - `runBrowserChecks` cannot throw it, because its `parses`/`tokenHits` use catch-all handlers (`browserChecks.ts:148-155,162-169`).
  - The Inspector entry points (`detectConnectorUse`, `exportedFunctionNames`) never call `walk`/`chainOf` (`structure.ts:30-74`), so the defect stays inside Starter.
- **Questions:**
  1. Should -003's Trigger and Impact be restated to cover member chains of about 8,000+ segments (about 16 KB) with no upper bound, replacing "narrow trigger band"?
  2. Does this change the severity assessment?
  3. Should U4 stay open as the dependency for the binary-chain safe band only?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-ran the reviewer's replica `t3.ts mem n` on copies under Node 22.23.4 / acorn 8.18: n=3000 → `usedServerMembers` ok in 9,174 ms; n=9000 → RangeError in 21 ms (runBrowserChecks unaffected both times). The member-chain path (`chainOf`, structure.ts:113-125, recursing on `object`) overflows at about 8,000+ segments with no upper bound, because acorn parses subscripts iteratively and its own stack-overflow guard never engages; the "narrow trigger band" statement applies only to binary chains and depends on acorn's `catchStackOverflow`, unverified for the pinned 8.19.0. The render-path and boundary claims hold (StarterSessionProvider.tsx:19; App.tsx:80-89; main.tsx:26-32). Severity stays WARNING: a blank tool with unsaved edits lost, recovered by reopening.
  - **Plan Delta:** starter-and-objects-003: File:Line src/lib/code-analysis/structureAst.ts:47 → src/lib/code-analysis/structure.ts:113 (`chainOf`; `walk` at structureAst.ts:47 is the second unguarded recursion, kept in Evidence). Trigger before → after: "about 4,000 chained `1+1+…` terms; narrow band" → "a member chain of about 8,000+ segments (about 16 KB of `a.b.b…`) throws RangeError with no upper bound (lead-reproduced on a replica at 9,000); a binary chain of about 4,000 terms also throws, in a narrow band that depends on acorn's catchStackOverflow (unverified for 8.19.0)". Severity unchanged (WARNING). See SK-007 for the merged cost dimension.

##### SK-starter-and-objects-004

- **ID:** SK-starter-and-objects-004
- **Challenge:** One branch of -003's proposed fix would not work. "Also place a `PageErrorBoundary`/error boundary inside `StarterSessionProvider`" cannot catch the error, because it is thrown by the provider's own render (`deriveStarter`). A boundary catches errors only from its descendants. A boundary placed above the provider would contain the crash, but it still unmounts the provider and loses session state.
- **Failure mode:** An implementer follows the "inside" option, the verification ("confirm the provider test still passes") passes, and the root still unmounts.
- **Evidence:**
  - `StarterSessionProvider.tsx:19` calls `deriveStarter(state, deps)` in its own render, before any child renders.
  - `PageErrorBoundary.tsx:8-22` is a class boundary that renders "<label> couldn't load. Close and reopen the tool."
  - With a boundary above the provider, the fallback replaces the provider subtree. `useReducer` state is discarded, so recovery is still "close and reopen" with edits lost. Only Inspector and the title bar would survive.
- **Questions:**
  1. Should the fix text drop "inside `StarterSessionProvider`"?
  2. Should it state that a boundary only limits blast radius (Inspector stays usable) and that only the iterative walk or the catch at the analysis entry points preserves the session?
  3. Should the verification name a test that renders the provider with a deep member chain?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read StarterSessionProvider.tsx:19 (`deriveStarter` runs in the provider's own render) and PageErrorBoundary.tsx:8-22. An error boundary catches descendants' errors only, so a boundary inside the provider cannot catch this; one above it contains the crash (Inspector and title bar survive) but still discards the `useReducer` state. The reviewer's "inside" option is wrong and its verification would pass without fixing anything.
  - **Plan Delta:** starter-and-objects-003 fix, before → after: "… Also place a PageErrorBoundary/error boundary inside StarterSessionProvider or move derivation below it" → "Make `chainOf` and `walk` iterative (explicit stack, no array copying) or catch non-SyntaxError failures at the analysis entry points (`usedServerMembers`, `readsHttpOnlyContext`, `planInsertion`) and map them to the unparsed/fallback result; a boundary can only sit above the provider and only limits blast radius (Inspector stays usable), it does not preserve the session. Verify with a unit test calling `usedServerMembers` on a 10,000-segment member chain (no throw, bounded time) and a StarterSessionProvider render test with the same text."

##### SK-starter-and-objects-005

- **ID:** SK-starter-and-objects-005
- **Challenge:** -004 bundles three unrelated items, each with its own cause and fix. Only (a) claims a concrete consequence, and that consequence ("one frame of stale 'N recipes' text") conflicts with the reviewer's own pass-1 reasoning. (b) and (c) are rule deviations with no stated runtime or maintenance consequence. The severity guide says INFO is not for "stylistic preferences".
- **Failure mode:** An INFO entry admitted without the concrete consequence the guide requires, and three unrelated items recorded under one ID.
- **Evidence:**
  - (a) The count effect is at `RecipeCombobox.tsx:59-61` and feeds `StarterInputs.tsx:223-226`. Method-filter clicks and query typing are discrete events. The reviewer's pass-1 row states that for discrete events "React flushes the sync render and passive effect before the next key task". Under React 18+ timing, a passive effect from a discrete event flushes synchronously, and its `setVisibleCount` renders before paint. So the demonstrable cost is one extra render of the tile, not a painted stale frame. This is reasoned from React's documented timing; React is not installed.
  - (b) `useCallback` at `RecipeCombobox.tsx:53-57` stabilises `close` for the pointerdown effect deps (`:73-81`). `StarterInputs.tsx:224-226` does the same for the count callback. The React Compiler is enabled, so the manual memo is redundant but has no runtime effect.
  - (c) The cast at `RecipeCombobox.tsx:65-67` feeds a runtime `typeof … === 'function'` guard. Its purpose is to tolerate environments without `scrollIntoView` (jsdom), and it has no comment. It changes no behaviour.
- **Questions:**
  1. Can (a) show a visible stale frame, or only an extra render?
  2. Do (b) and (c) have any concrete consequence that meets INFO, or do they belong in coverage notes / unverified candidates?
  3. If any part is kept, should each item get its own ID so it can be admitted or rejected separately?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read RecipeCombobox.tsx:53-67 and StarterInputs.tsx:223-226. (a) The count-lifting effect fires from discrete events, where React flushes passive effects before paint, so the cost is one extra render, not a painted stale frame; the reviewer's own pass-1 reasoning says as much. (b) With the React Compiler on, the two `useCallback`s are redundant with no runtime effect. (c) The `as unknown as` cast feeds a `typeof` guard that tolerates jsdom's missing `scrollIntoView` and changes no behaviour. None of the three has the concrete consequence INFO requires, and three unrelated items were bundled under one ID.
  - **Plan Delta:** starter-and-objects-004: REMOVED from confirmed findings (INFO → not admitted). Retained as three separate non-finding observations on react.md/typescript.md compliance: (a) derived count lifted through an effect (RecipeCombobox.tsx:59-61); (b) two redundant `useCallback`s (RecipeCombobox.tsx:53, StarterInputs.tsx:224); (c) an uncommented `as unknown as` cast for a jsdom accommodation (RecipeCombobox.tsx:65-67). ID reserved, not reused.

##### SK-starter-and-objects-006

- **ID:** SK-starter-and-objects-006
- **Challenge:** -005's fix ("use `structureInsert.applyChanges` in the reducer … keep `applyTextChanges.test.ts` cases against the shared function") would fail an existing test the reviewer never opened. The two functions disagree on changes at the same offset, not only on unordered input. That tie behaviour is pinned by a test. The admitted trigger ("a future caller … unordered changes") is also a weaker hazard than the one present today in the trial-parse path.
- **Failure mode:** The recommended verification is self-contradictory. The fix silently changes a pinned contract, and the finding misstates what actually diverges.
- **Evidence:**
  - `applyTextChanges.test.ts:19-26` ("keeps array order for changes at the same offset") expects `'01ab45XY6789'` for two inserts at offset 6. This file is in the reviewer's "Not opened" list.
  - `structureInsert.ts:76-82` sorts descending with a stable sort, so ties apply in array order and end up reversed. Scratch `sk-ties.cjs` on the same input shape gave `abYXcd` (sorted `applyChanges`) against `abXYcd` (`applyTextChanges`). For unordered input, `applyTextChanges` produced `aWbZcd` against the correct `aWbcZd`.
  - `planInsertion` trial-parses `applyChanges(code, changes)` (`structure.ts:309-310`). The reducer commits `applyTextChanges` (`starterReducer.ts:105-106`). On a tie, the trial-parsed text and the committed text would differ. Today `planInsertion` puts `async ` at the function start and the sample inside the body, so it never emits a tie. That is source-reasoned and not executed.
  - The admission rule allows a "maintenance condition" as a trigger. "Future caller" names no specific planned change.
- **Questions:**
  1. Should -005's problem statement be restated as the tie/ordering divergence between the trial-parse path and the commit path?
  2. Does the fix need to say which tie order is the contract, given that `applyTextChanges.test.ts:19-26` pins array order?
  3. Does a "future caller" with no named change meet the "concrete … maintenance condition" requirement, or should this move to unverified candidates?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read applyTextChanges.test.ts:19-26 ("keeps array order for changes at the same offset", expects `01ab45XY6789`), structureInsert.ts:76-82 (stable descending sort applies ties in array order, so two inserts at one offset end up reversed) and structure.ts:305-311 (`planInsertion` trial-parses `applyChanges(code, changes)` while the reducer commits with `applyTextChanges`, starterReducer.ts:105-106). The two paths disagree on tie order, the tie contract is pinned by a test the reviewer never opened, and the reviewer's fix would fail it. The real hazard is concrete: a `planInsertion` change that emits two changes at one offset would make the trial-parsed text differ from the committed text (today `async ` goes at the function start and the sample inside the body, so no tie is emitted). That is a specific maintenance condition, so INFO stands with the restated problem.
  - **Plan Delta:** starter-and-objects-005: Problem before → after: "a future caller supplying unordered changes would corrupt the text" → "the trial-parse path (`structureInsert.applyChanges`, sorted, ties reversed) and the commit path (`applyTextChanges`, array order, pinned by applyTextChanges.test.ts:19-26) disagree on same-offset ordering and on unordered input; a `planInsertion` change that emits two changes at one offset would commit text that was not the text trial-parsed". Fix before → after: "use `applyChanges` in the reducer and keep the test cases" → "keep one function with the array-order tie contract: sort by descending `from`, then by descending original index, export it from `structureInsert.ts` (or `lib/`), use it in both `planInsertion` and the reducer, delete `applyTextChanges.ts`, and point applyTextChanges.test.ts (including :19-26) at the shared function. Verify with that test file, starterReducer.test.ts:180 and structure.insertion.test.ts." Severity unchanged (INFO).

##### SK-starter-and-objects-007

- **ID:** SK-starter-and-objects-007
- **Challenge:** U5 (the `chainOf`/`walk` O(n³) member-chain cost) was left out "as not realistic handler code", yet -002 and -003 were admitted on comparably artificial input. The reviewer's U5 numbers also understate the cost: the "did not finish in 120 s" note comes from a looped run whose times added up across sizes.
- **Failure mode:** The admission decisions are inconsistent. A per-keystroke freeze about 15 times longer than -002's measured case, on input of similar size, is left out of the confirmed list.
- **Evidence:**
  - Scratch `t3.ts mem` (copy of `structure.ts`, Node 22.23.4) for an 8 KB input of `return a` + `'.b'.repeat(4000)`:
    - `usedServerMembers` took 19,257 ms at n=4000 and 27,846 ms at n=4500.
    - Above about 8,000 segments it throws a RangeError instead (see SK-003).
  - -002's admitted case is `import` + 2000 spaces at 1.1–1.3 s.
  - The cost runs on every state change through `deriveStarter.ts:28`, and twice for Liquid-capable recipes through `isLiquidAllowed` → `readsHttpOnlyContext` → `usedServerMembers` (`client.ts:41-43`, `structure.ts:204-207`).
- **Questions:**
  1. Apply one realism standard to U5, -002 and -003.
  2. If artificial pasted input is admissible, U5 meets Trigger, Reachability, Impact and Evidence like -002 (NFR, pass 3 or 5) and could be merged with -003 under one root cause (unbounded recursion and copying in `walk`/`chainOf`).
  3. If such input is not admissible, are -002 and -003 still admitted?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** One realism standard is applied: artificial but pasteable input is admissible when the impact is a main-thread freeze or crash on every state change. Lead re-ran the replica: a 3,000-segment member chain (about 6 KB) costs 9,174 ms per `usedServerMembers` call, which `deriveStarter` runs on every keystroke and caret move (twice for Liquid-capable recipes via `isLiquidAllowed` → `readsHttpOnlyContext`). That is the same unguarded `chainOf` recursion with `[...head, key]` copying (structure.ts:113-125) that overflows at 8,000+ segments, and the same corrective action (iterative, non-copying chain walk) fixes both, so U5 is merged into starter-and-objects-003 rather than given a new ID. Severity of the merged record stays WARNING (limited failure, recoverable by waiting or Start over / reopening).
  - **Plan Delta:** starter-and-objects-003: merged record now covers two impacts of one cause: (i) RangeError escaping to the root (blank tool, edits lost) for member chains ≥ ~8,000 segments and some binary chains; (ii) per-keystroke cost growing about n³: 87 ms at 500 segments, 9.2 s at 3,000 (lead-reproduced), 19.3 s at 4,000 and 27.8 s at 4,500 (skeptic), breaking spec.md:869. Unverified U5 → merged into starter-and-objects-003 (alias: U5). Fix and verification as in SK-004 plus a timing assertion (10,000-segment chain under 300 ms).

##### SK-starter-and-objects-008

- **ID:** SK-starter-and-objects-008
- **Challenge:** The two open unverified candidates can be settled without executing anything, but their recorded "check needed" says otherwise. U3 (duplicate `key={line}` in PermissionNote) says it "needs the TS catalogue executed", yet reading the data is enough. U4's dependency should be narrowed (see SK-003).
- **Failure mode:** Candidates stay open with the wrong check recorded, which overstates what is blocked.
- **Evidence:**
  - U3: `checklistLines` (`recipes.ts:441-458`) builds one line per web role, per table (logical name, entity set, privileges, access type and note), one Account-relationship line per Account-access table, then domains, settings and prerequisites.
  - Only R4 has two rows for the same table (`recipes.ts:131-148`), and they differ in privileges (`Read, Write, Delete` vs `Create`), access type and note, so their lines are distinct. Each recipe has at most one Account row (R1, R4 and R10), so no relationship line repeats. I found no duplicate line in the current catalogue (source-verified by reading; not executed).
  - U4: acorn 8.18 has `catchStackOverflow`. The 8.19.0 check is still blocked here (tarball fetch denied). For member chains the safe band does not exist, because acorn parses them iteratively and walk overflows regardless.
- **Questions:**
  1. Can U3 be closed as "checked, no current trigger", with the only residual being a future catalogue edit?
  2. Should U4's "check needed" be narrowed to the binary-chain band of -003, with the member-chain case recorded as independent of it?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read recipes.ts:131-148 (R4's two `contact` rows differ in privileges, access type and note) and the skeptic's trace of `checklistLines` (recipes.ts:441-458): one line per role, per table row, one Account-relationship line per Account-access table (R1, R4, R10 each have one), then domains, settings and prerequisites. No two lines are equal in the current catalogue, so `key={line}` has no current trigger; the only residual is a future catalogue edit. U4 depends only on the binary-chain safe band after SK-003.
  - **Plan Delta:** Unverified U3 → resolved, no finding (no duplicate checklist lines in the current catalogue; source-verified by reading, not executed; residual risk is a future catalogue edit). Unverified U4, before → after: "behaviour against pinned acorn ^8.19.0 … confirm catchStackOverflow" → "applies only to the binary-chain safe band in starter-and-objects-003; the member-chain overflow is independent of acorn's guard. Check: confirm `catchStackOverflow` exists in acorn 8.19.0 once dependencies are installed."

##### SK-starter-and-objects-009

- **ID:** SK-starter-and-objects-009
- **Challenge:** Several coverage rows say "checked" without carrying the gaps the reviewer recorded:
  - Pass 3 COMPLETENESS: in-scope visual ACs are unverified and `starter.css` / `serverObjects.css` were not read.
  - Passes 1, 2 and 5: 13 test files were not opened and 11 were read by title only.
  - SK-006 shows this gap affected a finding: an unopened test contradicts -005's fix.
- **Failure mode:** The coverage table implies complete passes when part of each pass's evidence was not examined. The "Coverage claims" standard makes that table the sole authority.
- **Evidence:**
  - The reviewer's coverage record lists these as not opened: `applyTextChanges.test.ts`, `lineDecorations.test.ts`, `ClientPane.test.tsx`, `objectList.test.ts`, `starterOptions.test.ts`, `classNames.test.ts`, `text.test.ts`, `minimalChange.test.ts`, `ringGeometry.test.ts`, `browserChecks.table.test.ts`, `structure.connector.test.ts`, `structure.members.test.ts`, `structure.names.test.ts`.
  - It also records that AC-4.1 minimum-viewport heights and AC-6.7/6.8 24 px target sizing are unverified.
  - The 24 px sizing is a current spec amendment (`spec.md:1192`), so it is promised behaviour in scope. Because the CSS files were not read, pass 3 cannot claim it was compared.
  - `applyTextChanges.test.ts:19-26` (unopened) pins tie order and contradicts -005's fix (SK-006).
- **Questions:**
  1. Should passes 1, 2, 3 and 5 be marked partial or limited in the Status column, with the unopened tests and unread CSS named in the Limitation column?
  2. Pass 3 specifically: "checked" or "partial (visual ACs unverified)"?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead compared the reviewer's coverage record (13 test files not opened, 11 read by title, starter.css and serverObjects.css only searched) with the coverage table (all seven passes checked). The CSS sizing amendment at spec.md:1192 (24 px targets for AC-6.7/6.8) and AC-4.1 viewport heights are promised behaviour in scope that no one compared, so pass 3 cannot read checked. One unopened test (applyTextChanges.test.ts:19-26) contradicted a proposed fix (SK-006), which shows the gap was material. Source for passes 1, 2 and 5 was read in full, so their statuses stand with the limitation made explicit.
  - **Plan Delta:** Coverage table before → after: Pass 3 COMPLETENESS "checked" → "blocked (partial): FR/AC behaviour compared from source; visual ACs AC-4.1, AC-6.7, AC-6.8 (spec.md:1192) unverified because starter.css and serverObjects.css were not read". Passes 1, 2 and 5 limitation cells add "13 test files not opened and 11 read by title only (list in the coverage record); one unopened test (applyTextChanges.test.ts:19-26) bore on a finding". Finding starter-and-objects-006 evidence label "CodeMirror behaviour recalled from memory" → "documented: @codemirror/state `lineSeparator` docs (via Context7) state that without the facet any of `\n`, `\r\n`, `\r` is a separator; phase-02-browser-checks.md:10 records the intent that lines match the editor".


### E.3 generators-and-catalogue

### Skeptic Round — Domain: generators-and-catalogue

#### Input

- Source snapshot: /home/user/PowerPage-ServerLogic, branch `refine-app`, HEAD 8dff4f1a2d55f085f7a98a16e19f72656dd52808 (re-checked by the skeptic with `git rev-parse HEAD`; working tree clean).
- Domain's Plan v1 slice, including original/alias finding IDs: `planv1-generators-and-catalogue.md`. Admitted: generators-and-catalogue-001 (INFO, pass 3, demoPages.ts:538), -002 (INFO, pass 3, readme.ts:192), -003 (INFO, pass 3, readme.ts:72). No aliases or merges. Unverified U1–U4 held outside the confirmed list.
- Coverage record and limitations: `review-generators-and-catalogue.md` (coverage record, 14 commands, coverage table passes 1–7 all "checked", findings table, U1–U4). Stated blocks: typecheck, lint, vitest, npm audit (no node_modules); `cmp2.mjs` failed with `ERR_MODULE_NOT_FOUND: acorn`, so `generateClient`, `buildReadme` and `buildPackageFiles` were never executed.
- Packet isolation: the packet holds only this domain's slice and raw result. No other domain's findings were seen.
- Relevant source evidence and access limits: skeptic read `demoPages.ts` 480–560, `r4.ts`, `r5.ts`, `r9.ts`, `r7.ts` 300–343, `snippets.ts`, `readme.ts`, `buildZip.ts`, `buildPackageFiles.ts`, `recipes.ts` (header, webRole/upstream lines, `checklistLines`), `readme.test.ts` (headings, `sectionBody`, lines 140–160, 255–305), the handler goldens' try/SiteSetting lines, `client/__golden__/fetch-r4-put.js.txt`, `liquid-r1-get.liquid.txt`, `liquid-r8-getsummary.liquid.txt`, `package/__golden__/R4.README.md.txt` 1–20, `src/lib/code-analysis/browserChecks.ts` (supporting), and spec lines 105–119, 179–183, 228–246, 425–437, 450, 500, 1191. The skeptic read the reviewer's scratch scripts `gc/{probe.js,cmp.mjs,cmp2.mjs,cmp3.mjs,fr4.js,reg.mjs,hooks.mjs}` and re-ran `node probe.js` (exit 0; it only reads committed goldens into `node:vm`). The skeptic fetched Microsoft Learn "How to: interact with external services using server logic" (server-logic-external-services) and searched Learn for `Server.SiteSetting.Get` behaviour. Vitest, typecheck and lint were not run (no node_modules).

#### Challenges and Lead Responses

- **ID:** SK-generators-and-catalogue-001
- **Challenge:** Finding generators-and-catalogue-001 treats "blank Age becomes 0" as a defect against intended behaviour. The Age logic is Learn's demo page, carried over as written, and AC-3.9 makes Learn's page the intended behaviour. The proposed fix adds a change that correction 18 does not list.
- **Failure mode:** A spec-conformant reproduction gets admitted as a code defect. Its fix would then put the page outside AC-3.9 ("Learn's demo page, with the endpoint changed ... and the corrections in Learn correction 18"), and it needs a spec change the finding doesn't mention.
- **Evidence:** Learn's External services demo page (fetched 2026-11-04) has `if (attr === 'Age') { value = Number(value); if (isNaN(value)) value = null; // safety fallback }`. That is the same logic as demoPages.ts:537–540. Spec line 183 (AC-3.9) and line 119 (correction 18) list the allowed deviations: CSRF token, serviceSession parse, escaping, the JSON.parse guard and the envelope adaptation. Blank Age is not among them. The coverage table says pass 3 checked "Spec FR-3 Musts", but the finding's evidence never compares against the Learn page. The finding says the impact is "misleading data in the table". Learn's render uses `${r[c.name] || ''}`, so a 0 shows as blank there. The generated render (demoPages.ts:496, `row[col.name] == null ? "" : String(row[col.name])`) shows "0". So any visible mismatch comes partly from the generator's own render change, not only from line 538. Either way, the table shows the value the server stored (0), so "misleading" is not established.
- **Questions:** Under "trace ... intended behavior before proposing a fix", does 001 pass admission as a code defect at all, or is it an uncorrected Learn sample behaviour (a spec observation for correction 18)? If it stays, should the fix say that it needs a spec update (adding to correction 18) as well as regenerating `R5.page.html.txt`? Should the impact wording drop "misleading" or cite the render difference?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read spec.md:119 (Learn correction 18) and :183 (AC-3.9). AC-3.9 defines the intended page as Learn's demo page with the endpoint change plus the correction-18 items (CSRF token, serviceSession parse, HTML escaping, JSON.parse guard, return-shape adaptation). Blank-Age handling is not among them, and demoPages.ts:537-540 reproduces Learn's own `Number(value)` / `isNaN` logic, so the behaviour is spec-conformant reproduction, not a code defect. The admission rule "trace intended behaviour before proposing a fix" was not met by the finding. The reviewer's trigger and code path are real, so the observation is retained as a spec-level candidate (an addition to Learn correction 18 would be an owner decision), not a confirmed finding.
  - **Plan Delta:** generators-and-catalogue-001: REMOVED from confirmed findings (INFO → not admitted). Retained under Unverified / non-finding observations as "Learn-faithful blank-Age behaviour in the R5 demo page; spec change to correction 18 needed before any code fix". ID stays reserved and is not reused.

- **ID:** SK-generators-and-catalogue-002
- **Challenge:** Finding generators-and-catalogue-002 (upstream-credentials line has no heading of its own) may not meet INFO. The severity guide excludes "stylistic preferences" and requires "a concrete consequence". The finding shows only where the sentence sits, not a consequence.
- **Failure mode:** A presentation preference is admitted as a finding, and the proposed fix adds a README heading that neither the spec nor the tests define.
- **Evidence:** readme.ts:190–193 places `UPSTREAM_CREDENTIALS_LINE` as a plain paragraph after the Troubleshooting list. The placement claim holds. Spec AC-5.6 (line 236) and FR-3 F10 (line 425) require only that README.md contains the line, and the code meets that. The sentence states its own subject ("Upstream calls use this integration's own credentials ... not the caller's."), so nothing is lost or misstated by where it sits. `readme.test.ts` `R1_HEADINGS` pins the heading order with `toEqual`, but only for R1 and R4. The proposed `section('Upstream credentials', ...)` would add a heading for R3/R5/R6/R7/R9 that no spec heading list includes. The finding doesn't say whether that heading is allowed.
- **Questions:** What concrete consequence, beyond appearance, does 002 establish? If none, should it move out of the findings (dropped or recorded as a non-finding observation) rather than stay INFO? If it stays, does the fix need a spec or owner decision for the new heading?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read readme.ts:181-193 and spec.md:236, :425. The spec requires only that the README contains the upstream-credentials line, which it does. The sentence names its own subject, so a reader misreads nothing and takes no wrong action; the only effect is where the paragraph sits visually. The severity guide excludes stylistic preferences from INFO and requires a concrete consequence, which the finding does not establish. The proposed fix would also add a heading the spec's README contents list does not define.
  - **Plan Delta:** generators-and-catalogue-002: REMOVED from confirmed findings (INFO → not admitted). Retained as a non-finding observation: "UPSTREAM_CREDENTIALS_LINE renders as a trailing paragraph of Troubleshooting; placement is an owner/spec choice". ID reserved, not reused.

- **ID:** SK-generators-and-catalogue-003
- **Challenge:** Finding generators-and-catalogue-003 has three problems. (a) Its evidence line list is wrong. (b) Its fix would break an existing test that the finding doesn't mention. (c) Its grade needs an explicit decision between INFO and WARNING ("misleading user/operator feedback").
- **Failure mode:** If the fix is applied as written, `readme.test.ts` fails, and the File:Line evidence points at a line that isn't a webRole. If the grade is wrong, a setup instruction that tells makers to add a role that doesn't exist is under-ranked, or a cosmetic issue is over-ranked.
- **Evidence:** (a) The finding cites `recipes.ts` webRole lines "49, 72, 87, 331, 360, 400". `rg` shows the webRole lines are 49, 72, 101, 151, 198, 248, 287, 331, 360 and 400. Line 87 is inside R2's `examples` block. The CALLER_ROLE recipes R3 (101), R4 (151) and R7 (287) are missing from the list, although the finding names them as affected. (b) `readme.test.ts:152` asserts `expect(readme).toContain(getRecipe('R1').webRole)`, which is the capitalised "A web role the caller holds". The proposed wording "add a web role the caller holds" (lower-case `a`) would fail it. The fix lists only the README goldens R1, R4 and R8. (c) On whether this text is intended: the R1, R4 and R8 README goldens line 11 encode this exact sentence, and the test above requires the verbatim role string in the README. That suggests the text was accepted output, not an oversight. Against that, step 5 reads as a literal role name in backticks. Learn's own step says "Select +Add roles to assign appropriate web role" (fetched Learn page, step 6).
- **Questions:** Correct the evidence line list. Should the fix name `readme.test.ts:152` as a test to update alongside the three README goldens? Under the severity guide, is a numbered setup step that names a role that doesn't exist "misleading user/operator feedback" (WARNING), or low-impact (INFO)? Record the reason for whichever grade is kept.
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** (a) Lead ran `rg -n webRole src/services/catalogue/recipes.ts`: webRole lines are 49, 72, 101, 151, 198, 248, 287, 331, 360, 400. Line 87 is not a webRole line; 101, 151 and 287 (R3, R4, R7) were missing. (b) Lead read readme.test.ts:152: `expect(readme).toContain(getRecipe('R1').webRole)` pins the verbatim capitalised string, so the proposed lower-case wording would fail that test; the fix must name it. (c) Grade kept at INFO. Reason: the text is a backticked description inside a numbered README step; the permission-checklist renders the same string as `Web role: A web role the caller holds`, which reads as a description, and recovery is immediate (the maker assigns any role they hold). The goldens (R1/R4/R8 README line 11) and the test show the sentence was accepted output. This is an ambiguous instruction with a concrete but low consequence, below the "misleading user/operator feedback" bar that WARNING sets for feedback that is false.
  - **Plan Delta:** generators-and-catalogue-003: Evidence before → after: recipes.ts lines "49, 72, 87, 331, 360, 400" → "49, 72, 101, 151, 287, 331, 360, 400 (CALLER_ROLE and descriptive roles); 198 and 248 are the two literal role names". Fix before → after: add "update readme.test.ts:152 (or keep the capitalised recipe string and change only the surrounding wording, e.g. `add a web role the caller holds, for example …`)" and note that R1, R4 and R8 README goldens line 11 change. Severity unchanged (INFO), with the rationale recorded.

- **ID:** SK-generators-and-catalogue-004
- **Challenge:** Several pass 7 and pass 3 statements are labelled "executed" or "verified", but the reviewer's scripts did not run them. The admission rules forbid implying that a command ran when it didn't.
- **Failure mode:** The coverage record overstates reproduced evidence. A later reader would treat source-only conclusions as reproduced.
- **Evidence:** The skeptic re-ran `gc/probe.js` (exit 0) and read the scripts.
  - "R4: executed: `entitySetName` array/non-allowlisted rejected": only the array case runs (`R4 get arr`). No non-allowlisted string is sent.
  - "repeated options rejected by design": no probe case sends a repeated option.
  - "`id` GUID regex rejects trailing `\n` and `)/x` suffix (R10 too)": those two cases run only against R10 (`R10 get evil`, `R10 get nl`). No R4 case passes a bad `id`. R4 shares `IS_GUID` (snippets.ts:10), so the claim is source-verified for R4, not executed.
  - "R3/R6: ... setting missing -> ... no outbound call (executed)": only R3 and R9 run with a missing setting. The R6 probe supplies `AZURE_FUNCTION_URL`.
  - R7: "logs contain only fixed names, StatusCode, ReasonPhrase ...": the only R7 run is all-success and produces `[]` logs, so no failure-stage log is executed.
  - Pass 3 "deterministic output (verified: same text twice and equals golden)": `cmp.mjs` calls `generateHandler(id)` once per recipe and compares it to the golden. Nothing generates the text twice.
  - The remaining executed claims hold: R7 escaping, file name and `conflictBehavior=fail`; R3/R6 URL encoding; R9 throw propagation; handler golden byte-equality; demo-page golden equality and hostile-slug escaping.
- **Questions:** Should each of these items be relabelled "source-verified" (or the scope narrowed to what ran) in the pass 7 detail and pass 3 row? Does any conclusion in pass 7 rely only on the over-labelled execution?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead read the skeptic's enumeration against the reviewer's command table; the skeptic re-ran gc/probe.js and read the scripts. The reviewer's own command list (commands 7-9) shows which cases ran; the pass-7 detail over-labels six items as executed. No pass-7 conclusion depends solely on the over-labelled items: each is also established from the handler source (IS_GUID shared via snippets.ts:10; R6 missing-setting path identical in shape to R3; R7 logging lines are fixed literals).
  - **Plan Delta:** Coverage record, pass 7 detail and pass 3 row, before → after: "R4: executed: entitySetName array/non-allowlisted rejected; repeated options rejected; id GUID rejects trailing newline and )/x (R10 too)" → "R4: array entitySetName rejected (executed); non-allowlisted string, repeated options and bad `id` for R4: source-verified only (IS_GUID shared with R10, where the two bad-id cases were executed)". "R3/R6 … setting missing → no outbound call (executed)" → "R3 executed; R6 source-verified". R7 logging: "executed" → "source-verified (the only executed R7 run succeeded and logged nothing)". Pass 3 "deterministic output (verified: same text twice and equals golden)" → "deterministic output: equals golden once per recipe (executed); generated-twice equality not executed".

- **ID:** SK-generators-and-catalogue-005
- **Challenge:** Passes 1, 3 and 7 are marked "checked", but part of their evidence base was blocked or never opened: client and package generation never ran, and 11 of the 17 client and package goldens were not opened. The coverage rule says "A blocked pass is never clean".
- **Failure mode:** The coverage table shows full status for passes that are partly blocked. In particular, the README and checklist placement findings (002, 003) and the pass 7 statements about `client.ts` slug placement depend on output nobody executed. The golden fixtures that encode promised client behaviour (AC-4.5/4.6/4.7) were not reviewed one by one.
- **Evidence:** Command 10 (`cmp2.mjs`) exited 1 with `ERR_MODULE_NOT_FOUND: acorn`. The coverage record lists `client/__golden__/{fetch-r1-get, fetch-r2-post, fetch-r4-get, fetch-r4-put, fetch-r5-del, jquery-r1-get, jquery-r2-post, jquery-r4-del}.js.txt`, `liquid-r1-get.liquid.txt`, `liquid-r8-getsummary.liquid.txt`, `package/__golden__/R1.README.md.txt`, `R1.permission-checklist.md.txt` and `R8.README.md.txt` as "skimmed/not individually opened". The pass 1 and pass 3 rows note the limitation in the Limitation column, but still say "checked". Pass 7 gives no limitation for `client.ts` output at all. The skeptic opened `fetch-r4-put.js.txt`, `liquid-r1-get.liquid.txt` and `liquid-r8-getsummary.liquid.txt` and found nothing inconsistent with AC-4.5 or AC-4.7, or with the R1/R8 handler return shapes (`contacts`; `category`, `maximumResults`, ...). That is the skeptic's evidence, not the reviewer's, and it does not cover the other goldens.
- **Questions:** Under the coverage rules, should passes 1, 3 and 7 read "partial", naming the unexecuted client/package path and the unopened goldens, rather than "checked"? Should U3 be cross-referenced from those rows so the gap shows in the table, not only in the unverified list?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read the reviewer's coverage record: cmp2.mjs exited 1 (ERR_MODULE_NOT_FOUND acorn), so generateClient/buildReadme/buildPackageFiles never executed, and 13 goldens (10 client, 3 package) were listed as skimmed/not opened. Pass 3 (completeness) relies in part on golden equality for client and package output, so under "a blocked pass is never clean" it cannot read checked. Pass 1 wiring and pass 7 security were established by reading the generator source in full and do not depend on executing the client/package path, so they stay checked with the limitation made explicit.
  - **Plan Delta:** Coverage table before → after: Pass 3 COMPLETENESS "checked" → "blocked (partial)": evidence column keeps the handler-golden equality (executed) and the FR-3 Musts source comparison; limitation column: "client and package generation not executed (acorn import, command 10); 10 client goldens and 3 package goldens not opened; see U3". Pass 7 SECURITY stays "checked" with the added limitation "client.ts slug placement and README/checklist output verified from source only; not executed". Pass 1 WIRING stays "checked" with its existing limitation.

- **ID:** SK-generators-and-catalogue-006
- **Challenge:** U1 (R4 `post`/`put` forward caller-supplied `@odata.bind`) is correctly held as unverified. However, its provisional grade ("severity would be WARNING") does not match the severity guide. Its recorded check and fix also leave out intended-behaviour evidence and golden/README side effects.
- **Failure mode:** If the probe later confirms the bypass, the candidate is admitted at the wrong grade. The fix would also land without the R4 Differences entry and golden updates that AC-3.7 requires.
- **Evidence:**
  - Grade: U1's own scenario is a caller rebinding its own contact's `parentcustomerid` to another account. That widens Account-scoped access to another account's contacts. The severity guide puts "unauthorized access" under CRITICAL, not WARNING.
  - Intended behaviour: spec line 432 (R4 row) says that if binding is adopted, "`post` binds it, never to a value from the request". That is direct spec evidence that request-supplied binds are not intended. The same row says the checklist would add Append and Append To. If Power Pages enforces those privileges on server-logic Dataverse calls, the recipe's lack of them is the mitigation the probe must establish.
  - Reachability: re-running probe.js shows `R4 post proto` passing `parentcustomerid_account@odata.bind` through to `CreateRecord` unchanged (r4.ts:230). `put` takes the same path (r4.ts:249).
  - Side effects: a body allowlist or `@`-key rejection would change `handlers/__golden__/R4.js.txt`. AC-3.7 (spec line 181) requires each difference to be listed under "Differences from Learn", which means a new `R4_DIFFERENCES` entry and a regenerated `package/__golden__/R4.README.md.txt`. U1's fix text mentions neither.
- **Questions:** Should U1's record name CRITICAL as the grade it would take if the probe shows no denial, and cite spec line 432 as intended-behaviour evidence? Should the check needed spell out both probes: an `@odata.bind` create without Append/Append To, and an update rebinding the caller's own contact? Should the fix note list the R4 handler golden, `R4_DIFFERENCES` and the R4 README golden?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read spec.md:432 (R4 row): "`post` binds it, never to a value from the request" is explicit intended-behaviour evidence that request-supplied binds are not wanted, and the same row names the Append / Append To consequence. The severity guide grades "unauthorized access" as CRITICAL; the candidate's own scenario (rebinding the caller's contact to another account to widen Account-scoped reads) is unauthorized access if the platform does not deny it. AC-3.7 (spec.md:181) requires every difference from Learn to be listed, so any fix touches the R4 handler golden, R4_DIFFERENCES and the R4 README golden. U1 remains unverified: whether Dataverse enforces Append/Append To on server-logic connector writes cannot be shown from source.
  - **Plan Delta:** Unverified candidate U1, before → after: provisional grade "WARNING" → "CRITICAL if a dev-site probe shows the bind is accepted without Append/Append To"; evidence adds spec.md:432; check needed becomes two probes (create with `parentcustomerid_account@odata.bind` under the recipe's grants; update rebinding the caller's own contact); fix note adds R4.js.txt golden, R4_DIFFERENCES entry and R4.README.md.txt golden. Still not a confirmed finding.

- **ID:** SK-generators-and-catalogue-007
- **Challenge:** U2 (`SiteSetting.Get` outside try in R7/R9) is correctly held back. Its recorded "check needed" (`Get("DoesNotExist")`) probes the trigger Learn least suggests. The documented failure case is a site setting backed by a Key Vault environment variable, which is how the spec says R7's `CLIENT_SECRET` is held.
- **Failure mode:** A clean result for the missing-name probe could close U2, while the realistic throw path (Key Vault access or a missing secret behind an environment-variable-backed setting) stays untested.
- **Evidence:** In the goldens, R7 (R7.js.txt:94–114) and R9 (R9.js.txt:21) call `Server.SiteSetting.Get` before the first `try`, whereas R3 (R3.js.txt:12) and R6 (R6.js.txt:12) call it inside `try`. Spec line 435 says R7's secret "is held in Key Vault behind an environment variable". Learn "Use environment variables with site settings", Troubleshooting, lists "Key Vault access issues ... the runtime is missing permissions or the secret is missing" as error causes. It does not say whether `Get` throws or returns empty. FR-3 (spec line 500) covers only the missing-or-empty result. Learn's own Graph/SharePoint sample reads these settings at module scope, outside any function, so the current placement follows Learn.
- **Questions:** Should U2's check needed name the Key Vault-backed environment-variable case (R7 `CLIENT_SECRET`), with access denied and with the secret missing, alongside the missing-name probe? Should U2 note that the current placement follows Learn, so a fix is a new difference under AC-3.7 for R7?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead compared the goldens: R7.js.txt and R9.js.txt read site settings before the first `try`, R3.js.txt and R6.js.txt inside it (skeptic's line cites). spec.md:435 places R7's CLIENT_SECRET in Key Vault behind an environment variable, and Learn's troubleshooting lists Key Vault access and missing-secret errors for exactly that configuration, so that is the realistic throw path; the missing-name probe alone could close U2 falsely. Learn's own sample reads settings at module scope, so a fix is a new AC-3.7 difference for R7.
  - **Plan Delta:** Unverified candidate U2, before → after: check needed adds "probe `Server.SiteSetting.Get` for a Key Vault-backed environment-variable setting with (a) runtime access denied and (b) the secret missing, in addition to a missing name"; note added that the current placement follows Learn, so a change is a new 'Differences from Learn' entry for R7. Still not a confirmed finding.


### E.4 inspector-session-and-scan

### Skeptic Round — Domain: inspector-session-and-scan

#### Input

- Source snapshot: /home/user/PowerPage-ServerLogic, branch `refine-app`, HEAD 8dff4f1a2d55f085f7a98a16e19f72656dd52808 (re-confirmed with `git rev-parse HEAD`; `git status --short` empty).
- Domain's Plan v1 slice: one admitted finding, `inspector-session-and-scan-001` (WARNING, pass 2, `src/features/inspector/scan/parseRecords.ts:219`): unreadable AllowedDomains content degrades to "no allow list" and yields a reviewable O5 "Outbound calls are blocked" finding. Unverified candidates U-1 to U-6 stay outside the confirmed list. No alias IDs.
- Coverage record and limitations: review-inspector-session-and-scan.md (coverage table passes 1-7 all "checked", commands 1-28, verified-clean list, U-1 to U-6). node_modules is absent, so typecheck, lint and vitest are blocked (U-6). The packet holds no other domain's findings; the isolation check passed.
- Relevant source evidence and access limits: I read in full `parseRecords.ts`, `settings.ts`, `checks.ts`, `grantSet.ts`, `queries.ts`, `scan.ts`, `limiter.ts`, `inspectorSession.ts` and `InspectorSessionProvider.tsx`. I made targeted reads of `scan.test.ts:500-604`, `parseRecords.test.ts:36-50, 235-262`, `checks.test.ts:170-200`, `settings.test.ts:60-100` and `inspectorSession.test.ts:495-515`, and listed the test names in `InspectorSessionProvider.test.tsx`. From the spec I read lines 640-690, 760-800 and 1080-1100 and grepped for malformed/degrade/AllowedDomains/inventory incomplete. I also grepped `ResultsView.tsx` selection handling (supporting, other domain). I re-ran the type-safety scan with `rg --pcre2` over the domain's non-test source; it exits 0 and matches only comments. No checks could be executed. All of the above is source reading.
- Claims I tested that hold, so no challenge was raised:
  - **Cancellation and generation guards.** Every `abortScan()` caller also bumps `generation`: inspectorSession.ts:219-225, 248-256, 307-315 and 321-325. Every late path checks `mine === snapshot.generation`: 262, 270, 276 and 279. `listToken` guards the site list (212, 215, 231).
  - **Limiter rejection handling.** limiter.ts:25-31 hands the slot off in `finally` on rejection and on a synchronous throw. Inside `guarded` (scan.ts:71-95) there is no nested acquisition.
  - **Settle-all.** scan.ts:142-148, 163-173 and 238-247 hold up.
  - **Identity re-check.** scan.ts:267-278 accepts a rejected re-read and abandons the scan on a changed id, a changed URL or null.
  - **Type-safety scan.** The claim of no `as`, `any` or `!` in non-test code holds.

#### Challenges and Lead Responses

- **ID:** SK-inspector-session-and-scan-001
- **Challenge:** The admission of inspector-session-and-scan-001 as a defect, and its WARNING grade under "misleading user/operator feedback". The degrade looks deliberate and documented, the O5 status is spec-correct for an empty value, and the claim that the statement is "false" is not established.
- **Failure mode:** Intended, tested behaviour gets reported as a defect, and a speculative runtime claim is graded as demonstrated impact.
- **Evidence:**
  - The code's contract states the degrade on purpose. parseRecords.ts:233-236 reads: "a matched row whose own content is unreadable only degrades that one setting." Two tests pin it:
    - scan.test.ts:530-546 ("degrades one malformed setting to an empty value", with `content: '{not json'`);
    - parseRecords.test.ts:247-253, an `it.each` that degrades four inputs to `{kind:'value', raw:''}`: unreadable content `'{x'`, no `value`, a numeric `value` and a blank `envvar_schema`.
  - The slice cites only the first test.
  - Spec FR-7 (spec.md:662) says to treat AllowedDomains as "no allow list" when it is "absent, empty or Learn's default text". O5 (spec.md:793) is itself Needs review, so the status shown is Needs review either way (checks.ts:236 pushes the O5 row as a reason).
  - The spec's skip-and-banner rule for unreadable rows (spec.md:668) covers only type 11 and type 18 rows, not type 9 settings.
  - FR-8 "Default to Needs review when evidence can't be read" (spec.md:769) is already met. AC-7.7 (spec.md:292) is about an identity that "can't read some configuration" (access), not about corrupt content.
  - The strongest spec hook for the finding is O2 (spec.md:790), "`AllowedDomains` is set but can't be parsed". The slice does not cite it.
  - The finding calls O5 "a false statement". Nothing in the slice shows what the Power Pages runtime does with an unparseable `content`. If the runtime also reads it as empty, then with `AllowNetworkingToAllDomains` = `false` calls really are blocked (spec correction 20, spec.md:121), and the message is accurate.
  - Reachability rests only on "a hand-edited or corrupted row". The slice shows no write path that stores invalid JSON in a type-9 row.
- **Questions:**
  - Does the spec actually forbid this degrade? Is "set but can't be parsed" in O2 meant to cover unparseable `content`, or only an unparseable `value` string?
  - Is there evidence (Learn, a spike or a live row) of how the runtime treats unparseable setting content, enough to call the O5 text false rather than unverified?
  - Without that evidence, does the candidate meet admission criterion 3 (impact) for WARNING, or does it belong in Unverified candidates or an owner decision on a deliberate, tested design?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Partial acceptance; the finding survives in corrected form. Lead re-read spec.md:662 (empty AllowedDomains = no allow list), :683 (`content.value` is a string), :790 (O2: "`AllowedDomains` is set but can't be parsed" → Needs review "Couldn't interpret `<setting>`"), :793 (O5), parseRecords.ts:218-236 and parseRecords.test.ts:247-253, settings.ts:52-62 and :80-90. The degrade-to-empty-string is deliberate and tested, and for `Enabled`, `AllowNetworkingToAllDomains` and `TimeoutInSeconds` an empty raw value already yields a reviewable "Couldn't interpret"/invalid text, so the design is sound there. For `AllowedDomains` alone, an empty string is a *valid* value (spec :662), so the degrade conflates "row present but unparseable" with "present and empty" and emits the O5 row where spec O2 applies. That is a source-verified spec-conformance defect with user-visible wrong reason text, which is the severity guide's "misleading user/operator feedback" case; WARNING is retained on that basis, not on the runtime claim. The skeptic is right that nothing establishes what the Power Pages runtime does with unparseable content, so the words "false statement" are withdrawn; the misleading element is that the tool asserts knowledge of an empty list it could not read. Reachability: the spec itself provides O2 for this condition, and type-9 `content` is maker-editable JSON; no write path was shown, which the record now states.
  - **Plan Delta:** inspector-session-and-scan-001: Severity unchanged (WARNING). Problem before → after: "silently converted … which is a false statement about a row the tool could not read" → "an unparseable AllowedDomains row degrades to the valid empty value, so the Outbound check emits the O5 row ('no domains are allowed') where spec O2 ('Couldn't interpret `ServerLogic/AllowedDomains`') applies; the reason text asserts an empty list the tool could not read. Runtime behaviour for unparseable content is unknown and is not claimed." Evidence adds spec.md:662, :683, :790, :793 and parseRecords.test.ts:247-253 as the second pinning test; intent note now reads "degrade is deliberate (parseRecords.ts:233-236) and correct for the other three settings".

- **ID:** SK-inspector-session-and-scan-002
- **Challenge:** The proposed fix (a distinct unreadable binding mapped to a read failure with `readFailure: true`, Mark as reviewed withheld) conflicts with spec precedent. It also reaches beyond AllowedDomains and understates which tests encode the current behaviour.
- **Failure mode:** The fix moves the problem rather than solving it. It makes a reviewable analysis-limit case non-reviewable against an owner decision, changes Enabled and Timeout banners that are not wrong today, or adds incorrect environment-variable text.
- **Evidence:**
  - **Spec precedent.** The owner decision of 2026-10-20 (spec.md:28) reads: "empty or unparseable code is the reviewable analysis limit 'Couldn't analyse handler code', and only a failed download stays a read failure". The closest analogue (evidence retrieved, but its content unparseable) is therefore reviewable.
  - **O2 is reviewable too.** O2's "Couldn't interpret" is emitted with `readFailure: false` (settings.ts:58-61, 83-89). A spec-aligned outcome for unparseable AllowedDomains content would then be O2 and reviewable, not a withheld read failure.
  - **Reusing the env-var kind is wrong.** The fix offers reusing an "`envvar-unreadable`-style" value. That kind produces `envVarFailureText` with `fromEnvVar: true` (settings.ts:37-42), and `settingSnapshot` adds ENVVAR_CACHE_NOTE whenever any setting is `envvar-unreadable` (settings.ts:169-176). Both would be wrong for a non-env-var row.
  - **Blast radius.** `bindingFromContent` serves all four settings (parseRecords.ts:251-256). Enabled already gets "Couldn't interpret" and Timeout gets "isn't a positive integer up to 240" from `raw: ''` (settings.ts:55-62, 107-120). Neither is misleading.
  - **Spec texts would change.** Spec.md:664 has a distinct Timeout text for a failed read ("Couldn't read `ServerLogic/TimeoutInSeconds`"), so the fix would change spec-visible banner texts for settings the finding does not claim are wrong.
  - **Tests.** parseRecords.test.ts:247-253 also pins the current behaviour. The fix names only scan.test.ts:530.
- **Questions:**
  - Should the remedy produce a reviewable O2-style "Couldn't interpret `ServerLogic/AllowedDomains`" rather than a non-reviewable read failure, given spec.md:28 and :790?
  - Is the fix scoped to AllowedDomains or to all four settings, and which spec banner texts change if it covers all four?
  - Should the owner-decision note name both pinning tests?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read spec.md:28 (2026-10-20 owner decision: unparseable evidence is a reviewable analysis limit; only a failed download is a read failure), settings.ts:52-62 and :80-90 (O2 "Couldn't interpret" is emitted with `readFailure: false`), settings.ts:37-42 and :169-176 (env-var failure text and cache note tied to the `envvar-unreadable` kind) and spec.md:664 (distinct Timeout failed-read text). The reviewer's remedy (read failure, Mark as reviewed withheld, reuse of the env-var kind) contradicts the owner decision, would add env-var text to a non-env-var row, and would change Enabled/Timeout banners that are correct today. The spec-aligned remedy is a reviewable O2 outcome for AllowedDomains only.
  - **Plan Delta:** inspector-session-and-scan-001 fix, before → after: "Return a distinct binding for unreadable content … mapped to an `envvar-unreadable`-style read failure … so the check carries `readFailure: true` and Mark as reviewed is withheld" → "Return a distinct `SettingBinding` kind (e.g. `{kind:'unparseable'}`) from `bindingFromContent` when `content` is not a JSON object or `value` is not a string; in `settings.ts` map it for `ServerLogic/AllowedDomains` to the O2 reason `Couldn't interpret \`ServerLogic/AllowedDomains\`` with `readFailure: false` (reviewable, per spec.md:28 and :790), and for the other three settings to the same text they emit today for an empty raw value, so no banner text changes. Do not reuse the env-var kind. Update both pinning tests (scan.test.ts:530 and parseRecords.test.ts:247-253) and add a scan test: AllowedDomains `content: '{not json'` + `AllowNetworkingToAllDomains=false` + HttpClient → reason text 'Couldn't interpret', status Needs review, Mark as reviewed available, no 'no domains are allowed' text." Owner-decision note now names both tests.

- **ID:** SK-inspector-session-and-scan-003
- **Challenge:** The problem statement and the fix disagree in scope, and the fix's "unreadable content" case may include a legitimately empty setting. There is also a File:Line imprecision.
- **Failure mode:** A fix built to the slice either leaves half the stated defect in place, or turns an empty AllowedDomains row into a false "couldn't read" (the mirror of the defect alleged).
- **Evidence:**
  - **Scope mismatch.** The problem statement covers a non-object `content` and a `value` that is not a string (parseRecords.ts:224). The fix says to "keep the current behaviour for a readable object without `value`" and is silent on a numeric `value`, which parseRecords.test.ts:249 pins to the same degrade. The spec's documented shape is "`content.value` (a string) with `source` 0" (spec.md:683). It is not clear why a missing `value` is benign while a numeric one is a defect.
  - **Null column.** `parseContent` returns null for a non-string `content` (parseRecords.ts:53-54), and parseRecords.test.ts:43 lists `null` among the "unreadable content" cases. A Dataverse `content` column that is simply null therefore takes the same path as `'{not json'`. The slice does not establish whether Power Pages ever stores a null or empty `content` for a type-9 row with an empty value. If it does, the fix would mark an empty AllowedDomains, which is "no allow list" per spec.md:662, as unreadable.
  - **File:Line.** The finding cites `checks.ts:233` for the O5 text, which is at checks.ts:234; line 233 is the `hosts.length === 0` ternary branch. Minor.
- **Questions:**
  - Which inputs does the finding claim are defective: non-JSON, null column, non-object JSON, non-string `value`, missing `value`?
  - Is a null `content` column reachable for a real site setting, and how should it be classified?
  - Should the File:Line be corrected to checks.ts:234?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read parseRecords.ts:53-56 (`parseContent` returns null for any non-string `content`, so a null column and `'{not json'` share a path), parseRecords.test.ts:247-253 (four degraded inputs), spec.md:683 (`content.value` is a string with `source` 0) and checks.ts:228-237 (the O5 string is on line 234). Scope is settled against spec :683: non-string content, non-object JSON, and a non-string `value` are all "can't be parsed" (O2). A `source` 0 object with no `value` key, and a null `content` column, are ambiguous: the spec documents `value` as a string but does not say how an empty setting is stored. The fix must not flag a legitimately empty row as unreadable, so those two inputs are a live-site check, not part of the confirmed defect.
  - **Plan Delta:** inspector-session-and-scan-001: Evidence File:Line for the O5 text corrected checks.ts:233 → checks.ts:234. Scope statement added: "defective inputs: non-string `content`, `content` that is not a JSON object, `value` that is not a string (spec.md:683). A `source` 0 object without `value`, and a null `content` column, are to be classified after a live-site check of how an empty AllowedDomains row is stored; until then they keep today's behaviour." Fix verification adds that live check (recorded as a coverage limit, not a blocker to the finding).

- **ID:** SK-inspector-session-and-scan-004
- **Challenge:** Two unverified candidates can be resolved now from source and spec evidence, so their "unverified" disposition overstates open risk. Neither should be a finding. U-2 is correctly left unverified.
- **Failure mode:** Resolvable candidates stay in the open list and inflate the domain's unresolved surface. The run status then reflects work the reviewer could have closed.
- **Evidence:**
  - **U-1.** The spec explicitly sanctions the behaviour. Spec.md:1211 reads: "Inventory rows with no readable id, name or state are skipped and make the inventory incomplete". The prescribed copy is the AC-7.3 / Error Scenarios text "Inventory incomplete. Reconnect and rescan." (spec.md:288, 925; rules.ts:45). Not naming skipped inventory rows conforms to the spec; there is no defect to confirm, even at INFO.
  - **U-5.** `selectFile` (inspectorSession.ts:345-347) is fed only by the file list's `onSelect` (ResultsView.tsx:116). ResultsView resolves the stored id with `files.find(...)` and falls back to the site view when there is no match (ResultsView.tsx:44, 47, 53, 136). `openExport` re-validates it (inspectorSession.ts:362-364). A foreign id has no reachable trigger and no impact, so the check the reviewer asked for is done and the result is negative.
  - **U-2 holds as unverified.** The spec's data-source table records `statecode` for table permissions (spec.md:682) but not for web roles (spec.md:679). FR-7/FR-9 define activity only for permissions and settings, and the U-2 grep for an inactive-role rule finds nothing. Unverified with a Learn check is the right disposition.
- **Questions:**
  - Should U-1 and U-5 move from Unverified candidates to a resolved or no-finding record, citing spec.md:1211 and ResultsView.tsx:44?
  - Does U-2 stay unverified with the Learn check named?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read spec.md:1211 (inventory rows with no readable id, name or state are skipped and make the inventory incomplete; prescribed copy is the AC-7.3 text) and ResultsView.tsx:42-54 (`files.find(...)` with fallback to the site view when the stored id matches no file) plus the skeptic's cites of ResultsView.tsx:116 and inspectorSession.ts:362-364. U-1 is spec-conformant behaviour; U-5 has no reachable trigger and no impact. U-2 keeps its Learn check: spec.md:679 records no `statecode` for web roles.
  - **Plan Delta:** Unverified candidates, before → after: U-1 → resolved, no finding (spec.md:1211 sanctions the behaviour and the copy). U-5 → resolved, no finding (ResultsView.tsx:44 fallback; selectFile fed only from the file list; openExport re-validates). U-2 unchanged (unverified; needs Learn confirmation that an inactive web role is ineffective). U-3, U-4, U-6 unchanged.

- **ID:** SK-inspector-session-and-scan-005
- **Challenge:** The coverage record overstates test-evidence depth. The rows marked "checked" rely partly on tests that were never opened, and the record contradicts itself on how many.
- **Failure mode:** The coverage table implies that tests were read for masking defects (a base-packet budget requirement) when six files were seen by name only. A defect masked by those tests would be reported as covered.
- **Evidence:**
  - **Count contradiction.** The reviewer's line 8 lists six test files not opened past their names: `InspectorSessionProvider.test.tsx` (310 lines), `rules.test.ts` (202), `settings.test.ts` (202), `queries.test.ts` (93), `evidence.test.ts` (350) and `envvarCause.test.ts` (59), 1216 lines in all (`wc -l`). Line 10 says "the 5 test files named above" and also "none of the 29 assigned files was unreviewed".
  - **Pass 1 (WIRING).** The row claims the React StrictMode double-effect path is "covered by `inspectorSession.test.ts:501`". That is a store-level `stop()`/re-`adopt` test (inspectorSession.test.ts:501-515). The React-level test, "survives StrictMode double effects and still loads the sites" at InspectorSessionProvider.test.tsx:155, sits in a file that was never opened.
  - **Pass 3 (COMPLETENESS).** Settings parsing is marked as matching FR-7 while `settings.test.ts` was unread. That file pins `''` → no list (settings.test.ts:66-71), which bears directly on finding 001.
  - **Name-only listing.** Seeing only test names for `parseRecords.test.ts` missed that 247-253 pins the degrade for four inputs (see SK-001).
  - **What is honest.** Command 22 (exit 2) is recorded correctly as a tool error and re-run as command 23 (exit 0). I reproduced the re-run's result, so that row is fine.
- **Questions:**
  - Should passes 1 and 3 read "checked (tests partially read)" or list the six unopened test files as a limitation in the row itself, rather than only in the header?
  - Should the "none unreviewed" statement and the 5-versus-6 count be corrected?
  - Does any unopened test (notably `settings.test.ts`, `rules.test.ts` and `InspectorSessionProvider.test.tsx`) pin behaviour that changes a slice conclusion?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead compared the reviewer's coverage record lines: six test files are listed as read by name only (InspectorSessionProvider.test.tsx, rules.test.ts, settings.test.ts, queries.test.ts, evidence.test.ts, envvarCause.test.ts) while the summary says five and "none unreviewed". The pass-1 StrictMode evidence cites the store-level test, and the Provider-level test at InspectorSessionProvider.test.tsx:155 was not opened. Lead checked whether any unopened test changes a slice conclusion: settings.test.ts:66-71 pins '' → no list, which matches spec.md:662 and is consistent with the corrected finding (the defect is the conflation upstream in parseRecords, not the '' → no list rule); parseRecords.test.ts:247-253 is now cited in the finding. No conclusion changes.
  - **Plan Delta:** Coverage record, before → after: "the 5 test files named above" → "the 6 test files named above (1,216 lines) were read by name only"; "none of the 29 assigned files was unreviewed" → "all 29 files were opened; six test files were read by test name only". Pass 1 WIRING limitation adds "Provider-level StrictMode test (InspectorSessionProvider.test.tsx:155) not read; store-level test cited". Pass 3 COMPLETENESS limitation adds "settings.test.ts, rules.test.ts, evidence.test.ts, envvarCause.test.ts, queries.test.ts read by name only". Status values stay checked (source was read in full; tests are secondary evidence here), with the limitation visible in the rows.


### E.5 inspector-ui-and-report

### Skeptic Round — Domain: inspector-ui-and-report

#### Input

- Source snapshot: `/home/user/PowerPage-ServerLogic`, branch `refine-app`, HEAD `8dff4f1a2d55f085f7a98a16e19f72656dd52808` (`git rev-parse HEAD`, exit 0). No repository file edited; nothing installed or downloaded.
- Domain's Plan v1 slice, including original/alias finding IDs: `planv1-inspector-ui-and-report.md`. Admitted: inspector-ui-and-report-001 (INFO, pass 3, `buildReportModel.ts:108`), -002 (INFO, pass 5, `renderPdf.ts:176`), -003 (PRUNE, pass 4, `reportFileName.ts:38`). No aliases. Unverified U-1 to U-6 stay outside confirmed findings; U-5 is routed to the lead.
- Coverage record and limitations: `review-inspector-ui-and-report.md` (coverage table passes 1–7, commands 1–11, unverified U-1 to U-6). Known limits: no `node_modules`, so typecheck, lint, vitest and `npm audit` are blocked; no jsPDF source on disk.
- Relevant source evidence and access limits: I read these with `cat -n`, `sed -n` and `rg` (all exit 0 unless noted): `report/buildReportModel.ts`, `reportFileName.ts`, `reportModel.types.ts`, `renderMarkdown.ts`, `__golden__/file.md`, `renderPdf.ts` (160–200, 280–295, 340–375, 425–470), `FindingDetail.tsx:40–80`, `ReadinessTile.tsx`, `FilesRail.tsx:8–16`, `ResultsView.tsx:40–100`, `ExportDialog.tsx:1–40`, `InspectorPage.tsx:1–120`, `reportFixtures.ts` (20–40, 123–172), `testCmap.ts:1–5`; tests `buildReportModel.test.ts` (53–95, 225–285), `renderPdf.test.ts` (95–112, 255–300, 315–348), `StatusBadge.test.tsx:1–30`, `inspectorSession.test.ts:750–765`, `src/skeleton.test.ts` (1–40, 130–160). Supporting: `model/checks.ts:50–260`, `components/checkStatusBadge.ts`, `lib/ringGeometry.ts:1–60`, `app/inspector-site/inspectorSession.ts` (1–40, 125–185), `services/pptb/hostErrors.ts`, `services/pptb/pptbHost.ts` (40–75, 160–185), `tsconfig.app.json`, `eslint.config.ts:52`, spec `spec.md` (345–375, 1060–1110), `docs/phase-5/plans/p5-7_plan.md` (180–182, 365–382), `docs/phase-5/plans/p5-7_supervised-review.md` (by `rg`, lines 323 and 433), `plan-starter.md:296–306, 463`. Without the jsPDF source I cannot check how library metadata is encoded (U-1). I ran no tests.
- Isolation check: the packet holds only this domain's slice and raw result, and nothing from another domain's findings. Other domains' files sit in the same work folder; I did not open them.

#### Challenges and Lead Responses

- **ID:** SK-inspector-ui-and-report-001
- **Challenge:** The plan slice calls finding 001 a "registered spec deviation (AC-9.2)". The reviewer supports its impact with AC-9.8 ("the report no longer matches the screen"). Both labels overstate or misplace the status. Read on its own, "registered" suggests an owner-known, accepted deviation. The register section is headed "Code deviations without an owner decision", and it says "none of these has a recorded decision. Each needs either a spec change or a code fix" (`spec.md:1071–1073`). So the item is open, not accepted. Admitting it is consistent with that, but the recommended fix chooses the code-fix branch, and that choice belongs to the owner. The impact claim is also loose. AC-9.8 compares the report's "statuses and reasons" with the screen (`spec.md:368`). The duplication changes neither: the same reasons appear, only more than once. The clause actually affected is AC-9.2's H3 structure (`spec.md:356`).
- **Failure mode:** If the record keeps the "registered" wording, readers may think an owner accepted the deviation, or think the audit found nothing new. Citing AC-9.8 overstates a redundancy as a mismatch, and the final report could carry that overstatement.
- **Evidence:** Finding 001; `spec.md:1071–1073, 1100`; `spec.md:356, 368`. The O3–O5 "three times" case holds up. `checks.ts` ends `outbound` with `makeFinding('outbound', row, reasons, [row, ...detail])` after `reasons.push({ text: row, … })`, and `makeFinding` prepends `reasons.map(text)` to `detail`, so `detail` holds `row` twice. The proposed `.filter((line) => !reasons.includes(line))` removes both copies. Every other `detail` entry is a fixed note (`OTHER_ROLES_NOTE`, `FLOW_NOTE`, `ENVVAR_CACHE_NOTE`, "Change privileges found…", "Based on exported function names…"), so the filter removes nothing the screen keeps (`FindingDetail.tsx:58` uses the same predicate).
- **Questions:** Should the slice text say "open code deviation with no owner decision (spec.md:1071–1073, 1100)" instead of "registered spec deviation"? Should the Impact cite AC-9.2's structure rather than AC-9.8? Should the Fix offer both register branches (spec change or code fix) for the owner to choose? With the impact limited to redundant text, does INFO's "concrete consequence" still apply?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read spec.md:1071-1073 (section 'Code deviations without an owner decision … none of these has a recorded decision. Each needs either a spec change or a code fix') and :1100 (the AC-9.2 row), :371 (AC-9.8 compares statuses and reasons, which the duplication does not change). The item is open, not owner-accepted, and the affected clause is AC-9.2's H3 structure, not AC-9.8. INFO stands: the exported Markdown and PDF verifiably print each reason two or three times while the screen prints it once, a concrete difference in a deliverable the register itself says needs a fix.
  - **Plan Delta:** inspector-ui-and-report-001: slice wording "registered spec deviation (AC-9.2), still present" → "open code deviation with no owner decision (spec.md:1071-1073, :1100)". Impact before → after: "the report no longer matches the screen (AC-9.8)" → "each reason is printed two to three times in the AC-9.2 H3 block and PDF finding block; AC-9.8 statuses and reasons are unaffected". Fix now offers both register branches: (a) code fix (filter, see SK-002) or (b) spec change accepting the repetition; the choice is the owner's. Severity unchanged (INFO).

- **ID:** SK-inspector-ui-and-report-002
- **Challenge:** Finding 001's fix and verification do not account for existing tests that lock in the duplicated shape. The coverage claim "I found no test that masks a defect in the admitted findings" rests on a partial read of `buildReportModel.test.ts`.
- **Failure mode:** If the fix is applied as written, two existing redaction tests fail. The obvious repair, changing them to expect `detail: []`, deletes the only assertion that `detail` text passes through `redact`. The "smallest change" would then quietly weaken AC-9.6 redaction coverage. A second, smaller point: the proposed filter compares strings after redaction, while the screen compares them before (`FindingDetail.tsx:57–58` uses raw `reason.text`). The proposed filter differs from the screen's predicate, contrary to how the fix presents it.
- **Evidence:** In the redaction tests, `buildReportModel.test.ts:236–240` builds a finding with `reasons: [{ text: unredacted }]` and `detail: [unredacted]`, i.e. a detail equal to its reason, which is the real `makeFinding` shape. Lines 266–276 then assert `toMatchObject({ … reasons: [expected], … detail: [expected] })` on both `model.rows[0].checks[1]` and the review `section`. After the filter, `detail` would be `[]`. Arrays in `toMatchObject` must match in length, so both assertions would fail. The test at lines 53–95 builds the same shape (`reasons: [{ text }]`, `detail: [text]`) but only checks the serialised model, so it would still pass. The reviewer read this file "by test name plus … bodies (not every line)" (raw result line 16). Its verification step names only the Markdown golden and the `renderPdf.test.ts` long-text count. The long fixture's `detail` is `${check} detail.` (`reportFixtures.ts:29`), so that count is unaffected. I did not run the tests; vitest is blocked.
- **Questions:** Should finding 001's verification step name `buildReportModel.test.ts:236–276`, and require a separate non-reason `detail` line so that the redaction assertion survives? Should the coverage sentence "no test masks a defect" be changed, given that two tests encode the duplicated output as expected? Should the fix say whether to filter before or after redaction?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read buildReportModel.test.ts:232-278: the redaction fixture sets `detail: [unredacted]` equal to its reason and asserts `detail: [expected]` on both the row check and the section, so the proposed filter would empty `detail` and fail both `toMatchObject` assertions; changing them to `[]` would remove the only assertion that detail text is redacted. FindingDetail.tsx:57-58 filters on raw `reason.text` before any redaction, while the proposed filter compares after redaction. The reviewer's "no test masks a defect" sentence is therefore wrong for this finding.
  - **Plan Delta:** inspector-ui-and-report-001 fix, before → after: "use `detail: finding.detail.map(redact).filter((line) => !reasons.includes(line))`" → "filter on raw text first, matching the screen's predicate (`finding.detail.filter((line) => !finding.reasons.some((r) => r.text === line)).map(redact)`); update buildReportModel.test.ts:236-276 so the redaction fixture carries one non-reason detail line (e.g. `detail: [unredacted, 'note ' + unredacted]`) and keeps asserting that detail text is redacted; regenerate the Markdown golden if affected." Coverage record sentence "I found no test that masks a defect in the admitted findings" → "buildReportModel.test.ts:236-276 encodes the duplicated detail shape as expected output and would fail the fix as first proposed".

- **ID:** SK-inspector-ui-and-report-003
- **Challenge:** Finding 002 (INFO, pass 5 BLOAT) may not meet admission as a "concrete consequence"; the severity guide excludes "speculative improvements or stylistic preferences" from INFO. The trigger the finding names, "renaming a status word" or a status change, is largely caught by the type system and tests today. What is left is a hypothetical future edit to a mapping the spec fixes.
- **Failure mode:** A refactoring preference gets reported as a verified issue, which inflates the finding count and sets a standard the reviewer did not apply consistently elsewhere in the same file.
- **Evidence:**
  - Adding or renaming a `CheckStatus` member breaks the build in both ring tables. `ReadinessTile.tsx:9–14` uses `satisfies Record<CheckStatus, RingState>`, so a missing key is a type error. `renderPdf.ts:176–186` is a `switch` with no `default` and a declared `RingState` return, so a non-exhaustive switch is a "lacks ending return statement" error under `strict` (`tsconfig.app.json`). `eslint.config.ts:52` also sets `switch-exhaustiveness-check: 'error'`.
  - `STATUS_TEXT` (`buildReportModel.ts:9–14`) is also `Record<CheckStatus, string>`. `StatusBadge.test.tsx:10–15` pins the four screen labels.
  - Only a change of value in one table goes uncaught. For the ring, AC-8.1 fixes the value: Reviewed counts toward K (`ReadinessTile.tsx:8`), so changing it is itself a spec change.
  - The same "format-specific mapping duplicated" pattern exists elsewhere without being flagged: `renderPdf.ts:283–291` `resultCell` against `FilesRail.tsx:11` `PILL_KIND`. The finding does not explain why one pair is a hazard and the other is not.
  - The fix moves code into `src/lib/ringGeometry.ts`, which host-and-shell owns, so it creates a cross-domain dependency for a lookup of a few lines.
  - The claim "no test imports both" is true, but I found no failing change scenario short of an intentional spec change made in one place.
- **Questions:** Can the lead name a concrete change, one that is not a spec change, that compiles, passes the existing tests and produces a screen/report mismatch? If not, should 002 move to Unverified or be dropped as a stylistic consolidation? If kept, why does `resultCell`/`PILL_KIND` not qualify too?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read ReadinessTile.tsx:9-14 (`as const satisfies Record<CheckStatus, RingState>`), renderPdf.ts:176-186 (exhaustive `switch` with declared return under strict and `switch-exhaustiveness-check: 'error'` at eslint.config.ts:52), buildReportModel.ts:9-14 (`Record<CheckStatus, string>`) and renderPdf.ts:283-291 vs FilesRail.tsx:11 (the same duplicated-mapping shape, unflagged). Adding or renaming a status fails to compile in both places; only an intentional value change to a spec-fixed mapping (AC-8.1) slips through, which is a spec change, not a maintenance hazard. No concrete consequence is established and the pattern was not applied consistently, so this is a stylistic consolidation.
  - **Plan Delta:** inspector-ui-and-report-002: REMOVED from confirmed findings (INFO → not admitted). Retained as a non-finding observation: two format-specific lookups of CheckStatus (ring state, status label) and one of file result (`resultCell` vs `PILL_KIND`) exist per surface; types and lint keep their keys in step. ID reserved, not reused.

- **ID:** SK-inspector-ui-and-report-004
- **Challenge:** Finding 003 (PRUNE) says `reportFileName(model)` and `ReportModel.format`/`stem` have no production reader, and that removing them preserves "external contracts". The reviewer missed a contract test and two planning records. Coverage row 4 says "Limitation: None", which is inaccurate.
- **Failure mode:** The audit recommends deleting a planned, type-pinned interface that a previous supervised review already examined and deliberately kept. Applying the fix breaks `src/skeleton.test.ts` and reverses a recorded disposition without saying so.
- **Evidence:**
  - `src/skeleton.test.ts:19, 148`: `expectTypeOf(reportFileName).toEqualTypeOf<(m: ReportModel) => string>()`, in the block that pins the planned module contracts alongside `buildReportModel`, `renderMarkdown` and `renderPdf`. The raw result lists the test references as `buildReportModel.test.ts` and `inspectorSession.test.ts:761` only.
  - `plan-starter.md:302–303` lists `reportFileName(m: ReportModel): string` as a planned interface, and `reportIdentity(...)` as returning `Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title'>`. `plan-starter.md:463` records a dated decision ("`reportFileName` returns the complete name including the model's format extension").
  - `docs/phase-5/plans/p5-7_plan.md:376` gives the disposition of an earlier finding, "export-controller-005 (redundant `reportFileName`) | one name computation; `reportFileName` not in `InspectorDeps`; … equality assertion kept". Its plan table at line 324 names "saved name equals `reportFileName(model)`" as the AC-9.2–9.4/9.10 evidence.
  - The second half of the fix, removing `format`/`stem` from `ReportModel`, is not a pure deletion. `ReportIdentity` is defined as `Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title'>` (`reportFileName.ts:5`), so the type has to be redefined. `stem` is also asserted in `renderPdf.test.ts:160`, which the raw result does not list.
- **Questions:** Does a type-pinned contract in `skeleton.test.ts` plus a previous disposition of "kept" count as an external contract under PRUNE's "preserving … external contracts"? If yes, should 003 be dropped or recorded as a known decision, not PRUNE? Should coverage row 4's limitation name the missed test and planning references?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read src/skeleton.test.ts:148 (`expectTypeOf(reportFileName).toEqualTypeOf<(m: ReportModel) => string>()` pins the planned contract), docs/phase-5/plans/p5-7_plan.md:376 (earlier finding export-controller-005 'redundant reportFileName' dispositioned as 'equality assertion kept'), and reportFileName.ts:5 (`ReportIdentity` is a `Pick` of `ReportModel` including `format` and `stem`, so removing the fields is not a pure deletion) plus renderPdf.test.ts:160 (`model.stem` asserted). A type-pinned planned interface that a previous review deliberately kept is an internal contract the project chose to preserve; PRUNE's 'demonstrably unnecessary' is not met against that record.
  - **Plan Delta:** inspector-ui-and-report-003: REMOVED from confirmed findings (PRUNE → not admitted). Retained as a known decision: `reportFileName(model)` is kept as the parity oracle for `reportFileNameBeforeBuild` (p5-7_plan.md:376; skeleton.test.ts:148). Coverage pass 4 limitation "None" → "skeleton.test.ts:148, p5-7_plan.md:376, plan-starter.md:302-303/463 and renderPdf.test.ts:160 were not consulted by the reviewer". ID reserved, not reused.

- **ID:** SK-inspector-ui-and-report-005
- **Challenge:** Holding U-1 out of findings is correct under the admission rules: without the jsPDF source, the impact on the Info dictionary cannot be verified or reproduced. Its reachability analysis is incomplete, though, and it mischaracterises one test.
- **Failure mode:** The deferred check covers only the file-scope path. A follow-up that confirms or clears it on file names could miss the site-scope path, which is the more likely trigger. A reader might also take the Japanese test as partial coverage of U-1.
- **Evidence:**
  - Site-scope reach: the title for a site export is `Site readiness report: ${name}`, where `name` is `result.facts.site.name` unredacted when Redact is off (`reportFileName.ts:17–19, 27–28`). It reaches `doc.setProperties({ title: model.title })` at `renderPdf.ts:450` unguarded. Every drawn string goes through `pdfText` → `ctx.guard.clean` (`renderPdf.ts:59–60`). Site names are free text, while file names are maker-typed. The raw result names only "a file-scope report … the stored file name".
  - AC-9.6 requires the title metadata (`spec.md:367`: "including … the PDF's title metadata"), so whatever the fix, the title stays.
  - Japanese test: `renderPdf.test.ts:321–337` passes the title `Server logic readiness: 日本語-handler😀.js` through `setProperties`, but checks only the first five output bytes (`%PDF-`). None of its UTF-16 code units has a low byte of 0x28, 0x29 or 0x5C (U+65E5, U+672C, U+8A9E, U+D83D, U+DE00). So the test neither shows the metadata is well formed nor reaches the hypothesised trigger. The raw result says only that it "covers drawn text only".
  - I cannot verify jsPDF's metadata escaping or its byte conversion without the library source.
- **Questions:** Should U-1's trigger add the unredacted site-scope title, and should its check include a site report with a site name such as `Щ(site)`? Should the record state that the Japanese test exercises `setProperties` with non-Latin-1 text but asserts only the PDF header? U-1 should stay deferred. Does coverage row 7 record it as an open item and not as part of a clean pass (see SK-007)?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read reportFileName.ts:12-29 (site-scope title carries `result.facts.site.name` unredacted when Redact is off), renderPdf.ts:450 (`doc.setProperties({ title: model.title })` without the guard) and the skeptic's analysis of renderPdf.test.ts:321-337 (asserts only the `%PDF-` header; no code unit with low byte 0x28/0x29/0x5C). AC-9.4/AC-9.6 keep the title metadata, so a fix would guard or fold the string, not remove it. U-1 remains unverified without the jsPDF source.
  - **Plan Delta:** Unverified U-1, before → after: trigger adds "site-scope export with Redact off puts the free-text site name into the PDF title metadata"; check adds a site report with a site name such as `Щ(site)ĩ`; evidence note added: "renderPdf.test.ts:321-337 passes non-Latin-1 text to setProperties but asserts only the PDF header; it does not cover the suspected escaping path". Still deferred; named in coverage pass 7 (see SK-007).

- **ID:** SK-inspector-ui-and-report-006
- **Challenge:** U-5 is listed as unverified, with the check "Read `HostCallError` messages in `hostErrors.ts` and decide…". That check can be finished from source on disk now, so it is not a real unverified item. The source shows the toast text is a deliberate, recorded design choice rather than an open candidate. Routing it to the lead as unresolved misstates its status.
- **Failure mode:** One of two outcomes. A designed behaviour, accepted after an earlier supervised review, is reported as a defect. Or, if the lead does find it violates a rule, it stays parked as "unverified" and never reaches the owning domain as a finding.
- **Evidence:**
  - `pptbHost.ts:55–62`: `hostCall` turns every host throw or rejection into `HostCallError('Host call failed: ${label}.')` and logs only the name and status. `pptbHost.ts:64–66, 181` adds `'Host call failed: saveFile returned an unexpected result.'`. No body, URL or token goes into the message; it is a fixed string per call.
  - `inspectorSession.ts:163–171` passes `error.message` through for a `HostCallError` and otherwise uses `SAVE_FAILED_BODY` / `BUILD_FAILED_BODY` (`exportCopy.ts:8,10`).
  - `docs/phase-5/plans/p5-7_plan.md:182`, in the accepted plan, sets this "Message policy": "`HostCallError` passes its message through (`Host call failed: saveFile.`)". The policy came out of an earlier finding (`p5-7_supervised-review.md:323, 433`, export-controller-008).
  - The rule's "Map 401, 403, 404, 429 and 5xx to plain-language messages" sits in the `queryData` sentence of `pptb-host-and-output.md`. The notification rule forbids stack traces, not short technical labels. AC-9.9 asks only for "Couldn't save <filename>" "with the reason" (`spec.md:371`).
  - The cited code is `inspectorSession.ts`, outside this domain's files.
- **Questions:** Should U-5 be closed as "resolved from source: intended per accepted p5-7 message policy; no finding in this domain"? Or, if the lead judges "Host call failed: saveFile." to break the plain-language rule, should it go to the owning domain as a finding with that rule cited, not stay in Unverified?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead re-read pptbHost.ts:55-66 (every host throw becomes the fixed string `Host call failed: <label>.`; no body, URL or token), inspectorSession.ts:158-171 (HostCallError message passed through; other throws map to the plain copy strings) and docs/phase-5/plans/p5-7_plan.md:182 (accepted message policy: "HostCallError passes its message through (`Host call failed: saveFile.`)", arising from the earlier export-controller-008 finding). The plain-language mapping rule in pptb-host-and-output.md is scoped to Dataverse read status codes; AC-9.8/9.9 ask for "Couldn't save <filename>" with a reason, which is met. The toast text is an accepted design choice, so there is no finding in any domain.
  - **Plan Delta:** Unverified U-5 → resolved, no finding (intended per the accepted p5-7 message policy, p5-7_plan.md:182; message is a fixed label with no sensitive content). The cross-domain route to the lead is closed; recorded as a non-finding observation that the owner could later choose a friendlier label.

- **ID:** SK-inspector-ui-and-report-007
- **Challenge:** Coverage rows for pass 3 (COMPLETENESS) and pass 7 (SECURITY) are marked "checked", and the file record says "all 36 read … Blocked/unreviewed: none". The evidence behind those statuses is thinner than the labels.
- **Failure mode:** The final report shows passes 3 and 7 as complete for this domain. In fact the PDF behaviour depends on tests nobody ran, a security check was blocked, and about 2,450 lines of tests were read only partly. Under the Coverage claims standard, "A blocked pass is never clean."
- **Evidence:**
  - Pass 3: the row lists PDF pagination, "Page n of m", ring fit, Review first and Not scanned as compared with AC-9.3. Its own limitation says "PDF rendering itself (pagination, ring fit) is proven only by tests that cannot run here". Those claims rest on test bodies (`renderPdf.test.ts:60–93, 137–145, 191–223`), not on output anyone observed.
  - Pass 7: `npm audit` is blocked (U-4) and the metadata path is unresolved (U-1). The row is still "checked".
  - File record: six test files were read "by test name plus … bodies (not every line)": `buildReportModel.test.ts` 427 lines, `pdfTable.test.ts` 213, `pdfDrawing.test.ts` 167, `InspectorPage.test.tsx` 848, `ResultsView.test.tsx` 420, `export/ExportDialog.test.tsx` 375 (`wc -l`). Yet "Reviewed files (all 36 read)" and "Blocked/unreviewed: none" are stated without qualification. SK-002 shows a test in one of those files that bears on finding 001 and was missed.
  - Pass 4 states "Limitation: None" despite the misses in SK-004.
- **Questions:** Should passes 3 and 7 be recorded as partial, or as "checked (source only); PDF behaviour and dependency advisories unverified", with U-1 and U-4 named? Should the file record list the six test files as partly read, with their line counts? Should pass 4's limitation cell be corrected?
- **Lead Response:**
  - **Decision:** ACCEPT
  - **Rationale:** Lead compared the coverage table with the reviewer's own limitation text and file record. Pass 3's PDF layout claims (pagination, 'Page n of m', ring fit, Review first, Not scanned) rest on tests that could not run, which is a material check for that pass, so under 'a blocked pass is never clean' it reads blocked (partial) with the source comparison retained as partial evidence. Pass 7 had `npm audit` blocked at review time and an open item (U-1); the lead has since run `npm audit --omit=dev --json` from the lockfile (exit 0, 0 vulnerabilities, 39 production dependencies; dev dependencies not audited), which clears the audit part, but U-1 remains open, so pass 7 reads checked with U-1 named as an open item rather than clean. Six large test files (about 2,450 lines) were read partly; the file record must say so. Pass 4's limitation is corrected under SK-004.
  - **Plan Delta:** Coverage table before → after: Pass 3 COMPLETENESS "checked" → "blocked (partial): spec comparison done from source; PDF pagination, page numbering, ring fit and ordering rest on renderPdf.test.ts/pdfTable.test.ts bodies that could not run". Pass 7 SECURITY stays "checked" with limitation "npm audit --omit=dev run by the lead from the lockfile: 0 vulnerabilities (dev deps not audited); U-1 (PDF title metadata) open". File record "all 36 read … Blocked/unreviewed: none" → "all 36 opened; six test files read partly (buildReportModel.test.ts 427 lines, pdfTable.test.ts 213, pdfDrawing.test.ts 167, InspectorPage.test.tsx 848, ResultsView.test.tsx 420, ExportDialog.test.tsx 375)". Pass 4 limitation corrected (SK-004). Unverified U-4 → resolved by the lead's audit run (no advisories for jspdf 4.2.1 / jspdf-autotable 5.0.8 in the production tree).


## F. Patch Notes (per domain, v1 → final)


### F.1 host-and-shell

| Affected record | Exact change | Verification | Primary challenge | Related |
|---|---|---|---|---|
| host-and-shell-001 | Severity WARNING → INFO; cause fixed as the mislabelled/duplicate test at pptbHost.test.ts:726-731; fix is to retitle or delete the test (optional pure predicate for the name check); `operationType` and execute-factory suggestions dropped | Lead read dataverseFiles.ts:8-13/75-101, pptbHost.ts:128-148, pptbHost.test.ts:625-634/714-731, spec.md:630/745/1093 | SK-host-and-shell-001 | SK-host-and-shell-002 |
| host-and-shell-002 | Hedge removed → plain PRUNE; evidence adds spec.md:388 as a constraint, AC-3.3/3.10/6.5, commit 3a446bb; fix names host.types.ts:46, fakeHost members, pptbHost.test.ts ALLOWED list and :709-711 | Lead ran `git log -S'<ExternalLink' -- src`, read 3a446bb message, pptbHost.test.ts:645-660/705-712 | SK-host-and-shell-003 | — |
| host-and-shell-004 | Removed from confirmed findings (rule-letter, no consequence; owner-recorded lint exit 0 on unchanged source); kept as observation | Lead read execution.md:100-112; `git diff --stat 309eb14 HEAD -- src …` empty | SK-host-and-shell-004 | SK-host-and-shell-005 |
| host-and-shell-005 (NEW, PRUNE) | Three unreferenced font binaries (DMSans_500Medium, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium) admitted for deletion; supersedes U3 | Lead ran `rg` over src/tests/scripts/config/public (exit 1); read fonts.css, pdfFonts.ts:2-5, libraryProbe.ts:12, spec.md:1241 | SK-host-and-shell-007 | — |
| Unverified U2 | Reframed against AC-1.6 with probe_findings.md:17; provisional WARNING if a launch delay is observed; still unverified | Lead read main.tsx:18-40, spec.md:141 | SK-host-and-shell-006 | — |
| Unverified U4 | Resolved: owner-recorded lint exit 0 at 309eb14, source unchanged (not reproduced) | execution.md:104-110; git log on ConnectionProvider.tsx | SK-host-and-shell-005 | — |
| Coverage record | Owner-recorded gate results (typecheck/lint/2000 tests at 309eb14) added as owner-recorded; lead-executed `npm audit --omit=dev` (0 vulnerabilities, 39 prod deps) added; limitation cells for passes 1, 2, 3, 7 note test bodies read by title; pass 4 notes loop output not recorded and lead spot-checks | Lead commands recorded in the final report | SK-host-and-shell-008 | SK-host-and-shell-005 |

Final confirmed list for this domain after the round: host-and-shell-001 (INFO), host-and-shell-002 (PRUNE), host-and-shell-003 (PRUNE, unchallenged), host-and-shell-005 (PRUNE, new). Round completed; no unresolved challenges; no DEFER.


### F.2 starter-and-objects

| Affected record | Exact change | Verification | Primary challenge | Related |
|---|---|---|---|---|
| starter-and-objects-001 | Removed from confirmed findings: planned behaviour (phase-21:134, CodeEditor.tsx:32-34); kept as owner/spec observation | Lead read phase-21 plan :7/:134, phase-18a :32, CodeEditor.tsx:30-36, starterReducer.ts:84-90; spec grep for undo | SK-starter-and-objects-001 | — |
| starter-and-objects-002 | Pass 7 → 3; NFR citation corrected to spec.md:869; trigger shape and realistic-vs-trigger timings recorded; severity WARNING unchanged | Skeptic re-ran redos.cjs and sk-realistic.ts on replicas; lead read spec.md:869 | SK-starter-and-objects-002 | SK-007 |
| starter-and-objects-003 | File:Line → structure.ts:113 (`chainOf`); trigger restated (member chains ≥ ~8,000 segments, no upper bound; binary band depends on acorn guard); U5 cost merged in (9.2 s per call at 3,000 segments, lead-reproduced); fix corrected (no boundary inside the provider; iterative walk or entry-point catch); verification names provider render test and timing assertion | Lead re-ran t3.ts mem 3000/9000 on replicas (acorn 8.18); read StarterSessionProvider.tsx:19, PageErrorBoundary.tsx, App.tsx:80-89 | SK-starter-and-objects-003 | SK-004, SK-007 |
| starter-and-objects-004 | Removed from confirmed findings (no concrete consequence); kept as three separate observations | Lead read RecipeCombobox.tsx:53-67, StarterInputs.tsx:223-226 | SK-starter-and-objects-005 | — |
| starter-and-objects-005 | Problem restated as tie-order divergence between trial-parse and commit paths; fix made consistent with applyTextChanges.test.ts:19-26 (array-order tie contract, one shared function); INFO unchanged | Lead read applyTextChanges.test.ts:17-27, structureInsert.ts:76-82, structure.ts:305-311 | SK-starter-and-objects-006 | — |
| starter-and-objects-006 | Evidence label upgraded from recalled to documented (CodeMirror lineSeparator docs; phase-02:10 intent) | Skeptic Context7 read; lead read phase-02-browser-checks.md:10 | SK-starter-and-objects-009 | — |
| Unverified U3 | Resolved, no finding (no duplicate checklist lines in current catalogue) | Lead read recipes.ts:131-148; skeptic trace of checklistLines | SK-starter-and-objects-008 | — |
| Unverified U4 | Narrowed to the binary-chain safe band of -003 | Lead read skeptic's acorn 8.18 cites | SK-starter-and-objects-008 | SK-003 |
| Unverified U5 | Merged into starter-and-objects-003 | Lead re-run at 3,000 segments | SK-starter-and-objects-007 | SK-003 |
| Coverage: pass 3; passes 1, 2, 5 | Pass 3 → blocked (partial): visual ACs unverified, CSS unread; passes 1, 2, 5 limitation cells name the unopened/title-only tests | Lead compared the record with the rows | SK-starter-and-objects-009 | SK-006 |

Final confirmed list for this domain after the round: starter-and-objects-002 (WARNING, pass 3), starter-and-objects-003 (WARNING, pass 2, merged with U5), starter-and-objects-005 (INFO), starter-and-objects-006 (INFO). Round completed; no unresolved challenges; no DEFER.


### F.3 generators-and-catalogue

| Affected record | Exact change | Verification | Primary challenge | Related |
|---|---|---|---|---|
| generators-and-catalogue-001 | Removed from confirmed findings; retained as a spec-level observation (Learn-faithful blank-Age behaviour; correction-18 change would be an owner decision). ID reserved. | Lead read spec.md:119 and :183 and demoPages.ts:531-541 | SK-generators-and-catalogue-001 | — |
| generators-and-catalogue-002 | Removed from confirmed findings; retained as a non-finding observation (paragraph placement, no concrete consequence). ID reserved. | Lead read readme.ts:181-193, spec.md:236, :425 | SK-generators-and-catalogue-002 | — |
| generators-and-catalogue-003 | Evidence line list corrected to recipes.ts 49, 72, 101, 151, 287, 331, 360, 400 (198, 248 are literal roles); fix now names readme.test.ts:152 and the R1/R4/R8 README goldens; severity stays INFO with recorded rationale | Lead ran `rg -n webRole src/services/catalogue/recipes.ts`; read readme.test.ts:148-156 and R4.README.md.txt:9-12 | SK-generators-and-catalogue-003 | — |
| Coverage: pass 7 detail, pass 3 row | Six "executed" labels narrowed to what the scripts ran; the rest relabelled source-verified | Skeptic re-ran gc/probe.js; lead compared the reviewer's command table | SK-generators-and-catalogue-004 | SK-generators-and-catalogue-005 |
| Coverage: pass 3 COMPLETENESS | checked → blocked (partial): client/package generation not executed, 13 goldens not opened, cross-referenced to U3. Pass 7 gains the limitation "client.ts / README / checklist output source-verified only" | Reviewer command 10 exit 1 (acorn), coverage record's skimmed list | SK-generators-and-catalogue-005 | SK-generators-and-catalogue-004 |
| Unverified U1 | Provisional grade WARNING → CRITICAL if confirmed; evidence adds spec.md:432; two probes; fix side effects (R4 golden, R4_DIFFERENCES, R4 README golden) | Lead read spec.md:432 and :181 | SK-generators-and-catalogue-006 | — |
| Unverified U2 | Check needed adds the Key Vault-backed environment-variable probes; note that the placement follows Learn (AC-3.7 difference if changed) | Lead compared R3/R6 vs R7/R9 goldens via skeptic's cites; spec.md:435 | SK-generators-and-catalogue-007 | — |

Final confirmed list for this domain after the round: generators-and-catalogue-003 (INFO). Round completed; no unresolved challenges; no DEFER.


### F.4 inspector-session-and-scan

| Affected record | Exact change | Verification | Primary challenge | Related |
|---|---|---|---|---|
| inspector-session-and-scan-001 | Problem restated: O5 row emitted where spec O2 applies for an unparseable AllowedDomains row; "false statement" withdrawn; runtime behaviour marked unknown. Evidence adds spec.md:662, :683, :790, :793 and parseRecords.test.ts:247-253. Severity stays WARNING (misleading reason text, spec-verified). | Lead read spec.md:662/683/790/793, parseRecords.ts:218-236, settings.ts:52-62/80-90 | SK-inspector-session-and-scan-001 | SK-002, SK-003 |
| inspector-session-and-scan-001 (fix) | Remedy replaced: new `unparseable` binding kind → reviewable O2 "Couldn't interpret `ServerLogic/AllowedDomains`" (`readFailure: false`); other settings keep today's text; env-var kind not reused; both pinning tests named | Lead read spec.md:28, settings.ts:37-42/169-176, spec.md:664 | SK-inspector-session-and-scan-002 | SK-001 |
| inspector-session-and-scan-001 (scope, File:Line) | O5 text location corrected checks.ts:233 → :234; defective inputs enumerated (non-string content, non-object JSON, non-string value); missing-`value` and null-column cases deferred to a live-site check | Lead read parseRecords.ts:53-56, checks.ts:228-237, spec.md:683 | SK-inspector-session-and-scan-003 | — |
| Unverified U-1, U-5 | Moved to resolved / no finding with spec.md:1211 and ResultsView.tsx:44 cited; U-2 stays unverified | Lead read spec.md:1211, ResultsView.tsx:42-54 | SK-inspector-session-and-scan-004 | — |
| Coverage record; pass 1 and pass 3 rows | Test-reading depth corrected (6 files by name only; "none unreviewed" reworded); limitations added to the rows; statuses unchanged | Lead compared the record's own lists; checked settings.test.ts:66-71 and parseRecords.test.ts:247-253 for contradictions (none) | SK-inspector-session-and-scan-005 | — |

Final confirmed list for this domain after the round: inspector-session-and-scan-001 (WARNING, corrected). Round completed; no unresolved challenges; no DEFER. One new coverage limit recorded: how Power Pages stores an empty `ServerLogic/AllowedDomains` row (null `content` or `source` 0 without `value`) needs a live-site check before the fix's input classification is final.


### F.5 inspector-ui-and-report

| Affected record | Exact change | Verification | Primary challenge | Related |
|---|---|---|---|---|
| inspector-ui-and-report-001 | Status wording → "open code deviation without owner decision (spec.md:1071-1073, :1100)"; impact re-anchored on AC-9.2 structure; fix offers spec-change or code-fix branches | Lead read spec.md:1071-1073, :1100, :371 | SK-inspector-ui-and-report-001 | SK-002 |
| inspector-ui-and-report-001 (fix) | Filter on raw text before redaction (screen predicate); buildReportModel.test.ts:236-276 named and fixture given a non-reason detail line to keep the redaction assertion | Lead read buildReportModel.test.ts:232-278, FindingDetail.tsx:56-58 | SK-inspector-ui-and-report-002 | SK-001 |
| inspector-ui-and-report-002 | Removed from confirmed findings (types and lint keep keys in step; only a spec-level value change slips; pattern unflagged elsewhere); kept as observation | Lead read ReadinessTile.tsx:9-14, renderPdf.ts:176-186/283-291, FilesRail.tsx:11, eslint.config.ts:52 | SK-inspector-ui-and-report-003 | — |
| inspector-ui-and-report-003 | Removed from confirmed findings (type-pinned planned contract, prior "kept" disposition; `ReportIdentity` is a Pick); kept as known decision; pass 4 limitation corrected | Lead read skeleton.test.ts:148, p5-7_plan.md:376, reportFileName.ts:5, renderPdf.test.ts:160 | SK-inspector-ui-and-report-004 | — |
| Unverified U-1 | Trigger adds unredacted site-scope title; check adds a site name with the suspect code units; Japanese test characterised correctly; still deferred | Lead read reportFileName.ts:12-29, renderPdf.ts:450 | SK-inspector-ui-and-report-005 | SK-007 |
| Unverified U-5 | Resolved, no finding: accepted p5-7 message policy; fixed label with no sensitive content | Lead read pptbHost.ts:55-66, inspectorSession.ts:158-171, p5-7_plan.md:182 | SK-inspector-ui-and-report-006 | — |
| Unverified U-4 | Resolved by lead-executed `npm audit --omit=dev --json` from the lockfile: 0 vulnerabilities, 39 production dependencies (dev deps not audited) | Lead command, exit 0 | SK-inspector-ui-and-report-007 | — |
| Coverage: pass 3, pass 7, file record, pass 4 | Pass 3 → blocked (partial) for PDF layout; pass 7 stays checked with audit result and U-1 named; six partly read test files listed with line counts; pass 4 limitation corrected | Lead compared the record with the rows | SK-inspector-ui-and-report-007 | SK-004 |

Final confirmed list for this domain after the round: inspector-ui-and-report-001 (INFO, corrected). Round completed; no unresolved challenges; no DEFER.


## G. Final Issue List

Eleven confirmed issues remain after the skeptic rounds (0 CRITICAL, 3 WARNING, 3 PRUNE, 5 INFO). Seven Plan v1 rows were withdrawn with reasons (listed after the table), one new PRUNE was admitted from a skeptic challenge, and one unverified candidate was merged into an existing finding. All findings are source-verified at HEAD `8dff4f1a`; none is reproduced in the project's own test runner. Where a reviewer or the lead executed a scratch replica, that is stated.

### WARNING

**starter-and-objects-003** (alias: starter-and-objects U5) — domain starter-and-objects — pass 2 ERROR HANDLING — `src/lib/code-analysis/structure.ts:113` (`chainOf`; second recursion `walk` at `src/lib/code-analysis/structureAst.ts:47`). Changed by SK-starter-and-objects-003, -004, -007.
- Trigger and impact: server text containing a long static member chain. `chainOf` recurses once per segment and copies the prefix array each time (`[...head, key]`), and `walk` recurses once per AST level, neither with a depth guard. (i) At about 8,000+ segments (about 16 KB of `a.b.b…`) `chainOf` overflows the stack; the `RangeError` is not a `SyntaxError`, so `parseScript` does not convert it, `usedServerMembers` throws during `deriveStarter`, which runs in the render of `StarterSessionProvider` (`StarterSessionProvider.tsx:19`) outside every `PageErrorBoundary` (`App.tsx:80-89`); `main.tsx:26-32` only logs, so the root unmounts to a blank tool and unsaved Starter edits are lost until the host reopens it. Some binary chains (about 4,000 `1+1+…` terms) hit the same path in a narrow band that depends on acorn's `catchStackOverflow`. (ii) Below the overflow the cost grows about n³ and runs on every keystroke and caret move (twice for Liquid-capable recipes through `isLiquidAllowed` → `readsHttpOnlyContext`): 87 ms at 500 segments, 9.2 s at 3,000, 19–28 s at 4,000–4,500, against the 300 ms NFR at spec.md:869.
- Evidence: source-verified call path above; replica runs on copies of `structure.ts`/`structureAst.ts` under Node 22.23.4 with acorn 8.18 (not the pinned 8.19): reviewer (binary chain, n=4000 → RangeError), skeptic (member chains 8,000–50,000 → RangeError; 4,000 → 19.3 s), lead re-run (3,000 → ok in 9,174 ms; 9,000 → RangeError). Inspector entry points (`detectConnectorUse`, `exportedFunctionNames`) never call `walk`/`chainOf`, so the defect is Starter-only. `runBrowserChecks` is unaffected (catch-all handlers).
- Fix and verification: make `chainOf` and `walk` iterative (explicit stack, no prefix copying), or catch non-`SyntaxError` failures at the analysis entry points (`usedServerMembers`, `readsHttpOnlyContext`, `planInsertion`) and map them to the unparsed/fallback result. An error boundary can only sit above the provider and only limits blast radius; it does not preserve the session. Verify with a unit test on a 10,000-segment member chain (no throw, under 300 ms) and a `StarterSessionProvider` render test with the same text; confirm `catchStackOverflow` exists in acorn 8.19.0 once dependencies are installed (former U4).

**inspector-session-and-scan-001** — domain inspector-session-and-scan — pass 2 ERROR HANDLING — `src/features/inspector/scan/parseRecords.ts:219` (O5 text at `src/features/inspector/model/checks.ts:234`). Changed by SK-inspector-session-and-scan-001, -002, -003.
- Trigger and impact: a `ServerLogic/AllowedDomains` type-9 row whose `content` is not a JSON object or whose `value` is not a string (spec.md:683 documents `content.value` as a string). `bindingFromContent` degrades it to `{kind:'value', raw:''}`; for the other three settings an empty raw value already yields a reviewable "Couldn't interpret"/invalid text, but for AllowedDomains an empty string is a valid value meaning "no allow list" (spec.md:662). With `AllowNetworkingToAllDomains = false` and `HttpClient` in the code, the Outbound check therefore emits the O5 row "Outbound calls are blocked. The handler calls HttpClient, but no domains are allowed." where spec O2 (spec.md:790: "`AllowedDomains` is set but can't be parsed" → "Couldn't interpret `<setting>`") applies. The reason text asserts an empty list the tool could not read; status is Needs review either way and the finding stays reviewable, so impact is misleading reason text in the UI and in exported reports. What the Power Pages runtime does with unparseable content is unknown and is not claimed. No write path that stores invalid JSON was shown; the spec provides O2 for exactly this condition.
- Evidence: source-verified path `readSettings` (scan.ts:233-243) → `parseSettings` (parseRecords.ts:238-260) → `bindingOf` (227-231) → `bindingFromContent` (218-225) → `parseAllowedDomains` (settings.ts:274-309) → `outbound` (checks.ts:177-238). The degrade is deliberate (parseRecords.ts:233-236) and pinned for other settings by scan.test.ts:530 and parseRecords.test.ts:247-253.
- Fix and verification: return a distinct binding kind (e.g. `{kind:'unparseable'}`) from `bindingFromContent` when `content` is not an object or `value` is not a string; in `settings.ts` map it for AllowedDomains to the O2 reason "Couldn't interpret `ServerLogic/AllowedDomains`" with `readFailure: false` (reviewable, per the 2026-10-20 owner decision at spec.md:28), and for the other three settings to the text they emit today, so no banner changes; do not reuse the env-var kind. Update both pinning tests and add a scan test (AllowedDomains `content: '{not json'` + `AllowNetworkingToAllDomains=false` + HttpClient → "Couldn't interpret", Needs review, Mark as reviewed available). Open input classification: a `source` 0 object without `value`, and a null `content` column, need a live-site check of how an empty AllowedDomains row is stored before they are classified.

**starter-and-objects-002** — domain starter-and-objects — pass 3 COMPLETENESS — `src/lib/code-analysis/browserChecks.ts:20`. Changed by SK-starter-and-objects-002.
- Trigger and impact: server text in which the word `import` is followed by roughly 1,000+ contiguous whitespace characters, or 150+ consecutive indented blank lines, with no `;` before `from` (in code, a comment or a string). The pattern `import\s+[^;]{0,2000}?\s+from\b` backtracks over every split of the whitespace run (about n^2.7). `runBrowserChecks` runs in `deriveStarter` on every keystroke and caret move, so the main thread freezes: about 158 ms at 1,000 spaces, 1.1–1.3 s at 2,000, 7.6 s at 4,000; realistic shapes cost 0.4–26 ms. Breaks the NFR "Both panes update within 300 ms of any input change" (spec.md:869). Self-supplied input only; recoverable by waiting or Start over. The comment at :19 claims the 2,000-character bound keeps it linear, which it does not.
- Evidence: source-verified (`restrictedHits` :86-96 → `runBrowserChecks` :159-180 → `deriveStarter.ts:18` → `StarterSessionProvider.tsx:19`); timings from replica runs on a copy of `browserChecks.ts` by the reviewer and re-run by the skeptic. The guarding test `browserChecks.test.ts:244-247` repeats `// import note N` lines (words, not whitespace) and does not exercise this shape.
- Fix and verification: remove the ambiguity between `\s+` and `[^;]` (match `import` then bounded non-whitespace tokens separated by single whitespace runs, or scan with `indexOf('import')` plus a bounded manual walk to the next `;` checking for whole-word `from`). Verify with new `browserChecks.test.ts` cases (`import` + 5,000 spaces; 2,000 indented blank lines) under the existing 300 ms budget, keeping T16 and the multi-line import test (:68-72) green.

### PRUNE

**host-and-shell-002** — domain host-and-shell — pass 4 DEAD CODE — `src/app/ExternalLink.tsx:10`. Changed by SK-host-and-shell-003.
- Trigger and impact: `ExternalLink` has no production render site, so `PptbHost.openExternal`, `isHttpUrl` (`pptbHost.ts:184-189`) and the fake host's `openExternal`/`setOpenExternal` are reachable only from tests. Unused maintenance surface; not in the bundle.
- Evidence: `rg "<ExternalLink|ExternalLink" src -g '!*.test.*'` finds only the definition; `rg "<a[ >]|target=" src -g '!*.test.*'` finds only the anchor inside the component; Learn URLs are consumed only by generated text (`readme.ts:103-104`, `snippets.ts:52-53`). FR-1 (spec.md:388) constrains how links open; no AC requires one (AC-3.3, AC-3.10, AC-6.5). Commit `3a446bb` (2026-10-30) deliberately removed the last `<ExternalLink>` from `ObjectDetail.tsx` and its tests; `rg SERVER_OBJECTS_LEARN_URL` exits 1.
- Fix and verification: remove `ExternalLink.tsx`, `ExternalLink.test.tsx`, `openExternal` from the `PptbHost` type (`host.types.ts:46`), `pptbHost.ts:184-189` and `isHttpUrl`, the fake's members (`fakeHost.ts:51,66,114,175-176`), the related cases in `pptbHost.test.ts` and `fakeHost.test.ts`, and the `'toolboxAPI.utils.openInConnectionBrowser'` entry in `ALLOWED` (`pptbHost.test.ts:645-658`) so the equality at :709-711 holds. Verify with `rg -n 'openExternal|ExternalLink|openInConnectionBrowser' src tests` returning nothing and `npm run typecheck && npm test`.

**host-and-shell-003** — domain host-and-shell — pass 4 DEAD CODE — `src/app/useActiveConnection.ts:48`. Unchanged by the round.
- Trigger and impact: the `useActiveConnection()` hook (confirmed connection or null) has no production caller; the app reads connection state through `useConnectionState()` (`TitleBar`, `SitePill`, `InspectorPage`, `InspectorSessionProvider`). Its only caller is the `ShowLegacy` helper in `ConnectionProvider.test.tsx:36-39`, in a case titled "keeps the legacy hook null until a connection is confirmed".
- Evidence: `rg "useActiveConnection\(" src` → definition and the test only. The module's other exports (`ConnectionState`, `useConnectionState`, `useRefreshConnection`, `connectionKey`) stay in production use, so only lines 47-51 go; the `Connection` import stays used at :12 and :35.
- Fix and verification: delete lines 47-51 and the `ShowLegacy` helper plus its test case. Verify with `npm run typecheck && npx vitest run src/app/ConnectionProvider.test.tsx`.

**host-and-shell-005** (new; supersedes host-and-shell U3) — domain host-and-shell — pass 4 DEAD CODE — `src/assets/fonts/DMSans_500Medium.ttf:1` (also `SpaceGrotesk_400Regular.ttf`, `SpaceGrotesk_500Medium.ttf`). Admitted from SK-host-and-shell-007.
- Trigger and impact: three tracked font binaries (about 229 KB) with no importer, no CSS reference, no test enumeration and no spec role. Not bundled; repository weight and maintenance surface only.
- Evidence: lead ran `rg -n 'DMSans_500Medium|SpaceGrotesk_400Regular|SpaceGrotesk_500Medium' src tests scripts vite.config.ts package.json public` → exit 1 (no matches; the names appear only in a phase-00 plan document). `fonts.css` references only the three JetBrains Mono woff2 files; `pdfFonts.ts:2-5` imports DM Sans 400/700, Space Grotesk 700 and JetBrains Mono 400; `libraryProbe.ts:12` imports DM Sans 400; spec.md:1241 names exactly those four faces. The OFL licence texts stay because the remaining DM Sans and Space Grotesk faces still need them.
- Fix and verification: delete the three files. Verify with the same `rg` returning only docs/plans text and `npm run build && npm test`.

### INFO

**generators-and-catalogue-003** — domain generators-and-catalogue — pass 3 COMPLETENESS — `src/services/generators/package/readme.ts:72`. Changed by SK-generators-and-catalogue-003.
- Trigger and impact: README step 5 renders the recipe's `webRole` in backticks as if it were a literal role name: "Select + Add roles and add `A web role the caller holds`" (R1–R4, R7, R10 via `CALLER_ROLE`), "`A web role the visiting user holds`" (R8), "`An authorized web role that the caller holds`" (R9). Only R5 (`Administrators`) and R6 (`Authenticated Users`) are real names. A maker following the numbered steps literally is pointed at a role that does not exist; the permission checklist renders the same string as "Web role: …", which reads as a description. Low consequence: recovery is immediate (assign any role the caller holds). The goldens and the test show the text was accepted output, so this is an ambiguous instruction rather than false feedback (kept INFO).
- Evidence: source-verified. `recipes.ts` webRole lines 49, 72, 101, 151, 287, 331, 360, 400 (descriptive) and 198, 248 (literal); `readme.ts:72` template; golden `package/__golden__/R4.README.md.txt:11`. `readme.test.ts:152` pins the verbatim capitalised role string in the README.
- Fix and verification: in `setupBody`, branch on whether the role is a fixed name; for descriptive roles write the step without backticks (keeping the recipe's string if `readme.test.ts:152` is to stay unchanged, or update that assertion). Regenerate the R1, R4 and R8 README goldens.

**inspector-ui-and-report-001** — domain inspector-ui-and-report — pass 3 COMPLETENESS — `src/features/inspector/report/buildReportModel.ts:108`. Changed by SK-inspector-ui-and-report-001, -002.
- Trigger and impact: export any report with a Needs-review finding that has reasons. `makeFinding` (checks.ts:77-81) builds `detail` as reasons + not-scanned text + detail; `buildReportModel.ts:104` joins the reasons into `finding` and :108 keeps `detail` unfiltered, so each reason is printed two to three times (three for O3–O5, where `outbound` pushes the row into both `reasons` and `detail`) in the AC-9.2 H3 block (`renderMarkdown.ts:18,21`) and in the PDF finding block (`renderPdf.ts:361,364-366`). The screen de-duplicates (`FindingDetail.tsx:58`). AC-9.8 statuses and reasons are unaffected. This is an open code deviation with no owner decision (spec.md:1071-1073, :1100), still present at HEAD.
- Evidence: source-verified; the fixtures give `detail` without the reasons (`reportFixtures.ts:29`), so the goldens hide it; `buildReportModel.test.ts:236-276` encodes a `detail` equal to its reason as expected output and would fail the first proposed fix.
- Fix and verification: owner chooses (a) spec change accepting the repetition, or (b) code fix: filter on raw text before redaction, matching the screen's predicate (`finding.detail.filter((line) => !finding.reasons.some((r) => r.text === line)).map(redact)`); update `buildReportModel.test.ts:236-276` so the redaction fixture carries one non-reason detail line and keeps asserting that detail text is redacted; regenerate the Markdown golden if affected.

**starter-and-objects-006** — domain starter-and-objects — pass 3 COMPLETENESS — `src/lib/code-analysis/browserChecks.ts:62`. Evidence label upgraded by SK-starter-and-objects-009.
- Trigger and impact: text containing U+2028/U+2029 (valid inside JS strings; typical from pasted rich text). `lineStarts` counts them as line breaks (acorn's set), but CodeMirror splits only on `\n`, `\r\n`, `\r` (documented: `@codemirror/state` `lineSeparator` facet), and `normalizeLf` leaves U+2028/U+2029 in place. Hits after such a character get a line number one or more too high: the flagged-line bar lands on the wrong line, or is dropped when the number exceeds `doc.lines` (`lineDecorations.ts:21-24`), and the "Line N" list item does not match the gutter.
- Evidence: source-verified (`browserChecks.ts:62-72` → `ServerPane.tsx:42` → `lineDecorations.ts:21-24`); replica run by the reviewer (`eval(` after a U+2028 inside a string reported on line 3 of a 2-line document). The phase-02 plan (:10) records the intent that lines match the editor.
- Fix and verification: count lines the way the editor does (LF, CR, CRLF only) in `lineStarts`, keeping acorn only for offsets, or build `lineStarts` from the CodeMirror `Text`. Verify with a test placing U+2028 inside a string before a flagged token and expecting the editor's line number.

**starter-and-objects-005** — domain starter-and-objects — pass 5 BLOAT — `src/app/starter-session/applyTextChanges.ts:4`. Changed by SK-starter-and-objects-006.
- Trigger and impact: the trial-parse path (`planInsertion` → `structureInsert.applyChanges`, structure.ts:309-310; sorted descending with a stable sort, so same-offset changes apply in reversed array order) and the commit path (reducer → `applyTextChanges`, starterReducer.ts:105-106; array order, applied back to front, pinned by `applyTextChanges.test.ts:19-26`) implement the same rule twice with different ordering contracts (ties and unordered input). A `planInsertion` change that emits two changes at one offset would commit text that was not the text trial-parsed. Today no tie is emitted (`async ` at the function start, the sample inside the body), so there is no current trigger; the hazard is a concrete maintenance condition.
- Evidence: source-verified; skeptic replica (`sk-ties.cjs`): `abYXcd` (sorted) vs `abXYcd` (array order) on the same input; `aWbZcd` vs correct `aWbcZd` for unordered input.
- Fix and verification: keep one function with the array-order tie contract (sort by descending `from`, then by descending original index), export it from `structureInsert.ts` (or `lib/`), use it in both `planInsertion` and the reducer, delete `applyTextChanges.ts`, and point `applyTextChanges.test.ts` (including :19-26) at the shared function. Verify with that test file, `starterReducer.test.ts:180` and `structure.insertion.test.ts`.

**host-and-shell-001** — domain host-and-shell — pass 7 SECURITY (secondary 3) — `src/services/pptb/pptbHost.test.ts:726`. Changed by SK-host-and-shell-001, -002 (WARNING → INFO).
- Trigger and impact: the test titled "refuses to execute any operation other than the two download actions" (:726-731) runs only the normal download path and asserts that the names sent were the two allowed ones; it duplicates :625-634 and `dataverseFiles.test.ts:200-205`. The refusal branch of the spec-mandated runtime guard (`pptbHost.ts:142-144`; spec.md:630, :745) is never executed by any test, and cannot be reached through the public API because `FileAction['operationName']` is a two-member literal union and both callers hard-code the names. No single maintenance edit can send a forbidden operation under the current types, so this is a mislabelled test and an untested defence-in-depth line, not a maintenance hazard. The spec already records that `operationType` is enforced by the type only (spec.md:1093).
- Evidence: source-verified; `rg "Refused host operation|FILE_ACTIONS" src tests` matches only `pptbHost.ts:128,142,143`; `rg "vi\.mock|vi\.doMock" src` finds no module mocks. (A similar over-claiming title sits at :714-724, which exercises only the test file's own Proxy.)
- Fix and verification: retitle the test to what it asserts (e.g. "sends only the two download actions on the normal path") or delete the duplicate; optionally extract the name check into an exported pure predicate in `pptbHost.ts` and unit-test it with `'CreateRecord'`. Do not export an execute factory (spec.md:630). Verify with `npx vitest run src/services/pptb/pptbHost.test.ts` once dependencies are installed.

### Withdrawn after challenge (Plan v1 rows not in the final list)

| ID | Was | Reason | Challenge |
|---|---|---|---|
| starter-and-objects-001 | WARNING | Planned behaviour: phase-21 plan :134 and `CodeEditor.tsx:32-34` specify that undo after a recipe switch restores the old text as an edit; spec is silent. Kept as an owner/spec observation (the zip can then carry recipe B's README with recipe A's code). | SK-starter-and-objects-001 |
| host-and-shell-004 | INFO | Rule-letter `as` cast with no behavioural or gate consequence; owner-recorded lint exit 0 on unchanged source. Observation only (also the widening at `pptbHost.ts:106`). | SK-host-and-shell-004 |
| generators-and-catalogue-001 | INFO | Learn-faithful demo-page behaviour; AC-3.9 and correction 18 (spec.md:119, :183) define Learn's page as intended. A spec change would be needed first. | SK-generators-and-catalogue-001 |
| generators-and-catalogue-002 | INFO | Paragraph placement with no concrete consequence; spec requires only presence of the line. | SK-generators-and-catalogue-002 |
| inspector-ui-and-report-002 | INFO | Types (`satisfies Record<CheckStatus,…>`, exhaustive `switch`, lint rule) keep the duplicated lookups' keys in step; only a spec-level value change slips; same pattern unflagged elsewhere. | SK-inspector-ui-and-report-003 |
| inspector-ui-and-report-003 | PRUNE | `reportFileName` is a type-pinned planned contract (`skeleton.test.ts:148`) deliberately kept after an earlier review (p5-7_plan.md:376); `ReportIdentity` is a `Pick` of `ReportModel`. | SK-inspector-ui-and-report-004 |
| starter-and-objects-004 | INFO | Three unrelated rule deviations, none with a concrete consequence (extra render, not a stale frame; compiler makes `useCallback` redundant; cast is a jsdom accommodation). Kept as three observations. | SK-starter-and-objects-005 |

### Unresolved candidates (not findings; the check each needs)

| Domain / ID | Candidate | Provisional grade if confirmed | Check needed |
|---|---|---|---|
| generators U1 | R4 `post`/`put` forward the caller's whole body including `@odata.bind` lookups to `CreateRecord`/`UpdateRecord` (r4.ts:230, :249); spec.md:432 says binds must never come from the request | CRITICAL (unauthorized access widening) if Dataverse does not deny the bind without Append/Append To | Dev-site probes: create with `parentcustomerid_account@odata.bind` under the recipe's grants; update rebinding the caller's own contact. Fix would touch R4.js.txt golden, `R4_DIFFERENCES`, R4 README golden |
| generators U2 | `Server.SiteSetting.Get` in R7 (:335) and R9 (:55) sits outside `try`, unlike R3/R6; placement follows Learn | WARNING if `Get` can throw | Probe a Key Vault-backed environment-variable setting with access denied and with the secret missing, plus a missing name |
| generators U3 | `generateClient`, `buildReadme`, `buildPackageFiles` and 13 client/package goldens not executed or opened (acorn import failed without node_modules) | — | `npm test -- src/services/generators` after dependencies are installed |
| generators U4 | Slug not re-escaped inside `client.ts`, `readme.ts`, `buildPackageFiles.ts` (defence in depth; `slugify` is the only source) | — | Optional slug-shape assertion at generator entry |
| host U1 | No error boundary above `TitleBar`, `SitePill` and the two session providers (`App.tsx:70-101`) | — | Find a throwing render path or decide a shell-level fallback (react.md) |
| host U2 | `main.tsx:21-38` awaits `getTheme()` with no time bound; AC-1.6 wants light at launch when the host can't answer; a 10 s startup rejection was observed on another host call (probe_findings.md:17) | WARNING if a launch delay is observed | Time `getCurrentTheme()` at launch in PPTB Desktop; if it can exceed about one second, race it with a short timeout |
| starter U1 | Props-sync effect dispatches a reconfigure transaction on every keystroke/caret move (new array identities for highlight/flag lines) — cost and IME interplay | — | Browser profile with the compiled bundle and IME typing |
| starter U2 | Caret position after an outside recipe switch (`cursor` null) not checked visually | — | Run in a browser |
| starter U4 | acorn 8.19.0 `catchStackOverflow` presence (binary-chain band of starter-and-objects-003 only) | — | Inspect acorn 8.19.0 once installed |
| starter U6 | Combobox option taps with touch/pen (options use `onMouseDown` only) | — | Touch emulation test |
| starter U7 | `ServerPane` highlight lines come from the real generator while the fake deps supply the text (test-only coupling) | — | None unless tests rely on highlights with fake deps |
| session U-2 | `parseRole` ignores the web role row's `active` flag; FR-7/FR-9 define activity only for permissions and settings; spec records no `statecode` for roles (spec.md:679) | — | Learn confirmation that an inactive web role is ineffective |
| session U-3 | `odataString` percent-encodes and relies on the host not re-encoding (R-06) | — | PPTB Network-panel capture for a schema name containing `'`, `&` or a space |
| session U-4 | Site list not identity-confirmed after the read (the scan is) | — | Observe ConnectionProvider when `getActiveConnection` rejects persistently after a `connection:*` event |
| session U-6 | Typecheck, lint, vitest not run in this audit | — | Run the three scripts after dependencies are installed (owner-recorded green at 309eb14) |
| ui U-1 | `model.title` reaches `doc.setProperties` (`renderPdf.ts:450`) without the text guard; file-scope file name and unredacted site-scope site name; characters whose low byte is `(`, `)` or `\` could break the PDF Info dictionary if jsPDF escapes only those and truncates code units | WARNING (Markdown workaround) | With dependencies installed, render a file named `Щ(handler)ĩ` and a site named `Щ(site)ĩ`, inspect `/Title (...)` and validate the PDF |
| ui U-2 | Live PPTB `fileSystem.saveFile` with a `Uint8Array` PDF not evidenced (RG-004) | — | Manual export in PPTB Desktop |
| ui U-3 | File-name stem has no length cap (a 400-character name yields a >255-character default) | — | Check the server-logic name limit; cap the stem if needed |
| ui U-6 | `pdfTable.ts:128-130` continuation rows drop the label column's own lines beyond about 46 (needs a ~1,400-character unbroken file name) | — | pdfTable test with a 2,000-character name |

Resolved during refinement (no finding): generators none; host U3 (superseded by host-and-shell-005), host U4 (owner-recorded lint exit 0); starter U3 (no duplicate checklist lines in the catalogue), starter U5 (merged into -003); session U-1 (spec.md:1211 sanctions the behaviour), session U-5 (no reachable trigger); ui U-4 (lead-executed `npm audit --omit=dev`: 0 vulnerabilities), ui U-5 (accepted p5-7 message policy).

### Coverage gaps (what this audit did not establish)

- No project check (typecheck, lint, Vitest) was executed in this audit; the owner's recorded green run at `309eb14` on identical source is cited, not reproduced. Consequently PDF layout behaviour, client/package golden equality and React Compiler lint findings rest on source reading.
- Pass 3 is **blocked (partial)** in three domains: generators-and-catalogue (client/package generation not executed; 13 goldens unopened), starter-and-objects (visual ACs AC-4.1, AC-6.7, AC-6.8 unverified; `starter.css`, `serverObjects.css` unread), inspector-ui-and-report (PDF pagination, numbering, ring fit rest on tests not run).
- Test bodies were read by title only for a substantial share of the suite in every domain (lists in C); masked defects were not ruled out from tests. In two domains an unopened test contradicted a proposed fix and was caught by the skeptic; the fixes were corrected.
- Live-host behaviour (PPTB error shapes, nextLink on the wire, `getCurrentTheme` latency, binary `saveFile`) and Power Pages runtime behaviour (unparseable setting content, `@odata.bind` enforcement, `SiteSetting.Get` throwing) are outside what source review can establish.
- `npm audit` covered production dependencies only (39); dev dependencies were not audited.

The confirmed list is not a claim that `src/` is defect-free; it is the set of defects this audit could establish under the admission rules within the coverage above.


## Publication checks

- **File accounting:** 316 files under `src/`; 316 assigned to exactly one domain (verified with `find`/`comm`; 0 unowned, 0 duplicates); 13 excluded binaries/licence texts listed explicitly in B; no file was blocked. ✔
- **Pass coverage:** every domain reports all seven passes with status and evidence or a reason (C). After refinement the statuses are: all domains passes 1, 2, 4, 5, 6, 7 checked (with the limitation cells amended in E/F); pass 3 **blocked (partial)** in generators-and-catalogue, starter-and-objects and inspector-ui-and-report, checked in host-and-shell and inspector-session-and-scan. No blocked check is presented as clean. ✔
- **Admission and severity:** each of the 11 confirmed findings states trigger, reachability, impact and source-verified evidence at HEAD `8dff4f1a`, graded with the severity guide; replica measurements are labelled as such and none is presented as a project test result. ✔
- **Reconciliation:** 17 Plan v1 rows (D) → 11 final (G): 7 withdrawn with challenge IDs, 1 added (host-and-shell-005, from SK-host-and-shell-007), 1 unverified candidate merged as an alias (U5 → starter-and-objects-003). No ID was renumbered or reused; withdrawn IDs are reserved. No malformed or duplicate row is presented as confirmed. ✔
- **Skeptic visibility:** five rounds, 36 challenges, 36 decisions (36 ACCEPT including partial acceptances recorded as deltas, 0 REJECT, 0 DEFER); each delta names its triggering challenge and keeps the original ID (E, F). ✔
- **Sections A–G present** with content; status in A reflects coverage limits and the absence of unresolved verification, not prose volume. ✔
