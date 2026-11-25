#!/usr/bin/env node
// Google Maps data through Apify (actor compass/crawler-google-places). Token: ~/.config/amd-web/apify-token
// Prefer scripts/maps-fetch.mjs (tries free maps-local.mjs first, falls back here only if blocked).
// Search: node scripts/apify-places.mjs search "<q1|q2>" "<city, country>" [max=20] [--all-websites] [--min-stars=three] [--lang=en]
// Place:  node scripts/apify-places.mjs place "<google maps place url>" [images=12] [reviews=15] [--lang=en]
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const rawArgs = process.argv.slice(2);
const flags = rawArgs.filter((x) => x.startsWith('--'));
const pos = rawArgs.filter((x) => !x.startsWith('--'));
const [mode, a, b, c] = pos;

const flagVal = (name, def) => {
  const hit = flags.find((f) => f.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const allWebsites = flags.includes('--all-websites');
const lang = flagVal('lang', 'en');
const minStars = flagVal('min-stars', 'three');

const token = readFileSync(`${homedir()}/.config/amd-web/apify-token`, 'utf8').trim();
const ACTOR = 'compass~crawler-google-places';

let input;
if (mode === 'search' && a && b) {
  const queries = a.split('|').map((s) => s.trim()).filter(Boolean);
  input = {
    searchStringsArray: queries,
    locationQuery: b,
    maxCrawledPlacesPerSearch: Number(c || 20),
    language: lang,
    skipClosedPlaces: true,
    website: allWebsites ? 'allPlaces' : 'withoutWebsite',
    ...(minStars && minStars !== 'none' ? { placeMinimumStars: minStars } : {}),
    maxImages: 0,
    maxReviews: 0,
    scrapeContacts: false,
    scrapeDirectories: false,
    includeWebResults: false,
    scrapePlaceDetailPage: false
  };
} else if (mode === 'place' && a) {
  input = {
    startUrls: [{ url: a }],
    maxCrawledPlacesPerSearch: 1,
    language: lang,
    maxImages: Number(b || 12),
    maxReviews: Number(c || 15),
    reviewsSort: 'mostRelevant',
    scrapeImageAuthors: false,
    scrapeContacts: false,
    scrapeDirectories: false,
    includeWebResults: false
  };
} else {
  console.error('usage: search "<q1|q2>" "<city, country>" [max=20] [--all-websites] [--min-stars=three] [--lang=en] | place "<maps url>" [images=12] [reviews=15]');
  process.exit(2);
}

const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=280`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(input)
});
if (!res.ok) {
  console.error(`Apify error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const rawItems = await res.json();

// Deduplicate across multi-query searches by placeId or url
const seen = new Set();
const items = [];
for (const p of rawItems) {
  const key = p.placeId || p.url || `${p.title}|${p.address}`;
  if (seen.has(key)) continue;
  seen.add(key);
  items.push(p);
}

const base = (p) => ({
  name: p.title,
  category: p.categoryName,
  address: p.address,
  area: p.neighborhood || null,
  city: p.city || null,
  phone: p.phoneUnformatted || p.phone || null,
  website: p.website || null,
  maps_url: p.url,
  place_id: p.placeId || null,
  rating: p.totalScore ?? null,
  reviews_count: p.reviewsCount ?? null,
  images_count: p.imagesCount ?? null,
  closed: !!(p.permanentlyClosed || p.temporarilyClosed),
  ...(p.menu ? { menu: p.menu } : {}),
  ...(p.reserveTableUrl ? { reserve_url: p.reserveTableUrl } : {}),
  ...(p.bookingLinks?.length ? { booking_links: p.bookingLinks } : {}),
  ...(p.instagrams?.length ? { instagrams: p.instagrams } : {}),
  ...(p.socialMedia?.length ? { social_links: p.socialMedia } : {})
});

const out = mode === 'search'
  ? items.map(base)
  : items.map((p) => ({
      ...base(p),
      hours: (p.openingHours || []).map((h) => `${h.day}: ${h.hours}`),
      amenities: Object.entries(p.additionalInfo || {}).flatMap(([k, v]) =>
        (v || []).flatMap((o) => Object.entries(o).filter(([, on]) => on).map(([n]) => `${k}: ${n}`))
      ),
      photos: p.imageUrls || [],
      reviews: (p.reviews || [])
        .filter((r) => r.text)
        .map((r) => ({
          review_id: r.reviewId,
          author: r.name,
          stars: r.stars,
          text: r.text,
          date: r.publishedAtDate?.slice(0, 10)
        }))
    }));

console.log(JSON.stringify(out, null, 1));
