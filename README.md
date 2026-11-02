# amd-site

مصنع المواقع التجريبية لـ Amd web. كل محل في `sites/<slug>/place.json`، ويُنشر على `https://amd-demos.pages.dev/<slug>/`.

```bash
npm ci
npm run dev                 # http://localhost:4321/<slug>/
npm run build               # validate + build all sites into dist/
node scripts/qa.mjs <slug>  # screenshots + checks (needs playwright)
```
Instructions for Claude routine runs: `CLAUDE.md` and `ROUTINE_PROMPT.md`.

## Send buttons (tracking)
`functions/` runs on Cloudflare Pages. Send buttons link to `/go/<slug>?c=wa|ig&to=<wa.me or ig.me link>`: the hop records the tap in the KV namespace bound as `GO_LOG`, then opens WhatsApp/Instagram. The daily team reads the taps from `/go-log` with `Authorization: Bearer <GO_LOG_KEY>` (key kept locally in `~/.config/amd-web/go-log-key`, and set as the `GO_LOG_KEY` secret on the Pages project).
