// heli.js — a helicopter at a constant height over the sea, moving with a
// constant acceleration in i (east) and j (north): how fast, and on what
// bearing, at a time; when it is a given distance from where it set off;
// whether it passes directly over a rock, when, and its average velocity and
// average speed on the way. (AQA MM1B Jun 2011 Q7, Jun 2013 Q8.)
//
// NO NEW PHYSICS. The two vector equations v = u + at, r = r₀ + ut + ½at²,
// as js/core/plane.js has them (its planeMotion is the motion here). What is
// new is what is asked:
//   · a distance from the start, |r − r₀| = D. From rest the path is a straight
//     line along a, so ½|a|t² = D; otherwise |ut + ½at²|² = D², a quartic in t,
//     solved for its first positive root;
//   · directly over a point P: the i equation gives the times it is level with
//     P east–west; it is over P only at one where the j equation agrees too;
//   · average velocity, the displacement over the time; average speed, the
//     distance travelled over the time. They have the same size only when the
//     path is a straight line it never turns back along.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { planeMotion, vsrc, vecSum } from './plane.js';
import { poly } from './pair.js';
import { quadRoots } from './stages.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const sb = (x) => (x < 0 && d(x) !== '0' ? `(${d(x)})` : d(x));
const three = (b) => String(Math.round(((b % 360) + 360) % 360) % 360).padStart(3, '0');
const bearingOf = (v) => snap(((Math.atan2(v.x, v.y) * 180 / Math.PI) % 360 + 360) % 360);
const vb = (v) => `(${vsrc(v)})`;   // a vector to substitute, always in its brackets

/** The first t > 0 at which g(t) = 0, by a scan and then bisection. */
function firstRoot(g, tHi) {
  const n = 4000;
  let a = 0, ga = g(0);
  for (let i = 1; i <= n; i++) {
    const b = (i / n) * tHi, gb = g(b);
    if (ga === 0 && a > 0) return a;
    if (ga * gb < 0 || gb === 0) {
      let lo = a, hi = b;
      for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (g(lo) * g(m) <= 0) hi = m; else lo = m; }
      return (lo + hi) / 2;
    }
    a = b; ga = gb;
  }
  return null;
}

/** The length of the path from 0 to T: the integral of the speed (Simpson's rule). */
function pathLength(f, T) {
  const n = 600, h = T / n;
  let s = 0;
  for (let i = 0; i <= n; i++) { const v = f.vel(i * h), w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2; s += w * Math.hypot(v.x, v.y); }
  return (s * h) / 3;
}

/**
 * @param k { r0: {x,y}, u: {x,y}, a: {x,y}, T, D, P: {x,y} }
 *   r0  where it is at t = 0 (over the lighthouse); blank: the origin
 *   u   its velocity then; blank: hovering, at rest
 *   a   its acceleration
 *   T   a time to read its speed and bearing at;  D  a distance from where it set off
 *   P   a point (a rock): does it pass directly over it?
 */
export function solveHeli(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const two = (q) => q && (have(q.x) || have(q.y));
  const vec = (q) => ({ x: have(q?.x) ? q.x : 0, y: have(q?.y) ? q.y : 0 });
  if (!two(k.a)) return fail('Still needed: the acceleration, as its two parts. Give 0 for a part that is zero.');
  if (have(k.T) && !(k.T > 0)) return fail('The time asked about is after it sets off: a positive number of seconds.');
  if (have(k.D) && !(k.D > 0)) return fail('A distance from where it set off is a positive number of metres.');
  const r0 = vec(k.r0), u = vec(k.u), a = vec(k.a), rest = !two(k.u) || Math.hypot(u.x, u.y) < EPS;
  const A = Math.hypot(a.x, a.y);
  if (rest && A < EPS) return fail('Hovering with no acceleration, it never moves.');
  const F = planeMotion({ r0, u, a }, Infinity);
  const rows = [], notes = [], derived = [], answers = {};
  rows.push({ f: M`vec v = vec u + vec(a)t`, s: '', r: M`vec v = ${vecSum([u.x, a.x], [u.y, a.y], 4)}` });
  rows.push({ f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: '', r: M`vec r = ${vecSum([r0.x, u.x, a.x / 2], [r0.y, u.y, a.y / 2], 4)}` });

  // ── at a time: speed and bearing
  if (have(k.T)) {
    const T = k.T, v = F.vel(T), s = snap(Math.hypot(v.x, v.y)), b = bearingOf(v);
    answers.T = { t: T, v, speed: s, bearing: b, r: F.pos(T) };
    rows.push({ f: M`vec v = vec u + vec(a)t`, s: M`${rest ? '' : `${vb(u)} + `}${vb(a)} * ${d(T)}`, r: M`vec v = ${vsrc(v)} [m s^-1]` });
    rows.push({ f: M`abs(vec v) = sqrt(v_x^2 + v_y^2)`, s: M`sqrt(${sb(v.x)}^2 + ${sb(v.y)}^2)`, r: M`${d(s)} [m s^-1]` });
    // the bearing from tan θ = east over north — or, with no north part, due east or west
    if (s > EPS && Math.abs(v.y) > EPS) rows.push({ f: M`tan theta = v_x/v_y`, s: M`${sb(v.x)}/${sb(v.y)}`, r: M`"bearing" ${three(b)}°` });
    else if (s > EPS) rows.push({ f: M`v_y = 0`, s: '', r: v.x > 0 ? M`"due east, bearing" 090°` : M`"due west, bearing" 270°` });
    derived.push(s > EPS ? `${M`${d(s)} [m s^-1]`} on ${three(b)}° at ${M`t = ${d(T)} [s]`}` : `at rest at ${M`t = ${d(T)} [s]`}`);
    notes.push(s > EPS ? `At ${M`t = ${d(T)} [s]`} it is doing ${M`${d(s)} [m s^-1]`} on a bearing of ${three(b)}°.` : `At ${M`t = ${d(T)} [s]`} it is momentarily at rest.`);
  }

  // ── a distance from where it set off
  if (have(k.D)) {
    const D = k.D;
    let t;
    if (rest) {
      // from rest it moves along a in a straight line: s = ½|a|t²
      t = snap(Math.sqrt((2 * D) / A));
      rows.push({ f: M`abs(vec a) = sqrt(a_x^2 + a_y^2)`, s: M`sqrt(${sb(a.x)}^2 + ${sb(a.y)}^2)`, r: M`${d(snap(A))} [m s^-2]` });
      rows.push({ f: M`s = ½at^2`, s: M`${d(D)} = ½ * ${d(snap(A))} * t^2`, r: M`t = ${d(t)} [s]` });
      notes.push(`From rest it flies in a straight line along its acceleration, so its distance from the start is ${M`½abs(vec a)t^2`}: ${M`${d(D)} [m]`} at ${M`t = ${d(t)} [s]`}.`);
    } else {
      const g = (tt) => { const r = F.pos(tt); return Math.hypot(r.x - r0.x, r.y - r0.y) - D; };
      // moving, or accelerating, it gets as far out as you like in the end: widen the search until it has
      let root = null;
      for (let hi = Math.max(10, Math.sqrt((2 * D) / Math.max(A, EPS)), D / Math.max(Math.hypot(u.x, u.y), EPS)); root == null && hi < 1e9; hi *= 4) root = firstRoot(g, hi);
      if (root == null) return fail(`It does not get ${M`${d(D)} [m]`} from where it set off.`);
      t = snap(root);
      rows.push({ f: M`abs(vec(u)t + ½vec(a)t^2) = ${d(D)}`, s: M`(${poly([0, u.x, a.x / 2])})^2 + (${poly([0, u.y, a.y / 2])})^2 = ${d(D * D)}`, r: M`t = ${d(t)} [s]` });
      notes.push(`It is first ${M`${d(D)} [m]`} from where it set off at ${M`t = ${d(t)} [s]`}.`);
    }
    answers.D = { t, D, r: F.pos(t) };
    derived.push(`${M`${d(D)} [m]`} out at ${M`t = ${d(t)} [s]`}`);
  }

  // ── directly over a point
  if (two(k.P)) {
    const P = vec(k.P);
    // one coordinate's equation gives the candidate times; the other checks them.
    // Usually i — but if it never moves east–west and is level with the rock that
    // way all along, the j equation is the one that can pick a time.
    const still = (c) => Math.abs(a[c]) < EPS && Math.abs(u[c]) < EPS;
    const c = still('x') && Math.abs(r0.x - P.x) < 1e-9 ? 'y' : 'x', o = c === 'x' ? 'y' : 'x';
    const roots = still(c) ? [] : Math.abs(a[c]) < EPS ? [(P[c] - r0[c]) / u[c]] : quadRoots(0.5 * a[c], u[c], r0[c] - P[c]);
    const ts = [...new Set(roots.map(snap))].filter((t) => t > EPS).sort((p, q) => p - q);
    const at = (t) => F.pos(t)[o];
    const agree = (t) => Math.abs(at(t) - P[o]) < 1e-6 * Math.max(1, Math.abs(P[o]));
    const hits = ts.filter(agree), hit = hits[0];
    const word = c === 'x' ? 'east–west' : 'north–south';
    rows.push({ f: M`${c} = ${c}_0 + u_${c} t + ½a_${c} t^2`, s: M`${d(P[c])} = ${poly([r0[c], u[c], a[c] / 2])}`, r: M`${poly([r0[c] - P[c], u[c], a[c] / 2], 3, { desc: true })} = 0` });
    rows.push({ f: '', s: '', r: ts.length ? ts.map((t) => M`t = ${d(t)} [s]`).join(' or ') : 'no time after it sets off' });
    for (const t of ts) rows.push({ f: M`${o} = ${o}_0 + u_${o} t + ½a_${o} t^2`, s: M`${d(r0[o])} + ${sb(u[o])} * ${d(t)} + ${sb(a[o] / 2)} * ${d(t)}^2`, r: M`${o} = ${d(snap(at(t)))}${agree(t) ? '' : ` != ${d(P[o])}`}` });
    if (hit == null) {
      answers.P = { P, over: false, times: ts, gaps: ts.map((t) => snap(at(t) - P[o])), along: o };
      const atStart = Math.hypot(r0.x - P.x, r0.y - P.y) < 1e-9;
      notes.push(atStart && !ts.length ? 'It is over the rock only at the start, at the moment it sets off, and never comes back over it.'
        : ts.length ? `It is level with the rock ${word} at ${ts.map((t) => M`t = ${d(t)} [s]`).join(' and ')}, but ${ts.length > 1 ? 'each time' : 'then'} it is somewhere else the other way: it never passes directly over it.`
        : `It is never level with the rock ${word}, so it never passes over it.`);
      derived.push('never directly over the rock');
    } else {
      const T = hit, disp = { x: snap(P.x - r0.x), y: snap(P.y - r0.y) }, av = { x: snap(disp.x / T), y: snap(disp.y / T) };
      const avs = snap(Math.hypot(av.x, av.y)), L = snap(pathLength(F, T)), sp = snap(L / T), D0 = Math.hypot(disp.x, disp.y);
      // the same only if the distance flown is the straight-line distance
      const straight = Math.abs(L - D0) <= 1e-6 * Math.max(1, L);
      // and if not: it turned back along its line, or its path curves
      const cross = u.x * a.y - u.y * a.x, back = !rest && A > EPS && Math.abs(cross) <= 1e-9 * Math.max(1, Math.hypot(u.x, u.y) * A);
      answers.P = { P, over: true, t: T, times: ts, hits, disp, av, avs, L, sp, straight, gaps: ts.map((t) => snap(at(t) - P[o])), along: o };
      rows.push({ f: M`"average velocity" = "displacement"/"time"`, s: M`${vb(disp)}/${d(T)}`, r: M`${vsrc(av)} [m s^-1]` });
      rows.push({ f: M`abs("average velocity")`, s: M`sqrt(${sb(av.x)}^2 + ${sb(av.y)}^2)`, r: M`${d(avs)} [m s^-1]` });
      rows.push({ f: M`"average speed" = "distance travelled"/"time"`, s: M`${d(L)}/${d(T)}`, r: M`${d(sp)} [m s^-1]` });
      const missed = ts.filter((t) => t < T && !agree(t));
      notes.push(`It passes directly over the rock at ${M`t = ${d(T)} [s]`}${missed.length ? `; at ${missed.map((t) => M`t = ${d(t)} [s]`).join(' and ')} it was level with it ${word} but not over it` : ''}${hits.length > 1 ? `, and over it again at ${hits.slice(1).map((t) => M`t = ${d(t)} [s]`).join(' and ')}` : ''}.`);
      notes.push(`Its average velocity on the way is ${M`(${vsrc(av)}) [m s^-1]`}, of size ${M`${d(avs)} [m s^-1]`}; its average speed is ${M`${d(sp)} [m s^-1]`}, the ${M`${d(L)} [m]`} it actually flies over the ${M`${d(T)} [s]`}.`);
      notes.push(straight ? 'The two are the same here: it flies a straight line and never turns back, so the distance it flies is the size of its displacement.'
        : back ? 'They are not the same: it flies along one straight line but turns back on it, so it flies further than the distance from the lighthouse to the rock.'
        : 'They are not the same: its path is curved, so the distance it flies is longer than the straight line from the lighthouse to the rock.');
      derived.push(`over the rock at ${M`t = ${d(T)} [s]`}`, `average velocity ${M`${d(avs)} [m s^-1]`}`, `average speed ${M`${d(sp)} [m s^-1]`}`);
    }
  }
  if (!derived.length) derived.push('its path, from over the lighthouse');

  const ends = [answers.T?.t, answers.D?.t, answers.P?.over ? answers.P.t : null, ...(answers.P?.times || [])].filter(have);
  const tMax = snap(ends.length ? Math.max(...ends) * 1.12 : 30);
  const f = { ...planeMotion({ r0, u, a }, tMax), kind: 'heli', rest, answers, rock: two(k.P) ? vec(k.P) : null };
  return { ok: true, mode: 'heli', r0, u, a, rest, answers, rows, notes, derived, f,
    convention: `East is ${M`vec i`} and north is ${M`vec j`}; positions are from the origin O.` };
}

/** The working: the two vector equations, then each question in turn. */
export function heliWorking(s) {
  if (!s?.ok) return [];
  return [{ title: 'Two SUVAT equations side by side, in i and j', rows: s.rows,
    note: `Each vector equation is an ${M`vec i`} equation and a ${M`vec j`} equation. Directly over the rock means both coordinates agree at the same instant: the ${M`vec i`} equation gives the candidates, the ${M`vec j`} equation picks one. A bearing is measured clockwise from north, with ${M`tan theta`} the east part over the north part.` }];
}
