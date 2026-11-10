# Spike S2 probe findings

Recorded 2026-10-23 from the owner PPTB Tool DevTools session on 2026-10-22. The probe is `scripts/s2-probe.js`. Shapes only: no connection id, name, URL, skiptoken, saved path, or handler text is stored here.

Host and runtime version were not recorded. No adapter code was changed. A pending row is not a success.

## Accepted

### Connection

`getActiveConnection()` returned a plain `Object`. `bytes` is null.

Keys, in order: `id`, `name`, `url`, `environment`, `createdAt`, `lastUsedAt`, `isActive`, `category`, `environmentColor`, `categoryColor`, `enabledForPowerPlatformAPI`, `scopesForPowerPlatformAPI`.

`hasId`, `hasName`, and `hasUrl` are true. `environment` is `Dev`. The id is a digit string, not a GUID. The adapter guard accepts this shape, and `toEnvironment` already maps `Dev`.

The first console table also showed a rejection: `error.name` `Error`, no numeric status, after about 10 seconds. The later export and the direct await returned the object above.

### Clipboard

Two `s2Copy()` calls returned `undefined`. The local paste was exactly `S2 clipboard probe`. `copyToClipboard` resolves to `undefined`.

### Binary save

`s2SaveBytes()` returned a `String` of length 39. The saved file is 5 bytes: `00 01 7F 80 FF`. `saveFile` accepted a `Uint8Array` and was not cancelled. No byte conversion is needed in `saveFile`.

## Observed, not closed

### Events

`events.off` is a function. After a connection change, three `connection:updated` rows were recorded. No `connection:created` or `connection:deleted` row was recorded.

Each chosen payload had 3 keys. `data.id` is a string. `data.url` is not a string. The console table collapsed both callback arguments and the payload key names, so the `(event, payload)` split is not accepted yet.

The later `s2Evidence` export has no `connection:*` rows. Those three rows remain from the earlier console table. `s2StopEvents()` was not followed by a connection change that confirmed the listener stopped.

The installed types describe `off` as taking the same callback passed to `on`, and each payload as `event`, `data`, and `timestamp`. That matches the count of 3 keys. It is the type contract, not a live key-name dump.

### Paging

The first `queryData` page, with `Prefer: odata.maxpagesize=1`, returned an `Object` with keys `@odata.context`, `value`, and `@odata.nextLink`. `rows` was 1 and `nextLink` was true.

The relative second read returned an `Object` with the same three keys, including another `@odata.nextLink`.

A later check of the server-issued link:

- `nextLink` type is `string`
- it contains literal `$skiptoken`
- it does not contain `%24skiptoken`
- it contains `%25`

`%25` is inside the server-issued link. It was not compared with the second request, so it does not prove that the client double-encoded the token. `NEXT_LINK_UNVERIFIED` stays `true` until the Network panel shows that second request once.

### Environment variable tables

Both reads returned an `Object` and were not denied.

Keys: `@odata.context`, `@Microsoft.Dynamics.CRM.totalrecordcount`, `@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded`, `@Microsoft.Dynamics.CRM.globalmetadataversion`, `value`.

The export does not say whether `value` had any rows.

### Quote and space filter

The filter `name eq` the encoded `S2 O'Brien name` literal returned an `Object` with the same five keys as the other `$top=1` reads. The call was accepted. The row count and the request URI were not in the export. Literal transport stays open until Network shows that URI once.

## Blocking

### File column

A type-35 row was found. `powerpagecomponents(<id>)/filecontent/$value` returned:

- type `object`
- constructor `Object`
- enumerable keys `[]`
- own names `[]`
- `bytes` null

It is not a string, not `{ value: string }`, and not a `Blob` or typed array. The object has no file text and no hidden own properties. Studio comparison was not done.

`downloadColumnContent` cannot use this result. Do not pick a decoder. Do not switch the read to `execute`. This blocks a live Phase 15 handler-code read until the spec and the read-only rule change, or a later read returns a shape that carries the file text.

## Not run

- Host and runtime version.
- Network drop, then `s2ReadFailure("network drop")`. Error name and status were not captured.
- Expired sign-in, then `s2ReadFailure("expired sign-in")`. Error name and status were not captured.
- Network-panel check of the second paging request: literal `$skiptoken`, `%24skiptoken`, and `%2525`.
- Network-panel check of the quote/space request: `O%27%27Brien` and `%20`, versus `%2527` and `%2520`.
- `s2StopEvents()`, then one more connection change, to confirm no new event row.

## Adapter effect

No file under `src/services/pptb` was edited from this probe.

| Outcome | Effect |
| --- | --- |
| Connection `environment` is `Dev` | No `toEnvironment` change. |
| `Uint8Array` save matches `00 01 7F 80 FF` | No `saveFile` conversion. |
| Clipboard returns `undefined` | No clipboard change. |
| File `$value` is an empty object | Stop. No decoder. `execute` stays forbidden. |
| Paging second page returned; wire token not compared | Leave `NEXT_LINK_UNVERIFIED` true. |
| Environment tables returned | Denied path was not observed. |
| Quote/space call returned | URI encoding still open. |
| `connection:updated` seen; key names collapsed | Do not change `createEventHub` yet. |
| Network and expired sign-in not run | Do not classify no-status errors from this session. |

## 2026-11-01 Phase 5 continuation — superseding transport decision

Spec 4.1.0 permits `InitializeFileBlocksDownload` and `DownloadBlock` through `dataverseAPI.execute` inside the host adapter (owner decision 2026-10-31, `phasse5plan.md`). The 2026-10-22 `$value` → `{}` observation above stays valid: `queryData` returns parsed JSON and cannot carry a byte body. It says nothing about the two actions, which Microsoft Learn ("Use file column data") documents for downloading existing content. Local fixture success (`tests/s2Probe.test.ts`) is not a live result.

`scripts/s2-probe.js` now installs manual operations and makes no host call on paste. `s2DownloadKnown(recordId)` requires the owner's populated type-35 record ID, validates `filecontent_name` and a `regardingfieldname = filecontent` FileAttachment row *before* opening the native file picker, performs the two actions, and records shape, byte-count and byte/text comparison facts only. `s2Environment(scenario, schema)`, `s2Paging(siteId)` and `s2VerifyWire(kind, actualUrl)` also require explicit DevTools arguments. `readBinary` is declared as `Promise<Buffer>` in `@pptb/types` 1.2.7; the probe records the returned shape first, then copies the exact byte view. No source, filename, path, connection/site/record identifier, request URL, continuation token or setting value belongs in committed evidence.

| Observation | Manual operation | Status on 2026-11-01 |
| --- | --- | --- |
| Host and runtime versions | `s2Versions(host, runtime)` from the PPTB About dialog | Pending |
| Populated handler: metadata, initializer property types, `Data` base64, byte count, UTF-8 text equality | `await s2DownloadKnown(recordId)` | Pending — fixture coverage only |
| Site-scoped type-35 paging (max 5 pages at page size 1), full terminal page | `await s2Paging(siteId)` | Pending |
| Second request URL equals the issued nextLink | `s2VerifyWire('nextLink', urlFromNetworkPanel)` | Pending; `NEXT_LINK_UNVERIFIED` stays true |
| Apostrophe/space literal encoded once | `await s2Literal()` then `s2VerifyWire('literal', urlFromNetworkPanel)` | Pending |
| Connection shape; callback argument shapes on created/updated/deleted | `await s2Connection()`; `s2StartEvents()`; edit another connection, rename and relabel the active one | Pending |
| Unsubscribe after a further connection change | `s2StopEvents()`; change a connection; `s2CheckStopped()` | Pending |
| Nonsecret current/default/missing/denied; secret → no value read | `await s2Environment(scenario, schema)` for each scenario | Pending; owner supplies schema names locally |
| Network-loss rejection shape | drop the network; `await s2ReadFailure('network drop')` | Pending; an unknown no-status error stays a local failure |
| Expired sign-in rejection shape | expire sign-in in the host UI; `await s2ReadFailure('expired sign-in')` | Pending |
| Explicit 403 denial | `await s2ReadFailure('403 denial')` with a denied identity | Pending |

When a live gate runs, replace only that row's status with passed/failed plus the versions from `s2Versions`; keep failed observations. A byte or text mismatch, or a `Data` shape other than base64, requires a targeted protocol correction in `src/services/pptb/dataverseFiles.ts` before release; never guess a decoder or disable the paging guard.

<!-- probe-evidence:start -->
## Automated live evidence

Generated by `node scripts/probe-evidence.mjs` on 2026-11-10 from the latest `npm run probe:live:connected` reports. PPTB 1.2.8 (fork 91f2ad7), Electron 39.8.10. Site inventory: 2 server logic records, 42 environment variable definitions.

| Observation | Status | Proved by |
| --- | --- | --- |
| Host and runtime versions | passed | `live/s2-dev.json`: record host and runtime versions |
| Populated handler: metadata, Data base64, byte count, UTF-8 text equality | failed | `live/s2-dev.json`: populated handler download matches |
| Site-scoped type-35 paging | passed | `live/s2-dev.json`: paging probe returned; `live/s2-dev.json`: second page request was made |
| Second request URL equals the issued nextLink | passed | `live/s2-dev.json`: nextLink wire passed; `connected/site-paging.json`: the tool passed the issued nextLink to the host unchanged |
| Apostrophe/space literal encoded once | passed | `live/s2-dev.json`: literal wire passed |
| Connection shape; callback argument shapes | passed | `live/s2-dev.json`: connection shape returned; `live/s2-dev.json`: connection events reached the tool |
| Unsubscribe after a further connection change | passed | `live/s2-dev.json`: unsubscribe check passed |
| Nonsecret current/default/missing/denied | passed | `live/s2-dev.json`: environment variable: current; `live/s2-dev.json`: environment variable: default; `live/s2-dev.json`: environment variable: missing; `live/s2-restricted.json`: environment variable: denied |
| Secret environment variable | not run | `live/s2-dev.json`: environment variable: secret |
| Explicit 403 denial | passed | `live/s2-restricted.json`: 403 denial is rejected; `live/s2-restricted.json`: 403 host call failed |
| Network-loss and expired sign-in rejection shapes | passed | `pending/site-list-failures.json`: network: no host error text on screen; `pending/site-list-failures.json`: expired sign-in: no host error text on screen (injected host faults; a real network drop and token expiry stay manual) |
| Retrieval only at runtime | passed | `live/s2-dev.json`: dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock; `connected/scan-canned.json`: dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock |
<!-- probe-evidence:end -->
