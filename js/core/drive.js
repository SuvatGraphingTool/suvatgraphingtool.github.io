// drive.js — a vehicle with a constant driving force against a constant
// resistance, on a road inclined to the horizontal: driven up the hill the
// weight's component works against it, driven down the hill it helps. Over a
// distance, from rest or a given speed: its speed at the end, both ways
// (Cambridge 9709/42 May/Jun 2019 Q4) — or, given the speed at the end too,
// the driving force or the resistance that made it (9709/43 May/Jun 2015 Q4,
// a lorry slowing up a hill: there by work and energy, here by SUVAT and F = ma).
//
// SUVAT with the one-step link the build rules allow: F = ma along the road,
// D − R ∓ m g sin α = ma, with v² = u² + 2as (design/library/build-rules.md).
//
// CONVENTION. Along the road, the way the vehicle drives, positive. α the
// road's angle to the horizontal — or its sine, or the height the road rises
// over the distance (sin α = h ÷ s).
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d(x)})` : d(x));
const D2R = Math.PI / 180;
const WAYS = { up: 'Driven up the hill', down: 'Driven down the hill' };

/**
 * @param k { way, m, D, R, alpha | sinA | h, s, u, v, g }
 *   way  'both' (the default), 'up' or 'down';  m  the mass (kg)
 *   D  the driving force (N);  R  the resistance to motion (N), 0 or more
 *   alpha  the road's angle (°) — or sinA, its sine — or h, how far the road rises over the distance (m)
 *   s  the distance driven (m);  u  the speed at the start (blank: from rest);  v  the speed at the end — then D or R is found
 */
export function solveDrive(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  if (!have(k.m)) return fail('Still needed: the mass.');
  if (!have(k.s)) return fail('Still needed: the distance driven.');
  if (!(k.m > 0)) return fail('The mass is a positive number of kilograms.');
  if (k.m > 200000) return fail('More than 200 tonnes is not a road vehicle: give the mass in kilograms.');
  if (!(k.s > 0)) return fail('The distance driven is a positive number of metres.');
  const angles = [have(k.alpha), have(k.sinA), have(k.h)].filter(Boolean).length;
  if (angles > 1) return fail('Give one of the road’s angle, its sine, or the height it rises — not more.');
  if (!angles) return fail('Still needed: the road’s angle, its sine, or the height it rises over the distance.');
  if (have(k.sinA) && !(k.sinA > 0 && k.sinA < 1)) return fail('The sine of the road’s angle is between 0 and 1.');
  if (have(k.alpha) && !(k.alpha > 0 && k.alpha < 90)) return fail('A road’s angle is between 0° and 90°.');
  if (have(k.h) && !(k.h > 0 && k.h < k.s)) return fail('The height the road rises is more than 0 and less than the distance along it.');
  const sn = have(k.sinA) ? k.sinA : have(k.h) ? k.h / k.s : Math.sin(k.alpha * D2R);
  const alpha = Math.asin(sn) / D2R;
  const u = have(k.u) ? k.u : 0;
  if (u < 0) return fail('The speed at the start is a size: 0 or more.');
  if (have(k.v) && k.v < 0) return fail('The speed at the end is a size: 0 or more.');
  if (have(k.D) && !(k.D >= 0)) return fail('The driving force is 0 or more newtons.');
  if (have(k.R) && !(k.R >= 0)) return fail('The resistance is a size: 0 or more newtons.');
  const find = have(k.v) ? (!have(k.D) ? 'D' : !have(k.R) ? 'R' : null) : null;
  if (have(k.v) && !find) return fail('Given the speed at the end, leave the driving force or the resistance blank: that is what is found.');
  if (!have(k.v) && !have(k.D)) return fail('Still needed: the driving force — or the speed at the end, to find it.');
  const way = ['up', 'down', 'both'].includes(k.way) ? k.way : find ? 'up' : 'both';
  if (find && way === 'both') return fail('Finding a force from the speed at the end is one way: choose up the hill or down it.');
  const { m, s } = k, W = snap(m * g * sn);
  const sinTxt = have(k.sinA) || have(k.h) ? d(sn) : `sin ${d(alpha)}°`;
  const sinRow = have(k.h) ? { f: M`sin alpha = h/s`, s: M`sin alpha = ${d(k.h)}/${d(s)}`, r: M`sin alpha = ${d(sn)}` } : null;
  const R0 = have(k.R) ? k.R : 0;

  // ── one way: F = ma along the road, and to the end of the distance
  const drive = (name) => {
    const sgn = name === 'up' ? -1 : 1, op = sgn < 0 ? '-' : '+';
    const law = sgn < 0 ? M`D - R - m g sin alpha = ma` : M`D - R + m g sin alpha = ma`;
    const rows = sinRow ? [sinRow] : [];
    let a, D = k.D, R = R0, v;
    if (find) {
      // the speeds give the acceleration; F = ma gives the force left out
      v = k.v;
      a = snap((v * v - u * u) / (2 * s));
      rows.push({ f: M`v^2 = u^2 + 2as`, s: M`${d(v)}^2 = ${d(u)}^2 + 2a * ${d(s)}`, r: M`a = ${d(a)} [m s^-2]` });
      if (find === 'D') {
        D = snap(m * a + R - sgn * W);
        rows.push({ f: law, s: M`D - ${d(R)} ${op} ${d(m)} * ${d(g)} * ${sinTxt} = ${d(m)} * ${sb(a)}`, r: M`D = ${d(D)} [N]` });
        if (D < -1e-9) return { name, ok: false, rows, why: `the speeds need a driving force of ${M`${d(D)} [N]`}: a push backwards, which a driving force is not` };
      } else {
        R = snap(D - m * a + sgn * W);
        rows.push({ f: law, s: M`${d(D)} - R ${op} ${d(m)} * ${d(g)} * ${sinTxt} = ${d(m)} * ${sb(a)}`, r: M`R = ${d(R)} [N]` });
        if (R < -1e-9) return { name, ok: false, rows, why: `the speeds need a resistance of ${M`${d(R)} [N]`}: a push forwards, which a resistance is not` };
      }
    } else {
      // the snapped component, so forces that balance exactly give a = 0, not −1e−16
      a = snap((D - R + sgn * W) / m);
      if (Math.abs(a) < 1e-12) a = 0;
      rows.push({ f: law, s: M`${d(D)} - ${d(R)} ${op} ${d(m)} * ${d(g)} * ${sinTxt} = ${d(m)}a`, r: M`a = ${d(a)} [m s^-2]` });
      const v2 = u * u + 2 * a * s;
      if (u === 0 && a <= 0) return { name, ok: false, rows, a,
        why: a === 0 ? 'from rest the forces balance: it does not get going'
          : name === 'up' ? 'from rest the driving force is less than the resistance and the weight’s component together: it cannot get going up the hill'
            : 'from rest the resistance is more than the driving force and the weight’s component together: it does not get going' };
      if (v2 < -1e-9) {
        const sStop = snap((u * u) / (-2 * a));
        rows.push({ f: M`0 = u^2 + 2as`, s: M`0 = ${d(u)}^2 + 2 * ${sb(a)}s`, r: M`s = ${d(sStop)} [m]` });
        return { name, ok: false, rows, a, why: `it slows to rest after ${M`${d(sStop)} [m]`}, short of the ${M`${d(s)} [m]`}; this scenario follows it no further` };
      }
      v = snap(Math.sqrt(Math.max(0, v2)));
      rows.push({ f: M`v^2 = u^2 + 2as`, s: M`v^2 = ${d(u)}^2 + 2 * ${sb(a)} * ${d(s)}`, r: M`v = ${d(v)} [m s^-1]` });
    }
    if (v === 0 && u === 0) return { name, ok: false, rows, a, why: 'it starts and ends at rest: it never moves' };
    const t = Math.abs(a) < 1e-12 ? snap(s / u) : snap((v - u) / a);
    rows.push(Math.abs(a) < 1e-12 ? { f: M`s = ut`, s: M`${d(s)} = ${d(u)}t`, r: M`t = ${d(t)} [s]` }
      : { f: M`v = u + at`, s: M`${d(v)} = ${d(u)} + ${sb(a)}t`, r: M`t = ${d(t)} [s]` });
    const pos = (tt) => { const c = Math.min(Math.max(tt, 0), t); return u * c + 0.5 * a * c * c; };
    const vel = (tt) => { const c = Math.min(Math.max(tt, 0), t); return u + a * c; };
    // past the end of the distance it is not followed: it is held where the distance ends
    const acc = () => a;
    // the forces along the road for the stage's card: each a size, with the way it acts
    return { name, ok: true, a, D, R, v, t, rows, pos, vel, acc, net: snap(m * a) };
  };

  const list = way === 'both' ? ['up', 'down'] : [way];
  const all = list.map(drive), done = all.filter((w) => w.ok);
  if (!done.length) {
    const w = all[0];
    return fail(list.length > 1 ? `Neither way does it cover the distance: up the hill ${all[0].why}; down the hill ${all[1].why}.`
      : `${WAYS[w.name]}, ${w.why}.`);
  }
  const by = Object.fromEntries(all.map((w) => [w.name, w]));
  const tEnd = Math.max(...done.map((w) => w.t));
  const tMax = snap(tEnd * 1.04 + 0.4);

  const notes = all.map((w) => {
    if (!w.ok) return `${WAYS[w.name]}, ${w.why}.`;
    const part = w.name === 'up' ? `the weight’s component down the slope, ${M`${d(W)} [N]`}, works against it with the resistance` : `the weight’s component down the slope, ${M`${d(W)} [N]`}, helps it; the resistance is still against it`;
    if (find === 'D') return `${WAYS[w.name]}, ${part}: to go from ${M`${d(u)}`} to ${M`${d(w.v)} [m s^-1]`} in ${M`${d(s)} [m]`} the driving force is ${M`${d(w.D)} [N]`}.`;
    if (find === 'R') return `${WAYS[w.name]}, ${part}: to go from ${M`${d(u)}`} to ${M`${d(w.v)} [m s^-1]`} in ${M`${d(s)} [m]`} the resistance is ${M`${d(w.R)} [N]`}.`;
    return `${WAYS[w.name]}, ${part}: ${M`a = ${d(w.a)} [m s^-2]`}, and after ${M`${d(s)} [m]`} it is moving at ${M`${d(w.v)} [m s^-1]`}, ${M`${d(w.t)} [s]`} after it set off.`;
  });
  const derived = done.map((w) => (find === 'D' ? M`D = ${d(w.D)} [N]` : find === 'R' ? M`R = ${d(w.R)} [N]` : `${w.name}: ${M`v = ${d(w.v)} [m s^-1]`}`));

  const f = { kind: 'drive', way, ways: done.map((w) => w.name), find, m, g, u, s, sinA: sn, alpha: have(k.alpha) ? k.alpha : alpha, angleGiven: have(k.alpha) ? 'alpha' : have(k.h) ? 'h' : 'sinA', h: have(k.h) ? k.h : null, W,
    up: by.up?.ok ? by.up : null, down: by.down?.ok ? by.down : null, failed: all.filter((w) => !w.ok).map((w) => w.name),
    tUp: by.up?.ok ? by.up.t : null, tDown: by.down?.ok ? by.down.t : null, tMax, tFlight: tMax, tMid: snap(tEnd / 2), params: { u: 0, theta: 0, h: 0, g } };
  return { ok: true, mode: 'drive', way, find, W, sinA: sn,
    aUp: by.up?.a ?? null, aDown: by.down?.a ?? null, vUp: by.up?.ok ? by.up.v : null, vDown: by.down?.ok ? by.down.v : null,
    tUp: by.up?.ok ? by.up.t : null, tDown: by.down?.ok ? by.down.t : null, D: done[0].D, R: done[0].R,
    ways: all.map((w) => ({ name: w.name, ok: w.ok, rows: w.rows, why: w.why })),
    rows: all.flatMap((w) => w.rows), notes, derived, f };
}

/** The working: each way the vehicle is driven, F = ma along the road then SUVAT (or SUVAT then F = ma). */
export function driveWorking(s) {
  if (!s?.ok) return [];
  return s.ways.map((w) => ({ title: WAYS[w.name], rows: w.rows,
    note: `${w.name === 'up' ? 'Up the road is positive: the weight’s component down the slope works against it, with the resistance.' : 'Down the road is positive: the weight’s component down the slope helps it; the resistance is still against it.'}${w.ok ? '' : ` It does not cover the distance: ${w.why}.`}` }));
}
