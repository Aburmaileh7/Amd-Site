// Owner approval page: /approve/<slug>?c=wa|ig&to=<exact wa.me / ig.me link>
// Must sit behind Cloudflare Access (owner only). It also verifies the Access token itself, so it fails
// closed if Access is missing or misconfigured. GET shows the exact message; POST records the approval.
import { approvalKey, ownerFromAccess } from '../_lib/approval.js';

const TARGET = /^https:\/\/(wa\.me|ig\.me)\//;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const page = (body, status = 200) => new Response(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>موافقة</title><body style="font-family:system-ui;max-width:640px;margin:2rem auto;padding:0 16px;line-height:1.7">${body}</body></html>`,
  { status, headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

async function check({ params, request, env }) {
  const url = new URL(request.url);
  const slug = String(params.slug || '');
  const to = url.searchParams.get('to') || '';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !TARGET.test(to)) return { error: page('رابط غير صالح', 400) };
  if (!env.GO_LOG) return { error: page('التخزين غير مربوط', 503) };
  const owner = await ownerFromAccess(request, env);
  if (!owner) return { error: page('هذه الصفحة للمالك فقط', 403) };
  return { slug, to, owner, channel: url.searchParams.get('c') === 'ig' ? 'ig' : 'wa' };
}

export async function onRequestGet(ctx) {
  const c = await check(ctx); if (c.error) return c.error;
  const key = await approvalKey(c.slug, c.to);
  const done = await ctx.env.GO_LOG.get(key);
  const text = c.to.includes('text=') ? decodeURIComponent(new URL(c.to).searchParams.get('text') || '') : '(بدون نص — رابط محادثة فقط)';
  return page(`<h1>${esc(c.slug)}</h1><p>القناة: ${c.channel === 'ig' ? 'إنستغرام' : 'واتساب'}</p>
<pre style="white-space:pre-wrap;background:#f4f4f4;padding:1rem;border-radius:8px">${esc(text)}</pre>
${done ? `<p>✅ موافَق عليها: ${esc(JSON.parse(done).at)}</p>` : `<form method="post"><button style="font-size:1.2rem;padding:.6rem 2rem">موافق</button></form>`}`);
}

export async function onRequestPost(ctx) {
  const c = await check(ctx); if (c.error) return c.error;
  const record = { slug: c.slug, channel: c.channel, to: c.to, by: c.owner, at: new Date().toISOString() };
  await ctx.env.GO_LOG.put(await approvalKey(c.slug, c.to), JSON.stringify(record));
  return page(`<p>✅ تمت الموافقة على هذه النسخة بالضبط (${esc(record.at)}). أي تعديل على النص يحتاج موافقة جديدة.</p>`);
}
