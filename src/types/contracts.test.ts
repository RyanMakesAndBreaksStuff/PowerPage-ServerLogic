import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  BrowserCheckResult,
  InsertResult,
  TextChange,
} from '@/lib/code-analysis/codeAnalysis.types';
import type {
  Connection,
  FileFilter,
  HostEvent,
  ODataQuery,
  PptbHost,
  SaveResult,
} from '@/services/pptb/host.types';
import { HostReadError } from '@/services/pptb/host.types';
import type {
  StarterDerived,
  StarterAction,
  StarterPackageInput,
  StarterState,
} from '@/app/starter-session/starterSession.types';
import { HTTP_METHODS, METHOD_FUNCTION } from '@/types/http';
import type { ClientLanguage, HandlerFunction, HttpMethod, View } from '@/types/http';
import type {
  Counts,
  FileResult,
  Finding,
  ReviewKey,
  SettingValue,
  SiteFacts,
} from '@/types/inspector';
import type { ExampleRequest, GeneratedHandler, RecipeId, RecipeMeta } from '@/types/recipe';
import type { ReportFormat, ReportOptions, ReportScope } from '@/types/report';

describe('http contract', () => {
  it('lists all five methods in the documented order', () => {
    expect(HTTP_METHODS).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    expectTypeOf<(typeof HTTP_METHODS)[number]>().toEqualTypeOf<HttpMethod>();
  });

  it('maps each method to its handler function name', () => {
    expect(METHOD_FUNCTION).toEqual({
      GET: 'get',
      POST: 'post',
      PUT: 'put',
      PATCH: 'patch',
      DELETE: 'del',
    });
    expectTypeOf<(typeof METHOD_FUNCTION)[HttpMethod]>().toEqualTypeOf<HandlerFunction>();
  });

  it('fixes the view and client language unions', () => {
    expectTypeOf<View>().toEqualTypeOf<'starter' | 'objects' | 'inspector'>();
    expectTypeOf<ClientLanguage>().toEqualTypeOf<'fetch' | 'jquery' | 'liquid'>();
  });
});

describe('recipe contract', () => {
  it('allows a null default method only through the nullable type (R8)', () => {
    expectTypeOf<RecipeMeta['defaultMethod']>().toEqualTypeOf<HttpMethod | null>();
    expectTypeOf<RecipeMeta['examples']>().toEqualTypeOf<
      Readonly<Record<string, ExampleRequest>>
    >();
    expectTypeOf<RecipeId>().toEqualTypeOf<
      'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10'
    >();
  });

  it('describes a generated handler as LF text plus 1-based highlight lines', () => {
    expectTypeOf<GeneratedHandler>().toEqualTypeOf<{
      text: string;
      highlightLines: readonly number[];
    }>();
  });
});

describe('code-analysis contract', () => {
  it('narrows InsertResult on ok', () => {
    const describeResult = (r: InsertResult): string => (r.ok ? r.text : r.reason);
    expect(describeResult({ ok: false, reason: 'no-target' })).toBe('no-target');
    expectTypeOf<InsertResult & { ok: true }>().toHaveProperty('changes');
    expectTypeOf<TextChange>().toEqualTypeOf<{ from: number; to: number; insert: string }>();
    expectTypeOf<BrowserCheckResult['parseFailed']>().toEqualTypeOf<boolean>();
  });
});

describe('host contract', () => {
  it('carries the HTTP status on HostReadError', () => {
    const error = new HostReadError('Could not read the site', 429);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HostReadError');
    expect(error.status).toBe(429);
    expect(new HostReadError('offline', null).status).toBeNull();
  });

  it('pins the PptbHost method shapes', () => {
    expectTypeOf<PptbHost['saveFile']>().parameters.toEqualTypeOf<
      [string, string | Uint8Array, readonly FileFilter[]]
    >();
    expectTypeOf<PptbHost['saveFile']>().returns.toEqualTypeOf<Promise<SaveResult>>();
    expectTypeOf<PptbHost['queryAll']>().parameters.toEqualTypeOf<[ODataQuery, (AbortSignal | undefined)?]>();
    expectTypeOf<PptbHost['queryAll']>().returns.toEqualTypeOf<Promise<readonly unknown[]>>();
    expectTypeOf<PptbHost['getActiveConnection']>().returns.toEqualTypeOf<
      Promise<Connection | null>
    >();
    expectTypeOf<PptbHost['onEvent']>().returns.toEqualTypeOf<() => void>();
    expectTypeOf<HostEvent['kind']>().toEqualTypeOf<
      'connection-changed' | 'settings-updated' | 'other'
    >();
  });
});

describe('inspector contract', () => {
  it('keys a review as `${fileId}:${check}`', () => {
    const key: ReviewKey = 'file-1:webRole';
    expect(key).toBe('file-1:webRole');
    expectTypeOf<ReviewKey>().toEqualTypeOf<`${string}:${'webRole' | 'tablePermissions' | 'outbound'}`>();
  });

  it('gives every file exactly three findings', () => {
    expectTypeOf<FileResult['findings']>().toEqualTypeOf<readonly [Finding, Finding, Finding]>();
    expectTypeOf<Counts>().toEqualTypeOf<{
      C: number;
      V: number;
      M: number;
      U: number;
      T: number;
      K: number;
    }>();
  });

  it('models a setting that cannot be read', () => {
    expectTypeOf<Extract<SettingValue, { kind: 'value' }>>().toEqualTypeOf<{
      kind: 'value';
      raw: string;
      fromEnvVar: boolean;
    }>();
    expectTypeOf<SiteFacts['stopped']>().toEqualTypeOf<'connection-lost' | null>();
  });
});

describe('report and Starter session contracts', () => {
  it('limits report options to the two scopes and two formats', () => {
    expectTypeOf<ReportScope>().toEqualTypeOf<'file' | 'site'>();
    expectTypeOf<ReportFormat>().toEqualTypeOf<'markdown' | 'pdf'>();
    expectTypeOf<keyof ReportOptions>().toEqualTypeOf<
      'scope' | 'format' | 'fileId' | 'questions' | 'snapshot' | 'redact'
    >();
  });

  it('pins the Starter state, actions and derived readiness', () => {
    expectTypeOf<StarterDerived['ready']>().toEqualTypeOf<0 | 1 | 2 | 3>();
    expectTypeOf<StarterDerived['readiness']['validation']>().toEqualTypeOf<true>();
    expectTypeOf<StarterState['method']>().toEqualTypeOf<HttpMethod | null>();
    expectTypeOf<StarterAction['type']>().toEqualTypeOf<
      | 'setName'
      | 'setMethod'
      | 'setRecipeMethodFilter'
      | 'selectRecipe'
      | 'setLanguage'
      | 'editServer'
      | 'setCursor'
      | 'applyChanges'
      | 'markReviewed'
      | 'undoReview'
      | 'startOver'
      | 'clearNotice'
    >();
    expectTypeOf<keyof StarterPackageInput>().toEqualTypeOf<'state' | 'derived' | 'clientText'>();
  });
});
