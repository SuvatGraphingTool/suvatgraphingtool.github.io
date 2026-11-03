// slopedrop.js — one particle sent down a smooth slope, another let fall from
// a point level with where it starts, at the same instant: they meet on the
// slope directly below the second.
//
// The exam family (OCR 4728 Jan 2011 Q5): X is on a smooth plane, Y level
// with it out over the slope. P is projected from X down the line of greatest
// slope at 4.9 m s⁻¹ with acceleration 4.9 m s⁻²; at that moment Q is let go
// from rest at Y and falls freely. They collide on the plane directly below Y
// after T s. The distances in T; the angle, from F = ma along a smooth slope
// (a = g sin θ); T, from the drop that agrees, Q's fall = P's run × sin θ;
// the speeds as they meet.
//
// CONVENTION. P's distance s is along the slope from X, down positive; Q's
// distance y is straight down from Y. In the plane of the slope, x across from
// X towards Y and up positive: the slope runs (s cos θ, −s sin θ).
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const RAD = Math.PI / 180;

/** c₁T + c₂T² as notation source, in T: 4.9T + 2.45T². */
function inT(c1, c2) {
  const parts = [];
  if (Math.abs(c1) > 1e-12) parts.push(`${Math.abs(c1 - 1) < 1e-12 ? '' : d(c1)}T`);
  if (Math.abs(c2) > 1e-12) parts.push(`${parts.length ? '+ ' : ''}${d(c2)}T^2`);
  return parts.length ? parts.join(' ') : '0';
}

/**
 * @param k { u: P's speed down the slope at X; a: P's acceleration down it, or theta: the slope's angle (degrees);
 *            w: Q's speed straight down at Y (blank: let go from rest); g }
 */
export function solveSlopeDrop(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) && k.g > 0 ? k.g : 9.8;
  const u = have(k.u) ? k.u : null, w = have(k.w) ? k.w : 0;
  if (u == null) return fail('Give P’s speed down the slope as it leaves X.');
  if (u < 0) return fail('P is sent down the slope: give its speed as a positive number (or 0).');
  if (w < 0) return fail('Q is let go or thrown downwards: give its speed down as 0 or more.');
  const rows = [];
  let a, th;
  if (have(k.a) && have(k.theta)) {
    // both given: each must be possible, and on a smooth slope they must agree; then the angle's own a is used
    if (!(k.theta > 0 && k.theta < 90)) return fail('The slope’s angle is between 0° and 90°.');
    if (!(k.a > 0)) return fail('P speeds up down a smooth slope: give its acceleration as a positive number.');
    if (Math.abs(k.a - g * Math.sin(k.theta * RAD)) > 1e-3 * g) return fail(`On a smooth slope at ${d(k.theta)}° the acceleration is ${M`g sin theta = ${d(snap(g * Math.sin(k.theta * RAD)))} [m s^-2]`}: give the angle or the acceleration, not two that disagree.`);
    th = k.theta; a = snap(g * Math.sin(th * RAD));
  } else if (have(k.a)) {
    if (!(k.a > 0)) return fail('P speeds up down a smooth slope: give its acceleration as a positive number.');
    if (k.a >= g) return fail(`Down a smooth slope the acceleration is ${M`g sin theta`}, less than ${M`g = ${d(g)} [m s^-2]`}: no slope gives ${M`${d(k.a)} [m s^-2]`}.`);
    a = k.a; th = snap(Math.asin(a / g) / RAD);
    rows.push({ f: M`ma = mg sin theta`, s: M`${d(a)} = ${d(g)} sin theta`, r: M`theta = ${d(th)}°` });
  } else if (have(k.theta)) {
    if (!(k.theta > 0 && k.theta < 90)) return fail('The slope’s angle is between 0° and 90°.');
    th = k.theta; a = snap(g * Math.sin(th * RAD));
    rows.push({ f: M`ma = mg sin theta`, s: M`a = ${d(g)} sin ${d(th)}°`, r: M`a = ${d(a)} [m s^-2]` });
  } else return fail('Give P’s acceleration down the slope, or the slope’s angle.');
  const sn = Math.sin(th * RAD), cs = Math.cos(th * RAD);

  // each, T s after both set off
  const each = [
    { f: M`s = ut + 1/2 at^2`, s: M`s_P = ${u === 1 ? '' : d(u)}T + 1/2 × ${d(a)}T^2`, r: M`s_P = ${inT(u, a / 2)}` },
    { f: M`s = ut + 1/2 at^2`, s: M`y_Q = ${w ? `${w === 1 ? '' : d(w)}T + ` : ''}1/2 × ${d(g)}T^2`, r: M`y_Q = ${inT(w, g / 2)}` },
  ];
  // they meet below Y: Q has dropped as far as P has, y_Q = s_P sin θ; one root is T = 0, at the start
  //   wT + ½gT² = (uT + ½aT²) sin θ  →  T = (u sin θ − w) / (½(g − a sin θ))
  const den = 0.5 * (g - a * sn), num0 = u * sn - w;
  if (!(den > 1e-12)) return fail('Q falls no faster than P drops: they never meet below Y.');
  if (!(num0 > 1e-12)) return fail(`Q drops faster than P from the start${u > 0 ? '' : ' (P is let go from rest)'}, so it reaches the slope below Y before P gets there: they never meet.`);
  const T = snap(num0 / den);
  const sP = snap(u * T + 0.5 * a * T * T), yQ = snap(w * T + 0.5 * g * T * T);
  const XY = snap(sP * cs), vP = snap(u + a * T), vQ = snap(w + g * T);
  const meet = [
    { f: M`y_Q = s_P sin theta`, s: M`${inT(w, g / 2)} = (${inT(u, a / 2)}) sin ${d(th)}°`, r: M`T = ${d(T)} [s]` },
    { f: M`"so"`, s: M`s_P = ${d(sP)} [m], y_Q = ${d(yQ)} [m]`, r: M`XY = s_P cos theta = ${d(XY)} [m]` },
  ];
  const speeds = [
    { f: M`v = u + at`, s: M`v_P = ${d(u)} + ${d(a)} × ${d(T)}`, r: M`v_P = ${d(vP)} [m s^-1]` },
    { f: M`v = u + at`, s: M`v_Q = ${w ? d(w) : 0} + ${d(g)} × ${d(T)}`, r: M`v_Q = ${d(vQ)} [m s^-1]` },
  ];
  const notes = [
    rows.length && have(k.a) ? `Down a smooth slope the only force along it is the weight’s component, so ${M`a = g sin theta`}: the slope is at ${M`${d(th)}°`}.` : `Down a smooth slope at ${M`${d(th)}°`} P speeds up at ${M`g sin theta = ${d(a)} [m s^-2]`}.`,
    `They meet ${M`${d(T)} [s]`} after setting off, on the slope directly below Y: P has gone ${M`${d(sP)} [m]`} down the slope and Q has fallen ${M`${d(yQ)} [m]`}.`,
    `As they meet P is moving at ${M`${d(vP)} [m s^-1]`} down the slope and Q at ${M`${d(vQ)} [m s^-1]`} straight down.`,
  ];
  const derived = [M`T = ${d(T)} [s]`, M`theta = ${d(th)}°`, M`v_P = ${d(vP)} [m s^-1]`, M`v_Q = ${d(vQ)} [m s^-1]`];
  const posP = (t) => { const s = u * t + 0.5 * a * t * t; return { x: s * cs, y: -s * sn, s }; };
  const posQ = (t) => { const y = w * t + 0.5 * g * t * t; return { x: XY, y: -y, s: y }; };
  const f = {
    kind: 'slopedrop', tMax: T, tFlight: T, T, u, w, a, g, theta: th, sP, yQ, XY, vP, vQ,
    posP, posQ, velP: (t) => u + a * t, velQ: (t) => w + g * t,
    pos: (t) => posP(t), vel: (t) => ({ x: (u + a * t) * cs, y: -(u + a * t) * sn }),
    params: { u, theta: -th, h: 0, g }, bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
    path(n = 100, tEnd = T) { const o = []; for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; o.push({ t, ...posP(t) }); } return o; },
  };
  return { ok: true, mode: 'slopedrop', f, T, theta: th, a, sP, yQ, XY, vP, vQ, rows, each, meet, speeds, notes, derived, params: f.params,
    exprs: { sP: M`s_P = ${inT(u, a / 2)}`, yQ: M`y_Q = ${inT(w, g / 2)}`, both: `${M`s_P = ${inT(u, a / 2)}`} <span class="pand">and</span> ${M`y_Q = ${inT(w, g / 2)}`}` },
    convention: 'P’s distance is measured down the slope from X; Q’s straight down from Y.' };
}

export function slopeDropWorking(s) {
  if (!s?.ok) return [];
  const out = [];
  if (s.rows.length) out.push({ title: 'The slope', rows: s.rows, note: 'On a smooth slope the only force along it is the weight’s component, mg sin θ.' });
  out.push({ title: 'Each, in terms of T', rows: s.each, note: 'P runs down the slope from X; Q falls straight down from Y. Both start at the same instant.' });
  out.push({ title: 'They meet below Y', rows: s.meet, note: 'Below Y, Q has fallen as far as P has dropped: its fall is P’s distance down the slope times sin θ. T = 0 also fits, at the start; the other root is the meeting.' });
  out.push({ title: 'Their speeds as they meet', rows: s.speeds, note: 'Each at a constant acceleration: P at g sin θ along the slope, Q at g straight down.' });
  return out;
}
