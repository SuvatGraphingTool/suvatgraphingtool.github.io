// height.js — a throw from a height: off a cliff into the sea, or from the
// top of a tower to the ground below it.
//
// NO NEW PHYSICS. The motion is the twelve's own: solveLaunch (js/core/solve.js)
// works out the launch from whatever three of s, u, v, a, t the paper gives,
// with the angle and the height, and flight / timeAbove (js/core/projectile.js)
// say where it is and when it is at a given height. This file only gathers
// what a question set on a cliff or a tower asks — the greatest height above
// the sea, the time in the air, the speed it hits the water at, when it is a
// given height above where it was thrown from — and writes each as working.
//
// CONVENTION. Heights are above the sea or the ground, up positive; across
// is away from the cliff edge; g > 0.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solveLaunch } from './solve.js';
import { timeAbove } from './projectile.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const z = (x) => (Math.abs(x) < 1e-9 ? 0 : x);

/** Where it is thrown from, and what is below it. */
export const PLACES = {
  cliff: { word: 'cliff', top: 'the top of the cliff', below: 'the sea', lands: 'hits the sea' },
  tower: { word: 'tower', top: 'the top of the tower', below: 'the ground', lands: 'hits the ground' },
};

/**
 * @param k { place, h, u, theta, s, v, t, g, level }
 *   h      the height of the cliff or tower top above the sea or ground
 *   s      how far out it lands (thrown at an angle); v the speed it lands at;
 *          t the time in the air — any of these may stand in for u
 *   level  a height above where it is thrown from: when is it there?
 */
export function solveHeight(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const place = PLACES[k.place] ? k.place : 'cliff', Pl = PLACES[place];
  if (!have(k.g)) return fail('Choose the value of g the paper uses.');
  if (!have(k.h)) return fail(`Still needed: how high ${Pl.top} is above ${Pl.below}.`);
  if (!(k.h > 0)) return fail(`${Pl.top.replace(/^./, (c) => c.toUpperCase())} is above ${Pl.below}: give its height as a positive number.`);
  if (!have(k.theta)) return fail('Still needed: the angle it is thrown at — 90 straight up, 0 across, −90 straight down.');
  if (!(k.theta >= -90 && k.theta <= 90)) return fail('The angle is between −90° (straight down) and 90° (straight up).');
  const vertical = Math.abs(Math.abs(k.theta) - 90) < 1e-9;
  if (vertical && have(k.s)) return fail('Thrown straight up or down it lands at the foot: there is no distance out to give.');

  // the twelve's solver, as the twelve use it: s is how far out it lands
  // (thrown at an angle), or nothing when it is straight up or down
  const r = solveLaunch({ u: k.u, v: k.v, t: k.t, s: k.s, g: k.g, theta: k.theta, h: k.h });
  if (!r.ok) return fail(r.reason);
  const f = r.f;
  if (!(f.tFlight > 0) || !isFinite(f.tFlight)) return fail(`It never comes down to ${Pl.below}.`);

  // the angle is what makes it vertical, never a value it did not need
  // and the height is the place itself, never a value it did not need
  const notes = r.notes.filter((n) => !(/more than enough/.test(n) && (vertical || /launch height/.test(n))));
  const T = snap(f.tFlight), top = snap(f.apexHeight), out = snap(z(f.range)), vL = snap(Math.abs(f.vLanding));
  const lines = [];
  if (f.uy > 1e-9) lines.push(`It rises to ${M`${d(top)} [m]`} above ${Pl.below}, ${M`${d(snap(top - k.h))} [m]`} above where it was thrown from, at ${M`t = ${d(snap(f.tApex))} [s]`}.`);
  lines.push(`It ${Pl.lands} ${vertical ? `at the foot of the ${Pl.word}` : `${M`${d(out)} [m]`} out from the ${Pl.word}`} at ${M`t = ${d(T)} [s]`}, at ${M`${d(vL)} [m s^-1]`}.`);

  // when is it a given height above the throw?
  let level = null;
  if (have(k.level)) {
    const L = k.h + k.level;
    if (L < 0) return fail(`That is below ${Pl.below}: it never gets there.`);
    const a = timeAbove(f, L);
    const times = a.crosses === 2 ? [a.t1, a.t2] : a.crosses === 1 ? [a.t2] : [];
    level = { rel: k.level, L, times: times.map(snap) };
    const at = `${M`${d(Math.abs(k.level))} [m]`} ${k.level >= 0 ? 'above' : 'below'} where it was thrown from`;
    lines.push(times.length === 2 ? `It is ${at} twice: at ${M`t = ${d(level.times[0])} [s]`} on the way up and ${M`t = ${d(level.times[1])} [s]`} on the way down.`
      : times.length === 1 ? `It is ${at} once, at ${M`t = ${d(level.times[0])} [s]`}.`
        : `It is never ${at}.`);
  }
  notes.push(...lines);
  const derived = [...r.derived, `${M`t = ${d(T)} [s]`} in the air`, `${Pl.lands} at ${M`${d(vL)} [m s^-1]`}`];
  if (level?.times.length) derived.push(`${M`${d(level.rel)} [m]`} up at ${M`t = ${level.times.map((x) => d(x)).join(', ')} [s]`}`);
  f.place = place; f.level = level; f.vertical = vertical;
  return {
    ok: true, mode: 'height', axis: vertical ? 'vertical' : 'plane', place, Pl, f, launch: r, level, vertical,
    T, top, out, vL, h: k.h, g: k.g, notes, derived,
    params: r.params, convention: `Up and away from the ${Pl.word} are positive; heights are above ${Pl.below}.`,
  };
}

/** The working that is this scenario's own: when it is at the asked height. */
export function levelRows(solved) {
  const { level, f, h, g } = solved;
  if (!level) return [];
  const uy = f.uy;
  const lin = Math.abs(uy) > 1e-9 ? `${uy < 0 ? '-' : ''}${d(Math.abs(uy))}t` : '';
  const rhs = lin ? `${lin} - ½ * ${d(g)}t^2` : `-½ * ${d(g)}t^2`;
  return [{ f: M`s = u_y t - ½gt^2`, s: M`${d(level.rel)} = ${rhs}`,
    r: level.times.length ? M`t = ${level.times.map((x) => d(x)).join(' "or" ')} [s]` : M`"no real root"` }];
}
