// runway.js — the stage for a take-off: an airfield side on, the runway AB
// along the ground with its threshold stripes, centre line and edge lights,
// a control tower, a hangar and a windsock behind; the jet rolling from A,
// faster and faster, rotating and lifting off at C. AC and BC as brackets,
// the velocity and acceleration (horizontal, so dashed — rule 2), a ring
// where it leaves the ground.
//
// Everything that moves is read from js/core/runway.js (rule 4). The jet is
// drawn larger than its true size beside a kilometre of runway, and says so.

import { pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, sig3, hudBoxes, withAlpha } from './util.js';
import { skyscape, grass, fitSide, env, rng, softShadow } from './scenery.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;

/** A twin-jet airliner side on, nose at (x, y) on its wheels, L px long, nose-up by `pitch` rad. */
function jet(g, x, y, L, pitch = 0) {
  const E = env();
  g.save(); g.translate(x, y); g.rotate(-pitch);
  const H = L * 0.12;
  softShadow(g, -L * 0.5, 2, L * 0.45, L * 0.03, 0.6);
  // the fuselage
  const fg = g.createLinearGradient(0, -H * 1.6, 0, -H * 0.2);
  fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, E.night ? '#9aa2ad' : '#c6ccd4');
  g.fillStyle = fg; g.beginPath();
  g.moveTo(0, -H * 0.9); g.quadraticCurveTo(-L * 0.02, -H * 1.7, -L * 0.1, -H * 1.75);
  g.lineTo(-L * 0.82, -H * 1.75); g.lineTo(-L, -H * 2.9); g.lineTo(-L * 1.0, -H * 1.3); g.lineTo(-L * 0.85, -H * 0.55);
  g.lineTo(-L * 0.1, -H * 0.5); g.quadraticCurveTo(-L * 0.01, -H * 0.55, 0, -H * 0.9); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.stroke();
  // a cheat line and windows
  g.fillStyle = '#2f5d9b'; g.fillRect(-L * 0.82, -H * 1.0, L * 0.74, H * 0.18);
  g.fillStyle = '#1e2a3a'; for (let i = 0; i < 18; i++) g.fillRect(-L * 0.17 - i * L * 0.035, -H * 1.42, L * 0.014, H * 0.22);
  g.fillStyle = '#1e2a3a'; g.beginPath(); g.moveTo(-L * 0.035, -H * 1.35); g.lineTo(-L * 0.075, -H * 1.5); g.lineTo(-L * 0.075, -H * 1.3); g.closePath(); g.fill();
  // the fin, the wing, the engine
  g.fillStyle = '#2f5d9b'; g.beginPath(); g.moveTo(-L * 0.83, -H * 1.75); g.lineTo(-L * 0.97, -H * 3.6); g.lineTo(-L * 1.02, -H * 3.6); g.lineTo(-L * 0.98, -H * 1.6); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#8e96a1' : '#aeb5be'; g.beginPath(); g.moveTo(-L * 0.38, -H * 0.85); g.lineTo(-L * 0.6, -H * 0.5); g.lineTo(-L * 0.46, -H * 0.45); g.closePath(); g.fill();
  const eg = g.createLinearGradient(0, -H * 0.75, 0, -H * 0.05);
  eg.addColorStop(0, '#e5e8ec'); eg.addColorStop(1, '#7c838d');
  g.fillStyle = eg; g.beginPath(); g.ellipse(-L * 0.36, -H * 0.4, L * 0.07, H * 0.33, 0, 0, TAU); g.fill();
  g.fillStyle = '#2b2f36'; g.beginPath(); g.ellipse(-L * 0.29, -H * 0.4, L * 0.012, H * 0.28, 0, 0, TAU); g.fill();
  // the gear
  g.fillStyle = '#2b2f36';
  for (const gx of [-L * 0.12, -L * 0.5]) { g.fillRect(gx - 1, -H * 0.5, 2, H * 0.3); g.beginPath(); g.arc(gx, -H * 0.12, H * 0.13, 0, TAU); g.fill(); }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'runway') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520, E = env(), r = rng(7);
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 4); for (const b of HB) L.reserve(b);

  // ── the frame: the runway along the ground; height only for the scenery
  const len = f.L ?? f.s * 1.15;
  const box = { xLo: -0.13 * len, xHi: len * 1.04, yLo: -0.09 * len, yHi: 0.16 * len };
  const area = { left: phone ? 10 : HB[0].w + 24, right: w - (phone ? 10 : 18), top: phone ? HB[0].h + 8 : 26, bottom: h - 12 };
  // a long, low scene: the ground sits low, the sky and the airfield behind take the height
  const { k, X, Y } = fitSide(box, area, { sky: 0.6 });
  const oy = Y(0), horizon = oy - clamp((oy - area.top) * 0.3, 30, 140);
  skyscape(g, 0, 0, w, horizon, { seed: 111, far: 'hills' });
  grass(g, 0, w, horizon, h, { seed: 51 });

  // the airfield behind: a hangar, the tower, a windsock
  const hx = X(len * 0.62), hw = clamp(k * len * 0.14, 110, 190), hh = hw * 0.45, hy = horizon + (oy - horizon) * 0.35;
  g.fillStyle = E.night ? '#4a4f58' : '#9aa3ad'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx, hy - hh * 0.6); g.quadraticCurveTo(hx + hw / 2, hy - hh * 1.3, hx + hw, hy - hh * 0.6); g.lineTo(hx + hw, hy); g.closePath(); g.fill();
  g.strokeStyle = E.night ? '#3a3f47' : '#7f8892'; g.lineWidth = 1;
  for (let i = 1; i < 8; i++) { const xx = hx + (hw * i) / 8; g.beginPath(); g.moveTo(xx, hy); g.lineTo(xx, hy - hh * 0.6 - Math.sin((i / 8) * Math.PI) * hh * 0.7); g.stroke(); }
  g.fillStyle = E.night ? '#2d3138' : '#5f6873'; g.fillRect(hx + hw * 0.2, hy - hh * 0.5, hw * 0.6, hh * 0.5);
  g.strokeStyle = E.night ? '#4a4f58' : '#8a929c'; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(hx + hw * 0.2 + (hw * 0.6 * i) / 4, hy - hh * 0.5); g.lineTo(hx + hw * 0.2 + (hw * 0.6 * i) / 4, hy); g.stroke(); }
  g.fillStyle = E.night ? '#3a3c41' : '#8b8e93'; g.fillRect(hx - hw * 0.1, hy, hw * 1.2, 4);
  L.reserve({ x: hx, y: hy - hh * 1.3, w: hw, h: hh * 1.3 });
  const tx = X(len * 0.3), th = clamp(hh * 1.8, 50, 110), ty = horizon + (oy - horizon) * 0.4;
  g.fillStyle = E.night ? '#6b6f78' : '#d6d0c6'; g.fillRect(tx - 6, ty - th, 12, th);
  g.fillStyle = E.night ? '#7fd1ff' : '#3c6e8f'; g.beginPath(); g.moveTo(tx - 18, ty - th); g.lineTo(tx + 18, ty - th); g.lineTo(tx + 14, ty - th - 16); g.lineTo(tx - 14, ty - th - 16); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#3a3e46' : '#8e959e'; g.fillRect(tx - 16, ty - th - 20, 32, 4);
  g.strokeStyle = E.night ? '#2a2c31' : '#ffffff'; g.lineWidth = 1; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(tx + i * 9, ty - th); g.lineTo(tx + i * 7, ty - th - 16); g.stroke(); }
  g.strokeStyle = '#555b63'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tx, ty - th - 20); g.lineTo(tx, ty - th - 34); g.stroke();
  g.fillStyle = '#ff4b3a'; g.beginPath(); g.arc(tx, ty - th - 34, 2, 0, TAU); g.fill();
  L.reserve({ x: tx - 18, y: ty - th - 36, w: 36, h: th + 36 });
  const wsx = X(len * (phone ? 0.97 : 0.85)), wsy = horizon + (oy - horizon) * 0.55;
  g.strokeStyle = '#555b63'; g.lineWidth = 2; g.beginPath(); g.moveTo(wsx, wsy); g.lineTo(wsx, wsy - 34); g.stroke();
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff6a2b'; g.beginPath(); g.moveTo(wsx + i * 7, wsy - 34 + i * 0.6); g.lineTo(wsx + (i + 1) * 7, wsy - 33 + (i + 1) * 0.8); g.lineTo(wsx + (i + 1) * 7, wsy - 27 - (i + 1) * 0.4); g.lineTo(wsx + i * 7, wsy - 27); g.closePath(); g.fill(); }

  // the runway: a tarmac band from A to B, threshold stripes, centre line, edge lights
  const rw = clamp(k * 30, 14, 26), ry0 = oy - rw * 0.55;
  const rg = g.createLinearGradient(0, ry0, 0, oy + rw * 0.45);
  rg.addColorStop(0, E.night ? '#2a2c31' : '#4f5258'); rg.addColorStop(1, E.night ? '#1d1f23' : '#3a3c41');
  g.fillStyle = rg; g.fillRect(X(0) - 8, ry0, X(len) - X(0) + 16, rw);
  g.fillStyle = '#e9e9e4';
  for (const end of [X(0), X(len) - 26]) for (let i = 0; i < 5; i++) g.fillRect(end + 2, ry0 + 2 + i * (rw - 4) / 5, 22, (rw - 4) / 5 - 2);
  for (let x = X(0) + 40; x < X(len) - 40; x += 34) g.fillRect(x, oy - 1, 16, 2);
  for (let x = X(0); x <= X(len); x += 26) { g.fillStyle = r() < 0.5 ? '#ffe9a6' : '#ffffff'; g.beginPath(); g.arc(x, ry0 - 1, 1.6, 0, TAU); g.fill(); g.beginPath(); g.arc(x, oy + rw * 0.45 + 1, 1.6, 0, TAU); g.fill(); }

  // ── the jet: rolling, then rotating and lifting off at C
  const x = f.pos(t).x, v = f.vel(t).x, jl = clamp(k * 40, phone ? 70 : 110, 150);
  const rot = clamp((t - f.tMax * 0.92) / (f.tMax * 0.08), 0, 1);
  jet(g, X(x), oy - rot * rot * jl * 0.12, jl, rot * 0.16);
  { const { age, life } = ageOf(t, f.tMax, f.tMax); pulse(g, X(f.s), oy - 6, age, life, P.mark, { radius: 30 }); }
  L.reserve({ x: X(x) - jl, y: oy - jl * 0.45, w: jl, h: jl * 0.45 });
  if (show.velocity !== false) {
    const vl = clamp((v / f.v) * 90, 12, 90), ay = oy - jl * 0.32;
    arrow(g, X(x) + 8, ay, X(x) + 8 + vl, ay, { color: P.vel, width: 2.6, head: 10, dash: [6, 4] });
    L.add(T`${sig3(v)} [m s^-1]`, X(x) + 14 + vl, ay, { color: P.vel, align: 'left', pri: 8, size: 13, weight: 700 });
  }
  if (t < f.tMax - 1e-9) {
    const al = 40, ay = oy - jl * 0.32 - 18;
    arrow(g, X(x) + 8, ay, X(x) + 8 + al, ay, { color: P.acc, width: 2.2, head: 9, dash: [5, 4] });
    L.add(T`${sig3(f.a)} [m s^-2]`, X(x) + 14 + al, ay, { color: P.acc, align: 'left', pri: 7, size: 13, weight: 700 });
  }

  // ── A, C, B and the two lengths
  const by = oy + rw * 0.45 + 16;
  for (const [xx, name] of [[0, 'A'], [f.s, 'C'], ...(f.L ? [[f.L, 'B']] : [])]) {
    stroke(g, [{ x: X(xx), y: by - 6 }, { x: X(xx), y: by + 6 }], { color: P.ink, width: 1.4 });
    L.add(name, X(xx), by + 16, { color: P.ink, align: 'center', pri: 10, size: 15, weight: 700, maxPush: 0 });
  }
  stroke(g, [{ x: X(0), y: by }, { x: X(f.s), y: by }], { color: P.disp, width: 2 });
  L.add(T`AC = ${sig3(f.s)} [m]`, (X(0) + X(f.s)) / 2, by + 36, { color: P.disp, align: 'center', pri: 9, size: 14, weight: 700 });
  if (f.L) {
    stroke(g, [{ x: X(f.s), y: by }, { x: X(f.L), y: by }], { color: P.muted, width: 2, dash: [6, 4] });
    L.add(T`BC = ${sig3(f.left)} [m]`, (X(f.s) + X(f.L)) / 2, by + 36, { color: P.ink, align: 'center', pri: 9, size: 14, weight: 700 });
  }
  if (t >= f.tMax - 1e-9) L.add(T`"lift-off," t = ${sig3(f.t)} [s]`, X(f.s), oy - jl * 0.6 - 14, { color: P.mark, align: 'center', pri: 9, size: 14, weight: 700 });
  L.add('the jet drawn larger than life', area.right, area.top + 10, { color: P.muted, align: 'right', pri: 2, size: 13 });
  L.draw(g, w, h);
  return null;
}
