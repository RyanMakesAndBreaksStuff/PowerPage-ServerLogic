# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Server Logic Tools**: a Power Platform ToolBox (PPTB) tool, built with TypeScript and React 19, for Power Pages server logic. It has two top-level tabs:
- **Logic Starter** generates a handler (`Server.*` objects, endpoint `/_api/serverlogics/<name>`), a client call and a permission checklist from a name, an HTTP method and a recipe. It also hosts a `Server.*` object reference.
- **Logic Inspector** reviews a dev site's existing server logic (web roles, table permissions, outbound networking) and exports readiness reports.

**Status: pre-code.** The repo holds the spec, design references and review history only. Scaffold with the standard Vite template, not the `yo pptb` generator (owner decision 2026-10-17): `npm create vite@9.2.1` with `--template react-compiler-ts --eslint`, then add the PPTB build shape, manifest and `@pptb/types` by hand. Phase 00 (`docs/specs/001-server-logic-starter-inspector/plans/phase-00-skeleton.md`) has the exact steps.

## Where things are

- `docs/specs/001-server-logic-starter-inspector/spec.md` is the source of truth (v2.0.0). Its FRs, ACs, recipe table (R1–R10), numbered Learn corrections and spikes S1–S4 govern behaviour. `review.md` sits next to it.
- The implementation plan sits next to it: `plan.md` is the index, `plan-starter.md` holds Part A (the shared foundation), the Contracts every phase consumes and the Starter phases, and `plan-server-objects.md` and `plan-inspector.md` cover the other two pages. Phase files are in `plans/`.
- **Layout 10a** in `design_handoff_server_logic_tools/Logic Tooling Design Directions/design_handoff_server_logic_tools/` is the high-fidelity design for the shell, Logic Starter, Server Objects, Logic Inspector and all UI tokens (README plus `reference/01–06`, light and dark). Its recipe list is **not** adopted: the spec's R1–R10 stand.
- The original `design_handoff_server_logic_tools/` README §05 still governs **report** styling. Its other references are superseded by 10a. `06-interactive-prototype.dc.html` is an **older layout**, so use it for behaviour only (state, toggles, export dialog), not visuals. It needs `support.js` in the same folder.
- `mocks/` contains visual explorations. They are reference only, not production code.
- The root review files (`sol-review.md`, `Opus-review-of-Sol-review.md`, `Opus_*debate*.md`) are the review debate behind spec v0.6.0 and v0.7.0. The spec appendix records how each of the 59 findings (F01–F59) was resolved.
- `.claude/memory/foundation.md` holds the mission and principles. `.claude/rules/*.md` holds the stack rules, and `pptb-host-and-output.md` is the critical one.

## Standing product rules (from the design handoff)

- Always show all five HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Reports export to **Markdown and PDF only**, for two scopes: **This file** and **Site summary**. There is no JSON export.
- Two themes follow the host theme, with no in-tool toggle. Readiness colours: in dark, blue `#5aa9ff` means configured or OK and orange `#ffa24a` means needs review; reports use README §05's blue and orange with the spec's A8 adjustments; in light, ink `#111111` means OK and red `#c0261d` means needs review. Every status also carries a `✓`/`!` glyph and a word. The segmented progress ring is the main readiness visual everywhere.
- The Inspector reviews configuration only. Every report says so and states that the tenant outbound policy is **not verified**.
- The tool is read-only toward the environment. Starter only produces downloads, and Inspector only reads.

## PPTB architecture constraints

- Host globals `window.toolboxAPI`, `dataverseAPI` and `powerplatformAPI` exist **only inside PPTB**. They are undefined in a normal browser tab, so test against a fake `services/pptb/` adapter.
- There are no access tokens. All Dataverse calls go through `dataverseAPI`. Use only the read methods (`retrieve`, `queryData`, `fetchXmlQuery`, metadata).
- The build must be a **single IIFE bundle**, with no `type="module"`, no `crossorigin` and no code-split chunks. Keep Phase 00's Vite config (`rolldownOptions.output: { format: 'iife', codeSplitting: false }` plus the `fixHtmlForPPTB` plugin). The symptom of getting this wrong is a tool that works in dev but loads blank in PPTB.
- Save files with `toolboxAPI.fileSystem.saveFile`. Show errors and status with `toolboxAPI.utils.showNotification`, falling back to in-tool toasts if it fails (spec FR-1). The tool writes nothing to tool settings.
- The default CSP is strict. Bundle every asset (no CDNs).

## Commands (once scaffolded)

- `npm run build`, or `npm run dev-watch` for a development build in watch mode with sourcemaps.
- To run in PPTB: Settings → Show Debug Menu, then Debug → Load Local Tool and pick the project **root** (not `dist/`). There is no hot reload, so close and reopen the tool tab after each rebuild. Open DevTools from Help → Toggle Tool DevTools.
- `npx pptb-validate --skip-url-checks` validates the manifest and must pass before any release.
- Release: `npm run finalize-package`, then `npm publish --access public`. Publishing is irreversible and needs explicit user confirmation.
- Tests: `npx vitest run`, or `npx vitest run path/to/file.test.ts -t "name"` for a single test. Type-check with `npx tsc -b`.

## Workflow

- This project follows SDD (see `.claude/CLAUDE.md`). Branches are `NNN-slug` and commits use Conventional Commits (`docs/git-convention.md`).
- Claude hooks in `.claude/settings.json` auto-run ESLint/Prettier on edits and `tsc -b` plus Vitest on Stop. They do nothing until packages are installed.
