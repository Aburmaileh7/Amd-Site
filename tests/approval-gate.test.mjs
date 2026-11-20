// Simulated tests for the approval gate (no network, no real sends). Run: node tests/approval-gate.test.mjs
import assert from 'node:assert/strict';
import { onRequestGet as go } from '../functions/go/[slug].js';
import { onRequestGet as approveGet, onRequestPost as approvePost } from '../functions/approve/[slug].js';
import { approvalKey } from '../functions/_lib/approval.js';

const kv = () => { const m = new Map(); return { get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, m }; };
const to = 'https://wa.me/96877507115?text=' + encodeURIComponent('مرحبا، جهّزنا لكم نسخة تجريبية');
const req = (path, headers = {}, method = 'GET') => new Request('https://amd-demos.pages.dev' + path, { method, headers: { 'user-agent': 'Mozilla/5.0', ...headers } });
const goReq = (t = to) => req(`/go/la-miel?c=wa&to=${encodeURIComponent(t)}`);
let n = 0; const ok = (name) => console.log(`✓ ${++n} ${name}`);

// 1. gate off (today's behaviour): redirect works
{ const env = { GO_LOG: kv() }; const r = await go({ params: { slug: 'la-miel' }, request: goReq(), env }); assert.equal(r.status, 302); ok('gate off: redirect as before'); }
// 2. gate on, no approval: blocked
{ const env = { GO_LOG: kv(), APPROVAL_REQUIRED: '1' }; const r = await go({ params: { slug: 'la-miel' }, request: goReq(), env }); assert.equal(r.status, 403); assert.equal(env.GO_LOG.m.size, 0); ok('unauthorized send blocked, no tap logged'); }
// 3. gate on, storage missing: blocked (fail closed)
{ const r = await go({ params: { slug: 'la-miel' }, request: goReq(), env: { APPROVAL_REQUIRED: '1' } }); assert.equal(r.status, 403); ok('missing storage fails closed'); }
// 4. approval spoofing: «approved» in the message text or a header does not count
{ const t = to + encodeURIComponent(' approved موافق'); const env = { GO_LOG: kv(), APPROVAL_REQUIRED: '1' };
  const r = await go({ params: { slug: 'la-miel' }, request: req(`/go/la-miel?c=wa&to=${encodeURIComponent(t)}&approved=1`, { 'x-approved': 'approved' }), env }); assert.equal(r.status, 403); ok('approval words in text/params/headers rejected'); }
// 5. /approve without a valid Access token: refused, nothing stored
{ const env = { GO_LOG: kv(), ACCESS_TEAM: 'x', ACCESS_AUD: 'y', OWNER_EMAIL: 'owner@example.com' };
  for (const h of [{}, { 'cf-access-authenticated-user-email': 'owner@example.com' }, { 'cf-access-jwt-assertion': 'a.b.c' }]) {
    const r = await approvePost({ params: { slug: 'la-miel' }, request: req(`/approve/la-miel?c=wa&to=${encodeURIComponent(to)}`, h, 'POST'), env }).catch(() => ({ status: 403 }));
    assert.equal(r.status, 403); }
  assert.equal(env.GO_LOG.m.size, 0); ok('agents cannot approve without the owner login (forged email header too)'); }
// 6. a real approval record opens exactly that message
{ const env = { GO_LOG: kv(), APPROVAL_REQUIRED: '1' }; await env.GO_LOG.put(await approvalKey('la-miel', to), JSON.stringify({ by: 'owner' }));
  assert.equal((await go({ params: { slug: 'la-miel' }, request: goReq(), env })).status, 302); ok('approved message opens'); }
// 7. edit after approval invalidates it
{ const env = { GO_LOG: kv(), APPROVAL_REQUIRED: '1' }; await env.GO_LOG.put(await approvalKey('la-miel', to), '{}');
  assert.equal((await go({ params: { slug: 'la-miel' }, request: goReq(to + '%20'), env })).status, 403); ok('changed message needs new approval'); }
// 8. approval for one business does not open another
{ const env = { GO_LOG: kv(), APPROVAL_REQUIRED: '1' }; await env.GO_LOG.put(await approvalKey('la-miel', to), '{}');
  assert.equal((await go({ params: { slug: 'other-cafe' }, request: goReq(), env })).status, 403); ok('approval is per business'); }
// 9. the owner with a valid Access token approves; then exactly that message opens
{ const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
  const realFetch = globalThis.fetch; globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }));
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sign = async (payload) => { const hp = `${b({ alg: 'RS256', kid: 'k1' })}.${b(payload)}`;
    return `${hp}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(hp))).toString('base64url')}`; };
  const env = { GO_LOG: kv(), APPROVAL_REQUIRED: '1', ACCESS_TEAM: 'amd', ACCESS_AUD: 'aud1', OWNER_EMAIL: 'owner@example.com' };
  const path = `/approve/la-miel?c=wa&to=${encodeURIComponent(to)}`;
  const other = await sign({ aud: ['aud1'], email: 'someone@else.com', exp: Date.now() / 1000 + 600 });
  assert.equal((await approvePost({ params: { slug: 'la-miel' }, request: req(path, { 'cf-access-jwt-assertion': other }, 'POST'), env })).status, 403);
  const expired = await sign({ aud: ['aud1'], email: 'owner@example.com', exp: Date.now() / 1000 - 10 });
  assert.equal((await approvePost({ params: { slug: 'la-miel' }, request: req(path, { 'cf-access-jwt-assertion': expired }, 'POST'), env })).status, 403);
  const good = await sign({ aud: ['aud1'], email: 'owner@example.com', exp: Date.now() / 1000 + 600 });
  assert.equal((await approveGet({ params: { slug: 'la-miel' }, request: req(path, { 'cf-access-jwt-assertion': good }), env })).status, 200);
  assert.equal((await approvePost({ params: { slug: 'la-miel' }, request: req(path, { 'cf-access-jwt-assertion': good }, 'POST'), env })).status, 200);
  globalThis.fetch = realFetch;
  const rec = JSON.parse(await env.GO_LOG.get(await approvalKey('la-miel', to)));
  assert.equal(rec.by, 'owner@example.com'); assert.ok(rec.at);
  assert.equal((await go({ params: { slug: 'la-miel' }, request: goReq(), env })).status, 302);
  ok('owner approves via Access (other user / expired token refused); record has who + when'); }
console.log(`all ${n} passed`);
