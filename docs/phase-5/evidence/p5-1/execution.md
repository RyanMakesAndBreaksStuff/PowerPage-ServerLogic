# P5.1 execution record

**Plan:** `docs/phase-5/plans/p5-1_plan.md`
**Executed:** 2026-11-01, branch `logic-inspector-v2-build`, baseline `820d7b8`.

## Commits

| Phase | Commit | Message |
|---|---|---|
| A | `7e8b97d` | chore(lint): ignore .scratch in eslint globalIgnores |
| A | `1669c7c` | docs(inspector): restore S2 probe findings deleted in 820d7b8 |
| B | `478898c` | docs(spec): 4.1.0 permit download actions and pin evidence precedence (15 files) |
| C | `f8eeb31` | test(pptb): manual shape-only S2 download continuation |
| — | `d94f1f3` | docs(plans): reviewed P5.1-P5.3 execution plans and review |

## Gate output

Phase A signal and confirm:

| Command | Observed | Expected |
|---|---|---|
| `npm run lint 2>&1 \| grep -c scratch` (before) | 196 lines mentioning `.scratch`, lint failing | non-zero |
| `npm run lint` (after) | exit 0, zero warnings | exit 0 |
| `grep -c '^| Network and expired sign-in not run |' findings/logic/probe_findings.md` | 1 | 1 |

Phase B confirm (B8):

| Check | Observed | Expected |
|---|---|---|
| spec: `Inspector is read-only`, `Inspector requests read-only access`, `Inspector is read-only but is designed for dev sites` | 0 | 0 |
| spec: `**Version:** 4.1.0` | 1 | 1 |
| spec: `hasUnscannedEvidence` | 3 | ≥ 2 |
| spec: `InitializeFileBlocksDownload` | 4 | ≥ 4 |
| rule file: `Dataverse is read-only` or `re-scanning on` | 0 | 0 |
| plan-starter: `prettier --check`, `Dataverse is read-only`, `Open risk (Inspector` | 0 | 0 |
| `> **Execution superseded` banners (plan-inspector + 8 phase files) | 9 | 9 |
| phase-23: `read-only but is designed` | 0 | 0 |
| `git diff --check -- docs .claude` | exit 0 | exit 0 |

Phase C signal and confirm (C2, C6):

| Command | Observed | Expected |
|---|---|---|
| `npm test -- tests/s2Probe.test.ts` before replacing the script | 16 failed of 16, each `Error: probe did not install` | all fail |
| `node --check scripts/s2-probe.js` | exit 0 | exit 0 |
| `npm test -- tests/s2Probe.test.ts` | 1 file, 16 passed (16) | 16 pass |
| `grep -c '(async () =>' scripts/s2-probe.js` | 0 | 0 |
| `npm run lint` | exit 0, zero warnings | exit 0 |
| `npm run typecheck` | exit 0 | exit 0 |
| `npm test` | 92 files, 1418 passed (1418) | all pass |
| `npm run build` | `✓ built in 8.08s` | success |

## Deviations from the plan text

- **C1 test file:** the plan's block failed `@typescript-eslint/require-await` at the `install` helper and three test callbacks that contained no `await`. `install` became synchronous, `= await install(` became `= install(`, and those three callbacks dropped `async`. No behavioural change. The plan's C1 block was updated to match the committed file byte for byte.
- **B7 foundation.md:** principle 3 wraps across two lines and the second line already carried "Nothing is ever written to, published to or changed in an environment or site.", so only the first line was replaced; the rendered text equals the plan's.
- **B6 phase-23 L973:** the phrase was split across two lines ("…for dev" / "sites."), so `Inspector is read-only but is designed for dev` was replaced in both places.
- **B4 amendments row:** the anchor row was at L452, one line later than the plan stated; inserted after it.
- **C5 checklist note:** the Phase 12 checklist now starts at L195 (the B6 banner shifted it); the note went directly above the first `- [ ] Build:` line.
- **Line endings:** mixed per file (CRLF: rule file, conventions, tech-stack, phase 01/11/12/23/24, findings, phase-12; LF: spec, plan-starter, plan-inspector, foundation, phase 15/16/20). Each file kept its own; `git diff --check` clean throughout.

## Live gates still open

Unchanged by this sub-phase; the findings continuation table lists them with their manual operations: `findings/logic/probe_findings.md`, section "2026-11-01 Phase 5 continuation". `NEXT_LINK_UNVERIFIED` stays `true`.
