// catch.js — a ball thrown, and someone (a dog, a fielder) who sets off along
// the ground after it and catches it at a given height.
//
// Two motions, each one the site already has: the ball is the twelve's
// projectile (flight, js/core/projectile.js); the catcher runs along the level
// ground from beside the thrower, from rest or a given speed, with a constant
// acceleration, setting off a given time after the throw. The catch is where
// they meet: the moment the ball comes down to the catch height (from its
// vertical motion alone) fixes the time, its horizontal motion the place, and
// the catcher's one equation, s = u(t − t₀) + ½a(t − t₀)², the number the
// paper hides — the acceleration, the start speed, or the delay — or, with all
// of those given, how far the catcher is from the ball then.
//
// CONVENTION. Up and forwards (the way it is thrown) are positive; the
// ground is level at height 0; g > 0.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { flight } from './projectile.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const sgn = (x) => (d(x).startsWith('−') ? `(${d(x)})` : d(x));
const EPS = 1e-9;

export const FINDS = { a: 'acceleration', u: 'starting speed', t0: 'delay' };

/**
 * @param k { g, h, u, theta, yc, c: { t0, u, a }, find: 'a' | 'u' | 't0' | null }
 *   h, u, theta — the throw; yc — the height the ball is caught at;
 *   c — the catcher (blank t0 and u are 0).
 */
export function solveCatch(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const c = k.c || {}, find = FINDS[k.find] ? k.find : null;
  if (!have(k.g) || !(k.g > 0)) return fail('Choose the value of g the paper uses.');
  if (!have(k.u) || !(k.u > 0)) return fail('Still needed: the speed it is thrown at.');
  if (!have(k.theta) || !(k.theta > 0 && k.theta < 90)) return fail('The ball is thrown forwards and upwards: give an angle between 0° and 90°.');
  const h = have(k.h) ? k.h : 0;
  if (h < 0) return fail('It is thrown from at or above the ground: give the height as 0 or more.');
  if (!have(k.yc)) return fail('Still needed: the height the ball is caught at.');
  if (k.yc < 0) return fail('It is caught at or above the ground: give that height as 0 or more.');

  const f = flight({ u: k.u, theta: k.theta, h, g: k.g });
  const ux = snap(f.ux), uy = snap(f.uy), g = k.g;
  if (k.yc > f.apexHeight + 1e-9) return fail(`The ball only rises to ${M`${d(snap(f.apexHeight))} [m]`}: it is never ${M`${d(k.yc)} [m]`} up.`);
  // caught on the way down: the later time it is at that height
  const tc = snap((uy + Math.sqrt(uy * uy + 2 * g * (h - k.yc))) / g);
  const xc = snap(ux * tc);
  const t0 = have(c.t0) ? c.t0 : 0, cu = have(c.u) ? c.u : 0;
  if (find !== 't0' && t0 < 0) return fail('The catcher sets off at or after the throw: give the delay as 0 or more.');
  if (find !== 'u' && cu < 0) return fail('The catcher runs forwards: give its starting speed as 0 or more.');
  if (find !== 't0' && t0 >= tc - EPS) return fail(`The ball is caught at ${M`t = ${d(tc)} [s]`}, before the catcher has even set off.`);

  const rows = [
    { f: M`u_x = u cos theta, u_y = u sin theta`, s: M`${d(k.u)} cos ${d(k.theta)}°, ${d(k.u)} sin ${d(k.theta)}°`, r: M`${d(ux)}, ${d(uy)} [m s^-1]` },
    { f: M`y = h + u_y t - ½gt^2`, s: M`${d(k.yc)} = ${Math.abs(h) > EPS ? `${d(h)} + ` : ''}${d(uy)}t - ½ * ${d(g)}t^2`, r: M`t = ${d(tc)} [s]` },
    { f: M`x = u_x t`, s: M`${d(ux)} * ${d(tc)}`, r: M`x = ${d(xc)} [m]` },
  ];
  let a = c.a, catcherRows = [], gap = null;
  const T = tc - t0;
  if (find === 'a') {
    a = snap(2 * (xc - cu * T) / (T * T));
    catcherRows = [{ f: M`s = u(t - t_0) + ½a(t - t_0)^2`, s: M`${d(xc)} = ${Math.abs(cu) > EPS ? `${d(cu)} * ${d(T)} + ` : ''}½a * ${d(T)}^2`, r: M`a = ${d(a)} [m s^-2]` }];
    if (a < -EPS) return fail(`Even without speeding up the catcher would be past the ball: it would need an acceleration of ${M`${d(a)} [m s^-2]`}, slowing down.`);
  } else if (find === 'u') {
    if (!have(c.a)) return fail('To find the starting speed, give the acceleration.');
    const u2 = snap((xc - 0.5 * c.a * T * T) / T);
    if (u2 < -EPS) return fail(`At that acceleration it covers more than the ${M`${d(xc)} [m]`} even from rest: no starting speed fits.`);
    catcherRows = [{ f: M`s = u(t - t_0) + ½a(t - t_0)^2`, s: M`${d(xc)} = ${d(T)}u + ½ * ${d(c.a)} * ${d(T)}^2`, r: M`u = ${d(u2)} [m s^-1]` }];
    c.u = u2;
  } else if (find === 't0') {
    if (!have(c.a)) return fail('To find the delay, give the acceleration.');
    // ½aτ² + uτ − x = 0 for its running time τ
    const A = 0.5 * c.a, B = cu, C = -xc;
    const tau = Math.abs(A) < EPS ? (B > EPS ? xc / B : NaN) : (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
    if (!(tau > 0)) return fail('At that speed and acceleration the catcher never gets there.');
    const t0f = snap(tc - tau);
    if (t0f < -1e-9) return fail(`It would need ${M`${d(snap(tau))} [s]`} to run there, longer than the ball's ${M`${d(tc)} [s]`}: it would have to set off before the throw.`);
    catcherRows = [{ f: M`s = ut + ½at^2`, s: M`${d(xc)} = ${Math.abs(cu) > EPS ? `${d(cu)}t + ` : ''}½ * ${d(c.a)}t^2`, r: M`t = ${d(snap(tau))} [s]` },
      { f: M`t_0 = t_c - t`, s: M`${d(tc)} - ${d(snap(tau))}`, r: M`t_0 = ${d(t0f)} [s]` }];
    c.t0 = t0f;
  } else {
    if (!have(c.a)) return fail('Give the catcher’s acceleration, or choose it as the number to find.');
    const xd = snap(cu * T + 0.5 * c.a * T * T);
    gap = snap(xd - xc);
    catcherRows = [{ f: M`s = u(t - t_0) + ½a(t - t_0)^2`, s: M`${Math.abs(cu) > EPS ? `${d(cu)} * ${d(T)} + ` : ''}½ * ${sgn(c.a)} * ${d(T)}^2`, r: M`s = ${d(xd)} [m]` }];
  }
  const C = { t0: have(c.t0) ? c.t0 : 0, u: have(c.u) ? c.u : 0, a: find === 'a' ? a : c.a };
  const runT = (t) => Math.max(0, t - C.t0);
  const cx = (t) => C.u * runT(t) + 0.5 * C.a * runT(t) * runT(t);
  const cv = (t) => (t < C.t0 ? 0 : C.u + C.a * runT(t));
  const ca = (t) => (t < C.t0 ? 0 : C.a);

  const notes = [
    `The ball comes down to ${M`${d(k.yc)} [m]`} at ${M`t = ${d(tc)} [s]`}, ${M`${d(xc)} [m]`} from the throw.`,
    find === 'a' ? `To be there then, the catcher needs an acceleration of ${M`${d(a)} [m s^-2]`} over its ${M`${d(snap(T))} [s]`} of running.`
      : find === 'u' ? `To be there then, it must start at ${M`${d(C.u)} [m s^-1]`}.`
        : find === 't0' ? `To be there then, it must set off ${M`${d(C.t0)} [s]`} after the throw.`
          : Math.abs(gap) < 1e-6 ? 'The catcher is there at that moment: it catches it.'
            : Math.abs(gap) < 1e-3 * Math.max(1, xc) ? `The catcher is within ${M`${d(Math.abs(gap))} [m]`} of it then — to the figures given, it catches it.`
            : `The catcher is ${M`${d(Math.abs(gap))} [m]`} ${gap > 0 ? 'past' : 'short of'} that point then, so it ${gap > 0 ? 'has run past it' : 'misses it'}.`,
  ];
  const derived = [`${M`t = ${d(tc)} [s]`}`, `${M`x = ${d(xc)} [m]`}`,
    find === 'a' ? M`a = ${d(a)} [m s^-2]` : find === 'u' ? M`u = ${d(C.u)} [m s^-1]` : find === 't0' ? M`t_0 = ${d(C.t0)} [s]` : (Math.abs(gap) < 1e-3 * Math.max(1, xc) ? 'caught' : `${M`${d(Math.abs(gap))} [m]`} ${gap > 0 ? 'past' : 'short'}`)];
  const tMax = tc;
  const motion = {
    kind: 'catch', tMax, tFlight: tMax, params: f.params, g,
    ball: { pos: (t) => f.pos(Math.min(t, tMax)), vel: (t) => f.vel(Math.min(t, tMax)) },
    dog: { pos: cx, vel: cv, acc: ca, t0: C.t0 },
    catchAt: { t: tc, x: xc, y: k.yc }, apex: { t: f.tApex, y: f.apexHeight, x: ux * f.tApex }, h, gap,
    pos: (t) => f.pos(Math.min(t, tMax)), vel: (t) => f.vel(Math.min(t, tMax)),
    bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
  };
  return {
    ok: true, mode: 'catch', axis: 'plane', f: motion, find, tc, xc, catcher: C, gap,
    rows, catcherRows, notes, derived, params: f.params,
    convention: 'Up and forwards are positive; the ground is level.',
  };
}

export function catchWorking(solved) {
  if (!solved?.ok) return [];
  return [
    { title: 'When and where the ball is caught', rows: solved.rows,
      note: 'The vertical motion alone says when it is at the catch height — the later of the two times, on the way down; the horizontal motion says how far it has gone.' },
    { title: solved.find ? `The catcher’s ${FINDS[solved.find]}` : 'Where the catcher is then', rows: solved.catcherRows,
      note: `The catcher runs for the time from setting off, ${M`t - t_0`}, along the same line from the throw${solved.find === 't0' ? `; ${M`t_c`} is the moment of the catch` : ''}.` },
  ];
}
