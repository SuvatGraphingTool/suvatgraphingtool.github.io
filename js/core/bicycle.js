// bicycle.js — two travellers, one bicycle: each walks part of a journey and
// rides the one bicycle for the rest, and they set off and arrive together.
//
// The exam family (OCR 4728 Jun 2015 Q3): A cycles at 20 km h⁻¹ for an hour,
// leaves the bicycle at the roadside and walks the rest at 5 km h⁻¹; B walks
// at 4 km h⁻¹ until it finds the bicycle, then cycles at 15 km h⁻¹. They
// finish at the same instant, T hours after setting off. How far A cycles, how
// long B walks, T, and the length of the journey.
//
// Every stage is a constant speed: distance = speed × time. The bicycle is
// left at D = A's cycling speed × A's cycling time; B reaches it at D ÷ B's
// walking speed. From there both cover the same rest of the road, J − D, in
// the same time to the finish: (J − D)/A's walk = (J − D)/B's ride + (B's
// arrival at the bicycle − A's leaving it).
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

/**
 * @param k { A: { ride, rideT | rideD, walk }, B: { walk, ride }, units: 'km' | 'm' }
 *   A.ride — A's cycling speed; A.rideT — how long A cycles (or A.rideD, how far)
 *   A.walk — A's walking speed after; B.walk, B.ride — B's walking and cycling speeds
 */
export function solveBicycle(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const U = k.units === 'm' ? { len: 'm', time: 's', speed: 'm s^-1', speedText: 'm s⁻¹' } : { len: 'km', time: 'h', speed: 'km h^-1', speedText: 'km h⁻¹' };
  const A = k.A || {}, B = k.B || {};
  for (const [v, what] of [[A.ride, 'A’s cycling speed'], [A.walk, 'A’s walking speed'], [B.walk, 'B’s walking speed'], [B.ride, 'B’s cycling speed']]) {
    if (!have(v)) return fail(`Give ${what}.`);
    if (!(v > 0)) return fail(`${what.replace(/^./, (c) => c.toUpperCase())} is a speed: give it as a positive number.`);
  }
  if (have(A.rideT) && have(A.rideD)) return fail('Give how long A cycles, or how far — not both: one gives the other.');
  if (!have(A.rideT) && !have(A.rideD)) return fail('Give how long A cycles before leaving the bicycle (or how far).');
  const rows = [];
  let D, tA1;
  if (have(A.rideT)) {
    if (!(A.rideT > 0)) return fail('A cycles for a while first: give a positive time.');
    tA1 = A.rideT; D = snap(A.ride * tA1);
    rows.push({ f: M`"distance" = "speed" × "time"`, s: M`D = ${d(A.ride)} × ${d(tA1)}`, r: M`D = ${d(D)} [${U.len}]` });
  } else {
    if (!(A.rideD > 0)) return fail('A cycles some way first: give a positive distance.');
    D = A.rideD; tA1 = snap(D / A.ride);
    rows.push({ f: M`"time" = "distance"/"speed"`, s: M`${d(D)}/${d(A.ride)}`, r: M`${d(tA1)} [${U.time}] "on the bicycle"` });
  }
  // B reaches the bicycle
  const tB1 = snap(D / B.walk);
  rows.push({ f: M`"time" = "distance"/"speed"`, s: M`${d(D)}/${d(B.walk)}`, r: M`${d(tB1)} [${U.time}] "for B to walk to it"` });
  if (tB1 < tA1 - 1e-9) return fail(`B walks to the bicycle in ${M`${d(tB1)} [${U.time}]`}, before A has left it there at ${M`${d(tA1)} [${U.time}]`}: B would have to wait for it. Is B walking faster than A cycles?`);
  // the same rest of the road, J − D, finished together: (J − D)/A.walk − (J − D)/B.ride = tB1 − tA1
  if (!(B.ride > A.walk)) return fail('B must ride faster than A walks to catch up: otherwise they never arrive together.');
  const rest = snap((tB1 - tA1) / (1 / A.walk - 1 / B.ride));
  if (!(rest > 1e-9)) return fail('B reaches the bicycle just as A leaves it: they are together there, and the journey would end at the bicycle.');
  const T = snap(tA1 + rest / A.walk), J = snap(D + rest);
  const tB2 = snap(T - tB1);
  const finish = [
    { f: M`"A’s distance" = "B’s distance"`, s: M`${d(A.ride)} × ${d(tA1)} + ${d(A.walk)}(T - ${d(tA1)}) = ${d(B.walk)} × ${d(tB1)} + ${d(B.ride)}(T - ${d(tB1)})`, r: M`T = ${d(T)} [${U.time}]` },
    { f: M`J = D + "A’s walk"`, s: M`${d(D)} + ${d(A.walk)} × ${d(snap(T - tA1))}`, r: M`J = ${d(J)} [${U.len}]` },
    { f: M`"check: B"`, s: M`${d(B.walk)} × ${d(tB1)} + ${d(B.ride)} × ${d(tB2)}`, r: M`${d(J)} [${U.len}]` },
  ];
  // where each is, at time t
  const posA = (t) => (t <= tA1 ? A.ride * t : Math.min(J, D + A.walk * (t - tA1)));
  const posB = (t) => (t <= tB1 ? B.walk * t : Math.min(J, D + B.ride * (t - tB1)));
  const velA = (t) => (t < tA1 ? A.ride : A.walk);
  const velB = (t) => (t < tB1 ? B.walk : B.ride);
  const notes = [
    `A cycles ${M`${d(D)} [${U.len}]`} in ${M`${d(tA1)} [${U.time}]`} and leaves the bicycle there.`,
    `B, walking, reaches it after ${M`${d(tB1)} [${U.time}]`}${tB1 > tA1 + 1e-9 ? `, ${M`${d(snap(tB1 - tA1))} [${U.time}]`} after A left it` : ', just as A leaves it'}.`,
    `They arrive together after ${M`T = ${d(T)} [${U.time}]`}: the journey is ${M`${d(J)} [${U.len}]`}. B, faster on the bicycle, draws level with A only at the finish.`,
  ];
  const f = {
    kind: 'bicycle', tMax: T, tFlight: T, T, J, D, tA1, tB1, U, A: { ...A }, B: { ...B },
    posA, posB, velA, velB,
    // who has the bicycle: A until tA1, then it lies at D until B gets there at tB1, then B
    bikeAt: (t) => (t < tA1 ? { who: 'A', x: posA(t) } : t < tB1 ? { who: null, x: D } : { who: 'B', x: posB(t) }),
    pos: (t) => ({ x: posA(t), y: 0 }), vel: (t) => ({ x: velA(t), y: 0 }),
    params: { u: 0, theta: 0, h: 0, g: 0 }, bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
    path(n = 100, tEnd = T) { const o = []; for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; o.push({ t, x: posA(t), y: 0 }); } return o; },
  };
  const exprs = { i: `${M`D = ${d(D)} [${U.len}]`} <span class="pand">and</span> B walks for ${M`${d(tB1)} [${U.time}]`}` };
  return { ok: true, mode: 'bicycle', f, U, D, tA1, tB1, tB2, T, J, rows, finish, notes, exprs,
    derived: [M`D = ${d(D)} [${U.len}]`, M`T = ${d(T)} [${U.time}]`, M`J = ${d(J)} [${U.len}]`], params: f.params };
}

export function bicycleWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'Where the bicycle is left', rows: s.rows, note: 'Each stage is at a constant speed: distance = speed × time.' },
    { title: 'Arriving together', rows: s.finish, note: 'From the bicycle on, both cover the same rest of the road and finish at the same instant: equate their whole distances at T.' },
  ];
}
