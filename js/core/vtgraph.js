// vtgraph.js — a velocity–time graph of straight pieces, read the way the
// papers read it: the acceleration in each piece is its gradient (the
// greatest of them asked for), the displacement is the area under the graph
// (below the axis counts back), and the times it is back where it started are
// where the running area is zero again.
//
// NO NEW PHYSICS. Each piece is a constant acceleration, so within it the
// displacement is s = ut + ½at² from the piece's start (js/core/stages.js
// `quadRoots` for when it is a given value); the pieces are added in turn.
//
// CONVENTION. Forwards positive; displacement from where it starts; t from 0.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { quadRoots } from './stages.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const EPS = 1e-9;
const br = (x) => (x < 0 ? `(${d(x)})` : d(x));

/**
 * @param k { v0, pts: [{ t, v }], ask: { t, s } }
 *   v0   the velocity at t = 0
 *   pts  each corner after it, in time order
 *   ask  a time to give the displacement and velocity at; a displacement to
 *        find every time it is at (0, the default, is "back where it started")
 */
export function solveVt(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  if (!have(k.v0)) return fail('Still needed: the velocity at t = 0 — 0 if it starts from rest.');
  const raw = k.pts || [];
  const last = raw.map((p) => p && (have(p.t) || have(p.v))).lastIndexOf(true);
  const pts = raw.slice(0, last + 1);
  if (!pts.length) return fail('Still needed: the corners of the graph — the time and velocity at each.');
  if (pts.some((p) => !p || !have(p.t) || !have(p.v))) return fail('Give every corner both its time and its velocity, in order: a blank corner before a later one leaves the graph unjoined.');
  const P = [{ t: 0, v: k.v0 }, ...pts];
  for (let i = 1; i < P.length; i++) if (!(P[i].t > P[i - 1].t + EPS)) return fail(`The corners must go forward in time: ${M`t = ${d(P[i].t)}`} does not come after ${M`t = ${d(P[i - 1].t)}`}.`);

  // ── each piece: its acceleration (gradient) and its area
  let x = 0;
  const S = [];
  for (let i = 1; i < P.length; i++) {
    const a0 = P[i - 1], b = P[i], dt = b.t - a0.t, a = snap((b.v - a0.v) / dt), area = snap(0.5 * (a0.v + b.v) * dt);
    S.push({ i, t0: a0.t, t1: b.t, v0: a0.v, v1: b.v, a, area, x0: snap(x), x1: snap(x + area) });
    x += area;
  }
  const T = P[P.length - 1].t;
  const aMax = Math.max(...S.map((s) => Math.abs(s.a)));
  const steep = S.filter((s) => Math.abs(Math.abs(s.a) - aMax) < EPS);
  const aRows = steep.map((s) => ({ f: M`a = (Delta v)/(Delta t)`, s: M`(${br(s.v1)} - ${br(s.v0)})/(${d(s.t1)} - ${d(s.t0)})`, r: M`a = ${d(s.a)} [m s^-2]` }));

  // ── the running area, corner by corner
  const areaRows = S.map((s) => ({ f: M`"area" ${d(s.t0)} "to" ${d(s.t1)}`, s: M`½(${br(s.v0)} + ${br(s.v1)}) * ${d(snap(s.t1 - s.t0))}`, r: M`${d(s.area)} [m], "so" x = ${d(s.x1)} [m]` }));

  // ── when it is at a displacement (0: back where it started)
  const target = have(k.ask?.s) ? k.ask.s : 0;
  const times = [], findRows = [];
  for (const s of S) {
    // x0 + v0 τ + ½ a τ² = target, for τ in [0, Δt]
    const roots = quadRoots(0.5 * s.a, s.v0, s.x0 - target).filter((tau) => tau > -EPS && tau < s.t1 - s.t0 + EPS);
    for (const tau of roots) {
      const t = snap(s.t0 + Math.max(0, tau));
      if (t < EPS && Math.abs(target) < EPS) continue;          // the start itself
      if (times.some((q) => Math.abs(q - t) < 1e-6)) continue;
      // standing still at that displacement for a stretch: say the stretch's start only
      times.push(t);
      findRows.push({ f: M`x = x_0 + ut + ½at^2`, s: M`${d(target)} = ${d(s.x0)} + ${br(s.v0)}tau${Math.abs(s.a) > EPS ? ` + ½ * ${br(s.a)}tau^2` : ''}`, r: M`tau = ${d(snap(t - s.t0))}, t = ${d(t)} [s]` });
    }
  }
  const stillAt = S.filter((s) => Math.abs(s.v0) < EPS && Math.abs(s.v1) < EPS && Math.abs(s.x0 - target) < EPS);

  // ── a time asked
  let at = null;
  const atRows = [];
  if (have(k.ask?.t)) {
    const t = k.ask.t;
    if (!(t >= 0 && t <= T + EPS)) return fail(`Ask about a time from 0 to ${M`${d(T)} [s]`}, while the graph runs.`);
    const s = S.find((q) => t <= q.t1 + EPS) || S[S.length - 1], tau = t - s.t0;
    const v = snap(s.v0 + s.a * tau), xa = snap(s.x0 + s.v0 * tau + 0.5 * s.a * tau * tau);
    at = { t, v, x: xa };
    atRows.push({ f: M`v = u + at`, s: M`${br(s.v0)} + ${br(s.a)} * ${d(snap(tau))}`, r: M`v = ${d(v)} [m s^-1]` });
    atRows.push({ f: M`x = x_0 + ut + ½at^2`, s: M`${d(s.x0)} + ${br(s.v0)} * ${d(snap(tau))} + ½ * ${br(s.a)} * ${d(snap(tau))}^2`, r: M`x = ${d(xa)} [m]` });
  }

  // distance travelled: each piece's area, split where it changes direction
  let dist = 0;
  for (const s of S) {
    const turn = Math.abs(s.a) > EPS ? -s.v0 / s.a : -1;
    if (turn > EPS && turn < s.t1 - s.t0 - EPS) { const p1 = 0.5 * s.v0 * turn; dist += Math.abs(p1) + Math.abs(s.area - p1); } else dist += Math.abs(s.area);
  }
  dist = snap(dist);
  const notes = [`The greatest acceleration has size ${M`${d(aMax)} [m s^-2]`}, the steepest piece.`,
    times.length ? `It is ${Math.abs(target) < EPS ? 'back where it started' : M`${d(target)} [m]` + ' from where it started'} at ${times.map((t) => M`t = ${d(t)} [s]`).join(', ')}${stillAt.length ? ', and stays there while it is at rest' : ''}.`
      : `It is never ${Math.abs(target) < EPS ? 'back where it started' : M`${d(target)} [m]` + ' from where it started'} again.`,
    `It travels ${M`${d(dist)} [m]`} in all and ends ${M`${d(Math.abs(snap(x)))} [m]`} ${x >= 0 ? 'ahead of' : 'behind'} where it started.`];
  if (at) notes.push(`At ${M`t = ${d(at.t)} [s]`}: ${M`v = ${d(at.v)} [m s^-1]`}, ${M`x = ${d(at.x)} [m]`}.`);

  const seg = (t) => S.find((q) => t <= q.t1 + 1e-12) || S[S.length - 1];
  const f = { kind: 'vt', tMax: T, P, S, times, target, at, aMax, steep: steep.map((s) => s.i),
    pos: (t) => { const s = seg(t), tau = Math.max(0, t - s.t0); return s.x0 + s.v0 * tau + 0.5 * s.a * tau * tau; },
    vel: (t) => { const s = seg(t); return s.v0 + s.a * Math.max(0, t - s.t0); }, acc: (t) => seg(t).a };
  const derived = [`greatest ${M`abs(a) = ${d(aMax)} [m s^-2]`}`, ...times.map((t) => M`t = ${d(t)} [s]`)];
  return { ok: true, mode: 'vt', S, aMax, aRows, areaRows, times, findRows, at, atRows, dist, end: snap(x), notes, derived, f, target };
}

/** The working: the steepest gradient, the area piece by piece, the times asked. */
export function vtWorking(s) {
  if (!s?.ok) return [];
  const out = [{ title: 'The greatest acceleration', rows: s.aRows, note: 'The acceleration in each piece is its gradient; the steepest is the greatest.' },
    { title: 'The displacement, piece by piece', rows: s.areaRows, note: 'The area between the graph and the time axis: above it forwards, below it back.' }];
  if (s.findRows.length) out.push({ title: Math.abs(s.target) < EPS ? 'When it is back where it started' : `When it is ${M`${d(s.target)} [m]`} from the start`, rows: s.findRows,
    note: 'In the piece where the running displacement passes that value: from the piece’s start, s = ut + ½at², τ into it.' });
  if (s.atRows.length) out.push({ title: `At ${M`t = ${d(s.at.t)} [s]`}`, rows: s.atRows, note: 'Timed from the start of the piece it falls in.' });
  return out;
}
