// Send button hop: /go/<slug>?c=wa|ig&to=<wa.me or ig.me link>
// Records that the owner tapped the button (so the team can mark the client as sent), then opens WhatsApp / Instagram.
// Needs a KV binding GO_LOG; without it the redirect still works, nothing is recorded.
// Approval gate: when env.APPROVAL_REQUIRED = "1", the link opens only if the owner approved this exact
// link (message included) on /approve. Missing storage or approval → blocked (fail closed).
import { approvalKey } from '../_lib/approval.js';

const TARGET = /^https:\/\/(wa\.me|ig\.me)\//;
const PREVIEW_BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|notion|embed/i;

export async function onRequestGet({ params, request, env }) {
  const url = new URL(request.url);
  const to = url.searchParams.get('to') || '';
  const channel = url.searchParams.get('c') === 'ig' ? 'ig' : 'wa';
  const slug = String(params.slug || '');
  if (!TARGET.test(to) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return new Response('Bad link', { status: 400 });

  if (env.APPROVAL_REQUIRED === '1') {
    const approved = env.GO_LOG && (await env.GO_LOG.get(await approvalKey(slug, to)));
    if (!approved) return new Response('لم يوافق المالك على هذه الرسالة بنصها الحالي.', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }

  // link-preview fetchers must not count as a send
  const agent = request.headers.get('user-agent') || '';
  if (env.GO_LOG && !PREVIEW_BOT.test(agent)) {
    await env.GO_LOG.put(`tap:${slug}:${channel}`, new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 90 });
  }
  return new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' } });
}
