// robots.js — two robots crossing a square floor, each at a constant
// velocity in i and j: where each is at time t, the vector between them, and
// when they are closest.
//
// NO NEW PHYSICS. The two motions are the library's two-in-a-plane engine
// (js/core/twoplane.js `solveTwoPlane`), which also finds a velocity from two
// positions. The one step added here is the closest approach: the vector
// between them is linear in t, so the square of the distance is a quadratic
// in t, least where its derivative is zero (or at t = 0 if they are already
// moving apart). The floor is a square centred on O; a robot that would reach
// its edge is said to.
//
// CONVENTION. Metres and seconds; i along AB, j along AD; O the centre.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solveTwoPlane } from './twoplane.js';
import { vsrc } from './plane.js';
import { poly } from './pair.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
// a velocity after t is always bracketed: t(5i), never t5i
const vb = (v) => `(${vsrc(v)})`;

/** When a robot moving from r0 at v first reaches the edge of a square of half-side h. */
function leaves(r0, v, h) {
  const ts = [];
  for (const k of ['x', 'y']) if (Math.abs(v[k]) > 1e-12) ts.push(((v[k] > 0 ? h : -h) - r0[k]) / v[k]);
  const t = Math.min(...ts.filter((t) => t >= -1e-9));
  return isFinite(t) ? snap(Math.max(0, t)) : null;
}

/**
 * @param k { R: { r0, r1, t1, v }, S: { r0, v }, side, names }
 *   R, S   each robot: where it is at t = 0, and its velocity — or, for R,
 *          where it is at a later time t1, to find the velocity from
 *   side   the floor's side, in metres (a square centred on O)
 */
export function solveRobots(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const side = have(k.side) ? k.side : 50;
  if (!(side > 0)) return fail('The floor’s side is a positive length.');
  const h = side / 2;
  const hasV = (o) => o && (have(o.x) || have(o.y));
  if (hasV(k.R?.v) && (hasV(k.R?.r1) || have(k.R?.t1))) return fail('Give R\u2019s velocity or a later position, not both: either fixes its velocity.');
  if (hasV(k.R?.r1) && (Math.abs(k.R.r1.x ?? 0) > h + 1e-9 || Math.abs(k.R.r1.y ?? 0) > h + 1e-9)) return fail(`R\u2019s later position is off the floor: it is ${M`${d(side)} [m]`} square, centred on O.`);
  const tp = solveTwoPlane({ units: 'm', A: k.R || {}, B: k.S || {} });
  if (!tp.ok) return fail(tp.reason.replace(/\bA\b/g, 'R').replace(/\bB\b/g, 'S'));
  const R = tp.A, S = tp.B;
  for (const [n, p] of [['R', R], ['S', S]]) if (Math.abs(p.r0.x) > h + 1e-9 || Math.abs(p.r0.y) > h + 1e-9) return fail(`${n} starts off the floor: it is ${M`${d(side)} [m]`} square, centred on O.`);

  // ── the vector between them, from S to R: linear in t
  const D0 = { x: R.r0.x - S.r0.x, y: R.r0.y - S.r0.y }, Dv = { x: R.v.x - S.v.x, y: R.v.y - S.v.y };
  const part = (c) => poly([snap(D0[c]), snap(Dv[c]), 0]);
  const both = `(${part('x')})vec(i) + (${part('y')})vec(j)`;
  const rOf = (p) => `(${poly([snap(p.r0.x), snap(p.v.x), 0])})vec(i) + (${poly([snap(p.r0.y), snap(p.v.y), 0])})vec(j)`;
  const posRows = [
    { f: M`vec r = vec r_0 + vec(v)t`, s: M`vec r_R = ${vsrc(R.r0)} + t${vb(R.v)}`, r: M`vec r_R = ${rOf(R)}` },
    { f: M`vec r = vec r_0 + vec(v)t`, s: M`vec r_S = ${vsrc(S.r0)} + t${vb(S.v)}`, r: M`vec r_S = ${rOf(S)}` },
  ];
  const rows = [{ f: M`vec(SR) = vec r_R - vec r_S`, s: M`(${vsrc(R.r0)} + t${vb(R.v)}) - (${vsrc(S.r0)} + t${vb(S.v)})`, r: M`vec(SR) = ${both}` }];
  const vv = Dv.x * Dv.x + Dv.y * Dv.y, dv = D0.x * Dv.x + D0.y * Dv.y;
  const closeRows = [];
  let tc = null, dmin = null, apart = false;
  if (vv < 1e-12) {
    tc = 0; dmin = snap(Math.hypot(D0.x, D0.y)); apart = null;
  } else {
    const t = -dv / vv;
    apart = t <= 1e-12;
    tc = apart ? 0 : snap(t);
    const D = { x: D0.x + Dv.x * tc, y: D0.y + Dv.y * tc };
    dmin = snap(Math.hypot(D.x, D.y));
    closeRows.push({ f: M`d^2 = x^2 + y^2`, s: M`(${part('x')})^2 + (${part('y')})^2`, r: M`d^2 = ${poly([snap(D0.x * D0.x + D0.y * D0.y), snap(2 * dv), snap(vv)])}` });
    closeRows.push({ f: M`(d(d^2))/(dt) = 0`, s: M`${poly([snap(2 * dv), snap(2 * vv), 0])} = 0`, r: apart ? M`t = ${d(snap(t))} "(before" t = 0")"` : M`t = ${d(tc)} [s]` });
    closeRows.push({ f: M`d = sqrt(x^2 + y^2)`, s: M`sqrt((${d(snap(D.x))})^2 + (${d(snap(D.y))})^2)`, r: M`d = ${d(dmin)} [m]` });
  }

  // ── the floor's edge
  const lR = leaves(R.r0, R.v, h), lS = leaves(S.r0, S.v, h);
  const notes = [];
  if (apart === null) notes.push(`They move with the same velocity: the distance between them never changes, ${M`${d(dmin)} [m]`}.`);
  else if (apart) notes.push(`They are moving apart from the start: they are closest at ${M`t = 0`}, ${M`${d(dmin)} [m]`} apart.`);
  else notes.push(`They are closest at ${M`t = ${d(tc)} [s]`}, ${M`${d(dmin)} [m]`} apart.`);
  const off = [['R', lR], ['S', lS]].filter(([, l]) => l != null && tc != null && l < tc - 1e-9);
  if (off.length) notes.push(`But ${off.map(([n, l]) => `${n} reaches the edge of the floor at ${M`t = ${d(l)} [s]`}`).join(' and ')}: on this floor they would never get that close.`);
  const offFloor = off.map(([n, l]) => ({ n, t: l }));
  const derived = [`closest at ${M`t = ${d(tc ?? 0)} [s]`}`, `${M`${d(dmin)} [m]`} apart`];

  const ends = [lR, lS].filter((l) => l != null);
  const tMax = snap(Math.max(Math.min(ends.length ? Math.min(...ends) : Infinity, Math.max((tc || 0) * 1.4, 4)), 1));
  const f = { ...tp.f, kind: 'robots', tMax, tFlight: tMax, side, tc, dmin, leaves: { R: lR, S: lS },
    gap: (t) => snap(Math.hypot(D0.x + Dv.x * t, D0.y + Dv.y * t)) };
  return { ok: true, mode: 'robots', R, S, tp, offFloor, same: apart === null, posRows, rows, closeRows, tc, dmin, apart, side, notes, derived, f };
}

/** The working: each one's position (the two-in-a-plane working), then the closest approach. */
export function robotsWorking(s) {
  if (!s?.ok) return [];
  const out = [];
  if (s.tp.pre.length) out.push({ title: 'R\u2019s velocity, from two positions', rows: s.tp.pre, note: 'At a constant velocity, the change in position over the time it took.' });
  out.push({ title: 'Where each is at time t', rows: s.posRows, note: 'Each starts where it is at t = 0 and moves at its constant velocity.' });
  out.push({ title: 'The vector between them', rows: s.rows, note: 'From S to R: R’s position less S’s.' });
  if (s.closeRows.length) out.push({ title: 'When they are closest', rows: s.closeRows,
    note: s.apart ? 'The least is before t = 0: they are already moving apart.' : 'The square of the distance is a quadratic in t: least where its gradient is zero.' });
  return out;
}
