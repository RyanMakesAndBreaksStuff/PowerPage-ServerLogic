---
branch_pattern: "^[0-9]+-[a-z0-9-]+$"
ticket_prefix: "GH-"
commit_format: "<type>(<scope>): <message>"
allowed_types:
  - feat
  - fix
  - docs
  - chore
  - refactor
  - test
  - build
  - ci
  - perf
  - style
---

# Git Convention

This file is read by SDD skills to enforce branch naming and commit message standards.
To change these settings, edit this file directly.

## Examples

### Branch names
- `001-server-logic-starter-inspector`
- `002-inspector-pdf-export`

### Commit messages
- `feat(starter): add HTTP method pill selector`
- `fix(inspector): treat unresolved parent chain as needs review (GH-12)`
