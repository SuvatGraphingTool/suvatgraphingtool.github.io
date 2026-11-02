// runout.js — something sliding down a slope (from rest, or already moving),
// smooth or rough, and then — if it reaches the bottom — on along rough level
// ground until friction stops it. Down a rough enough slope it slows instead,
// and may stop before the bottom: how long can the slope be? (Cambridge 9709/04
// specimen 2017 Q2; Edexcel 6677 M1 Nov 2002 Q5.)
//
// SUVAT with the one-step links the build rules allow: on the slope
// m g sin α − F = ma with F = μ m g cos α (or a stated friction force, or
// none on a smooth slope); on the level the friction alone, F = ma. The speed
// at the bottom carries straight on to the ground (the papers' model).
// Or the other way: two speeds a distance apart give the slope's
// acceleration, and F = ma gives μ.
//
// CONVENTION. Along the path, the way it slides, positive: down the slope,
// then on along the ground.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d(x)})` : d(x));
const D2R = Math.PI / 180;
export const LOOKS = ['snow', 'ramp'];

/**
 * @param k { look, alpha, u, L, mu1 | F1 | (vB, dB), m, mu2 | F2, vAsk, g }
 *   alpha  the slope's angle (°);  u  its speed at the top (0: from rest);  L  the slope's length (m)
 *   mu1 / F1  the slope's coefficient of friction / friction force (N) — neither: smooth;
 *     or vB at dB metres down the slope, and the engine finds the acceleration and μ
 *   m  its mass (kg), for a friction force or the forces in newtons
 *   mu2 / F2  the level ground's coefficient of friction / friction force
 *   vAsk  a speed on the slope to find the time at
 */
export function solveRunout(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  const look = LOOKS.includes(k.look) ? k.look : 'snow';
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  if (!have(k.alpha)) return fail('Still needed: the slope’s angle.');
  if (!(k.alpha > 0 && k.alpha < 90)) return fail('A slope’s angle is between 0° and 90°.');
  const u = have(k.u) ? k.u : 0;
  if (u < 0) return fail('Its speed at the top is a size: 0 or more.');
  if (have(k.m) && !(k.m > 0)) return fail('The mass is a positive number of kilograms.');
  const ways = [have(k.mu1), have(k.F1), have(k.vB) || have(k.dB)].filter(Boolean).length;
  if (ways > 1) return fail('Give the slope’s friction one way: its coefficient, its force, or a speed further down — or none of them for a smooth slope.');
  if (have(k.mu2) && have(k.F2)) return fail('Give the ground’s friction as a coefficient or a force, not both.');
  if (have(k.F1) && !have(k.m)) return fail('A friction force needs the mass too: its share of the acceleration is the force over the mass.');
  if (have(k.F2) && !have(k.m)) return fail('A friction force on the ground needs the mass too.');
  for (const [q, what] of [['mu1', 'the slope’s coefficient of friction'], ['F1', 'the slope’s friction force'], ['mu2', 'the ground’s coefficient of friction'], ['F2', 'the ground’s friction force']]) {
    if (have(k[q]) && !(k[q] >= 0)) return fail(`Give ${what} as 0 or more.`);
  }
  if (have(k.L) && !(k.L > 0)) return fail('The slope’s length is a positive distance.');
  const alpha = k.alpha, sn = Math.sin(alpha * D2R), cs = Math.cos(alpha * D2R), m = have(k.m) ? k.m : null;
  const slope = [], ground = [];

  // ── on the slope: its acceleration, from the forces or from two speeds
  let a1, mu1 = null, F1 = null, smooth = false;
  if (have(k.vB) || have(k.dB)) {
    if (!have(k.vB) || !have(k.dB) || !(k.dB > 0) || !(k.vB >= 0)) return fail('A speed further down the slope needs both: the speed, and how far down from the top it is.');
    if (have(k.L) && k.dB > k.L + 1e-9) return fail('That speed further down has to be on the slope: no further down than its length.');
    a1 = snap((k.vB * k.vB - u * u) / (2 * k.dB));
    slope.push({ f: M`v^2 = u^2 + 2as`, s: M`${d(k.vB)}^2 = ${d(u)}^2 + 2a * ${d(k.dB)}`, r: M`a = ${d(a1)} [m s^-2]` });
    mu1 = snap((g * sn - a1) / (g * cs));
    if (mu1 < -1e-9) return fail(`Even on a smooth slope it speeds up at only ${M`g sin alpha = ${d(snap(g * sn))} [m s^-2]`}: ${M`${d(a1)} [m s^-2]`} is too fast.`);
    mu1 = Math.max(0, mu1);
    slope.push({ f: M`m g sin alpha - mu m g cos alpha = ma`, s: M`mu = (${d(g)} sin ${d(alpha)}° - ${sb(a1)})/(${d(g)} cos ${d(alpha)}°)`, r: M`mu = ${d(mu1)}` });
  } else if (have(k.mu1)) {
    mu1 = k.mu1; a1 = snap(g * (sn - mu1 * cs)); smooth = mu1 === 0;
    slope.push(mu1 > 0 ? { f: M`m g sin alpha - mu m g cos alpha = ma`, s: M`a = ${d(g)}(sin ${d(alpha)}° - ${d(mu1)} cos ${d(alpha)}°)`, r: M`a = ${d(a1)} [m s^-2]` }
      : { f: M`m g sin alpha = ma`, s: M`a = ${d(g)} sin ${d(alpha)}°`, r: M`a = ${d(a1)} [m s^-2]` });
  } else if (have(k.F1)) {
    F1 = k.F1; a1 = snap(g * sn - F1 / m); smooth = F1 === 0;
    slope.push({ f: M`m g sin alpha - F = ma`, s: M`${d(m)} * ${d(g)} sin ${d(alpha)}° - ${d(F1)} = ${d(m)}a`, r: M`a = ${d(a1)} [m s^-2]` });
  } else {
    smooth = true; a1 = snap(g * sn);
    slope.push({ f: M`m g sin alpha = ma`, s: M`a = ${d(g)} sin ${d(alpha)}°`, r: M`a = ${d(a1)} [m s^-2]` });
  }
  // friction exactly balancing the weight's component is a steady slide, not a rounding off one
  if (Math.abs(a1) < 1e-9) a1 = 0;
  const nA = slope.length;
  if (u === 0 && !(a1 > 0)) return fail('Let go from rest it would never start: friction holds it on the slope.');

  // ── how far down the slope: to the bottom, or to rest on it
  let L = have(k.L) ? k.L : null, vBot = null, t1, stopsOnSlope = false, dStop = null;
  if (a1 < 0) { dStop = snap((u * u) / (-2 * a1)); }
  if (L == null) {
    if (dStop == null) return fail(a1 === 0 ? 'At a steady speed it never stops on the slope: give its length.' : 'Still needed: the length of the slope — speeding up, it reaches the bottom wherever that is.');
    // slowing down: the longest the slope can be, for it still to reach the bottom
    L = dStop; stopsOnSlope = true;
    slope.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${d(u)}^2 + 2 * ${sb(a1)}s`, r: M`s = ${d(dStop)} [m] "to rest"` });
  } else if (dStop != null && dStop <= L + 1e-9) {
    // it comes to rest on the slope — or, exactly at its length, just at the foot
    stopsOnSlope = true;
    slope.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${d(u)}^2 + 2 * ${sb(a1)}s`, r: Math.abs(dStop - L) <= 1e-9 ? M`s = ${d(dStop)} [m] "to rest, just at the foot"` : M`s = ${d(dStop)} [m] "to rest, before the bottom"` });
  }
  if (stopsOnSlope) { vBot = 0; t1 = snap(u / -a1); }
  else {
    vBot = snap(Math.sqrt(Math.max(0, u * u + 2 * a1 * L)));
    t1 = a1 === 0 ? snap(L / u) : snap((vBot - u) / a1);
    slope.push({ f: M`v^2 = u^2 + 2as`, s: M`v^2 = ${d(u)}^2 + 2 * ${sb(a1)} * ${d(L)}`, r: M`v = ${d(vBot)} [m s^-1] "at the bottom"` });
    slope.push({ f: M`v = u + at`, s: M`${d(vBot)} = ${d(u)} + ${sb(a1)}t`, r: M`t = ${d(t1)} [s]` });
  }
  const sSlope = stopsOnSlope ? dStop : L;

  // ── a speed asked about on the slope: the time it takes
  let tAsk = null;
  if (have(k.vAsk)) {
    if (a1 === 0) return fail(`It moves at a steady ${M`${d(u)} [m s^-1]`} all the way down the slope: no one time has a given speed.`);
    const between = (k.vAsk - u) * (k.vAsk - (stopsOnSlope ? 0 : vBot)) <= 1e-9;
    if (!between) return fail(`On the slope its speed goes from ${M`${d(u)}`} to ${M`${d(stopsOnSlope ? 0 : vBot)} [m s^-1]`}: it is never ${M`${d(k.vAsk)} [m s^-1]`} there.`);
    tAsk = snap((k.vAsk - u) / a1);
    // after the acceleration's rows, before the rest: the order a student works in
    slope.splice(nA, 0, { f: M`v = u + at`, s: M`${d(k.vAsk)} = ${d(u)} + ${sb(a1)}t`, r: M`t = ${d(tAsk)} [s]` });
  }

  // ── along the level ground: friction alone, to rest
  let a2 = null, s2 = 0, t2 = 0, R2 = null, Fg = null;
  if (!stopsOnSlope) {
    if (!have(k.mu2) && !have(k.F2)) return fail('Still needed: the friction on the level ground — its coefficient, or its force with the mass — to say where it stops.');
    if (have(k.mu2)) {
      if (!(k.mu2 > 0)) return fail('On smooth level ground it would never stop: give the ground a coefficient of friction.');
      a2 = snap(-k.mu2 * g);
      if (m != null) { R2 = snap(m * g); Fg = snap(k.mu2 * R2); }
      ground.push({ f: M`-mu m g = ma`, s: M`a = -${d(k.mu2)} * ${d(g)}`, r: M`a = ${d(a2)} [m s^-2]` });
    } else {
      if (!(k.F2 > 0)) return fail('With no friction on the level it would never stop: give the friction force.');
      Fg = k.F2; a2 = snap(-k.F2 / m);
      ground.push({ f: M`-F = ma`, s: M`-${d(k.F2)} = ${d(m)}a`, r: M`a = ${d(a2)} [m s^-2]` });
    }
    s2 = snap((vBot * vBot) / (-2 * a2)); t2 = snap(vBot / -a2);
    ground.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${d(vBot)}^2 + 2 * ${sb(a2)}s`, r: M`s = ${d(s2)} [m]` });
    ground.push({ f: M`v = u + at`, s: M`0 = ${d(vBot)} + ${sb(a2)}t`, r: M`t = ${d(t2)} [s]` });
  }

  const tB = t1, tRest = snap(t1 + t2), tMax = snap(tRest + Math.max(0.6, tRest * 0.1));
  const pos = (t) => {
    const c = Math.min(Math.max(t, 0), tRest);
    if (c <= tB) return u * c + 0.5 * a1 * c * c;
    const s = c - tB; return sSlope + vBot * s + 0.5 * a2 * s * s;
  };
  const vel = (t) => { const c = Math.min(Math.max(t, 0), tRest); return t >= tRest - 1e-12 ? 0 : c <= tB ? u + a1 * c : vBot + a2 * (c - tB); };
  const acc = (t) => (t >= tRest - 1e-12 ? 0 : t < tB ? a1 : a2);
  const phase = (t) => (t >= tRest - 1e-12 ? 'rest' : t < tB ? 'slope' : 'ground');
  // the forces on it at each moment (needs the mass), along its path +: the weight's component down
  // the slope, the normal reaction, friction against the sliding — at rest on the slope, just what holds it
  const Wd = m != null ? snap(m * g * sn) : null, Rs = m != null ? snap(m * g * cs) : null, Rg = m != null ? snap(m * g) : null;
  const Fs = m != null ? (smooth ? 0 : F1 != null ? F1 : snap(m * (g * sn - a1))) : null;
  const forces = (t) => {
    if (m == null) return null;
    const p = phase(t), onSlope = p === 'slope' || (p === 'rest' && stopsOnSlope);
    if (p === 'rest') return onSlope ? { phase: p, slope: true, W: Wd, R: Rs, F: Wd, holding: true } : { phase: p, slope: false, W: 0, R: Rg, F: 0 };
    return onSlope ? { phase: p, slope: true, W: Wd, R: Rs, F: -Fs } : { phase: p, slope: false, W: 0, R: Rg, F: -Fg };
  };

  const notes = [
    smooth ? `On the smooth slope only the weight’s component acts along it: ${M`a = g sin alpha = ${d(a1)} [m s^-2]`}.`
      : a1 === 0 ? `Friction exactly balances the weight’s component: it slides down at a steady ${M`${d(u)} [m s^-1]`}.`
      : a1 > 0 ? `Down the slope the weight’s component beats friction: it speeds up at ${M`${d(a1)} [m s^-2]`}${mu1 != null && (have(k.vB)) ? `, so ${M`mu = ${d(mu1)}`}` : ''}.`
        : `Friction beats the weight’s component: it slows down the slope at ${M`${d(-a1)} [m s^-2]`}${have(k.vB) ? `, so ${M`mu = ${d(mu1)}`}` : ''}.`,
    stopsOnSlope ? (have(k.L) ? (Math.abs(dStop - L) <= 1e-9 ? `It just reaches the foot of the slope and stops there.` : `It stops ${M`${d(dStop)} [m]`} down the slope, before the bottom, and stays there.`) : `It stops after ${M`${d(dStop)} [m]`}: for it to reach the bottom the slope can be at most ${M`${d(dStop)} [m]`} long.`)
      : `It reaches the bottom at ${M`${d(vBot)} [m s^-1]`} after ${M`${d(t1)} [s]`}, and slides ${M`${d(s2)} [m]`} along the ground before friction stops it.`,
  ];
  const derived = [`${M`a = ${d(a1)} [m s^-2]`} on the slope`, ...(stopsOnSlope ? [`${M`${d(dStop)} [m]`} to rest`] : [`${M`v = ${d(vBot)} [m s^-1]`} at the bottom`, `${M`${d(s2)} [m]`} along the ground`])];

  const f = { kind: 'runout', look, alpha, u, L: have(k.L) ? k.L : null, sSlope, a1, a2, vBot, s2, t1, t2, tB, tRest, tMax, tFlight: tMax, stopsOnSlope, dStop, mu1, smooth, g, m,
    Fslope: F1 != null ? F1 : m != null && mu1 != null ? snap(mu1 * m * g * cs) : null, Fground: Fg, W: m != null ? snap(m * g) : null,
    pos, vel, acc, phase, forces, tAsk, tMid: snap(t1 / 2), tGround: snap(tB + t2 / 2), params: { u: 0, theta: 0, h: 0, g } };
  return { ok: true, mode: 'runout', a1, dec: a1 < 0 ? snap(-a1) : null, mu1, vBot, s2, t1, t2, dStop, tAsk, stopsOnSlope, slope, ground, rows: [...slope, ...ground], notes, derived, f };
}

/** The working: down the slope, then along the ground. */
export function runoutWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'Down the slope', rows: s.slope, note: `Down the slope is positive. ${s.f.smooth ? 'It is smooth: no friction.' : 'Friction acts up the slope, against the sliding.'}` },
    ...(s.stopsOnSlope ? [] : [{ title: 'Along the ground: friction to rest', rows: s.ground, note: 'The speed at the bottom carries straight on along the ground; now only friction acts along it.' }]),
  ];
}
