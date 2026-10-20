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
