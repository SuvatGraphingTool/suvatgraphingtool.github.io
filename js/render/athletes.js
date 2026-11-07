// athletes.js — who strikes the ball, for the balls that are struck rather
// than thrown: a golfer swinging through a golf ball, a footballer kicking a
// football. Each stands with its feet on the ground at (X, Y), `H` px tall,
// the ball where the engine starts it — at (X + H·BALL_AT, Y) — and is posed
// by `pose`: 0 the top of the backswing (or the leg drawn back), 0.5 the
// moment of the strike, 1 the follow-through. A `ring` colours the shirt to
// tell B from A. Nothing here is a quantity.

import { env, softShadow } from './scenery.js';
import { withAlpha } from './util.js';

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
  // flung out wide as it strikes, for balance
  const wide = Math.sin(Math.PI * u);
  const armF = { x: sh.x + H * (lerp(0.2, -0.15, u) + 0.12 * wide), y: sh.y + H * (0.12 - 0.14 * wide) }, armN = { x: sh.x + H * (lerp(-0.2, 0.22, u) - 0.14 * wide), y: sh.y + H * (0.08 - 0.12 * wide) };
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

/** Where an archer's bow hand is, from the feet, at H px tall aiming `aim`
    degrees above the horizontal: the arrow rests there. */
export function archerHand(H, aim = 20) {
  const a = (Math.max(-60, Math.min(80, aim)) * Math.PI) / 180, sh = { x: H * 0.02, y: H * 0.79 };
  return { x: sh.x + Math.cos(a) * H * 0.4, y: sh.y + Math.sin(a) * H * 0.4 };
}

/** An archer side on, feet apart, the bow arm out along `aim` (degrees up),
    a recurve bow upright across it, the string drawn back to the cheek;
    `pose` 0 at full draw, past 0.5 loosed — the string straight again, the
    drawing hand flung back past the ear. A quiver at the hip. */
export function archer(g, X, Y, H, P, { pose = 0, aim = 20, ring = null } = {}) {
  const C = colours(ring), u = Math.max(0, Math.min(1, pose)), loosed = u > 0.5;
  const E = env(), a = (Math.max(-60, Math.min(80, aim)) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  softShadow(g, X, Y + 1, H * 0.3, H * 0.05, 0.8);
  const back = { x: X - H * 0.12, y: Y }, front = { x: X + H * 0.13, y: Y };
  const hip = { x: X, y: Y - H * 0.5 }, sh = { x: X + H * 0.02, y: Y - H * 0.79 };
  const thigh = H * 0.25, shin = H * 0.26;
  const bowHand = { x: sh.x + ca * H * 0.4, y: sh.y - sa * H * 0.4 };
  // the bow: a recurve across the line of the arrow, its limbs curving back
  // toward the archer and flicking forward at the tips
  const nx = -sa, ny = -ca, L = H * 0.42, flex = loosed ? 0.12 : 0.24;
  const tip = (s) => ({ x: bowHand.x + nx * L * s - ca * L * flex, y: bowHand.y + ny * L * s + sa * L * flex });
  const top = tip(1), bot = tip(-1);
  // the string: to the drawing hand at the cheek, or straight once loosed
  const cheek = { x: sh.x + H * 0.05 + ca * H * 0.02, y: sh.y - H * 0.06 };
  const draw = loosed ? { x: cheek.x - H * 0.1, y: cheek.y - H * 0.02 } : cheek;
  // the far leg, the quiver at the hip, then the body
  limb(g, [hip, knee(hip, back, thigh, shin, -1), back], C.trousers, H * 0.08);
  g.fillStyle = E.night ? '#5a4632' : '#7a5636'; g.save(); g.translate(hip.x - H * 0.06, hip.y - H * 0.02); g.rotate(-0.35);
  g.fillRect(-H * 0.035, -H * 0.2, H * 0.07, H * 0.24);
  g.fillStyle = '#e8e2d6'; for (let i = 0; i < 3; i++) g.fillRect(-H * 0.03 + i * H * 0.022, -H * 0.25, H * 0.012, H * 0.06);
  g.restore();
  limb(g, [hip, knee(hip, front, thigh, shin, 1), front], C.trousers, H * 0.085);
  for (const F of [back, front]) { g.fillStyle = C.shoe; g.beginPath(); g.ellipse(F.x + H * 0.03, F.y - H * 0.015, H * 0.06, H * 0.025, 0, 0, TAU); g.fill(); }
  limb(g, [hip, sh], C.shirt, H * 0.17);
  // the string, then the bow over it
  g.strokeStyle = E.night ? '#d8d4cc' : '#f4f1ea'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(top.x, top.y); if (!loosed) g.lineTo(draw.x, draw.y); g.lineTo(bot.x, bot.y); g.stroke();
  g.strokeStyle = E.night ? '#8a6a4a' : '#5a3a22'; g.lineWidth = Math.max(1.8, H * 0.025); g.lineCap = 'round';
  g.beginPath(); g.moveTo(top.x + ca * L * 0.08, top.y - sa * L * 0.08); g.quadraticCurveTo(bowHand.x + ca * L * flex, bowHand.y - sa * L * flex, bot.x + ca * L * 0.08, bot.y - sa * L * 0.08); g.stroke();
  g.fillStyle = '#2b2628'; g.beginPath(); g.arc(bowHand.x, bowHand.y, H * 0.025, 0, TAU); g.fill();
  // the bow arm straight out; the drawing arm folded back to the cheek
  limb(g, [sh, bowHand], C.skin, H * 0.055);
  const elbow = { x: draw.x - H * 0.12, y: draw.y + (loosed ? -H * 0.02 : H * 0.02) };
  limb(g, [{ x: sh.x - H * 0.01, y: sh.y + H * 0.01 }, elbow, draw], C.skinFar, H * 0.05);
  limb(g, [sh, { x: lerp(sh.x, elbow.x, 0.5), y: lerp(sh.y, elbow.y, 0.5) }], C.shirt, H * 0.07);
  g.fillStyle = C.skin; g.beginPath(); g.arc(draw.x, draw.y, H * 0.03, 0, TAU); g.fill();
  head(g, sh.x + H * 0.04, sh.y - H * 0.11, H * 0.075, C, null);
}

/** Where a server's racquet meets the ball, and a batter's bat: from the
    feet, as fractions of the height (x ahead, y up). */
export const SERVE_AT = { x: 0.17, y: 1.42 }, BAT_AT = { x: 0.43, y: 0.55 };

/** A tennis player serving: the ball tossed up, the racquet dropped behind
    the back (pose 0), swung up to meet the ball at full stretch above and
    ahead (0.5), and down across the body in the follow-through (1). */
export function server(g, X, Y, H, P, { pose = 0, ring = null } = {}) {
  const C = colours(ring), E = env(), u = Math.max(0, Math.min(1, pose)), shirt = ring || (E.night ? '#c8ccd2' : '#f4f1ea');
  softShadow(g, X, Y + 1, H * 0.3, H * 0.05, 0.8);
  const lean = u < 0.5 ? lerp(-0.25, 0.1, u / 0.5) : lerp(0.1, 0.35, (u - 0.5) / 0.5);
  const back = { x: X - H * 0.12, y: Y }, front = { x: X + H * 0.12, y: Y };
  const hip = { x: X, y: Y - H * 0.5 }, sh = { x: hip.x + Math.sin(lean) * H * 0.3 + H * 0.02, y: hip.y - Math.cos(lean) * H * 0.3 };
  const thigh = H * 0.25, shin = H * 0.26;
  limb(g, [hip, knee(hip, back, thigh, shin, 1), back], C.skinFar, H * 0.065);
  limb(g, [hip, knee(hip, front, thigh, shin, 1), front], C.skin, H * 0.07);
  for (const F of [back, front]) { g.fillStyle = '#f2f2f0'; g.beginPath(); g.ellipse(F.x + H * 0.03, F.y - H * 0.015, H * 0.06, H * 0.025, 0, 0, TAU); g.fill(); }
  g.fillStyle = E.night ? '#3a3e48' : '#2f3340'; g.beginPath(); g.moveTo(hip.x - H * 0.09, hip.y - H * 0.02); g.lineTo(hip.x + H * 0.09, hip.y - H * 0.02); g.lineTo(hip.x + H * 0.1, hip.y + H * 0.12); g.lineTo(hip.x - H * 0.1, hip.y + H * 0.12); g.closePath(); g.fill();
  limb(g, [hip, sh], shirt, H * 0.16);
  // the tossing arm: straight up as the ball goes up, down once it is struck
  const toss = u < 0.55 ? { x: sh.x + H * 0.05, y: sh.y - H * 0.32 } : { x: sh.x + H * 0.08, y: sh.y + H * 0.25 };
  limb(g, [sh, toss], C.skinFar, H * 0.05);
  // the racquet arm and racquet in one line from the shoulder, swinging round
  const phi = u < 0.5 ? lerp(-2.7, 0.2, (u / 0.5) ** 1.4) : lerp(0.2, 2.5, (u - 0.5) / 0.5);
  const dir = { x: Math.sin(phi), y: -Math.cos(phi) }, hand = { x: sh.x + dir.x * H * 0.33, y: sh.y + dir.y * H * 0.33 };
  limb(g, [sh, hand], C.skin, H * 0.055);
  const head = { x: hand.x + dir.x * H * 0.36, y: hand.y + dir.y * H * 0.36 };
  g.strokeStyle = '#2b2628'; g.lineWidth = Math.max(1.5, H * 0.02); g.beginPath(); g.moveTo(hand.x, hand.y); g.lineTo(hand.x + dir.x * H * 0.2, hand.y + dir.y * H * 0.2); g.stroke();
  g.save(); g.translate(head.x, head.y); g.rotate(Math.atan2(dir.y, dir.x));
  g.strokeStyle = E.night ? '#8a8e96' : '#2f5fa8'; g.lineWidth = Math.max(1.6, H * 0.022); g.beginPath(); g.ellipse(-H * 0.06, 0, H * 0.1, H * 0.07, 0, 0, TAU); g.stroke();
  g.strokeStyle = withAlpha(E.night ? '#c8ccd2' : '#ffffff', 0.7); g.lineWidth = 0.7; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-H * 0.15, i * H * 0.022); g.lineTo(H * 0.03, i * H * 0.022); g.stroke(); g.beginPath(); g.moveTo(-H * 0.06 + i * H * 0.03, -H * 0.06); g.lineTo(-H * 0.06 + i * H * 0.03, H * 0.06); g.stroke(); }
  g.restore();
  head_(g, sh.x + H * 0.03, sh.y - H * 0.1, H * 0.075, C, E.night ? '#c9c2b6' : '#ffffff');
}

/** A batter side on: feet apart, knees bent, the bat held in both hands,
    cocked up behind the head (pose 0), swung level through the ball at
    waist height (0.5), and on round over the shoulder (1). `bat` is
    'cricket' (a flat willow blade) or 'baseball' (a round tapered bat). */
export function batter(g, X, Y, H, P, { pose = 0, ring = null, bat = 'baseball' } = {}) {
  const C = colours(ring), E = env(), u = Math.max(0, Math.min(1, pose)), shirt = ring || (bat === 'cricket' ? (E.night ? '#c8ccd2' : '#f4f1ea') : (E.night ? '#3a4a6a' : '#2f5fa8'));
  softShadow(g, X, Y + 1, H * 0.3, H * 0.05, 0.8);
  const back = { x: X - H * 0.16, y: Y }, front = { x: X + H * 0.18, y: Y };
  const hip = { x: X, y: Y - H * 0.47 }, sh = { x: X + H * 0.03, y: Y - H * 0.76 };
  const thigh = H * 0.25, shin = H * 0.25, trousers = bat === 'cricket' ? (E.night ? '#c8ccd2' : '#f4f1ea') : (E.night ? '#8a8e96' : '#e8e8ea');
  limb(g, [hip, knee(hip, back, thigh, shin, 1), back], trousers, H * 0.08);
  limb(g, [hip, knee(hip, front, thigh, shin, 1), front], trousers, H * 0.085);
  if (bat === 'cricket') for (const F of [back, front]) { g.fillStyle = E.night ? '#d8d8dc' : '#ffffff'; g.fillRect(F.x - H * 0.04, F.y - H * 0.26, H * 0.08, H * 0.22); }
  for (const F of [back, front]) { g.fillStyle = C.shoe; g.beginPath(); g.ellipse(F.x + H * 0.03, F.y - H * 0.015, H * 0.06, H * 0.025, 0, 0, TAU); g.fill(); }
  limb(g, [hip, sh], shirt, H * 0.17);
  // the bat's angle from level-forward, up positive: cocked back, level at the ball, round over
  const a = u < 0.5 ? lerp(2.4, 0, (u / 0.5) ** 1.4) : lerp(0, 2.7, ((u - 0.5) / 0.5) ** 0.8);
  const hands = { x: X + lerp(-0.05, 0.15, Math.min(1, u * 2)) * H - (u > 0.5 ? (u - 0.5) * 0.2 * H : 0), y: Y - lerp(0.82, 0.55, Math.min(1, u * 2)) * H - (u > 0.5 ? (u - 0.5) * 0.4 * H : 0) };
  limb(g, [sh, { x: (sh.x + hands.x) / 2 - H * 0.04, y: (sh.y + hands.y) / 2 + H * 0.04 }, hands], C.skin, H * 0.055);
  const d = { x: Math.cos(a), y: -Math.sin(a) }, L = H * 0.42;
  g.save(); g.translate(hands.x, hands.y); g.rotate(Math.atan2(d.y, d.x));
  if (bat === 'cricket') {
    g.fillStyle = '#2b2628'; g.fillRect(-H * 0.05, -H * 0.012, H * 0.12, H * 0.024);
    g.fillStyle = E.night ? '#b8a07a' : '#e8d2a0'; g.beginPath(); g.roundRect(H * 0.07, -H * 0.04, L - H * 0.07, H * 0.08, H * 0.02); g.fill();
    g.fillStyle = withAlpha('#000000', 0.15); g.fillRect(H * 0.07, H * 0.015, L - H * 0.07, H * 0.025);
  } else {
    g.fillStyle = E.night ? '#a8885a' : '#c99a5c'; g.beginPath(); g.moveTo(-H * 0.04, -H * 0.014); g.lineTo(L, -H * 0.035); g.quadraticCurveTo(L + H * 0.03, 0, L, H * 0.035); g.lineTo(-H * 0.04, H * 0.014); g.closePath(); g.fill();
    g.fillStyle = withAlpha('#ffffff', 0.3); g.fillRect(H * 0.05, -H * 0.022, L * 0.8, H * 0.01);
  }
  g.restore();
  // the helmet
  head_(g, sh.x + H * 0.05, sh.y - H * 0.1, H * 0.078, C, bat === 'cricket' ? (E.night ? '#3a4a6a' : '#2f3a5a') : (E.night ? '#3a4a6a' : '#1f3a6a'));
  if (bat === 'cricket') { g.strokeStyle = '#8a9098'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(sh.x + H * 0.08, sh.y - H * 0.13 + i * H * 0.03); g.lineTo(sh.x + H * 0.14, sh.y - H * 0.12 + i * H * 0.03); g.stroke(); } }
}
const head_ = head;
/** A basketball player taking a set shot, side on: knees bent and the ball
    at the forehead as it starts (pose 0), legs and arms extending until the
    shooting hand is up and forward at the release, the ball leaving it at
    SHOOT_AT (0.5), and the wrist flicked through, arm held up (1). The guide
    hand comes off the ball at the release. In a vest and shorts. */
export const SHOOT_AT = { x: 0.16, y: 1.2 };
export function shooter(g, X, Y, H, P, { pose = 0, ring = null, ball = null } = {}) {
  const C = colours(ring), E = env(), u = Math.max(0, Math.min(1, pose)), vest = ring || (E.night ? '#3a4a7a' : '#2f5fa8'), shorts = E.night ? '#1e2236' : '#1b2a4a';
  const ext = Math.min(1, u / 0.5);
  softShadow(g, X, Y + 1, H * 0.28, H * 0.05, 0.8);
  // the legs: knees bent at the start, straightening to the release
  const sink = lerp(0.1, 0, ext) * H;
  const hip = { x: X - H * 0.02, y: Y - H * 0.5 + sink }, back = { x: X - H * 0.08, y: Y }, front = { x: X + H * 0.07, y: Y };
  const thigh = H * 0.25, shin = H * 0.26;
  limb(g, [hip, knee(hip, back, thigh, shin, 1), back], C.skinFar, H * 0.065);
  limb(g, [hip, knee(hip, front, thigh, shin, 1), front], C.skin, H * 0.07);
  for (const F of [back, front]) { g.fillStyle = '#f2f2f0'; g.beginPath(); g.ellipse(F.x + H * 0.03, F.y - H * 0.015, H * 0.065, H * 0.028, 0, 0, TAU); g.fill(); g.strokeStyle = '#2b2628'; g.lineWidth = 1; g.stroke(); }
  // the shorts, darker than the vest, a leg each, to the knee
  for (const F of [back, front]) { const kn = knee(hip, F, thigh, shin, 1); limb(g, [hip, { x: lerp(hip.x, kn.x, 0.75), y: lerp(hip.y, kn.y, 0.75) }], shorts, H * 0.1); }
  const sh = { x: hip.x + H * 0.06, y: hip.y - H * 0.27 };
  limb(g, [hip, { x: sh.x - H * 0.01, y: sh.y }], vest, H * 0.17);
  g.fillStyle = withAlpha('#ffffff', 0.85); g.fillRect(sh.x - H * 0.05, sh.y + H * 0.08, H * 0.08, H * 0.05);
  head(g, sh.x - H * 0.01, sh.y - H * 0.12, H * 0.075, C, null);
  // the shooting hand: from the forehead up and forward to the release point (or to where the ball
  // is, if the figure is drawn larger than to scale), then the wrist flicks over
  const rel = ball ?? { x: X + SHOOT_AT.x * H, y: Y - SHOOT_AT.y * H };
  const start = { x: sh.x + H * 0.08, y: sh.y - H * 0.12 + sink * 0.2 };
  const hand = u <= 0.5 && !ball ? { x: lerp(start.x, rel.x, ext), y: lerp(start.y, rel.y, ext) } : rel;
  const elbow = { x: lerp(sh.x + H * 0.14, (sh.x + hand.x) / 2 + H * 0.03, ext), y: lerp(sh.y - H * 0.02, (sh.y + hand.y) / 2 + H * 0.02, ext) };
  // the guide hand on the ball's side, its elbow out behind; it drops away once the ball goes
  const holding = u <= 0.5, guide = holding ? { x: hand.x - H * 0.07, y: hand.y + H * 0.06 } : { x: sh.x + H * 0.12, y: sh.y - H * 0.05 };
  limb(g, [sh, { x: holding ? guide.x - H * 0.12 : sh.x + H * 0.04, y: holding ? (sh.y + guide.y) / 2 : sh.y + H * 0.08 }, guide], C.skinFar, H * 0.05);
  limb(g, [sh, elbow, hand], C.skin, H * 0.055);
  // the wrist flicked through after the release: the fingers bent down
  if (u > 0.5) { const f = (u - 0.5) / 0.5, a = lerp(0, Math.PI / 3, f); g.strokeStyle = C.skin; g.lineWidth = H * 0.05; g.lineCap = 'round'; g.beginPath(); g.moveTo(hand.x, hand.y); g.lineTo(hand.x + Math.cos(a) * H * 0.07, hand.y + Math.sin(a) * H * 0.07); g.stroke(); }
}

