// core/impulse.js — an impulse, as the one momentum step a SUVAT motion takes.
//
// Impulse is the change in momentum: I = m(v − u), along one line, with u
// the velocity just before and v just after, both signed the same way as I.
// The library uses it as a link between two SUVAT flights — a ball bouncing
// on the ground, a kick, a catch — never for a collision between two bodies
// or a force over a time, which are another chapter (design/library/build-rules.md).
//
// Give any three of m, I, u and v: the fourth is found, with the row that
// finds it, set as maths (rule 1). Nothing else here is momentum.

import { snap } from './numeric.js';
import { M, num, signed } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, 3, { trim: true });
const sg = (x) => signed(snap(x), 3, { trim: true });

/**
 * @param o.m  the mass (kg), more than 0
 * @param o.I  the impulse (N s), signed: positive in the positive direction
 * @param o.u  the velocity just before (m s⁻¹), signed
 * @param o.v  the velocity just after (m s⁻¹), signed
 * @returns {{ ok: true, m, I, u, v, found: 'm'|'I'|'u'|'v'|null, row }} — `row` the working
 *          row `{ f, s, r }` that found the missing one — or {{ ok: false, reason }}
 */
export function impulseLink({ m, I, u, v } = {}) {
  const f = M`I = m(v - u)`;
  if (!have(m)) {
    // the mass, from an impulse and the change it made
    if (!(have(I) && have(u) && have(v))) return { ok: false, reason: 'An impulse changes the momentum, so it needs the mass — or the impulse and both velocities, to find the mass.' };
    if (Math.abs(v - u) < 1e-12) return { ok: false, reason: 'With no change in velocity there is no impulse, and nothing to find the mass from.' };
    const mm = snap(I / (v - u));
    if (!(mm > 0)) return { ok: false, reason: `An impulse of ${M`${sg(I)} [N s]`} cannot change the velocity from ${M`${sg(u)}`} to ${M`${sg(v)} [m s^-1]`}: it acts the other way.` };
    return { ok: true, m: mm, I, u, v, found: 'm', row: { f, s: M`${sg(I)} = m(${sg(v)} - ${sg(u)})`, r: M`m = ${d(mm)} [kg]` } };
  }
  if (!(m > 0)) return { ok: false, reason: 'The mass must be more than 0.' };
  const known = [have(I), have(u), have(v)].filter(Boolean).length;
  if (known < 2) return { ok: false, reason: 'Give two of the impulse, the velocity before and the velocity after: the third follows from I = m(v − u).' };
  if (!have(I)) {
    const J = snap(m * (v - u));
    return { ok: true, m, I: J, u, v, found: 'I', row: { f, s: M`I = ${d(m)}(${sg(v)} - ${sg(u)})`, r: M`I = ${d(J)} [N s]` } };
  }
  if (!have(v)) {
    const w = snap(u + I / m);
    return { ok: true, m, I, u, v: w, found: 'v', row: { f, s: M`${sg(I)} = ${d(m)}(v - ${sg(u)})`, r: M`v = ${d(w)} [m s^-1]` } };
  }
  if (!have(u)) {
    const w = snap(v - I / m);
    return { ok: true, m, I, u: w, v, found: 'u', row: { f, s: M`${sg(I)} = ${d(m)}(${sg(v)} - u)`, r: M`u = ${d(w)} [m s^-1]` } };
  }
  // all three given: they must agree, to the paper's figures
  const J = m * (v - u);
  if (Math.abs(J - I) > 1e-2 * Math.max(1, Math.abs(I))) {
    return { ok: false, reason: `Those do not agree: ${M`${d(m)} [kg]`} going from ${M`${sg(u)}`} to ${M`${sg(v)} [m s^-1]`} takes an impulse of ${M`${d(J)} [N s]`}, not ${M`${d(I)} [N s]`}. Leave one of them out.` };
  }
  return { ok: true, m, I, u, v, found: null, row: { f, s: M`${sg(I)} = ${d(m)}(${sg(v)} - ${sg(u)})`, r: '' } };
}
