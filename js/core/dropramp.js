// dropramp.js — the same drop two ways: let fall straight down, or slid down
// a rough ramp from the same height. Free fall gives the first; on the ramp
// R = mg cos θ, F = μR and mg sin θ − F = ma give the acceleration down it,
// and its length h ÷ sin θ the rest.
//
// The exam family (OCR 4728 Jan 2009 Q6): parcels 2.5 m above a trolley.
// Dropped: 0.714 s, 7 m s⁻¹. A ramp at 60° to the vertical (30° to the
// horizontal), μ = 0.2, a 2 kg parcel from rest: R = 16.97, F = 3.39,
// a = 3.2 m s⁻² over 5 m, so it reaches the trolley at 5.66 m s⁻¹.
//
// CONVENTION. Down positive for the drop; down the ramp positive on it.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const RAD = Math.PI / 180;

/**
 * @param k { h: the height; theta: the ramp's angle to the horizontal — or thetaV, to the vertical;
 *            mu: the coefficient of friction (0 for smooth); m: the mass (for the forces in newtons); g }
 */
export function solveDropRamp(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  if (have(k.g) && !(k.g > 0)) return fail('Give g as a positive number.');
  const g = have(k.g) ? k.g : 9.8;
  if (!have(k.h)) return fail('Give the height it starts above the trolley.');
  if (!(k.h > 0)) return fail('Give the height as a positive number.');
  if (have(k.theta) && have(k.thetaV)) return fail('Give the ramp’s angle to the horizontal or to the vertical — one of them.');
  const th = have(k.theta) ? k.theta : have(k.thetaV) ? 90 - k.thetaV : null;
  if (th == null) return fail('Give the ramp’s angle, to the horizontal or to the vertical.');
  if (!(th > 0 && th < 90)) return fail('The ramp’s angle is between 0° and 90°.');
  const mu = have(k.mu) ? k.mu : 0, m = have(k.m) ? k.m : null;
  if (mu < 0) return fail('The coefficient of friction is 0 or more.');
  if (m != null && !(m > 0)) return fail('Give the mass as a positive number.');
  const h = k.h, sn = Math.sin(th * RAD), cs = Math.cos(th * RAD);
  // dropped
  const tD = snap(Math.sqrt((2 * h) / g)), vD = snap(Math.sqrt(2 * g * h));
  const drop = [
    { f: M`s = ut + 1/2 at^2`, s: M`${d(h)} = 1/2 × ${d(g)}t^2`, r: M`t = ${d(tD)} [s]` },
    { f: M`v^2 = u^2 + 2as`, s: M`v^2 = 2 × ${d(g)} × ${d(h)}`, r: M`v = ${d(vD)} [m s^-1]` },
  ];
  // down the ramp
  const a = snap(g * (sn - mu * cs)), L = snap(h / sn);
  const ramp = [];
  if (have(k.thetaV)) ramp.push({ f: M`"to the horizontal"`, s: M`90° - ${d(k.thetaV)}°`, r: M`theta = ${d(th)}°` });
  let forces = null;
  if (m != null) {
    const R = snap(m * g * cs), F = snap(mu * R), W = snap(m * g * sn);
    forces = { weight: snap(m * g), R, F, along: W };
    ramp.push({ f: M`R = mg cos theta`, s: M`${d(m)} × ${d(g)} cos ${d(th)}°`, r: M`R = ${d(R)} [N]` });
    if (mu > 0) ramp.push({ f: M`F = mu R`, s: M`${d(mu)} × ${d(R)}`, r: M`F = ${d(F)} [N]` });
    ramp.push(mu > 0 ? { f: M`mg sin theta - F = ma`, s: M`${d(W)} - ${d(F)} = ${m === 1 ? '' : d(m)}a`, r: M`a = ${d(a)} [m s^-2]` }
      : { f: M`mg sin theta = ma`, s: M`${d(W)} = ${m === 1 ? '' : d(m)}a`, r: M`a = ${d(a)} [m s^-2] "(smooth: no friction)"` });
  } else ramp.push(mu > 0 ? { f: M`a = g(sin theta - mu cos theta)`, s: M`${d(g)}(sin ${d(th)}° - ${d(mu)} cos ${d(th)}°)`, r: M`a = ${d(a)} [m s^-2]` }
    : { f: M`a = g sin theta`, s: M`${d(g)} sin ${d(th)}°`, r: M`a = ${d(a)} [m s^-2] "(smooth)"` });
  if (!(a > 1e-9)) return fail(`On this ramp friction is at least the pull down it (${M`mu >= tan theta = ${d(snap(sn / cs))}`}): let go from rest, the parcel stays where it is.`);
  const vR = snap(Math.sqrt(2 * a * L)), tR = snap(vR / a);
  ramp.push({ f: M`"its length"`, s: M`${d(h)}/sin ${d(th)}°`, r: M`s = ${d(L)} [m]` });
  ramp.push({ f: M`v^2 = u^2 + 2as`, s: M`v^2 = 2 × ${d(a)} × ${d(L)}`, r: M`v = ${d(vR)} [m s^-1]` });
  ramp.push({ f: M`v = u + at`, s: M`${d(vR)} = ${d(a)}t`, r: M`t = ${d(tR)} [s]` });
  const notes = [
    `Dropped, it falls ${M`${d(h)} [m]`} in ${M`${d(tD)} [s]`} and hits the trolley at ${M`${d(vD)} [m s^-1]`}.`,
    `Down the ramp it speeds up at ${M`${d(a)} [m s^-2]`} over ${M`${d(L)} [m]`}, taking ${M`${d(tR)} [s]`}, and reaches the trolley at ${M`${d(vR)} [m s^-1]`}${vR < vD ? `, ${M`${d(snap(vD - vR))} [m s^-1]`} slower than dropped` : ''}.`,
  ];
  const derived = [`dropped, ${M`v = ${d(vD)} [m s^-1]`}`, `down the ramp, ${M`a = ${d(a)} [m s^-2]`} and ${M`v = ${d(vR)} [m s^-1]`}`];
  const tMax = snap(Math.max(tD, tR) * 1.06);
  const f = {
    kind: 'dropramp', forces, tMax, tFlight: tR, h, theta: th, mu, m, g, a, L, tD, vD, tR, vR,
    fallD: (t) => Math.min(h, 0.5 * g * t * t), sR: (t) => Math.min(L, 0.5 * a * t * t),
    velD: (t) => (t <= tD ? g * t : 0), velR: (t) => (t <= tR ? a * t : 0), accD: (t) => (t <= tD ? g : 0), accR: (t) => (t <= tR ? a : 0),
    pos: (t) => ({ x: Math.min(L, 0.5 * a * t * t) * cs, y: h - Math.min(L, 0.5 * a * t * t) * sn }), vel: (t) => ({ x: (t <= tR ? a * t : 0) * cs, y: -(t <= tR ? a * t : 0) * sn }),
    params: { u: 0, theta: -th, h, g }, bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
    path(n = 100, tEnd = tMax) { const o = []; for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd, s = Math.min(L, 0.5 * a * t * t); o.push({ t, x: s * cs, y: h - s * sn }); } return o; },
  };
  return { ok: true, mode: 'dropramp', f, tD, vD, a, L, vR, tR, drop, ramp, notes, derived, params: f.params,
    convention: 'Down is positive for the drop, and down the ramp on it.' };
}

export function dropRampWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'Dropped', rows: s.drop, note: 'Let go from rest, it falls at g.' },
    { title: 'Down the ramp', rows: s.ramp, note: 'On the ramp: the normal reaction is mg cos θ, friction μR acts up it, and the weight’s component mg sin θ down it.' },
  ];
}
