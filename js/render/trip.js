// trip.js — the stage for a velocity–time graph of straight segments,
// forwards and back: a car driven along a road, its driver walking back to a
// shop, waiting, and jogging back to the car.
//
// Two pictures sharing the clock, as for the journey:
//   · ABOVE, the (t, v) graph itself — the six straight lines a paper draws —
//     with the area under it shaded up to now: above the axis is forwards,
//     below it is back. The segment the clock is in is drawn strongly.
//   · BELOW, the road at one scale: the car while it is driven, then parked;
//     the driver, on foot, from the car to the shop and back; the shop where
//     the driver stops. Velocity along the road is dashed (rule 2).
//
// Everything drawn is read from js/core/trip.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, fmt, withAlpha } from './util.js';
import { car, runner, roadway, phaseFor } from './figures.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

/** A small shopfront standing on the road edge at x, its door at x. */
export function shopfront(g, x, Y, H, P) {
  const w = H * 1.3;
  g.save();
  g.fillStyle = P.card; g.strokeStyle = P.strong; g.lineWidth = 1.6;
  g.fillRect(x - w / 2, Y - H, w, H); g.strokeRect(x - w / 2, Y - H, w, H);
  g.fillStyle = withAlpha(P.strong, 0.18); g.fillRect(x - w / 2 - 3, Y - H - 6, w + 6, 8);
  g.fillStyle = withAlpha(P.faint, 0.35); g.fillRect(x - w / 2 + 5, Y - H * 0.7, w * 0.32, H * 0.4);
  g.strokeRect(x - H * 0.13, Y - H * 0.62, H * 0.26, H * 0.62);
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'trip') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const S = f.S;

  // ── the graph, top right of the readouts
  const gx0 = Math.min(w * 0.5, HUD + 40), gx1 = w - 30, gy0 = 50, gy1 = Math.max(gy0 + 120, h * 0.48);
  const vs = S.flatMap((s) => [s.v0, s.v1, 0]);
  const vHi = Math.max(...vs) * 1.15 + 0.5, vLo = Math.min(...vs) * 1.15 - (Math.min(...vs) < 0 ? 0.5 : 0);
  const X = (tt) => gx0 + (tt / f.tMax) * (gx1 - gx0), V = (v) => gy1 - ((v - vLo) / (vHi - vLo)) * (gy1 - gy0);
  // the area up to now, forwards and back
  for (const s of S) {
    const a = s.t0, b = Math.min(s.t1, t);
    if (b <= a) continue;
    const vb = s.v0 + s.a * (b - s.t0);
    g.save(); g.fillStyle = withAlpha(P.disp, (s.v0 + vb) >= 0 ? 0.22 : 0.12);
    g.beginPath(); g.moveTo(X(a), V(0)); g.lineTo(X(a), V(s.v0)); g.lineTo(X(b), V(vb)); g.lineTo(X(b), V(0)); g.closePath(); g.fill(); g.restore();
  }
  stroke(g, [{ x: gx0, y: V(0) }, { x: gx1, y: V(0) }], { color: P.axis, width: 1.8 });
  stroke(g, [{ x: gx0, y: gy0 }, { x: gx0, y: gy1 }], { color: P.axis, width: 1.8 });
  L.add(T`v [m s^-1]`, gx0 - 8, gy0 - 10, { color: P.muted, align: 'left', pri: 4, size: 13, bg: false });
  L.add(T`t [s]`, gx1, V(0) + 16, { color: P.muted, align: 'right', pri: 4, size: 13, bg: false });
  const vstep = niceStep(vHi - vLo, 5);
  for (let v = Math.ceil(vLo / vstep) * vstep; v <= vHi; v += vstep) {
    if (Math.abs(v) < 1e-9) continue;
    L.add(fmt(v, vstep < 1 ? 1 : 0), gx0 - 8, V(v), { color: P.faint, align: 'right', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  // the segments, each straight; a jump between two is a gap, never a line
  for (const s of S) {
    const on = t >= s.t0 - 1e-9 && t <= s.t1 + 1e-9;
    stroke(g, [{ x: X(s.t0), y: V(s.v0) }, { x: X(s.t1), y: V(s.v1) }], { color: P.vel, width: on ? 3 : 2, alpha: t >= s.t0 ? 1 : 0.4, dash: [6, 4] });
    if (s.found) L.add(T`t_${s.i} = ${tr(s.t)} [s]`, (X(s.t0) + X(s.t1)) / 2, V(Math.max(s.v0, s.v1, 0)) - 14, { color: P.mark, align: 'center', pri: 7, size: 13, weight: 700 });
  }
  stroke(g, [{ x: X(t), y: gy0 }, { x: X(t), y: gy1 }], { color: P.muted, width: 1.4, dash: [4, 4] });
  dot(g, X(t), V(f.vel(t)), 4.5, { fill: P.surface, stroke: P.vel, width: 2.2 });

  // ── the road, below: one scale for the whole trip
  const xs = S.flatMap((s) => [s.x0, s.x1]), xLo = Math.min(0, ...xs), xHi = Math.max(...xs, 1);
  const rl = 40, rr = w - 40, ry = h - 70;
  const k = (rr - rl) / ((xHi - xLo) || 1);
  const R = (x) => rl + (x - xLo) * k;
  roadway(g, 0, w, ry, P);
  const step = niceStep(xHi - xLo, 8);
  for (let x = Math.ceil(xLo / step) * step; x <= xHi; x += step) L.add(`${fmt(x, 0)} m`, R(x), ry + 30, { color: P.faint, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });

  // where the car is: moving while it is driven, then parked where it stopped
  const carSegs = S.filter((s) => s.who !== 'foot');
  const parkT = carSegs.length ? carSegs[carSegs.length - 1].t1 : 0;
  const carX = f.pos(Math.min(t, parkT));
  // a stop on foot is at a shop
  for (const s of S.filter((x) => x.who === 'foot' && Math.abs(x.v0) + Math.abs(x.v1) < 1e-9)) shopfront(g, R(s.x0), ry, 34, P);
  const carL = 64;
  car(g, R(carX) + carL * 0.5, ry, carL, P, { dir: 1, phase: phaseFor('car', carL, R(carX) - R(0)) });
  if (t > parkT + 1e-9 || (t >= parkT - 1e-9 && S.some((s) => s.who === 'foot'))) {
    const px = f.pos(t), pv = f.vel(t);
    const inside = S.some((s) => s.who === 'foot' && Math.abs(s.v0) + Math.abs(s.v1) < 1e-9 && t > s.t0 + 1e-9 && t < s.t1 - 1e-9);
    if (!inside) runner(g, R(px), ry, 34, P, { dir: pv < 0 ? -1 : 1, still: Math.abs(pv) < 1e-9, phase: phaseFor('runner', 34, Math.abs(R(px) - R(f.pos(parkT)))) });
    else L.add('in the shop', R(px), ry - 50, { color: P.ink, align: 'center', pri: 6, size: 13 });
  }
  // velocity along the road, dashed
  const v = f.vel(t), x = f.pos(t);
  if (show.velocity !== false && Math.abs(v) > 1e-6) {
    const vMax = Math.max(...S.flatMap((s) => [Math.abs(s.v0), Math.abs(s.v1)]), 1e-6);
    arrow(g, R(x), ry - 44, R(x) + (v / vMax) * 70, ry - 44, { color: P.velVec, width: 2.6, head: 10, dash: [6, 4] });
    L.add(T`${tr(Math.abs(v), 2)} [m s^-1]`, R(x) + (v / vMax) * 70 + (v > 0 ? 8 : -8), ry - 44, { color: P.vel, align: v > 0 ? 'left' : 'right', pri: 7, size: 14, weight: 700 });
  }
  L.draw(g, w, h);
  return null;
}
