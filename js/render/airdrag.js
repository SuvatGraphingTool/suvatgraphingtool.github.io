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
import { fitCanvas, palette, clamp, labels, stroke, arrow, withAlpha, unview, hudBoxes } from './util.js';
import { env } from './scenery.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const tr = (x) => num(x, Math.abs(x) < 10 ? 2 : 1, { trim: true });

/** A ball, shaded: (x, y), radius r; a ghost of it when `ghost`. */
function ball(g, x, y, r, ghost, color) {
  g.save();
  if (ghost) {
    g.globalAlpha = 0.55; g.strokeStyle = color; g.lineWidth = 2; g.setLineDash([]);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.fillStyle = withAlpha(color, 0.25); g.fill();
  } else {
    const bg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    bg.addColorStop(0, '#ffe7a8'); bg.addColorStop(0.5, '#f0a83a'); bg.addColorStop(1, '#a55a12');
    g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = 'rgba(80,40,10,0.5)'; g.beginPath(); g.arc(x, y, r * 0.8, -0.6, 1.2); g.stroke();
  }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'airdrag') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, phone ? 2 : 4); for (const b of HB) L.reserve(b);

  // ── one vertical scale: the roof to the street
  const oy = h - clamp(h * 0.16, 44, 90), top = Math.max(phone ? HB[0].h + 40 : 70, 60);
  const k = (oy - top) / f.h, Y = (fallen) => top + fallen * k;
  const x0 = phone ? Math.round(w * 0.46) : Math.round(Math.max(HB[0].w + 160, w * 0.36));
  const r = clamp(k * 0.3, 13, 20), gap = clamp(w * 0.09, 56, 110);
  const xBall = x0 + 28, xGhost = xBall + gap;
  PLACE_ART.city(g, { w, h, k, oy, x0, top, H0: f.h, phase: t, P, clearX: [xBall, xGhost], reserve: (b) => L.reserve(b) });

  // ── the height, beside the block
  const dimX = xGhost + Math.max(40, gap * 0.6);
  stroke(g, [{ x: dimX, y: top }, { x: dimX, y: oy }], { color: P.disp, width: 1.4 });
  for (const y of [top, oy]) stroke(g, [{ x: dimX - 6, y }, { x: dimX + 6, y }], { color: P.disp, width: 1.4 });
  L.add(T`${tr(f.h)} [m]`, dimX + 10, (top + oy) / 2, { color: P.disp, size: 14, weight: 700, align: 'left' });

  // ── the two drops: each one's path, faint, and the line it has fallen
  const yG = Y(f.fallFree(t)), yB = Y(f.fallDrag(t));
  stroke(g, [{ x: xGhost, y: top }, { x: xGhost, y: oy }], { color: P.second, width: 1.2, alpha: 0.35 });
  stroke(g, [{ x: xBall, y: top }, { x: xBall, y: oy }], { color: P.disp, width: 1.2, alpha: 0.35 });
  stroke(g, [{ x: xGhost, y: top }, { x: xGhost, y: yG }], { color: P.second, width: 2.4 });
  stroke(g, [{ x: xBall, y: top }, { x: xBall, y: yB }], { color: P.disp, width: 2.6 });
  L.add('no air resistance', xGhost + 12, top - 16, { color: P.second, size: 13, weight: 700, align: 'left' });
  L.add('with it', xBall - 6, top - 16, { color: P.disp, size: 13, weight: 700, align: 'right' });

  // ── landings: dust and a plate with the speed, each at the engine's moment
  for (const [tl, x, v, col] of [[f.t0, xGhost, f.v0, P.second], [f.t1, xBall, f.v1, P.vel]]) {
    if (!fired || t < tl - 1e-9) continue;
    const { age, life } = ageOf(t, tl, f.tMax);
    dust(g, x, oy, age, life, { size: clamp(r / 8, 0.8, 1.6) });
    pulse(g, x, oy - r, age, life, col, { radius: r * 3 });
    L.add(T`${tr(v)} [m s^-1]`, x + (x === xGhost ? 14 : -14), oy - r * 2.6, { color: col, size: 14, weight: 700, align: x === xGhost ? 'left' : 'right' });
  }

  // ── the balls, the air streaming past the real one, its forces on it while it falls
  const yGb = Math.min(yG, oy - r), yBb = Math.min(yB, oy - r);
  ball(g, xGhost, yGb, r, true, P.second);
  const falling = fired && t > 0 && t < f.t1;
  if (falling) {
    g.save(); g.strokeStyle = withAlpha(E.night ? '#cfe3ea' : '#ffffff', 0.55); g.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) { const sx = xBall + i * r * 0.7, l = r * (1.6 + Math.abs(i) * -0.5) * clamp(f.velDrag(t) / f.v1, 0.3, 1); g.beginPath(); g.moveTo(sx, yBb - r - 3); g.lineTo(sx + i * 2, yBb - r - 3 - l); g.stroke(); }
    g.restore();
  }
  ball(g, xBall, yBb, r, false);
  if (f.m != null && f.R != null && (falling || !fired || t === 0)) {
    const W = f.m * f.g, sc = clamp(k * 1.2, 30, 70) / W;
    arrow(g, xBall - r - 14, yBb, xBall - r - 14, yBb + W * sc, { color: P.ink, width: 2.2, head: 8 });
    if (f.R > 1e-9) arrow(g, xBall - r - 14, yBb, xBall - r - 14, yBb - Math.max(12, f.R * sc), { color: P.ink, width: 2.2, head: 8 });
    L.add(T`mg = ${tr(W)} [N]`, xBall - r - 22, yBb + W * sc * 0.75, { color: P.ink, size: 13, weight: 700, align: 'right' });
    if (f.R > 1e-9) L.add(T`R = ${tr(f.R)} [N]`, xBall - r - 22, yBb - Math.max(12, f.R * sc) * 0.8 - 6, { color: P.ink, size: 13, weight: 700, align: 'right' });
  }
  // each one's velocity, down (solid: vertical, rule 2), beside its ball
  if (fired && t > 0) {
    const vs = clamp(k * 2.2, 50, 130) / f.v0;
    for (const [x, yb, v, done] of [[xGhost, yGb, f.velFree(t), t >= f.t0], [xBall, yBb, f.velDrag(t), t >= f.t1]]) {
      if (done) continue;
      arrow(g, x + r + 10, yb, x + r + 10, yb + v * vs, { color: P.vel, width: 2.4, head: 9 });
    }
  }

  L.draw(g, w, h);
  unview(g);
  return null;
}
