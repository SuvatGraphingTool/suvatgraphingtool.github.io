// airdrag.js — the stage for one fall, two models: a city street side on, a
// block of flats, the ball let go from its roof. Two drops side by side, on
// the same clock: the model with no air resistance, a pale ghost of the ball
// in the second object's stone, and the ball itself with the air against it.
// Its forces ride on it while it falls — the weight down, the resistance up,
// to one scale, in ink — and a wisp of air streams past it. Each lands where
// the engine says, with a puff of dust and its speed on a plate; the ghost,
// falling at g, lands first.
//
// Everything drawn is read from js/core/airdrag.js (rule 4).

import { PLACE_ART } from './places.js';
import { pulse, ageOf, dust } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, withAlpha, unview, hudBoxes, ballSprite, cssVar } from './util.js';
import { env, paper } from './scenery.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const tr = (x) => num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x) || 1))), { trim: true });   // three significant figures, as the paper

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'airdrag') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, phone ? 2 : 4); for (const b of HB) L.reserve(b);

  // ── one vertical scale: the top to the street. Below about 6 m it is a back garden's
  //    upstairs window or shed roof, not a block of flats
  const oy = h - clamp(h * 0.16, 44, 90), top = Math.max(phone ? HB[0].h + 40 : 70, 60);
  const k = (oy - top) / f.h, Y = (fallen) => top + fallen * k;
  const x0 = phone ? Math.round(w * 0.4) : Math.round(Math.max(HB[0].x + HB[0].w + 150, w * 0.34));
  const r = clamp(k * 0.3, 13, 20), gap = clamp(w * 0.11, 70, 150);
  const xBall = x0 + 30, xGhost = xBall + gap;
  const place = f.h < 6 ? 'garden' : 'city';
  PLACE_ART[place](g, { w, h, k, oy, x0, top, H0: f.h, phase: t, P, clearX: [xBall, xGhost], reserve: (b) => L.reserve(b) });

  // ── the height, on the block's face, left of the drop: nothing crosses the lanes
  const dimX = x0 - 14;
  stroke(g, [{ x: dimX, y: top }, { x: dimX, y: oy }], { color: P.disp, width: 1.6 });
  for (const y of [top, oy]) stroke(g, [{ x: dimX - 6, y }, { x: dimX + 6, y }], { color: P.disp, width: 1.6 });
  L.add(T`${tr(f.h)} [m]`, dimX - 10, (top + oy) / 2, { color: P.disp, size: 14, weight: 700, align: 'right' });
  L.add('with air resistance', xBall - 8, top - 16, { color: P.ink, size: 13, weight: 700, align: 'right' });
  L.add('with none', xGhost + 8, top - 16, { color: P.second, size: 13, weight: 700, align: 'left' });

  // ── each drop's track: faint dots, and a strobe of where it was at equal times (the free one spreads faster)
  for (const [x, col] of [[xBall, P.disp], [xGhost, P.second]]) { g.save(); g.setLineDash([1, 6]); g.lineCap = 'round'; stroke(g, [{ x, y: top }, { x, y: oy }], { color: col, width: 1.6, alpha: 0.35 }); g.restore(); }
  if (fired && t > 0) {
    const dt = f.tMax / 9;
    for (let tt = dt; tt < t - dt * 0.3; tt += dt) {
      if (tt <= f.t1) { g.save(); g.globalAlpha = 0.22; ballSprite(g, xBall, Math.min(Y(f.fallDrag(tt)), oy - r), r * 0.8); g.restore(); }
      if (tt <= f.t0) { g.save(); g.globalAlpha = 0.18; ballSprite(g, xGhost, Math.min(Y(f.fallFree(tt)), oy - r), r * 0.8); g.restore(); }
    }
  }

  // ── landings: dust, a squash and a scuff that stays, the speed on a plate outside each lane
  const yG = Y(f.fallFree(t)), yB = Y(f.fallDrag(t));
  for (const [tl, x, v, side] of [[f.t0, xGhost, f.v0, 1], [f.t1, xBall, f.v1, -1]]) {
    if (!fired || t < tl - 1e-9) continue;
    const { age, life } = ageOf(t, tl, f.tMax);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, oy + 2, r * 1.1, r * 0.25, 0, 0, TAU); g.fill();
    dust(g, x, oy, age, life, { size: clamp(r / 8, 0.8, 1.6) });
    pulse(g, x, oy - r, age, life, P.mark, { radius: r * 3 });
    L.add(T`${tr(v)} [m s^-1]`, x + side * (r + 16), oy - r * 2.2, { color: P.vel, size: 14, weight: 700, align: side > 0 ? 'left' : 'right' });
  }

  // ── the balls: the ghost pale with its rim in the second object's stone; the ball itself, cream
  const squash = (tl) => (fired && t >= tl && t - tl < f.tMax * 0.03 ? 0.7 : 1);
  const yGb = Math.min(yG, oy - r), yBb = Math.min(yB, oy - r);
  g.save(); g.globalAlpha = 0.4; g.translate(xGhost, yGb + r * (1 - squash(f.t0))); g.scale(1 / squash(f.t0), squash(f.t0)); ballSprite(g, 0, 0, r); g.restore();
  g.strokeStyle = withAlpha(P.second, 0.85); g.lineWidth = 2; g.beginPath(); g.arc(xGhost, yGb, r + 1, 0, TAU); g.stroke();
  const falling = fired && t > 0 && t < f.t1;
  if (falling) {
    // the air streaming past: curved wake lines above it, longer and brighter as it speeds up
    const q = clamp(f.velDrag(t) / Math.max(f.v1, 1e-9), 0, 1);
    g.save(); g.strokeStyle = withAlpha(E.night ? '#cfe3ea' : '#ffffff', 0.25 + 0.4 * q); g.lineWidth = 1.4;
    for (const dx of [-0.75, -0.25, 0.25, 0.75]) { const sx = xBall + dx * r, l = r * (1 + 2.5 * q) * (1 - Math.abs(dx) * 0.4);
      g.beginPath(); g.moveTo(sx, yBb - r * 0.6); g.quadraticCurveTo(sx + dx * r * 0.6, yBb - r - l * 0.5, sx + dx * r * 0.9, yBb - r - l); g.stroke(); }
    g.restore();
  }
  g.save(); g.translate(xBall, yBb + r * (1 - squash(f.t1))); g.scale(1 / squash(f.t1), squash(f.t1)); ballSprite(g, 0, 0, r); g.restore();

  // each one's velocity, straight down (solid: vertical, rule 2), beside its ball, long enough to read
  if (fired && t > 0) {
    const vs = clamp(k * 2.2, 60, 140) / f.v0;
    for (const [x, yb, v, done, nm] of [[xGhost, yGb, f.velFree(t), t >= f.t0, 'v_0'], [xBall, yBb, f.velDrag(t), t >= f.t1, 'v']]) {
      if (done) continue;
      const len = Math.max(22, v * vs), end = Math.min(oy - 2, yb + len);
      arrow(g, x + r + 10, yb, x + r + 10, end, { color: P.vel, width: 2.4, head: 9 });
      L.add(T`${nm}`, x + r + 20, (yb + end) / 2, { color: P.vel, size: 14, weight: 700, align: 'left' });
    }
  }
  L.draw(g, w, h);

  // ── the forces on the ball as it falls, on a card of their own: an enlarged ball, its weight down and the
  //    air resistance up from its centre, to one scale (the screen's, out of the pan and zoom)
  unview(g);
  if (f.m != null && f.R != null) {
    const cw = phone ? 150 : 190, ch = phone ? 150 : 170, cx = w - cw - 14, cy = h - ch - 14;
    paper(g, cx, cy, cw, ch);
    const txt = (s0, x, y, c, al = 'left', size = 13) => { g.save(); g.font = `700 ${size}px ${cssVar('--font', 'system-ui, sans-serif')}`; g.fillStyle = c; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s0, x, y); g.restore(); };
    txt('The forces on the ball', cx + 12, cy + 16, P.muted);
    const bx = cx + 52, by = cy + ch * 0.55, W = f.m * f.g, sc = (ch * 0.36) / W, br = 12;
    ballSprite(g, bx, by, br);
    arrow(g, bx, by, bx, by + W * sc, { color: P.ink, width: 2.4, head: 9 });
    if (f.R > 1e-9) arrow(g, bx, by, bx, by - Math.max(24, f.R * sc), { color: P.ink, width: 2.4, head: 9 });
    txt(T`mg = ${tr(W)} [N]`, bx + 18, by + W * sc - 6, P.ink);
    if (f.R > 1e-9) txt(T`R = ${tr(f.R)} [N]`, bx + 18, by - Math.max(24, f.R * sc) + 6, P.ink);
    else txt('no air resistance', bx + 18, by - 24, P.muted);
  }
  return null;
}
