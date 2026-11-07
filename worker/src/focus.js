// focus.js — only the part of the catalogue a question needs.
//
// The user, 3 Nov: the free AI allowance ran out after 17 questions, because
// every question carried the whole catalogue — every library scenario's boxes
// and every piece the composer has — about 65,000 characters of it, growing
// with every scenario and every batch of pieces. So a question now carries:
//
//   - every library scenario as ONE line (its id and what it is), so the
//     model still knows all of them exist;
//   - in full (boxes, shape, answers) only the few its words point to, the
//     scenario the chat was already on, and From a height, which the rules
//     name;
//   - the composer's pieces by name, with their descriptions only where the
//     question's words touch them; its engines always in full.
//
// If the model still picks a scenario it was not shown in full, the Worker
// asks once more with that one added (see index.js), so a box is never
// guessed. A photo or a PDF has no words to go by: it gets the whole catalogue.
// PROMPT_FOCUS = "off" (wrangler.toml) puts every question back on the whole.

import { LIBRARY_GUIDE } from './library.js';
import { COMPOSE_GUIDE } from './compose.js';
import { backdropsNamed } from './composeplace.js';
import { figureOf, whoIn } from '../../js/compose/registry.js';

/** How many library scenarios go in full, beyond those always sent. */
export const IN_FULL = 6;
const ALWAYS = ['from-a-height'];

const STOP = new Set(('the and for are was were with from that this then than into onto over under its his her their '
  + 'what when where which while who how why does did has have had been being will would shall should can could '
  + 'find show work out given give gives take taken use using each per one two three four five six seven eight '
  + 'nine ten first second third last same such some any all not only also just more less most least very much '
  + 'after before until about above below between there here they them she him you your our ask asks asked part '
  + 'question answer value values metres metre seconds second leave leaves model modelled particle').split(' '));

/** A word, cut back to what it shares with its relatives: "trains" and "train", "braking" and "brake". */
function stem(w) {
  if (w.length <= 4) return w;
  return w.replace(/ally$/, 'al').replace(/ly$/, '').replace(/ies$/, 'y').replace(/(ing|ed|es|s)$/, '').replace(/e$/, '');
}
/** The words in a text worth matching on, each once. */
export function termsOf(text) {
  const s = String(text || '').toLowerCase().normalize('NFKD');
  const out = new Set((s.match(/[a-z]+/g) || []).filter((w) => w.length > 2 && !STOP.has(w)).map(stem));
  // vectors: "(3i + 4j) m s⁻¹", "i and j", "2i − j" — the letters alone are too short to match on
  if (/(?:\d|\b)i\b/.test(s) && /(?:\d|\b)j\b/.test(s)) out.add('ijvector');
  if (/\bvector|\bbearing|north|south|east|west\b/.test(s)) out.add('ijvector');
  return out;
}

/* ── the library, one entry a scenario ──────────────────────────────────── */
const ENTRIES = LIBRARY_GUIDE.split(/\n(?=[a-z0-9-]+ — )/).map((block) => {
  const id = block.slice(0, block.indexOf(' — '));
  const head = block.split('\n')[0];
  const terms = termsOf(block);
  if (/\bi and j\b|\bin i and j\b|vector/i.test(block)) terms.add('ijvector');
  return { id, block, head, terms, name: termsOf(`${id.replace(/-/g, ' ')} ${head}`) };
});
const DF = new Map();
for (const e of ENTRIES) for (const t of e.terms) DF.set(t, (DF.get(t) || 0) + 1);
const idf = (t) => Math.log((ENTRIES.length + 1) / ((DF.get(t) || 0) + 0.5));

/** The library scenarios a question's words point to, best first. */
export function rankLibrary(text) {
  const q = termsOf(text);
  return ENTRIES
    .map((e) => {
      let score = 0;
      for (const t of q) {
        if (e.terms.has(t)) score += idf(t);
        if (e.name.has(t)) score += 2 * idf(t);     // its own name and title count for more
      }
      return { id: e.id, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.id);
}

/* ── the composer's pieces ──────────────────────────────────────────────── */
// "backdrops (…):" and the like head a list of "  name — what it is" lines;
// "engines (…):" and what follows it are always sent whole.
const COMPOSE_LINES = COMPOSE_GUIDE.split('\n');
const ENGINES_AT = COMPOSE_LINES.findIndex((l) => /^engines\b/.test(l));
const PIECES = [];
{
  let section = null;
  for (const line of COMPOSE_LINES.slice(0, ENGINES_AT < 0 ? undefined : ENGINES_AT)) {
    if (!/^ {2}\S/.test(line)) { section = { head: line, items: [] }; PIECES.push(section); continue; }
    const m = /^ {2}([a-z0-9-]+) — /.exec(line);
    section?.items.push({ name: m ? m[1] : line.trim(), line, terms: termsOf(line), own: termsOf(m ? m[1].replace(/-/g, ' ') : '') });
  }
}
const PIECE_DF = new Map();
for (const s of PIECES) for (const it of s.items) for (const t of it.terms) PIECE_DF.set(t, (PIECE_DF.get(t) || 0) + 1);

function composeFor(q, text) {
  // what the app's own lists say the question names: "rooftop" is the city, "a pane of glass" a figure
  const said = new Set([...backdropsNamed(text), figureOf(whoIn(text)).figure]);
  const out = [];
  for (const s of PIECES) {
    out.push(s.head);
    const named = [];
    for (const it of s.items) {
      // in full when the question names it, or uses a word only a few pieces have ("truck", "kayak")
      const hit = said.has(it.name) || [...q].some((t) => it.own.has(t) || (it.terms.has(t) && (PIECE_DF.get(t) || 0) <= 2));
      if (hit) out.push(it.line); else named.push(it.name);
    }
    if (named.length) out.push(`  also: ${named.join(', ')}`);
  }
  if (ENGINES_AT >= 0) out.push(...COMPOSE_LINES.slice(ENGINES_AT));
  return out.join('\n');
}

/**
 * The catalogue for one question.
 * @param text   what the student said, and what they said before in this chat
 * @param keep   library ids to send in full whatever the words: the one the chat is on, one the model asked for
 * @returns { library, compose, ids } — the two guides to put in the prompt, and the ids sent in full
 */
export function focusFor(text, keep = []) {
  const q = termsOf(text);
  const ids = new Set([...ALWAYS, ...keep.filter((id) => ENTRIES.some((e) => e.id === id))]);
  for (const id of rankLibrary(text)) { if (ids.size >= ALWAYS.length + keep.length + IN_FULL) break; ids.add(id); }
  const index = ENTRIES.map((e) => short(e.head)).join('\n');
  const full = ENTRIES.filter((e) => ids.has(e.id)).map((e) => e.block).join('\n');
  const library = `Every library scenario, one line each:\n${index}\n\n`
    + 'In full, the ones this question most likely needs — their boxes, shape and answers:\n'
    + `${full}\n`
    + 'If the one that fits is not among those in full, still return scenario "library" with its id and boxes {}: the app will show you its boxes.';
  return { library, compose: composeFor(q, text), ids };
}

/** An index line: the id and what it is, cut at a word near 110 characters. */
function short(head) {
  if (head.length <= 110) return head;
  const cut = head.slice(0, 110);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Every library id an answer used: its own, and its parts' scenes. */
export function libraryIdsIn(x) {
  const out = new Set();
  const look = (y) => { if (y && typeof y === 'object' && typeof y.library === 'string') out.add(y.library); };
  look(x);
  for (const p of Array.isArray(x?.parts) ? x.parts : []) { look(p); look(p?.scene); }
  return [...out];
}

/** The library ids an earlier answer in this chat was on, from its JSON as the history carries it. */
export function idsInHistory(texts) {
  const out = new Set();
  for (const t of texts) for (const m of String(t).matchAll(/"library"\s*:\s*"([a-z0-9-]+)"/g)) out.add(m[1]);
  return [...out];
}
