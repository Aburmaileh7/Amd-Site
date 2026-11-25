#!/usr/bin/env node
// Builds work/<slug>/materials.json from work/<slug>/maps.json (apify-places output), no LLM.
//   node scripts/materials.mjs <slug>            facts + review candidates + photo candidates (thumbs to look at)
//   node scripts/materials.mjs <slug> --pick 3=hero-pasta:"صورة طبق باستا" 7=interior:"صورة من داخل المحل" ...
//                                                 saves those candidates (≤1600px, ≤600KB) to sites/<slug>/img/ and registers them
// Keeps keys a person already filled (menu, mentions, photos picked earlier, notes).
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const [slug, ...rest] = process.argv.slice(2);
if (!slug) { console.error('usage: materials.mjs <slug> [--pick N=name:"alt" ...]'); process.exit(2); }
const dir = `work/${slug}`;
const mapsFile = `${dir}/maps.json`;
if (!existsSync(mapsFile)) { console.error(`✗ ${mapsFile} missing (run maps-fetch place first)`); process.exit(1); }
const raw = JSON.parse(readFileSync(mapsFile, 'utf8'));
const m = Array.isArray(raw) ? raw[0] : raw;
const outFile = `${dir}/materials.json`;
const old = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};

const COUNTRY = [
  ['+971', 'UAE', 'د.إ', /united arab emirates|\buae\b|dubai|abu dhabi|sharjah|ajman|الإمارات|دبي|أبوظبي|الشارقة/i],
  ['+966', 'Saudi Arabia', 'ر.س', /saudi|riyadh|jeddah|dammam|khobar|makkah|madinah|السعودية|الرياض|جدة|الدمام|الخبر/i],
  ['+974', 'Qatar', 'ر.ق', /qatar|doha|lusail|wakrah|قطر|الدوحة|لوسيل/i],
  ['+965', 'Kuwait', 'د.ك', /kuwait|salmiya|hawalli|kuwayt|الكويت|السالمية|حولي/i],
  ['+968', 'Oman', 'ر.ع', /\boman\b|muscat|salalah|seeb|عُمان|عمان|مسقط|صلالة/i],
  ['+973', 'Bahrain', 'د.ب', /bahrain|manama|muharraq|riffa|البحرين|المنامة|المحرق/i],
  ['+962', 'Jordan', 'د.أ', /jordan|amman|irbid|aqaba|الأردن|الاردن|عمّان|عمان/i]
];
const phone = (m.phone || '').replace(/[^\d+]/g, '');
const locBlob = [old.country, m.address, m.city, m.area].filter(Boolean).join(' ');
const hitCountry = COUNTRY.find(([p]) => phone.startsWith(p))
  || COUNTRY.find(([, , , re]) => re.test(locBlob))
  || [null, old.country || 'Jordan', old.currency || 'د.أ'];
const [, country, currency] = hitCountry;
const mapsUrl = m.maps_url;
const credit = 'من خرائط Google';

const clean = (t) => (t || '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
const trim = (t, n = 280) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1)).replace(/[,،.;:!?]+$/, '') + '…');
const shortName = (a) => {
  const w = clean(a).split(' ').filter(Boolean);
  return w.length > 1 ? `${w[0]} ${w[1][0].toUpperCase()}.` : w[0] || 'زائر';
};

const reviewCandidates = (m.reviews || [])
  .map((r) => ({ ...r, text: clean(r.text) }))
  .filter((r) => r.stars >= 4 && r.text.length >= 40)
  .sort((a, b) => b.text.length - a.text.length)
  .slice(0, 10)
  .map((r) => ({ author: shortName(r.author), stars: r.stars, date: r.date, source_ref: r.review_id, text: trim(r.text) }));

const IG_RE = /instagram\.com\/([A-Za-z0-9._]{1,30})/i;
const IG_SKIP = /^(p|reel|reels|explore|stories|accounts|tv|about|legal|developer)$/i;
const WA_RE = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?(?:[^"'\s]*&)?phone=|whatsapp\.com\/send\?phone=)\+?(\d{6,15})/i;
const mapLinks = JSON.stringify([m.website, m.instagrams, m.social_links, m.menu, m.reserve_url, m.booking_links].filter(Boolean)).replace(/\\\//g, '/');
const igHit = mapLinks.match(IG_RE);
const mapIg = igHit && !IG_SKIP.test(igHit[1]) ? `https://www.instagram.com/${igHit[1].replace(/\.$/, '')}/` : null;
const waHit = mapLinks.match(WA_RE);
const mapWa = waHit ? `+${waHit[1]}` : null;

const resolvedIg = old.facts?.instagram || old.instagram || mapIg || null;
const resolvedWaConfirmed = old.whatsapp_confirmed === true || String(old.whatsapp_confirmed).toUpperCase() === 'TRUE' || !!mapWa;
const resolvedWa = old.whatsapp || mapWa || null;

const mat = {
  ...old,
  slug,
  place_id: m.place_id,
  name: m.name,
  category: m.category,
  country, currency,
  instagram: resolvedIg,
  whatsapp: resolvedWa,
  whatsapp_confirmed: resolvedWaConfirmed,
  approved: false,
  data_source: old.data_source || 'خرائط Google',
  facts: {
    name: m.name, category: m.category, area: m.area, address: m.address, city: m.city,
    phone: m.phone || null, website: m.website || null, google_maps_url: mapsUrl,
    hours: m.hours || [],
    rating: m.rating ? { value: m.rating, count: m.reviews_count, source: 'Google Maps', source_url: mapsUrl } : null,
    amenities: (m.amenities || []).map((a) => a.replace(/^[^:]+:\s*/, '')),
    closed: m.closed || false,
    ...(resolvedIg ? { instagram: resolvedIg } : {})
  },
  review_candidates: reviewCandidates,
  reviews: old.reviews || [],
  photo_candidates: (m.photos || []).map((url, i) => ({ n: i + 1, thumb: `${dir}/candidates/${String(i + 1).padStart(2, '0')}.jpg`, url })),
  photos: old.photos || [],
  menu: old.menu ?? null,
  mentions: old.mentions || []
};

mkdirSync(`${dir}/candidates`, { recursive: true });
async function fetchImg(url, tries = 3) {
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) { if (t >= tries) throw e; await new Promise((s) => setTimeout(s, 800 * t)); }
  }
}

const picks = [];
for (let i = 0; i < rest.length; i++) if (rest[i] === '--pick') while (rest[i + 1] && !rest[i + 1].startsWith('--')) picks.push(rest[++i]);

if (!picks.length) {
  // Build ONE numbered contact sheet (work/<slug>/candidates/grid.jpg) so collector inspects all candidates in 1 Vision call!
  let ok = 0;
  const tiles = [];
  for (const c of mat.photo_candidates) {
    try {
      if (!existsSync(c.thumb)) {
        await sharp(await fetchImg(c.url)).resize({ width: 360 }).jpeg({ quality: 65 }).toFile(c.thumb);
      }
      ok++;
      tiles.push({ n: c.n, thumb: c.thumb });
    } catch (e) { c.error = e.message; }
  }
  const gridPath = `${dir}/candidates/grid.jpg`;
  if (tiles.length) {
    const cols = 4, cellW = 360, cellH = 270, gap = 8;
    const rows = Math.ceil(tiles.length / cols);
    const width = cols * cellW + (cols + 1) * gap;
    const height = rows * cellH + (rows + 1) * gap;
    const composites = [];
    for (let idx = 0; idx < tiles.length; idx++) {
      const { n, thumb } = tiles[idx];
      const left = gap + (idx % cols) * (cellW + gap);
      const top = gap + Math.floor(idx / cols) * (cellH + gap);
      const imgBuf = await sharp(thumb).resize(cellW, cellH, { fit: 'cover' }).toBuffer();
      const badgeSvg = Buffer.from(
        `<svg width="52" height="34"><rect width="52" height="34" rx="6" fill="rgba(0,0,0,0.82)"/><text x="26" y="24" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">${n}</text></svg>`
      );
      composites.push({ input: imgBuf, left, top }, { input: badgeSvg, left: left + 8, top: top + 8 });
    }
    await sharp({ create: { width, height, channels: 3, background: { r: 22, g: 22, b: 26 } } })
      .composite(composites)
      .jpeg({ quality: 75, mozjpeg: true })
      .toFile(gridPath);
    mat.photo_grid = gridPath;
  }
  writeFileSync(outFile, JSON.stringify(mat, null, 2));
  console.log(`✓ ${outFile}: ${country} ${currency} · rating ${m.rating ?? '-'} (${m.reviews_count ?? 0}) · hours ${mat.facts.hours.length} · amenities ${mat.facts.amenities.length}`);
  console.log(`  review candidates ${reviewCandidates.length} · photos ${ok}/${mat.photo_candidates.length} -> ${tiles.length ? gridPath : 'none'}`);
} else {
  mkdirSync(`sites/${slug}/img`, { recursive: true });
  for (const p of picks) {
    const mm = p.match(/^(\d+)=([a-z0-9-]+)(?::(.+))?$/);
    if (!mm) { console.error(`✗ bad pick "${p}" (want N=name:"alt")`); process.exit(2); }
    const [, n, name, alt] = mm;
    const c = mat.photo_candidates.find((x) => x.n === +n);
    if (!c) { console.error(`✗ no candidate ${n}`); process.exit(2); }
    const file = `${name}.jpg`, out = `sites/${slug}/img/${file}`;
    let q = 82;
    const buf = await fetchImg(c.url);
    do { await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: q, mozjpeg: true }).toFile(out); q -= 8; }
    while (statSync(out).size > 600 * 1024 && q > 40);
    const altText = alt ? (alt.startsWith('صورة') ? alt : `صورة ${alt}`) : `صورة من ${m.name}`;
    mat.photos = mat.photos.filter((x) => x.file !== file);
    mat.photos.push({ file, alt: altText, source_url: mapsUrl, credit, candidate: +n });
    console.log(`✓ ${out} ${(statSync(out).size / 1024) | 0} KB`);
  }
  writeFileSync(outFile, JSON.stringify(mat, null, 2));
  console.log(`✓ ${outFile}: ${mat.photos.length} photos registered`);
}
