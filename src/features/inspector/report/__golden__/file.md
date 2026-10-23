## Server logic readiness: customer-summary.js

**Environment:** Contoso · Dev / Customer portal

**Scanned:** 2026-10-22 11:00:00 – 2026-10-22 11:00:30 (UTC+00:00)

Read as separate queries during this interval, not as one atomic snapshot.

**Result:** Needs review · 2/3 · 1 to review

> Server logic is disabled on this site (ServerLogic/Enabled = false)

| Check | Status | Finding |
| --- | --- | --- |
| Web role | Configured | Members can call this handler. |
| Table permissions | Needs review | Global Read on account via Members. |
| Outbound networking | Configured | No HttpClient calls in code. |

### Table permissions

Global Read on account via Members.

Review tablePermissions configuration.

tablePermissions detail.

- [ ] Is tablePermissions configured for the intended users?

### Configuration snapshot

**Web roles**

- Members

**Tables with privileges**

- account / Global / Read / Members

**Outbound**

- ServerLogic/AllowedDomains = api.example.com

> Configuration review only. Tenant outbound policy not verified.
