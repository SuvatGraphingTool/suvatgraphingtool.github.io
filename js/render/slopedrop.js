// slopedrop.js — the stage for a particle sent down a smooth slope while
// another falls from a point level with its start: a physics lab, side on.
//
// The plane is a long polished aluminium track on a timber trestle, from X at
// its top down to the floor; a spring launcher at X sends the glider P (a
// small red rider on the track) down it. Y is level with X out over the
// track: a clamp stand on the floor holds an electromagnet there, and the
// steel ball Q hangs under it until the clock starts, when the coil lets go
// (its lamp goes out). X and Y are joined by a faint level line; the angle θ
// is marked at X between it and the track. P's run is drawn in the
// displacement hue along the track, Q's fall in the second object's stone,
// straight down. Where they meet, at C on the track below Y, the two collide:
// a flash, a ring, the time T, and each one's speed on its arrow.
//
// Everything drawn is read from js/core/slopedrop.js (rule 4).

import { fitSide, softShadow, env } from './scenery.js';
import { labWall } from './bench.js';
import { pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha, unview, cssVar, hudBoxes } from './util.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const tr = (x) => num(x, Math.abs(x) < 1 ? 3 : 2, { trim: true });

/** An electromagnet in a clamp's jaws, its coil wound in copper, a pilot lamp
    lit while it holds; at (x, y) its pole face, s px across. */
function electromagnet(g, x, y, s, on) {
  const E = env();
  g.save();
  // the core and its windings
  const cg = g.createLinearGradient(x - s / 2, 0, x + s / 2, 0);
  cg.addColorStop(0, '#b06a2c'); cg.addColorStop(0.5, '#e09a50'); cg.addColorStop(1, '#8a4e1e');
  g.fillStyle = cg; g.beginPath(); g.roundRect(x - s / 2, y - s * 1.2, s, s * 1.05, s * 0.12); g.fill();
  g.strokeStyle = withAlpha('#5a2e10', 0.6); g.lineWidth = 1;
  for (let i = 1; i < 7; i++) { const yy = y - s * 1.2 + (s * 1.05 * i) / 7; g.beginPath(); g.moveTo(x - s / 2, yy); g.lineTo(x + s / 2, yy); g.stroke(); }
  // the pole face, steel, under it
  g.fillStyle = '#9aa0a8'; g.fillRect(x - s * 0.22, y - s * 0.16, s * 0.44, s * 0.16);
  // its leads, red and black, curling away to the power pack
  for (const [col, dx] of [['#c0392b', -0.18], ['#222', 0.18]]) {
    g.strokeStyle = col; g.lineWidth = Math.max(1.5, s * 0.07); g.beginPath();
    g.moveTo(x + s * dx, y - s * 1.2); g.bezierCurveTo(x + s * dx, y - s * 2, x + s * (1.2 + dx), y - s * 1.6, x + s * (1.6 + dx * 2), y - s * 2.4); g.stroke();
  }
  // the pilot lamp: lit while it holds the ball
  g.fillStyle = on ? '#ff5a3c' : (E.night ? '#3a2a28' : '#6a4a44');
  g.beginPath(); g.arc(x + s * 0.32, y - s * 0.95, Math.max(2, s * 0.09), 0, TAU); g.fill();
  if (on) { const lg = g.createRadialGradient(x + s * 0.32, y - s * 0.95, 0, x + s * 0.32, y - s * 0.95, s * 0.5); lg.addColorStop(0, 'rgba(255,90,60,0.5)'); lg.addColorStop(1, 'rgba(255,90,60,0)'); g.fillStyle = lg; g.beginPath(); g.arc(x + s * 0.32, y - s * 0.95, s * 0.5, 0, TAU); g.fill(); }
  g.restore();
}

/** A steel ball, shaded, at (x, y), radius r. */
function steelBall(g, x, y, r) {
  const bg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.35, '#c9ced6'); bg.addColorStop(1, '#5a6068');
  g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
}

/** The glider on the track, its base along the track at (x, y), heading down
    it at angle a (radians, screen, clockwise), L px long: a red rider with a
    card flag on top, as a light gate would read. */
function glider(g, x, y, a, L) {
  g.save(); g.translate(x, y); g.rotate(a);
  const H = L * 0.42;
  const rg = g.createLinearGradient(0, -H, 0, 0); rg.addColorStop(0, '#6f9fd8'); rg.addColorStop(1, '#2c5a92');
  g.fillStyle = rg; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(-L / 2 + H * 0.5, -H); g.lineTo(L / 2 - H * 0.5, -H); g.lineTo(L / 2, 0); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-L / 2 + H * 0.55, -H + 1.5, L - H * 1.1, 2);
  // the card flag
  g.fillStyle = '#f2efe6'; g.fillRect(-L * 0.08, -H - L * 0.32, L * 0.16, L * 0.32);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.strokeRect(-L * 0.08, -H - L * 0.32, L * 0.16, L * 0.32);
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'slopedrop') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HUD = hudBoxes(w, phone ? 2 : 4);
  for (const b of HUD) L.reserve(b);
  const sn = Math.sin((f.theta * Math.PI) / 180), cs = Math.cos((f.theta * Math.PI) / 180);

  // ── the frame: the track from a little above X to the floor below C, and Y's stand
  const run = f.sP * 1.35;                                  // the track runs on past C
  const foot = { x: run * cs, y: -run * sn };
  const box = { xLo: -0.12 * f.sP, xHi: Math.max(foot.x, f.XY) + 0.12 * f.sP, yLo: foot.y - 0.04 * f.sP, yHi: 0.24 * f.sP };
  const floorBand = phone ? 30 : 40;
  const area = { left: phone ? 18 : 60, right: w - (phone ? 18 : 40), top: phone ? 150 : 100, bottom: h - floorBand };
  const F = fitSide(box, area, { sky: 0.15 });
  const { X, Y, k } = F;
  const floorY = Y(foot.y);
  const px = (p) => ({ x: X(p.x), y: Y(p.y) });

  // ── the lab
  labWall(g, w, floorY, h, { extinguisher: w - 34 > X(f.XY) + 120 ? w - 34 : null });
  // the floor: lino, lit from the left
  const fg = g.createLinearGradient(0, floorY, 0, h); fg.addColorStop(0, E.night ? '#3a3a40' : '#b9b5a8'); fg.addColorStop(1, E.night ? '#2a2a2e' : '#9e9a8e');
  g.fillStyle = fg; g.fillRect(0, floorY, w, h - floorY);
  // lino tiles: joints running away from us in perspective, and across
  g.strokeStyle = E.night ? 'rgba(0,0,0,0.35)' : 'rgba(80,74,64,0.25)'; g.lineWidth = 1;
  for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(w / 2 + i * 70, floorY); g.lineTo(w / 2 + i * 150, h); g.stroke(); }
  for (let y = floorY + 10, k2 = 10; y < h; k2 *= 1.5, y += k2) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, floorY, w, 2);

  // ── the track on its trestle: polished aluminium from above X down to the floor
  const top = { x: -0.12 * f.sP * cs, y: 0.12 * f.sP * sn };
  const A = px(top), B = px(foot);
  const ang = Math.atan2(B.y - A.y, B.x - A.x);
  // the trestle: timber legs under the track, braced, standing on the floor
  const wood = E.night ? '#6a5040' : '#a07a52', woodLo = E.night ? '#4a3830' : '#6e5236';
  for (const fr of [0.08, 0.38, 0.68]) {
    const q = { x: A.x + (B.x - A.x) * fr, y: A.y + (B.y - A.y) * fr };
    if (floorY - q.y < 12) continue;
    g.fillStyle = woodLo; g.fillRect(q.x - 4, q.y + 6, 8, floorY - q.y - 6);
    g.fillStyle = wood; g.fillRect(q.x - 3, q.y + 6, 4, floorY - q.y - 6);
    softShadow(g, q.x, floorY + 1, 14, 3, 0.6);
  }
  g.strokeStyle = woodLo; g.lineWidth = 3;
  g.beginPath(); g.moveTo(A.x + (B.x - A.x) * 0.08, floorY - 6); g.lineTo(A.x + (B.x - A.x) * 0.38, A.y + (B.y - A.y) * 0.38 + 10); g.stroke();
  // the track: a thick shiny bar, its top edge lit
  const thick = clamp(k * 0.06, 6, 12);
  g.save(); g.translate(A.x, A.y); g.rotate(ang);
  const len = Math.hypot(B.x - A.x, B.y - A.y);
  const tg = g.createLinearGradient(0, 0, 0, thick); tg.addColorStop(0, '#f3f5f8'); tg.addColorStop(0.4, '#b8bec6'); tg.addColorStop(1, '#6e757e');
  g.fillStyle = tg; g.fillRect(0, 0, len, thick);
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(0, 0, len, 1.2);
  // the beam's lower, shaded face (it is triangular in section), its rows of air holes, the end stops
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.moveTo(0, thick); g.lineTo(len, thick); g.lineTo(len - 4, thick * 1.7); g.lineTo(4, thick * 1.7); g.closePath(); g.fill();
  g.fillStyle = 'rgba(30,34,40,0.55)'; for (let x = 14; x < len - 10; x += 11) { g.beginPath(); g.arc(x, thick * 0.35, 1.1, 0, TAU); g.fill(); g.beginPath(); g.arc(x + 5, thick * 0.7, 1.1, 0, TAU); g.fill(); }
  for (const ex of [2, len - 8]) { g.fillStyle = '#3a3e46'; g.fillRect(ex, -thick * 0.9, 6, thick * 1.9); }
  g.restore();
  // the blower's hose, from the track's upper end down to the blower on the floor
  { const hx = A.x + 10, hy = A.y + thick, bx = Math.max(16, A.x - 40);
    g.strokeStyle = E.night ? '#2a2c30' : '#3a3d42'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx, hy); g.bezierCurveTo(hx - 10, hy + 60, bx + 30, floorY - 30, bx + 14, floorY - 16); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = E.night ? '#2e4a6a' : '#3a6aa8'; g.beginPath(); g.roundRect(bx - 4, floorY - 30, 36, 30, 4); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 4; i++) g.fillRect(bx + 2 + i * 7, floorY - 24, 3, 16);
    softShadow(g, bx + 14, floorY + 1, 22, 3, 0.6); }
  softShadow(g, (A.x + B.x) / 2, floorY + 2, len * 0.45, 5, 0.5);
  // the spring launcher at X: a block at the top of the track, its plunger and spring
  const Xp = px({ x: 0, y: 0 });
  const nU = { x: Math.sin(ang), y: -Math.cos(ang) };      // off the track's surface, up
  g.save(); g.translate(Xp.x, Xp.y); g.rotate(ang);
  const bL = clamp(k * 0.12, 14, 26);
  g.fillStyle = E.night ? '#3a3e46' : '#4a505a'; g.fillRect(-bL * 2.2, -bL * 0.9, bL * 0.9, bL * 0.9);
  const coil = t > 0 ? bL * 1.0 : bL * 0.55;
  g.strokeStyle = '#c9ced6'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-bL * 1.3, -bL * 0.45);
  for (let i = 1; i <= 8; i++) g.lineTo(-bL * 1.3 + (coil * i) / 8, -bL * 0.45 + (i % 2 ? -bL * 0.2 : bL * 0.2));
  g.stroke();
  g.restore();

  // ── the stand at Y: a heavy base on the floor, the rod up past Y, the boss and arm, the magnet
  const Yp = px({ x: f.XY, y: 0 }), Cp = px(f.posQ(f.T));
  const rodX = Yp.x + clamp(k * 0.35, 40, 90);
  g.fillStyle = E.night ? '#2e3036' : '#3c4048'; g.beginPath(); g.roundRect(rodX - 34, floorY - 8, 68, 10, 3); g.fill();
  softShadow(g, rodX, floorY + 2, 38, 4, 0.7);
  const rodTop = Yp.y - clamp(k * 0.35, 36, 70);
  g.fillStyle = '#a9b0b8'; g.fillRect(rodX - 2.5, rodTop, 5, floorY - rodTop - 8);
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(rodX - 2.5, rodTop, 1.5, floorY - rodTop - 8);
  const rb = clamp(k * 0.05, 7, 12), ms = clamp(k * 0.1, 18, 28), magY = Yp.y - rb;
  g.fillStyle = '#5a5f68'; g.fillRect(rodX - 7, magY - ms * 1.0, 14, 14);
  g.strokeStyle = '#7a808a'; g.lineWidth = 4; g.beginPath(); g.moveTo(rodX, magY - ms * 0.95 + 7); g.lineTo(Yp.x, magY - ms * 0.95 + 7); g.stroke();
  electromagnet(g, Yp.x, magY, ms, !(fired && t > 0));
  // the power pack on the floor by the stand, its leads up to the magnet
  { const px0 = Math.max(rodX + 46, B.x + 24), pw = 54, ph = 34;
    for (const [col, dx] of [['#c0392b', -4], ['#222', 4]]) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(Yp.x + dx, magY - ms * 1.25); g.bezierCurveTo(Yp.x + dx + 30, magY - ms * 2.6, px0 + 10 + dx, floorY - ph - 60, px0 + 14 + dx, floorY - ph + 6); g.stroke(); }
    g.fillStyle = E.night ? '#3a3e46' : '#d8dade'; g.beginPath(); g.roundRect(px0, floorY - ph, pw, ph, 4); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#c0392b'; g.beginPath(); g.arc(px0 + 10, floorY - ph + 8, 3, 0, TAU); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(px0 + 18, floorY - ph + 8, 3, 0, TAU); g.fill();
    g.fillStyle = '#5a5f68'; g.beginPath(); g.arc(px0 + 38, floorY - ph * 0.45, 7, 0, TAU); g.fill();
    softShadow(g, px0 + pw / 2, floorY + 1, pw * 0.6, 3, 0.6); }

  // ── the level through X and Y, and the angle at X
  g.save(); g.setLineDash([2, 5]); g.lineCap = 'round';
  stroke(g, [Xp, { x: Yp.x, y: Xp.y }], { color: P.muted, width: 1.4, alpha: 0.9 });
  g.restore();
  const ar = clamp(k * 0.35, 28, 60);
  g.strokeStyle = P.ink; g.lineWidth = 1.4; g.beginPath(); g.arc(Xp.x, Xp.y, ar, 0, ang); g.stroke();
  L.add(T`theta = ${tr(f.theta)}°`, Xp.x + (ar + 30) * Math.cos(ang / 2), Xp.y + (ar + 14) * Math.sin(ang / 2), { color: P.ink, size: 14, weight: 700 });
  L.add('X', Xp.x - 16, Xp.y - 18, { color: P.ink, size: 16, weight: 800 });
  L.add('Y', Yp.x - 22, Yp.y - 6, { color: P.ink, size: 16, weight: 800 });
  // the point below Y where they meet, marked on the track before they get there
  g.strokeStyle = withAlpha(P.mark, 0.7); g.lineWidth = 1.5; g.beginPath(); g.moveTo(Cp.x - 6, Cp.y + 6 * Math.tan(ang) - 6); g.lineTo(Cp.x + 6, Cp.y - 6); g.stroke();
  L.add('C', Cp.x - 34, Cp.y + 30, { color: P.ink, size: 15, weight: 800 });

  // ── each one's path: P's run down the track, Q's fall, faint in full and strong to now
  const nn = 60, runP = [], fallQ = [], nowP = [], nowQ = [];
  for (let i = 0; i <= nn; i++) {
    const tt = (i / nn) * f.T, ti = (i / nn) * t;
    const a = f.posP(tt), b = f.posQ(tt), c = f.posP(ti), q = f.posQ(ti);
    runP.push({ x: X(a.x) + nU.x * thick * 0.2, y: Y(a.y) + nU.y * 3 - 3 }); fallQ.push(px(b));
    nowP.push({ x: X(c.x), y: Y(c.y) - 3 }); nowQ.push(px(q));
  }
  stroke(g, runP, { color: P.disp, width: 1.6, alpha: 0.4 });
  stroke(g, fallQ, { color: P.second, width: 1.6, alpha: 0.5 });
  stroke(g, nowP, { color: P.disp, width: 3 });
  stroke(g, nowQ, { color: P.second, width: 3 });

  // ── they meet: a flash and a ring at C, with T
  if (fired && t >= f.T - 1e-9) {
    const { age, life } = ageOf(t, f.T, f.tMax);
    pulse(g, Cp.x, Cp.y, Math.max(age, 0.001), Math.max(life, 0.6), P.mark, { radius: 46 });
    const fl = g.createRadialGradient(Cp.x, Cp.y, 0, Cp.x, Cp.y, 30);
    fl.addColorStop(0, 'rgba(255,255,230,0.85)'); fl.addColorStop(1, 'rgba(255,255,230,0)');
    g.fillStyle = fl; g.beginPath(); g.arc(Cp.x, Cp.y, 30, 0, TAU); g.fill();
    dot(g, Cp.x, Cp.y, 5, { fill: P.mark, stroke: cssVar('--surface', '#131210'), width: 2 });
    L.add(T`"they meet," T = ${tr(f.T)} [s]`, Cp.x - 60, Cp.y - 70, { color: P.mark, size: 14, weight: 700, align: 'right' });
  }

  // ── the two of them now (over the flash, so both are seen meeting)
  const pP = px(f.posP(t)), pQ = px(f.posQ(t));
  const gl = clamp(k * 0.2, 34, 56);
  glider(g, pP.x, pP.y - 1, ang, gl);
  steelBall(g, pQ.x, pQ.y, rb);
  // each one's velocity, on its arrow, while they move
  if (fired && t > 1e-9) {
    const vs = clamp(k * 0.3, 44, 120) / Math.max(f.vP, f.vQ, 1e-9);
    const lp = f.velP(t) * vs, lq = f.velQ(t) * vs;
    const pc = { x: pP.x + nU.x * gl * 0.6, y: pP.y + nU.y * gl * 0.6 };
    arrow(g, pc.x, pc.y, pc.x + Math.cos(ang) * lp, pc.y + Math.sin(ang) * lp, { color: P.vel, width: 2.4, head: 9 });
    arrow(g, pQ.x - rb - 8, pQ.y, pQ.x - rb - 8, pQ.y + lq, { color: P.vel, width: 2.4, head: 9 });
    L.add(T`${tr(f.velP(t))} [m s^-1]`, pc.x + Math.cos(ang) * lp * 0.5 + nU.x * 22, pc.y + Math.sin(ang) * lp * 0.5 + nU.y * 22, { color: P.vel, size: 13, weight: 700 });
    L.add(T`${tr(f.velQ(t))} [m s^-1]`, pQ.x - rb - 16, pQ.y + lq * 0.5, { color: P.vel, size: 13, weight: 700, align: 'right' });
  }
  L.add('P', pP.x - nU.x * -1 * 0 + nU.x * (gl * 1.1), pP.y + nU.y * (gl * 1.1), { color: P.disp, size: 15, weight: 800 });
  L.add('Q', pQ.x + rb + 14, pQ.y - 4, { color: P.second, size: 15, weight: 800 });

  L.draw(g, w, h);
  unview(g);
  return null;
}
