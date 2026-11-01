# New recipe candidates

Candidates found in Power Pages and Power Platform blogs (searched 2026-11-01). None is approved or in the spec yet. They extend the existing R1–R10 catalogue.

## Summary

| # | Candidate | Primary source | Overlaps existing |
|---|---|---|---|
| R11 | Real-time Dataverse read (cache bypass) | [MS blog: Server Logic enhancements](https://www.microsoft.com/en-us/power-platform/blog/power-pages/power-pages-server-logic-preview-enhancements/) | R1 (read) |
| R12 | Cross-entity search | [MS blog: agentic code skills](https://www.microsoft.com/en-us/power-platform/blog/power-pages/build-your-server-side-logic-with-ai-new-power-pages-agentic-code-skills/) | R1 (read) |
| R13 | Order submission with inventory check | Same MS post | R2 (validate) |
| R14 | Ownership-checked Dataverse write | [PowerPortals: Render-Mutate-Refresh](https://powerportals.de/en/blog/power-pages-render-mutate-refresh-pattern/) | None (first write recipe) |
| R15 | Liquid list with server refresh | Same PowerPortals post | R8 (Liquid) |

## R11: Real-time Dataverse read (cache bypass)

- **Problem:** Power Pages caches Dataverse data for up to about 15 minutes, so a record created or changed outside the site can be stale.
- **Behaviour:** A GET reads the table with the cache skipped when `skipcache=true` is passed. Default is `false`.
- **Object:** `Server.Connector.Dataverse.RetrieveMultipleRecords(entitySetName, additionalParameters, skipCache)`. Confirm the exact signature on Learn before implementing.
- **Methods:** GET.
- **Permissions:** Read on the table for the web role. Table permission scope as in R1.
- **Caveats:** Microsoft's post says use the bypass selectively because it affects performance. The feature is in preview per the post and ReadyXRM.
- **Sources:** [MS blog](https://www.microsoft.com/en-us/power-platform/blog/power-pages/power-pages-server-logic-preview-enhancements/), [ReadyXRM: Cache Conquered](https://readyxrm.blog/2026/02/18/power-pages-cache-conquered/), [Learn: Server objects](https://learn.microsoft.com/en-us/power-pages/configure/server-objects#dataverse).

## R12: Cross-entity search

- **Problem:** A single search across several tables (for example products, orders and knowledge articles) cannot run from the browser in one call.
- **Behaviour:** A GET takes a query string, queries each table, and returns one ranked list. Each result carries its table name.
- **Object:** `Server.Connector.Dataverse` for each table. `Server.Context.QueryParameters` for the query.
- **Methods:** GET.
- **Permissions:** Read on each table. The MS example uses Authenticated Users.
- **Caveats:** Keep result counts bounded and check each table's `$top`. Use loops, not array callbacks (see the constraints below).
- **Sources:** [MS blog: agentic code skills](https://www.microsoft.com/en-us/power-platform/blog/power-pages/build-your-server-side-logic-with-ai-new-power-pages-agentic-code-skills/).

## R13: Order submission with inventory check

- **Problem:** An order must not be accepted when the requested quantity exceeds stock. The check needs a server-side read of another table before the write.
- **Behaviour:** A POST reads the inventory row for each line. If any line exceeds stock, it returns an error and writes nothing. Otherwise it creates the order.
- **Object:** `Server.Connector.Dataverse` (read inventory, create order). `Server.Context.Body` for the request.
- **Methods:** POST.
- **Permissions:** Read on the inventory table. Create on the order table. Both for the web role.
- **Caveats:** The check and the write are not one transaction. A concurrent order can pass the check. Say so in the recipe comment or document it.
- **Sources:** [MS blog: agentic code skills](https://www.microsoft.com/en-us/power-platform/blog/power-pages/build-your-server-side-logic-with-ai-new-power-pages-agentic-code-skills/).

## R14: Ownership-checked Dataverse write

- **Problem:** A client-side write can be changed by the caller. The server must check the caller and the fields before it writes.
- **Behaviour:** A PUT checks `Server.User` is not null, parses the body, whitelists the field names and values, then updates the record.
- **Object:** `Server.User`, `Server.Context.Body`, `Server.Connector.Dataverse.UpdateRecord`, `Server.Logger`.
- **Methods:** PUT.
- **Permissions:** Update on the table for the web role. Use Contact scope where the data model allows it, so the platform enforces ownership.
- **Caveats:** Never trust a field name from the request. Whitelist the names and the values.
- **Sources:** [PowerPortals: Render-Mutate-Refresh](https://powerportals.de/en/blog/power-pages-render-mutate-refresh-pattern/), [Learn: Server objects](https://learn.microsoft.com/en-us/power-pages/configure/server-objects).

## R15: Liquid list with server refresh

- **Problem:** A list must render at once without a spinner, and the user must be able to resync it without a reload.
- **Behaviour:** Liquid renders the first list (FetchXML). A GET endpoint returns the same list on refresh, and the client rebuilds the DOM from it.
- **Object:** `Server.Connector.Dataverse` for the GET. Liquid for the first render.
- **Methods:** GET.
- **Permissions:** Read on the table. Liquid and server logic both need it.
- **Caveats:** The markup is written twice (Liquid and JavaScript) and can drift. Keep both in one file and review them together.
- **Sources:** [PowerPortals: Render-Mutate-Refresh](https://powerportals.de/en/blog/power-pages-render-mutate-refresh-pattern/).

## Constraints that apply to every new recipe

From [PowerPortals: 4 hidden constraints](https://powerportals.de/en/blog/power-pages-server-logic-hidden-constraints/). These are field reports, not documentation. Retest before relying on them.

- Function expressions assigned to a `const` return HTTP 400. Declare helper functions inside `get()`, `put()` or the other handler.
- Anonymous callbacks to `map`, `filter`, `sort` and `forEach` return HTTP 400. Use `for` loops.
- The Dataverse connector returns a string, and `Body` is a string too. Parse twice.
- `Server.Connector` entity set names are plural (`accounts`, not `account`).
- The blocked keyword list includes `delete`, `prototype` and `setTimeout(`. Name the DELETE handler `del`.

## Open items before adding to the spec

- Confirm each object name and signature against Learn. The blog examples are secondary sources.
- Decide whether R11 (preview) is in scope while the feature is in preview.
- Decide whether R15 is a recipe or a note on R8.
- Add version bump, FR-3 rows, and AC entries per the SDD workflow once approved.
