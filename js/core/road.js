// road.js — a vehicle along a straight, level road: SUVAT with no gravity in it.
//
// Every other scenario on this site is something thrown or dropped, where the
// acceleration is g and the student only ever types its size. A lorry on a
// road has an acceleration of its own — speeding up, or braking — and it is
// one of the five like any other: given, or worked out. So this is the five
// equations with nothing added: any three determine the other two, which is
// what js/core/suvat.js already does, and this file only wraps that solve in
// the shape the rest of the app expects (the same shape js/core/solve.js and
// js/core/descent.js answer in), and answers the question these papers ask
// next — "how long does it take to reach the mid-point of AB?"
//
// CONVENTION. The direction from A towards B is positive. A negative a is
// braking; a negative v means it has turned round, which a lorry does not do
// on its own but the equations are happy to describe, and the notes say so.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4). Nothing on the road stage, the
// graphs or the working claims a number that is not computed here.

import { solve as solveFive, NAMES, UNITS } from './suvat.js';
import { M, num, signed } from '../notation.js';
import { snap } from './numeric.js';

const FIVE = ['s', 'u', 'v', 'a', 't'];
// Which three to lean on when more than three are given: the ones a road
// question most often states.
const PREFER = ['s', 't', 'u', 'v', 'a'];
const WORD = ['none', 'one', 'two', 'three', 'four', 'five'];
const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p = 2) => num(x, p, { trim: true });
// a value substituted into a formula: bracketed when negative, (−2)
const sb = (x, p = 2) => signed(x, p, { trim: true });

/** One of the five, set as maths: `u = 14 m s⁻¹`. */
export function eqv(sym, x, p = 2) {
  switch (sym) {
    case 's': return M`s = ${d(x, p)} [m]`;
    case 'u': return M`u = ${d(x, p)} [m s^-1]`;
    case 'v': return M`v = ${d(x, p)} [m s^-1]`;
    case 'a': return M`a = ${d(x, p)} [m s^-2]`;
    case 't': return M`t = ${d(x, p)} [s]`;
    default: return '';
  }
}

/* ── the motion ─────────────────────────────────────────────────────────
   A flight-shaped object, so the transport, the graphs, the HUD and the
   energy readout can all ask it the questions they ask a trajectory. The
   road is level, so y is always zero and every velocity is horizontal. */
export function roadMotion({ u, a, s, v, t }) {
  const clampT = (tt) => Math.min(Math.max(tt, 0), t);
  const pos = (tt) => { const c = clampT(tt); return { x: u * c + 0.5 * a * c * c, y: 0 }; };
  const vel = (tt) => ({ x: u + a * clampT(tt), y: 0 });
  const speed = (tt) => Math.abs(vel(tt).x);
  const f = {
    kind: 'line',
    params: { u, a, s, v, t, g: 0, h: 0, theta: 0 },
    tMax: t, tFlight: t, range: s, horiz: null, uy: 0, ux: u,
    bounces: 0, segments: [],
    pos, vel, speed,
    accel: () => a,
    kineticEnergy: (tt) => 0.5 * (f.mass ?? 1) * speed(tt) ** 2,
    momentum: (tt) => (f.mass ?? 1) * speed(tt),
    path(nPts = 260, tEnd = t) {
      const out = [];
      for (let i = 0; i <= nPts; i++) { const tt = (i / nPts) * tEnd; out.push({ t: tt, ...pos(tt) }); }
      return out;
    },
    ticks(count = 10, tEnd = t) {
      const out = [];
      for (let i = 0; i <= count; i++) { const tt = (i / count) * tEnd; out.push({ t: tt, ...pos(tt), v: vel(tt) }); }
      return out;
    },
  };
  return f;
}

/* ── when it passes a point ──────────────────────────────────────────────
   s₁ = ut + ½at², solved for the first t in the run. This is part (b) of the
   lorry question, and it is a quadratic the student has to choose a root of,
   so the working says which root and why. */
export function timeToReach(f, s1) {
  const { u, a, t } = f.params;
  if (!have(s1)) return { ok: false, reason: 'No point was named.' };
  const rows = [{ f: M`s = ut + ½at^2`, s: M`${d(s1)} = ${sb(u)}t + ½ * ${sb(a)}t^2` }];
  let tau;
  if (Math.abs(a) < EPS) {
    if (Math.abs(u) < EPS) return { ok: false, reason: 'It never moves, so it never gets there.' };
    tau = s1 / u;
    rows.push({ f: M`t = s/u`, s: M`${d(s1)}/${d(u)}`, r: M`t = ${d(tau)} [s]` });
  } else {
    const disc = u * u + 2 * a * s1;
    if (disc < -EPS) return { ok: false, reason: `It never reaches ${d(s1)} m from A.` };
    const r = Math.sqrt(Math.max(0, disc));
    const roots = [(-u + r) / a, (-u - r) / a].filter((x) => x > EPS && x <= t + 1e-6).sort((x, y) => x - y);
    if (!roots.length) return { ok: false, reason: `It does not reach ${d(s1)} m from A while it is being watched.` };
    tau = roots[0];
    rows.push({
      f: M`t = (-u + sqrt(u^2 + 2as))/a`,
      s: M`(-${sb(u)} + sqrt(${d(u * u)} + ${sb(2 * a * s1)}))/${sb(a)}`,
      r: M`t = ${d(tau)} [s]`,
    });
  }
  const vAt = u + a * tau;
  rows.push({ f: M`v = u + at`, s: M`${sb(u)} + ${sb(a)} * ${d(tau)}`, r: eqv('v', vAt) });
  return { ok: true, t: tau, s: s1, v: vAt, rows };
}

/**
 * Any three of the five, and optionally a point to time it at.
 * @param k  { s, u, v, a, t, mark, at }  mark: metres from A, or 'mid'; at: a time
 *           from A the question asks about, other than t ("its distance from O after 6 s")
 * @returns the shape of solveLaunch: { ok, reason?, mode, params, f, derived,
 *          notes, five, extras, moment, convention, steps, ... }
 */
export function solveRoad(k0 = {}) {
  let k = k0;
  // "50 m during the fifth second": s(n) − s(n − 1) = u + a(n − ½). With u (or a)
  // that is a, and the motion is the five to t = n
  let nthRows = null;
  if (have(k.nth) && k.nth >= 1 && Number.isInteger(k.nth) && have(k.sNth)) {
    const n = k.nth, hn = n - 0.5;
    if (have(k.u) === have(k.a)) {
      return { ok: false, reason: `A distance in one second fixes one more number: give the speed it starts with, or its acceleration — not ${have(k.u) ? 'both' : 'neither'}.`, derived: [], notes: [], given: [], used: [], spare: [], clash: [] };
    }
    const uu = have(k.u) ? k.u : snap(k.sNth - k.a * hn), aa = have(k.a) ? k.a : snap((k.sNth - k.u) / hn);
    nthRows = [
      { f: M`s_${n} - s_${n - 1} = u + a(n - ½)`, s: have(k.u) ? M`${d(k.sNth)} = ${d(uu)} + a(${n} - ½)` : M`${d(k.sNth)} = u + ${sb(aa)}(${n} - ½)`, r: have(k.u) ? eqv('a', aa) : eqv('u', uu) },
    ];
    k = { u: uu, a: aa, t: n, mark: k.mark, at: k.at, who: k.who, brakes: k.brakes, turns: k.turns };
  }
  const given = FIVE.filter((x) => have(k[x]));
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [], given, used: [], spare: [], clash: [] });

  if (given.length < 3) {
    const n = given.length;
    return fail(`Three of the five pin down the other two — you have ${WORD[n]}. `
      + `Add ${WORD[3 - n]} more.`);
  }

  // Three to solve from; any more are checked against the answer.
  const use = PREFER.filter((x) => given.includes(x)).slice(0, 3);
  const known = Object.fromEntries(use.map((x) => [x, k[x]]));
  const r = solveFive(known);
  if (!r.ok) {
    // braking that stops it short of the distance: it never gets there
    if (have(known.u) && have(known.a) && have(known.s) && known.u * known.a < 0 && known.u ** 2 + 2 * known.a * known.s < 0) {
      const stop = -(known.u ** 2) / (2 * known.a);
      return fail(`It stops before it has gone ${M`${d(Math.abs(known.s))} [m]`}: from ${M`v^2 = u^2 + 2as`} with ${M`v = 0`}, it comes to rest after ${M`s = ${d(Math.abs(stop))} [m]`}.`);
    }
    return fail('Those three do not fix the motion. Try a different three of the five.');
  }
  const V = r.values;

  if (!(V.t > EPS)) {
    return fail(`With those values ${M`t = ${d(V.t)} [s]`}, and time has to run forwards. `
      + 'Check the signs — braking is a negative acceleration.');
  }

  const spare = given.filter((x) => !use.includes(x));
  for (const x of spare) {
    const tol = Math.max(0.02, Math.abs(V[x]) * 0.01);
    if (Math.abs(V[x] - k[x]) > tol) {
      return fail(`Those do not agree. From ${use.map((y) => eqv(y, k[y])).join(', ')} `
        + `the engine gets ${eqv(x, V[x])}, but you gave ${eqv(x, k[x])}. Clear one of them.`);
    }
  }

  const f = roadMotion(V);
  const notes = [];
  if (spare.length) {
    notes.push(`${spare.length === 1 ? 'One value was' : 'Some values were'} more than enough — `
      + 'the rest already fixed the motion, and it agrees with them.');
  }
  // Slowing down only when the acceleration is against the velocity: from
  // rest, a negative a speeds it up the other way. A runner slows; a vehicle
  // (or a bicycle) brakes. `who` and `brakes` say which (js/render/figures.js).
  const who = k.who || 'lorry', brakes = k.brakes !== false, turns = k.turns === true;
  const slow = brakes ? 'slowing down: braking' : 'slowing down';
  if (V.a < -EPS && V.u > EPS) notes.push(`The acceleration is negative, so it is ${slow}.`);
  else if (V.a > EPS && V.u < -EPS) notes.push(`It starts out moving away from B, and the acceleration is towards B, so it is ${slow}.`);
  else if (Math.abs(V.a) > EPS && Math.abs(V.u) <= EPS) {
    notes.push(`It starts from rest and speeds up towards ${V.a > 0 ? 'B' : 'A'}.`);
  }
  const tStop = Math.abs(V.a) > EPS ? -V.u / V.a : NaN;
  // when it is at rest, if it ever is, and the distance it travels counting the way back
  const sAt = (t) => snap(V.u * t + 0.5 * V.a * t * t);
  const stop = tStop > EPS && tStop <= V.t + 1e-6 ? { t: snap(tStop), s: sAt(tStop) } : null;
  const path = stop && tStop < V.t - 1e-6 ? snap(Math.abs(stop.s) + Math.abs(V.s - stop.s)) : snap(Math.abs(V.s));
  if (tStop > EPS && tStop < V.t - 1e-6) {
    // a lorry or a train does not turn round on its own (it would have to
    // reverse); a runner or a cyclist simply turns and goes back
    notes.push(`It comes to rest after ${M`t = ${d(tStop)} [s]`} and then moves back the way it came.`
      + (turns ? '' : ` The equations allow it; a ${who} ${brakes ? 'braking' : 'slowing down'} does not.`));
  }

  // The point the question asked about.
  let moment = null, markStep = null;
  if (k.mark != null) {
    const s1 = k.mark === 'mid' ? V.s / 2 : k.mark;
    const q = timeToReach(f, s1);
    if (q.ok) {
      const where = k.mark === 'mid' ? 'the mid-point' : `${M`${d(s1)} [m]`} from A`;
      moment = { t: q.t, s: s1, v: q.v, mid: k.mark === 'mid',
        text: `It passes ${where} after ${M`t = ${d(q.t)} [s]`}, doing ${M`${d(q.v)} [m s^-1]`}.` };
      markStep = q;
    } else notes.push(q.reason);
  }

  // A time the question asks about: where it is and how fast then, with the
  // same acceleration — past its own t too, as the equations allow
  if (moment == null && have(k.at) && k.at > EPS) {
    const T = k.at, uu = V.u, aa = V.a;
    const sT = snap(uu * T + 0.5 * aa * T * T), vT = snap(uu + aa * T);
    moment = { t: T, s: sT, v: vT, byTime: true,
      text: `At ${M`t = ${d(T)} [s]`} it is ${M`${d(Math.abs(sT))} [m]`} ${sT < 0 ? 'behind' : 'from'} the start, moving at ${M`${d(vT)} [m s^-1]`}.` };
    markStep = { t: T, v: vT, rows: [
      { f: M`s = ut + ½at^2`, s: M`${d(uu)} * ${d(T)} + ½ * ${sb(aa)} * ${d(T)}^2`, r: eqv('s', sT) },
      { f: M`v = u + at`, s: M`${d(uu)} + ${sb(aa)} * ${d(T)}`, r: eqv('v', vT) },
    ] };
  }

  const derived = r.steps.map((st) => eqv(st.target, st.value));
  if (moment?.byTime) derived.push(moment.text);
  else if (moment) derived.push(`to ${moment.mid ? 'the mid-point' : 'that point'}, ${M`t = ${d(moment.t)} [s]`}`);

  const five = {};
  for (const x of FIVE) {
    const step = r.steps.find((st) => st.target === x);
    five[x] = { value: V[x], label: NAMES[x], unit: UNITS[x], given: use.includes(x) || spare.includes(x),
                how: step ? step.rearranged : null };
  }

  const extras = [
    { key: 'avg', label: 'average speed', value: V.s / V.t, unit: 'm s⁻¹' },
    ...(moment ? [{ key: 'tMark', label: moment.mid ? 'time to the mid-point' : 'time to that point', value: moment.t, unit: 's' },
                  { key: 'vMark', label: moment.mid ? 'speed at the mid-point' : 'speed there', value: moment.v, unit: 'm s⁻¹' }] : []),
  ].filter((x) => isFinite(x.value));

  if (nthRows) derived.unshift(`${M`${d(k0.sNth)} [m]`} in second ${k0.nth}: ${nthRows[0].r}`);
  // "she starts from rest … passes two flags": the stretch between them is the five, and how far
  // (and how long) it took from rest to reach the first, at the same acceleration, is v² = 2as
  let before = null;
  if (k0.fromRest && V.u > EPS && V.a > EPS) {
    before = { s: snap(V.u * V.u / (2 * V.a)), t: snap(V.u / V.a) };
    before.rows = [
      { f: M`v^2 = u^2 + 2as`, s: M`${d(V.u)}^2 = 0^2 + 2 * ${d(V.a)}s`, r: eqv('s', before.s) },
      { f: M`v = u + at`, s: M`${d(V.u)} = 0 + ${d(V.a)}t`, r: eqv('t', before.t) },
    ];
    derived.push(`From rest to the first point: ${before.rows[0].r}, ${before.rows[1].r}`);
  }
  return {
    ok: true, mode: 'road', axis: 'along', params: f.params, f, nthRows, nth: nthRows ? k0.nth : undefined, stop, path, before,
    derived, notes, five, extras, moment, answer: null, steps: r.steps, markStep,
    given, used: use, spare, clash: [], filled: {}, altTheta: null, assumedH: false,
    convention: 'Taking the direction from A towards B as positive.',
  };
}

/* ── the working panel ──────────────────────────────────────────────────
   The same rows the other scenarios show: the equation chosen because it
   leaves out what nobody asked about, the rearrangement, and the numbers. */
export function roadWorking(solved) {
  if (!solved?.ok) return [];
  const out = solved.nthRows ? [{
    title: `The distance in second ${solved.nth}`,
    rows: solved.nthRows,
    note: `In second ${solved.nth} it goes from ${M`t = ${solved.nth - 1}`} to ${M`t = ${solved.nth}`}: the distance then is ${M`s(n) - s(n - 1)`}, which comes to ${M`u + a(n - ½)`}.`,
  }] : [];
  out.push({
    title: 'Three of the five',
    rows: solved.used.map((x) => ({ f: NAMES[x].replace(/^./, (c) => c.toUpperCase()), s: eqv(x, solved.params[x]) })),
    note: 'Three is enough: each equation leaves one of the five out, so there is always one with a single unknown.',
  });
  for (const st of solved.steps) {
    out.push({
      title: `${NAMES[st.target].replace(/^./, (c) => c.toUpperCase())}, from ${st.formula}`,
      rows: [{ f: st.rearranged, s: st.substitution, r: eqv(st.target, st.value) }],
    });
  }
  if (solved.before) {
    out.push({ title: 'From rest to the first point', rows: solved.before.rows,
      note: 'It started from rest with the same acceleration, so the speed it has at the first point took this long, and this far, to reach.' });
  }
  if (solved.markStep) {
    out.push({
      title: solved.moment.byTime ? 'At the time asked about' : solved.moment.mid ? 'To the mid-point of AB' : 'To that point',
      rows: solved.markStep.rows,
      note: solved.moment.byTime ? 'The same acceleration all the way: past the end of the motion too, the equations still say where it is.'
        : Math.abs(solved.params.a) > EPS
        ? 'A quadratic in t has two roots. The one wanted is the first positive one: the other is before it set off, or after it stopped being watched.'
        : 'No acceleration, so it covers equal distances in equal times.',
    });
  }
  return out;
}
