---
scope: conventions
loaded-by: sdd-specify, sdd-plan, sdd-execute, sdd-review
---

# Conventions

## File Naming
PascalCase component files (`EntityList.tsx`); camelCase hooks/utilities (`useEntityQuery.ts`); kebab-case folders. See `.claude/rules/project-structure.md`.

## Directory Structure
Vite `react-compiler-ts` scaffold plus the PPTB build shape (Phase 00) as the base; feature-first `src/` (`app/`, `features/<feature>/`, `components/`, `lib/`, `services/`, `types/`). Specs in `docs/specs/NNN-slug/`. Design references in `design_handoff_server_logic_tools/` and `mocks/` (reference only, not production code).

## Code Style
Strict TypeScript, ESLint flat config (typescript-eslint strictTypeChecked) + Prettier. See `.claude/rules/typescript.md`, `react.md`, `tooling.md`.

## Architectural Patterns
- Single `services/pptb/` adapter over host globals; read-only Dataverse access (`.claude/rules/pptb-host-and-output.md`).
- Pure `(model) => string` generators in `lib/`.
- Discriminated-union state; React 19 Actions; no effect-driven derived state.
