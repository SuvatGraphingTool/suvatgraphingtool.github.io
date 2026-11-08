// apples.js — the stage for two apples falling from one tree: an orchard side
// on, at one scale both ways; the tree drawn to that scale, its crown around
// the two branches the apples hang from; each apple falling straight down
// from where it hung, landing in the grass with a puff; how high each hung and
// the distance between them as dimension brackets; each apple's velocity
// (vertical, so solid, rule 2).
//
// Everything that moves is read from js/core/apples.js (rule 4).

import { dust, pulse, squash, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, sig3, hudBoxes, noteMover } from './util.js';
import { skyscape, grass, fitSide, env, rng, softShadow } from './scenery.js';
import { farField, nearGrass, parkTree } from './towards.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;

/** An apple, r px across its middle, at (x, y): shaded red, a stem and a leaf. */
export function apple(g, x, y, r, { ring = null, green = false, sx = 1, sy = 1 } = {}) {
  const E = env();
  if (sx !== 1 || sy !== 1) { g.save(); g.translate(x, y + r * 0.85); g.scale(sx, sy); g.translate(-x, -(y + r * 0.85)); }
  softShadow(g, x, y + r * 0.9, r * 0.7, r * 0.18, 0.25);
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.05);
  if (green) { gr.addColorStop(0, E.night ? '#9aa85a' : '#c8d27a'); gr.addColorStop(0.6, E.night ? '#5f7030' : '#86983e'); gr.addColorStop(1, E.night ? '#33401c' : '#56662a'); }
  else { gr.addColorStop(0, E.night ? '#e0605a' : '#f27a62'); gr.addColorStop(0.55, E.night ? '#a8282a' : '#c62d2c'); gr.addColorStop(1, E.night ? '#5e1416' : '#7e1a1c'); }
  g.fillStyle = gr; g.beginPath();
  g.moveTo(x, y - r * 0.72);
  g.bezierCurveTo(x + r * 0.55, y - r * 1.15, x + r * 1.15, y - r * 0.45, x + r * 0.95, y + r * 0.25);
  g.bezierCurveTo(x + r * 0.8, y + r * 0.95, x + r * 0.2, y + r * 1.05, x, y + r * 0.85);
  g.bezierCurveTo(x - r * 0.2, y + r * 1.05, x - r * 0.8, y + r * 0.95, x - r * 0.95, y + r * 0.25);
  g.bezierCurveTo(x - r * 1.15, y - r * 0.45, x - r * 0.55, y - r * 1.15, x, y - r * 0.72);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - r * 0.4, y - r * 0.3, r * 0.18, r * 0.28, -0.5, 0, TAU); g.fill();
  g.strokeStyle = '#4a3423'; g.lineWidth = Math.max(1.2, r * 0.14); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y - r * 0.7); g.quadraticCurveTo(x + r * 0.1, y - r * 1.05, x + r * 0.25, y - r * 1.25); g.stroke();
  g.fillStyle = E.night ? '#3f5a2c' : '#5d8a3a'; g.beginPath(); g.ellipse(x + r * 0.55, y - r * 1.1, r * 0.42, r * 0.18, -0.4, 0, TAU); g.fill();
  if (ring) { g.strokeStyle = ring; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, r + 4, 0, TAU); g.stroke(); }
  if (sx !== 1 || sy !== 1) g.restore();
}

/** The apple tree, to scale: a trunk forking into two limbs that reach out
    over the two apples' branches, and a leafy crown around them. */
export function appleTree(g, X, Y, k, xs, tops, seed) {
  const E = env(), r = rng(seed);
  const bark = E.night ? '#3e302a' : '#6b4f3b', barkLit = E.night ? '#5a463b' : '#8c6a50';
  const fork = Math.min(...tops) - 0.35, crownTop = Math.max(...tops) + 1.1;
  // dappled shade under the crown
  softShadow(g, X(0), Y(0) + 2, k * 2.0, k * 0.22, 0.35);
  for (let i = 0; i < 6; i++) softShadow(g, X((r() - 0.5) * 3.2), Y(0) + 2, k * (0.25 + r() * 0.3), k * 0.06, 0.25);
  // the crown behind the limbs
  const lobes = [];
  for (let i = 0; i < 16; i++) {
    const a = r() * TAU, rr = Math.sqrt(r());
    lobes.push({ x: X((xs[0] + xs[1]) / 2 + Math.cos(a) * rr * 1.9), y: Y((fork + crownTop) / 2 + 0.1 + Math.sin(a) * rr * (crownTop - fork) * 0.55), R: k * (0.45 + r() * 0.35) });
  }
  const dark = E.night ? '#253021' : '#4a5f34', lit = E.night ? '#3f5030' : '#7e9550';
  for (const L of lobes) { g.fillStyle = dark; g.beginPath(); g.arc(L.x + k * 0.06, L.y + k * 0.08, L.R, 0, TAU); g.fill(); }
  for (const L of lobes) {
    const lg = g.createRadialGradient(L.x - L.R * 0.4, L.y - L.R * 0.45, L.R * 0.1, L.x, L.y, L.R);
    lg.addColorStop(0, lit); lg.addColorStop(1, dark);
    g.fillStyle = lg; g.beginPath(); g.arc(L.x, L.y, L.R * 0.92, 0, TAU); g.fill();
    // a leafy edge: small leaf clusters round the rim, lit on the sun's side
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * TAU + r() * 0.3, lx = L.x + Math.cos(a) * L.R * 0.88, ly = L.y + Math.sin(a) * L.R * 0.88;
      g.fillStyle = Math.cos(a + 2.3) > 0.2 ? lit : dark;
      g.beginPath(); g.ellipse(lx, ly, L.R * 0.16, L.R * 0.1, a, 0, TAU); g.fill();
    }
  }
  // the trunk and the limbs, over the crown's shade
  const tw = Math.max(6, k * 0.22);
  const tg = g.createLinearGradient(X(0) - tw, 0, X(0) + tw, 0);
  tg.addColorStop(0, barkLit); tg.addColorStop(1, bark);
  g.fillStyle = tg; g.beginPath();
  g.moveTo(X(0) - tw * 0.75, Y(0)); g.lineTo(X(0) - tw * 0.45, Y(fork)); g.lineTo(X(0) + tw * 0.45, Y(fork)); g.lineTo(X(0) + tw * 0.75, Y(0)); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const yy = Y(fork * (0.15 + i * 0.17)); g.beginPath(); g.moveTo(X(0) - tw * 0.4, yy); g.lineTo(X(0) - tw * 0.1, yy - 6); g.stroke(); }
  g.lineCap = 'round';
  xs.forEach((xa, i) => {
    const top = tops[i] + 0.12, ex = xa + Math.sign(xa || 1) * 0.35;
    // a limb that tapers from the fork to its tip, in short pieces
    const q = (u) => ({ x: (1 - u) ** 2 * X(0) + 2 * (1 - u) * u * X(xa * 0.5) + u * u * X(ex), y: (1 - u) ** 2 * Y(fork) + 2 * (1 - u) * u * Y(top + 0.25) + u * u * Y(top) });
    for (let j = 0; j < 12; j++) {
      const a0 = q(j / 12), a1 = q((j + 1) / 12), wdt = Math.max(2, k * 0.13 * (1 - (j / 12) * 0.75));
      g.strokeStyle = bark; g.lineWidth = wdt;
      g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.stroke();
    }
  });
  // a few unripe apples in the crown, small and green, clear of the two that fall
  const away = (x) => xs.every((xa) => Math.abs(x - X(xa)) > k * 0.3);
  for (const L of lobes.filter((L) => away(L.x)).slice(0, 5)) apple(g, L.x + L.R * 0.3, L.y + L.R * 0.25, Math.max(3.5, k * 0.03), { green: true });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'apples') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 4); for (const b of HB) L.reserve(b);

  // ── the frame: the tree's spread across, the ground to above the crown
  const hi = Math.max(f.A.h, f.B.h);
  const xs = [-0.55, 0.55];                                  // where each apple hangs, m from the trunk
  const side = phone ? 0.95 : 2.0;                          // the height brackets, m from the trunk
  // on a phone both brackets go on the right, and the stage sits beside the readouts
  const box = phone ? { xLo: -0.85, xHi: 1.5, yLo: -0.4, yHi: hi + 0.9 } : { xLo: -side - 0.6, xHi: side + 0.6, yLo: -0.6, yHi: hi + 1.5 };
  const area = { left: HB[0].w + (phone ? 6 : 20), right: w - (phone ? 8 : 20), top: phone ? 24 : 28, bottom: h - 18 };
  const { k, X, Y } = fitSide(box, area, { sky: phone ? 0.85 : 0.45 });
  const oy = Y(0), horizon = oy - Math.min(90, (oy - area.top) * 0.35);
  skyscape(g, 0, 0, w, horizon, { seed: 41, far: 'trees' });
  farField(g, 0, w, horizon, oy);
  for (const [dx, s, sd] of [[-3.6, 2.6, 3], [3.7, 2.3, 5], [-5.2, 1.6, 7], [5.3, 1.7, 9]]) parkTree(g, X(dx), oy - (oy - horizon) * 0.2, k * s, sd);
  grass(g, 0, w, oy, h, { seed: 13 });
  nearGrass(g, 0, w, oy, h, 23);
  appleTree(g, X, Y, k, xs, [f.A.h, f.B.h], 11);

  // ── the two apples: where each hung, the fall so far, each at its height now
  const r = clamp(k * 0.08, phone ? 9 : 12, 18);           // a little larger than life, to be seen
  const who = [{ P: f.A, x: xs[0], pos: f.posA, vel: f.velA, name: 'first', ring: null }, { P: f.B, x: xs[1], pos: f.posB, vel: f.velB, name: 'second', ring: P.second }];
  for (const a of who) {
    const yNow = a.pos(t), down = t >= a.P.t - 1e-9;
    // the twig it hung from, springing back once the apple has gone (a flourish, timed from the release)
    const sw = t > 0 ? r * 0.7 * Math.sin(t * 40) * Math.exp(-t * 9) : 0;
    stroke(g, [{ x: X(a.x), y: Y(a.P.h + 0.12) }, { x: X(a.x) + sw, y: Y(a.P.h) - r * 1.3 }], { color: '#4a3423', width: 2 });
    if (t > 0) stroke(g, [{ x: X(a.x), y: Y(a.P.h) }, { x: X(a.x), y: Y(yNow) }], { color: P.muted, width: 1.5, alpha: 0.35 });
    const { age, life } = ageOf(t, a.P.t, f.tMax, Math.max(0.1, f.tMax / 4));
    dust(g, X(a.x), oy, age, life, { size: 1.6, n: 22, seed: a.name === 'first' ? 3 : 5 });
    pulse(g, X(a.x), oy - r * 0.8, age, life, a.ring || P.mark, { radius: 30 });
    // the apple's bottom is at its height the whole way down, so it meets the ground, and squashes as it lands
    const cy = Y(yNow) - r * 0.8, sq = squash(age, life);
    apple(g, X(a.x), cy, r, { ring: a.ring, sx: sq.sx, sy: sq.sy });
    noteMover(g, X(a.x), cy, Math.max(16, r * 1.4));
    L.reserve({ x: X(a.x) - r - 5, y: cy - r * 1.4 - 5, w: 2 * r + 10, h: r * 2.4 + 10 });   // labels keep off each apple
    const v = a.vel(t);
    if (show.velocity !== false && !down && t > 0) {
      const len = Math.max(18, Math.abs(v) * k * 0.12);
      arrow(g, X(a.x) + r + 8, cy, X(a.x) + r + 8, cy + len, { color: P.vel, width: 2.4, head: 9 });
      L.reserve({ x: X(a.x) + r + 2, y: cy, w: 12, h: len });
      L.add(T`${sig3(Math.abs(v))} [m s^-1]`, X(a.x) + r + 16, cy + len * 0.6, { color: P.vel, align: 'left', pri: 9, size: 13, weight: 700 });
    }
    if (down) L.add(T`t = ${num(a.P.t, 3, { trim: true })} [s]`, X(a.x), oy + 18, { color: a.ring || P.mark, align: 'center', pri: 7, size: 13, weight: 700 });
  }

  // ── how high each hung, and the distance between them
  const dim = (x, y0, y1, text, side, color = P.disp, pri = 8) => {
    stroke(g, [{ x, y: y0 }, { x, y: y1 }], { color, width: 1.6 });
    for (const yy of [y0, y1]) stroke(g, [{ x: x - 5, y: yy }, { x: x + 5, y: yy }], { color, width: 1.6 });
    L.add(text, x + side * 8, (y0 + y1) / 2, { color, align: side > 0 ? 'left' : 'right', pri, size: 14, weight: 700 });
  };
  if (phone) {
    // no room for two more brackets: each height beside the twig it hung from
    L.add(T`${sig3(f.A.h)} [m]`, X(xs[0]) - r - 6, Y(f.A.h) - r, { color: P.disp, align: 'right', pri: 8, size: 13, weight: 700 });
    L.add(T`${sig3(f.B.h)} [m]`, X(xs[1]) + r + 6, Y(f.B.h) - r, { color: P.disp, align: 'left', pri: 8, size: 13, weight: 700 });
  } else {
    const xl = X(-side), xr = X(side);
    // dashed guides across from where each hung to its bracket
    for (const [xa, hh, xb] of [[xs[0], f.A.h, xl], [xs[1], f.B.h, xr]]) stroke(g, [{ x: X(xa), y: Y(hh) }, { x: xb, y: Y(hh) }], { color: P.muted, width: 1, alpha: 0.7, dash: [4, 4] });
    dim(xl, oy, Y(f.A.h), T`${sig3(f.A.h)} [m]`, -1);
    dim(xr, oy, Y(f.B.h), T`${sig3(f.B.h)} [m]`, 1);
  }
  if (f.d > 1e-9) {
    const xd = phone ? X(1.1) : X(side * 0.62), lo = Math.min(f.A.h, f.B.h);
    stroke(g, [{ x: X(xs[0]), y: Y(lo) }, { x: xd + 6, y: Y(lo) }], { color: P.mark, width: 1.2, dash: [4, 4] });
    dim(xd, Y(lo), Y(lo + f.d), T`d = ${sig3(f.dCm)} [cm]`, 1, P.mark, 5);
  }
  L.draw(g, w, h);
  return null;
}
