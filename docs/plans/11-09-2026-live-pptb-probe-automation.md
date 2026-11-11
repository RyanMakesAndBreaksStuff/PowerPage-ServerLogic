# Live PPTB Probe Automation Implementation Plan

**Goal:** Every outstanding live-host probe for Server Logic (group A of `tasks/open-items-2026-11-08.md`, the "Pending" rows of `findings/logic/probe_findings.md`, RG-001…RG-006) runs as a repeatable `pptb-live-probe` scenario. The results are written back as redacted evidence.

**Architecture:**
- Scenarios are JSON files under `probes/`, run by the user skill `pptb-live-probe` against the PPTB fork `desktop-app` (branch `agent-debug-tools`). `scripts/probe-live.mjs` is the single entry point. It builds, starts a session and runs one directory per group.
- Host-call scenarios are generated from the repo's own Inspector test world by `tests/probeScenarios.test.ts`, with golden files written through `toMatchFileSnapshot`. That makes the test world the single source of canned data, intercepts and the retrieval-only guard.
- Host-side faults, canned responses and call records come from the fork's host-call interception plan (`desktop-app/.omc/plans/host-call-interception-for-e2e.md`). Task 3 amends that plan.

**Tech stack:**
- This repo: Node ≥ 20.19 (`.mjs` scripts), Vitest 5 `toMatchFileSnapshot`, TypeScript.
- PPTB fork: Electron, Jest 29 with ts-jest, pnpm through `corepack pnpm`.
- Skill: `pptb-live-probe` (`scenario.mjs`, `pptb.mjs`).

**Scope:**
- **Fork amendments:** F1 (binary-safe `safeSerialize`), F3 (wire-path proof) and the step and action contract (Tasks 1–3).
- **Skill:** the `evalFile` step (Task 4).
- **This repo:**
  - probe runner and layout (Task 5);
  - smoke and theme timing, A9/A11/A12 (Task 6);
  - page journeys, A11 (Task 7);
  - host-call scenarios: A3, A6–A8, A10 tool side, A13, AC-5.11, AC-9.9, RG-004 at scale (Tasks 8–9);
  - live S2 scenarios: A1, A2, A4–A6, versions, environment variables, real 403 (Task 10);
  - the evidence writer (Task 11).

**Out of scope:**
- Implementing the fork interception plan itself. Its own tasks 1–6 do that after owner approval: gate **G1**.
- Code fixes the probes are expected to expose:
  - message-based error classification in `src/services/pptb/hostErrors.ts`, because no numeric `status` crosses IPC;
  - flipping `NEXT_LINK_UNVERIFIED`;
  - `createEventHub` changes.
- A real OS network drop and a real token expiry; injected faults stand in for them.
- The native "Tool closure blocked" dialog: `toolWindowManager.ts:992` uses `showMessageBoxSync`, which blocks the main process and with it the MCP server.
- The export watchdog toast, which fires on a slow *build*, not a slow host call, so no intercept can reach it. Unit tests keep covering it.
- The screen-reader pass.

**External gates:**
- **G1:** the owner approves the fork interception plan, as amended by Task 3, and it is merged on `agent-debug-tools`. The fork is then rebuilt with `corepack pnpm exec vite build`. Tasks 8–10 need it.
- **G2:** the owner signs in two connections once in the probe profile: Dev, and a restricted user without read privileges on `powerpagesite`. The owner then writes `probes/.local.json` per `probes/README.md` (Task 5). Tasks 9–11 need it. I never enter credentials.

---

### Task 1: Fork test proves `queryData` sends tool paths to the wire unchanged (F3)

**Owns:** RG-001/RG-002 host half. The `options.path` the host sends for a tool-relative nextLink, and for an OData string literal.

**Files:**

- Create: `C:/Users/RyanDev/source/repos/desktop-app/tests/unit/main/managers/dataverseQueryDataWire.test.ts`. It characterises the path that `queryData` sends, through `makeHttpRequest` (`src/main/managers/dataverseManager.ts:744-762, 881-900`).
- Signal: `corepack pnpm exec jest --config jest.config.ts tests/unit/main/managers/dataverseQueryDataWire.test.ts`

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
cd C:/Users/RyanDev/source/repos/desktop-app
git switch agent-debug-tools
corepack pnpm exec jest --config jest.config.ts tests/unit/main/managers/dataverseQueryDataWire.test.ts
```

- [ ] **Step 2: Capture the current signal**

Run: the Step 1 jest command.

Expected: `No tests found, exiting with code 1`. No test pins the wire path today. `probe_findings.md` keeps RG-001 open for this reason.

- [ ] **Step 3: Implement the minimum fix**

```ts
/// <reference types="jest" />

import { PassThrough } from "stream";

jest.mock("https", () => ({ ...jest.requireActual("https"), request: jest.fn() }));

import * as https from "https";
import { DataverseManager } from "../../../../src/main/managers/dataverseManager";
import type { AuthManager } from "../../../../src/main/managers/authManager";
import type { ConnectionsManager } from "../../../../src/main/managers/connectionsManager";

const requestMock = https.request as unknown as jest.Mock;

/** Answers every https.request with an empty OData page and returns the request paths actually sent. */
function captureSentPaths(): string[] {
    const paths: string[] = [];
    requestMock.mockImplementation((options: https.RequestOptions, callback: (res: PassThrough) => void) => {
        paths.push(String(options.path));
        const res = Object.assign(new PassThrough(), { statusCode: 200, headers: { "content-type": "application/json" } });
        callback(res);
        setImmediate(() => res.end('{"value":[]}'));
        return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
    });
    return paths;
}

function createManager(): DataverseManager {
    const manager = new DataverseManager({} as ConnectionsManager, {} as AuthManager);
    const internal = manager as unknown as { getConnectionWithToken: jest.Mock };
    internal.getConnectionWithToken = jest.fn().mockResolvedValue({ connection: { url: "https://example.crm.dynamics.com" }, accessToken: "test-token" });
    return manager;
}

describe("queryData request path (RG-001 host half)", () => {
    afterEach(() => requestMock.mockReset());

    it("sends a tool-relative nextLink without re-encoding its skiptoken", async () => {
        const paths = captureSentPaths();
        const relative =
            "powerpagecomponents?$select=name&$orderby=name,powerpagecomponentid&$skiptoken=%3Ccookie%20pagenumber=%222%22%20pagingcookie=%22%253ccookie%2520page%253d%25221%2522%253e%22%20/%3E";
        await createManager().queryData("connection-1", relative);
        expect(paths).toEqual([`/api/data/v9.2/${relative}`]);
    });

    it("percent-encodes an OData string literal exactly once", async () => {
        const paths = captureSentPaths();
        await createManager().queryData("connection-1", "powerpagecomponents?$select=name&$filter=name eq 'S2%20O''Brien%20name'");
        expect(paths).toEqual(["/api/data/v9.2/powerpagecomponents?$select=name&$filter=name%20eq%20%27S2%20O%27%27Brien%20name%27"]);
    });
});
```

The second input is what `odataString` (`Server Logic/src/features/inspector/scan/queries.ts:28-35`) produces: `encodeURIComponent` leaves `'` raw. If either test fails, do not change host code in this task. Record the received path as an RG-001 finding in `findings/logic/probe_findings.md` and stop.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `corepack pnpm exec jest --config jest.config.ts tests/unit/main/managers/dataverseQueryDataWire.test.ts`

Expected: `Tests:       2 passed, 2 total`

Run: `corepack pnpm exec prettier --check tests/unit/main/managers/dataverseQueryDataWire.test.ts && corepack pnpm run test:unit`

Expected: `All matched files use Prettier code style!`, then a jest summary with `0 failed`.

- [ ] **Step 5: Commit the coherent change**

```bash
git add tests/unit/main/managers/dataverseQueryDataWire.test.ts
git commit -m "test(dataverse): pin the queryData wire path for nextLinks and string literals"
```

---

### Task 2: Fork `safeSerialize` summarises binary values (F1)

**Owns:** the recorded shape of binary values:

```ts
{ binary: true, type, byteLength, sha256, head }
```

Here `head` is the first 16 bytes, as hex. Every `pptb_debug_*` output uses `safeSerialize`, including the planned `host_calls` arguments.

**Files:**

- Modify: `C:/Users/RyanDev/source/repos/desktop-app/src/main/mcp/debugTools.ts:142-219`: adds a binary branch to `serializeValue`.
- Modify: `C:/Users/RyanDev/source/repos/desktop-app/tests/unit/main/mcp/debugTools.test.ts:182`: adds a test case inside `describe("safeSerialize")`.
- Signal: `corepack pnpm exec jest --config jest.config.ts tests/unit/main/mcp/debugTools.test.ts -t "summarises binary"`

- [ ] **Step 1: Establish the observable pre-change signal**

Add at the top of `tests/unit/main/mcp/debugTools.test.ts`, after line 1:

```ts
import { createHash } from "crypto";
```

Add inside `describe("safeSerialize", () => {` (line 182):

```ts
    it("summarises binary values instead of serialising each byte", () => {
        const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
        const summary = { binary: true, byteLength: 6, sha256: createHash("sha256").update(bytes).digest("hex"), head: "255044462d31" };
        expect(safeSerialize(bytes)).toEqual({ ...summary, type: "Uint8Array" });
        expect(safeSerialize(Buffer.from(bytes))).toEqual({ ...summary, type: "Buffer" });
        expect(safeSerialize(bytes.buffer)).toEqual({ ...summary, type: "ArrayBuffer" });
        expect(safeSerialize(new Uint8Array(40000))).toMatchObject({ byteLength: 40000, head: "00".repeat(16) });
    });
```

- [ ] **Step 2: Capture the current signal**

Run: `corepack pnpm exec jest --config jest.config.ts tests/unit/main/mcp/debugTools.test.ts -t "summarises binary"`

Expected: `1 failed`. The diff shows `Received` as `{"0": 37, "1": 80, …}`, one key per byte (the generic `Object.keys` branch at `debugTools.ts:196-207`).

- [ ] **Step 3: Implement the minimum fix**

Add to the imports of `src/main/mcp/debugTools.ts`, after line 10:

```ts
import { createHash } from "crypto";
```

After `const SERIALIZE_MAX_DEPTH = 20;` (line 37):

```ts
const BINARY_HEAD_BYTES = 16;

/** Binary values (Buffer, typed arrays, ArrayBuffer) are summarised, never expanded byte by byte, so they stay small and comparable. */
function summarizeBinary(value: ArrayBufferView | ArrayBuffer): { binary: true; type: string; byteLength: number; sha256: string; head: string } {
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return {
        binary: true,
        type: value.constructor.name,
        byteLength: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        head: Buffer.from(bytes.subarray(0, BINARY_HEAD_BYTES)).toString("hex"),
    };
}
```

In `serializeValue`, directly after the `Date` branch:

```ts
        if (obj instanceof Date) {
            return Number.isNaN(obj.getTime()) ? "Invalid Date" : obj.toISOString();
        }
        if (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer) {
            return summarizeBinary(obj);
        }
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `corepack pnpm exec jest --config jest.config.ts tests/unit/main/mcp/debugTools.test.ts -t "summarises binary"`

Expected: `1 passed`.

Run: `corepack pnpm exec prettier --check src/main/mcp/debugTools.ts tests/unit/main/mcp/debugTools.test.ts && corepack pnpm run typecheck && corepack pnpm run lint && corepack pnpm run test:unit`

Expected: Prettier reports no issues, `tsc` and eslint exit 0, and jest reports `0 failed`.

Run: `corepack pnpm exec vite build`

Expected: the build exits 0 and rewrites `dist/main/index.js`. `pptb.mjs start` runs that file, so live sessions only get the binary summary after this rebuild. The same rebuild is needed after G1 lands.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/main/mcp/debugTools.ts tests/unit/main/mcp/debugTools.test.ts
git commit -m "feat(debug-tools): summarise binary values in safeSerialize instead of expanding every byte"
```

---

### Task 3: The fork interception plan defines the action, precedence, cap and scenario-step contract

**Owns:**
- the `delay-then-respond` action (F4);
- rule precedence;
- `HOST_CALL_ARGS_CAP`;
- the scenario fields of the `intercept`, `calls` and `clearIntercepts` steps.

Tasks 8–10 write against these.

**Files:**

- Modify: `C:/Users/RyanDev/source/repos/desktop-app/.omc/plans/host-call-interception-for-e2e.md`, sections 2.1 (lines 47-61), 2.4 (line 120), 2.6 (line 131), 3 (task 1) and 4.
- Signal: `grep -nE "delay-then-respond|HOST_CALL_ARGS_CAP =|argsExcludes|first matching rule" .omc/plans/host-call-interception-for-e2e.md`

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
cd C:/Users/RyanDev/source/repos/desktop-app
grep -nE "delay-then-respond|HOST_CALL_ARGS_CAP =|argsExcludes|first matching rule" .omc/plans/host-call-interception-for-e2e.md
```

- [ ] **Step 2: Capture the current signal**

Run: the Step 1 grep.

Expected: no output and exit code 1. Today the plan has:
- no way to answer a call after a delay without reaching the real handler;
- no stated rule precedence;
- no value for `HOST_CALL_ARGS_CAP`;
- no field-level step syntax.

- [ ] **Step 3: Implement the minimum fix**

**In 2.1**, replace the `action:` union with:

```ts
    action:
        | { kind: "error"; message: string; name?: string }
        | { kind: "respond"; value: unknown }
        | { kind: "delay"; ms: number }                   // then pass through to the real handler
        | { kind: "delay-then-error"; ms: number; message: string; name?: string }
        | { kind: "delay-then-respond"; ms: number; value: unknown }; // never reaches the real handler
```

Add below the `InterceptRule` block:

```ts
export const HOST_CALL_ARGS_CAP = 16 * 1024;   // bytes of serialised args per record
export const HOST_CALL_RESULT_CAP = 4 * 1024;  // bytes of serialised result, only with includeResults
```

Then add this paragraph:

> Rules match in creation order: the first matching rule whose `target`, `toolId`, `channel` and `argsContains` all match fires. `safeSerialize` summarises Buffer, typed-array and ArrayBuffer values as `{ binary, type, byteLength, sha256, head }`. Binary arguments are therefore never truncated by the cap.

**In 2.4 validation**, change "`delay.ms` max 120000" to "`ms` of every delay action max 120000; `delay-then-respond.value` must survive `structuredClone`".

**In 2.6**, replace the `scripts/scenario.mjs` bullet with:

> - `scripts/scenario.mjs` gains three step types. None of them defaults its target. Results are documented in `references/scenarios.md`.
>
> | Step | Fields | Subject |
> |---|---|---|
> | `intercept` | `"intercept": "<target>"` (`"any"` allowed), `channel`, `argsContains?`, `action` (2.1; the runner passes `action.ms` through `Number()` so `{{var}}` strings work), `times?`, `toolId?` | `{ ruleId }` |
> | `calls` | `"calls": "<target>"`, `channel?`, `since?` (sent as `sinceSeq`), `limit?`, `includeResults?`, `argsContains?` (string), `argsExcludes?` (string[]), `mark?` | the records sorted by `seq` ascending. The runner then keeps records whose `JSON.stringify(args)` contains `argsContains` and none of `argsExcludes`. `mark` stores the response's `nextSeq` in that variable |
> | `clearIntercepts` | `"clearIntercepts": "<target>"` or `"all"` | `{ removed }` |
>
> `runStep` checks `intercept`, `calls` and `clearIntercepts` before the existing `console` and `mark` branches. Otherwise a `{ "calls": …, "mark": … }` step would fall into the console `mark` branch (`scenario.mjs:110`) and store a console sequence number. `calls` sends `limit` as given, default 200 (§2.4). Steps that must see every record pass `limit: 2000`.

**In section 3, task 1 tests**, append: "`delay-then-respond` waits at least `ms` and never calls the handler; first-match precedence in creation order; a typed-array argument is recorded as its binary summary."

**In section 4**, append:

> 12. `delay-then-respond` returns its value after at least `ms` without invoking the handler.
> 13. Two rules matching one call fire in creation order; a spent `times` rule no longer matches.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: the Step 1 grep.

Expected: at least four matching lines: `delay-then-respond` (2.1, 2.4, 3, 4), `HOST_CALL_ARGS_CAP = 16 * 1024`, `argsExcludes` and `first matching rule`.

Run: `git status --short .omc`

Expected: `?? .omc/`, unchanged. `.omc/` is untracked in the fork, so nothing else changed.

- [ ] **Step 5: Commit the coherent change**

There is no commit: `.omc/` is untracked in the fork by the owner's choice. Hand the amended plan to the owner for gate G1.

---

### Task 4: The probe skill runs a script file inside a target (`evalFile`)

**Owns:**
- the `evalFile` scenario step, which injects `scripts/s2-probe.js` without pasting it into DevTools;
- repeatable `--var`. Today `parseArgs` keeps only the last value, so `probe-live.mjs` can't pass `toolPath` and the local vars together.

**Files:**

- Modify: `C:/Users/RyanDev/.claude/skills/pptb-live-probe/scripts/lib.mjs:41-43`: a repeated option accumulates into an array.
- Modify: `C:/Users/RyanDev/.claude/skills/pptb-live-probe/scripts/scenario.mjs:74` (target default) and before line 141 (the `call` branch). Adds the `evalFile` branch.
- Modify: `C:/Users/RyanDev/.claude/skills/pptb-live-probe/references/scenarios.md:31`: adds a step-table row.
- Create: `C:/Users/RyanDev/.claude/skills/pptb-live-probe/assets/evalfile-example.js`: sets a known global.
- Create: `C:/Users/RyanDev/.claude/skills/pptb-live-probe/assets/evalfile-example.json`: proves the step.
- Signal: `node scripts/scenario.mjs assets/evalfile-example.json`, run in the skill folder against a running session.

- [ ] **Step 1: Establish the observable pre-change signal**

`assets/evalfile-example.js`:

```js
// Example payload for the evalFile step: installs a global the scenario then reads back.
(() => {
    window.__evalFileExample = 42;
})();
```

`assets/evalfile-example.json`:

```json
{
    "name": "evalFile step example",
    "steps": [
        { "name": "inject the example script into the ToolBox window", "evalFile": "evalfile-example.js", "target": "toolbox", "critical": true },
        { "name": "the script's global is readable", "eval": "window.__evalFileExample", "target": "toolbox", "expect": { "equals": 42 } },
        { "name": "every --var is kept", "eval": "'{{first}}-{{second}}'", "target": "toolbox", "expect": { "equals": "1-2" } }
    ]
}
```

- [ ] **Step 2: Capture the current signal**

Run: `cd C:/Users/RyanDev/.claude/skills/pptb-live-probe && node scripts/pptb.mjs start && node scripts/scenario.mjs assets/evalfile-example.json --var first=1 --var second=2`

Expected:

```
FAIL  inject the example script into the ToolBox window
      Unknown step type: ["name","evalFile","target","critical"]
```

The final summary line starts with `FAILED: 0 passed, 1 failed, 2 skipped`.

Run: `node scripts/scenario.mjs assets/evalfile-example.json --var first=1 --var second=2 --report vars-check.json && type vars-check.json`

Expected: the report's `"vars"` is `{ "second": "2" }`. The first `--var` was dropped. Delete `vars-check.json` afterwards.

- [ ] **Step 3: Implement the minimum fix**

In `lib.mjs`, `parseArgs`:

```js
            else {
                options[key] = key in options ? [].concat(options[key], next) : next;
                i += 1;
            }
```

`scenario.mjs:20` already flattens with `[].concat(options.var ?? [])`.

In `scenario.mjs`, `runStep`:

```js
    const needsTarget = ("eval" in step || "evalFile" in step || "event" in step || "mark" in step) && step.target === undefined;
```

Before `if ("call" in s) {`:

```js
    if ("evalFile" in s) {
        const source = fs.readFileSync(path.resolve(baseDir, s.evalFile), "utf8");
        const args = { target: s.target, expression: `${source}\nreturn true;` };
        if (s.timeoutMs) args.timeoutMs = s.timeoutMs;
        const r = await callTool(session, "pptb_debug_evaluate", args);
        if (!r.data || r.data.ok !== true) return fail(`evalFile failed: ${JSON.stringify(r.data?.error ?? r.text).slice(0, 300)}`);
        return { subject: r.data.value, failures: check(r.data.value, s.expect) };
    }
```

In `references/scenarios.md`, after the `eval` + `expectError` row (line 31):

```markdown
| `evalFile` | `"evalFile": "<path>"` (relative to the scenario file), `target` (default `{{tool}}`), `timeoutMs` | `true` once the file ran |
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `node scripts/scenario.mjs assets/evalfile-example.json --var first=1 --var second=2`

Expected: three `PASS` lines and `OK: 3 passed, 0 failed, 0 skipped`.

Run: `node scripts/scenario.mjs assets/example-scenario.json && node scripts/pptb.mjs stop`

Expected: the same pass/fail result as before this task. Its steps don't use `evalFile`.

- [ ] **Step 5: Commit the coherent change**

There is no commit: `~/.claude/skills/pptb-live-probe` is not a git repository. Its own skill-update task (fork plan §2.6) carries the change forward.

---

### Task 5: `scripts/probe-live.mjs` builds the tool and runs probe groups

**Owns:**
- the probe directory layout;
- the group list and gating;
- the `probes/.local.json` key list in `probes/README.md`;
- the `--pack` load of the packed tarball (A12/RG-006);
- the npm entry points.

**Files:**

- Create: `scripts/probe-live.mjs`: build, session start, group runs, summary.
- Create: `probes/README.md`: groups, prerequisites, `.local.json` keys.
- Modify: `.gitignore` (end of file): ignores reports, shots and local vars.
- Modify: `package.json` `scripts`: adds `probe:live`, `probe:live:connected` and `probe:live:pack`.
- Signal: `npm run probe:live -- nope`

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
npm run probe:live -- nope
```

- [ ] **Step 2: Capture the current signal**

Run: `npm run probe:live -- nope`

Expected: `npm error Missing script: "probe:live"`

- [ ] **Step 3: Implement the minimum fix**

`scripts/probe-live.mjs`:

```js
#!/usr/bin/env node
// Builds the tool and runs live PPTB probe scenarios through the pptb-live-probe skill.
// Usage: node scripts/probe-live.mjs [--pack] [group ...]   Groups and prerequisites: probes/README.md
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SKILL_SCRIPTS = join(process.env.PPTB_LIVE_PROBE_DIR ?? join(homedir(), '.claude', 'skills', 'pptb-live-probe'), 'scripts');
const LOCAL_VARS = join(ROOT, 'probes', '.local.json');
const GROUPS = {
  basic: { dir: 'probes', gating: true, local: false },
  host: { dir: 'probes/generated/host', gating: true, local: false },
  connected: { dir: 'probes/generated/connected', gating: true, local: true },
  live: { dir: 'probes/live', gating: true, local: true },
  pending: { dir: 'probes/generated/pending', gating: false, local: true },
};
const WINDOWS = process.platform === 'win32';

const npm = (args, cwd = ROOT) => spawnSync('npm', args, { cwd, stdio: 'inherit', shell: WINDOWS }).status ?? 1;
const node = (script, args) => spawnSync(process.execPath, [script, ...args], { cwd: ROOT, stdio: 'inherit' }).status ?? 1;

function localVarArgs() {
  const parsed = JSON.parse(readFileSync(LOCAL_VARS, 'utf8'));
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('probes/.local.json must be a JSON object of string values.');
  }
  return Object.entries(parsed).flatMap(([key, value]) => {
    if (typeof value !== 'string') throw new Error(`probes/.local.json: "${key}" must be a string.`);
    return ['--var', `${key}=${value}`];
  });
}

/** RG-006: load what npm would publish, not the working tree. */
function packedToolPath() {
  const out = mkdtempSync(join(tmpdir(), 'sl-probe-pack-'));
  if (npm(['pack', '--pack-destination', out]) !== 0) throw new Error('npm pack failed.');
  const tarball = readdirSync(out).find((name) => name.endsWith('.tgz'));
  if (tarball === undefined) throw new Error('npm pack wrote no tarball.');
  if (spawnSync('tar', ['-xzf', tarball], { cwd: out, stdio: 'inherit' }).status !== 0) throw new Error('tar failed.');
  return join(out, 'package');
}

const argv = process.argv.slice(2);
const pack = argv.includes('--pack');
const selected = argv.filter((arg) => arg !== '--pack');
if (selected.length === 0) selected.push('basic');
const unknown = selected.filter((name) => !(name in GROUPS));
if (unknown.length > 0) {
  console.error(`Unknown group ${unknown.join(', ')}. Groups: ${Object.keys(GROUPS).join(', ')}`);
  process.exit(2);
}
if (selected.some((name) => GROUPS[name].local) && !existsSync(LOCAL_VARS)) {
  console.error('These groups need probes/.local.json. See probes/README.md.');
  process.exit(2);
}
if (npm(['run', 'build']) !== 0) process.exit(1);
const toolPath = pack ? packedToolPath() : ROOT;
if (node(join(SKILL_SCRIPTS, 'pptb.mjs'), ['start']) !== 0) process.exit(1);

const lines = [];
let gatingFailures = 0;
for (const name of selected) {
  const group = GROUPS[name];
  const dir = join(ROOT, group.dir);
  const files = existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith('.json') && !file.startsWith('.')).sort() : [];
  const reportDir = join(ROOT, 'probes', 'reports', name);
  mkdirSync(reportDir, { recursive: true });
  if (files.length === 0) {
    lines.push(`EMPTY ${name}`);
    if (group.gating) gatingFailures += 1;
  }
  for (const file of files) {
    const args = [join(dir, file), '--report', join(reportDir, file), '--var', `toolPath=${toolPath}`];
    if (group.local) args.push(...localVarArgs());
    const status = node(join(SKILL_SCRIPTS, 'scenario.mjs'), args);
    lines.push(`${status === 0 ? 'PASS ' : group.gating ? 'FAIL ' : 'RED  '} ${name}/${file}`);
    if (status !== 0 && group.gating) gatingFailures += 1;
  }
}
console.log(`\n${lines.join('\n')}`);
process.exitCode = gatingFailures === 0 ? 0 : 1;
```

`probes/README.md`:

````markdown
# Live PPTB probes

Scenarios for the `pptb-live-probe` skill. They run against the PPTB fork `desktop-app` (branch `agent-debug-tools`), started by the skill with `PPTB_AGENT_DEBUG=1`.

| Group | Folder | Needs | Gating |
|---|---|---|---|
| `basic` | `probes/*.json` | the skill | yes |
| `host` | `probes/generated/host/` | the fork's host-call interception | yes |
| `connected` | `probes/generated/connected/` | interception, the Dev connection, `probes/.local.json` | yes |
| `live` | `probes/live/` | interception, both connections, `probes/.local.json` | yes |
| `pending` | `probes/generated/pending/` | as `connected` | no: known-red, reported as `RED` |

Run with `npm run probe:live` (basic, host), `npm run probe:live:connected` (connected, live, pending) and `npm run probe:live:pack` (basic, against the `npm pack` tarball). Reports land in `probes/reports/<group>/` and are gitignored; they hold the `--var` values, so never commit them. Stop the session with `node ~/.claude/skills/pptb-live-probe/scripts/pptb.mjs stop`.

Files under `probes/generated/` come from `tests/probeScenarios.test.ts`. Edit the generator, then run `npx vitest run tests/probeScenarios.test.ts -u`.

## probes/.local.json

Never committed. Every value is a string.

| Key | Value |
|---|---|
| `connectionName` | Name of the Dev connection in the probe profile |
| `restrictedConnectionName` | Name of a connection whose user can't read `powerpagesite` |
| `siteId` | GUID of the Dev Power Pages site |
| `siteName` | Display name of that site as the site picker shows it (no apostrophes) |
| `recordId` | `powerpagecomponentid` of a populated server logic (type 35) record on that site |
| `envSchemaCurrent` | Schema name of an environment variable with a current value |
| `envSchemaDefault` | Schema name of one with only a default value |
| `envSchemaMissing` | A schema name that doesn't exist |
| `envSchemaSecret` | Schema name of a secret-type environment variable |
| `latencyMs` | Median Dataverse call latency in ms; `node scripts/probe-evidence.mjs` prints it after a `live` run |
````

Append to `.gitignore`:

```
/probes/reports/
/probes/**/shots/
/probes/.local.json
```

Add to `package.json` `scripts`, after `"size": "node scripts/bundle-size.mjs dist/assets"`. Give that line a trailing comma first, because it is currently the last entry:

```json
    "probe:live": "node scripts/probe-live.mjs basic",
    "probe:live:connected": "node scripts/probe-live.mjs connected live pending",
    "probe:live:pack": "node scripts/probe-live.mjs --pack basic"
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm run probe:live -- nope`

Expected: `Unknown group nope. Groups: basic, host, connected, live, pending` and exit code 2. The build doesn't start.

Run: `node scripts/probe-live.mjs connected`

Expected: `These groups need probes/.local.json. See probes/README.md.` and exit code 2.

Run: `git check-ignore -v probes/.local.json probes/reports/basic/x.json probes/shots/a.png && npm test`

Expected: three `.gitignore:` lines, then Vitest `Test Files  115 passed`.

- [ ] **Step 5: Commit the coherent change**

```bash
git add scripts/probe-live.mjs probes/README.md .gitignore package.json
git commit -m "chore(probes): add the live PPTB probe runner, group layout and local-var contract"
```

---

### Task 6: The basic smoke proves pages, themes, events, reload and theme latency in the real host

**Owns:**
- the `sl:theme-applied` performance mark (A9 budget: under 1000 ms from navigation start; supervised review host U2);
- `probes/smoke.json`.

It covers:
- A11 page render;
- A12, via `probe:live:pack`;
- the no-connection Inspector state;
- host and runtime versions;
- a real `settings:updated`, raised through the isolated probe profile's own settings.

**Files:**

- Create: `probes/smoke.json`: the no-connection smoke.
- Modify: `src/main.tsx:25`: marks the moment the host theme is applied.
- Signal: `npm run probe:live`

- [ ] **Step 1: Establish the observable pre-change signal**

`probes/smoke.json`:

```json
{
  "name": "Server Logic basic smoke (no connection)",
  "vars": { "toolPath": "C:/Users/RyanDev/source/repos/Server Logic" },
  "steps": [
    { "name": "open the built tool", "open": "{{toolPath}}", "as": "tool", "critical": true },
    { "name": "mark console before interacting", "mark": "start" },
    { "name": "host version", "eval": "await window.toolboxAPI.getAppVersion()", "target": "toolbox", "expect": { "matches": "^\\d+\\.\\d+\\.\\d+" }, "report": true },
    { "name": "Electron runtime version", "eval": "navigator.userAgent.match(/Electron\\/([\\d.]+)/)?.[1] ?? null", "expect": { "type": "string" }, "report": true },
    { "name": "three released page tabs", "eval": "[...document.querySelectorAll('[role=tablist][aria-label=Pages] [role=tab]')].map((t) => t.textContent.trim() + (t.getAttribute('aria-disabled') === 'true' ? ' (disabled)' : ''))", "expect": { "equals": ["Logic Starter", "Server Objects", "Logic Inspector"] } },
    { "name": "theme applied before first render within 1 s", "eval": "performance.getEntriesByName('sl:theme-applied')[0]?.startTime ?? -1", "expect": { "all": [{ "gt": 0 }, { "lt": 1000 }] }, "report": true },
    { "name": "ToolBox switches to light", "eval": "await window.toolboxAPI.updateUserSettings({ theme: 'light' }); return true", "target": "toolbox" },
    { "name": "tool follows to light", "eval": "document.documentElement.dataset.theme", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "light" } },
    { "name": "light: Starter", "eval": "(document.querySelector('#tab-starter').click(), document.querySelector('#tab-starter').getAttribute('aria-selected'))", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "true" } },
    { "name": "light: Starter screenshot", "shot": "{{tool}}", "out": "shots/light-starter.png", "expect": { "path": "width", "gt": 0 } },
    { "name": "light: Server Objects", "eval": "(document.querySelector('#tab-objects').click(), document.querySelector('#tab-objects').getAttribute('aria-selected'))", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "true" } },
    { "name": "light: Server Objects screenshot", "shot": "{{tool}}", "out": "shots/light-objects.png", "expect": { "path": "width", "gt": 0 } },
    { "name": "light: Logic Inspector", "eval": "(document.querySelector('#tab-inspector').click(), document.querySelector('#tab-inspector').getAttribute('aria-selected'))", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "true" } },
    { "name": "light: Logic Inspector screenshot", "shot": "{{tool}}", "out": "shots/light-inspector.png", "expect": { "path": "width", "gt": 0 } },
    { "name": "ToolBox switches to dark", "eval": "await window.toolboxAPI.updateUserSettings({ theme: 'dark' }); return true", "target": "toolbox" },
    { "name": "tool follows to dark", "eval": "document.documentElement.dataset.theme", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "dark" } },
    { "name": "dark: Logic Inspector screenshot", "shot": "{{tool}}", "out": "shots/dark-inspector.png", "expect": { "path": "width", "gt": 0 } },
    { "name": "dark: Server Objects", "eval": "(document.querySelector('#tab-objects').click(), document.querySelector('#tab-objects').getAttribute('aria-selected'))", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "true" } },
    { "name": "dark: Server Objects screenshot", "shot": "{{tool}}", "out": "shots/dark-objects.png", "expect": { "path": "width", "gt": 0 } },
    { "name": "dark: Starter", "eval": "(document.querySelector('#tab-starter').click(), document.querySelector('#tab-starter').getAttribute('aria-selected'))", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "true" } },
    { "name": "dark: Starter screenshot", "shot": "{{tool}}", "out": "shots/dark-starter.png", "expect": { "path": "width", "gt": 0 } },
    { "name": "ToolBox back to light", "eval": "await window.toolboxAPI.updateUserSettings({ theme: 'light' }); return true", "target": "toolbox" },
    { "name": "open Logic Inspector", "eval": "(document.querySelector('#tab-inspector').click(), true)" },
    { "name": "Inspector explains that it needs a connection", "eval": "[...document.querySelectorAll('#panel-inspector h2')].map((h) => h.textContent.trim())", "waitFor": { "timeoutMs": 10000 }, "expect": { "contains": "No active connection" } },
    { "name": "connection:created is handled", "event": "connection:created", "data": { "id": "probe-none" } },
    { "name": "connection:updated is handled", "event": "connection:updated", "data": { "id": "probe-none", "updates": {} } },
    { "name": "connection:deleted is handled", "event": "connection:deleted", "data": { "id": "probe-none" } },
    { "name": "Inspector still explains that it needs a connection", "eval": "[...document.querySelectorAll('#panel-inspector h2')].map((h) => h.textContent.trim())", "waitFor": { "timeoutMs": 5000 }, "expect": { "contains": "No active connection" } },
    { "name": "every button has an accessible name", "eval": "[...document.querySelectorAll('button')].filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim() || b.getAttribute('title'))).map((b) => b.outerHTML.slice(0, 80))", "expect": { "length": 0 } },
    { "name": "reload the tool", "reload": "{{tool}}" },
    { "name": "Starter is the first page after reload", "eval": "document.querySelector('[role=tab][aria-selected=true]')?.id", "waitFor": { "timeoutMs": 10000 }, "expect": { "equals": "tab-starter" } },
    { "name": "no console errors since start", "console": "{{tool}}", "since": "{{start}}", "levels": ["error"], "ignore": ["Electron Security Warning"], "expect": { "length": 0 } }
  ]
}
```

The `updateUserSettings` calls write only the throwaway probe profile that `pptb.mjs start` creates. They don't touch the user's PPTB settings or any tool settings.

- [ ] **Step 2: Capture the current signal**

Run: `npm run probe:live`

Expected:

```
FAIL  theme applied before first render within 1 s
      … -1 …
```

The run then ends with `FAIL  basic/smoke.json` and exit code 1. There is no mark yet, so A9 can't be measured.

- [ ] **Step 3: Implement the minimum fix**

In `src/main.tsx`, inside `.then((theme) => {`:

```tsx
  .then((theme) => {
    applyTheme(theme);
    // Live probes read this mark to measure host-theme latency before the first frame (AC-1.6, A9).
    performance.mark('sl:theme-applied');
    createRoot(root, {
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm run probe:live`

Expected: `OK: 32 passed, 0 failed, 0 skipped`, then `PASS  basic/smoke.json`, exit code 0. The `theme applied …` report value is between 0 and 1000. If any other step fails, it is a live finding: record the step name and failure text in `findings/logic/probe_findings.md`, and don't weaken the expectation.

Run: `npm run probe:live:pack`

Expected: `PASS  basic/smoke.json` against `…/sl-probe-pack-…/package` (A12/RG-006).

Run: `npm run typecheck && npm run lint && npm test`

Expected: all three exit 0, and Vitest reports `115 passed`.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/main.tsx probes/smoke.json
git commit -m "test(probes): basic live smoke with page, theme, event and reload checks; mark theme application"
```

---

### Task 7: The page journeys run Starter and Server Objects in the real host (A11)

**Owns:** `probes/journeys.json`:
- Starter name hostility;
- method radio;
- Browse all;
- search;
- Copy, with the toast observed in the ToolBox;
- Insert with one undo;
- Back to Create Logic.

**Files:**

- Create: `probes/journeys.json`: the two page walk-throughs.
- Signal: `npm run probe:live`

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
npm run probe:live
```

- [ ] **Step 2: Capture the current signal**

Run: `npm run probe:live`

Expected: the summary lists only `PASS  basic/smoke.json`. No journey is exercised in the host.

- [ ] **Step 3: Implement the minimum fix**

`probes/journeys.json`:

```json
{
  "name": "Starter and Server Objects journeys (no connection)",
  "vars": { "toolPath": "C:/Users/RyanDev/source/repos/Server Logic" },
  "steps": [
    { "name": "open the built tool", "open": "{{toolPath}}", "as": "tool", "critical": true },
    { "name": "mark console before interacting", "mark": "start" },
    { "name": "default logic name", "eval": "document.querySelector('input[aria-label=\"Logic name\"]').value", "waitFor": { "timeoutMs": 10000 }, "expect": { "equals": "customer-summary" } },
    { "name": "recipe shown at start", "eval": "document.querySelector('[role=combobox][aria-label=Recipe]').value", "report": true, "expect": { "type": "string" } },
    { "name": "type a hostile logic name", "eval": "const input = document.querySelector('input[aria-label=\"Logic name\"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Customer \"Summary\" <script>alert(1)</script> 名前'); input.dispatchEvent(new Event('input', { bubbles: true })); return true" },
    { "name": "file name stays a safe slug", "eval": "document.querySelector('#panel-starter .starter-pane__title')?.textContent.trim() ?? null", "waitFor": { "timeoutMs": 5000 }, "expect": { "matches": "^[a-z0-9-]+\\.js$" } },
    { "name": "no script element was injected", "eval": "document.querySelectorAll('#root script').length", "expect": { "equals": 0 } },
    { "name": "choose POST", "eval": "([...document.querySelectorAll('[role=radiogroup][aria-label=\"HTTP method\"] [role=radio]')].find((r) => r.textContent.trim() === 'POST').click(), true)" },
    { "name": "POST is checked", "eval": "[...document.querySelectorAll('[role=radiogroup][aria-label=\"HTTP method\"] [role=radio]')].find((r) => r.textContent.trim() === 'POST').getAttribute('aria-checked')", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "true" } },
    { "name": "remember the handler text", "eval": "window.__probeHandler = document.querySelector('.cm-content[aria-label=\"Server code\"]').textContent; return window.__probeHandler.length", "expect": { "gt": 0 } },
    { "name": "choose Browse all in Server Objects", "eval": "([...document.querySelectorAll('#panel-starter button')].find((b) => b.textContent.trim() === 'Browse all in Server Objects').click(), true)" },
    { "name": "Server Objects is selected", "eval": "document.querySelector('[role=tab][aria-selected=true]')?.id", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "tab-objects" } },
    { "name": "search narrows the list", "eval": "const input = document.querySelector('input[aria-label=\"Search objects and methods\"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Context'); input.dispatchEvent(new Event('input', { bubbles: true })); return true" },
    { "name": "object count reflects the search", "eval": "document.querySelector('#panel-objects p[role=status]').textContent.trim()", "waitFor": { "timeoutMs": 5000 }, "expect": { "matches": "^\\d+ objects? listed$" } },
    { "name": "clear the search", "eval": "const input = document.querySelector('input[aria-label=\"Search objects and methods\"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ''); input.dispatchEvent(new Event('input', { bubbles: true })); return true" },
    { "name": "find a member whose sample can be inserted", "eval": "const settle = () => new Promise((r) => setTimeout(r, 50)); for (const item of document.querySelectorAll('#panel-objects button.objects-item')) { item.click(); await settle(); for (const member of document.querySelectorAll('#panel-objects [role=radiogroup][aria-label=Members] [role=radio]')) { member.click(); await settle(); const insert = [...document.querySelectorAll('#panel-objects button')].find((b) => b.textContent.trim() === 'Insert into handler'); if (insert && insert.getAttribute('aria-disabled') !== 'true') return member.textContent.trim(); } } return null", "expect": { "type": "string" }, "report": true },
    { "name": "copy the sample", "eval": "(document.querySelector('#panel-objects button[aria-label=\"Copy sample\"]').click(), true)" },
    { "name": "ToolBox shows Code copied", "eval": "(await window.toolboxAPI.events.getHistory(50)).some((e) => e.event === 'notification:shown' && e.data?.title === 'Code copied')", "target": "toolbox", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": true } },
    { "name": "insert the sample into the handler", "eval": "([...document.querySelectorAll('#panel-objects button')].find((b) => b.textContent.trim() === 'Insert into handler').click(), true)" },
    { "name": "Starter is selected after insert", "eval": "document.querySelector('[role=tab][aria-selected=true]')?.id", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "tab-starter" } },
    { "name": "the handler changed", "eval": "document.querySelector('.cm-content[aria-label=\"Server code\"]').textContent !== window.__probeHandler", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": true } },
    { "name": "one Ctrl+Z", "eval": "const content = document.querySelector('.cm-content[aria-label=\"Server code\"]'); content.focus(); content.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true })); return true" },
    { "name": "one undo restores the handler", "eval": "document.querySelector('.cm-content[aria-label=\"Server code\"]').textContent === window.__probeHandler", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": true } },
    { "name": "back to Server Objects", "eval": "(document.querySelector('#tab-objects').click(), true)" },
    { "name": "choose Back to Create Logic", "eval": "([...document.querySelectorAll('#panel-objects button')].find((b) => b.textContent.trim() === 'Back to Create Logic').click(), true)", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": true } },
    { "name": "Starter is selected again", "eval": "document.querySelector('[role=tab][aria-selected=true]')?.id", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": "tab-starter" } },
    { "name": "Starter screenshot", "shot": "{{tool}}", "out": "shots/journeys-starter.png", "expect": { "path": "width", "gt": 0 } },
    { "name": "no console errors since start", "console": "{{tool}}", "since": "{{start}}", "levels": ["error"], "ignore": ["Electron Security Warning"], "expect": { "length": 0 } }
  ]
}
```

"copy the sample" overwrites the OS clipboard of the machine running the probe.

Host notifications draw in a separate notification window, never in the ToolBox `document.body`. The step therefore reads the ToolBox event history (`preload.ts:310`), where every `notification:shown` is recorded.

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm run probe:live`

Expected: `PASS  basic/journeys.json` and `PASS  basic/smoke.json`, exit code 0.

CodeMirror renders only the visible lines. If "the handler changed" or "one undo restores the handler" fails, open `probes/shots/journeys-starter.png` before you call it a defect. Either way, record the outcome in `findings/logic/probe_findings.md`.

- [ ] **Step 5: Commit the coherent change**

```bash
git add probes/journeys.json
git commit -m "test(probes): live Starter and Server Objects journeys"
```

---

### Task 8: Generated host-call scenarios cover event subscriptions, Starter save paths and the retrieval-only guard

**Owns:**
- `tests/probeScenarios.test.ts`: the scenario generator, the retrieval-only guard and `WRITE_CHANNELS`;
- `probes/generated/host/host-calls.json`.

It covers A13 (fix-7 #7) and AC-5.11 on the tool side. It requires gate G1 and Task 3's step contract.

**Files:**

- Create: `tests/probeScenarios.test.ts`: builds the scenario JSON and pins it as golden files.
- Create (generated): `probes/generated/host/host-calls.json`.
- Modify: `package.json` `scripts.probe:live`, to `node scripts/probe-live.mjs basic host`.
- Signal: `npx vitest run tests/probeScenarios.test.ts`, then `npm run probe:live`.

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
node scripts/probe-live.mjs basic host
```

- [ ] **Step 2: Capture the current signal**

Run: `node scripts/probe-live.mjs basic host`

Expected: `EMPTY host` and exit code 1. No host-call scenario exists.

- [ ] **Step 3: Implement the minimum fix**

`tests/probeScenarios.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

/**
 * Generates the live-probe scenarios under probes/generated/ for the pptb-live-probe skill.
 * `npx vitest run tests/probeScenarios.test.ts -u` rewrites them; a plain run fails when they drift.
 * Step contract: desktop-app/.omc/plans/host-call-interception-for-e2e.md §2.6.
 */
type Step = Record<string, unknown>;
type Scenario = { name: string; vars: Record<string, string>; steps: readonly Step[] };

const TOOL = '{{tool}}';
const TOOL_PATH = 'C:/Users/RyanDev/source/repos/Server Logic';

/** Host channels this tool must never call (spec FR-7, .claude/rules/pptb-host-and-output.md; desktop-app channels.ts). */
const WRITE_CHANNELS = [
  'dataverse.create',
  'dataverse.update',
  'dataverse.delete',
  'dataverse.createMultiple',
  'dataverse.updateMultiple',
  'dataverse.associate',
  'dataverse.disassociate',
  'dataverse.publishCustomizations',
  'dataverse.deploySolution',
  'dataverse.executeBatch',
  'dataverse.executeTransaction',
  'dataverse.createEntityDefinition',
  'dataverse.updateEntityDefinition',
  'dataverse.deleteEntityDefinition',
  'dataverse.createAttribute',
  'dataverse.updateAttribute',
  'dataverse.deleteAttribute',
  'dataverse.createPolymorphicLookupAttribute',
  'dataverse.createRelationship',
  'dataverse.updateRelationship',
  'dataverse.deleteRelationship',
  'dataverse.createGlobalOptionSet',
  'dataverse.updateGlobalOptionSet',
  'dataverse.deleteGlobalOptionSet',
  'dataverse.insertOptionValue',
  'dataverse.updateOptionValue',
  'dataverse.deleteOptionValue',
  'dataverse.orderOption',
  'tool-settings-set',
  'tool-settings-set-all',
] as const;

const clickText = (selector: string, text: string): string =>
  `([...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.trim() === ${JSON.stringify(text)}).click(), true)`;

const markCalls = (name: string): Step => ({ name: `mark host calls (${name})`, calls: TOOL, mark: name, expect: { type: 'array' } });

const openTool = (connected: boolean): Step[] => [
  {
    name: 'open the built tool',
    open: connected ? { localPath: '{{toolPath}}', connectionName: '{{connectionName}}' } : '{{toolPath}}',
    as: 'tool',
    critical: true,
  },
  { name: 'remove intercepts left by an earlier run', clearIntercepts: 'all' },
  markCalls('c0'),
];

/** Retrieval only, at runtime: no write channel, and execute only for the two file-download actions (spec FR-7, 4.1.0). */
const retrievalOnlyGuard = (since: string): Step[] => [
  ...WRITE_CHANNELS.map((channel) => ({ name: `no ${channel} call`, calls: TOOL, channel, since: `{{${since}}}`, limit: 2000, expect: { length: 0 } })),
  {
    name: 'dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock',
    calls: TOOL,
    channel: 'dataverse.execute',
    since: `{{${since}}}`,
    limit: 2000,
    argsExcludes: ['InitializeFileBlocksDownload', 'DownloadBlock'],
    expect: { length: 0 },
  },
];

const scenarioJson = (scenario: Scenario): string => `${JSON.stringify(scenario, null, 2)}\n`;

function hostCalls(): Scenario {
  const download = clickText('#panel-starter button', 'Download starter');
  const saveFile = (name: string, action: Record<string, unknown>): Step => ({
    name,
    intercept: TOOL,
    channel: 'filesystem:save-file',
    times: 1,
    action,
  });
  return {
    name: 'Host calls without a connection: event subscription after reload, Starter save paths, retrieval-only guard',
    vars: { toolPath: TOOL_PATH },
    steps: [
      ...openTool(false),
      { name: 'reload the tool', reload: TOOL },
      {
        name: 'Starter is selected after reload',
        eval: "document.querySelector('[role=tab][aria-selected=true]')?.id",
        waitFor: { timeoutMs: 10000 },
        expect: { equals: 'tab-starter' },
      },
      markCalls('beforeEvent'),
      { name: 'the host raises settings:updated', event: 'settings:updated', data: {} },
      { name: 'let the theme re-read settle', sleep: 1500 },
      {
        name: 'the theme is re-read exactly once after a reload (fix-7 #7)',
        calls: TOOL,
        channel: 'get-current-theme',
        since: '{{beforeEvent}}',
        expect: { length: 1 },
      },
      saveFile('save dialog returns a path', { kind: 'respond', value: 'C:/probe-out/customer-summary.zip' }),
      markCalls('save1'),
      { name: 'choose Download starter', eval: download },
      {
        name: 'success notification within 2 s (AC-5.11)',
        calls: TOOL,
        channel: 'show-notification',
        since: '{{save1}}',
        argsContains: 'customer-summary.zip downloaded',
        waitFor: { timeoutMs: 2000 },
        expect: { minLength: 1 },
      },
      {
        name: 'the zip reaches the host as bytes',
        calls: TOOL,
        channel: 'filesystem:save-file',
        since: '{{save1}}',
        expect: { all: [{ path: '0.args.1.binary', equals: true }, { path: '0.args.1.head', matches: '^504b0304' }] },
      },
      saveFile('save dialog is cancelled', { kind: 'respond', value: null }),
      markCalls('save2'),
      { name: 'choose Download starter again', eval: download },
      {
        name: 'the cancelled save call arrives',
        calls: TOOL,
        channel: 'filesystem:save-file',
        since: '{{save2}}',
        waitFor: { timeoutMs: 5000 },
        expect: { length: 1 },
      },
      { name: 'wait for any late notification', sleep: 1500 },
      { name: 'a cancelled save shows no notification', calls: TOOL, channel: 'show-notification', since: '{{save2}}', expect: { length: 0 } },
      saveFile('the host fails the save', { kind: 'error', message: 'EACCES: permission denied' }),
      markCalls('save3'),
      { name: 'choose Download starter a third time', eval: download },
      {
        name: 'failure notification names the file',
        calls: TOOL,
        channel: 'show-notification',
        since: '{{save3}}',
        argsContains: "Couldn't save customer-summary.zip",
        waitFor: { timeoutMs: 5000 },
        expect: { minLength: 1 },
      },
      {
        name: 'the notification carries no host error text',
        calls: TOOL,
        channel: 'show-notification',
        since: '{{save3}}',
        argsContains: 'Error invoking remote method',
        expect: { length: 0 },
      },
      ...retrievalOnlyGuard('c0'),
    ],
  };
}

describe('live probe scenarios', () => {
  it('host-calls', async () => {
    await expect(scenarioJson(hostCalls())).toMatchFileSnapshot('../probes/generated/host/host-calls.json');
  });
});
```

Generate the file:

```bash
npx vitest run tests/probeScenarios.test.ts -u
```

`package.json`:

```json
    "probe:live": "node scripts/probe-live.mjs basic host",
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run tests/probeScenarios.test.ts`

Expected: `1 passed`. The golden file matches.

Run: `npm run probe:live`

Expected: `PASS  host/host-calls.json` next to the two basic passes, exit code 0. A failing step is a live finding: record the step name in `findings/logic/probe_findings.md`.

Run: `npm run typecheck && npm run lint && npm test`

Expected: all exit 0, and Vitest reports `116 passed`.

- [ ] **Step 5: Commit the coherent change**

```bash
git add tests/probeScenarios.test.ts probes/generated/host/host-calls.json package.json
git commit -m "test(probes): generated host-call scenario with save paths, event re-subscription and retrieval-only guard"
```

---

### Task 9: Generated connected scenarios cover site-list paging, host failures, the canned scan, export and 50-handler scale

**Owns:**
- `worldSiteRows` and `worldComponentRows`: the canned rows, shared by the fake host and the probes;
- the connected and pending generated scenarios.

It covers:
- RG-001 tool half;
- A3 (pending/red until `hostErrors` classifies by message);
- A6 tool half;
- A8;
- A10 on the tool side;
- AC-9.9;
- RG-004 at 50 handlers.

It requires G1, G2 and Task 8.

**Files:**

- Modify: `src/test/inspectorWorld.ts:96-173`: extracts the row builders into two exported functions that `createInspectorHost` also uses.
- Modify: `tests/probeScenarios.test.ts`: adds the connected and pending builders and three more golden files.
- Create (generated):
  - `probes/generated/connected/site-paging.json`
  - `probes/generated/connected/scan-canned.json`
  - `probes/generated/connected/scan-scale.json`
  - `probes/generated/pending/site-list-failures.json`
- Signal: `npm run probe:live:connected`

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
node scripts/probe-live.mjs connected
```

- [ ] **Step 2: Capture the current signal**

Run: `node scripts/probe-live.mjs connected`

Expected: `EMPTY connected` and exit code 1.

- [ ] **Step 3: Implement the minimum fix**

In `src/test/inspectorWorld.ts`, add after `const COMPONENT_FILTER = …` (line 125):

```ts
/** The `powerpagesites` rows a world returns; shared by the fake host and the live-probe scenarios. */
export function worldSiteRows(world: World): readonly Row[] {
  return world.sites.map((site) => ({
    powerpagesiteid: site.ref.id,
    name: site.ref.name,
    primarydomainname: site.ref.domain,
    statecode: site.ref.active ? 0 : 1,
  }));
}

/** The rows of one component type on one site; shared by the fake host and the live-probe scenarios. */
export function worldComponentRows(site: WorldSite | undefined, type: number): readonly Row[] {
  switch (type) {
    case 35:
      return site?.files.map(logicRow) ?? [];
    case 11:
      return ROLES;
    case 18:
      return PERMISSIONS;
    default:
      return [];
  }
}
```

In `createInspectorHost`, the responder body becomes:

```ts
    const site = world.sites.find((candidate) => candidate.ref.id === match?.[1]);
    return worldComponentRows(site, Number(match?.[2]));
  };
```

`tables` becomes:

```ts
      tables: { powerpagesites: worldSiteRows(world) },
```

In `tests/probeScenarios.test.ts`, add the imports at the top:

```ts
import { COMPONENT_TYPE, componentQuery } from '@/features/inspector/scan/queries';
import { DEFAULT_WORLD, PLAIN_CODE, ROLE_STAFF, fileId, guid, worldComponentRows, worldSiteRows } from '@/test/inspectorWorld';
import type { World, WorldSite } from '@/test/inspectorWorld';
```

Add after `hostCalls()`:

```ts
/** A server-issued nextLink as Dataverse sends it: the paging cookie is already percent-encoded twice. */
const NEXT_LINK_PATH =
  'powerpagesites?$select=powerpagesiteid,name,primarydomainname,statecode&$orderby=name,powerpagesiteid&$skiptoken=%3Ccookie%20pagenumber=%222%22%20pagingcookie=%22%253ccookie%2520page%253d%25221%2522%253e%22%20/%3E';

type Respond = (value: unknown) => Record<string, unknown>;
const respondNow: Respond = (value) => ({ kind: 'respond', value });
const respondAfter =
  (ms: string): Respond =>
  (value) => ({ kind: 'delay-then-respond', ms, value });

const ALPHA = DEFAULT_WORLD.sites[0];
if (ALPHA === undefined) throw new Error('DEFAULT_WORLD starts with the Alpha site.');
const SCALE_SITE: WorldSite = {
  ref: { id: guid(0x50), name: 'Scale portal', domain: 'scale.example.com', active: true },
  files: Array.from({ length: 50 }, (_, index) => ({ n: 0x100 + index, roleIds: [ROLE_STAFF], code: PLAIN_CODE })),
};
const SCALE_WORLD: World = { sites: [SCALE_SITE] };

/** Real host error texts (desktop-app dataverseManager.ts:967-987, :200) for site-list reads, with the spec's plain-language message. */
const HOST_FAILURES = [
  { label: '401', message: 'HTTP 401', times: 1, expected: 'Authentication failed. Please reconnect.' },
  { label: '403', message: '0x80040220: Principal user is missing prvReadmspp_website privilege.', times: 1, expected: "You don't have permission to read this data." },
  { label: '404', message: "0x80060888: Resource not found for the segment 'powerpagesites'.", times: 1, expected: 'The requested data was not found.' },
  { label: '429', message: '0x80072322: Number of requests exceeded the limit of 6000 over time window of 300 seconds.', times: 4, expected: 'Too many requests. Please wait and try again.' },
  { label: '503', message: 'HTTP 503', times: 4, expected: 'The server had a problem. Please try again later.' },
  { label: 'network', message: 'Request failed: getaddrinfo ENOTFOUND example.crm.dynamics.com', times: 1, expected: null },
  { label: 'expired sign-in', message: "Authentication expired for connection 'Dev'. Please reconnect to continue.", times: 1, expected: 'Authentication failed. Please reconnect.' },
] as const;

const headingIs = (label: string, text: string, timeoutMs: number): Step => ({
  name: `${label}: Inspector shows "${text}"`,
  eval: "[...document.querySelectorAll('#panel-inspector h2')].map((h) => h.textContent.trim())",
  waitFor: { timeoutMs },
  expect: { contains: text },
});
/** After a reload React mounts only once the theme IPC answers (main.tsx:21-25), so wait for the tab. */
const openInspector: Step = {
  name: 'open Logic Inspector',
  eval: "(document.querySelector('#tab-inspector').click(), true)",
  waitFor: { timeoutMs: 10000 },
  expect: { equals: true },
};
const openPicker: Step = {
  name: 'open the site picker',
  eval: "(document.querySelector('[role=combobox][aria-label=\"Power Pages site\"]').click(), true)",
};
const SITE_OPTIONS = '[role=listbox][aria-label="Power Pages site"] [role=option]';

const cannedSiteList = (world: World, respond: Respond): Step => ({
  name: 'canned site list',
  intercept: TOOL,
  channel: 'dataverse.queryData',
  argsContains: 'powerpagesites?',
  action: respond({ value: worldSiteRows(world) }),
});

/** Every read a scan of `site` makes, answered from the world without reaching Dataverse. */
function cannedScan(world: World, site: WorldSite, respond: Respond): Step[] {
  const steps: Step[] = [cannedSiteList(world, respond)];
  for (const type of Object.values(COMPONENT_TYPE)) {
    const { filter } = componentQuery(site.ref.id, type);
    if (filter === null) throw new Error('componentQuery always filters by site and type.');
    steps.push({
      name: `canned component type ${String(type)}`,
      intercept: TOOL,
      channel: 'dataverse.queryData',
      argsContains: filter,
      action: respond({ value: worldComponentRows(site, type) }),
    });
  }
  site.files.forEach((file, index) => {
    if (file.code === null) throw new Error('Probe worlds hold readable files only.');
    const code = file.code ?? PLAIN_CODE;
    const token = `probe-block-${String(index).padStart(3, '0')}`;
    steps.push(
      {
        name: `canned download start ${String(index)}`,
        intercept: TOOL,
        channel: 'dataverse.execute',
        argsContains: fileId(file.n),
        action: respond({ FileContinuationToken: token, FileSizeInBytes: Buffer.byteLength(code, 'utf8'), FileName: `handler-${String(index)}.js`, IsChunkingSupported: true }),
      },
      {
        name: `canned download block ${String(index)}`,
        intercept: TOOL,
        channel: 'dataverse.execute',
        argsContains: token,
        action: respond({ Data: Buffer.from(code, 'utf8').toString('base64') }),
      },
    );
  });
  return steps;
}

const scanSite = (siteName: string, timeoutMs: number): Step[] => [
  { name: 'reload so every read goes through the intercepts', reload: TOOL },
  openInspector,
  headingIs('scan', 'Select a site', 15000),
  openPicker,
  {
    name: `pick ${siteName} and start the clock`,
    eval: `(window.__probeScanStart = performance.now(), [...document.querySelectorAll(${JSON.stringify(SITE_OPTIONS)})].find((o) => o.textContent.includes(${JSON.stringify(siteName)})).click(), true)`,
    waitFor: { timeoutMs: 5000 },
    expect: { equals: true },
  },
  headingIs('scan', 'Review server logic readiness', timeoutMs),
];

const openExport = (label: string, format: 'Markdown' | 'PDF'): Step[] => [
  { name: `${label}: open Export report`, eval: clickText('#panel-inspector button', 'Export report'), waitFor: { timeoutMs: 5000 }, expect: { equals: true } },
  { name: `${label}: export dialog is open`, eval: "document.querySelector('[role=dialog][aria-modal=true]') !== null", waitFor: { timeoutMs: 5000 }, expect: { equals: true } },
  { name: `${label}: choose ${format}`, eval: clickText('[role=dialog] [role=radio]', format) },
  { name: `${label}: choose Export ${format}`, eval: clickText('[role=dialog] button', `Export ${format}`), waitFor: { timeoutMs: 3000 }, expect: { equals: true } },
];

function sitePaging(): Scenario {
  const sites = worldSiteRows(DEFAULT_WORLD);
  return {
    name: 'Site list paging: the issued nextLink reaches the host unchanged (RG-001 tool half)',
    vars: { toolPath: TOOL_PATH },
    steps: [
      ...openTool(true),
      {
        name: 'first page carries a nextLink',
        intercept: TOOL,
        channel: 'dataverse.queryData',
        argsContains: 'powerpagesites?',
        times: 1,
        action: respondNow({ value: sites.slice(0, 1), '@odata.nextLink': `https://example.crm.dynamics.com/api/data/v9.2/${NEXT_LINK_PATH}` }),
      },
      { name: 'second page ends the list', intercept: TOOL, channel: 'dataverse.queryData', argsContains: '$skiptoken', action: respondNow({ value: sites.slice(1) }) },
      markCalls('paging'),
      { name: 'reload so the site list is read through the intercepts', reload: TOOL },
      openInspector,
      headingIs('paging', 'Select a site', 15000),
      {
        name: 'the tool passed the issued nextLink to the host unchanged',
        calls: TOOL,
        channel: 'dataverse.queryData',
        since: '{{paging}}',
        argsContains: '$skiptoken',
        expect: { path: '0.args.0', equals: NEXT_LINK_PATH },
      },
      openPicker,
      { name: 'both pages are listed', eval: `document.querySelectorAll(${JSON.stringify(SITE_OPTIONS)}).length`, waitFor: { timeoutMs: 5000 }, expect: { equals: sites.length } },
      ...retrievalOnlyGuard('c0'),
    ],
  };
}

function siteListFailures(): Scenario {
  const steps: Step[] = [...openTool(true)];
  for (const failure of HOST_FAILURES) {
    const label = failure.label;
    steps.push(
      { name: `${label}: clear intercepts`, clearIntercepts: TOOL },
      {
        name: `${label}: the host rejects the site list read`,
        intercept: TOOL,
        channel: 'dataverse.queryData',
        argsContains: 'powerpagesites?',
        times: failure.times,
        action: { kind: 'error', message: failure.message },
      },
      { name: `${label}: reload`, reload: TOOL },
      openInspector,
      headingIs(label, "Couldn't load sites", 15000),
      {
        name: `${label}: no host error text on screen`,
        eval: "document.querySelector('#panel-inspector').innerText",
        expect: { all: [{ notContains: 'Error invoking remote method' }, { notContains: '0x8' }, { notContains: 'ENOTFOUND' }] },
      },
      ...(failure.expected === null
        ? []
        : [
            {
              name: `${label}: plain-language message`,
              eval: "document.querySelector('#panel-inspector p.inspector-state__text')?.textContent.trim()",
              expect: { equals: failure.expected },
            },
          ]),
      { name: `${label}: recover`, clearIntercepts: TOOL },
      cannedSiteList(DEFAULT_WORLD, respondNow),
      { name: `${label}: retry`, eval: clickText('#panel-inspector button', 'Retry') },
      headingIs(label, 'Select a site', 15000),
    );
  }
  steps.push(...retrievalOnlyGuard('c0'));
  return { name: 'Site list host failures map to plain-language messages (A3; red until hostErrors reads message text)', vars: { toolPath: TOOL_PATH }, steps };
}

function scanCanned(): Scenario {
  return {
    name: 'Canned Alpha scan: downloads, PDF save, cancelled save, close guard held during a slow save',
    vars: { toolPath: TOOL_PATH },
    steps: [
      ...openTool(true),
      ...cannedScan(DEFAULT_WORLD, ALPHA, respondNow),
      markCalls('scan'),
      ...scanSite(ALPHA.ref.name, 30000),
      { name: 'both Alpha handlers are listed', eval: "document.querySelectorAll('#panel-inspector ul.inspector-files > li').length", expect: { equals: ALPHA.files.length } },
      { name: 'each handler took one start and one block call', calls: TOOL, channel: 'dataverse.execute', since: '{{scan}}', expect: { length: ALPHA.files.length * 2 } },
      { name: 'no unreadable-row notice', eval: "document.querySelector('#panel-inspector').innerText.includes(\"couldn't be read\")", expect: { equals: false } },
      { name: 'PDF save returns a path', intercept: TOOL, channel: 'filesystem:save-file', times: 1, action: respondNow('C:/probe-out/report.pdf') },
      markCalls('pdf'),
      ...openExport('pdf', 'PDF'),
      {
        name: 'pdf: exported notification within 5 s (AC-9.9)',
        calls: TOOL,
        channel: 'show-notification',
        since: '{{pdf}}',
        argsContains: 'exported',
        waitFor: { timeoutMs: 5000 },
        expect: { minLength: 1 },
      },
      {
        name: 'pdf: the PDF reaches the host as bytes',
        calls: TOOL,
        channel: 'filesystem:save-file',
        since: '{{pdf}}',
        expect: { all: [{ path: '0.args.1.binary', equals: true }, { path: '0.args.1.head', matches: '^255044462d' }] },
      },
      { name: 'pdf: close guard taken once', calls: TOOL, channel: 'tool-window:prevent-close', since: '{{pdf}}', expect: { length: 1 } },
      { name: 'pdf: close guard released once', calls: TOOL, channel: 'tool-window:release-prevent-close', since: '{{pdf}}', waitFor: { timeoutMs: 5000 }, expect: { length: 1 } },
      { name: 'Markdown save is cancelled', intercept: TOOL, channel: 'filesystem:save-file', times: 1, action: respondNow(null) },
      markCalls('md'),
      ...openExport('cancel', 'Markdown'),
      { name: 'cancel: the save call arrives', calls: TOOL, channel: 'filesystem:save-file', since: '{{md}}', waitFor: { timeoutMs: 10000 }, expect: { length: 1 } },
      { name: 'cancel: wait for any late notification', sleep: 1500 },
      { name: 'cancel: no exported notification', calls: TOOL, channel: 'show-notification', since: '{{md}}', argsContains: 'exported', expect: { length: 0 } },
      { name: 'Markdown save takes 3 s', intercept: TOOL, channel: 'filesystem:save-file', times: 1, action: { kind: 'delay-then-respond', ms: 3000, value: 'C:/probe-out/report.md' } },
      markCalls('held'),
      ...openExport('held', 'Markdown'),
      { name: 'held: the save is pending', calls: TOOL, channel: 'filesystem:save-file', since: '{{held}}', waitFor: { timeoutMs: 5000 }, expect: { path: '0.outcome', equals: 'pending' } },
      { name: 'held: close guard still held', calls: TOOL, channel: 'tool-window:release-prevent-close', since: '{{held}}', expect: { length: 0 } },
      { name: 'held: close guard released after the save', calls: TOOL, channel: 'tool-window:release-prevent-close', since: '{{held}}', waitFor: { timeoutMs: 8000 }, expect: { length: 1 } },
      ...retrievalOnlyGuard('c0'),
    ],
  };
}

function scanScale(): Scenario {
  return {
    name: 'Canned 50-handler scan at measured latency (RG-004)',
    vars: { toolPath: TOOL_PATH, latencyMs: '250' },
    steps: [
      ...openTool(true),
      ...cannedScan(SCALE_WORLD, SCALE_SITE, respondAfter('{{latencyMs}}')),
      markCalls('scale'),
      ...scanSite(SCALE_SITE.ref.name, 120000),
      { name: 'all 50 handlers are listed', eval: "document.querySelectorAll('#panel-inspector ul.inspector-files > li').length", expect: { equals: SCALE_SITE.files.length } },
      { name: 'scan wall time under 30 s (RG-004)', eval: 'Math.round(performance.now() - window.__probeScanStart)', expect: { lt: 30000 }, report: true },
      {
        name: 'download calls for concurrency analysis',
        calls: TOOL,
        channel: 'dataverse.execute',
        since: '{{scale}}',
        limit: 2000,
        expect: { length: SCALE_SITE.files.length * 2 },
        report: true,
      },
      ...retrievalOnlyGuard('c0'),
    ],
  };
}
```

Extend the `describe` block:

```ts
  it('connected/site-paging', async () => {
    await expect(scenarioJson(sitePaging())).toMatchFileSnapshot('../probes/generated/connected/site-paging.json');
  });
  it('connected/scan-canned', async () => {
    await expect(scenarioJson(scanCanned())).toMatchFileSnapshot('../probes/generated/connected/scan-canned.json');
  });
  it('connected/scan-scale', async () => {
    await expect(scenarioJson(scanScale())).toMatchFileSnapshot('../probes/generated/connected/scan-scale.json');
  });
  it('pending/site-list-failures', async () => {
    await expect(scenarioJson(siteListFailures())).toMatchFileSnapshot('../probes/generated/pending/site-list-failures.json');
  });
```

Generate:

```bash
npx vitest run tests/probeScenarios.test.ts -u
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npx vitest run tests/probeScenarios.test.ts src/features/inspector`

Expected: `5 passed` in `probeScenarios.test.ts`. Every Inspector suite still passes, which proves the extracted row builders didn't change the fake host.

Run: `node scripts/probe-live.mjs connected pending`

Expected:
- `PASS  connected/site-paging.json`, `PASS  connected/scan-canned.json` and `PASS  connected/scan-scale.json`.
- `RED   pending/site-list-failures.json`.
- Exit code 0, because `pending` doesn't gate. `npm run probe:live:connected` also runs `live`, so it exits 1 with `EMPTY live` until Task 10.

In the pending report, the `plain-language message` steps for 401, 403, 404, 429, 503 and expired sign-in fail with `Couldn't read data from Dataverse.`. That is the expected A3 evidence. Fixing it is the out-of-scope `hostErrors` follow-up; once it lands, move the file to `probes/generated/connected/`.

Run: `npm run typecheck && npm run lint && npm test`

Expected: all exit 0.

- [ ] **Step 5: Commit the coherent change**

```bash
git add src/test/inspectorWorld.ts tests/probeScenarios.test.ts probes/generated/connected probes/generated/pending
git commit -m "test(probes): generated connected scenarios for paging, host failures, canned scan, export paths and 50-handler scale"
```

---

### Task 10: Live S2 scenarios close the pending rows of `probe_findings.md`

**Owns:**
- `probes/live/s2-dev.json`: versions, inventory, connection shape, events and unsubscribe, paging and nextLink wire, literal wire, environment variables, populated download;
- `probes/live/s2-restricted.json`: real 403 and the denied environment variable;
- `probes/live/scan-real.json`: real scan time and latency.

The step names here are the contract Task 11 reads. It requires G1, G2 and Task 4.

**Files:**

- Create: `probes/live/s2-dev.json`
- Create: `probes/live/s2-restricted.json`
- Create: `probes/live/scan-real.json`
- Signal: `node scripts/probe-live.mjs live`

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
node scripts/probe-live.mjs live
```

- [ ] **Step 2: Capture the current signal**

Run: `node scripts/probe-live.mjs live`

Expected: `EMPTY live` and exit code 1. Every row of the 2026-11-01 table in `findings/logic/probe_findings.md` still reads "Pending".

- [ ] **Step 3: Implement the minimum fix**

`probes/live/s2-dev.json`:

```json
{
  "name": "S2 live probe on the Dev connection",
  "vars": { "toolPath": "C:/Users/RyanDev/source/repos/Server Logic" },
  "steps": [
    { "name": "open the built tool with the Dev connection", "open": { "localPath": "{{toolPath}}", "connectionName": "{{connectionName}}" }, "as": "tool", "critical": true },
    { "name": "remove intercepts left by an earlier run", "clearIntercepts": "all" },
    { "name": "mark host calls (c0)", "calls": "{{tool}}", "mark": "c0", "expect": { "type": "array" } },
    { "name": "inject the S2 probe", "evalFile": "../../scripts/s2-probe.js", "critical": true },
    { "name": "host version", "eval": "await window.toolboxAPI.getAppVersion()", "target": "toolbox", "save": "hostVersion", "expect": { "matches": "^\\d+\\.\\d+\\.\\d+$" }, "report": true },
    { "name": "Electron runtime version", "eval": "navigator.userAgent.match(/Electron\\/([\\d.]+)/)?.[1] ?? 'unknown'", "save": "runtimeVersion", "expect": { "matches": "^\\d+\\.\\d+\\.\\d+$" }, "report": true },
    { "name": "record host and runtime versions", "eval": "window.s2Versions('{{hostVersion}}', '{{runtimeVersion}}'); return window.s2Evidence.at(-1).host === '{{hostVersion}}'", "expect": { "equals": true } },
    { "name": "site inventory counts", "eval": "const count = async (p) => (await window.dataverseAPI.queryData(p))['@odata.count']; return { serverLogic: await count('powerpagecomponents?$select=powerpagecomponentid&$count=true&$filter=_powerpagesiteid_value eq {{siteId}} and powerpagecomponenttype eq 35'), envDefinitions: await count('environmentvariabledefinitions?$select=environmentvariabledefinitionid&$count=true') }", "expect": { "all": [{ "path": "serverLogic", "type": "number" }, { "path": "envDefinitions", "type": "number" }] }, "report": true },
    { "name": "connection shape returned", "eval": "await window.s2Connection(); return window.s2Evidence.at(-1).outcome", "expect": { "equals": "returned" } },
    { "name": "start event recording", "eval": "window.s2StartEvents(); return window.s2Evidence.length", "save": "evBefore", "expect": { "type": "number" } },
    { "name": "rename another connection and restore it", "target": "toolbox", "eval": "const all = await window.toolboxAPI.connections.getAll(); const other = all.find((c) => c.name === '{{restrictedConnectionName}}'); await window.toolboxAPI.connections.update(other.id, { name: '{{restrictedConnectionName}} (probe)' }); await window.toolboxAPI.connections.update(other.id, { name: '{{restrictedConnectionName}}' }); return true", "expect": { "equals": true } },
    { "name": "rename the active connection and restore it", "target": "toolbox", "eval": "const all = await window.toolboxAPI.connections.getAll(); const active = all.find((c) => c.name === '{{connectionName}}'); await window.toolboxAPI.connections.update(active.id, { name: '{{connectionName}} (probe)' }); await window.toolboxAPI.connections.update(active.id, { name: '{{connectionName}}' }); return true", "expect": { "equals": true } },
    { "name": "connection events reached the tool", "eval": "window.s2Evidence.length > {{evBefore}}", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": true } },
    { "name": "connection event argument shapes", "eval": "window.s2Evidence.slice({{evBefore}})", "report": true, "expect": { "minLength": 1 } },
    { "name": "stop event recording", "eval": "(window.s2StopEvents(), true)" },
    { "name": "rename another connection after unsubscribing", "target": "toolbox", "eval": "const all = await window.toolboxAPI.connections.getAll(); const other = all.find((c) => c.name === '{{restrictedConnectionName}}'); await window.toolboxAPI.connections.update(other.id, { name: '{{restrictedConnectionName}} (probe)' }); await window.toolboxAPI.connections.update(other.id, { name: '{{restrictedConnectionName}}' }); return true", "expect": { "equals": true } },
    { "name": "let late events arrive", "sleep": 1500 },
    { "name": "unsubscribe check passed", "eval": "(window.s2CheckStopped(), window.s2Evidence.at(-1).outcome)", "expect": { "equals": "passed" } },
    { "name": "mark host calls (paging)", "calls": "{{tool}}", "mark": "paging", "expect": { "type": "array" } },
    { "name": "paging probe returned", "eval": "await window.s2Paging('{{siteId}}'); return window.s2Evidence.at(-1)", "timeoutMs": 60000, "expect": { "path": "outcome", "equals": "returned" }, "report": true },
    { "name": "second page request was made", "calls": "{{tool}}", "channel": "dataverse.queryData", "since": "{{paging}}", "argsContains": "$skiptoken", "save": "pagingCalls", "expect": { "minLength": 1 } },
    { "name": "nextLink wire passed", "eval": "window.s2VerifyWire('nextLink', new URL('https://probe.invalid/api/data/v9.2/' + ({{pagingCalls}})[0].args[0]).href); return window.s2Evidence.at(-1).outcome", "expect": { "equals": "passed" } },
    { "name": "mark host calls (literal)", "calls": "{{tool}}", "mark": "literal", "expect": { "type": "array" } },
    { "name": "literal probe returned", "eval": "await window.s2Literal(); return window.s2Evidence.at(-1).outcome", "expect": { "equals": "returned" } },
    { "name": "literal request was made", "calls": "{{tool}}", "channel": "dataverse.queryData", "since": "{{literal}}", "argsContains": "Brien", "save": "literalCalls", "expect": { "minLength": 1 } },
    { "name": "literal wire passed", "eval": "window.s2VerifyWire('literal', new URL('https://probe.invalid/api/data/v9.2/' + ({{literalCalls}})[0].args[0]).href); return window.s2Evidence.at(-1).outcome", "expect": { "equals": "passed" } },
    { "name": "environment variable: current", "eval": "await window.s2Environment('current', '{{envSchemaCurrent}}'); return window.s2Evidence.at(-1)", "expect": { "path": "outcome", "equals": "returned" }, "report": true },
    { "name": "environment variable: default", "eval": "await window.s2Environment('default', '{{envSchemaDefault}}'); return window.s2Evidence.at(-1)", "expect": { "path": "outcome", "equals": "returned" }, "report": true },
    { "name": "environment variable: missing", "eval": "await window.s2Environment('missing', '{{envSchemaMissing}}'); return window.s2Evidence.at(-1)", "expect": { "path": "outcome", "equals": "returned" }, "report": true },
    { "name": "environment variable: secret", "eval": "await window.s2Environment('secret', '{{envSchemaSecret}}'); return window.s2Evidence.at(-1)", "expect": { "path": "outcome", "equals": "returned" }, "report": true },
    { "name": "populated handler download matches", "eval": "await window.s2DownloadKnown('{{recordId}}'); return window.s2Evidence.at(-1)", "timeoutMs": 120000, "expect": { "all": [{ "path": "bytesMatch", "equals": true }, { "path": "textMatch", "equals": true }] } },
    { "name": "dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock", "calls": "{{tool}}", "channel": "dataverse.execute", "since": "{{c0}}", "argsExcludes": ["InitializeFileBlocksDownload", "DownloadBlock"], "expect": { "length": 0 } }
  ]
}
```

The full write-channel guard is owned by `retrievalOnlyGuard` (Task 8) and runs in every generated scenario. The live files keep only the `execute` allowlist check, the one write-adjacent call they exercise themselves.

The two `connections.update` pairs change only connection names in the isolated probe profile. They restore the original names, and they never reach Dataverse.

`populated handler download matches` opens the native file picker. The owner picks the local copy of the `recordId` handler within 120 s. An intercept can't answer it: `readBinary` only reads paths that the real `selectPath` or `saveFile` handler authorised (`desktop-app` `index.ts:1942`, `filesystemAuthorization.ts:16`). `s2-dev.json` is therefore attended.

`probes/live/s2-restricted.json`:

```json
{
  "name": "S2 live probe on the restricted connection",
  "vars": { "toolPath": "C:/Users/RyanDev/source/repos/Server Logic" },
  "steps": [
    { "name": "open the built tool with the restricted connection", "open": { "localPath": "{{toolPath}}", "connectionName": "{{restrictedConnectionName}}" }, "as": "tool", "critical": true },
    { "name": "remove intercepts left by an earlier run", "clearIntercepts": "all" },
    { "name": "mark host calls (c0)", "calls": "{{tool}}", "mark": "c0", "expect": { "type": "array" } },
    { "name": "inject the S2 probe", "evalFile": "../../scripts/s2-probe.js", "critical": true },
    { "name": "403 denial is rejected", "eval": "await window.s2ReadFailure('403 denial'); return window.s2Evidence.at(-1).outcome", "expect": { "equals": "rejected" } },
    { "name": "403 host call failed", "calls": "{{tool}}", "channel": "dataverse.queryData", "since": "{{c0}}", "argsContains": "powerpagesites", "save": "c403", "expect": { "path": "0.outcome", "equals": "error" } },
    { "name": "403 error prefix", "eval": "({{c403}})[0].error.message.match(/^(0x[0-9a-f]+|HTTP \\d{3})/i)?.[0] ?? 'unrecognised'", "expect": { "type": "string" }, "report": true },
    { "name": "environment variable: denied", "eval": "await window.s2Environment('denied', '{{envSchemaCurrent}}'); return window.s2Evidence.at(-1)", "report": true, "expect": { "type": "object" } },
    { "name": "dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock", "calls": "{{tool}}", "channel": "dataverse.execute", "since": "{{c0}}", "argsExcludes": ["InitializeFileBlocksDownload", "DownloadBlock"], "expect": { "length": 0 } }
  ]
}
```

`probes/live/scan-real.json`:

```json
{
  "name": "Real Inspector scan of the Dev site (RG-004 baseline)",
  "vars": { "toolPath": "C:/Users/RyanDev/source/repos/Server Logic" },
  "steps": [
    { "name": "open the built tool with the Dev connection", "open": { "localPath": "{{toolPath}}", "connectionName": "{{connectionName}}" }, "as": "tool", "critical": true },
    { "name": "remove intercepts left by an earlier run", "clearIntercepts": "all" },
    { "name": "mark host calls (c0)", "calls": "{{tool}}", "mark": "c0", "expect": { "type": "array" } },
    { "name": "open Logic Inspector", "eval": "(document.querySelector('#tab-inspector').click(), true)" },
    { "name": "Inspector shows Select a site", "eval": "[...document.querySelectorAll('#panel-inspector h2')].map((h) => h.textContent.trim())", "waitFor": { "timeoutMs": 30000 }, "expect": { "contains": "Select a site" } },
    { "name": "open the site picker", "eval": "(document.querySelector('[role=combobox][aria-label=\"Power Pages site\"]').click(), true)" },
    { "name": "pick the Dev site and start the clock", "eval": "(window.__probeScanStart = performance.now(), [...document.querySelectorAll('[role=listbox][aria-label=\"Power Pages site\"] [role=option]')].find((o) => o.textContent.includes('{{siteName}}')).click(), true)", "waitFor": { "timeoutMs": 5000 }, "expect": { "equals": true } },
    { "name": "Inspector shows results", "eval": "[...document.querySelectorAll('#panel-inspector h2')].map((h) => h.textContent.trim())", "waitFor": { "timeoutMs": 120000 }, "expect": { "contains": "Review server logic readiness" } },
    { "name": "real scan wall time ms", "eval": "Math.round(performance.now() - window.__probeScanStart)", "expect": { "type": "number" }, "report": true },
    { "name": "download calls for latency analysis", "calls": "{{tool}}", "channel": "dataverse.execute", "since": "{{c0}}", "limit": 2000, "expect": { "type": "array" }, "report": true },
    { "name": "dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock", "calls": "{{tool}}", "channel": "dataverse.execute", "since": "{{c0}}", "limit": 2000, "argsExcludes": ["InitializeFileBlocksDownload", "DownloadBlock"], "expect": { "length": 0 } }
  ]
}
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `npm run probe:live:connected`

Expected:
- `PASS  live/s2-dev.json`, `PASS  live/s2-restricted.json` and `PASS  live/scan-real.json`;
- the three `connected` passes from Task 9;
- `RED   pending/site-list-failures.json`;
- exit code 0.

Treat failures as follows:
- **`second page request was made`:** fewer than two type-35 rows on the site. Record paging as "not coverable on this site"; don't loosen the step.
- **`nextLink wire passed` or `literal wire passed`:** a possible RG-001 defect. Record the outcome; `NEXT_LINK_UNVERIFIED` stays `true`. Check the nextLink failure first: the step rebuilds the wire URL with `new URL`, as the host does. If Dataverse issued a link holding a raw space, `'`, `"`, `<` or `>`, the parser re-encodes it and the comparison fails with nothing actually wrong. Compare the issued link in the local report before calling it a defect.
- **`populated handler download matches`:** a protocol mismatch, per the rule at the end of `probe_findings.md`.

- [ ] **Step 5: Commit the coherent change**

```bash
git add probes/live/s2-dev.json probes/live/s2-restricted.json probes/live/scan-real.json
git commit -m "test(probes): live S2 scenarios for versions, events, paging and literal wire, environment variables, download, 403 and real scan"
```

---

### Task 11: `scripts/probe-evidence.mjs` writes redacted status rows into `probe_findings.md`

**Owns:** the mapping from report steps to `probe_findings.md` observations. It also owns the redaction rule: only pass/fail, version strings, whole-number counts and a latency median leave a report.

**Files:**

- Create: `scripts/probe-evidence.mjs`: reads `probes/reports/{live,connected}/*.json` and rewrites one marked block.
- Modify: `findings/logic/probe_findings.md` (end of file): the generated block.
- Signal: `node scripts/probe-evidence.mjs`

- [ ] **Step 1: Establish the observable pre-change signal**

```bash
node scripts/probe-evidence.mjs
```

- [ ] **Step 2: Capture the current signal**

Run: `node scripts/probe-evidence.mjs`

Expected: `Error: Cannot find module '…/scripts/probe-evidence.mjs'`. The live results stay in gitignored reports, and `probe_findings.md` still says "Pending".

- [ ] **Step 3: Implement the minimum fix**

`scripts/probe-evidence.mjs`:

```js
#!/usr/bin/env node
// Writes redacted live-probe status rows into findings/logic/probe_findings.md from the latest reports.
// Only pass/fail, version strings, whole-number counts and a latency median leave a report; never ids, paths, URLs or messages.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const REPORTS = join(ROOT, 'probes', 'reports'); // <group>/<scenario>.json, as written by scripts/probe-live.mjs
const FINDINGS = join(ROOT, 'findings', 'logic', 'probe_findings.md');
const START = '<!-- probe-evidence:start -->';
const END = '<!-- probe-evidence:end -->';
const VERSION = /^\d+\.\d+\.\d+$/;

/** Each 2026-11-01 observation and the report steps (probes/live, probes/generated/connected) that prove it. */
const ROWS = [
  { observation: 'Host and runtime versions', steps: [['live/s2-dev.json', 'record host and runtime versions']] },
  { observation: 'Populated handler: metadata, Data base64, byte count, UTF-8 text equality', steps: [['live/s2-dev.json', 'populated handler download matches']] },
  { observation: 'Site-scoped type-35 paging', steps: [['live/s2-dev.json', 'paging probe returned'], ['live/s2-dev.json', 'second page request was made']] },
  { observation: 'Second request URL equals the issued nextLink', steps: [['live/s2-dev.json', 'nextLink wire passed'], ['connected/site-paging.json', 'the tool passed the issued nextLink to the host unchanged']] },
  { observation: 'Apostrophe/space literal encoded once', steps: [['live/s2-dev.json', 'literal wire passed']] },
  { observation: 'Connection shape; callback argument shapes', steps: [['live/s2-dev.json', 'connection shape returned'], ['live/s2-dev.json', 'connection events reached the tool']] },
  { observation: 'Unsubscribe after a further connection change', steps: [['live/s2-dev.json', 'unsubscribe check passed']] },
  {
    observation: 'Nonsecret current/default/missing/denied; secret',
    steps: [
      ['live/s2-dev.json', 'environment variable: current'],
      ['live/s2-dev.json', 'environment variable: default'],
      ['live/s2-dev.json', 'environment variable: missing'],
      ['live/s2-dev.json', 'environment variable: secret'],
      ['live/s2-restricted.json', 'environment variable: denied'],
    ],
  },
  { observation: 'Explicit 403 denial', steps: [['live/s2-restricted.json', '403 denial is rejected'], ['live/s2-restricted.json', '403 host call failed']] },
  {
    observation: 'Network-loss and expired sign-in rejection shapes',
    steps: [['pending/site-list-failures.json', 'network: no host error text on screen'], ['pending/site-list-failures.json', 'expired sign-in: no host error text on screen']],
    note: 'injected host faults; a real network drop and token expiry stay manual',
  },
  { observation: 'Retrieval only at runtime', steps: [['live/s2-dev.json', 'dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock'], ['connected/scan-canned.json', 'dataverse.execute only runs InitializeFileBlocksDownload and DownloadBlock']] },
];

const reports = new Map();
function report(file) {
  if (!reports.has(file)) {
    const path = join(REPORTS, file);
    reports.set(file, existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null);
  }
  return reports.get(file);
}
const result = (file, step) => report(file)?.results?.find((r) => r.name === step) ?? null;

function status(steps) {
  const found = steps.map(([file, step]) => result(file, step));
  if (found.some((r) => r !== null && !r.passed)) return 'failed';
  return found.every((r) => r !== null && r.passed) ? 'passed' : 'not run';
}

const version = (step) => {
  const value = result('live/s2-dev.json', step)?.value;
  return typeof value === 'string' && VERSION.test(value) ? value : 'unrecorded';
};
const inventory = result('live/s2-dev.json', 'site inventory counts')?.value;
const count = (key) => (Number.isSafeInteger(inventory?.[key]) ? String(inventory[key]) : 'unrecorded');

const durations = (result('live/scan-real.json', 'download calls for latency analysis')?.value ?? [])
  .map((call) => call?.durationMs)
  .filter((ms) => Number.isFinite(ms))
  .sort((a, b) => a - b);
const median = durations.length === 0 ? null : Math.round(durations[Math.floor(durations.length / 2)]);

const date = new Date().toISOString().slice(0, 10);
const block = [
  START,
  '## Automated live evidence',
  '',
  `Generated by \`node scripts/probe-evidence.mjs\` on ${date} from the latest \`npm run probe:live:connected\` reports. Host ${version('host version')}, runtime ${version('Electron runtime version')}. Site inventory: ${count('serverLogic')} server logic records, ${count('envDefinitions')} environment variable definitions.`,
  '',
  '| Observation | Status | Proved by |',
  '| --- | --- | --- |',
  ...ROWS.map((row) => `| ${row.observation} | ${status(row.steps)} | ${row.steps.map(([file, step]) => `\`${file}\`: ${step}`).join('; ')}${row.note ? ` (${row.note})` : ''} |`),
  END,
].join('\n');

const current = readFileSync(FINDINGS, 'utf8');
const next = current.includes(START)
  ? current.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block)
  : `${current.trimEnd()}\n\n${block}\n`;
writeFileSync(FINDINGS, next);
console.log(`Updated ${FINDINGS}`);
if (median !== null) console.log(`Median download call latency: ${median} ms. Set "latencyMs": "${median}" in probes/.local.json.`);
```

- [ ] **Step 4: Confirm the signal changed, and nothing else did**

Run: `node scripts/probe-evidence.mjs && git diff --stat findings/logic/probe_findings.md`

Expected:
- `Updated …probe_findings.md`.
- A `Median download call latency: N ms` line.
- A one-file diff that adds only the block between `<!-- probe-evidence:start -->` and `<!-- probe-evidence:end -->`, with one row per observation, each `passed`, `failed` or `not run`.

Run: `git diff -U0 findings/logic/probe_findings.md | grep '^+' | grep -E "[0-9a-f]{8}-[0-9a-f]{4}-|https?://|[A-Za-z]:[\\\\/]"`

Expected: no output, so no GUID, URL or path leaked.

Then run `npm run probe:live:connected` again with the printed `latencyMs` in `probes/.local.json`. Expected: `PASS  connected/scan-scale.json`, with `scan wall time under 30 s (RG-004)` now measured at the real latency.

- [ ] **Step 5: Commit the coherent change**

```bash
git add scripts/probe-evidence.mjs findings/logic/probe_findings.md
git commit -m "docs(probes): write redacted live probe evidence into probe_findings.md"
```

---

## Parallelization

| Wave | Tasks | Run together because |
|---|---|---|
| 1 | Tasks 1, 2, 3, 4, 5 | Each owns disjoint files in a different location: a fork test, fork `debugTools.ts`, the fork plan doc, the skill, and this repo's runner. None needs another's result |
| 2 | Tasks 6, 7 | Both need Tasks 4 and 5 and write different `probes/*.json` files. Task 6 alone touches `src/main.tsx` |
| G1 | the fork interception plan, as amended by Task 3, with F1 from Task 2 | Owner approval, then its own execution |
| 3 | Task 8, then Task 9 | Task 9 extends Task 8's generator file, so they run in sequence |
| G2 | sign in both connections; write `probes/.local.json` | Owner only |
| 4 | Task 10, then Task 11 | Task 11 reads Task 10's step names and reports |

## Notes after the plan

- **Follow-up, out of scope here:**
  - Classify host failures by message text in `src/services/pptb/hostErrors.ts`: Dataverse `0x…` codes, `HTTP <n>`, `Request failed:` and `Authentication expired`.
  - Connection-loss detection (`transport`, AC-7.10) depends on the same fix, because `DOMException` doesn't cross IPC either.
  - Task 9's pending scenario is the acceptance signal for it.
- **403 message text:** the generator's 403 text (`HOST_FAILURES`) is a representative Dataverse message. Once Task 10 reports the real `403 error prefix`, update the `403` entry if the prefix differs.
- **Host version under the probe harness (found in Wave 2, 2026-11-09):** `pptb.mjs start` launches `electron dist/main/index.js`. `app.getVersion()` then finds no app `package.json` and returns Electron's version, so `toolboxAPI.getAppVersion()` reported `39.8.10`, the same as the Electron runtime. The fork's own version is `1.2.8`, from `desktop-app/package.json`. Before Task 11 writes the Versions row, take the PPTB version from that `package.json` and its commit (`git -C <fork> rev-parse --short HEAD`), not from `getAppVersion()`.
- **The F2 HTTP tail isn't needed:** Task 1 proves the host's path handling, and Tasks 9–10 prove what the tool passes.
- **Duplicated step names:** the step names in `probes/live/*.json` are repeated as string literals in `scripts/probe-evidence.mjs`. A rename must change both. The alternative is generating the live scenarios too, which would add more than it saves.
