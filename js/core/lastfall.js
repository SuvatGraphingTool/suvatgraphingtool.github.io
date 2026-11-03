// lastfall.js — the last stretch of a fall: something let go from rest (or
// thrown straight down) falls freely to the ground, and the paper says only
// how it passes a point p metres above the ground — its speed there is d less
// than its speed at the ground (Cambridge 9709/42 Oct/Nov 2015
// Q2: V − 10 at 35 m, V at the ground), or a fraction of it, or it takes τ
// seconds for those last p metres. From that the speed at the ground, then the
// height it was let go from, and the times.
//
// NO NEW PHYSICS: a = g all the way, down positive. The last stretch gives
// the ground speed V by v² = u² + 2as (or s = ut + ½at²) with V the unknown;
// then v² = u² + 2as from the release gives the height, and v = u + at the
// times.
//
// CONVENTION. Down positive, from where it is let go; heights measured up from
// the ground; t from the release.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap, rat } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
// a given number as given, to as many figures as it has (up to 6)
const g6 = (x) => num(Number(x.toPrecision(6)), 6, { trim: true });

/**
 * @param k { mode, p, dv, k, tau, u, g, look }
 *   mode  'diff' (the speed at the point is dv less than at the ground), 'ratio' (the ground speed is k times
 *         the speed at the point) or 'time' (the last p metres take tau seconds)
 *   p     the point's height above the ground (m);  u  its speed straight down when let go (blank: from rest)
 */
export function solveLastFall(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  const mode = ['diff', 'ratio', 'time'].includes(k.mode) ? k.mode : 'diff';
  if (!have(k.p) || !(k.p > 0)) return fail('Still needed: the point’s height above the ground, a positive number of metres.');
  const u = have(k.u) ? k.u : 0;
  if (u < 0) return fail('Its speed when let go is straight down: a size, 0 or more.');
  const { p } = k, rows = [];
  let V, vP;
  if (mode === 'diff') {
    if (!have(k.dv)) return fail('Still needed: how much faster it is at the ground than at the point, in metres per second.');
    if (!(k.dv > 0)) return fail('It is faster at the ground than at the point: the difference is more than 0.');
    const dv = k.dv;
    // V² = (V − dv)² + 2gp  →  2 dv V − dv² = 2gp
    V = snap((2 * g * p + dv * dv) / (2 * dv)); vP = snap(V - dv);
    rows.push({ f: M`V^2 = (V - ${d(dv)})^2 + 2gs`, s: M`V^2 = (V - ${d(dv)})^2 + 2 * ${d(g)} * ${d(p)}`, r: M`${d(2 * dv)}V - ${d(dv * dv)} = ${d(2 * g * p)}` });
    rows.push({ f: M`V = (2gs + ${d(dv)}^2)/(${d(2 * dv)})`, s: M`V = (${d(2 * g * p)} + ${d(dv * dv)})/(${d(2 * dv)})`, r: M`V = ${d(V)} [m s^-1]` });
  } else if (mode === 'ratio') {
    if (!have(k.k) || !(k.k > 1)) return fail('Still needed: how many times faster it is at the ground than at the point — a number more than 1.');
    const kk = k.k;
    // V² − (V/k)² = 2gp
    V = snap(Math.sqrt((2 * g * p) / (1 - 1 / (kk * kk)))); vP = snap(V / kk);
    // a multiple the student gave as a fraction, 4/3, stays one: at the point the speed is (3/4)V
    const fr = rat(kk, 50), frac = fr && fr.q > 1;
    const atP = frac ? `(${fr.q}/${fr.p})V` : `V/${g6(kk)}`, sqP = frac ? `${fr.q * fr.q}/${fr.p * fr.p}` : `1/${g6(kk * kk)}`;
    rows.push({ f: M`V^2 = (${atP})^2 + 2gs`, s: M`V^2 (1 - ${sqP}) = 2 × ${d(g)} × ${d(p)}`, r: M`V^2 = ${d(snap(V * V))}` });
    rows.push({ f: '', s: M`V = sqrt(${d(snap(V * V))})`, r: M`V = ${d(V)} [m s^-1]` });
  } else {
    if (!have(k.tau) || !(k.tau > 0)) return fail('Still needed: how long the last stretch takes, a positive number of seconds.');
    const tau = k.tau;
    // the last stretch: s = ut + ½at² with u the speed at the point
    vP = snap((p - 0.5 * g * tau * tau) / tau); V = snap(vP + g * tau);
    rows.push({ f: M`s = ut + 1/2 at^2`, s: tau === 1 ? M`${d(p)} = u + 1/2 * ${d(g)} * 1^2` : M`${d(p)} = ${g6(tau)}u + 1/2 * ${d(g)} * ${g6(tau)}^2`, r: M`u = ${d(vP)} [m s^-1]` });
    rows.push({ f: M`v = u + at`, s: M`V = ${d(vP)} + ${d(g)} * ${g6(tau)}`, r: M`V = ${d(V)} [m s^-1]` });
  }
  // the point must be below where it was let go: there it is moving at least as fast as at the start
  // the point must be strictly below where it was let go
  if (!(vP > u + 1e-9)) return fail(mode === 'time'
    ? `To cover the last ${M`${d(p)} [m]`} in so long it would be moving at ${M`${d(vP)} [m s^-1]`} at the point${u ? `, slower than the ${M`${d(u)} [m s^-1]`} it was thrown down at` : ''}: no fall from above the point does that. Give a shorter time, or a greater height.`
    : `It would pass the point at ${M`${d(vP)} [m s^-1]`}${u ? `, slower than the ${M`${d(u)} [m s^-1]`} it was thrown down at` : ''}: no fall from above the point does that. Give a smaller difference, or a greater height for the point.`);
  if (V > 2000 || (V * V - u * u) / (2 * g) > 20000) return fail('That is a fall of more than 20 km: check the numbers.');

  // ── from the release: the height, then the times
  const H = snap((V * V - u * u) / (2 * g)), tG = snap((V - u) / g), tP = snap((vP - u) / g), tLast = snap(tG - tP);
  // the last stretch's own time, worked (in the time mode it was given)
  if (mode !== 'time') rows.push({ f: M`v = u + at`, s: M`${d(V)} = ${d(vP)} + ${d(g)}t`, r: M`t = ${d(tLast)} [s] "for the last stretch"` });
  rows.push({ f: M`v^2 = u^2 + 2as`, s: M`${d(V)}^2 = ${d(u)}^2 + 2 * ${d(g)}H`, r: M`H = ${d(H)} [m]` });
  rows.push({ f: M`v = u + at`, s: M`${d(V)} = ${d(u)} + ${d(g)}t`, r: M`t = ${d(tG)} [s]` });
  const pos = (t) => { const c = Math.min(Math.max(t, 0), tG); return u * c + 0.5 * g * c * c; };
  const vel = (t) => u + g * Math.min(Math.max(t, 0), tG);
  const acc = () => g;
  const tMax = snap(tG + Math.max(0.3, tG * 0.08));

  const notes = [
    mode === 'diff' ? `Over the last ${M`${d(p)} [m]`} it speeds up by ${M`${d(k.dv)} [m s^-1]`}: from ${M`${d(vP)}`} to ${M`${d(V)} [m s^-1]`}, ${M`${d(tLast)} [s]`} for that stretch.`
      : mode === 'ratio' ? `Over the last ${M`${d(p)} [m]`} its speed grows ${(() => { const r0 = rat(k.k, 50); return r0 && r0.q > 1 ? M`${r0.p}/${r0.q}` : g6(k.k); })()} times: from ${M`${d(vP)}`} to ${M`${d(V)} [m s^-1]`}.`
        : `It covers the last ${M`${d(p)} [m]`} in ${M`${d(k.tau)} [s]`}, passing the point at ${M`${d(vP)} [m s^-1]`} and reaching the ground at ${M`${d(V)} [m s^-1]`}.`,
    `It was let go ${M`${d(H)} [m]`} above the ground${u ? `, thrown down at ${M`${d(u)} [m s^-1]`}` : ', from rest'}, and reaches the ground ${M`${d(tG)} [s]`} later.`,
  ];
  const derived = [M`V = ${d(V)} [m s^-1]`, M`H = ${d(H)} [m]`];

  const f = { kind: 'lastfall', look: k.look === 'cliff' ? 'cliff' : 'tower', mode, g, u, p, H, V, vP, tP, tG, tLast, dv: k.dv ?? null, kk: k.k ?? null, kFrac: (() => { const r0 = have(k.k) ? rat(k.k, 50) : null; return r0 && r0.q > 1 ? r0 : null; })(), tau: k.tau ?? null,
    pos, vel, acc, tMax, tFlight: tMax, tMid: snap(tG / 2), params: { u: 0, theta: 0, h: 0, g } };
  return { ok: true, mode: 'lastfall', V, vP, H, tG, tP, tLast, rows, notes, derived, f };
}

/** The working: the last stretch first (it gives V), then the whole fall from the release. */
export function lastFallWorking(s) {
  if (!s?.ok) return [];
  const n = s.f.mode === 'time' ? 2 : 3;
  return [
    { title: 'The last stretch: the speed at the ground', rows: s.rows.slice(0, n), note: `Down is positive and ${M`a = g`}. Over the last ${M`${d(s.f.p)} [m]`} the speed at the ground, ${M`V`}, is the unknown.` },
    { title: 'The whole fall: the height and the time', rows: s.rows.slice(n), note: `From where it is let go to the ground, with the ${M`V`} just found.` },
  ];
}
