# Troubleshoot

Symptoms and what to check when the tool does not behave as you expect.

[Back to the user guide](../usage-manual.md)

| Symptom | What to check |
| --- | --- |
| A method is disabled | The recipe must export its matching handler function. **Invoke from Liquid** is not callable over HTTP. |
| Liquid becomes unavailable | The recipe or edited handler uses HTTP-only request properties. Choose an enabled client language or adapt the handler for Liquid. |
| Browser checks show a finding | Inspect the reported line and replace browser-only or restricted constructs with supported server APIs. Fix parse errors before relying on the checks. |
| Validation stays complete after editing | This is expected: generated validation is counted, while your edits are not revalidated by that indicator. |
| Permission review needs attention again | Review applies to the exact handler text you acknowledged. Recheck requirements after changing the code. |
| Insert into handler is unavailable | Read the displayed reason. Restore a parseable handler, choose a valid target function and statement boundary, or copy the sample for manual insertion. |
| Search returns no objects | Clear the search and choose the all-objects filter. The used filter only lists objects recognized in the current handler. |
| Copy or download fails in a browser preview | Open the tool in PPTB Desktop; those actions use host APIs. |
| A downloaded handler fails on the site | Confirm the exact slug, selected method, request contract, caller role, and all recipe-specific configuration in the exported README and checklist. Local readiness does not test the site. |
| An external call fails | Review outbound domains, the service configuration and credentials, and tenant restrictions on external server-logic calls. Use the package's troubleshooting guidance for the selected recipe. |

For developer issues such as a build that will not start, a page-selection error, or a stale build in PPTB, see the build guide's [troubleshooting table](build-and-load-from-source.md#troubleshooting).