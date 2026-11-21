#!/usr/bin/env node
// Automatic production gate (replaces the production manager's first look). No LLM.
//   node scripts/prod-check.mjs <slug> [...]     needs dist/ built (ship.mjs or npm run build)
// Checks: ship.json ok + live URL, every listed section rendered with content, images loaded,
// no horizontal overflow, no JS errors, no overlapping text, no clipped text, readable contrast on solid backgrounds.
// Writes work/<slug>/prod-check.json; prints one line per slug; exit 1 if any slug fails.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const slugs = process.argv.slice(2);
if (!slugs.length) { console.error('usage: prod-check.mjs <slug> [...]'); process.exit(2); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const PORT = Number(process.env.QA_PORT) || 4398;
const server = createServer((req, res) => {
  let p = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(PORT);
const exe = process.env.CHROME_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: exe }); }

const SEC = { story: '.story', menu: '.menu', reviews: '.rev', amenities: '.amen', proof: '.proof', visit: '.visit', marquee: '.marquee' };
let failed = 0;
for (const slug of slugs) {
  const fails = [], notes = [];
  const place = JSON.parse(readFileSync(`sites/${slug}/place.json`, 'utf8'));
  const shipF = `work/${slug}/ship.json`;
  if (existsSync(shipF)) {
    const s = JSON.parse(readFileSync(shipF, 'utf8'));
    if (!s.ok) fails.push(`ship not ok: ${(s.steps || []).filter((x) => !x.ok).map((x) => x.step).join(',')}`);
    if (!s.live?.[slug]) fails.push('ship.json has no live URL for this slug');
  } else notes.push('no ship.json (local check only)');
  if (!existsSync(`dist/${slug}/index.html`)) { fails.push('dist not built'); }
  else for (const [vp, w, h] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const jsErr = []; page.on('pageerror', (e) => jsErr.push(e.message));
    await page.goto(`http://localhost:${PORT}/${slug}/`, { waitUntil: 'load' });
    // scroll through so lazy images and scroll reveals finish
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += h * 0.8) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(250); }
    await page.waitForTimeout(1200);
    const r = await page.evaluate(({ sections, SEC }) => {
      const out = { empty: [], missing: [], broken: [], overlap: [], clipped: [], contrast: [] };
      const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return { L: 0.2126 * r + 0.7152 * g + 0.0722 * b, a: m[3] === undefined ? 1 : +m[3] }; };
      // sections with a photo or gradient layer behind the text: contrast can't be read from colours, skip them
      const layered = new Set([...document.querySelectorAll('section, header, footer')].filter((s) => [...s.querySelectorAll('*')].some((e) => {
        const cs = getComputedStyle(e);
        if (/absolute|fixed/.test(cs.position) && (e.tagName === 'IMG' || e.querySelector('img') || cs.backgroundImage !== 'none')) return true;
        return ['::before', '::after'].some((p) => { const ps = getComputedStyle(e, p); return ps.content !== 'none' && ps.backgroundImage !== 'none'; });
      })));
      const bgOf = (el) => { if ([...layered].some((s) => s.contains(el))) return null; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') return null; const l = lum(cs.backgroundColor); if (l && l.a > 0.95) return l.L; if (l && l.a > 0.05) return null; } return 1; };
      const label = (e) => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      for (const s of sections) {
        const el = document.querySelector(SEC[s]);
        if (!el) { out.missing.push(s); continue; }
        const b = el.getBoundingClientRect();
        if (b.height < 60 || (s !== 'marquee' && (el.innerText || '').trim().length < 15)) out.empty.push(s);
      }
      for (const img of document.querySelectorAll('img')) if (img.complete && img.naturalWidth === 0) out.broken.push(img.getAttribute('src'));
      const leaves = [...document.querySelectorAll('main *, section *')].filter((e) => {
        if (e.closest('.marquee, .mapd, [aria-hidden=true], .visually-hidden')) return false;
        const t = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (!t) return false;
        const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        return cs.visibility !== 'hidden' && +cs.opacity > 0.5 && r.width > 4 && r.height > 4;
      });
      const boxes = leaves.map((e) => ({ e, r: e.getBoundingClientRect() }));
      for (let i = 0; i < boxes.length && out.overlap.length < 6; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
        const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (ix > 6 && iy > 6 && ix * iy > 0.25 * Math.min(a.r.width * a.r.height, b.r.width * b.r.height)) { out.overlap.push(`«${label(a.e)}» × «${label(b.e)}»`); break; }
      }
      for (const { e } of boxes) {
        const cs = getComputedStyle(e);
        if (/hidden|clip/.test(cs.overflow + cs.overflowX) && e.scrollWidth > e.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && out.clipped.length < 6) out.clipped.push(`«${label(e)}»`);
        const fg = lum(cs.color), bg = bgOf(e);
        if (fg && fg.a > 0.5 && cs.webkitTextFillColor !== "rgba(0, 0, 0, 0)" && bg != null && out.contrast.length < 6) {
          const cr = (Math.max(fg.L, bg) + 0.05) / (Math.min(fg.L, bg) + 0.05);
          const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.6 && +cs.fontWeight >= 700);
          if (cr < (big ? 3 : 4.5) - 0.3) out.contrast.push(`«${label(e)}» ${cr.toFixed(1)}:1`);
        }
      }
      out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return out;
    }, { sections: place.sections || [], SEC });
    const tag = (m) => `${vp}: ${m}`;
    if (r.missing.length) fails.push(tag(`sections not rendered: ${r.missing.join(',')}`));
    if (r.empty.length) fails.push(tag(`empty sections: ${r.empty.join(',')}`));
    if (r.broken.length) fails.push(tag(`broken images: ${r.broken.join(', ')}`));
    if (r.overflow > 0) fails.push(tag(`horizontal overflow ${r.overflow}px`));
    if (jsErr.length) fails.push(tag(`js errors: ${jsErr.join(' | ').slice(0, 200)}`));
    if (r.overlap.length) fails.push(tag(`overlapping text: ${r.overlap.join('; ')}`));
    if (r.clipped.length) notes.push(tag(`clipped text: ${r.clipped.join('; ')}`));
    if (r.contrast.length) notes.push(tag(`low contrast: ${r.contrast.join('; ')}`));
    await page.close();
  }
  const verdict = fails.length ? 'return' : 'accept';
  if (fails.length) failed++;
  mkdirSync(`work/${slug}`, { recursive: true });
  writeFileSync(`work/${slug}/prod-check.json`, JSON.stringify({ slug, verdict, fails, notes }, null, 1));
  console.log(`${fails.length ? '✗' : '✓'} ${slug} ${verdict}${fails.length ? ': ' + fails.join(' · ') : ''}${notes.length ? ` (notes ${notes.length})` : ''}`);
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
