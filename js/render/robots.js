// robots.js — the stage for two robots on a square floor, seen from above at
// one scale both ways: the floor tiled every few metres, its corners A, B, C,
// D (i along AB, j along AD), its centre O.
//
// Each robot is drawn from above — a rounded body with two wheels, turned the
// way it moves — with its letter: R in the quantity's hue, S in the
// second-object stone; its track faintly to the floor's edge and strongly so
// far. The vector from S to R now is drawn in the marker colour with its
// length; where they are closest is ringed on both, with the time and the
// distance.
//
// Everything drawn is read from js/core/robots.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

/** A robot from above at (x, y), facing angle a (radians, screen), size s. */
export function robotTop(g, x, y, s, a, color, P) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = P.strong; for (const sy of [-1, 1]) g.fillRect(-s * 0.35, sy * s * 0.55 - s * 0.12, s * 0.7, s * 0.24);
  g.fillStyle = P.card; g.strokeStyle = color; g.lineWidth = 2.2;
  g.beginPath(); g.roundRect(-s * 0.5, -s * 0.45, s, s * 0.9, s * 0.2); g.fill(); g.stroke();
  g.fillStyle = color; g.beginPath(); g.arc(s * 0.28, 0, s * 0.12, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'robots') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const half = f.side / 2;

  // ── the floor, square, centred on O
  const left = w < 520 ? 16 : HUD + 30, right = w < 520 ? w - 16 : w - 150, top = 40, bottom = h - 40;   // clear of the readouts both sides
  const k = Math.min((right - left) / (f.side * 1.16), (bottom - top) / (f.side * 1.16));
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const X = (x) => cx + x * k, Y = (y) => cy - y * k;
  g.save(); g.fillStyle = withAlpha('#c8bfae', 0.28); g.fillRect(X(-half), Y(half), f.side * k, f.side * k); g.restore();
  const step = niceStep(f.side, 10);
  for (let v = -half + step; v < half - 1e-9; v += step) {
    stroke(g, [{ x: X(v), y: Y(-half) }, { x: X(v), y: Y(half) }], { color: P.grid, width: 1 });
    stroke(g, [{ x: X(-half), y: Y(v) }, { x: X(half), y: Y(v) }], { color: P.grid, width: 1 });
  }
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 2; g.strokeRect(X(-half), Y(half), f.side * k, f.side * k); g.restore();
  for (const [n, x, y, ax, ay] of [['A', -half, -half, -1, 1], ['B', half, -half, 1, 1], ['C', half, half, 1, -1], ['D', -half, half, -1, -1]])
    L.add(n, X(x) + ax * 12, Y(y) + ay * 12, { color: P.ink, align: 'center', pri: 7, size: 15, weight: 700, bg: false });
  dot(g, X(0), Y(0), 3, { fill: P.ink, stroke: P.ink, width: 1 });
  L.add('O', X(0) - 10, Y(0) + 12, { color: P.ink, align: 'right', pri: 6, size: 14, weight: 700, bg: false });
  L.add(T`${tr(f.side)} [m]`, (X(-half) + X(half)) / 2, Y(-half) + 26, { color: P.ink, align: 'center', pri: 6, size: 13, weight: 700, bg: false });

  // ── each track, and the robot where it is
  const each = [[f.posA, f.A.v, P.vel, 'R'], [f.posB, f.B.v, P.second, 'S']];
  for (const [pos, v, c] of each) {
    const a = pos(0), b = pos(f.tMax), now = pos(t);
    stroke(g, [{ x: X(a.x), y: Y(a.y) }, { x: X(b.x), y: Y(b.y) }], { color: c, width: 1.6, alpha: 0.3 });
    stroke(g, [{ x: X(a.x), y: Y(a.y) }, { x: X(now.x), y: Y(now.y) }], { color: c, width: 2.8 });
  }
  // ── the vector from S to R now, and the closest moment
  const r = f.posA(t), s = f.posB(t);
  if (Math.hypot(r.x - s.x, r.y - s.y) * k > 16) {
    arrow(g, X(s.x), Y(s.y), X(r.x), Y(r.y), { color: P.mark, width: 1.6, head: 9, alpha: 0.85 });
    L.add(T`${tr(f.gap(t), 2)} [m]`, (X(r.x) + X(s.x)) / 2 + 8, (Y(r.y) + Y(s.y)) / 2 - 10, { color: P.mark, align: 'left', pri: 6, size: 13, weight: 700 });
  }
  if (!f.same && f.tc != null && f.tc <= f.tMax + 1e-9 && t >= f.tc - 1e-9) {
    const a = f.posA(f.tc), b = f.posB(f.tc);
    for (const q of [a, b]) dot(g, X(q.x), Y(q.y), 9, { stroke: P.mark, width: 2.2 });
    stroke(g, [{ x: X(a.x), y: Y(a.y) }, { x: X(b.x), y: Y(b.y) }], { color: P.mark, width: 1.4 });
    L.add(T`"closest," t = ${tr(f.tc)} [s], ${tr(f.dmin)} [m]`, (X(a.x) + X(b.x)) / 2 + 14, (Y(a.y) + Y(b.y)) / 2 + 18, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
  }
  for (const [pos, v, c, n] of each) {
    const q = pos(t), still = Math.hypot(v.x, v.y) < 1e-9;
    robotTop(g, X(q.x), Y(q.y), Math.max(16, Math.min(26, 2 * k)), still ? 0 : Math.atan2(-v.y, v.x), c, P);
    L.add(n, X(q.x) - 16, Y(q.y) - 16, { color: c, align: 'right', pri: 9, size: 15, weight: 700 });
  }
  L.draw(g, w, h);
  return null;
}
