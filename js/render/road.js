// road.js — the stage for a vehicle along a straight road.
//
// Side-on, level, and nothing else in the way: a road from A to B, the
// vehicle on it, and the marks the question is about. The picture is drawn
// from js/core/road.js and claims nothing that file did not compute (rule 4).
//
//   · posts at A and B, and a marker at the point the question names (the
//     mid-point of AB, usually), which reports the time the engine found for
//     it once the vehicle has passed it;
//   · a trail of equal-time marks behind the vehicle — the spacing growing
//     or shrinking IS the acceleration, the strobe picture of it;
//   · the velocity and the acceleration as arrows, in their own hues
//     (rule 2), solid because they are vectors, not components of one; and
//     the displacement from A as a dashed bracket, because it is horizontal.
//
// The view frames the whole run, A to B, and does not pan: the graphs are
// where a road question's answer is drawn — the velocity–time line, and the
// area under it that is AB.

import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, cssVar } from './util.js';
import { T } from '../notation.js';

const TRAIL = 10;            // equal-time marks across the whole run

/** The vehicle: a cab and a box trailer, its front bumper at (X, Y). */
function lorry(g, X, Y, L, P) {
  const H = L * 0.36, cabW = L * 0.26, wheel = L * 0.075;
  const back = X - L;
  g.save();
  // the box
  g.fillStyle = P.card; g.strokeStyle = P.strong; g.lineWidth = 1.6;
  g.beginPath(); g.roundRect(back, Y - wheel - H, L - cabW - 4, H, 3); g.fill(); g.stroke();
  // the cab
  g.beginPath();
  g.moveTo(X - cabW, Y - wheel); g.lineTo(X - cabW, Y - wheel - H * 0.82);
  g.lineTo(X - cabW * 0.35, Y - wheel - H * 0.82); g.lineTo(X, Y - wheel - H * 0.38);
  g.lineTo(X, Y - wheel); g.closePath(); g.fill(); g.stroke();
  // the window
  g.fillStyle = P.faint;
  g.beginPath();
  g.moveTo(X - cabW * 0.82, Y - wheel - H * 0.72); g.lineTo(X - cabW * 0.4, Y - wheel - H * 0.72);
  g.lineTo(X - cabW * 0.1, Y - wheel - H * 0.44); g.lineTo(X - cabW * 0.82, Y - wheel - H * 0.44);
  g.closePath(); g.fill();
  // wheels
  for (const wx of [back + L * 0.14, back + L * 0.3, X - cabW * 0.5]) {
    g.fillStyle = P.strong; g.beginPath(); g.arc(wx, Y - wheel, wheel, 0, Math.PI * 2); g.fill();
    g.fillStyle = P.card; g.beginPath(); g.arc(wx, Y - wheel, wheel * 0.4, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/** A roadside post with its letter on a plate. */
function post(g, L, X, roadY, letter, color, P, { dashed = false } = {}) {
  stroke(g, [{ x: X, y: roadY + 6 }, { x: X, y: roadY - 92 }], { color, width: 2.4, dash: dashed ? [6, 5] : null });
  g.save();
  g.fillStyle = color; g.beginPath(); g.roundRect(X - 15, roadY - 118, 30, 28, 6); g.fill();
  g.restore();
  L.add(letter, X, roadY - 104, { color: P.surface, align: 'center', pri: 10, size: 17, weight: 700, bg: false });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true, markers = {} } = o;
  if (!f || f.kind !== 'line') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const { s, u, v, a, t: T_END } = f.params;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the frame: the whole run, A to B, with room for the vehicle behind A
  const pts = f.path(120);
  const lo = Math.min(0, s, ...pts.map((p) => p.x)), hi = Math.max(0, s, ...pts.map((p) => p.x));
  const span = Math.max(hi - lo, 1);
  const lorryPx = clamp(w * 0.085, 64, 118);
  const left = lorryPx + 40, right = 64;
  const sx = (x) => left + ((x - lo) / span) * (w - left - right);
  const roadY = Math.round(h * 0.6);

  // ── ground and road
  g.save();
  g.fillStyle = cssVar('--hover', 'rgba(255,255,255,.06)');
  g.fillRect(0, roadY, w, h - roadY);
  g.fillStyle = P.grid; g.fillRect(0, roadY - 3, w, 16);
  g.restore();
  stroke(g, [{ x: 0, y: roadY - 3 }, { x: w, y: roadY - 3 }], { color: P.axis, width: 2 });
  stroke(g, [{ x: 0, y: roadY + 13 }, { x: w, y: roadY + 13 }], { color: P.axis, width: 1.4 });
  stroke(g, [{ x: 0, y: roadY + 5 }, { x: w, y: roadY + 5 }], { color: P.faint, width: 1.6, dash: [18, 16] });

  // ── metres along the road, from A
  const step = niceStep(span, 6);
  for (let m = Math.ceil(lo / step) * step; m <= hi + 1e-9; m += step) {
    const X = sx(m);
    stroke(g, [{ x: X, y: roadY + 16 }, { x: X, y: roadY + 26 }], { color: P.faint, width: 1.4 });
    L.add(`${fmt(m, step < 1 ? 1 : 0)} m`, X, roadY + 40, { color: P.muted, align: 'center', pri: 1, bg: false, size: 15 });
  }
  if (show.grid) {
    for (let m = Math.ceil(lo / step) * step; m <= hi + 1e-9; m += step) {
      stroke(g, [{ x: sx(m), y: 30 }, { x: sx(m), y: roadY - 3 }], { color: P.grid, width: 1 });
    }
  }

  // ── A, B, and the point the question names
  post(g, L, sx(0), roadY, 'A', P.ink, P);
  post(g, L, sx(s), roadY, 'B', P.ink, P);
  const mk = markers.mark;
  if (mk && isFinite(mk.s)) {
    const X = sx(mk.s);
    post(g, L, X, roadY, 'M', P.mark, P, { dashed: true });
    const passed = t >= mk.t - 1e-9;
    L.add(passed ? T`t = ${fmt(mk.t, 2)} [s]` : (mk.mid ? 'mid-point' : T`${fmt(mk.s, 1)} [m]`),
      X, roadY - 136, { color: P.mark, align: 'center', pri: 9, size: 16, weight: 700 });
  }

  // ── the trail: where it was at equal steps of time, up to now
  const dt = T_END / TRAIL;
  for (let i = 0; i * dt <= t + 1e-9; i++) {
    const X = sx(f.pos(i * dt).x);
    dot(g, X, roadY - 3, 4.2, { fill: P.vel, stroke: P.surface, width: 1.5 });
    if (show.ticks) {
      L.add(T`${fmt(i * dt, 1)} [s]`, X, roadY - 20, { color: P.vel, align: 'center', pri: 2, size: 13, bg: false, maxPush: 20 });
    }
  }

  // ── the displacement from A, dashed because it is horizontal
  const p = f.pos(t), Xp = sx(p.x), X0 = sx(0);
  if (Math.abs(Xp - X0) > 4) {
    const by = roadY + 62;
    stroke(g, [{ x: X0, y: by }, { x: Xp, y: by }], { color: P.disp, width: 2.6, dash: [8, 6] });
    stroke(g, [{ x: X0, y: by - 7 }, { x: X0, y: by + 7 }], { color: P.disp, width: 2.2 });
    stroke(g, [{ x: Xp, y: by - 7 }, { x: Xp, y: by + 7 }], { color: P.disp, width: 2.2 });
    L.add(T`s = ${fmt(p.x, 1)} [m]`, (X0 + Xp) / 2, by + 18, { color: P.disp, align: 'center', pri: 8, size: 16, weight: 700 });
  }

  // ── the vehicle, front bumper on the point it is at
  lorry(g, Xp, roadY - 3, lorryPx, P);

  // ── its velocity and acceleration, as vectors
  const vNow = f.vel(t).x;
  const vMax = Math.max(Math.abs(u), Math.abs(v), 1e-6);
  const aY = roadY - 3 - lorryPx * 0.36 - 40;
  if (show.velocity !== false && Math.abs(vNow) > 1e-6) {
    const len = (vNow / vMax) * clamp(w * 0.14, 70, 170);
    const vy = roadY - 3 - lorryPx * 0.2;
    arrow(g, Xp + 6, vy, Xp + 6 + len, vy, { color: P.velVec, width: 3.2, head: 13 });
    L.add(T`v = ${fmt(vNow, 1)} [m s^-1]`, Xp + 6 + len + (len >= 0 ? 10 : -10), vy, {
      color: P.vel, align: len >= 0 ? 'left' : 'right', pri: 7, size: 16, weight: 700 });
  }
  if (show.acceleration !== false && Math.abs(a) > 1e-9) {
    const len = Math.sign(a) * clamp(w * 0.07, 40, 90);
    const mid = Xp - lorryPx / 2;
    arrow(g, mid - len / 2, aY, mid + len / 2, aY, { color: P.acc, width: 2.8, head: 12 });
    L.add(T`a = ${fmt(a, 2)} [m s^-2]`, mid, aY - 20, { color: P.acc, align: 'center', pri: 6, size: 15, weight: 700 });
  } else if (show.acceleration !== false) {
    L.add('no acceleration: constant velocity', Xp - lorryPx / 2, aY, { color: P.acc, align: 'center', pri: 6, size: 15 });
  }

  L.draw(g, w, h);
  return null;
}
