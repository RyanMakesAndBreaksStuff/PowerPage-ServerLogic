# PPTB Host APIs & Generated Output

Sources: https://docs.powerplatformtoolbox.com/tool-development · https://github.com/PowerPlatformToolBox/pptb-agent-skills/tree/main/tool-dev

- Convention: This is a Power Platform ToolBox (PPTB) tool. `window.toolboxAPI`, `window.dataverseAPI` and `window.powerplatformAPI` exist only inside PPTB. Reference `@pptb/types` (`/// <reference types="@pptb/types" />`).
- ✓ Wrap host globals in one `services/pptb/` adapter. Components never touch `window.*API` directly, which keeps the UI testable with a fake adapter outside PPTB.
- ✓ Dataverse is read-only: use `retrieve`, `queryData`, `fetchXmlQuery` and the metadata getters only. ✗ Never call `create`, `update`, `delete`, `*Multiple`, `associate`, `disassociate`, `execute` actions, schema authoring, `deploySolution` or `publishCustomizations`. ✗ No `Post`/`Put`/`Patch`/`Delete` on `powerplatformAPI`.
- ✗ Never hand-roll `fetch` with a bearer token. All authenticated calls go through the host APIs.
- ✓ Use `$select` and `$top` on every `queryData` call, and page through results. Map 401, 403, 404, 429 and 5xx to plain-language messages. Schema-check every response at the adapter and map it to domain types.
- ✓ Surface errors and status with `toolboxAPI.utils.showNotification` (errors `duration: 0`). If it's missing, throws or rejects, fall back to the in-tool Bootstrap-style toast (spec FR-1). Log technical detail to `console.error` (never tokens, bodies or URLs). ✗ No `alert()`, and no stack traces in notifications.
- ✓ Open external links on click with `toolboxAPI.utils.openInConnectionBrowser(url)`; the host blocks `target="_blank"`. Keep a real `href`.
- ✓ Downloads use `toolboxAPI.fileSystem.saveFile(defaultPath, content, filters)`, which returns `null` on cancel. Copy uses `toolboxAPI.utils.copyToClipboard`. Follow the host theme with `utils.getCurrentTheme()` before first render (light if it fails), re-read on `settings:updated`, window focus and visibility.
- ✓ Register `toolboxAPI.events.on` once at init and route on `payload.event`, including re-scanning on `connection:updated`. ✗ This tool writes nothing to `toolboxAPI.settings` (spec FR-5a removed).
- ✓ Manifest: `features.connections: { min: 0, max: 1 }` and `features.minAPI: "1.2.7"` (spec FR-12). Target the PPTB Desktop App; the VS Code extension isn't tested.
- ✓ Build output is a single IIFE bundle with no `type="module"` or `crossorigin`, and script tags at the end of `<body>`. Keep the generator's Vite config. ✗ No CDN-loaded assets. Bundle fonts and libraries instead. `cspExceptions` stays empty unless a spec requires otherwise, with a specific domain and an `exceptionReason`.
- ✓ Run `npx pptb-validate --skip-url-checks` before any release. ✗ Never run `npm publish` without explicit confirmation, because it is irreversible.
- ✓ Generators are pure `(model) => string` functions tested against golden files. ✗ No string-concatenated code generation (use `JSON.stringify` for literals), and never `eval` generated code. ✗ Never render generated Markdown or HTML with `dangerouslySetInnerHTML` unless it is sanitized.
