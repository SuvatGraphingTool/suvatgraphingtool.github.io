// twoplane.js — the stage for two moving in a plane: a map seen from above,
// i east and j north at one scale, sea for ships or sky for birds.
//
// Each one's whole track faintly and the part travelled strongly — A in the
// quantity's hue, B in the second-object stone — the ship or the bird where
// it is now, pointing the way it goes, with its letter. The vector between
// them (from B to A) is drawn in the marker colour, and at each moment the
// paper asks about it is ringed with the time. A north arrow; the grid.
//
// Everything drawn is read from js/core/twoplane.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, fmt, withAlpha } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

/** A ship seen from above, its bow at (x, y), heading at angle a (radians, screen). */
export function shipTop(g, x, y, s, a, color, P) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = P.card; g.strokeStyle = color; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-s * 0.35, -s * 0.28, -s, -s * 0.22); g.lineTo(-s, s * 0.22); g.quadraticCurveTo(-s * 0.35, s * 0.28, 0, 0);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = withAlpha(color, 0.35); g.fillRect(-s * 0.7, -s * 0.1, s * 0.3, s * 0.2);
  g.restore();
}
/** A lighthouse on the map, standing at (x, y): a tower with its light. */
export function lighthouse(g, x, y, color, P) {
  g.save(); g.fillStyle = P.card; g.strokeStyle = color; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x - 6, y + 4); g.lineTo(x - 3.5, y - 16); g.lineTo(x + 3.5, y - 16); g.lineTo(x + 6, y + 4); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = withAlpha('#f5c542', 0.9); g.beginPath(); g.arc(x, y - 19, 3.5, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = withAlpha('#f5c542', 0.6); g.lineWidth = 1.4;
  for (const a of [-0.5, 0.5, Math.PI - 0.5, Math.PI + 0.5]) { g.beginPath(); g.moveTo(x + Math.cos(a) * 6, y - 19 - Math.sin(a) * 6); g.lineTo(x + Math.cos(a) * 13, y - 19 - Math.sin(a) * 13); g.stroke(); }
  g.restore();
}
/** A bird seen from above, its head at (x, y), flying at angle a. */
export function birdTop(g, x, y, s, a, color) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.strokeStyle = color; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-s * 0.6, -s * 0.6); g.quadraticCurveTo(-s * 0.2, -s * 0.15, 0, 0); g.quadraticCurveTo(-s * 0.2, s * 0.15, -s * 0.6, s * 0.6); g.stroke();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-s * 0.7, 0); g.stroke();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'twoplane') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const birds = f.look === 'birds';

  // ── the frame: both whole tracks and O; one scale both ways
  const n = 80, ptsA = [], ptsB = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; ptsA.push(f.posA(tt)); ptsB.push(f.posB(tt)); }
  const all = [...ptsA, ...ptsB, { x: 0, y: 0 }];
  let x0 = Math.min(...all.map((p) => p.x)), x1 = Math.max(...all.map((p) => p.x)), y0 = Math.min(...all.map((p) => p.y)), y1 = Math.max(...all.map((p) => p.y));
  const span = Math.max(x1 - x0, y1 - y0, 1);
  x0 -= span * 0.12; x1 += span * 0.12; y0 -= span * 0.12; y1 += span * 0.12;
  const left = w < 520 ? 16 : HUD + 30, right = w - 40, top = 56, bottom = h - 40;
  const k = Math.min((right - left) / (x1 - x0), (bottom - top) / (y1 - y0));
  const ox = left + ((right - left) - (x1 - x0) * k) / 2, oy = top + ((bottom - top) - (y1 - y0) * k) / 2;
  const X = (x) => ox + (x - x0) * k, Y = (y) => oy + (y1 - y) * k;

  // ── the sea (or the sky), the grid, the axes through O
  g.save(); g.fillStyle = birds ? withAlpha('#9fb6c8', 0.18) : withAlpha('#6f8796', 0.18); g.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k); g.restore();
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
  L.add(T`vec(i) [${f.U.len}]`, X(x1) - 4, Y(0) - 14, { color: P.muted, align: 'right', pri: 5, size: 14, bg: false });
  L.add(T`vec(j) [${f.U.len}]`, X(0) + 8, Y(y1) + 12, { color: P.muted, align: 'left', pri: 5, size: 14, bg: false });
  const cx = w - 50, cy = h - 70;
  arrow(g, cx, cy + 20, cx, cy - 20, { color: P.strong, width: 2, head: 9 });
  L.add('N', cx, cy - 32, { color: P.strong, align: 'center', pri: 6, size: 15, weight: 700, bg: false });

  // ── each track, faint then strong to now, and where each is
  const draw = (pts, pos, v, color, name) => {
    stroke(g, pts.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color, width: 1.6, alpha: 0.3 });
    const so = []; for (let i = 0; i <= 60; i++) { const tt = (i / 60) * t; so.push(pos(tt)); }
    stroke(g, so.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color, width: 2.8 });
    const r = pos(t), a = Math.atan2(-v.y, v.x), still = Math.hypot(v.x, v.y) < 1e-9;
    if (still && !birds) lighthouse(g, X(r.x), Y(r.y), color, P);
    else if (still) dot(g, X(r.x), Y(r.y), 6, { fill: P.card, stroke: color, width: 2.4 });
    else if (birds) birdTop(g, X(r.x), Y(r.y), 18, a, color); else shipTop(g, X(r.x), Y(r.y), 26, a, color, P);
    L.add(name, X(r.x) + 12, Y(r.y) - 16, { color, align: 'left', pri: 8, size: 15, weight: 700 });
  };
  draw(ptsB, f.posB, f.B.v, P.second, 'B');
  draw(ptsA, f.posA, f.A.v, P.vel, 'A');

  // ── the vector between them now (from B to A), and each asked moment
  const a = f.posA(t), b = f.posB(t);
  if (Math.hypot(a.x - b.x, a.y - b.y) * k > 14) {
    arrow(g, X(b.x), Y(b.y), X(a.x), Y(a.y), { color: P.mark, width: 1.6, head: 9, alpha: 0.85 });
    L.add(T`${tr(f.gap(t), 2)} [${f.U.len}]`, (X(a.x) + X(b.x)) / 2 + 8, (Y(a.y) + Y(b.y)) / 2 - 10, { color: P.mark, align: 'left', pri: 6, size: 13, weight: 700 });
  }
  for (const an of f.answers) for (const ta of an.times || [an.t]) {
    if (!(ta >= 0) || t < ta - 1e-9) continue;
    const pa = f.posA(ta), pb = f.posB(ta);
    for (const q of [pa, pb]) dot(g, X(q.x), Y(q.y), 7, { stroke: P.mark, width: 2.2 });
    stroke(g, [{ x: X(pa.x), y: Y(pa.y) }, { x: X(pb.x), y: Y(pb.y) }], { color: P.mark, width: 1.4, alpha: 0.8 });
    L.add(T`t = ${tr(ta)} [${f.U.time}]`, X(pa.x) + 12, Y(pa.y) + 16, { color: P.mark, align: 'left', pri: 7, size: 14, weight: 700 });
  }
  L.draw(g, w, h);
  return null;
}
