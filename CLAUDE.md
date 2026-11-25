# Amd web — repo guide

Astro + GSAP demo sites factory. One folder per business: `sites/<slug>/place.json` (+ `img/`, `site.css`, `site.js`) → built to `/<slug>/` and deployed via GitHub Actions to `https://amd-demos.pages.dev/<slug>/`.

## Mandatory rules
1. Read `COMPANY.md` first — its three rules override everything.
2. Follow your role card (`.claude/agents/amd-*.md`) and listed skills only; do not read `src/`, other sites, or unrelated files.
3. Never push directly to `main`, never commit `dist/` or `qa-out/`. Use `scripts/ship.mjs <slug...>` to validate, build, QA, commit `sites/<slug>/`, push a `claude/...` branch, and verify live deploy.
4. Keep `approved: false` on every demo site (preview banner + `noindex`).
5. Never use `mcp__claude-in-chrome__*` (the owner's personal Chrome).

## Fixed tools (zero LLM — always prefer over manual work)
- Maps fetch (free-first, Apify fallback): `node scripts/maps-fetch.mjs search "<q1|q2>" "<city, country>" [max] | place "<url>" [imgs] [revs]`
- Lead filter: `node scripts/lead-filter.mjs <raw.json> [minReviews=10]`
- Materials & photos: `node scripts/materials.mjs <slug> [--pick ...]`
- Build & validate `place.json`: `node scripts/build-place.mjs <slug>` · `node scripts/siblings.mjs <theme>`
- Batch ship & gates: `scripts/ship.mjs`, `scripts/prod-check.mjs`, `scripts/perf-check.mjs`, `scripts/honesty-check.mjs`, `scripts/quality-gate.mjs`, `scripts/msg-check.mjs`, `scripts/go-log-check.mjs`, `scripts/cost-report.mjs`

## Code changes (only when explicitly requested)
Prefer data over code. If modifying `src/`, keep changes generic across all sites and run `npm run validate && npm run build`.
