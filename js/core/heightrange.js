// heightrange.js — a projectile from level ground: its range and its greatest
// height in terms of u and θ, and the angles for which it goes higher than it
// goes far (or higher than any multiple of its range). (OCR MEI H640/01
// Jun 2023 Q15.)
//
// NO NEW PHYSICS. Up, the time of flight is 2u sin θ / g (s = 0 again); across,
// the range is u cos θ times that: 2u² sin θ cos θ / g. At the top v_y = 0, so
// the greatest height is u² sin² θ / 2g. Then H > kR is sin² θ / 2 > 2k sin θ cos θ,
// and for an acute θ that is tan θ > 4k: u and g cancel. A speed only sets the
// size of the drawing and the numbers for one throw.
//
// CONVENTION. From the launch point on level ground, x across, y up.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { flight } from './projectile.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const DEG = Math.PI / 180;
export const FAN = [15, 30, 45, 60, 75];                 // the other angles drawn, faintly

/**
 * @param k { u, theta, ratio, g }
 *   u      the speed of projection (m s⁻¹): the size of one throw
 *   theta  the angle of that throw above the horizontal (°)
 *   ratio  higher than this many times the range (blank: 1, the range itself)
 */
export function solveHeightRange(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  if (!(g > 0)) return fail('It comes down because of gravity: give g as a size, such as 9.8.');
  const kk = have(k.ratio) ? k.ratio : 1;
  if (!(kk > 0)) return fail('Compare the height with a positive multiple of the range: 1 for the range itself.');
  if (!have(k.u)) return fail('Still needed: a speed of projection, to draw one throw (the angles found do not depend on it).');
  if (!(k.u > 0)) return fail('The speed of projection is a positive number.');
  if (!have(k.theta)) return fail('Still needed: the angle of the throw to draw, above the horizontal.');
  if (!(k.theta > 0 && k.theta < 90)) return fail('An acute angle above the horizontal: between 0° and 90°.');
  const u = k.u, th = k.theta;
  // the threshold: tan θ = 4k
  const thStar = snap(Math.atan(4 * kk) / DEG);
  const T = snap(2 * u * Math.sin(th * DEG) / g), R = snap(u * Math.cos(th * DEG) * T), H = snap((u * Math.sin(th * DEG)) ** 2 / (2 * g));
  const higher = H > kk * R + 1e-9;
  const rangeRows = [
    { f: M`s = ut + ½at^2`, s: M`0 = (u sin theta)t - ½gt^2`, r: M`t = (2u sin theta)/g` },
    { f: M`x = (u cos theta)t`, s: M`(u cos theta)((2u sin theta)/g)`, r: M`R = (2u^2 sin theta cos theta)/g` },
  ];
  const heightRows = [
    { f: M`v^2 = u^2 + 2as`, s: M`0 = (u sin theta)^2 - 2gH`, r: M`H = (u^2 sin^2 theta)/(2g)` },
  ];
  const kTxt = Math.abs(kk - 1) < 1e-12 ? '' : `${d3(kk)} * `;
  const ineqRows = [
    { f: M`H > ${kTxt}R`, s: M`(u^2 sin^2 theta)/(2g) > ${kTxt}(2u^2 sin theta cos theta)/g`, r: M`sin theta > ${d3(4 * kk)} cos theta` },
    { f: M`tan theta > ${d3(4 * kk)}`, s: M`theta > tan^-1 ${d3(4 * kk)}`, r: M`${num(thStar, 1)}° < theta < 90°` },
  ];
  const numRows = [
    { f: M`R = (2u^2 sin theta cos theta)/g`, s: M`(2 * ${d3(u)}^2 sin ${d3(th)}° cos ${d3(th)}°)/${d3(g)}`, r: M`R = ${d3(R)} [m]` },
    { f: M`H = (u^2 sin^2 theta)/(2g)`, s: M`(${d3(u)}^2 sin^2 ${d3(th)}°)/(2 * ${d3(g)})`, r: M`H = ${d3(H)} [m]` },
  ];
  const notes = [
    `It goes higher than ${kTxt ? `${d3(kk)} times ` : ''}its range for every angle from ${num(thStar, 1)}° up to 90°: ${M`u`} and ${M`g`} cancel, so the answer is the same however hard it is thrown.`,
    `At ${d3(th)}° and ${M`${d3(u)} [m s^-1]`} it rises ${M`${d3(H)} [m]`} and lands ${M`${d3(R)} [m]`} away, so its greatest height is ${higher ? 'more than' : Math.abs(H - kk * R) < 1e-9 ? 'exactly' : 'less than'} ${kTxt ? `${d3(kk)} times ` : ''}its range.`,
  ];
  const f0 = flight({ u, theta: th, h: 0, g });
  const arc = (a) => { const f = flight({ u, theta: a, h: 0, g }); return { theta: a, R: f.range, H: f.apexHeight, pos: f.pos, tMax: f.tFlight, top: f.pos(f.tApex) }; };
  const verdict = higher ? 'higher' : Math.abs(H - kk * R) < 1e-9 ? 'equal' : 'lower';
  const f = { ...f0, kind: 'heightrange', ratio: kk, thStar, H, R, higher, verdict, top: f0.pos(f0.tApex), fan: FAN.map(arc), star: arc(thStar),
    speed: (t) => Math.hypot(f0.vel(t).x, f0.vel(t).y) };
  const derived = [`${M`theta > ${num(thStar, 1)}°`}`, `${M`H = ${d3(H)} [m]`}`, `${M`R = ${d3(R)} [m]`}`];
  return { ok: true, mode: 'heightrange', u, theta: th, ratio: kk, thStar, T, R, H, higher, rangeRows, heightRows, ineqRows, numRows, notes, derived, f };
}

/** The working: the range, the greatest height, the inequality, then one throw's numbers. */
export function heightRangeWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'The range, in u and θ', rows: s.rangeRows, note: `Up, it is back on the ground when ${M`s = 0`}; across, its velocity never changes.` },
    { title: 'The greatest height', rows: s.heightRows, note: `At the top it has stopped rising: ${M`v_y = 0`}.` },
    { title: 'Higher than it goes far', rows: s.ineqRows, note: `${M`u^2`}, ${M`g`} and one ${M`sin theta`} cancel (an acute ${M`theta`} has ${M`sin theta > 0`} and ${M`cos theta > 0`}), so divide by ${M`cos theta`}.` },
    { title: 'This throw', rows: s.numRows, note: 'The same two formulas, with the numbers of the throw drawn.' },
  ];
}
