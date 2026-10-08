---
scope: test-strategy
loaded-by: sdd-plan, sdd-execute, sdd-review
---

# Test Strategy

## Test Framework
Vitest + React Testing Library. `tsc -b` and ESLint (`--max-warnings=0`) are part of the gate.

## Test Levels
- Unit tests: pure generators (handler JS, client calls, Markdown/PDF report models) with golden-file tests; code analysis rules (spec FR-4 must-flag / must-not-flag tables); Inspector readiness rules.
- Integration tests: features rendered against a fake `services/pptb/` adapter with canned Dataverse responses; the spec's behavior harness (fake `Server`, `shell`, `fetch`, `$.ajax` — AC-4.12) for generated handlers.
- E2E tests: manual load in PPTB (Debug → Load Local Tool) against a development site; live-behavior spikes (S1–S4) are separate gates — passing the harness is not live verification.

## Coverage Expectations
[Edit to match reality — e.g. 100% of spec acceptance criteria mapped to at least one test; every generator recipe has a golden file]

## Mocking Policy
Mock only at the PPTB host boundary (`services/pptb/` adapter). No ad hoc module mocks. Never call a real environment from automated tests.
