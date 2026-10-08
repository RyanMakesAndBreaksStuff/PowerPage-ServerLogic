---
scope: tech-stack
loaded-by: sdd-brainstorm, sdd-specify, sdd-plan, sdd-execute, sdd-review
---

# Tech Stack

## Languages
TypeScript (strict). Generated output: Power Pages server logic JavaScript (`Server.*` objects), client-call snippets (fetch / jQuery / Liquid), Markdown and PDF reports.

## Frameworks
React 19 with React Compiler. Fluent UI v9 is optional, not required — the design handoff's colours/type/spacing are the source of truth.
Host: **Power Platform ToolBox (PPTB)** tool — a web app running in a sandboxed PPTB webview (Desktop Electron app and VS Code extension). Host APIs: `window.toolboxAPI`, `window.dataverseAPI`, `window.powerplatformAPI` (types: `@pptb/types`).
Docs: https://docs.powerplatformtoolbox.com/tool-development · https://github.com/PowerPlatformToolBox/pptb-agent-skills/tree/main/tool-dev

## Infrastructure
No backend. All Dataverse/Power Pages reads go through PPTB host APIs (read-only). Distributed as an npm package and submitted to the PPTB registry. Build: Vite via the `yo pptb` generator, single IIFE bundle.

## Package Manager
npm (PPTB generator default) — edit if switching to pnpm.
