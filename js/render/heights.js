// heights.js — the stage for a throw from a height: off a sea cliff, from a
// tower, a stone bridge over a river, a diving board over a pool, down a
// well, or let go from a rising hot-air balloon.
//
// Side on, ONE scale both ways, so the drop is drawn to scale against the
// throw: a 49 m tower is 49 m tall beside a rise of 11 m. The view is fitted
// to the motion (scenery.fitSide), so the place fills the canvas rather than
// floating in empty sky. Each place is drawn as the place: a rock cliff with
// strata, cracks and an overhanging turf lip over a sea running to a far
// headland; a stone tower among fields; a stone arch bridge with its piers in
// the river; a diving platform with its ladder over an outdoor pool with lane
// ropes; a stone-lined well shaft cut away down to its water, with its well
// head; a striped balloon with its wicker basket. The person who throws
// (figures.thrower) stands at the edge, wound up before the throw and
// following through after it.
//
// Everything is background except the path, the stone and its arrows: the
// scenery is held to low chroma and the water is a grey-blue, never the
// displacement hue. The height is a dimension line, the landing distance
// another (three significant figures, sig3); a height the paper asks about is
// a marker line in the marker colour, ringed where the stone crosses it.
// Velocity and its components are on the stone, across dashed and up solid
// (rule 2). The landing splashes or kicks up dust at the engine's own time.
//
// The backdrop pieces (sky, sea, groundStrip) are exported for the other
// stages that stand on them (beach, jump, clears, towards).
//
// Everything drawn is read from js/core/height.js and js/core/projectile.js
// (rule 4). The one exception is the balloon itself, which goes on rising at
// the speed it let go at — the engine's own vertical launch speed, f.uy.

import { dust, splash, phaseOf, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha, sig3 } from './util.js';
import { thrower, THROWER_MIN } from './figures.js';
import { T } from '../notation.js';
import { skyscape, water, grass, env, rng, stone, softShadow, fitSide } from './scenery.js';

const TAU = Math.PI * 2, WELL = 26;
const HUD = 250, HUD_H = 290;

/* ── backdrop pieces other stages import ──────────────────────────────── */
/** Sky from the top of the box down to the horizon: the shared layered sky
    (gradient, the sun's glow, soft clouds, far hills) from ./scenery.js. */
export function sky(g, x0, y0, x1, horizon, o = {}) { skyscape(g, x0, y0, x1, horizon, { far: 'hills', ...o }); }
/** The sea from its surface at y = Y down: the shared water, crests drifting with `phase`. */
export function sea(g, x0, x1, Y, bottom, phase = 0) { water(g, x0, x1, Y, bottom, { phase }); }
/** Level ground from its surface at Y down. */
export function groundStrip(g, x0, x1, Y, bottom) { grass(g, x0, x1, Y, bottom); }

/* ── colours of the places, per theme ─────────────────────────────────── */
function tones() {
  const E = env(), n = E.night;
  return {
    E, n,
    rock: n ? '#62564f' : '#9a8c80', rockHi: n ? '#83756b' : '#c1b3a5', rockLo: n ? '#3a3134' : '#6a5e55',
    soil: n ? '#3a2a26' : '#5f4a3b', clay: n ? '#6a503d' : '#a3825f', gravel: n ? '#57514f' : '#8c8378', bed: n ? '#46414b' : '#7b746d',
    timber: n ? '#6e5442' : '#8d6b4a', timberLo: n ? '#43332a' : '#5b432e',
    concrete: n ? '#77706f' : '#cfc8bf', concreteLo: n ? '#4b4547' : '#9a928a',
    tile: n ? '#8f9599' : '#e6e3dc', steel: n ? '#a9b0b5' : '#7c858c',
    wicker: n ? '#8a6a45' : '#b48a55', wickerLo: n ? '#5a4330' : '#7e5c36',
    roof: n ? '#5a3f3a' : '#8a5a4c', roofLo: n ? '#3a2826' : '#5f3c33',
    foam: n ? 'rgba(225,235,240,' : 'rgba(255,255,255,',
  };
}

/** A wavy line across x0..x1 near y: `amp` px of seeded wobble. */
function wavy(x0, x1, y, amp, r, step = 22) {
  const pts = [];
  for (let x = x0; x <= x1 + step; x += step) pts.push({ x: Math.min(x, x1), y: y + (r() - 0.5) * 2 * amp });
  return pts;
}
const path = (g, pts) => { g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); };

/** A tuft of grass blades at (x, y): n blades fanning, up to hgt px tall. */
function tuft(g, x, y, hgt, r, color, n = 5) {
  g.strokeStyle = color; g.lineWidth = 1.2; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - 0.5) * 1.1 + (r() - 0.5) * 0.3, hh = hgt * (0.55 + r() * 0.45);
    g.moveTo(x + (i - n / 2) * 0.8, y);
    g.quadraticCurveTo(x + Math.sin(a) * hh * 0.4, y - hh * 0.6, x + Math.sin(a) * hh * 0.8, y - Math.cos(a) * hh);
  }
  g.stroke();
}

/** A shaded boulder or stone: an irregular round, lit from the upper left. */
function rock(g, x, y, R, seed, light, dark) {
  const r = rng(seed), n = 8, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rr = R * (0.8 + r() * 0.28); pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.86 }); }
  const gr = g.createRadialGradient(x - R * 0.4, y - R * 0.45, R * 0.1, x, y, R * 1.1);
  gr.addColorStop(0, light); gr.addColorStop(1, dark);
  g.fillStyle = gr; g.beginPath();
  g.moveTo((pts[0].x + pts[n - 1].x) / 2, (pts[0].y + pts[n - 1].y) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2); }
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
}

/* ── the far side of each place ───────────────────────────────────────── */

/** The open sea to the horizon, with a misted headland and a lighthouse far off. */
function seaScene(g, w, h, horizon, phase) {
  const E = env();
  skyscape(g, 0, 0, w, horizon, { far: 'none', seed: 7 });
  // a headland across the bay, misted, on the right
  const x0 = w * 0.58, hh = clamp(horizon * 0.12, 14, 46);
  g.save();
  g.fillStyle = E.night ? '#3b3239' : '#b9a3a0';
  g.beginPath(); g.moveTo(x0, horizon); g.lineTo(x0 + hh * 0.5, horizon - hh * 0.7); g.lineTo(x0 + hh * 0.9, horizon - hh);
  g.quadraticCurveTo(x0 + hh * 4, horizon - hh * 1.25, x0 + hh * 8, horizon - hh * 0.95); g.lineTo(w, horizon - hh * 0.8); g.lineTo(w, horizon); g.closePath(); g.fill();
  g.fillStyle = withAlpha(E.grassAlt, E.night ? 0.35 : 0.3); g.fillRect(x0 + hh, horizon - hh * 1.05, hh * 7, 2);
  // the lighthouse on it
  const lx = x0 + hh * 2.2, ly = horizon - hh * 1.08, lh = hh * 0.9;
  g.fillStyle = E.night ? '#b8adaa' : '#f1ebe4'; g.beginPath(); g.moveTo(lx - lh * 0.12, ly); g.lineTo(lx - lh * 0.08, ly - lh); g.lineTo(lx + lh * 0.08, ly - lh); g.lineTo(lx + lh * 0.12, ly); g.closePath(); g.fill();
  g.fillStyle = withAlpha('#7a3b3b', 0.7); g.fillRect(lx - lh * 0.11, ly - lh * 0.55, lh * 0.22, lh * 0.15);
  g.fillStyle = withAlpha(E.window, E.night ? 0.95 : 0.7); g.fillRect(lx - lh * 0.09, ly - lh * 1.15, lh * 0.18, lh * 0.15);
  if (E.night) { const gl = g.createRadialGradient(lx, ly - lh * 1.08, 0, lx, ly - lh * 1.08, lh * 1.2); gl.addColorStop(0, withAlpha(E.window, 0.45)); gl.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = gl; g.fillRect(lx - lh * 1.2, ly - lh * 2.3, lh * 2.4, lh * 2.4); }
  g.restore();
  water(g, 0, w, horizon, h, { phase });
  // the sun's path on the water
  g.save(); const sx = w * 0.12;
  for (let i = 0; i < 9; i++) { const yy = horizon + 3 + i * i * 2.2; if (yy > h) break; g.fillStyle = withAlpha(E.sun, (E.night ? 0.16 : 0.32) * (1 - i / 10)); g.fillRect(sx - 14 - i * 3 + ((i * 37) % 11), yy, 18 + i * 5, 1.5); }
  g.restore();
}

/** A river to its far bank: trees, a grassy bank with reeds, the water. */
function riverScene(g, w, h, bank, phase) {
  const E = env(), r = rng(53);
  skyscape(g, 0, 0, w, bank - 6, { far: 'trees', seed: 9 });
  grass(g, 0, w, bank - 6, bank + 2, { seed: 4 });
  g.save(); g.fillStyle = withAlpha(E.earth, 0.8); g.fillRect(0, bank + 1, w, 2);
  for (let x = 6; x < w; x += 18 + r() * 40) tuft(g, x, bank + 2, 7 + r() * 6, r, withAlpha(E.grassAlt, 0.95), 6);
  g.restore();
  water(g, 0, w, bank + 2, h, { phase });
}

/** An outdoor pool seen from its side: the far deck, a hedge and trees beyond,
    the water with lane ropes in perspective, and the near deck left of
    `poolX`, where the diving stand is. */
function poolScene(g, w, h, far, poolX, phase) {
  const E = env(), C = tones();
  skyscape(g, 0, 0, w, far - 14, { far: 'trees', seed: 12 });
  // a clipped hedge and the far deck
  g.save();
  const hg = g.createLinearGradient(0, far - 26, 0, far - 12);
  hg.addColorStop(0, E.grass); hg.addColorStop(1, E.grassAlt);
  g.fillStyle = hg; g.beginPath(); g.moveTo(0, far - 12);
  for (let x = 0; x <= w; x += 12) g.lineTo(x, far - 24 - Math.sin(x * 0.21) * 1.5);
  g.lineTo(w, far - 12); g.closePath(); g.fill();
  g.fillStyle = C.tile; g.fillRect(0, far - 12, w, 9);
  g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 1; g.beginPath();
  for (let x = 0; x < w; x += 16) { g.moveTo(x, far - 12); g.lineTo(x - 3, far - 3); }
  g.stroke();
  g.fillStyle = E.night ? '#d5d2cb' : '#ffffff'; g.fillRect(0, far - 4, w, 4);
  g.restore();
  // the pool water
  water(g, poolX, w, far, h, { phase });
  g.save();
  // lane ropes: floats in two colours, nearer rows larger and further apart
  for (let i = 0, yy = far + 7; yy < h + 10; i++, yy += 10 + i * i * 4) {
    const s = 1.4 + i * 0.9;
    for (let x = poolX + 6 + (i % 2) * s; x < w + s; x += s * 2.6) {
      g.fillStyle = (Math.floor((x - poolX) / (s * 2.6 * 4)) % 2) ? (E.night ? 'rgba(201,196,188,0.7)' : '#f4f1ea') : (E.night ? '#41557e' : '#34477a');
      g.beginPath(); g.ellipse(x, yy, s, s * 0.55, 0, 0, TAU); g.fill();
    }
  }
  g.restore();
  // the near deck, left of the pool: tiles in perspective
  g.save();
  g.fillStyle = C.tile; g.fillRect(0, far - 3, poolX, h - far + 3);
  g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 1; g.beginPath();
  for (let i = 0, yy = far + 4; yy < h; i++, yy += 5 + i * 3) { g.moveTo(0, yy); g.lineTo(poolX, yy); }
  for (let x = poolX - 14; x > 0; x -= 14) { g.moveTo(x, far); g.lineTo(x - (h - far) * 0.25, h); }
  g.stroke();
  const sh = g.createLinearGradient(0, far, 0, h); sh.addColorStop(0, withAlpha('#000000', 0)); sh.addColorStop(1, withAlpha('#000000', 0.18));
  g.fillStyle = sh; g.fillRect(0, far, poolX, h - far);
  // the coping along the pool's edge
  g.fillStyle = E.night ? '#e0ddd6' : '#ffffff'; g.beginPath(); g.moveTo(poolX - 2, far); g.lineTo(poolX + 3, far); g.lineTo(poolX + 3 - (h - far) * 0.05, h); g.lineTo(poolX - 6 - (h - far) * 0.05, h); g.closePath(); g.fill();
  g.restore();
}

/** Fields running back to the horizon: bands of green with hedgerows and trees. */
function fields(g, w, horizon, Y) {
  const E = env(), r = rng(61);
  skyscape(g, 0, 0, w, horizon, { far: 'hills', seed: 5 });
  const D = Math.max(1, Y - horizon);
  for (let i = 0, y0 = horizon; y0 < Y; i++) {
    const hh = Math.max(3, D * (0.08 + i * 0.07));
    const y1 = Math.min(Y, y0 + hh);
    g.fillStyle = i % 2 ? E.grass : E.grassAlt; g.fillRect(0, y0, w, y1 - y0 + 1);
    g.fillStyle = withAlpha(i % 3 === 1 ? '#c9b37a' : E.grassAlt, i % 3 === 1 ? (E.night ? 0.12 : 0.22) : 0.25);
    g.fillRect(w * r(), y0, w * (0.2 + r() * 0.3), y1 - y0);
    // crop rows or furrows running back towards the horizon
    g.save(); g.beginPath(); g.rect(0, y0, w, y1 - y0); g.clip();
    g.strokeStyle = withAlpha(i % 2 ? '#000000' : '#ffffff', E.night ? 0.07 : 0.1); g.lineWidth = 1; g.beginPath();
    const gap = 6 + i * 4, lean = (i % 3 - 1) * 0.6;
    for (let x = -w * 0.5; x < w * 1.5; x += gap) { g.moveTo(x, y1); g.lineTo(x + (y1 - y0) * lean + (x - w / 2) * -0.15, y0); }
    g.stroke(); g.restore();
    // a hedgerow along the far side of the field, with a tree or two
    g.fillStyle = withAlpha(E.night ? '#1f2a1c' : '#4a5c3c', 0.6); g.fillRect(0, y0 - 1, w, Math.max(1.2, hh * 0.05));
    for (let x = r() * 160; x < w; x += 110 + r() * 260) {
      const s = (2.5 + i * 1.6) * (0.7 + r() * 0.6);
      g.fillStyle = withAlpha(E.night ? '#24301f' : '#56693f', 0.85);
      g.fillRect(x - 0.6, y0 - s * 0.5, 1.4, s * 0.5);
      g.beginPath(); g.ellipse(x, y0 - s * 1.1, s * 0.75, s * 0.85, 0, 0, TAU); g.fill();
      g.fillStyle = withAlpha('#ffffff', E.night ? 0.04 : 0.12); g.beginPath(); g.ellipse(x - s * 0.25, y0 - s * 1.35, s * 0.35, s * 0.4, 0, 0, TAU); g.fill();
    }
    y0 = y1;
  }
  grass(g, 0, w, Y, Y + 1, { seed: 6 });
}


/** A castle's curtain wall from x0 to x1, its walkway at y = top, on the ground at Y. */
function curtainWall(g, x0, x1, top, Y) {
  const E = env();
  if (x1 - x0 < 10) return;
  softShadow(g, (x0 + x1) / 2, Y + 1, (x1 - x0) * 0.55, 5, 0.7);
  stone(g, x0, top, x1 - x0, Y - top, { course: clamp((Y - top) / 10, 6, 11), seed: 17, color: E.night ? '#62575d' : '#b8aa9e' });
  const m = clamp((Y - top) * 0.14, 5, 11);
  for (let x = x1 - m * 1.5; x > x0 - m; x -= m * 2) {
    g.fillStyle = E.night ? '#776b71' : '#c9bcb0'; g.fillRect(x, top - m, m, m);
    g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(x + m * 0.7, top - m, m * 0.3, m);
  }
  g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(x0, top, x1 - x0, 3);
}

/** A broad tree standing on the ground at (x, Y), `s` px tall: a trunk and a
    canopy of shaded clumps, lit from the left. */
function tree(g, x, Y, s) {
  const E = env(), r = rng(Math.round(x));
  softShadow(g, x + s * 0.1, Y + 1, s * 0.4, 3, 0.7);
  g.fillStyle = E.night ? '#3b2d26' : '#6a4e38'; g.fillRect(x - s * 0.04, Y - s * 0.45, s * 0.08, s * 0.45);
  const dark = E.night ? '#28331f' : '#55683d', mid = E.night ? '#35432a' : '#6c8250', lit = E.night ? '#46563a' : '#8aa068';
  for (const [dx, dy, rr, c] of [[0, -0.62, 0.3, dark], [-0.18, -0.55, 0.22, dark], [0.2, -0.56, 0.22, dark], [-0.08, -0.72, 0.22, mid], [0.12, -0.7, 0.2, mid], [-0.14, -0.78, 0.13, lit], [0.02, -0.86, 0.12, lit]]) {
    g.fillStyle = c; g.beginPath(); g.arc(x + dx * s + (r() - 0.5) * 2, Y + dy * s, rr * s, 0, TAU); g.fill();
  }
}

/** The well head's frame for a stone that rises `rise` px above the mouth:
    the low wall, the posts tall enough that the winch drum clears the
    stone's highest point (a roofed frame), or — past `MAX_FRAME` — none. */
const MAX_FRAME = 120;
function wellFrame(D, rise) {
  const hw = clamp(D * 0.08, 14, 24);
  const ph = Math.max(clamp(hw * 2.8, 44, 74), (rise + 24 - hw - 3) / 0.55);
  return { hw, ph, full: rise <= MAX_FRAME, up: hw + 3 + (rise <= MAX_FRAME ? ph + clamp(ph * 0.45, 18, 32) : ph) };
}

/* ── the places ───────────────────────────────────────────────────────── */

/** A rock cliff whose top edge is at (edge, top), standing in the sea at Y,
    reaching back to x0: strata stepping back in ledges, joints and cracks, a
    wet dark foot with boulders and foam, and a turf cap that overhangs the
    edge with tufts along it. The face only leans back from the edge, so a
    stone dropped from the edge falls clear of it. */
export function seaCliff(g, x0, edge, top, Y, o = {}) {
  const C = tones(), E = C.E, r = rng(o.seed ?? 41), H = Math.max(1, Y - top);
  const lean = Math.min(26, H * 0.09), nL = clamp(Math.round(H / 24), 4, 16);
  const face = [];
  for (let i = 0; i <= nL; i++) {
    const y = top + (H * i) / nL;
    const back = lean * (i / nL) ** 1.3 + (i > 0 && i < nL ? r() * 5 : 0);
    face.push({ x: edge - back, y });
    if (i < nL) face.push({ x: edge - back - 2 - r() * 4, y: y + (H / nL) * (0.45 + r() * 0.3) });
  }
  const body = () => { g.beginPath(); g.moveTo(x0, top); g.lineTo(edge, top); for (const p of face) g.lineTo(p.x, p.y); g.lineTo(face[face.length - 1].x, Y + 4); g.lineTo(x0, Y + 4); g.closePath(); };
  g.save();
  body();
  const gr = g.createLinearGradient(0, top, 0, Y);
  gr.addColorStop(0, C.rockHi); gr.addColorStop(0.45, C.rock); gr.addColorStop(1, C.rockLo);
  g.fillStyle = gr; g.fill();
  g.clip();
  // the strata: beds of uneven thickness and tone, a dark bedding line under
  // each and a lit lip, joints here and there, and a few long cracks
  const tilt = 0.035, beds = [top];
  while (beds[beds.length - 1] < Y) beds.push(beds[beds.length - 1] + (H / nL) * (0.55 + r() * 0.9));
  for (let i = 0; i < beds.length - 1; i++) {
    const ya = beds[i], yb = beds[i + 1], tone = r();
    g.fillStyle = tone < 0.35 ? withAlpha('#000000', 0.07 + r() * 0.1) : tone < 0.7 ? withAlpha('#ffffff', C.n ? 0.02 : 0.05) : withAlpha(C.n ? '#8a6f5c' : '#c9a983', 0.12 + r() * 0.1);
    g.beginPath(); g.moveTo(x0, ya + tilt * (edge - x0)); g.lineTo(edge + 30, ya); g.lineTo(edge + 30, yb); g.lineTo(x0, yb + tilt * (edge - x0)); g.closePath(); g.fill();
    const line = wavy(x0, edge + 30, 0, 1.6, r, 16).map((p) => ({ x: p.x, y: yb + p.y + tilt * (edge - p.x) }));
    g.strokeStyle = withAlpha('#000000', 0.3 + r() * 0.15); g.lineWidth = 1.2 + r(); g.beginPath(); path(g, line); g.stroke();
    g.strokeStyle = withAlpha('#ffffff', C.n ? 0.07 : 0.18); g.lineWidth = 1; g.beginPath(); path(g, line.map((p) => ({ x: p.x, y: p.y + 2 }))); g.stroke();
    g.strokeStyle = withAlpha('#000000', 0.24); g.lineWidth = 1; g.beginPath();
    for (let x = x0 + r() * 120; x < edge - 6; x += 70 + r() * 150) {
      const yy0 = ya + tilt * (edge - x) + 2, yy1 = yb + tilt * (edge - x) - 1;
      g.moveTo(x, yy0); g.lineTo(x + (r() - 0.5) * 8, (yy0 + yy1) / 2); g.lineTo(x + (r() - 0.5) * 8, yy1);
    }
    g.stroke();
  }
  // long cracks running down several beds, lit on one side
  for (let i = 0; i < Math.max(2, (edge - x0) / 140); i++) {
    let x = x0 + 20 + r() * (edge - x0 - 50), y = top + r() * H * 0.4;
    const len = H * (0.25 + r() * 0.45), seg = [{ x, y }];
    while (y < Math.min(Y, seg[0].y + len)) { y += 6 + r() * 10; x += (r() - 0.5) * 7; seg.push({ x, y }); }
    g.strokeStyle = withAlpha('#000000', 0.45); g.lineWidth = 1.5; g.beginPath(); path(g, seg); g.stroke();
    g.strokeStyle = withAlpha('#ffffff', C.n ? 0.08 : 0.2); g.lineWidth = 1; g.beginPath(); path(g, seg.map((p) => ({ x: p.x - 1.5, y: p.y }))); g.stroke();
  }
  // weathering: streaks run down from the top
  for (let i = 0; i < (edge - x0) / 40; i++) {
    const sx = x0 + r() * (edge - x0), sw = 6 + r() * 18, sl = H * (0.2 + r() * 0.6);
    const st = g.createLinearGradient(0, top, 0, top + sl); st.addColorStop(0, withAlpha('#000000', 0.12)); st.addColorStop(1, withAlpha('#000000', 0));
    g.fillStyle = st; g.fillRect(sx, top, sw, sl);
  }
  // grain: a speckle of light and dark
  const nS = Math.min(700, ((edge - x0) * H) / 260);
  for (let i = 0; i < nS; i++) { g.fillStyle = r() < 0.5 ? withAlpha('#000000', 0.16) : withAlpha('#ffffff', C.n ? 0.06 : 0.14); g.fillRect(x0 + r() * (edge - x0), top + r() * H, 1.5, 1.5); }
  // the seaward face turns away from the light: a darker strip along it
  g.fillStyle = withAlpha('#000000', 0.26); g.beginPath(); g.moveTo(edge, top);
  for (const p of face) g.lineTo(p.x, p.y);
  for (let i = face.length - 1; i >= 0; i--) g.lineTo(face[i].x - 9 - (i % 3), face[i].y);
  g.closePath(); g.fill();
  // wet and weedy at the foot
  const wet = g.createLinearGradient(0, Y - Math.min(30, H * 0.2), 0, Y + 4);
  wet.addColorStop(0, withAlpha('#2f3d33', 0)); wet.addColorStop(1, withAlpha(C.n ? '#1b241f' : '#3a4a3a', 0.65));
  g.fillStyle = wet; g.fillRect(x0, Y - Math.min(30, H * 0.2), edge - x0 + 40, Math.min(30, H * 0.2) + 4);
  // tiny tufts on the ledges
  for (let i = 2; i < face.length - 3; i += 3) tuft(g, face[i].x - 4, face[i].y + 1, 4 + r() * 3, r, withAlpha(E.grass, 0.9), 4);
  g.restore();
  // boulders at the foot, behind the line of the face
  const fx = face[face.length - 1].x;
  for (let i = 0; i < 6; i++) rock(g, fx - 8 - i * 11 - r() * 6, Y - 2 - r() * 2, 4 + r() * 6, 70 + i, C.rockHi, C.rockLo);
  // the turf cap: a soil line, the turf overhanging the edge, tufts along it
  const tk = clamp(H * 0.04, 5, 10);
  g.save();
  g.fillStyle = C.soil; g.fillRect(x0, top + tk - 1, edge - x0 - 2, 4);
  const tg = g.createLinearGradient(0, top - 3, 0, top + tk);
  tg.addColorStop(0, E.grass); tg.addColorStop(1, E.grassAlt);
  g.fillStyle = tg; g.beginPath(); g.moveTo(x0, top - 3); g.lineTo(edge, top - 3);
  g.quadraticCurveTo(edge + 6, top - 2, edge + 4, top + tk * 0.8); g.quadraticCurveTo(edge + 1, top + tk + 3, edge - 5, top + tk);
  for (const p of wavy(edge - 5, x0, top + tk, 1.5, r, -18).filter((p) => p.x <= edge - 5)) g.lineTo(p.x, p.y);
  g.lineTo(x0, top + tk); g.closePath(); g.fill();
  // the lit top of the turf
  g.strokeStyle = withAlpha('#ffffff', C.n ? 0.1 : 0.28); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, top - 2.5); g.lineTo(edge + 1, top - 2.5); g.stroke();
  // grass hanging over the lip
  g.strokeStyle = E.grassAlt; g.lineWidth = 1; g.beginPath();
  for (let i = 0; i < 6; i++) { const xx = edge - 2 + i * 1.2; g.moveTo(xx, top + tk * 0.5); g.quadraticCurveTo(xx + 2, top + tk + 3, xx + 1 - r() * 2, top + tk + 5 + r() * 6); }
  g.stroke();
  for (let x = x0 + 4; x < edge + 2; x += 9 + r() * 14) tuft(g, x, top - 2, (x > edge - 50 ? 8 : 5) + r() * 4, r, r() < 0.5 ? E.grass : withAlpha(E.grassAlt, 1), 5);
  // a few flowers in the turf
  for (let x = x0 + 30 + r() * 40; x < edge - 20; x += 60 + r() * 90) { g.fillStyle = r() < 0.5 ? '#efe6c8' : '#d8c27a'; g.beginPath(); g.arc(x, top - 5 - r() * 3, 1.6, 0, TAU); g.fill(); }
  g.restore();
  // foam where the swell meets the foot
  const ph = o.phase ?? 0;
  g.save();
  for (let i = 0; i < 9; i++) {
    const xx = fx - 30 + i * 9 + Math.sin(ph * 1.7 + i) * 3, ww = 6 + ((i * 7) % 5) * 2;
    g.fillStyle = C.foam + (0.35 + 0.25 * Math.sin(ph * 2 + i * 1.3) ** 2) + ')';
    g.beginPath(); g.ellipse(xx, Y + 1 + (i % 2), ww, 1.8, 0, 0, TAU); g.fill();
  }
  g.restore();
}

/** A stone tower whose top edge is at (edge, top), standing on the ground
    at Y: dressed stone courses, a corbelled parapet with battlements, arrow
    slits and a door, a soft shadow at its foot. */
export function tower(g, edge, top, Y, width) {
  const C = tones(), E = C.E, x0 = edge - width, H = Y - top;
  softShadow(g, x0 + width * 0.6, Y + 1, width * 0.9, 5, 0.9);
  stone(g, x0, top, width, H, { course: clamp(H / 26, 7, 13), seed: 11, color: E.night ? '#6e6268' : '#c4b6aa' });
  g.save();
  // a corbelled string course under the parapet
  g.fillStyle = E.night ? '#7d7076' : '#d3c6ba'; g.fillRect(x0 - 3, top - 1, width + 6, 5);
  g.fillStyle = withAlpha('#000000', 0.25); g.fillRect(x0 - 3, top + 4, width + 6, 2);
  // the battlements (the walkway is at `top`, the merlons stand above it)
  const merlon = Math.max(6, width / 7);
  for (let x = x0 - 3; x < edge - merlon * 1.5; x += merlon * 2) {
    const mg = g.createLinearGradient(x, 0, x + merlon, 0); mg.addColorStop(0, E.night ? '#8a7d83' : '#d6cabe'); mg.addColorStop(1, E.night ? '#5c5157' : '#a3968b');
    g.fillStyle = mg; g.fillRect(x, top - merlon * 1.1, merlon, merlon * 1.1);
    g.fillStyle = withAlpha('#ffffff', 0.18); g.fillRect(x, top - merlon * 1.1, merlon, 1.5);
  }
  // arrow slits down the face, and a door at the foot
  const slit = Math.max(8, Math.min(18, H * 0.05));
  for (let y = top + H * 0.18; y < Y - H * 0.25; y += Math.max(40, H * 0.22)) {
    g.fillStyle = E.night ? '#120d0f' : '#3a302c'; g.fillRect(x0 + width * 0.5 - 1.5, y, 3, slit);
    g.fillStyle = withAlpha('#ffffff', 0.15); g.fillRect(x0 + width * 0.5 - 3, y + slit, 6, 1.5);
  }
  const dw = Math.min(width * 0.4, 16), dh = Math.min(H * 0.12, dw * 1.7), dx = x0 + width * 0.5 - dw / 2;
  g.fillStyle = C.timberLo; g.beginPath(); g.moveTo(dx, Y); g.lineTo(dx, Y - dh + dw / 2); g.arc(dx + dw / 2, Y - dh + dw / 2, dw / 2, Math.PI, 0); g.lineTo(dx + dw, Y); g.closePath(); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; g.beginPath(); g.moveTo(dx + dw / 2, Y - dh); g.lineTo(dx + dw / 2, Y); g.stroke();
  // the shaded side away from the light
  g.fillStyle = withAlpha('#000000', 0.16); g.fillRect(edge - width * 0.18, top, width * 0.18, H);
  g.restore();
}

/** A stone arch bridge whose deck ends at (edge, top), over water at Y,
    reaching back to x0: piers standing in the river with cutwaters, arches
    with voussoirs, a string course, and a parapet with coping and lamps. */
export function bridge(g, x0, edge, top, Y, o = {}) {
  const C = tones(), E = C.E, H = Math.max(10, Y - top);
  const d = clamp(H * 0.12, 8, 16), pw = clamp(H * 0.24, 14, 40), span = clamp(H * 1.15, 60, 240);
  const spring = top + d + (H - d) * 0.42, rise = spring - (top + d + 5);
  // the piers, right to left from the end of the deck
  const piers = []; for (let x = edge - pw; x > x0 - span; x -= pw + span) piers.push(x);
  const arches = piers.map((p) => ({ a: p - span, b: p })).filter((q) => q.b > x0);
  const wall = () => {
    g.beginPath(); g.rect(x0, top, edge - x0, H + 6);
    for (const q of arches) { const cx = (q.a + q.b) / 2; g.moveTo(q.a, Y + 6); g.lineTo(q.a, spring); g.ellipse(cx, spring, span / 2, rise, 0, Math.PI, 0, false); g.lineTo(q.b, Y + 6); g.closePath(); }
  };
  g.save();
  // the shadow under each arch on the water
  for (const q of arches) { g.fillStyle = withAlpha('#000000', 0.25); g.fillRect(q.a, Y, span, 6); }
  wall(); g.clip('evenodd');
  stone(g, x0, top, edge - x0, H + 6, { course: clamp(H / 16, 7, 12), seed: 23, color: E.night ? '#6c6064' : '#c1b2a3' });
  // wet stone near the water
  const wet = g.createLinearGradient(0, Y - 14, 0, Y + 6); wet.addColorStop(0, withAlpha('#1f2a26', 0)); wet.addColorStop(1, withAlpha('#1f2a26', 0.55));
  g.fillStyle = wet; g.fillRect(x0, Y - 14, edge - x0, 20);
  g.restore();
  // the voussoirs round each arch
  g.save();
  for (const q of arches) {
    const cx = (q.a + q.b) / 2, vt = clamp(rise * 0.22, 6, 14);
    g.fillStyle = withAlpha(E.night ? '#857880' : '#d9cdbf', 0.85);
    g.beginPath(); g.ellipse(cx, spring, span / 2 + vt, rise + vt, 0, Math.PI, 0, false); g.ellipse(cx, spring, span / 2, rise, 0, 0, Math.PI, true); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; g.beginPath();
    for (let i = 1; i < 14; i++) { const a = Math.PI + (i / 14) * Math.PI; g.moveTo(cx + Math.cos(a) * span / 2, spring + Math.sin(a) * rise); g.lineTo(cx + Math.cos(a) * (span / 2 + vt), spring + Math.sin(a) * (rise + vt)); }
    g.stroke();
    g.beginPath(); g.ellipse(cx, spring, span / 2, rise, 0, Math.PI, 0, false); g.stroke();
    // inside the arch, the barrel in shadow
    g.fillStyle = withAlpha('#000000', 0.22); g.beginPath(); g.ellipse(cx, spring, span / 2, rise, 0, Math.PI, 0, false); g.lineTo(q.b, spring + 4); g.lineTo(q.a, spring + 4); g.closePath(); g.fill();
  }
  // the cutwaters at the pier feet
  for (const p of piers) if (p + pw > x0) {
    g.fillStyle = E.night ? '#5a4f54' : '#a89a8e'; g.beginPath(); g.moveTo(p - 4, Y + 4); g.lineTo(p - 4, Y - 12); g.lineTo(p + pw / 2, Y - 20); g.lineTo(p + pw + 4, Y - 12); g.lineTo(p + pw + 4, Y + 4); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.25); g.stroke();
    g.fillStyle = C.foam + '0.45)'; g.beginPath(); g.ellipse(p + pw / 2, Y + 1, pw * 0.7, 2, 0, 0, TAU); g.fill();
  }
  // the string course along the deck
  g.fillStyle = E.night ? '#8a7d83' : '#d8ccbf'; g.fillRect(x0, top + d - 4, edge - x0 + 3, 5);
  g.fillStyle = withAlpha('#000000', 0.3); g.fillRect(x0, top + d + 1, edge - x0 + 3, 2);
  // the parapet, its coping, and lamps along it
  const ph = clamp(H * 0.1, 12, 22);
  stone(g, x0, top - ph, edge - x0 - 2, ph, { course: ph / 2, seed: 29, color: E.night ? '#74686e' : '#c9bbad' });
  g.fillStyle = E.night ? '#93868c' : '#e2d7cb'; g.fillRect(x0, top - ph - 4, edge - x0 + 1, 5);
  g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(x0, top - ph + 1, edge - x0 + 1, 1.5);
  for (let x = edge - 70; x > x0 + 10; x -= 150) {
    g.fillStyle = '#2b2628'; g.fillRect(x - 1.5, top - ph - 34, 3, 30);
    g.fillRect(x - 5, top - ph - 42, 10, 3); g.fillRect(x - 4, top - ph - 34, 8, 2);
    g.fillStyle = withAlpha(E.window, E.night ? 0.95 : 0.6); g.fillRect(x - 3.5, top - ph - 39, 7, 5);
    if (E.night) { const gl = g.createRadialGradient(x, top - ph - 36, 0, x, top - ph - 36, 26); gl.addColorStop(0, withAlpha(E.window, 0.35)); gl.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = gl; g.fillRect(x - 26, top - ph - 62, 52, 52); }
  }
  g.restore();
}

/** A well cut away: level ground at y = top over layers of earth — topsoil
    with roots, clay, gravel, bedrock — and the stone-lined shaft down to its
    water at Y, centred on cx and `half` wide each side. Above the ground, the
    well head: two low stone walls and timber posts, a winch with its rope
    and bucket, and a shingled roof, the posts tall enough that the drum
    clears a stone thrown up `o.rise` px; past MAX_FRAME, one post and its
    crank, so nothing stands in the stone's way. */
export function well(g, x0, x1, cx, half, top, Y, bottom, o = {}) {
  const C = tones(), E = C.E, r = rng(o.seed ?? 37), lt = clamp(half * 0.5, 8, 14);
  const D = Math.max(1, Y - top), L = cx - half - lt, R = cx + half + lt;
  g.save();
  // the layers of earth, wavy where they meet
  const bands = [[0, Math.min(0.14 * D, 34), C.soil], [Math.min(0.14 * D, 34), 0.45 * D, C.clay], [0.45 * D, 0.72 * D, C.gravel], [0.72 * D, bottom - top + 10, C.bed]];
  const edges = bands.map(([a], i) => wavy(x0, x1, top + a, i ? 3 : 0, r, 30));
  edges.push(wavy(x0, x1, bottom + 10, 0, r, 30));
  bands.forEach(([a, , col], i) => {
    g.fillStyle = col; g.beginPath(); path(g, edges[i]); for (const p of [...edges[i + 1]].reverse()) g.lineTo(p.x, p.y); g.closePath(); g.fill();
    if (i) { g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1.2; g.beginPath(); path(g, edges[i]); g.stroke(); }
  });
  // texture: roots in the topsoil, specks in the clay, pebbles in the gravel, cracks in the rock
  const sideOf = (x) => x < L - 2 || x > R + 2;
  g.strokeStyle = withAlpha(C.n ? '#7a6250' : '#3b2a20', 0.7); g.lineWidth = 1; g.beginPath();
  for (let x = x0 + r() * 30; x < x1; x += 22 + r() * 40) if (sideOf(x)) { g.moveTo(x, top + 4); g.bezierCurveTo(x + 4, top + 10, x - 5, top + 16, x + (r() - 0.5) * 10, top + Math.min(30, bands[0][1]) * (0.6 + r() * 0.4)); }
  g.stroke();
  const nP = Math.min(500, ((x1 - x0) * D) / 300);
  for (let i = 0; i < nP; i++) {
    const x = x0 + r() * (x1 - x0), dd = bands[1][0] + r() * (bottom - top - bands[1][0]);
    if (!sideOf(x)) continue;
    if (dd < bands[2][0]) { g.fillStyle = withAlpha(r() < 0.5 ? '#000000' : '#ffffff', 0.12); g.fillRect(x, top + dd, 2, 1.5); }
    else if (dd < bands[3][0]) rock(g, x, top + dd, 1.5 + r() * 3, 200 + i, C.n ? '#7e7674' : '#b8afa4', C.n ? '#3e3836' : '#6d655c');
    else if (r() < 0.25) { g.strokeStyle = withAlpha('#000000', 0.3); g.beginPath(); g.moveTo(x, top + dd); g.lineTo(x + 6 * (r() - 0.5), top + dd + 10); g.lineTo(x + 6 * (r() - 0.5), top + dd + 18); g.stroke(); }
  }
  // damp ground over the water: the water table, darker, seeping
  const dp = g.createLinearGradient(0, Y - Math.min(60, D * 0.3), 0, Y + 8);
  dp.addColorStop(0, withAlpha('#0d1a1e', 0)); dp.addColorStop(1, withAlpha('#0d1a1e', 0.45));
  g.fillStyle = dp; g.fillRect(x0, Y - Math.min(60, D * 0.3), x1 - x0, Math.min(60, D * 0.3) + 8);
  g.fillStyle = withAlpha('#0d1a1e', 0.4); g.fillRect(x0, Y + 8, x1 - x0, bottom - Y);
  // a few big stones buried in the clay and the rock
  for (let i = 0; i < (x1 - x0) / 110; i++) {
    const x = x0 + r() * (x1 - x0), dd = bands[1][0] + 10 + r() * (D - bands[1][0]);
    if (sideOf(x - 14) && sideOf(x + 14)) rock(g, x, top + dd, 5 + r() * 8, 300 + i, C.n ? '#7a7270' : '#b3aa9f', C.n ? '#3a3433' : '#6a6259');
  }
  // the turf at the surface, both sides of the well
  grass(g, x0, L - 6, top, top + 6, { seed: 8 }); grass(g, R + 6, x1, top, top + 6, { seed: 9 });
  // the shaft: dark, deepening, its round wall shaded at the sides
  const sg = g.createLinearGradient(0, top, 0, Y);
  sg.addColorStop(0, C.n ? '#2a2326' : '#5c524b'); sg.addColorStop(1, C.n ? '#0b090a' : '#1c1816');
  g.fillStyle = sg; g.fillRect(cx - half, top, half * 2, D);
  const cyl = g.createLinearGradient(cx - half, 0, cx + half, 0);
  cyl.addColorStop(0, withAlpha('#000000', 0.45)); cyl.addColorStop(0.4, withAlpha('#000000', 0)); cyl.addColorStop(1, withAlpha('#000000', 0.5));
  g.fillStyle = cyl; g.fillRect(cx - half, top, half * 2, D);
  // the far wall's courses, curving with the round shaft
  g.strokeStyle = withAlpha('#ffffff', C.n ? 0.05 : 0.09); g.lineWidth = 1; g.beginPath();
  for (let y = top + 8; y < Y - 4; y += 8) { g.moveTo(cx - half, y); g.quadraticCurveTo(cx, y + 3, cx + half, y); }
  g.stroke();
  // the water at the bottom: dark, with the sky's disc on it
  const wg = g.createLinearGradient(0, Y, 0, bottom);
  wg.addColorStop(0, C.n ? '#22343c' : '#4c6874'); wg.addColorStop(1, C.n ? '#0d1519' : '#22343b');
  g.fillStyle = wg; g.fillRect(cx - half, Y, half * 2, bottom - Y);
  g.fillStyle = withAlpha(E.skyBottom, 0.45); g.beginPath(); g.ellipse(cx, Y + 2, half * 0.6, 2, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - half + 2, Y + 0.5); g.lineTo(cx + half - 2, Y + 0.5); g.stroke();
  // the lining, both sides, with moss near the water
  for (const x of [L, cx + half]) {
    stone(g, x, top, lt, bottom - top, { course: 8, seed: 31 + x, color: E.night ? '#6e6268' : '#b9ab9e' });
    const mg = g.createLinearGradient(0, Y - 30, 0, Y + 4); mg.addColorStop(0, withAlpha('#3d5236', 0)); mg.addColorStop(1, withAlpha('#3d5236', 0.7));
    g.fillStyle = mg; g.fillRect(x, Y - 30, lt, bottom - Y + 30);
  }
  // the well head: low stone walls each side of the mouth
  const fr = wellFrame(D, o.rise ?? 0), hw = fr.hw;
  for (const [a, b] of [[L - 6, cx - half], [cx + half, R + 6]]) {
    stone(g, a, top - hw, b - a, hw, { course: hw / 3, seed: 43 + a, color: E.night ? '#7a6d73' : '#cbbdb0' });
    g.fillStyle = E.night ? '#93868c' : '#e3d8cc'; g.fillRect(a - 2, top - hw - 3, b - a + 4, 4);
  }
  softShadow(g, cx, top + 1, (R - L) * 0.8, 4, 0.6);
  // a post-and-rail fence along the field behind, on the right
  g.fillStyle = C.timberLo;
  for (let x = R + 70; x < x1; x += 46) { g.fillRect(x, top - 26, 4, 26); }
  g.fillStyle = C.timber; g.fillRect(R + 68, top - 22, x1 - R - 68, 3); g.fillRect(R + 68, top - 12, x1 - R - 68, 3);
  for (let x = R + 40 + r() * 60; x < x1; x += 140 + r() * 120) { g.fillStyle = E.grassAlt; g.beginPath(); g.ellipse(x, top - 6, 14, 9, 0, Math.PI, 0); g.fill(); g.fillStyle = withAlpha(E.grass, 0.8); g.beginPath(); g.ellipse(x - 3, top - 9, 8, 5, 0, Math.PI, 0); g.fill(); }
  // the winch frame
  const ph = fr.full ? fr.ph : clamp(hw * 2.8, 44, 74), py = top - hw - 3, postW = 5;
  const post = (x) => { const pg = g.createLinearGradient(x, 0, x + postW, 0); pg.addColorStop(0, C.timber); pg.addColorStop(1, C.timberLo); g.fillStyle = pg; g.fillRect(x, py - ph, postW, ph); };
  if (fr.full) {
    post(L - 2); post(R - postW + 2);
    const dy = py - ph * 0.55;
    // the drum, with the rope wound on it, and its crank
    const dg = g.createLinearGradient(0, dy - 5, 0, dy + 5); dg.addColorStop(0, C.timber); dg.addColorStop(0.5, '#b39270'); dg.addColorStop(1, C.timberLo);
    g.fillStyle = dg; g.fillRect(L + 3, dy - 5, R - L - 6, 10);
    g.strokeStyle = withAlpha(C.n ? '#d8c9a8' : '#7b6646', 0.9); g.lineWidth = 1; g.beginPath();
    for (let x = cx - half * 0.3; x < cx + half * 0.8; x += 2.5) { g.moveTo(x, dy - 5); g.lineTo(x + 1.5, dy + 5); }
    g.stroke();
    g.strokeStyle = '#2b2628'; g.lineWidth = 2; g.beginPath(); g.moveTo(R + 2, dy); g.lineTo(R + 10, dy); g.lineTo(R + 10, dy + 9); g.stroke();
    // the rope down to the bucket resting on the right-hand wall
    const bx = cx + half + lt * 0.5 + 3, by = top - hw - 3;
    g.strokeStyle = C.n ? '#cbbd9e' : '#8a7452'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx + half * 0.8, dy + 5); g.lineTo(bx, by - 11); g.stroke();
    const bw = 9; g.fillStyle = C.timberLo; g.beginPath(); g.moveTo(bx - bw / 2, by - 9); g.lineTo(bx + bw / 2, by - 9); g.lineTo(bx + bw * 0.4, by); g.lineTo(bx - bw * 0.4, by); g.closePath(); g.fill();
    g.strokeStyle = '#2b2628'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx - bw / 2, by - 6); g.lineTo(bx + bw / 2, by - 6); g.moveTo(bx - bw / 2, by - 9); g.quadraticCurveTo(bx, by - 15, bx + bw / 2, by - 9); g.stroke();
    // the roof: a gable of shingles over the posts
    const ry = py - ph, ov = 14, rh = clamp(ph * 0.45, 18, 32);
    g.fillStyle = C.roofLo; g.beginPath(); g.moveTo(L - ov, ry + 2); g.lineTo(cx, ry - rh); g.lineTo(R + ov, ry + 2); g.closePath(); g.fill();
    const rg = g.createLinearGradient(L - ov, 0, R + ov, 0); rg.addColorStop(0, C.roof); rg.addColorStop(1, C.roofLo);
    g.fillStyle = rg; g.beginPath(); g.moveTo(L - ov, ry); g.lineTo(cx, ry - rh); g.lineTo(R + ov, ry); g.lineTo(R + ov - 2, ry + 3); g.lineTo(cx, ry - rh + 4); g.lineTo(L - ov + 2, ry + 3); g.closePath(); g.fill();
    g.save(); g.beginPath(); g.moveTo(L - ov, ry); g.lineTo(cx, ry - rh); g.lineTo(R + ov, ry); g.closePath(); g.clip();
    g.fillStyle = C.roof; g.fill();
    g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; g.beginPath();
    for (let y = ry - rh + 5; y < ry; y += 5) { g.moveTo(L - ov, y); g.lineTo(R + ov, y); for (let x = L - ov + ((y / 5) % 2) * 4; x < R + ov; x += 8) { g.moveTo(x, y - 5); g.lineTo(x, y); } }
    g.stroke();
    g.fillStyle = withAlpha('#ffffff', 0.12); g.beginPath(); g.moveTo(L - ov, ry); g.lineTo(cx, ry - rh); g.lineTo(cx, ry); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = C.timberLo; g.fillRect(L - ov, ry, R - L + ov * 2, 3);
  } else {
    // one post on the left with its crank: the roof would be in the stone's way
    post(L - 2);
    g.strokeStyle = '#2b2628'; g.lineWidth = 2; g.beginPath(); g.moveTo(L - 2, py - ph * 0.55); g.lineTo(L - 10, py - ph * 0.55); g.lineTo(L - 10, py - ph * 0.55 + 9); g.stroke();
    g.fillStyle = C.timberLo; g.beginPath(); g.arc(L + 0.5, py - ph * 0.55, 4, 0, TAU); g.fill();
  }
  g.restore();
}

/** A diving stand whose board tip is at (edge, top), its column on the pool
    deck at x0, over a pool whose water is at Y: a concrete column on a
    plinth, a ladder with handrails up its back, and a springboard on a
    fulcrum with a non-slip top. */
export function divingBoard(g, x0, edge, top, Y, bottom) {
  const C = tones(), E = C.E, len = edge - x0, H = Math.max(10, Y - top);
  const cw = clamp(len * 0.18, 12, 26), bt = clamp(H * 0.03, 4, 7);
  softShadow(g, x0 + cw / 2, Y + 2, cw * 1.4, 4, 0.8);
  g.save();
  // the column and its plinth
  const cg = g.createLinearGradient(x0, 0, x0 + cw, 0); cg.addColorStop(0, C.concrete); cg.addColorStop(1, C.concreteLo);
  g.fillStyle = cg; g.fillRect(x0, top + bt, cw, Y - top - bt);
  g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 1; g.beginPath();
  for (let y = top + bt + 22; y < Y - 6; y += 22) { g.moveTo(x0, y); g.lineTo(x0 + cw, y); }
  g.stroke();
  g.fillStyle = C.concreteLo; g.fillRect(x0 - 4, Y - 6, cw + 8, 6);
  // the head of the stand, and a steel strut out to the fulcrum
  g.fillStyle = C.concrete; g.fillRect(x0 - 6, top + bt, cw + 12, 6);
  const fx = x0 + cw + (len - cw) * 0.32;
  g.strokeStyle = C.steel; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 + cw, top + bt + 22); g.lineTo(fx, top + bt + 3); g.stroke();
  g.fillStyle = '#2b2628'; g.beginPath(); g.arc(fx, top + bt + 2, 3.2, 0, TAU); g.fill();
  // the ladder up the back of the column, its rails rising into handrails
  const lx = x0 - 9;
  g.strokeStyle = C.steel; g.lineWidth = 2; g.beginPath();
  for (const dx of [0, 7]) { g.moveTo(lx + dx, Y); g.lineTo(lx + dx, top - 12); g.quadraticCurveTo(lx + dx, top - 22, lx + dx + 10, top - 22); g.lineTo(x0 + cw + 8, top - 22); g.quadraticCurveTo(x0 + cw + 18, top - 22, x0 + cw + 22, top - 2); }
  g.stroke();
  g.lineWidth = 1.6; g.beginPath(); for (let y = Y - 8; y > top; y -= 8) { g.moveTo(lx, y); g.lineTo(lx + 7, y); } g.stroke();
  // the board: a long cream plank with a rounded tip and a grit strip on top
  const bg = g.createLinearGradient(0, top, 0, top + bt); bg.addColorStop(0, E.night ? '#e6dfd2' : '#fbf7ef'); bg.addColorStop(1, E.night ? '#a59d90' : '#cfc6b6');
  g.fillStyle = bg; g.beginPath(); g.moveTo(x0 - 6, top); g.lineTo(edge - bt / 2, top); g.arc(edge - bt / 2, top + bt / 2, bt / 2, -Math.PI / 2, Math.PI / 2); g.lineTo(x0 - 6, top + bt); g.closePath(); g.fill();
  g.fillStyle = withAlpha(E.night ? '#4f6a73' : '#5e7f8b', 0.85); g.fillRect(x0 + cw, top, len - cw - 6, 1.6);
  g.strokeStyle = withAlpha('#000000', 0.35); g.lineWidth = 1; g.beginPath(); g.moveTo(x0 - 6, top + bt); g.lineTo(edge - bt / 2, top + bt); g.stroke();
  g.restore();
}

/** A hot-air balloon whose basket floor is at (x, y), `s` px to the scale of
    its basket: a striped envelope shaded as a sphere, its skirt, the burner
    with a small flame, the load lines, and a wicker basket with someone in
    it. A soft shadow on the ground at `groundY`, if given. */
export function balloon(g, x, y, s, P, o = {}) {
  const C = tones(), E = C.E;
  const bh = s * 0.36, bw = s * 0.62, mouthY = y - bh - s * 0.55, R = s * 0.92, cy = mouthY - s * 1.25, mw = s * 0.22;
  if (o.groundY != null && o.groundY > y) softShadow(g, x, o.groundY + 1, R * clamp(1.6 - (o.groundY - y) / 400, 0.4, 1.2), 4, 0.6);
  const halfAt = (yy) => (yy <= cy ? Math.sqrt(Math.max(0, R * R - (yy - cy) ** 2)) : R - (R - mw) * ((yy - cy) / (mouthY - cy)) ** 1.5);
  const outline = () => {
    g.beginPath();
    const n = 40;
    for (let i = 0; i <= n; i++) { const yy = cy - R + ((mouthY - (cy - R)) * i) / n; const p = { x: x - halfAt(yy), y: yy }; i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
    for (let i = n; i >= 0; i--) { const yy = cy - R + ((mouthY - (cy - R)) * i) / n; g.lineTo(x + halfAt(yy), yy); }
    g.closePath();
  };
  g.save();
  // the load lines from the skirt to the basket
  g.strokeStyle = E.night ? '#b9ad9c' : '#5e5245'; g.lineWidth = 1;
  g.beginPath(); for (const sx of [-1, -0.35, 0.35, 1]) { g.moveTo(x + sx * mw, mouthY + 2); g.lineTo(x + sx * bw * 0.5, y - bh); } g.stroke();
  // the burner, and its flame
  g.fillStyle = '#3a3438'; g.fillRect(x - s * 0.1, mouthY + s * 0.18, s * 0.2, s * 0.09);
  const fl = g.createRadialGradient(x, mouthY + s * 0.12, 0, x, mouthY + s * 0.12, s * 0.2);
  fl.addColorStop(0, 'rgba(255,248,215,0.95)'); fl.addColorStop(0.5, 'rgba(255,224,150,0.55)'); fl.addColorStop(1, 'rgba(255,224,150,0)');
  g.fillStyle = fl; g.beginPath(); g.ellipse(x, mouthY + s * 0.08, s * 0.08, s * 0.16, 0, 0, TAU); g.fill();
  // the envelope: gores in two colours, a band, shading as a sphere
  outline(); g.save(); g.clip();
  const cols = E.night ? ['#33466e', '#d8cdb5'] : ['#2f4677', '#efe5cd'];
  const N = 10;
  for (let j = 0; j < N; j++) {
    const a0 = -Math.PI / 2 + (j / N) * Math.PI, a1 = -Math.PI / 2 + ((j + 1) / N) * Math.PI;
    g.fillStyle = cols[j % 2]; g.beginPath();
    for (let yy = cy - R; yy <= mouthY; yy += 3) g.lineTo(x + halfAt(yy) * Math.sin(a0), yy);
    for (let yy = mouthY; yy >= cy - R; yy -= 3) g.lineTo(x + halfAt(yy) * Math.sin(a1), yy);
    g.closePath(); g.fill();
  }
  g.fillStyle = E.night ? '#7c3346' : '#8c2f43'; g.fillRect(x - R - 2, cy + R * 0.18, R * 2 + 4, R * 0.16);
  g.fillRect(x - R - 2, mouthY - s * 0.12, R * 2 + 4, s * 0.12);
  const sh = g.createRadialGradient(x - R * 0.4, cy - R * 0.45, R * 0.1, x, cy, R * 1.5);
  sh.addColorStop(0, 'rgba(255,255,255,0.32)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = sh; g.fillRect(x - R - 2, cy - R - 2, R * 2 + 4, mouthY - cy + R + 4);
  g.restore();
  outline(); g.strokeStyle = withAlpha('#000000', 0.45); g.lineWidth = 1.2; g.stroke();
  // the basket: wicker, with a padded rim, and someone in it
  const bx = x - bw / 2, by = y - bh;
  const hr = Math.max(3.5, s * 0.075);
  g.fillStyle = E.night ? '#6c7f9a' : '#5f7392'; g.beginPath(); g.ellipse(x - bw * 0.12, by - hr * 0.2, hr * 1.5, hr * 1.1, 0, Math.PI, 0); g.fill();
  const hg = g.createRadialGradient(x - bw * 0.12 - hr * 0.3, by - hr * 1.9, hr * 0.1, x - bw * 0.12, by - hr * 1.6, hr);
  hg.addColorStop(0, E.night ? '#b08a74' : '#d9a988'); hg.addColorStop(1, E.night ? '#7d6253' : '#b5876a');
  g.fillStyle = hg; g.beginPath(); g.arc(x - bw * 0.12, by - hr * 1.6, hr, 0, TAU); g.fill();
  g.fillStyle = '#3a2c26'; g.beginPath(); g.arc(x - bw * 0.12 - hr * 0.15, by - hr * 1.85, hr * 0.85, Math.PI, Math.PI * 1.95); g.fill();
  const wg = g.createLinearGradient(bx, 0, bx + bw, 0); wg.addColorStop(0, C.wicker); wg.addColorStop(1, C.wickerLo);
  g.fillStyle = wg; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bw, by); g.lineTo(bx + bw * 0.94, y); g.lineTo(bx + bw * 0.06, y); g.closePath(); g.fill();
  g.save(); g.clip();
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1; g.beginPath();
  for (let xx = bx + 2; xx < bx + bw; xx += 3) { g.moveTo(xx, by); g.lineTo(xx, y); }
  g.stroke();
  g.strokeStyle = withAlpha('#ffffff', 0.18); g.beginPath();
  for (let yy = by + 2; yy < y; yy += 3) { g.moveTo(bx, yy); for (let xx = bx; xx < bx + bw; xx += 6) g.quadraticCurveTo(xx + 1.5, yy - 1.2, xx + 3, yy); }
  g.stroke();
  g.restore();
  g.fillStyle = '#3a2a22'; g.fillRect(bx - 1, by - 2, bw + 2, 3.5);
  g.restore();
}

/** The stone: a shaded, slightly irregular pebble, lit from the upper left. */
function pebble(g, x, y, R) {
  const E = env();
  rock(g, x, y, R, 5, E.night ? '#e5ddd2' : '#efe8de', E.night ? '#6a625b' : '#6f675f');
  g.save(); g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, R * 1.02, R * 0.9, 0, 0, TAU); g.stroke(); g.restore();
}

/** A splash that reads: a crown of water thrown up round the entry, droplets
    and spreading rings (effects.splash, enlarged). */
function bigSplash(g, x, y, age, life, size) {
  const u = phaseOf(age, life); if (u == null) return;
  splash(g, x, y, age, life, { size });
  const rise = Math.sin(Math.PI * Math.min(1, u * 1.4)), a = 0.85 * (1 - u * 0.8);
  g.save();
  g.fillStyle = `rgba(232,243,248,${a})`;
  for (let i = 0; i < 9; i++) {
    const s = (i / 8 - 0.5) * 2, bx = x + s * 12 * size * (0.6 + u * 0.6), hh = (16 + (1 - Math.abs(s)) * 22) * size * rise;
    g.beginPath(); g.moveTo(bx - 3 * size, y); g.quadraticCurveTo(bx + s * 4 * size, y - hh * 0.6, bx + s * 7 * size, y - hh);
    g.quadraticCurveTo(bx + s * 2 * size, y - hh * 0.5, bx + 3 * size, y); g.closePath(); g.fill();
    g.beginPath(); g.arc(bx + s * 8 * size, y - hh - 3 * size, 1.8 * size, 0, TAU); g.fill();
  }
  g.fillStyle = `rgba(255,255,255,${0.55 * (1 - u)})`; g.beginPath(); g.ellipse(x, y, 16 * size * (0.5 + u), 3 * size, 0, 0, TAU); g.fill();
  g.restore();
}


/* ── the frame ────────────────────────────────────────────────────────── */
/** Fit a side-on box as large as it goes on the canvas while `ok(fit)` says
    the HUD in the top-left is clear of what matters. On a laptop the
    motion may use the whole width (the HUD only covers the top-left corner),
    or the strip right of the HUD, or the band under it: the largest that is
    clear wins. On a phone, the canvas under the top bar. */
export function fitClear(box, w, h, phone, sky, ok, bottomPad = 50) {
  const bottom = h - bottomPad;
  if (phone) return fitSide(box, { left: 10, right: w - 10, top: 70, bottom }, { sky });
  const tries = [];
  for (let s = 0; s <= 1.0001; s += 0.125) tries.push({ left: 14 + s * (HUD + 6), right: w - 14, top: 54, bottom });
  tries.push({ left: 14, right: w - 14, top: Math.min(HUD_H, h - 220), bottom });
  let best = null;
  for (const a of tries) {
    const fs = fitSide(box, a, { sky });
    if (!(fs.k > 0)) continue;
    if ((ok(fs) || a.left > HUD) && (!best || fs.k > best.k + 1e-9)) best = fs;
  }
  return best;
}

/* ── the stage ───────────────────────────────────────────────────────── */
export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || !f.place) return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const H0 = f.params.h, place = f.place, phone = w < 520;
  const wet = ['cliff', 'bridge', 'board', 'well'].includes(place);
  const apex = f.uy > 0 ? f.apexHeight : H0;
  const v0 = f.vel(0), aim = (Math.atan2(v0.y, v0.x) * 180) / Math.PI;

  // ── the whole path, sampled from the engine
  const n = 160, pts = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pts.push({ t: tt, ...f.pos(tt) }); }
  const xMax = Math.max(0, ...pts.map((p) => p.x));
  const lift = place === 'balloon' ? Math.max(H0, H0 + f.uy * f.tMax) : 0;   // the basket at the end
  const yTop = Math.max(apex, H0, lift);

  // ── the frame: the motion and the room the place's own pieces need, fitted
  // with one scale both ways; the ground comes up to meet a wide, low flight
  const pads = (k) => {
    const TH = Math.max(THROWER_MIN, Math.min(96, 1.75 * k));
    const bs = Math.max(26, 7.5 * k);
    if (place === 'balloon') return { l: bs * 0.95 + 70, r: bs * 0.95 + 70, t: bs * 2.95 + 12 };
    if (place === 'well') { const rise = Math.max(0, apex - H0) * k; return { l: 40 + TH * 0.6 + 60, r: 120, t: Math.max(40, wellFrame(H0 * k, rise).up + 16 - rise) }; }
    if (place === 'board') return { l: clamp(Math.max(TH * 1.5, H0 * k * 0.5), 70, 160) + 80, r: f.vertical ? 120 : 92, t: Math.max(34, TH + 14 - (yTop - H0) * k) };
    const head = TH + 14 - (yTop - H0) * k;      // the thrower's head above the place
    return { l: TH * 0.9 + 70, r: f.vertical ? 120 : 92, t: Math.max(place === 'bridge' ? 80 : place === 'tower' ? 50 : 34, head) };
  };
  // what must stay clear of the HUD in the top-left: the path, the top of the
  // place and of the thrower, and the height's label beside the place
  const clear = (fs, p) => {
    const inHud = (x, y) => x < HUD + 8 && y < HUD_H + 8;
    if (pts.some((q) => inHud(fs.X(q.x) + 8, fs.Y(q.y)))) return false;
    return !inHud(fs.X(0) - p.l + 20, (fs.Y(0) + fs.Y(H0)) / 2) && !inHud(fs.X(0), fs.Y(yTop) - p.t + 10);
  };
  let F = null;
  for (let it = 0, k = 4; it < 4; it++) {
    const p = pads(k), box = { xLo: -p.l / k, xHi: xMax + p.r / k, yLo: 0, yHi: yTop + p.t / k };
    F = fitClear(box, w, h, phone, place === 'balloon' ? 0.2 : phone ? 0.5 : 0.35, (fs) => clear(fs, p));
    if (!F) return null;
    k = F.k;
  }
  const { k, X, Y } = F, oy = Y(0), x0 = X(0), top = Y(H0);
  const TH = Math.max(phone ? THROWER_MIN * 0.8 : THROWER_MIN, Math.min(96, 1.75 * k));
  const phase = t * 1.3;
  let sx = null, poolX = null;        // where the diving stand's column is, and the pool's edge

  // ── the place
  if (place === 'cliff') {
    seaScene(g, w, h, oy - clamp((oy - 40) * 0.2, 26, 90), phase);
    seaCliff(g, -4, x0, top, oy, { phase });
  } else if (place === 'bridge') {
    riverScene(g, w, h, oy - clamp((oy - 40) * 0.16, 22, 70), phase);
    bridge(g, -4, x0, top, oy);
  } else if (place === 'board') {
    const len = clamp(Math.max(TH * 1.5, (oy - top) * 0.5), 70, 160);
    sx = x0 - len;
    poolX = sx + clamp(len * 0.18, 12, 26) + 10;
    poolScene(g, w, h, oy - clamp((oy - 40) * 0.18, 26, 80), poolX, phase);
    divingBoard(g, sx, x0, top, oy, h);
  } else if (place === 'well') {
    skyscape(g, 0, 0, w, top, { far: 'trees', seed: 14 });
    well(g, -4, w + 4, x0 + 3.5, WELL, top, oy, h, { rise: Math.max(0, apex - H0) * k });
  } else if (place === 'balloon') {
    fields(g, w, oy - clamp((oy - 40) * 0.3, 30, 130), oy);
    grass(g, 0, w, oy, h);
  } else {
    fields(g, w, oy - clamp((oy - 40) * 0.25, 30, 110), oy);
    grass(g, 0, w, oy, h);
    const tw = clamp(H0 * 0.22 * k, 34, 80);
    curtainWall(g, -4, x0 - tw + 2, oy - clamp((oy - top) * 0.28, 30, 110), oy);
    for (const [dx, s] of [[60, 1], [104, 0.75], [150, 0.9], [-tw - 26, 0.8]]) if (x0 + dx < w - 10 && x0 + dx > 0) tree(g, x0 + dx, oy, clamp((oy - top) * 0.16, 26, 60) * s);
    tower(g, x0, top, oy, tw);
  }

  // ── who throws: at the edge, wound up before the throw, through after it
  const pose = fired ? clamp(0.55 + t / Math.max(1e-6, 0.08 * f.tMax), 0, 1) : 0;
  const feet = place === 'well' ? x0 - WELL - 13 - 10 - TH * 0.18 : x0 - TH * 0.2;
  let bs = 0;
  if (place === 'balloon') {
    bs = Math.max(26, 7.5 * k);
    balloon(g, x0 + bs * 0.12, Y(f.carrier ? f.carrier(t) : H0), bs, P, { groundY: oy });
  } else thrower(g, feet, top, TH, P, { dir: 1, pose, aim: place === 'well' ? -30 : aim });

  // ── the height it starts at, as a dimension line beside the place
  const dx = place === 'balloon' ? x0 - bs * 0.95 - 16 : place === 'well' ? feet - TH * 0.35 - 14 : place === 'board' ? sx - 26 : feet - TH * 0.3 - 14;
  stroke(g, [{ x: dx, y: oy }, { x: dx, y: top }], { color: P.ink, width: 1.4, alpha: 0.9 });
  for (const yy of [oy, top]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.4, alpha: 0.9 });
  L.add(T`${sig3(H0)} [m]`, dx - 8, (oy + top) / 2, { color: P.ink, align: 'right', pri: 7, size: 15, weight: 700 });
  if (place === 'balloon') L.add('where it was let go', dx - 8, top - 2, { color: P.ink, align: 'right', pri: 4, size: 13 });

  // keep labels off the path and the ruler
  const side = f.vertical ? 7 : 0;
  const at = (p) => ({ x: X(p.x) + (f.vertical && p.t > f.tApex ? side : 0), y: Y(p.y) });
  for (let i = 0; i < pts.length; i += 4) { const q = at(pts[i]); L.reserve({ x: q.x - 5, y: q.y - 5, w: 10, h: 10 }); }
  if (!phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H - 40 }); L.reserve({ x: w - 130, y: 0, w: 130, h: 56 }); }

  // ── a height the paper asks about: a marker line across, ringed where crossed
  const lv = f.level;
  if (lv) {
    const ly = Y(lv.L), xr = Math.min(w - 10, X(xMax) + 40);
    stroke(g, [{ x: x0 - 10, y: ly }, { x: xr, y: ly }], { color: P.mark, width: 1.6, alpha: 0.9 });
    L.add(Math.abs(lv.rel) < 1e-12 ? 'the height it started at' : T`${sig3(Math.abs(lv.rel))} [m] ${lv.rel >= 0 ? '"above"' : '"below"'} "the start"`, xr, ly - 14, { color: P.mark, align: 'right', pri: 6, size: 13, weight: 700 });
    for (const tc of lv.times) {
      if (t < tc - 1e-9) continue;
      const q = at({ t: tc, ...f.pos(tc) });
      dot(g, q.x, q.y, 7, { stroke: P.mark, width: 2.4 });
      L.add(T`t = ${sig3(tc)} [s]`, q.x + 12, q.y + (f.pos(tc).x < 0.5 ? 18 : -16), { color: P.mark, align: 'left', pri: 8, size: 14, weight: 700 });
    }
  }

  // ── the path: all of it faintly, the part flown strongly. Straight up and
  // down, the way up and the way down are drawn side by side so both show.
  stroke(g, pts.map(at), { color: P.vel, width: 1.8, alpha: 0.35 });
  stroke(g, pts.filter((p) => p.t <= t).map(at), { color: P.vel, width: 3 });

  // ── the top of its path, when asked
  if (show.apex && f.uy > 0) {
    const q = at({ t: f.tApex, ...f.pos(f.tApex) });
    dot(g, q.x, q.y, 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H_max = ${sig3(apex)} [m]`, q.x + 12, q.y - 14, { color: P.disp, align: 'left', pri: 6, size: 14, weight: 700 });
  }

  // ── where it lands, once it has: a splash or a puff of dust, and how far out
  const landed = t >= f.tMax - 1e-9;
  const lx = X(f.pos(f.tMax).x) + (f.vertical ? side : 0);
  if (landed) {
    const { age, life } = ageOf(t, f.tMax, f.tMax, Math.max(0.35, f.tMax / 6));
    if (wet) bigSplash(g, lx, oy, age, life, place === 'well' ? 0.8 : clamp(k / 5, 1.5, 2.6));
    else dust(g, lx, oy, age, life, { size: 1.6, n: 22 });
    if (!f.vertical) {
      const ry = oy + 24;
      stroke(g, [{ x: x0, y: ry }, { x: lx, y: ry }], { color: P.ink, width: 1.4, alpha: 0.9 });
      for (const xx of [x0, lx]) stroke(g, [{ x: xx, y: ry - 5 }, { x: xx, y: ry + 5 }], { color: P.ink, width: 1.4, alpha: 0.9 });
      L.add(T`${sig3(f.pos(f.tMax).x)} [m]`, (x0 + lx) / 2, ry + 15, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700 });
    }
  }

  // ── the stone, its velocity and its acceleration
  const r = f.pos(t), v = f.vel(t);
  const bx = X(r.x) + (f.vertical && t > f.tApex ? side : 0), by = Y(r.y);
  const vMax = Math.max(...pts.map((p) => Math.hypot(f.vel(p.t).x, f.vel(p.t).y)), 1e-6);
  const room = (c, dv, lo, hi) => (dv > 0 ? (hi - c) / dv : dv < 0 ? (lo - c) / dv : Infinity);
  let vl = clamp(w * 0.08, 46, 100) / vMax;
  for (const p of pts) { const vq = f.vel(p.t); vl = Math.min(vl, room(X(p.x), vq.x, 12, w - 12) * 0.9, room(Y(p.y), -vq.y, 12, h - 8) * 0.9); }
  const sp = Math.hypot(v.x, v.y);
  if (show.velocity !== false && sp > 1e-6) {
    const tx = bx + v.x * vl, ty = by - v.y * vl;
    if (show.components && Math.abs(v.x) > 1e-9) {
      arrow(g, bx, by, tx, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, tx, by, tx, ty, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, bx, by, tx, ty, { color: P.velVec, width: 3, head: 12 });
    const segs = show.components ? [[bx, by, tx, ty], [bx, by, tx, by], [tx, by, tx, ty]] : [[bx, by, tx, ty]];
    for (const [ax, ay, ex, ey] of segs) for (let u = 0, m = Math.ceil(Math.hypot(ex - ax, ey - ay) / 10); u <= m; u++) L.reserve({ x: ax + (ex - ax) * u / m - 6, y: ay + (ey - ay) * u / m - 6, w: 12, h: 12 });
    // the label beside the arrow's head, turned back inside the canvas near the right edge
    const near = tx > w - 120, sy = Math.sign(ty - by) || 1;
    L.add(T`${sig3(sp)} [m s^-1]`, near ? tx - 10 : tx + 12, near ? ty + sy * 20 : ty, { color: P.vel, align: near ? 'right' : 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
  if (!(landed && wet)) pebble(g, bx, by, clamp(k * 0.25, 5.5, 8));
  else { const { age, life } = ageOf(t, f.tMax, f.tMax, Math.max(0.35, f.tMax / 6)); if (age < life * 0.2) pebble(g, bx, by + 3, 5.5); }

  // ── what it lands on, named on it, clear of the path and the arrows
  const name = { cliff: 'the sea', bridge: 'the river', board: 'the water', well: 'the water' }[place] || 'the ground';
  if (place === 'well') L.add(name, x0 + 3.5 + WELL + 13 + 10, oy + 2, { color: P.ink, align: 'left', pri: 5, size: 13, maxPush: 40 });
  else if (place === 'cliff' || place === 'bridge') L.add(name, x0 - 12, oy + 20, { color: P.ink, align: 'right', pri: 5, size: 13 });
  else if (place === 'board') L.add(name, poolX + 12, oy - 14, { color: P.ink, align: 'left', pri: 4, size: 13 });
  else L.add(name, w - 14, oy - 14, { color: P.ink, align: 'right', pri: 3, size: 13 });

  L.draw(g, w, h);
  return null;
}
