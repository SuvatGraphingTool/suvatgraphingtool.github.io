// workshop.js — the room the bullet experiment stands in: a workshop at night.
//
// One warm lamp over the rig; behind it a pegboard of tools, shelves of jars,
// a moonlit window, dark floorboards. Things you can judge a fall against.
//
// ONE PICTURE. The wall is painted once into a 6.4 m tile at 200 px per metre
// and repeated, so panning and zooming cost a few drawImage calls. Three
// things are drawn live because they belong to THIS flight:
//   the striped pole   10 cm bands beside the drop — the strobe-photo prop
//   the backstop       sandbags and a target past the landing point
//   the lamp           its pool of light, and the dark beyond it
// All of it is anchored in metres (heights true, sideways in the flight's
// squeezed metres), so it moves with the camera. Scenery only: nothing here
// is a quantity (CLAUDE.md rule 4). Dark in both themes, like the strobe
// photograph it stands for.

import { rng } from './warehouse.js';

const K = { gold: '#e3b341', goldHi: '#ffe08a', A: '#f97316' };
const lin = (g, x0, y0, x1, y1, st) => { const r = g.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => r.addColorStop(o, c)); return r; };
const rad = (g, x, y, r0, r1, st) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, c]) => r.addColorStop(o, c)); return r; };
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function poly(g, pts, fill) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } }

/* ── the tile: 6.4 m × 5.8 m, floor line 4.6 m from the top ───────────── */
const PPM = 200, TILE_U = 6.4, TOP = 4.6, BOT = -1.2;
const TW = TILE_U * PPM, TH = (TOP - BOT) * PPM, FLOOR = TOP * PPM;
let TILE = null;
function tile() {
  if (TILE) return TILE;
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const g = c.getContext('2d'), r = rng(7);
  g.fillStyle = lin(g, 0, 0, 0, FLOOR, [[0, '#120f0b'], [0.6, '#211c16'], [1, '#2a241d']]); g.fillRect(0, 0, TW, FLOOR);
  for (let i = 0; i < 3200; i++) { g.fillStyle = `rgba(255,240,220,${r() * 0.025})`; g.fillRect(r() * TW, r() * FLOOR, 2, 2); }
  // the painted pieces were drawn with the floor at y = 612; shift them onto this tile's floor
  g.save(); g.translate(0, FLOOR - 612);
  const benchTop = 462;   // where the bench top sat when these were drawn
  const pb = { x: 40, y: 90, w: 540, h: benchTop - 110 };
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(pb.x + 8, pb.y + 10, pb.w, pb.h);
  g.fillStyle = lin(g, 0, pb.y, 0, pb.y + pb.h, [[0, '#6b5640'], [1, '#4f3f2f']]); g.fillRect(pb.x, pb.y, pb.w, pb.h);
  g.fillStyle = 'rgba(20,14,8,0.75)';
  for (let y = pb.y + 12; y < pb.y + pb.h - 6; y += 18) for (let x = pb.x + 12; x < pb.x + pb.w - 6; x += 18) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
  g.strokeStyle = '#2e2419'; g.lineWidth = 6; g.strokeRect(pb.x, pb.y, pb.w, pb.h);
  tools(g, pb, r);
  shelf(g, 860, 170, 230, r);
  shelf(g, 860, 300, 230, r);
  win(g, 1110, 70, 130, 150);
  g.restore();
  // floorboards
  g.fillStyle = lin(g, 0, FLOOR, 0, TH, [[0, '#2b2219'], [1, '#120e0a']]); g.fillRect(0, FLOOR, TW, TH - FLOOR);
  for (const dy of [10, 26, 50, 84, 130, 190]) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, FLOOR + dy, TW, 1.5); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(r() * TW, FLOOR + 10 + r() * 200, 1.5, 12 + r() * 20); }
  for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(230,200,150,${r() * 0.12})`; g.fillRect(r() * TW, FLOOR + r() * (TH - FLOOR), 1.4, 1); }
  g.fillStyle = lin(g, 0, FLOOR - 18, 0, FLOOR, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]); g.fillRect(0, FLOOR - 18, TW, 18);
  // pushed back a little, so the rig and the rounds are the brightest things on screen
  g.fillStyle = 'rgba(12,10,8,0.28)'; g.fillRect(0, 0, TW, TH);
  TILE = c;
  return c;
}

function tools(g, pb, r) {
  const sh = (fn) => { g.save(); g.translate(5, 7); g.globalAlpha = 0.45; g.filter = 'blur(3px)'; fn('#000', '#000', '#000'); g.restore(); fn(); };
  const hook = (x, y) => { g.strokeStyle = '#9aa1ab'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8); g.lineTo(x + 6, y + 10); g.stroke(); };
  // hammer
  sh((a, b) => { g.fillStyle = a || lin(g, 70, 0, 84, 0, [[0, '#a87445'], [1, '#6b4523']]); rr(g, 70, 130, 12, 120, 5); g.fill();
    g.fillStyle = b || lin(g, 0, 118, 0, 140, [[0, '#9aa1ab'], [1, '#3f444b']]); rr(g, 50, 118, 56, 20, 4); g.fill(); });
  hook(76, 112);
  // wrenches, three sizes
  [[140, 130, 0.9], [175, 128, 1.05], [214, 126, 1.2]].forEach(([x, y, k]) => sh((a) => {
    g.save(); g.translate(x, y); g.scale(k, k); g.fillStyle = a || lin(g, -6, 0, 6, 0, [[0, '#c8ced6'], [0.5, '#7b828c'], [1, '#3f444b']]);
    rr(g, -5, 10, 10, 110, 4); g.fill(); g.beginPath(); g.arc(0, 8, 11, 0, 7); g.fill(); g.beginPath(); g.arc(0, 122, 9, 0, 7); g.fill();
    g.fillStyle = a ? a : '#4f3f2f'; g.fillRect(-4, -6, 8, 12); g.restore(); }));
  // saw
  sh((a, b) => { poly(g, [[270, 130], [430, 130], [430, 176], [270, 150]], a || lin(g, 0, 130, 0, 176, [[0, '#d8dde3'], [1, '#868d96']]));
    if (!a) { g.fillStyle = '#5d636c'; for (let x = 272; x < 430; x += 6) poly(g, [[x, 150 + (x - 270) * 0.16], [x + 3, 155 + (x - 270) * 0.16], [x + 6, 150 + (x - 270) * 0.16]], '#5d636c'); }
    g.fillStyle = b || lin(g, 0, 120, 0, 180, [[0, '#f28a3e'], [1, '#9a3a12']]); rr(g, 422, 118, 50, 62, 14); g.fill();
    g.fillStyle = a ? a : '#4f3f2f'; rr(g, 434, 134, 26, 30, 8); g.fill(); });
  // screwdrivers rack
  g.fillStyle = '#2e2419'; g.fillRect(466, 124, 108, 10);
  ['#f97316', '#141414', '#e3b341', '#f97316', '#141414'].forEach((c, i) => sh((a) => {
    const x = 478 + i * 21; g.fillStyle = a || lin(g, x - 6, 0, x + 6, 0, [[0, c], [1, '#000']]); rr(g, x - 6, 134, 12, 42, 5); g.fill();
    g.fillStyle = a || '#b5bcc5'; g.fillRect(x - 1.5, 176, 3, 50 + (i % 3) * 10); }));
  // coil of orange cable
  sh((a) => { g.strokeStyle = a || '#e8641c'; g.lineWidth = 6; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(120, 330 + k * 2, 52 - k * 3, 46 - k * 3, 0, 0, 7); g.stroke(); } });
  hook(118, 278);
  // C-clamps
  [[250, 300], [320, 300]].forEach(([x, y]) => sh((a) => {
    g.strokeStyle = a || '#3a3e45'; g.lineWidth = 10; g.beginPath(); g.arc(x, y + 30, 26, Math.PI * 0.5, Math.PI * 1.5); g.lineTo(x + 16, y + 4); g.moveTo(x, y + 56); g.lineTo(x + 16, y + 56); g.stroke();
    g.fillStyle = a || '#e3b341'; g.fillRect(x + 12, y + 14, 6, 34); g.fillStyle = a || '#9aa1ab'; g.fillRect(x + 4, y + 46, 22, 5); }));
  // pliers + safety glasses + tape
  sh((a) => { g.strokeStyle = a || '#f97316'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(390, 380); g.lineTo(410, 300); g.moveTo(430, 380); g.lineTo(416, 300); g.stroke();
    g.strokeStyle = a || '#9aa1ab'; g.lineWidth = 7; g.beginPath(); g.moveTo(410, 300); g.lineTo(416, 266); g.moveTo(416, 300); g.lineTo(410, 266); g.stroke(); g.lineCap = 'butt'; });
  sh((a) => { g.fillStyle = a || 'rgba(255,214,120,0.55)'; rr(g, 458, 300, 46, 26, 10); g.fill(); rr(g, 512, 300, 46, 26, 10); g.fill();
    g.strokeStyle = a || '#141414'; g.lineWidth = 4; g.strokeRect(456, 298, 104, 30); });
  void r;
}

function shelf(g, x, y, w, r) {
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x + 6, y + 12, w, 12);
  g.fillStyle = lin(g, 0, y, 0, y + 14, [[0, '#8b6239'], [1, '#4e3520']]); g.fillRect(x, y, w, 14);
  g.fillStyle = '#2e2419'; g.fillRect(x + 20, y + 14, 6, 26); g.fillRect(x + w - 26, y + 14, 6, 26);
  let cx = x + 12;
  while (cx < x + w - 40) {
    const k = r();
    if (k < 0.4) { const hh = 40 + r() * 34, ww = 30 + r() * 14; g.fillStyle = lin(g, cx, 0, cx + ww, 0, [[0, 'rgba(180,200,210,0.22)'], [0.4, 'rgba(230,240,245,0.4)'], [1, 'rgba(120,140,150,0.18)']]);
      rr(g, cx, y - hh, ww, hh, 6); g.fill(); g.fillStyle = ['#e3b341', '#9aa1ab', '#f97316'][Math.floor(r() * 3)]; g.fillRect(cx + 2, y - hh - 6, ww - 4, 8);
      g.fillStyle = 'rgba(120,90,50,0.6)'; g.fillRect(cx + 3, y - hh * 0.45, ww - 6, hh * 0.45 - 2); cx += ww + 8; }
    else if (k < 0.7) { const hh = 50 + r() * 20, ww = 34; g.fillStyle = lin(g, cx, 0, cx + ww, 0, [[0, '#3a3e45'], [0.4, '#9aa1ab'], [1, '#2a2d32']]); g.fillRect(cx, y - hh, ww, hh);
      g.fillStyle = K.A; g.fillRect(cx, y - hh * 0.7, ww, hh * 0.32); g.fillStyle = '#141414'; g.fillRect(cx + 10, y - hh - 6, 14, 6); cx += ww + 10; }
    else { const hh = 26 + r() * 30, ww = 50 + r() * 30; g.fillStyle = lin(g, 0, y - hh, 0, y, [[0, '#a37a4a'], [1, '#6e5233']]); g.fillRect(cx, y - hh, ww, hh);
      g.fillStyle = 'rgba(255,240,210,0.2)'; g.fillRect(cx + ww / 2 - 4, y - hh, 8, hh); cx += ww + 8; }
  }
}

function win(g, x, y, w, h) {
  g.fillStyle = '#0a0b0e'; g.fillRect(x - 8, y - 8, w + 16, h + 16);
  g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#2b3a4f'], [1, '#141c27']]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(230,236,246,0.85)'; g.beginPath(); g.arc(x + w * 0.7, y + h * 0.28, 12, 0, 7); g.fill();
  g.fillStyle = '#0a0b0e'; g.fillRect(x + w / 2 - 3, y, 6, h); g.fillRect(x, y + h / 2 - 3, w, 6);
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = lin(g, x, y + h, x - 200, 600, [[0, 'rgba(120,150,190,0.10)'], [1, 'rgba(120,150,190,0)']]);
  poly(g, [[x, y + h], [x + w, y + h], [x - 60, 612], [x - 300, 612]]); g.fill(); g.restore();
}

const font = (w, s) => `${w} ${s}px 'Oxanium', system-ui, sans-serif`;

/* ── live, per flight ──────────────────────────────────────────────────── */
function pole(g, m) {
  const x = m.X(m.poleU), w = 0.13 * m.s, top = m.Y(2.0);
  if (x < -40 || x > m.w + 40) return;
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 0.03 * m.s, top + 0.04 * m.s, w, m.Y(0) - top);
  for (let i = 0; i < 20; i++) { const y0 = m.Y((i + 1) / 10), y1 = m.Y(i / 10); g.fillStyle = i % 2 ? '#e9e4d8' : '#151515'; g.fillRect(x, y0, w, y1 - y0); }
  g.fillStyle = lin(g, x, 0, x + w, 0, [[0, 'rgba(0,0,0,0.35)'], [0.3, 'rgba(255,255,255,0.12)'], [1, 'rgba(0,0,0,0.4)']]); g.fillRect(x, top, w, m.Y(0) - top);
  g.fillStyle = K.gold; g.fillRect(x - 0.015 * m.s, top - 0.03 * m.s, w + 0.03 * m.s, 0.03 * m.s);
  g.font = font(700, 13); g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (const h of [0.5, 1, 1.5, 2]) {
    const y = m.Y(h); g.fillStyle = K.gold; g.fillRect(x + w, y - 1, 10, 2);
    const s = `${h} m`; g.strokeStyle = 'rgba(10,10,10,0.9)'; g.lineWidth = 4; g.strokeText(s, x + w + 14, y); g.fillStyle = K.goldHi; g.fillText(s, x + w + 14, y);
  }
}
function backstop(g, m) {
  const s = m.s, x0 = m.X(m.landU + 0.22), floorY = m.Y(0);
  if (x0 > m.w) return;
  const top = m.Y(2.1);
  g.fillStyle = lin(g, x0, 0, m.w, 0, [[0, '#3a2c1d'], [1, '#22190f']]); g.fillRect(x0 + 0.15 * s, top, m.w - x0, floorY - top);
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2;
  for (let y = top; y < floorY; y += 0.2 * s) { g.beginPath(); g.moveTo(x0 + 0.15 * s, y); g.lineTo(m.w, y); g.stroke(); }
  const tx = x0 + 0.55 * s, ty = m.Y(1.5), R = 0.17 * s;
  g.fillStyle = '#ece6d8'; g.fillRect(tx - R * 1.25, ty - R * 1.25, R * 2.5, R * 2.5);
  for (const [k, col] of [[1, '#111'], [0.72, '#ece6d8'], [0.5, '#111'], [0.26, K.A]]) { g.fillStyle = col; g.beginPath(); g.arc(tx, ty, R * k, 0, 7); g.fill(); }
  const bw = 0.27 * s, bh = 0.14 * s;
  for (let row = 0; row < 4; row++) for (let i = 0; i < 12; i++) {
    const bx = x0 + 0.03 * s + i * bw * 0.93 + (row % 2) * bw * 0.46, by = floorY - 0.02 * s - row * bh * 0.93;
    if (bx > m.w) break;
    g.fillStyle = lin(g, 0, by - bh, 0, by, [[0, '#a8946e'], [1, '#5e5038']]); rr(g, bx, by - bh, bw, bh, bh * 0.43); g.fill();
  }
}
function lamp(g, m, flash) {
  const lx = m.X(m.lampU), ly = m.Y(2.75), sh = 0.23 * m.s;
  g.strokeStyle = '#0a0a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, Math.min(0, ly) - 10); g.lineTo(lx, ly - sh * 0.6); g.stroke();
  poly(g, [[lx - sh, ly + sh * 0.17], [lx - sh * 0.3, ly - sh * 0.43], [lx + sh * 0.3, ly - sh * 0.43], [lx + sh, ly + sh * 0.17]], lin(g, 0, ly - sh * 0.43, 0, ly + sh * 0.17, [[0, '#3a3e45'], [1, '#14161a']]));
  g.fillStyle = K.gold; g.fillRect(lx - sh, ly + sh * 0.15, sh * 2, 2);
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = rad(g, lx, ly + sh * 0.2, 0, sh * 0.56, [[0, 'rgba(255,246,220,1)'], [1, 'rgba(255,214,150,0)']]); g.beginPath(); g.arc(lx, ly + sh * 0.2, sh * 0.56, 0, 7); g.fill();
  g.fillStyle = lin(g, 0, ly, 0, m.Y(0), [[0, 'rgba(255,206,140,0.20)'], [1, 'rgba(255,206,140,0.02)']]);
  poly(g, [[lx - sh * 0.95, ly + sh * 0.2], [lx + sh * 0.95, ly + sh * 0.2], [lx + 2.8 * m.s, m.Y(0)], [lx - 2.6 * m.s, m.Y(0)]]); g.fill();
  if (flash > 0.01) { g.fillStyle = `rgba(220,232,255,${0.12 * flash})`; g.fillRect(0, 0, m.w, m.h); }
  g.restore();
}

/**
 * The room behind the flight.
 * @param m { w, h, X(u), Y(y), s, u0, u1, landU, poleU, lampU }
 */
export function room(g, m) {
  const T = tile(), tw = TILE_U * m.s, y0 = m.Y(TOP), y1 = m.Y(BOT);
  g.fillStyle = '#0a0806'; g.fillRect(0, 0, m.w, Math.max(0, y0) + 1);
  if (y1 < m.h) { g.fillStyle = '#0c0907'; g.fillRect(0, y1 - 1, m.w, m.h - y1 + 1); }
  for (let i = Math.floor(m.u0 / TILE_U); i * TILE_U <= m.u1; i++) g.drawImage(T, m.X(i * TILE_U), y0, tw, y1 - y0);
  backstop(g, m);
  pole(g, m);
}
/** The lamp and its fall-off — drawn over the rig and the rounds, under the labels. */
export function light(g, m, flash, cx, cy) {
  lamp(g, m, flash);
  g.fillStyle = rad(g, cx, cy, 1.1 * m.s, 4.9 * m.s, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.7)']]); g.fillRect(0, 0, m.w, m.h);
}
