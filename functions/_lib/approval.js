// Shared by /approve and /go: approval records and Cloudflare Access identity.
// Approval record key: approval:<slug>:<sha256 of the exact wa.me / ig.me link, message included>.

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const approvalKey = async (slug, to) => `approval:${slug}:${await sha256(to)}`;

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

// Returns the owner's email only when the request carries a valid Cloudflare Access token
// for this app (env.ACCESS_TEAM, env.ACCESS_AUD) and the email is env.OWNER_EMAIL. Otherwise null.
export async function ownerFromAccess(request, env) {
  const jwt = request.headers.get('cf-access-jwt-assertion');
  if (!jwt || !env.ACCESS_TEAM || !env.ACCESS_AUD || !env.OWNER_EMAIL) return null;
  const [h, p, s] = jwt.split('.');
  if (!h || !p || !s) return null;
  const header = JSON.parse(new TextDecoder().decode(b64url(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64url(p)));
  const certs = await (await fetch(`https://${env.ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`)).json();
  const jwk = (certs.keys || []).find((k) => k.kid === header.kid);
  if (!jwk || header.alg !== 'RS256') return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
  const aud = [].concat(payload.aud || []);
  if (!ok || !aud.includes(env.ACCESS_AUD) || payload.exp * 1000 < Date.now()) return null;
  return String(payload.email || '').toLowerCase() === env.OWNER_EMAIL.toLowerCase() ? payload.email : null;
}
