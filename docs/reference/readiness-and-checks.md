# Readiness and checks reference

The two readiness surfaces in the tool: the **Readiness** count in Logic Starter, and the per-file findings and statuses in Logic Inspector. Both are local, read-only assessments — neither checks your site's actual configuration nor proves a handler runs.

[Back to the user guide](../usage-manual.md) · [How readiness is determined (explanation)](../explanation/how-readiness-is-determined.md)

## Starter readiness indicators

The **Readiness** count in Logic Starter combines three indicators into a `N/3` score:

| Indicator | Meaning |
| --- | --- |
| **Browser checks** | No restricted-pattern hits or parse failure were found in the current handler. This is a code-pattern check against the current text, not compilation or a runtime test. Findings are labelled **Blocked** or **May be rejected**. |
| **Validation** | The starter provides generated validation scaffolding. This indicator stays complete and does not revalidate the edits you make to the business logic. |
| **Permissions** | You marked the permission checklist reviewed for the exact current handler text. The tool has not checked the site's actual configuration. |

Changing the handler text invalidates the **Permissions** acknowledgment unless the text again matches the reviewed version. A `3/3` count does not confirm authorization, deployment, or successful execution, and download remains available even when items need attention.

## Permission checklist

The checklist (expanded with **View checklist**) lists, per recipe, the web role, table permissions (with access type and, for Account scope, the relationship), allowed domains, site settings, and prerequisites. You mark it reviewed with **Mark checklist reviewed** and clear it with **Undo review**, and the acknowledgment applies to the exact handler text you reviewed.

## Inspector findings

Logic Inspector evaluates three checks per server logic file:

| Finding | Question it addresses |
| --- | --- |
| **Web role assigned** | Has a web role been assigned to the server logic? |
| **Table permissions** | Are table permissions linked to the grant set the handler needs? |
| **Outbound networking** | Are the external hosts the handler calls allowed? |

Each finding has one of these statuses:

| Status | Meaning |
| --- | --- |
| **Configured** | The check looks complete based on what the Inspector can see. |
| **Reviewed** | The finding was marked reviewed (and the mark not undone) in the current results. |
| **Needs review** | The finding has reasons that warrant your attention. |
| **Not scanned** | The evidence for this check was not read before the connection was lost. |

A finding that needs review can be marked as reviewed from its detail, and the mark can be undone. Review marks apply only to the current results and are cleared by scanning again.

## Inspector file statuses

Each file in the results list carries one of three statuses, derived from its findings:

| Status | Meaning |
| --- | --- |
| **Ready** | Every check is configured or reviewed; nothing needs review and nothing is incomplete. |
| **Needs review** | At least one finding needs review. |
| **Incomplete** | At least one check was not read (for example, the connection was lost before it was scanned). |

A file's **Readiness** ring counts how many of its three checks are addressed; configured and reviewed checks both count. A **Ready** file means the configuration the tool can see looks complete — it does not prove the handler works or that access is correct, and the Inspector does not read tenant outbound network policy, does not assess other roles a user may hold, and does not check cloud flows.

## Report export options

The Inspector's **Export report** writes either a single file or a site summary in Markdown or PDF:

| Option | Effect |
| --- | --- |
| **This file** | Export the selected file's findings. Requires a selected file. |
| **Site summary** | Export a summary across all scanned files, with per-file status and counts. |
| **Markdown / PDF** | Output format. |
| **Questions to consider** | Include the reflection prompts attached to findings. |
| **Configuration snapshot** | Include the captured configuration behind each finding. |
| **Redact environment and site names** | Mask the environment and site names in the output. |

File names follow `{name}-readiness.{md,pdf}` for a file report and `{site}-site-readiness.{md,pdf}` for a site summary. If the results change while a report is being built, the export is cancelled and can be restarted.