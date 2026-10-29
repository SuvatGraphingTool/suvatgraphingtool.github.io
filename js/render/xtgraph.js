// xtgraph.js — the stage for a displacement–time graph of straight pieces.
//
// Two pictures on one clock, as for the trip:
//   · ABOVE, the (t, x) graph itself, as the paper draws it — the pieces in
//     the displacement hue and dashed (along the line, rule 2), the corners dotted, the corner found from the
//     speed marked T, the part after the last corner curving; the piece the
//     clock is in drawn strongly, and the time now a dashed upright.
//   · BELOW, the line the particle moves on at one scale, the fixed point A,
//     and the particle where it is now with its velocity (along the line:
//     dashed, rule 2).
//
// Everything drawn is read from js/core/xtgraph.js (rule 4).

import { landscape, paper, tarmac } from './scenery.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, fmt } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'xt') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the graph, right of the readouts
  const n = 200, xs = [];
  for (let i = 0; i <= n; i++) xs.push(f.pos((i / n) * f.tMax));
  const xHi = Math.max(...xs, 0), xLo = Math.min(...xs, 0), pad = (xHi - xLo || 1) * 0.12;
  landscape(g, w, h, h - 100, { far: 'trees', seed: 31 });
  const gx0 = Math.min(w * 0.45, HUD + 50), gx1 = w - 30, gy0 = 50, gy1 = Math.max(gy0 + 140, h * 0.56);
  paper(g, gx0 - 56, gy0 - 34, gx1 - gx0 + 76, gy1 - gy0 + 72);   // the graph on its sheet, clear of the scene behind
  const X = (tt) => gx0 + (tt / f.tMax) * (gx1 - gx0), V = (x) => gy1 - ((x - (xLo - pad)) / (xHi - xLo + 2 * pad)) * (gy1 - gy0);
  stroke(g, [{ x: gx0, y: V(0) }, { x: gx1, y: V(0) }], { color: P.axis, width: 1.8 });
  stroke(g, [{ x: gx0, y: gy0 }, { x: gx0, y: gy1 }], { color: P.axis, width: 1.8 });
  L.add(T`x [m]`, gx0 - 8, gy0 - 12, { color: P.muted, align: 'left', pri: 4, size: 13, bg: false });
  L.add(T`t [s]`, gx1, V(0) + 16, { color: P.muted, align: 'right', pri: 4, size: 13, bg: false });
  const xstep = niceStep(xHi - xLo + 2 * pad, 6);
  for (let x = Math.ceil((xLo - pad) / xstep) * xstep; x <= xHi + pad; x += xstep) if (Math.abs(x) > 1e-9) L.add(fmt(x, xstep < 1 ? 1 : 0), gx0 - 8, V(x), { color: P.faint, align: 'right', pri: 1, size: 13, bg: false, maxPush: 0 });
  for (const s of f.S) {
    const on = t >= s.t0 - 1e-9 && t <= s.t1 + 1e-9;
    stroke(g, [{ x: X(s.t0), y: V(s.x0) }, { x: X(s.t1), y: V(s.x1) }], { color: P.disp, width: on ? 3 : 2, alpha: t >= s.t0 ? 1 : 0.4, dash: [6, 4] });
  }
  for (const p of f.P.slice(1)) {
    dot(g, X(p.t), V(p.x), 3.5, { fill: P.card, stroke: P.disp, width: 1.8 });
    L.add(p.t === f.blank ? T`T = ${tr(p.t)}` : fmt(p.t, Number.isInteger(p.t) ? 0 : 2), X(p.t), V(0) + (p.x >= 0 ? 16 : -12), { color: p.t === f.blank ? P.mark : P.faint, align: 'center', pri: p.t === f.blank ? 8 : 2, size: 13, weight: p.t === f.blank ? 700 : 400, bg: false });
  }
  if (f.tail) {
    const pts = []; for (let i = 0; i <= 60; i++) { const tt = f.tEnd + (i / 60) * (f.tMax - f.tEnd); pts.push({ x: X(tt), y: V(f.pos(tt)) }); }
    stroke(g, pts, { color: P.disp, width: 2, alpha: t > f.tEnd ? 1 : 0.4, dash: [6, 4] });
    for (const ts of f.tail.ts || []) if (t >= ts - 1e-9) { dot(g, X(ts), V(f.pos(ts)), 7, { stroke: P.mark, width: 2.2 }); L.add(T`t = ${tr(ts)} [s]`, X(ts), V(f.pos(ts)) - 16, { color: P.mark, align: 'center', pri: 8, size: 13, weight: 700 }); }
  }
  for (const a of f.asked) if (a.v != null && t >= a.t - 1e-9) { dot(g, X(a.t), V(f.pos(a.t)), 6, { stroke: P.mark, width: 2 }); L.add(T`v = ${tr(a.v)}`, X(a.t) + 8, V(f.pos(a.t)) - 14, { color: P.vel, align: 'left', pri: 6, size: 13, weight: 700 }); }
  stroke(g, [{ x: X(t), y: gy0 }, { x: X(t), y: gy1 }], { color: P.muted, width: 1.4, dash: [4, 4] });
  dot(g, X(t), V(f.pos(t)), 4.5, { fill: P.surface, stroke: P.disp, width: 2.2 });

  // ── the line below, at one scale, with A and the particle
  const ly = h - 60, ll = 40, lr = w - 40, k = (lr - ll) / ((xHi - xLo) || 1), R = (x) => ll + (x - xLo) * k;
  tarmac(g, 0, w, ly, { depth: 14, verge: false });
  const step = niceStep(xHi - xLo, 8);
  for (let x = Math.ceil(xLo / step) * step; x <= xHi + 1e-9; x += step) {
    stroke(g, [{ x: R(x), y: ly - 4 }, { x: R(x), y: ly + 4 }], { color: P.faint, width: 1 });
    L.add(Math.abs(x) < 1e-9 ? 'A' : `${fmt(x, step < 1 ? 1 : 0)} m`, R(x), ly + 18, { color: Math.abs(x) < 1e-9 ? P.ink : P.faint, align: 'center', pri: Math.abs(x) < 1e-9 ? 7 : 1, size: 13, weight: Math.abs(x) < 1e-9 ? 700 : 400, bg: false, maxPush: 0 });
  }
  const x = f.pos(t), v = f.vel(t);
  if (show.velocity !== false && Math.abs(v) > 1e-9) {
    const vMax = Math.max(...f.S.map((s) => Math.abs(s.v)), ...(f.tail ? [Math.abs(f.vel(f.tMax))] : []), 1e-6);
    const len = Math.max(0, Math.min(70, v > 0 ? w - 30 - R(x) : R(x) - 30)) * Math.sign(v) * Math.min(1, Math.abs(v) / vMax);
    arrow(g, R(x), ly - 26, R(x) + len, ly - 26, { color: P.velVec, width: 2.6, head: 10, dash: [6, 4] });
    L.add(T`${tr(v, 2)} [m s^-1]`, R(x) + len + (v > 0 ? 8 : -8), ly - 26, { color: P.vel, align: v > 0 ? 'left' : 'right', pri: 7, size: 13, weight: 700 });
  } else L.add('at rest', R(x), ly - 26, { color: P.ink, align: 'center', pri: 6, size: 13 });
  dot(g, R(x), ly - 8, 7, { fill: P.card, stroke: P.ink, width: 2.2 });
  L.add('P', R(x), ly - 44, { color: P.ink, align: 'center', pri: 8, size: 15, weight: 700 });
  L.draw(g, w, h);
  return null;
}
