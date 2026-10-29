// column.js — the stage for two particles in one vertical line.
//
// Side-on, and tall rather than wide: the ground, a height scale, the line
// both particles move along, and whatever each one starts from — the ground
// itself, or a platform on a tower reaching out to the line at the height it
// is released from. Drawn from js/core/pair.js and claiming nothing that file
// did not compute (rule 4).
//
//   · A and B on the one line, as the question has them. Their histories sit
//     either side of it — A's equal-time marks to the left, B's to the right,
//     in the path colours every flight on this site uses (--vel for the one
//     object, --second for the second) — and each side has two lanes: the
//     way up nearer the line, the way down further out, so a throw that
//     comes back down does not print its descent on top of its ascent.
//   · velocity as vertical arrows in the velocity hue, solid because they are
//     vertical (rule 2), each on its own particle's side of the line;
//   · the gap between them as a solid displacement bracket, because closing
//     that gap is the whole question;
//   · a particle that has not set off yet is held where it starts, and says
//     when it sets off;
//   · the meeting, once it has happened: a mark at the point and a line
//     across at that height, with the time and the height the engine found.
//
// The view frames the whole motion and does not pan, like the road's. On a
// narrow canvas everything beside the line closes up together rather than
// running under the readouts or off the edge.

import { dust, splash, pulse, flash, ageOf } from './effects.js';
import { landscape } from './scenery.js';
import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, cssVar, ballSprite } from './util.js';
import { T, num } from '../notation.js';

const BALL = 9;              // drawn at a size you can see, not at the size it is
// Distances out from the line at full size, the same on both sides.
const LANE = { arrow: 16, up: 30, down: 44, letter: 62, acc: 84, tower: [140, 200] };
const HUD = 250;             // the readouts' column, top left, and the scale's labels beside it
const LABELS = 140;          // room for the labels right of whatever is right of the line

/** A tower beside the line, and a platform from it to the line at height y. */
function tower(g, cx, yPx, groundY, dir, k, P) {
  const near = cx + dir * LANE.tower[0] * k, far = cx + dir * LANE.tower[1] * k;
  const x0 = Math.min(near, far), x1 = Math.max(near, far);
  g.save();
  g.fillStyle = cssVar('--hover', 'rgba(255,255,255,.06)');
  g.strokeStyle = P.faint; g.lineWidth = 1.4;
  g.beginPath(); g.rect(x0, yPx, x1 - x0, groundY - yPx); g.fill(); g.stroke();
  // windows, so it reads as a building and not as a bar on a chart
  g.fillStyle = P.grid;
  for (let y = yPx + 14; y < groundY - 18; y += 26) {
    for (let x = x0 + 9; x < x1 - 13; x += 18) g.fillRect(x, y, 8, 12);
  }
  g.restore();
  // the platform, out to the line, with a brace under it
  const tip = cx + dir * (BALL + 2);
  stroke(g, [{ x: near, y: yPx }, { x: tip, y: yPx }], { color: P.strong, width: 3 });
  stroke(g, [{ x: near, y: Math.min(yPx + 26, groundY) }, { x: near + (tip - near) * 0.45, y: yPx }], { color: P.faint, width: 1.6 });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'pair') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const { A, B, meet } = f;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the frame: the ground to a little above the highest point either reaches
  const top = Math.max(f.top, 2);
  const groundY = Math.round(h - 74), topY = 46;
  const ky = (groundY - topY) / (top * 1.08);
  const Y = (y) => groundY - y * ky;

  // ── across: the scale, the line, the towers and the labels, closed up
  // together on a canvas too narrow for them at full size
  const leftRaw = A.h > 1e-6 ? LANE.tower[1] : LANE.letter + 20;
  const rightRaw = B.h > 1e-6 ? LANE.tower[1] + 26 : LANE.acc + 16;
  const k = clamp((w - HUD - 70 - LABELS) / (leftRaw + rightRaw), 0.5, 1);
  const cx = Math.round(Math.max(HUD + 70 + leftRaw * k, Math.min(w * 0.42, w - LABELS - rightRaw * k)));
  const outR = cx + rightRaw * k;
  const rx = Math.max(HUD, cx - leftRaw * k - 70);
  const lane = (name) => LANE[name] * k;

  // ── ground
  landscape(g, w, h, groundY, { far: 'hills', seed: 23 });

  // ── the height scale, on the left
  const step = niceStep(top * 1.08, 6);
  stroke(g, [{ x: rx, y: Y(0) }, { x: rx, y: Y(top * 1.06) }], { color: P.faint, width: 1.4 });
  for (let m = 0; m <= top * 1.06 + 1e-9; m += step) {
    stroke(g, [{ x: rx - 7, y: Y(m) }, { x: rx, y: Y(m) }], { color: P.faint, width: 1.4 });
    L.add(`${fmt(m, step < 1 ? 1 : 0)} m`, rx - 12, Y(m), { color: P.muted, align: 'right', pri: 1, bg: false, size: 15 });
    if (show.grid && m > 0) stroke(g, [{ x: rx, y: Y(m) }, { x: w - 20, y: Y(m) }], { color: P.grid, width: 1 });
  }
  if (Math.abs(A.g) > 1e-9) {
    L.add(`${T`g = ${num(A.g, 2, { trim: true })} [m s^-2]`}, downwards`, rx - 40, groundY + 46,
      { color: show.acceleration ? P.acc : P.muted, align: 'left', pri: 3, size: 15, bg: false });
  }

  // ── what each starts from: a tower for one released above the ground
  if (A.h > 1e-6) tower(g, cx, Y(A.h), groundY, -1, k, P);
  if (B.h > 1e-6) tower(g, cx, Y(B.h), groundY, 1, k, P);

  // ── the line they share
  stroke(g, [{ x: cx, y: groundY }, { x: cx, y: topY - 10 }], { color: P.faint, width: 1.2, dash: [4, 6] });

  // ── the meeting, once it has happened
  const met = meet && t >= meet.t - 1e-9;
  if (met) {
    const my = Y(meet.x);
    { const { age, life } = ageOf(t, meet.t, f.tMax); pulse(g, (rx + w - 24) / 2, my, age, life, P.mark); }
    stroke(g, [{ x: rx, y: my }, { x: w - 24, y: my }], { color: P.mark, width: 1.8, dash: [7, 5] });
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      stroke(g, [{ x: cx + Math.cos(an) * 15, y: my + Math.sin(an) * 15 },
                 { x: cx + Math.cos(an) * 24, y: my + Math.sin(an) * 24 }], { color: P.mark, width: 2.4 });
    }
    L.add(`they meet ${T`${num(meet.x, 2, { trim: true })} [m]`} up`, outR, my - 16, { color: P.mark, align: 'left', pri: 10, size: 16, weight: 700 });
    L.add(T`t = ${num(meet.t, 3, { trim: true })} [s]`, outR, my + 14, { color: P.mark, align: 'left', pri: 10, size: 16, weight: 700 });
  }

  // ── each particle's history: a mark at equal steps of time, on its own
  // side, the way down a lane further out than the way up
  const dt = niceStep(f.tMax, 8);
  const dp = dt >= 1 ? 0 : dt >= 0.1 ? 1 : 2;
  const marks = (p, side, color) => {
    for (let i = Math.ceil(p.t0 / dt - 1e-9); i * dt <= t + 1e-9; i++) {
      const tt = i * dt;
      const y = Y(p.pos(tt));
      const x = cx + side * (f.rising(p, tt) ? lane('up') : lane('down'));
      dot(g, x, y, 3.8, { fill: color, stroke: P.surface, width: 1.4 });
      if (show.ticks) {
        // The way up is labelled just beyond the lanes, the way down a column
        // further out, so the two times at one height are both readable. A
        // label level with a platform drops below it.
        const up = f.rising(p, tt);
        const ly = Math.abs(y - Y(p.h)) < 10 && p.h > 1e-6 ? y + 13 : y;
        L.add(T`${num(tt, dp)} [s]`, cx + side * (lane('down') + (up ? 9 : 52)), ly,
          { color, align: side < 0 ? 'right' : 'left', pri: up ? 3 : 2, size: 13, bg: false, maxPush: 20 });
      }
    }
  };
  marks(A, -1, P.vel);
  marks(B, 1, P.second);

  // ── the gap between them, while both are in the air
  const now = f.at(t);
  const yA = Y(now.A.x), yB = Y(now.B.x);
  if (!met && Math.abs(yA - yB) > 14) {
    const bx = outR;
    stroke(g, [{ x: cx + BALL + 4, y: yA }, { x: bx - 8, y: yA }], { color: P.disp, width: 1, dash: [2, 4], alpha: 0.55 });
    stroke(g, [{ x: cx + BALL + 4, y: yB }, { x: bx - 8, y: yB }], { color: P.disp, width: 1, dash: [2, 4], alpha: 0.55 });
    stroke(g, [{ x: bx, y: yA }, { x: bx, y: yB }], { color: P.disp, width: 2.6 });
    stroke(g, [{ x: bx - 7, y: yA }, { x: bx + 7, y: yA }], { color: P.disp, width: 2.2 });
    stroke(g, [{ x: bx - 7, y: yB }, { x: bx + 7, y: yB }], { color: P.disp, width: 2.2 });
    L.add(`apart ${T`${fmt(Math.abs(f.gap(t)), 2)} [m]`}`, bx + 14, (yA + yB) / 2,
      { color: P.disp, align: 'left', pri: 8, size: 16, weight: 700 });
  }

  // ── the two particles, their velocities, and their accelerations
  const vMax = Math.max(1e-6, ...[A, B].map((p) => Math.max(Math.abs(p.u), isFinite(p.vLand) ? Math.abs(p.vLand) : 0)));
  const vLen = clamp(h * 0.16, 50, 120) / vMax;
  const draw = (p, s, side, ring, name) => {
    const y = Y(s.x);
    const held = s.stage?.kind === 'held' || s.stage === null;
    if (show.velocity !== false && Math.abs(s.v) > 1e-6) {
      const len = clamp(Math.abs(s.v) * vLen, 14, 160) * Math.sign(s.v);
      const ax = cx + side * lane('arrow');
      arrow(g, ax, y, ax, y - len, { color: P.velVec, width: 3, head: 11 });
      // the label at the arrow's tip, but never on the ground line
      let ly = y - len - Math.sign(len) * 10;
      if (ly > groundY - 10) ly = Math.max(ly, groundY + 16);
      L.add(T`${fmt(s.v, 2)} [m s^-1]`, ax + side * 6, ly, {
        color: P.vel, align: side < 0 ? 'right' : 'left', pri: 7, size: 15, weight: 700 });
    }
    if (show.acceleration && !held && s.stage && Math.abs(p.g) > 1e-9) {
      const ax = cx + side * lane('acc');
      arrow(g, ax, y - 16, ax, y + 16, { color: P.acc, width: 2.6, head: 10 });
    }
    ballSprite(g, cx, y, BALL, { ring, fired });
    if (ring) dot(g, cx, y, BALL + 3, { stroke: ring, width: 2 });
    L.add(name, cx + side * lane('letter'), y, {
      color: P.ink, align: 'center', pri: 9, size: 17, weight: 700 });
    if (held && p.t0 > 1e-9) {
      // above it, on the line, clear of the bracket out to the side
      L.add(`sets off at ${T`t = ${num(p.t0, 2, { trim: true })} [s]`}`, cx, y - 30, {
        color: P.muted, align: 'center', pri: 6, size: 14 });
    }
  };
  draw(A, now.A, -1, null, 'A');
  draw(B, now.B, 1, P.second, 'B');

  L.draw(g, w, h);
  return null;
}
