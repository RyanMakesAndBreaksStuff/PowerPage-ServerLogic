---
name: supervised-review
description: Stack-agnostic supervisor-style orchestrator that runs the /code-review 7-pass audit across the codebase split by domain, then runs one skeptic round per domain before producing a final issue list. Use when you want a thorough multi-domain code audit with adversarial review and traceable plan evolution, but on any tech stack (TypeScript, C#, Python, Go, Java, etc.). Triggers on "supervised review", "deep multi-domain review", "supervisor code review", "run code review per domain", "audit codebase by domain", "/supervised-review". Do NOT use for single-file reviews or targeted bug hunts — prefer /code-review for scoped single-pass audits.
license: MIT
metadata:
  author: "Ryan Rettinger"
  version: "1.0.0"
  platform: "Any codebase"
  requires: "File system access (Read, Grep, Glob), Agent tool with general-purpose subagent"
---

# Supervised Review

## Required Inputs

Read these files at the start of the run. If any file is missing, inline its role from the `Inline Fallbacks` section below — do not skip the corresponding phase:

| File | Role | If missing |
|---|---|---|
| `references/prompts/orchestrator.txt` | Governing rules for the main thread | Apply the `Non-Negotiable Rules` and `Orchestration Sequence` sections of this SKILL.md |
| `references/prompts/lead-engineer.txt` | Lead persona: domain discovery + consolidation | Inline: scan repo, group files into 3–7 domains with disjoint path scopes, produce Plan v1, respond to skeptic IDs with Decision/Rationale/Plan Delta |
| `references/prompts/domain-reviewer.txt` | Domain reviewer persona: runs the 7-pass audit | Inline the 7 passes from `resources/audit-passes.md` plus severity rubric from `resources/severity-guide.md` |
| `references/prompts/skeptic.txt` | Skeptic role: challenge-only | Inline: produce no artifacts, challenge assumptions only, use ID format `SK-<domain>-###` |
| `references/templates/domain-round-template.md` | Per-domain skeptic round shape | Use the `Skeptic Transcript Contract` section below as template |
| `references/templates/final-report-template.md` | Final output skeleton | Use the `Required Final Output` section below |
| `resources/audit-passes.md` | The 7-pass audit checklist (stack-agnostic) | Refuse to run — the audit cannot proceed without pass definitions |
| `resources/severity-guide.md` | Severity rubric | Refuse to run — findings cannot be graded without it |

## Non-Negotiable Rules

- Keep all work in a single end-to-end run. No deferred phases.
- Keep domain path scopes disjoint. No file falls in two domains.
- Keep the skeptic role pure challenge-only. Skeptic emits no fixes and no code.
- Every finding has `file:line`. Vague findings are rejected.
- Every patch-note change maps to exactly one `SK-<domain>-###` ID from that domain's transcript.
- Final issue list preserves the original reviewer finding ID and any skeptic ID that altered it.
- Duplicates merged during consolidation must preserve source-domain traceability.

## NEVER

Expert-learned constraints — each encodes a failure mode this design prevents:

- **NEVER assign a file to two domains.** Reviewers produce duplicate findings under different IDs; the lead can't resolve which domain owns the fix; the final issue list becomes ambiguous.
- **NEVER let the skeptic see another domain's findings.** Cross-domain contamination produces challenges the lead can't resolve within that domain's patch notes; patch-note traceability breaks.
- **NEVER spawn reviewers sequentially.** The entire value of domain partitioning is parallel depth. Sequential spawning converts a concurrent audit into a slow single-agent review with extra steps.
- **NEVER name a domain "misc", "other", or "general".** Unscoped domains produce findings no skeptic can challenge coherently. If files don't fit the catalog, add a named custom domain.
- **NEVER let the lead invent new findings during refinement.** Skeptic rounds expose gaps — they do not authorize new scope. Name the gap as a plan delta with the triggering `SK-<domain>-###` ID.
- **NEVER skip the skeptic phase for any domain.** A domain without adversarial review produces an unvalidated plan slice. The skeptic round is load-bearing, not optional polish.
- **NEVER emit a patch-note change without an originating `SK-<domain>-###` ID.** Without the ID, auditors tracing G → E hit a dead end. Traceability is the audit's entire value.

## Orchestration Sequence

Execute steps in this exact order:

1. **Scope phase.** Read top-level project files (README, CLAUDE.md, package.json, *.csproj, pyproject.toml, go.mod, etc.) and run a shallow directory map to identify the stack and entry points.
2. **Lead engineer review.** Lead partitions the codebase into 3–7 **domains** drawn from the generic catalog below. Each domain gets:
   - A name (from the catalog or a custom name that fits).
   - A disjoint path scope (globs or directories).
   - A one-line rationale for why this is its own domain.
3. **Parallel domain reviewers.** **MANDATORY before spawning**: Read `references/prompts/domain-reviewer.txt`, `resources/audit-passes.md`, and `resources/severity-guide.md` in full. Do NOT load `references/prompts/skeptic.txt` at this step. Then spawn one `general-purpose` subagent per domain in a **single message** (multiple tool calls). Each subagent prompt includes:
   - The full `domain-reviewer.txt` persona.
   - The domain's path scope.
   - The inlined 7-pass checklist (or pointer to `resources/audit-passes.md`).
   - The severity rubric (or pointer to `resources/severity-guide.md`).
   - The output contract (findings table with `id | severity | pass | file:line | problem | fix`).
4. **Consolidation → Plan v1.** Lead merges raw findings; deduplicates while preserving source-domain IDs. Malformed rows (missing `file:line` or wrong ID format): mark `[MALFORMED]` with source domain noted; proceed with valid rows. Zero findings across all 7 passes for a domain: verify path scope covered real source files before accepting.
5. **Per-domain skeptic rounds.** **MANDATORY before skeptic spawn**: Read `references/prompts/skeptic.txt` and `references/templates/domain-round-template.md` in full. Do NOT reload `domain-reviewer.txt`. For each domain (sequentially or in parallel):
   - Skeptic receives only that domain's Plan v1 slice. Never expose other domains' findings.
   - Skeptic emits IDs `SK-<domain>-001`, `SK-<domain>-002`, …
   - Lead responds per ID with `Decision: ACCEPT/REJECT/DEFER`, `Rationale`, `Plan Delta`.
6. **Per-domain refinement.** Lead applies accepted deltas. Produces `Patch Notes (<domain> v1 → final)` mapping every change to its `SK-<domain>-###` ID.
7. **Final compile.** Merge refined per-domain slices into one severity-grouped issue list. Append transcripts and patch notes as appendices for auditability.

## Generic Domain Catalog

Pick domains that actually apply to the repo. Skip ones that don't exist. Add custom domains when the project has unique structure.

| Domain | Typical scope |
|---|---|
| `frontend-ui` | UI components, pages, styles, client-side state |
| `backend-api` | HTTP/RPC handlers, controllers, route definitions |
| `data-layer` | DB schema, migrations, ORM, query layer |
| `integrations` | External SDKs, webhooks, third-party APIs |
| `infrastructure` | Build, CI, IaC, deploy scripts, containers |
| `automation` | Background jobs, schedulers, workers, queues |
| `tests` | Unit, integration, e2e tests |
| `shared-libs` | Utilities, helpers, shared types |
| `config-and-secrets` | Config files, env handling, secret loading |
| `docs` | Operator-facing docs that ship with code |

## Required Final Output

Start with exactly:

`# Supervised Review — <project name>`

Then include sections in this exact order:

- `## A. Project-as-is` — stack, entry points, architecture summary
- `## B. Domain Groups` — table: `| Domain | Path scope | Reviewer agent |`
- `## C. Domain Findings (raw)` — one subsection per domain with the 7-pass findings table
- `## D. Consolidated Plan v1` — severity-grouped findings list, IDs preserved
- `## E. Skeptic Transcripts (per domain)` — one subsection per domain
- `## F. Patch Notes (per domain, v1 → final)` — one subsection per domain
- `## G. Final Issue List` — severity-grouped, with source IDs

## Skeptic Transcript Contract

ID format: `SK-<domain>-###` where `<domain>` is the kebab-case domain name. Examples: `SK-frontend-ui-001`, `SK-data-layer-014`.

For each skeptic ID, include:

- **Challenge** — what assumption or step is questionable
- **Failure mode** — what breaks or how a user gets stuck
- **Evidence** — which finding or plan slice triggered this concern
- **Questions** — concise questions the lead must answer
- **Lead Response** — `Decision: ACCEPT | REJECT | DEFER`, `Rationale`, `Plan Delta`

For each patch-notes section, map every change item back to exactly one skeptic ID from that domain's round.

## Determinism Guardrails

Every change in the final issue list must be explainable by an original reviewer finding ID or a `SK-<domain>-###` ID. Treat these as output contracts:

- Do not skip the skeptic phase for any domain — unreviewed slices cannot be traced; auditors hit a gap at G → E.
- Do not emit missing or malformed skeptic IDs — broken IDs snap the G → E traceability chain.
- Do not emit patch-note changes without an originating skeptic ID — a change with no ID is an untraceable mutation.
- Do not produce unresolved duplicates — the final list becomes ambiguous about which domain owns the fix.
- Do not output partial documents — sections A–G form the complete audit trail; a missing section means the audit cannot be reviewed end-to-end.
- Do not let domain scopes overlap — a file in two domains gets reviewed twice and generates conflicting fixes.

## Inline Fallbacks

If `references/prompts/orchestrator.txt` is missing, the main thread treats this SKILL.md as the orchestrator prompt directly.

If a domain reviewer cannot load `resources/audit-passes.md`, the reviewer must refuse to produce findings and report the missing file — do not run a degraded audit.

If the skeptic prompt is missing, inline the skeptic role with these constraints: produce no artifacts; propose no solutions; challenge assumptions/logic/UX/edge-cases only; use the ID format above.

## Prompt Assembly Guidance

When spawning each agent:

- Load the role prompt from `references/prompts/*.txt`.
- Add the domain's path scope as explicit boundaries — reviewers must not stray outside their scope.
- Enforce the output table format on reviewers; enforce ID format on skeptic.
- Keep reviewer responses deep but scoped; keep consolidation centralized in the lead lane.

Use `references/templates/domain-round-template.md` to keep per-domain rounds consistent, and `references/templates/final-report-template.md` to assemble the final document.
