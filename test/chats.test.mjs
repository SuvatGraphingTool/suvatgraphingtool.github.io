// chats.test.mjs — proves Ask Suvat's chats are kept. Run with:
//     node test/chats.test.mjs
//
// The claim: a chat had is a chat kept — saved, found again, newest first,
// and forgotten when deleted. The browser's storage is small and can be full
// or shut (a private window), so the two limits are checked too: when it is
// full the pictures go first, then the oldest chats; when it is shut nothing
// throws and nothing is claimed kept.

import { loadChats, getChat, saveChat, deleteChat, clearChats, putChats, onChats, newChatRecord, titleOf, nameFrom, whenOf, dayGroup, CHATS_MAX } from '../js/ai/chats.js';
import { mergeChats } from '../js/account.js';

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}`); }
}
function group(name, fn) { console.log(`\n${name}`); fn(); }

/** localStorage, with a size limit like a browser's. */
function memory(limit = Infinity) {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      let n = 0; for (const [kk, vv] of m) if (kk !== k) n += vv.length;
      if (n + String(v).length > limit) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
  };
}
const shut = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); }, removeItem() { throw new Error('SecurityError'); } };

function chat(title, t, extra = {}) {
  const c = newChatRecord(t);
  c.title = title; c.updated = t;
  c.turns = [{ who: 'me', words: title }, { who: 'suvat', html: '<p>Read.</p>' }];
  return Object.assign(c, extra);
}

group('A chat had is a chat kept', () => {
  const s = memory();
  ok(loadChats(s).length === 0, 'none at first');
  const a = chat('a ball off a cliff', 1000), b = chat('a car braking', 2000);
  ok(saveChat(a, s) && saveChat(b, s), 'both are kept');
  ok(loadChats(s).map((c) => c.title).join() === 'a car braking,a ball off a cliff', 'newest first');
  a.turns.push({ who: 'me', words: 'and with g = 9.8?' }); a.updated = 3000;
  saveChat(a, s);
  ok(loadChats(s).length === 2, 'saving again replaces it, not a second copy');
  ok(loadChats(s)[0].id === a.id && getChat(a.id, s).turns.length === 3, 'and it is the newest, with its new message');
  deleteChat(a.id, s);
  ok(getChat(a.id, s) === null && loadChats(s).length === 1, 'deleted is forgotten');
  clearChats(s);
  ok(loadChats(s).length === 0, 'clearing forgets every one');
  ok(saveChat({ title: 'no id' }, s) === false, 'a record that is not a chat is not kept');
});

group('The browser\'s storage is small', () => {
  const s = memory();
  for (let i = 0; i < CHATS_MAX + 5; i++) saveChat(chat(`q${i}`, 1000 + i), s);
  const all = loadChats(s);
  ok(all.length === CHATS_MAX, `at most ${CHATS_MAX} are kept`);
  ok(all[0].title === `q${CHATS_MAX + 4}` && !all.some((c) => c.title === 'q0'), 'the oldest go first');

  const pic = 'data:image/jpeg;base64,' + 'A'.repeat(4000);
  const tight = memory(6000);   // one picture fits, two do not
  const p = chat('a photo', 1000);
  p.turns[0].att = { kind: 'image', name: 'q.jpg', thumb: pic };
  ok(saveChat(p, tight), 'a chat with a picture fits');
  const q = chat('another photo', 2000);
  q.turns[0].att = { kind: 'image', name: 'r.jpg', thumb: pic };
  ok(saveChat(q, tight), 'when the next will not fit, it is still kept…');
  const kept = loadChats(tight);
  ok(kept.length === 2 && kept.every((c) => !c.turns[0].att.thumb), '…with the pictures let go, every word kept');
  ok(kept.every((c) => c.turns[0].att.kind === 'image'), 'and still saying a photo was sent');

  ok(loadChats(shut).length === 0, 'storage shut: no chats, and nothing thrown');
  ok(saveChat(chat('x', 1), shut) === false, 'storage shut: not claimed kept');
});

group('Each chat is named by what was asked', () => {
  ok(titleOf('A ball is kicked off a cliff') === 'A ball is kicked off a cliff', 'a short question is its own name');
  const long = titleOf('A particle is projected from a point on horizontal ground with speed 20 m/s at an angle of 30 degrees to the horizontal');
  ok(long.length <= 65 && long.endsWith('…') && !/\s…$/.test(long), `a long one is cut at a word: "${long}"`);
  ok(titleOf('', { kind: 'image' }) === 'A photo of a question', 'a photo alone');
  ok(titleOf('  ', { kind: 'pdf' }) === 'A question paper', 'a paper alone');
  ok(titleOf('a\n\nb') === 'a b', 'spacing tidied');
});

group('…and then by what it is about', () => {
  ok(nameFrom({ title: 'Ball off a rooftop', summary: 'A ball is dropped.' }) === 'Ball off a rooftop', 'the reader’s own title');
  ok(nameFrom({ title: '"ball off a rooftop."' }) === 'Ball off a rooftop', 'tidied');
  ok(nameFrom({ recipe: { title: 'A car off a cliff' }, summary: 'x y z.' }) === 'A car off a cliff', 'a scene’s title, if it has none');
  ok(nameFrom({ summary: 'A stone falls down a well. It takes 3 s.' }) === 'A stone falls down a well', 'the summary’s first sentence, if neither');
  ok(nameFrom({ summary: 'An example: A book dropped from a shelf.' }) === 'A book dropped from a shelf', 'without "An example:"');
  ok(nameFrom({ title: 'كرة من فوق سطح' }) === 'كرة من فوق سطح', 'in Arabic too');
  ok(nameFrom({ title: 'x'.repeat(90) }).length <= 65, 'never too long for the list');
  ok(nameFrom({}) === null && nameFrom(null) === null, 'nothing to go on: the first words asked stand');
});

group('…and says when it was last had', () => {
  const now = new Date(2026, 10, 2, 15, 0).getTime();
  ok(whenOf(now - 20_000, now) === 'just now', 'seconds ago: just now');
  ok(whenOf(now - 5 * 60_000, now) === '5 min ago', 'minutes');
  ok(whenOf(now - 3 * 3600_000, now) === '3 h ago', 'hours, the same day');
  ok(whenOf(new Date(2026, 10, 1, 22, 0).getTime(), now) === 'yesterday', 'yesterday');
  ok(whenOf(new Date(2026, 9, 30, 9, 0).getTime(), now) === 'Friday', 'this week: the day');
  ok(whenOf(new Date(2026, 8, 3).getTime(), now) === '3 Sept', 'earlier this year: the date');
  ok(whenOf(new Date(2025, 8, 3).getTime(), now) === '3 Sept 2025', 'another year: with the year');
});

group('…and is listed under the day it was had', () => {
  const now = new Date(2026, 10, 2, 15, 0).getTime();
  ok(dayGroup(now - 60_000, now) === 'Today', 'a minute ago: Today');
  ok(dayGroup(new Date(2026, 10, 2, 0, 5).getTime(), now) === 'Today', 'just after midnight: Today');
  ok(dayGroup(now + 3_600_000, now) === 'Today', 'ahead of this clock (another device): Today');
  ok(dayGroup(new Date(2026, 10, 1, 23, 50).getTime(), now) === 'Yesterday', 'just before midnight: Yesterday');
  ok(dayGroup(new Date(2026, 9, 27, 9, 0).getTime(), now) === 'Previous 7 days', 'six days ago: Previous 7 days');
  ok(dayGroup(new Date(2026, 9, 26, 9, 0).getTime(), now) === 'Previous 7 days', 'seven days ago: Previous 7 days');
  ok(dayGroup(new Date(2026, 9, 25, 9, 0).getTime(), now) === 'Older', 'eight days ago: Older');
});

const withId = (id, t) => ({ ...chat(id, t), id });

group('Signed in, the account hears of every change', () => {
  const s = memory(), told = [];
  const off = onChats((what, x) => told.push(`${what} ${what === 'delete' ? x : x.id}`));
  saveChat(withId('a', 1), s); deleteChat('a', s);
  putChats([withId('b', 2), withId('c', 3)], s);
  off();
  saveChat(withId('d', 4), s);
  ok(told.join() === 'save a,delete a', 'a chat kept or deleted is told; the account’s own list written back is not');
  ok(loadChats(s).map((c) => c.id).join() === 'd,c,b', 'that list is kept, newest first');
});

group('This browser and the account, as one list', () => {
  const L = (id, t) => withId(id, t), S = (id, t, gone = false) => ({ id, updated: t, deleted: gone, data: gone ? null : withId(id, t) });
  const { list, push } = mergeChats(
    [L('here-only', 5), L('both-same', 10), L('newer-here', 30), L('older-here', 10), L('gone-there', 10), L('carried-on', 50)],
    [S('there-only', 7), S('both-same', 10), S('newer-here', 20), S('older-here', 40), S('gone-there', 20, true), S('carried-on', 40, true), S('gone-both', 3, true)]);
  const ids = new Set(list.map((c) => c.id));
  ok(ids.has('here-only') && push.some((c) => c.id === 'here-only'), 'a chat had before signing in goes up to the account');
  ok(ids.has('there-only') && !push.some((c) => c.id === 'there-only'), 'a chat from another device comes down');
  ok(list.find((c) => c.id === 'newer-here').updated === 30 && push.some((c) => c.id === 'newer-here'), 'carried on here: this copy wins, and goes up');
  ok(list.find((c) => c.id === 'older-here').updated === 40 && !push.some((c) => c.id === 'older-here'), 'carried on elsewhere: that copy wins');
  ok(!ids.has('gone-there'), 'deleted on another device: gone here too');
  ok(ids.has('carried-on'), 'unless it was carried on here since');
  ok(!ids.has('gone-both') && !push.some((c) => c.id === 'both-same'), 'nothing sent that the account has already');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
