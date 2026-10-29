// towards.js — the stage for two projectiles thrown towards each other: side
// on at one scale both ways, level ground from A to B, a thrower at each end
// facing the other (`runner` from figures.js), each path faintly in full and
// strongly so far — A in the quantity's hue, B in stone — each ball with its
// velocity (components dashed across, solid up, rule 2), and the moment they
// are level across marked: ringed where they collide, or the gap in height
// between them where they pass.
//
// Everything drawn is read from js/core/towards.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha } from './util.js';
import { runner } from './figures.js';
import { groundStrip, sky } from './heights.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'towards') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the frame: A to B, up to the higher top
  const n = 120, pa = [], pb = [];
  const tA1 = f.A.f.tFlight, tB1 = f.B.t0 + f.B.f.tFlight;
  for (let i = 0; i <= n; i++) { pa.push(f.posA((i / n) * tA1)); pb.push(f.posB(f.B.t0 + (i / n) * f.B.f.tFlight)); }
  const yTop = Math.max(...pa.map((p) => p.y), ...pb.map((p) => p.y), 1) * 1.2;
  const xLo = -f.D * 0.06, xHi = f.D * 1.06;
  const left = w < 520 ? 16 : HUD + 30, right = w - 30, top = 60, bottom = h - 50;
  const k = Math.min((right - left) / (xHi - xLo), (bottom - top) / yTop);
  const ox = left + ((right - left) - (xHi - xLo) * k) / 2 - xLo * k, oy = bottom;
  const X = (x) => ox + x * k, Y = (y) => oy - y * k;
  sky(g, 0, 0, w, oy); groundStrip(g, 0, w, oy, h);

  // the throwers, A and B, facing each other; the distance between
  const fig = Math.max(24, 1.7 * k);
  // a thrower above the ground stands on a stand of that height
  for (const [x, hh] of [[X(0) - 6, f.A.h], [X(f.D) + 6, f.B.h]]) if (hh > 1e-9) { g.save(); g.fillStyle = withAlpha(P.faint, 0.35); g.strokeStyle = P.muted; g.lineWidth = 1.4; g.fillRect(x - 10, Y(hh), 20, oy - Y(hh)); g.strokeRect(x - 10, Y(hh), 20, oy - Y(hh)); g.restore(); }
  runner(g, X(0) - 6, Y(f.A.h), fig, P, { dir: 1, still: true });
  runner(g, X(f.D) + 6, Y(f.B.h), fig, P, { dir: -1, still: true });
  L.add('A', X(0) - 14, oy + 16, { color: P.vel, align: 'right', pri: 8, size: 15, weight: 700, bg: false });
  L.add('B', X(f.D) + 14, oy + 16, { color: P.second, align: 'left', pri: 8, size: 15, weight: 700, bg: false });
  stroke(g, [{ x: X(0), y: oy + 30 }, { x: X(f.D), y: oy + 30 }], { color: P.ink, width: 1.2, alpha: 0.8 });
  for (const xx of [X(0), X(f.D)]) stroke(g, [{ x: xx, y: oy + 25 }, { x: xx, y: oy + 35 }], { color: P.ink, width: 1.2, alpha: 0.8 });
  L.add(T`${tr(f.D)} [m]`, (X(0) + X(f.D)) / 2, oy + 44, { color: P.ink, align: 'center', pri: 6, size: 13, weight: 700 });

  // the paths, faint in full and strong so far
  const draw = (pts, pos, t0, c) => {
    stroke(g, pts.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: c, width: 1.6, alpha: 0.3 });
    if (t > t0) { const so = []; for (let i = 0; i <= 60; i++) so.push(pos(t0 + (i / 60) * (t - t0))); stroke(g, so.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: c, width: 2.8 }); }
  };
  draw(pb, f.posB, f.B.t0, P.second); draw(pa, f.posA, 0, P.vel);

  // the moment they are level across
  if (t >= f.t - 1e-9 && f.outcome !== 'before') {
    const a = f.posA(f.t), b = f.posB(f.t);
    if (f.outcome === 'collide') {
      dot(g, X(a.x), Y(a.y), 11, { stroke: P.mark, width: 2.6 });
      L.add(T`"collide," t = ${tr(f.t)} [s]`, X(a.x) + 16, Y(a.y) - 22, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
      L.add(T`${tr(f.yA)} [m] "up"`, X(a.x) + 16, Y(a.y) - 4, { color: P.mark, align: 'left', pri: 8, size: 13, weight: 700 });
      stroke(g, [{ x: X(a.x), y: oy }, { x: X(a.x), y: Y(a.y) + 12 }], { color: P.mark, width: 1.2, dash: [4, 4] });
    } else if (f.outcome === 'pass') {
      stroke(g, [{ x: X(a.x), y: Y(a.y) }, { x: X(b.x), y: Y(b.y) }], { color: P.mark, width: 1.6 });
      L.add(T`${tr(Math.abs(f.yA - f.yB))} [m] "apart"`, X(a.x) + 12, (Y(a.y) + Y(b.y)) / 2, { color: P.mark, align: 'left', pri: 8, size: 13, weight: 700 });
    }
  }
  // ── each ball and its velocity
  for (const [pos, vel, t0, t1, c] of [[f.posB, f.velB, f.B.t0, tB1, P.second], [f.posA, f.velA, 0, tA1, P.vel]]) {
    const q = pos(t), v = vel(t);
    if (show.velocity !== false && t > t0 && t < t1) {
      const vl = 2.2;
      if (show.components) { arrow(g, X(q.x), Y(q.y), X(q.x) + v.x * vl, Y(q.y), { color: P.velVec, width: 2, head: 8, dash: [5, 4] }); arrow(g, X(q.x) + v.x * vl, Y(q.y), X(q.x) + v.x * vl, Y(q.y) - v.y * vl, { color: P.velVec, width: 2, head: 8 }); }
      arrow(g, X(q.x), Y(q.y), X(q.x) + v.x * vl, Y(q.y) - v.y * vl, { color: c, width: 2.6, head: 10 });
    }
    dot(g, X(q.x), Y(q.y), 6, { fill: P.card, stroke: c, width: 2.2 });
  }
  L.draw(g, w, h);
  return null;
}
