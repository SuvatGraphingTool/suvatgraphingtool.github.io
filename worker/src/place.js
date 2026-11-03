// place.js — a question that names where the ball starts from is shown THERE.
//
// The twelve draw a drop or a throw from a height on the open pitch. A student
// who says "pushed off a 60 m cliff" expects to see the cliff, and the
// Past-paper library's "from-a-height" draws a cliff, a tower, a bridge, a
// well, a diving board or a balloon to scale, on the same engine. The prompt
// asks the model for it, but the small readers keep reaching for the twelve,
// so the switch is made here, from the words themselves, where it cannot be
// forgotten. Only one ball launched from a height is moved; anything else
// (a ratio angle, a time above a line) is left exactly as it was read.

import { COMPOSE_GUIDE } from './compose.js';
import { LIBRARY_IDS } from './library.js';
import { SCENARIO_IDS } from './schema.js';

// the composer's own backdrops, read from its generated guide ("  cliff — …")
const BACKDROPS = new Set([...COMPOSE_GUIDE.split('figures')[0].matchAll(/^ {2}([a-z-]+) —/gm)].map((m) => m[1]));
// places only From a height draws, by the words a reader might use for them
const HEIGHT_ONLY = { board: 'board', 'diving board': 'board', springboard: 'board', diving: 'board',
  well: 'well', shaft: 'well', balloon: 'balloon', 'hot-air balloon': 'balloon' };

const PLACES = [
  [/\bcliff/i, 'cliff'], [/\b(tower|building|skyscraper|roof|block of flats)/i, 'tower'],
  // a well as a place ("down a 20 m well", "the well is 30 m deep"), never "as well as"
  [/\bbridge/i, 'bridge'], [/\b(a|the|down|into|of)\s+(\d+(\.\d+)?\s?m\s+)?(deep\s+)?well\b|\bwell\s+(is|\d)|\bmine ?shaft\b/i, 'well'],
  [/\b(diving board|springboard|high board|(diving|high) platform)\b/i, 'board'], [/\b(?<!water )(?<!water-)(hot.air )?balloon/i, 'balloon'],
  // "off a 10 m board", "a diver": the diving board, said the short way
  [/\d\s*m(etres?)?\s+(high\s+)?board\b|\bdiv(er|ers|ing)\b/i, 'board'],
];
// the twelve's answer keys, as from-a-height names the same answer
const ANSWER = { top: 'height', flight: 'time', vLand: 'speed', time: 'time', speed: 'speed', height: 'height' };
// each of the twelve's height scenarios, as an angle
const ANGLE = { dropped: () => 0, down: () => -90, platform: () => 0,
  'platform-angle': (x) => x.angleDegrees, 'platform-down': (x) => (x.angleDegrees == null ? null : -Math.abs(x.angleDegrees)),
  up: () => 90 };

// the twelve's own key stays on the part (`twelve`), so an answer From a height
// has no name for — the rise, the time to the top — is found again if the
// reading goes on to be composed (js/compose/recipe.js fromReading)
const renamed = (parts) => parts.map((p) => {
  const q = { ...p };
  if (q.answer != null && !ANSWER[q.answer]) q.twelve = q.answer;
  if (q.answer != null) { if (ANSWER[q.answer]) q.answer = ANSWER[q.answer]; else delete q.answer; }
  return q;
});

/** A recipe for a place the composer has no backdrop for, but From a height
    draws — a diving board, a well, a balloon — is that scenario instead of a
    refusal. With no angle given, a jump is straight up (and the reply says so). */
function fromRecipe(x, words) {
  const r = x.recipe || {}, n = r.numbers || {};
  const where = String(r.backdrop || '').toLowerCase().trim();
  if (x.scenario !== 'compose' || BACKDROPS.has(where) || !HEIGHT_ONLY[where]) return null;
  if (r.engine && r.engine !== 'projectile') return null;
  if (!(Number(n.h) > 0)) return null;
  const boxes = { place: HEIGHT_ONLY[where], h: Number(n.h) };
  for (const k of ['u', 's', 'v', 't', 'g']) if (isFinite(Number(n[k])) && n[k] !== '' && n[k] != null) boxes[k] = Number(n[k]);
  let theta = n.theta ?? n.angleDegrees, said = '';
  if (theta == null || theta === '') {
    const jump = /\bjump|\bleap|\bspring/i.test(`${words} ${x.summary || ''}`);
    theta = jump ? 90 : 0;
    if (!(boxes.u > 0)) theta = 0;
    else said = jump ? ' No angle was given, so the jump is taken as straight up: change θ to try another.'
                     : ' No angle was given, so it is taken as launched flat: change θ to try another.';
  }
  boxes.theta = Number(theta);
  const out = { understood: true, confidence: x.confidence || 'high', scenario: 'library', library: 'from-a-height',
    summary: `${x.summary || ''}${said}`.trim(), boxes };
  if (Array.isArray(x.parts)) out.parts = renamed(x.parts);
  if (Array.isArray(x.asked)) out.asked = renamed(x.asked);
  if (Array.isArray(x.asks)) out.asks = x.asks;
  for (const k of ['who', 'below', 'assumed']) if (x[k] != null) out[k] = x[k];
  return out;
}

// an angle the student actually gave: a number of degrees, or a direction in words
const ANGLE_GIVEN = /\d\s*(°|deg)|\bangle of\b|\bat an angle\b|\bhorizontal|\bvertical|\bstraight (up|down)|\bupwards?\b|\bdownwards?\b|\bflat\b/i;
const JUMP = /\bjump|\bleap|\bsprings? (up|off)/i;

/** A jump with no angle given is straight up — the exam reading — and the reply says so. */
function jumpUp(x, words) {
  const b = x?.boxes;
  if (x?.library !== 'from-a-height' || !b || !(b.u > 0)) return x;
  if (x.assumed?.includes('angle')) return x;          // toFigure has read it and will say so
  const text = `${words} ${x.summary || ''}`;
  if (!JUMP.test(text) || ANGLE_GIVEN.test(words)) return x;
  if (b.theta === 90 && /straight up/.test(x.summary || '')) return x;
  return { ...x, boxes: { ...b, theta: 90 },
    summary: `${(x.summary || '').trim()} No angle was given, so the jump is taken as straight up: change θ to try another.`.trim() };
}

// a speed in the student's words: a number with its unit, or the word itself
const SPEED_SAID = /m\s*\/\s*s|\bm\s*s\b|m\s*s(-1|⁻¹)|metres? (per|a) second|\bmph\b|km\s*\/?\s*h|\bspeed|\bvelocity|\bfast\b/i;
// let go, not thrown: it starts from rest
const LET_GO = /\b(push(ed|es)?|roll(s|ed)?|drop(s|ped)?|falls?|fell|let go|releas(e|es|ed)|knock(s|ed)?|slid(e|es)?|tip(s|ped)?)\b/i;

/**
 * What From a height still needs, settled from the student's words:
 * - straight up or down from a well or a balloon, never across — a balloon
 *   "rising at 4 m/s" carries what it lets go of up, one going down down;
 * - pushed, rolled or let go with no speed anywhere in the question, it
 *   starts from rest, and the reply says so.
 */
/** "Moves with constant velocity (4i + 3j)": no acceleration, 0 in both parts. */
function steady(x, words) {
  const b = x?.boxes;
  if (x?.library !== 'vectors-ij' || !b || b['a.x'] != null || b['a.y'] != null) return x;
  if (!/\b(constant|steady|uniform) velocity\b/i.test(words)) return x;
  return { ...x, boxes: { ...b, 'a.x': 0, 'a.y': 0 } };
}

function settle(x, words) {
  x = steady(x, words);
  // composed, let go from what carries it: a balloon moves straight up or down, and a
  // speed read as negative ("descending at 3 m/s" as u = −3) is a speed downwards
  const n = x?.scenario === 'compose' && x.recipe?.numbers;
  // "rolls off the desk", "slides off", "flicked off", "horizontally": launched flat
  if (n && (n.theta == null || n.theta === '') && !(Number(n.u) < 0)
      && /\b(roll(s|ed|ing)?|slid(e|es|ing)?|pushed|push(es)?|flick(s|ed)?)\b[^.]*?\boff\b|\bhorizontally\b/i.test(words)) {
    return { ...x, recipe: { ...x.recipe, numbers: { ...n, theta: 0 } } };
  }
  if (n && (n.theta == null || n.theta === '') && Number(n.u) !== 0 && isFinite(Number(n.u)) && n.u !== '' && n.u != null) {
    const balloon = x.recipe.backdrop === 'air' && /balloon/i.test(String(x.recipe.carrier || ''));
    const text = `${words} ${x.summary || ''}`;
    const down = Number(n.u) < 0 || (balloon && /\b(descend(s|ing)?|sink(s|ing)?|fall(s|ing)?|coming down)\b/i.test(text));
    if (Number(n.u) < 0 || balloon) return { ...x, recipe: { ...x.recipe, numbers: { ...n, u: Math.abs(Number(n.u)), theta: down ? -90 : 90 } } };
  }
  const b = x?.boxes;
  if (x?.library !== 'from-a-height' || !b) return x;
  const text = `${words} ${x.summary || ''}`;
  const out = { ...x, boxes: { ...b } };
  // "projected vertically upwards" with no angle given: 90°, and downwards −90°
  if (b.theta == null || b.theta === '') {
    if (/\bvertically up(wards)?\b|\bstraight up(wards)?\b/i.test(text)) out.boxes.theta = 90;
    else if (/\bvertically down(wards)?\b|\bstraight down(wards)?\b/i.test(text)) out.boxes.theta = -90;
  }
  // "hits the water 2.5 s later. how deep is the well": a height of 0 with a time is the height asked
  if (b.h === 0 && (b.t > 0 || b.v > 0) && !/\b(from|on) the ground\b/i.test(text)) delete out.boxes.h;
  // "the splash is HEARD 3 s later; the speed of sound is 340 m/s": that time is the fall and the
  // sound back up together, never the fall alone (the engine splits them)
  const c = /speed of sound[^.?!]*?(\d+(?:\.\d+)?)\s*m|(\d+(?:\.\d+)?)\s*m\s*\/?\s*s(?:\^?-1|⁻¹)?[^.?!]*\bsound\b/i.exec(text);
  if (out.boxes.t > 0 && out.boxes.h == null && /\b(heard|hears|hear)\b/i.test(text) && c) {
    out.boxes.heard = out.boxes.t; out.boxes.cSound = Number(c[1] ?? c[2]);
    delete out.boxes.t;
  }
  // an angle the question gave is kept: the engine then says, in words, that
  // from a well or a balloon it moves only straight up or down
  if ((b.place === 'well' || b.place === 'balloon') && b.u > 0 && b.theta !== 90 && b.theta !== -90 && !x.angleGiven) {
    const up = /\b(up|upwards?|ris(e|es|ing)|ascend(s|ing)?|climb(s|ing)?)\b/i.test(text);
    const down = /\b(down|downwards?|descend(s|ing)?|sink(s|ing)?|fall(s|ing)?)\b/i.test(text);
    out.boxes.theta = b.place === 'balloon' ? (down && !up ? -90 : 90) : (up && !/\bdown\b/i.test(text) ? 90 : -90);
  }
  const given = ['u', 'v', 's', 't', 'tTop'].some((k) => b[k] != null);
  if (!given && LET_GO.test(text) && !SPEED_SAID.test(words)) {
    out.boxes.u = 0;
    out.summary = `${(x.summary || '').trim()} No speed was given, so it starts from rest: change u to try another.`.trim();
  }
  return out;
}

// a question marked in parts: (a), b), (ii), "part b" — the only kind that has parts
const MARKED = /\(\s*(?:[a-h]|i{1,3}|iv|vi{0,3})\s*\)|(?:^|[\s.;:?])(?:[a-h]|i{1,3}|iv)\s*\)|(?:^|\n)\s*(?:[a-h]|i{1,3}|iv)\s*[.:]\s|\bparts?\s+(?:[a-h]|i{1,3}|iv|one|two|three|1|2|3)\b|\b(?:two|three|four|2|3|4)[- ]part\b/i;

/**
 * Parts only when the question has them. A student who types one question
 * ("a person jumping off a 10 m board at 7 m/s") gets the engine's answers
 * plainly, never (a)(b)(c) a reader made up. A photo or a PDF is the paper
 * itself, and the reader is trusted to see its parts there.
 */
function marked(x, words) {
  if (!x || !Array.isArray(x.parts) || !String(words || '').trim() || MARKED.test(words)) return x;
  // what the reader thought were parts are what the question asks, said plainly:
  // their answer keys kept, so the reply still answers each
  const { parts, ...rest } = x;
  const asked = parts.filter((p) => p && typeof p === 'object' && !p.scene && !p.recipe).map((p) => ({ asks: p.asks, answer: p.answer }));
  return asked.length ? { ...rest, asked } : rest;
}

/**
 * A journey in stages, as a small reader writes it. A stage that holds its
 * speed has no end speed of its own: "accelerates to 20 m/s, then travels at
 * 20 m/s" put 20 in the held stage's v, where it is the speed the stage
 * before it ENDS at. And "decelerates to rest" ends at 0.
 */
// a 0 a small reader writes for a number it does not know: a whole distance or time,
// a stage's time, the speed a parachute opens at — none of them can be 0
const NEVER_ZERO = { 'journey-stages': /^(D|T|t\d)$/, 'parachute-stages': /^(D|T|t\d|v1)$/ };
function unzero(x) {
  const re = NEVER_ZERO[x?.library];
  if (!re || !x.boxes) return x;
  const o = Object.fromEntries(Object.entries(x.boxes).filter(([k, v]) => !(re.test(k) && v === 0)));
  return { ...x, boxes: o };
}

function stages(x, words) {
  x = unzero(x);
  const b = x?.boxes;
  if (x?.library !== 'journey-stages' || !b) return x;
  const out = { ...x, boxes: { ...b } }, o = out.boxes;
  // as many stages as it says what they do: "n: 4" with three stages is three
  const said = [1, 2, 3, 4, 5, 6].filter((i) => ['up', 'hold', 'down'].includes(o[`k${i}`]));
  if (said.length && said.length === Math.max(...said) && Number(o.n) > said.length) o.n = said.length;
  // "the distance run by the girl in the first 64 s": the time asked about, in the at.t box
  const list = Array.isArray(out.parts) ? out.parts : Array.isArray(out.asked) ? out.asked : [];
  if (o['at.t'] == null) {
    for (const p of list) {
      const m = /\b(?:first|after|at t ?=)\s*(\d+(?:\.\d+)?)\s*(?:s|secs?|seconds)\b/i.exec(String(p?.asks || ''));
      const at = m ? Number(m[1]) : typeof p?.atTime === 'number' ? p.atTime : null;
      if (at > 0) { o['at.t'] = at; break; }
    }
  }
  // "maintains this speed for T seconds … find the value of T": what the letter is, said beside it
  const LET = { hold: 'the time at constant speed', up: 'the time speeding up', down: 'the time slowing down' };
  for (const p of list) {
    const m = /\bvalue of ([A-Z])\b/.exec(String(p?.asks || ''));
    if (!m || /\(/.test(p.asks)) continue;
    const L = m[1], w = String(words || '');
    const kind = new RegExp(`\\b(maintains|holds|constant speed|steady)[^.]*?\\bfor ${L} (s|seconds)\\b|\\bfor ${L} (s|seconds)[^.]*?\\b(constant speed|steady)`, 'i').test(w) ? 'hold'
      : new RegExp(`\\baccelerat[^.]*?\\bfor ${L} (s|seconds)\\b`, 'i').test(w) ? 'up'
      : new RegExp(`\\bdecelerat[^.]*?\\bfor ${L} (s|seconds)\\b`, 'i').test(w) ? 'down' : null;
    if (kind) p.asks = `${p.asks} (${LET[kind]})`;
  }
  // "runs a 400 m race in a time of 84 s", "takes 120 s to travel between": the whole time
  if (o.T == null) {
    const T = /\bin a (?:total )?time of\s*(\d+(?:\.\d+)?)\s*s\b|\btakes\s*(\d+(?:\.\d+)?)\s*s\s*to (?:travel|go|run|complete)\b|\btotal time (?:of|is|taken is)\s*(\d+(?:\.\d+)?)\s*s\b/i.exec(String(words || ''));
    if (T) o.T = Number(T[1] ?? T[2] ?? T[3]);
  }
  const n = Number(o.n) || 0;
  // a rate the reader left out: the one acceleration in the words no stage has, given
  // to the one stage that changes speed with neither its rate nor its end speed
  const rates = [...new Set([...String(words || '').matchAll(/(\d+(?:\.\d+)?)\s*m\s*\/?\s*s\s*(?:\^?\s*-?\s*2|²|⁻²)/gi)].map((m) => Number(m[1])))];
  const spare = rates.filter((r) => !Array.from({ length: 6 }, (_, j) => o[`a${j + 1}`]).includes(r));
  const open = Array.from({ length: Math.max(n, 1) }, (_, j) => j + 1).filter((i) => ['up', 'down'].includes(o[`k${i}`]) && o[`a${i}`] == null && o[`v${i}`] == null);
  if (spare.length === 1 && open.length === 1) o[`a${open[0]}`] = spare[0];
  for (let i = 1; i <= Math.max(n, 6); i++) {
    // a stage that lasts 0 s is a time the reader did not know ("then runs at that speed"): left to the engine
    if (o[`t${i}`] === 0) delete o[`t${i}`];
    if (o[`k${i}`] !== 'hold' || o[`v${i}`] == null) continue;
    const before = o[`k${i - 1}`];
    if ((before === 'up' || before === 'down') && o[`v${i - 1}`] == null) o[`v${i - 1}`] = o[`v${i}`];
    else if (i === 1 && o.u == null) o.u = o[`v${i}`];
    delete o[`v${i}`];
  }
  const last = n || [1, 2, 3, 4, 5, 6].filter((i) => o[`k${i}`]).pop();
  if (last && o[`k${last}`] === 'down' && o[`v${last}`] == null && /\b(to rest|comes? to rest|stops|halt)\b/i.test(`${words} ${x.summary || ''}`)) o[`v${last}`] = 0;
  return out;
}

// an Edexcel mechanics paper — M1, M2, the IAL units — whose rubric takes g as 9.8
const EDEXCEL = /\bedexcel\b|\bpearson\b|\bIAL\b|\bWME0\d\b|\b66(77|78)\b|\bM[1-3]\b|\bmechanics [1-3]\b/i;

/**
 * g on an Edexcel mechanics paper: the paper's rubric says g = 9.8, not on the
 * question itself, so a reader never sees it there. Known from the paper the
 * reader names, or the student's words; marked so the reply says where it came from.
 */
function edexcel(x, words) {
  if (!x || !x.understood || !EDEXCEL.test(`${words} ${x.paper || ''}`)) return x;
  if (x.scenario === 'library' && x.boxes && typeof x.boxes === 'object') {
    return x.boxes.g == null ? { ...x, boxes: { ...x.boxes, g: 9.8 }, gFrom: 'Edexcel' } : x;
  }
  if (x.scenario === 'compose' && x.recipe?.numbers) {
    return x.recipe.numbers.g == null ? { ...x, recipe: { ...x.recipe, numbers: { ...x.recipe.numbers, g: 9.8 } }, gFrom: 'Edexcel' } : x;
  }
  return x.g == null ? { ...x, g: 9.8, gFrom: 'Edexcel' } : x;
}

/** A bounce asked about up to a height — "first passes B", "from A to B" — runs to there, not to the next impact. */
function bounceTo(x, words) {
  const b = x?.boxes;
  if (x?.library !== 'bounce' || !b || b.y == null || b.stop != null) return x;
  const asked = `${words} ${(x.parts || []).map((p) => p?.asks || '').join(' ')}`;
  return /\bfirst pass|\bto B\b|\breaches B\b|\bpasses B\b|\bat B\b/i.test(asked) ? { ...x, boxes: { ...b, stop: 'y' } } : x;
}

/**
 * Two on a road: one braking, with nothing said of where its braking ends, brakes
 * to rest — a car stops; it never reverses. "Brakes at 2 m/s²" is A.a = −2, A.V = 0.
 */
function lanes(x, words = '') {
  const b = x?.boxes;
  if (x?.library !== 'two-on-a-road' || !b) return x;
  const o = { ...b };
  for (const w of ['A', 'B']) {
    // "10 s later train Q passes … at a constant 20 m/s": a hold is yes or no; the 10 s is when it sets off
    if (typeof o[`${w}.hold`] === 'number') {
      const n = o[`${w}.hold`];
      if (o[`${w}.t0`] == null && new RegExp(`\\b${n}\\s*(s|secs?|seconds)\\s+(later|after)\\b`, 'i').test(words)) o[`${w}.t0`] = n;
      o[`${w}.hold`] = true;
    }
    if (typeof o[`${w}.a`] === 'number' && o[`${w}.a`] < 0 && o[`${w}.V`] == null && o[`${w}.tau`] == null && o[`${w}.ends`] == null) o[`${w}.V`] = 0;
  }
  return { ...x, boxes: o };
}

export function toPlace(x, words = '') {
  return edexcel(lanes(bounceTo(stages(settle(placed(levelled(hooped(cleared(lowered(reacts(atTimed(timed(twoMarks(nthSecond(known(marked(x, words)), words), words), words), words), words), words), words), words), words), words), words), words), words), words), words);
}

/**
 * A scenario that is none of the reader's own — a small reader may write a
 * library id there ("freewheeling"). Three of the five along a line are the
 * road, which works them; a library id with nothing it can use is that
 * library scenario, its numbers as boxes, for the values screen to ask the rest.
 */
const FIVE_KEYS = ['u', 'v', 'a', 's', 't'];
/** "with speed u m s⁻¹ … show that u = 21": a letter is the number asked for, never a value — left out. */
const LETTER = (v) => typeof v === 'string' && /^\s*[A-Za-z]\s*$/.test(v);
function unlettered(x) {
  if (!x || typeof x !== 'object') return x;
  const clean = (o) => (o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k, v]) => !(LETTER(v) && !/kind|fig|place|start|mode|look|axis|find|pick|from|where|who/.test(k)))) : o);
  let y = x;
  for (const k of ['u', 'v', 'a', 's', 't', 'h', 'g']) if (LETTER(y[k])) { y = { ...y }; delete y[k]; }
  if (y.boxes) y = { ...y, boxes: clean(y.boxes) };
  if (y.recipe?.numbers) y = { ...y, recipe: { ...y.recipe, numbers: clean(y.recipe.numbers) } };
  return y;
}
function known(x) {
  x = unlettered(x);
  if (!x?.understood || !x.scenario || SCENARIO_IDS.includes(x.scenario)) return x;
  const nums = Object.fromEntries(FIVE_KEYS.filter((k) => typeof x[k] === 'number' && isFinite(x[k])).map((k) => [k, x[k]]));
  if (Object.keys(nums).length >= 3) {
    const { library, boxes, ...rest } = x;
    return { ...rest, scenario: 'road' };
  }
  if (LIBRARY_IDS.includes(x.scenario)) return { ...x, scenario: 'library', library: x.scenario, boxes: { ...nums, ...(x.boxes || {}) } };
  return x;
}

/**
 * A driver who reacts first, then brakes: "reacts after 0.6 s and then brakes
 * at 6 m/s²" is two stages, a steady one and a braking one, not one road. A
 * Journey in stages, braking to rest, timed at the distance the question names
 * ("a red light 50 m ahead"): its speed there says whether it stops in time.
 */
const REACTS = /\breact(s|ed|ing|ion)?\b|\bthinking (time|distance)\b/i;
function reacts(x, words) {
  if (x?.scenario !== 'road' || !REACTS.test(words) || !(x.u > 0) || !(typeof x.a === 'number' && x.a !== 0)) return x;
  const times = [...new Set([...String(words).matchAll(/(\d+(?:\.\d+)?)\s*(?:s|secs?|seconds)\b(?!\s*[²2^-])/gi)].map((m) => Number(m[1])))];
  if (times.length !== 1 || !(times[0] > 0)) return x;
  const boxes = { n: 2, u: x.u, k1: 'hold', t1: times[0], k2: 'down', a2: Math.abs(x.a), v2: 0 };
  if (x.s > 0) boxes['at.s'] = x.s;
  const out = { understood: true, confidence: x.confidence || 'high', scenario: 'library', library: 'journey-stages', summary: x.summary, boxes };
  for (const k of ['who', 'asks', 'asked', 'parts']) if (x[k] != null) out[k] = x[k];
  return out;
}

/**
 * "The landing platform is 2 m lower": a launch from 2 m above where it lands,
 * which a reader may give no height at all.
 */
const LOWER = /(\d+(?:\.\d+)?)\s*m\s*(?:lower|below where it|below the (?:ramp|launch|start))\b/i;
function lowered(x, words) {
  const m = LOWER.exec(String(words || ''));
  if (!m || !(Number(m[1]) > 0)) return x;
  const h = Number(m[1]);
  const n = x?.scenario === 'compose' && (!x.recipe?.engine || x.recipe.engine === 'projectile') && x.recipe?.numbers;
  if (n && !(Number(n.h) > 0)) return { ...x, recipe: { ...x.recipe, numbers: { ...n, h } } };
  if (x?.scenario === 'arc' && x.angleDegrees != null) return { ...x, scenario: 'platform-angle', h };
  return x;
}

/**
 * A time the reader left out of a straight-line motion: "accelerates at
 * 1.5 m/s² for 6 s" came back with u and a alone, and two of the five run
 * nothing. One time in the words, and none in the reading, is that time.
 */
function timed(x, words) {
  if (x?.scenario !== 'road' || x.t != null) return x;
  const n = ['u', 'v', 'a', 's'].filter((k) => typeof x[k] === 'number' && isFinite(x[k])).length;
  if (n >= 3) return x;
  const all = [...String(words || '').matchAll(/(\d+(?:\.\d+)?)\s*(?:s|secs?|seconds)\b(?!\s*[²2^-])/gi)].map((m) => Number(m[1]));
  const t = [...new Set(all)];
  return t.length === 1 && t[0] > 0 ? { ...x, t: t[0] } : x;
}

/**
 * "It travels 50 m during the fifth second": the distance in one second, never
 * 50 m in 5 s. A small reader writes s = 50 and t = 5; they become
 * nthSecond and sInSecond, for the road to work u + a(n − ½).
 */
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
function nthSecond(x, words) {
  if (x?.scenario !== 'road' || x.nthSecond != null) return x;
  const m = /\b(?:during|in) the (\d+)(?:st|nd|rd|th)? second\b|\b(?:during|in) the (first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth) second\b/i.exec(String(words || ''));
  if (!m) return x;
  const n = m[1] ? Number(m[1]) : ORD[m[2].toLowerCase()];
  if (!(n >= 1) || !(typeof x.s === 'number')) return x;
  const { s, t, ...rest } = x;
  return { ...rest, nthSecond: n, sInSecond: s };
}

/**
 * "From rest … passes two flags 25 m apart, the first at 5 m/s and the second at 10 m/s":
 * the five are the stretch between the flags; that it started from rest earlier is `fromRest`,
 * for the road to find how far back that was. A small reader puts the 5 m/s as the end speed.
 */
function twoMarks(x, words) {
  if (x?.scenario !== 'road') return x;
  const w = String(words || '');
  const gap = /(\d+(?:\.\d+)?)\s*m\s+apart\b/i.exec(w);
  const v1 = /\bfirst\b[^.?!]*?(\d+(?:\.\d+)?)\s*m\s*\/?\s*s\b/i.exec(w);
  const v2 = /\bsecond\b(?!s)[^.?!]*?(\d+(?:\.\d+)?)\s*m\s*\/?\s*s\b/i.exec(w);
  if (!gap || !v1 || !v2) return x;
  const { a, t, atDisplacement, atMidpoint, ...rest } = x;
  return { ...rest, u: Number(v1[1]), v: Number(v2[1]), s: Number(gap[1]), ...(/\bfrom rest\b/i.test(w) ? { fromRest: true } : {}) };
}

/**
 * "Its distance from O 6 s after passing O", where the motion's own t is 4 s:
 * a time the question asks about, as `atTime`. One time in the words that is
 * not t, said as "after" or "at t =", is that time.
 */
function atTimed(x, words) {
  if (x?.scenario !== 'road' || x.atTime != null || x.atDisplacement != null || x.atMidpoint) return x;
  if (!/\bafter\b|\bat t ?=|\bat time\b/i.test(words)) return x;
  const all = [...String(words || '').matchAll(/(\d+(?:\.\d+)?)\s*(?:s|secs?|seconds)\b(?!\s*[²2^-])/gi)].map((m) => Number(m[1]));
  const other = [...new Set(all)].filter((t) => t > 0 && t !== x.t);
  return other.length === 1 && x.t != null ? { ...x, atTime: other[0] } : x;
}

/**
 * "Does it clear the net?" — a projectile with a wall, a fence, a net or a
 * tree it has to pass, its height and how far away it is in the question:
 * the target scenario, which says whether it clears and by how much. A
 * reader that composed it, or read it as one of the twelve, lost the net.
 */
const OBSTACLE = /\b(net|wall|fence|hedge|tree)\b/i;
const NUM = '(\\d+(?:\\.\\d+)?)';
const HITS = /\b(hits?|strikes?|reach(es)?)\b[^.?!]*\b(wall|fence)\b/i;
// what a projectile passes, in a reader's own words, as Over the wall's: a crossbar or a goal it
// should go UNDER is a point to pass, not a wall it hits
const KINDS = { crossbar: 'point', bar: 'point', goal: 'point', hoop: 'point', basket: 'point', hedge: 'fence', building: 'wall' };
function cleared(x, words) {
  if (x?.library === 'over-the-wall' && x.boxes && KINDS[String(x.boxes.kind).toLowerCase()]) {
    return { ...x, boxes: { ...x.boxes, kind: KINDS[String(x.boxes.kind).toLowerCase()] } };
  }
  // "a wall 20 m away … the height at which it hits the wall": a wall it hits, with no height of its own
  const hits = HITS.test(words);
  if (!x?.understood || x.library === 'over-the-wall' || !(/\b(clears?|over|passes)\b/i.test(words) || hits)) return x;
  const clause = String(words).split(/[.;?!](?!\d)/).find((c) => OBSTACLE.test(c));
  if (!clause) return x;
  const H = new RegExp(`${NUM}\\s*m\\s*(?:high|tall)\\b|${NUM}\\s*m(?:-|\\s+)(?:high\\s+)?(?:net|wall|fence|hedge|tree)\\b`, 'i').exec(clause);
  const d = new RegExp(`${NUM}\\s*m\\s*(?:away|from|in front|horizontally|beyond)\\b|distance of\\s*${NUM}\\s*m\\b`, 'i').exec(clause);
  if (!d || (!H && !hits)) return x;
  // the launch, as the reader had it
  let h0, u, theta;
  if (x.scenario === 'compose' && (!x.recipe?.engine || x.recipe.engine === 'projectile')) {
    const n = x.recipe?.numbers || {};
    ({ h: h0, u, theta } = n);
  } else if (x.scenario === 'library' && x.library === 'from-a-height' && x.boxes) {
    ({ h: h0, u, theta } = x.boxes);
  } else if (x.scenario === 'arc' || x.scenario in ANGLE) {
    h0 = x.scenario === 'arc' ? 0 : x.h;
    u = x.u;
    theta = x.scenario === 'arc' ? x.angleDegrees : ANGLE[x.scenario](x);
  } else return x;
  if (!(Number(u) > 0) || theta == null || !isFinite(Number(theta))) return x;
  const kind = H ? OBSTACLE.exec(clause)[1].toLowerCase().replace('hedge', 'fence') : 'face';
  const boxes = { u: Number(u), theta: Number(theta), d: Number(d[1] ?? d[2]), kind };
  if (H) boxes.H = Number(H[1] ?? H[2]);
  if (Number(h0) > 0) boxes.h0 = Number(h0);
  if (typeof x.g === 'number' && x.g > 0) boxes.g = x.g;
  const out = { understood: true, confidence: x.confidence || 'high', scenario: 'library', library: 'over-the-wall', summary: x.summary, boxes };
  if (x.who) out.who = x.who;
  // what it asks stays in words, its key dropped — the twelve's "top" is not the height at the wall,
  // and "does it clear" is the engine's own line; a question marked in parts keeps them
  const plain = (list) => list.filter((p) => p && typeof p === 'object').map(({ answer, twelve, scene, ...rest }) => rest);
  if (Array.isArray(x.parts)) out.parts = plain(x.parts);
  else if (Array.isArray(x.asked)) out.asked = plain(x.asked);
  else if (Array.isArray(x.asks)) out.asks = x.asks;
  return out;
}

/**
 * "(b) the horizontal distance when it is 5 m above the ground on its way down"
 * — a part a reader gave a set-up of its own with only a level in it is the
 * same flight, asked about at a height: From a height on level ground, with
 * that height above the throw as its `level`. A ratio angle is turned into degrees.
 */
const RATIO = { tan: Math.atan, sin: Math.asin, cos: Math.acos };
function levelled(x, words) {
  const parts = Array.isArray(x?.parts) ? x.parts : null;
  // a question with no parts marked asks the same ("time at least 28 m above the ground")
  if (!parts && Array.isArray(x?.asked) && x.understood) {
    const y = levelled({ ...x, parts: x.asked, asked: undefined }, words);
    if (y === x || !y.parts) return x;
    const { parts: asked, ...rest } = y;
    return { ...rest, asked };
  }
  if (!parts || !x.understood) return x;
  const levelOf = (sc) => (sc && typeof sc === 'object' ? sc.level ?? sc.numbers?.level ?? sc.boxes?.level : undefined);
  const only = (sc) => sc && typeof sc === 'object' && Object.keys(sc).every((k) => k === 'level' || ((k === 'numbers' || k === 'boxes') && Object.keys(sc[k] || {}).every((j) => j === 'level')));
  const i = parts.findIndex((p) => p && only(p.scene) && Number(levelOf(p.scene)) > 0);
  if (i < 0) {
    // From a height already, a part "at least 28 m above the ground" with no set-up: that height is its level
    const b = x.library === 'from-a-height' && x.boxes;
    const j = b && b.level == null ? parts.findIndex((p) => /\b\d+(?:\.\d+)?\s*m\s*above\b/i.test(String(p?.asks || ''))) : -1;
    if (j < 0) return x;
    const ask = String(parts[j].asks), N = Number(/(\d+(?:\.\d+)?)\s*m\s*above/i.exec(ask)[1]);
    const level = /above (the )?(ground|floor|sea|water)/i.test(ask) ? N - (Number(b.h) || 0) : N;
    if (Math.abs(level) < 1e-9) return x;
    return { ...x, boxes: { ...b, level }, parts: parts.map((p, k) => (k === j ? (({ answer, twelve, ...rest }) => rest)(p) : p)) };
  }
  let h0, u, theta;
  if (x.scenario === 'arc' || x.scenario in ANGLE) {
    h0 = x.scenario === 'arc' ? 0 : x.h;
    u = x.u;
    theta = x.ratioFn && RATIO[x.ratioFn] && x.ratioDen ? RATIO[x.ratioFn](x.ratioNum / x.ratioDen) * 180 / Math.PI
      : x.scenario === 'arc' ? x.angleDegrees : ANGLE[x.scenario](x);
  } else if (x.scenario === 'compose' && x.recipe?.numbers) ({ h: h0, u, theta } = x.recipe.numbers);
  else return x;
  if (!(Number(u) > 0) || theta == null || !isFinite(Number(theta))) return x;
  const N = Number(levelOf(parts[i].scene)), ask = String(parts[i].asks || '');
  // a height "above the ground" is above the throw only from the ground
  const level = /above (the )?(ground|floor)/i.test(`${ask} ${words}`) ? N - (Number(h0) || 0) : N;
  const boxes = { place: 'ground', h: Number(h0) || 0, u: Number(u), theta: Math.round(Number(theta) * 1e6) / 1e6, level };
  if (typeof x.g === 'number' && x.g > 0) boxes.g = x.g;
  const out = { understood: true, confidence: x.confidence || 'high', scenario: 'library', library: 'from-a-height', summary: x.summary, boxes };
  if (x.who) out.who = x.who;
  // the level part's answer is found from its words; the others keep theirs, as the twelve's
  out.parts = parts.map((p, j) => {
    if (!p || typeof p !== 'object') return p;
    const { scene, answer, ...rest } = p;
    if (j === i) return rest;
    return answer != null ? { ...rest, twelve: answer } : rest;
  });
  return out;
}

/**
 * "Goes through a hoop 3.05 m high: how far away is the hoop" — a projectile
 * and a height it passes, the distance to it asked: From a height on level
 * ground, with that height above the throw as its `level`. The engine gives
 * the times it is there and how far out, the last on its way down.
 */
const HOOP = /\b(hoop|basket|ring|target|bull'?s-?eye)\b/i;
function hooped(x, words) {
  if (!x?.understood || !HOOP.test(words) || !/\bhow far\b|\bdistance\b/i.test(words)) return x;
  const H = new RegExp(`${NUM}\\s*m\\s*(?:high|above the (?:ground|floor))\\b`, 'i').exec(words);
  if (!H) return x;
  let h0, u, theta;
  if (x.scenario === 'arc' || x.scenario in ANGLE) {
    h0 = x.scenario === 'arc' ? 0 : x.h;
    u = x.u;
    theta = x.scenario === 'arc' ? x.angleDegrees : ANGLE[x.scenario](x);
  } else if (x.scenario === 'compose' && x.recipe?.numbers && !(x.recipe.numbers.level != null)) {
    ({ h: h0, u, theta } = x.recipe.numbers);
  } else return x;
  const level = Number(H[1]) - (Number(h0) || 0);
  if (!(Number(u) > 0) || theta == null || Math.abs(level) < 1e-9 || Number(H[1]) === Number(h0)) return x;
  const boxes = { place: 'ground', h: Number(h0) || 0, u: Number(u), theta: Number(theta), level: Math.round(level * 1e6) / 1e6 };
  if (typeof x.g === 'number' && x.g > 0) boxes.g = x.g;
  const out = { understood: true, confidence: x.confidence || 'high', scenario: 'library', library: 'from-a-height', summary: x.summary, boxes };
  for (const k of ['who', 'asks', 'asked', 'parts']) if (x[k] != null) out[k] = x[k];
  return out;
}

function placed(x, words) {
  const moved = x && fromRecipe(x, words);
  if (moved) return moved;
  x = jumpUp(x, words);
  // read as from-a-height already: only the twelve's answer names to put right
  if (x?.library === 'from-a-height' && Array.isArray(x.parts)) return { ...x, parts: renamed(x.parts) };
  if (!x || !x.understood || !(x.scenario in ANGLE) || x.ratioFn) return x;
  const text = `${words} ${x.summary || ''}`;
  const hit = PLACES.find(([re]) => re.test(text));
  // a height left out is asked for on the values screen, at the place itself
  if (!hit || (x.h != null && !(x.h > 0))) return x;
  const theta = ANGLE[x.scenario](x);
  if (theta == null) return x;
  const boxes = { place: hit[1], h: x.h, theta };
  if (x.scenario === 'dropped') boxes.u = 0;
  for (const k of ['u', 's', 'v', 't', 'g']) if (typeof x[k] === 'number' && isFinite(x[k])) boxes[k] = x[k];
  if (x.scenario === 'down' || x.scenario === 'dropped') delete boxes.s;
  const out = { understood: true, confidence: x.confidence, scenario: 'library', library: 'from-a-height',
    summary: x.summary, boxes };
  // what moves, and what was assumed about it, go along with it (composeplace.js)
  if (x.who) out.who = x.who;
  if (x.assumed) out.assumed = x.assumed;
  if (x.below) out.below = x.below;
  if (x.angleDegrees != null) out.angleGiven = true;
  if (Array.isArray(x.parts)) out.parts = renamed(x.parts);
  // what a question with no parts asks goes with it, for the reply to answer
  if (Array.isArray(x.asked)) out.asked = renamed(x.asked);
  if (Array.isArray(x.asks)) out.asks = x.asks;
  return out;
}
