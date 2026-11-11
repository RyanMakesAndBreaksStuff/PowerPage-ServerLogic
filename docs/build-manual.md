# How to build Server Logic Tools

This guide is for developers building the **Logic Starter**, **Server Objects**, and **Logic Inspector** pages from this repository, then loading the result in Power Platform ToolBox (PPTB). The released beta build contains only the first two pages; the Inspector is not released yet.

[README](../README.md) · [Usage manual](usage-manual.md)

## Contents

- [Prerequisites](#prerequisites)
- [Install dependencies](#install-dependencies)
- [The three pages](#the-three-pages)
- [Build the tool](#build-the-tool)
- [Run development workflows](#run-development-workflows)
- [Run checks](#run-checks)
- [Run the release gate](#run-the-release-gate)
- [Load the build in PPTB](#load-the-build-in-pptb)
- [Prepare an npm package](#prepare-an-npm-package)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- A checkout of this repository.
- Node.js and npm. `package.json` declares Node.js **>=20.19.0**; the installed version must also satisfy the locked dependencies' engine requirements.
- Access to the npm registry, or a populated local cache, for dependency installation.
- PPTB Desktop with host API **1.2.7 or later** for host testing. The PPTB VS Code extension has not been validated for this tool.

Check your versions:

```sh
node --version
npm --version
```

The frontend uses React, TypeScript, and Vite. There is no .NET build step for this tool. You can compile it without an active Dataverse connection.

## Install dependencies

Open a terminal in the repository root, where `package.json` and `package-lock.json` are located:

```sh
npm ci
```

`npm ci` installs the dependency versions recorded in the lockfile. Use `npm install` when intentionally updating dependencies, then review both the manifest and lockfile changes.

## The three pages

| Page | What it does | Connection |
| --- | --- | --- |
| **Logic Starter** | Generates a server logic handler, client call, and permission checklist, and exports them as a ZIP. | Not needed. |
| **Server Objects** | A curated, searchable `Server.*` reference whose samples can be inserted into the Starter handler. Requires Starter. | Not needed. |
| **Logic Inspector** | Reads the server logic files on a Power Pages site, shows whether each file's web role, table permissions, and outbound networking look configured, and exports a Markdown or PDF report. | One active PPTB connection. |

The Inspector is **unreleased**. The beta build excludes it, and the release gate fails if its code reaches the package.

## Build the tool

```sh
npm run build        # full build: Logic Starter, Server Objects, and Logic Inspector
npm run build:beta   # released build: Logic Starter and Server Objects only
```

Both commands run `tsc -b` first. `npm run build` runs `vite build` with every page on, so it includes the Inspector. `npm run build:beta` runs `vite build --mode beta`, whose default page set is **Logic Starter and Server Objects**, with the Inspector left out. Use `build:beta` for anything you plan to publish.

An existing `VITE_RELEASED_PAGES` environment setting or Vite environment file can override that default. To select these two pages explicitly in PowerShell:

```powershell
$env:VITE_RELEASED_PAGES = 'starter,objects'
npm run build:beta
Remove-Item Env:VITE_RELEASED_PAGES
```

Use a fresh terminal for this example if you need to preserve a previous value. To select the same pages in a POSIX shell:

```sh
VITE_RELEASED_PAGES=starter,objects npm run build:beta
```

Page names are comma-separated and can be `starter`, `objects`, and `inspector`. An unknown or empty name fails configuration. Server Objects requires Starter because its used-member context and insertion actions share the Starter session.

### Expected output

```text
dist/
  index.html
  assets/
    ... JavaScript and stylesheet output ...
```

Vite produces an IIFE JavaScript bundle, a separate stylesheet, and relative asset paths for PPTB loading. Generated asset filenames can change between builds. The HTML transform removes module-loading attributes and moves script loading to the body for host compatibility.

To build all three pages, use `npm run build` with no `VITE_RELEASED_PAGES` set. To reproduce the two-page released scope, use `npm run build:beta` or the explicit page selection above.

The tool's `dist/` build is separate from the ZIP that an end user downloads through **Download starter**. That ZIP contains generated Power Pages source and setup documents, rather than the tool application.

## Run development workflows

### Preview layout in a browser

```sh
npm run dev -- --mode beta
```

Open the local URL printed by Vite. This supports frontend iteration, but the normal entry point still uses the PPTB adapter. A standalone browser does not provide `window.toolboxAPI`; theme, connection, clipboard, file-save, notification, and external-link behavior therefore cannot be fully verified there.

To serve an existing production build locally:

```sh
npm run preview
```

Preview serves the current `dist/`; it does not rebuild it or supply PPTB APIs.

### Rebuild files while using PPTB

For a watched development build with source maps and the two-page released scope (leave `VITE_RELEASED_PAGES` unset to include the Inspector):

```powershell
$env:VITE_RELEASED_PAGES = 'starter,objects'
npm run dev-watch
```

Stop the watcher with Ctrl+C when finished, then clear the variable if you set it in that terminal:

```powershell
Remove-Item Env:VITE_RELEASED_PAGES
```

The package also provides `npm run watch`, which watches a normal Vite build. `dev-watch` adds development mode and source maps. PPTB local-tool loading does not hot-reload the tool; close and reopen its tab after a rebuild.

## Run checks

Run the checks relevant to your changes from the repository root:

```sh
npm run typecheck
npm run lint
npm test
npm run build:beta
```

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript project checking with `tsc -b`. The build already includes this step. |
| `npm run lint` | ESLint with warnings treated as failures. |
| `npm test` | Vitest tests, including component, catalogue, generator, and package coverage. This runs the repository-wide suite. |
| `npm run build:beta` | Type-check and generate the two-page released output (no Inspector). |
| `npm run verify:release` | The full release gate; see [Run the release gate](#run-the-release-gate). |
| `npm run size` | Report sizes for the current `dist/assets` output. Build first. |

### PPTB manifest validation

The repository defines:

```sh
npm run validate
```

This invokes the `pptb-validate` command, which `npm ci` installs through `@pptb/types` (it brings in `@pptb/validate` 1.0.5). The script passes `--skip-url-checks`, but that version of the command ignores the flag and always checks URLs. Until this repository's `configurations.repository` and `readmeUrl` addresses are public, `npm run validate` fails on those URL checks even when the manifest is otherwise valid. `npm run verify:release` validates the same files through the package's API with URL checks skipped, so use it to check the manifest before the repository is public.

Automated checks do not establish that the real PPTB clipboard, save dialog, external browser, or deployed Power Pages handler works. Complete the host checks below separately.

## Load the build in PPTB

1. Run `npm run build:beta` and confirm that `dist/index.html` exists.
2. Open PPTB Desktop.
3. In **Settings**, enable **Show Debug Menu**.
4. Choose **Debug → Load Local Tool**.
5. Select the **repository root**, rather than `dist/`.
6. Open the loaded tool and confirm which pages are available: Logic Starter and Server Objects after `build:beta`, plus Logic Inspector after `build`.

These steps follow the repository's existing PPTB local-load workflow. Menu wording can vary with the installed host version.

> **Screenshot placeholder B1 — Loading a local build**  
> Suggested file: `images/build-pptb-local-tool.png`  
> Capture PPTB Desktop with the Debug menu and Load Local Tool action visible. Include an annotation showing that the selected folder is the repository root containing package.json and dist, rather than dist itself. Use a neutral checkout path without personal information.

### Verify the two documented workflows

1. In **Logic Starter**, confirm the initial recipe, name, GET method, and fetch client. Change the name and confirm the displayed endpoint and filename change.
2. Edit a handler and review browser-check feedback. Expand the permission checklist, mark it reviewed, then change the code and confirm the review no longer applies.
3. Use **Copy server code** and **Copy client call**; paste into a scratch editor to confirm the clipboard content.
4. Use **Download starter**, save a ZIP, and inspect the handler, client, README, and checklist. Also try cancelling the save dialog.
5. Open **Server Objects**, search for a member, switch filters, and inspect a sample and its permission notes.
6. Choose **Insert into handler**. Confirm that Starter opens with the sample inserted and retains the same session.7. Close and reopen the tool after another build to verify that the new files are loaded.

Record the host version, build command, and observed results when reporting this validation. Testing the generated code on a configured Power Pages site is a separate integration check; follow the [usage manual](usage-manual.md#download-and-use-a-starter) and the exported README for that recipe.

## Run the release gate

```sh
npm run verify:release
```

The script runs these steps in order and stops at the first failure:

1. `typecheck`, `lint`, and `test`.
2. `build:beta`, the released build with the Inspector excluded.
3. Manifest validation of `package.json` (and `pptb.config.json` if present) through the `@pptb/validate` API, with URL checks skipped.
4. A size budget: the single JavaScript bundle in `dist/assets` must stay within **817 KiB gzip**, which is the 742.7 KiB baseline plus 10 percent.
5. A tarball check using `npm pack --dry-run`: the archive may hold only `dist/`, `package.json`, and the files npm always adds; `dist/index.html` must be present; and no Inspector file name or Inspector page text may appear.

`prepack` runs the same script, so `npm pack` and `npm publish` both go through it. Because it builds `dist/` with `build:beta`, a package made this way never contains the Inspector.

## Prepare an npm package

The manifest names the package `@ryanmakes/powerpages-serverlogic` and lists only `dist` in its `files`. The repository has no `npm-shrinkwrap.json`. The `finalize-package` script (`npm shrinkwrap`) would create one, but the package does not ship it and the release gate does not expect it.

Inspect and create the archive:

```sh
npm pack --dry-run
npm pack
```

Both run `prepack`, and so the release gate, first. Confirm that the archive includes `dist/index.html` and the compiled assets. This produces an npm `.tgz` archive in the current directory. Packaging does not publish it or load it into PPTB. Do not run `npm publish` until you have decided to release. Follow your release process for distribution; the debug local-load procedure above is for testing the checkout.

## Troubleshooting

| Problem | Action |
| --- | --- |
| Dependency installation reports an unsupported engine | Check Node.js against both the root manifest and the dependency named in the error. Switch to a compatible version and rerun `npm ci`. |
| `npm ci` reports a lockfile mismatch | Reconcile intentional manifest changes with `npm install`, review the lockfile diff, then retry a clean install. |
| The build fails before Vite starts | Resolve the TypeScript errors from `tsc -b`; the build stops when that step fails. |
| A page-selection error appears | Check `VITE_RELEASED_PAGES` in the shell and Vite environment files. Use names from `starter`, `objects`, and `inspector`; Objects cannot be selected without Starter. |
| Copy/save actions fail in browser preview | Load the compiled tool in PPTB Desktop and test the real host APIs. |
| PPTB still shows an older build | Confirm the latest build succeeded and that you loaded the correct checkout root. Close and reopen the tool tab. |
| `npm run validate` fails on the repository or README URL | Expected until those addresses are public: the command ignores `--skip-url-checks`. Run `npm run verify:release` to validate the manifest without URL checks. |
| `pptb-validate` is not recognized | Run `npm ci` again; the command comes from `@pptb/types`. Do not treat a missing validator as a passed validation. |
| `verify:release` fails at the tarball step | Look for Inspector files or text in `dist/`. Rebuild with `npm run build:beta`, because a full `npm run build` includes the Inspector. |
| The npm archive has missing or stale application files | Run `npm run build:beta` and inspect `npm pack --dry-run` again. |

## Source map for maintainers

| Location | Responsibility |
| --- | --- |
| [`package.json`](../package.json) | npm commands, package files, Node.js engine, and PPTB metadata. |
| [`vite.config.ts`](../vite.config.ts) | Page selection, host-compatible bundling, and test configuration. |
| [`src/app/starter-session/`](../src/app/starter-session/) | Shared in-memory Starter state and derived readiness. |
| [`src/features/starter/`](../src/features/starter/) | Starter inputs, code panes, and download action. |
| [`src/features/server-objects/`](../src/features/server-objects/) | Object search, details, context, and sample insertion. |
| [`src/features/inspector/`](../src/features/inspector/) | Logic Inspector page, readiness rules, and report export. |
| [`src/app/inspector-site/`](../src/app/inspector-site/) | App-scoped Inspector session: site list, scan, review marks, and export job. |
| [`scripts/verify-release.mjs`](../scripts/verify-release.mjs) | The release gate behind `npm run verify:release` and `prepack`. |
| [`src/services/catalogue/`](../src/services/catalogue/) | Recipe and Server Objects reference data. |
| [`src/services/generators/`](../src/services/generators/) | Handler/client generation and starter ZIP contents. |
| [`src/services/pptb/`](../src/services/pptb/) | Host adapters and test doubles. |
