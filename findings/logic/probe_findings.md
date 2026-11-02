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
