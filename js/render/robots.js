// robots.js — the stage for two robots on a square floor, seen from above at
// one scale both ways: the floor ABCD (i along AB, j along AD), its centre O.
//
// THE PLACE. A tiled arena floor on a warehouse's concrete, filling the
// stage: tiles with grout (the grout is the floor's grid, one tile every few
// metres), a little variation tile to tile and the sheen of the lights on
// them; a low skirting wall round the edge throwing a shadow inward, a
// bollard at each corner A–D, a brass centre mark at O, and the floor's side
// as a dimension line under AB. Concrete outside, with saw-cut joints, a
// painted line and scuffs.
//
// THE ROBOTS. Each is drawn from above, turned the way it moves: two treads
// (their bars running with the distance it has covered), a metal chassis, a
// domed shell in its own colour (R the displacement hue its track is drawn
// in, S the second-object magenta) with its letter on it, a sensor eye at the
// front and two headlamps lighting the floor ahead, and a shadow under it.
// Its velocity is an arrow in the velocity hue for both (rule 2). Its track
// faintly to the floor's edge and strongly so far.
//
// THE MOMENT. The vector from S to R now is drawn in the marker colour with
// its length. At the engine's time of closest approach (f.tc) a ring pulses
// at each robot and the gap between them draws itself in from S to R, and it
// stays, with the time and the distance said once. A robot reaching the
// floor's edge (f.leaves) bumps the skirting.
//
// Everything drawn is read from js/core/robots.js (rule 4).

import { pulse, dust, ageOf } from './effects.js';
import { env, rng, softShadow } from './scenery.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, niceStep, hudBoxes } from './util.js';
import { T, num } from '../notation.js';

const HUD = 250, HUD_H = 290, TAU = Math.PI * 2;
/** Three significant figures, trailing zeros dropped (50 → 50, 9.1526 → 9.15). */
const s3 = (x) => {
  if (!isFinite(x) || Math.abs(x) < 1e-12) return num(0, 0);
  return num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)))), { trim: true });
};
const fontOf = () => { try { return getComputedStyle(document.documentElement).getPropertyValue('--font').trim() || 'system-ui, sans-serif'; } catch { return 'system-ui, sans-serif'; } };
const ease = (u) => 1 - (1 - u) ** 3;

/** Two #rrggbb colours mixed, u of the way from a to b. */
function mix(a, b, u) {
  const p = (c) => { const m = /^#([0-9a-f]{6})$/i.exec(String(c).trim()); return m ? [16, 8, 0].map((s) => (parseInt(m[1], 16) >> s) & 255) : null; };
  const A = p(a), B = p(b); if (!A || !B) return a;
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * u)).join(',')})`;
}

/* ── the place ─────────────────────────────────────────────────────────── */

/** Warehouse concrete over the whole stage: a cool grey slab with grain,
    saw-cut joints and a few scuffs. */
function concrete(g, w, h, E) {
  const R = rng(73), night = E.night;
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, night ? '#3d383b' : '#bdb6af'); gr.addColorStop(1, night ? '#2f2b2e' : '#aaa29c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++) {
    const x = R() * w, y = R() * h, rr = 60 + R() * 140, s = g.createRadialGradient(x, y, 0, x, y, rr);
    const c = R() < 0.5 ? '0,0,0' : '255,255,255';
    s.addColorStop(0, `rgba(${c},${night ? 0.07 : 0.08})`); s.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = s; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < (w * h) / 260; i++) {
    g.fillStyle = R() < 0.5 ? `rgba(0,0,0,${0.06 + R() * 0.1})` : `rgba(255,255,255,${night ? 0.03 + R() * 0.05 : 0.08 + R() * 0.12})`;
    g.fillRect(R() * w, R() * h, 1 + R() * 1.4, 1 + R() * 1.4);
  }
  // saw-cut joints: a dark cut with a lit lip
  const J = 150;
  for (let x = J * 0.6; x < w; x += J) { line(g, x, 0, x, h, night ? 'rgba(0,0,0,0.45)' : 'rgba(70,60,55,0.35)', 1.4); line(g, x + 1.4, 0, x + 1.4, h, 'rgba(255,255,255,0.08)', 1); }
  for (let y = J * 0.45; y < h; y += J) { line(g, 0, y, w, y, night ? 'rgba(0,0,0,0.45)' : 'rgba(70,60,55,0.35)', 1.4); line(g, 0, y + 1.4, w, y + 1.4, 'rgba(255,255,255,0.08)', 1); }
  // tyre scuffs from forklifts long gone
  g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const x = R() * w, y = R() * h, a = R() * TAU, l = 60 + R() * 120;
    g.strokeStyle = `rgba(0,0,0,${night ? 0.045 : 0.035})`; g.lineWidth = 4 + R() * 3;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.6, y + Math.sin(a + 0.4) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
}
function line(g, x0, y0, x1, y1, color, width) { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }

/** The tiled floor in the box (x, y, S × S px), tiles `tile` px from its
    bottom-left corner A: grout, tile-to-tile variation, a bevel, the sheen. */
function tiles(g, x, y, S, tile, E) {
  const R = rng(19), night = E.night;
  g.save(); g.beginPath(); g.rect(x, y, S, S); g.clip();
  g.fillStyle = night ? '#1f1a1d' : '#9e928a'; g.fillRect(x, y, S, S);          // the grout
  const gap = Math.max(1.5, Math.min(3, tile * 0.05)), n = Math.ceil(S / tile - 1e-6);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const tx = x + i * tile + gap / 2, ty = y + S - (j + 1) * tile + gap / 2, tw = tile - gap;
    const v = (R() - 0.5) * 0.08;
    const base = night ? [84, 76, 80] : [226, 217, 207];
    const c = base.map((q) => Math.round(clamp(q * (1 + v), 0, 255)));
    const tg = g.createLinearGradient(tx, ty, tx + tw, ty + tw);
    tg.addColorStop(0, `rgb(${c.map((q) => Math.min(255, q + 10)).join(',')})`); tg.addColorStop(1, `rgb(${c.join(',')})`);
    g.fillStyle = tg; g.fillRect(tx, ty, tw, tw);
    // the bevel: lit edge top-left, shaded edge bottom-right
    g.fillStyle = night ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)'; g.fillRect(tx, ty, tw, 1.2); g.fillRect(tx, ty, 1.2, tw);
    g.fillStyle = night ? 'rgba(0,0,0,0.30)' : 'rgba(90,75,65,0.22)'; g.fillRect(tx, ty + tw - 1.2, tw, 1.2); g.fillRect(tx + tw - 1.2, ty, 1.2, tw);
    // a fleck or two in the glaze
    for (let f = 0; f < 3; f++) { g.fillStyle = `rgba(0,0,0,${0.05 + R() * 0.06})`; g.fillRect(tx + R() * tw, ty + R() * tw, 1.4, 1.4); }
  }
  // the sheen of the lights: two soft pools and a long diagonal glint
  for (const [u, v, rr] of [[0.3, 0.28, 0.55], [0.74, 0.7, 0.4]]) {
    const cx = x + S * u, cy = y + S * v, s = g.createRadialGradient(cx, cy, 0, cx, cy, S * rr);
    s.addColorStop(0, `rgba(255,248,236,${night ? 0.16 : 0.32})`); s.addColorStop(1, 'rgba(255,248,236,0)');
    g.fillStyle = s; g.fillRect(x, y, S, S);
  }
  const gl = g.createLinearGradient(x, y, x + S, y + S);
  gl.addColorStop(0.36, 'rgba(255,255,255,0)'); gl.addColorStop(0.42, `rgba(255,255,255,${night ? 0.05 : 0.14})`); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.fillRect(x, y, S, S);
  // the skirting's shadow on the tiles: deepest under the top and left walls (the light is above left)
  for (const [x0, y0, x1, y1, a] of [[x, y, x, y + 20, 0.5], [x, y, x + 20, y, 0.45], [x, y + S, x, y + S - 8, 0.2], [x + S, y, x + S - 8, y, 0.2]]) {
    const s = g.createLinearGradient(x0, y0, x1, y1);
    s.addColorStop(0, `rgba(0,0,0,${night ? a : a * 0.6})`); s.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = s; g.fillRect(x, y, S, S);
  }
  g.restore();
}

/** The skirting wall round the floor, `t` px thick, seen from above, with
    its shadow cast out onto the concrete below and right. */
function skirting(g, x, y, S, t, E) {
  const night = E.night;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 10; g.shadowOffsetX = 4; g.shadowOffsetY = 5;
  g.fillStyle = night ? '#5a5157' : '#e9e2da';
  g.beginPath(); g.rect(x - t, y - t, S + 2 * t, S + 2 * t); g.rect(x, y, S, S); g.fill('evenodd');
  g.restore();
  const top = g.createLinearGradient(x - t, y - t, x + S + t, y + S + t);
  top.addColorStop(0, night ? '#776d73' : '#f7f2ec'); top.addColorStop(1, night ? '#4c444a' : '#d6cdc3');
  g.fillStyle = top; g.beginPath(); g.rect(x - t, y - t, S + 2 * t, S + 2 * t); g.rect(x, y, S, S); g.fill('evenodd');
  g.strokeStyle = night ? 'rgba(0,0,0,0.5)' : 'rgba(80,65,55,0.45)'; g.lineWidth = 1;
  g.strokeRect(x - t + 0.5, y - t + 0.5, S + 2 * t - 1, S + 2 * t - 1); g.strokeRect(x - 0.5, y - 0.5, S + 1, S + 1);
  // a painted safety line on the concrete, a hand's width out
  g.strokeStyle = night ? 'rgba(196,170,110,0.45)' : 'rgba(170,140,70,0.6)'; g.lineWidth = 3;
  g.strokeRect(x - t - 9, y - t - 9, S + 2 * t + 18, S + 2 * t + 18);
}

/** A bollard from above at a corner: a shadow, a dark base ring, a domed cap with a reflective band. */
function bollard(g, x, y, r) {
  softShadow(g, x + r * 0.5, y + r * 0.6, r * 1.6, r * 1.2, 0.9);
  g.save();
  g.fillStyle = '#2a2427'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  const cap = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 0.86);
  cap.addColorStop(0, '#f4ead2'); cap.addColorStop(0.55, '#c9b07a'); cap.addColorStop(1, '#8e7746');
  g.fillStyle = cap; g.beginPath(); g.arc(x, y, r * 0.84, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(40,30,25,0.6)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r * 0.55, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.32, r * 0.18, 0, TAU); g.fill();
  g.restore();
}

/** The centre mark at O: a brass disc set in the tiles, with a cross. */
function centreMark(g, x, y, r) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x + 1, y + 1.5, r + 1, 0, TAU); g.fill();
  const b = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
  b.addColorStop(0, '#f1dfae'); b.addColorStop(0.6, '#b8975a'); b.addColorStop(1, '#7d6235');
  g.fillStyle = b; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(60,40,20,0.8)'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(x - r * 0.7, y); g.lineTo(x + r * 0.7, y); g.moveTo(x, y - r * 0.7); g.lineTo(x, y + r * 0.7); g.stroke();
  g.restore();
}


/* ── the warehouse round the floor ─────────────────────────────────────── */

/** A box of cardboard from above at (x, y), w × h: shaded, a strip of tape. */
function box(g, x, y, w, h, R) {
  const c = ['#b08a5c', '#a07d52', '#bb9767', '#9a7a55'][Math.floor(R() * 4)];
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, c); gr.addColorStop(1, '#7f6240');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,240,210,0.35)'; g.fillRect(x, y, w, 1.2); g.fillRect(x, y, 1.2, h);
  g.fillStyle = 'rgba(205,190,160,0.75)'; if (w > h) g.fillRect(x + w / 2 - 1.5, y, 3, h); else g.fillRect(x, y + h / 2 - 1.5, w, 3);
  g.strokeStyle = 'rgba(40,25,10,0.5)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Pallet racking from above in the box: two steel beams down its length,
    uprights at every bay, and a pallet of boxes in most bays. */
function rack(g, x, y, w, h, seed) {
  const R = rng(seed), along = w >= h, len = along ? w : h, dep = along ? h : w;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 10; g.shadowOffsetX = 5; g.shadowOffsetY = 6;
  g.fillStyle = 'rgba(40,36,38,0.9)'; g.fillRect(x, y, w, h); g.restore();
  const bay = Math.max(44, Math.min(70, dep * 1.3)), nb = Math.max(1, Math.floor(len / bay)), bl = len / nb;
  const at = (u, v, a, b) => (along ? [x + u, y + v, a, b] : [x + v, y + u, b, a]);
  for (let i = 0; i < nb; i++) {
    if (R() < 0.18) continue;
    // the pallet: slats of pale wood, then boxes on it
    const [px, py, pw, ph] = at(i * bl + 4, 4, bl - 8, dep - 8);
    g.fillStyle = '#9b8466'; g.fillRect(px, py, pw, ph);
    g.fillStyle = 'rgba(60,40,20,0.35)'; for (let k = 1; k < 5; k++) { if (along) g.fillRect(px, py + (ph * k) / 5, pw, 1); else g.fillRect(px + (pw * k) / 5, py, 1, ph); }
    const cols = R() < 0.5 ? 2 : 3, rows = 2;
    for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
      if (R() < 0.12) continue;
      const bw = (pw - 4) / (along ? cols : rows), bh = (ph - 4) / (along ? rows : cols);
      const bx = px + 2 + (along ? a : b) * bw, by = py + 2 + (along ? b : a) * bh;
      box(g, bx + 1, by + 1, bw - 2, bh - 2, R);
    }
  }
  // the beams and uprights: steel, lit from above left
  g.fillStyle = '#56606a';
  for (const v of [0, dep - 4]) { const [bx, by, bw, bh] = at(0, v, len, 4); g.fillRect(bx, by, bw, bh); }
  g.fillStyle = 'rgba(255,255,255,0.25)';
  for (const v of [0, dep - 4]) { const [bx, by, bw, bh] = at(0, v, len, 1.2); g.fillRect(bx, by, bw, bh); }
  g.fillStyle = '#2d3238';
  for (let i = 0; i <= nb; i++) for (const v of [0, dep - 6]) { const [bx, by, bw, bh] = at(Math.min(len - 6, i * bl), v, 6, 6); g.fillRect(bx, by, bw, bh); }
}

/** Hazard stripes painted on the floor in the box: ochre and black, diagonal. */
function hazard(g, x, y, w, h) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#b9984a'; g.fillRect(x, y, w, h);
  g.fillStyle = '#26221f';
  for (let d = -h; d < w + h; d += 14) { g.beginPath(); g.moveTo(x + d, y); g.lineTo(x + d + 7, y); g.lineTo(x + d + 7 - h, y + h); g.lineTo(x + d - h, y + h); g.closePath(); g.fill(); }
  g.restore();
}

/** A charging dock from above, its back to the top of the box: a painted bay,
    the charger with its lamp and contacts, a cable to the wall. */
function dock(g, x, y, w, h, E) {
  g.strokeStyle = 'rgba(196,170,110,0.75)'; g.lineWidth = 2.5; g.strokeRect(x, y, w, h);
  hazard(g, x, y + h - 9, w, 9);
  softShadow(g, x + w / 2 + 4, y + 20, w * 0.4, 12, 0.7);
  const ux = x + w / 2 - w * 0.3, uw = w * 0.6;
  const gr = g.createLinearGradient(0, y + 4, 0, y + 26); gr.addColorStop(0, '#6b6870'); gr.addColorStop(1, '#3a373e');
  g.fillStyle = gr; g.beginPath(); g.roundRect(ux, y + 4, uw, 22, 5); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#ffd88a'; g.beginPath(); g.roundRect(ux + uw * 0.2, y + 9, uw * 0.6, 4, 2); g.fill();
  g.fillStyle = 'rgba(255,216,138,0.25)'; g.beginPath(); g.ellipse(x + w / 2, y + 11, uw * 0.45, 8, 0, 0, TAU); g.fill();
  g.fillStyle = '#c8b27c'; for (const s of [-1, 1]) g.fillRect(x + w / 2 + s * 8 - 2, y + 26, 4, 8);
  g.strokeStyle = '#1d1b1f'; g.lineWidth = 3; g.beginPath(); g.moveTo(ux + 6, y + 6); g.bezierCurveTo(ux - 12, y - 6, ux - 6, y - 14, ux - 18, y - 22); g.stroke();
  void E;
}

/** A traffic cone from above: a square rubber base, the cone in rings, a reflective band. */
function cone(g, x, y, r) {
  softShadow(g, x + r * 0.5, y + r * 0.6, r * 1.5, r * 1.1, 0.8);
  g.fillStyle = '#2a2427'; g.beginPath(); g.roundRect(x - r, y - r, 2 * r, 2 * r, r * 0.3); g.fill();
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 0.85);
  gr.addColorStop(0, '#d98a6a'); gr.addColorStop(1, '#8f4a35');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 0.8, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(245,240,230,0.9)'; g.lineWidth = r * 0.18; g.beginPath(); g.arc(x, y, r * 0.48, 0, TAU); g.stroke();
  g.fillStyle = '#b45f45'; g.beginPath(); g.arc(x, y, r * 0.2, 0, TAU); g.fill();
}

/** The props in the warehouse round the floor, kept to the free space:
    left of the floor (under the readouts and beside them) and right of it. */
function warehouse(g, w, h, fx, fy, S, wall, phone, E) {
  if (phone) return;
  const outL = fx - wall - 22, outR = fx + S + wall + 22;
  // beside the readouts, between them and the floor: a run of racking
  if (outL - (HUD + 10) >= 40) rack(g, HUD + 10, 14, Math.min(54, outL - HUD - 10), HUD_H - 24, 7);
  // under the readouts: racking along the bottom, a charging dock and a row of cones
  const lw = outL - 14;
  if (lw >= 120) {
    rack(g, 14, h - 64, lw - 6, 50, 11);
    const dw = Math.min(110, lw * 0.45), dx = 18, dy = HUD_H + 16, dh = Math.max(60, h - 64 - dy - 22);
    if (dh >= 60) {
      dock(g, dx, dy, dw, Math.min(dh, 90), E);
      hazard(g, dx + dw + 16, dy, 10, Math.min(dh, 120));
      for (let i = 0; i < 3; i++) cone(g, dx + dw + 46 + (i % 2) * 22, dy + 16 + i * 30, 10);
    }
  }
  // right of the floor: a run of racking below the clock, and a pallet waiting
  if (w - 12 - outR >= 48) {
    const rw = Math.min(56, w - 12 - outR);
    rack(g, w - 12 - rw, 78, rw, h - 78 - 110, 13);
    const R = rng(29), px = w - 12 - rw, py = h - 92;
    g.fillStyle = '#9b8466'; g.fillRect(px, py, rw, 40);
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) box(g, px + 2 + a * (rw - 4) / 2, py + 2 + b * 18, (rw - 4) / 2 - 2, 16, R);
    cone(g, px - 20, py + 20, 10);
  }
}

/* ── the robot ─────────────────────────────────────────────────────────── */

/** A robot from above at (x, y), facing angle a (radians, screen), s px
    across: treads whose bars run with `phase` (px travelled), a chassis, a
    dome in `color` with its letter, a sensor eye, headlamps, a shadow. */
export function robotTop(g, x, y, s, a, color, P, { letter = null, phase = 0, lamps = true } = {}) {
  softShadow(g, x + s * 0.12, y + s * 0.18, s * 0.72, s * 0.6, 0.85);
  g.save(); g.translate(x, y); g.rotate(a);
  // the headlamps' light on the floor ahead
  if (lamps) {
    const bl = g.createRadialGradient(s * 0.45, 0, 0, s * 0.45, 0, s * 1.5);
    bl.addColorStop(0, 'rgba(255,244,214,0.42)'); bl.addColorStop(1, 'rgba(255,244,214,0)');
    g.fillStyle = bl; g.beginPath(); g.moveTo(s * 0.45, -s * 0.2); g.lineTo(s * 1.9, -s * 0.72); g.quadraticCurveTo(s * 2.1, 0, s * 1.9, s * 0.72); g.lineTo(s * 0.45, s * 0.2); g.closePath(); g.fill();
  }
  // the treads, their bars running with the distance covered
  const tl = s * 0.96, tw = s * 0.24, bar = s * 0.12;
  for (const sy of [-1, 1]) {
    const ty = sy * s * 0.36 - tw / 2;
    g.fillStyle = '#18151a'; g.beginPath(); g.roundRect(-tl / 2, ty, tl, tw, tw * 0.45); g.fill();
    g.save(); g.beginPath(); g.roundRect(-tl / 2, ty, tl, tw, tw * 0.45); g.clip();
    g.fillStyle = '#4a454b';
    const off = ((phase % bar) + bar) % bar;
    for (let bx = -tl / 2 - bar + off; bx < tl / 2; bx += bar) g.fillRect(bx, ty + 1.5, bar * 0.45, tw - 3);
    g.restore();
  }
  // the chassis
  const ch = g.createLinearGradient(0, -s * 0.3, 0, s * 0.3);
  ch.addColorStop(0, '#a7a2a4'); ch.addColorStop(0.5, '#7b7678'); ch.addColorStop(1, '#5a5558');
  g.fillStyle = ch; g.beginPath(); g.roundRect(-s * 0.42, -s * 0.27, s * 0.84, s * 0.54, s * 0.12); g.fill();
  g.strokeStyle = 'rgba(20,16,18,0.7)'; g.lineWidth = 1.2; g.stroke();
  // headlamps at the front corners, a tail light at the back
  g.fillStyle = '#fff6dc';
  for (const sy of [-1, 1]) { g.beginPath(); g.arc(s * 0.38, sy * s * 0.18, s * 0.05, 0, TAU); g.fill(); }
  g.fillStyle = '#7a2a2a'; g.fillRect(-s * 0.43, -s * 0.08, s * 0.04, s * 0.16);
  // the dome, lit from above left
  const dr = s * 0.3, dm = g.createRadialGradient(-dr * 0.35, -dr * 0.4, dr * 0.1, 0, 0, dr);
  dm.addColorStop(0, mix(color, '#ffffff', 0.55)); dm.addColorStop(0.55, color); dm.addColorStop(1, mix(color, '#000000', 0.35));
  g.fillStyle = dm; g.beginPath(); g.arc(-s * 0.02, 0, dr, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2; g.stroke();
  // the sensor eye: a dark visor at the front of the dome, a glowing lens in it
  g.fillStyle = '#141216'; g.beginPath(); g.ellipse(dr * 0.78, 0, s * 0.07, s * 0.16, 0, 0, TAU); g.fill();
  const ln = g.createRadialGradient(dr * 0.8, 0, 0, dr * 0.8, 0, s * 0.07);
  ln.addColorStop(0, '#ffffff'); ln.addColorStop(0.5, '#ffe7b0'); ln.addColorStop(1, 'rgba(255,231,176,0)');
  g.fillStyle = ln; g.beginPath(); g.arc(dr * 0.8, 0, s * 0.07, 0, TAU); g.fill();
  g.restore();
  // the letter, upright whichever way the robot faces
  if (letter) {
    g.save(); g.font = `800 ${Math.max(13, Math.round(s * 0.36))}px ${fontOf()}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lx = x - Math.cos(a) * s * 0.06, ly = y - Math.sin(a) * s * 0.06;
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeText(letter, lx, ly + 0.5);
    g.fillStyle = '#ffffff'; g.fillText(letter, lx, ly + 0.5); g.restore();
  }
}

/* ── the stage ─────────────────────────────────────────────────────────── */

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'robots') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), E = env();
  const L = labels(), held = [];
  const reserve = (b) => { held.push(b); L.reserve(b); };
  const free = (b) => b.x >= 4 && b.y >= 4 && b.x + b.w <= w - 4 && b.y + b.h <= h - 4
    && !held.some((q) => b.x < q.x + q.w && b.x + b.w > q.x && b.y < q.y + q.h && b.y + b.h > q.y);
  const textW = (s, size = 14) => { g.save(); g.font = `700 ${size}px ${fontOf()}`; const m = g.measureText(s).width; g.restore(); return m; };
  // a free spot for a label block tw × hh px near (x, y): tried first along
  // `dir` (radians, screen), then turning away from it either way, nearest first
  const place = (x, y, tw, hh, radii, dir = -Math.PI / 2) => {
    for (const d of radii) for (const da of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2.0, -2.0, 2.5, -2.5, Math.PI]) {
      const ux = Math.cos(dir + da), uy = Math.sin(dir + da), al0 = ux < -0.35 ? 'right' : ux > 0.35 ? 'left' : 'center';
      const ax = x + ux * d, ay = y + uy * d;
      // the natural alignment first; squeezed for room (a phone), the others
      for (const al of phone ? [al0, ...['center', 'right', 'left'].filter((a) => a !== al0)] : [al0]) {
        const bx = al === 'left' ? ax : al === 'right' ? ax - tw : ax - tw / 2;
        if (al !== al0 && Math.abs(ux) > 0.35 && ((ux > 0) !== (al === 'left'))) continue;   // never back over the thing named
        if (free({ x: bx - 8, y: ay - hh / 2 - 2, w: tw + 16, h: hh + 4 })) return { ax, ay, al };
      }
    }
    return null;
  };
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const half = f.side / 2, phone = w < 520;

  // ── the floor, square, centred on O, clear of the readouts
  // the readouts sit over the stage (the column top left, the clock top
  // right): the concrete may run under them, but not the floor, its posts,
  // its letters or its dimension line
  const HB = hudBoxes(w, 3), [hudL, hudC] = HB, bottom = h - (phone ? 30 : 34);
  const hitsBox = (b, q) => b.x < q.x + q.w && b.x + b.w > q.x && b.y < q.y + q.h && b.y + b.h > q.y;
  const fit = (left, top, right) => {
    const k = Math.min((right - left) / (f.side * 1.18), (bottom - top) / (f.side * 1.18)), cx = (left + right) / 2, cy = (top + bottom) / 2, S = f.side * k;
    return { k, cx, cy, art: { x: cx - S / 2 - 40, y: cy - S / 2 - 22, w: S + 80, h: S + 54 } };
  };
  const pick = (...c) => c.sort((p, q) => q.k - p.k)[0];
  let F = phone ? fit(16, hudC.h + 8, w - 16) : fit(hudL.w + 38, 56, w - 60);
  if (HB.some((b) => hitsBox(F.art, b)))
    F = phone ? pick(fit(16, hudL.h + 8, w - 16), fit(hudL.w + 8, hudC.h + 8, w - 16))
      : pick(fit(hudL.w + 38, hudC.h + 8, w - 60), fit(hudL.w + 38, 56, hudC.x - 12));
  const { k, cx, cy } = F;
  const X = (x) => cx + x * k, Y = (y) => cy - y * k, PX = (p) => ({ x: X(p.x), y: Y(p.y) });
  const fx = X(-half), fy = Y(half), S = f.side * k;
  for (const b of HB) reserve(b);

  concrete(g, w, h, E);
  let step = niceStep(f.side, 10); if (step * k < 16) step *= 2; else if (step * k > 64) step /= 2;
  const wall = clamp(S * 0.018, 5, 9);
  warehouse(g, w, h, fx, fy, S, wall, phone, E);
  skirting(g, fx, fy, S, wall, E);
  // the walls are kept clear of labels
  for (const b of [[fx - wall - 3, fy - wall - 3, S + 2 * wall + 6, wall + 6], [fx - wall - 3, fy + S - 3, S + 2 * wall + 6, wall + 6],
    [fx - wall - 3, fy - wall - 3, wall + 6, S + 2 * wall + 6], [fx + S - 3, fy - wall - 3, wall + 6, S + 2 * wall + 6]]) reserve({ x: b[0], y: b[1], w: b[2], h: b[3] });
  tiles(g, fx, fy, S, step * k, E);
  const br = clamp(S * 0.026, 8, 12);
  for (const [n, x, y, ax, ay] of [['A', -half, -half, -1, 1], ['B', half, -half, 1, 1], ['C', half, half, 1, -1], ['D', -half, half, -1, -1]]) {
    const px = X(x) + ax * wall * 0.5, py = Y(y) + ay * wall * 0.5;
    bollard(g, px, py, br);
    reserve({ x: px - br - 2, y: py - br - 2, w: 2 * br + 4, h: 2 * br + 4 });
    L.add(n, px + ax * (br + 17), py + ay * 4, { color: P.ink, align: 'center', pri: 7, size: 16, weight: 800 });
  }
  centreMark(g, X(0), Y(0), 7);
  reserve({ x: X(0) - 9, y: Y(0) - 9, w: 18, h: 18 });
  L.add('O', X(0) - 12, Y(0) + 14, { color: P.ink, align: 'right', pri: 6, size: 15, weight: 800 });
  // the floor's side, as a dimension line under AB
  {
    const ry = Y(-half) + wall + 18, x0 = X(-half), x1 = X(half), lab = T`${s3(f.side)} [m]`, tw = textW(lab, 13) + 14;
    g.save(); g.strokeStyle = P.strong; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x0, ry); g.lineTo((x0 + x1 - tw) / 2, ry); g.moveTo((x0 + x1 + tw) / 2, ry); g.lineTo(x1, ry);
    for (const x of [x0, x1]) { g.moveTo(x, ry - 6); g.lineTo(x, ry + 6); }
    g.stroke(); g.restore();
    L.add(lab, (x0 + x1) / 2, ry, { color: P.ink, align: 'center', pri: 6, size: 13, weight: 700 });
  }

  // ── each track: faintly to where it ends, strongly so far
  const casing = E.night ? 'rgba(12,10,12,0.55)' : 'rgba(255,255,255,0.75)';
  const each = [{ pos: f.posA, v: f.A.v, c: P.disp, n: 'R', leaves: f.leaves?.R }, { pos: f.posB, v: f.B.v, c: P.second, n: 'S', leaves: f.leaves?.S }];
  for (const r of each) {
    const a = PX(r.pos(0)), b = PX(r.pos(f.tMax)), now = PX(r.pos(t));
    stroke(g, [a, b], { color: r.c, width: 2, alpha: 0.42 });
    stroke(g, [a, now], { color: casing, width: 6 });
    stroke(g, [a, now], { color: r.c, width: 3.2 });
    for (let i = 0; i <= 24; i++) { const u = i / 24; reserve({ x: a.x + (b.x - a.x) * u - 6, y: a.y + (b.y - a.y) * u - 6, w: 12, h: 12 }); }
  }

  // ── where the robots are, how big, which way
  const size = phone ? 38 : clamp(2.6 * k, 40, 52);
  // where each robot is drawn: at the engine's point — except that two robots
  // closer than a body's width are drawn side by side, each pushed apart
  // square to the way they pass, so neither hides the other (a drawing
  // offset of under half a body; the tracks, the gap and its numbers stay
  // at the engine's points)
  let pr = PX(f.posA(t)), ps = PX(f.posB(t));
  {
    const m = size * 1.04, rv = { x: f.A.v.x - f.B.v.x, y: -(f.A.v.y - f.B.v.y) }, rl = Math.hypot(rv.x, rv.y);
    const dx = pr.x - ps.x, dy = pr.y - ps.y;
    if (Math.hypot(dx, dy) < m) {
      let nx, ny;
      if (rl > 1e-9) { nx = -rv.y / rl; ny = rv.x / rl; } else { const l = Math.hypot(dx, dy) || 1; nx = l > 1e-6 ? dx / l : 0; ny = l > 1e-6 ? dy / l : 1; }
      const c = dx * nx + dy * ny, sl = dx * -ny + dy * nx, sg = c < 0 ? -1 : 1;
      const want = sg * Math.sqrt(Math.max(c * c, m * m - sl * sl)), push = (want - c) / 2;
      pr = { x: pr.x + nx * push, y: pr.y + ny * push }; ps = { x: ps.x - nx * push, y: ps.y - ny * push };
    }
  }
  // and a robot's body stays on the floor: its centre may reach the wall (the
  // engine's floor edge), its body is drawn against the wall, nose to it
  const lo = size * 0.5 + 1, inside = (q) => ({ x: clamp(q.x, fx + lo, fx + S - lo), y: clamp(q.y, fy + lo, fy + S - lo) });
  pr = inside(pr); ps = inside(ps);
  const drawn = { R: pr, S: ps };
  for (const q of [pr, ps]) reserve({ x: q.x - size * 0.55, y: q.y - size * 0.55, w: size * 1.1, h: size * 1.1 });
  const along = (a0, a1, n, r) => { for (let i = 0; i <= n; i++) { const v = i / n; reserve({ x: a0.x + (a1.x - a0.x) * v - r, y: a0.y + (a1.y - a0.y) * v - r, w: 2 * r, h: 2 * r }); } };
  // each one's velocity arrow, from its nose (laid out now so labels keep off it)
  const vMax = Math.max(Math.hypot(f.A.v.x, f.A.v.y), Math.hypot(f.B.v.x, f.B.v.y), 1e-9);
  const vArrows = show.velocity === false ? [] : each.map((r) => {
    const q = drawn[r.n], sp = Math.hypot(r.v.x, r.v.y); if (sp < 1e-9) return null;
    const ang = Math.atan2(-r.v.y, r.v.x), len = size * 0.5 + 16 + (sp / vMax) * (phone ? 34 : 46);
    const a = { x: q.x + Math.cos(ang) * size * 0.45, y: q.y + Math.sin(ang) * size * 0.45 }, b = { x: q.x + Math.cos(ang) * len, y: q.y + Math.sin(ang) * len };
    along(a, b, 6, 7); return [a, b];
  }).filter(Boolean);
  // the vector from S to R now, rim to rim — unless it says what the closest moment already says
  const closest = !f.same && f.tc != null && f.tc <= f.tMax + 1e-9 && t >= f.tc - 1e-9;
  let gapA = null;
  {
    const dx = pr.x - ps.x, dy = pr.y - ps.y, dl = Math.hypot(dx, dy), gap = f.gap(t);
    if (dl > size * 1.3 && !(closest && s3(gap) === s3(f.dmin))) {
      const ux = dx / dl, uy = dy / dl;
      gapA = { gap, ux, uy, a0: { x: ps.x + ux * size * 0.5, y: ps.y + uy * size * 0.5 }, a1: { x: pr.x - ux * size * 0.55, y: pr.y - uy * size * 0.55 } };
      along(gapA.a0, gapA.a1, 8, 6);
    }
  }

  // ── the closest moment: a pulse, and the gap drawing itself in, S to R
  if (closest) {
    const a = PX(f.posA(f.tc)), b = PX(f.posB(f.tc));
    const { age, life } = ageOf(t, f.tc, f.tMax);
    const atEnd = Math.abs(f.tc - f.tMax) < 1e-6 * Math.max(1, f.tMax);
    const u = atEnd ? 1 : ease(clamp(age / (life * 0.6), 0, 1));
    const ex = b.x + (a.x - b.x) * u, ey = b.y + (a.y - b.y) * u;
    for (const q of [a, b]) pulse(g, q.x, q.y, age, life, P.mark, { radius: 40 });
    stroke(g, [b, { x: ex, y: ey }], { color: casing, width: 7 });
    stroke(g, [b, { x: ex, y: ey }], { color: P.mark, width: 3.4 });
    for (const q of u >= 1 ? [a, b] : [b]) {
      g.save(); g.fillStyle = P.mark; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, 5.5, 0, TAU); g.fill(); g.stroke(); g.restore();
    }
    for (let i = 0; i <= 10; i++) { const v = i / 10; reserve({ x: b.x + (a.x - b.x) * v - 7, y: b.y + (a.y - b.y) * v - 7, w: 14, h: 14 }); }
    if (u > 0.5) {
      // two lines, or three where a phone leaves no room for a wide block
      const tl = T`t = ${s3(f.tc)} [s]`, dd = T`${s3(f.dmin)} [m]` + ' apart';
      const tries = [['closest at ' + tl, dd], ['closest at', tl, dd]];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      // first choice: square off the gap, on the side away from the floor's centre
      let dir = Math.atan2(a.x - b.x, -(a.y - b.y));
      if (Math.cos(dir) * (mx - X(0)) + Math.sin(dir) * (my - Y(0)) < 0) dir += Math.PI;
      let best = null, lines = tries[0];
      for (const ls of tries) {
        const tw = Math.max(...ls.map((q) => textW(q))) + 12, hh = ls.length * 20 + 4;
        const at = place(mx, my, tw, hh, [34, 54, 80, 110, 150, 190], dir);
        if (at) { best = { ...at, tw, hh }; lines = ls; break; }
      }
      best ??= { ax: mx, ay: my + 40, al: 'center', tw: Math.max(...lines.map((q) => textW(q))) + 12, hh: 44 };
      lines.forEach((q, i) => L.add(q, best.ax, best.ay + (i - (lines.length - 1) / 2) * 20, { color: P.mark, align: best.al, pri: 9 - Math.min(i, 1), size: 14, weight: 700, maxPush: 20 }));
      held.push({ x: (best.al === 'left' ? best.ax : best.al === 'right' ? best.ax - best.tw : best.ax - best.tw / 2) - 6, y: best.ay - best.hh / 2, w: best.tw + 12, h: best.hh });   // kept clear for this label alone: the label system is not told
    }
  }

  // ── the vector from S to R now, with its length
  if (gapA) {
    const { a0, a1, ux, uy } = gapA;
    arrow(g, a0.x, a0.y, a1.x, a1.y, { color: P.mark, width: 2.4, head: 10 });
    const lab = T`${s3(gapA.gap)} [m]`, tw = textW(lab) + 10;
    const best = place((a0.x + a1.x) / 2, (a0.y + a1.y) / 2, tw, 24, [20, 34, 52, 74], Math.atan2(ux, -uy));
    if (best) L.add(lab, best.ax, best.ay, { color: P.mark, align: best.al, pri: 6, size: 14, weight: 700, maxPush: 20 });
  }

  // ── a bump where a robot reaches the floor's edge; each one's velocity
  for (const r of each) if (r.leaves != null && r.leaves <= f.tMax + 1e-9 && t >= r.leaves - 1e-9) {
    const { age, life } = ageOf(t, r.leaves, f.tMax);
    const e = PX(r.pos(r.leaves)); pulse(g, e.x, e.y, age, life, P.strong, { radius: 30 }); dust(g, e.x, e.y, age, life, { size: 0.7, n: 10 });
  }
  for (const r of each) {
    const q = drawn[r.n], now = PX(r.pos(t)), p0 = PX(r.pos(0)), still = Math.hypot(r.v.x, r.v.y) < 1e-9;
    robotTop(g, q.x, q.y, size, still ? 0 : Math.atan2(-r.v.y, r.v.x), r.c, P, { letter: r.n, phase: Math.hypot(now.x - p0.x, now.y - p0.y) });
  }
  // the velocity arrows over the robots, so neither robot hides the other's
  for (const [a, b] of vArrows) arrow(g, a.x, a.y, b.x, b.y, { color: P.vel, width: 2.8, head: 11 });
  L.draw(g, w, h);
  return null;
}
