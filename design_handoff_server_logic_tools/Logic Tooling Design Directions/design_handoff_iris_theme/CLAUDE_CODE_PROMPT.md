# Prompt for Claude Code

Paste this into Claude Code from the root of the repo. Attach or point it at this folder.

---

Make **Iris with heavier Segoe UI** the theme for the server logic tools. Read `README.md` in this handoff first, then `layout-spec-10a.md`.

The HTML files are design references, not code to copy. Recreate them in the existing codebase and its patterns (Fluent UI v9, `packages/builder-ui`).

## Tasks
1. Replace `packages/builder-ui/src/theme/workbenchTokens.ts` with `tokens/iris-workbenchTokens.ts`. Keep palette ids `porcelainLight` and `porcelainDark`; labels become "Iris" and "Iris Dark". Do not change the switcher, persistence or `createPorcelainFluentTheme`.
2. Check that every place that sets a font family or weight reads from the theme (`fontFamilyBase`, `fontFamilyMonospace`, `fontWeight*` tokens). Replace hard-coded font stacks and weights. Do not add `@font-face`, Google Fonts, `@import` or any font package. Segoe UI and Cascadia Mono / Consolas are system fonts.
3. Replace remaining hard-coded colours from 11c and 12e with token reads. Remove Glass Bento `backdrop-filter` and aurora backgrounds. Add the two corner glows (`--glow-1`, `--glow-2`) to the content area.
4. Code wells: dark in both themes, using `--code`, `--code-text`, `--code-text3`, `--code-info` (keywords), `--code-a2` (`Server.*`), `--code-good` (strings). Highlight line: `rgba(255,255,255,.12)` plus a 2px inset bar in `--code-accent`. Accent buttons on a code well use `--code-accent` fill and `--code` text.
5. Compare Logic Starter against `Logic Starter Iris.dc.html` in light and dark at 1100×780. Match weights, sizes, spacing and colours. Then build Server Objects and Logic Inspector to the same system using the role mapping in the README and the layouts in `layout-spec-10a.md`.
6. Update tests that assert Porcelain values, labels or font weights.
7. Build, run tests, and check both themes in web and PPTB.

## Rules
- Status never relies on colour alone: keep the `✓` / `!` glyph and the word.
- Needs-review colour is for status only.
- All five HTTP methods stay visible (GET, POST, PUT, PATCH, DELETE).
- Do not touch layout, copy or behaviour from `layout-spec-10a.md` unless a task above says to.
- Do not use anything in `explorations/` for build.

## Report back
List files changed, any hard-coded colour or font you could not map to a token, and a contrast check (4.5:1 text, 3:1 strokes) for both themes.
