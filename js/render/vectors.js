// vectors.js — the stage for a particle moving in a plane, in i and j.
//
// A map, seen from above: i to the east, j to the north, metres on both axes
// at one scale so a direction on the screen is the direction on the paper.
// The origin O, the path already travelled (in the path colour), the particle,
// its position vector from O (displacement, solid — it is a vector, not a
// component), its velocity as an arrow with — when asked for — its two
// components, i dashed and j solid as everywhere on this site (rule 2), and
// its acceleration, which never changes. Each moment a question asked about
// is ringed on the path once the clock reaches it, with the engine's time.
//
// Everything drawn is read from js/core/plane.js (rule 4).

import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 2) => num(x, p, { trim: true });
const HUD = 250;              // the readouts' column, top left

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'plane') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const answers = (f.answers || []).filter((a) => a.ok);

  // ── the frame: the whole path, the origin and every answer, one scale both ways
  const pts = f.path(160);
  const xs = [0, ...pts.map((p) => p.x)], ys = [0, ...pts.map((p) => p.y)];
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const span = Math.max(x1 - x0, y1 - y0, 1);
  x0 -= span * 0.12; x1 += span * 0.12; y0 -= span * 0.12; y1 += span * 0.12;
  const left = HUD + 30, right = w - 40, top = 56, bottom = h - 46;
  const k = Math.min((right - left) / (x1 - x0), (bottom - top) / (y1 - y0));
  const ox = left + ((right - left) - (x1 - x0) * k) / 2, oy = top + ((bottom - top) - (y1 - y0) * k) / 2;
  const X = (x) => ox + (x - x0) * k, Y = (y) => oy + (y1 - y) * k;

  // ── the grid, the axes through O, and north
  const step = niceStep(Math.max(x1 - x0, y1 - y0), 8);
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
    stroke(g, [{ x: X(x), y: Y(y0) }, { x: X(x), y: Y(y1) }], { color: P.grid, width: 1 });
    if (Math.abs(x) > 1e-9) L.add(fmt(x, step < 1 ? 1 : 0), X(x), Y(0) + 14, { color: P.faint, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
    stroke(g, [{ x: X(x0), y: Y(y) }, { x: X(x1), y: Y(y) }], { color: P.grid, width: 1 });
    if (Math.abs(y) > 1e-9) L.add(fmt(y, step < 1 ? 1 : 0), X(0) - 8, Y(y), { color: P.faint, align: 'right', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  stroke(g, [{ x: X(x0), y: Y(0) }, { x: X(x1), y: Y(0) }], { color: P.axis, width: 1.8 });
  stroke(g, [{ x: X(0), y: Y(y0) }, { x: X(0), y: Y(y1) }], { color: P.axis, width: 1.8 });
  L.add(T`vec(i) [m]`, X(x1) - 4, Y(0) - 14, { color: P.muted, align: 'right', pri: 5, size: 15, bg: false });
  L.add(T`vec(j) [m]`, X(0) + 8, Y(y1) + 12, { color: P.muted, align: 'left', pri: 5, size: 15, bg: false });
  L.add('O', X(0) - 10, Y(0) + 14, { color: P.ink, align: 'right', pri: 7, size: 15, weight: 700, bg: false });
  // the compass, bottom right, clear of the clock: north is up the page, as j is
  const cx = w - 60, cy = h - 80;
  arrow(g, cx, cy + 22, cx, cy - 22, { color: P.strong, width: 2, head: 9 });
  L.add('N', cx, cy - 36, { color: P.strong, align: 'center', pri: 6, size: 15, weight: 700, bg: false });

  // ── the path: all of it faintly, the part flown strongly
  stroke(g, pts.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 1.6, dash: [3, 4], alpha: 0.45 });
  const flown = f.path(120, t).map((p) => ({ x: X(p.x), y: Y(p.y) }));
  stroke(g, flown, { color: P.vel, width: 2.6 });

  // ── each answer, once the clock has reached it
  for (const a of answers) {
    for (const ta of a.times || [a.t]) {
      if (t < ta - 1e-9) continue;
      const r = f.r(ta);
      dot(g, X(r.x), Y(r.y), 7.5, { stroke: P.mark, width: 2.4 });
      L.add(T`t = ${tr(ta, 3)} [s]`, X(r.x) + 12, Y(r.y) - 14, { color: P.mark, align: 'left', pri: 8, size: 14, weight: 700 });
      if (a.kind === 'due') stroke(g, [{ x: X(0), y: Y(0) }, { x: X(r.x), y: Y(r.y) }], { color: P.mark, width: 1.6, dash: [5, 4] });
    }
  }

  // ── where it is now: position from O, velocity, acceleration
  const r = f.r(t), v = f.vel(t), A = f.a;
  const px = X(r.x), py = Y(r.y);
  if (Math.hypot(r.x, r.y) * k > 12) {
    arrow(g, X(0), Y(0), px, py, { color: P.disp, width: 2.4, head: 11 });
    L.add(T`vec r = ${tr(r.x)}vec(i) ${r.y < 0 ? '-' : '+'} ${tr(Math.abs(r.y))}vec(j)`, (X(0) + px) / 2, (Y(0) + py) / 2 - 14,
      { color: P.disp, align: 'center', pri: 6, size: 14, weight: 700 });
  }
  const sp = Math.hypot(v.x, v.y), vMax = Math.max(...pts.map((p) => Math.hypot(f.vel(p.t).x, f.vel(p.t).y)), 1e-6);
  const vl = clamp(w * 0.11, 60, 130) / vMax;
  if (show.velocity !== false && sp > 1e-6) {
    if (show.components) {
      arrow(g, px, py, px + v.x * vl, py, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, px + v.x * vl, py, px + v.x * vl, py - v.y * vl, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, px, py, px + v.x * vl, py - v.y * vl, { color: P.velVec, width: 3, head: 12 });
    L.add(T`${tr(sp)} [m s^-1]`, px + v.x * vl + 10 * Math.sign(v.x || 1), py - v.y * vl,
      { color: P.vel, align: v.x >= 0 ? 'left' : 'right', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) {
    const an = Math.hypot(A.x, A.y);
    if (an > 1e-9) {
      const al = 40 / an;
      arrow(g, px, py, px + A.x * al, py - A.y * al, { color: P.acc, width: 2.4, head: 10 });
    }
  }
  dot(g, px, py, 7, { fill: P.card, stroke: P.ink, width: 2.4 });

  L.draw(g, w, h);
  return null;
}
