// slide.js — a particle released from rest that slides down a line of greatest
// slope of a rough plane: the weight's component down the slope, friction up
// it, a constant acceleration g(sin α − μ cos α). Either way round: from μ the
// acceleration and then the motion; or from the motion (two of the distance,
// the time and the speed at the end) the acceleration and then μ.
// (Edexcel 6677 M1 Jan 2004 Q3, Jan 2010 Q5, Jan 2013 Q4.)
//
// SUVAT with the one-step links the build rules allow: R = m g cos α, F = μR,
// and F = ma along the slope (design/library/build-rules.md). The twelve's
// solver (js/core/suvat.js `solve`) does the motion, with its working. The mass
// cancels from the acceleration, so it may be left out; given, the forces are
// found in newtons.
//
// CONVENTION. Down the slope positive, from where it is let go; α the angle
// to the horizontal; μ the coefficient of friction.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solve } from './suvat.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const D2R = Math.PI / 180;
const UNIT = { s: 'm', a: 'm s^-2', v: 'm s^-1', u: 'm s^-1', t: 's' };
export const LOOKS = ['slipway', 'roof', 'plane'];

/**
 * @param k { look, alpha, mu, s, t, v, m, g }
 *   alpha  the slope's angle (°)
 *   mu     the coefficient of friction — or leave it out and give two of s, t, v
 *   s, t, v  the run: how far it slides, for how long, and how fast it is at the end
 *   m      its mass (kg) — optional: it cancels from the acceleration
 */
export function solveSlide(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  const look = LOOKS.includes(k.look) ? k.look : 'slipway';
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  if (!have(k.alpha)) return fail('Still needed: the slope’s angle.');
  if (!(k.alpha > 0 && k.alpha < 90)) return fail('A slope’s angle is between 0° and 90°.');
  if (have(k.mu) && !(k.mu >= 0)) return fail('A coefficient of friction is 0 or more.');
  if (have(k.m) && !(k.m > 0)) return fail('The mass is a positive number of kilograms.');
  for (const [q, what] of [['s', 'How far it slides'], ['t', 'The time'], ['v', 'Its speed at the end']]) {
    if (have(k[q]) && !(k[q] > 0)) return fail(`${what} is a positive number: it is let go from rest and slides down.`);
  }
  const alpha = k.alpha, m = have(k.m) ? k.m : null, sn = Math.sin(alpha * D2R), cs = Math.cos(alpha * D2R), tan = sn / cs;
  const run = ['s', 't', 'v'].filter((q) => have(k[q]));
  const forces = [], motion = [];
  let a, mu;

  if (have(k.mu)) {
    // ── μ given: the forces give the acceleration, and one of the run the rest
    mu = k.mu;
    if (mu >= tan - 1e-12) return fail(`Here ${M`mu = ${d(mu)}`} is at least ${M`tan ${d(alpha)}° = ${d(snap(tan))}`}: friction can hold it, so let go from rest it never starts to slide.`);
    if (run.length === 0) return fail('Still needed: one of how far it slides, for how long, or how fast it is at the end.');
    if (run.length > 1) return fail('With the coefficient of friction given, give just one of the distance, the time and the speed at the end: the friction fixes the acceleration, and one more fixes the run.');
    a = snap(g * (sn - mu * cs));
    if (m != null) {
      const R = snap(m * g * cs), F = snap(mu * R);
      forces.push({ f: M`R = m g cos alpha`, s: M`R = ${d(m)} * ${d(g)} cos ${d(alpha)}°`, r: M`R = ${d(R)} [N]` });
      if (mu > 0) forces.push({ f: M`F = mu R`, s: M`F = ${d(mu)} * ${d(R)}`, r: M`F = ${d(F)} [N]` });
      forces.push(mu > 0 ? { f: M`m g sin alpha - F = ma`, s: M`${d(m)} * ${d(g)} sin ${d(alpha)}° - ${d(F)} = ${d(m)}a`, r: M`a = ${d(a)} [m s^-2]` }
        : { f: M`m g sin alpha = ma`, s: M`a = ${d(g)} sin ${d(alpha)}°`, r: M`a = ${d(a)} [m s^-2]` });
    } else {
      forces.push(mu > 0 ? { f: M`m g sin alpha - mu m g cos alpha = ma`, s: M`a = ${d(g)}(sin ${d(alpha)}° - ${d(mu)} cos ${d(alpha)}°)`, r: M`a = ${d(a)} [m s^-2]` }
        : { f: M`m g sin alpha = ma`, s: M`a = ${d(g)} sin ${d(alpha)}°`, r: M`a = ${d(a)} [m s^-2]` });
    }
  } else {
    // ── μ to be found: two of the run give the acceleration, F = ma gives μ
    if (run.length < 2) return fail(`Still needed: the coefficient of friction — or ${run.length ? 'one more' : 'two'} of how far it slides, for how long, and how fast it is at the end, and the engine finds it.`);
    if (run.length > 2) return fail('Give two of the distance, the time and the speed at the end: from rest, any two fix the third.');
  }

  // ── the run, from rest
  const known = { u: 0 };
  for (const q of run) known[q] = k[q];
  if (a != null) known.a = a;
  const r = solve(known);
  if (!r.ok) return fail('No slide from rest fits those numbers. Check them.');
  const { s, v, t } = r.values;
  if (a == null) a = snap(r.values.a);
  if (!(s > 0 && t > 0)) return fail('No slide from rest fits those numbers. Check them.');
  motion.push(...r.steps.map((st) => ({ f: st.formula, s: st.substitution, r: M`${st.target} = ${d(snap(st.value))} [${UNIT[st.target]}]` })));

  if (mu == null) {
    const top = g * sn;
    if (!(a > 0)) return fail('Let go from rest it must speed up: those numbers give no acceleration down the slope.');
    if (a > top + 1e-9) return fail(`Even with no friction it speeds up at only ${M`g sin alpha = ${d(snap(top))} [m s^-2]`} on this slope: ${M`${d(a)} [m s^-2]`} is too fast.`);
    mu = snap(Math.max(0, (top - a) / (g * cs)));
    forces.push(m != null
      ? { f: M`m g sin alpha - mu m g cos alpha = ma`, s: M`${d(m)} * ${d(g)} sin ${d(alpha)}° - mu * ${d(m)} * ${d(g)} cos ${d(alpha)}° = ${d(m)} * ${d(a)}`, r: M`mu = ${d(mu)}` }
      : { f: M`m g sin alpha - mu m g cos alpha = ma`, s: M`mu = (${d(g)} sin ${d(alpha)}° - ${d(a)})/(${d(g)} cos ${d(alpha)}°)`, r: M`mu = ${d(mu)}` });
  }

  const N = m != null ? snap(m * g * cs) : null, Fr = m != null ? snap(mu * m * g * cs) : null, W = m != null ? snap(m * g * sn) : null;
  const T = snap(t), S = snap(s), V = snap(v);
  const notes = [
    mu === 0 ? `With no friction only the weight's component acts along the slope: it speeds up at ${M`g sin alpha = ${d(a)} [m s^-2]`}.`
      : `Down the slope the weight's component pulls it on and friction, ${M`mu R`}, holds it back: it speeds up at ${M`${d(a)} [m s^-2]`}, less than the ${M`${d(snap(g * sn))} [m s^-2]`} of a smooth slope.`,
    `From rest it slides ${M`${d(S)} [m]`} in ${M`${d(T)} [s]`}, reaching ${M`${d(V)} [m s^-1]`}.`,
    have(k.mu) ? 'The mass cancels: a particle twice as heavy slides with the same acceleration.' : `So the coefficient of friction is ${M`mu = ${d(mu)}`}.`,
  ];
  if (m != null) notes.push(`On ${M`${d(m)} [kg]`}: the weight's component down the slope is ${M`${d(W)} [N]`}, the normal reaction ${M`${d(N)} [N]`}${mu > 0 ? `, and the friction up the slope ${M`${d(Fr)} [N]`}` : ''}.`);
  const derived = [`${M`a = ${d(a)} [m s^-2]`}`, `${M`${d(S)} [m]`} in ${M`${d(T)} [s]`}`, `${M`v = ${d(V)} [m s^-1]`}`, `${M`mu = ${d(mu)}`}`];

  const pos = (tt) => { const c = Math.min(Math.max(tt, 0), T); return 0.5 * a * c * c; };
  const vel = (tt) => a * Math.min(Math.max(tt, 0), T);
  const acc = () => a;
  const f = { kind: 'slide', look, alpha, mu, m, g, a, s: S, t: T, v: V, N, Fr, W, tMax: T, tFlight: T, tMid: snap(T / 2), pos, vel, acc,
    muGiven: have(k.mu), params: { u: 0, theta: 0, h: 0, g } };
  return { ok: true, mode: 'slide', a, mu, s: S, t: T, v: V, R: N, F: Fr, W, forces, motion, rows: [...forces, ...motion], notes, derived, f };
}

/** The working: the forces and the acceleration, and the run from rest — in the order the paper goes. */
export function slideWorking(sv) {
  if (!sv?.ok) return [];
  const forceStep = { title: sv.f.muGiven ? 'Down the slope: the forces give the acceleration' : 'Down the slope: F = ma gives the coefficient of friction', rows: sv.forces,
    note: `Down the slope is positive. Across it nothing moves, so ${M`R = m g cos alpha`}; sliding, the friction is ${M`mu R`}, up the slope against the motion.` };
  const runStep = { title: 'From rest: the run down the slope', rows: sv.motion, note: `Let go from rest, so ${M`u = 0`}.` };
  return sv.f.muGiven ? [forceStep, runStep] : [runStep, forceStep];
}
