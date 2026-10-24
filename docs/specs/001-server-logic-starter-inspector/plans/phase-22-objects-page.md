# Phase 22: Server Objects page

> **Superseded in part by Phase 25 (spec v3.0.0, Iris).** The CSS variable names, `color-mix` tints of `--primary`, and hard-coded font weights in this file are replaced by `plans/phase-25-iris-theme.md` (selected rows use `--accent-soft`). The page's structure and behaviour stand.

**Part:** `plan-server-objects.md`, wave S2.
**Implements:** Story 6, FR-6 (the page), the Starter half of AC-6.10, and the "Permissions needed" tile from AC-3.6 | **Satisfies:**
- AC-6.1: three columns.
- AC-6.2: nine objects, description, count, and a `used` pill from the server pane.
- AC-6.3: search on object and member names, case-insensitive.
- AC-6.4: All, Used here and Connectors.
- AC-6.4a: reselect, first matching member, and the no-results message.
- AC-6.5: breadcrumb, type pill, member pills, signature with return type or "Not documented on Learn", sample card with variants, and the members table with the selected row tinted.
- AC-6.6: member pill and table row update the signature and sample.
- AC-6.7: Copy and "Code copied".
- AC-6.8: Insert as one `applyChanges`, cursor kept, view switched, Browser checks re-run, and the three disabled reasons, including the comment-cursor fixture.
- AC-6.9: Used in, Permissions needed with its warn state, Another sample.
- AC-6.10: both directions.
- Error Scenarios: "Server Objects search matches nothing".
- NFR: search filters within 100 ms, since it is synchronous on each keystroke.

**Depends on:**
- 13 (`SERVER_OBJECTS`).
- Part A: 03 `planInsertion`; 04 primitives; 06 `useView`, `ViewContext`, `App`; 18a session.
- **21 merged.** This phase edits `StarterPage.tsx` and `starterTestHarness.tsx` after Phase 21 does, and uses Phase 21's `src/app/CopyButton.tsx`.
- **Spec v2.2.0.** Server Objects requires Logic Starter; see Decision 1.

**Files:**
- Replace (whole file): `src/features/server-objects/ServerObjectsPage.tsx` (the Phase 00 placeholder).
- Create in `src/features/server-objects/`:
  - `objectList.ts`, `insertion.ts`, `InsertButton.tsx`, `ObjectDetail.tsx`, `ContextColumn.tsx`, `serverObjects.css`;
  - `objectsTestHarness.tsx` (test helper);
  - the tests `objectList.test.ts`, `insertion.test.ts`, `ServerObjectsPage.test.tsx`.
- Edit:
  - `vite.config.ts`: `parseReleasedPages` refuses `objects` without `starter`.
  - `src/app/App.tsx`: drop the Server Objects branch outside the Starter session.
  - `tests/buildShape.test.ts`.
  - `src/features/starter/StarterPage.tsx`: "Browse all in Server Objects".
  - `src/features/starter/starterTestHarness.tsx`: `ViewContext` and `views`.
  - `src/features/starter/StarterPage.test.tsx`.

**Interfaces:**
- **Consumes:**
  - Phase 13: `SERVER_OBJECTS`, `ServerObject`, `ObjectMember`, `ContextScope`, `NOT_DOCUMENTED`, `isConnector`.
  - Phase 03: `planInsertion(code, sample, cursor, targetFn)` and `InsertResult`, `TextChange` (`codeAnalysis.types`).
  - Phase 18a: `useStarterSession()` (`state.serverText`, `state.cursor`, `state.recipe`, `derived.fn`, `derived.slug`, `derived.usedMembers`, `derived.readiness.permissions`), `dispatch({ type: 'applyChanges', changes, cursor })`, `StarterSessionProvider`, `StarterSessionContext`, `FAKE_STARTER_DEPS`.
  - Phase 06: `useView`, `ViewContext`, `HostContext`, `NotifyProvider`.
  - Phase 05: `getRecipe` (`tables`, `webRole`).
  - Phase 04: `Button` (`disabledReason`), `Pill`, `PillGroup`, `Tile`, `StatusBadge`, `Icon`, `classNames`.
  - Phase 21: `CopyButton({ text, label })` from `@/app/CopyButton`.
  - Phase 01: `createFakeHost`.
- **Produces:**
  - `ServerObjectsPage()` (unchanged export name, mounted by `App`).
  - In `objectList.ts`: `type ObjectFilter = 'all' | 'used' | 'connectors'`, `type ListedObject`, `type Selection`, `DEFAULT_SELECTION`, `listObjects`, `reselect`, `selected`, `nextMember`.
  - In `insertion.ts`: `INSERT_REASONS`, `cursorAfter`.
  - `renderStarter(...)` now also returns `views: View[]`.
  - Nothing outside this feature consumes the page's internals.

## Decisions (recorded so later phases do not re-argue them)

1. **Server Objects ships only with Logic Starter** (owner, 2026-10-20). The page reads the Starter session for the `used` pills, the "Used here" filter, Used in, Permissions needed and Insert. An objects-without-starter build would have nothing to show in any of them. So `parseReleasedPages` fails such a build, and `App` mounts Server Objects only inside `StarterSessionProvider`. That overrides Phase 18a Decision 3's `VITE_RELEASED_PAGES=objects,inspector` smoke and makes the AC-1.7 and AC-6.8 "unreleased Starter" text unreachable. Spec v2.2.0 (MINOR, 2026-10-20) records this, and the preflight checks for it.
2. **Selection is state, and `reselect` runs in the event handler.** Search and filter changes call `reselect` on the new list, so leaving a search doesn't jump back to an old selection. Render calls it again only to cover the one change that isn't an event on this page: a server-pane edit while the page is hidden can empty "Used here". There is no `useEffect`.
3. **Search is a substring match on the object path and member names**, trimmed and lowercase, over nine objects. It runs synchronously in `onChange`, with no debounce and no transition. That is how the 100 ms NFR is met, and the test asserts the list right after one `change` event. A wall-clock assertion would be flaky under the parallel suite (see the Phase 21 note).
4. **"Used here" and the `used` pill read `derived.usedMembers`.** That is Phase 03's AST-based detection, so comments and strings don't count (FR-6).
5. **Insert:**
   - `planInsertion(state.serverText, sample, state.cursor, derived.fn)` runs during render. It is pure, small and memoised by the Compiler.
   - Success dispatches one `applyChanges` (Phase 18a Decision 1: one step, one undo in the editor).
   - The cursor is set by `cursorAfter`: the end of the inserted text in the new document, a statement boundary, so the next Insert goes after it ("the insertion point kept").
   - The view then switches with `setView('starter')`. Browser checks re-run because `derived.checks` is computed from the new text.
   - A failure maps its reason to the AC-6.8 tooltip on `Button`'s `disabledReason` (`aria-disabled`, focusable, AC-2.10).
6. **Copy is Phase 21's `CopyButton`, in `src/app/`.** It is a host-aware control used by both pages, like `ExternalLink`, and a feature can't import another feature's internals. Phase 21's plan creates it there.
7. **"Browse all in Server Objects" goes in Starter's action column**, under Start over, behind `__PAGE_OBJECTS__`. The 129 px recipe tile has no room, and reference 01 doesn't place it. It was checked in a 1100×780 render.
8. **"All properties"** is the table heading for objects whose members are properties (Context, User, Website). For everything else it's "All methods", the spec's wording. A table of properties headed "All methods" would be wrong.
9. **Permissions needed** shows:
   - `StatusBadge` "Permissions" (`✓` or `!` plus the word, never colour alone);
   - one pill per recipe table, `<logical name> · <privileges>`, review-toned until the checklist is reviewed, with its access type;
   - the recipe's web-role pill;
   - a line saying whether the checklist is reviewed.

   A recipe with no tables says so. The source is `getRecipe(state.recipe)` (FR-3) and `derived.readiness.permissions` (AC-5.4), the same facts Phase 18's `PermissionNote` uses.
10. **No results.**
    - With a search: "No objects or members match '<query>'" and a **Clear search** button (Error Scenarios).
    - The "Used here" filter on a handler that uses nothing: "No objects match this filter." with **Show all objects**.
    - The context column stays, without Another sample.
11. **Sample code** renders as one `<span>` per line inside `<pre><code>`, with CSS-counter line numbers, so the numbers are never copied (AC-4.9). In the Another sample tile, long lines wrap instead of scrolling sideways.

---

- [ ] **Step 0: Preflight**

  ```bash
  git status --short
  grep -n "export const SERVER_OBJECTS" src/services/catalogue/serverObjects.ts
  grep -n "export function CopyButton" src/app/CopyButton.tsx
  grep -n "Placeholder. Phase 22" src/features/server-objects/ServerObjectsPage.tsx
  grep -n "objects. requires .starter." docs/specs/001-server-logic-starter-inspector/spec.md
  ```

  Expect:
  - a clean tree, Phase 13's catalogue and Phase 21's `CopyButton` present, and the page placeholder still in place;
  - the spec at v2.2.0, which records that Server Objects requires Logic Starter.

  If `CopyButton` is missing, Phase 21 hasn't merged: stop. If the spec (v2.2.0 or later) lacks that FR-1 line, run `sdd-superpowers:sdd-spec-update` first.

### Task 1: Server Objects can't be built without Logic Starter

- [ ] **Step 1: Write the failing build test**

  In `tests/buildShape.test.ts`, inside `describe('released pages (FR-1): …')`, after the "unknown page name" test, add:

  ```ts
  it(
    'fails the build for Server Objects without Logic Starter',
    async () => {
      await expect(buildTool('objects-only', 'objects,inspector')).rejects.toThrow(
        /Server Objects needs Logic Starter/,
      );
    },
    BUILD_TIMEOUT,
  );
  ```

  Run: `npx vitest run tests/buildShape.test.ts -t "without Logic Starter"`. Expect: FAIL, the promise resolves (the build succeeds) instead of rejecting.

- [ ] **Step 2: Refuse the build, and mount Server Objects only inside the session**

  In `vite.config.ts`, at the end of `parseReleasedPages`, replace `return new Set(names.filter(isPage));` with:

  ```ts
  const released = new Set(names.filter(isPage));
  // Server Objects reads the Starter session (used marks, Insert), so it never ships without Logic Starter.
  if (released.has('objects') && !released.has('starter')) {
    throw new Error(
      'VITE_RELEASED_PAGES names "objects" without "starter": Server Objects needs Logic Starter.',
    );
  }
  return released;
  ```

  In `src/app/App.tsx`, delete the branch that mounted Server Objects outside the provider, so the Starter block ends `</StarterSessionProvider>\n) : null}`:

  ```diff
                     </StarterSessionProvider>
  -                ) : __PAGE_OBJECTS__ ? (
  -                  <Panel id="objects" label="Server Objects" view={view}>
  -                    <ServerObjectsPage />
  -                  </Panel>
                   ) : null}
  ```

  ```bash
  npx vitest run tests/buildShape.test.ts src/app/App.test.tsx
  npx tsc -b && npx eslint vite.config.ts src/app/App.tsx --max-warnings=0
  git add vite.config.ts src/app/App.tsx tests/buildShape.test.ts
  git commit -m "build: refuse a Server Objects release without Logic Starter"
  ```

  Expect: PASS, including the new test and the existing starter-only and unknown-page tests.

### Task 2: The list, the search and the selection rules

- [ ] **Step 1: Write the list test**

```ts file=src/features/server-objects/objectList.test.ts
import { describe, expect, it } from 'vitest';
import { SERVER_OBJECTS } from '@/services/catalogue/serverObjects';
import { DEFAULT_SELECTION, listObjects, nextMember, reselect, selected } from './objectList';

const NONE: ReadonlyMap<string, readonly string[]> = new Map();
const paths = (query: string, filter: 'all' | 'used' | 'connectors' = 'all', used = NONE) =>
  listObjects(query, filter, used).map((l) => l.object.path);

describe('listObjects (AC-6.3, AC-6.4)', () => {
  it('lists all nine objects with no search', () => {
    expect(paths('')).toEqual(SERVER_OBJECTS.map((o) => o.path));
  });

  it('matches object and member names, case-insensitive', () => {
    expect(paths('LOGGER')).toEqual(['Server.Logger']);
    expect(paths('retrievemultiple')).toEqual(['Server.Connector.Dataverse']);
    expect(paths('  async ')).toEqual([
      'Server.Connector.HttpClient',
      'Server.Connector.CloudFlow',
    ]);
    expect(paths('nothing like this')).toEqual([]);
  });

  it('records the first matching member (AC-6.4a)', () => {
    expect(listObjects('record', 'all', NONE)).toEqual([
      expect.objectContaining({ memberMatch: 'CreateRecord' }),
    ]);
    expect(listObjects('', 'all', NONE)[0]?.memberMatch).toBeNull();
  });

  it('filters to used objects or connectors', () => {
    const used = new Map([
      ['Server.Logger', ['Log']],
      ['Server.Connector.Dataverse', []],
    ]);
    expect(paths('', 'used', used)).toEqual(['Server.Logger', 'Server.Connector.Dataverse']);
    expect(paths('', 'connectors')).toEqual([
      'Server.Connector.Dataverse',
      'Server.Connector.HttpClient',
      'Server.Connector.CloudFlow',
    ]);
    expect(paths('log', 'connectors')).toEqual([]);
  });
});

describe('reselect (AC-6.4a)', () => {
  const dataverse = { path: 'Server.Connector.Dataverse', member: 'DeleteRecord', variant: 0 };

  it('keeps a selection that is still listed', () => {
    expect(reselect(listObjects('', 'connectors', NONE), dataverse, '')).toBe(dataverse);
  });

  it('selects the first listed object when the selection is filtered out', () => {
    expect(reselect(listObjects('', 'all', NONE).slice(1), DEFAULT_SELECTION, '')).toEqual({
      path: 'Server.Context',
      member: 'ActivityId',
      variant: 0,
    });
  });

  it('selects the first matching member when the search matches members', () => {
    expect(reselect(listObjects('Retrieve', 'all', NONE), dataverse, 'Retrieve')).toEqual({
      path: 'Server.Connector.Dataverse',
      member: 'RetrieveRecord',
      variant: 0,
    });
    expect(reselect(listObjects('Retrieve', 'all', NONE), DEFAULT_SELECTION, 'Retrieve')).toEqual({
      path: 'Server.Connector.Dataverse',
      member: 'RetrieveRecord',
      variant: 0,
    });
  });

  it('keeps a selected member the search matches', () => {
    const selection = { ...dataverse, member: 'RetrieveMultipleRecords' };
    expect(reselect(listObjects('Retrieve', 'all', NONE), selection, 'Retrieve')).toBe(selection);
  });

  it('keeps the selection when nothing is listed, and selected() reports no results', () => {
    expect(reselect([], dataverse, 'zzz')).toBe(dataverse);
    expect(selected([], dataverse)).toBeNull();
  });
});

describe('nextMember (AC-6.9)', () => {
  const logger = SERVER_OBJECTS[0];
  if (logger === undefined) throw new Error('no objects');

  it("wraps round in Learn's order", () => {
    const [log, warn, error] = logger.members;
    expect(nextMember(logger, log)?.name).toBe(warn?.name);
    if (error === undefined) throw new Error('no Error member');
    expect(nextMember(logger, error)?.name).toBe('Log');
  });

  it('is null for a one-member object', () => {
    const user = SERVER_OBJECTS.find((o) => o.path === 'Server.User');
    if (user === undefined) throw new Error('no Server.User');
    expect(nextMember(user, user.members[0])).toBeNull();
  });
});
```

  Run: `npx vitest run src/features/server-objects/objectList.test.ts`. Expect: FAIL, `Failed to resolve import "./objectList"`.

- [ ] **Step 2: Implement, run, commit**

```ts file=src/features/server-objects/objectList.ts
import { SERVER_OBJECTS, isConnector } from '@/services/catalogue/serverObjects';
import type { ObjectMember, ServerObject } from '@/services/catalogue/serverObjects';

export type ObjectFilter = 'all' | 'used' | 'connectors';
/** One listed object; `memberMatch` is its first member whose name matches the search, if any (AC-6.4a). */
export type ListedObject = { object: ServerObject; memberMatch: string | null };
export type Selection = { path: string; member: string; variant: number };

function selectionFor(object: ServerObject | undefined, member: string | null): Selection {
  return { path: object?.path ?? '', member: member ?? object?.members[0].name ?? '', variant: 0 };
}

export const DEFAULT_SELECTION: Selection = selectionFor(SERVER_OBJECTS[0], null);

/**
 * AC-6.3 and AC-6.4: the objects the list shows, in FR-6 order. The search matches an object path or a member name,
 * case-insensitive, as a substring; the filter keeps all objects, those `used` names (the server pane's objects) or
 * `Server.Connector.*` ones.
 */
export function listObjects(
  query: string,
  filter: ObjectFilter,
  used: ReadonlyMap<string, readonly string[]>,
): readonly ListedObject[] {
  const q = query.trim().toLowerCase();
  const listed: ListedObject[] = [];
  for (const object of SERVER_OBJECTS) {
    if (filter === 'used' && !used.has(object.path)) continue;
    if (filter === 'connectors' && !isConnector(object)) continue;
    const memberMatch =
      q === ''
        ? null
        : (object.members.find((m) => m.name.toLowerCase().includes(q))?.name ?? null);
    if (q === '' || memberMatch !== null || object.path.toLowerCase().includes(q)) {
      listed.push({ object, memberMatch });
    }
  }
  return listed;
}

/**
 * AC-6.4a: keeps the selection while its object is listed, otherwise selects the first listed object. A member match
 * replaces a selected member that the search doesn't match. With nothing listed the selection is kept, and the
 * detail shows the no-results message.
 */
export function reselect(
  listed: readonly ListedObject[],
  selection: Selection,
  query: string,
): Selection {
  const first = listed[0];
  if (first === undefined) return selection;
  const kept = listed.find((l) => l.object.path === selection.path);
  if (kept === undefined) return selectionFor(first.object, first.memberMatch);
  const q = query.trim().toLowerCase();
  if (kept.memberMatch !== null && !selection.member.toLowerCase().includes(q)) {
    return selectionFor(kept.object, kept.memberMatch);
  }
  return selection;
}

/** The selected object and member, from a selection `reselect` returned for the same list. `null`: no results. */
export function selected(
  listed: readonly ListedObject[],
  selection: Selection,
): { object: ServerObject; member: ObjectMember; variant: number } | null {
  const object = listed.find((l) => l.object.path === selection.path)?.object;
  if (object === undefined) return null;
  const member = object.members.find((m) => m.name === selection.member) ?? object.members[0];
  const variant = selection.variant < member.samples.length ? selection.variant : 0;
  return { object, member, variant };
}

/** AC-6.9 "Another sample": the next member in Learn's order, wrapping; `null` for a one-member object. */
export function nextMember(object: ServerObject, member: ObjectMember): ObjectMember | null {
  if (object.members.length === 1) return null;
  const index = object.members.indexOf(member);
  return object.members[(index + 1) % object.members.length] ?? null;
}
```

  ```bash
  npx vitest run src/features/server-objects/objectList.test.ts
  git add src/features/server-objects/objectList.ts src/features/server-objects/objectList.test.ts
  git commit -m "feat(server-objects): list, search and reselect objects"
  ```

  Expect: PASS, 11 tests.

### Task 3: Insert reasons and the kept cursor

- [ ] **Step 1: Write the insertion test**

```ts file=src/features/server-objects/insertion.test.ts
import { describe, expect, it } from 'vitest';
import { planInsertion } from '@/lib/code-analysis/structure';
import { INSERT_REASONS, cursorAfter } from './insertion';

describe('INSERT_REASONS (AC-6.8)', () => {
  it("uses the spec's tooltip text", () => {
    expect(INSERT_REASONS).toEqual({
      'no-target': 'No function to insert into; use Copy',
      'not-statement': 'Move the cursor between statements inside a function, or use Copy',
      'breaks-code': 'Inserting here would break the code; use Copy',
    });
  });
});

describe('cursorAfter (AC-6.8: the insertion point is kept)', () => {
  it('lands after the inserted sample', () => {
    const code = 'function get() {\n  return "{}";\n}\n';
    const plan = planInsertion(code, 'Server.Logger.Log("x");', null, 'get');
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.text.slice(0, cursorAfter(plan.changes))).toBe(
      'function get() {\n  Server.Logger.Log("x");\n',
    );
  });

  it('counts the async change before the sample', () => {
    const code = 'function get() {\n  return "{}";\n}\n';
    const plan = planInsertion(code, 'const r = await f();', null, 'get');
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.changes).toHaveLength(2);
    expect(plan.text.slice(0, cursorAfter(plan.changes))).toBe(
      'async function get() {\n  const r = await f();\n',
    );
  });
});
```

  Run: `npx vitest run src/features/server-objects/insertion.test.ts`. Expect: FAIL, `Failed to resolve import "./insertion"`.

- [ ] **Step 2: Implement, run, commit**

```ts file=src/features/server-objects/insertion.ts
import type { InsertResult, TextChange } from '@/lib/code-analysis/codeAnalysis.types';

type Reason = Extract<InsertResult, { ok: false }>['reason'];

/** AC-6.8's tooltips, one per `planInsertion` failure reason. */
export const INSERT_REASONS = {
  'no-target': 'No function to insert into; use Copy',
  'not-statement': 'Move the cursor between statements inside a function, or use Copy',
  'breaks-code': 'Inserting here would break the code; use Copy',
} as const satisfies Record<Reason, string>;

/**
 * Where the cursor goes after an insert: the end of the last change in the new text. Changes come ordered by `from`
 * with offsets in the original text, so each earlier change (the `async `) shifts the later ones (AC-6.8).
 */
export function cursorAfter(changes: readonly TextChange[]): number {
  let shift = 0;
  let end = 0;
  for (const change of changes) {
    end = change.from + shift + change.insert.length;
    shift += change.insert.length - (change.to - change.from);
  }
  return end;
}
```

  ```bash
  npx vitest run src/features/server-objects/insertion.test.ts
  git add src/features/server-objects/insertion.ts src/features/server-objects/insertion.test.ts
  git commit -m "feat(server-objects): map insert failures to their reasons"
  ```

  Expect: PASS, 3 tests.

### Task 4: The page

- [ ] **Step 1: Write the harness and the page test**

```tsx file=src/features/server-objects/objectsTestHarness.tsx
// Test helper, never imported by the app: mounts Server Objects inside the providers App gives it, on a fake host.
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { HostContext } from '@/app/HostContext';
import { NotifyProvider } from '@/app/NotifyProvider';
import { FAKE_STARTER_DEPS } from '@/app/starter-session/fakeStarterDeps';
import type { StarterAction } from '@/app/starter-session/starterSession.types';
import { StarterSessionProvider } from '@/app/starter-session/StarterSessionProvider';
import { StarterSessionContext } from '@/app/starter-session/useStarterSession';
import type { useStarterSession } from '@/app/starter-session/useStarterSession';
import { ViewContext } from '@/app/useView';
import { createFakeHost } from '@/services/pptb/fakeHost';
import type { FakeHostInit } from '@/services/pptb/fakeHost';
import type { View } from '@/types/http';

type Session = ReturnType<typeof useStarterSession>;

export function renderObjects(ui: ReactElement, options: { host?: FakeHostInit } = {}) {
  const host = createFakeHost(options.host);
  const user = userEvent.setup();
  const views: View[] = [];
  let latest: Session | null = null;
  const setView = (v: View): void => {
    views.push(v);
  };
  render(
    <HostContext value={host}>
      <NotifyProvider>
        <ViewContext value={['objects', setView]}>
          <StarterSessionProvider deps={FAKE_STARTER_DEPS}>
            {ui}
            {/* A render function, not a component, so the capture stays out of the app's lint rules. */}
            <StarterSessionContext.Consumer>
              {(session) => {
                latest = session;
                return null;
              }}
            </StarterSessionContext.Consumer>
          </StarterSessionProvider>
        </ViewContext>
      </NotifyProvider>
    </HostContext>,
  );
  const session = (): Session => {
    if (latest === null) throw new Error('Starter session not captured');
    return latest;
  };
  const dispatch = (action: StarterAction): void => {
    act(() => {
      session().dispatch(action);
    });
  };
  return { host, user, views, session, dispatch };
}
```

```tsx file=src/features/server-objects/ServerObjectsPage.test.tsx
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServerObjectsPage } from './ServerObjectsPage';
import { renderObjects } from './objectsTestHarness';

const list = (): HTMLElement => screen.getByRole('region', { name: 'Server objects' });
const detail = (): HTMLElement => screen.getByRole('region', { name: 'Object detail' });
const listed = (): string[] =>
  within(list())
    .getAllByRole('button')
    .map((b) => b.querySelector('.objects-item__path')?.textContent ?? '');
const pick = (path: string): HTMLElement =>
  within(list()).getByRole('button', { name: new RegExp(`^${path.replaceAll('.', '\\.')}`) });
const insert = (): HTMLElement => screen.getByRole('button', { name: 'Insert into handler' });
const signatures = (): string[] =>
  within(screen.getByRole('list', { name: 'Signatures' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

const HANDLER = 'function get() {\n  Server.Logger.Log("hi");\n  return "{}";\n}\n';

describe('Server Objects page (Story 6)', () => {
  it('shows the list, the detail and the context column (AC-6.1)', () => {
    renderObjects(<ServerObjectsPage />);
    expect(list()).toBeTruthy();
    expect(detail()).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Used in customer-summary' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Permissions needed' })).toBeTruthy();
  });

  it('lists the nine objects with description and count, and marks used ones (AC-6.2)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    expect(listed()).toHaveLength(9);
    expect(pick('Server.Context').textContent).toContain('9 properties');
    expect(pick('Server.Logger').textContent).toContain('3 methods');
    expect(within(pick('Server.Logger')).queryByText('used')).toBeNull();
    dispatch({ type: 'editServer', text: HANDLER, cursor: null });
    expect(within(pick('Server.Logger')).getByText('used')).toBeTruthy();
    expect(within(pick('Server.Context')).queryByText('used')).toBeNull();
  });

  it('ignores mentions in comments when marking used (FR-6)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    dispatch({
      type: 'editServer',
      text: '// Server.Logger.Log\nfunction get() {}\n',
      cursor: null,
    });
    expect(within(pick('Server.Logger')).queryByText('used')).toBeNull();
  });

  it('filters by search, synchronously on each keystroke (AC-6.3, NFR 100 ms)', () => {
    renderObjects(<ServerObjectsPage />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search objects and methods' }), {
      target: { value: 'httpclient' },
    });
    expect(listed()).toEqual(['Server.Connector.HttpClient']);
  });

  it('filters to used objects and connectors (AC-6.4)', async () => {
    const { user, dispatch } = renderObjects(<ServerObjectsPage />);
    dispatch({ type: 'editServer', text: HANDLER, cursor: null });
    await user.click(screen.getByRole('radio', { name: 'Used here' }));
    expect(listed()).toEqual(['Server.Logger']);
    await user.click(screen.getByRole('radio', { name: 'Connectors' }));
    expect(listed()).toEqual([
      'Server.Connector.Dataverse',
      'Server.Connector.HttpClient',
      'Server.Connector.CloudFlow',
    ]);
  });

  it('reselects when the list changes, and shows no results (AC-6.4a, Error Scenarios)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    expect(within(detail()).getByRole('heading', { name: 'Logger' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'Connectors' }));
    expect(within(detail()).getByRole('heading', { name: 'Dataverse' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'All' }));
    const search = screen.getByRole('searchbox', { name: 'Search objects and methods' });
    await user.type(search, 'Update');
    expect(
      within(detail()).getByRole('radio', { name: 'UpdateRecord' }).getAttribute('aria-checked'),
    ).toBe('true');
    await user.clear(search);
    await user.type(search, 'zzz');
    expect(within(detail()).getByRole('status').textContent).toBe(
      "No objects or members match 'zzz'",
    );
    await user.click(within(detail()).getByRole('button', { name: 'Clear search' }));
    expect(listed()).toHaveLength(9);
  });

  it('shows breadcrumb, type pill, members, signature, return type and the table (AC-6.5)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.Connector.Dataverse'));
    const nav = within(detail()).getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav.textContent).toBe('Server.Connector›DataverseConnector');
    expect(within(detail()).getAllByRole('radio')).toHaveLength(6);
    expect(signatures()).toEqual(['CreateRecord(entitySetName, payload)']);
    expect(detail().textContent).toContain('Returns: Connector result');
    expect(detail().textContent).toContain('Synchronous');
    const table = within(detail()).getByRole('table', { name: 'All methods' });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(
      within(table).getByRole('button', { name: 'CreateRecord' }).getAttribute('aria-current'),
    ).toBe('true');

    await user.click(pick('Server.Logger'));
    expect(within(detail()).getByRole('navigation').textContent).toBe('Server›LoggerObject');
    expect(detail().textContent).toContain('Returns: Not documented on Learn');
  });

  it('marks Context members by invocation context (FR-6)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.Context'));
    expect(detail().textContent).toContain('HTTP and Liquid');
    await user.click(within(detail()).getByRole('radio', { name: 'Input' }));
    expect(detail().textContent).toContain('Liquid only');
    expect(within(detail()).getByRole('table', { name: 'All properties' })).toBeTruthy();
  });

  it('updates signature and sample from a member pill or a table row (AC-6.6)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.Connector.Dataverse'));
    await user.click(within(detail()).getByRole('radio', { name: 'RetrieveRecord' }));
    expect(signatures()).toHaveLength(3);
    expect(screen.getByLabelText('RetrieveRecord sample').textContent).toContain('RetrieveRecord(');
    await user.click(within(detail()).getByRole('button', { name: 'DeleteRecord' }));
    expect(signatures()).toEqual(['DeleteRecord(entitySetName, id)']);
    expect(screen.getByLabelText('DeleteRecord sample').textContent).toContain('DeleteRecord(');
  });

  it('switches sample variants (FR-6)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.type(
      screen.getByRole('searchbox', { name: 'Search objects and methods' }),
      'RetrieveMultiple',
    );
    const sample = (): string =>
      screen.getByLabelText('RetrieveMultipleRecords sample').textContent;
    expect(sample()).toContain('$filter');
    await user.click(screen.getByRole('radio', { name: 'Top N' }));
    expect(sample()).toContain('$top=3');
  });

  it('copies the sample with the "Code copied" toast (AC-6.7)', async () => {
    const { host, user } = renderObjects(<ServerObjectsPage />);
    await user.click(screen.getByRole('button', { name: 'Copy sample' }));
    await waitFor(() => {
      expect(host.callsOf('notify')).toEqual([
        { method: 'notify', notice: { title: 'Code copied', body: '', type: 'success' } },
      ]);
    });
    expect(host.callsOf('copyText')).toEqual([
      { method: 'copyText', text: 'Server.Logger.Log("Information message");' },
    ]);
  });

  it('inserts into the handler as one change, keeps the cursor and opens Logic Starter (AC-6.8)', async () => {
    const { user, session, views } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.Connector.HttpClient'));
    await user.click(insert());
    const { serverText, cursor } = session().state;
    expect(serverText.startsWith('async function get() {\n  const url =')).toBe(true);
    expect(serverText.slice(0, cursor ?? 0).endsWith('HttpClient.GetAsync(url, headers);\n')).toBe(
      true,
    );
    expect(session().derived.checks).toEqual({ hits: [], parseFailed: false });
    expect(views).toEqual(['starter']);
  });

  it('disables Insert with the reason and keeps Copy (AC-6.8 fixture)', async () => {
    const { dispatch, views, user } = renderObjects(<ServerObjectsPage />);
    const code = 'function get(){ /* cursor */ return "{}"; }';
    dispatch({ type: 'editServer', text: code, cursor: code.indexOf('cursor') });
    expect(insert().getAttribute('aria-disabled')).toBe('true');
    fireEvent.focus(insert());
    expect(
      screen.getByText('Move the cursor between statements inside a function, or use Copy'),
    ).toBeTruthy();
    await user.click(insert());
    expect(views).toEqual([]);
    expect(
      screen.getByRole('button', { name: 'Copy sample' }).getAttribute('aria-disabled'),
    ).toBeNull();
  });

  it('says why when the code has no function or the insert would break it (AC-6.8)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    dispatch({ type: 'editServer', text: 'const x = ;', cursor: null });
    fireEvent.focus(insert());
    expect(screen.getByText('No function to insert into; use Copy')).toBeTruthy();
  });

  it('shows used members, permissions and another sample (AC-6.9)', async () => {
    const { dispatch, user } = renderObjects(<ServerObjectsPage />);
    dispatch({ type: 'editServer', text: HANDLER, cursor: null });
    const used = screen.getByRole('region', { name: 'Used in customer-summary' });
    expect(used.textContent).toContain('Server.Logger');
    expect(within(used).getByText('Log')).toBeTruthy();

    const permissions = screen.getByRole('region', { name: 'Permissions needed' });
    expect(permissions.textContent).toContain('contact · Read');
    expect(permissions.textContent).toContain('Not reviewed yet');
    dispatch({ type: 'markReviewed' });
    expect(permissions.textContent).toContain('Checklist reviewed');

    const another = screen.getByRole('region', { name: 'Another sample' });
    expect(within(another).getByLabelText('Warn sample').textContent).toContain('Warn(');
    await user.click(pick('Server.User'));
    expect(screen.queryByRole('region', { name: 'Another sample' })).toBeNull();
  });

  it('goes back to Create Logic (AC-6.10)', async () => {
    const { user, views } = renderObjects(<ServerObjectsPage />);
    await user.click(screen.getByRole('button', { name: 'Back to Create Logic' }));
    expect(views).toEqual(['starter']);
  });
});
```

  Run: `npx vitest run src/features/server-objects/ServerObjectsPage.test.tsx`. Expect: FAIL, 16 of 16. Against the placeholder every test fails on a missing element, for example `Unable to find an accessible element with the role "button" and name "Copy sample"` (checked on `9ecf8ac`).

- [ ] **Step 2: Write the Insert button**

```tsx file=src/features/server-objects/InsertButton.tsx
import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { useView } from '@/app/useView';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { planInsertion } from '@/lib/code-analysis/structure';
import { INSERT_REASONS, cursorAfter } from './insertion';

/**
 * AC-6.8: inserts the sample into the server pane as one `applyChanges` (insertion and `async` together), keeps the
 * cursor after it and switches to Logic Starter, where Browser checks re-run from the new text. When the plan fails,
 * the button stays focusable with the reason (`aria-disabled`, AC-2.10) and Copy still works.
 */
export function InsertButton({ sample }: { sample: string }): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  const [, setView] = useView();
  const plan = planInsertion(state.serverText, sample, state.cursor, derived.fn);

  const insert = (): void => {
    if (!plan.ok) return;
    dispatch({ type: 'applyChanges', changes: plan.changes, cursor: cursorAfter(plan.changes) });
    setView('starter');
  };

  return (
    <Button
      variant="primary"
      disabledReason={plan.ok ? null : INSERT_REASONS[plan.reason]}
      onClick={insert}
    >
      <Icon name="add" />
      Insert into handler
    </Button>
  );
}
```

- [ ] **Step 3: Write the detail column**

```tsx file=src/features/server-objects/ObjectDetail.tsx
import type { ReactElement } from 'react';
import { CopyButton } from '@/app/CopyButton';
import { Pill } from '@/components/Pill';
import { PillGroup } from '@/components/PillGroup';
import { Tile } from '@/components/Tile';
import { classNames } from '@/lib/classNames';
import { NOT_DOCUMENTED, isConnector } from '@/services/catalogue/serverObjects';
import type { ContextScope, ObjectMember, ServerObject } from '@/services/catalogue/serverObjects';
import { InsertButton } from './InsertButton';

const CONTEXT_LABEL = {
  both: 'HTTP and Liquid',
  http: 'HTTP only',
  liquid: 'Liquid only',
} as const satisfies Record<ContextScope, string>;

type DetailProps = {
  object: ServerObject;
  member: ObjectMember;
  variant: number;
  onSelectMember: (name: string) => void;
  onSelectVariant: (index: number) => void;
};

/** A sample's code with CSS line numbers; the copied text is the catalogue string itself (AC-4.9). */
export function SampleCode({ code, label }: { code: string; label: string }): ReactElement {
  return (
    <pre className="objects-code" aria-label={label}>
      <code>
        {code.split('\n').map((line, index) => (
          // Lines never reorder: the index is the line number.
          <span key={index} className="objects-code__line">
            {line}
          </span>
        ))}
      </code>
    </pre>
  );
}

/** AC-6.5 and AC-6.6: breadcrumb, type pill, members, signature, sample card and the members table. */
export function ObjectDetail({
  object,
  member,
  variant,
  onSelectMember,
  onSelectVariant,
}: DetailProps): ReactElement {
  const segments = object.path.split('.');
  const leaf = segments.pop() ?? object.path;
  const sample = member.samples[variant] ?? member.samples[0];
  const kind = member.kind === 'property' ? 'properties' : 'methods';
  return (
    <Tile flush role="region" aria-label="Object detail" className="objects-detail">
      <div className="objects-detail__head">
        <nav aria-label="Breadcrumb" className="objects-detail__crumbs">
          <span className="ui-mono objects-detail__parent">{segments.join('.')}</span>
          <span aria-hidden="true">›</span>
          <h2 className="objects-detail__title">{leaf}</h2>
          <Pill tone="server">{isConnector(object) ? 'Connector' : 'Object'}</Pill>
        </nav>
        <p className="objects-detail__description">{object.description}</p>
        <PillGroup
          label="Members"
          options={object.members.map((m) => ({ value: m.name, label: m.name }))}
          value={member.name}
          onChange={onSelectMember}
          compact
        />
      </div>
      <div className="objects-detail__body">
        <div className="objects-signature">
          <ul aria-label="Signatures" className="objects-signature__list">
            {member.signatures.map((signature) => (
              <li key={signature} className="ui-mono">
                {signature}
              </li>
            ))}
          </ul>
          <p className="objects-signature__meta">
            {member.timing === null ? null : (
              <Pill compact>{member.timing === 'async' ? 'Async: use await' : 'Synchronous'}</Pill>
            )}
            {member.context === null ? null : <Pill compact>{CONTEXT_LABEL[member.context]}</Pill>}
            <span>Returns: {member.returns ?? NOT_DOCUMENTED}</span>
          </p>
        </div>
        <section aria-label="Sample" className="objects-sample">
          <div className="objects-sample__bar">
            {member.samples.length > 1 ? (
              <PillGroup
                label="Sample variant"
                options={member.samples.map((s, index) => ({
                  value: String(index),
                  label: s.label,
                }))}
                value={String(variant)}
                onChange={(value) => {
                  onSelectVariant(Number(value));
                }}
                compact
              />
            ) : null}
            <span className="objects-sample__actions">
              <CopyButton text={sample.code} label="Copy sample" />
              <InsertButton sample={sample.code} />
            </span>
          </div>
          <SampleCode code={sample.code} label={`${member.name} sample`} />
        </section>
        <table className="objects-table">
          <caption className="ui-tile__label">All {kind}</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Signature</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            {object.members.map((m) => (
              <tr
                key={m.name}
                className={classNames(m.name === member.name && 'objects-table__row--selected')}
              >
                <td>
                  <button
                    type="button"
                    className="objects-table__name ui-mono"
                    aria-current={m.name === member.name ? 'true' : undefined}
                    onClick={() => {
                      onSelectMember(m.name);
                    }}
                  >
                    {m.name}
                  </button>
                </td>
                <td className="ui-mono objects-table__signature" title={m.signatures.at(-1)}>
                  {m.signatures.at(-1)}
                </td>
                <td title={m.description}>{m.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tile>
  );
}
```

- [ ] **Step 4: Write the context column**

```tsx file=src/features/server-objects/ContextColumn.tsx
import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { useView } from '@/app/useView';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { StatusBadge } from '@/components/StatusBadge';
import { Tile } from '@/components/Tile';
import { getRecipe } from '@/services/catalogue/recipes';
import type { ObjectMember, ServerObject } from '@/services/catalogue/serverObjects';
import { nextMember } from './objectList';
import { SampleCode } from './ObjectDetail';

/** AC-6.9: what the handler uses, the permissions it needs and another sample of the selected object. */
export function ContextColumn({
  shown,
}: {
  shown: { object: ServerObject; member: ObjectMember } | null; // null: no results
}): ReactElement {
  const { state, derived } = useStarterSession();
  const [, setView] = useView();
  const recipe = getRecipe(state.recipe);
  const reviewed = derived.readiness.permissions;
  const another = shown === null ? null : nextMember(shown.object, shown.member);
  return (
    <div className="objects-context">
      <Tile heading={`Used in ${derived.slug}`}>
        {derived.usedMembers.size === 0 ? (
          <p className="objects-muted">The handler uses no Server objects yet.</p>
        ) : (
          <ul className="objects-used">
            {[...derived.usedMembers].map(([path, members]) => (
              <li key={path}>
                <span className="ui-mono objects-used__path">{path}</span>
                {members.length === 0 ? null : (
                  <span className="objects-used__members">
                    {members.map((name) => (
                      <Pill key={name} compact mono>
                        {name}
                      </Pill>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button
          onClick={() => {
            setView('starter');
          }}
        >
          <Icon name="arrow-left" />
          Back to Create Logic
        </Button>
      </Tile>
      <Tile heading="Permissions needed">
        <StatusBadge kind={reviewed ? 'ok' : 'review'} label="Permissions" />
        {recipe.tables.length === 0 ? (
          <p className="objects-muted">This recipe reads no Dataverse tables.</p>
        ) : (
          <ul className="objects-grants">
            {recipe.tables.map((table) => (
              <li key={table.logicalName}>
                <Pill tone={reviewed ? 'ok' : 'review'} mono>
                  {table.logicalName} · {table.privileges.join(', ')}
                </Pill>
                <span className="objects-muted">{table.accessType} access</span>
              </li>
            ))}
          </ul>
        )}
        <Pill>{recipe.webRole}</Pill>
        <p className="objects-muted">
          {reviewed
            ? 'Checklist reviewed in Logic Starter.'
            : 'Not reviewed yet. Review the checklist in Logic Starter before release.'}
        </p>
      </Tile>
      {another === null ? null : (
        <Tile heading="Another sample" className="objects-context__another">
          <SampleCode code={another.samples[0].code} label={`${another.name} sample`} />
          <Pill compact mono>
            {another.name}
          </Pill>
        </Tile>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Replace the page placeholder and add its styles**

```tsx file=src/features/server-objects/ServerObjectsPage.tsx
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { PillGroup } from '@/components/PillGroup';
import { Tile } from '@/components/Tile';
import { classNames } from '@/lib/classNames';
import { ContextColumn } from './ContextColumn';
import { ObjectDetail } from './ObjectDetail';
import { DEFAULT_SELECTION, listObjects, reselect, selected } from './objectList';
import type { ObjectFilter, Selection } from './objectList';
import './serverObjects.css';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'used', label: 'Used here' },
  { value: 'connectors', label: 'Connectors' },
] as const satisfies readonly { value: ObjectFilter; label: string }[];

const count = (n: number, kind: 'method' | 'property'): string =>
  `${String(n)} ${kind === 'property' ? (n === 1 ? 'property' : 'properties') : n === 1 ? 'method' : 'methods'}`;

/** Story 6: the object list, the object detail and the context column (AC-6.1). */
export function ServerObjectsPage(): ReactElement {
  const { derived } = useStarterSession();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ObjectFilter>('all');
  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION);

  const listed = listObjects(query, filter, derived.usedMembers);
  // An edit in the server pane can change "Used here" while this page is hidden; reselect covers it at render.
  const current = selected(listed, reselect(listed, selection, query));

  const change = (nextQuery: string, nextFilter: ObjectFilter): void => {
    setQuery(nextQuery);
    setFilter(nextFilter);
    setSelection(
      reselect(listObjects(nextQuery, nextFilter, derived.usedMembers), selection, nextQuery),
    );
  };

  return (
    <div className="objects-page">
      <Tile role="region" aria-label="Server objects" className="objects-list">
        <label className="objects-search">
          <Icon name="search" />
          <input
            type="search"
            aria-label="Search objects and methods"
            placeholder="Search objects and methods"
            value={query}
            onChange={(e) => {
              change(e.target.value, filter);
            }}
          />
        </label>
        <PillGroup
          label="Filter objects"
          options={FILTERS}
          value={filter}
          onChange={(value) => {
            change(query, value);
          }}
          compact
        />
        <ul className="objects-list__items">
          {listed.map(({ object }) => {
            const isSelected = current?.object === object;
            return (
              <li key={object.path}>
                <button
                  type="button"
                  className={classNames('objects-item', isSelected && 'objects-item--selected')}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => {
                    setSelection({ path: object.path, member: object.members[0].name, variant: 0 });
                  }}
                >
                  <span className="objects-item__row">
                    <span className="ui-mono objects-item__path">{object.path}</span>
                    {derived.usedMembers.has(object.path) ? (
                      <Pill tone="server" compact>
                        used
                      </Pill>
                    ) : null}
                  </span>
                  <span className="objects-item__meta">
                    {object.description} · {count(object.members.length, object.members[0].kind)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Tile>
      {current === null ? (
        <Tile role="region" aria-label="Object detail" className="objects-detail">
          {/* Error Scenarios: a search that matches nothing; the "Used here" filter alone can also empty the list. */}
          <p role="status" className="objects-muted">
            {query.trim() === ''
              ? 'No objects match this filter.'
              : `No objects or members match '${query.trim()}'`}
          </p>
          <Button
            onClick={() => {
              change('', query.trim() === '' ? 'all' : filter);
            }}
          >
            {query.trim() === '' ? 'Show all objects' : 'Clear search'}
          </Button>
        </Tile>
      ) : (
        <ObjectDetail
          object={current.object}
          member={current.member}
          variant={current.variant}
          onSelectMember={(name) => {
            setSelection({ path: current.object.path, member: name, variant: 0 });
          }}
          onSelectVariant={(variant) => {
            setSelection({ path: current.object.path, member: current.member.name, variant });
          }}
        />
      )}
      <ContextColumn shown={current} />
    </div>
  );
}
```

```css file=src/features/server-objects/serverObjects.css
/* Server Objects, layout 10a reference 03/04. Colours come only from the theme tokens. */

/* Fills the tool below the 42px title bar; below the 1024×700 minimum the window scrolls (NFR). */
.objects-page {
  box-sizing: border-box;
  height: max(calc(100vh - 42px), 658px);
  padding: 12px 16px 16px;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 250px;
  gap: 12px;
}

.objects-muted {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

/* Object list */
.objects-list {
  gap: 6px;
  padding: 12px;
}

.objects-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--control-border);
  border-radius: 99px;
  background: var(--code);
  color: var(--muted);
}

.objects-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 12px;
}

.objects-search:focus-within {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

.objects-search input:focus {
  outline: none;
}

.objects-list__items {
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}

.objects-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.objects-item--selected {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
}

.objects-item--selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 11px;
  bottom: 11px;
  width: 3px;
  border-radius: 2px;
  background: var(--primary);
}

.objects-item__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.objects-item__path {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* One line, as in reference 03; the full description is in the detail column. */
.objects-item__meta {
  color: var(--muted);
  font-size: 11.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Detail */
.objects-detail__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.objects-detail__crumbs {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
}

.objects-detail__parent {
  font-size: 11.5px;
}

.objects-detail__title {
  margin: 0;
  color: var(--text);
  font-size: 20px;
  font-weight: 600;
}

.objects-detail__description {
  margin: 0;
  max-width: 560px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.5;
}

.objects-detail__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 14px 20px;
  overflow-y: auto;
}

/* The body scrolls; its blocks keep their height instead of shrinking to fit. */
.objects-detail__body > * {
  flex: none;
}

.objects-signature {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.objects-signature__list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12.5px;
  font-weight: 600;
}

.objects-signature__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.objects-sample {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--code);
  overflow: hidden;
}

.objects-sample__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.objects-sample__actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.objects-code {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.7;
  counter-reset: line;
}

.objects-code__line {
  display: block;
  white-space: pre;
}

/* Line numbers are generated content, so they are never part of the copied text (AC-4.9). */
.objects-code__line::before {
  counter-increment: line;
  content: counter(line);
  display: inline-block;
  width: 3ch;
  margin-right: 2ch;
  color: var(--comment);
  text-align: right;
  user-select: none;
}

/* Fixed columns, one line per row as in reference 03; each cell's full text is in its title. */
.objects-table {
  width: 100%;
  table-layout: fixed;
  border: 1px solid var(--border);
  border-radius: 10px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
}

.objects-table caption {
  padding-bottom: 6px;
  text-align: left;
}

.objects-table th {
  padding: 7px 12px;
  color: var(--muted);
  font-weight: 600;
  text-align: left;
}

.objects-table th:first-child {
  width: 34%;
}

.objects-table th:nth-child(2) {
  width: 33%;
}

.objects-table td {
  padding: 7px 12px;
  border-top: 1px solid var(--border);
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.objects-table__row--selected td {
  background: color-mix(in srgb, var(--primary) 6%, transparent);
}

.objects-table__name {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: 11.5px;
  text-decoration: underline;
  cursor: pointer;
}

.objects-table__signature {
  color: var(--muted);
  font-size: 11px;
}

/* Context column */
.objects-context {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.objects-context .ui-tile {
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.5;
}

.objects-context__another {
  flex: 1;
}

.objects-context__another .objects-code {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--code);
  font-size: 10px;
}

/* The narrow column wraps long lines instead of scrolling sideways. */
.objects-context__another .objects-code__line {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.objects-used,
.objects-grants {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.objects-used li,
.objects-grants li {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.objects-used__path {
  color: var(--server);
  font-size: 11.5px;
  word-break: break-all;
}

.objects-used__members {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
```

- [ ] **Step 6: Point the build-shape markers at the real page**

  In `tests/buildShape.test.ts`, replace both `'Server Objects page placeholder'` markers with `'Search objects and methods'` (text only this page renders). Keep `toContain` in the all-pages test and `not.toContain` in the starter-only test.

- [ ] **Step 7: Run, check, commit**

  ```bash
  npx vitest run src/features/server-objects tests/buildShape.test.ts
  npx tsc -b
  npx eslint src/features/server-objects tests --max-warnings=0
  npx prettier --check src/features/server-objects tests --end-of-line auto
  git add src/features/server-objects tests/buildShape.test.ts
  git commit -m "feat(server-objects): browse objects, copy and insert samples"
  ```

  Expect: `src/features/server-objects` passes 3 files and 30 tests (11 list, 3 insertion, 16 page), and the build-shape tests pass.

### Task 5: "Browse all in Server Objects" from Logic Starter (AC-6.10)

- [ ] **Step 1: Give the Starter harness a view, and write the failing test**

  In `src/features/starter/starterTestHarness.tsx`:
  - Import `ViewContext` from `'@/app/useView'` and `type View` from `'@/types/http'`.
  - Before `render(`, add:

    ```tsx
    const views: View[] = [];
    const setView = (v: View): void => {
      views.push(v);
    };
    ```

  - Wrap the `<StarterSessionProvider …>…</StarterSessionProvider>` element in `<ViewContext value={['starter', setView]}>…</ViewContext>`, inside `NotifyProvider`.
  - Return `views`: `return { host, user, views, session, dispatch };`. Keep any helpers Phase 21 added, such as `editorView`.

  At the end of the `describe` in `src/features/starter/StarterPage.test.tsx` that holds the Start over test, add:

  ```tsx
  it('opens Server Objects from "Browse all in Server Objects" (AC-6.10)', async () => {
    const h = renderStarter(<StarterPage />);
    await h.user.click(screen.getByRole('button', { name: 'Browse all in Server Objects' }));
    expect(h.views).toEqual(['objects']);
  });
  ```

  Run: `npx vitest run src/features/starter/StarterPage.test.tsx -t "Browse all"`. Expect: FAIL, `Unable to find an accessible element with the role "button" and name "Browse all in Server Objects"`.

- [ ] **Step 2: Add the button**

  In `src/features/starter/StarterPage.tsx`:
  - Import `useView` from `'@/app/useView'`.
  - Add `const [, setView] = useView();` after the `useStarterSession()` line.
  - In `starter-page__actions`, after the Start over button, add:

  ```tsx
  {/* AC-6.10; a constant condition, so a build without Server Objects drops it (FR-1). */}
  {__PAGE_OBJECTS__ ? (
    <Button
      fullWidth
      onClick={() => {
        setView('objects');
      }}
    >
      <Icon name="cube" />
      Browse all in Server Objects
    </Button>
  ) : null}
  ```

  In `tests/buildShape.test.ts`, in the starter-only test, add `expect(code).not.toContain('Browse all in Server Objects');` next to the other `not.toContain` markers.

  ```bash
  npx vitest run src/features/starter tests/buildShape.test.ts
  npx tsc -b && npx eslint src/features/starter tests --max-warnings=0
  git add src/features/starter tests/buildShape.test.ts
  git commit -m "feat(starter): open Server Objects from Create Logic"
  ```

  Expect: PASS. The starter-only bundle has no "Browse all" text.

### Task 6: Integration verification

- [ ] **Step 1: The four checks**

  ```bash
  npx tsc -b
  npx eslint . --max-warnings=0
  npx prettier --check . --end-of-line auto
  npx vitest run
  ```

  Expect: all exit 0. On the planning baseline (`9ecf8ac` plus Phase 13), this phase added 4 files and 34 tests (30 page-feature, 1 build shape, 1 Starter; CopyButton's 2 belong to Phase 21). Phase 21 adds its own on top. `browserChecks.test.ts > performance` is load-sensitive; rerun it alone if it is the only failure.

- [ ] **Step 2: ◆ Rendered check (needs a person)**

  ```bash
  npx vite build --outDir .playwright-mcp/build --emptyOutDir
  npx vite preview --outDir .playwright-mcp/build --port 5199 --strictPort
  ```

  At 1100×780, in light and in dark (`document.documentElement.dataset.theme = 'dark'`), check:
  - the three columns match reference 03/04 (260 px / fluid / 250 px);
  - list descriptions are one line;
  - the sample card shows with its variant pills, Copy and Insert;
  - each table row is one line;
  - the Another sample tile wraps;
  - "Browse all in Server Objects" fits Starter's action column.

  `vite dev` can't be used: `fixHtmlForPPTB` strips `type="module"`, so the dev page doesn't load.

## Verified while planning (2026-10-20)

Every file was drafted at its path on `001-server-objects` (`9ecf8ac`), with Phase 13 drafted and `CopyButton` at `src/app/`, and run against the repository. The full suite passed with 77 files and 1,118 tests. tsc, ESLint (`--max-warnings=0`) and Prettier were clean, and `npx vite build` succeeded. A 1100×780 render in light and dark was checked with Playwright. Findings that shaped the plan:

1. In the scrolling detail body, the flex column shrank the sample card to zero height. `.objects-detail__body > * { flex: none; }` fixes it.
2. An auto-layout table wrapped long signatures over four lines. A fixed layout with one-line cells and a `title` per cell matches reference 03.
3. List descriptions wrapped to five lines. One line with an ellipsis matches the reference, and the full description is in the detail column.
4. A list button's accessible name runs the path into the description (`Server.LoggerWrites…`), so tests find it by a `^path` regex.
5. `PillGroup` radios are buttons with `aria-checked`, not inputs, so tests read the attribute.

## Done when

- AC-6.1 to AC-6.10 and AC-6.4a pass as tests, with the AC-6.8 fixture covered.
- An objects-without-starter build fails, and the starter-only bundle has no Server Objects text.
- The full suite, tsc, ESLint and Prettier are clean, and the ◆ render check matches the reference in both themes.
