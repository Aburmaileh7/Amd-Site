#!/usr/bin/env node
// Automatic sales message check + Notion send-button builder (no LLM).
// Checks length, live URL, exact signature, banned terms/prices/placeholders before calling sales manager.
// Usage: node scripts/msg-check.mjs <slug> [...]
// Writes work/<slug>/msg-check.json; prints one line per slug; exit 1 if any slug fails.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('usage: msg-check.mjs <slug> [...]');
  process.exit(2);
}

const PLACEHOLDER_RE = /\[[^\]]{2,30}\]|<[^>\s]{2,30}>|\bXXX\b|اسمك|الرابط هنا/i;
const BANNED_RE = [
  [/(\d+\s*(?:ر\.س|د\.إ|د\.ك|د\.أ|د\.ب|ر\.ق|ر\.ع|دولار|\$|USD|SAR|AED|KWD))/i, 'contains price'],
  [/خصم|عرض\s+لفترة\s+محدودة|سعر\s+خاص|تخفيض/i, 'contains discount/pressure language'],
  [/مضمون|نضمن\s+لك|صدارة\s+جوجل|زيادة\s+مبيعات/i, 'contains prohibited promise']
];

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const digits = (s) => String(s || '').replace(/\D/g, '');
const extractIgUser = (s) => {
  const m = String(s || '').match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i);
  if (m) return m[1].replace(/\.$/, '');
  const clean = String(s || '').trim().replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(clean) ? clean : null;
};

let failedCount = 0;

for (const slug of slugs) {
  const fails = [];
  const msgPath = `work/${slug}/message.txt`;
  if (!existsSync(msgPath)) {
    console.error(`✗ ${slug}: ${msgPath} missing`);
    failedCount++;
    continue;
  }

  const raw = readFileSync(msgPath, 'utf8').trim();
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const liveUrl = `https://amd-demos.pages.dev/${slug}/`;

  if (lines.length < 5 || lines.length > 9) {
    fails.push(`line count ${lines.length} (want 5–8 lines)`);
  }
  if (!raw.includes(liveUrl)) {
    fails.push(`missing exact live URL ${liveUrl}`);
  }
  if (!raw.includes('تجريبية')) {
    fails.push('must describe the site as a demo (تجريبية)');
  }
  if (!raw.includes('مع التحية،') || !raw.includes('محمد — Amd web')) {
    fails.push('missing exact signature ("مع التحية،" + "محمد — Amd web")');
  }
  if (PLACEHOLDER_RE.test(raw)) {
    fails.push(`contains placeholder: ${raw.match(PLACEHOLDER_RE)[0]}`);
  }
  for (const [re, reason] of BANNED_RE) {
    if (re.test(raw)) fails.push(`${reason} (${raw.match(re)[0]})`);
  }

  // Build ready-to-paste Notion /go/ buttons from materials.json (never opened!)
  const mat = readJson(`work/${slug}/materials.json`) || {};
  const waConfirmed = mat.whatsapp_confirmed === true || String(mat.whatsapp_confirmed).toUpperCase() === 'TRUE';
  const rawWa = typeof mat.whatsapp === 'object' ? mat.whatsapp?.number : mat.whatsapp;
  const waDigits = waConfirmed ? digits(rawWa || mat.facts?.phone || mat.phone) : '';
  const igUser = extractIgUser(mat.facts?.instagram || mat.instagram);

  const buttons = {
    wa: waDigits
      ? `https://amd-demos.pages.dev/go/${slug}?c=wa&to=${encodeURIComponent(`https://wa.me/${waDigits}?text=${encodeURIComponent(raw)}`)}`
      : null,
    ig: igUser
      ? `https://amd-demos.pages.dev/go/${slug}?c=ig&to=${encodeURIComponent(`https://ig.me/m/${igUser}`)}`
      : null
  };

  const verdict = fails.length ? 'fail' : 'pass';
  if (fails.length) failedCount++;
  mkdirSync(`work/${slug}`, { recursive: true });
  writeFileSync(`work/${slug}/msg-check.json`, JSON.stringify({ slug, verdict, lines: lines.length, fails, buttons }, null, 1) + '\n');
  console.log(`${fails.length ? '✗' : '✓'} ${slug} msg-check ${verdict} (${lines.length} lines)${fails.length ? ': ' + fails.join(' · ') : ''}`);
}

process.exit(failedCount ? 1 : 0);
