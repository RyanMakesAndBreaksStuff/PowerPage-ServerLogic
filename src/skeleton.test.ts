import { describe, expect, expectTypeOf, it } from 'vitest';
import { HostContext, useHost } from '@/session/HostContext';
import { RELEASED_PAGES } from '@/app/releasedPages';
import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
import type {
  StarterAction,
  StarterDerived,
  StarterPackageInput,
  StarterState,
} from '@/types/starter';
import { useStarterSession } from '@/session/useStarterSession';
import { useNotify } from '@/session/useNotify';
import { useView } from '@/session/useView';
import { DownloadStarterButton } from '@/features/starter/download/DownloadStarterButton';
import { evaluateSite, countChecks, fileSummary, filePill } from '@/features/inspector/model/rules';
import { buildReportModel } from '@/features/inspector/report/buildReportModel';
import { renderMarkdown } from '@/features/inspector/report/renderMarkdown';
import { renderPdf } from '@/features/inspector/report/renderPdf';
import { reportFileName } from '@/features/inspector/report/reportFileName';
import type { ReportModel } from '@/features/inspector/report/reportModel.types';
import { listSites, runScan } from '@/features/inspector/scan/scan';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
import type {
  BrowserCheckResult,
  ConnectorUse,
  InsertResult,
} from '@/lib/code-analysis/codeAnalysis.types';
import {
  detectConnectorUse,
  exportedFunctionNames,
  planInsertion,
  readsHttpOnlyContext,
  usedServerMembers,
} from '@/lib/code-analysis/structure';
import { slugify } from '@/lib/slug';
import { normalizeLf } from '@/lib/text';
import { getRecipe, RECIPES } from '@/services/catalogue/recipes';
import { SERVER_OBJECTS } from '@/services/catalogue/serverObjects';
import {
  generateClient,
  isLiquidAllowed,
  requestPathSteps,
} from '@/services/generators/client/client';
import { generateDemoPage, generateHandler } from '@/services/generators/handlers';
import { buildPackageFiles } from '@/services/generators/package/buildPackageFiles';
import { buildZip } from '@/services/generators/package/buildZip';
import type { Connection, Notice, PptbHost } from '@/services/pptb/host.types';
import { createFakeHost } from '@/services/pptb/fakeHost';
import { createPptbHost } from '@/services/pptb/pptbHost';
import type { PptbHostOptions } from '@/services/pptb/pptbHost';
import type { ClientLanguage, HttpMethod, View } from '@/types/http';
import type {
  Counts,
  FileResult,
  Finding,
  ReviewKey,
  ScanProgress,
  SiteFacts,
  SiteRef,
  SiteResult,
} from '@/types/inspector';
import type { GeneratedHandler, RecipeId, RecipeMeta } from '@/types/recipe';
import type { ReportOptions } from '@/types/report';

type FileEntry = { path: string; content: string };

describe('skeleton: every pinned function exists with its contract signature', () => {
  it('Starter domain (phase 05) and catalogues (05, 13)', () => {
    expectTypeOf(slugify).toEqualTypeOf<(name: string) => { slug: string; differs: boolean }>();
    expectTypeOf(normalizeLf).toEqualTypeOf<(text: string) => string>();
    expectTypeOf(getRecipe).toEqualTypeOf<(id: RecipeId) => RecipeMeta>();
    expectTypeOf(RECIPES).toEqualTypeOf<readonly RecipeMeta[]>();
    expect(Array.isArray(RECIPES)).toBe(true);
    expect(Array.isArray(SERVER_OBJECTS)).toBe(true);
  });

  it('code analysis (phases 02 and 03)', () => {
    expectTypeOf(runBrowserChecks).toEqualTypeOf<(code: string) => BrowserCheckResult>();
    expectTypeOf(detectConnectorUse).toEqualTypeOf<(code: string) => ConnectorUse | null>();
    expectTypeOf(exportedFunctionNames).toEqualTypeOf<(code: string) => readonly string[] | null>();
    expectTypeOf(usedServerMembers).toEqualTypeOf<
      (code: string) => ReadonlyMap<string, readonly string[]>
    >();
    expectTypeOf(readsHttpOnlyContext).toEqualTypeOf<(code: string) => boolean>();
    expectTypeOf(planInsertion).toEqualTypeOf<
      (code: string, sample: string, cursor: number | null, targetFn: string) => InsertResult
    >();
  });

  it('generators (phases 07 to 10, 14, 19)', () => {
    expectTypeOf(generateHandler).toEqualTypeOf<(id: RecipeId) => GeneratedHandler>();
    expectTypeOf(generateDemoPage).toEqualTypeOf<(id: RecipeId, slug: string) => string | null>();
    expectTypeOf(generateClient).toEqualTypeOf<
      (i: {
        slug: string;
        recipe: RecipeId;
        fn: string;
        method: HttpMethod | null;
        language: ClientLanguage;
      }) => string
    >();
    expectTypeOf(requestPathSteps).toEqualTypeOf<
      (
        language: ClientLanguage,
        slug: string,
        fn: string,
      ) => readonly { label: string; value: string }[]
    >();
    expectTypeOf(isLiquidAllowed).toEqualTypeOf<
      (recipe: RecipeMeta, serverText: string) => boolean
    >();
    expectTypeOf(buildPackageFiles).toEqualTypeOf<
      (i: StarterPackageInput) => readonly FileEntry[]
    >();
    expectTypeOf(buildZip).toEqualTypeOf<(files: readonly FileEntry[]) => Uint8Array>();
  });

  it('host adapter (phase 01)', () => {
    expectTypeOf(createPptbHost).toEqualTypeOf<(options?: PptbHostOptions) => PptbHost>();
    expectTypeOf(createFakeHost).returns.toExtend<PptbHost>();
  });

  it('Inspector model, scan and report (phases 11, 15, 16, 20)', () => {
    expectTypeOf(evaluateSite).toEqualTypeOf<
      (facts: SiteFacts, marks: ReadonlySet<ReviewKey>) => SiteResult
    >();
    expectTypeOf(countChecks).toEqualTypeOf<(findings: readonly Finding[]) => Counts>();
    expectTypeOf(fileSummary).toEqualTypeOf<(f: FileResult) => string>();
    expectTypeOf(filePill).toEqualTypeOf<
      (f: FileResult) => 'Ready' | 'Needs review' | 'Incomplete'
    >();
    expectTypeOf(runScan).toEqualTypeOf<
      (
        host: PptbHost,
        connection: Connection,
        site: SiteRef,
        scanId: string,
        onProgress: (progress: ScanProgress) => void,
        options?: { signal?: AbortSignal; now?: () => Date },
      ) => Promise<SiteFacts>
    >();
    expectTypeOf(listSites).toEqualTypeOf<(host: PptbHost) => Promise<readonly SiteRef[]>>();
    expectTypeOf(buildReportModel).toEqualTypeOf<
      (r: SiteResult, o: ReportOptions, exportedAt: Date) => ReportModel
    >();
    expectTypeOf(renderMarkdown).toEqualTypeOf<(m: ReportModel) => string>();
    expectTypeOf(renderPdf).toEqualTypeOf<(m: ReportModel) => Uint8Array>();
    expectTypeOf(reportFileName).toEqualTypeOf<(m: ReportModel) => string>();
  });

  it('app hooks and context (phases 06, 18a)', () => {
    expectTypeOf(useHost).toEqualTypeOf<() => PptbHost>();
    expectTypeOf(useNotify).toEqualTypeOf<() => (n: Notice) => void>();
    expectTypeOf(useView).toEqualTypeOf<() => [View, (v: View) => void]>();
    expectTypeOf(useStarterSession).toEqualTypeOf<
      () => {
        state: StarterState;
        dispatch: (a: StarterAction) => void;
        derived: StarterDerived;
      }
    >();
    expect(HostContext).toBeDefined();
    expect(typeof StarterSessionProvider).toBe('function');
    expect(typeof DownloadStarterButton).toBe('function');
    expect(RELEASED_PAGES.length).toBeGreaterThan(0);
  });
});
