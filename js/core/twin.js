// twin.js — two launched from one place: two balls off a cliff at different
// speeds, a stone thrown up as another is dropped, two cars off one edge.
//
// NO NEW PHYSICS. Each one is the height engine's own launch (solveHeight, in
// js/core/height.js), from the same place over the same surface; one may set
// off later than the other (t0). This file runs both, puts them on one clock,
// and works out what a question about the pair asks — which lands first and
// by how long, which lands further out and by how far — so nothing outside
// js/core does that arithmetic (CLAUDE.md rule 4).

import { solveHeight } from './height.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });

/**
 * @param k { place, below, from, g, A: { h, u, theta, v, s, t, t0, name }, B: { … } }
 *   t0  when each sets off, s after the clock starts (0 if left out)
 * @returns { ok, A, B (each solveHeight's answer), f, extras, notes, derived, … }
 */
export function solveTwin(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const one = (p = {}) => solveHeight({ place: k.place, below: k.below, from: k.from, g: k.g,
    h: p.h ?? k.h, u: p.u, theta: p.theta, v: p.v, s: p.s, t: p.t });
  const nameA = k.A?.name || 'A', nameB = k.B?.name || 'B';
  const A = one(k.A), B = one(k.B);
  if (!A.ok) return fail(`${nameA.replace(/^./, (c) => c.toUpperCase())}: ${A.reason}`);
  if (!B.ok) return fail(`${nameB.replace(/^./, (c) => c.toUpperCase())}: ${B.reason}`);
  const a0 = have(k.A?.t0) ? k.A.t0 : 0, b0 = have(k.B?.t0) ? k.B.t0 : 0;
  if (a0 < 0 || b0 < 0) return fail('A start time is after the clock starts: give it as 0 or more.');

  // each on the one clock: waiting where it starts before it goes, resting
  // where it lands after
  const on = (s, t0) => {
    const local = (t) => Math.min(Math.max(t - t0, 0), s.f.tMax);
    return {
      t0, tLand: snap(t0 + s.f.tMax),
      pos: (t) => s.f.pos(local(t)),
      vel: (t) => (t < t0 || t > t0 + s.f.tMax ? { x: 0, y: 0 } : s.f.vel(local(t))),
      moving: (t) => t >= t0 && t <= t0 + s.f.tMax,
    };
  };
  const fa = on(A, a0), fb = on(B, b0);
  const tMax = Math.max(fa.tLand, fb.tLand);
  const f = {
    kind: 'twin', tMax, tFlight: tMax, place: A.place, Pl: A.Pl, params: A.f.params,
    A: { ...fa, f: A.f, name: nameA }, B: { ...fb, f: B.f, name: nameB },
    // the first is what a single-object readout reads
    pos: fa.pos, vel: fa.vel,
  };

  // the questions a pair is asked: when each lands, how far out, how fast,
  // and the differences between them
  const gapT = snap(Math.abs(fa.tLand - fb.tLand)), gapX = snap(Math.abs(A.out - B.out));
  const extras = [
    { key: 'tA', label: `${nameA} lands at`, value: fa.tLand, unit: 's' },
    { key: 'tB', label: `${nameB} lands at`, value: fb.tLand, unit: 's' },
    { key: 'gapT', label: 'the time between their landings', value: gapT, unit: 's' },
    { key: 'xA', label: `${nameA} lands out`, value: A.out, unit: 'm' },
    { key: 'xB', label: `${nameB} lands out`, value: B.out, unit: 'm' },
    { key: 'gapX', label: 'the distance between where they land', value: gapX, unit: 'm' },
    { key: 'vA', label: `${nameA} lands at`, value: A.vL, unit: 'm s⁻¹' },
    { key: 'vB', label: `${nameB} lands at`, value: B.vL, unit: 'm s⁻¹' },
  ];
  const Up = (s) => s.replace(/^./, (c) => c.toUpperCase());
  const first = fa.tLand < fb.tLand - 1e-9 ? nameA : fb.tLand < fa.tLand - 1e-9 ? nameB : null;
  const notes = [
    ...A.notes.map((n) => `${Up(nameA)}: ${n}`),
    ...B.notes.map((n) => `${Up(nameB)}: ${n}`),
    first ? `${Up(first)} lands first, ${M`${d(gapT)} [s]`} before ${first === nameA ? nameB : nameA}.` : 'They land at the same moment.',
    gapX > 1e-9 ? `They land ${M`${d(gapX)} [m]`} apart.` : 'They land at the same place.',
  ];
  return {
    ok: true, mode: 'twin', A, B, f, extras, notes, first, a0, b0, h: A.h, g: A.g, Pl: A.Pl, place: A.place,
    derived: [`${nameA}: ${M`t = ${d(fa.tLand)} [s]`}`, `${nameB}: ${M`t = ${d(fb.tLand)} [s]`}`, ...(first ? [`${first} first, by ${M`${d(gapT)} [s]`}`] : [])],
    params: A.params, convention: A.convention,
  };
}
