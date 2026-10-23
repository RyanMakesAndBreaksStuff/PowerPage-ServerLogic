## Site readiness report: Customer portal

Logic Inspector · Site readiness report · 2026-10-22

3 server logic files, 1 finding to review

**Environment:** Contoso · Dev / Customer portal

**Scanned:** 2026-10-22 11:00:00 – 2026-10-22 11:00:30 (UTC+00:00)

Read as separate queries during this interval, not as one atomic snapshot.

**Result:** 5/9 checks addressed (4 configured, 1 reviewed)

Ready: 1 · Needs review: 1 · Incomplete: 1 · Not verified: Tenant outbound policy

> Server logic is disabled on this site (ServerLogic/Enabled = false)

| File | Addressed | Web role | Table permissions | Outbound networking | Result |
| --- | --- | --- | --- | --- | --- |
| a-reviewed | Ready · 1 reviewed | Configured | Reviewed: Global Read on account via Members. | Configured | Ready |
| customer-summary.js | 2/3 · 1 to review | Configured | Needs review | Configured | Needs review |
| z-pending | 0/3 · 0 to review | Not scanned | Not scanned | Not scanned | Incomplete |

### Review first

### Table permissions: customer-summary.js

Global Read on account via Members.

Review tablePermissions configuration.

tablePermissions detail.

- [ ] Is tablePermissions configured for the intended users?

### Not scanned

- Web role: z-pending — Not read before the connection was lost
- Table permissions: z-pending — Not read before the connection was lost
- Outbound networking: z-pending — Not read before the connection was lost

### Configuration snapshot: a-reviewed

**Web roles**

- Members

**Tables with privileges**

- account / Global / Read / Members

**Outbound**

- ServerLogic/AllowedDomains = api.example.com

### Configuration snapshot: customer-summary.js

**Web roles**

- Members

**Tables with privileges**

- account / Global / Read / Members

**Outbound**

- ServerLogic/AllowedDomains = api.example.com

### Configuration snapshot: z-pending

**Web roles**

- Members

**Tables with privileges**

- account / Global / Read / Members

**Outbound**

- ServerLogic/AllowedDomains = api.example.com

> Configuration review only. Confirm effective access with a real site user. Exported 2026-10-22 11:02:00 (UTC+00:00).

> Tenant outbound policy not verified.
