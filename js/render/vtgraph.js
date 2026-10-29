// vtgraph.js — the stage for a velocity–time graph of straight pieces.
//
// Two pictures on one clock:
//   · ABOVE, the (t, v) graph as the paper draws it — the pieces in the
//     velocity hue, dashed (along the line, rule 2); the area under it shaded
//     up to now in the displacement hue, stronger above the axis (forwards)
//     than below (back); the steepest piece drawn heavier; the time now a
//     dashed upright; each moment it is back where it started ringed.
//   · BELOW, the line it moves on at one scale, its start O, and the object
//     where it is now, with its velocity.
//
// Everything drawn is read from js/core/vtgraph.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, fmt, withAlpha } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'vt') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the graph, right of the readouts
  const vs = f.P.map((p) => p.v), vHi = Math.max(...vs, 0), vLo = Math.min(...vs, 0), pad = (vHi - vLo || 1) * 0.15;
  const gx0 = Math.min(w * 0.45, HUD + 50), gx1 = w - 30, gy0 = 50, gy1 = Math.max(gy0 + 140, h * 0.56);
  const X = (tt) => gx0 + (tt / f.tMax) * (gx1 - gx0), V = (v) => gy1 - ((v - (vLo - pad)) / (vHi - vLo + 2 * pad)) * (gy1 - gy0);
  for (const s of f.S) {
    const b = Math.min(s.t1, t); if (b <= s.t0) continue;
    const vb = s.v0 + s.a * (b - s.t0);
    g.save(); g.fillStyle = withAlpha(P.disp, s.v0 + vb >= 0 ? 0.24 : 0.12);
    g.beginPath(); g.moveTo(X(s.t0), V(0)); g.lineTo(X(s.t0), V(s.v0)); g.lineTo(X(b), V(vb)); g.lineTo(X(b), V(0)); g.closePath(); g.fill(); g.restore();
  }
  stroke(g, [{ x: gx0, y: V(0) }, { x: gx1, y: V(0) }], { color: P.axis, width: 1.8 });
  stroke(g, [{ x: gx0, y: gy0 }, { x: gx0, y: gy1 }], { color: P.axis, width: 1.8 });
  L.add(T`v [m s^-1]`, gx0 - 8, gy0 - 12, { color: P.muted, align: 'left', pri: 4, size: 13, bg: false });
  L.add(T`t [s]`, gx1, V(0) + 16, { color: P.muted, align: 'right', pri: 4, size: 13, bg: false });
  const vstep = niceStep(vHi - vLo + 2 * pad, 6);
  for (let v = Math.ceil((vLo - pad) / vstep) * vstep; v <= vHi + pad; v += vstep) if (Math.abs(v) > 1e-9) L.add(fmt(v, vstep < 1 ? 1 : 0), gx0 - 8, V(v), { color: P.faint, align: 'right', pri: 1, size: 13, bg: false, maxPush: 0 });
  for (const s of f.S) {
    const steep = f.steep.includes(s.i);
    stroke(g, [{ x: X(s.t0), y: V(s.v0) }, { x: X(s.t1), y: V(s.v1) }], { color: P.vel, width: steep ? 3.4 : 2.2, alpha: t >= s.t0 ? 1 : 0.45, dash: [6, 4] });
    if (steep) L.add(T`a = ${tr(s.a)} [m s^-2]`, (X(s.t0) + X(s.t1)) / 2 + 10, (V(s.v0) + V(s.v1)) / 2, { color: P.acc, align: 'left', pri: 6, size: 13, weight: 700 });
  }
  for (const p of f.P.slice(1)) L.add(fmt(p.t, Number.isInteger(p.t) ? 0 : 2), X(p.t), V(0) + (p.v >= 0 ? 16 : -12), { color: P.faint, align: 'center', pri: 2, size: 13, bg: false });
  for (const tz of f.times) if (t >= tz - 1e-9) { dot(g, X(tz), V(0), 7, { stroke: P.mark, width: 2.2 }); L.add(T`t = ${tr(tz)} [s]`, X(tz), V(0) - 18, { color: P.mark, align: 'center', pri: 8, size: 13, weight: 700 }); }
  stroke(g, [{ x: X(t), y: gy0 }, { x: X(t), y: gy1 }], { color: P.muted, width: 1.4, dash: [4, 4] });
  dot(g, X(t), V(f.vel(t)), 4.5, { fill: P.surface, stroke: P.vel, width: 2.2 });

  // ── the line below, at one scale, with O and the object
  let xLo = 0, xHi = 0; for (let i = 0; i <= 200; i++) { const x = f.pos((i / 200) * f.tMax); xLo = Math.min(xLo, x); xHi = Math.max(xHi, x); }
  const ly = h - 60, ll = 40, lr = w - 40, k = (lr - ll) / ((xHi - xLo) || 1), R = (x) => ll + (x - xLo) * k;
  stroke(g, [{ x: 0, y: ly }, { x: w, y: ly }], { color: P.axis, width: 2 });
  const step = niceStep(xHi - xLo, 8);
  for (let x = Math.ceil(xLo / step) * step; x <= xHi + 1e-9; x += step) {
    stroke(g, [{ x: R(x), y: ly - 4 }, { x: R(x), y: ly + 4 }], { color: P.faint, width: 1 });
    L.add(Math.abs(x) < 1e-9 ? 'O, the start' : `${fmt(x, step < 1 ? 1 : 0)} m`, R(x), ly + 18, { color: Math.abs(x) < 1e-9 ? P.ink : P.faint, align: 'center', pri: Math.abs(x) < 1e-9 ? 7 : 1, size: 13, weight: Math.abs(x) < 1e-9 ? 700 : 400, bg: false, maxPush: 0 });
  }
  const x = f.pos(t), v = f.vel(t);
  if (show.velocity !== false && Math.abs(v) > 1e-9) {
    const vMax = Math.max(...vs.map(Math.abs), 1e-6), len = Math.max(0, Math.min(70, v > 0 ? w - 30 - R(x) : R(x) - 30)) * Math.sign(v) * Math.abs(v) / vMax;
    arrow(g, R(x), ly - 26, R(x) + len, ly - 26, { color: P.velVec, width: 2.6, head: 10, dash: [6, 4] });
    L.add(T`${tr(v, 2)} [m s^-1]`, R(x) + len + (v > 0 ? 8 : -8), ly - 26, { color: P.vel, align: v > 0 ? 'left' : 'right', pri: 7, size: 13, weight: 700 });
  }
  dot(g, R(x), ly - 8, 7, { fill: P.card, stroke: P.ink, width: 2.2 });
  L.draw(g, w, h);
  return null;
}
