#!/usr/bin/env node
// QA for one or more built sites: serves dist/, checks overflow, console errors,
// links, preview/noindex, and saves 2 compact JPEG sheets per site (mobile-sheet.jpg + desktop-sheet.jpg)
// instead of 14 PNGs to save ~85% Vision tokens. Pass --slices to also save individual PNGs.
// Usage: npm run build && node scripts/qa.mjs [slug ...] [--slices]
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import sharp from 'sharp';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('playwright not installed: npm i -D playwright'); process.exit(2); }

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'
};
const PORT = Number(process.env.QA_PORT) || 4399;
const server = createServer((req, res) => {
  let path = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(PORT);

const rawArgs = process.argv.slice(2);
const keepSlices = rawArgs.includes('--slices');
const slugArgs = rawArgs.filter((a) => !a.startsWith('--'));
const slugs = slugArgs.length
  ? slugArgs
  : readdirSync('sites', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

const exe = process.env.CHROME_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
let browser;
try { browser = await chromium.launch(exe ? { executablePath: exe } : {}); }
catch { browser = await chromium.launch(); }

async function buildSheet(buffers, cols, cellW, cellH, outPath) {
  const gap = 8;
  const rows = Math.ceil(buffers.length / cols);
  const width = cols * cellW + (cols + 1) * gap;
  const height = rows * cellH + (rows + 1) * gap;
  const resized = await Promise.all(
    buffers.map((b) => sharp(b).resize(cellW, cellH, { fit: 'cover', position: 'top' }).toBuffer())
  );
  const composites = resized.map((input, idx) => ({
    input,
    left: gap + (idx % cols) * (cellW + gap),
    top: gap + Math.floor(idx / cols) * (cellH + gap)
  }));
  await sharp({
    create: { width, height, channels: 3, background: { r: 24, g: 24, b: 28 } }
  })
    .composite(composites)
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(outPath);
}

let problems = 0;
for (const slug of slugs) {
  const out = `qa-out/${slug}`;
  mkdirSync(out, { recursive: true });
  // Remove stale individual PNG slices when generating sheets so reviewers only see the compact sheets
  if (!keepSlices) {
    for (const f of readdirSync(out)) {
      if (/^(mobile|desktop)-\d+\.png$/.test(f)) rmSync(join(out, f), { force: true });
    }
  }
  for (const [vp, w, h, cols, cw, ch] of [
    ['mobile', 390, 844, 4, 390, 844],
    ['desktop', 1440, 900, 2, 720, 450]
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/${slug}/`);
    await page.waitForTimeout(1800);
    const buffers = [];
    buffers.push(await page.screenshot({ ...(keepSlices ? { path: `${out}/${vp}-0.png` } : {}) }));
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let i = 1; i <= 6; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * i / 7));
      await page.waitForTimeout(1100);
      buffers.push(await page.screenshot({ ...(keepSlices ? { path: `${out}/${vp}-${i}.png` } : {}) }));
    }
    await buildSheet(buffers, cols, cw, ch, `${out}/${vp}-sheet.jpg`);
    const r = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      badLinks: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
        .filter((h) => !/^(https:\/\/|tel:\+\d+|#)/.test(h)),
      preview: !!document.querySelector('.preview-bar'),
      noindex: document.querySelector('meta[name=robots]')?.content.includes('noindex')
    }));
    const issues = [];
    if (r.overflow > 0) issues.push(`horizontal overflow ${r.overflow}px`);
    if (r.badLinks.length) issues.push(`bad links ${r.badLinks.join(', ')}`);
    if (errors.length) issues.push(`js errors ${errors.join(' | ')}`);
    if (!r.preview || !r.noindex) issues.push('preview bar / noindex missing');
    problems += issues.length;
    console.log(`${issues.length ? '✗' : '✓'} ${slug} ${vp}${issues.length ? ': ' + issues.join('; ') : ''}`);
    await page.close();
  }
}
await browser.close();
server.close();
console.log('screenshots: qa-out/<slug>/{mobile-sheet.jpg,desktop-sheet.jpg}');
process.exit(problems ? 1 : 0);
