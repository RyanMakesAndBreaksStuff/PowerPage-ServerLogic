import { parse, tokenizer, tokTypes } from 'acorn';
import type { BrowserCheckResult, CheckHit, CheckSeverity } from './codeAnalysis.types';

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** `name`, optional whitespace, then `(`: the runtime's form for every pattern ending in `(`. */
const call = (name: string): RegExp => new RegExp(`${name}\\s*\\(`, 'i');
/** The pattern's literal text, with `.` matched literally. */
const literal = (text: string): RegExp => new RegExp(escapeRegExp(text), 'i');

/** How far past each `import` the `import from` scan looks for `from`. */
const IMPORT_WINDOW = 2000;

/**
 * Offsets of every whole-word `import` followed by a whole-word `from` before the next `;`, both ignoring case.
 * A scan, not one regex: nested whitespace quantifiers backtrack super-linearly on long blank runs.
 * The bound guarantees each `import` costs at most IMPORT_WINDOW characters of work, so the scan is linear in
 * the code length; a `from` further away than that is missed (raise the window if real import lists are longer).
 */
function importFromOffsets(code: string): number[] {
  const offsets: number[] = [];
  for (const m of code.matchAll(/\bimport\b/gi)) {
    const start = m.index + 'import'.length;
    const window = code.slice(start, start + IMPORT_WINDOW);
    const semicolon = window.indexOf(';');
    const end = semicolon === -1 ? window.length : semicolon;
    // Four extra characters so `\b` sees the real character after a `from` that starts just before `end`.
    const from = /\bfrom\b/i.exec(code.slice(start, start + end + 4));
    if (from && from.index < end) offsets.push(m.index);
  }
  return offsets;
}

type RestrictedPattern =
  | { readonly label: string; readonly regex: RegExp }
  | { readonly label: string; readonly match: (code: string) => number[] };

/**
 * Learn's restricted list (FR-4 Must), as the runtime matches it (Spike S4): case-insensitive regexes over
 * the raw text, and one scan where a regex can't stay linear. Do not add the `g` flag here; the matcher
 * builds its own global copies.
 */
export const RESTRICTED_PATTERNS: readonly RestrictedPattern[] = [
  { label: '__dirname', regex: literal('__dirname') },
  { label: '__filename', regex: literal('__filename') },
  { label: 'import(', regex: call('import') },
  // `import`, then `from` as a word later in the same statement (no `;` in between).
  { label: 'import from', match: importFromOffsets },
  { label: 'eval(', regex: call('eval') },
  { label: 'Function(', regex: call('Function') },
  { label: 'setTimeout(', regex: call('setTimeout') },
  { label: 'setInterval(', regex: call('setInterval') },
  { label: 'setImmediate(', regex: call('setImmediate') },
  { label: 'process.exit', regex: literal('process.exit') },
  { label: 'process.kill', regex: literal('process.kill') },
  { label: 'child_process', regex: literal('child_process') },
  { label: 'fs.', regex: literal('fs.') },
  { label: 'require(', regex: call('require') },
  { label: 'constructor.constructor', regex: literal('constructor.constructor') },
  { label: 'this.constructor', regex: literal('this.constructor') },
  { label: 'arguments.callee', regex: literal('arguments.callee') },
  { label: 'with(', regex: call('with') },
  // `DeleteRecord(` must not match: `delete` needs whitespace and then a name character.
  { label: 'delete', regex: /delete\s+[a-zA-Z_$]/i },
  { label: 'Object.getPrototypeOf', regex: literal('Object.getPrototypeOf') },
  { label: 'Object.setPrototypeOf', regex: literal('Object.setPrototypeOf') },
  { label: 'Proxy(', regex: call('Proxy') },
  { label: 'Reflect.', regex: literal('Reflect.') },
  { label: 'Symbol.for', regex: literal('Symbol.for') },
  { label: '__proto__', regex: literal('__proto__') },
  { label: 'prototype', regex: literal('prototype') },
  { label: 'debugger', regex: literal('debugger') },
];

const BROWSER_APIS: readonly string[] = [
  'fetch',
  'XMLHttpRequest',
  'window',
  'document',
  'localStorage',
  'sessionStorage',
];
const IDENT_CHAR = '[A-Za-z0-9_$]';
const WHOLE_TOKEN = BROWSER_APIS.map(
  (name) => [name, new RegExp(`(?<!${IDENT_CHAR})${name}(?!${IDENT_CHAR})`, 'g')] as const,
);

type Found = { pattern: string; offset: number; severity: CheckSeverity };

/** Offsets at which each line starts. Line breaks are the ones acorn uses: CRLF, CR, LF, U+2028, U+2029. */
function lineStarts(code: string): number[] {
  const starts = [0];
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    if (c === 13 && code.charCodeAt(i + 1) === 10) i++;
    else if (c !== 10 && c !== 13 && c !== 0x2028 && c !== 0x2029) continue;
    starts.push(i + 1);
  }
  return starts;
}

/** 1-based line of an offset (binary search). */
function lineAt(starts: readonly number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] ?? 0) <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function restrictedHits(code: string): Found[] {
  const found: Found[] = [];
  for (const row of RESTRICTED_PATTERNS) {
    const label = row.label;
    if ('match' in row) {
      for (const offset of row.match(code)) {
        found.push({ pattern: label, offset, severity: 'blocked' });
      }
      continue;
    }
    const re = new RegExp(row.regex.source, 'gi');
    // No pattern matches the empty string, so the loop always advances.
    for (let m = re.exec(code); m; m = re.exec(code)) {
      found.push({ pattern: label, offset: m.index, severity: 'blocked' });
    }
  }
  return found;
}

/** Whole-token names inside one string, comment, regex or template chunk: every hit may be rejected. */
function textHits(code: string, start: number, end: number): Found[] {
  const text = code.slice(start, end);
  const found: Found[] = [];
  for (const [name, re] of WHOLE_TOKEN) {
    for (const m of text.matchAll(re)) {
      found.push({ pattern: name, offset: start + m.index, severity: 'may-be-rejected' });
    }
  }
  return found;
}

/** Classifies with acorn's tokenizer. Throws when the code can't be tokenized (the caller falls back). */
function tokenHits(code: string): Found[] {
  const found: Found[] = [];
  const regions: { start: number; end: number }[] = [];
  const tokens = tokenizer(code, {
    ecmaVersion: 2023,
    onComment: (_isBlock, _text, start, end) => regions.push({ start, end }),
  });
  for (const t of tokens) {
    if (t.type === tokTypes.name) {
      // shortcut: raw token text, so an identifier written with \u escapes isn't matched; upgrade if that matters.
      const name = code.slice(t.start, t.end);
      if (BROWSER_APIS.includes(name))
        found.push({ pattern: name, offset: t.start, severity: 'blocked' });
    } else if (
      t.type === tokTypes.string ||
      t.type === tokTypes.regexp ||
      t.type === tokTypes.template
    ) {
      regions.push({ start: t.start, end: t.end });
    }
  }
  for (const r of regions) found.push(...textHits(code, r.start, r.end));
  return found;
}

/** F23 fallback: raw, case-sensitive substring matching; every hit may be rejected. */
function substringHits(code: string): Found[] {
  const found: Found[] = [];
  for (const name of BROWSER_APIS) {
    for (let i = code.indexOf(name); i !== -1; i = code.indexOf(name, i + name.length)) {
      found.push({ pattern: name, offset: i, severity: 'may-be-rejected' });
    }
  }
  return found;
}

/** Only asks whether the code is valid ECMAScript 2023; the parse error carries no extra signal here. */
function parses(code: string): boolean {
  try {
    parse(code, { ecmaVersion: 2023, sourceType: 'script' });
    return true;
  } catch {
    return false;
  }
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function runBrowserChecks(code: string): BrowserCheckResult {
  let browser: Found[];
  let parseFailed: boolean;
  try {
    browser = tokenHits(code);
    parseFailed = !parses(code);
  } catch {
    // Tokenizing failed (unterminated string, template or regex, bad character): fall back, and never pass.
    browser = substringHits(code);
    parseFailed = true;
  }
  const starts = lineStarts(code);
  const unique = new Map<string, CheckHit>();
  for (const { pattern, offset, severity } of [...restrictedHits(code), ...browser]) {
    const line = lineAt(starts, offset);
    unique.set(`${pattern}|${String(line)}|${severity}`, { pattern, line, severity });
  }
  const hits = [...unique.values()].sort(
    (a, b) => a.line - b.line || compare(a.pattern, b.pattern) || compare(a.severity, b.severity),
  );
  return { hits, parseFailed };
}
