# Supervised Review — {PROJECT_NAME}

## A. Project-as-is
- Stack: {languages, frameworks, build tools}
- Entry points: {paths}
- Architecture summary: {1–3 sentences}
- Notable constraints: {any relevant context — CLAUDE.md notes, recent changes, freezes, etc.}

## B. Domain Groups

| Domain | Path scope | Reviewer agent |
|---|---|---|
| {domain-1} | {globs/dirs} | general-purpose |
| {domain-2} | {globs/dirs} | general-purpose |
| ... | ... | ... |

Rationale for each domain (one line each):
- {domain-1}: ...
- {domain-2}: ...

## C. Domain Findings (raw)

### C.1 {domain-1}
| ID | Severity | Pass | File:Line | Problem | Fix |
|---|---|---|---|---|---|
| {domain-1}-001 | ... | ... | ... | ... | ... |

### C.2 {domain-2}
| ID | Severity | Pass | File:Line | Problem | Fix |
|---|---|---|---|---|---|
| {domain-2}-001 | ... | ... | ... | ... | ... |

(repeat per domain)

## D. Consolidated Plan v1
Severity-grouped, IDs preserved. Cross-domain duplicates merged with source-domain IDs noted.

### CRITICAL
- [{domain-1}-001, {domain-3}-007] {file:line} — {problem} → {fix}

### WARNING
- ...

### PRUNE
- ...

### INFO
- ...

## E. Skeptic Transcripts (per domain)

### E.1 {domain-1}
- `SK-{domain-1}-001` | Severity: ... | Category: ...
  - Challenge: ...
  - Failure mode: ...
  - Evidence: {finding ID}
  - Questions: ...
  - Lead Response:
    - Decision: ACCEPT/REJECT/DEFER
    - Rationale: ...
    - Plan Delta: ...

### E.2 {domain-2}
(same shape)

## F. Patch Notes (per domain, v1 → final)

### F.1 {domain-1}
- `SK-{domain-1}-001`: {what changed in the {domain-1} slice}
- `SK-{domain-1}-002`: ...

### F.2 {domain-2}
(same shape)

## G. Final Issue List
Severity-grouped. Each item references its original finding ID and any skeptic ID that altered it.

### CRITICAL
- [{domain-1}-001 ⟵ SK-{domain-1}-002] {file:line} — {refined problem} → {refined fix}

### WARNING
- ...

### PRUNE
- ...

### INFO
- ...

---

Auditability checklist (run before publishing):
- [ ] Every finding has `file:line`.
- [ ] Every patch-note change references a single `SK-<domain>-###` ID from that domain's round.
- [ ] Domain path scopes are disjoint (no file in two domains).
- [ ] Final Issue List preserves source IDs for every entry.
- [ ] Sections A–G are all present and non-empty (or explicitly marked "(none)" with a reason).
