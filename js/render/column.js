// column.js — the stage for two particles in one vertical line.
//
// Side-on, and tall rather than wide: the ground, a height scale, the line
// both particles move along, and whatever each one starts from — the ground
// itself, or a ledge on a tower at the height it is released from. Drawn from
// js/core/pair.js and claiming nothing that file did not compute (rule 4).
//
//   · A and B on the one line, as the question has them. Their histories sit
//     either side of it — A's equal-time marks to the left, B's to the right —
//     so the two strobe pictures can be read against each other: the marks
//     are level at the same instant only when the particles are.
//   · velocity as vertical arrows in the velocity hue, solid because they are
//     vertical (rule 2), each on its own particle's side of the line;
//   · the gap between them as a solid displacement bracket, because closing
//     that gap is the whole question;
//   · a particle that has not set off yet is held where it starts, and says
//     when it will be let go;
//   · the meeting, once it has happened: a mark at the point and a line
//     across at that height, with the time and the height the engine found.
//
// The second particle wears the second-object stone (--second), as it does
// everywhere on this site; the first is the plain ball. The view frames the
// whole motion and does not pan, like the road's.

import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, cssVar, ballSprite } from './util.js';
import { T, num } from '../notation.js';

// Distances out from the line, in px, the same on both sides: the velocity
// arrow nearest, then the equal-time marks, then the letter, then a tower.
const BALL = 9;             // drawn at a size you can see, not at the size it is
const ARROW = 17;
const SIDE = 36;
const LETTER = 50;
const TOWER = [64, 140];

/** A tower to the side of the line, with a ledge reaching the line at height y. */
function tower(g, cx, yPx, groundY, dir, P) {
  const near = cx + dir * TOWER[0], far = cx + dir * TOWER[1];
  const x0 = Math.min(near, far), x1 = Math.max(near, far);
  g.save();
  g.fillStyle = cssVar('--hover', 'rgba(255,255,255,.06)');
  g.strokeStyle = P.faint; g.lineWidth = 1.4;
  g.beginPath(); g.rect(x0, yPx, x1 - x0, groundY - yPx); g.fill(); g.stroke();
  // windows, so it reads as a building and not as a bar on a chart
  g.fillStyle = P.grid;
  for (let y = yPx + 14; y < groundY - 18; y += 26) {
    for (let x = x0 + 10; x < x1 - 14; x += 20) g.fillRect(x, y, 9, 12);
  }
  g.restore();
  // the ledge, out to the line
  stroke(g, [{ x: near, y: yPx }, { x: cx + dir * (BALL + 2), y: yPx }], { color: P.strong, width: 3 });
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
  const k = (groundY - topY) / (top * 1.08);
  const Y = (y) => groundY - y * k;
  // The readouts sit top left, four boxes deep, so the height scale stands
  // clear of them, and the line clear of the scale and of a tower on its left.
  const HUD = 210;
  const cx = Math.round(Math.max(HUD + 70 + TOWER[1], Math.min(w * 0.42, w - 340)));
  // whatever stands to the right of the line, the readouts go beyond it
  const outR = cx + (B.h > 1e-6 ? TOWER[1] + 28 : LETTER + 34);

  // ── ground
  g.save();
  g.fillStyle = cssVar('--hover', 'rgba(255,255,255,.06)');
  g.fillRect(0, groundY, w, h - groundY);
  g.restore();
  stroke(g, [{ x: 0, y: groundY }, { x: w, y: groundY }], { color: P.axis, width: 2 });

  // ── the height scale, on the left
  const step = niceStep(top * 1.08, 6);
  const rx = Math.max(HUD, cx - TOWER[1] - 70);
  stroke(g, [{ x: rx, y: Y(0) }, { x: rx, y: Y(top * 1.06) }], { color: P.faint, width: 1.4 });
  for (let m = 0; m <= top * 1.06 + 1e-9; m += step) {
    stroke(g, [{ x: rx - 7, y: Y(m) }, { x: rx, y: Y(m) }], { color: P.faint, width: 1.4 });
    L.add(`${fmt(m, step < 1 ? 1 : 0)} m`, rx - 12, Y(m), { color: P.muted, align: 'right', pri: 1, bg: false, size: 15 });
    if (show.grid && m > 0) stroke(g, [{ x: rx, y: Y(m) }, { x: w - 20, y: Y(m) }], { color: P.grid, width: 1 });
  }

  // ── what each starts from: a tower for one released above the ground
  if (A.h > 1e-6) tower(g, cx, Y(A.h), groundY, -1, P);
  if (B.h > 1e-6) tower(g, cx, Y(B.h), groundY, 1, P);

  // ── the line they share
  stroke(g, [{ x: cx, y: groundY }, { x: cx, y: topY - 10 }], { color: P.faint, width: 1.2, dash: [4, 6] });

  // ── the meeting, once it has happened
  const met = meet && t >= meet.t - 1e-9;
  if (met) {
    const my = Y(meet.x);
    stroke(g, [{ x: rx, y: my }, { x: w - 24, y: my }], { color: P.mark, width: 1.8, dash: [7, 5] });
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      stroke(g, [{ x: cx + Math.cos(an) * 15, y: my + Math.sin(an) * 15 },
                 { x: cx + Math.cos(an) * 24, y: my + Math.sin(an) * 24 }], { color: P.mark, width: 2.4 });
    }
    L.add(`they meet ${T`${fmt(meet.x, 2)} [m]`} up`, outR, my - 16, { color: P.mark, align: 'left', pri: 10, size: 16, weight: 700 });
    L.add(T`t = ${fmt(meet.t, 2)} [s]`, outR, my + 14, { color: P.mark, align: 'left', pri: 10, size: 16, weight: 700 });
  }

  // ── each particle's history: a mark at equal steps of time, on its own side
  const dt = niceStep(f.tMax, 8);
  const marks = (p, side, color) => {
    for (let tt = Math.ceil(p.t0 / dt - 1e-9) * dt; tt <= t + 1e-9; tt += dt) {
      if (tt < p.t0 - 1e-9) continue;
      const y = Y(p.pos(tt));
      dot(g, cx + side * SIDE, y, 3.8, { fill: color, stroke: P.surface, width: 1.4 });
      if (show.ticks) {
        L.add(T`${fmt(tt, dt < 1 ? 1 : 0)} [s]`, cx + side * (SIDE + 10), y,
          { color, align: side < 0 ? 'right' : 'left', pri: 2, size: 13, bg: false, maxPush: 20 });
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
    // faint guides out from each particle, so the bracket is plainly theirs
    stroke(g, [{ x: cx + BALL + 4, y: yA }, { x: bx - 8, y: yA }], { color: P.disp, width: 1, dash: [2, 4], alpha: 0.55 });
    stroke(g, [{ x: cx + BALL + 4, y: yB }, { x: bx - 8, y: yB }], { color: P.disp, width: 1, dash: [2, 4], alpha: 0.55 });
    stroke(g, [{ x: bx, y: yA }, { x: bx, y: yB }], { color: P.disp, width: 2.6 });
    stroke(g, [{ x: bx - 7, y: yA }, { x: bx + 7, y: yA }], { color: P.disp, width: 2.2 });
    stroke(g, [{ x: bx - 7, y: yB }, { x: bx + 7, y: yB }], { color: P.disp, width: 2.2 });
    L.add(`apart ${T`${fmt(Math.abs(f.gap(t)), 1)} [m]`}`, bx + 14, (yA + yB) / 2,
      { color: P.disp, align: 'left', pri: 8, size: 16, weight: 700 });
  }

  // ── the two particles, their velocities, and their accelerations
  const vScale = clamp(h * 0.16, 50, 120) / Math.max(1e-6, ...[A, B].map((p) => Math.max(Math.abs(p.u), Math.abs(p.vLand) || 0)));
  const draw = (p, s, side, ring, name) => {
    const y = Y(s.x);
    const held = s.stage?.kind === 'held' || (s.stage === null);
    // velocity: a vertical arrow on the particle's own side
    if (show.velocity !== false && Math.abs(s.v) > 1e-6) {
      const len = clamp(Math.abs(s.v) * vScale, 14, 160) * Math.sign(s.v);
      const ax = cx + side * ARROW;
      arrow(g, ax, y, ax, y - len, { color: P.velVec, width: 3, head: 11 });
      L.add(T`${fmt(s.v, 1)} [m s^-1]`, ax + side * 8, y - len, {
        color: P.vel, align: side < 0 ? 'right' : 'left', pri: 7, size: 15, weight: 700 });
    }
    if (show.acceleration && !held && s.stage) {
      const ax = cx + side * (LETTER + 22);
      arrow(g, ax, y - 18, ax, y + 18, { color: P.acc, width: 2.6, head: 10 });
    }
    ballSprite(g, cx, y, BALL, { ring, fired });
    if (ring) dot(g, cx, y, BALL + 3, { stroke: ring, width: 2 });
    L.add(name, cx + side * LETTER, y, {
      color: P.ink, align: side < 0 ? 'right' : 'left', pri: 9, size: 17, weight: 700 });
    if (held && p.t0 > 1e-9) {
      L.add(`let go at ${T`t = ${num(p.t0, 2, { trim: true })} [s]`}`, cx + side * LETTER, y - 24, {
        color: P.muted, align: side < 0 ? 'right' : 'left', pri: 6, size: 14 });
    }
  };
  draw(A, now.A, -1, null, 'A');
  draw(B, now.B, 1, P.second, 'B');
  if (show.acceleration && Math.abs(A.g) > 1e-9) {
    L.add(`${T`g = ${num(A.g, 2, { trim: true })} [m s^-2]`} down`, outR, topY, { color: P.acc, align: 'left', pri: 4, size: 15 });
  }

  L.draw(g, w, h);
  return null;
}
