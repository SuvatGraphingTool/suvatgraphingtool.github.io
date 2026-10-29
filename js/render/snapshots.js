// snapshots.js — the stage for a particle moving in a plane, known from two
// moments: the plane seen from above at one scale both ways, i east and j
// north, O, the grid and a north arrow.
//
// Its path — a curve, its acceleration not along its velocity — faintly in
// full and strongly so far, in the displacement hue; the puck where it is now
// with its velocity (vel hue) and its acceleration (acc hue). The second moment
// the paper gives is marked with its time; where the acceleration changes the
// path turns a new way and is marked so; each moment asked about is ringed.
//
// Everything drawn is read from js/core/snapshots.js (rule 4).

import { fieldFromAbove } from './scenery.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, fmt, withAlpha } from './util.js';
import { puck } from './collide.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'snapshots') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the frame: the path and O, one scale both ways
  const n = 160, pts = [];
  for (let i = 0; i <= n; i++) pts.push(f.pos((i / n) * f.tMax));
  const all = [...pts, { x: 0, y: 0 }];
  let x0 = Math.min(...all.map((p) => p.x)), x1 = Math.max(...all.map((p) => p.x)), y0 = Math.min(...all.map((p) => p.y)), y1 = Math.max(...all.map((p) => p.y));
  const span = Math.max(x1 - x0, y1 - y0, 1);
  x0 -= span * 0.12; x1 += span * 0.12; y0 -= span * 0.12; y1 += span * 0.12;
  const left = w < 520 ? 16 : HUD + 30, right = w - 60, top = 50, bottom = h - 40;
  const k = Math.min((right - left) / (x1 - x0), (bottom - top) / (y1 - y0));
  const ox = left + ((right - left) - (x1 - x0) * k) / 2, oy = top + ((bottom - top) - (y1 - y0) * k) / 2;
  const X = (x) => ox + (x - x0) * k, Y = (y) => oy + (y1 - y) * k;

  // ── the plane, its grid, the axes through O, north
  fieldFromAbove(g, X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k);
  const step = niceStep(Math.max(x1 - x0, y1 - y0), 8), dp = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
    stroke(g, [{ x: X(x), y: Y(y0) }, { x: X(x), y: Y(y1) }], { color: P.grid, width: 1 });
    if (Math.abs(x) > 1e-9) L.add(fmt(x, dp), X(x), Y(0) + 14, { color: P.faint, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
    stroke(g, [{ x: X(x0), y: Y(y) }, { x: X(x1), y: Y(y) }], { color: P.grid, width: 1 });
    if (Math.abs(y) > 1e-9) L.add(fmt(y, dp), X(0) - 8, Y(y), { color: P.faint, align: 'right', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  stroke(g, [{ x: X(x0), y: Y(0) }, { x: X(x1), y: Y(0) }], { color: P.axis, width: 1.6 });
  stroke(g, [{ x: X(0), y: Y(y0) }, { x: X(0), y: Y(y1) }], { color: P.axis, width: 1.6 });
  L.add('O', X(0) - 10, Y(0) + 14, { color: P.ink, align: 'right', pri: 6, size: 15, weight: 700, bg: false });
  const cx = w - 30, cy = h - 70;
  arrow(g, cx, cy + 20, cx, cy - 20, { color: P.strong, width: 2, head: 9 });
  L.add('N', cx, cy - 32, { color: P.strong, align: 'center', pri: 6, size: 15, weight: 700, bg: false });

  // ── the path, faint in full and strong so far
  stroke(g, pts.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.disp, width: 1.6, alpha: 0.3 });
  const so = []; for (let i = 0; i <= 80; i++) so.push(f.pos((i / 80) * t));
  stroke(g, so.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.disp, width: 2.8 });

  // ── the second moment (and where the acceleration changes), and the asked moments
  if (f.T != null && t >= f.T - 1e-9) {
    const q = f.pos(f.T);
    dot(g, X(q.x), Y(q.y), 6, { fill: P.card, stroke: P.strong, width: 2.2 });
    L.add(`${T`t = ${tr(f.T)} [s]`}${f.switched ? ', the acceleration changes' : ''}`, X(q.x) + 12, Y(q.y) + 16, { color: P.strong, align: 'left', pri: 7, size: 13, weight: 700 });
  }
  for (const m of f.marks) {
    if (t < m.t - 1e-9) continue;
    const q = f.pos(m.t);
    dot(g, X(q.x), Y(q.y), 9, { stroke: P.mark, width: 2.4 });
    L.add(m.what === 'asked' ? T`t = ${tr(m.t)} [s]` : T`"moving ${m.what}," t = ${tr(m.t)} [s]`, X(q.x) + 14, Y(q.y) - 16, { color: P.mark, align: 'left', pri: 8, size: 14, weight: 700 });
  }

  // ── the puck, its velocity and its acceleration
  const q = f.pos(t), v = f.vel(t), a = f.acc(t);
  const vMax = Math.max(...[0, f.tMax].map((tt) => Math.hypot(f.vel(tt).x, f.vel(tt).y)), 1e-6);
  if (show.velocity !== false && Math.hypot(v.x, v.y) > 1e-9) {
    const ex = X(q.x) + (v.x / vMax) * 70, ey = Y(q.y) - (v.y / vMax) * 70;
    arrow(g, X(q.x), Y(q.y), ex, ey, { color: P.velVec, width: 2.6, head: 10 });
    L.add(T`${tr(Math.hypot(v.x, v.y), 2)} [m s^-1]`, ex + 8, ey, { color: P.vel, align: 'left', pri: 7, size: 13, weight: 700 });
  }
  if (show.acceleration && Math.hypot(a.x, a.y) > 1e-9) {
    const am = Math.hypot(a.x, a.y);
    arrow(g, X(q.x), Y(q.y), X(q.x) + (a.x / am) * 40, Y(q.y) - (a.y / am) * 40, { color: P.acc, width: 2.2, head: 9 });
  }
  puck(g, X(q.x), Y(q.y), 8, P.disp, P);
  L.add('P', X(q.x) - 12, Y(q.y) - 14, { color: P.ink, align: 'right', pri: 9, size: 15, weight: 700 });
  L.draw(g, w, h);
  return null;
}
