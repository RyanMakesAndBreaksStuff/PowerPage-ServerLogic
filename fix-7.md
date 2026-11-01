# Seven Findings and Four Requested UI Updates

**Date:** 2026-11-01  
**Scope:** Logic Starter and Server Objects, reviewed against spec v4.0.1.  
**Severity:** Findings 1–7 are Medium. Items 8–11 are additional requested UI changes.  
**Source:** [Full review and evidence](findings/2026-11-01-starter-objects-review.md).  
**Additional source:** User request and supplied screenshots 1–4, 2026-11-01. Items 8–11 record requested work; implementation and rendered-browser verification are pending.

## 1. Recipe switching leaves obsolete table permissions on screen

**Location:** `src/features/server-objects/ContextColumn.tsx:87–94`  
**Requirements:** AC-3.6, AC-6.9.

**Finding:** Switching from Dataverse CRUD (R4) to Call a Dataverse custom API (R10) leaves the old `contact · Read, Write, Delete` grant alongside the current account grant. R4 has two grants for `contact`, but both rows use `key={table.logicalName}`. The duplicate keys cause incorrect reconciliation and misleading permission guidance.

**Recommended fix:**

- Give each grant a unique, stable identity that distinguishes the Account and Global grants.
- Use that identity as the React row key.
- Cover transitions between recipes with repeated table names.

**Verify:** After R4→R10, Permissions needed shows only R10's account grant, with no stale contact row.

## 2. Server Objects clips its context content at supported sizes

**Location:** `src/features/server-objects/serverObjects.css:300–315`; `src/components/primitives.css:8–16`  
**Requirements:** AC-3.6, AC-6.9, Accessibility minimum viewport.

**Finding:** With Microsoft Graph & SharePoint (R7) selected, the context cards clip the Back to Create Logic button, permissions/settings content, and Another sample at both 1100×780 and 1024×700. The cards shrink inside a fixed-height column and inherit `overflow: hidden`; scrolling does not reveal the missing content.

**Recommended fix:**

- Make the context column vertically scrollable and prevent its cards from collapsing, or give each card an explicit usable scroll area.
- Keep the back action, all required settings, and the additional sample reachable.

**Verify:** At both supported test sizes, all R7 context content can be reached with the mouse and keyboard.

## 3. Expanding R7's checklist collapses both code panes

**Location:** `src/features/starter/starter.css:4–16`; `src/features/starter/code/codePanes.css:56–61`  
**Requirements:** Story 4's editable side-by-side panes, FR-11 layout, Accessibility minimum viewport.

**Finding:** At 1024×700, selecting R7 and expanding View checklist reduces `.starter-code__panes` to 0px high. The fixed-height grid's automatic permission row consumes the available space, while `minmax(0, 1fr)` permits the code row to collapse. The document does not grow enough to recover the editors by scrolling.

**Recommended fix:**

- Bound the expanded checklist's height and make its content scrollable, or preserve a usable minimum editor height and allow the page to scroll.
- Keep both code panes usable while the checklist is expanded.

**Verify:** At 1024×700 with R7's checklist open, both editors remain visible and operable, and every checklist item remains reachable.

## 4. Searching for a member prevents selecting another member

**Location:** `src/features/server-objects/ServerObjectsPage.tsx:32–42`; `src/features/server-objects/objectList.ts:46–59`  
**Requirements:** AC-6.4a, AC-6.6.

**Finding:** Searching for GetAsync and then selecting PostAsync leaves GetAsync selected. `reselect()` runs on every render and immediately replaces a deliberate member selection that does not match the active query.

**Recommended fix:**

- Apply search-driven selection when the query or filter changes.
- Repair selection when its object leaves the visible list.
- Preserve subsequent explicit member selections while that object remains listed.

**Verify:** After searching for GetAsync, selecting PostAsync through either its pill or table control updates the selected member, signature, and sample. Search/filter changes still select a valid result and handle empty results correctly.

## 5. Generated demo pages do not validate response envelopes consistently

**Location:** `src/services/generators/handlers/demoPages.ts:60–76` and `:679–695`  
**Requirements:** AC-3.9, FR-3 client contract, Learn correction 8.

**Finding:** The R4, R5, and R6 demo pages accept a response containing successful `data` without requiring envelope `success: true`. They check only `success === false`. A response with `{ success: true, data: 'null' }` also reaches an unguarded `payload.status` access: R4/R5 throw from their response callback; R6 throws inside `showEnvelope`, although its outer fetch chain catches the exception.

**Recommended fix:**

- Validate the envelope and require `success === true` before consuming `data`.
- Preserve the explicit failure-envelope path and its readable error message.
- Guard JSON parsing and validate the decoded payload before reading `status`.
- Apply the corrected envelope-handling rules consistently to all three demo pages.

**Verify:** Valid success responses still work. Missing or invalid success flags, malformed JSON, and JSON `null` produce readable errors without invoking application-success callbacks or updating tables as though the request succeeded.

## 6. Keyboard recipe navigation moves the active option out of view

**Location:** `src/features/starter/inputs/RecipeCombobox.tsx:48–55`; `src/features/starter/starter.css:143–150`  
**Requirements:** AC-3.1 and the APG combobox accessibility requirement.

**Finding:** Opening the recipe picker on R1 and pressing ArrowDown nine times activates R10 without scrolling it into view. Enter selects the off-screen recipe, but a sighted keyboard user cannot see the active choice. Browsers do not automatically scroll elements referenced by `aria-activedescendant`.

**Recommended fix:**

- Scroll the active option into the listbox's visible area when keyboard navigation changes it.
- Keep the active descendant and visible highlight synchronized while retaining focus in the combobox input.

**Verify:** Arrow navigation through all ten recipes keeps the active option visible, including at the bottom of the list and when wrapping. Enter selects the visible active option; Escape closes the popup.

## 7. Host-event cleanup does not remove PPTB 1.2.7's listener

**Location:** `src/services/pptb/pptbHost.ts:84–99`  
**Requirement:** FR-12, remove the host event subscription on unload.

**Finding:** Desktop 1.2.7 wraps the callback passed to `events.on()` and returns a disposer for that wrapper. The adapter ignores the disposer and calls `off(hub)`, which cannot remove the registered wrapper. A fixture matching the pinned host implementation delivers one event twice after resubscription and still delivers events after `pagehide` cleanup. Types 1.2.7 declare the return as `void`, masking the runtime contract difference.

**Recommended fix:**

- Retain the value returned by `events.on()`, capturing it as `unknown` and narrowing it to a function where necessary.
- Invoke the retained disposer on the last unsubscribe and on `pagehide`.
- Verify actual event delivery after cleanup and resubscription, rather than only asserting that `off()` was called.

**Verify:** One event produces one callback after resubscription, and no callback reaches the application after cleanup. Confirm the behavior on the installed Insider version; the existing evidence is tied to Desktop 1.2.7 source and a matching mock fixture.

## 8. Reduce oversized action buttons on Server Objects and Logic Starter

**Location:** `src/features/server-objects/ObjectDetail.tsx`; `src/features/server-objects/InsertButton.tsx`; `src/app/CopyButton.tsx`; `src/features/server-objects/serverObjects.css`; `src/features/starter/download/DownloadStarterButton.tsx`; `src/features/starter/starter.css`; shared button sizing in `src/components/Button.tsx` and `src/components/primitives.css`.  
**Reference:** Screenshots 1 and 2.

**Requested change:** Reduce the size of **Copy** and **Insert into handler** in the Server Objects sample toolbar, and **Download starter** on the Logic Starter page. Their current height and visual weight dominate the surrounding content.

**Recommended fix:**

- Reduce button height and padding, with proportionate label and icon sizing, using the established design tokens and button styles.
- Keep Copy and Insert into handler compact and aligned in the sample toolbar. Bring Download starter's height and icon/label spacing into proportion with the adjacent Start over action while retaining its primary emphasis.
- Scope the sizing change to these actions, or use an explicit shared size variant, so other button usages do not shrink unintentionally.
- Preserve readable labels, accessible pointer targets, visible keyboard focus, busy/disabled states, copy feedback, insertion behavior, and ZIP download behavior.

**Verify:** Compare both pages with screenshots 1 and 2 at 1100×780 and 1024×700 in both themes. The three actions are visibly smaller, labels and icons remain aligned without clipping, and mouse/keyboard activation still performs the expected action.

## 9. Completely remove the request-path component

**Location:** `src/features/starter/StarterPage.tsx`; `src/features/starter/code/RequestPathStrip.tsx`; `src/features/starter/code/codePanes.css`; related layout rules in `src/features/starter/starter.css`.  
**Reference:** Screenshot 3 and the repeated strip in screenshot 4.

**Requested change:** Remove the entire request-path strip showing Page script → Token → Endpoint → Handler → Returns from Logic Starter.

**Recommended fix:**

- Remove the `RequestPathStrip` import and render from StarterPage, delete the component, and remove styles and tests used only by this strip. Remove its helper only if it has no remaining consumers.
- Adjust the surrounding layout so the code panes follow the input tiles without an empty row, placeholder, or reserved strip spacing. Apply the removal to HTTP and Liquid views.
- Update expectations tied to AC-4.8, which previously required the strip. This request supersedes that visual requirement; generated endpoints, client calls, and handler code must continue to work.

**Verify:** Neither HTTP nor Liquid mode renders a Request path region or any part of the strip. The code panes use the recovered space, including with R7's checklist expanded as covered by finding 3.

## 10. Make HTTP-method pills clickable recipe filters

**Location:** `src/features/starter/inputs/StarterInputs.tsx` (`MethodTile`, `RecipeTile`); `src/features/starter/inputs/starterOptions.ts`; `src/features/starter/inputs/RecipeCombobox.tsx`; method/recipe transitions in `src/app/starter-session/starterReducer.ts`; recipe metadata in `src/services/catalogue/recipes.ts`.  
**Reference:** Screenshot 4.

**Requested change:** Make GET, POST, PUT, PATCH, and DELETE clickable. Preserve the current selected-pill appearance. Selecting a method filters the recipe dropdown to recipes that support that method.

**Recommended fix:**

- Allow every method pill to be activated by pointer and keyboard, including methods the currently loaded recipe does not export. Replace the current recipe-dependent disabling behavior for these filter controls; this supersedes the corresponding AC-2.10 behavior.
- Keep one active method filter and the existing selected/unselected visual treatment. Derive eligibility from each recipe's exported handler functions using the catalogue's method mapping, rather than its name, default method, or a separate hardcoded recipe list.
- Combine method filtering with the existing text search, omit empty groups, and update the displayed recipe count to match the available results. Show a clear empty state when no recipes match.
- Provide a way to clear the HTTP filter and restore the complete catalogue, including Liquid-only R8. Exclude R8 while an HTTP-method filter is active.
- Keep the recipe filter distinct from the loaded handler's valid invocation method when necessary. Filtering alone must not silently replace a recipe or discard handler edits. Choosing a different recipe must retain the existing discard-edits confirmation.
- When a matching recipe is chosen, use the selected HTTP method instead of resetting to that recipe's default method. Keep the generated client call and handler target consistent, and repair the dropdown's active option whenever its filtered results change.

**Verify:** Starting with a GET-only recipe, activate POST, PUT, PATCH, and DELETE in turn. Each pill responds and retains the existing selected styling; the open dropdown contains only recipes exporting the selected method's handler. Text search further narrows those results and the count agrees. Selecting a matching multi-method recipe retains the chosen method. Clearing the filter restores all recipes, including R8. Filtering preserves edited code; switching recipes still requires the existing confirmation before discarding edits.

## 11. Make the recipe dropdown arrow operate the dropdown

**Location:** `src/features/starter/inputs/RecipeCombobox.tsx`; combobox styles in `src/features/starter/starter.css`; coverage in `src/features/starter/inputs/RecipeCombobox.test.tsx`.  
**Reference:** Screenshot 4. Related keyboard visibility issue: finding 6.

**Requested change:** Make the recipe picker behave as a true dropdown. Clicking its down arrow must open the recipe list; the arrow currently renders as a decorative `Icon` without a click handler.

**Recommended fix:**

- Turn the chevron into a real dropdown toggle with an accessible name, expanded state, and relationship to the listbox. Clicking the arrow opens the list and clicking it again closes the list.
- Preserve field-click opening and existing searchable-combobox behavior. Opening through either the field or the arrow must show the same method-filtered recipes from item 10.
- Handle focus and blur so interacting with the toggle or an option does not immediately dismiss the popup before the action completes. Selecting an option commits it and closes the list; Escape and clicking outside dismiss it without changing the recipe.
- Support keyboard activation of the toggle and existing arrow-key/Enter navigation. Apply finding 6's active-option scrolling to the filtered list as well.

**Verify:** Click directly on the chevron, select a visible recipe, reopen, and close using the chevron, Escape, and an outside click. Repeat with keyboard-only interaction and an active HTTP-method filter. Expanded state, focus, visible active option, selected recipe, and discard-edits confirmation remain synchronized.
