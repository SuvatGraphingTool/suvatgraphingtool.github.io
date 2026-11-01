// rocket.js — the stage for a firework rocket: a field at dusk, side on at one
// scale; the launch frame on the grass; the rocket climbing on its flame with
// sparks streaming behind while it is driven, then coasting on a thin smoke
// trail after it burns out; a burst of stars at the top; the spent stick
// falling back. The burn-out height marked across, the height as a bracket,
// the velocity and the acceleration (vertical, so solid — rule 2), the
// moment the paper asks about ringed.
//
// Everything that moves is read from js/core/rocket.js (rule 4).

import { pulse, flash, dust, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, sig3, hudBoxes, withAlpha } from './util.js';
import { skyscape, grass, fitSide, env, rng, softShadow } from './scenery.js';
import { nearGrass, parkTree } from './towards.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;

/** The rocket, nose up at (x, y): a paper tube with a cone, its stick below. */
function rocket(g, x, y, s) {
  const E = env();
  g.save();
  g.strokeStyle = E.night ? '#b89a6a' : '#8a6a40'; g.lineWidth = Math.max(1.5, s * 0.08);
  g.beginPath(); g.moveTo(x + s * 0.12, y + s * 0.2); g.lineTo(x + s * 0.12, y + s * 1.9); g.stroke();
  const bg = g.createLinearGradient(x - s * 0.18, 0, x + s * 0.18, 0);
  bg.addColorStop(0, '#f26d5b'); bg.addColorStop(0.5, '#c8323a'); bg.addColorStop(1, '#7d1a22');
  g.fillStyle = bg; g.fillRect(x - s * 0.16, y - s * 0.5, s * 0.32, s * 0.75);
  g.fillStyle = '#f2d06b'; g.fillRect(x - s * 0.16, y - s * 0.2, s * 0.32, s * 0.1);
  g.fillStyle = '#e8e2d6'; g.beginPath(); g.moveTo(x - s * 0.18, y - s * 0.5); g.lineTo(x, y - s * 0.85); g.lineTo(x + s * 0.18, y - s * 0.5); g.closePath(); g.fill();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'rocket') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520, E = env();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 4); for (const b of HB) L.reserve(b);

  // ── the frame: straight up from the launch, to above the burst
  const box = { xLo: -0.35 * f.Htop, xHi: 0.35 * f.Htop, yLo: -0.08 * f.Htop, yHi: f.Htop * 1.18 };
  const area = { left: HB[0].w + (phone ? 8 : 24), right: w - (phone ? 8 : 18), top: phone ? HB[1].h + 8 : 24, bottom: h - 12 };
  const { k, X, Y } = fitSide(box, area, { sky: 0.5 });
  const oy = Y(0), horizon = oy - clamp((oy - Y(f.Htop)) * 0.18, 20, 70);
  skyscape(g, 0, 0, w, horizon, { seed: 101, far: 'trees', sun: false });
  // dusk falling over the sky, so the sparks show
  const dk = g.createLinearGradient(0, 0, 0, horizon);
  dk.addColorStop(0, withAlpha('#0b1030', E.night ? 0.55 : 0.35)); dk.addColorStop(1, withAlpha('#0b1030', 0));
  g.fillStyle = dk; g.fillRect(0, 0, w, horizon);
  { const rs0 = rng(3); for (let i = 0; i < 60; i++) { g.fillStyle = withAlpha('#ffffff', 0.25 + rs0() * 0.5); g.beginPath(); g.arc(rs0() * w, rs0() * horizon * 0.7, 0.6 + rs0() * 0.9, 0, TAU); g.fill(); } }
  grass(g, 0, w, horizon, h, { seed: 41 });
  for (const [xx, sd] of [[X(box.xLo) - 20, 3], [X(box.xHi) + 30, 7]]) parkTree(g, xx, horizon + (oy - horizon) * 0.4, clamp(k * 8, 60, 150), sd);
  nearGrass(g, 0, w, oy, h, 29);

  // the launch frame: a wooden stake and a tube
  const lx = X(0), fs = clamp(k * 1.2, 18, 40);
  softShadow(g, lx, oy + 1, fs * 0.6, fs * 0.12, 0.7);
  // a launch rack: a sandbagged base, a stake, a steel tube with a lip
  g.fillStyle = E.night ? '#6b5e4c' : '#a8956f';
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(lx + i * fs * 0.32, oy - fs * 0.12, fs * 0.2, fs * 0.13, 0, 0, TAU); g.fill(); }
  g.fillStyle = E.night ? '#5b4636' : '#7a5c43'; g.fillRect(lx + fs * 0.3, oy - fs * 1.6, fs * 0.12, fs * 1.6);
  const tg = g.createLinearGradient(lx - fs * 0.15, 0, lx + fs * 0.15, 0); tg.addColorStop(0, '#c9ced6'); tg.addColorStop(1, '#5f656d');
  g.fillStyle = tg; g.fillRect(lx - fs * 0.15, oy - fs * 1.2, fs * 0.3, fs * 1.1);
  g.fillStyle = '#3c4048'; g.fillRect(lx - fs * 0.19, oy - fs * 1.24, fs * 0.38, fs * 0.08);

  // ── the path so far: sparks while driven, smoke after
  const y = f.pos(t).y, v = f.vel(t).y, a = f.accel(t);
  const ry = Y(y), rs = clamp(k * 1.4, 24, 40), r = rng(17 + Math.floor(t * 30));
  const yb = Math.min(y, f.s1);
  if (t > 0) {
    stroke(g, [{ x: lx, y: oy }, { x: lx, y: Y(yb) }], { color: '#ffd27a', width: 2.2, alpha: 0.55 });
    // the smoke trail from burn-out up to the highest it has been
    if (t > f.T) stroke(g, [{ x: lx, y: Y(f.s1) }, { x: lx, y: Y(t >= f.tTop ? f.Htop : y) }], { color: E.night ? '#9aa0aa' : '#7c828c', width: 3, alpha: 0.35 });
  }
  if (t > 0 && t < f.T) {
    // the flame and the sparks streaming from it
    const fg = g.createRadialGradient(lx, ry + rs * 0.4, 0, lx, ry + rs * 0.4, rs * 1.3);
    fg.addColorStop(0, 'rgba(255,240,180,0.95)'); fg.addColorStop(0.4, 'rgba(255,170,60,0.7)'); fg.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = fg; g.beginPath(); g.ellipse(lx, ry + rs * 0.9, rs * 0.35, rs * 1.2, 0, 0, TAU); g.fill();
    for (let i = 0; i < 26; i++) { const dy = r() * rs * 4, dx = (r() - 0.5) * rs * (0.4 + dy / rs * 0.3); g.fillStyle = `rgba(255,${180 + Math.floor(r() * 60)},90,${0.9 - dy / (rs * 4.5)})`; g.beginPath(); g.arc(lx + dx, ry + rs * 0.6 + dy, 1.4 + r() * 1.4, 0, TAU); g.fill(); }
  }
  // burn-out: a puff where the flame stops
  { const { age, life } = ageOf(t, f.T, f.tMax, f.tMax / 8); pulse(g, lx, Y(f.s1), age, life, '#ffd27a', { radius: 24 }); }
  // the burst at the top: stars thrown out and falling, fading
  { const { age, life } = ageOf(t, f.tTop, f.tMax, Math.min(1.8, (f.tMax - f.tTop) * 0.8));
    if (age >= 0 && age <= life) {
      const u = age / life, R = clamp(k * 9, 70, 170) * (1 - (1 - u) ** 2), cy = Y(f.Htop), rb = rng(5);
      flash(g, lx, cy, age, life * 0.35, { radius: 40 });
      const cols = ['#ff6b6b', '#ffd93d', '#6bcbff', '#c77dff', '#7dff9a'];
      for (const [shell, n, sz] of [[1, 56, 3.2], [0.62, 36, 2.6], [0.32, 20, 2.2]]) for (let i = 0; i < n; i++) {
        const an = (i / n) * TAU + rb() * 0.12, rr = R * shell * (0.85 + rb() * 0.25), sag = u * u * 40 * shell;
        const sx = lx + Math.cos(an) * rr, sy = cy + Math.sin(an) * rr + sag, c = cols[(i + Math.round(shell * 10)) % cols.length];
        g.strokeStyle = withAlpha(c, 0.5 * (1 - u)); g.lineWidth = sz * 0.6; g.beginPath(); g.moveTo(lx + Math.cos(an) * rr * 0.7, cy + Math.sin(an) * rr * 0.7 + sag * 0.6); g.lineTo(sx, sy); g.stroke();
        g.fillStyle = withAlpha(c, 1 - u); g.beginPath(); g.arc(sx, sy, sz, 0, TAU); g.fill();
      }
    } }
  // the landing of the spent stick
  { const { age, life } = ageOf(t, f.tLand, f.tMax, f.tMax / 8); dust(g, lx, oy, age, life, { size: 1.2 }); }
  if (t < f.tTop) rocket(g, lx, ry - rs * 0.3, rs);
  else { g.strokeStyle = E.night ? '#b89a6a' : '#8a6a40'; g.lineWidth = Math.max(1.5, rs * 0.08); g.beginPath(); g.moveTo(lx - rs * 0.3, ry - rs * 0.6); g.lineTo(lx + rs * 0.3, ry + rs * 0.9); g.stroke(); }

  // ── the burn-out height across, the height as a bracket
  stroke(g, [{ x: X(box.xLo) + 10, y: Y(f.s1) }, { x: X(box.xHi) - 10, y: Y(f.s1) }], { color: P.muted, width: 1, alpha: 0.7, dash: [4, 4] });
  L.add(T`"burn-out," ${sig3(f.s1)} [m], t = ${num(f.T, 2, { trim: true })} [s]`, phone ? X(box.xHi) - 12 : X(box.xLo) + 12, Y(f.s1) - 12, { color: P.muted, align: phone ? 'right' : 'left', pri: 10, size: 13, weight: 700, maxPush: 20 });
  const bx = lx + Math.max(60, k * 3);
  stroke(g, [{ x: bx, y: oy }, { x: bx, y: ry }], { color: P.disp, width: 2 });
  for (const yy of [oy, ry]) stroke(g, [{ x: bx - 6, y: yy }, { x: bx + 6, y: yy }], { color: P.disp, width: 2 });
  L.reserve({ x: bx - 8, y: ry, w: 16, h: oy - ry });
  L.add(T`h = ${sig3(y)} [m]`, bx + 18, (oy + ry) / 2, { color: P.disp, align: 'left', pri: 9, size: 14, weight: 700 });
  L.reserve({ x: lx - rs, y: ry - rs, w: rs * 2, h: rs * 2.6 });
  if (show.velocity !== false && Math.abs(v) > 1e-6 && t < f.tMax - 1e-9) {
    const len = Math.max(clamp(Math.abs(v) * k * 0.25, 16, 110) * Math.sign(v), -(h - 14 - ry)), ax = lx - rs - 10;
    arrow(g, ax, ry, ax, ry - len, { color: P.vel, width: 2.6, head: 10 });
    L.add(T`${sig3(v)} [m s^-1]`, ax - 12, ry - len * 0.6, { color: P.vel, align: 'right', pri: 8, size: 13, weight: 700 });
  }
  if (t > 0 && t < f.tMax - 1e-9) {
    const len = clamp(Math.abs(a) * k * 0.6, 14, 60) * Math.sign(a), ax = lx + rs + 12;
    arrow(g, ax, ry, ax, ry - len, { color: P.acc, width: 2.4, head: 9 });
    L.add(T`${sig3(a)} [m s^-2]`, ax + 10, ry - len * 0.6, { color: P.acc, align: 'left', pri: 7, size: 13, weight: 700 });
  }
  // the moment the paper asks about
  if (f.at && t >= f.at.t - 1e-9) {
    const { age, life } = ageOf(t, f.at.t, f.tMax);
    pulse(g, lx, Y(f.at.y), age, life, P.mark, { radius: 26 });
    stroke(g, [{ x: lx - 30, y: Y(f.at.y) }, { x: lx + 30, y: Y(f.at.y) }], { color: P.mark, width: 1.4 });
    L.add(T`t = ${num(f.at.t, 2, { trim: true })} [s], h = ${sig3(f.at.y)} [m]`, phone ? w - 10 : X(box.xLo) + 12, Y(f.at.y) - 12, { color: P.mark, align: phone ? 'right' : 'left', pri: 9, size: 14, weight: 700 });
  }
  L.draw(g, w, h);
  return null;
}
