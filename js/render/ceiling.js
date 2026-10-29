// ceiling.js — the stage for a ball kicked straight up indoors: a sports
// hall side on at one scale, cropped at its ceiling. The ceiling seen from
// below with its steel beams, lamps hanging from it on cables, the wall
// meeting it at a cornice; high windows between piers, padded panels low on
// the wall, wall bars, a pair of fire doors; a sprung wooden floor with court
// lines. The kicker stands with the kicking foot under the ball exactly where
// the engine says it leaves (its height h), follows through and steps back
// down as it rises. The ball rises and falls on one vertical line, drawn a
// little apart going down so both show; its velocity is a solid arrow
// (vertical, rule 2); its greatest height is marked, and where it meets the
// ceiling flashes, rings and shakes dust down.
//
// With no ceiling height given (the paper's first parts are outdoors in
// effect) the hall still has its roof, framed above the greatest height and
// carrying no number: only a ceiling the engine was given is measured.
//
// Everything drawn is read from js/core/ceiling.js (rule 4).

import { flash, pulse, dust, ageOf, phaseOf } from './effects.js';
import { env, rng, softShadow, floorboards } from './scenery.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha } from './util.js';
import { thrower, throwerHand, ballAt } from './figures.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const s3 = (x) => {
  if (!isFinite(x) || x === 0) return num(0, 0);
  const dp = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x))));
  // trailing zeros only go when the number is exactly that (given data): 10.98 is 11.0, 0.5 stays 0.5
  return num(x, dp, { trim: Math.abs(x - Number(x.toFixed(dp))) < 1e-9 });
};
const ease = (u) => u * u * (3 - 2 * u);

function keepHud(L, w, rows) {
  const phone = w < 520;
  L.reserve({ x: 0, y: 0, w: phone ? 150 : 205, h: 16 + rows * (phone ? 50 : 60) });
  L.reserve({ x: w - (phone ? 195 : 235), y: 0, w: phone ? 195 : 235, h: phone ? 64 : 74 });
}

/* ── the hall ──────────────────────────────────────────────────────────── */

/** A sports hall's ceiling meeting the wall at y = Y, seen from below across
    the canvas width w: tiles in perspective towards eye level eyeY, steel
    beams across it, a cornice where it meets the wall. */
export function hallCeiling(g, w, Y, eyeY, P) {
  const E = env(), n = E.night;
  g.save();
  const cg = g.createLinearGradient(0, 0, 0, Y);
  cg.addColorStop(0, n ? '#1e1b21' : '#bdb6aa'); cg.addColorStop(1, n ? '#2e2a31' : '#d8d1c4');
  g.fillStyle = cg; g.fillRect(0, 0, w, Y);
  // the tile grid: rows closing up towards the wall, joints running back to the eye
  const vx = w / 2, depth = Y - eyeY;                       // depth < 0: the eye is below
  g.strokeStyle = n ? 'rgba(0,0,0,0.45)' : 'rgba(90,80,65,0.30)'; g.lineWidth = 1;
  const rows = [];
  for (let i = 1; i < 40; i++) { const yy = Y - 3.2 * i * i; if (yy < -2) break; rows.push(yy); }
  rows.forEach((yy, i) => {
    if (i % 3 === 2) return;
    g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke();
  });
  for (let x = -w; x < 2 * w; x += 46) {
    const s = (0 - eyeY) / depth;                          // how far out the joint has come at the top edge
    g.beginPath(); g.moveTo(x, Y); g.lineTo(vx + (x - vx) * s, 0); g.stroke();
  }
  // steel beams across it: an I-section's bottom flange, lit on its near face
  rows.forEach((yy, i) => {
    if (i % 3 !== 2) return;
    const th = clamp(3 + i * 0.9, 4, 14);
    g.fillStyle = n ? '#3e434b' : '#59626c'; g.fillRect(0, yy - th, w, th);
    g.fillStyle = n ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.35)'; g.fillRect(0, yy - 1.5, w, 1.5);
  });
  // the cornice, and the shadow it throws down the wall
  g.fillStyle = n ? '#45404a' : '#a69f92'; g.fillRect(0, Y - 4, w, 6);
  g.fillStyle = n ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.4)'; g.fillRect(0, Y + 1, w, 1);
  const sg = g.createLinearGradient(0, Y + 2, 0, Y + 22); sg.addColorStop(0, 'rgba(0,0,0,0.30)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg; g.fillRect(0, Y + 2, w, 20);
  g.restore();
}

/** A high-bay lamp hanging from the ceiling at (x, Y) on a cable `drop` px long, its light spilling down to floorY. */
function lamp(g, x, Y, drop, floorY, n) {
  g.save();
  const ly = Y + drop;
  const cone = g.createLinearGradient(0, ly, 0, floorY);
  cone.addColorStop(0, n ? 'rgba(255,226,180,0.16)' : 'rgba(255,248,225,0.30)'); cone.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = cone; g.beginPath(); g.moveTo(x - 11, ly + 8); g.lineTo(x + 11, ly + 8); g.lineTo(x + 95, floorY); g.lineTo(x - 95, floorY); g.closePath(); g.fill();
  g.strokeStyle = n ? '#5e636b' : '#4a5058'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, Y - 6); g.lineTo(x, ly - 7); g.stroke();
  g.fillStyle = n ? '#2c3036' : '#3c434b'; g.fillRect(x - 4, ly - 9, 8, 5);
  const dg = g.createLinearGradient(x - 15, 0, x + 15, 0); dg.addColorStop(0, '#d6dbe0'); dg.addColorStop(0.5, '#9aa2aa'); dg.addColorStop(1, '#5d656d');
  g.fillStyle = dg; g.beginPath(); g.moveTo(x - 4, ly - 4); g.lineTo(x + 4, ly - 4); g.lineTo(x + 15, ly + 8); g.lineTo(x - 15, ly + 8); g.closePath(); g.fill();
  const glow = g.createRadialGradient(x, ly + 9, 0, x, ly + 9, 22);
  glow.addColorStop(0, n ? 'rgba(255,240,200,0.95)' : 'rgba(255,250,230,0.95)'); glow.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(x, ly + 9, 22, 0, TAU); g.fill();
  g.fillStyle = '#fff8e6'; g.beginPath(); g.ellipse(x, ly + 8, 12, 2.6, 0, 0, TAU); g.fill();
  g.restore();
}

/** The hall's wall from the ceiling at top down to the floor at floorY,
    at k px per metre: blockwork, high windows in bays between piers (none
    behind the ball's line at clearX0..clearX1), padded panels to 2.4 m,
    wall bars and a pair of fire doors where there is room. */
function hallWall(g, w, top, floorY, k, clearX0, clearX1, o = {}) {
  const E = env(), n = E.night, r = rng(61);
  g.save();
  const wg = g.createLinearGradient(0, top, 0, floorY);
  wg.addColorStop(0, n ? '#2c2930' : '#d9d3c6'); wg.addColorStop(1, n ? '#37323b' : '#cbc3b4');
  g.fillStyle = wg; g.fillRect(0, top, w, floorY - top);
  // blockwork courses
  const course = clamp(0.2 * k, 6, 12);
  g.strokeStyle = n ? 'rgba(0,0,0,0.22)' : 'rgba(90,80,60,0.12)'; g.lineWidth = 1;
  for (let yy = floorY, row = 0; yy > top; yy -= course, row++) {
    g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke();
    for (let x = (row % 2) * course; x < w; x += course * 2) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy - course); g.stroke(); }
  }
  // the high windows, in bays; a pier where the ball goes
  const wy0 = top + Math.max(14, 0.35 * k), wy1 = wy0 + clamp(1.3 * k, 26, 60), bay = 150;
  for (let x0 = -60; x0 < w; x0 += bay) {
    const a = x0 + 14, b = x0 + bay - 14;
    if (b > clearX0 && a < clearX1) continue;
    const gl = g.createLinearGradient(0, wy0, 0, wy1);
    gl.addColorStop(0, n ? '#2b3a55' : '#c9dbe6'); gl.addColorStop(1, n ? '#1a2336' : '#9fbacb');
    g.fillStyle = n ? '#4a4652' : '#8f877a'; g.fillRect(a - 4, wy0 - 4, b - a + 8, wy1 - wy0 + 8);
    g.fillStyle = gl; g.fillRect(a, wy0, b - a, wy1 - wy0);
    g.fillStyle = n ? 'rgba(160,190,255,0.10)' : 'rgba(255,255,255,0.45)';
    g.beginPath(); g.moveTo(a + 10, wy1); g.lineTo(a + 30, wy0); g.lineTo(a + 42, wy0); g.lineTo(a + 22, wy1); g.closePath(); g.fill();
    g.strokeStyle = n ? '#4a4652' : '#8f877a'; g.lineWidth = 3;
    for (let x = a + (b - a) / 3; x < b - 2; x += (b - a) / 3) { g.beginPath(); g.moveTo(x, wy0); g.lineTo(x, wy1); g.stroke(); }
    g.fillStyle = n ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)'; g.fillRect(a - 4, wy1 + 4, b - a + 8, 2);
  }
  // a pier behind the ball's line: a plain lighter column, so the marks read on it
  g.fillStyle = n ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.28)'; g.fillRect(clearX0, top, clearX1 - clearX0, floorY - top);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(clearX1 - 3, top, 3, floorY - top);
  // padded panels to 2.4 m
  const py = floorY - 2.4 * k;
  const pg = g.createLinearGradient(0, py, 0, floorY);
  pg.addColorStop(0, n ? '#3b4a60' : '#6f849c'); pg.addColorStop(1, n ? '#2e3a4c' : '#5c6f86');
  g.fillStyle = pg; g.fillRect(0, py, w, floorY - py);
  const pw = clamp(1.2 * k, 30, 70);
  for (let x = 0; x < w; x += pw) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, py, 2, floorY - py);
    g.fillStyle = n ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.22)'; g.fillRect(x + 2, py, 2, floorY - py);
  }
  g.fillStyle = n ? '#22202a' : '#4b4a52'; g.fillRect(0, py - 3, w, 4);
  // wall bars: stiles and rungs to 2.6 m
  if (o.bars) {
    const [bx0, bx1] = o.bars, by = floorY - 2.6 * k, rung = Math.max(5, 0.16 * k);
    const wood = n ? '#8a6a48' : '#b88b58';
    for (let x = bx0; x <= bx1 + 0.5; x += (bx1 - bx0) / 2) { g.fillStyle = withAlpha('#000000', 0.22); g.fillRect(x + 3, by + 2, 5, floorY - by); g.fillStyle = wood; g.fillRect(x, by, 5, floorY - by); }
    g.strokeStyle = wood; g.lineWidth = 2.4;
    for (let yy = by + rung; yy < floorY - 2; yy += rung) { g.beginPath(); g.moveTo(bx0 + 4, yy); g.lineTo(bx1 + 1, yy); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    for (let yy = by + rung + 2; yy < floorY - 2; yy += rung) { g.beginPath(); g.moveTo(bx0 + 4, yy); g.lineTo(bx1 + 1, yy); g.stroke(); }
  }
  // a pair of fire doors, a push bar each, an exit sign over them
  if (o.door != null) {
    const dx = o.door, dw = 1.8 * k, dh = 2.1 * k, dy = floorY - dh;
    g.fillStyle = n ? '#26232a' : '#5b5a60'; g.fillRect(dx - 4, dy - 4, dw + 8, dh + 4);
    for (const s of [0, 1]) {
      const x = dx + s * dw / 2;
      const dg = g.createLinearGradient(x, 0, x + dw / 2, 0); dg.addColorStop(0, n ? '#5a6474' : '#8c9aac'); dg.addColorStop(1, n ? '#48505d' : '#76859a');
      g.fillStyle = dg; g.fillRect(x + 1, dy, dw / 2 - 2, dh);
      g.fillStyle = n ? '#1b2333' : '#c9dbe6'; g.fillRect(x + dw * 0.14, dy + dh * 0.14, dw * 0.18, dh * 0.3);
      g.fillStyle = '#b9bfc5'; g.fillRect(x + 4, dy + dh * 0.52, dw / 2 - 10, 3);
    }
    g.fillStyle = '#2f7d4a'; g.fillRect(dx + dw / 2 - 16, dy - 20, 32, 12);
    g.fillStyle = '#f4f1e8'; g.fillRect(dx + dw / 2 - 10, dy - 17, 8, 6); g.beginPath(); g.moveTo(dx + dw / 2 + 2, dy - 17); g.lineTo(dx + dw / 2 + 10, dy - 14); g.lineTo(dx + dw / 2 + 2, dy - 11); g.fill();
  }
  g.restore();
}

/** The hall's floor from floorY down: sprung boards, court lines, a skirting. */
function hallFloor(g, w, floorY, h) {
  const E = env(), n = E.night;
  floorboards(g, 0, w, floorY, h);
  g.save();
  g.fillStyle = n ? 'rgba(201,162,58,0.55)' : 'rgba(170,130,40,0.75)'; g.fillRect(0, floorY + 9, w, 2.5);
  g.fillStyle = n ? 'rgba(90,143,192,0.55)' : 'rgba(60,110,160,0.7)'; g.fillRect(0, floorY + 22, w, 3);
  const sh = g.createLinearGradient(0, floorY, 0, h); sh.addColorStop(0, n ? 'rgba(255,230,190,0.10)' : 'rgba(255,255,255,0.25)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, floorY, w, h - floorY);
  g.fillStyle = n ? '#1d1b20' : '#3f3c38'; g.fillRect(0, floorY - 7, w, 7);
  g.restore();
}

/* ── the kicker ────────────────────────────────────────────────────────── */

const leg2 = (Hp, F, a, b, up = true) => {
  const dx = F.x - Hp.x, dy = F.y - Hp.y, d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 0.5, a + b - 0.5);
  const base = Math.atan2(dy, dx), ang = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const k1 = { x: Hp.x + Math.cos(base - ang) * a, y: Hp.y + Math.sin(base - ang) * a };
  const k2 = { x: Hp.x + Math.cos(base + ang) * a, y: Hp.y + Math.sin(base + ang) * a };
  // a kicking knee points up and forward; a standing knee forward
  return up ? (k1.y < k2.y ? k1 : k2) : (k1.x > k2.x ? k1 : k2);
};
function limb(g, pts, color, wd) {
  g.strokeStyle = color; g.lineWidth = wd; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.stroke();
}

/**
 * A footballer kicking straight up, side on, facing +x: feet on the floor
 * at floorY, `Hp` px tall, the hip at hipX. `foot` is where the kicking foot
 * is (its instep), already placed by the caller; `lean` tips the body back
 * to balance the kick (0 standing).
 */
function kicker(g, hipX, floorY, Hp, foot, lean, P) {
  const E = env(), n = E.night;
  const skin = n ? '#b08a74' : '#d9a988', skinFar = n ? '#7d6253' : '#b5876a';
  const shirt = n ? '#6c7f9a' : '#5f7392', shorts = '#2f3340', sock = n ? '#d8d4cc' : '#f2efe8', boot = '#232126';
  const thigh = Hp * 0.25, shin = Hp * 0.26, lw = Math.max(3, Hp * 0.075);
  const HIP = { x: hipX, y: floorY - (thigh + shin) * 0.96 };
  const stand = { x: hipX - Hp * 0.05, y: floorY - lw * 0.4 };
  const SH = { x: HIP.x - Math.sin(lean) * Hp * 0.3, y: HIP.y - Math.cos(lean) * Hp * 0.3 };
  softShadow(g, hipX, floorY + 1, Hp * 0.3, Hp * 0.05, 0.8);
  g.save();
  // the standing leg, behind
  const K1 = leg2(HIP, stand, thigh, shin, false);
  limb(g, [HIP, K1, stand], skinFar, lw); limb(g, [K1, stand], withAlpha(sock, 0.85), lw * 0.95);
  limb(g, [HIP, { x: (HIP.x + K1.x) / 2, y: (HIP.y + K1.y) / 2 }], withAlpha(shorts, 0.9), lw * 1.2);
  g.fillStyle = boot; g.beginPath(); g.ellipse(stand.x + lw * 0.5, stand.y, lw * 0.95, lw * 0.45, 0, 0, TAU); g.fill();
  // the far arm, out behind for balance
  const af = lean * 1.6 + 2.5;
  const EL2 = { x: SH.x + Math.cos(af) * Hp * 0.17, y: SH.y + Math.sin(af) * Hp * 0.17 };
  const HA2 = { x: EL2.x + Math.cos(af - 0.4) * Hp * 0.16, y: EL2.y + Math.sin(af - 0.4) * Hp * 0.16 };
  limb(g, [SH, EL2, HA2], skinFar, lw * 0.8);
  // the body
  limb(g, [HIP, SH], shirt, lw * 2.1);
  limb(g, [HIP, { x: HIP.x + (SH.x - HIP.x) * 0.2, y: HIP.y + (SH.y - HIP.y) * 0.2 }], shorts, lw * 2.2);
  // the kicking leg, in front: thigh, shin, sock, boot along the shin's end
  const K2 = leg2(HIP, foot, thigh, shin, true);
  limb(g, [HIP, K2, foot], skin, lw); limb(g, [HIP, K2], shorts, lw * 1.2);
  limb(g, [{ x: K2.x + (foot.x - K2.x) * 0.35, y: K2.y + (foot.y - K2.y) * 0.35 }, foot], sock, lw * 0.95);
  const fa = Math.atan2(foot.y - K2.y, foot.x - K2.x) - Math.PI / 2;
  g.save(); g.translate(foot.x, foot.y); g.rotate(fa);
  g.fillStyle = boot; g.beginPath(); g.ellipse(-lw * 0.2, 0, lw * 1.05, lw * 0.5, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-lw * 0.9, -lw * 0.35, lw * 1.2, 1.2);
  g.restore();
  // the near arm, out to the side and up
  const an = -0.5 + lean * 0.8;
  const EL = { x: SH.x + Math.cos(an) * Hp * 0.17, y: SH.y + Math.sin(an) * Hp * 0.17 };
  const HA = { x: EL.x + Math.cos(an + 0.5) * Hp * 0.16, y: EL.y + Math.sin(an + 0.5) * Hp * 0.16 };
  limb(g, [SH, EL, HA], skin, lw * 0.8); limb(g, [SH, EL], shirt, lw * 0.95);
  // the head, watching the ball go up
  const hr = Hp * 0.08, hx = SH.x - Math.sin(lean) * Hp * 0.1 + hr * 0.15, hy = SH.y - Hp * 0.095;
  const hg = g.createRadialGradient(hx - hr * 0.3, hy - hr * 0.3, hr * 0.1, hx, hy, hr); hg.addColorStop(0, skin); hg.addColorStop(1, skinFar);
  g.fillStyle = hg; g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.fill();
  g.fillStyle = '#3a2c26'; g.beginPath(); g.arc(hx - hr * 0.25, hy - hr * 0.2, hr * 0.88, Math.PI * 0.95, Math.PI * 1.85); g.fill();
  g.fillStyle = '#2b2628'; g.beginPath(); g.arc(hx + hr * 0.45, hy - hr * 0.3, Math.max(0.8, hr * 0.12), 0, TAU); g.fill();
  g.restore();
}

/* ── the stage ─────────────────────────────────────────────────────────── */

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'ceiling') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const E = env(), night = E.night;
  const phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  keepHud(L, w, 2);

  // ── one scale, the floor at the foot of the picture and the ceiling at its top.
  // With no ceiling given the hall's roof is drawn above the greatest height, unmeasured.
  const roof = f.C ?? (f.Hmax * 1.1 + 0.8);
  const ceilY = phone ? 118 : 96, floorY = h - (phone ? 40 : 48);
  const k = (floorY - ceilY) / roof, Y = (y) => floorY - y * k;
  const cx = phone ? Math.round(w * 0.46) : Math.max(380, Math.round(w * 0.5));
  const dx = cx + (phone ? 48 : 62), dx2 = dx + (phone ? 46 : 56);

  // ── the hall
  hallWall(g, w, ceilY, floorY, k, cx - 46, dx2 + 30, {
    bars: !phone && cx - 260 > 10 ? [cx - 250, cx - 140] : null,
    door: !phone && w - dx2 > 260 ? w - 40 - 1.8 * k : null,
  });
  hallFloor(g, w, floorY, h);
  hallCeiling(g, w, ceilY, Y(1.6), P);
  const drop = clamp(0.9 * k, 22, 46);
  for (let x = cx - 190; x > -20; x -= 190) lamp(g, x, ceilY, drop, floorY, night);
  for (let x = dx2 + 120; x < w + 20; x += 190) lamp(g, x, ceilY, drop, floorY, night);

  // ── the kicker: the kicking foot under the ball where it leaves, at h
  const r = clamp(0.11 * k * 1.6, 6.5, 9);                 // the ball, drawn at a size that reads
  const Hp = Math.max(54, 1.75 * k), legL = Hp * 0.51, hipY = floorY - legL * 0.96;
  const contact = { x: cx - r * 0.3, y: Y(f.h) + r + Math.max(2, Hp * 0.03) };
  const reach = Math.sqrt(Math.max(0, (legL * 0.93) ** 2 - (hipY - contact.y) ** 2));
  const kicks = contact.y > hipY - legL * 0.55 && reach > Hp * 0.12;
  if (kicks) {
    const hipX = contact.x - reach;
    // follow-through over the first part of the rise, then the foot comes back down
    const thru = fired ? ease(clamp(t / (0.1 * f.tMax), 0, 1)) : 0;
    const back = fired ? ease(clamp((t - 0.3 * f.tMax) / (0.25 * f.tMax), 0, 1)) : 0;
    const a0 = Math.atan2(contact.y - hipY, contact.x - hipX), a1 = a0 - 0.45 * thru;
    const dist = Math.hypot(contact.x - hipX, contact.y - hipY), swung = { x: hipX + Math.cos(a1) * dist, y: hipY + Math.sin(a1) * dist };
    const rest = { x: hipX + Hp * 0.12, y: floorY - Math.max(3, Hp * 0.075) * 0.4 };
    const foot = { x: swung.x + (rest.x - swung.x) * back, y: swung.y + (rest.y - swung.y) * back };
    const lean = (0.28 + 0.12 * thru) * (1 - back) * clamp((floorY - contact.y) / legL, 0.3, 1.2);
    kicker(g, hipX, floorY, Hp, foot, lean, P);
  } else {
    // too high to kick: thrown from the hand, the hand where it leaves
    const per = throwerHand(100, 90), Ht = Math.max(Hp * 0.8, (floorY - Y(f.h)) / (per.y / 100));
    const hand = throwerHand(Ht, 90);
    thrower(g, cx - hand.x, floorY, Ht, P, { dir: 1, pose: 1, aim: 90 });
  }

  // ── the heights: where it leaves, the ceiling, its greatest height
  const dim = (x, a, b, text, pri = 6) => {
    stroke(g, [{ x, y: Y(a) }, { x, y: Y(b) }], { color: P.ink, width: 1.3, alpha: 0.85 });
    for (const yy of [Y(a), Y(b)]) stroke(g, [{ x: x - 5, y: yy }, { x: x + 5, y: yy }], { color: P.ink, width: 1.3, alpha: 0.85 });
    if (text) L.add(text, x + 9, (Y(a) + Y(b)) / 2, { color: P.ink, align: 'left', pri, size: 14, weight: 700 });
  };
  if (f.h > 0) dim(dx, 0, f.h, T`${s3(f.h)} [m]`);
  if (f.C != null) {
    dim(dx2, 0, f.C, T`${s3(f.C)} [m]`, 7);
    L.add('ceiling', dx2 + 9, ceilY + 18, { color: P.ink, align: 'left', pri: 6, size: 13, weight: 700 });
  }
  const turned = !f.hit || f.Hmax <= (f.C ?? Infinity);
  if (turned) {
    stroke(g, [{ x: cx - 36, y: Y(f.Hmax) }, { x: cx + 44, y: Y(f.Hmax) }], { color: P.disp, width: 1.4, dash: [5, 4] });
    L.add(T`H = ${s3(f.Hmax)} [m]`, cx - 44, Y(f.Hmax), { color: P.disp, align: 'right', pri: 7, size: 14, weight: 700 });
  }

  // ── the ball: up on one line, down on another just beside it
  const down = t > f.tTop, bx = cx + (down ? 12 : 0), y = f.pos(t), v = f.vel(t);
  stroke(g, [{ x: cx, y: Y(f.h) }, { x: cx, y: Y(down ? f.Hmax : y) }], { color: P.disp, width: 2.2, alpha: 0.55 });
  if (down) stroke(g, [{ x: cx + 12, y: Y(f.Hmax) }, { x: cx + 12, y: Y(y) }], { color: P.disp, width: 2.2, alpha: 0.55 });
  if (turned && t >= f.tTop - 1e-9 && fired) {
    const { age, life } = ageOf(t, f.tTop, f.tMax, f.tMax / 5);
    pulse(g, cx + 6, Y(f.Hmax), age, life, P.disp, { radius: 22 });
  }
  if (f.hit && fired && t >= f.hit.t - 1e-9) {
    const { age, life } = ageOf(t, f.hit.t, f.tMax, f.tMax / 4);
    flash(g, cx, Y(f.C), age, life, { radius: 40 });
    pulse(g, cx, Y(f.C), age, life, P.mark, { radius: 36 });
    // dust shaken down off the ceiling
    const u = phaseOf(age, life);
    if (u != null) {
      const rr = rng(71);
      g.save();
      for (let i = 0; i < 16; i++) {
        const sx = cx + (rr() - 0.5) * 70 * (0.4 + u), sy = Y(f.C) + 4 + (8 + rr() * 30) * u + 60 * u * u * rr();
        g.fillStyle = withAlpha(night ? '#b9aea4' : '#8d8273', 0.8 * (1 - u)); g.beginPath(); g.arc(sx, sy, 1.2 + rr() * 1.8, 0, TAU); g.fill();
      }
      g.restore();
    }
    dot(g, cx, Y(f.C), 12, { stroke: P.mark, width: 2.6 });
    L.add(T`t = ${s3(f.hit.t)} [s], ${s3(f.hit.v)} [m s^-1]`, cx - 20, Y(f.C) + 26, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
  }
  if (!f.hit && fired && t >= f.tMax - 1e-9) {
    // back on the floor: a puff of dust where it lands
    const { age, life } = ageOf(t, f.tMax, f.tMax);
    dust(g, bx, floorY, age, life, { size: 1.2, n: 16 });
  }
  if (show.velocity !== false && Math.abs(v) > 1e-9) arrow(g, bx + 18, Y(y), bx + 18, Y(y) - clamp((v / f.u) * 60, -(h - 6 - Y(y)), 60), { color: P.velVec, width: 2.8, head: 11 });
  softShadow(g, bx, floorY + 2, r * 1.6, 3, clamp(1 - (floorY - Y(y)) / 250, 0.15, 0.8));
  ballAt(g, bx, Y(y), r);
  L.draw(g, w, h);
  return null;
}
