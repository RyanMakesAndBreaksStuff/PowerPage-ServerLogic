import { HostReadError } from './host.types';

/** A host call that is not a Dataverse read (theme, notify, copy, save, open, connection) failed or returned junk. */
export class HostCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HostCallError';
  }
}

/** True for any non-null object, arrays included. Callers narrow the members they read. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'NonError';
}

/**
 * No numeric status crosses Electron IPC, so a PPTB read failure reaches the tool as message text only:
 * `Error invoking remote method '<channel>': Error: Dataverse <op> failed: <detail>`. PPTB's
 * dataverseManager writes the detail as `<0x code>: <message>` when Dataverse sent an error body,
 * `HTTP <n>` when it did not, `Request failed: <reason>` when the request never got a response, or a
 * sign-in message when no token could be had. Each pattern only matches at the start of a `: ` segment.
 */
const SEGMENT = '(?:^|: )';
const DATAVERSE_CODE = new RegExp(`${SEGMENT}(0x[0-9a-f]{8}): `, 'i');
const HTTP_STATUS = new RegExp(`${SEGMENT}HTTP (\\d{3})\\b`);
const SIGN_IN = new RegExp(
  `${SEGMENT}(?:Authentication expired for connection |No access token found for |Token refresh failed for |Client secret authentication failed for )`,
);
const TRANSPORT = new RegExp(`${SEGMENT}Request failed: `);

/** Dataverse error codes that stand for an HTTP status (Learn: "Web service error codes", "Service protection API limits"). */
const DATAVERSE_CODE_STATUS: Readonly<Record<string, number>> = {
  '0x80040220': 403, // PrivilegeDenied
  '0x80040217': 404, // ObjectDoesNotExist
  '0x80060888': 404, // Resource not found for the segment
  '0x80072321': 429, // service protection: combined execution time
  '0x80072322': 429, // service protection: number of requests
  '0x80072326': 429, // service protection: concurrent requests
  '0x8005f103': 429, // Throttling
};

function messageOf(error: unknown): string {
  return isRecord(error) && typeof error.message === 'string' ? error.message : '';
}

function statusFromMessage(message: string): number | null {
  // A mapped code wins; an unmapped one falls through to the HTTP status and sign-in checks.
  const code = DATAVERSE_CODE.exec(message)?.[1];
  const mapped = code === undefined ? undefined : DATAVERSE_CODE_STATUS[code.toLowerCase()];
  if (mapped !== undefined) return mapped;
  const http = HTTP_STATUS.exec(message)?.[1];
  if (http !== undefined) return Number(http);
  return SIGN_IN.test(message) ? 401 : null;
}

/** A numeric `status` on the error (PPTB error-handling docs) wins; otherwise the status PPTB's message text names. */
function statusOf(error: unknown): number | null {
  if (!isRecord(error)) return null;
  const status = error.status;
  if (typeof status === 'number' && Number.isInteger(status)) return status;
  return statusFromMessage(messageOf(error));
}

/** Technical detail goes to the console by error name and status only: never a message, body, URL or token. */
export function logHostFailure(label: string, error: unknown): void {
  const status = statusOf(error);
  console.error(`PPTB host call failed: ${label}`, errorName(error), status ?? '');
}

export function messageForStatus(status: number | null): string {
  if (status === 401) return 'Authentication failed. Please reconnect.';
  if (status === 403) return "You don't have permission to read this data.";
  if (status === 404) return 'The requested data was not found.';
  if (status === 429) return 'Too many requests. Please wait and try again.';
  if (status !== null && status >= 500 && status <= 599)
    return 'The server had a problem. Please try again later.';
  return "Couldn't read data from Dataverse.";
}

export function isRetryable(status: number | null): boolean {
  return status === 429 || (status !== null && status >= 500 && status <= 599);
}

/** Maps anything a host read can throw to a HostReadError with a plain-language message and the status. */
export function toHostReadError(label: string, error: unknown): HostReadError {
  if (error instanceof HostReadError) return error;
  logHostFailure(label, error);
  const status = statusOf(error);
  // A confirmed transport loss (AC-7.10) is the platform's own network exception or PPTB's `Request failed:`,
  // which it raises only when the request got no response. Any other no-status failure stays local.
  const transport =
    (error instanceof DOMException && error.name === 'NetworkError') || TRANSPORT.test(messageOf(error));
  return new HostReadError(messageForStatus(status), status, transport);
}

/** Throws the standard cancellation error when the caller's signal is aborted. Not a HostReadError: never a finding. */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new DOMException('Scan cancelled.', 'AbortError');
}
