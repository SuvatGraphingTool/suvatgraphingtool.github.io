// twotrains.js — two trains on parallel tracks between the same two
// stations: they leave together from rest and stop together at the next
// station, each with its own stages. One train's stages are fully given; the
// other's hidden number comes from covering the same distance. Then the paper
// asks when they are moving at the same speed, and how far apart they are at
// a given time.
//
// NO NEW PHYSICS. Each train is the library's journey in stages
// (js/core/journey.js `solveStages`): the hidden number of the second comes
// from the area under its speed–time graph equal to the first's distance, as
// the mark schemes write it. Each speed is linear in t within a stage, so
// equal speeds are found piece by piece, one linear equation in each stretch
// where both are in one stage; the gap at a time is the difference of the
// two areas (`askAt`).
//
// CONVENTION. Metres and seconds; t from when both leave.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solveStages, journeyWorking, askAt } from './journey.js';
import { snap, rat } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const EPS = 1e-9;
/** A rate as a student writes it: ⅔ as 2/3, 10/27; else a decimal. */
const fr = (x) => { const r = rat(snap(Math.abs(x)), 60); const s = r ? (r.q === 1 ? `${r.p}` : `${r.p}/${r.q}`) : d(Math.abs(x)); return x < 0 ? `-${s}` : s; };
/** u + a(t − t0) as source: 20, (2/3)t, 100/3 - (10/27)(t - 90). */
function vSrc(st) {
  const a = st.a, u = st.u, t0 = st.t0;
  if (Math.abs(a) < EPS) return d(snap(u));
  const rate = Math.abs(Math.abs(a) - 1) < EPS ? '' : `(${fr(Math.abs(a))})`;
  const tt = t0 > EPS ? `(t - ${d(t0)})` : 't';
  const head = Math.abs(u) > EPS ? `${fr(u)} ${a < 0 ? '-' : '+'} ` : (a < 0 ? '-' : '');
  return `${head}${rate}${tt}`;
}

/**
 * @param k { A: journey spec, B: journey spec, ask: { t } }
 *   each spec as solveStages takes it: { u, stages: [{ kind, t, v, a }], T, D }
 *   B's hidden number may come from A's distance (the same two stations)
 */
export function solveTwoTrains(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const A = solveStages({ u: 0, ...(k.A || {}) });
  if (!A.ok) return fail(`Train A: ${A.reason}`);
  let B = solveStages({ u: 0, ...(k.B || {}) }), sameD = false;
  if (!B.ok) { B = solveStages({ u: 0, ...(k.B || {}), D: A.J.D }); sameD = true; }
  if (!B.ok) return fail(`Train B: ${B.reason}`);
  if (Math.abs(A.J.D - B.J.D) > 1e-6 * Math.max(1, A.J.D)) return fail(`They do not stop at the same station: A goes ${M`${d(snap(A.J.D))} [m]`} and B ${M`${d(snap(B.J.D))} [m]`}. Give one less number for B, to be found from A’s distance.`);
  if (Math.abs(A.J.T - B.J.T) > 1e-6 * Math.max(1, A.J.T)) return fail(`They do not arrive together: A takes ${M`${d(snap(A.J.T))} [s]`} and B ${M`${d(snap(B.J.T))} [s]`}.`);
  const T = A.J.T, fA = A.f, fB = B.f;
  for (const [n, J] of [['A', A.J], ['B', B.J]]) if (Math.abs(J.w[J.n]) > 1e-9) return fail(`Train ${n} must come to rest at the next station: end its last stage at 0, slowing down.`);

  // ── equal speeds: in every stretch where each is in one stage, v_A − v_B is linear
  const cuts = [...new Set([0, T, ...fA.stages.map((s) => s.t0), ...fB.stages.map((s) => s.t0)].map((x) => snap(x)))].sort((p, q) => p - q);
  const eq = [], eqRows = [], spans = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const t0 = cuts[i], t1 = cuts[i + 1], mid = (t0 + t1) / 2;
    const sa = fA.stageAt(mid), sb = fB.stageAt(mid);
    const da = sa.a - sb.a, c0 = (sa.u - sa.a * sa.t0) - (sb.u - sb.a * sb.t0);
    if (Math.abs(da) < EPS) { if (Math.abs(c0) < 1e-9 && sa.u + sa.a * (mid - sa.t0) > EPS) spans.push([t0, t1]); continue; }   // parallel: equal throughout, or never
    const t = snap(-c0 / da);
    if (t > t0 - 1e-9 && t < t1 + 1e-9 && t > EPS && t < T - EPS && !eq.some((x) => Math.abs(x - t) < 1e-6)) {
      eq.push(t);
      eqRows.push({ f: M`v_A = v_B`, s: M`${vSrc(sa)} = ${vSrc(sb)}`, r: M`t = ${d(t)} [s]` });
    }
  }

  // ── the gap at a time asked
  const gapRows = [], gapA = [], gapB = [];
  let gap = null;
  if (have(k.ask?.t)) {
    const t = k.ask.t;
    if (!(t >= 0 && t <= T)) return fail(`Ask about a time from 0 to ${M`${d(snap(T))} [s]`}, while they are between the stations.`);
    const qa = askAt(fA, A.J, { t })[0], qb = askAt(fB, B.J, { t })[0];
    gap = snap(Math.abs(qa.s - qb.s));
    gapA.push(...qa.rows); gapB.push(...qb.rows);
    gapRows.push({ f: M`"gap" = abs(s_A - s_B)`, s: M`abs(${d(snap(qa.s))} - ${d(snap(qb.s))})`, r: M`${d(gap)} [m]` });
  }

  const notes = [];
  if (sameD) notes.push(`B’s hidden number comes from covering the same ${M`${d(snap(A.J.D))} [m]`} as A, between the same stations.`);
  // spans that join up are one
  const merged = []; for (const sp of spans) { const last = merged[merged.length - 1]; if (last && Math.abs(last[1] - sp[0]) < 1e-9) last[1] = sp[1]; else merged.push([...sp]); }
  const eqOut = eq.filter((t) => !merged.some(([a, b]) => t >= a - 1e-9 && t <= b + 1e-9));
  const keep = eq.map((t) => eqOut.includes(t)); const rowsKept = eqRows.filter((_, i) => keep[i]); eqRows.length = 0; eqRows.push(...rowsKept);
  eq.length = 0; eq.push(...eqOut);
  // every moment and every stretch of equal speed, in time order, each with its own words
  const items = [...eq.map((t) => ({ t, m: `at ${M`t = ${d(t)} [s]`}`, plain: `at t = ${num(t, 3, { trim: true })} s` })),
    ...merged.map(([a, b]) => ({ t: a, m: `the whole time from ${M`t = ${d(snap(a))}`} to ${M`t = ${d(snap(b))} [s]`}`, plain: `the whole time from t = ${num(snap(a), 3, { trim: true })} s to ${num(snap(b), 3, { trim: true })} s` }))].sort((p, q) => p.t - q.t);
  const sameSay = items.map((x) => x.plain);
  notes.push(items.length ? `They are moving at the same speed ${items.map((x) => x.m).join(' and ')}, as well as at rest at each station.` : 'They are never at the same speed between the stations, except at rest at each end.');
  if (gap != null) notes.push(`At ${M`t = ${d(k.ask.t)} [s]`} they are ${M`${d(gap)} [m]`} apart.`);
  const derived = [`${M`${d(snap(A.J.D))} [m]`} between the stations`, ...eq.map((t) => `same speed at ${M`t = ${d(t)} [s]`}`)];

  const f = { kind: 'twotrains', tMax: T, tFlight: T, D: A.J.D, posA: (t) => fA.pos(t).x, posB: (t) => fB.pos(t).x, velA: (t) => fA.vel(t).x, velB: (t) => fB.vel(t).x,
    accA: (t) => fA.accel(t), accB: (t) => fB.accel(t), eq, ask: have(k.ask?.t) ? k.ask.t : null, gap, gapAt: (t) => snap(Math.abs(fA.pos(t).x - fB.pos(t).x)), params: { g: 0, h: 0, u: 0, theta: 0 } };
  return { ok: true, mode: 'twotrains', A, B, sameD, sameSay, spans: merged, eq, gap, eqRows, gapRows, gapA, gapB, notes, derived, f, T };
}

/** The working: each train's journey, then the same speeds, then the gap. */
export function twoTrainsWorking(s) {
  if (!s?.ok) return [];
  const tag = (secs, n) => secs.map((x) => ({ ...x, title: `Train ${n}: ${x.title.replace(/^./, (c) => c.toLowerCase())}` }));
  const out = [...tag(journeyWorking(s.A), 'A'), ...tag(journeyWorking(s.B), 'B')];
  if (s.eqRows.length) out.push({ title: 'When they move at the same speed', rows: s.eqRows, note: 'In each stretch where both are in one stage, each speed is a straight line in t: where the lines cross.' });
  if (s.gapRows.length) {
    out.push({ title: `Train A at ${M`t = ${d(s.f.ask)} [s]`}`, rows: s.gapA, note: 'The stage it is in, timed from that stage\u2019s start, added to the stages before.' });
    out.push({ title: `Train B at ${M`t = ${d(s.f.ask)} [s]`}`, rows: s.gapB, note: 'The same for B.' });
  }
  if (s.gapRows.length) out.push({ title: `How far apart at ${M`t = ${d(s.f.ask)} [s]`}`, rows: s.gapRows, note: 'Each distance is the area under its own speed–time graph up to that time.' });
  return out;
}
