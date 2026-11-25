#!/usr/bin/env node
// Direct Notion REST API sync for Amd web (ZERO LLM tokens).
// Token file: ~/.config/amd-web/notion-token (or env NOTION_TOKEN). Never printed.
// Usage:
//   node scripts/notion-sync.mjs check
//   node scripts/notion-sync.mjs sync-sent
//   node scripts/notion-sync.mjs backlog [limit=4]
//   node scripts/notion-sync.mjs create-leads <work/_leads/YYYYMMDD.json>
//   node scripts/notion-sync.mjs update-batch <slug1> [slug2...]
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = `${homedir()}/.config/amd-web/notion-token`;
const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || '5af929b8-a82c-45cf-ab8f-f48df84f7460';
const NOTION_VERSION = '2025-09-03';
const FROZEN_STATUSES = new Set(['انبعت', 'رد العميل', 'رد مقترح جاهز', 'تم الاتفاق', 'مش مهتم']);

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: notion-sync.mjs check | sync-sent | backlog [limit] | create-leads <file> | update-batch <slug...>');
  process.exit(2);
}

const token = process.env.NOTION_TOKEN || (existsSync(TOKEN_PATH) ? readFileSync(TOKEN_PATH, 'utf8').trim() : '');
if (!token) {
  console.error(`✗ Notion token not found at ${TOKEN_PATH} (create an Internal Integration in Notion and save the secret there)`);
  process.exit(2);
}

async function notionReq(path, method = 'GET', body = null) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Notion ${method} ${path} HTTP ${res.status}: ${text.slice(0, 260)}`);
  return text ? JSON.parse(text) : {};
}

async function queryRows(filter = undefined, maxRows = 500) {
  const results = [];
  let cursor = undefined;
  let useLegacy = false;
  while (results.length < maxRows) {
    const pageSize = Math.min(100, maxRows - results.length);
    const payload = { page_size: pageSize, ...(filter ? { filter } : {}), ...(cursor ? { start_cursor: cursor } : {}) };
    let data;
    if (!useLegacy) {
      try {
        data = await notionReq(`/data_sources/${DATA_SOURCE_ID}/query`, 'POST', payload);
      } catch (e) {
        if (/404|object_not_found/i.test(e.message)) {
          useLegacy = true;
          data = await notionReq(`/databases/${DATA_SOURCE_ID}/query`, 'POST', payload);
        } else throw e;
      }
    } else {
      data = await notionReq(`/databases/${DATA_SOURCE_ID}/query`, 'POST', payload);
    }
    results.push(...(data.results || []));
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return results;
}

const getTitle = (p, k) => (p.properties?.[k]?.title || []).map((t) => t.plain_text).join('').trim();
const getText = (p, k) => (p.properties?.[k]?.rich_text || []).map((t) => t.plain_text).join('').trim();
const getSelect = (p, k) => p.properties?.[k]?.select?.name || null;
const getUrl = (p, k) => p.properties?.[k]?.url || null;
const slugFromPageUrl = (u) => {
  const m = String(u || '').match(/amd-demos\.pages\.dev\/([a-z0-9-]+)\/?/i);
  return m ? m[1] : null;
};

const richText = (s) => ({ rich_text: s ? [{ text: { content: String(s).slice(0, 1950) } }] : [] });
const selectProp = (name) => (name ? { select: { name } } : undefined);
const urlProp = (u) => (u ? { url: u } : { url: null });
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const readTxt = (p) => (existsSync(p) ? readFileSync(p, 'utf8').trim() : '');

if (cmd === 'check') {
  const rows = await queryRows(undefined, 1);
  console.log(`✓ Notion API connected (${DATA_SOURCE_ID}, sample rows=${rows.length})`);
  process.exit(0);
}

if (cmd === 'sync-sent') {
  const taps = JSON.parse(execFileSync(process.execPath, [join(DIR, 'go-log-check.mjs')], { encoding: 'utf8' }));
  if (!taps.length) { console.log(JSON.stringify({ updated: 0, rows: [] })); process.exit(0); }
  const rows = await queryRows({ property: 'الحالة', select: { equals: 'جاهز لمراجعتي' } }, 500);
  const bySlug = new Map();
  for (const r of rows) {
    const s = slugFromPageUrl(getUrl(r, 'رابط الصفحة'));
    if (s) bySlug.set(s, r);
  }
  const updated = [];
  for (const t of taps) {
    const row = bySlug.get(t.slug);
    if (!row) continue;
    const status = getSelect(row, 'الحالة');
    if (FROZEN_STATUSES.has(status)) continue;
    await notionReq(`/pages/${row.id}`, 'PATCH', {
      properties: {
        'الحالة': selectProp('انبعت'),
        'تاريخ الإرسال': { date: { start: t.date } }
      }
    });
    updated.push({ slug: t.slug, name: getTitle(row, 'العميل'), date: t.date });
  }
  console.log(JSON.stringify({ updated: updated.length, rows: updated }, null, 1));
  process.exit(0);
}

if (cmd === 'backlog') {
  const limit = Number(args[0] || 4);
  // Priority: furthest along first (اجتاز → صفحة جاهزة → رجّعه المراجع → جديد)
  const order = ['اجتاز', 'صفحة جاهزة', 'رجّعه المراجع', 'جديد'];
  const out = [];
  for (const st of order) {
    if (out.length >= limit) break;
    const rows = await queryRows({ property: 'الحالة', select: { equals: st } }, limit);
    for (const r of rows) {
      if (out.length >= limit) break;
      out.push({
        page_id: r.id,
        name: getTitle(r, 'العميل'),
        status: st,
        slug: slugFromPageUrl(getUrl(r, 'رابط الصفحة')),
        link: getUrl(r, 'الرابط'),
        page_url: getUrl(r, 'رابط الصفحة'),
        country: getSelect(r, 'البلد'),
        type: getSelect(r, 'النوع'),
        contact: getText(r, 'طريقة التواصل')
      });
    }
  }
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
}

if (cmd === 'create-leads') {
  const file = args[0];
  if (!file || !existsSync(file)) { console.error('✗ leads file missing'); process.exit(2); }
  const leads = JSON.parse(readFileSync(file, 'utf8'));
  const existing = await queryRows(undefined, 1000);
  const existingNames = new Set(existing.map((r) => getTitle(r, 'العميل').toLowerCase()));
  const existingLinks = new Set(existing.map((r) => getUrl(r, 'الرابط')).filter(Boolean));
  const today = new Date().toISOString().slice(0, 10);
  const created = [];
  for (const l of leads) {
    if (!l.name || existingNames.has(l.name.toLowerCase()) || (l.link && existingLinks.has(l.link))) continue;
    const contact = [l.instagram, l.whatsapp].filter(Boolean).join(' | ');
    const props = {
      'العميل': { title: [{ text: { content: l.name } }] },
      'التاريخ': { date: { start: today } },
      'الحالة': selectProp('جديد'),
      'موافقتي': selectProp('بانتظارك'), // only allowed write on موافقتي: at creation
      ...(l.country ? { 'البلد': selectProp(l.country) } : {}),
      ...(l.type ? { 'النوع': selectProp(l.type) } : {}),
      ...(l.link ? { 'الرابط': { url: l.link } } : {}),
      ...(contact ? { 'طريقة التواصل': richText(contact) } : {}),
      ...(l.why ? { 'ليش فرصة': richText(l.why) } : {})
    };
    const res = await notionReq('/pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: DATA_SOURCE_ID },
      properties: props
    });
    created.push({ page_id: res.id, name: l.name, slug: l.slug || null });
  }
  console.log(JSON.stringify({ created: created.length, rows: created }, null, 1));
  process.exit(0);
}

if (cmd === 'update-batch') {
  if (!args.length) { console.error('usage: notion-sync.mjs update-batch <slug...>'); process.exit(2); }
  const allRows = await queryRows({
    or: ['جديد', 'صفحة جاهزة', 'رجّعه المراجع', 'اجتاز', 'جاهز لمراجعتي'].map((s) => ({
      property: 'الحالة', select: { equals: s }
    }))
  }, 500);

  const findRow = (slug, name, mapsUrl) => allRows.find((r) => {
    if (slugFromPageUrl(getUrl(r, 'رابط الصفحة')) === slug) return true;
    if (mapsUrl && getUrl(r, 'الرابط') === mapsUrl) return true;
    if (name && getTitle(r, 'العميل').toLowerCase() === name.toLowerCase()) return true;
    return false;
  });

  const updated = [];
  for (const slug of args) {
    const mat = readJson(`work/${slug}/materials.json`) || {};
    const place = readJson(`sites/${slug}/place.json`) || {};
    const ship = readJson(`work/${slug}/ship.json`) || {};
    const qGate = readJson(`work/${slug}/quality-gate.json`);
    const qVerdict = readTxt(`work/${slug}/quality-verdict.md`);
    const msgCheck = readJson(`work/${slug}/msg-check.json`);
    const msgTxt = readTxt(`work/${slug}/message.txt`);
    const salesVerdict = readTxt(`work/${slug}/sales-verdict.md`);

    const row = findRow(slug, place.name || mat.name, mat.facts?.google_maps_url || mat.maps_url);
    if (!row) { console.error(`! ${slug}: no matching Notion row found`); continue; }
    if (FROZEN_STATUSES.has(getSelect(row, 'الحالة'))) { console.error(`! ${slug}: frozen row skipped`); continue; }

    let nextStatus = null;
    if (/جاهز لمراجعتي/.test(salesVerdict) && msgCheck?.verdict === 'pass') nextStatus = 'جاهز لمراجعتي';
    else if (qGate?.decision === 'اجتاز' || /القرار:\s*اجتاز/.test(qVerdict)) nextStatus = 'اجتاز';
    else if (/رجّعه المراجع/.test(qVerdict)) nextStatus = 'رجّعه المراجع';
    else if (ship?.live?.[slug]?.startsWith('https')) nextStatus = 'صفحة جاهزة';

    const props = {};
    if (nextStatus) props['الحالة'] = selectProp(nextStatus);
    if (ship?.live?.[slug]?.startsWith('https')) props['رابط الصفحة'] = urlProp(ship.live[slug]);
    if (qGate?.design_score != null) props['تقييم المراجع'] = { number: qGate.design_score };
    if (qVerdict) {
      const lines = qVerdict.split('\n').map((l) => l.trim()).filter(Boolean);
      const ideaIdx = lines.findIndex((l) => /اقتراح|ميزة|فكرة|ideas?/i.test(l));
      const notesLines = (ideaIdx > 0 ? lines.slice(0, ideaIdx) : lines).slice(0, 4);
      const ideaLines = ideaIdx >= 0 ? lines.slice(ideaIdx).slice(0, 3) : [];
      props['ملاحظات المراجع'] = richText(`🔍 جودة: ${notesLines.join(' · ')}`);
      if (ideaLines.length) props['اقتراحات المراجع'] = richText(ideaLines.join(' · '));
    }
    if (nextStatus === 'جاهز لمراجعتي' && msgTxt) {
      props['الرسالة'] = richText(msgTxt);
      if (msgCheck?.buttons?.wa) props['زر واتساب'] = urlProp(msgCheck.buttons.wa);
      if (msgCheck?.buttons?.ig) props['زر إنستغرام'] = urlProp(msgCheck.buttons.ig);
    }

    if (Object.keys(props).length) {
      await notionReq(`/pages/${row.id}`, 'PATCH', { properties: props });
      updated.push({ slug, status: nextStatus, page_id: row.id });
    }
  }
  console.log(JSON.stringify({ updated: updated.length, rows: updated }, null, 1));
  process.exit(0);
}

console.error(`unknown command: ${cmd}`);
process.exit(2);
