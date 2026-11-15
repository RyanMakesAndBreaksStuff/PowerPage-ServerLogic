import { strToU8, zipSync } from 'fflate';

export function buildZip(files: readonly { path: string; content: string }[]): Uint8Array {
  const seen = new Set<string>();
  const data: Record<string, Uint8Array> = {};
  for (const file of files) {
    if (file.path === '') throw new Error('Empty path in zip');
    if (seen.has(file.path)) throw new Error(`Duplicate path in zip: ${file.path}`);
    seen.add(file.path);
    data[file.path] = strToU8(file.content);
  }
  return zipSync(data);
}
