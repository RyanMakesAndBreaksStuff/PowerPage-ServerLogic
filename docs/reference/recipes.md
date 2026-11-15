# Recipes reference

The ten recipes behind **Logic Starter**. Each recipe provides a server handler, the HTTP methods it supports, example requests, and the setup guidance that ships in the exported `README.md` and `permission-checklist.md`.

The recipe catalogue in the app groups these as **core** (R1–R3), **tutorial** (R4–R7), and **reference** (R8–R10). Those are catalogue groupings, not the Diátaxis quadrants used for this documentation.

[Back to the user guide](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/docs/usage-manual.md) · [Server Objects reference](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/docs/reference/server-objects.md)

## HTTP method map

Starter enables an HTTP method only when the recipe exports its matching handler function:

| HTTP method | Handler function |
| --- | --- |
| GET | `get()` |
| POST | `post()` |
| PUT | `put()` |
| PATCH | `patch()` |
| DELETE | `del()` |

The **Invoke from Liquid** recipe (R8) exports `getSummary` instead and is invoked through the `serverlogic` Liquid tag, not over HTTP.

## Recipe catalogue

| Recipe | Methods | Main Server object | Tables (privilege, access) | Outbound domains | Site settings |
| --- | --- | --- | --- | --- | --- |
| **Read Dataverse records** (R1) | GET | `Server.Connector.Dataverse` | `contact` (Read, Account) | — | — |
| **Validate a request** (R2) | POST | `Server.Context` | — | — | — |
| **Call an external API** (R3) | GET | `Server.Connector.HttpClient` | — | `<target-host>` | `ExternalApi/BaseUrl` |
| **Dataverse CRUD** (R4) | GET, POST, PUT, DELETE | `Server.Connector.Dataverse` | `contact` (Read/Write/Delete, Account; Create, Global) | — | — |
| **External service CRUD** (R5) | GET, POST, PUT, DELETE | `Server.Connector.HttpClient` | — | `services.odata.org` | — |
| **Call an Azure Function** (R6) | GET | `Server.Connector.HttpClient` | — | `<function-app>.azurewebsites.net` | `AZURE_FUNCTION_URL` |
| **Microsoft Graph & SharePoint** (R7) | POST | `Server.Connector.HttpClient` | `crd69_eventregistration` (Create, Global) | `login.microsoftonline.com`, `graph.microsoft.com` | `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `HOSTNAME`, `SITE_PATH` |
| **Invoke from Liquid** (R8) | Liquid `getSummary` | `Server.Context` | — | — | — |
| **Trigger a cloud flow** (R9) | POST | `Server.Connector.CloudFlow` | — | — | `CLOUD_FLOW_ID` |
| **Call a Dataverse custom API** (R10) | GET, POST, PATCH | `Server.Connector.Dataverse` | `account` (Read/Write, Account) | — | — |

Three recipes also include a reference demo page in the downloaded ZIP: **Dataverse CRUD**, **External service CRUD**, and **Call an Azure Function** (`{slug}.page.html`).

## Recipe notes

### Read Dataverse records (R1)

Reads contact records. Grant **Read** on `contact` with **Account** access to the caller's web role. The caller's contacts must have a parent account, and test contacts must be linked to that account for the scope to match.

### Validate a request (R2)

Validates a sample `name`/`email` request body without touching a table. Assign the caller's web role to the handler. No table permissions are needed because the handler rejects invalid input before any data access.

### Call an external API (R3)

Calls an upstream API using a query value. Set `ExternalApi/BaseUrl`, allow the target host as an outbound domain, and assign the caller's web role. Upstream calls use the integration's own credentials (site setting, app registration, or flow connection), not the caller's.

### Dataverse CRUD (R4)

Reads, creates, updates, and deletes sample contacts. Grant **Read**, **Write**, and **Delete** on `contact` with **Account** access, plus **Create** on `contact` with **Global** access, to the recipe's web role. The Global **Create** grant is expected: an Account-scoped create cannot place the new contact in the caller's scope, so the new contact is not readable through the Account-scoped permission until it is linked to the caller's account.

### External service CRUD (R5)

Demonstrates operations against a sample external OData service. Add `services.odata.org` to the allowed domains (replace it if you point at another service) and assign the **Administrators** web role. Replace the sample service and review its outbound host, role, and credentials.

### Call an Azure Function (R6)

Calls a function using a sample `name` query. Set `AZURE_FUNCTION_URL`, allow the function app's host as an outbound domain, and assign the **Authenticated Users** web role. Review access to the function.

### Microsoft Graph & SharePoint (R7)

Sends sample data through Graph and SharePoint integrations. Set `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `HOSTNAME`, and `SITE_PATH`; allow `login.microsoftonline.com` and `graph.microsoft.com`; and grant **Create** on `crd69_eventregistration` with **Global** access to the caller's web role. Hold the client secret in Azure Key Vault and surface it through an environment variable behind the `CLIENT_SECRET` site setting. Replace the sample table (from a Learn sample solution) with your own.

### Invoke from Liquid (R8)

Invokes server logic from a page or web template using JSON input, through the `serverlogic` Liquid tag. Assign a web role the visiting user holds. The example requires no table permissions. It has no HTTP endpoint, so HTTP-method and JavaScript-client choices are disabled.

### Trigger a cloud flow (R9)

Invokes a configured cloud flow. Create the flow, add it to the site with a web role the caller holds, and set `CLOUD_FLOW_ID`, then assign an authorized role. Upstream calls use the flow's connection, not the caller's.

### Call a Dataverse custom API (R10)

Invokes a bound function, bound action, or unbound action through `Server.Connector.Dataverse.InvokeCustomApi`. Grant **Read** and **Write** on `account` with **Account** access to the caller's web role, and replace the three placeholder API names (`new_CustomBoundFunction`, `new_Action`, `new_CustomBoundAction`). The custom API's request and response parameters must match what the handler sends and reads, and the API must exist in the environment. One question is left unverified: which identity Dataverse checks for the API's `ExecutePrivilegeName` when invoked through server logic — verify that behavior before relying on the privilege configuration.

## Exported starter files

Every downloaded ZIP contains, for the selected recipe and slug:

| File | Purpose |
| --- | --- |
| `{slug}.js` | The current server handler, including edits and inserted samples. |
| `{slug}.client.js` | Generated fetch or jQuery client call. |
| `{slug}.client.liquid` | Generated Liquid client (instead of the JavaScript client when Liquid is selected). |
| `README.md` | Recipe-specific setup, endpoint or Liquid invocation, request path, checks, prerequisites, and troubleshooting. |
| `permission-checklist.md` | Recipe configuration checklist and readiness information. |
| `{slug}.page.html` | Reference demo page for R4, R5, or R6 only. |

## Slug rules

Starter derives a URL-safe slug from the logic name for the endpoint and the downloaded files. The conversion lowercases the name, replaces runs of non-ASCII-alphanumeric characters with dashes, trims edge dashes, and limits the result to 64 characters. An empty result becomes `untitled`, and reserved Windows device names receive a `-logic` suffix. Different names can produce the same slug, and Starter does not check for an existing endpoint on the site.