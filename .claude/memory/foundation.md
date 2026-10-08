# Server Logic Tools Foundation

> Loaded every session. To amend, follow the Amendment Process below.

## Mission
A desktop developer tool that gets Power Pages makers and pro developers from an idea
to a working server logic handler (Logic Starter), and reviews a development site's
existing server logic for web role, table permission and outbound networking gaps
before release (Logic Inspector).

## Principles
1. **Design fidelity.** The colours, type, spacing, radii and copy in the design
   handoff are final. Recreate them precisely, mapping to native components where an
   equivalent exists.
2. **Learn-verified accuracy.** Generated handlers, client calls and Server.* reference
   content match current Microsoft Learn. Any deliberate deviation is recorded as a
   numbered Learn correction in the spec.
3. **Read-only, always.** Starter only produces downloads, and Inspector only reads.
   Nothing is ever written to, published to or changed in an environment or site.
4. **Generated code is secure by default.** Handlers fail closed when settings are
   missing. They never log bodies, exception messages, URLs or tokens, and they
   request the least privilege the recipe needs.
5. **The spec is the source of truth.** Code follows the approved spec in
   `docs/specs/`. Behaviour changes go through a spec update before implementation.

## Operational Context
Steering files in `.claude/memory/steering/` carry project-specific operational context
(tech stack, test strategy, conventions, team practices). Each file's `loaded-by`
frontmatter lists which skills silently incorporate it during that skill's session.
Edit steering files freely — they are not subject to the amendment process.

## Amendment Process
Document the rationale → get explicit team approval → check backwards compatibility
against existing specs and generated output.
