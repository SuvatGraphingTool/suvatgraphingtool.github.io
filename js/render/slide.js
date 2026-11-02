// slide.js — the stage for something let go from rest that slides down a rough
// slope, side on and at the slope's true angle, in one of three places:
//   slipway  a lifeboat launched down its station's slipway into the sea
//   roof     a loose tile sliding down a house roof to the gutter
//   plane    a block on a wooden wedge on a lab bench
// The run is marked from where it is let go to where it ends, the angle at
// the foot; at the end, a splash, a tile tipping off the gutter, or a ring.
// A card fixed to the screen shows the forces along the slope from the
// engine: the weight's component down it, friction up it, and the normal
// reaction.
//
// Everything drawn is read from js/core/slide.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, unview, stroke } from './util.js';
import { skyscape, fitSide, env, paper, interior, water, rng, softShadow, grass } from './scenery.js';
import { bigSplash } from './heights.js';
import { pulse, ageOf, flash } from './effects.js';
import { T, num } from '../notation.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2;
// as the HUD prints them, to 2 dp — but a value under 0.1 to 3 s.f., never a false 0
const s3 = (x) => (Math.abs(x) >= 0.1 || x === 0 ? num(x, Math.abs(x) >= 1000 ? 0 : 2) : num(Number(x.toPrecision(3)), 6, { trim: true }));

/** A lifeboat's hull, side on, keel along y = 0, L px long, bow towards +x. */
export function lifeboatHull(L) {
  const hull = new Path2D();
  hull.moveTo(-L * 0.5, -L * 0.2); hull.lineTo(L * 0.42, -L * 0.2); hull.quadraticCurveTo(L * 0.56, -L * 0.2, L * 0.5, -L * 0.04);
  hull.quadraticCurveTo(L * 0.38, 0, L * 0.1, 0); hull.lineTo(-L * 0.42, 0); hull.quadraticCurveTo(-L * 0.5, 0, -L * 0.5, -L * 0.1); hull.closePath();
  return hull;
}

/** A lifeboat side on, keel along y = 0, L px long, bow towards +x: a dark
    hull below the rubbing strake, a bright upper hull, a white wheelhouse
    with windows and a mast. */
export function lifeboat(g, L) {
  const E = env();
  g.save();
  // the hull: a deep curve, the bow raked up, the stern square
  const hull = lifeboatHull(L);
  g.fillStyle = E.night ? '#1d2a44' : '#22355e'; g.fill(hull);
  g.save(); g.clip(hull);
  g.fillStyle = E.night ? '#b8561f' : '#e8732a'; g.fillRect(-L, -L * 0.2, L * 2, L * 0.09);
  g.fillStyle = withAlpha('#ffffff', 0.18); g.fillRect(-L, -L * 0.2, L * 2, L * 0.02);
  g.restore();
  g.strokeStyle = '#11182a'; g.lineWidth = 1.2; g.stroke(hull);
  // the keel
  g.fillStyle = '#11182a'; g.fillRect(-L * 0.36, -L * 0.012, L * 0.5, L * 0.03);
  // the wheelhouse, windows, the mast with its light
  g.fillStyle = E.night ? '#d9dde3' : '#f5f6f8'; g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.roundRect?.(-L * 0.22, -L * 0.38, L * 0.36, L * 0.18, 3); g.fill(); g.stroke();
  g.fillStyle = E.night ? '#3d5873' : '#2d4a66';
  for (let i = 0; i < 4; i++) g.fillRect(-L * 0.19 + i * L * 0.08, -L * 0.34, L * 0.055, L * 0.05);
  g.strokeStyle = '#2b2f36'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-L * 0.08, -L * 0.38); g.lineTo(-L * 0.08, -L * 0.52); g.stroke();
  g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(-L * 0.08, -L * 0.53, 2.2, 0, TAU); g.fill();
  // a guard rail along the deck
  g.strokeStyle = withAlpha('#e8eaee', 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(-L * 0.48, -L * 0.25); g.lineTo(L * 0.4, -L * 0.25); g.stroke();
  for (let x = -0.46; x < 0.4; x += 0.12) { g.beginPath(); g.moveTo(L * x, -L * 0.25); g.lineTo(L * x, -L * 0.2); g.stroke(); }
  g.restore();
}

/** A clay pantile, side on, lying on y = 0, L px long, its upper end at −x:
    an S-curved top edge, a nib hooked over the batten at its upper end, a
    darker underside — lighter than the roof it lies on, so the loose one reads. */
export function roofTile(g, L) {
  const E = env(), H = L * 0.16;
  g.save();
  g.fillStyle = withAlpha('#000000', 0.35); g.beginPath(); g.roundRect?.(-L * 0.48, -H * 0.2, L, H * 0.45, 2); g.fill();
  const top = new Path2D();
  top.moveTo(-L * 0.5, 0); top.lineTo(-L * 0.5, -H);
  for (let i = 0; i <= 12; i++) { const x = -L * 0.5 + (L * i) / 12; top.lineTo(x, -H - Math.sin((i / 12) * Math.PI * 2) * H * 0.35); }
  top.lineTo(L * 0.5, 0); top.closePath();
  const gr = g.createLinearGradient(0, -H * 1.4, 0, 0); gr.addColorStop(0, E.night ? '#d08055' : '#f29a68'); gr.addColorStop(1, E.night ? '#a85a38' : '#d06a3e');
  g.fillStyle = gr; g.fill(top);
  g.fillStyle = withAlpha('#5a1e0c', 0.55); g.fillRect(-L * 0.5, -H * 0.3, L, H * 0.3);
  g.strokeStyle = '#3a1208'; g.lineWidth = 1.6; g.stroke(top);
  // the nib at its upper end, hooked down
  g.fillStyle = E.night ? '#8a4a2e' : '#b85a34'; g.fillRect(-L * 0.5, 0, L * 0.07, H * 0.5); g.strokeRect(-L * 0.5, 0, L * 0.07, H * 0.5);
  g.fillStyle = withAlpha('#ffffff', 0.35); g.fillRect(-L * 0.44, -H * 0.95, L * 0.86, 1.5);
  g.restore();
}

/** A wooden block, side on, resting on y = 0, L px long, with its grain. */
export function woodBlock(g, L) {
  g.save();
  const H = L * 0.6, gr = g.createLinearGradient(0, -H, 0, 0); gr.addColorStop(0, '#d9a066'); gr.addColorStop(1, '#a8703e');
  g.fillStyle = gr; g.beginPath(); g.roundRect?.(-L / 2, -H, L, H, 3); g.fill();
  g.strokeStyle = 'rgba(70,40,10,0.55)'; g.lineWidth = 1; g.stroke();
  g.strokeStyle = 'rgba(90,55,20,0.35)';
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-L / 2 + 3, -H * i / 4); g.bezierCurveTo(-L * 0.1, -H * i / 4 - 3, L * 0.1, -H * i / 4 + 3, L / 2 - 3, -H * i / 4); g.stroke(); }
  // a hook on its side, as lab blocks have
  g.strokeStyle = '#8b8f96'; g.lineWidth = 1.6; g.beginPath(); g.arc(L / 2 + 3, -H / 2, 3, -Math.PI / 2, Math.PI / 2); g.stroke();
  g.restore();
}

/** A lifeboat station's boathouse whose doors open at (x, y) on the slipway's top, H px tall. */
function boathouse(g, x, y, H) {
  const E = env(), W = H * 1.5;
  g.save();
  const wall = g.createLinearGradient(x - W, 0, x, 0); wall.addColorStop(0, E.night ? '#8c8a86' : '#ebe6dc'); wall.addColorStop(1, E.night ? '#6e6c69' : '#cfc8bb');
  g.fillStyle = wall; g.fillRect(x - W, y - H, W, H);
  // the pitched roof, slate grey, with its ridge
  g.fillStyle = E.night ? '#3b4048' : '#59606b'; g.beginPath(); g.moveTo(x - W - 8, y - H); g.lineTo(x - W / 2, y - H - H * 0.45); g.lineTo(x + 8, y - H); g.closePath(); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1;
  for (let i = 1; i < 5; i++) { const yy = y - H - H * 0.45 * (i / 5); g.beginPath(); g.moveTo(x - W / 2 - (W / 2 + 8) * (1 - i / 5), yy); g.lineTo(x - W / 2 + (W / 2 + 8) * (1 - i / 5), yy); g.stroke(); }
  // the big doors, open, dark inside; a small window and a flagpole
  g.fillStyle = E.night ? '#141414' : '#2a2a2c'; g.fillRect(x - H * 0.7, y - H * 0.78, H * 0.62, H * 0.78);
  g.strokeStyle = E.night ? '#7a2a1d' : '#b2402b'; g.lineWidth = 3; g.strokeRect(x - H * 0.7, y - H * 0.78, H * 0.62, H * 0.78);
  g.fillStyle = E.night ? '#e9cf7a' : '#9fc3dc'; g.fillRect(x - W + H * 0.18, y - H * 0.7, H * 0.22, H * 0.2);
  g.strokeStyle = '#6b6f76'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - W + H * 0.1, y - H); g.lineTo(x - W + H * 0.1, y - H * 1.75); g.stroke();
  g.fillStyle = '#e8732a'; g.beginPath(); g.moveTo(x - W + H * 0.1, y - H * 1.75); g.lineTo(x - W + H * 0.42, y - H * 1.66); g.lineTo(x - W + H * 0.1, y - H * 1.57); g.closePath(); g.fill();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'slide') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const compact = phone || h < 300 || w < 700;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);
  const look = f.look, done = fired && t >= f.tMax - 1e-9;

  // ── the slope in its own plane: let go at the top (0, H), the end of the run at the foot (D, 0)
  const al = f.alpha * D2R, S = f.s, D = S * Math.cos(al), H = S * Math.sin(al), ca = Math.cos(al), sa = Math.sin(al);
  const cardW = compact || f.W == null ? 0 : 262, cardH = 150;
  // the object's size on screen, for each place
  const size = (k) => (look === 'slipway' ? clamp(S * k * 0.27, phone ? 40 : 70, 170) : look === 'roof' ? clamp(S * k * 0.24, phone ? 26 : 50, 80) : clamp(S * k * 0.15, phone ? 22 : 34, 58));
  // room round the run for the place, and past each end for the object, its arrow and its label (in px, so two passes)
  const base = look === 'slipway' ? { xLo: -S * 0.3, xHi: D + S * 0.12, yLo: -S * 0.06, yHi: H + S * 0.24 }
    // the roof's far slope mirrors the near one about the ridge: the whole house in frame
    : look === 'roof' ? { xLo: -(D + S * 0.44 * ca) - S * 0.06, xHi: D + S * 0.12, yLo: -Math.max(S * 0.9, 2.6), yHi: H + S * 0.5 }
      : { xLo: -S * 0.12, xHi: D + S * 0.12, yLo: -S * 0.4, yHi: H + S * 0.3 };
  const area = { left: phone ? 14 : HB[0].w + 20, right: w - (cardW ? cardW + 30 : 14), top: HB[0].h * (phone ? 1 : 0.55), bottom: h - (compact && f.W != null ? 50 : 26) };
  const sky = look === 'slipway' ? 0.35 : 0.6;
  let fit = fitSide(base, area, { sky });
  for (let pass = 0; pass < 2; pass++) {
    const Lp = size(fit.k), box = { ...base, xLo: base.xLo - (Lp * 0.6) / fit.k, xHi: base.xHi + (Lp * 0.6 + (phone ? 90 : 170)) / fit.k };
    fit = fitSide(box, area, { sky });
  }
  const { k, X, Y } = fit, Lb = size(k);
  const along = (dd) => ({ x: X(dd * ca), y: Y(H - dd * sa) });
  const top = along(0), foot = along(S), ext = (Lb * 0.55) / k;
  const nx = -sa, ny = ca;                 // the normal into the ground, on screen
  // the card's place is kept from the labels; the run's ends from the object
  if (cardW) L.reserve({ x: w - cardW - 16, y: h - cardH - 16, w: cardW, h: cardH });

  // ── the place
  const r = rng(look === 'roof' ? 11 : look === 'slipway' ? 29 : 5);
  const stars = (y1) => { if (!E.night) return; const q = rng(77); g.fillStyle = withAlpha('#ffffff', 0.8); for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(q() * w, q() * y1 * 0.8, 0.6 + q() * 0.8, 0, TAU); g.fill(); } };
  let seaY = null, doorFrame = null, stopAt = null;
  if (look === 'slipway') {
    // the last part of the slipway runs under the water
    seaY = along(S * 0.82).y;
    skyscape(g, 0, 0, w, seaY, { seed: 29, far: 'hills', sun: false }); stars(seaY);
    water(g, -20, w + 20, seaY, h + 20, { phase: t * 1.2 });
    // the headland: lit from the top, a jagged cliff face down into the sea, strata following it
    const edgeX = top.x + (foot.x - top.x) * 0.22;
    const face = []; for (let y = top.y - 6, i = 0; y < h + 20; y += 9, i++) face.push({ x: edgeX + (r() - 0.5) * 10 + (y - top.y) * 0.08, y });
    const rockG = g.createLinearGradient(0, top.y, 0, h); rockG.addColorStop(0, E.night ? '#6a5e55' : '#a8998a'); rockG.addColorStop(1, E.night ? '#3a3134' : '#6a5e55');
    const above = face.filter((p) => p.y <= seaY + 4), cliffX = above.length ? above[above.length - 1].x : edgeX;
    // under the water: the rock goes on, dimmed, under a translucent sea
    const drowned = new Path2D(); drowned.moveTo(-20, seaY); drowned.lineTo(cliffX, seaY); for (const p of face) if (p.y > seaY) drowned.lineTo(p.x, p.y); drowned.lineTo(-20, h + 20); drowned.closePath();
    g.fillStyle = withAlpha(E.night ? '#2a2427' : '#5a5048', 0.9); g.fill(drowned);
    g.fillStyle = withAlpha(E.night ? '#16324a' : '#3f7ea6', 0.6); g.fill(drowned);
    g.fillStyle = rockG; g.beginPath(); g.moveTo(-20, seaY + 4); g.lineTo(-20, top.y - 6); for (const p of above) g.lineTo(p.x, p.y); g.lineTo(cliffX, seaY + 4); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.22); g.lineWidth = 1.2;
    for (let i = 1; i < 5; i++) { const yy = top.y + (seaY - top.y) * (i / 5) + 6; g.beginPath(); g.moveTo(-20, yy + (r() - 0.5) * 6); g.lineTo(edgeX + (yy - top.y) * 0.08, yy); g.stroke(); }
    g.strokeStyle = withAlpha('#ffffff', 0.12); g.beginPath(); for (const p of above) g.lineTo(p.x - 2, p.y); g.stroke();
    // wet on the cliff face just above the water, and foam lapping its foot
    g.fillStyle = withAlpha(E.night ? '#1a1d22' : '#3a3f3a', 0.5); g.fillRect(cliffX - 14, seaY - 10, 16, 12);
    g.strokeStyle = withAlpha('#ffffff', 0.75); g.lineWidth = 2; g.beginPath();
    for (let x = cliffX - 30; x < cliffX + 12; x += 4) g.lineTo(x, seaY + 1 + Math.sin(x * 0.3 + t * 4) * 1.5); g.stroke();
    // turf along the top, tufted
    grass(g, -20, edgeX + 4, top.y - 8, top.y - 2, { seed: 4 });
    // the slipway: piles with cross-bracing, weed below the tide line, a deck with two keelway rails
    const from = along(-ext * 1.1), past = along(S * 1.1);
    const piles = []; for (let dd = S * 0.15; dd < S * 1.1; dd += Math.max(S * 0.08, 20 / k)) piles.push(along(dd));
    for (const p of piles) { g.fillStyle = E.night ? '#3a3330' : '#5c4c40'; g.fillRect(p.x - 3, p.y + 6, 6, Math.max(0, seaY + 40 - p.y)); }
    g.strokeStyle = E.night ? '#4a403a' : '#6e5c4e'; g.lineWidth = 2;
    for (let i = 0; i + 1 < piles.length; i++) { const a = piles[i], b = piles[i + 1], lo = Math.min(seaY + 30, Math.max(a.y, b.y) + 40); g.beginPath(); g.moveTo(a.x, a.y + 8); g.lineTo(b.x, lo); g.moveTo(b.x, b.y + 8); g.lineTo(a.x, lo); g.stroke(); }
    g.fillStyle = withAlpha(E.night ? '#2d4a2d' : '#4f7a3a', 0.75); for (const p of piles) if (p.y + 6 < seaY + 30) g.fillRect(p.x - 3.5, Math.max(p.y + 6, seaY - 6), 7, 14);
    g.save(); g.lineCap = 'butt';
    g.strokeStyle = E.night ? '#77706f' : '#c9c2b8'; g.lineWidth = 12; g.beginPath(); g.moveTo(from.x, from.y + 2); g.lineTo(past.x, past.y + 2); g.stroke();
    g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1.5; g.beginPath(); g.moveTo(from.x, from.y + 8); g.lineTo(past.x, past.y + 8); g.stroke();
    g.strokeStyle = E.night ? '#5b5f66' : '#7d838c'; g.lineWidth = 2;
    for (const off of [-2, 2]) { g.beginPath(); g.moveTo(from.x + nx * off, from.y - 4 + ny * off); g.lineTo(past.x + nx * off, past.y - 4 + ny * off); g.stroke(); }
    g.restore();
    // the boathouse: its doors where the boat starts, so it rolls out of the house
    const bH = clamp(Lb * 0.9, 50, 130), dx = top.x - Lb * 0.5;
    boathouse(g, dx + bH * 0.35, top.y - 2, bH);
    L.reserve({ x: dx + bH * 0.35 - bH * 1.5 - 8, y: top.y - 2 - bH * 1.8, w: bH * 1.5 + 16, h: bH * 1.8 });
    doorFrame = { x: dx + bH * 0.35 - bH * 0.7, y: top.y - 2 - bH * 0.78, w: bH * 0.62, h: bH * 0.78 };
  } else if (look === 'roof') {
    const ground = Y(-Math.max(S * 0.75, 2.4));
    skyscape(g, 0, 0, w, ground, { seed: 11, far: 'trees', sun: true }); stars(ground);
    grass(g, -20, w + 20, ground, h + 20);
    const ridge = along(-S * 0.22), back = { x: ridge.x - (foot.x - ridge.x), y: foot.y };
    const wallG = g.createLinearGradient(back.x, 0, foot.x, 0); wallG.addColorStop(0, E.night ? '#8f7f6f' : '#e8d9c4'); wallG.addColorStop(1, E.night ? '#776a5d' : '#d5c3aa');
    g.fillStyle = wallG; g.fillRect(back.x + 6, foot.y, foot.x - back.x - 12, ground - foot.y);
    g.strokeStyle = withAlpha('#000000', 0.08); g.lineWidth = 1;
    for (let yy = foot.y + 8, row = 0; yy < ground; yy += 8, row++) { g.beginPath(); g.moveTo(back.x + 6, yy); g.lineTo(foot.x - 6, yy); g.stroke();
      for (let x = back.x + 6 + (row % 2) * 9; x < foot.x - 6; x += 18) { g.beginPath(); g.moveTo(x, yy - 8); g.lineTo(x, yy); g.stroke(); } }
    const wW = (foot.x - back.x) * 0.16, wH = (ground - foot.y) * 0.32;
    for (const fx of [0.22, 0.62]) {
      const wx = back.x + (foot.x - back.x) * fx, wy = foot.y + (ground - foot.y) * 0.22;
      g.fillStyle = E.night ? '#e9cf7a' : '#a8c8de'; g.fillRect(wx, wy, wW, wH);
      g.strokeStyle = '#f4f1ea'; g.lineWidth = 2.4; g.strokeRect(wx, wy, wW, wH); g.beginPath(); g.moveTo(wx + wW / 2, wy); g.lineTo(wx + wW / 2, wy + wH); g.stroke();
      g.fillStyle = '#efe6da'; g.fillRect(wx - 3, wy + wH, wW + 6, 3);
    }
    g.fillStyle = E.night ? '#4b2d22' : '#6b3a26'; g.fillRect(back.x + (foot.x - back.x) * 0.44, ground - (ground - foot.y) * 0.62, (foot.x - back.x) * 0.1, (ground - foot.y) * 0.62);
    // the roof: tiled in courses with staggered joints, a ridge cap, a chimney
    g.fillStyle = E.night ? '#6e3222' : '#a64a30'; g.beginPath(); g.moveTo(back.x - 4, back.y + 2); g.lineTo(ridge.x, ridge.y - 3); g.lineTo(foot.x + 4, foot.y + 2); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#3a1208', 0.45); g.lineWidth = 1;
    const courses = Math.max(4, Math.round((foot.y - ridge.y) / 7));
    for (let i = 1; i < courses; i++) {
      const u = i / courses, a = { x: ridge.x - (ridge.x - back.x) * u, y: ridge.y + (back.y - ridge.y) * u }, b = { x: ridge.x + (foot.x - ridge.x) * u, y: ridge.y + (foot.y - ridge.y) * u };
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    // the joints between tiles: short uprights across each course, every 14 px, staggered course to course
    for (let i = 1; i <= courses; i++) {
      const u0 = (i - 1) / courses, u1 = i / courses, y0 = ridge.y + (foot.y - ridge.y) * u0, y1 = ridge.y + (foot.y - ridge.y) * u1;
      const xl = ridge.x - (ridge.x - back.x) * u1, xr = ridge.x + (foot.x - ridge.x) * u1;
      for (let x = xl + 4 + (i % 2) * 7; x < xr - 4; x += 14) {
        // only inside the roof's triangle at this course's top edge
        const half = (ridge.x - back.x) * u0; if (Math.abs(x - ridge.x) > half) continue;
        g.beginPath(); g.moveTo(x, y0 + 1); g.lineTo(x, y1 - 1); g.stroke();
      }
    }
    g.fillStyle = E.night ? '#4a2318' : '#7a3220'; g.beginPath(); g.ellipse(ridge.x, ridge.y - 2, 9, 4, 0, 0, TAU); g.fill();
    const ch = { x: ridge.x - (ridge.x - back.x) * 0.45, y: ridge.y + (back.y - ridge.y) * 0.45 };
    g.fillStyle = E.night ? '#6b4a3d' : '#9b5b45'; g.fillRect(ch.x - 8, ch.y - (foot.y - ridge.y) * 0.55, 16, (foot.y - ridge.y) * 0.55);
    g.fillStyle = '#4a3a33'; g.fillRect(ch.x - 10, ch.y - (foot.y - ridge.y) * 0.55 - 4, 20, 5);
    // the eaves: a fascia board, a half-round gutter with its highlight, a downpipe to the ground
    g.fillStyle = E.night ? '#d9d4ca' : '#f4f1ea'; g.save(); g.translate(foot.x, foot.y); g.rotate(al); g.fillRect(-26, 0, 30, 6); g.restore();
    const gx = foot.x + 2, gy = foot.y + 4;
    g.fillStyle = E.night ? '#8a9098' : '#5d636b'; g.beginPath(); g.arc(gx + 6, gy, 7, 0, Math.PI); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#ffffff', 0.5); g.lineWidth = 1.2; g.beginPath(); g.arc(gx + 6, gy, 5, 0.2, Math.PI * 0.7); g.stroke();
    g.fillStyle = E.night ? '#8a9098' : '#5d636b'; g.fillRect(foot.x - 10, gy + 5, 5, ground - gy - 5); g.fillRect(foot.x - 12, ground - 6, 9, 6);
    softShadow(g, (back.x + foot.x) / 2, ground + 1, (foot.x - back.x) * 0.55, 6, 0.6);
  } else {
    // the lab: a wall, a bench with its cabinets, the wedge, a clamp stand and a protractor
    interior(g, 0, 0, w, h, {});
    const bench = Y(-S * 0.04);
    g.fillStyle = E.night ? '#3e3a37' : '#4a4643'; g.fillRect(-20, bench, w + 40, 14);
    g.fillStyle = withAlpha('#ffffff', 0.25); g.fillRect(-20, bench, w + 40, 2);
    g.fillStyle = E.night ? '#5b4636' : '#8a6a4c'; g.fillRect(-20, bench + 14, w + 40, h);
    g.fillStyle = withAlpha('#000000', 0.25); g.fillRect(-20, h - 14, w + 40, 14);
    const dw = 110;
    for (let x = -10; x < w; x += dw) {
      g.strokeStyle = withAlpha('#000000', 0.35); g.lineWidth = 1.5; g.strokeRect(x + 6, bench + 22, dw - 12, h - bench - 44);
      g.fillStyle = E.night ? '#b9bec5' : '#d9dde2'; g.fillRect(x + dw / 2 - 10, bench + 30, 20, 4);
    }
    const apex = along(-ext), stop = along(S + ext * 0.9); stopAt = stop;
    const toe = { x: stop.x + 8 };
    const wood = g.createLinearGradient(apex.x, apex.y, apex.x, bench); wood.addColorStop(0, '#d9a066'); wood.addColorStop(1, '#9b6534');
    g.fillStyle = wood; g.beginPath(); g.moveTo(apex.x - 6, apex.y); g.lineTo(stop.x, stop.y); g.lineTo(toe.x, stop.y); g.lineTo(toe.x, bench); g.lineTo(apex.x - 6, bench); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,45,15,0.45)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = 'rgba(90,55,20,0.25)';
    for (let i = 1; i < 6; i++) { const yy = apex.y + (bench - apex.y) * i / 6; g.beginPath(); g.moveTo(apex.x - 4, yy); g.lineTo(apex.x - 4 + (stop.x - apex.x) * (i / 6), yy); g.stroke(); }
    // the rubber stop at the end of the run
    g.save(); g.translate(stop.x, stop.y); g.rotate(al); g.fillStyle = '#2b2b2b'; g.beginPath(); g.roundRect?.(-2, -12, 8, 12, 2); g.fill(); g.restore();
    // a clamp stand behind the wedge, and a protractor leaning on it
    const sx = apex.x - 40;
    if (sx > 20) {
      g.fillStyle = '#5b5f66'; g.fillRect(sx - 18, bench - 5, 36, 5); g.fillStyle = '#9aa0a8'; g.fillRect(sx - 1.5, apex.y - 40, 3, bench - apex.y + 35);
      g.fillStyle = '#6b7078'; g.fillRect(sx - 2, apex.y - 10, 18, 5);
    }
    const pr = clamp((bench - apex.y) * 0.35, 18, 40), px = stop.x + Math.max(clamp(k * S * 0.28, 40, 110), Lb * 1.15) * 0.4 + pr + 30;
    if (px + pr < w - 10) { g.fillStyle = withAlpha('#e8f2ff', 0.55); g.strokeStyle = withAlpha('#4a6a8a', 0.8); g.lineWidth = 1; g.beginPath(); g.arc(px, bench, pr, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
      for (let i = 1; i < 9; i++) { const aa = Math.PI + (i / 9) * Math.PI; g.beginPath(); g.moveTo(px + Math.cos(aa) * pr, bench + Math.sin(aa) * pr); g.lineTo(px + Math.cos(aa) * pr * 0.85, bench + Math.sin(aa) * pr * 0.85); g.stroke(); } }
    softShadow(g, (apex.x + toe.x) / 2, bench + 1, (toe.x - apex.x) * 0.55, 5, 0.6);
  }

  // ── where it was let go: a small post on the surface, its words above and behind it
  // upright, planted just behind where the object starts, not across its run
  { const p = along(-(Lb * 0.6) / k), hP = Lb * 0.8;
    g.strokeStyle = P.ink; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y - hP); g.stroke();
    g.fillStyle = P.mark; g.beginPath(); g.moveTo(p.x, p.y - hP); g.lineTo(p.x + 13, p.y - hP + 5); g.lineTo(p.x, p.y - hP + 10); g.closePath(); g.fill();
    L.reserve({ x: p.x - 3, y: p.y - hP, w: 17, h: hP });
    L.add('let go from rest', p.x - 6, p.y - hP - 4, { color: P.ink, pri: 10, size: 13, weight: 700, align: 'right', maxPush: 30 }); }

  // ── the angle at the foot, with its arc, its label inside it on the bisector
  { const R = Math.max(clamp(k * S * 0.28, 40, 110), Lb * 1.15);
    g.strokeStyle = P.ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(foot.x, foot.y); g.lineTo(foot.x - R * 1.2, foot.y); g.stroke();
    g.beginPath(); g.arc(foot.x, foot.y, R, Math.PI, Math.PI + al); g.stroke();
    const bis = Math.PI + al / 2;
    // at the end the object sits over the inside of the arc: the label goes just outside it
    const rr = done ? R * 1.2 : R * 0.72;
    L.add(`${num(f.alpha, 2, { trim: true })}°`, foot.x + Math.cos(bis) * rr, foot.y + Math.sin(bis) * rr, { color: P.ink, pri: 10, size: 14, weight: 700, maxPush: 10 }); }

  // ── the run, marked under the slope, further out than the acceleration arrow
  { const off = look === 'slipway' ? 58 : -(Lb * 0.75 + 18), a0 = { x: top.x + nx * off, y: top.y + ny * off }, a1 = { x: foot.x + nx * off, y: foot.y + ny * off };
    stroke(g, [a0, a1], { color: P.disp, width: 1.6, alpha: 0.9 });
    // the ruler kept from other labels
    for (let i = 0; i <= 4; i++) { const x = a0.x + (a1.x - a0.x) * i / 4, y = a0.y + (a1.y - a0.y) * i / 4; L.reserve({ x: x - 6, y: y - 6, w: 12, h: 12 }); }
    for (const p of [a0, a1]) stroke(g, [{ x: p.x - nx * 6, y: p.y - ny * 6 }, { x: p.x + nx * 6, y: p.y + ny * 6 }], { color: P.disp, width: 1.6 });
    const out = Math.sign(off) * 14;
    L.add(T`${num(f.s, 6, { trim: true })} [m]`, (a0.x + a1.x) / 2 + nx * out, (a0.y + a1.y) / 2 + ny * out, { color: P.disp, pri: 8, size: 14, weight: 700 }); }

  // ── what slides, on its surface; at the end of the roof the tile tips over the gutter
  const dd = f.pos(t), q = along(dd), e = done ? ageOf(t, f.tMax, f.tMax) : null;
  const tip = look === 'roof' && e ? Math.min(1, e.age / e.life) * 35 * D2R : 0;
  g.save();
  if (tip) { g.translate(foot.x, foot.y); g.rotate(al + tip); g.translate(-Lb * 0.05, 0); }
  else { g.translate(q.x, q.y - (look === 'slipway' ? 6 : 0)); g.rotate(al); }
  // the block squashes a pixel or two against the stop
  if (look === 'plane' && e) g.scale(1 - 0.04 * Math.max(0, 1 - e.age / (e.life * 0.4)), 1);
  if (look === 'slipway') lifeboat(g, Lb); else if (look === 'roof') roofTile(g, Lb); else woodBlock(g, Lb);
  g.restore();
  if (tip) { const q2 = rng(9); g.fillStyle = E.night ? '#6b6b4a' : '#5f7a3a'; for (let i = 0; i < 3; i++) { const fall = (e.age / e.life) * (40 + i * 18); g.fillRect(foot.x + 6 + q2() * 10, foot.y + fall, 2.5, 2.5); } }
  // the boat rolls out of its house: the door frame over it
  if (doorFrame) { g.strokeStyle = E.night ? '#7a2a1d' : '#b2402b'; g.lineWidth = 3; g.strokeRect(doorFrame.x, doorFrame.y, doorFrame.w, doorFrame.h); }
  // into the sea: water over the part of the hull below the waterline, a bow wave as it goes in
  if (seaY != null) {
    const front = dd + (Lb * 0.5) / k, wl = S * 0.82 * 0.96;
    if (front > wl) {
      // only over the boat: the water closes over its hull, nothing else is repainted
      g.save(); g.beginPath(); g.rect(-50, seaY, w + 100, h); g.clip();
      g.translate(q.x, q.y - 6); g.rotate(al); g.clip(lifeboatHull(Lb));
      g.fillStyle = withAlpha(E.night ? '#16324a' : '#3f7ea6', 0.45); g.fillRect(-Lb, -Lb, Lb * 2, Lb * 2); g.restore();
      const xs = q.x - Lb * 0.5 * ca, xe = q.x + Lb * 0.5 * ca;
      g.strokeStyle = withAlpha('#ffffff', 0.7); g.lineWidth = 2.5; g.beginPath(); g.moveTo(Math.max(xs, along(S * 0.82).x - 4), seaY); g.lineTo(xe, seaY); g.stroke();
      const u = clamp((front - wl) / (S * 0.18 + (Lb * 0.5) / k), 0, 1), bx = along(Math.min(dd + (Lb * 0.45) / k, S * 1.1)).x;
      g.fillStyle = withAlpha('#ffffff', 0.75);
      for (let i = 0; i < 9; i++) { const aa = Math.PI * (1.1 + i * 0.09); const rr = 6 + u * 22; g.beginPath(); g.arc(bx + Math.cos(aa) * rr, seaY + Math.sin(aa) * rr * 0.8, 1.6 + u * 2, 0, TAU); g.fill(); }
    }
  }
  // the object's own footprint along the slope, kept from labels
  for (let i = -1; i <= 1; i++) { const c = along(dd + (i * Lb * 0.33) / k); L.reserve({ x: c.x - Lb * 0.18, y: c.y - Lb * 0.35, w: Lb * 0.36, h: Lb * 0.35 }); }

  // ── the velocity along the slope, from its front; the acceleration under the slope
  const v = f.vel(t);
  if (show.velocity !== false && v >= 0.05 && (v / f.v) * 100 >= 4 && !done) {
    const ax = q.x + ca * Lb * 0.55 + sa * Lb * 0.35, ay = q.y + sa * Lb * 0.55 - ca * Lb * 0.35, len = Math.min((v / f.v) * 100, done ? 60 : 100);
    arrow(g, ax, ay, ax + ca * len, ay + sa * len, { color: P.vel, width: 2.6, head: Math.min(10, len * 0.6) });
    if (!done) L.add(T`${s3(v)} [m s^-1]`, ax + ca * len + 8, ay + sa * len - 8, { color: P.vel, pri: 8, size: 14, weight: 700, align: 'left' });
  }
  if (!done) {
    const bx = q.x + nx * 26, by = q.y + ny * 26;
    arrow(g, bx, by, bx + ca * 48, by + sa * 48, { color: P.acc, width: 2.2, head: 9 });
    L.add(T`${s3(f.a)} [m s^-2]`, bx + ca * 58, by + sa * 58 + 4, { color: P.acc, pri: 7, size: 13, weight: 700, align: 'left' });
  }

  // ── at the end of the run: into the sea, off the gutter, or against the stop
  if (e) {
    if (look === 'slipway') bigSplash(g, foot.x + Lb * 0.45, seaY + 2, e.age, e.life, clamp(Lb / 70, 0.8, 1.8));
    else if (look === 'plane') flash(g, stopAt.x, stopAt.y - 6, e.age, e.life * 0.6, { radius: 18 });
    else pulse(g, foot.x, foot.y, e.age, e.life, P.mark, { radius: 22 });
    L.add(T`${s3(f.v)} [m s^-1] "after" ${s3(f.t)} [s]`, foot.x, foot.y - Lb * 1.1 - 18, { color: P.mark, pri: 9, size: 13, weight: 700, maxPush: 60 });
    if (look === 'roof') L.add('over the edge of the roof', foot.x, foot.y - Lb * 1.1 - 38, { color: P.mark, pri: 9, size: 13, weight: 700, maxPush: 40 });
  }
  L.draw(g, w, h);

  // ── the forces along the slope: a card, or on a small stage a caption
  if (f.W != null) {
    unview(g);
    // forces to 3 s.f., as the papers give them
    const sf = (x) => num(Number(x.toPrecision(3)), 6, { trim: true });
    const fWord = f.mu === 0 ? 'no friction: a smooth slope' : T`F = mu R = ${sf(f.Fr)} [N] "up the slope"`;
    if (cardW) {
      const cw = cardW, chh = cardH, cx = w - cw - 16, cy = h - chh - 16;
      paper(g, cx, cy, cw, chh);
      const lab = (txt, x, y, col) => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
      lab('Down the slope +', cx + 12, cy + 18, P.muted);
      const big = Math.max(f.W, f.Fr, 1e-9), sc = (cw - 60) / 2 / big, x0 = cx + cw / 2;
      arrow(g, x0, cy + 46, x0 + f.W * sc, cy + 46, { color: P.ink, width: 2.4, head: 9 });
      lab(T`m g sin alpha = ${sf(f.W)} [N] "down the slope"`, cx + 12, cy + 62, P.ink);
      if (f.Fr > 0) arrow(g, x0, cy + 92, x0 - f.Fr * sc, cy + 92, { color: P.ink, width: 2.4, head: 9 });
      lab(fWord, cx + 12, cy + 108, P.ink);
      lab(T`R = m g cos alpha = ${sf(f.N)} [N]`, cx + 12, cy + 134, P.muted);
    } else {
      const parts = [T`m g sin alpha = ${sf(f.W)} [N] "down"`, f.mu === 0 ? 'no friction' : T`F = ${sf(f.Fr)} [N] "up"`, T`R = ${sf(f.N)} [N]`];
      g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
      // one line if it fits, else two: never squeezed below 13 px
      const one = parts.join(', '), lines = g.measureText(one).width + 14 <= w - 20 ? [one] : [parts.slice(0, 2).join(', '), parts[2]];
      const tw = Math.max(...lines.map((x) => g.measureText(x).width)) + 14, bh = 8 + 18 * lines.length;
      g.fillStyle = withAlpha('#101418', 0.78); g.fillRect(10, h - bh - 8, tw, bh);
      g.fillStyle = '#e8eaee'; lines.forEach((x, i) => g.fillText(x, 17, h - bh - 8 + 13 + i * 18)); g.restore();
    }
  }
  return null;
}
