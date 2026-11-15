# P5.5 owner choices

**Date:** 2026-11-02
**Status:** Revised 2026-11-02 after supervised review (`docs/plans/p5-5_supervised-review.md`); owner picks recorded 2026-11-02 (D-10 A, D-16 A, D-18 A, D-19 C, D-21 B).
**Plan:** `docs/plans/p5-5_plan.md` (app-scoped Inspector session and finished Inspector page), baseline `1e0156b`, spec 4.2.0.
**Purpose:** the decisions the plan could not settle from the spec (4.2.0), the brief (`phasse5plan.md`) or the design handoff alone. Each entry records the context, the option the plan adopts, the alternatives, and what changes if the owner picks differently. Approving the plan approves the "Adopted" option unless a different one is named here. Where the spec and the design disagree the spec wins; no spec edit is needed for any of these.

**Owner reply (2026-11-02):** D-02 C ("Scan again"), D-03 C, D-05 B, D-09 B, D-14 B, D-16 B. No change was named for the other ten, which take their Adopted option when the plan is approved. The owner asked for the picks to be recorded only: `p5-5_plan.md` carried the Adopted options for these six; the picks were applied to the plan on 2026-11-02.

How to answer: edit the **Owner decision** line of each entry (Adopted / option letter / notes), or reply in chat with the IDs.

---

## D-01 — No Stop control; a running scan is replaced, never stopped (P5.5)

**Context.** The brief lists a "stopped/partial" state and the spec produces it only from connection loss (AC-7.10, `facts.stopped === 'connection-lost'`). Neither the spec nor the design names a Stop button, and a stopped scan would have to be reported as something other than AC-7.10's.

**Adopted.** No Stop control. Selecting another site, rescanning or a connection change supersedes the running scan (its reads are aborted and awaited, its facts are never shown). "Stopped" in the UI always means connection loss, with the `Connection lost. Reconnect and rescan.` banner and the partial results.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: no Stop** | Nothing in the spec to implement against; no new state; a user who picked the wrong site just picks another. | A very long scan (more than 50 records) cannot be abandoned without choosing something else. |
| **B. Stop button during a scan that keeps the partial results as "stopped by the user"** | Gives control over a long scan. | Needs a new facts state the reader and the report do not have, new report wording and an AC-9.1 rule for it. |
| **C. Stop button that discards the scan and returns to "Select a site"** | Simple; no partial result to explain. | An action the spec never mentions; discards evidence the user may want. |

**Owner decision:** pending

---

## D-02 — Rescan: label "Rescan", shown only when it can complete (P5.5)

**Context.** The spec says "a rescan replaces the results" (AC-7.6, AC-7.10) but gives no label or place for the control. The brief says "Rescan replaces prior results" and "show only actions that can complete".

**Adopted.** A ghost button labelled **Rescan** with a refresh glyph. It sits in the title tile (where the design puts the Export action, which P5.7 adds beside it) and in the failed-scan panel. It is not shown while a scan runs, when no site is selected, or in any connection or site-list state. The site-list error state has **Retry** instead (Error Scenarios).

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: "Rescan" in the title tile and the failed panel** | One word; where a user looks after reading results; P5.7 can place Export next to it. | A user must select a site before a rescan exists. |
| **B. "Rescan" always visible in the title bar next to the picker** | Reachable from every state. | Disabled in most states, which the brief's "show only actions that can complete" argues against. |
| **C. "Scan again" or "Refresh"** | Plainer for non-technical users. | The spec and brief say "rescan" throughout; "Refresh" suggests a cheap re-read. |

**Owner decision:** Option C, label **Scan again** (2026-11-02). Placement and visibility stay as drafted: a ghost button with a refresh glyph in the title tile and the failed-scan panel, not shown while a scan runs, with no site selected, or in any connection or site-list state. Applied to the plan on 2026-11-02 (the plan now says "Scan again").

---

## D-03 — Which file and finding are selected after a scan (P5.5)

**Context.** AC-8.3 selects the first Needs-review finding of a selected file, else the first finding. Nothing says which file is selected after a scan. The brief reads "Select the first Needs-review finding initially, falling back to the first check". The design reference shows the first file selected.

**Adopted.** The first file in list order (server order) is selected; within it, the first Needs-review finding, else the first check. A finding the user picks (or marks or undoes) is remembered for that file until the next scan; switching files applies the same rule to the new file.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: first listed file** | Predictable; matches the design reference and the rail order. | With many files the first one may be fully configured while a later one needs review. |
| **B. First file that has a Needs-review finding, else the first file** | Lands the user on work to do. | The rail highlight can sit away from the top, and the rule is the brief's wording stretched across files. |
| **C. No file selected until the user chooses** | No guess. | Violates AC-8.1, which shows a ring, tiles and detail for "a selected file". |

**Owner decision:** Option C (2026-11-02). After a scan no file is selected: the files rail lists the files with none highlighted, and the ring, finding and detail cells show a prompt to choose a file. Once the user picks a file, AC-8.3 applies (the first Needs review finding, else the first check), and a finding the user picks is remembered for that file until the next scan. The con above overstates the conflict: AC-8.1 applies "Given a selected file", so no spec edit is needed. The prompt copy and what the title tile shows without a file are authored when the plan is revised.

---

## D-04 — Picker label before, during and after a selection (P5.5)

**Context.** AC-1.2 says the pill reads "No site selected" until a site is chosen and defines nothing for loading, error, no-sites or a selected site. AC-1.3 requires it disabled with no connection.

**Adopted.** The label is **No site selected** in every state without a selection; when the control cannot open it is `aria-disabled` and shows its reason on hover and focus: "Select a connection in Power Platform ToolBox first.", "Waiting for the active connection.", "Loading sites…", "Couldn't load sites. Open Logic Inspector to retry.", "No Power Pages sites in this environment.". After a choice the label is the site name (the full name is the tooltip and the accessible name of the value). Each option shows the name, the domain and, for an inactive site, an "Inactive" tag.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: placeholder stays, reason on hover and focus** | Matches AC-1.2 literally; one label to learn; reuses the F47 disabled-reason pattern. | "Loading sites…" is not visible without hovering (the page body says it). |
| **B. Label changes to "Loading sites…", "Sites unavailable", "No sites"** | State visible in the title bar. | Contradicts "reads No site selected until a site is chosen". |
| **C. Label shows name and domain after selection** | More context. | Long; the title bar is already tight at 1024 px. |

**Owner decision:** pending

---

## D-05 — "Unknown" connection state: never called "Not connected" (P5.5)

**Context.** WR-005 requires a refresh failure to be distinct from a confirmed disconnect. Before any read has succeeded there is no confirmed identity: the read may be pending or may have rejected (the S1 probe saw a rejection after about 10 s). The spec defines "Not connected" only for no active connection (AC-1.3).

**Adopted.** `ConnectionState` is `unknown | disconnected | connected`, each with a `refreshFailed` flag. The title bar reads "Checking connection…" while the first read is pending and "Connection unavailable" after it rejected; "Not connected" is for a confirmed null only. The page shows "Checking the active connection" or "Couldn't read the active connection" with the sentence "This page tries again when the window regains focus or the connection changes." There is no Retry button, because the retry triggers are the spec's (events, focus, visibility). After a connection was confirmed, a later rejection keeps it, adds a notice "Couldn't refresh the active connection. This page keeps what it last confirmed and tries again when the window regains focus." and clears nothing. `useActiveConnection()` still returns `Connection | null` (null while unknown).

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: three-state union, distinct title-bar text, no button** | Honest; the focus and visibility triggers are the specified recovery; no action that cannot be shown to complete. | The "Checking connection…" text flashes once at start-up (it replaces a flash of "Not connected"). |
| **B. Same as A plus a Retry button** | A user can retry without leaving the window. | Needs a refresh function on the context; focus and events already retry. |
| **C. Treat unknown as "Not connected"** | Smallest change. | Reintroduces the WR-005 bug in the title bar. |

**Owner decision:** Option B (2026-11-02). Everything in the adopted option stays (three-state connection, "Checking connection…" and "Connection unavailable", nothing cleared by a later rejection), plus a **Retry** button that re-reads the active connection. It appears on the "Couldn't read the active connection" panel and in the "Couldn't refresh the active connection…" notice, only after a read has rejected, and is hidden while a read is in flight. The ConnectionProvider context gains a refresh function. Focus, visibility and `connection:*` events still retry as before. Applied to the plan on 2026-11-02.

---

## D-06 — Copy the spec does not give verbatim (P5.5)

**Context.** The spec gives exact text for some states (AC-7.1 says only that Inspector "tells them to select a connection in ToolBox"; AC-7.4, AC-7.5, AC-7.8, "Couldn't load sites") and none for the rest.

**Adopted.** Spec strings are used verbatim. Authored text: disconnected "No active connection" / "Select a connection in Power Platform ToolBox to inspect a site."; site-list loading "Loading sites" / "Reading the Power Pages sites in this environment."; site list failed "Couldn't load sites" + the host's plain-language reason + **Retry**; nothing selected "Select a site" / "Choose a Power Pages site in the title bar to scan its server logic."; scanning "Scanning <site>" with "Reading server logic records…" and then "Scanned X of N" (when N is only the records found so far: "Scanned X of N found so far. The record list is incomplete."); scan failed "Couldn't scan <site>" / "The scan stopped because of an unexpected error. Nothing was kept." + **Scan again**; nothing read before a stop "No server logic records were read." The polite live region says only "Loading sites.", "Scanning <site>.", "Scan finished. N server logic files.", "Scan stopped. The connection was lost." and similar, never the running count, so a long scan does not repeat. Mark and Undo announce "Marked as reviewed: <check>." and "Review undone: <check>." in a second region.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: short plain sentences, announcements on transitions only** | Consistent with the existing tone; does not interrupt a screen reader. | Counts are not announced during a scan (they are visible text). |
| **B. Announce every progress change** | More information for screen-reader users. | The "repeatedly interrupt" behaviour the brief forbids. |
| **C. Announce at fixed intervals (for example every 10 records)** | Middle ground. | Needs a timer or a threshold rule and its tests, for little gain. |

**Owner decision:** pending

---

## D-07 — Where the non-development warning shows (P5.5)

**Context.** AC-7.5 and AC-7.11 want a "persistent warning" when the connection's environment label is Test, UAT, Production or Unknown, with scanning still available. AC-7.6 says a relabel updates "the title bar and the AC-7.5 warning". No place is given.

**Adopted.** A persistent notice at the top of the Inspector page, above every state, whenever the confirmed connection is not Dev: "This isn't a development environment. Inspector is designed for dev sites." It reads the live connection from the ConnectionProvider, so a relabel updates it without clearing results, and it never blocks a read or a scan. It is not shown on the other pages.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: top of the Inspector page** | Visible when it matters (the page that reads the site); follows relabels. | Not visible from Starter or Server Objects (which do not read sites). |
| **B. In the title bar next to the connection** | Visible on every tab. | The title bar has no room at 1024 px for a sentence. |
| **C. In the title tile once a site is scanned** | Near the results. | Not shown before a site is chosen, but AC-7.5 says "when Inspector connects". |

**Owner decision:** pending

---

## D-08 — Ring label and legend follow the spec, not the design (P5.5)

**Context.** The design shows the label "configured" and the legend "1 OK / 2 review". AC-8.1 requires "K/3 addressed" with the legend "C configured · V reviewed · M review" (plus "· U not scanned").

**Adopted.** The spec wins: the `Ring` label is "addressed" (so the centre reads "2/3" over "addressed" and the accessible name is "2 of 3 addressed") and the legend is the existing `ringLegend` text. Configured and Reviewed both draw as done segments; Not scanned draws grey.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: spec wording** | Matches AC-8.1 and the report model; no new copy. | Differs from the static design reference. |
| **B. Design wording ("configured", "OK / review")** | Matches the picture. | "OK" would hide Reviewed and Not scanned; contradicts AC-8.1. |

**Owner decision:** pending

---

## D-09 — No Export button or dialog in P5.5 (P5.5)

**Context.** The design reference shows "Export report ↓" in the title tile; AC-7.4 and AC-7.8 say "Export report is disabled". The brief gives export (the button, the dialog, saving) to P5.7 and says a slice must show only actions that can complete.

**Adopted.** P5.5 renders no export control at all. The "disabled" requirements are vacuously true until P5.7, which adds the button, enabled only for a finished or stopped scan with at least one file. The session exposes `result`, `fileId`, `marks` and `generation` for P5.7 to capture and to detect a changed result.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: absent** | Compiles and ships without P5.7; no dead button. | AC-7.4, AC-7.8 and AC-9.1 cannot be exercised until P5.7. |
| **B. A permanently disabled "Export report" with a reason** | Matches the design and the AC wording. | A control that never works in this slice; P5.7 would then change it. |

**Owner decision:** Option B (2026-11-02). The title tile shows an **Export report** button that is always disabled in P5.5 (`aria-disabled`, with its reason on hover and focus, the F47 pattern), so the "Export report is disabled" wording of AC-7.4 and AC-7.8 holds literally. The reason text is authored when the plan is revised. P5.7 enables it for a finished or stopped scan with at least one file. Applied to the plan on 2026-11-02.

---

## D-10 — Site banners: one list above the files, no duplicates (P5.5)

**Context.** `evaluateSite` returns every site notice in `banners`, including "Inventory incomplete. Reconnect and rescan." and "Connection lost. Reconnect and rescan.". AC-7.3 says the first shows in the files tile; AC-7.10 calls the second a prompt; AC-7.9 and AC-7.12 say "a banner above the files tile".

**Adopted.** All banners render once, in the order the model returns them, as one "Site notices" list above the grid (so above the files tile), with a glyph and the model's text with Markdown backticks removed. Nothing is re-derived or shown twice.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: one list above the grid** | One source (the model); no duplicated text; satisfies "above the files tile". | AC-7.3's "in the files tile" is read as "next to" it. |
| **B. Inventory and connection-lost texts inside the files tile, others above** | Literal to AC-7.3. | Needs the page to recognise banner texts, which the brief says not to re-derive. |

**Consequence (2026-11-02).** AC-7.3's "Inventory incomplete. Reconnect and rescan." renders in the Site notices list above the grid rather than inside the files tile; recorded as a D-10 consequence, no spec edit.

**Owner decision:** Option A (2026-11-02), with the consequence above confirmed.

---

## D-11 — Zero files after an incomplete or stopped scan (P5.5)

**Context.** AC-7.4's empty state "No server logic found on this site" is for a site with none. A scan that lost the connection before the inventory finished also yields zero files.

**Adopted.** "No server logic found on this site" shows only when the inventory is complete and the scan did not stop. Otherwise the files tile reads "No server logic records were read." beside the "Inventory incomplete…" and "Connection lost…" banners and the Scan again action.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: two texts** | Never claims a site is empty when it was not read. | One more string. |
| **B. Always "No server logic found"** | Simpler. | False for an interrupted read. |

**Owner decision:** pending

---

## D-12 — Detail tile keeps its single 10a cell and scrolls (P5.5)

**Context.** Layout 10a gives the detail tile one grid cell (about 235 × 235 px at 1024 × 700). The spec requires the title, category, status, guidance, questions, original reasons, notes and the snapshot there.

**Adopted.** The 10a grid is followed literally (ring tile in column 2 spanning rows 2–3; the three findings in columns 3–4; the detail tile in column 4, row 3). The detail tile scrolls inside its cell and is a focusable region so the keyboard can scroll it. A rendered check on the fake host showed it is usable but tight.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: literal 10a, scrolling cell** | Matches the approved layout. | A lot of content in a small cell. |
| **B. Detail tile spans columns 3–4 in row 3; the third finding moves to column 2 row 3** | Twice the width. | Departs from 10a and splits the findings. |
| **C. Detail as a side panel or modal** | Room for everything. | A new pattern; hides the ring and tiles. |

**Owner decision:** pending

---

## D-13 — Picker keyboard details the APG leaves open (P5.5)

**Context.** APG select-only combobox: arrows move the highlight, Enter and Space commit, Escape cancels, blur and Tab commit the highlighted option. Here a commit starts a scan that reads many rows, and inactive sites must be disabled.

**Adopted.** Closed: Down, Up, Alt+Down, Enter and Space open on the selected site (or the first active one); Home and End open on the first or last; a typed letter opens and moves. Open: arrows, Home, End and type-ahead (600 ms buffer) only move the highlight; inactive options can be highlighted so they can be read but never committed; Enter and Space commit an active option; Alt+Up commits; Escape cancels. Tab commits only if the highlight was moved since opening, otherwise it just closes. A click away or a blur closes without committing. Choosing the already selected site does nothing.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted** | A stray Tab or click never starts a scan; disabled options still reachable and readable. | Differs from the APG sample (commit on blur and on every Tab). |
| **B. APG sample behaviour (commit on blur and on Tab)** | Exactly the pattern. | Tabbing past the control scans the highlighted site. |
| **C. Arrow keys skip inactive options** | Matches a native `select`. | Screen-reader users never meet the inactive sites. |

**Owner decision:** pending

---

## D-14 — A scan whose identity changed, and a scan that fails (P5.5)

**Context.** `runScan` rejects with `ScanAbandonedError` when the active connection changed while it ran, and with other errors on unexpected failures. The ConnectionProvider normally reports the change a moment later.

**Adopted.** `ScanAbandonedError` discards the scan and returns the page to "Select a site" with no message (the provider's event or the next focus supplies the new identity and reloads the sites). `AbortError` raised by the session's own signal is a cancellation and changes nothing. Any other rejection is a "Couldn't scan <site>" state with Rescan; only the error name is logged.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: silent reset for a changed identity** | The results are never shown (AC-7.6); no message about a state the provider is about to replace. | If the change event never arrives the user sees a bare "Select a site". |
| **B. Show "The connection changed while scanning" until the provider catches up** | Explains the reset. | A fourth scan state for a transient case. |

**Owner decision:** Option B (2026-11-02). `ScanAbandonedError` still discards the scan, so its results are never shown (AC-7.6), but the page now shows **The connection changed while scanning** until the ConnectionProvider adopts the new identity, which clears the session as before. The site picker stays usable throughout. `AbortError` from the session's own signal and the failed state for other errors are unchanged. Accepted consequence: if the change event never arrives, the message stays until the next focus or visibility re-read or a new site choice. Applied to the plan on 2026-11-02.

---

## D-15 — Title bar: long connection names are cut with a tooltip (P5.5)

**Context.** The brief's file list omits `TitleBar.tsx` and `shell.css`, but the label now has an unknown state and a rendered check at 1024 px showed a long connection name pushing the site picker off screen (horizontal scroll at the 1024 × 700 minimum).

**Adopted.** The connection label ellipsizes (`min-width: 0`, `text-overflow: ellipsis`) and carries its full text as a tooltip; the picker never shrinks. `TitleBar.tsx` and `shell.css` are in the plan's file list.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: cut the connection label** | Picker always on screen; full text in the tooltip and the DOM. | The visible label can be shortened. |
| **B. Cut the site picker** | Connection stays whole. | The control the user operates is the one truncated. |
| **C. Leave it** | No change. | Breaks the 1024 × 700 minimum for long names. |

**Owner decision:** pending

---

## D-16 — The site list reloads on a changed identity, Retry and mount only (P5.5)

**Context.** AC-7.6 says the site list reloads when the active connection changes. AC-7.6 (spec.md L289) explicitly covers a same-identity `connection:*` event and says only the title bar and the AC-7.5 warning update, with results and review marks kept. Every `connection:*` event re-reads the connection. With Option A the plan stays within AC-7.6 for same-identity events; D-19 C is the only spec delta (see D-19).

**Adopted.** The list loads when a connection is first confirmed, when its id or URL changes, and on Retry. A same-identity event (rename, relabel, another connection edited) and a refresh rejection do not reload it.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted** | No flicker or lost selection on an unrelated event; matches "an event that leaves the id and URL unchanged keeps results". | A site created in another window is not listed until the next identity change or Retry (Retry exists only after a failure). |
| **B. Reload on every `connection:*` event** | List is fresher. | Would clear or race the selected site on every unrelated event. |

**Owner decision:** Option A (2026-11-02, superseding the Option B pick recorded earlier the same day). No background reload on same-identity events; no `eventRevision`; the plan's S-07 mechanism, D-19 notice and D-20 notification are removed. Applied to the plan on 2026-11-02.

---

## D-17 — Export report: where the disabled button shows, and its reason (P5.5, from D-09 B)

**Context.** The owner chose a permanently disabled Export report so that AC-7.4 (an empty site) and AC-7.8 (no sites) hold literally. The title tile, the button's natural place, exists only once a scan has finished or stopped. The no-sites state (AC-7.8) is a state panel with no title tile. P5.7 enables the button and replaces the reason.

**Adopted.** The button sits in the title tile for every finished or stopped scan, including an empty site, and under the AC-7.8 "No Power Pages sites in this environment" panel. One reason text in both places: "Report export arrives in a later update." It uses the shared `Button` with `disabledReason` (`aria-disabled`, focusable, reason on hover and focus, clicks ignored).

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: title tile for every finished or stopped scan, and under the AC-7.8 panel.** Reason: "Report export arrives in a later update." | Literal to both ACs; one reason text; P5.7 changes one component. | A button in the no-sites panel the user can never use there, even after P5.7. |
| **B. Title tile only** | No control in a state where export can never apply. | AC-7.8's "Export report is disabled" holds only because nothing is shown, which is what the owner moved away from in D-09. |
| **C. A page-level header with Export report in every Inspector state, with a reason per state** ("Select a site first.", "Wait for the scan to finish.", "Report export arrives in a later update.") | Always in the same place; teaches the flow. | Departs from layout 10a; most reasons become wrong once P5.7 lands. |

**Owner decision:** Option A (2026-11-02). Title tile for every finished or stopped scan, including an empty site, and under the AC-7.8 panel. Reason text: "Report export arrives in a later update."

---

## D-18 — What the page shows after a scan before a file is chosen (P5.5, from D-03 C)

**Context.** With no file selected, the ring, three finding tiles and detail tile have nothing to show. AC-8.1's title-tile line `<file> · <status>` needs a file. The files rail is the only way to choose one.

**Adopted.** The title tile keeps "Review server logic readiness", the sub-line, Scan again and Export report, with the site name in place of `<file> · <status>`. One prompt fills the ring, finding and detail cells: "Select a file to review its readiness." The rail highlights nothing; its roving tab stop lands on the first file so the keyboard can reach the list.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: site name in the title tile, one prompt across the ring, finding and detail cells.** "Select a file to review its readiness." | Clear next step; the grid keeps its frame; one string. | The first screen after a scan shows no findings until a click. |
| **B. Every tile keeps its frame with an empty placeholder** (a grey ring with "–/3", dashes in the tiles) | Layout identical with or without a file. | Four placeholders look broken rather than waiting; harder to describe to a screen reader. |
| **C. Show the site-wide ring (all checks across all files, as in the PDF hero) until a file is chosen** | Useful summary on arrival. | New page UI the spec does not describe for the page; more code, tests and copy in a slice that is already large. |

**Owner decision:** Option A (2026-11-02). Site name in the title tile in place of `<file> · <status>`; one prompt across the ring, finding and detail cells: "Select a file to review its readiness."

**Extension (2026-11-02).** When the scan finishes or stops with zero files, the "Select a file to review its readiness." prompt is not shown; the ring, finding tiles and detail tile render nothing (the files rail already carries "No server logic found on this site." / "No server logic records were read."). Owner decision (2026-11-02): confirmed.

---

## D-19 — The selected site is missing from a reloaded list (P5.5, from D-16 B)

**Context.** A reload (Retry, mount or a changed identity) can return a list without the site that is selected or scanned, for example after it was deleted in another window. AC-7.6 keeps results and marks for a same-identity event.

**Adopted.** Keep the selection, results and marks. The picker still shows the site name. A notice reads "This site is no longer listed in the environment. Its results are from the last scan." It clears when a later reload lists the site again, when a site is chosen, or when the identity changes.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: keep everything; add the "no longer listed" notice.** | Follows AC-7.6; explains the gap. | One more notice text and state check. |
| **B. Keep everything and say nothing** | Simplest. | A user may rescan a site that no longer exists and get a failed scan with no explanation. |
| **C. Clear to "Select a site"** | The picker never shows a missing site. | Drops results that AC-7.6 says to keep for a same-identity event. |

**Owner decision:** Option C (2026-11-02, superseding Option A). When a successful list load does not contain the selected site, the store clears the selection, scan, file selection and marks, and the page shows "Select a site" (AC-7.8-style no-selection state). No notice text. Recorded as a spec delta (pre-execution step 1 in the plan): the spec's "results kept" wording for AC-7.6 does not cover a site that is no longer listed.

---

## D-20 — A background reload fails (P5.5, from D-16 B)

**Context.** The recorded reading of D-16 keeps the old list when a background reload fails, instead of showing "Couldn't load sites". The project rule is to surface errors through `toolboxAPI.utils.showNotification`, with `duration: 0` for errors.

**Adopted.** Keep the list and show one warning notification, "Couldn't refresh the site list. The list shown may be out of date.", at most once until a reload succeeds. Only the error name is logged.

| Option | Pro | Con |
|---|---|---|
| **A. Adopted: keep the list; one warning notification until a reload succeeds.** | Follows the notification rule without repeating on every event. | Needs a "warned" flag in the session. |
| **B. Keep the list; log the error name only** | Quiet; the list still works. | A silent failure, which the project rules discourage. |
| **C. Switch to the "Couldn't load sites" state with Retry** | Reuses an existing state. | Throws away a usable list and the selection, which the recorded D-16 reading rules out. |

**Owner decision:** Option A (2026-11-02). Keep the list; one warning notification "Couldn't refresh the site list. The list shown may be out of date.", at most once until a reload succeeds.

Superseded (2026-11-02): D-16 reverted to Option A, so no background reload exists; D-20 is not implemented. The Retry and mount loads keep the existing "Couldn't load sites" state with Retry.

---

## D-21 — Needs-review tile tint (P5.5)

**Context.** Reference 05 of the design handoff tints only the selected finding tile and marks the needs-review role with a tinted `!` icon. Spec FR-11 (L831) puts `--review-tint` behind pills.

**Adopted.** Tint every needs-review finding tile with `--review-tint` / `--review` and mark the selected tile with the primary inset ring, as the plan originally drafted; the tinted `!` icon stays. Deliberate FR-11 interpretation: `--review-tint` marks the needs-review role on tiles as well as pills; reference 05's selected-only tint is not followed.

| Option | Pro | Con |
|---|---|---|
| **A. Tint the selected tile only; tinted `!` icon on needs-review tiles** | Matches reference 05; selection and role stay distinct. | Departs from FR-11's pill-only use of `--review-tint`. |
| **B. Adopted: tint every needs-review tile** | Role visible at a glance. | Departs from reference 05's selected-only tint. |

**Owner decision:** Option B (2026-11-02).
