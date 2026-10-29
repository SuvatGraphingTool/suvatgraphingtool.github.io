// clears.js — the stage for a projectile that just clears a wall and lands
// beyond it, every length a multiple of a.
//
// Side on at one scale both ways: sky and level ground, O where it is
// projected from, the angle marked, a brick wall whose top the path just
// grazes, and where it lands. Each length is a dimension line labelled twice —
// in the letter, as the paper gives it, and in metres, as the engine found it.
// The greatest height is marked at the top of the path. Velocity with its
// components (across dashed, up solid — rule 2).
//
// Backdrop pieces: sky and groundStrip from ./heights.js; `brickWall` is
// exported here. Everything drawn is read from js/core/clears.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha } from './util.js';
import { sky, groundStrip } from './heights.js';
import { kaLine } from '../core/clears.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

/** A brick wall standing on the ground at Y, centred on x, its top at `top`. */
export function brickWall(g, x, top, Y, wPx, P) {
  g.save();
  g.fillStyle = withAlpha('#a4553d', 0.85); g.fillRect(x - wPx / 2, top, wPx, Y - top);
  g.strokeStyle = withAlpha('#f1e6dc', 0.55); g.lineWidth = 1;
  const row = Math.max(5, Math.min(9, (Y - top) / 8));
  for (let y = Y - row, i = 0; y > top; y -= row, i++) {
    g.beginPath(); g.moveTo(x - wPx / 2, y); g.lineTo(x + wPx / 2, y); g.stroke();
    const off = i % 2 ? 0 : wPx / 2;
    g.beginPath(); g.moveTo(x - wPx / 2 + off, y); g.lineTo(x - wPx / 2 + off, y + row); g.stroke();
  }
  g.strokeStyle = P.strong; g.lineWidth = 1.6; g.strokeRect(x - wPx / 2, top, wPx, Y - top);
  g.restore();
}

/** A dimension line from (x0, y0) to (x1, y1) with end ticks, and its label. */
function dim(g, L, P, x0, y0, x1, y1, text, { align = 'center', dx = 0, dy = 0 } = {}) {
  const vert = Math.abs(x1 - x0) < 1;
  stroke(g, [{ x: x0, y: y0 }, { x: x1, y: y1 }], { color: P.ink, width: 1.2, alpha: 0.8 });
  for (const [x, y] of [[x0, y0], [x1, y1]]) stroke(g, vert ? [{ x: x - 5, y }, { x: x + 5, y }] : [{ x, y: y - 5 }, { x, y: y + 5 }], { color: P.ink, width: 1.2, alpha: 0.8 });
  L.add(text, (x0 + x1) / 2 + dx, (y0 + y1) / 2 + dy, { color: P.ink, align, pri: 7, size: 14, weight: 700 });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'clears') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const a = f.a, xLand = f.R * a, W = f.wall;

  // ── the frame: O to past the landing, up to above the top; one scale both ways
  const xLo = -xLand * 0.06, xHi = xLand * 1.06, yHi = Math.max(f.Hmax, W.H) * 1.3;
  const left = w < 520 ? 16 : HUD + 30, right = w - 120, top = 60, bottom = h - 70;
  const k = Math.min((right - left) / (xHi - xLo), (bottom - top) / yHi);
  const ox = left + ((right - left) - (xHi - xLo) * k) / 2 - xLo * k, oy = bottom;
  const X = (x) => ox + x * k, Y = (y) => oy - y * k;

  sky(g, 0, 0, w, oy);
  groundStrip(g, 0, w, oy, h);
  brickWall(g, X(W.x), Y(W.H), oy, Math.max(10, Math.min(22, xLand * 0.025 * k)), P);
  L.add('O', X(0) - 8, oy + 14, { color: P.ink, align: 'right', pri: 8, size: 15, weight: 700, bg: false });

  // ── the lengths, in the letter and in metres
  const both = (c, m) => T`${kaLine(c)} = ${tr(m)} [m]`;
  dim(g, L, P, X(0), oy + 24, X(W.x), oy + 24, both(f.P, W.x), { dy: 16 });
  dim(g, L, P, X(W.x), oy + 24, X(xLand), oy + 24, both(f.R - f.P, xLand - W.x), { dy: 16 });
  const hx = X(W.x) - Math.max(16, Math.min(30, xLand * 0.02 * k)) - 8;
  dim(g, L, P, hx, oy, hx, Y(W.H), both(f.Q, W.H), { align: 'right', dx: -8 });

  // ── the path: all of it faintly, flown strongly; the top ringed
  const n = 160, pts = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pts.push({ t: tt, ...f.pos(tt) }); }
  stroke(g, pts.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 1.6, alpha: 0.3 });
  stroke(g, pts.filter((p) => p.t <= t).map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 2.8 });
  if (t >= f.tWall - 1e-9) {
    dot(g, X(W.x), Y(W.H), 7, { stroke: P.mark, width: 2.2 });
    L.add('just clears', X(W.x) + 12, Y(W.H) - 14, { color: P.mark, align: 'left', pri: 7, size: 13, weight: 700 });
  }
  if (show.apex !== false && t >= f.tApex - 1e-9) {
    const ax = X(f.pos(f.tApex).x), ay = Y(f.Hmax);
    dot(g, ax, ay, 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H = ${tr(f.Hmax)} [m]`, ax, ay - 16, { color: P.disp, align: 'center', pri: 7, size: 14, weight: 700 });
  }

  // ── the angle at O
  const th = f.params.theta * Math.PI / 180, Ra = 40;
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 1.6; g.beginPath(); g.arc(X(0), oy, Ra, -th, 0); g.stroke(); g.restore();
  L.add(T`theta = ${tr(f.params.theta)}°`, X(0) + Ra + 8, oy - 14, { color: P.strong, align: 'left', pri: 7, size: 14, weight: 700 });

  // ── the ball, its velocity and its acceleration
  const q = f.pos(t), v = f.vel(t), bx = X(q.x), by = Y(q.y);
  const vl = clamp(w * 0.08, 46, 100) / f.params.u;
  if (show.velocity !== false) {
    if (show.components) {
      arrow(g, bx, by, bx + v.x * vl, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      if (Math.abs(v.y) * vl > 4) arrow(g, bx + v.x * vl, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, bx, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 3, head: 12 });
    L.add(T`${tr(Math.hypot(v.x, v.y), 2)} [m s^-1]`, bx + v.x * vl + 12, by - v.y * vl, { color: P.vel, align: 'left', pri: 6, size: 14, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
  dot(g, bx, by, 6, { fill: P.card, stroke: P.ink, width: 2.2 });
  L.draw(g, w, h);
  return null;
}
