// towards.js — two projectiles thrown towards each other in one vertical
// plane, from A and B on level ground, one perhaps a moment after the other:
// when are they level across, how high is each then, and so do they collide?
//
// NO NEW PHYSICS. Each is the twelve's own projectile (js/core/projectile.js
// `flight`), timed from its own launch. Across, A moves on at uA cos θA and B
// back at uB cos θB, so the moment they are level across is one linear
// equation; each one's height then is s = ut − ½gt². They collide only if
// those heights are equal and both are still in the air.
//
// CONVENTION. x from A towards B; up positive; t from A's launch.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { flight } from './projectile.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const DEG = Math.PI / 180;
const HIT = 1e-3;                                         // within a millimetre: the same height

/**
 * @param k { g, A: { u, theta, h }, B: { u, theta, h, t0 }, D, range }
 *   D      the distance from A to B — or range: true, AB is A's range
 *   B.t0   how long after A that B is thrown (blank: together)
 */
export function solveTowards(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  const P = {};
  for (const n of ['A', 'B']) {
    const q = k[n] || {};
    if (!have(q.u) || !(q.u > 0)) return fail(`Still needed: ${n}’s speed of projection, a positive number.`);
    if (!have(q.theta) || !(q.theta > 0 && q.theta < 90)) return fail(`Still needed: ${n}’s angle above the horizontal, between 0° and 90°.`);
    const h = have(q.h) ? q.h : 0;
    if (h < 0) return fail(`${n} is thrown from the ground or above it: give its height as 0 or more.`);
    P[n] = { u: q.u, theta: q.theta, h, t0: n === 'B' && have(q.t0) ? q.t0 : 0, f: flight({ u: q.u, theta: q.theta, h, g }) };
  }
  if (P.B.t0 < 0) return fail('B is thrown at or after A: give how long after as 0 or more.');
  const A = P.A, B = P.B, rows = [];
  let D = k.D;
  if (k.range && have(k.D)) return fail('AB is A\u2019s range, so a distance typed for it is not used: clear it, or choose "the distance given".');
  if (k.range) {
    if (A.h > 0) return fail('A’s range is from level ground: with A thrown from a height, give the distance AB instead.');
    D = snap(A.f.range);
    rows.push({ f: M`R = (u^2 sin 2theta)/g`, s: M`(${d(A.u)}^2 sin ${d(2 * A.theta)}°)/${d(g)}`, r: M`AB = ${d(D)} [m]` });
  }
  if (!have(D) || !(D > 0)) return fail('Still needed: how far apart A and B are — or say that AB is A’s range.');

  // ── level across: uA cos θA t = D − uB cos θB (t − t0)
  const ca = snap(A.f.ux), cb = snap(B.f.ux);
  const t = snap((D + cb * B.t0) / (ca + cb));
  rows.push({ f: M`x_A = x_B`, s: M`${d(ca)}t = ${d(D)} - ${d(cb)}${B.t0 > 0 ? `(t - ${d(B.t0)})` : 't'}`, r: M`t = ${d(t)} [s]` });
  const tA = t, tB = snap(t - B.t0);
  const yA = snap(A.h + A.f.uy * tA - 0.5 * g * tA * tA), yB = snap(B.h + B.f.uy * tB - 0.5 * g * tB * tB);
  const hRow = (n, p, tt, y) => ({ f: n === 'B' && p.t0 > 0 ? M`y_B = h + (u sin theta)t_B - ½g t_B^2` : M`y_${n} = h + (u sin theta)t - ½gt^2`, s: M`${p.h ? `${d(p.h)} + ` : ''}${d(snap(p.f.uy))} * ${d(tt)} - ½ * ${d(g)} * ${d(tt)}^2`, r: M`y_${n} = ${d(y)} [m]` });
  // each one's height then, only while it is in the air
  const inAirA = tA <= A.f.tFlight + 1e-9, inAirB = tB >= 0 && tB <= B.f.tFlight + 1e-9;
  if (B.t0 > 0 && tB >= 0) rows.push({ f: M`t_B = t - t_0`, s: M`${d(t)} - ${d(B.t0)}`, r: M`t_B = ${d(tB)} [s]` });
  if (inAirA) rows.push(hRow('A', A, tA, yA)); else rows.push({ f: M`"A lands at" t = ${d(snap(A.f.tFlight))} [s]`, s: '', r: M`"landed before then"` });
  if (inAirB) rows.push(hRow('B', B, tB, yB)); else if (tB >= 0) rows.push({ f: M`"B lands at" t_B = ${d(snap(B.f.tFlight))} [s]`, s: '', r: M`"landed before then"` });
  const notes = [], derived = [];
  let outcome;
  if (A.f.tFlight < B.t0 - 1e-9) { outcome = 'landed'; notes.push(`A has landed, at ${M`t = ${d(snap(A.f.tFlight))} [s]`}, before B is even thrown: they never meet.`); }
  else if (tB < 0) { outcome = 'before'; notes.push(`A is already past where B stands before B is thrown: they never meet across.`); }
  else if (!inAirA || !inAirB) { outcome = 'landed'; notes.push(`By the time they are level across, ${!inAirA ? 'A' : 'B'} has already landed: they never collide.`); }
  else if (Math.abs(yA - yB) < HIT) { outcome = 'collide'; notes.push(`At ${M`t = ${d(t)} [s]`} they are level across and at the same height: they collide ${M`${d(yA)} [m]`} above the ground, ${M`${d(snap(ca * tA))} [m]`} from A.`); derived.push(`collide ${M`${d(yA)} [m]`} up`); }
  else { outcome = 'pass'; notes.push(`At ${M`t = ${d(t)} [s]`} they are level across but ${M`${d(snap(Math.abs(yA - yB)))} [m]`} apart in height, ${yA > yB ? 'A' : 'B'} above: they pass without colliding.`); }
  if (k.range) notes.unshift(`AB is A’s range: ${M`${d(D)} [m]`}.`);

  const tEnd = outcome === 'collide' ? t : Math.max(A.f.tFlight, B.t0 + B.f.tFlight);
  const posA = (tt) => { const q = Math.min(Math.max(tt, 0), A.f.tFlight); return { x: A.f.ux * q, y: A.h + A.f.uy * q - 0.5 * g * q * q }; };
  const posB = (tt) => { const q = Math.min(Math.max(tt - B.t0, 0), B.f.tFlight); return { x: D - B.f.ux * q, y: B.h + B.f.uy * q - 0.5 * g * q * q }; };
  const velA = (tt) => (tt < 0 || tt > A.f.tFlight ? { x: 0, y: 0 } : { x: A.f.ux, y: A.f.uy - g * tt });
  const velB = (tt) => (tt < B.t0 || tt > B.t0 + B.f.tFlight ? { x: 0, y: 0 } : { x: -B.f.ux, y: B.f.uy - g * (tt - B.t0) });
  const f = { kind: 'towards', tMax: tEnd, D, g, A, B, t, yA, yB, outcome, posA, posB, velA, velB, params: { u: A.u, theta: A.theta, h: A.h, g } };
  return { ok: true, mode: 'towards', D, t, yA, yB, outcome, rows, notes, derived, f };
}

/** The working: AB when it is a range, level across, each height then. */
export function towardsWorking(s) {
  if (!s?.ok) return [];
  return [{ title: 'Level across, and each one’s height then', rows: s.rows,
    note: `Across, each moves at a steady speed, so they are level across at one moment; they collide only if they are at the same height then.${s.f.B.t0 > 0 ? ` B\u2019s own time ${M`t_B = t - ${d(s.f.B.t0)}`}.` : ''}` }];
}
