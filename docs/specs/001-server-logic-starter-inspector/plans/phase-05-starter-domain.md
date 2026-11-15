# Phase 05: Starter domain: recipe catalogue, slug, LF, handler snippets

**Implements:** FR-2 (slugify, ten recipes), FR-3 (the recipe metadata tables, Account access setup, Upstream credentials, Example requests, and the shared Musts: missing-setting rule, logging rule, `toResult`, GUID) and FR-5 (the `permission-checklist.md` source lines) | **Satisfies:** AC-2.2, AC-2.3, AC-2.6 (function data), AC-2.10 (`methodEnabled`), AC-2.11, AC-3.1 (catalogue data), AC-3.3, AC-3.4 (function data), AC-3.5 and AC-3.6 (data), AC-3.10, AC-4.10 (`normalizeLf`), AC-5.5 (note text), AC-5.6 (checklist lines), Learn corrections 11, 16 and 19 (data and snippets)
**Depends on:** 00
**Files:**
- Replace the Phase 00 stubs: `src/lib/slug.ts`, `src/lib/text.ts`, `src/services/catalogue/recipes.ts`.
- Create: `src/services/generators/handlers/snippets.ts`.
- Create tests: `src/lib/slug.test.ts`, `src/lib/text.test.ts`, `src/services/catalogue/recipes.test.ts`, `src/services/generators/handlers/snippets.test.ts`, `src/services/generators/handlers/snippets.fr4.test.ts`. If Phase 00 left a placeholder test at one of these paths, overwrite it.
- Edits no other file. Phase 19 later edits exactly one value in `recipes.ts` (R7's `examples.post`, see Decisions).

**Interfaces:**
- **Consumes** (Phase 00 contracts, unchanged):
  - `src/types/http.ts`: `HttpMethod`, `METHOD_FUNCTION`.
  - `src/types/recipe.ts`: `RecipeId`, `RecipeGroup`, `AccessType`, `Privilege`, `TableGrant`, `ExampleRequest`, `RecipeMeta`.
  - Test-only, from Phase 02: `runBrowserChecks(code: string): BrowserCheckResult` in `@/lib/code-analysis/browserChecks`. It is a Phase 00 stub that throws `not implemented: phase 02` until Phase 02 merges at the wave boundary.
- **Produces** (exact names; later phases rely on them):
  - `src/lib/slug.ts`: `slugify(name: string): { slug: string; differs: boolean }`.
  - `src/lib/text.ts`: `normalizeLf(text: string): string`.
  - `src/services/catalogue/recipes.ts`:
    - `RECIPES: readonly RecipeMeta[]` (R1 to R10, in order);
    - `getRecipe(id: RecipeId): RecipeMeta`;
    - `methodEnabled(recipe: RecipeMeta, method: HttpMethod): boolean`;
    - `checklistLines(recipe: RecipeMeta): readonly string[]` (plain text, no `- [ ] ` prefix; Phase 14 adds the prefix and the "Needs attention" marking);
    - `UPSTREAM_CREDENTIALS_LINE: string`, `ACCOUNT_TEST_USER_LINE: string`, `EXAMPLE_GUID: string`.
  - `src/services/generators/handlers/snippets.ts`:
    - consts `TO_RESULT`, `GUID_PATTERN`, `IS_GUID`, `VALIDATION_MESSAGE`;
    - types `FieldError`, `LogLevel`, `LogField`, `LogLineInput`;
    - functions `headerComment(recipe: RecipeMeta): string`, `settingVar(name: string): string`, `requireSettingsCode(names: readonly string[], indent: string): string`, `failureReturn(message: string, indent?: string): string`, `validationFailureReturn(errors: readonly FieldError[], indent?: string): string`, `validationFailureReturnFor(errorsVar: string, indent?: string): string`, `logLine(i: LogLineInput): string`.

This phase builds the pure Starter domain that the handler, client, package and session phases all read: the slug rules, LF normalisation, the ten-recipe catalogue with its checklist lines, and the shared emitted-code snippets. Everything is a pure function or a constant. No React, no host access, no eval.

## Decisions (recorded here so later phases do not re-argue them)

1. **`functions` lists handler entry points only.** R7's `getAccessToken` (and its `escapeHtml`) are file-private helpers, so R7 is `functions: ['post']`. Reasons: AC-2.10 enables a method pill only when "the recipe exports that method's function"; AC-3.4's "every function from the tutorial" and the multi-function helper line apply to R4 and R5, whose functions are all HTTP-mapped; Learn correction 22 only says helpers are accepted at runtime. R7's helper line therefore reads "Exports `function post()`". R8's `functions` is `['getSummary']`, which matches no HTTP function, so `methodEnabled` is false for all five methods (AC-2.10, AC-3.8).
2. **`examples` is keyed by function name** and covers exactly the recipe's `functions`. Queries keep the leading `?` and are stored verbatim from the spec's Example requests table, with `<guid>` replaced by `EXAMPLE_GUID`. Phase 10 decides any URL encoding.
3. **The one deferred value:** R7's `examples.post` is `{ query: null, body: null, liquidInput: null }`. The spec says its body is "the fields Spike S3 sets", and S3 has not run. This is an S3 dependency, not a TBD: Phase 19 replaces that one entry (and the one test assertion that pins it) with the S3 fields. No other value in this phase is deferred.
4. **`permissionNote` carries the upstream-credentials line.** FR-3 says R3, R5, R6, R7 and R9 "add one line to the permission note", so those five notes end with `UPSTREAM_CREDENTIALS_LINE`. `README.md` (Phase 14) reads the same constant when `recipe.upstreamCredentials` is true.
5. **`prerequisites` carries the Account test-user line** (`ACCOUNT_TEST_USER_LINE`) for R1, R4 and R10, next to the R9 flow prerequisite and the R10 F07 lines. `checklistLines` emits, per Account-scoped grant, the table line and then the relationship line; the test-user line follows as part of the prerequisites. Each Account recipe therefore gets both lines FR-3 requires.
6. **Constants are `UPPER_SNAKE_CASE`** per `.claude/rules/project-structure.md` (`UPSTREAM_CREDENTIALS_LINE`, not `upstreamCredentialsLine`).
7. **Web role strings** for recipes where the spec names no role are generic ("A web role the caller holds"). R5 is `Administrators` and R6 is `Authenticated Users`, as the spec's table says.
8. **Slug cap boundary (AC-2.11).** The cut point is `lastIndexOf('-', 64)`, so a dash at index 64 keeps the first 64 characters, and a dash earlier gives the shorter word-boundary slug. No dash at or before index 64 cuts at 64.
9. **Validation failure top-level message.** The spec fixes `errors: [{ field, message }]` but not the top-level `message`, so the shared constant `VALIDATION_MESSAGE` is `The request isn't valid.` and every handler uses it.

- [x] **Step 1: Check the Phase 00 stubs and branch**

  Run: `git branch --show-current` — expect: `001-server-logic-starter-inspector`.

  Run: `git ls-files src/lib/slug.ts src/lib/text.ts src/services/catalogue/recipes.ts src/types/http.ts src/types/recipe.ts` — expect: all five paths listed. If any is missing, stop: Phase 00 has not landed.

---

## Task 1: `slugify` (AC-2.2, AC-2.3, AC-2.11)

- [x] **Step 2: Write the failing test** `src/lib/slug.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest';
  import { slugify } from '@/lib/slug';

  const BASIC: [string, string][] = [
    ['Customer Summary!', 'customer-summary'],
    ['customer-summary', 'customer-summary'],
    ['  Hello   World  ', 'hello-world'],
    ['a_b-c', 'a-b-c'],
    ['---x---', 'x'],
    ['Über Café', 'ber-caf'],
    ['Order #42 (v2)', 'order-42-v2'],
    ['UPPER', 'upper'],
    ['', 'untitled'],
    ['!!!', 'untitled'],
    ['日本語', 'untitled'],
  ];

  const DEVICE_NAMES: [string, string][] = [
    ['CON', 'con-logic'],
    ['prn', 'prn-logic'],
    ['Aux', 'aux-logic'],
    ['NUL!', 'nul-logic'],
    ['com1', 'com1-logic'],
    ['COM9', 'com9-logic'],
    ['lpt1', 'lpt1-logic'],
    ['LPT9', 'lpt9-logic'],
    ['com0', 'com0'],
    ['com10', 'com10'],
    ['console', 'console'],
    ['con-x', 'con-x'],
    ['lpt', 'lpt'],
  ];

  describe('slugify', () => {
    it.each(BASIC)('%j becomes %j', (input, expected) => {
      expect(slugify(input).slug).toBe(expected);
    });

    it('AC-2.2: "Customer Summary!" gives customer-summary and differs', () => {
      expect(slugify('Customer Summary!')).toEqual({ slug: 'customer-summary', differs: true });
    });

    it('AC-2.3: an empty slug falls back to untitled', () => {
      expect(slugify('')).toEqual({ slug: 'untitled', differs: true });
      expect(slugify('***').slug).toBe('untitled');
    });

    it.each(DEVICE_NAMES)('AC-2.11 device names: %j becomes %j', (input, expected) => {
      expect(slugify(input).slug).toBe(expected);
    });

    it('differs compares the slug with the typed name exactly', () => {
      expect(slugify('customer-summary').differs).toBe(false);
      expect(slugify('Customer-Summary').differs).toBe(true);
      expect(slugify(' customer-summary').differs).toBe(true);
      expect(slugify('CON').differs).toBe(true);
    });

    describe('AC-2.11 length cap of 64', () => {
      it('leaves a 64-character slug alone', () => {
        const name = 'b'.repeat(64);
        expect(slugify(name)).toEqual({ slug: name, differs: false });
      });

      it('cuts at 64 when there is no dash to cut at', () => {
        expect(slugify('x'.repeat(200)).slug).toBe('x'.repeat(64));
        expect(slugify(`${'a'.repeat(65)}-b`).slug).toBe('a'.repeat(64));
      });

      it('cuts at the last dash at or before index 64', () => {
        const name = `${'abcdefghi-'.repeat(10)}tail`;
        expect(slugify(name).slug).toBe(`${'abcdefghi-'.repeat(5)}abcdefghi`);
        expect(slugify(`${'a'.repeat(63)}-bbb`).slug).toBe('a'.repeat(63));
        expect(slugify(`${'a'.repeat(64)}-bbb`).slug).toBe('a'.repeat(64));
      });

      it('never returns more than 64 characters or a trailing dash', () => {
        for (const name of ['word '.repeat(40), 'a-'.repeat(80), 'ab cd '.repeat(30)]) {
          const { slug } = slugify(name);
          expect(slug.length).toBeLessThanOrEqual(64);
          expect(slug.endsWith('-')).toBe(false);
          expect(slug.startsWith('-')).toBe(false);
        }
      });
    });
  });
  ```

  Note: `endsWith` and `startsWith` here are in a test file, not in generated server code, so FR-4 does not apply.

- [x] **Step 3: Run it — expect FAIL**

  Run: `npx vitest run src/lib/slug.test.ts` — expect: FAIL, with `not implemented: phase 05` thrown by the Phase 00 stub (or `slugify is not a function` if the stub is absent).

- [x] **Step 4: Implement** `src/lib/slug.ts` (replace the stub entirely)

  ```ts
  const MAX_SLUG_LENGTH = 64;
  const DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/;

  /**
   * AC-2.2 / 2.3 / 2.11: lowercase, runs outside a-z0-9 become "-", trim dashes,
   * cap at 64 (at the last "-" at or before index 64, else at 64), "untitled" when empty,
   * and "-logic" appended to a Windows device name. `differs` compares with the typed name.
   */
  export function slugify(name: string): { slug: string; differs: boolean } {
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (slug.length > MAX_SLUG_LENGTH) {
      const dash = slug.lastIndexOf('-', MAX_SLUG_LENGTH);
      slug = slug.slice(0, dash > 0 ? dash : MAX_SLUG_LENGTH).replace(/-+$/, '');
    }
    if (slug === '') slug = 'untitled';
    if (DEVICE_NAME.test(slug)) slug = `${slug}-logic`;
    return { slug, differs: slug !== name };
  }
  ```

- [x] **Step 5: Format, lint and run — expect PASS**

  Run: `npx prettier --write src/lib/slug.ts src/lib/slug.test.ts && npx eslint src/lib/slug.ts src/lib/slug.test.ts --max-warnings=0 && npx vitest run src/lib/slug.test.ts` — expect: no lint output, all tests PASS.

- [x] **Step 6: Commit**

  `git add src/lib/slug.ts src/lib/slug.test.ts && git commit -m "feat(lib): add slugify with length cap and device-name rules"`

---

## Task 2: `normalizeLf` (AC-4.10)

- [x] **Step 7: Write the failing test** `src/lib/text.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest';
  import { normalizeLf } from '@/lib/text';

  describe('normalizeLf', () => {
    it.each<[string, string]>([
      ['a\r\nb', 'a\nb'],
      ['a\rb', 'a\nb'],
      ['a\nb', 'a\nb'],
      ['a\r\n\r\nb', 'a\n\nb'],
      ['\r\r\n', '\n\n'],
      ['one\r\ntwo\rthree\nfour', 'one\ntwo\nthree\nfour'],
      ['', ''],
      ['no line breaks', 'no line breaks'],
    ])('%j becomes %j', (input, expected) => {
      expect(normalizeLf(input)).toBe(expected);
    });

    it('is idempotent and leaves no carriage return', () => {
      const once = normalizeLf('x\r\ny\rz\r\n');
      expect(once).not.toContain('\r');
      expect(normalizeLf(once)).toBe(once);
    });

    it('keeps a missing final newline missing (the download adds it, not this function)', () => {
      expect(normalizeLf('last line')).toBe('last line');
    });
  });
  ```

- [x] **Step 8: Run it — expect FAIL**

  Run: `npx vitest run src/lib/text.test.ts` — expect: FAIL (`not implemented: phase 05` from the stub).

- [x] **Step 9: Implement** `src/lib/text.ts` (replace the stub entirely)

  ```ts
  /** AC-4.10: the editor model is LF-only. CRLF and a lone CR both become LF. */
  export function normalizeLf(text: string): string {
    return text.replace(/\r\n?/g, '\n');
  }
  ```

- [x] **Step 10: Format, lint and run — expect PASS**

  Run: `npx prettier --write src/lib/text.ts src/lib/text.test.ts && npx eslint src/lib/text.ts src/lib/text.test.ts --max-warnings=0 && npx vitest run src/lib/text.test.ts` — expect: all tests PASS.

- [x] **Step 11: Commit**

  `git add src/lib/text.ts src/lib/text.test.ts && git commit -m "feat(lib): add normalizeLf for the LF-only editor model"`

---

## Task 3: Recipe catalogue (FR-3 tables, AC-2.6, AC-2.10, AC-3.1, AC-3.5, AC-3.6, AC-5.5, AC-5.6)

- [x] **Step 12: Write the failing test** `src/services/catalogue/recipes.test.ts`

  ```ts
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
          expect(lines).toContain(`Account relationship for ${t.logicalName}: ${t.relationship ?? ''}`);
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
      expect(create?.note).toContain("Learn binds no account on create");
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
      expect(getRecipe('R7').outboundDomains).toEqual(['login.microsoftonline.com', 'graph.microsoft.com']);
      for (const id of ['R1', 'R2', 'R4', 'R8', 'R9', 'R10'] as const) {
        expect(getRecipe(id).outboundDomains).toEqual([]);
      }
    });

    it('site settings (AC-3.5)', () => {
      expect(getRecipe('R3').siteSettings).toEqual(['ExternalApi/BaseUrl']);
      expect(getRecipe('R6').siteSettings).toEqual(['AZURE_FUNCTION_URL']);
      expect(getRecipe('R7').siteSettings).toEqual(['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_ID', 'HOSTNAME', 'SITE_PATH']);
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
      expect(ex('R5', 'get')).toEqual({ query: '?username=russellwhyte', body: null, liquidInput: null });
      expect(ex('R5', 'post')).toEqual({
        query: null,
        body: { serviceSession: '(S(abc123))', UserName: 'altonstott', FirstName: 'Alton', LastName: 'Stott' },
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
      expect(ex('R9', 'post')).toEqual({ query: null, body: { message: 'Hello' }, liquidInput: null });
      expect(ex('R10', 'get')).toEqual({ query: `?id=${EXAMPLE_GUID}`, body: null, liquidInput: null });
      expect(ex('R10', 'post')).toEqual({ query: null, body: {}, liquidInput: null });
      expect(ex('R10', 'patch')).toEqual({ query: `?id=${EXAMPLE_GUID}`, body: {}, liquidInput: null });
    });

    it('R7 post is the one value deferred to Spike S3 (phase 19 replaces this assertion)', () => {
      expect(getRecipe('R7').examples['post']).toEqual({ query: null, body: null, liquidInput: null });
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
  ```

- [x] **Step 13: Run it — expect FAIL**

  Run: `npx vitest run src/services/catalogue/recipes.test.ts` — expect: FAIL (the Phase 00 stub throws `not implemented: phase 05`, or `RECIPES` is empty and `methodEnabled` / `checklistLines` are not exports).

- [x] **Step 14: Implement** `src/services/catalogue/recipes.ts` (replace the stub entirely)

  ```ts
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
        post: { query: null, body: { name: 'Alton Stott', email: 'alton@contoso.com' }, liquidInput: null },
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
          body: { serviceSession: '(S(abc123))', UserName: 'altonstott', FirstName: 'Alton', LastName: 'Stott' },
          liquidInput: null,
        },
        put: {
          query: null,
          body: { serviceSession: '(S(abc123))', UserName: 'altonstott', LastName: 'Stott-Ray' },
          liquidInput: null,
        },
        del: { query: '?username=altonstott&serviceSession=(S(abc123))', body: null, liquidInput: null },
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
        getSummary: { query: null, body: null, liquidInput: '{"category":"news","maximumResults":5}' },
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
        "Create the cloud flow, add it to the site with a web role the caller holds, and set `CLOUD_FLOW_ID`, then validate on your development site.",
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
        lines.push(`Account relationship for ${t.logicalName}: ${t.relationship ?? 'maker verifies'}`);
      }
    }
    for (const d of recipe.outboundDomains) lines.push(`Allowed domain: ${d}`);
    for (const s of recipe.siteSettings) lines.push(`Site setting: ${s}`);
    lines.push(...recipe.prerequisites);
    return lines;
  }
  ```

- [x] **Step 15: Format, lint and run — expect PASS**

  Run: `npx prettier --write src/services/catalogue/recipes.ts src/services/catalogue/recipes.test.ts && npx eslint src/services/catalogue --max-warnings=0 && npx vitest run src/services/catalogue/recipes.test.ts` — expect: no lint output, all tests PASS. If the R4 `lines[3]` regex test fails, compare the line with `RECIPES` R4's second table note: the line is `Table permission: contact (entity set contacts): Create, access type Global. ` followed by the note.

- [x] **Step 16: Commit**

  `git add src/services/catalogue/recipes.ts src/services/catalogue/recipes.test.ts && git commit -m "feat(catalogue): add the ten-recipe catalogue, method enablement and checklist lines"`

---

## Task 4: Shared handler snippets (FR-3 Musts, correction 11, AC-3.3, AC-3.10)

- [x] **Step 17: Write the failing test** `src/services/generators/handlers/snippets.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest';
  import { EXAMPLE_GUID, RECIPES, getRecipe } from '@/services/catalogue/recipes';
  import {
    GUID_PATTERN,
    IS_GUID,
    TO_RESULT,
    VALIDATION_MESSAGE,
    failureReturn,
    headerComment,
    logLine,
    requireSettingsCode,
    settingVar,
    validationFailureReturn,
    validationFailureReturnFor,
  } from '@/services/generators/handlers/snippets';

  describe('constants', () => {
    it('TO_RESULT is the exact correction-11 line', () => {
      expect(TO_RESULT).toBe('const toResult = r => typeof r === "string" ? JSON.parse(r) : r;');
    });

    it('GUID_PATTERN is the FR-3 GUID regex source', () => {
      expect(GUID_PATTERN).toBe('^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$');
      const re = new RegExp(GUID_PATTERN);
      expect(re.test(EXAMPLE_GUID)).toBe(true);
      expect(re.test('A1b2C3d4-0000-1111-2222-333344445555')).toBe(true);
      expect(re.test('not-a-guid')).toBe(false);
      expect(re.test('00000000000000000000000000000000')).toBe(false);
      expect(re.test(`${EXAMPLE_GUID} `)).toBe(false);
    });

    it('IS_GUID embeds the pattern as a regex literal', () => {
      expect(IS_GUID).toBe(
        'const isGuid = s => typeof s === "string" && /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(s);',
      );
    });

    it('VALIDATION_MESSAGE is fixed', () => {
      expect(VALIDATION_MESSAGE).toBe("The request isn't valid.");
    });
  });

  describe('headerComment (AC-3.3, AC-3.10)', () => {
    it('R1 to R3 have a name line only', () => {
      expect(headerComment(getRecipe('R1'))).toBe('// R1: Read Dataverse records');
      expect(headerComment(getRecipe('R3'))).toBe('// R3: Call an external API');
    });

    it('R4 links its Learn tutorial', () => {
      expect(headerComment(getRecipe('R4'))).toBe(
        [
          '// R4: Dataverse CRUD',
          '// Learn: https://learn.microsoft.com/en-us/power-pages/configure/server-logic-operations',
        ].join('\n'),
      );
    });

    it('R7 links the tutorial and the GitHub sample package', () => {
      expect(headerComment(getRecipe('R7'))).toBe(
        [
          '// R7: Microsoft Graph & SharePoint',
          '// Learn: https://learn.microsoft.com/en-us/power-pages/configure/server-logic-graph-sharepoint',
          '// Sample package: https://github.com/microsoft/power-pages-samples/tree/main/samples/server-logic/sharepoint-integration',
        ].join('\n'),
      );
    });

    it('every R4 to R10 header contains the recipe Learn URL; every header line is a comment', () => {
      for (const r of RECIPES) {
        const text = headerComment(r);
        if (r.id !== 'R1' && r.id !== 'R2' && r.id !== 'R3') {
          expect(r.learnUrl).not.toBeNull();
          expect(text).toContain(r.learnUrl ?? '');
        }
        for (const line of text.split('\n')) expect(line.startsWith('// ')).toBe(true);
      }
    });

    it('is deterministic', () => {
      for (const r of RECIPES) expect(headerComment(r)).toBe(headerComment(r));
    });
  });

  describe('settingVar', () => {
    it.each<[string, string]>([
      ['ExternalApi/BaseUrl', 'externalApiBaseUrl'],
      ['AZURE_FUNCTION_URL', 'azureFunctionUrl'],
      ['CLIENT_ID', 'clientId'],
      ['CLIENT_SECRET', 'clientSecret'],
      ['TENANT_ID', 'tenantId'],
      ['HOSTNAME', 'hostname'],
      ['SITE_PATH', 'sitePath'],
      ['CLOUD_FLOW_ID', 'cloudFlowId'],
    ])('%s becomes %s', (name, expected) => {
      expect(settingVar(name)).toBe(expected);
    });

    it('rejects a name that cannot form an identifier', () => {
      expect(() => settingVar('1/2')).toThrow();
      expect(() => settingVar('///')).toThrow();
    });

    it('every catalogue site setting maps to a distinct variable', () => {
      const all = RECIPES.flatMap((r) => r.siteSettings);
      expect(new Set(all.map(settingVar)).size).toBe(all.length);
    });
  });

  describe('requireSettingsCode (FR-3 missing-setting Must, F57)', () => {
    it('emits the read, the exact log text and the exact return text', () => {
      expect(requireSettingsCode(['ExternalApi/BaseUrl'], '  ')).toBe(
        [
          '  const externalApiBaseUrl = Server.SiteSetting.Get("ExternalApi/BaseUrl");',
          '  if (!externalApiBaseUrl) {',
          '    Server.Logger.Error("Missing site setting ExternalApi/BaseUrl");',
          '    return JSON.stringify({ status: "error", message: "Server logic isn\'t configured: missing site setting ExternalApi/BaseUrl" });',
          '  }',
        ].join('\n'),
      );
    });

    it('emits one block per setting, in order, with no indent when asked', () => {
      const text = requireSettingsCode(['CLIENT_ID', 'TENANT_ID'], '');
      expect(text.split('\n')).toHaveLength(10);
      expect(text.indexOf('clientId')).toBeLessThan(text.indexOf('tenantId'));
      expect(text.startsWith('const clientId = Server.SiteSetting.Get("CLIENT_ID");')).toBe(true);
    });

    it('returns an empty string for no settings', () => {
      expect(requireSettingsCode([], '  ')).toBe('');
    });

    it('rejects two settings that would share a variable name', () => {
      expect(() => requireSettingsCode(['A/B', 'A_B'], '')).toThrow();
    });

    it('never logs the setting value, only its name', () => {
      const text = requireSettingsCode(['CLIENT_SECRET'], '');
      const logLines = text.split('\n').filter((l) => l.includes('Server.Logger'));
      expect(logLines).toEqual(['  Server.Logger.Error("Missing site setting CLIENT_SECRET");']);
    });
  });

  describe('failure returns (return shape, FR-3)', () => {
    it('failureReturn', () => {
      expect(failureReturn("Couldn't connect to SharePoint.")).toBe(
        'return JSON.stringify({ status: "error", message: "Couldn\'t connect to SharePoint." });',
      );
      expect(failureReturn('x', '    ')).toBe('    return JSON.stringify({ status: "error", message: "x" });');
    });

    it('failureReturn escapes quotes and backslashes through JSON.stringify', () => {
      expect(failureReturn('say "hi" \\ now')).toBe(
        'return JSON.stringify({ status: "error", message: "say \\"hi\\" \\\\ now" });',
      );
    });

    it('validationFailureReturn adds errors: [{ field, message }]', () => {
      expect(
        validationFailureReturn([{ field: 'body', message: 'Body must be a JSON object.' }], '  '),
      ).toBe(
        `  return JSON.stringify({ status: "error", message: "The request isn't valid.", errors: [{ field: "body", message: "Body must be a JSON object." }] });`,
      );
    });

    it('validationFailureReturn lists several errors in order', () => {
      const text = validationFailureReturn([
        { field: 'name', message: 'Name is required.' },
        { field: 'email', message: 'Email is not valid.' },
      ]);
      expect(text).toContain(
        'errors: [{ field: "name", message: "Name is required." }, { field: "email", message: "Email is not valid." }]',
      );
    });

    it('validationFailureReturnFor returns a runtime errors array', () => {
      expect(validationFailureReturnFor('errors', '  ')).toBe(
        `  return JSON.stringify({ status: "error", message: "The request isn't valid.", errors: errors });`,
      );
      expect(() => validationFailureReturnFor('errors; evil()')).toThrow();
    });
  });

  describe('logLine (FR-3 logging rule, F09)', () => {
    it('logs a fixed operation name only', () => {
      expect(logLine({ level: 'Log', operation: 'R4 get', indent: '  ' })).toBe('  Server.Logger.Log("R4 get");');
    });

    it('logs StatusCode and ReasonPhrase for connector failures', () => {
      expect(logLine({ level: 'Error', operation: 'R7 upload', fields: ['status', 'reason'] })).toBe(
        'Server.Logger.Error("R7 upload" + " " + r.StatusCode + " " + r.ReasonPhrase);',
      );
    });

    it('logs e.name for caught exceptions and honours variable names', () => {
      expect(logLine({ level: 'Error', operation: 'R4 post', fields: ['exception'] })).toBe(
        'Server.Logger.Error("R4 post" + " " + e.name);',
      );
      expect(
        logLine({ level: 'Warn', operation: 'R9 trigger', fields: ['status'], result: 'flow', error: 'err' }),
      ).toBe('Server.Logger.Warn("R9 trigger" + " " + flow.StatusCode);');
    });

    it('logs the ActivityId', () => {
      expect(
        logLine({ level: 'Error', operation: 'R7 create after upload', fields: ['status', 'reason', 'activity'] }),
      ).toBe(
        'Server.Logger.Error("R7 create after upload" + " " + r.StatusCode + " " + r.ReasonPhrase + " " + Server.Context.ActivityId);',
      );
    });

    it('emits the operation as a JSON string literal', () => {
      expect(logLine({ level: 'Log', operation: 'a"b' })).toBe('Server.Logger.Log("a\\"b");');
    });

    it('never emits Body, e.message or any other member', () => {
      const all = logLine({
        level: 'Error',
        operation: 'op',
        fields: ['status', 'reason', 'exception', 'activity'],
      });
      expect(all).not.toMatch(/\.Body|\.message|\.Headers|Url|Token/);
    });

    it('rejects a result or error name that is not an identifier', () => {
      expect(() =>
        logLine({ level: 'Error', operation: 'x', fields: ['status'], result: 'r; evil()' }),
      ).toThrow();
      expect(() => logLine({ level: 'Error', operation: 'x', fields: ['exception'], error: 'e.x' })).toThrow();
    });
  });

  describe('golden: a composed sample', () => {
    it('matches the committed text byte for byte', () => {
      const sample = [
        headerComment(getRecipe('R6')),
        'async function get() {',
        requireSettingsCode(['AZURE_FUNCTION_URL'], '  '),
        logLine({ level: 'Error', operation: 'R6 call', fields: ['status', 'reason'], indent: '  ' }),
        failureReturn("Couldn't call the function.", '  '),
        '}',
      ].join('
');
      const golden = [
        '// R6: Call an Azure Function',
        '// Learn: https://learn.microsoft.com/en-us/power-pages/configure/server-logic-azure-function',
        'async function get() {',
        '  const azureFunctionUrl = Server.SiteSetting.Get("AZURE_FUNCTION_URL");',
        '  if (!azureFunctionUrl) {',
        '    Server.Logger.Error("Missing site setting AZURE_FUNCTION_URL");',
        '    return JSON.stringify({ status: "error", message: "Server logic isn't configured: missing site setting AZURE_FUNCTION_URL" });',
        '  }',
        '  Server.Logger.Error("R6 call" + " " + r.StatusCode + " " + r.ReasonPhrase);',
        '  return JSON.stringify({ status: "error", message: "Couldn't call the function." });',
        '}',
      ].join('
');
      expect(sample).toBe(golden);
    });
  });
  ```


- [x] **Step 18: Run it — expect FAIL**

  Run: `npx vitest run src/services/generators/handlers/snippets.test.ts` — expect: FAIL, `Failed to resolve import "@/services/generators/handlers/snippets"` (the file does not exist yet).

- [x] **Step 19: Implement** `src/services/generators/handlers/snippets.ts`

  ```ts
  import type { RecipeMeta } from '@/types/recipe';

  /** Learn correction 11: normalise every connector result with this exact line. */
  export const TO_RESULT = 'const toResult = r => typeof r === "string" ? JSON.parse(r) : r;';

  /** FR-3 GUID, as regex source text. */
  export const GUID_PATTERN = '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$';

  /** Emitted GUID check shared by R4 and R10. */
  export const IS_GUID = `const isGuid = s => typeof s === "string" && /${GUID_PATTERN}/.test(s);`;

  /** Top-level `message` of every validation failure; the spec fixes only the `errors` array. */
  export const VALIDATION_MESSAGE = "The request isn't valid.";

  export type FieldError = { field: string; message: string };

  export type LogLevel = 'Log' | 'Warn' | 'Error';

  /**
   * The only values the FR-3 logging rule lets generated code log, besides a fixed operation name
   * and the name (never the value) of a missing site setting: StatusCode, ReasonPhrase, e.name
   * and Server.Context.ActivityId.
   */
  export type LogField = 'status' | 'reason' | 'exception' | 'activity';

  export type LogLineInput = {
    level: LogLevel;
    /** A fixed operation name, emitted as a JSON string literal. */
    operation: string;
    fields?: readonly LogField[];
    /** Name of the connector-result variable in the emitted code. Default `r`. */
    result?: string;
    /** Name of the caught-exception variable in the emitted code. Default `e`. */
    error?: string;
    indent?: string;
  };

  const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  function identifier(value: string, what: string): string {
    if (!IDENTIFIER.test(value)) throw new Error(`Invalid ${what}: ${value}`);
    return value;
  }

  /**
   * Header comment for a generated handler (AC-3.3, AC-3.10): the recipe name, its Learn link when
   * it has one, and any extra sample link. Plain `//` lines with no parenthesis after a name,
   * so FR-4 finds nothing in them.
   */
  export function headerComment(recipe: RecipeMeta): string {
    const lines = [`// ${recipe.id}: ${recipe.name}`];
    if (recipe.learnUrl !== null) lines.push(`// Learn: ${recipe.learnUrl}`);
    for (const url of recipe.extraUrls) lines.push(`// Sample package: ${url}`);
    return lines.join('\n');
  }

  /** `ExternalApi/BaseUrl` becomes `externalApiBaseUrl`; `CLIENT_ID` becomes `clientId`. */
  export function settingVar(name: string): string {
    const parts = name.split(/[^A-Za-z0-9]+/).filter((p) => p !== '');
    const camel = parts
      .map((part, index) => {
        const word = part === part.toUpperCase() ? part.toLowerCase() : part;
        const first = index === 0 ? word.charAt(0).toLowerCase() : word.charAt(0).toUpperCase();
        return first + word.slice(1);
      })
      .join('');
    return identifier(camel, 'site setting variable');
  }

  /** `return JSON.stringify({ status: "error", message })` with a fixed message (FR-3 return shape). */
  export function failureReturn(message: string, indent = ''): string {
    return `${indent}return JSON.stringify({ status: "error", message: ${JSON.stringify(message)} });`;
  }

  /** Failure object plus `errors: [{ field, message }]`, for errors known when the code is generated. */
  export function validationFailureReturn(errors: readonly FieldError[], indent = ''): string {
    const list = errors
      .map((e) => `{ field: ${JSON.stringify(e.field)}, message: ${JSON.stringify(e.message)} }`)
      .join(', ');
    return `${indent}return JSON.stringify({ status: "error", message: ${JSON.stringify(VALIDATION_MESSAGE)}, errors: [${list}] });`;
  }

  /** Same shape, for an `errors` array the emitted code builds at run time. */
  export function validationFailureReturnFor(errorsVar: string, indent = ''): string {
    const name = identifier(errorsVar, 'errors variable');
    return `${indent}return JSON.stringify({ status: "error", message: ${JSON.stringify(VALIDATION_MESSAGE)}, errors: ${name} });`;
  }

  /** One `Server.Logger.<level>(...)` call that logs only what the FR-3 logging rule allows. */
  export function logLine(i: LogLineInput): string {
    const result = identifier(i.result ?? 'r', 'result variable');
    const error = identifier(i.error ?? 'e', 'error variable');
    const expression: Record<LogField, string> = {
      status: `${result}.StatusCode`,
      reason: `${result}.ReasonPhrase`,
      exception: `${error}.name`,
      activity: 'Server.Context.ActivityId',
    };
    const parts = [JSON.stringify(i.operation), ...(i.fields ?? []).map((f) => expression[f])];
    return `${i.indent ?? ''}Server.Logger.${i.level}(${parts.join(' + " " + ')});`;
  }

  /**
   * FR-3 missing-setting Must (F57): read each setting, and if it is missing or empty log the
   * name only and return the fixed failure, before any outbound call.
   */
  export function requireSettingsCode(names: readonly string[], indent: string): string {
    const seen = new Set<string>();
    return names
      .map((name) => {
        const variable = settingVar(name);
        if (seen.has(variable)) throw new Error(`Site settings share the variable name ${variable}`);
        seen.add(variable);
        return [
          `${indent}const ${variable} = Server.SiteSetting.Get(${JSON.stringify(name)});`,
          `${indent}if (!${variable}) {`,
          `${indent}  Server.Logger.Error(${JSON.stringify(`Missing site setting ${name}`)});`,
          failureReturn(`Server logic isn't configured: missing site setting ${name}`, `${indent}  `),
          `${indent}}`,
        ].join('\n');
      })
      .join('\n');
  }
  ```

- [x] **Step 20: Format, lint and run — expect PASS**

  Run: `npx prettier --write src/services/generators/handlers/snippets.ts src/services/generators/handlers/snippets.test.ts && npx eslint src/services/generators/handlers/snippets.ts src/services/generators/handlers/snippets.test.ts --max-warnings=0 && npx vitest run src/services/generators/handlers/snippets.test.ts` — expect: no lint output, all tests PASS.

- [x] **Step 21: Commit**

  `git add src/services/generators/handlers/snippets.ts src/services/generators/handlers/snippets.test.ts && git commit -m "feat(handlers): add shared snippets for toResult, GUID, settings, failures and logging"`

---

## Task 5: FR-4 zero-hit guard for every snippet (AC-3.2 groundwork)

This test imports `runBrowserChecks` from Phase 02, which runs in the same wave. In this phase's own worktree `runBrowserChecks` is still the Phase 00 stub, so **this one test is expected to FAIL with `not implemented: phase 02` until Phase 02 merges at the wave boundary.** It is the only red test this phase may leave.

- [x] **Step 22: Write the test** `src/services/generators/handlers/snippets.fr4.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest';
  import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
  import { RECIPES } from '@/services/catalogue/recipes';
  import {
    IS_GUID,
    TO_RESULT,
    failureReturn,
    headerComment,
    logLine,
    requireSettingsCode,
    validationFailureReturn,
    validationFailureReturnFor,
  } from '@/services/generators/handlers/snippets';

  /** Wrap in a function so `return` parses, then assert FR-4 finds nothing (AC-3.2, Test T1). */
  function expectClean(snippet: string): void {
    const result = runBrowserChecks(`function probe() {\n${snippet}\n}\n`);
    expect(result.hits).toEqual([]);
    expect(result.parseFailed).toBe(false);
  }

  const ALL_SETTINGS = RECIPES.flatMap((r) => r.siteSettings);

  describe('snippets pass the FR-4 checks with zero hits', () => {
    it('TO_RESULT and IS_GUID', () => {
      expectClean(TO_RESULT);
      expectClean(IS_GUID);
    });

    it.each(RECIPES.map((r) => r.id))('headerComment for %s', (id) => {
      const recipe = RECIPES.find((r) => r.id === id);
      expect(recipe).toBeDefined();
      if (recipe) expectClean(headerComment(recipe));
    });

    it('requireSettingsCode for every site setting in the catalogue', () => {
      expectClean(requireSettingsCode(ALL_SETTINGS, '  '));
      for (const r of RECIPES) expectClean(requireSettingsCode(r.siteSettings, ''));
    });

    it('failure and validation returns', () => {
      expectClean(failureReturn("Couldn't connect to SharePoint."));
      expectClean(failureReturn("Couldn't upload the ticket."));
      expectClean(failureReturn('Registration failed after the ticket was uploaded.'));
      expectClean(validationFailureReturn([{ field: 'body', message: 'Body must be a JSON object.' }]));
      expectClean(validationFailureReturnFor('errors'));
    });

    it('every log line shape', () => {
      expectClean(logLine({ level: 'Log', operation: 'R4 get' }));
      expectClean(logLine({ level: 'Error', operation: 'R7 connect', fields: ['status', 'reason'] }));
      expectClean(logLine({ level: 'Error', operation: 'R4 post', fields: ['exception'] }));
      expectClean(
        logLine({
          level: 'Error',
          operation: 'R7 create after upload',
          fields: ['status', 'reason', 'activity'],
        }),
      );
      expectClean(logLine({ level: 'Warn', operation: 'R9 trigger', fields: ['activity'] }));
    });
  });
  ```

- [x] **Step 23: Run it in this worktree — expect the one allowed FAIL**

  Run: `npx vitest run src/services/generators/handlers/snippets.fr4.test.ts` — expect: FAIL on every test with `not implemented: phase 02` (stub). That is the documented, accepted red state for this single file.

  Run: `npx vitest run src/lib src/services/catalogue src/services/generators/handlers/snippets.test.ts` — expect: PASS (all of Tasks 1 to 4 stay green).

- [x] **Step 24: Format, lint and commit**

  Run: `npx prettier --write src/services/generators/handlers/snippets.fr4.test.ts && npx eslint src/services/generators/handlers/snippets.fr4.test.ts --max-warnings=0` — expect: no output.

  `git add src/services/generators/handlers/snippets.fr4.test.ts && git commit -m "test(handlers): guard shared snippets against FR-4 hits (green once phase 02 merges)"`

- [x] **Step 25: Re-run after the wave merge — expect PASS**

  After the orchestrator merges Phase 02 into the integration branch at the wave boundary, run: `npx vitest run src/services/generators/handlers/snippets.fr4.test.ts` — expect: PASS (zero hits, `parseFailed` false for every snippet). If a snippet fails, the failing text is the bug: reword it in `snippets.ts` or `recipes.ts` (never weaken the test). Likely causes are a header or message containing a restricted word, or `Function` followed by `(`; the spec correction 14 matching ignores case and covers comments and strings.

---

## Phase verification

Run all of these in the phase worktree, in order:

1. `npx tsc -b` — expect: exit 0, no output.
2. `npx eslint . --max-warnings=0` — expect: exit 0, no output.
3. `npx prettier --check .` — expect: "All matched files use Prettier code style!".
4. `npx vitest run` — expect: every test passes **except** `snippets.fr4.test.ts`, which fails with `not implemented: phase 02` until Phase 02 merges (the one allowed red test; see Task 5).
5. At the wave boundary, after Phase 02 merges: `npx vitest run` — expect: fully green, including `snippets.fr4.test.ts`.

Spec check by hand:

- `slugify('Customer Summary!')` returns `{ slug: 'customer-summary', differs: true }` (AC-2.2).
- `RECIPES` has 10 entries in groups 3, 4 and 3; R4 and R5 enable GET, POST, PUT and DELETE but not PATCH; R10 enables GET, POST and PATCH; R8 enables none (AC-2.10).
- `getRecipe('R4').tables` has the Account grant and the Global Create-only grant with its note; `checklistLines` gives each Account recipe a relationship line and the test-user line.

## Done when

- `slugify`, `normalizeLf`, `RECIPES`, `getRecipe`, `methodEnabled`, `checklistLines` and the snippet exports exist with the exact names in **Interfaces: Produces**, and the Phase 00 stubs for `slug.ts`, `text.ts` and `recipes.ts` are gone.
- The slug table tests (including `Customer Summary!`, the 64-character cap and device names) and the LF tests pass.
- The catalogue tests pass for: 10 recipes, group counts 3/4/3, method enablement, `liquid` for R1 and R8 only, `demoPage` for R4 to R6 only, every Account grant with a relationship and test-user line, and every upstream recipe flagged and carrying the F10 line.
- The snippet golden and unit tests pass, and `snippets.fr4.test.ts` is committed and passes after Phase 02 merges (red only inside this phase's own worktree).
- `npx tsc -b`, `npx eslint . --max-warnings=0` and `npx prettier --check .` pass, and every commit is a Conventional Commit on `001-server-logic-starter-inspector`.
- R7's `examples.post` is still the single deferred value, recorded as a Spike S3 dependency for Phase 19.
