// Validates every sites/<slug>/place.json. Fails the build on errors.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { checkPlace } from '../src/lib/place.mjs';

const only = process.argv[2];
const slugs = readdirSync('sites', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  .filter((s) => !only || s === only);
let failed = 0;

// sites/<slug>/site.js never imports GSAP: it gets gsap, ScrollTrigger and reduce from the shared
// motion script (window.*) through the wrapper in the page. Nothing else would catch it if that
// hand-off broke, so check both ends whenever any site has its own site.js.
if (readdirSync('sites').some((s) => existsSync(`sites/${s}/site.js`))) {
  const motion = readFileSync('src/scripts/motion.js', 'utf8');
  const page = readFileSync('src/pages/[slug]/index.astro', 'utf8');
  const handoff = [
    [/window\.gsap\s*=\s*gsap\b/, motion, 'motion.js must set window.gsap'],
    [/window\.ScrollTrigger\s*=\s*ScrollTrigger\b/, motion, 'motion.js must set window.ScrollTrigger'],
    [/window\.AMD_REDUCED_MOTION\s*=/, motion, 'motion.js must set window.AMD_REDUCED_MOTION'],
    [/window\.AMD_READY\s*=\s*true/, motion, 'motion.js must set window.AMD_READY = true'],
    [/dispatchEvent\(new Event\('amd:ready'\)\)/, motion, "motion.js must dispatch 'amd:ready'"],
    [/addEventListener\('amd:ready'/, page, "the page must wait for 'amd:ready' before running site.js"],
    [/\(gsap, ScrollTrigger, reduce\)[\s\S]*window\.gsap, window\.ScrollTrigger, window\.AMD_REDUCED_MOTION/, page,
      'the page must pass window.gsap, window.ScrollTrigger and window.AMD_REDUCED_MOTION to site.js as gsap, ScrollTrigger, reduce']
  ];
  for (const [re, src, msg] of handoff) if (!re.test(src)) { console.error(`✗ site.js hand-off: ${msg}`); failed++; }
}

for (const slug of slugs) {
  const f = `sites/${slug}/place.json`;
  if (!existsSync(f)) { console.error(`✗ ${slug}: missing place.json`); failed++; continue; }
  let p;
  try { p = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.error(`✗ ${slug}: invalid JSON (${e.message})`); failed++; continue; }
  const { errors, warn } = checkPlace(p, slug);
  // real photos of the place must exist next to place.json and stay small
  for (const [k, v] of Object.entries(p.images || {})) {
    if (!v?.file) continue;
    const img = `sites/${slug}/img/${v.file}`;
    if (!existsSync(img)) errors.push(`images.${k}: ${img} not found`);
    else if (statSync(img).size > 600 * 1024) errors.push(`images.${k}: ${img} is over 600 KB, resize it`);
  }
  // the site's own design layer: small, self-contained, no outside requests
  for (const f of ['site.css', 'site.js']) {
    const path = `sites/${slug}/${f}`;
    if (!existsSync(path)) continue;
    const src = readFileSync(path, 'utf8');
    if (src.length > 24 * 1024) errors.push(`${f} is over 24 KB`);
    if (/https?:\/\/|@import|\bfetch\s*\(|XMLHttpRequest|\bimport\s*\(|<\/script/i.test(src)) errors.push(`${f} must not load or call anything outside the site`);
    if (f === 'site.js' && !/\breduce\b/.test(src)) errors.push('site.js must respect reduced motion (check `reduce`)');
  }
  warn.forEach((w) => console.warn(`! ${slug}: ${w}`));
  if (errors.length) { failed++; errors.forEach((e) => console.error(`✗ ${slug}: ${e}`)); }
  else console.log(`✓ ${slug}`);
}
if (failed) { console.error(`\n${failed} site(s) failed validation`); process.exit(1); }
