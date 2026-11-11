import { HostReadError } from './host.types';
import type { ODataQuery } from './host.types';
import { isRecord, isRetryable, throwIfAborted, toHostReadError } from './hostErrors';

/** One host read: `path` is a relative OData path such as `powerpagecomponents?$select=name`. */
export type RawRead = (path: string, headers: Readonly<Record<string, string>>) => Promise<unknown>;
export type Sleep = (ms: number) => Promise<void>;
export type ReadDeps = { read: RawRead; sleep: Sleep };

/** Waits before retry 1, 2 and 3 of a read that failed with 429 or 5xx (FR-7). */
export const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

/**
 * Spike S2 gate (RG-001). Off: the live `@odata.nextLink` wire check passed on 2026-11-10, so a full page with no link is the
 * last page. Passing `strict: true` still reports such a page as possibly incomplete instead of accepting it.
 */
export const NEXT_LINK_UNVERIFIED = false;

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const UNSAFE_CLAUSE = /[&#\p{Cc}]/u;
const API_PATH = /\/api\/data\/v\d+(?:\.\d+)?\/(.+)$/;
const MAX_PAGE_SIZE = 5000;

function invalid(what: string): HostReadError {
  return new HostReadError(`Invalid query: ${what}.`, null);
}

/** Validates the query and builds its first relative path. Dataverse pages come from `Prefer: odata.maxpagesize`. */
export function buildQueryPath(q: ODataQuery): string {
  if (!NAME.test(q.entitySet)) throw invalid('entity set name');
  if (q.select.length === 0 || !q.select.every((column) => NAME.test(column)))
    throw invalid('select columns');
  if (!Number.isInteger(q.pageSize) || q.pageSize < 1 || q.pageSize > MAX_PAGE_SIZE)
    throw invalid('page size');
  const parts = [`$select=${q.select.join(',')}`];
  if (q.filter !== null) {
    if (UNSAFE_CLAUSE.test(q.filter)) throw invalid('filter');
    parts.push(`$filter=${q.filter}`);
  }
  if (q.orderBy !== null) {
    if (UNSAFE_CLAUSE.test(q.orderBy)) throw invalid('order by');
    parts.push(`$orderby=${q.orderBy}`);
  }
  return `${q.entitySet}?${parts.join('&')}`;
}

type Page = { rows: readonly unknown[]; nextLink: string | null };

function badShape(): HostReadError {
  return new HostReadError('Unexpected response from Dataverse.', null);
}

function parsePage(raw: unknown): Page {
  if (!isRecord(raw) || !Array.isArray(raw.value)) throw badShape();
  const link = raw['@odata.nextLink'];
  if (typeof link === 'string') return { rows: raw.value, nextLink: link === '' ? null : link };
  if (link === undefined || link === null) return { rows: raw.value, nextLink: null };
  // The rows of this page were received; keep them as partial evidence.
  throw new HostReadError('Unexpected paging link from Dataverse.', null, false, raw.value);
}

/** `@odata.nextLink` is absolute. Only its path after `/api/data/vX.Y/` goes back to the host, on the same table. */
function relativeNextLink(link: string, entitySet: string): string {
  const rest = API_PATH.exec(link)?.[1];
  if (rest?.startsWith(`${entitySet}?`) !== true) {
    throw new HostReadError('Unexpected paging link from Dataverse.', null);
  }
  return rest;
}

/**
 * Runs `op`, retrying a 429 or 5xx failure after 1 s, 2 s and 4 s. Any failure leaves as a HostReadError.
 * Cancellation is checked before each attempt, after each response and after each wait; the wait itself is not
 * interrupted, so a cancel during a retry can take up to 4 s to surface. A host error named AbortError with an
 * un-aborted signal is an ordinary failure.
 */
export async function withRetry<T>(
  label: string,
  op: () => Promise<T>,
  sleep: Sleep,
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    throwIfAborted(signal);
    try {
      const value = await op();
      throwIfAborted(signal);
      return value;
    } catch (error) {
      throwIfAborted(signal);
      const failure = toHostReadError(label, error);
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isRetryable(failure.status)) throw failure;
      await sleep(delay);
    }
  }
}

/**
 * The one paging strategy. Reads page after page until no link is left. `strict` is NEXT_LINK_UNVERIFIED:
 * when set, a full page that has no link fails closed rather than passing as complete. Any failure after the
 * first page carries every row received so far in `partialRows` (WR-003). A repeated link is a loop and stops.
 */
export async function fetchAllPages(
  readPage: (path: string) => Promise<Page>,
  q: ODataQuery,
  strict: boolean,
  signal?: AbortSignal,
): Promise<readonly unknown[]> {
  const rows: unknown[] = [];
  let path: string | null = buildQueryPath(q);
  const seen = new Set<string>();
  try {
    while (path !== null) {
      throwIfAborted(signal);
      if (seen.has(path)) throw new HostReadError('Dataverse repeated a paging link.', null);
      seen.add(path);
      const page = await readPage(path);
      throwIfAborted(signal);
      for (const row of page.rows) rows.push(row);
      if (page.nextLink !== null) {
        path = relativeNextLink(page.nextLink, q.entitySet);
      } else if (strict && page.rows.length >= q.pageSize) {
        throw new HostReadError(
          'Dataverse returned a full page with no paging link, so the result may be incomplete.',
          null,
        );
      } else {
        path = null;
      }
    }
  } catch (error) {
    throwIfAborted(signal);
    const failure = toHostReadError('queryData', error);
    throw new HostReadError(failure.message, failure.status, failure.transport, [
      ...rows,
      ...failure.partialRows,
    ]);
  }
  return rows;
}

export function queryAllRows(
  q: ODataQuery,
  deps: ReadDeps,
  strict: boolean = NEXT_LINK_UNVERIFIED,
  signal?: AbortSignal,
): Promise<readonly unknown[]> {
  const headers = { Prefer: `odata.maxpagesize=${String(q.pageSize)}` };
  return fetchAllPages(
    (path) =>
      withRetry('queryData', async () => parsePage(await deps.read(path, headers)), deps.sleep, signal),
    q,
    strict,
    signal,
  );
}
