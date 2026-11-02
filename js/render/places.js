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
import { seaCliff } from './heights.js';
import { scree } from './composed.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

/* ── shared bits ───────────────────────────────────────────────────────── */

/** The sky, with its sun (or the moon, at night) placed clear of the place
    it is launched from: over the open side, never sitting on a ledge. */
function sky(g, w, horizon, x0, o = {}) {
  const E = env();
  skyscape(g, 0, 0, w, horizon, { ...o, sun: false });
  const sx = clamp(x0 + (w - x0) * 0.62, w * 0.45, w - 40), sy = clamp(horizon * 0.22, 26, 120), R = clamp(horizon * 0.05, 9, 22);
  const sg = g.createRadialGradient(sx, sy, 0, sx, sy, R * 7);
  sg.addColorStop(0, withAlpha(E.sun, E.night ? 0.18 : 0.35)); sg.addColorStop(1, withAlpha(E.sun, 0));
  g.fillStyle = sg; g.fillRect(sx - R * 7, sy - R * 7, R * 14, R * 14);
  g.fillStyle = withAlpha(E.sun, E.night ? 0.55 : 0.85); g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.fill();
}

/** Whether x is clear of where it lands and of the surface's label: a
    place's props (a cactus, a rock) never stand there. */
const clearOf = (x, c, gap = 60) => !(c.clearX || []).some((cx) => Math.abs(cx - x) < gap);

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

/** A jagged outline from (x, base) up to a summit and down again: a peak. */
function peakPath(r, px, base, hgt, sp) {
  const L = [], R = [], n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n, j = i && i < n ? (r() - 0.5) * hgt * 0.08 : 0;
    L.push({ x: px - sp * (1 - t) + j * 0.6, y: base - hgt * t ** 0.9 + j });
    R.push({ x: px + sp * (1 - t) * (0.85 + r() * 0.3) + j * 0.6, y: base - hgt * t ** 1.05 + Math.abs(j) });
  }
  return { L, R: R.reverse(), top: { x: px, y: base - hgt } };
}

/** A range of peaks along the horizon: each lit on its left face and in
    shadow on its right, a ridge line between, snow down to a ragged line. */
function range(g, w, base, tall, r, { rock, shade, snow, snowShade, haze }) {
  for (let x = -60 + r() * 60; x < w + 80; x += 110 + r() * 150) {
    const hgt = tall * (0.55 + r() * 0.45), sp = hgt * (0.8 + r() * 0.5);
    const p = peakPath(r, x, base, hgt, sp);
    const outline = () => { g.beginPath(); g.moveTo(p.L[0].x, base); for (const q of p.L) g.lineTo(q.x, q.y); for (const q of p.R) g.lineTo(q.x, q.y); g.lineTo(p.R[p.R.length - 1].x, base); g.closePath(); };
    outline(); g.fillStyle = rock; g.fill();
    g.save(); outline(); g.clip();
    // the shadow face: right of a ridge line wandering down from the summit
    const ridge = [p.top];
    for (let i = 1; i <= 5; i++) ridge.push({ x: p.top.x + sp * 0.08 * i + (r() - 0.5) * sp * 0.08, y: p.top.y + hgt * (i / 5) });
    g.fillStyle = shade; g.beginPath(); g.moveTo(p.top.x, p.top.y);
    for (const q of ridge) g.lineTo(q.x, q.y);
    g.lineTo(w + 200, base); g.lineTo(w + 200, p.top.y); g.closePath(); g.fill();
    // gullies down the faces
    g.strokeStyle = withAlpha('#000000', 0.16); g.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const sx = lerp(p.L[2].x, p.R[3].x, r()), sy = p.top.y + hgt * (0.25 + r() * 0.3); g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (r() - 0.5) * 16, sy + hgt * 0.3); g.stroke(); }
    // snow to a ragged line, lit and shaded either side of the ridge
    const sl = p.top.y + hgt * (0.28 + r() * 0.14);
    g.beginPath(); g.moveTo(-10, -10); g.lineTo(w + 200, -10);
    for (let xx = w + 200; xx >= -10; xx -= 7) g.lineTo(xx, sl + Math.sin(xx * 0.31) * 4 + Math.abs(Math.sin(xx * 0.07)) * hgt * 0.1);
    g.closePath(); g.clip();
    outline(); g.fillStyle = snow; g.fill();
    g.fillStyle = snowShade; g.beginPath(); g.moveTo(p.top.x, p.top.y); for (const q of ridge) g.lineTo(q.x, q.y); g.lineTo(w + 200, base); g.lineTo(w + 200, p.top.y); g.closePath(); g.fill();
    g.restore();
    // the ridge line catches the light
    g.strokeStyle = withAlpha('#ffffff', 0.35); g.lineWidth = 1; g.beginPath(); g.moveTo(p.top.x, p.top.y); for (const q of ridge.slice(1, 3)) g.lineTo(q.x, q.y); g.stroke();
  }
  // haze over the range, thicker towards its foot
  if (haze) {
    const hz = g.createLinearGradient(0, base - tall, 0, base);
    hz.addColorStop(0, withAlpha(haze, 0.1)); hz.addColorStop(1, withAlpha(haze, 0.6));
    g.fillStyle = hz; g.fillRect(0, base - tall, w, tall + 2);
  }
}

/** A pine, `s` px tall, standing at (x, Y): tiers of needles, darker below. */
function pine(g, x, Y, s, dark, lit) {
  g.fillStyle = withAlpha('#2b2018', 0.9); g.fillRect(x - s * 0.03, Y - s * 0.18, s * 0.06, s * 0.18);
  for (let i = 0; i < 3; i++) {
    const t = i / 3, yb = Y - s * (0.12 + t * 0.3), hw = s * (0.26 - t * 0.06), ht = s * (0.42 - t * 0.04);
    g.fillStyle = dark; g.beginPath(); g.moveTo(x - hw, yb); g.lineTo(x, yb - ht); g.lineTo(x + hw, yb); g.closePath(); g.fill();
    g.fillStyle = lit; g.beginPath(); g.moveTo(x - hw, yb); g.lineTo(x, yb - ht); g.lineTo(x - hw * 0.1, yb); g.closePath(); g.fill();
  }
}

/** A rock face for a place without turf (the Moon, Mars): the library's own
    cliff, with its strata, cracks and overhang, in the place's rock. */
const rockTones = (hi, mid, lo) => ({ rockHi: hi, rock: mid, rockLo: lo, soil: lo });

/* ── the places ────────────────────────────────────────────────────────── */

/** Mountains over a valley: a far range in haze, a nearer one with snow on
    its tops and pines at its foot, hillsides falling away to the valley
    floor and its stream, and the rock ledge it leaves from. */
function mountain(g, { w, h, k, oy, x0, top, H0 }) {
  const E = env(), n = E.night, r = rng(71), phone = w < 520;
  const horizon = oy - clamp((oy - 40) * 0.5, 70, 300);
  // on a phone the readouts sit over the top of the stage: the peaks stay under them
  const ceil = phone ? Math.min(horizon - 30, 190) : 24, tall = Math.max(30, horizon - ceil);
  sky(g, w, horizon, x0, { far: 'none', seed: 11, clouds: 3 });
  range(g, w, horizon + 4, tall, r, { rock: n ? '#4f5162' : '#a3abbb', shade: n ? '#3d3f4e' : '#848da0', snow: n ? '#c9ccd8' : '#f7f8fb', snowShade: n ? '#9ea3b6' : '#cfd6e2', haze: n ? '#2c3040' : '#c9d3df' });
  range(g, w, horizon + 22, tall * 0.62, r, { rock: n ? '#46454c' : '#8c8a8a', shade: n ? '#302f36' : '#66656a', snow: n ? '#c3c6d0' : '#f2f3f6', snowShade: n ? '#8f94a6' : '#bfc6d3', haze: null });
  // a forested shoulder along the nearer range's foot
  const foot = horizon + 22;
  g.fillStyle = n ? '#232b22' : '#4b5f44';
  g.beginPath(); g.moveTo(0, oy);
  for (let x = 0; x <= w + 20; x += 20) g.lineTo(x, foot - 10 - 12 * Math.sin(x / 110 + 0.7));
  g.lineTo(w + 20, oy); g.closePath(); g.fill();
  for (let x = 4; x < w; x += 6 + r() * 7) pine(g, x, foot - 6 - 12 * Math.sin(x / 110 + 0.7) + r() * 6, 14 + r() * 12, n ? '#1b2219' : '#34472f', n ? '#2a3526' : '#4f6845');
  // the hillsides falling away to the valley: meadows, each nearer one
  // lower on the right and greener, with a few pines along its crest
  const D = oy - foot;
  const slopes = [[0.15, 0.55, n ? '#2f3b29' : '#62804a', n ? '#36442e' : '#729356'], [0.4, 0.85, n ? '#35422d' : '#6f8d52', n ? '#3d4b33' : '#82a160'], [0.7, 1, n ? '#3a4830' : '#7b9a5b', n ? '#43523a' : '#8daa68']];
  for (const [a, b, c0, c1] of slopes) {
    const yl = foot + D * a, yr = foot + D * b;
    const crest = (x) => lerp(yl, yr, (x / w) ** 0.8) + Math.sin(x / 70 + a * 9) * 4;
    const gr = g.createLinearGradient(0, yl, 0, oy); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, oy + 2);
    for (let x = 0; x <= w + 12; x += 12) g.lineTo(x, crest(x));
    g.lineTo(w + 12, oy + 2); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#ffffff', n ? 0.05 : 0.18); g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= w; x += 12) g.lineTo(x, crest(x) + 1);
    g.stroke();
    for (let x = r() * 80; x < w; x += 40 + r() * 120) if (crest(x) < oy - 6) pine(g, x, crest(x) + 3, 10 + (b * 16) * (0.6 + r() * 0.6), n ? '#1f2a1c' : '#3a5134', n ? '#2c3a28' : '#56724a');
  }
  // the valley floor: meadow, a stream catching the light
  grass(g, 0, w, oy, h, { seed: 9 });
  g.save(); g.strokeStyle = withAlpha(n ? '#8fb4c4' : '#c3e0ec', 0.75); g.lineWidth = 3;
  g.beginPath(); g.moveTo(w * 0.55, oy + 8); g.bezierCurveTo(w * 0.7, oy + 22, w * 0.8, oy + 6, w + 10, oy + 18); g.stroke(); g.restore();
  // the ledge it leaves from: the library's cliff, with scree at its foot
  if (H0 > 0) { seaCliff(g, -4, x0, top, oy, { foam: false }); scree(g, x0, oy, k); }
}

/** A tree of the forest, `H` px tall (a real 15–25 m, so its crown usually
    runs past the frame): a barked trunk and a crown of shaded clumps. */
function forestTree(g, x, Y, H, tw, { bark, barkLo, leaf, leafLo, leafHi }, r) {
  const cb = Y - H * 0.5;
  const tg = g.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
  tg.addColorStop(0, bark); tg.addColorStop(1, barkLo);
  g.fillStyle = tg; g.beginPath(); g.moveTo(x - tw * 0.75, Y); g.lineTo(x - tw / 2, Y - tw); g.lineTo(x - tw * 0.4, cb); g.lineTo(x + tw * 0.4, cb); g.lineTo(x + tw / 2, Y - tw); g.lineTo(x + tw * 0.75, Y); g.closePath(); g.fill();
  if (tw > 8) {
    g.strokeStyle = withAlpha('#000000', 0.22); g.lineWidth = 1;
    for (let i = 0; i < tw / 4; i++) { const bx = x - tw * 0.4 + r() * tw * 0.8, by = Y - r() * (Y - cb); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (r() - 0.5) * 2, by - 10 - r() * 26); g.stroke(); }
  }
  for (let i = 0; i < 14; i++) {
    const a = r(), yy = cb - H * 0.5 * a ** 0.8, rr = H * (0.1 + r() * 0.08) * (1 - a * 0.4);
    const xx = x + (r() - 0.5) * H * 0.36 * (1 - a * 0.5);
    g.fillStyle = i < 6 ? leafLo : i < 11 ? leaf : leafHi;
    g.beginPath(); g.arc(xx, yy, rr, 0, TAU); g.fill();
  }
}

/** A forest: trunks to scale in three layers thinning into mist, sunlight
    slanting through, the forest floor of leaf litter, moss, roots and ferns;
    from a height, a timber platform with a rail and a ladder. */
function forest(g, { w, h, k, oy, x0, top, H0 }) {
  const E = env(), n = E.night, r = rng(83);
  skyscape(g, 0, 0, w, oy, { far: 'trees', seed: 21, clouds: 2, sun: false });
  const mist = n ? '#39424a' : '#d7e0dc';
  const layers = [
    { d: 0.75, bark: n ? '#4a4648' : '#9a948c', barkLo: n ? '#3a3638' : '#837c74', leaf: n ? '#3a4740' : '#9fb3a0', leafLo: n ? '#33403a' : '#90a592', leafHi: n ? '#44524a' : '#b2c4b0' },
    { d: 0.45, bark: n ? '#43382f' : '#7d6a58', barkLo: n ? '#32291f' : '#5f4f40', leaf: n ? '#2f3d29' : '#71905a', leafLo: n ? '#28331f' : '#5d7a4a', leafHi: n ? '#3b4b31' : '#89a86c' },
    { d: 0.15, bark: n ? '#3b2d26' : '#6a4e38', barkLo: n ? '#271d18' : '#4a3626', leaf: n ? '#28331f' : '#55683d', leafLo: n ? '#1f281a' : '#465833', leafHi: n ? '#35432a' : '#6c8250' },
  ];
  for (const L of layers) {
    const s = 1 - L.d * 0.55, Yb = oy - L.d * clamp(0.6 * k, 8, 40);
    for (let x = -20 + r() * 40; x < w + 30; x += clamp(5 * k * s, 26, 180) * (0.6 + r() * 0.8)) {
      forestTree(g, x, Yb, clamp((15 + r() * 10) * k * s, 70, 3000), clamp((0.35 + r() * 0.25) * k * s, 3, 60), L, r);
    }
    // mist between the layers, lying low
    const mg = g.createLinearGradient(0, 0, 0, oy);
    mg.addColorStop(0, withAlpha(mist, 0.08)); mg.addColorStop(0.7, withAlpha(mist, 0.22 * L.d + 0.08)); mg.addColorStop(1, withAlpha(mist, 0.35 * L.d + 0.1));
    g.fillStyle = mg; g.fillRect(0, 0, w, oy);
  }
  // shafts of light slanting through the canopy
  if (!n) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const sx = w * (0.2 + i * 0.22 + r() * 0.08), sw = 18 + r() * 30;
      const lg = g.createLinearGradient(0, 0, 0, oy); lg.addColorStop(0, 'rgba(255,248,220,0.10)'); lg.addColorStop(1, 'rgba(255,248,220,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + sw, 0); g.lineTo(sx + sw + oy * 0.35, oy); g.lineTo(sx + oy * 0.35, oy); g.closePath(); g.fill();
    }
    g.restore();
  }
  // the forest floor: earth under leaf litter, moss, and the path worn through it
  const fg = g.createLinearGradient(0, oy, 0, h);
  fg.addColorStop(0, n ? '#3a3a2a' : '#6f6a45'); fg.addColorStop(1, n ? '#2a2a1f' : '#544f33');
  g.fillStyle = fg; g.fillRect(0, oy, w, h - oy);
  g.fillStyle = n ? '#4a4434' : '#8f7e5a'; g.beginPath(); g.moveTo(0, oy + 4);
  g.bezierCurveTo(w * 0.3, oy + 2, w * 0.5, oy + (h - oy) * 0.5, w * 0.7, h); g.lineTo(w * 0.95, h);
  g.bezierCurveTo(w * 0.7, oy + (h - oy) * 0.4, w * 0.4, oy + 8, 0, oy + 14); g.closePath(); g.fill();
  for (let i = 0; i < (w * (h - oy)) / 90; i++) {
    const y = oy + 2 + r() * (h - oy), s = 1 + (y - oy) / Math.max(1, h - oy);
    g.fillStyle = withAlpha([n ? '#5a4632' : '#a2763e', n ? '#3e4a2e' : '#6e7d42', n ? '#5d3d2a' : '#b3683a'][Math.floor(r() * 3)], 0.8);
    g.beginPath(); g.ellipse(r() * w, y, 2.5 * s, 1.2 * s, r() * TAU, 0, TAU); g.fill();
  }
  for (let i = 0; i < 9; i++) { g.fillStyle = withAlpha(n ? '#2f3e26' : '#5f7d3a', 0.6); g.beginPath(); g.ellipse(r() * w, oy + 4 + r() * (h - oy - 8), 14 + r() * 26, 4 + r() * 5, 0, 0, TAU); g.fill(); }
  // ferns at every depth, larger nearer
  for (let i = 0; i < w / 45; i++) {
    const x = r() * w, y = oy + 1 + r() ** 1.5 * (h - oy - 4), s = 1 + (y - oy) / 40;
    g.strokeStyle = n ? '#3a4a2c' : '#5e7a3e'; g.lineWidth = 1.4;
    for (let j = 0; j < 6; j++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (j - 2.5) * 5 * s, y - 12 * s, x + (j - 2.5) * 10 * s, y - (6 + r() * 6) * s); g.stroke(); }
  }
  // two great trunks in the foreground, at different depths, roots in the floor
  for (const [fx, fw] of [[w - clamp(0.6 * k, 22, 70) * 0.6, clamp(0.9 * k, 26, 90)], [Math.max(x0 + (w - x0) * 0.55, x0 + 120), clamp(0.5 * k, 14, 50)]]) {
    if (fx > w + fw) continue;
    const tg = g.createLinearGradient(fx - fw / 2, 0, fx + fw / 2, 0);
    tg.addColorStop(0, n ? '#3e3029' : '#715540'); tg.addColorStop(0.4, n ? '#4d3b31' : '#86674c'); tg.addColorStop(1, n ? '#1f1814' : '#3e2d21');
    g.fillStyle = tg; g.beginPath(); g.moveTo(fx - fw, oy + 10); g.quadraticCurveTo(fx - fw * 0.5, oy - fw * 0.3, fx - fw / 2, oy - fw * 1.2);
    g.lineTo(fx - fw / 2, 0); g.lineTo(fx + fw / 2, 0); g.lineTo(fx + fw / 2, oy - fw * 1.2); g.quadraticCurveTo(fx + fw * 0.5, oy - fw * 0.3, fx + fw, oy + 10); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1.2;
    for (let i = 0; i < fw / 3; i++) { const bx = fx - fw * 0.42 + r() * fw * 0.84; let by = r() * oy; g.beginPath(); g.moveTo(bx, by); for (let j = 0; j < 4; j++) { by += 10 + r() * 14; g.lineTo(bx + (r() - 0.5) * 3, by); } g.stroke(); }
    g.fillStyle = withAlpha(n ? '#2f3e26' : '#6d8a42', 0.55); g.beginPath(); g.ellipse(fx - fw * 0.35, oy - fw * 0.4, fw * 0.18, fw * 0.6, 0, 0, TAU); g.fill();
  }
  // a timber platform among the trunks to launch from, with a rail and a ladder
  if (H0 > 0) {
    const pw = clamp(2.2 * k, 50, 160), wood = n ? '#6e5442' : '#8d6b4a', dark = n ? '#43332a' : '#5b432e';
    for (const lx of [x0 - pw + 8, x0 - 10]) { g.fillStyle = dark; g.fillRect(lx, top, 6, oy - top); }
    g.strokeStyle = dark; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - pw + 11, oy); g.lineTo(x0 - 8, top + 8); g.moveTo(x0 - 8, oy); g.lineTo(x0 - pw + 11, top + 8); g.stroke();
    g.fillStyle = wood; g.fillRect(x0 - pw, top, pw, 7);
    g.fillStyle = withAlpha('#ffffff', n ? 0.06 : 0.22); g.fillRect(x0 - pw, top, pw, 1.5);
    const rh = clamp(1 * k, 14, 40);
    g.fillStyle = dark; g.fillRect(x0 - pw, top - rh, 4, rh); g.fillRect(x0 - pw, top - rh, pw * 0.55, 3);
    g.strokeStyle = wood; g.lineWidth = 2;
    for (const lx of [x0 - pw - 10, x0 - pw - 2]) { g.beginPath(); g.moveTo(lx, top); g.lineTo(lx, oy); g.stroke(); }
    for (let y = top + 8; y < oy; y += 10) { g.beginPath(); g.moveTo(x0 - pw - 10, y); g.lineTo(x0 - pw - 2, y); g.stroke(); }
    softShadow(g, x0 - pw / 2, oy + 2, pw * 0.6, 4, 0.7);
  }
}

/** A boat at its mooring, `L` px long, its waterline at (x, y): a hull with
    its sheer and a stripe, a wheelhouse, a mast and stays, and its
    reflection in the water below, rocking with the swell. */
function boat(g, x, y, L, rock, hull, E) {
  const draw = (flip) => {
    g.save(); g.translate(x, y); if (flip) g.scale(1, -0.6); g.rotate(rock);
    const hg = g.createLinearGradient(0, -L * 0.16, 0, 0); hg.addColorStop(0, hull); hg.addColorStop(1, withAlpha('#000000', 0.5));
    g.fillStyle = hull; g.beginPath(); g.moveTo(-L * 0.5, -L * 0.17); g.quadraticCurveTo(0, -L * 0.12, L * 0.5, -L * 0.2);
    g.quadraticCurveTo(L * 0.44, -L * 0.04, L * 0.34, 0); g.lineTo(-L * 0.44, 0); g.quadraticCurveTo(-L * 0.5, -L * 0.08, -L * 0.5, -L * 0.17); g.closePath(); g.fill();
    g.fillStyle = hg; g.fill();
    g.fillStyle = E.night ? '#cfc6be' : '#f2ede6'; g.fillRect(-L * 0.46, -L * 0.165, L * 0.92, L * 0.02);
    g.fillStyle = E.night ? '#d8d2cc' : '#f4f1ec'; g.fillRect(-L * 0.2, -L * 0.32, L * 0.26, L * 0.17);
    g.fillStyle = E.night ? withAlpha(E.window, 0.8) : '#5f7d96'; for (let i = 0; i < 3; i++) g.fillRect(-L * 0.17 + i * L * 0.075, -L * 0.29, L * 0.05, L * 0.05);
    g.strokeStyle = E.night ? '#b5aca6' : '#6f6a66'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(L * 0.1, -L * 0.15); g.lineTo(L * 0.1, -L * 0.8); g.stroke();
    g.lineWidth = 0.8; g.beginPath(); g.moveTo(L * 0.1, -L * 0.8); g.lineTo(L * 0.46, -L * 0.2); g.moveTo(L * 0.1, -L * 0.8); g.lineTo(-L * 0.45, -L * 0.17); g.stroke();
    g.restore();
  };
  g.save(); g.globalAlpha = 0.28; draw(true); g.restore();
  draw(false);
}

/** A harbour: a stone quay to launch from (its coping, fenders, a ladder, a
    chain, the tide line), the water with its swell, boats moored out in the
    harbour, a breakwater and a lighthouse across the bay. */
function harbour(g, { w, h, k, oy, x0, top, H0, phase }) {
  const E = env(), n = E.night, r = rng(91), horizon = oy - clamp((oy - 40) * 0.22, 30, 120);
  sky(g, w, horizon, x0, { far: 'hills', seed: 15, clouds: 4 });
  // the breakwater and its lighthouse
  g.fillStyle = n ? '#3e3a40' : '#8f8a86'; g.fillRect(w * 0.45, horizon - 8, w * 0.55, 10);
  g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(w * 0.45, horizon, w * 0.55, 2);
  const lx = w * 0.88, lh = clamp(horizon * 0.25, 24, 70);
  g.fillStyle = n ? '#d9d2cc' : '#f2ede6'; g.beginPath(); g.moveTo(lx - 7, horizon - 6); g.lineTo(lx - 4, horizon - 6 - lh); g.lineTo(lx + 4, horizon - 6 - lh); g.lineTo(lx + 7, horizon - 6); g.closePath(); g.fill();
  g.fillStyle = '#b5473f'; g.fillRect(lx - 5, horizon - 6 - lh * 0.55, 10, lh * 0.15); g.fillRect(lx - 5, horizon - 6 - lh * 0.95, 10, lh * 0.08);
  g.fillStyle = withAlpha(E.window, n ? 1 : 0.7); g.fillRect(lx - 4, horizon - 12 - lh, 8, 6);
  if (n) { const bg = g.createRadialGradient(lx, horizon - 9 - lh, 0, lx, horizon - 9 - lh, 40); bg.addColorStop(0, withAlpha(E.window, 0.4)); bg.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = bg; g.fillRect(lx - 40, horizon - 50 - lh, 80, 80); }
  water(g, 0, w, horizon, h, { phase });
  // boats out in the harbour, small with distance, well behind the quay's water
  for (const [f, s, c] of [[0.3, 1, n ? '#46525e' : '#3f6a8a'], [0.66, 0.75, n ? '#5a4a48' : '#9a4a3c'], [0.86, 0.55, n ? '#44504a' : '#4f7a5e']]) {
    const bx = x0 + f * (w - x0);
    if (bx > w - 10) continue;
    const by = horizon + (oy - horizon) * (0.12 + s * 0.12);
    boat(g, bx, by, clamp(5 * k * s * 0.6, 30, 110), Math.sin(phase * 1.4 + bx) * 0.04, c, E);
  }
  // the quay: dressed stone to the water, the coping along its top, the
  // tide line, fenders, a ladder down and a mooring chain
  if (H0 > 0) {
    const cw = clamp(0.45 * k, 6, 14);
    stone(g, -4, top + cw, x0 + 4, oy - top - cw + 8, { course: clamp(0.4 * k, 7, 14), seed: 41, color: n ? '#5d5459' : '#a99c8f' });
    // below the tide line the stone is dark and weedy
    const tide = oy - clamp(0.8 * k, 8, 40);
    const tg = g.createLinearGradient(0, tide, 0, oy + 6); tg.addColorStop(0, withAlpha(n ? '#1d2a22' : '#3d4f3a', 0.55)); tg.addColorStop(1, withAlpha('#0e1612', 0.75));
    g.fillStyle = tg; g.fillRect(-4, tide, x0 + 8, oy - tide + 6);
    g.fillStyle = withAlpha(n ? '#3f5a3a' : '#6b8a4c', 0.8); for (let x = 0; x < x0; x += 5) g.fillRect(x, tide - 1, 3, 2 + r() * 5);
    // the coping: a heavier, paler stone along the top, lit, overhanging the face
    const cg = g.createLinearGradient(0, top, 0, top + cw); cg.addColorStop(0, n ? '#8b8288' : '#d6cbbf'); cg.addColorStop(1, n ? '#5d5459' : '#9d9184');
    g.fillStyle = cg; g.fillRect(-4, top, x0 + 7, cw);
    g.fillStyle = withAlpha('#000000', 0.3); g.fillRect(-4, top + cw, x0 + 7, 2);
    // fenders: old tyres hanging on ropes down near the water, where a boat lies
    for (let fx = x0 - 50; fx > 20; fx -= 110) {
      const fy = lerp(top + cw, tide, 0.75), fr = clamp(0.3 * k, 5, 11);
      g.strokeStyle = n ? '#7a6a58' : '#9a8566'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(fx, top + cw); g.lineTo(fx, fy - fr); g.stroke();
      g.strokeStyle = '#1d1c1e'; g.lineWidth = fr * 0.6; g.beginPath(); g.ellipse(fx, fy, fr * 0.7, fr, 0, 0, TAU); g.stroke();
    }
    // a mooring chain sagging into the water
    g.strokeStyle = n ? '#5f5a58' : '#4a4442'; g.lineWidth = 2; g.setLineDash([3, 2]);
    g.beginPath(); g.moveTo(x0 - 30, top + cw); g.quadraticCurveTo(x0 + 10, oy - 10, x0 + 40, oy + 2); g.stroke(); g.setLineDash([]);
    // a bollard on the coping, a ladder down the face
    g.fillStyle = n ? '#2b2628' : '#3b3436'; g.fillRect(x0 - 26, top - 10, 10, 10);
    g.beginPath(); g.ellipse(x0 - 21, top - 10, 7, 3, 0, 0, TAU); g.fill();
    g.strokeStyle = n ? '#8d8a8f' : '#6f6a66'; g.lineWidth = 1.5;
    for (const lx2 of [x0 - 8, x0 - 3]) { g.beginPath(); g.moveTo(lx2, top - 6); g.lineTo(lx2, oy + 6); g.stroke(); }
    for (let y = top + 8; y < oy; y += 9) { g.beginPath(); g.moveTo(x0 - 8, y); g.lineTo(x0 - 3, y); g.stroke(); }
    // lobster pots stacked further back on the quay
    for (let i = 0; i < 3; i++) { const px = x0 - 70 - i * 16, ps = 12; if (px < 8) break; g.fillStyle = n ? '#4a3e33' : '#8a6f4e'; g.fillRect(px, top - ps, ps, ps); g.strokeStyle = withAlpha('#000000', 0.35); g.lineWidth = 1; g.strokeRect(px, top - ps, ps, ps); }
  }
}

/** How wide the city's block is drawn, so the stage can frame it and put
    the height's dimension line beside it, never across its windows. */
export const cityWidth = (H0, k, w) => clamp(Math.max(10, H0 * 0.35) * k, 90, w * 0.4);

/** A city: a skyline of towers with lit windows behind, the office block it
    leaves from (glass in a frame, a parapet and rooftop plant), the street
    below with its kerb, lamps and parked cars. */
function city(g, { w, h, k, oy, x0, top, H0 }) {
  const E = env(), n = E.night, r = rng(101);
  skyscape(g, 0, 0, w, oy, { far: 'skyline', seed: 17, clouds: 2, farHeight: clamp((oy - 40) * 0.5, 40, 260), sun: false });
  // nearer blocks, darker, with windows and a roofline
  for (let x = x0 + 30; x < w; x += 40 + r() * 70) {
    const bw = 30 + r() * 50, bh = clamp((oy - 40) * (0.25 + r() * 0.35), 30, oy - 30);
    g.fillStyle = n ? '#2a2630' : '#7c7c86'; g.fillRect(x, oy - bh, bw, bh);
    g.fillStyle = withAlpha('#ffffff', n ? 0.05 : 0.15); g.fillRect(x, oy - bh, 3, bh);
    g.fillStyle = n ? '#36313c' : '#8e8e98'; g.fillRect(x - 2, oy - bh - 3, bw + 4, 3);
    for (let y = oy - bh + 6; y < oy - 8; y += 9) for (let xx = x + 4; xx < x + bw - 6; xx += 8) {
      g.fillStyle = withAlpha(n ? E.window : '#c9d6e3', r() < (n ? 0.45 : 0.8) ? 0.8 : 0.15); g.fillRect(xx, y, 4, 5);
    }
  }
  // the street: the road, a kerb and a pavement, lamps and parked cars
  const rd = clamp(0.6 * k, 12, 24);
  tarmac(g, 0, w, oy, { depth: rd, verge: false });
  g.fillStyle = n ? '#6a6266' : '#d4ccc6'; g.fillRect(0, oy + rd, w, 3);
  g.fillStyle = n ? '#4a4044' : '#b8aeae'; g.fillRect(0, oy + rd + 3, w, h);
  g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 1;
  for (let x = 0; x < w; x += 22) { g.beginPath(); g.moveTo(x, oy + rd + 3); g.lineTo(x - 8, h); g.stroke(); }
  g.fillStyle = withAlpha('#ffffff', n ? 0.25 : 0.6); for (let x = x0 + 20; x < w; x += 46) g.fillRect(x, oy + rd * 0.5 - 1, 22, 2);
  const lampH = clamp(5 * k, 36, 110);
  for (let x = x0 + 70; x < w - 10; x += 170) {
    g.strokeStyle = n ? '#555058' : '#4f4b50'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, oy + rd + 3); g.lineTo(x, oy - lampH); g.lineTo(x + lampH * 0.18, oy - lampH); g.stroke();
    g.fillStyle = n ? E.window : '#e8e2d0'; g.fillRect(x + lampH * 0.13, oy - lampH, lampH * 0.1, 4);
    if (n) { const lg = g.createRadialGradient(x + lampH * 0.18, oy - lampH + 6, 0, x + lampH * 0.18, oy - lampH + 6, lampH * 0.6); lg.addColorStop(0, withAlpha(E.window, 0.35)); lg.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = lg; g.fillRect(x - lampH * 0.5, oy - lampH - lampH * 0.5, lampH * 1.4, lampH * 1.2); }
  }
  for (let x = x0 + 110 + r() * 40; x < w - 20; x += 140 + r() * 120) {
    const cl = clamp(4.4 * k, 34, 90), ch = cl * 0.28, cy = oy + rd * 0.25, col = ['#7a4a46', '#4c5f74', '#8a8a8e', '#3f4e44'][Math.floor(r() * 4)];
    g.fillStyle = col; g.beginPath(); g.roundRect(x, cy - ch, cl, ch * 0.62, 3); g.fill();
    g.beginPath(); g.roundRect(x + cl * 0.2, cy - ch * 1.35, cl * 0.55, ch * 0.5, 4); g.fill();
    g.fillStyle = n ? withAlpha('#9fb4c8', 0.5) : '#b8cad8'; g.fillRect(x + cl * 0.26, cy - ch * 1.25, cl * 0.2, ch * 0.32); g.fillRect(x + cl * 0.5, cy - ch * 1.25, cl * 0.2, ch * 0.32);
    g.fillStyle = '#1c1b1e'; for (const wx of [x + cl * 0.2, x + cl * 0.8]) { g.beginPath(); g.arc(wx, cy - ch * 0.38, ch * 0.24, 0, TAU); g.fill(); }
  }
  // the block it leaves from
  if (H0 > 0) {
    const bw = cityWidth(H0, k, w), bx = x0 - bw;
    const gr = g.createLinearGradient(bx, 0, x0, 0);
    gr.addColorStop(0, n ? '#3c4250' : '#8d99a8'); gr.addColorStop(1, n ? '#272b35' : '#6b7684');
    g.fillStyle = gr; g.fillRect(bx, top, bw, oy - top);
    const fl = clamp(3.2 * k, 10, 40);
    for (let y = top + fl * 0.4; y < oy - 4; y += fl) {
      g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(bx, y - 2, bw, 2);
      for (let x = bx + 6; x < x0 - 8; x += 14) { g.fillStyle = withAlpha(n ? E.window : '#cfe0ef', n ? (r() < 0.5 ? 0.85 : 0.2) : 0.75); g.fillRect(x, y + 2, 9, fl * 0.55); }
    }
    // the parapet, and the plant on the roof behind it
    const ph = clamp(0.9 * k, 6, 18);
    g.fillStyle = n ? '#4a505e' : '#a6b1bd'; g.fillRect(bx - 2, top - ph, bw + 2, ph);
    g.fillStyle = withAlpha('#ffffff', n ? 0.08 : 0.3); g.fillRect(bx - 2, top - ph, bw + 2, 2);
    const pl = n ? '#3a3f4b' : '#8a95a2';
    g.fillStyle = pl; g.fillRect(bx + bw * 0.12, top - ph - clamp(1.6 * k, 10, 30), bw * 0.22, clamp(1.6 * k, 10, 30));
    g.fillStyle = withAlpha('#000000', 0.25); for (let i = 0; i < 3; i++) g.fillRect(bx + bw * 0.14 + i * bw * 0.06, top - ph - clamp(1.6 * k, 10, 30) + 4, bw * 0.04, 3);
    const tk = clamp(2.5 * k, 16, 50);
    g.fillStyle = n ? '#4d4540' : '#8a7562'; g.fillRect(bx + bw * 0.45, top - ph - tk, bw * 0.12, tk);
    g.strokeStyle = n ? '#5e5a62' : '#5f6670'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx + bw * 0.4, top - ph); g.lineTo(bx + bw * 0.4, top - ph - tk * 1.6); g.stroke();
    softShadow(g, bx + bw / 2, oy + 2, bw * 0.55, 6, 0.8);
  }
}

/** The Moon: a black sky full of stars with the Earth hanging in it, half
    lit across a curved terminator; a far crater rim and a low ridge at the
    horizon; the grey regolith plain pocked with craters and boulders. */
function moon(g, { w, h, k, oy, x0, top, H0 }) {
  const horizon = oy - clamp((oy - 40) * 0.14, 18, 70);
  starfield(g, w, horizon, 5);
  // the Earth, lit from the left, its night side behind a curved terminator
  const ex = clamp(x0 + (w - x0) * 0.6, w * 0.45, w - 50), ey = clamp(horizon * 0.25, 40, 160), er = clamp(w * 0.04, 14, 40);
  const eg = g.createRadialGradient(ex - er * 0.4, ey - er * 0.3, er * 0.2, ex, ey, er);
  eg.addColorStop(0, '#9cc7ea'); eg.addColorStop(0.6, '#3f78b4'); eg.addColorStop(1, '#1d3550');
  g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(ex - er * 0.2, ey - er * 0.1, er * 0.5, er * 0.18, -0.3, 0, TAU); g.fill();
  g.fillStyle = 'rgba(110,150,90,0.55)'; g.beginPath(); g.ellipse(ex - er * 0.35, ey + er * 0.3, er * 0.25, er * 0.15, 0.4, 0, TAU); g.fill();
  const tg = g.createLinearGradient(ex + er * 0.05, 0, ex + er * 0.6, 0);
  tg.addColorStop(0, 'rgba(5,6,10,0.45)'); tg.addColorStop(1, 'rgba(5,6,10,0.85)');
  g.fillStyle = tg; g.beginPath(); g.arc(ex, ey, er + 0.5, -Math.PI / 2, Math.PI / 2, false);
  g.ellipse(ex, ey, er * 0.38, er + 0.5, 0, Math.PI / 2, -Math.PI / 2, true); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(156,199,234,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(ex, ey, er + 1.5, Math.PI * 0.55, Math.PI * 1.45); g.stroke();
  // the far rim of a great crater and a low ridge, catching the sun
  horizonLine(g, w, horizon, rng(17), { far: '#6e6b67', near: '#8a8682', lit: '#c9c5bf', rim: true });
  regolith(g, w, h, horizon, oy, k, { base: '#8d8a86', dark: '#55534f', light: '#b9b5af', seed: 13 });
  if (H0 > 0) { seaCliff(g, -4, x0, top, oy, { foam: false, cap: false, tones: rockTones('#b4b0aa', '#8e8a85', '#55524e') }); scree(g, x0, oy, k); }
}

/** A low, uneven skyline of hills, and perhaps a crater's rim, at the horizon. */
function horizonLine(g, w, horizon, r, { far, near, lit, rim }) {
  g.fillStyle = far; g.beginPath(); g.moveTo(0, horizon + 2);
  for (let x = 0; x <= w; x += 16) g.lineTo(x, horizon - 10 - 8 * Math.sin(x / 160 + 2) - r() * 3);
  g.lineTo(w, horizon + 2); g.closePath(); g.fill();
  if (rim) {
    const cx = w * 0.3, cw = w * 0.5, ch = clamp(horizon * 0.06, 10, 26);
    g.fillStyle = near; g.beginPath(); g.moveTo(cx - cw / 2, horizon + 2);
    g.quadraticCurveTo(cx - cw * 0.35, horizon - ch, cx - cw * 0.2, horizon - ch * 0.9);
    g.lineTo(cx + cw * 0.2, horizon - ch * 0.95); g.quadraticCurveTo(cx + cw * 0.35, horizon - ch, cx + cw / 2, horizon + 2); g.closePath(); g.fill();
    g.strokeStyle = withAlpha(lit, 0.7); g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - cw / 2, horizon + 1); g.quadraticCurveTo(cx - cw * 0.35, horizon - ch, cx - cw * 0.2, horizon - ch * 0.9); g.stroke();
  }
}

/** Mars: a butterscotch sky with dust hanging low, layered mesas eroded in
    steps, red rock and dust; from the ground, a launch pad with its gantry. */
function mars(g, { w, h, k, oy, x0, top, H0 }) {
  const horizon = oy - clamp((oy - 40) * 0.2, 22, 100);
  const gr = g.createLinearGradient(0, 0, 0, horizon);
  gr.addColorStop(0, '#4e3026'); gr.addColorStop(0.6, '#a87650'); gr.addColorStop(1, '#d4a679');
  g.fillStyle = gr; g.fillRect(0, 0, w, horizon);
  // a small, pale sun with a bluish halo, as Mars's dust scatters it
  const sx = clamp(x0 + (w - x0) * 0.6, w * 0.45, w - 40), sy = clamp(horizon * 0.3, 40, 140);
  const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 40); sg.addColorStop(0, 'rgba(200,220,240,0.45)'); sg.addColorStop(1, 'rgba(200,220,240,0)');
  g.fillStyle = sg; g.fillRect(sx - 40, sy - 40, 80, 80);
  g.fillStyle = 'rgba(245,242,230,0.9)'; g.beginPath(); g.arc(sx, sy, 6, 0, TAU); g.fill();
  // mesas in layers, eroded in steps: far ones hazed into the sky
  for (const [cx, cw, ch, c, a] of [[0.22, 0.32, 0.16, '#8a5a40', 0.55], [0.62, 0.42, 0.22, '#93583a', 0.75], [0.9, 0.28, 0.12, '#7c4630', 0.9]]) {
    const x = w * cx, W = w * cw, H = clamp(horizon * ch, 14, 90);
    g.fillStyle = withAlpha(c, a);
    g.beginPath(); g.moveTo(x - W / 2, horizon + 2);
    const steps = 3;
    for (let i = 0; i < steps; i++) { const t = (i + 1) / steps, inset = W * 0.08 * (i + 1); g.lineTo(x - W / 2 + inset - W * 0.03, horizon - H * (t - 0.33)); g.lineTo(x - W / 2 + inset, horizon - H * t); }
    for (let i = steps - 1; i >= 0; i--) { const t = (i + 1) / steps, inset = W * 0.08 * (i + 1); g.lineTo(x + W / 2 - inset, horizon - H * t); g.lineTo(x + W / 2 - inset + W * 0.03, horizon - H * (t - 0.33)); }
    g.lineTo(x + W / 2, horizon + 2); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.15 * a); g.lineWidth = 1;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x - W * 0.4, horizon - H * i * 0.25); g.lineTo(x + W * 0.4, horizon - H * i * 0.25); g.stroke(); }
  }
  // dust hanging over the plain
  const dz = g.createLinearGradient(0, horizon - 40, 0, horizon + 6);
  dz.addColorStop(0, 'rgba(212,166,121,0)'); dz.addColorStop(1, 'rgba(212,166,121,0.55)');
  g.fillStyle = dz; g.fillRect(0, horizon - 40, w, 46);
  regolith(g, w, h, horizon, oy, k, { base: '#a85d3a', dark: '#6e3824', light: '#cf8a5e', seed: 19 });
  if (H0 > 0) { seaCliff(g, -4, x0, top, oy, { foam: false, cap: false, tones: rockTones('#c27a52', '#9a5534', '#5e2e1d') }); scree(g, x0, oy, k); }
  else {
    // a launch pad of concrete, its gantry of lattice steel behind
    const pw = clamp(3 * k, 50, 160), gh = clamp(8 * k, 60, 200), gx = x0 - pw * 0.7;
    g.fillStyle = '#8f8a84'; g.fillRect(x0 - pw, oy - 3, pw * 1.6, 5);
    g.fillStyle = withAlpha('#000000', 0.25); g.fillRect(x0 - pw, oy + 2, pw * 1.6, 2);
    g.strokeStyle = '#6a625c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(gx - 8, oy - 3); g.lineTo(gx - 8, oy - gh); g.moveTo(gx + 8, oy - 3); g.lineTo(gx + 8, oy - gh); g.stroke();
    g.lineWidth = 1;
    for (let y = oy - 3; y > oy - gh + 8; y -= 12) { g.beginPath(); g.moveTo(gx - 8, y); g.lineTo(gx + 8, y - 12); g.moveTo(gx + 8, y); g.lineTo(gx - 8, y - 12); g.stroke(); }
    g.lineWidth = 2; g.beginPath(); g.moveTo(gx + 8, oy - gh * 0.8); g.lineTo(gx + pw * 0.45, oy - gh * 0.8); g.stroke();
    g.fillStyle = '#c94d3a'; g.beginPath(); g.arc(gx, oy - gh - 3, 2.5, 0, TAU); g.fill();
  }
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

/** A snowfield: snowy peaks behind, pines heavy with snow, drifts and ski
    tracks across the snow; from a height, a rock ledge capped with snow,
    a cornice overhanging its edge. */
function snow(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(113), phone = w < 520;
  const horizon = oy - clamp((oy - 40) * 0.38, 50, 240);
  // on a phone the readouts cover the top, but the peaks keep some height
  const ceil = phone ? Math.min(horizon - 30, 190, horizon * 0.45) : 24, tall = Math.max(30, horizon - ceil);
  sky(g, w, horizon, x0, { far: 'none', seed: 31, clouds: 2 });
  range(g, w, horizon + 4, tall * 0.85, r, { rock: n ? '#5a5d6c' : '#b3bccb', shade: n ? '#43465a' : '#8f9ab0', snow: n ? '#d3d7e3' : '#fbfcfe', snowShade: n ? '#a7aec4' : '#d7dfec', haze: n ? '#2c3040' : '#dde6ef' });
  // the snowfield runs from the forest's foot to the near ground, faintly blue in its hollows
  const sg = g.createLinearGradient(0, horizon, 0, h);
  sg.addColorStop(0, n ? '#aeb6c6' : '#eef3f9'); sg.addColorStop(0.5, n ? '#c3cad8' : '#f9fbfd'); sg.addColorStop(1, n ? '#9aa3b6' : '#dfe8f2');
  g.fillStyle = sg; g.fillRect(0, horizon, w, h - horizon);
  // pines along the forest edge, snow on their tiers
  for (let x = r() * 20; x < w; x += 8 + r() * 12) {
    const ph = 16 + r() * 22, by = horizon + 6 + r() * 8;
    // none behind the ledge, where they would swallow its cornice
    if (H0 > 0 && x < x0 + 14 && by - ph < top + 20) continue;
    pine(g, x, by, ph, n ? '#1f2a28' : '#2f4a3e', n ? '#2b3a36' : '#3f5f50');
    g.fillStyle = n ? '#cfd5e2' : '#ffffff';
    for (let i = 0; i < 3; i++) { const yb = by - ph * (0.12 + i * 0.1) - ph * 0.3 * (i / 3) - ph * 0.12, hw = ph * (0.2 - i * 0.05); g.beginPath(); g.ellipse(x - hw * 0.2, yb, hw * 0.7, ph * 0.035 + 0.8, -0.2, 0, TAU); g.fill(); }
  }
  // drifts: soft swells catching the light on their left, shaded on their right
  for (let i = 0; i < 6; i++) {
    const y = lerp(horizon + 24, h - 6, i / 5), dx = r() * w, dw = 120 + r() * 220;
    const dg = g.createLinearGradient(dx - dw / 2, 0, dx + dw / 2, 0);
    dg.addColorStop(0, withAlpha('#ffffff', n ? 0.15 : 0.7)); dg.addColorStop(1, withAlpha(n ? '#6d7891' : '#b9c8da', 0.35));
    g.fillStyle = dg; g.beginPath(); g.ellipse(dx, y, dw / 2, 5 + r() * 6, 0, Math.PI, 0); g.fill();
  }
  // ski tracks curving down across the snow
  // (out on the open snow, above the ground line where the measurements go)
  g.save(); g.beginPath(); g.rect(x0 + 40, 0, w, oy - 8); g.clip();
  g.strokeStyle = withAlpha(n ? '#6d7891' : '#a9bad0', 0.6); g.lineWidth = 1.3;
  const sx0 = Math.max(x0 + 60, w * 0.4);
  for (const off of [0, 5]) { g.beginPath(); g.moveTo(sx0 + off, horizon + 14); g.bezierCurveTo(sx0 + (w - sx0) * 0.5 + off, horizon + (oy - horizon) * 0.4, sx0 + off, oy - 30, w * 0.95 + off, oy - 14); g.stroke(); }
  g.restore();
  // rocks poking through, snow on their tops
  for (let i = 0; i < 5; i++) {
    const x = r() * w, y = lerp(oy + 6, h - 4, r()), R = 4 + r() * 8;
    if (!clearOf(x, c)) continue;
    g.fillStyle = n ? '#4a4c56' : '#77787f'; g.beginPath(); g.ellipse(x, y, R, R * 0.6, 0, Math.PI, 0); g.fill();
    g.fillStyle = n ? '#d3d7e3' : '#ffffff'; g.beginPath(); g.ellipse(x - R * 0.1, y - R * 0.45, R * 0.8, R * 0.22, 0, 0, TAU); g.fill();
  }
  if (H0 > 0) {
    seaCliff(g, -4, x0, top, oy, { foam: false, cap: false, tones: rockTones(n ? '#7d7f88' : '#a9abb2', n ? '#5c5e68' : '#85878f', n ? '#33343c' : '#55575f') });
    // the snow cap, thick on top, a cornice curling over the edge, drips of ice below
    const ck = clamp(0.5 * k, 6, 16);
    g.fillStyle = n ? '#d3d7e3' : '#ffffff';
    g.beginPath(); g.moveTo(-4, top + ck * 0.5); g.lineTo(-4, top - ck * 0.5);
    for (let x = 0; x < x0; x += 14) g.lineTo(x, top - ck * 0.5 - Math.sin(x * 0.05) * 2);
    g.quadraticCurveTo(x0 + ck * 0.9, top - ck * 0.5, x0 + ck * 0.5, top + ck * 0.5);
    g.quadraticCurveTo(x0, top + ck * 0.8, x0 - ck * 0.6, top + ck * 0.6);
    g.lineTo(-4, top + ck * 0.5); g.closePath(); g.fill();
    g.fillStyle = withAlpha(n ? '#8a94ab' : '#c3d2e3', 0.8); g.fillRect(-4, top + ck * 0.3, x0, ck * 0.25);
    g.fillStyle = withAlpha(n ? '#c4d0e0' : '#e4f0fb', 0.9);
    for (let x = 8; x < x0 - 6; x += 11 + r() * 16) { const L = 4 + r() * 10; g.beginPath(); g.moveTo(x - 2, top + ck * 0.55); g.lineTo(x + 2, top + ck * 0.55); g.lineTo(x, top + ck * 0.55 + L); g.closePath(); g.fill(); }
  }
}

/** A desert: a hot, hazy sky, far rock under a shimmer of heat, dunes in
    layers with sharp crests lit on one face, ripples in the sand, a cactus
    or two; from a height, a sandstone outcrop. */
function desert(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(127);
  const horizon = oy - clamp((oy - 40) * 0.3, 40, 200);
  if (n) sky(g, w, horizon, x0, { far: 'none', seed: 41, clouds: 0 });
  else {
    const gr = g.createLinearGradient(0, 0, 0, horizon);
    gr.addColorStop(0, '#7fa6c9'); gr.addColorStop(0.7, '#d9d4c0'); gr.addColorStop(1, '#efd9b0');
    g.fillStyle = gr; g.fillRect(0, 0, w, horizon);
    const sx = clamp(x0 + (w - x0) * 0.62, w * 0.45, w - 40), sy = clamp(horizon * 0.2, 26, 110);
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 90); sg.addColorStop(0, 'rgba(255,248,225,0.95)'); sg.addColorStop(0.15, 'rgba(255,240,200,0.6)'); sg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = sg; g.fillRect(sx - 90, sy - 90, 180, 180);
  }
  // far buttes, hazed
  for (const [cx, cw, ch] of [[0.3, 0.12, 0.14], [0.72, 0.18, 0.1], [0.92, 0.08, 0.16]]) {
    const x = w * cx, W = w * cw, H = clamp(horizon * ch, 12, 70);
    g.fillStyle = withAlpha(n ? '#4a3a40' : '#b98f6c', 0.6);
    g.beginPath(); g.moveTo(x - W / 2 - 10, horizon + 2); g.lineTo(x - W / 2, horizon - H); g.lineTo(x + W / 2, horizon - H * 0.95); g.lineTo(x + W / 2 + 12, horizon + 2); g.closePath(); g.fill();
  }
  // the far sand plain under the buttes, so no sky shows below the horizon
  const fp = g.createLinearGradient(0, horizon, 0, oy);
  fp.addColorStop(0, n ? '#4e4040' : '#d9b98c'); fp.addColorStop(1, n ? '#5e4c46' : '#e3c59a');
  g.fillStyle = fp; g.fillRect(0, horizon, w, oy - horizon);
  // heat shimmer at the horizon: a warm, thin band, wavering
  const hz = g.createLinearGradient(0, horizon - 14, 0, horizon + 8);
  const warm = n ? '#3a3040' : '#e9c99a';
  hz.addColorStop(0, withAlpha(warm, 0)); hz.addColorStop(0.6, withAlpha(warm, 0.4)); hz.addColorStop(1, withAlpha(warm, 0));
  g.fillStyle = hz; g.fillRect(0, horizon - 14, w, 22);
  if (!n) {
    g.strokeStyle = withAlpha('#fff3dc', 0.35); g.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const yy = horizon - 8 + i * 4; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, yy + Math.sin(x / 18 + phase * 3 + i * 2) * 1.2); g.stroke(); }
  }
  // dunes, far to near: a long gentle windward slope up to a sharp crest,
  // then the steep slip face falling into shadow
  const D = Math.max(20, oy - horizon), sm = (u) => u * u * (3 - 2 * u);
  for (let i = 0; i < 4; i++) {
    const base = horizon + D * (0.12 + i * 0.28), amp = D * (0.1 + i * 0.05), P = 220 + i * 90, ph = r() * P;
    const crest = (x) => {
      const u = (((x + ph) % P) + P) % P / P;
      return base - amp * (u < 0.78 ? sm(u / 0.78) : 1 - sm((u - 0.78) / 0.22));
    };
    const lit = n ? ['#5e4c46', '#6a5548', '#76604c', '#826a50'][i] : ['#e3c59a', '#e8c890', '#edcd8c', '#f1d28e'][i];
    const shade = n ? ['#3a2e2b', '#43352f', '#4c3c33', '#554437'][i] : ['#c29a6c', '#c89c64', '#cea160', '#d4a65e'][i];
    const body = () => { g.beginPath(); g.moveTo(-10, oy + 2); for (let x = -10; x <= w + 10; x += 6) g.lineTo(x, crest(x)); g.lineTo(w + 10, oy + 2); g.closePath(); };
    const gr = g.createLinearGradient(0, base - amp, 0, base + D * 0.2);
    gr.addColorStop(0, lit); gr.addColorStop(1, shade);
    body(); g.fillStyle = gr; g.fill();
    // each slip face: from its crest down to the trough, dark and fading below
    g.save(); body(); g.clip();
    for (let xp = -ph + 0.78 * P - P; xp < w + P; xp += P) {
      const xt = xp + 0.22 * P, yp = crest(xp + 0.5), yt = crest(xt - 0.5);
      const sg = g.createLinearGradient(0, yp, 0, yt + amp * 0.6);
      sg.addColorStop(0, withAlpha(shade, 0.95)); sg.addColorStop(1, withAlpha(shade, 0));
      // a wedge under the falling face, its lower edge slanting back to the
      // crest, so no hard upright edge shows
      g.fillStyle = sg; g.beginPath(); g.moveTo(xp, yp);
      for (let x = xp; x <= xt; x += 3) g.lineTo(x, crest(x));
      g.lineTo(xt + amp * 0.15, yt + amp * 0.35); g.quadraticCurveTo(xp + (xt - xp) * 0.3, yt + amp * 0.3, xp, yp); g.closePath(); g.fill();
    }
    g.restore();
    // the crest lines, catching the light
    g.strokeStyle = withAlpha('#ffffff', n ? 0.08 : 0.45); g.lineWidth = 1.1; g.beginPath();
    for (let x = -10; x <= w + 10; x += 6) g.lineTo(x, crest(x));
    g.stroke();
  }
  // the near sand, with its ripples
  const ng = g.createLinearGradient(0, oy, 0, h);
  ng.addColorStop(0, n ? '#7c6450' : '#efd296'); ng.addColorStop(1, n ? '#5e4a3c' : '#d9b277');
  g.fillStyle = ng; g.fillRect(0, oy, w, h - oy);
  g.strokeStyle = withAlpha(n ? '#3e3028' : '#b88f5a', 0.35); g.lineWidth = 1;
  for (let y = oy + 6; y < h; y += 6 + (y - oy) * 0.12) { g.beginPath(); for (let x = 0; x <= w; x += 12) g.lineTo(x, y + Math.sin(x / 22 + y) * 2); g.stroke(); }
  // a cactus or two, and stones
  for (const cx of [x0 + (w - x0) * 0.78, x0 + (w - x0) * 0.42, w * 0.06]) {
    if (cx < 10 || (H0 > 0 && cx < x0) || !clearOf(cx, c, 70)) continue;
    const ch = clamp(3.5 * k, 24, 90), cw = ch * 0.14, col = n ? '#3a4a36' : '#5f7d4c';
    g.fillStyle = col; g.beginPath(); g.roundRect(cx - cw / 2, oy - ch, cw, ch, cw / 2); g.fill();
    g.beginPath(); g.roundRect(cx - cw * 2.2, oy - ch * 0.62, cw * 0.8, ch * 0.32, cw * 0.4); g.fill(); g.fillRect(cx - cw * 2.2, oy - ch * 0.36, cw * 1.8, cw * 0.7);
    g.beginPath(); g.roundRect(cx + cw * 1.4, oy - ch * 0.78, cw * 0.8, ch * 0.36, cw * 0.4); g.fill(); g.fillRect(cx + cw * 0.4, oy - ch * 0.46, cw * 1.6, cw * 0.7);
    // ribs down the stem and arms, a lit side and a shaded one
    g.fillStyle = withAlpha('#000000', 0.22); g.fillRect(cx + cw * 0.1, oy - ch + cw * 0.4, cw * 0.4, ch - cw * 0.4);
    g.fillStyle = withAlpha('#ffffff', n ? 0.06 : 0.25); g.fillRect(cx - cw / 2 + 1, oy - ch + cw * 0.4, cw * 0.22, ch - cw);
    g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 0.8;
    for (const f of [-0.15, 0.15]) { g.beginPath(); g.moveTo(cx + cw * f, oy - ch + cw * 0.5); g.lineTo(cx + cw * f, oy); g.stroke(); }
    g.fillStyle = withAlpha('#f2e6c8', 0.7); for (let y = oy - ch + cw; y < oy - 4; y += cw * 0.9) { g.fillRect(cx - cw / 2 - 1, y, 1.2, 1.2); g.fillRect(cx + cw / 2, y + cw * 0.4, 1.2, 1.2); }
    softShadow(g, cx + cw, oy + 1, ch * 0.3, 3, 0.7);
  }
  if (H0 > 0) {
    seaCliff(g, -4, x0, top, oy, { foam: false, cap: false, tones: rockTones(n ? '#8d6a58' : '#e0a978', n ? '#6c4e40' : '#c08458', n ? '#3e2a22' : '#7d4f33') });
    // the wind has cut it: dark undercuts under harder bands, a cap that overhangs
    const H = oy - top;
    for (const f of [0.3, 0.62]) {
      const y = top + H * f, d = clamp(0.5 * k, 4, 14);
      const ug = g.createLinearGradient(0, y, 0, y + d * 1.6); ug.addColorStop(0, withAlpha('#2a160e', 0.55)); ug.addColorStop(1, withAlpha('#2a160e', 0));
      g.fillStyle = ug; g.beginPath(); g.moveTo(-4, y); g.lineTo(x0 - d * 0.3 - H * 0.04 * f, y); g.quadraticCurveTo(x0 - d * 1.4, y + d * 0.8, x0 - d * 0.6 - H * 0.05 * f, y + d * 1.6); g.lineTo(-4, y + d * 1.6); g.closePath(); g.fill();
    }
    g.fillStyle = n ? '#9a7662' : '#ecb886'; g.beginPath(); g.moveTo(-4, top - 3); g.lineTo(x0 + 4, top - 3); g.lineTo(x0 + 2, top + 4); g.lineTo(-4, top + 5); g.closePath(); g.fill();
    // a talus fan of fallen blocks and sand at its foot
    // against the face, so what drops from the edge still lands on the open sand
    g.fillStyle = n ? '#6c5444' : '#d7ae7c'; g.beginPath(); g.moveTo(x0 - clamp(3 * k, 30, 90), oy + 1); g.quadraticCurveTo(x0 - 4, oy - clamp(0.8 * k, 6, 20), x0 - 1, oy + 1); g.closePath(); g.fill();
    scree(g, x0, oy, k);
  }
}

/** The places this file draws, by the registry's names. */
export const PLACE_ART = { mountain, forest, harbour, city, moon, mars, snow, desert };
