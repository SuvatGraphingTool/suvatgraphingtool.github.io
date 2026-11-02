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
  // a well as a place ("down a 20 m well", "the well is 30 m deep"), never "as well as"
  [/\bbridge/i, 'bridge'], [/\b(a|the|down|into|of)\s+(\d+(\.\d+)?\s?m\s+)?(deep\s+)?well\b|\bwell\s+(is|\d)|\bmine ?shaft\b/i, 'well'],
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
  // composed, let go from what carries it: a balloon moves straight up or down, and a
  // speed read as negative ("descending at 3 m/s" as u = −3) is a speed downwards
  const n = x?.scenario === 'compose' && x.recipe?.numbers;
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
function stages(x, words) {
  const b = x?.boxes;
  if (x?.library !== 'journey-stages' || !b) return x;
  const out = { ...x, boxes: { ...b } }, o = out.boxes;
  const n = Number(o.n) || 0;
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
function lanes(x) {
  const b = x?.boxes;
  if (x?.library !== 'two-on-a-road' || !b) return x;
  const o = { ...b };
  for (const w of ['A', 'B']) {
    if (typeof o[`${w}.a`] === 'number' && o[`${w}.a`] < 0 && o[`${w}.V`] == null && o[`${w}.tau`] == null && o[`${w}.ends`] == null) o[`${w}.V`] = 0;
  }
  return { ...x, boxes: o };
}

export function toPlace(x, words = '') {
  return edexcel(lanes(bounceTo(stages(settle(placed(cleared(timed(marked(x, words), words), words), words), words), words), words)), words);
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
 * "Does it clear the net?" — a projectile with a wall, a fence, a net or a
 * tree it has to pass, its height and how far away it is in the question:
 * the target scenario, which says whether it clears and by how much. A
 * reader that composed it, or read it as one of the twelve, lost the net.
 */
const OBSTACLE = /\b(net|wall|fence|hedge|tree)\b/i;
const NUM = '(\\d+(?:\\.\\d+)?)';
function cleared(x, words) {
  if (!x?.understood || x.library === 'over-the-wall' || !/\b(clears?|over|passes)\b/i.test(words)) return x;
  const clause = String(words).split(/[.;?!](?!\d)/).find((c) => OBSTACLE.test(c));
  if (!clause) return x;
  const H = new RegExp(`${NUM}\\s*m\\s*(?:high|tall)\\b|${NUM}\\s*m(?:-|\\s+)(?:high\\s+)?(?:net|wall|fence|hedge|tree)\\b`, 'i').exec(clause);
  const d = new RegExp(`${NUM}\\s*m\\s*(?:away|from|in front|horizontally|beyond)\\b|distance of\\s*${NUM}\\s*m\\b`, 'i').exec(clause);
  if (!H || !d) return x;
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
  const kind = OBSTACLE.exec(clause)[1].toLowerCase().replace('hedge', 'fence');
  const boxes = { u: Number(u), theta: Number(theta), d: Number(d[1] ?? d[2]), H: Number(H[1] ?? H[2]), kind };
  if (Number(h0) > 0) boxes.h0 = Number(h0);
  if (typeof x.g === 'number' && x.g > 0) boxes.g = x.g;
  const out = { understood: true, confidence: x.confidence || 'high', scenario: 'library', library: 'over-the-wall', summary: x.summary, boxes };
  if (x.who) out.who = x.who;
  // what it asks stays in words: "does it clear" is the engine's own line, not a height
  const asked = (x.asked || x.parts || []).filter((p) => p && typeof p === 'object').map((p) => ({ asks: p.asks }));
  if (asked.length) out.asked = asked;
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
  return out;
}
