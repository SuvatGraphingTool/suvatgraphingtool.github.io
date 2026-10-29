// xtgraph.js — the stage for a displacement–time graph of straight pieces.
//
// Two pictures on one clock, as for the trip:
//   · THE PLACE, filling the canvas: a park — a tree line under the sky, a
//     lawn with trees, a bench and lamps, and a gravel path along the front
//     with a tape measure pegged out beside it from the post at A. The
//     particle P is a ball rolling along the path, with its velocity (along
//     the line: dashed, rule 2). Each corner of the graph — it stops, sets
//     off, turns back — and each time the formula after it reaches the speed
//     asked rings out at the engine's own time (effects.js).
//   · THE GRAPH, on a paper card that belongs to the screen: drawn after
//     unview() so it neither pans nor zooms, clear of the HUD, beside the
//     place on a laptop and below it on a phone. The pieces in the
//     displacement hue and dashed, the corners dotted, the corner times in
//     one row under the plot and what the engine found — the blank corner T,
//     the times of the speed asked — in a row under that, each joined to its
//     point by a dotted drop line.
//
// Everything drawn is read from js/core/xtgraph.js (rule 4).

import { skyscape, grass, paper, softShadow, env, rng } from './scenery.js';
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

/* ── the layout: the place fills the canvas, the graph card is the screen's ── */

function frame(w, h) {
  const phone = w < 520;
  if (phone) {
    const ch = clamp(Math.round(h * 0.42), 180, 280);
    return { phone, card: { x: 8, y: h - ch - 8, w: w - 16, h: ch }, floor: h - ch - 16 };
  }
  const cw = Math.min(w - HUD - 28, 740), ch = clamp(Math.round(h * 0.4), 200, 340);
  return { phone, card: { x: w - 16 - cw, y: 84, w: cw, h: ch }, floor: h };
}

/* ── the park ──────────────────────────────────────────────────────────── */

/** A tree on the lawn: a tapered trunk and a canopy of shaded clumps, lit from the left. */
function tree(g, x, base, H, E, r) {
  const tw = H * 0.07;
  softShadow(g, x + H * 0.08, base + 1, H * 0.32, H * 0.05, 0.7);
  const bark = g.createLinearGradient(x - tw, 0, x + tw, 0);
  bark.addColorStop(0, E.night ? '#4a3a32' : '#7a6150'); bark.addColorStop(1, E.night ? '#2a201c' : '#4e3d33');
  g.fillStyle = bark; g.beginPath(); g.moveTo(x - tw, base); g.lineTo(x - tw * 0.5, base - H * 0.55); g.lineTo(x + tw * 0.5, base - H * 0.55); g.lineTo(x + tw, base); g.closePath(); g.fill();
  const lit = E.night ? '#46503a' : '#8d9c63', mid = E.night ? '#343c2b' : '#6c7a48', dark = E.night ? '#242a1e' : '#4c5734';
  const cy = base - H * 0.62, R = H * 0.36;
  const clumps = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + r() * 0.5; clumps.push({ x: x + Math.cos(a) * R * 0.55, y: cy + Math.sin(a) * R * 0.45 - R * 0.1, rad: R * (0.45 + r() * 0.2) }); }
  clumps.push({ x, y: cy - R * 0.2, rad: R * 0.62 });
  for (const c of clumps) {
    const gr = g.createRadialGradient(c.x - c.rad * 0.4, c.y - c.rad * 0.45, c.rad * 0.1, c.x, c.y, c.rad);
    gr.addColorStop(0, lit); gr.addColorStop(0.6, mid); gr.addColorStop(1, dark);
    g.fillStyle = gr; g.beginPath(); g.arc(c.x, c.y, c.rad, 0, TAU); g.fill();
  }
  g.fillStyle = withAlpha(E.night ? '#7d8a5c' : '#b5c28a', 0.5);
  for (let i = 0; i < 14; i++) { const a = r() * TAU, d = r() * R * 0.8; g.beginPath(); g.arc(x - R * 0.2 + Math.cos(a) * d * 0.7, cy - R * 0.25 + Math.sin(a) * d * 0.5, 1.5 + r() * 2, 0, TAU); g.fill(); }
}

/** A park bench: wooden slats on iron ends. */
function bench(g, x, base, H, E) {
  const wd = H * 1.6, wood = E.night ? '#5c4636' : '#9a7652', iron = E.night ? '#232023' : '#36333a';
  softShadow(g, x, base + 1, wd * 0.55, 3, 0.7);
  g.fillStyle = iron;
  for (const e of [-1, 1]) { g.fillRect(x + e * wd * 0.42 - 2, base - H * 0.5, 4, H * 0.5); g.fillRect(x + e * wd * 0.42 - 2, base - H * 0.95, 4, H * 0.45); }
  g.fillStyle = wood;
  for (let i = 0; i < 2; i++) g.fillRect(x - wd / 2, base - H * 0.5 - i * 4, wd, 3);
  for (let i = 0; i < 3; i++) g.fillRect(x - wd / 2, base - H * 0.65 - i * H * 0.12, wd, H * 0.08);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x - wd / 2, base - H * 0.65 - 2 * H * 0.12, wd, 1);
}

/** A park lamp: a post, a lantern; lit by night. */
function lamp(g, x, base, H, E) {
  g.fillStyle = E.night ? '#232023' : '#36333a';
  g.fillRect(x - 2, base - H, 4, H); g.fillRect(x - 4, base - 6, 8, 6);
  g.beginPath(); g.moveTo(x - 7, base - H); g.lineTo(x + 7, base - H); g.lineTo(x + 4, base - H - 12); g.lineTo(x - 4, base - H - 12); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#ffe7bf' : '#e8e2d6'; g.fillRect(x - 4, base - H - 10, 8, 8);
  if (E.night) {
    const gl = g.createRadialGradient(x, base - H - 6, 0, x, base - H - 6, H * 0.6);
    gl.addColorStop(0, 'rgba(255,225,170,0.38)'); gl.addColorStop(1, 'rgba(255,225,170,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(x, base - H - 6, H * 0.6, 0, TAU); g.fill();
  }
}

/** The gravel path from y0 to y1: a warm bed with grain and pebbles, edged with stones. */
function path(g, x0, x1, y0, y1, E) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, E.night ? '#5b5047' : '#cdbb9f'); gr.addColorStop(1, E.night ? '#463d36' : '#b29f82');
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const r = rng(77);
  for (let i = 0; i < (x1 - x0) * (y1 - y0) / 40; i++) {
    g.fillStyle = withAlpha(r() < 0.5 ? '#000000' : '#ffffff', E.night ? 0.12 : 0.16);
    g.beginPath(); g.arc(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 0.6 + r() * 1.3, 0, TAU); g.fill();
  }
  // edging: a line of setts along the back, a timber board along the front
  g.fillStyle = E.night ? '#6a6064' : '#a9a09a';
  for (let x = x0; x < x1; x += 12) { g.beginPath(); g.roundRect(x + 1, y0 - 4, 10, 5, 1.5); g.fill(); }
  g.fillStyle = E.night ? '#4a3a30' : '#7d6248'; g.fillRect(x0, y1 - 3, x1 - x0, 4);
}

/** A post with a plate on it, the letter of a fixed point. */
function marker(g, x, base, H, letter, E) {
  softShadow(g, x + 3, base + 1, 10, 3, 0.8);
  g.fillStyle = E.night ? '#5a4436' : '#8a6a4c'; g.fillRect(x - 3, base - H, 6, H);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - 3, base - H, 2, H);
  const pw = 22, ph = 22, py = base - H - ph + 4;
  g.fillStyle = '#f4ecdc'; g.beginPath(); g.roundRect(x - pw / 2, py, pw, ph, 4); g.fill();
  g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
  g.save(); g.font = '700 15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(letter, x, py + ph / 2 + 1); g.restore();
  return { x: x - pw / 2, y: py, w: pw, h: ph };
}

/** A cloth tape measure pegged along the line, y0 its top, d deep: cream, ink ticks. */
function tape(g, x0, x1, y0, d, E) {
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 3; g.shadowOffsetY = 1.5;
  g.fillStyle = E.night ? '#e2d6bc' : '#f6edd6'; g.fillRect(x0, y0, x1 - x0, d);
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x0, y0 + d - 2, x1 - x0, 2);
}

/** A ball rolling: the stadium's ball turned through the distance it has
    rolled, its light kept on the upper left, and its shadow on the ground. */
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
  if (!f || f.kind !== 'xt') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), E = env();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const F = frame(w, h);

  // the line's extent: every point the motion reaches
  const n = 200, xs = [];
  for (let i = 0; i <= n; i++) xs.push(f.pos((i / n) * f.tMax));
  const xHi = Math.max(...xs, 0), xLo = Math.min(...xs, 0);

  // the place: sky, a lawn with trees, the path at Yg, the tape in front of it
  const rB = F.phone ? clamp(w * 0.04, 11, 16) : clamp(w * 0.026, 13, 24);
  const Yg = F.floor - (F.phone ? clamp(F.floor * 0.22, 54, 70) : clamp(h * 0.2, 84, 130));
  const pathTop = Yg - (F.phone ? 8 : 12), pathBot = Yg + (F.phone ? 12 : 18), tapeY = pathBot + 4, tapeD = F.phone ? 17 : 20;
  const Yh = Yg - (F.phone ? clamp(F.floor * 0.32, 60, 110) : clamp(h * 0.32, 110, 200));
  skyscape(g, 0, 0, w, Yh, { far: 'trees', seed: 31, clouds: 4 });
  grass(g, -10, w + 10, Yh, pathTop, { seed: 5 });
  const r = rng(91), TH = F.phone ? 90 : clamp(h * 0.34, 120, 230);
  for (let x = -20; x < w + 40; x += TH * (0.55 + r() * 0.35)) tree(g, x, Yh + (Yg - Yh) * 0.25, TH * (0.45 + r() * 0.15), E, r);
  const fr = rng(93);
  for (let x = TH * 0.3; x < w + 40; x += TH * (1.2 + fr() * 0.8)) tree(g, x, pathTop - 6, TH * (0.8 + fr() * 0.25), E, fr);
  bench(g, w * 0.36, pathTop - 4, F.phone ? 22 : 30, E);
  for (let x = w * 0.12; x < w; x += w * 0.42) lamp(g, x, pathTop - 3, TH * 0.6, E);
  path(g, -10, w + 10, pathTop, pathBot, E);
  grass(g, -10, w + 10, pathBot + 1, h + 10, { seed: 9 });

  // the line at one scale, A where the tape starts
  const margin = rB + 40, ll = margin, lr = w - margin, k = (lr - ll) / ((xHi - xLo) || 1), R = (x) => ll + (x - xLo) * k;
  tape(g, R(xLo) - 18, R(xHi) + 18, tapeY, tapeD, E);
  const step = niceStep(xHi - xLo, F.phone ? 5 : 9), minor = step / 5;
  for (let x = Math.ceil(xLo / minor) * minor; x <= xHi + 1e-9; x += minor) {
    const major = Math.abs(x / step - Math.round(x / step)) < 1e-6;
    g.fillStyle = INK; g.fillRect(R(x) - 0.6, tapeY, major ? 1.6 : 1, major ? tapeD * 0.4 : tapeD * 0.22);
    if (major) L.add(Math.abs(x) < 1e-9 ? 'A' : `${s3(x)} m`, R(x), tapeY + tapeD * 0.68, { color: INK, align: 'center', pri: Math.abs(x) < 1e-9 ? 7 : 1, size: 13, weight: Math.abs(x) < 1e-9 ? 800 : 600, bg: false, maxPush: 0 });
  }
  L.reserve(marker(g, R(0), pathTop - 2, F.phone ? 30 : 42, 'A', E));

  // P, the ball, rolled through the distance it has gone
  const x = f.pos(t), v = f.vel(t), bx = R(x);
  rollingBall(g, bx, Yg, rB, (bx - R(f.pos(0))) / rB);

  // each corner, and each time the speed asked is reached, rung out at the engine's time
  const events = [];
  for (let i = 1; i < f.S.length; i++) {
    const a = f.S[i - 1].v, b = f.S[i].v, te = f.S[i].t0;
    const text = Math.abs(b) < 1e-12 ? 'stops' : Math.abs(a) < 1e-12 ? 'sets off' : a * b < 0 ? 'turns back' : Math.abs(b) > Math.abs(a) ? 'speeds up' : 'slows down';
    if (Math.abs(a - b) > 1e-12) events.push({ te, text });
  }
  if (f.tail) {
    if (Math.abs(f.tail.a) > 1e-12) events.push({ te: f.tEnd, text: 'accelerating' });
    for (const ts of f.tail.ts || []) events.push({ te: ts, text: T`speed ${s3(f.tail.speed)} [m s^-1]` });
  } else events.push({ te: f.tMax, text: 'the end' });
  const vMax = Math.max(...f.S.map((s) => Math.abs(s.v)), ...(f.tail ? [Math.abs(f.vel(f.tMax)), Math.abs(f.vel(f.tEnd + 1e-9))] : []), 1e-6);
  const ay = Yg - 2 * rB - 20;
  for (const ev of events) {
    const { age, life } = ageOf(t, ev.te, f.tMax, f.tMax / 12);
    if (age < 0 || age > life) continue;
    pulse(g, R(f.pos(ev.te)), Yg - rB, age, life, P.mark, { radius: rB * 2.4 });
    L.add(ev.text, R(f.pos(ev.te)), ay - 30, { color: P.mark, align: 'center', pri: 7, size: 14, weight: 700 });
  }

  // its velocity along the line, dashed (rule 2): long enough to read, still in proportion
  if (show.velocity !== false && Math.abs(v) > 1e-9) {
    const len = Math.sign(v) * (34 + (F.phone ? 40 : 66) * Math.abs(v) / vMax);
    arrow(g, bx, ay, bx + len, ay, { color: P.velVec, width: 2.8, head: 11, dash: [7, 4] });
    const tip = bx + len + (v > 0 ? 8 : -8), fits = v > 0 ? tip + 84 < w : tip - 84 > 0;
    if (fits) L.add(T`${s3(v)} [m s^-1]`, tip, ay, { color: P.vel, align: v > 0 ? 'left' : 'right', pri: 7, size: 14, weight: 700 });
    else L.add(T`${s3(v)} [m s^-1]`, bx - Math.sign(v) * (rB + 8), ay, { color: P.vel, align: v > 0 ? 'right' : 'left', pri: 7, size: 14, weight: 700 });
  } else L.add('at rest', bx, ay, { color: P.ink, align: 'center', pri: 6, size: 13 });
  L.add('P', bx - rB - 10, Yg - 2 * rB, { color: P.ink, align: 'right', pri: 8, size: 15, weight: 700 });

  L.reserve(F.card);
  // on a laptop the readouts' column; on a phone the stage runs under it and is panned clear
  if (!F.phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H }); L.reserve({ x: w - 150, y: 0, w: 150, h: 70 }); }
  L.draw(g, w, h);

  // ── the graph: the screen's, not the place's
  unview(g);
  graphCard(g, F.card, f, t, P, w, h, xLo, xHi);
  return null;
}

/** The (t, x) graph on its paper card: corners in one row under the plot,
    what the engine found in the row under that, each on a drop line. */
function graphCard(g, c, f, t, P, w, h, xLo, xHi) {
  const L = labels();
  paper(g, c.x, c.y, c.w, c.h);
  g.save(); g.strokeStyle = withAlpha(P.strong, 0.18); g.lineWidth = 1; g.beginPath(); g.roundRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, 8); g.stroke(); g.restore();
  const found = [];
  if (f.blank != null) found.push({ t: f.blank, x: f.pos(f.blank), text: T`T = ${s3(f.blank)} [s]` });
  for (const ts of f.tail?.ts || []) found.push({ t: ts, x: f.pos(ts), text: T`t = ${s3(ts)} [s]`, ring: true });
  const x0 = c.x + 52, x1 = c.x + c.w - 42, y0 = c.y + 40, y1 = c.y + c.h - (found.length ? 58 : 34);
  const pad = (xHi - xLo || 1) * 0.1;
  const X = (tt) => x0 + (tt / f.tMax) * (x1 - x0), V = (x) => y1 - ((x - (xLo - pad)) / (xHi - xLo + 2 * pad)) * (y1 - y0);
  L.add('Displacement–time graph', c.x + c.w - 14, c.y + 17, { color: P.strong, align: 'right', pri: 9, size: 13, weight: 700, bg: false });
  L.add(T`x [m]`, x0 - 8, c.y + 17, { color: P.muted, align: 'left', pri: 8, size: 13, bg: false });
  L.add(T`t [s]`, x1 + 12, V(0), { color: P.muted, align: 'left', pri: 8, size: 13, bg: false });
  // the corners: faint uprights, their times in one row under the plot
  for (const p of f.P.slice(1)) {
    stroke(g, [{ x: X(p.t), y: y0 }, { x: X(p.t), y: y1 }], { color: withAlpha(P.faint, 0.35), width: 1 });
    L.add(s3(p.t), X(p.t), y1 + 14, { color: P.muted, align: 'center', pri: 2, size: 13, bg: false, maxPush: 0 });
  }
  L.add(s3(0), x0, y1 + 14, { color: P.muted, align: 'center', pri: 2, size: 13, bg: false, maxPush: 0 });
  stroke(g, [{ x: x0, y: V(0) }, { x: x1 + 10, y: V(0) }], { color: P.axis, width: 1.8 });
  stroke(g, [{ x: x0, y: y1 }, { x: x0, y: y0 - 8 }], { color: P.axis, width: 1.8 });
  const xstep = niceStep(xHi - xLo + 2 * pad, clamp(Math.floor((y1 - y0) / 24) + 1, 3, 7));
  for (let x = Math.ceil((xLo - pad) / xstep) * xstep; x <= xHi + pad + 1e-9; x += xstep) {
    stroke(g, [{ x: x0 - 4, y: V(x) }, { x: x0, y: V(x) }], { color: P.axis, width: 1.4 });
    L.add(s3(x), x0 - 8, V(x), { color: P.muted, align: 'right', pri: 2, size: 13, bg: false, maxPush: 0 });
  }
  // the pieces, the corners dotted, and the curve after the last corner
  for (const s of f.S) {
    const on = t >= s.t0 - 1e-9 && t <= s.t1 + 1e-9;
    stroke(g, [{ x: X(s.t0), y: V(s.x0) }, { x: X(s.t1), y: V(s.x1) }], { color: P.disp, width: on ? 3.2 : 2.2, alpha: t >= s.t0 ? 1 : 0.4, dash: [6, 4] });
  }
  if (f.tail) {
    const pts = []; for (let i = 0; i <= 60; i++) { const tt = f.tEnd + (i / 60) * (f.tMax - f.tEnd); pts.push({ x: X(tt), y: V(f.pos(tt)) }); }
    stroke(g, pts, { color: P.disp, width: t > f.tEnd ? 3 : 2.2, alpha: t > f.tEnd ? 1 : 0.4, dash: [6, 4] });
  }
  for (const p of f.P.slice(1)) dot(g, X(p.t), V(p.x), 3.5, { fill: P.card, stroke: P.disp, width: 1.8 });
  // what the engine found, in the row under the corners, on dotted drop lines
  for (const q of found) {
    stroke(g, [{ x: X(q.t), y: V(q.x) }, { x: X(q.t), y: y1 + 30 }], { color: P.mark, width: 1.3, dash: [2, 3] });
    if (q.ring && t >= q.t - 1e-9) dot(g, X(q.t), V(q.x), 7, { stroke: P.mark, width: 2.2 });
    L.add(q.text, X(q.t), y1 + 40, { color: P.mark, align: 'center', pri: 8, size: 13, weight: 700, maxPush: 0 });
  }
  // the velocities asked, once the clock reaches them
  for (const a of f.asked) if (a.v != null && t >= a.t - 1e-9) {
    dot(g, X(a.t), V(f.pos(a.t)), 6, { stroke: P.vel, width: 2 });
    L.add(T`v = ${s3(a.v)} [m s^-1]`, X(a.t) + 10, V(f.pos(a.t)) - 14, { color: P.vel, align: 'left', pri: 6, size: 13, weight: 700 });
  }
  stroke(g, [{ x: X(t), y: y0 - 4 }, { x: X(t), y: y1 }], { color: P.muted, width: 1.4, dash: [4, 4] });
  dot(g, X(t), V(f.pos(t)), 5, { fill: P.card, stroke: P.disp, width: 2.4 });
  L.draw(g, w, h);
}
