// Performance and liveness check for one demo site (no LLM). Usage: node scripts/perf-check.mjs <slug> [--local]
// --local skips the live URL check (before deploy).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const [slug] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const local = process.argv.includes('--local');
if (!slug) { console.error('usage: perf-check.mjs <slug> [--local]'); process.exit(2); }
const dir = `${ROOT}/sites/${slug}`;
const issues = [];
const place = JSON.parse(readFileSync(`${dir}/place.json`, 'utf8'));

// images: each ≤ 600 KB, total ≤ 3 MB, hero ≤ 400 KB (largest paint)
let total = 0;
if (existsSync(`${dir}/img`)) for (const f of readdirSync(`${dir}/img`)) {
  const kb = Math.round(statSync(`${dir}/img/${f}`).size / 1024); total += kb;
  if (kb > 600) issues.push(`img/${f} ${kb} KB > 600 KB`);
}
const hero = place.images?.[place.hero?.image]?.file;
if (hero && existsSync(`${dir}/img/${hero}`)) {
  const kb = Math.round(statSync(`${dir}/img/${hero}`).size / 1024);
  if (kb > 400) issues.push(`hero ${hero} ${kb} KB > 400 KB (slower first paint)`);
}
if (total > 3072) issues.push(`images total ${total} KB > 3 MB`);

// site.js: respect reduced motion, animate transforms/opacity only
if (existsSync(`${dir}/site.js`)) {
  const js = readFileSync(`${dir}/site.js`, 'utf8');
  if (!/\breduce\b/.test(js)) issues.push('site.js ignores reduce');
  // only tween objects count (static styles on created elements are fine)
  const tweens = js.match(/gsap\.(to|from|fromTo)\([^;]*?\)/gs) || [];
  const bad = tweens.flatMap((t) => t.match(/\b(width|height|top|left|right|bottom|margin\w*|padding\w*)\s*:/g) || []);
  if (bad.length) issues.push(`site.js animates layout properties: ${[...new Set(bad)].join(' ')}`);
}

// live page: 200 and the right name
let live = 'skipped';
if (!local) {
  // curl with retries: more robust than fetch on flaky connections
  const { execSync } = await import('node:child_process');
  let html = '', status = 0;
  for (let i = 0; i < 3 && status !== 200; i++) {
    try {
      const out = execSync(`curl -s --retry 2 --max-time 30 -w "\\n%{http_code}" https://amd-demos.pages.dev/${slug}/`, { encoding: 'utf8', maxBuffer: 20e6 });
      status = Number(out.slice(out.lastIndexOf('\n') + 1)); html = out.slice(0, out.lastIndexOf('\n'));
    } catch { status = 0; }
  }
  const res = { status };
  live = status;
  if (res.status !== 200) issues.push(`live status ${res.status}`);
  else if (![place.name, place.name.replace(/&/g, '&amp;').replace(/'/g, '&#39;')].some(n => html.includes(n))) issues.push('live page does not show the business name');
  if (!/noindex/.test(html)) issues.push('live page missing noindex (approved:false pages must not be indexed)');
}
console.log(JSON.stringify({ slug, pass: issues.length === 0, images_kb: total, live, issues }, null, 1));
process.exit(issues.length ? 1 : 0);
