# Phase 00: Skeleton, tooling, contracts, library probe, S1/S4 evidence

**Implements:** FR-12 (PPTB manifest, single IIFE bundle, no CDN, no `cspExceptions`), FR-1 (released pages as a build-time constant; unreleased page code left out of the bundle), FR-10 and FR-11 (report fonts, JetBrains Mono and Fluent System Icons bundled locally), FR-7 (S1 and S4 evidence recorded under F59) | **Satisfies:** AC-1.7, build-time half only (an unreleased page's code is absent from the bundle; the disabled-tab behaviour is Phase 06). No other AC is owned here: this phase is the enabling skeleton that every later phase builds on.
**Depends on:** none (Wave W0)
**Files:**
- Create or replace at the repo root: `package.json` (modify the generator's), `package-lock.json`, `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.ts`, `.prettierrc.json`, `.prettierignore`, `.gitignore` (append), `README.md`, `public/icons/server-logic-tools.svg`, `scripts/bundle-size.mjs`. The generator also writes `.npmignore`, which is kept as is.
- Delete (the generator's demo): `src/App.tsx`, `src/components/ConnectionStatus.tsx`, `src/components/DataverseAPIDemo.tsx`, `src/components/EventLog.tsx`, `src/components/ToolboxAPIDemo.tsx`, `src/hooks/useToolboxAPI.ts`.
- Create under `src/`: `main.tsx`, `index.css`, `vite-env.d.ts`, `skeleton.test.ts`.
  - `test/`: `setup.ts`, `toolchain.test.tsx`.
  - `assets/fonts/`: `fonts.css`, `jetbrains-mono-latin-{400,500,700}-normal.woff2`, `DMSans_{400Regular,500Medium,700Bold}.ttf`, `SpaceGrotesk_{400Regular,500Medium,700Bold}.ttf`, `OFL-JetBrainsMono.txt`, `OFL-DMSans.txt`, `OFL-SpaceGrotesk.txt`.
  - `lib/`: `emptyModule.ts`, `slug.ts`, `text.ts`.
  - `lib/code-analysis/`: `codeAnalysis.types.ts`, `browserChecks.ts`, `structure.ts`.
  - `probe/`: `libraryProbe.ts`, `libraryProbe.test.ts`.
  - `types/`: `http.ts`, `recipe.ts`, `inspector.ts`, `report.ts`, `contracts.test.ts`.
  - `services/pptb/`: `host.types.ts`, `pptbHost.ts`, `fakeHost.ts`.
  - `services/catalogue/`: `recipes.ts`, `serverObjects.ts`.
  - `services/generators/handlers/`: `index.ts`, `r1.ts` to `r10.ts`, `demoPages.ts`.
  - `services/generators/client/client.ts`.
  - `services/generators/package/`: `buildPackageFiles.ts`, `buildZip.ts`.
  - `app/`: `App.tsx`, `App.test.tsx`, `releasedPages.ts`, `releasedPages.test.ts`, `HostContext.ts`, `useNotify.ts`, `useView.ts`.
  - `app/starter-session/`: `starterSession.types.ts`, `StarterSessionProvider.tsx`, `useStarterSession.ts`.
  - `features/starter/`: `StarterPage.tsx`, `download/DownloadStarterButton.tsx`.
  - `features/server-objects/ServerObjectsPage.tsx`.
  - `features/inspector/`: `InspectorPage.tsx`, `model/rules.ts`, `scan/scan.ts`.
  - `features/inspector/report/`: `reportModel.types.ts`, `buildReportModel.ts`, `renderMarkdown.ts`, `renderPdf.ts`, `reportFileName.ts`.
- Create under `tests/` (Node environment): `manifest.test.ts`, `buildShape.test.ts`.
**Interfaces:** Consumes: nothing from earlier phases (this is the first). It consumes the `generator-pptb` React template, `@pptb/types`, and the contract text in `plan.md` (Contracts and Pinned function signatures), which it commits verbatim. Produces, with exact names:
- every contract type and constant in `plan.md`: `HttpMethod`, `HTTP_METHODS`, `HandlerFunction`, `METHOD_FUNCTION`, `ClientLanguage`, `View`, the recipe types, the code-analysis types, the `host.types.ts` types and `HostReadError`, the inspector types, the report option types, and the Starter session types;
- a stub for every pinned function, with the contract signature and the body `throw new Error('not implemented: phase NN')` (NN is the owning phase). The stub list is in Steps 37 to 39;
- `RELEASED_PAGES: readonly View[]` from `@/app/releasedPages`;
- the `@/` alias (`@/` maps to `src/`) in `tsconfig.app.json`, `vite.config.ts` and Vitest;
- the npm scripts `typecheck`, `lint`, `format:check`, `test`, `build`, `probe:size` and `size`;
- `src/test/setup.ts` (jest-dom matchers and RTL cleanup) and the build-shape test;
- all runtime dependencies and the bundled fonts, so no later phase edits `package.json`.

This phase scaffolds the PPTB tool with the official generator and layers the project's TypeScript, lint, format and test rules on top. It commits the cross-phase contracts and a stub for every pinned function, so Wave W1 and later phases can run in parallel with disjoint file ownership. It also proves, before any feature exists, that the build is a single IIFE bundle, that unreleased pages are dropped from it, and that jsPDF, CodeMirror, acorn, fflate, a TTF font and a Fluent icon bundle together. Finally, it records the S1 and S4 spike evidence.

> **Complexity note.** Gate: Simplicity (at most 3 major components). Violation: this phase creates about 70 files, because every cross-phase function gets a stub and every runtime dependency is installed here. Justification: plan.md "Execution model" runs phases in one wave in separate worktrees with disjoint file ownership, and states that "No later phase edits `package.json`"; both are impossible unless the skeleton exists first. The Integration-First gate is met (contracts and their type test come before any implementation). Dependency gate: every package is named by the spec. jsPDF, jspdf-autotable, fflate and CodeMirror 6 come from the Resolved log (v1.1.0); acorn comes from FR-4 and FR-7; Fluent System Icons from FR-11; the fonts from FR-10 and FR-11.

> **Execution notes for the implementer.**
> - The Vite and tooling versions below were chosen from the npm registry on 2026-10-16. The generator (`generator-pptb@1.0.6`) ships React 18, Vite 7 and `@vitejs/plugin-react` 4, so Steps 4 and 5 upgrade React to 19 and pin the tooling to versions that agree with each other. Pins that matter: `eslint@^9` (because `eslint-plugin-jsx-a11y` only supports ESLint up to 9), `typescript@~5.9` (because `typescript-eslint` supports TypeScript below 6.1), `vite@^7` (the generator's major) and `@vitejs/plugin-react@^5` (the last line that accepts a `babel` option for the React Compiler on Vite 7).
> - The code in this plan was written without being run. Treat each "expect PASS" line as the check, and if a tool prints an error, fix the cause in the file shown, not by loosening a rule.
> - The SDD hard gate ("no code without a prior failing test") has two exceptions: Step 1 (generated scaffold) and the config files of Step 11. The config files are covered by the red-first tests in Steps 7, 20, 29 and 41.

---

## Steps

### A. Scaffold

- [ ] **Step 0: Preflight**

  Run from the repo root:

  ```bash
  git branch --show-current
  git status --short
  node --version
  npm --version
  ls package.json 2>&1
  ```

  Expect: branch `001-server-logic-starter-inspector`; the only untracked entries are `docs/specs/001-server-logic-starter-inspector/plan.md` and `plans/` (other phases' plan files may also be present); Node `v20.19` or later (v24 is fine); `ls: cannot access 'package.json'` (no scaffold yet). If `package.json` already exists, stop: the scaffold was already run.

- [ ] **Step 1: Run the official generator in the repo root**

  The generator writes `package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`, `README.md`, `.npmignore` and `src/`, then runs `npm install`. Passing `--gitInit false` stops it from running `git init` and from writing a `.gitignore` over the repo's own.

  ```bash
  npx --package yo --package generator-pptb -- yo pptb . --toolType react --toolDisplayName "Server Logic Tools" --toolId server-logic-tools --toolDescription "Generate Power Pages server logic and review its readiness" --pkgManager npm --gitInit false
  ```

  Expect: the banner "Welcome to the Power Platform Tool Box generator!", then `Installing dependencies with npm install...`, then `Your tool has been created!`. If the generator still asks questions (a newer version may rename the flags), answer: type React, display name `Server Logic Tools`, id `server-logic-tools`, description as above, package manager npm, git init **No**.

- [ ] **Step 2: Inspect what the generator produced and confirm the Vite config is the IIFE one**

  ```bash
  git status --short
  grep -n "iife\|inlineDynamicImports\|fixHtmlForPPTB\|crossorigin" vite.config.ts
  grep -n "\"react\"\|\"vite\"\|\"@vitejs/plugin-react\"\|\"build\"" package.json
  ls src src/components src/hooks
  ```

  Expect:
  - `vite.config.ts` contains `format: 'iife'`, `inlineDynamicImports: true`, the `fixHtmlForPPTB` plugin, and the two regexes that remove `type="module"` and `crossorigin`. If any of the four is missing, stop and report to the owner: the generator changed and Steps 11 and 41 must be re-derived from the new config. Do not hand-write a replacement.
  - `package.json` shows React `^18.3.1` and Vite `^7.1.11` (Step 4 upgrades React).
  - `src/` holds `App.tsx`, `main.tsx`, `index.css`, `vite-env.d.ts`, `components/` (four demo components) and `hooks/useToolboxAPI.ts`.

- [ ] **Step 3: Extend `.gitignore` and commit the untouched scaffold**

  Append, never replace (the repo's `.gitignore` already holds `.codegraph/`):

  ```bash
  printf '%s\n' 'node_modules/' 'dist/' 'dist-probe/' 'coverage/' '*.tsbuildinfo' '.env' '.env.*' >> .gitignore
  cat .gitignore
  git add -A
  git commit -m "chore(scaffold): generate the PPTB React tool with yo pptb"
  ```

  Expect: `.gitignore` lists `.codegraph/` first and then the seven new lines; the commit succeeds. `package-lock.json` is part of the commit and `node_modules/` is not.

### B. Dependencies (every runtime dependency the project needs)

- [ ] **Step 4: Install the runtime dependencies**

  ```bash
  npm install react@^19.2.0 react-dom@^19.2.0
  npm install --save-exact jspdf@4.2.1 jspdf-autotable@5.0.8
  npm install fflate@^0.8.3 acorn@^8.19.0 acorn-walk@^8.3.5
  npm install @codemirror/state @codemirror/view @codemirror/commands @codemirror/language @codemirror/lang-javascript @lezer/highlight
  npm install @fluentui/react-icons
  ```

  Expect: each command ends with `added N packages` and no `ERESOLVE` error. Why each package is here:

  | Package | Used for | Spec source |
  |---|---|---|
  | `react`, `react-dom` 19 | UI with the React Compiler | stack rules |
  | `jspdf` 4.2.1, `jspdf-autotable` 5.0.8 | Inspector PDF reports in the web view, no .NET worker | Resolved log v1.1.0, FR-10 |
  | `fflate` | the Starter zip via `zipSync` | Resolved log v1.1.0, AC-5.6 |
  | `acorn`, `acorn-walk` | tokenizer and parser for FR-4 and the FR-7 structure analysis, the AC-6.8 trial parse. `acorn-walk` is installed so Phase 03 can walk the tree without touching `package.json` | FR-4, FR-7, AC-6.8 |
  | `@codemirror/state`, `view`, `commands`, `language`, `lang-javascript`, `@lezer/highlight` | the code panes: line numbers, line highlights, history, JavaScript highlighting, Esc-then-Tab (tab-focus mode is in `view`/`commands`). Not installed: `@codemirror/search`, `@codemirror/autocomplete` and the `codemirror` meta package (no AC needs them) | Resolved log v1.1.0, AC-4.10, F48 |
  | `@fluentui/react-icons` | Fluent System Icons as tree-shakeable React components, MIT, one component per icon so only used icons are bundled. The alternative `@fluentui/svg-icons` would need our own wrapper component for every icon (an extra layer). Its runtime (`@griffel/react`) injects `<style>` rules, which the PPTB default CSP allows. The probe in Step 44 measures its cost, and the PPTB smoke gate confirms it renders | FR-11 |

  jsPDF lists `html2canvas`, `canvg`, `dompurify` and `core-js` as optional dependencies. They stay installed (npm installs optional dependencies by default); Vite aliases the first three to an empty module in Step 11, so none of them reaches the bundle.

- [ ] **Step 5: Install the development dependencies**

  ```bash
  npm install --save-dev typescript@~5.9.3 vite@^7.1.11 @vitejs/plugin-react@^5.2.0 babel-plugin-react-compiler@^1.0.0
  npm install --save-dev @types/react@^19 @types/react-dom@^19 @types/node@^24 @pptb/types
  npm install --save-dev vitest@^5 jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
  npm install --save-dev eslint@^9.39 @eslint/js@^9.39 typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-plugin-jsx-a11y @types/eslint-plugin-jsx-a11y eslint-config-prettier prettier globals jiti
  npm install --save-dev @fontsource/jetbrains-mono @expo-google-fonts/dm-sans @expo-google-fonts/space-grotesk
  ```

  Expect: no `ERESOLVE`. If npm reports a peer-dependency conflict, resolve it by choosing the version the message names; do not use `--force` or `--legacy-peer-deps`. The three font packages are only the source of the font files copied in Step 43 (licence: SIL OFL 1.1 for all three fonts; the two `@expo-google-fonts` packages are MIT-and-OFL wrappers of Google Fonts' static TTFs, and `@fontsource/jetbrains-mono` is OFL). `@pptb/types` brings the `pptb-validate` binary (through `@pptb/validate`).

- [ ] **Step 6: Commit the dependencies**

  ```bash
  npm ls react jspdf jspdf-autotable fflate acorn @codemirror/view @fluentui/react-icons vite vitest eslint typescript --depth=0
  git add package.json package-lock.json
  git commit -m "build(deps): install runtime and tooling dependencies"
  ```

  Expect: `npm ls` prints `react@19.x`, `jspdf@4.2.1`, `jspdf-autotable@5.0.8`, `vite@7.x`, `vitest@5.x`, `eslint@9.x`, `typescript@5.9.x`, with no `UNMET` or `invalid` lines.

### C. Tooling (TypeScript strict, ESLint, Prettier, Vitest, alias, React Compiler)

- [ ] **Step 7: Write the failing toolchain test**

  Create `src/test/toolchain.test.tsx`. It needs jsdom, the React JSX transform and the jest-dom matchers, none of which are configured yet:

  ```tsx
  import { render, screen } from '@testing-library/react';
  import { describe, expect, it } from 'vitest';

  describe('toolchain', () => {
    it('renders React 19 under jsdom with jest-dom matchers', () => {
      render(<button type="button">Ready</button>);
      expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 8: Run it and confirm it fails**

  Run: `npx vitest run src/test/toolchain.test.tsx`

  Expect: FAIL. The generator's config has no `test` section, so Vitest runs in the Node environment and the error is `ReferenceError: document is not defined` (or `React is not defined`).

- [ ] **Step 9: Remove the generator's demo code and write the three TypeScript project files**

  The demo components call `window.*API` directly and use `any`, which the project rules forbid, so they go. `main.tsx`, `index.css` and `vite-env.d.ts` are replaced (the new `main.tsx` and `index.css` arrive in Step 26).

  ```bash
  git rm -r src/App.tsx src/components src/hooks src/main.tsx src/index.css src/vite-env.d.ts
  ```

  Create `tsconfig.json`:

  ```json
  {
    "files": [],
    "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
  }
  ```

  Create `tsconfig.app.json`. The strict flags are the ones in `.claude/rules/typescript.md`. `node` is in `types` because later phases' tests use `node:vm` (AC-4.12) and `node:fs`; product code must still not use Node APIs:

  ```json
  {
    "compilerOptions": {
      "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
      "target": "ES2022",
      "useDefineForClassFields": true,
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "skipLibCheck": true,
      "types": ["@pptb/types", "vite/client", "node"],
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "verbatimModuleSyntax": true,
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "exactOptionalPropertyTypes": true,
      "noImplicitOverride": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true,
      "paths": { "@/*": ["./src/*"] }
    },
    "include": ["src", "tests"]
  }
  ```

  Create `tsconfig.node.json` (config files only):

  ```json
  {
    "compilerOptions": {
      "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
      "target": "ES2023",
      "lib": ["ES2023"],
      "module": "ESNext",
      "skipLibCheck": true,
      "types": ["node"],
      "moduleResolution": "bundler",
      "isolatedModules": true,
      "verbatimModuleSyntax": true,
      "noEmit": true,
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true
    },
    "include": ["vite.config.ts", "eslint.config.ts"]
  }
  ```

  Create `src/vite-env.d.ts`. It declares the three build-time page constants that `vite.config.ts` defines (Step 11). The host globals are typed by `@pptb/types` and wrapped by Phase 01, so the generator's `Window` augmentation is not kept:

  ```ts
  /// <reference types="vite/client" />
  /// <reference types="@pptb/types" />

  declare const __PAGE_STARTER__: boolean;
  declare const __PAGE_OBJECTS__: boolean;
  declare const __PAGE_INSPECTOR__: boolean;
  ```

- [ ] **Step 10: Write the Prettier and ESLint configs**

  Create `.prettierrc.json`:

  ```json
  {
    "singleQuote": true,
    "printWidth": 100,
    "trailingComma": "all"
  }
  ```

  Create `.prettierignore` (the repo also holds specs, design handoffs, mocks and agent folders that Prettier must not touch):

  ```
  dist
  dist-probe
  coverage
  node_modules
  package-lock.json
  npm-shrinkwrap.json
  skills-lock.json
  .codegraph
  .claude
  .agents
  .codex
  .grok
  .playwright-mcp
  docs
  design_handoff_server_logic_tools
  mocks
  tasks
  *.md
  ```

  Create `eslint.config.ts` (flat config per `.claude/rules/tooling.md`: `defineConfig`, `strictTypeChecked` plus `stylisticTypeChecked`, `projectService`, react-hooks, react-refresh, jsx-a11y, Prettier last). Two rule overrides need a reason: `consistent-type-definitions` is set to `type` because `.claude/rules/typescript.md` prefers `type` aliases (the stylistic preset prefers `interface`), and `no-unused-vars` ignores a leading underscore so stubs can keep their contract parameters:

  ```ts
  import js from '@eslint/js';
  import { defineConfig, globalIgnores } from 'eslint/config';
  import prettier from 'eslint-config-prettier';
  import jsxA11y from 'eslint-plugin-jsx-a11y';
  import reactHooks from 'eslint-plugin-react-hooks';
  import reactRefresh from 'eslint-plugin-react-refresh';
  import globals from 'globals';
  import tseslint from 'typescript-eslint';

  export default defineConfig([
    globalIgnores([
      'dist',
      'dist-probe',
      'coverage',
      'node_modules',
      'scripts',
      '.claude',
      '.agents',
      '.codex',
      '.grok',
      '.codegraph',
      '.playwright-mcp',
      'docs',
      'design_handoff_server_logic_tools',
      'mocks',
      'tasks',
    ]),
    {
      files: ['**/*.{ts,tsx}'],
      extends: [
        js.configs.recommended,
        tseslint.configs.strictTypeChecked,
        tseslint.configs.stylisticTypeChecked,
        reactHooks.configs.flat.recommended,
        reactRefresh.configs.vite,
        jsxA11y.flatConfigs.recommended,
      ],
      languageOptions: {
        ecmaVersion: 2022,
        globals: globals.browser,
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: {
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
        ],
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
      },
    },
    {
      files: ['tests/**/*.ts', 'vite.config.ts', 'eslint.config.ts'],
      languageOptions: { globals: globals.node },
    },
    prettier,
  ]);
  ```

- [ ] **Step 11: Write `vite.config.ts` and the two small files it needs**

  This is the generator's config with everything kept (the `fixHtmlForPPTB` plugin, `base: './'`, the IIFE output, `inlineDynamicImports`) plus: the React Compiler through the `babel` option, the `@/` alias, the released-pages `define` constants (FR-1), the jsPDF optional-dependency stub, inlined assets (so fonts become `data:` URIs, which the PPTB default CSP allows), a `probe` mode for the library probe (Step 44), and the Vitest section. The `fixHtmlForPPTB` function body is the generator's, unchanged.

  Replace `vite.config.ts` with:

  ```ts
  import { fileURLToPath } from 'node:url';
  import react from '@vitejs/plugin-react';
  import { loadEnv } from 'vite';
  import type { Plugin } from 'vite';
  import { defineConfig } from 'vitest/config';

  const ALL_PAGES = ['starter', 'objects', 'inspector'] as const;
  type Page = (typeof ALL_PAGES)[number];

  function isPage(value: string): value is Page {
    return ALL_PAGES.some((page) => page === value);
  }

  /**
   * FR-1 released pages. VITE_RELEASED_PAGES is a comma list such as "starter,objects".
   * Unset means all three. Anything unknown (including an empty value) fails the build,
   * so a typo can never silently ship a build with no pages.
   */
  function parseReleasedPages(raw: string | undefined): ReadonlySet<Page> {
    if (raw === undefined) return new Set(ALL_PAGES);
    const names = raw.split(',').map((name) => name.trim());
    const unknown = names.filter((name) => !isPage(name));
    if (unknown.length > 0) {
      throw new Error(
        `VITE_RELEASED_PAGES has unknown page(s): ${unknown.map((n) => JSON.stringify(n)).join(', ')}. Use any of: ${ALL_PAGES.join(', ')}.`,
      );
    }
    return new Set(names.filter(isPage));
  }

  /**
   * Plugin to fix HTML for PPTB compatibility (from the yo pptb generator, unchanged)
   * - Removes type="module" and crossorigin attributes since we're using IIFE format
   * - Moves script tags from head to end of body so DOM is ready when IIFE executes
   */
  function fixHtmlForPPTB(): Plugin {
    return {
      name: 'fix-html-for-pptb',
      enforce: 'post',
      transformIndexHtml(html) {
        // Remove type="module" and crossorigin from script tags
        // IIFE format doesn't need module type, and file:// URLs don't need crossorigin
        html = html.replace(/\s*type="module"/g, '');
        html = html.replace(/\s*crossorigin/g, '');
        // Clean up extra spaces around attributes
        html = html.replace(/\s+>/g, '>');

        // Move script tags from head to end of body
        // IIFE executes immediately, so DOM must be ready
        const scriptRegex = /(<script[^>]*src="[^"]*"[^>]*><\/script>)/g;
        const scripts: string[] = [];

        // Extract all script tags
        html = html.replace(scriptRegex, (match) => {
          scripts.push(match);
          return ''; // Remove from current position
        });

        // Insert scripts before closing body tag
        if (scripts.length > 0) {
          const scriptsHtml = '\n  ' + scripts.join('\n  ');
          html = html.replace('</body>', scriptsHtml + '\n</body>');
        }

        return html;
      },
    };
  }

  const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));
  const EMPTY_MODULE = fromRoot('./src/lib/emptyModule.ts');

  // https://vitejs.dev/config/
  export default defineConfig((configEnv) => {
    const env = loadEnv(configEnv.mode, process.cwd(), 'VITE_');
    const released = parseReleasedPages(env.VITE_RELEASED_PAGES);
    const isProbe = configEnv.mode === 'probe';

    return {
      plugins: [
        react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } }),
        fixHtmlForPPTB(),
      ],
      base: './',
      resolve: {
        alias: {
          '@': fromRoot('./src'),
          // jsPDF imports these only for doc.html() and doc.addSvgAsImage(), which we never call.
          html2canvas: EMPTY_MODULE,
          canvg: EMPTY_MODULE,
          dompurify: EMPTY_MODULE,
        },
      },
      // Static booleans: Rollup folds `__PAGE_X__ ? <XPage /> : null` and drops the unused page module.
      define: {
        __PAGE_STARTER__: JSON.stringify(released.has('starter')),
        __PAGE_OBJECTS__: JSON.stringify(released.has('objects')),
        __PAGE_INSPECTOR__: JSON.stringify(released.has('inspector')),
      },
      build: {
        outDir: isProbe ? 'dist-probe' : 'dist',
        assetsDir: 'assets',
        // Fonts and small images become data: URIs; the PPTB default CSP allows data: fonts and images.
        assetsInlineLimit: 100_000,
        sourcemap: configEnv.mode === 'development',
        lib: isProbe
          ? {
              entry: fromRoot('./src/probe/libraryProbe.ts'),
              name: 'LibraryProbe',
              formats: ['iife'],
              fileName: () => 'probe.js',
            }
          : false,
        rollupOptions: {
          output: {
            // Use IIFE format for compatibility with iframe srcdoc loading
            // ES modules can have issues when loaded via file:// URLs in iframes
            format: 'iife',
            // Bundle everything into a single file to avoid module loading issues
            inlineDynamicImports: true,
            // Disable chunking since we're bundling everything
            manualChunks: undefined,
          },
        },
      },
      test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
      },
    };
  });
  ```

  Create `src/lib/emptyModule.ts`:

  ```ts
  // Stand-in for html2canvas, canvg and dompurify (see the alias in vite.config.ts).
  export default {};
  ```

  Create `src/test/setup.ts`:

  ```ts
  import '@testing-library/jest-dom/vitest';
  import { cleanup } from '@testing-library/react';
  import { afterEach } from 'vitest';

  afterEach(() => {
    cleanup();
  });
  ```

- [ ] **Step 12: Add the npm scripts**

  `npm pkg set` edits only the named keys, so the saved dependency ranges are untouched. `publish-package` is deleted because it builds, bumps the version and publishes in one command, which the project forbids without the owner's explicit confirmation.

  ```bash
  npm pkg set scripts.typecheck="tsc -b"
  npm pkg set scripts.lint="eslint . --max-warnings=0"
  npm pkg set scripts.format="prettier --write ."
  npm pkg set scripts.format:check="prettier --check ."
  npm pkg set scripts.test="vitest run"
  npm pkg set scripts.probe:size="vite build --mode probe && node scripts/bundle-size.mjs dist-probe"
  npm pkg set scripts.size="node scripts/bundle-size.mjs dist/assets"
  npm pkg delete scripts.publish-package
  npm pkg set sideEffects='["**/*.css"]' --json
  npm pkg get scripts
  ```

  Expect: `scripts` lists `build` (`tsc -b && vite build`), `dev`, `watch`, `dev-watch`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test`, `probe:size`, `size`, `finalize-package`, `validate`, `version-stable`, and no `publish-package`. `sideEffects` marks our own modules as side-effect free (except CSS) so Rollup can drop the unused page modules.

- [ ] **Step 13: Run the toolchain test and confirm it passes**

  Run: `npx vitest run src/test/toolchain.test.tsx`

  Expect: PASS, `1 passed`. If it fails with `ReferenceError: __PAGE_STARTER__ is not defined`, nothing imports it yet, so that is not this test. If it fails with `Cannot find module 'vitest/config'`, re-run Step 5.

- [ ] **Step 14: Format, check and commit the tooling**

  ```bash
  npx prettier --write tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.ts .prettierrc.json src
  npx tsc -b
  npx eslint . --max-warnings=0
  npx prettier --check .
  git add -A
  git commit -m "build(tooling): add strict TypeScript, ESLint, Prettier, Vitest and the @/ alias"
  ```

  Expect: `tsc -b` and `eslint` print nothing and exit 0; `prettier --check` prints `All matched files use Prettier code style!`. If ESLint reports `was not found by the project service` for `vite.config.ts` or `eslint.config.ts`, the solution-style `tsconfig.json` is not being followed: add `"allowDefaultProject": ["vite.config.ts", "eslint.config.ts"]` inside `parserOptions.projectService` (as `projectService: { allowDefaultProject: [...] }`), re-run, and note it in the commit body. If a rule name in `eslint.config.ts` is rejected (for example `reactHooks.configs.flat.recommended`), check the installed plugin version's README for the flat config name and use that one.

### D. Contracts (verbatim from plan.md)

- [ ] **Step 15: Write the failing contract test**

  Create `src/types/contracts.test.ts`. The type assertions are enforced by `npx tsc -b`; the runtime assertions by Vitest.

  ```ts
  import { describe, expect, expectTypeOf, it } from 'vitest';
  import type { BrowserCheckResult, InsertResult, TextChange } from '@/lib/code-analysis/codeAnalysis.types';
  import type {
    Connection,
    FileFilter,
    HostEvent,
    ODataQuery,
    PptbHost,
    SaveResult,
  } from '@/services/pptb/host.types';
  import { HostReadError } from '@/services/pptb/host.types';
  import type { StarterDerived, StarterAction, StarterPackageInput, StarterState } from '@/app/starter-session/starterSession.types';
  import { HTTP_METHODS, METHOD_FUNCTION } from '@/types/http';
  import type { ClientLanguage, HandlerFunction, HttpMethod, View } from '@/types/http';
  import type { Counts, FileResult, Finding, ReviewKey, SettingValue, SiteFacts } from '@/types/inspector';
  import type { ExampleRequest, GeneratedHandler, RecipeId, RecipeMeta } from '@/types/recipe';
  import type { ReportFormat, ReportOptions, ReportScope } from '@/types/report';

  describe('http contract', () => {
    it('lists all five methods in the documented order', () => {
      expect(HTTP_METHODS).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      expectTypeOf<(typeof HTTP_METHODS)[number]>().toEqualTypeOf<HttpMethod>();
    });

    it('maps each method to its handler function name', () => {
      expect(METHOD_FUNCTION).toEqual({
        GET: 'get',
        POST: 'post',
        PUT: 'put',
        PATCH: 'patch',
        DELETE: 'del',
      });
      expectTypeOf<(typeof METHOD_FUNCTION)[HttpMethod]>().toEqualTypeOf<HandlerFunction>();
    });

    it('fixes the view and client language unions', () => {
      expectTypeOf<View>().toEqualTypeOf<'starter' | 'objects' | 'inspector'>();
      expectTypeOf<ClientLanguage>().toEqualTypeOf<'fetch' | 'jquery' | 'liquid'>();
    });
  });

  describe('recipe contract', () => {
    it('allows a null default method only through the nullable type (R8)', () => {
      expectTypeOf<RecipeMeta['defaultMethod']>().toEqualTypeOf<HttpMethod | null>();
      expectTypeOf<RecipeMeta['examples']>().toEqualTypeOf<Readonly<Record<string, ExampleRequest>>>();
      expectTypeOf<RecipeId>().toEqualTypeOf<
        'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10'
      >();
    });

    it('describes a generated handler as LF text plus 1-based highlight lines', () => {
      expectTypeOf<GeneratedHandler>().toEqualTypeOf<{
        text: string;
        highlightLines: readonly number[];
      }>();
    });
  });

  describe('code-analysis contract', () => {
    it('narrows InsertResult on ok', () => {
      const describeResult = (r: InsertResult): string => (r.ok ? r.text : r.reason);
      expect(describeResult({ ok: false, reason: 'no-target' })).toBe('no-target');
      expectTypeOf<InsertResult & { ok: true }>().toHaveProperty('changes');
      expectTypeOf<TextChange>().toEqualTypeOf<{ from: number; to: number; insert: string }>();
      expectTypeOf<BrowserCheckResult['parseFailed']>().toEqualTypeOf<boolean>();
    });
  });

  describe('host contract', () => {
    it('carries the HTTP status on HostReadError', () => {
      const error = new HostReadError('Could not read the site', 429);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('HostReadError');
      expect(error.status).toBe(429);
      expect(new HostReadError('offline', null).status).toBeNull();
    });

    it('pins the PptbHost method shapes', () => {
      expectTypeOf<PptbHost['saveFile']>().parameters.toEqualTypeOf<
        [string, string | Uint8Array, readonly FileFilter[]]
      >();
      expectTypeOf<PptbHost['saveFile']>().returns.toEqualTypeOf<Promise<SaveResult>>();
      expectTypeOf<PptbHost['queryAll']>().parameters.toEqualTypeOf<[ODataQuery]>();
      expectTypeOf<PptbHost['queryAll']>().returns.toEqualTypeOf<Promise<readonly unknown[]>>();
      expectTypeOf<PptbHost['getActiveConnection']>().returns.toEqualTypeOf<Promise<Connection | null>>();
      expectTypeOf<PptbHost['onEvent']>().returns.toEqualTypeOf<() => void>();
      expectTypeOf<HostEvent['kind']>().toEqualTypeOf<'connection-changed' | 'settings-updated' | 'other'>();
    });
  });

  describe('inspector contract', () => {
    it('keys a review as `${fileId}:${check}`', () => {
      const key: ReviewKey = 'file-1:webRole';
      expect(key).toBe('file-1:webRole');
      expectTypeOf<ReviewKey>().toEqualTypeOf<`${string}:${'webRole' | 'tablePermissions' | 'outbound'}`>();
    });

    it('gives every file exactly three findings', () => {
      expectTypeOf<FileResult['findings']>().toEqualTypeOf<readonly [Finding, Finding, Finding]>();
      expectTypeOf<Counts>().toEqualTypeOf<{ C: number; V: number; M: number; U: number; T: number; K: number }>();
    });

    it('models a setting that cannot be read', () => {
      expectTypeOf<Extract<SettingValue, { kind: 'value' }>>().toEqualTypeOf<{
        kind: 'value';
        raw: string;
        fromEnvVar: boolean;
      }>();
      expectTypeOf<SiteFacts['stopped']>().toEqualTypeOf<'connection-lost' | null>();
    });
  });

  describe('report and Starter session contracts', () => {
    it('limits report options to the two scopes and two formats', () => {
      expectTypeOf<ReportScope>().toEqualTypeOf<'file' | 'site'>();
      expectTypeOf<ReportFormat>().toEqualTypeOf<'markdown' | 'pdf'>();
      expectTypeOf<keyof ReportOptions>().toEqualTypeOf<
        'scope' | 'format' | 'fileId' | 'questions' | 'snapshot' | 'redact'
      >();
    });

    it('pins the Starter state, actions and derived readiness', () => {
      expectTypeOf<StarterDerived['ready']>().toEqualTypeOf<0 | 1 | 2 | 3>();
      expectTypeOf<StarterDerived['readiness']['validation']>().toEqualTypeOf<true>();
      expectTypeOf<StarterState['method']>().toEqualTypeOf<HttpMethod | null>();
      expectTypeOf<StarterAction['type']>().toEqualTypeOf<
        | 'setName'
        | 'setMethod'
        | 'selectRecipe'
        | 'setLanguage'
        | 'editServer'
        | 'setCursor'
        | 'applyChanges'
        | 'markReviewed'
        | 'undoReview'
        | 'startOver'
        | 'clearNotice'
      >();
      expectTypeOf<keyof StarterPackageInput>().toEqualTypeOf<'state' | 'derived' | 'clientText'>();
    });
  });
  ```

- [ ] **Step 16: Run it and confirm it fails**

  Run: `npx vitest run src/types/contracts.test.ts`

  Expect: FAIL with `Failed to resolve import "@/services/pptb/host.types"` (and the other contract paths): the contract files do not exist yet.

- [ ] **Step 17: Commit the HTTP, recipe, code-analysis and host contracts verbatim**

  Create four files. The type bodies are plan.md's Contracts text; only the `import type` lines are added.

  `src/types/http.ts`:

  ```ts
  export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const satisfies readonly HttpMethod[];
  export type HandlerFunction = 'get' | 'post' | 'put' | 'patch' | 'del';
  export const METHOD_FUNCTION = { GET: 'get', POST: 'post', PUT: 'put', PATCH: 'patch', DELETE: 'del' } as const satisfies Record<HttpMethod, HandlerFunction>;
  export type ClientLanguage = 'fetch' | 'jquery' | 'liquid';
  export type View = 'starter' | 'objects' | 'inspector';
  ```

  `src/types/recipe.ts`:

  ```ts
  import type { HttpMethod } from '@/types/http';

  export type RecipeId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10';
  export type RecipeGroup = 'core' | 'tutorial' | 'reference';
  export type AccessType = 'Global' | 'Contact' | 'Account' | 'Parent' | 'Self';
  export type Privilege = 'Read' | 'Write' | 'Create' | 'Delete' | 'Append' | 'AppendTo';
  export type TableGrant = { logicalName: string; entitySetName: string; privileges: readonly Privilege[]; accessType: AccessType; relationship: string | null; note: string | null };
  export type ExampleRequest = { query: string | null; body: unknown; liquidInput: string | null };
  export type RecipeMeta = {
    id: RecipeId; name: string; group: RecipeGroup;
    defaultMethod: HttpMethod | null;            // null only for R8
    functions: readonly string[];                // exported names, e.g. ['get','post','put','del'] or ['getSummary']
    mainObject: string; serverObjects: readonly string[];
    tables: readonly TableGrant[]; outboundDomains: readonly string[]; siteSettings: readonly string[];
    webRole: string; permissionNote: string; prerequisites: readonly string[];
    learnUrl: string | null; extraUrls: readonly string[];
    liquid: boolean; readsLiquidInput: boolean; upstreamCredentials: boolean; demoPage: boolean;
    examples: Readonly<Record<string, ExampleRequest>>;  // keyed by function name
  };
  export type GeneratedHandler = { text: string; highlightLines: readonly number[] }; // LF text, 1-based lines
  ```

  `src/lib/code-analysis/codeAnalysis.types.ts`:

  ```ts
  export type CheckSeverity = 'blocked' | 'may-be-rejected';
  export type CheckHit = { pattern: string; line: number; severity: CheckSeverity };
  export type BrowserCheckResult = { hits: readonly CheckHit[]; parseFailed: boolean };
  export type ConnectorUse = { dataverse: boolean; httpClient: boolean; undetermined: boolean };
  export type TextChange = { from: number; to: number; insert: string };
  export type InsertResult =
    | { ok: true; changes: readonly TextChange[]; text: string }
    | { ok: false; reason: 'no-target' | 'not-statement' | 'breaks-code' };
  ```

  `src/services/pptb/host.types.ts`:

  ```ts
  export type ThemeName = 'light' | 'dark';
  export type NoticeType = 'success' | 'info' | 'warning' | 'error';
  export type Notice = { title: string; body: string; type: NoticeType };
  export type EnvironmentLabel = 'Dev' | 'Test' | 'UAT' | 'Production' | 'Unknown';
  export type Connection = { id: string; name: string; url: string; environment: EnvironmentLabel };
  export type HostEvent = { kind: 'connection-changed' } | { kind: 'settings-updated' } | { kind: 'other'; name: string };
  export type FileFilter = { name: string; extensions: readonly string[] };
  export type SaveResult = { status: 'saved'; path: string } | { status: 'cancelled' };
  export type ODataQuery = { entitySet: string; select: readonly string[]; filter: string | null; orderBy: string | null; pageSize: number };
  export class HostReadError extends Error { constructor(message: string, readonly status: number | null) { super(message); this.name = 'HostReadError'; } }
  export type PptbHost = {
    getTheme(): Promise<ThemeName>;
    notify(n: Notice): Promise<void>;                        // rejects when host notify is missing/throws/rejects
    copyText(text: string): Promise<void>;
    saveFile(defaultName: string, content: string | Uint8Array, filters: readonly FileFilter[]): Promise<SaveResult>;
    openExternal(url: string): Promise<void>;
    getActiveConnection(): Promise<Connection | null>;
    onEvent(handler: (e: HostEvent) => void): () => void;
    queryAll(q: ODataQuery): Promise<readonly unknown[]>;   // all pages; 429/5xx retried 1s/2s/4s; throws HostReadError
    downloadFileColumn(entitySet: string, id: string, column: string): Promise<string>;
  };
  ```

- [ ] **Step 18: Commit the inspector, report and Starter-session contracts verbatim**

  `src/types/inspector.ts` (imports `AccessType`, `Privilege` and `Connection`, which the contract uses without defining):

  ```ts
  import type { Connection } from '@/services/pptb/host.types';
  import type { AccessType, Privilege } from '@/types/recipe';

  export type Readable<T> = { ok: true; value: T } | { ok: false; reason: 'read-failed' | 'not-scanned' };
  export type WebRoleFact = { id: string; name: string; anonymous: boolean; authenticated: boolean };
  export type TablePermissionFact = { id: string; name: string; table: string; scope: AccessType; privileges: readonly Privilege[]; roleIds: readonly string[]; active: boolean; parentId: string | null };
  export type SettingName = 'ServerLogic/Enabled' | 'ServerLogic/AllowedDomains' | 'ServerLogic/AllowNetworkingToAllDomains' | 'ServerLogic/TimeoutInSeconds';
  export type SettingValue =
    | { kind: 'absent' } | { kind: 'duplicate' }
    | { kind: 'value'; raw: string; fromEnvVar: boolean }
    | { kind: 'envvar-unreadable' };                      // secret type, missing variable or failed read
  export type ServerLogicFileFacts = { id: string; name: string; active: boolean; roleIds: Readable<readonly string[]>; code: Readable<string> };
  export type SiteRef = { id: string; name: string; domain: string; active: boolean };
  export type SiteFacts = {
    scanId: string; site: SiteRef; connection: Connection; startedAt: string; finishedAt: string | null;
    roles: Readable<readonly WebRoleFact[]>; permissions: Readable<readonly TablePermissionFact[]>;
    settings: Readable<Readonly<Record<SettingName, SettingValue>>>;
    files: readonly ServerLogicFileFacts[]; inventoryComplete: boolean; stopped: 'connection-lost' | null;
  };
  export type CheckId = 'webRole' | 'tablePermissions' | 'outbound';
  export type CheckStatus = 'configured' | 'needs-review' | 'reviewed' | 'not-scanned';
  export type Reason = { text: string; readFailure: boolean };
  export type Finding = { check: CheckId; status: CheckStatus; summary: string; reasons: readonly Reason[]; guidance: string; questions: readonly string[]; detail: readonly string[] };
  export type Snapshot = { roles: readonly string[]; tables: readonly string[]; outbound: readonly string[] };
  export type FileResult = { fileId: string; name: string; active: boolean; findings: readonly [Finding, Finding, Finding]; snapshot: Snapshot };
  export type ReviewKey = `${string}:${CheckId}`;           // `${fileId}:${check}`
  export type Counts = { C: number; V: number; M: number; U: number; T: number; K: number };
  export type SiteResult = { facts: SiteFacts; files: readonly FileResult[]; banners: readonly string[] };
  ```

  `src/types/report.ts`:

  ```ts
  export type ReportScope = 'file' | 'site';
  export type ReportFormat = 'markdown' | 'pdf';
  export type ReportOptions = { scope: ReportScope; format: ReportFormat; fileId: string | null; questions: boolean; snapshot: boolean; redact: boolean };
  ```

  `src/app/starter-session/starterSession.types.ts`:

  ```ts
  import type { BrowserCheckResult, TextChange } from '@/lib/code-analysis/codeAnalysis.types';
  import type { Notice } from '@/services/pptb/host.types';
  import type { ClientLanguage, HttpMethod } from '@/types/http';
  import type { RecipeId } from '@/types/recipe';

  export type StarterState = {
    name: string; method: HttpMethod | null; recipe: RecipeId; language: ClientLanguage;
    serverText: string; generatedText: string; cursor: number | null;
    reviewedText: string | null;       // AC-5.4: text at the moment of marking
    pendingNotice: Notice | null;      // e.g. Liquid auto-reset toast (AC-4.7)
  };
  export type StarterAction =
    | { type: 'setName'; name: string } | { type: 'setMethod'; method: HttpMethod }
    | { type: 'selectRecipe'; recipe: RecipeId } | { type: 'setLanguage'; language: ClientLanguage }
    | { type: 'editServer'; text: string; cursor: number | null } | { type: 'setCursor'; cursor: number | null }
    | { type: 'applyChanges'; changes: readonly TextChange[]; cursor: number | null }
    | { type: 'markReviewed' } | { type: 'undoReview' } | { type: 'startOver' } | { type: 'clearNotice' };
  export type StarterDerived = {
    slug: string; slugDiffers: boolean; fn: string; edited: boolean; checks: BrowserCheckResult;
    liquidAllowed: boolean; usedMembers: ReadonlyMap<string, readonly string[]>;
    readiness: { browser: boolean; validation: true; permissions: boolean }; ready: 0 | 1 | 2 | 3;
  };
  export type StarterPackageInput = { state: StarterState; derived: StarterDerived; clientText: string };
  ```

- [ ] **Step 19: Format, run the contract test and the type check, then commit**

  ```bash
  npx prettier --write src/types src/lib src/services src/app
  npx vitest run src/types/contracts.test.ts
  npx tsc -b
  npx eslint . --max-warnings=0
  git add -A
  git commit -m "feat(contracts): commit the cross-phase types verbatim from the plan"
  ```

  Expect: `13 passed`, then `tsc -b` and ESLint print nothing. Prettier reflows the long one-line types over several lines; that changes whitespace only, and the type text must still match `plan.md` token for token. If `tsc -b` rejects an `expectTypeOf` line, the contract file differs from `plan.md`; fix the contract file, never the assertion.

### E. Released pages and the shell skeleton

- [ ] **Step 20: Write the failing `RELEASED_PAGES` test**

  Create `src/app/releasedPages.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { RELEASED_PAGES } from '@/app/releasedPages';

  describe('RELEASED_PAGES', () => {
    it('lists all three pages in tab order when VITE_RELEASED_PAGES is unset', () => {
      expect(RELEASED_PAGES).toEqual(['starter', 'objects', 'inspector']);
    });
  });
  ```

- [ ] **Step 21: Run it and confirm it fails**

  Run: `npx vitest run src/app/releasedPages.test.ts`

  Expect: FAIL with `Failed to resolve import "@/app/releasedPages"`.

- [ ] **Step 22: Implement `RELEASED_PAGES`**

  Create `src/app/releasedPages.ts`. How unreleased code is dropped: `vite.config.ts` replaces `__PAGE_STARTER__`, `__PAGE_OBJECTS__` and `__PAGE_INSPECTOR__` with the literals `true` or `false` at build time. Rollup folds `false ? <Page /> : null` to `null`, so the page's import binding is unused, and because `package.json` marks our modules side-effect free (Step 12) Rollup drops the page module and everything only it imports. Heavy page-only modules (PDF, code editor) are therefore excluded without any runtime check. If a page lazy-loads with `React.lazy`, the `import()` sits inside the same constant condition, and `inlineDynamicImports: true` keeps the result in the single bundle. The tool never reads this list from settings or the URL.

  ```ts
  import type { View } from '@/types/http';

  // FR-1: the released pages, fixed at build time (VITE_RELEASED_PAGES, default all three).
  const starter: readonly View[] = __PAGE_STARTER__ ? ['starter'] : [];
  const objects: readonly View[] = __PAGE_OBJECTS__ ? ['objects'] : [];
  const inspector: readonly View[] = __PAGE_INSPECTOR__ ? ['inspector'] : [];

  export const RELEASED_PAGES: readonly View[] = [...starter, ...objects, ...inspector];
  ```

- [ ] **Step 23: Run it and confirm it passes**

  Run: `npx vitest run src/app/releasedPages.test.ts`

  Expect: PASS. If it fails with `ReferenceError: __PAGE_STARTER__ is not defined`, this Vitest version did not apply `define` to the test run: add the same three entries under `test.define` in `vite.config.ts` (same `JSON.stringify` values) and re-run.

- [ ] **Step 24: Write the failing App smoke test**

  Create `src/app/App.test.tsx`. The fake host is deliberately absent: `window.toolboxAPI` is undefined in jsdom, and importing every stub must not throw.

  ```tsx
  import { render, screen } from '@testing-library/react';
  import { describe, expect, it } from 'vitest';
  import { App } from '@/app/App';

  describe('App skeleton', () => {
    it('renders the three tabs and three page placeholders without a PPTB host', () => {
      expect('toolboxAPI' in window).toBe(false);

      render(<App />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs.map((tab) => tab.textContent)).toEqual([
        'Logic Starter',
        'Server Objects',
        'Logic Inspector',
      ]);
      expect(screen.getByText('Logic Starter page placeholder')).toBeInTheDocument();
      expect(screen.getByText('Server Objects page placeholder')).toBeInTheDocument();
      expect(screen.getByText('Logic Inspector page placeholder')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 25: Run it and confirm it fails**

  Run: `npx vitest run src/app/App.test.tsx`

  Expect: FAIL with `Failed to resolve import "@/app/App"`.

- [ ] **Step 26: Write the shell skeleton (App, three page placeholders, `main.tsx`, `index.css`, `index.html`)**

  Phase 06 replaces `App.tsx`; Phases 18, 21, 22 and 23 replace the page files. The placeholder text is the marker that Step 41's build test searches for.

  `src/features/starter/StarterPage.tsx`:

  ```tsx
  import type { ReactNode } from 'react';

  // Placeholder. Phase 18 (session and inputs) and Phase 21 (code panes) build the real page.
  export function StarterPage(): ReactNode {
    return (
      <section role="tabpanel" aria-label="Logic Starter">
        <p>Logic Starter page placeholder</p>
      </section>
    );
  }
  ```

  `src/features/server-objects/ServerObjectsPage.tsx`:

  ```tsx
  import type { ReactNode } from 'react';

  // Placeholder. Phase 22 builds the real page.
  export function ServerObjectsPage(): ReactNode {
    return (
      <section role="tabpanel" aria-label="Server Objects">
        <p>Server Objects page placeholder</p>
      </section>
    );
  }
  ```

  `src/features/inspector/InspectorPage.tsx`:

  ```tsx
  import type { ReactNode } from 'react';

  // Placeholder. Phase 23 builds the real page.
  export function InspectorPage(): ReactNode {
    return (
      <section role="tabpanel" aria-label="Logic Inspector">
        <p>Logic Inspector page placeholder</p>
      </section>
    );
  }
  ```

  `src/features/starter/download/DownloadStarterButton.tsx` (owned by Phase 14; renders nothing until then so Phase 18 can mount it safely):

  ```tsx
  import type { ReactNode } from 'react';

  export function DownloadStarterButton(): ReactNode {
    return null;
  }
  ```

  `src/app/App.tsx` (placeholder shell; Phase 06 owns the real one):

  ```tsx
  import type { ReactNode } from 'react';
  import { RELEASED_PAGES } from '@/app/releasedPages';
  import { InspectorPage } from '@/features/inspector/InspectorPage';
  import { ServerObjectsPage } from '@/features/server-objects/ServerObjectsPage';
  import { StarterPage } from '@/features/starter/StarterPage';
  import type { View } from '@/types/http';

  const TABS: readonly { view: View; label: string }[] = [
    { view: 'starter', label: 'Logic Starter' },
    { view: 'objects', label: 'Server Objects' },
    { view: 'inspector', label: 'Logic Inspector' },
  ];

  export function App(): ReactNode {
    return (
      <main>
        <div role="tablist" aria-label="Pages">
          {TABS.map((tab) => (
            <button
              key={tab.view}
              type="button"
              role="tab"
              aria-selected={tab.view === RELEASED_PAGES[0]}
              aria-disabled={!RELEASED_PAGES.includes(tab.view)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {__PAGE_STARTER__ ? <StarterPage /> : null}
        {__PAGE_OBJECTS__ ? <ServerObjectsPage /> : null}
        {__PAGE_INSPECTOR__ ? <InspectorPage /> : null}
      </main>
    );
  }
  ```

  `src/main.tsx` (centralised render-error logging per `.claude/rules/react.md`; names only, never messages, bodies or URLs):

  ```tsx
  import { StrictMode } from 'react';
  import { createRoot } from 'react-dom/client';
  import { App } from '@/app/App';
  import './index.css';

  function logRenderError(error: unknown): void {
    console.error('Render error', error instanceof Error ? error.name : 'unknown');
  }

  const rootElement = document.getElementById('root');
  if (rootElement === null) {
    throw new Error('Root element #root not found');
  }

  createRoot(rootElement, {
    onCaughtError: (error) => {
      logRenderError(error);
    },
    onUncaughtError: (error) => {
      logRenderError(error);
    },
  }).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  ```

  `src/index.css` (Phase 04 replaces it with the design tokens):

  ```css
  :root {
    color-scheme: light dark;
  }

  body {
    margin: 0;
    font-family: 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
  }
  ```

  `index.html` (the generator's, with the title fixed; `fixHtmlForPPTB` rewrites the script tag at build time):

  ```html
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Server Logic Tools</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```

- [ ] **Step 27: Run both app tests and confirm they pass**

  Run: `npx vitest run src/app`

  Expect: PASS, `2 passed` (`releasedPages.test.ts`, `App.test.tsx`). The App renders with `window.toolboxAPI` undefined.

- [ ] **Step 28: Format, check and commit the shell skeleton**

  ```bash
  npx prettier --write src index.html
  npx tsc -b
  npx eslint . --max-warnings=0
  git add -A
  git commit -m "feat(app): add RELEASED_PAGES, page placeholders and the shell skeleton"
  ```

  Expect: no output from `tsc -b` or ESLint. If `react-refresh/only-export-components` or a `jsx-a11y` rule fires on `App.tsx`, fix the markup (do not disable the rule).

### F. Manifest (FR-12)

- [ ] **Step 29: Write the failing manifest test**

  Create `tests/manifest.test.ts`. It encodes FR-12 line by line, and it also checks that every runtime dependency named in Step 4 is declared, which is how this phase proves that no later phase must edit `package.json`.

  ```ts
  // @vitest-environment node
  import { existsSync, readFileSync } from 'node:fs';
  import { fileURLToPath } from 'node:url';
  import { describe, expect, it } from 'vitest';

  const ROOT = fileURLToPath(new URL('..', import.meta.url));
  const APPROVED_LICENSES = [
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'GPL-2.0',
    'GPL-3.0',
    'LGPL-3.0',
    'ISC',
    'AGPL-3.0-only',
  ];

  type Json = Record<string, unknown>;

  function isRecord(value: unknown): value is Json {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function readJson(path: string): Json {
    const parsed: unknown = JSON.parse(readFileSync(`${ROOT}${path}`, 'utf8'));
    if (!isRecord(parsed)) throw new Error(`${path} is not a JSON object`);
    return parsed;
  }

  const manifest = readJson('package.json');

  describe('PPTB manifest (FR-12)', () => {
    it('declares an optional single connection and the first API version that allows it', () => {
      expect(manifest.features).toEqual({ connections: { min: 0, max: 1 }, minAPI: '1.2.7' });
    });

    it('has no CSP exceptions and does not enable the Power Platform API', () => {
      expect(manifest).not.toHaveProperty('cspExceptions');
      expect(manifest.features).not.toHaveProperty('enabledForPowerPlatformAPI');
    });

    it('has the required identity fields', () => {
      expect(manifest.displayName).toBe('Server Logic Tools');
      expect(typeof manifest.description === 'string' && manifest.description.length > 20).toBe(true);
      expect(manifest.main).toBe('index.html');
      expect(String(manifest.version)).toMatch(/^[1-9]\d*\.\d+\.\d+$/);
      expect(APPROVED_LICENSES).toContain(manifest.license);
      expect(manifest.contributors).toEqual([
        { name: 'Ryan Christopher', url: 'https://github.com/RyanMakesAndBreaksStuff' },
      ]);
    });

    it('links the repository and a raw GitHub README', () => {
      expect(manifest.configurations).toEqual({
        repository: 'https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic',
        readmeUrl:
          'https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/main/README.md',
      });
    });

    it('uses a theme-aware SVG icon that is copied into dist', () => {
      expect(manifest.icon).toBe('icons/server-logic-tools.svg');
      const path = 'public/icons/server-logic-tools.svg';
      expect(existsSync(`${ROOT}${path}`)).toBe(true);
      const svg = readFileSync(`${ROOT}${path}`, 'utf8');
      expect(svg).toContain('currentColor');
      expect(svg).not.toMatch(/(?:fill|stroke)="#/);
    });

    it('declares every runtime dependency the whole project needs (no later package.json edits)', () => {
      const dependencies = manifest.dependencies;
      if (!isRecord(dependencies)) throw new Error('dependencies missing');
      for (const name of [
        'react',
        'react-dom',
        'acorn',
        'acorn-walk',
        'fflate',
        'jspdf',
        'jspdf-autotable',
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/commands',
        '@codemirror/language',
        '@codemirror/lang-javascript',
        '@lezer/highlight',
        '@fluentui/react-icons',
      ]) {
        expect(dependencies, name).toHaveProperty([name]);
      }
      expect(dependencies.jspdf).toBe('4.2.1');
      expect(dependencies['jspdf-autotable']).toBe('5.0.8');
    });
  });
  ```

- [ ] **Step 30: Run it and confirm it fails**

  Run: `npx vitest run tests/manifest.test.ts`

  Expect: FAIL: `features` is `undefined` (the generator wrote none), `contributors`/`configurations` are missing, and `public/icons/server-logic-tools.svg` does not exist. The dependency test already passes.

- [ ] **Step 31: Add the manifest fields**

  The `name` scope is a placeholder for the owner's npm scope (see the report: it must match the owner's npm user or org before publishing).

  ```bash
  npm pkg set name="@ryanmakesandbreaksstuff/server-logic-tools"
  npm pkg set version="1.0.0"
  npm pkg set displayName="Server Logic Tools"
  npm pkg set description="Generate Power Pages server logic handlers and review a site's existing server logic for web role, table permission and outbound networking gaps."
  npm pkg set main="index.html"
  npm pkg set icon="icons/server-logic-tools.svg"
  npm pkg set license="MIT"
  npm pkg set author="Ryan Christopher"
  npm pkg set contributors='[{"name":"Ryan Christopher","url":"https://github.com/RyanMakesAndBreaksStuff"}]' --json
  npm pkg set configurations='{"repository":"https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic","readmeUrl":"https://raw.githubusercontent.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/main/README.md"}' --json
  npm pkg set features='{"connections":{"min":0,"max":1},"minAPI":"1.2.7"}' --json
  npm pkg set repository='{"type":"git","url":"git+https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic.git"}' --json
  npm pkg set keywords='["powerplatform","dataverse","toolbox","power-pages","server-logic"]' --json
  npm pkg get features configurations icon
  ```

  Expect: the last command prints the `features`, `configurations` and `icon` values exactly as set. There is no `cspExceptions` key and no `enabledForPowerPlatformAPI`.

- [ ] **Step 32: Add the icon, then the README**

  Create `public/icons/server-logic-tools.svg` (a `{ }` mark that follows the host theme through `currentColor`; the design phase may refine the artwork, but the `currentColor` rule stays):

  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="Server Logic Tools">
    <path fill="currentColor" d="M8 3C6.3 3 5 4.3 5 6v3c0 .8-.7 1.5-1.5 1.5H3v3h.5c.8 0 1.5.7 1.5 1.5v3c0 1.7 1.3 3 3 3h1v-2H8c-.6 0-1-.4-1-1v-3c0-1.2-.6-2.3-1.6-3C6.4 11.3 7 10.2 7 9V6c0-.6.4-1 1-1h1V3H8zm8 0c1.7 0 3 1.3 3 3v3c0 .8.7 1.5 1.5 1.5H21v3h-.5c-.8 0-1.5.7-1.5 1.5v3c0 1.7-1.3 3-3 3h-1v-2h1c.6 0 1-.4 1-1v-3c0-1.2.6-2.3 1.6-3-1-.7-1.6-1.8-1.6-3V6c0-.6-.4-1-1-1h-1V3h1z"/>
  </svg>
  ```

  Replace `README.md` (the manifest's `readmeUrl` points at it; the generator's README describes React 18 and a different layout). The outer fence below uses four backticks because the README contains a fenced block:

  ````markdown
  # Server Logic Tools

  A Power Platform ToolBox (PPTB) tool for Power Pages server logic.

  - **Logic Starter** generates a handler, a client call and a permission checklist.
  - **Server Objects** is a reference for the `Server.*` objects.
  - **Logic Inspector** reviews a development site's server logic for web role, table permission and outbound networking gaps, and exports Markdown and PDF reports.

  The tool is read-only toward your environment. Inspector reviews configuration only; it does not verify the tenant's outbound policy.

  ## Requirements

  PPTB Desktop App 1.2.7 or later. The PPTB VS Code extension is not tested.

  ## Develop

  ```bash
  npm install
  npm run build          # single IIFE bundle in dist/
  npm run dev-watch      # development build with sourcemaps
  npm test
  ```

  Load it in PPTB with Settings, Show Debug Menu, then Debug, Load Local Tool, and pick the project root (not `dist/`). There is no hot reload: close and reopen the tool tab after each build.
  ````

- [ ] **Step 33: Run the manifest test and confirm it passes**

  Run: `npx vitest run tests/manifest.test.ts`

  Expect: PASS, `6 passed`.

- [ ] **Step 34: Format and commit the manifest**

  ```bash
  npx prettier --write package.json tests public README.md
  npx tsc -b
  npx eslint . --max-warnings=0
  git add -A
  git commit -m "feat(manifest): declare the PPTB manifest, optional connection and icon"
  ```

  Expect: no output from `tsc -b` or ESLint. (`README.md` is covered by `.prettierignore`; the `prettier --write` of it is a no-op.)

### G. Skeleton stubs (the pinned cross-phase functions)

- [ ] **Step 35: Write the failing pinned-names test**

  Create `src/skeleton.test.ts`. It locks the name, location and signature of every pinned function. It deliberately does not assert that a stub throws, so it stays valid after each owner phase replaces its stub (and no two parallel phases ever edit this file).

  ```ts
  import { describe, expect, expectTypeOf, it } from 'vitest';
  import { HostContext, useHost } from '@/app/HostContext';
  import { RELEASED_PAGES } from '@/app/releasedPages';
  import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
  import type {
    StarterAction,
    StarterDerived,
    StarterPackageInput,
    StarterState,
  } from '@/app/starter-session/starterSession.types';
  import { useStarterSession } from '@/app/starter-session/useStarterSession';
  import { useNotify } from '@/app/useNotify';
  import { useView } from '@/app/useView';
  import { DownloadStarterButton } from '@/features/starter/download/DownloadStarterButton';
  import { evaluateSite, countChecks, fileSummary, filePill } from '@/features/inspector/model/rules';
  import { buildReportModel } from '@/features/inspector/report/buildReportModel';
  import { renderMarkdown } from '@/features/inspector/report/renderMarkdown';
  import { renderPdf } from '@/features/inspector/report/renderPdf';
  import { reportFileName } from '@/features/inspector/report/reportFileName';
  import type { ReportModel } from '@/features/inspector/report/reportModel.types';
  import { listSites, runScan } from '@/features/inspector/scan/scan';
  import { runBrowserChecks } from '@/lib/code-analysis/browserChecks';
  import type {
    BrowserCheckResult,
    ConnectorUse,
    InsertResult,
  } from '@/lib/code-analysis/codeAnalysis.types';
  import {
    detectConnectorUse,
    exportedFunctionNames,
    planInsertion,
    readsHttpOnlyContext,
    usedServerMembers,
  } from '@/lib/code-analysis/structure';
  import { slugify } from '@/lib/slug';
  import { normalizeLf } from '@/lib/text';
  import { getRecipe, RECIPES } from '@/services/catalogue/recipes';
  import { SERVER_OBJECTS } from '@/services/catalogue/serverObjects';
  import { generateClient, isLiquidAllowed, requestPathSteps } from '@/services/generators/client/client';
  import { generateDemoPage, generateHandler } from '@/services/generators/handlers';
  import { buildPackageFiles } from '@/services/generators/package/buildPackageFiles';
  import { buildZip } from '@/services/generators/package/buildZip';
  import type {
    Connection,
    Notice,
    PptbHost,
  } from '@/services/pptb/host.types';
  import { createFakeHost } from '@/services/pptb/fakeHost';
  import { createPptbHost } from '@/services/pptb/pptbHost';
  import type { ClientLanguage, HttpMethod, View } from '@/types/http';
  import type {
    Counts,
    FileResult,
    Finding,
    ReviewKey,
    SiteFacts,
    SiteRef,
    SiteResult,
  } from '@/types/inspector';
  import type { GeneratedHandler, RecipeId, RecipeMeta } from '@/types/recipe';
  import type { ReportOptions } from '@/types/report';

  type FileEntry = { path: string; content: string };

  describe('skeleton: every pinned function exists with its contract signature', () => {
    it('Starter domain (phase 05) and catalogues (05, 13)', () => {
      expectTypeOf(slugify).toEqualTypeOf<(name: string) => { slug: string; differs: boolean }>();
      expectTypeOf(normalizeLf).toEqualTypeOf<(text: string) => string>();
      expectTypeOf(getRecipe).toEqualTypeOf<(id: RecipeId) => RecipeMeta>();
      expectTypeOf(RECIPES).toEqualTypeOf<readonly RecipeMeta[]>();
      expect(Array.isArray(RECIPES)).toBe(true);
      expect(Array.isArray(SERVER_OBJECTS)).toBe(true);
    });

    it('code analysis (phases 02 and 03)', () => {
      expectTypeOf(runBrowserChecks).toEqualTypeOf<(code: string) => BrowserCheckResult>();
      expectTypeOf(detectConnectorUse).toEqualTypeOf<(code: string) => ConnectorUse | null>();
      expectTypeOf(exportedFunctionNames).toEqualTypeOf<(code: string) => readonly string[] | null>();
      expectTypeOf(usedServerMembers).toEqualTypeOf<
        (code: string) => ReadonlyMap<string, readonly string[]>
      >();
      expectTypeOf(readsHttpOnlyContext).toEqualTypeOf<(code: string) => boolean>();
      expectTypeOf(planInsertion).toEqualTypeOf<
        (code: string, sample: string, cursor: number | null, targetFn: string) => InsertResult
      >();
    });

    it('generators (phases 07 to 10, 14, 19)', () => {
      expectTypeOf(generateHandler).toEqualTypeOf<(id: RecipeId) => GeneratedHandler>();
      expectTypeOf(generateDemoPage).toEqualTypeOf<(id: RecipeId, slug: string) => string | null>();
      expectTypeOf(generateClient).toEqualTypeOf<
        (i: {
          slug: string;
          recipe: RecipeId;
          fn: string;
          method: HttpMethod | null;
          language: ClientLanguage;
        }) => string
      >();
      expectTypeOf(requestPathSteps).toEqualTypeOf<
        (
          language: ClientLanguage,
          slug: string,
          fn: string,
        ) => readonly { label: string; value: string }[]
      >();
      expectTypeOf(isLiquidAllowed).toEqualTypeOf<(recipe: RecipeMeta, serverText: string) => boolean>();
      expectTypeOf(buildPackageFiles).toEqualTypeOf<(i: StarterPackageInput) => readonly FileEntry[]>();
      expectTypeOf(buildZip).toEqualTypeOf<(files: readonly FileEntry[]) => Uint8Array>();
    });

    it('host adapter (phase 01)', () => {
      expectTypeOf(createPptbHost).toEqualTypeOf<() => PptbHost>();
      expectTypeOf(createFakeHost).returns.toExtend<PptbHost>();
    });

    it('Inspector model, scan and report (phases 11, 15, 16, 20)', () => {
      expectTypeOf(evaluateSite).toEqualTypeOf<
        (facts: SiteFacts, marks: ReadonlySet<ReviewKey>) => SiteResult
      >();
      expectTypeOf(countChecks).toEqualTypeOf<(findings: readonly Finding[]) => Counts>();
      expectTypeOf(fileSummary).toEqualTypeOf<(f: FileResult) => string>();
      expectTypeOf(filePill).toEqualTypeOf<
        (f: FileResult) => 'Ready' | 'Needs review' | 'Incomplete'
      >();
      expectTypeOf(runScan).toEqualTypeOf<
        (
          host: PptbHost,
          connection: Connection,
          site: SiteRef,
          scanId: string,
          onProgress: (scanned: number, total: number) => void,
        ) => Promise<SiteFacts>
      >();
      expectTypeOf(listSites).toEqualTypeOf<(host: PptbHost) => Promise<readonly SiteRef[]>>();
      expectTypeOf(buildReportModel).toEqualTypeOf<
        (r: SiteResult, o: ReportOptions, exportedAt: Date) => ReportModel
      >();
      expectTypeOf(renderMarkdown).toEqualTypeOf<(m: ReportModel) => string>();
      expectTypeOf(renderPdf).toEqualTypeOf<(m: ReportModel) => Uint8Array>();
      expectTypeOf(reportFileName).toEqualTypeOf<(m: ReportModel) => string>();
    });

    it('app hooks and context (phases 06, 18)', () => {
      expectTypeOf(useHost).toEqualTypeOf<() => PptbHost>();
      expectTypeOf(useNotify).toEqualTypeOf<() => (n: Notice) => void>();
      expectTypeOf(useView).toEqualTypeOf<() => [View, (v: View) => void]>();
      expectTypeOf(useStarterSession).toEqualTypeOf<
        () => {
          state: StarterState;
          dispatch: (a: StarterAction) => void;
          derived: StarterDerived;
        }
      >();
      expect(HostContext).toBeDefined();
      expect(typeof StarterSessionProvider).toBe('function');
      expect(typeof DownloadStarterButton).toBe('function');
      expect(RELEASED_PAGES.length).toBeGreaterThan(0);
    });
  });
  ```

- [ ] **Step 36: Run it and confirm it fails**

  Run: `npx vitest run src/skeleton.test.ts`

  Expect: FAIL with `Failed to resolve import "@/app/HostContext"` (and the other stub paths).

- [ ] **Step 37: Write the code-analysis, catalogue and slug stubs**

  Each stub keeps the contract signature and throws only when called. The number in the message is the owning phase.

  `src/lib/slug.ts` (Phase 05):

  ```ts
  export function slugify(_name: string): { slug: string; differs: boolean } {
    throw new Error('not implemented: phase 05');
  }
  ```

  `src/lib/text.ts` (Phase 05):

  ```ts
  export function normalizeLf(_text: string): string {
    throw new Error('not implemented: phase 05');
  }
  ```

  `src/services/catalogue/recipes.ts` (Phase 05; `RECIPES` is an empty list until then, so importing the module never throws):

  ```ts
  import type { RecipeId, RecipeMeta } from '@/types/recipe';

  export const RECIPES: readonly RecipeMeta[] = [];

  export function getRecipe(_id: RecipeId): RecipeMeta {
    throw new Error('not implemented: phase 05');
  }
  ```

  `src/services/catalogue/serverObjects.ts` (Phase 13 owns the final `ServerObject` and `ObjectMember` types and replaces this whole file; the placeholder type only lets the constant be typed now):

  ```ts
  // Placeholder type. Phase 13 defines the real ServerObject and ObjectMember types in this file.
  export type ServerObject = { readonly name: string };

  export const SERVER_OBJECTS: readonly ServerObject[] = [];
  ```

  `src/lib/code-analysis/browserChecks.ts` (Phase 02):

  ```ts
  import type { BrowserCheckResult } from '@/lib/code-analysis/codeAnalysis.types';

  export function runBrowserChecks(_code: string): BrowserCheckResult {
    throw new Error('not implemented: phase 02');
  }
  ```

  `src/lib/code-analysis/structure.ts` (Phase 03):

  ```ts
  import type { ConnectorUse, InsertResult } from '@/lib/code-analysis/codeAnalysis.types';

  export function detectConnectorUse(_code: string): ConnectorUse | null {
    throw new Error('not implemented: phase 03');
  }

  export function exportedFunctionNames(_code: string): readonly string[] | null {
    throw new Error('not implemented: phase 03');
  }

  export function usedServerMembers(_code: string): ReadonlyMap<string, readonly string[]> {
    throw new Error('not implemented: phase 03');
  }

  export function readsHttpOnlyContext(_code: string): boolean {
    throw new Error('not implemented: phase 03');
  }

  export function planInsertion(
    _code: string,
    _sample: string,
    _cursor: number | null,
    _targetFn: string,
  ): InsertResult {
    throw new Error('not implemented: phase 03');
  }
  ```

- [ ] **Step 38: Write the generator, host, Inspector and report stubs**

  The handler registry is real code, not a stub: Phases 07, 08, 09 and 19 replace only their own `rN.ts`, never `index.ts`. `satisfies Record<RecipeId, ...>` makes a missing recipe a compile error.

  `src/services/generators/handlers/index.ts`:

  ```ts
  import type { GeneratedHandler, RecipeId } from '@/types/recipe';
  import { generateR1 } from './r1';
  import { generateR2 } from './r2';
  import { generateR3 } from './r3';
  import { generateR4 } from './r4';
  import { generateR5 } from './r5';
  import { generateR6 } from './r6';
  import { generateR7 } from './r7';
  import { generateR8 } from './r8';
  import { generateR9 } from './r9';
  import { generateR10 } from './r10';

  const GENERATORS = {
    R1: generateR1,
    R2: generateR2,
    R3: generateR3,
    R4: generateR4,
    R5: generateR5,
    R6: generateR6,
    R7: generateR7,
    R8: generateR8,
    R9: generateR9,
    R10: generateR10,
  } as const satisfies Record<RecipeId, () => GeneratedHandler>;

  export function generateHandler(id: RecipeId): GeneratedHandler {
    return GENERATORS[id]();
  }

  export { generateDemoPage } from './demoPages';
  ```

  Ten recipe stubs, each its own file under `src/services/generators/handlers/`. Owners: `r1.ts`, `r2.ts`, `r3.ts` and `r8.ts` are Phase 07; `r4.ts`, `r5.ts` and `r6.ts` are Phase 08; `r9.ts` and `r10.ts` are Phase 09; `r7.ts` is Phase 19. For example `r1.ts`:

  ```ts
  import type { GeneratedHandler } from '@/types/recipe';

  export function generateR1(): GeneratedHandler {
    throw new Error('not implemented: phase 07');
  }
  ```

  The other nine files are identical except for the function name (`generateR2` to `generateR10`) and the phase number in the message: `r2.ts`, `r3.ts` and `r8.ts` say `phase 07`; `r4.ts`, `r5.ts` and `r6.ts` say `phase 08`; `r9.ts` and `r10.ts` say `phase 09`; `r7.ts` says `phase 19`. Create them with:

  ```bash
  cd src/services/generators/handlers
  for pair in 2:07 3:07 4:08 5:08 6:08 7:19 8:07 9:09 10:09; do
    n="${pair%%:*}"; phase="${pair##*:}"
    printf "import type { GeneratedHandler } from '@/types/recipe';\n\nexport function generateR%s(): GeneratedHandler {\n  throw new Error('not implemented: phase %s');\n}\n" "$n" "$phase" > "r$n.ts"
  done
  cd ../../../..
  ls src/services/generators/handlers
  ```

  Expect: the `ls` lists `demoPages.ts` (after the next file), `index.ts` and `r1.ts` to `r10.ts`.

  `src/services/generators/handlers/demoPages.ts` (Phase 08):

  ```ts
  import type { RecipeId } from '@/types/recipe';

  export function generateDemoPage(_id: RecipeId, _slug: string): string | null {
    throw new Error('not implemented: phase 08');
  }
  ```

  `src/services/generators/client/client.ts` (Phase 10):

  ```ts
  import type { ClientLanguage, HttpMethod } from '@/types/http';
  import type { RecipeId, RecipeMeta } from '@/types/recipe';

  export function generateClient(_i: {
    slug: string;
    recipe: RecipeId;
    fn: string;
    method: HttpMethod | null;
    language: ClientLanguage;
  }): string {
    throw new Error('not implemented: phase 10');
  }

  export function requestPathSteps(
    _language: ClientLanguage,
    _slug: string,
    _fn: string,
  ): readonly { label: string; value: string }[] {
    throw new Error('not implemented: phase 10');
  }

  export function isLiquidAllowed(_recipe: RecipeMeta, _serverText: string): boolean {
    throw new Error('not implemented: phase 10');
  }
  ```

  `src/services/generators/package/buildPackageFiles.ts` (Phase 14):

  ```ts
  import type { StarterPackageInput } from '@/app/starter-session/starterSession.types';

  export function buildPackageFiles(
    _i: StarterPackageInput,
  ): readonly { path: string; content: string }[] {
    throw new Error('not implemented: phase 14');
  }
  ```

  `src/services/generators/package/buildZip.ts` (Phase 14):

  ```ts
  export function buildZip(_files: readonly { path: string; content: string }[]): Uint8Array {
    throw new Error('not implemented: phase 14');
  }
  ```

  `src/services/pptb/pptbHost.ts` (Phase 01):

  ```ts
  import type { PptbHost } from '@/services/pptb/host.types';

  export function createPptbHost(): PptbHost {
    throw new Error('not implemented: phase 01');
  }
  ```

  `src/services/pptb/fakeHost.ts` (Phase 01 owns the real `FakeHostInit` and `FakeHostControls` shapes; these placeholders only let the pinned signature type-check):

  ```ts
  import type { PptbHost } from '@/services/pptb/host.types';

  // Placeholder shapes. Phase 01 defines the real FakeHostInit and FakeHostControls in this file.
  export type FakeHostInit = object;
  export type FakeHostControls = object;

  export function createFakeHost(_init?: FakeHostInit): PptbHost & FakeHostControls {
    throw new Error('not implemented: phase 01');
  }
  ```

  `src/features/inspector/model/rules.ts` (Phase 11):

  ```ts
  import type { Counts, FileResult, Finding, ReviewKey, SiteFacts, SiteResult } from '@/types/inspector';

  export function evaluateSite(_facts: SiteFacts, _marks: ReadonlySet<ReviewKey>): SiteResult {
    throw new Error('not implemented: phase 11');
  }

  export function countChecks(_findings: readonly Finding[]): Counts {
    throw new Error('not implemented: phase 11');
  }

  export function fileSummary(_f: FileResult): string {
    throw new Error('not implemented: phase 11');
  }

  export function filePill(_f: FileResult): 'Ready' | 'Needs review' | 'Incomplete' {
    throw new Error('not implemented: phase 11');
  }
  ```

  `src/features/inspector/scan/scan.ts` (Phase 15):

  ```ts
  import type { Connection, PptbHost } from '@/services/pptb/host.types';
  import type { SiteFacts, SiteRef } from '@/types/inspector';

  export function runScan(
    _host: PptbHost,
    _connection: Connection,
    _site: SiteRef,
    _scanId: string,
    _onProgress: (scanned: number, total: number) => void,
  ): Promise<SiteFacts> {
    throw new Error('not implemented: phase 15');
  }

  export function listSites(_host: PptbHost): Promise<readonly SiteRef[]> {
    throw new Error('not implemented: phase 15');
  }
  ```

  `src/features/inspector/report/reportModel.types.ts` (plan.md pins `ReportModel` in signatures but not its shape; Phase 16 owns the real type in this file):

  ```ts
  // Placeholder. Phase 16 defines the real ReportModel in this file.
  export type ReportModel = { readonly placeholder: true };
  ```

  `src/features/inspector/report/buildReportModel.ts` (Phase 16):

  ```ts
  import type { ReportModel } from '@/features/inspector/report/reportModel.types';
  import type { SiteResult } from '@/types/inspector';
  import type { ReportOptions } from '@/types/report';

  export function buildReportModel(
    _r: SiteResult,
    _o: ReportOptions,
    _exportedAt: Date,
  ): ReportModel {
    throw new Error('not implemented: phase 16');
  }
  ```

  `src/features/inspector/report/renderMarkdown.ts` (Phase 16):

  ```ts
  import type { ReportModel } from '@/features/inspector/report/reportModel.types';

  export function renderMarkdown(_m: ReportModel): string {
    throw new Error('not implemented: phase 16');
  }
  ```

  `src/features/inspector/report/reportFileName.ts` (Phase 16):

  ```ts
  import type { ReportModel } from '@/features/inspector/report/reportModel.types';

  export function reportFileName(_m: ReportModel): string {
    throw new Error('not implemented: phase 16');
  }
  ```

  `src/features/inspector/report/renderPdf.ts` (Phase 20):

  ```ts
  import type { ReportModel } from '@/features/inspector/report/reportModel.types';

  export function renderPdf(_m: ReportModel): Uint8Array {
    throw new Error('not implemented: phase 20');
  }
  ```

- [ ] **Step 39: Write the app hook stubs and the Starter session stubs**

  `src/app/HostContext.ts` (Phase 06):

  ```ts
  import { createContext } from 'react';
  import type { PptbHost } from '@/services/pptb/host.types';

  export const HostContext = createContext<PptbHost | null>(null);

  export function useHost(): PptbHost {
    throw new Error('not implemented: phase 06');
  }
  ```

  `src/app/useNotify.ts` (Phase 06):

  ```ts
  import type { Notice } from '@/services/pptb/host.types';

  export function useNotify(): (n: Notice) => void {
    throw new Error('not implemented: phase 06');
  }
  ```

  `src/app/useView.ts` (Phase 06):

  ```ts
  import type { View } from '@/types/http';

  export function useView(): [View, (v: View) => void] {
    throw new Error('not implemented: phase 06');
  }
  ```

  `src/app/starter-session/StarterSessionProvider.tsx` (Phase 18):

  ```tsx
  import type { ReactNode } from 'react';

  export function StarterSessionProvider(_props: { readonly children: ReactNode }): ReactNode {
    throw new Error('not implemented: phase 18');
  }
  ```

  `src/app/starter-session/useStarterSession.ts` (Phase 18):

  ```ts
  import type {
    StarterAction,
    StarterDerived,
    StarterState,
  } from '@/app/starter-session/starterSession.types';

  export function useStarterSession(): {
    state: StarterState;
    dispatch: (a: StarterAction) => void;
    derived: StarterDerived;
  } {
    throw new Error('not implemented: phase 18');
  }
  ```

- [ ] **Step 40: Run the pinned-names test, the type check and lint, then commit**

  ```bash
  npx prettier --write src
  npx vitest run src/skeleton.test.ts
  npx tsc -b
  npx eslint . --max-warnings=0
  git add -A
  git commit -m "feat(skeleton): add a contract-signature stub for every cross-phase function"
  ```

  Expect: `5 passed` for `skeleton.test.ts`; `tsc -b` and ESLint print nothing. If ESLint reports `@typescript-eslint/no-unused-vars` for a stub parameter, the leading underscore pattern in `eslint.config.ts` (Step 10) is missing. If `tsc -b` reports that a stub function "lacks ending return statement", the return type includes `undefined`; the contract signatures do not, so recheck the signature against `plan.md`.

### H. Fonts, library probe and build shape

- [ ] **Step 41: Write the failing build-shape tests**

  Create `tests/buildShape.test.ts`. It builds the tool through Vite's JS API into `node_modules/.cache/build-shape/` (so it needs no prior `npm run build` and never touches `dist/`), then asserts the PPTB loading rules from CLAUDE.md. The font and probe checks are the red ones; the shape and released-pages checks characterise what Steps 11 and 22 already built.

  ```ts
  // @vitest-environment node
  import { existsSync, readdirSync, readFileSync } from 'node:fs';
  import { fileURLToPath } from 'node:url';
  import { Script } from 'node:vm';
  import { beforeAll, describe, expect, it } from 'vitest';
  import { build } from 'vite';

  const ROOT = fileURLToPath(new URL('..', import.meta.url));
  const CACHE = `${ROOT}node_modules/.cache/build-shape`;
  const BUILD_TIMEOUT = 300_000;

  async function buildTool(
    name: string,
    releasedPages: string | undefined,
    mode?: string,
  ): Promise<string> {
    const outDir = `${CACHE}/${name}`;
    const previous = process.env.VITE_RELEASED_PAGES;
    if (releasedPages === undefined) delete process.env.VITE_RELEASED_PAGES;
    else process.env.VITE_RELEASED_PAGES = releasedPages;
    try {
      await build({
        root: ROOT,
        configFile: `${ROOT}vite.config.ts`,
        logLevel: 'silent',
        ...(mode === undefined ? {} : { mode }),
        build: { outDir, emptyOutDir: true },
      });
    } finally {
      if (previous === undefined) delete process.env.VITE_RELEASED_PAGES;
      else process.env.VITE_RELEASED_PAGES = previous;
    }
    return outDir;
  }

  function filesIn(dir: string, extension: string): string[] {
    return readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((file) =>
      file.endsWith(extension),
    );
  }

  function read(dir: string, file: string): string {
    return readFileSync(`${dir}/${file}`, 'utf8');
  }

  describe('built tool: PPTB loading shape (all pages released)', () => {
    let dist = '';
    beforeAll(async () => {
      dist = await buildTool('all', undefined);
    }, BUILD_TIMEOUT);

    it('emits exactly one JavaScript file', () => {
      expect(filesIn(dist, '.js')).toHaveLength(1);
    });

    it('compiles the bundle as a classic script, not a module', () => {
      const [file] = filesIn(dist, '.js');
      if (file === undefined) throw new Error('no bundle emitted');
      const code = read(dist, file);
      expect(() => new Script(code)).not.toThrow();
      expect(code).not.toContain('import.meta');
    });

    it('has no type="module" and no crossorigin in index.html', () => {
      const html = read(dist, 'index.html');
      expect(html).not.toContain('type="module"');
      expect(html).not.toContain('crossorigin');
    });

    it('puts every script tag at the end of the body', () => {
      const html = read(dist, 'index.html');
      expect(html.slice(0, html.indexOf('<body'))).not.toContain('<script');
      const afterLastScript = html.slice(html.lastIndexOf('</script>') + '</script>'.length);
      expect(afterLastScript.replace('</body>', '').replace('</html>', '').trim()).toBe('');
    });

    it('references no external http(s) URL in index.html', () => {
      expect(read(dist, 'index.html')).not.toMatch(/https?:\/\//);
    });

    it('inlines the JetBrains Mono fonts as data: URIs and loads nothing else from CSS', () => {
      const css = filesIn(dist, '.css')
        .map((file) => read(dist, file))
        .join('\n');
      const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((match) =>
        (match[1] ?? '').replace(/["']/g, ''),
      );
      expect(urls.length).toBeGreaterThanOrEqual(3);
      for (const url of urls) expect(url.startsWith('data:')).toBe(true);
    });

    it('copies the manifest icon into dist', () => {
      expect(existsSync(`${dist}/icons/server-logic-tools.svg`)).toBe(true);
    });

    it('includes all three page placeholders', () => {
      const [file] = filesIn(dist, '.js');
      if (file === undefined) throw new Error('no bundle emitted');
      const code = read(dist, file);
      expect(code).toContain('Logic Starter page placeholder');
      expect(code).toContain('Server Objects page placeholder');
      expect(code).toContain('Logic Inspector page placeholder');
    });
  });

  describe('released pages (FR-1): unreleased page code is left out of the bundle', () => {
    it(
      'keeps only the Starter page when VITE_RELEASED_PAGES=starter',
      async () => {
        const dist = await buildTool('starter-only', 'starter');
        const [file] = filesIn(dist, '.js');
        if (file === undefined) throw new Error('no bundle emitted');
        const code = read(dist, file);
        expect(code).toContain('Logic Starter page placeholder');
        expect(code).not.toContain('Server Objects page placeholder');
        expect(code).not.toContain('Logic Inspector page placeholder');
      },
      BUILD_TIMEOUT,
    );

    it(
      'fails the build for an unknown page name',
      async () => {
        await expect(buildTool('invalid', 'starter,bogus')).rejects.toThrow(/unknown page/i);
      },
      BUILD_TIMEOUT,
    );
  });

  describe('library probe build', () => {
    it(
      'bundles jsPDF, autotable, a TTF font, fflate, CodeMirror, acorn and a Fluent icon as one IIFE',
      async () => {
        const dist = await buildTool('probe', undefined, 'probe');
        const files = filesIn(dist, '.js');
        expect(files).toEqual(['probe.js']);
        const code = read(dist, 'probe.js');
        expect(() => new Script(code)).not.toThrow();
        // jsPDF's optional dependencies are aliased to an empty module and must not be bundled.
        expect(code).not.toContain('ALLOWED_TAGS'); // DOMPurify
        expect(code).not.toContain('Unable to find element in cloned iframe'); // html2canvas
      },
      BUILD_TIMEOUT,
    );
  });
  ```

- [ ] **Step 42: Run it and confirm the font and probe tests fail**

  Run: `npx vitest run tests/buildShape.test.ts`

  Expect: FAIL. The font test fails with `expected 0 to be greater than or equal to 3` (no `@font-face` yet), and the probe test fails because `src/probe/libraryProbe.ts` does not exist (`Could not resolve entry module`). The shape, icon and released-pages tests pass: they characterise the config from Steps 11 and 22 and guard it against regression.

- [ ] **Step 43: Copy the fonts and write `fonts.css`**

  The files come from the packages installed in Step 5. UI font (woff2, Latin subset, weights 400, 500, 700): JetBrains Mono, OFL 1.1. Report fonts for jsPDF (static TTF, which jsPDF needs): DM Sans and Space Grotesk, OFL 1.1, from the `@expo-google-fonts` mirrors of Google Fonts' static instances. Segoe UI is not bundled (it is not redistributable, F52). The OFL texts are copied next to the fonts, as the licence requires.

  ```bash
  mkdir -p src/assets/fonts
  cp node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2 src/assets/fonts/
  cp node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2 src/assets/fonts/
  cp node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2 src/assets/fonts/
  cp node_modules/@fontsource/jetbrains-mono/LICENSE src/assets/fonts/OFL-JetBrainsMono.txt
  cp node_modules/@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf src/assets/fonts/
  cp node_modules/@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf src/assets/fonts/
  cp node_modules/@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf src/assets/fonts/
  cp node_modules/@expo-google-fonts/dm-sans/LICENSE_FONT src/assets/fonts/OFL-DMSans.txt
  cp node_modules/@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf src/assets/fonts/
  cp node_modules/@expo-google-fonts/space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf src/assets/fonts/
  cp node_modules/@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf src/assets/fonts/
  cp node_modules/@expo-google-fonts/space-grotesk/LICENSE_FONT src/assets/fonts/OFL-SpaceGrotesk.txt
  ls src/assets/fonts
  head -n 3 src/assets/fonts/OFL-DMSans.txt
  ```

  Expect: 15 files listed (three `.woff2`, six `.ttf`, three `OFL-*.txt`, and `fonts.css` after the next file), and the `head` output contains `SIL Open Font License`. Sizes for reference: each JetBrains Mono woff2 is about 21 KB, each DM Sans TTF about 56 KB, each Space Grotesk TTF about 86 KB.

  Create `src/assets/fonts/fonts.css` (the three weights of the UI code font; Phase 04 adds the design tokens around it):

  ```css
  @font-face {
    font-family: 'JetBrains Mono';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('./jetbrains-mono-latin-400-normal.woff2') format('woff2');
  }

  @font-face {
    font-family: 'JetBrains Mono';
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url('./jetbrains-mono-latin-500-normal.woff2') format('woff2');
  }

  @font-face {
    font-family: 'JetBrains Mono';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('./jetbrains-mono-latin-700-normal.woff2') format('woff2');
  }
  ```

  Replace `src/index.css` so it loads the fonts:

  ```css
  @import './assets/fonts/fonts.css';

  :root {
    color-scheme: light dark;
  }

  body {
    margin: 0;
    font-family: 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
  }
  ```

- [ ] **Step 44: Write the failing library-probe test, then the probe module**

  Create `src/probe/libraryProbe.test.ts`. It proves the libraries work together at runtime, not only that they bundle:

  ```ts
  // @vitest-environment node
  import { strFromU8, unzipSync } from 'fflate';
  import { describe, expect, it } from 'vitest';
  import { buildProbePdf, buildProbeZip, createProbeState, parseProbe } from '@/probe/libraryProbe';

  function ascii(bytes: Uint8Array, count: number): string {
    return String.fromCharCode(...bytes.slice(0, count));
  }

  describe('library probe', () => {
    it('writes a PDF with an embedded TTF font and an autotable', () => {
      const pdf = buildProbePdf();
      expect(ascii(pdf, 5)).toBe('%PDF-');
      // Text alone is about 3 KB; the embedded DM Sans font and the table make it much larger.
      expect(pdf.length).toBeGreaterThan(5_000);
    });

    it('writes a zip that round-trips', () => {
      const zip = buildProbeZip('const a = 1;');
      expect(ascii(zip, 2)).toBe('PK');
      const entry = unzipSync(zip)['probe.js'];
      expect(entry === undefined ? null : strFromU8(entry)).toBe('const a = 1;');
    });

    it('parses ECMAScript 2023 with acorn', () => {
      expect(parseProbe('const a = 1;')).toBe('Program');
    });

    it('creates a CodeMirror state with the JavaScript language', () => {
      expect(createProbeState('const a = 1;\n').doc.lines).toBe(2);
    });
  });
  ```

  Run: `npx vitest run src/probe/libraryProbe.test.ts`

  Expect: FAIL with `Failed to resolve import "@/probe/libraryProbe"`.

  Then create `src/probe/libraryProbe.ts`. It exists only to be measured and exercised; nothing in the app imports it, so it is not in the app bundle (the app build and the probe build are separate, `--mode probe`). Phase 20 uses the same `?inline` TTF pattern for the PDF fonts, and Phase 21 the same CodeMirror imports.

  ```ts
  import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
  import { javascript } from '@codemirror/lang-javascript';
  import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { EditorState } from '@codemirror/state';
  import { EditorView, keymap, lineNumbers } from '@codemirror/view';
  import { Code20Regular } from '@fluentui/react-icons';
  import { tags } from '@lezer/highlight';
  import { parse } from 'acorn';
  import { strToU8, zipSync } from 'fflate';
  import { jsPDF } from 'jspdf';
  import autoTable from 'jspdf-autotable';
  import dmSansRegular from '@/assets/fonts/DMSans_400Regular.ttf?inline';

  const PROBE_STYLE = HighlightStyle.define([
    { tag: tags.keyword, color: '#b0231b' },
    { tag: tags.string, color: '#4d6a1f' },
  ]);

  // Keeps the icon in the probe bundle so its cost is measured.
  export const PROBE_ICON = Code20Regular;

  export function buildProbePdf(): Uint8Array {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const base64 = dmSansRegular.slice(dmSansRegular.indexOf(',') + 1);
    doc.addFileToVFS('DMSans-Regular.ttf', base64);
    doc.addFont('DMSans-Regular.ttf', 'DMSans', 'normal');
    doc.setFont('DMSans', 'normal');
    doc.text('Library probe', 40, 40);
    autoTable(doc, {
      startY: 60,
      head: [['Check', 'Status']],
      body: [['Web role', 'Configured']],
    });
    return new Uint8Array(doc.output('arraybuffer'));
  }

  export function buildProbeZip(text: string): Uint8Array {
    return zipSync({ 'probe.js': strToU8(text) });
  }

  export function parseProbe(code: string): string {
    return parse(code, { ecmaVersion: 2023 }).type;
  }

  export function createProbeState(doc: string): EditorState {
    return EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        javascript(),
        syntaxHighlighting(PROBE_STYLE),
      ],
    });
  }

  export function createProbeEditor(parent: HTMLElement, doc: string): EditorView {
    return new EditorView({ state: createProbeState(doc), parent });
  }
  ```

  Run: `npx vitest run src/probe/libraryProbe.test.ts`

  Expect: PASS, `4 passed`. If the PDF test fails with an import error for `jspdf-autotable`, switch the import to the named export (`import { autoTable } from 'jspdf-autotable'`) and call `autoTable(doc, ...)` the same way. If `?inline` returns a path instead of a data URI under Vitest, read the base64 from the file with `readFileSync` in the test environment only and keep `?inline` for the bundle.

- [ ] **Step 45: Add the bundle-size script and run the full build-shape suite**

  Create `scripts/bundle-size.mjs` (a measuring tool, not product code; it is excluded from ESLint in Step 10):

  ```js
  import { readdirSync, readFileSync } from 'node:fs';
  import { join } from 'node:path';
  import { gzipSync } from 'node:zlib';

  const dir = process.argv[2] ?? 'dist-probe';
  const kib = (bytes) => (bytes / 1024).toFixed(1);

  for (const name of readdirSync(dir).filter((file) => file.endsWith('.js'))) {
    const bytes = readFileSync(join(dir, name));
    console.log(`${name}  raw ${kib(bytes.length)} KiB  gzip ${kib(gzipSync(bytes).length)} KiB`);
  }
  ```

  Run: `npx vitest run tests/buildShape.test.ts`

  Expect: PASS, `11 passed` (eight in the all-pages group, two in the released-pages group, one in the probe group, with the three builds taking a few seconds to a minute in total). If the probe test reports a `Could not resolve "html2canvas"` (or `canvg`, `dompurify`) error, the alias in `vite.config.ts` is not applying: check the three alias keys. If it reports `core-js`, add `'core-js': EMPTY_MODULE` to the same alias block and re-run. If the font test still counts fewer than three data URLs, `assetsInlineLimit` is not applied: confirm it is in `build` and that `src/index.css` imports `fonts.css`.

- [ ] **Step 46: Format, check and commit**

  ```bash
  npx prettier --write src tests scripts
  npx tsc -b
  npx eslint . --max-warnings=0
  git add -A
  git commit -m "feat(build): bundle fonts and libraries, prove the IIFE shape and page exclusion"
  ```

  Expect: no output from `tsc -b` or ESLint. The commit includes the 15 font files (about 700 KB); this is intended, the fonts are bundled assets.

### I. Library probe size report

- [ ] **Step 47: Measure the probe and the baseline bundle**

  ```bash
  npm run probe:size
  npm run build
  npm run size
  ```

  Expect: `probe:size` ends with a line such as `probe.js  raw <N> KiB  gzip <M> KiB`; `npm run build` ends with Vite's `built in <T>s` and `dist/index.html`, `dist/assets/index-<hash>.js`, `dist/assets/index-<hash>.css`, `dist/icons/server-logic-tools.svg`; `npm run size` prints the app bundle line. Copy the numbers into the table below in this plan file (and into the commit message of Step 48). The estimates are planning figures from typical minified sizes, not measurements:

  | Measurement | Command | Planning estimate (unverified) | Measured raw KiB | Measured gzip KiB |
  |---|---|---|---|---|
  | Probe bundle: jsPDF 4.2.1 + jspdf-autotable 5.0.8 + DM Sans Regular TTF (as base64) + fflate + CodeMirror (state, view, commands, language, lang-javascript, lezer highlight) + acorn + one Fluent icon | `npm run probe:size` | about 1 MiB raw, 350 to 450 KiB gzip | _fill from the command_ | _fill from the command_ |
  | App bundle with the stubs only (React 19 + placeholders + 3 JetBrains Mono fonts in CSS) | `npm run build && npm run size` | about 190 KiB raw, 60 KiB gzip | _fill from the command_ | _fill from the command_ |
  | Estimated final bundle = app bundle + probe bundle (an upper bound: React and the TTF-as-base64 are shared or smaller once only the needed weights are imported) | sum of the two rows | about 1.2 MiB raw | _fill (sum)_ | _fill (sum)_ |

  There is no size budget in the spec. If the probe's gzip size is above 800 KiB, or the app bundle with stubs is above 400 KiB, report it to the owner before Wave W1: it would affect load time inside the PPTB webview, and the mitigations (loading jsPDF and CodeMirror only through `React.lazy`, still inlined) belong to Phases 20 and 21.

- [ ] **Step 48: Commit the measurement**

  Edit the table in this plan file with the measured numbers, then:

  ```bash
  npx prettier --check .
  git add docs/specs/001-server-logic-starter-inspector/plans/phase-00-skeleton.md
  git commit -m "docs(plan): record the phase 00 library probe size"
  ```

  Expect: `prettier --check` reports `All matched files use Prettier code style!` (Markdown under `docs/` is ignored by Prettier); the commit succeeds.

---

## Spike evidence: S1 and S4

Spec F59: each spike records, in the plan of the phase that runs it, the queries or calls made, the host and runtime versions, and the outcome. The raw files are already committed under `docs/specs/001-server-logic-starter-inspector/spikes/`; this section indexes them and states what each one proves. Nothing here is new data and no secret is reproduced (record IDs, user IDs and the tenant ID are only in the raw files). **S2** (PPTB host surface) is recorded in Phase 12 and **S3** (the full R7 script and the SharePoint collision probe) in Phase 19; both are still open.

### Environment and versions

| Item | S1 | S4 |
|---|---|---|
| Date | 2026-10-14 (record timestamps in the files) | 2026-10-15 and 2026-10-16 (spec S4 result; the `ryan_ServerLogicAllowedDomains` value was last modified 2026-10-16) |
| Site and environment | Sample enhanced-data-model site on the dev environment "PG DEV" | The same dev environment ("PG DEV") |
| Dataverse Web API | v9.2 (from the `@odata.context` in every S1 file) | v9.2 (from the `@odata.context` in `envvar.json`) |
| Capturing client | A `{ "status": 200, "data": <OData body> }` wrapper around each response. The tool that wrote it is not recorded in the files | Probe deployed as server logic and called from fetch, jQuery and Liquid; an Azure CLI session was attempted for page capture (see `page.json` below) |
| PPTB Desktop version | Not recorded | Not recorded |
| Power Pages server logic runtime version | Not applicable (S1 reads configuration) | Not exposed by the runtime. Runtime diagnostics come back in the `x-ms-user-trace` response header (spec correction 23) |

The missing PPTB and runtime versions are a gap against F59. The spec's S1 and S4 result paragraphs do not carry them either. Owner action, not an agent task: add the PPTB Desktop version used (Help, About) to this table when known.

### S1: Power Pages component data model (nine facts)

Queries (Dataverse Web API, table `powerpagecomponents`, one call per component type; the response wrapper and `@odata.context` show the `$select`; the filter is by `powerpagecomponenttype` and the site, and is not recorded in the files):

| Raw file | Component type | Rows | `$select` (from `@odata.context`) | Establishes |
|---|---|---|---|---|
| [`s1/t11.json`](../spikes/s1/t11.json) | 11 Web Role | 7 | `powerpagecomponentid,name,content,statecode,powerpagecomponenttype` | `content` keys `anonymoususersrole`, `authenticatedusersrole` (booleans) and an optional `key` (fact 2, data-source table) |
| [`s1/t18.json`](../spikes/s1/t18.json) | 18 Table Permission | 69 | same | `content` keys `entitylogicalname`, `scope` (756150000 Global 8, 756150001 Contact 9, 756150002 Account 9, 756150003 Parent 42, 756150004 Self 1), `read`/`write`/`create`/`delete`/`append`/`appendto`, `adx_entitypermission_webrole`, `contactrelationship`/`accountrelationship`, and for Parent scope `parententitypermission` and `parentrelationship`. 41 of the 42 Parent-scope permissions have no roles of their own (facts 3 and 5). One Account-scope permission uses the site's own relationship `msa_account_managingpartner` (fact 9) |
| [`s1/t9.json`](../spikes/s1/t9.json) | 9 Site Setting | 49 | same | Setting values live in `content.value` (string) with `source` 0, or `envvar_schema` with `source` 1 (fact 4) |
| [`s1/t9-sl.json`](../spikes/s1/t9-sl.json) | 9 Site Setting, `ServerLogic/` prefix, all columns | 2 | none (all columns) | `ServerLogic/Enabled` is `value` "true" with `source` 0; `ServerLogic/AllowedDomains` is `envvar_schema` `ryan_ServerLogicAllowedDomains` with `source` 1 and no `value` (facts 4 and 7) |
| [`s1/t35.json`](../spikes/s1/t35.json) | 35 Server Logic, all columns | 1 | none (all columns) | Code is in the File column `filecontent` (`filecontent_name` ends `.sl`), not in `content`; `content` holds `display_name`, `description` and `adx_serverlogic_adx_webrole` (the assigned web role IDs) (facts 1 and 2). The stored `name` has no `.js` (fact 8). The record's `name` is 189 characters long, which studio accepted (fact 6) |
| [`s1/../s4/envvar.json`](../spikes/s4/envvar.json) | `environmentvariabledefinitions` | 1 | `schemaname,defaultvalue,modifiedon` with `$expand=environmentvariabledefinition_environmentvariablevalue($select=value,modifiedon,statecode)` | The effective `AllowedDomains` value comes from the variable's value row (`defaultvalue` is null); the expanded collection also carries an `@odata.nextLink`, which Phase 15 must tolerate (fact 7) |

Outcomes (spec FR-7, "S1 result"): facts 1 to 5 and 7 are in the data-source table and FR-7; fact 6, the 64-character slug always fits (the `name` column allows 400); fact 8, the stored `name` has no `.js`; fact 9, no single standard Account relationship exists, so R10's checklist keeps "maker verifies"; the studio UI comparison matched (display name and two roles).

### S4: live probe of generated-code behaviour

Calls made (all against one throwaway server logic named `s4-probe`; the probe source is [`s4/s4-probe.js`](../spikes/s4/s4-probe.js)):

| Call | What it does |
|---|---|
| `get` (`?case=dv`) | Dataverse `RetrieveMultipleRecords("categories", "$select=categoryid&$top=1")`, then describes the raw result (`typeof`, parsed `Body` type, header keys) |
| `get` (`?case=http`) | `HttpClient.GetAsync` for five URLs: `api.github.com/zen`, `api.github.com/`, `www.example.com/`, `example.com/` and `jsonplaceholder.typicode.com/todos/1`; run again for each outbound-settings case below |
| `get` (`?case=user`) | Reads `Server.User` keys, `fullname`, `contactid`, `parentcustomerid`, `Roles`, then `RetrieveRecord("contacts", <contactid>, "$select=_parentcustomerid_value")` |
| `post` | `CreateRecord("tasks", ...)`, records the `entityid` header casing, then deletes the task |
| `liquidSync`, `liquidAsync` | Called from the Liquid page [`s4/s4-liquid-page.html`](../spikes/s4/s4-liquid-page.html) with `{% serverlogic %}` |
| Outbound toggles | The O3 to O6 cases of FR-9, including an `AllowedDomains` entry with a leading `*.`. The `AllowedDomains` value was held in the environment variable shown in [`s4/envvar.json`](../spikes/s4/envvar.json) (`*.example.com, api.github.com, jsonplaceholder.typicode.com`) |
| Restricted-pattern scan | [`s4/scan-restricted.js`](../spikes/s4/scan-restricted.js) scans a file against Learn's restricted list, matching case-insensitively over raw text as observed live; it is the origin of Phase 02's regex list |
| Client variants | The probe was called from fetch, jQuery (`shell.ajaxSafePost`) and Liquid |

Outcomes (spec FR-7, "S4 result"), by the six items of the spike:

| # | Question | Outcome | Spec place |
|---|---|---|---|
| 1 | Envelope key casing | Lowercase (`success`, `data`, `error`); failures have no `data` key; an anti-forgery rejection (HTTP 401) has no `requestId` | correction 8 |
| 2 | Connector result type | Dataverse and HttpClient results arrive as JSON strings whose parsed `Body` is a string; `CreateRecord` sends the id as `entityId` (camelCase); HttpClient results also carry `IsBinaryBody` | corrections 11, F55 |
| 3 | Outbound settings and wildcards | O4: the list does not restrict while all-domains is on. O5: every call blocked. O6: the list applies and entries are trimmed. `*.example.com` matched neither `www.example.com` nor `example.com`. Blocked calls return `StatusCode` 0, not an exception. Environment-variable values stay cached until the site restarts | corrections 20, FR-7, FR-9 |
| 4 | Liquid and async | Liquid calls both sync and async operations and gets `success` true with parsed `data` | AC-4.7 |
| 5 | Caller's parent account | `Server.User.parentcustomerid` is an object; `RetrieveRecord("contacts", <contactid>, "$select=_parentcustomerid_value")` returns its GUID. A create bound to it under an Account-scope permission was not tried, so R4 `post` keeps Global Create-only | F04, FR-3 R4 |
| 6 | Custom API privilege identity | Not tested: the only custom APIs on the site were Microsoft's own and some write data. `CloudFlow.TriggerAsync` was also not tested (no flow registered) | FR-3 R9 and R10 unchanged |

Other findings of the probe: the runtime matches Learn's restricted list case-insensitively over raw text, including comments and strings (correction 14; the validator rejected `Function\s*\(` on an anonymous callback and `delete\s+[a-zA-Z_$]` on the comment "Delete after the spike", both with `RTSL01`); `shell.safeAjax` does not exist, only `ajaxSafePost`, `getTokenDeferred` and `refreshToken` (correction 9); top-level helper functions are accepted (correction 22); `Server.User` is the whole contact record, about 70 attributes (correction 21); runtime diagnostics arrive in the `x-ms-user-trace` response header (correction 23).

Evidence gaps to know about (none changes a spec outcome):
- [`s4/page.json`](../spikes/s4/page.json) is not page data. It holds the error text of a failed capture attempt (`Status_NoNetwork`, then an instruction to run `az login`). Treat it as a record of a failed attempt, not of the Liquid page result. The page source is `s4-liquid-page.html`; the Liquid outcome (item 4) is recorded only in the spec.
- The raw responses of the probe calls themselves (the JSON the endpoints returned) are not committed; the spec's S4 result paragraph is the record of those outcomes.

---

## Phase verification

Run each from the repo root. All must pass before Wave W1 starts.

```bash
npx tsc -b
npx eslint . --max-warnings=0
npx prettier --check .
npx vitest run
npm run build
npx pptb-validate --skip-url-checks
git status --short
git ls-files docs/specs/001-server-logic-starter-inspector/spikes
```

Expected:
- `tsc -b` and `eslint` print nothing; `prettier --check` prints `All matched files use Prettier code style!`.
- `vitest run` reports all test files passed: `src/test/toolchain.test.tsx` (1), `src/types/contracts.test.ts` (13), `src/app/releasedPages.test.ts` (1), `src/app/App.test.tsx` (1), `src/skeleton.test.ts` (5), `src/probe/libraryProbe.test.ts` (4), `tests/manifest.test.ts` (6), `tests/buildShape.test.ts` (11).
- `npm run build` ends with `built in`, and `dist/` holds `index.html`, one `assets/index-<hash>.js`, one `assets/index-<hash>.css` and `icons/server-logic-tools.svg`.
- `pptb-validate --skip-url-checks` reports no errors. URL checks are skipped because the repository and the raw README URL may not be public yet. If it reports a missing field, fix the manifest field it names in `package.json` and add the matching assertion to `tests/manifest.test.ts` first. A warning about the scoped package name is expected until the owner confirms the npm scope.
- `git status --short` prints nothing (everything committed), and `git ls-files` lists the 10 committed spike files (`s1/t11.json`, `t18.json`, `t35.json`, `t9-sl.json`, `t9.json`, `s4/envvar.json`, `page.json`, `s4-liquid-page.html`, `s4-probe.js`, `scan-restricted.js`).
- Phase-specific: `npm run probe:size` prints a `probe.js` size line, and the table in Step 47 has no `_fill_` cells left.

## Done when

- `package.json` has `features.connections {min:0,max:1}`, `features.minAPI "1.2.7"`, `displayName "Server Logic Tools"`, an approved licence, `contributors`, `configurations.repository` and `readmeUrl`, a `currentColor` SVG `icon` copied into `dist/`, no `cspExceptions` and no `enabledForPowerPlatformAPI` (FR-12; `tests/manifest.test.ts`).
- `npm run build` produces exactly one JavaScript file that compiles as a classic script, an `index.html` with no `type="module"`, no `crossorigin` and no external URL, scripts at the end of the body, and fonts as `data:` URIs (`tests/buildShape.test.ts`).
- A build with `VITE_RELEASED_PAGES=starter` contains the Starter page and neither of the other two page modules, and an unknown page name fails the build (FR-1; the build-time half of AC-1.7).
- Every contract in `plan.md` is committed unchanged in meaning, and every pinned function exists at its pinned path with its contract signature and a `not implemented: phase NN` body (`src/types/contracts.test.ts`, `src/skeleton.test.ts`); `generateHandler` dispatches to `r1.ts` to `r10.ts` through a registry that no later phase edits.
- `App` renders three tabs and three page placeholders with no PPTB host present, and importing every stub never throws (`src/app/App.test.tsx`).
- jsPDF 4.2.1, jspdf-autotable 5.0.8, a TTF font, fflate, CodeMirror, acorn and a Fluent icon bundle into one IIFE with jsPDF's optional dependencies aliased out, work together at runtime, and their measured size is recorded (`src/probe/libraryProbe.test.ts`, Step 47).
- All runtime dependencies and the fonts are installed and committed, so `package.json` is not edited by any later phase.
- The S1 and S4 evidence section indexes every raw file with queries, outcomes and gaps, and states that S2 (Phase 12) and S3 (Phase 19) remain open.
