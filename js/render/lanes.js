// lanes.js — the stage for two on one straight road.
//
// Two pictures of one race, sharing the clock, as for the journey:
//
//   · ABOVE, both speed–time graphs on one pair of axes — the picture every
//     paper in this family draws. A's line in the velocity hue, B's in the
//     second-object stone, both dashed because the motion is along the road
//     (rule 2). Each moment they are level is marked once the clock reaches
//     it: the areas under the two lines up to that instant are equal there,
//     which is what "level" means.
//   · BELOW, the road in two lanes, A above B, each with its equal-time
//     marks, its velocity arrow and its letter; the start; the line the
//     question names, if it names one; the gap between their fronts as a
//     dashed displacement bracket; and each meeting as a line across both
//     lanes with the engine's time.
//
// Everything drawn is read from js/core/overtake.js (rule 4). The view frames
// the whole run and does not pan.

import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, cssVar } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 2) => num(x, p, { trim: true });

/** A car, front at (X, Y), L px long, in ink, with a ring of `ring` if set. */
function car(g, X, Y, L, P, ring) {
  const H = L * 0.34, wheel = L * 0.1, back = X - L;
  g.save();
  g.fillStyle = P.card; g.strokeStyle = ring || P.strong; g.lineWidth = ring ? 2.4 : 1.6;
  g.beginPath();
  g.moveTo(back, Y - wheel); g.lineTo(back, Y - wheel - H * 0.55);
  g.lineTo(back + L * 0.24, Y - wheel - H * 0.6); g.lineTo(back + L * 0.38, Y - wheel - H);
  g.lineTo(X - L * 0.3, Y - wheel - H); g.lineTo(X - L * 0.14, Y - wheel - H * 0.58);
  g.lineTo(X, Y - wheel - H * 0.5); g.lineTo(X, Y - wheel); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = P.faint;
  g.beginPath(); g.moveTo(back + L * 0.42, Y - wheel - H * 0.9); g.lineTo(X - L * 0.33, Y - wheel - H * 0.9);
  g.lineTo(X - L * 0.2, Y - wheel - H * 0.62); g.lineTo(back + L * 0.32, Y - wheel - H * 0.62); g.closePath(); g.fill();
  for (const wx of [back + L * 0.22, X - L * 0.22]) {
    g.fillStyle = P.strong; g.beginPath(); g.arc(wx, Y - wheel, wheel, 0, Math.PI * 2); g.fill();
    g.fillStyle = P.card; g.beginPath(); g.arc(wx, Y - wheel, wheel * 0.4, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'overtake') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const { A, B, events } = f;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const passed = events.filter((e) => e.kind !== 'start' && t >= e.t - 1e-9);

  // ── both speed–time graphs, above
  const gx0 = 250, gx1 = w - 60, gy0 = 64, gy1 = Math.round(h * 0.5);
  const X = (tt) => gx0 + (tt / f.tMax) * (gx1 - gx0);
  const vTop = f.vMax * 1.22;
  const Y = (v) => gy1 - (v / vTop) * (gy1 - gy0);
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx1 + 16, y: gy1 }], { color: P.axis, width: 2 });
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx0, y: gy0 - 16 }], { color: P.axis, width: 2 });
  L.add(T`v [m s^-1]`, gx0 - 10, gy0 - 22, { color: P.muted, align: 'right', pri: 4, size: 14, bg: false });
  L.add(T`t [s]`, gx1 + 20, gy1, { color: P.muted, align: 'left', pri: 4, size: 14, bg: false });
  const vstep = niceStep(vTop, 4);
  for (let v = vstep; v < vTop; v += vstep) {
    stroke(g, [{ x: gx0 - 5, y: Y(v) }, { x: gx0, y: Y(v) }], { color: P.faint, width: 1.4 });
    L.add(fmt(v, vstep < 1 ? 1 : 0), gx0 - 9, Y(v), { color: P.faint, align: 'right', pri: 1, size: 14, bg: false });
  }
  const line = (p, t0, t1) => {
    const out = [];
    const cuts = [t0, ...p.stages.flatMap((st) => [st.t0, st.t1]).filter((c) => c > t0 && c < t1), t1].sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const pts = [];
      for (let j = 0; j <= 20; j++) { const tt = cuts[i] + (j / 20) * (cuts[i + 1] - cuts[i]); pts.push({ x: X(tt), y: Y(p.vel(Math.min(tt, cuts[i + 1] - 1e-9))) }); }
      out.push(pts);
    }
    return out;
  };
  for (const [p, color] of [[B, P.second], [A, P.vel]]) {
    for (const seg of line(p, 0, f.tMax)) stroke(g, seg, { color, width: 1.6, dash: [6, 4], alpha: 0.35 });
    if (t > 0) for (const seg of line(p, 0, t)) stroke(g, seg, { color, width: 2.8, dash: [6, 4] });
    const vEnd = p.vel(f.tMax);
    L.add(p.name, X(f.tMax) + 8, Y(vEnd), { color, align: 'left', pri: 8, size: 15, weight: 700, maxPush: 20 });
  }
  for (const e of passed) {
    stroke(g, [{ x: X(e.t), y: gy1 + 8 }, { x: X(e.t), y: gy0 - 4 }], { color: P.mark, width: 1.6, dash: [4, 4] });
    // under the axis, clear of the readouts in the top corners
    L.add(`level at ${T`t = ${tr(e.t, 3)} [s]`}`, X(e.t), gy1 + 20, { color: P.mark, align: 'center', pri: 9, size: 14, weight: 700 });
  }
  stroke(g, [{ x: X(t), y: gy1 }, { x: X(t), y: gy0 - 8 }], { color: P.muted, width: 1.6, dash: [5, 5] });
  dot(g, X(t), Y(A.vel(t)), 4.5, { fill: P.surface, stroke: P.vel, width: 2.2 });
  dot(g, X(t), Y(B.vel(t)), 4.5, { fill: P.surface, stroke: P.second, width: 2.2 });

  // ── the road, below: A's lane above B's
  const carPx = clamp(w * 0.07, 54, 92);
  const lo = Math.min(0, A.x0, B.x0), hi = Math.max(f.top, 1);
  const sx0 = Math.max(gx0, carPx + 30), sx1 = w - 60;
  const S = (s) => sx0 + ((s - lo) / (hi - lo)) * (sx1 - sx0);
  const yA = Math.round(h * 0.68), yB = Math.round(h * 0.84);
  g.save(); g.fillStyle = cssVar('--hover', 'rgba(255,255,255,.06)'); g.fillRect(0, yA - 26, w, yB - yA + 40); g.restore();
  stroke(g, [{ x: 0, y: yA + 6 }, { x: w, y: yA + 6 }], { color: P.axis, width: 1.6 });
  stroke(g, [{ x: 0, y: (yA + yB) / 2 + 2 }, { x: w, y: (yA + yB) / 2 + 2 }], { color: P.faint, width: 1.6, dash: [16, 14] });
  stroke(g, [{ x: 0, y: yB + 6 }, { x: w, y: yB + 6 }], { color: P.axis, width: 1.6 });
  // the start, and the line the question names
  stroke(g, [{ x: S(0), y: yA - 26 }, { x: S(0), y: yB + 14 }], { color: P.ink, width: 2 });
  L.add('start', S(0), yB + 30, { color: P.muted, align: 'center', pri: 5, size: 14, bg: false });
  if (f.line != null) {
    stroke(g, [{ x: S(f.line), y: yA - 30 }, { x: S(f.line), y: yB + 14 }], { color: P.mark, width: 2.4 });
    L.add(T`${tr(f.line)} [m]`, S(f.line), yB + 30, { color: P.mark, align: 'center', pri: 7, size: 14, weight: 700, bg: false });
  }
  // each meeting, across both lanes
  for (const e of passed) {
    stroke(g, [{ x: S(e.x), y: yA - 30 }, { x: S(e.x), y: yB + 14 }], { color: P.mark, width: 1.6, dash: [4, 4] });
  }
  // equal-time marks, each lane its own
  const dt = niceStep(f.tMax, 10);
  for (const [p, y, color] of [[A, yA, P.vel], [B, yB, P.second]]) {
    for (let i = 0; i * dt <= t + 1e-9; i++) {
      const tt = i * dt;
      if (tt < p.t0 - 1e-9) continue;
      dot(g, S(p.pos(tt)), y + 6, 3.6, { fill: color, stroke: P.surface, width: 1.3 });
      if (show.ticks) L.add(T`${num(tt, dt < 1 ? 1 : 0)} [s]`, S(p.pos(tt)), y + 20, { color, align: 'center', pri: 2, size: 13, bg: false, maxPush: 0 });
    }
  }
  // the two of them, their letters, and their velocities
  for (const [p, y, ring, color] of [[A, yA, null, P.vel], [B, yB, P.second, P.second]]) {
    const xf = S(p.pos(t));
    car(g, xf, y + 4, carPx, P, ring);
    L.add(p.name, xf - carPx - 10, y - 8, { color: P.ink, align: 'right', pri: 9, size: 16, weight: 700 });
    const v = p.vel(t);
    if (show.velocity !== false && v > 1e-6) {
      const len = (v / f.vMax) * clamp(w * 0.1, 50, 120);
      const vy = y - carPx * 0.42;
      arrow(g, xf - carPx * 0.7, vy, xf - carPx * 0.7 + len, vy, { color: P.velVec, width: 2.6, head: 10 });
      L.add(T`${fmt(v, 2)} [m s^-1]`, xf - carPx * 0.7 + len + 8, vy, { color: P.vel, align: 'left', pri: 7, size: 14, weight: 700 });
    }
    if (show.acceleration) {
      const a = p.acc(t);
      if (Math.abs(a) > 1e-9) {
        const len = Math.sign(a) * 36, ay = y - carPx * 0.42 - 20;
        arrow(g, xf - carPx / 2 - len / 2, ay, xf - carPx / 2 + len / 2, ay, { color: P.acc, width: 2.4, head: 9 });
      }
    }
    void color;
  }
  // the gap between their fronts
  const xa = S(A.pos(t)), xb = S(B.pos(t));
  if (Math.abs(xa - xb) > 12 && !passed.some((e) => Math.abs(e.t - t) < 1e-6)) {
    const by = (yA + yB) / 2 + 2;
    stroke(g, [{ x: Math.min(xa, xb), y: by }, { x: Math.max(xa, xb), y: by }], { color: P.disp, width: 2.4, dash: [7, 5] });
    for (const x of [xa, xb]) stroke(g, [{ x, y: by - 7 }, { x, y: by + 7 }], { color: P.disp, width: 2 });
    L.add(`${A.pos(t) > B.pos(t) ? 'A' : 'B'} ahead by ${T`${fmt(Math.abs(f.gap(t)), 1)} [m]`}`, (xa + xb) / 2, by - 14,
      { color: P.disp, align: 'center', pri: 8, size: 14, weight: 700 });
  }

  L.draw(g, w, h);
  return null;
}
