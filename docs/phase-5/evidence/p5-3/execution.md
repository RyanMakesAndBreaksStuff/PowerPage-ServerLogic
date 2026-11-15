# P5.3 execution record

**Plan:** `docs/phase-5/plans/p5-3_plan.md`
**Executed:** 2026-11-01, branch `logic-inspector-v2-build`, baseline `c9d7f4b` (P5.1 Phase B landed in `478898c`; P5.2 in `bae8611`).
**Sub-agents:** Sonnet 5.5 (medium), one for Phase A and one for Phase B; the controller ran Phase C gates and committed.

## Commits

| Phase | Commit | Message |
|---|---|---|
| A + B + C | `85de3ff` | fix(inspector): preserve partial evidence and isolate snapshots (7 files, +444 / −67) |

## Gate output

Phase A signal (A2), before any implementation:

| Command | Observed | Expected |
|---|---|---|
| `npm test -- src/features/inspector/model/evidence.test.ts` | exit 1; 43 failed, 6 passed (49). Passing: the four inactive-ancestor cases, "linked only to other roles", and "keeps configuration-bearing reasons, privilege explanations and reviewed originals". | exit 1; mixed cases, O2 intersections, linked-ancestor variants, sentinel and spy-count tests fail |
| `npm test -- src/features/inspector/model src/features/inspector/report` | 1 file failed (`evidence.test.ts`), 7 passed; 43 failed, 204 passed | only the new file fails |

Phase B confirm (after B1–B5):

| Command | Observed | Expected |
|---|---|---|
| `npm test -- src/features/inspector/model/evidence.test.ts` | 49 passed (49) | 49 pass |
| `npm test -- src/features/inspector/model src/features/inspector/report src/lib/code-analysis src/types/contracts.test.ts src/skeleton.test.ts` | 16 files, 468 passed, no changed expectations | all pass |
| `npm run typecheck` | exit 0 | exit 0 |
| `npx --no-install eslint src/features/inspector/model src/features/inspector/report/reportFixtures.ts src/types/inspector.ts --max-warnings=0` | exit 0 | exit 0 |

Phase C confirm (C1, C2), run by the controller with fresh output:

| Command | Observed | Expected |
|---|---|---|
| `npm test -- src/features/inspector/model/evidence.test.ts` | 49 passed, 2.43 s | 49 pass |
| `npm run typecheck` | exit 0 | exit 0 |
| `npm run lint` | exit 0 | exit 0 |
| `npm test` / `npx vitest run` | 95 files passed, 1504 passed, on five consecutive runs (see observation below) | all pass |
| `npm run build` | `✓ built in 4.46s` (usual >500 kB chunk warning) | success |
| `grep -n '\.skip\|\.only\|it\.todo'` over `evidence.test.ts`, `rules.test.ts` | no matches | none |
| `git diff --check` | exit 0 | exit 0 |

## Deviations from the plan text

- **A2 expectation:** the plan said the O0/O1 cases pass before implementation. They failed at baseline because each asserts `hasUnscannedEvidence` is `false`, and the field did not exist until B1 (`undefined` ≠ `false`). The plan did not list "keeps configuration-bearing reasons, privilege explanations and reviewed originals" as a baseline pass; it passed. After B1–B5 every case passed, so the A1 block was not altered.
- **Line endings:** the six edited source files are CRLF (the `file` utility mislabels them; verified by CR count); `evidence.test.ts` is LF, matching `rules.test.ts`. Git prints its usual autocrlf warning for the LF file; `git diff --check` clean throughout.
- **B1–B5 anchors:** every `-` and context line matched the current file exactly once; `checks.ts` was replaced in full (259 lines) by extracting the plan's block by fence line range. No edits beyond the plan.

## Observation

Two of seven full-suite runs exited 1 immediately after the `RUN v5.0.5` banner with no file or test output and no error text. Both coincided with the repo's stop hook (`.claude/hooks/verify-on-stop.cjs`) launching its own vitest run in the same checkout. The five runs that produced output all passed 95 / 1504, including three back-to-back runs in a single shell loop. Not attributable to the P5.3 change; noted for the baseline.

## Still open

- `NEXT_LINK_UNVERIFIED` stays `true` (RG-001); live gates unchanged from P5.1's continuation table.
- P5.6 can drop `model.snapshot` without string-prefix filtering now that raw rows live only in `FileResult.snapshot`.
