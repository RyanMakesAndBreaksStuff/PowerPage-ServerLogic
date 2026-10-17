# Implementation Plan: Server Logic Tools (Logic Starter, Server Objects, Logic Inspector)

**Spec:** docs/specs/001-server-logic-starter-inspector/spec.md (v2.0.0, Approved)
**Decisions:** no ADRs; library and phasing decisions are in the spec's Resolved log
**Created:** 2026-10-16
**Phase plans:** one file per phase in `plans/phase-NN-<slug>.md` (owner decision 2026-10-14). Spike evidence goes in the plan of the phase that runs it: S1 and S4 in phase 00, S2 in phase 12, S3 in phase 19.

## Status and next step (2026-10-17): split into three page plans

**Status.** Phase files 00–05 are written. Phases 06–24 are not, and no code exists yet. The 25-phase layout below is being replaced by three plans, one per page, each ending at its own release gate.

**Outline.**
1. **`plan-starter.md`: Logic Starter, including Part A, the shared foundation.** Spec scope: Story 1, Stories 2–5, FR-1 to FR-5, FR-11, FR-12, Learn corrections 1–23, Spike S3, and the S1/S4 evidence.
   - **Part A, Foundation**, which the other two plans also depend on:
     - scaffold, build and manifest;
     - host adapter and fake;
     - tokens and UI kit;
     - shell;
     - code analysis;
     - the shared Starter session state (`src/app/starter-session/`).
   - **Part B, Generators:** recipe catalogue, handlers R1–R10 (R7 waits for S3), client calls, zip package and the behavior harness.
   - **Part C, UI:** input tiles, code panes, readiness ring and Download.
   - **Release gate:** Starter only.
2. **`plan-server-objects.md`: Server Objects.** Spec scope: Story 6, FR-6 and AC-1.7 (Insert is hidden while Starter is unreleased).
   - **Depends on:** Part A only.
   - **Steps:** the catalogue; the page; Insert into handler.
   - **Release gate:** before or after Starter.
3. **`plan-inspector.md`: Logic Inspector and reports.** Spec scope: Stories 7–9 and FR-7 to FR-10; Spike S2 runs here.
   - **Depends on:** Part A only.
   - **Steps:**
     - ◆ S2 gate;
     - scan reader;
     - rules engine;
     - Inspector page;
     - report model and Markdown;
     - PDF;
     - export dialog.
   - **Release gate:** includes the 30 s scan check.

Once Part A is done, all three plans can run in parallel. Shared names stay pinned in Part A, and the other plans only consume them. Each plan carries its own Global Constraints and coverage table.

**Where the existing phase files land.**
- Part A: 00 (scaffold), 01 (adapter), 02 and 03 (code analysis), 04 (UI kit).
- Part B: 05 (recipe catalogue).

**Steps to finish Part A.**
1. **Fix the 00/04 conflict.** Phase 04 must use phase 00's choices:
   - **Fonts:** JetBrains Mono woff2 through `src/assets/fonts/fonts.css`. Phase 04's own TTF `@font-face` goes.
   - **Icons:** `@fluentui/react-icons`, not `@fluentui/svg-icons`.
2. **Write the shell plan** (old phase 06): AC-1.1–1.7, FR-1 notify with in-tool fallback, theme follow, events registered once.
3. **Write the shared Starter session plan.** Move the state part of old phase 18 into Part A: the reducer, the derived values and the provider behind the pinned `StarterState`, `StarterAction` and `StarterDerived` types. Two rules carry over:
   - `readiness.browser` is `hits.length === 0 && !parseFailed`;
   - `planInsertion` changes are applied as one transaction, `async` first.
4. **Pin the new shared names** in the Contracts section:
   - from 01: `createPptbHost(options?)`, `HostCallError`;
   - from 04: `Button`, `useDisabledReason` and the props types from its Interfaces line;
   - from 05: `methodEnabled`, `checklistLines`, `UPSTREAM_CREDENTIALS_LINE`, `ACCOUNT_TEST_USER_LINE`, `EXAMPLE_GUID` and the snippet exports;
   - from 00: the `ReportModel` placeholder.
5. **Owner decisions** that Part A needs:
   - amend or keep the `$top` paging line in `.claude/rules/pptb-host-and-output.md` (phase 01 pages with `Prefer: odata.maxpagesize`);
   - opaque dark tiles versus literal glass (phase 04);
   - the npm package scope (phase 00);
   - React 19 with ESLint 9 and TypeScript 5.9 pinned (phase 00).
6. **Split this file** into the three plan files above, and move phase files 00–04 under Part A.
7. **Commit.**

**Open risk:** a file-column download through `queryData` is unverified until S2. If it fails, reading handler code needs `execute`, which the read-only rule forbids, so that would need a spec and rules change.

## Global Constraints
- Scaffold with `npx --package yo --package generator-pptb -- yo pptb` (React). Keep its Vite config. The output is a **single IIFE bundle**: no `type="module"`, no `crossorigin`, no split chunks, with `inlineDynamicImports`.
- PPTB Desktop is 1.2.7 or later. `features.connections {min:0,max:1}`, `features.minAPI "1.2.7"`, no `cspExceptions`, no CDN, every asset bundled.
- Host globals are touched only in `src/services/pptb/`. Dataverse is read-only: `queryData`, `fetchXmlQuery`, `retrieve` and the metadata getters. The tool writes nothing to tool settings.
- TS strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. No `any`, no `!`, and no `as` casts to silence errors.
- React 19 with the Compiler. No `forwardRef`, and no `useEffect` for derived state.
- The feature-first layout is enforced: features never import from another feature. Cross-feature state lives in `src/app/`.
- Generators are pure `(input) => string` functions with golden-file tests. They are deterministic. String literals are built with `JSON.stringify`.
- Every generated server file has **zero** FR-4 hits. The generator source must also keep forbidden words out of *emitted* text: no `with(`, `.startsWith(`, anonymous `function (`, or `delete <name>` in comments.
- Product code never evals generated code. Only the AC-4.12 test harness runs it, inside `node:vm` under Vitest.
- Every phase must pass `npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .` and `npx vitest run`.
- Five HTTP methods are always shown. Exports are Markdown and PDF only. Every report carries the configuration-only and tenant-not-verified statements.
- Commits follow `<type>(<scope>): <message>` on branch `001-server-logic-starter-inspector`. `npm publish` only with the owner's explicit confirmation.

## Goal
Ship the Server Logic Tools PPTB tool: Logic Starter, Server Objects and Logic Inspector, with each page released as it completes.

## Contracts (Phase 00 commits these verbatim; every later phase consumes them unchanged)

```ts
// src/types/http.ts
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const satisfies readonly HttpMethod[];
export type HandlerFunction = 'get' | 'post' | 'put' | 'patch' | 'del';
export const METHOD_FUNCTION = { GET: 'get', POST: 'post', PUT: 'put', PATCH: 'patch', DELETE: 'del' } as const satisfies Record<HttpMethod, HandlerFunction>;
export type ClientLanguage = 'fetch' | 'jquery' | 'liquid';
export type View = 'starter' | 'objects' | 'inspector';

// src/types/recipe.ts
export type RecipeId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10';
export type RecipeGroup = 'core' | 'tutorial' | 'reference';
export type AccessType = 'Global' | 'Contact' | 'Account' | 'Parent' | 'Self';
export type Privilege = 'Read' | 'Write' | 'Create' | 'Delete' | 'Append' | 'AppendTo';
export type TableGrant = { logicalName: string; entitySetName: string; privileges: readonly Privilege[]; accessType: AccessType; relationship: string | null; note: string | null };
export type ExampleRequest = { query: string | null; body: unknown; liquidInput: string | null };
export type RecipeMeta = {
  id: RecipeId; name: string; group: RecipeGroup;
  defaultMethod: HttpMethod | null;            // null only for R8
  functions: readonly string[];                // exported names, e.g. ['get','post','put','del'] or ['getSummary']
  mainObject: string; serverObjects: readonly string[];
  tables: readonly TableGrant[]; outboundDomains: readonly string[]; siteSettings: readonly string[];
  webRole: string; permissionNote: string; prerequisites: readonly string[];
  learnUrl: string | null; extraUrls: readonly string[];
  liquid: boolean; readsLiquidInput: boolean; upstreamCredentials: boolean; demoPage: boolean;
  examples: Readonly<Record<string, ExampleRequest>>;  // keyed by function name
};
export type GeneratedHandler = { text: string; highlightLines: readonly number[] }; // LF text, 1-based lines

// src/lib/code-analysis/codeAnalysis.types.ts
export type CheckSeverity = 'blocked' | 'may-be-rejected';
export type CheckHit = { pattern: string; line: number; severity: CheckSeverity };
export type BrowserCheckResult = { hits: readonly CheckHit[]; parseFailed: boolean };
export type ConnectorUse = { dataverse: boolean; httpClient: boolean; undetermined: boolean };
export type TextChange = { from: number; to: number; insert: string };
export type InsertResult =
  | { ok: true; changes: readonly TextChange[]; text: string }
  | { ok: false; reason: 'no-target' | 'not-statement' | 'breaks-code' };

// src/services/pptb/host.types.ts
export type ThemeName = 'light' | 'dark';
export type NoticeType = 'success' | 'info' | 'warning' | 'error';
export type Notice = { title: string; body: string; type: NoticeType };
export type EnvironmentLabel = 'Dev' | 'Test' | 'UAT' | 'Production' | 'Unknown';
export type Connection = { id: string; name: string; url: string; environment: EnvironmentLabel };
export type HostEvent = { kind: 'connection-changed' } | { kind: 'settings-updated' } | { kind: 'other'; name: string };
export type FileFilter = { name: string; extensions: readonly string[] };
export type SaveResult = { status: 'saved'; path: string } | { status: 'cancelled' };
export type ODataQuery = { entitySet: string; select: readonly string[]; filter: string | null; orderBy: string | null; pageSize: number };
export class HostReadError extends Error { constructor(message: string, readonly status: number | null) { super(message); this.name = 'HostReadError'; } }
export type PptbHost = {
  getTheme(): Promise<ThemeName>;
  notify(n: Notice): Promise<void>;                        // rejects when host notify is missing/throws/rejects
  copyText(text: string): Promise<void>;
  saveFile(defaultName: string, content: string | Uint8Array, filters: readonly FileFilter[]): Promise<SaveResult>;
  openExternal(url: string): Promise<void>;
  getActiveConnection(): Promise<Connection | null>;
  onEvent(handler: (e: HostEvent) => void): () => void;
  queryAll(q: ODataQuery): Promise<readonly unknown[]>;   // all pages; 429/5xx retried 1s/2s/4s; throws HostReadError
  downloadFileColumn(entitySet: string, id: string, column: string): Promise<string>;
};

// src/types/inspector.ts
export type Readable<T> = { ok: true; value: T } | { ok: false; reason: 'read-failed' | 'not-scanned' };
export type WebRoleFact = { id: string; name: string; anonymous: boolean; authenticated: boolean };
export type TablePermissionFact = { id: string; name: string; table: string; scope: AccessType; privileges: readonly Privilege[]; roleIds: readonly string[]; active: boolean; parentId: string | null };
export type SettingName = 'ServerLogic/Enabled' | 'ServerLogic/AllowedDomains' | 'ServerLogic/AllowNetworkingToAllDomains' | 'ServerLogic/TimeoutInSeconds';
export type SettingValue =
  | { kind: 'absent' } | { kind: 'duplicate' }
  | { kind: 'value'; raw: string; fromEnvVar: boolean }
  | { kind: 'envvar-unreadable' };                      // secret type, missing variable or failed read
export type ServerLogicFileFacts = { id: string; name: string; active: boolean; roleIds: Readable<readonly string[]>; code: Readable<string> };
export type SiteRef = { id: string; name: string; domain: string; active: boolean };
export type SiteFacts = {
  scanId: string; site: SiteRef; connection: Connection; startedAt: string; finishedAt: string | null;
  roles: Readable<readonly WebRoleFact[]>; permissions: Readable<readonly TablePermissionFact[]>;
  settings: Readable<Readonly<Record<SettingName, SettingValue>>>;
  files: readonly ServerLogicFileFacts[]; inventoryComplete: boolean; stopped: 'connection-lost' | null;
};
export type CheckId = 'webRole' | 'tablePermissions' | 'outbound';
export type CheckStatus = 'configured' | 'needs-review' | 'reviewed' | 'not-scanned';
export type Reason = { text: string; readFailure: boolean };
export type Finding = { check: CheckId; status: CheckStatus; summary: string; reasons: readonly Reason[]; guidance: string; questions: readonly string[]; detail: readonly string[] };
export type Snapshot = { roles: readonly string[]; tables: readonly string[]; outbound: readonly string[] };
export type FileResult = { fileId: string; name: string; active: boolean; findings: readonly [Finding, Finding, Finding]; snapshot: Snapshot };
export type ReviewKey = `${string}:${CheckId}`;           // `${fileId}:${check}`
export type Counts = { C: number; V: number; M: number; U: number; T: number; K: number };
export type SiteResult = { facts: SiteFacts; files: readonly FileResult[]; banners: readonly string[] };

// src/types/report.ts
export type ReportScope = 'file' | 'site';
export type ReportFormat = 'markdown' | 'pdf';
export type ReportOptions = { scope: ReportScope; format: ReportFormat; fileId: string | null; questions: boolean; snapshot: boolean; redact: boolean };
```

**Pinned function signatures** (owner phase in brackets):
- `slugify(name: string): { slug: string; differs: boolean }` and `normalizeLf(text: string): string`, in `src/lib/slug.ts` and `src/lib/text.ts` [05].
- `RECIPES: readonly RecipeMeta[]` and `getRecipe(id: RecipeId): RecipeMeta`, in `src/services/catalogue/recipes.ts` [05].
- `SERVER_OBJECTS: readonly ServerObject[]`, in `src/services/catalogue/serverObjects.ts` [13]. Its `ServerObject` and `ObjectMember` types are defined in that phase's file, and only the Server Objects page consumes them.
- `runBrowserChecks(code: string): BrowserCheckResult`, in `src/lib/code-analysis/browserChecks.ts` [02].
- These live in `src/lib/code-analysis/structure.ts` [03]:
  - `detectConnectorUse(code: string): ConnectorUse | null`;
  - `exportedFunctionNames(code: string): readonly string[] | null`;
  - `usedServerMembers(code: string): ReadonlyMap<string, readonly string[]>`;
  - `readsHttpOnlyContext(code: string): boolean`;
  - `planInsertion(code: string, sample: string, cursor: number | null, targetFn: string): InsertResult`.
- `generateHandler(id: RecipeId): GeneratedHandler` and `generateDemoPage(id: RecipeId, slug: string): string | null`. The registry is `src/services/generators/handlers/index.ts` [00, a stub registry]. The per-recipe files are `r1.ts` through `r10.ts` [07/08/09/19], and the demo pages are `demoPages.ts` [08].
- These live in `src/services/generators/client/client.ts` [10]:
  - `generateClient(i: { slug: string; recipe: RecipeId; fn: string; method: HttpMethod | null; language: ClientLanguage }): string`;
  - `requestPathSteps(language: ClientLanguage, slug: string, fn: string): readonly { label: string; value: string }[]`;
  - `isLiquidAllowed(recipe: RecipeMeta, serverText: string): boolean`.
- `buildPackageFiles(i: StarterPackageInput): readonly { path: string; content: string }[]` and `buildZip(files): Uint8Array`, in `src/services/generators/package/` [14].
- `createPptbHost(): PptbHost` [01] and `createFakeHost(init?: FakeHostInit): PptbHost & FakeHostControls` [01], both in `src/services/pptb/`.
- `evaluateSite(facts: SiteFacts, marks: ReadonlySet<ReviewKey>): SiteResult`, `countChecks(findings: readonly Finding[]): Counts`, `fileSummary(f: FileResult): string` and `filePill(f: FileResult): 'Ready' | 'Needs review' | 'Incomplete'`, in `src/features/inspector/model/rules.ts` [11].
- `runScan(host: PptbHost, connection: Connection, site: SiteRef, scanId: string, onProgress: (scanned: number, total: number) => void): Promise<SiteFacts>` and `listSites(host: PptbHost): Promise<readonly SiteRef[]>`, in `src/features/inspector/scan/scan.ts` [15].
- These live in `src/features/inspector/report/` [16, 20]:
  - `buildReportModel(r: SiteResult, o: ReportOptions, exportedAt: Date): ReportModel`;
  - `renderMarkdown(m: ReportModel): string`;
  - `renderPdf(m: ReportModel): Uint8Array`;
  - `reportFileName(m: ReportModel): string`.
- These live in `src/app/` [06, 18]:
  - `HostContext` and `useHost(): PptbHost`;
  - `useNotify(): (n: Notice) => void`, which tries the host and falls back to an in-tool toast;
  - `useView(): [View, (v: View) => void]`;
  - `RELEASED_PAGES: readonly View[]`, a build-time define;
  - `StarterSessionProvider`, `useStarterSession(): { state: StarterState; dispatch: (a: StarterAction) => void; derived: StarterDerived }`. The `StarterState`, `StarterAction` and `StarterDerived` types are pinned below.

```ts
// src/app/starter-session/starterSession.types.ts  (Phase 00 commits; Phase 18 implements the reducer)
export type StarterState = {
  name: string; method: HttpMethod | null; recipe: RecipeId; language: ClientLanguage;
  serverText: string; generatedText: string; cursor: number | null;
  reviewedText: string | null;       // AC-5.4: text at the moment of marking
  pendingNotice: Notice | null;      // e.g. Liquid auto-reset toast (AC-4.7)
};
export type StarterAction =
  | { type: 'setName'; name: string } | { type: 'setMethod'; method: HttpMethod }
  | { type: 'selectRecipe'; recipe: RecipeId } | { type: 'setLanguage'; language: ClientLanguage }
  | { type: 'editServer'; text: string; cursor: number | null } | { type: 'setCursor'; cursor: number | null }
  | { type: 'applyChanges'; changes: readonly TextChange[]; cursor: number | null }
  | { type: 'markReviewed' } | { type: 'undoReview' } | { type: 'startOver' } | { type: 'clearNotice' };
export type StarterDerived = {
  slug: string; slugDiffers: boolean; fn: string; edited: boolean; checks: BrowserCheckResult;
  liquidAllowed: boolean; usedMembers: ReadonlyMap<string, readonly string[]>;
  readiness: { browser: boolean; validation: true; permissions: boolean }; ready: 0 | 1 | 2 | 3;
};
export type StarterPackageInput = { state: StarterState; derived: StarterDerived; clientText: string };
```

**Skeleton stubs.** Phase 00 creates every cross-phase file listed above, with the contract signature and a body of `throw new Error('not implemented: phase NN')`. It also creates page placeholders, `features/{starter,server-objects,inspector}/*Page.tsx`. Each later phase replaces only the files it owns, so parallel agents never edit the same file.

## Execution model
- **One phase is one task, run by one agent.** Implementer agents are Sonnet 5.5 at high effort (Agent tool `model: "sonnet"`, `effort: "high"`). If a wave runs as an ultracode Workflow instead, it uses at most 6 concurrent agents, all Sonnet 5.5 at xhigh.
- Phases in one wave touch disjoint files. Each runs in its own worktree (`isolation: "worktree"`), and the orchestrator merges them at the end of the wave.
- At the end of each wave the orchestrator runs `npx tsc -b && npx eslint . --max-warnings=0 && npx vitest run`, and the next wave starts only when that is green.
- All npm dependencies are installed in Phase 00: acorn, the CodeMirror 6 packages, fflate, jspdf 4.2.1, jspdf-autotable 5.0.8, Fluent System Icons, and the fonts JetBrains Mono, DM Sans and Space Grotesk as static TTF. No later phase edits `package.json`.
- **Owner gates (◆)** are not agent tasks; they need the owner and a live PPTB or site. They block only their dependents.

## Phase DAG and waves

| Wave | Phase | Title | Depends on | Implements / Satisfies (summary) |
|---|---|---|---|---|
| W0 | 00 | Skeleton, tooling, contracts, library probe, S1/S4 evidence | — | FR-12 manifest, IIFE build-shape test, released-pages define (FR-1), Contracts, stubs. Records the S1 and S4 evidence from `spikes/` |
| W1 | 01 | PPTB host adapter + fake | 00 | FR-7 paging/retry, FR-12 events, NFR Security; `createPptbHost`, `createFakeHost` |
| W1 | 02 | Restricted-pattern and browser-API checks | 00 | FR-4 (T1–T22), AC-5.2 logic, F23 fallback |
| W1 | 03 | Code structure analysis | 00 | FR-6 used detection, FR-7 exported fns and connector fixtures, AC-4.7 HTTP-only rule, AC-6.8 insertion and its fixture |
| W1 | 04 | Design tokens and shared UI primitives | 00 | FR-11 tokens (11c/12e, aurora, glass), rings (4° gaps, proportional above 30), APG radio PillGroup, aria-disabled tooltips (F47), Modal (APG), fallback Toast stack, Fluent icons, JetBrains Mono; AC-1.5 |
| W1 | 05 | Starter domain: recipe catalogue, slug, LF, handler snippets | 00 | FR-2, FR-3 metadata tables, AC-2.2/2.3/2.6/2.11, AC-3.5/3.6 data, AC-4.10 LF, Account-access lines, upstream-credentials line |
| W2 | 06 | Shell | 01, 04 | Story 1 (AC-1.1–1.7), FR-1 (notify + fallback, openExternal, busy buttons), theme follow, events registered once |
| W2 | 07 | Handlers R1, R2, R3, R8 | 02, 05 | AC-3.2/3.5/3.8, FR-3 Musts, golden files |
| W2 | 08 | Handlers R4, R5, R6 + demo pages | 02, 05 | AC-3.3/3.4/3.7/3.9/3.10, corrections 17–18, ◆ R4 bound-create probe (owner, on the dev site; a pass becomes a spec update) |
| W2 | 09 | Handlers R9, R10 | 02, 05 | FR-3 R9/R10 rows, F07 prerequisites |
| W2 | 10 | Client generator + request path | 03, 05 | FR-2a, AC-2.7, AC-4.4–4.8, AC-4.11 |
| W2 | 11 | Inspector rules engine | 03 | FR-7 grant set, parent chain, settings normalisation, AllowedDomains; FR-8; FR-9 O0–O6; AC-7.7/7.9/7.12 banners; AC-8.1 (64-combination test), 8.5, 8.6, 8.8, 8.10–8.12 |
| ◆ | 12 | Spike S2 + adapter fix-ups | 06 | The owner loads the build in PPTB and checks the S2 list; the evidence is recorded and an agent applies any adapter changes. A contradiction becomes a spec update first |
| W3 | 13 | Server Objects catalogue | 02 | FR-6 (9 objects, signatures, samples, context marks); AC-3.2 zero hits for every sample |
| W3 | 14 | Starter package + Download | 07, 08, 09, 10 | AC-5.6, 5.7, 5.10, 5.11; FR-5 |
| W3 | 15 | Inspector scan reader | 01, 11 | FR-7 data sources (S1), scan ID (F34), paging, "Scanned X of N", inventory incomplete, connection loss leading to Not scanned; AC-7.2, 7.3, 7.6, 7.10 |
| W3 | 16 | Report model + Markdown | 11 | FR-10 and AC-9.2, 9.4–9.8, 9.10 (Markdown), escaping, redaction, stem sanitising |
| W3 | 17 | Behavior harness | 07, 08, 09, 10 | AC-4.12: 36 configurations, 6 shared client failure cases, demo-page cases, sentinel secret |
| W3 | 18 | Starter session + input tiles | 03, 04, 05, 06, 10 | Story 2 UI, AC-3.1 combobox (APG), AC-2.8/2.9/2.10, AC-5.1, 5.3, 5.4, 5.5, 5.9, AC-4.7 auto-reset |
| ◆→W4 | 19 | Spike S3 + Handler R7 | 05, 02, ◆S3 | S3 evidence (commit `7efe699`, collision probe); R7 Musts (F05/F06). Extends the 14 and 17 test tables with R7 |
| W4 | 20 | PDF renderer | 16 | AC-9.3/9.4 PDF, F44 pagination, A8 tokens, fonts, PDF title redaction |
| W4 | 21 | Starter code panes | 18, 04, 07, 10 | AC-4.1–4.3, 4.9, 4.10, AC-5.2 line flags, highlights, CodeMirror LF model, Esc-then-Tab (F48), cursor tracking for insert |
| W4 | 22 | Server Objects page | 13, 18, 04, 06 | Story 6 (AC-6.1–6.10, 6.4a), no-results state, Insert hidden while Starter is unreleased |
| W4 | 23 | Inspector page | 11, 15, 06, 04 | Story 7/8 UI: site pill picker, files tile, banners, findings, detail, Mark as reviewed, warnings, empty and error states; AC-7.1, 7.4, 7.5, 7.8, 7.11, 8.2–8.4, 8.7, 8.9 |
| W5 | 24 | Export dialog | 16, 20, 23 | AC-9.1, 9.8, 9.9; snapshot at Export (F45) |

## Release gates (per page, in completion order; each a separate Integration Verification)
- **Starter** (after 14, 17, 19, 21):
  1. Run the full suite, `npm run build` and the IIFE build-shape test, then `npx pptb-validate --skip-url-checks`.
  2. ◆ PPTB smoke with Debug → Load Local Tool.
  3. ◆ Glass contrast check (dark).
  4. ◆ Timed walkthrough with 3 makers (median ≤ 5 min).
  5. ◆ Publish with the owner's confirmation. Release with `RELEASED_PAGES` set to `['starter']`, plus any pages already released.
- **Server Objects** (after 22): the same steps. While Starter is unreleased, Insert stays hidden (AC-1.7, AC-6.8).
- **Inspector** (after 23, 24): the same steps, plus a scan on the dev site timed against the 30 s / 50 records NFR, and both export formats checked against the screen (AC-9.8).

## Coverage matrix
Every FR maps to a phase:
- FR-1: 06, 04
- FR-2: 05
- FR-2a: 10
- FR-3: 05, 07, 08, 09, 19
- FR-4: 02
- FR-5: 14, 18
- FR-6: 13, 03, 22
- FR-7: 01, 11, 15
- FR-8 and FR-9: 11
- FR-10: 16, 20, 24
- FR-11: 04
- FR-12: 00, 01, 06

Every AC is listed in exactly one phase row above, in its Satisfies column, and the consistency pass checks this. NFRs map to 21 (300 ms), 22 (100 ms), 15 (30 s), 14 (2 s), 24 (5 s) and 04 (accessibility).

## Quickstart Validation
`npm install` → `npm run build` → PPTB Settings → Show Debug Menu → Debug → Load Local Tool (the project root) → open Server Logic Tools. Then:
1. In Starter, type `Customer Summary!`, pick R4 and download the zip.
2. In Server Objects, insert a sample.
3. In Inspector, pick the dev site, scan, mark a finding reviewed and export the site PDF.

## Phase files

| Phase | File |
|---|---|
| 00 | `plans/phase-00-skeleton.md` |
| 01 | `plans/phase-01-host-adapter.md` |
| 02 | `plans/phase-02-browser-checks.md` |
| 03 | `plans/phase-03-code-structure.md` |
| 04 | `plans/phase-04-ui-primitives.md` |
| 05 | `plans/phase-05-starter-domain.md` |
| 06 | `plans/phase-06-shell.md` |
| 07 | `plans/phase-07-handlers-core.md` |
| 08 | `plans/phase-08-handlers-tutorials.md` |
| 09 | `plans/phase-09-handlers-reference.md` |
| 10 | `plans/phase-10-client-generator.md` |
| 11 | `plans/phase-11-inspector-rules.md` |
| 12 | `plans/phase-12-spike-s2.md` |
| 13 | `plans/phase-13-objects-catalogue.md` |
| 14 | `plans/phase-14-starter-package.md` |
| 15 | `plans/phase-15-inspector-scan.md` |
| 16 | `plans/phase-16-report-markdown.md` |
| 17 | `plans/phase-17-behavior-harness.md` |
| 18 | `plans/phase-18-starter-session.md` |
| 19 | `plans/phase-19-handler-r7.md` |
| 20 | `plans/phase-20-report-pdf.md` |
| 21 | `plans/phase-21-starter-code-panes.md` |
| 22 | `plans/phase-22-objects-page.md` |
| 23 | `plans/phase-23-inspector-page.md` |
| 24 | `plans/phase-24-export-dialog.md` |
