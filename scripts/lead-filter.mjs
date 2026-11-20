// Filters Apify search results into accepted / rejected leads with reasons and slugs (no LLM).
// Usage: node scripts/lead-filter.mjs <apify-search.json> [minReviews=20] > leads.json
// Rules: not closed, no website (or only a social/link page), has a phone, enough reviews, slug free in sites/.
import { readFileSync, existsSync } from 'node:fs';

const [file, min = '20'] = process.argv.slice(2);
if (!file) { console.error('usage: lead-filter.mjs <apify-search.json> [minReviews]'); process.exit(2); }
const places = JSON.parse(readFileSync(file, 'utf8'));
const SOCIAL = /(instagram|facebook|tiktok|linktr\.ee|wa\.me|whatsapp|snapchat|x\.com|twitter|talabat|deliveroo|keeta|hungerstation|jahez|careem|google\.)/i;

const slugify = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');

const sitePlaceId = (slug) => {
  try { return JSON.parse(readFileSync(`sites/${slug}/place.json`, 'utf8')).place_id; } catch { return null; }
};

const accepted = [], rejected = [];
for (const p of places) {
  const why = [];
  if (p.closed) why.push('مغلق');
  if (p.website && !SOCIAL.test(p.website)) why.push(`له موقع: ${p.website}`);
  if (!p.phone) why.push('بلا هاتف');
  if ((p.reviews_count || 0) < Number(min)) why.push(`مراجعات قليلة (${p.reviews_count || 0})`);
  let slug = slugify(p.name);
  if (!slug) why.push('اسم بلا حروف لاتينية: يحتاج slug يدويًا');
  else if (existsSync(`sites/${slug}/place.json`)) {
    if (sitePlaceId(slug) === p.place_id) why.push(`له موقع تجريبي عندنا: sites/${slug}`);
    else slug += '-2';
  }
  (why.length ? rejected : accepted).push({ ...p, slug, reason: why.join('، ') || 'بلا موقع، مفتوح، له هاتف' });
}
console.log(JSON.stringify({ accepted, rejected }, null, 1));
console.error(`accepted ${accepted.length}, rejected ${rejected.length}`);
