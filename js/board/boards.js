// board/boards.js — the student's two whiteboards.
//
// The user, 2 Nov: "all your boards get saved … a maximum of 2 boards per
// account, to save on space". So there are two, Board 1 and Board 2, side by
// side in the board's toolbar. Each is kept whole — its frames, its view and
// its drawing — in this browser, and, signed in, in the account too
// (js/account.js, site/src/index.js), so it is there on any device.
//
// The whiteboard itself (js/board/board.js, js/board/ink.js) does not know
// there are two: it is handed a store for the one on show, and told to load
// again when the other is picked. Nothing here calculates.

const $ = (id) => document.getElementById(id);
const KEY = 'suvat-boards-v1';
export const SLOTS = [1, 2];
const OLD = { board: 'suvat-board-v1', ink: 'suvat-board-ink-v1' };   // the one board kept before there were two

let data = read();
const heard = new Set();
/** Told when a board changes here (slot), so the account can keep it. */
export function onBoards(fn) { heard.add(fn); return () => heard.delete(fn); }

function read(store = globalThis.localStorage) {
  let d = null;
  try { d = JSON.parse(store?.getItem(KEY) || 'null'); } catch { /* none */ }
  if (d && d.slots && SLOTS.includes(d.at)) return d;
  // the board from before: it becomes Board 1
  const fresh = { at: 1, slots: {} };
  try {
    const board = JSON.parse(store?.getItem(OLD.board) || 'null'), ink = JSON.parse(store?.getItem(OLD.ink) || 'null');
    if (board || ink) fresh.slots[1] = { updated: Date.now(), board, ink };
  } catch { /* nothing to bring */ }
  return fresh;
}
function write() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
const slot = (n) => (data.slots[n] ||= { updated: 0, board: null, ink: null });

/** The store the whiteboard keeps the board on show in. */
export const boardStore = {
  board: { get: () => slot(data.at).board, set: (v) => { slot(data.at).board = v; touched(); } },
  ink: { get: () => slot(data.at).ink, set: (v) => { slot(data.at).ink = v; touched(); } },
};
function touched() {
  slot(data.at).updated = Date.now();
  write();
}

/* ── for the account ──────────────────────────────────────────────────── */
/** Both boards, as kept here: { 1: {updated, board, ink}, 2: … } (an empty one has updated 0). */
export function getBoards() { return Object.fromEntries(SLOTS.map((n) => [n, { ...slot(n) }])); }
let shown = null;   // the whiteboard, once it is up
let repaint = () => {};
/** A board from the account, newer than this browser's: kept, and put up if it is the one on show. */
export function putBoard(n, rec) {
  if (!SLOTS.includes(n) || !rec) return;
  data.slots[n] = { updated: Number(rec.updated) || 0, board: rec.board ?? null, ink: rec.ink ?? null };
  write();
  if (n === data.at) shown?.load();
  repaint();
}
/** Signed out: the boards were the account's, so this browser forgets them. */
export function clearBoards() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(OLD.board); localStorage.removeItem(OLD.ink); } catch { /* storage shut */ }
}

/* ── the switch in the board's toolbar ────────────────────────────────── */
export function initBoards(board) {
  shown = board;
  const bar = $('bd-boards');
  if (!bar) return;
  // the old keys are not read again: Board 1 holds what they held
  write();
  try { localStorage.removeItem(OLD.board); localStorage.removeItem(OLD.ink); } catch { /* storage shut */ }

  function paint() {
    for (const b of bar.querySelectorAll('[data-slot]')) {
      const n = Number(b.dataset.slot), s = slot(n);
      const blank = !s.board?.clusters?.length && !s.ink?.length;
      b.setAttribute('aria-pressed', String(n === data.at));
      b.dataset.blank = String(blank);
      b.title = `Board ${n}${blank ? ' — empty' : ''}`;
    }
  }
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-slot]');
    const n = Number(b?.dataset.slot);
    if (!b || n === data.at) return;
    board.flush();             // the board on show, kept as it is now
    data.at = n; write();
    board.load();
    paint();
  });
  onBoards(paint);
  repaint = paint;
  paint();
}

/** The whiteboard changed: tell whoever keeps it. */
export function boardChanged() {
  for (const fn of heard) { try { fn(data.at); } catch { /* a listener's fault is its own */ } }
}
