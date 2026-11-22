#!/usr/bin/env node
// Free local Google Maps scraper via Playwright + system Chrome (same JSON shape as scripts/apify-places.mjs).
// Usage:
//   node scripts/maps-local.mjs place "<google maps place url>" [images=12] [reviews=15] > work/<slug>/maps.json
//   node scripts/maps-local.mjs search "<query>" "<city, country>" [max=20] > work/_leads/raw.json
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const [mode, a, b, c] = process.argv.slice(2);
if (!((mode === 'place' && a) || (mode === 'search' && a && b))) {
  console.error('usage: place "<maps url>" [images=12] [reviews=15] | search "<query>" "<city, country>" [max=20]');
  process.exit(2);
}

const chromePath = process.env.CHROME_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);

async function checkBlocked(page) {
  const url = page.url();
  if (/google\.[^/]+\/sorry\//i.test(url)) {
    console.error('BLOCKED: Google unusual-traffic/CAPTCHA page detected.');
    process.exit(3);
  }
  const hasCaptcha = await page.evaluate(() => {
    const t = document.body?.innerText || '';
    return /unusual traffic from your computer|i'm not a robot|recaptcha/i.test(t) ||
      !!document.querySelector('iframe[src*="recaptcha"], #captcha-form');
  }).catch(() => false);
  if (hasCaptcha) {
    console.error('BLOCKED: CAPTCHA detected.');
    process.exit(3);
  }
}

async function dismissConsent(page) {
  try {
    const btn = page.locator('button:has-text("Accept all"), button:has-text("Reject all"), button:has-text("I agree")').first();
    if (await btn.isVisible({ timeout: 2500 })) {
      await btn.click();
      await page.waitForTimeout(1500);
    }
  } catch {}
}

function normalizePhotoUrl(u) {
  if (!u || !/googleusercontent\.com\/(p|gps-cs-s|gps-proxy)\//i.test(u)) return null;
  if (/=s\d+-c-rp|a-\/ALV|\/a\/ACg8/i.test(u)) return null; // skip user avatars
  return u.replace(/=[whs]\d+[^"'\s)]*$/i, '=w1600');
}

function parsePlaceId(url, fallback) {
  try {
    const u = new URL(url);
    const qp = u.searchParams.get('query_place_id');
    if (qp) return qp;
  } catch {}
  const m = url.match(/!19s(ChIJ[A-Za-z0-9_-]+)/);
  return m ? m[1] : (fallback || null);
}

function parseAddressParts(address) {
  if (!address) return { area: null, city: null };
  const parts = address.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  // Typical Gulf address: "Street, Neighborhood, City Postal, Country"
  const city = parts.length >= 2 ? parts[parts.length - 2].replace(/\d{4,}/g, '').trim() : null;
  const area = parts.length >= 3 ? parts[parts.length - 3].replace(/\d{4,}/g, '').trim() : (parts[0] || null);
  return { area: area || null, city: city || null };
}

async function scrapePlace(page, inputUrl, maxImages, maxReviews) {
  const targetUrl = inputUrl.includes('hl=') ? inputUrl : (inputUrl.includes('?') ? `${inputUrl}&hl=en` : `${inputUrl}?hl=en`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  await dismissConsent(page);
  await checkBlocked(page);

  // Wait for place heading (or if search returned multiple results, click the first result)
  let h1Ready = await page.locator('h1.DUwDvf, h1[class*="fontHeadline"]').first().isVisible({ timeout: 10000 }).catch(() => false);
  if (!h1Ready) {
    const firstCard = page.locator('a.hfpxzc').first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(3000);
      h1Ready = await page.locator('h1.DUwDvf, h1[class*="fontHeadline"]').first().isVisible({ timeout: 10000 }).catch(() => false);
    }
  }
  await checkBlocked(page);
  if (!h1Ready) {
    console.error('Could not load place details page on Google Maps.');
    process.exit(1);
  }
  await page.waitForTimeout(1500);

  // Expand hours if collapsed
  try {
    const hoursBtn = page.locator('[data-item-id="oh"], button[aria-label*="Hours"], div[aria-label*="Hours"][role="button"], button[data-item-id*="oh"]').first();
    if (await hoursBtn.isVisible({ timeout: 2000 })) {
      await hoursBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch {}

  const basic = await page.evaluate(() => {
    const text = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
    const attr = (sel, a) => document.querySelector(sel)?.getAttribute(a) || null;
    const name = text('h1.DUwDvf') || text('h1');
    const category = text('button.DkEaL') || text('button[jsaction*="category"]');
    const addressBtn = document.querySelector('button[data-item-id="address"]');
    const address = addressBtn?.querySelector('.Io6YTe')?.textContent?.trim()
      || addressBtn?.getAttribute('aria-label')?.replace(/^Address:\s*/i, '').trim() || null;
    const phoneBtn = document.querySelector('button[data-item-id^="phone:"]');
    const phone = phoneBtn?.querySelector('.Io6YTe')?.textContent?.trim()
      || phoneBtn?.getAttribute('data-item-id')?.replace(/^phone:tel:/i, '').trim() || null;
    const webLink = document.querySelector('a[data-item-id="authority"]');
    const website = webLink?.getAttribute('href') || null;

    // Rating and reviews count
    let rating = null;
    let reviews_count = null;
    const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
    if (ratingEl) {
      const n = parseFloat(ratingEl.textContent.replace(',', '.'));
      if (!Number.isNaN(n)) rating = n;
    }
    const reviewsBtn = document.querySelector('div.F7nice span[aria-label*="review"], button[aria-label*="review"]');
    if (reviewsBtn) {
      const m = (reviewsBtn.getAttribute('aria-label') || reviewsBtn.textContent || '').replace(/,/g, '').match(/(\d+)/);
      if (m) reviews_count = parseInt(m[1], 10);
    }

    // Closed status
    const bodyText = document.body?.innerText || '';
    const closed = /\b(Permanently closed|Temporarily closed)\b/i.test(bodyText);

    // Opening hours table
    const hours = [];
    document.querySelectorAll('table.eK4R0e tr, table.WgFkxc tr').forEach((tr) => {
      const tds = [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
      if (tds.length >= 2) {
        const day = tds[0].replace(/,$/, '').trim();
        const times = tds[1].replace(/\u202f/g, ' ').trim();
        if (day && times) hours.push(`${day}: ${times}`);
      }
    });
    if (!hours.length) {
      const ariaHours = document.querySelector('[aria-label*="Hide open hours"], [aria-label*="Sunday"], [aria-label*="Monday"]')?.getAttribute('aria-label');
      if (ariaHours && ariaHours.includes(';')) {
        ariaHours.split(';').map((s) => s.trim()).filter(Boolean).forEach((entry) => {
          if (/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)/i.test(entry)) {
            hours.push(entry.replace(/,\s*/, ': ').replace(/\.\s*Hide open hours.*$/i, '').trim());
          }
        });
      }
    }

    // Initial photos on overview
    const photos = [];
    document.querySelectorAll('img[src*="googleusercontent.com"]').forEach((img) => {
      if (img.src) photos.push(img.src);
    });

    return { name, category, address, phone, website, rating, reviews_count, closed, hours: [...new Set(hours)], photos };
  });

  const resolvedUrl = page.url();
  const place_id = parsePlaceId(inputUrl) || parsePlaceId(resolvedUrl);
  const { area, city } = parseAddressParts(basic.address);

  // Collect Photos from Photos tab / gallery
  const photoSet = new Set();
  for (const u of basic.photos) {
    const n = normalizePhotoUrl(u);
    if (n) photoSet.add(n);
  }
  if (maxImages > 0) {
    try {
      const heroPhotoBtn = page.locator('button[aria-label^="Photo of"], button.aoRNLd').first();
      if (await heroPhotoBtn.isVisible({ timeout: 3000 })) {
        await heroPhotoBtn.click();
        await page.waitForTimeout(2000);
        // Scroll gallery container to collect more photos
        for (let i = 0; i < 4 && photoSet.size < maxImages + 4; i++) {
          const urls = await page.evaluate(() => {
            const out = [];
            document.querySelectorAll('div[style*="googleusercontent.com"], img[src*="googleusercontent.com"], a[style*="googleusercontent.com"]').forEach((el) => {
              if (el.tagName === 'IMG' && el.src) out.push(el.src);
              const bg = el.style?.backgroundImage || getComputedStyle(el).backgroundImage || '';
              const m = bg.match(/url\(["']?(https:\/\/[^"')]+)["']?\)/);
              if (m) out.push(m[1]);
            });
            return out;
          });
          for (const u of urls) {
            const n = normalizePhotoUrl(u);
            if (n) photoSet.add(n);
          }
          await page.evaluate(() => {
            const scrollers = [...document.querySelectorAll('div.m6QErb')].filter((d) => d.scrollHeight > d.clientHeight);
            scrollers.forEach((d) => { d.scrollTop += 900; });
          });
          await page.waitForTimeout(900);
        }
        // Go back from photo gallery to place panel
        const backBtn = page.locator('button[aria-label="Back"]').first();
        if (await backBtn.isVisible({ timeout: 2000 })) {
          await backBtn.click();
          await page.waitForTimeout(1500);
        }
      }
    } catch {}
  }

  // Collect Amenities from About tab
  const amenities = [];
  try {
    const aboutTab = page.locator('button[role="tab"]:has-text("About")').first();
    if (await aboutTab.isVisible({ timeout: 2500 })) {
      await aboutTab.click();
      await page.waitForTimeout(1500);
      const found = await page.evaluate(() => {
        const res = [];
        document.querySelectorAll('div.iP2t7d').forEach((sec) => {
          const heading = sec.querySelector('h2')?.textContent?.trim() || 'Info';
          sec.querySelectorAll('li').forEach((li) => {
            const label = li.querySelector('span[aria-label]')?.getAttribute('aria-label') || li.textContent?.trim() || '';
            if (!label || /^no\s/i.test(label) || /not available/i.test(label)) return;
            const cleanLabel = li.textContent?.replace(/\s+/g, ' ').trim();
            if (cleanLabel) res.push(`${heading}: ${cleanLabel}`);
          });
        });
        return res;
      });
      amenities.push(...new Set(found));
    }
  } catch {}

  // Collect Reviews from Reviews tab
  const reviews = [];
  if (maxReviews > 0) {
    try {
      const reviewsTab = page.locator('button[role="tab"]:has-text("Reviews")').first();
      if (await reviewsTab.isVisible({ timeout: 3000 })) {
        await reviewsTab.click();
        await page.waitForTimeout(2000);
        // Scroll reviews list
        for (let i = 0; i < 6; i++) {
          const count = await page.locator('div.jftiEf').count();
          if (count >= maxReviews) break;
          await page.evaluate(() => {
            const scrollers = [...document.querySelectorAll('div.m6QErb.DxyBCb')];
            scrollers.forEach((d) => { d.scrollTop += 1400; });
          });
          await page.waitForTimeout(1000);
        }
        // Expand truncated "More" review buttons
        const moreBtns = page.locator('div.jftiEf button.w8nwRe');
        const moreCount = Math.min(await moreBtns.count(), maxReviews);
        for (let i = 0; i < moreCount; i++) {
          await moreBtns.nth(i).click().catch(() => {});
        }
        await page.waitForTimeout(500);

        const rawReviews = await page.evaluate((limit) => {
          const out = [];
          const cards = [...document.querySelectorAll('div.jftiEf')].slice(0, limit * 2);
          for (const card of cards) {
            const text = card.querySelector('span.wiI7pd')?.textContent?.replace(/\s+/g, ' ').trim();
            if (!text) continue;
            const author = card.querySelector('div.d4r55')?.textContent?.trim() || 'Guest';
            const starLabel = card.querySelector('span.kvMYJc')?.getAttribute('aria-label') || '';
            const sm = starLabel.match(/(\d)/);
            const stars = sm ? parseInt(sm[1], 10) : null;
            const date = card.querySelector('span.rsqaWe')?.textContent?.trim() || null;
            const review_id = card.getAttribute('data-review-id') || null;
            out.push({ review_id, author, stars, text, date });
            if (out.length >= limit) break;
          }
          return out;
        }, maxReviews);

        for (const r of rawReviews) {
          reviews.push({
            review_id: r.review_id || `local-${createHash('sha1').update(`${r.author}|${r.text}`).digest('hex').slice(0, 12)}`,
            author: r.author,
            stars: r.stars,
            text: r.text,
            date: r.date
          });
        }
      }
    } catch {}
  }

  return [{
    name: basic.name,
    category: basic.category,
    address: basic.address,
    area,
    city,
    phone: basic.phone,
    website: basic.website,
    maps_url: inputUrl,
    place_id,
    rating: basic.rating,
    reviews_count: basic.reviews_count,
    closed: basic.closed,
    hours: basic.hours,
    amenities,
    photos: [...photoSet].slice(0, maxImages),
    reviews
  }];
}

async function scrapeSearch(page, query, location, maxResults) {
  const q = encodeURIComponent(`${query} in ${location}`);
  await page.goto(`https://www.google.com/maps/search/${q}?hl=en`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  await dismissConsent(page);
  await checkBlocked(page);

  for (let i = 0; i < 8; i++) {
    const count = await page.locator('a.hfpxzc').count();
    if (count >= maxResults) break;
    await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (feed) feed.scrollTop += 1500;
    });
    await page.waitForTimeout(1000);
  }

  const items = await page.evaluate((limit) => {
    const out = [];
    const cards = [...document.querySelectorAll('div.Nv2PK')].slice(0, limit);
    for (const card of cards) {
      const linkEl = card.querySelector('a.hfpxzc');
      const name = linkEl?.getAttribute('aria-label') || card.querySelector('.qBF1Pd')?.textContent?.trim() || null;
      const maps_url = linkEl?.getAttribute('href') || null;
      const ratingTxt = card.querySelector('span.MW4etd')?.textContent?.trim();
      const rating = ratingTxt ? parseFloat(ratingTxt) : null;
      const revTxt = card.querySelector('span.UY7F9')?.textContent?.replace(/[^\d]/g, '');
      const reviews_count = revTxt ? parseInt(revTxt, 10) : null;
      const web = card.querySelector('a[data-value="Website"]')?.getAttribute('href') || null;
      const infoLines = [...card.querySelectorAll('div.W4Efsd')].map((d) => d.textContent.trim()).filter(Boolean);
      const closed = /Permanently closed|Temporarily closed/i.test(card.textContent || '');
      if (name && maps_url) {
        out.push({
          name,
          category: infoLines[0]?.split('·')[0]?.trim() || null,
          address: infoLines[0]?.split('·').slice(1).join('·').trim() || null,
          area: null,
          city: null,
          phone: null,
          website: web,
          maps_url,
          place_id: null,
          rating,
          reviews_count,
          closed
        });
      }
    }
    return out;
  }, maxResults);

  return items.map((it) => ({ ...it, place_id: parsePlaceId(it.maps_url) }));
}

const browser = await chromium.launch({
  ...(chromePath ? { executablePath: chromePath } : {}),
  headless: true,
  args: ['--lang=en-US', '--no-sandbox']
});

try {
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  const out = mode === 'place'
    ? await scrapePlace(page, a, Number(b || 12), Number(c || 15))
    : await scrapeSearch(page, a, b, Number(c || 20));
  console.log(JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
