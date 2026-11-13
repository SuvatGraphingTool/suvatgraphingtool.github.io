// boundary.js — the stage for a ball struck towards a fielder on the boundary.
//
// Side on, one scale both ways, so the angle on the screen is the angle on
// the paper and the fielder's reach is to the same scale as the flight. A
// cricket ground (js/render/places.js `cricket`): the pavilion across the
// outfield, the square and its stumps; the batter in pads and a helmet at the
// crease, the fielder on the rope, the boards and a stand behind it
// (js/render/cricket.js). The distance to the boundary is a dimension along
// the ground; the reach is a band at the boundary, 0 up to L above the point
// it was struck from. At the true scale a person is a few pixels, so two
// round lenses show them enlarged: the batter, the swing and the angle; and
// the boundary, the reach, the fielder and what happens there.
//
// Everything is read from js/core/boundary.js (rule 4): the bat swings
// through the ball as the engine's clock starts, the fielder rises to the
// height the engine found and closes the hands at the engine's moment, or
// leaps and misses, or stoops at a ball that has come down short.

import { dust, pulse, flash, ageOf, phaseOf } from './effects.js';
import { PLACE_ART } from './places.js';
import { cricketBatter, batContact, fielder, FIELDER_REACH, boundaryRope, boundaryStand, crack } from './cricket.js';
import { PROPS } from './props.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha, sig3, noteMover, fmt } from './util.js';
import { env, skyscape, grass, softShadow, fitSide } from './scenery.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
// The readouts this kit shows (js/kits/boundary.js): five boxes down the top
// left, the clock top right — as js/render/target.js measured them.
const HUD = 185, HUD_H = 376;
const HUD_PHONE = { w: 150, h: 330 };
const TAU = Math.PI * 2;
const PERSON = 1.85;                 // m: the batter and the fielder
const ease = (u) => u * u * (3 - 2 * u);

/** Keep labels off a drawn line: small boxes along it. */
function reserveLine(L, pts, r = 6) {
  let last = null;
  for (const p of pts) {
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < r * 1.5) continue;
    L.reserve({ x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r }); last = p;
  }
}

/** How the fielder stands at time t: the engine's moment at the boundary and
    the height it found decide it; the art only eases into it. In metres. */
function fielderPose(f, t) {
  const v = f.verdict, tA = f.tAt, k0 = Math.min(0.7, tA * 0.22);
  if (v === 'short') {
    // it comes down short: watch it, then stoop towards it as it lands
    const u = ease(clamp((t - (f.tGround - k0)) / k0, 0, 1));
    return { hands: null, stoop: 0.7 * u, leap: 0, closed: 0, look: null, ahead: 0 };
  }
  const u = ease(clamp((t - (tA - k0)) / k0, 0, 1));
  const reach = FIELDER_REACH * PERSON;                 // standing, hands up
  if (v === 'catch') {
    const y = f.yAt;
    return { hands: 1.2 + (y - 1.2) * u, ahead: 0.3 * u, closed: t >= tA - 1e-9 ? 1 : 0,
      leap: Math.max(0, y - reach) * u, stoop: y < 0.8 ? (0.8 - y) / 0.8 * 0.8 * u : 0, look: y };
  }
  // over: a leap with the arms at full stretch, then down again as it goes on
  const after = clamp((t - tA) / 0.45, 0, 1), up = u * (1 - ease(after));
  return { hands: 1.2 + (reach + 0.45 - 1.2) * up, ahead: 0.15 * up, closed: 0, leap: 0.45 * up, stoop: 0, look: f.yAt };
}

/** A round lens at (cx, cy), radius r: clips to it, draws `paint`, rims it, and leads back to (tx, ty). */
function lens(g, P, cx, cy, r, tx, ty, paint) {
  const E = env();
  g.save(); g.strokeStyle = withAlpha(P.strong, 0.7); g.lineWidth = 1.3; g.setLineDash([4, 3]);
  const a = Math.atan2(ty - cy, tx - cx);
  g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.arc(tx, ty, 6, 0, TAU); g.stroke(); g.restore();
  g.save();
  g.shadowColor = E.shadow; g.shadowBlur = 12; g.shadowOffsetY = 3;
  g.fillStyle = E.skyBottom; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  g.shadowColor = 'transparent';
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
  paint();
  g.restore();
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'boundary') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), E = env();
  const L = labels();
  const phone = w < 520;
  L.reserve(phone ? { x: 0, y: 0, w: HUD_PHONE.w, h: HUD_PHONE.h } : { x: 0, y: 0, w: HUD, h: HUD_H });
  L.reserve({ x: w - 150, y: 0, w: 150, h: 86 });
  const F = f.F;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const v = f.verdict, D = f.d, Lr = f.L;

  // ── the frame: the batter, the flight to where it comes down, the rope, the boards
  const xLand = f.R;
  const xBoards = Math.max(D + 4, xLand + 3);
  const box = { xLo: -3.2, xHi: xBoards + 11, yLo: 0, yHi: Math.max(f.H, Lr + 0.6) * 1.1 };
  const below = phone ? 108 : 100, rightPx = phone ? 10 : 16;
  const areas = phone ? [{ left: 10, right: w - rightPx, top: 96, bottom: h - below }]
    : [{ left: HUD + 18, right: w - rightPx, top: 92, bottom: h - below },
       { left: 16, right: w - rightPx, top: HUD_H + 16, bottom: h - below }];
  let fs = null;
  for (const a of areas) {
    if (a.bottom - a.top < 60) continue;
    const q = fitSide(box, a, { sky: phone ? 0.95 : 0.8 });
    if (!fs || q.k > fs.k) fs = q;
  }
  if (!fs) return null;
  const { k, X, Y } = fs, oy = Y(0);
  const horizon = oy - clamp((oy - 40) * 0.3, 40, 150);
  const TH = PERSON * k;
  const caps = [];
  const say = (text, color, x, y, opt = {}) => {
    if (phone) caps.push({ text, color });
    else L.add(text, x, y, { color, pri: 9, size: 14, weight: 700, ...opt });
  };

  // ── the ground: the composer's cricket ground, its pavilion under the top of the flight
  const pathAll = f.path(160, f.tGround);
  const over = (xm) => (xm >= 0 && xm <= xLand ? F.y(xm / F.ux) : null);
  PLACE_ART.cricket(g, { w, h, k, X, Y, oy, x0: X(0), top: oy, H0: 0, clearX: [X(xLand)], over, pavilionX: X(f.H > 0 ? F.apex.x : D / 2), reserve: (b) => L.reserve(b) });
  // the boards and the stand behind the rope, the rope itself crossing the outfield
  boundaryStand(g, X(xBoards), oy, w, k, { seed: 67 });
  boundaryRope(g, X(D), oy, h, horizon, { back: clamp((X(D) - X(0)) * 0.07, 30, 80) });

  // ── the distances along the ground: to the boundary, and the metres
  const step = niceStep(box.xHi, phone ? 5 : 8);
  for (let x = step; x < xBoards; x += step) {
    stroke(g, [{ x: X(x), y: oy }, { x: X(x), y: oy + 6 }], { color: P.axis, width: 1.4 });
    L.add(fmt(x, step < 1 ? 1 : 0), X(x), oy + 16, { color: P.faint, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  const dy = oy + 40;
  stroke(g, [{ x: X(0), y: dy }, { x: X(D), y: dy }], { color: P.strong, width: 1.4 });
  for (const xx of [X(0), X(D)]) stroke(g, [{ x: xx, y: dy - 5 }, { x: xx, y: dy + 5 }], { color: P.strong, width: 1.4 });
  L.add(`${T`${tr(D)} [m]`} to the boundary`, (X(0) + X(D)) / 2, dy + 14, { color: P.strong, align: 'center', pri: 9, size: 14, weight: 700, maxPush: 20 });
  L.reserve({ x: X(0), y: dy - 6, w: X(D) - X(0), h: 7 });

  // ── the batter at the crease: the bat up behind before the hit, through the ball as the clock starts
  const pose = fired ? clamp(0.5 + 0.5 * t / Math.max(1e-6, 0.12 * f.tMax), 0.5, 1) : 0;
  const bc = batContact(TH);
  const feetX = X(0) - bc.x;
  cricketBatter(g, feetX, oy, TH, { pose });
  L.reserve({ x: feetX - TH * 0.4, y: oy - TH * 1.15, w: TH * 0.9, h: TH * 1.15 });

  // ── the reach at the boundary: a band from the height it was struck from up to L
  const bx = X(D), bTop = Y(Lr);
  const band = Math.max(4, 0.45 * k);
  g.save(); g.fillStyle = withAlpha(P.mark, 0.22); g.fillRect(bx - band / 2, bTop, band, oy - bTop); g.restore();
  stroke(g, [{ x: bx - band, y: bTop }, { x: bx + band, y: bTop }], { color: P.mark, width: 2 });
  L.reserve({ x: bx - band, y: bTop - 3, w: band * 2, h: oy - bTop + 3 });

  // ── the fielder on the rope, at the scene's own scale
  const fp = fielderPose(f, t);
  const fieldX = X(D + 0.3);
  fielder(g, fieldX, oy, TH, { hands: fp.hands == null ? null : fp.hands * k, ahead: fp.ahead * k, closed: fp.closed, leap: fp.leap * k, stoop: fp.stoop, look: fp.look == null ? null : fp.look * k });

  // ── the path: where it goes faintly, flown strongly; after a catch, where it would have gone, dotted
  const mine = f.path(160).map((p) => ({ x: X(p.x), y: Y(p.y) }));
  stroke(g, mine, { color: P.vel, width: 1.6, alpha: 0.3 });
  if (v === 'catch') {
    const rest = pathAll.filter((p) => p.t >= f.tAt).map((p) => ({ x: X(p.x), y: Y(p.y) }));
    stroke(g, rest, { color: P.vel, width: 1.4, alpha: 0.45, dash: [3, 5] });
  }
  const flown = f.path(120, t).map((p) => ({ x: X(p.x), y: Y(p.y) }));
  if (t > 0) stroke(g, flown, { color: P.vel, width: 2.8 });
  reserveLine(L, mine, 5);

  // ── its angle at the bat
  const th = f.params.theta * Math.PI / 180, Ra = clamp(k * 3.2, 28, 46);
  stroke(g, [{ x: X(0), y: oy }, { x: X(0) + Ra + 12, y: oy }], { color: P.muted, width: 1.2 });
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 1.5; g.beginPath(); g.arc(X(0), oy, Ra, -th, 0); g.stroke(); g.restore();
  L.add(T`theta = ${num(f.params.theta, 1, { trim: true })}°`, X(0) + Ra + 8, oy - Math.max(14, Ra * Math.sin(th / 2) * 0.9), { color: P.strong, align: 'left', pri: 8, size: 14, weight: 700, maxPush: 30 });

  // ── equal steps of time along the path, labelled when asked
  const dtk = niceStep(f.tMax, 10);
  for (let i = 1; i * dtk <= t + 1e-9 && i * dtk < f.tMax - 1e-9; i++) {
    const q = f.pos(i * dtk);
    dot(g, X(q.x), Y(q.y), 3.2, { fill: P.vel, stroke: P.surface, width: 1.2 });
    if (show.ticks) L.add(T`${num(i * dtk, dtk < 1 ? 1 : 0)} [s]`, X(q.x) + 6, Y(q.y) + 14, { color: P.vel, align: 'left', pri: 2, size: 13, bg: false, maxPush: 0 });
  }
  // ── the top of its path, once it has been there
  if (show.apex !== false && f.H > 0 && t >= f.tTop - 1e-9) {
    const ax = X(F.apex.x), ay = Y(F.apex.y);
    // a vertical length: solid (rule 2)
    stroke(g, [{ x: ax, y: ay }, { x: ax, y: oy }], { color: P.disp, width: 1.3, alpha: 0.6 });
    dot(g, ax, ay, 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H = ${sig3(f.H)} [m]`, ax, ay - 18, { color: P.disp, align: 'center', pri: 7, size: 14, weight: 700 });
  }

  // ── at the boundary, once it has got there
  const atRope = v !== 'short' && t >= f.tAt - 1e-9;
  if (atRope) {
    const py = Y(f.yAt);
    // its height there, as a dimension in the displacement's hue, beside the band
    const hx = bx - band - 7;
    stroke(g, [{ x: hx, y: oy }, { x: hx, y: py }], { color: P.disp, width: 2 });
    for (const yy of [oy, py]) stroke(g, [{ x: hx - 4, y: yy }, { x: hx + 4, y: yy }], { color: P.disp, width: 2 });
    L.add(T`${sig3(f.yAt)} [m]`, hx - 8, (oy + py) / 2, { color: P.disp, align: 'right', pri: 9, size: 14, weight: 700, maxPush: 20 });
    dot(g, bx, py, 7, { stroke: P.mark, width: 2.2 });
    L.reserve({ x: bx - 9, y: py - 9, w: 18, h: 18 });
  }
  // ── where it comes down: dust, and how far — or, caught, where it would have
  if (v !== 'catch' && t >= f.tGround - 1e-9) {
    const gx = X(xLand);
    { const { age, life } = ageOf(t, f.tGround, f.tMax); dust(g, gx, oy, age, life, { size: 0.9 }); }
    if (v === 'short') {
      const a = X(xLand), b = X(D), yy = oy + 8;
      stroke(g, [{ x: a, y: yy }, { x: b, y: yy }], { color: P.mark, width: 2.4 });
      for (const xx of [a, b]) stroke(g, [{ x: xx, y: yy - 5 }, { x: xx, y: yy + 5 }], { color: P.mark, width: 2.4 });
      say(`down ${T`${sig3(xLand)} [m]`} out, ${T`${sig3(f.short)} [m]`} short`, P.mark, (a + b) / 2, oy + 68, { align: 'center' });
    } else say(`down ${T`${sig3(xLand)} [m]`} out, over the boundary`, P.mark, gx, oy + 68, { align: 'center' });
  }
  // (caught where it would have come down anyway — at its own height on the rope — there is nothing more to say)
  if (v === 'catch' && t >= f.tAt - 1e-9 && xLand - D > 0.05) {
    const gx = X(xLand);
    dot(g, gx, oy, 4, { fill: P.card, stroke: P.muted, width: 1.6 });
    L.add(`would have come down ${T`${sig3(xLand)} [m]`} out`, gx + 10, oy - 22, { color: P.muted, align: 'left', pri: 6, size: 13, weight: 700, maxPush: 40 });
  }

  // ── the ball, its velocity and its acceleration
  const r = f.pos(t), vv = f.vel(t);
  const rBall = 7;
  let sx = X(r.x), sy = Math.min(Y(r.y), oy - rBall);
  if (!fired) { sx = X(0); sy = oy - rBall; }
  const vMax = Math.max(...pathAll.map((p) => Math.hypot(F.ux, F.vy(p.t))), 1e-6);
  const room = (c, dv, lo, hi) => (dv > 0 ? (hi - c) / dv : dv < 0 ? (lo - c) / dv : Infinity);
  let vl = clamp(w * 0.08, 40, 100) / vMax;
  for (const q of pathAll) vl = Math.min(vl, room(X(q.x), F.ux, 12, w - 70) * 0.9, room(Y(q.y), -F.vy(q.t), 12, h - 12) * 0.9);
  const moving = fired && f.speed(t) > 1e-6 && !(v === 'catch' && t >= f.tAt - 1e-9) && !(v !== 'catch' && t >= f.tGround - 1e-9);
  if (show.velocity !== false && moving) {
    if (show.components) {
      arrow(g, sx, sy, sx + vv.x * vl, sy, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, sx + vv.x * vl, sy, sx + vv.x * vl, sy - vv.y * vl, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, sx, sy, sx + vv.x * vl, sy - vv.y * vl, { color: P.velVec, width: 3, head: 12 });
    L.add(T`${sig3(f.speed(t))} [m s^-1]`, sx + vv.x * vl + 10, sy - vv.y * vl, { color: P.vel, align: 'left', pri: 7, size: 15, weight: 700, maxPush: 80 });
  }
  if (show.acceleration && moving) arrow(g, sx, sy, sx, sy + 40, { color: P.acc, width: 2.4, head: 10 });
  // caught: in the fielder's hands
  if (v === 'catch' && t >= f.tAt - 1e-9) { sx = X(D); sy = Y(f.yAt); }
  if (sy > oy - rBall * 3) softShadow(g, sx, oy + 1, rBall * 1.3, 2.5, 0.8);
  PROPS.cricketBall(g, sx, sy, rBall, t * 9);
  noteMover(g, sx, sy, 18, { strong: true });
  // the crack of the bat, as the clock starts
  if (fired) { const u = phaseOf(t, Math.max(1e-6, 0.05 * f.tMax)); if (u != null) crack(g, X(0) + 4, oy - rBall, u, 16); }
  // the catch, in the main view too: a ring at the hands
  if (v === 'catch' && t >= f.tAt - 1e-9) { const { age, life } = ageOf(t, f.tAt, f.tMax); pulse(g, X(D), Y(f.yAt), age, life, P.mark, { radius: 18 }); }

  // ── the lenses: the batter and the boundary, enlarged
  const lensR = phone ? 52 : clamp(Math.min(w, h) * 0.13, 64, 96);
  const hudBox = phone ? { x: 0, y: 0, w: HUD_PHONE.w, h: HUD_PHONE.h } : { x: 0, y: 0, w: HUD, h: HUD_H };
  const clockBox = { x: w - 300, y: 0, w: 300, h: 92 };
  const hitsBox = (c, R, b) => c.x + R > b.x && c.x - R < b.x + b.w && c.y + R > b.y && c.y - R < b.y + b.h;
  const clearOf = (c, R, pts, avoid) => c.x - R > 4 && c.x + R < w - 4 && c.y - R > 4 && c.y + R < oy - 4
    && !pts.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < R + 10) && !avoid.some((b) => hitsBox(c, R, b));
  const pathPx = pathAll.map((p) => ({ x: X(p.x), y: Y(p.y) }));
  // the boundary's lens: high on the right, over the stand, clear of the flight and the clock
  const RB = phone ? lensR : Math.round(lensR * 1.15);
  const bCands = [
    { x: w - RB - 18, y: clockBox.h + RB + 16 }, { x: w - RB - 18, y: clockBox.h + RB + 60 },
    { x: Math.min(w - RB - 18, X(D) + RB * 0.4), y: clockBox.h + RB + 16 }, { x: X(D) - RB * 1.2, y: clockBox.h + RB + 16 },
    { x: w - RB - 18, y: Math.max(RB + 8, Y(Lr) - RB - 70) },
  ];
  const bLens = bCands.find((c) => clearOf(c, RB, pathPx, [hudBox, clockBox])) ?? null;
  // the batter's lens: under the readouts on a laptop, or beside the batter
  const RA = phone ? lensR : clamp(Math.min(lensR, (feetX - 40) / 2, (oy - HUD_H - 40) / 2), 52, 96);
  const aCands = phone ? [] : [
    { x: Math.max(RA + 12, feetX - RA - 44), y: Math.min(oy - RA - 24, HUD_H + 22 + RA) },
    { x: feetX + lensR * 0.2, y: oy - lensR - TH * 1.4 - 40 },
    { x: feetX - lensR - 20, y: oy - lensR - 30 },
  ];
  const aLens = aCands.find((c) => clearOf(c, RA, pathPx, [hudBox, clockBox, ...(bLens ? [{ x: bLens.x - RB, y: bLens.y - RB, w: 2 * RB, h: 2 * RB }] : [])])) ?? null;

  if (bLens) {
    const { x: cx, y: cy } = bLens, R = RB;
    const kL = (2 * R) / 4.5, gy = cy + R * 0.66, hz = cy - R * 0.02;
    const LX = (xm) => cx + R * 0.2 + (xm - D) * kL, LY = (ym) => gy - ym * kL;
    lens(g, P, cx, cy, R, X(D), Y(Math.min(Lr, f.H) * 0.5), () => {
      skyscape(g, cx - R, cy - R, cx + R, hz - R * 0.3, { seed: 5, clouds: 1, sun: false, far: 'none' });
      // the crowd behind, out of focus beyond the rope, and the grass up to its boards
      boundaryStand(g, cx - R - 10, hz, cx + R + 4, R * 0.09, { seed: 71 });
      grass(g, cx - R, cx + R, hz, cy + R, { seed: 9 });
      // the rope at the fielder's feet
      boundaryRope(g, LX(D) + kL * 0.12, gy, cy + R, hz + 2, { back: R * 0.9 });
      // the reach: from the height it was struck from up to L
      const top = LY(Lr), bw = kL * 0.9;
      g.fillStyle = withAlpha(P.mark, 0.2); g.fillRect(LX(D) - bw / 2, top, bw, gy - top);
      stroke(g, [{ x: LX(D) - bw * 0.75, y: top }, { x: LX(D) + bw * 0.75, y: top }], { color: P.mark, width: 2.2 });
      // the path through the lens: faintly all of it, strongly what has flown, dotted where a caught ball would have gone
      const seg = (pts) => pts.filter((p) => Math.abs(p.x - D) < 4).map((p) => ({ x: LX(p.x), y: LY(p.y) }));
      const fine = f.path(400);
      stroke(g, seg(fine), { color: P.vel, width: 1.8, alpha: 0.3 });
      if (v === 'catch') stroke(g, seg(f.path(400, f.tGround).filter((p) => p.t >= f.tAt)), { color: P.vel, width: 1.6, alpha: 0.45, dash: [3, 5] });
      if (t > 0) stroke(g, seg(f.path(400, t)), { color: P.vel, width: 3 });
      // the fielder, large enough to read
      const lp = fielderPose(f, t), LH = PERSON * kL;
      fielder(g, LX(D + 0.3), gy, LH, { hands: lp.hands == null ? null : lp.hands * kL, ahead: lp.ahead * kL, closed: lp.closed, leap: lp.leap * kL, stoop: lp.stoop, look: lp.look == null ? null : lp.look * kL });
      // the ball, when it is in view
      const bxL = v === 'catch' && t >= f.tAt - 1e-9 ? LX(D) : LX(r.x), byL = v === 'catch' && t >= f.tAt - 1e-9 ? LY(f.yAt) : Math.min(LY(r.y), gy - kL * 0.036);
      if (fired && Math.abs(bxL - cx) < R + 10) PROPS.cricketBall(g, bxL, byL, Math.max(4, kL * 0.036 * 1.6), t * 9);
      // the catch: the hands close and a burst; a miss: a puff of air past the hands
      if (atRope) {
        const { age, life } = ageOf(t, f.tAt, f.tMax);
        if (v === 'catch') { flash(g, LX(D), LY(f.yAt), age, life * 0.7, { radius: 22 }); pulse(g, LX(D), LY(f.yAt), age, life, P.mark, { radius: 30 }); }
        // its height there, in the displacement's hue
        const hx = LX(D) - bw * 0.75 - 8, py = LY(f.yAt);
        if (py > cy - R) {
          stroke(g, [{ x: hx, y: gy }, { x: hx, y: py }], { color: P.disp, width: 2 });
          for (const yy of [gy, py]) stroke(g, [{ x: hx - 4, y: yy }, { x: hx + 4, y: yy }], { color: P.disp, width: 2 });
        }
      }
      // the level it was struck from, along the grass
      stroke(g, [{ x: cx - R, y: gy }, { x: cx + R, y: gy }], { color: P.muted, width: 1, alpha: 0.6, dash: [3, 4] });
    });
    L.reserve({ x: cx - R - 3, y: cy - R - 3, w: 2 * R + 6, h: 2 * R + 6 });
    // its labels, outside the lens: the reach on its left, then what happened, under it
    L.add(T`L = ${tr(Lr)} [m]`, cx - R - 8, LY(Lr), { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700, maxPush: 20 });
    const head = !atRope ? (v === 'short' && t >= f.tGround - 1e-9 ? 'never reaches the fielder' : 'the boundary, enlarged')
      : v === 'catch' ? `caught: ${T`${sig3(f.yAt)} [m]`} up, under ${T`${tr(Lr)} [m]`}` : `over: ${T`${sig3(f.yAt)} [m]`} up, not under ${T`${tr(Lr)} [m]`}`;
    L.add(head, cx, cy + R + 15, { color: atRope ? P.mark : P.muted, align: 'center', pri: 10, size: atRope ? 14 : 13, weight: 700, maxPush: 20 });
  } else if (atRope) {
    say(v === 'catch' ? `caught: ${T`${sig3(f.yAt)} [m]`} up, under ${T`${tr(Lr)} [m]`}` : `over: ${T`${sig3(f.yAt)} [m]`} up, not under ${T`${tr(Lr)} [m]`}`, P.mark, X(D) - band - 14, Y(Math.max(f.yAt, Lr)) - 24, { align: 'right' });
  }
  if (aLens) {
    const { x: cx, y: cy } = aLens, R = RA;
    const kA = (2 * R) / 3.6, gy = cy + R * 0.62, BH = PERSON * kA, c = batContact(BH);
    const ox = cx - R * 0.05;                                 // where it is struck, in the lens
    lens(g, P, cx, cy, R, X(0), oy - TH * 0.4, () => {
      skyscape(g, cx - R, cy - R, cx + R, gy - R * 0.25, { seed: 11, clouds: 1, sun: false, far: 'trees', farHeight: R * 0.2 });
      grass(g, cx - R, cx + R, gy - R * 0.25, cy + R, { seed: 4 });
      // the pitch under the batter, the crease, the stumps behind
      g.fillStyle = E.night ? '#6a6250' : '#cbb88a'; g.beginPath(); g.moveTo(cx - R, gy - 4); g.lineTo(cx + R, gy - 4); g.lineTo(cx + R, gy + 10); g.lineTo(cx - R, gy + 10); g.closePath(); g.fill();
      g.strokeStyle = withAlpha('#ffffff', 0.9); g.lineWidth = 1.5; g.beginPath(); g.moveTo(ox - c.x + BH * 0.05, gy - 4); g.lineTo(ox - c.x + BH * 0.03, gy + 10); g.stroke();
      const stx = ox - c.x - BH * 0.42, sh = 0.71 * kA;
      g.strokeStyle = E.night ? '#c8c0a8' : '#f2ead2'; g.lineWidth = Math.max(2, kA * 0.04);
      for (const dd of [-3, 0, 3]) { g.beginPath(); g.moveTo(stx + dd, gy); g.lineTo(stx + dd, gy - sh); g.stroke(); }
      g.strokeStyle = E.night ? '#a89a7a' : '#d8c8a0'; g.lineWidth = 2; g.beginPath(); g.moveTo(stx - 4, gy - sh - 1); g.lineTo(stx + 4, gy - sh - 1); g.stroke();
      // the first of the path, leaving at θ
      const Lp = R * 1.7, ex = ox + Math.cos(th) * Lp, ey = gy - Math.sin(th) * Lp;
      stroke(g, [{ x: ox, y: gy }, { x: ex, y: ey }], { color: P.vel, width: 2, alpha: 0.35 });
      const gone = fired ? clamp(t / Math.max(1e-6, 0.06 * f.tMax), 0, 1) : 0;
      if (gone > 0) stroke(g, [{ x: ox, y: gy }, { x: ox + (ex - ox) * gone, y: gy + (ey - gy) * gone }], { color: P.vel, width: 3 });
      stroke(g, [{ x: ox, y: gy }, { x: ox + R * 0.8, y: gy }], { color: P.muted, width: 1.2 });
      g.strokeStyle = P.strong; g.lineWidth = 1.6; g.beginPath(); g.arc(ox, gy, R * 0.5, -th, 0); g.stroke();
      cricketBatter(g, ox - c.x, gy, BH, { pose });
      // the ball on the bat before the hit, leaving along the path after it
      const bR = Math.max(4, 0.036 * kA * 1.3);
      if (gone < 1) PROPS.cricketBall(g, ox + (ex - ox) * gone, (gy - bR) + (ey - gy) * gone, bR, t * 9);
      if (fired) { const u = phaseOf(t, Math.max(1e-6, 0.06 * f.tMax)); if (u != null) crack(g, ox, gy - bR, u, R * 0.35); }
    });
    L.reserve({ x: cx - R - 3, y: cy - R - 3, w: 2 * R + 6, h: 2 * R + 6 });
    L.add('the batter, enlarged', cx, cy + R + 15, { color: P.muted, align: 'center', pri: 6, size: 13, maxPush: 20 });
  }

  // ── on a phone, what happened, in captions under the distances
  caps.forEach((c, i) => L.add(c.text, 12, oy + 68 + i * 24, { color: c.color, align: 'left', pri: 10, size: 14, weight: 700 }));

  L.draw(g, w, h);
  return null;
}
