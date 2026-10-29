// flighttime.js — a particle projected from O on level ground, given how long
// it is in the air and its horizontal velocity as a multiple of an unknown
// length d; it just clears a wall d (or a multiple of d) from O. How far does
// it land, how fast does it go up, how high is the wall, and — once the paper
// gives its speed over the wall — what is d? (OCR H240/03 Jun 2019 Q8.)
//
// NO NEW PHYSICS. Across, x = Ut with U = k·d; up, s = ut + ½at² with s = 0
// at the landing, so the vertical component is gT/2; at the wall t = m/k,
// whatever d is, so the wall's height is a number, not a multiple of d; the
// speed over the wall, v² = U² + v_y², then gives U and so d.
//
// CONVENTION. x from O, y up, t from the launch.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { flight } from './projectile.js';
import { snap, rat } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const DEG = 180 / Math.PI;
// a number to substitute: a negative one bracketed, so (−5.88)² squares the sign
const sb = (x) => (x < 0 ? `(${d3(x)})` : d3(x));
/** A multiple as the paper writes it: 4, (5/3). */
function co(c) {
  const r = rat(snap(c), 24);
  if (!r) return d3(c);
  return r.q === 1 ? `${r.p}` : `(${r.p}/${r.q})`;
}
/** c times the letter d: "d", "4d", "(5/3)d". */
export const kd = (c) => (Math.abs(c - 1) < 1e-12 ? 'd' : `${co(c)}d`);

/**
 * @param k { T, kx, m, V, d, g }
 *   T    how long it is in the air, landing on the level ground it left (s)
 *   kx   its horizontal velocity, as a multiple of d (m s⁻¹ per metre of d)
 *   m    how far the wall it just clears is from O, as a multiple of d (blank: d)
 *   V    its speed as it passes over the wall — or, in its place,
 *   d    the length d itself (m)
 */
export function solveFlightTime(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  if (!have(k.T)) return fail('Still needed: how long it is in the air.');
  if (!(k.T > 0)) return fail('The time in the air is a positive number of seconds.');
  if (!have(k.kx)) return fail(`Still needed: its horizontal velocity, as a multiple of ${M`d`} (type 5/3 for ${M`(5/3)d`}).`);
  if (!(k.kx > 0)) return fail(`The horizontal velocity is a positive multiple of ${M`d`}.`);
  const m = have(k.m) ? k.m : 1;
  if (!(m > 0)) return fail(`The wall is a positive multiple of ${M`d`} from O.`);
  if (have(k.V) && have(k.d)) return fail(`Give its speed over the wall or the length ${M`d`}, not both: one fixes the other.`);
  for (const [key, what] of [['V', 'Its speed over the wall'], ['d', 'The length d']]) if (have(k[key]) && !(k[key] > 0)) return fail(`${what} is a positive number.`);
  const T = k.T, kx = k.kx, R = snap(kx * T);
  if (!(m < R - 1e-9)) return fail(`It lands ${M`${kd(R)}`} from O, so a wall ${M`${kd(m)}`} away is not on its way: put the wall nearer than ${M`${kd(R)}`}.`);

  // ── (a) where it lands, in d; (b) the vertical component
  const V0 = snap(g * T / 2);
  const rangeRows = [
    { f: M`x = Ut`, s: M`${kd(kx)} * ${d3(T)}`, r: M`x = ${kd(R)}` },
    { f: M`s = ut + ½at^2`, s: M`0 = ${d3(T)}u_y - ½ * ${d3(g)} * ${d3(T)}^2`, r: M`u_y = ${d3(V0)} [m s^-1]` },
  ];
  // ── (c) the wall: the time to it, and so its height, whatever d is
  const tw = snap(m / kx), H = snap(V0 * tw - 0.5 * g * tw * tw);
  if (!(H > 0)) return fail('At the wall it would already be back on the ground: move the wall nearer O.');
  const wallRows = [
    { f: M`t = x/U`, s: M`${kd(m)}/(${kd(kx)})`, r: M`t = ${d3(tw)} [s]` },
    { f: M`s = ut + ½at^2`, s: M`${d3(V0)} * ${d3(tw)} - ½ * ${d3(g)} * ${d3(tw)}^2`, r: M`h = ${d3(H)} [m]` },
  ];
  const notes = [`It reaches the wall ${M`${d3(tw)} [s]`} after it is projected whatever ${M`d`} is, so the wall is ${M`${d3(H)} [m]`} high whatever ${M`d`} is.`];

  // ── (d) d, from the speed over the wall — or the speed, from d
  const vyw = snap(V0 - g * tw);
  const fixRows = [{ f: M`v_y = u_y + at`, s: M`${d3(V0)} - ${d3(g)} * ${d3(tw)}`, r: M`v_y = ${d3(vyw)} [m s^-1]` }];
  let dd = k.d, U, Vw;
  if (have(k.V)) {
    if (!(k.V > Math.abs(vyw) + 1e-9)) return fail(`Over the wall it is already moving ${M`${d3(Math.abs(vyw))} [m s^-1]`} vertically, so its speed there is more than that: give a larger speed.`);
    U = snap(Math.sqrt(k.V * k.V - vyw * vyw)); dd = snap(U / kx); Vw = k.V;
    fixRows.push({ f: M`v^2 = U^2 + v_y^2`, s: M`${d3(k.V)}^2 = U^2 + ${sb(vyw)}^2`, r: M`U = ${d3(U)} [m s^-1]` });
    fixRows.push({ f: M`U = ${kd(kx)}`, s: M`${d3(U)} = ${kd(kx)}`, r: M`d = ${d3(dd)} [m]` });
  } else if (have(dd)) {
    U = snap(kx * dd); Vw = snap(Math.hypot(U, vyw));
    fixRows.push({ f: M`U = ${kd(kx)}`, s: M`${co(kx)} * ${d3(dd)}`, r: M`U = ${d3(U)} [m s^-1]` });
    fixRows.push({ f: M`v^2 = U^2 + v_y^2`, s: M`${d3(U)}^2 + ${sb(vyw)}^2`, r: M`v = ${d3(Vw)} [m s^-1]` });
  } else {
    return fail(`It lands ${M`${kd(R)}`} from O and goes up at ${M`${d3(V0)} [m s^-1]`}; the wall is ${M`${d3(H)} [m]`} high whatever ${M`d`} is. Still needed to draw it: its speed over the wall, or the length ${M`d`}.`);
  }
  const theta = snap(Math.atan2(V0, U) * DEG), u = snap(Math.hypot(U, V0));
  const Hmax = snap(V0 * V0 / (2 * g));
  notes.push(`With ${M`d = ${d3(dd)} [m]`}: across it moves at ${M`${d3(U)} [m s^-1]`}, the wall is ${M`${d3(m * dd)} [m]`} from O, and it lands ${M`${d3(R * dd)} [m]`} from O.`);
  notes.push(`It was projected at ${M`${d3(u)} [m s^-1]`}, ${M`${d3(theta)}°`} above the horizontal, and rises to ${M`${d3(Hmax)} [m]`}.`);
  const derived = [`${M`h = ${d3(H)} [m]`}`, have(k.V) ? `${M`d = ${d3(dd)} [m]`}` : `${M`v = ${d3(Vw)} [m s^-1]`}`];

  // the twelve's own projectile, and the wall-in-a-letter stage reading it
  // in the letter d, with the wall's height in metres
  const f0 = flight({ u, theta, h: 0, g });
  const f = { ...f0, kind: 'clears', letter: 'd', heightMetres: true, a: dd, P: m, Q: H / dd, R, wall: { x: m * dd, H }, Hmax, tWall: tw };
  return { ok: true, mode: 'flighttime', given: have(k.V) ? 'V' : 'd', T, kx, m, R, V0, tw, H, vyw, U, d: dd, Vw, u, theta, Hmax,
    rangeRows, wallRows, fixRows, notes, derived, f };
}

/** The working: the landing and the vertical component, the wall, then d. */
export function flightTimeWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'Where it lands, and how fast it goes up', rows: s.rangeRows,
      note: `Across, its velocity never changes. Up, it is back on the ground after ${M`${d3(s.T)} [s]`}, so ${M`s = 0`} then: the vertical component is ${M`gT/2`}.` },
    { title: 'The wall it just clears', rows: s.wallRows,
      note: `${M`d`} cancels in the time to the wall, so the wall's height is a number of metres, not a multiple of ${M`d`}.` },
    { title: s.given === 'V' ? `The length ${M`d`}, from its speed over the wall` : 'Its speed over the wall', rows: s.fixRows,
      note: `Over the wall its velocity has the across part ${M`U = ${kd(s.kx)}`} and the vertical part found here; the speed is the size of the two together.` },
  ];
}
