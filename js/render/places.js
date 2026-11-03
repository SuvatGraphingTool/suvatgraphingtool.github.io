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

import { env, rng, skyscape, grass, water, stone, tarmac, softShadow, floorboards } from './scenery.js';
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

/** A seaside pier: a timber deck on iron piles braced in X, railings and
    lamps along it, open at its end; the sea with its swell, the beach with
    its huts and a pavilion along the shore behind, gulls overhead. */
function pier(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(131), horizon = oy - clamp((oy - 40) * 0.25, 30, 130);
  sky(g, w, horizon, x0, { far: 'none', seed: 51, clouds: 3 });
  // the shore far behind: a strip of beach, huts in a row, a pavilion
  const sy = horizon - 2;
  g.fillStyle = n ? '#6f6253' : '#e2cfa4'; g.beginPath(); g.moveTo(0, sy + 6); g.lineTo(w * 0.55, sy + 2); g.lineTo(w * 0.55, sy + 6); g.lineTo(0, sy + 12); g.closePath(); g.fill();
  const huts = ['#c94f4f', '#4f86c9', '#e8c547', '#5fae7a', '#f2f0ea', '#c97a4f'];
  // small with distance, in a short row near the pier's root
  // a few huts, each with its pitched roof and a door
  for (let i = 0, x = x0 * 0.55 + 40; i < 7 && x < w * 0.5; i++, x += 17) {
    if (!clearOf(x, c, 40)) continue;
    g.fillStyle = withAlpha(huts[i % huts.length], n ? 0.5 : 0.85); g.fillRect(x, sy - 8, 11, 9);
    g.fillStyle = withAlpha(n ? '#9a9da3' : '#ffffff', 0.85); g.beginPath(); g.moveTo(x - 1.5, sy - 8); g.lineTo(x + 5.5, sy - 13); g.lineTo(x + 12.5, sy - 8); g.closePath(); g.fill();
    g.fillStyle = withAlpha('#2a2a2e', 0.6); g.fillRect(x + 3.5, sy - 5, 4, 6);
  }
  // the pavilion along the shore behind the pier's root, clear of the flight
  const px = H0 > 0 ? clamp(x0 * 0.35, 10, Math.max(10, x0 - 50)) : Math.max(10, x0 - 120);
  g.fillStyle = n ? '#8e8a90' : '#f4f1ea'; g.fillRect(px, sy - 16, 34, 16);
  g.fillStyle = n ? '#5d6a7a' : '#7a96b0'; g.beginPath(); g.arc(px + 17, sy - 16, 9, Math.PI, 0); g.fill();
  water(g, 0, w, horizon, h, { phase });
  // gulls
  g.strokeStyle = withAlpha(n ? '#d8d8dc' : '#4a4e56', 0.8); g.lineWidth = 1.3;
  for (let i = 0; i < 4; i++) { const gx = x0 + (w - x0) * (0.2 + i * 0.2) + Math.sin(phase + i) * 6, gy = horizon * (0.25 + 0.12 * (i % 2)), gs = 5 + (i % 3) * 2; g.beginPath(); g.moveTo(gx - gs, gy); g.quadraticCurveTo(gx - gs / 2, gy - gs * 0.6, gx, gy); g.quadraticCurveTo(gx + gs / 2, gy - gs * 0.6, gx + gs, gy); g.stroke(); }
  if (!(H0 > 0)) return;
  const deck = clamp(0.35 * k, 5, 12), wood = n ? '#7a5e48' : '#9c7651', woodLo = n ? '#4b3a2e' : '#6a4f36', iron = n ? '#3e4247' : '#4c5359';
  // the piles: iron columns down into the water, braced in X between them
  const bay = clamp(3 * k, 34, 120), wl = oy;
  const piles = []; for (let x = x0 - 6; x > -bay; x -= bay) piles.push(x);
  g.strokeStyle = iron; g.lineWidth = Math.max(1.2, clamp(0.08 * k, 1, 3));
  for (let i = 0; i < piles.length - 1; i++) { const a = piles[i], b2 = piles[i + 1], y1 = top + deck, y2 = lerp(top + deck, wl, 0.6); g.beginPath(); g.moveTo(a, y1); g.lineTo(b2, y2); g.moveTo(b2, y1); g.lineTo(a, y2); g.stroke(); g.beginPath(); g.moveTo(a, y2); g.lineTo(b2, y2); g.stroke(); }
  for (const x of piles) {
    const pw = clamp(0.35 * k, 4, 12);
    const pg = g.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0); pg.addColorStop(0, withAlpha('#ffffff', 0.25)); pg.addColorStop(0.3, iron); pg.addColorStop(1, '#202326');
    g.fillStyle = iron; g.fillRect(x - pw / 2, top + deck, pw, wl - top - deck + 6); g.fillStyle = pg; g.fillRect(x - pw / 2, top + deck, pw, wl - top - deck + 6);
    g.fillStyle = withAlpha(n ? '#2c3b2c' : '#3f5a3a', 0.85); g.fillRect(x - pw / 2 - 1, wl - clamp(0.6 * k, 6, 20), pw + 2, clamp(0.6 * k, 6, 20));
    g.fillStyle = withAlpha('#ffffff', 0.35); g.fillRect(x - pw * 0.8, wl - 1 + Math.sin(phase * 2 + x) * 1.2, pw * 1.6, 2);
  }
  // the deck: planks seen edge on, a lit top, its shadow on the water
  g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(-4, wl + 2, x0 + 4, 4);
  g.fillStyle = wood; g.fillRect(-4, top, x0 + 4, deck);
  g.fillStyle = withAlpha('#ffffff', n ? 0.1 : 0.3); g.fillRect(-4, top, x0 + 4, 1.5);
  g.fillStyle = woodLo; g.fillRect(-4, top + deck * 0.65, x0 + 4, deck * 0.35);
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1; for (let x = x0 - 3; x > 0; x -= 9) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + deck * 0.65); g.stroke(); }
  // railings and lamps, the last stretch at its end left open
  const rh = clamp(1.1 * k, 12, 40), open = clamp(2 * k, 26, 80), post = clamp(1.6 * k, 16, 50);
  g.strokeStyle = n ? '#c8c2b8' : '#eae5dc'; g.lineWidth = Math.max(1.4, clamp(0.06 * k, 1.2, 3));
  g.beginPath(); g.moveTo(-4, top - rh); g.lineTo(x0 - open, top - rh); g.moveTo(-4, top - rh * 0.5); g.lineTo(x0 - open, top - rh * 0.5); g.stroke();
  for (let x = x0 - open; x > -4; x -= post) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, top - rh); g.stroke(); }
  const lh = clamp(4 * k, 40, 140);
  for (let x = x0 - open - post * 0.5; x > 0; x -= post * 5) {
    g.strokeStyle = n ? '#2c3a3a' : '#2f5d5a'; g.lineWidth = Math.max(2, clamp(0.1 * k, 2, 4)); g.beginPath(); g.moveTo(x, top); g.lineTo(x, top - lh); g.stroke();
    g.fillStyle = n ? E.window : '#f4ecd2'; g.beginPath(); g.arc(x, top - lh - 4, clamp(0.2 * k, 3, 7), 0, TAU); g.fill();
    if (n) { const lg = g.createRadialGradient(x, top - lh - 4, 0, x, top - lh - 4, 40); lg.addColorStop(0, withAlpha(E.window, 0.4)); lg.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = lg; g.fillRect(x - 40, top - lh - 44, 80, 80); }
  }
}

/** A building site: a scaffold of tubes, ledgers and boards up the face of
    a frame of concrete floors, a tower crane behind with its jib out over
    the site, a load on its hook; the ground of mud and gravel with ruts, a
    skip and a heap of sand. */
function site(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(137);
  skyscape(g, 0, 0, w, oy, { far: 'skyline', seed: 23, clouds: 3, farHeight: clamp((oy - 40) * 0.35, 30, 180), sun: false });
  // the crane: a lattice mast, the jib out over the site, the counter-jib
  // and its weights, the cab, a trolley and a load on its hook
  const steel = n ? '#b49a3a' : '#e0b43c', steelLo = n ? '#7d6a28' : '#b08a2a';
  const mx = clamp(x0 - clamp(0.35 * H0 * k, 60, 200) - 40, 30, w * 0.4), mw = clamp(1.6 * k, 10, 26);
  const jy = clamp(Math.min(top, oy - 60) - clamp(0.4 * (oy - top), 40, 160), 30, oy - 60), jl = Math.min(w - mx - 10, clamp(30 * k, 200, w * 0.75)), cj = jl * 0.3;
  g.strokeStyle = steel; g.lineWidth = Math.max(1.4, mw * 0.12);
  g.beginPath(); g.moveTo(mx, oy); g.lineTo(mx, jy); g.moveTo(mx + mw, oy); g.lineTo(mx + mw, jy); g.stroke();
  g.lineWidth = Math.max(0.8, mw * 0.06); g.beginPath();
  for (let y = oy; y > jy + mw; y -= mw) { g.moveTo(mx, y); g.lineTo(mx + mw, y - mw); g.moveTo(mx, y - mw); g.lineTo(mx + mw, y - mw); }
  g.stroke();
  const jh = mw * 0.8;
  g.lineWidth = Math.max(1.2, mw * 0.1); g.beginPath(); g.moveTo(mx - cj, jy); g.lineTo(mx + mw + jl, jy); g.moveTo(mx - cj, jy - jh); g.lineTo(mx + mw + jl, jy - jh * 0.3); g.stroke();
  g.lineWidth = Math.max(0.7, mw * 0.05); g.beginPath();
  for (let x = mx - cj; x < mx + mw + jl - jh; x += jh) { const t1 = (x - mx + cj) / (cj + mw + jl); g.moveTo(x, jy); g.lineTo(x + jh, jy - jh * lerp(1, 0.3, t1)); }
  g.stroke();
  g.strokeStyle = steelLo; g.lineWidth = 1; g.beginPath(); g.moveTo(mx + mw / 2, jy - mw * 2.5); g.lineTo(mx + mw + jl * 0.75, jy - jh * 0.4); g.moveTo(mx + mw / 2, jy - mw * 2.5); g.lineTo(mx - cj, jy - jh); g.stroke();
  g.fillStyle = steel; g.fillRect(mx - mw * 0.1, jy - mw * 2.5, mw * 1.2, mw * 1.5);
  g.fillStyle = n ? '#5b5f66' : '#7a8088'; g.fillRect(mx - cj, jy - jh * 0.2, cj * 0.35, jh * 1.6);
  g.fillStyle = n ? '#3c4450' : '#d9e2ea'; g.fillRect(mx + mw, jy + 2, mw * 1.1, mw * 0.9); g.fillStyle = n ? withAlpha(E.window, 0.7) : '#6f8fac'; g.fillRect(mx + mw + mw * 0.15, jy + mw * 0.15, mw * 0.8, mw * 0.4);
  // the load hangs over the building, behind where it is launched from,
  // never in the flight's way
  const lw = clamp(1.4 * k, 18, 46);
  const tx = H0 > 0 ? x0 - clamp(0.35 * H0 * k, 60, 200) * 0.5 : Math.max(20, mx + mw + 12);
  const ly = H0 > 0 ? Math.max(jy + 14, lerp(jy, top - lw * 0.45 - 30, 0.5)) : lerp(jy, oy, 0.3);
  g.strokeStyle = withAlpha(n ? '#d8d8dc' : '#2a2a2e', 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(tx - 2, jy + 2); g.lineTo(tx - 2, ly); g.moveTo(tx + 2, jy + 2); g.lineTo(tx + 2, ly); g.stroke();
  g.fillStyle = n ? '#8a7a40' : '#d9a62a'; g.fillRect(tx - 5, ly, 10, 7);
  g.strokeStyle = withAlpha('#2a2a2e', 0.7); g.beginPath(); g.moveTo(tx, ly + 7); g.lineTo(tx - lw / 2, ly + 18); g.moveTo(tx, ly + 7); g.lineTo(tx + lw / 2, ly + 18); g.stroke();
  g.fillStyle = n ? '#7a4a3a' : '#b45a3c'; g.fillRect(tx - lw / 2, ly + 18, lw, lw * 0.45);
  g.strokeStyle = withAlpha('#000000', 0.3); for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(tx - lw / 2, ly + 18 + lw * 0.15 * i); g.lineTo(tx + lw / 2, ly + 18 + lw * 0.15 * i); g.stroke(); }
  // the ground: mud and gravel, ruts, a skip and a heap of sand
  const gg = g.createLinearGradient(0, oy, 0, h); gg.addColorStop(0, n ? '#4a4038' : '#8b7458'); gg.addColorStop(1, n ? '#3a322c' : '#6e5a44');
  g.fillStyle = gg; g.fillRect(0, oy, w, h - oy);
  g.fillStyle = withAlpha(n ? '#2a241f' : '#5a4836', 0.6); for (let i = 0; i < (w * (h - oy)) / 70; i++) g.fillRect(r() * w, oy + r() * (h - oy), 2, 1.5);
  g.strokeStyle = withAlpha(n ? '#2a241f' : '#5a4836', 0.7); g.lineWidth = 2;
  for (const o of [8, 18]) { g.beginPath(); g.moveTo(0, oy + o); g.bezierCurveTo(w * 0.3, oy + o + 6, w * 0.6, oy + o - 2, w, oy + o + 10); g.stroke(); }
  const skx = x0 + (w - x0) * 0.7;
  if (clearOf(skx, c, 80) && skx < w - 30) {
    const sw = clamp(3.5 * k, 40, 110), shh = sw * 0.4;
    g.fillStyle = n ? '#7a6a30' : '#e0a72a'; g.beginPath(); g.moveTo(skx - sw / 2, oy - shh); g.lineTo(skx + sw / 2, oy - shh); g.lineTo(skx + sw * 0.38, oy); g.lineTo(skx - sw * 0.38, oy); g.closePath(); g.fill();
    g.fillStyle = withAlpha('#000000', 0.25); g.fillRect(skx - sw / 2, oy - shh, sw, 3);
    g.fillStyle = n ? '#5c5048' : '#8a7a6a'; for (let i = 0; i < 5; i++) g.fillRect(skx - sw * 0.4 + i * sw * 0.17, oy - shh - 3 - r() * 4, sw * 0.12, 4);
  }
  const hx = x0 + (w - x0) * 0.35;
  if (clearOf(hx, c, 70)) { g.fillStyle = n ? '#8a7a5a' : '#d9bf86'; g.beginPath(); g.moveTo(hx - 30, oy + 1); g.quadraticCurveTo(hx, oy - clamp(1.2 * k, 10, 30), hx + 34, oy + 1); g.closePath(); g.fill(); }
  if (!(H0 > 0)) return;
  // the frame behind: concrete floors on columns, open between
  const sw = clamp(0.35 * H0 * k, 60, 200), fx = x0 - sw, lift = clamp(2 * k, 16, 60), conc = n ? '#7a7672' : '#bdb6ad';
  g.fillStyle = withAlpha(n ? '#2a2a30' : '#5d5e66', 0.85); g.fillRect(fx - 20, top - lift * 0.5, sw + 10, oy - top + lift * 0.5);
  for (let y = oy - lift; y > top - lift * 0.5; y -= lift) { g.fillStyle = conc; g.fillRect(fx - 20, y, sw + 10, Math.max(3, lift * 0.12)); }
  for (let x = fx - 16; x < x0 - 10; x += clamp(4 * k, 30, 100)) { g.fillStyle = conc; g.fillRect(x, top - lift * 0.5, Math.max(3, lift * 0.12), oy - top + lift * 0.5); }
  // the scaffold in front of it: standards, ledgers at each lift, boards, braces
  const tube = n ? '#a8adb3' : '#8d949b', board = n ? '#7a6248' : '#b08a5c';
  g.strokeStyle = tube; g.lineWidth = Math.max(1.4, clamp(0.06 * k, 1.2, 3));
  const stds = []; for (let x = x0 - 2; x > fx - 10; x -= clamp(2 * k, 20, 70)) stds.push(x);
  g.beginPath(); for (const x of stds) { g.moveTo(x, oy); g.lineTo(x, top - clamp(1 * k, 10, 30)); } g.stroke();
  for (let y = top; y < oy - 2; y += lift) {
    g.strokeStyle = tube; g.beginPath(); g.moveTo(stds[stds.length - 1], y); g.lineTo(x0, y); g.stroke();
    g.fillStyle = board; g.fillRect(stds[stds.length - 1], y - 4, x0 - stds[stds.length - 1], 4);
    g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(stds[stds.length - 1], y, x0 - stds[stds.length - 1], 1.5);
  }
  g.strokeStyle = tube; g.lineWidth = 1; g.beginPath();
  for (let i = 0; i < stds.length - 1; i++) for (let y = top; y < oy - lift; y += lift * 2) { g.moveTo(stds[i], y); g.lineTo(stds[i + 1], y + lift); }
  g.stroke();
  // a guard rail along the top lift, open at its end where it is thrown from
  g.strokeStyle = tube; g.lineWidth = Math.max(1.4, clamp(0.06 * k, 1.2, 3)); g.beginPath(); g.moveTo(stds[stds.length - 1], top - clamp(1 * k, 10, 30)); g.lineTo(x0 - clamp(1.6 * k, 20, 60), top - clamp(1 * k, 10, 30)); g.stroke();
  // safety netting over the back of the scaffold
  g.fillStyle = withAlpha(n ? '#2f4a3a' : '#4f8a5f', 0.35); g.fillRect(fx - 20, top + lift * 0.2, (x0 - fx) * 0.45, oy - top - lift * 0.2);
  softShadow(g, (fx + x0) / 2, oy + 2, (x0 - fx) * 0.6, 5, 0.7);
}

/** Banded rock: horizontal strata between y0 and y1 across [xa, xb], each
    band its own tone with a wavering edge, so a wall of it reads as rock
    laid down in layers. */
function strata(g, xa, xb, y0, y1, tones, r, wobble = 3) {
  const n = tones.length, H = y1 - y0;
  let y = y0;
  for (let i = 0; y < y1; i++) {
    const th = H * (0.06 + r() * 0.1), c = tones[i % n], ph = r() * 9;
    g.fillStyle = c; g.beginPath(); g.moveTo(xa, y1 + 2);
    for (let x = xa; x <= xb + 8; x += 8) g.lineTo(x, y + Math.sin(x / 37 + ph) * wobble);
    g.lineTo(xb + 8, y1 + 2); g.closePath(); g.fill();
    y += th;
  }
}

/** A canyon: a sky over far mesas, the canyon's far wall across the river
    in banded red rock, buttresses and gullies in shadow down it, a talus
    slope at its foot; the river in the gorge, green with silt; the near rim
    it leaves from, sandstone, with a juniper clinging to it; a raven. */
function canyon(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(139);
  // the far rim lower than the near one, so sky shows over it
  const rim = H0 > 0 ? lerp(top, oy, 0.32) : oy - clamp((oy - 40) * 0.45, 60, 260), horizon = rim - clamp((oy - rim) * 0.12, 10, 40);
  sky(g, w, horizon, x0, { far: 'none', seed: 61, clouds: 2 });
  // far mesas and buttes on the skyline, standing on the far rim: stepped
  // sides of talus and cliff, flat caprock lit along its top, hazed with distance
  const far = n ? '#544a4c' : '#d8bf98', farLo = n ? '#443c3e' : '#c0a47c';
  for (let x = -40 + r() * 60; x < w + 40; x += 150 + r() * 170) {
    const mw = 50 + r() * 130, mh = clamp((rim - horizon) * (0.9 + r() * 1.2) + 10, 14, 70), base = rim + 4, topY = base - mh;
    const step = mh * (0.35 + r() * 0.2);
    g.fillStyle = far; g.beginPath(); g.moveTo(x - mw * 0.35, base);
    g.lineTo(x - mw * 0.12, base - step); g.lineTo(x - mw * 0.05, topY + 2); g.lineTo(x, topY);
    g.lineTo(x + mw, topY); g.lineTo(x + mw + mw * 0.04, topY + 3); g.lineTo(x + mw + mw * 0.1, base - step); g.lineTo(x + mw + mw * 0.32, base);
    g.closePath(); g.fill();
    // its shaded side and the talus apron, its lit caprock
    g.fillStyle = farLo; g.beginPath(); g.moveTo(x + mw * 0.7, topY + 3); g.lineTo(x + mw + mw * 0.04, topY + 3); g.lineTo(x + mw + mw * 0.1, base - step); g.lineTo(x + mw + mw * 0.32, base); g.lineTo(x + mw * 0.6, base); g.closePath(); g.fill();
    g.fillStyle = withAlpha('#ffffff', n ? 0.08 : 0.3); g.fillRect(x, topY, mw, 2);
    g.strokeStyle = withAlpha('#5a2a1a', 0.18); g.lineWidth = 1; for (let yy = topY + 6; yy < base - step; yy += 5) { g.beginPath(); g.moveTo(x - mw * 0.05, yy); g.lineTo(x + mw, yy); g.stroke(); }
  }
  // haze over them, the sky's own tone
  g.fillStyle = withAlpha(n ? '#2a2c3a' : '#e9dcd4', 0.35); g.fillRect(0, horizon - 80, w, rim - horizon + 84);
  // the far wall: layers of red and cream rock from its rim down to the river
  // ochre, buff and cream: banded rock held clear of the velocity's orange
  const wallTones = n ? ['#5e5444', '#6a5e4a', '#544a3c', '#787058', '#625846'] : ['#c4a066', '#d6b98a', '#b0915e', '#e3d0a8', '#c8aa78', '#a08458'];
  g.save(); g.beginPath(); g.moveTo(0, oy + 2);
  const edge = (x) => rim + Math.sin(x / 90) * 6 + Math.sin(x / 23) * 2;
  for (let x = 0; x <= w + 10; x += 10) g.lineTo(x, edge(x));
  g.lineTo(w + 10, oy + 2); g.closePath(); g.clip();
  strata(g, 0, w, rim - 8, oy, wallTones, r, 3);
  // buttresses standing out of the wall: each a lit face and a shadowed
  // side, wandering down from a notch in the rim and widening at the foot
  for (let x = r() * 80; x < w; x += 110 + r() * 140) {
    const bw = 30 + r() * 50, H = oy - rim, pts = [];
    for (let i = 0; i <= 6; i++) pts.push({ x: x + (r() - 0.5) * 10 + (i / 6) * bw * 0.3, y: rim + (H * i) / 6 });
    g.fillStyle = withAlpha('#2a1410', n ? 0.42 : 0.3); g.beginPath(); g.moveTo(pts[0].x, rim - 4);
    for (const q of pts) g.lineTo(q.x, q.y);
    g.lineTo(pts[6].x + bw * 0.5, oy); g.quadraticCurveTo(pts[3].x + bw * 0.2, rim + H * 0.4, pts[0].x + bw * 0.12, rim - 4); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#ffffff', n ? 0.05 : 0.16); g.lineWidth = 1.2; g.beginPath(); for (const q of pts) g.lineTo(q.x - 1, q.y); g.stroke();
  }
  // ledges along the bands, each a lit lip over a line of shadow, broken here and there
  for (let y = rim + 6; y < oy - 8; y += 9 + r() * 16) {
    for (let x = r() * 40; x < w; x += 40 + r() * 90) {
      const L = 20 + r() * 70;
      g.fillStyle = withAlpha('#2a1410', n ? 0.3 : 0.22); g.fillRect(x, y + 1.5, L, 2);
      g.fillStyle = withAlpha('#ffffff', n ? 0.04 : 0.16); g.fillRect(x, y, L * 0.9, 1);
    }
  }
  // it is far: hazed toward the sky's tone, the gorge's depths in shadow
  g.fillStyle = withAlpha(n ? '#2a2a3a' : '#e8d2c4', n ? 0.25 : 0.3); g.fillRect(0, rim - 10, w, oy - rim + 12);
  const dz = g.createLinearGradient(0, rim, 0, oy); dz.addColorStop(0, withAlpha(n ? '#1d1a26' : '#f3d9c4', 0)); dz.addColorStop(1, withAlpha(n ? '#1d1a26' : '#5a4a36', 0.4));
  g.fillStyle = dz; g.fillRect(0, rim - 10, w, oy - rim + 12);
  g.restore();
  // its rim, catching the light
  g.strokeStyle = withAlpha(n ? '#b08a78' : '#f6dcc0', 0.7); g.lineWidth = 1.4; g.beginPath(); for (let x = 0; x <= w + 10; x += 10) g.lineTo(x, edge(x)); g.stroke();
  // the talus at its foot: fans of fallen rock down to the water
  const tal = clamp((oy - rim) * 0.12, 8, 50);
  g.fillStyle = n ? '#4a4236' : '#9c8460';
  g.beginPath(); g.moveTo(0, oy); for (let x = 0; x <= w + 10; x += 14) g.lineTo(x, oy - tal * (0.4 + 0.6 * Math.abs(Math.sin(x / 80 + 1)))); g.lineTo(w + 10, oy); g.closePath(); g.fill();
  g.fillStyle = withAlpha(n ? '#2a1e1c' : '#6a4434', 0.6); for (let i = 0; i < w / 9; i++) { const x = r() * w; g.fillRect(x, oy - r() * tal * 0.6 - 2, 2 + r() * 3, 2); }
  // the river: green with silt, a pale line where it meets the rock
  water(g, 0, w, oy, h, { phase });
  g.fillStyle = withAlpha(n ? '#1f4038' : '#4f8a74', 0.38); g.fillRect(0, oy, w, h - oy);
  g.fillStyle = withAlpha('#ffffff', 0.35); g.fillRect(0, oy, w, 1.5);
  // a raven, wheeling over the gorge
  if (!n) { const bx = x0 + (w - x0) * 0.55 + Math.sin(phase * 0.7) * 20, by = lerp(rim, oy, 0.25), bs = 7; g.strokeStyle = withAlpha('#2a2426', 0.85); g.lineWidth = 1.6; g.beginPath(); g.moveTo(bx - bs, by - 2); g.quadraticCurveTo(bx - bs / 2, by - bs * 0.6, bx, by); g.quadraticCurveTo(bx + bs / 2, by - bs * 0.6, bx + bs, by - 2); g.stroke(); }
  if (!(H0 > 0)) return;
  // the near rim it leaves from: sandstone, banded, its foot in the river
  seaCliff(g, -4, x0, top, oy, { cap: false, tones: rockTones(n ? '#8a7a62' : '#e2c79a', n ? '#6a5c48' : '#c4a272', n ? '#3a3226' : '#7a6040') });
  g.save(); g.globalAlpha = 0.35; const H = oy - top;
  for (const f of [0.18, 0.4, 0.58, 0.8]) { g.fillStyle = f === 0.4 || f === 0.8 ? '#f2d2b0' : '#5a2a1a'; g.fillRect(-4, top + H * f, x0 - 6 - H * 0.05 * f, Math.max(2, H * 0.03)); }
  g.restore();
  // a slab cap, a little proud of the face
  g.fillStyle = n ? '#a0927a' : '#efdcb4'; g.beginPath(); g.moveTo(-4, top - 3); g.lineTo(x0 + 3, top - 3); g.lineTo(x0 + 1, top + 4); g.lineTo(-4, top + 5); g.closePath(); g.fill();
  // a juniper clinging to the rim, back from the edge
  const jx = x0 - clamp(4 * k, 40, 110), js = clamp(2.2 * k, 16, 46);
  if (jx > 12) {
    g.strokeStyle = n ? '#4a3a30' : '#6e5440'; g.lineWidth = Math.max(1.5, js * 0.08); g.beginPath(); g.moveTo(jx, top); g.quadraticCurveTo(jx - js * 0.2, top - js * 0.4, jx + js * 0.1, top - js * 0.7); g.stroke();
    for (const [dx, dy, rr] of [[-0.25, -0.65, 0.3], [0.15, -0.8, 0.32], [0.05, -0.55, 0.26], [-0.05, -0.95, 0.22]]) { g.fillStyle = n ? '#2c3a2c' : '#5d7a50'; g.beginPath(); g.ellipse(jx + dx * js, top + dy * js, rr * js, rr * js * 0.7, 0, 0, TAU); g.fill(); g.fillStyle = withAlpha('#ffffff', n ? 0.04 : 0.14); g.beginPath(); g.ellipse(jx + dx * js - rr * js * 0.3, top + dy * js - rr * js * 0.2, rr * js * 0.45, rr * js * 0.3, 0, 0, TAU); g.fill(); }
  }
}

/** A waterfall: a wooded gorge, the river coming over the lip of a mossy
    rock step and pouring down its face in a white curtain into a plunge
    pool, spray rising from it; it leaves from the dry rock at the lip,
    beside the fall, and lands in the pool. */
function waterfall(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(149);
  const horizon = oy - clamp((oy - 40) * 0.45, 60, 280);
  sky(g, w, horizon, x0, { far: 'none', seed: 71, clouds: 3 });
  // the wooded sides of the gorge: banks of trees, far ones pale with mist
  for (const [f, tone, mist] of [[0, n ? '#26302a' : '#7d9a82', 0.45], [0.35, n ? '#1f2a22' : '#4f6e4f', 0.2], [0.7, n ? '#1a241c' : '#3c5a3c', 0]]) {
    const base = lerp(horizon, oy, f) + 6;
    g.fillStyle = tone; g.beginPath(); g.moveTo(-10, oy + 2);
    for (let x = -10; x <= w + 12; x += 12) g.lineTo(x, base - 14 - Math.abs(Math.sin(x / 19 + f * 7)) * 12 - Math.sin(x / 70 + f) * 8);
    g.lineTo(w + 12, oy + 2); g.closePath(); g.fill();
    for (let x = r() * 30; x < w; x += 18 + r() * 26) pine(g, x, base - 8 - Math.sin(x / 70 + f) * 8, 14 + f * 20 + r() * 10, tone, withAlpha('#ffffff', n ? 0.05 : 0.12));
    if (mist) { g.fillStyle = withAlpha(n ? '#3a4450' : '#e6eef0', mist); g.fillRect(0, base - 40, w, oy - base + 40); }
  }
  // wet rock on the far bank, and the pool and the river running on
  g.fillStyle = n ? '#2c3230' : '#5d6660'; g.beginPath(); g.moveTo(0, oy); for (let x = 0; x <= w + 10; x += 16) g.lineTo(x, oy - 4 - Math.abs(Math.sin(x / 31)) * 6); g.lineTo(w + 10, oy); g.closePath(); g.fill();
  water(g, 0, w, oy, h, { phase });
  g.fillStyle = withAlpha(n ? '#1e3a3a' : '#3f7a74', 0.3); g.fillRect(0, oy, w, h - oy);
  // the fall: in the face itself, its foot churning the pool white
  // (a fish leaping it from the pool below brings the fall it leaps at: behind it, a few metres high)
  const fallTop = H0 > 0 ? top : c.leap ? oy - clamp(3 * k, 50, 180) : null, fH = fallTop == null ? 0 : oy - fallTop;
  const ex = H0 > 0 ? x0 : x0 - clamp(1.5 * k, 20, 60);
  const fw = fallTop != null ? clamp(0.4 * fH, 24, 140) : 0, fx1 = ex - clamp(1.2 * k, 12, 40), fx0 = fx1 - fw;
  if (fallTop != null) { const top = fallTop, x0 = ex;
    seaCliff(g, -4, x0, top, oy, { foam: false, tones: rockTones(n ? '#5a605a' : '#8c938a', n ? '#454a46' : '#6c736c', n ? '#262a28' : '#3e4440') });
    // moss on the ledges of the step
    g.fillStyle = withAlpha(n ? '#2e4a2a' : '#5f8a3c', 0.55);
    for (let y = top + 6; y < oy - 8; y += 10 + r() * 18) g.fillRect(-4, y, x0 - 8 - r() * 20, 2 + r() * 3);
    // the river above, running to the lip behind the dry rock it leaves from
    const rd = clamp(0.4 * k, 5, 12);
    g.fillStyle = n ? '#2f4650' : '#6f97a6'; g.fillRect(-4, top - rd * 0.4, fx1 + 4, rd);
    g.fillStyle = withAlpha('#ffffff', 0.7); g.fillRect(-4, top - rd * 0.4, fx1 + 4, 1.5);
    g.fillStyle = withAlpha('#ffffff', 0.55); for (let x = -4 + ((phase * 30) % 18); x < fx0; x += 18) g.fillRect(x, top - rd * 0.4 + 3, 7, 1);
    // the curtain: ribbons of white water, each its own width and brightness,
    // ragged and thinning at the edges, sliding down the face
    const H = oy - top;
    for (let x = fx0, i = 0; x <= fx1; x += 2.5, i++) {
      const f = (x - fx0) / Math.max(1, fx1 - fx0), edge = Math.min(f, 1 - f) * 2, len = H * (edge > 0.25 ? 1 : 0.55 + r() * 0.45);
      const a = (0.35 + 0.55 * Math.min(1, edge * 2.5)) * (0.7 + r() * 0.3);
      const lg = g.createLinearGradient(0, top, 0, top + len);
      lg.addColorStop(0, withAlpha(n ? '#c8d4d8' : '#ffffff', a)); lg.addColorStop(0.7, withAlpha(n ? '#9ab0b8' : '#e6f2f6', a * 0.9)); lg.addColorStop(1, withAlpha(n ? '#9ab0b8' : '#e6f2f6', 0));
      g.strokeStyle = lg; g.lineWidth = 2 + r() * 2;
      g.beginPath(); g.moveTo(x, top - 1); g.quadraticCurveTo(x + 2 + r() * 2, top + len * 0.5, x - 1 + (r() - 0.5) * 3, top + len); g.stroke();
    }
    // the falling water's texture: streaks running down it
    g.save(); g.setLineDash([6, 10]); g.lineDashOffset = -phase * 160; g.strokeStyle = withAlpha(n ? '#6a8088' : '#9cc2cc', 0.55); g.lineWidth = 1;
    for (let x = fx0 + 3; x < fx1 - 2; x += 4) { g.beginPath(); g.moveTo(x, top + 4); g.lineTo(x + 1, oy - 4); g.stroke(); }
    g.restore();
    // its lip: the water bulging over the edge, lit
    g.strokeStyle = withAlpha('#ffffff', 0.95); g.lineWidth = 2.5; g.beginPath(); g.moveTo(fx0 - 2, top); g.quadraticCurveTo((fx0 + fx1) / 2, top - 5, fx1 + 1, top); g.stroke();
    // the dry rock at the lip it leaves from, a step proud of the water
    g.fillStyle = n ? '#5a605a' : '#8c938a'; g.fillRect(fx1, top - 4, x0 - fx1 + 2, 5);
    g.fillStyle = withAlpha('#ffffff', n ? 0.06 : 0.25); g.fillRect(fx1, top - 4, x0 - fx1 + 2, 1.2);
  }
  // the plunge pool: foam rings round where the fall strikes, spray rising
  const px = fallTop != null ? (fx0 + fx1) / 2 : x0 * 0.5;
  g.save(); g.beginPath(); g.rect(-4, 0, fallTop != null ? ex + clamp(3 * k, 30, 90) : w, h); g.clip();
  for (let i = 0; i < 3; i++) { const q = ((phase * 0.6 + i / 3) % 1); g.strokeStyle = withAlpha('#ffffff', 0.6 * (1 - q)); g.lineWidth = 1.4; g.beginPath(); g.ellipse(px, oy + 2, (fw * 0.6 + 10) * (0.6 + q), 4 * (0.6 + q), 0, 0, TAU); g.stroke(); }
  for (let i = 0; i < 6; i++) { const sx = px + (r() - 0.5) * (fw + 20), Rr = 12 + r() * 18, sy = oy - 6 - r() * 26 - ((phase * 10 + i * 5) % 12); const sg = g.createRadialGradient(sx, sy, 0, sx, sy, Rr); sg.addColorStop(0, withAlpha('#ffffff', n ? 0.25 : 0.55)); sg.addColorStop(1, withAlpha('#ffffff', 0)); g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, Rr, 0, TAU); g.fill(); }
  g.restore();
}

/** A lighthouse on its rock: the open sea to a misted headland, the tower
    in white and red bands tapering up to its gallery, the lantern above in
    its glazing and cupola; it leaves from the gallery's rail. At night its
    beam sweeps the sky. */
function lighthouse(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(151);
  const horizon = oy - clamp((oy - 40) * 0.22, 30, 120);
  sky(g, w, horizon, x0, { far: 'none', seed: 81, clouds: 3 });
  // a headland far off on the right, misted
  const hx = w * 0.62, hh = clamp(horizon * 0.08, 10, 34);
  g.fillStyle = n ? '#3b3239' : '#b2a7a8'; g.beginPath(); g.moveTo(hx, horizon); g.quadraticCurveTo(hx + hh * 3, horizon - hh * 1.3, hx + hh * 7, horizon - hh); g.lineTo(w, horizon - hh * 0.9); g.lineTo(w, horizon); g.closePath(); g.fill();
  water(g, 0, w, horizon, h, { phase });
  // a sail far out
  const bx = x0 + (w - x0) * 0.72; if (clearOf(bx, c, 50)) { g.fillStyle = n ? '#8a8e96' : '#f6f4ee'; g.beginPath(); g.moveTo(bx, horizon + 3); g.lineTo(bx + 4, horizon - 12); g.lineTo(bx + 9, horizon + 3); g.closePath(); g.fill(); g.fillStyle = n ? '#4a4e56' : '#5a6470'; g.fillRect(bx - 2, horizon + 3, 13, 2.5); }
  if (!(H0 > 0)) return;
  // the tower: tapering, its foot on a rock, the gallery out at x0
  const gal = clamp(0.8 * k, 8, 26), Wt = clamp(0.16 * (oy - top), 26, 110), Wb = Wt * 1.45;
  const cx = x0 - gal - Wt / 2, foot = oy - clamp(1.5 * k, 10, 40);
  // the rock it stands on, washed at its foot
  g.fillStyle = n ? '#3a3a3e' : '#6e6a66'; g.beginPath(); g.moveTo(cx - Wb * 1.3, oy + 4); g.quadraticCurveTo(cx - Wb, foot - 6, cx - Wb * 0.3, foot); g.lineTo(cx + Wb * 0.6, foot); g.quadraticCurveTo(cx + Wb * 1.1, foot + 2, cx + Wb * 1.05, oy + 4); g.closePath(); g.fill();
  g.fillStyle = withAlpha('#ffffff', n ? 0.05 : 0.18); g.beginPath(); g.moveTo(cx - Wb * 0.3, foot); g.lineTo(cx + Wb * 0.6, foot); g.lineTo(cx + Wb * 0.55, foot + 3); g.lineTo(cx - Wb * 0.4, foot + 3); g.closePath(); g.fill();
  g.strokeStyle = withAlpha('#ffffff', 0.7); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - Wb * 1.3, oy + 1 + Math.sin(phase * 2) * 1.2); g.quadraticCurveTo(cx, oy - 2, cx + Wb * 1.05, oy + 1 + Math.cos(phase * 2) * 1.2); g.stroke();
  const tower = () => { g.beginPath(); g.moveTo(cx - Wb / 2, foot); g.lineTo(cx - Wt / 2, top); g.lineTo(cx + Wt / 2, top); g.lineTo(cx + Wb / 2, foot); g.closePath(); };
  g.save(); tower(); g.clip();
  const white = n ? '#c8c2bc' : '#f6f2ea', red = n ? '#7a3434' : '#c8383a', bands = 5, bh = (foot - top) / bands;
  for (let i = 0; i < bands; i++) { g.fillStyle = i % 2 ? red : white; g.fillRect(cx - Wb, top + i * bh, Wb * 2, bh + 1); }
  // round: lit on the left, shaded to the right
  const sg = g.createLinearGradient(cx - Wb / 2, 0, cx + Wb / 2, 0);
  sg.addColorStop(0, withAlpha('#ffffff', 0.25)); sg.addColorStop(0.35, withAlpha('#ffffff', 0)); sg.addColorStop(1, withAlpha('#000000', 0.35));
  g.fillStyle = sg; g.fillRect(cx - Wb, top, Wb * 2, foot - top);
  // its windows up the stair, in a line
  g.fillStyle = n ? withAlpha(E.window, 0.85) : '#2e3440';
  for (let i = 1; i < bands * 2; i += 2) { const y = top + (i * bh) / 2, ww = Math.max(2.5, Wt * 0.09); g.fillRect(cx - ww / 2 - Wt * 0.08, y - ww, ww, ww * 1.8); }
  g.restore();
  // a door at its foot
  g.fillStyle = n ? '#3a2e2a' : '#4a3a30'; g.beginPath(); g.roundRect(cx - Wb * 0.12, foot - Wb * 0.38, Wb * 0.24, Wb * 0.38, [Wb * 0.12, Wb * 0.12, 0, 0]); g.fill();
  // the gallery: a deck round the top, on brackets, with its rail
  const deck = Math.max(3, gal * 0.3), rail = clamp(1 * k, 9, 30);
  g.fillStyle = n ? '#2c2e33' : '#2f3540'; g.fillRect(cx - Wt / 2 - gal, top, Wt + gal * 2, deck);
  g.strokeStyle = n ? '#2c2e33' : '#2f3540'; g.lineWidth = 1.4;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * (Wt / 2 + gal), top + deck); g.lineTo(cx + s * Wt / 2, top + deck + gal * 1.2); g.stroke(); }
  g.beginPath(); g.moveTo(cx - Wt / 2 - gal, top - rail); g.lineTo(x0, top - rail); g.moveTo(cx - Wt / 2 - gal, top - rail * 0.5); g.lineTo(x0, top - rail * 0.5); g.stroke();
  for (let x = cx - Wt / 2 - gal; x <= x0 + 0.5; x += Math.max(4, (Wt + gal * 2) / 8)) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, top - rail); g.stroke(); }
  // the lantern: glazing in its frame, the light inside, a cupola and its vane
  const lw = Wt * 0.78, lh = clamp(2.4 * k, 18, 70), ly = top - lh;
  g.fillStyle = n ? withAlpha(E.window, 0.9) : withAlpha('#dff0f4', 0.95); g.fillRect(cx - lw / 2, ly, lw, lh);
  g.strokeStyle = n ? '#2c2e33' : '#2f3540'; g.lineWidth = 1.2; g.strokeRect(cx - lw / 2, ly, lw, lh);
  for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(cx - lw / 2 + (lw * i) / 3, ly); g.lineTo(cx - lw / 2 + (lw * i) / 3, top); g.stroke(); }
  g.fillStyle = n ? '#fff3c4' : '#f2d36b'; g.beginPath(); g.arc(cx, ly + lh * 0.5, Math.max(2.5, lw * 0.14), 0, TAU); g.fill();
  g.fillStyle = red; g.beginPath(); g.moveTo(cx - lw / 2 - 2, ly); g.quadraticCurveTo(cx, ly - lw * 0.75, cx + lw / 2 + 2, ly); g.closePath(); g.fill();
  g.strokeStyle = n ? '#2c2e33' : '#2f3540'; g.beginPath(); g.moveTo(cx, ly - lw * 0.37); g.lineTo(cx, ly - lw * 0.37 - lh * 0.4); g.stroke();
  // at night, its beam turning: a wedge of light swinging out and back, away from the stage
  if (n) {
    const a = Math.sin(phase * 0.8) * 0.35 - 0.05, L = w * 0.7, sp = 0.07, lx = cx, lyy = ly + lh * 0.5;
    const bg = g.createLinearGradient(lx, lyy, lx + Math.cos(a) * L, lyy + Math.sin(a) * L * 0.2);
    bg.addColorStop(0, withAlpha(E.window, 0.3)); bg.addColorStop(1, withAlpha(E.window, 0));
    g.fillStyle = bg; g.beginPath(); g.moveTo(lx, lyy); g.lineTo(lx + Math.cos(a - sp) * L, lyy + Math.sin(a - sp) * L * 0.2); g.lineTo(lx + Math.cos(a + sp) * L, lyy + Math.sin(a + sp) * L * 0.2); g.closePath(); g.fill();
  }
  softShadow(g, cx, foot + 1, Wb * 0.7, 3, 0.6);
}

/* ── sports grounds ─────────────────────────────────────────────────────── */

/** A crowd on tiers: heads and shoulders in a seeded scatter of colours,
    row by row between x0 and x1 along each tier's line. */
function crowd(g, x0, x1, rows, r, n) {
  const shirts = n ? ['#5a5560', '#6a5a50', '#4a5a6a', '#7a6a5a', '#8a8890'] : ['#c94f4f', '#4f86c9', '#e8c547', '#f2f0ea', '#5fae7a', '#2f3340', '#d98a4a', '#8a5bb0'];
  const skin = n ? ['#7d6253', '#5e483c'] : ['#d9a988', '#a87a5a', '#7a4e36', '#e6bfa0'];
  for (const { y, s } of rows) {
    for (let x = x0 + r() * s; x < x1; x += s * (0.9 + r() * 0.5)) {
      if (r() < 0.12) continue;
      g.fillStyle = shirts[Math.floor(r() * shirts.length)]; g.fillRect(x - s * 0.4, y - s * 0.5, s * 0.8, s * 0.6);
      g.fillStyle = skin[Math.floor(r() * skin.length)]; g.beginPath(); g.arc(x, y - s * 0.75, s * 0.28, 0, TAU); g.fill();
    }
  }
}

/** The stand across the ground, along the horizon: a long roofed stand
    with its tiers and crowd, an advertising board along its foot and a
    floodlight pylon at each end. */
function farStand(g, w, horizon, r, n, { tall = 60 } = {}) {
  const base = horizon, top = base - tall, roof = top - tall * 0.25;
  // the floodlight pylons, behind the stand's ends
  for (const px of [w * 0.06, w * 0.94]) {
    g.strokeStyle = n ? '#5a5e66' : '#9aa0a8'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, base); g.lineTo(px, roof - tall * 0.9); g.stroke();
    g.fillStyle = n ? '#2c2e33' : '#6a7078'; g.fillRect(px - 12, roof - tall * 0.9 - 10, 24, 12);
    g.fillStyle = n ? '#fff6d8' : '#f2f4f6'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.fillRect(px - 10 + i * 5.5, roof - tall * 0.9 - 8 + j * 5, 4, 3.5);
    if (n) { const lg = g.createRadialGradient(px, roof - tall * 0.9 - 4, 0, px, roof - tall * 0.9 - 4, 70); lg.addColorStop(0, 'rgba(255,246,216,0.45)'); lg.addColorStop(1, 'rgba(255,246,216,0)'); g.fillStyle = lg; g.fillRect(px - 70, roof - tall * 0.9 - 74, 140, 140); }
  }
  // the stand: a raked bowl of seats, the roof over it on its trusses
  g.fillStyle = n ? '#3a3c44' : '#8c9098'; g.beginPath(); g.moveTo(0, base); g.lineTo(0, top); g.lineTo(w, top); g.lineTo(w, base); g.closePath(); g.fill();
  const rows = []; for (let y = base - 8, s = 4.2; y > top + 4; y -= s * 1.25, s *= 0.94) rows.push({ y, s });
  crowd(g, 0, w, rows, r, n);
  g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(0, top, w, tall * 0.2);
  g.fillStyle = n ? '#2a2c32' : '#d8dce0'; g.fillRect(-2, roof, w + 4, tall * 0.14);
  g.fillStyle = n ? '#1e2026' : '#5a5e66'; g.fillRect(-2, roof + tall * 0.14, w + 4, top - roof - tall * 0.14);
  g.strokeStyle = n ? '#4a4e56' : '#b8bcc2'; g.lineWidth = 1; g.beginPath();
  for (let x = 20; x < w; x += 60) { g.moveTo(x, roof + tall * 0.14); g.lineTo(x + 30, top); g.lineTo(x + 60, roof + tall * 0.14); }
  g.stroke();
  // the boards along its foot, panels in turn
  const bh = Math.max(6, tall * 0.12), boards = n ? ['#3a4a6a', '#5a3a3a', '#3a5a4a'] : ['#2f5fa8', '#c8383a', '#2fa36b', '#f2b705'];
  for (let x = 0, i = 0; x < w; x += 70, i++) { g.fillStyle = boards[i % boards.length]; g.fillRect(x, base - bh, 70, bh); g.fillStyle = withAlpha('#ffffff', n ? 0.25 : 0.7); g.fillRect(x + 14, base - bh * 0.62, 40, bh * 0.25); }
}

/** A pitch's or a field's turf from y0 down to y1: mown in stripes that
    widen toward the viewer, a white line along its far edge. */
function mownTurf(g, w, y0, y1, n, { lo = '#5f9a48', hi = '#6fae55', line = true } = {}) {
  const L = n ? '#2f4a2c' : lo, Hc = n ? '#36542f' : hi;
  g.fillStyle = L; g.fillRect(0, y0, w, y1 - y0);
  for (let y = y0, i = 0, d = 4; y < y1; y += d, d *= 1.32, i++) if (i % 2) { g.fillStyle = Hc; g.fillRect(0, y, w, d); }
  if (line) { g.fillStyle = withAlpha('#ffffff', n ? 0.5 : 0.85); g.fillRect(0, y0 + 2, w, 1.5); }
}

/** A grandstand to throw from, seen end on: its concrete end wall in
    section, an upper tier stepping up and back from its front edge at x0
    (`top` up), cantilevered over a lower tier set back beneath it, a
    spectator seated on every step, a roof on its column over the back.
    What leaves from the front edge falls clear of both tiers. */
function grandstand(g, x0, top, oy, k, r, n, { roof = true } = {}) {
  const H = oy - top, depth = clamp(H * 1.1, 70, 300), rise = H * 0.4;
  const conc = n ? '#5e6066' : '#b4b8be', concLo = n ? '#45474c' : '#8e9298', shade = n ? '#2c2e33' : '#6a6e76';
  const shirts = n ? ['#5a5560', '#6a5a50', '#4a5a6a', '#7a6a5a'] : ['#2f5fa8', '#e8c547', '#f2f0ea', '#5fae7a', '#2f3340', '#8a5bb0'];
  // a stepped tier from its front edge (fx, fy) up and back: `steps` treads
  const tier = (fx, fy, d, up, steps, under) => {
    const tw = d / steps, rh = up / steps, pts = [{ x: fx, y: fy }];
    for (let i = 0; i < steps; i++) { const x = fx - i * tw, y = fy - i * rh; pts.push({ x, y: y - rh }, { x: x - tw, y: y - rh }); }
    const bx = fx - d, by = fy - up;
    g.fillStyle = conc; g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const q of pts) g.lineTo(q.x, q.y); g.lineTo(bx, under); g.lineTo(fx, under); g.closePath(); g.fill();
    // each tread lit, each riser's shadow
    for (let i = 0; i < steps; i++) { const x = fx - i * tw, y = fy - (i + 1) * rh; g.fillStyle = withAlpha('#ffffff', n ? 0.06 : 0.25); g.fillRect(x - tw, y, tw, 1.2); g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(x - 1.5, y, 1.5, rh); }
    // a spectator on each step, seated, facing the pitch
    for (let i = 1; i < steps; i++) {
      if (r() < 0.15) continue;
      const x = fx - i * tw - tw * 0.45, y = fy - i * rh, s = clamp(tw * 0.55, 3.5, 9);
      g.fillStyle = shirts[Math.floor(r() * shirts.length)]; g.beginPath(); g.roundRect(x - s * 0.45, y - s * 1.5, s * 0.9, s * 1.1, s * 0.25); g.fill();
      g.fillStyle = n ? '#7d6253' : ['#d9a988', '#a87a5a', '#7a4e36'][Math.floor(r() * 3)]; g.beginPath(); g.arc(x + s * 0.05, y - s * 1.85, s * 0.36, 0, TAU); g.fill();
    }
    return { bx, by };
  };
  // the lower tier, set back under the overhang
  const lowFront = x0 - clamp(H * 0.2, 14, 70), lowUp = H * 0.4;
  tier(lowFront, oy, depth * 0.7, lowUp, 8, oy + 2);
  g.fillStyle = concLo; g.fillRect(-4, oy - lowUp, Math.max(0, lowFront - depth * 0.7 + 4), lowUp + 2);
  // the upper tier on its slab, the soffit in shadow beneath it
  const slab = clamp(0.4 * k, 4, 12), back = tier(x0, top, depth, rise, 10, top + slab);
  g.fillStyle = shade; g.beginPath(); g.moveTo(x0, top + slab); g.lineTo(back.bx, top + slab); g.lineTo(back.bx, top + slab + 3); g.lineTo(x0 - 4, top + slab + 3); g.closePath(); g.fill();
  g.fillStyle = concLo; g.fillRect(-4, back.by, Math.max(0, back.bx + 4), oy - lowUp - back.by);
  // a column under the back of the upper tier, down to the lower tier
  g.fillStyle = concLo; g.fillRect(back.bx + depth * 0.15, top + slab, clamp(0.4 * k, 4, 10), oy - lowUp - top - slab + lowUp * 0.6);
  // the front parapet it leaves from
  g.fillStyle = n ? '#7a7c82' : '#d8dce0'; g.fillRect(x0 - clamp(0.4 * k, 4, 10), top - clamp(0.9 * k, 7, 22), clamp(0.4 * k, 4, 10), clamp(0.9 * k, 7, 22));
  // the roof: a column at the back, the cantilever out over the upper tier, its tie
  if (roof) {
    const roofY = back.by - clamp(H * 0.3, 20, 90), colX = back.bx + 4, tip = x0 - depth * 0.15;
    g.fillStyle = shade; g.fillRect(colX - 3, roofY, 6, back.by - roofY);
    g.beginPath(); g.moveTo(colX - 10, roofY); g.lineTo(tip, roofY + 4); g.lineTo(tip, roofY + 9); g.lineTo(colX - 10, roofY + 10); g.closePath(); g.fill();
    g.strokeStyle = shade; g.lineWidth = 1.2; g.beginPath(); g.moveTo(colX, roofY - clamp(H * 0.12, 8, 30)); g.lineTo(tip, roofY + 4); g.moveTo(colX, roofY - clamp(H * 0.12, 8, 30)); g.lineTo(colX, roofY); g.stroke();
  }
  softShadow(g, x0 - depth * 0.4, oy + 2, depth * 0.6, 5, 0.6);
}

/** A football stadium: the stand across the pitch with its crowd and
    floodlights, the pitch mown in stripes; from a height, the front of the
    near stand's upper tier. */
function pitch(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(157);
  // the far stand lower than the near one it is thrown from
  const horizon = H0 > 0 ? Math.max(oy - clamp((oy - 40) * 0.32, 40, 170), Math.min(oy - 30, top + 60)) : oy - clamp((oy - 40) * 0.32, 40, 170);
  sky(g, w, horizon - 60, x0, { far: 'none', seed: 91, clouds: 2 });
  if (n) { g.fillStyle = withAlpha('#2a3550', 0.5); g.fillRect(0, 0, w, horizon); }
  farStand(g, w, horizon, r, n, { tall: Math.min(clamp((horizon - 20) * 0.35, 30, 90), H0 > 0 ? Math.max(20, horizon - top - 8) : 90) });
  mownTurf(g, w, horizon, h, n);
  if (n) { const fl = g.createLinearGradient(0, horizon, 0, h); fl.addColorStop(0, 'rgba(255,246,216,0.12)'); fl.addColorStop(1, 'rgba(255,246,216,0)'); g.fillStyle = fl; g.fillRect(0, horizon, w, h - horizon); }
  // the near touchline
  g.fillStyle = withAlpha('#ffffff', n ? 0.5 : 0.85); g.fillRect(0, oy + clamp((h - oy) * 0.5, 14, 60), w, 2.5);
  if (H0 > 0) grandstand(g, x0, top, oy, k, r, n);
}

/** A golf course: a tree line with a clubhouse beyond, the fairway mown in
    stripes between the rough, a bunker clear of where it lands, and the
    green with its pin and flag a little beyond the landing; from a height,
    a raised tee on its wall of railway sleepers. */
function golf(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(163);
  const horizon = oy - clamp((oy - 40) * 0.3, 36, 150);
  sky(g, w, horizon, x0, { far: 'none', seed: 101, clouds: 3 });
  // the tree line: rounded crowns, darker below, along the far edge
  for (let x = -10 + r() * 20; x < w + 20; x += 18 + r() * 22) {
    if (x > clamp(x0 * 0.5, 20, w * 0.25) - 10 && x < clamp(x0 * 0.5, 20, w * 0.25) + clamp(6 * k, 50, 120) + 10) continue;
    const R = 12 + r() * 14, ty = horizon - R * 0.6;
    g.fillStyle = n ? '#1c2a1c' : '#3f6a3a'; g.beginPath(); g.arc(x, ty, R, 0, TAU); g.fill();
    g.fillStyle = n ? '#243424' : '#4f7c45'; g.beginPath(); g.arc(x - R * 0.25, ty - R * 0.25, R * 0.6, 0, TAU); g.fill();
  }
  // the clubhouse, white with a dark roof, in front of the tree line
  const cx = clamp(x0 * 0.5, 20, w * 0.25), cw = clamp(6 * k, 50, 120), ch = cw * 0.35;
  g.fillStyle = n ? '#8a8a90' : '#f4f1ea'; g.fillRect(cx, horizon - ch, cw, ch);
  g.fillStyle = n ? '#3a3036' : '#5a4038'; g.beginPath(); g.moveTo(cx - 6, horizon - ch); g.lineTo(cx + cw * 0.5, horizon - ch * 1.7); g.lineTo(cx + cw + 6, horizon - ch); g.closePath(); g.fill();
  g.fillStyle = n ? withAlpha(E.window, 0.85) : '#4a5a6a'; for (let i = 0; i < 5; i++) g.fillRect(cx + cw * 0.08 + i * cw * 0.19, horizon - ch * 0.7, cw * 0.1, ch * 0.35);
  // the rough, then the fairway in its stripes, then the near rough
  const rg = g.createLinearGradient(0, horizon, 0, h); rg.addColorStop(0, n ? '#2a3a26' : '#5b7f3e'); rg.addColorStop(1, n ? '#223020' : '#4c6d33');
  g.fillStyle = rg; g.fillRect(0, horizon, w, h - horizon);
  const fw0 = lerp(horizon, oy, 0.35), fw1 = oy + clamp((h - oy) * 0.4, 10, 50);
  g.save(); g.beginPath(); g.rect(0, fw0, w, fw1 - fw0); g.clip();
  mownTurf(g, w, fw0, h, n, { lo: '#7ab351', hi: '#86bf5c', line: false });
  g.restore();
  // the fairway's edge, a shade darker where it meets the rough
  g.fillStyle = withAlpha('#000000', 0.12); g.fillRect(0, fw1, w, 3);
  // the near rough: tufts of long grass, larger toward the viewer, a few
  // daisies and a scatter of fallen leaves
  g.lineWidth = 1.2;
  for (let i = 0; i < (w * (h - fw1)) / 90; i++) {
    const x = r() * w, y = fw1 + 4 + r() * (h - fw1 - 4), s = 3 + ((y - fw1) / Math.max(1, h - fw1)) * 7;
    g.strokeStyle = r() < 0.5 ? (n ? '#1a2618' : '#3e5c2a') : (n ? '#34482e' : '#6e9450');
    g.beginPath(); g.moveTo(x - s * 0.4, y - s); g.lineTo(x, y); g.lineTo(x + s * 0.1, y - s * 1.2); g.moveTo(x, y); g.lineTo(x + s * 0.5, y - s * 0.9); g.stroke();
  }
  if (!n) for (let i = 0; i < w / 40; i++) { const x = r() * w, y = fw1 + 10 + r() * (h - fw1 - 10); g.fillStyle = '#f6f4ee'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); g.fillStyle = '#e8c547'; g.fillRect(x - 0.5, y - 0.5, 1, 1); }
  // a bunker: raked sand in a hollow with a turf lip, never where it lands
  const bx = x0 + (w - x0) * 0.3;
  if (clearOf(bx, c, 90)) {
    const bw = clamp(5 * k, 50, 140);
    g.fillStyle = n ? '#6e6250' : '#e8d6a6'; g.beginPath(); g.ellipse(bx, oy - 2, bw / 2, bw * 0.08, 0, 0, TAU); g.fill();
    g.strokeStyle = withAlpha(n ? '#4a4030' : '#c9b07c', 0.8); g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(bx, oy - 2, bw * (0.3 + i * 0.03), bw * 0.04, 0, Math.PI, TAU); g.stroke(); }
    g.fillStyle = withAlpha('#000000', 0.18); g.beginPath(); g.ellipse(bx, oy - 2 - bw * 0.04, bw / 2, bw * 0.04, 0, Math.PI, TAU); g.fill();
  }
  // the green round where it lands, and the pin just beyond, its flag waving
  const land = (c.clearX || [])[0];
  if (land != null && land > x0 + 20) {
    const gw = clamp(10 * k, 70, 220);
    g.fillStyle = n ? '#4f7a44' : '#9ccc6a'; g.beginPath(); g.ellipse(land + gw * 0.1, oy, gw / 2, clamp(gw * 0.05, 4, 10), 0, 0, TAU); g.fill();
    g.strokeStyle = withAlpha('#ffffff', n ? 0.05 : 0.2); g.lineWidth = 1; g.beginPath(); g.ellipse(land + gw * 0.1, oy, gw / 2, clamp(gw * 0.05, 4, 10), 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    // the pin beyond the landing, clear of the label that names the surface there
    const px = land + clamp(4 * k, 60, 110), ph = clamp(2.2 * k, 26, 60);
    g.fillStyle = '#1b1d22'; g.beginPath(); g.ellipse(px, oy, 3.5, 1.4, 0, 0, TAU); g.fill();
    g.strokeStyle = n ? '#c8c8cc' : '#f4f4f4'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px, oy); g.lineTo(px, oy - ph); g.stroke();
    const wv = Math.sin(phase * 4) * 2;
    g.fillStyle = n ? '#b8a040' : '#f2c21b'; g.beginPath(); g.moveTo(px, oy - ph); g.quadraticCurveTo(px + ph * 0.18, oy - ph + wv - 2, px + ph * 0.36, oy - ph + ph * 0.1 + wv); g.lineTo(px, oy - ph + ph * 0.24); g.closePath(); g.fill();
  }
  if (H0 > 0) {
    // the raised tee: a bank of turf on a wall of railway sleepers
    const tw = clamp(H0 * k * 1.2, 60, 220), sl = n ? '#4a3a2c' : '#6e5038', slHi = n ? '#5a4a3a' : '#8a6a4a';
    g.fillStyle = n ? '#3c5a34' : '#6a9a48'; g.beginPath(); g.moveTo(x0, top); g.lineTo(x0 - tw, top); g.quadraticCurveTo(x0 - tw - (oy - top) * 0.6, lerp(top, oy, 0.4), x0 - tw - (oy - top) * 1.4, oy + 2); g.lineTo(x0, oy + 2); g.closePath(); g.fill();
    const sh = clamp(0.25 * k, 4, 10);
    for (let y = top, i = 0; y < oy; y += sh, i++) { g.fillStyle = i % 2 ? sl : slHi; g.fillRect(x0 - clamp(1.2 * k, 10, 30), y, clamp(1.2 * k, 10, 30), Math.min(sh, oy - y)); g.fillStyle = withAlpha('#000000', 0.3); g.fillRect(x0 - clamp(1.2 * k, 10, 30), y + sh - 1, clamp(1.2 * k, 10, 30), 1); }
    g.fillStyle = n ? '#6a9a58' : '#9ccc6a'; g.fillRect(x0 - tw, top - 2, tw, 3);
    // the tee markers: two short painted pegs, not balls
    for (const [mx, col] of [[0.85, '#2f5fa8'], [0.55, '#e8c547']]) { g.fillStyle = col; g.fillRect(x0 - tw * mx - 2, top - 7, 4, 7); g.fillStyle = withAlpha('#000000', 0.3); g.fillRect(x0 - tw * mx + 1, top - 7, 1, 7); }
  }
}

/** An athletics stadium: the stand across with its crowd and floodlights,
    the far straight's red lanes, the infield turf with white arcs every
    ten metres from where it is thrown; the near track along the front;
    from a height, the front of the near stand. */
function stadium(g, c) {
  const { w, h, k, X, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(167);
  const horizon = H0 > 0 ? Math.max(oy - clamp((oy - 40) * 0.34, 44, 180), Math.min(oy - 30, top + 60)) : oy - clamp((oy - 40) * 0.34, 44, 180);
  sky(g, w, horizon - 60, x0, { far: 'none', seed: 111, clouds: 2 });
  if (n) { g.fillStyle = withAlpha('#2a3550', 0.5); g.fillRect(0, 0, w, horizon); }
  farStand(g, w, horizon, r, n, { tall: Math.min(clamp((horizon - 20) * 0.35, 30, 90), H0 > 0 ? Math.max(20, horizon - top - 8) : 90) });
  // the far straight: red lanes, white lines
  // a blue track (some are), so the path never crosses a red one: rule 2
  const lane = clamp((oy - horizon) * 0.06, 3, 10), red = n ? '#2c3e5a' : '#4a72a8';
  g.fillStyle = red; g.fillRect(0, horizon, w, lane * 6);
  g.fillStyle = withAlpha('#ffffff', n ? 0.5 : 0.85); for (let i = 0; i <= 6; i++) g.fillRect(0, horizon + i * lane, w, 1);
  // the infield
  mownTurf(g, w, horizon + lane * 6, h, n, { line: false });
  // a long jump: the runway up to the take-off board where it leaves, the sand pit
  // from a metre past the board to beyond where it lands, raked, its kerb
  const jump = c.who === 'diver' && !(H0 > 0);
  if (jump && X) {
    const land = (c.clearX || [])[0] ?? X(8), yF = oy - clamp((oy - horizon) * 0.1, 4, 12), yN = oy + clamp((h - oy) * 0.18, 5, 18), s2 = 0.3;
    const quad = (a, b, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(a + (oy - yF) * s2, yF); g.lineTo(b + (oy - yF) * s2, yF); g.lineTo(b - (yN - oy) * s2, yN); g.lineTo(a - (yN - oy) * s2, yN); g.closePath(); g.fill(); };
    quad(-20, x0, red);
    quad(x0 - clamp(0.2 * k, 4, 10), x0, n ? '#c8c8c8' : '#ffffff');
    const p0 = Math.min(X(1), land - 20), p1 = Math.max(land + clamp(2 * k, 20, 80), X(1) + 40);
    quad(p0 - 4, p1 + 4, n ? '#4a4a46' : '#a8a8a2');
    quad(p0, p1, n ? '#8a7a5a' : '#e2cc96');
    g.strokeStyle = withAlpha(n ? '#5a4a30' : '#b89a5a', 0.7); g.lineWidth = 1; for (let x = p0 + 6; x < p1; x += 9) { g.beginPath(); g.moveTo(x + (oy - yF) * s2, yF + 2); g.lineTo(x - (yN - oy) * s2, yN - 2); g.stroke(); }
  }
  // the throwing arcs, every ten metres out from where it is thrown
  if (X && !jump) {
    g.strokeStyle = withAlpha('#ffffff', n ? 0.4 : 0.75); g.lineWidth = 1.4;
    // out to just past where it lands, never a tangle of them
    const land = (c.clearX || [])[0] ?? w, step = (land - X(0)) / (X(10) - X(0)) > 8 ? 20 : 10;
    for (let d = step; X(d) < Math.min(w + 40, land + (X(step) - X(0))); d += step) { const R = X(d) - X(0), E2 = clamp(R * 0.09, 5, 26); g.beginPath(); g.ellipse(X(0), oy, R, E2, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.ellipse(X(0), oy, R, E2, 0, Math.PI * 0.08, Math.PI * 0.3); g.stroke(); }
  }
  // the near track along the front of the frame
  const ny = oy + clamp((h - oy) * 0.45, 16, 70);
  // the near track: six lanes along the bottom of the frame, no more
  const nb = Math.min(h - ny, lane * 14);
  if (ny < h) { g.fillStyle = red; g.fillRect(0, h - nb, w, nb); g.fillStyle = withAlpha('#ffffff', n ? 0.5 : 0.85); for (let y = h - nb, i = 0; y < h && i < 8; y += lane * (1.6 + i * 0.4), i++) g.fillRect(0, y, w, 1.5); }
  if (H0 > 0) grandstand(g, x0, top, oy, k, r, n);
}

/* ── a ship, a dam, a playground ────────────────────────────────────────── */

/** A ship at sea, side on, its stern at x0: the hull dark above red
    antifouling at the waterline, a row of portholes, the white
    superstructure with its bridge windows, a funnel, lifeboats in their
    davits, a rail along the deck open at the stern; the sea to a far
    coast, gulls. */
function ship(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(173), horizon = oy - clamp((oy - 40) * 0.2, 30, 110);
  sky(g, w, horizon, x0, { far: 'none', seed: 121, clouds: 3 });
  // a far coast, low and misted, and a tanker on the horizon
  g.fillStyle = n ? '#3b3239' : '#a9a2a8'; g.beginPath(); g.moveTo(w * 0.5, horizon); g.quadraticCurveTo(w * 0.7, horizon - 16, w + 10, horizon - 10); g.lineTo(w + 10, horizon); g.closePath(); g.fill();
  const tx = x0 + (w - x0) * 0.75; if (clearOf(tx, c, 60)) { g.fillStyle = n ? '#4a4e56' : '#5a6470'; g.fillRect(tx - 24, horizon - 5, 48, 5); g.fillRect(tx + 12, horizon - 11, 8, 6); }
  water(g, 0, w, horizon, h, { phase });
  if (!(H0 > 0)) return;
  const bob = Math.sin(phase * 1.2) * 1.2;
  const fb = top + bob, wl = oy, hullTop = fb, len = Math.max(x0 + 40, w * 0.6);
  const xs = x0 - len;
  // the hull: dark, with a red band at the waterline, its stern raked back
  const rake = clamp((wl - fb) * 0.25, 6, 40);
  const hull = () => { g.beginPath(); g.moveTo(xs, hullTop); g.lineTo(x0, hullTop); g.lineTo(x0 - rake, wl + 6); g.lineTo(xs, wl + 6); g.closePath(); };
  hull(); const hg = g.createLinearGradient(0, hullTop, 0, wl); hg.addColorStop(0, n ? '#2a3448' : '#24324a'); hg.addColorStop(1, n ? '#1a2232' : '#18233a'); g.fillStyle = hg; g.fill();
  g.save(); hull(); g.clip();
  const band = clamp((wl - fb) * 0.18, 4, 20);
  g.fillStyle = n ? '#6a2a2a' : '#a8342e'; g.fillRect(xs, wl - band, len + 10, band + 8);
  g.fillStyle = withAlpha('#ffffff', n ? 0.6 : 0.9); g.fillRect(xs, wl - band - 2, len + 10, 2);
  // portholes in a row, a rubbing strake above them
  const ph = clamp(0.15 * k, 2, 4);
  g.fillStyle = n ? withAlpha(E.window, 0.8) : '#c9d6e0';
  for (let x = x0 - rake - 18; x > xs; x -= ph * 5) { g.beginPath(); g.arc(x, lerp(hullTop, wl - band, 0.45), ph, 0, TAU); g.fill(); }
  g.fillStyle = withAlpha('#ffffff', 0.2); g.fillRect(xs, hullTop + 3, len + 10, 1.5);
  // its plating: seams between the plates, a little rust weeping from them
  g.strokeStyle = withAlpha('#ffffff', n ? 0.05 : 0.09); g.lineWidth = 1;
  for (let x = x0 - 24; x > xs; x -= clamp(1.6 * k, 18, 46)) { g.beginPath(); g.moveTo(x, hullTop + 4); g.lineTo(x, wl - band - 2); g.stroke(); }
  for (const f of [0.3, 0.65]) { g.beginPath(); g.moveTo(xs, lerp(hullTop, wl - band, f)); g.lineTo(x0, lerp(hullTop, wl - band, f)); g.stroke(); }
  g.fillStyle = withAlpha('#8a5a3a', n ? 0.15 : 0.25); for (let i = 0; i < 8; i++) { const x = x0 - 30 - r() * (len * 0.6); g.fillRect(x, lerp(hullTop, wl - band, 0.3 + r() * 0.3), 1.5, (wl - hullTop) * (0.08 + r() * 0.12)); }
  // the anchor in its hawse pipe, near the stern
  const ax = x0 - rake - clamp(2.2 * k, 24, 60), ay = lerp(hullTop, wl - band, 0.25), as = clamp(0.5 * k, 5, 12);
  g.fillStyle = withAlpha('#000000', 0.45); g.beginPath(); g.ellipse(ax, ay, as * 0.7, as * 0.5, 0, 0, TAU); g.fill();
  g.strokeStyle = n ? '#5a5e66' : '#3a3e46'; g.lineWidth = Math.max(1.5, as * 0.25); g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay + as * 2); g.moveTo(ax - as, ay + as * 1.5); g.quadraticCurveTo(ax, ay + as * 2.6, ax + as, ay + as * 1.5); g.stroke();
  g.restore();
  // its wake at the stern and the foam along its waterline
  g.fillStyle = withAlpha('#ffffff', 0.55); for (let i = 0; i < 5; i++) { const fx = x0 - rake + 4 + i * 14 + Math.sin(phase * 2 + i) * 3; g.beginPath(); g.ellipse(fx, wl + 1, 10 - i, 1.6, 0, 0, TAU); g.fill(); }
  // white decks, the bridge's windows
  // the superstructure near the stern, behind whoever stands there, clear of the readouts
  const sx1 = x0 - clamp(0.1 * len, 34, 100), sh = Math.min(clamp(0.32 * (wl - fb), 18, 70), Math.max(14, (top - 20) / 1.7)), sw = clamp(0.18 * len, 50, 140);
  const white = n ? '#b8bcc4' : '#f4f2ee', whiteLo = n ? '#8a8e96' : '#d8d6d2';
  if (sx1 - sw > -60) {
    g.fillStyle = whiteLo; g.fillRect(sx1 - sw, hullTop - sh * 0.5, sw, sh * 0.5);
    g.fillStyle = white; g.fillRect(sx1 - sw * 0.85, hullTop - sh, sw * 0.7, sh * 0.5);
    g.fillStyle = n ? withAlpha(E.window, 0.85) : '#2e3a48';
    for (let x = sx1 - sw + 6; x < sx1 - 6; x += 10) g.fillRect(x, hullTop - sh * 0.38, 6, sh * 0.12);
    g.fillRect(sx1 - sw * 0.82, hullTop - sh * 0.88, sw * 0.64, sh * 0.14);
    // the funnel, its band in the line's colours, a wisp of exhaust
    const fx = sx1 - sw * 0.5, fw = sw * 0.16;
    g.fillStyle = n ? '#5a2a2a' : '#b5473f'; g.beginPath(); g.moveTo(fx - fw / 2, hullTop - sh); g.lineTo(fx - fw * 0.35, hullTop - sh * 1.5); g.lineTo(fx + fw * 0.55, hullTop - sh * 1.5); g.lineTo(fx + fw / 2, hullTop - sh); g.closePath(); g.fill();
    g.fillStyle = '#1b1d22'; g.fillRect(fx - fw * 0.35, hullTop - sh * 1.55, fw * 0.9, sh * 0.07);
    for (let i = 0; i < 4; i++) { g.fillStyle = withAlpha(n ? '#8a8e96' : '#c8c8cc', 0.35 - i * 0.07); g.beginPath(); g.arc(fx - 6 - i * 12, hullTop - sh * 1.62 - i * 4, 5 + i * 3, 0, TAU); g.fill(); }
    // lifeboats in their davits along the upper deck
    // lifeboats in their davits, hung from the upper deck (yellow, clear of the velocity hue)
    for (let x = sx1 - sw * 0.8; x < sx1 - sw * 0.2; x += sw * 0.3) {
      g.strokeStyle = n ? '#8a8e96' : '#4a4e56'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 2, hullTop - sh * 0.5); g.quadraticCurveTo(x - 2, hullTop - sh * 0.78, x + 4, hullTop - sh * 0.74); g.moveTo(x + sw * 0.2, hullTop - sh * 0.5); g.quadraticCurveTo(x + sw * 0.24, hullTop - sh * 0.78, x + sw * 0.18, hullTop - sh * 0.74); g.stroke();
      g.fillStyle = n ? '#a89a50' : '#e8c547'; g.beginPath(); g.roundRect(x + 2, hullTop - sh * 0.7, sw * 0.18, sh * 0.1, sh * 0.05); g.fill();
      g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(x + 2, hullTop - sh * 0.62, sw * 0.18, sh * 0.02);
    }
  }
  // the deck's rail, open at the stern where it is thrown from
  const rh = clamp(1 * k, 9, 28), gap = clamp(1.6 * k, 16, 50);
  // a dark rail against the sky (pale by night)
  g.strokeStyle = n ? '#c8ccd2' : '#2a2e36'; g.lineWidth = Math.max(1.5, clamp(0.06 * k, 1.2, 2.6));
  g.beginPath(); g.moveTo(Math.max(xs, sx1 + 4), hullTop - rh); g.lineTo(x0 - gap, hullTop - rh); g.moveTo(Math.max(xs, sx1 + 4), hullTop - rh * 0.5); g.lineTo(x0 - gap, hullTop - rh * 0.5); g.stroke();
  for (let x = x0 - gap; x > Math.max(xs, sx1 + 4); x -= rh) { g.beginPath(); g.moveTo(x, hullTop); g.lineTo(x, hullTop - rh); g.stroke(); }
  // at night the deck's edge catches the ship's own lights
  if (n) { g.fillStyle = withAlpha(E.window, 0.55); g.fillRect(xs, hullTop, len, 1.5); for (let x = x0 - rake - 12; x > xs; x -= 26) { const lg = g.createRadialGradient(x, hullTop - rh, 0, x, hullTop - rh, 14); lg.addColorStop(0, withAlpha(E.window, 0.35)); lg.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = lg; g.fillRect(x - 14, hullTop - rh - 14, 28, 28); } }
  // a bollard and a coil of rope on the deck by the stern
  g.fillStyle = n ? '#2b2628' : '#3b3436'; g.fillRect(x0 - gap * 0.7, hullTop - 7, 7, 7);
  g.strokeStyle = n ? '#8a7a5a' : '#c9a96a'; g.lineWidth = 2; g.beginPath(); g.ellipse(x0 - gap * 1.6, hullTop - 2, 7, 2.5, 0, 0, TAU); g.stroke();
}

/** A dam: the reservoir high behind it among hills, the concrete wall's
    crest with its road, rail and lamps, its face falling to the river,
    stained with seepage, the spillway pouring down beside it; it leaves
    from the crest's edge and lands in the river below. */
function dam(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(179);
  const horizon = H0 > 0 ? Math.min(top - 20, oy - clamp((oy - 40) * 0.4, 50, 260)) : oy - clamp((oy - 40) * 0.4, 50, 260);
  sky(g, w, horizon, x0, { far: 'none', seed: 131, clouds: 3 });
  // the valley sides behind, wooded, falling to the river
  for (const [f, tone] of [[0, n ? '#2a3428' : '#7f9a76'], [0.4, n ? '#232c22' : '#5f7f56'], [0.75, n ? '#1e271c' : '#4c6c44']]) {
    const base = lerp(horizon, oy, f);
    g.fillStyle = tone; g.beginPath(); g.moveTo(-10, oy + 2);
    for (let x = -10; x <= w + 12; x += 14) g.lineTo(x, base - 10 - 18 * Math.sin(x / 140 + f * 4) - Math.abs(Math.sin(x / 23 + f)) * 6);
    g.lineTo(w + 12, oy + 2); g.closePath(); g.fill();
    for (let x = r() * 20; x < w; x += 9 + r() * 12) { const y = base - 6 - 18 * Math.sin(x / 140 + f * 4); pine(g, x, y + r() * 8, 10 + f * 14 + r() * 6, tone, withAlpha('#ffffff', n ? 0.04 : 0.1)); }
  }
  water(g, 0, w, oy, h, { phase });
  g.fillStyle = withAlpha(n ? '#1e3a3a' : '#3f6a6a', 0.3); g.fillRect(0, oy, w, h - oy);
  if (!(H0 > 0)) return;
  const conc = n ? '#7a7a7e' : '#c4c0b8', concLo = n ? '#5a5a5e' : '#a29e96', crestW = clamp(0.25 * (oy - top), 30, 140);
  // the reservoir behind the wall, its surface just under the crest
  const res = top + clamp(0.06 * (oy - top), 4, 20);
  // the reservoir: a broad body of water seen across, behind the wall, its far shore the hills
  const lake = clamp(0.3 * (oy - top), 20, 120), lg = g.createLinearGradient(0, res, 0, res + lake);
  lg.addColorStop(0, n ? '#2f4650' : '#8fb0bc'); lg.addColorStop(1, n ? '#1e3038' : '#5e8290');
  g.fillStyle = lg; g.fillRect(-4, res, x0 - crestW + 8, lake);
  g.fillStyle = withAlpha('#ffffff', 0.5); g.fillRect(-4, res, x0 - crestW + 8, 1.2);
  g.strokeStyle = withAlpha('#ffffff', 0.25); g.lineWidth = 1; for (let i = 1; i < 5; i++) { const y = res + lake * (i / 5) ** 1.4; g.beginPath(); for (let x = -4; x < x0 - crestW; x += 14) { g.moveTo(x + ((i * 7 + phase * 10) % 14), y); g.lineTo(x + 6 + ((i * 7 + phase * 10) % 14), y); } g.stroke(); }
  // the wall: its face leaning back a little from the crest, lifts of
  // concrete in courses, seepage stains, the spillway's chute beside it
  const lean = clamp((oy - top) * 0.04, 2, 16);
  g.fillStyle = concLo; g.beginPath(); g.moveTo(x0 - crestW, top); g.lineTo(x0, top); g.lineTo(x0 - lean, oy + 4); g.lineTo(x0 - crestW - (oy - top) * 0.35, oy + 4); g.lineTo(x0 - crestW, res + 6); g.closePath(); g.fill();
  const fg = g.createLinearGradient(x0 - crestW, 0, x0, 0); fg.addColorStop(0, withAlpha('#000000', 0.15)); fg.addColorStop(1, withAlpha('#ffffff', n ? 0.04 : 0.18));
  g.fillStyle = fg; g.beginPath(); g.moveTo(x0 - crestW, top); g.lineTo(x0, top); g.lineTo(x0 - lean, oy + 4); g.lineTo(x0 - crestW - (oy - top) * 0.35, oy + 4); g.closePath(); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.14); g.lineWidth = 1;
  for (let y = top + clamp(1.5 * k, 8, 30); y < oy; y += clamp(1.5 * k, 8, 30)) { const f = (y - top) / (oy - top); g.beginPath(); g.moveTo(x0 - crestW - (oy - top) * 0.35 * f, y); g.lineTo(x0 - lean * f, y); g.stroke(); }
  g.fillStyle = withAlpha(n ? '#2a3028' : '#6a705c', 0.3);
  for (let i = 0; i < 6; i++) { const sx = x0 - crestW * (0.15 + r() * 0.8), sy = top + (oy - top) * r() * 0.5; g.fillRect(sx, sy, 2 + r() * 3, (oy - top) * (0.2 + r() * 0.4)); }
  // the spillway: water pouring white down a stepped chute, behind the face's far side
  // (from a gate in the crest at its back, down the wall's back slope in a white sheet)
  const sx0 = x0 - crestW - 2, sw = clamp(0.12 * (oy - top), 10, 50);
  g.fillStyle = conc; g.fillRect(sx0 - 3, top - clamp(1.2 * k, 8, 24), 4, clamp(1.2 * k, 8, 24) + 3); g.fillRect(sx0 + sw - 1, top - clamp(1.2 * k, 8, 24), 4, clamp(1.2 * k, 8, 24) + 3);
  g.fillStyle = withAlpha(n ? '#9ab0b8' : '#e6f2f4', 0.9); g.beginPath(); g.moveTo(sx0, top + 1); g.lineTo(sx0 + sw, top + 1); g.lineTo(sx0 + sw - (oy - top) * 0.33, oy); g.lineTo(sx0 - (oy - top) * 0.38, oy); g.closePath(); g.fill();
  g.strokeStyle = withAlpha(n ? '#6a8088' : '#a8c8d0', 0.8); g.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const off = ((phase * 90 + i * 37) % (oy - top)); g.beginPath(); g.moveTo(sx0 + sw * (0.2 + i * 0.15) - off * 0.35, top + off); g.lineTo(sx0 + sw * (0.2 + i * 0.15) - (off + 14) * 0.35, Math.min(oy, top + off + 14)); g.stroke(); }
  for (let i = 0; i < 4; i++) { const sg = g.createRadialGradient(sx0 - (oy - top) * 0.35 + i * 10, oy - 6, 0, sx0 - (oy - top) * 0.35 + i * 10, oy - 6, 20); sg.addColorStop(0, withAlpha('#ffffff', 0.5)); sg.addColorStop(1, withAlpha('#ffffff', 0)); g.fillStyle = sg; g.fillRect(sx0 - (oy - top) * 0.35 + i * 10 - 20, oy - 26, 40, 40); }
  // the crest: a road with its parapet, rail and lamps, open at the edge
  g.fillStyle = conc; g.fillRect(x0 - crestW - 6, top - 3, crestW + 6, 5);
  const rh = clamp(1 * k, 8, 26);
  g.strokeStyle = n ? '#c8ccd2' : '#5a5e66'; g.lineWidth = Math.max(1.3, clamp(0.05 * k, 1, 2.4));
  g.beginPath(); g.moveTo(x0 - crestW, top - rh); g.lineTo(x0 - clamp(1.6 * k, 14, 50), top - rh); g.stroke();
  for (let x = x0 - crestW; x < x0 - clamp(1.6 * k, 14, 50); x += rh) { g.beginPath(); g.moveTo(x, top - 3); g.lineTo(x, top - rh); g.stroke(); }
  const lh = clamp(4 * k, 30, 100), lx = x0 - crestW * 0.6;
  g.strokeStyle = n ? '#3a3e46' : '#4a4e56'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, top - 3); g.lineTo(lx, top - lh); g.lineTo(lx + 8, top - lh); g.stroke();
  g.fillStyle = n ? E.window : '#f4ecd2'; g.beginPath(); g.arc(lx + 8, top - lh + 3, 3, 0, TAU); g.fill();
}

/** A playground: a fence and trees, swings on an A-frame swaying, a
    see-saw and a roundabout, a soft rubber surface; from a height, the
    platform of a play tower with its roof, its slide going down behind. */
function playground(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(181), horizon = oy - clamp((oy - 40) * 0.3, 40, 150);
  sky(g, w, horizon, x0, { far: 'trees', seed: 141, clouds: 3 });
  // the grass behind, a fence along it and trees
  grass(g, 0, w, horizon, oy, { seed: 17 });
  g.strokeStyle = n ? '#6a6e76' : '#3f6a4a'; g.lineWidth = 1.4;
  const fy = lerp(horizon, oy, 0.25), fh = clamp(1.2 * k, 8, 24);
  g.beginPath(); g.moveTo(0, fy - fh); g.lineTo(w, fy - fh); for (let x = 0; x <= w; x += 6) { g.moveTo(x, fy); g.lineTo(x, fy - fh); } g.stroke();
  // trees behind the fence: a trunk forking into a crown of clumps, shaded below
  for (let x = r() * 80; x < w; x += 110 + r() * 120) {
    const tr = clamp(2.4 * k, 18, 44), ty = fy - fh;
    forestTree(g, x, ty + 4, tr * 3, Math.max(3, tr * 0.12), { bark: n ? '#3a3028' : '#6a5040', barkLo: n ? '#2a221c' : '#4a3828', leaf: n ? '#22321f' : '#4f7c45', leafLo: n ? '#18241a' : '#3a6034', leafHi: n ? '#2c3e28' : '#6f9c5a' }, r);
  }
  // the ground: grass, with a strip of soft blue-grey rubber where the play things stand
  grass(g, 0, w, oy, h, { seed: 19 });
  const mat = clamp((h - oy) * 0.18, 8, 30);
  g.fillStyle = n ? '#2e3440' : '#6a7d96'; g.fillRect(0, oy, w, mat);
  g.fillStyle = withAlpha('#000000', 0.12); for (let i = 0; i < (w * mat) / 50; i++) g.fillRect(r() * w, oy + r() * mat, 1.5, 1.5);
  g.fillStyle = withAlpha('#ffffff', n ? 0.06 : 0.25); g.fillRect(0, oy, w, 1.2);
  // the play things stand clear of the whole flight: behind where it starts, or past where it lands
  const land = (c.clearX || [])[0] ?? x0, free = (x, half) => (x + half < x0 - 30 || x - half > land + 40) && x - half > 10 && x + half < w - 10;
  const steel = n ? '#8a8e96' : '#2f6f9a', steelHi = n ? '#aab0b8' : '#e8b923';
  // the swings: an A-frame, two seats swinging in turn
  const swingHalf = clamp(2.6 * k, 34, 90) * 0.85;
  const sx = [land + 50 + swingHalf, w - swingHalf - 20, x0 - 60 - swingHalf, (x0 - 40) / 2].find((x) => free(x, swingHalf));
  if (sx != null) {
    const sh = clamp(2.6 * k, 34, 90), sw = sh * 1.1;
    g.strokeStyle = steel; g.lineWidth = Math.max(2, sh * 0.04);
    g.beginPath(); g.moveTo(sx - sw / 2 - sh * 0.25, oy); g.lineTo(sx - sw / 2, oy - sh); g.lineTo(sx + sw / 2, oy - sh); g.lineTo(sx + sw / 2 + sh * 0.25, oy); g.moveTo(sx - sw / 2 + sh * 0.2, oy); g.lineTo(sx - sw / 2, oy - sh); g.moveTo(sx + sw / 2 - sh * 0.2, oy); g.lineTo(sx + sw / 2, oy - sh); g.stroke();
    for (const [dx, ph] of [[-0.2, 0], [0.2, Math.PI]]) {
      const a = Math.sin(phase * 2 + ph) * 0.35, px = sx + dx * sw, L = sh * 0.78, ex = px + Math.sin(a) * L, ey = oy - sh + Math.cos(a) * L;
      g.strokeStyle = n ? '#9a9ea6' : '#6a6e76'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(px - 3, oy - sh); g.lineTo(ex - 3, ey); g.moveTo(px + 3, oy - sh); g.lineTo(ex + 3, ey); g.stroke();
      g.fillStyle = '#2b2628'; g.fillRect(ex - 6, ey - 1, 12, 3);
    }
  }
  // a see-saw, clear of the landing
  const ssHalf = clamp(3.5 * k, 40, 100) / 2;
  const ssx = [sx != null ? sx + swingHalf + ssHalf + 24 : null, land + 50 + ssHalf, x0 - 50 - ssHalf, sx != null ? sx - swingHalf - ssHalf - 24 : null, w - ssHalf - 20].find((x) => x != null && free(x, ssHalf) && (sx == null || Math.abs(x - sx) > swingHalf + ssHalf + 10));
  if (ssx != null) {
    const L = clamp(3.5 * k, 40, 100), tilt = Math.sin(phase * 1.2) * 0.18;
    g.fillStyle = steel; g.beginPath(); g.moveTo(ssx - 6, oy); g.lineTo(ssx, oy - L * 0.18); g.lineTo(ssx + 6, oy); g.closePath(); g.fill();
    g.save(); g.translate(ssx, oy - L * 0.18); g.rotate(tilt); g.fillStyle = steelHi; g.fillRect(-L / 2, -2, L, 4); g.fillStyle = '#2b2628'; for (const s of [-1, 1]) g.fillRect(s * L * 0.42 - 2, -8, 4, 6); g.restore();
  }
  if (!(H0 > 0)) return;
  // the play tower: four posts, a deck at the top, a roof, a ladder, a slide behind
  const tw = clamp(2 * k, 30, 90), tx0 = x0 - tw, post = Math.max(3, tw * 0.07), wood = n ? '#6a5040' : '#a87a4f', woodLo = n ? '#4a3830' : '#7a5636';
  g.fillStyle = woodLo; g.fillRect(tx0, top, post, oy - top); g.fillStyle = wood; g.fillRect(x0 - post, top, post, oy - top);
  g.fillStyle = wood; g.fillRect(tx0 - 2, top - 2, tw + 4, Math.max(4, tw * 0.08));
  // the guard rails, open at the front where it leaves from
  // the roof over head height, on a post at each corner; a rail round the deck, open at the front
  const roofH = Math.max(tw * 0.9, 2.3 * k, 30);
  g.strokeStyle = woodLo; g.lineWidth = post * 0.7; g.beginPath(); g.moveTo(tx0 + post / 2, top); g.lineTo(tx0 + post / 2, top - roofH); g.moveTo(x0 - post / 2, top); g.lineTo(x0 - post / 2, top - roofH); g.stroke();
  g.strokeStyle = steel; g.lineWidth = 2; g.beginPath(); g.moveTo(tx0, top - roofH * 0.4); g.lineTo(x0 - tw * 0.6, top - roofH * 0.4); g.moveTo(tx0, top - roofH * 0.2); g.lineTo(x0 - tw * 0.6, top - roofH * 0.2); g.stroke();
  g.fillStyle = n ? '#34466a' : '#3f6aa8'; g.beginPath(); g.moveTo(tx0 - tw * 0.15, top - roofH); g.lineTo(tx0 + tw * 0.5, top - roofH - tw * 0.45); g.lineTo(x0 + tw * 0.05, top - roofH); g.closePath(); g.fill();
  g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(tx0 - tw * 0.1, top - roofH, tw * 1.1, 2);
  // the slide, its chute curving down behind the tower
  g.strokeStyle = steelHi; g.lineWidth = Math.max(4, tw * 0.12); g.lineCap = 'round';
  const run = Math.min((oy - top) * 0.8, Math.max(20, tx0 - 30));
  g.beginPath(); g.moveTo(tx0, top + 2); g.bezierCurveTo(tx0 - run * 0.55, top + (oy - top) * 0.3, tx0 - run * 0.65, oy - 6, tx0 - run, oy - 4); g.stroke();
  // a ladder up its back
  g.strokeStyle = woodLo; g.lineWidth = 1.6; g.beginPath(); g.moveTo(tx0 + tw * 0.25, top); g.lineTo(tx0 + tw * 0.15, oy); g.moveTo(tx0 + tw * 0.45, top); g.lineTo(tx0 + tw * 0.35, oy); for (let y = top + 8; y < oy; y += 8) { const f = (y - top) / (oy - top); g.moveTo(tx0 + tw * (0.25 - 0.1 * f), y); g.lineTo(tx0 + tw * (0.45 - 0.1 * f), y); } g.stroke();
  softShadow(g, x0 - tw / 2, oy + 1, tw * 0.7, 4, 0.6);
}

/* ── a beach, a room, another world ────────────────────────────────────── */

/** A beach: the sea to the horizon with a headland, waves breaking white
    along the water's edge, the wet sand dark and shining, the dry sand with
    parasols, towels and a windbreak (never where it lands); from a height,
    the sea wall of the promenade with its railings. */
function beach(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(191), horizon = oy - clamp((oy - 40) * 0.3, 40, 160);
  sky(g, w, horizon, x0, { far: 'none', seed: 151, clouds: 3 });
  g.fillStyle = n ? '#3b3239' : '#b9aaa4'; g.beginPath(); g.moveTo(w * 0.62, horizon); g.quadraticCurveTo(w * 0.8, horizon - 22, w + 10, horizon - 14); g.lineTo(w + 10, horizon); g.closePath(); g.fill();
  const shore = lerp(horizon, oy, 0.55);
  water(g, 0, w, horizon, shore + 6, { phase });
  // breakers: white crests rolling in, the foam's lace at the edge
  for (let i = 0; i < 3; i++) {
    const y = lerp(horizon, shore, 0.45 + i * 0.22) + Math.sin(phase * 2 + i) * 1.5;
    g.strokeStyle = withAlpha('#ffffff', 0.5 + i * 0.15); g.lineWidth = 1.5 + i;
    g.beginPath(); for (let x = 0; x <= w; x += 10) g.lineTo(x, y + Math.sin(x / 40 + i * 2 + phase * 3) * 2); g.stroke();
  }
  // the wet sand, shining, then the dry
  const wg = g.createLinearGradient(0, shore, 0, oy); wg.addColorStop(0, n ? '#4a4038' : '#b89a6e'); wg.addColorStop(1, n ? '#6a5a48' : '#dcc396');
  g.fillStyle = wg; g.fillRect(0, shore + 4, w, oy - shore - 4);
  g.fillStyle = withAlpha('#ffffff', n ? 0.08 : 0.3); g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, shore + 5 + Math.sin(x / 30 + phase * 3) * 2); g.lineTo(w, shore + 9); g.lineTo(0, shore + 9); g.closePath(); g.fill();
  const dg = g.createLinearGradient(0, oy, 0, h); dg.addColorStop(0, n ? '#7c6a54' : '#ecd5a4'); dg.addColorStop(1, n ? '#5e4e3e' : '#d9bc84');
  g.fillStyle = dg; g.fillRect(0, oy, w, h - oy);
  g.fillStyle = withAlpha(n ? '#3e3028' : '#b8935a', 0.35); for (let i = 0; i < (w * (h - oy)) / 90; i++) g.fillRect(r() * w, oy + r() * (h - oy), 1.5, 1.5);
  // parasols, a towel, a windbreak, stood well clear of the flight
  const land = (c.clearX || [])[0] ?? w, free = (x, half) => (x + half < x0 - 30 || x - half > land + 40) && x - half > 10 && x + half < w - 10;
  const stripes = [['#2f5fa8', '#f4f1ea'], ['#e8c547', '#f4f1ea'], ['#5fae7a', '#f4f1ea']];
  let i = 0;
  for (const x of [land + 90, w - 70, x0 - 90, land + 220]) {
    const R = clamp(1.2 * k, 18, 40); if (!free(x, R) || i > 2) continue;
    const [a, b] = stripes[i++ % 3], ph = clamp(2.2 * k, 30, 70), cy = oy - ph;
    g.strokeStyle = n ? '#8a8e96' : '#d8d8dc'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, oy); g.lineTo(x + 3, cy); g.stroke();
    for (let j = 0; j < 6; j++) { g.fillStyle = j % 2 ? b : a; g.beginPath(); g.moveTo(x + 3, cy - R * 0.35); g.lineTo(x + 3 - R + (j * 2 * R) / 6, cy + R * 0.1); g.lineTo(x + 3 - R + ((j + 1) * 2 * R) / 6, cy + R * 0.1); g.closePath(); g.fill(); }
    g.fillStyle = withAlpha('#000000', 0.15); g.beginPath(); g.ellipse(x + 3, oy + 3, R * 0.9, R * 0.12, 0, 0, TAU); g.fill();
    g.fillStyle = n ? '#4a5a7a' : '#4f86c9'; g.fillRect(x + R * 0.2, oy + 2, R * 1.1, R * 0.18);
    c.reserve?.({ x: x - R, y: cy - R * 0.4, w: R * 2.4, h: oy - cy + R * 0.5 });
  }
  if (H0 > 0) {
    // the sea wall: dressed stone stepping out at its foot, the promenade's rail along the top, open where it leaves from
    stone(g, -4, top, x0 + 4, oy - top + 4, { course: clamp(0.4 * k, 7, 14), seed: 43, color: n ? '#6a6268' : '#c4b8a8' });
    g.fillStyle = n ? '#8a8288' : '#ddd2c4'; g.fillRect(-4, top - 4, x0 + 6, 5);
    const rh = clamp(1 * k, 9, 26);
    g.strokeStyle = n ? '#c8ccd2' : '#2f6a8a'; g.lineWidth = Math.max(1.5, clamp(0.06 * k, 1.2, 2.6));
    g.beginPath(); g.moveTo(-4, top - 4 - rh); g.lineTo(x0 - clamp(1.6 * k, 16, 50), top - 4 - rh); g.stroke();
    for (let x = x0 - clamp(1.6 * k, 16, 50); x > -4; x -= rh * 1.2) { g.beginPath(); g.moveTo(x, top - 4); g.lineTo(x, top - 4 - rh); g.stroke(); }
    g.fillStyle = withAlpha(n ? '#2c3b2c' : '#3f5a3a', 0.6); g.fillRect(-4, oy - clamp(0.6 * k, 6, 18), x0 + 4, clamp(0.6 * k, 6, 18));
  }
}

/** A room: papered walls, a window with its curtains and the light falling
    from it, a picture, a bookcase and a sofa (never under the flight), a rug
    on the floorboards; from a height, the landing at the top of the stairs
    with its banister. */
function room(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(193);
  const wall = n ? '#3a3234' : '#efe4d4', wallLo = n ? '#2e2729' : '#e2d4c0';
  const wg = g.createLinearGradient(0, 0, 0, oy); wg.addColorStop(0, wall); wg.addColorStop(1, wallLo); g.fillStyle = wg; g.fillRect(0, 0, w, oy);
  // a faint paper pattern
  g.fillStyle = withAlpha(n ? '#ffffff' : '#a08a6a', 0.06); for (let y = 12; y < oy; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < w; x += 24) { g.beginPath(); g.arc(x, y, 2.5, 0, TAU); g.fill(); }
  // skirting along the floor
  g.fillStyle = n ? '#5a4a40' : '#f6f2ea'; g.fillRect(0, oy - clamp(0.3 * k, 5, 12), w, clamp(0.3 * k, 5, 12));
  floorboards(g, 0, w, oy, h);
  const land = (c.clearX || [])[0] ?? w, free = (x, half) => (x + half < x0 - 30 || x - half > land + 40) && x - half > 10 && x + half < w - 10;
  // the window and its curtains, the light falling from it
  const wx = clamp(x0 + (w - x0) * 0.45, w * 0.35, w - 160), wy = oy * 0.18, ww = clamp(3 * k, 80, 180), wh = clamp(2.6 * k, 70, 160);
  const lg = g.createLinearGradient(0, wy, 0, h); lg.addColorStop(0, withAlpha(E.window, n ? 0.15 : 0.2)); lg.addColorStop(1, withAlpha(E.window, 0));
  g.fillStyle = lg; g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx + ww, wy + wh); g.lineTo(wx + ww + 120, h); g.lineTo(wx + 40, h); g.closePath(); g.fill();
  g.fillStyle = n ? '#1d2a3e' : '#cfe3f1'; g.fillRect(wx, wy, ww, wh);
  if (!n) { g.fillStyle = withAlpha('#ffffff', 0.6); g.beginPath(); g.ellipse(wx + ww * 0.3, wy + wh * 0.3, ww * 0.15, wh * 0.06, 0, 0, TAU); g.fill(); }
  g.strokeStyle = n ? '#8a8288' : '#ffffff'; g.lineWidth = 4; g.strokeRect(wx, wy, ww, wh); g.lineWidth = 2; g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
  const cur = n ? '#3a4a6a' : '#5f86b0';
  for (const [cx, s] of [[wx - 6, -1], [wx + ww + 6, 1]]) { g.fillStyle = cur; g.beginPath(); g.moveTo(cx, wy - 8); g.lineTo(cx + s * ww * 0.18, wy - 8); g.quadraticCurveTo(cx + s * ww * 0.05, wy + wh * 0.6, cx + s * ww * 0.15, wy + wh + 16); g.lineTo(cx, wy + wh + 16); g.closePath(); g.fill(); g.strokeStyle = withAlpha('#000000', 0.15); g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(cx + s * ww * 0.045 * i, wy - 6); g.lineTo(cx + s * ww * 0.035 * i, wy + wh + 14); g.stroke(); } }
  g.fillStyle = n ? '#6a5a48' : '#a8865a'; g.fillRect(wx - 16, wy - 12, ww + 32, 4);
  // a picture on the wall
  const px = wx + ww + 70; if (px + 50 < w) { g.fillStyle = n ? '#4a3a2c' : '#8a6a44'; g.fillRect(px, wy + 10, 50, 38); g.fillStyle = n ? '#3a4a5a' : '#9cc0d8'; g.fillRect(px + 4, wy + 14, 42, 30); g.fillStyle = n ? '#2c3a28' : '#6f9c5a'; g.beginPath(); g.moveTo(px + 4, wy + 44); g.lineTo(px + 20, wy + 28); g.lineTo(px + 32, wy + 36); g.lineTo(px + 46, wy + 24); g.lineTo(px + 46, wy + 44); g.closePath(); g.fill(); }
  // a sofa, a bookcase, a rug: clear of the flight
  const sw = clamp(5 * k, 90, 200), sx = [land + 60 + sw / 2, w - sw / 2 - 20, ...(H0 > 0 ? [] : [x0 - 40 - sw / 2])].find((x) => free(x, sw / 2));
  if (sx != null) {
    const sh = sw * 0.38, sofa = n ? '#4a4e66' : '#6a7d96', sofaLo = n ? '#363a4e' : '#546780';
    g.fillStyle = sofaLo; g.beginPath(); g.roundRect(sx - sw / 2, oy - sh, sw, sh * 0.6, 8); g.fill();
    g.fillStyle = sofa; g.beginPath(); g.roundRect(sx - sw / 2 + 6, oy - sh * 0.55, sw - 12, sh * 0.3, 6); g.fill();
    for (const s of [-1, 1]) { g.fillStyle = sofaLo; g.beginPath(); g.roundRect(sx + s * (sw / 2 - 10) - 10, oy - sh * 0.75, 20, sh * 0.62, 8); g.fill(); }
    g.fillStyle = '#e8c547'; g.beginPath(); g.roundRect(sx - sw * 0.3, oy - sh * 0.72, sw * 0.16, sh * 0.2, 4); g.fill();
    g.fillStyle = '#3a2a22'; g.fillRect(sx - sw / 2 + 8, oy - 6, 6, 6); g.fillRect(sx + sw / 2 - 14, oy - 6, 6, 6);
    c.reserve?.({ x: sx - sw / 2, y: oy - sh, w: sw, h: sh + 4 });
  }
  const bw = clamp(2.2 * k, 44, 90), bh = clamp(4.5 * k, 90, 200), bx = [w - bw / 2 - 16, land + 60 + bw / 2].find((x) => free(x, bw / 2) && (sx == null || Math.abs(x - sx) > bw / 2 + 110));
  if (bx != null) {
    g.fillStyle = n ? '#4a3a2c' : '#8a6a44'; g.fillRect(bx - bw / 2, oy - bh, bw, bh);
    const shelves = 5, books = n ? ['#5a4a6a', '#6a5a40', '#3a5a5a', '#6a3a3a'] : ['#2f5fa8', '#e8c547', '#5fae7a', '#a84a3a', '#f4f1ea', '#4a4e56'];
    c.reserve?.({ x: bx - bw / 2 - 4, y: oy - bh, w: bw + 8, h: bh + 4 });
    for (let i = 0; i < shelves; i++) { const y = oy - bh + 6 + i * (bh - 12) / shelves; g.fillStyle = n ? '#2a2018' : '#5a4228'; g.fillRect(bx - bw / 2 + 4, y, bw - 8, (bh - 12) / shelves - 4); for (let x = bx - bw / 2 + 6; x < bx + bw / 2 - 8; x += 4 + r() * 3) { const bk = (bh - 12) / shelves - 6 - r() * 6; g.fillStyle = books[Math.floor(r() * books.length)]; g.fillRect(x, y + ((bh - 12) / shelves - 4) - bk, 3 + r() * 2, bk); } }
  }
  const rx = (x0 + land) / 2; g.fillStyle = withAlpha(n ? '#4a3a4a' : '#b8a07a', 0.6); g.beginPath(); g.ellipse(rx, oy + clamp((h - oy) * 0.35, 8, 40), clamp((land - x0) * 0.6, 60, 260), clamp((h - oy) * 0.15, 4, 18), 0, 0, TAU); g.fill();
  if (H0 > 0) {
    // the stairs up to the landing, the landing's floor and its banister
    const sd = Math.min(x0 - 10, (oy - top) * 1.2), steps = Math.max(4, Math.round((oy - top) / clamp(0.18 * k, 10, 22)));
    g.fillStyle = n ? '#4a3a2c' : '#a8865a';
    g.beginPath(); g.moveTo(x0 - sd, oy); for (let i = 0; i < steps; i++) { const x = x0 - sd + (i * sd * 0.6) / steps, y = oy - ((i + 1) * (oy - top)) / steps; g.lineTo(x, y + (oy - top) / steps); g.lineTo(x, y); g.lineTo(x + (sd * 0.6) / steps, y); } g.lineTo(x0, top); g.lineTo(x0, top + clamp(0.35 * k, 6, 14)); g.lineTo(x0 - sd * 0.38, top + clamp(0.35 * k, 6, 14)); g.lineTo(x0 - sd * 0.38, oy); g.closePath(); g.fill();
    g.fillStyle = withAlpha('#ffffff', n ? 0.06 : 0.22); for (let i = 0; i < steps; i++) { const x = x0 - sd + (i * sd * 0.6) / steps, y = oy - ((i + 1) * (oy - top)) / steps; g.fillRect(x, y, (sd * 0.6) / steps, 1.5); }
    g.fillStyle = n ? '#5a4a3a' : '#8a6a44'; g.fillRect(x0 - sd * 0.4, top, sd * 0.4, clamp(0.35 * k, 6, 14));
    // under the landing, a panelled wall with the cupboard door under the stairs
    const ul = x0 - sd * 0.38, ut = top + clamp(0.35 * k, 6, 14);
    g.fillStyle = n ? '#4a3e3a' : '#e8dccb'; g.fillRect(ul, ut, x0 - ul, oy - ut);
    g.strokeStyle = withAlpha('#000000', 0.15); g.lineWidth = 1; g.strokeRect(ul + 4, ut + 4, x0 - ul - 8, oy - ut - 8);
    g.fillStyle = n ? '#3a2e28' : '#a8865a'; g.fillRect(ul + (x0 - ul) * 0.3, oy - Math.min(oy - ut - 6, clamp(2 * k, 30, 70)), (x0 - ul) * 0.4, Math.min(oy - ut - 6, clamp(2 * k, 30, 70)));
    // the handrail up the stairs, on its balusters
    g.strokeStyle = n ? '#8a7a5a' : '#6a4a2a'; g.lineWidth = 2.5; const hr = clamp(0.9 * k, 10, 26);
    g.beginPath(); g.moveTo(x0 - sd, oy - hr); g.lineTo(x0 - sd * 0.4, top - hr); g.stroke();
    g.lineWidth = 1.2; for (let i = 1; i < steps; i += 1) { const x = x0 - sd + (i * sd * 0.6) / steps, y = oy - (i * (oy - top)) / steps; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - hr); g.stroke(); }
    const bh2 = clamp(1 * k, 12, 30); g.strokeStyle = n ? '#8a7a5a' : '#6a4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - sd * 0.4, top - bh2); g.lineTo(x0 - clamp(1.4 * k, 16, 40), top - bh2); g.stroke();
    g.lineWidth = 1.5; for (let x = x0 - sd * 0.4; x < x0 - clamp(1.4 * k, 16, 40); x += 8) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, top - bh2); g.stroke(); }
  }
}

/** Another world: a dark sky with a ringed giant planet and two small moons
    over it, a rust-and-slate plain strewn with boulders and glassy crystal
    outcrops; from a height, a rock ledge. g is what the question gives. */
function planet(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const r = rng(197), horizon = oy - clamp((oy - 40) * 0.2, 24, 90);
  const sg = g.createLinearGradient(0, 0, 0, horizon); sg.addColorStop(0, '#0a0e18'); sg.addColorStop(1, '#2a3a4a');
  g.fillStyle = sg; g.fillRect(0, 0, w, horizon);
  for (let i = 0; i < (w * horizon) / 1200; i++) { g.fillStyle = withAlpha('#ffffff', 0.3 + r() * 0.6); g.fillRect(r() * w, r() * horizon * 0.8, 1.2, 1.2); }
  // the ringed giant: banded cream and tan, its rings tilted across it
  const px = clamp(x0 + (w - x0) * 0.55, w * 0.45, w - 120), py = clamp(horizon * 0.35, 60, 220), pr = clamp(w * 0.08, 36, 110);
  const ring = (front) => { g.strokeStyle = withAlpha('#d8c8a8', 0.75); g.lineWidth = pr * 0.08; g.beginPath(); g.ellipse(px, py, pr * 1.8, pr * 0.4, -0.25, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke(); g.strokeStyle = withAlpha('#a89878', 0.6); g.lineWidth = pr * 0.05; g.beginPath(); g.ellipse(px, py, pr * 1.55, pr * 0.33, -0.25, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke(); };
  ring(false);
  g.save(); g.beginPath(); g.arc(px, py, pr, 0, TAU); g.clip();
  g.fillStyle = '#d8c49c'; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  for (let i = -5; i <= 5; i++) { g.fillStyle = i % 2 ? withAlpha('#a8875a', 0.55) : withAlpha('#f0e2c4', 0.4); g.save(); g.translate(px, py); g.rotate(-0.25); g.fillRect(-pr, i * pr * 0.18, pr * 2, pr * 0.1); g.restore(); }
  const sh = g.createLinearGradient(px - pr, 0, px + pr, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.6, 'rgba(0,0,0,0.1)'); sh.addColorStop(1, 'rgba(0,0,0,0.65)'); g.fillStyle = sh; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  g.restore();
  ring(true);
  for (const [mx, my, mr] of [[px - pr * 2.6, py + pr * 0.7, pr * 0.16], [px + pr * 2.3, py - pr * 0.6, pr * 0.1]]) { if (mx < 10 || mx > w - 10) continue; g.fillStyle = '#b8bcc4'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(mx + mr * 0.3, my, mr, -Math.PI / 2, Math.PI / 2); g.fill(); }
  // the plain: slate and rust, a low range on the horizon
  horizonLine(g, w, horizon, rng(19), { far: '#3e4650', near: '#5a5a5e', lit: '#8a8a90', rim: false });
  regolith(g, w, h, horizon, oy, k, { base: '#6a5e58', dark: '#3e3632', light: '#9a8a7e', seed: 21 });
  // crystal outcrops: glassy pale-blue spires lit on one face, clear of the landing
  for (const cx of [x0 + (w - x0) * 0.82, x0 + (w - x0) * 0.33, w * 0.05]) {
    if (cx < 10 || (H0 > 0 && cx < x0) || !clearOf(cx, c, 70)) continue;
    const ch = clamp(2.5 * k, 20, 70);
    for (let i = 0; i < 4; i++) { const sx = cx + (i - 1.5) * ch * 0.18, sh2 = ch * (0.5 + r() * 0.5), lean = (r() - 0.5) * 0.4; g.fillStyle = '#9fc6e8'; g.beginPath(); g.moveTo(sx - ch * 0.07, oy); g.lineTo(sx + lean * sh2, oy - sh2); g.lineTo(sx + ch * 0.07, oy); g.closePath(); g.fill(); g.fillStyle = withAlpha('#ffffff', 0.45); g.beginPath(); g.moveTo(sx - ch * 0.07, oy); g.lineTo(sx + lean * sh2, oy - sh2); g.lineTo(sx - ch * 0.01, oy); g.closePath(); g.fill(); }
    const gl = g.createRadialGradient(cx, oy - ch * 0.3, 0, cx, oy - ch * 0.3, ch); gl.addColorStop(0, 'rgba(159,198,232,0.25)'); gl.addColorStop(1, 'rgba(159,198,232,0)'); g.fillStyle = gl; g.fillRect(cx - ch, oy - ch * 1.3, ch * 2, ch * 2);
  }
  if (H0 > 0) { seaCliff(g, -4, x0, top, oy, { foam: false, cap: false, tones: rockTones('#8a8288', '#5e5860', '#2e2a30') }); scree(g, x0, oy, k); }
}

/* ── a car park, a volcano, a quarry ───────────────────────────────────── */

/** A multi-storey car park: concrete decks on columns, open between, cars
    parked on them, the barrier along each deck's edge, a ramp's slope
    showing, the stair tower with its lit sign; it leaves from the top
    deck's edge, a gap in its barrier there, and lands in the street. */
function carpark(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(199);
  skyscape(g, 0, 0, w, oy, { far: 'skyline', seed: 31, clouds: 3, farHeight: clamp((oy - 40) * 0.35, 30, 180), sun: false });
  // the street: tarmac, a kerb and a pavement in front
  tarmac(g, 0, w, oy, { depth: clamp(0.6 * k, 12, 24), verge: h - oy });
  if (!(H0 > 0)) return;
  const conc = n ? '#6a6a70' : '#bdbab4', concLo = n ? '#4a4a50' : '#8e8b86', deck = clamp(0.35 * k, 6, 14);
  const lift = clamp(2.8 * k, 26, 90), floors = Math.max(1, Math.round((oy - top) / lift)), L = (oy - top) / floors, W = Math.max(80, Math.min(clamp(0.45 * (oy - top) + 120, 160, 600), x0 - 60));
  const bx = x0 - W;
  // the stair tower at the back, its lit sign
  g.fillStyle = concLo; g.fillRect(bx - 30, top - L * 0.8, 40, oy - top + L * 0.8);
  // its sign low on the tower, below the readouts
  const sy2 = Math.max(top + L * 0.3, Math.min(oy - 30, top + (oy - top) * 0.5));
  g.fillStyle = n ? withAlpha(E.window, 0.8) : '#2f5fa8'; g.fillRect(bx - 26, sy2, 32, 22);
  g.fillStyle = '#ffffff'; g.font = '700 15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', bx - 10, sy2 + 11);
  // each level: the dark interior, a car or two parked, the deck slab and its edge barrier
  for (let i = 0; i < floors; i++) {
    const yT = top + i * L, yB = yT + L;
    g.fillStyle = n ? '#1e2026' : '#4a4c52'; g.fillRect(bx, yT + deck, W, L - deck);
    g.fillStyle = withAlpha(n ? E.window : '#fff4c8', n ? 0.25 : 0.15); for (let x = bx + 20; x < x0 - 20; x += 60) g.fillRect(x, yT + deck + 2, 26, 2);
    for (let x = bx + 14 + r() * 30; x < x0 - L * 1.3; x += L * 1.5 + r() * L) {
      if (r() < 0.25) continue;
      const cw = Math.min(L * 1.2, 70), ch = cw * 0.32, cy = yB - 2;
      g.fillStyle = ['#4f86c9', '#e8c547', '#f4f1ea', '#5a5e66', '#5fae7a'][Math.floor(r() * 5)]; g.beginPath(); g.roundRect(x, cy - ch, cw, ch * 0.7, ch * 0.2); g.fill();
      g.beginPath(); g.roundRect(x + cw * 0.2, cy - ch * 1.25, cw * 0.55, ch * 0.6, ch * 0.2); g.fill();
      g.fillStyle = withAlpha('#a9c4dc', 0.8); g.fillRect(x + cw * 0.27, cy - ch * 1.15, cw * 0.4, ch * 0.4);
      g.fillStyle = '#1d1e22'; for (const wx of [x + cw * 0.2, x + cw * 0.8]) { g.beginPath(); g.arc(wx, cy - ch * 0.25, ch * 0.28, 0, TAU); g.fill(); }
    }
    g.fillStyle = conc; g.fillRect(bx, yT, W + 2, deck);
    g.fillStyle = withAlpha('#000000', 0.25); g.fillRect(bx, yT + deck, W, 2);
    // the barrier: a low kerb and steel cables on posts along the deck's edge
    // (so the parked cars show through), open on the top deck at x0
    const bh = clamp(0.9 * k, 8, 24), kb = Math.max(2, bh * 0.25), bw2 = i === 0 ? W - clamp(3 * k, 30, 80) : W;
    g.fillStyle = concLo; g.fillRect(bx, yT - kb, bw2, kb);
    g.strokeStyle = n ? '#9aa0a8' : '#5a6068'; g.lineWidth = 1;
    g.beginPath(); for (const f of [0.45, 0.75, 1]) { g.moveTo(bx, yT - bh * f); g.lineTo(bx + bw2, yT - bh * f); } g.stroke();
    g.lineWidth = 2; g.beginPath(); for (let x = bx + 4; x <= bx + bw2; x += clamp(2.5 * k, 20, 60)) { g.moveTo(x, yT); g.lineTo(x, yT - bh); } g.stroke();
    // a stripe of yellow and black hazard paint along each deck's edge
    for (let x = bx; x < bx + W; x += 12) { g.fillStyle = (Math.floor((x - bx) / 12) % 2) ? '#2b2628' : '#e8c547'; g.fillRect(x, yT + deck - 3, 12, 3); }
  }
  // the columns, the ground floor's slab, the open front
  for (let x = bx + 4; x < x0 - 4; x += clamp(6 * k, 60, 160)) { g.fillStyle = conc; g.fillRect(x, top + deck, Math.max(4, clamp(0.4 * k, 4, 10)), oy - top - deck); }
  g.fillStyle = conc; g.fillRect(x0 - Math.max(4, clamp(0.4 * k, 4, 10)), top + deck, Math.max(4, clamp(0.4 * k, 4, 10)), oy - top - deck);
  softShadow(g, (bx + x0) / 2, oy + 2, W * 0.6, 5, 0.6);
}

/** A volcano: a broad cone with concave flanks rising to its rim, a dished
    crater it is thrown from with the glow of lava in it (white-hot and
    crimson, never the velocity's orange), lava running crimson down a
    channel, an ash plume leaning back over the cone; the plain below it
    lobed with old dark flows. */
function volcano(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(211), horizon = oy - clamp((oy - 40) * 0.2, 24, 100);
  const sg = g.createLinearGradient(0, 0, 0, horizon); sg.addColorStop(0, n ? '#14121a' : '#8a8c96'); sg.addColorStop(1, n ? '#2a1e1c' : '#d8c8b4');
  g.fillStyle = sg; g.fillRect(0, 0, w, horizon);
  g.fillStyle = n ? '#241c1c' : '#7a7068'; g.beginPath(); g.moveTo(0, horizon); for (let x = 0; x <= w; x += 30) g.lineTo(x, horizon - 10 - Math.abs(Math.sin(x / 90)) * 22); g.lineTo(w, horizon); g.closePath(); g.fill();
  // the plain: dark basalt, lobed tongues of old flows over it with their cooled crusts
  const pg = g.createLinearGradient(0, horizon, 0, h); pg.addColorStop(0, n ? '#2a2422' : '#6a625a'); pg.addColorStop(1, n ? '#1a1614' : '#4e4842'); g.fillStyle = pg; g.fillRect(0, horizon, w, h - horizon);
  for (let i = 0; i < 6; i++) {
    const fx = r() * w, fy = lerp(horizon + 6, h, r() * 0.8), fl = 60 + r() * 140;
    g.fillStyle = n ? '#18141a' : '#3a3434';
    for (let j = 0; j < 5; j++) { g.beginPath(); g.ellipse(fx + j * fl * 0.2, fy + Math.sin(j) * 3, fl * 0.14, 4 + r() * 4, 0, 0, TAU); g.fill(); }
    g.strokeStyle = withAlpha(n ? '#5a5050' : '#8a8078', 0.5); g.lineWidth = 1; g.beginPath(); g.moveTo(fx - fl * 0.1, fy - 3); g.quadraticCurveTo(fx + fl * 0.4, fy - 6, fx + fl * 0.9, fy - 2); g.stroke();
  }
  if (!(H0 > 0)) return;
  // the cone: its rim at the launch point, a dished crater behind it; the near
  // flank short enough that what it throws clears it
  const H = oy - top, cw = Math.max(clamp(H * 1.3, 120, w * 0.8), x0 * 1.2), land = (c.clearX || [])[0] ?? w;
  const footR = x0 + Math.min(H * 0.55, Math.max(20, (land - x0) * 0.45)), footL = x0 - cw, bowl = Math.max(14, Math.min(cw * 0.16, 70));
  const cone = () => {
    g.beginPath(); g.moveTo(footL, oy + 2);
    g.quadraticCurveTo(x0 - cw * 0.4, oy - H * 0.12, x0 - bowl * 1.3, top + H * 0.02);
    g.lineTo(x0 - bowl, top); g.quadraticCurveTo(x0 - bowl * 0.5, top + bowl * 0.45, x0, top);
    g.quadraticCurveTo(x0 + (footR - x0) * 0.25, oy - H * 0.2, footR, oy + 2); g.closePath();
  };
  const cg = g.createLinearGradient(footL, 0, footR, 0); cg.addColorStop(0, n ? '#3a2e2a' : '#7a6e64'); cg.addColorStop(0.75, n ? '#2a2220' : '#5a5048'); cg.addColorStop(1, n ? '#1a1412' : '#3e3632');
  cone(); g.fillStyle = cg; g.fill();
  g.save(); cone(); g.clip();
  // banded ash and scoria down its flanks, following its curve; rills of loose ash
  for (let i = 1; i < 7; i++) { g.strokeStyle = withAlpha(i % 2 ? '#000000' : '#ffffff', n ? 0.08 : 0.1); g.lineWidth = 3; const yy = lerp(top, oy, i / 7); g.beginPath(); g.moveTo(footL, yy + H * 0.08); g.quadraticCurveTo(x0 - cw * 0.3, yy, x0 + (footR - x0), yy + H * 0.05); g.stroke(); }
  g.strokeStyle = withAlpha('#000000', 0.18); g.lineWidth = 1;
  for (let i = 0; i < 26; i++) { const sx = x0 - bowl - r() * (cw - bowl) * 0.9, d = (x0 - sx) / cw; const sy = top + H * d * d * 0.9 + 4; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 4 - r() * 8, sy + 10 + r() * H * 0.12); g.stroke(); }
  // the lava channel: white-hot near the crater, crimson below, flickering
  const flick = 0.85 + 0.15 * Math.sin(phase * 5);
  const lg = g.createLinearGradient(0, top, 0, oy); lg.addColorStop(0, `rgba(255,240,190,${0.95 * flick})`); lg.addColorStop(0.35, `rgba(200,40,60,${0.85 * flick})`); lg.addColorStop(1, 'rgba(110,20,40,0.6)');
  g.strokeStyle = lg; g.lineWidth = clamp(0.4 * k, 3, 9); g.lineCap = 'round'; g.beginPath(); g.moveTo(x0 - bowl * 1.2, top + 4); g.bezierCurveTo(x0 - cw * 0.25, top + H * 0.3, x0 - cw * 0.3, top + H * 0.6, x0 - cw * 0.55, oy); g.stroke();
  g.restore();
  // the crater's glow, in its bowl behind the rim: small, white-hot and crimson
  const gx = x0 - bowl * 0.55, gy = top + bowl * 0.15, gR = bowl * 0.9;
  const glow = g.createRadialGradient(gx, gy, 0, gx, gy, gR); glow.addColorStop(0, `rgba(255,244,210,${0.8 * flick})`); glow.addColorStop(0.45, `rgba(200,40,60,${0.45 * flick})`); glow.addColorStop(1, 'rgba(200,40,60,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(gx, gy, gR, 0, TAU); g.fill();
  // the plume leaning back over the cone, away from the flight; pale enough to read at night
  for (let i = 0; i < 10; i++) {
    const t2 = i / 9, px = gx - t2 * cw * 0.7 + Math.sin(phase + i) * 4, py = top - 6 - t2 * Math.min(top - 10, cw * 0.7), R = bowl * (0.6 + t2 * 2.4);
    const pg2 = g.createRadialGradient(px, py, 0, px, py, R); pg2.addColorStop(0, withAlpha(n ? '#9a9098' : '#6a6460', 0.7 - t2 * 0.35)); pg2.addColorStop(1, withAlpha(n ? '#9a9098' : '#6a6460', 0));
    g.fillStyle = pg2; g.beginPath(); g.arc(px, py, R, 0, TAU); g.fill();
  }
}

/** A quarry: the far wall of the pit receding in pale grey benches, each a
    drilled face over a ledge strewn with rubble, hazed with distance; the
    floor of crushed stone with a rock pool and a dump truck (clear of the
    flight); the near face it leaves from in warmer, darker stone, its
    benches stepping back with rubble on each ledge and a shadow under each. */
function quarry(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(223), horizon = oy - clamp((oy - 40) * 0.5, 60, 320);
  sky(g, w, horizon, x0, { far: 'none', seed: 161, clouds: 3 });
  // the far wall: benches, the upper ones smaller and hazier
  const steps = 5, total = oy - horizon;
  let y = horizon;
  for (let i = 0; i < steps; i++) {
    const f = (i + 1) / steps, faceH = total * (0.12 + 0.1 * f), ledge = Math.max(3, faceH * 0.18);
    const face = n ? ['#5a5c60', '#62646a', '#6a6c72', '#72747a', '#7a7c82'][i] : ['#cfd2d4', '#c8cbce', '#c0c4c8', '#b8bcc0', '#b0b4b8'][i];
    g.fillStyle = face; g.fillRect(0, y, w, faceH);
    g.strokeStyle = withAlpha('#000000', 0.14); g.lineWidth = 1; for (let x = r() * 10; x < w; x += 6 + r() * 7) { g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x + (r() - 0.5) * 2, y + faceH - 1); g.stroke(); }
    g.fillStyle = withAlpha('#000000', 0.12); for (let x = r() * 60; x < w; x += 50 + r() * 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + faceH); g.lineTo(x - 4, y + faceH); g.closePath(); g.fill(); }
    // the ledge: a lit top strip with rubble piles along it
    g.fillStyle = n ? '#7a7c80' : '#e2e2e0'; g.fillRect(0, y + faceH, w, ledge);
    g.fillStyle = n ? '#4a4c50' : '#9a9ea2'; for (let x = r() * 40; x < w; x += 30 + r() * 60) { g.beginPath(); g.ellipse(x, y + faceH + ledge * 0.4, 6 + r() * 10, ledge * 0.7, 0, Math.PI, TAU); g.fill(); }
    // haze, thicker up the wall
    g.fillStyle = withAlpha(n ? '#2a2c34' : '#e8ecf0', 0.3 * (1 - f)); g.fillRect(0, y, w, faceH + ledge);
    y += faceH + ledge; if (y > oy - 4) break;
  }
  // the floor: crushed stone
  const fg = g.createLinearGradient(0, oy, 0, h); fg.addColorStop(0, n ? '#5a5650' : '#c4baa8'); fg.addColorStop(1, n ? '#3e3a36' : '#a49a88'); g.fillStyle = fg; g.fillRect(0, oy, w, h - oy);
  g.fillStyle = withAlpha(n ? '#2a2622' : '#7a7060', 0.6); for (let i = 0; i < (w * (h - oy)) / 50; i++) g.fillRect(r() * w, oy + r() * (h - oy), 2, 1.5);
  // a rock pool and a dump truck on the floor, clear of the whole flight
  const land = (c.clearX || [])[0] ?? x0, free = (x, half) => (x + half < x0 - 20 || x - half > land + 30) && x - half > 10 && x + half < w - 10;
  const pw = clamp(3 * k, 30, 80), pool = [land + 50 + pw, w - pw - 20].find((x) => free(x, pw));
  if (pool != null) { g.fillStyle = n ? '#2a4a50' : '#6fb0b8'; g.beginPath(); g.ellipse(pool, oy + 8, pw, 5, 0, 0, TAU); g.fill(); g.fillStyle = withAlpha('#ffffff', 0.4); g.fillRect(pool - pw * 0.4, oy + 6, pw * 0.5, 1.2); }
  const tl = clamp(5 * k, 60, 130), tx = [land + 70 + tl / 2, pool != null ? pool + pw + 30 + tl / 2 : null, w - tl / 2 - 20].find((x) => x != null && free(x, tl / 2) && (pool == null || Math.abs(x - pool) > pw + tl / 2 + 10));
  if (tx != null) {
    const th2 = tl * 0.45;
    g.fillStyle = '#e8c547'; g.beginPath(); g.moveTo(tx - tl / 2, oy - th2 * 0.45); g.lineTo(tx + tl * 0.15, oy - th2 * 0.45); g.lineTo(tx + tl * 0.2, oy - th2); g.lineTo(tx - tl / 2 - 6, oy - th2); g.closePath(); g.fill();
    g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(tx - tl / 2, oy - th2 * 0.62, tl * 0.65, 2);
    g.fillStyle = n ? '#8a8078' : '#b0a898'; g.beginPath(); g.ellipse(tx - tl * 0.15, oy - th2, tl * 0.3, th2 * 0.18, 0, Math.PI, TAU); g.fill();
    g.fillStyle = '#c8a82a'; g.fillRect(tx + tl * 0.18, oy - th2 * 0.85, tl * 0.3, th2 * 0.45);
    g.fillStyle = withAlpha('#a9c4dc', 0.85); g.fillRect(tx + tl * 0.26, oy - th2 * 0.8, tl * 0.16, th2 * 0.2);
    for (const wx of [tx - tl * 0.3, tx + tl * 0.32]) { g.fillStyle = '#1d1e22'; g.beginPath(); g.arc(wx, oy - th2 * 0.2, th2 * 0.24, 0, TAU); g.fill(); g.fillStyle = '#8a9098'; g.beginPath(); g.arc(wx, oy - th2 * 0.2, th2 * 0.1, 0, TAU); g.fill(); }
    c.reserve?.({ x: tx - tl / 2 - 6, y: oy - th2 * 1.1, w: tl + 10, h: th2 * 1.1 + 4 });
  }
  if (!(H0 > 0)) return;
  // the near face: warmer, darker stone, benches stepping back from the lip
  const H = oy - top, nb = Math.max(2, Math.round(H / clamp(5 * k, 40, 120))), bH = H / nb, back = clamp(1.5 * k, 12, 40);
  const warm = n ? ['#6a5a48', '#5a4c3e'] : ['#c4a878', '#b0946a'];
  for (let i = nb - 1; i >= 0; i--) {
    const yT = top + i * bH, xr = x0 - i * back;
    g.fillStyle = warm[i % 2]; g.fillRect(-4, yT, xr + 4, bH + 1);
    g.strokeStyle = withAlpha('#000000', 0.2); g.lineWidth = 1; for (let x = xr - 5; x > 0; x -= 7 + r() * 6) { g.beginPath(); g.moveTo(x, yT + 4); g.lineTo(x - 1, yT + bH - 2); g.stroke(); }
    // a crack or two, the shadow down the step's corner, the ledge's lit edge with rubble on it
    g.strokeStyle = withAlpha('#000000', 0.3); g.beginPath(); const cx2 = xr * (0.3 + r() * 0.5); g.moveTo(cx2, yT + 3); g.lineTo(cx2 + 6, yT + bH * 0.5); g.lineTo(cx2 - 3, yT + bH - 2); g.stroke();
    g.fillStyle = withAlpha('#000000', 0.3); g.fillRect(xr - 4, yT, 4, bH);
    g.fillStyle = withAlpha('#ffffff', n ? 0.08 : 0.4); g.fillRect(-4, yT, xr + 4, 2);
    if (i > 0) { g.fillStyle = n ? '#4a4038' : '#9a7e58'; for (let x = xr + 4; x < xr + back - 2; x += 5) { g.beginPath(); g.arc(x, yT - 1, 2 + r() * 2.5, Math.PI, TAU); g.fill(); } }
  }
  // the safety bund along the top, back from the lip
  g.fillStyle = n ? '#5a4c40' : '#a8906a'; g.beginPath(); g.moveTo(-4, top); g.quadraticCurveTo(x0 * 0.4, top - clamp(0.8 * k, 6, 20), x0 - clamp(2.5 * k, 24, 70), top); g.closePath(); g.fill();
  scree(g, x0 - (nb - 1) * back, oy, k);
}

/* ── courts, and a castle ───────────────────────────────────────────────── */

/** A line across a court seen side on and a little from in front: from the
    far side (y0) to the near (y1), leaning so it is at x where the path's
    own depth (oy) crosses it. */
const across = (g, x, y0, y1, oy, s) => { g.beginPath(); g.moveTo(x + (oy - y0) * s, y0); g.lineTo(x - (y1 - oy) * s, y1); g.stroke(); };

/** A tennis court at its real size, its near baseline where it is served
    from: blue hard court inside a green surround, its lines, the net across
    the middle with its posts and the umpire's chair beside it, the far
    windbreak fence and the trees beyond; from a height, a show court's
    stand. The net is drawn only where the engine's path clears it (or
    lands short of it): never a ball through the net (rule 4). */
function court(g, c) {
  const { w, h, k, X, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(181), s = 0.32;
  const horizon = oy - clamp((oy - 40) * 0.3, 44, 160);
  sky(g, w, horizon - clamp(3.5 * k, 24, 70), x0, { far: 'none', seed: 131, clouds: 2 });
  // the trees beyond the fence
  const fence = clamp(3.5 * k, 24, 70);
  for (let x = -10 + r() * 20; x < w + 20; x += 16 + r() * 20) {
    const R = 12 + r() * 12, ty = horizon - fence - R * 0.3;
    g.fillStyle = n ? '#1c2a1c' : '#4a7040'; g.beginPath(); g.arc(x, ty, R, 0, TAU); g.fill();
    g.fillStyle = n ? '#243424' : '#5c8450'; g.beginPath(); g.arc(x - R * 0.3, ty - R * 0.3, R * 0.55, 0, TAU); g.fill();
  }
  // the windbreak: dark green cloth on the fence, its posts and top rail
  g.fillStyle = n ? '#18261e' : '#2f5a3e'; g.fillRect(0, horizon - fence, w, fence);
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1; for (let x = 0; x < w; x += 7) { g.beginPath(); g.moveTo(x, horizon - fence); g.lineTo(x, horizon); g.stroke(); }
  g.strokeStyle = n ? '#5a6068' : '#9aa2aa'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, horizon - fence); g.lineTo(w, horizon - fence); g.stroke();
  for (let x = 20; x < w; x += 90) { g.beginPath(); g.moveTo(x, horizon - fence - 3); g.lineTo(x, horizon); g.stroke(); }
  // the surround, then the court on it: blue, with its tramlines
  // (a shallow court in depth, so the net's height reads against it)
  const yF = Math.max(lerp(horizon, oy, 0.34), oy - 46), yN = oy + clamp((h - oy) * 0.4, 10, 40);
  g.fillStyle = n ? '#22382a' : '#4f8a5e'; g.fillRect(0, horizon, w, h - horizon);
  g.fillStyle = withAlpha('#000000', 0.08); for (let y = horizon + 6; y < h; y += 9) g.fillRect(0, y, w, 1);
  const xa = X(0), xb = X(23.77);
  const quad = (a, b, y0, y1) => { g.beginPath(); g.moveTo(a + (oy - y0) * s, y0); g.lineTo(b + (oy - y0) * s, y0); g.lineTo(b - (y1 - oy) * s, y1); g.lineTo(a - (y1 - oy) * s, y1); g.closePath(); };
  // the run-back beyond each baseline is the same blue
  quad(xa - clamp(6.4 * k, 20, 200), xb + clamp(6.4 * k, 20, 200), yF, yN); g.fillStyle = n ? '#22344e' : '#3d6fae'; g.fill();
  quad(xa, xb, yF, yN); g.fillStyle = n ? '#263a56' : '#4479b8'; g.fill();
  g.strokeStyle = withAlpha('#ffffff', n ? 0.55 : 0.92); g.lineWidth = 2;
  // sidelines (singles and doubles), baselines, service lines, the centre line
  const dy = (yN - yF) * 0.12;
  for (const y of [yF, yF + dy, yN - dy, yN]) { g.beginPath(); g.moveTo(xa + (oy - y) * s, y); g.lineTo(xb + (oy - y) * s, y); g.stroke(); }
  for (const d of [0, 23.77]) across(g, X(d), yF, yN, oy, s);
  for (const d of [5.485, 18.285]) { g.beginPath(); g.moveTo(X(d) + (oy - yF - dy) * s, yF + dy); g.lineTo(X(d) - (yN - dy - oy) * s, yN - dy); g.stroke(); }
  g.beginPath(); g.moveTo(X(5.485) + (oy - (yF + yN) / 2) * s, (yF + yN) / 2); g.lineTo(X(18.285) + (oy - (yF + yN) / 2) * s, (yF + yN) / 2); g.stroke();
  // the net, where the path clears it or lands short of it
  const xn = X(11.885), land = (c.clearX || [])[0], at = c.over?.(11.885);
  const fx = xn + (oy - yF) * s, nx = xn - (yN - oy) * s, ph = 1.07 * k, mh = 0.914 * k;
  // the umpire's chair, beside the far post, net or no net
  if (xn < w + 40) {
    const cs = clamp(2 * k, 18, 50), cx = fx + clamp(1.5 * k, 10, 30), cy = yF - 2;
    g.strokeStyle = n ? '#4a4e56' : '#2f3a44'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - cs * 0.2, cy); g.lineTo(cx, cy - cs); g.lineTo(cx + cs * 0.2, cy); g.moveTo(cx - cs * 0.12, cy - cs * 0.5); g.lineTo(cx + cs * 0.12, cy - cs * 0.5); g.stroke();
    g.fillStyle = n ? '#4a4e56' : '#2f3a44'; g.fillRect(cx - cs * 0.16, cy - cs - 2, cs * 0.32, 3);
    g.fillStyle = n ? '#3a4a5a' : '#2f5fa8'; g.beginPath(); g.roundRect(cx - cs * 0.12, cy - cs * 1.42, cs * 0.24, cs * 0.4, 3); g.fill();
    g.fillStyle = n ? '#7d6253' : '#d9a988'; g.beginPath(); g.arc(cx, cy - cs * 1.55, cs * 0.1, 0, TAU); g.fill();
  }
  if (xn < w + 40 && (land == null || land < xn - 4 || at == null || at > 0.95)) {
    // the tape's height across the court: 1.07 m at the posts, 0.914 m where the path crosses
    const tapeY = (u) => { const y = lerp(yF, yN, u), mid = (oy - yF) / (yN - yF), d = u < mid ? u / mid : (1 - u) / (1 - mid); return y - lerp(ph, mh, Math.max(0, d)); };
    const half = (u0, u1, a) => {
      g.beginPath(); g.moveTo(lerp(fx, nx, u0), lerp(yF, yN, u0));
      for (let i = 0; i <= 12; i++) { const u = lerp(u0, u1, i / 12); g.lineTo(lerp(fx, nx, u), tapeY(u)); }
      g.lineTo(lerp(fx, nx, u1), lerp(yF, yN, u1)); g.closePath();
      g.fillStyle = withAlpha(n ? '#0c0e12' : '#1b1d22', a); g.fill();
      g.save(); g.clip(); g.strokeStyle = withAlpha('#000000', a * 0.8); g.lineWidth = 0.8;
      for (let i = 0; i <= 14; i++) { const u = lerp(u0, u1, i / 14); g.beginPath(); g.moveTo(lerp(fx, nx, u), lerp(yF, yN, u)); g.lineTo(lerp(fx, nx, u), lerp(yF, yN, u) - ph); g.stroke(); }
      for (let y = -ph; y < 0; y += 4) { g.beginPath(); g.moveTo(fx, yF + y); g.lineTo(nx, yN + y); g.stroke(); }
      g.restore();
      g.strokeStyle = withAlpha('#ffffff', (n ? 0.6 : 0.95) * (a > 0.3 ? 1 : 0.45)); g.lineWidth = 2.4; g.beginPath();
      for (let i = 0; i <= 12; i++) { const u = lerp(u0, u1, i / 12); g.lineTo(lerp(fx, nx, u), tapeY(u)); } g.stroke();
    };
    const mid = (oy - yF) / (yN - yF);
    // the far half behind the plane of the flight, faint; the near half in front, solid
    half(0, mid, 0.18);
    g.fillStyle = n ? '#2a3a30' : '#1f4a32'; g.fillRect(fx - 2, yF - ph - 3, 4, ph + 3);
    half(mid, 1, 0.5);
    // the centre strap, where the path crosses: its 0.914 m clearance
    g.strokeStyle = withAlpha('#ffffff', n ? 0.7 : 1); g.lineWidth = 3; g.beginPath(); g.moveTo(xn, oy); g.lineTo(xn, oy - mh); g.stroke();
    g.fillStyle = n ? '#2a3a30' : '#1f4a32'; g.fillRect(nx - 2, yN - ph - 3, 4, ph + 3);
    softShadow(g, nx, yN + 1, 8, 2, 0.6);
  }
  if (H0 > 0) grandstand(g, x0, top, oy, k, r, n);
}

/** A basketball arena: the bleachers full under the roof's trusses and
    lights, the scoreboard hung over the court, the maple floor with its
    lines; and, when a part asks where it passes the hoop's height on the
    way down, the hoop there: the ball goes through its ring at the engine's
    point (rule 4), the backboard and the stanchion beyond, its net swishing
    as the ball drops through (c.hoop.age, in the engine's seconds). */
function arena(g, c) {
  const { w, h, k, oy, x0, top, H0, hoop } = c;
  const E = env(), n = E.night, r = rng(191), s = 0.3;
  const horizon = oy - clamp((oy - 40) * 0.26, 40, 140);
  // the roof: dark, with its trusses and a row of lights
  const rg = g.createLinearGradient(0, 0, 0, horizon); rg.addColorStop(0, '#0e1118'); rg.addColorStop(1, '#232838');
  g.fillStyle = rg; g.fillRect(0, 0, w, horizon);
  const ty = clamp(horizon * 0.14, 16, 60);
  c.truss = ty + 14;
  g.strokeStyle = '#3a4050'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, ty); g.lineTo(w, ty); g.moveTo(0, ty + 14); g.lineTo(w, ty + 14);
  for (let x = 0; x < w; x += 28) { g.moveTo(x, ty); g.lineTo(x + 14, ty + 14); g.lineTo(x + 28, ty); } g.stroke();
  for (let x = 40; x < w; x += 120) {
    const gl = g.createRadialGradient(x, ty + 20, 0, x, ty + 20, 60); gl.addColorStop(0, 'rgba(255,248,226,0.55)'); gl.addColorStop(1, 'rgba(255,248,226,0)');
    g.fillStyle = gl; g.fillRect(x - 60, ty - 40, 120, 120);
    g.fillStyle = '#fffaf0'; g.fillRect(x - 7, ty + 15, 14, 5);
  }
  // the bleachers: tiers of seats, the crowd on them, under the roof
  const bh = Math.min(horizon - ty - 26, clamp((oy - 40) * 0.3, 40, 160)), b0 = horizon - bh;
  const bg = g.createLinearGradient(0, b0, 0, horizon); bg.addColorStop(0, '#1e2230'); bg.addColorStop(1, '#2c3244');
  g.fillStyle = bg; g.fillRect(0, b0, w, bh);
  const rows = [], step = clamp(bh / 9, 6, 14);
  for (let y = b0 + step; y < horizon - 4; y += step) rows.push({ y, s: step * 0.7 });
  for (const { y } of rows) { g.fillStyle = withAlpha('#ffffff', 0.06); g.fillRect(0, y, w, 1); }
  crowd(g, 0, w, rows, r, false);
  g.fillStyle = withAlpha('#0e1118', 0.25); g.fillRect(0, b0, w, bh * 0.4);
  // the courtside boards along the bleachers' foot
  const bd = clamp(bh * 0.1, 6, 16), boards = ['#2f5fa8', '#1b1d22', '#e8c547', '#2f3a44'];
  for (let x = 0, i = 0; x < w; x += 80, i++) { g.fillStyle = boards[i % boards.length]; g.fillRect(x, horizon - bd, 80, bd); g.fillStyle = withAlpha('#ffffff', 0.6); g.fillRect(x + 16, horizon - bd * 0.6, 44, bd * 0.22); }
  // the scoreboard hung over the court, clear of where it is thrown from
  const sbW = clamp(w * 0.14, 80, 170), sbH = sbW * 0.42, sbX = clamp(x0 + (w - x0) * 0.5, w * 0.35, w - sbW / 2 - 20) - sbW / 2, sbY = ty + 24;
  if (sbY + sbH < b0 - 4) {
    g.strokeStyle = '#3a4050'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(sbX + sbW * 0.2, ty + 14); g.lineTo(sbX + sbW * 0.2, sbY); g.moveTo(sbX + sbW * 0.8, ty + 14); g.lineTo(sbX + sbW * 0.8, sbY); g.stroke();
    g.fillStyle = '#0a0c10'; g.beginPath(); g.roundRect(sbX, sbY, sbW, sbH, 4); g.fill();
    g.strokeStyle = '#3a4050'; g.lineWidth = 1.5; g.stroke();
    // two scores and the clock, as lit panels: no numbers that could be read as the question's
    for (const [u, col] of [[0.08, '#e8c547'], [0.62, '#e8c547'], [0.36, '#f2f4f6']]) { g.fillStyle = withAlpha(col, 0.9); g.fillRect(sbX + sbW * u, sbY + sbH * 0.3, sbW * 0.3, sbH * 0.4); g.fillStyle = '#0a0c10'; for (let i = 1; i < 3; i++) g.fillRect(sbX + sbW * (u + i * 0.1) - 1, sbY + sbH * 0.3, 2, sbH * 0.4); }
    c.reserve?.({ x: sbX - 4, y: ty, w: sbW + 8, h: sbY + sbH - ty + 4 });
  }
  // the floor: maple boards, glossy, the lights in its shine
  floorboards(g, 0, w, horizon, h, { seed: 29 });
  const yF = horizon + 2, yN = oy + clamp((h - oy) * 0.6, 14, 70);
  const shine = g.createLinearGradient(0, horizon, 0, h); shine.addColorStop(0, withAlpha('#ffffff', n ? 0.06 : 0.18)); shine.addColorStop(0.4, withAlpha('#ffffff', 0)); g.fillStyle = shine; g.fillRect(0, horizon, w, h - horizon);
  for (let x = 40; x < w; x += 120) { g.fillStyle = withAlpha('#fff8e2', 0.12); g.beginPath(); g.ellipse(x, lerp(horizon, oy, 0.5), 14, 3, 0, 0, TAU); g.fill(); }
  // the sidelines
  g.strokeStyle = withAlpha('#ffffff', 0.85); g.lineWidth = 2;
  for (const y of [yF + (oy - yF) * 0.15, yN]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  if (!hoop) {
    // the half-way line and the centre circle, clear of where it is thrown from
    const mx = clamp(x0 + (w - x0) * 0.5, x0 + 60, w - 60);
    across(g, mx, yF + (oy - yF) * 0.15, yN, oy, s);
    g.beginPath(); g.ellipse(mx, oy, clamp(1.8 * k, 20, 60), (yN - yF) * 0.22, 0, 0, TAU); g.stroke();
  } else {
    // the key under the hoop: painted, the free-throw line, the arc, the baseline
    const { x: hx } = hoop, base = hx + 1.575 * k, ft = base - 5.8 * k, y0 = lerp(yF, oy, 0.45), y1 = lerp(oy, yN, 0.55);
    g.fillStyle = withAlpha(n ? '#24406e' : '#2f5fa8', 0.75);
    g.beginPath(); g.moveTo(ft + (oy - y0) * s, y0); g.lineTo(base + (oy - y0) * s, y0); g.lineTo(base - (y1 - oy) * s, y1); g.lineTo(ft - (y1 - oy) * s, y1); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#ffffff', 0.85); g.stroke();
    across(g, base, yF + (oy - yF) * 0.15, yN, oy, s);
    g.beginPath(); g.ellipse(hx, oy, 6.75 * k, (yN - yF) * 0.42, 0, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
  }
  // from a height: the front of the bleachers' upper tier, under the arena's own roof
  if (H0 > 0) grandstand(g, x0, top, oy, k, r, n, { roof: false });
  if (!hoop) return;
  // ── the hoop: the ring through which the engine's path passes, on the way down
  // (the ring and the board drawn at least big enough to read, as the ball is)
  const { x: hx, y: hy, age = -1 } = hoop, R = Math.max(0.225 * k, 11), rimH = Math.max(2.5, R * 0.22);
  const bx = hx + R * 1.65, bTop = hy - Math.max(0.9 * k, R * 4), D = clamp(0.9 * k, 16, 54);
  // the board's foot stays above where the path passes under it, never through it (rule 4)
  const under = hoop.at?.(bx - (D / 2) * s), bBot = under == null ? hy + Math.max(0.15 * k, R * 0.6) : clamp(under - Math.max(8, R * 0.7), hy + 3, hy + Math.max(0.15 * k, R * 0.6));
  // the board's face spans the court's depth: a parallelogram, leaning as the lines do
  const face = (x, y0, y1) => { g.beginPath(); g.moveTo(x + (D / 2) * s, y0 - D / 2); g.lineTo(x + (D / 2) * s, y1 - D / 2); g.lineTo(x - (D / 2) * s, y1 + D / 2); g.lineTo(x - (D / 2) * s, y0 + D / 2); g.closePath(); };
  // the rig: hung from the roof trusses on two steel rods and a brace, nothing on the floor in the way
  const steel = n ? '#3a4a6a' : '#5a6478', roof = c.truss ?? 24;
  g.strokeStyle = steel; g.lineWidth = clamp(0.06 * k, 2.5, 5); g.lineCap = 'round';
  g.beginPath(); g.moveTo(bx + (D / 2) * s, bTop - D / 2); g.lineTo(bx + (D / 2) * s, roof); g.moveTo(bx - (D / 2) * s, bTop + D / 2); g.lineTo(bx - (D / 2) * s + 6, roof); g.moveTo(bx, bTop); g.lineTo(bx + clamp(1.2 * k, 24, 70), roof); g.stroke();
  // the backboard: a dark backing behind clear glass, a white frame and its target square
  face(bx, bTop, bBot); g.fillStyle = withAlpha('#0e1118', 0.55); g.fill(); g.fillStyle = withAlpha('#dfe8f0', 0.3); g.fill();
  g.strokeStyle = '#f6f8fa'; g.lineWidth = 2.5; g.stroke();
  face(bx, hy - (bBot - bTop) * 0.42, hy); g.strokeStyle = '#f6f8fa'; g.lineWidth = 2; g.stroke();
  // the net: strands from the ring down to a narrower mouth, swishing as it goes through
  const sw = age >= 0 ? Math.exp(-age * 3) : 0, ph = age >= 0 ? age * 22 : 0;
  const drop = R * 1.9 * (1 + 0.25 * sw * Math.abs(Math.sin(ph * 0.5))), sway = R * 0.55 * sw * Math.sin(ph);
  g.strokeStyle = withAlpha('#ffffff', 0.95); g.lineWidth = 1.2;
  const mouth = (u) => ({ x: hx + sway + (u - 0.5) * 2 * R * 0.55, y: hy + drop });
  for (let i = 0; i <= 8; i++) { const u = i / 8, top0 = hx + (u - 0.5) * 2 * R, m = mouth(u); g.beginPath(); g.moveTo(top0, hy); g.quadraticCurveTo(top0 + sway * 0.4, hy + drop * 0.5, m.x, m.y); g.stroke(); }
  for (let j = 1; j <= 3; j++) { const q = j / 4; g.beginPath(); g.moveTo(hx - R * (1 - q * 0.45) + sway * q, hy + drop * q); g.lineTo(hx + R * (1 - q * 0.45) + sway * q, hy + drop * q); g.stroke(); }
  // the ring: red (never the velocity's orange), dark-edged so it reads on the crowd, its bracket to the board
  g.strokeStyle = '#1b1d22'; g.lineWidth = rimH + 2; g.beginPath(); g.ellipse(hx, hy, R, R * 0.3, 0, 0, TAU); g.stroke();
  g.strokeStyle = '#d23a3c'; g.lineWidth = rimH; g.stroke();
  g.lineWidth = Math.max(2.5, rimH); g.beginPath(); g.moveTo(hx + R, hy); g.lineTo(bx - 1, hy); g.stroke();
  c.reserve?.({ x: hx - R - 4, y: bTop - D - 4, w: bx - hx + R + D + 12, h: hy + drop - bTop + D + 8 });
}

/** A castle: its curtain wall to the battlements it is thrown from, a keep
    beyond with a flag, arrow slits and a gateway, the moat at its foot,
    fields and a far village under the hills. The moat only where it lands
    beyond it, so it never lands in water the engine calls ground. */
function castle(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(197), horizon = oy - clamp((oy - 40) * 0.24, 34, 140);
  sky(g, w, horizon, x0, { far: 'none', seed: 141, clouds: 3 });
  // the hills, a far village with its church spire
  g.fillStyle = n ? '#25332a' : '#86a878'; g.beginPath(); g.moveTo(0, horizon);
  for (let x = 0; x <= w; x += 40) g.lineTo(x, horizon - 18 - Math.sin(x * 0.006 + 1) * 14 - Math.sin(x * 0.017) * 6);
  g.lineTo(w, horizon); g.closePath(); g.fill();
  const vx = clamp(x0 + (w - x0) * 0.62, w * 0.5, w - 70);
  for (let i = 0; i < 6; i++) { const hx = vx + i * 14 - 40, hw = 10 + r() * 6, hh = 7 + r() * 5; g.fillStyle = n ? '#5a5a62' : '#e8e0d0'; g.fillRect(hx, horizon - hh, hw, hh); g.fillStyle = n ? '#3a3e48' : '#5a6070'; g.beginPath(); g.moveTo(hx - 1, horizon - hh); g.lineTo(hx + hw / 2, horizon - hh - 5); g.lineTo(hx + hw + 1, horizon - hh); g.closePath(); g.fill(); }
  g.fillStyle = n ? '#6a6a72' : '#d8d0c0'; g.fillRect(vx + 46, horizon - 22, 8, 22); g.beginPath(); g.moveTo(vx + 45, horizon - 22); g.lineTo(vx + 50, horizon - 40); g.lineTo(vx + 55, horizon - 22); g.closePath(); g.fill();
  c.reserve?.({ x: vx - 42, y: horizon - 42, w: 100, h: 44 });
  grass(g, 0, w, horizon, h);
  // the moat at the wall's foot, when it lands beyond it
  const land = (c.clearX || [])[0] ?? w, mw = clamp(5 * k, 24, 110), wet = H0 > 0 && land > x0 + mw + 24;
  if (wet) {
    // cut away in section, as the well is: a ditch at the wall's foot, its water a little below the field
    const dep = clamp(2.5 * k, 10, 44), lip = Math.max(3, dep * 0.15);
    g.fillStyle = n ? '#2e261e' : '#6a5038'; g.beginPath(); g.moveTo(x0, oy); g.lineTo(x0 + mw, oy); g.quadraticCurveTo(x0 + mw - 2, oy + dep, x0 + mw * 0.5, oy + dep + 3); g.quadraticCurveTo(x0 + 2, oy + dep, x0, oy + dep * 0.6); g.closePath(); g.fill();
    g.save(); g.beginPath(); g.moveTo(x0, oy + lip); g.lineTo(x0 + mw - 3, oy + lip); g.quadraticCurveTo(x0 + mw - 5, oy + dep - 2, x0 + mw * 0.5, oy + dep); g.quadraticCurveTo(x0 + 3, oy + dep - 2, x0, oy + dep * 0.55); g.closePath(); g.clip();
    water(g, x0 - 4, x0 + mw + 4, oy + lip, oy + dep + 4, { phase });
    g.restore();
    g.strokeStyle = withAlpha('#ffffff', 0.45); g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 1, oy + lip); g.lineTo(x0 + mw - 3, oy + lip); g.stroke();
  }
  if (!(H0 > 0)) return;
  const H = oy - top, stoneCol = n ? '#6a665e' : '#c8bca6', course = clamp(0.5 * k, 5, 14);
  // the keep beyond the wall: taller, set back, with its own battlements and the flag
  const kw = clamp(H * 0.45, 40, 160), kx = x0 - clamp(H * 0.25, 20, 90) - kw * 1.35, kTop = top - clamp(H * 0.35, 20, 120);
  if (kx + kw > 0) {
    stone(g, kx, kTop, kw, oy - kTop, { course, color: n ? '#5e5a54' : '#bcb09a', seed: 41 });
    const mW = kw / 7;
    for (let i = 0; i < 7; i += 2) { g.fillStyle = n ? '#5e5a54' : '#bcb09a'; g.fillRect(kx + i * mW, kTop - mW * 0.9, mW, mW * 0.9); }
    g.fillStyle = '#1b1d22'; for (let j = 0; j < 3; j++) g.fillRect(kx + kw * 0.5 - 1.5, kTop + (oy - kTop) * (0.18 + j * 0.22), 3, clamp(0.9 * k, 8, 20));
    const fx = Math.max(kx + kw * 0.5, 12), fy = kTop - mW - clamp(2.2 * k, 20, 60);
    g.strokeStyle = n ? '#8a8a90' : '#5a5a60'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(fx, kTop - mW * 0.9); g.lineTo(fx, fy); g.stroke();
    const wv = Math.sin(phase * 3) * 2, fw = clamp(1.3 * k, 16, 40), fh = fw * 0.6;
    g.fillStyle = n ? '#2a3a6a' : '#2f4fa0'; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + fw * 0.5, fy + wv - 2, fx + fw, fy + wv); g.lineTo(fx + fw, fy + fh + wv); g.quadraticCurveTo(fx + fw * 0.5, fy + fh + wv - 2, fx, fy + fh); g.closePath(); g.fill();
    g.fillStyle = '#e8c547'; g.beginPath(); g.arc(fx + fw * 0.5, fy + fh * 0.5 + wv * 0.5, fh * 0.22, 0, TAU); g.fill();
  }
  // the curtain wall: battered at its foot, its stones, the gateway
  const ww = clamp(H * 1.1, 60, x0 + 4), plinth = clamp(H * 0.12, 6, 40);
  stone(g, x0 - ww, top, ww, oy - top, { course, color: stoneCol, seed: 43 });
  g.fillStyle = n ? '#5a564e' : '#b0a48e'; g.beginPath(); g.moveTo(x0 - ww, oy - plinth); g.lineTo(x0 - plinth * 0.35, oy - plinth); g.lineTo(x0, oy); g.lineTo(x0 - ww, oy); g.closePath(); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1; g.beginPath(); g.moveTo(x0 - ww, oy - plinth); g.lineTo(x0 - plinth * 0.35, oy - plinth); g.lineTo(x0, oy); g.stroke();
  const gw = clamp(3 * k, 20, 60), gh = Math.min(H * 0.4, gw * 1.3), gx = x0 - ww * 0.55;
  if (gx - gw / 2 > 4) {
    g.fillStyle = '#14161a'; g.beginPath(); g.moveTo(gx - gw / 2, oy); g.lineTo(gx - gw / 2, oy - gh + gw / 2); g.arc(gx, oy - gh + gw / 2, gw / 2, Math.PI, 0); g.lineTo(gx + gw / 2, oy); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#3a3026', 0.9); g.lineWidth = 1.5; for (let x = gx - gw / 2 + 4; x < gx + gw / 2; x += 6) { g.beginPath(); g.moveTo(x, oy - gh + gw * 0.3); g.lineTo(x, oy - gh * 0.45); g.stroke(); }
  }
  // arrow slits down the wall
  const sl = clamp(0.9 * k, 10, 22);
  for (const [u, v] of [[0.3, 0.22], [0.62, 0.38], [0.82, 0.18]]) {
    const sx = x0 - ww * u, sy = top + H * v;
    if (sx < 6 || sx > x0 - 20 || sy + sl > oy - plinth - 4 || Math.abs(sx - (x0 - ww * 0.55)) < 14 && sy + sl > oy - H * 0.45) continue;
    g.fillStyle = withAlpha('#ffffff', n ? 0.08 : 0.35); g.fillRect(sx - 4, sy - 3, 8, sl + 6);
    g.fillStyle = '#1b1d22'; g.fillRect(sx - 1.5, sy, 3, sl); g.fillRect(sx - 3.5, sy + sl * 0.4, 7, 2);
  }
  // the battlements: merlons along the top, a gap (a crenel) at the front edge it leaves from
  const mH = clamp(0.9 * k, 7, 24), mW = clamp(0.8 * k, 7, 20);
  g.fillStyle = stoneCol;
  for (let x = x0 - mW * 2; x > x0 - ww - 1; x -= mW * 2) g.fillRect(Math.max(x0 - ww, x - mW), top - mH, Math.min(mW, x - (x0 - ww)), mH);
  g.fillStyle = withAlpha('#000000', 0.2); for (let x = x0 - mW * 2; x > x0 - ww; x -= mW * 2) g.fillRect(x - 2, top - mH, 2, mH);
  g.fillStyle = withAlpha('#ffffff', n ? 0.06 : 0.3); g.fillRect(x0 - ww, top, ww, 1.5);
  // ivy up the wall's foot, and the shadow it throws
  g.fillStyle = n ? '#1c2a1c' : '#4a6a3a'; for (let i = 0; i < 18; i++) { const ix = x0 - ww * (0.05 + r() * 0.3), iy = oy - plinth - r() * H * 0.3; g.beginPath(); g.arc(ix, iy, 2 + r() * 3, 0, TAU); g.fill(); }
  softShadow(g, x0 + 8, oy + 2, 26, 4, 0.5);
}

/* ── an airfield ────────────────────────────────────────────────────────── */

/** An airfield: the terminal and its control tower beyond, an airliner at
    its gate, a windsock; the grass, then the runway with its edge lights and
    the dashed centre line along the flight's own depth. From a height: the
    aircraft steps up to a plane's door (to about 7 m), or the control tower's
    gallery above that. */
function runway(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(229), horizon = oy - clamp((oy - 40) * 0.3, 40, 150);
  sky(g, w, horizon, x0, { far: 'none', seed: 151, clouds: 3 });
  // the terminal: long, low, glazed, along the horizon, clear of where it is thrown from
  const tx0 = clamp(x0 + 60, w * 0.3, w * 0.6), tw = Math.min(w - tx0 - 10, clamp(w * 0.45, 160, 520)), th = clamp((oy - horizon) * 0.35, 14, 44);
  g.fillStyle = n ? '#4a5060' : '#d8dce2'; g.fillRect(tx0, horizon - th, tw, th);
  g.fillStyle = n ? withAlpha(E.window, 0.45) : '#7a96b2'; g.fillRect(tx0 + 4, horizon - th * 0.8, tw - 8, th * 0.45);
  g.fillStyle = withAlpha('#ffffff', 0.25); for (let x = tx0 + 8; x < tx0 + tw - 6; x += 14) g.fillRect(x, horizon - th * 0.8, 1, th * 0.45);
  g.fillStyle = n ? '#3a3e48' : '#9aa2ae'; g.fillRect(tx0 - 4, horizon - th - 4, tw + 8, 5);
  // the control tower at the terminal's end: its shaft, the glazed cab, the antenna
  const cx = tx0 + tw - clamp(tw * 0.08, 14, 40), ch = th * 2.6;
  g.fillStyle = n ? '#5a6070' : '#c8ccd2'; g.fillRect(cx - 5, horizon - ch, 10, ch);
  g.fillStyle = n ? '#3a3e48' : '#6a7280'; g.beginPath(); g.moveTo(cx - 13, horizon - ch); g.lineTo(cx + 13, horizon - ch); g.lineTo(cx + 10, horizon - ch - 12); g.lineTo(cx - 10, horizon - ch - 12); g.closePath(); g.fill();
  g.fillStyle = n ? withAlpha(E.window, 0.9) : '#a9c4dc'; g.fillRect(cx - 10, horizon - ch - 10, 20, 7);
  g.strokeStyle = n ? '#8a8e96' : '#5a6070'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, horizon - ch - 12); g.lineTo(cx, horizon - ch - 24); g.stroke();
  // an airliner at its gate in front of the terminal, side on: fuselage outlined against the
  // glass, its fin, wing, engine, windows and its gear down on the apron
  const pl = clamp(tw * 0.38, 90, 200), px = tx0 + tw * 0.2, gear = pl * 0.05, py = horizon - gear;
  const fus = pl * 0.085;
  g.fillStyle = n ? '#3a4a6a' : '#2f5fa8'; g.beginPath(); g.moveTo(px + pl * 0.05, py - fus * 0.9); g.lineTo(px + pl * 0.01, py - fus - pl * 0.14); g.lineTo(px + pl * 0.09, py - fus - pl * 0.14); g.lineTo(px + pl * 0.2, py - fus * 0.9); g.closePath(); g.fill();
  g.fillStyle = n ? '#c8ccd2' : '#f8f9fa'; g.beginPath(); g.moveTo(px, py - fus * 0.75); g.lineTo(px + pl * 0.9, py - fus); g.quadraticCurveTo(px + pl * 1.02, py - fus * 0.95, px + pl, py - fus * 0.3); g.quadraticCurveTo(px + pl * 0.97, py, px + pl * 0.85, py); g.lineTo(px + pl * 0.1, py); g.closePath(); g.fill();
  g.strokeStyle = n ? '#1b1d22' : '#4a5260'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = n ? withAlpha(E.window, 0.7) : '#3a4656'; for (let i = 0; i < 16; i++) g.fillRect(px + pl * (0.16 + i * 0.045), py - fus * 0.7, pl * 0.016, fus * 0.22);
  g.fillStyle = n ? '#1b1d22' : '#3a4656'; g.beginPath(); g.moveTo(px + pl * 0.9, py - fus * 0.8); g.lineTo(px + pl * 0.96, py - fus * 0.75); g.lineTo(px + pl * 0.95, py - fus * 0.55); g.lineTo(px + pl * 0.9, py - fus * 0.55); g.closePath(); g.fill();
  g.fillStyle = '#2f5fa8'; g.fillRect(px + pl * 0.06, py - fus * 0.42, pl * 0.86, Math.max(1.5, fus * 0.12));
  g.fillStyle = n ? '#8a9098' : '#aeb4bc'; g.beginPath(); g.moveTo(px + pl * 0.42, py - fus * 0.3); g.lineTo(px + pl * 0.3, py + gear * 0.2); g.lineTo(px + pl * 0.5, py - fus * 0.3); g.closePath(); g.fill();
  g.fillStyle = n ? '#5a6070' : '#7a828e'; g.beginPath(); g.roundRect(px + pl * 0.36, py - fus * 0.2, pl * 0.11, fus * 0.42, fus * 0.2); g.fill();
  g.strokeStyle = '#2b2a2e'; g.lineWidth = 1.2; for (const gx2 of [px + pl * 0.82, px + pl * 0.42]) { g.beginPath(); g.moveTo(gx2, py); g.lineTo(gx2, horizon - 2); g.stroke(); g.fillStyle = '#1d1e22'; g.beginPath(); g.arc(gx2, horizon - 2, Math.max(1.6, gear * 0.4), 0, TAU); g.fill(); }
  // the grass to the runway, then the runway: tarmac, its edges, edge lights and the centre line
  grass(g, 0, w, horizon, h);
  const yF = lerp(horizon, oy, 0.45), yN = oy + clamp((h - oy) * 0.5, 14, 60);
  const tg = g.createLinearGradient(0, yF, 0, yN); tg.addColorStop(0, n ? '#2a2c30' : '#5a5e64'); tg.addColorStop(1, n ? '#1e2024' : '#45484e');
  g.fillStyle = tg; g.fillRect(0, yF, w, yN - yF);
  g.fillStyle = withAlpha('#ffffff', 0.05); for (let i = 0; i < (w * (yN - yF)) / 60; i++) g.fillRect(r() * w, yF + r() * (yN - yF), 2, 1);
  g.fillStyle = withAlpha('#ffffff', n ? 0.6 : 0.85); g.fillRect(0, yF + 2, w, 2); g.fillRect(0, yN - 4, w, 2.5);
  // the centre line, dashed along the depth the flight is in, its rubber marks where wheels touch
  for (let x = -r() * 40; x < w; x += 46) g.fillRect(x, oy - 1, 26, 2.5);
  g.fillStyle = withAlpha('#000000', 0.25); for (let i = 0; i < 6; i++) { const x = r() * w; g.fillRect(x, oy + 4 + r() * 6, 30 + r() * 40, 2); }
  for (let x = 12; x < w; x += 54) for (const [y, rr] of [[yF, 2], [yN - 2, 3]]) {
    g.fillStyle = n ? '#fff6c8' : '#f4f0d8'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    if (n) { const gl = g.createRadialGradient(x, y, 0, x, y, rr * 4); gl.addColorStop(0, 'rgba(255,246,200,0.5)'); gl.addColorStop(1, 'rgba(255,246,200,0)'); g.fillStyle = gl; g.fillRect(x - rr * 4, y - rr * 4, rr * 8, rr * 8); }
  }
  // a windsock on the far side, red and white, clear of where it lands
  const land = (c.clearX || [])[0] ?? w, wx = [land + 90, w - 40, x0 + 90].find((x) => x > 20 && x < w - 20 && Math.abs(x - land) > 70 && !(x > x0 - 90 && x < x0 + 50) && !(x > tx0 - 10 && x < tx0 + tw + 10));
  if (wx != null) {
    const wh = clamp((yF - horizon) * 1.4, 18, 50), wy = yF - 4;
    g.strokeStyle = n ? '#8a8e96' : '#5a6070'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx, wy - wh); g.stroke();
    for (let i = 0; i < 4; i++) { const sx = wx + i * wh * 0.12; g.fillStyle = i % 2 ? '#f4f4f4' : '#d0405f'; g.beginPath(); g.moveTo(sx, wy - wh - wh * 0.08 + i * wh * 0.012); g.lineTo(sx + wh * 0.12, wy - wh - wh * 0.07 + (i + 1) * wh * 0.012); g.lineTo(sx + wh * 0.12, wy - wh + wh * 0.07 - (i + 1) * wh * 0.012); g.lineTo(sx, wy - wh + wh * 0.08 - i * wh * 0.012); g.closePath(); g.fill(); }
  }
  if (!(H0 > 0)) return;
  const H = oy - top;
  if (H0 <= 7) {
    // the aircraft steps: a truck whose stair climbs to a railed platform at the top, the stair's
    // side panel solid, its treads stepping up along it, struts down to the chassis
    const plat = clamp(1.2 * k, 14, 40), deck = clamp(0.25 * k, 4, 10), run = Math.max(H * 0.6, Math.min(H * 1.1, x0 - plat - 30 - plat * 0.6)), base = x0 - plat - run;
    const chY = oy - clamp(0.9 * k, 10, 26), chH = clamp(0.45 * k, 6, 14), side = clamp(0.35 * k, 6, 16);
    const white = n ? '#a8acb4' : '#eef0f3', grey = n ? '#6a7080' : '#9aa2ae', yel = n ? '#8a7a3a' : '#e8c547';
    // the chassis and its cab, low at the far end, wheels under it
    g.fillStyle = yel; g.fillRect(base - plat * 0.6, chY, run + plat * 1.4, chH);
    g.fillStyle = yel; g.beginPath(); g.roundRect(base - plat * 0.6, chY - chH * 1.6, plat * 0.9, chH * 1.6, 3); g.fill();
    g.fillStyle = n ? withAlpha(E.window, 0.8) : '#a9c4dc'; g.fillRect(base - plat * 0.5, chY - chH * 1.4, plat * 0.6, chH * 0.7);
    for (const wx2 of [base - plat * 0.2, x0 - plat * 0.6]) { g.fillStyle = '#1d1e22'; g.beginPath(); g.arc(wx2, oy - chH * 0.55, chH * 0.55, 0, TAU); g.fill(); g.fillStyle = '#8a9098'; g.beginPath(); g.arc(wx2, oy - chH * 0.55, chH * 0.22, 0, TAU); g.fill(); }
    // the struts from the chassis up under the stair and the platform
    g.strokeStyle = grey; g.lineWidth = Math.max(2, 0.08 * k); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(x0 - plat * 0.5, chY); g.lineTo(x0 - plat * 0.5, top + deck); g.moveTo(base + run * 0.5, chY); g.lineTo(x0 - plat, top + H * 0.35); g.moveTo(base + run * 0.55, chY); g.lineTo(base + run * 0.55, lerp(chY, top, 0.5) + side); g.stroke();
    // the stair's side panel, from the chassis up to the platform
    const sx0 = base, sy0 = chY, sx1 = x0 - plat, sy1 = top;
    g.fillStyle = white; g.beginPath(); g.moveTo(sx0, sy0); g.lineTo(sx1, sy1); g.lineTo(sx1, sy1 + side); g.lineTo(sx0 + side * 0.8, sy0 + side * 0.3); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; g.stroke();
    // the treads: a step profile along the top of the panel
    const steps = Math.max(5, Math.round(H / 0.2 / Math.max(1, H / 6)));
    g.fillStyle = grey; g.beginPath(); g.moveTo(sx0, sy0);
    for (let i = 0; i < steps; i++) { const u0 = i / steps, u1 = (i + 1) / steps; g.lineTo(lerp(sx0, sx1, u0), lerp(sy0, sy1, u1)); g.lineTo(lerp(sx0, sx1, u1), lerp(sy0, sy1, u1)); }
    g.lineTo(sx1, sy1 + 2); g.lineTo(sx0, sy0 + 2); g.closePath(); g.fill();
    // the platform, its deck and the guard rail round its back
    g.fillStyle = white; g.fillRect(sx1, top, plat, deck); g.strokeStyle = withAlpha('#000000', 0.3); g.strokeRect(sx1, top, plat, deck);
    const rh = clamp(1 * k, 12, 30);
    g.strokeStyle = grey; g.lineWidth = Math.max(1.6, 0.05 * k);
    g.beginPath(); g.moveTo(sx0 + side, sy0 - rh); g.lineTo(sx1, sy1 - rh); g.lineTo(sx1 + plat * 0.5, sy1 - rh); g.stroke();
    for (let i = 0; i <= 4; i++) { const u = i / 4, px = lerp(sx0 + side, sx1, u), py = lerp(sy0, sy1, u); g.beginPath(); g.moveTo(px, py); g.lineTo(px, py - rh); g.stroke(); }
    g.beginPath(); g.moveTo(sx1 + plat * 0.5, sy1); g.lineTo(sx1 + plat * 0.5, sy1 - rh); g.stroke();
    softShadow(g, (base + x0) / 2, oy + 2, run * 0.6, 4, 0.6);
  } else {
    // the control tower: a smooth concrete shaft, its gallery (the top it leaves from)
    // and the glazed cab above and behind it, sized in metres
    const sw = clamp(2.5 * k, 16, 90), cabW = clamp(6 * k, 30, 220), cabH = clamp(3.5 * k, 18, 130), gal = clamp(1.5 * k, 8, 50);
    const sg = g.createLinearGradient(x0 - gal - sw, 0, x0 - gal, 0); sg.addColorStop(0, n ? '#7a7e86' : '#e2e4e8'); sg.addColorStop(1, n ? '#4a4e56' : '#a8acb4');
    g.fillStyle = sg; g.fillRect(x0 - gal - sw, top, sw, H);
    g.fillStyle = withAlpha('#000000', 0.12); for (let y = top + 30; y < oy; y += 30) g.fillRect(x0 - gal - sw, y, sw, 1);
    // the gallery slab, its top where it is thrown from
    g.fillStyle = n ? '#6a6e76' : '#c8ccd2'; g.fillRect(x0 - cabW * 0.6 - gal, top, cabW * 0.6 + gal, clamp(0.4 * k, 4, 14));
    g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(x0 - cabW * 0.6 - gal, top + clamp(0.4 * k, 4, 14), cabW * 0.6 + gal, 2);
    // the cab, set back from the gallery's edge: its sloped glass and roof
    const cx0 = x0 - gal - cabW * 0.55, cy0 = top - cabH;
    g.fillStyle = n ? '#3a3e48' : '#6a7280'; g.fillRect(cx0 - cabW * 0.45, cy0 - cabH * 0.12, cabW * 0.9, cabH * 0.14);
    g.fillStyle = n ? withAlpha(E.window, 0.75) : '#a9c4dc'; g.beginPath(); g.moveTo(cx0 - cabW * 0.42, cy0 + cabH * 0.02); g.lineTo(cx0 + cabW * 0.42, cy0 + cabH * 0.02); g.lineTo(cx0 + cabW * 0.38, top); g.lineTo(cx0 - cabW * 0.38, top); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#ffffff', 0.35); g.lineWidth = 1; for (let i = 1; i < 6; i++) { const u = i / 6; g.beginPath(); g.moveTo(lerp(cx0 - cabW * 0.42, cx0 + cabW * 0.42, u), cy0 + cabH * 0.02); g.lineTo(lerp(cx0 - cabW * 0.38, cx0 + cabW * 0.38, u), top); g.stroke(); }
    g.strokeStyle = n ? '#8a8e96' : '#5a6070'; g.beginPath(); g.moveTo(cx0, cy0 - cabH * 0.12); g.lineTo(cx0, cy0 - cabH * 0.5); g.stroke();
    // the gallery's rail: posts and a top rail, behind where the person stands
    const rh = clamp(1 * k, 8, 34), rx0 = cx0 + cabW * 0.42, rx1 = x0 - clamp(0.8 * k, 6, 30);
    if (rx1 > rx0 + 4) { g.strokeStyle = n ? '#c8ccd2' : '#7a828e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(rx0, top - rh); g.lineTo(rx1, top - rh); for (let x = rx0; x <= rx1; x += Math.max(6, (rx1 - rx0) / 4)) { g.moveTo(x, top); g.lineTo(x, top - rh); } g.stroke(); }
    softShadow(g, x0 - gal - sw / 2, oy + 2, sw, 4, 0.6);
  }
}

/* ── a garden, a farm, a cricket ground ─────────────────────────────────── */

/** Something free along the ground: the first of `xs` whose half-width
    `half` keeps it clear of where it is thrown from and where it lands. */
const spot = (xs, half, x0, land, w) => xs.find((x) => x != null && x - half > 8 && x + half < w - 8 && (x + half < x0 - 30 || x - half > x0 + 20) && Math.abs(x - land) > half + 50);

/** Whether the engine's path stays well clear above a prop spanning xa..xb
    whose top is at yTop (px): never under the arc's top and its labels. */
const underSky = (c, xa, xb, yTop, gap = 60) => {
  if (!c.over || !c.X || !c.Y) return true;
  for (let x = xa; x <= xb; x += Math.max(4, (xb - xa) / 10)) { const y = c.over((x - c.X(0)) / c.k); if (y != null && c.Y(y) > yTop - gap) return false; }
  return true;
};

/** A round-crowned tree on the horizon, darker below. */
function crown(g, x, y, R, n) {
  g.fillStyle = n ? '#1c2a1c' : '#3f6a3a'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  g.fillStyle = n ? '#243424' : '#4f7c45'; g.beginPath(); g.arc(x - R * 0.3, y - R * 0.3, R * 0.6, 0, TAU); g.fill();
}

/** A back garden: the fence along its end with a border of flowers in front,
    the neighbours' trees beyond, a striped lawn; a shed, a greenhouse and a
    washing line set clear of the flight. From a height: the shed's roof (to
    about 3 m), or the back of the house, from an upstairs window. */
function garden(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(233), horizon = oy - clamp((oy - 40) * 0.32, 40, 160);
  const fh = clamp(1.8 * k, 18, 60);
  sky(g, w, horizon - fh, x0, { far: 'none', seed: 161, clouds: 3 });
  for (let x = -10 + r() * 30; x < w + 20; x += 30 + r() * 40) crown(g, x, horizon - fh - 6 - r() * 10, 16 + r() * 18, n);
  // the fence: overlapping wooden panels on posts
  g.fillStyle = n ? '#4a3a2c' : '#8a6a4a'; g.fillRect(0, horizon - fh, w, fh);
  g.strokeStyle = withAlpha('#000000', 0.18); g.lineWidth = 1; for (let y = horizon - fh + 5; y < horizon; y += 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = n ? '#3a2c20' : '#6a4e34'; for (let x = 0; x < w; x += clamp(1.8 * k, 40, 120)) g.fillRect(x - 3, horizon - fh - 4, 6, fh + 4);
  // the lawn, mown in stripes, and the border in front of the fence: shrubs and flowers
  mownTurf(g, w, horizon, h, n, { lo: '#6fa652', hi: '#7cb35c', line: false });
  g.fillStyle = n ? '#2a2018' : '#5a4430'; g.fillRect(0, horizon, w, clamp(0.5 * k, 5, 14));
  const petals = n ? ['#8a6a7a', '#9a9a6a', '#c8c8c8'] : ['#e86a9a', '#f2c21b', '#ffffff', '#d84a6a', '#f4e4a0'];
  for (let x = r() * 20; x < w; x += 14 + r() * 26) {
    const R = 8 + r() * 12; g.fillStyle = n ? '#1e2e1e' : r() < 0.5 ? '#3e6a34' : '#4a7a3a'; g.beginPath(); g.arc(x, horizon - R * 0.3, R, Math.PI, TAU); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = petals[Math.floor(r() * petals.length)]; g.beginPath(); g.arc(x + (r() - 0.5) * R * 1.4, horizon - R * 0.3 - r() * R * 0.8, 1.8 + r() * 1.5, 0, TAU); g.fill(); }
  }
  const land = (c.clearX || [])[0] ?? w;
  // the greenhouse: an aluminium frame and glass, staging inside
  const gw = clamp(3 * k, 50, 150), gh = gw * 0.6, gyT = lerp(horizon, oy, 0.35) - gw * 0.6, gx = [land + 90 + gw / 2, w - gw / 2 - 20, x0 - gw / 2 - 60, x0 + (w - x0) * 0.3].find((x) => spot([x], gw / 2, x0, land, w) != null && underSky(c, x - gw / 2, x + gw / 2, gyT));
  if (gx != null) {
    const gy = lerp(horizon, oy, 0.35), l = gx - gw / 2;
    g.fillStyle = withAlpha(n ? '#5a6a7a' : '#dfeaf2', n ? 0.5 : 0.55); g.beginPath(); g.moveTo(l, gy); g.lineTo(l, gy - gh * 0.65); g.lineTo(gx, gy - gh); g.lineTo(l + gw, gy - gh * 0.65); g.lineTo(l + gw, gy); g.closePath(); g.fill();
    g.strokeStyle = n ? '#8a9098' : '#b8bec6'; g.lineWidth = 1.4; g.stroke();
    for (let i = 1; i < 5; i++) { const x = l + (gw * i) / 5; g.beginPath(); g.moveTo(x, gy); g.lineTo(x, gy - gh * (0.65 + 0.35 * (1 - Math.abs(x - gx) / (gw / 2)))); g.stroke(); }
    g.beginPath(); g.moveTo(l, gy - gh * 0.35); g.lineTo(l + gw, gy - gh * 0.35); g.stroke();
    g.fillStyle = n ? '#2e4a2a' : '#5f9a48'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(l + gw * (0.12 + i * 0.15), gy - gh * 0.38, gw * 0.04, Math.PI, TAU); g.fill(); }
    softShadow(g, gx, gy + 1, gw * 0.55, 3, 0.5);
    c.reserve?.({ x: l - 4, y: gy - gh - 4, w: gw + 8, h: gh + 8 });
  }
  // the washing line between two posts, its clothes stirring
  const lw = clamp(5 * k, 90, 260), lyT = lerp(horizon, oy, 0.2) - clamp(1.9 * k, 26, 70), lx = [x0 + (w - x0) * 0.55, land - lw * 0.7, w * 0.8, land + lw * 0.6 + 60].find((x) => spot([x], lw / 2, x0, land, w) != null && underSky(c, x - lw / 2, x + lw / 2, lyT));
  if (lx != null && (gx == null || Math.abs(lx - gx) > lw / 2 + gw / 2 + 10)) {
    const ly = lerp(horizon, oy, 0.2), ph = clamp(1.9 * k, 26, 70), a = lx - lw / 2, b = lx + lw / 2;
    g.strokeStyle = n ? '#8a8e96' : '#7a828e'; g.lineWidth = 2; for (const x of [a, b]) { g.beginPath(); g.moveTo(x, ly); g.lineTo(x, ly - ph); g.stroke(); }
    g.strokeStyle = n ? '#aaaeb6' : '#d8dce2'; g.lineWidth = 1; g.beginPath(); g.moveTo(a, ly - ph); g.quadraticCurveTo(lx, ly - ph + 8, b, ly - ph); g.stroke();
    const clothes = n ? ['#5a6a8a', '#8a8a8a', '#9a9a6a'] : ['#2f5fa8', '#ffffff', '#f2c21b', '#e86a9a', '#7ab4e0'];
    for (let i = 0; i < 5; i++) {
      const u = (i + 0.7) / 6, x = lerp(a, b, u), y = ly - ph + 8 * (1 - (2 * u - 1) ** 2), cw = lw * 0.09, ch = cw * (1 + (i % 2) * 0.4), sw2 = Math.sin(phase * 2 + i) * 2;
      g.fillStyle = clothes[i % clothes.length]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + cw, y); g.lineTo(x + cw + sw2, y + ch); g.lineTo(x + sw2, y + ch); g.closePath(); g.fill();
      g.strokeStyle = withAlpha('#000000', 0.2); g.stroke();
    }
    c.reserve?.({ x: a - 4, y: ly - ph - 4, w: lw + 8, h: ph + 8 });
  }
  if (!(H0 > 0)) return;
  const H = oy - top;
  if (H0 <= 3.5) {
    // the shed: weatherboard walls, a window, its door, a felt roof sloping down to the edge it leaves from
    const sw = clamp(2.4 * k, 40, 130), wall = H * 0.8, l = x0 - sw;
    g.fillStyle = n ? '#3e4a3a' : '#5f7a5a'; g.fillRect(l, oy - wall, sw, wall);
    g.strokeStyle = withAlpha('#000000', 0.22); g.lineWidth = 1; for (let y = oy - wall + 5; y < oy; y += 6) { g.beginPath(); g.moveTo(l, y); g.lineTo(x0, y); g.stroke(); }
    g.fillStyle = n ? '#2a3428' : '#4a6046'; g.fillRect(l + sw * 0.1, oy - wall * 0.85, sw * 0.32, wall * 0.85);
    g.fillStyle = n ? withAlpha(E.window, 0.6) : '#a9c4dc'; g.fillRect(l + sw * 0.55, oy - wall * 0.75, sw * 0.3, wall * 0.3);
    g.strokeStyle = n ? '#5a6458' : '#e8ece4'; g.lineWidth = 1.5; g.strokeRect(l + sw * 0.55, oy - wall * 0.75, sw * 0.3, wall * 0.3);
    g.fillStyle = n ? '#1e2024' : '#2e3036'; g.beginPath(); g.moveTo(l - 6, oy - wall + 2); g.lineTo(l + sw * 0.15, top - 2); g.lineTo(x0 + 3, top - 2); g.lineTo(x0 + 3, top + 4); g.lineTo(l - 6, oy - wall + 8); g.closePath(); g.fill();
    softShadow(g, l + sw / 2, oy + 2, sw * 0.6, 4, 0.6);
  } else {
    // the back of the house (or a block of flats, higher up): yellow stock brick, a balcony
    // at the launch height and one every storey below, each with its railing behind the person
    const st = 3 * k, hw = clamp(Math.max(H * 0.5, 6 * k), 80, x0 + 4), l = x0 - hw, roofY = top - clamp(st * 0.9, 24, 120);
    g.fillStyle = n ? '#6a6250' : '#c8b48a'; g.fillRect(l, roofY, hw - clamp(0.9 * k, 8, 30), oy - roofY);
    g.strokeStyle = withAlpha('#000000', 0.1); g.lineWidth = 1; for (let y = roofY + 4; y < oy; y += 5) { g.beginPath(); g.moveTo(l, y); g.lineTo(x0 - clamp(0.9 * k, 8, 30), y); g.stroke(); }
    g.fillStyle = n ? '#2e3036' : '#4a4e56'; g.fillRect(l - 6, roofY - 6, hw - clamp(0.9 * k, 8, 30) + 12, 7);
    const fw = x0 - clamp(0.9 * k, 8, 30);
    for (let y = top, i = 0; y < oy - st * 0.6; y += st, i++) {
      // the window or the balcony door behind each balcony
      const dw = clamp(1 * k, 14, 50), dh = clamp(2.1 * k, 24, 100);
      g.fillStyle = n ? withAlpha(E.window, 0.6) : '#3a4656'; g.fillRect(fw - dw - clamp(0.5 * k, 4, 20), y - dh, dw, dh);
      g.strokeStyle = n ? '#8a8e96' : '#f4f2ee'; g.lineWidth = 2; g.strokeRect(fw - dw - clamp(0.5 * k, 4, 20), y - dh, dw, dh);
      // the slab out to the edge, its railing (posts and top rail) along the far side
      g.fillStyle = n ? '#8a8e96' : '#d8dce0'; g.fillRect(fw - 2, y, x0 - fw + 2, clamp(0.2 * k, 3, 10));
      const rh = clamp(1 * k, 10, 46); g.strokeStyle = n ? '#5a5e66' : '#3a3e48'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(fw, y - rh); g.lineTo(x0, y - rh); for (let x = fw; x <= x0; x += Math.max(4, (x0 - fw) / 4)) { g.moveTo(x, y); g.lineTo(x, y - rh); } g.stroke();
    }
    g.fillStyle = n ? '#4a4e56' : '#5a4a3a'; g.fillRect(l + hw * 0.2, oy - clamp(2 * k, 26, 80), clamp(0.9 * k, 14, 40), clamp(2 * k, 26, 80));
    softShadow(g, x0 + 6, oy + 2, 24, 4, 0.5);
  }
}

/** A farm: hedged fields rolling away, sheep grazing, round hay bales, a gate;
    the barn of dark timber under its grey roof, from whose hayloft door it
    leaves (from a height), its hoist beam over the door. */
function farm(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(239), horizon = oy - clamp((oy - 40) * 0.3, 40, 150);
  sky(g, w, horizon, x0, { far: 'none', seed: 167, clouds: 3 });
  // the fields: a patchwork rising behind, hedgerows between, trees along them
  const tones = n ? ['#2a3a26', '#34442c', '#3a4a2c', '#2e3e28'] : ['#7aa85a', '#9ab86a', '#c8c070', '#88b062'];
  for (let i = 0; i < 4; i++) {
    const y0 = horizon - 30 + i * 9;
    g.fillStyle = tones[i]; g.beginPath(); g.moveTo(0, horizon); for (let x = 0; x <= w; x += 30) g.lineTo(x, y0 + Math.sin(x * 0.008 + i * 1.7) * 8); g.lineTo(w, horizon); g.closePath(); g.fill();
    g.strokeStyle = n ? '#1a2418' : '#3e5e30'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= w; x += 30) g.lineTo(x, y0 + Math.sin(x * 0.008 + i * 1.7) * 8); g.stroke();
  }
  for (let x = r() * 60; x < w; x += 70 + r() * 90) crown(g, x, horizon - 30 + Math.sin(x * 0.008) * 8 - 6, 7 + r() * 6, n);
  grass(g, 0, w, horizon, h);
  g.fillStyle = withAlpha(n ? '#2a4a26' : '#6aa04a', 0.35); g.fillRect(0, horizon, w, h - horizon);
  const land = (c.clearX || [])[0] ?? w;
  // sheep grazing on the far side of the field
  for (let i = 0; i < 6; i++) {
    const sx = r() * w, sy = lerp(horizon, oy, 0.2 + r() * 0.25), ss = clamp(0.5 * k, 5, 14) * (0.8 + (sy - horizon) / Math.max(1, oy - horizon) * 0.4);
    if (Math.abs(sx - land) < 50 || Math.abs(sx - x0) < 40 || !underSky(c, sx - ss * 2, sx + ss * 2, sy - ss, ss)) continue;
    g.fillStyle = n ? '#9a9a96' : '#f2efe6'; g.beginPath(); g.ellipse(sx, sy - ss * 0.6, ss, ss * 0.6, 0, 0, TAU); g.fill();
    g.fillStyle = '#2b2628'; g.beginPath(); g.ellipse(sx + ss * 0.95, sy - ss * 0.7, ss * 0.32, ss * 0.25, 0.3, 0, TAU); g.fill();
    g.fillRect(sx - ss * 0.5, sy - ss * 0.15, 1.5, ss * 0.3); g.fillRect(sx + ss * 0.5, sy - ss * 0.15, 1.5, ss * 0.3);
  }
  // round bales of hay in a cluster, and a five-bar gate, clear of the flight
  const bR = clamp(0.75 * k, 10, 40), by = lerp(horizon, oy, 0.75);
  const bx = [land + 80 + bR, x0 - 90 - bR * 2, w - bR * 4, x0 + (land - x0) * 0.5].find((x) => spot([x], bR * 2.2, x0, land, w) != null && underSky(c, x - bR * 2.2, x + bR * 2.2, by - bR * 2, 30));
  if (bx != null) for (const [dx, dy, s2] of [[-bR * 1.1, 0, 1], [bR * 1.1, 0, 1], [0, -bR * 1.7, 0.95]]) {
    const R = bR * s2, cx = bx + dx, cy = by + dy;
    g.fillStyle = n ? '#6a5a3a' : '#d8b860'; g.beginPath(); g.arc(cx, cy - R, R, 0, TAU); g.fill();
    g.strokeStyle = withAlpha(n ? '#3a3020' : '#a88a3a', 0.8); g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.arc(cx, cy - R, R * i / 4, 0, TAU); g.stroke(); }
    if (!dy) softShadow(g, cx, by + 1, R, 3, 0.6);
  }
  if (bx != null) c.reserve?.({ x: bx - bR * 2.3, y: by - bR * 3.8, w: bR * 4.6, h: bR * 3.8 + 4 });
  // with no room near, bales stacked far off across the field, small with the distance
  else for (let i = 0; i < 5; i++) { const R = bR * 0.4, fx = w * 0.62 + i * R * 2.1, fy = lerp(horizon, oy, 0.12); g.fillStyle = n ? '#6a5a3a' : '#d8b860'; g.beginPath(); g.arc(fx, fy - R, R, 0, TAU); g.fill(); g.strokeStyle = withAlpha(n ? '#3a3020' : '#a88a3a', 0.8); g.lineWidth = 1; g.beginPath(); g.arc(fx, fy - R, R * 0.5, 0, TAU); g.stroke(); }
  const gw2 = clamp(3.6 * k, 40, 140), gh2 = clamp(1.2 * k, 14, 46), gy2 = lerp(horizon, oy, 0.45);
  const gxx = [w - gw2 / 2 - 16, land + 120 + gw2 / 2, x0 - 80 - gw2 / 2].find((x) => spot([x], gw2 / 2, x0, land, w) != null && (bx == null || Math.abs(x - bx) > gw2 / 2 + bR * 2.5) && underSky(c, x - gw2 / 2, x + gw2 / 2, gy2 - gh2, 30));
  if (gxx != null) {
    const l2 = gxx - gw2 / 2, wood = n ? '#8a8476' : '#c8c0a8';
    g.fillStyle = n ? '#3a3026' : '#5a4632'; for (const px of [l2 - 4, l2 + gw2]) g.fillRect(px, gy2 - gh2 - 4, 5, gh2 + 4);
    g.strokeStyle = wood; g.lineWidth = Math.max(2, gh2 * 0.08); g.beginPath();
    for (let i = 0; i < 5; i++) { const y = gy2 - gh2 + (gh2 * i) / 4.5; g.moveTo(l2, y); g.lineTo(l2 + gw2, y); }
    g.moveTo(l2, gy2); g.lineTo(l2 + gw2 * 0.5, gy2 - gh2); g.moveTo(l2 + gw2 * 0.85, gy2 - gh2); g.lineTo(l2 + gw2 * 0.85, gy2); g.stroke();
  }
  if (!(H0 > 0)) return;
  const H = oy - top;
  if (H0 > 8) {
    // a grain silo: galvanised and ribbed, its cone roof, the caged ladder, the top platform it leaves from
    const sw = clamp(5 * k, 40, 200), l = x0 - sw, cone = sw * 0.3;
    const sg = g.createLinearGradient(l, 0, x0, 0); sg.addColorStop(0, n ? '#5a5e66' : '#d8dce0'); sg.addColorStop(0.5, n ? '#7a7e86' : '#f0f2f4'); sg.addColorStop(1, n ? '#3a3e46' : '#9aa0a8');
    g.fillStyle = sg; g.fillRect(l, top, sw, H);
    g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 1; for (let y = top + 6; y < oy; y += 6) { g.beginPath(); g.moveTo(l, y); g.lineTo(x0, y); g.stroke(); }
    g.fillStyle = n ? '#4a4e56' : '#b8bcc2'; g.beginPath(); g.moveTo(l - 3, top); g.lineTo(l + sw * 0.5, top - cone); g.lineTo(x0 + 3, top); g.closePath(); g.fill();
    g.strokeStyle = n ? '#8a8e96' : '#5a6070'; g.lineWidth = 1.5;
    const lx2 = x0 - sw * 0.12; g.beginPath(); g.moveTo(lx2, oy); g.lineTo(lx2, top); g.moveTo(lx2 + 8, oy); g.lineTo(lx2 + 8, top); for (let y = oy - 6; y > top; y -= 7) { g.moveTo(lx2, y); g.lineTo(lx2 + 8, y); } g.stroke();
    g.fillStyle = n ? '#6a6e76' : '#7a828e'; g.fillRect(x0 - sw * 0.3, top - 3, sw * 0.3 + 4, 4);
    softShadow(g, l + sw / 2, oy + 2, sw * 0.6, 5, 0.6);
    return;
  }
  // the barn: dark timber, its gable end to us, the hayloft door open at the launch height
  // in the gable's wall, the eaves above the door, the hoist beam over it
  const hw = clamp(1.2 * k, 16, 60), hh = clamp(2.1 * k, 24, 110);
  const bw = clamp(Math.max(H * 1.4, 9 * k), 70, x0 + 6), l = x0 - bw, eave = top - hh - 8, ridge = eave - clamp(bw * 0.3, 20, 160);
  g.fillStyle = n ? '#4a3e34' : '#4a3a2c'; g.beginPath(); g.moveTo(l, oy); g.lineTo(l, eave); g.lineTo(l + bw * 0.5, ridge); g.lineTo(x0, eave); g.lineTo(x0, oy); g.closePath(); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; for (let x = l + 6; x < x0; x += 7) { g.beginPath(); g.moveTo(x, oy); g.lineTo(x, eave - (bw * 0.5 - Math.abs(x - l - bw * 0.5)) * ((eave - ridge) / (bw * 0.5))); g.stroke(); }
  g.strokeStyle = n ? '#7a7e86' : '#8a9098'; g.lineWidth = clamp(0.3 * k, 4, 10); g.lineCap = 'round'; g.beginPath(); g.moveTo(l - 6, eave + 4); g.lineTo(l + bw * 0.5, ridge - 2); g.lineTo(x0 + 6, eave + 4); g.stroke();
  // the big doors below, in metres
  const dw = Math.min(bw * 0.42, 4 * k), dh = Math.min(H * 0.55, 4 * k), dx = l + bw * 0.4;
  g.fillStyle = n ? '#3a2e24' : '#5e4a36'; g.fillRect(dx - dw / 2, oy - dh, dw, dh);
  g.strokeStyle = n ? '#7a6a5a' : '#c8b896'; g.lineWidth = 2; g.strokeRect(dx - dw / 2, oy - dh, dw, dh); g.beginPath(); g.moveTo(dx - dw / 2, oy - dh); g.lineTo(dx, oy); g.lineTo(dx + dw / 2, oy - dh); g.moveTo(dx, oy - dh); g.lineTo(dx, oy); g.stroke();
  // the hayloft door at the edge, hay on its sill
  g.fillStyle = '#14120f'; g.fillRect(x0 - hw - 2, top - hh, hw, hh);
  g.fillStyle = n ? '#6a5a3a' : '#c8a850'; for (let i = 0; i < 5; i++) g.fillRect(x0 - hw - 2 + r() * hw * 0.8, top - 4 - r() * 4, 4, 3);
  g.strokeStyle = n ? '#7a6a5a' : '#c8b896'; g.lineWidth = 2; g.strokeRect(x0 - hw - 2, top - hh, hw, hh);
  g.fillStyle = n ? '#3a2e24' : '#6a4e34'; g.fillRect(x0 - hw * 0.6, eave - 2, hw * 0.6 + clamp(1 * k, 12, 40), clamp(0.25 * k, 4, 10));
  g.strokeStyle = n ? '#8a8e96' : '#5a5a60'; g.lineWidth = 1.2; const hx = x0 + clamp(1 * k, 12, 40) - 6; g.beginPath(); g.moveTo(hx, eave); g.lineTo(hx, eave + hh * 0.5); g.stroke();
  g.beginPath(); g.arc(hx, eave + hh * 0.5 + 3, 3, 0, Math.PI); g.stroke();
  softShadow(g, x0 - bw / 2, oy + 2, bw * 0.6, 5, 0.6);
}

/** A cricket ground: the pavilion with its balcony and clock across the
    outfield, the sight screen, the trees round the boundary; the square mown
    in its strips and the pitch out from the batter's crease, the stumps
    behind the batter, and those at the bowler's end where the path clears
    them or lands short (rule 4); from a height, the pavilion's stand. */
function cricket(g, c) {
  const { w, h, k, X, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(241), horizon = oy - clamp((oy - 40) * 0.3, 40, 150);
  sky(g, w, horizon - 20, x0, { far: 'none', seed: 173, clouds: 3 });
  for (let x = -10 + r() * 20; x < w + 20; x += 18 + r() * 24) crown(g, x, horizon - 14 - r() * 6, 12 + r() * 12, n);
  // the pavilion across the ground: white, a pitched roof with a clock turret, its balcony and seats
  const pw = clamp(w * 0.22, 120, 300), ph = clamp((oy - horizon) * 0.45, 20, 60), land = (c.clearX || [])[0] ?? w;
  const pc = [land + 40 + pw / 2, x0 - 60 - pw / 2, w - pw / 2 - 10, x0 + (w - x0) * 0.5].map((x) => clamp(x, pw / 2 + 10, w - pw / 2 - 10)).find((x) => underSky(c, x - pw / 2, x + pw / 2, horizon - ph * 1.8, 50));
  const px = pc == null ? null : pc - pw / 2;
  if (px != null) {
  g.fillStyle = n ? '#8a8e96' : '#f4f2ee'; g.fillRect(px, horizon - ph, pw, ph);
  g.fillStyle = n ? '#3a3036' : '#5a4a44'; g.beginPath(); g.moveTo(px - 6, horizon - ph); g.lineTo(px + pw * 0.5, horizon - ph * 1.55); g.lineTo(px + pw + 6, horizon - ph); g.closePath(); g.fill();
  g.fillStyle = n ? '#8a8e96' : '#f4f2ee'; g.fillRect(px + pw * 0.46, horizon - ph * 1.75, pw * 0.08, ph * 0.3);
  g.fillStyle = '#1b1d22'; g.beginPath(); g.arc(px + pw * 0.5, horizon - ph * 1.6, ph * 0.08, 0, TAU); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px + pw * 0.5, horizon - ph * 1.6, ph * 0.06, 0, TAU); g.fill();
  g.fillStyle = n ? withAlpha(E.window, 0.7) : '#4a5a6a'; for (let i = 0; i < 7; i++) g.fillRect(px + pw * (0.06 + i * 0.13), horizon - ph * 0.85, pw * 0.07, ph * 0.3);
  g.fillStyle = n ? '#5a5e66' : '#2f5a3a'; g.fillRect(px, horizon - ph * 0.45, pw, ph * 0.08);
  crowd(g, px + 4, px + pw - 4, [{ y: horizon - ph * 0.05, s: clamp(ph * 0.14, 3, 7) }], r, n);
  c.reserve?.({ x: px - 6, y: horizon - ph * 1.8, w: pw + 12, h: ph * 1.8 });
  }
  // the outfield, mown in bands, and the boundary rope along its far edge
  mownTurf(g, w, horizon, h, n, { lo: '#5f9a48', hi: '#6aa851', line: false });
  g.strokeStyle = withAlpha('#ffffff', n ? 0.5 : 0.9); g.lineWidth = 2; g.beginPath(); g.moveTo(0, horizon + 4); g.lineTo(w, horizon + 4); g.stroke();
  // from a stand, the pitch is far out in the middle, not at its foot: only the outfield
  if (H0 > 0) { grandstand(g, x0, top, oy, k, r, n); return; }
  // the pitch: a pale strip out from the batter's crease along the flight's own line
  const yF = oy - clamp((oy - horizon) * 0.12, 4, 14), yN = oy + clamp((h - oy) * 0.2, 4, 18), p0 = X(-2.5), p1 = X(20.12);
  g.fillStyle = n ? '#6a6250' : '#cbb88a'; g.beginPath(); g.moveTo(p0 + 4, yF); g.lineTo(p1 + 4, yF); g.lineTo(p1 - 4, yN); g.lineTo(p0 - 4, yN); g.closePath(); g.fill();
  g.fillStyle = withAlpha('#000000', 0.06); for (let i = 0; i < 20; i++) g.fillRect(lerp(p0, p1, r()), lerp(yF, yN, r()), 6, 1);
  // the popping creases, 1.22 m in front of each set of stumps
  g.strokeStyle = withAlpha('#ffffff', 0.9); g.lineWidth = 1.5; for (const d of [0, 20.12 - 2.44]) { g.beginPath(); g.moveTo(X(d) + 3, yF); g.lineTo(X(d) - 3, yN); g.stroke(); }
  // the stumps: three in a row with the bails, 0.71 m tall, 20.12 m apart
  const stumps = (sx) => { const sh = Math.max(10, 0.71 * k); g.strokeStyle = n ? '#c8c0a8' : '#f2ead2'; g.lineWidth = Math.max(1.5, 0.04 * k); for (const d of [-1.5, 0, 1.5]) { g.beginPath(); g.moveTo(sx + d, oy + d * 0.6); g.lineTo(sx + d, oy - sh + d * 0.6); g.stroke(); } g.strokeStyle = n ? '#a89a7a' : '#d8c8a0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx - 3, oy - sh - 1); g.lineTo(sx + 3, oy - sh + 1); g.stroke(); c.reserve?.({ x: sx - 6, y: oy - sh - 4, w: 12, h: sh + 6 }); };
  stumps(X(-1.22));
  const at = c.over?.(20.12 - 1.22);
  if (X(20.12 - 1.22) < w - 6 && (land < X(20.12 - 1.22) - 6 || at == null || at > 0.85)) stumps(X(20.12 - 1.22));
}

/* ── a lake, an island, a skatepark ─────────────────────────────────────── */

/** A lake: wooded hills and their pines mirrored in still water, reeds at the
    margins, a rowing boat at its mooring and a pair of ducks clear of the
    flight; from the shore's shingle, or (from a height) the end of a timber
    jetty on its piles, or a rocky bluff above about 2 m. */
function lake(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(251), horizon = oy - clamp((oy - 40) * 0.25, 34, 130);
  sky(g, w, horizon, x0, { far: 'none', seed: 179, clouds: 3 });
  // the far shore: hills, pines along the water
  g.fillStyle = n ? '#25332a' : '#6a8a68'; g.beginPath(); g.moveTo(0, horizon);
  for (let x = 0; x <= w; x += 30) g.lineTo(x, horizon - 26 - Math.sin(x * 0.005 + 2) * 16 - Math.sin(x * 0.013) * 6);
  g.lineTo(w, horizon); g.closePath(); g.fill();
  for (let x = r() * 12; x < w; x += 9 + r() * 12) pine(g, x, horizon + 1, 14 + r() * 14, n ? '#1a2a1e' : '#2f4a34', n ? '#22362a' : '#3e5e42');
  // the water, with the far shore mirrored faintly in it
  water(g, 0, w, horizon, h, { phase });
  g.save(); g.globalAlpha = 0.18; g.translate(0, horizon * 2); g.scale(1, -1);
  g.fillStyle = n ? '#25332a' : '#4a6a4a'; g.beginPath(); g.moveTo(0, horizon); for (let x = 0; x <= w; x += 30) g.lineTo(x, horizon - 26 - Math.sin(x * 0.005 + 2) * 16); g.lineTo(w, horizon); g.closePath(); g.fill();
  g.restore();
  const land = (c.clearX || [])[0] ?? w;
  // reeds in clumps along the far margin
  g.strokeStyle = n ? '#3a4a2a' : '#6a7a3a'; g.lineWidth = 1.2;
  for (let x = r() * 30; x < w; x += 40 + r() * 80) for (let i = 0; i < 6; i++) { const rx = x + i * 3, ry = horizon + 4; g.beginPath(); g.moveTo(rx, ry); g.quadraticCurveTo(rx + 2, ry - 8, rx + (r() - 0.3) * 5, ry - 12 - r() * 6); g.stroke(); }
  // a rowing boat at its mooring, and a pair of ducks, clear of where it lands
  const bl = clamp(4 * k, 40, 120), byy = lerp(horizon, oy, 0.4);
  const bx = [land + 80 + bl / 2, w - bl / 2 - 20, (x0 + land) / 2, x0 + 40 + bl / 2].map((x) => Math.min(x, w - bl / 2 - 20)).find((x) => x - bl / 2 > x0 + 30 && Math.abs(x - land) > bl / 2 + 50 && underSky(c, x - bl / 2, x + bl / 2, byy - bl * 0.25, 30));
  if (bx != null) {
    g.fillStyle = n ? '#4a3a2c' : '#2f5fa8'; g.beginPath(); g.moveTo(bx - bl / 2, byy - bl * 0.12); g.lineTo(bx + bl / 2, byy - bl * 0.14); g.quadraticCurveTo(bx + bl * 0.42, byy, bx + bl * 0.3, byy + 1); g.lineTo(bx - bl * 0.35, byy + 1); g.quadraticCurveTo(bx - bl * 0.47, byy - bl * 0.02, bx - bl / 2, byy - bl * 0.12); g.closePath(); g.fill();
    g.fillStyle = n ? '#8a8e96' : '#f4f2ee'; g.fillRect(bx - bl / 2, byy - bl * 0.14, bl, Math.max(2, bl * 0.03));
    g.strokeStyle = n ? '#8a7a5a' : '#c8a870'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - bl * 0.1, byy - bl * 0.1); g.lineTo(bx + bl * 0.35, byy + bl * 0.05); g.stroke();
    g.strokeStyle = withAlpha('#ffffff', 0.4); g.lineWidth = 1; g.beginPath(); g.ellipse(bx, byy + 3, bl * 0.55, 3, 0, 0, TAU); g.stroke();
    c.reserve?.({ x: bx - bl / 2 - 4, y: byy - bl * 0.3, w: bl + 8, h: bl * 0.3 + 6 });
  }
  for (const [dx, dy] of [[0, 0], [22, 5]]) {
    const dxx = (bx ?? w * 0.7) - bl - 40 + dx, dyy = lerp(horizon, oy, 0.25) + dy;
    if (Math.abs(dxx - land) < 50 || dxx < x0 + 30 || !underSky(c, dxx - 10, dxx + 10, dyy - 12, 20)) continue;
    g.fillStyle = n ? '#5a5040' : '#8a6a4a'; g.beginPath(); g.ellipse(dxx, dyy - 3, 7, 3.5, 0, 0, TAU); g.fill();
    g.fillStyle = n ? '#2a4a3a' : '#2f6a4a'; g.beginPath(); g.arc(dxx + 6, dyy - 7, 2.6, 0, TAU); g.fill();
    g.fillStyle = '#e8c547'; g.fillRect(dxx + 8, dyy - 7, 2.5, 1.2);
  }
  if (!(H0 > 0)) {
    // the shore it is thrown from: shingle, its top level to the thrower's feet, sloping
    // gently down into the water over a few metres, foam along the waterline
    const edge = Math.min(x0 + 6, w * 0.35), slope = clamp(2.5 * k, 30, 60), bot = Math.min(h, oy + clamp((h - oy) * 0.5, 14, 50));
    g.fillStyle = n ? '#5a5650' : '#b8b0a2'; g.beginPath(); g.moveTo(-4, oy - 3); g.lineTo(edge, oy - 3); g.quadraticCurveTo(edge + slope * 0.5, oy, edge + slope, bot); g.lineTo(-4, bot); g.closePath(); g.fill();
    g.fillStyle = withAlpha('#000000', 0.15); for (let i = 0; i < 60; i++) { const sx = r() * edge, sy = oy + r() * (bot - oy); g.beginPath(); g.arc(sx, sy, 1 + r() * 1.8, 0, TAU); g.fill(); }
    g.strokeStyle = withAlpha('#ffffff', 0.75); g.lineWidth = 2; g.beginPath(); g.moveTo(edge + 2, oy - 1); g.quadraticCurveTo(edge + slope * 0.55, oy + 2, edge + slope + 2, bot); g.stroke();
    return;
  }
  const H = oy - top;
  if (H0 <= 2) {
    // the jetty: a deck of planks on piles out over the water, its end the edge
    const len = clamp(Math.max(x0 - 6, 6 * k), 80, x0 + 4), deck = clamp(0.25 * k, 4, 10), wood = n ? '#5a4a3a' : '#8a6a4a', woodLo = n ? '#3a2e24' : '#5e4630';
    for (let x = x0 - 6; x > x0 - len; x -= clamp(2 * k, 30, 90)) { g.fillStyle = woodLo; g.fillRect(x - 3, top + deck, 6, oy - top - deck + clamp((h - oy) * 0.3, 6, 30)); g.fillStyle = withAlpha('#ffffff', 0.25); g.fillRect(x - 3, oy - 1, 6, 2); }
    g.fillStyle = wood; g.fillRect(x0 - len, top, len, deck); g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; for (let x = x0 - 6; x > x0 - len; x -= 8) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + deck); g.stroke(); }
    g.fillStyle = withAlpha('#ffffff', 0.2); g.fillRect(x0 - len, top, len, 1);
    // a mooring post with its rope at the end
    g.fillStyle = woodLo; g.fillRect(x0 - clamp(0.8 * k, 8, 24), top - clamp(0.6 * k, 6, 18), 5, clamp(0.6 * k, 6, 18));
  } else {
    // a rocky bluff over the lake
    seaCliff(g, -4, x0, top, oy, { phase, foam: false });
  }
}

/** A palm tree, its trunk rising in a gentle curve from (bx, by) to its crown
    at (cx, cy): ringed segments, fronds drooping all round, coconuts under them. */
function palm(g, bx, by, cx, cy, s, n, nuts = true) {
  const mx = lerp(bx, cx, 0.5) - (cy - by) * 0.12, my = lerp(by, cy, 0.5);
  const tw = Math.max(4, s * 0.06);
  g.strokeStyle = n ? '#4a3e30' : '#8a6e4a'; g.lineWidth = tw; g.lineCap = 'round';
  g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my, cx, cy); g.stroke();
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1;
  for (let i = 1; i < 14; i++) { const u = i / 14, x = (1 - u) ** 2 * bx + 2 * (1 - u) * u * mx + u * u * cx, y = (1 - u) ** 2 * by + 2 * (1 - u) * u * my + u * u * cy; g.beginPath(); g.moveTo(x - tw / 2, y); g.lineTo(x + tw / 2, y - 1); g.stroke(); }
  // the fronds: arching out and drooping, a midrib and leaflets
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.42, L = s * (0.42 + (i % 2) * 0.08), ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L * 0.55 + L * 0.35;
    const qx = cx + Math.cos(a) * L * 0.55, qy = cy + Math.sin(a) * L * 0.6 - L * 0.1;
    g.strokeStyle = n ? '#1e3a24' : '#3e7a3a'; g.lineWidth = Math.max(2, s * 0.025); g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(qx, qy, ex, ey); g.stroke();
    g.strokeStyle = n ? '#24442a' : '#4f9a44'; g.lineWidth = Math.max(1, s * 0.012);
    for (let j = 1; j < 8; j++) { const u = j / 8, x = (1 - u) ** 2 * cx + 2 * (1 - u) * u * qx + u * u * ex, y = (1 - u) ** 2 * cy + 2 * (1 - u) * u * qy + u * u * ey, ll = s * 0.08 * (1 - u * 0.5); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a + 1.2) * ll, y + Math.sin(a + 1.2) * ll + ll * 0.5); g.moveTo(x, y); g.lineTo(x + Math.cos(a - 1.2) * ll, y + Math.sin(a - 1.2) * ll + ll * 0.5); g.stroke(); }
  }
  if (nuts) for (const [dx, dy] of [[-0.04, 0.05], [0.03, 0.06], [-0.005, 0.085]]) { g.fillStyle = n ? '#3a2e20' : '#5a4228'; g.beginPath(); g.arc(cx + dx * s, cy + dy * s, s * 0.035, 0, TAU); g.fill(); }
}

/** A tropical island: a deep blue lagoon and the reef's line of surf, white
    sand, palms and a thatched hut; from a height, the crown of a palm leaning
    out over the sand, from which a coconut falls. */
function island(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(257), horizon = oy - clamp((oy - 40) * 0.3, 40, 150);
  // a hot blue sky, the sea a deep cobalt blue (never the teal of displacement)
  sky(g, w, horizon, x0, { far: 'none', seed: 181, clouds: 2 });
  const sg = g.createLinearGradient(0, horizon, 0, lerp(horizon, oy, 0.6)); sg.addColorStop(0, n ? '#14284a' : '#2a6ab8'); sg.addColorStop(1, n ? '#1c3a5e' : '#4a92d8');
  g.fillStyle = sg; g.fillRect(0, horizon, w, lerp(horizon, oy, 0.6) - horizon);
  g.strokeStyle = withAlpha('#ffffff', 0.7); g.lineWidth = 1.5; const reef = lerp(horizon, oy, 0.15);
  g.beginPath(); for (let x = 0; x <= w; x += 12) g.lineTo(x, reef + Math.sin(x * 0.05 + phase * 2) * 1.2); g.stroke();
  // the sand: white, a wet band at the water's edge, shells
  const shore = lerp(horizon, oy, 0.6);
  const bg = g.createLinearGradient(0, shore, 0, h); bg.addColorStop(0, n ? '#8a8676' : '#f4ead2'); bg.addColorStop(1, n ? '#6a6658' : '#e8dab8');
  g.fillStyle = bg; g.fillRect(0, shore, w, h - shore);
  g.fillStyle = withAlpha(n ? '#5a5a54' : '#c8bc98', 0.6); g.fillRect(0, shore, w, 4);
  g.strokeStyle = withAlpha('#ffffff', 0.8); g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= w; x += 10) g.lineTo(x, shore + 1 + Math.sin(x * 0.04 + phase * 3) * 1.5); g.stroke();
  g.fillStyle = withAlpha('#000000', 0.08); for (let i = 0; i < (w * (h - shore)) / 80; i++) g.fillRect(r() * w, shore + 5 + r() * (h - shore), 1.5, 1);
  const land = (c.clearX || [])[0] ?? w;
  // palms and a hut along the back of the beach, clear of the flight
  const ps = clamp(5 * k, 50, 160);
  let drew = false;
  for (const px of [w - ps * 0.6, land + ps * 0.9, w * 0.55]) {
    if (px < x0 + ps * 0.6 || px > w - 10 || Math.abs(px - land) < ps * 0.5 || !underSky(c, px - ps * 0.5, px + ps * 0.5, shore - ps, 30)) continue;
    palm(g, px, shore + 6, px + ps * 0.15, shore + 6 - ps, ps, n);
    c.reserve?.({ x: px - ps * 0.45, y: shore - ps * 1.05, w: ps * 0.9, h: ps * 1.1 });
    drew = true; break;
  }
  // with no room ahead, a palm behind where it starts, smaller with the distance
  if (!drew && !(H0 > 0)) { const ps2 = ps * 0.7, px2 = Math.max(ps2 * 0.4, x0 - ps2 * 0.9); palm(g, px2, shore + 4, px2 - ps2 * 0.12, shore + 4 - ps2, ps2, n); }
  if (!(H0 > 0)) return;
  const H = oy - top;
  if (!c.held) {
    // the palm it falls from: its crown at the launch point, leaning out over the sand
    palm(g, x0 - H * 0.45, oy + 2, x0, top, clamp(H * 0.9, 60, 260), n, false);
    return;
  }
  // someone throws it: from the deck of a beach hut on its stilts, a thatched roof over it
  const hw = clamp(Math.max(H * 0.8, 5 * k), 60, x0 + 4), l = x0 - hw, roofH = clamp(2.2 * k, 20, 90), wood = n ? '#5a4a3a' : '#9a7a50', woodLo = n ? '#3a2e24' : '#6a5034';
  g.strokeStyle = woodLo; g.lineWidth = Math.max(3, 0.15 * k); for (const x of [l + 4, l + hw * 0.5, x0 - 4]) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, oy + 2); g.stroke(); }
  g.lineWidth = Math.max(1.5, 0.06 * k); g.beginPath(); g.moveTo(l + 4, top + H * 0.2); g.lineTo(l + hw * 0.5, oy - H * 0.1); g.lineTo(x0 - 4, top + H * 0.2); g.stroke();
  g.fillStyle = wood; g.fillRect(l - 4, top, hw + 4, clamp(0.25 * k, 4, 10));
  // the hut's walls set back on the deck, its door, the thatch over all
  const ww = hw * 0.6, wh = clamp(2 * k, 18, 80);
  g.fillStyle = n ? '#6a5a44' : '#c8a870'; g.fillRect(l, top - wh, ww, wh);
  g.strokeStyle = withAlpha('#000000', 0.2); g.lineWidth = 1; for (let x = l + 4; x < l + ww; x += 5) { g.beginPath(); g.moveTo(x, top - wh); g.lineTo(x, top); g.stroke(); }
  g.fillStyle = '#2a2018'; g.fillRect(l + ww * 0.55, top - wh * 0.8, ww * 0.25, wh * 0.8);
  g.fillStyle = n ? '#6a5a3a' : '#d8b860'; g.beginPath(); g.moveTo(l - 10, top - wh); g.lineTo(l + ww * 0.5, top - wh - roofH); g.lineTo(l + ww + 14, top - wh); g.closePath(); g.fill();
  g.strokeStyle = withAlpha(n ? '#3a3020' : '#a88a3a', 0.8); for (let i = 1; i < 5; i++) { const y = top - wh - roofH * (1 - i / 5); g.beginPath(); g.moveTo(lerp(l - 10, l + ww * 0.5, i / 5), y); g.lineTo(lerp(l + ww + 14, l + ww * 0.5, i / 5), y); g.stroke(); }
  // the rail along the deck's far side, open at the front where it is thrown from
  const rh = clamp(1 * k, 10, 40); g.strokeStyle = woodLo; g.lineWidth = 1.5; g.beginPath(); g.moveTo(l + ww, top - rh); g.lineTo(x0 - clamp(0.8 * k, 8, 30), top - rh); g.moveTo(x0 - clamp(0.8 * k, 8, 30), top); g.lineTo(x0 - clamp(0.8 * k, 8, 30), top - rh); g.stroke();
  softShadow(g, l + hw / 2, oy + 3, hw * 0.6, 4, 0.5);
}

/** A skatepark: smooth concrete, a funbox and its rail clear of the flight, a
    graffiti wall behind and the town beyond; from a height, a concrete ledge
    reached by its stair set (to about 4 m), or the skate shop's flat roof. */
function skatepark(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(263), horizon = oy - clamp((oy - 40) * 0.3, 40, 150);
  sky(g, w, horizon - clamp(2.5 * k, 20, 60), x0, { far: 'none', seed: 191, clouds: 3 });
  // the town beyond, then the graffiti wall along the back
  for (let x = 0; x < w; x += 30 + r() * 30) { const bh = 20 + r() * 50, bw = 24 + r() * 30; g.fillStyle = n ? '#2a2e38' : '#b8c0cc'; g.fillRect(x, horizon - clamp(2.5 * k, 20, 60) - bh, bw, bh + 2); }
  const wh = clamp(2.5 * k, 20, 60);
  g.fillStyle = n ? '#4a4e56' : '#a8acb2'; g.fillRect(0, horizon - wh, w, wh);
  // the graffiti: overlapping throw-ups — bubble letters, outlined, with drips — muted so labels read over them
  const tags = n ? ['#4a5a7a', '#6a6a4a', '#5a5a6a', '#4a6a5a'] : ['#4a72a8', '#d8b840', '#7a7aa0', '#5f9a6a', '#e8e8e4'];
  g.save(); g.globalAlpha = 0.6;
  for (let x = r() * 20; x < w; x += 26 + r() * 40) {
    const col = tags[Math.floor(r() * tags.length)], th2 = wh * (0.45 + r() * 0.35), ty = horizon - wh + (wh - th2) * (0.3 + r() * 0.5), nl = 2 + Math.floor(r() * 3);
    for (let i = 0; i < nl; i++) {
      const lx = x + i * th2 * 0.55, lw2 = th2 * (0.5 + r() * 0.2), tilt = (r() - 0.5) * 0.4;
      g.save(); g.translate(lx + lw2 / 2, ty + th2 / 2); g.rotate(tilt);
      g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, lw2 * 0.55, th2 * 0.5, 0, 0, TAU); g.fill();
      g.strokeStyle = '#1b1d22'; g.lineWidth = 2; g.stroke();
      g.fillStyle = withAlpha('#ffffff', 0.5); g.beginPath(); g.ellipse(-lw2 * 0.15, -th2 * 0.2, lw2 * 0.15, th2 * 0.1, -0.4, 0, TAU); g.fill();
      if (r() < 0.5) { g.fillStyle = col; g.fillRect(-1, th2 * 0.45, 2, th2 * 0.3 * r()); }
      g.restore();
    }
  }
  g.restore();
  // the concrete: pale, its expansion joints
  const cg = g.createLinearGradient(0, horizon, 0, h); cg.addColorStop(0, n ? '#5a5e66' : '#cfd1d4'); cg.addColorStop(1, n ? '#44484e' : '#b4b7bb');
  g.fillStyle = cg; g.fillRect(0, horizon, w, h - horizon);
  g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 1; for (let x = 0; x < w; x += clamp(3 * k, 40, 120)) { g.beginPath(); g.moveTo(x + (oy - horizon) * 0.3, horizon); g.lineTo(x - (h - oy) * 0.3, h); g.stroke(); }
  const land = (c.clearX || [])[0] ?? w;
  // a funbox with its grind rail, clear of the flight
  const fw = clamp(4 * k, 50, 160), fh = clamp(0.6 * k, 8, 24), fy = lerp(horizon, oy, 0.5);
  const fx = [land + 70 + fw / 2, w - fw / 2 - 16, x0 - 60 - fw / 2, (x0 + land) / 2].find((x) => x - fw / 2 > 8 && x + fw / 2 < w - 6 && (x + fw / 2 < x0 - 40 || x - fw / 2 > x0 + 20) && Math.abs(x - land) > fw / 2 + 40 && underSky(c, x - fw / 2, x + fw / 2, fy - fh, 30));
  if (fx != null) {
    g.fillStyle = n ? '#6a6e76' : '#e2e4e6'; g.beginPath(); g.moveTo(fx - fw / 2, fy); g.lineTo(fx - fw * 0.3, fy - fh); g.lineTo(fx + fw * 0.3, fy - fh); g.lineTo(fx + fw / 2, fy); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.25); g.stroke();
    g.strokeStyle = n ? '#8a9098' : '#5a6070'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(fx - fw * 0.3, fy - fh - 6); g.lineTo(fx + fw * 0.3, fy - fh - 6); g.stroke();
    for (const px of [fx - fw * 0.25, fx + fw * 0.25]) { g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, fy - fh - 6); g.lineTo(px, fy - fh); g.stroke(); }
    softShadow(g, fx, fy + 1, fw * 0.55, 3, 0.5);
    c.reserve?.({ x: fx - fw / 2 - 4, y: fy - fh - 10, w: fw + 8, h: fh + 14 });
  }
  if (!(H0 > 0)) return;
  const H = oy - top;
  if (H0 <= 4) {
    // a concrete ledge: its top at the launch height, a steel coping along its edge, the stair
    // set climbing to it from behind with a handrail, so it is reached on foot
    const lw2 = clamp(2.5 * k, 30, 100), l = x0 - lw2, sr = clamp(0.17 * k, 3, 8), st = Math.max(3, Math.round(H / sr));
    g.fillStyle = n ? '#5a5e66' : '#c4c7cb'; g.fillRect(l, top, lw2, H);
    g.fillStyle = withAlpha('#000000', 0.12); g.fillRect(l, top, 3, H);
    g.fillStyle = n ? '#9aa0a8' : '#6a7280'; g.fillRect(l, top - 2, lw2 + 1, 4);
    const sw = Math.min(l - 6, H * 1.6), tread = sw / st;
    g.fillStyle = n ? '#4a4e56' : '#b0b4b9'; g.beginPath(); g.moveTo(l, top);
    for (let i = 0; i < st; i++) { const y = top + (i * H) / st; g.lineTo(l - i * tread, y); g.lineTo(l - (i + 1) * tread, y); g.lineTo(l - (i + 1) * tread, y + H / st); }
    g.lineTo(l, oy); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.2); g.lineWidth = 1; g.stroke();
    const rh = clamp(0.9 * k, 10, 34); g.strokeStyle = n ? '#9aa0a8' : '#5a6070'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(l - sw, oy - rh); g.lineTo(l, top - rh); g.lineTo(l + lw2 * 0.3, top - rh); g.moveTo(l - sw * 0.5, oy - H * 0.5); g.lineTo(l - sw * 0.5, oy - H * 0.5 - rh); g.moveTo(l, top); g.lineTo(l, top - rh); g.stroke();
    softShadow(g, x0 - lw2 / 2, oy + 2, lw2 * 0.6, 4, 0.5);
  } else {
    // the skate shop: blockwork, its roller shutter and sign board, the flat roof it leaves from
    const sw = clamp(Math.max(H * 0.9, 8 * k), 80, x0 + 4), l = x0 - sw;
    g.fillStyle = n ? '#5a5e66' : '#b8bcc2'; g.fillRect(l, top, sw, H);
    g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 1; for (let y = top + 6; y < oy; y += 6) { g.beginPath(); g.moveTo(l, y); g.lineTo(x0, y); g.stroke(); }
    const dw = Math.min(sw * 0.5, 3.5 * k), dh = Math.min(H * 0.5, 3 * k);
    g.fillStyle = n ? '#3a3e46' : '#8a9098'; g.fillRect(x0 - dw - sw * 0.15, oy - dh, dw, dh);
    g.strokeStyle = withAlpha('#000000', 0.25); for (let y = oy - dh + 4; y < oy; y += 4) { g.beginPath(); g.moveTo(x0 - dw - sw * 0.15, y); g.lineTo(x0 - sw * 0.15, y); g.stroke(); }
    g.fillStyle = n ? '#2a3a5a' : '#2f5fa8'; g.fillRect(x0 - dw - sw * 0.2, oy - dh - clamp(0.9 * k, 10, 30), dw + sw * 0.1, clamp(0.7 * k, 8, 24));
    g.fillStyle = n ? '#8a8e96' : '#e8c547'; g.fillRect(x0 - dw - sw * 0.15, oy - dh - clamp(0.75 * k, 8, 25), dw * 0.8, clamp(0.4 * k, 4, 12));
    g.fillStyle = n ? '#3a3e46' : '#6a7280'; g.fillRect(l - 4, top - 4, sw + 4, 5);
    softShadow(g, x0 - sw / 2, oy + 2, sw * 0.6, 5, 0.6);
  }
}

/* ── a circus ───────────────────────────────────────────────────────────── */

/** A circus big top from inside: the canvas in blue and yellow panels rising
    to the king poles, spotlights, the audience on its tiers, the ring's curb
    and its sawdust; from a height, the trapeze platform on its rigging pole
    with the rope ladder up to it. */
function circus(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), r = rng(269), horizon = oy - clamp((oy - 40) * 0.28, 40, 140);
  // the canvas: panels in blue and cream rising to the peak, dark at the top
  const peak = { x: clamp(x0 + (w - x0) * 0.45, w * 0.35, w * 0.65), y: -h * 0.4 };
  for (let i = -6, j = 0; i <= 18; i++, j++) {
    const x = (i / 12) * w, x2 = ((i + 1) / 12) * w;
    g.fillStyle = j % 2 ? '#2a4a8a' : '#e8dcc0'; g.beginPath(); g.moveTo(peak.x, peak.y); g.lineTo(x, horizon); g.lineTo(x2, horizon); g.closePath(); g.fill();
  }
  const dark = g.createLinearGradient(0, 0, 0, horizon); dark.addColorStop(0, 'rgba(8,10,20,0.85)'); dark.addColorStop(0.6, 'rgba(8,10,20,0.45)'); dark.addColorStop(1, 'rgba(8,10,20,0.25)');
  g.fillStyle = dark; g.fillRect(0, 0, w, horizon);
  // the king poles and the spotlights' beams, crossing over the ring
  g.fillStyle = '#c8c0a8'; for (const px of [peak.x - w * 0.18, peak.x + w * 0.18]) if (px > 0 && px < w) g.fillRect(px - 3, 0, 6, horizon);
  for (const [sx, tx] of [[w * 0.08, peak.x + w * 0.1], [w * 0.92, peak.x - w * 0.12]]) {
    const gr = g.createLinearGradient(sx, 0, tx, oy); gr.addColorStop(0, 'rgba(255,248,220,0.35)'); gr.addColorStop(1, 'rgba(255,248,220,0.05)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(sx - 6, 0); g.lineTo(sx + 6, 0); g.lineTo(tx + w * 0.08, oy); g.lineTo(tx - w * 0.08, oy); g.closePath(); g.fill();
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(sx, 4, 6, 0, TAU); g.fill();
  }
  // the audience on its tiers round the far side
  const bh = clamp((horizon - 20) * 0.35, 24, 110), b0 = horizon - bh;
  g.fillStyle = '#1e2230'; g.fillRect(0, b0, w, bh);
  const rows = []; for (let y = b0 + 8; y < horizon - 4; y += clamp(bh / 7, 6, 14)) rows.push({ y, s: clamp(bh / 10, 4, 10) });
  crowd(g, 0, w, rows, r, false);
  g.fillStyle = withAlpha('#0e1118', 0.3); g.fillRect(0, b0, w, bh);
  // the ring: its painted curb across the back, the sawdust floor, the curb along the front
  const curb = clamp(0.5 * k, 6, 16);
  g.fillStyle = '#2f5fa8'; g.fillRect(0, horizon - curb, w, curb); g.fillStyle = '#e8c547'; for (let x = 0; x < w; x += 40) g.fillRect(x, horizon - curb * 0.65, 20, curb * 0.3);
  const sg = g.createLinearGradient(0, horizon, 0, h); sg.addColorStop(0, '#c8a870'); sg.addColorStop(1, '#a8885a');
  g.fillStyle = sg; g.fillRect(0, horizon, w, h - horizon);
  g.fillStyle = withAlpha('#6a5030', 0.4); for (let i = 0; i < (w * (h - horizon)) / 70; i++) g.fillRect(r() * w, horizon + r() * (h - horizon), 2, 1);
  const ny = oy + clamp((h - oy) * 0.55, 14, 60);
  if (ny < h) { g.fillStyle = '#2f5fa8'; g.fillRect(0, ny, w, Math.min(curb * 1.4, h - ny)); g.fillStyle = '#e8c547'; for (let x = 20; x < w; x += 40) g.fillRect(x, ny + curb * 0.4, 20, curb * 0.4); }
  // a person coming down from the trapeze or out of the cannon lands in the safety net: its mesh
  // stretched at the floor's level under where they come down, on its low frame and guy ropes
  const land = (c.clearX || [])[0] ?? w;
  if (c.who === 'diver' && (H0 > 0 || c.launcher === 'cannon')) {
    const nw = clamp(6 * k, 70, 260), na = land - nw * 0.55, nb = land + nw * 0.45, fh = clamp(0.4 * k, 5, 14);
    g.strokeStyle = '#8a9098'; g.lineWidth = 2; for (const x of [na, nb]) { g.beginPath(); g.moveTo(x, oy); g.lineTo(x, oy + fh); g.stroke(); g.beginPath(); g.moveTo(x, oy); g.lineTo(x + (x === na ? -fh * 2 : fh * 2), oy + fh); g.stroke(); }
    g.strokeStyle = withAlpha('#f4f2ee', 0.85); g.lineWidth = 1;
    for (let x = na; x <= nb; x += 6) { g.beginPath(); g.moveTo(x, oy); g.lineTo(x + 6, oy + 4); g.stroke(); g.beginPath(); g.moveTo(x + 6, oy); g.lineTo(x, oy + 4); g.stroke(); }
    g.strokeStyle = '#f4f2ee'; g.lineWidth = 2; g.beginPath(); g.moveTo(na, oy); g.lineTo(nb, oy); g.stroke();
  }
  if (!(H0 > 0) || c.launcher) return;
  // the trapeze platform on its rigging pole, the rope ladder hanging on the pole's far side, the bar beside it
  const H = oy - top, pw = clamp(1.4 * k, 18, 56), pole = x0 - pw - 4;
  g.fillStyle = '#c8ccd2'; g.fillRect(pole - 3, top - clamp(2.5 * k, 26, 90), 6, oy - top + clamp(2.5 * k, 26, 90));
  g.fillStyle = '#8a9098'; g.fillRect(pole - pw * 0.2, top, x0 - pole + pw * 0.2, clamp(0.25 * k, 4, 9));
  const rh = clamp(1.1 * k, 12, 40); g.strokeStyle = '#e8c547'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(pole, top - rh); g.lineTo(x0 - pw * 0.55, top - rh); g.moveTo(x0 - pw * 0.55, top); g.lineTo(x0 - pw * 0.55, top - rh); g.moveTo(pole + 3, top); g.lineTo(pole + 3, top - rh); g.stroke();
  g.strokeStyle = '#d8c8a0'; g.lineWidth = 1.5; const lx = pole - pw * 0.5 - 18;
  g.beginPath(); g.moveTo(lx, top); g.lineTo(lx, oy); g.moveTo(lx + 8, top); g.lineTo(lx + 8, oy); for (let y = top + 8; y < oy; y += 9) { g.moveTo(lx, y); g.lineTo(lx + 8, y); } g.stroke();
  g.beginPath(); g.moveTo(lx + 8, top); g.lineTo(pole - 3, top); g.stroke();
  // the trapeze hanging on its ropes behind the platform, waiting
  const ty = top - clamp(0.5 * k, 6, 18), tx = lx - clamp(2 * k, 22, 80);
  if (tx > 10) { g.strokeStyle = '#d8c8a0'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(tx - 10, 0); g.lineTo(tx - 10, ty); g.moveTo(tx + 10, 0); g.lineTo(tx + 10, ty); g.stroke(); g.strokeStyle = '#c8ccd2'; g.lineWidth = 3; g.beginPath(); g.moveTo(tx - 12, ty); g.lineTo(tx + 12, ty); g.stroke(); }
}

/* ── the polar sea ──────────────────────────────────────────────────────── */

/** An iceberg on the horizon: white above, its shaded faces blue-grey. */
function berg(g, x, y, s, n, r) {
  g.fillStyle = n ? '#aab4c4' : '#f4f8fc'; g.beginPath(); g.moveTo(x - s, y);
  g.lineTo(x - s * 0.7, y - s * (0.35 + r() * 0.2)); g.lineTo(x - s * 0.2, y - s * (0.5 + r() * 0.3)); g.lineTo(x + s * 0.3, y - s * (0.4 + r() * 0.2)); g.lineTo(x + s, y); g.closePath(); g.fill();
  g.fillStyle = n ? '#6a7a92' : '#b8cce0'; g.beginPath(); g.moveTo(x - s * 0.2, y - s * 0.5); g.lineTo(x + s * 0.3, y - s * 0.4); g.lineTo(x + s, y); g.lineTo(x + s * 0.1, y); g.closePath(); g.fill();
}

/** The polar sea: a pale sky, icebergs on the horizon, dark water with floes
    of ice; the edge it leaves from is the ice itself — level with the sea, or
    (from a height) the face of an ice shelf, its top snow and its face
    seamed with blue cracks. */
function polar(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(271), horizon = oy - clamp((oy - 40) * 0.22, 30, 120);
  sky(g, w, horizon, x0, { far: 'none', seed: 193, clouds: 2 });
  // icebergs along the horizon, clear of where it is thrown from
  for (let x = clamp(x0 + 80, 60, w * 0.4); x < w; x += 120 + r() * 160) berg(g, x, horizon + 1, 16 + r() * 30, n, r);
  // the sea: dark, cold, with floes drifting on it
  water(g, 0, w, horizon, h, { phase });
  g.fillStyle = withAlpha(n ? '#0a1424' : '#1e3448', 0.35); g.fillRect(0, horizon, w, h - horizon);
  const land = (c.clearX || [])[0] ?? w;
  for (let i = 0; i < 9; i++) {
    const fx = r() * w, fy = lerp(horizon, h, 0.08 + r() * 0.7), fw = (8 + r() * 26) * (0.5 + (fy - horizon) / Math.max(1, h - horizon));
    if (fx < x0 + 20 || Math.abs(fx - land) < fw + 20) continue;
    g.fillStyle = n ? '#c8d0dc' : '#f2f6fa'; g.beginPath(); g.ellipse(fx, fy, fw, fw * 0.18, 0, 0, TAU); g.fill();
    g.fillStyle = withAlpha(n ? '#5a6a82' : '#9ab4cc', 0.8); g.beginPath(); g.ellipse(fx, fy + fw * 0.08, fw, fw * 0.1, 0, 0, Math.PI); g.fill();
  }
  const snow = n ? '#d4dce6' : '#ffffff', iceFace = n ? '#5a6e88' : '#a8c4dc', iceDeep = n ? '#3a4a62' : '#6a92b8';
  if (!(H0 > 0)) {
    // the ice it leaves from: a floe level with the sea, its snow top a little above the water,
    // its edge lit, the rest under the water, seen through it
    const ew = Math.min(x0 + 6, w * 0.35), th = clamp(0.5 * k, 6, 22), sub = clamp(2 * k, 16, 70);
    g.fillStyle = withAlpha(iceFace, 0.55); g.beginPath(); g.moveTo(-4, oy); g.lineTo(ew + 4, oy); g.lineTo(ew - 8, Math.min(h, oy + sub)); g.lineTo(-4, Math.min(h, oy + sub)); g.closePath(); g.fill();
    g.fillStyle = snow; g.beginPath(); g.moveTo(-4, oy - th * 0.4); g.lineTo(ew - 4, oy - th * 0.4); g.quadraticCurveTo(ew + 4, oy - th * 0.3, ew + 4, oy + 1); g.lineTo(-4, oy + 1); g.closePath(); g.fill();
    g.fillStyle = iceFace; g.fillRect(-4, oy + 1, ew + 8, th * 0.4);
    g.strokeStyle = withAlpha('#ffffff', 0.8); g.lineWidth = 2; g.beginPath(); g.moveTo(ew + 4, oy + 1); g.lineTo(ew + 24, oy + 1); g.stroke();
    return;
  }
  // the ice shelf: its snow top, a sheer face seamed with blue cracks, darker under the water
  const H = oy - top, ew = Math.max(x0 + 4, clamp(H * 1.5, 80, w * 0.5));
  g.fillStyle = iceFace; g.beginPath(); g.moveTo(-4, top); g.lineTo(x0, top); g.lineTo(x0 + 3, lerp(top, oy, 0.4)); g.lineTo(x0 - 2, oy); g.lineTo(x0, h); g.lineTo(-4, h); g.closePath(); g.fill();
  const fg = g.createLinearGradient(x0 - 40, 0, x0, 0); fg.addColorStop(0, withAlpha(iceFace, 0)); fg.addColorStop(1, withAlpha('#ffffff', n ? 0.1 : 0.35)); g.fillStyle = fg; g.fillRect(x0 - 40, top, 43, oy - top);
  g.strokeStyle = iceDeep; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const cx = x0 - 6 - r() * Math.min(ew, 140), cy = top + 6 + r() * H * 0.3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (r() - 0.5) * 8, cy + H * (0.2 + r() * 0.4)); g.lineTo(cx + (r() - 0.5) * 14, cy + H * (0.4 + r() * 0.4)); g.stroke(); }
  g.fillStyle = withAlpha(iceDeep, 0.6); g.fillRect(-4, oy, x0 + 4, h - oy);
  // the snow along its top, overhanging a little at the edge
  g.fillStyle = snow; g.beginPath(); g.moveTo(-4, top - clamp(0.4 * k, 4, 12)); g.lineTo(x0 - 6, top - clamp(0.4 * k, 4, 12)); g.quadraticCurveTo(x0 + 3, top - clamp(0.3 * k, 3, 10), x0 + 2, top + 3); g.lineTo(-4, top + 3); g.closePath(); g.fill();
  g.strokeStyle = withAlpha('#ffffff', 0.8); g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - 2, oy + 1); g.lineTo(x0 + 18, oy + 1); g.stroke();
}

/* ── an oil rig, a tree house ───────────────────────────────────────────── */

/** An oil rig standing in the open sea: its grey steel legs braced in X down
    into the water and on out of sight, the deck it leaves from (from its
    edge), a deck module, the derrick tower, the helideck's H on the module;
    a supply ship off it, clear of the flight; lights at night. */
function oilrig(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(277), horizon = oy - clamp((oy - 40) * 0.2, 30, 110);
  sky(g, w, horizon, x0, { far: 'none', seed: 197, clouds: 3 });
  water(g, 0, w, horizon, h, { phase });
  const land = (c.clearX || [])[0] ?? w;
  // a supply ship on the horizon side, clear of where it lands
  const sl = clamp(12 * k, 60, 180), sx = [land + 90 + sl / 2, w - sl / 2 - 20].find((x) => x + sl / 2 < w - 4 && Math.abs(x - land) > sl / 2 + 50 && underSky(c, x - sl / 2, x + sl / 2, lerp(horizon, oy, 0.3) - sl * 0.3, 30));
  if (sx != null) {
    const sy = lerp(horizon, oy, 0.3);
    g.fillStyle = n ? '#3a3e48' : '#2f5fa8'; g.beginPath(); g.moveTo(sx - sl / 2, sy - sl * 0.08); g.lineTo(sx + sl / 2, sy - sl * 0.1); g.lineTo(sx + sl * 0.42, sy); g.lineTo(sx - sl * 0.46, sy); g.closePath(); g.fill();
    g.fillStyle = n ? '#8a8e96' : '#f4f2ee'; g.fillRect(sx + sl * 0.1, sy - sl * 0.24, sl * 0.28, sl * 0.15);
    g.fillStyle = n ? withAlpha(E.window, 0.7) : '#3a4656'; g.fillRect(sx + sl * 0.13, sy - sl * 0.22, sl * 0.22, sl * 0.04);
    c.reserve?.({ x: sx - sl / 2 - 4, y: sy - sl * 0.28, w: sl + 8, h: sl * 0.3 });
  }
  if (!(H0 > 0)) return;
  // the rig: legs from below the water up to the deck, braced; the deck; the derrick; the crane
  const H = oy - top, dw = Math.min(clamp(Math.max(H * 1.3, 30 * k), 120, x0 + 4), Math.max(120, w * 0.45)), l = x0 - dw, steel = n ? '#7a7e86' : '#9aa0a8', steelLo = n ? '#5a5e66' : '#6a7280';
  const legs = [l + dw * 0.12, l + dw * 0.5, x0 - dw * 0.1], deep = h;
  g.strokeStyle = steel; g.lineWidth = clamp(0.5 * k, 4, 12);
  for (const lx of legs) { g.beginPath(); g.moveTo(lx, top + 6); g.lineTo(lx, deep); g.stroke(); }
  g.strokeStyle = steelLo; g.lineWidth = clamp(0.12 * k, 1.5, 4);
  for (let i = 0; i < legs.length - 1; i++) for (let y = top + 8; y < h; y += Math.max(20, H / 3)) { const y2 = Math.min(oy, y + Math.max(20, H / 3)); g.beginPath(); g.moveTo(legs[i], y); g.lineTo(legs[i + 1], y2); g.moveTo(legs[i + 1], y); g.lineTo(legs[i], y2); g.stroke(); }
  // under the water, the legs dimmed
  { const ug = g.createLinearGradient(0, oy, 0, h); ug.addColorStop(0, withAlpha(n ? '#0a1424' : '#2a4a62', 0.35)); ug.addColorStop(1, withAlpha(n ? '#0a1424' : '#2a4a62', 0.8)); g.fillStyle = ug; g.fillRect(l - 8, oy, dw + 16, h - oy); }
  g.strokeStyle = withAlpha('#ffffff', 0.5); g.lineWidth = 1.5; for (const lx of legs) { g.beginPath(); g.moveTo(lx - 8, oy + 1); g.lineTo(lx + 8, oy + 1); g.stroke(); }
  // the deck: two levels, its railings, open at the edge it leaves from
  const dh = clamp(2.5 * k, 10, 36);
  g.fillStyle = n ? '#5a5e66' : '#9aa0a8'; g.fillRect(l - 6, top, dw + 6, dh * 0.35);
  g.fillStyle = n ? '#4a4e56' : '#7a828e'; g.fillRect(l, top + dh * 0.35, dw, dh * 0.65);
  g.fillStyle = n ? '#8a8e96' : '#e8eaee'; for (let i = 0; i < 6; i++) g.fillRect(l + dw * (0.05 + i * 0.15), top + dh * 0.5, dw * 0.08, dh * 0.3);
  // modules on the deck: blocks, the derrick tower, the crane, the helideck, the flare boom
  const bh = clamp(3 * k, 14, 70);
  g.fillStyle = n ? '#6a6e76' : '#e8eaee'; g.fillRect(l + dw * 0.05, top - bh, dw * 0.3, bh);
  g.fillStyle = n ? '#3a3e48' : '#2f5fa8'; g.fillRect(l + dw * 0.05, top - bh, dw * 0.3, bh * 0.15);
  const dx = l + dw * 0.5, dTop = top - clamp(10 * k, 50, 220);
  g.strokeStyle = n ? '#8a8e96' : '#c8a840'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(dx - dw * 0.08, top); g.lineTo(dx, dTop); g.lineTo(dx + dw * 0.08, top);
  for (let i = 1; i < 6; i++) { const y = lerp(top, dTop, i / 6), hw = dw * 0.08 * (1 - i / 6); g.moveTo(dx - hw, y); g.lineTo(dx + hw, y); } g.stroke();
  const hp = { x: l + dw * 0.2, y: top - bh - 4 }, hr = clamp(2.5 * k, 12, 40);
  g.fillStyle = n ? '#3a4a3a' : '#4f7a4a'; g.beginPath(); g.ellipse(hp.x, hp.y, hr, hr * 0.25, 0, 0, TAU); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hp.x - hr * 0.25, hp.y - hr * 0.1); g.lineTo(hp.x - hr * 0.25, hp.y + hr * 0.1); g.moveTo(hp.x + hr * 0.25, hp.y - hr * 0.1); g.lineTo(hp.x + hr * 0.25, hp.y + hr * 0.1); g.moveTo(hp.x - hr * 0.25, hp.y); g.lineTo(hp.x + hr * 0.25, hp.y); g.stroke();
  // the railing along the deck, open at the front where it leaves from
  // the railing from past the derrick to near the edge: posts every metre and a top rail
  const rh = clamp(1 * k, 6, 20), ra = dx + dw * 0.1, rb = x0 - clamp(1.2 * k, 8, 30);
  if (rb > ra + 6) { g.strokeStyle = n ? '#c8ccd2' : '#5a6070'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ra, top - rh); g.lineTo(rb, top - rh); for (let x = ra; x <= rb; x += Math.max(6, k)) { g.moveTo(x, top); g.lineTo(x, top - rh); } g.stroke(); }
  // at night its lights: along the deck, on the derrick's top
  if (n) { for (let x = l + 6; x < x0; x += Math.max(14, dw / 10)) { g.fillStyle = withAlpha(E.window, 0.9); g.beginPath(); g.arc(x, top + dh * 0.4, 1.8, 0, TAU); g.fill(); } g.fillStyle = '#ff6a6a'; g.beginPath(); g.arc(dx, dTop, 2.5, 0, TAU); g.fill(); }
  void r;
}

/** A tree house: a great oak, its crown high over the platform and the hut
    on it, the rope ladder hanging to the grass by the trunk; it leaves from
    the platform's edge. Lawn, and a garden fence beyond. */
function treehouse(g, c) {
  const { w, h, k, oy, x0, top, H0 } = c;
  const E = env(), n = E.night, r = rng(281), horizon = oy - clamp((oy - 40) * 0.3, 40, 150);
  sky(g, w, horizon, x0, { far: 'none', seed: 199, clouds: 3 });
  for (let x = r() * 30; x < w; x += 30 + r() * 40) crown(g, x, horizon - 10 - r() * 8, 14 + r() * 14, n);
  mownTurf(g, w, horizon, h, n, { lo: '#6fa652', hi: '#7cb35c', line: false });
  // a garden fence along the end of the lawn
  { const fh = clamp(1.2 * k, 10, 36), fy = lerp(horizon, oy, 0.15); g.fillStyle = n ? '#4a3a2c' : '#8a6a4a'; g.fillRect(0, fy - fh, w, fh); g.strokeStyle = withAlpha('#000000', 0.2); g.lineWidth = 1; for (let x = 0; x < w; x += 9) { g.beginPath(); g.moveTo(x, fy - fh); g.lineTo(x, fy); g.stroke(); } }
  if (!(H0 > 0)) return;
  // the oak: a thick trunk behind the platform, its boughs, and the crown above
  const H = oy - top, tw = clamp(1 * k, 12, 50), pw = clamp(Math.max(3 * k, H * 0.6), 50, x0 - 10), tx = x0 - pw * 0.7;
  const bark = n ? '#3a2e24' : '#6a4a32', barkLo = n ? '#2a2018' : '#4e3624';
  g.fillStyle = bark; g.beginPath(); g.moveTo(tx - tw * 0.8, oy); g.quadraticCurveTo(tx - tw * 0.5, lerp(oy, top, 0.5), tx - tw * 0.45, top - H * 0.5); g.lineTo(tx + tw * 0.45, top - H * 0.5); g.quadraticCurveTo(tx + tw * 0.5, lerp(oy, top, 0.5), tx + tw * 0.8, oy); g.closePath(); g.fill();
  g.strokeStyle = barkLo; g.lineWidth = 1; for (let i = 0; i < 6; i++) { const bx = tx - tw * 0.4 + i * tw * 0.16; g.beginPath(); g.moveTo(bx, oy - 2); g.lineTo(bx + (r() - 0.5) * 4, top - H * 0.3); g.stroke(); }
  g.strokeStyle = bark; g.lineWidth = Math.max(3, tw * 0.35); g.lineCap = 'round'; for (const [ex, ey] of [[-1.2, -0.35], [0.9, -0.45], [-0.4, -0.6]]) { g.beginPath(); g.moveTo(tx, top - H * 0.3); g.quadraticCurveTo(tx + ex * pw * 0.3, top - H * 0.45, tx + ex * pw * 0.55, top + ey * H); g.stroke(); }
  const cr = clamp(Math.max(H * 0.5, pw * 0.6), 40, 200);
  // (lifted well above the platform, a lighter, yellower green than the hedge)
  for (const [dx, dy, s] of [[-0.6, -1.1, 0.7], [0.2, -1.35, 0.8], [0.8, -0.95, 0.6], [-0.1, -0.85, 0.65]]) { const cx = tx + dx * cr, cy = top - cr * 0.15 + dy * cr * 0.8; g.fillStyle = n ? '#2e4a24' : '#6a9a3a'; g.beginPath(); g.arc(cx, cy, cr * s * 0.6, 0, TAU); g.fill(); g.fillStyle = n ? '#3a5a2c' : '#86b04a'; g.beginPath(); g.arc(cx - cr * 0.12, cy - cr * 0.12, cr * s * 0.36, 0, TAU); g.fill(); }
  // the platform: planks on joists, a brace to the trunk, the hut on it
  const pl = x0 - pw, ph = clamp(0.25 * k, 4, 10), wood = n ? '#5a4a3a' : '#a07a50', woodLo = n ? '#3a2e24' : '#6a5034';
  g.fillStyle = wood; g.fillRect(pl, top, pw, ph); g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; for (let x = pl + 6; x < x0; x += 7) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + ph); g.stroke(); }
  g.strokeStyle = woodLo; g.lineWidth = Math.max(2, 0.12 * k); g.beginPath(); g.moveTo(tx, top + H * 0.35); g.lineTo(x0 - pw * 0.1, top + ph); g.moveTo(tx, top + H * 0.35); g.lineTo(pl + 4, top + ph); g.stroke();
  const hw = Math.min(pw * 0.6, Math.max(pw * 0.5, 1.6 * k)), hh = clamp(1.9 * k, 18, 220);
  g.fillStyle = n ? '#6a5a44' : '#c8a870'; g.fillRect(pl + 2, top - hh, hw, hh);
  g.strokeStyle = withAlpha('#000000', 0.2); for (let y = top - hh + 5; y < top; y += 5) { g.beginPath(); g.moveTo(pl + 2, y); g.lineTo(pl + 2 + hw, y); g.stroke(); }
  g.fillStyle = '#2a2018'; g.fillRect(pl + hw * 0.55, top - Math.min(hh * 0.85, 1.5 * k), hw * 0.3, Math.min(hh * 0.85, 1.5 * k));
  g.fillStyle = n ? '#4a3a2c' : '#7a5a3a'; g.beginPath(); g.moveTo(pl - 6, top - hh); g.lineTo(pl + hw * 0.5, top - hh - hh * 0.6); g.lineTo(pl + hw + 8, top - hh); g.closePath(); g.fill();
  // the rope ladder from the platform's edge down to the lawn, a little short of the throw's edge
  const lx = pl + pw * 0.15; g.strokeStyle = n ? '#8a7a5a' : '#c8a870'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(lx, top + ph); g.lineTo(lx, oy - 2); g.moveTo(lx + 9, top + ph); g.lineTo(lx + 9, oy - 2); for (let y = top + ph + 8; y < oy - 2; y += 9) { g.moveTo(lx, y); g.lineTo(lx + 9, y); } g.stroke();
  // the railing behind where it leaves from
  g.strokeStyle = woodLo; g.lineWidth = 2; const rh = clamp(0.9 * k, 8, 34); g.beginPath(); g.moveTo(pl + hw + 4, top - rh); g.lineTo(x0 - pw * 0.3, top - rh); g.moveTo(pl + hw + 4, top); g.lineTo(pl + hw + 4, top - rh); g.moveTo(x0 - pw * 0.3, top); g.lineTo(x0 - pw * 0.3, top - rh); g.stroke();
  softShadow(g, tx, oy + 2, pw * 0.6, 5, 0.6);
}

/* ── a fairground ───────────────────────────────────────────────────────── */

/** A fairground: striped stalls and a helter-skelter along the back, bunting,
    the trodden grass; from a height, a Ferris wheel whose top gondola is where
    it leaves from — its rim, spokes and the A-frame legs to the ground, the
    gondolas hanging level round it, lit at night. */
function fairground(g, c) {
  const { w, h, k, oy, x0, top, H0, phase = 0 } = c;
  const E = env(), n = E.night, r = rng(283), horizon = oy - clamp((oy - 40) * 0.3, 40, 150);
  sky(g, w, horizon, x0, { far: 'none', seed: 211, clouds: 3 });
  for (let x = r() * 30; x < w; x += 30 + r() * 40) crown(g, x, horizon - 10 - r() * 8, 14 + r() * 12, n);
  grass(g, 0, w, horizon, h);
  g.fillStyle = withAlpha(n ? '#3a3020' : '#b8a878', 0.35); g.fillRect(0, lerp(horizon, oy, 0.5), w, h - lerp(horizon, oy, 0.5));
  const land = (c.clearX || [])[0] ?? w;
  // the stalls: striped awnings in blue and white, yellow and white, along the back
  const sw = clamp(2.5 * k, 30, 90), sh = sw * 0.7, sy = lerp(horizon, oy, 0.12);
  const stripes = n ? [['#3a4a7a', '#8a8e96'], ['#7a6a3a', '#8a8e96']] : [['#2f5fa8', '#f4f4f4'], ['#e8c547', '#f4f4f4'], ['#e86a9a', '#f4f4f4']];
  for (let x = 10 + r() * 20, i = 0; x < w - sw; x += sw + 10 + r() * 30, i++) {
    if (!underSky(c, x, x + sw, sy - sh - 6, 30)) continue;
    g.fillStyle = n ? '#4a4038' : '#c8b896'; g.fillRect(x + 3, sy - sh * 0.6, sw - 6, sh * 0.6);
    g.fillStyle = n ? withAlpha(E.window, 0.7) : '#3a3036'; g.fillRect(x + 6, sy - sh * 0.5, sw - 12, sh * 0.3);
    const [a, b] = stripes[i % stripes.length]; const nst = 6;
    for (let j = 0; j < nst; j++) { g.fillStyle = j % 2 ? b : a; g.beginPath(); g.moveTo(x + (sw * j) / nst, sy - sh * 0.6); g.lineTo(x + (sw * (j + 1)) / nst, sy - sh * 0.6); g.lineTo(x + (sw * (j + 1)) / nst, sy - sh); g.lineTo(x + (sw * j) / nst, sy - sh); g.closePath(); g.fill(); }
    g.fillStyle = a; for (let j = 0; j < nst; j++) { g.beginPath(); g.arc(x + (sw * (j + 0.5)) / nst, sy - sh * 0.6, sw / nst / 2, 0, Math.PI); g.fill(); }
  }
  // bunting across the back
  g.strokeStyle = n ? '#6a6e76' : '#8a9098'; g.lineWidth = 1; const by = sy - sh - 14; g.beginPath(); g.moveTo(0, by); for (let x = 0; x <= w; x += 60) g.quadraticCurveTo(x + 30, by + 8, x + 60, by); g.stroke();
  const flags = n ? ['#5a6a8a', '#8a8a5a', '#8a8e96'] : ['#2f5fa8', '#e8c547', '#e86a9a', '#f4f4f4'];
  for (let x = 6, i = 0; x < w; x += 12, i++) { const yy = by + Math.sin(((x % 60) / 60) * Math.PI) * 6; g.fillStyle = flags[i % flags.length]; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 8, yy); g.lineTo(x + 4, yy + 8); g.closePath(); g.fill(); }
  if (!(H0 > 0)) {
    // a Ferris wheel far off on the horizon, faint
    const fr = clamp((oy - horizon) * 0.5, 20, 90), fx = clamp(x0 + (w - x0) * 0.75, w * 0.5, w - fr - 10), fy = horizon - fr - 4;
    if (underSky(c, fx - fr, fx + fr, fy - fr, 20)) {
      g.save(); g.globalAlpha = 0.4; g.strokeStyle = n ? '#c8ccd2' : '#5a6070'; g.lineWidth = 2; g.beginPath(); g.arc(fx, fy, fr, 0, TAU); g.stroke();
      g.lineWidth = 1; for (let i = 0; i < 10; i++) { const a2 = (i / 10) * TAU; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a2) * fr, fy + Math.sin(a2) * fr); g.stroke(); }
      g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx - fr * 0.5, horizon); g.moveTo(fx, fy); g.lineTo(fx + fr * 0.5, horizon); g.stroke(); g.restore();
    }
    return;
  }
  // the Ferris wheel, behind the plane of the flight (drawn faint): the launch is a cabin hanging
  // from the rim near its top, its floor at the launch height; the hub is set back to the left
  const H = oy - top, gw = clamp(2.6 * k, 18, 80), hang = clamp(2.7 * k, 20, 110);
  const piv = { x: x0 - gw * 0.5, y: top - hang };
  const room = oy - piv.y - 0.03 * H, R = Math.max(gw * 1.5, Math.min(Math.max(H * 0.5, 5 * k), room / 1.94));
  const cx = piv.x - R * 0.35, cy = piv.y + R * Math.sqrt(1 - 0.35 * 0.35);
  const rimC = n ? '#c8ccd2' : '#5a6070', frame = n ? '#9aa0a8' : '#4a5060';
  g.save(); g.globalAlpha = 0.6;
  g.strokeStyle = frame; g.lineWidth = clamp(0.25 * k, 3, 8); g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - R * 0.55, oy); g.moveTo(cx, cy); g.lineTo(cx + R * 0.55, oy); g.moveTo(cx - R * 0.3, lerp(cy, oy, 0.55)); g.lineTo(cx + R * 0.3, lerp(cy, oy, 0.55)); g.stroke();
  g.strokeStyle = rimC; g.lineWidth = clamp(0.15 * k, 3, 6); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R * 0.9, 0, TAU); g.stroke();
  g.lineWidth = 1; const nsp = 12; for (let i = 0; i < nsp; i++) { const a2 = (i / nsp) * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R); g.stroke(); }
  g.fillStyle = frame; g.beginPath(); g.arc(cx, cy, Math.max(4, R * 0.05), 0, TAU); g.fill();
  g.restore();
  // the other cabins hanging level round the rim, any the path crosses left out
  const cols = n ? ['#5a6a8a', '#8a8a5a', '#8a8e96'] : ['#2f5fa8', '#e8c547', '#f2ede0'], ga = Math.atan2(piv.y - cy, piv.x - cx);
  const pathY = (px) => { const y = c.over?.((px - c.X(0)) / k); return y == null ? null : c.Y(y); };
  for (let i = 1; i < 10; i++) {
    const a2 = ga + (i / 10) * TAU, px = cx + Math.cos(a2) * R, py = cy + Math.sin(a2) * R, bw = gw * 0.8, bh = bw * 0.8;
    const yA = pathY(px - bw / 2), yB = pathY(px + bw / 2), lo = py + bh * 0.2 - 8, hi = py + bh * 1.2 + 8;
    if ([yA, yB].some((yy) => yy != null && yy > lo && yy < hi) || (px + bw / 2 > x0 - 4 && py > top)) continue;
    g.strokeStyle = frame; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + bh * 0.2); g.stroke();
    g.fillStyle = cols[i % cols.length]; g.beginPath(); g.roundRect(px - bw / 2, py + bh * 0.2, bw, bh, 3); g.fill(); g.strokeStyle = withAlpha('#000000', 0.35); g.stroke();
    g.fillStyle = withAlpha(n ? E.window : '#bcd6e6', 0.8); g.fillRect(px - bw * 0.35, py + bh * 0.35, bw * 0.7, bh * 0.3);
  }
  // bulbs round the rim at night, glowing
  if (n) for (let i = 0; i < 24; i++) { const a2 = (i / 24) * TAU, bx = cx + Math.cos(a2) * R, by = cy + Math.sin(a2) * R; const gl = g.createRadialGradient(bx, by, 0, bx, by, 8); gl.addColorStop(0, withAlpha(E.window, 0.9)); gl.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = gl; g.fillRect(bx - 8, by - 8, 16, 16); g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(bx, by, 1.8, 0, TAU); g.fill(); }
  // the launch cabin: its hanger from the pivot to the roof, the roof, a back wall, waist-high sides, open at the front
  const roofY = top - hang * 0.85, wallH = clamp(1.1 * k, 8, 44), cab = cols[0], cl = x0 - gw;
  g.strokeStyle = frame; g.lineWidth = 2; g.beginPath(); g.moveTo(piv.x, piv.y); g.lineTo(piv.x, roofY); g.stroke();
  g.fillStyle = cab; g.beginPath(); g.moveTo(cl - 4, roofY + 4); g.quadraticCurveTo(piv.x, roofY - 6, x0 + 4, roofY + 4); g.closePath(); g.fill();
  g.fillStyle = withAlpha(cab, 0.85); g.fillRect(cl, roofY + 3, 4, top - roofY - 3);
  g.fillStyle = cab; g.fillRect(cl, top - wallH, gw * 0.35, wallH); g.fillRect(cl, top, gw, clamp(0.25 * k, 3, 9));
  g.strokeStyle = withAlpha('#000000', 0.35); g.lineWidth = 1; g.strokeRect(cl, top - wallH, gw * 0.35, wallH);
  g.strokeStyle = cab; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - 2, roofY + 4); g.lineTo(x0 - 2, roofY + (top - roofY) * 0.25); g.stroke();
  softShadow(g, cx, oy + 2, R * 0.6, 4, 0.5);
  void phase;
}

/** The places this file draws, by the registry's names. */
export const PLACE_ART = { mountain, forest, harbour, city, moon, mars, snow, desert, pier, site, canyon, waterfall, lighthouse, pitch, golf, stadium, ship, dam, playground, beach, room, planet, carpark, volcano, quarry, court, arena, castle, runway, garden, farm, cricket, lake, island, skatepark, circus, polar, oilrig, treehouse, fairground };
