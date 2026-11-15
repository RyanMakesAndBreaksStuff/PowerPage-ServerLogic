# PPTB file dialogs can open out of sight: parent them to the main window

**Status:** fixed in the fork (`agent-debug-tools`, commit `89028ff`). Not yet offered upstream to PowerPlatformToolBox/desktop-app.
**Date:** 2026-11-10

## Summary

PPTB opens a tool's **Select file/folder** and **Save file** dialogs without a parent window. On Windows, a dialog without a parent can open behind other windows. Nothing in PPTB shows that it is waiting: the tool's `selectPath` or `saveFile` call just stays pending until someone finds the dialog, which may be never.

The fix passes PPTB's main window as the parent of both dialogs. Every other dialog in PPTB already does this. Windows then opens the dialog on top of PPTB, and while it is open it blocks PPTB, as a file dialog normally does.

This affects every PPTB tool that calls `toolboxAPI.fileSystem.selectPath` or `toolboxAPI.fileSystem.saveFile`. The Server Logic debug tooling is just where it showed up.

## How it showed up

A live probe of the Server Logic tool checks the download of a server logic file. It asks the user to pick the local copy of that file, so the downloaded content can be compared with it byte for byte.

- The tool called `toolboxAPI.fileSystem.selectPath`. The host-call log showed `filesystem:select-path` as **pending**, and the owner never saw a picker.
- The PPTB window was in front with nothing over it, and still no dialog appeared. It had opened somewhere out of sight.
- One pick did eventually resolve, **446,420 ms** (about 7.5 minutes) after the call, once the dialog was found. The bytes and text then matched.
- After the fix, the picker opened in front of PPTB.

## Root cause

### Where the dialogs are created

The two IPC handlers in `src/main/index.ts` call helpers in the filesystem utilities module without passing a window:

```ts
// filesystem:save-file
const selectedPath = await saveFile(defaultPath, content, filters);
// filesystem:select-path
const selectedPath = await selectPath(options);
```

Those helpers then call Electron's dialog API in its single-argument form:

```ts
const result = await dialog.showSaveDialog({ defaultPath, filters: dialogFilters });
const result = await dialog.showOpenDialog({ title, message, buttonLabel, defaultPath, filters, properties });
```

### Why no parent means it can get lost

Electron's `dialog.showOpenDialog` and `dialog.showSaveDialog` take an optional `BrowserWindow` as their first argument. With one, the dialog is modal to that window: it stays above it and keeps the user's attention there. Without one, the dialog is a top-level window with no owner.

On Windows, a top-level window opened by a background process is subject to the foreground rules: Windows may refuse to bring it to the front. Here the call starts in a tool's renderer and reaches the main process over IPC, possibly long after the user's last click, so PPTB may not be the foreground process when the dialog opens. The dialog then opens wherever Windows puts it, often behind the window the user is looking at. It isn't modal to PPTB, so PPTB stays fully usable and gives no sign that a dialog is waiting.

Tools run in a `BrowserView` attached to the main window (`toolWindowManager.ts`), not in their own `BrowserWindow`. The main window is therefore the right parent for a dialog a tool asks for.

### Why it went unnoticed

Every other dialog in PPTB already passes a parent: the tool-directory picker in `index.ts`, the `showMessageBox` calls in `index.ts`, and the `showMessageBoxSync` calls in `toolWindowManager.ts` all pass `this.mainWindow` or `parentWindow ?? this.mainWindow`. Only the two filesystem helpers were left out. They carry the comment "MOVED FROM utils namespace", which suggests the parent was dropped when they were moved out of a window-aware context.

When someone clicks a button in a tool and the dialog opens straight away, PPTB is usually already in front and the dialog appears. The bug shows up when PPTB isn't in front at that moment: another window has focus, the call comes after a delay, or the call is scripted, as with the probe.

## Effect

- **For the user:** they ask for a file or a save location and nothing seems to happen. If they click again, a second dialog may open, or the tool may refuse because a call is still pending. The dialogs that are already open stay hidden.
- **For the tool:** the `selectPath` or `saveFile` promise doesn't resolve until the hidden dialog is found and answered, so any spinner, timeout or close guard tied to it stays active. A tool can't tell "the user is still choosing" apart from "the user can't see the dialog".
- **For automated tests:** probes that wait on a pick or a save time out, and that looks like a tool bug. This is the case that found it.
- **Data:** none is lost or written. A cancel still returns `null`, and a save only writes once a path is chosen.

## The fix

`src/main/utils/filesystem.ts` (in upstream: `src/main/utilities/filesystem.ts`):

```ts
import { dialog, type BrowserWindow, type OpenDialogOptions, type SaveDialogOptions } from "electron";

export async function saveFile(defaultPath, content, filters?, parent?: BrowserWindow) {
    // ...filters as before...
    const saveOptions: SaveDialogOptions = { defaultPath, filters: dialogFilters };
    // An unparented dialog can open behind other windows on Windows; parent it to the caller's window when there is one.
    const result = parent ? await dialog.showSaveDialog(parent, saveOptions) : await dialog.showSaveDialog(saveOptions);
    // ...
}

export async function selectPath(options?, parent?: BrowserWindow) {
    const openOptions: OpenDialogOptions = { title, message, buttonLabel, defaultPath, filters, properties };
    const result = parent ? await dialog.showOpenDialog(parent, openOptions) : await dialog.showOpenDialog(openOptions);
    // ...
}
```

`src/main/index.ts`, in both IPC handlers:

```ts
const selectedPath = await saveFile(defaultPath, content, filters, this.mainWindow ?? undefined);
const selectedPath = await selectPath(options, this.mainWindow ?? undefined);
```

Design points:

- **The parent is optional.** With no window (for example during startup or shutdown), the helpers fall back to today's unparented call instead of throwing.
- **Nothing else changes.** Filters, the path-access grants after a pick, cancel returning `null`, and the tool-facing API are as before.
- **No API change for tools.** `toolboxAPI.fileSystem` has the same signatures, so no tool needs a change.

## Behaviour changes to call out in the PR

| Platform | Before | After |
|---|---|---|
| Windows | A free-floating dialog that can open behind other windows | Opens above PPTB and blocks PPTB until closed |
| macOS | A free-floating dialog | A sheet attached to the PPTB window, as macOS does for a parented dialog |
| Linux | A free-floating dialog | Transient for the PPTB window; placement depends on the window manager |

While the dialog is open, the user can't use the rest of PPTB. That matches PPTB's other dialogs and what users expect from a file dialog.

## Verification in the fork

- New unit test `tests/unit/main/utils/filesystemDialogParent.test.ts`, with 3 tests:
  - `selectPath` passes the parent to `showOpenDialog`;
  - `saveFile` passes the parent to `showSaveDialog`;
  - with no window, both still open unparented.
- Fork unit suite: 1491 of 1495 pass. The 4 failures were there before this change and are unrelated: `dotnetLocalFeed.test.ts` ×2, `toolFilesystemCaller.test.ts` ×1, `nativeWorkerConsentManager.test.ts` ×1.
- Typecheck is clean and `vite build` succeeds.
- Live check: on the rebuilt fork, the Server Logic probe's picker opened in front of PPTB, and the pick resolved with matching bytes and text.

## Porting it upstream

The fork has drifted from upstream, so this has to be re-applied on upstream `main`, not cherry-picked:

- **Base:** the fork branched from upstream at `fc8f78d` (2026-09-23). Upstream `main` is at `a06b7ee` (2026-10-11, version 1.2.7) and isn't in the fork.
- **Module path:** upstream renamed the module to `src/main/utilities/filesystem.ts`. The fork still has `src/main/utils/filesystem.ts`.
- **Handlers:** in upstream `src/main/index.ts` the two handlers are at about lines 1881 (`saveFile`) and 1899 (`selectPath`). They still call the helpers without a window, so the bug is live upstream.
- **Test:** move the test to match upstream's layout, under `tests/unit/main/utilities/` if that's where upstream keeps tests for that module, and fix the import path.
- **Fork-only code:** leave out the fork's agent-debug code. The PR is these two files, the test and nothing else.

### PR checklist

- [ ] Branch from upstream `main`, apply the two-file change, and add the test.
- [ ] `pnpm test`, `pnpm run typecheck` and `pnpm run lint` pass on upstream (or note failures that were already there).
- [ ] Manual check on Windows: open a tool, start a pick, switch to another app, and confirm the dialog opens in front when PPTB is brought back.
- [ ] If possible, a quick check on macOS that the sheet behaviour is acceptable.
- [ ] PR description: the summary above, the root cause in a paragraph, and the behaviour-change table.
