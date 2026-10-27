# Server Logic Tools

A Power Platform ToolBox (PPTB) tool for Power Pages server logic.

- **Logic Starter** generates a handler, a client call and a permission checklist.
- **Server Objects** is a reference for the `Server.*` objects.
- **Logic Inspector** (reviews existing server logic and exports reports) is coming in a later release.

The tool is read-only toward your environment.

## Using it

1. Open **Logic Starter**, pick a pattern, and fill in the inputs. The handler, the client call and the permission checklist update as you type.
2. Choose **Download starter** to save the generated files, then add them to your Power Pages site.
3. Open **Server Objects** to look up a `Server.*` object or method. Use **Insert** to add a call to your handler.

## Requirements

PPTB Desktop App 1.2.7 or later. The PPTB VS Code extension is not tested.

## Develop

```bash
npm install
npm run build          # single IIFE bundle in dist/ (all pages)
npm run build:beta     # early-beta bundle: Logic Starter and Server Objects only
npm run dev-watch      # development build with sourcemaps
npm test
```

Load it in PPTB with Settings, Show Debug Menu, then Debug, Load Local Tool, and pick the project root (not `dist/`). There is no hot reload: close and reopen the tool tab after each build.
