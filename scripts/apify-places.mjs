// Google Maps data through Apify (actor compass/crawler-google-places). Token: ~/.config/amd-web/apify-token
// Search (researcher):  node scripts/apify-places.mjs search "<query>" "<city, country>" [max=20] > out.json
// One place (collector): node scripts/apify-places.mjs place "<google maps place url>" [images=12] [reviews=15] > out.json
// Prints compact JSON only (no raw dump), to keep employees' context small.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const [mode, a, b, c, d] = process.argv.slice(2);
const token = readFileSync(`${homedir()}/.config/amd-web/apify-token`, 'utf8').trim();
const ACTOR = 'compass~crawler-google-places';

let input;
if (mode === 'search' && a && b) {
  input = { searchStringsArray: [a], locationQuery: b, maxCrawledPlacesPerSearch: Number(c || 20),
    language: 'en', skipClosedPlaces: true, maxImages: 0, maxReviews: 0 };
} else if (mode === 'place' && a) {
  input = { startUrls: [{ url: a }], maxCrawledPlacesPerSearch: 1, language: 'en',
    maxImages: Number(b || 12), maxReviews: Number(c || 15), reviewsSort: 'mostRelevant', scrapeImageAuthors: false };
} else {
  console.error('usage: search "<query>" "<city, country>" [max] | place "<maps url>" [images] [reviews]');
  process.exit(2);
}

const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=280`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(input)
});
if (!res.ok) { console.error(`Apify error ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
const items = await res.json();

const base = (p) => ({
  name: p.title, category: p.categoryName, address: p.address, area: p.neighborhood, city: p.city,
  phone: p.phoneUnformatted || p.phone, website: p.website || null, maps_url: p.url, place_id: p.placeId,
  rating: p.totalScore, reviews_count: p.reviewsCount, closed: !!(p.permanentlyClosed || p.temporarilyClosed)
});
const out = mode === 'search'
  ? items.map(base)
  : items.map((p) => ({
      ...base(p),
      hours: (p.openingHours || []).map((h) => `${h.day}: ${h.hours}`),
      amenities: Object.entries(p.additionalInfo || {}).flatMap(([k, v]) => (v || []).flatMap((o) => Object.entries(o).filter(([, on]) => on).map(([n]) => `${k}: ${n}`))),
      photos: p.imageUrls || [],
      reviews: (p.reviews || []).filter((r) => r.text).map((r) => ({ review_id: r.reviewId, author: r.name, stars: r.stars, text: r.text, date: r.publishedAtDate?.slice(0, 10) }))
    }));
console.log(JSON.stringify(out, null, 1));
