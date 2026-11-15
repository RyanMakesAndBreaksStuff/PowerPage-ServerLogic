# Server Logic Tools user guide

This is the documentation home for **Logic Starter**, **Server Objects**, and **Logic Inspector** — the three pages of the Server Logic Tools Power Platform ToolBox (PPTB) tool. It points you to the right document, organised by the four [Diátaxis](https://diataxis.fr/) quadrants so you can find what you need by intent rather than by title.

[README](../README.md)

## Tutorials

Learning-oriented lessons that take you from a blank start to a working result.

- [Create your first starter](tutorials/create-your-first-starter.md) — produce a server handler, a matching client call, and a permission checklist, then export and deploy them.

## How-to guides

Problem-oriented instructions for a specific task.

- [Generate and adapt a starter](how-to/generate-and-adapt-a-starter.md) — choose a recipe, set the name, method, and client, edit the handler, review readiness, and download the package.
- [Browse and insert Server Objects](how-to/browse-and-insert-server-objects.md) — search the `Server.*` catalogue and insert a sample into the current Starter handler.
- [Inspect a site's server logic](how-to/inspect-a-sites-server-logic.md) — scan a Power Pages site, review each file's findings, and export a report.
- [Troubleshoot](how-to/troubleshoot.md) — symptoms and what to check.
- [Build and load the tool from source](how-to/build-and-load-from-source.md) — developer setup, build, release gate, and loading the tool in PPTB.

## Reference

Information-oriented descriptions of the machinery.

- [Recipes](reference/recipes.md) — the ten recipes, the HTTP-method map, and the files each starter exports.
- [Server Objects](reference/server-objects.md) — the `Server.*` object and member catalogue.
- [Readiness and checks](reference/readiness-and-checks.md) — the Starter readiness indicators and the Inspector findings and statuses.

## Explanation

Understanding-oriented background.

- [What is Power Pages server logic?](explanation/what-is-power-pages-server-logic.md) — the `Server.*` programming model and where the generated handlers fit in.
- [How readiness is determined](explanation/how-readiness-is-determined.md) — what the readiness counts and Inspector statuses do, and do not, guarantee.
- [Connections, permissions and sessions](explanation/connections-permissions-and-sessions.md) — how the tool uses PPTB connections and in-memory session state.