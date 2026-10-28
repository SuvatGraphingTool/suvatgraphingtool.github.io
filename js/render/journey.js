// journey.js — the stage for a journey in three stages, from rest to rest.
//
// Two pictures of one trip, one above the other and sharing the clock:
//
//   · ABOVE, the speed–time graph the paper draws: a trapezium, the three
//     stages marked off at t₁ and t₁ + t₂, and the area under it filling in
//     as the clock runs, in the displacement hue, because that area IS the
//     distance. Each stage's area is named once the clock has passed it,
//     with the engine's figure. Speed along the track is horizontal, so its
//     line is dashed, as on every graph of horizontal motion on this site.
//   · BELOW, the track from A to B: where each stage happens along it, the
//     train, the equal-time marks it leaves (bunched where it is slow, spread
//     where it is fast — the same story as the graph, told in distance), and
//     its velocity as an arrow.
//
// Everything drawn is read from js/core/journey.js (rule 4). The view frames
// the whole journey and does not pan.

import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, cssVar, fade } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 2) => num(x, p, { trim: true });

/** A train, front at (X, Y), L px long: a body, a cab window, wheels. */
function train(g, X, Y, L, P) {
  const H = L * 0.3, wheel = L * 0.06, back = X - L;
  g.save();
  g.fillStyle = P.card; g.strokeStyle = P.strong; g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(back, Y - wheel); g.lineTo(back, Y - wheel - H);
  g.lineTo(X - L * 0.14, Y - wheel - H); g.quadraticCurveTo(X, Y - wheel - H, X, Y - wheel - H * 0.4);
  g.lineTo(X, Y - wheel); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = P.faint;
  for (let wx = back + L * 0.06; wx < X - L * 0.24; wx += L * 0.14) g.fillRect(wx, Y - wheel - H * 0.78, L * 0.09, H * 0.32);
  g.beginPath(); g.moveTo(X - L * 0.16, Y - wheel - H * 0.78); g.lineTo(X - L * 0.05, Y - wheel - H * 0.78);
  g.lineTo(X - L * 0.02, Y - wheel - H * 0.46); g.lineTo(X - L * 0.16, Y - wheel - H * 0.46); g.closePath(); g.fill();
  for (const wx of [back + L * 0.12, back + L * 0.24, X - L * 0.28, X - L * 0.14]) {
    g.fillStyle = P.strong; g.beginPath(); g.arc(wx, Y - wheel, wheel, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'journey') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const J = f.J, answers = f.answers || [];
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const tA = J.t1, tB = J.t1 + J.t2;

  // ── the graph, above
  const gx0 = 250, gx1 = w - 60, gy0 = 64, gy1 = Math.round(h * 0.52);
  const X = (tt) => gx0 + (tt / J.T) * (gx1 - gx0);
  const vTop = J.V * 1.22;
  const Y = (v) => gy1 - (v / vTop) * (gy1 - gy0);
  // axes
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx1 + 16, y: gy1 }], { color: P.axis, width: 2 });
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx0, y: gy0 - 16 }], { color: P.axis, width: 2 });
  L.add(T`v [m s^-1]`, gx0 - 10, gy0 - 22, { color: P.muted, align: 'right', pri: 4, size: 14, bg: false });
  L.add(T`t [s]`, gx1 + 20, gy1, { color: P.muted, align: 'left', pri: 4, size: 14, bg: false });
  // the area so far: the distance from A
  const pts = (t0, t1) => {
    const out = [];
    for (let i = 0; i <= 60; i++) { const tt = t0 + (i / 60) * (t1 - t0); out.push({ x: X(tt), y: Y(f.speed(tt)) }); }
    return out;
  };
  if (t > 0) {
    const area = pts(0, t);
    g.save(); g.beginPath(); g.moveTo(X(0), Y(0));
    for (const p of area) g.lineTo(p.x, p.y);
    g.lineTo(X(t), Y(0)); g.closePath();
    g.fillStyle = fade(g, P.disp, gy0, gy1, 0.34, 0.08); g.fill(); g.restore();
  }
  // the stage boundaries, and V
  for (const tt of [tA, tB]) {
    if (tt > 1e-9 && tt < J.T - 1e-9) stroke(g, [{ x: X(tt), y: gy1 }, { x: X(tt), y: Y(J.V) }], { color: P.faint, width: 1.2, dash: [3, 4] });
  }
  stroke(g, [{ x: gx0, y: Y(J.V) }, { x: X(tA), y: Y(J.V) }], { color: P.faint, width: 1.2, dash: [3, 4] });
  L.add(T`V = ${tr(J.V)}`, gx0 - 10, Y(J.V), { color: P.vel, align: 'right', pri: 8, size: 15, weight: 700 });
  // the whole trapezium, faint ahead of the clock and strong behind it
  stroke(g, pts(0, J.T), { color: P.vel, width: 1.6, dash: [6, 4], alpha: 0.4 });
  if (t > 0) stroke(g, pts(0, t), { color: P.vel, width: 2.8, dash: [6, 4] });
  // the times along the bottom: each stage as a bracket under the axis
  const tb = gy1 + 22;
  const bracket = (t0, t1, label, pri) => {
    if (t1 - t0 < 1e-9) return;
    const a = X(t0) + 2, b = X(t1) - 2;
    stroke(g, [{ x: a, y: tb - 6 }, { x: a, y: tb }, { x: b, y: tb }, { x: b, y: tb - 6 }], { color: P.faint, width: 1.4 });
    L.add(label, (a + b) / 2, tb + 15, { color: P.muted, align: 'center', pri, size: 14, bg: false });
  };
  bracket(0, tA, T`t_1 = ${tr(J.t1)} [s]`, 5);
  bracket(tA, tB, T`t_2 = ${tr(J.t2)} [s]`, 5);
  bracket(tB, J.T, T`t_3 = ${tr(J.t3)} [s]`, 5);
  // each stage's area, named once the clock has passed it
  const areaLabel = (t0, t1, s, name) => {
    if (t1 - t0 < 1e-9 || t < t1 - 1e-9) return;
    // a rectangle's name in its middle; a triangle's low down, towards its
    // tall side, where there is room for it
    const tri = !(Math.abs(t0 - tA) < 1e-9 && Math.abs(t1 - tB) < 1e-9);
    const toward = t0 < 1e-9 ? 0.62 : 0.38;
    const cx = tri ? X(t0 + toward * (t1 - t0)) : (X(t0) + X(t1)) / 2;
    const cy = Y(J.V * (tri ? 0.26 : 0.5));
    L.add(`${name} ${T`${tr(s)} [m]`}`, cx, cy, { color: P.disp, align: 'center', pri: 7, size: 15, weight: 700 });
  };
  areaLabel(0, tA, J.s1, 'up to speed');
  areaLabel(tA, tB, J.s2, 'steady');
  areaLabel(tB, J.T, J.s3, 'braking');
  // the cursor, and the instants a question asked about
  stroke(g, [{ x: X(t), y: gy1 }, { x: X(t), y: gy0 - 8 }], { color: P.muted, width: 1.6, dash: [5, 5] });
  dot(g, X(t), Y(f.speed(t)), 5, { fill: P.surface, stroke: P.vel, width: 2.4 });
  for (const a of answers) {
    for (const ta of a.times || (a.t != null ? [a.t] : [])) {
      if (t < ta - 1e-9) continue;
      dot(g, X(ta), Y(f.speed(ta)), 7, { stroke: P.mark, width: 2.4 });
    }
  }

  // ── the track, below
  const ty = Math.round(h * 0.8);
  const trainPx = clamp(w * 0.09, 70, 120);
  const sx0 = Math.max(gx0, trainPx + 30), sx1 = w - 60;
  const S = (s) => sx0 + (s / J.D) * (sx1 - sx0);
  g.save(); g.fillStyle = cssVar('--hover', 'rgba(255,255,255,.06)'); g.fillRect(0, ty, w, h - ty); g.restore();
  stroke(g, [{ x: 0, y: ty }, { x: w, y: ty }], { color: P.axis, width: 2 });
  for (let x = 6; x < w; x += 16) stroke(g, [{ x, y: ty + 2 }, { x: x + 8, y: ty + 2 }], { color: P.faint, width: 2 });
  // the stations
  for (const [s, name] of [[0, 'A'], [J.D, 'B']]) {
    const x = S(s);
    stroke(g, [{ x, y: ty }, { x, y: ty - 70 }], { color: P.ink, width: 2.2 });
    g.save(); g.fillStyle = P.ink; g.beginPath(); g.roundRect(x - 14, ty - 96, 28, 26, 6); g.fill(); g.restore();
    L.add(name, x, ty - 83, { color: P.surface, align: 'center', pri: 10, size: 16, weight: 700, bg: false });
  }
  // where each stage happens, as dashed displacement brackets under the rails
  const zy = ty + 26;
  const zone = (s0, s1, label) => {
    if (s1 - s0 < 1e-9) return;
    const a = S(s0) + 2, b = S(s1) - 2;
    stroke(g, [{ x: a, y: zy }, { x: b, y: zy }], { color: P.disp, width: 2.2, dash: [7, 5] });
    stroke(g, [{ x: a, y: zy - 6 }, { x: a, y: zy + 6 }], { color: P.disp, width: 2 });
    stroke(g, [{ x: b, y: zy - 6 }, { x: b, y: zy + 6 }], { color: P.disp, width: 2 });
    L.add(label, (a + b) / 2, zy + 18, { color: P.disp, align: 'center', pri: 6, size: 14, bg: false });
  };
  zone(0, J.s1, T`s_1 = ${tr(J.s1)} [m]`);
  zone(J.s1, J.s1 + J.s2, T`s_2 = ${tr(J.s2)} [m]`);
  zone(J.s1 + J.s2, J.D, T`s_3 = ${tr(J.s3)} [m]`);
  // equal-time marks behind the train
  const dt = J.T / 12;
  for (let i = 0; i * dt <= t + 1e-9; i++) {
    const x = S(f.pos(i * dt).x);
    dot(g, x, ty - 2, 4, { fill: P.vel, stroke: P.surface, width: 1.4 });
    if (show.ticks) L.add(T`${num(i * dt, dt < 1 ? 2 : dt < 10 ? 1 : 0)} [s]`, x, ty - 18, { color: P.vel, align: 'center', pri: 2, size: 13, bg: false, maxPush: 20 });
  }
  const xs = S(f.pos(t).x);
  train(g, xs, ty - 2, trainPx, P);
  const v = f.vel(t).x;
  if (show.velocity !== false && v > 1e-6) {
    const len = (v / J.V) * clamp(w * 0.12, 60, 150);
    const vy = ty - trainPx * 0.3 - 26;
    arrow(g, xs - trainPx / 2, vy, xs - trainPx / 2 + len, vy, { color: P.velVec, width: 3, head: 12 });
    L.add(T`v = ${fmt(v, 2)} [m s^-1]`, xs - trainPx / 2 + len + 10, vy, { color: P.vel, align: 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) {
    const a = f.accel(t);
    const ay = ty - trainPx * 0.3 - 54;
    if (Math.abs(a) > 1e-9) {
      const len = Math.sign(a) * 44;
      arrow(g, xs - trainPx / 2 - len / 2, ay, xs - trainPx / 2 + len / 2, ay, { color: P.acc, width: 2.6, head: 10 });
      L.add(T`${a > 0 ? 'a_1' : 'a_3'} = ${tr(Math.abs(a), 4)} [m s^-2]`, xs - trainPx / 2, ay - 18, { color: P.acc, align: 'center', pri: 5, size: 14 });
    } else {
      L.add('no acceleration: steady speed', xs - trainPx / 2, ay, { color: P.acc, align: 'center', pri: 5, size: 14 });
    }
  }

  L.draw(g, w, h);
  return null;
}
