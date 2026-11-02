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

/** PPTB's error object carries a numeric `status` (error-handling docs); anything else reads as no status. */
export function statusOf(error: unknown): number | null {
  if (!isRecord(error)) return null;
  const status = error.status;
  return typeof status === 'number' && Number.isInteger(status) ? status : null;
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
  // Only the platform's own network exception is a confirmed transport loss. PPTB's IPC errors are
  // probably plain objects (live gate RG-002); a no-status failure stays local until S2 records a narrower shape.
  const transport = error instanceof DOMException && error.name === 'NetworkError';
  return new HostReadError(messageForStatus(status), status, transport);
}

/** Throws the standard cancellation error when the caller's signal is aborted. Not a HostReadError: never a finding. */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new DOMException('Scan cancelled.', 'AbortError');
}
