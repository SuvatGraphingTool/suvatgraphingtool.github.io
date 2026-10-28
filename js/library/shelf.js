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
// "as" is the qualification, and has to be the whole word or it is the start of everything
const whole = (w) => /^\d+(\.\d+)?$/.test(w) || /^q\d+(\.\d+)?$/.test(w) || w === 'as';

/* Words that carry no meaning in a search: "show that", "released from rest",
   "hits the ground" are found by their other words. */
const STOP = new Set(['a', 'an', 'as', 'the', 'of', 'to', 'in', 'on', 'at', 'from', 'with', 'and', 'that', 'is', 'it',
  'its', 'for', 'by', 'find', 'calculate', 'work', 'out', 'what', 'how', 'when', 'where']);

/** What was typed, as the words to look for. "question 6" is q6; units go. */
export function queryWords(query) {
  const raw = String(query || '').replace(UNIT_RE, ' ').toLowerCase().replace(/\bquestion\s+(\d)/g, 'q$1')
    // A level is one word however it is typed; a month's two-digit year is its year
    .replace(/\ba[\s-]+levels?\b/g, 'alevel')
    .replace(/\b(jan|january|may|june|jun|oct|october|nov|november)\s+(\d\d)\b/g, '$1 20$2')
    // a fraction is a value, not two words: 3 4/7 and 5/13 are not searched for
    // (small ones only: 7357/2 and 9709/41 are papers, and they stay)
    .replace(/(?:\b\d{1,2}\s+)?\b\d{1,2}\s*\/\s*\d{1,2}\b(?!\s*\/)/g, ' ')
    // OCR's full name says Cambridge, and means OCR
    .replace(/\boxford\s+cambridge\b/g, 'oxford');
  // a lone letter (an i, a j, the A of "at A") matches the start of everything
  return words(raw).filter((w) => !STOP.has(w) && (w.length > 1 || /\d/.test(w)));
}

/* What a session is also called. Cambridge prints May/June and Oct/Nov and
   writes s19 and w19; schools say summer and winter. */
function sessionWords(session) {
  const m = /(\w+) (\d{4})/.exec(session || '');
  if (!m) return '';
  const yy = m[2].slice(2);
  if (/^(may|june)$/i.test(m[1])) return `may june may/june summer s${yy}`;
  if (/^(october|november)$/i.test(m[1])) return `oct nov october november oct/nov autumn winter w${yy}`;
  if (/^january$/i.test(m[1])) return `jan winter w${yy}`;
  return '';
}
/* Which qualification: AS, International A level or A level, written the
   ways students write them. */
function qualification(src) {
  if (/^8MA0/.test(src.code || '')) return 'AS AS-level as level advanced subsidiary';
  if (/^WME/.test(src.code || '')) return 'IAL international A-level';
  return 'A-level advanced';
}

/** The question's own words: its paper, session, what happens, what it asks, its key words. */
function ownWords(q, nameOf) {
  const n = String(q.source.q), p = q.source.printed;
  return words([
    q.source.board, ALIAS[q.source.boardId] || '', q.source.paper, q.source.code || '', q.source.subject || 'maths mathematics',
    qualification(q.source), q.source.session, sessionWords(q.source.session),
    `q${n}`, `q${n.split('.')[0]}`, n, n.split('.')[0], p ? `${p} q${p}` : '',
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

/* A word that names WHERE a question was set — a board, a year, a month,
   a question number — is a filter, and it has to hold: "Edexcel 2019" with
   no Edexcel 2019 question on the shelves finds nothing, and says so, rather
   than quietly showing Edexcel 2023 and OCR 2019. Everything else is a word
   about what happens, and those rank. */
const BOARD_WORDS = new Set(BOARDS.flatMap((b) => [b.id, ...b.alias.split(' ')]).concat(['ial']));
const MONTHS = new Set(['january', 'jan', 'may', 'june', 'jun', 'october', 'oct', 'november', 'nov', 'winter', 'summer', 'autumn']);
const isFilter = (w) => BOARD_WORDS.has(w) || MONTHS.has(w) || /^(19|20)\d\d$/.test(w)
  || /^q\d+(\.\d+)?$/.test(w) || /^[sw]\d\d$/.test(w);

/* "as" is the qualification only when it is plainly meant as one — typed
   as AS, or as AS level, AS paper or AS maths, or on its own. Anywhere else
   ("modelled as a particle", "g as 10") it is an ordinary word. */
function meansAS(query) {
  const q = String(query || '');
  if (/^\s*as\s*$/i.test(q) || /\bas[\s-]*(levels?|papers?|maths|mathematics)\b/i.test(q)) return true;
  // capitals alone are not enough ("PROJECTED AS A PARTICLE"): AS has to
  // open or close what was typed, or stand beside a year
  const t = q.trim().split(/\s+/);
  return t.some((w, i) => w === 'AS' && (i === 0 || i === t.length - 1
    || /^(19|20)\d\d$/.test(t[i + 1] || '') || /^(19|20)\d\d$/.test(t[i - 1] || '')));
}

/** Is what was typed a search at all? (An AS on its own is, though it is no word.) */
export const searching = (query) => queryWords(query).length > 0 || meansAS(query);

/** A question's own words in order, for telling "time above" from "above … time". */
const ownSeq = (q, nameOf) => words(`${q.says} ${q.asks || ''} ${q.terms || ''} ${nameOf(q.opens)}`);

/**
 * How a question meets the free words typed: how many it has, and how
 * strongly — its own words count 2, its shelf's 1, the name of the scenario
 * it opens 2 more, and two typed words side by side in its text 1 more.
 */
export function score(q, free, nameOf = () => '') {
  const own = ownWords(q, nameOf), topic = topicWords(q), name = words(nameOf(q.opens));
  const seq = ownSeq(q, nameOf);
  let count = 0, weight = 0;
  free.forEach((w, i) => {
    if (hit(own, w)) { count++; weight += 2; } else if (hit(topic, w)) { count++; weight += 1; } else return;
    if (hit(name, w)) weight += 2;
    const next = free[i + 1];
    if (next && seq.some((x, j) => x.startsWith(w) && seq[j + 1]?.startsWith(next))) weight += 1;
  });
  return { count, weight };
}

/**
 * The questions what was typed finds, best first. Every filter word must
 * hold; of what is left, the questions meeting the most of the other words
 * show, strongest first. Nothing typed finds everything.
 */
export function found(query, nameOf = () => '') {
  const want = queryWords(query);
  const all = QUESTIONS.map((q, i) => ({ q, i }));
  const as = meansAS(query);
  if (!want.length && !as) return all;
  // the word that made it AS (level, paper) has done its job and is not searched for again
  const filters = want.filter(isFilter).concat(as ? ['as'] : []);
  const free = want.filter((w) => !isFilter(w) && !(as && /^(levels?|papers?)$/.test(w)));
  // "as" is also an ordinary word ("takes g as 10"), so as a filter it is
  // asked of the qualification alone
  const holds = (q, own, w) => (w === 'as' ? words(qualification(q.source)).includes('as') : hit(own, w));
  const kept = all.filter(({ q }) => { const own = ownWords(q, nameOf); return filters.every((w) => holds(q, own, w)); });
  if (!free.length) return kept;
  const scored = kept.map((x) => ({ ...x, ...score(x.q, free, nameOf) }));
  const most = Math.max(0, ...scored.map((x) => x.count));
  // A free word that meets nothing is no evidence either way: it is left
  // out, and the shelf says so rather than pretending it fitted.
  const unmet = free.filter((w) => !kept.some(({ q }) => hit(ownWords(q, nameOf), w) || hit(topicWords(q), w)));
  const out = !most ? (filters.length ? kept : [])
    : scored.filter((x) => x.count === most).sort((a, b) => b.weight - a.weight || a.i - b.i);
  out.unmet = out.length ? unmet : [];
  out.filtered = filters.length > 0;
  return out;
}
export const matches = (q, query, nameOf) => found(query, nameOf).some((x) => x.q === q);

/** The topics with at least one question left in them, best matches first, best shelf first. */
export function shelve(query, nameOf) {
  const hits = found(query, nameOf);
  const at = (t) => hits.findIndex((x) => x.q.topic === t.id);
  // in course order normally; while searching, the shelf with the best match first
  const shelves = TOPICS.map((t) => ({ ...t, items: hits.filter((x) => x.q.topic === t.id).map((x) => x.q) }))
    .filter((t) => t.items.length)
    .sort((a, b) => (searching(query) ? at(a) - at(b) : 0));
  shelves.unmet = hits.unmet || [];
  shelves.filtered = !!hits.filtered;
  return shelves;
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
    const query = searching(search.value) ? search.value.trim() : '';
    const topics = shelve(query, nameOf);
    const shown = topics.reduce((n, t) => n + t.items.length, 0);
    count.textContent = query ? `${shown} of ${total}` : `${total} ${total === 1 ? 'question' : 'questions'}`;
    const said = query.length > 40 ? `${query.slice(0, 40)}…` : query;
    const left = topics.unmet?.length
      ? `<p class="lib-unmet">${topics.filtered ? 'None of the questions below mention' : 'No question on the shelves mentions'} ${topics.unmet.map((w) => `\u201c${esc(w)}\u201d`).join(' or ')}, so ${topics.unmet.length === 1 ? 'it was' : 'they were'} left out of the search.</p>`
      : '';
    host.innerHTML = topics.length ? left + topics.map((t) => {
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
      : `<p class="lib-none">No question on the shelves matches “${esc(said)}” yet. Try fewer words: a board, a year, or what moves in the question.</p>`;
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
