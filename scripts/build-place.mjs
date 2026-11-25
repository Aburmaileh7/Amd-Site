#!/usr/bin/env node
// Builds sites/<slug>/place.json from work/<slug>/{materials,copy,choices}.json, then validates. No LLM.
//   node scripts/build-place.mjs <slug> [--out <file>]
// Facts, reviews, menu, photos come only from materials.json; words only from copy.json;
// design only from choices.json (the designer's small file). Shape of choices.json:
// { "theme", "layout":{hero,story}, "accent":{hex,rgb,hover,ink}, "motion":{hero}, "sections":[...],
//   "area", "address", "map_query", "phone_display", "name_lang",
//   "images": { "<key>": "<file in materials.photos>" | {"file","alt"} | {"id":"photo-…","alt":"صورة توضيحية …"} },
//   "hero_image":"<key>", "visit_image":"<key>",
//   "story_items":[{"label","image","time"}]   (same order as copy.story.items),
//   "menu":{"kind","foot","categories":[{"id","tagline","image"}]}   (same order as materials.menu.categories),
//   "reviews":["<source_ref>", …]   (4–6 from materials.reviews / review_candidates),
//   "amenities":{"title","image","items":[{"icon","title","text"}]},
//   "hours_rows":[{"days","time"}], "hours_source",
//   "overrides":{ any place.json key, merged last } }
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { checkPlace } from '../src/lib/place.mjs';

const slug = process.argv[2];
const outArg = process.argv.indexOf('--out');
if (!slug) { console.error('usage: build-place.mjs <slug> [--out file]'); process.exit(2); }
const W = `work/${slug}`;
const load = (f, need = true) => {
  if (!existsSync(`${W}/${f}`)) { if (need) { console.error(`✗ ${W}/${f} missing`); process.exit(1); } return {}; }
  return JSON.parse(readFileSync(`${W}/${f}`, 'utf8'));
};
const mat = load('materials.json'), copy = load('copy.json'), ch = load('choices.json');
const f = mat.facts || {};
const errs = [];
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = isObj(v) && isObj(a?.[k]) ? merge(a[k], v) : v; return o; };
const prune = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === null) delete o[k]; return o; };

// images: file → its registered photo (alt/source/credit), or an Unsplash fallback object
const images = {};
for (const [k, v] of Object.entries(ch.images || {})) {
  const file = typeof v === 'string' ? v : v.file;
  if (file) {
    const ph = (mat.photos || []).find((x) => x.file === file);
    if (!ph) { errs.push(`images.${k}: "${file}" is not in materials.photos`); continue; }
    const alt = v.alt || ph.alt || '';
    images[k] = prune({ file, alt: alt.startsWith('صورة') ? alt : `صورة ${alt}`.trim(), source_url: ph.source_url, credit: ph.credit });
  } else images[k] = v;
}

// reviews: only real ones, picked by id
const pool = [...(mat.reviews || []), ...(mat.review_candidates || [])];
const reviews = (ch.reviews || (mat.reviews || []).map((r) => r.source_ref)).map((id) => {
  const r = pool.find((x) => x.source_ref === id);
  if (!r) { errs.push(`review ${id} not in materials`); return null; }
  const w = String(r.author).trim().split(/\s+/);
  const author = w.length > 1 && !/^[^\s]+ [^\s]\.$/.test(r.author) ? `${w[0]} ${w[1][0].toUpperCase()}.` : r.author;
  return { author, stars: r.stars, text: String(r.text).replace(/\s+/g, ' ').trim(), source_ref: r.source_ref };
}).filter(Boolean);

// menu: items and prices from materials only
let menu;
if (mat.menu?.categories?.length) {
  const cm = ch.menu || {};
  menu = prune({
    kind: cm.kind || (mat.menu.kind === 'services' ? 'services' : 'menu'),
    sample: !!mat.menu.sample,
    title: copy.sections?.menu_title,
    note: mat.menu.note,
    currency: mat.menu.kind === 'services' && cm.kind === 'services' && !mat.menu.categories.some((c) => c.items?.some((i) => i.price != null)) ? undefined : mat.menu.currency || mat.currency,
    foot: cm.foot,
    categories: mat.menu.categories.map((c, i) => prune({
      id: cm.categories?.[i]?.id || c.id || `c${i + 1}`,
      title: c.title || c.name,
      tagline: cm.categories?.[i]?.tagline || c.tagline,
      image: cm.categories?.[i]?.image,
      items: (c.items || []).map((it) => prune({ name: it.name, desc: it.desc, price: it.price, mentioned: it.mentioned || undefined }))
    }))
  });
}

const story = copy.story?.items?.length ? {
  title: copy.sections?.story_title || copy.story.title,
  items: copy.story.items.map((it, i) => prune({ label: ch.story_items?.[i]?.label, title: it.title, text: it.text,
    image: ch.story_items?.[i]?.image, time: ch.story_items?.[i]?.time }))
} : undefined;

const tel = (f.phone || '').replace(/[^\d+]/g, '');
const waConfirmed = mat.whatsapp_confirmed === true || String(mat.whatsapp_confirmed).toUpperCase() === 'TRUE';
let whatsapp = null;
if (waConfirmed && mat.whatsapp) {
  const num = String(typeof mat.whatsapp === 'object' ? mat.whatsapp.number : mat.whatsapp).replace(/\D/g, '');
  if (/^\d{8,15}$/.test(num)) {
    whatsapp = { number: num, display: (typeof mat.whatsapp === 'object' && mat.whatsapp.display) || `+${num}` };
  }
}
let place = prune({
  place_id: mat.place_id,
  batch_id: mat.batch_id || `amd-gulf-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
  slug, theme: ch.theme, approved: false, agency: 'Amd web', data_source: mat.data_source,
  layout: ch.layout, accent: ch.accent, motion: ch.motion,
  name: f.name || mat.name, name_lang: ch.name_lang || (/[؀-ۿ]/.test(f.name || mat.name) ? 'ar' : 'en'),
  category_label: copy.category_label, area: ch.area || f.area, address: ch.address || f.address,
  phone: tel ? { display: ch.phone_display || tel, tel } : undefined,
  whatsapp,
  directions_url: f.google_maps_url, map_query: ch.map_query || [f.name, f.address].filter(Boolean).join(', '),
  rating: f.rating ? { value: f.rating.value, count: f.rating.count, source: 'Google' } : undefined,
  hero: prune({ headline: copy.hero?.headline, intro: copy.hero?.intro, image: ch.hero_image }),
  sections: ch.sections,
  story,
  marquee: copy.marquee?.items?.length ? copy.marquee : undefined,
  menu,
  mentions: (copy.mentions_ar || []).map((m) => m.ar || m).filter(Boolean),
  reviews,
  amenities: ch.amenities,
  hours: ch.hours_rows?.length ? { rows: ch.hours_rows, source: ch.hours_source || 'خرائط Google' } : undefined,
  visit: prune({ title: copy.sections?.visit_title, image: ch.visit_image }),
  images
});
place = merge(place, ch.overrides || {});

const { errors, warn } = checkPlace(place, slug);
errors.push(...errs);
// every listed section must have content, or it renders empty
const has = { story: place.story?.items?.length, menu: place.menu?.categories?.length, reviews: place.reviews?.length,
  amenities: place.amenities?.items?.length, visit: place.directions_url || place.phone, proof: place.rating || place.mentions?.length,
  marquee: place.marquee?.items?.length };
for (const s of place.sections || []) if (!has[s]) errors.push(`section "${s}" listed but has no content`);
warn.forEach((w) => console.warn(`! ${w}`));
if (errors.length) { errors.forEach((e) => console.error(`✗ ${e}`)); process.exit(1); }

const out = outArg > 0 ? process.argv[outArg + 1] : `sites/${slug}/place.json`;
mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true });
writeFileSync(out, JSON.stringify(place, null, 2) + '\n');
console.log(`✓ ${out} (${place.theme}, ${place.sections?.length} sections, ${reviews.length} reviews, ${Object.keys(images).length} images)`);
if (out === `sites/${slug}/place.json`) execFileSync('node', ['scripts/validate.mjs', slug], { stdio: 'inherit' });
