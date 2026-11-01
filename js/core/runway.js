// runway.js — an aircraft taking off along a runway AB: moving from A with a
// speed, a constant acceleration, it leaves the ground at C. Its acceleration,
// the distance AC, and how much runway is left over, BC. (Edexcel M1 Jun 2005
// Q1.)
//
// NO NEW PHYSICS. The take-off run is one stretch of constant acceleration:
// the twelve's own SUVAT solver (js/core/suvat.js `solve`) does it from any
// three of u, v, a, t, s, with its working. The runway left over is its
// length less AC.
//
// CONVENTION. Distances from A along the runway; t from A.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solve } from './suvat.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });

/**
 * @param k { u, v, a, t, s, L }  any three of the five for the take-off run; L the runway's length (m)
 */
export function solveRunway(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const known = {};
  for (const q of ['u', 'v', 'a', 't', 's']) if (have(k[q])) known[q] = k[q];
  const n = Object.keys(known).length;
  if (n < 3) return fail(`Still needed: ${3 - n} more of the speed at A, the take-off speed, the acceleration, the time and the distance to take-off.`);
  if (n > 3) return fail('Give three of the five for the take-off run: any three fix the other two.');
  if (have(known.u) && known.u < 0) return fail('It rolls forwards from A: give its speed at A as 0 or more.');
  const r = solve(known);
  if (!r.ok) return fail('No take-off run fits those three numbers: a run that speeds up from A, forwards, for a positive time. Check them.');
  const { u, v, a, t, s } = r.values;
  if (!(t > 0) || !(s > 0)) return fail('The take-off run goes forwards and takes time: check the numbers.');
  if (!(v > u)) return fail('It speeds up along the runway: the take-off speed must be more than the speed at A.');
  const rows = r.steps.map((st) => ({ f: st.formula, s: st.substitution, r: M`${st.target} = ${d3(snap(st.value))} [${{ s: 'm', a: 'm s^-2', v: 'm s^-1', u: 'm s^-1', t: 's' }[st.target]}]` }));
  const notes = [`From ${M`${d3(u)} [m s^-1]`} at A it speeds up at ${M`${d3(snap(a))} [m s^-2]`} and leaves the ground at C, ${M`${d3(snap(s))} [m]`} along, ${M`${d3(snap(t))} [s]`} later, at ${M`${d3(snap(v))} [m s^-1]`}.`];
  let left = null;
  if (have(k.L)) {
    if (!(k.L > 0)) return fail('The runway has a positive length.');
    if (s > k.L + 1e-9) return fail(`It needs ${M`${d3(snap(s))} [m]`} to take off, more than the ${M`${d3(k.L)} [m]`} runway: it runs off the end.`);
    left = snap(k.L - s);
    rows.push({ f: M`BC = AB - AC`, s: M`${d3(k.L)} - ${d3(snap(s))}`, r: M`BC = ${d3(left)} [m]` });
    notes.push(`That leaves ${M`${d3(left)} [m]`} of runway beyond C.`);
  }
  const pos = (tt) => { const c = Math.min(Math.max(tt, 0), t); return u * c + 0.5 * a * c * c; };
  const vel = (tt) => u + a * Math.min(Math.max(tt, 0), t);
  const f = { kind: 'runway', u, v, a: snap(a), t: snap(t), s: snap(s), L: have(k.L) ? k.L : null, left, tMax: snap(t),
    pos: (tt) => ({ x: pos(tt), y: 0 }), remaining: (tt) => (have(k.L) ? k.L - pos(tt) : null), vel: (tt) => ({ x: vel(tt), y: 0 }), accel: () => a,
    params: { u, theta: 0, h: 0, g: 9.8 } };
  const derived = [`${M`a = ${d3(snap(a))} [m s^-2]`}`, ...(left != null ? [`${M`BC = ${d3(left)} [m]`}`] : [])];
  return { ok: true, mode: 'runway', u, v, a: snap(a), t: snap(t), s: snap(s), AC: snap(s), BC: left, rows, notes, derived, f };
}

/** The working: the take-off run, then the runway left over. */
export function runwayWorking(sv) {
  if (!sv?.ok) return [];
  return [{ title: 'The take-off run, and the runway left', rows: sv.rows,
    note: 'One stretch of constant acceleration from A to C, where it leaves the ground; the rest of the runway is what is left of AB.' }];
}
