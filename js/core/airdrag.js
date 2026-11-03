// airdrag.js — one fall, two models: with no air resistance, and with a
// constant resistance R against it. The weight less the resistance gives the
// acceleration (F = ma), and SUVAT the rest.
//
// The exam family (AQA MM1B Jan 2010 Q4): a ball released from rest 15 m up.
// With no air resistance it lands at 17.1 m s⁻¹. In fact a constant 0.9 N
// acts on the 0.5 kg ball: mg − R = ma gives a = 8 m s⁻², and it lands at
// 15.5 m s⁻¹. And why the resistance is not really constant.
//
// CONVENTION. Down positive, from where it is let go. g = 9.8 unless given.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

/**
 * @param k { h: the height it falls; m: its mass; R: the resistance — or a: its acceleration with it,
 *            or v: the speed it lands at with it; u: thrown down at (blank: let go from rest); g }
 */
export function solveAirDrag(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  if (have(k.g) && !(k.g > 0)) return fail('Give g as a positive number: down is positive here.');
  const g = have(k.g) ? k.g : 9.8;
  if (!have(k.h)) return fail('Give the height it falls from, above the ground.');
  if (!(k.h > 0)) return fail('The height it falls is more than 0.');
  const h = k.h, u = have(k.u) ? k.u : 0, m = have(k.m) ? k.m : null;
  if (u < 0) return fail('It is let go or thrown downwards: give its speed down as 0 or more.');
  if (m != null && !(m > 0)) return fail('Give the mass as a positive number.');
  const n = [have(k.R), have(k.a), have(k.v)].filter(Boolean).length;
  if (n > 1) return fail('Give the resistance, or its acceleration with the resistance, or the speed it lands at — one of them: one gives the others.');
  if (!n) return fail('Give the air resistance in newtons (with the mass), or its acceleration, or the speed it lands at.');
  // the model with no air resistance
  const v0 = snap(Math.sqrt(u * u + 2 * g * h)), t0 = snap((v0 - u) / g);
  const free = [
    { f: M`v^2 = u^2 + 2as`, s: M`v^2 = ${u ? `${d(u)}^2` : '0^2'} + 2 × ${d(g)} × ${d(h)}`, r: M`v = ${d(v0)} [m s^-1]` },
    { f: M`v = u + at`, s: M`${d(v0)} = ${d(u)} + ${d(g)}t`, r: M`t = ${d(t0)} [s]` },
  ];
  // with the resistance
  const rows = [];
  let a, R = null;
  if (have(k.R)) {
    if (m == null) return fail('With the resistance in newtons, give the mass too: F = ma needs it.');
    if (!(k.R >= 0)) return fail('The resistance is a size: give it as 0 or more.');
    if (k.R >= m * g - 1e-12) return fail(`A resistance of ${M`${d(k.R)} [N]`} is at least the weight, ${M`mg = ${d(snap(m * g))} [N]`}: it would never speed up as it falls. The model needs a resistance less than the weight.`);
    R = k.R; a = snap(g - R / m);
    rows.push({ f: M`mg - R = ma`, s: M`${d(m)} × ${d(g)} - ${d(R)} = ${d(m)}a`, r: M`a = ${d(a)} [m s^-2]` });
  } else if (have(k.a)) {
    if (!(k.a > 0 && k.a <= g)) return fail(`With air resistance against it, it speeds up at more than 0 and no more than ${M`g = ${d(g)} [m s^-2]`}.`);
    a = k.a;
    rows.push({ f: M`"given"`, s: '', r: M`a = ${d(a)} [m s^-2]` });
    if (m != null) { R = snap(m * (g - a)); rows.push({ f: M`mg - R = ma`, s: M`${d(m)} × ${d(g)} - R = ${d(m)} × ${d(a)}`, r: M`R = ${d(R)} [N]` }); }
  } else {
    if (!(k.v > u)) return fail('It lands faster than it was let go: give a landing speed more than its starting speed.');
    if (k.v > v0 + 1e-9) return fail(`With no air resistance it lands at ${M`${d(v0)} [m s^-1]`}: air resistance can only make it slower, not ${M`${d(k.v)} [m s^-1]`}.`);
    a = snap((k.v * k.v - u * u) / (2 * h));
    rows.push({ f: M`v^2 = u^2 + 2as`, s: M`${d(k.v)}^2 = ${d(u)}^2 + 2 × ${d(h)}a`, r: M`a = ${d(a)} [m s^-2]` });
    if (m != null) { R = snap(m * (g - a)); rows.push({ f: M`mg - R = ma`, s: M`${d(m)} × ${d(g)} - R = ${d(m)} × ${d(a)}`, r: M`R = ${d(R)} [N]` }); }
  }
  const v1 = snap(Math.sqrt(u * u + 2 * a * h)), t1 = snap((v1 - u) / a);
  const drag = [
    ...rows,
    // (with the landing speed given, it is not worked out again from the a it gave)
    ...(have(k.v) ? [] : [{ f: M`v^2 = u^2 + 2as`, s: M`v^2 = ${u ? `${d(u)}^2` : '0^2'} + 2 × ${d(a)} × ${d(h)}`, r: M`v = ${d(v1)} [m s^-1]` }]),
    { f: M`v = u + at`, s: M`${d(v1)} = ${d(u)} + ${d(a)}t`, r: M`t = ${d(t1)} [s]` },
  ];
  const none = Math.abs(a - g) < 1e-12;
  const notes = [
    `With no air resistance it falls at ${M`g = ${d(g)} [m s^-2]`} and lands at ${M`${d(v0)} [m s^-1]`} after ${M`${d(t0)} [s]`}.`,
    none ? `With no resistance after all, the two models are one fall: it lands at ${M`${d(v1)} [m s^-1]`} either way.` : `With ${R != null ? `a resistance of ${M`${d(R)} [N]`} against its weight${m != null ? ` of ${M`${d(snap(m * g))} [N]`}` : ''}` : 'the air against it'}, it speeds up at only ${M`${d(a)} [m s^-2]`} and lands at ${M`${d(v1)} [m s^-1]`}, ${M`${d(snap(v0 - v1))} [m s^-1]`} slower, after ${M`${d(t1)} [s]`}.`,
  ];
  if (h > 2000) notes.push('A constant resistance over a fall this long is a poor model: a real one grows with speed until the ball stops speeding up.');
  const derived = [M`v = ${d(v0)} [m s^-1]`, M`a = ${d(a)} [m s^-2]`, M`v = ${d(v1)} [m s^-1]`];
  const tMax = snap(Math.max(t0, t1) * 1.06);
  const fallFree = (t) => Math.min(h, u * t + 0.5 * g * t * t), fallDrag = (t) => Math.min(h, u * t + 0.5 * a * t * t);
  const f = {
    kind: 'airdrag', tMax, tFlight: t1, h, u, m, g, a, R, v0, v1, t0, t1,
    tMid: snap(t1 / 2), fallFree, fallDrag, velFree: (t) => (t <= t0 ? u + g * t : 0), velDrag: (t) => (t <= t1 ? u + a * t : 0),
    accFree: (t) => (t <= t0 ? g : 0), accDrag: (t) => (t <= t1 ? a : 0),
    pos: (t) => ({ x: 0, y: h - fallDrag(t) }), vel: (t) => ({ x: 0, y: -(t <= t1 ? u + a * t : 0) }),
    params: { u, theta: -90, h, g }, bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
    path(nn = 100, tEnd = tMax) { const o = []; for (let i = 0; i <= nn; i++) { const t = (i / nn) * tEnd; o.push({ t, x: 0, y: h - fallDrag(t) }); } return o; },
  };
  return { ok: true, mode: 'airdrag', f, g, a, R, v0, v1, t0, t1, free, drag, notes, derived, params: f.params,
    convention: 'Down is positive, from where it is let go.' };
}

export function airDragWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'With no air resistance', rows: s.free, note: 'Only its weight acts: it falls at g.' },
    { title: 'With the air resistance', rows: s.drag, note: 'The resistance acts up, against the motion: the resultant force down is the weight less the resistance.' },
  ];
}
