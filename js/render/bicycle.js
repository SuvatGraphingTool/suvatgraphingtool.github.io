// bicycle.js — the stage for two travellers and one bicycle: a country road
// side on, through hills, A in the far lane and B in the near one.
//
// The road runs from the start (a fingerpost) to the finish J (a village's
// name sign and its cottages), with a marker post at every round distance and
// its number under the road. A rides off on the bicycle; where the engine
// says it is left (D), A climbs off, the bicycle is laid against the verge
// and A walks on. B walks from the start, reaches it, and rides on; the
// bicycle pulses where it changes hands. Each moves at the stride or the
// cadence its own speed gives (phaseFor), with its velocity arrow dashed,
// along the road (rule 2), and its letter. At the finish both pulse together.
//
// Everything drawn is read from js/core/bicycle.js (rule 4).

import { landscape, env, rng, softShadow } from './scenery.js';
import { fitCanvas, unview, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha, cssVar, hudBoxes } from './util.js';
import { drawFigure, phaseFor } from './figures.js';
import { road, verge, markerPost, bush, s3 } from './lanes.js';
import { pulse, ageOf } from './effects.js';
import { T } from '../notation.js';

const TAU = Math.PI * 2;

/** A bicycle with no rider, leaning on its stand at the roadside: two spoked
    wheels, the diamond frame in the rider's maroon, saddle, bars, chainring.
    (x, Y) the ground under its back wheel, L px long, facing `dir`. */
export function bicycle(g, x, Y, L, { dir = 1, lean = 0.08 } = {}) {
  const E = env(), r = L * 0.2;
  const paint = E.night ? '#8a4b55' : '#7d3e48';
  softShadow(g, x + (L * 0.5 - r) * dir, Y + 1, L * 0.5, Math.max(2, L * 0.04), 0.7);
  g.save(); g.translate(x, Y); g.scale(dir, 1); g.rotate(-lean * 0.2);
  const RH = { x: r, y: -r }, FH = { x: L - r, y: -r }, BB = { x: L * 0.42, y: -r * 0.95 }, ST = { x: L * 0.36, y: -r * 2.6 }, HT = { x: L * 0.76, y: -r * 2.55 };
  for (const c of [RH, FH]) {
    g.strokeStyle = E.night ? 'rgba(220,214,210,0.5)' : 'rgba(90,84,86,0.55)'; g.lineWidth = Math.max(0.6, r * 0.025);
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 8, cx = Math.cos(a) * r * 0.86, sy = Math.sin(a) * r * 0.86; g.beginPath(); g.moveTo(c.x - cx, c.y - sy); g.lineTo(c.x + cx, c.y + sy); g.stroke(); }
    g.strokeStyle = '#1d1a1b'; g.lineWidth = Math.max(1.6, r * 0.14); g.beginPath(); g.arc(c.x, c.y, r - g.lineWidth / 2, 0, TAU); g.stroke();
    g.fillStyle = '#4a4446'; g.beginPath(); g.arc(c.x, c.y, Math.max(1.4, r * 0.1), 0, TAU); g.fill();
  }
  g.strokeStyle = paint; g.lineWidth = Math.max(2, L * 0.035); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(RH.x, RH.y); g.lineTo(BB.x, BB.y); g.lineTo(ST.x, ST.y); g.lineTo(RH.x, RH.y); g.moveTo(ST.x, ST.y); g.lineTo(HT.x, HT.y); g.lineTo(BB.x, BB.y); g.moveTo(HT.x, HT.y); g.lineTo(FH.x, FH.y); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ST.x, ST.y - 1); g.lineTo(HT.x, HT.y - 1); g.stroke();
  // saddle, bars, the chainring and a pedal
  g.fillStyle = '#26232a'; g.beginPath(); g.ellipse(ST.x - L * 0.02, ST.y - r * 0.18, L * 0.08, r * 0.1, 0, 0, TAU); g.fill();
  g.strokeStyle = '#3a3640'; g.lineWidth = Math.max(1.6, L * 0.025); g.beginPath(); g.moveTo(HT.x, HT.y); g.lineTo(HT.x + L * 0.02, HT.y - r * 0.35); g.lineTo(HT.x + L * 0.1, HT.y - r * 0.3); g.stroke();
  g.strokeStyle = '#8a8f96'; g.lineWidth = 1.4; g.beginPath(); g.arc(BB.x, BB.y, r * 0.3, 0, TAU); g.stroke();
  g.strokeStyle = '#26232a'; g.lineWidth = 2; g.beginPath(); g.moveTo(BB.x, BB.y); g.lineTo(BB.x + r * 0.2, BB.y + r * 0.45); g.stroke();
  // the stand, down to the ground
  g.strokeStyle = '#5a5e66'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(BB.x - r * 0.2, BB.y); g.lineTo(BB.x - r * 0.55, 0); g.stroke();
  g.restore();
}

/** A fingerpost: a post with one arm pointing along the road, at x on Y. */
function fingerpost(g, x, Y, hh, word, dir = 1) {
  const E = env();
  g.save();
  g.fillStyle = E.night ? '#d8d2c8' : '#f1ece2'; g.fillRect(x - 2.5, Y - hh, 5, hh);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 0.5, Y - hh, 2, hh);
  g.fillStyle = '#1e1a1c'; g.beginPath(); g.arc(x, Y - hh - 2, 4, 0, TAU); g.fill();
  g.font = `700 13px ${cssVar('--font', 'system-ui, sans-serif')}`;
  const tw = g.measureText(word).width + 18, ay = Y - hh * 0.78;
  g.fillStyle = '#f4efe6'; g.strokeStyle = '#1e1a1c'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(x, ay - 9); g.lineTo(x + tw * dir, ay - 9); g.lineTo(x + (tw + 10) * dir, ay); g.lineTo(x + tw * dir, ay + 9); g.lineTo(x, ay + 9); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#1e1a1c'; g.textBaseline = 'middle'; g.textAlign = dir > 0 ? 'left' : 'right'; g.fillText(word, x + 8 * dir, ay + 1);
  g.restore();
}

/** Cottages at the edge of the village at the journey's end, from x on. */
function village(g, x, Y, s, seed = 3) {
  const E = env(), r = rng(seed);
  for (let i = 0; i < 3; i++) {
    const cx = x + i * s * 1.25 + r() * s * 0.2, cw = s * (0.9 + r() * 0.3), ch = s * (0.55 + r() * 0.2);
    softShadow(g, cx + cw / 2, Y + 1, cw * 0.6, 3, 0.5);
    g.fillStyle = E.night ? ['#6a5e54', '#5e5a62', '#706452'][i] : ['#e3d6bf', '#d6cfc4', '#e8dcc0'][i]; g.fillRect(cx, Y - ch, cw, ch);
    g.fillStyle = E.night ? '#3a2e2c' : '#8a4a3a'; g.beginPath(); g.moveTo(cx - 4, Y - ch); g.lineTo(cx + cw / 2, Y - ch - s * 0.45); g.lineTo(cx + cw + 4, Y - ch); g.closePath(); g.fill();
    g.fillStyle = E.night ? withAlpha(E.window, 0.85) : '#4a5a6a';
    for (const fx of [0.2, 0.62]) g.fillRect(cx + cw * fx, Y - ch * 0.75, cw * 0.18, ch * 0.28);
    g.fillStyle = E.night ? '#2a2420' : '#5a3e2e'; g.fillRect(cx + cw * 0.42, Y - ch * 0.5, cw * 0.16, ch * 0.5);
    g.fillStyle = E.night ? '#4a3e3a' : '#7a6a5e'; g.fillRect(cx + cw * 0.7, Y - ch - s * 0.4, s * 0.1, s * 0.22);
  }
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'bicycle') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HUD = hudBoxes(w, phone ? 2 : 4);
  for (const b of HUD) L.reserve(b);
  const U = f.U;

  // ── the road along the bottom, A in the far lane and B in the near
  const Lf = clamp(h * 0.17, phone ? 50 : 64, 110);           // a person's (and a bicycle's) size
  const d = Math.max(2 * Lf * 0.95 + 26, 110);
  const below = phone ? 60 : 48;
  const R = Math.round(h - below - d);
  const horizon = R - 28;
  const sx0 = phone ? 40 : Math.max(80, HUD[0].x + HUD[0].w + 34), sx1 = w - (phone ? 96 : 230);
  const S = (x) => sx0 + (x / f.J) * (sx1 - sx0);
  landscape(g, w, h, horizon, { far: 'hills', seed: 57, clouds: 5 });
  // a hedgerow along the far side of the fields, its trees standing up out of it, and telegraph poles along the road
  { const r = rng(91);
    for (let x = -20; x < w + 40; x += 34 + r() * 30) bush(g, x, horizon + 4, clamp(Lf * (0.5 + r() * 0.3), 24, 60), Math.floor(r() * 99));
    for (let x = 30 + r() * 60; x < w; x += 170 + r() * 90) { const tH = clamp(Lf * (1.3 + r() * 0.6), 60, 150); const E2 = env();
      g.fillStyle = E2.night ? '#2a2420' : '#5a4636'; g.fillRect(x - 2, horizon + 4 - tH * 0.45, 4, tH * 0.45);
      for (const [dx, dy, rr] of [[0, -0.55, 0.32], [-0.18, -0.42, 0.24], [0.2, -0.45, 0.26]]) { const cx = x + dx * tH, cy = horizon + 4 + dy * tH, R0 = rr * tH;
        const gr = g.createRadialGradient(cx - R0 * 0.4, cy - R0 * 0.4, R0 * 0.1, cx, cy, R0); gr.addColorStop(0, E2.night ? '#3e4a30' : '#86a05a'); gr.addColorStop(1, E2.night ? '#1c2416' : '#3e5428');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R0, 0, TAU); g.fill(); } }
    const poleH = clamp(Lf * 1.6, 80, 170), E3 = env();
    for (let x = 60; x < w; x += 260) { g.fillStyle = E3.night ? '#3a2e26' : '#6e5440'; g.fillRect(x - 2.5, R - 14 - poleH, 5, poleH); g.fillRect(x - 14, R - 14 - poleH + 8, 28, 3); }
    g.strokeStyle = E3.night ? 'rgba(200,200,200,0.25)' : 'rgba(40,40,40,0.35)'; g.lineWidth = 1;
    for (const dy of [9, 9]) { g.beginPath(); for (let x = 60; x < w + 260; x += 260) { const y0 = R - 14 - poleH + dy; if (x === 60) g.moveTo(x - 12, y0); else g.quadraticCurveTo(x - 130, y0 + 12, x - 12, y0); } g.stroke(); } }
  const keep = [[S(0) - 40, S(0) + 30], [S(f.D) - Lf, S(f.D) + Lf], [S(f.J) - 20, w]];
  verge(g, 0, w, R - 11, { seed: 63, scale: phone ? 0.8 : 1, keep });
  road(g, 0, w, R, d, { seed: 29 });
  const yB = R + d - 8, yA = R + d * 0.5 - 6;

  // the start, and the village at the finish
  fingerpost(g, S(0) - 6, R - 6, Lf * 1.25, phone ? 'start' : 'the start', 1);
  village(g, S(f.J) + 18, R - 8, clamp(Lf * 0.9, 40, 70));
  g.save(); for (let y = R + 3, k = 0; y < R + d - 4; y += 6, k++) for (let c = 0; c < 2; c++) { g.fillStyle = (k + c) % 2 ? '#1e1a1c' : '#f3eee6'; g.fillRect(S(f.J) - 6 + c * 6, y, 6, Math.min(6, R + d - 4 - y)); } g.restore();

  // marker posts at round distances, numbered under the road
  const step = niceStep(f.J, phone ? 4 : 8);
  for (let x = step; x < f.J - step * 0.4; x += step) {
    if (Math.abs(S(x) - S(f.D)) < 26) continue;
    markerPost(g, S(x), R - 6, 18);
    L.add(T`${s3(x)} [${U.len}]`, S(x), R + d + 16, { color: P.muted, size: 13, align: 'center', pri: 1, maxPush: 0 });
  }
  L.add(T`J = ${s3(f.J)} [${U.len}]`, S(f.J), R + d + 16, { color: P.mark, size: 14, weight: 700, align: 'center', pri: 6, maxPush: 0 });
  L.add(T`D = ${s3(f.D)} [${U.len}]`, S(f.D), R + d + 16, { color: P.ink, size: 14, weight: 700, align: 'center', pri: 6, maxPush: 0 });
  // where the bicycle is left: a small post with a bicycle sign, and a tick across the road
  g.save(); g.setLineDash([3, 4]); stroke(g, [{ x: S(f.D), y: R + 2 }, { x: S(f.D), y: R + d - 2 }], { color: P.muted, width: 1.4 }); g.restore();

  // ── the bicycle where it lies, between A leaving it and B finding it
  // the bicycle between riders: A wheels it to the verge and stands it there; B, arriving,
  // takes it from the verge into the lane (art only, round the engine's two moments)
  const bk = f.bikeAt(t), hand = f.tMax * 0.05, ease = (u) => u * u * (3 - 2 * u);
  const verge0 = R - 4;
  if (!bk.who) {
    const u = t < f.tA1 + hand ? ease(clamp((t - f.tA1) / hand, 0, 1)) : t > f.tB1 - hand ? 1 - ease(clamp((f.tB1 - t) / hand, 0, 1)) : null;
    const y = u == null ? verge0 : t < f.tA1 + hand ? yA + (verge0 - yA) * u : verge0 + (yB - verge0) * u;
    bicycle(g, S(f.D) - Lf * 0.5, y, Lf, { dir: 1, lean: u == null ? 0.08 : 0 });
    if (u == null) L.add('the bicycle', S(f.D), R - Lf * 1.05, { color: P.ink, size: 13, weight: 700, align: 'center', pri: 5 });
  }
  // it changes hands: a pulse round the bicycle where A leaves it, and where B takes it
  for (const [tt, y] of [[f.tA1, yA], [f.tB1, yB]]) {
    if (!fired || t < tt - 1e-9) continue;
    const { age, life } = ageOf(t, tt, f.tMax);
    pulse(g, S(f.D), y - Lf * 0.3, age, life, P.mark, { radius: Lf * 1.1 });
  }

  // ── A and B: riding or walking, at their own speeds
  const who = [
    { name: 'A', y: yA, pos: f.posA, vel: f.velA, rides: (tt) => tt < f.tA1, col: null, ink: P.ink, walkSpeed: f.A.walk, rideSpeed: f.A.ride, t0: 0, t1: f.tA1 },
    { name: 'B', y: yB, pos: f.posB, vel: f.velB, rides: (tt) => tt >= f.tB1, col: P.second, ink: P.second, walkSpeed: f.B.walk, rideSpeed: f.B.ride, t0: f.tB1 },
  ];
  const kpx = (sx1 - sx0) / f.J;                                 // px per unit of distance, for the strides
  for (const p of who) {
    const x = S(p.pos(t)), riding = p.rides(t), kind = riding ? 'cyclist' : 'runner';
    // the distance this one has gone in its present way of moving, for its stride
    const gone = riding ? (p.name === 'A' ? p.pos(t) : p.pos(t) - f.D) : (p.name === 'A' ? p.pos(t) - f.D : p.pos(t));
    const done = fired && t >= f.T - 1e-9;
    if (riding) drawFigure(g, 'cyclist', x, p.y, Lf, P, { dir: 1, ring: p.col, phase: phaseFor('cyclist', Lf, gone * kpx) });
    else drawFigure(g, 'runner', x, p.y, Lf * 0.98, P, { dir: 1, ring: p.col, still: !fired || done || t === 0, phase: phaseFor('runner', Lf, gone * kpx * 0.35) });
    // its velocity, along the road: dashed (rule 2)
    if (fired && !done && t > 0) {
      // in front of it, at waist height in its own lane, never up on the verge
      const v = p.vel(t), len = clamp((v / Math.max(f.A.ride, f.B.ride)) * Lf * 1.6, 40, Lf * 1.8), vy = p.y - Lf * 0.5, x0 = x + Lf * (riding ? 0.08 : 0.3);
      arrow(g, x0, vy, x0 + len, vy, { color: P.velVec, width: 2.6, head: 10, dash: [6, 4] });
      L.add(T`${s3(v)} [${U.speedText === 'km h⁻¹' ? 'km h^-1' : 'm s^-1'}]`, x0 + len + 8, vy, { color: P.vel, size: 13, weight: 700, align: 'left', pri: 4 });
    }
    L.add(p.name, x - (riding ? Lf * 1.15 : Lf * 0.42), p.y - Lf * 0.55, { color: p.ink, size: 16, weight: 800, align: 'center', pri: 9 });
  }

  // ── the finish, together
  if (fired && t >= f.T - 1e-9) {
    const { age, life } = ageOf(t, f.T, f.tMax);
    pulse(g, S(f.J), (yA + yB) / 2 - Lf * 0.45, age, Math.max(life, 0.5), P.mark, { radius: Lf * 1.3 });
    L.add(T`"together," T = ${s3(f.T)} [${U.time}]`, S(f.J) - 12, R - 16, { color: P.mark, size: 14, weight: 700, align: 'right', pri: 8 });
  }

  L.draw(g, w, h);
  unview(g);
  return null;
}
