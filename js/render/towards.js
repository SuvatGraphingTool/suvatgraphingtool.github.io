// towards.js — the stage for two projectiles thrown towards each other: side
// on at one scale both ways, a playing field from A to B under a layered sky,
// a thrower at each end facing the other (`thrower` from figures.js, winding
// up and releasing on the engine's own launch times, B's shirt in B's colour),
// a stone plinth under either one thrown from a height. Each path faint in
// full and strong so far — A in the quantity's hue, B in B's — each ball the
// stadium's shaded ball (B's ringed) with its velocity in the velocity hue
// (components dashed across, solid up, rule 2), and the moment they are level
// across marked: the two balls touching in a flash where they collide, or the
// gap in height between them where they pass.
//
// The frame is fitted to the motion (fitSide): a long low throw puts the
// ground up to meet it rather than floating it under an empty sky.
//
// Everything drawn is read from js/core/towards.js (rule 4).

import { dust, flash, pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, withAlpha, sig3 } from './util.js';
import { thrower, ballAt, THROWER_MIN } from './figures.js';
import { skyscape, grass, stone, softShadow, fitSide, env, rng } from './scenery.js';
import { T } from '../notation.js';

const HUD = 250, HUD_H = 290;

/** A tree on the field's edge, side on: a trunk, a canopy of lit and shaded lobes. */
export function parkTree(g, x, Y, s, seed = 1) {
  const E = env(), r = rng(seed);
  softShadow(g, x, Y + 1, s * 0.45, s * 0.07, 0.7);
  g.save();
  const tg = g.createLinearGradient(x - s * 0.05, 0, x + s * 0.05, 0);
  tg.addColorStop(0, E.night ? '#4a3a33' : '#7a5c46'); tg.addColorStop(1, E.night ? '#2c2220' : '#4f3a2c');
  g.fillStyle = tg; g.beginPath(); g.moveTo(x - s * 0.06, Y); g.lineTo(x - s * 0.035, Y - s * 0.5); g.lineTo(x + s * 0.035, Y - s * 0.5); g.lineTo(x + s * 0.06, Y); g.closePath(); g.fill();
  const lobes = [];
  for (let i = 0; i < 7; i++) lobes.push({ x: x + (r() - 0.5) * s * 0.55, y: Y - s * (0.62 + r() * 0.3), R: s * (0.17 + r() * 0.1) });
  const dark = E.night ? '#2f3a26' : '#55673d', lit = E.night ? '#4d5a35' : '#86965a';
  for (const L of lobes) { g.fillStyle = dark; g.beginPath(); g.arc(L.x + s * 0.02, L.y + s * 0.03, L.R, 0, Math.PI * 2); g.fill(); }
  for (const L of lobes) {
    const lg = g.createRadialGradient(L.x - L.R * 0.4, L.y - L.R * 0.45, L.R * 0.1, L.x, L.y, L.R);
    lg.addColorStop(0, lit); lg.addColorStop(1, withAlpha(dark, 0.95));
    g.fillStyle = lg; g.beginPath(); g.arc(L.x, L.y, L.R * 0.92, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/** A field seen a little from above, from the far tree line at `horizon`
    down to the near edge at Y: mown bands that widen as they come nearer,
    misted towards the horizon. */
export function farField(g, x0, x1, horizon, Y) {
  const E = env(), H = Y - horizon;
  if (H < 2) return;
  const gr = g.createLinearGradient(0, horizon, 0, Y);
  gr.addColorStop(0, E.grassAlt); gr.addColorStop(1, E.grass);
  g.save(); g.fillStyle = gr; g.fillRect(x0, horizon, x1 - x0, H);
  g.fillStyle = withAlpha(E.grassAlt, 0.4);
  for (let i = 0, y = horizon; y < Y; i++) { const b = 3 + (y - horizon) * 0.22; if (i % 2) g.fillRect(x0, y, x1 - x0, Math.min(b, Y - y)); y += b; }
  const hz = g.createLinearGradient(0, horizon, 0, horizon + H * 0.5);
  hz.addColorStop(0, withAlpha(E.haze, 0.55)); hz.addColorStop(1, withAlpha(E.haze, 0));
  g.fillStyle = hz; g.fillRect(x0, horizon, x1 - x0, H * 0.5);
  g.restore();
}

/** The near grass below the ground line, y0..y1: tufts, clover and a few
    daisies, larger and darker nearer the bottom edge. */
export function nearGrass(g, x0, x1, y0, y1, seed = 21) {
  const E = env(), r = rng(seed), H = y1 - y0;
  if (H < 8) return;
  g.save();
  const dk = g.createLinearGradient(0, y0, 0, y1);
  dk.addColorStop(0, withAlpha('#000000', 0)); dk.addColorStop(1, withAlpha('#000000', E.night ? 0.28 : 0.14));
  g.fillStyle = dk; g.fillRect(x0, y0, x1 - x0, H);
  const n = Math.round(((x1 - x0) * H) / 1800);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), u = r(), y = y0 + 10 + u * (H - 10), s = 0.6 + u * 1.2;
    g.strokeStyle = withAlpha(r() < 0.5 ? E.grassAlt : '#2a3320', E.night ? 0.6 : 0.35); g.lineWidth = 1.1 * s; g.lineCap = 'round';
    g.beginPath();
    for (let b = -2; b <= 2; b++) { g.moveTo(x + b * 1.6 * s, y); g.quadraticCurveTo(x + b * 2.2 * s, y - 4 * s, x + b * 3.4 * s, y - (6 + r() * 3) * s); }
    g.stroke();
    if (r() < 0.12) { g.fillStyle = withAlpha('#ffffff', E.night ? 0.45 : 0.85); for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; g.beginPath(); g.arc(x + 6 * s + Math.cos(a) * 1.6 * s, y - 2 * s + Math.sin(a) * 1.6 * s, 1.1 * s, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#e7c35a'; g.beginPath(); g.arc(x + 6 * s, y - 2 * s, 0.9 * s, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
}

/** Keep labels off a drawn line: a small box reserved round every few px of it. */
function keepOff(L, pts, pad = 7) {
  let last = null;
  for (const p of pts) {
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < pad * 1.4) continue;
    L.reserve({ x: p.x - pad, y: p.y - pad, w: pad * 2, h: pad * 2 }); last = p;
  }
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'towards') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const phone = w < 520;

  // ── the frame: fitted to the two paths (to the meeting, when they collide)
  const n = 120, tA1 = f.A.f.tFlight, tB1 = f.B.t0 + f.B.f.tFlight;
  const endA = f.outcome === 'collide' ? f.t : tA1, endB = f.outcome === 'collide' ? f.t : tB1;
  const pa = [], pb = [];
  for (let i = 0; i <= n; i++) { pa.push(f.posA((i / n) * endA)); pb.push(f.posB(f.B.t0 + (i / n) * Math.max(0, endB - f.B.t0))); }
  const ys = [...pa.map((p) => p.y), ...pb.map((p) => p.y), f.A.h, f.B.h];
  const xs = [0, f.D, ...pa.map((p) => p.x), ...pb.map((p) => p.x)];
  const xLo = Math.min(...xs), xHi = Math.max(...xs), yHi = Math.max(...ys, 0.5) * 1.12;
  const side = (phone ? THROWER_MIN : 60) * 0.55 + 6;
  // beside the readouts, or (on a laptop) under them across the whole width: whichever is larger
  const box = { xLo, xHi, yLo: 0, yHi }, bottom = h - 66, right = w - 16 - side;
  const fits = (phone ? [{ left: 16 + side, right, top: 96, bottom }]
    : [{ left: HUD + 30 + side, right, top: 70, bottom }, { left: 30 + side, right, top: Math.min(HUD_H, bottom - 120), bottom }])
    .map((area) => fitSide(box, area, { sky: 0.45 }));
  const fit = fits.reduce((p, q) => (q.k > p.k * 1.15 ? q : p));
  const { k, X, Y } = fit, oy = fit.oy;
  const fig = clamp(1.7 * k, phone ? THROWER_MIN : 60, 100);

  // ── the place: a sky with a tree line, the field, trees at its edges
  const horizon = oy - clamp(oy * 0.3, 24, 110);
  skyscape(g, 0, 0, w, horizon, { far: 'trees', seed: 41, farHeight: Math.min(50, horizon * 0.22) });
  farField(g, 0, w, horizon, oy);
  for (const [x, s, sd] of [[X(xLo) - side - 80, 0.5, 3], [X(xHi) + side + 34, 0.42, 5], [X(xLo) - side - 190, 0.25, 8]]) {
    const yy = horizon + (oy - horizon) * s * 0.5; parkTree(g, x, yy, 60 + 120 * s, sd);
  }
  grass(g, 0, w, oy, h, { seed: 12 });
  nearGrass(g, 0, w, oy, h, 22);

  // ── where each stands: a stone plinth under a thrower above the ground
  const posts = [[X(0), f.A.h, 1], [X(f.D), f.B.h, -1]];
  for (const [x, hh, dir] of posts) if (hh > 1e-9) {
    const pw = Math.max(34, fig * 0.62), x0 = dir > 0 ? x - pw + 4 : x - 4;
    softShadow(g, x0 + pw / 2, oy + 1, pw * 0.7, 6, 0.9);
    stone(g, x0, Y(hh), pw, oy - Y(hh), { course: Math.max(7, Math.min(13, (oy - Y(hh)) / 5)), seed: dir > 0 ? 3 : 4 });
  }
  // the throwers wind up and release on the engine's own launch times
  const run = Math.max(1e-6, f.tMax * 0.1);
  const poseA = clamp(t / run, 0, 1), poseB = clamp((t - f.B.t0) / run, 0, 1);
  thrower(g, X(0) - fig * 0.2, Y(f.A.h), fig, P, { dir: 1, pose: poseA, aim: f.A.theta });
  thrower(g, X(f.D) + fig * 0.2, Y(f.B.h), fig, P, { dir: -1, pose: poseB, aim: f.B.theta, ring: P.second });
  L.reserve({ x: X(0) - fig * 0.6, y: Y(f.A.h) - fig * 1.05, w: fig * 0.75, h: fig * 1.05 });
  L.reserve({ x: X(f.D) - fig * 0.15, y: Y(f.B.h) - fig * 1.05, w: fig * 0.75, h: fig * 1.05 });

  // ── the distance between, in the grass below
  const ry = oy + 30;
  stroke(g, [{ x: X(0), y: ry }, { x: X(f.D), y: ry }], { color: P.ink, width: 1.3, alpha: 0.85 });
  for (const xx of [X(0), X(f.D)]) stroke(g, [{ x: xx, y: ry - 6 }, { x: xx, y: ry + 6 }], { color: P.ink, width: 1.3, alpha: 0.85 });
  L.add(T`${sig3(f.D)} [m]`, (X(0) + X(f.D)) / 2, ry + 15, { color: P.ink, align: 'center', pri: 6, size: 13, weight: 700 });
  L.add('A', X(0) - 8, ry, { color: P.vel, align: 'right', pri: 8, size: 15, weight: 700 });
  L.add('B', X(f.D) + 8, ry, { color: P.second, align: 'left', pri: 8, size: 15, weight: 700 });

  // ── the paths, faint in full and strong so far
  const px = (p) => ({ x: X(p.x), y: Y(p.y) });
  const draw = (pts, pos, t0, t1, c) => {
    const all = pts.map(px);
    stroke(g, all, { color: c, width: 1.8, alpha: 0.35 }); keepOff(L, all);
    const tt = Math.min(t, t1);
    if (tt > t0) { const so = []; for (let i = 0; i <= 60; i++) so.push(px(pos(t0 + (i / 60) * (tt - t0)))); stroke(g, so, { color: c, width: 3 }); }
  };
  draw(pb, f.posB, f.B.t0, endB, P.second); draw(pa, f.posA, 0, endA, P.vel);

  // ── the balls: each where the engine has it; touching, in a flash, where they collide
  const R = clamp(k * 0.35, 6.5, phone ? 7 : 8.5);
  const hit = f.outcome === 'collide' && t >= f.t - 1e-9;
  const balls = [
    { pos: f.posA, vel: f.velA, t0: 0, t1: tA1, ring: null },
    { pos: f.posB, vel: f.velB, t0: f.B.t0, t1: tB1, ring: P.second },
  ].map((b) => {
    const q = b.pos(t), v = b.vel(hit ? f.t - 1e-6 : t);
    let x = X(q.x), y = Y(q.y);
    if (hit) { const s = Math.hypot(v.x, v.y) || 1; x -= (v.x / s) * R * 1.05; y += (v.y / s) * R * 1.05; }
    return { ...b, q, v, x, y };
  });
  // landings kick up dust
  for (const b of balls) if (!hit && f.outcome !== 'collide') { const { age, life } = ageOf(t, b.t1, f.tMax); dust(g, X(b.pos(b.t1).x), oy, age, life, { size: 0.8 }); }
  for (const b of balls) { const hgt = Math.max(0, oy - b.y); softShadow(g, b.x, oy + 1, R * clamp(1.4 - hgt / 300, 0.6, 1.4), R * 0.35, clamp(1 - hgt / 260, 0.25, 0.8)); }
  if (hit) {
    const c = px(f.posA(f.t)), { age, life } = ageOf(t, f.t, f.tMax);
    flash(g, c.x, c.y, age, life, { radius: 30 }); pulse(g, c.x, c.y, age, life, P.mark, { radius: 40 });
  }
  for (const b of balls) ballAt(g, b.x, b.y, R, b.ring);

  // ── each ball's velocity, in the velocity hue whichever ball it is (rule 2)
  const vl = clamp(w * 0.075, 40, 90) / Math.max(f.A.u, f.B.u);
  for (const b of balls) {
    if (show.velocity === false || hit || !(t > b.t0 && t < b.t1)) continue;
    const { x, y, v } = b, ex = x + v.x * vl, ey = y - v.y * vl;
    if (show.components) {
      arrow(g, x, y, ex, y, { color: P.velVec, width: 2, head: 8, dash: [5, 4] });
      if (Math.abs(v.y) * vl > 4) arrow(g, ex, y, ex, ey, { color: P.velVec, width: 2, head: 8 });
      keepOff(L, [{ x, y }, { x: ex, y }, { x: ex, y: ey }], 6);
    }
    arrow(g, x, y, ex, ey, { color: P.velVec, width: 2.8, head: 10 });
    keepOff(L, [{ x, y }, { x: (x + ex) / 2, y: (y + ey) / 2 }, { x: ex, y: ey }], 8);
  }
  for (const b of balls) L.reserve({ x: b.x - R - 4, y: b.y - R - 4, w: 2 * R + 8, h: 2 * R + 8 });

  // ── the moment they are level across
  if (t >= f.t - 1e-9 && f.outcome !== 'before') {
    const a = px(f.posA(f.t)), b = px(f.posB(f.t));
    if (f.outcome === 'collide') {
      stroke(g, [{ x: a.x, y: oy }, { x: a.x, y: a.y + R + 6 }], { color: P.mark, width: 1.4, dash: [4, 4] });
      keepOff(L, [{ x: a.x, y: oy }, { x: a.x, y: (oy + a.y) / 2 }, { x: a.x, y: a.y }], 6);
      L.add(T`"collide," t = ${sig3(f.t)} [s]`, a.x, a.y - R - 50, { color: P.mark, align: 'center', pri: 9, size: 14, weight: 700 });
      L.add(T`${sig3(f.yA)} [m] "up"`, a.x, a.y - R - 24, { color: P.mark, align: 'center', pri: 8, size: 13, weight: 700 });
    } else if (f.outcome === 'pass') {
      stroke(g, [a, b], { color: P.mark, width: 1.8 });
      keepOff(L, [a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, b], 6);
      L.add(T`${sig3(Math.abs(f.yA - f.yB))} [m] "apart"`, a.x + 14, (a.y + b.y) / 2, { color: P.mark, align: 'left', pri: 8, size: 13, weight: 700 });
    }
  }
  // the readouts: top-left (and on a laptop the top-right clock)
  if (!phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H }); L.reserve({ x: w - 150, y: 0, w: 150, h: 60 }); }
  else L.reserve({ x: 0, y: 0, w: w * 0.6, h: 80 });
  L.draw(g, w, h);
  return null;
}
