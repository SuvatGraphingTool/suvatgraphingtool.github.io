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
import { pulse, ageOf } from './effects.js';
import { T, num } from '../notation.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const s3 = (x) => num(x, Math.abs(x) < 10 ? 2 : 1, { trim: true });

/** A lifeboat side on, keel along y = 0, L px long, bow towards +x: a dark
    hull below the rubbing strake, a bright upper hull, a white wheelhouse
    with windows and a mast. */
export function lifeboat(g, L) {
  const E = env();
  g.save();
  // the hull: a deep curve, the bow raked up, the stern square
  const hull = new Path2D();
  hull.moveTo(-L * 0.5, -L * 0.2); hull.lineTo(L * 0.42, -L * 0.2); hull.quadraticCurveTo(L * 0.56, -L * 0.2, L * 0.5, -L * 0.04);
  hull.quadraticCurveTo(L * 0.38, 0, L * 0.1, 0); hull.lineTo(-L * 0.42, 0); hull.quadraticCurveTo(-L * 0.5, 0, -L * 0.5, -L * 0.1); hull.closePath();
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

/** A clay roof tile, side on, lying on y = 0, L px long. */
export function roofTile(g, L) {
  const E = env();
  g.save();
  // lighter than the roof it lies on, outlined and shadowed, so the loose one reads
  g.fillStyle = withAlpha('#000000', 0.35); g.beginPath(); g.roundRect?.(-L * 0.48, -L * 0.06, L, L * 0.08, 2); g.fill();
  const gr = g.createLinearGradient(0, -L * 0.24, 0, 0); gr.addColorStop(0, E.night ? '#d08055' : '#f29a68'); gr.addColorStop(1, E.night ? '#a85a38' : '#d06a3e');
  g.fillStyle = gr; g.beginPath(); g.roundRect?.(-L * 0.5, -L * 0.24, L, L * 0.2, 2); g.fill();
  g.strokeStyle = '#3a1208'; g.lineWidth = 1.6; g.stroke();
  g.fillStyle = withAlpha('#ffffff', 0.35); g.fillRect(-L * 0.46, -L * 0.22, L * 0.9, 1.5);
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
  const look = f.look;

  // ── the slope in its own plane: let go at the top (0, H), the end of the run at the foot (D, 0)
  const al = f.alpha * D2R, S = f.s, D = S * Math.cos(al), H = S * Math.sin(al);
  const cardW = compact || f.W == null ? 0 : 262;
  // room round the run for the place: the boathouse behind the top and the sea past the
  // foot; the roof's ridge above the tile and the wall below the eaves; the bench under the wedge
  const box = look === 'slipway' ? { xLo: -S * 0.32, xHi: D + S * 0.28, yLo: -S * 0.1, yHi: H + S * 0.3 }
    : look === 'roof' ? { xLo: -S * 0.5, xHi: D + S * 0.3, yLo: -Math.max(S * 0.9, 2.6), yHi: H + S * 0.5 }
      : { xLo: -S * 0.2, xHi: D + S * 0.3, yLo: -S * 0.32, yHi: H + S * 0.3 };
  const area = { left: phone ? 14 : HB[0].w + 20, right: w - (cardW ? cardW + 30 : 14), top: HB[0].h * (phone ? 1 : 0.55), bottom: h - (compact && f.W != null ? 44 : 26) };
  const { k, X, Y } = fitSide(box, area, { sky: 0.6 });
  const along = (dd) => ({ x: X(dd * Math.cos(al)), y: Y(H - dd * Math.sin(al)) });
  const top = along(0), foot = along(S);

  // ── the place
  if (look === 'slipway') {
    const seaY = foot.y + 4;
    skyscape(g, 0, 0, w, seaY, { seed: 29, far: 'hills', sun: false });
    water(g, -20, w + 20, seaY, h + 20, { phase: t * 1.2 });
    // the headland the station stands on, behind and under the top of the slipway
    const r = rng(7);
    g.fillStyle = E.night ? '#4d4540' : '#8c7d6c'; g.beginPath(); g.moveTo(-20, h + 20); g.lineTo(-20, top.y - 6);
    g.lineTo(top.x + 6, top.y - 6); g.lineTo(top.x + (foot.x - top.x) * 0.25, seaY); g.lineTo(top.x + (foot.x - top.x) * 0.25, h + 20); g.closePath(); g.fill();
    g.fillStyle = E.grass; g.fillRect(-20, top.y - 10, top.x + 26, 5);
    for (let i = 0; i < 14; i++) { g.fillStyle = withAlpha('#000000', 0.12 + r() * 0.1); g.beginPath(); g.ellipse(r() * (top.x + 20), top.y + r() * (h - top.y), 6 + r() * 10, 3 + r() * 4, 0, 0, TAU); g.fill(); }
    // the slipway: a concrete deck on piles, running into the water
    const past = along(S * 1.08);
    for (let dd = S * 0.12; dd < S * 1.08; dd += Math.max(S * 0.09, 18 / k)) {
      const p = along(dd); g.fillStyle = E.night ? '#3a3330' : '#5c4c40'; g.fillRect(p.x - 2.5, p.y + 6, 5, Math.max(0, seaY + 30 - p.y));
    }
    g.save(); g.lineCap = 'butt';
    g.strokeStyle = E.night ? '#77706f' : '#c9c2b8'; g.lineWidth = 10; g.beginPath(); g.moveTo(top.x - 10, top.y + 1); g.lineTo(past.x, past.y + 1); g.stroke();
    g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1.5; g.beginPath(); g.moveTo(top.x - 10, top.y - 4); g.lineTo(past.x, past.y - 4); g.stroke();
    g.strokeStyle = withAlpha('#ffffff', 0.35); g.beginPath(); g.moveTo(top.x - 10, top.y + 5); g.lineTo(past.x, past.y + 5); g.stroke();
    g.restore();
    boathouse(g, top.x - 4, top.y - 4, clamp(S * k * 0.14, 34, 90));
  } else if (look === 'roof') {
    const ground = Y(-Math.max(S * 0.75, 2.4));
    skyscape(g, 0, 0, w, ground, { seed: 11, far: 'trees', sun: true });
    grass(g, -20, w + 20, ground, h + 20);
    // the house: its wall under the eaves, windows, a door; the roof's two slopes from the ridge
    const ridge = along(-S * 0.22), back = { x: ridge.x - (foot.x - ridge.x), y: foot.y };
    const wallG = g.createLinearGradient(back.x, 0, foot.x, 0); wallG.addColorStop(0, E.night ? '#8f7f6f' : '#e8d9c4'); wallG.addColorStop(1, E.night ? '#776a5d' : '#d5c3aa');
    g.fillStyle = wallG; g.fillRect(back.x + 6, foot.y, foot.x - back.x - 12, ground - foot.y);
    g.strokeStyle = withAlpha('#000000', 0.08); g.lineWidth = 1;
    for (let yy = foot.y + 8; yy < ground; yy += 8) { g.beginPath(); g.moveTo(back.x + 6, yy); g.lineTo(foot.x - 6, yy); g.stroke(); }
    const wW = (foot.x - back.x) * 0.16, wH = (ground - foot.y) * 0.32;
    for (const fx of [0.22, 0.62]) {
      const wx = back.x + (foot.x - back.x) * fx, wy = foot.y + (ground - foot.y) * 0.22;
      g.fillStyle = E.night ? '#e9cf7a' : '#a8c8de'; g.fillRect(wx, wy, wW, wH);
      g.strokeStyle = '#f4f1ea'; g.lineWidth = 2.4; g.strokeRect(wx, wy, wW, wH); g.beginPath(); g.moveTo(wx + wW / 2, wy); g.lineTo(wx + wW / 2, wy + wH); g.stroke();
    }
    g.fillStyle = E.night ? '#4b2d22' : '#6b3a26'; g.fillRect(back.x + (foot.x - back.x) * 0.44, ground - (ground - foot.y) * 0.62, (foot.x - back.x) * 0.1, (ground - foot.y) * 0.62);
    // the roof, tiled in courses, with a chimney and a gutter at the eaves
    g.fillStyle = E.night ? '#6e3222' : '#a64a30'; g.beginPath(); g.moveTo(back.x - 4, back.y + 2); g.lineTo(ridge.x, ridge.y - 3); g.lineTo(foot.x + 4, foot.y + 2); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#3a1208', 0.45); g.lineWidth = 1;
    const courses = Math.max(4, Math.round((foot.y - ridge.y) / 7));
    for (let i = 1; i < courses; i++) { const u = i / courses; g.beginPath(); g.moveTo(ridge.x - (ridge.x - back.x) * u, ridge.y + (back.y - ridge.y) * u); g.lineTo(ridge.x + (foot.x - ridge.x) * u, ridge.y + (foot.y - ridge.y) * u); g.stroke(); }
    const ch = { x: ridge.x - (ridge.x - back.x) * 0.45, y: ridge.y + (back.y - ridge.y) * 0.45 };
    g.fillStyle = E.night ? '#6b4a3d' : '#9b5b45'; g.fillRect(ch.x - 8, ch.y - (foot.y - ridge.y) * 0.55, 16, (foot.y - ridge.y) * 0.55);
    g.fillStyle = '#4a3a33'; g.fillRect(ch.x - 10, ch.y - (foot.y - ridge.y) * 0.55 - 4, 20, 5);
    g.fillStyle = E.night ? '#9aa0a8' : '#6d737b'; g.beginPath(); g.roundRect?.(foot.x - 2, foot.y - 1, 9, 6, 2); g.fill();
    softShadow(g, (back.x + foot.x) / 2, ground + 1, (foot.x - back.x) * 0.55, 6, 0.6);
  } else {
    // the lab: a wall, a bench top, the wedge
    interior(g, 0, 0, w, h, {});
    const bench = Y(-S * 0.04);
    const benchG = g.createLinearGradient(0, bench, 0, bench + 14); benchG.addColorStop(0, E.night ? '#3e3a37' : '#4a4643'); benchG.addColorStop(1, E.night ? '#2a2725' : '#34312f');
    g.fillStyle = benchG; g.fillRect(-20, bench, w + 40, 14);
    g.fillStyle = E.night ? '#5b4636' : '#8a6a4c'; g.fillRect(-20, bench + 14, w + 40, h);
    const back = { x: top.x, y: bench }, toe = { x: foot.x + 6, y: bench };
    const wood = g.createLinearGradient(top.x, top.y, top.x, bench); wood.addColorStop(0, '#d9a066'); wood.addColorStop(1, '#9b6534');
    g.fillStyle = wood; g.beginPath(); g.moveTo(back.x - 8, top.y); g.lineTo(foot.x, foot.y); g.lineTo(toe.x, foot.y); g.lineTo(toe.x, bench); g.lineTo(back.x - 8, bench); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,45,15,0.45)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = 'rgba(90,55,20,0.25)';
    for (let i = 1; i < 6; i++) { const yy = top.y + (bench - top.y) * i / 6; g.beginPath(); g.moveTo(back.x - 6, yy); g.lineTo(back.x - 6 + (foot.x - back.x) * (i / 6), yy); g.stroke(); }
    // a rubber stop at the foot
    g.fillStyle = '#2b2b2b'; g.beginPath(); g.roundRect?.(foot.x - 2, foot.y - 9, 8, 9, 2); g.fill();
    softShadow(g, (back.x + toe.x) / 2, bench + 1, (toe.x - back.x) * 0.55, 5, 0.6);
  }

  // ── the angle at the foot, with its arc (the horizontal under the run's end)
  { const R = clamp(k * S * 0.28, 40, 110);
    g.strokeStyle = P.ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(foot.x, foot.y); g.lineTo(foot.x - R * 1.2, foot.y); g.stroke();
    g.beginPath(); g.arc(foot.x, foot.y, R, Math.PI, Math.PI + al); g.stroke();
    L.add(`${num(f.alpha, 2, { trim: true })}°`, foot.x - R * 0.8, foot.y + 18, { color: P.ink, pri: 9, size: 14, weight: 700 }); }

  // ── the run, marked beside the slope: let go at the top, the distance along it,
  // under the slope, square to it: clear of what slides on top
  { const nx = -Math.sin(al), ny = Math.cos(al), off = 26;
    const a0 = { x: top.x + nx * off, y: top.y + ny * off }, a1 = { x: foot.x + nx * off, y: foot.y + ny * off };
    stroke(g, [a0, a1], { color: P.disp, width: 1.6, alpha: 0.9 });
    for (const p of [a0, a1]) stroke(g, [{ x: p.x - nx * 6, y: p.y - ny * 6 }, { x: p.x + nx * 6, y: p.y + ny * 6 }], { color: P.disp, width: 1.6 });
    L.add(T`${s3(f.s)} [m]`, (a0.x + a1.x) / 2 + nx * 14, (a0.y + a1.y) / 2 + ny * 14, { color: P.disp, pri: 8, size: 14, weight: 700 });
    L.add('let go from rest', top.x, top.y + ny * (off + 22), { color: P.ink, pri: 6, size: 13, weight: 700 }); }

  // ── what slides, square to the slope, on its surface
  const dd = f.pos(t), q = along(dd), Lb = look === 'slipway' ? clamp(S * k * 0.27, 70, 170) : look === 'roof' ? clamp(S * k * 0.22, 36, 64) : clamp(S * k * 0.14, 30, 56);
  g.save(); g.translate(q.x, q.y - (look === 'slipway' ? 5 : 0)); g.rotate(al);
  if (look === 'slipway') lifeboat(g, Lb); else if (look === 'roof') roofTile(g, Lb); else woodBlock(g, Lb);
  g.restore();
  L.reserve({ x: q.x - Lb * 0.6, y: q.y - Lb * 0.6, w: Lb * 1.2, h: Lb * 0.6 });

  // ── the velocity along the slope, from its front; the acceleration under the slope
  const ux = Math.cos(al), uy = Math.sin(al), v = f.vel(t);
  if (show.velocity !== false && v >= 0.05 && (v / f.v) * 100 >= 4) {
    const ax = q.x + ux * Lb * 0.55 + uy * Lb * 0.35, ay = q.y + uy * Lb * 0.55 - ux * Lb * 0.35, len = Math.min((v / f.v) * 100, 100);
    arrow(g, ax, ay, ax + ux * len, ay + uy * len, { color: P.vel, width: 2.6, head: Math.min(10, len * 0.6) });
    L.add(T`${s3(v)} [m s^-1]`, ax + ux * len + 8, ay + uy * len - 8, { color: P.vel, pri: 8, size: 14, weight: 700, align: 'left' });
  }
  // the acceleration is what the forces make: always shown while it slides
  if (t < f.tMax - 1e-9 || !fired) {
    const bx = q.x - uy * 26, by = q.y + ux * 26;
    arrow(g, bx, by, bx + ux * 48, by + uy * 48, { color: P.acc, width: 2.2, head: 9 });
    L.add(T`${s3(f.a)} [m s^-2]`, bx + ux * 24 - uy * 16, by + uy * 24 + ux * 16, { color: P.acc, pri: 7, size: 13, weight: 700 });
  }

  // ── at the end of the run: into the sea, off the gutter, or against the stop
  if (fired && t >= f.tMax - 1e-9) {
    const e = ageOf(t, f.tMax, f.tMax);
    if (look === 'slipway') bigSplash(g, foot.x + Lb * 0.4, foot.y + 4, e.age, e.life, clamp(Lb / 70, 0.8, 1.8));
    else pulse(g, foot.x, foot.y, e.age, e.life, P.mark, { radius: 28 });
    L.add(T`${s3(f.v)} [m s^-1] "after" ${s3(f.t)} [s]`, foot.x, foot.y - Lb * 0.9 - 14, { color: P.mark, pri: 9, size: 13, weight: 700, maxPush: 60 });
    if (look === 'roof') L.add('at the edge of the roof', foot.x, foot.y - Lb * 0.9 - 34, { color: P.mark, pri: 7, size: 13, weight: 700, maxPush: 40 });
  }
  L.draw(g, w, h);

  // ── the forces along the slope: a card, or on a small stage a caption
  if (f.W != null) {
    unview(g);
    const fWord = f.mu === 0 ? 'no friction: a smooth slope' : T`F = mu R = ${s3(f.Fr)} [N] "up the slope"`;
    if (cardW) {
      const cw = cardW, chh = 150, cx = w - cw - 16, cy = h - chh - 16;
      paper(g, cx, cy, cw, chh);
      const lab = (txt, x, y, col) => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
      lab('Down the slope +', cx + 12, cy + 18, P.muted);
      const big = Math.max(f.W, f.Fr, 1e-9), sc = (cw - 60) / 2 / big, x0 = cx + cw / 2;
      arrow(g, x0, cy + 46, x0 + f.W * sc, cy + 46, { color: P.ink, width: 2.4, head: 9 });
      lab(T`m g sin alpha = ${s3(f.W)} [N] "down the slope"`, cx + 12, cy + 62, P.ink);
      if (f.Fr > 0) arrow(g, x0, cy + 92, x0 - f.Fr * sc, cy + 92, { color: P.ink, width: 2.4, head: 9 });
      lab(fWord, cx + 12, cy + 108, P.ink);
      lab(T`R = m g cos alpha = ${s3(f.N)} [N]`, cx + 12, cy + 134, P.muted);
    } else {
      const parts = [T`m g sin alpha = ${s3(f.W)} [N] "down"`, f.mu === 0 ? 'no friction' : T`F = ${s3(f.Fr)} [N] "up"`, T`R = ${s3(f.N)} [N]`];
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
