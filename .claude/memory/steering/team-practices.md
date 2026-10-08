---
scope: team-practices
loaded-by: sdd-plan, sdd-review, using-git
---

# Team Practices

## Branching
`NNN-slug` feature branches (e.g. `001-server-logic-starter-inspector`), matching the spec folder. Ticket prefix `GH-` (GitHub Issues). Conventional Commits. See `docs/git-convention.md`.

## Code Review
[Edit to match reality — e.g. self-review + `sdd-review` spec-alignment check before merge]

## Release Process
`npm run build` → `npx pptb-validate` clean → `npm run finalize-package` → `npm publish --access public` (explicit confirmation required — irreversible) → PPTB registry submission. [Edit versioning scheme to match reality, e.g. semver tags on main]
