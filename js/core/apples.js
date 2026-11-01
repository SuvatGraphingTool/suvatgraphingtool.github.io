// apples.js — two apples hanging at rest from different branches of one tree
// begin to fall freely at the same instant; the paper gives when each hits
// the ground (or how high one hangs), and asks how far apart they hung.
// (AQA 7357/2 Jun 2024 Q16.)
//
// NO NEW PHYSICS. Each falls from rest with a = g: s = ½gt² gives its height
// from its time (or its time from its height, t = √(2h/g)), and v = gt how fast
// it lands. The vertical distance between them is the difference of the two
// heights. Each, once down, stays on the ground.
//
// CONVENTION. Heights up from the ground; t from the instant both let go.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });

/**
 * @param k { A: { t, h }, B: { t, h }, later, g }
 *   A, B   each apple: the time it takes to hit the ground, or its height
 *   later  B lands this much after A (in place of B's own time)
 */
export function solveApples(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  if (!(g > 0)) return fail('They fall because of gravity: give g as a size, such as 9.8.');
  const A = { ...(k.A || {}) }, B = { ...(k.B || {}) };
  if (have(k.later)) {
    if (!(k.later >= 0)) return fail('“Later” is how long after the first apple the second lands: give it as 0 or more. If the second lands first, give each apple its own time.');
    if (have(B.t) || have(B.h)) return fail('Give how much later the second lands, or its own time or height, not both.');
    if (!have(A.t)) return fail('“Later” is counted from when the first apple lands: give the first apple’s time to the ground.');
    B.t = A.t + k.later;
  }
  const rows = [], notes = [];
  for (const [n, P] of [['first', A], ['second', B]]) {
    if (have(P.t) && have(P.h)) return fail(`Give the ${n} apple’s time to the ground or its height, not both: one fixes the other.`);
    if (!have(P.t) && !have(P.h)) return fail(`Still needed: the ${n} apple’s time to the ground, or how high it hangs.`);
    if (have(P.t) && !(P.t > 0)) return fail(`The ${n} apple’s time to the ground is a positive number of seconds.`);
    if (have(P.h) && !(P.h > 0)) return fail(`The ${n} apple hangs above the ground: give its height as a positive number.`);
    const s = n === 'first' ? '1' : '2';
    if (have(P.t)) {
      P.h = snap(0.5 * g * P.t * P.t);
      rows.push({ f: M`s = ut + ½at^2`, s: M`s_${s} = 0 + ½ * ${d3(g)} * ${d3(P.t)}^2`, r: M`s_${s} = ${d3(P.h)} [m]` });
    } else {
      P.t = snap(Math.sqrt(2 * P.h / g));
      rows.push({ f: M`s = ut + ½at^2`, s: M`${d3(P.h)} = 0 + ½ * ${d3(g)}t_${s}^2`, r: M`t_${s} = ${d3(P.t)} [s]` });
    }
    P.v = snap(g * P.t);
  }
  const dist = snap(Math.abs(B.h - A.h)), dCm = snap(dist * 100);
  rows.push(B.h >= A.h ? { f: M`d = s_2 - s_1`, s: M`${d3(B.h)} - ${d3(A.h)}`, r: M`d = ${d3(dist)} [m] = ${d3(dCm)} [cm]` }
    : { f: M`d = s_1 - s_2`, s: M`${d3(A.h)} - ${d3(B.h)}`, r: M`d = ${d3(dist)} [m] = ${d3(dCm)} [cm]` });
  if (dist < 1e-9) notes.push('They hang at the same height, so they land together: there is no distance between them.');
  else notes.push(`The ${B.h > A.h ? 'second' : 'first'} apple hangs ${M`${d3(dist)} [m]`} higher, ${d3(dCm)} cm, and lands ${M`${d3(Math.abs(B.t - A.t))} [s]`} ${B.h > A.h ? 'after' : 'before'} the other.`);
  notes.push(`They land at ${M`${d3(A.v)} [m s^-1]`} and ${M`${d3(B.v)} [m s^-1]`}: each from rest, ${M`v = gt`}.`);
  if (dist > 1e-9) notes.push(`Falling together from rest, they have the same velocity at every instant, so the gap between them stays ${M`${d3(dist)} [m]`} all the way down — until the lower one lands.`);
  const tMax = Math.max(A.t, B.t);
  const one = (P) => ({
    pos: (t) => (t >= P.t ? 0 : P.h - 0.5 * g * t * t),
    // at the instant it lands it still has its impact velocity; after, none
    vel: (t) => (t > P.t + 1e-9 || t < 0 ? 0 : -g * Math.min(t, P.t)),
  });
  const a = one(A), b = one(B), hiP = B.h >= A.h ? b : a;
  const f = { kind: 'apples', g, A, B, d: dist, dCm, tMax,
    posA: a.pos, posB: b.pos, velA: a.vel, velB: b.vel,
    accA: (t) => (t < A.t ? -g : 0), accB: (t) => (t < B.t ? -g : 0),
    /** the vertical distance between them now: d until the lower lands, then the higher one's height */
    gap: (t) => Math.abs(b.pos(t) - a.pos(t)),
    // for the transport and the app's shared readers: the higher apple's fall
    pos: (t) => ({ x: 0, y: hiP.pos(t) }), vel: (t) => ({ x: 0, y: hiP.vel(t) }), acc: () => -g,
    params: { u: 0, theta: -90, h: Math.max(A.h, B.h), g } };
  const derived = [`${M`d = ${d3(dist)} [m]`}`];
  return { ok: true, mode: 'apples', A, B, d: dist, dCm, rows, notes, derived, f };
}

/** The working: each apple's fall, then the distance between them. */
export function applesWorking(s) {
  if (!s?.ok) return [];
  return [{ title: 'Each apple’s fall, and the distance between them', rows: s.rows,
    note: `Each starts from rest, so ${M`u = 0`}, and falls with ${M`a = g`}: down positive, ${M`s`} is how far it falls, which is how high it hung.` }];
}
