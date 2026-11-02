// rough.js — a particle projected up a line of greatest slope of a rough
// plane: friction and the weight's component both act down the slope, so it
// decelerates to rest; then, if the slope is steep enough for the friction to
// be overcome (μ < tan α), it slides back down with friction now acting up the
// slope, and returns to the start more slowly than it left. (CIE 9709/41
// May/Jun 2017 Q2.)
//
// SUVAT with the one-step links the build rules allow: the normal reaction
// R = m g cos α, the friction F = μR, then F = ma along the slope
// (design/library/build-rules.md). The mass cancels from a, so it may be left
// out; given, R and F are found in newtons.
//
// CONVENTION. Up the slope positive, from where it is projected; α the angle
// to the horizontal; μ the coefficient of friction.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d(x)})` : d(x));
const D2R = Math.PI / 180;

/**
 * @param k { u, alpha, mu, m, g }
 *   u      its speed up the slope at the start (m s⁻¹)
 *   alpha  the slope's angle (°);  mu  the coefficient of friction
 *   m      its mass (kg) — optional: it cancels from the acceleration
 */
export function solveRough(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  if (!have(k.u) || !(k.u > 0)) return fail('Still needed: its speed up the slope at the start, a positive number.');
  if (!have(k.alpha) || !(k.alpha > 0 && k.alpha < 90)) return fail('Still needed: the slope’s angle, between 0° and 90°.');
  if (!have(k.mu) || !(k.mu >= 0)) return fail('Still needed: the coefficient of friction, 0 or more.');
  if (have(k.m) && !(k.m > 0)) return fail('The mass is a positive number of kilograms.');
  const { u, alpha, mu } = k, m = have(k.m) ? k.m : null;
  const sn = Math.sin(alpha * D2R), cs = Math.cos(alpha * D2R);
  const rows = [];

  // ── up the slope: the weight's component and the friction both down it
  const aUp = snap(-g * (sn + mu * cs));
  if (m != null) {
    const R = snap(m * g * cs), F = snap(mu * R);
    rows.push({ f: M`R = m g cos alpha`, s: M`R = ${d(m)} * ${d(g)} cos ${d(alpha)}°`, r: M`R = ${d(R)} [N]` });
    rows.push({ f: M`F = mu R`, s: M`F = ${d(mu)} * ${d(R)}`, r: M`F = ${d(F)} [N]` });
    rows.push({ f: M`-m g sin alpha - F = ma`, s: M`-${d(m)} * ${d(g)} sin ${d(alpha)}° - ${d(F)} = ${d(m)}a`, r: M`a = ${d(aUp)} [m s^-2]` });
  } else {
    rows.push({ f: M`-m g sin alpha - mu m g cos alpha = ma`, s: M`a = -${d(g)}(sin ${d(alpha)}° + ${d(mu)} cos ${d(alpha)}°)`, r: M`a = ${d(aUp)} [m s^-2]` });
  }
  const sUp = snap((u * u) / (-2 * aUp)), tUp = snap(u / -aUp);
  rows.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${d(u)}^2 + 2 * ${sb(aUp)}s`, r: M`s = ${d(sUp)} [m]` });
  rows.push({ f: M`v = u + at`, s: M`0 = ${d(u)} + ${sb(aUp)}t`, r: M`t = ${d(tUp)} [s]` });

  // ── at rest: does it stay? Friction can hold it only if μ ≥ tan α
  const tan = sn / cs, stays = mu >= tan - 1e-12;
  rows.push({ f: M`mu >= tan alpha "to stay"`, s: M`${d(mu)} ${stays ? '>=' : '<'} tan ${d(alpha)}° = ${d(snap(tan))}`, r: stays ? 'it stays at rest' : 'it slides back down' });
  let aDown = null, vBack = null, tDown = null;
  if (!stays) {
    // ── back down: the weight's component down, the friction now up the slope
    aDown = snap(-g * (sn - mu * cs));
    tDown = snap(Math.sqrt((2 * sUp) / -aDown));
    vBack = snap(Math.sqrt(-2 * aDown * sUp));
    rows.push({ f: M`-m g sin alpha + mu m g cos alpha = ma`, s: M`a = -${d(g)}(sin ${d(alpha)}° - ${d(mu)} cos ${d(alpha)}°)`, r: M`a = ${d(aDown)} [m s^-2]` });
    rows.push({ f: M`v^2 = u^2 + 2as`, s: M`v^2 = 0 + 2 * ${sb(aDown)} * (-${d(sUp)})`, r: M`v = -${d(vBack)} [m s^-1]` });
    rows.push({ f: M`s = ut + ½at^2`, s: M`-${d(sUp)} = ½ * ${sb(aDown)}t^2`, r: M`t = ${d(tDown)} [s]` });
  }
  const tMax = snap(tUp + (stays ? Math.max(1, tUp * 0.4) : tDown));

  const notes = [
    `Up the slope, the weight's component and the friction both act against it: a deceleration of ${M`${d(-aUp)} [m s^-2]`}. It comes to rest ${M`${d(sUp)} [m]`} up the slope after ${M`${d(tUp)} [s]`}.`,
    stays ? `There ${M`mu = ${d(mu)}`} is at least ${M`tan ${d(alpha)}° = ${d(snap(tan))}`}, so friction can hold it: it stays at rest.`
      : `There ${M`mu = ${d(mu)}`} is less than ${M`tan ${d(alpha)}° = ${d(snap(tan))}`}: it slides back, with friction now acting up the slope, accelerating at only ${M`${d(-aDown)} [m s^-2]`}. It is back at the start after another ${M`${d(tDown)} [s]`}, at ${M`${d(vBack)} [m s^-1]`} — slower than it left.`,
  ];
  if (m != null) notes.push(`On ${M`${d(m)} [kg]`} the normal reaction is ${M`${d(snap(m * g * cs))} [N]`} and the friction ${M`${d(snap(mu * m * g * cs))} [N]`}.`);
  const derived = [`${M`a = ${d(aUp)} [m s^-2]`}`, `${M`${d(sUp)} [m]`} up the slope`, stays ? 'stays at rest' : `back at ${M`${d(vBack)} [m s^-1]`}`];

  const tTop = tUp;
  const pos = (t) => {
    const c = Math.min(Math.max(t, 0), tMax);
    if (c <= tTop) return u * c + 0.5 * aUp * c * c;
    if (stays) return sUp;
    const s = c - tTop; return sUp + 0.5 * aDown * s * s;
  };
  const vel = (t) => { const c = Math.min(Math.max(t, 0), tMax); return c <= tTop ? u + aUp * c : stays ? 0 : aDown * (c - tTop); };
  const acc = (t) => (t <= tTop ? aUp : stays ? 0 : aDown);
  const f = { kind: 'rough', u, alpha, mu, m, g, aUp, aDown, sUp, tUp, tDown, vBack, stays, tTop, tMax, tFlight: tMax, pos, vel, acc,
    N: m != null ? snap(m * g * cs) : null, Fr: m != null ? snap(mu * m * g * cs) : null, W: m != null ? snap(m * g * sn) : null,
    params: { u, theta: 0, h: 0, g } };
  return { ok: true, mode: 'rough', a: aUp, decel: snap(-aUp), sUp, tUp, stays, aDown, vBack, tDown, R: f.N, F: f.Fr, rows, notes, derived, f };
}

/** The working: R, F = μR, F = ma up the slope, SUVAT to rest; then back down, if it goes. */
export function roughWorking(s) {
  if (!s?.ok) return [];
  const up = s.rows.findIndex((r) => /tan/.test(r.f));
  return [
    { title: 'Up the slope: friction and weight both against it', rows: s.rows.slice(0, up + 1),
      note: `Up the slope is positive. Perpendicular to the slope nothing moves, so ${M`R = m g cos alpha`}; sliding, the friction is ${M`mu R`}, against the motion.` },
    ...(s.stays ? [] : [{ title: 'Back down: friction now up the slope', rows: s.rows.slice(up + 1),
      note: 'Friction always opposes the sliding: on the way down it acts up the slope, so it speeds up more gently than it slowed down.' }]),
  ];
}
