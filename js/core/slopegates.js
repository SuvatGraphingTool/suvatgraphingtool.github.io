// slopegates.js — a particle sent up a rough slope past three marks P, Q and
// R, timed between them: the two stretches give its deceleration and the
// speed it was sent off with; F = ma along the slope then gives μ.
//
// The exam family (CIE 9709/41 Oct/Nov 2018 Q6): projected up a line of
// greatest slope PQR of a rough plane at 3°; PQ = QR = 0.8 m, 0.6 s from P to
// Q and 1 s from Q to R. Show the deceleration is ⅔ m s⁻² and find u as an
// exact fraction (23/15); then μ (0.0144, g = 10).
//
// CONVENTION. Distance s up the slope from P, up positive; a is negative when
// it slows. Going up, friction and the weight's component both act down the
// slope: −mg sin θ − μ mg cos θ = ma. At rest it slides back only if
// tan θ > μ, at g(sin θ − μ cos θ) down the slope.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap, rat } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const RAD = Math.PI / 180;
/** A number as the paper would write it exactly: 23/15, −2/3 — or its decimal when it is no simple fraction. */
const exact = (x) => { const r = rat(Math.abs(x), 60); return r && r.q > 1 && r.p < 1000 ? `${x < 0 ? '-' : ''}${r.p}/${r.q}` : d(x); };
/** c·u as source, with no coefficient of one */
const cu = (c, v) => `${Math.abs(c - 1) < 1e-12 ? '' : d(c)}${v}`;

/**
 * @param k { d1, t1: the first stretch (P to Q) and its time; d2, t2: the second (Q to R); theta: the slope's angle; g }
 */
export function solveSlopeGates(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  if (have(k.g) && !(k.g > 0)) return fail('Give g as a positive number.');
  const g = have(k.g) ? k.g : 9.8;
  for (const [x, what] of [[k.d1, 'PQ'], [k.t1, 'the time from P to Q'], [k.d2, 'QR'], [k.t2, 'the time from Q to R']]) {
    if (!have(x)) return fail(`Give ${what}.`);
    if (!(x > 0)) return fail(`Give ${what} as a positive number.`);
  }
  const { d1, t1, d2, t2 } = k, T = t1 + t2;
  // P to Q: d1 = u t1 + ½ a t1²;  P to R: d1 + d2 = u T + ½ a T²
  const det = t1 * 0.5 * T * T - 0.5 * t1 * t1 * T;
  const u = snap((d1 * 0.5 * T * T - 0.5 * t1 * t1 * (d1 + d2)) / det);
  const a = snap((t1 * (d1 + d2) - T * d1) / det);
  const rows = [
    { f: M`s = ut + 1/2 at^2`, s: M`${d(d1)} = ${cu(t1, 'u')} + ${cu(0.5 * t1 * t1, 'a')}`, r: M`"P to Q"` },
    { f: M`s = ut + 1/2 at^2`, s: M`${d(d1 + d2)} = ${cu(T, 'u')} + ${cu(0.5 * T * T, 'a')}`, r: M`"P to R"` },
    { f: M`"together"`, s: '', r: M`a = ${exact(a)} [m s^-2], u = ${exact(u)} [m s^-1]` },
  ];
  if (!(u > 0)) return fail(`Those stretches and times need it to set off at ${M`u = ${d(u)} [m s^-1]`}: it must be moving up the slope at P.`);
  const vQ = snap(u + a * t1), vR = snap(u + a * T);
  if (vR < -1e-9) return fail(`At one deceleration those times need it to pass R, stop beyond it and come back down to R (its velocity at R would be ${M`${d(vR)} [m s^-1]`}): on a rough slope it comes back more slowly than it went up, so these times cannot happen.`);
  const notes = [
    a < -1e-12 ? `From the two stretches it slows at ${M`${exact(-a)} [m s^-2]`}, and it was sent off at ${M`u = ${exact(u)} [m s^-1]`}.`
      : a > 1e-12 ? `From the two stretches it speeds up at ${M`${exact(a)} [m s^-2]`} — up a slope, something must be pushing it.`
        : `From the two stretches it moves at a steady ${M`${exact(u)} [m s^-1]`} — up a slope, friction and weight alone would slow it: something must be pushing it.`,
    `It passes Q at ${M`${d(vQ)} [m s^-1]`} and R at ${M`${d(vR)} [m s^-1]`}.`,
  ];
  const derived = [M`a = ${exact(a)} [m s^-2]`, M`u = ${exact(u)} [m s^-1]`];
  const fr = [];
  let mu = null, back = null, sStop = null, tStop = null;
  if (a < 0) { tStop = snap(-u / a); sStop = snap((u * u) / (-2 * a)); }
  if (have(k.theta)) {
    if (!(k.theta > 0 && k.theta < 90)) return fail('The slope’s angle is between 0° and 90°.');
    const sn = Math.sin(k.theta * RAD), cs = Math.cos(k.theta * RAD);
    if (!(a < -1e-12)) return fail(a > 1e-12 ? 'Speeding up as it goes up a slope, it cannot be friction and weight alone: no coefficient of friction gives that.' : 'At a steady speed up a slope, it cannot be friction and weight alone, which both slow it: no coefficient of friction gives that.');
    mu = snap((-a - g * sn) / (g * cs));
    fr.push({ f: M`R = mg cos theta`, s: '', r: M`F = mu R = mu mg cos theta` });
    fr.push({ f: M`-mg sin theta - mu mg cos theta = ma`, s: M`-${d(g)} sin ${d(k.theta)}° - ${d(g)} mu cos ${d(k.theta)}° = ${exact(a)}`, r: M`mu = ${d(mu)}` });
    if (mu < -1e-9) return fail(`That deceleration is less than the weight’s pull alone gives on a smooth ${d(k.theta)}° slope, ${M`g sin theta = ${d(snap(g * sn))} [m s^-2]`}: no friction is negative.`);
    // at rest, does it stay or slide back?
    const tn = sn / cs;
    if (tn > mu + 1e-9) {
      back = snap(g * (sn - mu * cs));
      fr.push({ f: M`"slides back if" tan theta > mu`, s: M`tan ${d(k.theta)}° = ${d(snap(tn))} > ${d(mu)}`, r: M`a = g(sin theta - mu cos theta) = ${d(back)} [m s^-2] "down"` });
      notes.push(`With ${M`mu = ${d(mu)}`} friction is too weak to hold it at rest on a ${M`${d(k.theta)}°`} slope (${M`tan theta = ${d(snap(tn))}`}): it slides back down at ${M`${d(back)} [m s^-2]`}.`);
    } else {
      fr.push({ f: M`"stays if" tan theta <= mu`, s: M`tan ${d(k.theta)}° = ${d(snap(tn))} <= ${d(mu)}`, r: M`"it stays at rest"` });
      notes.push(`With ${M`mu = ${d(mu)}`}, friction can hold it at rest on the slope: it stays where it stops.`);
    }
    notes.splice(1, 0, `Going up, friction and the weight’s component both act down the slope: ${M`mu = ${d(mu)}`}.`);
    derived.push(M`mu = ${d(mu)}`);
  }
  // the clock runs from P to R, and on to where it stops (and a little back) when it slows
  const tEnd = tStop != null ? Math.max(T, tStop) : T;
  // without the angle nobody knows whether it stays or slides back: the clock ends where it stops
  const tMax = snap(mu == null && tStop != null ? tEnd : tEnd + (back ? Math.min(tEnd * 0.4, 1.5) : tEnd * 0.06));
  const pos = (t) => {
    if (tStop == null || t <= tStop) return u * t + 0.5 * a * t * t;
    const down = back ? 0.5 * back * (t - tStop) * (t - tStop) : 0;
    return Math.max(0, sStop - down);
  };
  const vel = (t) => (tStop == null || t <= tStop ? u + a * t : back ? -back * (t - tStop) : 0);
  const acc = (t) => (tStop == null || t <= tStop ? a : back ? -back : 0);
  const f = {
    kind: 'slopegates', tMax, tFlight: tMax, d1, d2, t1, t2, T, u, a, vQ, vR, theta: k.theta ?? null, mu, back, sStop, tStop, g,
    pos, vel, acc, params: { u, theta: k.theta ?? 0, h: 0, g }, bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
    path(n = 100, tEnd2 = tMax) { const o = []; for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd2; o.push({ t, x: pos(t), y: 0 }); } return o; },
  };
  if (mu == null && tStop != null) notes.push(`It stops ${M`${d(sStop)} [m]`} up the slope from P. Whether it stays there or slides back needs the slope’s angle.`);
  return { ok: true, mode: 'slopegates', f, u, a, dec: snap(-a), vQ, vR, mu, back, sStop, tStop, rows, fr, notes, derived, params: f.params,
    exprs: { u: M`u = ${exact(u)} [m s^-1]`, i: `${a < 0 ? `it slows at ${M`${exact(-a)} [m s^-2]`}` : M`a = ${exact(a)} [m s^-2]`} <span class="pand">and</span> ${M`u = ${exact(u)} [m s^-1]`}` }, convention: 'Distance is measured up the slope from P; a velocity or an acceleration up the slope is positive.' };
}

export function slopeGatesWorking(s) {
  if (!s?.ok) return [];
  const out = [{ title: 'From the two stretches', rows: s.rows, note: 'P to Q, and P to R: two equations in u and a, solved together.' }];
  if (s.fr.length) out.push({ title: 'Friction, from F = ma', rows: s.fr, note: 'Up the slope, friction and the weight’s component both act down it; R = mg cos θ.' });
  return out;
}
