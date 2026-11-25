#!/usr/bin/env node
// Automatic quality gate (replaces calling Opus quality-manager on clean passes/obvious fails). No LLM.
// Usage: node scripts/quality-gate.mjs <slug> [...]
// Reads: work/<slug>/perf.json, honesty-auto.json, review-honesty.md (optional), review-design.md.
// Decides: "اجتاز" (writes quality-verdict.md directly) | "escalate" (call amd-quality-manager).
// Exit 0 on اجتاز, exit 1 on escalate/return.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('usage: quality-gate.mjs <slug> [...]');
  process.exit(2);
}

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const readText = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

function parseDesignScore(md) {
  // Matches: "التقييم: 8/10", "Score: 8.5/10", "9 / 10", "٨/١٠"
  const normalized = md.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const m = normalized.match(/\b(10|[0-9](?:\.[0-9])?)\s*\/\s*10\b/);
  return m ? parseFloat(m[1]) : null;
}

function parseHonestyMd(md) {
  const first = md.trim().split('\n')[0] || '';
  if (/^\s*(?:pass|اجتاز|نجح)\b/i.test(first) && !/\bfail|فشل|ملاحظ|خطأ/i.test(first)) return 'pass';
  if (/^\s*-\s*no\s+defects/i.test(md.trim())) return 'pass';
  return md.trim() ? 'fail' : 'missing';
}

let escalated = 0;

for (const slug of slugs) {
  const perf = readJson(`work/${slug}/perf.json`);
  const honestyAuto = readJson(`work/${slug}/honesty-auto.json`);
  const honestyMd = readText(`work/${slug}/review-honesty.md`);
  const designMd = readText(`work/${slug}/review-design.md`);

  const reasons = [];
  if (!perf) reasons.push('perf.json missing');
  else if (!perf.pass) reasons.push(`perf failed: ${(perf.issues || []).join('; ')}`);

  const autoVerdict = honestyAuto?.verdict || 'missing';
  const mdVerdict = parseHonestyMd(honestyMd);
  if (autoVerdict === 'fail') {
    reasons.push(`honesty-auto failed: ${(honestyAuto.fails || []).join('; ')}`);
  } else if (mdVerdict === 'fail') {
    reasons.push('review-honesty.md reported fails');
  } else if (autoVerdict === 'missing' && mdVerdict === 'missing') {
    reasons.push('no honesty check result found');
  }

  const score = parseDesignScore(designMd);
  if (score == null) reasons.push('design score not found in review-design.md');
  else if (score < 8) reasons.push(`design score ${score}/10 < 8`);

  const autoPass = reasons.length === 0;
  const decision = autoPass ? 'اجتاز' : 'escalate';
  if (!autoPass) escalated++;

  mkdirSync(`work/${slug}`, { recursive: true });
  writeFileSync(`work/${slug}/quality-gate.json`, JSON.stringify({
    slug,
    decision,
    perf_pass: !!perf?.pass,
    honesty_auto: autoVerdict,
    honesty_md: mdVerdict,
    design_score: score,
    reasons
  }, null, 1) + '\n');

  if (autoPass) {
    const verdictMd = [
      `القرار: اجتاز`,
      `التقييم النهائي: ${score}/10`,
      `المصدر: بوابة الجودة الآلية (perf=pass، الصدق=pass، التصميم=${score}/10).`
    ].join('\n') + '\n';
    writeFileSync(`work/${slug}/quality-verdict.md`, verdictMd);
    console.log(`✓ ${slug} اجتاز (${score}/10) — no quality-manager LLM call needed`);
  } else {
    console.log(`✗ ${slug} escalate (${score ?? '-'}/10): ${reasons.join(' · ')}`);
  }
}

process.exit(escalated ? 1 : 0);
