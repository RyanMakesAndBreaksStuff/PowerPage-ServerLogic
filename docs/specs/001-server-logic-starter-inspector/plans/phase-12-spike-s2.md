# PPTB Spike S2 Implementation Plan

**Goal:** Record the actual host contracts required for Inspector reads and local binary export before dependent live work.

**Architecture:** A copy-paste DevTools script records only result shapes, event keys, error names/status and boolean field availability. Phase 01 owns host adapter members; Phase 15 owns transport/partial-read mappings; S2 evidence selects the verified path and never silently changes the approved read-only rule.

**Tech stack:** Plain JavaScript in PPTB Tool DevTools, existing toolboxAPI/dataverseAPI, local binary/clipboard probes.

**Scope:** Spec FR-7 Spike S2, AC-7.6/7.10 and Phase 01 handoff.

**Out of scope:** Product deployment/publishing, Dataverse mutations, retrieving tokens or printing configuration values. Network/sign-in manipulation is owner-run.

**Part:** plan-inspector.md, ◆ owner-run Phase 12.

**Implements / Satisfies:** connection fields; events.off and connection:* payloads; Uint8Array save; clipboard; Prefer/nextLink; filecontent/$value shape; environment-variable table reads; quote/space filter encoding; network vs401vs403 evidence.

**Depends on:** Part A 01/06. Before live Phase15 execution. Drafting/testing Phase15 in fake host does not satisfy this gate.

**Files and Interfaces:** Task1 creates scripts/s2-probe.js; Task2 fills this file's evidence table; Task3 chooses the exact bounded adapter handoff. Consumers are Phase01/15. Produced window.s2Evidence, s2StopEvents(), s2SaveBytes(), s2Copy(), s2ReadFailure(label).

## Decisions

1. Read probes run immediately; local save and clipboard are explicit named calls so the owner chooses when to touch those surfaces. Network/expired-signin checks are manual steps because synthesizing a rejection cannot prove host behavior.
2. No secrets, handler text, setting values, connection URLs or IDs are printed. Result shapes suffice for mapping. Record PPTB/app/runtime version manually in the table. Filter probe uses a deliberately nonexistent name S2 O'Brien name; success with zero results verifies syntax/transport handling without creating a record. Use DevTools Network inspector to confirm percent encoding exactly once; a zero-row result alone does not prove double encoding.
3. Learn confirms nextLink and maxpagesize semantics, but not PPTB response serialization. Host error shape and file download are ◆ gates. File-column failure is a stop before15: a spec/rules update must authorize any different route.

---

### Task 1: Produce a runnable shape-only host probe

**Owns:** The complete S2 call inventory.

**Files:**
- Create: `scripts/s2-probe.js` — DevTools read/probe script.
- Signal: `node --check scripts/s2-probe.js` — parseable script.

- [x] **Step 1: Establish the observable pre-change signal**

```powershell
Test-Path scripts/s2-probe.js
```

- [x] **Step 2: Capture the current signal**

Run: `Test-Path scripts/s2-probe.js`

Expected: False: the probe file does not exist in the primary baseline.

- [x] **Step 3: Implement the minimum fix**

```js file=scripts/s2-probe.js
// Paste this entire script into Tool DevTools in PPTB. It performs read calls only.
// The two save/copy probes use owner-chosen local files and the clipboard.
(async () => {
  const evidence = [];
  const record = (item, result) => {
    evidence.push({ item, ...result });
    console.table(evidence);
  };
  const shape = (value) => ({
    type: typeof value,
    constructor: value?.constructor?.name ?? null,
    keys: value && typeof value === 'object' ? Object.keys(value) : [],
    bytes: value?.byteLength ?? value?.length ?? null,
  });
  const probe = async (item, call, inspect = shape) => {
    try {
      const value = await call();
      record(item, { outcome: 'returned', ...inspect(value) });
      return value;
    } catch (error) {
      record(item, {
        outcome: 'rejected',
        errorName: error?.name ?? typeof error,
        status: Number.isInteger(error?.status) ? error.status : null,
      });
      return null;
    }
  };
  const read = (path, headers = {}) => window.dataverseAPI.queryData(path, undefined, headers);
  const literal = (value) =>
    `'${encodeURIComponent(value.replaceAll("'", "''")).replaceAll("'", '%27')}'`;
  await probe(
    'connection',
    () => window.toolboxAPI.connections.getActiveConnection(),
    (value) => ({
      ...shape(value),
      hasId: typeof value?.id === 'string',
      hasName: typeof value?.name === 'string',
      hasUrl: typeof value?.url === 'string',
      environment: value?.environment ?? null,
    }),
  );
  record('events.off', { available: typeof window.toolboxAPI.events.off === 'function' });
  const listener = (eventArg, payloadArg) => {
    const payload = typeof payloadArg?.event === 'string' ? payloadArg : eventArg;
    if (typeof payload?.event === 'string' && payload.event.startsWith('connection:'))
      record('connection event', {
        event: payload.event,
        firstArgument: shape(eventArg),
        secondArgument: shape(payloadArg),
        payloadKeys: Object.keys(payload),
        dataShape: shape(payload.data),
        dataHasId: typeof payload.data?.id === 'string',
        dataHasUrl: typeof payload.data?.url === 'string',
      });
  };
  window.toolboxAPI.events.on(listener);
  window.s2StopEvents = () => window.toolboxAPI.events.off(listener);
  const first = await probe(
    'paging first',
    () =>
      read('powerpagecomponents?$select=powerpagecomponentid&$orderby=powerpagecomponentid', {
        Prefer: 'odata.maxpagesize=1',
      }),
    (value) => ({
      ...shape(value),
      rows: value?.value?.length ?? null,
      nextLink: typeof value?.['@odata.nextLink'] === 'string',
    }),
  );
  if (typeof first?.['@odata.nextLink'] === 'string') {
    const next = first['@odata.nextLink'].replace(
      /^https?:\/\/[^/]+\/api\/data\/v\d+(?:\.\d+)?\//,
      '',
    );
    await probe('paging second unchanged', () => read(next, { Prefer: 'odata.maxpagesize=1' }));
  }
  const logic = await probe('code inventory', () =>
    read(
      'powerpagecomponents?$select=powerpagecomponentid&$filter=powerpagecomponenttype eq 35&$orderby=powerpagecomponentid&$top=1',
    ),
  );
  const id = logic?.value?.[0]?.powerpagecomponentid;
  if (typeof id === 'string')
    await probe('filecontent/$value', () => read(`powerpagecomponents(${id})/filecontent/$value`));
  else record('filecontent/$value', { outcome: 'not run', reason: 'No type-35 record found' });
  await probe('environment definitions', () =>
    read(
      'environmentvariabledefinitions?$select=environmentvariabledefinitionid,schemaname,type,defaultvalue&$orderby=environmentvariabledefinitionid&$top=1',
    ),
  );
  await probe('environment values', () =>
    read(
      'environmentvariablevalues?$select=environmentvariablevalueid,_environmentvariabledefinitionid_value,value&$orderby=environmentvariablevalueid&$top=1',
    ),
  );
  await probe('apostrophe/space literal', () =>
    read(
      `powerpagecomponents?$select=powerpagecomponentid&$filter=name eq ${literal("S2 O'Brien name")}&$orderby=powerpagecomponentid`,
    ),
  );
  window.s2ReadFailure = (label) =>
    probe(label, () =>
      read('powerpagesites?$select=powerpagesiteid&$orderby=powerpagesiteid&$top=1'),
    );
  window.s2SaveBytes = () =>
    probe('Uint8Array save', () =>
      window.toolboxAPI.fileSystem.saveFile('s2-bytes.bin', new Uint8Array([0, 1, 127, 128, 255]), [
        { name: 'Binary', extensions: ['bin'] },
      ]),
    );
  window.s2Copy = () =>
    probe('clipboard', () => window.toolboxAPI.utils.copyToClipboard('S2 clipboard probe'));
  window.s2Evidence = evidence;
  console.info(
    'Now change another connection and rename/relabel the active one; record event shapes. Run s2SaveBytes() then verify exact bytes; run s2Copy() then paste locally. Drop network then run s2ReadFailure("network drop"); restore network, expire sign-in using the host UI, then run s2ReadFailure("expired sign-in"). Restore connection and call s2StopEvents(). Export only the shape table; no setting values, IDs, URLs, tokens or handler text are printed. Record PPTB/host version manually.',
  );
})();
```

- [x] **Step 4: Confirm the signal changed, and nothing else did**

Run: `Test-Path scripts/s2-probe.js`

Expected: `True`; the probe file now exists.

Run: `node --check scripts/s2-probe.js`

Expected: exit 0.

- [x] **Step 5: Commit the coherent change**

```powershell
git add -- scripts/s2-probe.js
git commit -m "test(pptb): add S2 host contract probe"
```

### Task 2: Record actual PPTB evidence (◆ owner)

**Owns:** Live S2 evidence, before adapter edits or Phase15 execution.

- [ ] Build: `npm run build`; expect exit0 and dist classic-script files.
- [ ] Load root with Debug → Load Local Tool, open Tool DevTools, paste the complete Task1 script and run it. Expect each read row returned/rejected with shape/error fields.
- [ ] Change another connection; rename/relabel the active one; select a different active connection. Record event keys and whether data identifies it.
- [ ] Run `await s2SaveBytes()`, choose a local .bin path and verify bytes exactly 00 01 7F 80 FF. Run `await s2Copy()` and paste locally; expect S2 clipboard probe.
- [ ] Drop network and run `await s2ReadFailure('network drop')`; restore it, expire sign-in through host controls and run `await s2ReadFailure('expired sign-in')`. Record error name/status for both. Restore connection and run `s2StopEvents()`; verify no additional event rows.
- [ ] Inspect DevTools network for filter O'Brien and space and nextLink skiptoken; confirm one decode and unchanged token. Compare file text only locally with the same record in studio.
- [ ] Fill every row below with actual host version/call/outcome; no pending value may be treated as success.

| Item | Exact call / evidence | Host/runtime version | Outcome at planning | Execution disposition |
| --- | --- | --- | --- | --- |
| Connection | getActiveConnection shape/id/name/url/environment | Not measured | Not run | Blocks live mapping acceptance |
| Events | events.on/off; connection created/updated/deleted payload keys | Not measured | Not run | Blocks event acceptance |
| Binary | s2SaveBytes and five-byte comparison | Not measured | Not run | Blocks save acceptance |
| Clipboard | s2Copy and local paste | Not measured | Not run | Blocks clipboard acceptance |
| Paging | queryData Prefer1 and unchanged nextLink second request | Not measured | Not run | Blocks Phase15 live paging |
| File column | type35id/filecontent/$value result shape and local studio comparison | Not measured | Not run | Blocks Phase15 live code read |
| Env definition | environmentvariabledefinitions selected columns | Not measured | Not run | Requires per-read failure handling if denied |
| Env value | environmentvariablevalues selected columns | Not measured | Not run | Requires per-read failure handling if denied |
| Literal | name eq quote/space literal + network URI | Not measured | Not run | Blocks literal transport acceptance |
| Network | s2ReadFailure after network drop, error.name/status | Not measured | Not run | Blocks transport classification acceptance |
| Expired sign-in | s2ReadFailure after host sign-in expiry | Not measured | Not run | Blocks401mapping acceptance |

Commit recorded evidence: `git add -- docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md`, then `git commit -m "docs(pptb): record live S2 evidence"`.

### Task 3: Apply the matching adapter handoff (after evidence)

**Owns:** Actual outcome-to-edit decision; no speculative adapter mutation. Phase01 § Spike S2 hand-off remains the source for member names.

| Observed outcome | Exact owner/edit and verification |
| --- | --- |
| nextLink returned, Prefer honored, relative path accepted unchanged | dataverseRead.ts NEXT_LINK_UNVERIFIED=false. Update only tests named ships with the strict gate on and fails closed on a full page. Run npx vitest run src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts; expect0 and complete paging. |
| nextLink differs or is stripped / Prefer or token encoding differs | Stop Phase15 execution. Author a replacement fetchAllPages/relativeNextLink step with captured shape/path, preserving PptbHost.queryAll and partialRows. Phase01 names FetchXML cookie paging as the supported alternative; its complete code must be reviewed and tested before execution, because the live shape is not yet known. |
| file $value returns string or value:string | Existing downloadColumnContent path; test captured shape fixture and expect downloaded code equals studio source. |
| file $value returns base64/bytes/new shape | downloadColumnContent owns one decoder; add captured shape fixture, explicit UTF-8 decode, then npx vitest run src/services/pptb/dataverseRead.test.ts. Do not choose a decoder without evidence. |
| file $value cannot be downloaded through read methods | STOP. Change approved spec/read-only rules before15; execute is currently forbidden. |
| Errors numeric status or another verified field | statusOf owns extraction. Add captured401/403/429/5xxfixtures; npx vitest run src/services/pptb/dataverseRead.test.ts src/services/pptb/hostReadPartial.test.ts. Preserve401transport stop and403readfailure. |
| No-status rejected network or sign-in shape | Phase15 toHostReadError maps no-status host rejection transport=true provisionally. Refine only with captured network name/status and local badShape cases; do not classify parser/validation failures as network. |
| events.off missing or payload different | createEventHub/toHostEvent in pptbHost.ts; use observed callback arguments for connection:* dispatch. Preserve id/URL comparison in23; run pptbHost.test.ts and ConnectionProvider.test.ts. |
| Uint8Array not accepted | saveFile in pptbHost.ts owns observed byte conversion; fixture verifies exact five bytes, save result and cancel. Do not modify renderPdf/buildZip. |
| Environment missing/unrecognized | Existing toEnvironment returns Unknown; test captured shape and persistent23warning. |
| Envvar tables denied | Keep per-check/read banner paths in15/11; record denied permission, never silently treat absent. |
| quote/space URI double encoded | odataLiteral/buildQueryPath in15/01 own boundary; test captured URI plus apostrophe, percent, ampersand cases before live retry. |

Run `npx tsc -b`, `npx eslint . --max-warnings=0`, `npx vitest run`; expect0 after any evidence-backed fix. Stage only edited adapter/test paths with `git add -- src/services/pptb` after checking that directory contains only the S2-owned diff, then `git commit -m "fix(pptb): align adapter with verified S2 host contract"`. A novel response shape requires a separate complete bounded plan before implementation; this explicit evidence gate is the sole intentionally deferred decision in the seven-phase set.

## Integration verification

All evidence rows populated; every contradiction has an approved spec change or passing captured-shape fixture. Reload tool after rebuild. S2 does not certify runtime table authorization or tenant policy.

## Verified while planning

2026-10-22: complete script passes node --check; calls match installed @pptb/types and Phase01 members. Microsoft Learn MCP search/fetch confirmed paging unchanged links, deterministic primary-key ordering, site-setting defaults and file-column API route. No live host call was performed. Baseline build/lint/tests pass; formatting baseline176files fail.

## Done when

- [x] Source: script parses and contains every S2 probe with shape-only output.
- [ ] Tests/build: captured shape fixtures and adapter checks pass.
- [ ] Rendered browser: DevTools script/load confirmed.
- [ ] Live PPTB: every evidence row filled; contradictions resolved before15; owner binary/clipboard/event/read outcomes recorded.
