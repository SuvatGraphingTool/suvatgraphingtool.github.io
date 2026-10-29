// bench.js — off the edge of a bench or a table, moving across: a ball
// bearing timed between two strips of foil, or a ball rolled off a table to
// the floor.
//
// NO NEW PHYSICS. Once it leaves the edge it is the twelve's own projectile,
// launched across (θ = 0): `flight` (js/core/projectile.js) says where it is.
// This file gathers what a question set at a bench asks — the speed from two
// strips a known distance apart and the time between them (or from how far
// out it lands), how far it has dropped at the second strip, and whether a
// strip set lower by a given amount is broken at its centre — and writes each
// as working.
//
// CONVENTION. Measured from where it leaves the edge: across positive, up
// positive, so a drop is a negative y. g > 0.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { flight } from './projectile.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
// a strip broken within half a millimetre of its centre is broken at it
const AT_CENTRE = 5e-4;

/** What it leaves: a laboratory bench (two foil strips) or a table (the floor). */
export const LOOKS = {
  foil:  { word: 'bench', edge: 'the end of the bench', thing: 'ball bearing' },
  table: { word: 'table', edge: 'the edge of the table', thing: 'ball' },
};

/**
 * @param k { look, g, u, d, tGap, drop, H, R }
 *   u     the speed it leaves the edge at, across — or, in its place,
 *   d     how far apart the two strips are, across, with
 *   tGap  the time between breaking them; or
 *   R     how far out from the foot of the edge it lands, with H
 *   drop  how much lower the second strip's centre is than the first's
 *   H     the height of the edge above the floor
 */
export function solveBench(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const look = LOOKS[k.look] ? k.look : 'foil', Lk = LOOKS[look];
  if (!have(k.g)) return fail('Choose the value of g the paper uses.');
  const g = k.g;
  for (const [key, what] of [['d', 'The distance between the strips'], ['tGap', 'The time between the strips'], ['H', 'The height of the edge'], ['R', 'How far out it lands'], ['u', 'The speed']]) {
    if (have(k[key]) && !(k[key] > 0)) return fail(`${what} is a positive number.`);
  }
  if (have(k.drop) && !(k.drop >= 0)) return fail('Give how much lower the second strip is as a positive number, or 0 for level.');
  if (have(k.drop) && !have(k.d)) return fail('Still needed: how far apart the strips are, across — the second strip is that far out.');

  // ── the speed it leaves the edge at: given, from the strips, or from where it lands
  const speedRows = [];
  let u = k.u, fromFloor = false;
  if (!have(u)) {
    if (have(k.d) && have(k.tGap)) {
      u = k.d / k.tGap;
      speedRows.push({ f: M`u = s/t`, s: M`${d(k.d)}/${d(k.tGap)}`, r: M`u = ${d(snap(u))} [m s^-1]` });
    } else if (have(k.H) && have(k.R)) {
      const T = Math.sqrt(2 * k.H / g);
      u = k.R / T; fromFloor = true;
      speedRows.push({ f: M`s = ut + ½at^2`, s: M`${d(k.H)} = 0 + ½ * ${d(g)}t^2`, r: M`t = ${d(snap(T))} [s]` });
      speedRows.push({ f: M`u = s/t`, s: M`${d(k.R)}/${d(snap(T))}`, r: M`u = ${d(snap(u))} [m s^-1]` });
    } else {
      return fail('Still needed: the speed it leaves the edge at — or the distance between the strips and the time between them, or the height of the edge and how far out it lands.');
    }
  } else if (have(k.tGap)) {
    return fail('Give the speed or the time between the strips, not both: one fixes the other.');
  }
  if (have(k.R) && have(k.u) && have(k.H)) return fail('Give the speed or how far out it lands, not both: with the height, one fixes the other.');
  u = snap(u);

  const f = flight({ u, theta: 0, h: 0, g });
  const notes = [], derived = [];
  // ── the floor, when the edge's height is given
  let T = null, R = null, vL = null, floorRows = [];
  if (have(k.H)) {
    T = Math.sqrt(2 * k.H / g); R = u * T; vL = Math.hypot(u, g * T);
    if (!fromFloor) floorRows.push({ f: M`s = ut + ½at^2`, s: M`${d(k.H)} = 0 + ½ * ${d(g)}t^2`, r: M`t = ${d(snap(T))} [s]` });
    if (!have(k.R)) floorRows.push({ f: M`x = ut`, s: M`${d(u)} * ${d(snap(T))}`, r: M`x = ${d(snap(R))} [m]` });
    floorRows.push({ f: M`v^2 = u_x^2 + (gt)^2`, s: M`${d(u)}^2 + (${d(g)} * ${d(snap(T))})^2`, r: M`v = ${d(snap(vL))} [m s^-1]` });
  }

  // ── the second strip: when it gets there, and how far it has dropped
  let t2 = null, fall = null, miss = null, stripRows = [], atCentre = null;
  if (have(k.d)) {
    if (R != null && k.d > R + 1e-9) return fail(`It lands ${M`${d(snap(R))} [m]`} out, before it reaches a strip ${M`${d(k.d)} [m]`} out.`);
    t2 = have(k.tGap) ? k.tGap : k.d / u;
    if (!have(k.tGap)) stripRows.push({ f: M`t = s/u`, s: M`${d(k.d)}/${d(u)}`, r: M`t = ${d(snap(t2))} [s]` });
    fall = 0.5 * g * t2 * t2;
    stripRows.push({ f: M`s = u_y t + ½at^2`, s: M`0 + ½ * ${d(g)} * ${d(snap(t2))}^2`, r: M`s = ${d(snap(fall))} [m]` });
    if (have(k.drop)) {
      miss = fall - k.drop;
      atCentre = Math.abs(miss) < AT_CENTRE;
      stripRows.push({ f: M`"drop" - "strip lower"`, s: M`${d(snap(fall))} - ${d(k.drop)}`, r: M`${d(snap(miss))} [m]` });
      notes.push(atCentre
        ? `It has dropped ${M`${d(snap(fall))} [m]`} at the second strip, and the strip's centre is ${M`${d(k.drop)} [m]`} lower: it breaks the strip at its centre.`
        : `It has dropped ${M`${d(snap(fall))} [m]`} at the second strip, but the strip's centre is only ${M`${d(k.drop)} [m]`} lower: it breaks the strip ${M`${d(snap(Math.abs(miss)))} [m]`} ${miss > 0 ? 'below' : 'above'} its centre, not at it.`);
    } else {
      notes.push(`At the second strip it has dropped ${M`${d(snap(fall))} [m]`}: to be broken at its centre, that strip's centre is that much lower than the first's.`);
    }
    if (have(k.H) && fall > k.H + 1e-9) return fail('It reaches the floor before the second strip.');
  }
  if (T != null) notes.push(`It hits the floor ${M`${d(snap(R))} [m]`} out from ${Lk.edge}, at ${M`t = ${d(snap(T))} [s]`} and ${M`${d(snap(vL))} [m s^-1]`}.`);
  if (!speedRows.length) derived.push(`leaves at ${M`${d(u)} [m s^-1]`}`);
  else derived.push(`speed ${M`${d(u)} [m s^-1]`}`);

  // ── the motion the stage and graphs play: to the floor, or just past the strip
  const tMax = T ?? (t2 ? t2 * 1.25 : 0.5);
  const motion = { ...f, kind: 'bench', look, tMax, tFlight: tMax, H: have(k.H) ? k.H : null, d: have(k.d) ? k.d : null, drop: have(k.drop) ? k.drop : null,
    t2, fall, miss, atCentre, R, T,
    path(n = 240, tEnd = tMax) { const out = []; for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; out.push({ t, ...f.pos(t) }); } return out; } };
  return { ok: true, mode: 'bench', axis: 'plane', look, Lk, u, g, f: motion, speedRows, stripRows, floorRows, t2, fall, miss, atCentre, T, R, vL, notes, derived };
}

/** The working, in the order the paper asks it. */
export function benchWorking(solved) {
  if (!solved?.ok) return [];
  const out = [];
  if (solved.speedRows.length) out.push({ title: 'The speed it leaves at', rows: solved.speedRows,
    note: solved.speedRows.length > 1 ? 'Vertically it starts from rest, falling the height of the edge; across, the speed never changes.' : 'Across, nothing acts on it: its speed between the strips is the speed it left at.' });
  if (solved.stripRows.length) out.push({ title: 'At the second strip', rows: solved.stripRows,
    note: 'Across at a steady speed gives the time; down from rest, under gravity alone, gives the drop.' });
  if (solved.floorRows.length) out.push({ title: 'To the floor', rows: solved.floorRows,
    note: 'Down positive here for the time: it starts with no vertical velocity.' });
  return out;
}
