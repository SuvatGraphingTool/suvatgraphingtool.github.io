// cable.js — a lift raised by a cable, with someone standing on its floor:
// up from rest, steady, then slowing to a stop (the journey's three stages),
// and in each stage the forces that make the motion — the tension in the
// cable on lift and passenger together, T − (M + m)g = (M + m)a, and the
// floor's push on the passenger alone, R − mg = ma. (Edexcel 6677 M1 Jun 2002 Q6.)
//
// SUVAT with the one-step link the build rules allow: F = ma, here to find a
// force from an acceleration (design/library/build-rules.md). The journey's
// engine (js/core/journey.js) does the motion; this adds the forces.
//
// CONVENTION. Up positive. M the lift's mass, m the passenger's; the cable is
// light and inextensible.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solveJourney, journeyWorking } from './journey.js';
import { snap } from './numeric.js';
import { M as Mth, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d(x)})` : d(x));
const NAMES = { up: 'speeding up', hold: 'at a steady speed', down: 'slowing down' };

/**
 * @param k { a1, V, t1, t2, t3, a3, D, M, m, g } — the journey's names (any the
 *   journey can solve from), the lift's mass M and the passenger's m (kg)
 */
export function solveCable(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  if (!have(k.M) || !(k.M > 0)) return fail('Still needed: the lift’s mass, a positive number of kilograms.');
  if (have(k.m) && !(k.m > 0)) return fail('The passenger’s mass is a positive number of kilograms.');
  const j = solveJourney({ a1: k.a1, V: k.V, t1: k.t1, t2: k.t2, t3: k.t3, a3: k.a3, D: k.D });
  if (!j.ok) return { ...j, derived: j.derived || [], notes: j.notes || [] };
  const Ml = k.M, m = have(k.m) ? k.m : 0, tot = snap(Ml + m);
  const stages = j.f.stages.map((st) => {
    const a = snap(st.a), Tn = snap(tot * (g + a)), R = m > 0 ? snap(m * (g + a)) : null;
    return { kind: st.kind, t0: st.t0, t1: st.t1, a, T: Tn, R };
  });
  if (stages.some((st) => st.T < 0)) return fail('Slowing that fast the lift would need the cable to push down: a cable can only pull. It would leave the cable slack.');

  // the forces, stage by stage: the cable on lift and passenger together, the floor on the passenger
  const rows = [];
  for (const st of stages) {
    rows.push({ f: Mth`T - (M + m)g = (M + m)a`, s: Mth`T - ${d(tot)} * ${d(g)} = ${d(tot)} * ${sb(st.a)}`, r: Mth`T = ${d(st.T)} [N] "while" ${NAMES[st.kind]}` });
    if (st.R != null) rows.push({ f: Mth`R - m g = ma`, s: Mth`R - ${d(m)} * ${d(g)} = ${d(m)} * ${sb(st.a)}`, r: Mth`R = ${d(st.R)} [N] "while" ${NAMES[st.kind]}` });
  }
  const [s1, s2, s3] = stages;
  const notes = [
    ...j.notes,
    `Speeding up, the cable pulls with ${Mth`${d(s1.T)} [N]`}, more than the ${Mth`${d(snap(tot * g))} [N]`} weight of lift${m ? ' and passenger' : ''}; at a steady speed exactly the weight; slowing down, less: ${Mth`${d(s3.T)} [N]`}.`,
  ];
  if (m) notes.push(`The floor pushes the passenger up with ${Mth`${d(s1.R)} [N]`}, then ${Mth`${d(s2.R)} [N]`}, then ${Mth`${d(s3.R)} [N]`}: they feel heavier as it speeds up, lighter as it slows.`);
  const derived = [...(j.derived || []), `${Mth`T = ${d(s1.T)} [N]`} speeding up`, ...(m ? [`${Mth`R = ${d(s3.R)} [N]`} slowing down`] : [])];
  const stageAt = (t) => stages.find((st) => t < st.t1 - 1e-12) || stages[stages.length - 1];
  const f = { ...j.f, kind: 'cable', M: Ml, m: m || null, g, cable: stages,
    tension: (t) => (t >= j.f.tMax - 1e-9 ? snap(tot * g) : stageAt(t).T),
    floor: (t) => (!m ? null : t >= j.f.tMax - 1e-9 ? snap(m * g) : stageAt(t).R),
    tUp: snap(s1.t1 / 2), tSteady: snap((s2.t0 + s2.t1) / 2), tDown: snap((s3.t0 + s3.t1) / 2) };
  return { ...j, mode: 'cable', T1: s1.T, T2: s2.T, T3: s3.T, R1: s1.R, R2: s2.R, R3: s3.R, forces: rows, rows: [...j.rows, ...rows], notes, derived, f };
}

/** The working: the journey's, then the forces in each stage. */
export function cableWorking(s) {
  if (!s?.ok) return [];
  return [...journeyWorking(s), { title: `The forces: ${Mth`F = ma`} in each stage`, rows: s.forces,
    note: `Up is positive. The cable holds lift${s.f.m ? ' and passenger' : ''} together, ${Mth`(M + m)`}; the floor pushes on the passenger alone, ${Mth`m`}. At a steady speed ${Mth`a = 0`}, and each force just balances a weight.` }];
}
