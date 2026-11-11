# Connections, permissions and sessions

How Server Logic Tools uses an optional PPTB connection, what it is and is not allowed to do, and how its state lives and dies.

[Back to the user guide](../usage-manual.md)

## The optional single connection

The tool declares an optional connection — none required, at most one (`connections: { min: 0, max: 1 }`). Whether a page needs it depends on the page:

- **Logic Starter** and **Server Objects** need no connection. Generation and the curated reference work entirely offline, from data shipped with the tool.
- **Logic Inspector** needs one active connection to read the Power Pages sites in an environment. With no connection it reads **No active connection**.

The connection provides read access to the selected environment. Selecting it, and choosing a site, is always explicit — the Inspector does not pick a site for you, even when the environment has only one.

## What the tool is allowed to do

Every feature is read-only with respect to your environment. None of them deploy code, configure permissions, create records, or write to your site or Dataverse:

- **Logic Starter** writes only to files on *your* machine — the downloaded ZIP — not to any environment.
- **Server Objects** inserts text into the current handler in the session; nothing leaves the tool.
- **Logic Inspector** reads server logic records and reports on them, and writes only a local Markdown or PDF report.

Deployment and configuration stay yours: you add the exported files to your site, grant the roles and permissions, and test there.

## Permissions are a checklist, not a check

The permission checklist and the Inspector findings describe configuration the tool cannot authoritatively verify end-to-end. The tool records *your* review of those items, and can read some of the site's configuration in the Inspector; neither is a proof of correct access. See [How readiness is determined](how-readiness-is-determined.md).

## Session state lives in memory

Tool state is held in memory only:

- **Logic Starter and Server Objects** share one session. Switching between them keeps the current name, handler edits, method, client language, and checklist review. **Start over** restores the initial state and clears your edits and review.
- **Logic Inspector** keeps its results in memory. Closing or reloading the tool discards them, so export a report to keep them.

Closing or reloading the tool starts a new session in both cases. The exported files are the durable record of your Starter work, and the exported report is the durable record of an Inspector scan.

## When the connection changes

The Inspector treats a changed connection as a reason to stop, not to guess. If you switch the connection mid-scan, the scan is abandoned and its results discarded; you choose a site again to rescan. If the connection is lost during a scan, the Inspector keeps the results it read so far, marks the unread checks **Not read before the connection was lost**, and lets you rescan once the connection is back. It never fills the gap with an assumption.