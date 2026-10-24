# Handoff: Server Logic Tools, Iris theme with heavier Segoe UI (layout 10a)

## Overview
Iris replaces Paper & Signal (11c light) and Glass Bento (12e dark) as the theme for the Power Pages server logic tools: **Logic Starter**, **Server Objects**, **Logic Inspector**. Layout 10a is unchanged. Typography is **Segoe UI at a heavier weight**. No web fonts are loaded.

Start with `CLAUDE_CODE_PROMPT.md` for the implementation task list.

## About the Design Files
The HTML files here are **design references**, not production code. Recreate them in the target codebase using its existing patterns and libraries (the Iris token file targets `packages/builder-ui`, Fluent UI v9). If no environment exists yet, pick the most suitable framework.

## Fidelity
**High fidelity.** Final colours, type, spacing and states. Recreate pixel-accurately.

## Bundle
| Path | Use |
|---|---|
| `Logic Starter Iris.dc.html` (+ `support.js`) | **Reference for the final look.** Logic Starter in Iris light and dark with the heavier Segoe UI. Open in a browser. |
| `tokens/iris-workbenchTokens.ts` | **Ready to drop in** to `packages/builder-ui/src/theme/workbenchTokens.ts`. Iris colours plus the heavier-type changes below. Palette ids `porcelainLight` / `porcelainDark` unchanged. |
| `tokens/iris.css` | Same values as CSS custom properties (`:root` light, `[data-theme="dark"]` dark), including type tokens. Use these names for mock-to-code mapping. |
| `tokens/iris.json` | Same values as data. |
| `layout-spec-10a.md` | Previous handoff README: navigation, grid sizes, recipe picker, 10 recipes, `view` state. **Still the layout and behaviour spec.** Ignore its section 4 (themes) and colour figures. |
| `layout-reference-10a/` | Six static pages in the old 11c/12e colours. Structure only. |
| `explorations/` | Not for build. Theme Mocks (Graphite, Mulberry, Saffron, Iris on Server Objects, Logic Starter, Logic Inspector) and a Mulberry comparison with DM Sans. `Theme Mocks` shows **Server Objects in Iris** (mock 1d, regular Segoe UI, mono toggle on by default; ignore both). |

## Typography (decided)
- UI font: `"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif`. Segoe UI ships with Windows. **Do not add a web font or `@import`.**
- Mono (code, paths, tokens): `"Cascadia Mono", Consolas, ui-monospace, monospace`. Also system fonts.
- Weights: base **600**, captions and selected states **700**, page titles **700**. In Fluent terms: `fontWeightRegular` 600, `fontWeightMedium` 600, `fontWeightSemibold` 700, `fontWeightBold` 700 (already set in `iris-workbenchTokens.ts`).
- Muted text is darkened: `--text3` uses the `--text2` value (light `#34345a`, dark `#cecff0`). Original Iris `text3` was light `#55557f`, dark `#9d9ec9`. Code-well comment colour `--code-text3` is unchanged (`#9d9ec9`).
- Sizes: pills 11.5px, body 12–13px, code 10–11px at line-height 1.6–1.72, table cells 12px, Inspector title 34px/700, tab labels 12.5px.
- Layout was drawn with these weights; widths in the references already account for them.

## Screens
All three share the 42px title bar and the 10a grids in `layout-spec-10a.md`.
- **Logic Starter** (drawn in `Logic Starter Iris.dc.html`). Grid `220px repeat(3, 1fr)`, rows `129px / 1fr / auto`, 12px gap, content padding `12px 16px 16px`. Top tiles: Logic name, HTTP method (GET, POST, PUT, PATCH, DELETE), Recipe combobox, readiness ring. Path strip (Page script → Token → Endpoint → Handler), two editors (server, client call) with 51px headers, permissions strip, Download button.
- **Server Objects** and **Logic Inspector.** Not drawn with the heavier type. Build from `layout-spec-10a.md` plus the role mapping below. For Server Objects, `explorations/Theme Mocks.dc.html` mock 1d shows the Iris colours on that layout (columns `240px / 1fr / 260px`).

## Role mapping
| Role | Token |
|---|---|
| Window / title bar | `--bg` |
| Content area | `--bg2` plus corner glows `--glow-1` (top right), `--glow-2` (bottom left) |
| Tiles and cards | `--surface`, 1px `--border`, radius 10px (Inspector 12px) |
| Inputs, secondary buttons, table strip | `--surface2`; input bottom border 2px `--accent` |
| Outlines of interactive pills | `--interactive-stroke` |
| Selected pill / primary button | fill `--accent`, text `--accent-ink`, weight 700 |
| Soft selected (row, chip) | fill `--accent-soft`, text `--text`, 1px `--accent` |
| Server objects, `◇`, "Uses …" | `--accent-2` |
| Needs review (status only) | `--danger`, fill `--danger-soft`, border `--danger`, glyph `!` plus a word |
| OK | accent, glyph `✓` plus a word |
| Muted text, captions | `--text3` (captions 11.5px, 700, uppercase, +.04em) |
| Ring segments | OK `--accent`, review `--danger`, gaps and track `--border` (Starter ring gaps use `--surface`) |

## Code wells
Always dark, both modes. Background `--code` (light `#0c0c18`, dark `#000000`), 1px `--border-strong` outline.

| Token | Hex | Used for |
|---|---|---|
| `--code-text` | `#f3f3ff` | plain text |
| `--code-text3` | `#9d9ec9` | comments, line numbers |
| `--code-info` | `#7ac0ff` | keywords |
| `--code-a2` | `#5fd8c4` | `Server.*` objects |
| `--code-good` | `#62d69b` | strings |
| `--code-accent` | `#8e9cff` | highlight bar |

Highlighted line: `rgba(255,255,255,.12)` fill plus a 2px inset bar in `--code-accent`. Accent buttons on a code well use `--code-accent` as fill and `--code` as text.

## Tokens
| Token | Light | Dark |
|---|---|---|
| bg / bg2 | `#f5f5fd` / `#fbfbff` | `#000000` / `#050509` |
| surface / 2 / 3 | `#ffffff` / `#ececf9` / `#dcdcf0` | `#0c0c18` / `#151527` / `#212138` |
| border / strong / interactive | `#cacae6` / `#9898c8` / `#5c5c94` | `#303050` / `#4c4c7a` / `#9a9ad0` |
| text / 2 / 3 | `#0d0d24` / `#34345a` / **`#34345a`** | `#f3f3ff` / `#cecff0` / **`#cecff0`** |
| accent / strong / ink | `#3640c8` / `#2630a8` / `#ffffff` | `#8e9cff` / `#7482f5` / `#0a0c2a` |
| accent-2 | `#0a6a60` | `#5fd8c4` |
| danger / warn / good / info | `#a8281f` / `#7a4d00` / `#17663f` / `#1f5fa8` | `#ff8f86` / `#f0c45c` / `#62d69b` / `#7ac0ff` |

Soft tints: status colour at alpha .12 (light), .16 (dark). Bold values changed from the original Iris source.

## Interactions
- Light/Dark switches the theme (`data-theme`, persisted; existing switcher and persistence need no change).
- Everything else follows `layout-spec-10a.md`: top-level `view` tabs, recipe combobox, all five HTTP methods visible, "Insert into handler" returns to Logic Starter, report export Markdown and PDF only. Handler code uses `Server.*` objects; endpoint `/_api/serverlogics/<name>`.

## Differences from the earlier 10a references
1. Code wells are dark in light mode too.
2. Pill outlines use `--interactive-stroke`, not a hairline.
3. Inspector needs-review tiles are a surface card with a `--danger` border and a tinted glyph chip.
4. Dark mode is flat near-black with corner glows, not Glass Bento. Drop `backdrop-filter`.
5. Selected rows use a soft accent tint; filled accent is for pills and primary buttons.
6. Heavier Segoe UI (above); muted text darkened.

## Open items
- **Contrast.** The Iris token source states text 4.5:1 and strokes 3:1 were checked on colour values only. Darkening `--text3` can only raise contrast, but re-measure everything after build, including text on `--accent-soft`, `--danger-soft` and the glow backgrounds.
- **Missing Segoe.** On macOS or Linux the stack falls back to `system-ui`, which will look lighter than the reference. Confirm that is acceptable for non-Windows users.
- **Object list copy.** Rows after Logger, Context and Dataverse (User, HttpClient, Website, Sitesetting, EnvironmentVariable) have placeholder descriptions; method counts were dropped.
- **Tests.** Update tests that assert Porcelain values, labels or font weights.
- **Superseded.** `plum-light-oled.json` in the older handoff is not part of this theme.

## Assets
No images, no web fonts. Icons are text glyphs: `{ }`, `◇`, `◎`, `⇄`, `⌕`, `▾`, `✓`, `!`, `→`, `↓`.
