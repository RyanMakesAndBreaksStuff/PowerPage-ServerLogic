# Phase 5 — Logic Inspector completion

Home for the reviewed Phase 5 plans, the review that corrected them, and the evidence each execution step produces.

## Layout

```
docs/phase-5/
  README.md                 this index
  plans/                    owner-approved execution plans (one per sub-phase)
    p5-1_plan.md
    p5-2_plan.md
    p5-3_plan.md
  review/                   reviews that corrected the drafts the plans replace
    inspector-plan-review.md
  evidence/                 what each execution produced, one folder per sub-phase
    p5-1/execution.md       commits, gate output, deviations
    p5-2/                   empty until P5.2 runs
    p5-3/                   empty until P5.3 runs
```

## Rules

- A plan is added here only after the owner has accepted its decisions. Drafts stay in `docs/plans/`.
- `evidence/p5-N/execution.md` is written when the sub-phase lands. It records the commit hashes, each gate command with its observed result, and every deviation from the plan text. Fresh gate output, not a claim, is the evidence.
- Live-host probe results (Spike S2 continuation) go to `findings/logic/probe_findings.md`, not here; the evidence file links to the rows it filled.
- Plan checkboxes are ticked in the plan file itself as steps complete, so a plan and its evidence file agree.

## Status

| Sub-phase | Plan | Status | Evidence |
|---|---|---|---|
| P5.1 | [plans/p5-1_plan.md](plans/p5-1_plan.md) | Executed 2026-11-01 | [evidence/p5-1/execution.md](evidence/p5-1/execution.md) |
| P5.2 | [plans/p5-2_plan.md](plans/p5-2_plan.md) | Approved, not started | — |
| P5.3 | [plans/p5-3_plan.md](plans/p5-3_plan.md) | Approved, not started (needs P5.1 Phase B, landed) | — |

Brief: `phasse5plan.md` at the repo root. Spec: `docs/specs/001-server-logic-starter-inspector/spec.md` (4.1.0).
