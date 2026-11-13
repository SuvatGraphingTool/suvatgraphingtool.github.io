// cricket.js — a cricket match's people and its boundary, side on, for any
// stage that needs them.
//
//   cricketBatter(g, X, Y, H, o)   a batter in whites, pads, gloves and a
//                                  helmet with its grille, driving: the bat
//                                  up behind (pose 0), down through the ball
//                                  (0.5), and on over the shoulder (1)
//   batContact(H)                  where the bat meets the ball at 0.5, from the feet
//   fielder(g, X, Y, H, o)         a fielder in whites and a sun hat, facing
//                                  the batter: ready, reaching, leaping or
//                                  stooping, hands open or closed on the ball
//   boundaryRope(g, x, oy, h, horizon, o)  the padded rope crossing the outfield
//   boundaryStand(g, x0, oy, w, k, o)      the boards behind the rope and a raked
//                                  stand with its crowd, rising away to the right
//
// Each stands with its feet on the ground at (X, Y), `H` px tall, facing +x
// (the fielder faces −x, back towards the batter). Nothing here is a
// quantity: the stage poses them from the engine's own times (rule 4).

import { env, rng, softShadow } from './scenery.js';
import { withAlpha } from './util.js';
import { crowd } from './places.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (u) => u * u * (3 - 2 * u);

/** The middle joint of a limb from a to b, bent to one side (side ±1). */
function joint(a, b, l1, l2, side = 1) {
  const dx = b.x - a.x, dy = b.y - a.y, dd = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const ang = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd))));
  return { x: a.x + Math.cos(ang - side * c) * l1, y: a.y + Math.sin(ang - side * c) * l1 };
}
/** The middle joint of a limb, on whichever side `prefer` picks of the two it could be on. */
function bend(a, b, l1, l2, prefer) {
  const p = joint(a, b, l1, l2, 1), q = joint(a, b, l1, l2, -1);
  return prefer(p, q) ? p : q;
}
const lower = (p, q) => p.y >= q.y;
/** b, pulled back towards a if a limb of total length L cannot reach it. */
function reach(a, b, L) {
  const dd = Math.hypot(b.x - a.x, b.y - a.y);
  return dd <= L ? b : { x: a.x + (b.x - a.x) * L / dd, y: a.y + (b.y - a.y) * L / dd };
}
function limb(g, pts, color, w, cap = 'round') {
  g.strokeStyle = color; g.lineWidth = w; g.lineCap = cap; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.stroke();
}
/** A tapering limb a → j → b: w1 at a, w2 at b, rounded at the joint. */
function taper(g, a, j, b, color, w1, w2) {
  g.fillStyle = color;
  const seg = (p, q, wa, wb) => {
    const ang = Math.atan2(q.y - p.y, q.x - p.x), nx = -Math.sin(ang), ny = Math.cos(ang);
    g.beginPath(); g.moveTo(p.x + nx * wa / 2, p.y + ny * wa / 2); g.lineTo(q.x + nx * wb / 2, q.y + ny * wb / 2);
    g.lineTo(q.x - nx * wb / 2, q.y - ny * wb / 2); g.lineTo(p.x - nx * wa / 2, p.y - ny * wa / 2); g.closePath(); g.fill();
    g.beginPath(); g.arc(p.x, p.y, wa / 2, 0, TAU); g.fill();
  };
  const wj = (w1 + w2) / 2;
  seg(a, j, w1, wj); seg(j, b, wj, w2);
  g.beginPath(); g.arc(j.x, j.y, wj / 2, 0, TAU); g.fill(); g.beginPath(); g.arc(b.x, b.y, w2 / 2, 0, TAU); g.fill();
}
/** A limb drawn twice: its colour, then a lit edge along its upper side. */
function shadedLimb(g, pts, color, lit, w) {
  limb(g, pts, color, w);
  g.save(); g.translate(-w * 0.18, -w * 0.18); limb(g, pts, lit, w * 0.35); g.restore();
}

function kit() {
  const n = env().night;
  return {
    n,
    whites: n ? '#c9ccd2' : '#f6f3ea', whitesLo: n ? '#9a9ea8' : '#d9d3c4', whitesHi: n ? '#e0e2e6' : '#ffffff',
    skin: n ? '#a9846e' : '#d6a283', skinLo: n ? '#7d6253' : '#b07c5e',
    shoe: n ? '#d0d2d6' : '#fbfbf8', sole: '#2b2628',
    navy: n ? '#33415e' : '#1f2f52', trim: n ? '#4a5a7a' : '#2f5fa8',
    willow: n ? '#bfa57a' : '#ecd5a3', willowLo: n ? '#957d58' : '#c9a86e', grip: n ? '#6a2f34' : '#9c2b31',
    pad: n ? '#d8dade' : '#ffffff', padLine: n ? '#a4a8b0' : '#cfcac0',
    glove: n ? '#d8dade' : '#ffffff', gloveRoll: n ? '#3e6a58' : '#2f8a5f',
    hat: n ? '#c3c0b2' : '#efe6cc', hatBand: n ? '#33415e' : '#1f2f52',
  };
}

/* ── the batter ─────────────────────────────────────────────────────────── */

const BAT = 0.48;           // bat length, of the height (0.86 m to a 1.8 m batter)
const SWEET = 0.86;         // where on the bat the ball is met, from the hands
/** The swing at pose u: the hands, the bat's direction (radians from forward, up positive), the lean. */
function swing(u) {
  u = clamp01(u);
  // the bat's angle turns one way all through: up behind, down at the ball, forward and up over the shoulder
  const a = u < 0.5 ? lerp(1.95, 5.15, ease(u / 0.5) ** 1.15) : lerp(5.15, 8.75, ease((u - 0.5) / 0.5) ** 0.85);
  const hands = u < 0.5
    ? { x: lerp(-0.1, 0.17, ease(u / 0.5)), y: lerp(0.88, 0.5, ease(u / 0.5)) }
    : { x: lerp(0.17, 0.07, ease((u - 0.5) / 0.5)), y: lerp(0.5, 0.93, ease((u - 0.5) / 0.5)) };
  const lean = u < 0.5 ? lerp(0.01, 0.075, ease(u / 0.5)) : lerp(0.075, 0.03, ease((u - 0.5) / 0.5));
  return { a, hands, lean };
}
/** Where the bat meets the ball at the moment of the strike, from the feet, in units of the height (y up). */
export function batContact(H = 1) {
  const s = swing(0.5);
  return { x: (s.hands.x + Math.cos(s.a) * BAT * SWEET) * H, y: (s.hands.y + Math.sin(s.a) * BAT * SWEET) * H };
}

/**
 * A right-handed batter side on, in whites, pads and a helmet, driving the
 * ball back over the bowler's head. Feet at (X, Y), H px tall, facing +x.
 * @param o { pose: 0 the bat up behind, 0.5 through the ball, 1 the follow-through }
 */
export function cricketBatter(g, X, Y, H, { pose = 0, smear = 0 } = {}) {
  const C = kit(), s = swing(pose), u = clamp01(pose);
  const P = (x, y) => ({ x: X + x * H, y: Y - y * H });
  softShadow(g, X + H * 0.02, Y + 1, H * 0.34, H * 0.05, 0.85);
  // the downswing just gone (`smear` 0..1, fading): a swept fan from the grip, from the bat up
  // behind round to the ball, brightening towards the contact, and ghost bats along it
  if (smear > 0) {
    const hd = P(s.hands.x, s.hands.y), a0 = swing(0).a, a1 = swing(0.5).a, R0 = BAT * H * 0.3, R1 = BAT * H;
    const n = 14, k = clamp01(smear);
    for (let i = 0; i < n; i++) {
      const p = i / n, q = (i + 1) / n, b0 = a0 + (a1 - a0) * p, b1 = a0 + (a1 - a0) * q;
      g.fillStyle = withAlpha(C.willow, 0.35 * q * q * k);
      g.beginPath(); g.arc(hd.x, hd.y, R1, -b0, -b1, true); g.arc(hd.x, hd.y, R0, -b1, -b0, false); g.closePath(); g.fill();
    }
    g.strokeStyle = withAlpha(C.willowLo, 0.5 * k); g.lineWidth = Math.max(1, H * 0.01);
    g.beginPath(); g.arc(hd.x, hd.y, R1, -a0, -a1, true); g.stroke();
    for (const [q, al] of [[0.3, 0.16], [0.55, 0.24], [0.78, 0.34]]) {
      const b = a0 + (a1 - a0) * q, dd = { x: Math.cos(b), y: -Math.sin(b) };
      g.strokeStyle = withAlpha(C.willow, al * k); g.lineCap = 'round'; g.lineWidth = H * 0.05;
      g.beginPath(); g.moveTo(hd.x, hd.y); g.lineTo(hd.x + dd.x * R1, hd.y + dd.y * R1); g.stroke();
    }
  }
  // the stride: the front foot out down the pitch, its knee bending into the shot
  const stride = u < 0.5 ? lerp(0.15, 0.27, ease(u / 0.5)) : 0.27;
  // the back heel lifts as the weight goes through, pivoting on its toe
  const heel = u > 0.5 ? ease((u - 0.5) / 0.5) : 0;
  const back = P(-0.16 + 0.03 * heel, 0.025 * heel), front = P(stride, 0);
  const hip = P(lerp(-0.01, 0.05, u), lerp(0.5, 0.42, Math.min(1, u * 2)) + 0.03 * heel);
  const sh = { x: hip.x + s.lean * H, y: hip.y - 0.28 * H };
  const thigh = H * 0.245, shin = H * 0.245;
  const kneeB = joint(hip, back, thigh, shin, 1), kneeF = joint(hip, front, thigh, shin, 1);

  // the legs: whites, then the pads over the shins and knees, then the boots
  const leg = (knee, foot, far) => {
    shadedLimb(g, [hip, knee], far ? C.whitesLo : C.whites, C.whitesHi, H * 0.095);
    const dx = foot.x - knee.x, dy = foot.y - knee.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    g.save(); g.translate(knee.x, knee.y); g.rotate(ang);
    const pw = H * 0.088, top = -H * 0.06;
    const pg = g.createLinearGradient(0, -pw / 2, 0, pw / 2);
    pg.addColorStop(0, C.pad); pg.addColorStop(1, far ? C.padLine : C.whitesLo);
    g.fillStyle = pg; g.beginPath(); g.roundRect(top, -pw / 2, len - top - H * 0.02, pw, pw * 0.35); g.fill();
    // the knee roll, and the canes down the pad
    g.fillStyle = C.pad; g.beginPath(); g.ellipse(H * 0.005, 0, H * 0.04, pw * 0.58, 0, 0, TAU); g.fill();
    g.strokeStyle = C.padLine; g.lineWidth = Math.max(0.6, H * 0.006);
    for (const k of [-0.25, 0, 0.25]) { g.beginPath(); g.moveTo(H * 0.05, k * pw); g.lineTo(len - H * 0.04, k * pw); g.stroke(); }
    // the straps
    g.strokeStyle = C.navy; g.lineWidth = Math.max(0.8, H * 0.01);
    for (const f of [0.35, 0.7]) { g.beginPath(); g.moveTo(len * f, -pw / 2); g.lineTo(len * f, pw / 2); g.stroke(); }
    g.restore();
    // the boot, spikes under it; the back one up on its toe as the heel lifts
    const tip = far ? heel * 0.55 : 0;
    g.save(); g.translate(foot.x + H * 0.035, foot.y - H * 0.018); g.rotate(tip);
    g.fillStyle = C.shoe; g.beginPath(); g.ellipse(0, 0, H * 0.062, H * 0.024, 0, 0, TAU); g.fill();
    g.fillStyle = C.sole; g.fillRect(-H * 0.055, H * 0.012, H * 0.11, Math.max(1, H * 0.008));
    g.restore();
  };
  leg(kneeB, back, true);
  // the far arm behind the body
  const hands = P(s.hands.x, s.hands.y);
  const shF = { x: sh.x + H * 0.015, y: sh.y + H * 0.01 }, ua = H * 0.19, fa = H * 0.18;
  const handB = reach(shF, { x: hands.x - H * 0.01, y: hands.y + H * 0.02 }, ua + fa);
  shadedLimb(g, [shF, bend(shF, handB, ua, fa, lower), handB], C.whitesLo, C.whites, H * 0.064);
  // the torso: the shirt, shaded down its back
  const tg = g.createLinearGradient(hip.x - H * 0.08, 0, hip.x + H * 0.08, 0);
  tg.addColorStop(0, C.whitesLo); tg.addColorStop(0.6, C.whites); tg.addColorStop(1, C.whitesHi);
  g.fillStyle = tg; g.beginPath();
  g.moveTo(hip.x - H * 0.07, hip.y + H * 0.02); g.lineTo(sh.x - H * 0.075, sh.y + H * 0.01);
  g.quadraticCurveTo(sh.x, sh.y - H * 0.05, sh.x + H * 0.075, sh.y + H * 0.02);
  g.lineTo(hip.x + H * 0.07, hip.y + H * 0.02); g.closePath(); g.fill();
  g.fillStyle = C.navy; g.fillRect(hip.x - H * 0.072, hip.y - H * 0.005, H * 0.144, Math.max(1, H * 0.018));
  leg(kneeF, front, false);
  // the bat: handle and grip, the splice, the blade with its edge and a band of colour
  const dir = { x: Math.cos(s.a), y: -Math.sin(s.a) };
  g.save(); g.translate(hands.x, hands.y); g.rotate(Math.atan2(dir.y, dir.x));
  const L = BAT * H, hl = L * 0.34, bw = H * 0.058;
  g.fillStyle = C.grip; g.beginPath(); g.roundRect(-H * 0.035, -H * 0.012, hl + H * 0.035, H * 0.024, H * 0.01); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = Math.max(0.5, H * 0.004);
  for (let i = 0; i < 6; i++) { const x = -H * 0.025 + i * hl / 6; g.beginPath(); g.moveTo(x, -H * 0.012); g.lineTo(x + H * 0.01, H * 0.012); g.stroke(); }
  const bgr = g.createLinearGradient(0, -bw / 2, 0, bw / 2);
  bgr.addColorStop(0, C.willow); bgr.addColorStop(0.7, C.willow); bgr.addColorStop(1, C.willowLo);
  g.fillStyle = bgr; g.beginPath();
  g.moveTo(hl - H * 0.01, -bw * 0.32); g.lineTo(hl + H * 0.03, -bw / 2); g.lineTo(L - H * 0.012, -bw / 2);
  g.quadraticCurveTo(L, -bw / 2, L, -bw * 0.3); g.lineTo(L, bw * 0.3); g.quadraticCurveTo(L, bw / 2, L - H * 0.012, bw / 2);
  g.lineTo(hl + H * 0.03, bw / 2); g.lineTo(hl - H * 0.01, bw * 0.32); g.closePath(); g.fill();
  // the splice, and a band of colour across the blade
  g.fillStyle = C.willowLo; g.beginPath(); g.moveTo(hl - H * 0.01, -bw * 0.25); g.lineTo(hl + H * 0.06, 0); g.lineTo(hl - H * 0.01, bw * 0.25); g.closePath(); g.fill();
  g.fillStyle = C.trim; g.fillRect(hl + L * 0.2, -bw / 2, L * 0.14, bw);
  g.fillStyle = withAlpha('#ffffff', 0.6); g.fillRect(hl + L * 0.23, -bw * 0.18, L * 0.08, bw * 0.36);
  g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(hl + H * 0.03, bw * 0.22, L - hl - H * 0.04, bw * 0.28);
  g.restore();
  // the near arm over it, the gloves on the handle
  const handF = reach(sh, hands, ua + fa);
  shadedLimb(g, [sh, bend(sh, handF, ua, fa, lower), handF], C.whites, C.whitesHi, H * 0.066);
  // the gloves: padded mitts round the handle, their finger rolls across it, a cuff at the wrist
  for (const k of [0, 0.085]) {
    g.save(); g.translate(hands.x + dir.x * H * k, hands.y + dir.y * H * k); g.rotate(Math.atan2(dir.y, dir.x));
    g.fillStyle = C.glove; g.beginPath(); g.roundRect(-H * 0.035, -H * 0.04, H * 0.07, H * 0.08, H * 0.022); g.fill();
    g.strokeStyle = C.padLine; g.lineWidth = Math.max(0.6, H * 0.006);
    for (const r of [-0.018, 0, 0.018]) { g.beginPath(); g.moveTo(-H * 0.03 + (r + 0.018) * H * 0.2, -H * 0.036); g.lineTo(-H * 0.03 + (r + 0.018) * H * 0.2, H * 0.036); g.stroke(); }
    for (const r of [-0.016, 0.004, 0.024]) { g.beginPath(); g.moveTo(r * H, -H * 0.035); g.lineTo(r * H, H * 0.035); g.stroke(); }
    g.fillStyle = C.gloveRoll; g.fillRect(-H * 0.04, -H * 0.04, H * 0.016, H * 0.08);
    g.restore();
  }
  // the head in its helmet: the face behind a steel grille, the peak, the neck guard
  const hx0 = sh.x + H * 0.045, hy0 = sh.y - H * 0.105, hr = H * 0.075;
  // the head turns up the line of the shot as it follows through
  g.save(); g.translate(hx0, hy0); g.rotate(-0.55 * heel); g.translate(-hx0, -hy0);
  const hx = hx0, hy = hy0;
  g.fillStyle = C.skin; g.beginPath(); g.arc(hx + hr * 0.25, hy + hr * 0.15, hr * 0.85, 0, TAU); g.fill();
  const hg = g.createRadialGradient(hx - hr * 0.3, hy - hr * 0.5, hr * 0.1, hx, hy, hr * 1.1);
  hg.addColorStop(0, C.trim); hg.addColorStop(1, C.navy);
  g.fillStyle = hg; g.beginPath(); g.arc(hx - hr * 0.08, hy - hr * 0.1, hr, Math.PI * 0.92, Math.PI * 2.08); g.closePath(); g.fill();
  g.fillRect(hx - hr * 1.02, hy - hr * 0.2, hr * 0.55, hr * 0.85);
  g.fillStyle = C.navy; g.beginPath(); g.moveTo(hx + hr * 0.6, hy - hr * 0.25); g.lineTo(hx + hr * 1.45, hy - hr * 0.05); g.lineTo(hx + hr * 0.7, hy + hr * 0.05); g.closePath(); g.fill();
  g.strokeStyle = C.n ? '#9aa0a8' : '#8a9098'; g.lineWidth = Math.max(0.7, H * 0.008);
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(hx + hr * 0.75, hy + hr * (0.12 + i * 0.32)); g.lineTo(hx + hr * 1.18, hy + hr * (0.05 + i * 0.32)); g.stroke(); }
  g.beginPath(); g.moveTo(hx + hr * 1.18, hy); g.lineTo(hx + hr * 1.05, hy + hr * 0.85); g.stroke();
  g.restore();
}

/* ── the fielder ────────────────────────────────────────────────────────── */

/** How high a fielder's hands reach standing, of the height. */
export const FIELDER_REACH = 1.24;

/**
 * A fielder in whites and a sun hat, facing back towards the batter (−x).
 * Feet at (X, Y), H px tall.
 * @param o { hands: { x, y } where the hands go, in px (null: ready, low in front),
 *            closed: 0..1 the hands closing on a ball, leap: px the feet leave the ground,
 *            crouch: 0..1 the knees bent, gait: 0..1 through two short steps (null: standing),
 *            look: { x, y } px the face turns to, onKnees: hands on the knees,
 *            holding: draws the ball, between the palms and the fingers that close on it }
 */
export function fielder(g, X, Y, H, { hands = null, closed = 0, leap = 0, crouch = 0.35, gait = null, look = null, onKnees = false, holding = null } = {}) {
  const C = kit();
  softShadow(g, X, Y + 1, H * Math.max(0.12, 0.3 - (leap / H) * 0.4), H * 0.05, Math.max(0.3, 0.9 - leap / H));
  const y0 = Y - leap, c = clamp01(crouch);
  // the feet: one ahead, one behind; in two short steps each lifts and passes in turn
  const fF = { x: X - H * 0.13, y: y0 }, fB = { x: X + H * 0.12, y: y0 };
  if (gait != null && leap <= 0) {
    const ph = clamp01(gait) * 2, k = ph % 1, lift = Math.sin(k * Math.PI) * H * 0.06, f = Math.floor(ph) % 2 ? fF : fB;
    f.y -= lift; f.x += (k - 0.5) * H * 0.12;
  }
  if (leap > 0) { const tuck = Math.min(1, leap / (H * 0.2)); fF.y -= H * 0.05 * tuck; fB.y -= H * 0.13 * tuck; fB.x += H * 0.04 * tuck; }
  // the hips back and down as the knees bend; the chest forward over them
  const hip = { x: X + H * 0.05 * c, y: y0 - H * (0.53 - 0.13 * c) };
  const sh = { x: hip.x - H * (0.03 + 0.11 * c), y: hip.y - H * (0.3 - 0.03 * c) };
  const thigh = H * 0.25, shin = H * 0.255;
  const knees = [fB, fF].map((foot) => bend(hip, foot, thigh, shin, (p, q) => p.x <= q.x));   // knees forward, towards −x
  const leg = (foot, knee, far) => {
    taper(g, hip, knee, foot, far ? C.whitesLo : C.whites, H * 0.125, H * 0.07);
    g.save(); g.translate(-H * 0.012, -H * 0.006); taper(g, hip, knee, foot, withAlpha(C.whitesHi, 0.55), H * 0.04, H * 0.022); g.restore();
    // the boot, toe forward, its spikes
    g.fillStyle = C.shoe; g.beginPath(); g.ellipse(foot.x - H * 0.03, foot.y - H * 0.022, H * 0.068, H * 0.027, 0, 0, TAU); g.fill();
    g.fillStyle = C.sole; g.fillRect(foot.x - H * 0.098, foot.y - H * 0.006, H * 0.115, Math.max(1, H * 0.01));
  };
  // the hands: low in front, on the knees, or out to the ball
  const ua = H * 0.19, fa = H * 0.18, arm = ua + fa - 0.5;
  const want = onKnees ? { x: knees[1].x - H * 0.02, y: knees[1].y + H * 0.01 }
    : hands ?? { x: hip.x - H * 0.24, y: hip.y + H * 0.04 };
  const shN = { x: sh.x - H * 0.015, y: sh.y + H * 0.005 }, shFar = { x: sh.x + H * 0.02, y: sh.y };
  const handN = reach(shN, want, arm), handF = reach(shFar, { x: want.x + H * 0.035, y: want.y + H * 0.05 }, arm);
  // elbows down and out to a low ball; to a high one, out in front of the face
  const elbow = want.y > sh.y - H * 0.05 ? lower : (p, q) => p.x <= q.x;
  /** A mitt pointing along the forearm (e → h): palm, fingers that curl as it closes, a thumb. */
  const mitt = (e, h, skin, far) => {
    const a = Math.atan2(h.y - e.y, h.x - e.x), s = H * 0.032, cl = clamp01(closed);
    g.save(); g.translate(h.x, h.y); g.rotate(a);
    g.fillStyle = skin; g.beginPath(); g.ellipse(0, 0, s * 1.15, s * 0.9, 0, 0, TAU); g.fill();
    // the fingers, straight out and open, then curled over
    g.beginPath(); g.ellipse(s * lerp(1.25, 0.95, cl), -s * lerp(0.05, 0.45, cl), s * lerp(0.95, 0.65, cl), s * 0.62, -lerp(0, 0.9, cl), 0, TAU); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.18); g.lineWidth = Math.max(0.6, H * 0.004);
    for (const k of [-0.25, 0.15]) { g.beginPath(); g.moveTo(s * 0.7, k * s); g.lineTo(s * lerp(2, 1.4, cl), k * s - s * lerp(0, 0.6, cl)); g.stroke(); }
    // the thumb, on the side towards the ball
    g.fillStyle = far ? C.skinLo : C.skin; g.beginPath(); g.ellipse(s * 0.45, s * (far ? 0.85 : -0.85), s * 0.55, s * 0.3, far ? 0.5 : -0.5, 0, TAU); g.fill();
    g.restore();
  };
  // behind the body: the far leg and the far arm
  leg(fB, knees[0], true);
  { const e = bend(shFar, handF, ua, fa, elbow); taper(g, shFar, e, e, C.whitesLo, H * 0.075, H * 0.06); taper(g, e, e, handF, C.skinLo, H * 0.05, H * 0.04); mitt(e, handF, C.skinLo, true); }
  // the shirt: hips, a broad shoulder block, the collar, a belt
  const tg = g.createLinearGradient(hip.x - H * 0.1, 0, hip.x + H * 0.1, 0);
  tg.addColorStop(0, C.whitesHi); tg.addColorStop(0.45, C.whites); tg.addColorStop(1, C.whitesLo);
  g.fillStyle = tg; g.beginPath();
  g.moveTo(hip.x + H * 0.068, hip.y + H * 0.02);
  g.quadraticCurveTo(hip.x + H * 0.08, (hip.y + sh.y) / 2, sh.x + H * 0.09, sh.y + H * 0.03);
  g.quadraticCurveTo(sh.x + H * 0.085, sh.y - H * 0.03, sh.x + H * 0.02, sh.y - H * 0.035);
  g.quadraticCurveTo(sh.x - H * 0.09, sh.y - H * 0.03, sh.x - H * 0.095, sh.y + H * 0.04);
  g.quadraticCurveTo(hip.x - H * 0.085, (hip.y + sh.y) / 2 + H * 0.03, hip.x - H * 0.068, hip.y + H * 0.02);
  g.closePath(); g.fill();
  g.fillStyle = C.navy; g.fillRect(hip.x - H * 0.07, hip.y - H * 0.004, H * 0.14, Math.max(1, H * 0.016));
  // the neck, and the collar's trim
  const hx = sh.x - H * 0.03, hy = sh.y - H * 0.115, hr = H * 0.066;
  g.strokeStyle = C.skinLo; g.lineWidth = H * 0.045; g.lineCap = 'round'; g.beginPath(); g.moveTo(sh.x - H * 0.005, sh.y - H * 0.02); g.lineTo(hx + H * 0.01, hy + hr * 0.6); g.stroke();
  g.strokeStyle = C.trim; g.lineWidth = Math.max(1, H * 0.012); g.beginPath(); g.moveTo(sh.x - H * 0.045, sh.y - H * 0.02); g.lineTo(sh.x - H * 0.005, sh.y + H * 0.03); g.lineTo(sh.x + H * 0.03, sh.y - H * 0.025); g.stroke();
  leg(fF, knees[1], false);
  // the head in its sun hat, turned up to the ball
  const tilt = look == null ? 0.05 : Math.max(-0.35, Math.min(0.75, Math.atan2(hy - look.y, Math.max(H * 0.3, hx - look.x))));
  g.save(); g.translate(hx, hy); g.rotate(tilt);
  const hg = g.createRadialGradient(-hr * 0.3, -hr * 0.3, hr * 0.1, 0, 0, hr);
  hg.addColorStop(0, C.skin); hg.addColorStop(1, C.skinLo);
  g.fillStyle = hg; g.beginPath(); g.arc(0, 0, hr, 0, TAU); g.fill();
  g.fillStyle = C.skin; g.beginPath(); g.moveTo(-hr * 0.9, -hr * 0.1); g.lineTo(-hr * 1.2, hr * 0.14); g.lineTo(-hr * 0.85, hr * 0.27); g.closePath(); g.fill();
  g.fillStyle = '#2b2628'; g.beginPath(); g.arc(-hr * 0.55, -hr * 0.08, Math.max(0.8, hr * 0.12), 0, TAU); g.fill();
  g.fillStyle = C.skinLo; g.beginPath(); g.arc(hr * 0.2, hr * 0.08, hr * 0.2, 0, TAU); g.fill();
  g.fillStyle = C.hat; g.beginPath(); g.ellipse(-hr * 0.1, -hr * 0.45, hr * 1.6, hr * 0.24, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(0, -hr * 0.6, hr * 0.9, hr * 0.58, 0, Math.PI, TAU); g.fill();
  g.fillStyle = C.hatBand; g.fillRect(-hr * 0.9, -hr * 0.74, hr * 1.8, Math.max(1, hr * 0.2));
  g.fillStyle = withAlpha('#000000', 0.12); g.beginPath(); g.ellipse(-hr * 0.1, -hr * 0.38, hr * 1.5, hr * 0.12, 0, 0, Math.PI); g.fill();
  g.restore();
  // the ball, between the far palm and the near hand's fingers
  holding?.();
  // the near arm: short sleeve, forearm, mitt
  { const e = bend(shN, handN, ua, fa, elbow), m = { x: (shN.x + e.x) / 2, y: (shN.y + e.y) / 2 };
    taper(g, e, e, handN, C.skin, H * 0.052, H * 0.042);
    taper(g, shN, m, e, C.whites, H * 0.085, H * 0.064);
    g.save(); g.translate(-H * 0.01, -H * 0.01); taper(g, shN, m, e, withAlpha(C.whitesHi, 0.7), H * 0.03, H * 0.02); g.restore();
    mitt(e, handN, C.skin, false); }
  return { hands: { x: (handN.x + handF.x) / 2, y: (handN.y + handF.y) / 2 } };
}

/* ── the boundary ───────────────────────────────────────────────────────── */

/**
 * The boundary rope where it crosses the outfield at x: a padded rope that
 * runs from the far side of the ground (the horizon) towards the viewer,
 * through (x, oy) where it crosses the line of the motion. `lean`: px it
 * leans over from the horizon to the ground line.
 */
export function boundaryRope(g, x, oy, h, horizon, { back = 120 } = {}) {
  const C = kit(), n = C.n;
  // the boundary is an oval, seen low: its far side along the horizon, its end bulging out to
  // (x, oy), its near side curving back below the bottom of the stage
  const bUp = Math.max(1, oy - horizon - 4), bDown = bUp * 1.7;
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const y = lerp(horizon + 4, h + 6, i / 40), q = (y - oy) / (y < oy ? bUp : bDown);
    pts.push({ x: x - back * (1 - Math.sqrt(Math.max(0, 1 - q * q))), y });
  }
  const thick = (y) => lerp(1.2, 6, clamp01((y - horizon) / Math.max(1, h - horizon)));
  // its shadow on the grass, the rope, the light along its top
  for (const [dx, dy, col, sc] of [[2.5, 2, withAlpha('#000000', n ? 0.35 : 0.22), 1.15], [0, 0, n ? '#9aa6c0' : '#f4f4f0', 1], [-0.5, -0.8, n ? '#c8d0e0' : '#ffffff', 0.35]]) {
    g.fillStyle = col; g.beginPath();
    pts.forEach((p, i) => { const t = thick(p.y) * sc; if (!i) g.moveTo(p.x + dx - t / 2, p.y + dy); else g.lineTo(p.x + dx - t / 2, p.y + dy); });
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i], t = thick(p.y) * sc; g.lineTo(p.x + dx + t / 2, p.y + dy); }
    g.closePath(); g.fill();
  }
  // the cover's joints, every so often
  g.strokeStyle = n ? '#4a5a7a' : '#2f5fa8';
  for (let i = 3; i < pts.length; i += 4) { const p = pts[i], t = thick(p.y); g.lineWidth = Math.max(1, t * 0.3); g.beginPath(); g.moveTo(p.x - t / 2, p.y); g.lineTo(p.x + t / 2, p.y); g.stroke(); }
}

/**
 * Behind the rope: advertising boards along the edge of the ground at x0, a
 * walkway, then a raked stand rising away to the right with its crowd, its
 * roof on columns and a floodlight. Its foot stands on the ground at oy;
 * `k` px a metre. Seeded: the same crowd every frame.
 */
export function boundaryStand(g, x0, oy, w, k, { seed = 61 } = {}) {
  if (x0 > w + 4) return;
  const C = kit(), n = C.n, r = rng(seed);
  const bh = Math.max(9, 0.95 * k), walk = Math.max(10, 2.2 * k);
  const sx = x0 + walk, rise = Math.max(36, Math.min(9 * k, oy * 0.55)), run = Math.max(60, rise * 1.5);
  // the stand: a raked slope of seats on its concrete, stepping up to the right
  const steps = 9, tw = run / steps, rh = rise / steps;
  const conc = n ? '#4a4c54' : '#b9bdc4', concLo = n ? '#34363c' : '#8e9298';
  g.fillStyle = concLo; g.fillRect(sx, oy - rise, Math.max(0, w - sx + 4), rise + 2);
  g.fillStyle = conc; g.beginPath(); g.moveTo(sx, oy);
  for (let i = 0; i < steps; i++) { g.lineTo(sx + i * tw, oy - (i + 1) * rh); g.lineTo(sx + (i + 1) * tw, oy - (i + 1) * rh); }
  g.lineTo(w + 4, oy - rise); g.lineTo(w + 4, oy); g.closePath(); g.fill();
  // the back of the stand above its top step
  const top = oy - rise, back = Math.max(16, rise * 0.4);
  g.fillStyle = concLo; g.fillRect(sx + run, top - back, Math.max(0, w - sx - run + 4), back);
  // seats in a row of colour on each step, and the crowd on them
  const seat = n ? '#3a4a6a' : '#2f6db0';
  for (let i = 0; i < steps; i++) {
    const y = oy - (i + 1) * rh;
    g.fillStyle = seat; g.fillRect(sx + i * tw, y - Math.max(2, rh * 0.25), Math.max(0, w - sx - i * tw + 4), Math.max(2, rh * 0.25));
    g.fillStyle = withAlpha('#ffffff', n ? 0.06 : 0.22); g.fillRect(sx + i * tw, y, Math.max(0, w - sx - i * tw + 4), 1);
  }
  const rows = [];
  for (let i = 1; i < steps; i++) rows.push({ y: oy - i * rh - rh * 0.3, s: Math.max(3, Math.min(8, rh * 0.75)) });
  g.save(); g.beginPath(); g.moveTo(sx, oy); for (let i = 0; i < steps; i++) { g.lineTo(sx + i * tw, oy - (i + 1) * rh); g.lineTo(sx + (i + 1) * tw, oy - (i + 1) * rh); }
  g.lineTo(w + 4, top); g.lineTo(w + 4, top - back); g.lineTo(sx, top - back); g.closePath(); g.clip();
  crowd(g, sx + tw * 0.5, w + 4, rows.map((q, i) => ({ y: q.y, s: q.s })).filter((q, i) => i >= 0), r, n);
  // the top rows, standing at the back
  crowd(g, sx + run + 4, w + 4, [{ y: top - 3, s: Math.max(3, Math.min(8, rh * 0.75)) }, { y: top - back * 0.55, s: Math.max(3, Math.min(7, rh * 0.65)) }], r, n);
  g.restore();
  // the roof: columns at the back and a cantilever out over the front rows, in shadow beneath
  const roofY = top - back - Math.max(10, rise * 0.35), tip = sx + run * 0.25;
  g.fillStyle = withAlpha('#000000', n ? 0.25 : 0.12); g.beginPath(); g.moveTo(tip, roofY + 6); g.lineTo(w + 4, roofY + 6); g.lineTo(w + 4, oy - rise * 0.35); g.lineTo(tip + run * 0.2, oy - rise * 0.35); g.closePath(); g.fill();
  g.fillStyle = n ? '#2a2c32' : '#e6e8eb'; g.beginPath(); g.moveTo(tip, roofY + 4); g.lineTo(w + 4, roofY - 6); g.lineTo(w + 4, roofY + 2); g.lineTo(tip, roofY + 8); g.closePath(); g.fill();
  g.fillStyle = n ? '#5a5e66' : '#7a8088';
  for (let x = sx + run * 0.75; x < w; x += Math.max(70, run * 0.9)) g.fillRect(x - 2, roofY, 4, top - roofY);
  // a floodlight over the roof
  const fx = Math.min(w - 26, sx + run * 1.1);
  if (fx > sx + 20) {
    g.strokeStyle = n ? '#5a5e66' : '#9aa0a8'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(fx, roofY); g.lineTo(fx, roofY - rise * 0.9); g.stroke();
    g.fillStyle = n ? '#2c2e33' : '#6a7078'; g.fillRect(fx - 13, roofY - rise * 0.9 - 11, 26, 13);
    g.fillStyle = n ? '#fff6d8' : '#f2f4f6'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.fillRect(fx - 11 + i * 6, roofY - rise * 0.9 - 9 + j * 5.5, 4.5, 3.5);
    if (n) { const lg = g.createRadialGradient(fx, roofY - rise * 0.9 - 5, 0, fx, roofY - rise * 0.9 - 5, 80); lg.addColorStop(0, 'rgba(255,246,216,0.4)'); lg.addColorStop(1, 'rgba(255,246,216,0)'); g.fillStyle = lg; g.fillRect(fx - 80, roofY - rise * 0.9 - 85, 160, 160); }
  }
  // the walkway in front of the stand, and its low wall
  g.fillStyle = n ? '#3c3e44' : '#a7a9a4'; g.fillRect(x0, oy - Math.max(3, 0.25 * k), sx - x0 + 2, Math.max(3, 0.25 * k));
  g.fillStyle = conc; g.fillRect(sx - 2, oy - Math.max(8, 1.1 * k), 4, Math.max(8, 1.1 * k));
  // the boards: panels in turn, each with a plain mark on it, lit along the top
  const panel = Math.max(26, 3.2 * k), cols = n ? ['#2a3a5a', '#5a2a30', '#2a4a3a', '#4a4020'] : ['#1f4fa0', '#c8383a', '#1f8f5a', '#f2b705'];
  g.save(); g.beginPath(); g.rect(x0, oy - bh - 2, Math.max(0, w - x0 + 4), bh + 4); g.clip();
  for (let x = x0, i = 0; x < w + 4; x += panel, i++) {
    const c = cols[i % cols.length];
    const pg = g.createLinearGradient(0, oy - bh, 0, oy); pg.addColorStop(0, withAlpha('#ffffff', n ? 0.12 : 0.25)); pg.addColorStop(0.25, c); pg.addColorStop(1, c);
    g.fillStyle = pg; g.fillRect(x, oy - bh, panel - 1, bh);
    g.fillStyle = withAlpha('#ffffff', n ? 0.35 : 0.85);
    if (i % 2) { g.beginPath(); g.arc(x + panel * 0.3, oy - bh * 0.5, bh * 0.22, 0, TAU); g.fill(); g.fillRect(x + panel * 0.45, oy - bh * 0.58, panel * 0.38, bh * 0.16); }
    else { g.fillRect(x + panel * 0.18, oy - bh * 0.62, panel * 0.64, bh * 0.12); g.fillRect(x + panel * 0.18, oy - bh * 0.4, panel * 0.42, bh * 0.1); }
  }
  g.restore();
  g.fillStyle = withAlpha('#000000', 0.3); g.fillRect(x0, oy - 1, Math.max(0, w - x0 + 4), 2);
  softShadow(g, x0 + (w - x0) / 2, oy + 2, (w - x0) * 0.6, 4, 0.5);
}

/** A cricket ball's seam flash as the bat meets it: a few short white strokes. */
export function crack(g, x, y, u, R = 18) {
  if (!(u >= 0 && u <= 1)) return;
  g.save(); g.strokeStyle = withAlpha('#fff8e0', 0.9 * (1 - u)); g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.9 + (i / 6) * Math.PI * 0.9, r0 = R * (0.35 + u * 0.4), r1 = R * (0.7 + u * 0.6);
    g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke();
  }
  g.restore();
}
