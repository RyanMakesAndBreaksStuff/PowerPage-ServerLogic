# React 19

- ✓ Function components only. Accept `ref` as a regular prop — ✗ do not use `forwardRef` in new code. Render `<Context value={…}>` instead of `<Context.Provider>`.
- ✓ Use Actions for async user operations: `useActionState` for form/submit flows (pending + result/error in one place), `useTransition`/`startTransition` for non-form async work, `useOptimistic` for instant feedback, `useFormStatus` inside nested submit buttons.
- ✓ Use `use(promise)` inside a `<Suspense>` boundary to read async data, with the promise created *outside* render (cached or passed from a parent) — ✗ never create a new promise in the render body (infinite suspense). `use(Context)` may be called conditionally.
- ✓ Enable React Compiler (`babel-plugin-react-compiler` in the Vite React plugin). ✗ Don't add `useMemo`/`useCallback`/`memo` by default; add them only with a measured reason or an identity requirement for a non-compiled library.
- ✗ Avoid `useEffect` for derived state (compute during render), for reacting to user events (do it in the handler), for resetting state on prop change (use `key`), or for chaining state updates. Effects are only for syncing with external systems (subscriptions, DOM APIs, timers) and must clean up.
- ✓ Fetch data through a cache layer (TanStack Query or a `use()`-compatible cache) rather than hand-rolled `useEffect` + `useState` fetches; when an effect must fetch, handle races with an ignore flag or `AbortController`.
- ✓ Use `useEffectEvent` for non-reactive logic read inside effects instead of suppressing `exhaustive-deps`.
- ✗ Never mutate props, state, or objects during render; keep components and hooks pure. Don't read/write `ref.current` during render.
- ✗ Don't define components inside other components; don't use array index as `key` for reorderable lists.
- ✓ Wrap feature areas in error boundaries and `<Suspense>` with meaningful fallbacks; pass `onCaughtError`/`onUncaughtError` to `createRoot` for centralized logging. Keep heavy modules (PDF, code editor) off the initial render path with `React.lazy`, but dynamic imports must stay inlined in the single bundle (`inlineDynamicImports`) — ✗ never introduce code-split chunks (PPTB loads one IIFE bundle).
