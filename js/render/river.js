// river.js — the stage for a river crossing, from above at one scale: two
// grassy banks with trees, landing stages at A and (opposite) B, the water
// flowing between them, ripples drifting downstream with the clock; the boat
// pointing the way it is steered — upstream of straight across — while it
// moves over the ground along its resultant, its wake behind; the width as a
// bracket, the current's arrow on the water, and the velocity triangle drawn
// beside the river: through the water, the current, and the sum.
// Along the banks is horizontal, so dashed; across is vertical, so solid
// (rule 2); a slanting velocity is solid.
//
// Everything that moves is read from js/core/river.js (rule 4).

import { pulse, splash, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, sig3, hudBoxes, withAlpha } from './util.js';
import { fitSide, env, rng, softShadow, treeAbove, paper } from './scenery.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;

/** A small boat from above, centred at (x, y), L px long, its bow along `ang` (screen radians). */
function boat(g, x, y, L, ang) {
  const E = env();
  g.save(); g.translate(x, y); g.rotate(ang);
  softShadow(g, 2, 3, L * 0.55, L * 0.2, 0.5);
  const hg = g.createLinearGradient(0, -L * 0.2, 0, L * 0.2);
  hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, E.night ? '#9aa2ad' : '#c9d0d8');
  g.fillStyle = hg; g.beginPath();
  g.moveTo(L * 0.5, 0); g.quadraticCurveTo(L * 0.25, -L * 0.2, -L * 0.45, -L * 0.17); g.lineTo(-L * 0.5, 0); g.lineTo(-L * 0.45, L * 0.17); g.quadraticCurveTo(L * 0.25, L * 0.2, L * 0.5, 0);
  g.closePath(); g.fill(); g.strokeStyle = '#2f5d9b'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#8a6a48'; for (const sx of [-0.25, 0.05]) g.fillRect(L * sx, -L * 0.13, L * 0.06, L * 0.26);
  g.fillStyle = '#3c4048'; g.fillRect(-L * 0.5, -L * 0.06, L * 0.08, L * 0.12);
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'river') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520, E = env(), r = rng(9);
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 4); for (const b of HB) L.reserve(b);

  // ── the frame: the river across, both banks, the drift, room for the triangle
  const d = f.d, xs = [0, f.drift];
  // on a phone: the river beside the readouts, the triangle on the near bank below it
  const box = { xLo: Math.min(...xs) - d * 0.5, xHi: Math.max(...xs) + d * (phone ? 0.5 : 1.7), yLo: -d * (phone ? 0.9 : 0.3), yHi: d * 1.25 };
  const area = { left: HB[0].w + (phone ? 8 : 20), right: w - (phone ? 8 : 18), top: phone ? 24 : 20, bottom: h - 12 };
  const { k, X, Y } = fitSide(box, area, { sky: 0.5 });
  // the banks: grass, an earth edge, trees from above
  g.fillStyle = E.night ? '#2f3d29' : '#7f9a5e'; g.fillRect(0, 0, w, h);
  // the water, with ripples drifting downstream
  const yA = Y(0), yB = Y(d);
  const wg = g.createLinearGradient(0, yB, 0, yA);
  wg.addColorStop(0, E.night ? '#1d3a52' : '#3f7ea6'); wg.addColorStop(0.5, E.night ? '#24476a' : '#4f93bd'); wg.addColorStop(1, E.night ? '#1d3a52' : '#3f7ea6');
  g.fillStyle = wg; g.fillRect(0, yB, w, yA - yB);
  g.strokeStyle = withAlpha('#ffffff', E.night ? 0.18 : 0.3); g.lineWidth = 1.4;
  const shift = (f.w * t * k) % 60;
  for (let row = 0; row < 7; row++) { const yy = yB + ((row + 0.5) / 7) * (yA - yB); for (let x = -60 + shift + (row % 2) * 30; x < w + 60; x += 60) { g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + 10, yy - 3, x + 22, yy); g.stroke(); } }
  // the earth edges
  g.fillStyle = E.night ? '#4a3d30' : '#9a7b58'; g.fillRect(0, yB - 4, w, 5); g.fillRect(0, yA - 1, w, 5);
  // trees along both banks, clear of the jetties
  for (let i = 0; i < 14; i++) { const tx = r() * w, top = i % 2; if (Math.abs(tx - X(0)) < 40 || Math.abs(tx - X(f.drift)) < 40) continue; const ty = top ? yB - 20 - r() * Math.max(10, yB - 30) : yA + 20 + r() * Math.max(10, h - yA - 30); treeAbove(g, tx, ty, clamp(k * 1.6, 10, 26), { seed: i }); }
  // the landing stages at A and opposite it, B
  for (const [yy, up] of [[yA, -1], [yB, 1]]) { g.fillStyle = E.night ? '#6a5640' : '#b48a5e'; g.fillRect(X(0) - 10, yy + (up < 0 ? -12 : 0), 20, 14); g.strokeStyle = '#5a4430'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(X(0) - 10, yy + (up < 0 ? -12 : 0) + i * 3.5); g.lineTo(X(0) + 10, yy + (up < 0 ? -12 : 0) + i * 3.5); g.stroke(); } }
  const bl = clamp(k * 3, 40, 70);
  L.add('A', X(0) - bl * 0.7, yA + 12, { color: P.ink, align: 'right', pri: 10, size: 15, weight: 700 });
  L.add('B', X(0) - bl * 0.7, yB - 12, { color: P.ink, align: 'right', pri: 10, size: 15, weight: 700 });

  // ── the current, on the water
  const cy = yB + (yA - yB) * 0.82, cl = clamp(f.w * k * 1.2, 30, 90), cx0 = X(0) + clamp(d * k * 0.35, 40, 120);
  arrow(g, cx0, cy, cx0 + cl, cy, { color: P.velVec, width: 2.4, head: 9, dash: [6, 4] });
  L.add(T`w = ${sig3(f.w)} [m s^-1]`, cx0 + cl / 2, cy + 16, { color: P.velVec, align: 'center', pri: 8, size: 13, weight: 700 });

  // ── the track, the wake, the boat steered at alpha
  const p = f.pos(t), bx = X(p.x), by = Y(p.y);
  stroke(g, [{ x: X(0), y: yA }, { x: X(f.drift), y: yB }], { color: P.disp, width: 1.4, alpha: 0.4, dash: [3, 4] });
  if (t > 0) { stroke(g, [{ x: X(0), y: yA }, { x: bx, y: by }], { color: P.disp, width: 2.6 }); for (let i = 1; i <= 5; i++) { g.strokeStyle = withAlpha('#ffffff', 0.4 - i * 0.06); g.lineWidth = 1.5; g.beginPath(); g.arc(bx + Math.cos(f.alpha * Math.PI / 180) * i * 5, by + Math.sin(f.alpha * Math.PI / 180) * i * 5, 4 + i * 3, 0, TAU); g.stroke(); } }
  // heading: upstream (−x) at alpha to the bank, towards the far bank (screen up)
  const heading = Math.atan2(-Math.sin(f.alpha * Math.PI / 180), -Math.cos(f.alpha * Math.PI / 180));
  boat(g, bx, by, bl, heading);
  L.reserve({ x: bx - bl * 0.6, y: by - bl * 0.6, w: bl * 1.2, h: bl * 1.2 });
  if (show.velocity !== false && t < f.tMax - 1e-9) {
    const len = clamp(f.R * k * 1.4, 30, 90), ang = Math.atan2(-f.vy, f.vx);
    arrow(g, bx + bl * 0.5, by, bx + bl * 0.5 + Math.cos(ang) * len, by + Math.sin(ang) * len, { color: P.vel, width: 2.6, head: 10 });
    L.add(T`${sig3(f.R)} [m s^-1]`, bx + bl * 0.5 + Math.cos(ang) * len + 8, by + Math.sin(ang) * len - 4, { color: P.vel, align: 'left', pri: 8, size: 13, weight: 700 });
  }
  { const { age, life } = ageOf(t, f.tMax, f.tMax); pulse(g, X(f.drift), yB, age, life, P.mark, { radius: 34 }); splash(g, X(f.drift), yB + 6, age, life, { size: 1.2 }); }
  // with a heading given, the drift along the far bank
  if (Math.abs(f.drift) > 1e-9) {
    stroke(g, [{ x: X(0), y: yB - 14 }, { x: X(f.drift), y: yB - 14 }], { color: P.disp, width: 1.8, dash: [6, 4] });
    for (const xx of [X(0), X(f.drift)]) stroke(g, [{ x: xx, y: yB - 20 }, { x: xx, y: yB - 8 }], { color: P.disp, width: 1.8 });
    L.add(T`${sig3(Math.abs(f.drift))} [m] ${f.drift > 0 ? '"downstream"' : '"upstream"'}`, (X(0) + X(f.drift)) / 2, yB - 28, { color: P.disp, align: 'center', pri: 10, size: 14, weight: 700 });
  }

  // ── the width as a bracket
  const wx = X(Math.min(...xs)) - Math.max(36, k * 3);
  stroke(g, [{ x: wx, y: yA }, { x: wx, y: yB }], { color: P.disp, width: 1.8 });
  for (const yy of [yA, yB]) stroke(g, [{ x: wx - 6, y: yy }, { x: wx + 6, y: yy }], { color: P.disp, width: 1.8 });
  L.add(T`${sig3(d)} [m]`, wx - 8, (yA + yB) / 2, { color: P.disp, align: 'right', pri: 9, size: 14, weight: 700 });

  // ── the velocity triangle: through the water + the current = over the ground
  {
    const ca = Math.cos(f.alpha * Math.PI / 180), sa = Math.sin(f.alpha * Math.PI / 180);
    const pts = [[0, 0], [-f.V * ca, f.V * sa], [-f.V * ca + f.w, f.V * sa]];
    const minX = Math.min(...pts.map((q) => q[0])), maxX = Math.max(...pts.map((q) => q[0])), maxY = Math.max(...pts.map((q) => q[1]));
    const room = phone ? { x0: area.left, x1: w - 10, y0: yA + 26, y1: h - 14 } : { x0: X(Math.max(...xs) + d * 0.45), x1: area.right, y0: yB + 6, y1: yA - 6 };
    const sc = Math.min((room.x1 - room.x0 - 80) / Math.max(1e-6, maxX - minX), (room.y1 - room.y0 - 60) / Math.max(1e-6, maxY));
    if (sc > 6) {
      const s2 = Math.min(sc, 70), cw = (maxX - minX) * s2 + 80, ch = maxY * s2 + 60;
      const cx = (room.x0 + room.x1) / 2 - cw / 2, cyy = (room.y0 + room.y1) / 2 - ch / 2;
      paper(g, cx, cyy, cw, ch);
      L.reserve({ x: cx, y: cyy, w: cw, h: ch });
      const ox = cx + 40 - minX * s2, oy2 = cyy + ch - 30, P2 = (q) => ({ x: ox + q[0] * s2, y: oy2 - q[1] * s2 });
      const o2 = P2(pts[0]), v2 = P2(pts[1]), r2 = P2(pts[2]);
      // the bank's direction through the origin, and the angle from upstream
      stroke(g, [{ x: cx + 8, y: oy2 }, { x: cx + cw - 8, y: oy2 }], { color: P.muted, width: 1, dash: [3, 3] });
      g.strokeStyle = P.strong; g.lineWidth = 1.6; g.beginPath(); g.arc(o2.x, o2.y, 22, Math.PI + 0, Math.PI + f.alpha * Math.PI / 180, true); g.stroke();
      arrow(g, o2.x, o2.y, v2.x, v2.y, { color: P.vel, width: 2.6, head: 10 });
      arrow(g, v2.x, v2.y, r2.x, r2.y, { color: P.velVec, width: 2.4, head: 9, dash: [6, 4] });
      arrow(g, o2.x, o2.y, r2.x, r2.y, { color: P.vel, width: 3, head: 11 });
      const lab = (t2, q, dx, dy, color, al) => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = color; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(t2, q.x + dx, q.y + dy); g.restore(); };
      lab(T`V = ${sig3(f.V)}`, { x: (o2.x + v2.x) / 2, y: (o2.y + v2.y) / 2 }, -8, 0, P.vel, 'right');
      lab(T`w = ${sig3(f.w)}`, { x: (v2.x + r2.x) / 2, y: v2.y }, 0, -12, P.velVec, 'center');
      lab(T`v = ${sig3(f.R)}`, { x: (o2.x + r2.x) / 2, y: (o2.y + r2.y) / 2 }, 10, 0, P.vel, 'left');
      lab(T`alpha = ${num(f.alpha, 1)}°`, o2, -28, -10, P.strong, 'right');
      lab('speeds in m s⁻¹', { x: cx + cw / 2, y: cyy + ch - 10 }, 0, 0, P.muted, 'center');
    }
  }
  if (t >= f.tMax - 1e-9) L.add(T`"across in" ${sig3(f.T)} [s]`, X(f.drift) + 18, yB - 16, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
  L.draw(g, w, h);
  return null;
}
