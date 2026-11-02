import { HostReadError } from './host.types';
import type { FileColumnRef } from './host.types';
import { isRecord, throwIfAborted } from './hostErrors';
import { withRetry } from './dataverseRead';
import type { Sleep } from './dataverseRead';

/** The only two actions the adapter ever executes (spec FR-7 4.1.0). Unbound: the record travels in `Target`. */
export type FileAction = {
  operationName: 'InitializeFileBlocksDownload' | 'DownloadBlock';
  operationType: 'action';
  parameters: Record<string, unknown>;
};
export type FileDeps = { execute: (request: FileAction) => Promise<unknown>; sleep: Sleep };

/** Learn: blocks of up to 4 MiB; `filecontent` holds at most 131,072 KB. */
export const BLOCK_BYTES = 4 * 1024 * 1024;
export const FILE_MAX_BYTES = 128 * 1024 * 1024;

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/u;

function invalidFile(): HostReadError {
  return new HostReadError('Unexpected file response from Dataverse.', null);
}

type Initializer = { token: string; size: number; chunked: boolean };

function parseInitializer(raw: unknown): Initializer {
  if (!isRecord(raw)) throw invalidFile();
  const { FileContinuationToken, FileSizeInBytes, FileName, IsChunkingSupported } = raw;
  if (typeof FileContinuationToken !== 'string' || FileContinuationToken === '') throw invalidFile();
  if (typeof FileSizeInBytes !== 'number' || !Number.isSafeInteger(FileSizeInBytes)) throw invalidFile();
  if (FileSizeInBytes < 0 || FileSizeInBytes > FILE_MAX_BYTES) throw invalidFile();
  if (FileName !== undefined && typeof FileName !== 'string') throw invalidFile();
  if (typeof IsChunkingSupported !== 'boolean') throw invalidFile();
  return { token: FileContinuationToken, size: FileSizeInBytes, chunked: IsChunkingSupported };
}

/** `DownloadBlockResponse.Data` is binary serialised as base64 (Learn). Length and round-trip are both checked. */
function blockBytes(raw: unknown, expected: number): Uint8Array {
  if (!isRecord(raw) || typeof raw.Data !== 'string') throw invalidFile();
  const data = raw.Data;
  if (data.length % 4 !== 0 || !BASE64.test(data)) throw invalidFile();
  let binary: string;
  try {
    binary = atob(data);
  } catch {
    throw invalidFile();
  }
  if (binary.length !== expected || btoa(binary) !== data) throw invalidFile();
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/**
 * Downloads one file column: InitializeFileBlocksDownload, then sequential DownloadBlock calls (whole file when
 * chunking is unsupported), assembled in order and decoded once as UTF-8 so a code point split across blocks
 * survives. Exactly one leading BOM is stripped. Retries apply per request at the same offset; cancellation is
 * checked before every request and after every response. Incomplete or invalid bytes never return.
 */
export async function downloadColumnContent(
  ref: FileColumnRef,
  deps: FileDeps,
  signal?: AbortSignal,
): Promise<string> {
  throwIfAborted(signal);
  const names = [ref.entityLogicalName, ref.primaryIdAttribute, ref.fileAttributeName];
  if (!names.every((name) => NAME.test(name)) || !GUID.test(ref.recordId)) {
    throw new HostReadError('Invalid file column reference.', null);
  }
  const initial = parseInitializer(
    await withRetry(
      'InitializeFileBlocksDownload',
      () =>
        deps.execute({
          operationName: 'InitializeFileBlocksDownload',
          operationType: 'action',
          parameters: {
            Target: {
              '@odata.type': `Microsoft.Dynamics.CRM.${ref.entityLogicalName}`,
              [ref.primaryIdAttribute]: ref.recordId,
            },
            FileAttributeName: ref.fileAttributeName,
          },
        }),
      deps.sleep,
      signal,
    ),
  );
  const bytes = new Uint8Array(initial.size);
  for (let offset = 0; offset < initial.size; ) {
    throwIfAborted(signal);
    const length = initial.chunked ? Math.min(BLOCK_BYTES, initial.size - offset) : initial.size;
    const block = await withRetry(
      'DownloadBlock',
      () =>
        deps.execute({
          operationName: 'DownloadBlock',
          operationType: 'action',
          parameters: { FileContinuationToken: initial.token, Offset: offset, BlockLength: length },
        }),
      deps.sleep,
      signal,
    );
    bytes.set(blockBytes(block, length), offset);
    offset += length;
  }
  throwIfAborted(signal);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw invalidFile();
  }
  return text.startsWith('﻿') ? text.slice(1) : text;
}
