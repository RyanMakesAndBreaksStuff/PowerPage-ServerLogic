# Giving an AI agent debug access to PPTB Desktop and a loaded tool

Source reviewed: `PowerPlatformToolBox/desktop-app` at `main` (v1.2.8, Electron 39, MCP SDK 1.32, Playwright 1.60). Clone kept at the session scratchpad under `pptb/desktop-app`.

## What the app already has

| Capability | Where | Agent-usable today? |
|---|---|---|
| Tools run in a `BrowserView` per instance, `contextIsolation: true`, `sandbox: false`, preload `toolPreloadBridge.js`, URL `pptb-webview://<toolId>/index.html` | `src/main/managers/toolWindowManager.ts:458-566` | Via CDP only if a debugging port is enabled (it is not) |
| Menu items "Toggle Tool DevTools" / "Toggle ToolBox DevTools" | `src/main/index.ts:3288-3320`, `toolWindowManager.ts:1535` | Human only |
| Main-window DevTools auto-open when `NODE_ENV=development` | `src/main/index.ts:3603` | Human only |
| Built-in MCP server, Streamable HTTP on `127.0.0.1:7339/mcp`, header `x-mcp-auth-token` (token from settings) | `src/main/mcp/mcpServer.ts:247-336, 984-1062` | Yes, but only for invoking tools that declare `agents.invokable`, plus `list_connections` and `authenticate_connections` built-ins |
| Headless CLI (`pptb-cli serve/invoke`) | `src/cli/index.ts` | Yes, no renderer, no DOM, no console |
| Playwright `_electron.launch` fixture with `PPTB_TEST_MODE=1`, `PPTB_TEST_TOOLS_DIRECTORY`, `PPTB_TEST_REGISTRY_PATH` | `tests/e2e/fixtures.ts` | Yes for scripted tests, but one Electron per test, no persistent session |
| Local tool loading from a folder with `dist/index.html` | `toolsManager.ts:989` (`loadLocalTool`), IPC `load-local-tool` | Yes via the UI |

Gap: nothing lets an external process evaluate JavaScript in a tool's `BrowserView`, read its console, or drive the ToolBox renderer. The MCP server deliberately only exposes tool invocation.

## Recommended approach: two layers

### Layer 1 (smallest change): Chrome DevTools Protocol port

One line before `app.whenReady()` in `src/main/index.ts` (next to `registerScheme()` at ~4199):

```ts
if (process.env.PPTB_REMOTE_DEBUG_PORT) {
    app.commandLine.appendSwitch("remote-debugging-port", process.env.PPTB_REMOTE_DEBUG_PORT);
    app.commandLine.appendSwitch("remote-allow-origins", "http://127.0.0.1:" + process.env.PPTB_REMOTE_DEBUG_PORT);
}
```

Then `PPTB_REMOTE_DEBUG_PORT=9222 pnpm start` exposes every `webContents` (main window, each tool `BrowserView`, modals) at `http://127.0.0.1:9222/json`. Each tool shows up as its own target with URL `pptb-webview://<toolId>/index.html`, so the agent can tell them apart. This is the literal DevTools console: `Runtime.evaluate`, `Runtime.consoleAPICalled`, `Log.entryAdded`, `Network.*`, `DOM.*`, `Page.captureScreenshot`.

Agent side, no extra code needed:

- Playwright: `chromium.connectOverCDP("http://127.0.0.1:9222")`, iterate `browser.contexts()[0].pages()`, pick by URL. `page.evaluate`, `page.on("console")`, `page.locator(...)` all work against the tool. Playwright MCP's `browser_run_code_unsafe` / `browser_console_messages` work once attached.
- Raw CDP (`chrome-remote-interface` or a WebSocket): `Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true })`.

Why this is enough for the "at minimum" requirement: `window.toolboxAPI` and `window.dataverseAPI` are exposed by the preload through `contextBridge`, so `Runtime.evaluate` in the tool target can call `toolboxAPI.connections.getConnections()` exactly as a developer would type it in DevTools. The ToolBox renderer target gives the same access to the host UI (`document.querySelector('#settings-activity-btn').click()`), which is how the e2e specs already drive it.

Caveats:

- Gate it on the env var or a `--remote-debug` flag and never ship it enabled. CDP has no auth; anything on the machine can attach. Binding stays on loopback.
- `BrowserView` targets are only listed while the view exists. Closing a tool removes the target; re-list after launching.
- `webSecurity: false` on tool views already applies; the CDP port does not widen it.
- Electron keeps the main process out of CDP. For main-process debugging use `electron --inspect=5858 .` (Node inspector), which `pnpm start` can pass through.

### Layer 2 (richer, structured): debug tools on the existing MCP server

Add built-in tools next to `list_connections` / `authenticate_connections` in `src/main/mcp/mcpServer.ts` (dispatch at ~1153, definitions in `getBuiltInToolDefinitions()`), registered only when `PPTB_AGENT_DEBUG=1`:

| MCP tool | Implementation |
|---|---|
| `debug_list_tool_instances` | `toolWindowManager.getOpenToolInstanceIds()` plus `activeToolId`; `toolViews` already keyed by `instanceId` (`toolWindowManager.ts:61,108`) |
| `debug_open_tool` | Reuse the launch path the renderer uses (`launchTool(instanceId, tool, connectionId, ...)`); for a dev build also accept `localPath` and call `toolManager.loadLocalTool(localPath)` first |
| `debug_evaluate` `{ target: "toolbox" \| instanceId, expression }` | `webContents.executeJavaScript(expression, true)` on `mainWindow.webContents` or `toolViews.get(instanceId).webContents`; wrap so `Promise` results are awaited and errors are returned as `{ ok: false, error }` |
| `debug_console_tail` `{ target, since? }` | Attach `webContents.on("console-message", ...)` at launch (next to the existing `render-process-gone` handler at `toolWindowManager.ts:492`) into a bounded ring buffer per `instanceId`; return entries with level, message, source line |
| `debug_screenshot` `{ target }` | `webContents.capturePage()` to PNG base64 |
| `debug_reload_tool` `{ instanceId }` | `webContents.reloadIgnoringCache()`; the `pptb-webview://` protocol re-reads `dist/` from disk, so a `vite build --watch` loop works without restarting PPTB |
| `debug_dom_snapshot` `{ target }` | `executeJavaScript("document.documentElement.outerHTML")` or an accessibility-tree walk |
| `debug_fire_host_event` `{ event, payload }` | Call the same emitter the host uses for `connection:*` / `settings:updated` so a tool's `toolboxAPI.events.on` handler can be exercised without a real connection change |

This keeps the agent on the already-authenticated MCP channel (Claude Desktop / VS Code config is already written by `configureClient`), so the same agent that invokes tools can also inspect them. Gate it hard: refuse to register when `app.isPackaged`, and add a visible banner in the ToolBox window while debug tools are registered.

Required plumbing for Layer 2:

1. `McpServerManager` currently receives `ToolManager` and `ToolRegistryManager` but not `ToolWindowManager` or the main `BrowserWindow`. Add a `setDebugTargets(toolWindowManager, mainWindow)` setter and call it in `src/main/index.ts:256` where the manager is constructed.
2. `ToolWindowManager.toolViews` is private. Add `getToolWebContents(instanceId): WebContents | null` and `getMainWebContents()` rather than exposing the map.
3. Console capture: `console-message` on Electron 39 delivers `(event, level, message, line, sourceId)`; store `{ ts, level, message, line, sourceId }`, cap at 2000 entries per instance, drop on `destroyed`.
4. Unit tests mirror `tests/unit/main/managers/`; the existing `electron` mock in `tests/__mocks__/electron.ts` already stubs `webContents`, so `executeJavaScript` and `capturePage` can be spied.

## Cheapest path to a working loop for the Server Logic tool

1. Clone `desktop-app`, `pnpm install`, apply the Layer 1 patch, `pnpm run build`.
2. Point PPTB at the tool without publishing: either use the UI "load local tool" against the Server Logic repo root (needs `dist/index.html`, which `npm run build` produces), or write a `tools/manifest.json` entry with `source: "local"` and `installPath` the way `tests/e2e/fixtures.ts:149-200` does and start with `PPTB_TEST_MODE=1 PPTB_TEST_TOOLS_DIRECTORY=<dir>`.
3. Start: `PPTB_REMOTE_DEBUG_PORT=9222 pnpm start`.
4. Agent attaches with Playwright over CDP, finds the page whose URL starts with `pptb-webview://`, and from there runs console expressions, reads console output, clicks, and screenshots. For the ToolBox shell, use the page whose URL ends in `renderer/index.html`.
5. Run `npm run build -- --watch` in the Server Logic repo and `debug_reload_tool` (Layer 2) or `page.reload()` (Layer 1) after each build.

## Non-goals and risks

- Do not relax `contextIsolation` or re-enable `nodeIntegration` on tool views to make evaluation easier. CDP already runs in the page's isolated world and sees `window.toolboxAPI`.
- The headless CLI cannot replace this. It runs `invokeHeadless` in Node with no DOM and is only for tools that implement the headless entry.
- Upstreaming: Layer 1 is small enough to propose as a `--remote-debugging-port` passthrough PR. Layer 2 should stay a local fork or a `PPTB_AGENT_DEBUG` dev-only feature because it hands any MCP client arbitrary code execution in every open tool.
