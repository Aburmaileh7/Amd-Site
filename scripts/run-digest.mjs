#!/usr/bin/env node
// Zero-LLM Post-Run Anomaly Extractor for Khalil (amd-khalil).
// Scans one run directory (work/_runs/<stamp>) + its batch slugs' work/<slug>/* files
// and writes a compact digest.json containing ONLY failures, returns, timeouts, warnings, and token spikes.
// Usage: node scripts/run-digest.mjs <run-dir> [slug1 slug2 ...]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [runDir, ...slugArgs] = process.argv.slice(2);
if (!runDir || !existsSync(runDir)) {
  console.error('usage: run-digest.mjs <work/_runs/STAMP> [slug1 slug2 ...]');
  process.exit(2);
}

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const readTxt = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const usage = readJson(join(runDir, 'usage.json')) || { stamp: runDir.split('/').pop(), limit_hit: false, roles: [] };

// 1. Scan all agent logs in runDir for non-zero exits, timeouts, or stderr errors
const logIssues = [];
for (const f of readdirSync(runDir).filter((x) => x.endsWith('.log')).sort()) {
  const txt = readTxt(join(runDir, f));
  const firstLine = (txt.split('\n')[0] || '').trim();
  const exitM = firstLine.match(/^EXIT\s+(\d+)/);
  const exitCode = exitM ? Number(exitM[1]) : 0;
  const timedOut = /TIMEOUT/i.test(firstLine);
  const stderrPart = (txt.split('--- STDERR ---')[1] || '').trim();
  const resultPart = (txt.split('--- RESULT ---')[1] || txt.split('--- STDOUT ---')[1] || '').split('--- STDERR ---')[0].trim();

  if (exitCode !== 0 || timedOut || /error|exception|failed|rate.?limit|usage.?limit/i.test(stderrPart)) {
    logIssues.push({
      log: f,
      exit: exitCode,
      timeout: timedOut,
      stderr: stderrPart.slice(0, 320),
      result_tail: resultPart.slice(-260)
    });
  }
}

// 2. Scan each slug's artifacts for gate failures, returns, warnings, or low scores
const siteIssues = [];
let readyCount = 0;
let returnedCount = 0;

for (const slug of slugArgs) {
  const issues = [];
  const ship = readJson(`work/${slug}/ship.json`);
  const prod = readJson(`work/${slug}/prod-check.json`);
  const perf = readJson(`work/${slug}/perf.json`);
  const honesty = readJson(`work/${slug}/honesty-auto.json`);
  const honestyMd = readTxt(`work/${slug}/review-honesty.md`).trim();
  const designMd = readTxt(`work/${slug}/review-design.md`).trim();
  const qGate = readJson(`work/${slug}/quality-gate.json`);
  const qVerdict = readTxt(`work/${slug}/quality-verdict.md`).trim();
  const msgCheck = readJson(`work/${slug}/msg-check.json`);
  const salesVerdict = readTxt(`work/${slug}/sales-verdict.md`).trim();

  if (ship && !ship.ok) {
    const badSteps = (ship.steps || []).filter((s) => !s.ok).map((s) => `${s.step}: ${s.error || 'failed'}`);
    issues.push({ stage: 'ship', details: badSteps.length ? badSteps : [String(ship.live?.[slug] || 'not live')] });
  }
  if (prod?.verdict === 'return') {
    issues.push({ stage: 'prod-check', details: prod.fails || [] });
  } else if (prod?.notes?.length) {
    issues.push({ stage: 'prod-check-notes', severity: 'warn', details: prod.notes.slice(0, 4) });
  }
  if (perf && !perf.pass) {
    issues.push({ stage: 'perf-check', details: perf.issues || [] });
  }
  if (honesty?.verdict === 'fail') {
    issues.push({ stage: 'honesty-auto', details: honesty.fails || [] });
  }
  if (honestyMd && !/^pass\b/i.test(honestyMd) && !/^- no defects/i.test(honestyMd)) {
    issues.push({ stage: 'honesty-reviewer', details: honestyMd.split('\n').slice(0, 5) });
  }
  if (qGate?.decision === 'escalate' || /رجّعه المراجع/.test(qVerdict)) {
    returnedCount++;
    issues.push({
      stage: 'quality',
      score: qGate?.design_score ?? null,
      reasons: qGate?.reasons || [],
      design_top_defects: designMd.split('\n').slice(0, 6),
      verdict_head: qVerdict.split('\n').slice(0, 4)
    });
  }
  if (msgCheck?.verdict === 'fail') {
    issues.push({ stage: 'msg-check', details: msgCheck.fails || [] });
  } else if (msgCheck && !msgCheck.buttons?.wa && !msgCheck.buttons?.ig) {
    issues.push({ stage: 'msg-buttons', severity: 'warn', details: ['no wa or ig button generated (missing channel in materials.json)'] });
  }
  if (/ارجع/.test(salesVerdict) && !/جاهز لمراجعتي/.test(salesVerdict)) {
    issues.push({ stage: 'sales-manager', details: salesVerdict.split('\n').slice(0, 4) });
  }
  if (/جاهز لمراجعتي/.test(salesVerdict) && msgCheck?.verdict === 'pass') readyCount++;

  if (issues.length) siteIssues.push({ slug, issues });
}

// 3. Flag token/time anomalies per role (e.g. a single role burning > 8M total tokens or > 300s/call)
const perfAnomalies = [];
for (const r of usage.roles || []) {
  const totalTok = (r.input || 0) + (r.cache_write || 0) + (r.cache_read || 0) + (r.output || 0);
  const avgSec = r.calls ? +(r.sec / r.calls).toFixed(1) : 0;
  if (totalTok > 8_000_000 || avgSec > 240) {
    perfAnomalies.push({ role: r.role, calls: r.calls, total_tokens: totalTok, avg_sec: avgSec, cost_usd: r.cost_usd });
  }
}

const hasIssues = Boolean(usage.limit_hit || logIssues.length || siteIssues.length || perfAnomalies.length);
const digest = {
  stamp: usage.stamp,
  run_dir: runDir,
  batch_size: slugArgs.length,
  ready_count: readyCount,
  returned_count: returnedCount,
  limit_hit: !!usage.limit_hit,
  has_issues: hasIssues,
  log_issues: logIssues,
  site_issues: siteIssues,
  perf_anomalies: perfAnomalies,
  usage_roles: usage.roles || []
};

const outPath = join(runDir, 'digest.json');
writeFileSync(outPath, JSON.stringify(digest, null, 1) + '\n');
console.log(JSON.stringify({ out: outPath, has_issues: hasIssues, log_issues: logIssues.length, site_issues: siteIssues.length, perf_anomalies: perfAnomalies.length }));
