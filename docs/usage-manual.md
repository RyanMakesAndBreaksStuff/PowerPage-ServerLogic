# Server Logic Tools usage manual

This manual is for Power Pages makers and developers using **Logic Starter** and **Server Objects** in Power Platform ToolBox (PPTB). It walks through creating a starter, adapting it, exporting it, and using reference samples in the handler.

[README](../README.md) · [How to build](build-manual.md)

## Contents

- [Before you begin](#before-you-begin)
- [Create and adapt a starter](#create-and-adapt-a-starter)
- [Choose a recipe](#choose-a-recipe)
- [Review readiness and permissions](#review-readiness-and-permissions)
- [Download and use a starter](#download-and-use-a-starter)
- [Use Server Objects](#use-server-objects)
- [Manage your session](#manage-your-session)
- [Troubleshooting](#troubleshooting)

## Before you begin

Open the tool in PPTB Desktop with host API 1.2.7 or later. An active environment connection is not required to generate a starter or browse the catalogue. Clipboard actions, saving the ZIP, and opening reference links use PPTB services.

To run an exported starter, you need a Power Pages site with server logic authoring available and access to configure the selected recipe's roles, permissions, and settings. External-service recipes also require the corresponding service and credentials. The tool supplies code and setup guidance; you perform deployment and configuration in your site.

## Create and adapt a starter

### 1. Open Logic Starter

The initial session uses:

| Setting | Initial value |
| --- | --- |
| Logic name | `customer-summary` |
| Recipe | Read Dataverse records |
| HTTP method | GET |
| Client language | fetch |

The page shows **Logic name**, **HTTP method**, **Recipe**, and **Readiness** controls, an editable server handler, a generated client call, and a request path showing how the selected call reaches the handler.

> **Screenshot placeholder S1 — Starter overview**  
> Suggested file: `images/usage-starter-overview.png`  
> Capture the initial Logic Starter page with `customer-summary`, GET, Read Dataverse records, the readiness indicators, both code panes, and the request path visible. Keep labels readable so a new user can identify the controls described above.

### 2. Choose a recipe

Select the pattern closest to your goal from **Recipe**. Each recipe supplies a handler, supported methods, example requests, and setup guidance. See the [recipe reference](#choose-a-recipe) below.

Changing recipes after editing the handler prompts before discarding your edits. Copy or download work you want to keep before accepting that change.

### 3. Set the logic name

Enter a descriptive name in **Logic name**. Starter derives a URL-safe name, called a slug, for the endpoint and downloaded files. For example, `Customer Summary` becomes `customer-summary`.

The conversion lowercases the name, replaces runs of non-ASCII-alphanumeric characters with dashes, trims edge dashes, and limits the result to 64 characters. An empty result becomes `untitled`; reserved Windows device names receive a `-logic` suffix.

Use the resulting slug when creating server logic on your site. Different names can produce the same slug. Starter does not inspect your site for an existing endpoint, so check for a collision before deployment.

### 4. Choose a method and client language

Select an enabled HTTP method. Disabled methods explain which handler function the recipe does not export. The method mapping is:

| HTTP method | Handler function |
| --- | --- |
| GET | `get()` |
| POST | `post()` |
| PUT | `put()` |
| PATCH | `patch()` |
| DELETE | `del()` |

In **Client call**, choose **fetch**, **jQuery**, or **Liquid** when enabled. HTTP clients call `/_api/serverlogics/{slug}`. The generated code includes the request-verification-token handling and the recipe's example request.

**Invoke from Liquid** uses `getSummary` through the `serverlogic` Liquid tag. It has no HTTP endpoint; HTTP method and JavaScript-client choices are disabled for that recipe. Liquid availability for other handlers depends on both the recipe and whether the current code uses HTTP-only request properties.

### 5. Adapt the server handler

Edit the **Server** pane directly. Replace sample identifiers, settings, service addresses, and business rules with values appropriate to your site. Browser checks run against the current text. Generated emphasis highlighting disappears after edits because its line positions refer to the original template.

The client pane is generated and read-only. It updates from the selected name, recipe, method, and language. Recipe query parameters and request bodies are example data, rather than separate form fields. Use **Copy client call** and adapt those example values in your page code. Starter does not infer a new client contract from arbitrary handler edits.

Use **Copy server code** to copy the current handler. Use [Server Objects](#use-server-objects) to find and insert API samples.

> **Screenshot placeholder S2 — Editing and browser checks**  
> Suggested file: `images/usage-code-review.png`  
> Show an edited server handler with a browser-check finding and its line number visible. Include the Client call pane, its language selector, and both copy controls. Use a harmless example such as a browser-only API in server code to demonstrate the finding, then remove it before using the handler.

## Choose a recipe

All ten recipes are available in the catalogue. The exported README and permission checklist contain the detailed setup for the selected recipe.

| Recipe | Supported call | Purpose and setup to review |
| --- | --- | --- |
| **Read Dataverse records** | GET; Liquid when eligible | Read contact records. Review contact Read permission with Account scope and ensure test contacts have a parent account. |
| **Validate a request** | POST | Validate a sample name/email request body without using a table. Assign the caller's web role. |
| **Call an external API** | GET | Call an upstream API using a query value. Configure `ExternalApi/BaseUrl`, outbound access to the host, and the upstream service. |
| **Dataverse CRUD** | GET, POST, PUT, DELETE | Read, create, update, and delete sample contacts. Review each operation's table permission and scope; a reference demo page is included. |
| **External service CRUD** | GET, POST, PUT, DELETE | Demonstrate operations against a sample external OData service. Replace the sample service as needed and review its outbound host, roles, and credentials. Includes a reference demo page. |
| **Call an Azure Function** | GET | Call a function using a sample name query. Configure `AZURE_FUNCTION_URL`, allow the function host, and review access to the function. Includes a reference demo page. |
| **Microsoft Graph & SharePoint** | POST | Send sample data through Graph and SharePoint integrations. Configure the application, tenant, site settings, outbound hosts, and sample-table Create permission. |
| **Invoke from Liquid** | Liquid `getSummary` | Invoke server logic from a page or web template using JSON input. Assign the caller's web role; the example does not require table permissions. |
| **Trigger a cloud flow** | POST | Invoke a configured cloud flow. Create and add the flow to the site, configure `CLOUD_FLOW_ID`, and assign an authorized role. |
| **Call a Dataverse custom API** | GET, POST, PATCH | Replace the sample custom function/action names and match the deployed API's request and response contract. Review table permissions, API privileges, and any additional side effects. |

For external integrations, distinguish the caller's site permissions from the credentials used by the upstream service. Follow the selected package's notes. The generated guidance uses Key Vault and environment-backed site settings for secrets; replace configuration references rather than embedding literal secrets in the handler.

For **Call a Dataverse custom API**, the recipe guidance leaves one privilege question unverified: which identity Dataverse checks for the API's `ExecutePrivilegeName` when invoked through server logic. Verify that behavior for your API and environment before relying on its privilege configuration.

## Review readiness and permissions

The **Readiness** count combines three indicators:

| Indicator | What it means |
| --- | --- |
| **Browser checks** | No restricted-pattern hits or parse failure were found in the current handler. This is a code-pattern check, not compilation or a runtime test. Findings can be labelled **Blocked** or **May be rejected**. |
| **Validation** | The starter provides generated validation scaffolding. This indicator remains counted as complete; it does not revalidate your edited business logic. |
| **Permissions** | You marked the checklist reviewed for the exact current handler text. The tool has not checked the site's actual configuration. |

To review permissions:

1. Read the permission note below the code panes.
2. Expand **View checklist**.
3. Review the recipe's roles, table permissions, site settings, outbound hosts, and prerequisites. Include any additional requirements introduced by your edits or inserted samples.
4. Choose **Mark checklist reviewed** to record your review for the current code.
5. Use **Undo review** to clear that acknowledgment when needed.

Changing the handler text makes its previous review no longer apply unless the text again matches the reviewed version. A count of **3/3 ready** does not confirm authorization, deployment, or successful execution. Download remains available when items need attention, and the package records that state.

> **Screenshot placeholder S3 — Permission review**  
> Suggested file: `images/usage-permission-checklist.png`  
> Expand View checklist for a Dataverse recipe and show its table-permission and role requirements. Capture the Permissions indicator after Mark checklist reviewed, with Undo review visible. Include the Readiness count to show how the acknowledgment affects it.

## Download and use a starter

### Save the package

1. Choose **Download starter**.
2. Select a location in the PPTB save dialog and save `{slug}.zip`.
3. Extract the archive and open its `README.md`.

Cancelling the save dialog leaves the current session available for further editing.

| File | Purpose |
| --- | --- |
| `{slug}.js` | Your current server handler, including edits and inserted samples. |
| `{slug}.client.js` | Generated fetch or jQuery client call. |
| `{slug}.client.liquid` | Generated Liquid client, used instead of the JavaScript client when Liquid is selected. |
| `README.md` | Recipe-specific setup, endpoint or Liquid invocation, request path, checks, prerequisites, and troubleshooting. |
| `permission-checklist.md` | Recipe configuration checklist and readiness information. Review extra requirements from custom edits separately. |
| `{slug}.page.html` | Reference demo page for Dataverse CRUD, External service CRUD, or Call an Azure Function. Other recipes omit this file. |

> **Screenshot placeholder S4 — Exported starter files**  
> Suggested file: `images/usage-starter-package.png`  
> Show an extracted Dataverse CRUD starter ZIP with the matching handler, client, README, permission checklist, and demo HTML page. Keep the slug consistent across filenames and show the generated README's setup section alongside the file list if space permits.

### Add the files to Power Pages

Follow the generated README for your recipe. Its setup sequence is:

1. Set up a Power Pages workspace and open **Server logic**.
2. Select **+ New server logic** and name it exactly as the exported slug. That name identifies the API resource.
3. Select **+ Add roles** and add the web role listed in the package.
4. Select **Edit code**, then **Open Visual Studio Code**.
5. Replace the handler's content with `{slug}.js` and save it.
6. Configure the settings, allowed domains, and table permissions listed in `permission-checklist.md`.
7. Paste the JavaScript client into the page's custom JavaScript, or the Liquid client into a page or web template.
8. If supplied, use `{slug}.page.html` as a reference for wiring the calls into a page.

Test on your configured site using the intended caller role. For example, the default contact-reading recipe needs the caller's contacts and parent-account relationship to match its permission scope. For write or integration recipes, review the operation and sample values before invoking the client.

The package documents generated setup guidance; successful execution depends on the site's available authoring features and configuration.

## Use Server Objects

### Find an object or method

1. Open **Server Objects**, or choose **Browse all** from Starter.
2. Enter an object path or member name in **Search objects and methods**. Matching is case-insensitive and uses substrings.
3. Select a filter to show all objects, objects used in the current handler, or connectors.
4. Select an object and a member to see its signature, return information, execution context or timing, and samples where supplied.
5. Use the sample selector when a member offers multiple examples. The Learn link opens its reference through PPTB.

The context column shows **Used in {slug}**, **Permissions needed**, and **Another sample** where available. Used marks come from analysis of the current Starter handler. They are a navigation aid rather than a record of deployed code or runtime calls.

The catalogue is curated data shipped with the tool. It does not discover the APIs available in your connected environment. Some return information is explicitly marked **Not documented on Learn**.

> **Screenshot placeholder S5 — Server Objects reference and insertion**  
> Suggested file: `images/usage-server-objects.png`  
> Show a populated object/method search with a selected member, its signature and sample, the Copy and Insert into handler controls, and the right-hand Used in and Permissions needed sections. Include the filter controls so readers can locate them.

### Insert a sample into the handler

1. In Starter, choose the target recipe and method. Place the cursor at a statement boundary inside the intended handler function if you want a specific insertion point.
2. Open **Server Objects** and select a sample.
3. Choose **Insert into handler**.
4. Starter opens with the insertion applied. Review the resulting code, its browser checks, and any new permission or configuration requirements.

When no cursor is available, insertion targets the selected handler function before its last top-level return, or at the end of its body. Insertion can add `async` when a sample needs `await`. It does not configure the environment or reconcile sample variable names with your business logic.

If the tool cannot find a safe insertion location, the control shows a reason. Copying the sample remains available so you can adapt it manually. **Back to Create Logic** returns to Starter without inserting a sample.

## Manage your session

Switching between Logic Starter and Server Objects keeps the current name, handler edits, method, client language, and checklist review in the same tool session.

**Start over** restores the initial `customer-summary` / Read Dataverse records / GET / fetch state and clears your edits and review. Copy or download work you want to retain first.

Starter state is held in memory. Closing or reloading the tool starts a new session; use the exported files to keep your work.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| A method is disabled | The recipe must export its matching handler function. Invoke from Liquid is not callable over HTTP. |
| Liquid becomes unavailable | The recipe or edited handler uses HTTP-only request properties. Choose an enabled client language or adapt the handler for Liquid. |
| Browser checks show a finding | Inspect the reported line and replace browser-only or restricted constructs with supported server APIs. Fix parse errors before relying on the checks. |
| Validation stays complete after editing | This is expected: generated validation is counted, while your edits are not revalidated by that indicator. |
| Permission review needs attention again | Review applies to the exact handler text you acknowledged. Recheck requirements after changing the code. |
| Insert into handler is unavailable | Read the displayed reason. Restore a parseable handler, choose a valid target function and statement boundary, or copy the sample for manual insertion. |
| Search returns no objects | Clear the search and choose the all-objects filter. The used filter only lists objects recognized in the current handler. |
| Copy, download, or a Learn link fails in a browser preview | Open the tool in PPTB Desktop; those actions use host APIs. |
| A downloaded handler fails on the site | Confirm the exact slug, selected method, request contract, caller role, and all recipe-specific configuration in the exported README and checklist. Local readiness does not test the site. |
| An external call fails | Review outbound domains, the service configuration and credentials, and tenant restrictions on external server-logic calls. Use the package's troubleshooting guidance for the selected recipe. |

For developer setup or loading a local build, see the [build manual](build-manual.md).
