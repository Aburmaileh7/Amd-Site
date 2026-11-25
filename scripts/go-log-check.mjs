#!/usr/bin/env node
// Fetches sent-message taps from amd-demos.pages.dev/go-log (no LLM, never prints the API key).
// Filters out test taps listed in work/go-log-ignore.txt and outputs compact JSON: [{ slug, channel, date }].
// Usage: node scripts/go-log-check.mjs
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

const keyPath = `${homedir()}/.config/amd-web/go-log-key`;
if (!existsSync(keyPath)) {
  console.error('✗ go-log-key missing');
  process.exit(1);
}
const key = readFileSync(keyPath, 'utf8').trim();

const ignore = new Set();
const ignorePath = 'work/go-log-ignore.txt';
if (existsSync(ignorePath)) {
  for (const line of readFileSync(ignorePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (t && !t.startsWith('#')) ignore.add(t);
  }
}

const res = await fetch('https://amd-demos.pages.dev/go-log', {
  headers: { Authorization: `Bearer ${key}` },
  signal: AbortSignal.timeout(20000)
});
if (!res.ok) {
  console.error(`✗ go-log HTTP ${res.status}`);
  process.exit(1);
}
const raw = await res.json();
const taps = Array.isArray(raw) ? raw : (raw.taps || raw.items || []);

const bySlug = new Map();
for (const t of taps) {
  const slug = t.slug;
  const at = String(t.at || '');
  if (!slug) continue;
  if (ignore.has(slug) || ignore.has(`${slug} ${at}`) || ignore.has(at)) continue;
  const date = at.slice(0, 10);
  if (!bySlug.has(slug)) bySlug.set(slug, { slug, channel: t.channel || null, date });
}

console.log(JSON.stringify([...bySlug.values()], null, 1));
