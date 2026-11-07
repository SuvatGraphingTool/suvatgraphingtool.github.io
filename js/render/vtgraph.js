// vtgraph.js — the stage for a velocity–time graph of straight pieces.
//
// Two pictures on one clock:
//   · THE PLACE, filling the canvas: a sports hall — roof trusses and hanging
//     lights, a wall with high windows, wall bars, a basketball board and a
//     bench, a sprung wooden floor with court lines, and a tape measure laid
//     along it from the cone at O, the start. The object is a ball rolling
//     along the floor, with its velocity (along the line: dashed, rule 2).
//     Each moment it stops, sets off or turns back, and each time it is back
//     where it started, rings out at the engine's own time (effects.js).
//   · THE GRAPH, on a paper card that belongs to the screen: drawn after
//     unview() so it neither pans nor zooms, clear of the HUD, beside the
//     hall on a laptop and below it on a phone. The pieces in the velocity
//     hue, dashed; the area under it shaded up to now in the displacement
//     hue, stronger above the axis (forwards) than below (back); the steepest
//     piece heavier with its acceleration; the corner times in one row under
//     the plot, and each time it is back at the start in a row under that,
//     joined to the axis by a dotted drop line.
//
// Everything drawn is read from js/core/vtgraph.js (rule 4).

import { interior, floorboards, paper, softShadow, env, rng } from './scenery.js';
import { fitCanvas, unview, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha } from './util.js';
import { ballAt } from './figures.js';
import { pulse, ageOf } from './effects.js';
import { T, num } from '../notation.js';

const HUD = 250, HUD_H = 290;
const TAU = Math.PI * 2;
const INK = '#2a2420';
/** Three significant figures, trimmed: 60.107 → 60.1, 12 → 12, 1.75 → 1.75. */
const s3 = (x) => {
  if (!isFinite(x) || Math.abs(x) < 1e-12) return num(0, 0);
  return num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)))), { trim: true });
};

/* ── the layout: the hall fills the canvas, the graph card is the screen's ── */

function frame(w, h) {
  const phone = w < 520;
  if (phone) {
    const ch = clamp(Math.round(h * 0.42), 180, 280);
    return { phone, card: { x: 8, y: h - ch - 8, w: w - 16, h: ch }, floor: h - ch - 16 };
  }
  const cw = Math.min(w - HUD - 28, 740), ch = clamp(Math.round(h * 0.4), 200, 340);
  return { phone, card: { x: w - 16 - cw, y: 84, w: cw, h: ch }, floor: h };
}

/* ── the hall ──────────────────────────────────────────────────────────── */

/** Steel roof trusses across the top, and the hall's lights hanging from them. */
function roof(g, w, y0, d, E) {
  const steel = E.night ? '#3a3337' : '#8b8288';
  g.fillStyle = E.night ? '#231c20' : '#d7cbc1'; g.fillRect(-10, y0, w + 20, d);
  g.strokeStyle = steel; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-10, y0 + d); g.lineTo(w + 10, y0 + d); g.moveTo(-10, y0 + 3); g.lineTo(w + 10, y0 + 3); g.stroke();
  g.lineWidth = 1.6; g.beginPath();
  for (let x = -10, up = true; x < w + 10; x += d * 0.9, up = !up) { g.moveTo(x, up ? y0 + d : y0 + 3); g.lineTo(x + d * 0.9, up ? y0 + 3 : y0 + d); }
  g.stroke();
  for (let x = w * 0.08; x < w; x += Math.max(120, w * 0.2)) {
    g.strokeStyle = steel; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y0 + d); g.lineTo(x, y0 + d + 14); g.stroke();
    g.fillStyle = E.night ? '#4a4246' : '#6f676c'; g.beginPath(); g.moveTo(x - 16, y0 + d + 22); g.lineTo(x + 16, y0 + d + 22); g.lineTo(x + 9, y0 + d + 13); g.lineTo(x - 9, y0 + d + 13); g.closePath(); g.fill();
    g.fillStyle = E.night ? '#fff1d6' : '#fffaf0'; g.fillRect(x - 14, y0 + d + 21, 28, 3);
    const gl = g.createRadialGradient(x, y0 + d + 24, 0, x, y0 + d + 24, 90);
    gl.addColorStop(0, `rgba(255,240,210,${E.night ? 0.32 : 0.25})`); gl.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(x, y0 + d + 24, 90, 0, TAU); g.fill();
  }
}

/** Wall bars: a run of wooden rungs between uprights, fixed to the wall. */
function wallBars(g, x, base, wd, H, E) {
  const wood = E.night ? '#7a5d44' : '#b48b5e', dark = E.night ? '#4a3828' : '#83623f';
  softShadow(g, x + wd / 2 + 6, base, wd * 0.6, 4, 0.5);
  const n = Math.max(2, Math.round(wd / 34));
  for (let i = 0; i <= n; i++) { const ux = x + (i / n) * wd; g.fillStyle = dark; g.fillRect(ux - 3, base - H, 6, H); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(ux - 3, base - H, 2, H); }
  for (let y = base - H + 8; y < base - 4; y += 11) { g.fillStyle = wood; g.fillRect(x, y, wd, 3.5); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, y + 3.5, wd, 1.5); }
}

/** A basketball board on the wall: a backboard with its square, a ring and a net. */
function hoop(g, x, y, s, E) {
  g.fillStyle = E.night ? '#3a3337' : '#8b8288'; g.fillRect(x - 2, y - s * 0.3, 4, s * 0.5);
  g.fillStyle = E.night ? '#d9d2cc' : '#fbf8f4'; g.strokeStyle = E.night ? '#6b6266' : '#5e575b'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(x - s * 0.6, y - s * 0.75, s * 1.2, s * 0.72, 3); g.fill(); g.stroke();
  g.strokeStyle = E.night ? '#a8574a' : '#b95a48'; g.lineWidth = 2; g.strokeRect(x - s * 0.2, y - s * 0.38, s * 0.4, s * 0.3);
  g.beginPath(); g.ellipse(x, y, s * 0.24, s * 0.06, 0, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(240,236,230,0.75)'; g.lineWidth = 1; g.beginPath();
  for (let i = 0; i <= 4; i++) { const u = i / 4; g.moveTo(x - s * 0.24 + u * s * 0.48, y); g.lineTo(x - s * 0.13 + u * s * 0.26, y + s * 0.32); }
  g.moveTo(x - s * 0.19, y + s * 0.14); g.lineTo(x + s * 0.19, y + s * 0.14); g.stroke();
}

/** A long bench against the wall. */
function bench(g, x, base, wd, H, E) {
  softShadow(g, x + wd / 2, base + 1, wd * 0.55, 3, 0.6);
  g.fillStyle = E.night ? '#2c2a30' : '#4a474e';
  for (const e of [0.08, 0.92]) g.fillRect(x + wd * e - 2, base - H, 4, H);
  g.fillStyle = E.night ? '#6b5240' : '#a67f58'; g.fillRect(x, base - H - 4, wd, 5);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, base - H - 4, wd, 1.5);
}

/** A traffic cone standing on the floor: the start. */
function cone(g, x, base, H, E) {
  softShadow(g, x + 3, base + 1, H * 0.5, H * 0.1, 0.8);
  const c = E.night ? '#c0714c' : '#d9794e';
  const gr = g.createLinearGradient(x - H * 0.3, 0, x + H * 0.3, 0); gr.addColorStop(0, c); gr.addColorStop(1, E.night ? '#7a432c' : '#a4532f');
  g.fillStyle = E.night ? '#3a3236' : '#4e474b'; g.fillRect(x - H * 0.42, base - H * 0.1, H * 0.84, H * 0.1);
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - H * 0.3, base - H * 0.1); g.lineTo(x - H * 0.05, base - H); g.lineTo(x + H * 0.05, base - H); g.lineTo(x + H * 0.3, base - H * 0.1); g.closePath(); g.fill();
  g.fillStyle = '#f2ece2'; g.beginPath(); g.moveTo(x - H * 0.21, base - H * 0.42); g.lineTo(x - H * 0.13, base - H * 0.68); g.lineTo(x + H * 0.13, base - H * 0.68); g.lineTo(x + H * 0.21, base - H * 0.42); g.closePath(); g.fill();
}

/** The floor's painted court lines, running along the hall. */
function courtLines(g, w, y0, y1, E) {
  g.save(); g.strokeStyle = E.night ? 'rgba(222,200,150,0.55)' : 'rgba(255,255,255,0.8)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-10, y0 + (y1 - y0) * 0.35); g.lineTo(w + 10, y0 + (y1 - y0) * 0.35); g.stroke();
  g.strokeStyle = E.night ? 'rgba(160,190,200,0.45)' : 'rgba(90,120,140,0.55)';
  g.beginPath(); g.moveTo(-10, y0 + (y1 - y0) * 0.12); g.lineTo(w + 10, y0 + (y1 - y0) * 0.12); g.stroke();
  g.restore();
}

/** A ball rolling: the stadium's ball turned through the distance it has
    rolled, its light kept on the upper left, and its shadow on the floor. */
function rollingBall(g, x, ground, r, turned) {
  softShadow(g, x + r * 0.2, ground + 1, r * 1.1, r * 0.25, 1);
  g.save(); g.translate(x, ground - r); g.rotate(turned); ballAt(g, 0, 0, r); g.restore();
  const sh = g.createRadialGradient(x - r * 0.35, ground - r * 1.35, r * 0.1, x, ground - r, r);
  sh.addColorStop(0, 'rgba(255,255,255,0.28)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = sh; g.beginPath(); g.arc(x, ground - r, r, 0, TAU); g.fill();
}

/* ── the stage ─────────────────────────────────────────────────────────── */

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'vt') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), E = env();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const F = frame(w, h);
  const vs = f.P.map((p) => p.v);

  // the line's extent: every corner and every turning point, exactly
  const xsAt = [0, ...f.S.flatMap((s) => [s.x0, s.x1, ...(Math.abs(s.a) > 1e-12 && -s.v0 / s.a > 0 && -s.v0 / s.a < s.t1 - s.t0 ? [f.pos(s.t0 - s.v0 / s.a)] : [])])];
  let xLo = Math.min(...xsAt), xHi = Math.max(...xsAt); if (xHi - xLo < 1e-9) { xLo -= 1; xHi += 1; }

  // the hall: roof, wall, floor; the ball's line at Yb with the tape in front
  const rB = F.phone ? clamp(w * 0.04, 11, 16) : clamp(w * 0.026, 13, 24);
  const Yb = F.floor - (F.phone ? clamp(F.floor * 0.2, 46, 60) : clamp(h * 0.18, 78, 112));
  const Yf = Yb - (F.phone ? 20 : 36), tapeY = Yb + (F.phone ? 6 : 9), tapeD = F.phone ? 17 : 20;
  const roofD = F.phone ? 22 : 34;
  interior(g, -10, roofD, w + 10, Yf);
  roof(g, w, 0, roofD, E);
  wallBars(g, w * 0.03, Yf, Math.min(170, w * 0.2), (Yf - roofD) * 0.55, E);
  hoop(g, w * 0.62, roofD + (Yf - roofD) * 0.42, F.phone ? 40 : 64, E);
  bench(g, w * 0.3, Yf, Math.min(200, w * 0.24), F.phone ? 12 : 18, E);
  floorboards(g, -10, w + 10, Yf, h + 10);
  courtLines(g, w, Yf, Yb + 36, E);
  // the skirting where wall meets floor
  g.fillStyle = E.night ? '#2a2226' : '#9c8c80'; g.fillRect(-10, Yf - 5, w + 20, 5);

  // the line at one scale, O where the tape starts
  const margin = rB + 40, ll = margin, lr = w - margin, k = (lr - ll) / ((xHi - xLo) || 1), R = (x) => ll + (x - xLo) * k;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 3; g.shadowOffsetY = 1.5;
  g.fillStyle = E.night ? '#e2d6bc' : '#f6edd6'; g.fillRect(R(xLo) - 18, tapeY, R(xHi) - R(xLo) + 36, tapeD); g.restore();
  const step = niceStep(xHi - xLo, F.phone ? 5 : 9), minor = step / 5;
  for (let x = Math.ceil(xLo / minor) * minor; x <= xHi + 1e-9; x += minor) {
    const major = Math.abs(x / step - Math.round(x / step)) < 1e-6;
    g.fillStyle = INK; g.fillRect(R(x) - 0.6, tapeY, major ? 1.6 : 1, major ? tapeD * 0.4 : tapeD * 0.22);
    if (major) L.add(Math.abs(x) < 1e-9 ? 'O' : `${s3(x)} m`, R(x), tapeY + tapeD * 0.68, { color: INK, align: 'center', pri: Math.abs(x) < 1e-9 ? 7 : 1, size: 13, weight: Math.abs(x) < 1e-9 ? 800 : 600, bg: false, maxPush: 0 });
  }
  const coneH = F.phone ? 22 : 34;
  cone(g, R(0), Yb - 8, coneH, E);
  L.add('O, the start', R(0), Yb - 8 - coneH - 14, { color: P.ink, align: 'center', pri: 3, size: 13 });

  // the ball, rolled through the distance it has gone
  const x = f.pos(t), v = f.vel(t), bx = R(x);
  rollingBall(g, bx, Yb, rB, (bx - R(0)) / rB);

  // the moments it stops, sets off, turns back, or is back at the start
  const rest = (s) => Math.abs(s.v0) < 1e-12 && Math.abs(s.v1) < 1e-12;
  const sgn = (u) => (Math.abs(u) < 1e-12 ? 0 : Math.sign(u));
  const events = [];
  for (let i = 0; i < f.S.length; i++) {
    const s = f.S[i], tz = Math.abs(s.a) > 1e-12 ? s.t0 - s.v0 / s.a : -1;
    if (tz > s.t0 + 1e-9 && tz < s.t1 - 1e-9) events.push({ te: tz, text: 'turns back' });
    if (i === 0) continue;
    const p = f.S[i - 1];
    if (Math.abs(s.v0) > 1e-12) continue;
    if (rest(s) && !rest(p)) events.push({ te: s.t0, text: 'stops' });
    else if (rest(p) && !rest(s)) events.push({ te: s.t0, text: 'sets off' });
    else if (sgn(p.v0) * sgn(s.v1) < 0) events.push({ te: s.t0, text: 'turns back' });
  }
  for (const tz of f.times) events.push({ te: tz, text: Math.abs(f.target) < 1e-12 ? 'back at O' : T`${s3(f.target)} [m] from O`, at: true });
  if (!events.some((e) => Math.abs(e.te - f.tMax) < 1e-9)) events.push({ te: f.tMax, text: Math.abs(f.vel(f.tMax)) < 1e-12 ? 'comes to rest' : 'the end' });
  const ay = Yb - 2 * rB - 20;
  let caption = false;
  for (const ev of events) {
    const { age, life } = ageOf(t, ev.te, f.tMax, f.tMax / 12);
    if (age < 0 || age > life) continue;
    const ex = R(f.pos(ev.te));
    pulse(g, ex, Yb - rB, age, life, P.mark, { radius: rB * 2.4 });
    L.add(ev.text, ex, ay - 30, { color: P.mark, align: 'center', pri: 7, size: 14, weight: 700 });
    caption = true;
  }

  // its velocity along the line, dashed (rule 2): long enough to read, still in proportion
  if (show.velocity !== false && Math.abs(v) > 1e-9) {
    const vMax = Math.max(...vs.map(Math.abs), 1e-6), len = Math.sign(v) * (34 + (F.phone ? 40 : 66) * Math.abs(v) / vMax);
    arrow(g, bx, ay, bx + len, ay, { color: P.velVec, width: 2.8, head: 11, dash: [7, 4] });
    // the label tucked against the arrow: past its head, or on it when the head is at the edge
    const tip = bx + len + (v > 0 ? 3 : -3), fits = v > 0 ? tip + 84 < w : tip - 84 > 0;
    if (fits) L.add(T`${s3(v)} [m s^-1]`, tip, ay, { color: P.vel, align: v > 0 ? 'left' : 'right', pri: 7, size: 14, weight: 700, maxPush: 20 });
    else L.add(T`${s3(v)} [m s^-1]`, bx + len / 2, ay - 15, { color: P.vel, align: 'center', pri: 7, size: 14, weight: 700, maxPush: 20 });
  } else if (!caption) L.add('at rest', bx, ay, { color: P.ink, align: 'center', pri: 6, size: 13 });

  L.reserve(F.card);
  // on a laptop the readouts' column; on a phone the stage runs under it and is panned clear
  if (!F.phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H }); L.reserve({ x: w - 150, y: 0, w: 150, h: 70 }); }
  L.draw(g, w, h);

  // ── the graph: the screen's, not the hall's
  unview(g);
  graphCard(g, F.card, f, t, P, w, h);
  return null;
}

/** The (t, v) graph on its paper card: the area to now, the steepest piece,
    the corner times in one row under the plot, the times back at the start
    in the row under that on dotted drop lines. */
function graphCard(g, c, f, t, P, w, h) {
  const L = labels();
  paper(g, c.x, c.y, c.w, c.h);
  g.save(); g.strokeStyle = withAlpha(P.strong, 0.18); g.lineWidth = 1; g.beginPath(); g.roundRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, 8); g.stroke(); g.restore();
  const vs = f.P.map((p) => p.v), vHi = Math.max(...vs, 0), vLo = Math.min(...vs, 0), pad = (vHi - vLo || 1) * 0.12;
  const x0 = c.x + 52, x1 = c.x + c.w - 42, y0 = c.y + 40, y1 = c.y + c.h - (f.times.length ? 58 : 34);
  const X = (tt) => x0 + (tt / f.tMax) * (x1 - x0), V = (v) => y1 - ((v - (vLo - pad)) / (vHi - vLo + 2 * pad)) * (y1 - y0);
  L.add('Velocity–time graph', c.x + c.w - 14, c.y + 17, { color: P.strong, align: 'right', pri: 9, size: 13, weight: 700, bg: false });
  L.add(T`v` + ' (' + T`[m s^-1]` + ')', x0 - 8, c.y + 17, { color: P.muted, align: 'left', pri: 8, size: 13, bg: false });
  L.add(T`t` + ' (s)', x1 + 12, V(0), { color: P.muted, align: 'left', pri: 8, size: 13, bg: false });
  // the corners: faint uprights, their times in one row under the plot
  L.add(s3(0), x0, y1 + 14, { color: P.muted, align: 'center', pri: 2, size: 13, bg: false, maxPush: 0 });
  for (const p of f.P.slice(1)) {
    stroke(g, [{ x: X(p.t), y: y0 }, { x: X(p.t), y: y1 }], { color: withAlpha(P.faint, 0.35), width: 1 });
    L.add(s3(p.t), X(p.t), y1 + 14, { color: P.muted, align: 'center', pri: 2, size: 13, bg: false, maxPush: 0 });
  }
  // the area to now, each piece split where it crosses the axis: forwards stronger than back
  const shade = (ta, tb, va, vb) => { g.save(); g.fillStyle = withAlpha(P.disp, va + vb >= 0 ? 0.26 : 0.14);
    g.beginPath(); g.moveTo(X(ta), V(0)); g.lineTo(X(ta), V(va)); g.lineTo(X(tb), V(vb)); g.lineTo(X(tb), V(0)); g.closePath(); g.fill(); g.restore(); };
  for (const s of f.S) {
    const b = Math.min(s.t1, t); if (b <= s.t0) continue;
    const vb = s.v0 + s.a * (b - s.t0), tz = Math.abs(s.a) > 1e-12 ? s.t0 - s.v0 / s.a : -1;
    if (tz > s.t0 && tz < b) { shade(s.t0, tz, s.v0, 0); shade(tz, b, 0, vb); } else shade(s.t0, b, s.v0, vb);
  }
  stroke(g, [{ x: x0, y: V(0) }, { x: x1 + 10, y: V(0) }], { color: P.axis, width: 1.8 });
  stroke(g, [{ x: x0, y: y1 }, { x: x0, y: y0 - 8 }], { color: P.axis, width: 1.8 });
  const vstep = niceStep(vHi - vLo + 2 * pad, clamp(Math.floor((y1 - y0) / 24) + 1, 3, 7));
  for (let v = Math.ceil((vLo - pad) / vstep) * vstep; v <= vHi + pad + 1e-9; v += vstep) {
    stroke(g, [{ x: x0 - 4, y: V(v) }, { x: x0, y: V(v) }], { color: P.axis, width: 1.4 });
    L.add(s3(v), x0 - 8, V(v), { color: P.muted, align: 'right', pri: 2, size: 13, bg: false, maxPush: 0 });
  }
  for (const s of f.S) {
    const steep = f.steep.includes(s.i);
    stroke(g, [{ x: X(s.t0), y: V(s.v0) }, { x: X(s.t1), y: V(s.v1) }], { color: P.vel, width: steep ? 3.4 : 2.2, alpha: t >= s.t0 ? 1 : 0.45, dash: [6, 4] });
    if (steep) L.add(T`a = ${s3(s.a)} [m s^-2]`, (X(s.t0) + X(s.t1)) / 2 + 10, (V(s.v0) + V(s.v1)) / 2, { color: P.acc, align: 'left', pri: 6, size: 13, weight: 700 });
  }
  // each time it is back at the start, on a drop line to the row under the corners
  for (const tz of f.times) {
    stroke(g, [{ x: X(tz), y: V(0) }, { x: X(tz), y: y1 + 30 }], { color: P.mark, width: 1.3, dash: [2, 3] });
    if (t >= tz - 1e-9) dot(g, X(tz), V(0), 7, { stroke: P.mark, width: 2.2 });
    L.add(T`t = ${s3(tz)} [s]`, X(tz), y1 + 40, { color: P.mark, align: 'center', pri: 8, size: 13, weight: 700, maxPush: 0 });
  }
  stroke(g, [{ x: X(t), y: y0 - 4 }, { x: X(t), y: y1 }], { color: P.muted, width: 1.4, dash: [4, 4] });
  dot(g, X(t), V(f.vel(t)), 5, { fill: P.card, stroke: P.vel, width: 2.4 });
  L.draw(g, w, h);
}
