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
  cliff:   { word: 'cliff', top: 'the top of the cliff', below: 'the sea', lands: 'hits the sea', foot: 'at the foot of the cliff' },
  tower:   { word: 'tower', top: 'the top of the tower', below: 'the ground', lands: 'hits the ground', foot: 'at the foot of the tower' },
  bridge:  { word: 'bridge', top: 'the bridge', below: 'the river', lands: 'hits the water', foot: 'just below the bridge' },
  board:   { word: 'diving board', top: 'the diving board', below: 'the water', lands: 'enters the water', foot: 'below the end of the board' },
  well:    { word: 'well', top: 'the top of the well', below: 'the water in the well', lands: 'hits the water', foot: 'at the bottom of the well', vertical: true },
  balloon: { word: 'balloon', top: 'the balloon', below: 'the ground', lands: 'hits the ground', foot: 'straight below where it was let go', vertical: true, carried: true, from: 'where it was let go' },
};

/**
 * @param k { place, h, u, theta, s, v, t, g, level }
 *   h      the height of the cliff or tower top above the sea or ground
 *   s      how far out it lands (thrown at an angle); v the speed it lands at;
 *          t the time in the air — any of these may stand in for u
 *   level  a height above where it is thrown from: when is it there?
 */
export function solveHeight(k0 = {}) {
  let k = k0;
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const place = PLACES[k.place] ? k.place : 'cliff', Pl = PLACES[place];
  if (!have(k.g)) return fail('Choose the value of g the paper uses.');
  // the height may be left for the engine when the time in the air is given
  if (!have(k.h) && !have(k.t)) return fail(`Still needed: how high ${Pl.top} is above ${Pl.below} — or the time it takes to land, to find that height.`);
  if (have(k.h) && !(k.h > 0)) return fail(`${Pl.top.replace(/^./, (c) => c.toUpperCase())} is above ${Pl.below}: give its height as a positive number.`);
  if (!have(k.theta)) return fail('Still needed: the angle it is thrown at — 90 straight up, 0 across, −90 straight down.');
  if (!(k.theta >= -90 && k.theta <= 90)) return fail('The angle is between −90° (straight down) and 90° (straight up).');
  const steep = Math.abs(Math.abs(k.theta) - 90) < 1e-9;
  const vertical = steep;
  // down a well, or let go from a balloon, it moves straight up or down
  if (Pl.vertical && !vertical) return fail(`From ${Pl.top} it moves straight up or down: give the angle as 90 (up) or −90 (down)${Pl.carried ? ' — a balloon rising carries it up at its own speed' : ''}.`);
  if (vertical && have(k.s)) return fail('Thrown straight up or down it lands at the foot: there is no distance out to give.');

  // the time to the top of its path fixes the speed: there the vertical
  // velocity is zero, so u sin θ = g t
  let u = k.u;
  const topRows = [];
  if (have(k.tTop)) {
    if (have(k.u)) return fail('Give the speed or the time to the top, not both: the time to the top fixes the speed.');
    if (!(k.tTop > 0)) return fail('The time to the top is after it is thrown: give it as a positive number.');
    if (!(k.theta > 0)) return fail('It only has a top to reach if it is thrown upwards: give an angle above the horizontal.');
    u = snap(k.g * k.tTop / Math.sin(k.theta * Math.PI / 180));
    topRows.push({ f: M`0 = u sin theta - gt`, s: M`0 = u sin ${d(k.theta)}° - ${d(k.g)} * ${d(k.tTop)}`, r: M`u = ${d(u)} [m s^-1]` });
  }
  // the twelve's solver, as the twelve use it: s is how far out it lands
  // (thrown at an angle), or nothing when it is straight up or down
  const r = solveLaunch({ u, v: k.v, t: k.t, s: k.s, g: k.g, theta: k.theta, h: k.h });
  if (!r.ok) return fail(r.reason);
  const hh = have(k.h) ? k.h : snap(r.f.params.h);
  if (have(k0.tTop) && have(k.t) && k0.tTop >= k.t - 1e-9) return fail(`The time to the top, ${M`${d(k0.tTop)} [s]`}, is not before the ${M`${d(k.t)} [s]`} it takes to land: it must reach its top first.`);
  if (!(hh > 0)) return fail(`Landing then, it would have started at or below ${Pl.below}: that time is too short for a fall from ${Pl.top}.`);
  k = { ...k, h: hh };
  const f = r.f;
  if (!(f.tFlight > 0) || !isFinite(f.tFlight)) return fail(`It never comes down to ${Pl.below}.`);
  // with no speed across (dropped, or straight up or down) it lands at the foot
  const straight = vertical || Math.abs(f.ux) < 1e-9;

  // the angle is what makes it vertical, never a value it did not need
  // and the height is the place itself, never a value it did not need
  const drop = Math.hypot(f.ux, f.uy) < 1e-9;
  const notes = r.notes.filter((n) => !(/more than enough/.test(n) && (vertical || drop || /launch height/.test(n))));
  if (drop && !vertical) notes.unshift('At no speed the angle does nothing: it is dropped, and falls straight down.');
  const T = snap(f.tFlight), top = snap(f.apexHeight), out = snap(z(f.range)), vL = snap(Math.abs(f.vLanding));
  const lines = [];
  if (f.uy > 1e-9) lines.push(`It rises to ${M`${d(top)} [m]`} above ${Pl.below}, ${M`${d(snap(top - k.h))} [m]`} above ${Pl.from || 'where it was thrown from'}, at ${M`t = ${d(snap(f.tApex))} [s]`}.`);
  lines.push(`It ${Pl.lands} ${straight ? Pl.foot : `${M`${d(out)} [m]`} out from the ${Pl.word}`} at ${M`t = ${d(T)} [s]`}, at ${M`${d(vL)} [m s^-1]`}.`);

  // when is it a given height above the throw?
  let level = null;
  if (have(k.level)) {
    const L = k.h + k.level;
    if (L < 0) return fail(`That is below ${Pl.below}: it never gets there.`);
    const a = timeAbove(f, L);
    // the very top of its path is one moment, not "never"; the throw itself
    // (t = 0, at the throw's own height) is not a moment it comes back to
    const atTop = f.uy > 1e-9 && Math.abs(L - f.apexHeight) <= 1e-6 * Math.max(1, Math.abs(L));
    let times = atTop ? [f.tApex] : a.crosses === 2 ? [a.t1, a.t2] : a.crosses === 1 ? [a.t2] : [];
    times = times.map(snap).filter((x) => x > 1e-9);
    level = { rel: k.level, L, times, atTop };
    const at = Math.abs(k.level) < 1e-12 ? 'back at the height it was thrown from'
      : `${M`${d(Math.abs(k.level))} [m]`} ${k.level >= 0 ? 'above' : 'below'} ${Pl.from || 'where it was thrown from'}`;
    lines.push(atTop ? `It is ${at} once, at the top of its path, ${M`t = ${d(times[0])} [s]`}.`
      : times.length === 2 ? `It is ${at} twice: at ${M`t = ${d(times[0])} [s]`} on the way up and ${M`t = ${d(times[1])} [s]`} on the way down.`
        : times.length === 1 ? `It is ${at} once, at ${M`t = ${d(times[0])} [s]`}.`
          : `It is never ${at}.`);
  }
  if (!have(k0.h)) lines.unshift(`Landing after ${M`${d(T)} [s]`}, it started ${M`${d(k.h)} [m]`} above ${Pl.below}.`);
  if (have(k0.tTop)) lines.unshift(`Stopping rising after ${M`${d(k0.tTop)} [s]`}, it was thrown at ${M`${d(snap(f.params.u))} [m s^-1]`}.`);
  notes.push(...lines);
  const found = [...(have(k0.tTop) ? [M`u = ${d(snap(f.params.u))} [m s^-1]`] : []), ...(!have(k0.h) ? [M`h = ${d(k.h)} [m]`] : [])];
  const derived = [...found, ...r.derived.map((x) => x.replace(/lands on the ground ([\d.]+) m below the launch point/, `${Pl.lands} $1 m below ${Pl.from || 'where it was thrown from'}`)), `${M`t = ${d(T)} [s]`} in the air`, `${Pl.lands} at ${M`${d(vL)} [m s^-1]`}`];
  if (level?.times.length) derived.push(`${M`${d(level.rel)} [m]`} up at ${M`t = ${level.times.map((x) => d(x)).join(', ')} [s]`}`);
  f.place = place; f.level = level; f.vertical = straight;
  return {
    ok: true, mode: 'height', axis: straight ? 'vertical' : 'plane', place, Pl, f, launch: r, level, vertical: straight, topRows, foundH: !have(k0.h),
    // the height, worked from the time in the air: s = u_y t − ½gt², and h = −s
    hRows: have(k0.h) ? [] : [
      { f: M`s = u_y t - ½gt^2`, s: M`${d(snap(f.uy))} * ${d(k.t)} - ½ * ${d(k.g)} * ${d(k.t)}^2`, r: M`s = ${d(-k.h)} [m]` },
      { f: M`h = -s`, s: '', r: M`h = ${d(k.h)} [m]` },
    ],
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
