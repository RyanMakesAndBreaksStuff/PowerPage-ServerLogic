# Troubleshoot

Symptoms and what to check when the tool does not behave as you expect.

[Back to the user guide](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/docs/usage-manual.md)

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
| Logic Inspector reads **No active connection** | Select one connection in PPTB. The Inspector needs an active connection to read sites. |
| Logic Inspector reads **Couldn't read the active connection** | PPTB did not return the active connection. Choose **Retry**. The page also tries again when the window regains focus or the connection changes. |
| Logic Inspector reads **Couldn't load sites** | Read the message under the title, which says why the site list could not be read, then choose **Retry**. Until the sites load, the site picker in the title bar is disabled with "Couldn't load sites. Open Logic Inspector to retry." |
| Logic Inspector reads "No enhanced data model Power Pages sites found in this environment. Standard data model sites aren't supported." | The environment has no enhanced data model site. Select a connection to an environment that has one. |
| Logic Inspector reads **The connection changed while scanning** | The PPTB connection changed during the scan, so its results were discarded. Choose a site in the title bar to scan again. |
| Logic Inspector reads **Couldn't scan {site}** | The scan stopped on an unexpected error and kept nothing. Choose **Scan again**. |
| **Export report** is disabled with "Nothing to export: no server logic files were found." | The scan read the whole record list and the site has no server logic files. Add server logic to the site, then choose **Scan again**. |
| **Export report** is disabled with "Nothing to export: no server logic records were read." | The scan did not read any server logic records. Read the notices above the results, check the connection, then choose **Scan again**. |
| **Export report** is disabled with "Nothing to export: no sites were found." | The environment has no enhanced data model site, so there is nothing to scan or export. |
| **Export report** is disabled with "An export is still in progress." | A report you started is still being built or waiting in the PPTB save dialog, even if you closed the export dialog. Let it finish, or cancel the save dialog, then export again. |
| **This file** is disabled with "Select a file first" | Close the dialog, select a file in **Server logic**, and export again, or choose **Site summary**. |

For developer issues such as a build that will not start, a page-selection error, or a stale build in PPTB, see the build guide's [troubleshooting table](https://github.com/RyanMakesAndBreaksStuff/PowerPage-ServerLogic/blob/main/docs/how-to/build-and-load-from-source.md#troubleshooting).