// trip.js — the stage for a velocity–time graph of straight segments,
// forwards and back: a car driven along a high street, its driver walking
// back to a shop, waiting inside, and jogging back to the car.
//
// Two pictures sharing the clock, as for the journey:
//   · THE STREET, filling the canvas: a terrace of shops and houses with
//     roofs, chimneys and lit windows, the pavement, the road and the verge
//     in front of it with a distance scale along the kerb. ALL OF IT TRUE TO
//     THE RULER: a person 1.75 m tall, the car 4.4 m long, a storey 2.7 m, so
//     the street is a close-up that the camera carries along with whoever is
//     moving, and a strip along the bottom shows the whole road to its own
//     scale with the stretch in view framed. The car is driven and parks;
//     the driver, on foot, goes from the car to the shop, waits in its
//     doorway, and comes back, the stride running on the distance walked.
//     Velocity along the road is dashed (rule 2). Each moment the
//     motion changes — parks, reaches the shop, leaves it, the end — rings
//     out at the engine's own time (effects.js).
//   · THE GRAPH, on a paper card that belongs to the screen, not the street:
//     drawn after unview() so it neither pans nor zooms, clear of the HUD,
//     beside the street on a laptop and below it on a phone. The six straight
//     lines a paper draws, the area under them shaded up to now (above the
//     axis forwards, below it back), the time ticks in one row under the
//     plot, and each time the engine found shown as a span under it.
//
// Everything drawn is read from js/core/trip.js (rule 4).

import { skyscape, grass, tarmac, paper, softShadow, env, rng } from './scenery.js';
import { fitCanvas, unview, cssVar, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha } from './util.js';
import { car, runner, phaseFor } from './figures.js';
import { pulse, ageOf } from './effects.js';
import { T, num } from '../notation.js';

const HUD = 250, HUD_H = 290;
const TAU = Math.PI * 2;
/** Three significant figures, trimmed: 60.107 → 60.1, 12 → 12, 1.75 → 1.75. */
const s3 = (x) => {
  if (!isFinite(x) || Math.abs(x) < 1e-12) return num(0, 0);
  return num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)))), { trim: true });
};
const still = (s) => Math.abs(s.v0) + Math.abs(s.v1) < 1e-9;

/* ── the layout: the street fills the canvas, the graph card is the screen's ── */

function frame(w, h) {
  const phone = w < 520;
  if (phone) {
    const ch = clamp(Math.round(h * 0.4), 170, 270), card = { x: 8, y: h - ch - 8, w: w - 16, h: ch };
    const map = { x: 8, y: card.y - 36, w: w - 16, h: 28 };
    return { phone, card, map, floor: map.y - 6 };
  }
  const cw = Math.min(w - HUD - 28, 740), ch = clamp(Math.round(h * 0.35), 180, 330);
  return { phone, card: { x: w - 16 - cw, y: 84, w: cw, h: ch }, map: { x: 16, y: h - 40, w: w - 32, h: 30 }, floor: h - 46 };
}

/* ── the street ────────────────────────────────────────────────────────── */

const FACADE = {
  day: ['#c6a28c', '#d8cab7', '#bcaca3', '#ab988b', '#cfb9a2', '#b7a69a'],
  night: ['#4d3c3e', '#443e47', '#56473f', '#40393d', '#4e4249', '#4a4038'],
};

/** A window in a facade: a frame, glass that is lit or dark by night and
    holds the sky by day, glazing bars and a sill. */
function windowAt(g, x, y, ww, wh, E, lit) {
  g.fillStyle = E.night ? '#5d5256' : '#efe7dc'; g.fillRect(x - 2, y - 2, ww + 4, wh + 4);
  if (E.night && lit) {
    const gl = g.createRadialGradient(x + ww / 2, y + wh / 2, 0, x + ww / 2, y + wh / 2, Math.max(ww, wh) * 1.3);
    gl.addColorStop(0, withAlpha(E.window, 0.28)); gl.addColorStop(1, withAlpha(E.window, 0));
    g.fillStyle = gl; g.fillRect(x - ww, y - wh * 0.6, ww * 3, wh * 2.2);
    const gi = g.createLinearGradient(0, y, 0, y + wh); gi.addColorStop(0, '#ffd9ae'); gi.addColorStop(1, E.window);
    g.fillStyle = gi;
  } else if (E.night) g.fillStyle = '#231d21';
  else { const gs = g.createLinearGradient(x, y, x + ww, y + wh); gs.addColorStop(0, '#a9bcc8'); gs.addColorStop(1, '#6e8190'); g.fillStyle = gs; }
  g.fillRect(x, y, ww, wh);
  if (!E.night) { g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.moveTo(x, y + wh * 0.55); g.lineTo(x + ww * 0.55, y); g.lineTo(x + ww * 0.8, y); g.lineTo(x, y + wh * 0.9); g.closePath(); g.fill(); }
  g.strokeStyle = E.night ? '#5d5256' : '#efe7dc'; g.lineWidth = Math.max(1, ww * 0.07);
  g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + wh); g.moveTo(x, y + wh * 0.42); g.lineTo(x + ww, y + wh * 0.42); g.stroke();
  g.fillStyle = E.night ? '#6b5f62' : '#f6f0e8'; g.fillRect(x - 4, y + wh + 1, ww + 8, 3.5);
}

/** One building of the terrace, side on: a facade lit from the left with
    brick courses or render, windows on every storey, a door, and a roof —
    pitched slate with a chimney, a gable, or flat with a cornice. */
function building(g, x, bw, base, floors, storey, E, r, o = {}) {
  const pal = E.night ? FACADE.night : FACADE.day, col = o.color ?? pal[Math.floor(r() * pal.length)];
  const roof = o.roof ?? ['pitch', 'flat', 'gable', 'pitch', 'flat'][Math.floor(r() * 5)];
  const gf = storey * 1.12, bh = gf + storey * (floors - 1) + storey * 0.25, top = base - bh;
  const slate = E.night ? '#2b262b' : '#6a5f64';
  // the roof first, behind the parapet line
  g.save();
  if (roof === 'pitch') {
    const rh = Math.min(bw * 0.28, storey * 0.6);
    g.fillStyle = slate; g.beginPath(); g.moveTo(x - 5, top); g.lineTo(x + bw * 0.16, top - rh); g.lineTo(x + bw * 0.84, top - rh); g.lineTo(x + bw + 5, top); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1;
    for (let yy = top - rh + 5; yy < top; yy += 5) { const u = (yy - (top - rh)) / rh; g.beginPath(); g.moveTo(x + bw * 0.16 * (1 - u) - 5 * u, yy); g.lineTo(x + bw * (0.84 + 0.16 * u) + 5 * u, yy); g.stroke(); }
    g.fillStyle = withAlpha('#ffffff', E.night ? 0.06 : 0.16); g.fillRect(x + bw * 0.16, top - rh, bw * 0.68, 2);
    // a chimney stack with pots
    const cx = x + bw * (0.62 + r() * 0.15), cw = Math.max(8, bw * 0.09);
    g.fillStyle = shadeOf(col, E); g.fillRect(cx, top - rh - storey * 0.32, cw, storey * 0.32 + rh * 0.4);
    g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(cx + cw * 0.6, top - rh - storey * 0.32, cw * 0.4, storey * 0.32 + rh * 0.4);
    g.fillStyle = E.night ? '#6b4a3c' : '#a8705a';
    for (let i = 0; i < 2; i++) g.fillRect(cx + 1 + i * cw * 0.5, top - rh - storey * 0.32 - 6, cw * 0.32, 6);
  } else if (roof === 'gable') {
    const rh = Math.min(bw * 0.42, storey * 0.75);
    g.fillStyle = slate; g.beginPath(); g.moveTo(x - 6, top + 2); g.lineTo(x + bw / 2, top - rh - 4); g.lineTo(x + bw + 6, top + 2); g.closePath(); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(x, top + 1); g.lineTo(x + bw / 2, top - rh + 3); g.lineTo(x + bw, top + 1); g.closePath(); g.fill();
    dot(g, x + bw / 2, top - rh * 0.38, Math.max(4, rh * 0.14), { fill: E.night ? (r() < 0.5 ? E.window : '#231d21') : '#8fa3b1', stroke: E.night ? '#5d5256' : '#efe7dc', width: 2 });
  }
  g.restore();
  // the facade, and its light: brighter on the left, a shadow down the right
  g.fillStyle = col; g.fillRect(x, top, bw, bh);
  const lg = g.createLinearGradient(x, 0, x + bw, 0); lg.addColorStop(0, 'rgba(255,255,255,0.07)'); lg.addColorStop(0.7, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = lg; g.fillRect(x, top, bw, bh);
  if (o.brick ?? r() < 0.5) {
    g.strokeStyle = withAlpha('#000000', E.night ? 0.16 : 0.09); g.lineWidth = 1; g.beginPath();
    for (let yy = top + 4; yy < base; yy += 4.5) { g.moveTo(x, yy); g.lineTo(x + bw, yy); }
    g.stroke();
  }
  if (roof === 'flat' || roof === 'pitch') {
    // a cornice: a moulded band with its shadow under it
    g.fillStyle = E.night ? '#62575b' : '#ece4d8'; g.fillRect(x - 3, top - 3, bw + 6, 6);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, top + 3, bw, 3);
  }
  if (roof === 'flat') { g.fillStyle = shadeOf(col, E); g.fillRect(x, top - storey * 0.2, bw, storey * 0.2 - 3); g.fillStyle = E.night ? '#62575b' : '#ece4d8'; g.fillRect(x - 2, top - storey * 0.2 - 3, bw + 4, 4); }
  // the storeys above the ground floor
  const cols = Math.max(1, Math.floor(bw / (storey * 0.95))), ww = Math.min(storey * 0.36, bw / cols * 0.5), wh = storey * 0.5;
  for (let f = 1; f < floors; f++) {
    const fy = base - gf - f * storey + storey * 0.24;
    for (let c = 0; c < cols; c++) windowAt(g, x + bw * ((c + 0.5) / cols) - ww / 2, fy, ww, wh, E, r() < 0.55);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, base - gf - (f - 1) * storey - 3, bw, 2);
  }
  // the ground floor: a door and a window, unless the caller dresses it
  if (!o.bare) {
    const dw = storey * 0.3, dx = x + bw * (r() < 0.5 ? 0.22 : 0.68) - dw / 2;
    g.fillStyle = E.night ? '#2c2a33' : ['#3f5560', '#5a3d3d', '#3f4a3a'][Math.floor(r() * 3)];
    g.beginPath(); g.roundRect(dx, base - gf * 0.72, dw, gf * 0.72, [dw / 2, dw / 2, 0, 0]); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(dx + dw * 0.15, base - gf * 0.6, dw * 0.7, 2);
    dot(g, dx + dw * 0.8, base - gf * 0.34, 1.6, { fill: '#d8c08a' });
    const wx = dx < x + bw / 2 ? x + bw * 0.55 : x + bw * 0.12;
    windowAt(g, wx, base - gf * 0.72, Math.min(bw * 0.32, storey * 0.55), gf * 0.42, E, r() < 0.6);
  }
  return top;
}

const shadeOf = (col, E) => (E.night ? '#3a3034' : '#9a877c');

/**
 * The shop, its door at x on the pavement line Y: a ground-floor shopfront
 * H tall — a painted fascia with the sign on it, a striped awning with a
 * scalloped edge, display windows with goods on shelves, a glazed door with
 * a step — under a storey of flat. By night it is lit from inside. `open`
 * stands the door open; `inside` is someone in the shop, seen through the glass.
 */
export function shopfront(g, x, Y, H, P, { open = false, inside = null } = {}) {
  const E = env(), r = rng(57), storey = H / 1.12, bw = H * 2.25, x0 = x - bw * 0.62, x1 = x0 + bw;
  // the flat above it, and its roof
  building(g, x0, bw, Y, 2, storey, E, r, { color: E.night ? '#4a4249' : '#d4c7b5', roof: 'flat', bare: true, brick: false });
  const paint = E.night ? '#2f4440' : '#3f5a54', trim = E.night ? '#8a7f74' : '#efe3cf';
  const fb = Y - H, fh = H * 0.17;
  // pilasters and the fascia
  g.fillStyle = paint; g.fillRect(x0 - 3, fb, bw + 6, fh);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x0 - 3, fb, bw + 6, 2);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0 - 3, fb + fh - 2, bw + 6, 2);
  g.fillStyle = paint; g.fillRect(x0 - 3, fb, H * 0.07, H); g.fillRect(x1 + 3 - H * 0.07, fb, H * 0.07, H);
  // the sign, in gilt letters
  const fs = Math.max(14, Math.round(fh * 0.62));
  g.save(); g.font = `700 ${fs}px Georgia, 'Times New Roman', serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillText('CORNER SHOP', x0 + bw / 2 + 1, fb + fh / 2 + 1.5);
  g.fillStyle = E.night ? '#e8c98a' : '#f3dfae'; g.fillText('CORNER SHOP', x0 + bw / 2, fb + fh / 2 + 0.5);
  g.restore();
  const sign = { x: x0, y: fb, w: bw, h: fh };
  // the windows and the door below the awning
  const wy = fb + fh, sr = H * 0.17, dw = H * 0.3, dx = x - dw / 2;
  const glass = (gx, gw) => {
    const gi = g.createLinearGradient(0, wy, 0, Y - sr);
    if (E.night) { gi.addColorStop(0, '#ffe2bd'); gi.addColorStop(1, '#e6b07a'); } else { gi.addColorStop(0, '#d5dde2'); gi.addColorStop(1, '#a4b2ba'); }
    g.fillStyle = gi; g.fillRect(gx, wy, gw, Y - sr - wy);
    // shelves of goods
    g.save(); g.beginPath(); g.rect(gx, wy, gw, Y - sr - wy); g.clip();
    const rr = rng(61 + Math.round(gx));
    for (let sy = wy + H * 0.3; sy < Y - sr - 4; sy += H * 0.2) {
      g.fillStyle = E.night ? '#8a6a4c' : '#8c7a6a'; g.fillRect(gx, sy, gw, 3);
      for (let ix = gx + 4; ix < gx + gw - 8; ix += 7 + rr() * 6) {
        const ih = H * (0.06 + rr() * 0.07), iw = 5 + rr() * 5;
        g.fillStyle = ['#a8655a', '#6f8a9c', '#c9a76a', '#7f9a6d', '#b88a9a', '#e4dccf'][Math.floor(rr() * 6)];
        g.beginPath(); g.roundRect(ix, sy - ih, iw, ih, 1.5); g.fill();
      }
    }
    if (inside && gx < inside.x && inside.x < gx + gw) { g.globalAlpha = 0.85; runner(g, inside.x, Y - sr + 2, inside.H, P, { dir: inside.dir, still: true }); g.globalAlpha = 1; }
    g.fillStyle = `rgba(255,255,255,${E.night ? 0.08 : 0.3})`; g.beginPath(); g.moveTo(gx, wy + (Y - wy) * 0.5); g.lineTo(gx + gw * 0.4, wy); g.lineTo(gx + gw * 0.55, wy); g.lineTo(gx, wy + (Y - wy) * 0.75); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = paint; g.lineWidth = 3; g.strokeRect(gx, wy, gw, Y - sr - wy);
    // the stall riser under the glass
    g.fillStyle = paint; g.fillRect(gx - 1, Y - sr, gw + 2, sr);
    g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1; g.strokeRect(gx + 4, Y - sr + 4, gw - 8, sr - 8);
  };
  const pil = H * 0.07;
  glass(x0 + pil, dx - 4 - (x0 + pil));
  glass(dx + dw + 4, x1 - pil - (dx + dw + 4));
  // the door: glazed, with a handle; ajar and lit within when it is open
  g.fillStyle = E.night ? '#ffd9a8' : '#4a3a30'; g.fillRect(dx, wy + 2, dw, Y - wy - 2);
  const leaf = open ? dw * 0.45 : dw;
  g.fillStyle = paint; g.fillRect(dx, wy + 2, leaf, Y - wy - 2);
  g.fillStyle = E.night ? '#f2c890' : '#b6c3ca'; g.fillRect(dx + leaf * 0.16, wy + H * 0.08, leaf * 0.68, (Y - wy) * 0.5);
  dot(g, dx + leaf * 0.85, wy + (Y - wy) * 0.62, 2, { fill: '#d8c08a' });
  // the step
  g.fillStyle = E.night ? '#5d5459' : '#cfc6bd'; g.fillRect(dx - 4, Y - 3, dw + 8, 4);
  // the awning: stripes out from under the fascia, a scalloped valance
  const aw = H * 0.17, ax0 = x0 + 2, ax1 = x1 - 2, n = Math.max(6, Math.round((ax1 - ax0) / 14)), sw = (ax1 - ax0) / n;
  const A = E.night ? ['#6b3e3c', '#b8a998'] : ['#9a5048', '#f1e6d6'];
  for (let i = 0; i < n; i++) {
    const a = ax0 + i * sw, b = a + sw;
    g.fillStyle = A[i % 2];
    g.beginPath(); g.moveTo(a, wy); g.lineTo(b, wy); g.lineTo(b + (b - x) * 0.03, wy + aw); g.lineTo(a + (a - x) * 0.03, wy + aw); g.closePath(); g.fill();
    g.beginPath(); g.arc(a + sw / 2 + ((a + b) / 2 - x) * 0.03, wy + aw, sw / 2, 0, Math.PI); g.fill();
  }
  const sh = g.createLinearGradient(0, wy, 0, wy + aw); sh.addColorStop(0, 'rgba(0,0,0,0.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh; g.fillRect(ax0, wy, ax1 - ax0, aw);
  // a light spilling onto the pavement by night
  if (E.night) {
    const sp = g.createRadialGradient(x, Y, 0, x, Y, bw * 0.6); sp.addColorStop(0, withAlpha(E.window, 0.3)); sp.addColorStop(1, withAlpha(E.window, 0));
    g.fillStyle = sp; g.fillRect(x0 - bw * 0.2, Y - 4, bw * 1.4, H * 0.3);
  }
  return sign;
}

/** A street lamp on the pavement edge: a post, an arm, a lantern; lit by night. */
function lamp(g, x, Y, H, E) {
  g.save();
  g.fillStyle = E.night ? '#2a2629' : '#3b3a3f';
  g.fillRect(x - 2, Y - H, 4, H); g.fillRect(x - 4, Y - 6, 8, 6);
  g.strokeStyle = g.fillStyle; g.lineWidth = 3; g.beginPath(); g.moveTo(x, Y - H + 2); g.quadraticCurveTo(x, Y - H - 10, x + 14, Y - H - 8); g.stroke();
  g.fillRect(x + 9, Y - H - 8, 12, 4);
  g.fillStyle = E.night ? '#ffe7bf' : '#e9e4da'; g.beginPath(); g.moveTo(x + 10, Y - H - 4); g.lineTo(x + 20, Y - H - 4); g.lineTo(x + 18, Y - H + 2); g.lineTo(x + 12, Y - H + 2); g.closePath(); g.fill();
  if (E.night) {
    const gl = g.createRadialGradient(x + 15, Y - H, 0, x + 15, Y - H, H * 0.55);
    gl.addColorStop(0, 'rgba(255,225,170,0.4)'); gl.addColorStop(1, 'rgba(255,225,170,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(x + 15, Y - H, H * 0.55, 0, TAU); g.fill();
    const pool = g.createRadialGradient(x + 15, Y, 0, x + 15, Y, H * 0.45);
    pool.addColorStop(0, 'rgba(255,225,170,0.22)'); pool.addColorStop(1, 'rgba(255,225,170,0)');
    g.fillStyle = pool; g.fillRect(x + 15 - H * 0.45, Y - 8, H * 0.9, 16);
  }
  g.restore();
}

/** A seeded hash: the same world position, the same tuft, whatever is in view. */
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** The pavement: slabs with joints fixed to the street (R maps metres to px), a lit front edge. */
function pavement(g, x0, x1, y0, y1, E, R, k) {
  g.fillStyle = E.night ? '#4b4246' : '#c9c0b8'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.fillStyle = withAlpha('#000000', 0.12); g.fillRect(x0, y0, x1 - x0, 2);
  g.strokeStyle = withAlpha('#000000', E.night ? 0.25 : 0.14); g.lineWidth = 1; g.beginPath();
  const slab = 0.75, m0 = (x0 - R(0)) / k;
  for (let m = Math.floor(m0 / slab) * slab; R(m) < x1 + 6; m += slab) { g.moveTo(R(m), y0); g.lineTo(R(m) - 5, y1); }
  g.moveTo(x0, (y0 + y1) / 2); g.lineTo(x1, (y0 + y1) / 2); g.stroke();
}

/** The verge in front of the road: grass with tufts and a few flowers, fixed to the street. */
function verge(g, x0, x1, y0, y1, E, R, k) {
  const off = ((R(0) % 56) + 56) % 56 - 56;
  grass(g, x0 + off, x1, y0, y1, { seed: 41 });
  g.save();
  const step = 0.28, m0 = (x0 - R(0)) / k;
  for (let i = Math.floor(m0 / step); R(i * step) < x1 + 8; i++) {
    const r1 = hash(i), r2 = hash(i + 0.5), r3 = hash(i + 0.25);
    const x = R(i * step) + r1 * step * k, y = y0 + 8 + r2 * (y1 - y0 - 10), s = 3 + r3 * 4;
    g.strokeStyle = withAlpha(E.grassAlt, 0.95); g.lineWidth = 1.2; g.beginPath();
    for (let q = -1; q <= 1; q++) { g.moveTo(x, y); g.lineTo(x + q * s * 0.5, y - s); }
    g.stroke();
    if (r3 < 0.2) { g.globalAlpha = E.night ? 0.55 : 0.9; dot(g, x + 1, y - s - 1, 1.8, { fill: ['#e8e0d0', '#d9c27a', '#b9a3c9'][Math.floor(r1 * 3)] }); g.globalAlpha = 1; }
  }
  g.restore();
}

/* ── the stage ─────────────────────────────────────────────────────────── */

// the street is drawn true to scale: a person 1.75 m tall, a car 4.4 m long,
// a storey 2.7 m — so the ruler on the kerb measures them as it measures the trip
const PERSON = 1.75, CAR = 4.4, STOREY = 2.7;

/** The distance walked on foot by time t: the sum of |Δx| over each piece on
    foot, split where one turns round — from the engine's own positions. */
function walked(f, t) {
  let d = 0;
  for (const s of f.S) {
    if (s.who !== 'foot' || t <= s.t0) continue;
    const b = Math.min(t, s.t1), tz = Math.abs(s.a) > 1e-12 ? s.t0 - s.v0 / s.a : -1;
    if (tz > s.t0 && tz < b) d += Math.abs(f.pos(tz) - f.pos(s.t0)) + Math.abs(f.pos(b) - f.pos(tz));
    else d += Math.abs(f.pos(b) - f.pos(s.t0));
  }
  return d;
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'trip') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), E = env();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const S = f.S;
  const F = frame(w, h);

  // the scale: a person about a twelfth of the canvas wide tall; everything else true to it
  const H = F.phone ? clamp(w * 0.13, 44, 60) : clamp(w * 0.08, 54, 90);
  const k = H / PERSON, carL = CAR * k, storey = STOREY * k;
  // the ground: building line, pavement, road, verge with the ruler on it
  const road = F.phone ? 24 : 34;
  const Yk = F.floor - (F.phone ? 50 : 62), Yp = Yk - (F.phone ? 10 : 14);
  const Yc = Yk + road * 0.72, Yw = Yp + (Yk - Yp) * 0.6, Yv = Yk + road + 4;

  // the camera follows whoever is moving, inside the stretch of road the trip uses
  const xs = S.flatMap((s) => [s.x0, s.x1]), xLo = Math.min(0, ...xs), xHi = Math.max(...xs, 1);
  const half = w / (2 * k), pad = CAR / 2 + 3;
  const px = f.pos(t), pv = f.vel(t);
  const cx = (xHi - xLo) + 2 * pad <= 2 * half ? (xLo + xHi) / 2 : clamp(px, xLo - pad + half, xHi + pad - half);
  const R = (x) => w / 2 + (x - cx) * k;
  const wl = cx - half - 1, wr = cx + half + 1;          // the metres in view

  skyscape(g, 0, 0, w, Yp, { far: 'skyline', seed: 33, farHeight: Math.min(150, Yp * 0.55), clouds: 4 });
  // the terrace along the back of the pavement, laid out in metres along the street
  const r = rng(71);
  for (let bx = xLo - 60, i = 0; bx < xHi + 60; i++) {
    const floors = 2 + Math.floor(r() * 2.4), bw = STOREY * (1.6 + r() * 1.5), gap = r() < 0.25 ? STOREY * 0.25 : 0;
    if (bx + bw > wl - 3 && bx < wr + 3) building(g, R(bx), bw * k, Yp, floors, storey, E, rng(500 + i));
    bx += bw + gap;
  }

  // where the car is: moving while it is driven, then parked where it stopped
  const carSegs = S.filter((s) => s.who !== 'foot');
  const parkT = carSegs.length ? carSegs[carSegs.length - 1].t1 : 0;
  const onFoot = S.some((s) => s.who === 'foot');
  const carX = f.pos(Math.min(t, parkT));
  const stops = S.filter((s) => s.who === 'foot' && still(s));
  const inShop = stops.find((s) => t > s.t0 + 1e-9 && t < s.t1 - 1e-9);
  const walking = onFoot && t >= parkT - 1e-9 && !inShop;

  // the shop where a stop on foot is: its door at that place
  for (const s of stops) {
    const sign = shopfront(g, R(s.x0), Yp, storey * 1.12, P, { open: inShop === s });
    L.reserve({ x: sign.x, y: sign.y, w: sign.w, h: sign.h });
  }
  pavement(g, -10, w + 10, Yp, Yk, E, R, k);
  for (let m = Math.floor((wl - 20) / 18) * 18 + 7; m < wr + 2; m += 18) lamp(g, R(m), Yk - 1, H * 1.75, E);
  const dash0 = R(0) - Math.ceil((R(0) + 10) / 40) * 40;
  tarmac(g, dash0, w + 10, Yk, { depth: road, verge: false });
  verge(g, -10, w + 10, Yv, h + 10, E, R, k);

  // the ruler along the kerb, at the same scale as everything on the street
  const step = niceStep(2 * half, F.phone ? 3 : 6);
  for (let x = Math.ceil(wl / step) * step; x <= wr; x += step) {
    g.fillStyle = E.night ? '#1d1a1c' : '#2c2a2c'; g.fillRect(R(x) - 1, Yk + road, 2, 7);
    L.add(`${s3(x)} m`, R(x), Yv + 15, { color: P.ink, align: 'center', pri: 1, size: 13, maxPush: 0 });
  }

  // the driver on foot: out of the car, to the shop, inside, and back. By the
  // car the driver is on the road beside it, in front of it; away from it, on
  // the pavement. The stride runs on the distance walked, so it always runs forwards.
  const nearAt = (x) => clamp(1 - Math.abs(x - carX) * k / (carL * 0.75), 0, 1);
  const footAt = (tt) => Yw + (Yc + 3 - Yw) * nearAt(f.pos(tt));
  const near = nearAt(px), footY = inShop ? Yp - 1 : footAt(t);
  const nextV = (S.find((s) => s.t0 >= t - 1e-9 && !still(s)) || {}).v0 ?? 1;
  const dir = Math.abs(pv) > 1e-9 ? Math.sign(pv) : Math.sign(nextV) || 1;
  const walker = () => runner(g, R(px), footY, H, P, { dir, still: Math.abs(pv) < 1e-9, phase: phaseFor('runner', H, walked(f, t) * k) });
  if ((walking && near < 0.5) || inShop) walker();

  // the car, driven and then parked; its driver at the wheel until it parks
  const braking = t < parkT - 1e-9 && f.acc(t) < -1e-9 && f.vel(t) > 1e-9;
  car(g, R(carX) + carL * 0.5, Yc, carL, P, { dir: 1, brake: braking, phase: phaseFor('car', carL, (carX - f.pos(0)) * k) });
  if (t < parkT - 1e-9 || !onFoot) {
    const hx = R(carX) + carL * 0.5 - carL * 0.36, hy = Yc - carL * 0.055 - carL * 0.34 * 0.78;
    dot(g, hx, hy, carL * 0.045, { fill: 'rgba(30,24,26,0.75)' });
  }
  if (walking && near >= 0.5) walker();
  const top = walking || inShop ? footY - H : Yc - carL * 0.34;

  // each moment the motion changes, rung out at the engine's own time
  const events = [];
  for (let i = 1; i < S.length; i++) {
    const a = S[i - 1], b = S[i], te = b.t0;
    let text = null;
    if (a.who !== 'foot' && b.who === 'foot') text = 'parks';
    else if (still(b)) text = b.who === 'foot' ? 'at the shop' : 'stops';
    else if (still(a)) text = a.who === 'foot' ? 'leaves the shop' : 'sets off';
    else if (a.v1 * b.v0 < 0) text = 'turns back';
    if (text) events.push({ te, text, foot: b.who === 'foot' });
  }
  const back = onFoot && Math.abs(f.pos(f.tMax) - f.pos(parkT)) < 1e-6 * Math.max(1, Math.abs(f.pos(parkT)));
  events.push({ te: f.tMax, text: back ? 'back at the car' : 'the end', foot: onFoot });
  let caption = false;
  for (const ev of events) {
    const { age, life } = ageOf(t, ev.te, f.tMax, f.tMax / 12);
    if (age < 0 || age > life) continue;
    const ex = R(f.pos(ev.te)), ey = ev.foot ? footAt(ev.te) - H * 0.5 : Yc - carL * 0.18;
    pulse(g, ex, ey, age, life, P.mark, { radius: H * 0.8 });
    L.add(ev.text, ex, top - 50, { color: P.mark, align: 'center', pri: 7, size: 14, weight: 700 });
    caption = true;
  }
  if (inShop && !caption) L.add('in the shop', R(px), top - 20, { color: P.ink, align: 'center', pri: 6, size: 13 });

  // velocity along the road, dashed (rule 2), over whoever is moving: long enough to read, still in proportion
  const v = pv;
  if (show.velocity !== false && Math.abs(v) > 1e-6 && !inShop) {
    const vMax = Math.max(...S.flatMap((s) => [Math.abs(s.v0), Math.abs(s.v1)]), 1e-6);
    const len = Math.sign(v) * (34 + 70 * Math.abs(v) / vMax);
    const ax = walking ? R(px) : R(carX) + carL * 0.1, ay = top - 16;
    arrow(g, ax, ay, ax + len, ay, { color: P.velVec, width: 2.8, head: 11, dash: [7, 4] });
    L.add(T`${s3(Math.abs(v))} [m s^-1]`, ax + len + (v > 0 ? 3 : -3), ay, { color: P.vel, align: v > 0 ? 'left' : 'right', pri: 7, size: 14, weight: 700, maxPush: 20 });
  }
  L.reserve(F.card); L.reserve(F.map);
  // on a laptop the readouts' column; on a phone the stage runs under it and is panned clear
  if (!F.phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H }); L.reserve({ x: w - 150, y: 0, w: 150, h: 70 }); }
  L.draw(g, w, h);

  // ── the screen's, not the street's: the whole road at a glance, and the graph
  unview(g);
  mapStrip(g, F.map, P, E, { xLo, xHi, wl: cx - half, wr: cx + half, shops: stops.map((s) => s.x0), carX, walker: onFoot && t >= parkT - 1e-9 ? px : null, phone: F.phone }, w, h);
  graphCard(g, F.card, f, t, P, w, h);
  return null;
}

/** The whole road on one strip, to its own scale: the shop, the car, the
    driver, and a frame round the stretch the street above is showing. */
function mapStrip(g, b, P, E, m, w, h) {
  const L = labels();
  paper(g, b.x, b.y, b.w, b.h, { step: 8 });
  g.save(); g.strokeStyle = withAlpha(P.strong, 0.18); g.lineWidth = 1; g.beginPath(); g.roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 8); g.stroke(); g.restore();
  g.save(); g.font = `600 13px ${cssVar('--font', 'system-ui, sans-serif')}`;
  const cap = m.phone ? '' : 'the whole road', cw = cap ? g.measureText(cap).width + 16 : 0;
  const lw = g.measureText(`${s3(m.xLo)} m`).width, rw = g.measureText(`${s3(m.xHi)} m`).width;
  g.restore();
  const x0 = b.x + 12 + cw + lw + 10, x1 = b.x + b.w - 14 - rw - 10, y = b.y + b.h / 2;
  const M = (x) => x0 + ((x - m.xLo) / ((m.xHi - m.xLo) || 1)) * (x1 - x0);
  if (cap) L.add(cap, b.x + 12, y, { color: P.muted, align: 'left', pri: 5, size: 13, bg: false });
  L.add(`${s3(m.xLo)} m`, x0 - 8, y, { color: P.muted, align: 'right', pri: 5, size: 13, bg: false });
  L.add(`${s3(m.xHi)} m`, x1 + 8, y, { color: P.muted, align: 'left', pri: 5, size: 13, bg: false });
  // the road, and the stretch in view
  g.fillStyle = E.night ? '#4a4044' : '#8d8487'; g.fillRect(x0, y - 2, x1 - x0, 4);
  const a = clamp(M(m.wl), x0 - 6, x1 + 6), z = clamp(M(m.wr), x0 - 6, x1 + 6);
  g.save(); g.fillStyle = withAlpha(P.strong, 0.12); g.strokeStyle = withAlpha(P.strong, 0.55); g.lineWidth = 1.4;
  g.beginPath(); g.roundRect(a, b.y + 4, Math.max(6, z - a), b.h - 8, 4); g.fill(); g.stroke(); g.restore();
  // the shop, the car, the driver
  for (const sx of m.shops) {
    const X = M(sx); g.fillStyle = E.night ? '#2f4440' : '#3f5a54'; g.fillRect(X - 5, y - 10, 10, 8);
    g.fillStyle = E.night ? '#b8a998' : '#9a5048'; g.fillRect(X - 6, y - 12, 12, 3);
  }
  { const X = M(m.carX); g.fillStyle = E.night ? '#8d97a6' : '#5f6f84'; g.beginPath(); g.roundRect(X - 7, y - 4, 14, 6, 2); g.fill();
    dot(g, X - 4, y + 2.5, 2, { fill: '#222' }); dot(g, X + 4, y + 2.5, 2, { fill: '#222' }); }
  if (m.walker != null) dot(g, M(m.walker), y - 1, 3.5, { fill: P.ink, stroke: P.card, width: 1.5 });
  L.draw(g, w, h);
}

/** The (t, v) graph on its paper card: the six straight lines, the area to
    now, the ticks in one row under the plot and the found times as spans. */
function graphCard(g, c, f, t, P, w, h) {
  const S = f.S, L = labels();
  paper(g, c.x, c.y, c.w, c.h);
  g.save(); g.strokeStyle = withAlpha(P.strong, 0.18); g.lineWidth = 1; g.beginPath(); g.roundRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, 8); g.stroke(); g.restore();
  const x0 = c.x + 52, x1 = c.x + c.w - 42, y0 = c.y + 40;
  const X = (tt) => x0 + (tt / f.tMax) * (x1 - x0);
  g.save(); g.font = `700 13px ${cssVar('--font', 'system-ui, sans-serif')}`;
  const spans = [], ends = [-Infinity, -Infinity];
  for (const s of S.filter((q) => q.found)) {
    const text = T`t_${s.i} = ${s3(s.t)} [s]`, half = g.measureText(text).width / 2 + 8, mid = (X(s.t0) + X(s.t1)) / 2;
    const row = mid - half > ends[0] ? 0 : 1; ends[row] = mid + half; spans.push({ s, text, row });
  }
  g.restore();
  const rows = spans.length ? Math.max(...spans.map((q) => q.row)) + 1 : 0;
  const y1 = c.y + c.h - (rows ? 34 + rows * 24 : 34);
  L.add('Velocity–time graph', c.x + c.w - 14, c.y + 17, { color: P.strong, align: 'right', pri: 9, size: 13, weight: 700, bg: false });
  const vs = S.flatMap((s) => [s.v0, s.v1, 0]);
  const vHi0 = Math.max(...vs), vLo0 = Math.min(...vs), pad = (vHi0 - vLo0 || 1) * 0.1;
  const vHi = vHi0 + pad, vLo = vLo0 < 0 ? vLo0 - pad : 0;
  const V = (v) => y1 - ((v - vLo) / (vHi - vLo)) * (y1 - y0);
  // the time ticks: faint uprights, the figures in one row under the plot
  const tstep = niceStep(f.tMax, c.w < 360 ? 4 : 8);
  for (let tt = 0; tt <= f.tMax + 1e-9; tt += tstep) {
    stroke(g, [{ x: X(tt), y: y0 }, { x: X(tt), y: y1 }], { color: withAlpha(P.faint, 0.35), width: 1 });
    L.add(s3(tt), X(tt), y1 + 14, { color: P.muted, align: 'center', pri: 2, size: 13, bg: false, maxPush: 0 });
  }
  // the area up to now, forwards and back
  for (const s of S) {
    const a = s.t0, b = Math.min(s.t1, t);
    if (b <= a) continue;
    const vb = s.v0 + s.a * (b - s.t0);
    g.save(); g.fillStyle = withAlpha(P.disp, (s.v0 + vb) >= 0 ? 0.26 : 0.14);
    g.beginPath(); g.moveTo(X(a), V(0)); g.lineTo(X(a), V(s.v0)); g.lineTo(X(b), V(vb)); g.lineTo(X(b), V(0)); g.closePath(); g.fill(); g.restore();
  }
  stroke(g, [{ x: x0, y: V(0) }, { x: x1 + 10, y: V(0) }], { color: P.axis, width: 1.8 });
  stroke(g, [{ x: x0, y: y1 }, { x: x0, y: y0 - 8 }], { color: P.axis, width: 1.8 });
  L.add(T`v` + ' (' + T`[m s^-1]` + ')', x0 - 8, c.y + 17, { color: P.muted, align: 'left', pri: 8, size: 13, bg: false });
  L.add(T`t` + ' (s)', x1 + 12, V(0), { color: P.muted, align: 'left', pri: 8, size: 13, bg: false });
  const vstep = niceStep(vHi - vLo, clamp(Math.floor((y1 - y0) / 24) + 1, 3, 7));
  for (let v = Math.ceil(vLo / vstep) * vstep; v <= vHi + 1e-9; v += vstep) {
    if (Math.abs(v) < 1e-9) { L.add(s3(0), x0 - 8, V(0), { color: P.muted, align: 'right', pri: 2, size: 13, bg: false, maxPush: 0 }); continue; }
    stroke(g, [{ x: x0 - 4, y: V(v) }, { x: x0, y: V(v) }], { color: P.axis, width: 1.4 });
    L.add(s3(v), x0 - 8, V(v), { color: P.muted, align: 'right', pri: 2, size: 13, bg: false, maxPush: 0 });
  }
  // the segments, each straight; a jump between two is a gap, never a line
  for (const s of S) {
    const on = t >= s.t0 - 1e-9 && t <= s.t1 + 1e-9;
    stroke(g, [{ x: X(s.t0), y: V(s.v0) }, { x: X(s.t1), y: V(s.v1) }], { color: P.vel, width: on ? 3.2 : 2.2, alpha: t >= s.t0 ? 1 : 0.4, dash: [6, 4] });
  }
  // the times the engine found, as spans under the plot, in a second row where two would touch
  for (const sp of spans) {
    const s = sp.s, a = X(s.t0), b = X(s.t1), y = y1 + 38 + sp.row * 24;
    stroke(g, [{ x: a, y }, { x: b, y }], { color: P.mark, width: 1.6 });
    for (const e of [a, b]) stroke(g, [{ x: e, y: y - 5 }, { x: e, y: y + 5 }], { color: P.mark, width: 1.6 });
    L.add(sp.text, (a + b) / 2, y, { color: P.mark, align: 'center', pri: 7, size: 13, weight: 700, maxPush: 0 });
  }
  // now
  stroke(g, [{ x: X(t), y: y0 - 4 }, { x: X(t), y: y1 }], { color: P.muted, width: 1.4, dash: [4, 4] });
  dot(g, X(t), V(f.vel(t)), 5, { fill: P.card, stroke: P.vel, width: 2.4 });
  L.draw(g, w, h);
}
