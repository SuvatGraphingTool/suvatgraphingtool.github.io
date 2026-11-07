// site/src/index.js — the site, and the small API beside it that keeps accounts.
//
// The user, 2 Nov: chats kept after the site is closed, then "an accounts
// system", signed in with Google or with an emailed link. Every address that
// is not /api/* is a file, served exactly as before. The API is on the site's
// own address so its cookie is the site's own: no browser blocks it.
//
//   GET    /api/me                       who is signed in, and how one can sign in
//   GET    /api/auth/google              → Google, and back to /callback
//   POST   /api/auth/email   {email}     an emailed sign-in link
//   GET    /api/auth/email/verify?t=     a page with one button, which POSTs it
//   POST   /api/auth/signout
//   DELETE /api/account                  the account, its sessions and its chats
//   GET    /api/chats                    every chat kept, as js/ai/chats.js keeps them
//   PUT    /api/chats/:id                one chat, if it is newer
//   DELETE /api/chats/:id
//   GET    /api/boards                   the two whiteboards
//   PUT    /api/boards/:slot             one of them (1 or 2), if it is newer
//
// Kept: a name, an email and the chats — nothing else. No passwords. Sessions
// and links are kept only as hashes. A change is accepted only from the site's
// own pages (its Origin), so no other site can act for a signed-in student.
//
// The site is also served from GitHub Pages, which has files only. Those pages
// (env.PAGES) call this API across addresses: another site's cookie is what
// browsers block, so there the session is a key sent as "Authorization: Bearer",
// kept by js/account.js. Google comes back here, as registered, and hands the
// page a code that works once, for a minute:
//   POST   /api/auth/exchange {code}     the code → the key

const COOKIE = '__Host-suvat_s';
const OAUTH = '__Host-suvat_o';
const DAY = 86_400;
const SESSION_DAYS = 60;
const LINK_MINUTES = 15;
const CODE_MS = 60_000;
const CHAT_MAX_BYTES = 400_000;
const BOARD_MAX_BYTES = 1_000_000;
const CHATS_MAX = 300;          // (not exported: a Worker's module may export only handlers)
const SENDS_PER_EMAIL = 3, SENDS_PER_IP = 10;   // an hour

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    const page = isPage(env, req.headers.get('Origin'));
    if (req.method === 'OPTIONS') return page ? cors(new Response(null, { status: 204 }), req) : json({ error: 'origin' }, 403);
    let res;
    try { res = await api(req, env, url); }
    catch (e) { console.error('api', e?.stack || e); res = json({ error: 'server', message: 'Something went wrong. Try again.' }, 500); }
    return page ? cors(res, req) : res;
  },
};

/** The site's pages on another address. No cookies cross: no credentials are allowed. */
const pages = (env) => String(env.PAGES || '').split(',').map((s) => s.trim()).filter(Boolean);
const isPage = (env, origin) => !!origin && pages(env).includes(origin);
function cors(res, req) {
  res.headers.set('Access-Control-Allow-Origin', req.headers.get('Origin'));
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.headers.set('Access-Control-Max-Age', '86400');
  res.headers.append('Vary', 'Origin');
  return res;
}

async function api(req, env, url) {
  const path = url.pathname, m = req.method;
  const origin = req.headers.get('Origin');
  if (m !== 'GET' && m !== 'HEAD' && origin !== url.origin && !isPage(env, origin)) {
    return json({ error: 'origin' }, 403);
  }
  if (path === '/api/me' && m === 'GET') return me(req, env);
  if (path === '/api/auth/google' && m === 'GET') return googleStart(env, url);
  if (path === '/api/auth/google/callback' && m === 'GET') return googleBack(req, env, url);
  if (path === '/api/auth/email' && m === 'POST') return emailSend(req, env, url);
  if (path === '/api/auth/email/verify' && m === 'GET') return emailPage(url);
  if (path === '/api/auth/email/verify' && m === 'POST') return emailVerify(req, env);
  if (path === '/api/auth/exchange' && m === 'POST') return exchange(req, env);
  if (path === '/api/auth/signout' && m === 'POST') return signOut(req, env);

  const user = await whoIs(req, env);
  if (path === '/api/account' && m === 'DELETE') {
    if (!user) return json({ error: 'signed-out' }, 401);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM chats WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM boards WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);
    return json({ ok: true }, 200, { 'Set-Cookie': clear(COOKIE) });
  }
  if (path === '/api/chats' && m === 'GET') {
    if (!user) return json({ error: 'signed-out' }, 401);
    const { results } = await env.DB.prepare('SELECT id, updated, deleted, data FROM chats WHERE user_id = ? ORDER BY updated DESC LIMIT ?')
      .bind(user.id, CHATS_MAX).all();
    return json({ chats: results.map((r) => ({ id: r.id, updated: r.updated, deleted: !!r.deleted, data: r.data ? JSON.parse(r.data) : null })) });
  }
  const one = path.match(/^\/api\/chats\/([\w-]{1,64})$/);
  if (one && (m === 'PUT' || m === 'DELETE')) {
    if (!user) return json({ error: 'signed-out' }, 401);
    return m === 'PUT' ? putChat(req, env, user, one[1]) : dropChat(env, user, one[1]);
  }
  if (path === '/api/boards' && m === 'GET') {
    if (!user) return json({ error: 'signed-out' }, 401);
    const { results } = await env.DB.prepare('SELECT slot, updated, data FROM boards WHERE user_id = ? ORDER BY slot').bind(user.id).all();
    return json({ boards: results.map((r) => ({ slot: r.slot, updated: r.updated, ...(r.data ? JSON.parse(r.data) : {}) })) });
  }
  const board = path.match(/^\/api\/boards\/([12])$/);
  if (board && m === 'PUT') {
    if (!user) return json({ error: 'signed-out' }, 401);
    return putBoard(req, env, user, Number(board[1]));
  }
  return json({ error: 'not-found' }, 404);
}

/* ── who is signed in ─────────────────────────────────────────────────── */
function providers(env) {
  return { google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), email: !!(env.RESEND_API_KEY && env.MAIL_FROM) };
}
async function me(req, env) {
  const user = await whoIs(req, env);
  const ways = providers(env);
  // an emailed link signs in on this address, which is no use to a page on another
  if (isPage(env, req.headers.get('Origin'))) ways.email = false;
  return json({ user: user && { name: user.name || '', email: user.email || '' }, providers: ways });
}
/** The session's token: the page's key, or the site's own cookie. */
function sessionToken(req) {
  const bearer = (req.headers.get('Authorization') || '').match(/^Bearer ([\w-]{43})$/);
  return bearer ? bearer[1] : cookie(req, COOKIE);
}
async function whoIs(req, env) {
  const token = sessionToken(req);
  if (!token || !/^[\w-]{43}$/.test(token)) return null;
  const now = Date.now();
  const row = await env.DB.prepare('SELECT u.id, u.email, u.name, s.expires FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.hash = ?')
    .bind(await sha(token)).first();
  if (!row || row.expires < now) return null;
  return row;
}
async function newSession(env, userId) {
  const token = rand();
  await env.DB.prepare('INSERT INTO sessions (hash, user_id, expires) VALUES (?, ?, ?)')
    .bind(await sha(token), userId, Date.now() + SESSION_DAYS * DAY * 1000).run();
  return token;
}
async function startSession(env, userId) {
  return `${COOKIE}=${await newSession(env, userId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * DAY}`;
}
/** A page on another address swaps the code Google's return gave it for its key. */
async function exchange(req, env) {
  if (!isPage(env, req.headers.get('Origin'))) return json({ error: 'origin' }, 403);
  const code = String((await req.json().catch(() => ({})))?.code || '');
  if (!/^[\w-]{43}$/.test(code)) return json({ error: 'code' }, 400);
  const row = await env.DB.prepare('DELETE FROM login_tokens WHERE hash = ? RETURNING email, expires').bind(await sha(code)).first();
  if (!row || row.expires < Date.now()) return json({ error: 'code' }, 400);
  return json({ ok: true, token: await newSession(env, await account(env, { email: row.email })) });
}
async function signOut(req, env) {
  const token = sessionToken(req);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE hash = ?').bind(await sha(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': clear(COOKIE) });
}
/** The account for a verified email — and, from Google, its id — made if new. */
async function account(env, { email, name = null, sub = null }) {
  let u = sub ? await env.DB.prepare('SELECT id, name FROM users WHERE google_sub = ?').bind(sub).first() : null;
  if (!u && email) u = await env.DB.prepare('SELECT id, name FROM users WHERE email = ?').bind(email).first();
  if (u) {
    await env.DB.prepare('UPDATE users SET google_sub = COALESCE(google_sub, ?), name = COALESCE(?, name), email = COALESCE(email, ?) WHERE id = ?')
      .bind(sub, name, email, u.id).run();
    return u.id;
  }
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO users (id, email, name, google_sub, created) VALUES (?, ?, ?, ?, ?)')
    .bind(id, email, name, sub, Date.now()).run();
  return id;
}

/* ── Google ───────────────────────────────────────────────────────────── */
async function googleStart(env, url) {
  if (!providers(env).google) return json({ error: 'not-set-up' }, 404);
  const state = rand(), verifier = rand();
  // Which page to return to: only one of the site's, so this redirects nowhere
  // else. Its nonce comes back with the code, so a code in a link someone else
  // sent cannot sign a student in to the sender's account.
  const to = pages(env).indexOf(url.searchParams.get('to'));
  const nonce = url.searchParams.get('n') || '';
  if (url.searchParams.has('to') && (to < 0 || !/^[\w-]{43}$/.test(nonce))) return json({ error: 'to' }, 400);
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return go(`https://accounts.google.com/o/oauth2/v2/auth?${q}`,
    `${OAUTH}=${state}.${verifier}${to < 0 ? '' : `.${to}.${nonce}`}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
}
async function googleBack(req, env, url) {
  const [state, verifier, to, nonce] = (cookie(req, OAUTH) || '').split('.');
  const page = to === undefined ? '' : pages(env)[Number(to)] ?? '';
  const out = (how, set) => { const r = go(`${page}/?signin=${how}`, clear(OAUTH)); if (set) r.headers.append('Set-Cookie', set); return r; };
  if (!providers(env).google) return out('failed');
  if (url.searchParams.get('error')) return out('cancelled');
  if (!state || !verifier || url.searchParams.get('state') !== state) return out('failed');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: url.searchParams.get('code') || '',
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!res.ok) return out('failed');
  // The ID token comes straight from Google's token endpoint over TLS, so its
  // claims are Google's own (OpenID Connect Core 3.1.3.7); they are checked.
  const claims = jwtClaims((await res.json().catch(() => ({}))).id_token);
  const iss = claims?.iss;
  if (!claims || (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com')
      || claims.aud !== env.GOOGLE_CLIENT_ID || !(claims.exp * 1000 > Date.now())
      || !claims.sub || !claims.email || claims.email_verified === false) return out('failed');
  const id = await account(env, { email: String(claims.email).toLowerCase(), name: claims.name ? String(claims.name).slice(0, 80) : null, sub: String(claims.sub) });
  if (page) {
    const code = rand(), email = String(claims.email).toLowerCase();
    await env.DB.prepare('INSERT INTO login_tokens (hash, email, expires) VALUES (?, ?, ?)').bind(await sha(code), email, Date.now() + CODE_MS).run();
    return go(`${page}/#signin=${code}.${nonce}`, clear(OAUTH));   // after the #, so it reaches no server's log
  }
  return out('ok', await startSession(env, id));
}

/* ── an emailed link ──────────────────────────────────────────────────── */
async function emailSend(req, env, url) {
  if (!providers(env).email || isPage(env, req.headers.get('Origin'))) return json({ error: 'not-set-up', message: 'Email sign-in is not switched on yet.' }, 404);
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'email', message: 'That does not look like an email address.' }, 400);
  }
  const now = Date.now(), hour = now - 3600_000;
  const ip = req.headers.get('CF-Connecting-IP') || '';
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_sends WHERE at < ?').bind(now - DAY * 1000),
    env.DB.prepare('DELETE FROM login_tokens WHERE expires < ?').bind(now),
  ]);
  const byEmail = await env.DB.prepare('SELECT COUNT(*) AS n FROM auth_sends WHERE email = ? AND at > ?').bind(email, hour).first('n');
  const byIp = ip ? await env.DB.prepare('SELECT COUNT(*) AS n FROM auth_sends WHERE ip = ? AND at > ?').bind(ip, hour).first('n') : 0;
  if (byEmail >= SENDS_PER_EMAIL || byIp >= SENDS_PER_IP) {
    return json({ error: 'busy', message: 'Too many links asked for. Try again in an hour.' }, 429);
  }
  const token = rand();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO auth_sends (email, ip, at) VALUES (?, ?, ?)').bind(email, ip, now),
    env.DB.prepare('INSERT INTO login_tokens (hash, email, expires) VALUES (?, ?, ?)').bind(await sha(token), email, now + LINK_MINUTES * 60_000),
  ]);
  const link = `${url.origin}/api/auth/email/verify?t=${token}`;
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM, to: [email], subject: 'Your SUVAT sign-in link',
      text: `Sign in to SUVAT:\n\n${link}\n\nThe link works once, for ${LINK_MINUTES} minutes. If you did not ask for it, ignore this email.`,
      html: `<p>Sign in to SUVAT:</p><p><a href="${link}">Sign in</a></p><p style="color:#666">The link works once, for ${LINK_MINUTES} minutes. If you did not ask for it, ignore this email.</p>`,
    }),
  });
  if (!sent.ok) return json({ error: 'mail', message: 'The email could not be sent. Try again in a minute.' }, 502);
  return json({ ok: true });
}
/** The link opens a page with one button: a mail scanner that follows links spends nothing. */
function emailPage(url) {
  const t = url.searchParams.get('t') || '';
  if (!/^[\w-]{43}$/.test(t)) return go('/?signin=expired');
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in | SUVAT</title><meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#0f1011;color:#f3f4f6}
form{display:grid;gap:16px;text-align:center;padding:32px}h1{margin:0;font-size:22px;letter-spacing:.06em}
button{font:inherit;font-weight:600;padding:12px 28px;border:0;border-radius:10px;background:#f3f4f6;color:#0f1011;cursor:pointer}
p{margin:0;color:#9ca3af;font-size:14px}</style>
<form method="post" action="/api/auth/email/verify"><h1>SUVAT</h1><input type="hidden" name="t" value="${t}">
<button type="submit" autofocus>Sign in</button><p>The link works once.</p></form></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin' } });
}
async function emailVerify(req, env) {
  const t = String((await req.formData().catch(() => null))?.get('t') || '');
  if (!/^[\w-]{43}$/.test(t)) return go('/?signin=expired');
  const hash = await sha(t);
  const row = await env.DB.prepare('DELETE FROM login_tokens WHERE hash = ? RETURNING email, expires').bind(hash).first();
  if (!row || row.expires < Date.now()) return go('/?signin=expired');
  const id = await account(env, { email: row.email });
  return go('/?signin=ok', await startSession(env, id));
}

/* ── the chats ────────────────────────────────────────────────────────── */
async function putChat(req, env, user, id) {
  const text = await req.text();
  if (text.length > CHAT_MAX_BYTES) return json({ error: 'too-big', message: 'That chat is too big to keep.' }, 413);
  let c; try { c = JSON.parse(text); } catch { return json({ error: 'json' }, 400); }
  if (!c || c.id !== id || !Array.isArray(c.turns) || typeof c.updated !== 'number' || !isFinite(c.updated)) return json({ error: 'chat' }, 400);
  // the newer of the two wins: a device that was offline does not undo what another did since
  await env.DB.prepare(`INSERT INTO chats (user_id, id, updated, deleted, data) VALUES (?, ?, ?, 0, ?)
      ON CONFLICT (user_id, id) DO UPDATE SET updated = excluded.updated, deleted = 0, data = excluded.data
      WHERE excluded.updated >= chats.updated`).bind(user.id, id, c.updated, text).run();
  await trim(env, user);
  return json({ ok: true });
}
async function dropChat(env, user, id) {
  await env.DB.prepare(`INSERT INTO chats (user_id, id, updated, deleted, data) VALUES (?, ?, ?, 1, NULL)
      ON CONFLICT (user_id, id) DO UPDATE SET updated = MAX(chats.updated + 1, excluded.updated), deleted = 1, data = NULL`)
    .bind(user.id, id, Date.now()).run();
  await trim(env, user);
  return json({ ok: true });
}
/* ── the two whiteboards ─────────────────────────────────────────────── */
async function putBoard(req, env, user, slot) {
  const text = await req.text();
  if (text.length > BOARD_MAX_BYTES) return json({ error: 'too-big', message: 'That board is too big to keep. Clear some of it.' }, 413);
  let b; try { b = JSON.parse(text); } catch { return json({ error: 'json' }, 400); }
  if (!b || typeof b.updated !== 'number' || !isFinite(b.updated)) return json({ error: 'board' }, 400);
  const data = JSON.stringify({ board: b.board ?? null, ink: b.ink ?? null });
  await env.DB.prepare(`INSERT INTO boards (user_id, slot, updated, data) VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, slot) DO UPDATE SET updated = excluded.updated, data = excluded.data
      WHERE excluded.updated >= boards.updated`).bind(user.id, slot, b.updated, data).run();
  return json({ ok: true });
}

/** At most CHATS_MAX rows an account; the oldest go. */
async function trim(env, user) {
  await env.DB.prepare(`DELETE FROM chats WHERE user_id = ?1 AND id NOT IN
      (SELECT id FROM chats WHERE user_id = ?1 ORDER BY updated DESC LIMIT ?2)`).bind(user.id, CHATS_MAX).run();
}

/* ── small things ─────────────────────────────────────────────────────── */
function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
}
function go(where, setCookie) {
  const h = new Headers({ Location: where, 'Cache-Control': 'no-store' });
  if (setCookie) h.append('Set-Cookie', setCookie);
  return new Response(null, { status: 303, headers: h });
}
function cookie(req, name) {
  for (const part of (req.headers.get('Cookie') || '').split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}
const clear = (name) => `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
function rand() { return b64url(crypto.getRandomValues(new Uint8Array(32))); }
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha(s) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function jwtClaims(jwt) {
  try {
    const p = String(jwt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p), (ch) => ch.charCodeAt(0))));
  } catch { return null; }
}
