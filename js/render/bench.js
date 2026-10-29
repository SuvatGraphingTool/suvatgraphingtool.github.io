// bench.js — the stage for off the edge of a bench or a table: a laboratory
// bench with a ball bearing fired off its end through two strips of foil, or a
// table with a ball rolled off it to the floor.
//
// Side on at one scale both ways, measured from the edge. The bench (or the
// table) on its legs against the wall; with the foil, the launcher on the end
// of the bench, each strip hanging from a clamp stand with its centre marked,
// and torn once the ball has gone through; the distance between them and how
// much lower the second's centre is as dimension lines, and where it really
// breaks the second strip ringed. With the table, the floor and how far out it
// lands. The path is drawn in the path colour; velocity with its components
// (across dashed, up solid — rule 2).
//
// Backdrop pieces exported: labWall, labBench, table, foilStrip, launcher.
// Everything drawn is read from js/core/bench.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha, cssVar } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;
const wood = () => cssVar('--wood', '#a0764e');

/** The laboratory wall behind it, and the floor line at Y (if any). */
export function labWall(g, w, Y, h) {
  g.save(); g.fillStyle = withAlpha('#c9ced3', 0.28); g.fillRect(0, 0, w, Y ?? h);
  if (Y != null) { g.fillStyle = withAlpha('#8d8f91', 0.35); g.fillRect(0, Y, w, h - Y);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, Y); g.lineTo(w, Y); g.stroke(); }
  g.restore();
}
/** A laboratory bench whose top's end is at (edge, top), reaching back to x0, a leg under its end. */
export function labBench(g, x0, edge, top, bottom) {
  g.save(); g.fillStyle = withAlpha('#3d4247', 0.85); g.fillRect(x0, top, edge - x0, 12);
  g.fillStyle = withAlpha(wood(), 0.55); g.fillRect(x0, top + 12, edge - x0 - 10, Math.max(0, bottom - top - 12));
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.2; g.strokeRect(x0, top + 12, edge - x0 - 10, Math.max(0, bottom - top - 12));
  g.restore();
}
/** A table whose top's edge is at (edge, top), with two legs down to the floor at Y. */
export function table(g, x0, edge, top, Y) {
  g.save(); g.fillStyle = wood(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2;
  g.fillRect(x0, top, edge - x0, 9); g.strokeRect(x0, top, edge - x0, 9);
  for (const lx of [x0 + 14, edge - 18]) { g.fillRect(lx, top + 9, 7, Y - top - 9); g.strokeRect(lx, top + 9, 7, Y - top - 9); }
  g.restore();
}
/** A strip of foil hanging at x, its centre at y, half a length `half` each way;
    torn through at the height `at` once broken. A clamp stand holds it from above. */
export function foilStrip(g, x, y, half, P, { torn = null, top = 30 } = {}) {
  g.save();
  g.strokeStyle = P.strong; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 16, top); g.lineTo(x + 16, y - half - 10); g.lineTo(x, y - half - 10); g.lineTo(x, y - half); g.stroke();
  g.fillStyle = withAlpha('#c0c6cc', 0.95); g.strokeStyle = withAlpha(P.ink, 0.6); g.lineWidth = 1;
  if (torn == null) { g.fillRect(x - 4, y - half, 8, half * 2); g.strokeRect(x - 4, y - half, 8, half * 2); }
  else {
    const cut = clamp(torn, y - half, y + half);
    g.fillRect(x - 4, y - half, 8, cut - 5 - (y - half)); g.strokeRect(x - 4, y - half, 8, cut - 5 - (y - half));
    g.fillRect(x - 4, cut + 5, 8, y + half - cut - 5); g.strokeRect(x - 4, cut + 5, 8, y + half - cut - 5);
  }
  g.strokeStyle = withAlpha(P.ink, 0.8); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 11, y); g.lineTo(x + 11, y); g.stroke();
  g.restore();
}
/** The launcher on the end of the bench: two magnets and a row of ball bearings, ending at x. */
export function launcher(g, x, Y, r, P) {
  g.save(); g.fillStyle = withAlpha('#b8433a', 0.85); g.strokeStyle = P.strong; g.lineWidth = 1.2;
  for (const m of [5.5, 2.5]) { g.fillRect(x - m * 2 * r - r, Y - 2.4 * r, 1.4 * r, 2.4 * r); g.strokeRect(x - m * 2 * r - r, Y - 2.4 * r, 1.4 * r, 2.4 * r); }
  g.fillStyle = P.card;
  for (const c of [8, 4, 3, 1]) { g.beginPath(); g.arc(x - c * 2 * r + r, Y - r, r, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'bench') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const foil = f.look === 'foil';

  // ── the frame: from behind the edge to past the path; one scale both ways
  const n = 120, pts = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pts.push({ t: tt, ...f.pos(tt) }); }
  const xEnd = Math.max(...pts.map((p) => p.x), f.d || 0), low = f.H ?? Math.max(-Math.min(...pts.map((p) => p.y)), f.drop || 0);
  const xLo = -xEnd * 0.45, xHi = xEnd * 1.18, yLo = -low * (f.H ? 1 : 1.35), yHi = low * (f.H ? 0.18 : 0.55);
  const left = w < 520 ? 16 : HUD + 30, right = w - 70, top = 70, bottom = f.H ? h - 60 : h - 50;
  const k = Math.min((right - left) / (xHi - xLo), (bottom - top) / (yHi - yLo));
  const ox = left + ((right - left) - (xHi - xLo) * k) / 2 - xLo * k, oy = top + ((bottom - top) - (yHi - yLo) * k) / 2 + yHi * k;
  const X = (x) => ox + x * k, Y = (y) => oy - y * k;
  const r = 6;                                           // the ball, drawn at a size that reads

  // ── the place
  const floorY = f.H ? Y(-f.H) : null;
  labWall(g, w, floorY, h);
  if (foil) { labBench(g, 0, X(0), Y(0) + r, f.H ? floorY : h); launcher(g, X(0) - 2, Y(0) + r, r, P); }
  else table(g, Math.min(X(xLo), X(0) - 120), X(0), Y(0) + r, floorY ?? h);
  if (f.H) {
    const dx = X(0) - 30;
    stroke(g, [{ x: dx, y: Y(0) + r }, { x: dx, y: floorY }], { color: P.ink, width: 1.2, alpha: 0.8 });
    for (const yy of [Y(0) + r, floorY]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.2, alpha: 0.8 });
    L.add(T`${tr(f.H)} [m]`, dx - 8, (Y(0) + floorY) / 2, { color: P.ink, align: 'right', pri: 7, size: 15, weight: 700 });
  }

  // ── the strips: the first at the end of the bench, the second d out and drop lower
  if (f.d) {
    const half = Math.max(30, (f.drop ?? f.fall) * k * 0.55);
    const y2 = Y(-(f.drop ?? f.fall));
    foilStrip(g, X(0), Y(0), half, P, { torn: t > 1e-9 ? Y(0) : null, top: top - 30 });
    const past = t >= f.t2 - 1e-9, hitY = Y(f.pos(f.t2).y), hits = Math.abs(hitY - y2) <= half;
    foilStrip(g, X(f.d), y2, half, P, { torn: past && hits ? hitY : null, top: top - 30 });
    // the gap between them, across the top
    const gy = top - 4;
    stroke(g, [{ x: X(0), y: gy }, { x: X(f.d), y: gy }], { color: P.ink, width: 1.2, alpha: 0.8 });
    L.add(T`${tr(f.d)} [m]`, (X(0) + X(f.d)) / 2, gy - 12, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700 });
    // how much lower the second's centre is, down its right
    if (f.drop != null) {
      const ry = X(f.d) + 34;
      stroke(g, [{ x: X(0) + 12, y: Y(0) }, { x: ry + 6, y: Y(0) }], { color: P.faint, width: 1, dash: [3, 4] });
      stroke(g, [{ x: ry, y: Y(0) }, { x: ry, y: y2 }], { color: P.ink, width: 1.2, alpha: 0.8 });
      for (const yy of [Y(0), y2]) stroke(g, [{ x: ry - 5, y: yy }, { x: ry + 5, y: yy }], { color: P.ink, width: 1.2, alpha: 0.8 });
      L.add(T`${tr(f.drop)} [m] "lower"`, ry + 10, (Y(0) + y2) / 2, { color: P.ink, align: 'left', pri: 7, size: 14, weight: 700 });
    }
    if (past) {
      const q = f.pos(f.t2);
      dot(g, X(q.x), Y(q.y), 8, { stroke: P.mark, width: 2.4 });
      const say = f.drop == null ? T`"dropped" ${tr(f.fall)} [m]` : f.atCentre ? 'at its centre' : !hits ? T`"misses the strip:" ${tr(Math.abs(f.miss), 4)} [m] ${f.miss > 0 ? '"below"' : '"above"'} "its centre"` : T`${tr(Math.abs(f.miss), 4)} [m] ${f.miss > 0 ? '"below"' : '"above"'} "its centre"`;
      L.add(say, X(q.x) - 14, Y(q.y) + 22, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
      L.add(T`t = ${tr(f.t2)} [s]`, X(q.x) - 14, Y(q.y) + 40, { color: P.mark, align: 'right', pri: 8, size: 13, weight: 700 });
    }
  }

  // ── the path: all of it faintly, the part flown strongly
  stroke(g, pts.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 1.6, alpha: 0.3 });
  stroke(g, pts.filter((p) => p.t <= t).map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 2.8 });
  if (f.H && t >= f.tMax - 1e-9) {
    const lx = X(f.R);
    stroke(g, [{ x: X(0), y: floorY + 22 }, { x: lx, y: floorY + 22 }], { color: P.ink, width: 1.2, alpha: 0.8 });
    for (const xx of [X(0), lx]) stroke(g, [{ x: xx, y: floorY + 17 }, { x: xx, y: floorY + 27 }], { color: P.ink, width: 1.2, alpha: 0.8 });
    L.add(T`${tr(f.R)} [m]`, (X(0) + lx) / 2, floorY + 38, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700 });
  }

  // ── the ball, its velocity and its acceleration
  const q = f.pos(t), v = f.vel(t), bx = X(q.x), by = Y(q.y);
  const vMax = Math.hypot(f.vel(f.tMax).x, f.vel(f.tMax).y) || 1, vl = clamp(w * 0.08, 46, 100) / vMax;
  const sp = Math.hypot(v.x, v.y);
  if (show.velocity !== false && sp > 1e-6) {
    if (show.components) {
      arrow(g, bx, by, bx + v.x * vl, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      if (Math.abs(v.y) * vl > 4) arrow(g, bx + v.x * vl, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, bx, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 3, head: 12 });
    L.add(T`${tr(sp, 2)} [m s^-1]`, bx + v.x * vl + 12, by - v.y * vl, { color: P.vel, align: 'left', pri: 6, size: 14, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
  g.save(); g.fillStyle = withAlpha('#c0c6cc', 1); g.strokeStyle = P.ink; g.lineWidth = 1.6; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
  if (floorY != null) L.add('floor', 10, floorY + 14, { color: P.ink, align: 'left', pri: 3, size: 13, bg: true });
  L.draw(g, w, h);
  return null;
}
