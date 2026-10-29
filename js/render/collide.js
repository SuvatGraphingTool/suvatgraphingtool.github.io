// collide.js — the stage for two particles on a horizontal surface, each with
// its own constant acceleration: the surface seen from above at one scale both
// ways, i across and j up, O and the grid.
//
// Each particle is a small puck with its letter: its whole path faintly (each
// a curve, since its acceleration is not along its velocity), the part
// travelled strongly, and its velocity now as an arrow — A in the quantity's
// hue, B in the second-object stone. Where they collide is ringed with the
// time and the position vector; at an asked time, where each one is is marked.
//
// Everything drawn is read from js/core/collide.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, fmt, withAlpha } from './util.js';
import { vsrc } from '../core/plane.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

/** A puck seen from above at (x, y): a disc with a rim, its letter beside it. */
export function puck(g, x, y, r, color, P) {
  g.save(); g.fillStyle = withAlpha(color, 0.35); g.strokeStyle = color; g.lineWidth = 2.2;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = P.card; g.beginPath(); g.arc(x, y, r * 0.35, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'collide') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the frame: both paths and O, one scale both ways
  const n = 120, pa = [], pb = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pa.push(f.posA(tt)); pb.push(f.posB(tt)); }
  const all = [...pa, ...pb, { x: 0, y: 0 }];
  let x0 = Math.min(...all.map((p) => p.x)), x1 = Math.max(...all.map((p) => p.x)), y0 = Math.min(...all.map((p) => p.y)), y1 = Math.max(...all.map((p) => p.y));
  const span = Math.max(x1 - x0, y1 - y0, 1);
  x0 -= span * 0.1; x1 += span * 0.1; y0 -= span * 0.1; y1 += span * 0.1;
  const left = w < 520 ? 16 : HUD + 30, right = w - 40, top = 50, bottom = h - 40;
  const k = Math.min((right - left) / (x1 - x0), (bottom - top) / (y1 - y0));
  const ox = left + ((right - left) - (x1 - x0) * k) / 2, oy = top + ((bottom - top) - (y1 - y0) * k) / 2;
  const X = (x) => ox + (x - x0) * k, Y = (y) => oy + (y1 - y) * k;

  // ── the surface, its grid and the axes through O
  g.save(); g.fillStyle = withAlpha('#b9c7d1', 0.16); g.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k); g.restore();
  const step = niceStep(Math.max(x1 - x0, y1 - y0), 8);
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
    stroke(g, [{ x: X(x), y: Y(y0) }, { x: X(x), y: Y(y1) }], { color: P.grid, width: 1 });
    if (Math.abs(x) > 1e-9) L.add(fmt(x, step < 1 ? 1 : 0), X(x), Y(0) + 14, { color: P.faint, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
    stroke(g, [{ x: X(x0), y: Y(y) }, { x: X(x1), y: Y(y) }], { color: P.grid, width: 1 });
    if (Math.abs(y) > 1e-9) L.add(fmt(y, step < 1 ? 1 : 0), X(0) - 8, Y(y), { color: P.faint, align: 'right', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  stroke(g, [{ x: X(x0), y: Y(0) }, { x: X(x1), y: Y(0) }], { color: P.axis, width: 1.6 });
  stroke(g, [{ x: X(0), y: Y(y0) }, { x: X(0), y: Y(y1) }], { color: P.axis, width: 1.6 });
  L.add('O', X(0) - 10, Y(0) + 14, { color: P.ink, align: 'right', pri: 6, size: 15, weight: 700, bg: false });
  L.add(T`vec(i) [m]`, X(x1) - 4, Y(0) - 14, { color: P.muted, align: 'right', pri: 5, size: 14, bg: false });
  L.add(T`vec(j) [m]`, X(0) + 8, Y(y1) + 12, { color: P.muted, align: 'left', pri: 5, size: 14, bg: false });

  // ── each path, faint then strong to now; the asked time and the collision
  const track = (pts, pos, color) => {
    stroke(g, pts.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color, width: 1.6, alpha: 0.3 });
    const so = []; for (let i = 0; i <= 60; i++) so.push(pos((i / 60) * t));
    stroke(g, so.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color, width: 2.8 });
  };
  track(pb, f.posB, P.second); track(pa, f.posA, P.vel);
  if (f.at != null && t >= f.at - 1e-9) for (const [pos, c] of [[f.posA, P.vel], [f.posB, P.second]]) {
    const q = pos(f.at); dot(g, X(q.x), Y(q.y), 5, { fill: P.card, stroke: c, width: 2 });
    L.add(T`t = ${tr(f.at)} [s]`, X(q.x) + 10, Y(q.y) + 14, { color: c, align: 'left', pri: 6, size: 13, weight: 700 });
  }
  if (f.tc != null && t >= f.tc - 1e-9) {
    dot(g, X(f.where.x), Y(f.where.y), 11, { stroke: P.mark, width: 2.6 });
    L.add(T`"collide," t = ${tr(f.tc)} [s]`, X(f.where.x) + 16, Y(f.where.y) - 22, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
    L.add(T`(${vsrc(f.where)}) [m]`, X(f.where.x) + 16, Y(f.where.y) - 4, { color: P.mark, align: 'left', pri: 8, size: 13, weight: 700 });
  }

  // ── the pucks, with their velocity now
  const vMax = Math.max(...[0, f.tMax].flatMap((tt) => [f.velA(tt), f.velB(tt)]).map((v) => Math.hypot(v.x, v.y)), 1e-6);
  for (const [pos, vel, c, name] of [[f.posB, f.velB, P.second, 'B'], [f.posA, f.velA, P.vel, 'A']]) {
    const q = pos(t), v = vel(t);
    if (show.velocity !== false && Math.hypot(v.x, v.y) > 1e-9) arrow(g, X(q.x), Y(q.y), X(q.x) + (v.x / vMax) * 60, Y(q.y) - (v.y / vMax) * 60, { color: c, width: 2.4, head: 10 });
    puck(g, X(q.x), Y(q.y), 8, c, P);
    L.add(name, X(q.x) - 12, Y(q.y) - 14, { color: c, align: 'right', pri: 9, size: 15, weight: 700 });
  }
  L.draw(g, w, h);
  return null;
}
