// shelf.js — the past-paper library on the first screen: a search box, and
// real exam questions grouped by topic, each one tagged with where it was set.
//
// A question here is a REFERENCE and a paraphrase in this site's own words,
// never the paper's text — exam questions are copyrighted. Pressing one opens
// the scenario that answers it with the paper's own numbers in the boxes; the
// engine works out the rest exactly as it does for anything typed (rule 4).
// The data is in js/library/questions.js; this file only shows it and finds
// things in it, and the finding is pure so test/library.test.mjs can check it.

import { TOPICS, QUESTIONS, BOARDS } from './questions.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The examples the search box offers. The test checks each one finds something. */
export const EXAMPLES = ['Edexcel 2023', 'cliff', 'lorry'];
export const PLACEHOLDER = `Board, year, or what happens: ${EXAMPLES.join(', ')}`;

/** How many of a shelf's questions show before "Show all". */
export const SHELF_OPEN = 4;

/** "Edexcel M1 6677", and under it "June 2013 · Q4" — a Physics paper says so. */
export function sourceLines(src) {
  return [`${src.board} ${src.paper}`, `${src.subject ? `${src.subject} · ` : ''}${src.session} · Q${src.q}`];
}
/** The same, on one line, for the values screen's eyebrow. */
export const sourceTag = (src) => sourceLines(src).join(' · ');

/** What the question is about, what it asks, and what this app does not answer. */
export function questionHTML(q) {
  return `<p class="lib-from-says"><b>What happens.</b> ${esc(q.says)}</p>`
    + (q.asks ? `<p class="lib-from-asks"><b>What it asks.</b> ${esc(q.asks)}</p>` : '')
    + (q.beyond ? `<p class="lib-from-beyond"><b>Not answered here.</b> ${esc(q.beyond)}</p>` : '')
    + '<p class="lib-from-edit" hidden>You have changed some of the paper’s numbers.</p>';
}

/** The boards on the shelf, in a sentence: "AQA, Cambridge and Edexcel". */
export function boardsSaid() {
  const names = [...new Set(QUESTIONS.map((q) => q.source.board))].sort();
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/* ── finding ─────────────────────────────────────────────────────────────
   Words, not substrings. A year or a question number has to match whole —
   "2019" is not in "20190", and "q1" is not Q12 — and anything else matches
   the start of a word, so "vert" finds "vertically" and "brak" finds
   "braking". Each shelf carries the words students search for that its
   questions might not happen to use. Units are not words worth matching:
   "m/s" and "ms-1" are dropped from what was typed. */
const ALIAS = Object.fromEntries(BOARDS.map((b) => [b.id, b.alias]));
const UNITS = new Set(['m', 's', 'ms', 'm/s', 'm/s2', 'ms-1', 'ms-2', 'mph', 'kmh']);
const words = (text) => String(text).toLowerCase()
  .replace(/[−–—]/g, '-')
  .replace(/([a-z])-([a-z])/g, '$1$2')                 // mid-point is midpoint
  .split(/[^a-z0-9.]+/).map((w) => w.replace(/^\.+|\.+$/g, '')).filter(Boolean);
const whole = (w) => /^\d+(\.\d+)?$/.test(w) || /^q\d+(\.\d+)?$/.test(w);

/** Every word a question can be found by. */
export function haystack(q, nameOf = () => '') {
  const t = TOPICS.find((x) => x.id === q.topic);
  const n = String(q.source.q);
  return words([
    q.source.board, ALIAS[q.source.boardId] || '', q.source.paper, q.source.subject || '', q.source.session,
    `q${n}`, `q${n.split('.')[0]}`, q.says, q.asks || '',
    t ? `${t.label} ${(t.words || []).join(' ')}` : '', nameOf(q.opens),
  ].join(' '));
}

/** What was typed, as the words to look for. "question 6" is q6. */
export function queryWords(query) {
  const raw = String(query || '').toLowerCase().replace(/\bquestion\s+(\d)/g, 'q$1');
  return raw.split(/\s+/).filter((w) => w && !UNITS.has(w)).flatMap(words).filter((w) => !UNITS.has(w));
}

/** Does a question match what was typed? Every word has to be in it, in any order. */
export function matches(q, query, nameOf) {
  const want = queryWords(query);
  if (!want.length) return true;
  const hay = haystack(q, nameOf);
  return want.every((w) => (whole(w) ? hay.includes(w) : hay.some((h) => h.startsWith(w))));
}

/** The topics with at least one question left in them, in the shelf's order. */
export function shelve(query, nameOf) {
  return TOPICS.map((t) => ({ ...t, items: QUESTIONS.filter((q) => q.topic === t.id && matches(q, query, nameOf)) }))
    .filter((t) => t.items.length);
}

/**
 * Put the shelf up in `host`, wired to `search` (an <input>), `count` (an
 * <output>) and `sub` (the line under the heading, which names the boards on
 * the shelf). `open(q)` is called with the question pressed; `nameOf(id)` is
 * the name of the scenario a question opens, which the shelf states so the
 * student knows which card it is.
 */
export function mountShelf({ host, search, count, sub, open, nameOf }) {
  const total = QUESTIONS.length;
  const opened = new Set();               // shelves showing all their questions
  search.placeholder = PLACEHOLDER;
  if (sub) {
    sub.textContent = `Real questions from ${boardsSaid()} A-level papers, described in our own words. `
      + 'Press one and its scenario opens with the paper’s numbers already in the boxes.';
  }
  const row = (q) => {
    const [paper, when] = sourceLines(q.source);
    return `<li class="lib-q">
      <button type="button" class="lib-open" data-q="${esc(q.id)}">
        <span class="lib-src"><b>${esc(paper)}</b><span>${esc(when)}</span></span>
        <span class="lib-says">${esc(q.says)}${q.asks ? `<span class="lib-asks">${esc(q.asks)}</span>` : ''}</span>
        <span class="lib-to"><span>Opens</span><b>${esc(nameOf(q.opens))}</b></span>
      </button>${q.source.url ? `
      <a class="lib-paper" href="${esc(q.source.url)}" target="_blank" rel="noopener noreferrer"
         aria-label="Open the paper, ${esc(paper)}, ${esc(q.source.session)}, as a PDF in a new tab">Paper</a>` : ''}
    </li>`;
  };
  const paint = () => {
    const query = search.value.trim();
    const topics = shelve(query, nameOf);
    const shown = topics.reduce((n, t) => n + t.items.length, 0);
    count.textContent = query ? `${shown} of ${total}` : `${total} ${total === 1 ? 'question' : 'questions'}`;
    const said = query.length > 40 ? `${query.slice(0, 40)}…` : query;
    host.innerHTML = topics.length ? topics.map((t) => {
      // While searching, every match shows; otherwise a long shelf opens on its first few.
      const all = !!query || opened.has(t.id) || t.items.length <= SHELF_OPEN + 1;
      const items = all ? t.items : t.items.slice(0, SHELF_OPEN);
      return `<div class="pgroup lib-group">
        <div class="pglabel">${esc(t.label)}</div>
        ${t.blurb ? `<p class="pgblurb">${esc(t.blurb)}</p>` : ''}
        <ul class="lib-list" id="lib-list-${esc(t.id)}">${items.map(row).join('')}</ul>
        ${all ? '' : `<button type="button" class="linkish lib-more" data-t="${esc(t.id)}" aria-controls="lib-list-${esc(t.id)}">Show all ${t.items.length}</button>`}
      </div>`;
    }).join('')
      : `<p class="lib-none">Nothing on the shelves matches “${esc(said)}”. Try a board, a year, or what moves in the question.</p>`;
  };
  host.addEventListener('click', (e) => {
    const more = e.target.closest('.lib-more');
    if (more) {
      const t = more.dataset.t;
      opened.add(t);
      paint();
      // keep the student where they were: on the first question that just appeared
      host.querySelector(`#lib-list-${t} .lib-q:nth-child(${SHELF_OPEN + 1}) .lib-open`)?.focus();
      return;
    }
    const b = e.target.closest('.lib-open');
    if (!b) return;
    const q = QUESTIONS.find((x) => x.id === b.dataset.q);
    if (q) open(q);
  });
  search.addEventListener('input', paint);
  paint();
}
