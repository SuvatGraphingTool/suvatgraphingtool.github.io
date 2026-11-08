// i18n.test.mjs — Arabic mode. Run with: node test/i18n.test.mjs
//
// In Arabic mode the only Latin-looking thing on screen is a digit. This holds
// the pieces to that: the dictionary is complete and alive, templates put numbers
// where Arabic wants them, notation.js sets every symbol and unit from its one
// table, the choice is remembered, and the reader is told the language and reads
// Arabic — with a fake model, never a real one. The sweep of everything the app
// can display runs in Arabic at the end of test/notation.test.mjs; every screen
// in a real browser is tools/verify/arabic-sweep.cjs. English is proved unchanged
// by every other suite in this folder passing with the module in.

import fs from 'node:fs';
import path from 'node:path';
import AR, { GENERIC } from '../js/i18n/ar.js';
import { t, lang, useDictionary, translateText, localizeHTML, arabicUnits, ltr } from '../js/i18n.js';
import { M, T, num, signed, mathHTML, mathText, ARABIC as TABLE } from '../js/notation.js';
import { readArabic, hasArabic } from '../js/compose/arabicwords.js';
import { answered } from '../worker/src/composeplace.js';
import { readText } from '../js/ai/capture.js';
import { readoutHTML } from '../js/ai/readout.js';
import { SYSTEM_PROMPT, SEARCH_PROMPT, ARABIC_NOTE, inLang } from '../worker/src/schema.js';
import reader from '../worker/src/index.js';

let pass = 0, fail = 0;
const ok = (c, label, more = '') => (c ? (pass++, console.log(`  ok   ${label}`)) : (fail++, console.log(`  FAIL ${label}${more ? `\n         ${more}` : ''}`)));
const ROOT = path.resolve(import.meta.dirname, '..');
const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;
const sp = (x) => String(x).replace(/[\u2009\u200A\u202F]/g, ' ');

/* every word the app's own source could say */
function sources(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== 'i18n') sources(p, out); } else if (/\.js(on)?$/.test(f.name) && f.name !== 'i18n.js') out.push(fs.readFileSync(p, 'utf8'));
  }
  return out;
}
const CORPUS = [...sources(path.join(ROOT, 'js')), ...sources(path.join(ROOT, 'worker/src')), fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), fs.readFileSync(path.join(ROOT, 'privacy.html'), 'utf8')].join('\n')
  .replace(/\\u2019/g, '’').replace(/\\u2013/g, '–').replace(/\\u00b7/g, '·').replace(/\s+/g, ' ');
const WORDS = new Set(CORPUS.toLowerCase().match(/[a-z]+/g));
/* Still in the source? A sentence: most of its words. A key is often a piece the
   code builds at run time, so word by word is the honest test. */
function alive(key) {
  if (key.startsWith('sym:')) return true;
  const words = key.replace(/\{\w+\}/g, ' ').match(/[A-Za-z]+/g) || [];
  const hit = words.filter((w) => WORDS.has(w.toLowerCase())).length;
  return !words.length || hit / words.length >= 0.7;
}

console.log('\nThe dictionary');
{
  const keys = Object.keys(AR);
  ok(keys.length > 7000, `it has every string (${keys.length})`);
  const empty = keys.filter((k) => typeof AR[k] !== 'string' || !AR[k].trim());
  ok(!empty.length, 'every key has a value', empty.join(' | '));
  const latin = keys.filter((k) => LATIN.test(AR[k].replace(/\{\w+\}/g, '')));
  ok(!latin.length, 'and not one value has a Latin letter in it', latin.join(' | ').slice(0, 800));
  const orphans = keys.filter((k) => !alive(k));
  ok(!orphans.length, 'no orphan keys: their words are still in the source', orphans.slice(0, 20).join(' | '));
  // the slots match, so a template can never lose its number
  const slots = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
  const lost = keys.filter((k) => slots(k) !== slots(AR[k]));
  ok(!lost.length, 'every template keeps its slots', lost.join(' | ').slice(0, 800));
  // every t('…') in the source has its Arabic
  const used = [...CORPUS.matchAll(/\bt\('((?:[^'\\]|\\.)+)'/g)].map((m) => m[1]);
  const missing = used.filter((k) => / /.test(k) && !(k in AR));
  ok(!missing.length, 'every t() phrase in the source has Arabic', missing.join(' | ').slice(0, 400));
  const dict = fs.readFileSync(path.join(ROOT, 'design/arabic-glossary.md'), 'utf8');
  ok(['ع', 'ف', 'ز', 'جـ', 'هـ', 'سٓ', 'م/ث'].every((x) => dict.includes(x)), 'the glossary records the symbols');
}

console.log('\nEnglish is the default, and pays nothing');
{
  ok(lang() === 'en', 'with no window it is English');
  ok(t('Launch') === 'Launch', 't() hands the English back');
  ok(t('Launch at {v} m s⁻¹', { v: '20.0' }) === 'Launch at 20.0 m s⁻¹', 'and fills a template, with no isolates');
  ok(translateText('Launch') === 'Launch', 'translateText leaves it alone');
  ok(ltr('9.81') === '9.81', 'and ltr() adds nothing');
  ok(M`v = 20 [m s^-1]`.includes('<i class="m-var">v</i>') && sp(T`v = 20 [m s^-1]`) === 'v = 20 m s⁻¹', 'the notation sets English as ever');
  ok(T`T = 3` === 'T = 3' && T`Ten = 3` === 'T = 3', 'a tension is a T in English, whichever name the source gives it');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(!/<link[^>]+(?:rtl\.css|Plex)/.test(html), 'the page links neither the Arabic face nor css/rtl.css: only the Arabic boot adds them');
  const app = fs.readFileSync(path.join(ROOT, 'js/i18n.js'), 'utf8');
  ok(/await import\('\.\/i18n\/ar\.js'\)/.test(app) && !/^import .*ar\.js/m.test(app), 'the dictionary is fetched lazily');
  ok(readArabic('A stone is dropped from a 20 m cliff') === 'A stone is dropped from a 20 m cliff', 'English words go through the Arabic reader untouched');
}

useDictionary('ar', AR, GENERIC);

console.log('\nThe maths, in Arabic: symbols and units from the one table');
{
  const clean = (s) => s.replace(/<[^>]*>/g, ' ').replace(/‌/g, '').replace(/\s+/g, ' ').trim();
  ok(sp(T`v = 20 [m s^-1]`) === 'ع = 20 م/ث', 'velocity and its unit', T`v = 20 [m s^-1]`);
  ok(sp(T`a = 9.81 [m s^-2]`) === 'ت = 9.81 م/ث²', 'acceleration and its unit');
  ok(T`u = 3` === 'ع₀ = 3' && clean(M`u = 3`).startsWith('ع 0'), 'u is ع with a 0 below it, on the canvas and on the page');
  ok(clean(M`s = 12 [m]`) === 'ف = 12 م', 'displacement in metres');
  ok(clean(M`t = 2 [s]`) === 'ز = 2 ث', 'time in seconds');
  ok(sp(T`F = 2 [N]`) === 'ق = 2 نيوتن' && sp(T`m = 3 [kg]`) === 'ك = 3 كجم', 'force and mass');
  ok(T`sin theta`.includes('جا') && T`sin theta`.includes('هـ') && T`cos theta`.includes('جتا') && T`tan theta`.includes('ظا'), 'جا جتا ظا and هـ');
  ok(M`sqrt(u^2 + 2gh)`.includes('m-rad') && M`(v^2 - u^2)/(2a)`.includes('m-frac'), 'a radical has its bar and a fraction stays stacked');
  ok(!LATIN.test(T`u_y = u sin theta`) && !LATIN.test(clean(M`u_y = u sin theta`)), 'a component: ع₀ص');
  ok(!LATIN.test(T`H_max = h_0 + x_B`) && T`H_max = 1`.includes('أقصى'), 'a word in a subscript, and a point');
  ok(T`vec(i)`.includes('سٓ') && T`vec(j)`.includes('صٓ') && !LATIN.test(T`3 vec(i) + 4 vec(j)`), 'the unit vectors');
  ok(T`Ten = 3` === 'ش = 3', 'a tension has its own letter');
  ok(T`x -> y` === 'س ← ص', 'an arrow points the way the sentence reads');
  ok(num(-9.81) === '−9.81' && !/[٠-٩]/.test(T`v = 20`), 'digits stay Western, with a real minus sign');
  ok(!LATIN.test(T`1.2e5 * 2`) && T`1.2e5 * 2`.includes('× 10⁵'), 'standard form');
  ok(M`2as`.includes('m-sp') && !LATIN.test(T`2as + ut + gt^2`), 'a product of letters is set apart, never joined into a word');
  ok(mathHTML('v = 1') !== mathText('v = 1') && !LATIN.test(clean(mathHTML('"at the top" v = 1'))), 'prose inside an equation is translated too');
  for (const [, table] of Object.entries(TABLE)) for (const v of Object.values(table)) ok(!LATIN.test([].concat(v).join('')), `the table has no Latin in it: ${[].concat(v).join(' ')}`);
  // and every name the source can use
  const names = 'A B C D O P Q R S X Y a b c d e g h i j k m n p r s t u v w x y F H I J T U V W alpha beta gamma mu theta pi'.split(' ');
  const left = names.filter((n) => LATIN.test(mathText(n)));
  ok(!left.length, 'every symbol the source uses has its Arabic', left.join(' '));
}

console.log('\nTemplates, in Arabic');
{
  ok(lang() === 'ar', 'the language can be Arabic');
  ok(t('Scenarios') === 'المواقف', 'a word');
  ok(t('Whiteboard') === 'السبورة', 'the tab’s word');
  ok(t('SUVAT') === 'سوفات' && t('Ask Suvat') === 'اسأل سوفات', 'the name');
  const launch = translateText('Launch at 25.0 m s⁻¹');
  ok(ARABIC.test(launch) && launch.includes('25.0') && !LATIN.test(launch), 'a pattern finds its number', launch);
  const known = translateText('2 of 5 known');
  ok(known.includes('2') && ARABIC.test(known) && !LATIN.test(known), 'the number goes where Arabic puts it');
  ok(!ARABIC.test(translateText('wibble · wobble')), 'a slot with no Arabic leaves the whole line English, never half of each');
  const named = translateText('Drawing the wibble…');
  ok(ARABIC.test(named) && !/wibble/.test(named), 'the drawing screen says the line without a name it has no Arabic for');
  ok(/اللابتوب/.test(translateText('Drawing the laptop…')), 'and names the object when it has it', translateText('Drawing the laptop…'));
  ok(translateText('  Search…  ').startsWith('  ') && translateText('  Search…  ').endsWith('  '), 'the spaces around a piece are kept');
  ok(!LATIN.test(translateText('greatest height 20.39 m')) && translateText('greatest height 20.39 m').includes('20.39'), 'a label with its reading');
  const mixed = translateText('كرة تسقط من برج. No height was given, so I’ve used 30 m for the tower. Tell me the real one and I’ll run it again.');
  ok(!LATIN.test(mixed), 'a summary in Arabic with the app’s own sentence after it', mixed);
  ok(arabicUnits('من ارتفاع 45 m بسرعة 12 m s⁻¹ لمدة 3 s') === 'من ارتفاع 45 م بسرعة 12 م/ث لمدة 3 ث', 'units in what the model wrote');
  const ref = translateText('Edexcel 6677/01 M1 · Jun 2012 · Q4, the car');
  ok(/إدكسل/.test(ref) && /يونيو 2012/.test(ref) && /سؤال 4/.test(ref) && /6677\/01 M1/.test(ref), 'a paper’s reference, with its code as printed', ref);
}

console.log('\nA reply, turned Arabic as the page turns it');
{
  const reply = readoutHTML({
    items: [{ k: 'u', how: 'given', value: 12, x: 12 }, { k: 'h', how: 'given', value: 45, x: 45 }, { k: 'g', how: 'assumed', value: 9.81, x: 9.81 }],
    asks: [], confidence: 'high',
  }, { name: 'Off a platform', solved: { ok: true, derived: [] }, flight: { tFlight: 3.03, range: 36.35, vLanding: 32.05, apexRise: 0, apexHeight: 45 } });
  const said = localizeHTML(reply).replace(/<[^>]*>/g, ' ').replace(/‌/g, '').replace(/\s+/g, ' ').trim();
  ok(!LATIN.test(said), 'not a Latin letter in it', said);
  ok(/جـ = 9\.81 م\/ث/.test(said) && /ز = 3\.03 ث/.test(said), 'and the numbers are the engine’s', said);
  const order = localizeHTML(`Lands ${M`36.35 [m]`} out, at ${M`32.05 [m s^-1]`}.`);
  ok(order.indexOf('36.35') < order.indexOf('32.05') && !LATIN.test(order.replace(/<[^>]*>/g, '')), 'a sentence is looked up whole, its equations held', order.replace(/<[^>]*>/g, ''));
}

console.log('\nThe page keeps to the direction');
{
  const css = fs.readFileSync(path.join(ROOT, 'css/rtl.css'), 'utf8');
  ok(/\[dir="rtl"\] \.m \{ direction: rtl; unicode-bidi: isolate;/.test(css), 'an equation reads right to left, isolated by its class');
  ok(/\.m-num \{ direction: ltr;/.test(css), 'only a number’s digits run left to right');
  ok(/\[dir="rtl"\] canvas \{ direction: ltr; \}/.test(css), 'the stage is never mirrored');
}

console.log('\nThe toggle persists');
{
  const store = new Map();
  const saved = { document: globalThis.document, localStorage: globalThis.localStorage, location: globalThis.location };
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  globalThis.location = { search: '?lang=ar', href: 'http://x.test/?lang=ar' };
  globalThis.document = { documentElement: { classList: { remove() {} } }, body: null, getElementById: () => null, querySelector: () => null };
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
  for (const k of ['document', 'localStorage', 'location']) { if (saved[k] === undefined) delete globalThis[k]; else globalThis[k] = saved[k]; }
}

console.log('\nIt reads Arabic questions');
{
  const read = (s) => readArabic(s);
  const says = (s, ...words) => { const r = read(s); ok(words.every((w) => r.includes(w)), `${s}  →  ${r}`, `wanted ${words.join(', ')}`); };
  ok(hasArabic('كرة') && !hasArabic('ball'), 'it knows Arabic when it sees it');
  says('سقط حجر من فوق جرف ارتفاعه ٤٥ م', 'fell', 'stone', 'off', 'cliff', 'height', '45 m');
  says('أُسقطت كرة من برج ارتفاعه 30 متر', 'dropped', 'ball', 'tower', '30 m');
  says('رُمي حجر من جسر بسرعة ١٢ م/ث', 'thrown', 'stone', 'bridge', '12 m/s');
  says('قُذفت كرة بسرعة ٢٠ م/ث بزاوية ٣٠ درجة', 'projected', 'ball', '20 m/s', '30 degrees');
  says('رُكلت كرة قدم بسرعة ٢٠ م/ث', 'kicked', 'football', '20 m/s');
  says('دُفع صندوق من فوق طاولة ارتفاعها ٠٫٨ م', 'pushed', 'box', 'off', 'table', '0.8 m');
  says('سقط كتاب من فوق رف', 'fell', 'book', 'shelf');
  says('سقط حجر في بئر، ما عمق البئر؟', 'fell', 'stone', 'well', 'how deep');
  says('تفاحة تسقط من شجرة، كم يستغرق سقوطها؟', 'apple', 'falls', 'tree', 'how long');
  says('دفعه رجل من فوق السطح', 'pushed by a man', 'roof');
  says('رماها الولد من النافذة', 'thrown by a boy', 'window');
  says('رُميت كرة لأعلى، أوجد السرعة الابتدائية', 'thrown', 'upwards', 'initial speed');
  says('ما ارتفاع البرج؟', 'what is the height');
  says('كم يستغرق الحجر حتى يصل إلى الأرض؟', 'how long');
  says('أوجد السرعة عند الهبوط', 'find the speed');
  says('فقط أُسقط', 'just', 'dropped');
  says('بدأ من السكون', 'from rest');
  says('يتسارع ٢٫٥ م/ث²', '2.5 m/s²');
  says('طوله ٥٠ كم وكتلته ٣ كجم', '50 km', '3 kg');

  const had = JSON.stringify({ understood: true, scenario: 'dropped', who: 'stone' });
  const earlier = [{ role: 'model', parts: [{ text: had }] }];
  ok(answered(readArabic('٢٠ م'), earlier)?.h === 20, '"٢٠ م" answers the height, with no model');
  ok(answered(readArabic('20 متر'), earlier)?.h === 20, '"20 متر" too');
  ok(answered(readArabic('حوالي ١٥٫٥ متر'), earlier)?.h === 15.5 || answered(readArabic('١٥٫٥ متر'), earlier)?.h === 15.5, 'and a decimal in Arabic digits');
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
  ok(/"title"/.test(ARABIC_NOTE) && /"summary"/.test(ARABIC_NOTE) && /سوفات/.test(ARABIC_NOTE), 'and asks for the title and summary in Arabic');

  const ask = async (text, extra, reply) => {
    const prompts = [];
    const env = { MODELS: '@cf/test/model', ALLOWED_ORIGINS: '',
      AI: { run: async (_m, input) => { prompts.push(input.messages[0].content); return { response: reply }; } } };
    const res = await reader.fetch(new Request('https://reader.test/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...extra }) }), env, { waitUntil() {} });
    return { prompts, data: await res.json() };
  };
  const plain = { understood: true, scenario: 'dropped', h: 45, title: 'حجر يسقط', summary: 'حجر يسقط من ارتفاع 45 م.' };
  const ar = await ask('سقط حجر من ارتفاع ٤٥ م', { lang: 'ar' }, plain);
  ok(ar.prompts[0].endsWith(ARABIC_NOTE), 'the Worker adds the note when lang is "ar"');
  ok(ar.data.ok && ar.data.extraction.h === 45, 'and the JSON comes back as data, its keys the same');
  ok(ar.data.extraction.title === 'حجر يسقط', 'the chat’s title comes back as the model wrote it');
  ok(ar.data.extraction.who === 'stone', 'what moves is read from the Arabic words', JSON.stringify(ar.data.extraction));
  const en = await ask('حجر', {}, plain);
  ok(!en.prompts[0].includes('ARABIC MODE'), 'with no lang the prompt has no such note');
  const odd = await ask('حجر', { lang: 'xx' }, plain);
  ok(!odd.prompts[0].includes('ARABIC MODE'), 'and an unknown lang is treated as English');
  const dropped = await ask('فقط أُسقط من فوق برج', { lang: 'ar' }, { understood: true, scenario: 'library', library: 'from-a-height', boxes: { place: 'tower', h: 25 } });
  ok(dropped.data.extraction.boxes?.u === 0 && dropped.data.extraction.boxes?.theta === -90, '"فقط أُسقط" is just dropped: from rest, straight down', JSON.stringify(dropped.data.extraction?.boxes));
  const place = await ask('دفعه رجل من فوق السطح', { lang: 'ar' }, { understood: true, scenario: 'compose', recipe: { backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'diver' }], numbers: { h: 6 } } });
  ok(place.data.extraction.recipe?.backdrop && place.data.extraction.recipe.backdrop !== 'ground', 'the place in the Arabic words decides the scene', JSON.stringify(place.data.extraction?.recipe?.backdrop));
  const filled = await reader.fetch(new Request('https://reader.test/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '٢٠ م', lang: 'ar', history: [{ role: 'user', text: 'سقط حجر من برج' }, { role: 'model', text: JSON.stringify({ understood: true, scenario: 'dropped' }) }] }) }),
  { MODELS: '@cf/test/model', ALLOWED_ORIGINS: '', AI: { run: async () => { throw new Error('no model should be asked'); } } }, { waitUntil() {} });
  const fj = await filled.json();
  ok(fj.ok && fj.model === 'none' && fj.extraction.h === 20, '"٢٠ م" through the Worker: no model call');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
