# Amd web — demo sites factory

Astro + GSAP. One folder per business: `sites/<slug>/place.json` → built to `/<slug>/`.
Deployed by GitHub Actions to Cloudflare Pages project `amd-demos` → `https://amd-demos.pages.dev/<slug>/`.

## Your job when a routine run gives you businesses (JSON in the run text)
The run text is a JSON object: `{ "batch_id": "...", "places": [ { "place_id", "slug_hint", "lead": {...}, "business_data": {...} } ] }`.
`business_data` holds Google Maps data from Apify: name, category, address, phone, rating, opening_hours, amenities, and up to 15 `reviews` each with a `review_id`.

For **each** place:
1. Pick a slug: latin lowercase with dashes from the name (e.g. `cielo-cafe`). If `sites/<slug>` exists for a *different* place_id, append `-2`.
2. Write `sites/<slug>/place.json` following `sites/san-rooftop/place.json` (rooftop), `sites/cielo-cafe/place.json` (cafe, full hero), `sites/the-couch-coffee-house/place.json` (cafe, split hero + story). Also store `"place_id"` and `"batch_id"` at the top level.
3. `npm run validate -- <slug>` must pass. Then `npm run build` and `node scripts/qa.mjs <slug>`. Look at `qa-out/<slug>/*.png` yourself (mobile + desktop) and fix anything that looks broken, empty, cramped or clipped.
4. Commit `sites/<slug>/` (place.json, img/, site.css, site.js) only (never commit dist/ or qa-out/).

When every place is done: `git pull --rebase` then push. Pushing to `main` deploys. If you can only push to a `claude/...` branch, push there; the workflow merges it into `main` and deploys.
Finally write a one-line summary per place: slug, theme, URL `https://amd-demos.pages.dev/<slug>/`, and anything the owner should verify.

## Choosing the design
| theme | when | layout defaults |
|---|---|---|
| `rooftop_dark` | rooftops, evening venues, lounges, places open late with views/terraces | full hero, horizontal pinned story |
| `cafe_light` | cafes, bakeries, dessert shops, study cafes | split hero, stacked story (use `layout.hero: "full"` for terrace/outdoor-led cafes) |
| `heritage_warm` | local/popular restaurants, breakfast/foul/falafel, grills, traditional food | full hero, stacked story |
| `clinic_clean` | dental and other medical clinics | split hero; `menu.kind: "services"` (no prices); no story, no shisha, no mentions |
| `beauty_soft` | salons, beauty centers, spas, henna, nails, barbers | split hero; `menu.kind: "services"`; story from what clients praise |
| `bakery_cream` | bakeries, patisseries, dessert and cake shops | split hero, stacked story |
| `services_pro` | law offices, training centers, agencies, startups, any non-food business | split hero; `menu.kind: "services"` (no prices); no mentions |
| `gulf_luxe` | upscale restaurants, specialty cafés and lounges in the Gulf, majlis-style places | full hero, horizontal pinned story |

Every theme gets the same motion (hero entrance, scroll reveals, parallax, counters, and the pinned horizontal story when `layout.story: "horizontal"`). Use the horizontal story when the place has 3+ strong story items, so the page moves more.

Make every site feel specific to *this* place: choose `sections` order, a `story` built from what reviews repeat (opening hours, signature items, seating), and optionally an `accent` (`{hex, rgb, hover, ink}`) that fits the place's name or mood. Two sites of the same theme must not look identical: vary accent, hero layout, story and section order.

## Honesty rules (non-negotiable)
- **Facts** (name, phone, address, hours, rating, amenities) come only from `business_data`. Missing → leave the field out; the section hides itself.
- **Reviews**: copy real reviews only, short (≤ 280 chars, trim with …), author first name + initial, `stars`, and `source_ref` = the `review_id`. Pick 4–6 positive, specific ones. Never write or edit a review's meaning. No reviews → `"reviews": []`.
- **Mentions** (`mentions`, `"mentioned": true` on menu items): only dishes/drinks named in reviews, one item per entry, ≤ 4 words.
- **Menu**: real menu is unknown, so it is a *sample*: `"sample": true` + the standard note. Realistic local prices for the category in the place's country currency, from `lead.country` (Jordan د.أ · UAE د.إ · Saudi Arabia ر.س · Qatar ر.ق · Kuwait د.ك · Oman ر.ع · Bahrain د.ب; missing → Jordan). Clinics: services only, no prices, no medical promises.
- **WhatsApp** only when `lead.whatsapp_confirmed` is `TRUE`.
- **Images — real photos of the place first**: the site must show the real place. Take 3–6 real photos of *this* business from anywhere public: its own Instagram/Facebook/TikTok/website, its Google Maps listing, delivery apps, directories, press articles. Food/drinks, the place, the work. Never photos where a person's face is the subject, never photos of a different place. Download each, resize to ≤ 1600 px wide and ≤ 600 KB, save as `sites/<slug>/img/<name>.jpg` (lowercase, dashes), and reference it as `{ "file": "<name>.jpg", "alt": "صورة …", "source_url": "<page where it was found>", "credit": "<short label, e.g. من حساب المحل / من خرائط Google>" }`. The label shows on the photo. If the business asks, remove their photos.
- **Images — fallback only**: if fewer than 3 real photos exist anywhere, fill the gaps with Unsplash: free (not Unsplash+), relevant; `alt` starts with `صورة توضيحية`. Find ids by fetching `https://unsplash.com/s/photos/<query>` and reading photo ids (`photo-…`).
- **Facts**: also real only, from any public source about this place (Google Maps, its pages, directories, articles). Set `"data_source"` to a short phrase naming where they came from.
- Copy: natural Arabic (Gulf places: neutral Gulf-friendly Arabic, no Jordanian dialect, local area names), concrete details, no empty slogans ("تجربة لا تُنسى", "الأفضل"), headline 4–9 words, intro 15–30 words.
- Keep `approved: false` (preview banner + noindex). Only the owner's approval changes it.

## Be the expert designer — no fixed template
You are a senior web designer pitching this business. The site must make the owner say "wow, this is *my* place". Before writing, decide a one-line concept from what is special about the place (e.g. "a bakery that smells of butter at 7am", "a quiet majlis with gold light"). Then:
- Pick the theme, accent, hero layout and `sections` order from that concept — never copy another site's setup.
- Use the motion system fully: `motion.hero: "kenburns"` for photo-led places, a `marquee` section (`{ "label", "items": [3–6 short real items: signature dishes, services, the area] }`), the horizontal story when there are 3+ strong items. Buttons are magnetic and photos tilt on desktop automatically; a reading-progress line runs on every site.
- Add at least one **signature moment of your own** in `sites/<slug>/site.css` and/or `sites/<slug>/site.js`, scoped with `[data-site="<slug>"]`: e.g. a texture or gradient that matches the place, a headline that animates in its own way, a section that reveals differently, a colour shift while scrolling. `site.js` runs with `gsap`, `ScrollTrigger` and `reduce` (true when the visitor prefers reduced motion — then do nothing animated). Both files ≤ 24 KB, no outside URLs, no fetch/imports; `npm run validate` checks this.
- Check QA screenshots like a picky client: hierarchy, spacing, contrast, Arabic typography, nothing clipped on mobile.

## Code changes
Prefer data over code. Change components only when a site needs something the system can't express, keep it generic (works for all sites), re-run QA on all sites after.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
