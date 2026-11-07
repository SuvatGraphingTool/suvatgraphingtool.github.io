// bench.js — the stage for off the edge of a bench or a table: a laboratory
// bench with a ball bearing fired off its end through two strips of foil, or a
// table with a ball rolled off it to the floor.
//
// Side on at one scale both ways, measured from the edge, framed on the
// experiment. A laboratory: a painted wall with a tiled splashback and a
// shelf of glassware, a vinyl floor with a skirting board. With the foil, a
// solid bench (a black resin worktop with its edge, cupboards and drawers on
// a plinth), a spring launcher clamped to the end of it (a barrel, its spring
// showing through a slot, a plunger, a G-clamp round the worktop), and each
// strip of foil held top and bottom by clips on a retort stand, wired to a
// timer that runs from the first strip to the second. The strips TEAR as the
// ball goes through, at the engine's times: the foil splits, curls back and
// throws shards. The distance between them and how much lower the second's
// centre is as dimension lines, and where it really breaks the second strip
// ringed. With the table, a wooden table at its true height and the floor,
// how far out it lands, and dust where it does. The path is drawn in the
// path colour; velocity with its components (across dashed, up solid — rule 2).
//
// Backdrop pieces exported: labWall, labBench, table, foilStrip, launcher.
// Everything drawn is read from js/core/bench.js (rule 4).

import { env, rng, softShadow, fitSide } from './scenery.js';
import { ballAt } from './figures.js';
import { flash, pulse, dust, ageOf, phaseOf, speedLines } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha, cssVar, hudBoxes } from './util.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
/** Three significant figures, trailing zeros dropped: 0.0961 → 0.0961, 0.5 → 0.5. */
const s3 = (x) => {
  if (!isFinite(x) || x === 0) return num(0, 0);
  const dp = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x))));
  // trailing zeros only go when the number is exactly that (given data): 10.98 is 11.0, 0.5 stays 0.5
  return num(x, dp, { trim: Math.abs(x - Number(x.toFixed(dp))) < 1e-9 });
};
/** A small length in the unit it reads best in: 0.0161 m is 1.61 cm. */
const small = (x) => (Math.abs(x) < 0.1 ? T`${s3(x * 100)} [cm]` : T`${s3(x)} [m]`);
const ease = (u) => 1 - (1 - u) ** 3;

const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** Does the segment (x0, y0)–(x1, y1) cross the box? Sampled: arrows are short. */
const crosses = (b, x0, y0, x1, y1) => { for (let i = 0; i <= 12; i++) { const x = x0 + ((x1 - x0) * i) / 12, y = y0 + ((y1 - y0) * i) / 12; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true; } return false; };

/* ── the room ──────────────────────────────────────────────────────────── */

/** The laboratory wall down to the floor at Y, the floor from Y to h; with
    `bench` = { x0, x1, top }, a tiled splashback and a shelf of glassware over it. */
export function labWall(g, w, Y, h, bench = null) {
  const E = env(), n = E.night, r = rng(41);
  // the wall: painted block, lit from the upper left
  const wg = g.createLinearGradient(0, 0, 0, Y);
  wg.addColorStop(0, n ? '#2a2830' : '#d9d8cb'); wg.addColorStop(1, n ? '#36323b' : '#c6c4b4');
  g.fillStyle = wg; g.fillRect(0, 0, w, Y);
  const lg = g.createRadialGradient(w * 0.3, -60, 20, w * 0.3, -60, Math.max(w, Y) * 1.05);
  lg.addColorStop(0, n ? 'rgba(255,214,180,0.10)' : 'rgba(255,248,230,0.55)'); lg.addColorStop(1, 'rgba(255,248,230,0)');
  g.fillStyle = lg; g.fillRect(0, 0, w, Y);
  g.save();
  // painted blockwork: faint courses
  g.strokeStyle = n ? 'rgba(0,0,0,0.20)' : 'rgba(80,70,50,0.10)'; g.lineWidth = 1;
  for (let yy = Y - 26, row = 0; yy > 0; yy -= 26, row++) {
    g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke();
    for (let x = (row % 2) * 30; x < w; x += 60) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy - 26); g.stroke(); }
  }
  // the lower wall painted darker, under a rail
  const dado = Y - Math.min(150, Y * 0.32);
  g.fillStyle = n ? 'rgba(20,30,40,0.35)' : 'rgba(70,95,90,0.28)'; g.fillRect(0, dado, w, Y - dado);
  g.fillStyle = n ? '#4a4450' : '#a9a691'; g.fillRect(0, dado - 4, w, 6);
  g.fillStyle = n ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.45)'; g.fillRect(0, dado - 4, w, 1.5);
  // a noticeboard (o.board = { x, y, w, h }), papers pinned to it
  const B = bench?.board;
  if (B && B.w > 70 && B.h > 44) {
    const { x: bx, y: by, w: bw, h: bh } = B;
    g.fillStyle = n ? '#4b3a2c' : '#7a5c3e'; g.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
    g.fillStyle = n ? '#7a5e43' : '#c49a6a'; g.fillRect(bx, by, bw, bh);
    for (let i = 0; i < Math.round(bw / 30); i++) {
      const pw = 22 + r() * 18, ph = 26 + r() * 16, px = bx + 6 + r() * (bw - pw - 12), py = by + 5 + r() * (bh - ph - 10);
      g.save(); g.translate(px + pw / 2, py + ph / 2); g.rotate((r() - 0.5) * 0.12);
      g.fillStyle = n ? '#cfc8bc' : '#fbf8f0'; g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.fillStyle = n ? 'rgba(60,60,70,0.5)' : 'rgba(60,60,70,0.35)';
      for (let l = 0; l < 4; l++) g.fillRect(-pw / 2 + 3, -ph / 2 + 5 + l * 5, pw * (0.5 + r() * 0.4), 1.4);
      g.fillStyle = ['#b04a3a', '#3a6fb0', '#3f9a5a'][i % 3]; g.beginPath(); g.arc(0, -ph / 2 + 2, 2, 0, TAU); g.fill();
      g.restore();
    }
  }
  // a window with the outside in it: a frame, glazing bars, a sill
  const Wn = bench?.window;
  if (Wn && Wn.w > 60 && Wn.h > 50) {
    const { x: wx, y: wy, w: ww, h: wh } = Wn;
    g.fillStyle = n ? '#4a4450' : '#f1eee6'; g.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
    const sky = g.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, n ? '#1c2236' : '#a9c6dc'); sky.addColorStop(1, n ? '#3a3046' : '#e8d9c8');
    g.fillStyle = sky; g.fillRect(wx, wy, ww, wh);
    g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
    g.fillStyle = n ? '#2a2632' : '#9fae8a';                       // the trees outside
    for (let x = wx - 10; x < wx + ww + 20; x += 18 + r() * 14) { g.beginPath(); g.arc(x, wy + wh * 0.78, 12 + r() * 12, 0, TAU); g.fill(); }
    g.fillRect(wx, wy + wh * 0.8, ww, wh * 0.2);
    g.fillStyle = n ? 'rgba(170,190,255,0.10)' : 'rgba(255,255,255,0.35)';
    g.beginPath(); g.moveTo(wx + ww * 0.1, wy + wh); g.lineTo(wx + ww * 0.45, wy); g.lineTo(wx + ww * 0.6, wy); g.lineTo(wx + ww * 0.25, wy + wh); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = n ? '#4a4450' : '#f1eee6'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh * 0.45); g.lineTo(wx + ww, wy + wh * 0.45); g.stroke();
    g.fillStyle = n ? '#5a5460' : '#e2ddd2'; g.fillRect(wx - 14, wy + wh + 6, ww + 28, 7);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(wx - 12, wy + wh + 13, ww + 24, 4);
  }
  // a wall shelf (o.shelf = { x0, x1, y }) with books and glassware on it
  const Sh = bench?.shelf;
  if (Sh && Sh.x1 - Sh.x0 > 60) {
    const { x0: s0, x1: s1, y: sy } = Sh;
    let x = s0 + 8;
    for (let i = 0; x < s0 + (s1 - s0) * 0.5; i++) {
      const bw = 6 + r() * 5, bh = 22 + r() * 12;
      g.fillStyle = ['#7a4a3a', '#3f5a7a', '#5a6a3e', '#8a7a4a', '#6a4a6a'][i % 5]; g.fillRect(x, sy - bh, bw, bh);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 1, sy - bh + 4, bw - 2, 1.5);
      x += bw + 1;
    }
    for (let i = 0, gx = x + 16; gx < s1 - 10; i++, gx += 28 + r() * 14) glass(g, gx, sy, i, n, r);
    g.fillStyle = n ? '#5d4a3a' : '#9b7651'; g.fillRect(s0, sy, s1 - s0, 7);
    g.fillStyle = n ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'; g.fillRect(s0, sy, s1 - s0, 1.5);
    g.fillStyle = n ? '#25262a' : '#6e6a62';
    for (const bx of [s0 + 16, s1 - 20]) { g.beginPath(); g.moveTo(bx, sy + 7); g.lineTo(bx + 3, sy + 7); g.lineTo(bx + 3, sy + 22); g.lineTo(bx - 10, sy + 7); g.fill(); }
  }
  // a fire extinguisher on its bracket by the far wall, a sign above it
  if (bench?.extinguisher != null) {
    const ex = bench.extinguisher, ey = Y - 12, eh = 46;
    g.fillStyle = n ? '#8e2f28' : '#b8352b'; g.beginPath(); g.roundRect(ex - 8, ey - eh, 16, eh, [7, 7, 3, 3]); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(ex - 5, ey - eh + 6, 3, eh - 12);
    g.fillStyle = '#2b2b30'; g.fillRect(ex - 4, ey - eh - 6, 8, 6); g.beginPath(); g.moveTo(ex + 4, ey - eh - 4); g.quadraticCurveTo(ex + 14, ey - eh, ex + 12, ey - eh + 18); g.lineWidth = 2; g.strokeStyle = '#2b2b30'; g.stroke();
    g.fillStyle = n ? '#d9d4c8' : '#f4f1e8'; g.fillRect(ex - 6, ey - eh + 16, 12, 10);
    g.fillStyle = '#2f7d4a'; g.fillRect(ex - 13, ey - eh - 40, 26, 18);
    g.fillStyle = '#f4f1e8'; g.fillRect(ex - 3, ey - eh - 37, 6, 12); g.fillRect(ex - 9, ey - eh - 34, 18, 6);
  }
  // the splashback and the shelf, over the bench
  if (bench?.x0 != null) {
    const { x0, x1, top } = bench, th = Math.min(64, top * 0.32), ty = top - th, tile = 16;
    g.fillStyle = n ? '#4a4c52' : '#eef0ec'; g.fillRect(x0, ty, x1 - x0, th);
    g.strokeStyle = n ? 'rgba(0,0,0,0.35)' : 'rgba(110,115,110,0.45)';
    for (let yy = top; yy > ty; yy -= tile) { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.stroke(); }
    for (let x = x1; x > x0; x -= tile) { g.beginPath(); g.moveTo(x, ty); g.lineTo(x, top); g.stroke(); }
    g.fillStyle = n ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)'; g.fillRect(x0, ty, x1 - x0, 2);
    // a strip of sockets along it
    g.fillStyle = n ? '#6c6e74' : '#f8f8f4'; g.strokeStyle = n ? '#25262a' : '#9a9c98';
    for (let x = x1 - 150; x > x0 + 20; x -= 180) { g.fillRect(x, ty + th * 0.35, 30, 18); g.strokeRect(x, ty + th * 0.35, 30, 18); g.fillStyle = n ? '#25262a' : '#6c6e6a'; g.fillRect(x + 8, ty + th * 0.35 + 6, 3, 6); g.fillRect(x + 18, ty + th * 0.35 + 6, 3, 6); g.fillStyle = n ? '#6c6e74' : '#f8f8f4'; }
    // the shelf on brackets, and the glassware on it
    const sy = ty - Math.min(70, ty * 0.4);
    if (sy > 40) {
      g.fillStyle = n ? '#5d4a3a' : '#9b7651'; g.fillRect(x0, sy, x1 - x0 - 30, 7);
      g.fillStyle = n ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'; g.fillRect(x0, sy, x1 - x0 - 30, 1.5);
      g.fillStyle = n ? '#25262a' : '#6e6a62';
      for (let x = x1 - 60; x > x0; x -= 160) { g.beginPath(); g.moveTo(x, sy + 7); g.lineTo(x + 3, sy + 7); g.lineTo(x + 3, sy + 22); g.lineTo(x - 10, sy + 7); g.fill(); }
      for (let x = x1 - 54, i = 0; x > x0 + 10; x -= 34 + r() * 22, i++) glass(g, x, sy, i, n, r);
    }
  }
  g.restore();
  labFloor(g, w, Y, h);
}

/** A piece of glassware standing on a shelf at y: a bottle, a flask or a beaker. */
function glass(g, x, y, i, n, r) {
  const kind = i % 3, hgt = 18 + r() * 12, liquid = ['#8a5a2b', '#4e7f9a', '#7e9a4e', '#a34e4e'][Math.floor(r() * 4)];
  g.save();
  g.fillStyle = n ? 'rgba(200,215,225,0.20)' : 'rgba(255,255,255,0.55)'; g.strokeStyle = n ? 'rgba(220,230,240,0.45)' : 'rgba(90,100,110,0.55)'; g.lineWidth = 1;
  g.beginPath();
  if (kind === 0) { g.rect(x - 6, y - hgt, 12, hgt); }                                       // a reagent bottle
  else if (kind === 1) { g.moveTo(x - 2.5, y - hgt); g.lineTo(x + 2.5, y - hgt); g.lineTo(x + 2.5, y - hgt * 0.55); g.lineTo(x + 9, y); g.lineTo(x - 9, y); g.lineTo(x - 2.5, y - hgt * 0.55); g.closePath(); }
  else { g.rect(x - 8, y - hgt * 0.7, 16, hgt * 0.7); }
  g.fill(); g.stroke(); g.clip();
  g.fillStyle = withAlpha(liquid, kind === 0 ? 0.9 : 0.7); g.fillRect(x - 10, y - hgt * (kind === 0 ? 0.8 : 0.3), 20, hgt);
  g.restore();
  if (kind === 0) { g.fillStyle = n ? '#2b2b30' : '#3b3b40'; g.fillRect(x - 3.5, y - hgt - 4, 7, 4); }
}

/** A sheet-vinyl laboratory floor side on, from Y down to h, with a skirting board. */
function labFloor(g, w, Y, h) {
  const E = env(), n = E.night, r = rng(53);
  const fg = g.createLinearGradient(0, Y, 0, h);
  fg.addColorStop(0, n ? '#4a4d50' : '#a9a497'); fg.addColorStop(1, n ? '#2a2c2f' : '#8a8578');
  g.fillStyle = fg; g.fillRect(0, Y, w, h - Y);
  g.save();
  g.strokeStyle = n ? 'rgba(0,0,0,0.30)' : 'rgba(60,55,45,0.22)'; g.lineWidth = 1;
  for (let k = 1, yy = Y + 6; yy < h; k++, yy += 4 + k * 3) { g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke(); }
  for (let i = 0; i < w * (h - Y) / 120; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'; g.fillRect(r() * w, Y + 2 + r() * (h - Y), 1.5, 1.5); }
  // a sheen where the light falls, and the skirting
  const sh = g.createRadialGradient(w * 0.35, Y, 10, w * 0.35, Y, w * 0.5);
  sh.addColorStop(0, n ? 'rgba(255,220,190,0.08)' : 'rgba(255,255,255,0.25)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, Y, w, h - Y);
  g.fillStyle = n ? '#1f1d22' : '#5b564c'; g.fillRect(0, Y - 9, w, 9);
  g.fillStyle = n ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.30)'; g.fillRect(0, Y - 9, w, 1.5);
  g.restore();
}

/* ── the furniture ─────────────────────────────────────────────────────── */

/** A laboratory bench whose worktop's end is at (edge, top), reaching back to
    x0, down to the floor at floorY: a black resin worktop with a front edge,
    cupboards with drawers over a recessed plinth, stopping short of the
    worktop's end so the top overhangs. */
export function labBench(g, x0, edge, top, floorY) {
  const E = env(), n = E.night, tk = 14, cab = edge - 16, plinth = 12, body = top + tk;
  g.save();
  softShadow(g, (x0 + cab) / 2, floorY + 2, (cab - x0) * 0.55, 8, 0.9);
  // the cupboards
  const cg = g.createLinearGradient(0, body, 0, floorY);
  cg.addColorStop(0, n ? '#6a5442' : '#b08a62'); cg.addColorStop(1, n ? '#514034' : '#94714e');
  g.fillStyle = cg; g.fillRect(x0, body, cab - x0, floorY - plinth - body);
  g.fillStyle = n ? '#18161a' : '#3f372f'; g.fillRect(x0, floorY - plinth, cab - 7 - x0, plinth);
  const U = 112, dh = Math.min(30, (floorY - plinth - body) * 0.3);
  for (let ux1 = cab; ux1 > x0; ux1 -= U) {
    const ux0 = Math.max(x0, ux1 - U);
    panel(g, ux0 + 5, body + 6, ux1 - ux0 - 10, dh - 4, n, 'drawer');
    panel(g, ux0 + 5, body + dh + 8, ux1 - ux0 - 10, floorY - plinth - body - dh - 14, n, 'door');
  }
  // the cabinet's end, catching the light
  g.fillStyle = n ? '#7b6350' : '#c39d74'; g.fillRect(cab - 4, body, 4, floorY - plinth - body);
  // the shadow the worktop throws on the cupboards
  const sg = g.createLinearGradient(0, body, 0, body + 16);
  sg.addColorStop(0, 'rgba(0,0,0,0.38)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg; g.fillRect(x0, body, cab - x0, 16);
  // the worktop: black resin, a lit top edge, a rounded end
  const tg = g.createLinearGradient(0, top, 0, body);
  tg.addColorStop(0, n ? '#4a4f56' : '#454b52'); tg.addColorStop(1, n ? '#1c1e22' : '#22262b');
  g.fillStyle = tg; g.beginPath(); g.moveTo(x0, top); g.lineTo(edge - 3, top); g.quadraticCurveTo(edge, top, edge, top + 3); g.lineTo(edge, body - 3); g.quadraticCurveTo(edge, body, edge - 3, body); g.lineTo(x0, body); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x0, top, edge - x0 - 3, 1.5);
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(edge - 3, top + 3, 2, tk - 6);
  g.restore();
}
/** A drawer front or a cupboard door: an inset panel with a bevel and a handle. */
function panel(g, x, y, w, h, n, kind) {
  if (w < 8 || h < 6) return;
  g.fillStyle = n ? '#5e4a3b' : '#a37f59'; g.fillRect(x, y, w, h);
  g.fillStyle = n ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.30)'; g.fillRect(x, y, w, 1.5); g.fillRect(x, y, 1.5, h);
  g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(x, y + h - 1.5, w, 1.5); g.fillRect(x + w - 1.5, y, 1.5, h);
  g.fillStyle = n ? '#a9adb3' : '#d4d7da'; g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1;
  if (kind === 'drawer') { g.fillRect(x + w / 2 - 14, y + h / 2 - 2, 28, 4); g.strokeRect(x + w / 2 - 14, y + h / 2 - 2, 28, 4); }
  else { g.fillRect(x + w - 12, y + 8, 4, Math.min(30, h * 0.3)); g.strokeRect(x + w - 12, y + 8, 4, Math.min(30, h * 0.3)); }
}

/** A wooden table whose top's edge is at (edge, top), reaching back to x0,
    on two tapered legs down to the floor at Y, with an apron and a stretcher. */
export function table(g, x0, edge, top, Y) {
  const E = env(), n = E.night, tk = 16, ap = 20, lw = 16;
  const wood = n ? '#7a5a3e' : '#a8774a', dark = n ? '#563e2a' : '#7e5735', lit = n ? '#9a7550' : '#c99a68';
  g.save();
  softShadow(g, (x0 + edge) / 2, Y + 2, (edge - x0) * 0.6, 8, 0.9);
  // the legs: square, lit on the left, tapering to a foot
  for (const lx of [x0 + 8, edge - 8 - lw]) {
    const lg = g.createLinearGradient(lx, 0, lx + lw, 0); lg.addColorStop(0, lit); lg.addColorStop(0.35, wood); lg.addColorStop(1, dark);
    g.fillStyle = lg; g.beginPath(); g.moveTo(lx, top + tk); g.lineTo(lx + lw, top + tk); g.lineTo(lx + lw - 3, Y - 6); g.lineTo(lx + 3, Y - 6); g.closePath(); g.fill();
    g.fillStyle = dark; g.fillRect(lx + 2, Y - 6, lw - 4, 6);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(lx, top + tk + ap, lw, 3);
  }
  // a stretcher low between them
  const sy = top + tk + (Y - top - tk) * 0.74;
  g.fillStyle = dark; g.fillRect(x0 + 8 + lw, sy, edge - x0 - 16 - 2 * lw, 7);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x0 + 8 + lw, sy, edge - x0 - 16 - 2 * lw, 1.5);
  // the apron, with a drawer and its knob
  const agr = g.createLinearGradient(0, top + tk, 0, top + tk + ap); agr.addColorStop(0, dark); agr.addColorStop(1, wood);
  g.fillStyle = agr; g.fillRect(x0 + 8, top + tk, edge - x0 - 16, ap);
  const dw = Math.min(90, (edge - x0) * 0.4), dx = (x0 + edge) / 2 - dw / 2;
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.strokeRect(dx, top + tk + 3, dw, ap - 6);
  g.fillStyle = n ? '#c9b48a' : '#e6d2a6'; g.beginPath(); g.arc(dx + dw / 2, top + tk + ap / 2, 2.6, 0, TAU); g.fill();
  // the top: a thick slab with grain, a lit upper edge, a rounded front
  const tg = g.createLinearGradient(0, top, 0, top + tk); tg.addColorStop(0, lit); tg.addColorStop(1, wood);
  g.fillStyle = tg; g.beginPath(); g.moveTo(x0, top); g.lineTo(edge - 4, top); g.quadraticCurveTo(edge, top, edge, top + 4); g.lineTo(edge, top + tk - 3); g.quadraticCurveTo(edge, top + tk, edge - 3, top + tk); g.lineTo(x0, top + tk); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x0, top + i * 3.8); g.bezierCurveTo(x0 + (edge - x0) * 0.3, top + i * 3.8 + 1.2, x0 + (edge - x0) * 0.6, top + i * 3.8 - 1.2, edge - 2, top + i * 3.8); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.32)'; g.fillRect(x0, top, edge - x0 - 4, 1.5);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x0, top + tk - 1.5, edge - x0 - 3, 1.5);
  g.restore();
}

/* ── the apparatus ─────────────────────────────────────────────────────── */

/** A retort stand: a cast-iron base on the surface at baseY, the rod at rodX up to rodTop. */
function retortStand(g, rodX, baseY, rodTop, n) {
  g.save();
  softShadow(g, rodX - 8, baseY + 1, 30, 4, 0.8);
  const bg = g.createLinearGradient(0, baseY - 8, 0, baseY); bg.addColorStop(0, n ? '#4a4e56' : '#3f4650'); bg.addColorStop(1, n ? '#25272c' : '#262a30');
  g.fillStyle = bg; g.beginPath(); g.moveTo(rodX - 40, baseY); g.lineTo(rodX - 37, baseY - 8); g.lineTo(rodX + 9, baseY - 8); g.lineTo(rodX + 12, baseY); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(rodX - 37, baseY - 8, 46, 1.2);
  const rg = g.createLinearGradient(rodX - 2.5, 0, rodX + 2.5, 0); rg.addColorStop(0, '#e9edf0'); rg.addColorStop(0.5, '#a9b0b6'); rg.addColorStop(1, '#6b7278');
  g.fillStyle = rg; g.fillRect(rodX - 2.5, rodTop, 5, baseY - 8 - rodTop);
  g.fillStyle = '#5a6066'; g.beginPath(); g.arc(rodX, rodTop, 2.5, Math.PI, 0); g.fill();
  g.restore();
}
/** A boss on the rod at (rodX, y) and an arm out to x, ending in a crocodile clip. */
function clampArm(g, rodX, y, x, n) {
  g.save();
  const dir = Math.sign(x - rodX) || -1;
  g.fillStyle = '#b9c0c6'; g.fillRect(Math.min(rodX, x), y - 1.5, Math.abs(x - rodX), 3);
  g.fillStyle = n ? '#3a3d44' : '#30343a'; g.fillRect(rodX - 6, y - 6, 12, 12);
  g.fillStyle = '#c9a23a'; g.beginPath(); g.arc(rodX, y - 9, 3, 0, TAU); g.fill();
  // the clip: two jaws gripping the foil
  g.fillStyle = '#9a9fa5'; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x - dir * 9, y - 4); g.lineTo(x + dir * 3, y - 2.5); g.lineTo(x + dir * 3, y + 2.5); g.lineTo(x - dir * 9, y + 4); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
/** A sagging wire from (x0, y0) to (x1, y1). */
function wire(g, x0, y0, x1, y1, color, sag = 18) {
  g.save(); g.strokeStyle = color; g.lineWidth = 1.8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); g.stroke(); g.restore();
}

/** A strip of foil hanging at x from ya to yb, held by a clip at each end.
    Torn through at y = `cut` once broken, `age` seconds after (of `life`):
    it splits, the two halves curl back the way the ball went, shards fly. */
export function foilStrip(g, x, ya, yb, { cut = null, age = 0, life = 1, centre = null, P } = {}) {
  const sw = 9, half = sw / 2;
  const sheen = (y0, y1) => { const fg = g.createLinearGradient(x - half, y0, x + half, y1); fg.addColorStop(0, '#f7f9fa'); fg.addColorStop(0.45, '#b4bcc3'); fg.addColorStop(0.7, '#e6eaed'); fg.addColorStop(1, '#8f989f'); return fg; };
  g.save(); g.lineWidth = 1; g.strokeStyle = 'rgba(40,46,52,0.7)';
  if (cut == null) {
    g.fillStyle = sheen(ya, yb); g.fillRect(x - half, ya, sw, yb - ya); g.strokeRect(x - half, ya, sw, yb - ya);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; for (let yy = ya + 9; yy < yb - 4; yy += 13) { g.beginPath(); g.moveTo(x - half + 1, yy); g.lineTo(x + half - 1, yy + 3); g.stroke(); }
  } else {
    const e = ease(clamp(age / life, 0, 1)), c = clamp(cut, ya + 6, yb - 6), gap = 2.5 + 5 * e, curl = 13 * e;
    for (const s of [-1, 1]) {                                     // the upper piece (−1) and the lower (+1)
      const fix = s < 0 ? ya : yb, end = c + s * gap, bend = s < 0 ? Math.max(ya, end - 26) : Math.min(yb, end + 26);
      g.fillStyle = sheen(Math.min(fix, end), Math.max(fix, end));
      g.beginPath(); g.moveTo(x - half, fix); g.lineTo(x + half, fix); g.lineTo(x + half, bend);
      g.quadraticCurveTo(x + half, end, x + half + curl, end - s * curl * 0.35);
      for (let i = 1; i <= 4; i++) g.lineTo(x + half + curl - (sw * i) / 4, end - s * curl * 0.35 * (1 - i / 4) + (i % 2 ? s * 3 : 0));
      g.quadraticCurveTo(x - half, end, x - half, bend); g.closePath(); g.fill(); g.stroke();
    }
    // the shards, thrown on the way the ball went and falling
    const u = phaseOf(age, life);
    if (u != null) {
      flash(g, x, c, age, life, { radius: 30 });
      const r = rng(Math.round(x));
      for (let i = 0; i < 9; i++) {
        const a = (r() - 0.5) * 2.2, sp = 26 + r() * 34, sx = x + Math.cos(a) * sp * ease(u), sy = c + Math.sin(a) * sp * ease(u) + 34 * u * u, sz = 2 + r() * 3;
        g.save(); g.translate(sx, sy); g.rotate(r() * 6 + u * 8 * (r() - 0.5)); g.globalAlpha = 1 - u;
        g.fillStyle = i % 2 ? '#eef1f3' : '#a7afb6'; g.fillRect(-sz, -sz * 0.5, sz * 2, sz); g.restore();
      }
    }
  }
  if (centre != null) {                                             // its centre, marked
    g.strokeStyle = P ? P.ink : '#222'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x - 12, centre); g.lineTo(x - half - 1, centre); g.moveTo(x + half + 1, centre); g.lineTo(x + 12, centre); g.stroke();
  }
  g.restore();
}

/** The spring launcher clamped to the end of the bench: a barrel whose mouth
    is at (mouth, Y) on its axis, `L` px long, sitting on the worktop at `top`,
    a spring and plunger behind (`cocked` before it fires), a G-clamp round
    the worktop. */
export function launcher(g, mouth, Y, top, L, { cocked = false, rb = 10 } = {}) {
  const E = env(), n = E.night, back = mouth - L;
  g.save();
  // the base plate and two posts up to the barrel
  g.fillStyle = n ? '#3b4048' : '#38404a'; g.fillRect(back - 4, top - 6, L + 2, 6);
  g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(back - 4, top - 6, L + 2, 1);
  g.fillStyle = n ? '#555b63' : '#4c535c';
  for (const px of [back + L * 0.18, mouth - L * 0.2]) g.fillRect(px - 3, Y + rb - 1, 6, top - 6 - (Y + rb - 1));
  // the G-clamp round the worktop: a frame, a screw, a T-bar
  const cx = back + L * 0.5, jaw = top + 14;
  g.strokeStyle = n ? '#8a3c34' : '#9c3a30'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, top - 9); g.lineTo(cx - 13, top - 9); g.lineTo(cx - 13, jaw + 14); g.lineTo(cx - 2, jaw + 14); g.stroke();
  g.strokeStyle = '#b8bec4'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(cx, jaw + 24); g.lineTo(cx, jaw + 1); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 7, jaw + 24); g.lineTo(cx + 7, jaw + 24); g.stroke();
  g.fillStyle = '#8f969c'; g.fillRect(cx - 5, jaw - 1, 10, 3);
  // the barrel: a steel tube, lit from above
  const bgr = g.createLinearGradient(0, Y - rb, 0, Y + rb);
  bgr.addColorStop(0, '#dfe4e8'); bgr.addColorStop(0.35, '#a7afb6'); bgr.addColorStop(1, '#4f565d');
  g.fillStyle = bgr; g.fillRect(back, Y - rb, L, rb * 2);
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(back, Y - rb, L, rb * 2);
  // the slot along its back half, the spring in it
  const s0 = back + 8, s1 = back + L * 0.55, sh = rb * 0.55;
  g.fillStyle = '#1b1d20'; g.fillRect(s0, Y - sh, s1 - s0, sh * 2);
  const head = cocked ? s0 + 6 : s1 - 4, coils = 9;
  g.strokeStyle = '#d9c26a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(s0, Y);
  for (let i = 1; i <= coils * 2; i++) g.lineTo(s0 + ((head - s0) * i) / (coils * 2), Y + (i % 2 ? -sh + 1.5 : sh - 1.5));
  g.stroke();
  g.fillStyle = '#c4cacf'; g.fillRect(head, Y - sh, 5, sh * 2);
  // the plunger out of the back, and its knob
  const kx = cocked ? back - 22 : back - 8;
  g.fillStyle = '#b5bcc2'; g.fillRect(kx, Y - 1.8, back - kx, 3.6);
  g.fillStyle = n ? '#2b2e33' : '#22252a'; g.beginPath(); g.ellipse(kx - 3, Y, 4.5, 7, 0, 0, TAU); g.fill();
  // the muzzle ring
  g.fillStyle = '#6a7279'; g.fillRect(mouth - 6, Y - rb - 2, 6, rb * 2 + 4);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(mouth - 6, Y - rb - 2, 6, 1.5);
  g.restore();
}

/** The timer on the bench, `w` px wide standing on `top` at x: its display
    reads the time since the first strip broke, stopping at the second. */
function timer(g, x, top, wd, text, n) {
  const hh = 34;
  g.save();
  softShadow(g, x + wd / 2, top, wd * 0.55, 4, 0.7);
  const bg = g.createLinearGradient(0, top - hh, 0, top); bg.addColorStop(0, n ? '#3f4a5a' : '#46546a'); bg.addColorStop(1, n ? '#262d37' : '#2c3542');
  g.fillStyle = bg; g.beginPath(); g.roundRect(x, top - hh, wd, hh, 4); g.fill();
  g.fillStyle = '#0d1a12'; g.fillRect(x + 6, top - hh + 6, wd - 12, 19);
  g.font = '700 14px ui-monospace, Menlo, Consolas, monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
  g.fillStyle = '#7dffb0'; g.fillText(text, x + wd - 10, top - hh + 16);
  g.fillStyle = '#b8433a'; g.beginPath(); g.arc(x + 9, top - 5, 2.4, 0, TAU); g.fill();
  g.fillStyle = '#2b2b30'; g.beginPath(); g.arc(x + 17, top - 5, 2.4, 0, TAU); g.fill();
  g.restore();
}

/** A ball bearing: a steel sphere with a hard highlight and a dark rim. */
function bearing(g, x, y, r) {
  g.save();
  const bg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.25, '#dfe5ea'); bg.addColorStop(0.7, '#7d878f'); bg.addColorStop(1, '#3a4148');
  g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = '#1e2226'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.4, r * 0.22, 0, TAU); g.fill();
  g.restore();
}

/* ── the stage ─────────────────────────────────────────────────────────── */

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'bench') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const E = env(), night = E.night;
  const phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const foil = f.look === 'foil';
  const HUD = hudBoxes(w, 4);
  for (const b of HUD) L.reserve(b);
  const keep = [...HUD];                                   // what the speed's label keeps off

  // ── the frame: on the experiment, one scale both ways
  const n = 140, pts = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pts.push({ t: tt, ...f.pos(tt) }); }
  const xEnd = Math.max(...pts.map((p) => p.x), f.d || 0);
  const lowest = f.H ?? Math.max(-Math.min(...pts.map((p) => p.y)), f.drop || 0, f.fall || 0);
  const box = f.H
    ? { xLo: -0.95, xHi: xEnd * 1.14, yLo: -f.H, yHi: 0.16 * Math.max(f.H, xEnd * 0.4) }
    : { xLo: phone ? -0.46 * xEnd : 0, xHi: xEnd * (phone ? 1.6 : 1.3), yLo: -(lowest * 1.55 + 0.04 * xEnd), yHi: 0.6 * lowest + 0.14 * xEnd };
  const floorBand = phone ? 34 : 44;
  // the launcher and the timer, or the table, stand clear of the readouts on the left
  const area = f.H
    ? { left: phone ? 18 : 270, right: w - 26, top: phone ? 150 : 110, bottom: h - floorBand }
    : { left: phone ? 14 : 470, right: w - 22, top: phone ? 272 : 100, bottom: h - floorBand - (phone ? 46 : 96) };
  const fit = fitSide(box, area, { sky: f.H ? 1 : 0.35 });
  const k = fit.k;
  // the table, at a real width, shifted right if its back would sit under the readouts
  const tableW = clamp(0.85 * k, 110, 260);
  const shift = f.H ? clamp((phone ? 16 : 270) + tableW - fit.X(0), 0, Math.max(0, w - 20 - fit.X(xEnd * 1.12))) : 0;
  const X = (x) => fit.X(x) + shift, Y = fit.Y;
  // with the table the floor is to scale; without a height it is the room's floor
  const floorY = f.H ? Y(-f.H) : h - floorBand;
  const r = foil ? 7 : 8;                                // the ball, drawn at a size that reads

  // ── the place
  const worktop = Y(0) + r + 7;                          // the barrel's cradle stands the ball's axis above it
  const benchX0 = -40, tx0 = X(0) - tableW;
  const boardX0 = X(0) + 40, boardX1 = X(f.d ?? xEnd) - 70, boardY = Math.max(Y(-lowest) + 70, floorY - 220);
  const landX = f.R != null ? X(f.R) : null;
  labWall(g, w, floorY, h, foil ? { x0: benchX0, x1: X(0) - 2, top: worktop, extinguisher: phone ? null : w - 34,
    board: { x: boardX0, y: boardY, w: Math.min(220, boardX1 - boardX0), h: Math.min(110, floorY - 70 - boardY) } }
    : {
      extinguisher: tx0 - 46 > 24 ? tx0 - 46 : (landX != null && w - 30 - landX > 60 ? w - 30 : null),
      shelf: { x0: tx0 + 10, x1: X(0) - 10, y: Y(0) - Math.min(110, Math.max(60, (Y(0) - (phone ? 150 : 40)) * 0.6)) },
      window: { x: X(0) + 50, y: Math.max(phone ? 150 : 60, Y(0) - 0.9 * k - 40), w: Math.min(220, w - X(0) - 110), h: Math.min(170, Y(0) - 30 - Math.max(phone ? 150 : 60, Y(0) - 0.9 * k - 40)) },
    });
  if (foil) labBench(g, benchX0, X(0) - 1, worktop, floorY);
  else table(g, tx0, X(0), Y(0) + r, floorY);

  // ── the strips: the first at the end of the bench, the second d out and drop lower
  let rodTop = null;
  if (f.d) {
    // the paper gives no strip length: each is drawn long enough to show where it is broken
    const half = Math.max(30, (f.drop ?? f.fall) * k * 0.55, Math.abs(f.miss ?? 0) * k + 16);
    const y2 = Y(-(f.drop ?? f.fall)), x1 = X(0) + 3, x2 = X(f.d);
    const life = f.tMax / 3.2;
    const LL = clamp(xEnd * 0.3 * k, 70, 130), timerX = X(0) - 3 - LL - 104;
    rodTop = Math.min(Y(0) - half, y2 - half) - 26;
    // the first: on a stand on the worktop behind the launcher, hanging to just above the top
    const a1 = Y(0) - half, b1 = worktop - 3, rod1 = X(0) - 30;
    if (foil) retortStand(g, rod1, worktop, a1 - 18, night);
    // the second: a tall stand on the floor beside it
    const rod2 = x2 + 34;
    retortStand(g, rod2, floorY, y2 - half - 18, night);
    // the wires: to the timer along the bench; from the second down its stand and away along the floor
    if (foil) {
      const tmx = phone ? -10 : timerX + 70;                // on a phone the timer is off to the left
      wire(g, x1, a1 - 2, tmx, worktop - 20, '#b8433a', 30);
      wire(g, x1, b1, tmx, worktop - 12, '#2b2b30', 6);
      wire(g, x2, y2 - half - 2, rod2 + 6, y2 - half + 20, '#b8433a', 6);
      wire(g, x2, y2 + half + 2, rod2 + 6, y2 + half + 16, '#2b2b30', 4);
      stroke(g, [{ x: rod2 + 6, y: y2 - half + 20 }, { x: rod2 + 6, y: floorY + 4 }, { x: X(0) - 30, y: floorY + 5 }], { color: '#b8433a', width: 1.8 });
      stroke(g, [{ x: rod2 + 9, y: y2 + half + 16 }, { x: rod2 + 9, y: floorY + 8 }, { x: X(0) - 30, y: floorY + 9 }], { color: '#2b2b30', width: 1.8 });
    }
    const t1 = fired && t > 1e-9, a1g = ageOf(t, 0, f.tMax, life);
    foilStrip(g, x1, a1, b1, { cut: t1 ? Y(0) : null, age: a1g.age, life, P });
    if (foil) { clampArm(g, rod1, a1, x1, night); clampArm(g, rod1, b1 - 2, x1, night); }
    const past = fired && t >= f.t2 - 1e-9, hitY = Y(f.pos(f.t2).y), a2g = ageOf(t, f.t2, f.tMax, life);
    foilStrip(g, x2, y2 - half, y2 + half, { cut: past ? hitY : null, age: a2g.age, life, centre: f.drop != null ? y2 : null, P });
    clampArm(g, rod2, y2 - half, x2, night); clampArm(g, rod2, y2 + half, x2, night);
    if (foil && !phone) {
      const shown = t1 ? Math.min(t, f.t2) : 0;
      timer(g, timerX, worktop - 1, 74, num(shown, 3), night);
    }
    // the strips, their clips and the stand are kept clear of labels
    const strip = (x, ya, yb) => ({ x: x - 16, y: ya - 10, w: 32, h: yb - ya + 20 });
    const offs = [strip(x2, y2 - half, y2 + half), { x: x2 - 12, y: y2 - half - 10, w: rod2 - x2 + 22, h: 20 }, { x: x2 - 12, y: y2 + half - 10, w: rod2 - x2 + 22, h: 20 },
      { x: rod2 - 7, y: y2 - half - 20, w: 14, h: floorY - (y2 - half - 20) }];
    if (foil) offs.push(strip(x1, a1, b1));
    // the gap between them, across the top
    const gy = rodTop - 12;
    stroke(g, [{ x: x1, y: gy }, { x: x2, y: gy }], { color: P.ink, width: 1.3, alpha: 0.85 });
    for (const xx of [x1, x2]) stroke(g, [{ x: xx, y: gy - 5 }, { x: xx, y: gy + 5 }], { color: P.ink, width: 1.3, alpha: 0.85 });
    L.add(T`${s3(f.d)} [m]`, phone ? Math.max((x1 + x2) / 2, HUD[0].w + 34) : (x1 + x2) / 2, gy - 14, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700 });
    keep.push({ x: x1, y: gy - 26, w: x2 - x1, h: 32 });
    // how much lower the second's centre is, down its right
    if (f.drop != null && f.drop > 0) {
      const ry = rod2 + 26;
      stroke(g, [{ x: x2 - 30, y: Y(0) }, { x: ry + 6, y: Y(0) }], { color: P.strong, width: 1.2, dash: [4, 4] });
      stroke(g, [{ x: ry, y: Y(0) }, { x: ry, y: y2 }], { color: P.ink, width: 1.3, alpha: 0.85 });
      for (const yy of [Y(0), y2]) stroke(g, [{ x: ry - 5, y: yy }, { x: ry + 5, y: yy }], { color: P.ink, width: 1.3, alpha: 0.85 });
      L.add(T`${s3(f.drop)} [m] "lower"`, ry + 10, (Y(0) + y2) / 2, { color: P.ink, align: 'left', pri: 7, size: 14, weight: 700 });
      offs.push({ x: x2 - 30, y: Y(0) - 6, w: ry + 36 - x2, h: 12 });
      keep.push({ x: ry - 6, y: Y(0), w: 12 + 120, h: y2 - Y(0) });         // its own label's place
    }
    for (const b of offs) { L.reserve(b); keep.push(b); }
    if (past) {
      const q = f.pos(f.t2);
      pulse(g, X(q.x), Y(q.y), a2g.age, life, P.mark, { radius: 26 });
      dot(g, X(q.x), Y(q.y), 10, { stroke: P.mark, width: 2.6 });
      const say = f.drop == null ? `dropped ${small(f.fall)}` : f.atCentre ? 'at its centre' : `${small(Math.abs(f.miss))} ${f.miss > 0 ? 'below' : 'above'} its centre`;
      // one label, the time with it: down and to the left of the break, clear of the strip
      const lx = X(q.x) - 22, ly = Y(q.y) + 34;
      if (phone) {
        L.add(say, lx, ly, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
        L.add(T`t = ${s3(f.t2)} [s]`, lx, ly + 26, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700, push: 'down' });
        keep.push({ x: 0, y: ly - 12, w: lx + 6, h: 50 });
      } else {
        L.add(`${say}, ${T`t = ${s3(f.t2)} [s]`}`, lx, ly, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
        keep.push({ x: lx - 300, y: ly - 12, w: 306, h: 24 });
      }
    }
  }

  // ── the launcher, in front of the first stand
  if (foil) launcher(g, X(0) - 3, Y(0), worktop, clamp(xEnd * 0.3 * k, 70, 130), { cocked: !(fired && t > 1e-9), rb: r + 3 });

  // ── the table's height, between its legs
  if (f.H) {
    const dx = tx0 + tableW * 0.32;
    stroke(g, [{ x: dx, y: Y(0) + r }, { x: dx, y: floorY }], { color: P.ink, width: 1.3, alpha: 0.9 });
    for (const yy of [Y(0) + r, floorY]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.3, alpha: 0.9 });
    L.add(T`${s3(f.H)} [m]`, dx + 9, (Y(0) + r + floorY) / 2 - 14, { color: P.ink, align: 'left', pri: 7, size: 15, weight: 700 });
  }

  // ── the path: all of it faintly, the part flown strongly
  stroke(g, pts.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 1.6, alpha: 0.35 });
  stroke(g, pts.filter((p) => p.t <= t).map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 2.8 });
  const landed = f.H && fired && t >= f.tMax - 1e-9;
  if (f.H) {
    const lx = X(f.R), { age, life } = ageOf(t, f.tMax, f.tMax);
    if (fired) { dust(g, lx, floorY, age, life, { size: 1.3, n: 18 }); pulse(g, lx, floorY, age, life, P.mark, { radius: 30 }); }
    if (landed) {
      stroke(g, [{ x: X(0), y: floorY + 22 }, { x: lx, y: floorY + 22 }], { color: P.ink, width: 1.3, alpha: 0.85 });
      for (const xx of [X(0), lx]) stroke(g, [{ x: xx, y: floorY + 17 }, { x: xx, y: floorY + 27 }], { color: P.ink, width: 1.3, alpha: 0.85 });
      L.add(T`${s3(f.R)} [m]`, (X(0) + lx) / 2, floorY + 38, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700 });
    }
  }

  // ── the ball, its velocity and its acceleration
  const q = f.pos(t), v = f.vel(t), bx = X(q.x), by = Y(q.y);
  if (f.H) softShadow(g, bx, floorY + 2, r * (1.6 + (floorY - by) / 80), 3, clamp(1 - (floorY - by) / 300, 0.25, 0.9));
  const vMax = Math.hypot(f.vel(f.tMax).x, f.vel(f.tMax).y) || 1, vl = clamp(w * 0.08, 46, 100) / vMax;
  const sp = Math.hypot(v.x, v.y);
  if (fired && t > 1e-9 && !landed) speedLines(g, bx, by, 1, 0.8, P.strong);
  let bx0 = null, by0 = null;
  if (show.velocity !== false && sp > 1e-6) {
    if (show.components) {
      arrow(g, bx, by, bx + v.x * vl, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      if (Math.abs(v.y) * vl > 4) arrow(g, bx + v.x * vl, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 2, head: 9 });
    }
    let tx = bx + v.x * vl, ty = by - v.y * vl;
    // never through the floor: an arrow that would go into it ends on it instead
    if (f.H && ty > floorY - 4) { const s2 = (floorY - 4 - by) / (ty - by); if (s2 > 0.25) { tx = bx + (tx - bx) * s2; ty = floorY - 4; } else { const dxa = tx - bx, dya = ty - by; tx = bx; ty = floorY - 4; bx0 = tx - dxa; by0 = ty - dya; } }
    const ax0 = bx0 ?? bx, ay0 = by0 ?? by, len = Math.hypot(tx - ax0, ty - ay0) || 1, ux = (tx - ax0) / len, uy = (ty - ay0) / len;
    arrow(g, ax0, ay0, tx, ty, { color: P.velVec, width: 3, head: 12 });
    // its speed, set off the arrow on the side away from the path, wherever is clear
    const text = T`${s3(sp)} [m s^-1]`;
    g.save(); g.font = `700 14px ${cssVar('--font', 'system-ui, sans-serif')}`; const tw = g.measureText(text).width + 10; g.restore();
    const spots = [[tx + uy * 22 + 6, ty - ux * 22], [ax0 + uy * 26 - tw / 2, ay0 - ux * 26 - 8], [tx + 10, ty + 18], [tx + 10, ty - 22], [ax0 - tw - 14, ay0 - 18], [ax0 - tw - 14, ay0 + 22], [tx - uy * 24 + 6, ty + ux * 24]];
    const clear = (x, y) => { const b = { x: x - 5, y: y - 12, w: tw, h: 24 }; return b.x > 2 && b.x + b.w < w - 2 && b.y > 2 && b.y + b.h < h - 2 && !keep.some((k2) => hits(k2, b)) && !crosses(b, ax0, ay0, tx, ty); };
    const [lx, ly] = spots.find(([x, y]) => clear(x, y)) ?? spots[0];
    L.add(text, lx, ly, { color: P.vel, align: 'left', pri: 6, size: 14, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
  if (foil) bearing(g, bx, by, r); else ballAt(g, bx, by, r);
  L.draw(g, w, h);
  return null;
}
