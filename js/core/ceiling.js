// ceiling.js — a ball kicked or thrown straight up indoors, under a ceiling:
// does it reach the ceiling? If it does, when and how fast; if not, how far
// below it its greatest height is. The speed may be given, or found from the
// greatest height the paper gives.
//
// NO NEW PHYSICS. Straight up from a height h above the floor, a = −g: the
// twelve's own projectile (js/core/projectile.js `flight`, θ = 90°) for the
// motion; v² = u² + 2as for the greatest height and the speed at the ceiling;
// s = ut + ½at² for the time to reach it (the first root, on the way up) and
// to the floor.
//
// CONVENTION. Heights above the floor, up positive; t from the kick.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { flight } from './projectile.js';
import { quadRoots } from './stages.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

/**
 * @param k { g, h, u, top, C }
 *   h    the height it leaves from, above the floor (blank: the floor)
 *   u    the speed it is kicked up at — or, in its place,
 *   top  the greatest height it reaches above the floor (outdoors, with no ceiling)
 *   C    the height of the ceiling above the floor
 */
export function solveCeiling(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  const h = have(k.h) ? k.h : 0;
  if (h < 0) return fail('It leaves from the floor or above it: give that height as 0 or more.');
  if (have(k.u) && have(k.top)) return fail('Give the speed or the greatest height, not both: one fixes the other.');
  const rows = [];
  let u = k.u;
  if (!have(u)) {
    if (!have(k.top)) return fail('Still needed: the speed it is kicked up at, or the greatest height it reaches.');
    if (!(k.top > h)) return fail('The greatest height is above where it leaves from.');
    u = snap(Math.sqrt(2 * g * (k.top - h)));
    rows.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = u^2 - 2 * ${d(g)} * ${d(snap(k.top - h))}`, r: M`u = ${d(u)} [m s^-1]` });
  }
  if (!(u > 0)) return fail('It is kicked upwards: give a positive speed.');
  const rise = snap(u * u / (2 * g)), Hmax = snap(h + rise), tTop = snap(u / g);
  if (!have(k.top)) rows.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${d(u)}^2 - 2 * ${d(g)}s`, r: M`s = ${d(rise)} [m], H = ${d(Hmax)} [m]` });
  const ceilRows = [], notes = [];
  let hit = null;
  if (have(k.C)) {
    if (!(k.C > h)) return fail('The ceiling is above where it leaves from.');
    const up = snap(k.C - h);
    if (Hmax < k.C - 1e-9) {
      notes.push(`Its greatest height is ${M`${d(Hmax)} [m]`}, ${M`${d(snap(k.C - Hmax))} [m]`} below the ${M`${d(k.C)} [m]`} ceiling: it does not reach it.`);
      ceilRows.push({ f: M`H < C`, s: M`${d(Hmax)} < ${d(k.C)}`, r: M`"below the ceiling"` });
    } else {
      const v = snap(Math.sqrt(Math.max(0, u * u - 2 * g * up)));
      const t = quadRoots(-0.5 * g, u, -up).filter((x) => x > 0).sort((p, q) => p - q)[0];
      hit = { v, t: snap(t) };
      ceilRows.push({ f: M`v^2 = u^2 + 2as`, s: M`${d(u)}^2 - 2 * ${d(g)} * ${d(up)}`, r: M`v = ${d(v)} [m s^-1]` });
      ceilRows.push({ f: M`s = ut + ½at^2`, s: M`${d(up)} = ${d(u)}t - ½ * ${d(g)}t^2`, r: M`t = ${d(hit.t)} [s]` });
      notes.push(Math.abs(Hmax - k.C) < 1e-9 ? `It just reaches the ceiling, at ${M`t = ${d(hit.t)} [s]`}, where it stops.`
        : `It reaches the ${M`${d(k.C)} [m]`} ceiling at ${M`t = ${d(hit.t)} [s]`}, still rising at ${M`${d(v)} [m s^-1]`}.`);
    }
  }
  // without a ceiling it hit, the time to the floor
  const f0 = flight({ u, theta: 90, h, g });
  const floorRows = [];
  if (!hit) floorRows.push({ f: M`s = ut + ½at^2`, s: M`-${d(h)} = ${d(u)}t - ½ * ${d(g)}t^2`, r: M`t = ${d(snap(f0.tFlight))} [s]` });
  if (!hit) notes.push(`It lands on the floor ${M`${d(snap(f0.tFlight))} [s]`} after it is kicked.`);
  notes.unshift(hit && Hmax > (k.C ?? Infinity) + 1e-9 ? `Without the ceiling it would rise to ${M`${d(Hmax)} [m]`} above the floor.` : `It rises to ${M`${d(Hmax)} [m]`} above the floor, at ${M`t = ${d(tTop)} [s]`}.`);
  const tMax = hit ? hit.t : f0.tFlight;
  const f = { kind: 'ceiling', tMax, h, C: have(k.C) ? k.C : null, Hmax, tTop, hit, g, u,
    pos: (t) => h + u * t - 0.5 * g * t * t, vel: (t) => u - g * t, acc: () => -g, params: { u, theta: 90, h, g } };
  const derived = [`${M`H = ${d(Hmax)} [m]`}`, hit ? 'reaches the ceiling' : have(k.C) ? 'stays below the ceiling' : ''].filter(Boolean);
  return { ok: true, mode: 'ceiling', u, Hmax, tTop, hit, rows, ceilRows, floorRows, notes, derived, f };
}

/** The working: the speed or greatest height, the ceiling, the floor. */
export function ceilingWorking(s) {
  if (!s?.ok) return [];
  const out = [{ title: 'Its greatest height', rows: s.rows, note: 'At the top it stops rising: v = 0. Up positive, a = −g.' }];
  if (s.ceilRows.length) out.push({ title: 'The ceiling', rows: s.ceilRows, note: s.hit ? 'The first time it is that high: on the way up.' : 'It turns before it gets there.' });
  if (s.floorRows.length) out.push({ title: 'Back down to the floor', rows: s.floorRows, note: 'From where it was kicked, down to the floor: s is negative.' });
  return out;
}
