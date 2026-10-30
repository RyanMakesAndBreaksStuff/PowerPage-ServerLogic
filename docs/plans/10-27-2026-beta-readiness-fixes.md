# Beta Readiness Fixes Implementation Plan

**Goal:** Close every item in `docs/beta-readiness-review.md` that the owner approved, so Logic Starter and Server Objects can ship as an early beta (`npm run build:beta`).

**Architecture:** One owner per fact. The generated client (`client.ts`) owns envelope handling and the nine HTTP goldens follow it. `readmeNotes.ts` owns shipped README notes. `serverObjects.ts` owns catalogue facts, including the Learn URL. The spec (`spec.md`) records each owner decision once, in a 3.0.1 PATCH. Generated code is proved by running it in `node:vm`, not by reading it.

**Tech stack:** TypeScript strict, React 19, Vite 8, Vitest 5 with Testing Library, `node:vm`, ESLint 9. No new dependency.

**Scope:** Owner decisions of 2026-10-27 in `docs/beta-readiness-review.md` (section "Owner Decisions and Comments"), plus every "Should fix" row the owner did not change:

| Review item | Task |
|---|---|
| D1(b), D2(b), D3, D4, D5 (spec side), Back/Clear wording | 1 |
| B5 drop Prettier | 2 |
| BSD-3 license | 3 |
| B3 client envelope | 4 |
| D2(b) targeted R7 `node:vm` tests; R7 `webUrl` (documented, not failed) | 5, 6 |
| R4 README Account-scope note | 6 |
| AC-4.7 toast on recipe switch | 7 |
| AC-6.5 `User.fullname` | 8 |
| D6 Learn link; `<pre aria-label>` | 9 |
| a11y live count; `used` pill name | 10 |
| AC-3.6 Permissions tile | 11 |
| AC-5.3 Validation tooltip | 12 |
| D5 site pill hidden (code side) | 13 |
| FR-12 unload handler | 14 |
| Flaky timing test | 15 |

**Out of scope:** B1 (owner validates manually), B2 and B4 and B7 (already in `676459e`), B6 (merge to `main` is the owner's last step), the Iris theme (D1b) and the full AC-4.12 harness (D2b, see `docs/plans/10-24-2026-generator-behavior-harness.md`), the `hostErrors.ts` status logging, section 5 "defer" items, the demo pages' own envelope check (`demoPages.ts:61`), R7's impossible-date regex, `.claude/hooks/format-lint.cjs` and the Prettier entries in `.claude/settings.json` (both skip Prettier when it is absent), and `PPTB-Mock` (`fakeHost.ts` and `makeStubs` in `pptbHost.test.ts` already cover host fakes, and Mock pins `@pptb/types@1.2.6`).

---

## Grounding and execution

Checked on 2026-10-27 at `676459e`, branch `starter-objexts-prep`:

- `npx tsc -b` and `npx eslint . --max-warnings=0`: clean.
- `npx vitest run`: `Test Files  89 passed (89)`, `Tests  1349 passed (1349)`.
- No golden-update script exists. Goldens are LF text (`.gitattributes`) compared with `toBe`; edit them by hand or with the script in Task 4.
- Vitest's `define` constants such as `__PAGE_INSPECTOR__` can be changed per test with `vi.stubGlobal` (probed).
- The `node:vm` runner designs in Tasks 4 and 5 were run against the current goldens in a scratch folder and reproduced the three failure paths in `docs/spec-build-ccompare.md` §3.1.
- PPTB docs: `events.on(callback)`; `events.off` is in `@pptb/types` 1.2.7 but not in the web docs; the docs name `tool:unloaded` as the unload event. FR-12 says "remove the handler on unload", so Task 14 uses `pagehide`, as the review suggests. `openInConnectionBrowser(url)` allows only `http:` and `https:`.
- Choices taken where the review offered two fixes (override any of them before running):
  - AC-4.7, AC-5.3, FR-12 unload: change the code, not the spec.
  - R7 missing `webUrl`: document the behavior (Phase 19 Decision 7 says failing would orphan a ticket that exists), do not fail.
  - D6: one Learn link in the object detail pane, through the existing `ExternalLink`.
  - AC-6.5: set `returns: null`; the object description already carries the anonymous-caller note.

Lanes. Tasks in one lane share files and run in order. Different lanes can run in parallel when each worker edits only its own files. Commit from the main session, in task order, with the exact `git add` paths shown. Run the full suite once at the end (Task 16), not inside parallel lanes, because `browserChecks.test.ts` is timing-sensitive under load.

| Lane | Tasks |
|---|---|
| A | 1 |
| B | 2, then 3 (both rewrite `package.json` and `package-lock.json`) |
| C | 4 |
| D | 5 |
| E | 6 |
| F | 7 |
| G | 8, 9, 10, 11 (share `ServerObjectsPage.test.tsx` and `serverObjects.ts`) |
| H | 12 |
| I | 13, then 14 (both edit `App.test.tsx`) |
| J | 15 |

Task 16 runs last.

Do not touch the dirty files already in the tree (`.claude/settings.json`, `sol-review.md`, `tasks/*`, untracked docs). Every commit below names its paths.

---

### Task 1: The spec records the beta decisions as 3.0.1

**Owns:** Spec text for D1(b), D2(b), D3, D4, D5, and the Back/Clear wording. Nothing else states them.

**Files:**

- Modify: `docs/specs/001-server-logic-starter-inspector/spec.md` — header, change log, AC-1.7, FR-3 logging rule, security NFR, Back and Clear wording, FR-12 beta exception.
- Signal: the `check` script below — eight lines flip from `FAIL` to `OK`.

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
S=docs/specs/001-server-logic-starter-inspector/spec.md
check() { if grep -qF -- "$2" "$S"; then echo "OK   $1"; else echo "FAIL $1"; fi; }
check "version 3.0.1"        '**Version:** 3.0.1'
check "change-log row"       '| 3.0.1 | 2026-10-27 | **PATCH.**'
check "AC-1.7 hides pill"    "the title bar doesn't render the site pill"
check "beta exception"       'Early beta exception (spec 3.0.1)'
check "handler logging rule" 'Generated handler code may log only the following'
check "client may log"       'may write response values to the console'
check "Back is a button"     '"← Back to Create Logic" button'
check "Clear search button"  'with a Clear search button'
```

- [ ] **Step 2: Capture the current signal**

Run: the script above.

Expected: eight lines, all starting `FAIL`.

- [ ] **Step 3: Implement the minimum fix**

Apply these edits to `spec.md`. Each old string is unique in the file.

1. `**Version:** 3.0.0` becomes `**Version:** 3.0.1`. `**Updated:** 2026-10-23` becomes `**Updated:** 2026-10-27`.
2. Insert this row on a new line directly after the row that starts `| 3.0.0 | 2026-10-23 |`:

```markdown
| 3.0.1 | 2026-10-27 | **PATCH.** Owner decisions for the early beta (Logic Starter and Server Objects), from `docs/beta-readiness-review.md`. **Added:** an early-beta exception in FR-12: the current palette and targeted behavior tests ship first, and the Iris theme and the full AC-4.12 matrix follow. **Changed:** AC-1.7 hides the site pill while Logic Inspector is unreleased; the FR-3 logging rule and the security NFR cover handlers, and the generated browser client may log to the console; "Back to Create Logic" and "Clear search" are buttons, not links. |
```

3. In AC-1.7, replace `While Logic Inspector is unreleased, the site pill is disabled as in AC-1.3.` with `While Logic Inspector is unreleased, the title bar doesn't render the site pill.`
4. In the FR-3 "Logging rule" bullet, replace `Generated code may log only the following:` with `Generated handler code may log only the following:`.
5. In the security NFR, replace `Generated code never logs bodies, exception messages, URLs, headers, tokens or site-setting values (the FR-3 logging rule).` with `Generated handler code never logs bodies, exception messages, URLs, headers, tokens or site-setting values (the FR-3 logging rule). The generated browser client may write response values to the console.`
6. Replace `plus a "← Back to Create Logic" link.` with `plus a "← Back to Create Logic" button.`
7. Replace `with a Clear search link` with `with a Clear search button`.
8. In FR-12, add this bullet on a new line directly after the bullet that starts `- Release per page:`:

```markdown
- **Early beta exception (spec 3.0.1).** The first release, built with `npm run build:beta` (Logic Starter and Server Objects), needn't meet the previous bullet in two respects. It ships on its current palette instead of the Iris theme (FR-11, and the colour clauses of AC-1.5, AC-1.6, AC-2.5, AC-4.2, AC-5.1, AC-5.4 and AC-6.2). It replaces the AC-4.12 36-configuration matrix with targeted `node:vm` tests for the client envelope (AC-4.5, AC-4.6) and for R7. Both gaps close in a later release.
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: the `check` script from Step 1.

Expected: eight lines, all starting `OK`.

Run: `git diff --stat`

Expected: `docs/specs/001-server-logic-starter-inspector/spec.md` is the only file this task changed (other pre-existing dirty files may also be listed).

- [ ] **Step 5: Commit the coherent change**

```bash
git add docs/specs/001-server-logic-starter-inspector/spec.md
git commit -m "docs(spec): 3.0.1 PATCH records the early-beta owner decisions"
```

---

### Task 2: Prettier is gone

**Owns:** The tooling rule "no formatter" (owner decision B5).

**Files:**

- Modify: `package.json` — drop the `format` and `format:check` scripts and two devDependencies.
- Modify: `package-lock.json` — regenerated by `npm uninstall`.
- Modify: `eslint.config.ts:3,63` — drop the `eslint-config-prettier` import and entry.
- Delete: `.prettierrc.json`, `.prettierignore`
- Modify: `.claude/rules/tooling.md:6,7` — rule text.
- Modify: `.claude/memory/steering/conventions.md:15` — rule text.
- Signal: `npm ls prettier eslint-config-prettier --depth=0`.

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
npm ls prettier eslint-config-prettier --depth=0
```

- [ ] **Step 2: Capture the current signal**

Run: `npm ls prettier eslint-config-prettier --depth=0`

Expected: exit 0, listing `eslint-config-prettier@10.x` and `prettier@3.x`.

- [ ] **Step 3: Implement the minimum fix**

```bash
npm uninstall prettier eslint-config-prettier
git rm .prettierrc.json .prettierignore
```

`package.json`: delete these two lines from `scripts`.

```json
    "format": "prettier --write .",
    "format:check": "prettier --check .",
```

`eslint.config.ts`: delete the line `import prettier from 'eslint-config-prettier';` (line 3) and the last array entry `  prettier,` (line 63, directly before `]);`).

`.claude/rules/tooling.md`: replace the line that starts `- ✓ Formatting is a separate concern: Prettier` with:

```markdown
- ✓ No formatter is configured (Prettier dropped, owner decision 2026-10-27). Match the surrounding code's formatting. ✗ Do not re-add a formatter without an owner decision.
```

In the same file, replace the line that starts `- ✓ Scripts: ` with:

```markdown
- ✓ Scripts: `typecheck` (`tsc -b`), `lint` (`eslint . --max-warnings=0`), `test` (Vitest + React Testing Library). CI runs all three; all must pass with zero warnings.
```

`.claude/memory/steering/conventions.md`: replace `(typescript-eslint strictTypeChecked) + Prettier.` with `(typescript-eslint strictTypeChecked); no formatter (Prettier dropped 2026-10-27).`

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm ls prettier eslint-config-prettier --depth=0`

Expected: exit 1, output ends with `(empty)`.

Run: `npm run typecheck && npm run lint`

Expected: both exit 0 with no output from ESLint. If ESLint now reports errors, stop: the rule set relied on `eslint-config-prettier`. Report the rule names.

Run: `npx vitest run tests/manifest.test.ts`

Expected: `Test Files  1 passed (1)`.

- [ ] **Step 5: Commit the coherent change**

```bash
git add package.json package-lock.json eslint.config.ts .claude/rules/tooling.md .claude/memory/steering/conventions.md
git commit -m "chore(tooling): drop Prettier and eslint-config-prettier"
```

(`git rm` already staged the two deletions.)

---

### Task 3: The package is BSD-3-Clause

**Owns:** The license of the tool (owner decision). `BSD-3-Clause` is on `pptb-validate`'s approved list and in `tests/manifest.test.ts`.

**Files:**

- Create: `LICENSE` — BSD 3-Clause text.
- Modify: `package.json` — `license`.
- Modify: `package-lock.json:10` — root `license`.
- Modify: `tests/manifest.test.ts` — assertion.
- Signal: `npx vitest run tests/manifest.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

In `tests/manifest.test.ts`, add this test directly after the test named `has the required identity fields` (`existsSync` and `readFileSync` are already imported):

```ts
  it('is BSD-3-Clause and ships the licence text', () => {
    expect(manifest.license).toBe('BSD-3-Clause');
    expect(existsSync(`${ROOT}LICENSE`)).toBe(true);
    expect(readFileSync(`${ROOT}LICENSE`, 'utf8')).toContain('BSD 3-Clause License');
  });
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run tests/manifest.test.ts`

Expected: `Tests  1 failed | N passed`, the failure `expected 'MIT' to be 'BSD-3-Clause'`.

- [ ] **Step 3: Implement the minimum fix**

Create `LICENSE`:

```text
BSD 3-Clause License

Copyright (c) 2026, Ryan Christopher
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

`package.json`: `"license": "MIT",` becomes `"license": "BSD-3-Clause",`.

`package-lock.json`: confirm line 10 is the root entry, then change it.

```bash
sed -n 10p package-lock.json
sed -i '10s/"license": "MIT"/"license": "BSD-3-Clause"/' package-lock.json
sed -n 8,11p package-lock.json
```

Expected from the first command: `      "license": "MIT",`. The last command shows the root `name`, `version` and `"license": "BSD-3-Clause",`.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run tests/manifest.test.ts`

Expected: `Test Files  1 passed (1)`.

Run: `git diff --stat package-lock.json package.json`

Expected: one line changed in each file.

- [ ] **Step 5: Commit the coherent change**

```bash
git add LICENSE package.json package-lock.json tests/manifest.test.ts
git commit -m "chore(license): publish under BSD-3-Clause"
```

---

### Task 4: The generated client rejects null and malformed envelopes (AC-4.5, AC-4.6)

**Owns:** Client envelope handling. `client.ts` `envelopeLines` is the only place that writes it; the nine fetch and jQuery goldens copy its output. Liquid clients have no envelope code.

**Files:**

- Create: `src/services/generators/client/client.envelope.test.ts` — runs the generated fetch and jQuery clients in `node:vm`.
- Modify: `src/services/generators/client/client.ts:182-210` — add the shape guards.
- Modify: `src/services/generators/client/__golden__/fetch-r1-get.js.txt`, `fetch-r2-post.js.txt`, `fetch-r4-get.js.txt`, `fetch-r4-put.js.txt`, `fetch-r5-del.js.txt`, `jquery-r1-get.js.txt`, `jquery-r2-post.js.txt`, `jquery-r4-del.js.txt`, `jquery-r10-patch.js.txt` — new envelope block.
- Signal: `npx vitest run src/services/generators/client/client.envelope.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/services/generators/client/client.envelope.test.ts`:

```ts
// @vitest-environment node
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import type { ClientLanguage } from '@/types/http';
import { generateClient } from './client';

type Chain = { done: (callback: (token: string) => void) => Chain; fail: () => Chain };

const INVALID = 'The response was not a valid envelope.';
const UNREADABLE = 'The response data could not be read.';
const data = (value: unknown): string => JSON.stringify(value);

// Fixtures from docs/spec-build-ccompare.md §5. `errors` are the texts the client must send to console.error.
const FIXTURES: readonly {
  name: string;
  envelope: unknown;
  logs: unknown[][];
  errors: string[];
}[] = [
  {
    name: 'valid payload',
    envelope: { success: true, data: data({ status: 'success', contacts: [1] }) },
    logs: [[[1]]],
    errors: [],
  },
  { name: 'null envelope', envelope: null, logs: [], errors: [INVALID] },
  { name: 'data "null"', envelope: { success: true, data: 'null' }, logs: [], errors: [UNREADABLE] },
  {
    name: 'malformed data',
    envelope: { success: true, data: '{oops' },
    logs: [],
    errors: [UNREADABLE],
  },
  {
    name: 'missing success',
    envelope: { data: data({ status: 'success', contacts: [1] }) },
    logs: [],
    errors: [INVALID],
  },
  {
    name: 'PascalCase Success and Data',
    envelope: { Success: true, Data: data({ status: 'success' }) },
    logs: [],
    errors: [INVALID],
  },
  {
    name: 'success false',
    envelope: { success: false, error: 'denied' },
    logs: [],
    errors: ['denied'],
  },
  {
    name: 'handler status error',
    envelope: { success: true, data: data({ status: 'error', message: 'nope' }) },
    logs: [],
    errors: ['nope'],
  },
];

const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/** Runs the generated client in a fresh realm. Returns what it logged, what it reported and what it threw, as JSON. */
async function runClient(language: ClientLanguage, envelope: unknown): Promise<string> {
  const logs: unknown[][] = [];
  const errors: unknown[][] = [];
  const thrown: string[] = [];
  const chain: Chain = {
    done: (callback) => {
      callback('token');
      return chain;
    },
    fail: () => chain,
  };
  const sandbox = {
    console: {
      log: (...args: unknown[]) => logs.push(args),
      error: (...args: unknown[]) => errors.push(args),
    },
    shell: {
      getTokenDeferred: () => chain,
      ajaxSafePost: (options: { success: (response: unknown) => void }) => {
        try {
          options.success(envelope);
        } catch (error) {
          thrown.push(error instanceof Error ? error.name : 'unknown');
        }
        return chain;
      },
    },
    fetch: () => Promise.resolve({ json: () => Promise.resolve(envelope) }),
  };
  createContext(sandbox);
  runInContext(
    generateClient({ slug: 'read-contacts', recipe: 'R1', fn: 'get', method: 'GET', language }),
    sandbox,
  );
  await settle();
  return JSON.stringify({ logs, errors, thrown });
}

describe.each(['fetch', 'jquery'] as const)(
  'generated %s client envelope handling (AC-4.5, AC-4.6)',
  (language) => {
    it.each(FIXTURES)('$name', async ({ envelope, logs, errors }) => {
      const expected = JSON.stringify({ logs, errors: errors.map((text) => [text]), thrown: [] });
      expect(await runClient(language, envelope)).toBe(expected);
    });
  },
);
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/services/generators/client/client.envelope.test.ts`

Expected: `Tests  8 failed | 8 passed (16)`. The failing names, for both `fetch` and `jquery`: `null envelope`, `data "null"`, `missing success`, `PascalCase Success and Data`. A jQuery failure shows `"thrown":["TypeError"]` in the received JSON. `valid payload`, `malformed data`, `success false` and `handler status error` pass.

- [ ] **Step 3: Implement the minimum fix**

In `src/services/generators/client/client.ts`, add two constants directly above `function showErrorLines()`:

```ts
const ENVELOPE_INVALID = 'The response was not a valid envelope.';
const DATA_UNREADABLE = 'The response data could not be read.';
```

Replace the `return [...]` of `envelopeLines` (the array that starts `'function handleEnvelope(envelope) {',`). The `done` constant above it stays.

```ts
  const invalid = `    showError(${JSON.stringify(ENVELOPE_INVALID)});`;
  const unreadable = `    showError(${JSON.stringify(DATA_UNREADABLE)});`;
  return [
    'function handleEnvelope(envelope) {',
    '  if (typeof envelope !== "object" || envelope === null) {',
    invalid,
    '    return;',
    '  }',
    '  if (envelope.success === false) {',
    '    showError(String(envelope.error));',
    '    return;',
    '  }',
    '  if (envelope.success !== true) {',
    invalid,
    '    return;',
    '  }',
    '  let parsed;',
    '  try {',
    '    parsed = JSON.parse(envelope.data);',
    '  } catch {',
    unreadable,
    '    return;',
    '  }',
    '  if (typeof parsed !== "object" || parsed === null) {',
    unreadable,
    '    return;',
    '  }',
    '  if (parsed.status !== "success") {',
    '    showError(String(parsed.message));',
    '    return;',
    '  }',
    done,
    '}',
  ];
```

Rewrite the nine goldens. The block is identical in each file; the script fails loudly if a file does not hold it exactly once.

```bash
node --input-type=module <<'EOF'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = 'src/services/generators/client/__golden__/';
const before = `function handleEnvelope(envelope) {
  if (envelope.success === false) {
    showError(String(envelope.error));
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(envelope.data);
  } catch {
    showError("The response data could not be read.");
    return;
  }
  if (parsed.status !== "success") {
`;
const after = `function handleEnvelope(envelope) {
  if (typeof envelope !== "object" || envelope === null) {
    showError("The response was not a valid envelope.");
    return;
  }
  if (envelope.success === false) {
    showError(String(envelope.error));
    return;
  }
  if (envelope.success !== true) {
    showError("The response was not a valid envelope.");
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(envelope.data);
  } catch {
    showError("The response data could not be read.");
    return;
  }
  if (typeof parsed !== "object" || parsed === null) {
    showError("The response data could not be read.");
    return;
  }
  if (parsed.status !== "success") {
`;
const files = readdirSync(dir).filter((name) => name.endsWith('.js.txt'));
for (const name of files) {
  const text = readFileSync(dir + name, 'utf8');
  if (text.split(before).length !== 2) throw new Error(`${name}: envelope block not found exactly once`);
  writeFileSync(dir + name, text.replace(before, after));
}
console.log(`rewrote ${files.length} goldens`);
EOF
```

Expected output: `rewrote 9 goldens`.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/services/generators/client/client.envelope.test.ts`

Expected: `Tests  16 passed (16)`.

Run: `npx vitest run src/services/generators/client`

Expected: `Test Files  5 passed (5)` (golden, liquid, matrix, client, envelope). The golden test compares each file to the generator, so a typo in either place fails here.

Run: `npm run typecheck && npm run lint`

Expected: exit 0, no ESLint output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/services/generators/client/client.ts src/services/generators/client/client.envelope.test.ts src/services/generators/client/__golden__
git commit -m "fix(client): reject null and malformed response envelopes in generated clients"
```

---

### Task 5: R7 handler behavior is run, not read (D2b)

**Owns:** Executable proof of the R7 contract: validate first, stage order, ticket escaping, stage failures and the documented missing-link behavior.

This task changes no handler behavior. The pre-change signal is that no test runs the R7 handler (`r7.test.ts` only reads its text). Step 2 records the green baseline. Step 4 proves each case can fail by breaking the handler on purpose.

**Files:**

- Create: `src/services/generators/handlers/r7.behavior.test.ts` — runs `generateR7().text` in `node:vm` against recorded fakes.
- Signal: `npx vitest run src/services/generators/handlers/r7.behavior.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

Create `src/services/generators/handlers/r7.behavior.test.ts`:

```ts
// @vitest-environment node
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { generateR7 } from '@/services/generators/handlers/r7';

type Reply = {
  StatusCode: number;
  Body: string;
  IsSuccessStatusCode: boolean;
  ReasonPhrase: string;
  Headers?: Record<string, string>;
};
type Call = { op: string; args: unknown[] };
type Run = { reply: unknown; calls: Call[]; logs: string[] };
type Options = {
  body?: unknown;
  settings?: Record<string, string>;
  http?: Reply[];
  create?: Reply;
};

const ACTIVITY_ID = 'act-123';
const SECRET = 'S3CRET';
const TOKEN = 'TOKEN123';
const TICKET_URL = 'https://contoso.sharepoint.com/Tickets/t.html';
const SETTINGS: Record<string, string> = {
  CLIENT_ID: 'cid',
  CLIENT_SECRET: SECRET,
  TENANT_ID: 'tid',
  HOSTNAME: 'contoso.sharepoint.com',
  SITE_PATH: '/sites/events',
};
const BODY = {
  fullname: 'Ada <b>Lovelace</b>',
  email: 'ada@example.com',
  phone: '555-0100',
  event: 1,
  eventText: 'Launch <script>',
  date: '2026-11-05',
};
const CREATED: Reply = {
  StatusCode: 204,
  Body: '',
  IsSuccessStatusCode: true,
  ReasonPhrase: 'No Content',
  Headers: { entityid: 'rec-1' },
};
const ALL_STAGES = ['PostAsync', 'GetAsync', 'GetAsync', 'PutAsync', 'CreateRecord'];

const ok = (body: unknown): Reply => ({
  StatusCode: 200,
  Body: JSON.stringify(body),
  IsSuccessStatusCode: true,
  ReasonPhrase: 'OK',
});
const failed = (code: number, phrase: string): Reply => ({
  StatusCode: code,
  Body: '',
  IsSuccessStatusCode: false,
  ReasonPhrase: phrase,
});
/** Token, site and drive replies, then the given upload reply. */
const connected = (upload: Reply): Reply[] => [
  ok({ access_token: TOKEN }),
  ok({ id: 'site-1' }),
  ok({ id: 'drive-1' }),
  upload,
];

/** Runs the generated handler in a fresh realm. Outbound calls take the next queued reply and are recorded. */
async function runR7(options: Options = {}): Promise<Run> {
  const {
    body = BODY,
    settings = SETTINGS,
    http = connected(ok({ webUrl: TICKET_URL })),
    create = CREATED,
  } = options;
  const calls: Call[] = [];
  const logs: string[] = [];
  const replies = [...http];
  const outbound =
    (op: string) =>
    (...args: unknown[]): Promise<Reply> => {
      calls.push({ op, args });
      const next = replies.shift();
      if (next === undefined) throw new Error(`unexpected ${op}`);
      return Promise.resolve(next);
    };
  const log = (message: string): void => {
    logs.push(message);
  };
  const sandbox = {
    Server: {
      Context: { ActivityId: ACTIVITY_ID, Body: JSON.stringify(body) },
      SiteSetting: { Get: (name: string) => settings[name] },
      Logger: { Log: log, Warn: log, Error: log },
      Connector: {
        HttpClient: {
          PostAsync: outbound('PostAsync'),
          GetAsync: outbound('GetAsync'),
          PutAsync: outbound('PutAsync'),
        },
        Dataverse: {
          CreateRecord: (...args: unknown[]): Reply => {
            calls.push({ op: 'CreateRecord', args });
            return create;
          },
        },
      },
    },
  };
  createContext(sandbox);
  runInContext(generateR7().text, sandbox);
  const text: unknown = await runInContext('post()', sandbox);
  if (typeof text !== 'string') throw new Error('post() did not return a string');
  const reply: unknown = JSON.parse(text);
  return { reply, calls, logs };
}

const ops = (run: Run): string[] => run.calls.map((call) => call.op);

/** The JSON the handler sent to Dataverse CreateRecord. */
function createdRecord(run: Run): unknown {
  const json = run.calls.find((call) => call.op === 'CreateRecord')?.args[1];
  if (typeof json !== 'string') throw new Error('CreateRecord did not get a JSON string');
  return JSON.parse(json);
}

describe('generated R7 handler, run in node:vm (AC-3.7, FR-3 R7)', () => {
  it('connects, uploads, then creates the record and returns its id', async () => {
    const run = await runR7();
    expect(ops(run)).toEqual(ALL_STAGES);
    expect(run.reply).toEqual({ status: 'success', id: 'rec-1' });
    expect(run.logs).toEqual([]);
    expect(createdRecord(run)).toMatchObject({
      crd69_name: 'Ada <b>Lovelace</b>',
      crd69_ticketurl: TICKET_URL,
    });
  });

  it('escapes the ticket HTML and builds the file path from ActivityId and a slug', async () => {
    const run = await runR7();
    const [url, html] = run.calls[3]?.args ?? [];
    expect(url).toBe(
      'https://graph.microsoft.com/v1.0/drives/drive-1/root:/Tickets/act-123-ada-b-lovelace-b.html:/content?@microsoft.graph.conflictBehavior=fail',
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('rejects invalid input before any outbound call', async () => {
    const run = await runR7({ body: { ...BODY, email: 'nope', event: 1.5 } });
    expect(run.reply).toMatchObject({
      status: 'error',
      message: "The request isn't valid.",
      errors: [{ field: 'email' }, { field: 'event' }],
    });
    expect(run.calls).toEqual([]);
    expect(run.logs).toEqual([]);
  });

  it('fails closed on a missing site setting before any outbound call', async () => {
    const run = await runR7({ settings: { ...SETTINGS, HOSTNAME: '' } });
    expect(run.reply).toEqual({
      status: 'error',
      message: "Server logic isn't configured: missing site setting HOSTNAME",
    });
    expect(run.calls).toEqual([]);
    expect(run.logs).toEqual(['Missing site setting HOSTNAME']);
  });

  it('stops at the first failing connect call', async () => {
    const run = await runR7({ http: [failed(401, 'Unauthorized')] });
    expect(run.reply).toEqual({ status: 'error', message: "Couldn't connect to SharePoint." });
    expect(ops(run)).toEqual(['PostAsync']);
    expect(run.logs).toEqual(['R7 connect 401 Unauthorized']);
  });

  it('creates no record when the upload fails, and leaks no secret or token', async () => {
    const run = await runR7({ http: connected(failed(500, 'Server Error')) });
    expect(run.reply).toEqual({ status: 'error', message: "Couldn't upload the ticket." });
    expect(ops(run)).toEqual(['PostAsync', 'GetAsync', 'GetAsync', 'PutAsync']);
    expect(run.logs).toEqual(['R7 upload 500 Server Error']);
    const visible = JSON.stringify({ reply: run.reply, logs: run.logs });
    expect(visible).not.toContain(SECRET);
    expect(visible).not.toContain(TOKEN);
  });

  it('reports the orphaned ticket when the create fails after the upload', async () => {
    const run = await runR7({ create: failed(400, 'Bad Request') });
    expect(run.reply).toEqual({
      status: 'error',
      message: 'Registration failed after the ticket was uploaded.',
    });
    expect(ops(run)).toEqual(ALL_STAGES);
    expect(run.logs).toEqual(['R7 create after upload 400 Bad Request act-123']);
  });

  it('still creates the record, with a null ticket URL, when Graph returns no link', async () => {
    const run = await runR7({ http: connected(ok({})) });
    expect(run.reply).toEqual({ status: 'success', id: 'rec-1' });
    expect(createdRecord(run)).toMatchObject({ crd69_ticketurl: null });
  });
});
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/services/generators/handlers/r7.behavior.test.ts`

Expected: `Tests  8 passed (8)`. This is the green baseline for behavior that already holds.

- [ ] **Step 3: Implement the minimum fix**

No production change. The test file from Step 1 is the deliverable.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Prove the test can fail. Break the upload status check on purpose, run, then restore:

```bash
sed -i "s/'    if (!upload.IsSuccessStatusCode) {',/'    if (false) {',/" src/services/generators/handlers/r7.ts
npx vitest run src/services/generators/handlers/r7.behavior.test.ts
git checkout -- src/services/generators/handlers/r7.ts
```

Expected from the vitest run: at least one failure, in `creates no record when the upload fails, and leaks no secret or token`. `git status --short src/services/generators/handlers/r7.ts` prints nothing after the restore.

Run: `npx vitest run src/services/generators/handlers`

Expected: every file passes.

Run: `npm run lint`

Expected: exit 0, no output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/services/generators/handlers/r7.behavior.test.ts
git commit -m "test(r7): run the generated handler in node:vm against recorded fakes"
```

---

### Task 6: README notes cover R4 readability and the R7 missing link

**Owns:** Shipped README notes for R4 and R7 (`readmeNotes.ts`). The R4 text comes from `recipes.ts:146` and spec FR-3 R4; the R7 text documents Phase 19 Decision 7.

**Files:**

- Modify: `src/services/generators/package/readmeNotes.ts:6,7-15` — R4 and R7 notes.
- Modify: `src/services/generators/package/__golden__/R4.README.md.txt` — Notes section.
- Modify: `src/services/generators/package/readme.test.ts` — notes test (~line 336).
- Signal: `npx vitest run src/services/generators/package/readme.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

In `readme.test.ts`, in the test that already asserts `The Global Create grant is expected, and Logic Inspector flags it.`, add directly after that `expect(buildReadme(inputFor('R4'))).toContain(...)` statement:

```ts
    expect(buildReadme(inputFor('R4'))).toContain(
      "The new contact isn't readable through the Account-scoped permission until it's linked to the caller's account.",
    );
```

In the same test, add after `expect(r7).toContain('invalid choice value');`:

```ts
    expect(r7).toContain('the registration is still created with an empty ticket URL');
```

In `__golden__/R4.README.md.txt`, replace the line `- The Global Create grant is expected, and Logic Inspector flags it.` with these two lines:

```markdown
- The Global Create grant is expected, and Logic Inspector flags it.
- The new contact isn't readable through the Account-scoped permission until it's linked to the caller's account.
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/services/generators/package/readme.test.ts`

Expected: at least two failures: `R4 README matches the golden` and the notes test (`expected '…' to contain "The new contact isn't readable…"`).

- [ ] **Step 3: Implement the minimum fix**

In `src/services/generators/package/readmeNotes.ts`, replace the R4 line with:

```ts
  R4: [
    'The Global Create grant is expected, and Logic Inspector flags it.',
    "The new contact isn't readable through the Account-scoped permission until it's linked to the caller's account.",
  ],
```

In the R7 array, add this entry directly after the line that starts `'An invalid choice value that Dataverse rejects`:

```ts
    'If Graph returns no link for the uploaded ticket, the registration is still created with an empty ticket URL.',
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/services/generators/package`

Expected: every file passes.

Run: `npm run typecheck && npm run lint`

Expected: exit 0, no ESLint output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/services/generators/package/readmeNotes.ts src/services/generators/package/readme.test.ts src/services/generators/package/__golden__/R4.README.md.txt
git commit -m "docs(readme): note R4 Account-scope readability and the R7 missing ticket link"
```

---

### Task 7: Switching recipe resets Liquid with the same toast (AC-4.7)

**Owns:** The rule that a Liquid reset caused by the recipe shows `LIQUID_RESET_NOTICE`. `starterReducer.ts` owns it; the provider already shows any `pendingNotice` once.

**Files:**

- Modify: `src/app/starter-session/starterReducer.ts:61-81` — `selectRecipe`.
- Modify: `src/app/starter-session/starterReducer.test.ts:49-56` — flip the silent-reset test; add a no-toast test.
- Signal: `npx vitest run src/app/starter-session/starterReducer.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

In `starterReducer.test.ts`, replace the test `resets Liquid to fetch when the new recipe has no Liquid support` with these two tests:

```ts
  it('resets Liquid to fetch with the toast when the new recipe has no Liquid support (AC-4.7)', () => {
    const state = run(
      { type: 'setLanguage', language: 'liquid' },
      { type: 'selectRecipe', recipe: 'R2' },
    );
    expect(state.language).toBe('fetch');
    expect(state.pendingNotice).toEqual(LIQUID_RESET_NOTICE);
  });

  it('keeps Liquid, with no toast, when the new recipe supports it', () => {
    const state = run(
      { type: 'setLanguage', language: 'liquid' },
      { type: 'selectRecipe', recipe: 'R1' },
    );
    expect(state.language).toBe('liquid');
    expect(state.pendingNotice).toBeNull();
  });
```

(`LIQUID_RESET_NOTICE` is already imported in this file.)

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/app/starter-session/starterReducer.test.ts`

Expected: `Tests  1 failed`, in `resets Liquid to fetch with the toast…`: `expected null to deeply equal { title: "Switched to fetch: …", body: '', type: 'info' }`.

- [ ] **Step 3: Implement the minimum fix**

In `starterReducer.ts`, replace the body of `case 'selectRecipe': { ... }` (lines 61-81) with:

```ts
      case 'selectRecipe': {
        const recipe = getRecipe(action.recipe);
        const text = generated(deps, action.recipe);
        // AC-4.7: losing Liquid because the new recipe can't use it gets the same toast as a text edit.
        // Leaving or entering R8 is exempt (Decision 6): R8 fixes the language.
        const liquidLost =
          state.language === 'liquid' &&
          state.recipe !== 'R8' &&
          action.recipe !== 'R8' &&
          !deps.isLiquidAllowed(recipe, text);
        const language =
          action.recipe === 'R8' ? 'liquid' : state.recipe === 'R8' || liquidLost ? 'fetch' : state.language;
        return {
          ...state,
          recipe: action.recipe,
          method: recipe.defaultMethod,
          language,
          serverText: text,
          generatedText: text,
          cursor: null,
          reviewedText: null,
          pendingNotice: liquidLost ? LIQUID_RESET_NOTICE : state.pendingNotice,
        };
      }
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/app/starter-session`

Expected: every file passes, including `StarterSessionProvider.test.tsx`.

Run: `npm run typecheck && npm run lint`

Expected: exit 0, no ESLint output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/app/starter-session/starterReducer.ts src/app/starter-session/starterReducer.test.ts
git commit -m "fix(starter): toast when a recipe switch resets Liquid to fetch (AC-4.7)"
```

---

### Task 8: `Server.User.fullname` shows no invented return type (AC-6.5)

**Owns:** The catalogue fact that `fullname` has no documented return type. The object description (`serverObjects.ts:186`) already says `Server.User` is null for anonymous callers.

**Files:**

- Modify: `src/services/catalogue/serverObjects.ts:195` — `returns`.
- Modify: `src/features/server-objects/ServerObjectsPage.test.tsx` — new test.
- Signal: `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`.

- [ ] **Step 1: Establish the observable pre-change signal**

In `ServerObjectsPage.test.tsx`, add this test inside `describe('Server Objects page (Story 6)', ...)`, directly after the test `shows the list, the detail and the context column (AC-6.1)`:

```tsx
  it('shows "Not documented on Learn" for Server.User.fullname, not an invented return type (AC-6.5)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.User'));
    expect(detail().textContent).toContain('Returns: Not documented on Learn');
  });
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`

Expected: `Tests  1 failed`; the received text contains `Returns: null when the caller is anonymous`.

- [ ] **Step 3: Implement the minimum fix**

In `serverObjects.ts`, in the `fullname` member of `Server.User`, replace `returns: 'null when the caller is anonymous',` with `returns: null,`.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/server-objects src/services/catalogue`

Expected: every file passes.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/services/catalogue/serverObjects.ts src/features/server-objects/ServerObjectsPage.test.tsx
git commit -m "fix(objects): Server.User.fullname has no documented return type (AC-6.5)"
```

---

### Task 9: Object detail has a Learn link and named code samples (D6, a11y)

**Owns:** The Learn URL (`SERVER_OBJECTS_LEARN_URL` in `serverObjects.ts`) and the sample code's accessible role. The link uses the existing `ExternalLink`, which keeps a real `href` and opens through the host on click (FR-1).

**Files:**

- Modify: `src/services/catalogue/serverObjects.ts:21` — add the URL constant.
- Modify: `src/features/server-objects/ObjectDetail.tsx:28,62` — `role="group"` on the sample, the link.
- Modify: `src/features/server-objects/ServerObjectsPage.test.tsx` — two tests.
- Signal: `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`.

- [ ] **Step 1: Establish the observable pre-change signal**

In `ServerObjectsPage.test.tsx`, add this constant below the `HANDLER` constant:

```tsx
const LEARN = 'https://learn.microsoft.com/power-pages/configure/server-objects';
```

Add these tests directly after the test added in Task 8:

```tsx
  it('exposes the code sample as a named group (a11y)', () => {
    renderObjects(<ServerObjectsPage />);
    expect(within(detail()).getAllByRole('group', { name: /sample$/ })).toHaveLength(1);
  });

  it('links the Learn reference through the host, never a new window (FR-1)', async () => {
    const { host, user } = renderObjects(<ServerObjectsPage />);
    const link = within(detail()).getByRole('link', { name: 'Server objects on Microsoft Learn' });
    expect(link.getAttribute('href')).toBe(LEARN);
    expect(link.getAttribute('target')).toBeNull();
    await user.click(link);
    expect(host.callsOf('openExternal')).toHaveLength(1);
    expect(host.callsOf('openExternal')[0]?.url).toBe(LEARN);
  });
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`

Expected: `Tests  2 failed`. One reads `Unable to find an accessible element with the role "group" and name `/sample$/``; the other reads `Unable to find an accessible element with the role "link" and name "Server objects on Microsoft Learn"`.

- [ ] **Step 3: Implement the minimum fix**

`serverObjects.ts`: add directly below `export const NOT_DOCUMENTED = 'Not documented on Learn';`:

```ts
/** The Learn reference these objects come from (FR-1 external link). */
export const SERVER_OBJECTS_LEARN_URL =
  'https://learn.microsoft.com/power-pages/configure/server-objects';
```

`ObjectDetail.tsx`: add `import { ExternalLink } from '@/app/ExternalLink';` below the `CopyButton` import. Change the import from the catalogue to:

```tsx
import {
  NOT_DOCUMENTED,
  SERVER_OBJECTS_LEARN_URL,
  isConnector,
} from '@/services/catalogue/serverObjects';
```

In `SampleCode`, change `<pre className="objects-code" aria-label={label}>` to:

```tsx
    <pre className="objects-code" role="group" aria-label={label}>
```

Directly below `<p className="objects-detail__description">{object.description}</p>`, add:

```tsx
        <ExternalLink href={SERVER_OBJECTS_LEARN_URL}>Server objects on Microsoft Learn</ExternalLink>
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/server-objects src/app/ExternalLink.test.tsx`

Expected: every file passes (the existing `getByLabelText('… sample')` queries still match the group).

Run: `npm run typecheck && npm run lint`

Expected: exit 0, no ESLint output (this proves `jsx-a11y` accepts `role="group"` on `<pre>`).

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/services/catalogue/serverObjects.ts src/features/server-objects/ObjectDetail.tsx src/features/server-objects/ServerObjectsPage.test.tsx
git commit -m "feat(objects): Learn link in object detail; samples are named groups"
```

---

### Task 10: The object list announces its count and the `used` mark (a11y)

**Owns:** The list's live result count and the accessible meaning of the `used` pill. `.objects-visually-hidden` is the one hidden-text class.

**Files:**

- Modify: `src/features/server-objects/ServerObjectsPage.tsx:68-77,92-96` — live count, pill text.
- Modify: `src/features/server-objects/serverObjects.css` — append `.objects-visually-hidden`.
- Modify: `src/features/server-objects/ServerObjectsPage.test.tsx` — two tests.
- Signal: `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`.

- [ ] **Step 1: Establish the observable pre-change signal**

Add these tests directly after the tests from Task 9:

```tsx
  it('announces how many objects the list shows (a11y)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    const count = (): string => within(list()).getByRole('status').textContent;
    expect(count()).toBe('9 objects listed');
    await user.type(screen.getByRole('searchbox', { name: 'Search objects and methods' }), 'zzz');
    expect(count()).toBe('0 objects listed');
  });

  it('says what the used mark means (a11y)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    dispatch({ type: 'editServer', text: HANDLER, cursor: null });
    expect(pick('Server.Logger').textContent).toContain('used by the current handler');
  });
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`

Expected: `Tests  2 failed`: `Unable to find an accessible element with the role "status"` and `expected '…used…' to contain 'used by the current handler'`.

- [ ] **Step 3: Implement the minimum fix**

`ServerObjectsPage.tsx`: directly after the `PillGroup` element (the one with `label="Filter objects"`) and before `<ul className="objects-list__items">`, add:

```tsx
        <p role="status" className="objects-visually-hidden">
          {`${String(listed.length)} ${listed.length === 1 ? 'object' : 'objects'} listed`}
        </p>
```

Replace the `used` pill:

```tsx
                    {derived.usedMembers.has(object.path) ? (
                      <Pill tone="server" compact>
                        used
                        <span className="objects-visually-hidden"> by the current handler</span>
                      </Pill>
                    ) : null}
```

Append to `serverObjects.css`:

```css

.objects-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/server-objects`

Expected: every file passes. If an older test fails on the `used` pill text, update it to match `used by the current handler`; the visible word `used` is unchanged.

Run: `npm run typecheck && npm run lint`

Expected: exit 0, no ESLint output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/server-objects/ServerObjectsPage.tsx src/features/server-objects/serverObjects.css src/features/server-objects/ServerObjectsPage.test.tsx
git commit -m "fix(objects): announce the result count and name the used mark (a11y)"
```

---

### Task 11: "Permissions needed" lists outbound domains and site settings (AC-3.6)

**Owns:** Rendering `RecipeMeta.outboundDomains` and `siteSettings` in the Server Objects tile. The data already lives in `types/recipe.ts:25-26`.

**Files:**

- Modify: `src/features/server-objects/ContextColumn.tsx:57-79` — two lists.
- Modify: `src/features/server-objects/ServerObjectsPage.test.tsx` — one test.
- Signal: `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`.

- [ ] **Step 1: Establish the observable pre-change signal**

Add this test directly after the `shows used members, permissions and another sample (AC-6.9)` test:

```tsx
  it('lists outbound domains and site settings for the selected recipe (AC-3.6)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    const permissions = screen.getByRole('region', { name: 'Permissions needed' });
    expect(within(permissions).queryByText('Outbound domains')).toBeNull();
    dispatch({ type: 'selectRecipe', recipe: 'R7' });
    expect(within(permissions).getByText('graph.microsoft.com')).toBeTruthy();
    expect(within(permissions).getByText('CLIENT_SECRET')).toBeTruthy();
  });
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`

Expected: `Tests  1 failed`: `Unable to find an element with the text: graph.microsoft.com`.

- [ ] **Step 3: Implement the minimum fix**

In `ContextColumn.tsx`, add this component below the imports:

```tsx
function NeededList({
  label,
  items,
}: {
  label: string;
  items: readonly string[];
}): ReactElement | null {
  if (items.length === 0) return null;
  return (
    <>
      <p className="objects-muted">{label}</p>
      <ul className="objects-grants">
        {items.map((item) => (
          <li key={item}>
            <Pill compact mono>
              {item}
            </Pill>
          </li>
        ))}
      </ul>
    </>
  );
}
```

Directly after `<Pill>{recipe.webRole}</Pill>`, add:

```tsx
        <NeededList label="Outbound domains" items={recipe.outboundDomains} />
        <NeededList label="Site settings" items={recipe.siteSettings} />
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/server-objects`

Expected: every file passes.

Run: `npm run typecheck && npm run lint`

Expected: exit 0, no ESLint output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/features/server-objects/ContextColumn.tsx src/features/server-objects/ServerObjectsPage.test.tsx
git commit -m "feat(objects): Permissions needed lists outbound domains and site settings (AC-3.6)"
```

---

### Task 12: The Validation note sits on the Validation pill (AC-5.3)

**Owns:** Where the "edits aren't rechecked" note shows. `StatusBadge` gains optional children so a badge can hold a control; `EDITED_VALIDATION_NOTE` and `useDisabledReason` stay as they are.

**Files:**

- Modify: `src/components/StatusBadge.tsx:9,19-26` — optional `children`.
- Modify: `src/features/starter/inputs/StarterInputs.tsx:156-163` — put the info button inside the pill.
- Modify: `src/features/starter/StarterPage.test.tsx:143-152` — test.
- Signal: `npx vitest run src/features/starter/StarterPage.test.tsx`.

- [ ] **Step 1: Establish the observable pre-change signal**

Replace the test `explains that edited validation is not rechecked (AC-5.3)` with:

```tsx
  it('explains on the Validation pill that edited validation is not rechecked (AC-5.3)', () => {
    const h = renderStarter(<StarterPage />);
    const pill = (): HTMLElement => within(readiness()).getByText('Validation');
    expect(within(pill()).queryByRole('button', { name: 'About validation' })).toBeNull();
    h.dispatch({ type: 'editServer', text: 'changed', cursor: null });
    expect(
      within(pill()).getByRole('button', { name: 'About validation' }),
    ).toHaveAccessibleDescription("Generated validation; edits aren't rechecked.");
  });
```

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/features/starter/StarterPage.test.tsx`

Expected: `Tests  1 failed`: `Unable to find an accessible element with the role "button" and name "About validation"` (the button sits beside the pill, not inside it).

- [ ] **Step 3: Implement the minimum fix**

`StatusBadge.tsx`: change the first import to `import type { ReactElement, ReactNode } from 'react';`, the props type to

```tsx
export type StatusBadgeProps = { kind: BadgeKind; label: string; children?: ReactNode };
```

and the component to

```tsx
export function StatusBadge({ kind, label, children }: StatusBadgeProps): ReactElement {
  return (
    <Pill tone={TONE[kind]}>
      <span className="ui-badge__glyph" data-glyph={kind} aria-hidden="true">
        <Icon name={GLYPH[kind]} size={12} />
      </span>
      {label}
      {children}
    </Pill>
  );
}
```

`StarterInputs.tsx`, in `ReadinessTile`, replace the Validation row:

```tsx
        <span className="starter-readiness__row">
          <StatusBadge kind="ok" label="Validation">
            {derived.edited ? <EditedValidationInfo /> : null}
          </StatusBadge>
        </span>
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/features/starter src/components`

Expected: every file passes. The owner's 1100×780 render check (review gate ◆) covers how the button looks inside the pill.

Run: `npm run typecheck && npm run lint`

Expected: exit 0, no ESLint output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/components/StatusBadge.tsx src/features/starter/inputs/StarterInputs.tsx src/features/starter/StarterPage.test.tsx
git commit -m "fix(starter): put the validation note on the Validation pill (AC-5.3)"
```

---

### Task 13: The site pill is hidden while Logic Inspector is unreleased (D5)

**Owns:** When the title bar shows the site pill. The constant `__PAGE_INSPECTOR__` is already the release switch (`App.tsx:69`).

**Files:**

- Modify: `src/app/shell/TitleBar.tsx:20` — render the pill only when Inspector is released.
- Modify: `src/app/App.test.tsx:2-3,55-56` — stub test.
- Modify: `tests/buildShape.test.ts` — bundle assertions.
- Signal: `npx vitest run src/app/App.test.tsx tests/buildShape.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

`App.test.tsx`: change the vitest import to `import { afterEach, describe, expect, it, vi } from 'vitest';`. Add this test directly after the test `reads "Not connected" and keeps the site pill disabled without a connection (AC-1.3)`:

```tsx
  it('does not render the site pill while Logic Inspector is unreleased (AC-1.7)', async () => {
    vi.stubGlobal('__PAGE_INSPECTOR__', false);
    try {
      await mount(null);
      expect(screen.getByText('Not connected')).toBeTruthy();
      expect(screen.queryByText('No site selected')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
```

`tests/buildShape.test.ts`: in the test `includes all three pages`, add `expect(code).toContain('No site selected');`. In the test `ships Starter and Server Objects but not the Inspector placeholder in --mode beta`, add `expect(code).not.toContain('No site selected');`.

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/app/App.test.tsx tests/buildShape.test.ts`

Expected: `Tests  2 failed`: the new App test (`expected <span …> to be null`) and the `--mode beta` build test (`expected '…' not to contain 'No site selected'`). This run builds the tool and takes about a minute.

- [ ] **Step 3: Implement the minimum fix**

In `TitleBar.tsx`, replace `<SitePill />` with:

```tsx
        {__PAGE_INSPECTOR__ ? <SitePill /> : null}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/app tests/buildShape.test.ts`

Expected: every file passes. The beta bundle no longer holds the string `No site selected`; the all-pages bundle still does.

Run: `npm run typecheck && npm run lint`

Expected: exit 0, no ESLint output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/app/shell/TitleBar.tsx src/app/App.test.tsx tests/buildShape.test.ts
git commit -m "fix(shell): hide the site pill while Logic Inspector is unreleased"
```

---

### Task 14: The host handler is removed when the page unloads (FR-12)

**Owns:** Removing the `toolboxAPI.events` handler on `pagehide`. `createEventHub` in `pptbHost.ts` owns it.

**Files:**

- Modify: `src/services/pptb/pptbHost.ts:69-105` — `createEventHub`.
- Modify: `src/services/pptb/pptbHost.test.ts` — new test inside `describe('onEvent', …)`.
- Modify: `src/app/App.test.tsx:71` — rename the test that overstates its coverage.
- Signal: `npx vitest run src/services/pptb/pptbHost.test.ts`.

- [ ] **Step 1: Establish the observable pre-change signal**

In `pptbHost.test.ts`, add this test inside `describe('onEvent', …)`, directly after the test that starts `stops delivering after unsubscribe and calls events.off with the same callback after the last one`:

```ts
  it('removes the host handler once when the page is hidden (FR-12)', () => {
    host.onEvent(() => undefined);
    const callback = hub();
    window.dispatchEvent(new Event('pagehide'));
    const removed = (): number =>
      stubs.off.mock.calls.filter(([registered]) => registered === callback).length;
    expect(removed()).toBe(1);
    window.dispatchEvent(new Event('pagehide'));
    expect(removed()).toBe(1);
  });
```

(`hub()` is the helper at the top of that `describe`. The filter ignores `off` calls from listeners that earlier tests left on `window`.)

In `App.test.tsx`, rename the test `registers one host event listener for the whole app and removes it on unload (FR-12)` to `registers one host event listener for the whole app and removes it on unmount`.

- [ ] **Step 2: Capture the current signal**

Run: `npx vitest run src/services/pptb/pptbHost.test.ts`

Expected: `Tests  1 failed`: `expected 0 to be 1`.

- [ ] **Step 3: Implement the minimum fix**

Replace the returned function of `createEventHub` (everything from `return (handler) => {` to the end of the function) and add `detach` above it:

```ts
  // FR-12: the host handler also goes when the tool unloads. A later subscribe registers it again.
  const detach = (): void => {
    if (!registered) return;
    registered = false;
    window.removeEventListener('pagehide', detach);
    try {
      window.toolboxAPI.events.off(hub);
    } catch (error) {
      logHostFailure('events.off', error);
    }
  };
  return (handler) => {
    handlers.add(handler);
    if (!registered) {
      try {
        window.toolboxAPI.events.on(hub);
        registered = true;
        window.addEventListener('pagehide', detach);
      } catch (error) {
        logHostFailure('events.on', error);
      }
    }
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) detach();
    };
  };
```

Update the doc comment above `createEventHub`: change its second sentence to `The last unsubscribe, or the page's pagehide, calls events.off (declared in @pptb/types, not shown in the docs: Spike S2).`

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/services/pptb src/app`

Expected: every file passes, including the existing `stops delivering after unsubscribe…` test.

Run: `npm run typecheck && npm run lint`

Expected: exit 0, no ESLint output.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/services/pptb/pptbHost.ts src/services/pptb/pptbHost.test.ts src/app/App.test.tsx
git commit -m "fix(host): remove the toolbox event handler on pagehide (FR-12)"
```

---

### Task 15: The browser-check timing tests have an explicit timeout

**Owns:** The timeout of the two timing tests. The assertions already use CPU time; only the 5 s default is flaky under load.

**Files:**

- Modify: `src/lib/code-analysis/browserChecks.test.ts:236-244` — both timing tests.
- Signal: `npx vitest run src/lib/code-analysis/browserChecks.test.ts --testTimeout=50`.

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
npx vitest run src/lib/code-analysis/browserChecks.test.ts --testTimeout=50
```

- [ ] **Step 2: Capture the current signal**

Run: the command above.

Expected: at least one failure, `Test timed out in 50ms.`, in `checks a 2 000-line file well inside the budget` (seven runs of about 40 ms each). The second timing test may also fail. Vitest fails a synchronous test that runs past its timeout.

- [ ] **Step 3: Implement the minimum fix**

Above `const fastestRun`, add:

```ts
  // Wall time is not the budget (see fastestRun); the Vitest timeout only has to survive a loaded machine.
  const TIMING_TIMEOUT = 20_000;
```

Add `, TIMING_TIMEOUT` as the third argument of both `it(...)` calls. The first becomes:

```ts
  it('checks a 2 000-line file well inside the budget', () => {
    expect(runBrowserChecks(code).hits.filter((h) => h.severity === 'blocked')).toHaveLength(20);
    expect(fastestRun(code)).toBeLessThan(300);
  }, TIMING_TIMEOUT);
```

and the second ends with `}, TIMING_TIMEOUT);` in the same way.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run src/lib/code-analysis/browserChecks.test.ts --testTimeout=50`

Expected: no `timed out` failures for the two timing tests (an explicit timeout wins over `--testTimeout`).

Run: `npx vitest run src/lib/code-analysis`

Expected: every file passes.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/lib/code-analysis/browserChecks.test.ts
git commit -m "test(code-analysis): give the timing tests an explicit timeout"
```

---

### Task 16: The beta build passes every gate that is automated

**Owns:** The release evidence. Nothing is edited here.

**Files:**

- Signal: the commands below.

- [ ] **Step 1: Run the gates**

```bash
npm run typecheck
npm run lint
npx vitest run
npm run build:beta
```

- [ ] **Step 2: Check the results**

Expected:

- `npm run typecheck` and `npm run lint`: exit 0, no ESLint output.
- `npx vitest run`: `Test Files  91 passed (91)` and `Tests  1383 passed (1383)` (1,349 baseline plus 34 new). A run on a loaded machine may fail `browserChecks.test.ts`; Task 15 should prevent that.
- `npm run build:beta`: exit 0 and one JavaScript file in `dist/assets/`.

- [ ] **Step 3: Check the beta bundle**

```bash
node -e "const fs=require('fs');const f=fs.readdirSync('dist/assets').find(n=>n.endsWith('.js'));const c=fs.readFileSync('dist/assets/'+f,'utf8');for(const s of ['Discard your edits?','Search objects and methods','Logic Inspector page placeholder','No site selected','jsPDF'])console.log(s.padEnd(34),c.includes(s))"
```

Expected: the first two lines end in `true`; the other three end in `false`.

- [ ] **Step 4: Run the validator**

Run: `npx pptb-validate`

Expected while the GitHub repository is private: exit 1 with `configurations.repository URL is not accessible` and `configurations.readmeUrl is not accessible` only (B1; the owner validates manually after the merge to `main`). Any other error is a defect.

- [ ] **Step 5: Hand over**

Report the outputs above. The owner then runs the gates marked ◆ in the review: PPTB Desktop smoke test of `dist/`, the three-maker walkthrough, Server Objects at 1100×780, and the explicit publish confirmation. Merge to `main` and `npm publish` stay with the owner.
