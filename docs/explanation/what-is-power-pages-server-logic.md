# What is Power Pages server logic?

Server logic is code that runs server-side on a Power Pages site. A Power Pages "site" is a secure, authenticated portal over Microsoft Dataverse; server logic lets a maker add custom behaviour that runs on the server — without shipping code to the browser — and call Dataverse, external services, or cloud flows from it.

This page explains the programming model that **Logic Starter** and **Server Objects** work with. For the exact API surface, see the [Server Objects reference](../reference/server-objects.md).

[Back to the user guide](../usage-manual.md)

## How server logic is invoked

A server logic "record" defines named handler functions. Those functions are reached in one of two ways:

- **Over HTTP.** A handler function is exposed as an endpoint through the site's `/_api/serverlogics/{slug}` route. The HTTP method selects the function: `GET` calls `get()`, `POST` calls `post()`, `PUT` calls `put()`, `PATCH` calls `patch()`, and `DELETE` calls `del()`. A client in page JavaScript calls that endpoint.
- **From Liquid.** A handler function can be invoked from a page or web template through the `serverlogic` Liquid tag, passing input as JSON. This path has no HTTP endpoint and reaches the function directly.

A single server logic record can provide several functions. A recipe in the tool describes one record: the functions it defines, the methods those functions map to, and the setup that record needs.

## The Server.* programming model

Inside a handler function, makers work with the `Server.*` object model:

- **`Server.Context`** describes the current invocation — the HTTP request properties (body, query, headers, method, URL) or the Liquid input, plus shared properties such as the function name and server logic name.
- **`Server.Connector.*`** does the work. `Server.Connector.Dataverse` creates, reads, updates, and deletes Dataverse rows and invokes custom APIs; `Server.Connector.HttpClient` sends HTTP requests to allowed external hosts; `Server.Connector.CloudFlow` triggers a cloud flow.
- **Helpers** supply configuration and diagnostics: `Server.SiteSetting` and `Server.EnvironmentVariable` read site settings and environment variables, `Server.Website` and `Server.User` expose the current site and signed-in user, and `Server.Logger` writes messages you read from the DevTools extension.

The important boundary is between *what the handler does* and *what the caller is allowed to do*. A handler's Dataverse access is governed by the **table permissions** granted to the web role that reaches it, and external calls are governed by the site's **allowed outbound domains**. That is why every recipe ships a permission checklist alongside its handler: the code only works if the matching permissions and settings exist on the site.

## Where the tool fits

- **Logic Starter** turns a recipe into those three artefacts — the handler `{slug}.js`, the client call, and the `permission-checklist.md` — so you do not write the boilerplate from scratch.
- **Server Objects** is the catalogue of that `Server.*` model, with signatures, samples, and permission notes.
- **Logic Inspector** works from the other direction: it reads the server logic records already on a site and reports whether the web role, table permissions, and outbound networking that each one needs look configured.

None of these features deploy code or configure anything. They generate, look up, and inspect; you apply the results to your site and your environments.