# Phase 25: Iris theme rework

**Part:** D (theme rework), `plan-starter.md`. Added for spec v3.0.0 (MAJOR, 2026-10-23).
**Implements:** FR-11 as rewritten in v3.0.0 (Iris tokens under `iris.css` names, dark code wells, the new highlight rule, glows in place of aurora and glass, Segoe UI 550/650, JetBrains Mono kept), AC-1.5, AC-1.6 (theme names only; the host-driven behaviour is unchanged), AC-4.2 (highlight), AC-5.1 and AC-8.2 (accent), Accessibility (Iris contrast figures, decorative-only borders, the glow gate).
**Depends on:** 04, 06, 18, 21, 22 (all merged). Phase 23 isn't required: if it merges first, this phase renames its CSS too; if it merges after, it uses the Iris names directly (see the note at the top of Phase 23).
**Design source:** `design_handoff_server_logic_tools/Logic Tooling Design Directions/design_handoff_iris_theme/`: `README.md` (role mapping, code wells, differences from 10a), `tokens/iris.css` (values and names), and `Logic Starter Iris.dc.html` (open it with `support.js` beside it) as the visual reference for Logic Starter. Layout, copy and behaviour still come from layout 10a (`layout-spec-10a.md` there is a byte-for-byte copy of the 10a README).
**Not used from the handoff:** `tokens/iris-workbenchTokens.ts` (Fluent UI v9, not this app), its persisted Light/Dark switcher, Cascadia Mono / Consolas, its 600/700 weights, text glyphs in place of Fluent icons, and anything in `explorations/`.

## Files

- Rewrite: `src/app/theme/tokens.css`, `src/app/theme/tokens.test.ts`.
- Rename tokens and remove glass in: `src/components/primitives.css`, `src/app/shell/shell.css`, `src/features/starter/starter.css`, `src/features/starter/code/codePanes.css`, `src/features/starter/code/codeTheme.ts`, `src/features/server-objects/serverObjects.css`, and the Inspector CSS if Phase 23 has merged.
- Comment only: `src/components/Tile.tsx` ("A glass tile (dark) or white tile (light)" becomes "A surface tile").
- Leave alone: `src/assets/fonts/fonts.css` (JetBrains Mono stays), the report code (FR-10, README §05 and A8 are unchanged), CSS class names (`ui-button--primary`, `ui-pill--review` and the rest are component API and keep their names), and generated output (`demoPages.ts` emits its own CSS).

## Decisions

1. **Rename to the `iris.css` names, with no aliases.** The spec names the variables, and keeping the old names as aliases would leave two vocabularies. App-only tokens Iris doesn't define keep their names, with Iris-derived values: `--tooltip-bg` (`var(--text)`), `--tooltip-text` (`var(--surface)`), `--scrim`, `--code-highlight`, `--font-ui`, `--font-mono`.
2. **Rename `--surface` before `--tile`.** Today `--surface` is the content area (shell.css lines 57 and 102), and in Iris `--surface` is the tile. Doing it in the other order would turn every tile into the content colour.
3. **Two weight tokens.** `--weight-base: 550` on `body`, and `--weight-strong: 650` for every hard-coded 600 or 700 in the UI CSS (captions, selected states, titles, object names). Code wells, `.ui-mono` and `.cm-editor` set `font-weight: 400`. Without that they inherit 550, and CSS font matching then picks JetBrains Mono's 700 face, since it ships only 400, 500 and 700.
4. **Not-scanned ring arcs use `--text3`** (Phase 04 Decision 3 used `--muted`, which `--text3` replaces). Track and gaps use `--border`; the Starter ring's gaps use `--surface` (FR-11).

## Rename table

| Old token | Iris token | Note |
|---|---|---|
| `--surface` (content area) | `--bg2` | Do this first (Decision 2). Add the glows on the same element. |
| `--window`, `--window-bg` | `--bg` | `body` background becomes `var(--bg)`; drop `background-attachment: fixed`. |
| `--tile` | `--surface` | |
| `--tile-glass`, `--tile-blur`, `--tile-shadow` | removed | Delete the `linear-gradient` glass layer, `backdrop-filter` and the `@supports not (backdrop-filter …)` block in `primitives.css`. |
| `--border` | `--border` | New values. |
| `--control-border` | `--interactive-stroke` | |
| `--ghost` | `--surface2` | Secondary buttons and inputs. |
| `--text`, `--text-2`, `--muted` | `--text`, `--text2`, `--text3` | |
| `--primary`, `--primary-text` | `--accent` | `--accent` text passes on `--surface` in both themes (7.7:1). |
| `--on-primary` | `--accent-ink` | |
| `--ok-tint` | `--accent-soft` | |
| `--review`, `--review-tint` | `--danger`, `--danger-soft` | |
| `--server`, `--server-tint` | `--accent2`, `--accent2-soft` | |
| `--keyword`, `--string`, `--comment` | `--code-info`, `--code-good`, `--code-text3` | Only inside code wells. A `--comment` used outside one (check `serverObjects.css` line 236) becomes `--text3`. |
| `--code` | `--code` | New values, dark in both themes; add `--code-text`, `--code-accent`, `--code-a2` and a 1px `--border-strong` outline on every well. |
| `--code-highlight` | `--code-highlight` | `rgba(255, 255, 255, 0.12)`, plus `box-shadow: inset 2px 0 0 var(--code-accent)` on the highlighted line. |

## Tasks

Each task is red first: change the test, run it and watch it fail, then change the CSS.

### Task 1: Tokens

- [ ] In `tokens.test.ts`, replace `SPEC_TOKENS` with spec v3.0.0's FR-11 table: every row, both themes, `iris.css` names. Assert `--text3` equals `--text2` in each theme, and the soft tints are alpha .12 (light) and .16 (dark).
- [ ] Replace the aurora test with one for the glows. The content-area rule paints `--glow1` top right and `--glow2` bottom left over `--bg2`.
- [ ] Replace the 14px blur test with one that asserts no `backdrop-filter`, `--tile-blur` or `--tile-glass` anywhere under `src/` (read the CSS and TS files as text).
- [ ] Highlight test: `--code-highlight` is `rgba(255, 255, 255, 0.12)`, and the bar is `inset 2px 0 0 var(--code-accent)`.
- [ ] Focus test: `outline: 2px solid var(--accent)` at a 2px offset.
- [ ] Font test: `--font-ui` is the Segoe stack; `--font-mono` names JetBrains Mono first, with no Cascadia or Consolas; `body` uses `var(--weight-base)` = 550; `--weight-strong` = 650; code wells, `.ui-mono` and `.cm-editor` are 400.
- [ ] Contrast tests: recompute against the Iris pairs. Text pairs ≥ 4.5:1 (lowest expected 5.01, `--accent2` over the light `--glow1` peak); code-well colours on `--code` and on the highlighted line (lowest expected 5.58); `--interactive-stroke` and `--accent` ≥ 3:1 against `--surface` and `--bg2`.
- [ ] Keep the existing tests for the selected pill never using the needs-review colour, the 1024×700 floor, no cross-origin loads, and the Phase 00 woff2.
- [ ] Rewrite `tokens.css` until the tests pass.
- Commit: `feat(theme): replace 11c and 12e tokens with Iris`

### Task 2: Rename and remove glass across the UI CSS

- [ ] Add a test that fails while any old token name (left column of the rename table) is still referenced anywhere under `src/`.
- [ ] Apply the rename table file by file, `--surface` → `--bg2` first. Remove the glass layer and the `@supports` fallback from `.ui-tile`. Tiles get `--surface`, a 1px `--border` and radius 10px (Inspector 12px).
- [ ] Apply the Iris role rules that aren't renames: interactive pill outlines `--interactive-stroke`, inputs `--surface2` with a 2px `--accent` bottom border, selected rows and chips `--accent-soft` with `--text` and a 1px `--accent` border, needs-review tiles `--surface` with a `--danger` border and a `--danger-soft` glyph chip.
- [ ] Replace hard-coded `font-weight` 600 and 700 in the UI CSS with `var(--weight-strong)`.
- [ ] Existing component tests (Button, Pill, Ring, StatusBadge, DownloadStarterButton) assert class names, not colours, so they should pass unchanged. If one fails, fix the CSS, not the test.
- Commit: `refactor(theme): move UI styles to Iris tokens and drop glass`

### Task 3: Code wells

- [ ] In `codeTheme.ts`, the tests expect keywords `--code-info`, strings and regexps `--code-good`, comments and gutters `--code-text3`, plain text `--code-text`, `Server.*` objects `--code-a2`, and focus `2px solid var(--accent)`.
- [ ] The server pane's highlighted data-access lines use the new highlight rule (AC-4.2). The AC-5.2 flag lines keep `--danger`.
- [ ] Accent buttons inside a well (Copy) use a `--code-accent` fill and `--code` text.
- Commit: `feat(theme): dark Iris code wells in both themes`

## Verification

- `npx tsc -b`, `npx eslint . --max-warnings=0`, `npx prettier --check .`, `npx vitest run` and `npm run build` (one IIFE bundle) all pass.
- In a browser at 1100×780, compare Logic Starter in light and dark against `Logic Starter Iris.dc.html`. Expect the weights to look lighter than the reference, which was drawn at 600/700.
- ◆ Owner: PPTB smoke in both host themes (Debug → Load Local Tool, project root); the theme still follows the host and there's no toggle.
- ◆ Owner, at each page's release gate: the Iris glow contrast check (Accessibility). It replaces the glass contrast check.

## Done when

No 11c or 12e value, aurora, glass or `backdrop-filter` is left in `src/`. Every UI colour comes from an `iris.css` name, code wells are dark in both themes, and the weights are 550 and 650. Reports are byte-identical to before: the Phase 16 and Phase 20 tests pass unchanged.
