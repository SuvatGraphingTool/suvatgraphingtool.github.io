// i18n.js — the one module that owns the language.
//
//   lang()              'en' or 'ar'
//   t(key, params)      the phrase in the current language; the key IS the
//                       English, so English needs no dictionary at all
//   translateText(s)    a whole displayed string → its Arabic, or itself
//   setLang('ar')       remember the choice and reload, keeping the place
//
// English pays nothing: the Arabic dictionary (js/i18n/ar.js) and the Arabic
// face are fetched only when Arabic is on, and with it off every function here
// hands back exactly what it was given — the English output is byte-identical.
//
// HOW THE ARABIC REACHES THE SCREEN. The app writes English, and its logic
// keeps reading English. In Arabic mode:
//   · js/notation.js sets every equation in Arabic, from its own table;
//   · localize() turns each RUN of the page into Arabic as it appears. A run is
//     neighbouring text with the equations (.m) inside it: the sentence
//     "Lands {eq} out, at {eq}." is looked up whole, so the Arabic can put its
//     equations wherever Arabic wants them, and the equations are moved as they
//     are. Tags such as <b> end a run;
//   · the canvas's own text calls do the same for every word drawn on a stage.
//
// A dictionary key is the English with {0}, {1} or {name} slots. A slot's value
// is translated in its turn when it is words, and goes in as it is when it is a
// number or an equation. Never half of each: a line whose slot has no Arabic
// stays whole, or is said without the name (GENERIC in js/i18n/ar.js).

const KEY = 'suvat-lang';
export const LRI = '⁦', PDI = '⁩';
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const SLOT = /\{\w+\}/;

function chosen() {
  let q = null;
  try { q = new URLSearchParams(globalThis.location?.search || '').get('lang'); } catch { /* no location in node */ }
  if (q === 'ar' || q === 'en') { try { localStorage.setItem(KEY, q); } catch { /* storage shut */ } return q; }
  try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
}

// (a test sets SUVAT_LANG, so that what is computed on import is set in Arabic too)
let LANG = typeof document === 'undefined' ? (globalThis.process?.env?.SUVAT_LANG === 'ar' ? 'ar' : 'en') : chosen();
let DICT = null;           // English phrase → Arabic phrase
let BUCKETS = new Map();   // the first literal word → its patterns
let LEADING = [];          // patterns that open with a slot
let GENERIC = {};          // a patterned line said without its name, when the name has no Arabic
const CACHE = new Map();

export const lang = () => LANG;
export const isAr = () => LANG === 'ar';

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const firstWord = (s) => (s.match(/[A-Za-z’'-]+/) || [''])[0].toLowerCase();

/** Install a dictionary (the page does it from js/i18n/ar.js; tests do it directly). */
export function useDictionary(code, dict, generic = {}) {
  LANG = code;
  GENERIC = generic;
  DICT = code === 'en' ? null : new Map(Object.entries(dict || {}).map(([k, v]) => [norm(k), v]));
  BUCKETS = new Map(); LEADING = [];
  CACHE.clear();
  if (!DICT) return;
  // a line with only a generic form is still a pattern, with nothing to fill
  const lines = [...DICT, ...Object.entries(generic).filter(([k]) => !DICT.has(k)).map(([k]) => [k, null])];
  const all = [];
  for (const [k, v] of lines) {
    if (!SLOT.test(k)) continue;
    const parts = k.split(/(\{\w+\})/);
    const groups = [];
    let longest = '';
    const re = parts.map((part, at) => {
      const m = part.match(/^\{(\w+)\}$/);
      if (m) {
        // the next of slots with only a space between: they share one group
        if (at >= 2 && parts[at - 1] === ' ' && /^\{\w+\}$/.test(parts[at - 2])) { groups[groups.length - 1].push(m[1]); return ''; }
        groups.push([m[1]]);
        return '(.+?)';
      }
      if (part === ' ' && at >= 1 && at + 1 < parts.length && /^\{\w+\}$/.test(parts[at - 1]) && /^\{\w+\}$/.test(parts[at + 1])) return '';
      if (part.trim().length > longest.length) longest = part.trim();
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    // a key that is nothing but slots can match anything: it could only do harm
    if (!/[A-Za-z]{2}|[^\s\w{}]/.test(k.replace(/\{\w+\}/g, ''))) continue;
    all.push({ re: new RegExp(`^${re}$`), v, groups, key: k, longest, open: /^\{/.test(k), first: firstWord(parts[0]) });
  }
  all.sort((a, b) => b.longest.length - a.longest.length);
  for (const p of all) {
    if (p.open || !p.first) LEADING.push(p);
    else { if (!BUCKETS.has(p.first)) BUCKETS.set(p.first, []); BUCKETS.get(p.first).push(p); }
  }
}

/** Wrap a run that must read left to right in Unicode isolates. */
export const ltr = (s) => (LANG === 'ar' && s !== '' && s != null ? `${LRI}${s}${PDI}` : String(s ?? ''));

/**
 * Units in text the app did not write (a summary from the model) or a number
 * it glued on: "45 m" → "45 م". The digits stay as they are.
 */
const UNIT_WORDS = [
  [/m\s?s⁻¹|m\/s(?!²)|m\s?s\^-1/g, 'م/ث'], [/m\s?s⁻²|m\/s²|m\s?s\^-2/g, 'م/ث²'],
  [/km\s?h⁻¹|km\/h/g, 'كم/س'], [/\bkg\b/g, 'كجم'], [/\bkm\b/g, 'كم'], [/\bcm\b/g, 'سم'], [/\bN\s?s\b/g, 'نيوتن·ث'], [/\bN\b/g, 'نيوتن'],
];
const UNIT_AFTER_NUMBER = /([\d⁰¹²³⁴-⁹])\s?(m|s|h)(?![A-Za-z؀-ۿ⁻])/g;
export function arabicUnits(s) {
  let out = String(s);
  if (!/\d/.test(out) || !/[A-Za-z]/.test(out)) return out;
  for (const [re, ar] of UNIT_WORDS) out = out.replace(re, ar);
  return out.replace(UNIT_AFTER_NUMBER, (_, d, u) => `${d} ${{ m: 'م', s: 'ث', h: 'س' }[u]}`);
}

/** Kept for what writes Arabic with numbers: the units, in Arabic. */
export const isolateRuns = (s) => arabicUnits(s);

// A slot's value: an equation (a held token) or a number goes as it is, words go through the dictionary.
const TOKEN = /[-]/;
function slotValue(raw) {
  const s = raw.trim();
  if (!/[A-Za-z]/.test(s)) return { ok: true, v: raw };
  const out = lookup(s) ?? (TOKEN.test(s) ? null : arabicUnits(s));
  if (out == null || /[A-Za-z]{2}/.test(out)) return { ok: false };
  if (/[A-Za-z]/.test(out)) { const one = lookup(out); return one ? { ok: true, v: one } : { ok: false }; }
  return { ok: true, v: out };
}

// A slot can hold words, and those words can match patterns with slots of their
// own. That is what lets "{0} {1} below the top" read "the net", but a long
// sentence could otherwise try every split of itself on every frame. So a limit:
// three levels down and a fixed number of tries, then the line is simply not known.
let depth = 0, tries = 0;
const MAX_DEPTH = 3, MAX_TRIES = 1500;

function matchPattern(key) {
  if (depth >= MAX_DEPTH) return null;
  const tryList = (list) => {
    for (const p of list) {
      if (p.longest && !key.includes(p.longest)) continue;
      if (p.longest.length < 4 && key.length > 60) continue;   // "{0}." is no help to a paragraph
      if (++tries > MAX_TRIES) return null;
      depth++;
      let m;
      try { m = key.match(p.re); } finally { depth--; }
      if (!m) continue;
      depth++;
      try {
      const r = fillPattern(p, m);
      if (r != null) return r;
      } finally { depth--; }
    }
    return null;
  };
  return tryList(BUCKETS.get(firstWord(key)) || []) ?? tryList(LEADING);
}

// Slots side by side ("It {0} {1} at") have only a space between them, and share
// one group of the expression: the first split where every side has Arabic is it.
function splitSlots(text, names, params) {
  if (names.length === 1) {
    const r = slotValue(text);
    if (!r.ok) return false;
    params[names[0]] = r.v;
    return true;
  }
  const words = text.split(' ');
  for (let cut = 1; cut <= words.length - names.length + 1; cut++) {
    const r = slotValue(words.slice(0, cut).join(' '));
    if (r.ok && splitSlots(words.slice(cut).join(' '), names.slice(1), params)) { params[names[0]] = r.v; return true; }
  }
  return false;
}

function fillPattern(p, m) {
  const params = {};
  const good = p.v !== null && p.groups.every((names, i) => splitSlots(m[i + 1], names, params));
  if (!good) return GENERIC[p.key] ?? null;
  return p.v.replace(/\{(\w+)\}/g, (all, n) => (n in params ? params[n] : all));
}

/**
 * A past paper's reference, "Edexcel 6677/01 M1 · Jun 2012 · Q4, the car": the
 * board, the month, the question and the part in Arabic. The paper's own code
 * stays as it is printed on the paper, so the paper can be found.
 */
const BOARDS = { CIE: 'سي آي إي', Edexcel: 'إدكسل', AQA: 'إيه كيو إيه', OCR: 'أو سي آر', WJEC: 'دبليو جيه إي سي', IAL: 'آي إيه إل', MEI: 'إم إي آي', A: 'أ', Physics: 'فيزياء', Unit: 'الوحدة', AS: 'إيه إس' };
const MONTHS = { Jan: 'يناير', Feb: 'فبراير', Mar: 'مارس', Apr: 'أبريل', May: 'مايو', Jun: 'يونيو', Jul: 'يوليو', Aug: 'أغسطس', Sep: 'سبتمبر', Oct: 'أكتوبر', Nov: 'نوفمبر', Dec: 'ديسمبر' };
const PART_LETTERS = { a: 'أ', b: 'ب', c: 'جـ', d: 'د', e: 'هـ', f: 'و', g: 'ز', i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6' };
const UNIT_ALONE = { 'm s⁻¹': 'م/ث', 'm s⁻²': 'م/ث²', 'km h⁻¹': 'كم/س', m: 'م', s: 'ث', km: 'كم', kg: 'كجم', 'N s': 'نيوتن·ث', N: 'نيوتن', cm: 'سم', '°': '°', h: 'س' };
const PAPER_CODE = /\b\d*[A-Z]+\d+[A-Z0-9]*(?:\/\d+)?(?:-\d)?\b/g;
function paperRef(key) {
  // (the command menu writes it with no dots: "Edexcel 6677/01 M1 Jun 2012 Q4")
  const m = key.match(/^(CIE|Edexcel|AQA|OCR|WJEC)\b(.*?) · ([^·]+?) · Q(\d+)(.*)$/)
    ?? (/ · /.test(key) ? null : key.match(/^(CIE|Edexcel|AQA|OCR|WJEC)\b(.*?) ((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\/\w+)?|specimen for) \d{4}) Q(\d+)(.*)$/));
  if (!m) return null;
  const code = m[2].trim().split(/\s+/).map((w) => BOARDS[w.replace(/[()]/g, '')] ?? (w === 'specimen' ? 'نموذجي' : w)).join(' ');
  const when = m[3].replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (x) => MONTHS[x]).replace(/\bfor\b/, 'لعام').replace(/\bspecimen\b/, 'نموذجي');
  const raw = m[5].replace(/^,\s*/, '');
  const part = !raw ? '' : (lookup(raw) ?? raw.replace(/\b(all|[a-e]|i{1,3}|iv|vi?)\b/g, (x) => (x === 'all' ? 'كله' : PART_LETTERS[x])).replace(/,/g, '،'));
  return `${BOARDS[m[1]]} ${code} · ${when} · سؤال ${m[4]}${part ? `، ${part}` : ''}`;
}

/** The Arabic of a normalised string, or null. */
function lookup(key, split = true) {
  if (!key) return null;
  if (CACHE.has(key)) { const hit = CACHE.get(key); if (hit != null || split) return hit; }
  CACHE.set(key, null);              // a recursion back to itself finds nothing
  let out = DICT.get(key) ?? paperRef(key) ?? undefined;
  if (out === undefined) {
    // the code capitalises a sentence it glued together: the key has it either way
    const c = key[0];
    const other = c === c.toUpperCase() ? c.toLowerCase() + key.slice(1) : c.toUpperCase() + key.slice(1);
    out = DICT.get(other);
    if (out === undefined) out = matchPattern(key) ?? (other !== key ? matchPattern(other) : null);
  }
  // "the net" is the word's own definite form; "a net" the same without its ال
  if (out == null) {
    const the = key.match(/^[Tt]he (.+)$/);
    if (the) out = lookup(the[1]);
    const a = !the && key.match(/^[Aa]n? (.+)$/);
    if (a) { const w = lookup(a[1]); if (w) out = w.replace(/^ال/, ''); }
  }
  // A label with its reading: "greatest height 20.39 m", "vertical −14.0".
  if (out == null) {
    const r = key.match(/^(.*?[A-Za-z’)]) ?[:=]? ([−+]?\d[\d.,]*(?: × 10[⁰¹²³⁴-⁹⁻]+)?(?:°|%| ?(?:m s⁻[¹²]|km h⁻¹|m|s|km|kg|N s|N|cm|h|min))?)$/);
    if (r) { const w = lookup(r[1]); if (w) out = `${w} ${arabicUnits(r[2])}`; }
  }
  // A label with a reading the notation has already set: "A −15.0 م/ث"
  if (out == null) {
    const r = key.match(/^(.*?[A-Za-z’)]) ([^A-Za-z]*[\u0600-\u06FF\d][^A-Za-z]*?)(?: (m s⁻[¹²]|km h⁻¹|m|s|km|kg|N))?$/);
    if (r) { const w = lookup(r[1]); if (w) out = `${w} ${r[2]}${r[3] ? ` ${UNIT_ALONE[r[3]]}` : ''}`; }
  }
  // The name of what moves where the sentence says "It": "The kettle hits the water…"
  if (out == null) {
    const r = key.match(/^([Tt]he [a-z][a-z -]*?) (hits|lands|reaches|rises|falls|goes|passes|stops|comes|is|has|takes|bounces|slides|starts|never|leaves|moves|keeps)\b(.*)$/);
    if (r) {
      const said = lookup(`${key[0] === 'T' ? 'It' : 'it'} ${r[2]}${r[3]}`);
      if (said) { const who = lookup(r[1]); out = who ? `${who} ${said}` : said; }
    }
  }
  // A part's label on its own: (a), (ii), b.ii
  if (out == null) {
    const r = key.match(/^\(?((?:[a-g]|i{1,3}|iv|vi{0,3})(?:[.)(]+(?:[a-g]|i{1,3}|iv|vi{0,3}))*)\)?$/);
    if (r && /^\(/.test(key)) out = key.replace(/[a-z]+/g, (x) => PART_LETTERS[x] ?? x);
  }
  // A sentence carrying on from an equation: ". Everything else followed…"
  if (out == null) {
    const d = key.match(/^([.,;:·]\s*)(.+)$/);
    if (d) { const w = lookup(d[2]); if (w) out = `${d[1].replace(',', '،')}${w}`; }
  }
  // A note after its bold heading: "— both particles are…"
  if (out == null) {
    const d = key.match(/^([—–]\s*)(.+)$/);
    if (d) { const w = lookup(d[2]); if (w) out = d[1] + w; }
  }
  // Pieces the code joins: "A: Speed at the start", "Height (m s⁻¹)", "{a} · {b}".
  if (out == null) {
    const r = key.match(/^(.+?) \((m s⁻[¹²]|km h⁻¹|m|s|km|kg|N s|N|cm|°|h)\)$/);
    if (r) { const w = lookup(r[1]); if (w) out = `${w} (${UNIT_ALONE[r[2]]})`; }
    const x = !r && key.match(/^(.+?) \((× [^,)]+)(?:, (m s⁻[¹²]|m))?\)$/);
    if (x) { const w = lookup(x[1]); if (w) out = `${w} (${x[2]}${x[3] ? `، ${UNIT_ALONE[x[3]]}` : ''})`; }
  }
  if (out == null && / · /.test(key)) {
    const parts = key.split(' · ').map((x) => lookup(x) ?? (ARABIC.test(x) ? x : null));
    if (parts.every((x) => x != null)) out = parts.join(' · ');
  }
  if (out == null) {
    const r = key.match(/^([^:]+): (.+)$/);
    if (r) { const a = lookup(r[1]), b = lookup(r[2]); if (a && b) out = `${a}: ${b}`; }
  }
  // Sentence by sentence, when the whole is not known; all of it or none of it.
  if (out == null && split && /[.!?؟:;]\s/.test(key)) {
    const parts = key.split(/(?<=[.!?؟:;])\s+/);
    const done = [];
    for (let i = 0; i < parts.length && done; ) {
      // the longest run of sentences the dictionary knows as one
      let hit = null, j = parts.length;
      for (; j > i; j--) {
        const whole = parts.slice(i, j).join(' ');
        if (whole === key) continue;
        tries = 0;
        hit = /[A-Za-z]/.test(whole) ? lookup(whole, false) : whole;
        if (hit != null) break;
      }
      if (hit == null && ARABIC.test(parts[i]) && !/[A-Za-z]/.test(arabicUnits(parts[i]))) { hit = arabicUnits(parts[i]); j = i + 1; }
      if (hit == null) { done.length = 0; done.bad = true; break; }
      done.push(hit); i = j;
    }
    if (!done.bad && done.length) out = done.join(' ');
  }
  if (out == null) {
    const units = arabicUnits(key);
    if (units !== key && !/[A-Za-z]/.test(units)) out = units;
  }
  if (CACHE.size > 6000) CACHE.clear();
  if (out == null && (tries > MAX_TRIES || !split)) CACHE.delete(key);  // only out of breath, or not asked to split it
  else CACHE.set(key, out ?? null);
  return out ?? null;
}

/**
 * The phrase in the current language. The key is the English; params fill
 * {names} in it. A key with no Arabic yet stays English — never half of each.
 */
export function t(key, params) {
  const s = DICT ? (DICT.get(norm(key)) ?? key) : key;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (all, name) => {
    if (!(name in params)) return all;
    const v = String(params[name]);
    if (!DICT || /^\s*</.test(v) || ARABIC.test(v)) return v;
    return translateText(v);
  });
}

/** A whole displayed string → its Arabic, or itself. */
export function translateText(text) {
  if (!DICT || typeof text !== 'string') return text;
  const key = norm(text);
  if (!key || !/[A-Za-z]/.test(key)) return text;
  tries = 0;
  const out = lookup(key);
  if (out == null) return text;
  return text.match(/^\s*/)[0] + out + text.match(/\s*$/)[0];
}

/* ── the page ─────────────────────────────────────────────────────────── */

const ATTRS = ['title', 'aria-label', 'placeholder', 'alt', 'data-tip', 'aria-description'];
// An equation, and code: never entered.
const LEAVE = '.m,[translate="no"],script,style,code,[data-i18n-keep]';
// What the student typed and what the model wrote: not ours to translate, but
// its units are still put in Arabic.
const THEIRS = '.ask-bubble p,.cl-open,.ro-prose';

const SYMBOL = '.s-sym,.d-sym,.r-sym';

const skipped = (el) => !el || !!el.closest?.(`${LEAVE},textarea`);

const isMath = (n) => n.nodeType === 1 && n.classList?.contains('m');

/** Runs of neighbouring text and equations under one parent. */
function runsOf(parent) {
  const runs = []; let cur = [];
  for (const n of parent.childNodes) {
    if (n.nodeType === 3 || isMath(n)) cur.push(n);
    else { if (cur.length) runs.push(cur); cur = []; }
  }
  if (cur.length) runs.push(cur);
  return runs;
}

function doRun(run, parent) {
  const texts = run.filter((n) => n.nodeType === 3);
  const joined = texts.map((n) => n.nodeValue).join('');
  if (!/[A-Za-z]/.test(joined)) return;
  if (texts.length === 1 && run.length === 1) { doOne(texts[0], parent); return; }
  // the whole run, with each equation held as one character
  const held = [];
  const key = run.map((n) => {
    if (n.nodeType === 3) return n.nodeValue;
    held.push(n);
    return String.fromCharCode(0xE000 + held.length - 1);
  }).join('');
  // tokens go in as {n}-free private characters; the dictionary's slots catch them
  tries = 0;
  const out = lookup(norm(key));
  // (a line that comes back still holding a letter is not done: writing it again would never end)
  if (out != null && !/[A-Za-z]/.test(out)) {
    const lead = key.match(/^\s*/)[0], tail = key.match(/\s*$/)[0];
    const pieces = (lead + out + tail).split(/([-])/);
    const frag = document.createDocumentFragment();
    const mark = document.createComment('');
    // a mark first: the run's first node may be an equation, already moved into the fragment
    parent.insertBefore(mark, run[0]);
    for (const n of pieces) {
      if (!n) continue;
      const code = n.charCodeAt(0);
      if (n.length === 1 && code >= 0xE000 && code <= 0xE0FF) frag.append(held[code - 0xE000]);
      else frag.append(document.createTextNode(n));
    }
    for (const n of run) if (n.parentNode === parent && !held.includes(n)) parent.removeChild(n);
    parent.replaceChild(frag, mark);
    clearEnglish(parent);
    return;
  }
  // Not known whole: its pieces, each one on its own.
  for (const n of texts) doOne(n, parent);
}

function clearEnglish(parent) {
  if (parent?.hasAttribute('data-i18n-en')) { parent.removeAttribute('data-i18n-en'); parent.removeAttribute('dir'); }
}

function doOne(node, parent) {
  const v = node.nodeValue;
  if (!v || !/[A-Za-z]/.test(v)) return;
  if (parent.closest(THEIRS)) {
    const u = arabicUnits(v);
    if (u !== v) node.nodeValue = u;
    return;
  }
  // The five letters at the head of a box: s is a displacement here, not a second.
  const sym = parent.matches(SYMBOL) ? DICT.get(`sym:${v.trim()}`) : null;
  const out = sym ?? translateText(v);
  if (out !== v && !/[A-Za-z]/.test(out.replace(PAPER_CODE, ''))) { node.nodeValue = out; clearEnglish(parent); return; }
  if (ARABIC.test(v)) { const u = arabicUnits(v); if (u !== v) node.nodeValue = u; return; }
  // Left in English (a name, or something not yet in the dictionary): it reads
  // as English from the left rather than scrambled by the right-to-left page.
  if (!parent.hasAttribute('dir') && !parent.hasAttribute('data-i18n-en') && !ARABIC.test(textOutsideMaths(parent))) {
    parent.setAttribute('dir', 'ltr'); parent.setAttribute('data-i18n-en', '');
  }
}

function textOutsideMaths(el) {
  let s = '';
  for (const n of el.childNodes) {
    if (n.nodeType === 3) s += n.nodeValue;
    else if (n.nodeType === 1 && !n.matches('.m,svg')) s += textOutsideMaths(n);
  }
  return s;
}

function doParent(el) {
  if (skipped(el)) return;
  for (const run of runsOf(el)) doRun(run, el);
}

function doAttrs(el) {
  if (el.closest?.(LEAVE)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a);
    if (!v || !/[A-Za-z]/.test(v)) continue;
    const out = translateText(v);
    if (out !== v) el.setAttribute(a, out);
  }
}

/** Translate everything under root that is already on the page. */
export function localize(root = document.body) {
  if (!DICT || !root) return;
  if (root.nodeType === 3) { if (root.parentElement) doParent(root.parentElement); return; }
  if (root.nodeType !== 1 || root.closest?.(LEAVE)) return;
  doAttrs(root);
  doParent(root);
  const parents = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => {
      if (n.matches?.(LEAVE)) return NodeFilter.FILTER_REJECT;
      // a text box: its placeholder and label are ours, what is typed in it is not
      if (n.matches?.('textarea')) { doAttrs(n); return NodeFilter.FILTER_REJECT; }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = w.nextNode(); n; n = w.nextNode()) parents.push(n);
  for (const n of parents) { doAttrs(n); doParent(n); }
}

/* The canvas bypasses the DOM: its words are translated as they are drawn,
   measured the same way so a label's plate still fits it, and drawn in the
   Arabic face. The stage itself is never mirrored — css/rtl.css keeps every
   canvas left to right, so x still goes to the right. */
function patchCanvas() {
  const C = globalThis.CanvasRenderingContext2D?.prototype;
  if (!C || C.__i18n) return;
  C.__i18n = true;
  const FACE = '"IBM Plex Sans Arabic"';
  const face = (ctx) => {
    const was = ctx.font;
    if (was.includes('Plex Sans Arabic')) return null;
    const set = was.replace(/(\d+(?:\.\d+)?px(?:\/\S+)?\s+)/, `$1${FACE}, `);
    ctx.font = set === was ? `${was}, ${FACE}` : set;
    return was;
  };
  const wrap = (name) => {
    const orig = C[name];
    C[name] = function (text, ...rest) {
      if (typeof text !== 'string') return orig.call(this, text, ...rest);
      // on a stage a lone N is a train or a point, not a newton
      const s = /[A-Za-z]/.test(text) ? (text === 'N' ? 'ن' : translateText(text)) : text;
      if (!ARABIC.test(s)) return orig.call(this, s, ...rest);
      const was = face(this);
      const dir = this.direction, align = this.textAlign, gap = this.letterSpacing;
      this.direction = 'rtl';
      if (align === 'start') this.textAlign = 'left'; else if (align === 'end') this.textAlign = 'right';
      if (gap && gap !== '0px') this.letterSpacing = '0px';   // tracking breaks Arabic's joins
      try { return orig.call(this, s, ...rest); } finally {
        this.direction = dir; this.textAlign = align;
        if (gap && gap !== '0px') this.letterSpacing = gap;
        if (was) this.font = was;
      }
    };
  };
  wrap('fillText'); wrap('strokeText'); wrap('measureText');
}

function observe() {
  const mo = new MutationObserver((list) => {
    const parents = new Set();
    // One odd node must never stop the rest of the page turning Arabic.
    const safely = (f) => { try { f(); } catch (e) { console.warn('i18n', e); } };
    for (const m of list) {
      if (m.type === 'characterData') { if (m.target.parentElement) parents.add(m.target.parentElement); }
      else if (m.type === 'attributes') safely(() => doAttrs(m.target));
      else {
        for (const n of m.addedNodes) {
          if (n.nodeType === 3 && n.parentElement) parents.add(n.parentElement);
          else if (n.nodeType === 1) {
            if (n.parentElement && isMath(n)) parents.add(n.parentElement);
            safely(() => localize(n));
          }
        }
      }
    }
    for (const p of parents) safely(() => doParent(p));
  });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // the tab title: "السبورة | سوفات"
  const title = document.querySelector('title');
  if (title) {
    const fix = () => {
      const was = document.title;
      if (!/[A-Za-z]/.test(was)) return;
      const m = was.match(/^(.*) \| SUVAT$/);
      const next = m ? `${translateText(m[1])} | ${translateText('SUVAT')}` : translateText(was);
      if (next !== was) document.title = next;
    };
    new MutationObserver(fix).observe(title, { childList: true, characterData: true, subtree: true });
    fix();
  }
}

/**
 * Switch language. The page reloads where it was: the view and the scenario
 * ride along in sessionStorage, and js/shell.js restores them.
 */
export function setLang(code) {
  try { localStorage.setItem(KEY, code); } catch { /* storage shut */ }
  try {
    const app = document.getElementById('app');
    sessionStorage.setItem('suvat-lang-place', JSON.stringify({
      view: app?.dataset.view, step: app?.dataset.step, id: globalThis.SUVAT?.state?.id, y: scrollY,
    }));
  } catch { /* storage shut */ }
  const u = new URL(location.href);
  u.searchParams.delete('lang');
  location.replace(u.toString());
}

/** Where the student was before the language changed, once. */
export function takePlace() {
  try {
    const s = sessionStorage.getItem('suvat-lang-place');
    sessionStorage.removeItem('suvat-lang-place');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

/**
 * A string of HTML in Arabic, the way localize() would leave it on the page: for
 * what is tested without a page. Every equation stays as it is, held whole.
 */
export function localizeHTML(html) {
  if (!DICT || html == null) return html;
  const parts = String(html).split(/(<[^>]*>)/);
  const out = [];
  let run = [];           // text and held equations
  const flush = () => {
    if (!run.length) return;
    const held = [];
    const key = run.map((r) => {
      if (r.m) { held.push(r.m); return String.fromCharCode(0xE000 + held.length - 1); }
      return r.t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&mdash;/g, '—').replace(/&times;/g, '×');
    }).join('');
    run = [];
    tries = 0;
    let said = /[A-Za-z]/.test(key.replace(/[\uE000-\uE0FF]/g, '')) ? lookup(norm(key)) : key;
    if (said == null) {
      globalThis.__i18nMissed?.add(key);   // (a test listing what has no Arabic yet)
      // its pieces, each one on its own
      said = key.split(/([\uE000-\uE0FF])/).map((x) => (/[\uE000-\uE0FF]/.test(x) || !/[A-Za-z]/.test(x) ? x : translateText(x))).join('');
    }
    out.push(said.replace(/[\uE000-\uE0FF]/g, (c) => held[c.charCodeAt(0) - 0xE000]));
  };
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    if (p[0] !== '<') { run.push({ t: p }); continue; }
    if (/^<span class="m">/.test(p)) {
      let depth = 1, j = i + 1, inner = p;
      for (; j < parts.length && depth; j++) {
        if (/^<span\b/.test(parts[j])) depth++; else if (/^<\/span>/.test(parts[j])) depth--;
        inner += parts[j];
      }
      run.push({ m: inner });
      i = j - 1;
      continue;
    }
    flush();
    out.push(p);
  }
  flush();
  return out.join('');
}

/* Decided before anything else runs: the modules that compute words on import
   wait for this, and English does not wait for anything. */
if (LANG === 'ar' && typeof document !== 'undefined') {
  const de = document.documentElement;
  de.lang = 'ar'; de.dir = 'rtl';
  try {
    const { default: AR, GENERIC: said } = await import('./i18n/ar.js');
    useDictionary('ar', AR, said);
    patchCanvas();
    const go = () => { localize(document.body); observe(); de.classList.remove('i18n-wait'); };
    if (document.body) go(); else addEventListener('DOMContentLoaded', go, { once: true });
  } catch (e) {
    console.warn('Arabic dictionary failed to load', e);
    de.classList.remove('i18n-wait');
  }
}
