# Create your first starter

In this tutorial you produce a Power Pages server logic handler, its matching client call, and a permission checklist using **Logic Starter**, then export the whole thing as a ZIP you can deploy to a site. You will not deploy anything to an environment, and you do not need an active PPTB connection to follow along.

By the end you will have:

- generated a server handler, a client call, and a permission checklist from a recipe;
- edited the handler and reviewed the tool's browser-check and permission findings;
- downloaded a starter package that contains these files plus a recipe-specific README.

This is the lesson path. If you already know the shape of the task and just want the steps, use the [how-to guide](../how-to/generate-and-adapt-a-starter.md) instead.

[Back to the user guide](../usage-manual.md) · [How-to: generate and adapt a starter](../how-to/generate-and-adapt-a-starter.md)

## Before you begin

Open the tool in PPTB Desktop with host API 1.2.7 or later. You do not need an active environment connection for this tutorial; clipboard and file-saving actions use PPTB host services, so run the tool inside PPTB rather than in a standalone browser preview.

You will use the default recipe **Read Dataverse records**. When you later deploy the result, you need a Power Pages site with server logic authoring available, plus the web role and table permissions the checklist lists. None of that is required to complete the tutorial itself.

## Step 1 — Open Logic Starter

The tool opens on **Logic Starter** with a known starting state:

| Setting | Initial value |
| --- | --- |
| Logic name | `customer-summary` |
| Recipe | Read Dataverse records |
| HTTP method | GET |
| Client language | fetch |

The page shows the **Logic name**, **HTTP method**, **Recipe**, and **Readiness** controls, an editable server handler on the left, a generated client call, and a request path showing how the selected call reaches the handler. Take a moment to see how these correspond: the handler is the server-side code you will edit, the client call is produced for you, and the request path explains the route between them.

> **Screenshot placeholder S1 — Starter overview**
> Suggested file: `images/usage-starter-overview.png`
> Capture the initial Logic Starter page with `customer-summary`, GET, Read Dataverse records, the readiness indicators, both code panes, and the request path visible. Keep labels readable so a new user can identify the controls described above.

## Step 2 — Choose a recipe

The **Recipe** selector offers ten starting points, from reading Dataverse records to calling external services to invoking from Liquid. For this tutorial keep **Read Dataverse records**: it reads contact records and is the smallest end-to-end example.

Each recipe supplies a handler, the HTTP methods it supports, example requests, and setup guidance. The full catalogue is in the [recipe reference](../reference/recipes.md). If you change recipes after editing the handler, the tool prompts before discarding your edits, so copy or download any work you want to keep first.

## Step 3 — Set the logic name

Enter a name in **Logic name**. Starter derives a URL-safe name, called a slug, that it uses for the endpoint and the downloaded files. For example, `Customer Summary` becomes `customer-summary`.

The conversion lowercases the name, replaces runs of non-ASCII-alphanumeric characters with dashes, trims edge dashes, and limits the result to 64 characters. An empty result becomes `untitled`; reserved Windows device names receive a `-logic` suffix.

You will use the resulting slug when you create the server logic record on your site, so choose a name you recognise. Different names can produce the same slug, and Starter does not inspect your site for an existing endpoint — check for a collision before you deploy.

## Step 4 — Choose a method and client language

Select an enabled HTTP method. A method is disabled when the recipe does not export the matching handler function. The mapping is:

| HTTP method | Handler function |
| --- | --- |
| GET | `get()` |
| POST | `post()` |
| PUT | `put()` |
| PATCH | `patch()` |
| DELETE | `del()` |

For the Read Dataverse records recipe, GET is the only HTTP method. In **Client call**, choose **fetch**, **jQuery**, or **Liquid** where enabled. HTTP clients call `/_api/serverlogics/{slug}`, and the generated code includes the request-verification-token handling and the recipe's example request.

The **Invoke from Liquid** recipe uses the `serverlogic` Liquid tag instead of an HTTP endpoint, so its HTTP-method and JavaScript-client choices are disabled. Liquid availability for other handlers depends on the recipe and on whether the current code uses HTTP-only request properties; see the [recipe reference](../reference/recipes.md) for which recipes support it.

## Step 5 — Adapt the server handler

Edit the **Server** pane directly. Replace the sample identifiers, settings, and business rules with values appropriate to your site. As you type, browser checks run against the current text, and the generated emphasis highlighting disappears after edits because its line positions refer to the original template — that is expected.

The client pane is generated and read-only. It updates from the selected name, recipe, method, and language. Recipe query parameters and request bodies are example data, not separate form fields, so use **Copy client call** and adapt those values in your page code. Starter does not infer a new client contract from arbitrary handler edits.

Use **Copy server code** to copy the handler at any point. You can also pull API samples out of [Server Objects](../how-to/browse-and-insert-server-objects.md) and insert them into the handler.

> **Screenshot placeholder S2 — Editing and browser checks**
> Suggested file: `images/usage-code-review.png`
> Show an edited server handler with a browser-check finding and its line number visible. Include the Client call pane, its language selector, and both copy controls. Use a harmless example such as a browser-only API in server code to demonstrate the finding, then remove it before using the handler.

## Step 6 — Review readiness and permissions

The **Readiness** count combines three indicators. For the lesson, focus on the third one — permissions:

| Indicator | What it means |
| --- | --- |
| **Browser checks** | No restricted-pattern hits or parse failure were found in the current handler. A code-pattern check, not compilation or a runtime test. |
| **Validation** | The starter provides generated validation scaffolding. This indicator stays complete and does not revalidate your edited logic. |
| **Permissions** | You marked the checklist reviewed for the exact current handler text. The tool has not checked the site's actual configuration. |

Review permissions like this:

1. Read the permission note below the code panes.
2. Expand **View checklist**.
3. Review the recipe's roles, table permissions, site settings, outbound hosts, and prerequisites.
4. Choose **Mark checklist reviewed** to record your review for the current code.

Changing the handler text makes a previous review no longer apply unless the text again matches the reviewed version. A count of **3/3 ready** does not confirm authorization, deployment, or successful execution.

> **Screenshot placeholder S3 — Permission review**
> Suggested file: `images/usage-permission-checklist.png`
> Expand View checklist for a Dataverse recipe and show its table-permission and role requirements. Capture the Permissions indicator after Mark checklist reviewed, with Undo review visible. Include the Readiness count to show how the acknowledgment affects it.

## Step 7 — Download and deploy the starter

Choose **Download starter**, pick a location in the PPTB save dialog, and save `{slug}.zip`. Cancelling the dialog leaves your session intact. Extract the archive and open its `README.md`:

| File | Purpose |
| --- | --- |
| `{slug}.js` | Your current server handler, including edits and inserted samples. |
| `{slug}.client.js` | Generated fetch or jQuery client call. |
| `{slug}.client.liquid` | Generated Liquid client, used instead of the JavaScript client when Liquid is selected. |
| `README.md` | Recipe-specific setup, endpoint or Liquid invocation, request path, checks, prerequisites, and troubleshooting. |
| `permission-checklist.md` | Recipe configuration checklist and readiness information. |
| `{slug}.page.html` | Reference demo page for Dataverse CRUD, External service CRUD, or Call an Azure Function. Other recipes omit this file. |

To use the package on your site, follow the generated README. Its setup sequence is:

1. Set up a Power Pages workspace and open **Server logic**.
2. Select **+ New server logic** and name it exactly as the exported slug. That name is the API resource.
3. Select **+ Add roles** and add the web role listed in the package.
4. Select **Edit code**, then **Open Visual Studio Code**.
5. Replace the handler's content with `{slug}.js` and save it.
6. Configure the settings, allowed domains, and table permissions listed in `permission-checklist.md`.
7. Paste the JavaScript client into the page's custom JavaScript, or the Liquid client into a page or web template.
8. If supplied, use `{slug}.page.html` as a reference for wiring the calls into a page.

Test on your configured site using the intended caller role. For the read recipe, the caller's contacts and parent-account relationship must match the recipe's Account permission scope. The package documents generated setup guidance; successful execution depends on the site's available authoring features and configuration.

> **Screenshot placeholder S4 — Exported starter files**
> Suggested file: `images/usage-starter-package.png`
> Show an extracted Dataverse CRUD starter ZIP with the matching handler, client, README, permission checklist, and demo HTML page. Keep the slug consistent across filenames and show the generated README's setup section alongside the file list if space permits.

## Step 8 — Where to go next

- To generate a specific kind of handler rather than follow the default recipe, see [Generate and adapt a starter](../how-to/generate-and-adapt-a-starter.md) and the [recipe reference](../reference/recipes.md).
- To add API samples into a handler, see [Browse and insert Server Objects](../how-to/browse-and-insert-server-objects.md).
- To check the server logic already on a live site, see [Inspect a site's server logic](../how-to/inspect-a-sites-server-logic.md).