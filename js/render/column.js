// column.js — the stage for two particles in one vertical line.
//
// Side-on, and tall rather than wide: a place under a sky — a lawn with
// hills behind — a height scale, the line both particles move along, and
// whatever each one starts from: the ground, where a person throws it up,
// or the roof of a solid brick tower block (windows with frames, a parapet,
// lit from the left), with a slab out from the roof towards the line and a
// person at its end who holds it out and lets it go. Drawn from
// js/core/pair.js and claiming nothing that file did not compute (rule 4).
//
//   · A and B on the one line, as the question has them, the stadium's
//     shaded football each, B ringed in its second colour. Their histories
//     sit either side of the line — A's equal-time marks to the left, B's to
//     the right, in the path colours every flight on this site uses (--vel
//     for the one object, --second for the second) — and each side has two
//     lanes: the way up nearer the line, the way down further out, so a
//     throw that comes back down does not print its descent on its ascent.
//   · velocity as vertical arrows in the velocity hue, solid because they are
//     vertical (rule 2), each on its own particle's side of the line;
//   · the gap between them as a solid displacement bracket, because closing
//     that gap is the whole question;
//   · a particle that has not set off yet is held where it starts, and says
//     when it sets off; its thrower is wound up until then;
//   · the meeting, once it has happened: a ring spreading from the two balls
//     at the engine's time, a line across at that height, and the time and
//     the height the engine found.
//
// The view frames the whole motion. On a narrow canvas everything beside
// the line closes up, the building runs off the edge rather than the balls,
// and the meeting and the gap are said in a caption under the ground rather
// than beside the line, where they had no room.

import { pulse, ageOf } from './effects.js';
import { landscape, env, rng, softShadow } from './scenery.js';
import { thrower, throwerHand, ballAt, THROWER_MIN } from './figures.js';
import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, sig3 } from './util.js';
import { T, num } from '../notation.js';

const BALL = 9;              // drawn at a size you can see, not at the size it is
// Distances out from the line at full size, the same on both sides.
const LANE = { arrow: 16, up: 30, down: 44, letter: 62, acc: 84, tower: 82 };
// The readouts this kit shows (js/kits/pair.js): four boxes down the top
// left, the clock top right. Measured in the app at laptop and phone widths.
const HUD_L = { w: 190, h: 300 }, HUD_L_PHONE = { w: 160, h: 266 };
const HUD_R = { w: 150, h: 88 }, HUD_R_PHONE = { w: 140, h: 80 };
const TAU = Math.PI * 2;

/* ── materials ─────────────────────────────────────────────────────────── */

/** A stone band (a coping, a sill, a slab edge): lit on top, a shadow under. */
function band(g, x, y, w, h) {
  const E = env();
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, E.night ? '#cbbdb5' : '#f1e9df'); gr.addColorStop(1, E.night ? '#857770' : '#b9ab9f');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = E.shadow; g.fillRect(x, y + h, w, Math.min(3, h * 0.6));
}

/** A glazed window: a painted frame, a glazing bar, the sky (or a lit room) in the glass, a sill. */
function windowPane(g, x, y, w, h, { lit = false } = {}) {
  if (w < 4 || h < 4) return;
  const E = env(), fr = clamp(Math.min(w, h) * 0.13, 1.5, 3.5);
  g.fillStyle = E.night ? '#d9cfc5' : '#f6f1ea'; g.fillRect(x, y, w, h);
  const gx = x + fr, gy = y + fr, gw = w - 2 * fr, gh = h - 2 * fr;
  const gl = g.createLinearGradient(gx, gy, gx + gw * 0.6, gy + gh);
  if (lit) { gl.addColorStop(0, '#ffd9a8'); gl.addColorStop(1, '#d9925c'); }
  else if (E.night) { gl.addColorStop(0, '#4c5868'); gl.addColorStop(1, '#262b35'); }
  else { gl.addColorStop(0, '#cfe3ee'); gl.addColorStop(1, '#6f93ab'); }
  g.fillStyle = gl; g.fillRect(gx, gy, gw, gh);
  g.save(); g.beginPath(); g.rect(gx, gy, gw, gh); g.clip();
  g.fillStyle = `rgba(255,255,255,${E.night && !lit ? 0.12 : 0.26})`;
  g.beginPath(); g.moveTo(gx + gw * 0.2, gy); g.lineTo(gx + gw * 0.55, gy); g.lineTo(gx, gy + gh * 0.6); g.lineTo(gx, gy + gh * 0.3); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = E.night ? '#d9cfc5' : '#f6f1ea';
  if (h > 12) g.fillRect(x, y + h * 0.4 - fr * 0.4, w, fr * 0.8);
  if (w > 16) g.fillRect(x + w / 2 - fr * 0.4, y, fr * 0.8, h);
  g.fillStyle = E.shadow; g.fillRect(x + fr, y + fr, gw, 1.5);
  band(g, x - 1.5, y + h, w + 3, clamp(h * 0.08, 2, 4));
}

/**
 * A tower block between x0 and x1 standing on the ground at Y, its flat
 * roof at y = top: courses of brick with a tint per brick, floors of framed
 * windows (some lit at night), a plinth, a parapet with a stone coping, and
 * the light from the left — the side away from `dir` (the line's side) in
 * shade. Opaque: nothing behind it shows through.
 */
export function building(g, x0, x1, top, Y, { storey = 30, seed = 11 } = {}) {
  const E = env(), r = rng(seed), w = x1 - x0;
  if (w <= 2 || Y - top <= 2) return;
  softShadow(g, (x0 + x1) / 2 + 6, Y + 1, w * 0.62, 6, 0.95);
  g.save(); g.beginPath(); g.rect(x0, top, w, Y - top); g.clip();
  g.fillStyle = E.night ? '#74463c' : '#b0644e'; g.fillRect(x0, top, w, Y - top);
  // bricks
  const c = clamp(storey / 8, 3.5, 6), bw = c * 2.3;
  for (let row = 0, yy = Y; yy > top - c; row++, yy -= c) {
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x0 - off; xx < x1; xx += bw) {
      const v = r();
      g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.2 * (0.5 - v)})` : `rgba(255,236,220,${0.15 * (v - 0.5)})`;
      g.fillRect(xx + 0.6, yy - c + 0.6, bw - 1.2, c - 1.2);
    }
  }
  g.strokeStyle = E.night ? 'rgba(25,15,12,0.45)' : 'rgba(236,222,206,0.5)'; g.lineWidth = 1;
  g.beginPath();
  for (let row = 0, yy = Y; yy > top; row++, yy -= c) {
    g.moveTo(x0, Math.round(yy) + 0.5); g.lineTo(x1, Math.round(yy) + 0.5);
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x0 - off; xx < x1; xx += bw) { g.moveTo(Math.round(xx) + 0.5, yy); g.lineTo(Math.round(xx) + 0.5, yy - c); }
  }
  g.stroke();
  // floors: a band of stone at each, and a row of framed windows
  const cols = Math.max(1, Math.round((w - 8) / 26));
  const ww = Math.min(16, (w - 8) / cols * 0.58), wh = clamp(storey * 0.52, 8, 26);
  for (let yb = Y - storey, i = 0; yb > top + 6; yb -= storey, i++) {
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x0, yb, w, 2);
    for (let j = 0; j < cols; j++) {
      const wx = x0 + 4 + ((w - 8) / cols) * (j + 0.5) - ww / 2, wy = yb + storey * 0.22;
      if (wy + wh > Y - 6) continue;
      windowPane(g, wx, wy, ww, wh, { lit: E.night && r() < 0.4 });
    }
  }
  // a door at the foot
  const dw = clamp(w * 0.22, 10, 24), dh = clamp(storey * 0.75, 16, 32);
  const dx = x0 + w * 0.5 - dw / 2;
  const dg = g.createLinearGradient(dx, 0, dx + dw, 0);
  dg.addColorStop(0, E.night ? '#3b4a5c' : '#3d5a78'); dg.addColorStop(1, E.night ? '#23303e' : '#2a4058');
  g.fillStyle = dg; g.fillRect(dx, Y - dh, dw, dh);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(dx + dw / 2 - 0.5, Y - dh, 1, dh);
  // the plinth, and the light: from the left, the right-hand side in shade
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0, Y - 5, w, 5);
  const lg = g.createLinearGradient(x0, 0, x1, 0);
  lg.addColorStop(0, 'rgba(255,238,220,0.14)'); lg.addColorStop(0.55, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = lg; g.fillRect(x0, top, w, Y - top);
  g.restore();
  // the parapet and its coping
  g.fillStyle = E.night ? '#5d382f' : '#94503e'; g.fillRect(x0 - 1, top - 6, w + 2, 6);
  band(g, x0 - 3, top - 9, w + 6, 4);
}

/** A slab out from a roof at y = top, from x0 to x1: a concrete edge, its
    underside in shade, a strut beneath, and a rail along the far side. */
function slab(g, x0, x1, top, near) {
  const E = env();
  const a = Math.min(x0, x1), b = Math.max(x0, x1);
  g.fillStyle = E.shadow;
  g.beginPath(); g.moveTo(near, top + 6); g.lineTo(near, top + 6 + Math.min(34, (b - a) * 0.5)); g.lineTo(near + (x1 > x0 ? 1 : -1) * (b - a) * 0.7, top + 6); g.closePath(); g.fill();
  const metal = E.night ? '#9a9094' : '#5d5559';
  g.strokeStyle = metal; g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(near, top + 6 + Math.min(30, (b - a) * 0.45)); g.lineTo(near + (x1 > x0 ? 1 : -1) * (b - a) * 0.62, top + 6); g.stroke();
  band(g, a, top, b - a, 6);
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'pair') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const phone = w < 520;
  const hl = phone ? HUD_L_PHONE : HUD_L, hr = phone ? HUD_R_PHONE : HUD_R;
  L.reserve({ x: 0, y: 0, w: hl.w, h: hl.h });
  L.reserve({ x: w - hr.w, y: 0, w: hr.w, h: hr.h });
  const { A, B, meet } = f;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the frame: the ground to a little above the highest point either
  // reaches, with room over a roof for whoever stands on it
  const top = Math.max(f.top, 2);
  const groundY = Math.round(h - (phone ? 76 : 70)), topY = phone ? 86 : 46;
  const ky = (groundY - topY - 10) / (top * 1.06);
  const Y = (y) => groundY - y * ky;
  const TH = clamp(1.8 * ky, THROWER_MIN, phone ? 64 : 84);

  // ── across: the scale, the line, the towers and the labels, closed up
  // together on a canvas too narrow for them at full size
  const towerW = phone ? 92 : 130;
  const k = phone ? 0.62 : 1;
  const lane = (name) => LANE[name] * k;
  const hasTower = (p) => p.h > 1e-6;
  // what stands beside the line on each side: a tower, a thrower on the ground, or nothing
  const sideW = (p) => hasTower(p) ? lane('tower') + towerW : (Math.abs(p.u) > 1e-9 ? Math.max(lane('letter') + 12, TH * 0.75) : lane('letter') + 12);
  const leftRaw = sideW(A), rightRaw = sideW(B);
  const info = phone ? 0 : 168;                     // the gap and the meeting, beside the right side
  let cx, rx;
  if (phone) {
    // the line just clear of the readouts; a tower on the right may run off the edge
    cx = Math.round(clamp(w - 24 - rightRaw, hl.w + 26, w * 0.62));
    rx = w - 6;
  } else {
    rx = hl.w + 58;
    cx = Math.round(Math.max(rx + 18 + leftRaw, Math.min(w * 0.46, w - 16 - info - rightRaw)));
  }
  const outR = Math.min(w - info + 12, cx + rightRaw + 18);

  // ── the place
  landscape(g, w, h, groundY, { far: 'hills', seed: 23 });

  // ── the height scale: on the left on a laptop, on the right edge of a phone
  const step = niceStep(top * 1.06, 6);
  stroke(g, [{ x: rx, y: Y(0) }, { x: rx, y: Y(top * 1.04) }], { color: P.faint, width: 1.4 });
  for (let m = 0; m <= top * 1.04 + 1e-9; m += step) {
    stroke(g, [{ x: rx - 7, y: Y(m) }, { x: rx, y: Y(m) }], { color: P.faint, width: 1.4 });
    L.add(`${fmt(m, step < 1 ? 1 : 0)} m`, rx - 11, Y(m), { color: P.muted, align: 'right', pri: 1, bg: phone, size: 14, maxPush: 0 });
    if (show.grid && m > 0) stroke(g, [{ x: phone ? 0 : rx, y: Y(m) }, { x: phone ? rx : w - 20, y: Y(m) }], { color: P.grid, width: 1 });
  }

  // ── what each starts from, and who sets it off
  const people = [];
  const start = (p, side) => {
    const set = p.t0 <= 1e-9 || t >= p.t0 - 1e-9;      // has it set off yet
    const pose = fired && set ? 1 : 0;
    if (hasTower(p)) {
      // the person holds it out over the line from the end of a slab off the roof
      const aim = p.u > 1e-9 ? 60 : p.u < -1e-9 ? -40 : -4;
      const hand = throwerHand(TH, aim);
      const yH = Y(p.h);                                 // the ball's centre at the start
      const feet = Math.min(yH + hand.y, Y(p.h) + (groundY - Y(p.h)) / 3);
      const fx = cx + side * (hand.x + BALL * 0.7);
      const near = cx + side * lane('tower'), far = near + side * towerW;
      building(g, Math.min(near, far), Math.max(near, far), feet, groundY, { storey: clamp(3 * ky, 18, 40), seed: side > 0 ? 11 : 17 });
      slab(g, near, fx - side * TH * 0.3, feet, near);
      people.push(() => thrower(g, fx, feet, TH, P, { dir: side > 0 ? -1 : 1, pose, aim }));
    } else if (Math.abs(p.u) > 1e-9) {
      // on the ground beside the line, throwing it up
      const fx = cx + side * (TH * 0.2 + BALL);
      people.push(() => thrower(g, fx, groundY, TH, P, { dir: side > 0 ? -1 : 1, pose, aim: p.u > 0 ? 84 : -40 }));
    }
  };
  start(A, -1);
  start(B, 1);
  for (const draw of people) draw();

  // ── the line they share
  stroke(g, [{ x: cx, y: groundY }, { x: cx, y: topY - 10 }], { color: P.faint, width: 1.2, dash: [4, 6] });

  // ── the meeting, once it has happened
  const met = meet && t >= meet.t - 1e-9;
  if (met) {
    const my = Y(meet.x);
    stroke(g, [{ x: phone ? 0 : rx, y: my }, { x: w - (phone ? 0 : 24), y: my }], { color: P.mark, width: 1.8, dash: [7, 5] });
    // the ring spreads from the two balls, where they meet, at the engine's time
    { const { age, life } = ageOf(t, meet.t, f.tMax); pulse(g, cx, my, age, life, P.mark, { radius: 40 }); }
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * TAU;
      stroke(g, [{ x: cx + Math.cos(an) * 16, y: my + Math.sin(an) * 16 },
                 { x: cx + Math.cos(an) * 25, y: my + Math.sin(an) * 25 }], { color: P.mark, width: 2.4 });
    }
    const where = `they meet ${T`${sig3(meet.x)} [m]`} up`, when = T`t = ${sig3(meet.t)} [s]`;
    if (phone) L.add(`${where}, ${when}`, 10, groundY + 24, { color: P.mark, align: 'left', pri: 10, size: 15, weight: 700 });
    else {
      L.add(where, outR, my - 16, { color: P.mark, align: 'left', pri: 10, size: 16, weight: 700 });
      L.add(when, outR, my + 14, { color: P.mark, align: 'left', pri: 10, size: 16, weight: 700 });
    }
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
        L.add(T`${num(tt, dp)} [s]`, cx + side * (lane('down') + (up ? 9 : 52 * k)), ly,
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
    const apart = `apart ${T`${sig3(Math.abs(f.gap(t)))} [m]`}`;
    if (phone) {
      // between the line and whatever stands on its right, and said under the ground
      const bx = cx + lane('letter') + 10;
      stroke(g, [{ x: bx, y: yA }, { x: bx, y: yB }], { color: P.disp, width: 2.6 });
      for (const yy of [yA, yB]) stroke(g, [{ x: bx - 6, y: yy }, { x: bx + 6, y: yy }], { color: P.disp, width: 2.2 });
      L.add(apart, 10, groundY + 24, { color: P.disp, align: 'left', pri: 8, size: 15, weight: 700 });
    } else {
      const bx = outR;
      stroke(g, [{ x: cx + BALL + 4, y: yA }, { x: bx - 8, y: yA }], { color: P.disp, width: 1, dash: [2, 4], alpha: 0.55 });
      stroke(g, [{ x: cx + BALL + 4, y: yB }, { x: bx - 8, y: yB }], { color: P.disp, width: 1, dash: [2, 4], alpha: 0.55 });
      stroke(g, [{ x: bx, y: yA }, { x: bx, y: yB }], { color: P.disp, width: 2.6 });
      stroke(g, [{ x: bx - 7, y: yA }, { x: bx + 7, y: yA }], { color: P.disp, width: 2.2 });
      stroke(g, [{ x: bx - 7, y: yB }, { x: bx + 7, y: yB }], { color: P.disp, width: 2.2 });
      L.add(apart, bx + 14, (yA + yB) / 2, { color: P.disp, align: 'left', pri: 8, size: 16, weight: 700 });
    }
  }
  if (Math.abs(A.g) > 1e-9) {
    L.add(`${T`g = ${num(A.g, 2, { trim: true })} [m s^-2]`}, downwards`, phone ? 10 : rx - 40, groundY + (phone ? 52 : 40),
      { color: show.acceleration ? P.acc : P.muted, align: 'left', pri: 3, size: 14, bg: false });
  }

  // ── the two particles, their velocities, and their accelerations
  const vMax = Math.max(1e-6, ...[A, B].map((p) => Math.max(Math.abs(p.u), isFinite(p.vLand) ? Math.abs(p.vLand) : 0)));
  const vLen = clamp(h * 0.16, 44, 120) / vMax;
  const draw = (p, s, side, ring, name) => {
    const y = Y(s.x);
    const held = s.stage?.kind === 'held' || s.stage === null;
    if (show.velocity !== false && Math.abs(s.v) > 1e-6) {
      const len = clamp(Math.abs(s.v) * vLen, 14, 160) * Math.sign(s.v);
      const ax = cx + side * lane('arrow');
      arrow(g, ax, y, ax, y - len, { color: P.velVec, width: 3, head: 11 });
      // the label at the arrow's tip, out on its own side, never on the ground line
      let ly = y - len - Math.sign(len) * 12;
      if (ly > groundY - 10) ly = Math.max(ly, groundY + 16);
      L.add(T`${sig3(s.v)} [m s^-1]`, ax + side * 8, ly, {
        color: P.vel, align: side < 0 ? 'right' : 'left', pri: 7, size: 15, weight: 700 });
    }
    if (show.acceleration && !held && s.stage && Math.abs(p.g) > 1e-9) {
      const ax = cx + side * lane('acc');
      arrow(g, ax, y - 16, ax, y + 16, { color: P.acc, width: 2.6, head: 10 });
    }
    const yb = Math.min(y, groundY - BALL);           // a ball on the ground sits on it
    if (yb > groundY - BALL * 4) softShadow(g, cx, groundY + 1, BALL * 1.3, 3, 0.8);
    ballAt(g, cx, yb, BALL, ring);
    L.add(name, cx + side * lane('letter'), y, { color: P.ink, align: 'center', pri: 9, size: 17, weight: 700 });
    if (held && p.t0 > 1e-9) {
      // above it, on the line, clear of the bracket out to the side
      L.add(`sets off at ${T`t = ${num(p.t0, 2, { trim: true })} [s]`}`, cx, y - 32, {
        color: P.strong, align: 'center', pri: 6, size: 14 });
    }
  };
  draw(A, now.A, -1, null, 'A');
  draw(B, now.B, 1, P.second, 'B');

  L.draw(g, w, h);
  return null;
}
