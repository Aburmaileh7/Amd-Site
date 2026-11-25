#!/usr/bin/env node
// Filters Google Maps search results into accepted / needs_channel / rejected leads (no LLM).
// Usage: node scripts/lead-filter.mjs <search.json> [minReviews=10] [--min-rating=3.0] > leads.json
// Rejected: closed, real website, rating < 3.0, too few reviews, zero photos (when reported), already ours.
// Owner channel rule: public Instagram OR public WhatsApp link (wa.me). Phone is NOT required and alone is not a channel.
// Arabic-only business names are transliterated automatically into valid latin slugs.
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const rawArgs = process.argv.slice(2);
const flags = rawArgs.filter((x) => x.startsWith('--'));
const pos = rawArgs.filter((x) => !x.startsWith('--'));
const [file, minRevPos] = pos;
if (!file) {
  console.error('usage: lead-filter.mjs <search.json> [minReviews=10] [--min-rating=3.0]');
  process.exit(2);
}

const flagVal = (name, def) => {
  const hit = flags.find((f) => f.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const minReviews = Number(flagVal('min-reviews', minRevPos || '10'));
const minRating = Number(flagVal('min-rating', '3.0'));

const places = JSON.parse(readFileSync(file, 'utf8'));
const SOCIAL = /(instagram|facebook|tiktok|linktr\.ee|beacons\.ai|taplink|bio\.link|wa\.me|whatsapp|snapchat|x\.com|twitter|talabat|deliveroo|keeta|hungerstation|jahez|careem|snoonu|rafeeq|mrsool|thechefz|toyou|fresha|booksy|zomato|google\.)/i;
const IG = /instagram\.com\/([A-Za-z0-9._]{1,30})/i;
const IG_SKIP = /^(p|reel|reels|explore|stories|accounts|tv|about|legal|developer)$/i;
const WA = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?(?:[^"'\s]*&)?phone=|whatsapp\.com\/send\?phone=)\+?(\d{6,15})/i;

// Arabic-to-Latin transliteration so Arabic-only business names produce clean slugs
const AR_MAP = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ى': 'a', 'ء': '', 'ئ': 'y', 'ؤ': 'w',
  'ب': 'b', 'ت': 't', 'ة': 'a', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's',
  'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};
const transliterateArabic = (s) => String(s || '')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // strip diacritics & tatweel
  .replace(/(^|\s)ال(?=[\u0621-\u064A])/g, '$1al-')
  .replace(/[\u0621-\u064A\u0660-\u0669]/g, (ch) => AR_MAP[ch] ?? '');

const slugify = (s) => {
  const raw = String(s || '');
  // If name has a latin segment (e.g. "Hamh Cafe | هامه"), prefer the latin part first
  const latinOnly = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const base = latinOnly.length >= 3
    ? latinOnly
    : transliterateArabic(raw).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base.slice(0, 48).replace(/-+$/, '');
};

// Index all existing sites by place_id so renamed slugs don't cause duplicates
const existingByPlaceId = new Map();
const existingSlugs = new Set();
if (existsSync('sites')) {
  for (const d of readdirSync('sites', { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    existingSlugs.add(d.name);
    try {
      const pid = JSON.parse(readFileSync(`sites/${d.name}/place.json`, 'utf8')).place_id;
      if (pid) existingByPlaceId.set(pid, d.name);
    } catch {}
  }
}

const linkText = (p) => JSON.stringify([
  p.website, p.instagram, p.instagrams, p.social, p.social_links,
  p.socialMedia, p.socialProfiles, p.whatsapp, p.links, p.menu,
  p.reserve_url, p.reserveTableUrl, p.booking_links, p.bookingLinks
].filter(Boolean));

const channels = (p) => {
  const text = linkText(p).replace(/\\\//g, '/');
  const ig = text.match(IG);
  const handle = ig && !IG_SKIP.test(ig[1]) ? ig[1].replace(/\.$/, '') : null;
  const wa = text.match(WA);
  return {
    instagram: handle ? `https://www.instagram.com/${handle}/` : null,
    whatsapp: wa ? `+${wa[1]}` : null,
    whatsapp_confirmed: wa ? 'TRUE' : 'FALSE'
  };
};

const accepted = [], needs_channel = [], rejected = [];
const seenPlaceIds = new Set();
const usedSlugs = new Set(existingSlugs);

for (const p of places) {
  const dedupKey = p.place_id || p.maps_url;
  if (dedupKey && seenPlaceIds.has(dedupKey)) continue;
  if (dedupKey) seenPlaceIds.add(dedupKey);

  const why = [];
  if (p.closed) why.push('مغلق');
  if (p.website && !SOCIAL.test(p.website)) why.push(`له موقع: ${p.website}`);
  if (p.rating != null && Number(p.rating) < minRating) why.push(`تقييم منخفض (${p.rating})`);
  if ((p.reviews_count || 0) < minReviews) why.push(`مراجعات قليلة (${p.reviews_count || 0})`);
  if (p.images_count === 0) why.push('بلا صور على خرائط Google');

  const existingSlug = p.place_id ? existingByPlaceId.get(p.place_id) : null;
  let slug = slugify(p.name);
  if (existingSlug) {
    why.push(`له موقع تجريبي عندنا: sites/${existingSlug}`);
    slug = existingSlug;
  } else if (!slug) {
    why.push('تعذّر توليد slug للاسم');
  } else if (usedSlugs.has(slug)) {
    let n = 2;
    while (usedSlugs.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }

  const ch = channels(p);
  const row = { ...p, slug, ...ch };
  if (why.length) {
    rejected.push({ ...row, reason: why.join('، ') });
  } else if (ch.instagram || ch.whatsapp) {
    usedSlugs.add(slug);
    const via = [ch.instagram && 'إنستغرام', ch.whatsapp && 'واتساب'].filter(Boolean).join(' و');
    accepted.push({ ...row, reason: `بلا موقع، مفتوح، له ${via}` });
  } else {
    usedSlugs.add(slug);
    needs_channel.push({ ...row, reason: 'لا إنستغرام ولا واتساب في البيانات: ابحث عن حسابه' });
  }
}

console.log(JSON.stringify({ accepted, needs_channel, rejected }, null, 1));
console.error(`accepted ${accepted.length}, needs_channel ${needs_channel.length}, rejected ${rejected.length}`);
