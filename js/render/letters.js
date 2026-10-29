// letters.js — the stage for two particles projected straight up from O,
// the answers in letters: a vertical line through O at one scale, P and Q
// side by side on it (one vertical line, drawn a little apart so both show),
// P's greatest height marked H with its value in letters, and where they
// collide ringed with τ and the height, in letters (and in metres when U and
// g are numbers). Up is solid (rule 2); P in the quantity's hue, Q in stone.
//
// Everything drawn is read from js/core/letters.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot } from './util.js';
import { inLetters } from '../core/letters.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'letters') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const Lu = f.U * f.U / f.g;

  // ── the frame: from the lowest to the highest either reaches, one scale
  const ys = [0, f.H]; for (let i = 0; i <= 80; i++) { const tt = (i / 80) * f.tMax; ys.push(f.yP(tt), f.yQ(tt)); }
  const lo = Math.min(...ys), hi = Math.max(...ys), span = (hi - lo) || 1;
  const top = 60, bottom = h - 50, k = (bottom - top) / (span * 1.2);
  const Y = (y) => bottom - (y - lo + span * 0.1) * k;
  const cx = w < 520 ? w * 0.5 : Math.max(HUD + 140, w * 0.5), xP = cx - 26, xQ = cx + 26;

  // the vertical through O, O itself, and the level of O across
  stroke(g, [{ x: cx, y: Y(hi) - 20 }, { x: cx, y: Y(lo) + 20 }], { color: P.grid, width: 1.4, dash: [3, 5] });
  stroke(g, [{ x: cx - 90, y: Y(0) }, { x: cx + 90, y: Y(0) }], { color: P.axis, width: 1.6 });
  dot(g, cx, Y(0), 4, { fill: P.ink, stroke: P.ink, width: 1 });
  L.add('O', cx - 96, Y(0), { color: P.ink, align: 'right', pri: 8, size: 15, weight: 700, bg: false });

  // P's greatest height, in letters
  if (f.top) {
    stroke(g, [{ x: cx - 80, y: Y(f.H) }, { x: cx + 80, y: Y(f.H) }], { color: P.disp, width: 1.2, dash: [6, 4] });
    L.add(T`H = ${inLetters(0.5, 'U^2', 'g')}${f.num ? ` = ${tr(f.H)} [m]` : ''}`, cx + 88, Y(f.H), { color: P.disp, align: 'left', pri: 7, size: 14, weight: 700 });
  }
  // the paths so far, and each particle
  const path = (fn, x, from) => { const pts = []; for (let i = 0; i <= 60; i++) { const tt = from + (i / 60) * (t - from); pts.push({ x, y: Y(fn(tt)) }); } return pts; };
  stroke(g, path(f.yP, xP, 0), { color: P.vel, width: 2.4, alpha: 0.5 });
  if (t > f.t0) stroke(g, path(f.yQ, xQ, f.t0), { color: P.second, width: 2.4, alpha: 0.5 });
  for (const [fn, vf, x, c, n] of [[f.yP, f.vP, xP, P.vel, 'P'], [f.yQ, f.vQ, xQ, P.second, 'Q']]) {
    const y = fn(t), v = vf(t);
    if (show.velocity !== false && Math.abs(v) > 1e-9 && (n === 'P' || t > f.t0)) {
      const vMax = Math.max(f.U, f.kq * f.U, 1e-6), len = (v / vMax) * 60;
      arrow(g, x + (n === 'P' ? -16 : 16), Y(y), x + (n === 'P' ? -16 : 16), Y(y) - len, { color: P.velVec, width: 2.4, head: 9 });
    }
    dot(g, x, Y(y), 7, { fill: P.card, stroke: c, width: 2.4 });
    L.add(n, x + (n === 'P' ? -30 : 30), Y(y), { color: c, align: n === 'P' ? 'right' : 'left', pri: 9, size: 15, weight: 700 });
  }
  if (t < f.t0) L.add(`Q waits at O until ${f.top ? 'P is at the top' : 'it is projected'}`, xQ + 30, Y(0) + 22, { color: P.second, align: 'left', pri: 5, size: 13 });
  // the collision
  if (f.tc != null && t >= f.tc - 1e-9) {
    dot(g, cx, Y(f.yc), 12, { stroke: P.mark, width: 2.6 });
    const tau = f.tau, yl = f.ycL;
    L.add(T`"collide," tau = ${inLetters(tau, 'U', 'g')}`, cx + 22, Y(f.yc) - 30, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
    L.add(Math.abs(yl) < 1e-9 ? 'at O' : T`${inLetters(Math.abs(yl), 'U^2', 'g')} ${yl > 0 ? '"above O"' : '"below O"'}`, cx + 22, Y(f.yc) - 12, { color: P.mark, align: 'left', pri: 8, size: 13, weight: 700 });
  }
  L.draw(g, w, h);
  return null;
}
