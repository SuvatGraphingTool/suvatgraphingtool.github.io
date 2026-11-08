// i18n.test.mjs — Arabic mode. Run with: node test/i18n.test.mjs
//
// The dictionary is complete and alive, templates put numbers where Arabic
// wants them, no programmer's maths gets in through the Arabic (rule 1), the
// maths stays left to right, the choice is remembered, and the reader is told
// the language — with a fake model, never a real one. English is proved
// unchanged by every other suite in this folder passing with the module in.

import fs from 'node:fs';
import path from 'node:path';
import AR from '../js/i18n/ar.js';
import { t, lang, useDictionary, translateText, isolateRuns, ltr, LRI, PDI } from '../js/i18n.js';
import { readText } from '../js/ai/capture.js';
import { readoutHTML } from '../js/ai/readout.js';
import { SYSTEM_PROMPT, SEARCH_PROMPT, ARABIC_NOTE, inLang } from '../worker/src/schema.js';
import reader from '../worker/src/index.js';

let pass = 0, fail = 0;
const ok = (c, label, more = '') => (c ? (pass++, console.log(`  ok   ${label}`)) : (fail++, console.log(`  FAIL ${label}${more ? `\n         ${more}` : ''}`)));
const ROOT = path.resolve(import.meta.dirname, '..');
const ARABIC = /[؀-ۿ]/;

/* every word the app's own source could say */
function sources(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== 'i18n') sources(p, out); } else if (/\.js$/.test(f.name) && f.name !== 'i18n.js') out.push(fs.readFileSync(p, 'utf8'));
  }
  return out;
}
const CORPUS = [...sources(path.join(ROOT, 'js')), fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')].join('\n')
  .replace(/\\u2019/g, '’').replace(/\\u2013/g, '–').replace(/\\u00b7/g, '·').replace(/\s+/g, ' ');
const WORDS = new Set(CORPUS.toLowerCase().match(/[a-z’'-]+/g));
/* Still in the source? A sentence: some four words of it in a row. A short label,
   often built at run time (`Step ${n}, ${name}`): each of its words. */
function alive(key) {
  const words = key.replace(/\{\w+\}/g, ' ').match(/[A-Za-z’'-]+/g) || [];
  if (words.length < 6) return words.every((w) => WORDS.has(w.toLowerCase()));
  const bare = key.replace(/\{\w+\}/g, '\u0000').split('\u0000').map((x) => x.trim().split(/\s+/));
  return bare.some((run) => run.some((_, i) => i + 4 <= run.length && CORPUS.includes(run.slice(i, i + 4).join(' '))));
}

console.log('\nThe dictionary');
{
  const keys = Object.keys(AR);
  ok(keys.length > 300, `it has the words a student meets first (${keys.length})`);
  const empty = keys.filter((k) => typeof AR[k] !== 'string' || !AR[k].trim());
  ok(!empty.length, 'every key has a value', empty.join(' | '));
  const notArabic = keys.filter((k) => !ARABIC.test(AR[k]) && k !== '{how} · {from}');
  ok(!notArabic.length, 'every value is Arabic', notArabic.join(' | '));
  // no orphans: each key's words are still somewhere in the app
  const orphans = keys.filter((k) => !alive(k));
  ok(!orphans.length, 'no orphan keys: every English phrase is still in the source', orphans.join(' | '));
  // the slots match, so a template can never lose its number
  const slots = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
  const lost = keys.filter((k) => slots(k) !== slots(AR[k]));
  ok(!lost.length, 'every template keeps its slots', lost.join(' | '));
  // every t('…') in the source has its Arabic
  const used = [...CORPUS.matchAll(/\bt\('((?:[^'\\]|\\.)+)'/g)].map((m) => m[1]);
  const norm = new Set(keys);
  const missing = used.filter((k) => /\s/.test(k) && !norm.has(k));
  ok(!missing.length, 'every t() phrase in the source has Arabic', missing.join(' | '));
}

console.log('\nEnglish is the default, and pays nothing');
{
  ok(lang() === 'en', 'with no window it is English');
  ok(t('Launch') === 'Launch', 't() hands the English back');
  ok(t('Launch at {v} m s⁻¹', { v: '20.0' }) === 'Launch at 20.0 m s⁻¹', 'and fills a template, with no isolates');
  ok(translateText('Launch') === 'Launch', 'translateText leaves it alone');
  ok(ltr('9.81') === '9.81', 'and ltr() adds nothing');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(!/<link[^>]+(?:rtl\.css|Plex)/.test(html), 'the page links neither the Arabic face nor css/rtl.css: only the Arabic boot adds them');
  const app = fs.readFileSync(path.join(ROOT, 'js/i18n.js'), 'utf8');
  ok(/import\('\.\/i18n\/ar\.js'\)/.test(app) && !/^import .*ar\.js/m.test(app), 'the dictionary is fetched lazily');
}

useDictionary('ar', AR);

console.log('\nTemplates, in Arabic');
{
  ok(lang() === 'ar', 'the language can be Arabic');
  ok(t('Scenarios') === 'المواقف', 'a word');
  ok(t('Whiteboard') === 'السبورة', 'the tab’s word');
  const launch = translateText('Launch at 25.0 m s⁻¹');
  ok(ARABIC.test(launch) && launch.includes('25.0') && launch.includes(`${LRI}`), 'a pattern finds its number, and isolates it');
  const known = translateText('2 of 5 known');
  ok(known.startsWith(LRI) && known.includes('2') && ARABIC.test(known), 'the number goes where Arabic puts it');
  ok(!translateText('Building the wibble…').match(ARABIC), 'a slot with no Arabic leaves the whole line English, never half of each');
  ok(ARABIC.test(translateText('Building the cliff…')), 'and a slot it knows is translated');
  ok(translateText('  Search…  ').startsWith('  ') && translateText('  Search…  ').endsWith('  '), 'the spaces around a piece are kept');
  const mixed = translateText('كرة تسقط من برج. No speed was given, so I’ve used 5 m s⁻¹. Tell me the real one and I’ll run it again.');
  ok(!/No speed/.test(mixed) || ARABIC.test(mixed), 'a summary in Arabic with the app’s own sentence after it does not break');
}

console.log('\nRule 1, in Arabic: nothing programmer-like gets in through the dictionary');
{
  const BANNED = [/\^/, /\bsqrt\b/, /\*/, /<=|>=|!=|~=/, /-\s*\d|\d\s*-/, /\b(?:theta|alpha|beta|lambda|omega|sigma)\b/, /\be[+-]\d/, /_[A-Za-z0-9]/, /\+-|\+\/-/, /->|-->/, /\bInfinity\b|\bNaN\b|\bundefined\b/, /\//];
  const bad = [];
  for (const [k, v] of Object.entries(AR)) {
    const sample = v.replace(/\{\w+\}/g, '2.5');
    for (const re of BANNED) if (re.test(sample)) bad.push(`${k} → ${sample}`);
  }
  ok(!bad.length, 'every Arabic string, with sample numbers in it', bad.join('\n         '));

  // a real reply, swept the way the page would set it: the words translated, the equations untouched
  const reply = readoutHTML({
    items: [{ k: 'u', how: 'given', v: 12 }, { k: 'h', how: 'given', v: 45 }, { k: 'g', how: 'assumed', v: 9.81 }],
    asks: [], confidence: 'high',
  }, { name: 'Off a platform', solved: { ok: true, derived: [] }, flight: { tFlight: 3.03, range: 36.35, vLanding: 32.05, apexRise: 0, apexHeight: 45 } });
  const eqBefore = [...reply.matchAll(/<span class="m">.*?<\/span><\/span>|<span class="m">.*?<\/span>/g)].length;
  ok(eqBefore > 0, 'the reply has equations in it');
  const words = reply.replace(/<span class="m">(?:(?!<span class="m">).)*?<\/span>/g, ' ').replace(/<[^>]+>/g, '\n').split('\n').map((x) => x.trim()).filter((x) => /[A-Za-z]{2,}/.test(x));
  const left = words.filter((x) => !ARABIC.test(translateText(x)));
  const stray = words.map((x) => translateText(x)).filter((x) => BANNED.some((re) => re.test(x)));
  ok(!stray.length, 'its words, translated, carry no code', stray.join(' | '));
  ok(left.length <= 2, `and nearly all of them are Arabic (${left.join(' | ') || 'all'})`);
}

console.log('\nThe maths stays left to right');
{
  const css = fs.readFileSync(path.join(ROOT, 'css/rtl.css'), 'utf8');
  ok(/\[dir="rtl"\] \.m \{ direction: ltr; unicode-bidi: isolate; \}/.test(css), 'an equation is isolated, left to right, by its class');
  ok(/\[dir="rtl"\] canvas \{ direction: ltr; \}/.test(css), 'the stage is never mirrored');
  ok(ltr('−9.81') === `${LRI}−9.81${PDI}`, 'a number in plain text is isolated with U+2066 … U+2069');
  const withMaths = Object.entries(AR).filter(([k]) => /m s⁻[¹²]/.test(k));
  const open = withMaths.filter(([, v]) => !v.includes(LRI));
  ok(withMaths.length > 5 && !open.length, 'every Arabic line with a unit in it has it isolated', open.map(([k]) => k).join(' | '));
  const said = isolateRuns('حجر يسقط من ارتفاع 45 m بسرعة −12.5 m s⁻¹ لمدة 3 s.');
  ok(said.includes(`${LRI}45 m${PDI}`) && said.includes(`${LRI}−12.5 m s⁻¹${PDI}`) && said.includes(`${LRI}3 s${PDI}.`), 'a number and its unit in text the model wrote stay together, the right way round');
  ok(isolateRuns(said) === said, 'and isolating twice changes nothing');
  // the notation module knows nothing of the language
  const n = fs.readFileSync(path.join(ROOT, 'js/notation.js'), 'utf8');
  ok(!/i18n/.test(n), 'js/notation.js is untouched by it');
}

console.log('\nThe toggle persists');
{
  const store = new Map();
  const saved = { document: globalThis.document, localStorage: globalThis.localStorage, location: globalThis.location };
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  globalThis.location = { search: '?lang=ar', href: 'http://x.test/?lang=ar' };
  globalThis.document = { documentElement: {}, body: null, getElementById: () => null, querySelector: () => null };
  globalThis.addEventListener = globalThis.addEventListener || (() => {});
  const a = await import('../js/i18n.js?visit=1');
  ok(a.lang() === 'ar' && store.get('suvat-lang') === 'ar', '?lang=ar turns it on, and it is remembered');
  globalThis.location = { search: '', href: 'http://x.test/' };
  const b = await import('../js/i18n.js?visit=2');
  ok(b.lang() === 'ar', 'the next visit, with no ?lang, is still Arabic');
  let went = null;
  globalThis.location = { search: '', href: 'http://x.test/?lang=ar', replace: (u) => { went = u; } };
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.scrollY = 0;
  b.setLang('en');
  ok(store.get('suvat-lang') === 'en' && went === 'http://x.test/', 'setLang remembers it, and reloads without ?lang');
  globalThis.location = { search: '', href: 'http://x.test/' };
  const c = await import('../js/i18n.js?visit=3');
  ok(c.lang() === 'en', 'and the visit after is English');
  await new Promise((r) => setTimeout(r, 20));
  for (const k of ['document', 'localStorage', 'location']) { if (saved[k] === undefined) delete globalThis[k]; else globalThis[k] = saved[k]; }
}

console.log('\nThe reader is told the language');
{
  const realFetch = globalThis.fetch;
  let body = null;
  globalThis.fetch = async (_u, init) => { body = JSON.parse(init.body); return { ok: true, json: async () => ({ ok: true }) }; };
  await readText('https://reader.test/extract', 'كرة تسقط');
  ok(body.lang === 'ar', 'in Arabic the page sends lang: "ar"');
  useDictionary('en');
  await readText('https://reader.test/extract', 'a ball falls');
  ok(!('lang' in body), 'in English the body has no lang field at all');
  globalThis.fetch = realFetch;

  ok(inLang(SYSTEM_PROMPT, 'en') === SYSTEM_PROMPT && inLang(SEARCH_PROMPT) === SEARCH_PROMPT, 'the English prompts are unchanged');
  ok(inLang(SYSTEM_PROMPT, 'ar') === SYSTEM_PROMPT + ARABIC_NOTE, 'Arabic adds the note and nothing else');

  const ask = async (extra) => {
    const prompts = [];
    const env = { MODELS: '@cf/test/model', ALLOWED_ORIGINS: '',
      AI: { run: async (_m, input) => { prompts.push(input.messages[0].content); return { response: { understood: true, scenario: 'dropped', h: 45, summary: 'حجر يسقط من ارتفاع 45 m.' } }; } } };
    const res = await reader.fetch(new Request('https://reader.test/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'حجر يسقط من ارتفاع ٤٥ م', ...extra }) }), env, { waitUntil() {} });
    return { prompts, data: await res.json() };
  };
  const ar = await ask({ lang: 'ar' });
  ok(ar.prompts[0].endsWith(ARABIC_NOTE), 'the Worker adds the note when lang is "ar"');
  ok(ar.data.ok && ar.data.extraction.h === 45, 'and the JSON comes back as data, its keys the same');
  const en = await ask({});
  ok(!en.prompts[0].includes('ARABIC MODE'), 'with no lang the prompt has no such note');
  const odd = await ask({ lang: 'xx' });
  ok(!odd.prompts[0].includes('ARABIC MODE'), 'and an unknown lang is treated as English');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
