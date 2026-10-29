// ceiling.js — the stage for a ball kicked straight up indoors: a sports
// hall side on at one scale, its floor, a wall, its ceiling with beams at the
// height given, the kicker standing where the ball leaves from. The ball rises
// and falls on one vertical line, drawn a little apart going down so both
// show; its velocity is a solid arrow (vertical, rule 2); its greatest height
// is marked, and where it meets the ceiling ringed.
//
// Everything drawn is read from js/core/ceiling.js (rule 4).

import { dust, splash, pulse, flash, ageOf } from './effects.js';
import { interior, floorboards } from './scenery.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha } from './util.js';
import { runner } from './figures.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

/** A sports hall's ceiling at y = Y across x0..x1: a slab with beams below it. */
export function hallCeiling(g, x0, x1, Y, P) {
  g.save(); g.fillStyle = withAlpha('#9a9488', 0.6); g.fillRect(x0, Y - 14, x1 - x0, 14);
  g.strokeStyle = P.strong; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, Y); g.lineTo(x1, Y); g.stroke();
  g.lineWidth = 1; for (let x = x0 + 20; x < x1; x += 60) { g.beginPath(); g.moveTo(x, Y); g.lineTo(x, Y + 6); g.moveTo(x - 8, Y + 6); g.lineTo(x + 8, Y + 6); g.stroke(); }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'ceiling') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // when it reaches the ceiling, the ceiling is the top of the picture
  const yTop = (f.hit ? f.C : Math.max(f.Hmax, f.C ?? 0)) * 1.12;
  const top = 50, bottom = h - 40, k = (bottom - top) / yTop, Y = (y) => bottom - y * k;
  const cx = w < 520 ? w * 0.55 : Math.max(HUD + 160, w * 0.5);
  // the hall: floor, the back wall, the ceiling
  interior(g, 0, 0, w, bottom);
  floorboards(g, 0, w, bottom, h);
  if (f.C != null) hallCeiling(g, cx - 220, cx + 220, Y(f.C), P);
  runner(g, cx - 34, bottom, Math.max(28, 1.7 * k), P, { dir: 1, still: true });
  // the heights: where it leaves, the ceiling, its greatest height
  const dx = cx + 70;
  const dim = (a, b, text) => { stroke(g, [{ x: dx, y: Y(a) }, { x: dx, y: Y(b) }], { color: P.ink, width: 1.2, alpha: 0.8 }); for (const yy of [Y(a), Y(b)]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.2, alpha: 0.8 }); L.add(text, dx + 10, (Y(a) + Y(b)) / 2, { color: P.ink, align: 'left', pri: 6, size: 13, weight: 700 }); };
  if (f.h > 0) dim(0, f.h, T`${tr(f.h)} [m]`);
  if (f.C != null) L.add(T`"ceiling" ${tr(f.C)} [m]`, cx + 120, Y(f.C) + 18, { color: P.ink, align: 'left', pri: 7, size: 13, weight: 700 });
  if (!f.hit || f.Hmax <= (f.C ?? Infinity)) {
    stroke(g, [{ x: cx - 30, y: Y(f.Hmax) }, { x: cx + 40, y: Y(f.Hmax) }], { color: P.disp, width: 1.2, dash: [5, 4] });
    L.add(T`H = ${tr(f.Hmax)} [m]`, cx - 36, Y(f.Hmax), { color: P.disp, align: 'right', pri: 7, size: 13, weight: 700 });
  }
  // the ball: up on one line, down on another just beside it
  const down = t > f.tTop, bx = cx + (down ? 10 : 0), y = f.pos(t), v = f.vel(t);
  stroke(g, [{ x: cx, y: Y(f.h) }, { x: cx, y: Y(down ? f.Hmax : y) }], { color: P.disp, width: 2, alpha: 0.5 });
  if (down) stroke(g, [{ x: cx + 10, y: Y(f.Hmax) }, { x: cx + 10, y: Y(y) }], { color: P.disp, width: 2, alpha: 0.5 });
  if (f.hit && t >= f.hit.t - 1e-9) {
    { const { age, life } = ageOf(t, f.hit.t, f.tMax); flash(g, cx, Y(f.C), age, life, { radius: 20 }); }
    dot(g, cx, Y(f.C), 9, { stroke: P.mark, width: 2.4 });
    L.add(T`t = ${tr(f.hit.t)} [s], ${tr(f.hit.v)} [m s^-1]`, cx - 16, Y(f.C) + 22, { color: P.mark, align: 'right', pri: 9, size: 13, weight: 700 });
  }
  if (show.velocity !== false && Math.abs(v) > 1e-9) arrow(g, bx + 16, Y(y), bx + 16, Y(y) - (v / f.u) * 60, { color: P.velVec, width: 2.6, head: 10 });
  dot(g, bx, Y(y), 7, { fill: P.card, stroke: P.ink, width: 2.2 });
  L.draw(g, w, h);
  return null;
}
