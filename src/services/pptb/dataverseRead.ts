import { HostReadError } from './host.types';
import type { ODataQuery } from './host.types';
import { isRecord, isRetryable, toHostReadError } from './hostErrors';

/** One host read: `path` is a relative OData path such as `powerpagecomponents?$select=name`. */
export type RawRead = (path: string, headers: Readonly<Record<string, string>>) => Promise<unknown>;
export type Sleep = (ms: number) => Promise<void>;
export type ReadDeps = { read: RawRead; sleep: Sleep };

/** Waits before retry 1, 2 and 3 of a read that failed with 429 or 5xx (FR-7). */
export const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

/**
 * Spike S2 gate. PPTB documents only `value` on a `queryData` result, so until S2 shows that
 * `@odata.nextLink` comes through, a full page with no link is reported as possibly incomplete instead of
 * being accepted as the last page. Phase 12 sets this to false once S2 confirms the link, or replaces
 * `fetchAllPages` with FetchXML paging-cookie paging if it does not.
 */
export const NEXT_LINK_UNVERIFIED = true;

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNSAFE_CLAUSE = /[&#\p{Cc}]/u;
const API_PATH = /\/api\/data\/v\d+(?:\.\d+)?\/(.+)$/;
const MAX_PAGE_SIZE = 5000;
const MAX_PAGES = 1000;

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
  throw badShape();
}

/** `@odata.nextLink` is absolute. Only its path after `/api/data/vX.Y/` goes back to the host, on the same table. */
function relativeNextLink(link: string, entitySet: string): string {
  const rest = API_PATH.exec(link)?.[1];
  if (rest?.startsWith(`${entitySet}?`) !== true) {
    throw new HostReadError('Unexpected paging link from Dataverse.', null);
  }
  return rest;
}

/** Runs `op`, retrying a 429 or 5xx failure after 1 s, 2 s and 4 s. Any failure leaves as a HostReadError. */
export async function withRetry<T>(label: string, op: () => Promise<T>, sleep: Sleep): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await op();
    } catch (error) {
      const failure = toHostReadError(label, error);
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isRetryable(failure.status)) throw failure;
      await sleep(delay);
    }
  }
}

/**
 * The one paging strategy. Reads page after page until no link is left. `strict` is NEXT_LINK_UNVERIFIED:
 * when set, a full page that has no link fails closed rather than passing as complete.
 */
export async function fetchAllPages(
  readPage: (path: string) => Promise<Page>,
  q: ODataQuery,
  strict: boolean,
): Promise<readonly unknown[]> {
  const rows: unknown[] = [];
  let path: string | null = buildQueryPath(q);
  for (let pages = 0; path !== null; pages += 1) {
    if (pages >= MAX_PAGES) throw new HostReadError('Dataverse returned too many pages.', null);
    const page = await readPage(path);
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
  return rows;
}

export function queryAllRows(
  q: ODataQuery,
  deps: ReadDeps,
  strict: boolean = NEXT_LINK_UNVERIFIED,
): Promise<readonly unknown[]> {
  const headers = { Prefer: `odata.maxpagesize=${String(q.pageSize)}` };
  return fetchAllPages(
    (path) =>
      withRetry('queryData', async () => parsePage(await deps.read(path, headers)), deps.sleep),
    q,
    strict,
  );
}

/**
 * Reads a File column's content with `queryData('<set>(<id>)/<column>/$value')`. PPTB documents no file-download
 * call, so this is the generic call; Spike S2 confirms it, and what shape the content comes back in.
 */
export async function downloadColumnContent(
  entitySet: string,
  id: string,
  column: string,
  deps: ReadDeps,
): Promise<string> {
  if (!NAME.test(entitySet) || !GUID.test(id) || !NAME.test(column))
    throw invalid('file column reference');
  const path = `${entitySet}(${id})/${column}/$value`;
  const raw = await withRetry('queryData', () => deps.read(path, {}), deps.sleep);
  if (typeof raw === 'string') return raw;
  if (isRecord(raw) && typeof raw.value === 'string') return raw.value;
  throw new HostReadError('Unexpected file response from Dataverse.', null);
}
