// Ships finished demo sites (no LLM): validate → build → QA → commit → push branch → wait for 200.
// Usage: node scripts/ship.mjs <slug> [slug...] [--dry]   (--dry: checks only, no git, no push)
// Never pushes to main, never force-pushes, commits only sites/<slug>/.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const slugs = args.filter((a) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(a));
if (!slugs.length) { console.error('usage: ship.mjs <slug> [slug...] [--dry]'); process.exit(2); }
const sh = (c, opts = {}) => execSync(c, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts });
const result = { slugs, steps: [], live: {}, ok: false };
const step = (name, fn) => {
  try { const out = fn(); result.steps.push({ step: name, ok: true }); return out; }
  catch (e) {
    const msg = String(e.stderr || e.stdout || e.message).split('\n').filter((l) => /✗|error|Error|fail/i.test(l)).slice(0, 6).join(' | ') || String(e.message).slice(0, 300);
    result.steps.push({ step: name, ok: false, error: msg });
    console.log(JSON.stringify(result, null, 1)); process.exit(1);
  }
};

if (!dry) {
  step('clean-tree', () => { const s = sh('git status --porcelain -- src scripts functions package.json'); if (s.trim()) throw new Error('uncommitted changes outside sites/: ' + s.trim().slice(0, 200)); });
  step('pull', () => sh('git checkout main && git pull --ff-only'));
}
step('validate', () => sh(`node scripts/validate.mjs ${slugs.join(' ')}`));
step('build', () => sh('node node_modules/astro/astro.js build', {
  env: { ...process.env, ONLY_SLUGS: slugs.join(',') },
  timeout: 15 * 60 * 1000
}));
const chrome = process.env.CHROME_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '');
step('qa', () => sh(`node scripts/qa.mjs ${slugs.join(' ')}`, { env: { ...process.env, QA_PORT: '4488', ...(chrome ? { CHROME_PATH: chrome } : {}) }, timeout: 15 * 60 * 1000 }));
result.qa = slugs.map((s) => `qa-out/${s}/`);
if (dry) { result.ok = true; console.log(JSON.stringify(result, null, 1)); process.exit(0); }

const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
const branch = `claude/amd-gulf-${stamp}`;
step('commit', () => {
  sh(`git checkout -b ${branch}`);
  sh(`git add ${slugs.map((s) => `sites/${s}/`).join(' ')}`);
  sh(`git commit -m "${slugs.join(', ')}: موقع تجريبي"`);
});
step('push', () => { sh(`git push -u origin ${branch}`); sh('git checkout main'); });
result.branch = branch;

// wait until the live page is THIS build (an older version may already answer 200)
const norm = (h) => h.replace(/\s+/g, ' ').trim();
const pickTag = (h, re) => norm((h.match(re) || [])[0] || '');
const sameBuild = (live, local) => {
  if (norm(live) === norm(local)) return true;
  const mLocal = pickTag(local, /<main\b[^>]*>[\s\S]*?<\/main>/i);
  const mLive = pickTag(live, /<main\b[^>]*>[\s\S]*?<\/main>/i);
  if (!mLocal || mLocal !== mLive) return false;
  const stylesLocal = (local.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || []).map(norm);
  const liveNorm = norm(live);
  return stylesLocal.every((s) => liveNorm.includes(s));
};
for (const s of slugs) {
  const want = readFileSync(`${ROOT}/dist/${s}/index.html`, 'utf8');
  let state = 'not live';
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`https://amd-demos.pages.dev/${s}/`, { headers: { 'cache-control': 'no-cache' } }).catch(() => null);
    if (r?.status === 200 && sameBuild(await r.text(), want)) { state = 'live'; break; }
    state = r ? `old or missing (${r.status})` : 'no response';
    execSync('sleep 45');
  }
  result.live[s] = state === 'live' ? `https://amd-demos.pages.dev/${s}/` : `not updated: ${state}`;
}
result.ok = Object.values(result.live).every((v) => v.startsWith('https'));
// the workflow merged the branch into origin/main: bring it into the local checkout so the site folder is back
try { sh('git pull --ff-only'); } catch { result.note = 'git pull --ff-only failed: run it before editing the site'; }
// Persist work/<slug>/ship.json for every shipped slug so batch shipping works directly with prod-check.mjs
for (const s of slugs) {
  mkdirSync(`${ROOT}/work/${s}`, { recursive: true });
  writeFileSync(`${ROOT}/work/${s}/ship.json`, JSON.stringify(result, null, 1) + '\n');
}
console.log(JSON.stringify(result, null, 1));
