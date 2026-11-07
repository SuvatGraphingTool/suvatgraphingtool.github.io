// xtgraph.js — a displacement–time graph of straight pieces: a particle on a
// line that is either at rest (a flat piece) or moving at a steady velocity (a
// sloping one), read the way the papers read it — a corner time found from the
// speed, the velocity in any piece as its gradient, the distance travelled
// against the displacement — and, after the last corner, a motion with a
// constant acceleration given as x = c₀ + c₁t + c₂t².
//
// NO NEW PHYSICS. Each straight piece is the steady-speed case of the five
// (a = 0, so s = vt); the last part is s = ut + ½at² written in t from 0, so
// its velocity is c₁ + 2c₂t and its acceleration 2c₂ (the line's own
// quadRoots-free rearrangement: a linear equation for a speed).
//
// CONVENTION. x is the displacement from A, metres; t in seconds from 0.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { poly } from './pair.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const EPS = 1e-9;

/**
 * @param k { x0, pts: [{ t, x }], speed, ask: { ts: [t...] }, tail: { c0, c1, c2, speed } }
 *   x0     where it is at t = 0
 *   pts    the corners after it, in order; one corner's time may be blank,
 *          found from the speed of the piece next to it
 *   speed  the speed of every sloping piece, when the paper says so
 *   tail   after the last corner, x = c0 + c1·t + c2·t²; speed: when is it that fast?
 */
export function solveXt(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  if (!have(k.x0)) return fail('Still needed: where it is at t = 0.');
  const raw = (k.pts || []).filter((p) => p && (have(p.t) || have(p.x)));
  if (!raw.length) return fail('Still needed: the corners of the graph — the time and displacement at each.');
  if (raw.some((p) => !have(p.x))) return fail('Every corner needs its displacement; one corner’s time may be left blank.');
  const P = [{ t: 0, x: k.x0 }, ...raw.map((p) => ({ t: have(p.t) ? p.t : null, x: p.x }))];
  const blank = P.map((p, i) => (p.t == null ? i : -1)).filter((i) => i >= 0);
  if (blank.length > 1) return fail('Only one corner’s time can be left blank: the speed fixes one.');
  const sp = have(k.speed) ? k.speed : null;
  if (sp != null && !(sp > 0)) return fail('The speed is a positive number.');

  // ── a blank corner time, from the speed of a sloping piece next to it
  const rows = [];
  if (blank.length) {
    const i = blank[0];
    if (sp == null) return fail('A corner’s time is blank: give the speed of the moving pieces to find it.');
    const after = i < P.length - 1 && Math.abs(P[i + 1].x - P[i].x) > EPS ? P[i + 1] : null;
    const before = Math.abs(P[i].x - P[i - 1].x) > EPS ? P[i - 1] : null;
    if (after) {
      const dt = Math.abs(after.x - P[i].x) / sp;
      P[i].t = snap(after.t - dt);
      rows.push({ f: M`t = "distance"/"speed"`, s: M`abs(${d(after.x)} - ${d(P[i].x)})/${d(sp)}`, r: M`${d(snap(dt))} [s]` });
      rows.push({ f: M`T = ${d(after.t)} - ${d(snap(dt))}`, s: '', r: M`T = ${d(P[i].t)} [s]` });
    } else if (before) {
      const dt = Math.abs(P[i].x - before.x) / sp;
      P[i].t = snap(before.t + dt);
      rows.push({ f: M`t = "distance"/"speed"`, s: M`abs(${d(P[i].x)} - ${d(before.x)})/${d(sp)}`, r: M`${d(snap(dt))} [s]` });
      rows.push({ f: M`T = ${d(before.t)} + ${d(snap(dt))}`, s: '', r: M`T = ${d(P[i].t)} [s]` });
    } else return fail('The blank corner sits between two flat pieces: the speed cannot fix it.');
  }
  for (let i = 1; i < P.length; i++) if (!(P[i].t > P[i - 1].t + EPS)) return fail(`The corners must go forward in time: ${M`t = ${d(P[i].t)}`} does not come after ${M`t = ${d(P[i - 1].t)}`}.`);

  // ── each piece: its velocity is its gradient
  const S = [];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], v = snap((b.x - a.x) / (b.t - a.t));
    if (sp != null && Math.abs(v) > EPS && Math.abs(Math.abs(v) - sp) > 1e-6 * sp)
      return fail(`The piece from ${M`t = ${d(a.t)}`} to ${M`t = ${d(b.t)}`} has speed ${M`${d(Math.abs(v))} [m s^-1]`}, not the ${M`${d(sp)} [m s^-1]`} given${blank.length && (a.t === P[blank[0]].t || b.t === P[blank[0]].t) ? ', with the blank corner placed by the speed of the piece on its other side' : ''}: check the corners, or clear the speed to let the pieces differ.`);
    S.push({ i, t0: a.t, t1: b.t, x0: a.x, x1: b.x, v });
  }
  const tEnd = P[P.length - 1].t, xEnd = P[P.length - 1].x;
  const dist = S.reduce((s, x) => s + Math.abs(x.x1 - x.x0), 0), disp = xEnd - k.x0;
  const distRows = [{ f: M`"distance" = sum abs(Delta x)`, s: M`${S.filter((x) => Math.abs(x.x1 - x.x0) > EPS).map((x) => d(Math.abs(snap(x.x1 - x.x0)))).join(' + ') || '0'}`, r: M`${d(snap(dist))} [m]` }];

  // ── the tail: constant acceleration after the last corner
  let tail = null;
  const tailRows = [];
  const tk = k.tail || {};
  if ([tk.c0, tk.c1, tk.c2].some(have)) {
    const c = [tk.c0 ?? 0, tk.c1 ?? 0, tk.c2 ?? 0];
    const xAt = (t) => c[0] + c[1] * t + c[2] * t * t;
    if (Math.abs(xAt(tEnd) - xEnd) > 1e-6 * Math.max(1, Math.abs(xEnd)))
      return fail(`At ${M`t = ${d(tEnd)}`} the formula gives ${M`x = ${d(snap(xAt(tEnd)))}`} but the graph ends at ${M`x = ${d(xEnd)}`}: it would jump.`);
    tail = { c, a: snap(2 * c[2]) };
    tailRows.push({ f: M`v = (dx)/(dt)`, s: M`x = ${poly(c)}`, r: M`v = ${poly([c[1], 2 * c[2], 0])}` });
    if (have(tk.speed)) {
      const S2 = Math.abs(tk.speed), vs = S2 < EPS ? [0] : [S2, -S2], vEq = poly([c[1], 2 * c[2], 0]);
      const ts = [];
      let always = false;
      for (const v of vs) {
        if (Math.abs(c[2]) < EPS) {
          const same = Math.abs(c[1] - v) < EPS;
          if (same) always = true;
          tailRows.push({ f: M`v = ${d(v)}`, s: M`${vEq} = ${d(v)}`, r: same ? M`"always"` : M`"never"` });
          continue;
        }
        const t = snap((v - c[1]) / (2 * c[2]));
        if (t > tEnd + EPS) ts.push(t);
        tailRows.push({ f: M`v = ${d(v)}`, s: M`${vEq} = ${d(v)}`, r: M`t = ${d(t)}${t > tEnd + EPS ? '' : ` "(not after" t = ${d(tEnd)}")"`}` });
      }
      tail.speed = S2; tail.ts = ts.sort((p, q) => p - q); tail.always = always;
    }
  } else if (have(tk.speed)) return fail('A speed is asked after the graph, but there is no formula for after it: give c₀, c₁ and c₂, or clear the speed.');

  // ── velocities asked for
  const askRows = [], asked = [];
  for (const t of (k.ask?.ts || []).filter(have)) {
    if (t < 0) return fail('A time asked about is 0 or later.');
    if (t > tEnd + EPS && !tail) return fail(`${M`t = ${d(t)}`} is after the graph ends at ${M`t = ${d(tEnd)}`}.`);
    // at the last corner the formula takes over: the velocity may change there
    if (tail && Math.abs(t - tEnd) < EPS && Math.abs(S[S.length - 1].v - (tail.c[1] + 2 * tail.c[2] * t)) > EPS) { askRows.push({ f: M`t = ${d(t)}`, s: M`"the last corner"`, r: M`"the velocity changes there"` }); asked.push({ t, v: null }); continue; }
    if (t > tEnd + EPS) { const v = snap(tail.c[1] + 2 * tail.c[2] * t); askRows.push({ f: M`v = ${poly([tail.c[1], 2 * tail.c[2], 0])}`, s: M`t = ${d(t)}`, r: M`v = ${d(v)} [m s^-1]` }); asked.push({ t, v }); continue; }
    const at = S.filter((x) => t >= x.t0 - EPS && t <= x.t1 + EPS);
    if (at.length > 1 && Math.abs(at[0].v - at[1].v) > EPS) { askRows.push({ f: M`t = ${d(t)}`, s: M`"a corner"`, r: M`"the velocity changes there"` }); asked.push({ t, v: null }); continue; }
    const x = at[0];
    askRows.push({ f: M`v = (Delta x)/(Delta t)`, s: M`(${d(x.x1)} - ${x.x0 < 0 ? `(${d(x.x0)})` : d(x.x0)})/(${d(x.t1)} - ${d(x.t0)})`, r: M`v = ${d(x.v)} [m s^-1]` });
    asked.push({ t, v: x.v });
  }

  const notes = [`From ${M`t = 0`} to ${M`t = ${d(tEnd)}`} it travels ${M`${d(snap(dist))} [m]`} in all, but ${Math.abs(disp) < EPS ? 'ends where it started' : `ends ${M`${d(snap(Math.abs(disp)))} [m]`} ${disp > 0 ? 'on' : 'back'} from where it started`}: distance counts every piece, displacement only where it ends.`];
  if (blank.length) notes.unshift(`The corner left blank is at ${M`t = ${d(P[blank[0]].t)} [s]`}.`);
  if (tail?.ts) notes.push(tail.always ? `After the graph its velocity is ${M`v = ${poly([tail.c[1], 2 * tail.c[2], 0])}`}: its speed is ${M`${d(tail.speed)} [m s^-1]`} the whole time.`
    : tail.ts.length ? `After the graph its velocity is ${M`v = ${poly([tail.c[1], 2 * tail.c[2], 0])}`}: its speed is ${M`${d(tail.speed)} [m s^-1]`} at ${tail.ts.map((t) => M`t = ${d(t)} [s]`).join(' and at ')}.`
      : `After the graph its speed is never ${M`${d(tail.speed)} [m s^-1]`}.`);
  const derived = [`${M`${d(snap(dist))} [m]`} travelled`];

  const tMax = tail ? Math.max(tEnd * 1.25, ...(tail.ts || []).map((t) => t * 1.05)) : tEnd;
  const seg = (t) => S.find((x) => t <= x.t1 + 1e-12) || S[S.length - 1];
  const pos = (t) => { if (tail && t > tEnd) return tail.c[0] + tail.c[1] * t + tail.c[2] * t * t; const x = seg(t); return x.x0 + x.v * (Math.max(t, x.t0) - x.t0); };
  const vel = (t) => (tail && t > tEnd ? tail.c[1] + 2 * tail.c[2] * t : seg(t).v);
  const acc = (t) => (tail && t > tEnd ? tail.a : 0);
  const f = { kind: 'xt', tMax, tEnd, P, S, pos, vel, acc, tail, asked, blank: blank.length ? P[blank[0]].t : null, dist, disp };
  return { ok: true, mode: 'xt', P, S, dist, disp, tEnd, tail, rows, distRows, askRows, tailRows, notes, derived, f, blankT: f.blank };
}

/** The working: the blank corner, the velocities, the distance, the tail. */
export function xtWorking(s) {
  if (!s?.ok) return [];
  const out = [];
  if (s.rows.length) out.push({ title: 'The corner left blank', rows: s.rows, note: 'A sloping piece is a steady speed: the time it takes is the distance over the speed.' });
  if (s.askRows.length) out.push({ title: 'The velocity at each time asked', rows: s.askRows, note: 'The velocity is the gradient of the piece it is in: flat is at rest, down is going back.' });
  out.push({ title: 'Distance travelled', rows: s.distRows, note: 'Every piece counts, forwards and back; the flat ones add nothing.' });
  if (s.tailRows.length) out.push({ title: `After ${M`t = ${d(s.tEnd)}`}`, rows: s.tailRows, note: `A quadratic in t is a constant acceleration, ${M`a = ${d(s.tail.a)} [m s^-2]`}; a speed is either sign of the velocity, after the graph ends.` });
  return out;
}
