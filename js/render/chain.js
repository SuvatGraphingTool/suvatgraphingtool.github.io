// chain.js — the stage for a motion in stages along one line: a car on a
// straight road, a cyclist, a train on a line, a runner on a track.
//
// Side on, the whole distance at one scale, as a place: a sky with far
// hills, the far verge with a hedge and street lamps (overhead wires and
// masts for a railway), the road with its kerb and pavement, the near verge.
// A real roadside sign where each stage begins — its number, or the post's
// letter — and one at the end; each stage's distance as a dimension line
// under the road; the vehicle where it is now. Over each stage, what it does
// there — speeding up, slowing down or steady — and the speed at each sign
// once it has passed. Velocity along the road is dashed (rule 2); so is the
// acceleration.
//
// THE MOMENTS: arriving at each sign pulses its plate, the end pulses too,
// and a vehicle that comes to rest kicks up a little dust; the brake lights
// glow while it slows. Every one at the engine's own times.
//
// Everything drawn is read from js/core/chain.js or js/core/posts.js (rule 4).

import { landscape, rng, tarmac, env, stone, paper } from './scenery.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow } from './util.js';
import { drawFigure, phaseFor, post, surface, FIGURES, lampPost, hedge, tree, bush, pavement, catenary, trainRoof } from './figures.js';
import { pulse, dust, ageOf, speedLines } from './effects.js';
import { T, num } from '../notation.js';

/** A measured number: three significant figures, trailing zeros dropped (12, 26.7, 0.2). */
const q = (x) => {
  if (!isFinite(x) || Math.abs(x) < 1e-12) return num(0, 0);
  return num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)))), { trim: true });
};

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'chain') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const kind = FIGURES[f.look] ? f.look : 'car', K = FIGURES[kind];
  const rail = K.ground === 'rail', road = K.ground === 'road', cars = rail ? (K.cars || 2) : 1;

  // ── the figure's size: a tenth of the width (a train two carriages long)
  const narrow = w < 520;
  const base = narrow ? Math.max(68, w * 0.18) : clamp(w * 0.11, 56, 116);
  const size = rail ? base * 1.9 : Math.max(K.min || 0, base);
  const tr = rail ? trainRoof(size, cars) : null;
  const panto = rail ? clamp(tr.H * 0.6, 10, 18) : 0;
  const figTop = rail ? tr.roof + panto : K.tall ? size * 0.95 : size * 0.42;

  // ── one scale for the whole line, displacements forwards and back; room
  // for the whole figure behind the first sign, and its arrow past the last
  const xs = [0, ...f.S.flatMap((x) => [x.x0, x.x1])];
  for (const x of f.S) if (x.xTurn != null) xs.push(x.xTurn);
  const lo = Math.min(...xs), hi = Math.max(...xs);
  const left = 16 + size, right = w - Math.max(60, w * 0.1) - 10;
  const k = (right - left) / ((hi - lo) || 1);
  const X = (x) => left + (x - lo) * k;
  // the ground, top to bottom: the far verge, the road (the figure in its
  // near lane), the kerb and pavement, the ruler card, a wall along the bottom
  const lane = road ? 20 : 0, rd = road ? 26 : rail ? 20 : 16;
  const rows = Math.min(2, f.S.length), cardH = 12 + rows * 50, wallH = clamp(h * 0.05, 18, 26);
  const under = rd - lane + (road ? 22 : 8);              // wheel line to the card's top
  const Y = Math.round(clamp(h - wallH - 14 - cardH - under, h * 0.5, h * 0.68));
  const yR = Y - lane;                                      // the far edge of the road
  const hz = yR - Math.max(34, h * 0.08);

  // ── the place
  landscape(g, w, h, hz, { far: rail ? 'trees' : 'hills', seed: 5, farHeight: Math.min(80, h * 0.14) });
  const r = rng(9);
  for (let x = 30 + r() * 80; x < w; x += 150 + r() * 160) tree(g, x, hz + 6, clamp(h * 0.17, 60, 96), { seed: Math.floor(x) });
  if (road) {
    hedge(g, 0, w, yR - 3, 14, { seed: 4 });
    const lampH = clamp(h * 0.3, 96, 150);
    for (let x = 70 + r() * 40; x < w; x += clamp(w * 0.3, 170, 260)) lampPost(g, x, yR - 4, lampH);
  } else if (!rail) hedge(g, 0, w, Y - 3, 12, { seed: 6 });
  if (road) tarmac(g, 0, w, yR, { depth: rd, verge: false }); else surface(g, K.ground, 0, w, Y, P);
  if (rail) catenary(g, 0, w, Y - 3, Y - tr.roof - panto, { spacing: clamp(w * 0.22, 120, 200) });
  if (road) {
    pavement(g, 0, w, yR + rd + 4, 18);
    // street furniture on the pavement's back edge: bollards, a bin
    const E = env();
    for (let x = 40 + r() * 50; x < w; x += 120 + r() * 90) {
      g.fillStyle = E.night ? '#3a3236' : '#4d4646'; g.beginPath(); g.roundRect(x - 2.5, yR + rd + 8, 5, 12, 2); g.fill();
      g.fillStyle = E.night ? '#d8d0cc' : '#f2ede9'; g.fillRect(x - 2.5, yR + rd + 10, 5, 2);
    }
  }
  // the near ground: a low stone wall along the bottom, bushes before it
  const cardTop = Y + under, cardB = cardTop + cardH;
  stone(g, 0, h - wallH, w, wallH + 2, { course: 8, seed: 3 });
  for (let x = 20 + r() * 60; x < w; x += 90 + r() * 110) bush(g, x, h - wallH + 4, clamp(h * 0.028, 9, 15), { seed: Math.floor(x) });

  // ── the signs: one where each stage begins, one at the end
  const postH = figTop + 16 + 22 + 30;
  const x = f.pos(t), v = f.vel(t), a = f.acc(t), vMax = Math.max(...f.S.flatMap((s) => [Math.abs(s.u), Math.abs(s.v)]), 1e-6);
  const end = f.S[f.S.length - 1];
  const signs = [...f.S.map((s) => ({ at: s.x0, name: s.name || String(s.i), u: s.u, t: s.t0 })),
    { at: end.x1, name: end.end || 'End', u: end.v, t: f.tMax }];
  const plateY = Y - 3 - (postH - 3) - 12;
  for (const s of signs) post(g, L, X(s.at), yR - 3, s.name, P.mark, P, { height: postH - 3 - lane });
  signs.forEach((s, i) => {
    const passed = t >= s.t - 1e-9;
    // the speed there once it has passed; while the figure is at it, its own
    // label says it. Beside the plate; on a phone, over one plate and under the next, in turn
    const here = Math.abs(X(x) - X(s.at)) < size * 0.6;
    if (passed && !here) {
      if (narrow) L.add(T`${q(s.u)} [m s^-1]`, X(s.at), i % 2 ? plateY + 26 : plateY - 28, { color: P.vel, align: 'center', pri: 6, size: 13, weight: 700, maxPush: 20 });
      else L.add(T`${q(s.u)} [m s^-1]`, X(s.at) + 22, plateY, { color: P.vel, align: 'left', pri: 6, size: 13, weight: 700, maxPush: 20 });
    }
    if (s.t > 1e-9) { const { age, life } = ageOf(t, s.t, f.tMax, f.tMax / 8); pulse(g, X(s.at), plateY, age, life, P.mark, { radius: 30 }); }
  });

  // ── each stage's distance on a card under the road, and what it does there
  paper(g, 8, cardTop, w - 16, cardB - cardTop, { step: 14 });
  const row0 = cardTop + 12;
  f.S.forEach((s, i) => {
    const dy = row0 + (i % 2) * 50;
    stroke(g, [{ x: X(s.x0), y: dy }, { x: X(s.x1), y: dy }], { color: P.ink, width: 1.2, alpha: 0.85 });
    for (const xx of [X(s.x0), X(s.x1)]) stroke(g, [{ x: xx, y: dy - 5 }, { x: xx, y: dy + 5 }], { color: P.ink, width: 1.2, alpha: 0.85 });
    L.add(T`${q(s.s)} [m], ${q(s.t)} [s]`, (X(s.x0) + X(s.x1)) / 2, dy + 14, { color: P.ink, align: 'center', pri: 6, size: 13, weight: 700 });
    L.add(`${s.does}, ${T`a = ${q(s.a)} [m s^-2]`}`, (X(s.x0) + X(s.x1)) / 2, dy + 37, { color: P.acc, align: 'center', pri: 5, size: 13, weight: 700 });
  });

  // ── the figure, its velocity and acceleration (along the road: dashed)
  const dir = v < -1e-9 ? -1 : 1, fx = X(x);
  speedLines(g, fx - dir * size * 1.02, Y - figTop * 0.45, dir, (Math.abs(v) / vMax - 0.45) * 1.6, P.ink);
  drawFigure(g, kind, fx, Y, size, P, { dir, cars, panto, phase: phaseFor(kind, size, Math.abs(fx - X(0)), { cars }), brake: v * a < -1e-9 });
  if (Math.abs(end.v) < 1e-9) { const { age, life } = ageOf(t, f.tMax, f.tMax, f.tMax / 8); dust(g, fx - dir * size * 0.25, Y, age, life, { size: 0.8 }); }
  const vy = Y - figTop - 16;
  if (show.velocity !== false && Math.abs(v) > 1e-6) {
    const room = dir > 0 ? w - 14 - fx : fx - 14;
    const len = Math.min(80 * Math.abs(v) / vMax, room) * dir;
    L.reserve({ x: Math.min(fx, fx + len) - 2, y: vy - 5, w: Math.abs(len) + 4, h: 10 });
    arrow(g, fx, vy, fx + len, vy, { color: P.velVec, width: 2.6, head: 10, dash: [6, 4] });
    const tip = fx + len, ahead = dir > 0 ? w - tip : tip;
    if (ahead > 96) L.add(T`${q(Math.abs(v))} [m s^-1]`, tip + dir * 8, vy, { color: P.vel, align: dir > 0 ? 'left' : 'right', pri: 8, size: 14, weight: 700 });
    else L.add(T`${q(Math.abs(v))} [m s^-1]`, tip, vy - (show.acceleration ? 37 : 18), { color: P.vel, align: dir > 0 ? 'right' : 'left', pri: 8, size: 14, weight: 700 });
  }
  if (show.acceleration && Math.abs(a) > 1e-9) {
    const ax = fx;
    L.reserve({ x: Math.min(ax, ax + Math.sign(a) * 40) - 2, y: vy - 25, w: 44, h: 10 });
    arrow(g, ax, vy - 20, ax + Math.sign(a) * 40, vy - 20, { color: P.acc, width: 2.2, head: 9, dash: [6, 4] });
  }
  L.draw(g, w, h);
  return null;
}
