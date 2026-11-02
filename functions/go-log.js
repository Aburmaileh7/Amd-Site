// Read the send-button taps: GET /go-log with header "Authorization: Bearer <GO_LOG_KEY>".
// Returns [{ slug, channel, at }]. Anyone without the key gets a 404.

export async function onRequestGet({ request, env }) {
  const auth = request.headers.get('authorization') || '';
  if (!env.GO_LOG || !env.GO_LOG_KEY || auth !== `Bearer ${env.GO_LOG_KEY}`) return new Response('Not found', { status: 404 });

  const taps = [];
  let cursor;
  do {
    const page = await env.GO_LOG.list({ prefix: 'tap:', cursor });
    for (const k of page.keys) {
      const [, slug, channel] = k.name.split(':');
      taps.push({ slug, channel, at: await env.GO_LOG.get(k.name) });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return new Response(JSON.stringify(taps), { headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } });
}
