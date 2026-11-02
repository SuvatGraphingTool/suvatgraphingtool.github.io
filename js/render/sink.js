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
import { crater } from './impacts.js';
import { pulse, ageOf } from './effects.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const s3 = (x) => num(x, Math.abs(x) < 1 ? 3 : Math.abs(x) < 10 ? 2 : 1, { trim: true });

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

  // ── the magnifier's place, fixed to the screen at the bottom right
  const RI = phone ? 62 : h < 420 ? 74 : 96;
  const lens = { x: w - RI - (phone ? 14 : 28), y: h - RI - (phone ? 30 : 34) };

  // ── to scale: the ground at 0, A at h, the greatest height at h + H; the soil cut away below
  const span = Math.max(f.h + f.H, 0.5);
  const box = { xLo: -span * 0.32, xHi: span * 0.3, yLo: -span * 0.2, yHi: span * 1.1 };
  const area = { left: phone ? 14 : HB[0].w + 16, right: lens.x - RI - (phone ? 10 : 24), top: HB[0].h * (phone ? 1.02 : 0.5), bottom: h - 8 };
  if (area.right - area.left < 120) area.right = w - 14;
  const { k, X, Y } = fitSide(box, area, { sky: 0.6 });
  const oy = Y(0), x0 = X(0);

  // ── who throws, and from where: the hand is A
  const TH = Math.max(THROWER_MIN, 1.75 * k), Apx = f.h * k;
  const hi = f.h > 2.5;
  // on a tower the thrower releases from a natural height; on the ground the arm is
  // set so the hand is at A, underarm when A is low for the figure's size
  let aim = 25, standY = oy;
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

  // ── the sky, the fields running back, a few trees, then the cut-away soil
  fields(g, w, oy - clamp((oy - 40) * 0.22, 26, 110), oy);
  for (const [dx, sz] of [[-TH * 1.5, 0.9], [TH * 1.6 + 40, 1.05], [TH * 2.6 + 70, 0.8], [-TH * 2.4 - 20, 0.7]]) {
    const x = x0 + dx; if (x > 6 && x < w - 6 && !(x > lens.x - RI - 20 && oy > lens.y - RI)) tree(g, x, oy, clamp(span * k * 0.12, 30, 66) * sz, { seed: Math.round(x) });
  }
  soil(g, -20, w + 20, oy, h + 20, { soft: { x: bx, w: clamp(TH * 0.55, 22, 46), d: clamp(TH * 0.3, 12, 26) } });
  L.add('soft ground', bx + clamp(TH * 0.55, 22, 46) + 8, oy + 16, { color: '#f3e7d6', pri: 6, size: 13, weight: 700, align: 'left' });

  if (hi) {
    const tw = clamp(TH * 0.9, 36, 80);
    tower(g, feet + TH * 0.18, standY, oy, tw);
  }
  const pose = fired ? clamp(0.55 + t / Math.max(1e-6, 0.08 * f.tMax), 0, 1) : 0;
  thrower(g, feet, standY, TH, P, { dir: 1, pose, aim });

  // ── the height of A above the ground, as a dimension line
  const dx = feet - TH * 0.42 - (hi ? clamp(TH * 0.9, 36, 80) : 0);
  if (f.h > 0.05) {
    stroke(g, [{ x: dx, y: oy }, { x: dx, y: Ay }], { color: P.ink, width: 1.4, alpha: 0.9 });
    for (const yy of [oy, Ay]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.4, alpha: 0.9 });
    L.add(T`${s3(f.h)} [m]`, dx - 8, (oy + Ay) / 2, { color: P.ink, align: 'right', pri: 7, size: 15, weight: 700 });
  }
  dot(g, bx, Ay, 3.2, { fill: P.ink, stroke: P.card, width: 1.2 });
  L.add('A', bx + 20, Ay - 10, { color: P.ink, pri: 9, size: 15, weight: 800, align: 'left' });

  // ── the greatest height, across; and a height the paper asks about
  const scr = (y) => (y >= 0 || f.h <= 0.05 ? Ay - y * k : oy - (f.h + y) * ((oy - Ay) / f.h)), yTop = scr(f.H);
  if (f.H > 1e-6) {
    stroke(g, [{ x: bx - 40, y: yTop }, { x: bx + 60, y: yTop }], { color: P.mark, width: 1.4, alpha: 0.8 });
    L.add(T`${s3(f.H)} [m] "above A"`, bx + 66, yTop, { color: P.mark, pri: 8, size: 13, weight: 700, align: 'left' });
  }
  if (f.yAsk != null) {
    const ly = scr(f.yAsk);
    stroke(g, [{ x: bx - 50, y: ly }, { x: bx + 50, y: ly }], { color: P.mark, width: 1.6, alpha: 0.9 });
    L.add(T`${s3(f.yAsk)} [m]`, bx - 56, ly, { color: P.mark, pri: 8, size: 13, weight: 700, align: 'right' });
    for (const ta of f.tAt || []) if (t >= ta - 1e-9) {
      g.save(); g.strokeStyle = P.mark; g.lineWidth = 2; g.beginPath(); g.arc(bx + (ta > f.tTop ? 7 : 0), ly, 9, 0, TAU); g.stroke(); g.restore();
      L.add(T`${s3(ta)} [s]`, bx + (ta > f.tTop ? 26 : -26), ly - 14, { color: P.mark, pri: 7, size: 13, weight: 700, align: ta > f.tTop ? 'left' : 'right' });
    }
  }

  // ── the path so far: up on one line, down a little to the right; solid, as it is vertical (rule 2)
  const side = 7, path = (tt) => ({ x: bx + (tt > f.tTop ? side : 0), y: tt <= f.tLand ? scr(f.pos(tt)) : oy - (f.pos(tt) + f.h) * k });
  if (t > 0) {
    const up = [], down = [];
    for (let i = 0; i <= 80; i++) { const tt = (i / 80) * Math.min(t, f.tLand); (tt > f.tTop ? down : up).push(path(tt)); }
    if (down.length) down.unshift({ x: bx + side, y: path(f.tTop).y });
    for (const pts of [up, down]) if (pts.length > 1) stroke(g, pts, { color: P.disp, width: 2, alpha: 0.6 });
  }
  for (let i = 0; i <= 30; i++) { const q = path((i / 30) * f.tLand); L.reserve({ x: q.x - 5, y: q.y - 5, w: 10, h: 10 }); }

  // ── where it lands: mud thrown up, and a ring when it comes to rest
  const land = ageOf(t, f.tLand, f.tMax, Math.max(0.5, f.tMax * 0.25));
  if (land.age >= 0) crater(g, bx + side, oy, land.age, land.life, { size: clamp(TH / 60, 0.8, 1.4), dark: E.night ? '#2a1d15' : '#4a3020', light: '#9a7754' });

  // ── the ball, and its velocity and acceleration, both vertical: solid (rule 2)
  const q = path(t), rB = clamp(TH * 0.09, 5.5, 9), v = f.vel(t);
  if (t < f.tLand) softShadow(g, q.x, oy + 1, rB * 1.4, rB * 0.4, 0.5);
  g.save(); if (t >= f.tLand) { g.beginPath(); g.rect(-50, -50, w + 100, oy + 50 + 1); g.rect(q.x - rB - 2, oy, 2 * rB + 4, h); g.clip(); }
  ballSprite(g, q.x, q.y - (t >= f.tLand ? 0 : rB * 0.2), rB);
  g.restore();
  L.reserve({ x: q.x - rB - 4, y: q.y - rB - 4, w: 2 * rB + 8, h: 2 * rB + 8 });
  const vMax = Math.max(f.u, f.vL, 1e-9);
  if (show.velocity !== false && Math.abs(v) > 1e-6 && t < f.tLand) {
    const len = clamp((Math.abs(v) / vMax) * 80, 14, 80), sgn = v > 0 ? -1 : 1, ax = q.x - 18;
    arrow(g, ax, q.y, ax, q.y + sgn * len, { color: P.vel, width: 2.6, head: 10 });
    L.add(T`${s3(Math.abs(v))} [m s^-1]`, ax - 8, q.y + sgn * len * 0.6, { color: P.vel, pri: 8, size: 14, weight: 700, align: 'right' });
  }
  if (show.acceleration !== false && t < f.tLand && fired && t > 0) {
    const ax = q.x + 24;
    arrow(g, ax, q.y - 10, ax, q.y + 34, { color: P.acc, width: 2.2, head: 9 });
    L.add(T`${s3(f.g)} [m s^-2]`, ax + 8, q.y + 14, { color: P.acc, pri: 7, size: 13, weight: 700, align: 'left' });
  }
  if (t >= f.tRest - 1e-9) { const e = ageOf(t, f.tRest, f.tMax, Math.max(0.4, f.tMax * 0.15)); pulse(g, bx + side, oy, e.age, e.life, P.mark, { radius: 30 }); }
  L.draw(g, w, h);

  // ── the magnifier: the soil where it lands, enlarged, with the sink replayed slowly
  unview(g);
  const cx = lens.x, cy = lens.y, R = RI;
  // lines from the landing spot to the lens, as a magnifying glass's
  g.save(); g.strokeStyle = withAlpha(P.ink, 0.35); g.lineWidth = 1.2; g.setLineDash([]);
  g.beginPath(); g.moveTo(bx + side - 6, oy); g.lineTo(cx - R * 0.7, cy - R * 0.7); g.moveTo(bx + side + 6, oy); g.lineTo(cx - R * 0.1, cy - R); g.stroke(); g.restore();
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  // in the lens: the surface at 30 % from the top, the depth filling half the lens
  const sy = cy - R * 0.38, ki = (R * 0.95) / f.depth;
  const skyG = g.createLinearGradient(0, cy - R, 0, sy); skyG.addColorStop(0, E.skyMid); skyG.addColorStop(1, E.skyBottom);
  g.fillStyle = skyG; g.fillRect(cx - R, cy - R, 2 * R, sy - cy + R);
  soil(g, cx - R, cx + R, sy, cy + R, { seed: 41, soft: { x: cx, w: R * 0.55, d: R * 0.8 } });
  // the replay clock: before it lands, the soil waits; then the real sink; then, at rest, slowed down
  const rt = f.replay(t), tt = rt ?? t, slowing = rt != null && t < f.tMax - 1e-9;
  const yAbove = tt <= f.tLand ? f.pos(tt) + f.h : null;      // above the ground, in m
  const depthNow = tt <= f.tLand ? -(yAbove) : -(f.pos(tt) + f.h);
  // the ball a little left of centre, the depth bracketed to its right
  const rb = R * 0.13, bxL = cx - R * 0.22, by = sy + depthNow * ki - rb;
  const showBall = t >= f.tLand - 1e-9 && by > cy - R - rb;
  const inGround = showBall && tt >= f.tLand - 1e-9;
  if (showBall) {
    // the hole it has pushed open behind it
    if (depthNow > 0) { g.fillStyle = withAlpha('#1c120c', 0.55); g.fillRect(bxL - rb * 0.9, sy, rb * 1.8, depthNow * ki); }
    ballSprite(g, bxL, by, rb);
  }
  // in the ground, the forces on it, from its centre: the resistance up, the weight down —
  // and, while it sinks, its velocity (solid: vertical, rule 2)
  const fx = bxL - rb - 10;
  if (inGround && f.R != null) {
    arrow(g, fx, by, fx, by - R * 0.4, { color: '#fbf6ee', width: 2.4, head: 9 });
    arrow(g, fx, by, fx, by + R * 0.16, { color: '#fbf6ee', width: 2, head: 7 });
  }
  if (inGround && tt < f.tRest) {
    const sp = -f.vel(tt), len = clamp((sp / f.vL) * R * 0.5, 6, R * 0.5);
    if (sp > 1e-6) arrow(g, bxL + rb + 7, by - len / 2, bxL + rb + 7, by + len / 2, { color: P.vel, width: 2.4, head: 8 });
  }
  const bxR = cx + R * (phone ? 0.06 : 0.16), yEnd = sy + f.depth * ki;
  g.strokeStyle = '#fbf6ee'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(bxR, sy); g.lineTo(bxR, yEnd); g.moveTo(bxR - 5, sy); g.lineTo(bxR + 5, sy); g.moveTo(bxR - 5, yEnd); g.lineTo(bxR + 5, yEnd); g.stroke();
  g.restore();
  // the rim
  g.save(); g.strokeStyle = E.night ? '#c9ccd2' : '#2c2f36'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.strokeStyle = withAlpha('#ffffff', 0.5); g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R - 3, Math.PI * 1.1, Math.PI * 1.45); g.stroke(); g.restore();

  // the lens's words, each at the 13 px floor or more, on a dark halo, kept on the canvas
  const lab = (txt, x, y, col, al = 'left', size = 13) => {
    g.save(); g.font = `700 ${size}px system-ui, sans-serif`; g.textBaseline = 'middle';
    const tw = g.measureText(txt).width, x0 = al === 'center' ? x - tw / 2 : al === 'right' ? x - tw : x;
    const xs = clamp(x0, 6, w - 6 - tw);
    g.lineWidth = 4; g.strokeStyle = withAlpha('#101418', 0.7); g.lineJoin = 'round'; g.textAlign = 'left';
    g.strokeText(txt, xs, y); g.fillStyle = col; g.fillText(txt, xs, y); g.restore();
  };
  lab(T`${s3(f.depth)} [m]`, bxR + 8, (sy + yEnd) / 2, '#fbf6ee');
  if (inGround && f.R != null) { lab(T`R = ${s3(f.R)} [N]`, fx - 6, by - R * 0.3, '#fbf6ee', 'right'); lab(T`m g`, fx - 6, by + R * 0.12, '#fbf6ee', 'right'); }
  const slowed = `slowed ${num(Math.round(f.slow), 0)} times`;
  lab(slowing ? (phone ? `Slowed ${num(Math.round(f.slow), 0)} times` : `In the ground, ${slowed}`) : t >= f.tRest - 1e-9 ? 'At rest in the ground' : 'In the ground, enlarged', cx, cy - R - 12, '#fbf6ee', 'center');
  // under the lens: the acceleration in the ground, up the page — it slows the sinking
  lab(T`a = ${s3(-f.a)} [m s^-2] "up"`, cx, cy + R + 14, P.acc, 'center');
  return null;
}
