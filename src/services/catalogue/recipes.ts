import { METHOD_FUNCTION } from '@/types/http';
import type { HttpMethod } from '@/types/http';
import type { ExampleRequest, RecipeId, RecipeMeta } from '@/types/recipe';

/** `<guid>` in the spec's Example requests table. */
export const EXAMPLE_GUID = '00000000-0000-0000-0000-000000000000';

/** FR-3 Upstream credentials (F10): in the permission note of R3, R5, R6, R7, R9 and in README.md. */
export const UPSTREAM_CREDENTIALS_LINE =
  "Upstream calls use this integration's own credentials (site setting, app registration or flow connection), not the caller's.";

/** FR-3 Account access setup (F04): the second checklist line for every Account-scoped grant. */
export const ACCOUNT_TEST_USER_LINE = "Test users' contacts must have a parent account.";

const LEARN = 'https://learn.microsoft.com/en-us/power-pages/configure/';
const R7_SAMPLE =
  'https://github.com/microsoft/power-pages-samples/tree/main/samples/server-logic/sharepoint-integration';
const CALLER_ROLE = 'A web role the caller holds';
const NO_INPUT: ExampleRequest = { query: null, body: null, liquidInput: null };

const withUpstreamLine = (note: string): string => `${note} ${UPSTREAM_CREDENTIALS_LINE}`;

/**
 * Ten recipes, literal from spec FR-3. `functions` lists handler entry points only: R7's
 * getAccessToken and escapeHtml are file-private helpers (see the phase 05 Decisions).
 * `examples` is keyed by function name; queries keep their leading "?".
 */
export const RECIPES: readonly RecipeMeta[] = [
  {
    id: 'R1',
    name: 'Read Dataverse records',
    group: 'core',
    defaultMethod: 'GET',
    functions: ['get'],
    mainObject: 'Server.Connector.Dataverse',
    serverObjects: ['Server.Logger', 'Server.Connector.Dataverse.RetrieveMultipleRecords'],
    tables: [
      {
        logicalName: 'contact',
        entitySetName: 'contacts',
        privileges: ['Read'],
        accessType: 'Account',
        relationship: 'contact_customer_accounts',
        note: null,
      },
    ],
    outboundDomains: [],
    siteSettings: [],
    webRole: CALLER_ROLE,
    permissionNote:
      "Grant Read on `contact` with Account access to the caller's web role, then validate on your development site.",
    prerequisites: [ACCOUNT_TEST_USER_LINE],
    learnUrl: null,
    extraUrls: [],
    liquid: true,
    readsLiquidInput: false,
    upstreamCredentials: false,
    demoPage: false,
    examples: { get: NO_INPUT },
  },
  {
    id: 'R2',
    name: 'Validate a request',
    group: 'core',
    defaultMethod: 'POST',
    functions: ['post'],
    mainObject: 'Server.Context',
    serverObjects: ['Server.Context.Body', 'Server.Logger'],
    tables: [],
    outboundDomains: [],
    siteSettings: [],
    webRole: CALLER_ROLE,
    permissionNote:
      "Assign the caller's web role to this server logic, then validate on your development site. No table permissions are needed: the handler rejects invalid input before any data access.",
    prerequisites: [],
    learnUrl: null,
    extraUrls: [],
    liquid: false,
    readsLiquidInput: false,
    upstreamCredentials: false,
    demoPage: false,
    examples: {
      post: {
        query: null,
        body: { name: 'Alton Stott', email: 'alton@contoso.com' },
        liquidInput: null,
      },
    },
  },
  {
    id: 'R3',
    name: 'Call an external API',
    group: 'core',
    defaultMethod: 'GET',
    functions: ['get'],
    mainObject: 'Server.Connector.HttpClient',
    serverObjects: ['Server.Connector.HttpClient.GetAsync', 'Server.SiteSetting'],
    tables: [],
    outboundDomains: ['<target-host>'],
    siteSettings: ['ExternalApi/BaseUrl'],
    webRole: CALLER_ROLE,
    permissionNote: withUpstreamLine(
      "Add the target API's host to the allowed domains, set `ExternalApi/BaseUrl`, and assign the caller's web role to this server logic, then validate on your development site.",
    ),
    prerequisites: [],
    learnUrl: null,
    extraUrls: [],
    liquid: false,
    readsLiquidInput: false,
    upstreamCredentials: true,
    demoPage: false,
    examples: { get: { query: '?q=contoso', body: null, liquidInput: null } },
  },
  {
    id: 'R4',
    name: 'Dataverse CRUD',
    group: 'tutorial',
    defaultMethod: 'GET',
    functions: ['get', 'post', 'put', 'del'],
    mainObject: 'Server.Connector.Dataverse',
    serverObjects: [
      'Server.Context.QueryParameters',
      'Server.Context.Body',
      'Server.Connector.Dataverse.RetrieveRecord',
      'Server.Connector.Dataverse.RetrieveMultipleRecords',
      'Server.Connector.Dataverse.CreateRecord',
      'Server.Connector.Dataverse.UpdateRecord',
      'Server.Connector.Dataverse.DeleteRecord',
      'Server.Logger',
    ],
    tables: [
      {
        logicalName: 'contact',
        entitySetName: 'contacts',
        privileges: ['Read', 'Write', 'Delete'],
        accessType: 'Account',
        relationship: 'contact_customer_accounts',
        note: null,
      },
      {
        logicalName: 'contact',
        entitySetName: 'contacts',
        privileges: ['Create'],
        accessType: 'Global',
        relationship: null,
        note: "Learn binds no account on create, so an Account-scoped Create can't place the new contact in the caller's scope. Inspector flags this Global Create grant; that is expected. The new contact isn't readable through the Account-scoped permission until it's linked to the caller's account.",
      },
    ],
    outboundDomains: [],
    siteSettings: [],
    webRole: CALLER_ROLE,
    permissionNote:
      "Grant Read, Write and Delete on `contact` with Account access, and Create on `contact` with Global access, to the recipe's web role, then validate on your development site.",
    prerequisites: [ACCOUNT_TEST_USER_LINE],
    learnUrl: `${LEARN}server-logic-operations`,
    extraUrls: [],
    liquid: false,
    readsLiquidInput: false,
    upstreamCredentials: false,
    demoPage: true,
    examples: {
      get: {
        query: '?entitySetName=contacts&additionalParameters=$select=fullname,emailaddress1',
        body: null,
        liquidInput: null,
      },
      post: {
        query: '?entitySetName=contacts',
        body: { firstname: 'Alton', lastname: 'Stott', emailaddress1: 'alton@contoso.com' },
        liquidInput: null,
      },
      put: {
        query: `?entitySetName=contacts&id=${EXAMPLE_GUID}`,
        body: { telephone1: '555-123-4567' },
        liquidInput: null,
      },
      del: { query: `?entitySetName=contacts&id=${EXAMPLE_GUID}`, body: null, liquidInput: null },
    },
  },
  {
    id: 'R5',
    name: 'External service CRUD',
    group: 'tutorial',
    defaultMethod: 'GET',
    functions: ['get', 'post', 'put', 'del'],
    mainObject: 'Server.Connector.HttpClient',
    serverObjects: [
      'Server.Connector.HttpClient.GetAsync',
      'Server.Connector.HttpClient.PostAsync',
      'Server.Connector.HttpClient.PatchAsync',
      'Server.Connector.HttpClient.DeleteAsync',
      'Server.Context',
      'Server.Logger',
    ],
    tables: [],
    outboundDomains: ['services.odata.org'],
    siteSettings: [],
    webRole: 'Administrators',
    permissionNote: withUpstreamLine(
      'Add `services.odata.org` to the allowed domains (replace it if you point at another service) and assign the Administrators web role, then validate on your development site.',
    ),
    prerequisites: [],
    learnUrl: `${LEARN}server-logic-external-services`,
    extraUrls: [],
    liquid: false,
    readsLiquidInput: false,
    upstreamCredentials: true,
    demoPage: true,
    examples: {
      get: { query: '?username=russellwhyte', body: null, liquidInput: null },
      post: {
        query: null,
        body: {
          serviceSession: '(S(abc123))',
          UserName: 'altonstott',
          FirstName: 'Alton',
          LastName: 'Stott',
        },
        liquidInput: null,
      },
      put: {
        query: null,
        body: { serviceSession: '(S(abc123))', UserName: 'altonstott', LastName: 'Stott-Ray' },
        liquidInput: null,
      },
      del: {
        query: '?username=altonstott&serviceSession=(S(abc123))',
        body: null,
        liquidInput: null,
      },
    },
  },
  {
    id: 'R6',
    name: 'Call an Azure Function',
    group: 'tutorial',
    defaultMethod: 'GET',
    functions: ['get'],
    mainObject: 'Server.Connector.HttpClient',
    serverObjects: [
      'Server.Connector.HttpClient.GetAsync',
      'Server.Context.QueryParameters',
      'Server.SiteSetting',
    ],
    tables: [],
    outboundDomains: ['<function-app>.azurewebsites.net'],
    siteSettings: ['AZURE_FUNCTION_URL'],
    webRole: 'Authenticated Users',
    permissionNote: withUpstreamLine(
      "Set `AZURE_FUNCTION_URL`, add your function app's host to the allowed domains and assign the Authenticated Users web role, then validate on your development site.",
    ),
    prerequisites: [],
    learnUrl: `${LEARN}server-logic-azure-function`,
    extraUrls: [],
    liquid: false,
    readsLiquidInput: false,
    upstreamCredentials: true,
    demoPage: true,
    examples: { get: { query: '?name=Alton', body: null, liquidInput: null } },
  },
  {
    id: 'R7',
    name: 'Microsoft Graph & SharePoint',
    group: 'tutorial',
    defaultMethod: 'POST',
    functions: ['post'],
    mainObject: 'Server.Connector.HttpClient',
    serverObjects: [
      'Server.SiteSetting',
      'Server.Connector.HttpClient.PostAsync',
      'Server.Connector.HttpClient.GetAsync',
      'Server.Connector.HttpClient.PutAsync',
      'Server.Connector.Dataverse.CreateRecord',
    ],
    tables: [
      {
        logicalName: 'crd69_eventregistration',
        entitySetName: 'crd69_eventregistrations',
        privileges: ['Create'],
        accessType: 'Global',
        relationship: null,
        note: "Inspector flags Global access for review; that is expected. The table comes from Learn's sample solution; replace it with your own.",
      },
    ],
    outboundDomains: ['login.microsoftonline.com', 'graph.microsoft.com'],
    siteSettings: ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_ID', 'HOSTNAME', 'SITE_PATH'],
    webRole: CALLER_ROLE,
    permissionNote: withUpstreamLine(
      "Set `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `HOSTNAME` and `SITE_PATH`, allow `login.microsoftonline.com` and `graph.microsoft.com`, and grant Create on `crd69_eventregistration` with Global access to the caller's web role, then validate on your development site.",
    ),
    prerequisites: [
      'Hold the client secret in Azure Key Vault and surface it through an environment variable behind the `CLIENT_SECRET` site setting.',
    ],
    learnUrl: `${LEARN}server-logic-graph-sharepoint`,
    extraUrls: [R7_SAMPLE],
    liquid: false,
    readsLiquidInput: false,
    upstreamCredentials: true,
    demoPage: false,
    // The one deferred value: the body is "the fields Spike S3 sets". Phase 19 replaces it after S3.
    examples: { post: NO_INPUT },
  },
  {
    id: 'R8',
    name: 'Invoke from Liquid',
    group: 'reference',
    defaultMethod: null,
    functions: ['getSummary'],
    mainObject: 'Server.Context',
    serverObjects: [
      'Server.Context.Input',
      'Server.Context.ActivityId',
      'Server.Context.FunctionName',
      'Server.Context.ServerLogicName',
    ],
    tables: [],
    outboundDomains: [],
    siteSettings: [],
    webRole: 'A web role the visiting user holds',
    permissionNote:
      'Assign a web role the visiting user holds to this server logic, then validate on your development site. No table permissions are needed.',
    prerequisites: [],
    learnUrl: `${LEARN}author-server-logic`,
    extraUrls: [],
    liquid: true,
    readsLiquidInput: true,
    upstreamCredentials: false,
    demoPage: false,
    examples: {
      getSummary: {
        query: null,
        body: null,
        liquidInput: '{"category":"news","maximumResults":5}',
      },
    },
  },
  {
    id: 'R9',
    name: 'Trigger a cloud flow',
    group: 'reference',
    defaultMethod: 'POST',
    functions: ['post'],
    mainObject: 'Server.Connector.CloudFlow',
    serverObjects: ['Server.Connector.CloudFlow.TriggerAsync', 'Server.Logger'],
    tables: [],
    outboundDomains: [],
    siteSettings: ['CLOUD_FLOW_ID'],
    webRole: 'An authorized web role that the caller holds',
    permissionNote: withUpstreamLine(
      'Create the cloud flow, add it to the site with a web role the caller holds, and set `CLOUD_FLOW_ID`, then validate on your development site.',
    ),
    prerequisites: [
      'The flow must be created and added to the site with an authorized web role that the caller holds.',
    ],
    learnUrl: `${LEARN}server-objects`,
    extraUrls: [],
    liquid: false,
    readsLiquidInput: false,
    upstreamCredentials: true,
    demoPage: false,
    examples: { post: { query: null, body: { message: 'Hello' }, liquidInput: null } },
  },
  {
    id: 'R10',
    name: 'Call a Dataverse custom API',
    group: 'reference',
    defaultMethod: 'GET',
    functions: ['get', 'post', 'patch'],
    mainObject: 'Server.Connector.Dataverse',
    serverObjects: [
      'Server.Connector.Dataverse.InvokeCustomApi',
      'Server.Context.QueryParameters',
      'Server.Context.Body',
      'Server.Logger',
    ],
    tables: [
      {
        logicalName: 'account',
        entitySetName: 'accounts',
        privileges: ['Read', 'Write'],
        accessType: 'Account',
        relationship: 'maker verifies',
        note: null,
      },
    ],
    outboundDomains: [],
    siteSettings: [],
    webRole: CALLER_ROLE,
    permissionNote:
      "Grant Read and Write on `account` with Account access to the caller's web role and replace the three placeholder API names (`new_CustomBoundFunction`, `new_Action`, `new_CustomBoundAction`), then validate on your development site.",
    prerequisites: [
      ACCOUNT_TEST_USER_LINE,
      'Replace the three placeholder API names.',
      "The custom API's request and response parameters must match what the handler sends and reads.",
      'Review what each API changes beyond the bound record.',
      'The custom API must exist in the environment.',
      "Which identity Dataverse checks for the API's ExecutePrivilegeName when server logic calls it is unverified: maker verifies.",
    ],
    learnUrl: `${LEARN}server-objects`,
    extraUrls: [],
    liquid: false,
    readsLiquidInput: false,
    upstreamCredentials: false,
    demoPage: false,
    examples: {
      get: { query: `?id=${EXAMPLE_GUID}`, body: null, liquidInput: null },
      post: { query: null, body: {}, liquidInput: null },
      patch: { query: `?id=${EXAMPLE_GUID}`, body: {}, liquidInput: null },
    },
  },
];

export function getRecipe(id: RecipeId): RecipeMeta {
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) throw new Error(`Unknown recipe ${id}`);
  return recipe;
}

/** AC-2.10: a method pill is enabled only if the recipe exports that method's function. */
export function methodEnabled(recipe: RecipeMeta, method: HttpMethod): boolean {
  return recipe.functions.includes(METHOD_FUNCTION[method]);
}

/**
 * Source lines for permission-checklist.md (AC-5.6): web role, tables, Account relationship,
 * allowed domains, site settings, then prerequisites (which hold the Account test-user line).
 * Plain text; Phase 14 adds the "- [ ] " prefix.
 */
export function checklistLines(recipe: RecipeMeta): readonly string[] {
  const lines: string[] = [`Web role: ${recipe.webRole}`];
  for (const t of recipe.tables) {
    const note = t.note === null ? '' : `. ${t.note}`;
    lines.push(
      `Table permission: ${t.logicalName} (entity set ${t.entitySetName}): ${t.privileges.join(', ')}, access type ${t.accessType}${note}`,
    );
    if (t.accessType === 'Account') {
      lines.push(
        `Account relationship for ${t.logicalName}: ${t.relationship ?? 'maker verifies'}`,
      );
    }
  }
  for (const d of recipe.outboundDomains) lines.push(`Allowed domain: ${d}`);
  for (const s of recipe.siteSettings) lines.push(`Site setting: ${s}`);
  lines.push(...recipe.prerequisites);
  return lines;
}
