// Filters Apify search results into accepted / needs_channel / rejected leads with reasons and slugs (no LLM).
// Usage: node scripts/lead-filter.mjs <apify-search.json> [minReviews=10] > leads.json
// Rejected: closed, real website, no phone, too few reviews, slug already ours.
// Channel (owner rule): a public Instagram handle OR a public WhatsApp link (wa.me / api.whatsapp). Phone alone is not a channel.
// Channel found → accepted. None detectable in Apify data → needs_channel (researcher looks it up with WebSearch).
import { readFileSync, existsSync } from 'node:fs';

const [file, min = '10'] = process.argv.slice(2);
if (!file) { console.error('usage: lead-filter.mjs <apify-search.json> [minReviews]'); process.exit(2); }
const places = JSON.parse(readFileSync(file, 'utf8'));
const SOCIAL = /(instagram|facebook|tiktok|linktr\.ee|wa\.me|whatsapp|snapchat|x\.com|twitter|talabat|deliveroo|keeta|hungerstation|jahez|careem|google\.)/i;
const IG = /instagram\.com\/([A-Za-z0-9._]{1,30})/i;
const IG_SKIP = /^(p|reel|reels|explore|stories|accounts|tv)$/i;
const WA = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?(?:[^"'\s]*&)?phone=|whatsapp\.com\/send\?phone=)\+?(\d{6,15})/i;

const slugify = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');

const sitePlaceId = (slug) => {
  try { return JSON.parse(readFileSync(`sites/${slug}/place.json`, 'utf8')).place_id; } catch { return null; }
};

// Every URL-ish string Apify may carry: website, instagram(s), social/social_links, menu/booking links.
const linkText = (p) => JSON.stringify([p.website, p.instagram, p.instagrams, p.social, p.social_links,
  p.socialMedia, p.socialProfiles, p.whatsapp, p.links, p.menu, p.reserveTableUrl, p.bookingLinks]
  .filter(Boolean));

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
  const ch = channels(p);
  const row = { ...p, slug, ...ch };
  if (why.length) rejected.push({ ...row, reason: why.join('، ') });
  else if (ch.instagram || ch.whatsapp) {
    const via = [ch.instagram && 'إنستغرام', ch.whatsapp && 'واتساب'].filter(Boolean).join(' و');
    accepted.push({ ...row, reason: `بلا موقع، مفتوح، له ${via}` });
  } else needs_channel.push({ ...row, reason: 'لا إنستغرام ولا واتساب في بيانات Apify: ابحث عن حسابه' });
}
console.log(JSON.stringify({ accepted, needs_channel, rejected }, null, 1));
console.error(`accepted ${accepted.length}, needs_channel ${needs_channel.length}, rejected ${rejected.length}`);
