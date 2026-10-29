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

/* The sea, the field and the farmland below a bird are drawn to fill the
   whole stage — the axes and the grid are laid on top of the place, never the
   place cut to the size of the plot. Each takes `avoid`, the pixels the motion
   passes through (its tracks, O, the moments asked about), and keeps its
   scenery — a coast, a tree, an island — off them, so nothing in the place
   hides the physics. */

/** A smooth seeded wobble along 0..1, about −1..1: for coastlines and shores. */
function wobble(r, n = 4) {
  const parts = Array.from({ length: n }, (_, i) => ({ p: r() * 6.283, f: (1.2 + r() * 1.6) * (i + 1), a: 1 / (i + 1) }));
  const norm = parts.reduce((s, q) => s + q.a, 0);
  return (u) => parts.reduce((s, q) => s + Math.sin(u * q.f * 3.1 + q.p) * q.a, 0) / norm;
}

/** The least distance, px, from a point to any of `avoid`. */
const clearOf = (avoid, x, y) => avoid.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), Infinity);

/** Where land can go without touching the motion: the edge or corner of the
    box furthest from every avoided point. Returns a shape function
    shape(off) → polygon (the land grown by `off` px seaward), the shore alone
    as an open polyline, and a spot inland for a lighthouse — or null. */
function landSpot(x, y, w, h, avoid, r, o = {}) {
  const wob = wobble(r), bumpU = 0.25 + r() * 0.5, bumpW = 0.09 + r() * 0.05;
  const bump = (u) => Math.exp(-(((u - bumpU) / bumpW) ** 2));
  const cands = [];
  const edgeClear = {
    bottom: Math.min(...avoid.map((p) => y + h - p.y)), top: Math.min(...avoid.map((p) => p.y - y)),
    right: Math.min(...avoid.map((p) => x + w - p.x)), left: Math.min(...avoid.map((p) => p.x - x)),
  };
  for (const [side, c] of Object.entries(edgeClear)) {
    if (o.hud && (side === 'left' || side === 'top')) continue;      // under the readouts
    const along = side === 'top' || side === 'bottom' ? h : w;
    const d = Math.min(c - 46, along * 0.28, 120);
    if (d >= 34) cands.push({ kind: 'edge', side, d, score: d * 1.7 });
  }
  const corners = { br: [x + w, y + h, Math.PI, 1.5 * Math.PI], tr: [x + w, y, 0.5 * Math.PI, Math.PI], bl: [x, y + h, 1.5 * Math.PI, 2 * Math.PI], tl: [x, y, 0, 0.5 * Math.PI] };
  for (const [side, [cx, cy]] of Object.entries(corners)) {
    if (o.hud && side === 'tl') continue;
    const R = Math.min(clearOf(avoid, cx, cy) - 50, Math.min(w, h) * 0.5, 260);
    if (R >= 70) cands.push({ kind: 'corner', side, R, score: R });
  }
  if (!cands.length) return null;
  const best = cands.reduce((a, b) => (b.score > a.score ? b : a));
  const N = 72;
  let at;   // at(u, depth) → the point `depth` px in from the edge (or out from the corner) at u
  if (best.kind === 'edge') {
    const s = best.side, base = best.d;
    at = (u, dep) => (s === 'bottom' ? { x: x + u * w, y: y + h - dep } : s === 'top' ? { x: x + u * w, y: y + dep }
      : s === 'left' ? { x: x + dep, y: y + u * h } : { x: x + w - dep, y: y + u * h });
    const depth = (u) => base * (0.78 + 0.22 * wob(u)) + base * 0.75 * bump(u);
    const shape = (off) => { const pts = []; for (let i = 0; i <= N; i++) pts.push(at(i / N, Math.max(0, depth(i / N) + off))); return [at(1, -4), at(0, -4), ...pts]; };
    const shore = (off) => { const pts = []; for (let i = 0; i <= N; i++) pts.push(at(i / N, Math.max(0, depth(i / N) + off))); return pts; };
    return { shape, shore, light: at(bumpU, depth(bumpU) * 0.62), size: base };
  }
  const [cx, cy, a0, a1] = corners[best.side], R0 = best.R;
  const rad = (u) => R0 * (0.8 + 0.18 * wob(u)) + R0 * 0.35 * bump(u);
  const pt = (u, rr) => { const a = a0 + (a1 - a0) * u; return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr }; };
  const shape = (off) => { const pts = [{ x: cx, y: cy }]; for (let i = 0; i <= N; i++) pts.push(pt(i / N, Math.max(0, rad(i / N) + off))); return pts; };
  const shore = (off) => { const pts = []; for (let i = 0; i <= N; i++) pts.push(pt(i / N, Math.max(0, rad(i / N) + off))); return pts; };
  return { shape, shore, light: pt(bumpU, rad(bumpU) * 0.68), size: R0 * 0.5 };
}

const poly = (g, pts) => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.closePath(); };
const line = (g, pts) => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); };

/** Land seen from above, as a coast: shallows, a moving line of surf, sand,
    then grass and scrub with rocks along the shore. `land` from landSpot (or
    an island's own shape functions). */
function drawLand(g, land, E, r, phase) {
  const shallow = E.night ? '#2d5258' : '#a6cfc8', sand = E.night ? '#6a5a48' : '#e2cfa6', sandWet = E.night ? '#4f4639' : '#c9b48a';
  g.save();
  g.fillStyle = withAlpha(shallow, 0.4); poly(g, land.shape(34)); g.fill();
  g.fillStyle = withAlpha(shallow, 0.55); poly(g, land.shape(16)); g.fill();
  // the surf: two lines of foam that come in and draw back with the phase
  const swash = Math.sin(phase * 0.08) * 2.5;
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = 1.6; g.setLineDash([10, 7]); g.lineDashOffset = -phase * 0.6;
  line(g, land.shore(20 + swash)); g.stroke(); g.setLineDash([]);
  g.fillStyle = sandWet; poly(g, land.shape(5 + swash * 0.5)); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2.4; line(g, land.shore(6 + swash * 0.5)); g.stroke();
  g.fillStyle = sand; poly(g, land.shape(0)); g.fill();
  // the land behind the beach: grass, lit from the upper left, with scrub
  const pts = land.shape(-11);
  const bx = Math.min(...pts.map((p) => p.x)), by = Math.min(...pts.map((p) => p.y)), bx1 = Math.max(...pts.map((p) => p.x)), by1 = Math.max(...pts.map((p) => p.y));
  const gr = g.createLinearGradient(bx, by, bx1, by1); gr.addColorStop(0, E.grass); gr.addColorStop(1, E.grassAlt);
  g.fillStyle = gr; poly(g, pts); g.fill();
  g.save(); poly(g, pts); g.clip();
  for (let i = 0; i < (bx1 - bx) * (by1 - by) / 700; i++) {
    const sx = bx + r() * (bx1 - bx), sy = by + r() * (by1 - by), rr = 4 + r() * 9;
    const sg = g.createRadialGradient(sx - rr * 0.3, sy - rr * 0.3, 0, sx, sy, rr);
    sg.addColorStop(0, withAlpha(E.grass, 0.9)); sg.addColorStop(1, withAlpha(E.grassAlt, 0));
    g.fillStyle = withAlpha('#000000', 0.16); g.beginPath(); g.arc(sx + rr * 0.35, sy + rr * 0.3, rr * 0.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, rr, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  g.strokeStyle = withAlpha(E.earth, 0.35); g.lineWidth = 1.2; line(g, land.shore(-11)); g.stroke();
  // rocks along the shore, each lit on its upper left
  const shore = land.shore(-2);
  for (let i = 2; i < shore.length - 2; i += 3 + Math.floor(r() * 4)) {
    if (r() < 0.45) continue;
    const p = shore[i], rr = 2.5 + r() * 4;
    g.fillStyle = withAlpha('#000000', 0.25); g.beginPath(); g.ellipse(p.x + 1.5, p.y + 1.5, rr, rr * 0.75, 0, 0, Math.PI * 2); g.fill();
    const rg = g.createRadialGradient(p.x - rr * 0.4, p.y - rr * 0.4, 0, p.x, p.y, rr);
    rg.addColorStop(0, E.night ? '#8d8285' : '#d6cdc6'); rg.addColorStop(1, E.night ? '#4d4447' : '#8f8580');
    g.fillStyle = rg; g.beginPath(); g.ellipse(p.x, p.y, rr, rr * 0.75, r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/** A lighthouse seen from above and a little to the south, standing at (x, y):
    a white tower with dark bands on its rock, the gallery and the lantern, and
    — `beam`, an angle in radians, or null — the light sweeping round. s is its
    height in px (about 34 reads well). */
export function lighthouseAbove(g, x, y, s = 34, { beam = null } = {}) {
  const E = env(), bw = s * 0.34, tw = s * 0.22, top = y - s;
  g.save();
  // its shadow, falling down and to the right, away from the light
  g.fillStyle = withAlpha('#000000', 0.28);
  g.beginPath(); g.moveTo(x - bw / 2, y); g.lineTo(x + s * 0.55, y + s * 0.42); g.lineTo(x + s * 0.55 + tw * 0.8, y + s * 0.3); g.lineTo(x + bw / 2, y - 2); g.closePath(); g.fill();
  // the plinth
  const pg = g.createRadialGradient(x - bw * 0.3, y - 2, 0, x, y, bw);
  pg.addColorStop(0, E.night ? '#9a9092' : '#e9e2dc'); pg.addColorStop(1, E.night ? '#5c5254' : '#a39892');
  g.fillStyle = pg; g.beginPath(); g.ellipse(x, y, bw * 0.95, bw * 0.42, 0, 0, Math.PI * 2); g.fill();
  // the tower, tapering, lit from the left, with two dark bands
  const tg = g.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  tg.addColorStop(0, '#fbf7f2'); tg.addColorStop(0.55, '#e4ddd6'); tg.addColorStop(1, '#a89e98');
  g.fillStyle = tg;
  g.beginPath(); g.moveTo(x - bw / 2, y); g.lineTo(x - tw / 2, top + s * 0.18); g.lineTo(x + tw / 2, top + s * 0.18); g.lineTo(x + bw / 2, y); g.closePath(); g.fill();
  g.save(); g.clip();
  g.fillStyle = '#3b4250';
  for (const f of [0.32, 0.62]) g.fillRect(x - bw, y - s * f - s * 0.07, bw * 2, s * 0.13);
  g.restore();
  g.strokeStyle = withAlpha('#000000', 0.35); g.lineWidth = 1; g.stroke();
  // the gallery, the lantern and its cap
  g.fillStyle = '#3b4250'; g.beginPath(); g.ellipse(x, top + s * 0.18, tw * 0.85, tw * 0.3, 0, 0, Math.PI * 2); g.fill();
  const lit = E.night ? 'rgba(255,230,160,1)' : 'rgba(255,224,150,1)';
  g.fillStyle = lit; g.fillRect(x - tw * 0.38, top + s * 0.04, tw * 0.76, s * 0.14);
  g.fillStyle = '#2c313b'; g.beginPath(); g.moveTo(x - tw * 0.5, top + s * 0.05); g.lineTo(x, top - s * 0.06); g.lineTo(x + tw * 0.5, top + s * 0.05); g.closePath(); g.fill();
  // the glow, and the beam
  const lx = x, ly = top + s * 0.11;
  const glow = g.createRadialGradient(lx, ly, 0, lx, ly, s * 0.7);
  glow.addColorStop(0, `rgba(255,230,160,${E.night ? 0.55 : 0.35})`); glow.addColorStop(1, 'rgba(255,230,160,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(lx, ly, s * 0.7, 0, Math.PI * 2); g.fill();
  if (beam != null) {
    const L = s * 4.2, half = 0.16;
    const bg = g.createRadialGradient(lx, ly, 0, lx, ly, L);
    bg.addColorStop(0, `rgba(255,232,170,${E.night ? 0.42 : 0.26})`); bg.addColorStop(1, 'rgba(255,232,170,0)');
    g.fillStyle = bg; g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, L, beam - half, beam + half); g.closePath(); g.fill();
  }
  g.restore();
}

/**
 * The sea from above, filling the box (x, y, w, h): deep water darkening away
 * from the shore, long swell lines lit on their crests and shaded in their
 * troughs, whitecaps that come and go, the sun's glint — and, where the motion
 * leaves room, a coast with surf, a beach and a headland (with a lighthouse).
 * @param o { phase: px the swell has travelled, seed, avoid: [{x, y}] px the
 *   motion passes through, coast: draw land where it fits (needs avoid),
 *   hud: keep land out from under the top-left readouts,
 *   islands: [{ x, y, r }] small islands (a lighthouse's rock) }
 * @returns { light: {x, y} | null } where the headland's lighthouse stands
 */
export function seaFromAbove(g, x, y, w, h, o = {}) {
  const E = env(), r = rng(o.seed ?? 23), phase = o.phase ?? 0, avoid = o.avoid || [];
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const deep = E.night ? '#132229' : '#5f8796', mid = E.night ? '#1b313a' : '#77a0ad';
  const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
  gr.addColorStop(0, mid); gr.addColorStop(1, deep);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  // broad patches of deeper and shallower water
  for (let i = 0; i < 7; i++) {
    const cx = x + r() * w, cy = y + r() * h, R = Math.max(w, h) * (0.15 + r() * 0.2);
    const pg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    pg.addColorStop(0, withAlpha(i % 2 ? deep : (E.night ? '#24414a' : '#8db3bb'), 0.5)); pg.addColorStop(1, withAlpha(deep, 0));
    g.fillStyle = pg; g.fillRect(x, y, w, h);
  }
  // the swell: long crests across the box at a slant, drifting with the phase
  const ang = -0.38, sp = 30, cs = Math.cos(ang), sn = Math.sin(ang), D = Math.hypot(w, h);
  const ccx = x + w / 2, ccy = y + h / 2, drift = (phase % sp + sp) % sp;
  g.lineCap = 'round';
  for (let j = -D / 2 - sp; j < D / 2 + sp; j += sp) {
    const v0 = j + drift, k = Math.round(j / sp);
    for (const [dv, col, lw] of [[3, E.night ? 'rgba(0,0,0,0.30)' : 'rgba(30,60,75,0.20)', 3], [0, E.night ? 'rgba(200,230,240,0.12)' : 'rgba(255,255,255,0.30)', 1.4]]) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
      for (let u = -D / 2; u <= D / 2; u += 14) {
        const vv = v0 + dv + Math.sin(u / 47 + k * 1.7) * 3.2 + Math.sin(u / 19 + k) * 1.1;
        const px = ccx + u * cs - vv * sn, py = ccy + u * sn + vv * cs;
        if (u === -D / 2) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke();
    }
  }
  // whitecaps: small breaking crests, each coming and going with the phase
  const nCap = Math.round((w * h) / 4200);
  for (let i = 0; i < nCap; i++) {
    const cx = x + r() * w, cy = y + r() * h, s = 3 + r() * 6, life = Math.sin(phase * 0.05 + i * 2.39);
    if (life < 0.15) continue;
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.strokeStyle = `rgba(255,255,255,${(E.night ? 0.32 : 0.6) * life})`; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.45, s, 0); g.stroke();
    g.fillStyle = `rgba(255,255,255,${(E.night ? 0.18 : 0.35) * life})`;
    for (let q = 0; q < 3; q++) { g.beginPath(); g.arc((r() - 0.5) * s * 1.6, r() * 2.5, 0.9 + r() * 0.9, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  // the sun's (or the moon's) glint, high on the left
  const sx = x + w * 0.18, sy = y + h * 0.12, SR = Math.max(w, h) * 0.55;
  const sg = g.createRadialGradient(sx, sy, 0, sx, sy, SR);
  sg.addColorStop(0, E.night ? 'rgba(255,220,200,0.10)' : 'rgba(255,240,215,0.32)'); sg.addColorStop(1, 'rgba(255,240,215,0)');
  g.fillStyle = sg; g.fillRect(x, y, w, h);
  // land: a coast where the motion leaves room, and any islands
  let light = null;
  if (o.coast && avoid.length) {
    const land = landSpot(x, y, w, h, avoid, rng((o.seed ?? 23) + 5), o);
    if (land) { drawLand(g, land, E, r, phase); light = land.light; }
  }
  for (const is of o.islands || []) {
    const ir = rng(Math.round(is.x * 7 + is.y * 13)), iw = wobble(ir, 3);
    const rad = (u) => is.r * (1 + 0.22 * iw(u));
    const ring = (off) => { const pts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push({ x: is.x + Math.cos(a) * Math.max(1, rad(i / 48) + off), y: is.y + Math.sin(a) * Math.max(1, rad(i / 48) + off) * 0.8 }); } return pts; };
    drawLand(g, { shape: ring, shore: ring }, E, ir, phase);
  }
  // a vignette: the water darkens towards the edges of the view
  const vg = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, D * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, E.night ? 'rgba(0,0,0,0.30)' : 'rgba(20,40,50,0.16)');
  g.fillStyle = vg; g.fillRect(x, y, w, h);
  g.restore();
  return { light };
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

/** A tree seen from above at (x, y), canopy radius R px: its shadow thrown
    down and to the right, a canopy of lit clumps. */
export function treeAbove(g, x, y, R, { seed = 3 } = {}) {
  const E = env(), r = rng(seed);
  g.save();
  g.fillStyle = withAlpha('#000000', E.night ? 0.32 : 0.22);
  g.beginPath(); g.ellipse(x + R * 0.55, y + R * 0.4, R * 1.05, R * 0.85, 0.5, 0, Math.PI * 2); g.fill();
  const dark = E.night ? '#2f3a22' : '#5f6e3c', lit = E.night ? '#5d6b40' : '#a3ad6a';
  const base = g.createRadialGradient(x - R * 0.3, y - R * 0.3, 0, x, y, R);
  base.addColorStop(0, withAlpha(lit, 1)); base.addColorStop(1, withAlpha(dark, 1));
  g.fillStyle = base; g.beginPath(); g.arc(x, y, R * 0.92, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2, d = R * (0.2 + r() * 0.5), cr = R * (0.32 + r() * 0.22), cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
    const cg = g.createRadialGradient(cx - cr * 0.4, cy - cr * 0.4, 0, cx, cy, cr);
    cg.addColorStop(0, withAlpha(lit, 0.95)); cg.addColorStop(1, withAlpha(dark, 0.0));
    g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/**
 * A field from above, filling the box: the mower's stripes, each lit on one
 * side, the grain of the grass, darker clover patches, the sun's light from
 * the upper left falling away to the lower right, and — where the motion
 * leaves room (`avoid`, px) — trees round the edge throwing their shadows.
 * @param o { seed, band (stripe width, px), avoid: [{x, y}], keep: [{x, y, w, h}]
 *   boxes to leave bare (the readouts), trees: how many at most (default 6 with avoid),
 *   pitch: mark it out as a football pitch, with goals }
 */
export function fieldFromAbove(g, x, y, w, h, o = {}) {
  const E = env(), r = rng(o.seed ?? 37), avoid = o.avoid || [];
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const gr = g.createLinearGradient(x, y, x + w * 0.5, y + h);
  gr.addColorStop(0, E.grass); gr.addColorStop(1, E.grassAlt);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  // the mower's stripes: each pass lit across its width, the way back shaded
  const band = o.band ?? 46;
  for (let xx = x - ((x % (band * 2)) + band * 2) % (band * 2), i = 0; xx < x + w; xx += band, i++) {
    const sg = g.createLinearGradient(xx, 0, xx + band, 0);
    if (i % 2) { sg.addColorStop(0, 'rgba(0,0,0,0.10)'); sg.addColorStop(0.5, 'rgba(0,0,0,0.07)'); sg.addColorStop(1, 'rgba(0,0,0,0.10)'); }
    else { sg.addColorStop(0, `rgba(255,255,240,${E.night ? 0.03 : 0.08})`); sg.addColorStop(0.5, `rgba(255,255,240,${E.night ? 0.06 : 0.13})`); sg.addColorStop(1, `rgba(255,255,240,${E.night ? 0.03 : 0.08})`); }
    g.fillStyle = sg; g.fillRect(xx, y, band, h);
  }
  // clover and thicker patches
  for (let i = 0; i < Math.max(6, (w * h) / 26000); i++) {
    const cx = x + r() * w, cy = y + r() * h, R = 24 + r() * 60;
    const pg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    pg.addColorStop(0, withAlpha(E.grassAlt, 0.4)); pg.addColorStop(1, withAlpha(E.grassAlt, 0));
    g.fillStyle = pg; g.beginPath(); g.ellipse(cx, cy, R, R * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2); g.fill();
  }
  // the grain: short blades, two tones, leaning the way the stripe was mown
  const nBl = Math.round((w * h) / 70);
  for (const [col, a] of [[E.night ? '#000000' : '#3e4826', E.night ? 0.22 : 0.16], [E.night ? '#b8c08a' : '#f4f1c8', E.night ? 0.10 : 0.20]]) {
    g.strokeStyle = withAlpha(col, a); g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < nBl / 2; i++) {
      const bx = x + r() * w, by = y + r() * h, stripe = Math.floor((bx - x) / band) % 2 ? -1 : 1;
      g.moveTo(bx, by); g.lineTo(bx + stripe * 0.8, by - 2.2 - r() * 1.6);
    }
    g.stroke();
  }
  // a scatter of daisies in daylight
  if (!E.night) { g.fillStyle = 'rgba(255,255,250,0.65)'; for (let i = 0; i < (w * h) / 6000; i++) { g.beginPath(); g.arc(x + r() * w, y + r() * h, 1.1, 0, Math.PI * 2); g.fill(); } }
  if (o.pitch) pitchAbove(g, x, y, w, h, E);
  // trees, where nothing passes: near the edges, never on the motion or under the readouts
  const want = o.trees ?? (avoid.length && !o.pitch ? 6 : 0), keep = o.keep || [];
  const placed = [];
  for (let tries = 0; tries < 80 && placed.length < want; tries++) {
    const edge = Math.floor(r() * 4), u = r(), R = 16 + r() * 14, inset = R * (0.2 + r() * 1.2);
    const tx = edge === 0 ? x + inset : edge === 1 ? x + w - inset : x + u * w, ty = edge === 2 ? y + inset : edge === 3 ? y + h - inset : y + u * h;
    if (clearOf(avoid, tx, ty) < R + 46) continue;
    if (placed.some((p) => Math.hypot(p.x - tx, p.y - ty) < (p.R + R) * 1.3)) continue;
    if (keep.some((b) => tx > b.x - R && tx < b.x + b.w + R && ty > b.y - R && ty < b.y + b.h + R)) continue;
    placed.push({ x: tx, y: ty, R });
  }
  for (const p of placed) treeAbove(g, p.x, p.y, p.R, { seed: Math.round(p.x + p.y) });
  // the light: warm from the upper left, falling away to the lower right
  const lg = g.createRadialGradient(x + w * 0.12, y + h * 0.08, 0, x + w * 0.12, y + h * 0.08, Math.hypot(w, h) * 0.9);
  lg.addColorStop(0, E.night ? 'rgba(255,214,190,0.10)' : 'rgba(255,240,205,0.28)'); lg.addColorStop(0.5, 'rgba(255,240,205,0)');
  lg.addColorStop(1, E.night ? 'rgba(0,0,0,0.30)' : 'rgba(40,40,10,0.14)');
  g.fillStyle = lg; g.fillRect(x, y, w, h);
  g.restore();
}

/** A pitch marked out on the grass from above, filling the box: touchlines,
    the halfway line and centre circle, the penalty areas and spots, corner
    arcs with flags, and a goal at each end — posts, crossbar and a net with
    its shadow. Chalk, not ink: soft and a little worn, under the grid. */
function pitchAbove(g, x0, y0, w0, h0, E) {
  // a pitch runs the long way: on a tall (phone) canvas, end to end up the screen
  g.save();
  let x = x0, y = y0, w = w0, h = h0;
  if (h0 > w0) { g.translate(x0 + w0, y0); g.rotate(Math.PI / 2); x = 0; y = 0; w = h0; h = w0; }
  const m = Math.max(18, Math.min(w, h) * 0.05), L = x + m, R = x + w - m, T = y + m, B = y + h - m, cx = (L + R) / 2, cy = (T + B) / 2, H = B - T;
  const chalk = `rgba(255,255,250,${E.night ? 0.3 : 0.55})`;
  g.save(); g.strokeStyle = chalk; g.lineWidth = 2.6; g.lineJoin = 'round';
  g.strokeRect(L, T, R - L, B - T);
  g.beginPath(); g.moveTo(cx, T); g.lineTo(cx, B); g.stroke();
  g.beginPath(); g.arc(cx, cy, H * 0.16, 0, Math.PI * 2); g.stroke();
  g.fillStyle = chalk; g.beginPath(); g.arc(cx, cy, 3, 0, Math.PI * 2); g.fill();
  for (const side of [-1, 1]) {
    const gx = side < 0 ? L : R, d = side < 0 ? 1 : -1, bw = Math.min((R - L) * 0.16, H * 0.3), bh = H * 0.56, sw = bw * 0.37, sh = H * 0.26;
    g.strokeRect(Math.min(gx, gx + d * bw), cy - bh / 2, bw, bh);
    g.strokeRect(Math.min(gx, gx + d * sw), cy - sh / 2, sw, sh);
    g.beginPath(); g.arc(gx + d * bw * 0.7, cy, 2.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(gx + d * bw * 0.7, cy, H * 0.16, side < 0 ? -0.93 : Math.PI - 0.93, side < 0 ? 0.93 : Math.PI + 0.93);
    g.save(); g.beginPath(); g.rect(side < 0 ? gx + bw : x, y, side < 0 ? w : gx - bw - x, h); g.clip();
    g.beginPath(); g.arc(gx + d * bw * 0.7, cy, H * 0.16, 0, Math.PI * 2); g.stroke(); g.restore();
    // the goal: the net behind the line, its shadow, the frame
    const gw = H * 0.13, depth = Math.min(m * 0.85, 18), nx = gx - d * depth;
    g.fillStyle = withAlpha('#000000', 0.22); g.fillRect(Math.min(gx, nx) + 3, cy - gw + 4, depth, gw * 2);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(Math.min(gx, nx), cy - gw, depth, gw * 2);
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.8;
    for (let k = 3; k < gw * 2; k += 4) { g.beginPath(); g.moveTo(Math.min(gx, nx), cy - gw + k); g.lineTo(Math.max(gx, nx), cy - gw + k); g.stroke(); }
    for (let k = 3; k < depth; k += 4) { g.beginPath(); g.moveTo(Math.min(gx, nx) + k, cy - gw); g.lineTo(Math.min(gx, nx) + k, cy + gw); g.stroke(); }
    g.restore();
    g.fillStyle = '#f7f5f0'; g.fillRect(gx - 2.5, cy - gw - 2.5, 5, gw * 2 + 5);
    g.fillStyle = withAlpha('#000000', 0.25); g.fillRect(gx + 2.5, cy - gw + 2, 2, gw * 2);
    // corner arcs and flags
    for (const yy of [T, B]) {
      const up = yy === T ? 1 : -1;
      g.beginPath(); g.arc(gx, yy, 9, up > 0 ? (d > 0 ? 0 : Math.PI / 2) : (d > 0 ? -Math.PI / 2 : Math.PI), up > 0 ? (d > 0 ? Math.PI / 2 : Math.PI) : (d > 0 ? 0 : -Math.PI / 2)); g.stroke();
      g.fillStyle = withAlpha('#000000', 0.3); g.beginPath(); g.ellipse(gx + 6, yy + 4, 6, 2, 0.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8c547'; g.beginPath(); g.moveTo(gx, yy); g.lineTo(gx + 8, yy - 3); g.lineTo(gx, yy - 7); g.closePath(); g.fill();
      g.fillStyle = '#f7f5f0'; g.beginPath(); g.arc(gx, yy, 2, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
  g.restore();
}

/** The ground far below a bird, filling the box: a patchwork of fields with
    hedges, a river and a lane, misted by height, and soft clouds drifting
    (with `phase`, px) between, each with its shadow on the ground. */
export function skyFromAbove(g, x, y, w, h, o = {}) {
  const E = env(), r = rng(o.seed ?? 41), phase = o.phase ?? 0;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const tones = E.night ? ['#3d4630', '#454c33', '#4d4a35', '#3a4031', '#524a3a'] : ['#a4a86e', '#b4b07a', '#c6b98a', '#93985f', '#b8a77c'];
  g.fillStyle = tones[0]; g.fillRect(x, y, w, h);
  // the patchwork, on a slightly turned, jittered grid
  const ang = -0.22, cs = Math.cos(ang), sn = Math.sin(ang), D = Math.hypot(w, h), cx = x + w / 2, cy = y + h / 2, cell = 120;
  const P = (u, v) => ({ x: cx + u * cs - v * sn, y: cy + u * sn + v * cs });
  const jit = {}; const J = (i, j) => (jit[i + ',' + j] ??= { u: (r() - 0.5) * cell * 0.35, v: (r() - 0.5) * cell * 0.35 });
  const n = Math.ceil(D / cell / 2) + 1;
  for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
    const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => { const q = J(a, b); return P(a * cell + q.u, b * cell + q.v); });
    g.fillStyle = tones[Math.floor(r() * tones.length)]; poly(g, c); g.fill();
    if (r() < 0.5) { g.strokeStyle = withAlpha('#000000', 0.08); g.lineWidth = 1; for (let s = 0.15; s < 1; s += 0.15) { g.beginPath(); g.moveTo(c[0].x + (c[1].x - c[0].x) * s, c[0].y + (c[1].y - c[0].y) * s); g.lineTo(c[3].x + (c[2].x - c[3].x) * s, c[3].y + (c[2].y - c[3].y) * s); g.stroke(); } }
    g.strokeStyle = withAlpha(E.night ? '#262c1d' : '#6b7a45', 0.8); g.lineWidth = 3.2; poly(g, c); g.stroke();
    g.fillStyle = withAlpha(E.night ? '#2c3521' : '#76854c', 0.9);
    for (let q = 0; q < 4; q++) { const e = Math.floor(r() * 4), u = r(), A = c[e], B = c[(e + 1) % 4]; g.beginPath(); g.arc(A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u, 3 + r() * 4, 0, Math.PI * 2); g.fill(); }
  }
  // a river winding across, and a lane
  g.lineCap = 'round'; g.lineJoin = 'round';
  const river = []; for (let u = -D / 2; u <= D / 2; u += 10) river.push(P(u, D * 0.18 + Math.sin(u / 90) * 40 + Math.sin(u / 37) * 10));
  g.strokeStyle = E.night ? '#2c3a2a' : '#7d8a55'; g.lineWidth = 15; line(g, river); g.stroke();
  g.strokeStyle = E.night ? '#2c434c' : '#7fa0ad'; g.lineWidth = 10; line(g, river); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.5; line(g, river); g.stroke();
  // height: everything below is misted
  g.fillStyle = withAlpha(E.skyMid, E.night ? 0.42 : 0.38); g.fillRect(x, y, w, h);
  // clouds between, and their shadows on the ground
  const nC = Math.max(4, Math.round((w * h) / 70000));
  for (let i = 0; i < nC; i++) {
    const px = x + ((r() * (w + 300) + phase) % (w + 300)) - 150, py = y + r() * h, R = 40 + r() * 60;
    const blob = (ox, oy, col0, col1) => {
      for (let q = 0; q < 5; q++) {
        const bx = ox + (q - 2) * R * 0.38, by = oy + Math.sin(q * 1.7 + i) * R * 0.18, br = R * (0.45 + 0.2 * Math.sin(q + i));
        const cg = g.createRadialGradient(bx - br * 0.3, by - br * 0.3, 0, bx, by, br);
        cg.addColorStop(0, col0); cg.addColorStop(1, col1);
        g.fillStyle = cg; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
      }
    };
    blob(px + R * 0.8, py + R * 0.6, 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0)');
    blob(px, py, E.night ? 'rgba(235,225,230,0.20)' : 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)');
  }
  g.restore();
}

/* ── fitting a plan (a stage seen from above) ──────────────────────────── */

/**
 * Fit a plan — x east, y north, one scale both ways — to the best of
 * `areas` (each { left, right, top, bottom } px): the one that lets it be
 * drawn largest. `box` is what must be seen, in the motion's units
 * ({ xLo, xHi, yLo, yHi }). The place itself still fills the whole canvas;
 * this only says where the plan's own pixels go.
 * Returns { k, ox, oy, area, X, Y, ix, iy } — X, Y to px and ix, iy back.
 */
export function fitPlan(box, areas) {
  const bw = Math.max(1e-9, box.xHi - box.xLo), bh = Math.max(1e-9, box.yHi - box.yLo);
  let best = null;
  for (const a of areas) {
    const k = Math.min((a.right - a.left) / bw, (a.bottom - a.top) / bh);
    if (!best || k > best.k * 1.08) best = { k, a };
  }
  const { k, a } = best;
  const ox = a.left + (a.right - a.left - bw * k) / 2 - box.xLo * k, oy = a.top + (a.bottom - a.top - bh * k) / 2 + box.yHi * k;
  return { k, ox, oy, area: a, X: (x) => ox + x * k, Y: (y) => oy - y * k, ix: (px) => (px - ox) / k, iy: (py) => (oy - py) / k };
}

/**
 * Fit a plan as large as it will go in `area` (px) while keeping every one of
 * `pts` (the motion, in its own units) out from under `avoid` — the readouts,
 * the compass — by `margin` px: the plan may slide anywhere in the area, so a
 * motion that leaves the top-left corner empty can use the whole canvas with
 * the readouts over that empty corner. Deterministic: the same inputs give
 * the same fit. Returns what fitPlan returns.
 */
const fits = new Map();
export function fitPlanAround(box, pts, area, { avoid = [], margin = 0, steps = 10 } = {}) {
  // the same stage asks the same question every frame: answer it once
  const key = JSON.stringify([box, area, avoid, margin, pts.length, pts[0], pts[pts.length >> 1], pts[pts.length - 1]]);
  const hitF = fits.get(key);
  if (hitF) return hitF;
  if (fits.size > 64) fits.clear();
  const F = fitAround(box, pts, area, avoid, margin, steps);
  fits.set(key, F);
  return F;
}
function fitAround(box, pts, area, avoid, margin, steps) {
  const bw = Math.max(1e-9, box.xHi - box.xLo), bh = Math.max(1e-9, box.yHi - box.yLo);
  const W = area.right - area.left, H = area.bottom - area.top;
  const make = (k, ox, oy) => ({ k, ox, oy, area, X: (x) => ox + x * k, Y: (y) => oy - y * k, ix: (px) => (px - ox) / k, iy: (py) => (oy - py) / k });
  const hit = (k, ox, oy) => pts.some((p) => { const x = ox + p.x * k, y = oy - p.y * k; return avoid.some((b) => x > b.x - margin && x < b.x + b.w + margin && y > b.y - margin && y < b.y + b.h + margin); });
  let k = Math.min(W / bw, H / bh);
  for (let it = 0; it < 45; it++, k *= 0.965) {
    const oxLo = area.left - box.xLo * k, oxHi = area.right - box.xHi * k, oyLo = area.top + box.yHi * k, oyHi = area.bottom + box.yLo * k;
    const oxC = (oxLo + oxHi) / 2, oyC = (oyLo + oyHi) / 2;
    let best = null;
    for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) {
      const ox = oxLo + ((oxHi - oxLo) * i) / steps, oy = oyLo + ((oyHi - oyLo) * j) / steps;
      const d = Math.hypot(ox - oxC, oy - oyC);
      if (best && d >= best.d) continue;
      if (!hit(k, ox, oy)) best = { ox, oy, d };
    }
    if (best) return make(k, best.ox, best.oy);
  }
  const F = fitPlan(box, [area]);
  return make(F.k, F.ox, F.oy);
}

/** Between two fits, by u (0..1): scale and offset eased together, so a view
    that has to widen does so smoothly. */
export function blendPlan(A, B, u) {
  const k = A.k + (B.k - A.k) * u, ox = A.ox + (B.ox - A.ox) * u, oy = A.oy + (B.oy - A.oy) * u;
  return { k, ox, oy, area: A.area, X: (x) => ox + x * k, Y: (y) => oy - y * k, ix: (px) => (px - ox) / k, iy: (py) => (oy - py) / k };
}

/**
 * The surveyor's grid laid over a plan, across the whole canvas: faint lines
 * every `step`, the two axes through O with a casing so they hold over the
 * scenery, a tick at each step, and the numbers, the axis names and O through
 * the stage's labels L (so they keep off each other, off what has been
 * reserved, and never sit at the canvas edge).
 * @param o { step, fmt(x) → text, nameI, nameJ, clear(x, y, w, h) → is that box free
 *   of the drawing (a number goes the other side of its axis if not),
 *   jTop: the highest the j axis's name may sit (below the readouts) }
 */
export function planGrid(g, L, F, w, h, P, o) {
  const { step, fmt } = o;
  const wx0 = F.ix(0), wx1 = F.ix(w), wy0 = F.iy(h), wy1 = F.iy(0), ax = F.X(0), ay = F.Y(0);
  g.save(); g.strokeStyle = P.grid; g.lineWidth = 1;
  g.beginPath();
  for (let x = Math.ceil(wx0 / step) * step; x <= wx1; x += step) { g.moveTo(F.X(x), 0); g.lineTo(F.X(x), h); }
  for (let y = Math.ceil(wy0 / step) * step; y <= wy1; y += step) { g.moveTo(0, F.Y(y)); g.lineTo(w, F.Y(y)); }
  g.stroke();
  // the axes: a soft casing, then the line, then a tick at every step
  g.strokeStyle = withAlpha(cssVar('--surface', '#131210'), 0.45); g.lineWidth = 4.5;
  g.beginPath(); g.moveTo(0, ay); g.lineTo(w, ay); g.moveTo(ax, 0); g.lineTo(ax, h); g.stroke();
  g.strokeStyle = P.strong; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(0, ay); g.lineTo(w, ay); g.moveTo(ax, 0); g.lineTo(ax, h); g.stroke();
  g.lineWidth = 1.4; g.beginPath();
  for (let x = Math.ceil(wx0 / step) * step; x <= wx1; x += step) { g.moveTo(F.X(x), ay - 4); g.lineTo(F.X(x), ay + 4); }
  for (let y = Math.ceil(wy0 / step) * step; y <= wy1; y += step) { g.moveTo(ax - 4, F.Y(y)); g.lineTo(ax + 4, F.Y(y)); }
  g.stroke();
  g.restore();
  // each number on its usual side of the axis, or — where something drawn
  // is in the way there and the other side is clear — on the other side
  const clear = o.clear || (() => true);
  g.save(); g.font = `600 13px ${cssVar('--font', 'system-ui, sans-serif')}`;
  const tw = (s) => g.measureText(s).width + 10;
  for (let x = Math.ceil(wx0 / step) * step; x <= wx1; x += step) {
    const px = F.X(x), s = fmt(x), ww = tw(s);
    if (Math.abs(x) < step * 1e-6 || px < 18 || px > w - 18) continue;
    const below = clear(px - ww / 2, ay + 4, ww, 22), above = clear(px - ww / 2, ay - 26, ww, 22);
    L.add(s, px, !below && above ? ay - 15 : ay + 15, { color: P.muted, align: 'center', pri: 1, size: 13, maxPush: 0 });
  }
  for (let y = Math.ceil(wy0 / step) * step; y <= wy1; y += step) {
    const py = F.Y(y), s = fmt(y), ww = tw(s);
    if (Math.abs(y) < step * 1e-6 || py < 16 || py > h - 16) continue;
    const left = clear(ax - 8 - ww, py - 11, ww, 22), right = clear(ax + 8, py - 11, ww, 22);
    if (!left && right) L.add(s, ax + 8, py, { color: P.muted, align: 'left', pri: 1, size: 13, maxPush: 0 });
    else L.add(s, ax - 8, py, { color: P.muted, align: 'right', pri: 1, size: 13, maxPush: 0 });
  }
  g.restore();
  L.add('O', ax - 9, ay + 15, { color: P.ink, align: 'right', pri: 6, size: 15, weight: 700, maxPush: 40 });
  if (o.nameI) L.add(o.nameI, Math.min(w - 10, F.area.right + 10), ay - 15, { color: P.strong, align: 'right', pri: 5, size: 14, maxPush: 40 });
  if (o.nameJ) L.add(o.nameJ, ax + 10, Math.max(F.area.top, o.jTop ?? 16) + 2, { color: P.strong, align: 'left', pri: 5, size: 14, maxPush: 40, push: 'down' });
}

/** A compass for a plan, in the screen's own pixels (draw it after unview so
    it stays put while the stage pans and zooms): a card with the four points,
    north long and strong, and N above. Centred at (x, y), radius R. */
export function compassRose(g, x, y, R, P) {
  const E = env();
  g.save();
  g.shadowColor = E.shadow; g.shadowBlur = 10; g.shadowOffsetY = 3;
  g.fillStyle = P.card; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = withAlpha(cssVar('--ink', '#fff'), 0.25); g.lineWidth = 1; g.beginPath(); g.arc(x, y, R - 3, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, l = i % 4 ? 2.5 : 4.5; g.beginPath(); g.moveTo(x + Math.cos(a) * (R - 3), y + Math.sin(a) * (R - 3)); g.lineTo(x + Math.cos(a) * (R - 3 - l), y + Math.sin(a) * (R - 3 - l)); g.stroke(); }
  const point = (a, len, wd, col, colDark) => {
    const ux = Math.sin(a), uy = -Math.cos(a), nx = -uy, ny = ux;
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(x + ux * len, y + uy * len); g.lineTo(x + nx * wd, y + ny * wd); g.closePath(); g.fill();
    g.fillStyle = colDark; g.beginPath(); g.moveTo(x, y); g.lineTo(x + ux * len, y + uy * len); g.lineTo(x - nx * wd, y - ny * wd); g.closePath(); g.fill();
  };
  for (const a of [Math.PI / 2, Math.PI, Math.PI * 1.5]) point(a, R * 0.62, R * 0.17, P.faint, P.muted);
  point(0, R * 0.8, R * 0.2, P.ink, P.strong);
  g.fillStyle = P.ink; g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill();
  g.font = `700 15px ${cssVar('--font', 'system-ui, sans-serif')}`; g.textAlign = 'center'; g.textBaseline = 'bottom';
  g.lineWidth = 4; g.strokeStyle = withAlpha(cssVar('--surface', '#131210'), 0.85); g.lineJoin = 'round';
  g.strokeText('N', x, y - R - 3); g.fillStyle = P.ink; g.fillText('N', x, y - R - 3);
  g.restore();
}

/* ── fitting a side-on stage ───────────────────────────────────────────── */

/**
 * Fit a side-on motion to the canvas. `box` is the motion's own extent in
 * metres, y up ({ xLo, xHi, yLo, yHi }); `area` the pixels it may use
 * ({ left, right, top, bottom }). One scale both ways, as large as fits.
 * A wide, low motion leaves height spare: rather than float the action in a
 * strip under an empty sky, the spare is split — `sky` of it above (0.4 by
 * default) and the rest below, where the ground comes up to meet it, so the
 * place fills the canvas and the motion sits in the middle of it.
 * Returns { k, X, Y, ox, oy } with X(x), Y(y) to pixels and oy = Y(0).
 */
export function fitSide(box, area, { sky = 0.4 } = {}) {
  const bw = Math.max(1e-9, box.xHi - box.xLo), bh = Math.max(1e-9, box.yHi - box.yLo);
  const W = area.right - area.left, Hh = area.bottom - area.top;
  const k = Math.min(W / bw, Hh / bh);
  const spare = Hh - bh * k, top = area.top + spare * sky;
  const ox = area.left + (W - bw * k) / 2 - box.xLo * k, oy = top + box.yHi * k;
  return { k, ox, oy, X: (x) => ox + x * k, Y: (y) => oy - y * k };
}
