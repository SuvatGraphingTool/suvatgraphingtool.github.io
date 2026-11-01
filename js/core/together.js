// together.js — two stones from the same height: the first let go from rest,
// the second thrown straight down a moment later; both hit the ground at the
// same instant. How high were they, and when do they land? (Edexcel IAL WME01
// Jun 2015 Q4.) Or, given the height, how fast must the second be thrown?
//
// NO NEW PHYSICS. Down positive, each is s = ut + ½at² with a = g, the first
// for T seconds from rest, the second for T − d seconds from U. Both fall the
// same height h: ½gT² = U(T − d) + ½g(T − d)². The T² terms cancel, leaving
// one linear equation: T(U − gd) = Ud − ½gd². The second can only catch the
// first by the ground if it is thrown faster than the first is falling when
// it sets off: U > gd.
//
// CONVENTION. Heights up from the ground; t from the first stone's release.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });

/**
 * @param k { d, U, h, g }
 *   d   how long after the first the second is thrown (s)
 *   U   the speed the second is thrown straight down with (m s⁻¹) — or, in its place,
 *   h   the height both start from (m)
 */
export function solveTogether(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  if (!(g > 0)) return fail('They fall because of gravity: give g as a size, such as 9.8.');
  if (!have(k.d)) return fail('Still needed: how long after the first the second stone is thrown.');
  if (!(k.d > 0)) return fail('The second is thrown after the first: give the delay as a positive number of seconds.');
  if (have(k.U) && have(k.h)) return fail('Give the second stone’s speed or the height, not both: one fixes the other.');
  if (!have(k.U) && !have(k.h)) return fail('Still needed: the speed the second stone is thrown down with, or the height they start from.');
  const d = k.d, rows = [];
  let U, h, T;
  if (have(k.U)) {
    U = k.U;
    if (!(U > 0)) return fail('The second stone is thrown down: give its speed as a positive number.');
    if (!(U > g * d + 1e-9)) return fail(`When the second is thrown, the first is already falling at ${M`${d3(snap(g * d))} [m s^-1]`}: thrown at no more than that, the second never catches it up, so they cannot land together. Give a faster throw.`);
    T = snap((U * d - 0.5 * g * d * d) / (U - g * d));
    h = snap(0.5 * g * T * T);
    rows.push({ f: M`s = ut + ½at^2`, s: M`h = ½ * ${d3(g)}T^2`, r: M`"the first"` });
    rows.push({ f: M`s = ut + ½at^2`, s: M`h = ${d3(U)}(T - ${d3(d)}) + ½ * ${d3(g)}(T - ${d3(d)})^2`, r: M`"the second"` });
    rows.push({ f: M`½gT^2 = U(T - d) + ½g(T - d)^2`, s: M`0 = ${d3(snap(U - g * d))}T - ${d3(snap(U * d - 0.5 * g * d * d))}`, r: M`T = ${d3(T)} [s]` });
    rows.push({ f: M`h = ½gT^2`, s: M`½ * ${d3(g)} * ${d3(T)}^2`, r: M`h = ${d3(h)} [m]` });
  } else {
    h = k.h;
    if (!(h > 0)) return fail('They start above the ground: give the height as a positive number.');
    T = snap(Math.sqrt(2 * h / g));
    if (!(T > d + 1e-9)) return fail(`From ${M`${d3(h)} [m]`} the first lands after ${M`${d3(T)} [s]`}, no later than the moment the second is thrown: they cannot land together.`);
    const tb = snap(T - d);
    U = snap((h - 0.5 * g * tb * tb) / tb);
    rows.push({ f: M`s = ut + ½at^2`, s: M`${d3(h)} = ½ * ${d3(g)}T^2`, r: M`T = ${d3(T)} [s]` });
    rows.push({ f: M`s = ut + ½at^2`, s: M`${d3(h)} = U * ${d3(tb)} + ½ * ${d3(g)} * ${d3(tb)}^2`, r: M`U = ${d3(U)} [m s^-1]` });
  }
  const vA = snap(g * T), vB = snap(U + g * (T - d));
  const notes = [
    `They both land ${M`${d3(T)} [s]`} after the first is let go: the second, thrown ${M`${d3(d)} [s]`} later at ${M`${d3(U)} [m s^-1]`}, takes ${M`${d3(snap(T - d))} [s]`}.`,
    `They started ${M`${d3(h)} [m]`} above the ground. The first lands at ${M`${d3(vA)} [m s^-1]`}, the second at ${M`${d3(vB)} [m s^-1]`}.`,
  ];
  const posA = (t) => Math.max(0, h - 0.5 * g * Math.max(0, t) ** 2);
  const posB = (t) => (t <= d ? h : Math.max(0, h - U * (t - d) - 0.5 * g * (t - d) ** 2));
  const velA = (t) => (t < 0 || t > T + 1e-9 ? 0 : -g * Math.min(t, T));            // up positive
  const velB = (t) => (t < d || t > T + 1e-9 ? 0 : -(U + g * (Math.min(t, T) - d)));
  // the run holds a moment after the landing, both stones at rest, so the impact can be seen
  const f = { kind: 'together', g, d, U, h, T, vA, vB, tMax: snap(T * 1.2), posA, posB, velA, velB,
    accA: (t) => (t < T ? -g : 0), accB: (t) => (t >= d && t < T ? -g : 0),
    pos: (t) => ({ x: 0, y: posA(t) }), vel: (t) => ({ x: 0, y: velA(t) }), acc: () => -g,
    params: { u: 0, theta: -90, h, g } };
  const derived = [`${M`h = ${d3(h)} [m]`}`, `${M`T = ${d3(T)} [s]`}`];
  return { ok: true, mode: 'together', d, U, h, T, vA, vB, given: have(k.U) ? 'U' : 'h', rows, notes, derived, f };
}

/** The working: each fall over its own time, then the one equation. */
export function togetherWorking(s) {
  if (!s?.ok) return [];
  return [{ title: s.given === 'U' ? 'Two falls of the same height' : 'Two falls of the same height: the first, then the second', rows: s.rows,
    note: `Down positive, ${M`a = g`}. The first falls for ${M`T`} seconds from rest; the second for ${M`T - d`} seconds from its throw. ${s.given === 'U' ? `Both fall the same ${M`h`}, and the ${M`T^2`} terms cancel.` : ''}` }];
}
