// athletes.js — who strikes the ball, for the balls that are struck rather
// than thrown: a golfer swinging through a golf ball, a footballer kicking a
// football. Each stands with its feet on the ground at (X, Y), `H` px tall,
// the ball where the engine starts it — at (X + H·BALL_AT, Y) — and is posed
// by `pose`: 0 the top of the backswing (or the leg drawn back), 0.5 the
// moment of the strike, 1 the follow-through. A `ring` colours the shirt to
// tell B from A. Nothing here is a quantity.

import { env, softShadow } from './scenery.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

/** Where the ball sits, ahead of the feet, as a fraction of the height. */
export const GOLF_BALL_AT = 0.37, KICK_BALL_AT = 0.2;

function limb(g, pts, color, w) {
  g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.stroke();
}
/** The knee of a leg from hip to foot, bent forward (side 1) or back. */
function knee(hip, foot, upper, lower, side = 1) {
  const dx = foot.x - hip.x, dy = foot.y - hip.y, d = Math.min(Math.hypot(dx, dy), upper + lower - 0.01);
  const a = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (upper * upper + d * d - lower * lower) / (2 * upper * d))));
  return { x: hip.x + Math.cos(a - side * c) * upper, y: hip.y + Math.sin(a - side * c) * upper };
}
function colours(ring) {
  const E = env();
  return {
    skin: E.night ? '#b08a74' : '#d9a988', skinFar: E.night ? '#7d6253' : '#b5876a',
    shirt: ring || (E.night ? '#7b8a6a' : '#6f8a5a'), trousers: E.night ? '#3e4150' : '#4a4e60', shoe: '#2b2628', hair: '#3a2c26',
  };
}
function head(g, x, y, r, C, cap) {
  const hg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); hg.addColorStop(0, C.skin); hg.addColorStop(1, C.skinFar);
  g.fillStyle = hg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  if (cap) { g.fillStyle = cap; g.beginPath(); g.arc(x, y - r * 0.15, r * 1.02, Math.PI * 1.02, Math.PI * 1.98); g.fill(); g.fillRect(x, y - r * 0.35, r * 1.25, r * 0.28); }
  else { g.fillStyle = C.hair; g.beginPath(); g.arc(x - r * 0.15, y - r * 0.2, r * 0.9, Math.PI, Math.PI * 1.95); g.fill(); }
  g.fillStyle = '#2b2628'; g.beginPath(); g.arc(x + r * 0.5, y - r * 0.05, Math.max(0.8, r * 0.12), 0, TAU); g.fill();
}

/** A golfer over the ball: knees flexed, bent from the hips, both hands on
    the club, swinging in a circle about the shoulders — club up behind at
    the top, through the ball, up in front at the finish. */
export function golfer(g, X, Y, H, P, { pose = 0, ring = null } = {}) {
  const C = colours(ring), u = Math.max(0, Math.min(1, pose));
  softShadow(g, X + H * 0.05, Y + 1, H * 0.3, H * 0.05, 0.8);
  // -1 at the top of the backswing, 0 at the ball, 1 at the finish
  const s = u < 0.5 ? -1 + (u / 0.5) ** 1.6 : ((u - 0.5) / 0.5) ** 0.7;
  const turn = s * 0.12;
  const back = { x: X - H * 0.12, y: Y }, front = { x: X + H * 0.12, y: Y };
  const hip = { x: X - H * 0.02 + turn * H * 0.1, y: Y - H * 0.47 };
  const sh = { x: hip.x + H * 0.13 + turn * H * 0.05, y: Y - H * 0.76 + Math.abs(s) * H * 0.04 };
  // the hands go round the shoulders; the club lags behind them, then whips through
  const phi = s * 2.3, R = H * 0.34;
  const hands = { x: sh.x + Math.sin(phi) * R, y: sh.y + Math.cos(phi) * R };
  const psi = 0.55 + phi * 1.25, CL = H * 0.5;
  const clubHead = { x: hands.x + Math.sin(psi) * CL, y: hands.y + Math.cos(psi) * CL };
  const thigh = H * 0.25, shin = H * 0.25;
  limb(g, [hip, knee(hip, back, thigh, shin, -1), back], C.trousers, H * 0.08);
  limb(g, [{ x: sh.x - H * 0.02, y: sh.y }, { x: lerp(sh.x, hands.x, 0.5) - H * 0.03, y: lerp(sh.y, hands.y, 0.5) }, hands], C.skinFar, H * 0.055);
  limb(g, [hip, sh], C.shirt, H * 0.17);
  limb(g, [hip, knee(hip, front, thigh, shin, -1), front], C.trousers, H * 0.085);
  for (const F of [back, front]) { g.fillStyle = C.shoe; g.beginPath(); g.ellipse(F.x + H * 0.03, F.y - H * 0.015, H * 0.06, H * 0.025, 0, 0, TAU); g.fill(); }
  limb(g, [sh, { x: lerp(sh.x, hands.x, 0.5) + H * 0.02, y: lerp(sh.y, hands.y, 0.5) }, hands], C.skin, H * 0.06);
  // the club: a steel shaft and its head
  g.strokeStyle = env().night ? '#c7ccd1' : '#7c858c'; g.lineWidth = Math.max(1.4, H * 0.018); g.lineCap = 'round';
  g.beginPath(); g.moveTo(hands.x, hands.y); g.lineTo(clubHead.x, clubHead.y); g.stroke();
  g.save(); g.translate(clubHead.x, clubHead.y); g.rotate(-psi + Math.PI / 2);
  g.fillStyle = '#3b3f45'; g.beginPath(); g.roundRect(-H * 0.035, -H * 0.02, H * 0.08, H * 0.04, H * 0.015); g.fill(); g.restore();
  g.fillStyle = C.skin; g.beginPath(); g.arc(hands.x, hands.y, H * 0.035, 0, TAU); g.fill();
  head(g, sh.x + H * 0.07, sh.y - H * 0.08, H * 0.075, C, env().night ? '#c9c2b6' : '#f2eee6');
}

/** A footballer kicking: the standing foot planted beside the ball, the
    kicking leg drawn back with the knee bent, swung through straight into
    the ball and on up; arms out wide for balance. */
export function kicker(g, X, Y, H, P, { pose = 0, ring = null } = {}) {
  const C = colours(ring), u = Math.max(0, Math.min(1, pose));
  const shirt = ring || (env().night ? '#8a4a4a' : '#b5473f'), socks = '#f2efe8';
  softShadow(g, X, Y + 1, H * 0.3, H * 0.05, 0.8);
  // the leg's angle from straight down: back, through the ball, up in front
  // (its foot meets the ball, ahead of the planted foot, at the strike)
  const a = u < 0.5 ? lerp(-1.25, 0.47, (u / 0.5) ** 1.3) : lerp(0.47, 1.25, (u - 0.5) / 0.5), lean = lerp(0.12, -0.2, u);
  const plant = { x: X, y: Y };
  const hip = { x: X - H * 0.03, y: Y - H * 0.5 };
  const sh = { x: hip.x + Math.sin(lean) * H * 0.3, y: hip.y - Math.cos(lean) * H * 0.3 };
  const thigh = H * 0.25, shin = H * 0.26;
  const kn = { x: hip.x + Math.sin(a) * thigh, y: hip.y + Math.cos(a) * thigh };
  const bend = lerp(1.4, 0, Math.min(1, u / 0.5)) + Math.max(0, u - 0.7) * 0.6;
  const foot = { x: kn.x + Math.sin(a - bend) * shin, y: kn.y + Math.cos(a - bend) * shin };
  // arms out: the far one forward, the near one back, swapping as it kicks
  const armF = { x: sh.x + H * lerp(0.2, -0.15, u), y: sh.y + H * 0.12 }, armN = { x: sh.x + H * lerp(-0.2, 0.22, u), y: sh.y + H * 0.08 };
  limb(g, [sh, { x: (sh.x + armF.x) / 2, y: sh.y + H * 0.1 }, armF], C.skinFar, H * 0.05);
  limb(g, [hip, knee(hip, plant, thigh, shin, 1), plant], C.skinFar, H * 0.065);
  limb(g, [hip, knee(hip, plant, thigh, shin, 1)], '#2f3340', H * 0.09);
  g.fillStyle = socks; g.fillRect(plant.x - H * 0.03, plant.y - H * 0.12, H * 0.06, H * 0.1);
  limb(g, [hip, sh], shirt, H * 0.17);
  limb(g, [hip, kn, foot], C.skin, H * 0.07);
  limb(g, [hip, kn], '#2f3340', H * 0.095);
  limb(g, [{ x: lerp(kn.x, foot.x, 0.5), y: lerp(kn.y, foot.y, 0.5) }, foot], socks, H * 0.065);
  for (const F of [plant, foot]) { g.fillStyle = C.shoe; g.beginPath(); g.ellipse(F.x + H * 0.03, F.y - H * 0.012, H * 0.06, H * 0.025, F === foot ? -(a - bend) * 0.6 : 0, 0, TAU); g.fill(); }
  limb(g, [sh, { x: (sh.x + armN.x) / 2, y: sh.y + H * 0.08 }, armN], C.skin, H * 0.055);
  limb(g, [sh, { x: (sh.x + armN.x) / 2, y: sh.y + H * 0.08 }], shirt, H * 0.065);
  head(g, sh.x + H * 0.03, sh.y - H * 0.09, H * 0.075, C, null);
}
