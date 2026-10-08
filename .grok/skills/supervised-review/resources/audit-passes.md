# Audit Passes — Stack-Agnostic Checklists

Each pass has specific patterns and manual checks. Run them systematically across whatever stack the codebase uses. Examples below show TypeScript, C#, Python, and Go variants where relevant — adapt to your stack.

Use ripgrep (`rg`) where available, plain `grep -r` otherwise. Substitute file extensions for the project's language(s):
- TS/JS: `--include='*.ts' --include='*.tsx' --include='*.js'`
- C#: `--include='*.cs'`
- Python: `--include='*.py'`
- Go: `--include='*.go'`
- Java/Kotlin: `--include='*.java' --include='*.kt'`
- Rust: `--include='*.rs'`

---

## Pass 1: WIRING — Is everything connected end-to-end?

The #1 cause of "it looks done but doesn't work" bugs. Every function needs a caller; every event needs a handler; every UI element needs behavior behind it.

### Automated Checks

List exported / public symbols, then verify each is referenced elsewhere.

```bash
# TS/JS
rg -n "^export (async )?function (\w+)" --type=ts --type=tsx
rg -n "^export const (\w+)" --type=ts --type=tsx

# C#
rg -n "public (static )?\w+ \w+\(" --type=cs

# Python
rg -n "^def (\w+)" --type=py
rg -n "^class (\w+)" --type=py

# Go
rg -n "^func (\w+)\(" --type=go      # capital-first → exported
```

For each exported symbol, check it appears in an import/usage site outside its own file. Zero external refs → potential finding.

### Manual Checks

- [ ] Service → Caller: every service/API function is called by an upstream layer.
- [ ] Store/State → UI: every state action is triggered by a UI event or lifecycle hook.
- [ ] UI → Handler: every interactive element has a real handler (not empty / log-only).
- [ ] Event → Effect: every event handler actually does something.
- [ ] Async → Await/Handler: no fire-and-forget promises without a stated reason.
- [ ] Callback → Registration: every callback is registered with its event source.
- [ ] Route → Page/Controller: every route maps to a real target.
- [ ] Type/Interface → Usage: every public type is referenced somewhere.
- [ ] DB migration → Code path: every migration column has a producing/consuming code path.

---

## Pass 2: ERROR HANDLING — Can failures be seen and debugged?

Silent failures are worse than crashes.

### Automated Checks

```bash
# Empty catches
rg -n -A2 "catch\s*\(?[^)]*\)?\s*\{" --type=ts --type=tsx --type=cs --type=java
rg -n -A2 "except[^:]*:" --type=py

# Catches that silently return
rg -n -A3 "catch" --type=ts --type=tsx --type=cs

# Promises without .catch()
rg -n "\.then\(" --type=ts --type=tsx
```

### Manual Checks

- [ ] Network/API calls: errors surface to user, not just logged.
- [ ] Form submission: validation errors are shown.
- [ ] File I/O: missing-file and permission errors are handled.
- [ ] Parse operations: JSON.parse, int parsing, etc. have fallbacks.
- [ ] User feedback: errors produce visible feedback (toast, alert, error UI state).
- [ ] Error boundaries / global handlers: exist around major sections.
- [ ] Loading states: async operations show progress.
- [ ] Retry logic: transient failures retry or message clearly.
- [ ] Server-side: structured error responses, not stack traces leaked to clients.

### Severity quick reference

| Pattern | Severity |
|---|---|
| Empty catch | CRITICAL |
| Catch returns null with no log | CRITICAL |
| Catch logs but no user feedback | WARNING |
| Missing error boundary | WARNING |
| No loading state | WARNING |
| Log-only with no diagnostic value | INFO |

---

## Pass 3: COMPLETENESS — Are features fully implemented?

### Automated Checks

```bash
# TODO markers
rg -n "TODO|FIXME|HACK|XXX|TEMP|PLACEHOLDER|NotImplemented"

# Stub bodies (varies by language)
# TS/JS: arrow funcs returning nothing
rg -n "=>\s*\{\s*\}|=>\s*null;|=>\s*undefined;"
# C#: throw new NotImplementedException
rg -n "throw new NotImplementedException" --type=cs
# Python: pass-only function body
rg -n "def \w+[^:]*:\s*$\n\s*pass" --type=py --multiline

# Commented-out code blocks (actual code, not docs)
rg -n "^\s*//\s*(import|const|let|var|function|class|if|for|while|return|export|public|private)" --type=ts --type=cs
rg -n "^\s*#\s*(import|def|class|if|for|while|return)" --type=py

# Stray debug logging
rg -n "console\.(log|debug)" --type=ts --type=tsx
rg -n "Console\.WriteLine|Debug\.WriteLine" --type=cs
rg -n "print\(|pprint\(" --type=py
rg -n "fmt\.Println" --type=go
```

### Manual Checks

- [ ] Every UI element does something real.
- [ ] Every config option is respected.
- [ ] CRUD round-trips work (create → read → update → delete).
- [ ] Edge cases: empty states, long text, zero values, null/undefined.
- [ ] Input validation: required fields enforced, types checked, ranges bounded.
- [ ] Feature flags: any flag/config has both code paths.

### Red flags

- Function body is `{ return; }`, `{ /* TODO */ }`, `pass`, or `throw NotImplementedException`.
- UI conditionally renders nothing with no fallback or empty state.
- Switch/match with default that silently drops cases.

---

## Pass 4: DEAD CODE — What can be deleted right now?

### Automated Checks

```bash
# Unused locals/parameters (TypeScript)
npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1

# Unused dependencies
# JS:   npx depcheck
# C#:   dotnet list package --include-transitive (manual cross-check)
# Py:   pip-autoremove --list or unimport / pyflakes
# Go:   go mod tidy --diff

# Files never imported (heuristic: filename → ref count)
# Pseudocode: for each source file, grep its basename across the project
```

### Manual Checks

- [ ] Exported but never imported: function/type/constant defined and exported with zero import sites.
- [ ] Imported but never used.
- [ ] Old migration/setup scripts that already ran.
- [ ] Commented-out code (actual code, not annotation comments).
- [ ] Duplicate type/interface/struct definitions for the same shape.
- [ ] Debug logging left in.
- [ ] Test data / seed helpers shipped to production.

---

## Pass 5: BLOAT — What's too big, too complex, or redundant?

### Thresholds

| Metric | Threshold | Action |
|---|---|---|
| File length | > 300 lines | Consider splitting by responsibility |
| Function length | > 50 lines | Extract helpers or simplify |
| Component / class length | > 200 lines | Extract sub-components / split responsibilities |
| Nesting depth | > 4 levels | Flatten with early returns or extract |
| Parameter count | > 5 params | Use an options object / parameter struct |
| Import count | > 15 imports | File is doing too much |
| Switch / match cases | > 8 cases | Consider lookup table or dispatcher |
| Ternary chains | > 2 nested | Use if/else or extracted function |

### Checks

- [ ] God files: 3+ unrelated responsibilities in one file.
- [ ] Copy-paste logic: near-identical code blocks in multiple files.
- [ ] Wrapper-only abstractions: components/functions that just delegate.
- [ ] Over-abstraction: helpers called exactly once (inline them).
- [ ] Config-as-constants: complex config objects for values that never change.
- [ ] Derived-state-as-stored-state: state that should be computed.
- [ ] Redundant null/undefined checks on values that can't be null.

### Pruning decision

For each candidate: "If I delete this, what breaks?"
- Nothing breaks → safe to delete.
- Tests break → the code is used; keep.
- Only other dead code breaks → delete the chain.

---

## Pass 6: HARDCODING — What should be configurable but isn't?

### Checks

```bash
# Hardcoded URLs
rg -n "https?://"

# Secrets-shaped strings
rg -n -i "api[_-]?key|secret|password|token|connection[_-]?string|bearer\s"

# Magic numbers (3+ digit literals not in tests)
rg -n "[^0-9][0-9]{3,}[^0-9]"

# Timers / intervals
rg -n "setTimeout|setInterval"
rg -n "Thread\.Sleep|Task\.Delay" --type=cs
rg -n "time\.Sleep" --type=go
```

### Manual Checks

- [ ] Environment URLs: come from config / env vars.
- [ ] Numeric codes (option sets, status enums): named constants.
- [ ] Feature toggles: config-driven.
- [ ] Timeouts / durations: named constants or config.
- [ ] User-facing strings: in a central catalog if i18n exists.
- [ ] Secrets: NEVER in source. Use secret manager / env / vault.

---

## Pass 7: SECURITY — Any obvious vulnerabilities?

Not a full pentest — low-hanging fruit only.

### Checks

```bash
# eval / dynamic code execution
rg -n "\beval\(|new Function\(" --type=ts --type=tsx --type=js
rg -n "Activator\.CreateInstance|CSharpCodeProvider" --type=cs
rg -n "exec\(|compile\(.*exec" --type=py

# innerHTML / unsafe HTML injection
rg -n "innerHTML|dangerouslySetInnerHTML|outerHTML" --type=ts --type=tsx
rg -n "Html\.Raw\(" --type=cs

# Query injection (string interpolation in queries)
rg -n "filter=.*\$\{" --type=ts --type=tsx
rg -n "SELECT .*\+\s*\w+|WHERE .*\+\s*\w+" --type=cs --type=java
rg -n "f\".*SELECT.*\{|f\".*WHERE.*\{" --type=py

# Secrets in code
rg -n -i "Bearer\s+[A-Za-z0-9]|Authorization:\s+[A-Za-z0-9]"
```

### Manual Checks

- [ ] Input sanitization at every boundary (user input → query / shell / eval / HTML / file path).
- [ ] AuthN: protected operations verify the caller.
- [ ] AuthZ: users can only access their own data.
- [ ] CORS: only expected origins allowed.
- [ ] Sensitive data: not logged, not displayed, not returned in error messages.
- [ ] Dependency audit: `npm audit`, `dotnet list package --vulnerable`, `pip-audit`, `govulncheck` show no critical/high.
- [ ] Path traversal: file paths derived from user input are validated.
- [ ] Open redirects: redirect targets are whitelisted.
