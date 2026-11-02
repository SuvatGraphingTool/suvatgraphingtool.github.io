// ice.js — a stone sliding down the ice with a constant deceleration, past
// lines A, B and C, to rest at D. The paper gives the speeds at A, B and C and
// nothing else: the ratio of the distances AB : BC follows from the speeds
// alone, whatever the deceleration. Then one more number — where it comes to
// rest, one of the distances, or the deceleration itself — fixes the scale,
// and every distance and time. (CIE 9709/41 May/Jun 2017 Q5.)
//
// NO NEW PHYSICS. v² = u² − 2as on each stretch, with the deceleration a the
// same throughout: AB = (u_A² − u_B²)/(2a), BC = (u_B² − u_C²)/(2a), so AB : BC
// is (u_A² − u_B²) : (u_B² − u_C²), and a cancels. To rest from A, AD = u_A²/(2a).
// Times from v = u − at.
//
// IN LETTERS UNTIL SCALED. With no distance and no deceleration given, every
// distance is a number over a, and every time too: the engine answers them in
// those units (a = 1) and says so.
//
// CONVENTION. Forwards positive, from A; a is the size of the deceleration.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap, rat } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const dx = (x) => num(x, 6, { trim: true });   // a found value, substituted as it is

/** p : q in its lowest whole terms where it has them, else as x : 1 — set
    as its two numbers with the ratio's colon between (the notation has no colon). */
function ratioOf(p, q) {
  const r = rat(p / q, 200);
  const [a, b] = r ? [r.p, r.q] : [snap(p / q), 1];
  return { p: a, q: b, src: `${M`${d(a)}`} : ${M`${d(b)}`}` };
}
const AB_BC = `${M`AB`} : ${M`BC`}`;

/**
 * @param k { uA, uB, uC, a, AD, AB, BC }
 *   uA, uB, uC  its speeds at A, B and C (m s⁻¹); C may be left out
 *   one of: a (the deceleration's size, m s⁻²), AD (A to where it rests),
 *   AB or BC (m) — or none, for the answers over a
 */
export function solveIce(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  if (!have(k.uA) || !have(k.uB)) return fail('Still needed: its speed at A and at B.');
  const C = have(k.uC);
  const { uA, uB } = k, uC = C ? k.uC : null;
  if (!(uA > uB && uB > 0)) return fail('Slowing down steadily and still moving, its speed at A is more than at B, and at B more than 0.');
  if (C && !(uB > uC && uC >= 0)) return fail('Its speed at C is less than at B — and 0 or more.');
  const scales = ['a', 'AD', 'AB', 'BC'].filter((q) => have(k[q]));
  if (scales.length > 1) return fail('Give one of the deceleration, AD, AB or BC: one fixes the rest.');
  if (scales[0] === 'BC' && !C) return fail('BC needs the speed at C.');
  if (scales.length && !(k[scales[0]] > 0)) return fail('The deceleration and the distances are positive numbers.');

  // a × each distance, from v² = u² − 2as: the deceleration not yet known
  const kAB = (uA * uA - uB * uB) / 2, kBC = C ? (uB * uB - uC * uC) / 2 : null, kAD = (uA * uA) / 2;
  const rows = [
    { f: M`v^2 = u^2 - 2as`, s: M`${d(uB)}^2 = ${d(uA)}^2 - 2a * AB`, r: M`AB = ${d(snap(kAB))}/a` },
  ];
  if (C) rows.push({ f: M`v^2 = u^2 - 2as`, s: M`${d(uC)}^2 = ${d(uB)}^2 - 2a * BC`, r: M`BC = ${d(snap(kBC))}/a` });
  const ratio = C ? ratioOf(kAB, kBC) : null;
  if (C) rows.push({ f: AB_BC, s: `${M`${d(snap(kAB))}/a`} : ${M`${d(snap(kBC))}/a`}`, r: ratio.src });

  // the scale: the deceleration, given or found from the one distance given
  let a = 1, scaled = !!scales.length;
  const by = scales[0];
  if (by === 'a') a = k.a;
  else if (by === 'AD') { a = snap(kAD / k.AD); rows.push({ f: M`0 = u^2 - 2as`, s: M`0 = ${d(uA)}^2 - 2a * ${d(k.AD)}`, r: M`a = ${d(a)} [m s^-2]` }); }
  else if (by === 'AB') { a = snap(kAB / k.AB); rows.push({ f: M`AB = ${d(snap(kAB))}/a`, s: M`${d(k.AB)} = ${d(snap(kAB))}/a`, r: M`a = ${d(a)} [m s^-2]` }); }
  else if (by === 'BC') { a = snap(kBC / k.BC); rows.push({ f: M`BC = ${d(snap(kBC))}/a`, s: M`${d(k.BC)} = ${d(snap(kBC))}/a`, r: M`a = ${d(a)} [m s^-2]` }); }

  const AB = snap(kAB / a), BC = C ? snap(kBC / a) : null, AD = snap(kAD / a), CD = C ? snap((uC * uC) / 2 / a) : null;
  const tB = snap((uA - uB) / a), tC = C ? snap((uA - uC) / a) : null, tD = snap(uA / a);
  if (scaled) {
    if (by !== 'AB') rows.push({ f: M`AB = ${d(snap(kAB))}/a`, s: M`${d(snap(kAB))}/${dx(a)}`, r: M`AB = ${d(AB)} [m]` });
    if (C && by !== 'BC') rows.push({ f: M`BC = ${d(snap(kBC))}/a`, s: M`${d(snap(kBC))}/${dx(a)}`, r: M`BC = ${d(BC)} [m]` });
    if (by !== 'AD') rows.push({ f: M`AD = u_A^2/(2a)`, s: M`${d(uA)}^2/(2 * ${dx(a)})`, r: M`AD = ${d(AD)} [m]` });
  }
  rows.push({ f: M`v = u - at`, s: M`0 = ${d(uA)} - ${scaled ? dx(a) : 'a'}t`, r: scaled ? M`t = ${d(tD)} [s] "to rest"` : M`t = ${d(uA)}/a "to rest"` });

  const notes = [];
  if (C) notes.push(`From the speeds alone, ${AB_BC} = ${ratio.src}: the deceleration is the same on both stretches, so it cancels.`);
  notes.push(scaled
    ? `With ${by === 'a' ? `a deceleration of ${M`${d(a)} [m s^-2]`}` : by === 'AD' ? `${M`AD = ${d(k.AD)} [m]`}` : `${M`${by} = ${d(k[by])} [m]`}`}, ${by === 'a' ? '' : `the deceleration is ${M`${d(a)} [m s^-2]`}: `}${M`AB = ${d(AB)} [m]`}${C ? `, ${M`BC = ${d(BC)} [m]`}` : ''}, and it comes to rest ${M`${d(AD)} [m]`} past A after ${M`${d(tD)} [s]`}.`
    : 'With no distance and no deceleration given, every distance and time is a number over the deceleration a: they are shown here as if a were 1. Give one distance, or a, to scale them.');
  const derived = [
    ...(C ? [`${AB_BC} = ${ratio.src}`] : []),
    ...(scaled ? [`${M`a = ${d(a)} [m s^-2]`}`, C ? `${M`BC = ${d(BC)} [m]`}` : `${M`AB = ${d(AB)} [m]`}`, `${M`AD = ${d(AD)} [m]`}`] : []),
  ];

  const pos = (t) => { const c = Math.min(Math.max(t, 0), tD); return uA * c - 0.5 * a * c * c; };
  const vel = (t) => { const c = Math.min(Math.max(t, 0), tD); return uA - a * c; };
  const f = { kind: 'ice', uA, uB, uC, a, scaled, tMax: tD, tFlight: tD, AB, BC, AD, CD, tB, tC, tD,
    // C at rest is D itself: one mark, named for both
    marks: [{ id: 'A', x: 0, t: 0, v: uA }, { id: 'B', x: AB, t: tB, v: uB }, ...(C && uC > 0 ? [{ id: 'C', x: snap(AB + BC), t: tC, v: uC }] : []), { id: C && uC === 0 ? 'C, D' : 'D', x: AD, t: tD, v: 0 }],
    pos, vel, acc: (t) => (t < tD - 1e-9 ? -a : 0),
    params: { u: uA, theta: 0, h: 0, g: 9.8 } };
  // unscaled, there is no a and no distance in metres to answer with: only the ratio
  const sc = (x) => (scaled ? x : null);
  return { ok: true, mode: 'ice', scaled, by, a: sc(a), AB: sc(AB), BC: sc(BC), AD: sc(AD), CD: sc(CD), tB: sc(tB), tC: sc(tC), tD: sc(tD),
    ratio: ratio ? snap(ratio.p / ratio.q) : null, ratioP: ratio?.p ?? null, ratioQ: ratio?.q ?? null, ratioSrc: ratio?.src, rows, notes, derived, f };
}

/** The working: each stretch in terms of a, the ratio, then the scale. */
export function iceWorking(s) {
  if (!s?.ok) return [];
  return [{ title: 'Each stretch over a, then the scale', rows: s.rows,
    note: `On every stretch ${M`v^2 = u^2 - 2as`} with the same deceleration ${M`a`}, so each distance is a number over ${M`a`}. In a ratio of two of them the ${M`a`} cancels; one distance, or ${M`a`} itself, then fixes them all.` }];
}
