// trip.js — a velocity–time graph of straight segments, forwards and back.
//
// The exam family: a car speeds up, holds its speed, brakes to rest; its driver
// gets out and walks back to a shop, waits inside, then jogs back to the car;
// how long was the wait? Each segment is a straight line on the (t, v) graph —
// constant acceleration — from the velocity the last one ended at to the one
// this one ends at, over its own time; a velocity below zero is going back.
// Up to two segment times may be left for the engine: one in which it moves,
// fixed by where it ends (back at the start of a given segment), and one in
// which it is at rest, fixed by the total time.
//
// CONVENTION. Forwards (the way the first segment goes) is positive; time
// from the start of the first segment; position from where it starts.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const sgn = (x) => (d(x).startsWith('−') ? `(${d(x)})` : d(x));
const EPS = 1e-9;
export const WHO = { car: 'the car', foot: 'on foot' };

/**
 * @param k { segs: [{ v, t, who }], T, back }
 *   segs[i].v — the velocity at the END of segment i (signed; the start is the
 *               previous segment's end, and 0 before the first)
 *   segs[i].u — the velocity it STARTS at, when that is not where the last
 *               one ended (a jump: someone sets off walking)
 *   segs[i].t — its time, or blank for the engine
 *   T         — the total time, if the paper gives it
 *   back      — the number (1-based) of the segment whose START the motion
 *               ends back at ("arrives back at the car")
 */
export function solveTrip(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const raw = (k.segs || []).filter((s) => s && (have(s.v) || have(s.t) || have(s.u)));
  if (raw.length < 1) return fail('Give at least one segment: the velocity it ends at, and how long it takes.');
  const S = raw.map((s, i) => ({ ...s, i: i + 1, v1: s.v, v0: 0 }));
  for (const s of S) if (!have(s.v1)) { if (have(s.u)) s.v1 = s.u; else return fail(`Segment ${s.i}: give the velocity it ends at (0 to stop; negative to go back).`); }
  // a segment starts where the last ended, unless it is given a speed of its
  // own to start at — a jump on the graph, as when someone sets off walking
  for (let i = 0; i < S.length; i++) { S[i].v0 = have(S[i].u) ? S[i].u : i ? S[i - 1].v1 : 0; S[i].jump = have(S[i].u) && Math.abs(S[i].u - (i ? S[i - 1].v1 : 0)) > EPS; }
  for (const s of S) if (have(s.t) && !(s.t > 0)) return fail(`Segment ${s.i}: its time is after the start: give it as a positive number.`);
  for (const s of S) if (s.v0 * s.v1 < -EPS) return fail(`Segment ${s.i} would go from ${M`${d(s.v0)}`} to ${M`${d(s.v1)} [m s^-1]`} in one straight line, through rest: split it at the stop.`);
  const open = S.filter((s) => !have(s.t));
  if (open.length > 2) return fail('At most two segment times can be left to the engine: one fixed by where it ends, one by the total time.');
  const back = have(k.back) ? Math.round(k.back) : null;
  if (back != null && !(back >= 1 && back <= S.length)) return fail(`There is no segment ${back} to come back to.`);

  // which open time does which condition fix?
  const moving = open.filter((s) => Math.abs(s.v0) + Math.abs(s.v1) > EPS), resting = open.filter((s) => !(Math.abs(s.v0) + Math.abs(s.v1) > EPS));
  if (moving.length > 1) return fail('Only one moving segment can have its time found: the place it ends at fixes one.');
  if (resting.length > 1) return fail('Only one stop can have its length found: the total time fixes one.');
  // a moving segment with nowhere to end at, but a total time: the total fixes it
  if (moving.length && back == null && have(k.T) && !resting.length) { resting.push(moving.pop()); }
  if (moving.length && back == null) return fail(`Segment ${moving[0].i} has no time: say where it ends (back at the start of which segment).`);
  if (resting.length && !have(k.T)) return fail(`Segment ${resting[0].i} is a stop with no time: give the total time.`);
  const findRows = [];
  // the moving one, from where it ends: Σ ½(v₀ + v₁)t over the segments from
  // `back` to the end is zero
  if (moving.length) {
    const m = moving[0];
    if (m.i < back) return fail(`Segment ${m.i} is before segment ${back}: coming back to segment ${back}'s start cannot fix it.`);
    const rest = S.filter((s) => s.i >= back && s !== m).reduce((a, s) => a + 0.5 * (s.v0 + s.v1) * (s.t ?? 0), 0);
    const mean = 0.5 * (m.v0 + m.v1);
    const t = snap(-rest / mean);
    if (!(t > EPS)) return fail(`Going that way, segment ${m.i} never brings it back to the start of segment ${back}.`);
    m.t = t; m.found = 'back';
    findRows.push({ f: M`½(u + v)t = "distance to get back"`, s: M`½(${d(m.v0)} + ${sgn(m.v1)})t = ${d(snap(-rest))}`, r: M`t_${m.i} = ${d(t)} [s]` });
  }
  if (resting.length) {
    const r0 = resting[0];
    const sum = S.filter((s) => s !== r0).reduce((a, s) => a + s.t, 0);
    const t = snap(k.T - sum);
    if (!(t > EPS)) return fail(`The other segments already take ${M`${d(snap(sum))} [s]`}, at least the ${M`${d(k.T)} [s]`} given: no time is left for the stop.`);
    r0.t = t; r0.found = 'T';
    findRows.push({ f: M`t_${r0.i} = T - "the other times"`, s: M`${d(k.T)} - ${d(snap(sum))}`, r: M`t_${r0.i} = ${d(t)} [s]` });
  }
  if (!moving.length && !resting.length && have(k.T) && Math.abs(S.reduce((a, s) => a + s.t, 0) - k.T) > 1e-6) {
    return fail(`The segments add up to ${M`${d(snap(S.reduce((a, s) => a + s.t, 0)))} [s]`}, not the ${M`${d(k.T)} [s]`} given.`);
  }

  // every segment: its acceleration, how far, where it starts and ends
  let t0 = 0, x0 = 0, dist = 0;
  const rows = [];
  for (const s of S) {
    s.t0 = t0; s.x0 = x0; s.a = snap((s.v1 - s.v0) / s.t); s.s = snap(0.5 * (s.v0 + s.v1) * s.t);
    s.t1 = snap(t0 + s.t); s.x1 = snap(x0 + s.s);
    t0 = s.t1; x0 = s.x1; dist += Math.abs(s.s);
    rows.push({ f: M`a_${s.i} = (v - u)/t`, s: M`(${sgn(s.v1)} - ${sgn(s.v0)})/${d(s.t)}`, r: M`a_${s.i} = ${d(s.a)} [m s^-2]` });
    rows.push({ f: M`s_${s.i} = ½(u + v)t`, s: M`½(${d(s.v0)} + ${sgn(s.v1)}) * ${d(s.t)}`, r: M`s_${s.i} = ${d(s.s)} [m]` });
  }
  const T = t0, X = x0, D = snap(dist);
  const segAt = (t) => S.find((s) => t <= s.t1 + 1e-12) || S[S.length - 1];
  const pos = (t) => { const s = segAt(Math.min(Math.max(t, 0), T)), u = t - s.t0; return s.x0 + s.v0 * u + 0.5 * s.a * u * u; };
  const vel = (t) => { const s = segAt(Math.min(Math.max(t, 0), T)); return s.v0 + s.a * (t - s.t0); };
  const acc = (t) => segAt(Math.min(Math.max(t, 0), T)).a;
  const tMax = T;
  const f = {
    kind: 'trip', tMax, tFlight: tMax, S, pos, vel, acc, X, D,
    params: { u: 0, theta: 0, h: 0, g: 0 }, bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
    path(n = 200, tEnd = tMax) { const o = []; for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; o.push({ t, x: pos(t), y: 0 }); } return o; },
  };
  const notes = [
    ...S.filter((s) => s.found).map((s) => `Segment ${s.i} takes ${M`${d(s.t)} [s]`}${s.found === 'back' ? `, to come back to where segment ${back} started` : ', so the total time comes to what is given'}.`),
    ...['car', 'foot'].filter((w) => S.some((s) => s.who === w)).map((w) => {
      const seg = S.filter((s) => s.who === w), cov = snap(seg.reduce((a, s) => a + Math.abs(s.s), 0));
      return `${w === 'car' ? 'The car' : 'On foot, the driver'} covers ${M`${d(cov)} [m]`}${w === 'car' ? `, ending ${M`${d(Math.abs(snap(seg.reduce((a, s) => a + s.s, 0))))} [m]`} from where it set off` : ''}.`;
    }),
    `At ${M`t = ${d(T)} [s]`} it all ends ${M`${d(Math.abs(X))} [m]`} ${X >= -EPS ? 'ahead of' : 'behind'} the start.`,
  ];
  const carD = snap(S.filter((s) => s.who === 'car').reduce((a, s) => a + Math.abs(s.s), 0));
  const derived = [...S.filter((s) => s.found).map((s) => M`t_${s.i} = ${d(s.t)} [s]`), ...(carD > 0 ? [`the car covers ${M`${d(carD)} [m]`}`] : [`${M`${d(D)} [m]`} covered`])];
  return { ok: true, mode: 'trip', axis: 'along', S, f, T, X, D, back, rows, findRows, notes, derived, params: f.params,
    convention: 'Forwards is positive; a velocity below zero is going back.' };
}

export function tripWorking(solved) {
  if (!solved?.ok) return [];
  const out = [];
  if (solved.findRows.length) out.push({ title: 'The times left to find', rows: solved.findRows,
    note: 'A moving segment’s time comes from where it ends: the area under the graph from the segment it returns to adds to zero. A stop’s time is what is left of the total.' });
  out.push({ title: 'Each segment of the graph', rows: solved.rows,
    note: 'Each segment is a straight line on the graph: its gradient is the acceleration, the area under it the displacement — below the axis, going back.' });
  return out;
}
