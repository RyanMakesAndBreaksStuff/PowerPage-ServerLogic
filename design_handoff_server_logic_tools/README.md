# Handoff: Server Logic and Server Objects (layout 10a)

Logic Starter and Server Objects, in the locked light and dark themes. Six static 1100×780 references in `reference/`:

| File | Screen | Theme |
|---|---|---|
| `01-logic-starter-light.html` | Logic Starter › Create Logic | Light, 11c Paper & Signal |
| `02-logic-starter-dark.html` | Logic Starter › Create Logic | Dark, 12e Glass Bento |
| `03-server-objects-light.html` | Server Objects | Light |
| `04-server-objects-dark.html` | Server Objects | Dark |
| `05-logic-inspector-light.html` | Logic Inspector | Light |
| `06-logic-inspector-dark.html` | Logic Inspector | Dark |

## 1. Navigation
- Top-level tabs, left to right: **Logic Starter**, **Server Objects**, Logic Inspector.
- Server Objects is promoted from a Starter sub-tab to its own tab, with icon `◇` in the server-object colour. Logic Starter keeps `{ }`, Logic Inspector keeps `◎`.
- The Starter sub-tab row (Create Logic / Server Objects) is removed. Create Logic is the Logic Starter tab itself.
- "Browse all in Server Objects" and "← Back to Create Logic" switch top-level tabs. "Insert into handler" switches back to Logic Starter and keeps the insertion point.
- Org and portal ("Contoso · Development" and the `customer-portal` pill) sit on the right of the title bar, before the window buttons, on every tab.

```ts
view: 'starter' | 'objects' | 'inspector'   // was starterTab: 'create' | 'objects'
```

## 2. Create Logic layout
Removing the 42px sub-tab row frees 42px, split in half.

| Area | Before | After |
|---|---|---|
| Top row (Logic name, HTTP method, Recipe, Readiness) | ~108px | fixed **129px** (+21px) |
| Request path strip | padding 10.5px 16px | padding **15.5px 16px** (+10px) |
| Editor headers (server and client) | 40px | **51px** (+11px each) |

- The four top tiles move up to sit directly under the title bar (12px content padding).
- Grid rows: `129px / minmax(0,1fr) / auto`. Columns: `220px repeat(3, minmax(0,1fr))`.
- Editor bodies keep `flex: 1`.
- All five HTTP methods (GET, POST, PUT, PATCH, DELETE) stay visible.

## 3. Recipe picker: 10 recipes
A **searchable combobox** replaces the pills.
- Caption "Recipe", with "10 recipes" at the right in muted text.
- Field: code-surface background, 1px border, **2px bottom border in the primary colour**, radius 4px, padding 6px 10px. Contents: `⌕`, selected recipe name (ellipsis), `▾`.
- Below the field: "Uses `<Server object>`" in 11.5px muted, object in mono and the server-object colour.
- Opening the field lists all 10 recipes with their `Server.*` object. Typing filters; ↑ ↓ and Enter select.

| # | Recipe | Server object | Default method |
|---|---|---|---|
| 1 | Read Dataverse records | `Server.Connector.Dataverse` | GET |
| 2 | Create a record | `Server.Connector.Dataverse` | POST |
| 3 | Update a record | `Server.Connector.Dataverse` | PATCH |
| 4 | Delete a record | `Server.Connector.Dataverse` | DELETE |
| 5 | Validate a request | `Server.Context` | POST |
| 6 | Call an external API | `Server.Connector.HttpClient` | GET |
| 7 | Read a site setting | `Server.Sitesetting` | GET |
| 8 | Read an environment variable | `Server.EnvironmentVariable` | GET |
| 9 | Current user profile | `Server.User` | GET |
| 10 | Log and trace | `Server.Logger` | GET |

Default methods for 2 to 4 and 7 to 10 are proposals. Selecting a recipe regenerates the handler, resets the permission check to "needs review" and sets the default method, which the user can change. Generated code for recipes 2 to 10 is not designed yet; check method names against Microsoft Learn ("Server objects") before building. Endpoint: `/_api/serverlogics/<name>`.

## 4. Themes
Light is **11c Paper & Signal**. Dark is **12e Glass Bento**.

| Token | Light 11c | Dark 12e |
|---|---|---|
| window | `#e8e8e4` | `#081022` + blue/orange aurora gradients |
| surface | `#f2f2ef` | transparent over window |
| tile | `#ffffff` | `#15203a` (glass `rgba(255,255,255,.07)`) |
| code | `#f7f7f5` | `#0b1328` |
| border | `#dcdcd6` | `rgba(255,255,255,.18)` |
| control border | `#dcdcd6` | `#3a4766` |
| text / text-2 / muted | `#111111` / `#33332f` / `#5f5f59` | `#eef4ff` / `#d3def2` / `#a9bbdc` |
| primary | `#111111` (on `#ffffff`) | `#5aa9ff`, text `#8fc6ff` (on `#06122b`) |
| needs review | `#c0261d` | `#ffa24a` |
| server objects, strings | `#4d6a1f` | `#c4a7ff`, strings `#a9d3ff` |
| keywords | `#b0231b` | `#ffb874` |
| comments, line numbers | `#5f5f59` | `#9fb0cd` |

- **Primary** marks selected pills, the active recipe underline, the Download button and "done" ring segments.
- **Needs review** is used only for status: the `! Permissions` pill, the unfinished ring segment, the `⇄` client-call icon and the Inspector tab icon.
- Highlighted code lines: 10% of the primary over the code surface, plus a 2px inset bar in the primary.
- Dark tiles use `backdrop-filter: blur(14px)` over the aurora background.

## 5. Accessibility
All text and surface pairs pass 4.5:1 (lowest 4.64:1 light, 5.99:1 dark). In dark, control outlines use the opaque `#3a4766`. In light, pill outlines are the hairline `#dcdcd6`; the selected state is a filled pill. Status is never colour-only: each has a glyph (`✓` or `!`) and a word.

## 6. Logic Inspector
References 05 and 06 show the Inspector (4a glass bento layout) in the same shell and themes. Content and behaviour are unchanged from the earlier Inspector spec; only the title bar (tabs, org and portal) and the tokens in section 4 changed. In the readiness ring, the blue or ink segment is OK and the review colour marks the two items that need review.
