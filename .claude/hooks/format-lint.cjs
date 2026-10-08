// PostToolUse (Edit|Write): eslint --fix + prettier --write on the edited file.
// No-op until the tools are installed. Exits 2 with remaining lint errors so Claude sees them.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

let input = '';
process.stdin.on('data', (c) => (input += c)).on('end', () => {
  let file;
  try {
    file = (JSON.parse(input).tool_input || {}).file_path;
  } catch {
    return;
  }
  if (!file || !fs.existsSync(file)) return;

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const mods = path.join(root, 'node_modules');
  let lintOut = '';

  const eslint = path.join(mods, 'eslint', 'bin', 'eslint.js');
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(path.extname(file)) && fs.existsSync(eslint)) {
    const r = cp.spawnSync(process.execPath, [eslint, '--fix', file], { cwd: root, encoding: 'utf8' });
    if (r.status === 1) lintOut = r.stdout; // status 2 = config error; ignore
  }

  const prettier = path.join(mods, 'prettier', 'bin', 'prettier.cjs');
  if (fs.existsSync(prettier)) {
    cp.spawnSync(process.execPath, [prettier, '--write', '--ignore-unknown', file], { cwd: root, stdio: 'ignore' });
  }

  if (lintOut) {
    process.stderr.write(lintOut.slice(-4000));
    process.exit(2);
  }
});
