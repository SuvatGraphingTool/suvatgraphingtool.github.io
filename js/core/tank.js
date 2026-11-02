// tank.js — a particle let go above a liquid (dropped from rest, or thrown
// straight down), falling freely to its surface, then on down through the
// liquid against a constant resistance to the bottom of the container: in the
// liquid its acceleration is g less the resistance per kilogram, which may
// still speed it up, or slow it. No instant change of speed at the surface.
// (Cambridge 9709/41 Oct/Nov 2014 Q6.)
//
// SUVAT, with the one-step link the build rules allow: in the liquid
// m g − R = m a (design/library/build-rules.md). Either the resistance is
// given and the acceleration found, or the acceleration and the resistance.
//
// CONVENTION. Down positive throughout, from where it is let go; t from then.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d(x)})` : d(x));

/**
 * @param k { h, u, D, m, R | aL, g }
 *   h  how far above the surface it is let go (m), 0 or more;  u  its speed then, straight down (blank: dropped from rest)
 *   D  the depth of the liquid (m);  m  its mass (kg)
 *   R  the resistance in the liquid (N) — or aL, its acceleration there, downwards (negative: slowing)
 */
export function solveTank(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  if (!have(k.h) || k.h < 0) return fail('Still needed: how far above the surface it is let go, 0 or more.');
  if (!have(k.D) || !(k.D > 0)) return fail('Still needed: the depth of the liquid, a positive number of metres.');
  const u = have(k.u) ? k.u : 0;
  if (u < 0) return fail('Its speed when let go is straight down: a size, 0 or more.');
  if (k.h === 0 && u === 0) return fail('Let go at the surface from rest, it enters the liquid with no speed: give it a height above the surface, or a speed.');
  if (have(k.R) && have(k.aL)) return fail('Give the resistance or its acceleration in the liquid, not both: each gives the other.');
  if (!have(k.R) && !have(k.aL)) return fail('Still needed: the resistance in the liquid, or its acceleration there.');
  if (have(k.m) && !(k.m > 0)) return fail('The mass is a positive number of kilograms.');
  if (have(k.R) && !have(k.m)) return fail('A resistance in newtons needs the mass, to give an acceleration.');
  if (have(k.R) && k.R < 0) return fail('The resistance is a size: 0 or more newtons.');
  if (have(k.aL) && k.aL > g + 1e-12) return fail(`Faster than ${M`g`} in the liquid the resistance would have to pull it down: a resistance acts against the motion.`);
  const { h, D } = k, m = have(k.m) ? k.m : null;

  // ── the air: free fall to the surface
  const v1 = snap(Math.sqrt(u * u + 2 * g * h)), t1 = snap((v1 - u) / g);
  const air = h > 0 ? [
    { f: M`v^2 = u^2 + 2as`, s: M`v^2 = ${d(u)}^2 + 2 * ${d(g)} * ${d(h)}`, r: M`v = ${d(v1)} [m s^-1]` },
    { f: M`v = u + at`, s: M`${d(v1)} = ${d(u)} + ${d(g)}t`, r: M`t = ${d(t1)} [s]` },
  ] : [];

  // ── the liquid: m g − R = m a, then to the bottom (or to rest short of it)
  const aL = have(k.aL) ? k.aL : snap(g - k.R / m), R = m != null ? snap(m * (g - aL)) : null;
  const law = have(k.aL)
    ? (m != null ? { f: M`m g - R = ma`, s: M`${d(m)} * ${d(g)} - R = ${d(m)} * ${sb(aL)}`, r: M`R = ${d(R)} [N]` } : null)
    : { f: M`m g - R = ma`, s: M`${d(m)} * ${d(g)} - ${d(k.R)} = ${d(m)}a`, r: M`a = ${d(aL)} [m s^-2]` };
  const liquid = law ? [law] : [];
  const v22 = v1 * v1 + 2 * aL * D;
  let v2, t2, stops = false, sStop = null;
  if (v22 <= 1e-9 && aL < 0) {
    // slowed to rest before the bottom: the paper's constant resistance has nothing to say after that
    stops = true; sStop = snap((v1 * v1) / (-2 * aL)); v2 = 0; t2 = snap(v1 / -aL);
    liquid.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${d(v1)}^2 + 2 * ${sb(aL)}s`, r: M`s = ${d(sStop)} [m]` });
    liquid.push({ f: M`v = u + at`, s: M`0 = ${d(v1)} + ${sb(aL)}t`, r: M`t = ${d(t2)} [s]` });
  } else {
    v2 = snap(Math.sqrt(Math.max(0, v22)));
    t2 = Math.abs(aL) < 1e-12 ? snap(D / v1) : snap((v2 - v1) / aL);
    liquid.push({ f: M`v^2 = u^2 + 2as`, s: M`v^2 = ${d(v1)}^2 + 2 * ${sb(aL)} * ${d(D)}`, r: M`v = ${d(v2)} [m s^-1]` });
    liquid.push(Math.abs(aL) < 1e-12 ? { f: M`s = ut`, s: M`${d(D)} = ${d(v1)}t`, r: M`t = ${d(t2)} [s]` }
      : { f: M`v = u + at`, s: M`${d(v2)} = ${d(v1)} + ${sb(aL)}t`, r: M`t = ${d(t2)} [s]` });
  }
  const tB = snap(t1 + t2), sIn = stops ? sStop : D;

  const pos = (t) => {
    if (t <= t1) { const c = Math.max(0, t); return u * c + 0.5 * g * c * c; }
    const c = Math.min(t, tB) - t1; return h + v1 * c + 0.5 * aL * c * c;
  };
  const vel = (t) => (t <= t1 ? u + g * Math.max(0, t) : t >= tB ? (stops ? 0 : v2) : v1 + aL * (t - t1));
  const acc = (t) => (t < t1 ? g : t < tB ? aL : 0);
  const tMax = snap(tB + Math.max(0.3, tB * 0.15));

  const how = aL > 1e-12 ? `still speeds up, at ${M`${d(aL)} [m s^-2]`}` : aL < -1e-12 ? `slows, at ${M`${d(-aL)} [m s^-2]`}` : 'goes on at a steady speed';
  const notes = [
    h > 0 ? `It falls freely ${M`${d(h)} [m]`} to the surface, reaching it at ${M`${d(v1)} [m s^-1]`} after ${M`${d(t1)} [s]`}.` : `It enters the liquid at ${M`${d(v1)} [m s^-1]`}.`,
    `In the liquid it ${how}${R != null ? `: the resistance, ${M`${d(R)} [N]`}, is ${R < m * g - 1e-9 ? 'less than' : R > m * g + 1e-9 ? 'more than' : 'equal to'} its weight, ${M`${d(snap(m * g))} [N]`}` : ''}.`,
    stops ? `It comes to rest ${M`${d(sStop)} [m]`} below the surface, short of the bottom, ${M`${d(tB)} [s]`} after it was let go; a resistance only acts on something moving, so what it does next the model does not say.`
      : `It reaches the bottom at ${M`${d(v2)} [m s^-1]`}, ${M`${d(tB)} [s]`} after it was let go.`,
  ];
  const derived = [...(R != null && have(k.aL) ? [M`R = ${d(R)} [N]`] : []), ...(!have(k.aL) ? [M`a = ${d(aL)} [m s^-2]`] : []),
    stops ? `at rest ${M`${d(sStop)} [m]`} down` : `${M`v = ${d(v2)} [m s^-1]`} at the bottom`];

  const f = { kind: 'tank', look: k.look, g, h, u, D, m, R, aL, v1, t1, v2, t2, tB, stops, sStop, sIn, pos, vel, acc,
    tMax, tFlight: tMax, tMid: snap((t1 + tB) / 2), params: { u: 0, theta: 0, h: 0, g },
    weight: m != null ? snap(m * g) : null, net: m != null ? snap(m * aL) : null, phase: (t) => (t < t1 ? 'air' : t < tB ? 'liquid' : stops ? 'rest' : 'bottom') };
  return { ok: true, mode: 'tank', v1, t1, aL, R, v2, t2, tB, stops, sStop, air, liquid, rows: [...air, ...liquid], notes, derived, f };
}

/** The working: through the air to the surface, then through the liquid. */
export function tankWorking(s) {
  if (!s?.ok) return [];
  return [
    ...(s.air.length ? [{ title: 'Through the air, to the surface', rows: s.air, note: `Down is positive. Falling freely, ${M`a = g`}.` }] : []),
    { title: s.stops ? 'Through the liquid, to rest' : 'Through the liquid, to the bottom', rows: s.liquid,
      note: `Down is positive still: its weight down, the resistance up. It enters the liquid at the speed it reached the surface with.` },
  ];
}
