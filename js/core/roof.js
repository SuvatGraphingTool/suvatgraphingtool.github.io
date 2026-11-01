// roof.js — a particle thrown straight up beside a building is above the
// level of its roof for a given time: how tall is the building? Then a second
// particle is thrown up from the roof a moment later: when are they level?
// (CIE 9709/42 Oct/Nov 2020 Q5.)
//
// NO NEW PHYSICS. Up from the ground at u, the motion is symmetric about the
// top at u/g: above the roof for T seconds, it passes the roof’s level T/2
// before and T/2 after the top, and s = ut − ½gt² at the first of those is the
// roof's height. The two particles are then the pair in one vertical line
// (js/core/pair.js `solvePair`), which finds when they are level.
//
// CONVENTION. Heights up from the ground; t from the first particle's throw.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solvePair, pairWorking } from './pair.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });

/**
 * @param k { u, above, h, B: { u, t0 }, g }
 *   u      the first particle's speed straight up from the ground (m s⁻¹)
 *   above  how long it is above the level of the roof (s) — or, in its place,
 *   h      the building's height (m)
 *   B      the second particle, thrown straight up from the roof: its speed, and how much later
 */
export function solveRoof(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  if (!(g > 0)) return fail('It comes back down because of gravity: give g as a size, such as 10.');
  if (!have(k.u) || !(k.u > 0)) return fail('Still needed: the first particle’s speed straight up from the ground, a positive number.');
  if (have(k.above) && have(k.h)) return fail('Give the time above the roof or the building’s height, not both: one fixes the other.');
  if (!have(k.above) && !have(k.h)) return fail('Still needed: how long it is above the level of the roof, or the building’s height.');
  const u = k.u, tTop = snap(u / g), H = snap(u * u / (2 * g)), roofRows = [];
  let h, above;
  if (have(k.above)) {
    above = k.above;
    if (!(above > 0)) return fail('The time above the roof is a positive number of seconds.');
    if (!(above < 2 * tTop - 1e-9)) return fail(`It is in the air for ${M`${d3(snap(2 * tTop))} [s]`} altogether; above a roof for that long or longer, the roof would be at ground level or below. Give a shorter time.`);
    const t1 = snap(tTop - above / 2);
    h = snap(u * t1 - 0.5 * g * t1 * t1);
    roofRows.push({ f: M`v = u + at`, s: M`0 = ${d3(u)} - ${d3(g)}t`, r: M`t = ${d3(tTop)} [s]` });
    roofRows.push({ f: M`t_1 = t - ½T`, s: M`${d3(tTop)} - ½ * ${d3(above)}`, r: M`t_1 = ${d3(t1)} [s]` });
    roofRows.push({ f: M`s = ut + ½at^2`, s: M`${d3(u)} * ${d3(t1)} - ½ * ${d3(g)} * ${d3(t1)}^2`, r: M`h = ${d3(h)} [m]` });
  } else {
    h = k.h;
    if (!(h > 0)) return fail('The building stands on the ground: give its height as a positive number.');
    if (!(h < H - 1e-9)) return fail(`Thrown up at ${M`${d3(u)} [m s^-1]`} it rises only ${M`${d3(H)} [m]`}, so it never gets above a roof ${M`${d3(h)} [m]`} high.`);
    above = snap(2 * Math.sqrt(2 * (H - h) / g));
    roofRows.push({ f: M`v^2 = u^2 + 2as`, s: M`v^2 = ${d3(u)}^2 - 2 * ${d3(g)} * ${d3(h)}`, r: M`v = ${d3(snap(Math.sqrt(u * u - 2 * g * h)))} [m s^-1] "at the roof"` });
    roofRows.push({ f: M`T = (2v)/g`, s: M`(2 * ${d3(snap(Math.sqrt(u * u - 2 * g * h)))})/${d3(g)}`, r: M`T = ${d3(above)} [s]` });
  }
  const B = k.B || {};
  if (!have(B.u)) return fail(`The building is ${M`${d3(h)} [m]`} high, and the first is above its roof for ${M`${d3(above)} [s]`}. Still needed to go on: the second particle’s speed up from the roof.`);
  // side by side, not in one line: they pass each other, and the run goes on until just after the first is back down past the roof
  const pair = solvePair({ A: { h: 0, u, t0: 0 }, B: { h, u: B.u, t0: have(B.t0) ? B.t0 : 0 }, g, pass: true, until: snap(tTop + above / 2 + (tTop - above / 2) / 4) });
  if (!pair.ok) return fail(pair.reason);
  const notes = [
    have(k.above) ? `Above the roof for ${M`${d3(above)} [s]`}, it passes the roof’s level ${M`${d3(snap(above / 2))} [s]`} either side of its top, so the building is ${M`${d3(h)} [m]`} high.`
      : `It is above the ${M`${d3(h)} [m]`} roof for ${M`${d3(above)} [s]`}.`,
    ...pair.notes,
  ];
  const t1 = snap(tTop - above / 2), t2 = snap(tTop + above / 2);
  // the roof's level and the two moments the first passes it, for the stage
  pair.f.roof = { h, t1, t2, above };
  return { ...pair, mode: 'roof', h, above, tTop, t1, t2, roofRows, notes, given: have(k.above) ? 'above' : 'h',
    derived: [`${M`h = ${d3(h)} [m]`}`, ...pair.derived] };
}

/** The working: the roof's height from the time above it, then the pair. */
export function roofWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: s.given === 'above' ? 'The roof, from the time above it' : 'The time above the roof', rows: s.roofRows,
      note: `Up positive, ${M`a = -g`}. The motion is the same going up as coming down, so the roof’s level is passed at equal times either side of the top: ${M`T`} is the time above the roof, ${M`t_1`} when it first reaches the roof’s level.` },
    ...pairWorking(s),
  ];
}
