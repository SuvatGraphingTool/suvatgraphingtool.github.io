// hill.js — a cyclist freewheeling straight down a slope with a constant
// acceleration: from its speeds over a distance, the acceleration and the
// time (SUVAT); the resultant force on cyclist and bike (F = ma); and the
// slope's angle, with no resistance or against a stated one — the weight's
// component down the slope less the resistance is the resultant. Or the other
// way: from the angle and the resistance, the acceleration, then SUVAT.
// (AQA MM1B Jan 2012 Q6.)
//
// SUVAT with the one-step link the build rules allow: F = ma, including a
// weight's component on a slope (design/library/build-rules.md). The twelve's
// solver (js/core/suvat.js `solve`) does the motion from any three of the
// five, with its working.
//
// CONVENTION. Down the slope positive, from the start; α the slope's angle to
// the horizontal; R the resistance's size, acting up the slope.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solve } from './suvat.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const D2R = Math.PI / 180;
const UNIT = { s: 'm', a: 'm s^-2', v: 'm s^-1', u: 'm s^-1', t: 's' };

/**
 * @param k { u, v, s, t, a, m, R, alpha, g }
 *   two or three of u, v, s, t, a for the motion down the slope
 *   m      the mass of cyclist and bike (kg)
 *   R      a constant resistance up the slope (N); blank: none
 *   alpha  the slope's angle (°) — given, it fixes a, and two of the five do the rest
 */
export function solveHill(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  const R = have(k.R) ? k.R : 0, resisted = have(k.R);
  if (R < 0) return fail('The resistance is a size: 0 or more.');
  if (have(k.m) && !(k.m > 0)) return fail('The mass is a positive number of kilograms.');
  const rows = [];
  const known = {};
  for (const q of ['u', 'v', 's', 't', 'a']) if (have(k[q])) known[q] = k[q];
  let alpha = null;

  // ── the angle given: F = ma gives the acceleration first
  if (have(k.alpha)) {
    if (!(k.alpha > 0 && k.alpha < 90)) return fail('The slope’s angle is between 0° and 90°.');
    if (have(known.a)) return fail('With the angle given, the acceleration follows from it: leave a blank.');
    if (resisted && R > 0 && !have(k.m)) return fail('Against a resistance, the mass is needed too: the resistance’s share of the acceleration is R over m.');
    alpha = k.alpha;
    const m = have(k.m) ? k.m : 1, a = snap(g * Math.sin(alpha * D2R) - R / m);
    rows.push(R > 0
      ? { f: M`m g sin alpha - R = ma`, s: M`${d(m)} * ${d(g)} * sin ${d(alpha)}° - ${d(R)} = ${d(m)}a`, r: M`a = ${d(a)} [m s^-2]` }
      : { f: M`m g sin alpha = ma`, s: M`a = ${d(g)} sin ${d(alpha)}°`, r: M`a = ${d(a)} [m s^-2]` });
    known.a = a;
  }

  const n = Object.keys(known).length;
  if (n < 3) return fail(`Still needed: ${3 - n} more of its speed at the top, its speed at the bottom, the distance, the time${have(k.alpha) ? '' : ' and the acceleration'}.`);
  if (n > 3) return fail(have(k.alpha) ? 'With the angle given, give two of the speeds, the distance and the time: the angle fixes the acceleration.' : 'Give three of the five for the run down the slope: any three fix the other two.');
  if (have(known.u) && known.u < 0) return fail('It freewheels down the slope: its starting speed is 0 or more.');
  const r = solve(known);
  if (!r.ok) {
    // slowing down on a gentle slope against a resistance, it can stop short of the end
    if (have(known.u) && known.a < 0 && have(known.s) && known.u * known.u + 2 * known.a * known.s < 0) {
      return fail(`It slows down at ${M`${d(-known.a)} [m s^-2]`} and comes to rest ${M`${d(snap(known.u * known.u / (-2 * known.a)))} [m]`} down the slope, before the ${M`${d(known.s)} [m]`}.`);
    }
    return fail('No run down the slope fits those numbers: forwards, for a positive time. Check them.');
  }
  const { u, v, a, t, s } = r.values;
  if (!(t > 0) || !(s > 0)) return fail('The run goes down the slope and takes time: check the numbers.');
  if (!(v >= 0)) return fail('It comes to rest before the end of the run: freewheeling, it does not roll back up.');
  rows.push(...r.steps.map((st) => ({ f: st.formula, s: st.substitution, r: M`${st.target} = ${d(snap(st.value))} [${UNIT[st.target]}]` })));

  // ── F = ma: the resultant force, and the angle the slope must have.
  //    With no resistance the mass cancels, m g sin α = ma, so sin α = a/g needs no
  //    mass; against a resistance it does. A slope that cannot give the
  //    acceleration is said so in a note, and the rest still stands.
  let F = null, alpha0 = null, alphaR = null;
  const sayNo = [];
  if (have(k.m)) {
    F = snap(k.m * a);
    rows.push({ f: M`F = ma`, s: M`F = ${d(k.m)} * ${d(snap(a))}`, r: M`F = ${d(F)} [N]` });
  }
  if (!have(k.alpha)) {
    const s0 = a / g;
    if (s0 > 0 && s0 < 1) {
      alpha0 = snap(Math.asin(s0) / D2R);
      rows.push(have(k.m)
        ? { f: M`m g sin alpha = ma`, s: M`sin alpha = ${d(F)}/(${d(k.m)} * ${d(g)})`, r: M`sin alpha = ${d(snap(s0))}, alpha = ${num(alpha0, 2)}°` }
        : { f: M`m g sin alpha = ma`, s: M`sin alpha = ${d(snap(a))}/${d(g)}`, r: M`sin alpha = ${d(snap(s0))}, alpha = ${num(alpha0, 2)}°` });
    } else sayNo.push(s0 >= 1
      ? `With no resistance no slope gives that: it would need ${M`sin alpha = ${d(snap(s0))}`}, and a slope alone accelerates it at less than ${M`g`}.`
      : 'With no resistance no slope gives that: on any slope it would speed up, not keep its speed or slow down.');
    if (R > 0 && have(k.m)) {
      const sR = (k.m * a + R) / (k.m * g);
      if (sR > 0 && sR < 1) {
        alphaR = snap(Math.asin(sR) / D2R);
        rows.push({ f: M`m g sin alpha - R = ma`, s: M`sin alpha = (${d(F)} + ${d(R)})/(${d(k.m)} * ${d(g)})`, r: M`sin alpha = ${d(snap(sR))}, alpha = ${num(alphaR, 2)}°` });
      } else sayNo.push(`Against ${M`${d(R)} [N]`} no slope gives that: it would need ${M`sin alpha = ${d(snap(sR))}`}.`);
    }
  }
  if (have(k.alpha)) alpha = k.alpha;
  // the slope the stage draws, and the forces on it: the paper's angle, or the
  // one the engine found for the resistance given — or none, when it found none
  if (R > 0 && !have(k.m) && !have(k.alpha)) sayNo.push(`Against a resistance of ${M`${d(R)} [N]`} the angle needs the mass too: the resistance's share of the acceleration is ${M`R`} over ${M`m`}.`);
  const shown = alpha ?? alphaR ?? alpha0 ?? null;
  // the resistance belongs to the slope drawn only if that slope was found (or given) with it
  const Rs = shown == null ? null : (have(k.alpha) || (alphaR != null && shown === alphaR)) ? R : 0;
  const W = shown != null && have(k.m) ? snap(k.m * g * Math.sin(shown * D2R)) : null;

  const notes = [`From ${M`${d(u)} [m s^-1]`} to ${M`${d(snap(v))} [m s^-1]`} over ${M`${d(snap(s))} [m]`}: an acceleration of ${M`${d(snap(a))} [m s^-2]`}, for ${M`${d(snap(t))} [s]`}.`];
  if (F != null) notes.push(`The resultant force on cyclist and bike is ${M`${d(Math.abs(F))} [N]`} ${F >= 0 ? 'down' : 'up'} the slope.`);
  notes.push(...sayNo);
  if (alpha0 != null) notes.push(`With no resistance, the weight's component down the slope is the whole of it: the slope is at ${num(alpha0, 2)}° to the horizontal.`);
  if (alphaR != null) notes.push(`Against a resistance of ${M`${d(R)} [N]`}, the weight's component must be bigger by that much: the slope is at ${num(alphaR, 2)}°.`);
  if (have(k.alpha)) notes.unshift(`On a ${num(alpha, 2, { trim: true })}° slope${R > 0 ? ` against ${M`${d(R)} [N]`}` : ' with no resistance'}, it accelerates at ${M`${d(snap(a))} [m s^-2]`}.`);
  const derived = [`${M`a = ${d(snap(a))} [m s^-2]`}`, `${M`t = ${d(snap(t))} [s]`}`, ...(F != null ? [`${M`F = ${d(F)} [N]`}`] : []),
    ...(alpha0 != null ? [`${num(alpha0, 2)}° with no resistance`] : []), ...(alphaR != null ? [`${num(alphaR, 2)}° against ${M`${d(R)} [N]`}`] : [])];

  const T = snap(t), A = snap(a);
  const pos = (tt) => { const c = Math.min(Math.max(tt, 0), T); return u * c + 0.5 * A * c * c; };
  const vel = (tt) => u + A * Math.min(Math.max(tt, 0), T);
  const f = { kind: 'hill', u, v: snap(v), a: A, s: snap(s), t: T, tMax: T, tFlight: T, m: have(k.m) ? k.m : null, R: Rs, g, F, W, alpha: shown, alphaGiven: have(k.alpha), alpha0, alphaR,
    // still accelerating as it passes the end of the run
    pos, vel, acc: (tt) => (tt <= T + 1e-9 ? A : 0), params: { u, theta: 0, h: 0, g } };
  return { ok: true, mode: 'hill', u, v: snap(v), a: A, s: snap(s), t: T, F, alpha0, alphaR, alpha: shown, rows, notes, derived, f };
}

/** The working: the run down the slope and F = ma along it (or, the angle given, F = ma first). */
export function hillWorking(sv) {
  if (!sv?.ok) return [];
  return [{ title: `Down the slope, then ${M`F = ma`} along it`, rows: sv.rows,
    note: `Along the slope, down it positive: the weight's component is ${M`m g sin alpha`} and any resistance ${M`R`} acts up it, so ${M`m g sin alpha - R = ma`}.` }];
}
