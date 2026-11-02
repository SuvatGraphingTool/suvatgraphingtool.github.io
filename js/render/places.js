// places.js — more places for the composer to set a motion in, each drawn as
// the place: mountains over a valley, a forest, a harbour with its boats, a
// city's rooftops, the Moon and Mars.
//
// Each is a function `(g, c)` that paints the backdrop and the thing it is
// launched from, where c = { w, h, k, X, Y, oy, x0, top, H0, phase }: the
// launch edge at x0, its top at `top` (H0 m up), what it lands on at oy, k px
// a metre. The composed stage (js/render/composed.js scenery()) calls them by
// the backdrop's name (js/compose/registry.js BACKDROPS). Seeded, so a scene
// draws the same every frame; held to low chroma and away from the physics
// hues, as the rest of the scenery is. Nothing here is a quantity.

import { env, rng, skyscape, grass, water, stone, tarmac, softShadow } from './scenery.js';
import { clamp, withAlpha } from './util.js';
import { tree } from './heights.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

/* ── shared bits ───────────────────────────────────────────────────────── */

/** A night sky with stars (seeded), for the Moon and Mars. */
function starfield(g, w, horizon, seed, tint = '#ffffff') {
  const r = rng(seed);
  const gr = g.createLinearGradient(0, 0, 0, horizon);
  gr.addColorStop(0, '#05060a'); gr.addColorStop(1, '#141722');
  g.fillStyle = gr; g.fillRect(0, 0, w, horizon);
  for (let i = 0; i < (w * horizon) / 900; i++) {
    const s = r() < 0.08 ? 1.6 : 0.9;
    g.fillStyle = withAlpha(tint, 0.35 + r() * 0.6);
    g.fillRect(r() * w, r() * horizon, s, s);
  }
}

/** A rock face from x0 to the edge, its top at `top`, down to Y: layered
    strata, cracks, lit from the left, a grass or dust lip along the top. */
function rockFace(g, x0, edge, top, Y, { seed = 3, light = '#a59a8f', dark = '#6d645d', lip = null } = {}) {
  const r = rng(seed), H = Math.max(1, Y - top);
  const face = [];
  for (let i = 0; i <= 10; i++) face.push({ x: edge + (r() - 0.6) * Math.min(14, H * 0.05) - (i / 10) * Math.min(24, H * 0.08), y: top + (i / 10) * H });
  const gr = g.createLinearGradient(x0, 0, edge, 0);
  gr.addColorStop(0, dark); gr.addColorStop(0.7, light); gr.addColorStop(1, dark);
  g.fillStyle = gr; g.beginPath(); g.moveTo(x0, top);
  for (const p of face) g.lineTo(p.x, p.y);
  g.lineTo(x0, Y); g.closePath(); g.fill();
  g.save(); g.clip();
  g.strokeStyle = withAlpha('#000000', 0.18); g.lineWidth = 1.2;
  for (let y = top + 12; y < Y; y += 10 + r() * 14) { g.beginPath(); g.moveTo(x0, y); for (let x = x0; x < edge; x += 18) g.lineTo(x, y + (r() - 0.5) * 4); g.stroke(); }
  for (let i = 0; i < 8; i++) { const cx = x0 + r() * (edge - x0), cy = top + r() * H; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (r() - 0.5) * 10, cy + 12 + r() * 20); g.stroke(); }
  g.restore();
  if (lip) { g.fillStyle = lip; g.fillRect(x0, top - 3, edge - x0 + 2, 5); }
}

/* ── the places ────────────────────────────────────────────────────────── */

/** Mountains over a valley: snow-capped peaks far off, a pine-dark ridge,
    a rock ledge to launch from, the valley floor below with a stream. */
function mountain(g, { w, h, oy, x0, top, H0 }) {
  const E = env(), r = rng(71), horizon = oy - clamp((oy - 40) * 0.55, 60, 320);
  skyscape(g, 0, 0, w, horizon, { far: 'none', seed: 11, clouds: 3 });
  // far peaks with snow on their tops, misted
  const peaks = [];
  for (let x = -40; x < w + 80; x += 120 + r() * 140) peaks.push({ x, hgt: clamp((horizon) * (0.35 + r() * 0.45), 60, horizon - 20) });
  for (const p of peaks) {
    const base = horizon + 4, px = p.x, py = base - p.hgt, sp = p.hgt * 0.9;
    g.fillStyle = withAlpha(E.night ? '#5d5a6b' : '#9aa3b4', 0.9);
    g.beginPath(); g.moveTo(px - sp, base); g.lineTo(px, py); g.lineTo(px + sp, base); g.closePath(); g.fill();
    g.fillStyle = withAlpha(E.night ? '#d9dbe6' : '#f6f8fb', 0.92);
    g.beginPath(); g.moveTo(px, py); g.lineTo(px - sp * 0.22, py + p.hgt * 0.22); g.lineTo(px - sp * 0.08, py + p.hgt * 0.18);
    g.lineTo(px + sp * 0.05, py + p.hgt * 0.26); g.lineTo(px + sp * 0.22, py + p.hgt * 0.2); g.closePath(); g.fill();
  }
  // a nearer ridge with pines
  g.fillStyle = E.night ? '#2c3329' : '#55684a';
  g.beginPath(); g.moveTo(0, horizon + 10);
  for (let x = 0; x <= w; x += 30) g.lineTo(x, horizon - 30 * Math.sin(x / 140 + 1.3) - 18);
  const band = Math.min(oy, horizon + clamp((oy - horizon) * 0.3, 20, 70));
  g.lineTo(w, band); g.lineTo(0, band); g.closePath(); g.fill();
  // the valley's meadows running down from the ridge's foot to the floor
  const mg = g.createLinearGradient(0, band, 0, oy);
  mg.addColorStop(0, E.night ? '#33402c' : '#6d8a52'); mg.addColorStop(1, E.night ? '#3e4b33' : '#86a062');
  g.fillStyle = mg; g.fillRect(0, band, w, oy - band);
  g.strokeStyle = withAlpha(E.night ? '#1f2a1c' : '#4a5c3c', 0.45); g.lineWidth = 1;
  for (let y = band + 8; y < oy; y += 10 + (y - band) * 0.25) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 40) g.lineTo(x, y + Math.sin(x / 90 + y) * 2); g.stroke(); }
  for (let x = 6; x < w; x += 9 + r() * 10) {
    const by = horizon - 30 * Math.sin(x / 140 + 1.3) - 14, ph = 10 + r() * 14;
    g.fillStyle = E.night ? '#1f2a1c' : '#3f5536';
    g.beginPath(); g.moveTo(x, by - ph); g.lineTo(x - ph * 0.35, by); g.lineTo(x + ph * 0.35, by); g.closePath(); g.fill();
  }
  // the valley floor: meadow, a stream catching the light
  grass(g, 0, w, oy, h, { seed: 9 });
  g.save(); g.strokeStyle = withAlpha(E.night ? '#8fb4c4' : '#b9d9e6', 0.7); g.lineWidth = 3;
  g.beginPath(); g.moveTo(w * 0.55, oy + 6); g.bezierCurveTo(w * 0.7, oy + 20, w * 0.8, oy + 4, w, oy + 16); g.stroke(); g.restore();
  // the ledge it leaves from
  if (H0 > 0) rockFace(g, -4, x0, top, oy, { seed: 23, light: E.night ? '#7c746c' : '#b2a79b', dark: E.night ? '#4b4540' : '#7a7068', lip: E.night ? '#46553a' : '#6f8a52' });
}

/** A forest: layers of trees thinning into mist, a forest floor of leaf
    litter and ferns; from a height, a wooden platform among the trunks. */
function forest(g, { w, h, k, oy, x0, top, H0 }) {
  const E = env(), r = rng(83);
  skyscape(g, 0, 0, w, oy, { far: 'trees', seed: 21, clouds: 2 });
  for (const [depth, a] of [[0.55, 0.5], [0.3, 0.75], [0.12, 1]]) {
    for (let x = r() * 40; x < w; x += 26 + r() * 40) {
      const s = clamp((oy - 40) * (0.35 + depth * 0.6) * (0.7 + r() * 0.5), 30, 260);
      g.save(); g.globalAlpha = a; tree(g, x, oy - depth * 40, s); g.restore();
    }
  }
  // the forest floor: leaf litter over the grass
  grass(g, 0, w, oy, h, { seed: 31 });
  for (let i = 0; i < w / 6; i++) {
    g.fillStyle = withAlpha(r() < 0.5 ? (E.night ? '#5a4632' : '#a2763e') : (E.night ? '#3e4a2e' : '#6e7d42'), 0.75);
    g.beginPath(); g.ellipse(r() * w, oy + 2 + r() * (h - oy), 2.5, 1.2, r() * TAU, 0, TAU); g.fill();
  }
  // ferns at the edge of the path
  for (let x = 20; x < w; x += 60 + r() * 80) for (let j = 0; j < 5; j++) {
    g.strokeStyle = E.night ? '#3a4a2c' : '#5e7a3e'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x, oy + 1); g.quadraticCurveTo(x + (j - 2) * 6, oy - 14, x + (j - 2) * 11, oy - 8 - r() * 6); g.stroke();
  }
  // a platform among the trunks to launch from
  if (H0 > 0) {
    const pw = clamp(2.2 * k, 50, 160), wood = E.night ? '#6e5442' : '#8d6b4a', dark = E.night ? '#43332a' : '#5b432e';
    for (const lx of [x0 - pw + 8, x0 - 10]) { g.fillStyle = dark; g.fillRect(lx, top, 6, oy - top); }
    g.fillStyle = wood; g.fillRect(x0 - pw, top, pw, 7);
    g.fillStyle = withAlpha('#ffffff', E.night ? 0.06 : 0.22); g.fillRect(x0 - pw, top, pw, 1.5);
    g.strokeStyle = dark; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - pw + 11, oy); g.lineTo(x0 - 8, top + 8); g.stroke();
    g.beginPath(); g.moveTo(x0 - 8, oy); g.lineTo(x0 - pw + 11, top + 8); g.stroke();
  }
}

/** A harbour: a stone quay to launch from, the water with its swell, boats
    at their moorings, a breakwater and a lighthouse across the bay. */
function harbour(g, { w, h, k, oy, x0, top, H0, phase }) {
  const E = env(), r = rng(91), horizon = oy - clamp((oy - 40) * 0.2, 26, 110);
  skyscape(g, 0, 0, w, horizon, { far: 'none', seed: 15, clouds: 4 });
  // the breakwater and its lighthouse
  g.fillStyle = E.night ? '#3e3a40' : '#8f8a86'; g.fillRect(w * 0.45, horizon - 8, w * 0.55, 10);
  const lx = w * 0.88, lh = clamp(horizon * 0.25, 24, 70);
  g.fillStyle = E.night ? '#d9d2cc' : '#f2ede6'; g.beginPath(); g.moveTo(lx - 7, horizon - 6); g.lineTo(lx - 4, horizon - 6 - lh); g.lineTo(lx + 4, horizon - 6 - lh); g.lineTo(lx + 7, horizon - 6); g.closePath(); g.fill();
  g.fillStyle = '#b5473f'; g.fillRect(lx - 5, horizon - 6 - lh * 0.55, 10, lh * 0.15);
  g.fillStyle = withAlpha(E.window, E.night ? 1 : 0.7); g.fillRect(lx - 4, horizon - 12 - lh, 8, 6);
  water(g, 0, w, horizon, h, { phase });
  // boats at their moorings, rocking with the swell
  for (const [bx, s] of [[x0 + 0.25 * (w - x0), 1], [x0 + 0.62 * (w - x0), 0.8]]) {
    if (bx > w - 20) continue;
    const L = clamp(5 * k * s, 50, 150), by = horizon + (oy - horizon) * 0.45, rock = Math.sin(phase * 1.4 + bx) * 0.04;
    g.save(); g.translate(bx, by); g.rotate(rock);
    g.fillStyle = E.night ? '#46525e' : '#4f6a82';
    g.beginPath(); g.moveTo(-L / 2, -L * 0.1); g.lineTo(L / 2, -L * 0.14); g.quadraticCurveTo(L * 0.42, L * 0.1, L * 0.3, L * 0.12); g.lineTo(-L * 0.42, L * 0.1); g.closePath(); g.fill();
    g.fillStyle = E.night ? '#d8d2cc' : '#f4f1ec'; g.fillRect(-L * 0.18, -L * 0.28, L * 0.3, L * 0.16);
    g.strokeStyle = E.night ? '#b5aca6' : '#6f6a66'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, -L * 0.28); g.lineTo(0, -L * 0.75); g.stroke();
    g.restore();
  }
  // the quay: dressed stone to the water, a bollard and a ladder
  if (H0 > 0) {
    stone(g, -4, top, x0 + 4, oy - top + 6, { course: clamp(0.4 * k, 7, 14), seed: 41, color: E.night ? '#5d5459' : '#a99c8f' });
    g.fillStyle = E.night ? '#2b2628' : '#3b3436'; g.fillRect(x0 - 22, top - 10, 10, 10);
    g.beginPath(); g.ellipse(x0 - 17, top - 10, 7, 3, 0, 0, TAU); g.fill();
    g.strokeStyle = E.night ? '#8d8a8f' : '#6f6a66'; g.lineWidth = 1.5;
    for (const lx2 of [x0 - 6, x0 - 2]) { g.beginPath(); g.moveTo(lx2, top); g.lineTo(lx2, oy + 6); g.stroke(); }
    for (let y = top + 8; y < oy; y += 9) { g.beginPath(); g.moveTo(x0 - 6, y); g.lineTo(x0 - 2, y); g.stroke(); }
    g.fillStyle = withAlpha('#000000', 0.25); g.fillRect(-4, oy, x0 + 4, 5);
  }
}

/** A city: a skyline of towers with lit windows behind, the office block it
    leaves from (glass in a frame, a parapet on its roof), the street below. */
function city(g, { w, h, k, oy, x0, top, H0 }) {
  const E = env(), r = rng(101);
  skyscape(g, 0, 0, w, oy, { far: 'skyline', seed: 17, clouds: 2, farHeight: clamp((oy - 40) * 0.5, 40, 260) });
  // nearer blocks, darker, with windows
  for (let x = x0 + 30; x < w; x += 40 + r() * 70) {
    const bw = 30 + r() * 50, bh = clamp((oy - 40) * (0.25 + r() * 0.35), 30, oy - 30);
    g.fillStyle = E.night ? '#2a2630' : '#7c7c86'; g.fillRect(x, oy - bh, bw, bh);
    for (let y = oy - bh + 6; y < oy - 8; y += 9) for (let xx = x + 4; xx < x + bw - 6; xx += 8) {
      g.fillStyle = withAlpha(E.night ? E.window : '#c9d6e3', r() < (E.night ? 0.45 : 0.8) ? 0.8 : 0.15); g.fillRect(xx, y, 4, 5);
    }
  }
  tarmac(g, 0, w, oy, { depth: clamp(0.6 * k, 12, 24), verge: false });
  g.fillStyle = E.night ? '#4a4044' : '#b8aeae'; g.fillRect(0, oy + clamp(0.6 * k, 12, 24) + 4, w, h);
  // the block it leaves from
  if (H0 > 0) {
    const bw = clamp(Math.max(10, H0 * 0.35) * k, 90, w * 0.4), bx = x0 - bw;
    const gr = g.createLinearGradient(bx, 0, x0, 0);
    gr.addColorStop(0, E.night ? '#3c4250' : '#8d99a8'); gr.addColorStop(1, E.night ? '#272b35' : '#6b7684');
    g.fillStyle = gr; g.fillRect(bx, top, bw, oy - top);
    const fl = clamp(3.2 * k, 10, 40);
    for (let y = top + fl * 0.4; y < oy - 4; y += fl) {
      g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(bx, y - 2, bw, 2);
      for (let x = bx + 6; x < x0 - 8; x += 14) { g.fillStyle = withAlpha(E.night ? E.window : '#cfe0ef', E.night ? (r() < 0.5 ? 0.85 : 0.2) : 0.75); g.fillRect(x, y + 2, 9, fl * 0.55); }
    }
    g.fillStyle = E.night ? '#4a505e' : '#a6b1bd'; g.fillRect(bx - 2, top - 6, bw + 2, 6);
    softShadow(g, bx + bw / 2, oy + 2, bw * 0.55, 6, 0.8);
  }
}

/** The Moon: a black sky full of stars with the Earth hanging in it, a grey
    regolith plain pocked with craters, boulders, a far crater rim. */
function moon(g, { w, h, k, oy, x0, top, H0 }) {
  const horizon = oy - clamp((oy - 40) * 0.12, 16, 60);
  starfield(g, w, horizon, 5);
  // the Earth, half lit
  const ex = w * 0.78, ey = horizon * 0.28, er = clamp(w * 0.04, 14, 40);
  const eg = g.createRadialGradient(ex - er * 0.4, ey - er * 0.3, er * 0.2, ex, ey, er);
  eg.addColorStop(0, '#9cc7ea'); eg.addColorStop(0.6, '#3f78b4'); eg.addColorStop(1, '#1d3550');
  g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(ex - er * 0.2, ey - er * 0.1, er * 0.5, er * 0.18, -0.3, 0, TAU); g.fill();
  g.fillStyle = 'rgba(5,6,10,0.7)'; g.beginPath(); g.arc(ex + er * 0.35, ey, er, -Math.PI / 2, Math.PI / 2); g.fill();
  regolith(g, w, h, horizon, oy, k, { base: '#8d8a86', dark: '#55534f', light: '#b9b5af', seed: 13 });
  if (H0 > 0) rockFace(g, -4, x0, top, oy, { seed: 29, light: '#a19d97', dark: '#5f5c58' });
}

/** Mars: a butterscotch sky, red dust and rock, a far mesa, small craters. */
function mars(g, { w, h, k, oy, x0, top, H0 }) {
  const horizon = oy - clamp((oy - 40) * 0.18, 20, 90);
  const gr = g.createLinearGradient(0, 0, 0, horizon);
  gr.addColorStop(0, '#5e3a2c'); gr.addColorStop(1, '#c79a6d');
  g.fillStyle = gr; g.fillRect(0, 0, w, horizon);
  // a small pale sun
  g.fillStyle = 'rgba(240,235,220,0.8)'; g.beginPath(); g.arc(w * 0.18, horizon * 0.3, 8, 0, TAU); g.fill();
  // a far mesa
  g.fillStyle = '#8a4f35'; g.beginPath(); g.moveTo(w * 0.5, horizon); g.lineTo(w * 0.56, horizon - 34); g.lineTo(w * 0.8, horizon - 36); g.lineTo(w * 0.86, horizon); g.closePath(); g.fill();
  regolith(g, w, h, horizon, oy, k, { base: '#a85d3a', dark: '#6e3824', light: '#cf8a5e', seed: 19 });
  if (H0 > 0) rockFace(g, -4, x0, top, oy, { seed: 37, light: '#b8704a', dark: '#6e3824' });
}

/** A dusty plain from the horizon down, craters and boulders on it. */
function regolith(g, w, h, horizon, oy, k, { base, dark, light, seed }) {
  const r = rng(seed);
  const gr = g.createLinearGradient(0, horizon, 0, h);
  gr.addColorStop(0, light); gr.addColorStop(0.4, base); gr.addColorStop(1, dark);
  g.fillStyle = gr; g.fillRect(0, horizon, w, h - horizon);
  for (let i = 0; i < 26; i++) {
    const y = lerp(horizon + 4, h, r() ** 0.8), s = lerp(0.3, 1.6, (y - horizon) / Math.max(1, h - horizon));
    const x = r() * w, R = (4 + r() * 18) * s;
    g.fillStyle = withAlpha(dark, 0.55); g.beginPath(); g.ellipse(x, y, R, R * 0.3, 0, 0, TAU); g.fill();
    g.strokeStyle = withAlpha(light, 0.55); g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y - 1, R, R * 0.3, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * w, y = lerp(oy - 2, h, r()), R = 2 + r() * 5;
    softShadow(g, x + R * 0.4, y + 1, R * 1.3, R * 0.35, 0.6);
    g.fillStyle = withAlpha(light, 0.9); g.beginPath(); g.ellipse(x, y - R * 0.4, R, R * 0.7, 0, 0, TAU); g.fill();
  }
}

/** The places this file draws, by the registry's names. */
export const PLACE_ART = { mountain, forest, harbour, city, moon, mars };
