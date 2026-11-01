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
  [/\b(diving board|springboard|high board)\b/i, 'board'], [/\b(hot.air )?balloon/i, 'balloon'],
];
// the twelve's answer keys, as from-a-height names the same answer
const ANSWER = { top: 'height', flight: 'time', vLand: 'speed', time: 'time', speed: 'speed', height: 'height' };
// each of the twelve's height scenarios, as an angle
const ANGLE = { dropped: () => 0, down: () => -90, platform: () => 0,
  'platform-angle': (x) => x.angleDegrees, 'platform-down': (x) => (x.angleDegrees == null ? null : -Math.abs(x.angleDegrees)),
  up: () => 90 };

const renamed = (parts) => parts.map((p) => {
  const q = { ...p };
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
  const text = `${words} ${x.summary || ''}`;
  if (!JUMP.test(text) || ANGLE_GIVEN.test(words)) return x;
  if (b.theta === 90 && /straight up/.test(x.summary || '')) return x;
  return { ...x, boxes: { ...b, theta: 90 },
    summary: `${(x.summary || '').trim()} No angle was given, so the jump is taken as straight up: change θ to try another.`.trim() };
}

export function toPlace(x, words = '') {
  const moved = x && fromRecipe(x, words);
  if (moved) return moved;
  x = jumpUp(x, words);
  // read as from-a-height already: only the twelve's answer names to put right
  if (x?.library === 'from-a-height' && Array.isArray(x.parts)) return { ...x, parts: renamed(x.parts) };
  if (!x || !x.understood || !(x.scenario in ANGLE) || x.ratioFn) return x;
  const text = `${words} ${x.summary || ''}`;
  const hit = PLACES.find(([re]) => re.test(text));
  if (!hit || !(x.h > 0)) return x;
  const theta = ANGLE[x.scenario](x);
  if (theta == null) return x;
  const boxes = { place: hit[1], h: x.h, theta };
  if (x.scenario === 'dropped') boxes.u = 0;
  for (const k of ['u', 's', 'v', 't', 'g']) if (typeof x[k] === 'number' && isFinite(x[k])) boxes[k] = x[k];
  if (x.scenario === 'down' || x.scenario === 'dropped') delete boxes.s;
  const out = { understood: true, confidence: x.confidence, scenario: 'library', library: 'from-a-height',
    summary: x.summary, boxes };
  if (Array.isArray(x.parts)) out.parts = renamed(x.parts);
  return out;
}
