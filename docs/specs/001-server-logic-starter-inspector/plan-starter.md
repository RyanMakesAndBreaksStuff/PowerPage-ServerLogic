# Implementation Plan: Logic Starter (with Part A, the shared foundation)

**Spec:** docs/specs/001-server-logic-starter-inspector/spec.md (v4.0.0, Approved; v4.0.0 sets the 1a Graphite theme, already built)
**Sibling plans:** `plan-server-objects.md` and `plan-inspector.md`. Both depend on Part A of this plan only, and consume its Contracts unchanged.
**Index:** `plan.md` (the split, the phase DAG across all three plans, and the owner decisions).
**Created:** 2026-10-16. **Split from `plan.md`:** 2026-10-17.
**Phase plans:** one file per phase in `plans/phase-NN-<slug>.md`. Phase numbers are the stable IDs from the original 25-phase layout, so cross-references in the phase files stay valid; `18a` is the session state moved out of old Phase 18.

## Status (2026-10-19)

- **Part A is fully planned:** phases 00–06 and 18a have plan files.
- **Part A is built** (waves A0–A3 merged and green).
- **Wave B1 is planned (2026-10-18):** phases 07–10 have task-level plan files (tasks, red-first tests and acceptance criteria; no code). Goldens are hand-written `__golden__/<id>.*.txt` files compared with `toBe`, ending in one LF.
- **Wave B2 is planned (2026-10-19):** phases 14, 17 and 19 have task-level plan files. B2a (14 and 17) runs in parallel after B1. B2b (19) runs after 14 and 17 merge, because it removes their `PENDING_R7` exclusions. Spike S3's script half is done and recorded in Phase 19; its collision probe (◆) and the R7 spec update (owner approval) are still open.
- **Part C is planned (2026-10-19):** phases 18 and 21 have implementation plans with full code, drafted and run green against the repository, then removed. On `5953503`: 1,037 tests after 18 and 1,068 after 21; Phase 17 adds its own tests on top when it lands. Phase 21 needs Phase 18 merged first.
- **Inspector transport (resolved 2026-11-01, spec 4.1.0):** `queryData` cannot return a file column (`$value` gave `{}`, Spike S2 2026-10-22). Handler code is retrieved with the two documented download actions through the host adapter; see `docs/phase-5/plans/p5-2_plan.md`. A populated-handler wire comparison remains a release gate (`docs/phase-5/plans/p5-1_plan.md` Phase C).

## Scope

Spec Story 1 (with `plan-server-objects.md` and `plan-inspector.md` for their pages' halves of AC-1.2 and AC-1.7), Stories 2–5, FR-1 to FR-5, FR-11, FR-12, Learn corrections 1–23, Spike S3, and the S1/S4 evidence (recorded in Phase 00).

## Global Constraints

- Scaffold with the standard Vite template (`npm create vite@9.2.1` with `--template react-compiler-ts --eslint`; owner decision 2026-10-17, the `yo pptb` generator is not used). Phase 00 adds the PPTB build shape: a **single IIFE bundle** (`build.rolldownOptions.output: { format: 'iife', codeSplitting: false }`), the `fixHtmlForPPTB` plugin, no `type="module"`, no `crossorigin`, no split chunks.
- Toolchain: React 19.2, Vite 8, `@vitejs/plugin-react` 6 with the React Compiler through `@rolldown/plugin-babel`, TypeScript ~6.0, ESLint 9 (not the template's 10, for `eslint-plugin-jsx-a11y`), Vitest 5.
- PPTB Desktop is 1.2.7 or later. `features.connections {min:0,max:1}`, `features.minAPI "1.2.7"`, no `cspExceptions`, no CDN, every asset bundled. The npm package is `@ryanmakes/powerpages-serverlogic`.
- Host globals are touched only in `src/services/pptb/`. Dataverse access is retrieval only: `queryData`, `fetchXmlQuery`, `retrieve`, the metadata getters, and `dataverseAPI.execute` for exactly `InitializeFileBlocksDownload` and `DownloadBlock` (spec FR-7, 4.1.0; `.claude/rules/pptb-host-and-output.md`). Reads page with `Prefer: odata.maxpagesize` and a deterministic `$orderby`, never `$top` (rule amended 2026-10-17). The tool writes nothing to tool settings.
- TS strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. No `any`, no `!`, and no `as` casts to silence errors.
- React 19 with the Compiler. No `forwardRef`, and no `useEffect` for derived state.
- The feature-first layout is enforced: features never import from another feature. Cross-feature state lives in `src/app/`.
- Generators are pure `(input) => string` functions with golden-file tests. They are deterministic. String literals are built with `JSON.stringify`.
- Every generated server file has **zero** FR-4 hits. The generator source must also keep forbidden words out of _emitted_ text: no `with(`, `.startsWith(`, anonymous `function (`, or `delete <name>` in comments.
- Product code never evals generated code. Only the AC-4.12 test harness runs it, inside `node:vm` under Vitest.
- Every phase must pass `npm run typecheck`, `npm run lint` and `npm test` (Prettier was dropped by owner decision 2026-10-27, `.claude/rules/tooling.md`).
- Five HTTP methods are always shown. Exports are Markdown and PDF only.
- Commits follow `<type>(<scope>): <message>` on branch `001-server-logic-starter-inspector`. `npm publish` only with the owner's explicit confirmation.

## Goal

Ship Logic Starter as the first released page, on a Part A foundation that Server Objects and Logic Inspector build on in parallel.

## Owner decisions taken for Part A (2026-10-17)

1. **Paging rule amended.** `.claude/rules/pptb-host-and-output.md` now asks for `$select` plus `Prefer: odata.maxpagesize` and `$orderby`, never `$top` with paging (Phase 01, Decision 1).
2. ~~**Dark tiles: opaque `#15203a` plus the 7% glass layer**, not a see-through tile (Phase 04, Decision 1). The glass contrast gate stays at the Starter release.~~ Superseded by spec v4.0.0: 1a Graphite tiles are solid `--tile` with no glass, and no contrast gate remains.
3. **npm package name:** `@ryanmakes/powerpages-serverlogic` (Phase 00, Step 31).
4. **Scaffold with the standard Vite template, not `yo pptb`,** keeping the template's versions except ESLint, which stays on 9 for `eslint-plugin-jsx-a11y` (Phase 00, Steps 1–6). `CLAUDE.md` and the rules were updated to match.

## Part A changes made while finishing it (2026-10-17)

- **Phase 04 uses Phase 00's choices:** JetBrains Mono woff2 through `src/assets/fonts/fonts.css` (Phase 04's own TTF `@font-face` is gone), and `@fluentui/react-icons` components (the `@fluentui/svg-icons` path data and the `svgPathData` helper are gone).
- **Phase 01 `getTheme` rejects on a host failure** instead of resolving `'light'`, so Phase 06 can keep the current theme on a failed re-read (AC-1.6).
- **`createPptbHost(options?)`** is now the pinned signature (Phase 01 always had the optional `options`; Phase 00's skeleton test and stub follow it).
- **Phase 05 moved from Part B to Part A,** because the session (18a) needs `slugify`, `normalizeLf`, `getRecipe` and `methodEnabled`. It still depends on Phase 00 only.
- **The session gets the Part B generators injected** (`StarterDeps`), so Part A does not wait for any handler.

## Contracts (Phase 00 commits these verbatim; every later phase consumes them unchanged)

```ts
// src/types/http.ts
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const satisfies readonly HttpMethod[];
export type HandlerFunction = 'get' | 'post' | 'put' | 'patch' | 'del';
export const METHOD_FUNCTION = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'del',
} as const satisfies Record<HttpMethod, HandlerFunction>;
export type ClientLanguage = 'fetch' | 'jquery' | 'liquid';
export type View = 'starter' | 'objects' | 'inspector';

// src/types/recipe.ts
export type RecipeId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10';
export type RecipeGroup = 'core' | 'tutorial' | 'reference';
export type AccessType = 'Global' | 'Contact' | 'Account' | 'Parent' | 'Self';
export type Privilege = 'Read' | 'Write' | 'Create' | 'Delete' | 'Append' | 'AppendTo';
export type TableGrant = {
  logicalName: string;
  entitySetName: string;
  privileges: readonly Privilege[];
  accessType: AccessType;
  relationship: string | null;
  note: string | null;
};
export type ExampleRequest = { query: string | null; body: unknown; liquidInput: string | null };
export type RecipeMeta = {
  id: RecipeId;
  name: string;
  group: RecipeGroup;
  defaultMethod: HttpMethod | null; // null only for R8
  functions: readonly string[]; // exported names, e.g. ['get','post','put','del'] or ['getSummary']
  mainObject: string;
  serverObjects: readonly string[];
  tables: readonly TableGrant[];
  outboundDomains: readonly string[];
  siteSettings: readonly string[];
  webRole: string;
  permissionNote: string;
  prerequisites: readonly string[];
  learnUrl: string | null;
  extraUrls: readonly string[];
  liquid: boolean;
  readsLiquidInput: boolean;
  upstreamCredentials: boolean;
  demoPage: boolean;
  examples: Readonly<Record<string, ExampleRequest>>; // keyed by function name
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
export type HostEvent =
  { kind: 'connection-changed' } | { kind: 'settings-updated' } | { kind: 'other'; name: string };
export type FileFilter = { name: string; extensions: readonly string[] };
export type SaveResult = { status: 'saved'; path: string } | { status: 'cancelled' };
export type ODataQuery = {
  entitySet: string;
  select: readonly string[];
  filter: string | null;
  orderBy: string | null;
  pageSize: number;
};
export type FileColumnRef = {
  entityLogicalName: string; // 'powerpagecomponent'
  primaryIdAttribute: string; // 'powerpagecomponentid'
  recordId: string;
  fileAttributeName: string; // 'filecontent'
};

export class HostReadError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly transport = false,
    readonly partialRows: readonly unknown[] = [],
  ) {
    super(message);
    this.name = 'HostReadError';
  }
}
export type PptbHost = {
  getTheme(): Promise<ThemeName>; // rejects when the host call fails; the caller picks the fallback (AC-1.6)
  notify(n: Notice): Promise<void>; // rejects when host notify is missing/throws/rejects
  copyText(text: string): Promise<void>;
  saveFile(
    defaultName: string,
    content: string | Uint8Array,
    filters: readonly FileFilter[],
  ): Promise<SaveResult>;
  openExternal(url: string): Promise<void>;
  getActiveConnection(): Promise<Connection | null>;
  onEvent(handler: (e: HostEvent) => void): () => void;
  queryAll(q: ODataQuery, signal?: AbortSignal): Promise<readonly unknown[]>; // all pages; 429/5xx retried 1s/2s/4s; HostReadError carries status, transport and partialRows; AbortError on cancellation
  downloadFileColumn(ref: FileColumnRef, signal?: AbortSignal): Promise<string>; // InitializeFileBlocksDownload + DownloadBlock; see docs/phase-5/plans/p5-2_plan.md
};

// src/types/inspector.ts
export type Readable<T> =
  { ok: true; value: T } | { ok: false; reason: 'read-failed' | 'not-scanned' };
export type WebRoleFact = { id: string; name: string; anonymous: boolean; authenticated: boolean };
export type TablePermissionFact = {
  id: string;
  name: string;
  table: string;
  scope: AccessType | null;
  privileges: readonly Privilege[];
  roleIds: readonly string[];
  active: boolean;
  parentId: string | null;
};
export type SettingName =
  | 'ServerLogic/Enabled'
  | 'ServerLogic/AllowedDomains'
  | 'ServerLogic/AllowNetworkingToAllDomains'
  | 'ServerLogic/TimeoutInSeconds';
export type SettingValue =
  | { kind: 'absent' }
  | { kind: 'duplicate' }
  | { kind: 'value'; raw: string; fromEnvVar: boolean }
  | { kind: 'envvar-unreadable' } // secret type, missing variable or failed read
  | { kind: 'not-scanned' }; // environment-variable read not started before interruption
export type ServerLogicFileFacts = {
  id: string;
  name: string;
  active: boolean;
  roleIds: Readable<readonly string[]>;
  code: Readable<string>;
};
export type SiteRef = { id: string; name: string; domain: string; active: boolean };
export type SiteFacts = {
  scanId: string;
  site: SiteRef;
  connection: Connection;
  startedAt: string;
  finishedAt: string | null;
  roles: Readable<readonly WebRoleFact[]>;
  permissions: Readable<readonly TablePermissionFact[]>;
  settings: Readable<Readonly<Record<SettingName, SettingValue>>>;
  inactiveSettings: readonly SettingName[];
  files: readonly ServerLogicFileFacts[];
  inventoryComplete: boolean;
  stopped: 'connection-lost' | null;
};
export type CheckId = 'webRole' | 'tablePermissions' | 'outbound';
export type CheckStatus = 'configured' | 'needs-review' | 'reviewed' | 'not-scanned';
export type Reason = { text: string; readFailure: boolean };
export type Finding = {
  check: CheckId;
  status: CheckStatus;
  summary: string;
  reasons: readonly Reason[];
  guidance: string;
  questions: readonly string[];
  detail: readonly string[];
};
export type Snapshot = {
  roles: readonly string[];
  tables: readonly string[];
  outbound: readonly string[];
};
export type FileResult = {
  fileId: string;
  name: string;
  active: boolean;
  findings: readonly [Finding, Finding, Finding];
  snapshot: Snapshot;
};
export type ReviewKey = `${string}:${CheckId}`; // `${fileId}:${check}`
export type Counts = { C: number; V: number; M: number; U: number; T: number; K: number };
export type SiteResult = {
  facts: SiteFacts;
  files: readonly FileResult[];
  banners: readonly string[];
};

// src/types/report.ts
export type ReportScope = 'file' | 'site';
export type ReportFormat = 'markdown' | 'pdf';
export type ReportOptions = {
  scope: ReportScope;
  format: ReportFormat;
  fileId: string | null;
  questions: boolean;
  snapshot: boolean;
  redact: boolean;
};
```

**Pinned function signatures** (owner phase in brackets):

- `slugify(name: string): { slug: string; differs: boolean }` and `normalizeLf(text: string): string`, in `src/lib/slug.ts` and `src/lib/text.ts` [05].
- In `src/services/catalogue/recipes.ts` [05]: `RECIPES: readonly RecipeMeta[]`, `getRecipe(id: RecipeId): RecipeMeta`, `methodEnabled(recipe: RecipeMeta, method: HttpMethod): boolean`, `checklistLines(recipe: RecipeMeta): readonly string[]`, and the constants `UPSTREAM_CREDENTIALS_LINE`, `ACCOUNT_TEST_USER_LINE` and `EXAMPLE_GUID` (all `string`).
- In `src/services/generators/handlers/snippets.ts` [05]: the consts `TO_RESULT`, `GUID_PATTERN`, `IS_GUID`, `VALIDATION_MESSAGE`; the types `FieldError`, `LogLevel`, `LogField`, `LogLineInput`; and `headerComment(recipe: RecipeMeta): string`, `settingVar(name: string): string`, `requireSettingsCode(names: readonly string[], indent: string): string`, `failureReturn(message: string, indent?: string): string`, `validationFailureReturn(errors: readonly FieldError[], indent?: string): string`, `validationFailureReturnFor(errorsVar: string, indent?: string): string`, `logLine(i: LogLineInput): string`. Only Part B's handler generators consume them.
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
- `createPptbHost(options?: PptbHostOptions): PptbHost` with `type PptbHostOptions = { sleep?: (ms: number) => Promise<void> }` [01], and `createFakeHost(init?: FakeHostInit): PptbHost & FakeHostControls` [01], both in `src/services/pptb/`. `HostCallError` (`name === 'HostCallError'`) [01], in `src/services/pptb/hostErrors.ts`, is what `getTheme`, `notify`, `copyText`, `saveFile`, `openExternal` and `getActiveConnection` reject with. Only `src/services/pptb/` imports it; app code relies on the rejection, not the class.
- `evaluateSite(facts: SiteFacts, marks: ReadonlySet<ReviewKey>): SiteResult`, `countChecks(findings: readonly Finding[]): Counts`, `fileSummary(f: FileResult): string`, `filePill(f: FileResult): 'Ready' | 'Needs review' | 'Incomplete'`, `ringLegend(counts: Counts): string` and `canReviewFinding(finding: Finding): boolean`, in `src/features/inspector/model/rules.ts` [11]. Shared copy/settings/grant helpers are defined once in Phase 11's Interfaces.
- `runScan(host: PptbHost, connection: Connection, site: SiteRef, scanId: string, onProgress: (scanned: number, total: number) => void, options?: ScanOptions): Promise<SiteFacts>` and `listSites(host: PptbHost): Promise<readonly SiteRef[]>`, in `src/features/inspector/scan/scan.ts` [15], where `ScanOptions = { now?: () => Date; signal?: AbortSignal }`. The first five arguments remain compatible. Abort suppresses new logical reads; an in-flight host call finishes before the replacement scan starts [23].
- These live in `src/features/inspector/report/` [16, 20]:
  - `ReportModel`, in `reportModel.types.ts`: Phase 00 commits the placeholder `{ readonly placeholder: true }`; Phase 16 Task 1 owns the complete replacement shape (format, sanitised stem, header, lines, counts, banners, rows, review sections, snapshot and footer). Nothing outside `features/inspector/` reads it;
  - `buildReportModel(r: SiteResult, o: ReportOptions, exportedAt: Date): ReportModel`;
  - `renderMarkdown(m: ReportModel): string`;
  - `renderPdf(m: ReportModel): Uint8Array`;
  - `reportFileName(m: ReportModel): string`.
  - `reportIdentity(r: SiteResult, o: ReportOptions): Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title'>` and `reportFileNameBeforeBuild(r: SiteResult, o: ReportOptions): string`, in `reportFileName.ts` [16], own the intended filename even when report construction fails.
- These live in `src/app/` [00, 06, 18a]:
  - `HostContext` and `useHost(): PptbHost` [06];
  - `useNotify(): (n: Notice) => void` [06], which tries the host and falls back to an in-tool toast; `NotifyProvider` [06];
  - `useView(): [View, (v: View) => void]` [06];
  - `useActiveConnection(): Connection | null` and `ConnectionProvider` [06];
  - `useHostTheme(host: PptbHost): void` and `applyTheme(theme: ThemeName): void` [06];
  - `ExternalLink` (props `Omit<ComponentProps<'a'>, 'href' | 'onClick' | 'target'> & { href: string }`) and `PageErrorBoundary` (props `{ label: string; children: ReactNode }`) [06];
  - `App` with `AppProps = { host: PptbHost; starterDeps?: StarterDeps }` [06, 18a]; `SitePill` in `src/app/shell/` [06, then replaced by `plan-inspector.md`];
  - `RELEASED_PAGES: readonly View[]`, a build-time define [00];
  - `StarterSessionProvider` (props `{ children: ReactNode; deps?: StarterDeps }`) and `useStarterSession(): { state: StarterState; dispatch: (a: StarterAction) => void; derived: StarterDerived }` [18a]. The `StarterState`, `StarterAction` and `StarterDerived` types are pinned below;
  - `StarterDeps = { generateHandler: (id: RecipeId) => GeneratedHandler; isLiquidAllowed: (recipe: RecipeMeta, serverText: string) => boolean }` and `STARTER_DEPS`, in `src/app/starter-session/starterDeps.ts` [18a]; `initialStarterState`, `createStarterReducer`, `deriveStarter`, `applyTextChanges` [18a].
- Shared UI in `src/components/` [04]: `Icon` and `IconName` (`icons.ts`, `@fluentui/react-icons`), `Pill`, `PillGroup`, `DisabledReason`, `useDisabledReason` and `normalizeReason`, `Button`, `StatusBadge`, `checkStatusBadge`, `Ring`, `Tile`, `Modal`, `ToastStack`, each with the props type named in Phase 04's Interfaces line (`IconProps`, `PillProps` and `PillTone`, `PillGroupProps` and `PillOption`, `DisabledReasonProps`, `ReasonTriggerProps`, `ButtonProps`, `StatusBadgeProps` and `BadgeKind`, `RingProps`, `TileProps`, `ModalProps`, `ToastStackProps`, `ToastItem` and `ToastType`); `classNames` and `ringGeometry` (`RingState`, `RingArc`, `RING_GAP_DEG`, `RING_MAX_SEGMENTS`, `ringArcs`, `arcPath`) in `src/lib/`; the theme contract `src/app/theme/tokens.css`.

```ts
// src/app/starter-session/starterSession.types.ts  (Phase 00 commits; Phase 18a implements the reducer)
export type StarterState = {
  name: string;
  method: HttpMethod | null;
  recipe: RecipeId;
  language: ClientLanguage;
  serverText: string;
  generatedText: string;
  cursor: number | null;
  reviewedText: string | null; // AC-5.4: text at the moment of marking
  pendingNotice: Notice | null; // e.g. Liquid auto-reset toast (AC-4.7)
};
export type StarterAction =
  | { type: 'setName'; name: string }
  | { type: 'setMethod'; method: HttpMethod }
  | { type: 'selectRecipe'; recipe: RecipeId }
  | { type: 'setLanguage'; language: ClientLanguage }
  | { type: 'editServer'; text: string; cursor: number | null }
  | { type: 'setCursor'; cursor: number | null }
  | { type: 'applyChanges'; changes: readonly TextChange[]; cursor: number | null }
  | { type: 'markReviewed' }
  | { type: 'undoReview' }
  | { type: 'startOver' }
  | { type: 'clearNotice' };
export type StarterDerived = {
  slug: string;
  slugDiffers: boolean;
  fn: string;
  edited: boolean;
  checks: BrowserCheckResult;
  liquidAllowed: boolean;
  usedMembers: ReadonlyMap<string, readonly string[]>;
  readiness: { browser: boolean; validation: true; permissions: boolean };
  ready: 0 | 1 | 2 | 3;
};
export type StarterPackageInput = {
  state: StarterState;
  derived: StarterDerived;
  clientText: string;
};
```

**Skeleton stubs.** Phase 00 creates every cross-phase file listed above, with the contract signature and a body of `throw new Error('not implemented: phase NN')`. It also creates page placeholders, `features/{starter,server-objects,inspector}/*Page.tsx`. Each later phase replaces only the files it owns, so parallel agents never edit the same file.

## Execution model

- **One phase is one task, run by one agent.** Implementer agents are Sonnet 5.5 at high effort (Agent tool `model: "sonnet"`, `effort: "high"`). If a wave runs as an ultracode Workflow instead, it uses at most 6 concurrent agents, all Sonnet 5.5 at xhigh.
- Phases in one wave touch disjoint files. Each runs in its own worktree (`isolation: "worktree"`), and the orchestrator merges them at the end of the wave.
- At the end of each wave the orchestrator runs `npx tsc -b && npx eslint . --max-warnings=0 && npx vitest run`, and the next wave starts only when that is green.
- All original npm dependencies are installed in Phase 00: acorn, the CodeMirror 6 packages, fflate, jspdf 4.2.1, jspdf-autotable 5.0.8, `@fluentui/react-icons`, and the fonts (JetBrains Mono woff2; DM Sans and Space Grotesk as static TTF for the PDF). Phase 20 alone adds the JetBrains Mono static TTF mirror as a development dependency, as FR-10 requires.
- **Owner gates (◆)** are not agent tasks; they need the owner and a live PPTB or site. They block only their dependents.

## Part A: Foundation (fully planned)

| Wave | Phase | Title                                                        | Depends on     | Implements / Satisfies (summary)                                                                                                                                                          |
| ---- | ----- | ------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A0   | 00    | Skeleton, tooling, contracts, library probe, S1/S4 evidence  | —              | create-vite scaffold plus the PPTB build shape, FR-12 manifest, IIFE build-shape test, released-pages define (FR-1), Contracts, stubs. Records the S1 and S4 evidence from `spikes/`      |
| A1   | 01    | PPTB host adapter + fake                                     | 00             | FR-7 paging/retry, FR-12 events, NFR Security; `createPptbHost`, `createFakeHost`                                                                                                         |
| A1   | 02    | Restricted-pattern and browser-API checks                    | 00             | FR-4 (T1–T22), AC-5.2 logic, F23 fallback                                                                                                                                                 |
| A1   | 03    | Code structure analysis                                      | 00             | FR-6 used detection, FR-7 exported fns and connector fixtures, AC-4.7 HTTP-only rule, AC-6.8 insertion and its fixture                                                                    |
| A1   | 04    | Design tokens and shared UI primitives                       | 00             | FR-11 tokens (11c/12e, aurora, glass; replaced by 1a Graphite in spec v4.0.0), rings (4° gaps, proportional above 30), APG radio PillGroup, aria-disabled tooltips (F47), Modal (APG), fallback Toast stack, Fluent icons; AC-1.5 |
| A1   | 05    | Starter domain: recipe catalogue, slug, LF, handler snippets | 00             | FR-2, FR-3 metadata tables, AC-2.2/2.3/2.6/2.11, AC-3.5/3.6 data, AC-4.10 LF, Account-access lines, upstream-credentials line                                                             |
| A2   | 06    | Shell                                                        | 01, 04         | Story 1 (AC-1.1–1.7), FR-1 (notify + fallback, external links), theme follow, events registered once                                                                                      |
| A3   | 18a   | Shared Starter session state                                 | 02, 03, 05, 06 | Reducer, derived values and provider behind `StarterState`/`StarterAction`/`StarterDerived`; AC-2.8, 2.10, 3.8, 4.7, 4.10, 5.3, 5.4, 5.9 (state halves); the AC-6.8 insertion transaction |

**Part A is done when** waves A0–A3 are merged and green, and `npm run build` still produces one IIFE bundle. From then on `plan-server-objects.md`, `plan-inspector.md` and Parts B and C of this plan can run in parallel.

## Part B: Generators (B1 and B2 planned)

| Wave  | Phase | Title                            | Depends on                                | Implements / Satisfies (summary)                                                                                                                           |
| ----- | ----- | -------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1    | 07    | Handlers R1, R2, R3, R8          | 02, 05                                    | AC-3.2/3.5/3.8, FR-3 Musts, golden files                                                                                                                   |
| B1    | 08    | Handlers R4, R5, R6 + demo pages | 02, 05                                    | AC-3.3/3.4/3.7/3.9/3.10, corrections 17–18, ◆ R4 bound-create probe (owner, on the dev site; a pass becomes a spec update)                                 |
| B1    | 09    | Handlers R9, R10                 | 02, 05                                    | FR-3 R9/R10 rows, F07 prerequisites                                                                                                                        |
| B1    | 10    | Client generator + request path  | 03, 05                                    | FR-2a, AC-2.7, AC-4.4–4.8, AC-4.11; `isLiquidAllowed` for `STARTER_DEPS`                                                                                   |
| B2a   | 14    | Starter package + Download       | 07, 08, 09, 10, 18a                       | AC-5.6, 5.7, 5.10, 5.11; FR-5                                                                                                                              |
| B2a   | 17    | Behavior harness                 | 07, 08, 09, 10                            | AC-4.12: 36 configurations, 6 shared client failure cases, demo-page cases, sentinel secret; also the R4 F08 option cases handed over by Phase 08 (Task 2) |
| ◆→B2b | 19    | Spike S3 + Handler R7            | 05, 02, 14, 17, ◆S3 probe, R7 spec update | S3 evidence (commit `7efe699`, script half done 2026-10-19; collision probe ◆); R7 Musts (F05/F06). Extends the 14 and 17 test tables with R7              |

## Part C: Starter UI (planned)

| Wave | Phase | Title               | Depends on          | Implements / Satisfies (summary)                                                                                                                                    |
| ---- | ----- | ------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1   | 18    | Starter input tiles | 04, 06, 10, 18a     | Story 2 UI: the four tiles, AC-3.1 combobox (APG), AC-2.1, 2.4, 2.5, 2.9 (discard confirmation), AC-5.1, 5.3, 5.4, 5.5, 5.9 controls; the AC-4.7 Liquid pill reason |
| C2   | 21    | Starter code panes  | 04, 07, 10, 18, 18a | AC-4.1–4.3, 4.9, 4.10, AC-5.2 line flags, highlights, CodeMirror LF model, Esc-then-Tab (F48), cursor tracking for insert                                           |

## Release gate: Logic Starter (after 14, 17, 18, 19, 21; a separate Integration Verification)

1. Run the full suite, `npm run build` and the IIFE build-shape test, then `npx pptb-validate --skip-url-checks`.
2. ◆ PPTB smoke with Debug → Load Local Tool (the project root).
3. ◆ Timed walkthrough with 3 makers (median ≤ 5 min).
4. ◆ Publish with the owner's confirmation. Release with `VITE_RELEASED_PAGES` set to `starter`, plus any pages already released.

## Coverage (this plan)

- FR-1: 06, 04
- FR-2: 05, 18a
- FR-2a: 10
- FR-3: 05, 07, 08, 09, 19
- FR-4: 02
- FR-5: 14, 18a, 18
- FR-11: 04 (and every UI phase)
- FR-12: 00, 01, 06

ACs, by story. Where a phase owns the state half and another the UI half, both are named.

- **Story 1:** AC-1.1–1.6 → 06; AC-1.7 → 00 (build) and 06 (tabs); AC-1.5 pills → 04.
- **Story 2:** AC-2.1, 2.4, 2.5, 2.9 → 18; AC-2.2, 2.3, 2.11 → 05; AC-2.6 → 05 (data), 18a (`fn`); AC-2.7 → 10; AC-2.8 → 18a; AC-2.10 → 05 (`methodEnabled`), 18a (backstop), 18 (pill reason).
- **Story 3:** AC-3.1 → 05 (data), 18 (combobox); AC-3.2 → 07, 08, 09, 19; AC-3.3, 3.5, 3.6, 3.10 → 05 (data), 07–09 (emitted text); AC-3.4, 3.7, 3.9 → 08; AC-3.8 → 07, 18a.
- **Story 4:** AC-4.1–4.3, 4.9 → 21; AC-4.4–4.6, 4.8, 4.11 → 10; AC-4.7 → 03 (rule), 10 (`isLiquidAllowed`), 18a (reset), 18 (pill); AC-4.10 → 05, 18a, 21; AC-4.12 → 17.
- **Story 5:** AC-5.1 → 04 (ring), 18; AC-5.2 → 02, 21; AC-5.3, 5.4, 5.9 → 18a, 18; AC-5.5 → 05, 18; AC-5.6, 5.7, 5.10, 5.11 → 14.
- **NFRs:** 300 ms panes → 21; 2 s download → 14; accessibility → 04, 06, 18, 21.

## Quickstart Validation

`npm install` → `npm run build` → PPTB Settings → Show Debug Menu → Debug → Load Local Tool (the project root) → open Server Logic Tools. In Starter, type `Customer Summary!`, pick R4 and download the zip.

## Phase files

| Phase | Part | File                                   |
| ----- | ---- | -------------------------------------- |
| 00    | A    | `plans/phase-00-skeleton.md`           |
| 01    | A    | `plans/phase-01-host-adapter.md`       |
| 02    | A    | `plans/phase-02-browser-checks.md`     |
| 03    | A    | `plans/phase-03-code-structure.md`     |
| 04    | A    | `plans/phase-04-ui-primitives.md`      |
| 05    | A    | `plans/phase-05-starter-domain.md`     |
| 06    | A    | `plans/phase-06-shell.md`              |
| 18a   | A    | `plans/phase-18a-starter-session.md`   |
| 07    | B    | `plans/phase-07-handlers-core.md`      |
| 08    | B    | `plans/phase-08-handlers-tutorials.md` |
| 09    | B    | `plans/phase-09-handlers-reference.md` |
| 10    | B    | `plans/phase-10-client-generator.md`   |
| 14    | B    | `plans/phase-14-starter-package.md`    |
| 17    | B    | `plans/phase-17-behavior-harness.md`   |
| 19    | B    | `plans/phase-19-handler-r7.md`         |
| 18    | C    | `plans/phase-18-starter-inputs.md`     |
| 21    | C    | `plans/phase-21-starter-code-panes.md` |

## Contracts changelog

| Date       | Owner | Amendment                                                                                                                                                                                                                                                                                                         |
| ---------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-22 | 11    | Unknown permission scope is `null`; `inactiveSettings` records ignored settings; a per-setting `not-scanned` variant preserves completed inline reads when an environment-variable resolution is interrupted; shared legend/reviewability functions are pinned.                                                   |
| 2026-10-22 | 15    | `HostReadError` gains optional `transport` and `partialRows`; only the inventory consumes partial rows after a paging failure. No-status host rejections set transport until S2 refines the mapping. `ScanOptions` adds a deterministic clock and logical-read abort, retaining the five existing scan arguments. |
| 2026-10-22 | 16    | `ReportModel` replaces its Phase 00 placeholder; the complete declaration and all subordinate types are authoritative in Phase 16 Task 2. `reportFileName` returns the complete name including the model's format extension.                                                                                      |
| 2026-11-01 | P5.1 | `queryAll` and `downloadFileColumn` take an optional `AbortSignal` and reject with `AbortError` on cancellation; `downloadFileColumn` takes a `FileColumnRef`. `HostReadError.transport` is true only for a platform-confirmed network exception; an unknown no-status failure is local (`transport: false`), superseding the 2026-10-22 provisional mapping. `partialRows` keeps every row received before a later-page failure, including the strict terminal-page rejection. |
