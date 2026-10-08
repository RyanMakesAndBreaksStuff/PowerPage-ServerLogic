# TypeScript

- ✓ `tsconfig`: `"strict": true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `moduleResolution: "bundler"`, `noEmit` (Vite builds; `tsc -b` only type-checks).
- ✗ No `any`. Use `unknown` at boundaries and narrow it. Every host API response, file import, or `JSON.parse` result is `unknown` until validated (Zod/Valibot schema or a hand-written type guard).
- ✗ No non-null assertions (`!`) or `as` casts to silence errors; `as const` and `satisfies` are fine and preferred for config/lookup objects.
- ✓ Model states with discriminated unions (`{ status: 'idle' } | { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ok'; data: T }`) instead of parallel booleans; exhaust them with a `never` check in `switch`.
- ✓ Use `import type` / `export type` for type-only imports (enforced by `verbatimModuleSyntax`).
- ✓ Prefer `type` aliases for props and unions; use `interface` only when declaration merging or `extends` hierarchies are needed — be consistent per codebase.
- ✓ Type component props via `ComponentProps<'button'>` / `ComponentPropsWithRef<typeof X>` when wrapping native or library elements rather than re-declaring attributes.
- ✓ Return explicit types from exported functions in `services/` and `lib/` (stable public contracts); let inference handle locals.
- ✗ Do not swallow errors: `catch (e: unknown)` → narrow → surface to the UI or rethrow with context.
