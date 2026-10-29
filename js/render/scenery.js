// scenery.js — the places the library's scenes happen in, drawn as places.
//
// Every library stage stands on these: a sky with depth (a gradient through
// the theme's three sky bands, the sun's glow, soft clouds, far hills, a
// skyline or a tree line), ground with texture (grass with mowing stripes and
// blades, tarmac with markings, a railway bed of ballast, sleepers and rail,
// sand, floorboards), water with crests, stone with courses, an interior with
// walls and light, and the same places seen from above (sea, floor tiles,
// a field). Soft shadows go under things.
//
// COLOUR is the stadium's (css/tokens.css "the place the motion happens
// in"): late-afternoon in the light theme, the plum dusk in the dark one, all
// of it held under about 35% saturation and away from the five physics hues,
// so the teaching layer on top always wins. Nothing here is a quantity.
//
// Everything is seeded: the same scene draws the same clouds every frame.

import { cssVar, withAlpha } from './util.js';

/** The scenery colours for this frame, from the theme. */
export function env() {
  // outside a page (the tests run in node) the defaults stand
  const v = (name, fb) => { try { return cssVar(name, fb); } catch { return fb; } };
  const light = typeof document !== 'undefined' && document.documentElement?.dataset?.theme === 'light';
  return {
    night: !light,
    skyTop: v('--sky-top', '#160F12'), skyMid: v('--sky-mid', '#2A2024'), skyBottom: v('--sky-bottom', '#44292F'), haze: v('--haze', '#3A272D'),
    sun: v('--sun', '#FFE3CF'), sunGlow: v('--sun-glow', 'rgba(255,180,140,0.30)'), shadow: v('--scene-shadow', 'rgba(0,0,0,0.42)'),
    earth: v('--earth', '#221A1D'), terrain: v('--terrain', '#2A2420'), grass: v('--grass', '#55603a'), grassAlt: v('--grass-alt', '#47512f'),
    concrete: v('--concrete', '#3C3237'), window: v('--window', '#FEC9A0'), glass: v('--glass', 'rgba(215,198,188,0.20)'), metal: v('--metal', '#5E5157'),
    structure: v('--structure', '#A3939A'), structureDark: v('--structure-dark', '#8E7E85'), interior: v('--interior', '#1D161A'), line: v('--pitchline', 'rgba(242,233,228,0.78)'),
  };
}

/** A small seeded random generator: the same seed, the same scene. */
export function rng(seed = 1) {
  let a = (seed * 2654435761) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ── the sky ───────────────────────────────────────────────────────────── */

/** One soft cloud centred at (x, y), w px across: overlapping puffs, lit from above. */
function cloud(g, x, y, w, E, r) {
  const n = 5 + Math.floor(r() * 3), puffs = [];
  for (let i = 0; i < n; i++) puffs.push({ x: x + (i / (n - 1) - 0.5) * w * 0.8 + (r() - 0.5) * w * 0.1, y: y - Math.sin((i / (n - 1)) * Math.PI) * w * 0.12 + (r() - 0.5) * w * 0.04, rad: w * (0.14 + r() * 0.1) });
  const lit = E.night ? withAlpha(E.structure, 0.16) : 'rgba(255,255,255,0.62)';
  const shade = E.night ? withAlpha(E.haze, 0.0) : 'rgba(255,255,255,0.0)';
  g.save();
  for (const p of puffs) {
    const gr = g.createRadialGradient(p.x, p.y - p.rad * 0.3, p.rad * 0.1, p.x, p.y, p.rad);
    gr.addColorStop(0, lit); gr.addColorStop(1, shade);
    g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.rad, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/** A far ridge of hills along the horizon: a smooth seeded silhouette. */
function ridge(g, x0, x1, horizon, height, color, r) {
  const k1 = 0.6 + r() * 0.8, k2 = 1.6 + r() * 1.4, p1 = r() * 6, p2 = r() * 6;
  g.save(); g.fillStyle = color; g.beginPath(); g.moveTo(x0, horizon);
  for (let x = x0; x <= x1 + 8; x += 8) {
    const u = (x - x0) / Math.max(1, x1 - x0);
    g.lineTo(x, horizon - height * (0.55 + 0.3 * Math.sin(u * Math.PI * 2 * k1 + p1) + 0.15 * Math.sin(u * Math.PI * 2 * k2 + p2)));
  }
  g.lineTo(x1, horizon); g.closePath(); g.fill(); g.restore();
}

/** A far skyline: low blocks of buildings, lit windows by night. */
function skyline(g, x0, x1, horizon, height, E, r) {
  g.save();
  let x = x0;
  while (x < x1) {
    const bw = 18 + r() * 40, bh = height * (0.35 + r() * 0.65);
    g.fillStyle = withAlpha(E.night ? E.structureDark : E.structure, E.night ? 0.42 : 0.55);
    g.fillRect(x, horizon - bh, bw, bh);
    if (E.night) { g.fillStyle = withAlpha(E.window, 0.45); for (let wy = horizon - bh + 5; wy < horizon - 4; wy += 7) for (let wx = x + 4; wx < x + bw - 4; wx += 7) if (r() < 0.35) g.fillRect(wx, wy, 2.5, 3); }
    x += bw + 2 + r() * 6;
  }
  g.restore();
}

/** A tree line along the horizon: rounded canopies on short trunks. */
function treeLine(g, x0, x1, horizon, height, E, r) {
  g.save();
  const c = withAlpha(E.grassAlt, E.night ? 0.75 : 0.7);
  for (let x = x0 - 10; x < x1 + 10; x += 14 + r() * 22) {
    const h = height * (0.5 + r() * 0.5), w = h * (0.55 + r() * 0.3);
    g.fillStyle = c; g.beginPath(); g.ellipse(x, horizon - h * 0.55, w * 0.5, h * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(x - 1.5, horizon - h * 0.2, 3, h * 0.2);
  }
  g.restore();
}

/**
 * The sky from y0 down to the horizon, x0..x1, with depth.
 * @param o { seed, sun, clouds (how many), far: 'hills' | 'skyline' | 'trees' | 'none', farHeight }
 */
export function skyscape(g, x0, y0, x1, horizon, o = {}) {
  const E = env(), r = rng(o.seed ?? 7), H = Math.max(1, horizon - y0), W = x1 - x0;
  const gr = g.createLinearGradient(0, y0, 0, horizon);
  gr.addColorStop(0, E.skyTop); gr.addColorStop(0.55, E.skyMid); gr.addColorStop(1, E.skyBottom);
  g.fillStyle = gr; g.fillRect(x0, y0, W, H);
  // the sun's glow, low on the right
  if (o.sun !== false) {
    // low in the upper left: the light comes from the left, as on the figures
    const sx = x0 + W * 0.12, sy = y0 + H * 0.3, R = Math.max(W, H) * 0.45;
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, R);
    sg.addColorStop(0, E.sunGlow); sg.addColorStop(1, withAlpha(E.skyBottom, 0));
    g.fillStyle = sg; g.fillRect(x0, y0, W, H);
    g.save(); g.fillStyle = withAlpha(E.sun, E.night ? 0.35 : 0.8); g.beginPath(); g.arc(sx, sy, Math.min(26, H * 0.06 + 6), 0, Math.PI * 2); g.fill(); g.restore();
  }
  // clouds, high and soft
  const nc = o.clouds ?? 4;
  for (let i = 0; i < nc; i++) cloud(g, x0 + W * ((i + 0.3 + r() * 0.5) / nc), y0 + H * (0.12 + r() * 0.3), Math.min(220, W * (0.12 + r() * 0.1)), E, r);
  // the far layer, misted towards the haze
  const fh = o.farHeight ?? Math.min(70, H * 0.22);
  if ((o.far ?? 'hills') === 'hills') {
    ridge(g, x0, x1, horizon, fh * 1.0, withAlpha(E.haze, 0.75), r);
    ridge(g, x0, x1, horizon, fh * 0.6, withAlpha(E.grassAlt, E.night ? 0.55 : 0.45), r);
  } else if (o.far === 'skyline') skyline(g, x0, x1, horizon, fh, E, r);
  else if (o.far === 'trees') { ridge(g, x0, x1, horizon, fh * 0.7, withAlpha(E.haze, 0.7), r); treeLine(g, x0, x1, horizon, fh * 0.6, E, r); }
  // a band of haze where sky meets land
  const hz = g.createLinearGradient(0, horizon - 24, 0, horizon);
  hz.addColorStop(0, withAlpha(E.haze, 0)); hz.addColorStop(1, withAlpha(E.haze, 0.5));
  g.fillStyle = hz; g.fillRect(x0, horizon - 24, W, 24);
}

/* ── the ground, side on ───────────────────────────────────────────────── */

/** Grass from its surface at y = Y down to y1: mown stripes, blades along the edge. */
export function grass(g, x0, x1, Y, y1, o = {}) {
  const E = env(), r = rng(o.seed ?? 3);
  const gr = g.createLinearGradient(0, Y, 0, y1);
  gr.addColorStop(0, E.grass); gr.addColorStop(1, E.grassAlt);
  g.fillStyle = gr; g.fillRect(x0, Y, x1 - x0, y1 - Y);
  g.save(); g.fillStyle = withAlpha(E.grassAlt, 0.35);
  for (let x = x0; x < x1; x += 56) g.fillRect(x, Y + 3, 28, y1 - Y - 3);
  g.strokeStyle = withAlpha(E.grassAlt, 0.9); g.lineWidth = 1.2; g.beginPath();
  for (let x = x0; x < x1; x += 3 + r() * 4) { const h = 2 + r() * 4; g.moveTo(x, Y + 1); g.lineTo(x + (r() - 0.5) * 2, Y - h); }
  g.stroke();
  g.strokeStyle = withAlpha(E.earth, 0.5); g.lineWidth = 1; g.beginPath(); g.moveTo(x0, Y + 0.5); g.lineTo(x1, Y + 0.5); g.stroke();
  g.restore();
}

/** Sand from y = Y down: a warm gradient and wind ripples. */
export function sandGround(g, x0, x1, Y, y1, o = {}) {
  const E = env(), r = rng(o.seed ?? 5);
  const base = E.night ? '#5b4a3a' : '#d8c29a';
  const gr = g.createLinearGradient(0, Y, 0, y1);
  gr.addColorStop(0, base); gr.addColorStop(1, withAlpha(E.earth, 0.9));
  g.fillStyle = gr; g.fillRect(x0, Y, x1 - x0, y1 - Y);
  g.save(); g.strokeStyle = withAlpha(E.night ? '#000000' : '#8a6f4a', 0.18); g.lineWidth = 1;
  for (let row = 0; row < 6; row++) { const yy = Y + 6 + row * ((y1 - Y) / 6); g.beginPath(); for (let x = x0 + r() * 30; x < x1; x += 30) { g.moveTo(x, yy); g.quadraticCurveTo(x + 8, yy - 2.5, x + 16, yy); } g.stroke(); }
  g.restore();
}

/** A road side on: a verge, the kerb, tarmac with grain, lane markings. Its
    surface — where the wheels stand — is y = Y; it is `depth` px deep. */
export function tarmac(g, x0, x1, Y, o = {}) {
  const E = env(), r = rng(o.seed ?? 11), depth = o.depth ?? 22;
  // the tarmac itself, darkest at its near edge
  const gr = g.createLinearGradient(0, Y, 0, Y + depth);
  gr.addColorStop(0, E.night ? '#3a3236' : '#7d7477'); gr.addColorStop(1, E.night ? '#241e21' : '#5f575a');
  g.fillStyle = gr; g.fillRect(x0, Y, x1 - x0, depth);
  // grain
  g.save(); g.fillStyle = withAlpha(E.night ? '#ffffff' : '#000000', 0.07);
  for (let i = 0; i < (x1 - x0) * depth / 90; i++) g.fillRect(x0 + r() * (x1 - x0), Y + r() * depth, 1.2, 1.2);
  // the far edge line and the dashed centre line
  g.strokeStyle = withAlpha(E.line, 0.8); g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(x0, Y + 2.5); g.lineTo(x1, Y + 2.5); g.stroke();
  g.setLineDash([22, 18]); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, Y + depth * 0.55); g.lineTo(x1, Y + depth * 0.55); g.stroke(); g.setLineDash([]);
  // the kerb at the near edge
  g.fillStyle = E.night ? '#4a4044' : '#b8aeae'; g.fillRect(x0, Y + depth, x1 - x0, 4);
  g.restore();
  // the verge below it
  if (o.verge !== false) grass(g, x0, x1, Y + depth + 4, Y + depth + 4 + (o.verge ?? 18), { seed: (o.seed ?? 11) + 1 });
}

/** A railway side on: ballast, sleepers end on, the rail head at y = Y. */
export function railBed(g, x0, x1, Y, o = {}) {
  const E = env(), r = rng(o.seed ?? 13);
  // the ballast shoulder
  const top = Y + 4, bot = Y + 20;
  const gr = g.createLinearGradient(0, top, 0, bot);
  gr.addColorStop(0, E.night ? '#5a5054' : '#a69c98'); gr.addColorStop(1, E.night ? '#3a3236' : '#857b78');
  g.fillStyle = gr; g.beginPath(); g.moveTo(x0, bot); g.lineTo(x0, top + 2); g.lineTo(x1, top + 2); g.lineTo(x1, bot); g.closePath(); g.fill();
  g.save(); g.fillStyle = withAlpha(E.night ? '#000000' : '#5b524f', 0.35);
  for (let i = 0; i < (x1 - x0) / 3; i++) { g.beginPath(); g.arc(x0 + r() * (x1 - x0), top + 3 + r() * (bot - top - 4), 0.8 + r() * 1.1, 0, Math.PI * 2); g.fill(); }
  // sleepers, end on
  g.fillStyle = E.night ? '#4a3a30' : '#6e5440';
  for (let x = x0 + 6; x < x1; x += 16) { g.fillRect(x - 5, Y + 2, 10, 5); }
  // the rail: a web and a bright head
  g.fillStyle = E.metal; g.fillRect(x0, Y - 1, x1 - x0, 3.5);
  g.fillStyle = withAlpha(E.structure, 0.9); g.fillRect(x0, Y - 1.5, x1 - x0, 1.2);
  g.restore();
}

/** Floorboards side on (an indoor floor) from y = Y down: planks with seams and a sheen. */
export function floorboards(g, x0, x1, Y, y1, o = {}) {
  const E = env(), r = rng(o.seed ?? 17);
  const gr = g.createLinearGradient(0, Y, 0, y1);
  gr.addColorStop(0, E.night ? '#6b5440' : '#c8a77c'); gr.addColorStop(1, E.night ? '#3e3127' : '#9c7c58');
  g.fillStyle = gr; g.fillRect(x0, Y, x1 - x0, y1 - Y);
  g.save(); g.strokeStyle = withAlpha('#000000', 0.18); g.lineWidth = 1;
  for (let yy = Y + 7; yy < y1; yy += 9) { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.stroke(); for (let x = x0 + r() * 80; x < x1; x += 80 + r() * 60) { g.beginPath(); g.moveTo(x, yy - 9); g.lineTo(x, yy); g.stroke(); } }
  g.fillStyle = withAlpha('#ffffff', E.night ? 0.05 : 0.18); g.fillRect(x0, Y, x1 - x0, 2);
  g.restore();
}

/** Water from its surface at y = Y down: deepening, with crests that drift with `phase`. */
export function water(g, x0, x1, Y, y1, o = {}) {
  const E = env(), phase = o.phase ?? 0;
  const gr = g.createLinearGradient(0, Y, 0, y1);
  gr.addColorStop(0, E.night ? '#2f4650' : '#7fa0ad'); gr.addColorStop(1, E.night ? '#16242b' : '#4e6d7a');
  g.fillStyle = gr; g.fillRect(x0, Y, x1 - x0, y1 - Y);
  g.save(); g.lineWidth = 1.3;
  for (let row = 0; row < 7; row++) {
    const yy = Y + 4 + row * row * 3.2;
    if (yy > y1 - 2) break;
    g.strokeStyle = `rgba(255,255,255,${0.42 - row * 0.05})`;
    const step = 34 + row * 8, off = ((phase * (18 - row * 2)) % step + step) % step;
    g.beginPath();
    for (let x = x0 - step + off + (row * 13) % step; x < x1; x += step) { g.moveTo(x, yy); g.quadraticCurveTo(x + step * 0.2, yy - 2.5, x + step * 0.4, yy); }
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, Y + 0.5); g.lineTo(x1, Y + 0.5); g.stroke();
  g.restore();
}

/** A block of stone with courses: (x, y) its top-left, w × h px; lit from the left. */
export function stone(g, x, y, w, h, o = {}) {
  const E = env(), r = rng(o.seed ?? 19), course = o.course ?? 12;
  const base = o.color ?? (E.night ? '#6b6066' : '#bfb2ab');
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, base); gr.addColorStop(1, withAlpha(E.structureDark, 0.95));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.save(); g.strokeStyle = withAlpha('#000000', 0.22); g.lineWidth = 1;
  let row = 0;
  for (let yy = y + course; yy < y + h + 0.1; yy += course, row++) {
    g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
    const blk = course * 2.1, off = row % 2 ? blk / 2 : 0;
    for (let xx = x + off; xx < x + w; xx += blk) { g.beginPath(); g.moveTo(xx, yy - course); g.lineTo(xx, yy); g.stroke(); if (r() < 0.25) { g.fillStyle = withAlpha('#ffffff', 0.06); g.fillRect(xx, yy - course, Math.min(blk, x + w - xx), course); } }
  }
  g.fillStyle = withAlpha('#ffffff', 0.18); g.fillRect(x, y, w, 2);
  g.restore();
}

/** An interior: a wall from y0 down to the floor at y1 — a dado rail, panels,
    high windows with light falling from them. */
export function interior(g, x0, y0, x1, y1, o = {}) {
  const E = env(), W = x1 - x0, H = y1 - y0;
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, E.night ? '#2e2529' : '#ece0d6'); gr.addColorStop(1, E.night ? '#3a2f34' : '#d9c8bc');
  g.fillStyle = gr; g.fillRect(x0, y0, W, H);
  g.save();
  // high windows and the light from them
  const n = Math.max(2, Math.round(W / 220));
  for (let i = 0; i < n; i++) {
    const wx = x0 + W * ((i + 0.5) / n) - 28, wy = y0 + H * 0.12, ww = 56, wh = H * 0.22;
    const lg = g.createLinearGradient(0, wy, 0, y1);
    lg.addColorStop(0, withAlpha(E.window, E.night ? 0.16 : 0.22)); lg.addColorStop(1, withAlpha(E.window, 0));
    g.fillStyle = lg; g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx + ww, wy + wh); g.lineTo(wx + ww + 60, y1); g.lineTo(wx + 30, y1); g.closePath(); g.fill();
    g.fillStyle = withAlpha(E.window, E.night ? 0.55 : 0.75); g.fillRect(wx, wy, ww, wh);
    g.strokeStyle = withAlpha(E.structureDark, 0.8); g.lineWidth = 2; g.strokeRect(wx, wy, ww, wh);
    g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
  }
  // a dado rail and panels below it
  const dy = y0 + H * 0.68;
  g.strokeStyle = withAlpha(E.structureDark, 0.6); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, dy); g.lineTo(x1, dy); g.stroke();
  g.lineWidth = 1; for (let x = x0 + 20; x < x1; x += 90) g.strokeRect(x, dy + 8, 70, y1 - dy - 16);
  g.restore();
}

/** A soft shadow on the ground under something, centred at (x, y). */
export function softShadow(g, x, y, rx, ry = rx * 0.25, strength = 1) {
  const E = env();
  g.save(); g.translate(x, y); g.scale(1, ry / Math.max(rx, 1e-6));
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, withAlpha(E.shadow, 0.9 * strength)); gr.addColorStop(1, withAlpha(E.shadow, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
}

/* ── the same places from above ────────────────────────────────────────── */

/** The sea from above in the box (x, y, w, h): deep in the middle, wave crescents drifting with `phase`. */
export function seaFromAbove(g, x, y, w, h, o = {}) {
  const E = env(), r = rng(o.seed ?? 23), phase = o.phase ?? 0;
  const gr = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
  gr.addColorStop(0, E.night ? '#1f333b' : '#6f93a1'); gr.addColorStop(1, E.night ? '#2c434c' : '#8fb0bc');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.2;
  for (let i = 0; i < (w * h) / 2600; i++) {
    const cx = x + ((r() * w + phase * 6) % w), cy = y + r() * h, s = 5 + r() * 7;
    g.beginPath(); g.arc(cx, cy, s, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  }
  g.restore();
}

/** A floor from above in the box: square tiles with grout and a soft sheen. */
export function floorFromAbove(g, x, y, w, h, tile, o = {}) {
  const E = env();
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, E.night ? '#3b3236' : '#e2d6cc'); gr.addColorStop(1, E.night ? '#2c2428' : '#cfc0b4');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.save(); g.strokeStyle = withAlpha(E.night ? '#000000' : '#8c7d74', 0.35); g.lineWidth = 1;
  for (let xx = x; xx <= x + w + 0.1; xx += tile) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
  for (let yy = y; yy <= y + h + 0.1; yy += tile) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
  const sh = g.createRadialGradient(x + w * 0.3, y + h * 0.25, 0, x + w * 0.3, y + h * 0.25, Math.max(w, h) * 0.6);
  sh.addColorStop(0, 'rgba(255,255,255,' + (E.night ? 0.05 : 0.22) + ')'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(x, y, w, h);
  g.restore();
}

/** A sheet of graph paper on the desk, in the box: a card with a shadow and a fine grid. */
export function paper(g, x, y, w, h, o = {}) {
  const E = env();
  g.save();
  g.shadowColor = E.shadow; g.shadowBlur = 14; g.shadowOffsetY = 4;
  g.fillStyle = E.night ? '#2a2326' : '#fffaf5'; g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill();
  g.shadowColor = 'transparent';
  g.beginPath(); g.roundRect(x, y, w, h, 8); g.clip();
  const step = o.step ?? 12;
  g.strokeStyle = withAlpha(E.night ? '#ffffff' : '#7a8fa0', E.night ? 0.05 : 0.14); g.lineWidth = 1;
  for (let xx = x + step; xx < x + w; xx += step) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
  for (let yy = y + step; yy < y + h; yy += step) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
  g.restore();
}

/** A whole outdoor scene behind a stage: the sky down to the ground at y = Y,
    and grass (or `ground`) from there to the bottom. The stage then draws its
    road, rails or track at Y on top. */
export function landscape(g, w, h, Y, o = {}) {
  skyscape(g, 0, 0, w, Y, o);
  if (o.ground === 'sand') sandGround(g, 0, w, Y, h, o);
  else if (o.ground === 'water') water(g, 0, w, Y, h, o);
  else grass(g, 0, w, Y, h, o);
}

/** A field from above in the box: mown stripes across it, a little texture. */
export function fieldFromAbove(g, x, y, w, h, o = {}) {
  const E = env(), r = rng(o.seed ?? 37);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = E.grass; g.fillRect(x, y, w, h);
  g.fillStyle = withAlpha(E.grassAlt, 0.55); const band = o.band ?? 34;
  for (let xx = x; xx < x + w; xx += band * 2) g.fillRect(xx, y, band, h);
  g.fillStyle = withAlpha(E.grassAlt, 0.5);
  for (let i = 0; i < (w * h) / 900; i++) g.fillRect(x + r() * w, y + r() * h, 1.5, 1.5);
  g.restore();
}
/** The sky from above (a bird's eye): soft cloud shadows over a hazy ground far below. */
export function skyFromAbove(g, x, y, w, h, o = {}) {
  const E = env(), r = rng(o.seed ?? 41);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, E.skyMid); gr.addColorStop(1, E.skyBottom);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  for (let i = 0; i < 6; i++) { const cx = x + r() * w, cy = y + r() * h, R = 40 + r() * 70; const cg = g.createRadialGradient(cx, cy, 0, cx, cy, R); cg.addColorStop(0, E.night ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)'); cg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
