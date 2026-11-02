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

// the composer's own backdrops, read from its generated guide ("  cliff — …")
const BACKDROPS = new Set([...COMPOSE_GUIDE.split('figures')[0].matchAll(/^ {2}([a-z-]+) —/gm)].map((m) => m[1]));
// places only From a height draws, by the words a reader might use for them
const HEIGHT_ONLY = { board: 'board', 'diving board': 'board', springboard: 'board', diving: 'board',
  well: 'well', shaft: 'well', balloon: 'balloon', 'hot-air balloon': 'balloon' };

const PLACES = [
  [/\bcliff/i, 'cliff'], [/\b(tower|building|skyscraper|roof|block of flats)/i, 'tower'],
  [/\bbridge/i, 'bridge'], [/\b(well|mine ?shaft|shaft)\b/i, 'well'],
  [/\b(diving board|springboard|high board|(diving|high) platform)\b/i, 'board'], [/\b(hot.air )?balloon/i, 'balloon'],
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
function settle(x, words) {
  const b = x?.boxes;
  if (x?.library !== 'from-a-height' || !b) return x;
  const text = `${words} ${x.summary || ''}`;
  const out = { ...x, boxes: { ...b } };
  if ((b.place === 'well' || b.place === 'balloon') && b.u > 0 && b.theta !== 90 && b.theta !== -90) {
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
  const { parts, ...rest } = x;
  return rest;
}

/**
 * A journey in stages, as a small reader writes it. A stage that holds its
 * speed has no end speed of its own: "accelerates to 20 m/s, then travels at
 * 20 m/s" put 20 in the held stage's v, where it is the speed the stage
 * before it ENDS at. And "decelerates to rest" ends at 0.
 */
function stages(x, words) {
  const b = x?.boxes;
  if (x?.library !== 'journey-stages' || !b) return x;
  const out = { ...x, boxes: { ...b } }, o = out.boxes;
  const n = Number(o.n) || 0;
  for (let i = 1; i <= Math.max(n, 6); i++) {
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

export function toPlace(x, words = '') {
  return stages(settle(placed(marked(x, words), words), words), words);
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
  if (Array.isArray(x.parts)) out.parts = renamed(x.parts);
  return out;
}
