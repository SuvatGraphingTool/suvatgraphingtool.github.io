// account.js — signing in, and the chats kept in the account.
//
// The user, 2 Nov: chats kept after the site is closed, then accounts, signed
// in with Google or with an emailed link. Every chat — and both whiteboards
// (js/board/boards.js) — is kept in this browser
// first (js/ai/chats.js); signed in, the same records are kept in the account
// too (site/src/index.js), so they follow the student to any device. Signing
// in for the first time takes the chats already on this device with it.
//
// Nothing shows until the site says sign-in is switched on: on the dev
// server, or before a key is set, there is no /api/me and the page is as it was.

import { loadChats, putChats, clearChats, onChats } from './ai/chats.js';
import { getBoards, putBoard, clearBoards, onBoards, SLOTS } from './board/boards.js';

const $ = (id) => document.getElementById(id);
const PENDING = 'suvat-chats-del-v1';   // deletions the account has not heard of yet
const SAYS = {
  failed: 'Signing in did not work. Try again.',
  cancelled: 'Signing in was cancelled.',
  expired: 'That sign-in link has expired or was used already. Ask for a new one.',
};

/**
 * This browser's chats and the account's, as one list. The newer copy of a
 * chat wins; a chat deleted on another device goes, unless it was carried on
 * here since. `push`: what the account has not got, or has older.
 */
export function mergeChats(local, server) {
  const here = new Map(local.map((c) => [c.id, c]));
  const out = new Map(), push = [];
  for (const s of server) {
    const l = here.get(s.id);
    here.delete(s.id);
    if (s.deleted || !s.data) {
      if (l && l.updated > s.updated) { out.set(l.id, l); push.push(l); }
      continue;
    }
    if (!l || s.updated >= l.updated) out.set(s.id, s.data);
    else { out.set(l.id, l); push.push(l); }
  }
  for (const l of here.values()) { out.set(l.id, l); push.push(l); }
  return { list: [...out.values()], push };
}

export function initAccount() {
  const btn = $('acct-btn'), dlg = $('acct-dlg');
  if (!btn || !dlg) return;
  let user = null, ways = {};

  const said = new URLSearchParams(location.search).get('signin');
  if (said) {
    const q = new URLSearchParams(location.search); q.delete('signin');
    history.replaceState(history.state, '', location.pathname + (q.size ? `?${q}` : '') + location.hash);
  }

  api('GET', '/api/me').then((d) => {
    if (!d || !d.providers) return;                         // no accounts on this site
    user = d.user; ways = d.providers;
    if (!user && !ways.google && !ways.email) return;       // sign-in not switched on yet
    paint();
    if (user) sync();
    if (said && SAYS[said]) open(SAYS[said]);
  });

  /* ── the sidebar's button, the dialog and the chat list's note ───────── */
  function paint() {
    btn.hidden = false;
    const who = user ? (user.name || user.email) : '';
    $('acct-btn-t').textContent = user ? who : 'Sign in';
    btn.setAttribute('aria-label', user ? `Your account: ${who}` : 'Sign in');
    btn.dataset.in = String(!!user);
    for (const av of document.querySelectorAll('.acct-av')) av.textContent = user ? initial(who) : '';
    $('acct-out').hidden = !!user;
    $('acct-in').hidden = !user;
    if (user) { $('acct-name').textContent = user.name || user.email; $('acct-mail').textContent = user.name ? user.email : ''; }
    $('acct-google').hidden = !ways.google;
    $('acct-email').hidden = !ways.email;
    $('acct-or').hidden = !(ways.google && ways.email);
    $('cl-note-t').textContent = user ? 'Kept in your account, on every device.' : 'Kept in this browser only.';
    $('cl-signin').hidden = !!user;
  }
  function open(msg = '') {
    note(msg);
    $('acct-sure').hidden = true;
    if (!dlg.open) dlg.showModal();
    (user ? $('acct-out-btn') : ways.google ? $('acct-google') : $('acct-email-in'))?.focus();
  }
  function note(msg, good = false) {
    const m = $('acct-msg');
    m.textContent = msg; m.hidden = !msg; m.dataset.good = String(good);
  }

  btn.addEventListener('click', () => open());
  $('cl-signin').addEventListener('click', () => open());
  $('acct-x').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  $('acct-email').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('acct-email-in'), go = $('acct-email').querySelector('button');
    go.disabled = true;
    const r = await api('POST', '/api/auth/email', { email: input.value });
    go.disabled = false;
    if (r?.ok) { note(`Check your inbox: a link is on its way to ${input.value.trim()}. It works once, for 15 minutes.`, true); input.value = ''; }
    else note(r?.message || 'The link could not be sent. Try again.');
  });

  $('acct-out-btn').addEventListener('click', async () => {
    await api('POST', '/api/auth/signout');
    leave();
  });
  $('acct-del').addEventListener('click', () => { $('acct-sure').hidden = false; $('acct-del-no').focus(); });
  $('acct-del-no').addEventListener('click', () => { $('acct-sure').hidden = true; $('acct-del').focus(); });
  $('acct-del-go').addEventListener('click', async () => {
    const r = await api('DELETE', '/api/account');
    if (r?.ok) leave();
    else note('The account could not be deleted. Try again.');
  });
  /** Signed out: the chats were the account's, so this browser forgets them. */
  function leave() {
    clearChats();
    clearBoards();
    try { localStorage.removeItem(PENDING); } catch { /* storage shut */ }
    location.assign('/');
  }

  /* ── the chats, kept in the account too ──────────────────────────────── */
  const due = new Map();   // chat id → its timer: a burst of saves is sent once
  onChats((what, x) => {
    if (!user) return;
    if (what === 'delete') {
      clearTimeout(due.get(x)); due.delete(x);
      api('DELETE', `/api/chats/${encodeURIComponent(x)}`).then((r) => { if (!r?.ok) pending(x, true); });
      return;
    }
    clearTimeout(due.get(x.id));
    due.set(x.id, setTimeout(() => { due.delete(x.id); send(x); }, 1200));
  });
  const send = (c) => api('PUT', `/api/chats/${encodeURIComponent(c.id)}`, c);

  /* ── the two whiteboards, kept in the account too ─────────────────────── */
  const boardDue = new Map();
  onBoards((n) => {
    if (!user) return;
    clearTimeout(boardDue.get(n));
    // a board changes with every pan and stroke: sent when it has been still a moment
    boardDue.set(n, setTimeout(() => { boardDue.delete(n); sendBoard(n); }, 3000));
  });
  const sendBoard = (n) => api('PUT', `/api/boards/${n}`, getBoards()[n]);
  async function syncBoards() {
    const d = await api('GET', '/api/boards');
    if (!d?.boards) return;
    const here = getBoards();
    for (const n of SLOTS) {
      const there = d.boards.find((b) => b.slot === n);
      if (there && there.updated > here[n].updated) putBoard(n, there);
      else if (here[n].updated > (there?.updated || 0)) await sendBoard(n);
    }
  }

  async function sync() {
    for (const id of pending()) {
      const r = await api('DELETE', `/api/chats/${encodeURIComponent(id)}`);
      if (r?.ok) pending(id, false);
    }
    const d = await api('GET', '/api/chats');
    if (!d?.chats) return;
    const gone = new Set(pending());
    const { list, push } = mergeChats(loadChats(), d.chats.filter((c) => !gone.has(c.id)));
    putChats(list);
    document.dispatchEvent(new CustomEvent('suvat:chats'));
    for (const c of push) await send(c);
    await syncBoards();
  }
  function pending(id, add) {
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem(PENDING) || '[]'); } catch { /* none */ }
    if (id === undefined) return ids;
    ids = ids.filter((x) => x !== id);
    if (add) ids.push(id);
    try { localStorage.setItem(PENDING, JSON.stringify(ids)); } catch { /* storage shut */ }
    return ids;
  }
}

/** The API, on the site's own address. null when there is none, or no answer. */
async function api(method, path, body) {
  try {
    const res = await fetch(path, {
      method, credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!(res.headers.get('Content-Type') || '').includes('application/json')) return null;
    const d = await res.json();
    return res.ok ? d : { ...d, ok: false };
  } catch { return null; }
}
const initial = (s) => (String(s).trim()[0] || '?').toUpperCase();
