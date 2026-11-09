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
