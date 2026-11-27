#!/usr/bin/env node
// Zero-LLM Batch Orchestrator for Amd web:
// - Eliminates main coordinator token burn + isolates Notion MCP (--strict-mcp-config scripts/mcp-none.json)
// - Lockfile + per-agent timeout + graceful stop on 5-hour rate limits (ships/syncs completed sites!)
// - Local pre-push validation + prod-check BEFORE GitHub push (isolates broken sites so good ones ship!)
// - Per-role token/cost telemetry via --output-format json -> work/_runs/<stamp>/usage.json
//
// Usage:
//   node scripts/run-batch.mjs [--batch=10] [--concurrency=2] [--timeout-min=8]
//   node scripts/run-batch.mjs --slugs=slug1,slug2 [--no-ship] [--custom-motion] [--dry-run]
//   node scripts/run-batch.mjs --lead-query="cafe|bakery" --lead-location="Riyadh, Saudi Arabia"
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MCP_NONE = join(ROOT, 'scripts/mcp-none.json');
const NOTION_TOKEN_FILE = `${homedir()}/.config/amd-web/notion-token`;
const LOCK_FILE = join(ROOT, 'work/_runs/batch.lock');
const MAX_FIX_ROUNDS = 2;

const rawArgs = process.argv.slice(2);
const flagVal = (name, def) => {
  const hit = rawArgs.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const hasFlag = (name) => rawArgs.includes(`--${name}`);

const BATCH_SIZE = Math.min(Number(flagVal('batch', '10')), 10);
const CONCURRENCY = Math.max(1, Math.min(Number(flagVal('concurrency', '2')), 4));
const AGENT_TIMEOUT_MS = Math.max(60, Number(flagVal('timeout-min', '8')) * 60) * 1000;
const EXPLICIT_SLUGS = flagVal('slugs', '').split(',').map((s) => s.trim()).filter(Boolean);
const LEAD_QUERY = flagVal('lead-query', '');
const LEAD_LOC = flagVal('lead-location', '');
const NO_SHIP = hasFlag('no-ship');
const CUSTOM_MOTION = hasFlag('custom-motion');
const NO_KHALIL = hasFlag('no-khalil');
const FORCE_KHALIL = hasFlag('khalil');
const DRY_RUN = hasFlag('dry-run');

const STAMP = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
const RUN_DIR = join(ROOT, `work/_runs/${STAMP}`);
mkdirSync(RUN_DIR, { recursive: true });

const log = (msg) => console.error(`[run-batch ${new Date().toISOString().slice(11, 19)}] ${msg}`);
const photoList = (p) => (Array.isArray(p) ? p : Array.isArray(p?.selected) ? p.selected : Array.isArray(p?.photos) ? p.photos : []);
const hasNotionApi = () => !!(process.env.NOTION_TOKEN || existsSync(NOTION_TOKEN_FILE));

// ---------- Single-Instance Lockfile ----------
if (!DRY_RUN) {
  if (existsSync(LOCK_FILE)) {
    const oldPid = Number(readFileSync(LOCK_FILE, 'utf8').trim());
    let alive = false;
    if (oldPid) { try { process.kill(oldPid, 0); alive = true; } catch {} }
    if (alive) {
      console.error(`✗ Another run-batch.mjs is already running (PID ${oldPid}, lock ${LOCK_FILE}).`);
      process.exit(1);
    }
  }
  writeFileSync(LOCK_FILE, String(process.pid));
  const unlock = () => { try { if (existsSync(LOCK_FILE) && readFileSync(LOCK_FILE, 'utf8').trim() === String(process.pid)) rmSync(LOCK_FILE, { force: true }); } catch {} };
  process.on('exit', unlock);
  process.on('SIGINT', () => { unlock(); process.exit(130); });
  process.on('SIGTERM', () => { unlock(); process.exit(143); });
}

// ---------- Per-Role Telemetry + Graceful Rate-Limit Guard ----------
const RATE_LIMIT_RE = /rate.?limit|usage.?limit|5-hour|hit your limit|quota.?exceeded|overloaded_error/i;
let limitHit = false;
const usageByRole = new Map(); // role -> { calls, input, cache_write, cache_read, output, cost_usd, sec }

function recordUsage(role, sec, parsed) {
  const r = usageByRole.get(role) || { role, calls: 0, input: 0, cache_write: 0, cache_read: 0, output: 0, cost_usd: 0, sec: 0 };
  r.calls++;
  r.sec = +(r.sec + sec).toFixed(1);
  const u = parsed?.usage || {};
  r.input += u.input_tokens || 0;
  r.cache_write += u.cache_creation_input_tokens || 0;
  r.cache_read += u.cache_read_input_tokens || 0;
  r.output += u.output_tokens || 0;
  r.cost_usd = +(r.cost_usd + (parsed?.total_cost_usd || 0)).toFixed(4);
  usageByRole.set(role, r);
}

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
    timeout: opts.timeout || 15 * 60 * 1000,
    ...(opts.env ? { env: { ...process.env, ...opts.env } } : {})
  });
  return { ok: res.status === 0, status: res.status ?? 1, stdout: res.stdout || '', stderr: res.stderr || '' };
}

function runAgent(agentName, brief, { needsMcp = false, tag = agentName, allowWhenLimited = false } = {}) {
  if (limitHit && !allowWhenLimited) {
    log(`skip: ${agentName} [${tag}] (5-hour/rate limit hit earlier — finishing sync only)`);
    return Promise.resolve({ ok: false, skipped: true, out: '' });
  }
  const model = agentModel(agentName);
  const cliArgs = [
    '-p',
    '--agent', agentName,
    '--model', model,
    '--permission-mode', 'auto',
    '--no-chrome',
    '--output-format', 'json',
    ...(needsMcp ? [] : ['--strict-mcp-config', '--mcp-config', MCP_NONE])
  ];
  log(`agent: ${agentName} (model=${model}, mcp=${needsMcp ? 'enabled' : 'isolated'}) [${tag}]`);
  if (DRY_RUN) return Promise.resolve({ ok: true, out: '[dry-run]' });

  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('claude', cliArgs, { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      log(`TIMEOUT: ${agentName} [${tag}] after ${AGENT_TIMEOUT_MS / 60000}m -> killing`);
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 5000);
    }, AGENT_TIMEOUT_MS);

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdin.write(`${brief}\nNEVER use mcp__claude-in-chrome__*.\n`);
    child.stdin.end();
    child.on('close', (code) => {
      clearTimeout(timer);
      const sec = (Date.now() - started) / 1000;
      let parsed = null, textOut = stdout.trim();
      try {
        parsed = JSON.parse(stdout);
        textOut = String(parsed.result || '').trim();
      } catch {}
      recordUsage(agentName, sec, parsed);

      if ((code !== 0 || parsed?.is_error) && RATE_LIMIT_RE.test(`${textOut}\n${stderr}`)) {
        limitHit = true;
        log(`RATE LIMIT DETECTED during ${agentName} [${tag}] — halting new LLM calls and syncing completed sites!`);
      }
      const logFile = join(RUN_DIR, `${tag.replace(/[^a-z0-9-_]/gi, '_')}.log`);
      writeFileSync(logFile, `EXIT ${code}${timedOut ? ' (TIMEOUT)' : ''} (${sec.toFixed(1)}s)\n--- RESULT ---\n${textOut}\n--- STDERR ---\n${stderr}\n`);
      log(`done: ${agentName} [${tag}] exit=${code}${timedOut ? ' TIMEOUT' : ''} (${sec.toFixed(1)}s)`);
      resolve({ ok: code === 0 && !timedOut && !parsed?.is_error, code, timedOut, out: textOut, err: stderr.trim() });
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

// Arabic-to-Latin slugify (matches lead-filter.mjs) so new Notion rows with no page_url get a valid slug
const AR_MAP = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ى': 'a', 'ء': '', 'ئ': 'y', 'ؤ': 'w',
  'ب': 'b', 'ت': 't', 'ة': 'a', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's',
  'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};
function makeSlug(name) {
  const raw = String(name || '');
  const latin = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const base = (latin.length >= 3
    ? latin
    : raw.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/(^|\s)ال(?=[\u0621-\u064A])/g, '$1al-')
        .replace(/[\u0621-\u064A\u0660-\u0669]/g, (ch) => AR_MAP[ch] ?? '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  ).slice(0, 48).replace(/-+$/, '');
  if (!base) return null;
  let s = base, n = 2;
  while (existsSync(join(ROOT, `sites/${s}/place.json`))) s = `${base}-${n++}`;
  return s;
}

function parseChannels(item) {
  const blob = [item.instagram, item.whatsapp, item.contact].filter(Boolean).join(' ');
  const igUrl = blob.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i);
  const igAt = !igUrl ? blob.match(/(?:^|\s)@([A-Za-z0-9._]{2,30})\b/) : null;
  const igUser = (igUrl?.[1] || igAt?.[1] || '').replace(/\.$/, '') || null;
  const waLink = blob.match(/(?:wa\.me\/|whatsapp\.com\/send\?[^"'\s]*phone=)\+?(\d{8,15})/i);
  const waExplicit = item.whatsapp ? String(item.whatsapp).replace(/\D/g, '') : '';
  const waDigits = waLink?.[1] || (waExplicit.length >= 8 ? waExplicit : null);
  const waConfirmed = item.whatsapp_confirmed === true || String(item.whatsapp_confirmed).toUpperCase() === 'TRUE' || !!waLink;
  return {
    instagram: igUser ? `https://www.instagram.com/${igUser}/` : null,
    whatsapp: waDigits ? `+${waDigits}` : null,
    whatsapp_confirmed: !!(waConfirmed && waDigits)
  };
}

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
    `task start-sync: run node scripts/go-log-check.mjs, mark sent rows انبعت, and write up to ${BATCH_SIZE} backlog rows (priority: اجتاز, صفحة جاهزة, رجّعه المراجع, جديد) as JSON array [{name,slug,status,link,country,type,contact}] to work/_runs/${STAMP}/backlog.json (include "contact" from طريقة التواصل!).`,
    { needsMcp: true, tag: '00-start-sync' });
  batch = readJson(`work/_runs/${STAMP}/backlog.json`) || [];
}

for (const b of batch) {
  if (!b.slug && b.name) b.slug = makeSlug(b.name);
}

// ---------- Step 1: Leads (only if backlog < BATCH_SIZE and query provided) ----------
if (!limitHit && !EXPLICIT_SLUGS.length && batch.length < BATCH_SIZE && LEAD_QUERY && LEAD_LOC) {
  const need = Math.min(10, BATCH_SIZE - batch.length);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  mkdirSync(join(ROOT, 'work/_leads'), { recursive: true });
  // Pull 30 results on first pass to cover up to 10 leads cleanly in 1 search
  const raw = runNode('scripts/maps-fetch.mjs', ['search', LEAD_QUERY, LEAD_LOC, '30']);
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
        const slug = l.slug || makeSlug(l.name);
        if (slug) batch.push({
          slug, name: l.name, status: 'جديد', link: l.link, country: l.country || null,
          instagram: l.instagram || null, whatsapp: l.whatsapp || null, whatsapp_confirmed: l.whatsapp_confirmed
        });
      }
    }
  }
}

if (!batch.length) {
  log('No sites in batch. Pass --slugs=a,b or --lead-query="..." --lead-location="..." (or populate Notion backlog).');
  process.exit(0);
}

// Seed contact channels + country into materials.json for EVERY item in the batch
function seedMaterials(item) {
  if (!item.slug || DRY_RUN) return;
  const ch = parseChannels(item);
  if (!ch.instagram && !ch.whatsapp && !item.country) return;
  const dir = join(ROOT, `work/${item.slug}`);
  mkdirSync(dir, { recursive: true });
  const matPath = join(dir, 'materials.json');
  const prev = existsSync(matPath) ? JSON.parse(readFileSync(matPath, 'utf8')) : { slug: item.slug, name: item.name || item.slug };
  const seeded = {
    ...prev,
    ...(item.country && !prev.country ? { country: item.country } : {}),
    ...(ch.instagram && !prev.instagram ? { instagram: ch.instagram } : {}),
    ...(ch.whatsapp && !prev.whatsapp ? { whatsapp: ch.whatsapp } : {}),
    ...(ch.whatsapp_confirmed ? { whatsapp_confirmed: true } : {}),
    facts: { ...(prev.facts || {}), ...(ch.instagram && !prev.facts?.instagram ? { instagram: ch.instagram } : {}) }
  };
  writeFileSync(matPath, JSON.stringify(seeded, null, 2) + '\n');
}
for (const b of batch) seedMaterials(b);

log(`Batch (${batch.length} sites): ${batch.map((b) => `${b.slug || b.name}[${b.status}]`).join(', ')}`);

async function routeProductionFix(slug, sourceLabel, round) {
  if (limitHit) return;
  const srcFile = sourceLabel === 'quality-fix' ? 'quality-verdict.md' : 'prod-check.json';
  await runAgent('amd-production-manager',
    `task ${slug}/${sourceLabel}-r${round}: read work/${slug}/${srcFile} and qa-out/${slug}/{mobile,desktop}-sheet.jpg. Assign each defect to the right employee in work/${slug}/production-verdict.md.`,
    { tag: `${slug}-prod-mgr-${sourceLabel}-r${round}` });
  const verdict = existsSync(join(ROOT, `work/${slug}/production-verdict.md`))
    ? readFileSync(join(ROOT, `work/${slug}/production-verdict.md`), 'utf8') : '';
  let targets = ['amd-content-collector', 'amd-content-writer', 'amd-designer', 'amd-motion-developer'].filter((a) => verdict.includes(a));
  // Collector only on fix round 1 (r2+ fixes are layout/copy -> designer); avoids collector timeouts doing others' jobs.
  if (round > 1) targets = targets.filter((a) => a !== 'amd-content-collector');
  const scope = {
    'amd-content-collector': 'Only update work/' + slug + '/materials.json (photos/reviews/facts). Do NOT run qa/prod-check/ship/build, do NOT edit site files, do NOT ask questions; finish and report.',
  };
  for (const emp of targets.length ? targets : ['amd-designer']) {
    if (limitHit) break;
    await runAgent(emp, `task ${slug}/fix-r${round}: follow your assignment in work/${slug}/production-verdict.md.${scope[emp] ? ' ' + scope[emp] : ''} Never ask questions; this is a non-interactive run.`, { tag: `${slug}-${emp}-r${round}` });
  }
}

// ---------- Step 2: Build New Sites + Fix Backlog Returned Sites ----------
async function buildOneSite(item) {
  if (limitHit) return false;
  const slug = item.slug;
  if (!slug) { log(`! skipping "${item.name}": missing slug`); return false; }
  mkdirSync(join(ROOT, `work/${slug}`), { recursive: true });
  const ch = parseChannels(item);
  const matPath = join(ROOT, `work/${slug}/materials.json`);

  if (!existsSync(join(ROOT, `work/${slug}/maps.json`)) && item.link) {
    const fetched = runNode('scripts/maps-fetch.mjs', ['place', item.link, '12', '15']);
    if (fetched.ok) writeFileSync(join(ROOT, `work/${slug}/maps.json`), fetched.stdout);
  }
  if (existsSync(join(ROOT, `work/${slug}/maps.json`)) && !(readJson(`work/${slug}/materials.json`)?.photo_candidates?.length)) {
    runNode('scripts/materials.mjs', [slug]);
  }
  if (!limitHit && (!existsSync(matPath) || !(photoList(readJson(`work/${slug}/materials.json`)?.photos).length))) {
    const chNote = [ch.instagram && `instagram=${ch.instagram}`, ch.whatsapp_confirmed && `whatsapp=${ch.whatsapp}`].filter(Boolean).join(', ');
    await runAgent('amd-content-collector',
      `task ${slug}/collect: inspect the single numbered grid work/${slug}/candidates/grid.jpg, pick 3-6 photos via materials.mjs --pick, select reviews/mentions, and do 1 menu search.${chNote ? ` Preserve channels: ${chNote}.` : ''} Output: work/${slug}/materials.json.`,
      { tag: `${slug}-collect` });
  }
  if (!limitHit && !existsSync(join(ROOT, `work/${slug}/copy.json`))) {
    await runAgent('amd-content-writer',
      `task ${slug}/copy: read work/${slug}/materials.json only. Output: work/${slug}/copy.json.`,
      { tag: `${slug}-copy` });
  }
  if (!limitHit && !existsSync(join(ROOT, `sites/${slug}/place.json`))) {
    await runAgent('amd-designer',
      `task ${slug}/design: read work/${slug}/materials.json and copy.json. Pick a built-in motion.signature preset in choices.json (no site.js needed), run build-place.mjs ${slug}, write sites/${slug}/site.css and work/${slug}/concept.md.`,
      { tag: `${slug}-design` });
  }
  if (!limitHit && CUSTOM_MOTION && !existsSync(join(ROOT, `sites/${slug}/site.js`))) {
    await runAgent('amd-motion-developer',
      `task ${slug}/motion: read work/${slug}/concept.md. Write sites/${slug}/site.js and validate.`,
      { tag: `${slug}-motion` });
  }
  return existsSync(join(ROOT, `sites/${slug}/place.json`));
}

const fixRoundsUsed = new Map();
const toBuild = batch.filter((b) => b.status === 'جديد' && b.slug);
if (toBuild.length) await mapLimit(toBuild, CONCURRENCY, buildOneSite);

const backlogReturned = batch.filter((b) => b.status === 'رجّعه المراجع' && b.slug && existsSync(join(ROOT, `sites/${b.slug}/place.json`)));
for (const b of backlogReturned) {
  if (limitHit) break;
  fixRoundsUsed.set(b.slug, 1);
  await routeProductionFix(b.slug, 'quality-fix', 1);
}

const builtSlugs = batch.filter((b) => b.slug && existsSync(join(ROOT, `sites/${b.slug}/place.json`))).map((b) => b.slug);
const needsShip = batch.filter((b) => b.slug && ['جديد', 'رجّعه المراجع'].includes(b.status) && existsSync(join(ROOT, `sites/${b.slug}/place.json`))).map((b) => b.slug);

// ---------- Step 3: Local Pre-Push Gate (validate + ONLY_SLUGS build + QA + prod-check --local) BEFORE GitHub Push! ----------
function localCheckSlugs(slugs) {
  if (!slugs.length) return { valid: [], invalid: [] };
  const valid = [], invalid = [];
  for (const s of slugs) {
    const v = runNode('scripts/validate.mjs', [s]);
    if (v.ok) valid.push(s);
    else {
      invalid.push(s);
      mkdirSync(join(ROOT, `work/${s}`), { recursive: true });
      writeFileSync(join(ROOT, `work/${s}/prod-check.json`), JSON.stringify({
        slug: s, verdict: 'return', fails: [`validate failed: ${(v.stderr || v.stdout).trim().slice(0, 260)}`], notes: []
      }, null, 1) + '\n');
    }
  }
  if (valid.length && !DRY_RUN) {
    log(`local pre-push build (ONLY_SLUGS=${valid.join(',')})`);
    const b = spawnSync(process.execPath, [join(ROOT, 'node_modules/astro/astro.js'), 'build'], {
      cwd: ROOT, env: { ...process.env, ONLY_SLUGS: valid.join(',') }, encoding: 'utf8', timeout: 5 * 60 * 1000
    });
    if (b.status === 0) {
      runNode('scripts/qa.mjs', valid);
      runNode('scripts/prod-check.mjs', [...valid, '--local']);
    } else {
      log(`! local build failed: ${(b.stderr || b.stdout).slice(0, 200)}`);
    }
  }
  return { valid, invalid };
}

async function localGateThenShip(slugs) {
  if (!slugs.length) return [];
  let pending = [...slugs];
  for (let round = 0; round <= MAX_FIX_ROUNDS; round++) {
    localCheckSlugs(pending);
    const failed = pending.filter((s) => readJson(`work/${s}/prod-check.json`)?.verdict === 'return');
    if (!failed.length || round === MAX_FIX_ROUNDS || limitHit) break;
    const fixable = failed.filter((s) => (fixRoundsUsed.get(s) || 0) < MAX_FIX_ROUNDS);
    if (!fixable.length) break;
    for (const slug of fixable) {
      const r = (fixRoundsUsed.get(slug) || 0) + 1;
      fixRoundsUsed.set(slug, r);
      await routeProductionFix(slug, 'prod-fix', r);
    }
    pending = fixable;
  }
  // Ship ONLY sites that passed local validate + prod-check (broken sites don't block the batch!)
  const readyToShip = slugs.filter((s) => DRY_RUN || readJson(`work/${s}/prod-check.json`)?.verdict === 'accept');
  if (readyToShip.length) {
    const shipArgs = NO_SHIP ? [...readyToShip, '--dry'] : readyToShip;
    runNode('scripts/ship.mjs', shipArgs);
  }
  return readyToShip;
}

if (needsShip.length) await localGateThenShip(needsShip);

// ---------- Step 4: Auto-Gated Quality (with fix loop up to MAX_FIX_ROUNDS) ----------
function ensureQaSheets(slugs) {
  const missing = slugs.filter((s) => !existsSync(join(ROOT, `qa-out/${s}/mobile-sheet.jpg`)) || !existsSync(join(ROOT, `qa-out/${s}/desktop-sheet.jpg`)));
  if (!missing.length || DRY_RUN) return;
  log(`generating missing QA sheets for: ${missing.join(', ')}`);
  spawnSync(process.execPath, [join(ROOT, 'node_modules/astro/astro.js'), 'build'], {
    cwd: ROOT, env: { ...process.env, ONLY_SLUGS: missing.join(',') }, stdio: 'ignore', timeout: 5 * 60 * 1000
  });
  runNode('scripts/qa.mjs', missing);
}

async function runQualityPass(slugs, passTag) {
  if (!slugs.length || limitHit) return;
  ensureQaSheets(slugs);
  // Pre-ship: check locally. Never-deployed slugs get Cloudflare's 200 fallback (home page) on the live URL,
  // so a live check here always fails; ship.mjs / prod-check verify the live page after deploy.
  runNode('scripts/perf-check.mjs', [...slugs, '--local']);
  runNode('scripts/honesty-check.mjs', slugs);

  await mapLimit(slugs, CONCURRENCY, async (slug) => {
    if (limitHit) return;
    const auto = readJson(`work/${slug}/honesty-auto.json`);
    const tasks = [
      runAgent('amd-design-reviewer',
        `task ${slug}/design-review-${passTag}: review qa-out/${slug}/mobile-sheet.jpg and desktop-sheet.jpg. Write work/${slug}/review-design.md (line 1: التقييم: X/10).`,
        { tag: `${slug}-design-rev-${passTag}` })
    ];
    if (auto?.verdict === 'pass') {
      tasks.push(runAgent('amd-honesty-reviewer',
        `task ${slug}/honesty-review-${passTag}: honesty-auto.json passed. Diff Arabic copy in sites/${slug}/place.json against work/${slug}/materials.json. Write work/${slug}/review-honesty.md.`,
        { tag: `${slug}-honesty-rev-${passTag}` }));
    }
    await Promise.all(tasks);
  });

  if (limitHit) return;
  runNode('scripts/quality-gate.mjs', slugs);
  const escalated = slugs.filter((s) => readJson(`work/${s}/quality-gate.json`)?.decision === 'escalate');
  for (const slug of escalated) {
    if (limitHit) break;
    await runAgent('amd-quality-manager',
      `task ${slug}/quality-verdict-${passTag}: quality-gate escalated ${slug}. Read work/${slug}/{quality-gate.json,review-design.md,honesty-auto.json,review-honesty.md,perf.json}. Write work/${slug}/quality-verdict.md.`,
      { tag: `${slug}-qual-mgr-${passTag}` });
  }
}

const forQuality = batch
  .filter((b) => b.slug && !['اجتاز', 'جاهز لمراجعتي'].includes(b.status) && builtSlugs.includes(b.slug))
  .filter((b) => DRY_RUN || readJson(`work/${b.slug}/prod-check.json`)?.verdict !== 'return')
  .map((b) => b.slug);

if (forQuality.length && !limitHit) {
  await runQualityPass(forQuality, 'p1');
  for (let round = 1; round <= MAX_FIX_ROUNDS && !limitHit; round++) {
    const qReturned = forQuality.filter((s) => {
      if ((fixRoundsUsed.get(s) || 0) >= MAX_FIX_ROUNDS) return false;
      const qv = existsSync(join(ROOT, `work/${s}/quality-verdict.md`)) ? readFileSync(join(ROOT, `work/${s}/quality-verdict.md`), 'utf8') : '';
      return /رجّعه المراجع/.test(qv);
    });
    if (!qReturned.length) break;
    for (const slug of qReturned) {
      if (limitHit) break;
      const r = (fixRoundsUsed.get(slug) || 0) + 1;
      fixRoundsUsed.set(slug, r);
      await routeProductionFix(slug, 'quality-fix', r);
    }
    const shippedFixed = await localGateThenShip(qReturned);
    await runQualityPass(shippedFixed, `fix${round}`);
  }
}

// ---------- Step 5: Batched Auto-Gated Sales (5 per session + 1 retry on ارجع) ----------
const passedQuality = builtSlugs.filter((s) => {
  const qg = readJson(`work/${s}/quality-gate.json`);
  const qv = existsSync(join(ROOT, `work/${s}/quality-verdict.md`)) ? readFileSync(join(ROOT, `work/${s}/quality-verdict.md`), 'utf8') : '';
  return qg?.decision === 'اجتاز' || /القرار:\s*اجتاز/.test(qv) || batch.find((b) => b.slug === s)?.status === 'اجتاز';
});

if (passedQuality.length && !limitHit) {
  const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
  for (const [ci, group] of chunk(passedQuality, 5).entries()) {
    if (limitHit) break;
    await runAgent('amd-message-writer',
      `task batch-messages-${ci + 1}: write ONE first message per slug (${group.join(', ')}) from each work/<slug>/materials.json to work/<slug>/message.txt.`,
      { tag: `batch-msg-writer-${ci + 1}` });
  }
  runNode('scripts/msg-check.mjs', passedQuality);

  const failedMsg = passedQuality.filter((s) => readJson(`work/${s}/msg-check.json`)?.verdict === 'fail');
  if (failedMsg.length && !limitHit) {
    await runAgent('amd-message-writer',
      `task batch-messages-fix: fix mechanical fails in work/<slug>/msg-check.json for: ${failedMsg.join(', ')}.`,
      { tag: 'batch-msg-fix' });
    runNode('scripts/msg-check.mjs', failedMsg);
  }

  const readyMsg = passedQuality.filter((s) => readJson(`work/${s}/msg-check.json`)?.verdict === 'pass');
  for (const [ci, group] of chunk(readyMsg, 5).entries()) {
    if (limitHit) break;
    await runAgent('amd-sales-manager',
      `task batch-sales-gate-${ci + 1}: msg-check passed for (${group.join(', ')}). Judge each work/<slug>/message.txt against work/<slug>/materials.json and write work/<slug>/sales-verdict.md.`,
      { tag: `batch-sales-mgr-${ci + 1}` });
  }

  const salesReturned = readyMsg.filter((s) => {
    const sv = existsSync(join(ROOT, `work/${s}/sales-verdict.md`)) ? readFileSync(join(ROOT, `work/${s}/sales-verdict.md`), 'utf8') : '';
    return /ارجع/.test(sv) && !/جاهز لمراجعتي/.test(sv);
  });
  if (salesReturned.length && !limitHit) {
    await runAgent('amd-message-writer',
      `task batch-messages-sales-retry: rewrite messages returned in work/<slug>/sales-verdict.md for: ${salesReturned.join(', ')}.`,
      { tag: 'batch-msg-sales-retry' });
    runNode('scripts/msg-check.mjs', salesReturned);
    const retryPass = salesReturned.filter((s) => readJson(`work/${s}/msg-check.json`)?.verdict === 'pass');
    if (retryPass.length && !limitHit) {
      await runAgent('amd-sales-manager',
        `task batch-sales-gate-retry: re-judge rewritten messages for (${retryPass.join(', ')}) and update work/<slug>/sales-verdict.md.`,
        { tag: 'batch-sales-mgr-retry' });
    }
  }
}

// ---------- Step 6: End Sync (ALWAYS runs even after rate-limit!) + Per-Role Telemetry ----------
if (builtSlugs.length) {
  if (hasNotionApi()) {
    runNode('scripts/notion-sync.mjs', ['update-batch', ...builtSlugs]);
  } else if (!limitHit) {
    await runAgent('amd-records-keeper',
      `task end-sync: update Notion rows for batch (${builtSlugs.join(', ')}) using work/<slug>/{ship.json,quality-verdict.md,quality-gate.json,message.txt,msg-check.json,sales-verdict.md}. Copy buttons verbatim from msg-check.json.`,
      { needsMcp: true, tag: '99-end-sync' });
  } else {
    log('! Rate limit reached & no ~/.config/amd-web/notion-token -> run notion-sync or amd-records-keeper on next window to sync completed rows.');
  }
}

const usageList = [...usageByRole.values()];
writeFileSync(join(RUN_DIR, 'usage.json'), JSON.stringify({ stamp: STAMP, limit_hit: limitHit, roles: usageList }, null, 1) + '\n');

// ---------- Step 7: Post-Run Audit by Khalil (amd-khalil) — ONLY when digest finds issues! ----------
if (!NO_KHALIL && !DRY_RUN) {
  const digRes = runNode('scripts/run-digest.mjs', [RUN_DIR, ...builtSlugs]);
  const digest = readJson(`work/_runs/${STAMP}/digest.json`);
  const incPath = join(ROOT, 'company/incidents.md');
  if (digest && (digest.has_issues || FORCE_KHALIL)) {
    if (!limitHit) {
      await runAgent('amd-khalil',
        `task postmortem-${STAMP}: read work/_runs/${STAMP}/digest.json and company/incidents.md. Diagnose root causes, write work/_runs/${STAMP}/khalil-report.md, and update company/incidents.md.`,
        { tag: '99-khalil-postmortem' });
    } else if (existsSync(incPath)) {
      const line = `| \`${STAMP}\` | ${digest.ready_count}/${digest.batch_size} | P0 (حد الاستخدام) | توقف عند حد الـ5 ساعات — راجع \`work/_runs/${STAMP}/digest.json\` |\n`;
      writeFileSync(incPath, readFileSync(incPath, 'utf8') + line);
    }
  } else if (digest && existsSync(incPath)) {
    const line = `| \`${STAMP}\` | ${digest.ready_count}/${digest.batch_size} | 0 / 0 / 0 | ✓ بلا أخطاء (لم يُستدعَ خليل) |\n`;
    writeFileSync(incPath, readFileSync(incPath, 'utf8') + line);
  }
} else if (!NO_KHALIL && DRY_RUN) {
  log('tool: node scripts/run-digest.mjs <run-dir> <slugs...> -> invokes amd-khalil (sonnet, mcp=isolated) ONLY if has_issues=true');
}

console.log(`\n=== ملخص الدفعة (${STAMP})${limitHit ? ' [توقف مبكر: حد الاستخدام]' : ''} ===`);
for (const slug of builtSlugs) {
  const ready = existsSync(join(ROOT, `work/${slug}/sales-verdict.md`)) && /جاهز لمراجعتي/.test(readFileSync(join(ROOT, `work/${slug}/sales-verdict.md`), 'utf8'));
  const score = readJson(`work/${slug}/quality-gate.json`)?.design_score ?? '-';
  console.log(`- ${slug}: ${ready ? 'جاهز لمراجعتي' : 'قيد المتابعة'} | تقييم ${score}/10 | https://amd-demos.pages.dev/${slug}/`);
}
if (usageList.length) {
  const k = (n) => `${Math.round(n / 1000)}k`;
  const tot = usageList.reduce((a, r) => ({
    calls: a.calls + r.calls, inp: a.inp + r.input + r.cache_write,
    read: a.read + r.cache_read, out: a.out + r.output, cost: a.cost + r.cost_usd
  }), { calls: 0, inp: 0, read: 0, out: 0, cost: 0 });
  console.log(`RUN USAGE: calls=${tot.calls} input=${k(tot.inp)} cache_read=${k(tot.read)} output=${k(tot.out)} (details: work/_runs/${STAMP}/usage.json)`);
} else {
  const cost = runNode('scripts/cost-report.mjs');
  console.log((cost.stdout.split('\n').find((l) => l.startsWith('TOTAL')) || 'TOTAL n/a').trim());
}
