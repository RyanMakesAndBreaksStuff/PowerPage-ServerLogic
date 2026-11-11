import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Reads `__golden__/<name>` next to the test whose `import.meta.url` is `metaUrl`, as UTF-8.
 * `fileURLToPath` avoids Vite's rewrite of `new URL('./x', import.meta.url)` and Windows paths
 * that contain spaces (%20), both of which make readFileSync fail.
 */
export function readGolden(metaUrl: string, name: string): string {
  return readFileSync(join(dirname(fileURLToPath(metaUrl)), '__golden__', name), 'utf8');
}
