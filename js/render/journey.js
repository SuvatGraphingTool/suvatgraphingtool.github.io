// journey.js — the stage for a journey in stages.
//
// Two pictures of one trip, one above the other and sharing the clock:
//
//   · ABOVE, the speed–time graph the paper sketches: a straight piece per
//     stage, each speed at a stage change marked on the speed axis with a
//     dashed line across to its corner, each time it changes marked on the
//     time axis with a dashed line up to it — the way the mark schemes draw
//     it — and each stage bracketed under the axis with its own time. The
//     area under it fills in as the clock runs, in the displacement hue,
//     because that area IS the distance, and each stage's piece is named
//     once the clock has passed it. Speed along the track is horizontal, so
//     its line is dashed, as on every graph of horizontal motion on this site.
//   · BELOW, the way from A to B as the question has it: a road with traffic
//     lights where a car starts or stops, a railway between two stations, a
//     running track from the start line to the finish. Where each stage
//     happens along it, the traveller (js/render/figures.js), the equal-time
//     marks it leaves — bunched where it is slow, spread where it is fast,
//     the same story as the graph told in distance — and its velocity and
//     acceleration as arrows.
//
// Everything drawn is read from js/core/journey.js (rule 4). The view frames
// the whole journey and does not pan.

import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, cssVar, fade } from './util.js';
import { FIGURES, post, surface, phaseFor, trafficLights } from './figures.js';
import { T, num } from '../notation.js';
import { figure as tr } from '../core/journey.js';

/** The end of the way, as the question's place has it: lights where a car or
    a bike starts or stops, a station for a train, a line across a running
    track. A and B are always named. What it puts up is reserved, so no label
    is written over it. `len` is the traveller's drawn length: a station's
    platform is long enough for the train standing at it. */
function landmark(g, L, X, Y, letter, atRest, ground, P, { finish = false, len = 60, tall = 60 } = {}) {
  const hold = (x0, y0, x1, y1) => L.reserve({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) });
  const plate = (H) => hold(X - 16, Y - H - 28, X + 16, Y + 6);
  if (ground === 'track') {
    // a line across the track, and its letter on a post at the side
    stroke(g, [{ x: X, y: Y - 2 }, { x: X, y: Y + 16 }], { color: P.ink, width: 3 });
    if (finish) for (let k = 0; k < 4; k++) { g.save(); g.fillStyle = k % 2 ? P.card : P.ink; g.fillRect(X + 2, Y + k * 4, 5, 4); g.restore(); }
    post(g, L, X, Y, letter, P.ink, P, { height: 78 });
    plate(78);
    L.add(finish ? 'finish' : 'start', X, Y - 78 - 42, { color: P.muted, align: 'center', pri: 3, size: 13, bg: false });
    return;
  }
  if (ground === 'road' && atRest) {
    // the stop line, and traffic lights tall enough that the traveller's
    // arrows pass under the lamps; the letter beside the head, on the side
    // away from the way
    const H = 118;
    stroke(g, [{ x: X, y: Y }, { x: X, y: Y + 16 }], { color: P.ink, width: 3 });
    trafficLights(g, X, Y, H, P, { lit: letter === 'A' ? 'green' : 'red' });
    hold(X - 4, Y - H - 30, X + 4, Y);
    hold(X - 14, Y - H - 30, X + 14, Y - H + 30);
    L.add(letter, X + (letter === 'A' ? -26 : 26), Y - H, { color: P.ink, align: 'center', pri: 10, size: 17, weight: 700, bg: false });
    return;
  }
  if (ground === 'rail') {
    // a station: a platform as long as the train, behind the track, under a
    // canopy on two columns; the name board on a post at the platform's end
    const x0 = X - len - 18, x1 = X + 18, top = Y - 18, roof = Y - tall - 26;
    g.save();
    g.fillStyle = P.grid; g.fillRect(x0, top, x1 - x0, 18);
    g.restore();
    stroke(g, [{ x: x0, y: top }, { x: x1, y: top }], { color: P.axis, width: 2 });
    stroke(g, [{ x: x0, y: top }, { x: x0, y: Y }], { color: P.axis, width: 1.4 });
    for (const cx of [x0 + 10, x1 - 10]) stroke(g, [{ x: cx, y: top }, { x: cx, y: roof }], { color: P.faint, width: 2.4 });
    g.save(); g.fillStyle = P.faint;
    g.beginPath(); g.moveTo(x0 - 8, roof + 2); g.lineTo(x0 + 6, roof - 10); g.lineTo(x1 - 6, roof - 10); g.lineTo(x1 + 8, roof + 2); g.closePath(); g.fill();
    g.restore();
    post(g, L, X, Y, letter, P.ink, P, { height: tall + 52 });
    plate(tall + 52);
    return;
  }
  post(g, L, X, Y, letter, P.ink, P, { height: 86 });
  plate(86);
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'journey') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const J = f.J, answers = f.answers || [];
  const who = FIGURES[f.who] ? f.who : 'car', fig = FIGURES[who];
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  // the times each stage ends, from the start
  const ends = [0];
  for (let i = 1; i <= J.n; i++) ends.push(ends[i - 1] + J.t[i]);
  const top = Math.max(...J.w) || 1;

  // ── the graph, above
  const gx0 = 250, gx1 = w - 60, gy0 = 60, gy1 = Math.round(h * 0.46);
  const X = (tt) => gx0 + (tt / J.T) * (gx1 - gx0);
  const vTop = top * 1.22;
  const Y = (v) => gy1 - (v / vTop) * (gy1 - gy0);
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx1 + 16, y: gy1 }], { color: P.axis, width: 2 });
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx0, y: gy0 - 16 }], { color: P.axis, width: 2 });
  // the axis names and the speeds sit inside the axes, clear of the readouts
  // on the left whatever they say
  L.add(T`v [m s^-1]`, gx0 + 10, gy0 - 22, { color: P.muted, align: 'left', pri: 4, size: 14, bg: false });
  L.add(T`t [s]`, gx1 + 20, gy1, { color: P.muted, align: 'left', pri: 4, size: 14, bg: false });
  const pts = (t0, t1) => {
    const out = [];
    for (let i = 0; i <= 80; i++) { const tt = t0 + (i / 80) * (t1 - t0); out.push({ x: X(tt), y: Y(f.speed(tt)) }); }
    return out;
  };
  // the area so far: the distance from A
  if (t > 0) {
    g.save(); g.beginPath(); g.moveTo(X(0), Y(0));
    for (const p of pts(0, t)) g.lineTo(p.x, p.y);
    g.lineTo(X(t), Y(0)); g.closePath();
    g.fillStyle = fade(g, P.disp, gy0, gy1, 0.34, 0.08); g.fill(); g.restore();
  }
  // each speed at a change, on the speed axis, dashed across to the first
  // corner at it; a speed the paper left out named as what was found: V = 4
  const speedsSaid = [];
  for (let i = 0; i <= J.n; i++) {
    const v = J.w[i];
    if (v < 1e-9 || speedsSaid.some((s) => Math.abs(s - v) < 1e-9)) continue;
    speedsSaid.push(v);
    // the furthest corner left at this speed, so the dash runs to where the
    // speed is first reached
    const tc = ends[i] - (i > 0 && J.kinds[i - 1] === 'hold' ? J.t[i] : 0);
    if (tc > 1e-9) stroke(g, [{ x: gx0, y: Y(v) }, { x: X(tc), y: Y(v) }], { color: P.faint, width: 1.2, dash: [3, 4] });
    stroke(g, [{ x: gx0 - 6, y: Y(v) }, { x: gx0, y: Y(v) }], { color: P.axis, width: 1.6 });
    const nm = Object.entries(f.named || {}).find(([k]) => Math.abs(J.w[k] - v) < 1e-9)?.[1];
    L.add(nm ? T`${nm} = ${tr(v)}` : tr(v), gx0 + 8, Y(v) - 12, { color: P.vel, align: 'left', pri: nm ? 9 : 8, size: 15, weight: 700, maxPush: 20 });
  }
  // each time a stage changes, on the time axis, dashed up to its corner
  for (let i = 1; i <= J.n; i++) {
    const tc = ends[i];
    if (i < J.n && J.t[i] < 1e-9) continue;
    const v = J.w[i];
    if (i < J.n && v > 1e-9) stroke(g, [{ x: X(tc), y: gy1 }, { x: X(tc), y: Y(v) }], { color: P.faint, width: 1.2, dash: [3, 4] });
    stroke(g, [{ x: X(tc), y: gy1 }, { x: X(tc), y: gy1 + 6 }], { color: P.axis, width: 1.6 });
    L.add(tr(tc), X(tc), gy1 + 16, { color: P.muted, align: 'center', pri: 6, size: 14, bg: false, maxPush: 0 });
  }
  L.add('0', X(0), gy1 + 16, { color: P.muted, align: 'center', pri: 6, size: 14, bg: false, maxPush: 0 });
  // the whole graph, faint ahead of the clock and strong behind it
  stroke(g, pts(0, J.T), { color: P.vel, width: 1.6, dash: [6, 4], alpha: 0.4 });
  if (t > 0) stroke(g, pts(0, t), { color: P.vel, width: 2.8, dash: [6, 4] });
  // each stage as a bracket under the axis, with its own time
  const tb = gy1 + 34;
  for (let i = 1; i <= J.n; i++) {
    if (J.t[i] < 1e-9) continue;
    const a = X(ends[i - 1]) + 2, b = X(ends[i]) - 2;
    stroke(g, [{ x: a, y: tb - 6 }, { x: a, y: tb }, { x: b, y: tb }, { x: b, y: tb - 6 }], { color: P.faint, width: 1.4 });
    // as much of its name as fits: never a bare number, which would read as a time
    const name = b - a > 150 ? `stage ${i}: ${T`t_${i} = ${tr(J.t[i])} [s]`}` : b - a > 70 ? T`t_${i} = ${tr(J.t[i])}` : b - a > 24 ? T`t_${i}` : '';
    if (name) L.add(name, (a + b) / 2, tb + 15, { color: P.muted, align: 'center', pri: 5, size: 14, bg: false, maxPush: 0 });
  }
  // each stage's piece of the area, named once the clock has passed it, in
  // the piece if it is wide enough to hold its name
  for (let i = 1; i <= J.n; i++) {
    if (J.t[i] < 1e-9 || t < ends[i] - 1e-9) continue;
    const x0 = X(ends[i - 1]), x1 = X(ends[i]);
    if (x1 - x0 < 110) continue;
    const lowV = Math.min(J.w[i - 1], J.w[i]);
    // a rectangle (or the rectangle under a trapezium) holds it in its
    // middle; a triangle low down, towards its tall side
    const tri = lowV < top * 0.3 && J.kinds[i - 1] !== 'hold';
    const cx = tri ? x0 + (J.w[i] > J.w[i - 1] ? 0.62 : 0.38) * (x1 - x0) : (x0 + x1) / 2;
    const cy = Y(tri ? Math.max(J.w[i], J.w[i - 1]) * 0.26 : lowV * 0.5);
    L.add(T`s_${i} = ${tr(J.s[i])} [m]`, cx, cy, { color: P.disp, align: 'center', pri: 7, size: 15, weight: 700 });
  }
  // the cursor, and the instants a question asked about
  stroke(g, [{ x: X(t), y: gy1 }, { x: X(t), y: gy0 - 8 }], { color: P.muted, width: 1.6, dash: [5, 5] });
  dot(g, X(t), Y(f.speed(t)), 5, { fill: P.surface, stroke: P.vel, width: 2.4 });
  for (const ans of answers) {
    for (const ta of ans.times || (ans.t != null ? [ans.t] : [])) {
      if (t < ta - 1e-9) continue;
      dot(g, X(ta), Y(f.speed(ta)), 7, { stroke: P.mark, width: 2.4 });
    }
  }

  // ── the way from A to B, below
  const ty = Math.round(h * 0.84);
  const lorryPx = clamp(w * 0.08, 60, 110);
  const figPx = lorryPx * fig.size;
  const figLen = who === 'runner' ? figPx * 0.5 : figPx;
  const sx0 = Math.max(gx0, figLen + 36), sx1 = w - 60;
  const S = (s) => sx0 + (s / J.D) * (sx1 - sx0);
  g.save(); g.fillStyle = cssVar('--hover', 'rgba(255,255,255,.06)'); g.fillRect(0, ty, w, h - ty); g.restore();
  surface(g, fig.ground, 0, w, ty - 3, P);
  const tall = lorryPx * fig.top + 6;
  landmark(g, L, S(0), ty - 3, 'A', J.w[0] === 0, fig.ground, P, { len: figLen, tall });
  landmark(g, L, S(J.D), ty - 3, 'B', J.w[J.n] === 0, fig.ground, P, { finish: true, len: figLen, tall });
  // where each stage happens, as dashed displacement brackets under the way
  const zy = ty + 30;
  for (let i = 1; i <= J.n; i++) {
    if (J.s[i] < 1e-9) continue;
    let s0 = 0; for (let k = 1; k < i; k++) s0 += J.s[k];
    const a = S(s0) + 2, b = S(s0 + J.s[i]) - 2;
    stroke(g, [{ x: a, y: zy }, { x: b, y: zy }], { color: P.disp, width: 2.2, dash: [7, 5] });
    stroke(g, [{ x: a, y: zy - 6 }, { x: a, y: zy + 6 }], { color: P.disp, width: 2 });
    stroke(g, [{ x: b, y: zy - 6 }, { x: b, y: zy + 6 }], { color: P.disp, width: 2 });
    L.add(b - a > 90 ? T`s_${i} = ${tr(J.s[i])} [m]` : T`s_${i}`, (a + b) / 2, zy + 18, { color: P.disp, align: 'center', pri: 6, size: 14, bg: false });
  }
  // equal-time marks behind the traveller
  const dt = niceStep(J.T, 12);         // round times: 25 s, 50 s, not 8.3 s
  for (let i = 0; i * dt <= t + 1e-9; i++) {
    const x = S(f.pos(i * dt).x);
    dot(g, x, ty - 3, 4, { fill: P.vel, stroke: P.surface, width: 1.4 });
    if (show.ticks) L.add(T`${num(i * dt, dt < 1 ? 2 : 1, { trim: true })} [s]`, x, ty - 20, { color: P.vel, align: 'center', pri: 2, size: 13, bg: false, maxPush: 20 });
  }
  const xs = S(f.pos(t).x), v = f.vel(t).x;
  // the traveller is reserved too: no label is written over it
  L.reserve({ x: xs - figLen - 4, y: ty - 3 - lorryPx * fig.top - 6, w: figLen + 8, h: lorryPx * fig.top + 6 });
  fig.draw(g, xs, ty - 3, figPx, P, { phase: phaseFor(who, figPx, xs - S(0)), still: who === 'runner' && v < 1e-6 });
  const mid = xs - figLen / 2;
  if (show.velocity !== false && v > 1e-6) {
    const len = (v / top) * clamp(w * 0.12, 60, 150);
    const vy = ty - 3 - lorryPx * fig.mid;
    // from the front forwards, its label after the head; near B, where that
    // would run through B's post, it points forwards from behind the
    // traveller instead, its label behind its tail
    const ahead = xs + 6 + len + 160 < S(J.D) - 24;
    const x0 = ahead ? xs + 6 : xs - figLen - 8 - len, x1 = x0 + len;
    arrow(g, x0, vy, x1, vy, { color: P.velVec, width: 3, head: 12 });
    L.add(T`v = ${fmt(v, 2)} [m s^-1]`, ahead ? x1 + 10 : x0 - 10, vy, { color: P.vel, align: ahead ? 'left' : 'right', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration !== false) {
    const a = f.accel(t);
    const ay = ty - 3 - lorryPx * fig.top - 30;
    if (t >= f.tMax - 1e-9) {
      // nothing to say about the stage it has finished
    } else if (Math.abs(a) > 1e-9) {
      const len = Math.sign(a) * 44;
      arrow(g, mid - len / 2, ay, mid + len / 2, ay, { color: P.acc, width: 2.6, head: 10 });
      // above its arrow, the size the paper gives, with its stage's name
      const i = f.stageAt(t).i;
      L.add(T`a_${i} = ${tr(Math.abs(a))} [m s^-2]`, mid, ay - 18, { color: P.acc, align: 'center', pri: 6, size: 14, maxPush: 40 });
    } else {
      L.add('no acceleration: steady speed', mid, ay, { color: P.acc, align: 'center', pri: 5, size: 14, maxPush: 40 });
    }
  }

  L.draw(g, w, h);
  return null;
}
