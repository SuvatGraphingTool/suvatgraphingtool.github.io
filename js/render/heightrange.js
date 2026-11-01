// heightrange.js — the stage for "higher than it goes far": a launcher on a
// park's level ground, side on at one scale both ways; faintly, the arcs at
// 15°, 30°, 45°, 60° and 75° at the same speed; the arc at the threshold angle
// dashed and named; the throw itself, flown strongly, with its greatest height
// and its range as brackets in the displacement hue, so the two lengths the
// question compares stand side by side. The ball's velocity: across dashed,
// up solid (rule 2). Dust where it lands.
//
// Everything drawn is read from js/core/heightrange.js (rule 4).

import { dust, pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, sig3, hudBoxes, withAlpha } from './util.js';
import { skyscape, grass, fitSide, env, softShadow } from './scenery.js';
import { runner } from './figures.js';
import { farField, nearGrass, parkTree } from './towards.js';
import { ballAt } from './figures.js';
import { T, num } from '../notation.js';

/** A ball launcher set into the ground, cut away: its barrel's mouth level
    with the grass at (x, y), the barrel running back down into a lined pit
    at the angle, a hub with bolts at its foot. `s` is the barrel's length in
    px; `dir` −1 mirrors it. */
function launcher(g, x, y, s, theta, dir = 1) {
  const E = env(), metal = E.night ? '#9aa0ab' : '#5a6270', dark = E.night ? '#3e424b' : '#2b3039', lit = E.night ? '#d4d8de' : '#e2e6ec';
  const a = (theta * Math.PI) / 180, ca = Math.cos(a) * dir, sa = Math.sin(a), bw = Math.max(8, s * 0.2);
  const tail = { x: x - ca * s, y: y + sa * s };
  // the pit: earth cut away round the barrel, edged with boards
  const pw = Math.abs(ca) * s + bw * 2.2, pd = sa * s + bw * 1.4, px0 = Math.min(x, tail.x) - bw * 0.9;
  const eg = g.createLinearGradient(0, y, 0, y + pd);
  eg.addColorStop(0, E.night ? '#3d3129' : '#6e5643'); eg.addColorStop(1, E.night ? '#211a16' : '#3f3128');
  g.fillStyle = eg; g.beginPath(); g.moveTo(px0, y); g.lineTo(px0 + pw, y); g.lineTo(px0 + pw - bw * 0.4, y + pd); g.lineTo(px0 + bw * 0.4, y + pd); g.closePath(); g.fill();
  g.strokeStyle = E.night ? '#5a4a3a' : '#8c6d4f'; g.lineWidth = 2; g.stroke();
  // the hub at the foot, with bolts
  const hr = Math.max(6, bw * 0.9);
  g.fillStyle = dark; g.beginPath(); g.arc(tail.x, tail.y, hr, 0, Math.PI * 2); g.fill();
  g.fillStyle = metal; for (let i = 0; i < 6; i++) { const b = (i / 6) * Math.PI * 2; g.beginPath(); g.arc(tail.x + Math.cos(b) * hr * 0.65, tail.y + Math.sin(b) * hr * 0.65, Math.max(1.2, hr * 0.12), 0, Math.PI * 2); g.fill(); }
  // the barrel: a rounded tube, lit along its top edge, with a ring at the mouth
  g.save(); g.translate(x, y); g.rotate(-a * dir); if (dir < 0) g.scale(-1, 1);
  const bg = g.createLinearGradient(0, -bw / 2, 0, bw / 2);
  bg.addColorStop(0, lit); bg.addColorStop(0.35, metal); bg.addColorStop(1, dark);
  g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(-s, -bw / 2, s, bw, bw / 2) : g.rect(-s, -bw / 2, s, bw); g.fill();
  g.fillStyle = dark; g.fillRect(-bw * 0.5, -bw / 2 - 2, bw * 0.45, bw + 4);
  g.fillStyle = lit; g.fillRect(-bw * 0.42, -bw / 2 - 2, 2, bw + 4);
  g.restore();
  // the grass lip over the pit's near edge
  g.fillStyle = E.night ? '#3e5a35' : '#6f8f4f'; g.fillRect(px0 - 2, y - 1.5, pw + 4, 3);
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'heightrange') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 4); for (const b of HB) L.reserve(b);

  // ── the frame: the widest arc across, the highest up
  const arcs = [...f.fan, f.star];
  const xMax = Math.max(f.range, ...arcs.map((a) => a.R)), yMax = Math.max(f.apexHeight, ...arcs.map((a) => a.H));
  // on a phone the readouts fill the top left, so the throws go right to left
  const sd = phone ? -1 : 1;
  const box = phone ? { xLo: -xMax * 1.08, xHi: 0.12 * xMax, yLo: -0.12 * yMax, yHi: yMax * 1.12 } : { xLo: -0.1 * xMax, xHi: xMax * 1.08, yLo: -0.12 * yMax, yHi: yMax * 1.12 };
  const area = { left: phone ? 10 : HB[0].w + 22, right: w - (phone ? 10 : 18), top: phone ? HB[1].h + 8 : 26, bottom: h - 16 };
  const fit = fitSide(box, area, { sky: phone ? 0.4 : 0.8 }), k = fit.k, Y = fit.Y, X = (x) => fit.X(sd * x);
  const oy = Y(0), horizon = oy - clamp((oy - area.top) * 0.18, 20, 70);

  // ── the park
  skyscape(g, 0, 0, w, horizon, { seed: 71, far: 'trees' });
  farField(g, 0, w, horizon, oy);
  // trees to scale, about 9 m tall, and a person beside the launcher for size
  for (const [xx, sz, seed] of [[xMax * 1.04, 1.0, 3], [-0.07 * xMax - 2, 0.8, 5]]) parkTree(g, X(xx), horizon + (oy - horizon) * 0.35, k * 9 * sz, seed);
  grass(g, 0, w, oy, h, { seed: 17 });
  nearGrass(g, 0, w, oy, h, 31);

  // ── the fan, faintly, each named at its top; the threshold dashed
  const path = (a, n = 90) => { const out = []; for (let i = 0; i <= n; i++) { const q = a.pos((i / n) * a.tMax); out.push({ x: X(q.x), y: Y(q.y) }); } return out; };
  for (const a of f.fan) {
    stroke(g, path(a), { color: withAlpha(P.ink, 0.6), width: 1.2, alpha: 0.35 });
    const top = a.top;
    L.add(T`${num(a.theta, 0)}°`, X(top.x), Y(top.y) - 10, { color: P.muted, align: 'center', pri: 3, size: 13 });
  }
  const sp = path(f.star);
  stroke(g, sp, { color: P.mark, width: 2, dash: [6, 5] });
  // on a phone the threshold's top is under the readouts: it is named in the corner instead
  if (phone) L.add(`dashed: ${num(f.thStar, 1)}°`, w - 12, area.top + 60, { color: P.mark, align: 'right', pri: 10, size: 13, weight: 700 });
  else { const top = f.star.top; L.add( `${num(f.thStar, 1)}°, height ${f.ratio === 1 ? '=' : `= ${num(f.ratio, 2, { trim: true })} ×`} range`, X(top.x) + 12, Y(top.y) - 4, { color: P.mark, align: 'left', pri: 8, size: 14, weight: 700 }); }

  // ── the throw: launcher, path, ball, velocity
  runner(g, X(-1.6) + sd * k * 0.2, oy, k * 1.7, P, { dir: sd, still: true });
  const ls = clamp(k * 1.6, 40, 70), pitD = Math.sin(f.params.theta * Math.PI / 180) * ls + Math.max(8, ls * 0.2) * 1.4;
  launcher(g, X(0), oy, ls, f.params.theta, sd);
  // labels keep off the launcher's pit
  L.reserve({ x: Math.min(X(0), X(0) - sd * Math.cos(f.params.theta * Math.PI / 180) * ls) - ls * 0.3, y: oy - 4, w: Math.abs(Math.cos(f.params.theta * Math.PI / 180) * ls) + ls * 0.6, h: pitD + 6 });
  const n = 120, pts = []; for (let i = 0; i <= n; i++) { const q = f.pos((i / n) * f.tMax); pts.push({ x: X(q.x), y: Y(q.y) }); }
  stroke(g, pts, { color: P.disp, width: 1.8, alpha: 0.35 });
  const so = []; for (let i = 0; i <= 60; i++) { const q = f.pos((i / 60) * t); so.push({ x: X(q.x), y: Y(q.y) }); }
  if (t > 0) stroke(g, so, { color: P.disp, width: 3 });
  for (const p of path(f.star, 40)) L.reserve({ x: p.x - 3, y: p.y - 3, w: 6, h: 6 });
  for (const p of pts) L.reserve({ x: p.x - 4, y: p.y - 4, w: 8, h: 8 });
  const b = f.pos(t), v = f.vel(t), bx = X(b.x), by = Y(b.y);
  if (show.velocity !== false && t > 0 && t < f.tMax - 1e-9) {
    const sc = clamp(k * 0.25, 2, 6), s = sc * sd;
    if (show.components) {
      arrow(g, bx, by, bx + v.x * s, by, { color: P.velVec, width: 2, head: 8, dash: [5, 4] });
      arrow(g, bx + v.x * s, by, bx + v.x * s, by - v.y * sc, { color: P.velVec, width: 2, head: 8 });
    }
    arrow(g, bx, by, bx + v.x * s, by - v.y * sc, { color: P.vel, width: 2.6, head: 10 });
  }
  { const { age, life } = ageOf(t, f.tMax, f.tMax); dust(g, X(f.range), oy, age, life, { size: 2.2, n: 26 }); pulse(g, X(f.range), oy - 4, age, life, P.mark, { radius: 22 }); }
  ballAt(g, bx, by, clamp(k * 0.35, 9, 12));

  // ── the two lengths it compares: H up from the top's foot, R along the ground
  const hx = X(f.top.x);
  stroke(g, [{ x: hx, y: oy }, { x: hx, y: Y(f.H) }], { color: P.disp, width: 2 });
  for (const yy of [oy, Y(f.H)]) stroke(g, [{ x: hx - 6, y: yy }, { x: hx + 6, y: yy }], { color: P.disp, width: 2 });
  // on a phone the readouts cover the bracket's side, so H is said under R
  if (phone) for (const [txt, dy] of [[T`H = ${sig3(f.H)} [m]`, 12], [T`R = ${sig3(f.R)} [m]`, 36]]) L.add(txt, w - 12, area.top + dy, { color: P.disp, align: 'right', pri: 10, size: 14, weight: 700 });
  else L.add(T`H = ${sig3(f.H)} [m]`, hx + sd * 10, (oy + Y(f.H)) * 0.5, { color: P.disp, align: sd > 0 ? 'left' : 'right', pri: 10, size: 14, weight: 700 });
  // the range below the pit, so its bar never crosses the barrel
  const ry = oy + pitD + 12;
  L.reserve({ x: Math.min(X(0), X(f.range)) - 6, y: ry - 7, w: Math.abs(X(f.range) - X(0)) + 12, h: 14 });
  stroke(g, [{ x: X(0), y: ry }, { x: X(f.range), y: ry }], { color: P.disp, width: 2 });
  for (const xx of [X(0), X(f.range)]) stroke(g, [{ x: xx, y: ry - 6 }, { x: xx, y: ry + 6 }], { color: P.disp, width: 2 });
  if (!phone) L.add(T`R = ${sig3(f.R)} [m]`, (X(0) + X(f.range)) / 2, ry + 15, { color: P.disp, align: 'center', pri: 10, size: 14, weight: 700 });
  // the angle at the launcher
  L.add(T`theta = ${num(f.params.theta, 1)}°`, X(0) - sd * 14, oy + 36, { color: P.strong, align: sd > 0 ? 'right' : 'left', pri: 7, size: 14, weight: 700 });
  if (t >= f.tMax - 1e-9) L.add(f.verdict === 'higher' ? 'higher than it goes far' : f.verdict === 'equal' ? 'exactly as high as it goes far' : 'not as high as it goes far', phone ? w / 2 : (area.left + area.right) / 2, phone ? h - 12 : area.top + 12, { color: f.verdict === 'lower' ? P.muted : P.mark, align: 'center', pri: 11, size: 14, weight: 700 });
  L.draw(g, w, h);
  return null;
}
