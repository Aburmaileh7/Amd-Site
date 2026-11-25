#!/usr/bin/env node
// One line per existing site: what the designer must NOT copy.  node scripts/siblings.mjs [theme]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
const want = process.argv[2];
for (const s of readdirSync('sites').sort()) {
  const f = `sites/${s}/place.json`;
  if (!existsSync(f)) continue;
  let p; try { p = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  if (want && p.theme !== want) continue;
  const css = existsSync(`sites/${s}/site.css`) ? readFileSync(`sites/${s}/site.css`, 'utf8') : '';
  const sig = p.motion?.signature || (css.match(/\/\*\s*([^*]{4,60})/) || [])[1]?.trim() || '-';
  console.log([s, p.theme, `hero:${p.layout?.hero || '-'}`, `story:${p.layout?.story || '-'}`, `accent:${p.accent?.hex || '-'}`,
    `motion:${p.motion?.hero || '-'}`, (p.sections || []).join('>'), `sig:${sig}`].join(' | '));
}
