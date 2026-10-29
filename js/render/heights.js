// heights.js — the stage for a throw from a height: a cliff over the sea, or
// a tower on flat ground.
//
// Side on, ONE scale both ways, so the drop is drawn to scale against the
// throw: a 49 m tower is 49 m tall beside a rise of 11 m. The place is drawn
// as the place — sky, a rock cliff with its strata and a grass top over a sea
// with its swell, or a stone tower on level ground — with the person who
// throws standing at the edge. The backdrop pieces (sky, sea, seaCliff, tower,
// groundStrip) are exported for any stage that needs them.
//
// Everything is background except the path, the ball and its arrows: held to
// low chroma, and the sea is a grey-blue, never the displacement hue. The
// height is a dimension line, the landing distance another; a height the
// paper asks about is a marker line in the marker colour, ringed where the
// ball crosses it. Velocity and its components are on the ball, across
// dashed and up solid (rule 2).
//
// Everything drawn is read from js/core/height.js and js/core/projectile.js
// (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha, cssVar } from './util.js';
import { runner } from './figures.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250, HUD_H = 290;
const EARTH = '#7d6a55', TILE = '#b9c3c8', TIMBER = '#8a6d4c';
const ROCK = '#8b8073', ROCK_D = '#5f574e', SEA = '#6f8796', SEA_D = '#4f6572', STONE = '#a59d92', STONE_D = '#6e675e';

/* ── backdrop pieces ─────────────────────────────────────────────────── */
/** Sky from the top of the box down to the horizon. */
export function sky(g, x0, y0, x1, horizon) {
  const gr = g.createLinearGradient(0, y0, 0, horizon);
  gr.addColorStop(0, cssVar('--sky-top', '#dfe8ee')); gr.addColorStop(1, cssVar('--sky-bottom', '#f4efe6'));
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, horizon - y0);
}
/** The sea from its surface at y = Y down, with a few lines of swell. */
export function sea(g, x0, x1, Y, bottom) {
  const gr = g.createLinearGradient(0, Y, 0, bottom);
  gr.addColorStop(0, withAlpha(SEA, 0.75)); gr.addColorStop(1, withAlpha(SEA_D, 0.9));
  g.fillStyle = gr; g.fillRect(x0, Y, x1 - x0, bottom - Y);
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2;
  for (let row = 0; row < 3; row++) {
    const yy = Y + 6 + row * 9;
    if (yy > bottom - 2) break;
    g.beginPath();
    for (let x = x0 + (row * 23) % 40; x < x1; x += 40) { g.moveTo(x, yy); g.quadraticCurveTo(x + 7, yy - 3, x + 14, yy); }
    g.stroke();
  }
  g.restore();
}
/** A rock cliff whose top edge is at (edge, top), standing on the sea at Y,
    reaching back to x0: strata across it, a grass cap, a face that leans
    back a little so a stone dropped from the edge falls clear of it. */
export function seaCliff(g, x0, edge, top, Y) {
  const H = Y - top, lean = Math.min(18, H * 0.08);
  const face = (y) => edge - lean * ((y - top) / Math.max(H, 1)) ** 1.4;
  g.save();
  g.beginPath(); g.moveTo(x0, top); g.lineTo(edge, top);
  for (let i = 1; i <= 12; i++) { const y = top + (H * i) / 12; g.lineTo(face(y) - (i % 3 === 1 ? 3 : 0), y); }
  g.lineTo(x0, Y); g.closePath();
  const gr = g.createLinearGradient(edge, 0, x0, 0);
  gr.addColorStop(0, withAlpha(ROCK, 0.95)); gr.addColorStop(1, withAlpha(ROCK_D, 0.95));
  g.fillStyle = gr; g.fill();
  g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1;
  for (let i = 1; i < 7; i++) { const y = top + (H * i) / 7; g.beginPath(); g.moveTo(x0, y); g.lineTo(edge, y + 3); g.stroke(); }
  g.restore();
  // the grass on top
  g.save(); g.fillStyle = cssVar('--grass', '#7c9a63'); g.fillRect(x0, top - 4, edge - x0, 5); g.restore();
  // the swell breaking at its foot
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(face(Y) - 2, Y - 1); g.quadraticCurveTo(face(Y) + 8, Y - 6, face(Y) + 18, Y); g.stroke(); g.restore();
}
/** A stone tower whose top edge is at (edge, top), standing on the ground
    at Y: courses of stone and a crenellated top. */
export function tower(g, edge, top, Y, width) {
  const x0 = edge - width;
  g.save();
  const gr = g.createLinearGradient(x0, 0, edge, 0);
  gr.addColorStop(0, withAlpha(STONE_D, 0.95)); gr.addColorStop(1, withAlpha(STONE, 0.95));
  g.fillStyle = gr; g.fillRect(x0, top, width, Y - top);
  g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 1;
  const course = Math.max(6, (Y - top) / 24);
  for (let y = top + course, i = 0; y < Y; y += course, i++) {
    g.beginPath(); g.moveTo(x0, y); g.lineTo(edge, y); g.stroke();
    for (let x = x0 + (i % 2 ? course : course * 2); x < edge; x += course * 2.4) { g.beginPath(); g.moveTo(x, y - course); g.lineTo(x, y); g.stroke(); }
  }
  // the battlements stand above the walkway the throw is made from
  g.fillStyle = withAlpha(STONE_D, 0.95);
  const merlon = Math.max(5, width / 7);
  for (let x = x0; x < edge - merlon * 0.5; x += merlon * 2) g.fillRect(x, top - merlon, merlon, merlon);
  g.restore();
}
/** Level ground from its surface at Y down. */
export function groundStrip(g, x0, x1, Y, bottom) {
  g.save(); g.fillStyle = withAlpha(cssVar('--grass', '#7c9a63'), 0.55); g.fillRect(x0, Y, x1 - x0, bottom - Y);
  g.strokeStyle = cssVar('--axis', 'rgba(0,0,0,0.4)'); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, Y); g.lineTo(x1, Y); g.stroke(); g.restore();
}

/** A bridge whose deck edge is at (edge, top), over water at Y: a deck with a
    railing reaching back to x0, and a stone pier standing in the river. */
export function bridge(g, x0, edge, top, Y) {
  g.save();
  g.fillStyle = withAlpha(STONE_D, 0.95); g.fillRect(x0, top, edge - x0, 9);
  g.fillStyle = withAlpha(STONE, 0.9);
  const pier = Math.max(14, (edge - x0) * 0.18), px = x0 + (edge - x0) * 0.45;
  g.fillRect(px - pier / 2, top + 9, pier, Y - top - 9);
  g.strokeStyle = withAlpha(STONE_D, 0.9); g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(x0, top - 14); g.lineTo(edge, top - 14); g.stroke();
  for (let x = x0 + 6; x < edge; x += 10) { g.beginPath(); g.moveTo(x, top - 14); g.lineTo(x, top); g.stroke(); }
  g.restore();
}
/** A well: level ground at y = top with a shaft down to its water at Y,
    the shaft centred on cx and `half` wide each side; earth around it. */
export function well(g, x0, x1, cx, half, top, Y, bottom) {
  g.save();
  g.fillStyle = withAlpha(EARTH, 0.85);
  g.fillRect(x0, top, cx - half - x0, bottom - top); g.fillRect(cx + half, top, x1 - cx - half, bottom - top);
  g.fillStyle = withAlpha(EARTH, 0.35); g.fillRect(cx - half, top, half * 2, Y - top);
  g.fillStyle = withAlpha(SEA_D, 0.9); g.fillRect(cx - half, Y - 4, half * 2, bottom - Y + 4);
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - half + 3, Y - 1); g.lineTo(cx + half - 3, Y - 1); g.stroke();
  g.strokeStyle = withAlpha(STONE_D, 0.9); g.lineWidth = 3;
  g.beginPath(); g.moveTo(cx - half, top); g.lineTo(cx - half, bottom); g.moveTo(cx + half, top); g.lineTo(cx + half, bottom); g.stroke();
  g.fillStyle = cssVar('--grass', '#7c9a63'); g.fillRect(x0, top - 3, cx - half - x0, 4); g.fillRect(cx + half, top - 3, x1 - cx - half, 4);
  // the low wall round the top
  g.fillStyle = withAlpha(STONE, 0.95); g.strokeStyle = withAlpha(STONE_D, 0.95); g.lineWidth = 1.2;
  for (const x of [cx - half - 16, cx + half]) { g.fillRect(x, top - 22, 16, 22); g.strokeRect(x, top - 22, 16, 22); g.beginPath(); g.moveTo(x, top - 11); g.lineTo(x + 16, top - 11); g.stroke(); }
  g.restore();
}
/** A diving board whose tip is at (edge, top), on a stand reaching back to
    x0, over a pool whose water is at Y, with a tiled edge. */
export function divingBoard(g, x0, edge, top, Y, bottom) {
  g.save();
  g.fillStyle = withAlpha(TILE, 0.9); g.fillRect(0, Y - 2, edge - (edge - x0) * 0.2, bottom - Y + 2);
  g.fillStyle = withAlpha(STONE_D, 0.9); g.fillRect(x0, top + 6, 12, Y - top - 6);
  g.fillStyle = withAlpha(TIMBER, 0.95); g.fillRect(x0, top, edge - x0, 6);
  g.restore();
}
/** A hot-air balloon whose basket floor is at (x, y). */
export function balloon(g, x, y, s, P) {
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 1.4;
  g.fillStyle = withAlpha(TIMBER, 0.95); g.fillRect(x - s * 0.25, y - s * 0.3, s * 0.5, s * 0.3); g.strokeRect(x - s * 0.25, y - s * 0.3, s * 0.5, s * 0.3);
  g.beginPath(); g.moveTo(x - s * 0.25, y - s * 0.3); g.lineTo(x - s * 0.55, y - s * 1.1); g.moveTo(x + s * 0.25, y - s * 0.3); g.lineTo(x + s * 0.55, y - s * 1.1); g.stroke();
  g.fillStyle = P.card; g.beginPath(); g.ellipse(x, y - s * 1.7, s * 0.8, s * 0.9, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x, y - s * 2.6); g.lineTo(x, y - s * 0.8); g.stroke();
  g.restore();
}

/* ── the stage ───────────────────────────────────────────────────────── */
export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || !f.place) return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const H0 = f.params.h, place = f.place, cliff = place === 'cliff';
  const wet = ['cliff', 'bridge', 'board'].includes(place);
  const apex = f.uy > 0 ? f.apexHeight : H0;

  // ── the frame: the place, the whole path, one scale both ways
  const n = 160, pts = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pts.push({ t: tt, ...f.pos(tt) }); }
  const back = Math.max(H0 * 0.45, 6);
  const xLo = -back, xHi = Math.max(...pts.map((p) => p.x), H0 * 0.4, 4) * 1.08;
  // a balloon goes on rising, and its envelope is above it
  const yHi = Math.max(Math.max(apex, H0) * 1.14 + 1, f.place === 'balloon' ? Math.max(H0, H0 + f.uy * f.tMax) + 22 : 0);
  const bottom = h - 54;
  const frames = w < 520 ? [{ left: 16, right: w - 16, top: 60 }]
    : [{ left: HUD + 30, right: w - 90, top: 60 }, { left: 30, right: w - 90, top: Math.min(HUD_H, bottom - 140) }];
  let best = null;
  for (const fr of frames) {
    const kk = Math.min((fr.right - fr.left) / (xHi - xLo), (bottom - fr.top) / yHi);
    if (kk > 0 && (!best || kk > best.k)) best = { ...fr, k: kk };
  }
  if (!best) return null;
  const k = best.k, ox = best.left + (-xLo) * k + ((best.right - best.left) - (xHi - xLo) * k) / 2, oy = bottom;
  const X = (x) => ox + x * k, Y = (y) => oy - y * k;

  // ── the place
  sky(g, 0, 0, w, oy);
  if (cliff) { sea(g, 0, w, oy, h); seaCliff(g, 0, X(0), Y(H0), oy); }
  else if (place === 'bridge') { sea(g, 0, w, oy, h); bridge(g, 0, X(0), Y(H0), oy); }
  else if (place === 'board') { sea(g, 0, w, oy, h); divingBoard(g, X(xLo) + 10, X(0), Y(H0), oy, h); }
  else if (place === 'well') { well(g, 0, w, X(0) + 7, 22, Y(H0), oy, h); }
  else if (place === 'balloon') groundStrip(g, 0, w, oy, h);
  else { groundStrip(g, 0, w, oy, h); tower(g, X(0), Y(H0), oy, Math.max(26, Math.min(70, H0 * 0.22 * k))); }
  // the person who throws, at the edge, facing out; a balloon carries its own
  if (place === 'balloon') {
    // the balloon goes on at the speed it had when it let go, up or down;
    // about 20 m from basket to crown, to scale with everything else
    balloon(g, X(0) - 6, Y(H0 + f.uy * t), Math.max(16, 7.5 * k), P);
  } else runner(g, X(0) - (place === 'well' ? 26 : 4), Y(H0), Math.max(24, 1.7 * k), P, { dir: 1, still: true });

  // ── its height, as a dimension line just inside the edge
  const dx = X(0) - Math.max(34, (cliff ? 0.2 : 0.4) * back * k);
  stroke(g, [{ x: dx, y: oy }, { x: dx, y: Y(H0) }], { color: P.ink, width: 1.2, alpha: 0.8 });
  for (const yy of [oy, Y(H0)]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.2, alpha: 0.8 });
  L.add(T`${tr(H0)} [m]`, dx - 8, (oy + Y(H0)) / 2, { color: P.ink, align: 'right', pri: 7, size: 15, weight: 700 });

  // ── a height the paper asks about: a marker line across, ringed where crossed
  const lv = f.level;
  if (lv) {
    const ly = Y(lv.L);
    stroke(g, [{ x: X(0) - 10, y: ly }, { x: Math.min(w - 10, X(xHi)), y: ly }], { color: P.mark, width: 1.4, alpha: 0.85 });
    L.add(T`${tr(Math.abs(lv.rel))} [m] ${lv.rel >= 0 ? '"above"' : '"below"'} "the throw"`, Math.min(w - 12, X(xHi)), ly - 12, { color: P.mark, align: 'right', pri: 6, size: 13, weight: 700 });
    for (const tc of lv.times) {
      if (t < tc - 1e-9) continue;
      const q = f.pos(tc);
      dot(g, X(q.x), Y(q.y), 7, { stroke: P.mark, width: 2.4 });
      L.add(T`t = ${tr(tc)} [s]`, X(q.x) + 12, Y(q.y) + (q.x < 0.5 ? 16 : -14), { color: P.mark, align: 'left', pri: 8, size: 14, weight: 700 });
    }
  }

  // ── the path: all of it faintly, the part flown strongly. Straight up and
  // down, the way up and the way down are drawn side by side so both show.
  const side = f.vertical ? 7 : 0;
  const at = (p) => ({ x: X(p.x) + (f.vertical && p.t > f.tApex ? side : 0), y: Y(p.y) });
  stroke(g, pts.map(at), { color: P.vel, width: 1.6, alpha: 0.3 });
  stroke(g, pts.filter((p) => p.t <= t).map(at), { color: P.vel, width: 2.8 });

  // ── the top of its path, when asked
  if (show.apex && f.uy > 0) {
    const ax = X(f.pos(f.tApex).x), ay = Y(apex);
    dot(g, ax, ay, 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H_max = ${tr(apex)} [m]`, ax + 10, ay - 12, { color: P.disp, align: 'left', pri: 6, size: 14, weight: 700 });
  }
  // ── where it lands, once it has
  if (t >= f.tMax - 1e-9) {
    const lx = X(f.pos(f.tMax).x) + (f.vertical ? side : 0);
    if (wet || place === 'well') { g.save(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(lx, oy, 12, 3.5, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
    if (!f.vertical) {
      stroke(g, [{ x: X(0), y: oy + 22 }, { x: lx, y: oy + 22 }], { color: P.ink, width: 1.2, alpha: 0.8 });
      for (const xx of [X(0), lx]) stroke(g, [{ x: xx, y: oy + 17 }, { x: xx, y: oy + 27 }], { color: P.ink, width: 1.2, alpha: 0.8 });
      L.add(T`${tr(f.pos(f.tMax).x)} [m]`, (X(0) + lx) / 2, oy + 38, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700 });
    }
  }

  // ── the ball, its velocity and its acceleration
  const r = f.pos(t), v = f.vel(t);
  const bx = X(r.x) + (f.vertical && t > f.tApex ? side : 0), by = Y(r.y);
  const vMax = Math.max(...pts.map((p) => Math.hypot(f.vel(p.t).x, f.vel(p.t).y)), 1e-6);
  const room = (c, dv, lo, hi) => (dv > 0 ? (hi - c) / dv : dv < 0 ? (lo - c) / dv : Infinity);
  let vl = clamp(w * 0.08, 46, 100) / vMax;
  for (const p of pts) { const vq = f.vel(p.t); vl = Math.min(vl, room(X(p.x), vq.x, 12, w - 8) * 0.9, room(Y(p.y), -vq.y, 12, h - 8) * 0.9); }
  const sp = Math.hypot(v.x, v.y);
  if (show.velocity !== false && sp > 1e-6) {
    if (show.components && Math.abs(v.x) > 1e-9) {
      arrow(g, bx, by, bx + v.x * vl, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, bx + v.x * vl, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, bx, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 3, head: 12 });
    L.add(T`${tr(sp, 2)} [m s^-1]`, bx + v.x * vl + 12, by - v.y * vl, { color: P.vel, align: 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
  dot(g, bx, by, 6, { fill: P.card, stroke: P.ink, width: 2.2 });
  L.add({ cliff: 'sea level', bridge: 'the river', board: 'the water', well: 'the water' }[place] || 'ground', 10, oy + 14, { color: P.ink, align: 'left', pri: 3, size: 13, bg: true });

  L.draw(g, w, h);
  return null;
}
