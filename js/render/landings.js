// landings.js — what an object's material does when it lands, in the manner of
// js/render/effects.js and js/render/impacts.js.
//
// THE ENGINE SAYS WHEN (CLAUDE.md rule 4): `age` is the wall-clock time since the
// engine's moment of landing, `life` how long the settling lasts. These are drawn
// only. An object rests or breaks on the stage; the engine's numbers do not
// change, and nothing here claims a rebound the engine did not compute. Each
// leaves its last frame standing: broken pieces stay broken, a splat stays.
//
// Every effect takes the surface `y`, and `wall`: an x it must not pass, the face
// of whatever it fell beside, so pieces never fly across a building.

import { withAlpha } from './util.js';
import { env, rng } from './scenery.js';
import { dust, pulse } from './effects.js';
import { sparks } from './impacts.js';

const TAU = Math.PI * 2;
const clamp01 = (u) => Math.max(0, Math.min(1, u));
const ease = (u) => 1 - (1 - u) ** 3;
const G = 900;   // px s⁻² of drawing, not of physics: how fast a piece falls on screen

/** Where a thrown piece is `tt` seconds after it left, and whether it has come to rest. */
function flown(p, tt, floor) {
  const hit = (p.vy + Math.sqrt(p.vy * p.vy + 2 * G * Math.max(0, floor - p.y0))) / G;
  if (tt < hit) return { x: p.x0 + p.vx * tt, y: p.y0 - p.vy * tt + 0.5 * G * tt * tt, rot: p.rot + p.spin * tt, rest: false };
  // down: a small skid along the surface, and still
  const after = tt - hit, skid = 1 - Math.exp(-after * 9);
  return { x: p.x0 + p.vx * hit + p.vx * 0.09 * skid, y: floor, rot: p.rot + p.spin * hit, rest: true };
}

/** What flies at the face it fell beside comes back off it: never through, never heaped against it. */
const offWall = (x, wall) => (wall != null && x < wall + 2 ? wall + 2 + (wall + 2 - x) * 0.55 : x);

/** A picture's pieces: a grid of triangles, jittered, from a seed. */
function pieces(seed, cols = 4, rows = 4) {
  const r = rng(seed), pts = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const edge = i === 0 || j === 0 || i === cols || j === rows;
    pts.push([i / cols - 0.5 + (edge ? 0 : (r() - 0.5) * 0.14), j / rows - 0.5 + (edge ? 0 : (r() - 0.5) * 0.14)]);
  }
  const at = (i, j) => pts[j * (cols + 1) + i], out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    out.push(r() < 0.5 ? [a, b, c] : [a, b, d], r() < 0.5 ? [a, c, d] : [b, c, d]);
  }
  return out;
}

/**
 * Glass or china: the object breaks into pieces of itself, which fly and settle,
 * and stay where they fall.
 * @param o.e      the object's entry (js/compose/pictures.js), for its picture; none: plain shards
 * @param o.size   how long it was drawn, px
 * @param o.tint   the colour of the shards with no picture
 */
export function shatter(g, x, y, age, life, o = {}) {
  if (!(age >= 0)) return;
  const size = Math.max(14, o.size ?? 30), e = o.e, img = e?.img, fit = e?.fit;
  const D = img && fit ? size / fit.long : size;
  const cx = img && fit ? fit.cx : 0.5, cy = img && fit ? fit.cy : 0.5;
  const tint = o.tint ?? '#cfe9f7', depth = Math.max(4, o.depth ?? 12), r = rng(o.seed ?? 71);
  const list = pieces(o.seed ?? 71, 4, 4);
  const y0 = y - size * 0.42;      // the broken object's middle, just down
  g.save();
  // the flash of the break, only for a moment
  if (age < 0.12) {
    const u = age / 0.12, gr = g.createRadialGradient(x, y - 4, 0, x, y - 4, size * (0.5 + u));
    gr.addColorStop(0, `rgba(255,255,255,${0.55 * (1 - u)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y - 4, size * (0.5 + u), 0, TAU); g.fill();
  }
  const tt = Math.min(age, life);
  list.forEach((tri, i) => {
    const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    const out = 90 + r() * 170, up = 80 + r() * 210;
    const p = {
      x0: x + mx * size, y0: y0 + my * size,
      vx: (mx >= 0 ? 1 : -1) * out * (0.35 + Math.abs(mx) * 1.5) * (0.6 + size / 90),
      vy: up * (0.45 + (0.5 - my) * 0.75), rot: 0, spin: (r() - 0.5) * 16,
    };
    // the surface runs back towards the viewer: each piece settles at its own depth on it
    const floor = y + r() * depth;
    const q = flown(p, tt, floor);
    const px = offWall(q.x, o.wall);
    g.save();
    g.translate(px, q.y);
    g.rotate(q.rest ? Math.round(q.rot / Math.PI) * Math.PI + (i % 5) * 0.09 - 0.18 : q.rot);
    // flat on the ground, a piece is seen nearly edge on
    if (q.rest) g.scale(1, 0.62);
    g.beginPath();
    tri.forEach(([ax, ay], k) => { const X = (ax - mx) * size, Y = (ay - my) * size; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); });
    g.closePath();
    if (img && fit) {
      g.save(); g.clip();
      g.drawImage(img, -(cx + mx * fit.long) * D, -(cy + my * fit.long) * D, D, D);
      g.restore();
    } else { g.fillStyle = withAlpha(tint, 0.85); g.fill(); }
    // each broken edge catches the light
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.9; g.stroke();
    g.restore();
  });
  // what glints as it flies, gone once it has landed
  if (age < life) {
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * (0.1 + r() * 0.8), sp = (0.8 + r() * 1.4) * size, u = ease(clamp01(age / (life * 0.7)));
      const gx = x + Math.cos(a) * sp * u * (i % 2 ? 1 : -1), gy = y - Math.sin(a) * sp * 0.9 * u + size * 1.2 * u * u;
      if (gy > y + 3 || (o.wall != null && gx < o.wall)) continue;
      const s = 1.6 + r() * 1.8;
      g.fillStyle = `rgba(255,255,255,${0.9 * (1 - u)})`; g.beginPath(); g.moveTo(gx - s, gy); g.lineTo(gx, gy - s); g.lineTo(gx + s, gy); g.lineTo(gx, gy + s); g.closePath(); g.fill();
    }
  }
  // the crumbs that are left
  const crumb = rng((o.seed ?? 71) + 3);
  for (let i = 0; i < 16; i++) {
    const cxp = x + (crumb() - 0.5) * size * 2.2, cyp = y + crumb() * depth, s = 0.7 + crumb() * 1.3;
    if (o.wall != null && cxp < o.wall) continue;
    g.fillStyle = withAlpha(tint, 0.7 * clamp01(age * 5));
    g.beginPath(); g.ellipse(cxp, cyp, s * 1.5, s * 0.6, crumb() * 3, 0, TAU); g.fill();
  }
  g.restore();
}

/** Soft fruit, a cake: it bursts and stays, a wet patch with pieces of itself thrown round it. */
export function burstOpen(g, x, y, age, life, o = {}) {
  if (!(age >= 0)) return;
  const size = Math.max(16, o.size ?? 30), r = rng(o.seed ?? 83), pulp = o.pulp ?? '#d9423a', skin = o.skin ?? pulp;
  const u = clamp01(age / (life * 0.35)), R = size * 0.95 * ease(u);
  g.save();
  // the patch, flat on the surface, and it stays
  g.fillStyle = withAlpha(pulp, 0.92);
  g.beginPath();
  for (let i = 0, n = 26; i <= n; i++) {
    const a = (i / n) * TAU, wob = 0.8 + 0.35 * Math.sin(a * 5 + 1.3) * Math.sin(a * 3 + 0.4);
    const px = x + Math.cos(a) * R * wob * 1.15, py = y + 2 + Math.sin(a) * R * wob * 0.2;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(x - R * 0.2, y, R * 0.4, R * 0.05, 0, 0, TAU); g.fill();
  // drops thrown out and up, which land as spots and stay
  const tt = Math.min(age, life);
  for (let i = 0; i < 22; i++) {
    const out = (r() - 0.5) * 2 * (150 + size * 2.2), up = 60 + r() * 230, s = 1.5 + r() * 2.6 * Math.min(1.6, size / 30);
    const floor = y + 1 + r() * 7;
    const q = flown({ x0: x, y0: y - 2, vx: out, vy: up, rot: 0, spin: 0 }, tt, floor);
    const px = offWall(q.x, o.wall);
    g.fillStyle = i % 4 === 0 ? skin : pulp;
    g.beginPath(); g.ellipse(px, q.y, q.rest ? s * 1.5 : s, q.rest ? s * 0.5 : s, 0, 0, TAU); g.fill();
  }
  // pieces of its skin, thrown a little and left
  for (let i = 0; i < 7; i++) {
    const out = (r() - 0.5) * 2 * (90 + size * 1.6), up = 50 + r() * 130, s = size * (0.1 + r() * 0.1);
    const q = flown({ x0: x, y0: y - 3, vx: out, vy: up, rot: r() * 3, spin: (r() - 0.5) * 12 }, tt, y + r() * 5);
    const px = offWall(q.x, o.wall);
    g.save(); g.translate(px, q.y - (q.rest ? s * 0.25 : 0)); g.rotate(q.rest ? 0 : q.rot);
    g.fillStyle = skin; g.beginPath(); g.ellipse(0, 0, s, q.rest ? s * 0.35 : s * 0.6, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.7; g.stroke();
    g.restore();
  }
  g.restore();
}

/** Rubber: the ring on the ground. The squash is the object's own (squishOf). */
export function squishRing(g, x, y, age, life, o = {}) {
  if (!(age >= 0)) return;
  const size = o.size ?? 30, E = env();
  pulse(g, x, y, age, life * 0.7, E.night ? '#e6e8ee' : '#2a2f36', { radius: Math.max(26, size * 1.1) });
}
/** How it squashes at the moment it lands, and comes back: { sx, sy }. Drawing only: it stays down. */
export function squishOf(age, life) {
  if (!(age >= 0) || age > life) return { sx: 1, sy: 1 };
  const u = age / life, k = Math.exp(-7 * u) * Math.cos(u * 15) * 0.32;
  return { sx: 1 + k, sy: 1 - k };
}

/** Metal: sparks, and the ring of it in the air. Its wobble is the object's own (wobbleOf). */
export function clang(g, x, y, age, life, o = {}) {
  if (!(age >= 0)) return;
  const size = o.size ?? 30, E = env();
  g.save();
  if (o.wall != null) { g.beginPath(); g.rect(o.wall + 1, -1e4, 2e4, 2e4); g.clip(); }
  sparks(g, x, y - 2, age, life, { size: Math.max(0.9, size / 26) });
  const u = clamp01(age / (life * 0.5));
  if (u < 1) {
    g.strokeStyle = withAlpha(E.night ? '#ffffff' : '#2a2f36', 0.7 * (1 - u)); g.lineCap = 'round'; g.lineWidth = 2;
    for (const k of [1, 1.45, 1.9]) {
      const R = size * 0.55 * k * (0.6 + 0.6 * ease(u)), yy = y - size * 0.4;
      for (const d of [-1, 1]) { g.beginPath(); g.arc(x, yy, R, d > 0 ? -0.55 : Math.PI - 0.55, d > 0 ? 0.55 : Math.PI + 0.55); g.stroke(); }
    }
  }
  g.restore();
}
/** A little damped rock about its base, as something hard does when it lands. */
export function wobbleOf(age, life, amount = 0.2) {
  if (!(age >= 0) || age > life) return 0;
  return amount * Math.exp(-5 * (age / life)) * Math.sin((age / life) * 20);
}

/** Something heavy: dust thrown out, and a mark left in the ground. */
export function thud(g, x, y, age, life, o = {}) {
  if (!(age >= 0)) return;
  const size = Math.max(14, o.size ?? 30), gentle = !!o.gentle, E = env();
  g.save();
  if (o.wall != null) { g.beginPath(); g.rect(o.wall + 1, -1e4, 2e4, 2e4); g.clip(); }
  // the mark it left stays
  g.fillStyle = withAlpha(E.night ? '#000000' : '#3a2f26', gentle ? 0.14 : 0.3);
  g.beginPath(); g.ellipse(x, y + 1.5, size * 0.72, Math.max(2, size * 0.09), 0, 0, TAU); g.fill();
  if (!gentle) {
    g.strokeStyle = withAlpha(E.night ? '#000000' : '#3a2f26', 0.4); g.lineWidth = 1.1; g.lineCap = 'round';
    const r = rng(o.seed ?? 37);
    for (let i = 0; i < 6; i++) {
      const d = i % 2 ? 1 : -1, l = size * (0.45 + r() * 0.45), st = size * 0.5, off = (r() - 0.5) * 7;
      g.beginPath(); g.moveTo(x + d * st, y + 2 + off * 0.3); g.lineTo(x + d * (st + l), y + 2 + off); g.stroke();
    }
  }
  dust(g, x, y, Math.min(age, life * 0.999), life, { size: Math.max(1, size / (gentle ? 40 : 22)), n: gentle ? 12 : 26, seed: o.seed ?? 37 });
  g.restore();
}

/** Wood: slivers thrown off it, which stay where they land. */
export function splinters(g, x, y, age, life, o = {}) {
  if (!(age >= 0)) return;
  const size = Math.max(14, o.size ?? 30), r = rng(o.seed ?? 59), tt = Math.min(age, life), n = env().night;
  g.save();
  for (let i = 0; i < 18; i++) {
    const out = (r() - 0.5) * 2 * (110 + size * 2.4), up = 90 + r() * 240, len = size * (0.12 + r() * 0.2), wid = 1 + r() * 1.5;
    const q = flown({ x0: x + (r() - 0.5) * size * 0.5, y0: y - size * 0.12, vx: out, vy: up, rot: r() * 3, spin: (r() - 0.5) * 22 }, tt, y + r() * 7);
    const px = offWall(q.x, o.wall);
    const tilt = (r() - 0.5) * 0.3;
    g.save(); g.translate(px, q.y); g.rotate(q.rest ? tilt : q.rot);
    g.fillStyle = i % 3 === 0 ? (n ? '#c79b66' : '#d6a971') : i % 3 === 1 ? (n ? '#8f6a40' : '#a87c4a') : (n ? '#6f5030' : '#7f5a33');
    g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, -wid / 2); g.lineTo(len / 2, wid / 2); g.closePath(); g.fill();
    g.restore();
  }
  thud(g, x, y, age, life, { size: size * 0.7, gentle: true, wall: o.wall, seed: (o.seed ?? 59) + 1 });
  g.restore();
}

/** Paper or cloth: a breath of air as it settles, and scraps drifting down to rest. */
export function flutter(g, x, y, age, life, o = {}) {
  if (!(age >= 0)) return;
  const size = Math.max(14, o.size ?? 30), r = rng(o.seed ?? 47), u = clamp01(age / life), n = env().night;
  g.save();
  // the air it pushed out from under it
  if (u < 1) {
    g.strokeStyle = withAlpha(n ? '#ffffff' : '#39404a', 0.42 * (1 - u)); g.lineWidth = 1.3; g.lineCap = 'round';
    for (const d of [-1, 1]) for (const k of [0, 1]) {
      const a = size * (0.55 + 0.7 * ease(u) + k * 0.28), yy = y - 2 - k * 5;
      g.beginPath(); g.moveTo(x + d * a, yy); g.quadraticCurveTo(x + d * (a + 12), yy - 5, x + d * (a + 24), yy - 1); g.stroke();
    }
  }
  const tint = o.tint ?? (n ? '#dfe3ea' : '#f4f1ea');
  for (let i = 0; i < 7; i++) {
    const d = (r() - 0.5) * 2 * size * 1.5, h0 = size * (0.45 + r() * 0.9), s = 2 + r() * 3, sway = r() * TAU;
    const fall = clamp01(u * (1.1 + r() * 0.5));
    const px = x + d * ease(fall) + Math.sin(fall * 7 + sway) * 7 * (1 - fall);
    const py = y - h0 * (1 - fall) + r() * 5;
    if (o.wall != null && px < o.wall + 2) continue;
    g.save(); g.translate(px, py); g.rotate(fall < 1 ? Math.sin(fall * 9 + sway) * 0.9 : 0.1);
    g.fillStyle = tint; g.strokeStyle = 'rgba(30,30,30,0.3)'; g.lineWidth = 0.6;
    g.beginPath(); g.rect(-s, -s * (fall < 1 ? 0.6 : 0.28), s * 2, s * (fall < 1 ? 1.2 : 0.56)); g.fill(); g.stroke();
    g.restore();
  }
  g.restore();
}
/** How it rocks as it settles, paper-light: angle in radians, dying away. */
export const rockOf = (age, life) => (!(age >= 0) || age > life ? 0 : 0.26 * Math.exp(-3.4 * (age / life)) * Math.sin((age / life) * 11));
