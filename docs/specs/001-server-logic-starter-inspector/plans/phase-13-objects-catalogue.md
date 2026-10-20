# Phase 13: Server Objects catalogue

**Part:** `plan-server-objects.md`, wave S1.
**Implements:** FR-6 (the nine Learn-verified objects, their members, signatures with Learn's overloads, descriptions, return types only where Learn documents one, async and sync marks, Context invocation marks, samples) | **Satisfies:** AC-3.2 (every insertable Server Objects sample has zero FR-4 matches), the catalogue half of AC-6.2, AC-6.5, AC-6.8 (every sample inserts cleanly) and AC-6.9 (members in Learn's order). The page that shows them is Phase 22.
**Depends on:** 02 (`runBrowserChecks`), 03 (`usedServerMembers`, `readsHttpOnlyContext`, `planInsertion`). Nothing else; it can run in parallel with any Part B or C phase.
**Files:**
- Replace (whole file): `src/services/catalogue/serverObjects.ts` (the Phase 00 placeholder).
- Create: `src/services/catalogue/serverObjects.test.ts`.
- `src/skeleton.test.ts` keeps passing unchanged (it checks only that `SERVER_OBJECTS` is an array).

**Interfaces:**
- **Consumes:** `runBrowserChecks` (`@/lib/code-analysis/browserChecks`), `planInsertion`, `usedServerMembers`, `readsHttpOnlyContext` (`@/lib/code-analysis/structure`), all in tests only. The catalogue module itself imports nothing.
- **Produces** (exact names; Phase 22 relies on them): in `src/services/catalogue/serverObjects.ts`
  - `type MemberKind = 'method' | 'property'`, `type CallTiming = 'sync' | 'async'`, `type ContextScope = 'both' | 'http' | 'liquid'`
  - `type SampleVariant = { readonly label: string; readonly code: string }`
  - `type ObjectMember = { name; kind: MemberKind; signatures: readonly [string, ...string[]]; returns: string | null; timing: CallTiming | null; context: ContextScope | null; description; samples: readonly [SampleVariant, ...SampleVariant[]] }` (all `readonly`)
  - `type ServerObject = { path; description; members: readonly [ObjectMember, ...ObjectMember[]] }` (all `readonly`)
  - `NOT_DOCUMENTED = 'Not documented on Learn'`, `SERVER_OBJECTS: readonly ServerObject[]`, `isConnector(object: ServerObject): boolean`

This phase writes the catalogue as data: one module, no React, no host calls. The samples come from Learn's "Server objects" page (fetched 2026-10-20), rewritten as statements so Insert can place them in a handler.

## Decisions (recorded so Phase 22 does not re-argue them)

1. **`path` replaces the placeholder's `name`.** It is the key `usedServerMembers` returns (`Server.Connector.Dataverse`), so the page marks used objects with a plain `Map.has`. Only `skeleton.test.ts` imports the placeholder, and it doesn't read `name`.
2. **Non-empty tuples** (`readonly [T, ...T[]]`) for `signatures`, `samples` and `members`. Every object has a member and every member has a sample and a signature (FR-6 "at least one sample"), and `members[0]` is typed without `!` under `noUncheckedIndexedAccess`.
3. **`returns: null` means "Not documented on Learn".** The page shows `NOT_DOCUMENTED`. Only the connectors (correction 11, CloudFlow without `Headers`) and `Server.User.fullname` (`null when the caller is anonymous`, correction 16) carry a return type.
4. **`timing` is set on connectors only** (`async` for HttpClient and CloudFlow, `sync` for Dataverse; corrections 7 and 19). Other members have no documented call model, so they carry no mark.
5. **Every sample is statements only and insertable.** Learn's function-wrapped samples (CloudFlow's `async function post()`, Context's `getRequestInformation` and `getSummary`) become their bodies; Learn's Liquid tag isn't JavaScript, so the Liquid `Input` sample is the `JSON.parse(Server.Context.Input || "{}")` line. No sample needs an "insertable" flag, and AC-3.2's "every insertable sample" is every sample.
6. **Sample content rules:**
   - OData options without a leading `?` (correction 6).
   - `JSON.stringify` for payloads instead of Learn's hand-escaped strings.
   - A supported `contentType` on body calls (correction 12).
   - Only `Server.User.fullname`, behind a null guard (corrections 16 and 21). So the mock's "Filter by account" variant filters on a fixed example account id rather than `Server.User.parentcustomerid`.
   - No anonymous `function (`, `startswith`, `delete <name>` or browser API (correction 14, FR-4).
   - Learn's example id `…0001`.
   - `const` throughout.
   - Learn's DELETE header `{ contentType: … }` and its doubly encoded PATCH body are replaced with the `client_id` header and `{ capacity: "2 TB" }`.
7. **Variants:**
   - RetrieveMultipleRecords: "Filter by account", "Top N", "Expand lookup" (the mock's three; FR-6).
   - InvokeCustomApi: "Bound function", "Bound action", "Unbound action".
   - `Server.Context.HttpMethod`: "Example" plus "Request info", Learn's request-information sample.
   - Every other member: one variant labelled "Example".

   "Request info" sits on `HttpMethod` because it reads HTTP-only members. Attaching it to a "both" member such as `ActivityId` would make that member's sample disable Liquid (AC-4.7) and break the cross-check test below.
8. **Signatures are written without the object prefix** (`RetrieveRecord(entitySetName, id, options)`), as reference 03 shows them; a property's signature is its name.

---

- [ ] **Step 0: Preflight**

  ```bash
  git status --short
  grep -n "export function runBrowserChecks" src/lib/code-analysis/browserChecks.ts
  grep -n "export function planInsertion\|export function usedServerMembers\|export function readsHttpOnlyContext" src/lib/code-analysis/structure.ts
  grep -n "Placeholder type. Phase 13" src/services/catalogue/serverObjects.ts
  ```

  Expect: a clean tree (apart from unrelated work), all four exports found, and the Phase 00 placeholder still in place. If `planInsertion` is a stub, stop: this phase runs after Phase 03.

- [ ] **Step 1: Write the catalogue test**

```ts file=src/services/catalogue/serverObjects.test.ts
import { describe, expect, it } from 'vitest';
import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
import {
  planInsertion,
  readsHttpOnlyContext,
  usedServerMembers,
} from '@/lib/code-analysis/structure';
import { NOT_DOCUMENTED, SERVER_OBJECTS, isConnector } from './serverObjects';
import type { ObjectMember, ServerObject } from './serverObjects';

// FR-6's table, in order.
const FR6: readonly (readonly [string, readonly string[]])[] = [
  ['Server.Logger', ['Log', 'Warn', 'Error']],
  [
    'Server.Context',
    [
      'ActivityId',
      'Body',
      'FunctionName',
      'Headers',
      'HttpMethod',
      'Input',
      'QueryParameters',
      'ServerLogicName',
      'Url',
    ],
  ],
  ['Server.User', ['fullname']],
  [
    'Server.Connector.Dataverse',
    [
      'CreateRecord',
      'RetrieveRecord',
      'RetrieveMultipleRecords',
      'UpdateRecord',
      'DeleteRecord',
      'InvokeCustomApi',
    ],
  ],
  [
    'Server.Connector.HttpClient',
    ['GetAsync', 'PostAsync', 'PutAsync', 'PatchAsync', 'DeleteAsync'],
  ],
  ['Server.Connector.CloudFlow', ['TriggerAsync']],
  ['Server.Website', ['adx_primarydomain']],
  ['Server.SiteSetting', ['Get']],
  ['Server.EnvironmentVariable', ['get']],
];

const HANDLER = 'function get() {\n  return "{}";\n}\n';

function object(path: string): ServerObject {
  const found = SERVER_OBJECTS.find((o) => o.path === path);
  if (found === undefined) throw new Error(`no object ${path}`);
  return found;
}

function member(path: string, name: string): ObjectMember {
  const found = object(path).members.find((m) => m.name === name);
  if (found === undefined) throw new Error(`no member ${path}.${name}`);
  return found;
}

const ALL = SERVER_OBJECTS.flatMap((o) =>
  o.members.flatMap((m) => m.samples.map((s) => ({ object: o, member: m, sample: s }))),
);

describe('SERVER_OBJECTS (FR-6)', () => {
  it('lists the nine objects and their Learn members in order', () => {
    expect(SERVER_OBJECTS.map((o) => [o.path, o.members.map((m) => m.name)])).toEqual(FR6);
  });

  it('gives every object and member a description, and every member a signature naming it', () => {
    for (const o of SERVER_OBJECTS) {
      expect(o.description).not.toBe('');
      for (const m of o.members) {
        expect(m.description).not.toBe('');
        for (const signature of m.signatures) expect(signature.startsWith(m.name)).toBe(true);
      }
    }
  });

  it("lists Learn's overloads (options and skipCache)", () => {
    expect(member('Server.Connector.Dataverse', 'RetrieveRecord').signatures).toEqual([
      'RetrieveRecord(entitySetName, id)',
      'RetrieveRecord(entitySetName, id, options)',
      'RetrieveRecord(entitySetName, id, options, skipCache)',
    ]);
    expect(member('Server.Connector.Dataverse', 'RetrieveMultipleRecords').signatures).toHaveLength(
      3,
    );
  });

  it('marks properties: Context, User.fullname and Website.adx_primarydomain', () => {
    const properties = SERVER_OBJECTS.flatMap((o) =>
      o.members.filter((m) => m.kind === 'property').map((m) => `${o.path}.${m.name}`),
    );
    expect(properties).toEqual([
      ...object('Server.Context').members.map((m) => `Server.Context.${m.name}`),
      'Server.User.fullname',
      'Server.Website.adx_primarydomain',
    ]);
  });

  it('shows a return type only where Learn documents one (correction 11)', () => {
    for (const o of SERVER_OBJECTS) {
      for (const m of o.members) {
        if (isConnector(o)) {
          expect(m.returns).toContain('IsSuccessStatusCode');
          expect(m.returns?.includes('Headers')).toBe(o.path !== 'Server.Connector.CloudFlow');
        } else if (o.path === 'Server.User') {
          expect(m.returns).toBe('null when the caller is anonymous');
        } else {
          expect(m.returns).toBeNull();
        }
      }
    }
    expect(NOT_DOCUMENTED).toBe('Not documented on Learn');
  });

  it('marks HttpClient and CloudFlow async and Dataverse sync (corrections 7 and 19)', () => {
    for (const { object: o, member: m, sample } of ALL) {
      const expected =
        o.path === 'Server.Connector.Dataverse' ? 'sync' : isConnector(o) ? 'async' : null;
      expect(m.timing).toBe(expected);
      expect(/\bawait\b/.test(sample.code)).toBe(expected === 'async');
    }
  });

  it('marks each Context member by invocation context (correction 13)', () => {
    const marks = Object.fromEntries(
      object('Server.Context').members.map((m) => [m.name, m.context]),
    );
    expect(marks).toEqual({
      ActivityId: 'both',
      Body: 'http',
      FunctionName: 'both',
      Headers: 'http',
      HttpMethod: 'http',
      Input: 'liquid',
      QueryParameters: 'http',
      ServerLogicName: 'both',
      Url: 'http',
    });
    for (const o of SERVER_OBJECTS.filter((x) => x.path !== 'Server.Context')) {
      for (const m of o.members) expect(m.context).toBeNull();
    }
  });

  it("a Context member's samples read an HTTP-only property exactly when it is HTTP only (AC-4.7)", () => {
    for (const m of object('Server.Context').members) {
      for (const s of m.samples) expect(readsHttpOnlyContext(s.code)).toBe(m.context === 'http');
    }
  });

  it('has the sample variants FR-6 names', () => {
    const labels = (path: string, name: string): string[] =>
      member(path, name).samples.map((s) => s.label);
    expect(labels('Server.Connector.Dataverse', 'RetrieveMultipleRecords')).toEqual([
      'Filter by account',
      'Top N',
      'Expand lookup',
    ]);
    expect(labels('Server.Connector.Dataverse', 'InvokeCustomApi')).toEqual([
      'Bound function',
      'Bound action',
      'Unbound action',
    ]);
    expect(labels('Server.Context', 'HttpMethod')).toEqual(['Example', 'Request info']);
    for (const m of object('Server.Connector.HttpClient').members) {
      expect(m.samples).toHaveLength(1);
    }
  });

  it('passes OData options without a leading "?" (correction 6)', () => {
    for (const { sample } of ALL) expect(sample.code).not.toMatch(/"\?\$/);
  });

  it('passes a supported contentType on every HttpClient body call (correction 12)', () => {
    for (const m of object('Server.Connector.HttpClient').members) {
      const code = m.samples[0].code;
      if (m.signatures[0].includes('body')) expect(code).toContain('"application/json"');
    }
  });

  it('reads only fullname from Server.User, and guards null (corrections 16 and 21)', () => {
    for (const { sample } of ALL) {
      expect(sample.code).not.toMatch(/\b(contactid|parentcustomerid|Roles)\b/);
      if (sample.code.includes('Server.User')) expect(sample.code).toContain('Server.User ?');
    }
  });

  it('stores samples with LF line ends and no surrounding blank lines', () => {
    for (const { sample } of ALL) {
      expect(sample.code).not.toContain('\r');
      expect(sample.code).toBe(sample.code.trim());
    }
  });

  it('each sample references its own object and member (FR-6 used detection)', () => {
    for (const { object: o, member: m, sample } of ALL) {
      expect(usedServerMembers(sample.code).get(o.path)).toContain(m.name);
    }
  });
});

describe('every sample is insertable and has zero FR-4 hits (AC-3.2, AC-6.8)', () => {
  it.each(ALL.map((x) => [`${x.object.path}.${x.member.name} · ${x.sample.label}`, x.sample.code]))(
    '%s',
    (_name, code) => {
      expect(runBrowserChecks(code).hits).toEqual([]);
      const inserted = planInsertion(HANDLER, code, null, 'get');
      if (!inserted.ok) throw new Error(`insert failed: ${inserted.reason}`);
      expect(runBrowserChecks(inserted.text)).toEqual({ hits: [], parseFailed: false });
    },
  );
});
```

  Run: `npx vitest run src/services/catalogue/serverObjects.test.ts`

  Expect: FAIL against the placeholder. In the run on `9ecf8ac`, 8 tests failed, including `lists the nine objects and their Learn members in order` (`AssertionError: expected [] to deeply equal [ [ 'Server.Logger', …(1) ], …(8) ]`) and `lists Learn's overloads` (`Error: no object Server.Connector.Dataverse`), and the AC-3.2 suite reported `No test found in suite every sample is insertable and has zero FR-4 hits`.

- [ ] **Step 2: Write the catalogue**

```ts file=src/services/catalogue/serverObjects.ts
export type MemberKind = 'method' | 'property';
export type CallTiming = 'sync' | 'async'; // connectors only (corrections 7 and 19)
export type ContextScope = 'both' | 'http' | 'liquid'; // Server.Context only (correction 13)
export type SampleVariant = { readonly label: string; readonly code: string };
export type ObjectMember = {
  readonly name: string;
  readonly kind: MemberKind;
  readonly signatures: readonly [string, ...string[]]; // Learn's overloads, shortest first
  readonly returns: string | null; // null: NOT_DOCUMENTED
  readonly timing: CallTiming | null;
  readonly context: ContextScope | null;
  readonly description: string;
  readonly samples: readonly [SampleVariant, ...SampleVariant[]];
};
export type ServerObject = {
  readonly path: string; // as `usedServerMembers` keys it, e.g. 'Server.Connector.Dataverse'
  readonly description: string;
  readonly members: readonly [ObjectMember, ...ObjectMember[]];
};

export const NOT_DOCUMENTED = 'Not documented on Learn';

// Correction 11: the connector result. CloudFlow's has no Headers.
const RESULT =
  'Connector result { StatusCode, Body, IsSuccessStatusCode, ReasonPhrase, ServerError, ServerErrorMessage, Headers }; Body is a JSON string';
const FLOW_RESULT =
  'Connector result { StatusCode, Body, IsSuccessStatusCode, ReasonPhrase, ServerError, ServerErrorMessage }; Body is a JSON string';
const ID = '00000000-0000-0000-0000-000000000001'; // Learn's example id
const HEADERS = 'const headers = { client_id: "00001111-aaaa-2222-bbbb-3333cccc4444" };';

const one = (code: string): readonly [SampleVariant] => [{ label: 'Example', code }];

const logger = (name: string, description: string, message: string): ObjectMember => ({
  name,
  kind: 'method',
  signatures: [`${name}(message)`],
  returns: null,
  timing: null,
  context: null,
  description,
  samples: one(`Server.Logger.${name}("${message}");`),
});

const contextProperty = (
  name: string,
  context: ContextScope,
  description: string,
  samples: readonly [SampleVariant, ...SampleVariant[]],
): ObjectMember => ({
  name,
  kind: 'property',
  signatures: [name],
  returns: null,
  timing: null,
  context,
  description,
  samples,
});

const dataverse = (
  name: string,
  signatures: readonly [string, ...string[]],
  description: string,
  samples: readonly [SampleVariant, ...SampleVariant[]],
): ObjectMember => ({
  name,
  kind: 'method',
  signatures,
  returns: RESULT,
  timing: 'sync',
  context: null,
  description,
  samples,
});

const http = (verb: string, body: boolean, url: string, payload: string): ObjectMember => {
  const name = `${verb}Async`;
  const call = body ? `${name}(url, body, headers, "application/json")` : `${name}(url, headers)`;
  return {
    name,
    kind: 'method',
    signatures: [body ? `${name}(url, body, headers, contentType)` : `${name}(url, headers)`],
    returns: RESULT,
    timing: 'async',
    context: null,
    description: `Sends an HTTP ${verb.toUpperCase()} request to an allowed host.`,
    samples: one(
      [
        `const url = "${url}";`,
        ...(body ? [`const body = JSON.stringify(${payload});`] : []),
        HEADERS,
        `const response = await Server.Connector.HttpClient.${call};`,
      ].join('\n'),
    ),
  };
};

// Learn's request-information sample, as statements (FR-6 "Context: request info").
const REQUEST_INFO: SampleVariant = {
  label: 'Request info',
  code: [
    'const requestInfo = JSON.stringify({',
    '  activityId: Server.Context.ActivityId,',
    '  functionName: Server.Context.FunctionName,',
    '  httpMethod: Server.Context.HttpMethod,',
    '  serverLogicName: Server.Context.ServerLogicName,',
    '  url: Server.Context.Url',
    '});',
  ].join('\n'),
};

/**
 * FR-6: the nine Learn-verified objects in the spec's order, each member in Learn's order (AC-6.9 "Another sample"
 * follows it). Every sample is statements only, so it can be inserted into a handler function (AC-6.8), and has
 * zero FR-4 hits (AC-3.2). OData options have no leading `?` (correction 6); samples read only `Server.User.fullname`
 * (corrections 16 and 21).
 */
export const SERVER_OBJECTS: readonly ServerObject[] = [
  {
    path: 'Server.Logger',
    description: 'Writes diagnostic messages that you can view in the DevTools extension.',
    members: [
      logger('Log', 'Writes an information message.', 'Information message'),
      logger('Warn', 'Writes a warning message.', 'Warning message'),
      logger('Error', 'Writes an error message.', 'Error message'),
    ],
  },
  {
    path: 'Server.Context',
    description:
      'The current server logic invocation. Which properties exist depends on whether it was called over HTTP or from Liquid.',
    members: [
      contextProperty(
        'ActivityId',
        'both',
        'Unique identifier of the invocation, for correlating logs.',
        one('const activityId = Server.Context.ActivityId;'),
      ),
      contextProperty(
        'Body',
        'http',
        'Raw HTTP request body.',
        one('const input = JSON.parse(Server.Context.Body || "{}");'),
      ),
      contextProperty(
        'FunctionName',
        'both',
        "Name of the function being invoked. From Liquid, the tag's operation.",
        one('const functionName = Server.Context.FunctionName;'),
      ),
      contextProperty(
        'Headers',
        'http',
        'HTTP request headers.',
        one('const requestHeaders = Server.Context.Headers;'),
      ),
      contextProperty('HttpMethod', 'http', 'HTTP request method, such as GET or POST.', [
        { label: 'Example', code: 'const httpMethod = Server.Context.HttpMethod;' },
        REQUEST_INFO,
      ]),
      contextProperty(
        'Input',
        'liquid',
        "Input string from the serverlogic Liquid tag's input parameter. Parse structured input as JSON.",
        one('const input = JSON.parse(Server.Context.Input || "{}");'),
      ),
      contextProperty(
        'QueryParameters',
        'http',
        'Query-string parameters of the HTTP request.',
        one('const id = Server.Context.QueryParameters["id"];'),
      ),
      contextProperty(
        'ServerLogicName',
        'both',
        'Name of the server logic record being invoked.',
        one('const serverLogicName = Server.Context.ServerLogicName;'),
      ),
      contextProperty(
        'Url',
        'http',
        'Full URL of the HTTP request.',
        one('const requestUrl = Server.Context.Url;'),
      ),
    ],
  },
  {
    path: 'Server.User',
    description: 'The signed-in user. Server.User is null when the caller is anonymous.',
    members: [
      {
        name: 'fullname',
        kind: 'property',
        signatures: ['fullname'],
        returns: 'null when the caller is anonymous',
        timing: null,
        context: null,
        description: "Full name of the signed-in user's contact.",
        samples: one('const fullname = Server.User ? Server.User.fullname : null;'),
      },
    ],
  },
  {
    path: 'Server.Connector.Dataverse',
    description:
      'Creates, reads, updates and deletes Dataverse rows and invokes custom APIs. Tables are named by entity set name, for example accounts.',
    members: [
      dataverse(
        'CreateRecord',
        ['CreateRecord(entitySetName, payload)'],
        'Creates a row. The payload is a JSON string.',
        one(
          [
            'const created = Server.Connector.Dataverse.CreateRecord(',
            '  "accounts",',
            '  JSON.stringify({ name: "Contoso Ltd.", telephone1: "555-555-0100" })',
            ');',
          ].join('\n'),
        ),
      ),
      dataverse(
        'RetrieveRecord',
        [
          'RetrieveRecord(entitySetName, id)',
          'RetrieveRecord(entitySetName, id, options)',
          'RetrieveRecord(entitySetName, id, options, skipCache)',
        ],
        'Retrieves one row by id.',
        one(
          `const account = Server.Connector.Dataverse.RetrieveRecord("accounts", "${ID}", "$select=name,telephone1");`,
        ),
      ),
      dataverse(
        'RetrieveMultipleRecords',
        [
          'RetrieveMultipleRecords(entitySetName)',
          'RetrieveMultipleRecords(entitySetName, options)',
          'RetrieveMultipleRecords(entitySetName, options, skipCache)',
        ],
        'Retrieves rows with OData query options.',
        [
          {
            label: 'Filter by account',
            code: [
              'const contacts = Server.Connector.Dataverse.RetrieveMultipleRecords(',
              '  "contacts",',
              `  "$select=fullname,emailaddress1&$filter=_parentcustomerid_value eq ${ID}"`,
              ');',
            ].join('\n'),
          },
          {
            label: 'Top N',
            code: 'const accounts = Server.Connector.Dataverse.RetrieveMultipleRecords("accounts", "$select=name,emailaddress1&$top=3");',
          },
          {
            label: 'Expand lookup',
            code: [
              'const contacts = Server.Connector.Dataverse.RetrieveMultipleRecords(',
              '  "contacts",',
              '  "$select=fullname&$expand=parentcustomerid_account($select=name)"',
              ');',
            ].join('\n'),
          },
        ],
      ),
      dataverse(
        'UpdateRecord',
        ['UpdateRecord(entitySetName, id, payload)'],
        'Updates columns on a row by id. The payload is a JSON string.',
        one(
          `const updated = Server.Connector.Dataverse.UpdateRecord("accounts", "${ID}", JSON.stringify({ telephone1: "555-555-0100" }));`,
        ),
      ),
      dataverse(
        'DeleteRecord',
        ['DeleteRecord(entitySetName, id)'],
        'Deletes a row by id.',
        one(`const removed = Server.Connector.Dataverse.DeleteRecord("accounts", "${ID}");`),
      ),
      dataverse(
        'InvokeCustomApi',
        ['InvokeCustomApi(httpMethod, url)', 'InvokeCustomApi(httpMethod, url, payload)'],
        'Invokes a Dataverse custom API: a bound function, a bound action or an unbound action.',
        [
          {
            label: 'Bound function',
            code: [
              'const functionResult = Server.Connector.Dataverse.InvokeCustomApi(',
              '  "get",',
              `  "accounts(${ID})/Microsoft.Dynamics.CRM.new_CustomBoundFunction"`,
              ');',
            ].join('\n'),
          },
          {
            label: 'Bound action',
            code: [
              'const actionResult = Server.Connector.Dataverse.InvokeCustomApi(',
              '  "post",',
              `  "accounts(${ID})/Microsoft.Dynamics.CRM.new_CustomBoundAction",`,
              '  JSON.stringify({ parameter1: "value1" })',
              ');',
            ].join('\n'),
          },
          {
            label: 'Unbound action',
            code: 'const actionResult = Server.Connector.Dataverse.InvokeCustomApi("post", "new_Action", JSON.stringify({ parameter1: "value1" }));',
          },
        ],
      ),
    ],
  },
  {
    path: 'Server.Connector.HttpClient',
    description:
      'Sends HTTP requests to allowed external hosts. Request bodies support application/json, text/html and application/x-www-form-urlencoded.',
    members: [
      http('Get', false, 'https://contoso.com/objects', ''),
      http('Post', true, 'https://contoso.com/objects', '{ name: "Sample Account" }'),
      http('Put', true, 'https://contoso.com/objects/6', '{ name: "Updated Sample Account" }'),
      http('Patch', true, 'https://contoso.com/objects/6', '{ capacity: "2 TB" }'),
      http('Delete', false, 'https://contoso.com/objects/6', ''),
    ],
  },
  {
    path: 'Server.Connector.CloudFlow',
    description:
      "Triggers a Power Automate cloud flow that's added to the site. The caller must hold one of the flow's web roles.",
    members: [
      {
        name: 'TriggerAsync',
        kind: 'method',
        signatures: ['TriggerAsync(flowId)', 'TriggerAsync(flowId, payload)'],
        returns: FLOW_RESULT,
        timing: 'async',
        context: null,
        description:
          "Triggers the flow with an optional JSON payload keyed by the trigger's parameter names.",
        samples: one(
          [
            'const flowResponse = await Server.Connector.CloudFlow.TriggerAsync(',
            `  "${ID}",`,
            '  JSON.stringify({ Location: "Seattle" })',
            ');',
          ].join('\n'),
        ),
      },
    ],
  },
  {
    path: 'Server.Website',
    description: 'The current website record in Dataverse.',
    members: [
      {
        name: 'adx_primarydomain',
        kind: 'property',
        signatures: ['adx_primarydomain'],
        returns: null,
        timing: null,
        context: null,
        description: "The site's primary domain.",
        samples: one('const primaryDomain = Server.Website.adx_primarydomain;'),
      },
    ],
  },
  {
    path: 'Server.SiteSetting',
    description:
      "Reads site setting values for the current website. Don't put secrets in code: keep them in Azure Key Vault and reference them through a site setting.",
    members: [
      {
        name: 'Get',
        kind: 'method',
        signatures: ['Get(name)'],
        returns: null,
        timing: null,
        context: null,
        description: 'Reads one site setting by name.',
        samples: one('const searchEnabled = Server.SiteSetting.Get("Search/Enabled");'),
      },
    ],
  },
  {
    path: 'Server.EnvironmentVariable',
    description: 'Reads the value of an environment variable.',
    members: [
      {
        name: 'get',
        kind: 'method',
        signatures: ['get(schemaName)'],
        returns: null,
        timing: null,
        context: null,
        description: 'Reads one environment variable by schema name.',
        samples: one('const sitePath = Server.EnvironmentVariable.get("SITEPATH");'),
      },
    ],
  },
];

/** AC-6.5: `Connector` for `Server.Connector.*`, `Object` for the rest. */
export function isConnector(object: ServerObject): boolean {
  return object.path.startsWith('Server.Connector.');
}
```

- [ ] **Step 3: Run, check, commit**

  ```bash
  npx vitest run src/services/catalogue/serverObjects.test.ts src/skeleton.test.ts
  npx tsc -b
  npx eslint src/services/catalogue --max-warnings=0
  npx prettier --check src/services/catalogue --end-of-line auto
  git add src/services/catalogue/serverObjects.ts src/services/catalogue/serverObjects.test.ts
  git commit -m "feat(catalogue): add the nine Server objects with Learn samples"
  ```

  Expect: `serverObjects.test.ts` passes 47 tests (14 catalogue tests plus 33 samples in the AC-3.2 suite), `skeleton.test.ts` still passes, and tsc, ESLint and Prettier exit 0.

- [ ] **Step 4: Full suite**

  ```bash
  npx vitest run
  ```

  Expect: all green. On `9ecf8ac` the baseline was 72 files and 1,037 tests, and this phase adds 1 file and 47 tests. `browserChecks.test.ts > performance` is load-sensitive; if it alone fails, rerun it.

## Verified while planning (2026-10-20)

Both files were drafted at their paths on `001-server-objects` (`9ecf8ac`) and run: 47 tests passed, tsc, ESLint and Prettier were clean, and the full suite stayed green. Findings that shaped the phase:

1. Every sample, inserted by `planInsertion` into `function get() {\n  return "{}";\n}\n`, parses and has zero FR-4 hits. The HttpClient and CloudFlow samples also get `async` added, so the trial parse covers the async rule.
2. `usedServerMembers` finds each sample's own object and member, so a typo in a member name or a sample would fail a test rather than silently leave the "used" pill unlit.
3. `readsHttpOnlyContext` agrees with every Context member's scope mark, which is why "Request info" belongs to `HttpMethod` (Decision 7).

## Done when

- `SERVER_OBJECTS` lists the FR-6 table exactly, in order, with Learn's overloads, return types, timing and context marks.
- Every sample has zero FR-4 hits and inserts cleanly (AC-3.2), and is detected as using its own member.
- The full suite, tsc, ESLint and Prettier are clean.
