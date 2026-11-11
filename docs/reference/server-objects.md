# Server Objects reference

The `Server.*` object model surfaced by Power Pages server logic. This page summarises the curated catalogue that ships with **Server Objects**; the catalogue in the app is authoritative and this page may lag behind it. Use the app's search to copy or insert samples.

Each member's return information, execution context, and timing shown here match what the app displays. Members whose return information is **Not documented on Learn** appear here without a return type.

[Back to the user guide](../usage-manual.md) · [Recipes reference](recipes.md)

## Server.Logger

Writes diagnostic messages that you can view in the DevTools extension.

| Member | Signature | Notes |
| --- | --- | --- |
| `Log` | `Log(message)` | Writes an information message. |
| `Warn` | `Warn(message)` | Writes a warning message. |
| `Error` | `Error(message)` | Writes an error message. |

## Server.Context

The current server logic invocation. Which properties exist depends on whether the handler was called over HTTP or from Liquid.

| Member | Kind | Context | Description |
| --- | --- | --- | --- |
| `ActivityId` | property | both | Unique identifier of the invocation, for correlating logs. |
| `Body` | property | HTTP | Raw HTTP request body. |
| `FunctionName` | property | both | Name of the function being invoked; from Liquid, the tag's operation. |
| `Headers` | property | HTTP | HTTP request headers. |
| `HttpMethod` | property | HTTP | HTTP request method, such as GET or POST. |
| `Input` | property | Liquid | Input string from the `serverlogic` Liquid tag's input parameter. Parse structured input as JSON. |
| `QueryParameters` | property | HTTP | Query-string parameters of the HTTP request. |
| `ServerLogicName` | property | both | Name of the server logic record being invoked. |
| `Url` | property | HTTP | Full URL of the HTTP request. |

## Server.User

The signed-in user. `Server.User` is `null` when the caller is anonymous.

| Member | Kind | Description |
| --- | --- | --- |
| `fullname` | property | Full name of the signed-in user's contact. |

## Server.Connector.Dataverse

Creates, reads, updates, and deletes Dataverse rows and invokes custom APIs. Tables are named by entity set name, for example `accounts`. Methods are synchronous and return the connector result `{ StatusCode, Body, IsSuccessStatusCode, ReasonPhrase, ServerError, ServerErrorMessage, Headers }`, where `Body` is a JSON string.

| Member | Signature |
| --- | --- |
| `CreateRecord` | `CreateRecord(entitySetName, payload)` |
| `RetrieveRecord` | `RetrieveRecord(entitySetName, id)` · `RetrieveRecord(entitySetName, id, options)` · `RetrieveRecord(entitySetName, id, options, skipCache)` |
| `RetrieveMultipleRecords` | `RetrieveMultipleRecords(entitySetName)` · `RetrieveMultipleRecords(entitySetName, options)` · `RetrieveMultipleRecords(entitySetName, options, skipCache)` |
| `UpdateRecord` | `UpdateRecord(entitySetName, id, payload)` |
| `DeleteRecord` | `DeleteRecord(entitySetName, id)` |
| `InvokeCustomApi` | `InvokeCustomApi(httpMethod, url)` · `InvokeCustomApi(httpMethod, url, payload)` |

`CreateRecord` and `UpdateRecord` take a JSON-string payload; `RetrieveRecord` and `RetrieveMultipleRecords` accept OData query options; `InvokeCustomApi` invokes a bound function, bound action, or unbound action.

## Server.Connector.HttpClient

Sends HTTP requests to allowed external hosts. Request bodies support `application/json`, `text/html`, and `application/x-www-form-urlencoded`. Methods are synchronous and return the connector result as above.

| Member | Signature |
| --- | --- |
| `GetAsync` | `GetAsync(url, headers)` |
| `PostAsync` | `PostAsync(url, body, headers, "application/json")` |
| `PutAsync` | `PutAsync(url, body, headers, "application/json")` |
| `PatchAsync` | `PatchAsync(url, body, headers, "application/json")` |
| `DeleteAsync` | `DeleteAsync(url, headers)` |

## Server.Connector.CloudFlow

Triggers a Power Automate cloud flow that's added to the site. The caller must hold one of the flow's web roles.

| Member | Signature | Notes |
| --- | --- | --- |
| `TriggerAsync` | `TriggerAsync(flowId)` · `TriggerAsync(flowId, payload)` | Asynchronous. Returns the connector result without `Headers`; `Body` is a JSON string. The payload is optional and keyed by the trigger's parameter names. |

## Server.Website

The current website record in Dataverse.

| Member | Kind | Description |
| --- | --- | --- |
| `adx_primarydomain` | property | The site's primary domain. |

## Server.SiteSetting

Reads site setting values for the current website. Do not put secrets in code: keep them in Azure Key Vault and reference them through a site setting.

| Member | Signature | Description |
| --- | --- | --- |
| `Get` | `Get(name)` | Reads one site setting by name. |

## Server.EnvironmentVariable

Reads the value of an environment variable.

| Member | Signature | Description |
| --- | --- | --- |
| `get` | `get(schemaName)` | Reads one environment variable by schema name. |

## Connectors vs. objects

The catalogue labels an entry **Connector** when its path begins `Server.Connector.*` and **Object** otherwise. Connectors are the `Server.Connector.Dataverse`, `Server.Connector.HttpClient`, and `Server.Connector.CloudFlow` entries above.