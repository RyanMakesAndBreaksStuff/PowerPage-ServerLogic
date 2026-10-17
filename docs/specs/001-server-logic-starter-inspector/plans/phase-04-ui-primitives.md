# Phase 04: Design tokens and shared UI primitives

**Implements:** FR-11 (both token sets, dark aurora and glass, code-highlight rule, focus ring, JetBrains Mono, SVG rings with 4° gaps and the proportional mode above 30, Fluent System Icons), FR-1 (the fallback toast's look and behaviour; the notify logic is Phase 06), Accessibility NFR (APG radio group, APG modal dialog, `aria-disabled` plus `aria-describedby` reasons on hover and focus, status never by colour alone, 1024×700 floor) | **Satisfies:** AC-1.5 (focus ring; the selected pill never uses the needs-review colour), the primitive half of AC-2.10 and AC-4.7 and AC-6.8 (a disabled choice stays focusable and explains itself on hover and focus; F47), the primitive half of AC-5.1 and AC-8.2 (glyph plus word status), the primitive half of AC-9.1 (520px APG modal: focus trap, Esc, focus returns to the opener; F48), the FR-1 fallback-toast Must (roles, 5 s auto-hide, stays on error, reduced motion)
**Depends on:** 00
**Files:**
- Create tokens and styles: `src/app/theme/tokens.css`, `src/components/primitives.css`, `src/app/theme/tokens.test.ts`.
- Create lib (pure, no React): `src/lib/classNames.ts`, `src/lib/svgPathData.ts`, `src/lib/ringGeometry.ts`, each with a colocated `*.test.ts`.
- Create components, one PascalCase file each with a colocated `*.test.tsx`: `src/components/Icon.tsx`, `Pill.tsx`, `PillGroup.tsx`, `DisabledReason.tsx`, `Button.tsx`, `StatusBadge.tsx`, `Ring.tsx`, `Tile.tsx`, `Modal.tsx`, `ToastStack.tsx`.
- Create non-component helpers (kept out of component files so `react-refresh/only-export-components` stays at zero warnings): `src/components/iconSvg.ts`, `src/components/useDisabledReason.tsx`, `src/components/usePrefersReducedMotion.ts`, `src/components/checkStatusBadge.ts`.
- Conditional, only if Step 0 shows it missing: `src/vite-env.d.ts` containing `/// <reference types="vite/client" />`.
- Edits no other file. No barrel `index.ts`; consumers import each file by path.

**Interfaces:**
- **Consumes** (Phase 00; nothing from phases 01–03 or 05):
  - `src/types/inspector.ts`: `CheckStatus` (`'configured' | 'needs-review' | 'reviewed' | 'not-scanned'`), type-only, used by `checkStatusBadge`.
  - Installed by Phase 00: `@fluentui/svg-icons` (files `icons/<name>_16_regular.svg`, each a single `<path d="…">`), the static TTFs `src/assets/fonts/JetBrainsMono-Regular.ttf` and `src/assets/fonts/JetBrainsMono-Bold.ttf`, React 19.2 or later (`useEffectEvent`, `useSyncExternalStore`), Vitest, jsdom and `@testing-library/react`. The `@/` alias and `vite/client` types come from the generator setup.
- **Produces** (exact names; phases 06, 18, 21, 22, 23 and 24 rely on them):
  - Theme contract: `src/app/theme/tokens.css`. Phase 06 imports it once from the entry and sets `document.documentElement.dataset.theme = 'light' | 'dark'`. With no attribute the light theme applies. Custom properties (both themes define all of them): `--window --window-bg --surface --tile --tile-glass --tile-blur --tile-shadow --code --border --control-border --text --text-2 --muted --primary --primary-text --on-primary --ok-tint --review --review-tint --server --server-tint --string --keyword --comment --ghost --tooltip-bg --tooltip-text --scrim --code-highlight`, plus `--font-ui` and `--font-mono` on `:root`. Global classes: `.ui-code-highlight` (10% primary over the code surface plus a 2px inset primary bar; Phase 21 applies it to highlighted lines) and `.ui-mono`. The `body` rule paints the window background and sets `min-width: 1024px; min-height: 700px`.
  - `src/components/primitives.css`: the component styles; every component file imports it.
  - `src/lib/classNames.ts`: `classNames(...parts: readonly (string | false | null | undefined)[]): string`.
  - `src/lib/svgPathData.ts`: `svgPathData(svg: string): readonly string[]`.
  - `src/lib/ringGeometry.ts`: `type RingState = 'done' | 'review' | 'not-scanned'`; `type RingArc = { readonly state: RingState; readonly startDeg: number; readonly endDeg: number }`; `RING_GAP_DEG = 4`; `RING_MAX_SEGMENTS = 30`; `ringArcs(segments: readonly RingState[]): readonly RingArc[]`; `arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string`.
  - `src/components/Icon.tsx`: `type IconProps = { name: IconName; size?: number; title?: string }`; `Icon(props: IconProps): ReactElement`. `IconName` (from `iconSvg.ts`) is one of `'add' | 'arrow-clockwise' | 'arrow-download' | 'arrow-export' | 'arrow-left' | 'arrow-right' | 'arrow-swap' | 'arrow-undo' | 'checkmark' | 'checkmark-circle' | 'chevron-down' | 'chevron-right' | 'code' | 'copy' | 'cube' | 'dismiss' | 'document' | 'error-circle' | 'important' | 'info' | 'open' | 'search' | 'subtract' | 'target' | 'warning'`. Without `title` the icon is `aria-hidden`; with `title` it is `role="img"` with that name.
  - `src/components/Pill.tsx`: `type PillTone = 'neutral' | 'selected' | 'ok' | 'review' | 'server'`; `type PillProps = ComponentProps<'span'> & { tone?: PillTone; compact?: boolean; mono?: boolean }`; `Pill(props: PillProps): ReactElement`. A static capsule: status pills, endpoint chips, the `Server` tag.
  - `src/components/PillGroup.tsx`: `type PillOption<V extends string> = { value: V; label: string; disabledReason?: string | null }`; `type PillGroupProps<V extends string> = { label: string; options: readonly PillOption<V>[]; value: V | null; onChange: (value: V) => void; compact?: boolean }`; `PillGroup<V extends string>(props: PillGroupProps<V>): ReactElement`. APG radio group. A non-empty `disabledReason` makes the option `aria-disabled="true"`, still focusable, never calls `onChange`, and exposes the reason through `aria-describedby` on hover and focus. The caller decides which options are disabled and why (HTTP methods, client language, and so on).
  - `src/components/DisabledReason.tsx`: `type DisabledReasonProps = { id: string; text: string; visible: boolean }`; `DisabledReason(props: DisabledReasonProps): ReactElement` (the `role="tooltip"` element).
  - `src/components/useDisabledReason.tsx`: `normalizeReason(reason: string | null | undefined): string | null` (empty string and `undefined` become `null`); `type ReasonTriggerProps`; `useDisabledReason(reason: string | null): { triggerProps: ReasonTriggerProps; tooltip: ReactElement | null }`. Spread `triggerProps` on the focusable trigger and render `tooltip` next to it inside an element with class `ui-reason-anchor`.
  - `src/components/Button.tsx`: `type ButtonProps = Omit<ComponentProps<'button'>, 'disabled' | 'onMouseEnter' | 'onMouseLeave' | 'onFocus' | 'onBlur' | 'onKeyDown'> & { variant?: 'primary' | 'ghost'; disabledReason?: string | null; busy?: boolean; fullWidth?: boolean }`; `Button(props: ButtonProps): ReactElement`. A `disabledReason` blocks the click, sets `aria-disabled`, keeps focus and shows the reason (AC-6.8 Insert). `busy` sets the native `disabled` and `aria-busy` while the button's own action runs (F49). `type` defaults to `'button'`; `variant` defaults to `'ghost'`.
  - `src/components/StatusBadge.tsx`: `type BadgeKind = 'ok' | 'review' | 'unknown'`; `type StatusBadgeProps = { kind: BadgeKind; label: string }`; `StatusBadge(props: StatusBadgeProps): ReactElement` (Fluent glyph plus word: `checkmark` for `ok`, `important` for `review`, `subtract` for `unknown`; the glyph element carries `data-glyph={kind}`).
  - `src/components/checkStatusBadge.ts`: `checkStatusBadge(status: CheckStatus): StatusBadgeProps` (`configured` → ok "Configured", `reviewed` → ok "Reviewed", `needs-review` → review "Needs review", `not-scanned` → unknown "Not scanned").
  - `src/components/Ring.tsx`: `type RingProps = { segments: readonly RingState[]; label: string; size?: number }` (`size` defaults to 78); `Ring(props: RingProps): ReactElement`. Always renders the text count `done/total` and `label`; the wrapper is `role="img"` named "`<done>` of `<total>` `<label>`". A caller maps Configured and Reviewed to `'done'`.
  - `src/components/Tile.tsx`: `type TileProps = ComponentProps<'div'> & { heading?: string; aside?: ReactNode; flush?: boolean }`; `Tile(props: TileProps): ReactElement`. With `heading` the tile is a `role="region"` named by the uppercase caption, and `aside` sits at the right of that caption row. `flush` removes padding (code panes).
  - `src/components/Modal.tsx`: `type ModalProps = { open: boolean; title: string; onClose: () => void; width?: number; footer?: ReactNode; children: ReactNode }` (`width` defaults to 520); `Modal(props: ModalProps): ReactElement | null`. Renders into `document.body`. Initial focus goes to the first focusable control other than the header Close button. Scrim clicks do not close it.
  - `src/components/ToastStack.tsx`: `type ToastType = 'success' | 'info' | 'warning' | 'error'` (structurally equal to `NoticeType`); `type ToastItem = { id: string; title: string; body: string; type: ToastType }`; `type ToastStackProps = { toasts: readonly ToastItem[]; onClose: (id: string) => void }`; `ToastStack(props: ToastStackProps): ReactElement`. Presentational: it never creates, queues or de-duplicates toasts. It owns only each toast's own timers: success and info call `onClose` after 5 s, error and warning never do, and every toast has a Close button.

This phase builds the theme and the shared building blocks every UI phase composes: the two token sets, the dark aurora and glass, the focus ring, the code-highlight rule, and ten small components with their keyboard and ARIA behaviour proven by tests. Nothing here touches a host API or a feature.

## Decisions (recorded so later phases do not re-argue them)

1. **Dark tile = `#15203a` plus the 7% white glass layer, not a see-through tile.** The spec lists tile `#15203a` with glass `rgba(255,255,255,.07)` and `blur(14px)`; the design reference paints a solid `#15203a`. A literal 7% white over the aurora alone measures about 3.3:1 for muted text at the aurora's brightest point (computed while writing this plan), which would fail the glass gate. So `.ui-tile` paints `linear-gradient(var(--tile-glass), var(--tile-glass)), var(--tile)` and keeps `backdrop-filter: var(--tile-blur)` for fidelity. Text on that surface measures at least 6.0:1 in dark. Flipping to a see-through tile later is one token change (`--tile`), and the manual glass gate at UI acceptance stays.
2. **Disabled choices keep a visible dashed outline and muted text**, not only lower opacity, so the state is not conveyed by colour alone. The reason element is always in the DOM while the option is disabled (so `aria-describedby` resolves) and is visually hidden until hover or focus. Esc dismisses it.
3. **Not-scanned ring arcs use `--muted`**; the spec gives no colour for them. The count text still carries the information.
4. **Warning toasts behave like error toasts** (`role="alert"`, no auto-hide). The spec names only success, info and error.
5. **The modal listens for keys on `document`**, not on the dialog element, so Esc and the Tab trap still work after a click on the scrim moved focus to `body`.
6. **Native `<dialog>` is not used.** It would be less code, but jsdom has no `showModal`, so the focus trap, Esc and focus return could not be tested.
7. **Icons are rendered from the package's SVG path data** (`?raw` import, then `svgPathData`), not with `dangerouslySetInnerHTML`.
8. **A small `Button` exists** although the brief did not list it: Copy, Download, Insert, Export and the Inspector actions all need the same capsule, the `busy` rule (F49) and the `aria-disabled` reason (AC-6.8). Writing it once here avoids five copies.

---

- [ ] **Step 0: Preflight**

  Run from the repo root:

  ```bash
  git status --short
  ls src/assets/fonts | grep -i JetBrainsMono
  ls node_modules/@fluentui/svg-icons/icons/checkmark_16_regular.svg
  node -e "const r=require('react');console.log(r.version, typeof r.useEffectEvent, typeof r.useSyncExternalStore)"
  npm ls @testing-library/react jsdom vitest
  grep -rn "vite/client" src tsconfig*.json
  grep -n "@/\*" tsconfig*.json
  grep -rn "alias" vite.config.ts vitest.config.ts
  grep -n "CheckStatus" src/types/inspector.ts
  ```

  Expect: a clean tree apart from `docs/`; `JetBrainsMono-Regular.ttf` and `JetBrainsMono-Bold.ttf` listed; the checkmark SVG found; `19.2.x function function`; the three packages listed; at least one `vite/client` hit; the `@/*` path and the Vite alias printed; `CheckStatus` exported. Then handle each gap and nothing else:
  - If neither `src/vite-env.d.ts` nor a tsconfig `types` entry references `vite/client`, create `src/vite-env.d.ts` with the single line `/// <reference types="vite/client" />`.
  - If Phase 00 stored the fonts under another folder or names, change only the two `url(...)` lines in `tokens.css` in Step 3. `tokens.test.ts` checks that every referenced font file exists, so a wrong path fails there.
  - If `useEffectEvent` is `undefined` (React older than 19.2), stop and report it; the react rule and this phase both depend on it.
  - Tests in this phase use only `@testing-library/react` (`fireEvent`, `render`, `screen`, `within`, `act`, `cleanup`) and plain DOM assertions. They do not need `user-event` or `jest-dom`, and each file declares its own `// @vitest-environment` and calls `cleanup` itself, so they pass whatever Phase 00's Vitest setup file does.

- [ ] **Step 1: Write the pure lib tests (classNames, svgPathData, ringGeometry)**

  ```ts file=src/lib/classNames.test.ts
  import { describe, expect, it } from 'vitest';
  import { classNames } from './classNames';

  describe('classNames', () => {
    it('joins the truthy strings and drops every other part', () => {
      expect(classNames('a', false, undefined, null, '', 'b')).toBe('a b');
    });

    it('returns an empty string when nothing is left', () => {
      expect(classNames(false, undefined)).toBe('');
    });
  });
  ```

  ```ts file=src/lib/svgPathData.test.ts
  import { describe, expect, it } from 'vitest';
  import { svgPathData } from './svgPathData';

  const CHECKMARK =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M13.86 3.66a.5.5 0 0 1-.02.7l-7.93 7.48z"/></svg>';

  describe('svgPathData', () => {
    it('returns the d attribute of a single-path Fluent icon', () => {
      expect(svgPathData(CHECKMARK)).toEqual(['M13.86 3.66a.5.5 0 0 1-.02.7l-7.93 7.48z']);
    });

    it('returns every path in document order', () => {
      expect(svgPathData('<svg><path d="M0 0"/><path fill="none" d="M1 1h2"/></svg>')).toEqual([
        'M0 0',
        'M1 1h2',
      ]);
    });

    it('returns nothing when there is no path or the d attribute is empty', () => {
      expect(svgPathData('<svg><circle r="1"/></svg>')).toEqual([]);
      expect(svgPathData('<svg><path d=""/></svg>')).toEqual([]);
    });
  });
  ```

  ```ts file=src/lib/ringGeometry.test.ts
  import { describe, expect, it } from 'vitest';
  import { RING_GAP_DEG, RING_MAX_SEGMENTS, arcPath, ringArcs } from './ringGeometry';
  import type { RingState } from './ringGeometry';

  const many = (n: number, state: RingState): RingState[] => Array.from({ length: n }, () => state);
  const sweep = (a: { startDeg: number; endDeg: number }): number => a.endDeg - a.startDeg;

  describe('ringArcs, one arc per check up to 30', () => {
    it('draws nothing for no segments', () => {
      expect(ringArcs([])).toEqual([]);
    });

    it('draws a single segment as a full circle with no gap', () => {
      expect(ringArcs(['review'])).toEqual([{ state: 'review', startDeg: 0, endDeg: 360 }]);
    });

    it('splits three segments into 116 degree arcs separated by 4 degree gaps', () => {
      expect(ringArcs(['done', 'done', 'review'])).toEqual([
        { state: 'done', startDeg: 0, endDeg: 116 },
        { state: 'done', startDeg: 120, endDeg: 236 },
        { state: 'review', startDeg: 240, endDeg: 356 },
      ]);
    });

    it('puts a 4 degree gap between every pair of arcs, including the wrap back to 0', () => {
      for (const n of [2, 5, 12, 30]) {
        const arcs = ringArcs(many(n, 'done'));
        expect(arcs).toHaveLength(n);
        arcs.forEach((arc, i) => {
          const next = arcs[i + 1]?.startDeg ?? 360;
          expect(next - arc.endDeg).toBeCloseTo(RING_GAP_DEG, 9);
        });
      }
    });

    it('still draws one arc per check at the 30 check limit (8 degrees each)', () => {
      const arcs = ringArcs(many(RING_MAX_SEGMENTS, 'done'));
      expect(arcs).toHaveLength(30);
      expect(sweep(arcs[0] ?? { startDeg: 0, endDeg: 0 })).toBeCloseTo(8, 9);
    });

    it('keeps each segment in its position with its own state', () => {
      const states: RingState[] = ['done', 'not-scanned', 'review', 'done'];
      expect(ringArcs(states).map((a) => a.state)).toEqual(states);
    });
  });

  describe('ringArcs, proportional mode above 30', () => {
    it('switches to three arcs at 31 segments, sized by count, in done-review-not-scanned order', () => {
      const arcs = ringArcs([...many(20, 'done'), ...many(10, 'review'), 'not-scanned']);
      expect(arcs.map((a) => a.state)).toEqual(['done', 'review', 'not-scanned']);
      expect(sweep(arcs[0] ?? { startDeg: 0, endDeg: 0 })).toBeCloseTo((348 * 20) / 31, 6);
      expect(sweep(arcs[1] ?? { startDeg: 0, endDeg: 0 })).toBeCloseTo((348 * 10) / 31, 6);
      expect(sweep(arcs[2] ?? { startDeg: 0, endDeg: 0 })).toBeCloseTo(348 / 31, 6);
      const total = arcs.reduce((sum, a) => sum + sweep(a), 0);
      expect(total + arcs.length * RING_GAP_DEG).toBeCloseTo(360, 6);
    });

    it('omits empty arcs and puts gaps only between the arcs drawn', () => {
      const arcs = ringArcs([...many(35, 'done'), ...many(5, 'review')]);
      expect(arcs).toEqual([
        { state: 'done', startDeg: 0, endDeg: 308 },
        { state: 'review', startDeg: 312, endDeg: 356 },
      ]);
    });

    it('draws one gapless full circle when only one state is present', () => {
      expect(ringArcs(many(31, 'done'))).toEqual([{ state: 'done', startDeg: 0, endDeg: 360 }]);
    });

    it('never draws more than three arcs', () => {
      expect(ringArcs([...many(40, 'done'), ...many(40, 'review'), ...many(40, 'not-scanned')])).toHaveLength(3);
    });
  });

  describe('arcPath', () => {
    it('draws a quarter circle clockwise from 12 o clock', () => {
      expect(arcPath(50, 50, 40, 0, 90)).toBe('M 50 10 A 40 40 0 0 1 90 50');
    });

    it('sets the large-arc flag above 180 degrees', () => {
      expect(arcPath(50, 50, 40, 0, 270)).toBe('M 50 10 A 40 40 0 1 1 10 50');
    });

    it('draws a full circle as two half arcs, because one 360 degree arc has no direction', () => {
      expect(arcPath(50, 50, 40, 0, 360)).toBe('M 50 10 A 40 40 0 0 1 50 90 A 40 40 0 0 1 50 10');
    });
  });
  ```

- [ ] **Step 2: Run the lib tests, expect FAIL**

  ```bash
  npx vitest run src/lib/classNames.test.ts src/lib/svgPathData.test.ts src/lib/ringGeometry.test.ts
  ```

  Expect: FAIL, three suites, each with `Failed to resolve import "./classNames"` (and the other two modules).

- [ ] **Step 3: Implement the lib files**

  ```ts file=src/lib/classNames.ts
  export function classNames(...parts: readonly (string | false | null | undefined)[]): string {
    return parts.filter((part): part is string => typeof part === 'string' && part !== '').join(' ');
  }
  ```

  ```ts file=src/lib/svgPathData.ts
  // Fluent System Icons ship as one or more <path d="..."/> in a 16x16 box, filled with currentColor.
  const PATH_D = /<path\b[^>]*?\sd="([^"]*)"/g;

  export function svgPathData(svg: string): readonly string[] {
    return Array.from(svg.matchAll(PATH_D), (match) => match[1] ?? '').filter((d) => d !== '');
  }
  ```

  ```ts file=src/lib/ringGeometry.ts
  export type RingState = 'done' | 'review' | 'not-scanned';
  export type RingArc = { readonly state: RingState; readonly startDeg: number; readonly endDeg: number };

  export const RING_GAP_DEG = 4;
  export const RING_MAX_SEGMENTS = 30;

  const STATE_ORDER = ['done', 'review', 'not-scanned'] as const satisfies readonly RingState[];

  type Part = { readonly state: RingState; readonly weight: number };

  // Angles are degrees clockwise from 12 o'clock. k arcs leave k gaps of RING_GAP_DEG (one after each arc,
  // the last one wrapping to 0). One arc is a full circle: with nothing else drawn there is nothing to gap.
  function layout(parts: readonly Part[]): readonly RingArc[] {
    if (parts.length === 0) return [];
    const only = parts[0];
    if (parts.length === 1 && only !== undefined) return [{ state: only.state, startDeg: 0, endDeg: 360 }];
    const usable = 360 - parts.length * RING_GAP_DEG;
    const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
    let cursor = 0;
    return parts.map((part) => {
      const startDeg = cursor;
      const endDeg = startDeg + (usable * part.weight) / totalWeight;
      cursor = endDeg + RING_GAP_DEG;
      return { state: part.state, startDeg, endDeg };
    });
  }

  // One arc per check up to RING_MAX_SEGMENTS; above that, at most three arcs sized by count (FR-11).
  export function ringArcs(segments: readonly RingState[]): readonly RingArc[] {
    if (segments.length <= RING_MAX_SEGMENTS) {
      return layout(segments.map((state) => ({ state, weight: 1 })));
    }
    return layout(
      STATE_ORDER.map((state) => ({ state, weight: segments.filter((s) => s === state).length })).filter(
        (part) => part.weight > 0,
      ),
    );
  }

  const fmt = (value: number): string => String(Number(value.toFixed(3)));

  function point(cx: number, cy: number, r: number, deg: number): string {
    const rad = (deg * Math.PI) / 180;
    return `${fmt(cx + r * Math.sin(rad))} ${fmt(cy - r * Math.cos(rad))}`;
  }

  export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    const radius = fmt(r);
    if (endDeg - startDeg >= 359.999) {
      const mid = point(cx, cy, r, startDeg + 180);
      const start = point(cx, cy, r, startDeg);
      return `M ${start} A ${radius} ${radius} 0 0 1 ${mid} A ${radius} ${radius} 0 0 1 ${start}`;
    }
    const large = endDeg - startDeg > 180 ? '1' : '0';
    return `M ${point(cx, cy, r, startDeg)} A ${radius} ${radius} 0 ${large} 1 ${point(cx, cy, r, endDeg)}`;
  }
  ```

- [ ] **Step 4: Run the lib tests, expect PASS**

  ```bash
  npx vitest run src/lib/classNames.test.ts src/lib/svgPathData.test.ts src/lib/ringGeometry.test.ts
  ```

  Expect: PASS, 3 files, 18 tests.

- [ ] **Step 5: Commit the lib files**

  ```bash
  npx prettier --write src/lib/classNames.ts src/lib/classNames.test.ts src/lib/svgPathData.ts src/lib/svgPathData.test.ts src/lib/ringGeometry.ts src/lib/ringGeometry.test.ts
  npx eslint src/lib --max-warnings=0
  git add src/lib/classNames.ts src/lib/classNames.test.ts src/lib/svgPathData.ts src/lib/svgPathData.test.ts src/lib/ringGeometry.ts src/lib/ringGeometry.test.ts
  git commit -m "feat(ui): add ring arc geometry, svg path and class name helpers"
  ```

- [ ] **Step 6: Write the token test**

  It reads the CSS files as text, checks both themes against FR-11's table, the focus ring, the highlight rule, glass, no external URLs, that every referenced font file exists, and that every foreground and background pair the design uses reaches 4.5:1.

  ```ts file=src/app/theme/tokens.test.ts
  // @vitest-environment node
  import { existsSync, readFileSync } from 'node:fs';
  import { describe, expect, it } from 'vitest';

  const TOKENS_URL = new URL('./tokens.css', import.meta.url);
  const tokens = readFileSync(TOKENS_URL, 'utf8');
  const primitives = readFileSync(new URL('../../components/primitives.css', import.meta.url), 'utf8');

  type Theme = 'light' | 'dark';

  function themeTokens(theme: Theme): Map<string, string> {
    const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(tokens)?.[1] ?? '';
    const map = new Map<string, string>();
    for (const decl of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      const name = decl[1];
      const value = decl[2];
      if (name !== undefined && value !== undefined) map.set(name, value.replace(/\s+/g, ' ').trim());
    }
    return map;
  }

  function rule(css: string, selector: string): string {
    const escaped = selector.replace(/[.[\]()]/g, '\\$&');
    return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  }

  const light = themeTokens('light');
  const dark = themeTokens('dark');

  // FR-11 token table, exactly. [name, light, dark]
  const SPEC_TOKENS: [string, string, string][] = [
    ['window', '#e8e8e4', '#081022'],
    ['surface', '#f2f2ef', 'transparent'],
    ['tile', '#ffffff', '#15203a'],
    ['code', '#f7f7f5', '#0b1328'],
    ['border', '#dcdcd6', 'rgba(255, 255, 255, 0.18)'],
    ['control-border', '#dcdcd6', '#3a4766'],
    ['text', '#111111', '#eef4ff'],
    ['text-2', '#33332f', '#d3def2'],
    ['muted', '#5f5f59', '#a9bbdc'],
    ['primary', '#111111', '#5aa9ff'],
    ['primary-text', '#111111', '#8fc6ff'],
    ['review', '#c0261d', '#ffa24a'],
    ['server', '#4d6a1f', '#c4a7ff'],
    ['string', '#4d6a1f', '#a9d3ff'],
    ['keyword', '#b0231b', '#ffb874'],
    ['comment', '#5f5f59', '#9fb0cd'],
    ['tile-glass', 'transparent', 'rgba(255, 255, 255, 0.07)'],
    ['tile-blur', 'none', 'blur(14px)'],
  ];

  // Design reference values for the pill, button, tooltip and scrim surfaces.
  const DESIGN_TOKENS: [string, string, string][] = [
    ['on-primary', '#ffffff', '#06122b'],
    ['ok-tint', '#d9d9d9', '#20365a'],
    ['review-tint', '#f6dedd', '#38343c'],
    ['server-tint', '#e6eae0', '#2e3356'],
    ['ghost', '#f2f2ef', '#1d2a4a'],
  ];

  describe('theme tokens (FR-11)', () => {
    it.each(SPEC_TOKENS)('--%s is %s in light and %s in dark', (name, lightValue, darkValue) => {
      expect(light.get(name)).toBe(lightValue);
      expect(dark.get(name)).toBe(darkValue);
    });

    it.each(DESIGN_TOKENS)('--%s matches the design reference', (name, lightValue, darkValue) => {
      expect(light.get(name)).toBe(lightValue);
      expect(dark.get(name)).toBe(darkValue);
    });

    it('defines every remaining token in both themes', () => {
      for (const name of ['window-bg', 'tile-shadow', 'tooltip-bg', 'tooltip-text', 'scrim', 'code-highlight']) {
        expect(light.get(name), `light --${name}`).toBeTruthy();
        expect(dark.get(name), `dark --${name}`).toBeTruthy();
      }
    });

    it('paints the dark window with the blue and orange aurora over #081022', () => {
      const bg = dark.get('window-bg') ?? '';
      expect(bg).toContain('radial-gradient(45% 40% at 8% 5%, rgba(90, 169, 255, 0.45)');
      expect(bg).toContain('radial-gradient(40% 45% at 95% 95%, rgba(255, 162, 74, 0.38)');
      expect(bg).toContain('var(--window)');
      expect(light.get('window-bg')).toBe('var(--window)');
    });

    it('uses the system UI stack and the bundled JetBrains Mono', () => {
      expect(tokens).toContain('--font-ui: "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;');
      expect(tokens).toContain('--font-mono: "JetBrains Mono"');
    });

    it('highlights code as 10% primary over the code surface plus a 2px inset primary bar', () => {
      const expected = 'color-mix(in srgb, var(--primary) 10%, var(--code))';
      expect(light.get('code-highlight')).toBe(expected);
      expect(dark.get('code-highlight')).toBe(expected);
      const highlight = rule(tokens, '.ui-code-highlight');
      expect(highlight).toContain('background: var(--code-highlight)');
      expect(highlight).toContain('box-shadow: inset 2px 0 0 var(--primary)');
    });
  });

  describe('focus ring and selection (AC-1.5)', () => {
    it('draws a 2px primary outline at a 2px offset on keyboard focus', () => {
      const focus = rule(tokens, ':focus-visible');
      expect(focus).toContain('outline: 2px solid var(--primary)');
      expect(focus).toContain('outline-offset: 2px');
    });

    it('never colours the selected pill with the needs-review colour', () => {
      expect(rule(primitives, '.ui-pill--selected')).not.toContain('review');
    });
  });

  describe('glass, window and assets', () => {
    it('blurs the dark tile backdrop by 14px through the token', () => {
      expect(rule(primitives, '.ui-tile')).toContain('backdrop-filter: var(--tile-blur)');
      expect(dark.get('tile-blur')).toBe('blur(14px)');
    });

    it('keeps the 1024x700 floor on the body', () => {
      const body = rule(tokens, 'body');
      expect(body).toContain('min-width: 1024px');
      expect(body).toContain('min-height: 700px');
    });

    it('loads nothing from another origin', () => {
      expect(tokens + primitives).not.toMatch(/https?:\/\//);
    });

    it('references only font files that exist', () => {
      const urls = Array.from(tokens.matchAll(/url\("([^"]+\.ttf)"\)/g), (m) => m[1] ?? '');
      expect(urls.length).toBeGreaterThanOrEqual(2);
      for (const url of urls) {
        expect(existsSync(new URL(url, TOKENS_URL)), url).toBe(true);
      }
    });
  });

  // WCAG 2.2 AA (4.5:1) for every text pair the design uses.
  type Rgb = readonly [number, number, number];

  function rgb(hex: string): Rgb {
    const n = (i: number): number => parseInt(hex.slice(i, i + 2), 16);
    return [n(1), n(3), n(5)];
  }

  function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
    const mix = (i: 0 | 1 | 2): number => top[i] * alpha + bottom[i] * (1 - alpha);
    return [mix(0), mix(1), mix(2)];
  }

  function luminance(c: Rgb): number {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  }

  function contrast(a: Rgb, b: Rgb): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
  }

  function surface(map: Map<string, string>, name: string): Rgb {
    return rgb(map.get(name) ?? '#000000');
  }

  function tileSurface(map: Map<string, string>): Rgb {
    const tile = surface(map, 'tile');
    const glass = /^rgba\(255, 255, 255, ([0-9.]+)\)$/.exec(map.get('tile-glass') ?? '');
    return glass?.[1] === undefined ? tile : over([255, 255, 255], Number(glass[1]), tile);
  }

  const THEMES: [string, Map<string, string>][] = [
    ['light', light],
    ['dark', dark],
  ];

  describe.each(THEMES)('contrast in %s', (_name, map) => {
    const texts = ['text', 'text-2', 'muted', 'primary-text', 'review', 'server', 'string', 'keyword', 'comment'];

    it.each(texts)('--%s reaches 4.5:1 on the tile and on the code surface', (token) => {
      const fg = surface(map, token);
      expect(contrast(fg, tileSurface(map))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(fg, surface(map, 'code'))).toBeGreaterThanOrEqual(4.5);
    });

    it.each([
      ['primary-text', 'ok-tint'],
      ['review', 'review-tint'],
      ['server', 'server-tint'],
      ['on-primary', 'primary'],
      ['text', 'ghost'],
      ['tooltip-text', 'tooltip-bg'],
    ])('--%s on --%s reaches 4.5:1', (fgToken, bgToken) => {
      expect(contrast(surface(map, fgToken), surface(map, bgToken))).toBeGreaterThanOrEqual(4.5);
    });
  });
  ```

  The pair list covers the pill tones, the selected pill, the ghost button and the tooltip.

- [ ] **Step 7: Run the token test, expect FAIL**

  ```bash
  npx vitest run src/app/theme/tokens.test.ts
  ```

  Expect: FAIL with `ENOENT … tokens.css` at module load (the file does not exist yet).

- [ ] **Step 8: Write `tokens.css`**

  ```css file=src/app/theme/tokens.css
  /*
   * Design tokens from layout 10a section 4 (spec FR-11). Phase 06 imports this file once from the
   * entry point and sets data-theme="light" or "dark" on the html element. Without the attribute the
   * light theme applies, which is also the launch default when the host cannot answer (AC-1.6).
   */

  @font-face {
    font-family: "JetBrains Mono";
    src: url("../../assets/fonts/JetBrainsMono-Regular.ttf") format("truetype");
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: "JetBrains Mono";
    src: url("../../assets/fonts/JetBrainsMono-Bold.ttf") format("truetype");
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }

  :root {
    --font-ui: "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
    --font-mono: "JetBrains Mono", ui-monospace, monospace;
  }

  /* Light: 11c Paper & Signal. */
  :root,
  [data-theme="light"] {
    color-scheme: light;
    --window: #e8e8e4;
    --window-bg: var(--window);
    --surface: #f2f2ef;
    --tile: #ffffff;
    --tile-glass: transparent;
    --tile-blur: none;
    --tile-shadow: none;
    --code: #f7f7f5;
    --border: #dcdcd6;
    --control-border: #dcdcd6;
    --text: #111111;
    --text-2: #33332f;
    --muted: #5f5f59;
    --primary: #111111;
    --primary-text: #111111;
    --on-primary: #ffffff;
    --ok-tint: #d9d9d9;
    --review: #c0261d;
    --review-tint: #f6dedd;
    --server: #4d6a1f;
    --server-tint: #e6eae0;
    --string: #4d6a1f;
    --keyword: #b0231b;
    --comment: #5f5f59;
    --ghost: #f2f2ef;
    --tooltip-bg: #111111;
    --tooltip-text: #ffffff;
    --scrim: rgba(17, 17, 17, 0.45);
    --code-highlight: color-mix(in srgb, var(--primary) 10%, var(--code));
  }

  /* Dark: 12e Glass Bento. Must stay after the light block: both match the html element. */
  [data-theme="dark"] {
    color-scheme: dark;
    --window: #081022;
    --window-bg:
      radial-gradient(45% 40% at 8% 5%, rgba(90, 169, 255, 0.45), transparent 70%),
      radial-gradient(40% 45% at 95% 95%, rgba(255, 162, 74, 0.38), transparent 70%),
      radial-gradient(40% 40% at 70% 10%, rgba(60, 90, 200, 0.4), transparent 70%), var(--window);
    --surface: transparent;
    --tile: #15203a;
    --tile-glass: rgba(255, 255, 255, 0.07);
    --tile-blur: blur(14px);
    --tile-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 10px 30px rgba(0, 0, 0, 0.25);
    --code: #0b1328;
    --border: rgba(255, 255, 255, 0.18);
    --control-border: #3a4766;
    --text: #eef4ff;
    --text-2: #d3def2;
    --muted: #a9bbdc;
    --primary: #5aa9ff;
    --primary-text: #8fc6ff;
    --on-primary: #06122b;
    --ok-tint: #20365a;
    --review: #ffa24a;
    --review-tint: #38343c;
    --server: #c4a7ff;
    --server-tint: #2e3356;
    --string: #a9d3ff;
    --keyword: #ffb874;
    --comment: #9fb0cd;
    --ghost: #1d2a4a;
    --tooltip-bg: #eef4ff;
    --tooltip-text: #081022;
    --scrim: rgba(3, 8, 20, 0.62);
    --code-highlight: color-mix(in srgb, var(--primary) 10%, var(--code));
  }

  body {
    margin: 0;
    min-width: 1024px;
    min-height: 700px;
    background: var(--window-bg);
    color: var(--text);
    font-family: var(--font-ui);
  }

  [data-theme="dark"] body {
    background-attachment: fixed;
  }

  /* AC-1.5: every focusable control, pills included. */
  :focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .ui-mono {
    font-family: var(--font-mono);
  }

  /* Highlighted code lines: 10% primary over the code surface plus a 2px inset primary bar (FR-11). */
  .ui-code-highlight {
    background: var(--code-highlight);
    box-shadow: inset 2px 0 0 var(--primary);
  }
  ```

- [ ] **Step 9: Write `primitives.css`**

  ```css file=src/components/primitives.css
  /* Styles for the shared primitives. Colours come only from the theme tokens in app/theme/tokens.css. */

  .ui-icon {
    flex: none;
  }

  /* Tile */
  .ui-tile {
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-sizing: border-box;
    min-width: 0;
    min-height: 0;
    padding: 14px 16px;
    overflow: hidden;
    background:
      linear-gradient(var(--tile-glass), var(--tile-glass)),
      var(--tile);
    backdrop-filter: var(--tile-blur);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--tile-shadow);
    color: var(--text);
  }

  .ui-tile--flush {
    gap: 0;
    padding: 0;
  }

  .ui-tile__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .ui-tile__label {
    color: var(--muted);
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* Pill */
  .ui-pill {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    background: transparent;
    border: 1px solid var(--control-border);
    border-radius: 99px;
    color: var(--text-2);
    font-family: inherit;
    font-size: 11.5px;
    line-height: 1.3;
    white-space: nowrap;
  }

  .ui-pill--compact {
    padding: 1px 9px;
    font-size: 10.5px;
  }

  .ui-pill--mono {
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .ui-pill--selected {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
    font-weight: 700;
  }

  .ui-pill--ok {
    background: var(--ok-tint);
    border-color: var(--primary);
    color: var(--primary-text);
  }

  .ui-pill--review {
    background: var(--review-tint);
    border-color: var(--review);
    color: var(--review);
    font-weight: 700;
  }

  .ui-pill--server {
    background: var(--server-tint);
    border-color: var(--server);
    color: var(--server);
  }

  .ui-pill--control {
    cursor: pointer;
  }

  /* A blocked choice: dashed outline and muted text, so the state is not colour alone. */
  .ui-pill[aria-disabled="true"] {
    border-style: dashed;
    color: var(--muted);
    cursor: not-allowed;
  }

  .ui-pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .ui-badge__glyph {
    display: inline-flex;
  }

  /* Disabled reason tooltip: always in the DOM for aria-describedby, shown on hover and focus. */
  .ui-reason-anchor {
    position: relative;
    display: inline-flex;
  }

  .ui-reason-anchor--block {
    display: flex;
  }

  .ui-reason {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 50;
    width: max-content;
    max-width: 280px;
    padding: 6px 10px;
    background: var(--tooltip-bg);
    border-radius: 6px;
    color: var(--tooltip-text);
    font-size: 11.5px;
    line-height: 1.4;
    pointer-events: none;
    visibility: hidden;
    white-space: normal;
  }

  .ui-reason[data-visible="true"] {
    visibility: visible;
  }

  /* Button */
  .ui-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    border-radius: 99px;
    cursor: pointer;
  }

  .ui-button--ghost {
    padding: 4px 12px;
    background: var(--ghost);
    border: 1px solid var(--control-border);
    color: var(--text);
    font-size: 12px;
    white-space: nowrap;
  }

  .ui-button--primary {
    justify-content: space-between;
    padding: 12px 20px;
    background: var(--primary);
    border: 1px solid var(--primary);
    color: var(--on-primary);
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }

  .ui-button--block {
    width: 100%;
  }

  .ui-button[aria-disabled="true"],
  .ui-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .ui-icon-button {
    display: inline-flex;
    padding: 4px;
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: inherit;
    cursor: pointer;
  }

  /* Ring */
  .ui-ring {
    position: relative;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
  }

  .ui-ring svg {
    position: absolute;
    inset: 0;
  }

  .ui-ring__arc {
    fill: none;
  }

  .ui-ring__arc--done {
    stroke: var(--primary);
  }

  .ui-ring__arc--review {
    stroke: var(--review);
  }

  .ui-ring__arc--not-scanned {
    opacity: 0.5;
    stroke: var(--muted);
  }

  .ui-ring__text {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: var(--text);
    line-height: 1;
  }

  .ui-ring__count {
    font-weight: 700;
  }

  .ui-ring__label {
    margin-top: 4px;
    color: var(--muted);
  }

  /* Modal */
  .ui-scrim {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: var(--scrim);
  }

  .ui-modal {
    display: flex;
    flex-direction: column;
    max-width: 100%;
    max-height: 100%;
    background: var(--tile);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    color: var(--text);
  }

  .ui-modal__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }

  .ui-modal__title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }

  .ui-modal__body {
    padding: 16px;
    overflow: auto;
  }

  .ui-modal__foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
  }

  /* Fallback toast stack (FR-1), Bootstrap-style. */
  .ui-toast-stack {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(340px, calc(100vw - 32px));
    pointer-events: none;
  }

  .ui-toast {
    background: var(--tile);
    border: 1px solid var(--border);
    border-left-width: 4px;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    color: var(--text);
    font-size: 12.5px;
    pointer-events: auto;
  }

  .ui-toast--success {
    border-left-color: var(--primary);
  }

  .ui-toast--info {
    border-left-color: var(--muted);
  }

  .ui-toast--warning,
  .ui-toast--error {
    border-left-color: var(--review);
  }

  .ui-toast__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px 4px 12px;
  }

  .ui-toast__title {
    flex: 1;
    min-width: 0;
  }

  .ui-toast__body {
    padding: 0 12px 10px;
    color: var(--text-2);
    overflow-wrap: anywhere;
  }

  .ui-toast--fade {
    animation: ui-toast-in 150ms ease-out;
    transition: opacity 150ms ease-out;
  }

  .ui-toast--leaving {
    opacity: 0;
  }

  @keyframes ui-toast-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ui-toast {
      animation: none;
      transition: none;
    }
  }

  /* Dark tiles fall back to the opaque tile colour where backdrop-filter is missing. */
  @supports not (backdrop-filter: blur(1px)) {
    [data-theme="dark"] .ui-tile {
      background: var(--tile);
    }
  }
  ```

- [ ] **Step 10: Run the token test, expect PASS**

  ```bash
  npx prettier --write src/app/theme/tokens.css src/components/primitives.css src/app/theme/tokens.test.ts
  npx vitest run src/app/theme/tokens.test.ts
  ```

  Expect: PASS, 63 tests (18 spec tokens, 5 design tokens, 4 token-structure checks, 2 focus checks, 4 glass, window and asset checks, and 15 contrast pairs in each of the two themes). If prettier changed the value spelling of a token (for example spacing inside `rgba(...)`), fix the expected string in the test to match prettier's output, not the other way round. If the font test fails, apply the Step 0 font-path rule.

- [ ] **Step 11: Commit the theme**

  ```bash
  npx eslint src/app/theme --max-warnings=0
  git add src/app/theme/tokens.css src/app/theme/tokens.test.ts src/components/primitives.css
  git commit -m "feat(ui): add light and dark design tokens, aurora, glass and focus ring"
  ```

- [ ] **Step 12: Write the Icon test**

  ```tsx file=src/components/Icon.test.tsx
  // @vitest-environment jsdom
  import { cleanup, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it } from 'vitest';
  import { svgPathData } from '@/lib/svgPathData';
  import { Icon } from './Icon';
  import { ICON_SVG } from './iconSvg';
  import type { IconName } from './iconSvg';

  afterEach(cleanup);

  describe('Icon', () => {
    it('has path data for every bundled Fluent icon', () => {
      const entries = Object.entries(ICON_SVG);
      expect(entries.length).toBeGreaterThanOrEqual(25);
      for (const [name, svg] of entries) {
        expect(svgPathData(svg).length, name).toBeGreaterThan(0);
      }
    });

    it('is decorative by default', () => {
      const { container } = render(<Icon name="checkmark" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.getAttribute('role')).toBeNull();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16');
      expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0);
    });

    it('becomes a named image when given a title', () => {
      render(<Icon name="warning" title="Warning" />);
      expect(screen.getByRole('img', { name: 'Warning' })).toBeTruthy();
    });

    it('scales with size and inherits the text colour', () => {
      const { container } = render(<Icon name={'copy' satisfies IconName} size={24} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('24');
      expect(svg?.getAttribute('fill')).toBe('currentColor');
    });
  });
  ```

- [ ] **Step 13: Run, expect FAIL, then implement Icon**

  ```bash
  npx vitest run src/components/Icon.test.tsx
  ```

  Expect: FAIL, `Failed to resolve import "./Icon"`.

  ```ts file=src/components/iconSvg.ts
  import add from '@fluentui/svg-icons/icons/add_16_regular.svg?raw';
  import arrowClockwise from '@fluentui/svg-icons/icons/arrow_clockwise_16_regular.svg?raw';
  import arrowDownload from '@fluentui/svg-icons/icons/arrow_download_16_regular.svg?raw';
  import arrowExport from '@fluentui/svg-icons/icons/arrow_export_16_regular.svg?raw';
  import arrowLeft from '@fluentui/svg-icons/icons/arrow_left_16_regular.svg?raw';
  import arrowRight from '@fluentui/svg-icons/icons/arrow_right_16_regular.svg?raw';
  import arrowSwap from '@fluentui/svg-icons/icons/arrow_swap_16_regular.svg?raw';
  import arrowUndo from '@fluentui/svg-icons/icons/arrow_undo_16_regular.svg?raw';
  import checkmark from '@fluentui/svg-icons/icons/checkmark_16_regular.svg?raw';
  import checkmarkCircle from '@fluentui/svg-icons/icons/checkmark_circle_16_regular.svg?raw';
  import chevronDown from '@fluentui/svg-icons/icons/chevron_down_16_regular.svg?raw';
  import chevronRight from '@fluentui/svg-icons/icons/chevron_right_16_regular.svg?raw';
  import code from '@fluentui/svg-icons/icons/code_16_regular.svg?raw';
  import copy from '@fluentui/svg-icons/icons/copy_16_regular.svg?raw';
  import cube from '@fluentui/svg-icons/icons/cube_16_regular.svg?raw';
  import dismiss from '@fluentui/svg-icons/icons/dismiss_16_regular.svg?raw';
  import documentIcon from '@fluentui/svg-icons/icons/document_16_regular.svg?raw';
  import errorCircle from '@fluentui/svg-icons/icons/error_circle_16_regular.svg?raw';
  import important from '@fluentui/svg-icons/icons/important_16_regular.svg?raw';
  import info from '@fluentui/svg-icons/icons/info_16_regular.svg?raw';
  import open from '@fluentui/svg-icons/icons/open_16_regular.svg?raw';
  import search from '@fluentui/svg-icons/icons/search_16_regular.svg?raw';
  import subtract from '@fluentui/svg-icons/icons/subtract_16_regular.svg?raw';
  import target from '@fluentui/svg-icons/icons/target_16_regular.svg?raw';
  import warning from '@fluentui/svg-icons/icons/warning_16_regular.svg?raw';

  // Fluent System Icons, bundled locally (FR-11). Replaces the design's text glyphs: { } is "code",
  // the server-object diamond is "cube", the Inspector circle is "target", the client-call arrows are "arrow-swap".
  export const ICON_SVG = {
    add,
    'arrow-clockwise': arrowClockwise,
    'arrow-download': arrowDownload,
    'arrow-export': arrowExport,
    'arrow-left': arrowLeft,
    'arrow-right': arrowRight,
    'arrow-swap': arrowSwap,
    'arrow-undo': arrowUndo,
    checkmark,
    'checkmark-circle': checkmarkCircle,
    'chevron-down': chevronDown,
    'chevron-right': chevronRight,
    code,
    copy,
    cube,
    dismiss,
    document: documentIcon,
    'error-circle': errorCircle,
    important,
    info,
    open,
    search,
    subtract,
    target,
    warning,
  } as const;

  export type IconName = keyof typeof ICON_SVG;
  ```

  ```tsx file=src/components/Icon.tsx
  import type { ReactElement } from 'react';
  import { svgPathData } from '@/lib/svgPathData';
  import { ICON_SVG } from './iconSvg';
  import type { IconName } from './iconSvg';
  import './primitives.css';

  export type IconProps = { name: IconName; size?: number; title?: string };

  export function Icon({ name, size = 16, title }: IconProps): ReactElement {
    const labelled = title !== undefined;
    return (
      <svg
        className="ui-icon"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill="currentColor"
        focusable="false"
        {...(labelled ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
      >
        {svgPathData(ICON_SVG[name]).map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  }
  ```

- [ ] **Step 14: Run Icon tests, expect PASS, commit**

  ```bash
  npx vitest run src/components/Icon.test.tsx
  ```

  Expect: PASS, 4 tests.

  ```bash
  npx prettier --write src/components/Icon.tsx src/components/Icon.test.tsx src/components/iconSvg.ts
  npx eslint src/components --max-warnings=0
  git add src/components/Icon.tsx src/components/Icon.test.tsx src/components/iconSvg.ts
  git commit -m "feat(ui): add Icon backed by bundled Fluent System Icons"
  ```

- [ ] **Step 15: Write the DisabledReason, Button and Pill tests**

  ```tsx file=src/components/Button.test.tsx
  // @vitest-environment jsdom
  import { cleanup, fireEvent, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { Button } from './Button';

  afterEach(cleanup);

  describe('Button', () => {
    it('runs onClick and shows no tooltip when it has no disabled reason', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Copy</Button>);
      const button = screen.getByRole('button', { name: 'Copy' });
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(button.getAttribute('aria-disabled')).toBeNull();
      expect(button.getAttribute('type')).toBe('button');
      expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull();
    });

    it('stays focusable, blocks the click and describes itself when it has a disabled reason', () => {
      const onClick = vi.fn();
      render(
        <Button disabledReason="Select a handler first" onClick={onClick}>
          Insert into handler
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Insert into handler' });
      const tip = screen.getByRole('tooltip', { hidden: true });
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.hasAttribute('disabled')).toBe(false);
      expect(button.getAttribute('aria-describedby')).toBe(tip.id);
      expect(tip.textContent).toBe('Select a handler first');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('shows the reason on hover and on focus and hides it again; Esc dismisses it', () => {
      render(<Button disabledReason="Not available yet">Insert</Button>);
      const button = screen.getByRole('button', { name: 'Insert' });
      const tip = screen.getByRole('tooltip', { hidden: true });
      expect(tip.getAttribute('data-visible')).toBe('false');
      fireEvent.mouseEnter(button);
      expect(tip.getAttribute('data-visible')).toBe('true');
      fireEvent.mouseLeave(button);
      expect(tip.getAttribute('data-visible')).toBe('false');
      fireEvent.focus(button);
      expect(tip.getAttribute('data-visible')).toBe('true');
      fireEvent.keyDown(button, { key: 'Escape' });
      expect(tip.getAttribute('data-visible')).toBe('false');
      fireEvent.blur(button);
      fireEvent.focus(button);
      expect(tip.getAttribute('data-visible')).toBe('true');
    });

    it('treats an empty reason as no reason', () => {
      const onClick = vi.fn();
      render(
        <Button disabledReason="" onClick={onClick}>
          Go
        </Button>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is natively disabled and busy while its own action runs (F49)', () => {
      const onClick = vi.fn();
      render(
        <Button busy onClick={onClick}>
          Download starter
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Download starter' });
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.getAttribute('aria-busy')).toBe('true');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('applies the variant and full-width classes', () => {
      render(
        <Button variant="primary" fullWidth>
          Download starter
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Download starter' });
      expect(button.className).toContain('ui-button--primary');
      expect(button.className).toContain('ui-button--block');
      expect(button.parentElement?.className).toContain('ui-reason-anchor--block');
    });
  });
  ```

  ```tsx file=src/components/Pill.test.tsx
  // @vitest-environment jsdom
  import { cleanup, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it } from 'vitest';
  import { Pill } from './Pill';

  afterEach(cleanup);

  describe('Pill', () => {
    it('is a neutral capsule by default', () => {
      render(<Pill>fetch()</Pill>);
      expect(screen.getByText('fetch()').className).toBe('ui-pill ui-pill--neutral');
    });

    it('applies tone, compact and mono and passes other attributes through', () => {
      render(
        <Pill tone="review" compact mono title="Needs review">
          ! Permissions
        </Pill>,
      );
      const pill = screen.getByText('! Permissions');
      expect(pill.className).toBe('ui-pill ui-pill--review ui-pill--compact ui-pill--mono');
      expect(pill.getAttribute('title')).toBe('Needs review');
    });
  });
  ```

- [ ] **Step 16: Run, expect FAIL, then implement DisabledReason, useDisabledReason, Button, Pill**

  ```bash
  npx vitest run src/components/Button.test.tsx src/components/Pill.test.tsx
  ```

  Expect: FAIL, `Failed to resolve import "./Button"` and `"./Pill"`.

  ```tsx file=src/components/DisabledReason.tsx
  import type { ReactElement } from 'react';
  import './primitives.css';

  export type DisabledReasonProps = { id: string; text: string; visible: boolean };

  // The tooltip stays in the DOM so aria-describedby always resolves; CSS hides it until hover or focus.
  export function DisabledReason({ id, text, visible }: DisabledReasonProps): ReactElement {
    return (
      <span id={id} role="tooltip" className="ui-reason" data-visible={visible}>
        {text}
      </span>
    );
  }
  ```

  ```tsx file=src/components/useDisabledReason.tsx
  import { useId, useState } from 'react';
  import type { FocusEventHandler, KeyboardEventHandler, MouseEventHandler, ReactElement } from 'react';
  import { DisabledReason } from './DisabledReason';

  export type ReasonTriggerProps = {
    readonly 'aria-describedby'?: string;
    readonly onMouseEnter?: MouseEventHandler<HTMLElement>;
    readonly onMouseLeave?: MouseEventHandler<HTMLElement>;
    readonly onFocus?: FocusEventHandler<HTMLElement>;
    readonly onBlur?: FocusEventHandler<HTMLElement>;
    readonly onKeyDown?: KeyboardEventHandler<HTMLElement>;
  };

  export function normalizeReason(reason: string | null | undefined): string | null {
    return reason === undefined || reason === null || reason === '' ? null : reason;
  }

  // F47: a blocked choice stays focusable (aria-disabled, not disabled) and explains itself on hover and focus.
  // Spread triggerProps on the focusable trigger and render tooltip next to it inside .ui-reason-anchor.
  export function useDisabledReason(reason: string | null): {
    triggerProps: ReasonTriggerProps;
    tooltip: ReactElement | null;
  } {
    const id = useId();
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    if (reason === null) return { triggerProps: {}, tooltip: null };
    return {
      triggerProps: {
        'aria-describedby': id,
        onMouseEnter: () => {
          setHovered(true);
          setDismissed(false);
        },
        onMouseLeave: () => {
          setHovered(false);
        },
        onFocus: () => {
          setFocused(true);
          setDismissed(false);
        },
        onBlur: () => {
          setFocused(false);
        },
        onKeyDown: (event) => {
          if (event.key === 'Escape') setDismissed(true);
        },
      },
      tooltip: <DisabledReason id={id} text={reason} visible={(hovered || focused) && !dismissed} />,
    };
  }
  ```

  ```tsx file=src/components/Button.tsx
  import type { ComponentProps, ReactElement } from 'react';
  import { classNames } from '@/lib/classNames';
  import { normalizeReason, useDisabledReason } from './useDisabledReason';
  import './primitives.css';

  // The tooltip handlers are owned by the button, so they are not accepted from the caller.
  export type ButtonProps = Omit<
    ComponentProps<'button'>,
    'disabled' | 'onMouseEnter' | 'onMouseLeave' | 'onFocus' | 'onBlur' | 'onKeyDown'
  > & {
    variant?: 'primary' | 'ghost';
    disabledReason?: string | null;
    busy?: boolean;
    fullWidth?: boolean;
  };

  export function Button({
    variant = 'ghost',
    disabledReason,
    busy = false,
    fullWidth = false,
    type = 'button',
    className,
    onClick,
    children,
    ...rest
  }: ButtonProps): ReactElement {
    const reason = normalizeReason(disabledReason);
    const { triggerProps, tooltip } = useDisabledReason(reason);
    return (
      <span className={classNames('ui-reason-anchor', fullWidth && 'ui-reason-anchor--block')}>
        <button
          {...rest}
          {...triggerProps}
          type={type}
          className={classNames('ui-button', `ui-button--${variant}`, fullWidth && 'ui-button--block', className)}
          disabled={busy}
          aria-busy={busy ? true : undefined}
          aria-disabled={reason === null ? undefined : true}
          onClick={reason === null ? onClick : undefined}
        >
          {children}
        </button>
        {tooltip}
      </span>
    );
  }
  ```

  ```tsx file=src/components/Pill.tsx
  import type { ComponentProps, ReactElement } from 'react';
  import { classNames } from '@/lib/classNames';
  import './primitives.css';

  export type PillTone = 'neutral' | 'selected' | 'ok' | 'review' | 'server';
  export type PillProps = ComponentProps<'span'> & { tone?: PillTone; compact?: boolean; mono?: boolean };

  export function Pill({ tone = 'neutral', compact = false, mono = false, className, ...rest }: PillProps): ReactElement {
    return (
      <span
        {...rest}
        className={classNames(
          'ui-pill',
          `ui-pill--${tone}`,
          compact && 'ui-pill--compact',
          mono && 'ui-pill--mono',
          className,
        )}
      />
    );
  }
  ```

- [ ] **Step 17: Run, expect PASS, commit**

  ```bash
  npx vitest run src/components/Button.test.tsx src/components/Pill.test.tsx
  ```

  Expect: PASS, 8 tests.

  ```bash
  npx prettier --write src/components/DisabledReason.tsx src/components/useDisabledReason.tsx src/components/Button.tsx src/components/Button.test.tsx src/components/Pill.tsx src/components/Pill.test.tsx
  npx eslint src/components --max-warnings=0
  git add src/components/DisabledReason.tsx src/components/useDisabledReason.tsx src/components/Button.tsx src/components/Button.test.tsx src/components/Pill.tsx src/components/Pill.test.tsx
  git commit -m "feat(ui): add Pill, Button and the aria-disabled reason tooltip"
  ```

- [ ] **Step 18: Write the PillGroup test (APG radio group)**

  ```tsx file=src/components/PillGroup.test.tsx
  // @vitest-environment jsdom
  import { cleanup, fireEvent, render, screen } from '@testing-library/react';
  import { useState } from 'react';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { PillGroup } from './PillGroup';
  import type { PillOption } from './PillGroup';

  afterEach(cleanup);

  type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  const PATCH_REASON = "Delete a record doesn't export `patch()`";
  const OPTIONS: readonly PillOption<Method>[] = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH', disabledReason: PATCH_REASON },
    { value: 'DELETE', label: 'DELETE' },
  ];

  function Harness({ initial, onChange }: { initial: Method | null; onChange?: (value: Method) => void }) {
    const [value, setValue] = useState<Method | null>(initial);
    return (
      <PillGroup
        label="HTTP method"
        options={OPTIONS}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    );
  }

  function radio(name: string): HTMLElement {
    return screen.getByRole('radio', { name });
  }

  describe('PillGroup, APG radio group', () => {
    it('is a named radiogroup that shows all five options with aria-checked', () => {
      render(<Harness initial="GET" />);
      expect(screen.getByRole('radiogroup', { name: 'HTTP method' })).toBeTruthy();
      expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      expect(radio('GET').getAttribute('aria-checked')).toBe('true');
      expect(radio('POST').getAttribute('aria-checked')).toBe('false');
      expect(radio('GET').className).toContain('ui-pill--selected');
    });

    it('uses a roving tabindex: only the checked option is in the tab order', () => {
      render(<Harness initial="POST" />);
      expect(screen.getAllByRole('radio').map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1', '-1']);
    });

    it('puts the first enabled option in the tab order when nothing is checked', () => {
      render(<Harness initial={null} />);
      expect(radio('GET').getAttribute('tabindex')).toBe('0');
    });

    it('moves focus and selection with the arrow keys and wraps at both ends', () => {
      const onChange = vi.fn();
      render(<Harness initial="GET" onChange={onChange} />);
      fireEvent.keyDown(radio('GET'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(radio('POST'));
      expect(radio('POST').getAttribute('aria-checked')).toBe('true');
      expect(radio('GET').getAttribute('aria-checked')).toBe('false');
      expect(onChange).toHaveBeenLastCalledWith('POST');
      fireEvent.keyDown(radio('POST'), { key: 'ArrowLeft' });
      fireEvent.keyDown(radio('GET'), { key: 'ArrowUp' });
      expect(document.activeElement).toBe(radio('DELETE'));
      fireEvent.keyDown(radio('DELETE'), { key: 'ArrowDown' });
      expect(document.activeElement).toBe(radio('GET'));
    });

    it('jumps to the first and last option with Home and End', () => {
      render(<Harness initial="PUT" />);
      fireEvent.keyDown(radio('PUT'), { key: 'End' });
      expect(document.activeElement).toBe(radio('DELETE'));
      fireEvent.keyDown(radio('DELETE'), { key: 'Home' });
      expect(document.activeElement).toBe(radio('GET'));
    });

    it('keeps the roving tab stop on the focused option and returns it to the checked one when focus leaves', () => {
      render(
        <>
          <Harness initial="PUT" />
          <button type="button">outside</button>
        </>,
      );
      fireEvent.keyDown(radio('PUT'), { key: 'ArrowRight' });
      expect(radio('PATCH').getAttribute('tabindex')).toBe('0');
      expect(radio('PUT').getAttribute('tabindex')).toBe('-1');
      screen.getByRole('button', { name: 'outside' }).focus();
      expect(radio('PUT').getAttribute('tabindex')).toBe('0');
      expect(radio('PATCH').getAttribute('tabindex')).toBe('-1');
    });

    it('selects an option on click', () => {
      const onChange = vi.fn();
      render(<Harness initial="GET" onChange={onChange} />);
      fireEvent.click(radio('PUT'));
      expect(onChange).toHaveBeenCalledWith('PUT');
      expect(radio('PUT').getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('PillGroup, disabled options (F47)', () => {
    it('marks a blocked option aria-disabled but leaves it focusable and described by its reason', () => {
      render(<Harness initial="PUT" />);
      const patch = radio('PATCH');
      const tip = screen.getByRole('tooltip', { hidden: true });
      expect(patch.getAttribute('aria-disabled')).toBe('true');
      expect(patch.hasAttribute('disabled')).toBe(false);
      expect(patch.getAttribute('aria-describedby')).toBe(tip.id);
      expect(tip.textContent).toBe(PATCH_REASON);
      expect(radio('GET').getAttribute('aria-disabled')).toBeNull();
    });

    it('never selects a blocked option by click', () => {
      const onChange = vi.fn();
      render(<Harness initial="PUT" onChange={onChange} />);
      fireEvent.click(radio('PATCH'));
      expect(onChange).not.toHaveBeenCalled();
      expect(radio('PUT').getAttribute('aria-checked')).toBe('true');
    });

    it('lets arrow keys land on a blocked option without selecting it, and shows its reason on focus', () => {
      const onChange = vi.fn();
      render(<Harness initial="PUT" onChange={onChange} />);
      fireEvent.keyDown(radio('PUT'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(radio('PATCH'));
      expect(radio('PATCH').getAttribute('aria-checked')).toBe('false');
      expect(radio('PUT').getAttribute('aria-checked')).toBe('true');
      expect(radio('PATCH').getAttribute('tabindex')).toBe('0');
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('tooltip', { hidden: true }).getAttribute('data-visible')).toBe('true');
      fireEvent.keyDown(radio('PATCH'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(radio('DELETE'));
      expect(onChange).toHaveBeenCalledWith('DELETE');
    });

    it('shows the reason on hover and hides it when the pointer leaves', () => {
      render(<Harness initial="GET" />);
      const tip = screen.getByRole('tooltip', { hidden: true });
      expect(tip.getAttribute('data-visible')).toBe('false');
      fireEvent.mouseEnter(radio('PATCH'));
      expect(tip.getAttribute('data-visible')).toBe('true');
      fireEvent.mouseLeave(radio('PATCH'));
      expect(tip.getAttribute('data-visible')).toBe('false');
    });
  });
  ```

- [ ] **Step 19: Run, expect FAIL, then implement PillGroup**

  ```bash
  npx vitest run src/components/PillGroup.test.tsx
  ```

  Expect: FAIL, `Failed to resolve import "./PillGroup"`.

  ```tsx file=src/components/PillGroup.tsx
  import { useRef, useState } from 'react';
  import type { FocusEvent, ReactElement } from 'react';
  import { classNames } from '@/lib/classNames';
  import { normalizeReason, useDisabledReason } from './useDisabledReason';
  import './primitives.css';

  export type PillOption<V extends string> = { value: V; label: string; disabledReason?: string | null };
  export type PillGroupProps<V extends string> = {
    label: string;
    options: readonly PillOption<V>[];
    value: V | null;
    onChange: (value: V) => void;
    compact?: boolean;
  };

  // APG radio group keys: arrows move focus and select, wrapping at both ends; Home and End jump.
  function targetIndex(key: string, from: number, count: number): number | null {
    const last = count - 1;
    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        return from === last ? 0 : from + 1;
      case 'ArrowLeft':
      case 'ArrowUp':
        return from === 0 ? last : from - 1;
      case 'Home':
        return 0;
      case 'End':
        return last;
      default:
        return null;
    }
  }

  type PillRadioProps = {
    label: string;
    checked: boolean;
    tabbable: boolean;
    reason: string | null;
    compact: boolean;
    onSelect: () => void;
    onFocusRadio: () => void;
    onNavigate: (key: string) => boolean;
  };

  function PillRadio({
    label,
    checked,
    tabbable,
    reason,
    compact,
    onSelect,
    onFocusRadio,
    onNavigate,
  }: PillRadioProps): ReactElement {
    const { triggerProps, tooltip } = useDisabledReason(reason);
    const { onKeyDown: reasonKeyDown, onFocus: reasonFocus, ...reasonRest } = triggerProps;
    return (
      <span className="ui-reason-anchor">
        <button
          {...reasonRest}
          type="button"
          role="radio"
          aria-checked={checked}
          aria-disabled={reason === null ? undefined : true}
          tabIndex={tabbable ? 0 : -1}
          className={classNames('ui-pill', 'ui-pill--control', checked && 'ui-pill--selected', compact && 'ui-pill--compact')}
          onClick={onSelect}
          onFocus={(event) => {
            reasonFocus?.(event);
            onFocusRadio();
          }}
          onKeyDown={(event) => {
            reasonKeyDown?.(event);
            if (onNavigate(event.key)) event.preventDefault();
          }}
        >
          {label}
        </button>
        {tooltip}
      </span>
    );
  }

  export function PillGroup<V extends string>({
    label,
    options,
    value,
    onChange,
    compact = false,
  }: PillGroupProps<V>): ReactElement {
    const groupRef = useRef<HTMLDivElement>(null);
    const [roving, setRoving] = useState<V | null>(null);

    const tabbable = (
      options.find((o) => o.value === roving) ??
      options.find((o) => o.value === value) ??
      options.find((o) => normalizeReason(o.disabledReason) === null) ??
      options[0]
    )?.value;

    const select = (option: PillOption<V>): void => {
      if (normalizeReason(option.disabledReason) === null) onChange(option.value);
    };

    const navigate = (from: number, key: string): boolean => {
      const to = targetIndex(key, from, options.length);
      const option = to === null ? undefined : options[to];
      if (to === null || option === undefined) return false;
      groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[to]?.focus();
      select(option);
      return true;
    };

    const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
      const next = event.relatedTarget;
      if (!(next instanceof Node && event.currentTarget.contains(next))) setRoving(null);
    };

    return (
      <div ref={groupRef} role="radiogroup" aria-label={label} className="ui-pill-group" onBlur={onBlur}>
        {options.map((option, index) => (
          <PillRadio
            key={option.value}
            label={option.label}
            checked={option.value === value}
            tabbable={option.value === tabbable}
            reason={normalizeReason(option.disabledReason)}
            compact={compact}
            onSelect={() => {
              select(option);
            }}
            onFocusRadio={() => {
              setRoving(option.value);
            }}
            onNavigate={(key) => navigate(index, key)}
          />
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 20: Run, expect PASS, commit**

  ```bash
  npx vitest run src/components/PillGroup.test.tsx
  ```

  Expect: PASS, 11 tests.

  ```bash
  npx prettier --write src/components/PillGroup.tsx src/components/PillGroup.test.tsx
  npx eslint src/components --max-warnings=0
  git add src/components/PillGroup.tsx src/components/PillGroup.test.tsx
  git commit -m "feat(ui): add PillGroup as an APG radio group with focusable disabled options"
  ```

- [ ] **Step 21: Write the StatusBadge, Ring and Tile tests**

  ```tsx file=src/components/StatusBadge.test.tsx
  // @vitest-environment jsdom
  import { cleanup, render } from '@testing-library/react';
  import { afterEach, describe, expect, it } from 'vitest';
  import type { CheckStatus } from '@/types/inspector';
  import { StatusBadge } from './StatusBadge';
  import { checkStatusBadge } from './checkStatusBadge';

  afterEach(cleanup);

  const CASES: [CheckStatus, string, string][] = [
    ['configured', 'ok', 'Configured'],
    ['reviewed', 'ok', 'Reviewed'],
    ['needs-review', 'review', 'Needs review'],
    ['not-scanned', 'unknown', 'Not scanned'],
  ];

  describe('checkStatusBadge', () => {
    it.each(CASES)('maps %s to the %s badge reading "%s"', (status, kind, label) => {
      expect(checkStatusBadge(status)).toEqual({ kind, label });
    });
  });

  describe('StatusBadge', () => {
    it.each(CASES)('%s carries a glyph and a word, never colour alone', (status, kind, label) => {
      const { container } = render(<StatusBadge {...checkStatusBadge(status)} />);
      expect(container.textContent).toBe(label);
      const glyph = container.querySelector('[data-glyph]');
      expect(glyph?.getAttribute('data-glyph')).toBe(kind);
      expect(glyph?.getAttribute('aria-hidden')).toBe('true');
      expect(glyph?.querySelector('svg path')).not.toBeNull();
    });

    it('uses a different glyph for ok and review', () => {
      const ok = render(<StatusBadge kind="ok" label="Browser checks" />).container.querySelector('path')?.getAttribute('d');
      const review = render(<StatusBadge kind="review" label="Permissions" />).container.querySelector('path')?.getAttribute('d');
      expect(ok).toBeTruthy();
      expect(review).toBeTruthy();
      expect(ok).not.toBe(review);
    });

    it('colours ok with the primary tone and review with the needs-review tone', () => {
      const ok = render(<StatusBadge kind="ok" label="Validation" />).container.firstElementChild;
      const review = render(<StatusBadge kind="review" label="Permissions" />).container.firstElementChild;
      expect(ok?.className).toContain('ui-pill--ok');
      expect(review?.className).toContain('ui-pill--review');
    });
  });
  ```

  ```tsx file=src/components/Ring.test.tsx
  // @vitest-environment jsdom
  import { cleanup, render, screen, within } from '@testing-library/react';
  import { afterEach, describe, expect, it } from 'vitest';
  import type { RingState } from '@/lib/ringGeometry';
  import { Ring } from './Ring';

  afterEach(cleanup);

  const many = (n: number, state: RingState): RingState[] => Array.from({ length: n }, () => state);
  const states = (ring: HTMLElement): (string | null)[] =>
    Array.from(ring.querySelectorAll('path'), (p) => p.getAttribute('data-state'));

  describe('Ring', () => {
    it('draws one arc per check, with a text count and label, named for assistive tech', () => {
      render(<Ring segments={['done', 'done', 'review']} label="ready" />);
      const ring = screen.getByRole('img', { name: '2 of 3 ready' });
      expect(within(ring).getByText('2/3')).toBeTruthy();
      expect(within(ring).getByText('ready')).toBeTruthy();
      expect(states(ring)).toEqual(['done', 'done', 'review']);
    });

    it('always shows the count, even with no checks, and draws no arcs', () => {
      render(<Ring segments={[]} label="ready" />);
      const ring = screen.getByRole('img', { name: '0 of 0 ready' });
      expect(within(ring).getByText('0/0')).toBeTruthy();
      expect(states(ring)).toEqual([]);
    });

    it('draws at most one arc per check up to 30', () => {
      render(<Ring segments={many(30, 'done')} label="addressed" />);
      expect(states(screen.getByRole('img'))).toHaveLength(30);
    });

    it('switches to proportional arcs above 30 and omits the empty ones', () => {
      render(<Ring segments={[...many(35, 'done'), ...many(5, 'review')]} label="checks addressed" size={120} />);
      const ring = screen.getByRole('img', { name: '35 of 40 checks addressed' });
      expect(within(ring).getByText('35/40')).toBeTruthy();
      expect(states(ring)).toEqual(['done', 'review']);
      expect(ring.querySelector('svg')?.getAttribute('width')).toBe('120');
    });

    it('marks each arc with its state class', () => {
      render(<Ring segments={['done', 'review', 'not-scanned']} label="ready" />);
      const classes = Array.from(screen.getByRole('img').querySelectorAll('path'), (p) => p.getAttribute('class'));
      expect(classes).toEqual([
        'ui-ring__arc ui-ring__arc--done',
        'ui-ring__arc ui-ring__arc--review',
        'ui-ring__arc ui-ring__arc--not-scanned',
      ]);
    });
  });
  ```

  ```tsx file=src/components/Tile.test.tsx
  // @vitest-environment jsdom
  import { cleanup, render, screen, within } from '@testing-library/react';
  import { afterEach, describe, expect, it } from 'vitest';
  import { Tile } from './Tile';

  afterEach(cleanup);

  describe('Tile', () => {
    it('is a plain container without a heading', () => {
      const { container } = render(<Tile>body</Tile>);
      expect(screen.queryByRole('region')).toBeNull();
      expect(container.firstElementChild?.className).toBe('ui-tile');
    });

    it('becomes a named region with a caption and an aside when it has a heading', () => {
      render(
        <Tile heading="Recipe" aside={<span>10 recipes</span>}>
          <p>content</p>
        </Tile>,
      );
      const region = screen.getByRole('region', { name: 'Recipe' });
      expect(within(region).getByText('10 recipes')).toBeTruthy();
      expect(within(region).getByText('content')).toBeTruthy();
    });

    it('supports flush tiles and extra classes', () => {
      const { container } = render(
        <Tile flush className="pane">
          x
        </Tile>,
      );
      expect(container.firstElementChild?.className).toBe('ui-tile ui-tile--flush pane');
    });
  });
  ```

- [ ] **Step 22: Run, expect FAIL, then implement StatusBadge, checkStatusBadge, Ring, Tile**

  ```bash
  npx vitest run src/components/StatusBadge.test.tsx src/components/Ring.test.tsx src/components/Tile.test.tsx
  ```

  Expect: FAIL, three suites with `Failed to resolve import`.

  ```tsx file=src/components/StatusBadge.tsx
  import type { ReactElement } from 'react';
  import { Icon } from './Icon';
  import type { IconName } from './iconSvg';
  import { Pill } from './Pill';
  import type { PillTone } from './Pill';

  export type BadgeKind = 'ok' | 'review' | 'unknown';
  export type StatusBadgeProps = { kind: BadgeKind; label: string };

  const GLYPH = { ok: 'checkmark', review: 'important', unknown: 'subtract' } as const satisfies Record<BadgeKind, IconName>;
  const TONE = { ok: 'ok', review: 'review', unknown: 'neutral' } as const satisfies Record<BadgeKind, PillTone>;

  // Status is never colour alone (FR-11): a glyph and a word always travel with the tone.
  export function StatusBadge({ kind, label }: StatusBadgeProps): ReactElement {
    return (
      <Pill tone={TONE[kind]}>
        <span className="ui-badge__glyph" data-glyph={kind} aria-hidden="true">
          <Icon name={GLYPH[kind]} size={12} />
        </span>
        {label}
      </Pill>
    );
  }
  ```

  ```ts file=src/components/checkStatusBadge.ts
  import type { CheckStatus } from '@/types/inspector';
  import type { StatusBadgeProps } from './StatusBadge';

  export function checkStatusBadge(status: CheckStatus): StatusBadgeProps {
    switch (status) {
      case 'configured':
        return { kind: 'ok', label: 'Configured' };
      case 'reviewed':
        return { kind: 'ok', label: 'Reviewed' };
      case 'needs-review':
        return { kind: 'review', label: 'Needs review' };
      case 'not-scanned':
        return { kind: 'unknown', label: 'Not scanned' };
      default: {
        const unreachable: never = status;
        return unreachable;
      }
    }
  }
  ```

  ```tsx file=src/components/Ring.tsx
  import type { ReactElement } from 'react';
  import { arcPath, ringArcs } from '@/lib/ringGeometry';
  import type { RingState } from '@/lib/ringGeometry';
  import './primitives.css';

  export type RingProps = { segments: readonly RingState[]; label: string; size?: number };

  const STROKE = 10;

  // The text count is always rendered (FR-11): the ring is never the only carrier of the status.
  export function Ring({ segments, label, size = 78 }: RingProps): ReactElement {
    const total = segments.length;
    const done = segments.filter((s) => s === 'done').length;
    const center = size / 2;
    const radius = (size - STROKE) / 2;
    return (
      <div
        className="ui-ring"
        role="img"
        aria-label={`${String(done)} of ${String(total)} ${label}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox={`0 0 ${String(size)} ${String(size)}`} width={size} height={size} aria-hidden="true">
          {ringArcs(segments).map((arc) => (
            <path
              key={`${arc.state}-${String(arc.startDeg)}`}
              className={`ui-ring__arc ui-ring__arc--${arc.state}`}
              data-state={arc.state}
              d={arcPath(center, center, radius, arc.startDeg, arc.endDeg)}
              strokeWidth={STROKE}
            />
          ))}
        </svg>
        <div className="ui-ring__text">
          <span className="ui-ring__count" style={{ fontSize: Math.round(size / 4) }}>
            {done}/{total}
          </span>
          <span className="ui-ring__label" style={{ fontSize: Math.max(9, Math.round(size / 7.8)) }}>
            {label}
          </span>
        </div>
      </div>
    );
  }
  ```

  ```tsx file=src/components/Tile.tsx
  import { useId } from 'react';
  import type { ComponentProps, ReactElement, ReactNode } from 'react';
  import { classNames } from '@/lib/classNames';
  import './primitives.css';

  export type TileProps = ComponentProps<'div'> & { heading?: string; aside?: ReactNode; flush?: boolean };

  // A glass tile (dark) or white tile (light). With a heading it is a named region; aside shows only with a heading.
  export function Tile({ heading, aside, flush = false, className, children, ...rest }: TileProps): ReactElement {
    const headingId = useId();
    return (
      <div
        {...rest}
        {...(heading === undefined ? {} : { role: 'region', 'aria-labelledby': headingId })}
        className={classNames('ui-tile', flush && 'ui-tile--flush', className)}
      >
        {heading === undefined ? null : (
          <div className="ui-tile__head">
            <div id={headingId} className="ui-tile__label">
              {heading}
            </div>
            {aside}
          </div>
        )}
        {children}
      </div>
    );
  }
  ```

- [ ] **Step 23: Run, expect PASS, commit**

  ```bash
  npx vitest run src/components/StatusBadge.test.tsx src/components/Ring.test.tsx src/components/Tile.test.tsx
  ```

  Expect: PASS, 18 tests (4 status mappings, 4 badge cases and 2 badge checks, 5 ring, 3 tile; `it.each` rows counted).

  ```bash
  npx prettier --write src/components/StatusBadge.tsx src/components/StatusBadge.test.tsx src/components/checkStatusBadge.ts src/components/Ring.tsx src/components/Ring.test.tsx src/components/Tile.tsx src/components/Tile.test.tsx
  npx eslint src/components --max-warnings=0
  git add src/components/StatusBadge.tsx src/components/StatusBadge.test.tsx src/components/checkStatusBadge.ts src/components/Ring.tsx src/components/Ring.test.tsx src/components/Tile.tsx src/components/Tile.test.tsx
  git commit -m "feat(ui): add StatusBadge, segmented Ring and glass Tile"
  ```

- [ ] **Step 24: Write the Modal test (APG modal dialog)**

  ```tsx file=src/components/Modal.test.tsx
  // @vitest-environment jsdom
  import { cleanup, fireEvent, render, screen } from '@testing-library/react';
  import { useState } from 'react';
  import { afterEach, describe, expect, it } from 'vitest';
  import { Modal } from './Modal';

  afterEach(cleanup);

  function Harness({ width }: { width?: number }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
        >
          Export report
        </button>
        <Modal
          open={open}
          title="Export report"
          {...(width === undefined ? {} : { width })}
          onClose={() => {
            setOpen(false);
          }}
          footer={<button type="button">Export Markdown</button>}
        >
          <label>
            Format
            <input type="text" />
          </label>
          <button type="button">Second</button>
        </Modal>
      </>
    );
  }

  function openModal(): HTMLElement {
    const opener = screen.getByRole('button', { name: 'Export report' });
    opener.focus();
    fireEvent.click(opener);
    return opener;
  }

  describe('Modal, APG modal dialog', () => {
    it('renders nothing while closed', () => {
      render(<Harness />);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('is a labelled modal dialog, 520px wide by default and any width on request', () => {
      const first = render(<Harness />);
      openModal();
      const dialog = screen.getByRole('dialog', { name: 'Export report' });
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.style.width).toBe('520px');
      first.unmount();
      render(<Harness width={640} />);
      openModal();
      expect(screen.getByRole('dialog').style.width).toBe('640px');
    });

    it('renders into document.body on a scrim', () => {
      render(<Harness />);
      openModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog.parentElement?.className).toBe('ui-scrim');
      expect(dialog.parentElement?.parentElement).toBe(document.body);
    });

    it('moves focus into the dialog, to the first control rather than the Close button', () => {
      render(<Harness />);
      openModal();
      expect(document.activeElement).toBe(screen.getByRole('textbox'));
    });

    it('traps Tab: from the last control it wraps to the first, and Shift+Tab does the reverse', () => {
      render(<Harness />);
      openModal();
      const close = screen.getByRole('button', { name: 'Close' });
      const last = screen.getByRole('button', { name: 'Export Markdown' });
      last.focus();
      expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false);
      expect(document.activeElement).toBe(close);
      expect(fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })).toBe(false);
      expect(document.activeElement).toBe(last);
    });

    it('lets Tab move normally between controls inside the dialog', () => {
      render(<Harness />);
      openModal();
      const input = screen.getByRole('textbox');
      expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
    });

    it('pulls focus back in when it has escaped the dialog', () => {
      render(<Harness />);
      openModal();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      expect(document.activeElement).toBe(document.body);
      fireEvent.keyDown(document.body, { key: 'Tab' });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    });

    it('closes on Escape and returns focus to the opener', () => {
      render(<Harness />);
      const opener = openModal();
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(opener);
    });

    it('closes on Escape even after focus fell back to the body', () => {
      render(<Harness />);
      const opener = openModal();
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(opener);
    });

    it('closes from the Close button and returns focus to the opener', () => {
      render(<Harness />);
      const opener = openModal();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(opener);
    });

    it('does not close when the scrim is clicked', () => {
      render(<Harness />);
      openModal();
      const scrim = screen.getByRole('dialog').parentElement;
      expect(scrim).not.toBeNull();
      if (scrim !== null) fireEvent.click(scrim);
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
  });
  ```

- [ ] **Step 25: Run, expect FAIL, then implement Modal**

  ```bash
  npx vitest run src/components/Modal.test.tsx
  ```

  Expect: FAIL, `Failed to resolve import "./Modal"`.

  ```tsx file=src/components/Modal.tsx
  import { useEffect, useEffectEvent, useId, useRef } from 'react';
  import type { ReactElement, ReactNode } from 'react';
  import { createPortal } from 'react-dom';
  import { Icon } from './Icon';
  import './primitives.css';

  export type ModalProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    width?: number;
    footer?: ReactNode;
    children: ReactNode;
  };

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusableIn(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  }

  function ModalDialog({ title, width = 520, onClose, footer, children }: Omit<ModalProps, 'open'>): ReactElement {
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();

    // Keys are handled on document so Esc and the Tab trap still work after a click moved focus to the body.
    const handleKey = useEffectEvent((event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (dialog === null) return;
      const items = focusableIn(dialog);
      const first = items[0];
      const last = items[items.length - 1];
      if (first === undefined || last === undefined) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const active = document.activeElement;
      const outside = !(active instanceof Node && dialog.contains(active));
      if (event.shiftKey) {
        if (outside || active === first || active === dialog) {
          event.preventDefault();
          last.focus();
        }
      } else if (outside || active === last) {
        event.preventDefault();
        first.focus();
      }
    });

    useEffect(() => {
      const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const dialog = dialogRef.current;
      if (dialog !== null) {
        const items = focusableIn(dialog);
        const target = items.find((el) => !el.hasAttribute('data-modal-close')) ?? items[0] ?? dialog;
        target.focus();
      }
      const listener = (event: KeyboardEvent): void => {
        handleKey(event);
      };
      document.addEventListener('keydown', listener);
      return () => {
        document.removeEventListener('keydown', listener);
        opener?.focus();
      };
    }, []);

    return (
      <div className="ui-scrim">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="ui-modal"
          style={{ width }}
        >
          <div className="ui-modal__head">
            <h2 id={titleId} className="ui-modal__title">
              {title}
            </h2>
            <button type="button" className="ui-icon-button" aria-label="Close" data-modal-close="true" onClick={onClose}>
              <Icon name="dismiss" />
            </button>
          </div>
          <div className="ui-modal__body">{children}</div>
          {footer === undefined ? null : <div className="ui-modal__foot">{footer}</div>}
        </div>
      </div>
    );
  }

  export function Modal({ open, ...dialog }: ModalProps): ReactElement | null {
    return open ? createPortal(<ModalDialog {...dialog} />, document.body) : null;
  }
  ```

- [ ] **Step 26: Run, expect PASS, commit**

  ```bash
  npx vitest run src/components/Modal.test.tsx
  ```

  Expect: PASS, 11 tests. If the `Harness` spread `{...(width === undefined ? {} : { width })}` is flagged by lint, it exists only because `exactOptionalPropertyTypes` forbids passing `width={undefined}`.

  ```bash
  npx prettier --write src/components/Modal.tsx src/components/Modal.test.tsx
  npx eslint src/components --max-warnings=0
  git add src/components/Modal.tsx src/components/Modal.test.tsx
  git commit -m "feat(ui): add Modal following the APG modal dialog pattern"
  ```

- [ ] **Step 27: Write the ToastStack test**

  Uses fake timers and a stubbed `matchMedia` (jsdom has none; the hook treats a missing `matchMedia` as "motion allowed").

  ```tsx file=src/components/ToastStack.test.tsx
  // @vitest-environment jsdom
  import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
  import { useState } from 'react';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { ToastStack } from './ToastStack';
  import type { ToastItem, ToastType } from './ToastStack';

  function setReducedMotion(matches: boolean): void {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (media: string) => ({
        matches,
        media,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
  }

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  const toast = (type: ToastType, id: string = type): ToastItem => ({
    id,
    type,
    title: `${type} title`,
    body: `${type} body`,
  });

  function Harness({ initial }: { initial: readonly ToastItem[] }) {
    const [toasts, setToasts] = useState(initial);
    return (
      <ToastStack
        toasts={toasts}
        onClose={(id) => {
          setToasts((current) => current.filter((t) => t.id !== id));
        }}
      />
    );
  }

  const advance = (ms: number): void => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  describe('ToastStack, structure and roles (FR-1)', () => {
    it('shows a header with the title and a close button, and the body', () => {
      render(<Harness initial={[toast('success')]} />);
      const item = screen.getByRole('status');
      expect(within(item).getByText('success title')).toBeTruthy();
      expect(within(item).getByText('success body')).toBeTruthy();
      expect(within(item).getByRole('button', { name: 'Close' })).toBeTruthy();
    });

    it('gives success and info role=status and error and warning role=alert', () => {
      render(<Harness initial={[toast('success'), toast('info'), toast('error'), toast('warning')]} />);
      expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual([
        expect.stringContaining('success title'),
        expect.stringContaining('info title'),
      ]);
      expect(screen.getAllByRole('alert').map((el) => el.textContent)).toEqual([
        expect.stringContaining('error title'),
        expect.stringContaining('warning title'),
      ]);
    });

    it('stacks several toasts in the order given', () => {
      render(<Harness initial={[toast('info', 'a'), toast('success', 'b')]} />);
      expect(screen.getAllByRole('status').map((el) => el.className.includes('ui-toast--info'))).toEqual([true, false]);
    });
  });

  describe('ToastStack, auto-hide and close', () => {
    it('hides a success toast after 5 s, fading out first', () => {
      vi.useFakeTimers();
      render(<Harness initial={[toast('success')]} />);
      advance(4999);
      expect(screen.getByRole('status').className).not.toContain('ui-toast--leaving');
      advance(1);
      expect(screen.getByRole('status').className).toContain('ui-toast--leaving');
      advance(150);
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('hides an info toast after 5 s', () => {
      vi.useFakeTimers();
      render(<Harness initial={[toast('info')]} />);
      advance(5000);
      advance(150);
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('removes the toast at exactly 5 s under reduced motion, with no fade', () => {
      setReducedMotion(true);
      vi.useFakeTimers();
      render(<Harness initial={[toast('success')]} />);
      advance(4999);
      expect(screen.getByRole('status')).toBeTruthy();
      advance(1);
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('keeps error and warning toasts until they are closed', () => {
      vi.useFakeTimers();
      render(<Harness initial={[toast('error'), toast('warning')]} />);
      advance(60_000);
      expect(screen.getAllByRole('alert')).toHaveLength(2);
    });

    it('closes from the close button after the fade, or at once under reduced motion', () => {
      vi.useFakeTimers();
      const first = render(<Harness initial={[toast('error')]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.getByRole('alert').className).toContain('ui-toast--leaving');
      advance(150);
      expect(screen.queryByRole('alert')).toBeNull();
      first.unmount();

      setReducedMotion(true);
      render(<Harness initial={[toast('error')]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('times each toast from its own arrival', () => {
      vi.useFakeTimers();
      render(<Harness initial={[toast('success', 'first')]} />);
      advance(3000);
      expect(screen.getAllByRole('status')).toHaveLength(1);
      advance(2000);
      advance(150);
      expect(screen.queryByRole('status')).toBeNull();
    });
  });

  describe('ToastStack, reduced motion', () => {
    it('adds the fade class when motion is allowed', () => {
      setReducedMotion(false);
      render(<Harness initial={[toast('success')]} />);
      expect(screen.getByRole('status').className).toContain('ui-toast--fade');
    });

    it('adds the fade class when the browser reports no preference API at all', () => {
      render(<Harness initial={[toast('success')]} />);
      expect(screen.getByRole('status').className).toContain('ui-toast--fade');
    });

    it('drops the fade class under prefers-reduced-motion', () => {
      setReducedMotion(true);
      render(<Harness initial={[toast('success')]} />);
      expect(screen.getByRole('status').className).not.toContain('ui-toast--fade');
    });
  });
  ```

- [ ] **Step 28: Run, expect FAIL, then implement the hook and ToastStack**

  ```bash
  npx vitest run src/components/ToastStack.test.tsx
  ```

  Expect: FAIL, `Failed to resolve import "./ToastStack"`.

  ```ts file=src/components/usePrefersReducedMotion.ts
  import { useSyncExternalStore } from 'react';

  const QUERY = '(prefers-reduced-motion: reduce)';

  function subscribe(callback: () => void): () => void {
    if (typeof window.matchMedia !== 'function') return () => undefined;
    const list = window.matchMedia(QUERY);
    list.addEventListener('change', callback);
    return () => {
      list.removeEventListener('change', callback);
    };
  }

  function getSnapshot(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
  }

  // Motion is allowed whenever the browser cannot say otherwise (jsdom, first paint on the server).
  export function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
  }
  ```

  ```tsx file=src/components/ToastStack.tsx
  import { useEffect, useEffectEvent, useState } from 'react';
  import type { ReactElement } from 'react';
  import { classNames } from '@/lib/classNames';
  import { Icon } from './Icon';
  import type { IconName } from './iconSvg';
  import { usePrefersReducedMotion } from './usePrefersReducedMotion';
  import './primitives.css';

  export type ToastType = 'success' | 'info' | 'warning' | 'error';
  export type ToastItem = { id: string; title: string; body: string; type: ToastType };
  export type ToastStackProps = { toasts: readonly ToastItem[]; onClose: (id: string) => void };

  const AUTO_HIDE_MS = 5000;
  const FADE_MS = 150;

  const ICON = {
    success: 'checkmark-circle',
    info: 'info',
    warning: 'warning',
    error: 'error-circle',
  } as const satisfies Record<ToastType, IconName>;

  // FR-1: success and info hide after 5 s with role=status; error stays until closed with role=alert.
  // Warning is not named by the spec; it behaves like error so it is never lost (Decision 4).
  const autoHides = (type: ToastType): boolean => type === 'success' || type === 'info';
  const roleOf = (type: ToastType): 'status' | 'alert' => (autoHides(type) ? 'status' : 'alert');

  function Toast({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }): ReactElement {
    const reducedMotion = usePrefersReducedMotion();
    const [leaving, setLeaving] = useState(false);

    const requestClose = (): void => {
      if (reducedMotion) onClose(toast.id);
      else setLeaving(true);
    };
    const autoClose = useEffectEvent(() => {
      requestClose();
    });
    const finish = useEffectEvent(() => {
      onClose(toast.id);
    });
    const timed = autoHides(toast.type);

    useEffect(() => {
      if (!timed) return undefined;
      const timer = setTimeout(() => {
        autoClose();
      }, AUTO_HIDE_MS);
      return () => {
        clearTimeout(timer);
      };
    }, [timed]);

    useEffect(() => {
      if (!leaving) return undefined;
      const timer = setTimeout(() => {
        finish();
      }, FADE_MS);
      return () => {
        clearTimeout(timer);
      };
    }, [leaving]);

    return (
      <div
        role={roleOf(toast.type)}
        className={classNames(
          'ui-toast',
          `ui-toast--${toast.type}`,
          !reducedMotion && 'ui-toast--fade',
          leaving && 'ui-toast--leaving',
        )}
      >
        <div className="ui-toast__header">
          <Icon name={ICON[toast.type]} />
          <strong className="ui-toast__title">{toast.title}</strong>
          <button type="button" className="ui-icon-button" aria-label="Close" onClick={requestClose}>
            <Icon name="dismiss" />
          </button>
        </div>
        <div className="ui-toast__body">{toast.body}</div>
      </div>
    );
  }

  // Presentational only: Phase 06's useNotify decides when a toast exists. Each toast runs its own timers.
  export function ToastStack({ toasts, onClose }: ToastStackProps): ReactElement {
    return (
      <div className="ui-toast-stack">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 29: Run, expect PASS, commit**

  ```bash
  npx vitest run src/components/ToastStack.test.tsx
  ```

  Expect: PASS, 12 tests.

  ```bash
  npx prettier --write src/components/ToastStack.tsx src/components/ToastStack.test.tsx src/components/usePrefersReducedMotion.ts
  npx eslint src/components --max-warnings=0
  git add src/components/ToastStack.tsx src/components/ToastStack.test.tsx src/components/usePrefersReducedMotion.ts
  git commit -m "feat(ui): add the fallback ToastStack with roles, auto-hide and reduced motion"
  ```

---

## Phase verification

Run from the repo root. Every command must exit 0.

```bash
npx tsc -b
npx eslint . --max-warnings=0
npx prettier --check .
npx vitest run
npx vitest run src/lib/classNames.test.ts src/lib/svgPathData.test.ts src/lib/ringGeometry.test.ts src/app/theme/tokens.test.ts src/components
npm run build
grep -rl "JetBrainsMono-Regular\|font/ttf" dist
git status --short
```

Expect:
- `tsc`, `eslint` and `prettier --check` print nothing and exit 0. No `any`, no `!`, no `forwardRef`, no `useMemo`/`useCallback`, and no `dangerouslySetInnerHTML` appear in the files this phase added (`grep -rn "forwardRef\|useMemo\|useCallback\|dangerouslySetInnerHTML\|: any\b" src/components src/lib/ringGeometry.ts src/lib/svgPathData.ts src/lib/classNames.ts` prints nothing).
- The full suite passes, including the focused run: 3 lib files, the token file and 10 component files, roughly 145 tests.
- `npm run build` still produces the single IIFE bundle (Phase 00's build-shape test is part of `npx vitest run`). The `grep` lists at least one file under `dist/`, which confirms the JetBrains Mono files are referenced in the build output, either as emitted font files or as `data:` URIs. If Vite emitted them as separate files, the Starter PPTB smoke gate must confirm the code panes render in JetBrains Mono, because the host's CSP allows `'self'` and `data:` fonts only.
- `git status --short` shows only untracked or unchanged docs; nothing outside this phase's files changed.

## Done when

- `tokens.css` carries both themes with the FR-11 values (`tokens.test.ts` checks every one), the dark aurora and glass tile, the 2px primary focus ring at a 2px offset, the 10% highlight rule with a 2px inset bar, and the bundled JetBrains Mono `@font-face`; nothing loads from another origin.
- `Ring` draws one SVG arc per check up to 30 with 4° gaps, three proportional arcs above 30 with empty arcs omitted, and always shows the text count.
- `PillGroup` is an APG radio group (roving tabindex, arrows, Home and End, `aria-checked`), and a blocked option is `aria-disabled`, focusable, never selected, and described by its reason on hover and focus. `Button` does the same for `disabledReason` and sets `busy` natively.
- `StatusBadge` always shows a glyph and a word. `Modal` traps focus, closes on Esc and returns focus to its opener. `ToastStack` gives success and info `role="status"` and a 5 s auto-hide, gives error and warning `role="alert"` and no auto-hide, and drops the fade class under `prefers-reduced-motion`.
- Every file listed under **Interfaces: Produces** exists with exactly those names and prop types, so phases 06, 18, 21, 22, 23 and 24 can import them without editing this phase.
- Owner-gated, not part of this phase: the glass contrast measurement on a real dark build at UI acceptance (Starter release gate).
