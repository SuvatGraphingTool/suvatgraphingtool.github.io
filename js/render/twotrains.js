// twotrains.js — the stage for two trains on parallel tracks between the same
// two stations: side on at one scale, as a railway. Two tracks (`rails`),
// each under its own overhead wire on steel masts (`catenary`); a station at
// each end (`station`, exported: an island platform between the tracks with
// yellow edge lines, a canopy on columns, a lamp, a bench, passengers, the
// name board on its roof);
// and each train (`train` from figures.js), three carriages long, where it is
// now — A on the near track, B on the far one outlined in the second object's
// colour, each with its letter on a disc on its side. The gap between their
// fronts is a dimension line with its length; at a time asked it is written
// out; each moment they move at the same speed is marked as it passes.
// Velocities along the track are dashed and in the velocity hue (rule 2).
//
// THE MOMENTS: the same speed pulses at both fronts, the time asked pulses
// on the gap, and arriving at the next station pulses at the stop line; the
// tail lamps glow while a train slows. Every one at the engine's own times.
//
// Everything drawn is read from js/core/twotrains.js (rule 4).

import { landscape, env, rng, stone } from './scenery.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, withAlpha } from './util.js';
import { rails, train, phaseFor, catenary, trainRoof, tree, bush, pavement, runner } from './figures.js';
import { pulse, ageOf } from './effects.js';
import { T, num } from '../notation.js';

/** A measured number: three significant figures, trailing zeros dropped (20, 33.3, 0.667). */
const q = (x) => {
  if (!isFinite(x) || Math.abs(x) < 1e-12) return num(0, 0);
  return num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)))), { trim: true });
};

/**
 * A station at x, where the trains' fronts stand: an island platform between
 * the two tracks, reaching back `length` px from x — its paved top seen from
 * a little above, from the far track's edge (rail head at `top`) to the near
 * track's (at `bottom`), a yellow line and coping along both edges, the brick
 * face over the near track, a canopy on columns down its middle with a lamp
 * under it, the name board standing on the canopy, a bench and passengers
 * waiting. A dashed stop line runs across both tracks. `floor` is the height
 * of a train's floor above the rail, `roof` the canopy's underside. Draw it
 * after the far track's train (the platform edge hides that train's wheels)
 * and before the near track.
 */
export function station(g, L, x, top, bottom, name, P, { length = 120, floor = 8, roof = top - 60, seed = 1 } = {}) {
  const E = env(), x0 = x - length, x1 = x + 12, far = top - floor, near = bottom - floor, midY = (far + near) / 2;
  const q = rng(seed);
  g.save();
  // the paved top, darker towards the far edge; slab joints
  const pv = g.createLinearGradient(0, far, 0, near);
  pv.addColorStop(0, E.night ? '#4a4044' : '#b4aaa5'); pv.addColorStop(1, E.night ? '#5f5559' : '#cfc5bf');
  g.fillStyle = pv; g.fillRect(x0, far, x1 - x0, near - far);
  g.strokeStyle = withAlpha(E.night ? '#000000' : '#7d7470', 0.25); g.lineWidth = 1;
  g.beginPath();
  for (let y = far + 9; y < near - 4; y += 9) { g.moveTo(x0, y); g.lineTo(x1, y); }
  for (let xx = x0 + 14; xx < x1; xx += 22) { g.moveTo(xx, far + 4); g.lineTo(xx - 3, near - 4); }
  g.stroke();
  // both edges: coping, and the yellow line just inside it
  for (const [y, yl] of [[far, far + 3], [near - 3, near - 6]]) {
    g.fillStyle = E.night ? '#8d8287' : '#e7e0da'; g.fillRect(x0 - 1, y, x1 - x0 + 2, 3);
    g.fillStyle = '#e8b730'; g.fillRect(x0, yl, x1 - x0, 1.8);
  }
  // the brick face over the near track
  const face = g.createLinearGradient(0, near, 0, bottom + 4);
  face.addColorStop(0, E.night ? '#6a4a40' : '#a8705a'); face.addColorStop(1, E.night ? '#4a332d' : '#86563f');
  g.fillStyle = face; g.fillRect(x0, near, x1 - x0, bottom + 4 - near);
  g.strokeStyle = withAlpha(E.night ? '#000000' : '#5d3a2b', 0.35);
  g.beginPath();
  for (let y = near + 3.5, row = 0; y < bottom + 4; y += 3.5, row++) { g.moveTo(x0, y); g.lineTo(x1, y); for (let bx = x0 + (row % 2) * 5; bx < x1; bx += 10) { g.moveTo(bx, y - 3.5); g.lineTo(bx, y); } }
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0, near, x1 - x0, 1.5);
  // the canopy's columns down the middle
  const cTop = roof - 9, cols = Math.max(2, Math.round((x1 - x0) / 50));
  for (let i = 0; i <= cols; i++) {
    const cx = x0 + 10 + ((x1 - x0 - 20) * i) / cols;
    const cg = g.createLinearGradient(cx - 2, 0, cx + 2, 0); cg.addColorStop(0, E.night ? '#7a6f74' : '#6f8199'); cg.addColorStop(1, E.night ? '#3d3438' : '#46546a');
    g.fillStyle = cg; g.fillRect(cx - 2, roof, 4, midY - roof);
    g.fillStyle = E.night ? '#3d3438' : '#46546a'; g.fillRect(cx - 3.5, midY - 2, 7, 2.5);
  }
  if (E.night) { const lg = g.createLinearGradient(0, roof, 0, midY); lg.addColorStop(0, withAlpha(E.window, 0.2)); lg.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = lg; g.fillRect(x0 + 2, roof, x1 - x0 - 4, midY - roof); }
  g.fillStyle = E.night ? '#4a4044' : '#55627a';
  g.beginPath(); g.moveTo(x0 - 8, roof); g.lineTo(x0 - 2, cTop); g.lineTo(x1 + 2, cTop); g.lineTo(x1 + 8, roof); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#8d8287' : '#e7e0da'; g.fillRect(x0 - 8, roof, x1 - x0 + 16, 3);
  // a lamp under the canopy
  const lx = x0 + (x1 - x0) * 0.22;
  g.strokeStyle = E.night ? '#3d3438' : '#46546a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(lx, roof + 3); g.lineTo(lx, roof + 9); g.stroke();
  g.fillStyle = E.night ? '#fff1cf' : '#f4efe4'; g.beginPath(); g.arc(lx, roof + 11, 2.6, 0, Math.PI * 2); g.fill();
  if (E.night) { const gl = g.createRadialGradient(lx, roof + 11, 0, lx, roof + 11, 22); gl.addColorStop(0, withAlpha(E.window, 0.45)); gl.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = gl; g.beginPath(); g.arc(lx, roof + 11, 22, 0, Math.PI * 2); g.fill(); }
  // a bench, and passengers waiting
  const bx0 = x0 + (x1 - x0) * 0.55;
  g.fillStyle = E.night ? '#5a463b' : '#8a6a52'; g.fillRect(bx0, midY + 4, 22, 3); g.fillRect(bx0, midY - 3, 22, 2.5);
  g.fillStyle = '#2b2628'; g.fillRect(bx0 + 2, midY + 7, 2, 4); g.fillRect(bx0 + 18, midY + 7, 2, 4);
  const ph = clamp((near - far) * 0.6, 24, 40);
  runner(g, x0 + (x1 - x0) * (0.3 + q() * 0.1), midY + 10, ph, P, { still: true, dir: -1 });
  runner(g, x0 + (x1 - x0) * (0.8 + q() * 0.08), midY + 14, ph * 0.95, P, { still: true, ring: E.night ? '#8a6f62' : '#9c7b6a' });
  // the name board, standing on the canopy on two legs
  g.font = '700 13px system-ui, sans-serif';
  const mw = Number(g.measureText?.(name)?.width), bw = (isFinite(mw) ? mw : name.length * 8) + 16, bx = (x0 + x1) / 2 - bw / 2, by = cTop - 26;
  g.strokeStyle = E.night ? '#3d3438' : '#46546a'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(bx + 8, by + 20); g.lineTo(bx + 8, cTop); g.moveTo(bx + bw - 8, by + 20); g.lineTo(bx + bw - 8, cTop); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.roundRect(bx + 1.5, by + 2, bw, 20, 3); g.fill();
  g.fillStyle = '#24364f'; g.beginPath(); g.roundRect(bx, by, bw, 20, 3); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1; g.beginPath(); g.roundRect(bx + 2, by + 2, bw - 4, 16, 2); g.stroke();
  g.restore();
  L.add(name, bx + bw / 2, by + 10, { color: '#ffffff', align: 'center', pri: 9, size: 13, weight: 700, bg: false });
  // the stop line, across both tracks
  stroke(g, [{ x, y: far - 6 }, { x, y: bottom + 16 }], { color: P.ink, width: 1.4, dash: [4, 4], alpha: 0.8 });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'twotrains') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the trains: three carriages (two on a phone), a quarter of the width
  const narrow = w < 520, cars = narrow ? 2 : 3;
  const trainL = clamp(w * 0.24, 100, 210);
  const { roof, H } = trainRoof(trainL, cars), panto = clamp(H * 0.55, 9, 16), wire = roof + panto;
  // ── one scale: station to station, a whole train behind each stop line
  const left = 18 + trainL, right = w - 40;
  const k = (right - left) / f.D, X = (x) => left + x * k;
  // the far track at half the height, the near one below it, its wire clear of the far ballast
  const yB = Math.round(Math.min(h * 0.6, h - 200)), yA = Math.round(yB + wire + 34);
  const hz = yB - Math.max(40, h * 0.09);

  // ── the place
  landscape(g, w, h, hz, { far: 'hills', seed: 13, farHeight: Math.min(80, h * 0.14) });
  const r = rng(21);
  for (let x = 40 + r() * 90; x < w; x += 140 + r() * 170) tree(g, x, hz + 6, clamp(h * 0.16, 56, 90), { seed: Math.floor(x) });
  const plat = [[X(0) - trainL - 8, X(0) + 12], [X(f.D) - trainL - 8, X(f.D) + 12]];
  const floorH = trainRoof(trainL, cars).roof - H + 2;
  const sp = clamp(w * 0.22, 120, 200);
  catenary(g, 0, w, yB - 3, yB - wire, { spacing: sp, avoid: plat });
  rails(g, 0, w, yB, P);

  // ── each train, its front at its position; its letter on a disc on its side
  const xa = f.posA(t), xb = f.posB(t);
  const vMax = f.vMax, mid = (y) => y - roof + H * 0.5;
  const rows = [
    { n: 'B', x: xb, y: yB, v: f.velB(t), a: f.accB(t), ring: P.second, disc: P.second },
    { n: 'A', x: xa, y: yA, v: f.velA(t), a: f.accA(t), ring: null, disc: '#24364f' },
  ];
  // the far train, then the island platforms in front of it, then the near track and train
  const drawTrain = (s) => {
    const fx = X(s.x);
    train(g, fx, s.y, trainL, P, { dir: 1, cars, panto, ring: s.ring, phase: phaseFor('train', trainL, fx - X(0), { cars }), brake: s.v > 1e-6 && s.a < -1e-9 });
    const c = (trainL - (cars - 1) * Math.max(3, trainL * 0.025)) / cars;
    const dx = fx - c * 0.5, dy = s.y - roof + H * 0.42;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(dx + 1, dy + 1.5, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = s.disc; g.beginPath(); g.arc(dx, dy, 10, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.6; g.stroke();
    g.restore();
    L.add(s.n, dx, dy, { color: '#ffffff', align: 'center', pri: 10, size: 14, weight: 700, bg: false });
    if (show.velocity !== false && s.v > 1e-6) {
      const len = Math.min(70, (s.v / vMax) * 70), ay = mid(s.y);
      arrow(g, fx + 6, ay, fx + 6 + len, ay, { color: P.velVec, width: 2.6, head: 9, dash: [6, 4] });
      L.add(T`${q(s.v)} [m s^-1]`, fx + 14 + len, ay, { color: P.vel, align: 'left', pri: 7, size: 13, weight: 700 });
    }
  };
  drawTrain(rows[0]);
  [[X(0), 'Station 1'], [X(f.D), 'Station 2']].forEach(([x, name], i) => station(g, L, x, yB, yA, name, P, { length: trainL + 8, floor: floorH, roof: yB - wire - 12, seed: 3 + i }));
  catenary(g, 0, w, yA - 3, yA - wire, { spacing: sp, from: sp * 0.6, avoid: plat });
  rails(g, 0, w, yA, P);
  pavement(g, 0, w, yA + 22, 6);                       // the lineside cable trough
  // the near ground: a low stone wall along the bottom, bushes before it
  const wallH = clamp(h * 0.07, 22, 38);
  stone(g, 0, h - wallH, w, wallH + 2, { course: 9, seed: 5 });
  for (let x = 20 + r() * 60; x < w; x += 90 + r() * 110) bush(g, x, h - wallH + 5, clamp(h * 0.03, 10, 16), { seed: Math.floor(x) });
  drawTrain(rows[1]);

  // ── the moments: the same speed, the time asked, the arrival
  const life = f.tMax / 9;
  for (const te of f.eq) {
    const { age } = ageOf(t, te, f.tMax, life);
    for (const s of rows) pulse(g, X(s.x), mid(s.y), age, life, P.mark, { radius: 30 });
  }
  { const { age } = ageOf(t, f.tMax, f.tMax, life); for (const s of rows) pulse(g, X(f.D), mid(s.y), age, life, P.mark, { radius: 34 }); }

  // ── the gap between their fronts, and the moments asked about
  const gx0 = X(Math.min(xa, xb)), gx1 = X(Math.max(xa, xb)), gy = yA + 34;
  if (gx1 - gx0 > 2) {
    stroke(g, [{ x: gx0, y: gy }, { x: gx1, y: gy }], { color: P.mark, width: 1.6 });
    for (const xx of [gx0, gx1]) stroke(g, [{ x: xx, y: gy - 5 }, { x: xx, y: gy + 5 }], { color: P.mark, width: 1.6 });
    L.add(T`${q(f.gapAt(t))} [m] "apart"`, (gx0 + gx1) / 2, gy + 16, { color: P.mark, align: 'center', pri: 8, size: 13, weight: 700 });
  }
  if (f.ask != null) { const { age } = ageOf(t, f.ask, f.tMax, life); pulse(g, (gx0 + gx1) / 2, gy, age, life, P.mark, { radius: 40 }); }
  const passed = f.eq.filter((te) => t >= te - 1e-9);
  if (passed.length) L.add(`same speed at ${passed.map((te) => T`t = ${q(te)} [s]`).join(', ')}`, w / 2, hz - 34, { color: P.mark, align: 'center', pri: 6, size: 13, weight: 700 });
  if (f.ask != null && t >= f.ask - 1e-9) L.add(`at ${T`t = ${q(f.ask)} [s]`}, ${T`${q(f.gap)} [m]`} apart`, w / 2, yA + 72, { color: P.mark, align: 'center', pri: 9, size: 14, weight: 700 });
  L.draw(g, w, h);
  return null;
}
