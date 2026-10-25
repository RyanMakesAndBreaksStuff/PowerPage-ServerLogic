# Generator Behavior Harness Implementation Plan

**Goal:** Execute the currently generated handlers, all 36 clients and the three demo pages against controlled fakes, proving the remaining AC-4.12 and R7 behavior contracts.

**Architecture:** One test-only folder owns execution of generated text. `behavior.testkit.ts` owns fresh VM contexts, recorded connector and browser fakes, boundary guards, the emitted Liquid subset and shared safety checks; five test files own independent specification-derived expectations. Public catalogue/generator exports supply inputs, never the expected behavior.

**Tech stack:** Existing TypeScript strict configuration, Vitest/jsdom, Node `node:vm`, the DOM and `URLSearchParams`; no dependency or product configuration changes.

**Scope:** Phase 17, Phase 19 Task 5, AC-4.12, AC-2.7, AC-3.9, FR-3 validation/settings/result decoding/logging/content types, R4 option rules, R7 stage ordering and ticket safety. This document supersedes Phase 17's implementation outline; Phase 19 Decisions 1–16 remain the generator contract.

**Out of scope:** No production implementation during planning; no host/environment writes, new dependencies, golden updates, S2/S3/S4 runtime claims, theme work, publishing or repository-wide formatting. The separate formatter continuation task owns `.scratch` exclusion and `endOfLine: auto`.

---

Grounding as of October 24, 2026: HEAD `820c3135d46b786e2080c7e25d5cdadd333297a3`, branch `001-logic-inspector`. Read `status-2026-10-23.md` first. The coordinator already verified 89 files / 1,348 tests, TypeScript, ESLint and build; this author did not repeat builds/tests and did not materialize or execute proposed code. All proposed TypeScript below is document text and has not been compiled, linted or run. Later execution must supply that proof.

The authoritative source is `docs/specs/001-server-logic-starter-inspector/spec.md` v3.0.0: AC-4.12 at lines 204–209, FR-3 contracts at 432–465, examples at 471–488, Musts/stage table at 490–512. `plan-starter.md` supplies public signatures. Phase 17 currently has no behavior folder; its Decisions 10/13 and Tasks 1–5 need this amendment: enumerate 36 with none pending, include built R7 immediately, remove the stub guard and name the actual sinks/APIs. Phase 19 Tasks 0–4 are complete: `r7.ts:319` returns generated text; `readmeNotes.ts:7–15` has seven R7 notes; `readme.ts:11,39` imports/maps twelve R7 differences; `package.integration.test.ts:156,168` builds R7 and asserts no recipe pending. Do not reimplement those tasks.

Source decisions resolved here:

- `client.ts:182–209` uses `showError` → `console.error` and `console.log` with payload values, or `"done"` for status-only payloads. R8's Liquid file contains two complete invocations (`client.ts:282–303`), so each invocation reports once; two rendered results are correct for that file.
- `demoPages.ts:81–104,257–426,463–640,698–719` uses `jQuery(initPage)`, `window.webapi`, `$.Deferred`, `$.ajax`, `validateLoginSession`, timers and delegated handlers. R4/R5 mutations must be tested through `.add`, `.save` and `.delete`, not only the initial GET.
- An uncovered product defect exists in `client.ts:192–199`: `handleEnvelope(null)` accesses `.success` before checking object shape. The jQuery malformed-envelope case below deliberately exposes it. Its fix belongs to the separate client-envelope continuation task, with exclusive ownership of `client.ts`, `client.test.ts` and affected client goldens. That task must add an object guard and a regression test; a fake must not catch this callback exception and manufacture `.fail`. Run Task 3's red case before that fix, then rerun after it. This harness task never owns those production files and must not weaken the expected once-only error sink.

Execution order: Tasks 1 → 2 → 3 → 4 → 5. After Task 1, disjoint test-file consumers may be drafted concurrently, but verification and commits are sequential and the testkit has one owner. No worker edits another worker's files or reverts unrelated dirty work. Record `git status --short` and the current HEAD before starting. Preserve all existing deletions, untracked assets, `.scratch` and `tasks/todo.md` changes. Staging commands below name only owned files; no push is authorized.

### Task 1: The harness detects its own mistakes and enumerates the full matrix

**Owns:** All fake contracts and boundary guards, matrix enumeration, fresh realms, synchronous/async deadlines, common sentinel/validate-first checks, client once-only sink checks, strict Liquid parsing and demo API drift detection.

**Files:**

- Create: `src/services/generators/behavior/behavior.testkit.ts` — test-only runners and recorded fakes.
- Create: `src/services/generators/behavior/harness.selftest.test.ts` — bad/control texts proving each runner can fail.
- Signal: `Test-Path src/services/generators/behavior/behavior.testkit.ts` and the self-test's import failure — execution proof is absent today.

- [ ] **Step 1: Establish the observable pre-change signal**

```powershell
Test-Path -LiteralPath src/services/generators/behavior/behavior.testkit.ts
```

- [ ] **Step 2: Capture the current signal**

Run: `Test-Path -LiteralPath src/services/generators/behavior/behavior.testkit.ts`

Expected: `False` at the recorded HEAD. Then create the complete self-test below before the testkit and run `npx vitest run src/services/generators/behavior/harness.selftest.test.ts`: exit 1 with unresolved `./behavior.testkit`. This is a missing-test-infrastructure signal, not a claim that existing generators fail.

- [ ] **Step 3: Implement the minimum fix**

Create `src/services/generators/behavior/harness.selftest.test.ts` with these complete contents:

```typescript
import { describe, expect, it } from 'vitest';
import {
  CONFIGURATIONS, HANDLERS, SENTINEL, runHandler, safetyViolations,
  runClient, renderLiquidSubset, runDemoPage,
} from './behavior.testkit';

const first = { id: 'R1', fn: 'get', method: 'GET' } as const;

describe('behavior harness self-test', () => {
  it('detects a logged request secret', async () => {
    const run = await runHandler('function get(){Server.Logger.Log(Server.Context.Body);return JSON.stringify({status:"error",message:"fixed"});}', first, { context: { Body: SENTINEL } });
    expect(safetyViolations(run)).toContain('logged secret');
  });
  it('detects data access before invalid input is rejected', async () => {
    const run = await runHandler('function get(){Server.Connector.Dataverse.RetrieveRecord("contacts","id");return JSON.stringify({status:"error",message:"invalid",errors:[]});}', first);
    expect(safetyViolations(run, true)).toContain('connector called on invalid input');
  });
  it('detects returning an exception message', async () => {
    const run = await runHandler('function get(){try{Server.Connector.Dataverse.RetrieveRecord("contacts","id");}catch(e){return JSON.stringify({status:"error",message:e.message});}}', first, { mode: 'throw' });
    expect(safetyViolations(run)).toContain('failure leaked secret');
  });
  it('accepts a control that follows the same safety checks', async () => {
    const run = await runHandler('function get(){return JSON.stringify({status:"error",message:"fixed",errors:[]});}', first);
    expect(safetyViolations(run, true)).toEqual([]);
  });
  it('uses a fresh context for every run', async () => {
    await runHandler('function get(){globalThis.leftover=1;return JSON.stringify({status:"success"});}', first);
    const run = await runHandler('function get(){return JSON.stringify({status:"success",value:typeof globalThis.leftover});}', first);
    expect(run.payload.value).toBe('undefined');
  });
  it('stops a synchronous infinite loop', async () => {
    await expect(runHandler('function get(){while(true){}}', first, { syncTimeoutMs: 20 })).rejects.toThrow(/timed out/);
  });
  it('stops an async promise that never settles', async () => {
    await expect(runHandler('async function get(){await new Promise(()=>{});}', first, { asyncTimeoutMs: 20 })).rejects.toThrow('Behavior case did not settle');
  });
  it('rejects a function outside the recipe public functions', async () => {
    await expect(runHandler('function evil(){}', { ...first, fn: 'evil' })).rejects.toThrow('Function not in recipe');
  });
  it('enumerates 18 handler functions and all 36 enabled configurations', () => {
    expect(HANDLERS).toHaveLength(18);
    expect(CONFIGURATIONS).toHaveLength(36);
    expect(CONFIGURATIONS.filter((c) => c.language === 'fetch')).toHaveLength(17);
    expect(CONFIGURATIONS.filter((c) => c.language === 'jquery')).toHaveLength(17);
    expect(CONFIGURATIONS.filter((c) => c.language === 'liquid').map((c) => c.id)).toEqual(['R1', 'R8']);
    expect(CONFIGURATIONS.filter((c) => c.id === 'R7')).toHaveLength(2);
    expect(CONFIGURATIONS.filter((c) => c.id === 'R8').every((c) => c.method === null)).toBe(true);
  });
  it('rejects non-string or non-object handler output', async () => {
    await expect(runHandler('function get(){return 7;}', first)).rejects.toThrow('Handler must return JSON text');
    await expect(runHandler('function get(){return "[]";}', first)).rejects.toThrow('Expected JSON object');
  });
  it('rejects a client that reports twice', async () => {
    await expect(runClient('console.log("one");console.log("two");', 'success', {})).rejects.toThrow('Expected one client outcome');
  });
  it('rejects a client with no outcome', async () => {
    await expect(runClient('void 0;', 'success', {}, 20)).rejects.toThrow('Behavior case did not settle');
  });
  it('does not convert a success-callback exception into a transport failure', async () => {
    await expect(runClient('shell.ajaxSafePost({success:function(){throw new Error("callback failed");}}).fail(function(){console.error("fake rescue");});', 'success', {})).rejects.toThrow('callback failed');
  });
  it('rejects unknown Liquid tags and filters', () => {
    expect(() => renderLiquidSubset('{% include "unsafe" %}', {})).toThrow('Unknown Liquid tag');
    expect(() => renderLiquidSubset('{{ result.data.name | raw }}', {})).toThrow('Unknown Liquid expression');
  });
  it('rejects an unlisted demo method', async () => {
    await expect(runDemoPage('<div id="dataTable"></div><script id="demo-page-script">$("#dataTable").fadeOut();</script>', { id: 'R4', operation: 'load', mode: 'success' })).rejects.toThrow(/fadeOut/);
  });
});
```

Create `src/services/generators/behavior/behavior.testkit.ts` with these complete contents:

```typescript
import * as vm from 'node:vm';
import { RECIPES, EXAMPLE_GUID, getRecipe, methodEnabled } from '@/services/catalogue/recipes';
import { HTTP_METHODS, METHOD_FUNCTION } from '@/types/http';
import type { HttpMethod, ClientLanguage } from '@/types/http';
import type { RecipeId } from '@/types/recipe';

export const SENTINEL = 'S3NT1NEL-do-not-log';
export const ACTIVITY = 'behavior-activity';
export const HOSTILE = '<img src=x onerror=alert(1)> & "\'';
export const TOKEN = SENTINEL + '-token';
export const SITE_ID = SENTINEL + '-site';
export const DRIVE_ID = SENTINEL + '-drive';
export const WEB_URL = 'https://tickets.invalid/' + SENTINEL;
export const CLIENT_SINKS = { success: 'console.log', error: 'showError -> console.error' } as const;
export const DEMO_PAGE_API = {
  R4: ['initPage', 'beginEdit', 'saveClick', 'removeClick', 'addClick'],
  R5: ['initPage', 'beginEdit', 'saveClick', 'removeClick', 'addClick'],
  R6: ['callServer', 'showEnvelope', 'showResult'],
  jquery: ['on', 'html', 'text', 'show', 'hide', 'closest', 'attr', 'data', 'find', 'each', 'map', 'get', 'val', 'hasClass', 'addClass', 'removeClass', 'append', 'remove'],
  deferred: ['done', 'fail', 'always', 'resolve', 'reject', 'rejectWith', 'promise'],
  dom: ['getElementById', 'value', 'textContent', 'className', 'onclick'],
} as const;

export type HandlerCase = { id: RecipeId; fn: string; method: HttpMethod | null };
export type Configuration = HandlerCase & { language: ClientLanguage };

export const HANDLERS: readonly HandlerCase[] = RECIPES.flatMap((recipe) => recipe.functions.map((fn) => {
  const method = HTTP_METHODS.find((candidate) => METHOD_FUNCTION[candidate] === fn && methodEnabled(recipe, candidate)) ?? null;
  if (method === null && recipe.id !== 'R8') throw new Error('No HTTP method for ' + recipe.id + '.' + fn);
  return { id: recipe.id, fn, method };
}));

export const CONFIGURATIONS: readonly Configuration[] = HANDLERS.flatMap((c) => {
  const languages: ClientLanguage[] = c.id === 'R8' ? ['liquid'] : ['fetch', 'jquery'];
  if (getRecipe(c.id).liquid && c.id !== 'R8') languages.push('liquid');
  return languages.map((language) => ({ ...c, language }));
});

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function isList(value: unknown): value is readonly unknown[] { return Array.isArray(value); }
function isCallback(value: unknown): value is (...args: unknown[]) => unknown { return typeof value === 'function'; }
export function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Expected object');
  return value;
}
export function jsonRecord(text: unknown): Record<string, unknown> {
  if (typeof text !== 'string') throw new Error('Expected JSON text');
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error('Expected JSON object');
  return value;
}
export function list(value: unknown): readonly unknown[] {
  if (!isList(value)) throw new Error('Expected array');
  return value;
}
export function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected string');
  return value;
}

export function exampleQuery(query: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of (query ?? '').replace(/^\?/, '').split('&')) {
    if (part === '') continue;
    const split = part.indexOf('=');
    const key = split < 0 ? part : part.slice(0, split);
    const value = split < 0 ? '' : part.slice(split + 1);
    result[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return result;
}

async function deadline(value: unknown, timeoutMs: number): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(value),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { reject(new Error('Behavior case did not settle')); }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

type ContextValues = {
  ActivityId: string; Body: string; FunctionName: string; Headers: Record<string, string>;
  HttpMethod: string; Input: string; QueryParameters: Record<string, unknown>;
  ServerLogicName: string; Url: string;
};
export type Call = { method: string; args: readonly unknown[] };
type ReplyOverride = { method: string; occurrence?: number; raw?: unknown; throws?: boolean };
export type HandlerScenario = {
  mode?: 'success' | 'failure' | 'empty' | 'throw';
  context?: Partial<ContextValues>;
  settings?: Record<string, string | null>;
  replies?: readonly ReplyOverride[];
  objectResults?: boolean;
  syncTimeoutMs?: number;
  asyncTimeoutMs?: number;
};
export type HandlerRun = {
  text: string; payload: Record<string, unknown>; calls: readonly Call[];
  logs: readonly Call[]; settingReads: readonly string[];
};

export function response(body: unknown, status = 200, success = true, headers: Record<string, unknown> = { entityId: EXAMPLE_GUID, trace: SENTINEL }): Record<string, unknown> {
  return {
    StatusCode: status, IsSuccessStatusCode: success, ReasonPhrase: success ? 'OK' : 'Failure',
    Body: typeof body === 'string' ? body : JSON.stringify(body), Headers: headers,
    IsBinaryBody: false, ServerError: null, ServerErrorMessage: null,
  };
}

function defaultResult(c: HandlerCase, method: string, occurrence: number): Record<string, unknown> {
  if (c.id === 'R7') {
    if (method === 'HttpClient.PostAsync') return response({ access_token: TOKEN });
    if (method === 'HttpClient.GetAsync') return response({ id: occurrence === 0 ? SITE_ID : DRIVE_ID });
    if (method === 'HttpClient.PutAsync') return response({ webUrl: WEB_URL }, 201);
    return response('', 204);
  }
  if (method === 'Dataverse.CreateRecord') return response('', 204);
  if (c.id === 'R6') return response('Hello ' + SENTINEL);
  if (c.id === 'R9') {
    const r = response({ accepted: true, secret: SENTINEL }, 202);
    const { Headers: _headers, ...flow } = r;
    return flow;
  }
  if (c.id === 'R1' || c.id === 'R4') {
    const row = { contactid: EXAMPLE_GUID, fullname: SENTINEL, emailaddress1: 'maker@example.test' };
    return response(method === 'Dataverse.RetrieveRecord' ? row : { value: [row] });
  }
  return response({ upstream: SENTINEL });
}

export function buildFakeServer(c: HandlerCase, scenario: HandlerScenario = {}): {
  Server: object; calls: Call[]; logs: Call[]; settingReads: string[];
} {
  const example = getRecipe(c.id).examples[c.fn];
  if (example === undefined) throw new Error('Missing example');
  const context: ContextValues = {
    ActivityId: ACTIVITY, Body: example.body === null ? '' : JSON.stringify(example.body),
    FunctionName: c.fn, Headers: { trace: SENTINEL }, HttpMethod: c.method ?? '',
    Input: example.liquidInput ?? '', QueryParameters: exampleQuery(example.query),
    ServerLogicName: 'customer-summary', Url: '/_api/serverlogics/customer-summary',
    ...scenario.context,
  };
  const settings: Record<string, string | null> = Object.fromEntries(getRecipe(c.id).siteSettings.map((name) => [name, SENTINEL]));
  Object.assign(settings, scenario.settings);
  const calls: Call[] = [];
  const logs: Call[] = [];
  const settingReads: string[] = [];
  const counts = new Map<string, number>();
  const connector = (method: string) => (...args: unknown[]): unknown => {
    const occurrence = counts.get(method) ?? 0;
    counts.set(method, occurrence + 1);
    calls.push({ method, args });
    const override = scenario.replies?.find((r) => r.method === method && (r.occurrence ?? 0) === occurrence);
    if (override?.throws === true || scenario.mode === 'throw') throw new Error(SENTINEL);
    let result: unknown = defaultResult(c, method, occurrence);
    if (scenario.mode === 'failure') result = response(SENTINEL, 500, false);
    if (scenario.mode === 'empty') result = response('', c.id === 'R9' ? 202 : 204);
    if (override !== undefined && Object.hasOwn(override, 'raw')) result = override.raw;
    return scenario.objectResults === true ? result : JSON.stringify(result);
  };
  const asyncConnector = (method: string) => (...args: unknown[]): Promise<unknown> => {
    try { return Promise.resolve(connector(method)(...args)); }
    catch (error: unknown) { return Promise.reject(error); }
  };
  const logger = (method: string) => (...args: unknown[]): void => { logs.push({ method, args }); };
  return {
    calls, logs, settingReads,
    Server: {
      Context: context, User: null,
      SiteSetting: { Get: (name: string) => { settingReads.push(name); return settings[name] ?? null; } },
      Logger: { Log: logger('Log'), Warn: logger('Warn'), Error: logger('Error') },
      Connector: {
        Dataverse: Object.fromEntries(['RetrieveRecord', 'RetrieveMultipleRecords', 'CreateRecord', 'UpdateRecord', 'DeleteRecord', 'InvokeCustomApi'].map((name) => [name, connector('Dataverse.' + name)])),
        HttpClient: Object.fromEntries(['GetAsync', 'PostAsync', 'PutAsync', 'PatchAsync', 'DeleteAsync'].map((name) => [name, asyncConnector('HttpClient.' + name)])),
        CloudFlow: { TriggerAsync: asyncConnector('CloudFlow.TriggerAsync') },
      },
    },
  };
}

export async function runHandler(text: string, c: HandlerCase, scenario: HandlerScenario = {}): Promise<HandlerRun> {
  if (!getRecipe(c.id).functions.includes(c.fn)) throw new Error('Function not in recipe');
  const fake = buildFakeServer(c, scenario);
  const context = vm.createContext({ Server: fake.Server });
  const raw: unknown = new vm.Script(text + '\n' + c.fn + '();').runInContext(context, { timeout: scenario.syncTimeoutMs ?? 1000 });
  const result = await deadline(raw, scenario.asyncTimeoutMs ?? 1000);
  if (typeof result !== 'string') throw new Error('Handler must return JSON text');
  return { text: result, payload: jsonRecord(result), calls: fake.calls, logs: fake.logs, settingReads: fake.settingReads };
}

export function safetyViolations(run: HandlerRun, invalid = false, secrets: readonly string[] = [SENTINEL]): readonly string[] {
  const violations: string[] = [];
  const logText = JSON.stringify(run.logs);
  if (secrets.some((secret) => logText.includes(secret))) violations.push('logged secret');
  if (run.payload.status === 'error' && secrets.some((secret) => run.text.includes(secret))) violations.push('failure leaked secret');
  if (invalid && run.calls.length > 0) violations.push('connector called on invalid input');
  return violations;
}

type DeferredCallback = (...args: unknown[]) => unknown;
function deferred() {
  let state: 'pending' | 'resolved' | 'rejected' = 'pending';
  let values: unknown[] = [];
  const done: DeferredCallback[] = [];
  const fail: DeferredCallback[] = [];
  const always: DeferredCallback[] = [];
  const add = (target: DeferredCallback[], value: unknown, wanted: typeof state | 'always'): void => {
    if (!isCallback(value)) throw new Error('Expected callback');
    if (wanted === state || (wanted === 'always' && state !== 'pending')) value(...values);
    else if (state === 'pending') target.push(value);
  };
  const settle = (next: 'resolved' | 'rejected', args: unknown[]): void => {
    if (state !== 'pending') return;
    state = next; values = args;
    for (const callback of next === 'resolved' ? done : fail) callback(...values);
    for (const callback of always) callback(...values);
  };
  const api = {
    done: (value: unknown) => { add(done, value, 'resolved'); return api; },
    fail: (value: unknown) => { add(fail, value, 'rejected'); return api; },
    always: (value: unknown) => { add(always, value, 'always'); return api; },
    resolve: (...args: unknown[]) => { settle('resolved', args); return api; },
    reject: (...args: unknown[]) => { settle('rejected', args); return api; },
    rejectWith: (_receiver: unknown, args: unknown) => {
      const r = record(args); const length = r.length;
      if (typeof length !== 'number') throw new Error('Expected arguments');
      settle('rejected', Array.from({ length }, (_unused, i) => r[String(i)]));
      return api;
    },
    promise: () => api,
  };
  return api;
}

export type ClientMode = 'success' | 'envelope' | 'application' | 'token' | 'transport' | 'malformed';
type Outcome = { sink: 'success' | 'error'; args: readonly unknown[] };
export type ClientRun = { outcomes: readonly Outcome[]; requests: readonly Call[]; dataReads: number };

function envelope(mode: ClientMode, payload: Record<string, unknown>, onRead: () => void): unknown {
  if (mode === 'malformed') return null;
  if (mode === 'envelope') return Object.defineProperty({ success: false, error: '{"message":"Access denied"}' }, 'data', { get: () => { onRead(); throw new Error('Read data on envelope failure'); } });
  return { success: true, data: JSON.stringify(mode === 'application' ? { status: 'error', message: 'Application failed' } : payload) };
}

export async function runClient(text: string, mode: ClientMode, payload: Record<string, unknown>, timeoutMs = 1000): Promise<ClientRun> {
  const outcomes: Outcome[] = [];
  const requests: Call[] = [];
  let dataReads = 0;
  let finish: (() => void) | undefined;
  const completed = new Promise<void>((resolve) => { finish = resolve; });
  const report = (sink: Outcome['sink']) => (...args: unknown[]): void => {
    outcomes.push({ sink, args });
    if (finish !== undefined) finish();
  };
  const supplied = envelope(mode, payload, () => { dataReads += 1; });
  const shell = {
    getTokenDeferred: () => {
      const d = deferred();
      return mode === 'token' ? d.reject(new Error(SENTINEL)) : d.resolve('test-token');
    },
    ajaxSafePost: (value: unknown) => {
      const options = record(value);
      requests.push({ method: 'jquery', args: [options] });
      const d = deferred();
      if (mode === 'token' || mode === 'transport') return d.reject(new Error(SENTINEL));
      const success = options.success;
      if (!isCallback(success)) throw new Error('Missing success callback');
      success(supplied); // Callback exceptions propagate; jQuery does not turn these into .fail.
      return d.resolve(supplied);
    },
  };
  const fetchFake = (url: unknown, options: unknown): Promise<unknown> => {
    requests.push({ method: 'fetch', args: [url, options] });
    if (mode === 'transport') return Promise.reject(new Error(SENTINEL));
    return Promise.resolve({ ok: true, status: 200, json: () => mode === 'malformed' ? Promise.reject(new Error('Invalid JSON')) : Promise.resolve(supplied) });
  };
  const context = vm.createContext({ shell, fetch: fetchFake, URLSearchParams, console: { log: report('success'), error: report('error') } });
  new vm.Script(text).runInContext(context, { timeout: 1000 });
  await deadline(completed, timeoutMs);
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  if (outcomes.length !== 1) throw new Error('Expected one client outcome; got ' + outcomes.length);
  return { outcomes, requests, dataReads };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

