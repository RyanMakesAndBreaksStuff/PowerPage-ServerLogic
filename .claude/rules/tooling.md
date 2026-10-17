# Linting, Formatting & Build

- Convention: ESLint flat config in `eslint.config.ts` using `defineConfig` from `eslint/config`. Base: `@eslint/js` recommended + `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`, with `parserOptions.projectService: true`.
- ✓ Include `eslint-plugin-react-hooks` `configs.flat.recommended` (v6+; includes React Compiler rules — verify rule names against the installed version) and `eslint-plugin-react-refresh`. Add `eslint-plugin-jsx-a11y` for the UI.
- ✓ Key type-aware rules on: `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`, `consistent-type-imports`, `no-unnecessary-condition`, `only-throw-error`.
- ✓ Formatting is a separate concern: Prettier (with `eslint-config-prettier` last in the config) — ✗ never use ESLint stylistic rules to format.
- ✓ Scripts: `typecheck` (`tsc -b`), `lint` (`eslint . --max-warnings=0`), `format:check`, `test` (Vitest + React Testing Library). CI runs all four; all must pass with zero warnings.
- ✗ No blanket `eslint-disable` or `@ts-ignore`; use `// eslint-disable-next-line <rule> -- reason` or `@ts-expect-error reason` with a written justification.
- ✓ Vite 8: keep Phase 00's config (single IIFE bundle through `rolldownOptions`, `fixHtmlForPPTB`); the React Compiler runs through `@rolldown/plugin-babel` with `reactCompilerPreset()` from `@vitejs/plugin-react`, as the `react-compiler-ts` template sets it up. ESLint stays on 9 (`eslint-plugin-jsx-a11y` supports ESLint up to 9). Expose only `VITE_`-prefixed env vars and treat them as public (never put secrets in them).
- ✓ Tests: query by role/label (Testing Library), test behaviour not implementation, and fake the PPTB host adapter at the `services/pptb/` boundary rather than mocking modules ad hoc.
