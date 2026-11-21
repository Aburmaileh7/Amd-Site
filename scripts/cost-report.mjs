// Token use per role and model for one day, from Claude Code session logs (no LLM).
// Usage: node scripts/cost-report.mjs [YYYY-MM-DD=today] [--json]
// Roles come from subagent meta files (agentType); the main session counts as "main".
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const day = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || new Date().toISOString().slice(0, 10);
const asJson = process.argv.includes('--json');
const repoRoot = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const root = join(homedir(), '.claude/projects', repoRoot.replace(/\//g, '-'));
const rows = new Map(); // key role|model -> totals
const seen = new Set();
if (!existsSync(root)) {
  if (asJson) console.log(JSON.stringify({ day, rows: [] }, null, 1));
  else console.log(`No Claude session logs found at ${root}`);
  process.exit(0);
}

function add(role, file) {
  if (statSync(file).mtime.toISOString().slice(0, 10) < day) return; // untouched since before the day
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes('"usage"') || !line.includes(day)) continue;
    let d; try { d = JSON.parse(line); } catch { continue; }
    const m = d.message; const u = m?.usage;
    if (!u || !String(d.timestamp || '').startsWith(day)) continue;
    const id = d.requestId || d.uuid; if (seen.has(id)) continue; seen.add(id);
    const k = `${role}|${m.model || '?'}`;
    const r = rows.get(k) || { role, model: m.model || '?', calls: 0, input: 0, cache_write: 0, cache_read: 0, output: 0 };
    r.calls++; r.input += u.input_tokens || 0; r.cache_write += u.cache_creation_input_tokens || 0;
    r.cache_read += u.cache_read_input_tokens || 0; r.output += u.output_tokens || 0;
    rows.set(k, r);
  }
}

for (const f of readdirSync(root)) {
  const p = join(root, f);
  if (f.endsWith('.jsonl')) add('main', p);
  const sub = join(p, 'subagents');
  if (!f.endsWith('.jsonl') && existsSync(sub)) {
    for (const s of readdirSync(sub).filter((x) => x.endsWith('.jsonl'))) {
      const meta = join(sub, s.replace(/\.jsonl$/, '.meta.json'));
      let role = 'subagent';
      try { role = JSON.parse(readFileSync(meta, 'utf8')).agentType || role; } catch {}
      add(role, join(sub, s));
    }
  }
}

const list = [...rows.values()].sort((a, b) => (b.input + b.cache_write + b.cache_read + b.output) - (a.input + a.cache_write + a.cache_read + a.output));
if (asJson) { console.log(JSON.stringify({ day, rows: list }, null, 1)); process.exit(0); }
const k = (n) => (n / 1000).toFixed(0) + 'k';
console.log(`Token use ${day}  (input = new + cache write; read = cache read)`);
console.log('role'.padEnd(26), 'model'.padEnd(18), 'calls'.padStart(5), 'input'.padStart(8), 'read'.padStart(8), 'output'.padStart(7));
let t = { calls: 0, input: 0, read: 0, output: 0 };
for (const r of list) {
  const inp = r.input + r.cache_write;
  console.log(r.role.slice(0, 26).padEnd(26), r.model.slice(0, 18).padEnd(18), String(r.calls).padStart(5), k(inp).padStart(8), k(r.cache_read).padStart(8), k(r.output).padStart(7));
  t.calls += r.calls; t.input += inp; t.read += r.cache_read; t.output += r.output;
}
console.log('TOTAL'.padEnd(45), String(t.calls).padStart(5), k(t.input).padStart(8), k(t.read).padStart(8), k(t.output).padStart(7));
