// tank.js — the stage for something let go above a liquid, falling to its
// surface and on down through it to the bottom, side on and cut away, in one
// of two places:
//   pool  a diving brick let go from the edge of a diving platform over the
//         deep end of an indoor pool, the pool's side cut away to the tiles
//   lab   a ball bearing let go from a clamp above a tall glass cylinder of
//         oil on a laboratory bench
// The height above the surface and the depth as dimension lines beside the
// drop; the velocity and the acceleration beside the object, down positive;
// the speeds at the surface and at the bottom on flags. A card fixed to the
// screen shows the forces on it, from the engine: its weight, and in the
// liquid the resistance and their resultant, ma.
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

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'tank') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520, compact = phone || h < 360 || w < 760;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);
  const lab = f.look === 'lab', hasCard = f.m != null, cardW = compact || !hasCard ? 0 : 200, cardH = 150;
  if (cardW) L.reserve({ x: w - cardW - 16, y: h - cardH - 16, w: cardW, h: cardH });

  // ── the scene in metres: the surface at y = 0, let go at y = h, the bottom at y = −D; the drop line at x = 0
  const H = f.h + f.D, half = H * 0.55;
  const area = { left: phone ? 12 : HB[0].w + 12, right: w - (cardW ? cardW + 28 : 14), top: phone ? HB[0].h + 6 : 16, bottom: h - (compact && hasCard ? 50 : 14) };
  const { k, X, Y } = fitSide({ xLo: -half, xHi: half, yLo: -f.D - H * 0.06, yHi: f.h + H * 0.1 }, area, { sky: 0.5 });
  const x0 = X(0), ySurf = Y(0), yTop = Y(f.h), yBot = Y(-f.D);
  const size = clamp(k * H * 0.035, 9, 18);

  // ── the place
  if (!lab) {
    // the hall: a tiled wall with high windows, the deck at the surface's level, the pool's shell cut away
    interior(g, -10, -10, w + 10, ySurf);
    { g.strokeStyle = withAlpha('#ffffff', E.night ? 0.06 : 0.25); g.lineWidth = 1; for (let y = ySurf - 8; y > ySurf - 140; y -= 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
    const poolL = X(-half * 0.9), poolR = X(half * 1.4), shell = 10;
    // the ground the pool is sunk into, and its concrete shell
    g.fillStyle = E.night ? '#3b3530' : '#8c7b68'; g.fillRect(-10, ySurf, w + 20, h - ySurf + 10);
    { const r = rng(7); g.fillStyle = withAlpha('#000000', 0.12); for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(r() * w, ySurf + 10 + r() * (h - ySurf), 1 + r() * 2.5, 0, TAU); g.fill(); } }
    g.fillStyle = E.night ? '#6b6e73' : '#b9bcbf'; g.fillRect(poolL - shell, ySurf, poolR - poolL + 2 * shell, yBot - ySurf + shell);
    // the water, deeper blue towards the floor, light rippling through it
    const wg = g.createLinearGradient(0, ySurf, 0, yBot); wg.addColorStop(0, E.night ? '#2a6f8f' : '#62c1e5'); wg.addColorStop(1, E.night ? '#164660' : '#2a86b8');
    g.fillStyle = wg; g.fillRect(poolL, ySurf, poolR - poolL, yBot - ySurf);
    { g.strokeStyle = withAlpha('#ffffff', 0.18); g.lineWidth = 1; const r = rng(3);
      for (let i = 0; i < 18; i++) { const x = poolL + r() * (poolR - poolL), y = ySurf + 8 + r() * (yBot - ySurf - 16); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 22, y); g.stroke(); } }
    // the floor's tiles and the black lane line on it
    g.strokeStyle = withAlpha('#ffffff', 0.25); for (let x = poolL; x < poolR; x += 16) { g.beginPath(); g.moveTo(x, yBot - 6); g.lineTo(x, yBot); g.stroke(); }
    g.fillStyle = withAlpha('#0d2433', 0.7); g.fillRect(x0 + size * 3, yBot - 3, Math.min(poolR - x0 - size * 4, 160), 3);
    // the deck, the gutter at the rim, a lane rope of floats across the surface
    g.fillStyle = E.night ? '#8d9196' : '#dfe2e5'; g.fillRect(-10, ySurf - 4, poolL + 10, 4); g.fillRect(poolR, ySurf - 4, w - poolR + 10, 4);
    for (let x = poolL + 8, i = 0; x < poolR - 4; x += 12, i++) { if (Math.abs(x - x0) < size * 1.5) continue; g.fillStyle = i % 4 < 2 ? '#d0342c' : '#f4f4f0'; g.beginPath(); g.ellipse(x, ySurf, 5, 3, 0, 0, TAU); g.fill(); }
    // the diving platform: a concrete tower, the platform's slab to just short of the drop line, a rail, a ladder
    const towerR = x0 - size * 1.6, towerL = Math.max(-10, towerR - Math.max(40, k * H * 0.12));
    g.fillStyle = E.night ? '#5f6267' : '#c3c6c9'; g.fillRect(towerL, yTop + 8, towerR - towerL, ySurf - yTop - 8);
    g.strokeStyle = withAlpha('#000000', 0.12); for (let y = yTop + 30; y < ySurf; y += 24) { g.beginPath(); g.moveTo(towerL, y); g.lineTo(towerR, y); g.stroke(); }
    g.fillStyle = E.night ? '#7a7d82' : '#e6e8ea'; g.fillRect(towerL - 10, yTop, x0 - size * 0.7 - towerL + 10, 8);
    g.fillStyle = '#2f6db0'; g.fillRect(towerL - 10, yTop - 1, x0 - size * 0.7 - towerL + 10, 2);
    g.strokeStyle = E.night ? '#aab0b7' : '#8d949c'; g.lineWidth = 2; g.beginPath(); g.moveTo(towerL, yTop); g.lineTo(towerL, yTop - 26); g.lineTo(towerR - 10, yTop - 26); g.lineTo(towerR - 10, yTop); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.moveTo(towerL - 6, yTop + 8); g.lineTo(towerL - 6, ySurf - 4); g.moveTo(towerL - 14, yTop + 8); g.lineTo(towerL - 14, ySurf - 4); g.stroke();
    for (let y = yTop + 16; y < ySurf - 4; y += 10) { g.beginPath(); g.moveTo(towerL - 14, y); g.lineTo(towerL - 6, y); g.stroke(); }
  } else {
    // the laboratory: a pale wall, a bench, the glass cylinder of oil standing on it, a clamp stand holding the release
    const wall = g.createLinearGradient(0, 0, 0, h); wall.addColorStop(0, E.night ? '#2c3036' : '#e9edf1'); wall.addColorStop(1, E.night ? '#353a41' : '#dbe1e7');
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    g.strokeStyle = withAlpha('#000000', 0.05); for (let x = 0; x < w; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    const bench = yBot + 6;
    g.fillStyle = E.night ? '#3f3a35' : '#4c4640'; g.fillRect(-10, bench, w + 20, 10);
    g.fillStyle = E.night ? '#2a2724' : '#6b5f52'; g.fillRect(-10, bench + 10, w + 20, h - bench);
    const cw = Math.max(size * 5, k * H * 0.16), cL = x0 - cw / 2, cR = x0 + cw / 2, rim = Y(H * 0.06);
    softShadow(g, x0, bench, cw * 0.7, 4, 0.8);
    const og = g.createLinearGradient(cL, 0, cR, 0); og.addColorStop(0, '#b7832a'); og.addColorStop(0.5, '#e2b04e'); og.addColorStop(1, '#b07a24');
    g.fillStyle = withAlpha(og, 1); g.globalAlpha = 0.85; g.fillRect(cL, ySurf, cw, yBot - ySurf); g.globalAlpha = 1;
    g.fillStyle = withAlpha('#ffffff', 0.25); g.fillRect(cL + 4, rim, 4, bench - rim);
    g.strokeStyle = withAlpha(E.night ? '#cfd8e0' : '#7d8c99', 0.9); g.lineWidth = 2; g.beginPath(); g.moveTo(cL, rim); g.lineTo(cL, bench); g.lineTo(cR, bench); g.lineTo(cR, rim); g.stroke();
    g.fillStyle = withAlpha('#7d8c99', 0.5); g.fillRect(cL - 4, bench - 5, cw + 8, 5);
    // graduations up the glass
    g.strokeStyle = withAlpha('#2b2f36', 0.5); g.lineWidth = 1; for (let i = 1; i < 10; i++) { const y = yBot - ((yBot - ySurf) * i) / 10; g.beginPath(); g.moveTo(cR - 8, y); g.lineTo(cR, y); g.stroke(); }
    // the clamp stand: base, rod, boss and arm out over the cylinder to the release
    const rodX = cR + Math.max(30, cw * 0.8);
    g.fillStyle = '#2b2f36'; g.fillRect(rodX - 22, bench - 6, 44, 6); g.fillStyle = '#9aa1aa'; g.fillRect(rodX - 2, yTop - 30, 4, bench - yTop + 24);
    g.fillStyle = '#5b6068'; g.fillRect(rodX - 6, yTop - 22, 12, 12); g.fillRect(x0 + 4, yTop - 18, rodX - x0 - 4, 4);
    g.fillStyle = '#c0392b'; g.fillRect(x0 - 7, yTop - 22, 14, 12);
  }

  // ── the dimension lines, left of the drop: the height above the surface, the depth (vertical: solid)
  // left of the tower's ladder (or of the cylinder), clear of the arrows on the right
  { const dx = lab ? x0 - Math.max(size * 5, k * H * 0.16) / 2 - 26 : x0 - size * 1.6 - Math.max(40, k * H * 0.12) - 30;
    const dim = (ya, yb, txt) => {
      stroke(g, [{ x: dx, y: ya }, { x: dx, y: yb }], { color: P.disp, width: 1.6 });
      for (const y of [ya, yb]) stroke(g, [{ x: dx - 6, y }, { x: dx + 6, y }], { color: P.disp, width: 1.6 });
      L.add(txt, dx - 8, (ya + yb) / 2, { color: P.disp, pri: 10, size: 14, weight: 700, align: 'right', maxPush: 20 });
    };
    if (f.h > 0) dim(yTop, ySurf, T`${sf(f.h)} [m]`);
    dim(ySurf, yBot, T`${sf(f.D)} [m] "deep"`); }

  // ── the object, where it is; a faint line of where it has been
  const yNow = Y(f.h - f.pos(t)), inLiquid = t >= f.t1 - 1e-9;
  if (f.pos(t) > 1e-6) stroke(g, [{ x: x0, y: yTop }, { x: x0, y: yNow }], { color: withAlpha('#ffffff', 0.7), width: 1.2, dash: [2, 5] });
  // bubbles rising behind it in the liquid
  if (fired && inLiquid) {
    const r = rng(29), depthNow = Math.max(0, yNow - ySurf);
    g.fillStyle = withAlpha('#ffffff', 0.55);
    for (let i = 0; i < 14; i++) { const ph = (r() + t * (0.6 + r())) % 1, y = yNow - size - ph * depthNow, x = x0 + Math.sin((y + i * 13) * 0.08) * 4; if (y > ySurf + 2) { g.beginPath(); g.arc(x, y, 1.2 + r() * 2, 0, TAU); g.fill(); } }
  }
  g.save(); g.translate(x0, yNow);
  if (lab) {
    const bg = g.createRadialGradient(-size * 0.25, -size * 0.25, 1, 0, 0, size * 0.6); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.4, '#b9c0c8'); bg.addColorStop(1, '#4b525a');
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, size * 0.55, 0, TAU); g.fill();
  } else {
    // a diving brick: a dark rubber block with a lighter edge and a grip
    g.fillStyle = '#1f2a33'; g.beginPath(); g.roundRect?.(-size * 0.8, -size * 0.45, size * 1.6, size * 0.9, 3); g.fill();
    g.strokeStyle = withAlpha('#ffffff', 0.35); g.lineWidth = 1; g.stroke();
    g.fillStyle = '#f2c94c'; g.fillRect(-size * 0.35, -size * 0.12, size * 0.7, size * 0.24);
  }
  g.restore();
  L.reserve({ x: x0 - size, y: yNow - size * 0.7, w: size * 2, h: size * 1.4 });

  // ── the moments: into the liquid, and at the bottom (or at rest)
  if (fired && f.h > 0 && t >= f.t1 - 1e-9) {
    const e = ageOf(t, f.t1, f.tMax, 0.9);
    if (lab) { g.strokeStyle = withAlpha('#ffffff', 0.7 * (1 - Math.min(1, e.age / e.life))); g.lineWidth = 1.4; g.beginPath(); g.ellipse(x0, ySurf, size * (1 + 3 * e.age / e.life), 2.5, 0, 0, TAU); g.stroke(); }
    else splash(g, x0, ySurf, e.age, e.life, { size: clamp(size / 10, 0.8, 1.6) });
    L.add(T`${sf(f.v1)} [m s^-1] "at the surface"`, x0 + size * 2.2, ySurf - 14, { color: P.vel, pri: 11, size: 13, weight: 700, align: 'left', maxPush: 20 });
  }
  if (fired && t >= f.tB - 1e-9) {
    const e = ageOf(t, f.tB, f.tMax);
    pulse(g, x0, yNow, e.age, e.life, P.mark, { radius: size * 2.2 });
    if (!f.stops) dust(g, x0, yBot, e.age, e.life, { size: 0.9, color: lab ? '#c8a050' : '#d8e8f0', n: 12 });
    L.add(f.stops ? T`"at rest" ${sf(f.sStop)} [m] "down"` : T`${sf(f.v2)} [m s^-1] "at the bottom"`, x0 + size * 2.2, yNow - 14, { color: f.stops ? P.disp : P.vel, pri: 11, size: 13, weight: 700, align: 'left', maxPush: 20 });
  }

  // ── its velocity and acceleration, beside it, down positive (vertical: solid)
  { const vMax = Math.max(1e-9, f.v1, f.v2, f.u), aMax = Math.max(1e-9, f.g, Math.abs(f.aL)), moving = t < f.tB - 1e-9 || !fired;
    const col = (dx, val, max, c, unit, wd) => {
      const len = clamp((Math.abs(val) / max) * 70, 14, 70), sg = Math.sign(val), bx = x0 + dx;
      arrow(g, bx, yNow, bx, yNow + sg * len, { color: c, width: wd, head: Math.min(9, len * 0.5) });
      L.add(T`${sf(Math.abs(val))} [${unit}]`, bx + 8, yNow + sg * len * 0.6, { color: c, pri: 10, size: 13, weight: 700, align: 'left', maxPush: 24 });
    };
    if (moving && show.velocity !== false && f.vel(t) > 0.05) col(size * 1.5, f.vel(t), vMax, P.vel, 'm s^-1', 2.6);
    if (moving && Math.abs(f.acc(t)) > 1e-9) col(size * 1.5 + (show.velocity !== false && f.vel(t) > 0.05 ? 90 : 0), f.acc(t), aMax, P.acc, 'm s^-2', 2.2); }
  L.draw(g, w, h);

  // ── the forces on it, from the engine: its weight, and in the liquid the resistance and the resultant
  if (hasCard) {
    unview(g);
    const where = t < f.t1 ? 'In the air' : f.stops && t >= f.tB ? 'At rest' : t >= f.tB ? 'At the bottom' : 'In the liquid';
    const live = t >= f.t1 && t < f.tB, items = [T`m g = ${s4(f.weight)} [N] "down"`, ...(live ? [T`R = ${s4(f.R)} [N] "up"`, T`m a = ${s4(f.net)} [N] ${f.net >= 0 ? '"down"' : '"up"'}`] : [])];
    if (cardW) {
      const cx = w - cardW - 16, cy = h - cardH - 16, txt = (s, x, y, c, al = 'left') => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = c; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore(); };
      paper(g, cx, cy, cardW, cardH);
      txt(`${where}: the forces`, cx + 12, cy + 16, P.muted);
      const bx = cx + 40, by = cy + 80, big = Math.max(f.weight, live ? f.R : 0, 1e-9), sc = 40 / big;
      g.fillStyle = P.ink; g.beginPath(); g.arc(bx, by, 5, 0, TAU); g.fill();
      arrow(g, bx, by + 5, bx, by + 5 + Math.max(10, f.weight * sc), { color: P.ink, width: 2.2, head: 8 });
      if (live && f.R > 1e-9) arrow(g, bx, by - 5, bx, by - 5 - Math.max(10, f.R * sc), { color: P.ink, width: 2.2, head: 8 });
      items.forEach((s, i) => txt(s, cx + cardW - 10, cy + 48 + i * 22, P.ink, 'right'));
      if (!live && t < f.t1) txt('falling freely: no resistance', cx + cardW - 10, cy + 48 + 22, P.muted, 'right');
    } else {
      g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
      const line = `${where}: ${items.join(', ')}`, tw = Math.min(w - 20, g.measureText(line).width + 14);
      paper(g, 10, h - 38, tw, 26); g.fillStyle = P.ink; g.fillText(line, 17, h - 25, w - 34); g.restore();
    }
  }
  return null;
}
