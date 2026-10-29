// vectors.js — the stage for a particle moving in a plane, in i and j.
//
// A field seen from above, filling the stage: i to the east, j to the north,
// metres on both axes at one scale so a direction on the screen is the
// direction on the paper, the grid and the axes through O laid over the
// grass. The frame is what the paper asks about — O, the start, and the
// motion through the last moment asked — and it widens to follow the
// particle only once it travels on past that.
//
// The path is a neutral trail (it is where the particle has been, so it may
// not take the velocity's hue — rule 2); the particle is a ball on the grass;
// its position vector from O is displacement (solid — it is a vector, not a
// component); its velocity an arrow with — when asked for — its two
// components, i dashed and j solid as everywhere on this site; its
// acceleration, which never changes. Each moment the paper asks about pulses
// when the clock reaches it and is pegged on the grass with what happened
// there: the line from O drawing in for "due east of O", the direction it is
// moving in for "moving south-east". The compass belongs to the screen.
//
// Everything drawn is read from js/core/plane.js (rule 4).

import { fieldFromAbove, fitPlanAround, blendPlan, planGrid, compassRose, softShadow } from './scenery.js';
import { pulse, ageOf, phaseOf } from './effects.js';
import { ballAt } from './figures.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, unview, cssVar } from './util.js';
import { s3, placer } from './twoplane.js';
import { T, num } from '../notation.js';
import { vsrc } from '../core/plane.js';

const HUD = 250, HUD_H = 290;

/** Where a peg goes for what happened at an asked moment, and what it says. */
function told(a, ta, short) {
  const at = T`t = ${s3(ta)} [s]`;
  const word = short && a.key && a.key.length <= 2 ? a.key : a.D?.word;
  if (a.kind === 'due') return T`"due ${word} of O," t = ${s3(ta)} [s]`;
  if (a.kind === 'moving' && word) return T`"moving ${word}," t = ${s3(ta)} [s]`;
  if (a.kind === 'moving') return T`"moving that way," t = ${s3(ta)} [s]`;
  return at;
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'plane') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const surface = cssVar('--surface', '#131210');
  const answers = (f.answers || []).filter((a) => a.ok && !a.always);
  const asked = answers.flatMap((a) => (a.times || [a.t]).filter((ta) => ta >= 0 && ta <= f.tMax + 1e-9).map((ta) => ({ a, ta })));

  // ── the frame: O, the start, and the motion through the last moment asked
  //    (or the whole run, if nothing is asked), as large as the canvas allows
  //    with nothing that moves under the readouts or the compass. If the
  //    particle goes on past that, the view widens to the whole run — eased
  //    by the engine's clock, one fixed pair of frames, so it never jumps.
  const tAsk = asked.length ? Math.min(f.tMax, Math.max(...asked.map((q) => q.ta)) * 1.12) : f.tMax;
  const hudBoxes = phone ? [{ x: 0, y: 0, w: w * 0.6, h: 96 }] : [{ x: 0, y: 0, w: HUD, h: HUD_H }, { x: w - 150, y: 0, w: 150, h: 60 }];
  const cR = phone ? 19 : 24, cX = w - cR - (phone ? 12 : 22), cY = h - cR - (phone ? 14 : 24);
  const compassBox = { x: cX - cR - 4, y: cY - cR - 24, w: cR * 2 + 8, h: cR * 2 + 28 };
  const frameOf = (pts) => {
    const xs = [0, f.r0.x, ...pts.map((p) => p.x)], ys = [0, f.r0.y, ...pts.map((p) => p.y)];
    const box = { xLo: Math.min(...xs), xHi: Math.max(...xs), yLo: Math.min(...ys), yHi: Math.max(...ys) };
    const sp = Math.max(box.xHi - box.xLo, box.yHi - box.yLo, 1);
    for (const [lo, hi] of [['xLo', 'xHi'], ['yLo', 'yHi']]) { const m = Math.max(sp * 0.06, sp * 0.3 - (box[hi] - box[lo])) / 2; box[lo] -= m; box[hi] += m; }
    const m = phone ? 26 : 34;
    return { sp, F: fitPlanAround(box, [{ x: 0, y: 0 }, f.r0, ...pts], { left: m, right: w - m, top: m, bottom: h - m }, { avoid: [...hudBoxes, compassBox], margin: 22 }) };
  };
  const focus = f.path(120, tAsk), whole = f.path(160);
  const near = frameOf(focus), far = tAsk < f.tMax - 1e-9 ? frameOf(whole) : near;
  const s = clamp((t - tAsk) / Math.max(1e-9, f.tMax - tAsk), 0, 1), ease = 1 - (1 - s) ** 2;
  const F = blendPlan(near.F, far.F, ease), sp = near.sp + (far.sp - near.sp) * ease;
  const { X, Y } = F;
  const px = (p) => ({ x: X(p.x), y: Y(p.y) });

  // ── the field, filling the stage, its trees kept off the motion in both
  //    frames (so they never move)
  const wholePx = whole.map(px);
  const both = [near.F, far.F].flatMap((G) => [...whole.map((p) => ({ x: G.X(p.x), y: G.Y(p.y) })), { x: G.X(0), y: G.Y(0) }]);
  fieldFromAbove(g, 0, 0, w, h, { avoid: both, keep: hudBoxes });
  // the words: kept off the readouts, the compass, every line drawn and each other
  const Q = placer(g, w, h);
  const off = (pts) => Q.line(pts);
  const hold = (b) => { L.reserve(b); Q.box(b); };
  // and off the axes, where they can be
  Q.line([{ x: 0, y: F.Y(0) }, { x: w, y: F.Y(0) }], 10); Q.line([{ x: F.X(0), y: 0 }, { x: F.X(0), y: h }], 10);
  for (const b of [...hudBoxes, compassBox]) hold(b);
  Q.point(X(0), Y(0));
  Q.line(wholePx);

  // ── the grid and the axes through O
  // one grid for the whole run, so it never changes under the student's eyes
  const step = niceStep(Math.max(near.sp, far.sp), phone ? 5 : 9), dp = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  planGrid(g, L, F, w, h, P, { step, fmt: (x) => num(x, dp), nameI: T`vec(i) [m]`, nameJ: T`vec(j) [m]`, clear: Q.clear,
    jTop: (phone ? F.X(0) < w * 0.6 + 10 : F.X(0) < HUD + 10) ? (phone ? 112 : HUD_H + 14) : 16 });

  // ── the path: a neutral trail, all of it faintly, the part travelled strongly
  stroke(g, wholePx, { color: P.strong, width: 1.6, alpha: 0.4 });
  const flown = f.path(120, t).map(px);
  stroke(g, flown, { color: surface, width: 5.5, alpha: 0.45 });
  stroke(g, flown, { color: P.ink, width: 2.6 });

  // ── where it started, when that is not O
  if (Math.hypot(f.r0.x, f.r0.y) > 1e-9) {
    const q = px(f.r0);
    dot(g, q.x, q.y, 5, { fill: P.card, stroke: P.ink, width: 2 });
    L.add('start', q.x, q.y + 17, { color: P.muted, align: 'center', pri: 4, size: 13 });
  }
  // ── equal steps of time along the path, labelled when asked
  const dt = niceStep(f.tMax, 10);
  for (let i = 1; i * dt <= t + 1e-9; i++) {
    const q = px(f.r(i * dt));
    dot(g, q.x, q.y, 3.4, { fill: P.ink, stroke: surface, width: 1.4 });
    // a moment already pegged is already labelled, with its time
    if (show.ticks && !asked.some((m) => Math.abs(m.ta - i * dt) < 1e-6)) L.add(T`${num(i * dt, dt < 1 ? 1 : 0)} [s]`, q.x + 8, q.y + 12, { color: P.muted, align: 'left', pri: 2, size: 13, maxPush: 0 });
  }

  // ── each asked moment, once the clock reaches it: a pulse, a peg, and
  //    what happened there drawn in
  for (const { a, ta } of asked) {
    if (t < ta - 1e-9) continue;
    const r = f.r(ta), q = px(r), vq = f.vel(ta);
    const { age, life } = ageOf(t, ta, f.tMax);
    const u = phaseOf(age, life * 0.6), grow = u == null ? 1 : 1 - (1 - u) ** 3;
    if (a.kind === 'due') {
      const o0 = { x: X(0), y: Y(0) }, e = { x: o0.x + (q.x - o0.x) * grow, y: o0.y + (q.y - o0.y) * grow };
      stroke(g, [o0, e], { color: surface, width: 5, alpha: 0.4 });
      stroke(g, [o0, e], { color: P.mark, width: 2.2 });
      off([o0, q], 8);
    }
    if (a.kind === 'moving' && a.D) {
      // the compass direction it is moving in, through the peg
      const dl = Math.hypot(a.D.x, a.D.y) || 1, ux = a.D.x / dl, uy = -a.D.y / dl, Lh = 46 * grow;
      const s0 = { x: q.x - ux * Lh * 0.6, y: q.y - uy * Lh * 0.6 }, s1 = { x: q.x + ux * Lh, y: q.y + uy * Lh };
      // a direction of motion is the velocity's direction: its hue (rule 2)
      if (grow > 0.15) arrow(g, s0.x, s0.y, s1.x, s1.y, { color: P.velVec, width: 2.4, head: 10 });
      off([s0, q, s1]);
    }
    pulse(g, q.x, q.y, age, life, P.mark, { radius: 44 });
    dot(g, q.x, q.y, 6, { fill: P.mark, stroke: surface, width: 2 });
    // its words, on the outside of the bend, away from the path
    hold({ x: q.x - 7, y: q.y - 7, w: 14, h: 14 });
    Q.add(told(a, ta, phone), q.x, q.y, { color: P.mark, pri: 8, size: 14, weight: 700 });
  }

  // ── where it is now: position from O, velocity, acceleration
  const r = f.r(t), v = f.vel(t), A = f.a;
  const pX = X(r.x), pY = Y(r.y);
  if (Math.hypot(pX - X(0), pY - Y(0)) > 24) {
    arrow(g, X(0), Y(0), pX, pY, { color: P.disp, width: 2.4, head: 11 });
    const mx = (X(0) + pX) / 2, my = (Y(0) + pY) / 2;
    off([{ x: X(0), y: Y(0) }, { x: pX, y: pY }], 8);
    // beside its arrow, never across it or the path
    const big = Math.max(Math.abs(r.x), Math.abs(r.y), 1e-9), rdp = clamp(2 - Math.floor(Math.log10(big)), 0, 3);
    Q.add(T`vec r = ${vsrc(r, rdp)}`, mx, my, { color: P.disp, pri: 6, size: 14, weight: 700 });
  }
  const sp0 = f.speed(t), vMax = Math.max(...whole.map((p) => f.speed(p.t)), 1e-6);
  // One scale for the whole run, so an arrow's length always says its speed —
  // chosen so that no arrow along the framed path leaves the canvas.
  const room = (c, dv, lo, hi) => (dv > 0 ? (hi - c) / dv : dv < 0 ? (lo - c) / dv : Infinity);
  let vl = clamp(Math.min(w, h) * 0.2, 64, 130) / vMax;
  for (const q of focus) {
    const vq = f.vel(q.t), qx = X(q.x), qy = Y(q.y);
    if (qx < 0 || qx > w || qy < 0 || qy > h) continue;
    vl = Math.min(vl, room(qx, vq.x, 12, w - 12) * 0.9, room(qy, -vq.y, 12, h - 12) * 0.9);
  }
  vl = Math.max(vl, 30 / vMax);
  softShadow(g, pX + 4, pY + 7, 15, 6);
  if (show.velocity !== false && sp0 > 1e-6) {
    // one scale throughout, but never so short it hides under the ball
    const k0 = Math.max(vl, 24 / sp0), ex = pX + v.x * k0, ey = pY - v.y * k0;
    if (show.components) {
      arrow(g, pX, pY, ex, pY, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, ex, pY, ex, ey, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, pX, pY, ex, ey, { color: P.velVec, width: 3, head: 12 });
    off([{ x: pX, y: pY }, { x: ex, y: ey }], 8);
    if (show.components) Q.line([{ x: pX, y: pY }, { x: ex, y: pY }, { x: ex, y: ey }]);
    // its speed by the tip, clear of the arrow and the path
    Q.add(T`${s3(sp0)} [m s^-1]`, ex, ey, { color: P.vel, pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) {
    const an = Math.hypot(A.x, A.y);
    if (an > 1e-9) { arrow(g, pX, pY, pX + (A.x / an) * 44, pY - (A.y / an) * 44, { color: P.acc, width: 2.4, head: 10 }); Q.line([{ x: pX, y: pY }, { x: pX + (A.x / an) * 44, y: pY - (A.y / an) * 44 }]); }
  }
  ballAt(g, pX, pY, 11);
  hold({ x: pX - 14, y: pY - 14, w: 28, h: 28 });

  Q.flush(L);
  L.draw(g, w, h);

  // ── the compass: the screen's, not the field's
  unview(g);
  compassRose(g, cX, cY, cR, P);
  return null;
}
