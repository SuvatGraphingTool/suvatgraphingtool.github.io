// chain.js — the stage for a motion in stages along one line: a car on a
// straight race track, a cyclist on a road, a train on a line.
//
// Side on, the whole distance at one scale: the road (or the rails), a post
// where each stage begins with its number, each stage's distance as a
// dimension line under the road, and the vehicle where it is now. Over each
// stage, what it does there — speeding up, slowing down or steady — and the
// speeds at each post once it has passed. Velocity along the road is dashed
// (rule 2); so is the acceleration.
//
// Everything drawn is read from js/core/chain.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow } from './util.js';
import { drawFigure, phaseFor, post, surface, FIGURES } from './figures.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'chain') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const kind = FIGURES[f.look] ? f.look : 'car', K = FIGURES[kind];

  // ── one scale for the whole line, displacements forwards and back
  const xs = [0, ...f.S.flatMap((x) => [x.x0, x.x1])];
  for (const x of f.S) if (x.xTurn != null) xs.push(x.xTurn);
  const lo = Math.min(...xs), hi = Math.max(...xs);
  // the road low, clear of the readouts top left
  const left = 40, right = w - 50, Y = Math.max(h * 0.5, h - 140);
  const k = (right - left) / ((hi - lo) || 1);
  const X = (x) => left + (x - lo) * k;
  surface(g, K.ground, 0, w, Y, P);

  // ── a post where each stage begins, and its distance under the road
  f.S.forEach((x, i) => {
    post(g, L, X(x.x0), Y, String(x.i), P.mark, P, { height: 60 });
    const passed = t >= x.t0 - 1e-9;
    if (passed) L.add(T`${tr(x.u)} [m s^-1]`, X(x.x0) + 20, Y - 74, { color: P.vel, align: 'left', pri: 6, size: 13, weight: 700 });
    const dy = Y + 34 + (i % 2) * 40;
    stroke(g, [{ x: X(x.x0), y: dy }, { x: X(x.x1), y: dy }], { color: P.ink, width: 1.2, alpha: 0.8 });
    for (const xx of [X(x.x0), X(x.x1)]) stroke(g, [{ x: xx, y: dy - 5 }, { x: xx, y: dy + 5 }], { color: P.ink, width: 1.2, alpha: 0.8 });
    L.add(T`${tr(x.s)} [m], ${tr(x.t)} [s]`, (X(x.x0) + X(x.x1)) / 2, dy + 13, { color: P.ink, align: 'center', pri: 6, size: 13, weight: 700 });
    const wide = X(x.x1) - X(x.x0) > 240;
    L.add(`${wide ? `${x.does}, ` : ''}${T`a = ${tr(x.a)} [m s^-2]`}`, (X(x.x0) + X(x.x1)) / 2, dy + 30, { color: P.acc, align: 'center', pri: 5, size: 13, weight: 700 });
  });
  const end = f.S[f.S.length - 1];
  stroke(g, [{ x: X(end.x1), y: Y + 6 }, { x: X(end.x1), y: Y - 40 }], { color: P.mark, width: 2.4 });
  if (t >= f.tMax - 1e-9) L.add(T`${tr(end.v)} [m s^-1]`, X(end.x1) - 8, Y - 52, { color: P.vel, align: 'right', pri: 7, size: 13, weight: 700 });

  // ── the vehicle, its velocity and acceleration (along the road: dashed)
  const x = f.pos(t), v = f.vel(t), a = f.acc(t);
  const size = Math.max(K.min || 40, Math.min(90, w * 0.07));
  const dir = v < -1e-9 ? -1 : 1;
  drawFigure(g, kind, X(x), Y, size, P, { dir, phase: phaseFor(kind, size, Math.abs(X(x) - X(0))) });
  const vMax = Math.max(...f.S.flatMap((s) => [Math.abs(s.u), Math.abs(s.v)]), 1e-6);
  if (show.velocity !== false && Math.abs(v) > 1e-6) {
    const len = Math.max(0, Math.min(80, v > 0 ? w - 90 - X(x) : X(x) - 20)) * Math.sign(v) * Math.min(1, Math.abs(v) / vMax);
    arrow(g, X(x), Y - size * 0.9, X(x) + len, Y - size * 0.9, { color: P.velVec, width: 2.6, head: 10, dash: [6, 4] });
    L.add(T`${tr(Math.abs(v), 2)} [m s^-1]`, X(x) + len + (v > 0 ? 8 : -8), Y - size * 0.9, { color: P.vel, align: v > 0 ? 'left' : 'right', pri: 8, size: 14, weight: 700 });
  }
  if (show.acceleration && Math.abs(a) > 1e-9) arrow(g, X(x), Y - size * 0.9 - 22, X(x) + Math.sign(a) * 40, Y - size * 0.9 - 22, { color: P.acc, width: 2.2, head: 9, dash: [6, 4] });
  L.draw(g, w, h);
  return null;
}
