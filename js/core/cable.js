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
// the journey writes its whole time T; here T is the cable's tension, so the whole time is t_tot
const TV = '<i class="m-var">T</i>', TOT = Mth`t_tot`.replace(/^<span class="m">|<\/span>$/g, '');
const totalT = (x) => (typeof x === 'string' ? x.split(TV).join(TOT) : x);

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
  if (k.M + (have(k.m) ? k.m : 0) > 50000) return fail('More than 50 tonnes is not a lift: give the masses in kilograms.');
  const j = solveJourney({ a1: k.a1, V: k.V, t1: k.t1, t2: k.t2, t3: k.t3, a3: k.a3, D: k.D });
  if (!j.ok) return { ...j, derived: j.derived || [], notes: j.notes || [] };
  const Ml = k.M, m = have(k.m) ? k.m : 0, tot = snap(Ml + m);
  const stages = j.f.stages.map((st) => {
    const a = snap(st.a), Tn = snap(tot * (g + a)), R = m > 0 ? snap(m * (g + a)) : null;
    return { kind: st.kind, t0: st.t0, t1: st.t1, a, T: Tn, R };
  });
  // slowing at g or faster the cable would have to push, or carry nothing: it goes slack and the lift falls freely
  if (stages.some((st) => st.T <= 1e-9 * tot * g)) return fail(`Slowing at ${Mth`g`} or faster the cable would have to push, or carry nothing: a cable can only pull, so it would go slack and the lift fall freely. Slow it more gently.`);

  // the forces, stage by stage: the cable on lift and passenger together, the floor on the passenger
  const rows = [];
  for (const st of stages) {
    rows.push({ f: Mth`T - (M + m)g = (M + m)a`, s: Mth`T - ${d(tot)} * ${d(g)} = ${d(tot)} * ${sb(st.a)}`, r: `${Mth`T = ${d(st.T)} [N]`} while ${NAMES[st.kind]}` });
    if (st.R != null) rows.push({ f: Mth`R - m g = ma`, s: Mth`R - ${d(m)} * ${d(g)} = ${d(m)} * ${sb(st.a)}`, r: `${Mth`R = ${d(st.R)} [N]`} while ${NAMES[st.kind]}` });
  }
  // picked by what they are: a journey with no steady stage has only two
  const s1 = stages.find((x) => x.kind === 'up'), s2 = stages.find((x) => x.kind === 'hold') || null, s3 = stages.find((x) => x.kind === 'down');
  const Wt = snap(tot * g), Wp = m ? snap(m * g) : null;
  const more = (x, y) => (d(x) === d(y) ? 'just over' : 'more than'), less = (x, y) => (d(x) === d(y) ? 'just under' : 'less than');
  const notes = [
    ...j.notes.map(totalT),
    `Speeding up, the cable pulls with ${Mth`${d(s1.T)} [N]`}, ${more(s1.T, Wt)} the ${Mth`${d(Wt)} [N]`} weight of lift${m ? ' and passenger' : ''}; ${s2 ? 'at a steady speed exactly the weight; ' : ''}slowing down, ${less(s3.T, Wt)} it: ${Mth`${d(s3.T)} [N]`}.`,
  ];
  if (m) notes.push(`The floor pushes the passenger up with ${Mth`${d(s1.R)} [N]`}${s2 ? `, then ${Mth`${d(s2.R)} [N]`}` : ''}, then ${Mth`${d(s3.R)} [N]`}: they feel heavier as it speeds up, lighter as it slows.`);
  const derived = [...(j.derived || []).map(totalT), `${Mth`T = ${d(s1.T)} [N]`} speeding up`, ...(m ? [`${Mth`R = ${d(s3.R)} [N]`} slowing down`] : [])];
  const stageAt = (t) => stages.find((st) => t < st.t1 - 1e-12) || stages[stages.length - 1];
  const f = { ...j.f, kind: 'cable', M: Ml, m: m || null, g, cable: stages, weight: Wt, weightPassenger: Wp,
    tension: (t) => (t >= j.f.tMax - 1e-9 ? Wt : stageAt(t).T),
    floor: (t) => (!m ? null : t >= j.f.tMax - 1e-9 ? Wp : stageAt(t).R),
    tUp: snap(s1.t1 / 2), tSteady: s2 ? snap((s2.t0 + s2.t1) / 2) : null, tDown: snap((s3.t0 + s3.t1) / 2) };
  return { ...j, mode: 'cable', T1: s1.T, T2: s2 ? s2.T : null, T3: s3.T, R1: s1.R, R2: s2 ? s2.R : null, R3: s3.R, forces: rows, rows: [...j.rows, ...rows], notes, derived, f };
}

/** The working: the journey's (its whole time written t_tot, so T is only the tension), then the forces in each stage. */
export function cableWorking(s) {
  if (!s?.ok) return [];
  const rename = (st) => ({ ...st, rows: st.rows.map((r) => ({ ...r, f: totalT(r.f), s: totalT(r.s), r: totalT(r.r) })), note: totalT(st.note), title: totalT(st.title) });
  return [...journeyWorking(s).map(rename), { title: `The forces: ${Mth`F = ma`} in each stage`, rows: s.forces,
    note: `Up is positive. The cable holds lift${s.f.m ? ' and passenger' : ''} together, ${Mth`(M + m)`}; the floor pushes on the passenger alone, ${Mth`m`}. At a steady speed ${Mth`a = 0`}, and each force just balances a weight.` }];
}
