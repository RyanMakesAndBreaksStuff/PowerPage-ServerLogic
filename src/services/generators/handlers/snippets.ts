import type { GeneratedHandler, RecipeMeta } from '@/types/recipe';

/** Learn correction 11: normalise every connector result with this exact line. */
export const TO_RESULT = 'const toResult = r => typeof r === "string" ? JSON.parse(r) : r;';

/** FR-3 GUID, as regex source text. */
export const GUID_PATTERN = '^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$';

/** Emitted GUID check shared by R4 and R10. */
export const IS_GUID = `const isGuid = s => typeof s === "string" && /${GUID_PATTERN}/.test(s);`;

/** Top-level `message` of every validation failure; the spec fixes only the `errors` array. */
export const VALIDATION_MESSAGE = "The request isn't valid.";

type FieldError = { field: string; message: string };

/** One AC-3.7 difference from the Learn tutorial a recipe adapts. */
export type LearnDifference = { readonly change: string; readonly reason: string };

type LogLevel = 'Log' | 'Warn' | 'Error';

/**
 * The only values the FR-3 logging rule lets generated code log, besides a fixed operation name
 * and the name (never the value) of a missing site setting: StatusCode, ReasonPhrase, e.name
 * and Server.Context.ActivityId.
 */
export type LogField = 'status' | 'reason' | 'exception' | 'activity';

type LogLineInput = {
  level: LogLevel;
  /** A fixed operation name, emitted as a JSON string literal. */
  operation: string;
  fields?: readonly LogField[];
  /** Name of the connector-result variable in the emitted code. Default `r`. */
  result?: string;
  indent?: string;
};

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function identifier(value: string, what: string): string {
  if (!IDENTIFIER.test(value)) throw new Error(`Invalid ${what}: ${value}`);
  return value;
}

/**
 * Header comment for a generated handler (AC-3.3, AC-3.10): the recipe name, its Learn link when
 * it has one, and any extra sample link. Plain `//` lines with no parenthesis after a name,
 * so FR-4 finds nothing in them.
 */
export function headerComment(recipe: RecipeMeta): string {
  const lines = [`// ${recipe.id}: ${recipe.name}`];
  if (recipe.learnUrl !== null) lines.push(`// Learn: ${recipe.learnUrl}`);
  for (const url of recipe.extraUrls) lines.push(`// Sample package: ${url}`);
  return lines.join('\n');
}

/** `ExternalApi/BaseUrl` becomes `externalApiBaseUrl`; `CLIENT_ID` becomes `clientId`. */
export function settingVar(name: string): string {
  const parts = name.split(/[^A-Za-z0-9]+/).filter((p) => p !== '');
  const camel = parts
    .map((part, index) => {
      const word = part === part.toUpperCase() ? part.toLowerCase() : part;
      const first = index === 0 ? word.charAt(0).toLowerCase() : word.charAt(0).toUpperCase();
      return first + word.slice(1);
    })
    .join('');
  return identifier(camel, 'site setting variable');
}

/** `return JSON.stringify({ status: "error", message })` with a fixed message (FR-3 return shape). */
export function failureReturn(message: string, indent = ''): string {
  return `${indent}return JSON.stringify({ status: "error", message: ${JSON.stringify(message)} });`;
}

/** `{ field, message }` with both strings passed through JSON.stringify. */
export function fieldErrorLiteral(field: string, message: string): string {
  return `{ field: ${JSON.stringify(field)}, message: ${JSON.stringify(message)} }`;
}

/** Failure object plus `errors: [{ field, message }]`, for errors known when the code is generated. */
export function validationFailureReturn(errors: readonly FieldError[], indent = ''): string {
  const list = errors.map((e) => fieldErrorLiteral(e.field, e.message)).join(', ');
  return `${indent}return JSON.stringify({ status: "error", message: ${JSON.stringify(VALIDATION_MESSAGE)}, errors: [${list}] });`;
}

/** Same shape, for an `errors` array the emitted code builds at run time. */
export function validationFailureReturnFor(errorsVar: string, indent = ''): string {
  const name = identifier(errorsVar, 'errors variable');
  return `${indent}return JSON.stringify({ status: "error", message: ${JSON.stringify(VALIDATION_MESSAGE)}, errors: ${name} });`;
}

/** One `Server.Logger.<level>(...)` call that logs only what the FR-3 logging rule allows. */
export function logLine(i: LogLineInput): string {
  const result = identifier(i.result ?? 'r', 'result variable');
  const expression: Record<LogField, string> = {
    status: `${result}.StatusCode`,
    reason: `${result}.ReasonPhrase`,
    exception: 'e.name',
    activity: 'Server.Context.ActivityId',
  };
  const parts = [JSON.stringify(i.operation), ...(i.fields ?? []).map((f) => expression[f])];
  return `${i.indent ?? ''}Server.Logger.${i.level}(${parts.join(' + " " + ')});`;
}

/**
 * FR-3 missing-setting Must (F57): read each setting, and if it is missing or empty log the
 * name only and return the fixed failure, before any outbound call.
 */
export function requireSettingsCode(names: readonly string[], indent: string): string {
  const seen = new Set<string>();
  return names
    .map((name) => {
      const variable = settingVar(name);
      if (seen.has(variable)) throw new Error(`Site settings share the variable name ${variable}`);
      seen.add(variable);
      return [
        `${indent}const ${variable} = Server.SiteSetting.Get(${JSON.stringify(name)});`,
        `${indent}if (!${variable}) {`,
        `${indent}  Server.Logger.Error(${JSON.stringify(`Missing site setting ${name}`)});`,
        failureReturn(`Server logic isn't configured: missing site setting ${name}`, `${indent}  `),
        `${indent}}`,
      ].join('\n');
    })
    .join('\n');
}

/** 1-based numbers of every line in `text` that passes `test`. */
export function lineNumbersMatching(text: string, test: (line: string) => boolean): number[] {
  return text.split('\n').flatMap((line, index) => (test(line) ? [index + 1] : []));
}

/** The handler with its first line equal to `line` highlighted; throws when there is none. */
export function singleHighlight(id: string, text: string, line: string): GeneratedHandler {
  const [first] = lineNumbersMatching(text, (row) => row === line);
  if (first === undefined) throw new Error(`${id} highlight line missing`);
  return { text, highlightLines: [first] };
}
