// sink.js — the stage for a ball projected straight up from A, over a field,
// that comes down into soft ground and sinks into it: side on, to scale, the
// field cut away at the front so the soil shows beneath the grass.
//
// A is the thrower's hand — on the ground when a hand can reach that high, on
// top of a tower when it is higher. The greatest height is marked across; a
// height the paper asks about too, ringed when the ball passes it. Where it
// lands, a splash of mud.
//
// What happens in the ground is far too small and far too quick to see at
// the flight's scale — centimetres, in thousandths of a second. So a round
// magnifier, fixed to the screen, shows the soil there enlarged; when the ball
// has stopped it replays the sink slowed down (the engine says how much), with
// the forces on the ball in the ground and the depth it reaches.
//
// Everything drawn is read from js/core/sink.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, unview, stroke, dot, ballSprite } from './util.js';
import { fitSide, env, rng, softShadow } from './scenery.js';
import { thrower, throwerHand, THROWER_MIN, tree } from './figures.js';
import { fields, tower } from './heights.js';
import { pulse, ageOf } from './effects.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const s3 = (x) => num(x, Math.abs(x) < 1 ? 3 : Math.abs(x) < 10 ? 2 : 1, { trim: true });
// three significant figures, as the papers give a force or an acceleration
const sf = (x) => num(Number(x.toPrecision(3)), 4, { trim: true });
const ease = (u) => 1 - (1 - u) * (1 - u);

/** Mud thrown up where it lands: round clods flying out and falling back, and a dark
    splash on the surface. `u` runs 0 → 1 over the effect; the clods are seeded. */
function mudSplash(g, x, y, u, size, seed = 5) {
  if (!(u >= 0 && u <= 1)) return;
  const r = rng(seed), E = env();
  g.save();
  g.fillStyle = withAlpha(E.night ? '#2a1d15' : '#4a3020', 0.75 * (1 - u * 0.5));
  g.beginPath(); g.ellipse(x, y + 1, 16 * size * ease(Math.min(1, u * 4)), 4 * size, 0, 0, TAU); g.fill();
  for (let i = 0; i < 11; i++) {
    const ang = Math.PI * (0.12 + 0.76 * r()), sp = (26 + r() * 30) * size, rr = (1.8 + r() * 1.8) * Math.max(0.8, size);
    const px = x + Math.cos(ang) * sp * u * (i % 2 ? 1 : -1), py = y - Math.sin(ang) * sp * u * 1.4 + 60 * size * u * u;
    if (py > y + 2) continue;
    g.globalAlpha = 1 - u * 0.6;
    g.fillStyle = E.night ? '#3a291d' : '#4a3020'; g.beginPath(); g.ellipse(px, py, rr * 1.3, rr, ang, 0, TAU); g.fill();
    g.fillStyle = '#9a7754'; g.beginPath(); g.arc(px - rr * 0.35, py - rr * 0.35, rr * 0.35, 0, TAU); g.fill();
  }
  g.restore();
}


/** The soil under the grass, cut away from y0 down to y1: topsoil, subsoil, stones and roots. */
function soil(g, x0, x1, y0, y1, { seed = 23, soft = null } = {}) {
  const E = env(), r = rng(seed), D = Math.max(1, y1 - y0);
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, E.night ? '#3b2c22' : '#6b4a32'); gr.addColorStop(0.35, E.night ? '#4a3729' : '#7e5a3c'); gr.addColorStop(1, E.night ? '#3a2d24' : '#8f6d4c');
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, D);
  // a wavy line between the dark topsoil and the paler clay beneath
  g.strokeStyle = withAlpha('#000000', 0.18); g.lineWidth = 1.2; g.beginPath();
  for (let x = x0; x <= x1; x += 14) { const y = y0 + D * 0.32 + Math.sin(x * 0.045 + seed) * 3; x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  // stones, lit from above
  for (let i = 0; i < (x1 - x0) / 9; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + 6 + r() * (D - 8), rr = 1.2 + r() * 3.2;
    g.fillStyle = withAlpha(E.night ? '#9a8f84' : '#c9b9a2', 0.55 + r() * 0.3); g.beginPath(); g.ellipse(x, y, rr * 1.3, rr, r() * 3, 0, TAU); g.fill();
    g.fillStyle = withAlpha('#ffffff', 0.25); g.beginPath(); g.ellipse(x - rr * 0.3, y - rr * 0.35, rr * 0.5, rr * 0.3, 0, 0, TAU); g.fill();
  }
  // fine roots hanging from the grass
  g.strokeStyle = withAlpha(E.night ? '#b39a7a' : '#e2cba4', 0.45); g.lineWidth = 1;
  for (let x = x0 + r() * 20; x < x1; x += 16 + r() * 26) {
    g.beginPath(); g.moveTo(x, y0 + 2); let yy = y0 + 2, xx = x;
    for (let j = 0; j < 4; j++) { xx += (r() - 0.5) * 6; yy += 3 + r() * Math.min(9, D * 0.08); g.lineTo(xx, yy); }
    g.stroke();
  }
  // the soft patch where it comes down: wet, dark mud, glossy at the surface
  if (soft) {
    const { x, w: sw, d: sd } = soft;
    const mud = g.createRadialGradient(x, y0, 2, x, y0, Math.max(sw, sd));
    mud.addColorStop(0, E.night ? '#2a1d15' : '#4a3020'); mud.addColorStop(0.75, withAlpha(E.night ? '#2a1d15' : '#4a3020', 0.8)); mud.addColorStop(1, withAlpha('#4a3020', 0));
    g.fillStyle = mud; g.beginPath(); g.ellipse(x, y0, sw, sd, 0, 0, Math.PI); g.fill();
  }
  // the cut face's top edge: the turf, a band of green with blades over the edge
  g.fillStyle = E.grass; g.fillRect(x0, y0 - 1, x1 - x0, 5);
  g.strokeStyle = withAlpha(E.grassAlt, 0.9); g.lineWidth = 1;
  g.beginPath(); for (let x = x0; x < x1; x += 4) { g.moveTo(x, y0 + 4); g.lineTo(x + (r() - 0.5) * 3, y0 + 6 + r() * 3); } g.stroke();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'sink') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);

  // ── the magnifier's place, fixed to the screen at the bottom right, with room under
  // it for two lines: the forces and the acceleration in the ground
  const RI = phone ? 60 : h < 420 ? 72 : 92;
  const lens = { x: w - RI - (phone ? 14 : 28), y: h - RI - (phone ? 56 : 60) };
  // nothing on the stage may sit under the lens, its title or the lines beneath it
  L.reserve({ x: lens.x - RI - 6, y: lens.y - RI - 26, w: 2 * RI + 12, h: 2 * RI + 26 + (phone ? 56 : 60) });

  // ── to scale: the ground at 0, A at h, the greatest height at h + H; the soil cut away below
  const span = Math.max(f.h + f.H, 0.5);
  const box = { xLo: -span * 0.32, xHi: span * 0.3, yLo: -Math.max(span * 0.26, f.depth * 1.15), yHi: span * 1.1 };
  const area = { left: phone ? 14 : HB[0].w + 16, right: lens.x - RI - (phone ? 10 : 24), top: HB[0].h * (phone ? 1.02 : 0.5), bottom: h - 8 };
  if (area.right - area.left < 120) area.right = w - 14;
  const { k, X, Y } = fitSide(box, area, { sky: 0.6 });
  const oy = Y(0), x0 = X(0);

  // ── who throws, and from where: the hand is A
  const hi = f.h > 2.5;
  // on a tower the figure is nearer its true size, so the tower reads as tall as it is;
  // on the ground it is at least THROWER_MIN, so a face and a stance read on a phone
  const TH = hi ? Math.max(30, Math.min(THROWER_MIN, 1.75 * k * 1.6)) : Math.max(THROWER_MIN, 1.75 * k), Apx = f.h * k;
  // on a tower the thrower releases forwards and up; on the ground the arm is set so the
  // hand is at A, underarm when A is low for the figure's size
  let aim = 40, standY = oy;
  if (hi) standY = Y(f.h) + throwerHand(TH, aim).y;
  else if (f.h > 0.05) {
    const sh = throwerHand(TH, 0).y, reach = throwerHand(TH, 90).y - sh;
    aim = (Math.asin(clamp((Apx - sh) / reach, -1, 1)) * 180) / Math.PI;
  }
  const feet = x0 - TH * 0.3, hand = throwerHand(TH, aim);
  const bx = f.h > 0.05 ? feet + hand.x : x0 + TH * 0.2;
  // A is the hand. A figure can't be drawn smaller than THROWER_MIN, so a low A can sit a
  // few pixels above its true height: the stretch below A takes up the difference
  const Ay = f.h > 0.05 ? standY - hand.y : oy;
  // the way down is drawn a little in front of the way up, clear of the thrower's legs
  const side = clamp(TH * 0.3, 7, 16), lx = bx + side;

  // ── the sky, the fields running back, a few trees, then the cut-away soil
  fields(g, w, oy - clamp((oy - 40) * 0.22, 26, 110), oy);
  for (const [dx, sz] of [[-TH * 1.5, 0.9], [TH * 1.6 + 40, 1.05], [TH * 2.6 + 70, 0.8], [-TH * 2.4 - 20, 0.7]]) {
    const x = x0 + dx; if (x > 6 && x < w - 6 && !(x > lens.x - RI - 20 && oy > lens.y - RI)) tree(g, x, oy, clamp(span * k * 0.12, 30, 66) * sz, { seed: Math.round(x) });
  }
  const patch = { x: lx, w: clamp(TH * 0.55, 22, 46), d: clamp(TH * 0.3, 12, 26) };
  soil(g, -20, w + 20, oy, h + 20, { soft: patch });
  L.add('soft ground', lx + patch.w + 8, oy + 16, { color: P.ink, pri: 6, size: 13, weight: 700, align: 'left' });

  const tw = clamp(f.h * k * 0.28, 40, 90);
  if (hi) tower(g, feet + TH * 0.18, standY, oy, tw);
  const pose = fired ? clamp(0.55 + t / Math.max(1e-6, 0.08 * f.tMax), 0, 1) : 0;
  thrower(g, feet, standY, TH, P, { dir: 1, pose, aim });

  // ── the height of A above the ground, as a dimension line
  const dx = feet - TH * 0.42 - (hi ? tw : 0);
  if (f.h > 0.05) {
    stroke(g, [{ x: dx, y: oy }, { x: dx, y: Ay }], { color: P.ink, width: 1.4, alpha: 0.9 });
    for (const yy of [oy, Ay]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.4, alpha: 0.9 });
    L.add(T`${s3(f.h)} [m]`, dx - 8, (oy + Ay) / 2, { color: P.ink, align: 'right', pri: 7, size: 15, weight: 700 });
  }
  dot(g, bx, Ay, 3.2, { fill: P.ink, stroke: P.card, width: 1.2 });
  L.add('A', bx - 12, Ay - 10, { color: P.ink, pri: 9, size: 15, weight: 800, align: 'right' });

  // ── the greatest height, across; and a height the paper asks about
  const scr = (y) => (y >= 0 || f.h <= 0.05 ? Ay - y * k : oy - (f.h + y) * ((oy - Ay) / f.h)), yTop = scr(f.H);
  const askY = f.yAsk != null ? scr(f.yAsk) : null, near = askY != null && Math.abs(askY - yTop) < 25;
  if (f.H > 1e-6) {
    stroke(g, [{ x: bx - 34, y: yTop }, { x: lx + 34, y: yTop }], { color: P.mark, width: 1.4, alpha: 0.8 });
    if (near) L.add(T`${s3(f.H)} [m] "above A"`, bx - 40, yTop, { color: P.mark, pri: 8, size: 13, weight: 700, align: 'right' });
    else L.add(T`${s3(f.H)} [m] "above A"`, lx + 40, yTop, { color: P.mark, pri: 8, size: 13, weight: 700, align: 'left' });
  }
  if (askY != null) {
    stroke(g, [{ x: bx - 50, y: askY }, { x: lx + 50, y: askY }], { color: P.mark, width: 1.6, alpha: 0.9 });
    L.add(T`${s3(f.yAsk)} [m]`, near ? lx + 56 : bx - 56, askY, { color: P.mark, pri: 8, size: 13, weight: 700, align: near ? 'left' : 'right' });
    for (const ta of f.tAt || []) if (t >= ta - 1e-9) {
      const down = ta > f.tTop + 1e-9, rx = down ? lx : bx;
      g.save(); g.strokeStyle = P.mark; g.lineWidth = 2; g.beginPath(); g.arc(rx, askY, 9, 0, TAU); g.stroke(); g.restore();
      L.add(T`${s3(ta)} [s]`, down ? rx + 16 : rx - 16, askY + (near ? 16 : -14), { color: P.mark, pri: 7, size: 13, weight: 700, align: down ? 'left' : 'right' });
    }
  }

  // ── the path so far: up on one line, down a little in front; solid, as it is vertical (rule 2)
  const path = (tt) => ({ x: tt > f.tTop ? lx : bx, y: tt <= f.tLand ? scr(f.pos(tt)) : oy - (f.pos(tt) + f.h) * k });
  if (t > 0) {
    const up = [], down = [];
    for (let i = 0; i <= 80; i++) { const tt = (i / 80) * Math.min(t, f.tLand); (tt > f.tTop ? down : up).push(path(tt)); }
    if (down.length) down.unshift({ x: lx, y: path(f.tTop).y });
    for (const pts of [up, down]) if (pts.length > 1) stroke(g, pts, { color: P.disp, width: 2, alpha: 0.6 });
  }
  for (let i = 0; i <= 30; i++) { const q = path((i / 30) * f.tLand); L.reserve({ x: q.x - 5, y: q.y - 5, w: 10, h: 10 }); }

  // ── where it lands: round clods of mud thrown up, then a ring when it is at rest
  { const life = Math.max(0.45, f.tMax * 0.12), u = (t - f.tLand) / life;
    if (t >= f.tLand - 1e-9) mudSplash(g, lx, oy, clamp(u, 0, 1), clamp(TH / 60, 0.7, 1.2)); }

  // ── the ball, and its velocity and acceleration, both vertical: solid (rule 2)
  const q = path(t), rB = clamp(TH * 0.09, 5.5, 9), v = f.vel(t);
  if (t < f.tLand) softShadow(g, q.x, oy + 1, rB * 1.4, rB * 0.4, 0.5);
  g.save(); if (t >= f.tLand) { g.beginPath(); g.rect(-50, -50, w + 100, oy + 50 + 1); g.rect(q.x - rB - 2, oy, 2 * rB + 4, h); g.clip(); }
  ballSprite(g, q.x, q.y - (t >= f.tLand ? 0 : rB * 0.2), rB);
  g.restore();
  L.reserve({ x: q.x - rB - 4, y: q.y - rB - 4, w: 2 * rB + 8, h: 2 * rB + 8 });
  const vMax = Math.max(f.u, f.vL, 1e-9);
  // no arrow for a speed that reads as 0; it shortens with the speed, no minimum
  if (show.velocity !== false && Math.abs(v) >= 0.05 && t < f.tLand) {
    const len = Math.min((Math.abs(v) / vMax) * 80, 80), ax = q.x - 16;
    if (len >= 4) {
      if (v > 0) arrow(g, ax, q.y, ax, q.y - len, { color: P.vel, width: 2.6, head: Math.min(10, len * 0.6) });
      else {
        // falling: from the ball down while there is room above the ground, else into the ball
        const room = oy - q.y - 4, y0 = room >= len ? q.y : q.y - (len - Math.max(0, room)), y1 = y0 + len;
        arrow(g, ax, y0, ax, y1, { color: P.vel, width: 2.6, head: Math.min(10, len * 0.6) });
      }
      L.add(T`${s3(Math.abs(v))} [m s^-1]`, ax - 8, v > 0 ? q.y - len * 0.6 : Math.min(q.y + len * 0.6, oy - 12), { color: P.vel, pri: 8, size: 14, weight: 700, align: 'right' });
    }
  }
  if (show.acceleration !== false && t < f.tLand && fired && t > 0) {
    const ax = q.x + 30;
    arrow(g, ax, q.y + 6, ax, q.y + 46, { color: P.acc, width: 2.2, head: 9 });
    L.add(T`${s3(f.g)} [m s^-2]`, ax + 8, q.y + 28, { color: P.acc, pri: 7, size: 13, weight: 700, align: 'left' });
  }
  if (t >= f.tRest - 1e-9) { const e = ageOf(t, f.tRest, f.tMax, Math.max(0.4, f.tMax * 0.15)); pulse(g, lx, oy, e.age, e.life, P.mark, { radius: 18 }); }
  L.draw(g, w, h);

  // ── the magnifier: the soil where it lands, enlarged, with the sink replayed slowly
  unview(g);
  const cx = lens.x, cy = lens.y, R = RI;
  // a faint cone from the landing spot to the lens's edges, as a magnifying glass's
  { const ddx = cx - lx, ddy = cy - oy, dd = Math.hypot(ddx, ddy);
    if (dd > R + 10) {
      const base = Math.atan2(ddy, ddx), off = Math.asin(R / dd), tl = Math.sqrt(dd * dd - R * R);
      const p1 = { x: lx + Math.cos(base - off) * tl, y: oy + Math.sin(base - off) * tl }, p2 = { x: lx + Math.cos(base + off) * tl, y: oy + Math.sin(base + off) * tl };
      g.save(); g.fillStyle = withAlpha(P.ink, 0.06); g.beginPath(); g.moveTo(lx, oy); g.lineTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.closePath(); g.fill();
      const fade = g.createLinearGradient(lx, oy, cx, cy); fade.addColorStop(0, withAlpha(P.ink, 0)); fade.addColorStop(Math.min(0.5, 30 / dd), withAlpha(P.ink, 0.3)); fade.addColorStop(1, withAlpha(P.ink, 0.3));
      g.strokeStyle = fade; g.lineWidth = 1.2; g.beginPath(); g.moveTo(lx, oy); g.lineTo(p1.x, p1.y); g.moveTo(lx, oy); g.lineTo(p2.x, p2.y); g.stroke(); g.restore();
    } }
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  // in the lens: the surface at 31 % from the top, the depth filling the lower part
  const sy = cy - R * 0.38, ki = (R * 0.95) / f.depth;
  const skyG = g.createLinearGradient(0, cy - R, 0, sy); skyG.addColorStop(0, E.skyMid); skyG.addColorStop(1, E.skyBottom);
  g.fillStyle = skyG; g.fillRect(cx - R, cy - R, 2 * R, sy - cy + R);
  soil(g, cx - R, cx + R, sy, cy + R, { seed: 41, soft: { x: cx - R * 0.22, w: R * 0.5, d: R * 0.8 } });
  // the clock in the lens: the real one, until the replay (the engine's) takes over
  const rt = f.replay(t), tt = rt ?? t, slowing = rt != null && t < f.tMax - 1e-9;
  const depthNow = -(f.pos(tt) + f.h);                 // into the ground, m; negative above it
  const rb = R * 0.13, bxL = cx - R * 0.22, by = sy + depthNow * ki - rb;
  const showBall = t >= f.tLand - 1e-9 && by > cy - R - rb;
  // sinking: from the moment it reaches the ground until it stops (at rest no force needs drawing)
  const inGround = showBall && tt >= f.tLand - 1e-9 && tt < f.tRest - 1e-9;
  const sunk = Math.max(0, depthNow) * ki;
  if (showBall && sunk > 0) {
    // the shaft it has pushed open: a rounded U, darker at the bottom, its left wall lit
    const hw = rb * 0.95, bot = sy + sunk;
    const sh = g.createLinearGradient(0, sy, 0, bot + rb); sh.addColorStop(0, withAlpha('#1c120c', 0.4)); sh.addColorStop(1, withAlpha('#1c120c', 0.75));
    g.fillStyle = sh; g.beginPath(); g.moveTo(bxL - hw, sy); g.lineTo(bxL - hw, bot - rb); g.arc(bxL, bot - rb, hw, Math.PI, 0, true); g.lineTo(bxL + hw, sy); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#9a7754', 0.45); g.lineWidth = 1; g.beginPath(); g.moveTo(bxL - hw + 0.5, sy); g.lineTo(bxL - hw + 0.5, bot - rb); g.stroke();
    // the soil squeezed under it: a darker ring below the ball
    g.strokeStyle = withAlpha('#1c120c', 0.25); g.lineWidth = rb * 0.35; g.beginPath(); g.arc(bxL, by, rb * 1.4, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    // lips of mud pushed up either side of the hole
    for (const sgn of [-1, 1]) {
      g.fillStyle = E.night ? '#2a1d15' : '#4a3020'; g.beginPath(); g.ellipse(bxL + sgn * (hw + rb * 0.55), sy - rb * 0.08, rb * 0.9, rb * 0.35, 0, Math.PI, TAU); g.fill();
      g.fillStyle = withAlpha('#c9a983', 0.5); g.beginPath(); g.ellipse(bxL + sgn * (hw + rb * 0.55) - rb * 0.2, sy - rb * 0.25, rb * 0.3, rb * 0.09, 0, 0, TAU); g.fill();
    }
  }
  // clods thrown up as it goes in, over the first fifth of the sink
  if (showBall && tt >= f.tLand && f.tSink > 0) {
    const u = (tt - f.tLand) / (f.tSink * 0.2);
    if (u <= 1) {
      const r = rng(19);
      for (let i = 0; i < 10; i++) {
        const ang = Math.PI * (0.15 + 0.7 * r()), sp = R * (0.25 + r() * 0.3), rr = rb * (0.18 + r() * 0.15), sg = i % 2 ? 1 : -1;
        const px = bxL + sg * Math.cos(ang) * sp * u, py = sy - Math.sin(ang) * sp * u + R * 0.5 * u * u;
        g.globalAlpha = 1 - u * 0.5; g.fillStyle = E.night ? '#3a291d' : '#4a3020'; g.beginPath(); g.ellipse(px, py, rr * 1.3, rr, ang, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }
  }
  if (showBall) ballSprite(g, bxL, by, rb);
  // in the ground, the forces on it from its centre — the resistance up, the weight down,
  // drawn under the ball so it sits over their tails — and while it sinks its velocity
  if (inGround && f.R != null) {
    arrow(g, bxL, by - rb, bxL, by - R * 0.42, { color: P.ink, width: 2.4, head: 9 });
    arrow(g, bxL, by + rb, bxL, by + rb + R * 0.16, { color: P.ink, width: 2, head: 7 });
    ballSprite(g, bxL, by, rb);
  }
  if (inGround) {
    const sp = -f.vel(tt), len = (sp / f.vL) * R * 0.5;
    if (sp > 0.02 * f.vL && len >= 4) arrow(g, bxL - rb - 8, by - len / 2, bxL - rb - 8, by + len / 2, { color: P.vel, width: 2.4, head: Math.min(8, len * 0.6) });
  }
  const bxR = cx + R * (phone ? 0.12 : 0.2), yEnd = sy + f.depth * ki;
  g.strokeStyle = P.disp; g.lineWidth = 2;
  g.beginPath(); g.moveTo(bxR, sy); g.lineTo(bxR, yEnd); g.moveTo(bxR - 5, sy); g.lineTo(bxR + 5, sy); g.moveTo(bxR - 5, yEnd); g.lineTo(bxR + 5, yEnd); g.stroke();
  g.restore();
  // the rim
  g.save(); g.strokeStyle = E.night ? '#c9ccd2' : '#2c2f36'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.strokeStyle = withAlpha('#ffffff', 0.5); g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R - 3, Math.PI * 1.1, Math.PI * 1.45); g.stroke(); g.restore();

  // the lens's words: each on a rounded pill of the theme's card, at the 13 px floor or
  // more, kept on the canvas
  const lab = (txt, x, y, col, al = 'left', size = 13) => {
    g.save(); g.font = `700 ${size}px system-ui, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'left';
    const tw2 = g.measureText(txt).width, x1 = al === 'center' ? x - tw2 / 2 : al === 'right' ? x - tw2 : x;
    const xs = clamp(x1, 10, w - 10 - tw2);
    g.fillStyle = withAlpha(P.card, 0.88); g.beginPath(); g.roundRect?.(xs - 7, y - size * 0.75, tw2 + 14, size * 1.5, 6); g.fill();
    g.fillStyle = col; g.fillText(txt, xs, y); g.restore();
  };
  lab(T`${s3(f.depth)} [m]`, bxR + 9, (sy + yEnd) / 2, P.disp);
  if (inGround && f.R != null) { lab(T`R`, bxL + 8, by - R * 0.32, P.ink); lab(T`m g`, bxL + 8, by + rb + R * 0.12, P.ink); }
  // the replay's pace is against the flight's: the engine's factor
  const n = f.slow != null ? num(Math.round(f.slow), 0) : '';
  lab(slowing ? (phone ? `Slowed ${n} times` : `In the ground, ${n} times slower than the flight`) : tt >= f.tRest - 1e-9 && t >= f.tRest ? 'At rest in the ground' : 'In the ground, enlarged', cx, cy - R - 14, P.ink, 'center');
  // under the lens: the resistance (and weight), then — while it sinks — the acceleration there
  if (f.R != null) lab(T`R = ${sf(f.R)} [N], m g = ${sf(f.W)} [N]`, cx, cy + R + 16, P.ink, 'center');
  if (inGround) lab(T`a = ${sf(-f.a)} [m s^-2] "up"`, cx, cy + R + (f.R != null ? 38 : 16), P.acc, 'center');
  return null;
}
