// Stop: run tsc -b and vitest; exit 2 with failures so Claude keeps fixing.
// stop_hook_active guard limits this to one forced round. No-op until tools are installed.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

let input = '';
process.stdin.on('data', (c) => (input += c)).on('end', () => {
  try {
    if (JSON.parse(input).stop_hook_active) return;
  } catch {
    return;
  }

  // realpath.native fixes the drive-letter case: a lowercase "c:" makes Vitest load twice
  // ("failed to find the current suite") because Vite sees two module paths.
  const root = fs.realpathSync.native(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const mods = path.join(root, 'node_modules');
  const run = (bin, args) => {
    if (!fs.existsSync(bin)) return '';
    const r = cp.spawnSync(process.execPath, [bin, ...args], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    return r.status ? String(r.stdout) + String(r.stderr) : '';
  };

  let out = '';
  if (fs.existsSync(path.join(root, 'tsconfig.json'))) out += run(path.join(mods, 'typescript', 'bin', 'tsc'), ['-b']);
  out += run(path.join(mods, 'vitest', 'vitest.mjs'), ['run', '--passWithNoTests']);

  if (out) {
    process.stderr.write(out.slice(-6000));
    process.exit(2);
  }
});
