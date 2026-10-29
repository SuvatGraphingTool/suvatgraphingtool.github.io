// snapshots.js — the stage for a particle moving in a plane, known from two
// moments: a field seen from above, filling the stage, with i east and j
// north at one scale both ways, and the grid and the axes through O laid
// over the grass.
//
// Its path — a curve, its acceleration not along its velocity — faintly in
// full and strongly so far, in the displacement hue; the ball where it is now
// with its velocity (vel hue) and its acceleration (acc hue). The second
// moment the paper gives pulses and is pegged with its time; where the
// acceleration changes there, the path turns a new way and the peg says so;
// each moment asked about pulses and is pegged, with the direction it is
// moving in drawn through it. The compass belongs to the screen.
//
// Everything drawn is read from js/core/snapshots.js (rule 4).

import { fieldFromAbove, fitPlanAround, planGrid, compassRose, softShadow } from './scenery.js';
import { pulse, ageOf, phaseOf } from './effects.js';
import { ballAt } from './figures.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, unview, cssVar } from './util.js';
import { s3, placer } from './twoplane.js';
import { COMPASS } from '../core/plane.js';
import { T, num } from '../notation.js';

const HUD = 250, HUD_H = 290;

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'snapshots') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const surface = cssVar('--surface', '#131210');

  // ── the frame: the path and O, close, one scale both ways, as large as the
  //    canvas allows with nothing that moves under the readouts or the compass
  const n = 160, pts = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pts.push({ t: tt, ...f.pos(tt) }); }
  const all = [...pts, { x: 0, y: 0 }];
  const box = { xLo: Math.min(...all.map((p) => p.x)), xHi: Math.max(...all.map((p) => p.x)), yLo: Math.min(...all.map((p) => p.y)), yHi: Math.max(...all.map((p) => p.y)) };
  const sp = Math.max(box.xHi - box.xLo, box.yHi - box.yLo, 1);
  for (const [lo, hi] of [['xLo', 'xHi'], ['yLo', 'yHi']]) { const m = Math.max(sp * 0.03, sp * 0.15 - (box[hi] - box[lo])) / 2; box[lo] -= m; box[hi] += m; }
  const hudBoxes = phone ? [{ x: 0, y: 0, w: w * 0.6, h: 96 }] : [{ x: 0, y: 0, w: HUD, h: HUD_H }, { x: w - 150, y: 0, w: 150, h: 60 }];
  const cR = phone ? 19 : 24, cX = w - cR - (phone ? 12 : 22), cY = h - cR - (phone ? 14 : 24);
  const compassBox = { x: cX - cR - 4, y: cY - cR - 24, w: cR * 2 + 8, h: cR * 2 + 28 };
  const mg = phone ? 26 : 34;
  const F = fitPlanAround(box, all, { left: mg, right: w - mg, top: mg, bottom: h - mg }, { avoid: [...hudBoxes, compassBox], margin: 22 });
  const { X, Y } = F;
  const px = (p) => ({ x: X(p.x), y: Y(p.y) });
  const pathPx = pts.map(px);

  // ── the field, filling the stage, its trees kept off the motion
  fieldFromAbove(g, 0, 0, w, h, { avoid: [...pathPx, { x: X(0), y: Y(0) }], keep: hudBoxes, seed: 53, pitch: true });
  // the words: kept off the readouts, the compass, every line drawn and each other
  const Q = placer(g, w, h);
  const off = (pts) => Q.line(pts);
  const hold = (b) => { L.reserve(b); Q.box(b); };
  // and off the axes, where they can be
  Q.line([{ x: 0, y: F.Y(0) }, { x: w, y: F.Y(0) }], 10); Q.line([{ x: F.X(0), y: 0 }, { x: F.X(0), y: h }], 10);
  for (const b of [...hudBoxes, compassBox]) hold(b);
  Q.point(X(0), Y(0));
  Q.line(pathPx);

  // ── the grid and the axes through O
  const step = niceStep(sp, phone ? 5 : 8), dp = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  planGrid(g, L, F, w, h, P, { step, fmt: (x) => num(x, dp), nameI: T`vec(i) [m]`, nameJ: T`vec(j) [m]`, clear: Q.clear,
    jTop: (phone ? F.X(0) < w * 0.6 + 10 : F.X(0) < HUD + 10) ? (phone ? 112 : HUD_H + 14) : 16 });

  // ── the path, faint in full and strong so far
  stroke(g, pathPx, { color: P.disp, width: 1.8, alpha: 0.4 });
  const so = []; for (let i = 0; i <= 80; i++) so.push(px(f.pos((i / 80) * t)));
  stroke(g, so, { color: surface, width: 5.5, alpha: 0.45 });
  stroke(g, so, { color: P.disp, width: 2.8 });

  // the words for a moment, by its peg, clear of the path
  const tell = (q, text, pri) => {
    hold({ x: q.x - 7, y: q.y - 7, w: 14, h: 14 });
    Q.add(text, q.x, q.y, { color: P.mark, pri, size: 14, weight: 700 });
  };

  // ── the second moment (and where the acceleration changes): a pulse and a peg
  if (f.T != null && t >= f.T - 1e-9) {
    const q = px(f.pos(f.T)), { age, life } = ageOf(t, f.T, f.tMax);
    pulse(g, q.x, q.y, age, life, P.mark, { radius: 44 });
    dot(g, q.x, q.y, 6, { fill: P.mark, stroke: surface, width: 2 });
    tell(q, `${T`t = ${s3(f.T)} [s]`}${f.switched ? ', new acceleration' : ''}`, 7);
  }
  // ── each asked moment: a pulse, a peg, and the direction it is moving in
  for (const m of f.marks) {
    if (t < m.t - 1e-9) continue;
    const q = px(f.pos(m.t)), { age, life } = ageOf(t, m.t, f.tMax);
    const u = phaseOf(age, life * 0.6), grow = u == null ? 1 : 1 - (1 - u) ** 3;
    const key = Object.keys(COMPASS).find((k) => COMPASS[k].word === m.what), D = key && COMPASS[key];
    if (D) {
      const dl = Math.hypot(D.x, D.y), ux = D.x / dl, uy = -D.y / dl, Lh = 46 * grow;
      const s0 = { x: q.x - ux * Lh * 0.6, y: q.y - uy * Lh * 0.6 }, s1 = { x: q.x + ux * Lh, y: q.y + uy * Lh };
      // a direction of motion is the velocity's direction: its hue (rule 2)
      if (grow > 0.15) arrow(g, s0.x, s0.y, s1.x, s1.y, { color: P.velVec, width: 2.4, head: 10 });
      off([s0, q, s1]);
    }
    pulse(g, q.x, q.y, age, life, P.mark, { radius: 44 });
    dot(g, q.x, q.y, 6, { fill: P.mark, stroke: surface, width: 2 });
    const word = phone && key ? key : m.what;
    tell(q, m.what === 'asked' ? T`t = ${s3(m.t)} [s]` : T`"moving ${word}," t = ${s3(m.t)} [s]`, 8);
  }

  // ── the ball, its velocity and its acceleration
  const r = f.pos(t), v = f.vel(t), a = f.acc(t), qx = X(r.x), qy = Y(r.y);
  softShadow(g, qx + 4, qy + 7, 15, 6);
  const vMax = Math.max(...pts.map((p) => Math.hypot(f.vel(p.t).x, f.vel(p.t).y)), 1e-6);
  // one scale for the whole run, so an arrow's length says its speed — and
  // chosen so that no arrow along the path leaves the canvas
  const room = (c, dv, lo, hi) => (dv > 0 ? (hi - c) / dv : dv < 0 ? (lo - c) / dv : Infinity);
  let vl = clamp(Math.min(w, h) * 0.2, 64, 120) / vMax;
  for (const p of pts) { const vq = f.vel(p.t); vl = Math.min(vl, room(X(p.x), vq.x, 14, w - 14) * 0.9, room(Y(p.y), -vq.y, 14, h - 14) * 0.9); }
  vl = Math.max(vl, 30 / vMax);
  if (show.velocity !== false && Math.hypot(v.x, v.y) > 1e-9) {
    // one scale throughout, but never so short it hides under the ball
    const k0 = Math.max(vl, 24 / Math.hypot(v.x, v.y)), ex = qx + v.x * k0, ey = qy - v.y * k0;
    arrow(g, qx, qy, ex, ey, { color: P.velVec, width: 2.8, head: 11 });
    off([{ x: qx, y: qy }, { x: ex, y: ey }], 8);
    Q.add(T`${s3(Math.hypot(v.x, v.y))} [m s^-1]`, ex, ey, { color: P.vel, pri: 7, size: 14, weight: 700 });
  }
  if (show.acceleration && Math.hypot(a.x, a.y) > 1e-9) {
    const am = Math.hypot(a.x, a.y);
    arrow(g, qx, qy, qx + (a.x / am) * 42, qy - (a.y / am) * 42, { color: P.acc, width: 2.2, head: 9 });
    Q.line([{ x: qx, y: qy }, { x: qx + (a.x / am) * 42, y: qy - (a.y / am) * 42 }]);
  }
  ballAt(g, qx, qy, 11);
  hold({ x: qx - 14, y: qy - 14, w: 28, h: 28 });
  Q.add('P', qx, qy, { color: P.ink, pri: 9, size: 15, weight: 700 });
  Q.flush(L);
  L.draw(g, w, h);

  // ── the compass: the screen's, not the field's
  unview(g);
  compassRose(g, cX, cY, cR, P);
  return null;
}
