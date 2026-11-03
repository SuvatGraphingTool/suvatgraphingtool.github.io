// slopegates.js — the stage for a particle sent up a rough slope past three
// timed marks: a physics lab side on. A long board faced with sandpaper rests
// on the bench, its upper end on a wooden block at the slope's true angle; a
// spring launcher at its foot sends a small wooden block up it. Light gates
// stand at P, Q and R, each a frame over the board with its beam (red; green
// for a moment as the block breaks it), wired to a timer on the bench whose
// display gives each stretch's time once the engine's clock has passed it.
// PQ and QR are dimension lines under the board; the angle is marked at its
// foot. The block's velocity rides on it along the slope (solid: a slope is
// neither across nor up, rule 2) with its deceleration beside it; where it
// stops it pulses, and if friction cannot hold it, it slides back.
//
// Everything drawn is read from js/core/slopegates.js (rule 4).

import { fitSide, softShadow, env } from './scenery.js';
import { labWall, labBench } from './bench.js';
import { pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, withAlpha, unview, hudBoxes, cssVar } from './util.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const tr = (x) => num(x, Math.abs(x) < 1 ? 3 : 2, { trim: true });

/** A light gate over the board at (x, y) on its surface, h px tall: a grey
    U-frame on its foot, the emitter's beam across the gap, red — green while
    `hit` (0..1) fades after the block breaks it. */
export function lightGate(g, x, y, h, hit = 0) {
  const E = env();
  g.save();
  // the frame: a post up from behind the board, an arm over, the sensor head
  g.fillStyle = E.night ? '#5a5f68' : '#6e747c';
  g.fillRect(x - 3, y - h, 6, h + 6);
  g.fillRect(x - 3, y - h, 18, 6);
  g.fillStyle = E.night ? '#3a3e46' : '#2e3238'; g.beginPath(); g.roundRect(x - 7, y - h * 0.62, 14, h * 0.24, 3); g.fill();
  // the beam, across the gap at the block's height
  const by = y - h * 0.5, on = hit > 0;
  const col = on ? `rgba(80,230,120,${0.5 + 0.5 * hit})` : 'rgba(255,70,60,0.85)';
  g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, by); g.lineTo(x, y - 1); g.stroke(); g.setLineDash([]);
  g.fillStyle = col; g.beginPath(); g.arc(x, by, 3, 0, TAU); g.fill();
  if (on) { const lg = g.createRadialGradient(x, by, 0, x, by, 16); lg.addColorStop(0, `rgba(80,230,120,${0.5 * hit})`); lg.addColorStop(1, 'rgba(80,230,120,0)'); g.fillStyle = lg; g.beginPath(); g.arc(x, by, 16, 0, TAU); g.fill(); }
  g.restore();
}

/** A data logger's timer on the bench: a grey case with a green LCD of lines. */
function timer(g, x, y, w, lines, P) {
  const E = env(), lh = 18, h = 26 + lines.length * lh;
  softShadow(g, x + w / 2, y + 1, w * 0.55, 3, 0.6);
  g.fillStyle = E.night ? '#3a3e46' : '#d8dade'; g.beginPath(); g.roundRect(x, y - h - 6, w, h + 6, 6); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#16261c'; g.beginPath(); g.roundRect(x + 6, y - h, w - 12, h - 6, 3); g.fill();
  g.font = `600 13px ${cssVar('--font-mono', 'ui-monospace, monospace')}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  lines.forEach((t, i) => { g.fillStyle = t ? '#8af0a6' : 'rgba(138,240,166,0.25)'; g.fillText(t || '—', x + 14, y - h + 16 + i * lh); });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'slopegates') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HUD = hudBoxes(w, phone ? 2 : 4);
  for (const b of HUD) L.reserve(b);
  const th = ((f.theta ?? 3) * Math.PI) / 180, sn = Math.sin(th), cs = Math.cos(th);

  // ── the frame: the board from below P to past where it stops, one scale both ways
  const sTop = Math.max(f.d1 + f.d2, f.sStop ?? 0) * 1.12 + 0.1, sBot = -0.22 * (f.d1 + f.d2);
  const box = { xLo: sBot * cs - 0.05, xHi: sTop * cs + 0.05, yLo: sBot * sn - 0.18 * (f.d1 + f.d2), yHi: sTop * sn + 0.32 * (f.d1 + f.d2) };
  const area = { left: phone ? 14 : 30, right: w - (phone ? 14 : 200), top: phone ? 150 : 120, bottom: h - (phone ? 120 : 110) };
  const F = fitSide(box, area, { sky: 0.5 });
  const { X, Y, k } = F;
  const at = (s) => ({ x: X(s * cs), y: Y(s * sn) });
  const foot = at(sBot), head = at(sTop);
  const benchTop = foot.y + 10;

  // ── the lab and its bench
  labWall(g, w, h - 6, h, { extinguisher: null });
  labBench(g, -40, w + 40, benchTop, h + 40);
  // the board: thick ply faced with sandpaper, its upper end on a block
  const ang = Math.atan2(head.y - foot.y, head.x - foot.x), len = Math.hypot(head.x - foot.x, head.y - foot.y), tk = clamp(k * 0.03, 6, 12);
  const blockH = benchTop - head.y - tk;
  if (blockH > 2) {
    g.fillStyle = E.night ? '#6a5040' : '#b88a5a'; g.fillRect(head.x - 26, head.y + tk - 2, 30, blockH + 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(head.x - 26, head.y + tk - 2, 30, 3);
  }
  softShadow(g, (foot.x + head.x) / 2, benchTop + 1, len * 0.5, 3, 0.5);
  g.save(); g.translate(foot.x, foot.y); g.rotate(ang);
  g.fillStyle = E.night ? '#7a6048' : '#c9a476'; g.fillRect(0, 0, len, tk);
  g.fillStyle = E.night ? '#5a4836' : '#a8865c'; g.fillRect(0, tk * 0.6, len, tk * 0.4);
  // the sandpaper: a gritty top, speckled
  g.fillStyle = E.night ? '#6e6250' : '#b9a27a'; g.fillRect(0, -2.5, len, 3);
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 0; x < len; x += 3) g.fillRect(x + ((x * 7) % 3), -2.5 + ((x * 13) % 3), 1, 1);
  g.restore();
  // the angle at the foot, on the bench
  const ar = clamp(k * 0.25, 40, 90);
  g.strokeStyle = P.ink; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(foot.x, foot.y); g.lineTo(foot.x + ar * 1.3, foot.y); g.stroke();
  g.beginPath(); g.arc(foot.x, foot.y, ar, ang, 0); g.stroke();
  if (f.theta != null) L.add(T`theta = ${tr(f.theta)}°`, foot.x + ar + 30, foot.y - 12, { color: P.ink, size: 14, weight: 700, align: 'left' });

  // ── the launcher at the foot, the gates at P, Q and R, the stretches marked under the board
  const nU = { x: Math.sin(ang), y: -Math.cos(ang) };
  const gateH = clamp(k * 0.22, 56, 110);
  const marks = [['P', 0, 0], ['Q', f.d1, f.t1], ['R', f.d1 + f.d2, f.T]];
  for (const [name, s, tt] of marks) {
    const q = at(s), age = fired ? t - tt : -1;
    const hit = age >= 0 ? Math.max(0, 1 - age / Math.max(0.15, f.tMax * 0.12)) : 0;
    lightGate(g, q.x, q.y - 3, gateH, hit);
    L.add(name, q.x - 12, q.y - gateH - 14, { color: P.ink, size: 16, weight: 800, align: 'center' });
  }
  const dimY = (s) => at(s).y + tk + 22;
  for (const [a, b, dd] of [[0, f.d1, f.d1], [f.d1, f.d1 + f.d2, f.d2]]) {
    const A = at(a), B = at(b), ya = dimY(a), yb = dimY(b);
    stroke(g, [{ x: A.x, y: ya }, { x: B.x, y: yb }], { color: P.disp, width: 1.4 });
    for (const [x, y] of [[A.x, ya], [B.x, yb]]) stroke(g, [{ x, y: y - 6 }, { x, y: y + 6 }], { color: P.disp, width: 1.4 });
    L.add(T`${tr(dd)} [m]`, (A.x + B.x) / 2, (ya + yb) / 2 + 14, { color: P.disp, size: 13, weight: 700, align: 'center' });
  }
  // the timer, wired to the gates, its readings as the clock passes each gate
  const tw = phone ? 132 : 158, tx = head.x + 40 + tw < w - 8 ? head.x + 40 : clamp(foot.x - tw - 30, 8, w - tw - 8), ty = phone && head.x + 40 + tw >= w - 8 ? h - 16 : benchTop - 2;
  timer(g, tx, ty, tw, [fired && t >= f.t1 ? `P to Q ${tr(f.t1)} s` : '', fired && t >= f.T ? `Q to R ${tr(f.t2)} s` : ''], P);
  g.strokeStyle = E.night ? '#222' : '#333'; g.lineWidth = 1.2;
  for (const [, s] of marks) { const q = at(s); g.beginPath(); g.moveTo(q.x - 3, q.y + 3); g.quadraticCurveTo(q.x - 3, ty - 6, tx + tw / 2, ty - 50); g.stroke(); }

  // ── the block: up the slope, slowing; stops; maybe back
  const bl = clamp(k * 0.09, 18, 36), bh = bl * 0.55, s = f.pos(t), q = at(s);
  g.save(); g.translate(q.x, q.y - 2.5); g.rotate(ang);
  const bg = g.createLinearGradient(0, -bh, 0, 0); bg.addColorStop(0, '#d9a066'); bg.addColorStop(1, '#9b6534');
  g.fillStyle = bg; g.fillRect(-bl / 2, -bh, bl, bh);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.strokeRect(-bl / 2, -bh, bl, bh);
  g.strokeStyle = 'rgba(80,50,20,0.35)'; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-bl / 2, -bh * i / 4); g.lineTo(bl / 2, -bh * i / 4 + 1); g.stroke(); }
  g.strokeStyle = '#9aa0a8'; g.lineWidth = 1.6; g.beginPath(); g.arc(-bl / 2 - 3, -bh * 0.5, 3, 0, TAU); g.stroke();
  g.restore();
  // its velocity along the slope, and its acceleration (solid: along a slope, rule 2)
  const v = f.vel(t), aNow = f.acc(t), up = { x: Math.cos(ang), y: Math.sin(ang) };
  const vs = clamp(k * 0.35, 50, 140) / Math.max(f.u, 1e-9);
  const top = { x: q.x + nU.x * (bh + 16), y: q.y + nU.y * (bh + 16) };
  if (fired && Math.abs(v) > 1e-6) {
    const lv = v * vs;
    arrow(g, top.x, top.y, top.x + up.x * lv, top.y + up.y * lv, { color: P.vel, width: 2.4, head: 9 });
    L.add(T`${tr(Math.abs(v))} [m s^-1]`, top.x + up.x * lv * 0.5, top.y - 16, { color: P.vel, size: 13, weight: 700, align: 'center' });
  }
  if (fired && Math.abs(aNow) > 1e-9 && t < f.tMax) {
    const la = clamp(Math.abs(aNow) * vs * 0.8, 24, 90) * Math.sign(aNow), ay = { x: top.x + nU.x * 30, y: top.y + nU.y * 30 };
    arrow(g, ay.x, ay.y, ay.x + up.x * la, ay.y + up.y * la, { color: P.acc, width: 2.2, head: 8 });
    L.add(T`${tr(Math.abs(aNow))} [m s^-2]`, ay.x + up.x * la * 0.5, ay.y - 14, { color: P.acc, size: 13, weight: 700, align: 'center' });
  }
  // where it stops: a pulse, and how far up
  if (fired && f.tStop != null && t >= f.tStop - 1e-9) {
    const st = at(f.sStop), { age, life } = ageOf(t, f.tStop, f.tMax);
    pulse(g, st.x, st.y - bh / 2, age, life, P.mark, { radius: 30 });
    L.add(T`"stops" ${tr(f.sStop)} [m] "up"`, st.x, st.y - gateH * 0.25 - 26, { color: P.mark, size: 14, weight: 700, align: 'center' });
  }

  L.draw(g, w, h);
  unview(g);
  return null;
}
