// S4 probe (throwaway, spec 001 Spike S4). Remove after the spike.
// Reports raw shapes only. Top-level helpers are deliberate: they test whether
// the runtime accepts non-handler top-level functions (review finding #2).

function describe(x) {
    var out = { typeof: typeof x };
    try {
        if (typeof x === "string") {
            out.length = x.length;
            var parsed = null;
            try { parsed = JSON.parse(x); } catch (e) { /* not JSON */ }
            out.jsonParsable = parsed !== null;
            if (parsed && typeof parsed === "object") {
                out.keys = Object.keys(parsed);
                out.statusCode = parsed.StatusCode;
                out.bodyType = typeof parsed.Body;
                out.headerKeys = parsed.Headers ? Object.keys(parsed.Headers) : null;
            } else {
                out.head = x.slice(0, 80);
            }
        } else if (x !== null && typeof x === "object") {
            out.keys = Object.keys(x);
            out.statusCode = x.StatusCode;
            out.isSuccess = x.IsSuccessStatusCode;
            out.serverError = x.ServerError;
            out.serverErrorMessage = x.ServerErrorMessage;
            out.bodyType = typeof x.Body;
            out.headerKeys = x.Headers ? Object.keys(x.Headers) : null;
            try { out.json = JSON.stringify(x).slice(0, 200); } catch (e) { out.json = "stringify failed"; }
        }
    } catch (e) {
        out.describeError = String(e && e.message);
    }
    return out;
}

function headersOf(x) {
    var h = null;
    if (typeof x === "string") { try { h = JSON.parse(x).Headers; } catch (e) { h = null; } }
    else if (x && typeof x === "object") { h = x.Headers; }
    return h || null;
}

function looksLikeGuid(v) {
    return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function probeDataverse() {
    var r = Server.Connector.Dataverse.RetrieveMultipleRecords("categories", "$select=categoryid&$top=1");
    return describe(r);
}

async function probeHttp() {
    var ua = { "User-Agent": "s4-probe", "Accept": "*/*" };
    var urls = [
        "https://api.github.com/zen",
        "https://api.github.com/",
        "https://www.example.com/",
        "https://example.com/",
        "https://jsonplaceholder.typicode.com/todos/1"
    ];
    var results = {};
    for (var i = 0; i < urls.length; i++) {
        try {
            var res = await Server.Connector.HttpClient.GetAsync(urls[i], ua);
            results[urls[i]] = describe(res);
        } catch (e) {
            results[urls[i]] = { threw: String(e && e.message) };
        }
    }
    return results;
}

function probeUser() {
    var u = Server.User;
    var out = { isNull: u === null, typeof: typeof u };
    if (u) {
        try { out.keys = Object.keys(u); } catch (e) { out.keys = "keys failed"; }
        // Arrow callback on purpose: the runtime validator rejects anonymous function expressions (RTSL01).
        ["fullname", "contactid", "parentcustomerid", "Roles"].forEach((k) => {
            var v;
            try { v = u[k]; } catch (e) { v = "read failed"; }
            out[k] = { typeof: typeof v, isGuid: looksLikeGuid(v), isArray: Array.isArray(v) };
        });
        if (looksLikeGuid(u.contactid)) {
            try {
                var c = Server.Connector.Dataverse.RetrieveRecord("contacts", u.contactid, "$select=_parentcustomerid_value");
                var body = typeof c === "string" ? JSON.parse(c).Body : c.Body;
                var rec = typeof body === "string" ? JSON.parse(body) : body;
                out.viaDataverse = { parentIsGuid: looksLikeGuid(rec && rec._parentcustomerid_value), raw: describe(c) };
            } catch (e) {
                out.viaDataverse = { threw: String(e && e.message) };
            }
        }
    }
    return out;
}

async function get() {
    try {
        Server.Logger.Log("s4-probe get");
        var which = Server.Context.QueryParameters["case"] || "all";
        var out = { fn: Server.Context.FunctionName, method: Server.Context.HttpMethod };
        if (which === "all" || which === "dv") out.dataverse = probeDataverse();
        if (which === "all" || which === "http") out.http = await probeHttp();
        if (which === "all" || which === "user") out.user = probeUser();
        return JSON.stringify(out);
    } catch (e) {
        Server.Logger.Error("s4-probe get failed");
        return JSON.stringify({ status: "error", message: String(e && e.message) });
    }
}

function post() {
    try {
        Server.Logger.Log("s4-probe post");
        var r = Server.Connector.Dataverse.CreateRecord("tasks", JSON.stringify({ subject: "S4 probe " + Server.Context.ActivityId }));
        var h = headersOf(r) || {};
        var id = h.entityid || h.entityId || h.EntityId || null;
        var out = {
            create: describe(r),
            entityidCasing: { entityid: "entityid" in h, entityId: "entityId" in h, EntityId: "EntityId" in h },
            idIsGuid: looksLikeGuid(id)
        };
        if (looksLikeGuid(id)) {
            try { out.cleanup = describe(Server.Connector.Dataverse.DeleteRecord("tasks", id)); }
            catch (e) { out.cleanup = { threw: String(e && e.message) }; }
        }
        return JSON.stringify(out);
    } catch (e) {
        Server.Logger.Error("s4-probe post failed");
        return JSON.stringify({ status: "error", message: String(e && e.message) });
    }
}

function liquidSync() {
    Server.Logger.Log("s4-probe liquidSync");
    return JSON.stringify({ kind: "sync", fn: Server.Context.FunctionName, input: Server.Context.Input || null });
}

async function liquidAsync() {
    Server.Logger.Log("s4-probe liquidAsync");
    var v = await Promise.resolve("awaited");
    return JSON.stringify({ kind: "async", fn: Server.Context.FunctionName, awaited: v });
}
