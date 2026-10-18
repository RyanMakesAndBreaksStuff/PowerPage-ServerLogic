import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dir = process.argv[2] ?? 'dist-probe';
const kib = (bytes) => (bytes / 1024).toFixed(1);

for (const name of readdirSync(dir).filter((file) => file.endsWith('.js'))) {
  const bytes = readFileSync(join(dir, name));
  console.log(`${name}  raw ${kib(bytes.length)} KiB  gzip ${kib(gzipSync(bytes).length)} KiB`);
}
