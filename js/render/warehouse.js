// warehouse.js — the room the bullet experiment stands in.
//
// A CLUTTERED ROOM ON PURPOSE. On a 2D screen a falling object only looks like
// it is falling when something fixed stands behind it. Pallet racking at fixed
// heights, boxes, drums, columns and lamps give the eye that reference.
//
// AND THEN PUSHED BACK. The room is a reference, not the subject. It is
// painted, then desaturated, flattened, softened and tinted slate, so the
// rounds, the gun and the labels are the only things at full strength. A soft
// band of light runs along the lane the flight happens in.
//
// IT IS ONE PICTURE. The room is painted ONCE, into a 6.4 m tile that repeats
// seamlessly, and every frame after that is a handful of drawImage calls — so
// zooming out costs the same as zooming in. Every repeat in it (1.28 m racks,
// 1.6 m columns and windows, 0.8 m floor joints) divides 6.4 m exactly.
//
// IT IS ANCHORED TO THE WORLD. Everything is placed in metres — heights true,
// sideways in the same squeezed metres the flight is drawn in — so it pans and
// zooms with the camera, and a rack beam at 1.24 m is at 1.24 m. Scenery only:
// nothing here is a quantity, and none of it is computed from the motion
// (CLAUDE.md rule 4).
//
// The plate is dark in both themes, like the strobe photograph it stands for.

import { cssVar } from './util.js';

/* ── the room, in metres ───────────────────────────────────────────────── */
const ROOM = {
  roof: 4.0,                       // underside of the trusses
  win: { y0: 3.0, y1: 3.46, w: 1.0, period: 1.6, at: 0.35 },
  column: { w: 0.13, period: 1.6, at: 0.95, hazard: 0.65 },
  lamp: { y: 3.4, period: 1.6, at: 1.75 },
  rack: { bay: 1.28, beams: [0.62, 1.24, 1.86, 2.48], top: 2.6 },
  hoist: { period: 6.4, at: 3.8, hook: 2.2 },
  sign: { period: 6.4, at: 1.9, y: 3.52, w: 0.85, h: 0.21 },
  joint: 0.8,                      // floor expansion joints
};

/* ── tiny helpers ──────────────────────────────────────────────────────── */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const TILE_U = 6.4;
const cell = (i, salt, period) => { const n = Math.round(TILE_U / period); return rng((((i % n) + n) % n) * 2654435761 ^ (salt * 40503)); };
const lin = (g, x0, y0, x1, y1, stops) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => r.addColorStop(o, c)); return r; };
const rad = (g, x, y, r0, r1, stops) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => r.addColorStop(o, c)); return r; };
function poly(g, pts, fill) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } }
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
/** Every index i whose repeat (at + i·period) falls inside [u0, u1], with margin. */
function* repeats(u0, u1, period, at, margin = period) {
  for (let i = Math.floor((u0 - margin - at) / period); at + i * period <= u1 + margin; i++) yield i;
}

/* ── painters. `m` maps room metres to the screen: X(u), Y(y), s px per m ─ */
function wall(g, m) {
  const { w, h, Y, s } = m, floorY = Y(0);
  g.fillStyle = lin(g, 0, Y(ROOM.roof + 0.3), 0, floorY, [[0, '#0e0f12'], [0.55, '#1a1b20'], [1, '#232329']]);
  g.fillRect(0, 0, w, Math.min(h, floorY));
  const rib = 0.064 * s;
  if (rib >= 3) {
    const off = ((m.X(0) % rib) + rib) % rib;
    for (let x = off - rib; x < w; x += rib) {
      g.fillStyle = 'rgba(255,255,255,0.022)'; g.fillRect(x, Y(ROOM.roof), rib * 0.36, floorY - Y(ROOM.roof));
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + rib * 0.55, Y(ROOM.roof), rib * 0.18, floorY - Y(ROOM.roof));
    }
  }
  for (const yy of [0.98, 1.68, 2.38, 3.08]) {
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, Y(yy), w, Math.max(1, 0.01 * s));
  }
}
function windows(g, m) {
  const W = ROOM.win, s = m.s;
  for (const i of repeats(m.u0, m.u1, W.period, W.at)) {
    const r = cell(i, 1, W.period), x0 = m.X(W.at + i * W.period), x1 = x0 + W.w * s, y0 = m.Y(W.y1), y1 = m.Y(W.y0);
    g.fillStyle = '#07080a'; g.fillRect(x0 - 0.03 * s, y0 - 0.03 * s, x1 - x0 + 0.06 * s, y1 - y0 + 0.06 * s);
    const pw = (x1 - x0) / 6, ph = (y1 - y0) / 3, gap = Math.max(1, 0.01 * s);
    for (let a = 0; a < 6; a++) for (let b = 0; b < 3; b++) {
      const broken = r() < 0.13, lit = r() * 0.22, px = x0 + a * pw + gap, py = y0 + b * ph + gap;
      g.fillStyle = broken ? '#060607' : lin(g, 0, py, 0, py + ph, [[0, `rgba(118,130,148,${0.36 + lit})`], [1, `rgba(58,66,78,${0.36 + lit})`]]);
      g.fillRect(px, py, pw - 2 * gap, ph - 2 * gap);
    }
  }
}
function trusses(g, m) {
  const { w, Y, s } = m, y0 = Y(ROOM.roof + 0.26), y1 = Y(ROOM.roof);
  if (y1 < -4) return;
  g.fillStyle = '#07080a'; g.fillRect(0, Math.min(0, y0) - 400, w, y0 - Math.min(0, y0) + 400 + 0.06 * s); g.fillRect(0, y1 - 0.035 * s, w, 0.035 * s);
  const p = 0.256 * s;
  if (p < 4) return;
  g.strokeStyle = '#0b0c0f'; g.lineWidth = Math.max(1, 0.02 * s); g.beginPath();
  const off = ((m.X(0) % p) + p) % p;
  for (let x = off - p; x < w + p; x += p) { g.moveTo(x, y0 + 0.06 * s); g.lineTo(x + p / 2, y1 - 0.035 * s); g.lineTo(x + p, y0 + 0.06 * s); }
  g.stroke();
}
function columns(g, m) {
  const C = ROOM.column, s = m.s, top = m.Y(ROOM.roof), floorY = m.Y(0);
  for (const i of repeats(m.u0, m.u1, C.period, C.at)) {
    const x = m.X(C.at + i * C.period), hw = C.w * s / 2;
    g.fillStyle = lin(g, x - hw, 0, x + hw, 0, [[0, '#0b0c0e'], [0.22, '#33363d'], [0.5, '#1b1d21'], [0.8, '#26282d'], [1, '#0a0b0c']]);
    g.fillRect(x - hw, top, hw * 2, floorY - top);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x - hw * 0.3, top, hw * 0.6, floorY - top);
    const hz = C.hazard * s, st = 0.09 * s;
    g.save(); g.beginPath(); g.rect(x - hw, floorY - hz, hw * 2, hz); g.clip();
    g.fillStyle = '#a8842c'; g.fillRect(x - hw, floorY - hz, hw * 2, hz);
    for (let k = -st * 2; k < hz + st * 2; k += st) poly(g, [[x - hw, floorY - k], [x + hw, floorY - k - st * 0.9], [x + hw, floorY - k - st * 0.4], [x - hw, floorY - k + st * 0.5]], '#121212');
    g.restore();
  }
}
function racks(g, m) {
  const R = ROOM.rack, s = m.s;
  for (const i of repeats(m.u0, m.u1, R.bay, 0)) {
    const r = cell(i, 2, R.bay), u0 = i * R.bay, x0 = m.X(u0), bw = R.bay * s;
    const shelves = [0, ...R.beams];
    for (let k = 0; k < shelves.length; k++) {
      const base = shelves[k], top = k + 1 < shelves.length ? shelves[k + 1] - 0.06 : R.top + 0.25;
      const maxH = (top - base - 0.03) * s;
      const yb = m.Y(base) - (k === 0 ? 0.05 * s : 0);
      if (k === 0) pallet(g, x0 + 0.06 * s, m.Y(0), bw - 0.17 * s, s);
      let x = x0 + 0.08 * s;
      while (x < x0 + bw - 0.2 * s) {
        const used = item(g, x, yb, Math.min(maxH - (k === 0 ? 0.05 * s : 0), 0.45 * s), r, Math.min(x0 + bw - 0.09 * s - x, 0.6 * s), s);
        x += used + 0.015 * s + r() * 0.04 * s;
        if (r() < 0.12) x += 0.13 * s;
      }
    }
    for (const ux of [x0, x0 + bw - 0.05 * s]) upright(g, ux, m.Y(R.top), m.Y(0), s);
    for (const b of R.beams) beam(g, x0 + 0.02 * s, m.Y(b), bw - 0.04 * s, s);
  }
}
function upright(g, x, top, base, s) {
  const w = 0.05 * s;
  g.fillStyle = lin(g, x, 0, x + w, 0, [[0, '#4a515b'], [0.5, '#2c3138'], [1, '#191c20']]); g.fillRect(x, top, w, base - top);
  const step = 0.07 * s;
  if (step >= 4) { g.fillStyle = 'rgba(0,0,0,0.6)'; for (let y = top + step / 2; y < base - step / 2; y += step) g.fillRect(x + w * 0.35, y, w * 0.3, step * 0.43); }
}
function beam(g, x, y, len, s) {
  const bh = 0.055 * s;
  g.fillStyle = lin(g, 0, y, 0, y + bh, [[0, '#f28a3e'], [0.35, '#d05e1f'], [1, '#6e2f0e']]); g.fillRect(x, y, len, bh);
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x, y, len, 1);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + bh, len, 0.015 * s);
}
function pallet(g, x, yb, w, s) {
  const t = 0.015 * s;
  g.fillStyle = '#5a4128'; g.fillRect(x, yb - 0.05 * s, w, t); g.fillRect(x, yb - t, w, t);
  for (let k = 0; k <= 4; k++) { g.fillStyle = '#6b4e30'; g.fillRect(x + (w - 0.07 * s) * (k / 4), yb - 0.04 * s, 0.07 * s, 0.03 * s); }
}
function item(g, x, yb, maxH, r, room, s) {
  const p = r();
  if (room < 0.15 * s) return room;
  if (p < 0.42) {
    const wB = Math.min(room, (0.2 + r() * 0.27) * s), hB = Math.min(maxH, (0.13 + r() * 0.27) * s);
    const c = r() < 0.2 ? '#7a7c80' : ['#a37a4a', '#8d683f', '#b58a57'][Math.floor(r() * 3)];
    box(g, x, yb, wB, hB, c, s);
    if (r() < 0.45 && hB + 0.15 * s < maxH) box(g, x + 0.03 * s, yb - hB, wB * 0.7, Math.min(maxH - hB, (0.1 + r() * 0.13) * s), c, s);
    return wB + 0.03 * s;
  }
  if (p < 0.58 && maxH > 0.28 * s) { const n = 1 + Math.floor(r() * 2); for (let k = 0; k < n; k++) drum(g, x + k * 0.23 * s, yb, Math.min(maxH, 0.34 * s), r() < 0.45, s); return n * 0.23 * s; }
  if (p < 0.72) { const wC = Math.min(room, (0.3 + r() * 0.2) * s), hC = Math.min(maxH, (0.17 + r() * 0.15) * s); crate(g, x, yb, wC, hC, s); return wC + 0.03 * s; }
  if (p < 0.86 && maxH > 0.2 * s) { const wW = Math.min(room, (0.4 + r() * 0.15) * s), hW = Math.min(maxH, (0.2 + r() * 0.2) * s); wrap(g, x, yb, wW, hW, r, s); return wW + 0.02 * s; }
  if (p < 0.94) { sack(g, x, yb, Math.min(room, 0.26 * s), Math.min(maxH, 0.13 * s)); return 0.27 * s; }
  return 0.17 * s;
}
function box(g, x, yb, w, h, c, s) {
  const d = 0.035 * s;
  g.fillStyle = lin(g, 0, yb - h, 0, yb, [[0, c], [1, shade(c, -0.35)]]); g.fillRect(x, yb - h, w, h);
  poly(g, [[x, yb - h], [x + d, yb - h - d * 0.6], [x + w + d, yb - h - d * 0.6], [x + w, yb - h]], shade(c, 0.18));
  poly(g, [[x + w, yb - h], [x + w + d, yb - h - d * 0.6], [x + w + d, yb - d * 0.6], [x + w, yb]], shade(c, -0.5));
  g.fillStyle = 'rgba(255,240,210,0.16)'; g.fillRect(x + w / 2 - 0.02 * s, yb - h, 0.04 * s, h);
}
function crate(g, x, yb, w, h, s) {
  g.fillStyle = lin(g, 0, yb - h, 0, yb, [[0, '#7c5b36'], [1, '#4a3420']]); g.fillRect(x, yb - h, w, h);
  g.fillStyle = 'rgba(0,0,0,0.38)'; for (let y = yb - h + 0.045 * s; y < yb; y += 0.05 * s) g.fillRect(x, y, w, Math.max(1, 0.008 * s));
  g.strokeStyle = '#3a2816'; g.lineWidth = Math.max(1, 0.02 * s); g.strokeRect(x + 0.01 * s, yb - h + 0.01 * s, w - 0.02 * s, h - 0.02 * s);
  g.beginPath(); g.moveTo(x + 0.02 * s, yb - 0.02 * s); g.lineTo(x + w - 0.02 * s, yb - h + 0.02 * s); g.stroke();
}
function drum(g, x, yb, h, orange, s) {
  const w = 0.21 * s;
  g.fillStyle = lin(g, x, 0, x + w, 0, orange
    ? [[0, '#5a250b'], [0.3, '#d8621f'], [0.48, '#f59a5a'], [0.75, '#a2441a'], [1, '#3d1806']]
    : [[0, '#0f1012'], [0.3, '#454a52'], [0.48, '#6c727c'], [0.75, '#2a2d33'], [1, '#0c0d0f']]);
  g.fillRect(x, yb - h, w, h);
  for (const k of [0.3, 0.68]) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, yb - h * k - 0.01 * s, w, 0.02 * s); }
  g.fillStyle = orange ? '#7a3210' : '#1c1e22'; g.beginPath(); g.ellipse(x + w / 2, yb - h, w / 2, 0.02 * s, 0, 0, 7); g.fill();
}
function wrap(g, x, yb, w, h, r, s) {
  const rows = Math.max(1, Math.floor(h / (0.11 * s)));
  for (let j = 0; j < rows; j++) for (let i = 0; i < 3; i++) box(g, x + i * (w / 3), yb - j * (h / rows), w / 3 - 0.01 * s, h / rows - 0.01 * s, '#8d6a42', s);
  g.fillStyle = 'rgba(206,212,220,0.32)'; g.fillRect(x - 0.01 * s, yb - h - 0.02 * s, w + 0.04 * s, h + 0.02 * s);
  g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + r() * w * 0.4, yb - h); g.lineTo(x + w * 0.6 + r() * w * 0.4, yb); g.stroke(); }
}
function sack(g, x, yb, w, h) {
  g.fillStyle = lin(g, 0, yb - h, 0, yb, [[0, '#a59a86'], [1, '#5e5648']]);
  g.beginPath(); g.moveTo(x, yb); g.quadraticCurveTo(x - w * 0.08, yb - h, x + w * 0.3, yb - h); g.lineTo(x + w * 0.75, yb - h * 1.05);
  g.quadraticCurveTo(x + w * 1.08, yb - h, x + w, yb); g.closePath(); g.fill();
}
function hoists(g, m) {
  const H = ROOM.hoist, s = m.s;
  for (const i of repeats(m.u0, m.u1, H.period, H.at)) {
    const x = m.X(H.at + i * H.period), y0 = m.Y(ROOM.roof), y1 = m.Y(H.hook), link = 0.045 * s;
    if (link >= 2) for (let y = y0, k = 0; y < y1; y += link, k++) {
      g.strokeStyle = k % 2 ? '#3c4047' : '#272a2f'; g.lineWidth = Math.max(1, 0.011 * s);
      g.beginPath(); g.ellipse(x, y + link / 2, k % 2 ? link * 0.17 : link * 0.39, link * 0.56, 0, 0, 7); g.stroke();
    }
    g.fillStyle = lin(g, x - 0.07 * s, 0, x + 0.07 * s, 0, [[0, '#a8842c'], [0.5, '#e3b341'], [1, '#6a4c0c']]);
    g.fillRect(x - 0.07 * s, y1, 0.14 * s, 0.11 * s);
    g.strokeStyle = '#2b2e34'; g.lineWidth = Math.max(1.5, 0.03 * s); g.beginPath(); g.arc(x, y1 + 0.2 * s, 0.06 * s, -Math.PI * 0.5, Math.PI * 1.1); g.stroke();
  }
}
function signs(g, m) {
  const S = ROOM.sign, s = m.s, font = cssVar('--font', 'system-ui, sans-serif');
  for (const i of repeats(m.u0, m.u1, S.period, S.at)) {
    const x = m.X(S.at + i * S.period), y = m.Y(S.y + S.h), w = S.w * s, h = S.h * s;
    g.strokeStyle = '#2a2c30'; g.lineWidth = 1.5; g.beginPath();
    g.moveTo(x + w * 0.12, m.Y(ROOM.roof)); g.lineTo(x + w * 0.12, y); g.moveTo(x + w * 0.88, m.Y(ROOM.roof)); g.lineTo(x + w * 0.88, y); g.stroke();
    g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#e8782e'], [1, '#b04d14']]); g.fillRect(x, y, w, h);
    const size = h * 0.48;
    if (size >= 13) { g.fillStyle = '#111'; g.font = `800 ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LIVE FIRE', x + w / 2, y + h / 2 + 1); }
  }
}
function lightShafts(g, m) {
  const W = ROOM.win, s = m.s, floorY = m.Y(0);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const i of repeats(m.u0, m.u1, W.period, W.at, 3)) {
    const x0 = m.X(W.at + i * W.period), y0 = m.Y(W.y0);
    g.fillStyle = lin(g, x0, y0, x0 + 1.3 * s, floorY, [[0, 'rgba(160,178,205,0.075)'], [1, 'rgba(160,178,205,0)']]);
    poly(g, [[x0, y0], [x0 + W.w * s, y0], [x0 + 2.6 * s, floorY], [x0 + 0.7 * s, floorY]]); g.fill();
  }
  g.restore();
}
function lamps(g, m) {
  const P = ROOM.lamp, s = m.s, floorY = m.Y(0);
  for (const i of repeats(m.u0, m.u1, P.period, P.at, 2)) {
    const x = m.X(P.at + i * P.period), y = m.Y(P.y), sh = 0.14 * s;
    g.strokeStyle = '#1a1b1e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, m.Y(ROOM.roof)); g.lineTo(x, y - sh * 0.65); g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = lin(g, 0, y, 0, floorY, [[0, 'rgba(255,214,150,0.08)'], [1, 'rgba(255,214,150,0)']]);
    poly(g, [[x - sh * 0.7, y], [x + sh * 0.7, y], [x + 0.75 * s, floorY], [x - 0.75 * s, floorY]]); g.fill();
    g.fillStyle = rad(g, x, y, 0, 0.35 * s, [[0, 'rgba(255,226,170,0.55)'], [1, 'rgba(255,226,170,0)']]); g.beginPath(); g.arc(x, y, 0.35 * s, 0, 7); g.fill();
    g.restore();
    poly(g, [[x - sh, y], [x - sh * 0.36, y - sh * 0.65], [x + sh * 0.36, y - sh * 0.65], [x + sh, y]], lin(g, 0, y - sh * 0.65, 0, y, [[0, '#2a2c30'], [1, '#0f1012']]));
    g.fillStyle = '#e3b341'; g.fillRect(x - sh, y - 1, sh * 2, 1.6);
  }
}
function floor(g, m) {
  const { w, h, Y, s } = m, top = Y(0);
  if (top >= h) return;
  g.fillStyle = lin(g, 0, top, 0, h, [[0, '#2a2926'], [0.12, '#3a3833'], [1, '#171615']]); g.fillRect(0, top, w, h - top);
  g.fillStyle = lin(g, 0, top - 16, 0, top + 4, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]); g.fillRect(0, top - 16, w, 20);
  for (const dy of [12, 30, 56, 94, 140]) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, top + dy, w, 1); }
  for (const i of repeats(m.u0, m.u1, ROOM.joint, 0)) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(m.X(i * ROOM.joint), top, 1, h - top); }
  for (const i of repeats(m.u0, m.u1, ROOM.joint, 0)) {
    const r = cell(i, 5, ROOM.joint); if (r() < 0.45) continue;
    const x = m.X((i + r()) * ROOM.joint), y = top + 10 + r() * 120, rx = (0.1 + r() * 0.35) * s;
    g.save(); g.translate(x, y); g.scale(1, 0.22);
    g.fillStyle = rad(g, 0, 0, 0, rx, [[0, 'rgba(0,0,0,0.22)'], [1, 'rgba(0,0,0,0)']]); g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore();
  }
  g.fillStyle = 'rgba(227,179,65,0.5)'; g.fillRect(0, top + 18, w, 3); g.fillRect(0, top + 74, w, 6);
}
function backstop(g, m) {
  const s = m.s, floorY = m.Y(0), x0 = m.X(m.landU + 0.32), w = m.w;
  if (x0 > w) return;
  const top = m.Y(2.8);
  g.fillStyle = lin(g, 0, top - 0.4 * s, 0, top, [[0, '#2b2e34'], [1, '#17181b']]);
  poly(g, [[x0 + 0.35 * s, top - 0.02 * s], [w + 4, top - 0.4 * s], [w + 4, top - 0.27 * s], [x0 + 0.4 * s, top + 0.05 * s]]); g.fill();
  g.beginPath(); g.moveTo(x0, floorY + 2); g.bezierCurveTo(x0 + 0.15 * s, floorY - 0.25 * s, x0 + 0.3 * s, top + 0.3 * s, x0 + 0.65 * s, top + 0.07 * s);
  g.lineTo(w + 4, top - 0.05 * s); g.lineTo(w + 4, floorY + 2); g.closePath();
  g.fillStyle = lin(g, 0, top, 0, floorY, [[0, '#4d4539'], [1, '#2a251f']]); g.fill();
  const tx = x0 + 0.75 * s, ty = top + 0.35 * s, R = 0.15 * s;
  g.fillStyle = '#2b2d31'; g.fillRect(tx - 0.01 * s, ty, 0.02 * s, floorY - ty);
  g.fillStyle = '#ece6d8'; g.fillRect(tx - R * 1.2, ty - R * 1.2, R * 2.4, R * 2.4);
  for (const [k, col] of [[1, '#0a0a0b'], [0.72, '#ece6d8'], [0.5, '#0a0a0b'], [0.26, '#e3b341']]) { g.fillStyle = col; g.beginPath(); g.arc(tx, ty, R * k, 0, 7); g.fill(); }
  const hb = 0.06 * s;
  g.save(); g.beginPath(); g.rect(x0 - 0.05 * s, floorY - hb, w, hb); g.clip();
  g.fillStyle = '#e3b341'; g.fillRect(x0 - 0.05 * s, floorY - hb, w, hb);
  for (let k = -hb * 2; k < w - x0 + hb * 2; k += hb * 1.5) poly(g, [[x0 + k, floorY], [x0 + k + hb * 0.75, floorY], [x0 + k + hb * 1.75, floorY - hb], [x0 + k + hb, floorY - hb]], '#0a0a0b');
  g.restore();
}

/* ── the picture: painted once, pushed back once ─────────────────────── */
const PPM = 150;                  // tile pixels per metre
const TOP = 4.6, BOT = -1.2;      // the tile runs from 1.2 m under the floor line to above the roof
let TILE = null;
function tile() {
  if (TILE) return TILE;
  const w = Math.round(TILE_U * PPM), h = Math.round((TOP - BOT) * PPM);
  const m = { w, h, s: PPM, X: (u) => u * PPM, Y: (y) => (TOP - y) * PPM, u0: 0, u1: TILE_U };
  const raw = document.createElement('canvas'); raw.width = w; raw.height = h;
  const g = raw.getContext('2d');
  wall(g, m); windows(g, m); trusses(g, m); columns(g, m);
  g.fillStyle = 'rgba(10,10,13,0.42)'; g.fillRect(0, 0, w, m.Y(0));
  racks(g, m);
  g.fillStyle = lin(g, 0, 0, 0, m.Y(0), [[0, 'rgba(10,10,13,0.42)'], [1, 'rgba(26,24,22,0.2)']]); g.fillRect(0, 0, w, m.Y(0));
  hoists(g, m); signs(g, m); lightShafts(g, m); lamps(g, m); floor(g, m);
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const o = out.getContext('2d');
  o.filter = 'blur(1.5px) grayscale(0.85) contrast(0.6) brightness(0.62)';
  // drawn three times side by side so the blur wraps across the seam
  for (const dx of [-w, 0, w]) o.drawImage(raw, dx, 0);
  o.filter = 'none';
  o.globalCompositeOperation = 'multiply'; o.fillStyle = '#7f8a9a'; o.fillRect(0, 0, w, h);
  TILE = out;
  return out;
}

/**
 * Lay the room behind the flight.
 * @param m { w, h, X(u), Y(y), s, u0, u1, landU, laneTop } — room metres to screen.
 */
export function room(g, m) {
  const T = tile(), tw = TILE_U * m.s, y0 = m.Y(TOP), y1 = m.Y(BOT);
  g.fillStyle = '#060708'; g.fillRect(0, 0, m.w, Math.max(0, y0) + 1);
  if (y1 < m.h) { g.fillStyle = '#0f0f0e'; g.fillRect(0, y1 - 1, m.w, m.h - y1 + 1); }
  for (let i = Math.floor(m.u0 / TILE_U); i * TILE_U <= m.u1; i++) g.drawImage(T, m.X(i * TILE_U), y0, tw, y1 - y0);

  // the far end, which moves with the landing point — a few shapes, muted to match
  backstop(g, m);
  g.fillStyle = 'rgba(30,33,38,0.45)';
  const bx = m.X(m.landU + 0.32);
  if (bx < m.w) g.fillRect(bx, m.Y(3.4), m.w - bx, m.Y(0) - m.Y(3.4) + 2);

  // the lit lane, and the dark above it, so the eye drops to the flight
  const top = m.Y(m.laneTop), bot = m.Y(0) + 6;
  g.save(); g.globalCompositeOperation = 'screen';
  g.fillStyle = lin(g, 0, top - 0.3 * m.s, 0, bot, [[0, 'rgba(120,128,140,0)'], [0.25, 'rgba(120,128,140,0.16)'], [1, 'rgba(150,150,150,0.1)']]);
  g.fillRect(0, top - 0.3 * m.s, m.w, bot - top + 0.3 * m.s);
  g.restore();
  if (top > 0) { g.fillStyle = lin(g, 0, 0, 0, top, [[0, 'rgba(8,9,11,0.55)'], [1, 'rgba(8,9,11,0)']]); g.fillRect(0, 0, m.w, top); }
}
