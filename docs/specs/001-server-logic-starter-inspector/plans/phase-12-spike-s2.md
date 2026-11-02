# PPTB Spike S2 Implementation Plan

> **Execution superseded — 2026-11-01.** `../../../phase-5/plans/p5-1_plan.md`, `../../../phase-5/plans/p5-2_plan.md` and `../../../phase-5/plans/p5-3_plan.md` (and later P5.x plans) own the remaining Inspector implementation, contracts and check commands. This file keeps the stable phase IDs, design choices and probe outcomes; its code blocks, `$value` fallback, blanket API prohibition, Prettier commands and sequencing are not current execution instructions. New S2 observations are appended below the existing table without rewriting historical rows.

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

> The checklist below describes the 2026-10-22 flow. The 2026-11-01 continuation operations are listed in `findings/logic/probe_findings.md`.

- [ ] Build: `npm run build`; expect exit0 and dist classic-script files.
- [ ] Load root with Debug → Load Local Tool, open Tool DevTools, paste the complete Task1 script and run it. Expect each read row returned/rejected with shape/error fields.
- [ ] Change another connection; rename/relabel the active one; select a different active connection. Record event keys and whether data identifies it.
- [ ] Run `await s2SaveBytes()`, choose a local .bin path and verify bytes exactly 00 01 7F 80 FF. Run `await s2Copy()` and paste locally; expect S2 clipboard probe.
- [ ] Drop network and run `await s2ReadFailure('network drop')`; restore it, expire sign-in through host controls and run `await s2ReadFailure('expired sign-in')`. Record error name/status for both. Restore connection and run `s2StopEvents()`; verify no additional event rows.
- [ ] Inspect DevTools network for filter O'Brien and space and nextLink skiptoken; confirm one decode and unchanged token. Compare file text only locally with the same record in studio.
- [ ] Fill every row below with actual host version/call/outcome; no pending value may be treated as success.

| Item | Exact call / evidence | Host/runtime version | Outcome at planning | Execution disposition |
| --- | --- | --- | --- | --- |
| Connection | getActiveConnection shape/id/name/url/environment | Not in the 2026-10-22 DevTools log | Exported evidence: `returned`, constructor `Object`, `bytes` null. Keys, in order: `id`, `name`, `url`, `environment`, `createdAt`, `lastUsedAt`, `isActive`, `category`, `environmentColor`, `categoryColor`, `enabledForPowerPlatformAPI`, `scopesForPowerPlatformAPI`. `hasId`, `hasName`, and `hasUrl` are true. `environment` is `Dev`. No connection values copied. The first console table had also shown a no-status `Error` rejection. | Success shape matches the adapter guard. `toEnvironment` already maps `Dev`. |
| Events | events.on/off; connection created/updated/deleted payload keys | Not in the 2026-10-22 DevTools log | `events.off` is a function. After the connection change, three `connection:updated` rows. Each chosen payload has 3 keys. `data.id` is a string. `data.url` is not a string. No `connection:created` or `connection:deleted`. Argument and payload key names were collapsed in the table. | `events.off` and `connection:updated` were observed. Key names are still required before accepting the `(event, payload)` split. |
| Binary | s2SaveBytes and five-byte comparison | Not in the 2026-10-22 DevTools log | `saveFile` returned a string, constructor `String`, length 39. The saved file is 5 bytes, `00 01 7F 80 FF`. The path was not copied into this table. | Save accepted. `Uint8Array` needs no conversion in `saveFile`. |
| Clipboard | s2Copy and local paste | Not in the 2026-10-22 DevTools log | Two `s2Copy` calls returned `undefined`. Local paste was exactly `S2 clipboard probe`. | Clipboard accepted. `copyToClipboard` resolves to `undefined`. |
| Paging | queryData Prefer1 and unchanged nextLink second request | Not in the 2026-10-22 DevTools log | First page: `returned`, `Object`, keys `@odata.context`, `value`, `@odata.nextLink`, `rows` 1, `nextLink` true. Relative second read: `returned`, `Object`, same three keys, including `@odata.nextLink`. A later boolean check of the server-issued link: `nextLink` is a string, it contains literal `$skiptoken`, it does not contain `%24skiptoken`, and it contains `%25`. That `%25` was not compared with the second request. | Prefer produced one row and a next link. The relative second read returned another linked page. `%25` in the server-issued link is not proof the client double-encoded it. Do not clear `NEXT_LINK_UNVERIFIED` until Network shows the second request once. |
| File column | type35id/filecontent/$value result shape and local studio comparison | Not in the 2026-10-22 DevTools log | A type-35 row was found. `$value` returned constructor `Object`, enumerable keys `[]`, own names `[]`, `bytes` null. Not a string, not `{ value: string }`, and not a `Blob` or typed array. Studio comparison was not done. | Expected per Learn ("Use file column data"): `$value` answers with a raw byte body and `x-ms-file-size`/`x-ms-file-name`/`mimetype` headers, and `queryData` (@pptb/types 1.2.7) returns parsed JSON only. No decoder exists for this shape; `execute` stays forbidden. Phase 15 follows spec FR-7's fallback ("couldn't read handler code", per file, non-transport). Confirm the file is populated with the File metadata row before accepting. |
| File metadata | `powerpagecomponents(<id>)?$select=powerpagecomponentid,filecontent_name` and `powerpagecomponents(<id>)?$select=powerpagecomponentid&$expand=powerpagecomponent_FileAttachments($select=filename,filesizeinbytes,mimetype)` (Learn "Retrieve extra information about files for a record"; shape only: record `typeof filecontent_name`, the expanded row count and whether `filesizeinbytes` > 0, never the name) | Not measured | Not run (added 2026-10-23) | Rules out an empty file as the cause of the `{}` result. A populated file with `{}` from `$value` closes the File column row as "no read-only path". |
| Env definition | environmentvariabledefinitions selected columns | Not in the 2026-10-22 DevTools log | `returned`, `Object`. Keys: `@odata.context`, `@Microsoft.Dynamics.CRM.totalrecordcount`, `@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded`, `@Microsoft.Dynamics.CRM.globalmetadataversion`, `value`. Not a denial. | Denied path was not observed. |
| Env value | environmentvariablevalues selected columns | Not in the 2026-10-22 DevTools log | `returned`, `Object`, with the same five keys as the definition read. Not a denial. | Denied path was not observed. |
| Literal | name eq quote/space literal + network URI | Not in the 2026-10-22 DevTools log | `returned`, `Object`, with the same five keys as the other `$top=1` reads. Row count and the request URI were not in the export. | The filter call was accepted. Literal transport stays open until Network shows that URI once. |
| Network | s2ReadFailure after network drop, error.name/status | Not measured | Not run | Blocks transport classification acceptance |
| Expired sign-in | s2ReadFailure after host sign-in expiry | Not measured | Not run | Blocks401mapping acceptance |
| Phase 5 action continuation | Manual `s2DownloadKnown(recordId)`: owner-selected populated type 35, `filecontent_name` + `regardingfieldname = filecontent` attachment, unbound initializer + sequential blocks, local byte/text comparison | Not measured | Pending — no live action during planning | See `findings/logic/probe_findings.md`, 2026-11-01 continuation. The `$value` and no-status rows above stay historical; fixtures permit local implementation (P5.2), not release acceptance. |

Exported `s2Evidence` pasted 2026-10-22. It has no `connection:*` rows; those remain from the earlier console table. Host version was not recorded. Task 2 stays open: no pending row counts as success.

Commit recorded evidence: `git add -- docs/specs/001-server-logic-starter-inspector/plans/phase-12-spike-s2.md`, then `git commit -m "docs(pptb): record live S2 evidence"`.

### Task 3: Apply the matching adapter handoff (after evidence)

**Owns:** Actual outcome-to-edit decision; no speculative adapter mutation. Phase01 § Spike S2 hand-off remains the source for member names.

| Observed outcome | Exact owner/edit and verification |
| --- | --- |
| nextLink returned, Prefer honored, relative path accepted unchanged | dataverseRead.ts NEXT_LINK_UNVERIFIED=false. Update only tests named ships with the strict gate on and fails closed on a full page. Run npx vitest run src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts; expect0 and complete paging. |
| nextLink differs or is stripped / Prefer or token encoding differs | Stop Phase15 execution. Author a replacement fetchAllPages/relativeNextLink step with captured shape/path, preserving PptbHost.queryAll and partialRows. Phase01 names FetchXML cookie paging as the supported alternative; its complete code must be reviewed and tested before execution, because the live shape is not yet known. |
| file $value returns string or value:string | Existing downloadColumnContent path; test captured shape fixture and expect downloaded code equals studio source. |
| file $value returns base64/bytes/new shape | downloadColumnContent owns one decoder; add captured shape fixture, explicit UTF-8 decode, then npx vitest run src/services/pptb/dataverseRead.test.ts. Do not choose a decoder without evidence. |
| file $value returns `{}` (observed 2026-10-22) with a populated file | `downloadColumnContent` keeps its `Unexpected file response from Dataverse.` throw (a local `HostReadError`, status null, `transport: false`). Add a `{}` fixture to `src/services/pptb/dataverseRead.test.ts` asserting the throw and no retry (not 429/5xx). Phase 15's per-file code read becomes `{ ok: false, reason: 'read-failed' }`; Phase 11 reports "couldn't read handler code" (not reviewable). Do not add a decoder, `execute`, `Range` reads or `retrieve` (Learn: a retrieved file column is only the file id). Lifting the limit is a spec change or a PPTB host feature, outside Phase 15. |
| file $value cannot be downloaded through read methods and the file is empty or absent | Not a host limit: the record has no code. Phase 15 maps an empty file to an empty string, and Phase 11's existing empty-code rule applies. Re-run the File column probe on a record with a populated `filecontent_name` before concluding anything about the host. |
| Errors numeric status or another verified field | statusOf owns extraction. Add captured401/403/429/5xxfixtures; npx vitest run src/services/pptb/dataverseRead.test.ts src/services/pptb/hostReadPartial.test.ts. Preserve401transport stop and403readfailure. |
| No-status rejected network or sign-in shape | Phase15 toHostReadError maps no-status host rejection transport=true provisionally. Refine only with captured network name/status and local badShape cases; do not classify parser/validation failures as network. The 2026-10-22 run saw one no-status `Error` from `getActiveConnection()` after about 10 s with the network up, followed by a success, so a no-status rejection on its own is not loss evidence; the network-drop and expired-sign-in rows are still required before Phase 15's mapping is accepted. |
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

2026-10-23 (review of the first live run against Learn): "Use file column data" documents the single-request download as a raw byte body with `x-ms-file-size`, `x-ms-file-name` and `mimetype` headers, chunked download through `InitializeFileBlocksDownload`/`DownloadBlock` (actions) or a `Range` GET, and a retrieved file column as only the file id plus `<column>_name`. "Page results using OData" says the `@odata.nextLink` value must not be changed or encoded further and the same `odata.maxpagesize` must be sent on every page. "Filter rows using OData" confirms a single-value apostrophe is doubled. "Server logic overview" lists exactly `ServerLogic/Enabled` (true), `ServerLogic/AllowedDomains` (all domains), `ServerLogic/TimeoutInSeconds` (120, up to 240) and `ServerLogic/AllowNetworkingToAllDomains` (true), matching `SETTING_NAMES` and the Phase 11 defaults. `powerpagecomponent` reference: `filecontent` is a File column (128 MB max) with `filecontent_name`; `content` is a 1 MB Memo; type 35 is Server Logic.

## Done when

- [x] Source: script parses and contains every S2 probe with shape-only output.
- [ ] Tests/build: captured shape fixtures and adapter checks pass.
- [ ] Rendered browser: DevTools script/load confirmed.
- [ ] Live PPTB: every evidence row filled; contradictions resolved before15; owner binary/clipboard/event/read outcomes recorded.
- [ ] Second run owed (2026-10-23): Network panel for the second paging request and the quote/space filter; `Object.keys` of both listener arguments; `s2StopEvents()` then one connection change; environment-variable row counts; the File metadata row; host version; network drop; expired sign-in.
