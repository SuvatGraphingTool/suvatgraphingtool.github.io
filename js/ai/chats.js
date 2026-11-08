// ai/chats.js — Ask Suvat's chats, kept in this browser.
//
// The user, 2 Nov: chats should still be there "after we close the site",
// and then belong to an account. This is the first half: every chat is kept
// here, on the device, as it is had. Accounts (later) sync these same records
// to the server, so a chat started signed out is not lost on signing in.
//
// A chat is a plain record, so it can travel as JSON:
//   { id, title, created, updated,
//     turns:   [{ who: 'me', words, att?: { kind, name, thumb? } }
//               { who: 'suvat', html }]          — the thread, as it read
//     history: [{ role, text }]                  — what the reader is shown
//     last?:   { extraction, opts }               — the newest reading, applied
//                                                  again on opening, so its
//                                                  buttons act on it }
// A reply's html is the app's own markup (the engine's numbers, typeset by
// js/notation.js); nothing here makes or changes it. Nothing here calculates.

const KEY = 'suvat-chats-v1';
/* Told of every chat kept or deleted here — the account's sync (js/account.js). */
const heard = new Set();
export function onChats(fn) { heard.add(fn); return () => heard.delete(fn); }
const tell = (what, x) => { for (const fn of heard) { try { fn(what, x); } catch { /* a listener's fault is its own */ } } };
/** The most kept; the oldest go first. */
export const CHATS_MAX = 60;
const TITLE_MAX = 64;

/** Every chat kept, newest first — [] when there are none or storage is shut. */
export function loadChats(store = globalThis.localStorage) {
  try {
    const all = JSON.parse(store?.getItem(KEY) || '[]');
    return Array.isArray(all) ? all.filter(ok).sort((a, b) => b.updated - a.updated) : [];
  } catch { return []; }
}
const ok = (c) => c && typeof c.id === 'string' && Array.isArray(c.turns) && typeof c.updated === 'number';

/** One chat, by id, or null. */
export function getChat(id, store) {
  return loadChats(store).find((c) => c.id === id) || null;
}

/**
 * Keep a chat, replacing the one with its id. When the browser's storage is
 * full, the pictures go first, then the oldest chats, until it fits. Returns
 * whether it was kept.
 */
export function saveChat(chat, store = globalThis.localStorage) {
  if (!ok(chat)) return false;
  const all = [chat, ...loadChats(store).filter((c) => c.id !== chat.id)].slice(0, CHATS_MAX);
  const kept = fit(all, store);
  if (kept) tell('save', chat);
  return kept;
}
/** Write the list, letting pictures and then the oldest go until it fits: whether the first is kept. */
function fit(all, store) {
  if (write(all, store)) return true;
  const bare = all.map(withoutThumbs);
  while (bare.length) {
    if (write(bare, store)) return bare[0].id === all[0].id;
    bare.pop();
  }
  return false;
}
/** Every chat at once, newest first, as the account has them — telling no one. */
export function putChats(list, store = globalThis.localStorage) {
  const all = list.filter(ok).sort((a, b) => b.updated - a.updated).slice(0, CHATS_MAX);
  if (!all.length) { clearChats(store); return true; }
  return fit(all, store);
}

/** Forget one chat. */
export function deleteChat(id, store = globalThis.localStorage) {
  write(loadChats(store).filter((c) => c.id !== id), store);
  tell('delete', id);
}
/** Forget every chat (on signing out: they are the account's, not this browser's). */
export function clearChats(store = globalThis.localStorage) {
  try { store?.removeItem(KEY); } catch { /* storage shut: nothing was kept */ }
}

function write(all, store) {
  try { store?.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; }
}
function withoutThumbs(c) {
  return { ...c, turns: c.turns.map((t) => (t.att?.thumb ? { ...t, att: { ...t.att, thumb: undefined } } : t)) };
}

/** A new, empty chat. */
export function newChatRecord(now = Date.now()) {
  const id = globalThis.crypto?.randomUUID?.() || `c${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return { id, title: '', created: now, updated: now, turns: [], history: [] };
}

/** A chat's name in the list: the first words asked, cut at a word. */
export function titleOf(words, att) {
  const w = String(words || '').replace(/\s+/g, ' ').trim();
  if (!w) return att?.kind === 'pdf' ? 'A question paper' : att ? 'A photo of a question' : 'A chat';
  if (w.length <= TITLE_MAX) return w;
  const cut = w.slice(0, TITLE_MAX);
  const at = cut.lastIndexOf(' ');
  return `${(at > TITLE_MAX / 2 ? cut.slice(0, at) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

/**
 * A chat's name from how its first question was read: the reader's own short
 * title, a scene's title, or the first sentence of its summary. null if none
 * reads as a name, and the first words asked stand.
 */
export function nameFrom(x) {
  if (!x || typeof x !== 'object') return null;
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^["“']+|["”'.,;:!]+$/g, '').replace(/^(?:An? example|Example):\s*/i, '').trim();
  const title = clean(x.title) || clean(x.recipe?.title);
  const said = title || clean(String(x.summary || '').split(/(?<=[.!?؟])\s/)[0]);
  if (!said || said.length < 3) return null;
  if (said.length <= TITLE_MAX) return said[0].toUpperCase() + said.slice(1);
  const cut = said.slice(0, TITLE_MAX), at = cut.lastIndexOf(' ');
  return `${(at > TITLE_MAX / 2 ? cut.slice(0, at) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

/** When a chat was last had, as the list says it: "just now", "5 min ago", "yesterday", "3 Nov". */
export function whenOf(t, now = Date.now()) {
  const s = Math.max(0, (now - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  const d = new Date(t), n = new Date(now);
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(n) - day(d)) / 86_400_000);
  if (days === 0) return `${Math.floor(s / 3600)} h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return d.toLocaleDateString('en-GB', d.getFullYear() === n.getFullYear()
    ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The heading a chat is listed under in the panel, by the day it was last
    had: 'Today', 'Yesterday', 'Previous 7 days' or 'Older'. A time ahead of
    the clock (another device's) is today. */
export const DAY_GROUPS = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];
export function dayGroup(t, now = Date.now()) {
  const day = (x) => { const d = new Date(x); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const days = Math.round((day(now) - day(t)) / 86_400_000);
  if (days <= 0) return DAY_GROUPS[0];
  if (days === 1) return DAY_GROUPS[1];
  if (days <= 7) return DAY_GROUPS[2];
  return DAY_GROUPS[3];
}

/** A small picture of a photo sent, to keep in the chat: a JPEG data URL, or null. */
export async function thumbOf(file, side = 360) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return c.toDataURL('image/jpeg', 0.72);
  } catch { return null; }
}
