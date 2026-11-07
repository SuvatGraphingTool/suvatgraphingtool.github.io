// road.js — the stage for a vehicle along a straight road.
//
// Side-on, level, and nothing else in the way: a road from A to B, the
// vehicle on it, and the marks the question is about. The vehicle is the one
// the question names — a lorry unless it says a car, a cyclist, a motorcycle,
// a train (on rails, then) or a runner (on a track) — from ./figures.js. The picture is drawn
// from js/core/road.js and claims nothing that file did not compute (rule 4).
//
//   · posts at A and B, and a marker at the point the question names (the
//     mid-point of AB, usually), which reports the time the engine found for
//     it once the vehicle has passed it;
//   · a trail of equal-time marks behind the vehicle — the spacing growing
//     or shrinking IS the acceleration, the strobe picture of it;
//   · the velocity and the acceleration as arrows, in their own hues
//     (rule 2), solid because they are vectors, not components of one; and
//     the displacement from A as a dashed bracket, because it is horizontal.
//
// The view frames the whole run, A to B, and does not pan: the graphs are
// where a road question's answer is drawn — the velocity–time line, and the
// area under it that is AB.

import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, cssVar } from './util.js';
import { T } from '../notation.js';
import { FIGURES, post, surface, phaseFor } from './figures.js';

const TRAIL = 10;            // equal-time marks across the whole run

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true, markers = {}, who = 'lorry' } = o;
  // what is moving: the lorry, unless the question says a car, a cyclist…
  const fig = FIGURES[who] || FIGURES.lorry;
  if (!f || f.kind !== 'line') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const { s, u, v, a, t: T_END } = f.params;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the frame: the whole run, A to B, with room for the vehicle behind A
  const pts = f.path(120);
  const lo = Math.min(0, s, ...pts.map((p) => p.x)), hi = Math.max(0, s, ...pts.map((p) => p.x));
  const span = Math.max(hi - lo, 1);
  // the vehicle unit: a lorry's length; every traveller is drawn in proportion
  const lorryPx = clamp(w * 0.085, 64, 118);
  const figPx = Math.max(lorryPx * fig.size, fig.min || 0);
  const figLen = who === 'runner' ? figPx * 0.5 : figPx;
  // room behind A for it, and — for a runner or a bike, which turn round
  // and face left (a lorry, car or train reverses instead) — room beyond the
  // far end too, since its body is then to the right of its front
  const turns = !!fig.turns && (u < 0 || v < 0);
  const left = Math.max(lorryPx, figLen) + 40, right = 64 + (turns ? figLen : 0);
  const sx = (x) => left + ((x - lo) / span) * (w - left - right);
  const roadY = Math.round(h * 0.6);

  // ── ground and road
  g.save();
  g.fillStyle = cssVar('--hover', 'rgba(255,255,255,.06)');
  g.fillRect(0, roadY, w, h - roadY);
  g.restore();
  surface(g, fig.ground, 0, w, roadY - 3, P);

  // ── metres along the road, from A
  const step = niceStep(span, 6);
  for (let m = Math.ceil(lo / step) * step; m <= hi + 1e-9; m += step) {
    const X = sx(m);
    stroke(g, [{ x: X, y: roadY + 16 }, { x: X, y: roadY + 26 }], { color: P.faint, width: 1.4 });
    L.add(`${fmt(m, step < 1 ? 1 : 0)} m`, X, roadY + 40, { color: P.muted, align: 'center', pri: 1, bg: false, size: 15 });
  }
  if (show.grid) {
    for (let m = Math.ceil(lo / step) * step; m <= hi + 1e-9; m += step) {
      stroke(g, [{ x: sx(m), y: 30 }, { x: sx(m), y: roadY - 3 }], { color: P.grid, width: 1 });
    }
  }

  // ── A, B, and the point the question names
  post(g, L, sx(0), roadY, 'A', P.ink, P);
  post(g, L, sx(s), roadY, 'B', P.ink, P);
  const mk = markers.mark;
  if (mk && isFinite(mk.s)) {
    const X = sx(mk.s);
    post(g, L, X, roadY, 'M', P.mark, P, { dashed: true });
    const passed = t >= mk.t - 1e-9;
    L.add(passed ? T`t = ${fmt(mk.t, 2)} [s]` : (mk.mid ? 'mid-point' : T`${fmt(mk.s, 1)} [m]`),
      X, roadY - 136, { color: P.mark, align: 'center', pri: 9, size: 16, weight: 700 });
  }

  // ── the trail: where it was at equal steps of time, up to now
  const dt = T_END / TRAIL;
  for (let i = 0; i * dt <= t + 1e-9; i++) {
    const X = sx(f.pos(i * dt).x);
    dot(g, X, roadY - 3, 4.2, { fill: P.vel, stroke: P.surface, width: 1.5 });
    if (show.ticks) {
      L.add(T`${fmt(i * dt, 1)} [s]`, X, roadY - 20, { color: P.vel, align: 'center', pri: 2, size: 13, bg: false, maxPush: 20 });
    }
  }

  // ── the displacement from A, dashed because it is horizontal
  const p = f.pos(t), Xp = sx(p.x), X0 = sx(0);
  if (Math.abs(Xp - X0) > 4) {
    const by = roadY + 62;
    stroke(g, [{ x: X0, y: by }, { x: Xp, y: by }], { color: P.disp, width: 2.6, dash: [8, 6] });
    stroke(g, [{ x: X0, y: by - 7 }, { x: X0, y: by + 7 }], { color: P.disp, width: 2.2 });
    stroke(g, [{ x: Xp, y: by - 7 }, { x: Xp, y: by + 7 }], { color: P.disp, width: 2.2 });
    L.add(T`s = ${fmt(p.x, 1)} [m]`, (X0 + Xp) / 2, by + 18, { color: P.disp, align: 'center', pri: 8, size: 16, weight: 700 });
  }

  // ── the traveller, its front on the point it is at, facing the way it
  //    is going (a lorry backs up rather than turning round)
  const vNow = f.vel(t).x;
  // at rest it faces the way it is about to go (or last went)
  const vDir = Math.abs(vNow) > 1e-6 ? vNow : t < 1e-6 ? a : f.vel(t - 1e-3).x;
  const dir = !fig.turns || vDir >= 0 ? 1 : -1;
  // a figure that turns round goes by distance travelled, so its legs and
  // wheels keep going forwards; one that reverses goes by displacement, so
  // its wheels turn backwards as it backs up
  const tStop = Math.abs(a) > 1e-12 ? -u / a : NaN;
  const pxPerM = (w - left - right) / span;
  const dist = !fig.turns ? p.x : tStop > 0 && tStop < t
    ? Math.abs(f.pos(tStop).x) + Math.abs(p.x - f.pos(tStop).x) : Math.abs(p.x);
  fig.draw(g, Xp, roadY - 3, figPx, P, { dir, cars: fig.cars, still: Math.abs(vNow) < 1e-6,
    phase: phaseFor(who, figPx, dist * pxPerM, { cars: fig.cars }) });

  // ── its velocity and acceleration, as vectors
  const vMax = Math.max(Math.abs(u), Math.abs(v), 1e-6);
  const aY = roadY - 3 - lorryPx * fig.top - 40;
  if (show.velocity !== false && Math.abs(vNow) > 1e-6) {
    const len = (vNow / vMax) * clamp(w * 0.14, 70, 170);
    const vy = roadY - 3 - lorryPx * fig.mid;
    arrow(g, Xp + 6 * dir, vy, Xp + 6 * dir + len, vy, { color: P.velVec, width: 3.2, head: 13 });
    L.add(T`v = ${fmt(vNow, 1)} [m s^-1]`, Xp + 6 * dir + len + (len >= 0 ? 10 : -10), vy, {
      color: P.vel, align: len >= 0 ? 'left' : 'right', pri: 7, size: 16, weight: 700 });
  }
  // over a vehicle; behind a person or a bike, at half its height, since
  // over its head is where the posts' letter plates are
  const alen = clamp(w * 0.07, 40, 90);
  const mid = fig.tall ? Xp - dir * (figLen + 18 + alen / 2) : Xp - (dir * figLen) / 2;
  const ay = fig.tall ? roadY - 3 - figPx * 0.5 : aY;
  if (show.acceleration !== false && Math.abs(a) > 1e-9) {
    const len = Math.sign(a) * alen;
    arrow(g, mid - len / 2, ay, mid + len / 2, ay, { color: P.acc, width: 2.8, head: 12 });
    L.add(T`a = ${fmt(a, 2)} [m s^-2]`, mid, ay - 20, { color: P.acc, align: 'center', pri: 6, size: 15, weight: 700 });
  } else if (show.acceleration !== false) {
    L.add('no acceleration: constant velocity', mid, ay - (fig.tall ? 20 : 0), { color: P.acc, align: 'center', pri: 6, size: 15 });
  }

  L.draw(g, w, h);
  return null;
}
