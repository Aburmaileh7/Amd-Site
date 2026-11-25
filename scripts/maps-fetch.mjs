#!/usr/bin/env node
// Free-first Google Maps fetcher: runs scripts/maps-local.mjs first (free),
// and falls back to scripts/apify-places.mjs ONLY when local is blocked/empty/fails.
// Usage (same CLI as apify-places.mjs / maps-local.mjs):
//   node scripts/maps-fetch.mjs search "<q1|q2>" "<city, country>" [max=20] [--all-websites] [--local-only] [--apify]
//   node scripts/maps-fetch.mjs place "<google maps place url>" [images=12] [reviews=15] [--local-only] [--apify]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const rawArgs = process.argv.slice(2);
const localOnly = rawArgs.includes('--local-only');
const forceApify = rawArgs.includes('--apify');
const passArgs = rawArgs.filter((a) => a !== '--local-only' && a !== '--apify');
const mode = passArgs[0];

if (!['search', 'place'].includes(mode)) {
  console.error('usage: maps-fetch.mjs search "<q1|q2>" "<city, country>" [max=20] | place "<maps url>" [images=12] [reviews=15]');
  process.exit(2);
}

function runScript(scriptName, args) {
  return spawnSync(process.execPath, [join(DIR, scriptName), ...args], {
    encoding: 'utf8',
    maxBuffer: 25 * 1024 * 1024,
    timeout: 300 * 1000
  });
}

function isUsable(modeName, stdout) {
  try {
    const data = JSON.parse(stdout);
    if (!Array.isArray(data) || data.length === 0) return false;
    if (modeName === 'place') {
      const p = data[0];
      return !!(p?.name && ((p.photos?.length || 0) > 0 || (p.reviews?.length || 0) > 0 || (p.hours?.length || 0) > 0));
    }
    return data.some((p) => p?.name && p?.maps_url);
  } catch {
    return false;
  }
}

if (!forceApify) {
  const localArgs = passArgs.filter((a) => !a.startsWith('--min-stars=') && !a.startsWith('--lang='));
  const res = runScript('maps-local.mjs', localArgs);
  if (res.status === 0 && isUsable(mode, res.stdout)) {
    console.error(`[maps-fetch] source=local (free, ${JSON.parse(res.stdout).length} item(s))`);
    process.stdout.write(res.stdout);
    process.exit(0);
  }
  const reason = res.status === 3 ? 'CAPTCHA/blocked' : (res.stderr || `exit ${res.status}`).trim().split('\n')[0];
  if (localOnly) {
    console.error(`[maps-fetch] local failed (${reason}) and --local-only set`);
    process.exit(res.status || 1);
  }
  console.error(`[maps-fetch] local unavailable (${reason}) -> fallback=apify`);
}

const apifyArgs = passArgs.filter((a) => a !== '--without-website');
const apify = runScript('apify-places.mjs', apifyArgs);
if (apify.status !== 0) {
  if (apify.stderr) process.stderr.write(apify.stderr);
  process.exit(apify.status || 1);
}
console.error(`[maps-fetch] source=apify (fallback)`);
process.stdout.write(apify.stdout);
