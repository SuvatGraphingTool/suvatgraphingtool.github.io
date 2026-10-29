// marks.js — the stage for a ball falling freely past two marks M and N: a
// tall building's wall with a window from M (its top) to N (its bottom), or a
// cliff face with the two marked on it. Side on at one scale, down the page:
// where it was dropped from rest, M and N as level lines, the ground when
// its height is given. The ball falls beside the wall, its velocity a solid
// arrow (vertical, rule 2); passing each mark is ringed with the time and
// speed. In letters the heights are labelled in u²⁄g, the times in u⁄g.
//
// Everything drawn is read from js/core/marks.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha } from './util.js';
import { inLetters } from '../core/letters.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

/** A building's wall from x0 to edge, from roof at `top` down to Y, with a window from wy0 to wy1. */
export function buildingWall(g, x0, edge, top, Y, wy0, wy1, P) {
  g.save(); g.fillStyle = withAlpha('#b8b0a4', 0.5); g.strokeStyle = P.strong; g.lineWidth = 1.6;
  g.fillRect(x0, top, edge - x0, Y - top); g.strokeRect(x0, top, edge - x0, Y - top);
  g.fillStyle = withAlpha('#9fb6c8', 0.75); g.fillRect(edge - 46, wy0, 34, wy1 - wy0); g.strokeRect(edge - 46, wy0, 34, wy1 - wy0);
  g.lineWidth = 1; g.beginPath(); g.moveTo(edge - 29, wy0); g.lineTo(edge - 29, wy1); g.stroke();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'marks') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── one scale down the page: from the release (0) to the ground or a little past N
  const deep = f.ground ?? f.yN * 1.12;
  const top = 60, bottom = h - 40, k = (bottom - top) / (deep * 1.04);
  const Y = (y) => top + y * k;
  const edge = w < 520 ? w * 0.45 : Math.max(HUD + 140, w * 0.45), bx = edge + 30;
  const roof = Y(0) - 10, floor = f.ground != null ? Y(f.ground) : bottom;
  if (f.look === 'cliff') {
    g.save(); g.fillStyle = withAlpha('#8b8073', 0.75); g.beginPath(); g.moveTo(edge - 160, roof); g.lineTo(edge, roof); g.lineTo(edge - 8, floor); g.lineTo(edge - 160, floor); g.closePath(); g.fill(); g.restore();
  } else buildingWall(g, edge - 150, edge, roof, floor, Y(f.yM), Y(f.yN), P);
  if (f.ground != null) { g.save(); g.fillStyle = withAlpha('#7c9a63', 0.55); g.fillRect(0, floor, w, h - floor); g.restore(); stroke(g, [{ x: 0, y: floor }, { x: w, y: floor }], { color: P.axis, width: 1.6 }); }

  // the release point and the two marks, as level lines with their distances
  const lab = (c) => (f.letters ? T`${inLetters(c, 'u^2', 'g')}` : T`${tr(c)} [m]`);
  dot(g, bx, Y(0), 4, { fill: P.ink, stroke: P.ink, width: 1 });
  L.add(f.yM < 1e-9 ? 'let go from rest at M' : 'let go from rest', bx + 14, Y(0) - (f.yM < 1e-9 ? 16 : 0), { color: P.ink, align: 'left', pri: 5, size: 13 });
  for (const [n, y] of [['M', f.yM], ['N', f.yN]]) {
    stroke(g, [{ x: edge - 50, y: Y(y) }, { x: bx + 60, y: Y(y) }], { color: P.mark, width: 1.4, dash: [5, 4] });
    L.add(n, edge - 58, Y(y), { color: P.mark, align: 'right', pri: 9, size: 16, weight: 700 });
  }
  // dimension lines: release to M, M to N
  const dx = bx + 80;
  for (const [a, b, c] of [[0, f.yM, f.yM], [f.yM, f.yN, f.yN - f.yM]].filter(([a0, b0]) => b0 - a0 > 1e-9)) {
    stroke(g, [{ x: dx, y: Y(a) }, { x: dx, y: Y(b) }], { color: P.ink, width: 1.2, alpha: 0.8 });
    for (const yy of [Y(a), Y(b)]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.2, alpha: 0.8 });
    L.add(lab(c), dx + 10, (Y(a) + Y(b)) / 2, { color: P.ink, align: 'left', pri: 7, size: 14, weight: 700 });
  }
  // ── the ball, and each mark ringed as it passes
  const y = f.pos(t), v = f.vel(t);
  stroke(g, [{ x: bx, y: Y(0) }, { x: bx, y: Y(y) }], { color: P.disp, width: 2.4, alpha: 0.6 });
  for (const [tm, ym] of [[f.tM, f.yM], [f.tN, f.yN]]) if (t >= tm - 1e-9) {
    dot(g, bx, Y(ym), 8, { stroke: P.mark, width: 2.2 });
    L.add(f.letters ? T`v = ${tm === f.tM ? f.vLabel.M : f.vLabel.N}` : T`${tr(f.vel(tm), 3)} [m s^-1]`, bx - 14, Y(ym) - 12, { color: P.vel, align: 'right', pri: 7, size: 13, weight: 700 });
  }
  if (show.velocity !== false && v > 1e-9) {
    const vMax = f.vel(f.tMax), len = Math.min((v / vMax) * 60, Math.max(0, h - 10 - Y(y)));
    arrow(g, bx + 16, Y(y), bx + 16, Y(y) + len, { color: P.velVec, width: 2.6, head: 10 });
  }
  dot(g, bx, Y(y), 7, { fill: P.card, stroke: P.ink, width: 2.2 });
  L.draw(g, w, h);
  return null;
}
