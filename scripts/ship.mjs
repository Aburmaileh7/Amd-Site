// Ships finished demo sites (no LLM): validate → build → QA → commit → push branch → wait for 200.
// Usage: node scripts/ship.mjs <slug> [slug...] [--dry]   (--dry: checks only, no git, no push)
// Never pushes to main, never force-pushes, commits only sites/<slug>/.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const slugs = args.filter((a) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(a));
if (!slugs.length) { console.error('usage: ship.mjs <slug> [slug...] [--dry]'); process.exit(2); }
const sh = (c, opts = {}) => execSync(c, { cwd: '/home/mohd/Amd-Site', stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts });
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
step('build', () => sh('node node_modules/astro/astro.js build', { timeout: 15 * 60 * 1000 }));
step('qa', () => sh(`node scripts/qa.mjs ${slugs.join(' ')}`, { env: { ...process.env, QA_PORT: '4488', CHROME_PATH: '/usr/bin/google-chrome' }, timeout: 15 * 60 * 1000 }));
result.qa = slugs.map((s) => `qa-out/${s}/`);
if (dry) { result.ok = true; console.log(JSON.stringify(result, null, 1)); process.exit(0); }

const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-');
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
for (const s of slugs) {
  const want = norm(readFileSync(`/home/mohd/Amd-Site/dist/${s}/index.html`, 'utf8'));
  let state = 'not live';
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`https://amd-demos.pages.dev/${s}/`, { headers: { 'cache-control': 'no-cache' } }).catch(() => null);
    if (r?.status === 200 && norm(await r.text()) === want) { state = 'live'; break; }
    state = r ? `old or missing (${r.status})` : 'no response';
    execSync('sleep 45');
  }
  result.live[s] = state === 'live' ? `https://amd-demos.pages.dev/${s}/` : `not updated: ${state}`;
}
result.ok = Object.values(result.live).every((v) => v.startsWith('https'));
// the workflow merged the branch into origin/main: bring it into the local checkout so the site folder is back
try { sh('git pull --ff-only'); } catch { result.note = 'git pull --ff-only failed: run it before editing the site'; }
console.log(JSON.stringify(result, null, 1));
