// wind.js — the stage for flying in a wind, from above at one scale:
// farmland far below with cloud shadows drifting with the wind; the aircraft
// pointing on its heading while it moves over the ground along its track, a
// contrail behind; arrows east–west dashed, all others solid (rule 2); a
// compass that stays put; the velocity triangle on a card: through the air + the wind =
// over the ground, with the bearing.
//
// Everything that moves is read from js/core/wind.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, sig3, hudBoxes, withAlpha, unview } from './util.js';
import { skyFromAbove, compassRose, fitSide, env, paper } from './scenery.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const dashFor = (x, y) => (Math.abs(y) < 1e-9 ? [6, 4] : null);     // along east–west only: dashed

/** An airliner from above, centred at (x, y), L px long, its nose along screen angle `ang`. */
function planeAbove(g, x, y, L, ang) {
  const E = env();
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(6, 10, L * 0.5, L * 0.1, 0, 0, TAU); g.fill();
  const body = E.night ? '#d5d9df' : '#f4f6f8', trim = '#2f5d9b';
  g.fillStyle = body; g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1;
  // wings, tailplane, fuselage
  g.beginPath(); g.moveTo(L * 0.08, 0); g.lineTo(-L * 0.12, -L * 0.48); g.lineTo(-L * 0.22, -L * 0.48); g.lineTo(-L * 0.12, 0); g.lineTo(-L * 0.22, L * 0.48); g.lineTo(-L * 0.12, L * 0.48); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-L * 0.38, 0); g.lineTo(-L * 0.46, -L * 0.17); g.lineTo(-L * 0.5, -L * 0.17); g.lineTo(-L * 0.47, 0); g.lineTo(-L * 0.5, L * 0.17); g.lineTo(-L * 0.46, L * 0.17); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(-L * 0.02, 0, L * 0.5, L * 0.065, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = trim; g.fillRect(-L * 0.4, -L * 0.015, L * 0.82, L * 0.03);
  g.fillStyle = '#7d848c'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(-L * 0.08, s * L * 0.2, L * 0.07, L * 0.03, 0, 0, TAU); g.fill(); }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'wind') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520, E = env();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 4); for (const b of HB) L.reserve(b);

  // ── the frame: the track over the run, with room around
  const end = f.pos(f.tMax), xs = [0, end.x], ys = [0, end.y], span = Math.max(Math.abs(end.x), Math.abs(end.y), 1);
  const box = { xLo: Math.min(...xs) - span * 0.25, xHi: Math.max(...xs) + span * (phone ? 0.25 : 0.9), yLo: Math.min(...ys) - span * 0.2, yHi: Math.max(...ys) + span * 0.2 };
  const cw = phone ? 170 : 230, ch = phone ? 150 : 200;
  const area = { left: HB[0].w + (phone ? 8 : 20), right: w - (phone ? 8 : cw + 36), top: phone ? 24 : 20, bottom: h - (phone ? ch + 22 : 12) };
  const { k, X, Y } = fitSide(box, area, { sky: 0.5 });
  // the ground far below, its cloud shadows carried by the wind
  skyFromAbove(g, 0, 0, w, h, { seed: 41, phase: (f.W * t * k) / 60 });
  // the wind, streaming across the map the way it blows, at its speed at this scale
  { const dx = Math.sin(f.wb * Math.PI / 180), dy = -Math.cos(f.wb * Math.PI / 180), gap = 90, run = (f.W * t * k) % gap;
    g.strokeStyle = withAlpha('#ffffff', 0.55); g.lineWidth = 1.6; g.lineCap = 'round';
    for (let i = -2; i < w / gap + 2; i++) for (let j = -2; j < h / gap + 2; j++) {
      const x0 = i * gap + (j % 2) * gap / 2 + dx * run, y0 = j * gap + dy * run;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + dx * 22, y0 + dy * 22); g.stroke();
    } }

  // ── the track so far, the contrail, the aircraft on its heading
  const p = f.pos(t), px = X(p.x), py = Y(p.y), pl = clamp(k * span * 0.08, 46, 90);
  stroke(g, [{ x: X(0), y: Y(0) }, { x: X(end.x), y: Y(end.y) }], { color: P.disp, width: 1.4, alpha: 0.4, dash: [3, 4] });
  if (t > 0) {
    stroke(g, [{ x: X(0), y: Y(0) }, { x: px, y: py }], { color: withAlpha('#ffffff', 0.85), width: 4 });
    stroke(g, [{ x: X(0), y: Y(0) }, { x: px, y: py }], { color: P.disp, width: 2 });
  }
  g.fillStyle = P.ink; g.beginPath(); g.arc(X(0), Y(0), 4, 0, TAU); g.fill();
  L.add('start', X(0) - 8, Y(0) + 14, { color: P.ink, align: 'right', pri: 6, size: 13 });
  const nose = Math.atan2(-Math.cos(f.hb * Math.PI / 180), Math.sin(f.hb * Math.PI / 180));
  planeAbove(g, px, py, pl, nose);
  // the way it points, through the air: the nose's line, ahead of it
  { const hx = Math.sin(f.hb * Math.PI / 180), hy = -Math.cos(f.hb * Math.PI / 180); stroke(g, [{ x: px + hx * pl * 0.5, y: py + hy * pl * 0.5 }, { x: px + hx * pl * 1.3, y: py + hy * pl * 1.3 }], { color: P.velVec, width: 1.6, dash: [2, 3] }); L.add(`heading ${String(Math.round(f.hb) % 360).padStart(3, '0')}°`, px + hx * pl * 1.3 + 6, py + hy * pl * 1.3, { color: P.velVec, align: 'left', pri: 7, size: 13, weight: 700 }); }
  L.reserve({ x: px - pl * 0.55, y: py - pl * 0.55, w: pl * 1.1, h: pl * 1.1 });
  if (show.velocity !== false) {
    const len = clamp(pl * 1.1, 50, 110), dx = f.vx / f.R, dy = f.vy / f.R;
    arrow(g, px, py, px + dx * len, py - dy * len, { color: P.vel, width: 2.8, head: 11, dash: dashFor(dx, dy) });
    L.add(T`${num(f.R, 1)} [m s^-1]`, px + dx * len + 10, py - dy * len, { color: P.vel, align: 'left', pri: 8, size: 14, weight: 700 });
  }

  L.draw(g, w, h);

  // ── the screen's own: the compass and the velocity triangle, fixed while the map pans
  unview(g);
  const S = labels(); for (const b of HB) S.reserve(b);
  compassRose(g, w - (phone ? 36 : 46), HB[1].h + (phone ? 40 : 50), phone ? 22 : 28, P);
  // the triangle: through the air + the wind = over the ground
  {
    const pts = [[0, 0], [f.ax, f.ay], [f.vx, f.vy]];
    const minX = Math.min(...pts.map((q) => q[0])), maxX = Math.max(...pts.map((q) => q[0])), minY = Math.min(...pts.map((q) => q[1])), maxY = Math.max(...pts.map((q) => q[1]));
    const sc = Math.min((cw - 90) / Math.max(1e-6, maxX - minX), (ch - 80) / Math.max(1e-6, maxY - minY));
    const cx = phone ? w - cw - 8 : w - cw - 18, cy = h - ch - 14;
    paper(g, cx, cy, cw, ch);
    S.reserve({ x: cx, y: cy, w: cw, h: ch });
    const ox = cx + 45 + ((cw - 90) - (maxX - minX) * sc) / 2 - minX * sc, oy = cy + ch - 34 + minY * sc, Q = (q) => ({ x: ox + q[0] * sc, y: oy - q[1] * sc });
    const o0 = Q(pts[0]), a1 = Q(pts[1]), r1 = Q(pts[2]);
    arrow(g, o0.x, o0.y, a1.x, a1.y, { color: P.vel, width: 2.4, head: 9, dash: dashFor(f.ax, f.ay) });
    arrow(g, a1.x, a1.y, r1.x, r1.y, { color: P.velVec, width: 2.2, head: 9, dash: dashFor(f.wx, f.wy) });
    arrow(g, o0.x, o0.y, r1.x, r1.y, { color: P.vel, width: 3, head: 11, dash: dashFor(f.vx, f.vy) });
    const lab = (t2, q, dx, dy, color, al) => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = color; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(t2, q.x + dx, q.y + dy); g.restore(); };
    // each side named off its own midpoint, pushed out from the triangle's middle
    const mid = { x: (o0.x + a1.x + r1.x) / 3, y: (o0.y + a1.y + r1.y) / 3 };
    const side = (a, b, txt, color) => { const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, dx = m.x - mid.x, dy = m.y - mid.y, n = Math.hypot(dx, dy) || 1; lab(txt, m, (dx / n) * 16, (dy / n) * 14, color, dx < -2 ? 'right' : dx > 2 ? 'left' : 'center'); };
    side(o0, a1, T`V = ${num(f.V, 1, { trim: true })}`, P.vel);
    side(a1, r1, T`W = ${num(f.W, 1, { trim: true })}`, P.velVec);
    side(o0, r1, T`${num(f.R, 1)}`, P.vel);
    lab(`track ${String(Math.round(f.rb) % 360).padStart(3, '0')}°`, { x: cx + 10, y: cy + 14 }, 0, 0, P.ink, 'left');
    lab('speeds in m s⁻¹', { x: cx + cw / 2, y: cy + ch - 12 }, 0, 0, P.muted, 'center');
  }
  S.draw(g, w, h);
  return null;
}
