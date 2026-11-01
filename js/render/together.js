// together.js — the stage for two stones that land together: a stone tower
// on a green, side on at one scale, one person on each side of its
// battlements; the first lets a stone fall down the left face, the second
// waits the delay and throws one straight down the right face; both stones
// strike the grass at the same instant, with dust and rings, and the run
// holds a moment so the impact plays out. The height as a bracket; each
// stone's velocity (vertical, so solid — rule 2). A low height is a garden
// wall, not a tower.
//
// Everything that moves is read from js/core/together.js (rule 4).

import { dust, pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, sig3, hudBoxes } from './util.js';
import { skyscape, grass, fitSide, env, stone } from './scenery.js';
import { tower } from './heights.js';
import { nearGrass, parkTree } from './towards.js';
import { thrower, throwerHand } from './figures.js';
import { T, num } from '../notation.js';

const PERSON = 1.7, TAU = Math.PI * 2;

/** A stone: an irregular grey pebble, lit from the upper left, `r` px across its middle. */
function pebble(g, x, y, r, ring) {
  const E = env();
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  gr.addColorStop(0, E.night ? '#b9b4ae' : '#d8d2ca'); gr.addColorStop(0.6, E.night ? '#7c7670' : '#9a928a'); gr.addColorStop(1, E.night ? '#4a4540' : '#6a625b');
  g.fillStyle = gr; g.beginPath();
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * TAU, q = r * (0.86 + 0.14 * Math.sin(a * 3 + 1.3)); i ? g.lineTo(x + Math.cos(a) * q * 1.1, y + Math.sin(a) * q * 0.9) : g.moveTo(x + Math.cos(a) * q * 1.1, y + Math.sin(a) * q * 0.9); }
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.stroke();
  if (ring) { g.strokeStyle = ring; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, r * 1.25 + 3, 0, TAU); g.stroke(); }
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'together') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 4); for (const b of HB) L.reserve(b);

  // ── the frame: the tower (or a wall, when it is low) between the two drops
  const low = f.h < 5, half = low ? 0.35 : clamp(f.h * 0.14, 1.4, 4);   // half the tower's width, m
  const reach = 0.45;                                                      // a hand out past the parapet, m
  const xs = [-half - reach, half + reach];
  const box = { xLo: xs[0] - 1.6, xHi: xs[1] + 4.6, yLo: -0.1 * f.h - 0.5, yHi: f.h + PERSON * 0.5 + 0.6 };
  const area = { left: HB[0].w + (phone ? 6 : 24), right: w - (phone ? 8 : 18), top: phone ? 24 : 26, bottom: h - 14 };
  const { k, X, Y } = fitSide(box, area, { sky: 0.5 });
  const H = clamp(PERSON * k, 34, 90), hand = throwerHand(H, -15);
  const oy = Y(0), top = Y(f.h) + hand.y, horizon = oy - clamp((oy - top) * 0.3, 20, 90);
  skyscape(g, 0, 0, w, horizon, { seed: 81, far: 'hills' });
  grass(g, 0, w, horizon, h, { seed: 21 });
  for (const [xx, sd] of [[X(box.xHi) + 30, 4], [X(box.xLo) - 50, 6]]) parkTree(g, xx, horizon + (oy - horizon) * 0.45, clamp(k * 6, 60, 160), sd);
  nearGrass(g, 0, w, oy, h, 27);
  if (low) stone(g, X(-half), top, X(half) - X(-half), oy - top, { seed: 5 });
  else tower(g, X(half), top, oy, X(half) - X(-half));

  // ── one person on each side, a hand out over the stone's line, holding it until it goes
  const people = [{ dir: -1, x: xs[0], t0: 0, ring: null }, { dir: 1, x: xs[1], t0: f.d, ring: P.second }];
  for (const p of people) thrower(g, X(p.x) - p.dir * hand.x, top, H, P, { dir: p.dir, pose: 1, aim: -15, ring: p.ring });

  // ── the height, as a bracket beyond the right-hand stone; labels keep off it
  const hx = X(xs[1]) + Math.max(130, k * 3);
  stroke(g, [{ x: hx, y: oy }, { x: hx, y: Y(f.h) }], { color: P.disp, width: 1.8 });
  for (const yy of [oy, Y(f.h)]) stroke(g, [{ x: hx - 6, y: yy }, { x: hx + 6, y: yy }], { color: P.disp, width: 1.8 });
  stroke(g, [{ x: X(xs[1]) + 10, y: Y(f.h) }, { x: hx, y: Y(f.h) }], { color: P.muted, width: 1, alpha: 0.6, dash: [4, 4] });
  L.reserve({ x: hx - 8, y: Y(f.h), w: 16, h: oy - Y(f.h) });
  L.add(T`h = ${sig3(f.h)} [m]`, hx + 16, (oy + Y(f.h)) / 2, { color: P.disp, align: 'left', pri: 9, size: 14, weight: 700 });

  // ── the stones, each down its own face, landing together
  const r = clamp(k * 0.1, 6, 9);
  const who = [{ p: people[0], pos: f.posA, vel: f.velA, seed: 3 }, { p: people[1], pos: f.posB, vel: f.velB, seed: 9 }];
  for (const s of who) {
    const y = s.pos(t), sx = X(s.p.x), sy = Y(y) - r;                  // the stone's bottom at its height
    if (t > s.p.t0) stroke(g, [{ x: sx, y: Y(f.h) }, { x: sx, y: sy }], { color: P.muted, width: 1.4, alpha: 0.35 });
    const { age, life } = ageOf(t, f.T, f.tMax, f.tMax - f.T);
    dust(g, sx, oy, age, life, { size: 1.8, n: 22, seed: s.seed });
    pulse(g, sx, oy - r, age, life, s.p.ring || P.mark, { radius: 26 });
    pebble(g, sx, sy, r, s.p.ring);
    L.reserve({ x: sx - r - 6, y: sy - r - 6, w: 2 * r + 12, h: 2 * r + 12 });
    const v = s.vel(t);
    if (show.velocity !== false && t > s.p.t0 && t < f.T - 1e-9) {
      const len = Math.max(18, Math.abs(v) * k * 0.12), ax = sx + s.p.dir * (r + 8);
      arrow(g, ax, sy, ax, sy + len, { color: P.vel, width: 2.4, head: 9 });
      L.reserve({ x: ax - 6, y: sy, w: 12, h: len });
      L.add(T`${sig3(Math.abs(v))} [m s^-1]`, ax + s.p.dir * 12, sy + len * 0.6, { color: P.vel, align: s.p.dir > 0 ? 'left' : 'right', pri: 7, size: 13, weight: 700 });
    }
  }
  // the moment's message: over the battlements, or on a phone along the foot, clear of the readouts
  const msgAt = phone ? [(area.left + area.right) / 2, h - 12] : [X(0), Math.max(top - H - 16, 34)];
  if (t > 0 && t < f.d) L.add(T`"the second waits" ${num(f.d, 2, { trim: true })} [s]`, ...msgAt, { color: P.second, align: 'center', pri: 8, size: 13, weight: 700 });
  if (t >= f.T - 1e-9) L.add(T`"together," T = ${sig3(f.T)} [s]`, ...msgAt, { color: P.mark, align: 'center', pri: 9, size: 14, weight: 700 });
  L.draw(g, w, h);
  return null;
}
