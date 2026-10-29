// jump.js — the stage for a parachute jump in stages: free fall, the canopy
// opening and braking, then a steady fall to the field.
//
// A column of sky at ONE scale from the aircraft to the ground, so a 550 m
// drop looks like one: the aircraft it leaves at the top (a high-wing jump
// plane, its door open), farmland seen from height at the bottom (fields of
// different crops behind hedgerows, a road, farms and trees, all of it
// fading into the haze towards the horizon), a height ruler down the side,
// and the jumper — a skydiver in the box position in free fall, hanging in
// the harness under a ram-air canopy from the moment it opens. Where each
// stage begins is a marker line: its height on the ruler, its time beside
// the column. The velocity is a vertical arrow, solid (rule 2), and the fall
// is drawn in the path colour.
//
// The jumper and the canopy are drawn at a readable size, not to the
// drop's scale (at 550 m on one canvas a person is under a pixel) — the
// same decision the ball makes in the stadium. Their POSITION is the
// engine's: everything placed is read from js/core/journey.js (rule 4).
// When it lands (the engine's tMax) dust is kicked up and the canopy
// collapses over a short life (effects.js), off to the side, out of the way
// of the label.
//
// Backdrop pieces `aircraft` and `fields` are exported here.

import { fitCanvas, palette, clamp, labels, stroke, arrow, niceStep, cssVar } from './util.js';
import { skyscape, env, rng, softShadow } from './scenery.js';
import { dust, ageOf } from './effects.js';
import { T, num } from '../notation.js';

/** At most three significant figures, trailing zeros dropped: 505, 83.2, 3. */
const s3 = (x) => {
  if (!isFinite(x) || Math.abs(x) < 1e-9) return num(0, 0);
  const dp = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x))));
  return num(x, dp, { trim: true });
};

/* ── colour, solid ─────────────────────────────────────────────────────
   Distance and the light are mixed into the colour itself, never laid over
   it at an alpha, so every field, cloud and panel is an opaque paint. */
const rgb = (c) => {
  const s = String(c).trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) return m[1].split('').map((d) => parseInt(d + d, 16));
  m = /rgba?\(([^)]+)\)/.exec(s);
  if (m) return m[1].split(',').slice(0, 3).map((v) => parseFloat(v));
  return [128, 128, 128];
};
const mix = (a, b, u) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(u, 0, 1)).toString(16).padStart(2, '0')).join(''); };
const dark = (c, u) => mix(c, '#000000', u);
const lite = (c, u) => mix(c, '#ffffff', u);
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => 1 - (1 - clamp(u, 0, 1)) ** 3;

/** The jump's own colours: kit and canopy kept off the five physics hues. */
function kit() {
  const E = env(), n = E.night;
  return {
    E, n,
    blue: '#3f5ea8', blueDark: '#2a3f74', ivory: '#efe6d6', ochre: '#d8a63c',
    rig: '#33363f', strap: '#1b1c21', skin: '#d6a383', visor: '#1d2230',
    edge: n ? '#0d0a0c' : '#2a2226',
    lineCol: n ? '#d9cec4' : '#4c4246',
  };
}

/* ── the aircraft ──────────────────────────────────────────────────────── */

/** A high-wing jump plane side on, nose to the right, L px long: its open
    door centred on x, its belly (the door sill) at y. Painted ivory with a
    blue cheat line, lit from the upper left. */
export function aircraft(g, x, y, L, P) {
  const K = kit();
  const p = (u, v) => [x + u * L, y + v * L];
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  // the far wheel and the gear, behind the body
  const wheel = (u, v, r) => { const [wx, wy] = p(u, v); g.fillStyle = '#1e1e22'; g.beginPath(); g.arc(wx, wy, r * L, 0, 7); g.fill(); g.fillStyle = '#8d8a8f'; g.beginPath(); g.arc(wx, wy, r * L * 0.45, 0, 7); g.fill(); };
  g.strokeStyle = '#4a4a52'; g.lineWidth = Math.max(1.5, L * 0.012);
  g.beginPath(); g.moveTo(...p(0.14, -0.01)); g.lineTo(...p(0.2, 0.045)); g.moveTo(...p(0.5, -0.03)); g.lineTo(...p(0.5, 0.045)); g.stroke();
  wheel(0.2, 0.05, 0.028); wheel(0.5, 0.055, 0.022);
  // the tailplane, far side
  g.fillStyle = mix(K.ivory, '#7d7570', 0.45);
  g.beginPath(); g.ellipse(...p(-0.33, -0.112), L * 0.085, L * 0.013, -0.04, 0, 7); g.fill();
  // the fuselage
  const body = new Path2D();
  body.moveTo(...p(0.62, -0.075));
  body.quadraticCurveTo(...p(0.6, -0.12), ...p(0.5, -0.125));
  body.lineTo(...p(0.42, -0.128));
  body.quadraticCurveTo(...p(0.37, -0.17), ...p(0.3, -0.172));
  body.lineTo(...p(-0.06, -0.172));
  body.quadraticCurveTo(...p(-0.22, -0.165), ...p(-0.4, -0.135));
  body.lineTo(...p(-0.41, -0.102));
  body.quadraticCurveTo(...p(-0.2, -0.05), ...p(-0.06, 0));
  body.lineTo(...p(0.42, 0));
  body.quadraticCurveTo(...p(0.58, -0.005), ...p(0.62, -0.075));
  body.closePath();
  const [, top] = p(0, -0.172);
  const gr = g.createLinearGradient(0, top, 0, y);
  gr.addColorStop(0, lite(K.ivory, 0.5)); gr.addColorStop(0.45, K.ivory); gr.addColorStop(1, mix(K.ivory, '#6e6560', 0.5));
  g.fillStyle = gr; g.fill(body);
  g.save(); g.clip(body);
  // the cheat line: a blue band with an ochre pinstripe, nose to tail
  g.fillStyle = K.blue;
  g.beginPath(); g.moveTo(...p(0.64, -0.08)); g.lineTo(...p(-0.42, -0.13)); g.lineTo(...p(-0.42, -0.105)); g.lineTo(...p(0.64, -0.05)); g.closePath(); g.fill();
  g.strokeStyle = K.ochre; g.lineWidth = Math.max(1, L * 0.007);
  g.beginPath(); g.moveTo(...p(0.64, -0.088)); g.lineTo(...p(-0.42, -0.138)); g.stroke();
  // the belly in shade
  g.fillStyle = mix(K.ivory, '#5d5550', 0.55);
  g.beginPath(); g.moveTo(...p(0.64, -0.02)); g.lineTo(...p(-0.42, -0.07)); g.lineTo(...p(-0.42, 0.02)); g.lineTo(...p(0.64, 0.02)); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = K.edge; g.lineWidth = 1.2; g.stroke(body);
  // the fin and rudder
  const fin = new Path2D();
  fin.moveTo(...p(-0.22, -0.168)); fin.quadraticCurveTo(...p(-0.32, -0.2), ...p(-0.37, -0.33));
  fin.lineTo(...p(-0.44, -0.335)); fin.lineTo(...p(-0.405, -0.135)); fin.closePath();
  const fg = g.createLinearGradient(...p(-0.44, 0), ...p(-0.22, 0));
  fg.addColorStop(0, mix(K.ivory, '#6e6560', 0.25)); fg.addColorStop(1, lite(K.ivory, 0.3));
  g.fillStyle = fg; g.fill(fin);
  g.save(); g.clip(fin); g.fillStyle = K.blue; g.fillRect(...p(-0.46, -0.34), L * 0.2, L * 0.06); g.fillStyle = K.ochre; g.fillRect(...p(-0.46, -0.282), L * 0.2, L * 0.012); g.restore();
  g.strokeStyle = K.edge; g.stroke(fin);
  g.beginPath(); g.moveTo(...p(-0.385, -0.15)); g.lineTo(...p(-0.41, -0.31)); g.lineWidth = 0.8; g.stroke();
  // the tailplane, near side
  g.fillStyle = lite(K.ivory, 0.2); g.beginPath(); g.ellipse(...p(-0.34, -0.118), L * 0.1, L * 0.016, -0.05, 0, 7); g.fill(); g.lineWidth = 1; g.stroke();
  // windscreen and cabin windows
  const glass = (path) => { const gg = g.createLinearGradient(0, top, 0, top + L * 0.06); gg.addColorStop(0, K.n ? '#8fa3b5' : '#c9dbe6'); gg.addColorStop(1, K.n ? '#27313d' : '#5f7686'); g.fillStyle = gg; g.fill(path); g.strokeStyle = K.edge; g.lineWidth = 1; g.stroke(path); };
  const ws = new Path2D(); ws.moveTo(...p(0.42, -0.128)); ws.quadraticCurveTo(...p(0.37, -0.165), ...p(0.32, -0.166)); ws.lineTo(...p(0.32, -0.128)); ws.closePath(); glass(ws);
  for (const u of [0.08, 0.17, 0.25]) { const wp = new Path2D(); wp.roundRect(...p(u, -0.155), L * 0.06, L * 0.034, L * 0.012); glass(wp); }
  // the open door: the dark cabin inside, the sill lit
  const [dx0, dy0] = p(-0.065, -0.158);
  const dg = g.createLinearGradient(dx0, 0, dx0 + L * 0.13, 0);
  dg.addColorStop(0, '#0b090a'); dg.addColorStop(1, '#2a2427');
  g.fillStyle = dg; g.beginPath(); g.roundRect(dx0, dy0, L * 0.13, L * 0.153, L * 0.012); g.fill();
  g.strokeStyle = '#4a4a52'; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = '#9b9aa0'; g.fillRect(dx0, y - L * 0.008, L * 0.13, Math.max(2, L * 0.01));
  // the near wing, high on the cabin, and its strut
  g.strokeStyle = '#55555d'; g.lineWidth = Math.max(1.6, L * 0.012);
  g.beginPath(); g.moveTo(...p(0.13, -0.025)); g.lineTo(...p(0.25, -0.18)); g.stroke();
  const wing = new Path2D();
  wing.moveTo(...p(0.03, -0.172)); wing.lineTo(...p(0.36, -0.176));
  wing.quadraticCurveTo(...p(0.385, -0.19), ...p(0.35, -0.205));
  wing.lineTo(...p(0.03, -0.196)); wing.closePath();
  const wg = g.createLinearGradient(0, y - L * 0.205, 0, y - L * 0.172);
  wg.addColorStop(0, lite(K.ivory, 0.4)); wg.addColorStop(1, mix(K.ivory, '#6e6560', 0.35));
  g.fillStyle = wg; g.fill(wing); g.strokeStyle = K.edge; g.lineWidth = 1; g.stroke(wing);
  // the near wheel, a fairing over it
  wheel(0.2, 0.05, 0.03);
  g.fillStyle = K.ivory; g.beginPath(); g.ellipse(...p(0.2, 0.04), L * 0.04, L * 0.018, 0, Math.PI, 0); g.fill(); g.strokeStyle = K.edge; g.stroke();
  // spinner and the propeller turning: a thin disc of blur, the blade tips lit
  const [nx, ny] = p(0.62, -0.075);
  g.fillStyle = mix(K.ivory, '#6e6560', 0.2);
  g.beginPath(); g.moveTo(nx, ny - L * 0.03); g.quadraticCurveTo(nx + L * 0.045, ny, nx, ny + L * 0.03); g.closePath(); g.fill(); g.strokeStyle = K.edge; g.stroke();
  g.fillStyle = K.n ? '#5d5359' : '#b9aaa4';
  g.beginPath(); g.ellipse(nx + L * 0.02, ny, L * 0.008, L * 0.11, 0, 0, 7); g.fill();
  g.fillStyle = K.ochre; g.fillRect(nx + L * 0.014, ny - L * 0.11, L * 0.012, L * 0.012); g.fillRect(nx + L * 0.014, ny + L * 0.098, L * 0.012, L * 0.012);
  g.restore();
}

/* ── the jumper ────────────────────────────────────────────────────────── */

const limb = (g, pts, w, col, edge) => {
  g.lineCap = 'round'; g.lineJoin = 'round';
  const path = () => { g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); };
  g.strokeStyle = edge; g.lineWidth = w + 2.4; path(); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; path(); g.stroke();
};
function helmet(g, x, y, r, K, facing) {
  // facing: 'side' looks down and to the right; 'front' looks at us
  const hg = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
  hg.addColorStop(0, lite(K.ochre, 0.45)); hg.addColorStop(1, dark(K.ochre, 0.25));
  g.fillStyle = hg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = K.edge; g.lineWidth = 1.2; g.stroke();
  if (facing === 'side') {
    g.fillStyle = K.skin; g.beginPath(); g.ellipse(x + r * 0.45, y + r * 0.55, r * 0.42, r * 0.36, 0.5, 0, 7); g.fill();
    g.fillStyle = K.visor; g.beginPath(); g.ellipse(x + r * 0.62, y + r * 0.22, r * 0.36, r * 0.24, 0.9, 0, 7); g.fill();
    g.fillStyle = '#9fb3c8'; g.beginPath(); g.ellipse(x + r * 0.55, y + r * 0.1, r * 0.12, r * 0.06, 0.9, 0, 7); g.fill();
  } else {
    g.fillStyle = K.skin; g.beginPath(); g.ellipse(x, y + r * 0.42, r * 0.62, r * 0.5, 0, 0, 7); g.fill();
    g.fillStyle = K.visor; g.beginPath(); g.roundRect(x - r * 0.72, y - r * 0.08, r * 1.44, r * 0.42, r * 0.2); g.fill();
    g.fillStyle = '#9fb3c8'; g.fillRect(x - r * 0.45, y + r * 0.0, r * 0.3, r * 0.08);
  }
}

/** A skydiver in free fall, side on, head to the right and belly to the
    earth (the box position): body S px long, centred on (x, y). */
function skydiver(g, x, y, S, K) {
  const q = (u, v) => [x + u * S, y + v * S];
  const lw = Math.max(5, S * 0.1);
  g.save();
  // the far arm and leg, in shade
  limb(g, [q(0.12, -0.03), q(0.21, -0.17), q(0.33, -0.21)], lw, K.blueDark, K.edge);
  limb(g, [q(-0.15, -0.01), q(-0.31, 0.03), q(-0.4, -0.13)], lw * 1.15, K.blueDark, K.edge);
  g.fillStyle = K.strap; g.beginPath(); g.ellipse(...q(-0.41, -0.16), S * 0.05, S * 0.03, -1.1, 0, 7); g.fill();
  // the torso: a jumpsuit lit from above, the ochre stripe down its side
  const torso = new Path2D(); torso.roundRect(x - S * 0.24, y - S * 0.085, S * 0.44, S * 0.18, S * 0.08);
  const tg = g.createLinearGradient(0, y - S * 0.09, 0, y + S * 0.09);
  tg.addColorStop(0, lite(K.blue, 0.25)); tg.addColorStop(1, dark(K.blue, 0.3));
  g.fillStyle = tg; g.fill(torso); g.strokeStyle = K.edge; g.lineWidth = 1.2; g.stroke(torso);
  g.strokeStyle = K.ochre; g.lineWidth = Math.max(1.5, S * 0.025);
  g.beginPath(); g.moveTo(...q(-0.22, 0.01)); g.lineTo(...q(0.17, 0.0)); g.stroke();
  // the rig on the back: the container, its pin flap, the pilot-chute pouch
  const rig = new Path2D(); rig.roundRect(x - S * 0.17, y - S * 0.17, S * 0.3, S * 0.1, S * 0.03);
  g.fillStyle = K.rig; g.fill(rig); g.strokeStyle = K.edge; g.lineWidth = 1; g.stroke(rig);
  g.fillStyle = lite(K.rig, 0.25); g.fillRect(x - S * 0.15, y - S * 0.165, S * 0.26, S * 0.025);
  g.fillStyle = K.ochre; g.beginPath(); g.arc(...q(-0.12, -0.08), Math.max(1.5, S * 0.018), 0, 7); g.fill();
  // the harness across the chest and round the thigh
  g.strokeStyle = K.strap; g.lineWidth = Math.max(1.4, S * 0.022);
  g.beginPath(); g.moveTo(...q(0.08, -0.085)); g.lineTo(...q(0.05, 0.09)); g.moveTo(...q(-0.16, -0.08)); g.lineTo(...q(-0.2, 0.09)); g.stroke();
  // the near leg, knees bent and boots up
  limb(g, [q(-0.17, 0.02), q(-0.35, 0.07), q(-0.45, -0.09)], lw * 1.15, K.blue, K.edge);
  g.fillStyle = K.strap; g.beginPath(); g.ellipse(...q(-0.46, -0.12), S * 0.055, S * 0.032, -1.1, 0, 7); g.fill();
  // the head, chin down, looking at the ground ahead
  helmet(g, ...q(0.31, -0.01), S * 0.105, K, 'side');
  // the near arm, out and bent, the glove
  limb(g, [q(0.11, -0.01), q(0.2, -0.15), q(0.36, -0.22)], lw, K.blue, K.edge);
  g.fillStyle = K.strap; g.beginPath(); g.arc(...q(0.37, -0.225), lw * 0.62, 0, 7); g.fill();
  g.restore();
}

/** A person hanging in the harness, front on, feet at (x, y), H px tall.
    `down` 0..1 lowers the arms from the toggles once landed. */
function hanging(g, x, y, H, K, down = 0) {
  const lw = Math.max(5, H * 0.11);
  g.save();
  // legs and boots
  for (const s of [-1, 1]) {
    limb(g, [[x + s * H * 0.07, y - H * 0.44], [x + s * H * 0.08, y - H * 0.22], [x + s * H * 0.065, y - H * 0.05]], lw, K.blue, K.edge);
    g.fillStyle = K.strap; g.beginPath(); g.ellipse(x + s * H * 0.075, y - H * 0.025, H * 0.07, H * 0.035, 0, 0, 7); g.fill();
  }
  // arms, behind the risers: up on the toggles, or down at the sides once landed
  const hand = (s) => [x + s * lerp(H * 0.15, H * 0.24, down), y - lerp(H * 1.02, H * 0.42, down)];
  const elbow = (s) => [x + s * lerp(H * 0.22, H * 0.2, down), y - lerp(H * 0.86, H * 0.58, down)];
  for (const s of [-1, 1]) {
    limb(g, [[x + s * H * 0.11, y - H * 0.73], elbow(s), hand(s)], lw * 0.9, K.blue, K.edge);
    g.fillStyle = K.strap; g.beginPath(); g.arc(...hand(s), lw * 0.55, 0, 7); g.fill();
  }
  // the torso
  const torso = new Path2D(); torso.roundRect(x - H * 0.135, y - H * 0.79, H * 0.27, H * 0.4, H * 0.07);
  const tg = g.createLinearGradient(x - H * 0.14, 0, x + H * 0.14, 0);
  tg.addColorStop(0, lite(K.blue, 0.25)); tg.addColorStop(1, dark(K.blue, 0.3));
  g.fillStyle = tg; g.fill(torso); g.strokeStyle = K.edge; g.lineWidth = 1.2; g.stroke(torso);
  g.fillStyle = K.ochre; for (const s of [-1, 1]) g.fillRect(x + s * H * 0.12 - H * 0.015, y - H * 0.76, H * 0.03, H * 0.34);
  // the harness: main lift webs, chest strap, leg loops
  g.strokeStyle = K.strap; g.lineWidth = Math.max(1.6, H * 0.035); g.lineCap = 'round';
  g.beginPath();
  for (const s of [-1, 1]) { g.moveTo(x + s * H * 0.08, y - H * 0.78); g.lineTo(x + s * H * 0.07, y - H * 0.42); }
  g.moveTo(x - H * 0.09, y - H * 0.64); g.lineTo(x + H * 0.09, y - H * 0.64);
  g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * H * 0.07, y - H * 0.4, H * 0.07, H * 0.03, 0, 0, 7); g.stroke(); }
  helmet(g, x, y - H * 0.9, H * 0.11, K, 'front');
  g.restore();
}

/** The ram-air canopy front on: seven cells across, alternately blue and
    ivory with an ochre centre cell, the cell mouths dark along the leading
    edge, and the suspension lines down to the risers at rl and rr.
    c: centre {x, y} of the canopy; W span; th its face; arch how far the tips
    hang below the middle; tilt (rad) and rumple for a collapsing canopy. */
function canopy(g, c, W, th, arch, tilt, rumple, rl, rr, K, slider = 1) {
  const N = 7, cols = [K.blue, K.ivory, K.blue, K.ochre, K.blue, K.ivory, K.blue];
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const at = (u, v) => [c.x + u * ct - v * st, c.y + u * st + v * ct];
  // a collapsing canopy billows along its top; its lower edge settles flat
  const topV = (s) => -th / 2 + arch * s * s - rumple * (0.6 + 0.4 * Math.sin(s * 7 + 1.3)) * (1 - 0.5 * s * s);
  const botV = (s) => -th / 2 + arch * s * s + th * (1 - 0.35 * s * s);
  const S = (i) => -1 + (2 * i) / N;
  // the lines first, so the canopy and the slider sit on them
  g.save(); g.strokeStyle = K.lineCol; g.lineWidth = 1;
  for (let i = 0; i <= N; i++) {
    const s = S(i), b = at(s * W / 2, botV(s));
    for (const r of (Math.abs(s) < 1e-9 ? [rl, rr] : [s < 0 ? rl : rr])) { g.beginPath(); g.moveTo(...b); g.lineTo(r.x, r.y); g.stroke(); }
  }
  g.restore();
  // the slider, a third of the way down the lines
  if (slider > 0.05) {
    const mid = at(0, botV(0)), ys = lerp(mid[1], rl.y, 0.35), half = lerp(W * 0.18, Math.abs(rr.x - rl.x) * 0.6, 0.35);
    g.fillStyle = mix(K.ivory, '#8a807a', 0.3); g.strokeStyle = K.edge; g.lineWidth = 1;
    g.beginPath(); g.roundRect(lerp(mid[0], (rl.x + rr.x) / 2, 0.35) - half, ys - 2.5, half * 2, 5, 2); g.fill(); g.stroke();
  }
  // the cells
  const steps = 4;
  for (let i = 0; i < N; i++) {
    const s0 = S(i), s1 = S(i + 1), path = new Path2D();
    for (let j = 0; j <= steps; j++) { const s = lerp(s0, s1, j / steps); const p = at(s * W / 2, topV(s)); j ? path.lineTo(...p) : path.moveTo(...p); }
    for (let j = steps; j >= 0; j--) { const s = lerp(s0, s1, j / steps); path.lineTo(...at(s * W / 2, botV(s))); }
    path.closePath();
    const sm = (s0 + s1) / 2, pt = at(sm * W / 2, topV(sm)), pb = at(sm * W / 2, botV(sm));
    const gr = g.createLinearGradient(...pt, ...pb);
    const lit = 0.18 - sm * 0.1;                        // the light from the left
    gr.addColorStop(0, lite(cols[i], Math.max(0, lit))); gr.addColorStop(1, dark(cols[i], 0.22 + sm * 0.06));
    g.fillStyle = gr; g.fill(path);
    // the cell mouth, low on the leading edge
    const m = [];
    for (let j = 0; j <= steps; j++) { const s = lerp(s0, s1, 0.12 + 0.76 * (j / steps)); m.push(at(s * W / 2, lerp(topV(s), botV(s), 0.58))); }
    for (let j = steps; j >= 0; j--) { const s = lerp(s0, s1, 0.12 + 0.76 * (j / steps)); m.push(at(s * W / 2, lerp(topV(s), botV(s), 0.9))); }
    g.fillStyle = dark(cols[i], 0.6); g.beginPath(); g.moveTo(...m[0]); for (const p of m.slice(1)) g.lineTo(...p); g.closePath(); g.fill();
    g.strokeStyle = K.edge; g.lineWidth = 0.9; g.stroke(path);
  }
  // the outline, crisp against the sky
  const out = new Path2D();
  for (let j = 0; j <= 24; j++) { const s = -1 + j / 12; const p = at(s * W / 2, topV(s)); j ? out.lineTo(...p) : out.moveTo(...p); }
  for (let j = 24; j >= 0; j--) { const s = -1 + j / 12; out.lineTo(...at(s * W / 2, botV(s))); }
  out.closePath(); g.strokeStyle = K.edge; g.lineWidth = 1.4; g.stroke(out);
  return { x0: Math.min(at(-W / 2, 0)[0], at(W / 2, 0)[0]) - 2, x1: Math.max(at(-W / 2, 0)[0], at(W / 2, 0)[0]) + 2, y0: Math.min(at(0, topV(0))[1], at(-W / 2, topV(-1))[1], at(W / 2, topV(1))[1]) - 2, y1: Math.max(at(0, botV(0))[1], at(-W / 2, botV(-1))[1], at(W / 2, botV(1))[1]) + 2 };
}

/* ── the sky and the land below it ─────────────────────────────────────── */

/** One cumulus, w px across, its flat base at y: solid, lit on top. */
function cumulus(g, x, y, w, E, r, far) {
  const puffs = [], n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    puffs.push({ x: x + (u - 0.5) * w * 0.78, y: y - w * (0.05 + 0.16 * Math.sin(u * Math.PI)) - r() * w * 0.04, rad: w * (0.11 + 0.07 * Math.sin(u * Math.PI) + r() * 0.04) });
  }
  const shape = new Path2D();
  for (const p of puffs) { shape.moveTo(p.x + p.rad, p.y); shape.arc(p.x, p.y, p.rad, 0, Math.PI * 2); }
  shape.rect(x - w * 0.44, y - w * 0.08, w * 0.88, w * 0.08);
  const body = E.night ? '#4c3c44' : '#fff7f1', base = E.night ? '#33272d' : '#efd3c6', top = E.night ? '#7d6466' : '#ffffff';
  const dim = (c) => mix(c, E.night ? E.skyBottom : E.haze, far);
  g.save(); g.beginPath(); g.rect(x - w, y - w, w * 2, w); g.clip();
  const gr = g.createLinearGradient(0, y - w * 0.36, 0, y);
  gr.addColorStop(0, dim(top)); gr.addColorStop(0.45, dim(body)); gr.addColorStop(1, dim(base));
  g.fillStyle = gr; g.fill(shape);
  g.restore();
}

/** A far ridge of hills along the horizon, solid, misted by the haze. */
function farHills(g, x0, x1, Y, h, col, r) {
  const k1 = 0.8 + r(), k2 = 2.2 + r() * 2, p1 = r() * 6, p2 = r() * 6;
  g.fillStyle = col; g.beginPath(); g.moveTo(x0, Y + 1);
  for (let x = x0; x <= x1 + 6; x += 6) { const u = (x - x0) / Math.max(1, x1 - x0); g.lineTo(x, Y - h * (0.5 + 0.32 * Math.sin(u * 6.28 * k1 + p1) + 0.18 * Math.sin(u * 6.28 * k2 + p2))); }
  g.lineTo(x1, Y + 1); g.closePath(); g.fill();
}

/** Farmland seen from height, from the horizon at y = Y down to `bottom`:
    fields of different crops in perspective behind hedgerows, ploughed and
    drilled in rows close to, a road with farms along it and a lane across,
    trees in the hedges — all of it fading into the haze towards the horizon.
    o: { vx (the vanishing point's x), seed }. */
export function fields(g, x0, x1, Y, bottom, o = {}) {
  const E = env(), n = E.night, r = rng(o.seed ?? 53), W = x1 - x0, vx = o.vx ?? (x0 + x1) / 2;
  const depth = Math.max(10, bottom - Y), sc = W * 0.5, Zf = 48;
  const sy = (z) => Y + depth / z, sx = (gx, z) => vx + (gx * sc) / z;
  const crops = n
    ? ['#58623d', '#4a5533', '#6c6145', '#4c3c33', '#606b44', '#3e482e', '#756849', '#54502f']
    : ['#a6aa6f', '#91975e', '#ccb784', '#a88e77', '#b6b97e', '#848d58', '#d3c18d', '#b0a066'];
  const hedge = n ? '#262d1e' : '#5f6b3e', trunkC = n ? '#2a201c' : '#6b5546';
  const haze = E.haze, hz = (z) => Math.min(0.94, Math.pow(Math.max(0, z - 0.9) / Zf, 0.5) * 1.05);
  g.save(); g.beginPath(); g.rect(x0 - 2, Y, W + 4, depth + 4); g.clip();
  g.fillStyle = mix(crops[1], haze, 0.9); g.fillRect(x0 - 2, Y, W + 4, depth + 4);
  // the rows of fields, far to near
  const rows = []; for (let z = 0.8; z < Zf;) { const dz = 0.5 + 0.06 * z; rows.push([z, z + dz]); z += dz; }
  const trees = [];
  const roadG = (z) => 1.25 + 0.4 * Math.sin(z * 0.2 + 0.6);
  const quad = (a, b, za, zb) => [[sx(a, za), sy(za)], [sx(b, za), sy(za)], [sx(b, zb), sy(zb)], [sx(a, zb), sy(zb)]];
  const poly = (pts) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); };
  for (const [za, zb] of rows.reverse()) {
    const zm = (za + zb) / 2, dx = 0.8 + 0.07 * zm, f = hz(zm);
    const lo = ((x0 - vx) * zb) / sc - dx, hi = ((x1 - vx) * zb) / sc + dx;
    let ga = lo - r() * dx;
    while (ga < hi) {
      const gb = ga + dx * (0.55 + r() * 0.9), col = crops[Math.floor(r() * crops.length)], kind = r();
      const pts = quad(ga, gb, za, zb);
      g.fillStyle = mix(col, haze, f); poly(pts); g.fill();
      // drilled rows or plough lines in the near fields
      if (zm < 9 && kind < 0.75) {
        g.save(); poly(pts); g.clip();
        g.strokeStyle = mix(kind < 0.4 ? dark(col, 0.16) : lite(col, 0.12), haze, f); g.lineWidth = Math.max(0.6, 1.6 / zm);
        const k = 6 + Math.floor(r() * 5);
        g.beginPath();
        if (kind < 0.4) for (let i = 1; i < k; i++) { const gx = lerp(ga, gb, i / k); g.moveTo(sx(gx, za), sy(za)); g.lineTo(sx(gx, zb), sy(zb)); }
        else for (let i = 1; i < k; i++) { const z = lerp(za, zb, i / k); g.moveTo(sx(ga, z), sy(z)); g.lineTo(sx(gb, z), sy(z)); }
        g.stroke(); g.restore();
      } else r();
      // the hedgerow along its near and left edges
      g.strokeStyle = mix(hedge, haze, f * 0.95); g.lineWidth = Math.max(0.6, 3.4 / zm); g.lineCap = 'round';
      g.beginPath(); g.moveTo(...pts[3]); g.lineTo(...pts[0]); g.lineTo(...pts[1]); g.stroke();
      if (zm < 14 && r() < 0.45) trees.push({ x: pts[0][0], y: pts[0][1], z: za, f });
      ga = gb;
    }
  }
  // the lane across, and the road running away towards the horizon
  const zc = 4.2, roadC = n ? '#4a4045' : '#cbbab0', roadE = n ? '#2c2428' : '#9e8d84';
  g.fillStyle = mix(roadC, haze, hz(zc)); g.fillRect(x0 - 2, sy(zc + 0.09), W + 4, Math.max(1.5, sy(zc) - sy(zc + 0.09)));
  const L = [], R = [];
  for (let z = 0.8; z <= Zf; z *= 1.08) { const c = roadG(z); L.push([sx(c - 0.08, z), sy(z)]); R.push([sx(c + 0.08, z), sy(z)]); }
  const rg = g.createLinearGradient(0, Y, 0, bottom); rg.addColorStop(0, mix(roadC, haze, 0.9)); rg.addColorStop(1, roadC);
  g.fillStyle = rg; g.beginPath(); g.moveTo(...L[0]); for (const p of L.slice(1)) g.lineTo(...p); for (const p of R.reverse()) g.lineTo(...p); g.closePath(); g.fill();
  g.strokeStyle = roadE; g.lineWidth = 1; g.stroke();
  g.strokeStyle = n ? '#b7aaa2' : '#fff6ec'; g.lineWidth = 1.4; g.setLineDash([6, 8]);
  g.beginPath(); for (let z = 0.8, i = 0; z <= 6; z *= 1.08, i++) { const p = [sx(roadG(z), z), sy(z)]; i ? g.lineTo(...p) : g.moveTo(...p); } g.stroke(); g.setLineDash([]);
  // farms along the road: a house, a barn
  for (const [z, side, barn] of [[2.2, 1, 0], [2.5, 1, 1], [5.6, -1, 0], [8.5, 1, 1], [3.4, -1, 0]]) {
    const gx = roadG(z) + side * (0.22 + (barn ? 0.18 : 0)), bx = sx(gx, z), by = sy(z), s = (depth * 0.16) / z * (barn ? 1.3 : 1), f = hz(z);
    softShadow(g, bx + s * 0.3, by, s * 0.8, s * 0.2, 0.8);
    const wall = mix(barn ? (n ? '#5a463e' : '#b98e72') : (n ? '#8d7d7f' : '#efe2d6'), haze, f), roof = mix(barn ? (n ? '#3b3236' : '#7d6f6b') : (n ? '#6b3f36' : '#a86450'), haze, f);
    g.fillStyle = wall; g.fillRect(bx - s * 0.5, by - s * 0.5, s, s * 0.5);
    g.fillStyle = dark(wall, 0.25); g.fillRect(bx + s * 0.5, by - s * 0.5, s * 0.35, s * 0.5);
    g.fillStyle = roof; g.beginPath(); g.moveTo(bx - s * 0.6, by - s * 0.48); g.lineTo(bx - s * 0.2, by - s * 0.85); g.lineTo(bx + s * 0.95, by - s * 0.85); g.lineTo(bx + s * 0.9, by - s * 0.48); g.closePath(); g.fill();
    if (!barn && s > 6) { g.fillStyle = n ? E.window : dark(wall, 0.45); g.fillRect(bx - s * 0.3, by - s * 0.36, s * 0.16, s * 0.14); g.fillRect(bx + s * 0.1, by - s * 0.36, s * 0.16, s * 0.14); }
  }
  // trees in the hedges, far to near
  for (const t of trees.sort((a, b) => b.z - a.z)) {
    const s = (depth * 0.07) / t.z, crown = mix(n ? '#2f3a25' : '#76844b', haze, t.f), lit = mix(n ? '#47553a' : '#9aa865', haze, t.f);
    if (s < 1.2) continue;
    softShadow(g, t.x + s * 0.5, t.y, s * 1.1, s * 0.3, 0.7);
    g.fillStyle = mix(trunkC, haze, t.f); g.fillRect(t.x - s * 0.12, t.y - s * 0.9, s * 0.24, s * 0.9);
    g.fillStyle = crown; g.beginPath(); g.arc(t.x, t.y - s * 1.3, s * 0.75, 0, 7); g.arc(t.x + s * 0.4, t.y - s * 1.0, s * 0.55, 0, 7); g.arc(t.x - s * 0.45, t.y - s * 1.0, s * 0.5, 0, 7); g.fill();
    g.fillStyle = lit; g.beginPath(); g.arc(t.x - s * 0.22, t.y - s * 1.52, s * 0.38, 0, 7); g.fill();
  }
  g.restore();
}

/** The drop zone's target where it lands: a disc of pea gravel ringed in white, in perspective. */
function target(g, x, y, rx, E) {
  const ry = rx * 0.26;
  g.save();
  g.fillStyle = E.night ? '#46503a' : '#9fa86c'; g.beginPath(); g.ellipse(x, y, rx * 1.9, ry * 1.9, 0, 0, 7); g.fill();
  const gr = g.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 1, x, y, rx);
  gr.addColorStop(0, E.night ? '#9a8c7e' : '#e9dcc6'); gr.addColorStop(1, E.night ? '#6c6056' : '#c7b69c');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
  g.strokeStyle = E.night ? '#e6ddd3' : '#ffffff'; g.lineWidth = 1.6;
  g.beginPath(); g.ellipse(x, y, rx * 0.55, ry * 0.55, 0, 0, 7); g.stroke();
  g.fillStyle = E.night ? '#e6ddd3' : '#ffffff'; g.beginPath(); g.ellipse(x, y, rx * 0.12, ry * 0.12, 0, 0, 7); g.fill();
  g.restore();
}

/** Labels stacked down one side, `gap` px apart at least: each one moved as
    little as it can from its own y (to .ly), an item with `pin` held where it is
    (the ruler's top and its ground). */
function spread(items, gap, lo, hi) {
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.ly = it.y;
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 1; i < items.length; i++) {
      const a = items[i - 1], b = items[i], d = b.ly - a.ly;
      if (d >= gap - 0.01) continue;
      const need = gap - d, fa = a.pin ? 0 : b.pin ? 1 : 0.5;
      a.ly -= need * fa; b.ly += need * (1 - fa); moved = true;
    }
    for (const it of items) it.ly = clamp(it.ly, lo, hi);
    if (!moved) break;
  }
  return items;
}

/* ── the stage ─────────────────────────────────────────────────────────── */

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || !f.jump) return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), K = kit(), E = K.E;
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const D = f.jump.D, st = f.stages;
  const phone = w < 520, sz = phone ? 0.8 : 1;

  // the readouts' corners (the HUD), kept clear of labels
  if (phone) { L.reserve({ x: 0, y: 0, w: 160, h: 236 }); L.reserve({ x: w - 150, y: 0, w: 150, h: 72 }); }
  else { L.reserve({ x: 0, y: 0, w: 250, h: 250 }); L.reserve({ x: w - 160, y: 0, w: 160, h: 76 }); }

  // one scale: the whole drop, aircraft to field, fills the height of the stage
  const ground = h - clamp(h * 0.16, 50, 96);           // where it lands, on the fields
  const horizon = ground - clamp(h * 0.11, 36, 70);
  const top = phone ? 112 : 92;
  const k = (ground - top) / D;
  const Y = (hgt) => ground - hgt * k;                  // hgt = height above the ground
  const cx = phone ? Math.round(w * 0.55) : Math.round(Math.max(470, w * 0.48));
  const rx = phone ? w - 68 : Math.min(w - 74, cx + 250);

  // the sky, solid clouds at their heights, the far hills, the land
  skyscape(g, 0, 0, w, horizon, { clouds: 0, far: 'none', seed: 11 });
  const cr = rng(19);
  for (let i = 0; i < 6; i++) {
    const u = (i + 0.2 + cr() * 0.6) / 6, cyy = lerp(top + 20, horizon - 30, cr()), far = clamp((cyy - top) / Math.max(1, horizon - top), 0, 1);
    cumulus(g, w * u, cyy, (phone ? 70 : 110) * (1.2 - far * 0.6) * (0.7 + cr() * 0.6), E, cr, far * 0.55);
  }
  const hr = rng(5);
  farHills(g, 0, w, horizon, phone ? 12 : 18, mix(E.grassAlt, E.haze, 0.72), hr);
  farHills(g, 0, w, horizon, phone ? 7 : 10, mix(E.grassAlt, E.haze, 0.5), hr);
  fields(g, 0, w, horizon, h, { vx: w * 0.5 });
  target(g, cx, ground, phone ? 22 : 30, E);

  // the aircraft it leaves, its open door over the column at the jump, then
  // flying on and out of the picture (scenery: its pace is only the art's,
  // set so it is clear of the canopy by the time the engine opens it)
  const AL = phone ? 108 : 160, t1s = Math.max(0.5, isFinite(st[1]?.t0) ? st[1].t0 : f.tMax);
  const away = (t / t1s) * (AL * 0.55 + 70 * sz);
  if (away < w - cx + AL * 0.5) aircraft(g, cx + away, Y(D) - Math.min(30, away * 0.06), AL, P);

  // the height ruler down the right: a white staff with ticks
  const staff = [{ x: rx, y: Y(0) }, { x: rx, y: Y(D) }];
  stroke(g, staff, { color: P.surface, width: 5 });
  stroke(g, staff, { color: P.ink, width: 1.6 });
  // where each stage begins: a marker across, its height on the ruler and its time beside the column
  const fallen = (tt) => f.pos(tt).x;
  const marks = [];
  const names = ['canopy opens', 'steady speed'];
  st.slice(1).forEach((s, i) => { const hh = D - fallen(s.t0); if (hh > 0 && hh < D) marks.push({ hh, t: s.t0, name: names[i] ?? 'next stage' }); });
  const rulerTags = [{ y: Y(D), text: T`${s3(D)} [m]`, color: P.ink, pri: 8, pin: true }, ...marks.map((m) => ({ y: Y(m.hh), text: T`${s3(m.hh)} [m]`, color: P.mark, pri: 7 })), { y: Y(0), text: T`0 [m]`, color: P.ink, pri: 8, pin: true }];
  spread(rulerTags, 25, 12, h - 12);
  const step = niceStep(D, phone ? 5 : 7);
  for (let hh = 0; hh <= D + 1e-9; hh += step) {
    if (marks.some((m) => Math.abs(Y(m.hh) - Y(hh)) < 7)) continue;
    stroke(g, [{ x: rx - 5, y: Y(hh) }, { x: rx + 5, y: Y(hh) }], { color: P.ink, width: 1.4 });
    if (rulerTags.some((r) => Math.abs(r.ly - Y(hh)) < 25)) continue;
    L.add(T`${s3(hh)} [m]`, rx + 10, Y(hh), { color: P.ink, align: 'left', pri: 1, size: 13, maxPush: 0 });
  }
  const x0m = cx - (phone ? 46 : 52), tags = marks.map((m) => ({ y: Y(m.hh), m }));
  spread(tags, 25, 12, h - 12);
  for (const { y, ly, m } of tags) {
    stroke(g, [{ x: x0m, y }, { x: rx, y }], { color: P.surface, width: 3.4 });
    stroke(g, [{ x: x0m, y }, { x: rx, y }], { color: P.mark, width: 1.6 });
    const tag = phone ? T`t = ${s3(m.t)} [s]` : T`${m.name}, t = ${s3(m.t)} [s]`;
    // keep other labels off the line; on a phone its time sits on its far end
    g.save(); g.font = `700 13px ${cssVar('--font', 'system-ui, sans-serif')}`; const tw = g.measureText(tag).width; g.restore();
    L.reserve({ x: x0m, y: y - 3, w: (phone ? rx - 16 - tw - 8 : rx) - x0m, h: 6 });
    if (phone) {
      if (Math.abs(ly - y) > 1) stroke(g, [{ x: rx - 6, y }, { x: rx - 11, y: ly }], { color: P.mark, width: 1.4 });
      L.add(tag, rx - 16, ly, { color: P.mark, align: 'right', pri: 8, size: 13, weight: 700, maxPush: 0 });
    } else {
      if (Math.abs(ly - y) > 1) stroke(g, [{ x: x0m, y }, { x: x0m - 5, y: ly }], { color: P.mark, width: 1.4 });
      L.add(tag, x0m - 7, ly, { color: P.mark, align: 'right', pri: 8, size: 13, weight: 700, maxPush: 0 });
    }
  }
  for (const r of rulerTags) {
    if (Math.abs(r.ly - r.y) > 1) stroke(g, [{ x: rx + 5, y: r.y }, { x: rx + 10, y: r.ly }], { color: r.color, width: 1.4 });
    L.add(r.text, rx + 12, r.ly, { color: r.color, align: 'left', pri: r.pri, size: 13, weight: 700, maxPush: 0 });
  }

  // the fall so far, from the door
  const hNow = D - fallen(t), yNow = Y(hNow);
  stroke(g, [{ x: cx, y: Y(D) }, { x: cx, y: yNow }], { color: P.surface, width: 5 });
  stroke(g, [{ x: cx, y: Y(D) }, { x: cx, y: yNow }], { color: P.vel, width: 2.6 });

  // its shadow on the field, darkening as it comes down
  const near = clamp(1 - (ground - yNow) / 140, 0, 1);
  if (near > 0) softShadow(g, cx + 6, ground, 22 * sz * (0.6 + near * 0.6), 5 * sz, near);

  // the jumper: in the box position, then under the canopy
  const t1 = st[1]?.t0 ?? Infinity;
  const open = t >= t1 - 1e-9;
  const landed = t >= f.tMax - 1e-9;
  const { age, life } = ageOf(t, f.tMax, f.tMax);
  // the collapse runs over the first third of the dust's life; at the end of the playback it is down
  const fold = landed ? ease(age / (life * 0.35)) : 0;
  let figBox;
  if (!open) {
    const S = 62 * sz;
    skydiver(g, cx, yNow, S, K);
    figBox = { x: cx - S * 0.52, y: yNow - S * 0.28, w: S * 1.0, h: S * 0.42 };
  } else {
    const H = 46 * sz;
    // the canopy fills over a moment after the engine says it opens (the art; the model's step is instant)
    const tOpen = Math.max(1e-6, Math.min(0.6, ((st[1].t1 ?? f.tMax) - t1) * 0.3));
    const inf = ease((t - t1) / tOpen);
    const Wc = H * 2.3 * (0.3 + 0.7 * inf), th = H * 0.3 * (0.55 + 0.45 * inf), lines = H * 1.15 * (0.8 + 0.2 * inf);
    const riserY = yNow - H * lerp(1.12, 0.62, fold);
    const rl = { x: cx - H * 0.1, y: riserY }, rr = { x: cx + H * 0.1, y: riserY };
    const fly = { x: cx, y: riserY - lines - th * 0.5 };
    const down = { x: cx + Wc * 0.62, y: ground - H * 0.09 - 1 };
    const c = { x: lerp(fly.x, down.x, fold), y: lerp(fly.y, down.y, fold) };
    // risers up from the harness
    g.strokeStyle = K.strap; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - H * 0.08, yNow - H * 0.76); g.lineTo(rl.x, rl.y); g.moveTo(cx + H * 0.08, yNow - H * 0.76); g.lineTo(rr.x, rr.y); g.stroke();
    const box = canopy(g, c, Wc * lerp(1, 0.92, fold), lerp(th, H * 0.18, fold), lerp(Wc * 0.13, 0, fold),
      Math.sin(fold * Math.PI) * 0.9, fold * H * 0.12, rl, rr, K, 1 - fold);
    hanging(g, cx, yNow, H, K, fold);
    figBox = { x: Math.min(box.x0, cx - H * 0.3), y: Math.min(box.y0, yNow - H * 1.1), w: Math.max(box.x1, cx + H * 0.3) - Math.min(box.x0, cx - H * 0.3), h: yNow - Math.min(box.y0, yNow - H * 1.1) };
  }
  L.reserve(figBox);

  // the landing: dust kicked up at the engine's landing time
  if (landed) dust(g, cx, ground, age, life, { size: 1.5 * sz, n: 20 });

  // the velocity, straight down from the jumper (vertical: solid)
  const v = f.vel(t).x;
  const below = open ? yNow + 3 : yNow + 10 * sz;
  if (show.velocity !== false && v > 1e-6) {
    const vMax = Math.max(...st.flatMap((s) => [Math.abs(s.u), Math.abs(s.u + s.a * ((isFinite(s.t1) ? s.t1 : f.tMax) - s.t0))]), 1e-6);
    const len = (v / vMax) * (phone ? 58 : 76);
    arrow(g, cx, below, cx, below + len, { color: P.velVec, width: 2.8, head: 11 });
    L.reserve({ x: cx - 7, y: below, w: 14, h: len });
    L.add(T`${s3(v)} [m s^-1]`, cx + 12, below + len * 0.6, { color: P.vel, align: 'left', pri: 7, size: 14, weight: 700 });
  }
  // the acceleration, beside it
  const a = f.accel(t);
  if (show.acceleration && Math.abs(a) > 1e-9 && !landed) {
    const ax = cx - (open ? 52 : 40) * sz, ay = open ? yNow - 23 * sz : yNow;
    arrow(g, ax, ay, ax, ay + Math.sign(a) * 40 * sz, { color: P.acc, width: 2.4, head: 10 });
    L.reserve({ x: ax - 7, y: Math.min(ay, ay + Math.sign(a) * 40 * sz), w: 14, h: 40 * sz });
  }
  if (landed) {
    L.reserve({ x: cx - 40, y: ground - 30, w: 80, h: 36 });
    L.add(T`"on the ground," t = ${s3(f.tMax)} [s]`, cx - 30, ground + 26, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
  }
  L.draw(g, w, h);
  return null;
}
