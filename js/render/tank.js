// tank.js — the stage for something let go above a liquid, falling to its
// surface and on down through it to the bottom, side on and cut away, in one
// of two places:
//   pool  a diving brick let go from the end of a diving platform that
//         stands on the deck and reaches out over the deep end of an indoor
//         pool, the pool's side cut away to its tiles (let go at the surface,
//         it is thrown in from the poolside: no platform)
//   lab   a ball bearing let go from a clamp above a tall measuring cylinder
//         of oil on a laboratory bench
// The height above the surface and the depth as dimension lines left of the
// drop; the velocity and the acceleration beside the object, down positive;
// the speeds at the surface and at the bottom on plates. A card fixed to the
// screen shows the forces on it, from the engine: its weight, and in the
// liquid the resistance and their resultant, ma — and, once it has reached
// the bottom or come to rest, that the paper's model ends there.
//
// THE MOMENTS: a splash at the surface (a ripple in the oil), bubbles behind
// it in the liquid, a puff and a ring at the bottom. At the engine's times.
//
// Everything drawn is read from js/core/tank.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, stroke, unview } from './util.js';
import { fitSide, env, rng, paper, interior, softShadow } from './scenery.js';
import { pulse, ageOf, dust, splash } from './effects.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const sf = (x) => num(Number(x.toPrecision(3)), 6, { trim: true });
// a force to four figures: 13.5 N stays 13.5, 1475 N is not rounded
const s4 = (x) => num(Number(x.toPrecision(4)), 6, { trim: true });

/** Words that must not be lost — a measure, a speed — on a plate of the card colour where they
    belong, kept inside the stage, never moved or dropped by the label placer; their box reserved. */
function plate(g, L, P, txt, x, y, color, { align = 'center', size = 13, maxX = Infinity } = {}) {
  g.save(); g.font = `700 ${Math.max(13, size)}px system-ui, sans-serif`;
  // kept inside the stage, and left of the forces card (maxX)
  const tw = g.measureText(txt).width, bh = size + 7, W = Math.min(g.canvas.clientWidth || Infinity, maxX + 8);
  let bx = align === 'left' ? x - 4 : align === 'right' ? x - tw - 4 : x - tw / 2 - 4;
  const shift = clamp(bx, 4, Math.max(4, W - tw - 12)) - bx; bx += shift; x += shift;
  g.fillStyle = withAlpha(P.card, 0.85); g.beginPath(); g.roundRect?.(bx, y - bh / 2, tw + 8, bh, 4); g.fill();
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(txt, x, y + 0.5); g.restore();
  L.reserve({ x: bx, y: y - bh / 2, w: tw + 8, h: bh });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'tank') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520, compact = phone || h < 360 || w < 760;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);
  const lab = f.look === 'lab', hasCard = f.m != null, over = fired && t > f.tB + 1e-9;
  const cardW = compact ? 0 : 230, cardH = hasCard && !over ? 140 : 56;
  if (cardW) L.reserve({ x: w - cardW - 16, y: h - cardH - 16, w: cardW, h: cardH });

  // ── the forces, from the engine (built first: on a small stage their caption is laid out before the scene)
  const live = t >= f.t1 && t <= f.tB + 1e-9;
  const net = !hasCard ? '' : Math.abs(f.net) < 1e-9 ? T`m a = 0 [N]` : T`m a = ${s4(Math.abs(f.net))} [N] ${f.net > 0 ? '"down"' : '"up"'}`;
  const items = !hasCard || over ? [] : [T`m g = ${s4(f.weight)} [N] "down"`, ...(live ? [T`R = ${s4(f.R)} [N] "up"`, net] : [])];
  const where = t < f.t1 ? 'In the air' : 'In the liquid';
  const endWords = over ? (f.stops ? 'At rest: the paper’s model ends here' : 'At the bottom: the paper’s model ends here') : !hasCard ? 'No mass given: so no forces in newtons' : null;
  const capLines = [];
  if (!cardW) {
    g.save(); g.font = '700 13px system-ui, sans-serif';
    const words = endWords ? [endWords] : [`${where}:`, ...items];
    for (const wd of words) { const last = capLines[capLines.length - 1], next = last != null ? `${last}${last.endsWith(':') ? ' ' : ', '}${wd}` : wd; if (last != null && g.measureText(next).width + 14 <= w - 20) capLines[capLines.length - 1] = next; else capLines.push(wd); }
    g.restore();
  }
  const capH = capLines.length ? 8 + 18 * capLines.length : 0;
  if (capH) L.reserve({ x: 10, y: h - capH - 8, w: w - 20, h: capH });

  // ── the scene in metres: the surface at y = 0, let go at y = h, the bottom at y = −D; the drop line at x = 0
  const H = f.h + f.D, half = H * 0.6, headroom = Math.max(f.h + H * 0.1, H * 0.35);
  // on a phone the readouts on the left run down the stage: the scene starts below them
  const area = { left: phone ? 12 : HB[0].w + 12, right: w - (cardW ? cardW + 28 : 14), top: phone ? HB[0].h + 6 : HB[1].h + 8, bottom: h - (capH ? capH + 16 : 14) };
  const { k, X, Y } = fitSide({ xLo: -half, xHi: half * 0.8, yLo: -f.D - H * 0.06, yHi: headroom }, area, { sky: 0.5 });
  const x0 = X(0), ySurf = Y(0), yTop = Y(f.h), yBot = Y(-f.D);
  const size = clamp(k * H * 0.035, 9, 18);
  const rest = lab ? size * 0.55 : size * 0.45;              // half the object's height: it rests ON the floor
  const towerW = Math.max(36, k * H * 0.1), platform = !lab && f.h > 0;
  let dimX, rodX = null;

  // ── the place
  if (!lab) {
    const poolL = x0 - Math.max(size * 3, k * H * 0.12), poolR = Math.min(X(half * 1.3), area.right + 10), shell = 10;
    const tileH = Math.min(70, (ySurf - 10) * 0.35);
    // the hall: a wall with high windows, tiles on its lower part, backstroke flags strung across
    interior(g, -10, -10, w + 10, ySurf);
    // warm tiles, so the wall never reads as a second body of water; a skirting at the deck
    { g.fillStyle = withAlpha(E.night ? '#5a5048' : '#e8dcc8', 0.95); g.fillRect(-10, ySurf - tileH, w + 20, tileH);
      g.fillStyle = E.night ? '#3f3833' : '#b9a88e'; g.fillRect(-10, ySurf - 9, w + 20, 5);
      g.strokeStyle = withAlpha('#ffffff', E.night ? 0.12 : 0.6); g.lineWidth = 1;
      for (let y = ySurf - 12; y > ySurf - tileH; y -= 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      for (let x = 0; x < w; x += 12) { g.beginPath(); g.moveTo(x, ySurf - tileH); g.lineTo(x, ySurf); g.stroke(); } }
    { const fy = Math.max(HB[1].h + 14, ySurf - Math.min(110, (ySurf - 10) * 0.6)), cols = ['#d0342c', '#f4f4f0', '#2f6db0'];
      // on two posts at the pool's ends, as backstroke flags are
      for (const px of [poolL - 4, poolR + 4]) { g.fillStyle = E.night ? '#9aa1aa' : '#6f757d'; g.fillRect(px - 1.5, fy - 4, 3, ySurf - 4 - fy + 4); }
      stroke(g, [{ x: poolL - 4, y: fy }, { x: poolR + 4, y: fy }], { color: E.night ? '#8d949c' : '#5b6068', width: 1 });
      for (let x = poolL + 6, i = 0; x < poolR - 6; x += 14, i++) { g.fillStyle = cols[i % 3]; g.beginPath(); g.moveTo(x - 5, fy); g.lineTo(x + 5, fy); g.lineTo(x, fy + 10); g.closePath(); g.fill(); } }
    // the ground the pool is sunk into, and its concrete shell
    g.fillStyle = E.night ? '#3b3530' : '#8c7b68'; g.fillRect(-10, ySurf, w + 20, h - ySurf + 10);
    { const r = rng(7); g.fillStyle = withAlpha('#000000', 0.12); for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(r() * w, ySurf + 10 + r() * (h - ySurf), 1 + r() * 2.5, 0, TAU); g.fill(); } }
    g.fillStyle = E.night ? '#6b6e73' : '#b9bcbf'; g.fillRect(poolL - shell, ySurf, poolR - poolL + 2 * shell, yBot - ySurf + shell);
    // the water, deeper blue towards the floor, light rippling through it
    const wg = g.createLinearGradient(0, ySurf, 0, yBot); wg.addColorStop(0, E.night ? '#2a6f8f' : '#62c1e5'); wg.addColorStop(1, E.night ? '#164660' : '#2a86b8');
    g.fillStyle = wg; g.fillRect(poolL, ySurf, poolR - poolL, yBot - ySurf);
    { g.strokeStyle = withAlpha('#ffffff', 0.18); g.lineWidth = 1; const r = rng(3);
      for (let i = 0; i < 18; i++) { const x = poolL + r() * (poolR - poolL), y = ySurf + 8 + r() * (yBot - ySurf - 16); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 22, y); g.stroke(); } }
    // the pool's tiles: the wall's grid seen through the water, the black lane line on the floor
    g.strokeStyle = withAlpha('#ffffff', 0.14); for (let x = poolL; x < poolR; x += 16) { g.beginPath(); g.moveTo(x, ySurf + 4); g.lineTo(x, yBot); g.stroke(); }
    for (let y = ySurf + 16; y < yBot; y += 16) { g.beginPath(); g.moveTo(poolL, y); g.lineTo(poolR, y); g.stroke(); }
    g.fillStyle = withAlpha('#0d2433', 0.7); g.fillRect(x0 + size * 3, yBot - 3, Math.max(0, Math.min(poolR - x0 - size * 4, 160)), 3);
    // the deck, the rim, a lane rope of floats across the surface
    g.fillStyle = E.night ? '#8d9196' : '#dfe2e5'; g.fillRect(-10, ySurf - 4, poolL + 10, 4); g.fillRect(poolR, ySurf - 4, w - poolR + 10, 4);
    for (let x = poolL + 8, i = 0; x < poolR - 4; x += 12, i++) { if (Math.abs(x - x0) < size * 1.5) continue; g.fillStyle = i % 4 < 2 ? '#d0342c' : '#f4f4f0'; g.beginPath(); g.ellipse(x, ySurf, 5, 3, 0, 0, TAU); g.fill(); }
    if (platform) {
      // the diving tower on the deck, left of the pool; its slab reaches out over the water to just short of the drop
      const tR = poolL - shell - 6, tL = tR - towerW, slabR = x0 - size * 0.8;
      g.fillStyle = E.night ? '#5f6267' : '#c3c6c9'; g.fillRect(tL, yTop + 8, towerW, ySurf - 4 - yTop - 8);
      g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 1; for (let y = yTop + 30; y < ySurf - 4; y += 24) { g.beginPath(); g.moveTo(tL, y); g.lineTo(tR, y); g.stroke(); }
      g.fillStyle = E.night ? '#7a7d82' : '#e6e8ea'; g.fillRect(tL - 6, yTop, slabR - tL + 6, 8);
      g.fillStyle = '#2f6db0'; g.fillRect(tL - 6, yTop - 1, slabR - tL + 6, 2);
      // a handrail on two posts along the slab, back from its open end
      const p2 = tR + (slabR - tR) * 0.4;
      g.strokeStyle = E.night ? '#aab0b7' : '#8d949c'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(tL + 4, yTop); g.lineTo(tL + 4, yTop - 24); g.moveTo(p2, yTop); g.lineTo(p2, yTop - 24); g.moveTo(tL + 4, yTop - 24); g.lineTo(p2, yTop - 24); g.stroke();
      // the ladder up its left side, down to the deck
      g.lineWidth = 1.5; g.beginPath(); g.moveTo(tL - 6, yTop + 8); g.lineTo(tL - 6, ySurf - 4); g.moveTo(tL - 14, yTop + 8); g.lineTo(tL - 14, ySurf - 4); g.stroke();
      for (let y = yTop + 16; y < ySurf - 4; y += 10) { g.beginPath(); g.moveTo(tL - 14, y); g.lineTo(tL - 6, y); g.stroke(); }
      dimX = tL - 34;
    } else dimX = poolL - shell - 26;
  } else {
    // the laboratory: a pale wall with a window and a shelf of glassware, a bench, the measuring
    // cylinder of oil on its foot, a clamp stand on its left holding the release out over it
    const wall = g.createLinearGradient(0, 0, 0, h); wall.addColorStop(0, E.night ? '#2c3036' : '#e9edf1'); wall.addColorStop(1, E.night ? '#353a41' : '#dbe1e7');
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    const bench = yBot + 8;
    { const sx = x0 + Math.max(size * 6, k * H * 0.25), sy = Math.max(HB[1].h + 84, bench - k * H * 0.75);
      if (sx + 150 < area.right + 20) {
        g.fillStyle = E.night ? '#1d2a3a' : '#cfe3f2'; g.fillRect(sx, sy - 70, 120, 56); g.strokeStyle = E.night ? '#5a6470' : '#ffffff'; g.lineWidth = 4; g.strokeRect(sx, sy - 70, 120, 56); g.beginPath(); g.moveTo(sx + 60, sy - 70); g.lineTo(sx + 60, sy - 14); g.stroke();
        g.fillStyle = E.night ? '#4a4038' : '#8a6f55'; g.fillRect(sx - 10, sy + 30, 150, 5);
        const r = rng(12);
        for (let i = 0; i < 5; i++) { const bx = sx + i * 28, bh2 = 16 + r() * 14, col = ['#6fb3d9', '#8fd19e', '#f2c94c', '#e07a5f', '#b8a1e3'][i];
          g.fillStyle = withAlpha(col, 0.75); g.beginPath();
          if (i % 2) { g.moveTo(bx, sy + 30); g.lineTo(bx + 8, sy + 30 - bh2 * 0.6); g.lineTo(bx + 8, sy + 30 - bh2); g.lineTo(bx + 12, sy + 30 - bh2); g.lineTo(bx + 12, sy + 30 - bh2 * 0.6); g.lineTo(bx + 20, sy + 30); g.closePath(); }
          else g.rect(bx + 2, sy + 30 - bh2, 14, bh2);
          g.fill(); g.strokeStyle = withAlpha('#2b2f36', 0.4); g.lineWidth = 1; g.stroke(); }
      } }
    // the bench: a dark worktop with its front edge, cupboards under it
    g.fillStyle = E.night ? '#3f3a35' : '#3c3732'; g.fillRect(-10, bench, w + 20, 10);
    g.fillStyle = E.night ? '#2a2724' : '#6b5f52'; g.fillRect(-10, bench + 10, w + 20, h - bench);
    g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1;
    for (let x = 20; x < w; x += 90) { g.strokeRect(x, bench + 18, 80, h - bench - 10); g.fillStyle = '#9aa1aa'; g.fillRect(x + 36, bench + 28, 8, 3); }
    const cw = Math.max(size * 5, k * H * 0.16), cL = x0 - cw / 2, cR = x0 + cw / 2, rim = Y(Math.min(f.h * 0.4, H * 0.06));
    // the cylinder's foot, its glass with a pouring lip, the oil, graduations
    softShadow(g, x0, bench, cw * 0.9, 4, 0.8);
    g.fillStyle = withAlpha(E.night ? '#9fb3c4' : '#7d8c99', 0.6); g.beginPath(); g.moveTo(cL - cw * 0.25, bench); g.lineTo(cR + cw * 0.25, bench); g.lineTo(cR + 4, bench - 8); g.lineTo(cL - 4, bench - 8); g.closePath(); g.fill();
    const og = g.createLinearGradient(cL, 0, cR, 0); og.addColorStop(0, '#a87420'); og.addColorStop(0.5, '#d9a440'); og.addColorStop(1, '#a06e1e');
    g.globalAlpha = 0.9; g.fillStyle = og; g.fillRect(cL, ySurf, cw, yBot - ySurf); g.globalAlpha = 1;
    g.fillStyle = withAlpha('#ffffff', 0.25); g.fillRect(cL + 4, rim, 4, yBot - rim);
    g.strokeStyle = withAlpha(E.night ? '#cfd8e0' : '#5d6b78', 0.95); g.lineWidth = 2; g.beginPath(); g.moveTo(cL - 6, rim - 4); g.lineTo(cL, rim); g.lineTo(cL, yBot); g.lineTo(cR, yBot); g.lineTo(cR, rim); g.stroke();
    g.strokeStyle = withAlpha('#2b2f36', 0.55); g.lineWidth = 1; for (let i = 1; i < 10; i++) { const y = yBot - ((yBot - ySurf) * i) / 10; g.beginPath(); g.moveTo(cL, y); g.lineTo(cL + (i % 5 ? 6 : 11), y); g.stroke(); }
    // the clamp stand: heavy base, rod, a boss, the arm out to an electromagnet release over the cylinder, its wire
    rodX = cL - Math.max(34, cw * 0.9);
    g.fillStyle = '#2b2f36'; g.fillRect(rodX - 26, bench - 7, 52, 7); g.fillStyle = '#9aa1aa'; g.fillRect(rodX - 2.5, yTop - 34, 5, bench - yTop + 27);
    g.fillStyle = '#5b6068'; g.fillRect(rodX - 7, yTop - 26, 14, 14); g.fillRect(rodX + 7, yTop - 21, x0 - rodX - 14, 4);
    g.fillStyle = '#c0392b'; g.fillRect(x0 - 8, yTop - 26, 16, 13); g.fillStyle = '#7a1f17'; g.fillRect(x0 - 8, yTop - 15, 16, 3);
    g.strokeStyle = '#2b2f36'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 8, yTop - 20); g.quadraticCurveTo(x0 + 24, yTop - 40, rodX + 4, yTop - 34); g.stroke();
    dimX = rodX - 34;
  }

  // ── the dimension lines, left of the drop beyond the tower or stand: height above the surface, the depth (vertical: solid)
  const dim = (ya, yb, txt) => {
    stroke(g, [{ x: dimX, y: ya }, { x: dimX, y: yb }], { color: P.disp, width: 1.6 });
    for (const y of [ya, yb]) stroke(g, [{ x: dimX - 6, y }, { x: dimX + 6, y }], { color: P.disp, width: 1.6 });
    plate(g, L, P, txt, dimX - 10, (ya + yb) / 2, P.disp, { align: 'right', size: 14 });
  };
  if (f.h > 0) dim(yTop, ySurf, T`${sf(f.h)} [m]`);
  dim(ySurf, yBot, T`${sf(f.D)} [m] "deep"`);

  // ── the object, where it is (resting ON the floor at the bottom, not sunk into it); a faint line of where it has been
  const yObj = Y(f.h - f.pos(t)), yNow = Math.min(yObj, yBot - rest), inLiquid = t >= f.t1 - 1e-9;
  if (f.pos(t) > 1e-6) stroke(g, [{ x: x0, y: yTop }, { x: x0, y: yNow }], { color: withAlpha(P.ink, 0.28), width: 1.2 });
  if (fired && inLiquid && !over) {
    const r = rng(29), depthNow = Math.max(0, yNow - ySurf);
    g.fillStyle = withAlpha('#ffffff', 0.55);
    for (let i = 0; i < 14; i++) { const ph = (r() + t * (0.6 + r())) % 1, y = yNow - size - ph * depthNow, x = x0 + Math.sin((y + i * 13) * 0.08) * 4; if (y > ySurf + 2) { g.beginPath(); g.arc(x, y, 1.2 + r() * 2, 0, TAU); g.fill(); } }
  }
  g.save(); g.translate(x0, yNow);
  if (lab) {
    const bg = g.createRadialGradient(-size * 0.25, -size * 0.25, 1, 0, 0, size * 0.6); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.4, '#b9c0c8'); bg.addColorStop(1, '#4b525a');
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, size * 0.55, 0, TAU); g.fill();
  } else {
    g.fillStyle = '#1f2a33'; g.beginPath(); g.roundRect?.(-size * 0.8, -size * 0.45, size * 1.6, size * 0.9, 3); g.fill();
    g.strokeStyle = withAlpha('#ffffff', 0.35); g.lineWidth = 1; g.stroke();
    g.fillStyle = '#f2c94c'; g.fillRect(-size * 0.35, -size * 0.12, size * 0.7, size * 0.24);
  }
  g.restore();
  L.reserve({ x: x0 - size, y: yNow - size * 0.7, w: size * 2, h: size * 1.4 });
  if (rodX != null) L.reserve({ x: rodX - 8, y: yTop - 40, w: 16, h: yBot - yTop + 48 });

  // ── its velocity and acceleration beside it, down positive (vertical: solid); kept between the surface and the floor
  // in the lab the column stands just outside the glass, not on the amber oil
  const maxX = cardW ? w - cardW - 24 : w, ax = lab ? x0 + Math.max(size * 5, k * H * 0.16) / 2 + 14 : x0 + size * 1.6;
  { const vMax = Math.max(1e-9, f.v1, f.v2, f.u), aMax = Math.max(1e-9, f.g, Math.abs(f.aL));
    const room = (sg) => Math.max(14, sg > 0 ? yBot - yNow - 6 : (inLiquid ? yNow - ySurf - 6 : yNow - 10));
    // no room for a readable arrow (at the floor), none at all: the speed there is on its plate
    const col = (bx, val, max, c, unit, wd, left = false) => {
      const sg = Math.sign(val), r = room(sg); if (r < 22) return;
      const len = Math.min(clamp((Math.abs(val) / max) * 70, 22, 70), r);
      arrow(g, bx, yNow, bx, yNow + sg * len, { color: c, width: wd, head: 9 });
      L.reserve({ x: bx - 6, y: Math.min(yNow, yNow + sg * len) - 4, w: 12, h: len + 8 });
      plate(g, L, P, T`${sf(Math.abs(val))} [${unit}]`, left ? bx - 9 : bx + 9, yNow + sg * len * 0.55, c, { align: left ? 'right' : 'left', maxX });
    };
    // while it moves: at the moment it reaches the bottom or rest, its plate says it instead
    const moving = !fired || t < f.tB - 1e-9;
    const vOn = moving && show.velocity !== false && f.vel(t) > 0.05;
    if (vOn) col(ax, f.vel(t), vMax, P.vel, 'm s^-1', 2.6);
    if (fired && moving && Math.abs(f.acc(t)) > 1e-9) {
      // the second column to the right — or, if that would run under the card, to the left of the drop
      const right = !vOn || ax + 96 + 90 < maxX;
      col(!vOn ? ax : right ? ax + 96 : x0 - size * 1.6, f.acc(t), aMax, P.acc, 'm s^-2', 2.2, vOn && !right);
    } }

  // ── the moments: into the liquid, and at the bottom (or at rest); their speeds on plates
  if (fired && f.h > 0 && t >= f.t1 - 1e-9) {
    const e = ageOf(t, f.t1, f.tMax, 0.9);
    if (lab) { g.strokeStyle = withAlpha('#ffffff', 0.7 * (1 - Math.min(1, e.age / e.life))); g.lineWidth = 1.4; g.beginPath(); g.ellipse(x0, ySurf, size * (1 + 3 * e.age / e.life), 2.5, 0, 0, TAU); g.stroke(); }
    else splash(g, x0, ySurf, e.age, e.life, { size: clamp(size / 10, 0.8, 1.6) });
    // above the surface, left of the drop: the arrows are on its right
    // right of the drop, above the surface: clear of the dimension line, the tower and the clamp rod
    plate(g, L, P, T`${sf(f.v1)} [m s^-1] "at the surface"`, x0 + size * 1.4, ySurf - 16, P.vel, { align: 'left', maxX });
  }
  if (fired && t >= f.tB - 1e-9) {
    const e = ageOf(t, f.tB, f.tMax);
    pulse(g, x0, yNow, e.age, e.life, P.mark, { radius: size * 2.2 });
    if (!f.stops) dust(g, x0, yBot - 2, e.age, e.life, { size: 1.3, color: lab ? '#f2d38a' : '#ffffff', n: 16 });
    plate(g, L, P, f.stops ? T`"at rest" ${sf(f.sStop)} [m] "below the surface"` : T`${sf(f.v2)} [m s^-1] "at the bottom"`, x0 + size * 1.6, yNow - size - 12, f.stops ? P.disp : P.vel, { align: 'left', maxX });
  }
  L.draw(g, w, h);

  // ── the forces on it, from the engine; past the end, that the model ends
  unview(g);
  if (cardW) {
    const cx = w - cardW - 16, cy = h - cardH - 16, txt = (s, x, y, c, al = 'left') => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = c; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore(); };
    paper(g, cx, cy, cardW, cardH);
    if (endWords) { const [a1, a2] = endWords.includes(': ') ? endWords.split(': ') : [endWords, '']; txt(a2 ? `${a1}:` : a1, cx + 12, cy + 18, P.ink); if (a2) txt(a2, cx + 12, cy + 38, P.muted); }
    else {
      txt(`${where}: the forces`, cx + 12, cy + 16, P.muted);
      // the body in a column of its own on the left, its arrows to one scale; the sizes on the right
      const bx = cx + 30, by = cy + 82, big = Math.max(f.weight, live ? f.R : 0, 1e-9), sc = 38 / big;
      g.fillStyle = P.ink; g.beginPath(); g.arc(bx, by, 5, 0, TAU); g.fill();
      arrow(g, bx, by + 5, bx, by + 5 + Math.max(10, f.weight * sc), { color: P.ink, width: 2.2, head: 8 });
      if (live && f.R > 1e-9) arrow(g, bx, by - 5, bx, by - 5 - Math.max(10, f.R * sc), { color: P.ink, width: 2.2, head: 8 });
      items.forEach((s, i) => txt(s, cx + cardW - 10, cy + 46 + i * 22, P.ink, 'right'));
      if (!live) txt('falling freely', cx + cardW - 10, cy + 46 + 22, P.muted, 'right');
    }
  } else if (capLines.length) {
    g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
    const tw = Math.min(w - 20, Math.max(...capLines.map((x) => g.measureText(x).width)) + 14);
    paper(g, 10, h - capH - 8, tw, capH); g.fillStyle = P.ink; capLines.forEach((x, i) => g.fillText(x, 17, h - capH - 8 + 13 + i * 18)); g.restore();
  }
  return null;
}
