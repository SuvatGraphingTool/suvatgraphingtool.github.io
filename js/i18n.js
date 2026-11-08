// i18n.js — the one module that owns the language.
//
//   lang()              'en' or 'ar'
//   t(key, params)      the phrase in the current language; the key IS the
//                       English, so English needs no dictionary at all
//   setLang('ar')       remember the choice and reload, keeping the place
//
// English pays nothing: the Arabic dictionary (js/i18n/ar.js) and the Arabic
// face are fetched only when Arabic is on, and with it off every function here
// hands back exactly what it was given — the English output is byte-identical.
//
// Patterned strings are templates, never fragments glued together, so the
// Arabic can put the number or the name where Arabic puts it:
//   t('Lands after {t} s', { t: num(2.31) })  →  'يهبط بعد ⁦2.31⁩ s'
//
// THE MATHS IS NOT OURS TO TOUCH (rule 1). js/notation.js sets every equation;
// here it is only isolated, left to right, inside the right-to-left text:
// `.m` in the DOM through css/rtl.css, and numbers and Latin runs in plain
// text (canvas, aria, titles) with the Unicode isolates U+2066 … U+2069.
//
// The DOM is translated by localize(): the strings js/app.js and the shell
// already write, matched whole against the dictionary. It never enters `.m`
// (an equation), [translate="no"] (what the student typed, chat titles), or a
// form field's value.

const KEY = 'suvat-lang';
export const LRI = '⁦', PDI = '⁩';
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const LATIN_OR_DIGIT = /[A-Za-z0-9]/;

function chosen() {
  let q = null;
  try { q = new URLSearchParams(globalThis.location?.search || '').get('lang'); } catch { /* no location in node */ }
  if (q === 'ar' || q === 'en') { try { localStorage.setItem(KEY, q); } catch { /* storage shut */ } return q; }
  try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
}

let LANG = typeof document === 'undefined' ? 'en' : chosen();
let DICT = null;           // English phrase → Arabic phrase
let PATTERNS = [];         // [regex, arabic template, names]

export const lang = () => LANG;
export const isAr = () => LANG === 'ar';

/** Install a dictionary (the page does it from js/i18n/ar.js; tests do it directly). */
export function useDictionary(code, dict) {
  LANG = code;
  DICT = code === 'en' ? null : new Map(Object.entries(dict || {}).map(([k, v]) => [norm(k), v]));
  PATTERNS = [];
  if (DICT) {
    for (const [k, v] of DICT) {
      if (!/\{\w+\}/.test(k)) continue;
      const names = [];
      const re = k.split(/(\{\w+\})/).map((part) => {
        const m = part.match(/^\{(\w+)\}$/);
        if (m) { names.push(m[1]); return '(.+?)'; }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('');
      PATTERNS.push([new RegExp(`^${re}$`), v, names]);
    }
  }
  CACHE.clear();
}

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

/** Wrap a run that must read left to right (a number, a symbol, a Latin word) in Unicode isolates. */
export const ltr = (s) => (LANG === 'ar' && s !== '' && s != null ? `${LRI}${s}${PDI}` : String(s ?? ''));

function fill(template, params) {
  return template.replace(/\{(\w+)\}/g, (all, name) => {
    if (!(name in params)) return all;
    const v = params[name];
    if (LANG !== 'ar') return String(v);
    const s = String(v);
    // HTML (a typeset equation) is isolated by its own class in CSS; a plain
    // value that is a number or Latin is isolated here; Arabic goes as it is.
    if (/^\s*</.test(s) || ARABIC.test(s)) return s;
    return LATIN_OR_DIGIT.test(s) ? translateText(s) === s ? ltr(s) : translateText(s) : s;
  });
}

/**
 * The phrase in the current language. The key is the English; params fill
 * {names} in it. A key with no Arabic yet stays English — never half of each.
 */
export function t(key, params) {
  const s = DICT ? (DICT.get(norm(key)) ?? key) : key;
  return params ? fill(s, params) : s;
}

const CACHE = new Map();
/**
 * A whole displayed string → its Arabic, or itself. Exact phrases first, then
 * templates ("Lands after {t} s"), whose values are translated in turn when
 * they are words and isolated when they are numbers.
 */
export function translateText(text) {
  if (!DICT || typeof text !== 'string') return text;
  const key = norm(text);
  if (!key || !/[A-Za-z]/.test(key)) return text;
  if (CACHE.has(text)) return CACHE.get(text);
  let out = DICT.get(key);
  if (out === undefined) {
    for (const [re, v, names] of PATTERNS) {
      const m = key.match(re);
      if (!m) continue;
      // A slot holding words with no Arabic yet: leave the whole line English
      // rather than half of each.
      if (m.slice(1).some((x) => /[A-Za-z]{2,}/.test(x) && translateText(x) === x)) continue;
      const params = {};
      names.forEach((n, i) => { params[n] = m[i + 1]; });
      out = fill(v, params);
      break;
    }
  }
  if (out === undefined) out = text;
  else {
    // keep the spaces it came with, so inline text still sits apart
    const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0];
    out = lead + out + tail;
  }
  if (CACHE.size > 4000) CACHE.clear();
  CACHE.set(text, out);
  return out;
}

/* ── the page ─────────────────────────────────────────────────────────── */

const ATTRS = ['title', 'aria-label', 'placeholder', 'alt', 'data-tip', 'aria-description'];

function skipped(el) {
  return !el || !!el.closest?.('.m,[translate="no"],script,style,textarea,code');
}

function doText(node) {
  const v = node.nodeValue;
  if (!v || !/[A-Za-z0-9]/.test(v) || /^\s*\u2066/.test(v)) return;   // nothing to say, or already isolated
  if (skipped(node.parentElement)) return;
  const out = translateText(v);
  const parent = node.parentElement;
  if (out !== v) {
    node.nodeValue = out;
    if (parent?.hasAttribute('data-i18n-en')) { parent.removeAttribute('data-i18n-en'); parent.removeAttribute('dir'); }
    return;
  }
  if (ARABIC.test(v) || !/\S/.test(v)) return;
  // Left in English, or a bare number: never let the right-to-left page
  // scramble it. A sentence broken up by inline elements ("you do <em>not</em>
  // need") turns its whole parent left to right, so its pieces keep their
  // order; a lone run is isolated, so "−9.81" never becomes "9.81−".
  if (parent && parent.childNodes.length > 1 && !ARABIC.test(textOutsideMaths(parent))) {
    if (!parent.hasAttribute('dir')) { parent.setAttribute('dir', 'ltr'); parent.setAttribute('data-i18n-en', ''); }
    return;
  }
  const lead = v.match(/^\s*/)[0], tail = v.match(/\s*$/)[0];
  node.nodeValue = `${lead}${LRI}${v.trim()}${PDI}${tail}`;
}

function textOutsideMaths(el) {
  let s = '';
  for (const n of el.childNodes) {
    if (n.nodeType === 3) s += n.nodeValue;
    else if (n.nodeType === 1 && !n.matches('.m,svg')) s += textOutsideMaths(n);
  }
  return s;
}

function doAttrs(el) {
  if (el.closest?.('.m,[translate="no"]')) return;
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
  if (root.nodeType === 3) { doText(root); return; }
  if (root.nodeType !== 1 || skipped(root)) return;
  doAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (n.nodeType !== 1) return NodeFilter.FILTER_ACCEPT;
      if (n.matches?.('.m,[translate="no"],script,style,code')) return NodeFilter.FILTER_REJECT;
      // a text box: its placeholder and label are ours, what is typed in it is not
      if (n.matches?.('textarea')) { doAttrs(n); return NodeFilter.FILTER_REJECT; }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) doText(n); else doAttrs(n);
  }
}

/* The canvas bypasses the DOM: its words are translated as they are drawn,
   measured the same way so a label's plate still fits it, and drawn in the
   Arabic face. The stage itself is never mirrored — css/rtl.css keeps every
   canvas left to right, so x still goes to the right. */
function patchCanvas() {
  const C = globalThis.CanvasRenderingContext2D?.prototype;
  if (!C || C.__i18n) return;
  C.__i18n = true;
  const face = (ctx, s) => {
    if (!ARABIC.test(s) || /Plex Sans Arabic/.test(ctx.font)) return null;
    const was = ctx.font;
    ctx.font = was.replace(/(\d+(?:\.\d+)?px(?:\/\S+)?\s+)/, '$1"IBM Plex Sans Arabic", ');
    if (ctx.font === was) ctx.font = `${was}, "IBM Plex Sans Arabic"`;
    return was;
  };
  const wrap = (name) => {
    const orig = C[name];
    C[name] = function (text, ...rest) {
      if (typeof text !== 'string' || !/[A-Za-z]/.test(text)) return orig.call(this, text, ...rest);
      const s = translateText(text);
      if (s === text) return orig.call(this, text, ...rest);
      const was = face(this, s);
      const dir = this.direction, align = this.textAlign;
      this.direction = 'rtl';
      if (align === 'start') this.textAlign = 'left'; else if (align === 'end') this.textAlign = 'right';
      try { return orig.call(this, s, ...rest); } finally {
        this.direction = dir; this.textAlign = align;
        if (was) this.font = was;
      }
    };
  };
  wrap('fillText'); wrap('strokeText'); wrap('measureText');
}

function observe() {
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else for (const n of m.addedNodes) localize(n);
    }
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // the tab title: "السبورة | SUVAT"
  const title = document.querySelector('title');
  if (title) {
    const fix = () => {
      const m = document.title.match(/^(.*) \| SUVAT$/);
      if (!m) return;
      const here = translateText(m[1]);
      if (here !== m[1]) document.title = `${here} | SUVAT`;
    };
    new MutationObserver(fix).observe(title, { childList: true, characterData: true, subtree: true });
    fix();
  }
}

/**
 * Switch language. The page reloads where it was: the view and the scenario
 * ride along in sessionStorage, and app.js restores them (see restorePlace).
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

/** The Arabic dictionary and the page set up for it. Resolves at once in English. */
export const ready = (async () => {
  if (LANG !== 'ar' || typeof document === 'undefined') return;
  const de = document.documentElement;
  de.lang = 'ar'; de.dir = 'rtl';
  try {
    const { default: AR } = await import('./i18n/ar.js');
    useDictionary('ar', AR);
  } catch (e) {
    console.warn('Arabic dictionary failed to load', e);
    de.classList.remove('i18n-wait');
    return;
  }
  patchCanvas();
  const go = () => { localize(document.body); observe(); de.classList.remove('i18n-wait'); };
  if (document.body) go(); else addEventListener('DOMContentLoaded', go, { once: true });
})();
