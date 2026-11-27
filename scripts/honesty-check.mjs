#!/usr/bin/env node
// Automatic honesty check (no LLM): verifies sites/<slug>/place.json against work/<slug>/{maps,materials}.json.
// Replaces manual web re-checking of mechanical fields (facts, reviews, photos, WhatsApp, banned slogans).
// Usage: node scripts/honesty-check.mjs <slug> [...]
// Writes work/<slug>/honesty-auto.json; prints one line per slug; exit 1 if any slug fails.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('usage: honesty-check.mjs <slug> [...]');
  process.exit(2);
}

const BANNED_SLOGANS = [
  /تجربة\s+لا\s+ت[ُ]?نسى/,
  /الأفضل\s+(في|على)/,
  /الأروع/,
  /لا\s+مثيل\s+ل[هاه]/
];

const digits = (s) => String(s || '').replace(/\D/g, '');
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
// materials.photos should be an array; tolerate {selected:[...]} / {photos:[...]} written by agents
const photoList = (p) => (Array.isArray(p) ? p : Array.isArray(p?.selected) ? p.selected : Array.isArray(p?.photos) ? p.photos : []);

let failedCount = 0;

for (const slug of slugs) {
  try {
    checkSlug(slug);
  } catch (e) {
    // one broken slug must not stop the others or leave it without a result
    failedCount++;
    const out = { slug, verdict: 'fail', fails: [`honesty-check crashed: ${e.message}`], warnings: [], needs_menu_check: false };
    mkdirSync(`work/${slug}`, { recursive: true });
    writeFileSync(`work/${slug}/honesty-auto.json`, JSON.stringify(out, null, 1) + '\n');
    console.log(`✗ ${slug} honesty-auto fail: honesty-check crashed: ${e.message}`);
  }
}

process.exit(failedCount ? 1 : 0);

function checkSlug(slug) {
  const fails = [];
  const warnings = [];
  const place = readJson(`sites/${slug}/place.json`);
  const mat = readJson(`work/${slug}/materials.json`);
  if (mat) mat.photos = photoList(mat.photos);
  const mapsRaw = readJson(`work/${slug}/maps.json`);
  const maps = Array.isArray(mapsRaw) ? mapsRaw[0] : mapsRaw;

  if (!place) {
    console.error(`✗ ${slug}: sites/${slug}/place.json missing`);
    failedCount++;
    return;
  }

  // 1. Approved & data_source
  if (place.approved !== false) fails.push('item 9: approved must be false');
  if (!norm(place.data_source)) fails.push('item 1: data_source is missing');

  // 2. Facts vs maps.json / materials.json
  const srcPhone = maps?.phone || mat?.facts?.phone || mat?.phone || null;
  if (place.phone?.tel) {
    if (!/^\+\d{8,15}$/.test(place.phone.tel)) fails.push(`item 2: invalid phone.tel "${place.phone.tel}"`);
    if (srcPhone && digits(place.phone.tel) !== digits(srcPhone)) {
      fails.push(`item 2: phone mismatch (place=${place.phone.tel}, source=${srcPhone})`);
    }
  }

  // WhatsApp strictly requires confirmation
  const waConfirmed = mat?.whatsapp_confirmed === true || String(mat?.whatsapp_confirmed).toUpperCase() === 'TRUE';
  if (place.whatsapp && !waConfirmed) {
    fails.push('item 2: whatsapp present in place.json but whatsapp_confirmed is not true in materials.json');
  }

  // 3. Rating exact match
  const srcRating = maps?.rating ?? mat?.facts?.rating?.value ?? mat?.rating?.value ?? null;
  const srcCount = maps?.reviews_count ?? mat?.facts?.rating?.count ?? mat?.rating?.count ?? null;
  if (place.rating) {
    if (srcRating != null && Number(place.rating.value) !== Number(srcRating)) {
      fails.push(`item 3: rating.value mismatch (place=${place.rating.value}, source=${srcRating})`);
    }
    if (srcCount != null && Number(place.rating.count) !== Number(srcCount)) {
      fails.push(`item 3: rating.count mismatch (place=${place.rating.count}, source=${srcCount})`);
    }
  }

  // 4. Reviews copied word-for-word from sources
  const srcReviews = [
    ...(maps?.reviews || []),
    ...(mat?.reviews || []),
    ...(mat?.review_candidates || [])
  ];
  const srcById = new Map();
  for (const r of srcReviews) {
    const id = r.review_id || r.source_ref;
    if (id) srcById.set(String(id), r);
  }
  const placeReviews = place.reviews || [];
  if (srcCount != null && srcCount >= 100 && placeReviews.length < 3 && srcReviews.length >= 3) {
    fails.push(`item 4: place has ${srcCount} reviews but place.json only includes ${placeReviews.length}`);
  }
  for (const r of placeReviews) {
    const txt = norm(r.text);
    if (txt.length > 285) fails.push(`item 4: review by "${r.author}" exceeds 280 chars (${txt.length})`);
    if (!r.source_ref) { fails.push(`item 4: review by "${r.author}" missing source_ref`); continue; }
    const orig = srcById.get(String(r.source_ref));
    if (orig) {
      if (orig.stars != null && r.stars != null && Number(orig.stars) !== Number(r.stars)) {
        fails.push(`item 4: review stars mismatch for ${r.source_ref} (place=${r.stars}, source=${orig.stars})`);
      }
      const origTxt = norm(orig.text);
      const checkPrefix = txt.replace(/…$/, '').replace(/\.{3}$/, '').slice(0, 60);
      if (checkPrefix.length >= 20 && !origTxt.includes(checkPrefix)) {
        fails.push(`item 4: review text altered for ${r.source_ref}`);
      }
    } else if (!/^https?:\/\//.test(String(r.source_ref))) {
      warnings.push(`item 4: review ${r.source_ref} not found in local maps/materials snapshot`);
    }
  }

  // 5. Mentions word limit
  for (const m of place.mentions || []) {
    const words = norm(m).split(/\s+/).filter(Boolean);
    if (words.length > 4) fails.push(`item 5: mention "${m}" has ${words.length} words (max 4)`);
  }

  // 6. Menu honesty rules
  let needsMenuCheck = false;
  if (place.menu) {
    if (place.theme === 'clinic_clean') {
      if (place.menu.kind !== 'services') fails.push('item 6: clinic_clean must use menu.kind="services"');
      const priced = (place.menu.categories || []).flatMap((c) => c.items || []).filter((i) => i.price != null);
      if (priced.length) fails.push(`item 6: clinic_clean must not include prices (${priced.length} priced items)`);
    } else if (place.menu.sample === false) {
      if (!norm(place.menu.note)) fails.push('item 6: real menu (sample:false) must include note naming the source');
      needsMenuCheck = true; // external real menu can be spot-checked if needed
    } else if (place.menu.sample === true && !norm(place.menu.note)) {
      fails.push('item 6: sample menu must include visible note');
    }
  }

  // 7. Photos: files exist, registered in materials, no duplicate file across slots
  const matFiles = new Set((mat?.photos || []).map((p) => p.file));
  const usedFiles = new Map();
  for (const [k, img] of Object.entries(place.images || {})) {
    if (img?.file) {
      if (!existsSync(`sites/${slug}/img/${img.file}`)) {
        fails.push(`item 7: image file sites/${slug}/img/${img.file} missing`);
      }
      if (matFiles.size && !matFiles.has(img.file)) {
        warnings.push(`item 7: images.${k} (${img.file}) not listed in materials.photos`);
      }
      if (!img.source_url || !img.credit) fails.push(`item 7: images.${k} missing source_url or credit`);
      if (usedFiles.has(img.file)) {
        warnings.push(`item 7: duplicate photo file "${img.file}" used in both "${usedFiles.get(img.file)}" and "${k}"`);
      } else usedFiles.set(img.file, k);
    } else if (img?.id && !String(img.alt || '').startsWith('صورة توضيحية')) {
      fails.push(`item 7: Unsplash images.${k}.alt must start with "صورة توضيحية"`);
    }
  }

  // 8. Copy banned slogans
  const copyTexts = [
    place.hero?.headline,
    place.hero?.intro,
    ...(place.story?.items || []).flatMap((i) => [i.title, i.text]),
    ...(place.marquee?.items || [])
  ].filter(Boolean);
  for (const t of copyTexts) {
    for (const re of BANNED_SLOGANS) {
      if (re.test(t)) fails.push(`item 8: banned slogan matched "${t.match(re)[0]}" in copy`);
    }
  }

  const verdict = fails.length ? 'fail' : 'pass';
  if (fails.length) failedCount++;
  const out = { slug, verdict, fails, warnings, needs_menu_check: needsMenuCheck };
  mkdirSync(`work/${slug}`, { recursive: true });
  writeFileSync(`work/${slug}/honesty-auto.json`, JSON.stringify(out, null, 1) + '\n');
  console.log(`${fails.length ? '✗' : '✓'} ${slug} honesty-auto ${verdict}${fails.length ? ': ' + fails.join(' · ') : ''}${warnings.length ? ` (warnings ${warnings.length})` : ''}`);
}
