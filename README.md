# Server Logic Tools

A Power Platform ToolBox (PPTB) tool for Power Pages server logic.

- **Logic Starter** generates a handler, a client call and a permission checklist.
- **Server Objects** is a reference for the `Server.*` objects.
- **Logic Inspector** reviews a development site's server logic for web role, table permission and outbound networking gaps, and exports Markdown and PDF reports.

The tool is read-only toward your environment. Inspector reviews configuration only; it does not verify the tenant's outbound policy.

## Requirements

PPTB Desktop App 1.2.7 or later. The PPTB VS Code extension is not tested.

## Develop

```bash
npm install
npm run build          # single IIFE bundle in dist/
npm run dev-watch      # development build with sourcemaps
npm test
```

Load it in PPTB with Settings, Show Debug Menu, then Debug, Load Local Tool, and pick the project root (not `dist/`). There is no hot reload: close and reopen the tool tab after each build.
