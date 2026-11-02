# P5.4 execution record

**Plan:** `docs/phase-5/plans/p5-4_plan.md`
**Executed:** 2026-11-02, branch `worktree-agent-ac85ba3f643881335` (isolated worktree), baseline `54117d5` (plan baseline `071415c` plus the accepted P5.4/P5.6 plan commit). P5.1, P5.2 and P5.3 were already executed.
**Owner decisions recorded:** R-14 option B (unreadable role and permission rows are skipped, one site banner names them) and R-15 option B (four environment-variable failure causes with four texts), both 2026-11-02.

## Commits

| Phase | Commit | Message |
|---|---|---|
| A + B + C1-C4 | `137720e` | feat(inspector): read enhanced-model site facts through the host adapter (21 files, +2297 / -32) |
| C6 | see `git log` (next commit on this branch) | docs(phase-5): P5.4 execution evidence, plan ticked |

## Gate output

Phase A signal (A7), before any implementation:

| Command | Observed | Expected |
|---|---|---|
| `npm test -- src/features/inspector/scan src/features/inspector/model/unreadableRows.test.ts src/features/inspector/model/envvarCause.test.ts` | exit 1; `Test Files  6 failed (6)`, `Tests  61 failed \| 6 passed (67)`. `limiter`, `queries`, `parseRecords` failed to resolve their imports; `scan.test.ts` failed with `not implemented: phase 15` | exit 1, 6 files failed, 61 tests failed |

Phase B confirm (B8):

| Command | Observed | Expected |
|---|---|---|
| `npm test -- src/features/inspector/scan src/features/inspector/model` | exit 0; `Test Files  11 passed (11)`, `Tests  383 passed (383)` | 11 files, 383 tests |

Phase C:

| Command | Observed | Expected |
|---|---|---|
| C3 `npm test -- src/features/inspector/scan src/features/inspector/model src/features/inspector/report src/skeleton.test.ts src/types/contracts.test.ts` | exit 0; `Test Files  16 passed (16)`, `Tests  420 passed (420)` | 16 / 420 |
| `npm run typecheck` | exit 0, no output | exit 0 |
| `npx --no-install eslint src/features/inspector src/types/inspector.ts src/skeleton.test.ts --max-warnings=0` | exit 0, no output | exit 0 |
| `npm run lint` | exit 0, no output | exit 0 |
| `npm test` (full) | exit 0; `Test Files  101 passed (101)`, `Tests  1658 passed (1658)` | 101 / 1658 |
| `npm run build` | exit 0; `built in 2.52s` (usual >500 kB chunk warning) | success |
| `git diff --check` (unstaged) and `git diff --cached --check` (staged, before C5) | both exit 0, no output | no output |

## Deviations from the plan text

- **Worktree base:** the isolated worktree was created at the initial scaffold `a6f5d19`, not `54117d5`. It had no work, so the branch was fast-forwarded (`git merge --ff-only 54117d5`) before starting.
- **Line endings:** every edited and new source file is CRLF. The spec file is also CRLF in this checkout (the plan says LF); it was edited preserving CRLF. Anchors were matched ignoring `\r` by a script that normalised, applied each edit (each anchor matched exactly once) and restored the file's endings. New files were extracted from the plan's fenced blocks by fence line range and saved with CRLF.
- **`git diff --check`:** new files are untracked until staged, so it was also run as `git diff --cached --check` after `git add` and before the commit.
- **Goldens:** `report/__golden__/file.md` and `site.md` did not change.
- No other changes to the plan's code, diffs or test text.

## Observation

The repo stop hook did not cause a failed full run here.

## Still open

- RG-001: wire fidelity of the encoded OData literal (and of spaces), and `nextLink` token fidelity; `NEXT_LINK_UNVERIFIED` is untouched.
- RG-002: real network-loss and expired-sign-in error shapes (whether `transport` or 401 ever arrives).
- RG-003: populated real handler download and real environment-variable access.
- RG-004: live 50-record timing (at most 30 s).
- The reader is not wired into a page (P5.5).
