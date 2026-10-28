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
/** On a phone the box is too narrow for examples; the line keeps to what fits. */
export const PLACEHOLDER_SHORT = 'Board, year or topic';

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
   "braking". A question is found by its own words: its paper, as the cover
   prints it (9MA0/32), its session, what happens, what it asks, and the
   paper's own key words (`terms`). Its shelf adds a few words for the topic
   as a whole, which count for less.

   Not every word has to match. A student types the paper's phrase — "time
   of flight", "comes to rest" — and a word nothing on the shelves uses is
   simply not evidence either way. What shows is the questions that match
   the MOST of the words typed, best first; so one stray word cannot empty
   the shelf, and a second good word narrows it. Units and filler words are
   taken out of what was typed first. */
const ALIAS = Object.fromEntries(BOARDS.map((b) => [b.id, b.alias]));
const UNIT_RE = /\bm\s*\/\s*s\s*[2²]?|\bm\s*s\s*(?:[-−⁻]\s*[12¹²])?(?![a-z0-9])|\bms\s*[-−⁻]?\s*[12¹²]\b|\bmph\b|\bkm\s*\/?\s*h\b/gi;
const words = (text) => String(text).toLowerCase()
  .replace(/[\u2212\u2013\u2014]/g, '-')
  .replace(/([a-z])-([a-z])/g, '$1$2')                 // mid-point is midpoint
  .split(/[^a-z0-9.]+/).map((w) => w.replace(/^\.+|\.+$/g, '')).filter(Boolean);
const whole = (w) => /^\d+(\.\d+)?$/.test(w) || /^q\d+(\.\d+)?$/.test(w);

/* Words that carry no meaning in a search: "show that", "released from rest",
   "hits the ground" are found by their other words. */
const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'from', 'with', 'and', 'that', 'is', 'it',
  'its', 'for', 'by', 'find', 'calculate', 'work', 'out', 'what', 'how', 'when', 'where']);

/** What was typed, as the words to look for. "question 6" is q6; units go. */
export function queryWords(query) {
  const raw = String(query || '').replace(UNIT_RE, ' ').toLowerCase().replace(/\bquestion\s+(\d)/g, 'q$1');
  return words(raw).filter((w) => !STOP.has(w));
}

/** The question's own words: its paper, session, what happens, what it asks, its key words. */
function ownWords(q, nameOf) {
  const n = String(q.source.q), p = q.source.printed;
  return words([
    q.source.board, ALIAS[q.source.boardId] || '', q.source.paper, q.source.code || '', q.source.subject || '',
    q.source.session, `q${n}`, `q${n.split('.')[0]}`, p ? `${p} q${p}` : '',
    q.says, q.asks || '', q.beyond || '', q.terms || '', nameOf(q.opens),
    // the value of g the paper uses, which students type as a way of finding it
    q.fill?.given?.g != null ? `g ${q.fill.given.g}` : '',
  ].join(' '));
}
const topicWords = (q) => {
  const t = TOPICS.find((x) => x.id === q.topic);
  return t ? words(`${t.label} ${(t.words || []).join(' ')}`) : [];
};

/** Every word a question can be found by. */
export function haystack(q, nameOf = () => '') {
  return [...ownWords(q, nameOf), ...topicWords(q)];
}

const hit = (list, w) => (whole(w) ? list.includes(w) : list.some((h) => h.startsWith(w)));

/** How many of the typed words a question has, and how strongly: its own words count 2, its shelf's 1. */
export function score(q, query, nameOf = () => '') {
  const want = queryWords(query);
  const own = ownWords(q, nameOf), topic = topicWords(q);
  let words = 0, weight = 0;
  for (const w of want) {
    if (hit(own, w)) { words++; weight += 2; } else if (hit(topic, w)) { words++; weight += 1; }
  }
  return { words, weight };
}

/**
 * The questions what was typed finds, best first: those matching the most
 * of its words, then by how strongly. Nothing typed finds everything.
 */
export function found(query, nameOf = () => '') {
  if (!queryWords(query).length) return QUESTIONS.map((q, i) => ({ q, i, weight: 0 }));
  const all = QUESTIONS.map((q, i) => ({ q, i, ...score(q, query, nameOf) }));
  const most = Math.max(0, ...all.map((x) => x.words));
  return most ? all.filter((x) => x.words === most).sort((a, b) => b.weight - a.weight || a.i - b.i) : [];
}
export const matches = (q, query, nameOf) => found(query, nameOf).some((x) => x.q === q);

/** The topics with at least one question left in them, best matches first. */
export function shelve(query, nameOf) {
  const hits = found(query, nameOf);
  return TOPICS.map((t) => ({ ...t, items: hits.filter((x) => x.q.topic === t.id).map((x) => x.q) }))
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
  const narrow = typeof matchMedia === 'function' ? matchMedia('(max-width: 760px)') : null;
  const fit = () => { search.placeholder = narrow?.matches ? PLACEHOLDER_SHORT : PLACEHOLDER; };
  fit();
  narrow?.addEventListener?.('change', fit);
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
    // Typing that holds no word at all (a stray symbol) filters nothing.
    const query = queryWords(search.value).length ? search.value.trim() : '';
    const topics = shelve(query, nameOf);
    const shown = topics.reduce((n, t) => n + t.items.length, 0);
    count.textContent = query ? `${shown} of ${total}` : `${total} ${total === 1 ? 'question' : 'questions'}`;
    const said = query.length > 40 ? `${query.slice(0, 40)}…` : query;
    host.innerHTML = topics.length ? topics.map((t) => {
      // While searching, every match shows; otherwise a long shelf opens on its first few.
      const long = !query && t.items.length > SHELF_OPEN + 1;
      const all = !long || opened.has(t.id);
      const items = all ? t.items : t.items.slice(0, SHELF_OPEN);
      return `<div class="pgroup lib-group">
        <div class="pglabel">${esc(t.label)}</div>
        ${t.blurb ? `<p class="pgblurb">${esc(t.blurb)}</p>` : ''}
        <ul class="lib-list" id="lib-list-${esc(t.id)}">${items.map(row).join('')}</ul>
        ${long ? `<button type="button" class="linkish lib-more" data-t="${esc(t.id)}" aria-controls="lib-list-${esc(t.id)}"
            aria-expanded="${all}">${all ? 'Show fewer' : `Show all ${t.items.length}`}</button>` : ''}
      </div>`;
    }).join('')
      : `<p class="lib-none">Nothing on the shelves matches “${esc(said)}”. Try a board, a year, or what moves in the question.</p>`;
  };
  host.addEventListener('click', (e) => {
    const more = e.target.closest('.lib-more');
    if (more) {
      const t = more.dataset.t, opening = !opened.has(t);
      if (opening) opened.add(t); else opened.delete(t);
      paint();
      // keep the student where they were: on the first question that just
      // appeared, or back on the button when the shelf closes again
      (opening ? host.querySelector(`#lib-list-${t} .lib-q:nth-child(${SHELF_OPEN + 1}) .lib-open`)
               : host.querySelector(`.lib-more[data-t="${t}"]`))?.focus();
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
