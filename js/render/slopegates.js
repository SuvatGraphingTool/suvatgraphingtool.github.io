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
export function lightGate(g, x, y, h, hit = 0, foot = y + 20) {
  const E = env(), grey = E.night ? '#6e747c' : '#5a6068', dark = E.night ? '#2a2d33' : '#1e2126';
  const by = y - h * 0.35, armTop = y - h, gap = Math.max(10, h * 0.22);
  g.save();
  // the stand: a heavy foot on the bench in front of the board, a rod up to the gate
  g.fillStyle = dark; g.beginPath(); g.roundRect(x - 16, foot - 5, 32, 6, 2); g.fill();
  g.fillStyle = grey; g.fillRect(x - 2, armTop + 6, 4, foot - armTop - 8);
  // the U: its far arm a little behind and up (seen at a slant), its near arm, the bar joining them over the top
  g.fillStyle = withAlpha(grey, 0.7); g.fillRect(x + gap * 0.5 - 3, armTop - gap * 0.5, 6, (by - armTop) + 8);
  g.fillStyle = grey; g.beginPath(); g.moveTo(x - 4, armTop + 4); g.lineTo(x + gap * 0.5 - 3, armTop - gap * 0.5); g.lineTo(x + gap * 0.5 + 3, armTop - gap * 0.5); g.lineTo(x + 4, armTop + 4); g.closePath(); g.fill();
  g.fillRect(x - 4, armTop + 2, 8, by - armTop + 8);
  // the sensor boxes facing each other at the beam's height
  g.fillStyle = dark; g.fillRect(x - 6, by - 6, 12, 12); g.fillRect(x + gap * 0.5 - 5, by - 6 - gap * 0.5, 10, 11);
  // the beam across the gap: a dot, red — green as the block breaks it
  const on = hit > 0, col = on ? `rgba(80,230,120,${0.55 + 0.45 * hit})` : 'rgba(255,70,60,0.95)';
  g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 5, by); g.lineTo(x + gap * 0.5 - 4, by - gap * 0.5); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(x + 6, by, 3.2, 0, TAU); g.fill();
  if (on) { const lg = g.createRadialGradient(x + 6, by, 0, x + 6, by, 22); lg.addColorStop(0, `rgba(80,230,120,${0.55 * hit})`); lg.addColorStop(1, 'rgba(80,230,120,0)'); g.fillStyle = lg; g.beginPath(); g.arc(x + 6, by, 22, 0, TAU); g.fill(); }
  g.restore();
  return by;
}

/** A data logger's timer on the bench: a grey case with a green LCD of lines. */
function timer(g, x, y, w, lines, P) {
  const E = env(), lh = 22, h = 30 + lines.length * lh;
  softShadow(g, x + w / 2, y + 1, w * 0.55, 3, 0.6);
  g.fillStyle = E.night ? '#3a3e46' : '#d8dade'; g.beginPath(); g.roundRect(x, y - h - 6, w, h + 6, 6); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#16261c'; g.beginPath(); g.roundRect(x + 6, y - h, w - 12, h - 6, 3); g.fill();
  g.font = `700 15px ${cssVar('--font-mono', 'ui-monospace, monospace')}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  lines.forEach((t, i) => { g.fillStyle = t ? '#8af0a6' : 'rgba(138,240,166,0.25)'; g.fillText(t || '—', x + 16, y - h + 18 + i * lh); });
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
  const box = { xLo: sBot * cs - 0.05, xHi: sTop * cs + 0.05, yLo: sBot * sn - 0.05 * (f.d1 + f.d2), yHi: sTop * sn + 0.3 * (f.d1 + f.d2) };
  const area = { left: phone ? 14 : 30, right: w - (phone ? 14 : 250), top: phone ? 140 : 110, bottom: Math.round(h * (phone ? 0.74 : 0.8)) };
  const F = fitSide(box, area, { sky: 1 });
  const { X, Y, k } = F;
  const at = (s) => ({ x: X(s * cs), y: Y(s * sn) });
  const foot = at(sBot), head = at(sTop);
  const benchTop = foot.y + 10;

  // ── the lab and its bench
  const wallTop = Math.max(HUD[0].y + HUD[0].h, 90);
  labWall(g, w, h - 6, h, { extinguisher: phone ? null : w - 40,
    board: phone ? null : { x: HUD[0].x + HUD[0].w + 40, y: 30, w: Math.min(220, w * 0.18), h: Math.min(120, Math.max(0, foot.y - 160)) },
    window: phone ? null : { x: w - 250, y: Math.max(110, wallTop), w: 190, h: Math.min(150, Math.max(0, foot.y - Math.max(110, wallTop) - 90)) } });
  labBench(g, -40, w + 40, benchTop, h + 40);
  // the board: thick ply faced with sandpaper, its upper end on a block
  const ang = Math.atan2(head.y - foot.y, head.x - foot.x), len = Math.hypot(head.x - foot.x, head.y - foot.y), tk = clamp(k * 0.035, 10, 18);
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
  g.fillStyle = E.night ? '#7a6a52' : '#c7ab78'; g.fillRect(0, -4, len, 5);
  for (let x = 0; x < len; x += 2) { g.fillStyle = (x * 7) % 5 < 2 ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.25)'; g.fillRect(x, -4 + ((x * 13) % 4), 1.2, 1.2); }
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 1, len, 1);
  g.restore();
  // the angle at the foot, on the bench
  const ar = clamp(k * 0.25, 40, 90);
  g.save(); g.strokeStyle = withAlpha(P.ink, 0.5); g.lineWidth = 1; g.setLineDash([3, 3]);
  g.beginPath(); g.moveTo(foot.x, foot.y + tk); g.lineTo(foot.x + ar * 1.15, foot.y + tk); g.stroke(); g.restore();
  if (f.theta != null) L.add(T`theta = ${tr(f.theta)}°`, foot.x + ar * 0.6, foot.y + tk + 16, { color: P.ink, size: 14, weight: 700, align: 'center', maxPush: 10 });
  // the spring launcher, clamped at the board's foot below P
  { const lq = at(sBot * 0.55), lL = clamp(k * 0.1, 30, 60);
    g.save(); g.translate(lq.x, lq.y); g.rotate(ang);
    g.fillStyle = E.night ? '#3a3e46' : '#4a505a'; g.beginPath(); g.roundRect(-lL * 0.6, -lL * 0.42, lL * 0.5, lL * 0.42, 3); g.fill();
    const coil = fired && t > 0 ? lL * 0.55 : lL * 0.3;
    g.strokeStyle = '#c9ced6'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-lL * 0.1, -lL * 0.2);
    for (let i = 1; i <= 8; i++) g.lineTo(-lL * 0.1 + (coil * i) / 8, -lL * 0.2 + (i % 2 ? -lL * 0.08 : lL * 0.08)); g.stroke();
    g.fillStyle = '#9aa0a8'; g.fillRect(-lL * 0.1 + coil, -lL * 0.32, 4, lL * 0.26);
    g.restore(); }

  // ── the launcher at the foot, the gates at P, Q and R, the stretches marked under the board
  const nU = { x: Math.sin(ang), y: -Math.cos(ang) };
  const gateH = clamp(k * 0.2, 70, 120);
  const marks = [['P', 0, 0], ['Q', f.d1, f.t1], ['R', f.d1 + f.d2, f.T]];
  for (const [name, s, tt] of marks) {
    const q = at(s), age = fired ? t - tt : -1;
    const hit = age >= 0 ? Math.max(0, 1 - age / Math.max(0.15, f.tMax * 0.12)) : 0;
    lightGate(g, q.x, q.y - 3, gateH, hit, benchTop + 4);
    L.add(name, q.x - 14, q.y - gateH - 18, { color: P.ink, size: 16, weight: 800, align: 'center', maxPush: 6 });
  }
  const dimY = (s) => at(s).y + tk + 22;
  for (const [a, b, dd] of [[0, f.d1, f.d1], [f.d1, f.d1 + f.d2, f.d2]]) {
    const A = at(a), B = at(b), ya = dimY(a), yb = dimY(b);
    stroke(g, [{ x: A.x, y: ya }, { x: B.x, y: yb }], { color: P.disp, width: 1.4 });
    for (const [x, y] of [[A.x, ya], [B.x, yb]]) stroke(g, [{ x, y: y - 6 }, { x, y: y + 6 }], { color: P.disp, width: 1.4 });
    L.add(T`${tr(dd)} [m]`, (A.x + B.x) / 2, (ya + yb) / 2 + 14, { color: P.disp, size: 13, weight: 700, align: 'center' });
  }
  // the timer on the worktop beyond the board, wired from each gate to a socket on its left side
  const tw = phone ? 170 : 210, tx = Math.min(w - tw - 10, head.x + 60), ty = benchTop - 2, sockY = ty - 20;
  g.strokeStyle = E.night ? '#111' : '#2a2a2a'; g.lineWidth = 1.4;
  for (const [, s0] of marks) { const q = at(s0); g.beginPath(); g.moveTo(q.x + 2, benchTop + 1); g.quadraticCurveTo((q.x + tx) / 2, benchTop + 8, tx, sockY); g.stroke(); }
  timer(g, tx, ty, tw, [fired && t >= f.t1 ? `P to Q  ${tr(f.t1)} s` : '', fired && t >= f.T ? `Q to R  ${tr(f.t2)} s` : ''], P);
  g.fillStyle = '#c9ced6'; g.beginPath(); g.arc(tx + 3, sockY, 3, 0, TAU); g.fill();

  // ── the block: up the slope, slowing; stops; maybe back
  const bl = clamp(k * 0.09, 44, 64), bh = bl * 0.55, s = f.pos(t), q = at(s);
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
  // just above the block — lifted over the gate heads only while the block is passing a gate
  const nearGate = marks.some(([, s0]) => Math.abs(at(s0).x - q.x) < bl * 1.6);
  const lift = nearGate ? gateH + 30 : bh + 22;
  const top = { x: q.x + nU.x * lift, y: q.y + nU.y * lift };
  if (fired && Math.abs(v) > 0.05 * f.u) {
    const lv = v * vs;
    arrow(g, top.x, top.y, top.x + up.x * lv, top.y + up.y * lv, { color: P.vel, width: 2.4, head: 9 });
    L.add(T`${tr(Math.abs(v))} [m s^-1]`, top.x + up.x * lv + (lv >= 0 ? 10 : -10), top.y, { color: P.vel, size: 13, weight: 700, align: lv >= 0 ? 'left' : 'right' });
  }
  if (fired && Math.abs(aNow) > 1e-9 && t < f.tMax) {
    const la = clamp(Math.abs(aNow) * vs * 0.8, 30, 90) * Math.sign(aNow), ay = { x: top.x + nU.x * 26, y: top.y + nU.y * 26 };
    arrow(g, ay.x, ay.y, ay.x + up.x * la, ay.y + up.y * la, { color: P.acc, width: 2.2, head: 8 });
    L.add(T`${tr(Math.abs(aNow))} [m s^-2]`, ay.x + up.x * la + (la >= 0 ? 10 : -10), ay.y, { color: P.acc, size: 13, weight: 700, align: la >= 0 ? 'left' : 'right' });
  }
  // where it stops: a pulse, and how far up
  if (fired && f.tStop != null && t >= f.tStop - 1e-9) {
    const st = at(f.sStop), { age, life } = ageOf(t, f.tStop, f.tMax);
    pulse(g, st.x, st.y - bh / 2, age, life, P.mark, { radius: 30 });
    L.add(T`"stops" ${tr(f.sStop)} [m] "up"`, st.x, st.y + tk + 64, { color: P.mark, size: 14, weight: 700, align: 'center', maxPush: 10 });
  }

  L.draw(g, w, h);
  unview(g);
  return null;
}
