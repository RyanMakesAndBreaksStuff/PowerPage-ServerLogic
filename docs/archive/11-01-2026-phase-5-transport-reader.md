# Phase 5 S2, Transport and Reader Implementation Plan

**Goal:** Download actual handler text through PPTB, read complete enhanced-model configuration, and retain trustworthy partial scan evidence.

**Architecture:** Task 2 owns the manual S2 continuation and its shape-only evidence. Task 3 owns typed host operations, cancellation, paging, and the single production file protocol; Task 5 owns queries, boundary parsing, sequential configuration reads, and a four-operation file pool. Existing Inspector evaluation consumes the resulting facts.

**Tech stack:** Installed TypeScript 6, Vitest 5, `@pptb/types` 1.2.7, browser typed arrays/TextDecoder/AbortSignal, Node VM for offline probe tests; no new dependency.

**Scope:** `phasse5plan.md` P5.1 S2 continuation, P5.2, and P5.4; FR-7 and AC-7.2–4, 7.7–10. Execute after Task 1's requirement amendments. Task 5 also follows Task 4's evidence/rule changes.

**Out of scope:** Production edits during planning, live operations during planning, UI implementation, report implementation, Starter repairs, publication, and changing `NEXT_LINK_UNVERIFIED` without wire proof.

## Grounding and integration contract

- Inspected production using CodeGraph first, then LeanCTX; read the full required plan template, `phasse5plan.md`, v4.0.1 FR-7, adapter/tests, and S1 type-9/11/18/35 samples. The integration owner maintains checkpoint history and current repository-wide gate results. Reconcile the shown hunks against the execution checkout, preserving adjacent work.
- Initial scoped planning baseline: `npm test -- src/services/pptb src/features/inspector/model src/skeleton.test.ts` → **8 files, 302 tests passed** on 2026-11-01. Current bounded overlay verification is recorded at the end of this fragment; old unrelated failures are not asserted as current blockers.
- Installed `node_modules/@pptb/types/dataverseAPI.d.ts:114–245` confirms `ExecuteRequest.operationName`, `operationType: 'action'`, and `parameters`; `entityName`/`entityId` are for bound operations. These two download actions are unbound. The connection target is a slot (`'primary' | 'secondary' | number`), not a connection ID; leave it unspecified. `toolboxAPI.d.ts:296–363` supplies `selectPath`, `readBinary`, and `saveFile` for manual probes.
- Task 3 pins `HostReadError(message, status, transport = false, partialRows: readonly unknown[] = [])`, `FileColumnRef = { entityLogicalName; primaryIdAttribute; recordId; fileAttributeName }`, `queryAll(q, signal?)`, and `downloadFileColumn(ref, signal?): Promise<string>`. No generic execute method is exposed to features. The standalone DevTools probe calls only the two explicit download actions.
- Task 5 pins `runScan(host, connection, site, scanId, onProgress, options?: ScanOptions)` and `listSites(host, signal?)`; `ScanOptions = { now?: () => Date; signal?: AbortSignal }`. Keep `Readable` and `SiteFacts` unchanged. Extend only the existing `envvar-unreadable` member with optional `cause`; new reader code always supplies it, old model fixtures remain valid.
- **Final identity uncertainty:** Task 5 exports `ScanConfirmationError` with `readonly facts: SiteFacts`, and `confirmScanIdentity(host, facts, signal?): Promise<SiteFacts>`. A failed final refresh throws that error with the exact acquired facts, without changing `stopped`. Successful same ID+URL returns facts; successful different identity or null throws `AbortError`. The session/UI task must retain pending facts and retry this helper, never turn refresh rejection into null/disconnection, and never publish pending facts as an accepted scan. This is the required consumer handoff; no new `SiteFacts` state is necessary.
- **Physical concurrency:** Configuration/inventory/environment reads are sequential and finish before file downloads. At most four file logical operations run, each issuing initializer/blocks/retries sequentially. On same-generation 401/confirmed network loss, stop admitting untouched files and drain already-started logical operations, retaining their successes. On cancellation, drain every dispatched promise before rejecting. The session owner must serialize replacements until the aborted preceding `runScan` settles; otherwise separate four-worker scans could exceed the physical budget.
- Lists are complete sets, not speculative defaults. A failed configuration-set read cannot establish absence; a failed inventory can retain individually validated `partialRows`. No generic record/page cap is added. A repeated paging link is a protocol failure. Unknown no-status errors stay local; only 401 or established transport provenance stops a same-identity scan.
- The brief supersedes obsolete read-only, prefix-filter, and provisional no-status-transport instructions in historical plans. Task 1 owns those documentation amendments. Task 2 appends evidence without rewriting the original `{}` observation.
- Live gates remain pending: populated stored-file byte/text comparison; actual host/runtime versions; nextLink/literal wire fidelity; callback/unsubscribe; nonsecret current/default/missing/denied environment variables; real network/expired-sign-in errors; 50-record timing. Contract fixtures do not close them.

### Execution convention

Run every command from `C:/Users/RyanDev/source/repos/Server Logic`. Step 1 creates each new test file directly from its complete listing. Step 3 retains those tests and provides complete new implementation files plus focused existing-file patches. Each `<!-- file: ... -->` block appears once at the step that creates that file; its marker supplies the exact path.

Every task uses explicit staging and commit path lists. The root plan's agreed committed-baseline reconciliation is an execution precondition, including shared-file hunks. Apply the precise shown hunks to that reconciled baseline.

---

### Task 2: Make the S2 continuation executable without exporting source or identifiers

**Owns:** P5.1's S2 continuation and pending release evidence; the probe never runs a live call merely because its source is pasted.

**Files:**

- Modify: `scripts/s2-probe.js:1` — manual, shape-only entry points for the outstanding host observations.
- Create: `tests/s2Probe.test.ts` — offline VM execution of the actual probe.
- Modify: `findings/logic/probe_findings.md` — append superseding protocol decision and pending continuation evidence.
- Modify: `docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md:214` — add action-download continuation row to the existing evidence table.
- Signal: `npm test -- tests/s2Probe.test.ts` and `node --check scripts/s2-probe.js`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create the new test file with the complete contents below.

<!-- file: tests/s2Probe.test.ts -->
```typescript
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const ID = '00000000-0000-0000-0000-000000000001';
const bytes = new TextEncoder().encode('\uFEFFfunction get() { return "雪😀"; }');
type Evidence = Record<string, unknown>;
type Probe = {
  s2Evidence: Evidence[];
  s2DownloadKnown(id: string): Promise<void>;
  s2Environment(scenario: string, schema: string): Promise<void>;
  s2VerifyWire(kind: 'nextLink' | 'literal', actualUrl: string): void;
  s2Paging(): Promise<void>;
  s2StartEvents(): void;
  s2StopEvents(): void;
  s2CheckStopped(): void;
};

async function install() {
  const query = vi.fn<(path: string) => Promise<unknown>>().mockResolvedValue({ value: [] });
  const execute = vi.fn<(request: DataverseAPI.ExecuteRequest) => Promise<unknown>>();
  execute.mockImplementation((request) => {
    if (request.operationName === 'InitializeFileBlocksDownload') {
      return Promise.resolve({ FileContinuationToken: 'TOKEN-PRIVATE', FileSizeInBytes: bytes.length,
        FileName: 'PRIVATE.sl', IsChunkingSupported: true });
    }
    return Promise.resolve({ Data: Buffer.from(bytes).toString('base64') });
  });
  const handlers = new Set<(event: unknown, payload: unknown) => void>();
  const on = vi.fn((handler: (event: unknown, payload: unknown) => void) => {
    handlers.add(handler);
    return () => { handlers.delete(handler); };
  });
  const off = vi.fn((handler: (event: unknown, payload: unknown) => void) => {
    handlers.delete(handler);
  });
  const selectPath = vi.fn().mockResolvedValue('C:/PRIVATE/handler.sl');
  const readBinary = vi.fn<(path: string) => Promise<unknown>>().mockResolvedValue(Buffer.from(bytes));
  const connection = vi.fn().mockResolvedValue({ id: 'PRIVATE-CONNECTION', url: 'https://private.invalid' });
  const window = {
    dataverseAPI: { queryData: query, execute },
    toolboxAPI: {
      connections: { getActiveConnection: connection },
      events: { on, off },
      fileSystem: { selectPath, readBinary, saveFile: vi.fn().mockResolvedValue(null) },
      utils: { copyToClipboard: vi.fn().mockResolvedValue(undefined) },
    },
  };
  const result: unknown = runInNewContext(readFileSync(new URL('../scripts/s2-probe.js', import.meta.url), 'utf8'), {
    window, Uint8Array, TextDecoder, atob, btoa,
    console: { table: vi.fn(), info: vi.fn() },
  });
  await Promise.resolve(result);
  return { api: window as typeof window & Probe, query, execute, handlers, on, off, selectPath, readBinary, connection };
}

describe('manual S2 continuation', () => {
  it('installs without calling the host or subscribing', async () => {
    const p = await install();
    expect(p.query).not.toHaveBeenCalled();
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.connection).not.toHaveBeenCalled();
    expect(p.on).not.toHaveBeenCalled();
  });

  it('downloads the owner-picked known file with unbound actions and records only comparison facts', async () => {
    const p = await install();
    p.query.mockResolvedValue({ value: [{ powerpagecomponenttype: 35, filecontent_name: 'PRIVATE.sl',
      powerpagecomponent_FileAttachments: [{ filename: 'PRIVATE.sl', filesizeinbytes: bytes.length, mimetype: 'text/plain' }] }] });
    await p.api.s2DownloadKnown(ID);
    expect(p.selectPath).toHaveBeenCalledWith(expect.objectContaining({ type: 'file' }));
    expect(p.readBinary).toHaveBeenCalledWith('C:/PRIVATE/handler.sl');
    expect(p.execute.mock.calls[0]?.[0]).toEqual({
      operationName: 'InitializeFileBlocksDownload', operationType: 'action',
      parameters: { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.powerpagecomponent', powerpagecomponentid: ID }, FileAttributeName: 'filecontent' },
    });
    expect(p.execute.mock.calls[1]?.[0]).toEqual({
      operationName: 'DownloadBlock', operationType: 'action',
      parameters: { FileContinuationToken: 'TOKEN-PRIVATE', Offset: 0, BlockLength: bytes.length },
    });
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', bytesMatch: true, textMatch: true }));
    const saved = JSON.stringify(p.api.s2Evidence);
    for (const secret of [ID, 'TOKEN-PRIVATE', 'PRIVATE.sl', 'private.invalid', 'function get', 'C:/PRIVATE']) {
      expect(saved).not.toContain(secret);
    }
  });

  it('does not download an unpopulated record', async () => {
    const p = await install();
    p.query.mockResolvedValue({ value: [{ powerpagecomponenttype: 35, filecontent_name: 'PRIVATE.sl', powerpagecomponent_FileAttachments: [] }] });
    await p.api.s2DownloadKnown(ID);
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', outcome: 'rejected' }));
  });

  it.each(['buffer-view', 'serialized-buffer'] as const)('compares exact owner-selected bytes from %s without allocation padding', async (form) => {
    const p = await install();
    const allocation = Buffer.alloc(bytes.length + 8, 204);
    Buffer.from(bytes).copy(allocation, 4);
    const view = allocation.subarray(4, 4 + bytes.length);
    p.readBinary.mockResolvedValue(form === 'buffer-view' ? view : view.toJSON());
    p.query.mockResolvedValue({ value: [{ powerpagecomponenttype: 35, filecontent_name: 'PRIVATE.sl',
      powerpagecomponent_FileAttachments: [{ filename: 'PRIVATE.sl', filesizeinbytes: bytes.length, mimetype: 'text/plain' }] }] });
    await p.api.s2DownloadKnown(ID);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ item: 'known populated handler', bytes: bytes.length,
      localBytes: bytes.length, bytesMatch: true, textMatch: true }));
  });

  it('requires explicit owner arguments before starting host work', async () => {
    const p = await install();
    await p.api.s2DownloadKnown('');
    await expect(p.api.s2Environment('current', '')).rejects.toThrow();
    expect(() => p.api.s2VerifyWire('nextLink', '')).toThrow();
    expect(p.selectPath).not.toHaveBeenCalled();
    expect(p.query).not.toHaveBeenCalled();
    expect(p.execute).not.toHaveBeenCalled();
  });

  it('never queries values for a secret definition', async () => {
    const p = await install();
    p.query.mockResolvedValue({ value: [{ environmentvariabledefinitionid: ID, type: 100000005 }] });
    await p.api.s2Environment('secret', 'cfg_Secret');
    expect(p.query).toHaveBeenCalledTimes(1);
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ resolved: 'secret', valueRead: false }));
  });

  it('follows the unchanged encoded nextLink through a full terminal page without declaring wire proof', async () => {
    const p = await install();
    const next = 'https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B';
    p.query.mockResolvedValueOnce({ value: [{ id: 1 }], '@odata.nextLink': next })
      .mockResolvedValueOnce({ value: [{ id: 2 }] });
    await p.api.s2Paging();
    expect(p.query.mock.calls[1]?.[0]).toBe('powerpagecomponents?$skiptoken=A%25B');
    expect(p.api.s2Evidence).toContainEqual(expect.objectContaining({ pages: 2, rows: 2, terminalFull: true, wireCheck: 'pending' }));
  });

  it('uses the disposer and verifies that a later callback is absent', async () => {
    const p = await install();
    p.api.s2StartEvents();
    p.api.s2StartEvents();
    expect(p.on).toHaveBeenCalledTimes(1);
    for (const handler of p.handlers) handler(undefined, { event: 'connection:updated', data: {}, timestamp: '' });
    p.api.s2StopEvents();
    for (const handler of p.handlers) handler(undefined, { event: 'connection:updated', data: {}, timestamp: '' });
    p.api.s2CheckStopped();
    expect(p.handlers.size).toBe(0);
    expect(p.off).not.toHaveBeenCalled();
    expect(p.api.s2Evidence).toContainEqual({ item: 'unsubscribe check', outcome: 'passed' });
  });

  it('accepts explicit wire URLs but retains only comparison outcomes', async () => {
    const p = await install();
    const next = 'https://private.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B';
    p.query.mockResolvedValueOnce({ value: [{ id: 1 }], '@odata.nextLink': next })
      .mockResolvedValueOnce({ value: [{ id: 2 }] });
    await p.api.s2Paging();
    p.api.s2VerifyWire('nextLink', next);
    p.api.s2VerifyWire('literal', "https://private.invalid/api/data/v9.2/powerpagecomponents?$filter=name%20eq%20'S2%20O%27%27Brien%20name'");
    expect(p.api.s2Evidence).toContainEqual({ item: 'nextLink wire', outcome: 'passed' });
    expect(p.api.s2Evidence).toContainEqual({ item: 'literal wire', outcome: 'passed' });
    expect(JSON.stringify(p.api.s2Evidence)).not.toContain('private.invalid');
    expect(JSON.stringify(p.api.s2Evidence)).not.toContain('A%25B');
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npm test -- tests/s2Probe.test.ts`

Expected: nonzero; the current script immediately calls the host, and has no `s2DownloadKnown`, `s2Environment`, `s2Paging`, or `s2CheckStopped` entry points. These are executed behavior assertions, not a file-existence-only check.

Run: `node --check scripts/s2-probe.js`

Expected: exit 0, no syntax diagnostic. Retain this same regression command in Step 4.

- [ ] **Step 3: Implement the minimum fix**

Retain the complete test files created in Step 1.

The script's control flow changes from automatic probing to named manual operations. Retain the existing shape/probe/literal helpers; replace the automatic call sequence with the following exact patch.

<!-- patch: scripts/s2-probe.js -->
```diff
@@
-// Paste this entire script into Tool DevTools in PPTB. It performs read calls only.
-// The two save/copy probes use owner-chosen local files and the clipboard.
-(async () => {
+// Paste into Tool DevTools in PPTB. Installation makes no host calls.
+// Run the named operations manually; export only s2Evidence, never a console/network dump.
+(() => {
@@
-  await probe(
-    'connection',
-    () => window.toolboxAPI.connections.getActiveConnection(),
-    (value) => ({
-      ...shape(value),
-      hasId: typeof value?.id === 'string',
-      hasName: typeof value?.name === 'string',
-      hasUrl: typeof value?.url === 'string',
-      environment: value?.environment ?? null,
-    }),
-  );
-  record('events.off', { available: typeof window.toolboxAPI.events.off === 'function' });
+  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
+  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
+  const requireValue = (condition) => {
+    if (!condition) throw new Error('Unexpected probe response.');
+  };
+  const rows = (value) => {
+    requireValue(object(value) && Array.isArray(value.value) && !value['@odata.nextLink']);
+    return value.value;
+  };
+  const bytesOf = (value) => {
+    if (value instanceof Uint8Array) return new Uint8Array(value);
+    requireValue(object(value) && value.type === 'Buffer' && Array.isArray(value.data));
+    requireValue(value.data.every((n) => Number.isInteger(n) && n >= 0 && n <= 255));
+    return new Uint8Array(value.data);
+  };
+  const decodeBlock = (value, count) => {
+    requireValue(typeof value === 'string' && value.length % 4 === 0);
+    requireValue(!/[^A-Za-z0-9+/=]/u.test(value));
+    const binary = atob(value);
+    requireValue(btoa(binary) === value && binary.length === count);
+    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
+  };
+  const textOf = (bytes) =>
+    new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes).replace(/^\uFEFF/u, '');
+  window.s2Versions = (host, runtime) => {
+    requireValue([host, runtime].every((v) => typeof v === 'string' && /^[0-9][0-9A-Za-z.+_-]{0,79}$/u.test(v)));
+    record('versions', { host, runtime });
+  };
+  window.s2Connection = async () => {
+    await probe('connection', () => window.toolboxAPI.connections.getActiveConnection(), (value) => ({
+      ...shape(value),
+      hasId: typeof value?.id === 'string',
+      hasName: typeof value?.name === 'string',
+      hasUrl: typeof value?.url === 'string',
+      environmentKnown: ['Dev', 'Test', 'UAT', 'Production'].includes(value?.environment),
+      disconnected: value === null,
+    }));
+  };
+  let eventCount = 0;
+  let stoppedAt = null;
+  let dispose = null;
   const listener = (eventArg, payloadArg) => {
     const payload = typeof payloadArg?.event === 'string' ? payloadArg : eventArg;
-    if (typeof payload?.event === 'string' && payload.event.startsWith('connection:'))
+    if (['connection:created', 'connection:updated', 'connection:deleted'].includes(payload?.event)) {
+      eventCount += 1;
       record('connection event', {
@@
         dataHasUrl: typeof payload.data?.url === 'string',
       });
+    }
   };
-  window.toolboxAPI.events.on(listener);
-  window.s2StopEvents = () => window.toolboxAPI.events.off(listener);
-  const first = await probe(
-    'paging first',
-    () =>
-      read('powerpagecomponents?$select=powerpagecomponentid&$orderby=powerpagecomponentid', {
-        Prefer: 'odata.maxpagesize=1',
-      }),
-    (value) => ({
-      ...shape(value),
-      rows: value?.value?.length ?? null,
-      nextLink: typeof value?.['@odata.nextLink'] === 'string',
-    }),
-  );
-  if (typeof first?.['@odata.nextLink'] === 'string') {
-    const next = first['@odata.nextLink'].replace(
-      /^https?:\/\/[^/]+\/api\/data\/v\d+(?:\.\d+)?\//,
-      '',
-    );
-    await probe('paging second unchanged', () => read(next, { Prefer: 'odata.maxpagesize=1' }));
-  }
-  const logic = await probe('code inventory', () =>
-    read(
-      'powerpagecomponents?$select=powerpagecomponentid&$filter=powerpagecomponenttype eq 35&$orderby=powerpagecomponentid&$top=1',
-    ),
-  );
-  const id = logic?.value?.[0]?.powerpagecomponentid;
-  if (typeof id === 'string')
-    await probe('filecontent/$value', () => read(`powerpagecomponents(${id})/filecontent/$value`));
-  else record('filecontent/$value', { outcome: 'not run', reason: 'No type-35 record found' });
-  await probe('environment definitions', () =>
-    read(
-      'environmentvariabledefinitions?$select=environmentvariabledefinitionid,schemaname,type,defaultvalue&$orderby=environmentvariabledefinitionid&$top=1',
-    ),
-  );
-  await probe('environment values', () =>
-    read(
-      'environmentvariablevalues?$select=environmentvariablevalueid,_environmentvariabledefinitionid_value,value&$orderby=environmentvariablevalueid&$top=1',
-    ),
-  );
-  await probe('apostrophe/space literal', () =>
-    read(
-      `powerpagecomponents?$select=powerpagecomponentid&$filter=name eq ${literal("S2 O'Brien name")}&$orderby=powerpagecomponentid`,
-    ),
-  );
-  window.s2ReadFailure = (label) =>
-    probe(label, () =>
-      read('powerpagesites?$select=powerpagesiteid&$orderby=powerpagesiteid&$top=1'),
-    );
+  window.s2StartEvents = () => {
+    if (dispose !== null) return;
+    const result = window.toolboxAPI.events.on(listener);
+    dispose = typeof result === 'function' ? result : () => window.toolboxAPI.events.off(listener);
+    stoppedAt = null;
+    record('event subscription', { disposerType: typeof result, offAvailable: typeof window.toolboxAPI.events.off === 'function' });
+  };
+  window.s2StopEvents = () => {
+    if (dispose !== null) dispose();
+    dispose = null;
+    stoppedAt = eventCount;
+  };
+  window.s2CheckStopped = () => record('unsubscribe check', {
+    outcome: stoppedAt === null ? 'pending' : eventCount === stoppedAt ? 'passed' : 'failed',
+  });
+  let secondPath = null;
+  const relative = (url) => url.replace(/^https?:\/\/[^/]+\/api\/data\/v\d+(?:\.\d+)?\//u, '');
+  window.s2Paging = async () => {
+    secondPath = null;
+    await probe('paging', async () => {
+      let path = 'powerpagecomponents?$select=powerpagecomponentid&$orderby=powerpagecomponentid';
+      let pages = 0;
+      let count = 0;
+      let terminalFull = false;
+      const seen = new Set();
+      while (path !== null) {
+        requireValue(!seen.has(path));
+        seen.add(path);
+        const page = await read(path, { Prefer: 'odata.maxpagesize=1' });
+        requireValue(object(page) && Array.isArray(page.value));
+        pages += 1;
+        count += page.value.length;
+        const next = page['@odata.nextLink'];
+        if (next === null || next === undefined || next === '') {
+          terminalFull = page.value.length === 1;
+          path = null;
+        } else {
+          requireValue(typeof next === 'string');
+          path = relative(next);
+          requireValue(path.startsWith('powerpagecomponents?'));
+          if (pages === 1) secondPath = path;
+        }
+      }
+      return { pages, rows: count, terminalFull, wireCheck: 'pending' };
+    }, (value) => value);
+  };
+  window.s2Literal = async () => {
+    await probe('apostrophe/space literal', () => read(
+      `powerpagecomponents?$select=powerpagecomponentid&$filter=name eq ${literal("S2 O'Brien name")}&$orderby=powerpagecomponentid`,
+    ), (value) => ({ ...shape(value), rows: value?.value?.length ?? null, wireCheck: 'pending' }));
+  };
+  window.s2VerifyWire = (kind, actualUrl) => {
+    requireValue((kind === 'nextLink' || kind === 'literal') && typeof actualUrl === 'string' && actualUrl !== '');
+    const actual = actualUrl;
+    record(`${kind} wire`, {
+      outcome: kind === 'nextLink' && secondPath === null ? 'pending' :
+        (kind === 'nextLink' ? relative(actual) === secondPath :
+          actual.includes('S2%20O%27%27Brien%20name') && !actual.includes('%2527') && !actual.includes('%2520')) ? 'passed' : 'failed',
+    });
+  };
+  window.s2DownloadKnown = async (id) => {
+    await probe('known populated handler', async () => {
+      requireValue(typeof id === 'string' && guid.test(id));
+      const path = await window.toolboxAPI.fileSystem.selectPath({
+        type: 'file', title: 'Select the local copy of that stored handler',
+        filters: [{ name: 'Server logic', extensions: ['sl', 'js'] }],
+      });
+      if (path === null) return { outcome: 'cancelled' };
+      const binary = await window.toolboxAPI.fileSystem.readBinary(path);
+      const local = bytesOf(binary);
+      record('local binary shape', { type: typeof binary, constructor: binary?.constructor?.name ?? null,
+        typedArray: binary instanceof Uint8Array, bytes: local.byteLength });
+      const connection = await window.toolboxAPI.connections.getActiveConnection();
+      requireValue(object(connection) && typeof connection.id === 'string' && typeof connection.url === 'string');
+      const metadata = rows(await read(
+        `powerpagecomponents?$select=powerpagecomponentid,powerpagecomponenttype,filecontent_name&$filter=powerpagecomponentid eq ${id}&$expand=powerpagecomponent_FileAttachments($select=filename,filesizeinbytes,mimetype)`,
+      ));
+      requireValue(metadata.length === 1 && metadata[0].powerpagecomponenttype === 35);
+      const row = metadata[0];
+      const attachments = row.powerpagecomponent_FileAttachments;
+      requireValue(typeof row.filecontent_name === 'string' && Array.isArray(attachments));
+      const populated = attachments.some((a) => object(a) && a.filename === row.filecontent_name &&
+        Number.isSafeInteger(a.filesizeinbytes) && a.filesizeinbytes > 0);
+      record('file metadata', {
+        fileNameType: typeof row.filecontent_name, attachmentRows: attachments.length,
+        attachmentTypes: attachments.map((a) => ({ filename: typeof a?.filename, size: typeof a?.filesizeinbytes, mimetype: typeof a?.mimetype })),
+        matchingPopulatedAttachment: populated,
+      });
+      requireValue(populated);
+      const init = await window.dataverseAPI.execute({
+        operationName: 'InitializeFileBlocksDownload', operationType: 'action',
+        parameters: { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.powerpagecomponent', powerpagecomponentid: id }, FileAttributeName: 'filecontent' },
+      });
+      record('file initializer', { types: Object.fromEntries(
+        ['FileContinuationToken', 'FileSizeInBytes', 'FileName', 'IsChunkingSupported'].map((key) => [key, typeof init?.[key]]),
+      ) });
+      requireValue(object(init) && typeof init.FileContinuationToken === 'string' && init.FileContinuationToken !== '' &&
+        Number.isSafeInteger(init.FileSizeInBytes) && init.FileSizeInBytes > 0 &&
+        typeof init.FileName === 'string' && typeof init.IsChunkingSupported === 'boolean');
+      const downloaded = new Uint8Array(init.FileSizeInBytes);
+      let blocks = 0;
+      for (let offset = 0; offset < downloaded.length;) {
+        const length = init.IsChunkingSupported ? Math.min(4 * 1024 * 1024, downloaded.length - offset) : downloaded.length;
+        const block = await window.dataverseAPI.execute({
+          operationName: 'DownloadBlock', operationType: 'action',
+          parameters: { FileContinuationToken: init.FileContinuationToken, Offset: offset, BlockLength: length },
+        });
+        record('file block shape', { dataType: typeof block?.Data });
+        downloaded.set(decodeBlock(block?.Data, length), offset);
+        offset += length;
+        blocks += 1;
+      }
+      const current = await window.toolboxAPI.connections.getActiveConnection();
+      requireValue(current?.id === connection.id && current?.url === connection.url);
+      return {
+        bytes: downloaded.length, localBytes: local.length, blocks, chunked: init.IsChunkingSupported,
+        bytesMatch: downloaded.length === local.length && downloaded.every((b, i) => b === local[i]),
+        textMatch: textOf(downloaded) === textOf(local),
+      };
+    }, (value) => value);
+  };
+  window.s2Environment = async (scenario, schema) => {
+    requireValue(['current', 'default', 'missing', 'denied', 'secret'].includes(scenario) &&
+      typeof schema === 'string' && schema.trim() !== '');
+    await probe(`environment ${scenario}`, async () => {
+      const definitions = rows(await read(
+        `environmentvariabledefinitions?$select=environmentvariabledefinitionid,type,defaultvalue&$filter=schemaname eq ${literal(schema)}&$orderby=environmentvariabledefinitionid`,
+      ));
+      if (definitions.length === 0) return { definitionRows: 0, resolved: 'missing', valueRead: false };
+      requireValue(definitions.length === 1);
+      const definition = definitions[0];
+      if (definition.type === 100000005) return { definitionRows: 1, resolved: 'secret', valueRead: false };
+      requireValue(Number.isInteger(definition.type) && definition.type >= 100000000 && definition.type <= 100000004);
+      requireValue(guid.test(definition.environmentvariabledefinitionid));
+      const values = rows(await read(
+        `environmentvariablevalues?$select=environmentvariablevalueid,value&$filter=_environmentvariabledefinitionid_value eq ${definition.environmentvariabledefinitionid} and statecode eq 0&$orderby=environmentvariablevalueid`,
+      ));
+      requireValue(values.length <= 1);
+      const current = values[0]?.value;
+      requireValue(current === null || current === undefined || typeof current === 'string');
+      return { definitionRows: 1, valueRows: values.length, valueRead: true,
+        resolved: typeof current === 'string' ? 'current' : typeof definition.defaultvalue === 'string' ? 'default' : 'missing' };
+    }, (value) => value);
+  };
+  window.s2ReadFailure = async (label) => {
+    requireValue(['network drop', 'expired sign-in', '403 denial'].includes(label));
+    await probe(label, () => read('powerpagesites?$select=powerpagesiteid&$orderby=powerpagesiteid&$top=1'));
+  };
@@
-    'Now change another connection and rename/relabel the active one; record event shapes. Run s2SaveBytes() then verify exact bytes; run s2Copy() then paste locally. Drop network then run s2ReadFailure("network drop"); restore network, expire sign-in using the host UI, then run s2ReadFailure("expired sign-in"). Restore connection and call s2StopEvents(). Export only the shape table; no setting values, IDs, URLs, tokens or handler text are printed. Record PPTB/host version manually.',
+    'Installed only. Run s2Versions, s2Connection, s2StartEvents, s2Paging and s2Literal manually. Supply explicit owner arguments to s2DownloadKnown(id), s2Environment(scenario, schema), and s2VerifyWire(kind, actualUrl). After stopping events, change a connection and run s2CheckStopped. Export only s2Evidence; source, paths, IDs, URLs and tokens stay local.',
```



Append the following dated section; keep every historical observation above it.

<!-- patch: findings/logic/probe_findings.md -->
```diff
@@
 | Network and expired sign-in not run | Do not classify no-status errors from this session. |
+
+## 2026-11-01 Phase 5 continuation — superseding transport decision
+
+Phase 5 replaces the historical prohibition on download actions. The original `$value` → `{}` observation remains valid; it does not establish the response of `InitializeFileBlocksDownload` or `DownloadBlock`. These unbound actions retrieve existing content through the host's signed-in connection. Local fixture success is not a live result.
+
+`scripts/s2-probe.js` installs manual operations without making host calls. `s2DownloadKnown(id)` requires the owner's populated type-35 record ID as an argument and selects its local counterpart through the native file picker. It verifies metadata, performs the two actions, and records shape/byte/text comparison facts only. `s2Environment(scenario, schema)` and `s2VerifyWire(kind, actualUrl)` also require explicit DevTools arguments; no browser modal is used. Installed `@pptb/types` 1.2.7 declares `readBinary(path): Promise<Buffer>`; the probe copies the returned byte view, including its offset/length, before comparison. No source, filename, path, connection/site/record identifier, request URL, or continuation token belongs in committed evidence.
+
+| Observation | Manual operation | Status on 2026-11-01 |
+| --- | --- | --- |
+| Actual host/runtime versions | `s2Versions` with the versions displayed by PPTB/runtime | Pending — no live session run |
+| Populated handler, metadata, initializer types, Data/base64, bytes and UTF-8 text | `await s2DownloadKnown(recordId)` with the owner's record ID | Pending — fixture coverage only |
+| Complete paging and full terminal page | `await s2Paging()` | Pending |
+| Actual second request matches the issued nextLink | `s2VerifyWire('nextLink', secondRequestUrl)` with the actual URL from Network | Pending; `NEXT_LINK_UNVERIFIED` remains true |
+| Apostrophe/space literal, encoded exactly once | `await s2Literal()` then `s2VerifyWire('literal', literalRequestUrl)` with the actual URL | Pending |
+| Connection and callback argument shapes | `await s2Connection()`; `s2StartEvents()`; edit another connection and rename/relabel the active connection | Pending |
+| Unsubscribe after a further real connection change | `s2StopEvents()`; change a connection; `s2CheckStopped()` | Pending |
+| Nonsecret current/default/missing/denied and secret no-value-read | `await s2Environment('current', currentSchema)`, `await s2Environment('default', defaultSchema)`, `await s2Environment('missing', missingSchema)`, `await s2Environment('denied', deniedSchema)`, `await s2Environment('secret', secretSchema)` | Pending; owner supplies each schema argument locally |
+| Network and expired-sign-in rejection shape | `await s2ReadFailure('network drop')`; restore network; expire sign-in using the host UI; `await s2ReadFailure('expired sign-in')` | Pending; unknown no-status errors remain local failures |
+| Explicit access denial | `await s2ReadFailure('403 denial')` using an owner-prepared denied identity | Pending |
+
+When executing a live gate, replace only that row's pending status with the observed pass/fail and actual versions; retain unsuccessful observations. Export `s2Evidence` only. A failed field/byte comparison or a host serialization shape other than documented base64 requires a targeted protocol correction before release; do not guess a decoder or disable the paging guard.
```

<!-- patch: docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md -->
```diff
@@
 | Expired sign-in | s2ReadFailure after host sign-in expiry | Not measured | Not run | Blocks401mapping acceptance |
+| Phase 5 action continuation | Manual `s2DownloadKnown`: owner-selected populated type 35, `filecontent_name`/FileAttachments, unbound initializer + sequential blocks, native local-file comparison | Not measured | Pending — no live action during planning | See `findings/logic/probe_findings.md`, 2026-11-01 continuation. Historical `$value` and no-status observations remain; action contract fixtures permit local implementation, not release acceptance. |
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm test -- tests/s2Probe.test.ts`

Expected: ten tests pass; no live API is contacted.

Run: `node --check scripts/s2-probe.js`

Expected: exit 0, no syntax diagnostic.

Live follow-up is the explicitly pending table above. Installation/fixture success does not close it, and no live command is part of this planning task.

- [ ] **Step 5: Commit the coherent change**

```bash
git add -- scripts/s2-probe.js tests/s2Probe.test.ts findings/logic/probe_findings.md docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md
git commit --only -m "test(pptb): add manual shape-only S2 download continuation" -- scripts/s2-probe.js tests/s2Probe.test.ts findings/logic/probe_findings.md docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md
```

---

### Task 3: Make host reads complete, cancellable, and byte-correct

**Owns:** P5.2; pinned host signatures; WR-003/004; sanitized failure provenance; retained page rows; the production download-action protocol.

**Files:**

- Modify: `src/services/pptb/host.types.ts:17` — error evidence and typed read contracts.
- Modify: `src/services/pptb/hostErrors.ts:47` — shared cancellation checks and confirmed network provenance.
- Modify: `src/services/pptb/dataverseRead.ts:22` — lossless paging, repeat-link detection, retry cancellation; remove obsolete `$value` file transport.
- Create: `src/services/pptb/dataverseFiles.ts` — validated initializer/block protocol and byte assembly.
- Modify: `src/services/pptb/pptbHost.ts:10` — inject only the raw documented action call; forward signals; reject unknown connection shapes.
- Modify: `src/services/pptb/fakeHost.ts:23` — model the new reference, provenance, partial rows, and cancellation.
- Modify: `src/services/pptb/dataverseRead.test.ts:8` — retire `$value` expectations and align loop protection.
- Modify: `src/services/pptb/pptbHost.test.ts:574` — replace obsolete transport assumptions and operation-name guard.
- Modify: `src/services/pptb/fakeHost.test.ts:230` — explicit logical-table descriptor in existing fixtures.
- Modify: `src/types/contracts.test.ts:101` — optional query signal only; preserve concurrent Starter edits.
- Create: `src/services/pptb/dataverseRead.phase5.test.ts` — partial rows, cancellation, and provenance regressions.
- Create: `src/services/pptb/dataverseFiles.test.ts` — execute the real adapter against action fixtures.
- Signal: the two new focused tests plus the existing host/contract suites.

- [ ] **Step 1: Establish the observable pre-change signal**

Create the new test files with the complete contents below.

<!-- file: src/services/pptb/dataverseRead.phase5.test.ts -->
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HostReadError } from './host.types';
import type { ODataQuery } from './host.types';
import { queryAllRows, withRetry, NEXT_LINK_UNVERIFIED } from './dataverseRead';
import { toHostReadError } from './hostErrors';
import { createFakeHost } from './fakeHost';

const Q: ODataQuery = { entitySet: 'powerpagecomponents', select: ['name'], filter: null, orderBy: 'name', pageSize: 2 };
const next = 'https://example.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=A%25B';
const noSleep = (): Promise<void> => Promise.resolve();
beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.restoreAllMocks(); });

describe('read provenance and partial evidence', () => {
  it('pins constructor defaults and preserves explicit provenance', () => {
    expect(new HostReadError('local', null)).toMatchObject({ transport: false, partialRows: [] });
    const original = new HostReadError('confirmed loss', null, true, [{ n: 1 }]);
    expect(toHostReadError('queryData', original)).toBe(original);
    expect(original).toMatchObject({ transport: true, partialRows: [{ n: 1 }] });
  });

  it('does not infer a disconnect from an unknown no-status error', () => {
    for (const raw of [new Error('network'), new TypeError('Failed to fetch'), { name: 'NetworkError' }, {}]) {
      expect(toHostReadError('queryData', raw)).toMatchObject({ status: null, transport: false });
    }
    expect(toHostReadError('queryData', new DOMException('private', 'NetworkError'))).toMatchObject({ status: null, transport: true });
    expect(toHostReadError('queryData', { status: 401 })).toMatchObject({ status: 401, transport: false });
  });

  it.each([401, 403, 503])('retains earlier rows after a later %s failure and retries only 503', async (status) => {
    const read = vi.fn<(path: string) => Promise<unknown>>()
      .mockResolvedValueOnce({ value: [1, 2], '@odata.nextLink': next })
      .mockRejectedValue({ status, message: 'PRIVATE-TOKEN' });
    const sleep = vi.fn(noSleep);
    await expect(queryAllRows(Q, { read, sleep })).rejects.toMatchObject({ status, partialRows: [1, 2], transport: false });
    expect(read.mock.calls.slice(1).every(([path]) => path === 'powerpagecomponents?$skiptoken=A%25B')).toBe(true);
    expect(read).toHaveBeenCalledTimes(status === 503 ? 5 : 2);
    expect(sleep.mock.calls).toEqual(status === 503 ? [[1000], [2000], [4000]] : []);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('PRIVATE-TOKEN');
  });

  it('retains the terminal full page before strict rejection', async () => {
    const read = vi.fn().mockResolvedValueOnce({ value: [1, 2], '@odata.nextLink': next })
      .mockResolvedValueOnce({ value: [3, 4] });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).rejects.toMatchObject({ partialRows: [1, 2, 3, 4], transport: false });
    expect(NEXT_LINK_UNVERIFIED).toBe(true);
  });

  it('retains received rows when a nextLink is malformed', async () => {
    const read = vi.fn().mockResolvedValueOnce({ value: [1], '@odata.nextLink': next })
      .mockResolvedValueOnce({ value: [2], '@odata.nextLink': 7 });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).rejects.toMatchObject({ partialRows: [1, 2], transport: false });
  });

  it('does not impose the previous 1000-page record cap on distinct continuation links', async () => {
    let page = 0;
    const read = vi.fn(() => {
      page += 1;
      return Promise.resolve({ value: [page], ...(page < 1001
        ? { '@odata.nextLink': `https://example.invalid/api/data/v9.2/powerpagecomponents?$skiptoken=${String(page)}` }
        : {}) });
    });
    await expect(queryAllRows(Q, { read, sleep: noSleep })).resolves.toHaveLength(1001);
    expect(read).toHaveBeenCalledTimes(1001);
  });

  it('prevents another page after cancellation and does not turn cancellation into a finding', async () => {
    const controller = new AbortController();
    const read = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ value: [1], '@odata.nextLink': next });
    });
    await expect(queryAllRows(Q, { read, sleep: noSleep }, true, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('checks cancellation before dispatch and after retry waits', async () => {
    const before = new AbortController();
    before.abort();
    const op = vi.fn<() => Promise<string>>().mockRejectedValue({ status: 503 });
    await expect(withRetry('test', op, noSleep, before.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(op).not.toHaveBeenCalled();
    const during = new AbortController();
    const sleep = vi.fn(() => { during.abort(); return Promise.resolve(); });
    await expect(withRetry('test', op, sleep, during.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(op).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledExactlyOnceWith(1000);
  });

  it('models partial rows and confirmed loss in the fake, and records no pre-aborted call', async () => {
    const fake = createFakeHost({ failures: [{ operation: 'query', entitySet: Q.entitySet, status: null, transport: true, partialRows: [1] }] });
    await expect(fake.queryAll(Q)).rejects.toMatchObject({ transport: true, partialRows: [1] });
    fake.clearCalls();
    const controller = new AbortController();
    controller.abort();
    await expect(fake.queryAll(Q, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fake.calls).toEqual([]);
  });
});
```

<!-- file: src/services/pptb/dataverseFiles.test.ts -->
```typescript
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createPptbHost } from './pptbHost';
import type { FileColumnRef, PptbHost } from './host.types';

const REF: FileColumnRef = { entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid',
  recordId: '00000000-0000-0000-0000-000000000001', fileAttributeName: 'filecontent' };
const BLOCK = 4 * 1024 * 1024;
const code = 'function get() { return "雪😀"; }';
const encode = (text: string) => new TextEncoder().encode(text);

function harness(bytes = encode(code), chunked = true) {
  const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
  const queryData = vi.fn().mockResolvedValue({ value: [] });
  const initial = { FileContinuationToken: 'PRIVATE-TOKEN', FileSizeInBytes: bytes.length, FileName: 'private.sl', IsChunkingSupported: chunked };
  const response = (request: DataverseAPI.ExecuteRequest): Promise<unknown> => {
    if (request.operationName === 'InitializeFileBlocksDownload') return Promise.resolve(initial);
    const offset = request.parameters?.Offset;
    const length = request.parameters?.BlockLength;
    if (typeof offset !== 'number' || typeof length !== 'number') throw new Error('Invalid fixture block request');
    return Promise.resolve({ Data: Buffer.from(bytes.subarray(offset, offset + length)).toString('base64') });
  };
  const execute = vi.fn(response);
  Object.defineProperty(window, 'dataverseAPI', { configurable: true, value: { queryData, execute } });
  return { host: createPptbHost({ sleep }), execute, queryData, sleep, initial, response };
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => {
  Reflect.deleteProperty(window, 'dataverseAPI');
  Reflect.deleteProperty(window, 'toolboxAPI');
  vi.restoreAllMocks();
});

describe('file action protocol through createPptbHost', () => {
  it('accepts only explicit null as a disconnect and rejects failed or undefined refreshes', async () => {
    const getActiveConnection = vi.fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('refresh failed')).mockResolvedValueOnce(undefined).mockResolvedValue(null);
    Object.defineProperty(window, 'toolboxAPI', { configurable: true, value: { connections: { getActiveConnection } } });
    const h = harness();
    await expect(h.host.getActiveConnection()).rejects.toMatchObject({ name: 'HostCallError' });
    await expect(h.host.getActiveConnection()).rejects.toMatchObject({ name: 'HostCallError' });
    await expect(h.host.getActiveConnection()).resolves.toBeNull();
  });

  it('pins the public descriptor, optional signal and unbound initializer target', async () => {
    expectTypeOf<PptbHost['downloadFileColumn']>().parameters.toEqualTypeOf<[FileColumnRef, (AbortSignal | undefined)?]>();
    const h = harness();
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe(code);
    expect(h.queryData).not.toHaveBeenCalled();
    expect(h.execute.mock.calls[0]?.[0]).toEqual({ operationName: 'InitializeFileBlocksDownload', operationType: 'action',
      parameters: { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.powerpagecomponent', powerpagecomponentid: REF.recordId }, FileAttributeName: 'filecontent' } });
    expect(h.execute.mock.calls[1]?.[0]).toEqual({ operationName: 'DownloadBlock', operationType: 'action',
      parameters: { FileContinuationToken: 'PRIVATE-TOKEN', Offset: 0, BlockLength: encode(code).length } });
  });

  it('assembles sequential blocks before UTF-8 decoding, including a split code point and BOM', async () => {
    const bytes = new Uint8Array(BLOCK + 4).fill(97);
    bytes.set([239, 187, 191], 0);
    bytes.set(encode('€'), BLOCK - 1);
    const h = harness(bytes);
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe(new TextDecoder().decode(bytes));
    expect(h.execute.mock.calls.slice(1).map(([request]) => request.parameters)).toEqual([
      { FileContinuationToken: 'PRIVATE-TOKEN', Offset: 0, BlockLength: BLOCK },
      { FileContinuationToken: 'PRIVATE-TOKEN', Offset: BLOCK, BlockLength: 4 },
    ]);
  });

  it('requests the entire file once when chunking is not supported', async () => {
    const bytes = new Uint8Array(BLOCK + 1).fill(97);
    const h = harness(bytes, false);
    await expect(h.host.downloadFileColumn(REF)).resolves.toHaveLength(bytes.length);
    expect(h.execute).toHaveBeenCalledTimes(2);
    expect(h.execute.mock.calls[1]?.[0].parameters).toMatchObject({ Offset: 0, BlockLength: bytes.length });
  });

  it('accepts a successful empty file without requesting a zero-length block', async () => {
    const h = harness(new Uint8Array());
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe('');
    expect(h.execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    { FileContinuationToken: '' }, { FileSizeInBytes: -1 }, { FileSizeInBytes: 0.5 },
    { FileSizeInBytes: Number.MAX_SAFE_INTEGER + 1 }, { FileName: null }, { IsChunkingSupported: 'true' },
  ])('rejects malformed initialization %j locally', async (change) => {
    const h = harness();
    h.execute.mockResolvedValueOnce({ ...h.initial, ...change });
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ name: 'HostReadError', status: null, transport: false });
    expect(h.execute).toHaveBeenCalledTimes(1);
  });

  it.each([{}, { Data: [1] }, { Data: '!!!!' }, { Data: 'YQ=' }, { Data: 'YQ==' }])('rejects invalid Data/length %j without retry', async (bad) => {
    const h = harness();
    h.execute.mockResolvedValueOnce(h.initial).mockResolvedValueOnce(bad);
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ status: null, transport: false });
    expect(h.sleep).not.toHaveBeenCalled();
  });

  it('rejects malformed UTF-8 even when the byte count matches', async () => {
    const h = harness(new Uint8Array([195, 40]));
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ status: null, transport: false });
  });

  it.each([401, 403, 404])('preserves %s and does not retry denied/missing/auth failures', async (status) => {
    const h = harness();
    h.execute.mockRejectedValue({ status, message: 'PRIVATE-TOKEN' });
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ status });
    expect(h.execute).toHaveBeenCalledTimes(1);
    expect(h.sleep).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('PRIVATE-TOKEN');
  });

  it('retries initialization and retries a failed block at the same offset without duplicating bytes', async () => {
    const bytes = new Uint8Array(BLOCK + 1).fill(97);
    const h = harness(bytes);
    let failedBlock = false;
    h.execute.mockRejectedValueOnce({ status: 429 }).mockImplementation((request) => {
      if (request.operationName === 'DownloadBlock' && request.parameters?.Offset === BLOCK && !failedBlock) {
        failedBlock = true;
        return Promise.reject({ status: 503 });
      }
      return h.response(request);
    });
    await expect(h.host.downloadFileColumn(REF)).resolves.toBe('a'.repeat(bytes.length));
    expect(h.sleep.mock.calls).toEqual([[1000], [1000]]);
    expect(h.execute.mock.calls.filter(([r]) => r.operationName === 'DownloadBlock').map(([r]) => r.parameters?.Offset)).toEqual([0, BLOCK, BLOCK]);
  });

  it('exhausts 503 retries using exactly 1s/2s/4s', async () => {
    const h = harness();
    h.execute.mockRejectedValue({ status: 503 });
    await expect(h.host.downloadFileColumn(REF)).rejects.toMatchObject({ status: 503, transport: false });
    expect(h.execute).toHaveBeenCalledTimes(4);
    expect(h.sleep.mock.calls).toEqual([[1000], [2000], [4000]]);
  });

  it('does not dispatch a pre-aborted operation or another block after cancellation', async () => {
    const h = harness(new Uint8Array(BLOCK + 1).fill(97));
    const before = new AbortController();
    before.abort();
    await expect(h.host.downloadFileColumn(REF, before.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.execute).not.toHaveBeenCalled();
    const during = new AbortController();
    h.execute.mockImplementation((request) => {
      if (request.operationName === 'DownloadBlock') during.abort();
      return h.response(request);
    });
    await expect(h.host.downloadFileColumn(REF, during.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.execute).toHaveBeenCalledTimes(2);
  });

  it('waits for an already-dispatched host promise to settle before rejecting cancellation', async () => {
    const h = harness();
    const controller = new AbortController();
    let resolve!: (value: unknown) => void;
    h.execute.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    let settled = false;
    const observed = h.host.downloadFileColumn(REF, controller.signal).then(
      (value) => { settled = true; return value; },
      (error: unknown) => { settled = true; return error; },
    );
    controller.abort();
    await Promise.resolve();
    expect(settled).toBe(false);
    resolve(h.initial);
    expect(await observed).toMatchObject({ name: 'AbortError' });
    expect(h.execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    { entityLogicalName: 'powerpagecomponents/x' }, { primaryIdAttribute: 'id,secret' },
    { recordId: '1) or (1' }, { fileAttributeName: 'file/content' },
  ])('rejects unsafe references %j before dispatch', async (change) => {
    const h = harness();
    await expect(h.host.downloadFileColumn({ ...REF, ...change })).rejects.toMatchObject({ status: null });
    expect(h.execute).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npm test -- src/services/pptb/dataverseRead.phase5.test.ts src/services/pptb/dataverseFiles.test.ts`

Expected: nonzero. The current constructor drops provenance/partial rows, cancellation is ignored, and `downloadFileColumn(ref)` cannot issue download actions. Tests import existing runtime modules, so these are runnable failing assertions before the new protocol file exists.

Run: `npm test -- src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts src/types/contracts.test.ts`

Expected: existing tests pass before implementation; preserve this exact regression command for Step 4.

- [ ] **Step 3: Implement the minimum fix**

Retain the complete test files created in Step 1.

<!-- patch: src/services/pptb/host.types.ts -->
```diff
@@
     readonly status: number | null,
+    readonly transport = false,
+    readonly partialRows: readonly unknown[] = [],
@@
-export type PptbHost = {
+export type FileColumnRef = {
+  entityLogicalName: string;
+  primaryIdAttribute: string;
+  recordId: string;
+  fileAttributeName: string;
+};
+export type PptbHost = {
@@
-  queryAll(q: ODataQuery): Promise<readonly unknown[]>; // all pages; 429/5xx retried 1s/2s/4s; throws HostReadError
-  downloadFileColumn(entitySet: string, id: string, column: string): Promise<string>;
+  queryAll(q: ODataQuery, signal?: AbortSignal): Promise<readonly unknown[]>;
+  downloadFileColumn(ref: FileColumnRef, signal?: AbortSignal): Promise<string>;
```

<!-- patch: src/services/pptb/hostErrors.ts -->
```diff
@@
 /** Maps anything a host read can throw to a HostReadError with a plain-language message and the status. */
 export function toHostReadError(label: string, error: unknown): HostReadError {
   if (error instanceof HostReadError) return error;
   logHostFailure(label, error);
   const status = statusOf(error);
-  return new HostReadError(messageForStatus(status), status);
+  // Only the platform's explicit network exception is established here. Host-specific
+  // Error/TypeError messages and no-status objects require S2 evidence before mapping.
+  const transport = error instanceof DOMException && error.name === 'NetworkError';
+  return new HostReadError(messageForStatus(status), status, transport);
 }
+
+export function throwIfAborted(signal?: AbortSignal): void {
+  if (signal?.aborted === true) throw new DOMException('Scan cancelled.', 'AbortError');
+}
+
+export function isAbortError(error: unknown): boolean {
+  return isRecord(error) && error.name === 'AbortError';
+}
```

<!-- patch: src/services/pptb/dataverseRead.ts -->
```diff
@@
-import { isRecord, isRetryable, toHostReadError } from './hostErrors';
+import { isAbortError, isRecord, isRetryable, throwIfAborted, toHostReadError } from './hostErrors';
@@
-const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
@@
-const MAX_PAGES = 1000;
@@
   if (typeof link === 'string') return { rows: raw.value, nextLink: link === '' ? null : link };
   if (link === undefined || link === null) return { rows: raw.value, nextLink: null };
-  throw badShape();
+  throw new HostReadError('Unexpected paging link from Dataverse.', null, false, raw.value);
@@
-export async function withRetry<T>(label: string, op: () => Promise<T>, sleep: Sleep): Promise<T> {
+export async function withRetry<T>(
+  label: string,
+  op: () => Promise<T>,
+  sleep: Sleep,
+  signal?: AbortSignal,
+): Promise<T> {
   for (let attempt = 0; ; attempt += 1) {
+    throwIfAborted(signal);
     try {
-      return await op();
+      const value = await op();
+      throwIfAborted(signal);
+      return value;
     } catch (error) {
+      throwIfAborted(signal);
+      if (isAbortError(error)) throw error;
       const failure = toHostReadError(label, error);
       const delay = RETRY_DELAYS_MS[attempt];
       if (delay === undefined || !isRetryable(failure.status)) throw failure;
       await sleep(delay);
+      throwIfAborted(signal);
@@
 export async function fetchAllPages(
   readPage: (path: string) => Promise<Page>,
   q: ODataQuery,
   strict: boolean,
+  signal?: AbortSignal,
 ): Promise<readonly unknown[]> {
   const rows: unknown[] = [];
   let path: string | null = buildQueryPath(q);
-  for (let pages = 0; path !== null; pages += 1) {
-    if (pages >= MAX_PAGES) throw new HostReadError('Dataverse returned too many pages.', null);
-    const page = await readPage(path);
-    for (const row of page.rows) rows.push(row);
-    if (page.nextLink !== null) {
-      path = relativeNextLink(page.nextLink, q.entitySet);
-    } else if (strict && page.rows.length >= q.pageSize) {
-      throw new HostReadError(
-        'Dataverse returned a full page with no paging link, so the result may be incomplete.',
-        null,
-      );
-    } else {
-      path = null;
+  const seen = new Set<string>();
+  try {
+    while (path !== null) {
+      throwIfAborted(signal);
+      if (seen.has(path)) throw new HostReadError('Dataverse repeated a paging link.', null);
+      seen.add(path);
+      const page = await readPage(path);
+      throwIfAborted(signal);
+      for (const row of page.rows) rows.push(row);
+      if (page.nextLink !== null) {
+        path = relativeNextLink(page.nextLink, q.entitySet);
+      } else if (strict && page.rows.length >= q.pageSize) {
+        throw new HostReadError(
+          'Dataverse returned a full page with no paging link, so the result may be incomplete.',
+          null,
+        );
+      } else {
+        path = null;
+      }
     }
+  } catch (error) {
+    throwIfAborted(signal);
+    if (isAbortError(error)) throw error;
+    const failure = toHostReadError('queryData', error);
+    throw new HostReadError(failure.message, failure.status, failure.transport, [
+      ...rows, ...failure.partialRows,
+    ]);
   }
   return rows;
 }
@@
   deps: ReadDeps,
   strict: boolean = NEXT_LINK_UNVERIFIED,
+  signal?: AbortSignal,
@@
-      withRetry('queryData', async () => parsePage(await deps.read(path, headers)), deps.sleep),
+      withRetry('queryData', async () => parsePage(await deps.read(path, headers)), deps.sleep, signal),
     q,
     strict,
+    signal,
   );
 }
-
-/**
- * Reads a File column's content with `queryData('<set>(<id>)/<column>/$value')`. PPTB documents no file-download
- * call, so this is the generic call; Spike S2 confirms it, and what shape the content comes back in.
- */
-export async function downloadColumnContent(
-  entitySet: string,
-  id: string,
-  column: string,
-  deps: ReadDeps,
-): Promise<string> {
-  if (!NAME.test(entitySet) || !GUID.test(id) || !NAME.test(column))
-    throw invalid('file column reference');
-  const path = `${entitySet}(${id})/${column}/$value`;
-  const raw = await withRetry('queryData', () => deps.read(path, {}), deps.sleep);
-  if (typeof raw === 'string') return raw;
-  if (isRecord(raw) && typeof raw.value === 'string') return raw.value;
-  throw new HostReadError('Unexpected file response from Dataverse.', null);
-}
```

<!-- file: src/services/pptb/dataverseFiles.ts -->
```typescript
import { HostReadError } from './host.types';
import type { FileColumnRef } from './host.types';
import { isRecord, throwIfAborted } from './hostErrors';
import { withRetry } from './dataverseRead';
import type { Sleep } from './dataverseRead';

export type FileAction = {
  operationName: 'InitializeFileBlocksDownload' | 'DownloadBlock';
  operationType: 'action';
  parameters: Record<string, unknown>;
};
export type FileDeps = { execute: (request: FileAction) => Promise<unknown>; sleep: Sleep };
const BLOCK_BYTES = 4 * 1024 * 1024;
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function invalidFile(): HostReadError {
  return new HostReadError('Unexpected file response from Dataverse.', null);
}

function blockBytes(raw: unknown, expected: number): Uint8Array {
  if (!isRecord(raw) || typeof raw.Data !== 'string' || raw.Data.length % 4 !== 0 ||
      /[^A-Za-z0-9+/=]/u.test(raw.Data)) throw invalidFile();
  try {
    const binary = atob(raw.Data);
    if (binary.length !== expected || btoa(binary) !== raw.Data) throw invalidFile();
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw invalidFile();
  }
}

export async function downloadColumnContent(
  ref: FileColumnRef,
  deps: FileDeps,
  signal?: AbortSignal,
): Promise<string> {
  throwIfAborted(signal);
  if (![ref.entityLogicalName, ref.primaryIdAttribute, ref.fileAttributeName].every((name) => NAME.test(name)) ||
      !GUID.test(ref.recordId)) throw new HostReadError('Invalid file column reference.', null);
  const initial = await withRetry('InitializeFileBlocksDownload', () => deps.execute({
    operationName: 'InitializeFileBlocksDownload',
    operationType: 'action',
    parameters: {
      Target: {
        '@odata.type': `Microsoft.Dynamics.CRM.${ref.entityLogicalName}`,
        [ref.primaryIdAttribute]: ref.recordId,
      },
      FileAttributeName: ref.fileAttributeName,
    },
  }), deps.sleep, signal);
  if (!isRecord(initial) || typeof initial.FileContinuationToken !== 'string' ||
      initial.FileContinuationToken === '' || typeof initial.FileSizeInBytes !== 'number' ||
      !Number.isSafeInteger(initial.FileSizeInBytes) || initial.FileSizeInBytes < 0 ||
      typeof initial.FileName !== 'string' || initial.FileName === '' ||
      typeof initial.IsChunkingSupported !== 'boolean') throw invalidFile();
  const size = initial.FileSizeInBytes;
  const token = initial.FileContinuationToken;
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(size);
  } catch {
    throw invalidFile();
  }
  for (let offset = 0; offset < size;) {
    throwIfAborted(signal);
    const length = initial.IsChunkingSupported ? Math.min(BLOCK_BYTES, size - offset) : size;
    const block = await withRetry('DownloadBlock', () => deps.execute({
      operationName: 'DownloadBlock',
      operationType: 'action',
      parameters: { FileContinuationToken: token, Offset: offset, BlockLength: length },
    }), deps.sleep, signal);
    bytes.set(blockBytes(block, length), offset);
    offset += length;
  }
  throwIfAborted(signal);
  try {
    // Decode once after assembly: a code point may cross a block boundary.
    // Preserve BOM in the decoder, then deliberately strip exactly one leading UTF-8 BOM.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes).replace(/^\uFEFF/u, '');
  } catch {
    throw invalidFile();
  }
}
```

<!-- patch: src/services/pptb/pptbHost.ts -->
```diff
@@
-import { downloadColumnContent, queryAllRows } from './dataverseRead';
+import { queryAllRows } from './dataverseRead';
+import { downloadColumnContent } from './dataverseFiles';
+import type { FileDeps } from './dataverseFiles';
@@
- * The only module that touches `window.toolboxAPI` and `window.dataverseAPI`. Dataverse is read-only:
- * `queryData` is the only data call. Every host response is `unknown` until a guard narrows it.
+ * The only production module that touches the host globals. Reads use queryData;
+ * file retrieval uses the two typed unbound download actions. Responses are validated as unknown.
@@
     sleep: options.sleep ?? defaultSleep,
   };
+  const files: FileDeps = {
+    execute: (request) => window.dataverseAPI.execute(request satisfies DataverseAPI.ExecuteRequest),
+    sleep: deps.sleep,
+  };
@@
-      if (raw === null || raw === undefined) return null;
+      if (raw === null) return null;
@@
-    queryAll: (q) => queryAllRows(q, deps),
+    queryAll: (q, signal) => queryAllRows(q, deps, undefined, signal),
 
-    downloadFileColumn: (entitySet, id, column) =>
-      downloadColumnContent(entitySet, id, column, deps),
+    downloadFileColumn: (ref, signal) => downloadColumnContent(ref, files, signal),
```

<!-- patch: src/services/pptb/fakeHost.ts -->
```diff
@@
-import { HostCallError, messageForStatus } from './hostErrors';
+import { HostCallError, messageForStatus, throwIfAborted } from './hostErrors';
+import type { FileColumnRef } from './host.types';
@@
   status: number | null;
+  transport?: boolean;
+  partialRows?: readonly unknown[];
@@
-  /** File column text, keyed `<entitySet>/<id>/<column>`. A missing key fails with a 404. */
+  /** File text keyed `<entityLogicalName>/<recordId>/<fileAttributeName>`. Missing keys fail with 404. */
@@
-  | { method: 'downloadFileColumn'; entitySet: string; id: string; column: string };
+  | { method: 'downloadFileColumn'; ref: FileColumnRef };
@@
-      return new HostReadError(messageForStatus(failure.status), failure.status);
+      return new HostReadError(messageForStatus(failure.status), failure.status,
+        failure.transport ?? false, failure.partialRows ?? []);
@@
-    queryAll: (query) => {
+    queryAll: async (query, signal) => {
+      throwIfAborted(signal);
@@
-      if (failure !== null) return Promise.reject(failure);
       let result: FakeResult | undefined;
+      if (failure !== null) throw failure;
@@
-      if (result === undefined) return Promise.reject(notFound(`result for ${query.entitySet}`));
+      if (result === undefined) throw notFound(`result for ${query.entitySet}`);
@@
-      return Promise.resolve(pages.flat());
+      await Promise.resolve();
+      throwIfAborted(signal);
+      return pages.flat();
@@
-    downloadFileColumn: (entitySet, id, column) => {
-      calls.push({ method: 'downloadFileColumn', entitySet, id, column });
-      const failure = scriptedFailure('file', entitySet, id);
-      if (failure !== null) return Promise.reject(failure);
-      const text = init.fileColumns?.[`${entitySet}/${id}/${column}`];
-      return text === undefined
-        ? Promise.reject(notFound(`file column ${entitySet}/${id}/${column}`))
-        : Promise.resolve(text);
+    downloadFileColumn: async (ref, signal) => {
+      throwIfAborted(signal);
+      calls.push({ method: 'downloadFileColumn', ref });
+      // FakeFailure.entitySet is the logical table name for a file operation.
+      const failure = scriptedFailure('file', ref.entityLogicalName, ref.recordId);
+      if (failure !== null) throw failure;
+      const key = `${ref.entityLogicalName}/${ref.recordId}/${ref.fileAttributeName}`;
+      const text = init.fileColumns?.[key];
+      if (text === undefined) throw notFound('file column');
+      await Promise.resolve();
+      throwIfAborted(signal);
+      return text;
```

<!-- patch: src/types/contracts.test.ts -->
```diff
@@
-    expectTypeOf<PptbHost['queryAll']>().parameters.toEqualTypeOf<[ODataQuery]>();
+    expectTypeOf<PptbHost['queryAll']>().parameters.toEqualTypeOf<[ODataQuery, (AbortSignal | undefined)?]>();
```





Retire only the superseded `$value` assertions; the new adapter suite above owns their replacement.

<!-- patch: src/services/pptb/dataverseRead.test.ts -->
```diff
@@
-  downloadColumnContent,
@@
-const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';
@@
-  it('stops a link loop after 1000 pages', async () => {
+  it('stops a repeated paging link', async () => {
@@
-      /too many pages/,
+      /repeated a paging link/,
@@
-describe('downloadColumnContent', () => {
-  it('reads <set>(<id>)/<column>/$value and returns text', async () => {
-    const read = vi.fn<RawRead>().mockResolvedValue('export function get() {}');
-    const text = await downloadColumnContent('powerpagecomponents', GUID, 'filecontent', {
-      read,
-      sleep: noSleep,
-    });
-    expect(text).toBe('export function get() {}');
-    expect(read).toHaveBeenCalledWith(`powerpagecomponents(${GUID})/filecontent/$value`, {});
-  });
-
-  // Spike S2, 2026-10-22: PPTB's JSON-only queryData answers the binary $value body with an empty
-  // object. That is a per-file read failure, not a transport loss and not a retry.
-  it('rejects the empty-object shape once, with no status and no retry', async () => {
-    const read = vi.fn<RawRead>().mockResolvedValue({});
-    const sleep = vi.fn<Sleep>().mockResolvedValue(undefined);
-    await expect(
-      downloadColumnContent('powerpagecomponents', GUID, 'filecontent', { read, sleep }),
-    ).rejects.toMatchObject({
-      name: 'HostReadError',
-      status: null,
-      message: 'Unexpected file response from Dataverse.',
-    });
-    expect(read).toHaveBeenCalledTimes(1);
-    expect(sleep).not.toHaveBeenCalled();
-  });
-});
```

<!-- patch: src/services/pptb/pptbHost.test.ts -->
```diff
@@
   const queryData = vi
     .fn<(query: string, target?: unknown, headers?: unknown) => Promise<unknown>>()
     .mockResolvedValue({ value: [] });
+  const execute = vi.fn<(request: DataverseAPI.ExecuteRequest) => Promise<unknown>>().mockImplementation((request) =>
+    Promise.resolve(request.operationName === 'InitializeFileBlocksDownload'
+      ? { FileContinuationToken: 'token', FileSizeInBytes: 1, FileName: 'a.sl', IsChunkingSupported: true }
+      : { Data: 'YQ==' }));
@@
-    dataverse: { queryData },
+    dataverse: { queryData, execute },
@@
     stubs.getActiveConnection.mockResolvedValue(undefined);
-    await expect(host.getActiveConnection()).resolves.toBeNull();
+    await expect(host.getActiveConnection()).rejects.toBeInstanceOf(HostCallError);
@@
-describe('downloadFileColumn', () => {
-  const path = `powerpagecomponents(${GUID})/filecontent/$value`;
-
-  it('reads the file column through queryData and returns the text', async () => {
-    stubs.queryData.mockResolvedValue('export function get() {}');
-    await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe(
-      'export function get() {}',
-    );
-    expect(stubs.queryData).toHaveBeenCalledWith(path, undefined, {});
-  });
-
-  it('accepts text wrapped in a value member', async () => {
-    stubs.queryData.mockResolvedValue({ value: 'export function get() {}' });
-    await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe(
-      'export function get() {}',
-    );
-  });
-
-  it('retries a 503 on the same schedule as queryAll', async () => {
-    stubs.queryData
-      .mockRejectedValueOnce({ status: 503 })
-      .mockRejectedValueOnce({ status: 503 })
-      .mockResolvedValueOnce('code');
-    await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe(
-      'code',
-    );
-    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
-  });
-
-  it.each([
-    ['an object without a string value', { value: [1, 2] }],
-    ['null', null],
-    ['a number', 7],
-  ])('rejects %s', async (_label, response) => {
-    stubs.queryData.mockResolvedValue(response);
-    await expect(
-      host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent'),
-    ).rejects.toMatchObject({
-      name: 'HostReadError',
-      status: null,
-    });
-  });
-
-  it.each([
-    ['an id that is not a GUID', 'powerpagecomponents', '1) or (1', 'filecontent'],
-    ['an entity set with a slash', 'powerpagecomponents/x', GUID, 'filecontent'],
-    ['a column with a slash', 'powerpagecomponents', GUID, 'file/content'],
-  ])('refuses %s without calling the host', async (_label, set, id, column) => {
-    await expect(host.downloadFileColumn(set, id, column)).rejects.toBeInstanceOf(HostReadError);
-    expect(stubs.queryData).not.toHaveBeenCalled();
-  });
-});
-
-describe('read-only guarantee', () => {
-  // Every member the adapter may touch. Reaching for anything else (create, update, delete, execute,
-  // associate, *Multiple, publishCustomizations, deploySolution, Post, Put, Patch, ...) is recorded and throws.
+describe('feature-owned host operation boundary', () => {
+  // API member access remains bounded; execute payloads are checked separately below.
@@
     'dataverseAPI.queryData',
+    'dataverseAPI.execute',
@@
-  it('touches only read members across every PptbHost method', async () => {
+  it('touches only feature-owned members and the two download actions', async () => {
@@
-    stubs.queryData
-      .mockResolvedValueOnce({ value: [1] })
-      .mockResolvedValueOnce('export function get() {}');
+    stubs.queryData.mockResolvedValueOnce({ value: [1] });
@@
-    await host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent');
+    await host.downloadFileColumn({ entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: GUID, fileAttributeName: 'filecontent' });
+    expect(stubs.dataverse.execute.mock.calls.map(([request]) => request.operationName)).toEqual([
+      'InitializeFileBlocksDownload', 'DownloadBlock',
+    ]);
+    expect(stubs.dataverse.execute.mock.calls.every(([request]) =>
+      request.operationType === 'action' && !('entityName' in request) && !('entityId' in request))).toBe(true);
@@
-      void Reflect.get(guard, 'execute');
+      void Reflect.get(guard, 'update');
@@
-    expect(violations).toEqual(['dataverseAPI.create', 'dataverseAPI.execute']);
+    expect(violations).toEqual(['dataverseAPI.create', 'dataverseAPI.update']);
```

<!-- patch: src/services/pptb/fakeHost.test.ts -->
```diff
@@
 const GUID = '0f8fad5b-d9cb-469f-a165-70867728950e';
+const REF = { entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: GUID, fileAttributeName: 'filecontent' };
@@
-  it('returns canned text by <entitySet>/<id>/<column>', async () => {
+  it('returns canned text by <logical-table>/<id>/<column>', async () => {
@@
-      fileColumns: { [`powerpagecomponents/${GUID}/filecontent`]: 'export function get() {}' },
+      fileColumns: { [`powerpagecomponent/${GUID}/filecontent`]: 'export function get() {}' },
@@
-    await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe(
+    await expect(host.downloadFileColumn(REF)).resolves.toBe(
       'export function get() {}',
@@
-        entitySet: 'powerpagecomponents',
-        id: GUID,
-        column: 'filecontent',
+        ref: REF,
@@
-      host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent'),
+      host.downloadFileColumn(REF),
@@
-        [`powerpagecomponents/${GUID}/filecontent`]: 'a',
-        [`powerpagecomponents/${other}/filecontent`]: 'b',
+        [`powerpagecomponent/${GUID}/filecontent`]: 'a',
+        [`powerpagecomponent/${other}/filecontent`]: 'b',
@@
-        { operation: 'file', entitySet: 'powerpagecomponents', status: 500, contains: other },
+        { operation: 'file', entitySet: 'powerpagecomponent', status: 500, contains: other },
@@
-    await expect(host.downloadFileColumn('powerpagecomponents', GUID, 'filecontent')).resolves.toBe(
+    await expect(host.downloadFileColumn(REF)).resolves.toBe(
       'a',
@@
-      host.downloadFileColumn('powerpagecomponents', other, 'filecontent'),
+      host.downloadFileColumn({ ...REF, recordId: other }),
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm test -- src/services/pptb/dataverseRead.phase5.test.ts src/services/pptb/dataverseFiles.test.ts`

Expected: both new suites pass; full terminal-page evidence is retained; Unicode/BOM survives byte assembly; cancellation is `AbortError`; no generic no-status disconnect inference appears.

Run: `npm test -- src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts src/types/contracts.test.ts`

Expected: all existing suites pass with only the specified retired/updated assumptions.

Integration checks remain the integration owner's current `npm run typecheck`/`npm run lint`/build gates. Use the execution checkpoint's actual results rather than carrying earlier unrelated failures forward.

- [ ] **Step 5: Commit the coherent change**

Reconcile the shared `src/types/contracts.test.ts` hunk under the root plan's committed-baseline precondition before executing this task.

```bash
git add -- src/services/pptb/host.types.ts src/services/pptb/hostErrors.ts src/services/pptb/dataverseRead.ts src/services/pptb/dataverseFiles.ts src/services/pptb/pptbHost.ts src/services/pptb/fakeHost.ts src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts src/services/pptb/dataverseRead.phase5.test.ts src/services/pptb/dataverseFiles.test.ts src/types/contracts.test.ts
git commit --only -m "feat(pptb): download file blocks and retain cancellable read evidence" -- src/services/pptb/host.types.ts src/services/pptb/hostErrors.ts src/services/pptb/dataverseRead.ts src/services/pptb/dataverseFiles.ts src/services/pptb/pptbHost.ts src/services/pptb/fakeHost.ts src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts src/services/pptb/dataverseRead.phase5.test.ts src/services/pptb/dataverseFiles.test.ts src/types/contracts.test.ts
```

---

### Task 5: Read actual enhanced-model site facts and retain partial work

**Owns:** P5.4; FR-7 query/parse/download flow; bounded scheduling; environment-variable cause retention; the pending final-confirmation contract.

**Files:**

- Create: `src/features/inspector/scan/queries.ts` — explicit selects, deterministic ordering, scope filters, and the one string-literal encoder.
- Create: `src/features/inspector/scan/parseRows.ts` — unknown-row/content boundary and S1 link shapes.
- Modify: `src/features/inspector/scan/scan.ts:1` — actual reader, environment resolution, draining four-worker loop, and identity confirmation.
- Modify: `src/types/inspector.ts:26` — optional environment failure cause only.
- Modify: `src/skeleton.test.ts:131` — updated optional scan/list parameters.
- Create: `src/features/inspector/scan/scan.test.ts` — reader integration, malformed data, partial evidence, scheduling, cancellation, and confirmation retry.
- Signal: reader integration plus existing host/model/skeleton regressions.

**Evidence boundary:** Only inventory consumes `HostReadError.partialRows`. It keeps every individually valid type-35 record, even when a later page or the strict terminal-page check fails. Partially read role/permission/setting **sets** remain `Readable { ok: false, reason: 'read-failed' }`; they do not expose partial configuration arrays to the model or establish defaults. Successfully completed *other* dependencies and successfully parsed per-file role links remain available. Task 4's evidence rules retain adverse reasons from that available evidence. This fragment does not claim partial configuration-set values are retained by the current `Readable` contract.

**Settings boundary:** Secret/missing/denied/read-failed/invalid environment failures have explicit causes. Unstarted resolution is `kind: 'not-scanned'`. A successful current/default string is `kind: 'value', fromEnvVar: true`; empty strings are still values. An absent setting is established only by a successful complete settings query. Malformed relevant direct settings fail that configuration set rather than becoming defaults. Inactive/irrelevant content is not a required dependency.

- [ ] **Step 1: Establish the observable pre-change signal**

Create the new test file with the complete contents below.

<!-- file: src/features/inspector/scan/scan.test.ts -->
```typescript
// @vitest-environment jsdom
import { Buffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeHost } from '@/services/pptb/fakeHost';
import { createPptbHost } from '@/services/pptb/pptbHost';
import type { FakeFailure } from '@/services/pptb/fakeHost';
import { HostReadError } from '@/services/pptb/host.types';
import type { Connection, FileColumnRef } from '@/services/pptb/host.types';
import { HostCallError } from '@/services/pptb/hostErrors';
import type { SettingValue, SiteFacts, SiteRef } from '@/types/inspector';
import { evaluateSite } from '../model/rules';
import * as scan from './scan';

const id = (n: number): string => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const CONNECTION: Connection = { id: 'slot-identity', name: 'Fixture', url: 'https://fixture.invalid', environment: 'Dev' };
const SITE: SiteRef = { id: id(1), name: 'A site', domain: 'site.invalid', active: true };
const ANON = id(2);
const AUTH = id(3);
const MEMBER = id(4);
const CODE = 'function get() { return Server.Connector.Dataverse; }';
const PERMISSION = { entitylogicalname: 'account', scope: 756150000, read: true,
  write: false, create: false, delete: false, append: false, appendto: false };

function component(kind: number, number: number, name: string, content: unknown, statecode = 0): Record<string, unknown> {
  return { powerpagecomponentid: id(number), name, statecode, powerpagecomponenttype: kind,
    _powerpagesiteid_value: SITE.id, content: JSON.stringify(content) };
}

function dataSet(count = 2) {
  return {
    sites: [{ powerpagesiteid: SITE.id, name: SITE.name, primarydomainname: SITE.domain, statecode: 0 },
      { powerpagesiteid: id(9), name: 'Z inactive', primarydomainname: null, statecode: 1 }] as unknown[],
    files: Array.from({ length: count }, (_, i) => component(35, 100 + i, `handler-${String(i).padStart(3, '0')}`,
      { adx_serverlogic_adx_webrole: [MEMBER] }, i === 1 ? 1 : 0)) as unknown[],
    roles: [component(11, 2, 'Renamed visitor role', { anonymoususersrole: true, authenticatedusersrole: false }),
      component(11, 3, 'Renamed signed-in role', { anonymoususersrole: false, authenticatedusersrole: true }),
      component(11, 4, 'Member', { anonymoususersrole: false, authenticatedusersrole: false })] as unknown[],
    permissions: [component(18, 10, 'Root', { ...PERMISSION, adx_entitypermission_webrole: [AUTH] }),
      component(18, 11, 'Child', { ...PERMISSION, scope: 756150003, parententitypermission: id(10) })] as unknown[],
    settings: [] as unknown[],
    definitions: [] as unknown[],
    values: [] as unknown[],
  };
}

function fixture(data = dataSet(), failures: readonly FakeFailure[] = []) {
  const fileColumns = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`powerpagecomponent/${id(100 + i)}/filecontent`, CODE]));
  const host = createFakeHost({ connection: CONNECTION, fileColumns, failures,
    responders: [(q) => {
      if (q.entitySet !== 'powerpagecomponents') return undefined;
      if (q.filter?.endsWith('powerpagecomponenttype eq 35') === true) return data.files;
      if (q.filter?.endsWith('powerpagecomponenttype eq 11') === true) return data.roles;
      if (q.filter?.endsWith('powerpagecomponenttype eq 18') === true) return data.permissions;
      if (q.filter?.endsWith('powerpagecomponenttype eq 9') === true) return data.settings;
      return undefined;
    }],
    tables: { powerpagesites: data.sites, environmentvariabledefinitions: data.definitions, environmentvariablevalues: data.values },
  });
  return host;
}

const execute = (host: ReturnType<typeof fixture>, progress: (scanned: number, total: number) => void = () => undefined) =>
  scan.runScan(host, CONNECTION, SITE, 'connection:site:1', progress);

function setting(facts: SiteFacts, name = 'ServerLogic/AllowedDomains' as const): SettingValue {
  if (!facts.settings.ok) throw new Error('Expected a readable settings set');
  return facts.settings.value[name];
}

function envData(type = 100000000, fallback: unknown = 'default.invalid', current: unknown = 'current.invalid') {
  const data = dataSet(1);
  data.settings = [component(9, 20, 'ServerLogic/AllowedDomains', { source: 1, envvar_schema: "cfg_O'Brien space" })];
  data.definitions = [{ environmentvariabledefinitionid: id(30), schemaname: "cfg_O'Brien space", type, defaultvalue: fallback }];
  data.values = current === undefined ? [] : [{ environmentvariablevalueid: id(31), _environmentvariabledefinitionid_value: id(30), statecode: 0, value: current }];
  return data;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function delayedFiles(host: ReturnType<typeof fixture>) {
  const gates = new Map<string, ReturnType<typeof deferred<string>>>();
  const started = deferred<void>();
  const calls: FileColumnRef[] = [];
  let active = 0;
  let maximum = 0;
  vi.spyOn(host, 'downloadFileColumn').mockImplementation(async (ref) => {
    calls.push(ref);
    active += 1;
    maximum = Math.max(maximum, active);
    const gate = deferred<string>();
    gates.set(ref.recordId, gate);
    if (calls.length === 4) started.resolve();
    try { return await gate.promise; } finally { active -= 1; }
  });
  return { gates, started: started.promise, calls, maximum: () => maximum, active: () => active };
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('real Inspector reader', () => {
  it('lists active and inactive enhanced sites with explicit deterministic complete queries', async () => {
    const host = fixture();
    await expect(scan.listSites(host)).resolves.toEqual([SITE, { id: id(9), name: 'Z inactive', domain: '', active: false }]);
    expect(host.callsOf('queryAll')[0]?.query).toEqual({ entitySet: 'powerpagesites',
      select: ['powerpagesiteid', 'name', 'primarydomainname', 'statecode'], filter: null, orderBy: 'name,powerpagesiteid', pageSize: 5000 });
  });

  it('rejects failed/partial or malformed site lists instead of claiming no sites', async () => {
    const host = fixture(dataSet(), [{ operation: 'query', entitySet: 'powerpagesites', status: 503, partialRows: [{ powerpagesiteid: SITE.id }] }]);
    await expect(scan.listSites(host)).rejects.toMatchObject({ status: 503 });
    const malformed = dataSet();
    malformed.sites = [{ powerpagesiteid: SITE.id, name: 'bad', statecode: 7, primarydomainname: '' }];
    await expect(scan.listSites(fixture(malformed))).rejects.toMatchObject({ name: 'HostReadError' });
  });

  it('runs the query/parse/download/evaluate path using S1 roles and Parent links', async () => {
    const host = fixture();
    const progress = vi.fn();
    const now = vi.fn().mockReturnValueOnce(new Date('2026-11-01T00:00:00Z')).mockReturnValueOnce(new Date('2026-11-01T00:00:04Z'));
    const facts = await scan.runScan(host, CONNECTION, SITE, 'scan-1', progress, { now });
    expect(facts).toMatchObject({ scanId: 'scan-1', startedAt: '2026-11-01T00:00:00.000Z', finishedAt: '2026-11-01T00:00:04.000Z', inventoryComplete: true, stopped: null });
    expect(facts.files.map((f) => f.active)).toEqual([true, false]);
    expect(facts.files.every((f) => f.code.ok && f.code.value === CODE && f.roleIds.ok)).toBe(true);
    expect(facts.permissions).toMatchObject({ ok: true, value: [
      { id: id(10), scope: 'Global', privileges: ['Read'], roleIds: [AUTH] },
      { id: id(11), scope: 'Parent', parentId: id(10), roleIds: [] },
    ] });
    expect(facts.roles).toMatchObject({ ok: true, value: [{ id: ANON, anonymous: true }, { id: AUTH, authenticated: true }, { id: MEMBER }] });
    expect(progress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]]);
    const queries = host.callsOf('queryAll').map((c) => c.query);
    expect(queries.map((q) => q.filter)).toEqual([35, 11, 18, 9].map((kind) => `_powerpagesiteid_value eq ${SITE.id} and powerpagecomponenttype eq ${String(kind)}`));
    expect(queries.every((q) => q.orderBy === 'name,powerpagecomponentid' && q.select.includes('content'))).toBe(true);
    expect(host.callsOf('downloadFileColumn')[0]?.ref).toEqual({ entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid', recordId: id(100), fileAttributeName: 'filecontent' });
    const evaluated = evaluateSite(facts, new Set());
    expect(evaluated.files[0]?.findings[0].status).toBe('configured');
    expect(evaluated.files[0]?.findings[1].status).toBe('needs-review');
    expect(evaluated.files[0]?.findings[1].reasons.some((r) => r.text.includes('Global'))).toBe(true);
  });

  it('has no 50-record cap and reports a successful empty inventory distinctly', async () => {
    const host = fixture(dataSet(51));
    const facts = await execute(host);
    expect(facts.files).toHaveLength(51);
    expect(host.callsOf('downloadFileColumn')).toHaveLength(51);
    const empty = await execute(fixture(dataSet(0)));
    expect(empty.files).toEqual([]);
    expect(empty.inventoryComplete).toBe(true);
    expect(empty.finishedAt).not.toBeNull();
  });

  it('matches all four setting names after trimming/case-folding and counts only active duplicates', async () => {
    const data = dataSet(1);
    data.settings = [
      component(9, 20, ' serverlogic/enabled ', { source: 0, value: ' FALSE ' }),
      component(9, 21, ' ServerLogic/AllowedDomains ', { source: 0, value: 'a.invalid' }),
      component(9, 22, 'serverlogic/alloweddomains', { source: 0, value: 'b.invalid' }),
      component(9, 23, 'ServerLogic/TimeoutInSeconds', { source: 0, value: '239' }, 1),
      component(9, 24, 'Unrelated/Setting', { malformed: true }),
    ];
    const host = fixture(data);
    const facts = await execute(host);
    expect(facts.settings).toEqual({ ok: true, value: {
      'ServerLogic/Enabled': { kind: 'value', raw: ' FALSE ', fromEnvVar: false },
      'ServerLogic/AllowedDomains': { kind: 'duplicate' },
      'ServerLogic/AllowNetworkingToAllDomains': { kind: 'absent' },
      'ServerLogic/TimeoutInSeconds': { kind: 'absent' },
    } });
    expect(facts.inactiveSettings).toEqual(['ServerLogic/TimeoutInSeconds']);
    expect(host.callsOf('queryAll').every((c) => !c.query.filter?.includes('startswith'))).toBe(true);
  });

  it.each(['roles', 'permissions', 'settings'] as const)('does not convert malformed %s into defaults', async (part) => {
    const data = dataSet(1);
    data[part] = part === 'roles'
      ? [component(11, 2, 'Bad role', { anonymoususersrole: 'false', authenticatedusersrole: false })]
      : part === 'permissions'
        ? [component(18, 10, 'Bad permission', { ...PERMISSION, read: 'true' })]
        : [component(9, 20, 'ServerLogic/Enabled', { source: 0 })];
    const facts = await execute(fixture(data));
    expect(facts[part]).toEqual({ ok: false, reason: 'read-failed' });
    expect(facts.files[0]?.code.ok).toBe(true);
    expect(facts.stopped).toBeNull();
  });

  it('preserves unknown permission scope as an analysis limit, and rejects malformed role-link content', async () => {
    const data = dataSet(1);
    data.permissions = [component(18, 10, 'Unknown', { ...PERMISSION, scope: 999, adx_entitypermission_webrole: [MEMBER] })];
    data.files = [component(35, 100, 'handler', { adx_serverlogic_adx_webrole: 'wrong-shape' })];
    const facts = await execute(fixture(data));
    expect(facts.permissions).toMatchObject({ ok: true, value: [{ scope: null }] });
    expect(facts.files[0]?.roleIds).toEqual({ ok: false, reason: 'read-failed' });
    expect(facts.files[0]?.code.ok).toBe(true);
  });

  it('keeps known anonymous-role evidence after that file code fails', async () => {
    const data = dataSet(1);
    data.files = [component(35, 100, 'handler', { adx_serverlogic_adx_webrole: [ANON] })];
    const facts = await execute(fixture(data, [{ operation: 'file', entitySet: 'powerpagecomponent', status: 403 }]));
    expect(facts.files[0]?.roleIds).toEqual({ ok: true, value: [ANON] });
    expect(facts.files[0]?.code).toEqual({ ok: false, reason: 'read-failed' });
    const findings = evaluateSite(facts, new Set()).files[0]?.findings;
    expect(findings?.[0].status).toBe('needs-review');
    expect(findings?.[0].reasons.some((reason) => reason.text.includes('unauthenticated'))).toBe(true);
    expect(findings?.[1].reasons.some((reason) => reason.readFailure)).toBe(true);
    expect(findings?.[2].reasons.some((reason) => reason.readFailure)).toBe(true);
  });
});

describe('nonsecret environment resolution and retained causes', () => {
  it.each([
    ['current', 'current.invalid', 'default.invalid', 'current.invalid'],
    ['default', null, 'default.invalid', 'default.invalid'],
    ['empty current', '', 'default.invalid', ''],
    ['empty default', null, '', ''],
  ])('uses %s without confusing an empty value with missing', async (_label, current, fallback, expected) => {
    const host = fixture(envData(100000000, fallback, current));
    expect(setting(await execute(host))).toEqual({ kind: 'value', raw: expected, fromEnvVar: true });
    const queries = host.callsOf('queryAll').map((c) => c.query);
    expect(queries.find((q) => q.entitySet === 'environmentvariabledefinitions')?.filter).toBe("schemaname eq 'cfg_O%27%27Brien%20space'");
    expect(queries.find((q) => q.entitySet === 'environmentvariablevalues')?.filter).toBe(`_environmentvariabledefinitionid_value eq ${id(30)} and statecode eq 0`);
  });

  it('uses the default when there is no value row', async () => {
    const data = envData();
    data.values = [];
    expect(setting(await execute(fixture(data)))).toEqual({ kind: 'value', raw: 'default.invalid', fromEnvVar: true });
  });

  it('records secret and never requests its values', async () => {
    const host = fixture(envData(100000005));
    expect(setting(await execute(host))).toEqual({ kind: 'envvar-unreadable', cause: 'secret' });
    expect(host.callsOf('queryAll').some((c) => c.query.entitySet === 'environmentvariablevalues')).toBe(false);
  });

  it('retains missing for both missing definition and missing current/default', async () => {
    const data = envData();
    data.definitions = [];
    expect(setting(await execute(fixture(data)))).toEqual({ kind: 'envvar-unreadable', cause: 'missing' });
    expect(setting(await execute(fixture(envData(100000000, null, null))))).toEqual({ kind: 'envvar-unreadable', cause: 'missing' });
  });

  it.each(['environmentvariabledefinitions', 'environmentvariablevalues'])('retains denied for a 403 from %s without falling back', async (entitySet) => {
    const host = fixture(envData(), [{ operation: 'query', entitySet, status: 403 }]);
    const facts = await execute(host);
    expect(setting(facts)).toEqual({ kind: 'envvar-unreadable', cause: 'denied' });
    expect(facts.files[0]?.code.ok).toBe(true);
    expect(facts.stopped).toBeNull();
  });

  it('retains an unknown no-status failure locally as read-failed', async () => {
    const facts = await execute(fixture(envData(), [{ operation: 'query', entitySet: 'environmentvariablevalues', status: null }]));
    expect(setting(facts)).toEqual({ kind: 'envvar-unreadable', cause: 'read-failed' });
    expect(facts.stopped).toBeNull();
  });

  it('retains invalid for malformed or ambiguous values and missing environment schema', async () => {
    const badValue = envData(100000000, 'default.invalid', 7);
    expect(setting(await execute(fixture(badValue)))).toEqual({ kind: 'envvar-unreadable', cause: 'invalid' });
    const duplicate = envData();
    duplicate.values.push({ environmentvariablevalueid: id(32), _environmentvariabledefinitionid_value: id(30), statecode: 0, value: 'other.invalid' });
    expect(setting(await execute(fixture(duplicate)))).toEqual({ kind: 'envvar-unreadable', cause: 'invalid' });
    const noSchema = envData();
    noSchema.settings = [component(9, 20, 'ServerLogic/AllowedDomains', { source: 1 })];
    const host = fixture(noSchema);
    expect(setting(await execute(host))).toEqual({ kind: 'envvar-unreadable', cause: 'invalid' });
    expect(host.callsOf('queryAll').some((c) => c.query.entitySet === 'environmentvariabledefinitions')).toBe(false);
  });

  it('keeps direct values and distinguishes a failed resolution from untouched environment dependencies', async () => {
    const data = envData();
    data.settings = [
      component(9, 20, 'ServerLogic/Enabled', { source: 0, value: 'false' }),
      component(9, 21, 'ServerLogic/AllowedDomains', { source: 1, envvar_schema: "cfg_O'Brien space" }),
      component(9, 22, 'ServerLogic/AllowNetworkingToAllDomains', { source: 1, envvar_schema: 'cfg_Later' }),
    ];
    const host = fixture(data, [{ operation: 'query', entitySet: 'environmentvariablevalues', status: 401 }]);
    const facts = await execute(host);
    expect(facts.settings).toMatchObject({ ok: true, value: {
      'ServerLogic/Enabled': { kind: 'value', raw: 'false', fromEnvVar: false },
      'ServerLogic/AllowedDomains': { kind: 'envvar-unreadable', cause: 'read-failed' },
      'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' },
    } });
    expect(facts.roles.ok).toBe(true);
    expect(facts.permissions.ok).toBe(true);
    expect(facts.files[0]?.code).toEqual({ ok: false, reason: 'not-scanned' });
    expect(facts.stopped).toBe('connection-lost');
    expect(host.callsOf('queryAll').filter((c) => c.query.entitySet === 'environmentvariabledefinitions')).toHaveLength(1);
  });
});

describe('partial inventory and configuration boundary', () => {
  it.each([403, 503, null])('keeps every valid partial inventory row after %s, while other completed dependencies remain available', async (status) => {
    const data = dataSet();
    const host = fixture(data, [{ operation: 'query', entitySet: 'powerpagecomponents', contains: 'eq 35', status,
      partialRows: [data.files[0], { malformed: true }, data.files[1]] }]);
    const facts = await execute(host);
    expect(facts.inventoryComplete).toBe(false);
    expect(facts.files.map((f) => f.id)).toEqual([id(100), id(101)]);
    expect(facts.files.map((f) => f.active)).toEqual([true, false]);
    expect(facts.files.every((f) => f.roleIds.ok && f.code.ok)).toBe(true);
    expect(facts.roles.ok && facts.permissions.ok && facts.settings.ok).toBe(true);
    expect(facts.stopped).toBeNull();
    expect(evaluateSite(facts, new Set()).banners).toContain('Inventory incomplete. Reconnect and rescan.');
  });

  it('keeps received role links after an inventory 401 and leaves untouched dependencies unscanned', async () => {
    const data = dataSet();
    const host = fixture(data, [{ operation: 'query', entitySet: 'powerpagecomponents', contains: 'eq 35', status: 401, partialRows: data.files }]);
    const facts = await execute(host);
    expect(facts.files).toHaveLength(2);
    expect(facts.files.every((f) => f.roleIds.ok && !f.code.ok && f.code.reason === 'not-scanned')).toBe(true);
    expect(facts.roles).toEqual({ ok: false, reason: 'not-scanned' });
    expect(facts.permissions).toEqual({ ok: false, reason: 'not-scanned' });
    expect(facts.settings).toEqual({ ok: false, reason: 'not-scanned' });
    expect(facts.stopped).toBe('connection-lost');
    expect(host.callsOf('queryAll')).toHaveLength(1);
  });

  it('does not expose an incomplete configuration set as complete evidence', async () => {
    const data = dataSet();
    const facts = await execute(fixture(data, [{ operation: 'query', entitySet: 'powerpagecomponents', contains: 'eq 18', status: 403, partialRows: data.permissions }]));
    expect(facts.roles.ok).toBe(true);
    expect(facts.permissions).toEqual({ ok: false, reason: 'read-failed' });
    expect(facts.settings.ok).toBe(true);
    expect(facts.files.every((f) => f.code.ok && f.roleIds.ok)).toBe(true);
  });
});

describe('four-operation scheduling, draining, and confirmation', () => {
  it('measures at most four physical requests through the real adapter, with config reads outside the file phase', async () => {
    const data = dataSet(6);
    const waiting = deferred<void>();
    const started = deferred<void>();
    let released = false;
    let blocks = 0;
    let active = 0;
    let maximum = 0;
    const enter = () => { active += 1; maximum = Math.max(maximum, active); };
    const queryData = vi.fn(async (path: string) => {
      enter();
      try {
        expect(blocks).toBe(0);
        const rows = path.includes('powerpagecomponenttype eq 35') ? data.files
          : path.includes('powerpagecomponenttype eq 11') ? data.roles
            : path.includes('powerpagecomponenttype eq 18') ? data.permissions : data.settings;
        await Promise.resolve();
        return { value: rows };
      } finally { active -= 1; }
    });
    const action = vi.fn(async (request: DataverseAPI.ExecuteRequest) => {
      enter();
      try {
        if (request.operationName === 'InitializeFileBlocksDownload') return {
          FileContinuationToken: 'token', FileSizeInBytes: Buffer.byteLength(CODE), FileName: 'handler.sl', IsChunkingSupported: true,
        };
        blocks += 1;
        if (!released) {
          if (blocks === 4) started.resolve();
          await waiting.promise;
        }
        return { Data: Buffer.from(CODE).toString('base64') };
      } finally { active -= 1; }
    });
    vi.stubGlobal('dataverseAPI', { queryData, execute: action });
    vi.stubGlobal('toolboxAPI', { connections: { getActiveConnection: () => Promise.resolve(CONNECTION) } });
    const host = createPptbHost({ sleep: () => Promise.resolve() });
    const running = scan.runScan(host, CONNECTION, SITE, 'physical', vi.fn());
    await started.promise;
    expect(queryData).toHaveBeenCalledTimes(4);
    expect(active).toBe(4);
    released = true;
    waiting.resolve();
    const facts = await running;
    expect(maximum).toBe(4);
    expect(blocks).toBe(6);
    expect(active).toBe(0);
    expect(facts.files.every((file) => file.code.ok)).toBe(true);
  });

  it.each([false, true])('drains started operations and preserves successes after %s transport provenance', async (transport) => {
    const host = fixture(dataSet(6));
    const delayed = delayedFiles(host);
    const failed = deferred<void>();
    const progress = vi.fn((done: number) => { if (done === 1) failed.resolve(); });
    const running = execute(host, progress);
    await delayed.started;
    expect(host.callsOf('queryAll')).toHaveLength(4);
    delayed.gates.get(id(100))?.reject(new HostReadError('lost', transport ? null : 401, transport));
    await failed.promise;
    expect(delayed.calls).toHaveLength(4);
    for (const number of [101, 102, 103]) delayed.gates.get(id(number))?.resolve(CODE);
    const facts = await running;
    expect(delayed.maximum()).toBe(4);
    expect(delayed.calls).toHaveLength(4);
    expect(facts.files.slice(1, 4).every((f) => f.code.ok)).toBe(true);
    expect(facts.files.slice(4).every((f) => !f.code.ok && f.code.reason === 'not-scanned')).toBe(true);
    expect(facts.files.every((f) => f.roleIds.ok)).toBe(true);
    expect(facts.roles.ok && facts.permissions.ok && facts.settings.ok).toBe(true);
    expect(facts.stopped).toBe('connection-lost');
    expect(progress.mock.calls.at(-1)).toEqual([4, 6]);
  });

  it.each([403, 404, 503, null])('continues after a local %s file failure', async (status) => {
    const host = fixture(dataSet(6), [{ operation: 'file', entitySet: 'powerpagecomponent', contains: id(100), status }]);
    const facts = await execute(host);
    expect(host.callsOf('downloadFileColumn')).toHaveLength(6);
    expect(facts.stopped).toBeNull();
    expect(facts.files[0]?.code).toEqual({ ok: false, reason: 'read-failed' });
    expect(facts.files.slice(1).every((f) => f.code.ok)).toBe(true);
  });

  it('does not settle cancellation until every dispatched file operation has settled', async () => {
    const host = fixture(dataSet(6));
    const delayed = delayedFiles(host);
    const controller = new AbortController();
    let settled = false;
    const running = scan.runScan(host, CONNECTION, SITE, 'old', vi.fn(), { signal: controller.signal }).then(
      (facts) => { settled = true; return facts; }, (error: unknown) => { settled = true; return error; },
    );
    await delayed.started;
    controller.abort();
    delayed.gates.get(id(100))?.resolve(CODE);
    await Promise.resolve();
    expect(settled).toBe(false);
    for (const number of [101, 102, 103]) delayed.gates.get(id(number))?.resolve(CODE);
    expect(await running).toMatchObject({ name: 'AbortError' });
    expect(delayed.calls).toHaveLength(4);
    expect(delayed.active()).toBe(0);
  });

  it('does not start a pre-aborted list or scan', async () => {
    const host = fixture();
    const controller = new AbortController();
    controller.abort();
    await expect(scan.listSites(host, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    await expect(scan.runScan(host, CONNECTION, SITE, 'old', vi.fn(), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(host.calls).toEqual([]);
  });

  it.each([null, { ...CONNECTION, id: 'changed' }, { ...CONNECTION, url: 'https://changed.invalid' }])('rejects successful final identity change %j', async (current) => {
    const host = fixture();
    vi.spyOn(host, 'getActiveConnection').mockResolvedValueOnce(CONNECTION).mockResolvedValueOnce(current);
    await expect(execute(host)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('accepts same-identity rename/relabel without losing facts', async () => {
    const host = fixture();
    vi.spyOn(host, 'getActiveConnection').mockResolvedValueOnce(CONNECTION)
      .mockResolvedValueOnce({ ...CONNECTION, name: 'Renamed', environment: 'Production' });
    expect((await execute(host)).files).toHaveLength(2);
  });

  it.each([false, true])('retains %s partial facts on failed confirmation and retries identity only', async (partial) => {
    const host = fixture(dataSet(1), partial ? [{ operation: 'file', entitySet: 'powerpagecomponent', status: 401 }] : []);
    vi.spyOn(host, 'getActiveConnection').mockResolvedValueOnce(CONNECTION)
      .mockRejectedValueOnce(new HostCallError('refresh failed')).mockResolvedValue(CONNECTION);
    let failure: unknown;
    try { await execute(host); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(scan.ScanConfirmationError);
    if (!(failure instanceof scan.ScanConfirmationError)) throw new Error('Missing retained confirmation facts');
    const pending = failure.facts;
    expect(pending.stopped).toBe(partial ? 'connection-lost' : null);
    expect(pending.files[0]?.roleIds.ok).toBe(true);
    expect(pending.files[0]?.code.ok).toBe(!partial);
    expect(pending.finishedAt).not.toBeNull();
    const reads = host.callsOf('queryAll').length;
    const downloads = host.callsOf('downloadFileColumn').length;
    await expect(scan.confirmScanIdentity(host, pending)).resolves.toBe(pending);
    expect(host.callsOf('queryAll')).toHaveLength(reads);
    expect(host.callsOf('downloadFileColumn')).toHaveLength(downloads);
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npm test -- src/features/inspector/scan/scan.test.ts`

Expected: nonzero; current `runScan` and `listSites` throw `not implemented: phase 15`. The tests invoke those existing exports before adding parser/query modules.

Run: `npm test -- src/services/pptb src/features/inspector/model src/skeleton.test.ts`

Expected: existing suites, including Task 3, pass. Preserve this exact regression command in Step 4.

- [ ] **Step 3: Implement the minimum fix**

Retain the complete test files created in Step 1.

<!-- patch: src/types/inspector.ts -->
```diff
@@
-  | { kind: 'envvar-unreadable' } // secret type, missing variable or failed read
+  | {
+      kind: 'envvar-unreadable';
+      cause?: 'secret' | 'missing' | 'denied' | 'read-failed' | 'invalid';
+    } // optional for legacy fixtures; new reads always include the cause
```

<!-- file: src/features/inspector/scan/queries.ts -->
```typescript
import type { ODataQuery } from '@/services/pptb/host.types';
import { requireGuid } from './parseRows';

export function odataLiteral(value: string): string {
  return `'${encodeURIComponent(value.replaceAll("'", "''")).replaceAll("'", '%27')}'`;
}

export const SITES_QUERY: ODataQuery = {
  entitySet: 'powerpagesites',
  select: ['powerpagesiteid', 'name', 'primarydomainname', 'statecode'],
  filter: null,
  orderBy: 'name,powerpagesiteid',
  pageSize: 5000,
};

export function componentQuery(siteId: string, kind: 35 | 11 | 18 | 9): ODataQuery {
  return {
    entitySet: 'powerpagecomponents',
    select: ['powerpagecomponentid', 'name', 'statecode', 'content', 'powerpagecomponenttype', '_powerpagesiteid_value'],
    filter: `_powerpagesiteid_value eq ${requireGuid(siteId)} and powerpagecomponenttype eq ${String(kind)}`,
    orderBy: 'name,powerpagecomponentid',
    pageSize: 5000,
  };
}

export function definitionQuery(schema: string): ODataQuery {
  return {
    entitySet: 'environmentvariabledefinitions',
    select: ['environmentvariabledefinitionid', 'schemaname', 'type', 'defaultvalue'],
    filter: `schemaname eq ${odataLiteral(schema)}`,
    orderBy: 'environmentvariabledefinitionid',
    pageSize: 5000,
  };
}

export function valueQuery(definitionId: string): ODataQuery {
  return {
    entitySet: 'environmentvariablevalues',
    select: ['environmentvariablevalueid', '_environmentvariabledefinitionid_value', 'value', 'statecode'],
    filter: `_environmentvariabledefinitionid_value eq ${requireGuid(definitionId)} and statecode eq 0`,
    orderBy: 'environmentvariablevalueid',
    pageSize: 5000,
  };
}
```

<!-- file: src/features/inspector/scan/parseRows.ts -->
```typescript
import { HostReadError } from '@/services/pptb/host.types';
import { isRecord } from '@/services/pptb/hostErrors';
import type { AccessType, Privilege } from '@/types/recipe';
import type { Readable, ServerLogicFileFacts, SettingName, SettingValue, SiteRef, TablePermissionFact, WebRoleFact } from '@/types/inspector';
import { normalizeSettingName, SETTING_NAMES } from '../model/settings';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const SCOPES: Readonly<Record<number, AccessType>> = {
  756150000: 'Global', 756150001: 'Contact', 756150002: 'Account',
  756150003: 'Parent', 756150004: 'Self',
};
const PRIVILEGES: readonly (readonly [string, Privilege])[] = [
  ['read', 'Read'], ['write', 'Write'], ['create', 'Create'],
  ['delete', 'Delete'], ['append', 'Append'], ['appendto', 'AppendTo'],
];

export function invalidRow(): HostReadError {
  return new HostReadError('Unexpected configuration from Dataverse.', null);
}

export function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value) || Array.isArray(value)) throw invalidRow();
  return value;
}

export function requireGuid(value: unknown): string {
  if (typeof value !== 'string' || !GUID.test(value)) throw invalidRow();
  return value.toLowerCase();
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw invalidRow();
  return value;
}

function tableName(value: unknown): string {
  const name = text(value);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) throw invalidRow();
  return name;
}

function active(value: unknown): boolean {
  if (value !== 0 && value !== 1) throw invalidRow();
  return value === 0;
}

function content(value: unknown): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text(value));
    return record(parsed);
  } catch {
    throw invalidRow();
  }
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw invalidRow();
  return value;
}

function roleIds(value: unknown): readonly string[] {
  // S1: absent role arrays, especially on Parent permissions, mean no direct links.
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw invalidRow();
  return [...new Set(value.map((id: unknown) => requireGuid(id)))];
}

type Component = { id: string; name: string; active: boolean; rawContent: unknown };

function component(raw: unknown, kind: number, siteId: string): Component {
  const row = record(raw);
  if (row.powerpagecomponenttype !== kind || requireGuid(row._powerpagesiteid_value) !== requireGuid(siteId)) throw invalidRow();
  return { id: requireGuid(row.powerpagecomponentid), name: text(row.name),
    active: active(row.statecode), rawContent: row.content };
}

export function byName<T extends { name: string; id: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

export function parseSite(raw: unknown): SiteRef {
  const row = record(raw);
  return { id: requireGuid(row.powerpagesiteid), name: text(row.name),
    domain: row.primarydomainname === null ? '' : text(row.primarydomainname), active: active(row.statecode) };
}

export function parseInventory(rows: readonly unknown[], siteId: string): { files: ServerLogicFileFacts[]; complete: boolean } {
  const files: ServerLogicFileFacts[] = [];
  const seen = new Set<string>();
  let complete = true;
  for (const raw of rows) {
    try {
      const row = component(raw, 35, siteId);
      if (seen.has(row.id)) { complete = false; continue; }
      seen.add(row.id);
      let links: Readable<readonly string[]>;
      try {
        links = { ok: true, value: roleIds(content(row.rawContent).adx_serverlogic_adx_webrole) };
      } catch {
        links = { ok: false, reason: 'read-failed' };
      }
      files.push({ id: row.id, name: row.name, active: row.active, roleIds: links,
        code: { ok: false, reason: 'not-scanned' } });
    } catch {
      complete = false;
    }
  }
  return { files: files.sort(byName), complete };
}

export function parseRoles(rows: readonly unknown[], siteId: string): readonly WebRoleFact[] {
  const seen = new Set<string>();
  return rows.map((raw) => {
    const row = component(raw, 11, siteId);
    if (seen.has(row.id)) throw invalidRow();
    seen.add(row.id);
    const data = content(row.rawContent);
    return { id: row.id, name: row.name, anonymous: boolean(data.anonymoususersrole), authenticated: boolean(data.authenticatedusersrole) };
  });
}

export function parsePermissions(rows: readonly unknown[], siteId: string): readonly TablePermissionFact[] {
  const seen = new Set<string>();
  return rows.map((raw) => {
    const row = component(raw, 18, siteId);
    if (seen.has(row.id)) throw invalidRow();
    seen.add(row.id);
    const data = content(row.rawContent);
    const privileges = PRIVILEGES.filter(([key]) => boolean(data[key])).map(([, privilege]) => privilege);
    return {
      id: row.id, name: row.name, table: tableName(data.entitylogicalname), active: row.active,
      scope: typeof data.scope === 'number' ? SCOPES[data.scope] ?? null : null,
      privileges, roleIds: roleIds(data.adx_entitypermission_webrole),
      parentId: data.parententitypermission === undefined || data.parententitypermission === null
        ? null : requireGuid(data.parententitypermission),
    };
  });
}

export type SettingBinding = { kind: 'setting'; value: SettingValue } | { kind: 'environment'; schema: string };
export type SettingBindings = ReadonlyMap<SettingName, SettingBinding>;

export function parseSettings(rows: readonly unknown[], siteId: string): { bindings: SettingBindings; inactive: readonly SettingName[] } {
  const grouped = new Map<SettingName, Component[]>();
  const inactive = new Set<SettingName>();
  const seen = new Set<string>();
  for (const raw of rows) {
    const row = component(raw, 9, siteId);
    const name = normalizeSettingName(row.name);
    if (name === null) continue;
    if (seen.has(row.id)) throw invalidRow();
    seen.add(row.id);
    if (!row.active) { inactive.add(name); continue; }
    const existing = grouped.get(name) ?? [];
    existing.push(row);
    grouped.set(name, existing);
  }
  const bindings = new Map<SettingName, SettingBinding>();
  for (const name of SETTING_NAMES) {
    const matches = grouped.get(name) ?? [];
    if (matches.length > 1) { bindings.set(name, { kind: 'setting', value: { kind: 'duplicate' } }); continue; }
    const row = matches[0];
    if (row === undefined) { bindings.set(name, { kind: 'setting', value: { kind: 'absent' } }); continue; }
    const data = content(row.rawContent);
    if (data.source === 1) {
      bindings.set(name, typeof data.envvar_schema === 'string' && data.envvar_schema.trim() !== ''
        ? { kind: 'environment', schema: data.envvar_schema }
        : { kind: 'setting', value: { kind: 'envvar-unreadable', cause: 'invalid' } });
    } else if (data.source === 0 && typeof data.value === 'string') {
      bindings.set(name, { kind: 'setting', value: { kind: 'value', raw: data.value, fromEnvVar: false } });
    } else {
      throw invalidRow();
    }
  }
  return { bindings, inactive: SETTING_NAMES.filter((name) => inactive.has(name)) };
}
```

`scan.ts` currently consists only of the two throwing stubs. Replace their contents and imports with this exact diff.

<!-- patch: src/features/inspector/scan/scan.ts -->
```diff
@@
-import type { Connection, PptbHost } from '@/services/pptb/host.types';
-import type { SiteFacts, SiteRef } from '@/types/inspector';
-
-export function runScan(
-  _host: PptbHost,
-  _connection: Connection,
-  _site: SiteRef,
-  _scanId: string,
-  _onProgress: (scanned: number, total: number) => void,
-): Promise<SiteFacts> {
-  throw new Error('not implemented: phase 15');
-}
-
-export function listSites(_host: PptbHost): Promise<readonly SiteRef[]> {
-  throw new Error('not implemented: phase 15');
-}
+import { HostReadError } from '@/services/pptb/host.types';
+import type { Connection, ODataQuery, PptbHost } from '@/services/pptb/host.types';
+import { isAbortError, throwIfAborted, toHostReadError } from '@/services/pptb/hostErrors';
+import type { Readable, SettingName, SettingValue, SiteFacts, SiteRef } from '@/types/inspector';
+import { SETTING_NAMES } from '../model/settings';
+import { componentQuery, definitionQuery, SITES_QUERY, valueQuery } from './queries';
+import { byName, invalidRow, parseInventory, parsePermissions, parseRoles, parseSettings, parseSite, record, requireGuid } from './parseRows';
+
+export type ScanOptions = { now?: () => Date; signal?: AbortSignal };
+
+export class ScanConfirmationError extends Error {
+  constructor(readonly facts: SiteFacts) {
+    super("Couldn't confirm the active connection. Retry confirmation.");
+    this.name = 'ScanConfirmationError';
+  }
+}
+
+function sameConnection(expected: Connection, actual: Connection | null): void {
+  if (actual === null || actual.id !== expected.id || actual.url !== expected.url) {
+    throw new DOMException('The active connection changed.', 'AbortError');
+  }
+}
+
+export async function confirmScanIdentity(host: PptbHost, facts: SiteFacts, signal?: AbortSignal): Promise<SiteFacts> {
+  throwIfAborted(signal);
+  let current: Connection | null;
+  try {
+    current = await host.getActiveConnection();
+  } catch {
+    throwIfAborted(signal);
+    throw new ScanConfirmationError(facts);
+  }
+  throwIfAborted(signal);
+  sameConnection(facts.connection, current);
+  return facts;
+}
+
+type RowsRead = { ok: true; rows: readonly unknown[] }
+  | { ok: false; reason: 'not-scanned' }
+  | { ok: false; reason: 'read-failed'; error: HostReadError };
+type ReadRows = (query: ODataQuery) => Promise<RowsRead>;
+type EnvCause = NonNullable<Extract<SettingValue, { kind: 'envvar-unreadable' }>['cause']>;
+const unavailable = (cause: EnvCause): SettingValue => ({ kind: 'envvar-unreadable', cause });
+
+function envReadFailure(result: Exclude<RowsRead, { ok: true }>): SettingValue {
+  return result.reason === 'not-scanned' ? { kind: 'not-scanned' }
+    : unavailable(result.error.status === 403 ? 'denied' : 'read-failed');
+}
+
+async function environmentValue(schema: string, read: ReadRows): Promise<SettingValue> {
+  try {
+    const definitions = await read(definitionQuery(schema));
+    if (!definitions.ok) return envReadFailure(definitions);
+    if (definitions.rows.length === 0) return unavailable('missing');
+    if (definitions.rows.length !== 1) throw invalidRow();
+    const definition = record(definitions.rows[0]);
+    const id = requireGuid(definition.environmentvariabledefinitionid);
+    if (definition.schemaname !== schema) throw invalidRow();
+    if (definition.type === 100000005) return unavailable('secret');
+    if (typeof definition.type !== 'number' || !Number.isInteger(definition.type) ||
+        definition.type < 100000000 || definition.type > 100000004) throw invalidRow();
+    // The type is known nonsecret before any environmentvariablevalues request.
+    const values = await read(valueQuery(id));
+    if (!values.ok) return envReadFailure(values);
+    if (values.rows.length > 1) throw invalidRow();
+    let current: unknown;
+    if (values.rows.length === 1) {
+      const value = record(values.rows[0]);
+      requireGuid(value.environmentvariablevalueid);
+      if (requireGuid(value._environmentvariabledefinitionid_value) !== id || value.statecode !== 0) throw invalidRow();
+      current = value.value;
+      if (current !== null && typeof current !== 'string') throw invalidRow();
+    }
+    if (typeof current === 'string') return { kind: 'value', raw: current, fromEnvVar: true };
+    if (typeof definition.defaultvalue === 'string') return { kind: 'value', raw: definition.defaultvalue, fromEnvVar: true };
+    if (definition.defaultvalue !== null) throw invalidRow();
+    return unavailable('missing');
+  } catch (error) {
+    if (isAbortError(error)) throw error;
+    return unavailable('invalid');
+  }
+}
+
+export async function runScan(
+  host: PptbHost,
+  connection: Connection,
+  site: SiteRef,
+  scanId: string,
+  onProgress: (scanned: number, total: number) => void,
+  options: ScanOptions = {},
+): Promise<SiteFacts> {
+  const { signal } = options;
+  const now = options.now ?? (() => new Date());
+  const startedAt = now().toISOString();
+  throwIfAborted(signal);
+  sameConnection(connection, await host.getActiveConnection());
+  throwIfAborted(signal);
+  let lost = false;
+  const failure = (error: unknown): HostReadError => {
+    const mapped = toHostReadError('Inspector read', error);
+    if (mapped.status === 401 || mapped.transport) lost = true;
+    return mapped;
+  };
+  const read: ReadRows = async (query) => {
+    throwIfAborted(signal);
+    if (lost) return { ok: false, reason: 'not-scanned' };
+    try {
+      const rows = await host.queryAll(query, signal);
+      throwIfAborted(signal);
+      if (!Array.isArray(rows)) throw invalidRow();
+      return { ok: true, rows };
+    } catch (error) {
+      throwIfAborted(signal);
+      if (isAbortError(error)) throw error;
+      return { ok: false, reason: 'read-failed', error: failure(error) };
+    }
+  };
+  const configuration = async <T>(kind: 11 | 18, parse: (rows: readonly unknown[], siteId: string) => T): Promise<Readable<T>> => {
+    const result = await read(componentQuery(site.id, kind));
+    if (!result.ok) return { ok: false, reason: result.reason };
+    try {
+      return { ok: true, value: parse(result.rows, site.id) };
+    } catch {
+      return { ok: false, reason: 'read-failed' };
+    }
+  };
+
+  const inventory = await read(componentQuery(site.id, 35));
+  const discovered = inventory.ok ? inventory.rows
+    : inventory.reason === 'read-failed' ? inventory.error.partialRows : [];
+  const parsed = parseInventory(discovered, site.id);
+  const files = parsed.files;
+  const inventoryComplete = inventory.ok && parsed.complete;
+  onProgress(0, files.length);
+  // These reads are complete before the file phase, including their pages/retries.
+  const roles = await configuration(11, parseRoles);
+  const permissions = await configuration(18, parsePermissions);
+  const rawSettings = await read(componentQuery(site.id, 9));
+  let settings: SiteFacts['settings'];
+  let inactiveSettings: readonly SettingName[] = [];
+  if (!rawSettings.ok) {
+    settings = { ok: false, reason: rawSettings.reason };
+  } else {
+    try {
+      const parsedSettings = parseSettings(rawSettings.rows, site.id);
+      inactiveSettings = parsedSettings.inactive;
+      const values: Record<SettingName, SettingValue> = {
+        'ServerLogic/Enabled': { kind: 'not-scanned' },
+        'ServerLogic/AllowedDomains': { kind: 'not-scanned' },
+        'ServerLogic/AllowNetworkingToAllDomains': { kind: 'not-scanned' },
+        'ServerLogic/TimeoutInSeconds': { kind: 'not-scanned' },
+      };
+      for (const name of SETTING_NAMES) {
+        const binding = parsedSettings.bindings.get(name);
+        if (binding === undefined) throw invalidRow();
+        values[name] = binding.kind === 'setting' ? binding.value : { kind: 'not-scanned' };
+      }
+      for (const name of SETTING_NAMES) {
+        const binding = parsedSettings.bindings.get(name);
+        if (binding?.kind === 'environment') values[name] = await environmentValue(binding.schema, read);
+      }
+      settings = { ok: true, value: values };
+    } catch (error) {
+      throwIfAborted(signal);
+      if (isAbortError(error)) throw error;
+      settings = { ok: false, reason: 'read-failed' };
+    }
+  }
+
+  let next = 0;
+  let scanned = 0;
+  const worker = async (): Promise<void> => {
+    while (!lost) {
+      throwIfAborted(signal);
+      const index = next++;
+      const file = files[index];
+      if (file === undefined) return;
+      let code: Readable<string>;
+      try {
+        const value = await host.downloadFileColumn({
+          entityLogicalName: 'powerpagecomponent', primaryIdAttribute: 'powerpagecomponentid',
+          recordId: file.id, fileAttributeName: 'filecontent',
+        }, signal);
+        throwIfAborted(signal);
+        if (typeof value !== 'string') throw invalidRow();
+        code = { ok: true, value };
+      } catch (error) {
+        throwIfAborted(signal);
+        if (isAbortError(error)) throw error;
+        failure(error);
+        code = { ok: false, reason: 'read-failed' };
+      }
+      // Preserve the inventory's role-link evidence independently of code success.
+      files[index] = { ...file, code };
+      scanned += 1;
+      onProgress(scanned, files.length);
+    }
+  };
+  // allSettled drains dispatched work, including when one worker notices cancellation.
+  const settled = await Promise.allSettled(Array.from({ length: Math.min(4, files.length) }, () => worker()));
+  throwIfAborted(signal);
+  for (const result of settled) {
+    if (result.status === 'rejected') {
+      const error: unknown = result.reason;
+      throw error instanceof Error ? error : new Error('Scan worker failed.');
+    }
+  }
+  const facts: SiteFacts = {
+    scanId, site, connection, startedAt, finishedAt: now().toISOString(), roles, permissions, settings,
+    inactiveSettings, files, inventoryComplete, stopped: lost ? 'connection-lost' : null,
+  };
+  return confirmScanIdentity(host, facts, signal);
+}
+
+export async function listSites(host: PptbHost, signal?: AbortSignal): Promise<readonly SiteRef[]> {
+  throwIfAborted(signal);
+  const rows = await host.queryAll(SITES_QUERY, signal);
+  throwIfAborted(signal);
+  const sites = rows.map(parseSite);
+  if (new Set(sites.map((site) => site.id)).size !== sites.length) throw invalidRow();
+  return sites.sort(byName);
+}
```

<!-- patch: src/skeleton.test.ts -->
```diff
@@
         onProgress: (scanned: number, total: number) => void,
+        options?: { now?: () => Date; signal?: AbortSignal },
@@
-    expectTypeOf(listSites).toEqualTypeOf<(host: PptbHost) => Promise<readonly SiteRef[]>>();
+    expectTypeOf(listSites).toEqualTypeOf<(host: PptbHost, signal?: AbortSignal) => Promise<readonly SiteRef[]>>();
```



**Session-owner integration required in Task 6:** add `confirmScanIdentity` to the injected Inspector dependencies; store `ScanConfirmationError.facts` in the same generation's pending-confirmation state; retain it across further confirmation failures; Retry calls only `confirmScanIdentity`; promote to accepted facts only on success; clear on successful identity change/null, site change, rescan, or generation abort. Do not evaluate/export pending facts as an accepted scan. Chain replacement scans and site-list reloads behind the prior `runScan` settlement, including the cancellation-drain path tested here, so a list request does not overlap the four-file phase. This is part of the acceptance handoff, not an optional follow-up.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm test -- src/features/inspector/scan/scan.test.ts`

Expected: the reader suite passes, including partial inventory, S1 link shapes, environment causes, retained other evidence, max four started file operations, draining cancellation, and identity-only confirmation retry.

Run: `npm test -- src/services/pptb src/features/inspector/model src/skeleton.test.ts`

Expected: all host/model/skeleton suites pass. The model's status behavior for legacy `envvar-unreadable` fixtures is unchanged by optional `cause` metadata.

The integration owner additionally reruns the full typecheck/lint/build gates against the integration checkpoint. The healthy 50-record real scan ≤30 seconds, native host error shapes, and serialized-rescan UI proof remain assigned to their live/session owners.

- [ ] **Step 5: Commit the coherent change**

```bash
git add -- src/features/inspector/scan/queries.ts src/features/inspector/scan/parseRows.ts src/features/inspector/scan/scan.ts src/features/inspector/scan/scan.test.ts src/types/inspector.ts src/skeleton.test.ts
git commit --only -m "feat(inspector): read site facts with bounded draining scans" -- src/features/inspector/scan/queries.ts src/features/inspector/scan/parseRows.ts src/features/inspector/scan/scan.ts src/features/inspector/scan/scan.test.ts src/types/inspector.ts src/skeleton.test.ts
```

## Coverage and stop condition

Bounded planning verification completed on 2026-11-01 against the current integration checkout. All 22 complete code/patch blocks were extracted; all 63 existing-file hunks matched uniquely. Proposed source was checked through an in-memory TypeScript CompilerHost overlay and executed from scratch mirrors with Vitest import aliases. Production source was not edited.

| Exact verification command | Actual result |
| --- | --- |
| `node .scratch/phase5-2026-11-01/transport-typecheck.mjs` | Local TypeScript **6.0.3**: baseline **0 diagnostics**, proposed overlay **0 diagnostics**. |
| `npx vitest run --config .scratch/phase5-2026-11-01/transport-vitest.config.mjs` | Vitest **5.0.5**: **395 tests passed in 13 files**; all 9 new/changed test files plus 4 existing Inspector model regression files. |
| `npx vitest run --config .scratch/phase5-2026-11-01/transport-vitest.config.mjs scan.test.ts --outputFile .scratch/phase5-2026-11-01/transport-vitest-reader-results.json` | Final typed four-key initializer correction: **42 reader tests passed**; local compiler rerun also retained **0 baseline/overlay diagnostics**. |

Verification corrected two optional-signal tuple assertions for `exactOptionalPropertyTypes`. Probe fixtures passed with explicit DevTools arguments, an actual Buffer view with nonzero offset, validated Buffer JSON serialization, exact local byte/text comparisons, and shape-only retained evidence. No proposed compiler/test errors remain. Live S2 observations and the Task 6 session/UI integration are still pending; the execution tasks retain their own before/after gates.

| Requirement | Owning task and proof |
| --- | --- |
| S2 action shape, populated metadata, local comparison, actual versions | Task 2 VM tests plus explicitly pending live evidence table |
| 429/5xx 1s/2s/4s retries; 401/403/local/transport distinction | Task 3 retry/provenance suites |
| Earlier and strict-terminal page rows; unchanged nextLink; no arbitrary record cap | Task 3 paging implementation/tests; Task 5 validated partial inventory tests |
| Explicit logical table/primary ID; sequential 4 MiB or one nonchunked request | Task 3 file protocol and adapter tests |
| Canonical base64; full byte count; assembled fatal UTF-8/BOM; empty code | Task 3 file tests; existing model analysis-limit behavior |
| S1 type 35/11/18/9, role arrays, Parent chain facts, active/inactive inventory | Task 5 end-to-end query/parse/download/evaluate test |
| All four settings, normalization/active duplicates, no malformed defaults | Task 5 parser and settings tests |
| Current/default/secret/missing/denied/invalid/read-failed/unscanned distinctions | Task 5 environment fixtures and optional cause metadata |
| Completed evidence survives same-generation loss; untouched dependencies skipped | Task 5 inventory/configuration boundary and draining tests |
| Per-file role links survive code failure and available adverse findings remain | Task 5 anonymous-role/code-failure test, with Task 4 evidence rules |
| Cancellation discards stale scans after dispatched work drains | Task 3 and Task 5 cancellation tests; session serialization is a required Task 6 handoff |
| ID+URL confirmation, unknown refresh retains facts, identity-only retry | Task 5 `ScanConfirmationError`/`confirmScanIdentity` tests and required UI handoff |

Stop local implementation of these slices when their focused/regression suites pass and the Task 6 integration has adopted the pinned contracts. Inspector release readiness additionally requires the pending S2/session/live gates and the intended artifact's whole-repository checks to pass.
