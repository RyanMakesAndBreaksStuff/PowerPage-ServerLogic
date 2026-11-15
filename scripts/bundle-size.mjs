// Prints raw and gzip sizes of the JS bundles in a folder.
// Usage: node scripts/bundle-size.mjs [dir [--budget-kib N]]   With a budget, exits 1 when any bundle's gzip size exceeds it.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const budgetAt = args.indexOf('--budget-kib');
const budget = budgetAt === -1 ? undefined : Number(args[budgetAt + 1]);
if (budget !== undefined && !(budget > 0)) {
  console.error('--budget-kib needs a positive number.');
  process.exit(2);
}
const dir = args[0] !== undefined && !args[0].startsWith('--') ? args[0] : 'dist-probe';
const kib = (bytes) => (bytes / 1024).toFixed(1);

const bundles = readdirSync(dir).filter((file) => file.endsWith('.js'));
if (budget !== undefined && bundles.length === 0) {
  console.error(`No JS bundle in ${dir}.`);
  process.exit(1);
}
let over = 0;
for (const name of bundles) {
  const bytes = readFileSync(join(dir, name));
  const gzip = gzipSync(bytes).length;
  console.log(`${name}  raw ${kib(bytes.length)} KiB  gzip ${kib(gzip)} KiB`);
  if (budget !== undefined && gzip / 1024 > budget) {
    console.error(`${name} is over the ${budget.toFixed(1)} KiB gzip budget.`);
    over += 1;
  }
}
process.exitCode = over === 0 ? 0 : 1;
