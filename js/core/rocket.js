// rocket.js — a firework rocket from rest at ground level: driven straight up
// with a constant acceleration until it burns out, then moving freely under
// gravity. Its acceleration and speed at burn-out, its height at any moment
// after, the top and when it comes down. (Edexcel M1 Jan 2008 Q2.)
//
// NO NEW PHYSICS. Two stages of constant acceleration, one after the other:
// up at a for T seconds from rest (s = ½aT², v = aT), then −g from that height
// and speed — the rest is the twelve's vertical throw from a height.
//
// CONVENTION. Heights up from the ground; t from the launch.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d3(x)})` : d3(x));

/**
 * @param k { T, s1, a, v1, at, g }
 *   T    how long it is driven, from the launch to burn-out (s)
 *   s1   how high it is at burn-out (m) — or a, its acceleration — or v1, its speed at burn-out
 *   at   a moment to ask its height at (s, from the launch)
 */
export function solveRocket(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  if (!(g > 0)) return fail('It comes back down because of gravity: give g as a size, such as 9.8.');
  if (!have(k.T) || !(k.T > 0)) return fail('Still needed: how long it is driven up before it burns out, a positive number of seconds.');
  const given = ['s1', 'a', 'v1'].filter((q) => have(k[q]));
  if (given.length !== 1) return fail(given.length ? 'Give one of the height at burn-out, the acceleration, or the speed at burn-out: any one fixes the others.' : 'Still needed: how high it is when it burns out, its acceleration, or its speed then.');
  if (!(k[given[0]] > 0)) return fail('It is driven upwards: give that as a positive number.');
  const T = k.T, rows = [];
  let a;
  if (have(k.s1)) { a = snap(2 * k.s1 / (T * T)); rows.push({ f: M`s = ut + ½at^2`, s: M`${d3(k.s1)} = 0 + ½a * ${d3(T)}^2`, r: M`a = ${d3(a)} [m s^-2]` }); }
  else if (have(k.v1)) { a = snap(k.v1 / T); rows.push({ f: M`v = u + at`, s: M`${d3(k.v1)} = 0 + ${d3(T)}a`, r: M`a = ${d3(a)} [m s^-2]` }); }
  else a = k.a;
  const v1 = snap(a * T), s1 = snap(0.5 * a * T * T);
  if (!have(k.v1)) rows.push({ f: M`v = u + at`, s: M`0 + ${d3(a)} * ${d3(T)}`, r: M`v = ${d3(v1)} [m s^-1]` });
  if (!have(k.s1)) rows.push({ f: M`s = ut + ½at^2`, s: M`0 + ½ * ${d3(a)} * ${d3(T)}^2`, r: M`s = ${d3(s1)} [m]` });
  // after burn-out: up at v1 from s1, a = −g
  const rise = snap(v1 * v1 / (2 * g)), Htop = snap(s1 + rise), tTop = snap(T + v1 / g);
  const tFall = snap((v1 + Math.sqrt(v1 * v1 + 2 * g * s1)) / g), tLand = snap(T + tFall);
  const freeRows = [
    { f: M`v^2 = u^2 + 2as`, s: M`0 = ${d3(v1)}^2 - 2 * ${d3(g)}s`, r: M`s = ${d3(rise)} [m]` },
    { f: M`H = s_1 + s`, s: M`${d3(s1)} + ${d3(rise)}`, r: M`H = ${d3(Htop)} [m]` },
    { f: M`s = ut + ½at^2`, s: M`${sb(-s1)} = ${d3(v1)}t - ½ * ${d3(g)}t^2`, r: M`t = ${d3(tFall)} [s] "after burn-out"` },
  ];
  const pos = (t) => { const c = Math.min(Math.max(t, 0), tLand); return c <= T ? 0.5 * a * c * c : Math.max(0, s1 + v1 * (c - T) - 0.5 * g * (c - T) ** 2); };
  const vel = (t) => { const c = Math.min(Math.max(t, 0), tLand); return c <= T ? a * c : v1 - g * (c - T); };
  let at = null;
  if (have(k.at)) {
    if (!(k.at >= 0)) return fail('Ask about a moment after the launch: give the time as 0 or more.');
    if (k.at > tLand + 1e-9) return fail(`It is back on the ground ${M`${d3(tLand)} [s]`} after the launch: ask about a moment before that.`);
    const y = snap(pos(k.at)), tt = snap(k.at - T);
    at = { t: k.at, y, v: snap(vel(k.at)) };
    if (k.at > T) {
      const sAfter = snap(v1 * tt - 0.5 * g * tt * tt);
      freeRows.push({ f: M`s = ut + ½at^2`, s: M`${d3(v1)} * ${d3(tt)} - ½ * ${d3(g)} * ${d3(tt)}^2`, r: M`s = ${d3(sAfter)} [m]` });
      freeRows.push({ f: M`h = s_1 + s`, s: M`${d3(s1)} + ${sb(sAfter)}`, r: M`h = ${d3(y)} [m]` });
    } else rows.push({ f: M`s = ut + ½at^2`, s: M`0 + ½ * ${d3(a)} * ${d3(k.at)}^2`, r: M`h = ${d3(y)} [m]` });
  }
  const notes = [
    `Driven up at ${M`${d3(a)} [m s^-2]`} for ${M`${d3(T)} [s]`}, it burns out ${M`${d3(s1)} [m]`} up, rising at ${M`${d3(v1)} [m s^-1]`}.`,
    `It coasts on up to ${M`${d3(Htop)} [m]`}, at ${M`t = ${d3(tTop)} [s]`}, and is back on the ground at ${M`t = ${d3(tLand)} [s]`}.`,
  ];
  if (at) notes.push(`At ${M`t = ${d3(at.t)} [s]`} it is ${M`${d3(at.y)} [m]`} above the ground, ${at.v > 1e-9 ? 'still rising' : at.v < -1e-9 ? 'falling' : 'at the top'}.`);
  const f = { kind: 'rocket', g, T, a, s1, v1, Htop, tTop, tLand, tMax: tLand, at,
    pos: (t) => ({ x: 0, y: pos(t) }), vel: (t) => ({ x: 0, y: vel(t) }), accel: (t) => (t <= T ? a : -g),
    params: { u: 0, theta: 90, h: 0, g } };
  const derived = [`${M`a = ${d3(a)} [m s^-2]`}`, `${M`v = ${d3(v1)} [m s^-1]`}`, ...(at ? [`${M`h = ${d3(at.y)} [m]`}`] : [])];
  return { ok: true, mode: 'rocket', a, v1, s1, Htop, tTop, tLand, at, atY: at ? at.y : null, rows, freeRows, notes, derived, f };
}

/** The working: the driven stage, then the free one. */
export function rocketWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'Driven up, to burn-out', rows: s.rows, note: `From rest, with the rocket's own constant acceleration ${M`a`}, up positive.` },
    { title: 'After burn-out: moving freely', rows: s.freeRows, note: `Now ${M`a = -g`}: from the burn-out height, starting at the burn-out speed, up positive. A height below the start is negative.` },
  ];
}
