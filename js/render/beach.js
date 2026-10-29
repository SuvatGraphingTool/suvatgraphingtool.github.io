// beach.js — the stage for a ball thrown and caught by someone who sets off
// after it along the ground: a beach, with the sea behind.
//
// Side on, ONE scale both ways. The thrower stands at the start with the ball
// leaving the hand at its height; the dog waits beside them until it sets off,
// then runs out along the sand; the ball's path is the path colour, and where
// it is caught is ringed in the marker colour with the time. The launch and
// catch heights are dimension lines; the distance to the catch is measured
// along the sand. Velocity on the ball, across dashed and up solid (rule 2);
// the dog's velocity is an arrow along the ground — dashed, it is horizontal.
//
// Backdrop pieces come from ./heights.js (sky, sea); the figures from
// ./figures.js (runner, standing; dog). Everything drawn is read from
// js/core/catch.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha, niceStep, fmt } from './util.js';
import { runner, dog } from './figures.js';
import { sky, sea } from './heights.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250, HUD_H = 290;
const SAND = '#cdbb94', SAND_D = '#a8956c';

/** Level sand from its surface at Y down, a little darker where it is wet. */
export function sand(g, x0, x1, Y, bottom) {
  const gr = g.createLinearGradient(0, Y, 0, bottom);
  gr.addColorStop(0, withAlpha(SAND, 0.9)); gr.addColorStop(1, withAlpha(SAND_D, 0.9));
  g.fillStyle = gr; g.fillRect(x0, Y, x1 - x0, bottom - Y);
  g.save(); g.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 40; i++) { const x = x0 + ((i * 97) % (x1 - x0)), y = Y + 4 + ((i * 37) % Math.max(1, bottom - Y - 6)); g.fillRect(x, y, 2, 1); }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'catch') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const C = f.catchAt;

  // ── the frame: the thrower, the whole arc, the catch; one scale both ways
  const xLo = -3, xHi = Math.max(C.x, f.dog.pos(f.tMax)) * 1.08 + 2, yHi = f.apex.y * 1.18 + 0.6;
  const bottom = h - 58;
  const frames = w < 520 ? [{ left: 16, right: w - 16, top: 60 }]
    : [{ left: HUD + 30, right: w - 60, top: 60 }, { left: 30, right: w - 60, top: Math.min(HUD_H, bottom - 120) }];
  let best = null;
  for (const fr of frames) {
    const kk = Math.min((fr.right - fr.left) / (xHi - xLo), (bottom - fr.top) / yHi);
    if (kk > 0 && (!best || kk > best.k)) best = { ...fr, k: kk };
  }
  if (!best) return null;
  const k = best.k, ox = best.left - xLo * k, oy = bottom;
  const X = (x) => ox + x * k, Y = (y) => oy - y * k;

  // ── the place: sky, a strip of sea on the horizon, the sand
  const horizon = oy - Math.min(46, (oy - best.top) * 0.18);
  sky(g, 0, 0, w, horizon);
  sea(g, 0, w, horizon, oy);
  sand(g, 0, w, oy, h);
  const step = niceStep(xHi, 7);
  for (let x = step; x < xHi; x += step) {
    stroke(g, [{ x: X(x), y: oy }, { x: X(x), y: oy + 5 }], { color: P.ink, width: 1, alpha: 0.5 });
    L.add(fmt(x, step < 1 ? 1 : 0), X(x), oy + 14, { color: P.ink, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }

  // ── the height the ball leaves the hand at; the thrower is drawn after the
  // dog, in front of it, and to scale (the hand is at about that height)
  const person = Math.max(16, Math.min(1.75, f.h || 1.75) * k);
  const dh = X(0) - person * 0.6 - 16;
  stroke(g, [{ x: dh, y: oy }, { x: dh, y: Y(f.h) }], { color: P.ink, width: 1.2, alpha: 0.8 });
  for (const yy of [oy, Y(f.h)]) stroke(g, [{ x: dh - 4, y: yy }, { x: dh + 4, y: yy }], { color: P.ink, width: 1.2, alpha: 0.8 });
  L.add(T`${tr(f.h)} [m]`, dh - 6, (oy + Y(f.h)) / 2, { color: P.ink, align: 'right', pri: 6, size: 14, weight: 700 });

  // ── the ball's path: all of it faintly, the part flown strongly
  const n = 140, path = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; path.push({ t: tt, ...f.pos(tt) }); }
  stroke(g, path.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 1.6, alpha: 0.3 });
  stroke(g, path.filter((p) => p.t <= t).map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 2.8 });
  if (show.apex) {
    dot(g, X(f.apex.x), Y(f.apex.y), 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H_max = ${tr(f.apex.y)} [m]`, X(f.apex.x), Y(f.apex.y) - 14, { color: P.disp, align: 'center', pri: 6, size: 14, weight: 700 });
  }

  // ── the dog: waits until it sets off, then runs; its velocity along the sand
  const dx = f.dog.pos(t), dv = f.dog.vel(t);
  const dogL = Math.max(26, 0.9 * k);
  const runPx = dx * k;
  dog(g, X(dx) + 4, oy, dogL, P, { dir: 1, phase: (((runPx / (dogL * 1.2)) % 1) + 1) % 1, still: dv < 1e-9 });
  runner(g, X(0) - 2, oy, person, P, { dir: 1, still: true });
  if (show.velocity !== false && dv > 1e-6) {
    const vl = clamp(w * 0.06, 34, 80) / Math.max(f.dog.vel(f.tMax), 1e-6);
    arrow(g, X(dx) + 8, oy - dogL * 0.3, X(dx) + 8 + dv * vl, oy - dogL * 0.3, { color: P.velVec, width: 2.4, head: 9, dash: [5, 4] });
  }
  if (t < f.dog.t0 - 1e-9) L.add(T`"sets off at" t = ${tr(f.dog.t0)} [s]`, X(0) + dogL + 8, oy - dogL * 0.9, { color: P.ink, align: 'left', pri: 5, size: 13 });

  // ── the catch, once it happens: ringed, with its height and its distance
  if (t >= C.t - 1e-9) {
    dot(g, X(C.x), Y(C.y), 8, { stroke: P.mark, width: 2.4 });
    L.add(T`"caught", t = ${tr(C.t)} [s]`, X(C.x) - 12, Y(C.y) - 22, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
    const cx = X(C.x) + 16;
    stroke(g, [{ x: cx, y: oy }, { x: cx, y: Y(C.y) }], { color: P.ink, width: 1.2, alpha: 0.8 });
    L.add(T`${tr(C.y)} [m]`, cx + 6, (oy + Y(C.y)) / 2 - 2, { color: P.ink, align: 'left', pri: 6, size: 14, weight: 700 });
    stroke(g, [{ x: X(0), y: oy + 30 }, { x: X(C.x), y: oy + 30 }], { color: P.ink, width: 1.2, alpha: 0.8 });
    for (const xx of [X(0), X(C.x)]) stroke(g, [{ x: xx, y: oy + 25 }, { x: xx, y: oy + 35 }], { color: P.ink, width: 1.2, alpha: 0.8 });
    L.add(T`${tr(C.x)} [m]`, (X(0) + X(C.x)) / 2, oy + 46, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700 });
  }

  // ── the ball, with its velocity
  const r = f.pos(t), v = f.vel(t);
  const bx = X(r.x), by = Y(r.y);
  const vMax = Math.max(...path.map((p) => Math.hypot(f.vel(p.t).x, f.vel(p.t).y)), 1e-6);
  const vl = clamp(w * 0.07, 40, 90) / vMax;
  if (show.velocity !== false && t < f.tMax - 1e-9) {
    if (show.components) {
      arrow(g, bx, by, bx + v.x * vl, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, bx + v.x * vl, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, bx, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 3, head: 12 });
    L.add(T`${tr(Math.hypot(v.x, v.y), 2)} [m s^-1]`, bx + v.x * vl + 10, by - v.y * vl, { color: P.vel, align: 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
  dot(g, bx, by, 5, { fill: P.card, stroke: P.ink, width: 2 });

  L.draw(g, w, h);
  return null;
}
