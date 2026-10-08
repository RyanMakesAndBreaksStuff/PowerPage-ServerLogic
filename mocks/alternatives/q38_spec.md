# q38 proto-2 alternate mock spec

Shared spec for the four `q38_proto2_alt_N.html` mocks. Each mock is ONE standalone HTML file
(all CSS inline in `<style>`, semantic CSS custom-property tokens in `:root`, no build step,
no JS frameworks; Google Fonts `<link>` allowed). Source of truth for content and layout
regions: `../proto-2.png` (read the image). Reference artifact shape: `proto2-alt-1.html`.

## Content inventory (reproduce ALL of it, desktop app-window framing incl. titlebar min/max/close glyphs)

1. Titlebar: "Logic Inspector (Preview)" + subtitle "XrmToolBox plugin for Power Pages".
2. Toolbar: Connection select "Contoso • Development"; Power Pages site select "Customer portal";
   Refresh button; primary button "Export report".
3. Left sidebar: heading "Server logic (3)"; search input placeholder "Search server logic";
   items: customer-summary / customer-summary.js (selected), contact-form-helper /
   contact-form-helper.js, order-validation / order-validation.js.
4. Main: eyebrow "Server logic"; H1 "Review server logic readiness"; intro "Inspect key
   configuration for this server logic before release to help identify access, permissions, and
   outbound networking considerations."; meta grid Name=customer-summary, File=customer-summary.js,
   Status=Active (success dot), Location=Site / Server logic; "Findings (3)" with columns
   Category / Finding / Status and rows:
   a. Web role assigned · Web role configuration — "Customers" / "This server logic is assigned to
      the Customers web role." — Configured (success)
   b. Table permissions · Dataverse access — "Review scope" / "This server logic is configured to
      access Dataverse tables." — Needs review (warning), SELECTED row
   c. Outbound networking · External requests — "All domains allowed" / "This server logic can make
      outbound HTTP requests to any domain." — Needs review (warning)
5. Right panel: "Table permissions" / "Dataverse access"; "What this means" paragraph: "This server
   logic is configured to access Dataverse tables. Review the tables and the level of access (such
   as read, write, or delete) to ensure they align with the principle of least privilege for the
   intended scenario."; info callout "Configuration review only." + "Confirm effective access with a
   real site user."; "Questions to consider" bullets: "Are the referenced tables required for this
   scenario?", "Is the scope of access appropriate for the web role?", "Do table permissions align
   with your organization's governance requirements?".
6. Footer banner: "Tenant outbound policy: not verified" + "This tool doesn't read tenant network
   policy. Verify outbound networking restrictions in your environment."; right side
   "Concept • illustrative findings".

## Hard requirements

- WCAG AA contrast (4.5:1) for all text/bg pairs; alt 4 targets 7:1.
- Visible `:focus-visible` rings; hover states; min 44px hit targets on interactive controls.
- Token experiment: semantic token names in `:root` plus a small unobtrusive swatch strip
  (footer corner or status bar) showing each token name + its color chip.
- After writing, re-read the file to confirm it saved completely and is well-formed.
