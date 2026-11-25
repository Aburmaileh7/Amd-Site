#!/usr/bin/env node
// Zero-LLM Batch Orchestrator for Amd web — eliminates the ~50% main coordinator token burn
// AND isolates Notion MCP (--strict-mcp-config scripts/mcp-none.json) from every non-Notion agent!
//
// Usage:
//   node scripts/run-batch.mjs --slugs=slug1,slug2 [--concurrency=2] [--no-ship] [--custom-motion] [--dry-run]
//   node scripts/run-batch.mjs --batch=4 [--concurrency=2] [--lead-query="cafe|bakery"] [--lead-location="Riyadh, Saudi Arabia"]
//
// Owner limits enforced: max 5 new leads/run, max 2 fix rounds/site, max 4 sites/batch by default.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MCP_NONE = join(ROOT, 'scripts/mcp-none.json');
const NOTION_TOKEN_FILE = `${homedir()}/.config/amd-web/notion-token`;
const MAX_FIX_ROUNDS = 2;

const rawArgs = process.argv.slice(2);
const flagVal = (name, def) => {
  const hit = rawArgs.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const hasFlag = (name) => rawArgs.includes(`--${name}`);

const BATCH_SIZE = Math.min(Number(flagVal('batch', '4')), 6);
const CONCURRENCY = Math.max(1, Math.min(Number(flagVal('concurrency', '2')), 4));
const EXPLICIT_SLUGS = flagVal('slugs', '').split(',').map((s) => s.trim()).filter(Boolean);
const LEAD_QUERY = flagVal('lead-query', '');
const LEAD_LOC = flagVal('lead-location', '');
const NO_SHIP = hasFlag('no-ship');
const CUSTOM_MOTION = hasFlag('custom-motion');
const DRY_RUN = hasFlag('dry-run');

const STAMP = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
const RUN_DIR = join(ROOT, `work/_runs/${STAMP}`);
mkdirSync(RUN_DIR, { recursive: true });

const log = (msg) => console.error(`[run-batch ${new Date().toISOString().slice(11, 19)}] ${msg}`);
const hasNotionApi = () => !!(process.env.NOTION_TOKEN || existsSync(NOTION_TOKEN_FILE));

function agentModel(agentName) {
  const p = join(ROOT, `.claude/agents/${agentName}.md`);
  if (!existsSync(p)) return 'sonnet';
  const m = readFileSync(p, 'utf8').match(/^model:\s*(\S+)/m);
  return m ? m[1].trim() : 'sonnet';
}

function runNode(scriptRel, args = [], opts = {}) {
  log(`tool: node ${scriptRel} ${args.join(' ')}`);
  if (DRY_RUN) return { ok: true, status: 0, stdout: '[]', stderr: '' };
  const res = spawnSync(process.execPath, [join(ROOT, scriptRel), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 25 * 1024 * 1024,
    timeout: opts.timeout || 15 * 60 * 1000
  });
  return { ok: res.status === 0, status: res.status ?? 1, stdout: res.stdout || '', stderr: res.stderr || '' };
}

function runAgent(agentName, brief, { needsMcp = false, tag = agentName } = {}) {
  const model = agentModel(agentName);
  const cliArgs = [
    '-p',
    '--agent', agentName,
    '--model', model,
    '--permission-mode', 'auto',
    '--no-chrome',
    '--output-format', 'text',
    ...(needsMcp ? [] : ['--strict-mcp-config', '--mcp-config', MCP_NONE])
  ];
  log(`agent: ${agentName} (model=${model}, mcp=${needsMcp ? 'enabled' : 'isolated'}) [${tag}]`);
  if (DRY_RUN) return Promise.resolve({ ok: true, out: '[dry-run]' });

  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('claude', cliArgs, { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdin.write(`${brief}\nNEVER use mcp__claude-in-chrome__*.\n`);
    child.stdin.end();
    child.on('close', (code) => {
      const sec = ((Date.now() - started) / 1000).toFixed(1);
      const logFile = join(RUN_DIR, `${tag.replace(/[^a-z0-9-_]/gi, '_')}.log`);
      writeFileSync(logFile, `EXIT ${code} (${sec}s)\n--- STDOUT ---\n${stdout}\n--- STDERR ---\n${stderr}\n`);
      log(`done: ${agentName} [${tag}] exit=${code} (${sec}s)`);
      resolve({ ok: code === 0, code, out: stdout.trim(), err: stderr.trim() });
    });
  });
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

const readJson = (p) => (existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), 'utf8')) : null);

// ---------- Step 0: Start Sync & Pick Batch ----------
let batch = [];
if (EXPLICIT_SLUGS.length) {
  batch = EXPLICIT_SLUGS.map((slug) => ({
    slug,
    status: existsSync(join(ROOT, `sites/${slug}/place.json`)) ? 'صفحة جاهزة' : 'جديد'
  }));
} else if (hasNotionApi()) {
  runNode('scripts/notion-sync.mjs', ['sync-sent']);
  const bl = runNode('scripts/notion-sync.mjs', ['backlog', String(BATCH_SIZE)]);
  batch = bl.ok ? JSON.parse(bl.stdout || '[]') : [];
} else {
  log('No ~/.config/amd-web/notion-token -> falling back to amd-records-keeper (MCP) for start sync');
  await runAgent('amd-records-keeper',
    `task start-sync: run node scripts/go-log-check.mjs, mark sent rows انبعت, and write up to ${BATCH_SIZE} backlog rows (priority: اجتاز, صفحة جاهزة, رجّعه المراجع, جديد) as JSON array [{name,slug,status,link,country,type}] to work/_runs/${STAMP}/backlog.json.`,
    { needsMcp: true, tag: '00-start-sync' });
  batch = readJson(`work/_runs/${STAMP}/backlog.json`) || [];
}

// ---------- Step 1: Leads (only if backlog < BATCH_SIZE and query provided) ----------
if (!EXPLICIT_SLUGS.length && batch.length < BATCH_SIZE && LEAD_QUERY && LEAD_LOC) {
  const need = Math.min(5, BATCH_SIZE - batch.length);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  mkdirSync(join(ROOT, 'work/_leads'), { recursive: true });
  const raw = runNode('scripts/maps-fetch.mjs', ['search', LEAD_QUERY, LEAD_LOC, '20']);
  if (raw.ok) {
    writeFileSync(join(ROOT, 'work/_leads/raw.json'), raw.stdout);
    const flt = runNode('scripts/lead-filter.mjs', ['work/_leads/raw.json']);
    if (flt.ok) writeFileSync(join(ROOT, 'work/_leads/filtered.json'), flt.stdout);
    await runAgent('amd-lead-researcher',
      `task leads: work/_leads/filtered.json is ready. Resolve needs_channel and pick ${need} best leads for "${LEAD_LOC}". Write to work/_leads/${today}.json.`,
      { needsMcp: !hasNotionApi(), tag: '01-leads' });
    const picked = readJson(`work/_leads/${today}.json`) || [];
    if (picked.length) {
      if (hasNotionApi()) runNode('scripts/notion-sync.mjs', ['create-leads', `work/_leads/${today}.json`]);
      else await runAgent('amd-records-keeper', `task create-leads: add rows from work/_leads/${today}.json at status جديد.`, { needsMcp: true, tag: '01-leads-notion' });
      for (const l of picked.slice(0, BATCH_SIZE - batch.length)) {
        if (l.slug) batch.push({ slug: l.slug, name: l.name, status: 'جديد', link: l.link });
      }
    }
  }
}

if (!batch.length) {
  log('No sites in batch. Pass --slugs=a,b or --lead-query="..." --lead-location="..." (or populate Notion backlog).');
  process.exit(0);
}

log(`Batch (${batch.length} sites): ${batch.map((b) => `${b.slug || b.name}[${b.status}]`).join(', ')}`);

// ---------- Step 2: Build Sites (Parallel) ----------
async function buildOneSite(item) {
  const slug = item.slug;
  if (!slug) { log(`! skipping "${item.name}": missing slug`); return false; }
  mkdirSync(join(ROOT, `work/${slug}`), { recursive: true });

  // Mechanical maps fetch + thumbnails (0 LLM)
  if (!existsSync(join(ROOT, `work/${slug}/maps.json`)) && item.link) {
    const fetched = runNode('scripts/maps-fetch.mjs', ['place', item.link, '12', '15']);
    if (fetched.ok) writeFileSync(join(ROOT, `work/${slug}/maps.json`), fetched.stdout);
  }
  if (existsSync(join(ROOT, `work/${slug}/maps.json`)) && !existsSync(join(ROOT, `work/${slug}/materials.json`))) {
    runNode('scripts/materials.mjs', [slug]);
  }
  if (!existsSync(join(ROOT, `work/${slug}/materials.json`)) || !(readJson(`work/${slug}/materials.json`)?.photos?.length)) {
    await runAgent('amd-content-collector',
      `task ${slug}/collect: maps.json and thumbnails are in work/${slug}/. Pick 3-6 photos via materials.mjs --pick, select reviews/mentions, and do 1 menu search. Output: work/${slug}/materials.json.`,
      { tag: `${slug}-collect` });
  }
  if (!existsSync(join(ROOT, `work/${slug}/copy.json`))) {
    await runAgent('amd-content-writer',
      `task ${slug}/copy: read work/${slug}/materials.json only. Output: work/${slug}/copy.json.`,
      { tag: `${slug}-copy` });
  }
  if (!existsSync(join(ROOT, `sites/${slug}/place.json`))) {
    await runAgent('amd-designer',
      `task ${slug}/design: read work/${slug}/materials.json and copy.json. Pick a built-in motion.signature preset in choices.json (no site.js needed), run build-place.mjs ${slug}, write sites/${slug}/site.css and work/${slug}/concept.md.`,
      { tag: `${slug}-design` });
  }
  if (CUSTOM_MOTION && !existsSync(join(ROOT, `sites/${slug}/site.js`))) {
    await runAgent('amd-motion-developer',
      `task ${slug}/motion: read work/${slug}/concept.md. Write sites/${slug}/site.js and validate.`,
      { tag: `${slug}-motion` });
  }
  return existsSync(join(ROOT, `sites/${slug}/place.json`));
}

const toBuild = batch.filter((b) => b.status === 'جديد' && b.slug);
if (toBuild.length) await mapLimit(toBuild, CONCURRENCY, buildOneSite);

const builtSlugs = batch.filter((b) => b.slug && existsSync(join(ROOT, `sites/${b.slug}/place.json`))).map((b) => b.slug);
const needsShip = batch.filter((b) => b.slug && ['جديد', 'رجّعه المراجع'].includes(b.status) && existsSync(join(ROOT, `sites/${b.slug}/place.json`))).map((b) => b.slug);

// ---------- Step 3: ONE Batch Ship + Prod-Check ----------
function shipAndCheck(slugs) {
  if (!slugs.length) return;
  const shipArgs = NO_SHIP ? [...slugs, '--dry'] : slugs;
  runNode('scripts/ship.mjs', shipArgs);
  runNode('scripts/prod-check.mjs', slugs);
}
if (needsShip.length) shipAndCheck(needsShip);

// Route prod-check returns (up to MAX_FIX_ROUNDS)
for (let round = 1; round <= MAX_FIX_ROUNDS; round++) {
  const returned = needsShip.filter((s) => readJson(`work/${s}/prod-check.json`)?.verdict === 'return');
  if (!returned.length) break;
  for (const slug of returned) {
    await runAgent('amd-production-manager',
      `task ${slug}/prod-fix-r${round}: prod-check returned ${slug}. Read work/${slug}/prod-check.json and qa-out/${slug}/{mobile,desktop}-sheet.jpg. Write work/${slug}/production-verdict.md.`,
      { tag: `${slug}-prod-mgr-r${round}` });
    const verdict = existsSync(join(ROOT, `work/${slug}/production-verdict.md`))
      ? readFileSync(join(ROOT, `work/${slug}/production-verdict.md`), 'utf8') : '';
    const targets = ['amd-content-collector', 'amd-content-writer', 'amd-designer', 'amd-motion-developer'].filter((a) => verdict.includes(a));
    for (const emp of targets.length ? targets : ['amd-designer']) {
      await runAgent(emp, `task ${slug}/fix-r${round}: follow your assignment in work/${slug}/production-verdict.md.`, { tag: `${slug}-${emp}-r${round}` });
    }
  }
  shipAndCheck(returned);
}

// ---------- Step 4: Auto-Gated Quality ----------
const forQuality = batch.filter((b) => b.slug && !['اجتاز', 'جاهز لمراجعتي'].includes(b.status) && builtSlugs.includes(b.slug)).map((b) => b.slug);
if (forQuality.length) {
  runNode('scripts/perf-check.mjs', NO_SHIP ? [...forQuality, '--local'] : forQuality);
  runNode('scripts/honesty-check.mjs', forQuality);

  await mapLimit(forQuality, CONCURRENCY, async (slug) => {
    const auto = readJson(`work/${slug}/honesty-auto.json`);
    const tasks = [
      runAgent('amd-design-reviewer',
        `task ${slug}/design-review: review qa-out/${slug}/mobile-sheet.jpg and desktop-sheet.jpg. Write work/${slug}/review-design.md (line 1: التقييم: X/10).`,
        { tag: `${slug}-design-rev` })
    ];
    if (auto?.verdict === 'pass') {
      tasks.push(runAgent('amd-honesty-reviewer',
        `task ${slug}/honesty-review: honesty-auto.json passed. Diff Arabic copy in sites/${slug}/place.json against work/${slug}/materials.json. Write work/${slug}/review-honesty.md.`,
        { tag: `${slug}-honesty-rev` }));
    }
    await Promise.all(tasks);
  });

  runNode('scripts/quality-gate.mjs', forQuality);
  const escalated = forQuality.filter((s) => readJson(`work/${s}/quality-gate.json`)?.decision === 'escalate');
  for (const slug of escalated) {
    await runAgent('amd-quality-manager',
      `task ${slug}/quality-verdict: quality-gate escalated ${slug}. Read work/${slug}/{quality-gate.json,review-design.md,honesty-auto.json,review-honesty.md,perf.json}. Write work/${slug}/quality-verdict.md.`,
      { tag: `${slug}-qual-mgr` });
  }
}

// ---------- Step 5: Batched Auto-Gated Sales (ONE session for all passing sites!) ----------
const passedQuality = builtSlugs.filter((s) => {
  const qg = readJson(`work/${s}/quality-gate.json`);
  const qv = existsSync(join(ROOT, `work/${s}/quality-verdict.md`)) ? readFileSync(join(ROOT, `work/${s}/quality-verdict.md`), 'utf8') : '';
  return qg?.decision === 'اجتاز' || /القرار:\s*اجتاز/.test(qv) || batch.find((b) => b.slug === s)?.status === 'اجتاز';
});

if (passedQuality.length) {
  await runAgent('amd-message-writer',
    `task batch-messages: write ONE first message per slug (${passedQuality.join(', ')}) from each work/<slug>/materials.json to work/<slug>/message.txt.`,
    { tag: 'batch-msg-writer' });
  runNode('scripts/msg-check.mjs', passedQuality);

  const failedMsg = passedQuality.filter((s) => readJson(`work/${s}/msg-check.json`)?.verdict === 'fail');
  if (failedMsg.length) {
    await runAgent('amd-message-writer',
      `task batch-messages-fix: fix mechanical fails in work/<slug>/msg-check.json for: ${failedMsg.join(', ')}.`,
      { tag: 'batch-msg-fix' });
    runNode('scripts/msg-check.mjs', failedMsg);
  }

  const readyMsg = passedQuality.filter((s) => readJson(`work/${s}/msg-check.json`)?.verdict === 'pass');
  if (readyMsg.length) {
    await runAgent('amd-sales-manager',
      `task batch-sales-gate: msg-check passed for (${readyMsg.join(', ')}). Judge each work/<slug>/message.txt against work/<slug>/materials.json and write work/<slug>/sales-verdict.md.`,
      { tag: 'batch-sales-mgr' });
  }
}

// ---------- Step 6: End Sync + Cost Summary ----------
if (builtSlugs.length) {
  if (hasNotionApi()) {
    runNode('scripts/notion-sync.mjs', ['update-batch', ...builtSlugs]);
  } else {
    await runAgent('amd-records-keeper',
      `task end-sync: update Notion rows for batch (${builtSlugs.join(', ')}) using work/<slug>/{ship.json,quality-verdict.md,quality-gate.json,message.txt,msg-check.json,sales-verdict.md}. Copy buttons verbatim from msg-check.json.`,
      { needsMcp: true, tag: '99-end-sync' });
  }
}

const cost = runNode('scripts/cost-report.mjs');
const totalLine = (cost.stdout.split('\n').find((l) => l.startsWith('TOTAL')) || 'TOTAL n/a').trim();
console.log(`\n=== ملخص الدفعة (${STAMP}) ===`);
for (const slug of builtSlugs) {
  const ready = existsSync(join(ROOT, `work/${slug}/sales-verdict.md`)) && /جاهز لمراجعتي/.test(readFileSync(join(ROOT, `work/${slug}/sales-verdict.md`), 'utf8'));
  const score = readJson(`work/${slug}/quality-gate.json`)?.design_score ?? '-';
  console.log(`- ${slug}: ${ready ? 'جاهز لمراجعتي' : 'قيد المتابعة'} | تقييم ${score}/10 | https://amd-demos.pages.dev/${slug}/`);
}
console.log(totalLine);
