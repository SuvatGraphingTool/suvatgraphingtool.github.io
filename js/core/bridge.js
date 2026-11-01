// bridge.js — someone on a bridge throws a ball over a straight road just as
// a runner passes underneath; the runner, keeping a constant speed, catches it
// a time later, a given distance below where it was thrown. What was the
// throw? (OCR MEI H640/01 Jun 2024 Q14.)
//
// NO NEW PHYSICS. The ball is a projectile; the runner moves at a steady V.
// They start together (the runner directly below the thrower) and meet at the
// catch, so across they cover the same distance in the same time: the ball's
// horizontal velocity IS the runner's speed. Up, s = ut + ½at² over the time to
// the catch gives the vertical component; the two components give the speed
// and the angle. (A runner can only be under it the whole way if the ball is
// directly above the road, as the paper says.)
//
// CONVENTION. x along the road the way the runner goes, y up, both from the
// point of projection; t from the throw.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { flight } from './projectile.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d3(x)})` : d3(x));
const DEG = 180 / Math.PI;

/**
 * @param k { V, T, drop, g }
 *   V     the runner's constant speed (m s⁻¹)
 *   T     how long after the throw the runner catches it (s)
 *   drop  how far below the point of projection it is caught (m); negative: above
 */
export function solveBridge(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  if (!(g > 0)) return fail('The ball comes down because of gravity: give g as a size, such as 9.8.');
  if (!have(k.V)) return fail('Still needed: the runner’s speed.');
  if (!(k.V > 0)) return fail('The runner moves along the road: give the speed as a positive number.');
  if (!have(k.T)) return fail('Still needed: how long after the throw the runner catches it.');
  if (!(k.T > 0)) return fail('The catch is after the throw: give the time as a positive number of seconds.');
  if (!have(k.drop)) return fail('Still needed: how far below the point of projection the ball is caught.');
  if (!(k.drop > 0)) return fail('The runner is on the road below the bridge, so the ball is caught below the point of projection: give how far below as a positive number.');
  const V = k.V, T = k.T, drop = k.drop, sy = -drop;
  const uy = snap((sy + 0.5 * g * T * T) / T);
  const u = snap(Math.hypot(V, uy)), alpha = snap(Math.atan2(uy, V) * DEG);
  const rows = [
    { f: M`u_x = V`, s: M`u_x = ${d3(V)}`, r: M`u_x = ${d3(V)} [m s^-1]` },
    { f: M`s = ut + ½at^2`, s: M`${sb(sy)} = ${d3(T)}u_y - ½ * ${d3(g)} * ${d3(T)}^2`, r: M`u_y = ${d3(uy)} [m s^-1]` },
    { f: M`u = sqrt(u_x^2 + u_y^2)`, s: M`sqrt(${d3(V)}^2 + ${sb(uy)}^2)`, r: M`u = ${d3(u)} [m s^-1]` },
    { f: M`tan alpha = u_y/u_x`, s: M`${sb(uy)}/${d3(V)}`, r: M`alpha = ${num(alpha, 1)}°` },
  ];
  const notes = [];
  notes.push(`The runner and the ball start level across and meet at the catch, so across the ball keeps pace with the runner: its horizontal velocity is the runner’s ${M`${d3(V)} [m s^-1]`}.`);
  notes.push(`Thrown at ${M`${d3(u)} [m s^-1]`}, ${num(Math.abs(alpha), 1)}° ${alpha >= 0 ? 'above' : 'below'} the horizontal, it is caught ${M`${d3(snap(V * T))} [m]`} along the road.`);
  const top = uy > 0 ? snap(uy * uy / (2 * g)) : 0, tTop = uy > 0 ? snap(uy / g) : 0;
  if (uy > 0 && T > tTop) notes.push(`It rises ${M`${d3(top)} [m]`} above the point of projection, at ${M`t = ${d3(tTop)} [s]`}, before it comes down to the runner.`);
  // the twelve's projectile, from the point of projection (h = 0: heights are
  // measured from there, so the catch is at y = −drop)
  const f0 = flight({ u, theta: alpha, h: 0, g });
  const f = { ...f0, kind: 'bridge', tMax: T, tFlight: T, range: snap(V * T), V, T, drop, uy, ux: V, u, alpha, top, tTop, xCatch: snap(V * T),
    runner: (t) => V * Math.min(Math.max(t, 0), T),
    params: { ...f0.params } };
  const derived = [`${M`u_y = ${d3(uy)} [m s^-1]`}`, `${M`u = ${d3(u)} [m s^-1]`}`, `${M`alpha = ${num(alpha, 1)}°`}`];
  return { ok: true, mode: 'bridge', V, T, drop, uy, u, alpha, top, rows, notes, derived, f };
}

/** The working: across, up, then the speed and the angle. */
export function bridgeWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'Across: the ball keeps pace with the runner', rows: s.rows.slice(0, 1),
      note: 'They set off level and meet at the catch, the same distance along in the same time, so the horizontal velocity is the runner’s speed.' },
    { title: 'Up: the vertical component', rows: s.rows.slice(1, 2),
      note: `Up positive, ${M`a = -g`}; caught ${M`${d3(s.drop)} [m]`} below the point of projection, so ${M`s = ${d3(-s.drop)} [m]`}.` },
    { title: 'The speed and the angle of projection', rows: s.rows.slice(2),
      note: 'The two components are at right angles: the speed is the size of the two together, the angle the one whose tangent is up over across.' },
  ];
}
