# P5.2 execution record

**Plan:** `docs/phase-5/plans/p5-2_plan.md`
**Executed:** 2026-11-01, branch `logic-inspector-v2-build`, baseline `ea0f8fc` (P5.1 Phases A and B landed in `7e8b97d`…`478898c`).
**Sub-agents:** Sonnet 5.5 (medium), one per phase; the controller verified state between phases and committed.

## Commits

| Phase | Commit | Message |
|---|---|---|
| A + B + C | `bae8611` | feat(pptb): download file blocks and retain cancellable read evidence (12 files, +638 / −172) |

## Gate output

Phase A signal (A3), before any implementation:

| Command | Observed | Expected |
|---|---|---|
| `npm test -- src/services/pptb/dataverseRead.phase5.test.ts src/services/pptb/dataverseFiles.test.ts` | exit 1; 2 files failed; 41 failed, 4 passed (45). `dataverseRead.phase5`: 13/13 failed. `dataverseFiles`: 28/32 failed (the 401/403/404 `rejects %s` cases and `rejects unsafe references` already passed against the old code). First error: `HostReadError: Invalid query: file column reference.` | fails |
| `npm test -- src/services/pptb/dataverseRead.test.ts src/services/pptb/pptbHost.test.ts src/services/pptb/fakeHost.test.ts src/types/contracts.test.ts` | exit 0; 4 files, 129 passed | 129 pass |

Phase B confirm (after B1–B6, before Phase C):

| Command | Observed | Expected |
|---|---|---|
| `npm test -- …phase5.test.ts …dataverseFiles.test.ts` | 2 files passed, 45 passed (13 + 32) | 45 pass |
| `npm run typecheck` | exit 2, 13 errors, all in test files not yet migrated (`dataverseRead.test.ts` L8, `fakeHost.test.ts` ×4, `pptbHost.test.ts` ×6, `contracts.test.ts` L101) plus `dataverseFiles.test.ts` L186 TS2349 (see deviations) | errors only in Phase C files |
| `npx --no-install eslint src/services/pptb --max-warnings=0` | exit 1, 4 errors, none in the six source files | errors only in Phase C files |

Phase C confirm (C5):

| Command | Observed | Expected |
|---|---|---|
| `npm test -- src/services/pptb src/types/contracts.test.ts` | 6 files passed, 166 passed, 9.2 s | all pass |
| `npm run typecheck` | exit 0 | exit 0 |
| `npx --no-install eslint src/services/pptb src/types/contracts.test.ts --max-warnings=0` | exit 0 | exit 0 |
| `npm run lint` | exit 0 | exit 0 |
| `npm test` | 94 files passed, 1455 passed, 32.9 s | all pass |
| `npm run build` | `✓ built in 3.20s` (usual >500 kB chunk warning) | success |
| `grep -n '\.skip\|\.only\|it\.todo'` over the pptb and contracts tests | no matches | none |
| `git diff --check` | exit 0 | exit 0 |

The three pre-existing assertions named in C5 ("ships with the strict gate on", "does not retry a failure that has no status", "fails closed on a full page that has no paging link") pass unchanged.

## Deviations from the plan text

- **A2 test file:** the plan captured the pending resolver as `let resolve: ((value: unknown) => void) | null = null;` assigned inside a closure. TypeScript narrowed `resolve` to `null` at the guard, so `resolve(h.initial)` typed as `never` (TS2349) and ESLint reported `no-unnecessary-condition`. Replaced with an object holder (`const pending: { resolve: … | null } = { resolve: null }`, `pending.resolve = done`, `pending.resolve(h.initial)`). No behavioural change. The plan's A2 block was updated to match the committed file.
- **A3 expectation:** the plan expected type errors from the first A3 command. `npm test` is plain `vitest run` and does not typecheck, so every failure was a runtime assertion; the type errors surfaced under `tsc -b` in Phase B instead.
- **B3/B4:** pasted verbatim. `dataverseFiles.ts` carries a literal U+FEFF in its BOM check (plan text); lint did not flag it. A `'﻿'` escape would be easier to read; left as the plan wrote it.
- **C1:** `GUID` was at L16 (plan said L17) after import shifts; removed with the deleted `downloadColumnContent` describe, which also removed the two `no-unsafe-*` lint hits. The file's trailing blank line was dropped with the block.
- **C2:** the new T3-10 test was placed directly after "refuses to reach a write member"; the guard test's queued `queryData` mocks became a single `mockResolvedValueOnce({ value: [1] })` since the `$value` read no longer exists.
- **Line endings:** source files CRLF; `dataverseRead.test.ts`, `dataverseFiles.test.ts`, `dataverseRead.phase5.test.ts` LF (matching their siblings). Git prints its usual autocrlf warning for the LF files; `git diff --check` clean throughout.

## Still open

- `NEXT_LINK_UNVERIFIED` stays `true` (RG-001; wire evidence pending in `findings/logic/probe_findings.md`).
- Live gates unchanged from P5.1's continuation table: `Target` forwarded with `@odata.type` intact, whether `Data` is base64, real network-loss / expired-sign-in / 403 error shapes, `Retry-After` exposure (RG-002/003).
- `scan.ts` is still a stub; P5.4 is the first consumer of `queryAll(q, signal)` and `downloadFileColumn(ref, signal)`.
