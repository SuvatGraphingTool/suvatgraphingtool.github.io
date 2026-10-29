// marks.js — a ball falling freely past two marks M and N, one above the
// other: the top and bottom of a window, two points on a cliff face. The
// paper gives two of the speed at M, the speed at N, the time between them
// and the distance between them, and asks for the rest — or gives the speeds
// in a letter (u at M, a multiple of u at N) and asks for the time and the
// distance in u and g. From there: how far above M it was dropped from rest,
// and how high M must be above the ground.
//
// NO NEW PHYSICS. Down positive, a = g: in numbers the twelve's five-equation
// solver (js/core/suvat.js `solve`) works M to N from any three of s, u, v, a,
// t; in letters the same equations with u = 1 and g = 1, each answer a number
// times its letters (js/core/letters.js `inLetters`).
//
// CONVENTION. Down positive from M; t from passing M.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solve } from './suvat.js';
import { inLetters } from './letters.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const UNIT = { s: 'm', u: 'm s^-1', v: 'm s^-1', a: 'm s^-2', t: 's' };

/**
 * @param k { mode, g, vM, vN, t, h,  k,  H, look }
 *   numbers: two of vM, vN (speeds, downwards), t (M to N), h (M to N); g
 *   letters: k — the speed at N is k times the speed u at M (k > 1)
 *   H      how high M is above the ground (numbers), to check and find the landing
 */
export function solveMarks(k0 = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const look = k0.look === 'cliff' ? 'cliff' : 'window';
  if (k0.mode === 'letters') {
    const kq = k0.k;
    if (!have(kq)) return fail('Still needed: the speed at N as a multiple of the speed u at M — 3 for "3u".');
    if (!(kq > 1)) return fail('Falling freely it speeds up: the speed at N is more than u, so give a multiple bigger than 1.');
    // u = g = 1: t = (k − 1), MN = (k² − 1)/2, drop above M = 1/2
    const tL = snap(kq - 1), hL = snap((kq * kq - 1) / 2);
    const rows = [
      { f: M`v = u + at`, s: M`${kq}u = u + gt`, r: M`t = ${inLetters(tL, 'u', 'g')}` },
      { f: M`v^2 = u^2 + 2as`, s: M`(${kq}u)^2 = u^2 + 2gs`, r: M`s = ${inLetters(hL, 'u^2', 'g')}` },
    ];
    const aboveRows = [{ f: M`v^2 = u^2 + 2as`, s: M`u^2 = 0 + 2gs`, r: M`s = ${inLetters(0.5, 'u^2', 'g')}` }];
    const notes = [`From M to N takes ${M`${inLetters(tL, 'u', 'g')}`} and covers ${M`${inLetters(hL, 'u^2', 'g')}`}.`,
      `N is above the ground, so M is higher than ${M`${inLetters(hL, 'u^2', 'g')}`} above it.`,
      `Dropped from rest, it was let go ${M`${inLetters(0.5, 'u^2', 'g')}`} above M.`];
    // the motion, in units of u/g and u²/g: from rest, to a little past N
    const t0 = 1, tEnd = 1 + tL;
    const f = { kind: 'marks', look, letters: true, tMax: tEnd * 1.08, tM: t0, tN: tEnd, yM: 0.5, yN: 0.5 + hL, g: 1, ground: null,
      pos: (t) => 0.5 * t * t, vel: (t) => t, acc: () => 1 };
    return { ok: true, mode: 'marks', letters: true, kq, tL, hL, rows, aboveRows, groundRows: [], notes, derived: [M`t = ${inLetters(tL, 'u', 'g')}`], f };
  }

  // ── in numbers
  const g = k0.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  const given = { a: g };
  for (const [key, from] of [['u', 'vM'], ['v', 'vN'], ['t', 't'], ['s', 'h']]) if (have(k0[from])) given[key] = k0[from];
  const n = Object.keys(given).length - 1;
  if (n < 2) return fail('Still needed: two of the speed at M, the speed at N, the time from M to N and the distance between them.');
  if (n > 2) return fail('Give two of the speed at M, the speed at N, the time and the distance — the other two are found from them.');
  for (const [key, v] of Object.entries(given)) if (key !== 'a' && !(v >= 0)) return fail('Speeds, the time and the distance are given as sizes: downwards, all positive.');
  if (have(given.u) && have(given.v) && !(given.v > given.u)) return fail('Falling freely it speeds up: the speed at N must be more than at M.');
  const r = solve(given);
  if (!r.ok) return fail(r.error);
  const V = r.values;
  if (!(V.t > 0) || V.u < -1e-9) return fail('No fall from M to N fits those numbers: with these it would be rising at M.');
  const rows = r.steps.map((sp) => ({ f: sp.formula, s: sp.substitution, r: M`${sp.target} = ${d(snap(sp.value))} [${UNIT[sp.target]}]` }));
  const above = snap(V.u * V.u / (2 * g));
  const aboveRows = [{ f: M`v^2 = u^2 + 2as`, s: M`${d(snap(V.u))}^2 = 0 + 2 * ${d(g)}s`, r: M`s = ${d(above)} [m]` }];
  const groundRows = [];
  let ground = null;
  if (have(k0.H)) {
    if (!(k0.H > V.s - 1e-9)) return fail(`M is only ${M`${d(k0.H)} [m]`} up, but N is ${M`${d(snap(V.s))} [m]`} below it: N would be underground.`);
    const vG = Math.sqrt(V.u * V.u + 2 * g * k0.H), tG = (vG - V.u) / g;
    ground = { H: k0.H, v: snap(vG), t: snap(tG) };
    groundRows.push({ f: M`v^2 = u^2 + 2as`, s: M`${d(snap(V.u))}^2 + 2 * ${d(g)} * ${d(k0.H)}`, r: M`v = ${d(ground.v)} [m s^-1]` });
    groundRows.push({ f: M`t = (v - u)/a`, s: M`(${d(ground.v)} - ${d(snap(V.u))})/${d(g)}`, r: M`t = ${d(ground.t)} [s]` });
  }
  const notes = [`From M to N: ${M`${d(snap(V.s))} [m]`} in ${M`${d(snap(V.t))} [s]`}, from ${M`${d(snap(V.u))}`} to ${M`${d(snap(V.v))} [m s^-1]`}.`,
    `Dropped from rest, it was let go ${M`${d(above)} [m]`} above M.`];
  if (ground) notes.push(`It reaches the ground ${M`${d(ground.t)} [s]`} after M, at ${M`${d(ground.v)} [m s^-1]`}.`);
  const tM = V.u / g, tN = tM + V.t;
  const tEnd = ground ? tM + ground.t : tN * 1.1;
  const f = { kind: 'marks', look, letters: false, tMax: tEnd, tM, tN, yM: above, yN: above + V.s, g, ground: ground ? above + ground.H : null,
    pos: (t) => 0.5 * g * t * t, vel: (t) => g * t, acc: () => g, V };
  return { ok: true, mode: 'marks', letters: false, V, above, ground, rows, aboveRows, groundRows, notes, derived: [M`t = ${d(snap(V.t))} [s]`], f };
}

/** The working: M to N, then how far above M it was dropped, then the ground. */
export function marksWorking(s) {
  if (!s?.ok) return [];
  const out = [{ title: 'From M to N', rows: s.rows, note: s.letters ? 'Down positive, a = g; the speed at M is u.' : 'Down positive, a = g: three of the five give the other two.' },
    { title: 'Dropped from rest: how far above M', rows: s.aboveRows, note: 'From rest to the speed it has at M.' }];
  if (s.groundRows.length) out.push({ title: 'To the ground', rows: s.groundRows, note: 'From M, down to the ground.' });
  return out;
}
