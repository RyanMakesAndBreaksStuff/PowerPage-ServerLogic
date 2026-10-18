import { describe, expect, it } from 'vitest';
import { HTTP_METHODS } from '@/types/http';
import type { HttpMethod } from '@/types/http';
import type { RecipeId } from '@/types/recipe';
import {
  ACCOUNT_TEST_USER_LINE,
  EXAMPLE_GUID,
  RECIPES,
  UPSTREAM_CREDENTIALS_LINE,
  checklistLines,
  getRecipe,
  methodEnabled,
} from '@/services/catalogue/recipes';

const IDS: RecipeId[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'];

const NAMES: Record<RecipeId, string> = {
  R1: 'Read Dataverse records',
  R2: 'Validate a request',
  R3: 'Call an external API',
  R4: 'Dataverse CRUD',
  R5: 'External service CRUD',
  R6: 'Call an Azure Function',
  R7: 'Microsoft Graph & SharePoint',
  R8: 'Invoke from Liquid',
  R9: 'Trigger a cloud flow',
  R10: 'Call a Dataverse custom API',
};

const MAIN_OBJECT: Record<RecipeId, string> = {
  R1: 'Server.Connector.Dataverse',
  R2: 'Server.Context',
  R3: 'Server.Connector.HttpClient',
  R4: 'Server.Connector.Dataverse',
  R5: 'Server.Connector.HttpClient',
  R6: 'Server.Connector.HttpClient',
  R7: 'Server.Connector.HttpClient',
  R8: 'Server.Context',
  R9: 'Server.Connector.CloudFlow',
  R10: 'Server.Connector.Dataverse',
};

const FUNCTIONS: Record<RecipeId, string[]> = {
  R1: ['get'],
  R2: ['post'],
  R3: ['get'],
  R4: ['get', 'post', 'put', 'del'],
  R5: ['get', 'post', 'put', 'del'],
  R6: ['get'],
  R7: ['post'],
  R8: ['getSummary'],
  R9: ['post'],
  R10: ['get', 'post', 'patch'],
};

const DEFAULT_METHOD: Record<RecipeId, HttpMethod | null> = {
  R1: 'GET',
  R2: 'POST',
  R3: 'GET',
  R4: 'GET',
  R5: 'GET',
  R6: 'GET',
  R7: 'POST',
  R8: null,
  R9: 'POST',
  R10: 'GET',
};

const ENABLED: Record<RecipeId, HttpMethod[]> = {
  R1: ['GET'],
  R2: ['POST'],
  R3: ['GET'],
  R4: ['GET', 'POST', 'PUT', 'DELETE'],
  R5: ['GET', 'POST', 'PUT', 'DELETE'],
  R6: ['GET'],
  R7: ['POST'],
  R8: [],
  R9: ['POST'],
  R10: ['GET', 'POST', 'PATCH'],
};

const idsWhere = (test: (r: (typeof RECIPES)[number]) => boolean): string[] =>
  RECIPES.filter(test).map((r) => r.id);

describe('catalogue shape (AC-3.1)', () => {
  it('has the ten recipes R1 to R10 in order, with unique ids', () => {
    expect(RECIPES.map((r) => r.id)).toEqual(IDS);
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(10);
  });

  it('groups are core 3, tutorial 4, reference 3', () => {
    const count = (g: string): number => RECIPES.filter((r) => r.group === g).length;
    expect([count('core'), count('tutorial'), count('reference')]).toEqual([3, 4, 3]);
    expect(idsWhere((r) => r.group === 'core')).toEqual(['R1', 'R2', 'R3']);
    expect(idsWhere((r) => r.group === 'tutorial')).toEqual(['R4', 'R5', 'R6', 'R7']);
    expect(idsWhere((r) => r.group === 'reference')).toEqual(['R8', 'R9', 'R10']);
  });

  it('getRecipe returns the matching entry for every id', () => {
    for (const id of IDS) expect(getRecipe(id).id).toBe(id);
  });

  it.each(IDS)('%s has the spec name, main object and functions', (id) => {
    const recipe = getRecipe(id);
    expect(recipe.name).toBe(NAMES[id]);
    expect(recipe.mainObject).toBe(MAIN_OBJECT[id]);
    expect(recipe.functions).toEqual(FUNCTIONS[id]);
    expect(recipe.defaultMethod).toBe(DEFAULT_METHOD[id]);
  });

  it('only R8 has no default method', () => {
    expect(idsWhere((r) => r.defaultMethod === null)).toEqual(['R8']);
  });

  it('lists at least one server object per recipe, all under Server.', () => {
    for (const r of RECIPES) {
      expect(r.serverObjects.length).toBeGreaterThan(0);
      for (const o of r.serverObjects) expect(o.startsWith('Server.')).toBe(true);
    }
  });
});

describe('methodEnabled (AC-2.10)', () => {
  it.each(IDS)('%s enables exactly its own methods', (id) => {
    const recipe = getRecipe(id);
    const enabled = HTTP_METHODS.filter((m) => methodEnabled(recipe, m));
    expect(enabled).toEqual(ENABLED[id]);
  });

  it('R4 and R5 enable GET POST PUT DELETE but not PATCH', () => {
    for (const id of ['R4', 'R5'] as const) {
      expect(methodEnabled(getRecipe(id), 'PATCH')).toBe(false);
      for (const m of ['GET', 'POST', 'PUT', 'DELETE'] as const) {
        expect(methodEnabled(getRecipe(id), m)).toBe(true);
      }
    }
  });

  it('R10 enables GET POST PATCH; R8 enables none', () => {
    const r10 = getRecipe('R10');
    expect(HTTP_METHODS.filter((m) => methodEnabled(r10, m))).toEqual(['GET', 'POST', 'PATCH']);
    expect(HTTP_METHODS.some((m) => methodEnabled(getRecipe('R8'), m))).toBe(false);
  });

  it('every default method is enabled', () => {
    for (const r of RECIPES) {
      if (r.defaultMethod !== null) expect(methodEnabled(r, r.defaultMethod)).toBe(true);
    }
  });
});

describe('feature flags', () => {
  it('liquid only R1 and R8; readsLiquidInput only R8', () => {
    expect(idsWhere((r) => r.liquid)).toEqual(['R1', 'R8']);
    expect(idsWhere((r) => r.readsLiquidInput)).toEqual(['R8']);
  });

  it('demoPage only R4, R5, R6', () => {
    expect(idsWhere((r) => r.demoPage)).toEqual(['R4', 'R5', 'R6']);
  });

  it('every upstream-credential recipe is flagged and carries the line (F10)', () => {
    expect(idsWhere((r) => r.upstreamCredentials)).toEqual(['R3', 'R5', 'R6', 'R7', 'R9']);
    for (const r of RECIPES) {
      expect(r.permissionNote.endsWith(UPSTREAM_CREDENTIALS_LINE)).toBe(r.upstreamCredentials);
    }
    expect(UPSTREAM_CREDENTIALS_LINE).toBe(
      "Upstream calls use this integration's own credentials (site setting, app registration or flow connection), not the caller's.",
    );
  });
});

describe('tables, access types and Account access setup (F04)', () => {
  it('Account grants exist only in R1, R4 and R10, each with a relationship', () => {
    const withAccount = RECIPES.filter((r) => r.tables.some((t) => t.accessType === 'Account'));
    expect(withAccount.map((r) => r.id)).toEqual(['R1', 'R4', 'R10']);
    for (const r of RECIPES) {
      for (const t of r.tables) {
        if (t.accessType === 'Account') expect(t.relationship).not.toBeNull();
        else expect(t.relationship).toBeNull();
      }
    }
  });

  it('relationships: contact_customer_accounts for R1 and R4, "maker verifies" for R10', () => {
    expect(getRecipe('R1').tables[0]?.relationship).toBe('contact_customer_accounts');
    expect(getRecipe('R4').tables[0]?.relationship).toBe('contact_customer_accounts');
    expect(getRecipe('R10').tables[0]?.relationship).toBe('maker verifies');
  });

  it('every Account grant yields a relationship line and the test-user line, once each', () => {
    for (const id of ['R1', 'R4', 'R10'] as const) {
      const recipe = getRecipe(id);
      const lines = checklistLines(recipe);
      for (const t of recipe.tables.filter((g) => g.accessType === 'Account')) {
        expect(lines).toContain(
          `Account relationship for ${t.logicalName}: ${t.relationship ?? ''}`,
        );
      }
      expect(lines.filter((l) => l === ACCOUNT_TEST_USER_LINE)).toHaveLength(1);
    }
    expect(ACCOUNT_TEST_USER_LINE).toBe("Test users' contacts must have a parent account.");
    for (const id of ['R2', 'R3', 'R5', 'R6', 'R7', 'R8', 'R9'] as const) {
      expect(checklistLines(getRecipe(id))).not.toContain(ACCOUNT_TEST_USER_LINE);
    }
  });

  it('R1: Read on contact (contacts), Account', () => {
    expect(getRecipe('R1').tables).toEqual([
      {
        logicalName: 'contact',
        entitySetName: 'contacts',
        privileges: ['Read'],
        accessType: 'Account',
        relationship: 'contact_customer_accounts',
        note: null,
      },
    ]);
  });

  it('R4: two contact grants, Account Read/Write/Delete and Global Create with the F04 note', () => {
    const [account, create, ...rest] = getRecipe('R4').tables;
    expect(rest).toEqual([]);
    expect(account).toMatchObject({
      logicalName: 'contact',
      entitySetName: 'contacts',
      privileges: ['Read', 'Write', 'Delete'],
      accessType: 'Account',
      note: null,
    });
    expect(create).toMatchObject({
      logicalName: 'contact',
      entitySetName: 'contacts',
      privileges: ['Create'],
      accessType: 'Global',
      relationship: null,
    });
    expect(create?.note).toContain('Learn binds no account on create');
    expect(create?.note).toContain("isn't readable through the Account-scoped permission");
  });

  it('R7: Create on crd69_eventregistration, Global, flagged as expected', () => {
    const [grant, ...rest] = getRecipe('R7').tables;
    expect(rest).toEqual([]);
    expect(grant).toMatchObject({
      logicalName: 'crd69_eventregistration',
      entitySetName: 'crd69_eventregistrations',
      privileges: ['Create'],
      accessType: 'Global',
      relationship: null,
    });
    expect(grant?.note).toContain('Inspector flags Global access');
  });

  it('R10: Read and Write on account (accounts), Account', () => {
    expect(getRecipe('R10').tables).toEqual([
      {
        logicalName: 'account',
        entitySetName: 'accounts',
        privileges: ['Read', 'Write'],
        accessType: 'Account',
        relationship: 'maker verifies',
        note: null,
      },
    ]);
  });

  it('R2, R3, R5, R6, R8 and R9 have no table permissions', () => {
    for (const id of ['R2', 'R3', 'R5', 'R6', 'R8', 'R9'] as const) {
      expect(getRecipe(id).tables).toEqual([]);
    }
  });
});

describe('outbound domains, site settings and web roles', () => {
  it('outbound domains', () => {
    expect(getRecipe('R3').outboundDomains).toEqual(['<target-host>']);
    expect(getRecipe('R5').outboundDomains).toEqual(['services.odata.org']);
    expect(getRecipe('R6').outboundDomains).toEqual(['<function-app>.azurewebsites.net']);
    expect(getRecipe('R7').outboundDomains).toEqual([
      'login.microsoftonline.com',
      'graph.microsoft.com',
    ]);
    for (const id of ['R1', 'R2', 'R4', 'R8', 'R9', 'R10'] as const) {
      expect(getRecipe(id).outboundDomains).toEqual([]);
    }
  });

  it('site settings (AC-3.5)', () => {
    expect(getRecipe('R3').siteSettings).toEqual(['ExternalApi/BaseUrl']);
    expect(getRecipe('R6').siteSettings).toEqual(['AZURE_FUNCTION_URL']);
    expect(getRecipe('R7').siteSettings).toEqual([
      'CLIENT_ID',
      'CLIENT_SECRET',
      'TENANT_ID',
      'HOSTNAME',
      'SITE_PATH',
    ]);
    expect(getRecipe('R9').siteSettings).toEqual(['CLOUD_FLOW_ID']);
    for (const id of ['R1', 'R2', 'R4', 'R5', 'R8', 'R10'] as const) {
      expect(getRecipe(id).siteSettings).toEqual([]);
    }
  });

  it('web roles where the spec names one', () => {
    expect(getRecipe('R5').webRole).toBe('Administrators');
    expect(getRecipe('R6').webRole).toBe('Authenticated Users');
    for (const r of RECIPES) expect(r.webRole).not.toBe('');
  });
});

describe('permission note (AC-3.6, AC-5.5)', () => {
  it('names every table by logical name in backticks with its access type', () => {
    for (const r of RECIPES) {
      for (const t of r.tables) {
        expect(r.permissionNote).toContain(`\`${t.logicalName}\``);
        expect(r.permissionNote).toContain(t.accessType);
      }
    }
  });

  it('names every site setting in backticks', () => {
    for (const r of RECIPES) {
      for (const s of r.siteSettings) expect(r.permissionNote).toContain(`\`${s}\``);
    }
  });

  it('names every concrete outbound domain', () => {
    for (const r of RECIPES) {
      for (const d of r.outboundDomains.filter((x) => !x.includes('<'))) {
        expect(r.permissionNote).toContain(d);
      }
    }
  });

  it('R1 reads like the AC-5.5 example', () => {
    expect(getRecipe('R1').permissionNote).toBe(
      "Grant Read on `contact` with Account access to the caller's web role, then validate on your development site.",
    );
  });
});

describe('Learn links (AC-3.3, AC-3.10)', () => {
  const LEARN = 'https://learn.microsoft.com/en-us/power-pages/configure/';

  it('R1 to R3 have no Learn source; R4 to R10 link their page', () => {
    for (const id of ['R1', 'R2', 'R3'] as const) expect(getRecipe(id).learnUrl).toBeNull();
    expect(getRecipe('R4').learnUrl).toBe(`${LEARN}server-logic-operations`);
    expect(getRecipe('R5').learnUrl).toBe(`${LEARN}server-logic-external-services`);
    expect(getRecipe('R6').learnUrl).toBe(`${LEARN}server-logic-azure-function`);
    expect(getRecipe('R7').learnUrl).toBe(`${LEARN}server-logic-graph-sharepoint`);
    expect(getRecipe('R8').learnUrl).toBe(`${LEARN}author-server-logic`);
    expect(getRecipe('R9').learnUrl).toBe(`${LEARN}server-objects`);
    expect(getRecipe('R10').learnUrl).toBe(`${LEARN}server-objects`);
  });

  it('only R7 adds the GitHub sample package', () => {
    expect(getRecipe('R7').extraUrls).toEqual([
      'https://github.com/microsoft/power-pages-samples/tree/main/samples/server-logic/sharepoint-integration',
    ]);
    expect(idsWhere((r) => r.extraUrls.length > 0)).toEqual(['R7']);
  });
});

describe('prerequisites', () => {
  it('R1, R4 and R10 carry the Account test-user prerequisite', () => {
    for (const id of ['R1', 'R4', 'R10'] as const) {
      expect(getRecipe(id).prerequisites).toContain(ACCOUNT_TEST_USER_LINE);
    }
  });

  it('R9 states the flow prerequisite', () => {
    expect(getRecipe('R9').prerequisites).toEqual([
      'The flow must be created and added to the site with an authorized web role that the caller holds.',
    ]);
  });

  it('R10 carries the F07 lines and the unverified-identity line', () => {
    const p = getRecipe('R10').prerequisites;
    expect(p).toContain('Replace the three placeholder API names.');
    expect(p).toContain(
      "The custom API's request and response parameters must match what the handler sends and reads.",
    );
    expect(p).toContain('Review what each API changes beyond the bound record.');
    expect(p).toContain('The custom API must exist in the environment.');
    expect(p.some((l) => l.endsWith('maker verifies.'))).toBe(true);
  });

  it('R7 keeps the secret in Key Vault behind an environment variable', () => {
    expect(getRecipe('R7').prerequisites.join(' ')).toContain('Azure Key Vault');
  });
});

describe('example requests (F08)', () => {
  it('placeholder GUID', () => {
    expect(EXAMPLE_GUID).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('examples are keyed by exactly the recipe functions', () => {
    for (const r of RECIPES) {
      expect(Object.keys(r.examples).sort()).toEqual([...r.functions].sort());
    }
  });

  it('matches the spec table verbatim', () => {
    const ex = (id: RecipeId, fn: string) => getRecipe(id).examples[fn];
    expect(ex('R1', 'get')).toEqual({ query: null, body: null, liquidInput: null });
    expect(ex('R2', 'post')).toEqual({
      query: null,
      body: { name: 'Alton Stott', email: 'alton@contoso.com' },
      liquidInput: null,
    });
    expect(ex('R3', 'get')).toEqual({ query: '?q=contoso', body: null, liquidInput: null });
    expect(ex('R4', 'get')).toEqual({
      query: '?entitySetName=contacts&additionalParameters=$select=fullname,emailaddress1',
      body: null,
      liquidInput: null,
    });
    expect(ex('R4', 'post')).toEqual({
      query: '?entitySetName=contacts',
      body: { firstname: 'Alton', lastname: 'Stott', emailaddress1: 'alton@contoso.com' },
      liquidInput: null,
    });
    expect(ex('R4', 'put')).toEqual({
      query: `?entitySetName=contacts&id=${EXAMPLE_GUID}`,
      body: { telephone1: '555-123-4567' },
      liquidInput: null,
    });
    expect(ex('R4', 'del')).toEqual({
      query: `?entitySetName=contacts&id=${EXAMPLE_GUID}`,
      body: null,
      liquidInput: null,
    });
    expect(ex('R5', 'get')).toEqual({
      query: '?username=russellwhyte',
      body: null,
      liquidInput: null,
    });
    expect(ex('R5', 'post')).toEqual({
      query: null,
      body: {
        serviceSession: '(S(abc123))',
        UserName: 'altonstott',
        FirstName: 'Alton',
        LastName: 'Stott',
      },
      liquidInput: null,
    });
    expect(ex('R5', 'put')).toEqual({
      query: null,
      body: { serviceSession: '(S(abc123))', UserName: 'altonstott', LastName: 'Stott-Ray' },
      liquidInput: null,
    });
    expect(ex('R5', 'del')).toEqual({
      query: '?username=altonstott&serviceSession=(S(abc123))',
      body: null,
      liquidInput: null,
    });
    expect(ex('R6', 'get')).toEqual({ query: '?name=Alton', body: null, liquidInput: null });
    expect(ex('R8', 'getSummary')).toEqual({
      query: null,
      body: null,
      liquidInput: '{"category":"news","maximumResults":5}',
    });
    expect(ex('R9', 'post')).toEqual({
      query: null,
      body: { message: 'Hello' },
      liquidInput: null,
    });
    expect(ex('R10', 'get')).toEqual({
      query: `?id=${EXAMPLE_GUID}`,
      body: null,
      liquidInput: null,
    });
    expect(ex('R10', 'post')).toEqual({ query: null, body: {}, liquidInput: null });
    expect(ex('R10', 'patch')).toEqual({
      query: `?id=${EXAMPLE_GUID}`,
      body: {},
      liquidInput: null,
    });
  });

  it('R7 post is the one value deferred to Spike S3 (phase 19 replaces this assertion)', () => {
    expect(getRecipe('R7').examples.post).toEqual({
      query: null,
      body: null,
      liquidInput: null,
    });
  });

  it('no example keeps the literal <guid> placeholder', () => {
    expect(JSON.stringify(RECIPES.map((r) => r.examples))).not.toContain('<guid>');
  });
});

describe('checklistLines (AC-5.6)', () => {
  it('R1 lines, in order', () => {
    expect(checklistLines(getRecipe('R1'))).toEqual([
      'Web role: A web role the caller holds',
      'Table permission: contact (entity set contacts): Read, access type Account',
      'Account relationship for contact: contact_customer_accounts',
      ACCOUNT_TEST_USER_LINE,
    ]);
  });

  it('R5 lines list the role, the domain and nothing else', () => {
    expect(checklistLines(getRecipe('R5'))).toEqual([
      'Web role: Administrators',
      'Allowed domain: services.odata.org',
    ]);
  });

  it('R4 lists both contact grants and appends the Global Create note', () => {
    const lines = checklistLines(getRecipe('R4'));
    expect(lines[0]).toBe('Web role: A web role the caller holds');
    expect(lines[1]).toBe(
      'Table permission: contact (entity set contacts): Read, Write, Delete, access type Account',
    );
    expect(lines[2]).toBe('Account relationship for contact: contact_customer_accounts');
    expect(lines[3]).toMatch(
      /^Table permission: contact \(entity set contacts\): Create, access type Global\. Learn binds no account on create/,
    );
    expect(lines[4]).toBe(ACCOUNT_TEST_USER_LINE);
    expect(lines).toHaveLength(5);
  });

  it('R7 lists domains, the five settings and the grant', () => {
    const lines = checklistLines(getRecipe('R7'));
    expect(lines).toContain('Allowed domain: login.microsoftonline.com');
    expect(lines).toContain('Allowed domain: graph.microsoft.com');
    for (const s of ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_ID', 'HOSTNAME', 'SITE_PATH']) {
      expect(lines).toContain(`Site setting: ${s}`);
    }
    expect(lines.some((l) => l.startsWith('Table permission: crd69_eventregistration'))).toBe(true);
  });

  it('R10 shows "maker verifies" for the relationship and the F07 lines', () => {
    const lines = checklistLines(getRecipe('R10'));
    expect(lines).toContain('Account relationship for account: maker verifies');
    expect(lines).toContain('Replace the three placeholder API names.');
    expect(lines).toContain('Review what each API changes beyond the bound record.');
  });

  it('every line of every recipe is a non-empty plain string without a checkbox prefix', () => {
    for (const r of RECIPES) {
      const lines = checklistLines(r);
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) {
        expect(l.trim()).not.toBe('');
        expect(l.startsWith('- [')).toBe(false);
      }
    }
  });
});
