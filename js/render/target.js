// target.js — the stage for a projectile that has to pass one point.
//
// Side on, one scale both ways, so the angle on the screen is the angle on
// the paper. A real place: a garden under a sky, the person who throws it —
// on the lawn, on a stand, leaning out of a house's window or standing at the
// edge of its roof — and the thing at the point, drawn as the thing: a brick
// wall with a coping, a tennis net, a tree with bark and a leafy crown, a
// picket fence, the end wall of a building with a glazed window in it, or a
// target board. Its height and its distance are dimension lines, a mark on
// the ground is a flag. The path flown is in the path colour; of a question
// with two answers, the other path is drawn faintly beside it, with its
// angle. Once the ball reaches the point, what happened there is said:
// cleared by how much, or hit how far below the top — and a hit is SEEN, a
// flash and a puff of dust (glass, when the window breaks) at the engine's
// own time. The velocity, with its components (horizontal dashed, vertical
// solid — rule 2), and the acceleration are on the ball.
//
// Everything drawn is read from js/core/target.js (rule 4). The thrower's
// arm is posed from the engine's angle; the effects run off its times.

import { dust, pulse, flash, ageOf, phaseOf } from './effects.js';
import { landscape, env, rng, softShadow, fitSide } from './scenery.js';
import { thrower, throwerHand, ballAt, THROWER_MIN } from './figures.js';
import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, withAlpha, sig3 } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
// The readouts this kit shows (js/kits/target.js): five boxes down the top
// left, the clock top right. Measured in the app at laptop and phone widths.
const HUD = 185, HUD_H = 376;                 // laptop: the column's width and depth
const HUD_PHONE = { w: 150, h: 330 };         // phone (< 520 px)
const TAU = Math.PI * 2;

/* ── materials ─────────────────────────────────────────────────────────── */

/** Brickwork in the box: courses, staggered joints, a tint per brick, and
    the light from the left. `course` is a course's height in px. */
function bricks(g, x, y, w, h, { course = 6, seed = 5, base = null } = {}) {
  if (w <= 0 || h <= 0) return;
  const E = env(), r = rng(seed);
  const c = Math.max(2, course), bw = c * 2.3;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = base || (E.night ? '#7a473c' : '#b4644d'); g.fillRect(x, y, w, h);
  for (let row = 0, yy = y + h; yy > y - c; row++, yy -= c) {
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += bw) {
      const v = r();
      g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.2 * (0.5 - v)})` : `rgba(255,236,220,${0.16 * (v - 0.5)})`;
      g.fillRect(xx + 0.6, yy - c + 0.6, bw - 1.2, c - 1.2);
    }
  }
  // the mortar, where the courses are big enough to see it
  g.strokeStyle = E.night ? 'rgba(25,15,12,0.5)' : 'rgba(236,222,206,0.55)'; g.lineWidth = c >= 3.5 ? 1 : 0.5;
  g.beginPath();
  for (let row = 0, yy = y + h; yy > y; row++, yy -= c) {
    g.moveTo(x, Math.round(yy) + 0.5); g.lineTo(x + w, Math.round(yy) + 0.5);
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += bw) { g.moveTo(Math.round(xx) + 0.5, yy); g.lineTo(Math.round(xx) + 0.5, yy - c); }
  }
  g.stroke();
  const lg = g.createLinearGradient(x, 0, x + w, 0);
  lg.addColorStop(0, 'rgba(255,238,220,0.12)'); lg.addColorStop(0.6, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = lg; g.fillRect(x, y, w, h);
  g.restore();
}

/** A stone band (a coping, a sill, a lintel): lit on top, a shadow under. */
function band(g, x, y, w, h) {
  const E = env();
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, E.night ? '#cbbdb5' : '#f1e9df'); gr.addColorStop(1, E.night ? '#857770' : '#b9ab9f');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = E.shadow; g.fillRect(x, y + h, w, Math.min(3, h * 0.6));
}

/** A glazed window in the box: a painted frame, a cross of glazing bars,
    glass that holds the sky (or a lit room at night), a glare, a stone sill. */
function windowPane(g, x, y, w, h, { lit = false, sill = true } = {}) {
  if (w < 4 || h < 4) return;
  const E = env(), fr = clamp(Math.min(w, h) * 0.12, 1.5, 4);
  g.save();
  g.fillStyle = E.night ? '#d9cfc5' : '#f6f1ea'; g.fillRect(x, y, w, h);
  const gx = x + fr, gy = y + fr, gw = w - 2 * fr, gh = h - 2 * fr;
  const gl = g.createLinearGradient(gx, gy, gx + gw * 0.6, gy + gh);
  if (lit) { gl.addColorStop(0, '#ffd9a8'); gl.addColorStop(1, '#d9925c'); }
  else if (E.night) { gl.addColorStop(0, '#4c5868'); gl.addColorStop(1, '#262b35'); }
  else { gl.addColorStop(0, '#cfe3ee'); gl.addColorStop(1, '#6f93ab'); }
  g.fillStyle = gl; g.fillRect(gx, gy, gw, gh);
  // glare: a pale diagonal across the upper pane
  g.save(); g.beginPath(); g.rect(gx, gy, gw, gh); g.clip();
  g.fillStyle = `rgba(255,255,255,${E.night && !lit ? 0.12 : 0.28})`;
  g.beginPath(); g.moveTo(gx + gw * 0.15, gy); g.lineTo(gx + gw * 0.45, gy); g.lineTo(gx, gy + gh * 0.55); g.lineTo(gx, gy + gh * 0.25); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = E.night ? '#d9cfc5' : '#f6f1ea';
  if (w > 14) g.fillRect(x + w / 2 - fr * 0.4, y, fr * 0.8, h);
  if (h > 14) g.fillRect(x, y + h * 0.5 - fr * 0.4, w, fr * 0.8);
  g.strokeStyle = E.night ? 'rgba(0,0,0,0.5)' : 'rgba(60,40,30,0.45)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.restore();
  if (sill) band(g, x - 2, y + h, w + 4, clamp(h * 0.08, 2.5, 5));
}

/** A tiled pitched roof over [x0, x1] from the eave at y up to `apex`. */
function tiledRoof(g, x0, x1, y, apex) {
  const E = env(), mid = (x0 + x1) / 2;
  g.save();
  g.beginPath(); g.moveTo(x0, y); g.lineTo(mid, apex); g.lineTo(x1, y); g.closePath();
  const rg = g.createLinearGradient(x0, apex, x1, y);
  rg.addColorStop(0, E.night ? '#7d4337' : '#b45a45'); rg.addColorStop(1, E.night ? '#4a2620' : '#7e3a2c');
  g.fillStyle = rg; g.fill();
  g.clip();
  // rows of tiles, each a scalloped edge
  const row = clamp((y - apex) / 7, 4, 8), tile = row * 1.3;
  g.strokeStyle = E.night ? 'rgba(20,8,6,0.55)' : 'rgba(70,25,18,0.45)'; g.lineWidth = 1;
  for (let yy = y - 1, i = 0; yy > apex; yy -= row, i++) {
    g.beginPath();
    for (let xx = x0 - (i % 2 ? tile / 2 : 0); xx < x1; xx += tile) { g.moveTo(xx, yy); g.quadraticCurveTo(xx + tile / 2, yy + row * 0.45, xx + tile, yy); }
    g.stroke();
  }
  // the light on the left slope
  g.fillStyle = 'rgba(255,230,210,0.10)';
  g.beginPath(); g.moveTo(x0, y); g.lineTo(mid, apex); g.lineTo(mid, y); g.closePath(); g.fill();
  g.restore();
  // ridge and fascia
  g.fillStyle = E.night ? '#3a1f1a' : '#5e2c22'; g.fillRect(mid - 4, apex - 2, 8, 4);
  band(g, x0, y - 1, x1 - x0, 4);
}

/* ── the launch ────────────────────────────────────────────────────────── */

/** A house side on, its wall's outer face at x = edge, standing on the
    ground at Y, w px wide. With 'window', the thrower's window has its sill
    at y = sill (and `win` gives the opening, { x, y, w, h }); with 'roof',
    the house is flat-roofed with a parapet at y = sill, where the thrower
    stands. Brick, a tiled roof (over the window house), framed windows, a
    door with a step. */
export function house(g, edge, sill, Y, w, from, P, { win = null, eave = null, seed = 13, storey = 40 } = {}) {
  const E = env();
  const x0 = edge - w;
  const top = from === 'roof' ? sill : (eave ?? sill - (Y - sill) * 0.45);
  softShadow(g, edge - w / 2, Y + 1, w * 0.62, 6, 0.9);
  bricks(g, x0, top, w, Y - top, { course: clamp(storey / 40, 2, 7), seed });
  // a plinth of darker brick at the foot
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x0, Y - clamp(storey * 0.12, 3, 7), w, clamp(storey * 0.12, 3, 7));
  // the other windows: a column per bay, a row per storey, clear of the thrower's
  // windows and doors at their true size: 3 m storeys, 1 m by 1.25 m windows, 2.1 m doors
  const ww = Math.max(3, storey * 0.33), wh = Math.max(4, storey * 0.42);
  const bays = Math.max(1, Math.floor((w - 10) / (ww * 2.1)));
  for (let yb = Y - storey * 0.3; yb - wh > top + 2; yb -= storey) {
    for (let b = 0; b < bays; b++) {
      const wx = x0 + (w / bays) * (b + 0.5) - ww / 2;
      if (win && wx + ww > win.x - 6 && wx < win.x + win.w + 6 && yb > win.y - 6 && yb - wh < win.y + win.h + 6) continue;
      // the door, on the ground floor of the first bay
      if (b === 0 && yb > Y - storey * 0.6 && w > ww * 3) {
        const dh = storey * 0.7, dw = storey * 0.3;
        const dg = g.createLinearGradient(wx, 0, wx + dw, 0);
        dg.addColorStop(0, E.night ? '#3b4a5c' : '#3d5a78'); dg.addColorStop(1, E.night ? '#23303e' : '#2a4058');
        g.fillStyle = dg; g.fillRect(wx, Y - dh, dw, dh);
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1; g.strokeRect(wx + 2.5, Y - dh + 2.5, dw - 5, dh * 0.4);
        g.fillStyle = '#d9b26a'; g.beginPath(); g.arc(wx + dw - 3, Y - dh * 0.48, 1.4, 0, TAU); g.fill();
        band(g, wx - 2, Y - dh - 3, dw + 4, 3);
        continue;
      }
      windowPane(g, wx, yb - wh, ww, wh, { lit: E.night && (b + Math.round(yb)) % 3 === 0 });
    }
  }
  // the thrower's window: open, a dim room behind
  if (win) {
    const ig = g.createLinearGradient(0, win.y, 0, win.y + win.h);
    // a lamp-lit room, so whoever leans out stands against the light
    ig.addColorStop(0, E.night ? '#8a6040' : '#a88a70'); ig.addColorStop(1, E.night ? '#4a3326' : '#6d5446');
    g.fillStyle = ig; g.fillRect(win.x, win.y, win.w, win.h);
  }
  // the shade on the wall's far side, and its edge
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(edge - 3, top, 3, Y - top);
  if (from === 'roof') {
    // a flat roof: a parapet with a stone coping
    band(g, x0 - 3, top - 4, w + 6, 5);
  } else {
    tiledRoof(g, x0 - 8, edge + 8, top, top - w * 0.42);
    // a chimney on the back slope
    const cx = x0 + w * 0.22, cw = clamp(w * 0.1, 6, 14), ch = w * 0.3;
    const slope = top - (w * 0.42) * ((cx - (x0 - 8)) / ((w + 16) / 2));
    bricks(g, cx, slope - ch * 0.6, cw, ch * 0.6 + 2, { course: 4, seed: seed + 3 });
    band(g, cx - 2, slope - ch * 0.6 - 3, cw + 4, 3);
  }
}

/** The thrower's open window's frame, drawn over them: the casement and the sill. */
function openFrame(g, win) {
  const E = env(), fr = clamp(win.w * 0.08, 2, 4);
  g.fillStyle = E.night ? '#d9cfc5' : '#f6f1ea';
  g.fillRect(win.x - fr, win.y - fr, win.w + 2 * fr, fr);          // head
  g.fillRect(win.x - fr, win.y - fr, fr, win.h + fr);              // the far jamb
  // the casement, swung open against the wall on the far side
  g.save(); g.globalAlpha = 0.95;
  g.fillStyle = E.night ? '#4c5868' : '#a9c6d6';
  g.fillRect(win.x - fr - win.w * 0.28, win.y + 2, win.w * 0.28, win.h - 4);
  g.strokeStyle = E.night ? '#d9cfc5' : '#f6f1ea'; g.lineWidth = fr * 0.8;
  g.strokeRect(win.x - fr - win.w * 0.28, win.y + 2, win.w * 0.28, win.h - 4);
  g.restore();
  band(g, win.x - fr - 2, win.y + win.h, win.w + 2 * fr + 6, clamp(win.h * 0.08, 3, 5));
}

/** A raised stand for the thrower: a planked deck at y = top from x0 to x1,
    scaffold legs to the ground at Y, cross braces, a guard rail at the back. */
function stand(g, x0, x1, top, Y, H) {
  const E = env();
  const metal = E.night ? '#8a8086' : '#7d7377', dark = E.night ? '#4b4347' : '#4f474b';
  softShadow(g, (x0 + x1) / 2, Y + 1, (x1 - x0) * 0.7, 5, 0.8);
  const legs = [x0 + 3, x1 - 3];
  g.lineCap = 'round';
  // braces first, behind the legs
  g.strokeStyle = dark; g.lineWidth = 1.8;
  for (let yy = top + 6, i = 0; yy < Y - 8; yy += Math.max(18, (x1 - x0) * 0.8), i++) {
    const y2 = Math.min(Y - 2, yy + Math.max(18, (x1 - x0) * 0.8));
    g.beginPath(); g.moveTo(legs[i % 2], yy); g.lineTo(legs[(i + 1) % 2], y2); g.stroke();
    g.beginPath(); g.moveTo(legs[0], y2); g.lineTo(legs[1], y2); g.stroke();
  }
  for (const lx of legs) {
    const lg = g.createLinearGradient(lx - 2, 0, lx + 2, 0); lg.addColorStop(0, '#d8d0cc'); lg.addColorStop(1, metal);
    g.strokeStyle = lg; g.lineWidth = 3.4; g.beginPath(); g.moveTo(lx, top + 2); g.lineTo(lx, Y); g.stroke();
    g.fillStyle = dark; g.fillRect(lx - 4, Y - 2, 8, 3);
  }
  // the deck: planks, end on
  const d = clamp(H * 0.09, 4, 7);
  const dg = g.createLinearGradient(0, top, 0, top + d);
  dg.addColorStop(0, E.night ? '#a07a52' : '#c79a68'); dg.addColorStop(1, E.night ? '#5e4329' : '#8a6340');
  g.fillStyle = dg; g.fillRect(x0 - 2, top, x1 - x0 + 4, d);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1;
  for (let x = x0 + 6; x < x1; x += 8) { g.beginPath(); g.moveTo(x + 0.5, top + 1); g.lineTo(x + 0.5, top + d); g.stroke(); }
  // the guard rail behind
  const rh = H * 0.55;
  g.strokeStyle = metal; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(x0 + 2, top); g.lineTo(x0 + 2, top - rh); g.lineTo(x0 + (x1 - x0) * 0.45, top - rh); g.stroke();
  g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0 + 2, top - rh / 2); g.lineTo(x0 + (x1 - x0) * 0.45, top - rh / 2); g.stroke();
}

/* ── the things at the point ───────────────────────────────────────────── */

/** A garden wall centred on x, its top at y = top: brick, a stone coping. */
function brickWall(g, x, top, Y, k) {
  const tw = clamp(0.35 * k, 6, 24), cop = clamp(0.1 * k, 3, 7);
  softShadow(g, x + tw * 0.3, Y + 1, tw * 1.6, 4, 0.9);
  bricks(g, x - tw / 2, top + cop, tw, Y - top - cop, { course: clamp(0.075 * k, 2, 7), seed: 9 });
  band(g, x - tw / 2 - 2.5, top, tw + 5, cop);
}

/** A tennis net side on at x: a post, the net's mesh hanging from a cord,
    the white tape along its top at y = top. */
function tennisNet(g, x, top, Y) {
  const E = env();
  softShadow(g, x, Y + 1, 14, 3, 0.8);
  // the mesh, a narrow strip seen nearly end on
  g.save();
  g.beginPath(); g.rect(x - 5, top + 3, 10, Y - top - 3); g.clip();
  g.fillStyle = 'rgba(20,20,22,0.35)'; g.fillRect(x - 5, top + 3, 10, Y - top);
  g.strokeStyle = E.night ? 'rgba(235,235,235,0.55)' : 'rgba(40,40,44,0.65)'; g.lineWidth = 0.9;
  for (let yy = top - 10; yy < Y + 10; yy += 4) { g.beginPath(); g.moveTo(x - 5, yy); g.lineTo(x + 5, yy + 6); g.moveTo(x - 5, yy + 6); g.lineTo(x + 5, yy); g.stroke(); }
  g.restore();
  // the post, a painted tube with a cap
  const pg = g.createLinearGradient(x - 3, 0, x + 3, 0);
  pg.addColorStop(0, E.night ? '#6d7f6f' : '#4f7a5a'); pg.addColorStop(0.4, E.night ? '#a8baa9' : '#8fbf9a'); pg.addColorStop(1, E.night ? '#33433a' : '#2c4a35');
  g.fillStyle = pg; g.fillRect(x - 2.5, top, 5, Y - top);
  g.fillStyle = E.night ? '#d0d6d2' : '#e8ece9'; g.fillRect(x - 3.5, top - 2, 7, 3);
  // the tape
  g.fillStyle = '#f7f5f0'; g.fillRect(x - 6, top, 12, 3);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 6, top + 3, 12, 1);
}

/** A tree at x, the top of its crown at y = top: a tapered trunk with bark
    and roots, two boughs, and a crown of leafy clumps lit from the left. */
function tree(g, x, top, Y, seed = 17) {
  const E = env(), r = rng(seed);
  const Ht = Y - top;
  const crownH = Ht * 0.62, crownW = clamp(Ht * 0.66, 26, 180);
  const cy = top + crownH * 0.5;
  const tw = clamp(Ht * 0.075, 4, 20);
  softShadow(g, x + crownW * 0.08, Y + 1, crownW * 0.55, clamp(crownW * 0.06, 3, 8), 0.95);
  // the trunk: flared at the roots, tapering into the crown
  const tTop = top + crownH * 0.6;
  const tg = g.createLinearGradient(x - tw, 0, x + tw, 0);
  tg.addColorStop(0, E.night ? '#7a5d48' : '#9a7254'); tg.addColorStop(0.45, E.night ? '#5b4334' : '#73523b'); tg.addColorStop(1, E.night ? '#2f221b' : '#45301f');
  g.fillStyle = tg;
  g.beginPath();
  g.moveTo(x - tw * 1.25, Y); g.quadraticCurveTo(x - tw * 0.5, Y - tw * 0.4, x - tw * 0.5, Y - tw * 1.2);
  g.lineTo(x - tw * 0.32, tTop); g.lineTo(x + tw * 0.32, tTop);
  g.lineTo(x + tw * 0.5, Y - tw * 1.2); g.quadraticCurveTo(x + tw * 0.5, Y - tw * 0.4, x + tw * 1.25, Y);
  g.closePath(); g.fill();
  // boughs up into the crown
  g.strokeStyle = E.night ? '#4a372b' : '#5e4330'; g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.lineWidth = Math.max(1.5, tw * 0.35);
    g.beginPath(); g.moveTo(x, tTop + crownH * 0.12); g.quadraticCurveTo(x + s * crownW * 0.12, tTop - crownH * 0.05, x + s * crownW * 0.25, tTop - crownH * 0.2); g.stroke();
  }
  // bark: dark furrows down the trunk
  g.strokeStyle = 'rgba(0,0,0,0.32)'; g.lineWidth = 1;
  for (let i = 0; i < Math.max(2, tw / 2.5); i++) {
    const bx = x - tw * 0.4 + (i + 0.5) * (tw * 0.8) / Math.max(2, tw / 2.5);
    g.beginPath(); g.moveTo(bx, Y - 2);
    for (let yy = Y - 2; yy > tTop + 4; yy -= 6) g.lineTo(bx + (r() - 0.5) * 2, yy);
    g.stroke();
  }
  // the crown: clumps in an ellipse, the topmost touching y = top exactly
  const clumps = [];
  const R0 = crownW * 0.24;
  clumps.push({ x, y: top + R0, rr: R0 });
  for (let i = 0; i < 15; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 0.8;
    const rr = crownW * (0.15 + r() * 0.1);
    let cx = x + Math.cos(a) * d * (crownW / 2 - rr * 0.5), cyy = cy + Math.sin(a) * d * (crownH / 2 - rr * 0.4);
    cyy = Math.max(cyy, top + rr);
    clumps.push({ x: cx, y: cyy, rr });
  }
  const leaf = E.night ? ['#26331d', '#3b4b29', '#5c6e3c'] : ['#35501f', '#557a31', '#8bb150'];
  // the back: shadowed
  g.fillStyle = leaf[0];
  for (const c of clumps) { g.beginPath(); g.arc(c.x + c.rr * 0.12, c.y + c.rr * 0.18, c.rr, 0, TAU); g.fill(); }
  // the front: each clump lit from the upper left
  for (const c of clumps) {
    const gr = g.createRadialGradient(c.x - c.rr * 0.4, c.y - c.rr * 0.45, c.rr * 0.1, c.x, c.y, c.rr);
    gr.addColorStop(0, leaf[2]); gr.addColorStop(0.55, leaf[1]); gr.addColorStop(1, leaf[0]);
    g.fillStyle = gr; g.beginPath(); g.arc(c.x, c.y, c.rr * 0.9, 0, TAU); g.fill();
  }
  // leaves: flecks of light along the lit sides
  g.fillStyle = withAlpha(leaf[2], 0.7);
  for (const c of clumps) for (let j = 0; j < 4; j++) {
    const a = Math.PI * (1.05 + r() * 0.6), d = c.rr * (0.4 + r() * 0.45);
    g.beginPath(); g.ellipse(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 2.2, 1.4, a, 0, TAU); g.fill();
  }
}

/** A garden fence at x, from the ground at Y up to top, running across the
    throw a few metres either way: slim pointed pickets with daylight between
    them, two rails behind, square posts at intervals, every picket's point
    and every post's cap at the fence's height. */
export function fence(g, x, top, Y, P, k = 20) {
  const E = env();
  const run = clamp(3.6 * k, 70, 150), x0 = x - run / 2, hgt = Y - top;
  const pw = clamp(0.09 * k, 3, 6), gap = pw * 1.1;
  const wood = E.night ? ['#c2ab88', '#857052', '#4e3f2c'] : ['#efe5d0', '#c9b594', '#8c7655'];
  softShadow(g, x, Y + 1, run * 0.55, 4, 0.9);
  // the rails, behind the pickets, with the light on their top edge
  for (const fr of [0.22, 0.72]) {
    const ry = top + hgt * fr, rh = clamp(hgt * 0.05, 2.5, 5);
    g.fillStyle = wood[2]; g.fillRect(x0, ry, run, rh);
    g.fillStyle = withAlpha(wood[0], 0.5); g.fillRect(x0, ry, run, 1);
  }
  // posts, square, every metre and a half or so, capped flat at the fence's height
  const postEvery = Math.max(26, 1.6 * k), postW = pw * 1.7;
  const posts = [];
  for (let px = x0; px <= x0 + run + 0.01; px += postEvery) posts.push(px);
  for (let px = x0 + pw; px <= x0 + run - pw; px += pw + gap) {
    if (posts.some((q) => Math.abs(q - px) < postW)) continue;
    const tip = Math.min(pw * 0.9, hgt * 0.2);
    const pg = g.createLinearGradient(px, 0, px + pw, 0);
    pg.addColorStop(0, wood[0]); pg.addColorStop(1, wood[1]);
    g.fillStyle = pg;
    g.beginPath(); g.moveTo(px, Y); g.lineTo(px, top + tip); g.lineTo(px + pw / 2, top); g.lineTo(px + pw, top + tip); g.lineTo(px + pw, Y); g.closePath(); g.fill();
    g.fillStyle = withAlpha(wood[2], 0.35); g.fillRect(px + pw - 1, top + tip, 1, hgt - tip);
  }
  for (const px of posts) {
    const pg = g.createLinearGradient(px - postW / 2, 0, px + postW / 2, 0); pg.addColorStop(0, wood[1]); pg.addColorStop(1, wood[2]);
    g.fillStyle = pg; g.fillRect(px - postW / 2, top, postW, hgt);
    g.fillStyle = wood[0]; g.fillRect(px - postW / 2 - 1, top, postW + 2, 2);
  }
}

/** The end wall of a building at x, facing the throw, rising to y = top: the
    building runs back to the right. With `win` ({ hi, lo } in px), a glazed
    window in it between those heights, its glass seen edge on in the wall's
    face as well. */
function endWall(g, x, top, Y, bw, win, k) {
  const E = env();
  softShadow(g, x + bw / 2, Y + 1, bw * 0.6, 5, 0.8);
  bricks(g, x, top, bw, Y - top, { course: clamp(0.075 * k, 2, 7), seed: 31, base: E.night ? '#6e4c43' : '#a76450' });
  // the roof, running back from the eave over the wall
  const rise = Math.min(top - 6, bw * 0.4, (Y - top) * 0.6);
  if (rise > 8) tiledRoof(g, x - 6, x + bw + 6, top, top - rise);
  else band(g, x - 3, top - 5, bw + 6, 6);
  // a storey's windows along the side, beyond the one it is aimed at
  const storey = 3 * k, pw = storey * 0.33, ph = storey * 0.42;      // true size
  for (let yb = Y - storey * 0.3; yb - ph > top + 6; yb -= storey) {
    for (let xx = x + Math.max(pw * 3, (win ? clamp((win.lo - win.hi) * 0.8, 14, 46) : 0) + 14); xx + pw < x + bw - 4 && pw > 3; xx += pw * 2.6) {
      windowPane(g, xx, yb - ph, pw, ph, { lit: E.night && Math.round(xx + yb) % 3 === 0 });
    }
  }
  // the face itself, in light: a pale return so the wall reads as solid
  const fg = g.createLinearGradient(x, 0, x + 6, 0);
  fg.addColorStop(0, 'rgba(255,240,226,0.30)'); fg.addColorStop(1, 'rgba(255,240,226,0)');
  g.fillStyle = fg; g.fillRect(x, top, 6, Y - top);
  if (win) {
    const ww = clamp((win.lo - win.hi) * 0.8, 14, 46);
    windowPane(g, x + 7, win.hi, ww, win.lo - win.hi, { lit: E.night });
    // the glass, edge on in the face
    g.fillStyle = E.night ? '#8fb2c8' : '#5d8fb0'; g.fillRect(x - 1, win.hi, 3, win.lo - win.hi);
    band(g, x - 5, win.lo, 12, 3);
  }
}

/** A target board on a pole, its bull at (x, y). */
function targetBoard(g, x, y, Y, rb) {
  const E = env();
  softShadow(g, x, Y + 1, rb, 3, 0.8);
  const pg = g.createLinearGradient(x - 2, 0, x + 2, 0); pg.addColorStop(0, '#b08a62'); pg.addColorStop(1, '#5e4630');
  g.fillStyle = pg; g.fillRect(x - 2, y + rb * 0.6, 4, Y - y - rb * 0.6);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x + 1.5, y + 2, rb, 0, TAU); g.fill();
  const rings = E.night ? ['#e9e2d6', '#2b2628', '#e9e2d6', '#2b2628'] : ['#fbf6ec', '#2b2628', '#fbf6ec', '#2b2628'];
  rings.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, rb * (1 - i * 0.2), 0, TAU); g.fill(); });
  g.fillStyle = palette().mark; g.beginPath(); g.arc(x, y, rb * 0.2, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, rb, 0, TAU); g.stroke();
}

/** A flag on the ground at x: a pole and a pennant in the mark's colour. */
function flagAt(g, x, Y, H, P) {
  softShadow(g, x, Y + 1, 8, 2.5, 0.8);
  const pg = g.createLinearGradient(x - 1.5, 0, x + 1.5, 0); pg.addColorStop(0, '#f3efe9'); pg.addColorStop(1, '#9d958f');
  g.fillStyle = pg; g.fillRect(x - 1.5, Y - H, 3, H);
  g.fillStyle = P.mark;
  g.beginPath(); g.moveTo(x + 1.5, Y - H); g.quadraticCurveTo(x + 10, Y - H + 2, x + 18, Y - H + 6); g.quadraticCurveTo(x + 10, Y - H + 9, x + 1.5, Y - H + 13); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(x + 1.5, Y - H); g.quadraticCurveTo(x + 10, Y - H + 2, x + 18, Y - H + 6); g.lineTo(x + 1.5, Y - H + 5); g.closePath(); g.fill();
}

/** The near edge of the lawn, from y0 down to y1: the grass deepening
    towards the viewer, tufts and a scatter of flowers, so a wide garden has a
    foreground rather than a flat green field under the flight. */
function foreground(g, w, y0, y1, seed = 61) {
  if (y1 - y0 < 70) return;
  const E = env(), r = rng(seed);
  const gr = g.createLinearGradient(0, y0 + (y1 - y0) * 0.35, 0, y1);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, E.night ? 'rgba(0,0,0,0.35)' : 'rgba(40,60,20,0.25)');
  g.fillStyle = gr; g.fillRect(0, y0, w, y1 - y0);
  const blade = E.night ? ['#3c4728', '#56643a'] : ['#5d7a33', '#7f9c48'];
  g.lineCap = 'round';
  for (let i = 0; i < w / 5; i++) {
    const x = r() * w, d = 0.45 + r() * 0.55, y = y0 + (y1 - y0) * d, hgt = 4 + 9 * d * r();
    g.strokeStyle = blade[r() < 0.5 ? 0 : 1]; g.lineWidth = 1 + d;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1, y - hgt * 0.6, x + (r() - 0.5) * 6, y - hgt); g.stroke();
  }
  const petals = E.night ? ['#cfc7bd', '#c9b37a'] : ['#ffffff', '#f2d16b'];
  for (let i = 0; i < w / 40; i++) {
    const x = r() * w, y = y0 + (y1 - y0) * (0.5 + r() * 0.48), s = 1.4 + r() * 1.6;
    g.fillStyle = petals[i % 2];
    for (let p = 0; p < 5; p++) { const a = p * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.7, 0, TAU); g.fill(); }
    g.fillStyle = '#e0a83a'; g.beginPath(); g.arc(x, y, s * 0.5, 0, TAU); g.fill();
  }
}

/* ── the moment it hits ───────────────────────────────────────────────── */

/** A puff thrown back off a surface at (x, y), towards `dir`: brick dust,
    leaves or glass. Drawing only: its age is from the engine's hit time. */
function puff(g, x, y, age, life, dir, color, { n = 14, seed = 3, size = 1, fall = 1 } = {}) {
  const u = phaseOf(age, life); if (u == null) return;
  const r = rng(seed), e = 1 - (1 - u) ** 3;
  g.save();
  for (let i = 0; i < n; i++) {
    const a = (r() - 0.5) * Math.PI * 0.9, sp = (14 + r() * 26) * size;
    const px = x + dir * Math.cos(a) * sp * e, py = y + Math.sin(a) * sp * e + 34 * fall * size * u * u;
    g.fillStyle = withAlpha(color, 0.75 * (1 - u));
    g.beginPath(); g.arc(px, py, (1.4 + r() * 2.2) * size, 0, TAU); g.fill();
  }
  g.restore();
}

/** Cracks spreading over glass from (x, y), clipped to the pane; `u` 0..1. */
function cracks(g, x, y, clip, u) {
  const r = rng(77);
  g.save(); g.beginPath(); g.rect(clip.x, clip.y, clip.w, clip.h); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.1;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + r() * 0.4, L = (10 + r() * 22) * Math.min(1, 0.4 + u);
    g.beginPath(); g.moveTo(x, y);
    let px = x, py = y;
    for (let s = 1; s <= 3; s++) { px = x + Math.cos(a + (r() - 0.5) * 0.4) * L * s / 3; py = y + Math.sin(a + (r() - 0.5) * 0.4) * L * s / 3; g.lineTo(px, py); }
    g.stroke();
  }
  g.beginPath(); g.arc(x, y, 5, 0, TAU); g.stroke();
  g.restore();
}

/* ── the stage ─────────────────────────────────────────────────────────── */

/** A person `H` px tall, at the scene's own scale: the shared thrower,
    scaled down when the scene makes a person smaller than it will draw one,
    so a 9 m tree stands five people tall and never shorter than the thrower. */
function person(g, X, Y, H, P, opts) {
  if (H >= THROWER_MIN) return thrower(g, X, Y, H, P, opts);
  const s = H / THROWER_MIN;
  g.save(); g.translate(X, Y); g.scale(s, s); thrower(g, 0, 0, THROWER_MIN, P, opts); g.restore();
}
function handOf(H, aim) {
  if (H >= THROWER_MIN) return throwerHand(H, aim);
  const q = throwerHand(THROWER_MIN, aim), s = H / THROWER_MIN;
  return { x: q.x * s, y: q.y * s };
}
/** A measured length for a tag: in centimetres under 10 cm, so a near miss
    reads as one (0.0596 m is 6.0 cm), otherwise three significant figures. */
const len = (x) => (Math.abs(x) < 0.1 ? T`${num(x * 100, Math.abs(x) < 0.01 ? 2 : 1)} [cm]` : T`${sig3(x)} [m]`);
/** Keep labels off a drawn line: small boxes along it. */
function reserveLine(L, pts, r = 6) {
  let last = null;
  for (const p of pts) {
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < r * 1.5) continue;
    L.reserve({ x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r }); last = p;
  }
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'target') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), E = env();
  const L = labels();
  const phone = w < 520;
  // the readouts: labels keep out from under them
  L.reserve(phone ? { x: 0, y: 0, w: HUD_PHONE.w, h: HUD_PHONE.h } : { x: 0, y: 0, w: HUD, h: HUD_H });
  L.reserve({ x: w - 150, y: 0, w: 150, h: 86 });
  const F = f.F, O = f.other, Pt = f.P, kind = f.kindOf;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const aim = clamp(F.theta, -60, 80);

  // ── the frame: both paths, the point, the mark; one scale both ways
  const paths = [f.path(160), ...(O ? [f.path(160, O.end, O)] : [])];
  const xs = [0, ...paths.flat().map((p) => p.x)], ys = [0, F.h0, ...paths.flat().map((p) => p.y)];
  // the wall it hits stands above where it hits, and at least as high as a window in it
  const faceTop = kind === 'face' && Pt ? Math.max(Pt.H ?? F.at?.y ?? 0, (f.win?.hi ?? 0) / 1.5 * 1.05) : null;
  if (f.win) ys.push(f.win.hi * 1.1);
  if (Pt) { if (Pt.d != null) xs.push(Pt.d); if (Pt.H != null) ys.push(Pt.H); if (faceTop != null) ys.push(faceTop * 1.35); }
  if (f.flag != null) xs.push(f.flag);
  // the thing at the point has a width of its own: a tree's crown, a fence's run
  if (Pt?.d != null && Pt.H != null) xs.push(Pt.d + ({ tree: 0.36 * Pt.H, fence: 1.9, wall: 0.25 }[kind] ?? 0));
  // a wall it hits is the end of a building 8 m deep, all of it in the frame
  const FACE_DEPTH = 8;
  if (kind === 'face' && Pt?.d != null) xs.push(Pt.d + FACE_DEPTH / 1.04);
  const xMax = Math.max(...xs) * 1.04 || 1, yMax = Math.max(...ys, xMax * 0.05) * 1.08;
  const elevated = F.h0 > 1e-9;
  const inHouse = elevated && f.from !== 'stand';

  // The scene goes beside the readouts or below them, whichever draws it
  // larger; on a phone it takes the whole width with the ground low, under
  // the readouts. Below the ground: the distances, then what happened —
  // beside the thing on a laptop, as captions on a phone, where there is no
  // room beside anything.
  let leftPx = 24 + (elevated ? 56 : 0);
  // (and beyond the thing, room for its height's dimension and label)
  const rightPx = phone ? 52 : 72;
  // (on a phone the ground sits just under the readouts, so the launch is never behind them)
  const below = phone ? 108 : 96;
  const areasFor = () => (phone ? [{ left: 10 + leftPx, right: w - rightPx, top: 96, bottom: h - below }]
    : [{ left: HUD + 16 + leftPx, right: w - rightPx, top: 72, bottom: h - below },
       { left: 24 + leftPx, right: w - rightPx, top: HUD_H + 16, bottom: h - below }]);
  const fitWith = (houseM, extraM) => {
    let best = null;
    for (const a of areasFor()) {
      if (a.bottom - a.top < 60) continue;
      const fs = fitSide({ xLo: -houseM, xHi: xMax, yLo: 0, yHi: yMax + extraM }, a, { sky: phone ? 1 : 0.75 });
      if (!best || fs.k > best.k) best = fs;
    }
    return best;
  };
  let houseM = 0, extraM = 0, fs = fitWith(0, 0);
  if (!fs) return null;
  // the person at the scene's scale: 1.75 m, and never a smudge
  const MIN_H = 14;
  let TH = Math.max(MIN_H, 1.75 * fs.k);
  if (!inHouse) {
    // the person (and a stand) behind the launch, at true size, then the launch height's label
    leftPx = 24 + (elevated ? 56 : 0) + TH * 0.9;
    fs = fitWith(0, 0); TH = Math.max(MIN_H, 1.75 * fs.k);
  }
  if (inHouse) {
    for (let i = 0; i < 2; i++) {
      houseM = Math.max(F.h0 * 0.9, 4.5, (2.4 * TH) / fs.k);
      extraM = Math.max(0, F.h0 + houseM * 0.42 + 1.2 - yMax);
      fs = fitWith(houseM, extraM);
      TH = Math.max(MIN_H, 1.75 * fs.k);
    }
  }
  const { k, X, Y } = fs, oy = Y(0);
  const caps = [];                                   // phone: what happened, under the ground
  const say = (text, color, x, y, opt = {}) => {
    if (phone) caps.push({ text, color });
    else L.add(text, x, y, { color, pri: 9, size: 14, weight: 700, ...opt });
  };

  // ── the place: sky, far trees, the lawn
  landscape(g, w, h, oy, { far: 'trees', seed: 21 });
  foreground(g, w, oy + 60, h);
  const step = niceStep(xMax, phone ? 5 : 7);
  for (let x = step; x <= xMax; x += step) {
    stroke(g, [{ x: X(x), y: oy }, { x: X(x), y: oy + 6 }], { color: P.axis, width: 1.4 });
    L.add(fmt(x, step < 1 ? 1 : 0), X(x), oy + 16, { color: P.faint, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  L.add(T`x [m]`, w - 14, oy + 16, { color: P.muted, align: 'right', pri: 3, size: 13, bg: false, maxPush: 0 });

  // ── where it leaves from, and who throws it: the hand at the launch
  const lx = X(0), ly = Y(F.h0);
  const hand = handOf(TH, aim);
  let fx = lx - hand.x, fy = ly + hand.y;
  let win = null, structLeft = fx - TH * 0.4, structTop = fy - TH * 1.05;
  const pose = fired ? clamp(0.55 + 0.45 * t / Math.max(1e-6, 0.05 * f.tMax), 0, 1) : 0;
  if (inHouse) {
    const hw = houseM * k, storey = 3 * k;
    if (f.from === 'window') {
      const edge = lx - Math.max(2, TH * 0.1);
      const sill = Math.min(oy - 4, fy - TH * 0.45);
      const wt = fy - TH * (1.12 + 0.3 * Math.max(0, Math.sin(aim * Math.PI / 180)));
      win = { x: fx - TH * 0.34, y: wt, w: edge - 1 - (fx - TH * 0.34), h: sill - wt };
      const eave = wt - Math.max(3, 0.35 * k);
      house(g, edge, sill, oy, hw, 'window', P, { win, eave, storey });
      g.save(); g.beginPath(); g.rect(win.x, win.y, win.w, win.h); g.rect(edge, 0, w, sill); g.clip();
      person(g, fx, fy, TH, P, { pose: fired ? 1 : 0, aim });
      g.restore();
      openFrame(g, win);
      structLeft = edge - hw; structTop = eave - hw * 0.42;
    } else {
      fy = Math.min(fy, oy - 4);
      const edge = fx + TH * 0.3;
      house(g, edge, fy, oy, hw, 'roof', P, { storey });
      person(g, fx, fy, TH, P, { pose, aim });
      structLeft = edge - hw;
    }
  } else if (elevated && fy < oy - 4) {
    stand(g, fx - TH * 0.55, fx + TH * 0.3, fy, oy, TH);
    person(g, fx, fy, TH, P, { pose, aim });
    structLeft = fx - TH * 0.55;
  } else {
    fx = lx - hand.x * 0.8 - Math.max(2, TH * 0.08); fy = oy;
    person(g, fx, fy, TH, P, { pose, aim });
    structLeft = fx - TH * 0.3; structTop = fy - TH * 1.05;
  }
  L.reserve({ x: structLeft, y: Math.min(structTop, fy - TH * 1.05), w: lx - structLeft + 2, h: oy - Math.min(structTop, fy - TH * 1.05) });
  if (elevated) {
    // the launch height, as a dimension line beside whatever it is thrown from
    const dx = structLeft - 12;
    stroke(g, [{ x: dx, y: oy }, { x: dx, y: ly }], { color: P.muted, width: 1.2 });
    for (const yy of [oy, ly]) stroke(g, [{ x: dx - 4, y: yy }, { x: dx + 4, y: yy }], { color: P.muted, width: 1.2 });
    stroke(g, [{ x: dx + 4, y: ly }, { x: lx - 4, y: ly }], { color: P.muted, width: 1, dash: [2, 4], alpha: 0.7 });
    // beside its bracket — on a phone low enough down it to clear the readouts
    const hy = phone ? Math.min(oy - 8, Math.max((ly + oy) / 2, HUD_PHONE.h + 14)) : (ly + oy) / 2;
    L.add(T`${tr(F.h0)} [m]`, dx - 6, hy, { color: P.strong, align: 'right', pri: 8, size: 14, maxPush: 20 });
  }

  // ── the thing at the point
  // a height with no distance: where a wall that high would be cleared, as a
  // band along the ground and the height it has to clear
  if (Pt && Pt.d == null && Pt.H != null && F.span) {
    const a = X(F.span.from), b = X(F.span.to), hy = Y(Pt.H);
    g.save(); g.fillStyle = withAlpha(P.mark, 0.14); g.fillRect(a, hy, b - a, oy - hy); g.restore();
    stroke(g, [{ x: a, y: hy }, { x: b, y: hy }], { color: P.mark, width: 1.4, alpha: 0.8 });
    stroke(g, [{ x: a, y: oy + 8 }, { x: b, y: oy + 8 }], { color: P.mark, width: 2 });
    for (const xx of [a, b]) stroke(g, [{ x: xx, y: oy + 4 }, { x: xx, y: oy + 12 }], { color: P.mark, width: 2 });
    L.add(`a ${T`${tr(Pt.H)} [m]`} ${{ wall: 'wall', fence: 'fence', net: 'net', tree: 'tree' }[kind] || 'wall'} is cleared here`, (a + b) / 2, oy + 36, { color: P.mark, align: 'center', pri: 7, size: 13, weight: 700, maxPush: 20 });
    L.add(T`${sig3(F.span.to)} [m]`, b, hy - 14, { color: P.mark, align: 'center', pri: 8, size: 14, weight: 700 });
    if (F.span.from > 1e-9) L.add(T`${sig3(F.span.from)} [m]`, a, hy - 14, { color: P.mark, align: 'center', pri: 8, size: 14, weight: 700 });
    L.add(T`${tr(Pt.H)} [m]`, a + 8, (hy + oy) / 2, { color: P.mark, align: 'left', pri: 6, size: 14 });
  }
  let faceWin = null, half = 4;                 // half: how far the thing reaches either side of the point
  if (Pt && Pt.d != null) {
    const px = X(Pt.d), H = Pt.H;
    const top = H != null ? Y(H) : null;
    let boxTop = top;
    if (kind === 'wall' && H != null) { brickWall(g, px, top, oy, k); half = clamp(0.35 * k, 6, 24) / 2 + 2; }
    else if (kind === 'face') {
      const ft = Y(Math.min(yMax * 0.95, faceTop * 1.35));
      if (f.win) faceWin = { hi: Y(f.win.hi), lo: Y(f.win.lo) };
      endWall(g, px, ft, oy, FACE_DEPTH * k, faceWin, k);
      L.reserve({ x: px, y: ft, w: FACE_DEPTH * k, h: oy - ft });
      if (f.win) {
        // named below the window, on the near side of the wall
        const struck = F.at?.reached && t >= F.at.t - 1e-9;
        if (!struck || f.win.breaks == null) L.add('a window', px - 10, Math.min(oy - 12, faceWin.lo + 16), { color: P.ink, align: 'right', pri: 7, size: 13, weight: 700 });
        else say(f.win.breaks ? 'the window breaks' : 'the window holds', P.ink, px - 10, Math.min(oy - 12, faceWin.lo + 16), { align: 'right', size: 13 });
      }
      half = 2;
    } else if (kind === 'fence' && H != null) { fence(g, px, top, oy, P, k); half = clamp(3.6 * k, 70, 150) / 2; }
    else if (kind === 'net' && H != null) { tennisNet(g, px, top, oy); half = 7; }
    else if (kind === 'tree' && H != null) { tree(g, px, top, oy); half = clamp((oy - top) * 0.66, 26, 180) * 0.5; }
    else if (H != null) { const rb = clamp(0.45 * k, 7, 16); targetBoard(g, px, top, oy, rb); half = rb; boxTop = top - rb; }
    if (boxTop != null && kind !== 'face') L.reserve({ x: px - half, y: boxTop, w: 2 * half, h: oy - boxTop });
    // its height, as a dimension line just beyond it
    if (H != null && H > 1e-9) {
      const dx = px + (kind === 'face' ? -16 : half + 10);
      stroke(g, [{ x: dx, y: oy }, { x: dx, y: top }], { color: P.muted, width: 1.2 });
      for (const yy of [oy, top]) stroke(g, [{ x: dx - 4, y: yy }, { x: dx + 4, y: yy }], { color: P.muted, width: 1.2 });
      L.add(T`${tr(H)} [m]`, dx + (kind === 'face' ? -11 : 11), (oy + top) / 2, { color: P.strong, align: kind === 'face' ? 'right' : 'left', pri: 6, size: 14, maxPush: 60 });
      L.reserve({ x: dx - 5, y: top - 2, w: 10, h: oy - top + 4 });
    }
    // its distance, along the ground below
    const dy = oy + 34;
    stroke(g, [{ x: X(0), y: dy }, { x: px, y: dy }], { color: P.muted, width: 1.2 });
    for (const xx of [X(0), px]) stroke(g, [{ x: xx, y: dy - 4 }, { x: xx, y: dy + 4 }], { color: P.muted, width: 1.2 });
    L.add(T`${tr(Pt.d)} [m]`, (X(0) + px) / 2, dy + 13, { color: P.strong, align: 'center', pri: 8, size: 14 });
    L.reserve({ x: X(0), y: dy - 5, w: px - X(0), h: 5.5 });
  }
  // ── a mark on the ground
  if (f.flag != null) {
    const fx2 = X(f.flag);
    flagAt(g, fx2, oy, 34, P);
    L.reserve({ x: fx2 - 3, y: oy - 34, w: 22, h: 34 });
    L.add(`mark ${T`${tr(f.flag)} [m]`}`, fx2 + 8, oy - 50, { color: P.mark, align: 'center', pri: 6, size: 13, weight: 700, maxPush: 20 });
  }

  // ── the other answer's path, faint and solid, with its angle
  const mine = paths[0].map((p) => ({ x: X(p.x), y: Y(p.y) }));
  if (O) {
    const op = paths[1].map((p) => ({ x: X(p.x), y: Y(p.y) }));
    stroke(g, op, { color: P.vel, width: 1.6, alpha: 0.28 });
    // its angle where it is furthest from the path flown, so it names this one
    let at = op[Math.floor(op.length / 2)], far = -1;
    for (const q of op.slice(8, -8)) {
      const dmin = Math.min(...mine.map((m) => Math.hypot(m.x - q.x, m.y - q.y)));
      if (dmin > far) { far = dmin; at = q; }
    }
    L.add(T`theta = ${num(O.theta, 1, { trim: true })}°`, at.x, at.y + 14, { color: P.muted, align: 'center', pri: 4, size: 13 });
  }
  // ── the path flown: all of it faintly, the part flown strongly; labels keep off it
  stroke(g, mine, { color: P.vel, width: 1.6, alpha: 0.3 });
  const flown = f.path(120, t).map((p) => ({ x: X(p.x), y: Y(p.y) }));
  stroke(g, flown, { color: P.vel, width: 2.8 });
  reserveLine(L, flown, 5);

  // ── its angle at the launch
  const th = F.theta * Math.PI / 180, R = 36;
  stroke(g, [{ x: lx, y: ly }, { x: lx + R + 14, y: ly }], { color: P.muted, width: 1.2 });
  if (Math.abs(F.theta) > 0.5) {
    g.save(); g.strokeStyle = P.muted; g.lineWidth = 1.4; g.beginPath();
    g.arc(lx, ly, R, -Math.max(th, 0), -Math.min(th, 0)); g.stroke(); g.restore();
    // to one decimal place; on a phone, where the readouts cover the launch,
    // on the distances' row at the right, named
    const ang = num(F.theta, 1, { trim: true });
    if (phone) L.add(T`theta = ${ang}°`, w - 12, oy + 47, { color: P.strong, align: 'right', pri: 8, size: 14, weight: 700, maxPush: 30 });
    else L.add(T`${ang}°`, lx + R + 8, ly - (th > 0 ? 14 : -14), { color: P.strong, align: 'left', pri: 8, size: 14, weight: 700, maxPush: 30 });
  }

  // ── equal steps of time along the path, labelled when asked
  const dt = niceStep(f.tMax, 10);
  for (let i = 1; i * dt <= t + 1e-9 && i * dt < f.tMax - 1e-9; i++) {
    const q = f.pos(i * dt);
    dot(g, X(q.x), Y(q.y), 3.2, { fill: P.vel, stroke: P.surface, width: 1.2 });
    if (show.ticks) L.add(T`${num(i * dt, dt < 1 ? 1 : 0)} [s]`, X(q.x) + 6, Y(q.y) + 14, { color: P.vel, align: 'left', pri: 2, size: 13, bg: false, maxPush: 0 });
  }
  // ── the top of its path, when asked
  if (show.apex && F.apex && !(F.hits && F.apex.t > F.end)) {
    const ax = X(F.apex.x), ay = Y(F.apex.y);
    stroke(g, [{ x: ax, y: ay }, { x: ax, y: oy }], { color: P.disp, width: 1.4, alpha: 0.7 });
    dot(g, ax, ay, 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H_max = ${sig3(F.apex.y)} [m]`, ax, ay - 18, { color: P.disp, align: 'center', pri: 6, size: 14, weight: 700 });
  }

  // ── at the point, once the ball has got there
  const at = F.at;
  if (Pt && at?.reached && t >= at.t - 1e-9) {
    const px = X(Pt.d), py = Y(at.y);
    if (f.kindOf === 'face' || F.hits) {
      // the hit, as it happens: a flash, and what it knocks off the thing it hits
      const { age, life } = ageOf(t, at.t, f.tMax);
      const inWin = faceWin && py >= faceWin.hi - 1 && py <= faceWin.lo + 1;
      const debris = kind === 'tree' ? (E.night ? '#5c6e3c' : '#6f9440') : inWin ? '#dff0fa' : kind === 'net' ? '#e9e6df' : (E.night ? '#b08a78' : '#c98a70');
      if (inWin && f.win.breaks === true) {
        const ww = clamp((faceWin.lo - faceWin.hi) * 0.8, 14, 46);
        cracks(g, px + 7 + ww * 0.3, py, { x: px - 2, y: faceWin.hi, w: ww + 10, h: faceWin.lo - faceWin.hi }, clamp(age / (life * 0.3), 0, 1));
        puff(g, px - 2, py, age, life * 1.4, -1, debris, { n: 18, seed: 5, size: 1.1, fall: 2.2 });
      } else {
        puff(g, px - half - 1, py, age, life, -1, debris, { n: 14, seed: 4, size: 0.9 });
      }
      flash(g, px - 4, py, age, life * 0.6, { radius: 20 });
      if (inWin && f.win.breaks === false) pulse(g, px, py, age, life, P.mark, { radius: 22 });
      dot(g, px, py, 8, { stroke: P.mark, width: 2.4 });
      L.reserve({ x: px - 10, y: py - 10, w: 20, h: 20 });
      const txt = f.kindOf === 'face' ? `hits at ${len(at.y)}, ${T`t = ${sig3(at.t)} [s]`}` : `hits ${len(-at.clear)} below the top`;
      say(txt, P.mark, px - half - 14, py - 22, { align: 'right' });
    } else if (at.clear != null && Math.abs(at.clear) > 1e-6 && kind !== 'point') {
      // the gap over the top, as a marker beside it
      const gx = px - half - 6, gy0 = Y(Pt.H);
      stroke(g, [{ x: gx, y: gy0 }, { x: gx, y: py }], { color: P.mark, width: 2 });
      for (const yy of [gy0, py]) stroke(g, [{ x: gx - 4, y: yy }, { x: gx + 4, y: yy }], { color: P.mark, width: 2 });
      L.reserve({ x: gx - 5, y: Math.min(py, gy0), w: 10, h: Math.abs(gy0 - py) });
      say(`clears by ${len(at.clear)}`, P.mark, gx - 10, (gy0 + py) / 2, { align: 'right' });
    } else {
      { const { age, life } = ageOf(t, at.t, f.tMax); pulse(g, px, py, age, life, P.mark, { radius: 20 }); }
      dot(g, px, py, 8, { stroke: P.mark, width: 2.4 });
      L.reserve({ x: px - 10, y: py - 10, w: 20, h: 20 });
      const txt = kind === 'point' && at.clear != null && Math.abs(at.clear) > 1e-6
        ? `${len(Math.abs(at.clear))} ${at.clear > 0 ? 'above' : 'below'}, ${T`t = ${sig3(at.t)} [s]`}` : T`t = ${sig3(at.t)} [s]`;
      say(txt, P.mark, px - half - 14, py - 22, { align: 'right' });
    }
  }
  // ── where it lands, once it has: dust, how far, and how far from the mark
  if (!F.hits && t >= F.tGround - 1e-9) {
    const gx = X(F.R);
    { const { age, life } = ageOf(t, F.tGround, f.tMax); dust(g, gx, oy, age, life); }
    let text = `lands ${T`${sig3(F.R)} [m]`} out`;
    let cx = gx;
    if (f.flag != null && Math.abs(f.flagGap) > 1e-6) {
      // how far short of the mark, or past it, as a bracket along the ground
      const a = X(Math.min(F.R, f.flag)), b = X(Math.max(F.R, f.flag)), yy = oy + 8;
      stroke(g, [{ x: a, y: yy }, { x: b, y: yy }], { color: P.mark, width: 2.4 });
      for (const xx of [a, b]) stroke(g, [{ x: xx, y: yy - 5 }, { x: xx, y: yy + 5 }], { color: P.mark, width: 2.4 });
      text += `, ${len(Math.abs(f.flagGap))} ${f.flagGap > 0 ? 'short of' : 'past'} the mark`;
      cx = (a + b) / 2;
    }
    // under the ground, below the distances, where nothing else is written
    say(text, P.mark, cx, oy + 66, { align: 'center', pri: 8 });
  }

  // ── the ball, its velocity and its acceleration
  const r = f.pos(t), v = f.vel(t);
  const bx = X(r.x), by = Y(r.y);
  const vMax = Math.max(...paths[0].map((p) => Math.hypot(F.ux, F.vy(p.t))), 1e-6);
  // one scale for the whole flight, so an arrow's length always says its
  // speed — chosen so that no arrow along the path leaves the canvas
  const room = (c, dv, lo, hi) => (dv > 0 ? (hi - c) / dv : dv < 0 ? (lo - c) / dv : Infinity);
  let vl = clamp(w * 0.09, 46, 110) / vMax;
  for (const q of paths[0]) {
    const vq = { x: F.ux, y: F.vy(q.t) };
    vl = Math.min(vl, room(X(q.x), vq.x, 12, w - 70) * 0.9, room(Y(q.y), -vq.y, 12, h - 12) * 0.9);
  }
  const rBall = 7;
  if (show.velocity !== false && f.speed(t) > 1e-6) {
    if (show.components) {
      arrow(g, bx, by, bx + v.x * vl, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, bx + v.x * vl, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, bx, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 3, head: 12 });
    L.add(T`${sig3(f.speed(t))} [m s^-1]`, bx + v.x * vl + 10, by - v.y * vl, { color: P.vel, align: 'left', pri: 7, size: 15, weight: 700, maxPush: 80 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
  // a ball that has hit a wall rests against its face, not inside it
  const sx = F.hits && t >= F.end - 1e-9 && Pt?.d != null ? Math.min(bx, X(Pt.d) - (kind === 'face' ? 0 : 4) - rBall) : bx;
  const sy = !F.hits && t >= F.tGround - 1e-9 ? Math.min(by, oy - rBall) : by;
  if (sy > oy - rBall * 3) softShadow(g, sx, oy + 1, rBall * 1.3, 2.5, 0.8);
  ballAt(g, sx, sy, rBall);

  // ── on a phone, what happened, in captions under the distances
  caps.forEach((c, i) => L.add(c.text, 12, oy + 66 + i * 24, { color: c.color, align: 'left', pri: 10, size: 14, weight: 700 }));

  L.draw(g, w, h);
  return null;
}
