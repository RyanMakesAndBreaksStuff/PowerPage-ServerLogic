# Project Structure & Naming

- Convention: Scaffold with the standard Vite template (`npm create vite` → `react-compiler-ts`, ESLint variant; owner decision 2026-10-17, the `yo pptb` generator is not used). Phase 00 adds the PPTB build shape and manifest by hand; these conventions layer on top of it.
- Convention: Feature-first layout under `src/`:
  `app/` (entry, providers, shell layout) · `features/<feature>/` (components, hooks, actions, types for one slice) · `components/` (shared, feature-agnostic UI only) · `lib/` (pure utilities, no React) · `services/` (PPTB host adapter, generators) · `types/` (shared types).
- Convention: Component files are PascalCase (`EntityList.tsx`); hooks and utility files are camelCase (`useEntityQuery.ts`, `generatePdf.ts`); folders are kebab-case. Hooks are `useXxx`; functions/variables camelCase; module-level constants UPPER_SNAKE_CASE; types/interfaces PascalCase with no `I` prefix. Never mix conventions.
- Convention: Folder names singular for a thing (`features/table-permission/`), plural only for collections (`components/`, `hooks/`); suffix role files: `*.test.ts(x)`, `*.types.ts`, `*.constants.ts`.
- ✓ Use named exports everywhere; default export only where a tool requires it (e.g. `React.lazy` modules).
- ✓ A feature may import from `components/`, `lib/`, `services/`, `types/` — never from another feature's internals. Cross-feature needs go through a shared module.
- ✓ Colocate tests, styles, and feature-only hooks next to the code they cover.
- ✗ Avoid barrel `index.ts` files that re-export whole folders (circular imports, slower HMR). A single public `index.ts` per feature is acceptable.
- ✗ Avoid top-level "type folders" (`containers/`, `reducers/`, `helpers/`) that scatter one feature across the tree.
- ✓ Use a path alias (`@/` → `src/`) configured in both `tsconfig.json` and `vite.config.ts`; no `../../../` chains.
