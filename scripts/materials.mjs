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
if (!existsSync(mapsFile)) { console.error(`✗ ${mapsFile} missing (run apify-places place first)`); process.exit(1); }
const raw = JSON.parse(readFileSync(mapsFile, 'utf8'));
const m = Array.isArray(raw) ? raw[0] : raw;
const outFile = `${dir}/materials.json`;
const old = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};

const COUNTRY = [['+971', 'UAE', 'د.إ'], ['+966', 'Saudi Arabia', 'ر.س'], ['+974', 'Qatar', 'ر.ق'], ['+965', 'Kuwait', 'د.ك'],
  ['+968', 'Oman', 'ر.ع'], ['+973', 'Bahrain', 'د.ب'], ['+962', 'Jordan', 'د.أ']];
const phone = (m.phone || '').replace(/[^\d+]/g, '');
const [, country, currency] = COUNTRY.find(([p]) => phone.startsWith(p)) || [null, old.country || 'Jordan', old.currency || 'د.أ'];
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

const mat = {
  ...old,
  slug,
  place_id: m.place_id,
  name: m.name,
  category: m.category,
  country, currency,
  whatsapp_confirmed: old.whatsapp_confirmed ?? false,
  approved: false,
  data_source: old.data_source || 'خرائط Google (بيانات Apify)',
  facts: {
    name: m.name, category: m.category, area: m.area, address: m.address, city: m.city,
    phone: m.phone || null, website: m.website || null, google_maps_url: mapsUrl,
    hours: m.hours || [],
    rating: m.rating ? { value: m.rating, count: m.reviews_count, source: 'Google Maps', source_url: mapsUrl } : null,
    amenities: (m.amenities || []).map((a) => a.replace(/^[^:]+:\s*/, '')),
    closed: m.closed || false,
    ...(old.facts?.instagram ? { instagram: old.facts.instagram } : {})
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
  // thumbnails so the collector can look at every candidate cheaply
  let ok = 0;
  for (const c of mat.photo_candidates) {
    if (existsSync(c.thumb)) { ok++; continue; }
    try { await sharp(await fetchImg(c.url)).resize({ width: 360 }).jpeg({ quality: 60 }).toFile(c.thumb); ok++; }
    catch (e) { c.error = e.message; }
  }
  writeFileSync(outFile, JSON.stringify(mat, null, 2));
  console.log(`✓ ${outFile}: ${country} ${currency} · rating ${m.rating ?? '-'} (${m.reviews_count ?? 0}) · hours ${mat.facts.hours.length} · amenities ${mat.facts.amenities.length}`);
  console.log(`  review candidates ${reviewCandidates.length} · photo thumbs ${ok}/${mat.photo_candidates.length} in ${dir}/candidates/`);
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
