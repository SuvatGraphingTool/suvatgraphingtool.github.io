// account.test.mjs — proves the accounts API keeps what it should and only that. Run with:
//     node test/account.test.mjs
//
// site/src/index.js is run as Cloudflare runs it, against a real SQLite
// database built from site/schema.sql (Node's own, standing in for D1), with
// Google and the email service played by hand. The claims:
//   - an emailed link signs in once, for fifteen minutes, and a scanner that
//     follows it spends nothing;
//   - Google's answer is checked before anyone is signed in;
//   - the same verified email is the same account, however one signs in;
//   - a chat is kept in its own account only, the newer copy wins, and a
//     deletion is heard by every device;
//   - nothing changes from another site's page; signing out and deleting the
//     account leave nothing behind.

import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import site from '../site/src/index.js';
const CHATS_MAX = 300;   // site/src/index.js's own limit (a Worker module exports only its handlers)

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}`); }
}
async function group(name, fn) { console.log(`\n${name}`); await fn(); }

/* D1, over Node's SQLite: prepare → bind → first / all / run, and batch. */
function d1(db) {
  return {
    prepare(sql) {
      const st = db.prepare(sql);
      const make = (args) => ({
        bind: (...a) => make(a.map((v) => (v === undefined ? null : v))),
        first: async (col) => { const r = st.get(...args); return r == null ? null : col ? r[col] : { ...r }; },
        all: async () => ({ results: st.all(...args).map((r) => ({ ...r })) }),
        run: async () => ({ meta: { changes: st.run(...args).changes } }),
      });
      return make([]);
    },
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
  };
}
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(new URL('../site/schema.sql', import.meta.url), 'utf8'));
const ORIGIN = 'https://suvat.example';
const env = {
  DB: d1(db),
  ASSETS: { fetch: async (r) => new Response(`file ${new URL(r.url).pathname}`) },
  GOOGLE_CLIENT_ID: 'cid.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'shh',
  RESEND_API_KEY: 're_test', MAIL_FROM: 'SUVAT <hello@suvat.example>',
};

/* The world outside: Google's token endpoint and the email service. */
const mail = [];
let google = null;   // the claims Google's next token answers with
globalThis.fetch = async (url, init) => {
  if (String(url) === 'https://api.resend.com/emails') { mail.push(JSON.parse(init.body)); return new Response('{"id":"m"}'); }
  if (String(url) === 'https://oauth2.googleapis.com/token') {
    const b = new URLSearchParams(init.body);
    if (b.get('client_secret') !== 'shh' || !b.get('code_verifier')) return new Response('{}', { status: 400 });
    const part = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    return new Response(JSON.stringify({ id_token: `${part({ alg: 'RS256' })}.${part(google)}.sig` }));
  }
  throw new Error(`unexpected fetch ${url}`);
};

/* A browser: keeps its cookies, and says which page it is on. */
function browser(origin = ORIGIN) {
  const jar = new Map();
  async function call(method, path, { body, form, from = origin } = {}) {
    const headers = { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    if (method !== 'GET') headers.Origin = from;
    let payload;
    if (form) { payload = new URLSearchParams(form); headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
    else if (body !== undefined) { payload = typeof body === 'string' ? body : JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
    const res = await site.fetch(new Request(ORIGIN + path, { method, headers, body: payload, redirect: 'manual' }), env);
    for (const c of res.headers.getSetCookie()) {
      const [kv, ...attrs] = c.split('; ');
      const [k, v] = [kv.slice(0, kv.indexOf('=')), kv.slice(kv.indexOf('=') + 1)];
      if (attrs.includes('Max-Age=0')) jar.delete(k); else jar.set(k, v);
    }
    const type = res.headers.get('Content-Type') || '';
    return { status: res.status, at: res.headers.get('Location'), cookies: res.headers.getSetCookie(),
             body: type.includes('json') ? await res.json() : await res.text() };
  }
  return { call, jar };
}
async function signInByEmail(b, email) {
  await b.call('POST', '/api/auth/email', { body: { email } });
  const link = new URL(mail.at(-1).text.match(/https:\S+/)[0]);
  return b.call('POST', '/api/auth/email/verify', { form: { t: link.searchParams.get('t') } });
}
const chat = (id, updated, title = id) => ({ id, title, created: 1, updated, turns: [{ who: 'me', words: title }], history: [] });

await group('The site itself is untouched', async () => {
  const b = browser();
  const r = await b.call('GET', '/js/app.js');
  ok(r.body === 'file /js/app.js', 'every address outside /api/ is a file, as before');
  const m = await b.call('GET', '/api/me');
  ok(m.body.user === null && m.body.providers.google && m.body.providers.email, 'signed out, and both ways in are offered');
  const none = await site.fetch(new Request(`${ORIGIN}/api/me`), { ...env, GOOGLE_CLIENT_SECRET: '', RESEND_API_KEY: '' });
  const nb = await none.json();
  ok(!nb.providers.google && !nb.providers.email, 'with no keys set, neither is offered');
});

await group('An emailed link signs in once', async () => {
  const b = browser();
  const r = await b.call('POST', '/api/auth/email', { body: { email: '  Sam@School.example ' } });
  ok(r.status === 200 && mail.length === 1 && mail[0].to[0] === 'sam@school.example', 'one email, to the address tidied');
  const link = new URL(mail[0].text.match(/https:\S+/)[0]);
  ok(link.origin === ORIGIN && link.pathname === '/api/auth/email/verify', 'the link is to the site itself');
  const page = await b.call('GET', link.pathname + link.search);
  ok(page.status === 200 && /<form method="post"/.test(page.body) && !b.jar.has('__Host-suvat_s'), 'following the link only shows a button: a mail scanner signs no one in');
  const t = link.searchParams.get('t');
  const v = await b.call('POST', '/api/auth/email/verify', { form: { t } });
  ok(v.status === 303 && v.at === '/?signin=ok' && b.jar.has('__Host-suvat_s'), 'pressing it signs in');
  ok(v.cookies.some((c) => /HttpOnly/.test(c) && /Secure/.test(c) && /SameSite=Lax/.test(c)), 'the cookie is HttpOnly, Secure, SameSite=Lax');
  ok(!db.prepare('SELECT * FROM sessions').all().some((s) => s.hash.includes(b.jar.get('__Host-suvat_s'))), 'only the session token\'s hash is kept');
  const me = await b.call('GET', '/api/me');
  ok(me.body.user?.email === 'sam@school.example', 'and /api/me says who');
  const again = await browser().call('POST', '/api/auth/email/verify', { form: { t } });
  ok(again.at === '/?signin=expired', 'the same link a second time does nothing');
  const bad = await browser().call('POST', '/api/auth/email/verify', { form: { t: 'x'.repeat(43) } });
  ok(bad.at === '/?signin=expired', 'a made-up link does nothing');

  await browser().call('POST', '/api/auth/email', { body: { email: 'old@school.example' } });
  const old = new URL(mail.at(-1).text.match(/https:\S+/)[0]).searchParams.get('t');
  db.prepare('UPDATE login_tokens SET expires = ?').run(Date.now() - 1);
  const late = await browser().call('POST', '/api/auth/email/verify', { form: { t: old } });
  ok(late.at === '/?signin=expired', 'after fifteen minutes the link does nothing');

  const no = await browser().call('POST', '/api/auth/email', { body: { email: 'not an email' } });
  ok(no.status === 400, 'a made-up address is refused');
  const spam = browser();
  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await spam.call('POST', '/api/auth/email', { body: { email: 'flood@school.example' } })).status);
  ok(codes.join() === '200,200,200,429,429', 'three links an hour to one inbox, then no more');
});

await group('Google: its answer is checked before anyone is signed in', async () => {
  const b = browser();
  const go = await b.call('GET', '/api/auth/google');
  const to = new URL(go.at);
  ok(to.origin === 'https://accounts.google.com' && to.searchParams.get('code_challenge_method') === 'S256', 'off to Google, with PKCE');
  ok(to.searchParams.get('redirect_uri') === `${ORIGIN}/api/auth/google/callback` && to.searchParams.get('scope') === 'openid email profile', 'asking only for name and email');
  const state = to.searchParams.get('state');
  const now = Math.floor(Date.now() / 1000);
  google = { iss: 'https://accounts.google.com', aud: env.GOOGLE_CLIENT_ID, sub: 'g-1', email: 'Sam@school.example', email_verified: true, name: 'Sam Ahmed', exp: now + 600 };

  const forged = await browser().call('GET', `/api/auth/google/callback?code=c&state=${state}`);
  ok(forged.at === '/?signin=failed', 'a callback in a browser that did not start the sign-in fails');
  const wrong = await b.call('GET', '/api/auth/google/callback?code=c&state=nope');
  ok(wrong.at === '/?signin=failed' && !b.jar.has('__Host-suvat_s'), 'a callback with the wrong state fails');

  const b2 = browser();
  const s2 = new URL((await b2.call('GET', '/api/auth/google')).at).searchParams.get('state');
  google = { ...google, aud: 'someone-else' };
  ok((await b2.call('GET', `/api/auth/google/callback?code=c&state=${s2}`)).at === '/?signin=failed', 'a token meant for another app fails');

  const b3 = browser();
  const s3 = new URL((await b3.call('GET', '/api/auth/google')).at).searchParams.get('state');
  google = { ...google, aud: env.GOOGLE_CLIENT_ID };
  const done = await b3.call('GET', `/api/auth/google/callback?code=c&state=${s3}`);
  ok(done.at === '/?signin=ok' && b3.jar.has('__Host-suvat_s') && !b3.jar.has('__Host-suvat_o'), 'Google\'s good answer signs in, and the one-off cookie goes');
  const me = await b3.call('GET', '/api/me');
  ok(me.body.user.email === 'sam@school.example' && me.body.user.name === 'Sam Ahmed', 'with the name Google gave');
  ok(db.prepare('SELECT COUNT(*) AS n FROM users WHERE email = ?').get('sam@school.example').n === 1, 'the same email by link and by Google is one account');

  const b4 = browser();
  const s4 = new URL((await b4.call('GET', '/api/auth/google')).at).searchParams.get('state');
  ok((await b4.call('GET', `/api/auth/google/callback?error=access_denied&state=${s4}`)).at === '/?signin=cancelled', 'saying no at Google comes back as cancelled');
});

await group('Chats are kept in their own account', async () => {
  const sam = browser(), kim = browser();
  await signInByEmail(sam, 'sam@school.example');
  await signInByEmail(kim, 'kim@school.example');
  ok((await sam.call('PUT', '/api/chats/a1', { body: chat('a1', 100, 'a ball off a cliff') })).status === 200, 'a chat is kept');
  await sam.call('PUT', '/api/chats/a2', { body: chat('a2', 200) });
  const list = (await sam.call('GET', '/api/chats')).body.chats;
  ok(list.length === 2 && list[0].id === 'a2' && list[1].data.title === 'a ball off a cliff', 'and read back, newest first');
  ok((await kim.call('GET', '/api/chats')).body.chats.length === 0, 'another account sees none of them');
  await kim.call('PUT', '/api/chats/a1', { body: chat('a1', 999, 'kim\'s own') });
  ok((await sam.call('GET', '/api/chats')).body.chats.find((c) => c.id === 'a1').data.title === 'a ball off a cliff', 'nor can it write over them');

  await sam.call('PUT', '/api/chats/a1', { body: chat('a1', 50, 'an older copy') });
  ok((await sam.call('GET', '/api/chats')).body.chats.find((c) => c.id === 'a1').data.title === 'a ball off a cliff', 'an older copy does not undo a newer one');
  await sam.call('PUT', '/api/chats/a1', { body: chat('a1', 300, 'carried on') });
  ok((await sam.call('GET', '/api/chats')).body.chats.find((c) => c.id === 'a1').data.title === 'carried on', 'a newer one replaces it');

  await sam.call('DELETE', '/api/chats/a2');
  const gone = (await sam.call('GET', '/api/chats')).body.chats.find((c) => c.id === 'a2');
  ok(gone.deleted && gone.data === null, 'a deleted chat is a row with nothing in it, so every device hears');
  await sam.call('PUT', '/api/chats/a2', { body: chat('a2', 200) });
  ok((await sam.call('GET', '/api/chats')).body.chats.find((c) => c.id === 'a2').deleted, 'and a device that had not heard cannot bring it back');

  ok((await sam.call('PUT', '/api/chats/a3', { body: chat('a4', 1) })).status === 400, 'a chat sent to another\'s address is refused');
  ok((await sam.call('PUT', '/api/chats/a3', { body: { ...chat('a3', 1), pad: 'x'.repeat(400_001) } })).status === 413, 'one too big to keep is refused');
  ok((await browser().call('GET', '/api/chats')).status === 401, 'signed out: none');

  for (let i = 0; i < CHATS_MAX + 3; i++) db.prepare('INSERT INTO chats (user_id, id, updated, data) SELECT id, ?, ?, ? FROM users WHERE email = ?').run(`z${i}`, 1000 + i, '{}', 'kim@school.example');
  await kim.call('PUT', '/api/chats/new', { body: chat('new', 99_999) });
  const kept = (await kim.call('GET', '/api/chats')).body.chats;
  ok(kept.length === CHATS_MAX && kept[0].id === 'new' && !kept.some((c) => c.id === 'a1'), `at most ${CHATS_MAX} an account; the oldest go`);
});

await group('Nothing changes from another site', async () => {
  const sam = browser();
  await signInByEmail(sam, 'sam@school.example');
  const evil = await sam.call('DELETE', '/api/account', { from: 'https://evil.example' });
  ok(evil.status === 403, 'another site\'s page cannot delete the account');
  ok((await sam.call('PUT', '/api/chats/x', { body: chat('x', 1), from: 'https://evil.example' })).status === 403, 'nor write a chat into it');
  ok((await sam.call('POST', '/api/auth/email', { body: { email: 'a@b.example' }, from: 'null' })).status === 403, 'nor send links from it');
});

await group('Signing out, and deleting the account, leave nothing behind', async () => {
  const a = browser(), b = browser();
  await signInByEmail(a, 'leaver@school.example');
  await signInByEmail(b, 'leaver@school.example');
  await a.call('PUT', '/api/chats/l1', { body: chat('l1', 1) });
  await a.call('POST', '/api/auth/signout');
  ok(!a.jar.has('__Host-suvat_s') && (await a.call('GET', '/api/me')).body.user === null, 'signed out on this browser');
  ok((await b.call('GET', '/api/me')).body.user?.email === 'leaver@school.example', 'still in on the other');
  const d = await b.call('DELETE', '/api/account');
  ok(d.status === 200 && (await b.call('GET', '/api/me')).body.user === null, 'the account is deleted, and signed out');
  const left = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${t === 'users' ? 'email' : 'user_id'} ${t === 'users' ? "= 'leaver@school.example'" : "NOT IN (SELECT id FROM users)"}`).get().n;
  ok(left('users') === 0 && left('chats') === 0 && left('sessions') === 0, 'no row of it is left: account, chats, sessions');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
