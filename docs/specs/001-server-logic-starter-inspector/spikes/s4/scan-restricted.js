// Scans a server logic file against Learn's restricted-pattern list (author-server-logic#limitations),
// matched as observed live on 2026-10-15: case-insensitive, over raw text including comments and strings.
const fs = require("fs");
const PATTERNS = [
  /__dirname/i, /__filename/i, /import\s*\(/i, /import\s+[\s\S]*?\s+from\b/i, /eval\s*\(/i, /function\s*\(/i,
  /settimeout\s*\(/i, /setinterval\s*\(/i, /setimmediate\s*\(/i, /process\.exit/i, /process\.kill/i,
  /child_process/i, /fs\./i, /require\s*\(/i, /constructor\.constructor/i, /this\.constructor/i,
  /arguments\.callee/i, /with\s*\(/i, /delete\s+[a-z_$]/i, /object\.getprototypeof/i,
  /object\.setprototypeof/i, /proxy\s*\(/i, /reflect\./i, /symbol\.for/i, /__proto__/i, /prototype/i, /debugger/i,
];
let hits = 0;
fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).forEach((line, i) => {
  for (const p of PATTERNS) {
    if (p.test(line)) { hits++; console.log(`line ${i + 1} matches ${p}: ${line.trim().slice(0, 100)}`); }
  }
});
console.log(hits ? `${hits} hit(s)` : "clean against all Learn patterns");
process.exitCode = hits ? 1 : 0;
