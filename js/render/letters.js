// letters.js — the stage for two particles projected straight up from O,
// the answers in letters.
//
// The place: the roof terrace of a tall stone building, a city skyline far
// behind, the street far below. Someone stands at the parapet's edge and
// projects both from their hand — O, a point in the air, not the ground — so
// the two may meet above O, at it, or below it, falling past the building's
// face. The thrower winds up and lets go on the engine's clock: P first, and
// Q held at O until the engine says it goes.
//
// Side on at one scale, up the page. P and Q are the stadium's shaded balls
// (Q ringed in its own colour), drawn a ball's width apart so both show on
// the one vertical line and touch where they collide. P's greatest height is
// marked H with its value in letters; where they collide flashes, with τ and
// the height in letters (and in metres when U and g are numbers). Velocity in
// the velocity hue, up solid (rule 2); P's path in the quantity's hue, Q's in
// its own.
//
// Everything drawn is read from js/core/letters.js (rule 4).

import { flash, pulse, ageOf } from './effects.js';
import { skyscape, stone, softShadow, env, rng } from './scenery.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, withAlpha } from './util.js';
import { thrower, throwerHand, ballAt, THROWER_MIN } from './figures.js';
import { inLetters } from '../core/letters.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250, HUD_H = 290;

/** A tall stone building whose roof (the terrace floor) is at y = roof, its
    right-hand face at x = edge, `bw` px wide, standing on the street at Y:
    courses of stone, tall windows lit by night, a cornice and a parapet
    with a rail along the roof, a stair-house on the roof behind. */
export function building(g, edge, bw, roof, Y, seed = 7) {
  const E = env(), r = rng(seed), x0 = edge - bw, H = Y - roof;
  softShadow(g, edge - bw / 2, Y + 2, bw * 0.7, 8, 0.9);
  stone(g, x0, roof, bw, H, { course: 11, seed, color: E.night ? '#71656b' : '#cdbfb6' });
  // the corner quoins down the face, catching the light
  g.save();
  g.fillStyle = withAlpha('#ffffff', E.night ? 0.06 : 0.16);
  for (let y = roof + 6, i = 0; y < Y - 4; y += 22, i++) g.fillRect(edge - (i % 2 ? 14 : 20), y, i % 2 ? 14 : 20, 10);
  // tall windows, floor by floor
  const floorH = clamp(H / Math.max(3, Math.round(H / 46)), 34, 58), cols = Math.max(2, Math.floor((bw - 24) / 26));
  const ww = 12, gap = (bw - 24 - cols * ww) / Math.max(1, cols - 1);
  for (let y = roof + 22; y + floorH * 0.55 < Y - 30; y += floorH) {
    for (let c = 0; c < cols; c++) {
      const wx = x0 + 12 + c * (ww + gap), wh = floorH * 0.55, lit = E.night && r() < 0.45;
      g.fillStyle = E.night ? '#2a2226' : '#5d6c78'; g.fillRect(wx - 1.5, y - 1.5, ww + 3, wh + 3);
      const wg = g.createLinearGradient(wx, y, wx + ww, y + wh);
      if (lit) { wg.addColorStop(0, withAlpha(E.window, 0.95)); wg.addColorStop(1, withAlpha(E.window, 0.6)); }
      else { wg.addColorStop(0, E.night ? '#3d4650' : '#a9bcc8'); wg.addColorStop(1, E.night ? '#262c33' : '#7f95a3'); }
      g.fillStyle = wg; g.fillRect(wx, y, ww, wh);
      g.fillStyle = withAlpha(E.night ? '#000000' : '#ffffff', E.night ? 0.25 : 0.35); g.fillRect(wx, y + wh * 0.48, ww, 1.2); g.fillRect(wx + ww / 2 - 0.6, y, 1.2, wh);
      g.fillStyle = E.night ? '#857a80' : '#e4dad2'; g.fillRect(wx - 3, y + wh + 1.5, ww + 6, 3);   // the sill
    }
  }
  // the door at the street
  if (H > 60) { g.fillStyle = E.night ? '#3b2c26' : '#6e4f3c'; g.beginPath(); g.roundRect(x0 + bw * 0.35, Y - 34, 22, 34, [11, 11, 0, 0]); g.fill(); }
  // the cornice under the parapet
  g.fillStyle = E.night ? '#91858b' : '#e6ddd5'; g.fillRect(x0 - 5, roof + 4, bw + 10, 6);
  g.fillStyle = withAlpha('#000000', 0.25); g.fillRect(x0 - 5, roof + 10, bw + 10, 2);
  // the roof: a stair-house at the back, the terrace floor, a rail along the edge
  const shW = Math.min(46, bw * 0.4), shH = 34;
  g.fillStyle = E.night ? '#5b5056' : '#b7a9a0'; g.fillRect(x0 + 8, roof - shH, shW, shH);
  g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(x0 + 8 + shW - 8, roof - shH, 8, shH);
  g.fillStyle = E.night ? '#3a3034' : '#6e5f58'; g.fillRect(x0 + 6, roof - shH - 4, shW + 4, 5);
  g.fillStyle = E.night ? '#2c2428' : '#5b4c45'; g.fillRect(x0 + 18, roof - 22, 13, 22);
  g.fillStyle = E.night ? '#7f7379' : '#d5cbc3'; g.fillRect(x0 - 3, roof - 3, bw + 3, 4);
  g.strokeStyle = E.night ? '#9a8f95' : '#6f6662'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x0 - 2, roof - 24); g.lineTo(edge - 1, roof - 24); g.stroke();
  g.lineWidth = 1.4;
  for (let x = x0 + 2; x <= edge - 1; x += 9) { g.beginPath(); g.moveTo(x, roof - 24); g.lineTo(x, roof - 2); g.stroke(); }
  g.beginPath(); g.moveTo(x0 - 2, roof - 13); g.lineTo(edge - 1, roof - 13); g.stroke();
  g.restore();
}

/** A building across the street, set back and misted: a parapet, a cornice,
    windows with sills, the shaded return on its right. */
function townBlock(g, x, bw, top, Y, seed, E) {
  const r = rng(seed + 31), tint = [E.night ? '#4d4146' : '#cdb6a6', E.night ? '#453b42' : '#bfae9f', E.night ? '#54474c' : '#d4c0b0'][seed % 3];
  g.save();
  g.fillStyle = tint; g.fillRect(x, top, bw, Y - top);
  g.fillStyle = withAlpha('#000000', 0.16); g.fillRect(x + bw - 8, top, 8, Y - top);
  g.fillStyle = withAlpha(E.night ? '#857a80' : '#e9ddd2', 0.9); g.fillRect(x - 3, top - 4, bw + 6, 5);
  g.fillStyle = withAlpha('#000000', 0.15); g.fillRect(x, top + 1, bw, 2);
  const cols = Math.max(2, Math.floor((bw - 16) / 18));
  for (let y = top + 14; y < Y - 22; y += 24) for (let c = 0; c < cols; c++) {
    const wx = x + 10 + c * ((bw - 20) / cols) + 2, lit = E.night && r() < 0.35;
    g.fillStyle = lit ? withAlpha(E.window, 0.75) : (E.night ? '#2c262a' : '#7f909c'); g.fillRect(wx, y, 9, 13);
    g.fillStyle = withAlpha(E.night ? '#8a7f85' : '#f1e8df', 0.8); g.fillRect(wx - 1.5, y + 13, 12, 2);
  }
  // misted: it is across the street
  g.fillStyle = withAlpha(E.haze, E.night ? 0.35 : 0.3); g.fillRect(x - 3, top - 4, bw + 6, Y - top + 4);
  g.restore();
}

/** Where a thrower's two hands are (figures.js thrower's own geometry, read
    the same way): relative to the feet, facing +x, y down, at this pose. */
function handsOf(H, pose, aim) {
  H = Math.max(THROWER_MIN * 0.8, H);
  const u = clamp(pose, 0, 1), e = u * u * (3 - 2 * u);
  const thigh = H * 0.25, shin = H * 0.26, upper = H * 0.17, fore = H * 0.16;
  const HIP = { x: -H * 0.04 + e * H * 0.07, y: -(thigh + shin) * 0.95 }, lean = -0.18 + e * 0.38;
  const SH = { x: HIP.x + Math.sin(lean) * H * 0.3, y: HIP.y - Math.cos(lean) * H * 0.3 };
  const a0 = Math.PI * 1.15, a1 = -(aim * Math.PI) / 180, ang = a0 + (a1 - a0 + (a1 < a0 - Math.PI ? 2 * Math.PI : 0)) * e;
  const EL = { x: SH.x + Math.cos(ang - 0.35 * (1 - e)) * upper, y: SH.y + Math.sin(ang - 0.35 * (1 - e)) * upper };
  const bal = 0.15 + e * 1.1, EL2 = { x: SH.x + Math.cos(bal) * upper, y: SH.y + Math.sin(bal) * upper };
  return { throwing: { x: EL.x + Math.cos(ang) * fore, y: EL.y + Math.sin(ang) * fore }, other: { x: EL2.x + Math.cos(bal + 0.5) * fore, y: EL2.y + Math.sin(bal + 0.5) * fore } };
}

/** Keep labels off a drawn line: a small box reserved round every few px of it. */
function keepOff(L, pts, pad = 7) {
  let last = null;
  for (const p of pts) {
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < pad * 1.4) continue;
    L.reserve({ x: p.x - pad, y: p.y - pad, w: pad * 2, h: pad * 2 }); last = p;
  }
}
const line = (x0, y0, x1, y1, n = 16) => Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n }));

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'letters') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const phone = w < 520;

  // ── the frame: from the lowest to the highest either reaches, one scale; the
  //    roof the thrower stands on is a hand's height below O, the street below that
  const ys = [0, f.H]; for (let i = 0; i <= 120; i++) { const tt = (i / 120) * f.tMax; ys.push(f.yP(tt)); if (tt >= f.t0) ys.push(f.yQ(tt)); }
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const fig = phone ? THROWER_MIN : 62, aim = 62, hand = throwerHand(fig, aim);
  const ground = h - 26, yTop = 74;
  // the building keeps a good part of the height, so it reads as tall
  const build = Math.max(70, (ground - yTop) * (phone ? 0.3 : 0.36));
  const k = Math.min((ground - 34 - yTop) / Math.max(1e-9, hi - lo), (ground - build - hand.y - yTop) / Math.max(1e-9, hi));
  const Y = (y) => yTop + (hi - y) * k;
  const R = phone ? 7 : 8.5;
  const cx = phone ? w * 0.5 : Math.max(HUD + 170, w * 0.52), xP = cx - R - 0.5, xQ = cx + R + 0.5;
  // the parapet's edge clear of the line through O, so a particle falling
  // below O passes the building's face; the thrower's front foot at the edge
  const roof = Y(0) + hand.y, edge = xP - R - 3, feet = edge - fig * 0.15 - 2, bw = clamp(w * 0.2, 110, 170);

  // ── the place: a city at dusk (or in the afternoon), the building, the street
  skyscape(g, 0, 0, w, ground, { far: 'skyline', seed: 23, farHeight: Math.min(120, (ground - roof) * 0.7 + 40) });
  // the street's other side, further off: a row of lower blocks, misted
  const E = env(), r2 = rng(5);
  for (let x = edge + 46, i = 0; x < w + 10; i++) {
    const ow = 90 + r2() * 70, oh = Math.min(ground - roof - 20, 70 + r2() * 90);
    if (oh > 30) townBlock(g, x, ow, ground - oh, ground, i, E);
    x += ow + 6 + r2() * 10;
  }
  // the street: a pavement and the road edge
  const pg = g.createLinearGradient(0, ground, 0, h);
  pg.addColorStop(0, env().night ? '#4a4044' : '#b9afab'); pg.addColorStop(1, env().night ? '#2c2629' : '#8e8582');
  g.fillStyle = pg; g.fillRect(0, ground, w, h - ground);
  g.strokeStyle = withAlpha('#000000', 0.18); g.lineWidth = 1;
  for (let x = 0; x < w; x += 34) { g.beginPath(); g.moveTo(x, ground); g.lineTo(x - 8, h); g.stroke(); }
  building(g, edge, bw, roof, ground, 11);

  // ── the vertical through O, O, and the level of O across
  stroke(g, [{ x: cx, y: Y(hi) - 24 }, { x: cx, y: Math.max(Y(lo), Y(0)) + 24 }], { color: P.grid, width: 1.4, dash: [3, 5] });
  const oL = xQ + R + 6, oR = cx + (phone ? 80 : 130);
  stroke(g, [{ x: oL, y: Y(0) }, { x: oR, y: Y(0) }], { color: P.axis, width: 1.4, dash: [6, 4] });
  keepOff(L, line(oL, Y(0), oR, Y(0)), 5);
  g.save(); g.strokeStyle = P.ink; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 6, Y(0)); g.lineTo(cx + 6, Y(0)); g.moveTo(cx, Y(0) - 6); g.lineTo(cx, Y(0) + 6); g.stroke(); g.restore();
  L.add('O', oL + 4, Y(0) + 18, { color: P.ink, align: 'left', pri: 9, size: 15, weight: 700, maxPush: 20 });
  if (!phone) L.add('level of O', oR + 11, Y(0), { color: P.muted, align: 'left', pri: 4, size: 13 });

  // ── the thrower: P leaves the throwing hand at once; Q waits in the other
  //    hand, swaps across as the arm winds back, and leaves O when the engine says
  const t0 = f.t0, d = Math.max(1e-6, Math.min(f.tMax * 0.06, t0 / 3));
  let pose = 1, qHeld = null;
  if (t < d) pose = t / d;
  if (t < t0) {
    if (t >= t0 - 2 * d && t < t0 - d) pose = 1 - (t - (t0 - 2 * d)) / d;
    else if (t >= t0 - d) pose = (t - (t0 - d)) / d;
    const hs = handsOf(fig, pose, aim), which = t >= t0 - 2 * d ? hs.throwing : hs.other;
    qHeld = { x: feet + which.x, y: roof + which.y - R * 0.5 };
  }
  thrower(g, feet, roof, fig, P, { dir: 1, pose, aim });
  L.reserve({ x: feet - fig * 0.45, y: roof - fig * 1.15, w: fig * 0.8, h: fig * 1.15 });

  // ── P's greatest height, in letters
  if (f.top) {
    const x0 = cx - 70, x1 = cx + (phone ? 60 : 90);
    stroke(g, [{ x: x0, y: Y(f.H) }, { x: x1, y: Y(f.H) }], { color: P.disp, width: 1.4, dash: [6, 4] });
    keepOff(L, line(x0, Y(f.H), x1, Y(f.H)), 5);
    L.add(T`H = ${inLetters(0.5, 'U^2', 'g')}${f.num ? ` = ${tr(f.H)} [m]` : ''}`, x1 + 8, Y(f.H), { color: P.disp, align: 'left', pri: 7, size: 14, weight: 700 });
  }

  // ── the paths: each one's reach faintly, so far strongly
  const span = (fn, a, b) => { let mn = Infinity, mx = -Infinity; for (let i = 0; i <= 80; i++) { const y = fn(a + (b - a) * i / 80); mn = Math.min(mn, y); mx = Math.max(mx, y); } return [mn, mx]; };
  const [pl, ph] = span(f.yP, 0, f.tMax);
  stroke(g, [{ x: xP, y: Y(ph) }, { x: xP, y: Y(pl) }], { color: P.vel, width: 2, alpha: 0.3 });
  if (t > f.t0 && f.tMax > f.t0) { const [ql, qh] = span(f.yQ, f.t0, f.tMax); stroke(g, [{ x: xQ, y: Y(qh) }, { x: xQ, y: Y(ql) }], { color: P.second, width: 2, alpha: 0.3 }); }
  const sofar = (fn, x, from) => { const [mn, mx] = span(fn, from, t); return [{ x, y: Y(mx) }, { x, y: Y(mn) }]; };
  if (t > 0) stroke(g, sofar(f.yP, xP, 0), { color: P.vel, width: 3 });
  if (t > f.t0) stroke(g, sofar(f.yQ, xQ, f.t0), { color: P.second, width: 3 });
  keepOff(L, line(xP, Y(hi), xP, Y(lo), 30), 8); keepOff(L, line(xQ, Y(hi), xQ, Y(lo), 30), 8);

  // ── the collision: a flash where they meet
  const hit = f.tc != null && t >= f.tc - 1e-9;
  if (hit) { const { age, life } = ageOf(t, f.tc, f.tMax); flash(g, cx, Y(f.yc), age, life, { radius: 32 }); pulse(g, cx, Y(f.yc), age, life, P.mark, { radius: 44 }); }

  // ── each particle and its velocity (vertical: solid)
  for (const [fn, vf, x, ring, n, side] of [[f.yP, f.vP, xP, null, 'P', -1], [f.yQ, f.vQ, xQ, P.second, 'Q', 1]]) {
    const y = fn(t), v = vf(t), moving = n === 'P' || t > f.t0;
    const held = n === 'Q' && qHeld, bx = held ? qHeld.x : x, by = held ? qHeld.y : Y(y);
    if (show.velocity !== false && !hit && moving && Math.abs(v) > 1e-9) {
      const vMax = Math.max(f.U, f.kq * f.U, 1e-6), len = (v / vMax) * (phone ? 54 : 70), ax = x + side * (R + 9);
      arrow(g, ax, Y(y), ax, Y(y) - len, { color: P.velVec, width: 2.6, head: 9 });
      keepOff(L, line(ax, Y(y), ax, Y(y) - len, 6), 7);
    }
    ballAt(g, bx, by, R, ring);
    L.reserve({ x: bx - R - 4, y: by - R - 4, w: 2 * R + 8, h: 2 * R + 8 });
    if (held) L.add(n, feet - fig * 0.45 - 8, by, { color: P.second, align: 'right', pri: 9, size: 15, weight: 700 });
    else L.add(n, bx + side * (R + 22), by - 14, { color: n === 'P' ? P.vel : P.second, align: side < 0 ? 'right' : 'left', pri: 9, size: 15, weight: 700 });
  }
  if (t < f.t0) {
    // in the sky above O, clear of the lines and the buildings
    const nx = xQ + R + 18;
    L.add('Q goes from O', nx, Y(0) - 70, { color: P.second, align: 'left', pri: 6, size: 13, weight: 700, maxPush: 60 });
    L.add(f.top ? 'when P is at the top' : 'at the time given', nx, Y(0) - 44, { color: P.second, align: 'left', pri: 6, size: 13, weight: 700, maxPush: 60 });
  }
  if (hit) {
    const tau = f.tau, yl = f.ycL, lx = xQ + R + 22;
    L.add(T`"collide," tau = ${inLetters(tau, 'U', 'g')}`, lx, Y(f.yc) - 38, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
    L.add(Math.abs(yl) < 1e-9 ? 'at O' : T`${inLetters(Math.abs(yl), 'U^2', 'g')} ${yl > 0 ? '"above O"' : '"below O"'}`, lx, Y(f.yc) - 14, { color: P.mark, align: 'left', pri: 8, size: 13, weight: 700 });
  }
  // the readouts: top-left (and on a laptop the top-right clock)
  if (!phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H }); L.reserve({ x: w - 150, y: 0, w: 150, h: 60 }); }
  else L.reserve({ x: 0, y: 0, w: w * 0.6, h: 80 });
  L.draw(g, w, h);
  return null;
}
