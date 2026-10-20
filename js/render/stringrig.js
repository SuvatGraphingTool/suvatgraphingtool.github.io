// stringrig.js — how the bullet experiment is started: one string, one slider.
//
// A steel rod runs under the pistol in two guides.
//   front end  a post with a small shelf; the released round sits on it
//   middle     a wire to the trigger
//   back end   an eye, with one elastic cord lying flat behind it
// Pull the cord straight back — to the left — and the rod slides back. At the end of its travel the
// shelf has left the round and the wire has pulled the trigger through, on the
// same frame. That frame is t = 0.
//
// STAGING, NOT PHYSICS. The rope, the rod and the gun are scenery; none of it
// is a quantity and none of it is computed from the flight (CLAUDE.md rule 4).
// The engine's clock starts the moment the rod trips, and not before.
//
// RIG SPACE. Everything here is in "rig pixels": the muzzle at (0, 0), and
// 200 rig px to a metre, which is the scale the rig was drawn at. The caller
// maps rig space to the screen with one scale, k = camera px per metre / 200,
// so the rig zooms and pans with the room — and the rope's physics never sees
// the camera at all.

import { clamp } from './util.js';

export const TRAVEL = 64;        // how far the rod slides before it trips
export const DROP_DX = 30;       // the shelf, just clear of the muzzle
const ROD_Y = 78, REAR = -240, TRIGGER = { x: -82, y: 33 };
const CORD = 80;                 // rest length of the cord, eye to toggle
const SLACK = 12;                // pull taken up before the rod starts to move

const C = {
  gun: '#2b3038', gunHi: '#4a515c', gunLo: '#1a1d22',
  steel: '#9aa1ab', steelLo: '#5d636c', gold: '#e3b341', string: '#f1ece2',
};

/* ── state ─────────────────────────────────────────────────────────────
   NO GRAVITY. The cord is an elastic band lying flat, eye to toggle. Only the
   horizontal part of a pull counts: drag the toggle straight left and the rod
   follows; drag it up or down and the cord just swings. Let go and it snaps
   back with a twang — a transverse wobble, `w`, that rings down. */
const eye = (R) => ({ x: REAR - R.p, y: ROD_Y });
const rest = (R) => ({ x: REAR - R.p - CORD, y: ROD_Y });
export function create(floorY) {
  return { p: 0, pv: 0, latched: false, floorY, T: { x: REAR - CORD, y: ROD_Y }, Tv: { x: 0, y: 0 },
    held: false, ptr: null, w: 0, wv: 0, hover: false, idle: 0 };
}
export function trip(R) { R.latched = true; R.p = TRAVEL; R.pv = 0; if (R.held) release(R); }
export const isHeld = (R) => R.held;

/** Is p (rig px) on the toggle or the cord? */
export function nearest(R, p, reach = 26) {
  const E = eye(R), T = R.T;
  if (Math.hypot(p.x - T.x, p.y - T.y) < reach) return 1;
  const dx = T.x - E.x, dy = T.y - E.y, q = clamp(((p.x - E.x) * dx + (p.y - E.y) * dy) / (dx * dx + dy * dy || 1), 0.2, 1);
  return Math.hypot(p.x - E.x - dx * q, p.y - E.y - dy * q) < reach * 0.6 ? 1 : -1;
}
export function grab(R, p) { R.held = true; R.ptr = p; R.grabOff = { x: R.T.x - p.x, y: R.T.y - p.y }; }
export function drag(R, p) { R.ptr = p; }
export function release(R) {
  if (!R.held) return false;
  R.held = false; R.ptr = null;
  R.wv += clamp(pull(R) / 90, 0, 1.2) * 1400 * (Math.random() < 0.5 ? -1 : 1);   // the twang
  return true;
}
const pull = (R) => Math.max(0, rest(R).x - R.T.x + (R.latched ? 0 : 0));

/** One step. Returns true on the frame the rod trips. */
export function step(R, dt) {
  const T = R.T, R0 = rest(R);
  if (R.held && R.ptr) {
    const want = { x: Math.min(R.ptr.x + R.grabOff.x, R0.x + 14), y: R.ptr.y + R.grabOff.y };
    const k = Math.min(1, dt * 30), ox = T.x, oy = T.y;
    T.x += (want.x - T.x) * k; T.y += (want.y - T.y) * k;
    R.Tv = { x: (T.x - ox) / dt, y: (T.y - oy) / dt };
    R.wv += -R.Tv.y * 0.6 * dt * 60;                     // a sideways flick makes it ring
  } else {
    R.Tv.x += (-320 * (T.x - R0.x) - 11 * R.Tv.x) * dt; R.Tv.y += (-320 * (T.y - R0.y) - 11 * R.Tv.y) * dt;
    T.x += R.Tv.x * dt; T.y += R.Tv.y * dt;
  }
  R.wv += (-1100 * R.w - 5 * R.wv) * dt; R.w += R.wv * dt;
  R.w = clamp(R.w, -40, 40);

  let tripped = false;
  if (!R.latched) {
    const drawn = R.held ? Math.max(0, (REAR - CORD) - T.x - SLACK) : 0;
    const target = clamp(drawn * 0.75, 0, TRAVEL + 12);
    R.pv += (260 * (target - R.p) - 18 * R.pv) * dt;
    R.p += R.pv * dt;
    if (R.p < 0) { R.p = 0; R.pv = Math.abs(R.pv) * 0.2; }
    if (R.p >= TRAVEL) { trip(R); tripped = true; }
  }
  R.stretch = Math.hypot(T.x - eye(R).x, T.y - eye(R).y) / CORD;
  return tripped;
}
/** Is anything still moving? (So the caller knows whether to keep drawing.) */
export function moving(R) {
  return R.held || Math.abs(R.wv) + Math.abs(R.w) > 0.05 || Math.hypot(R.Tv.x, R.Tv.y) > 0.05 || Math.abs(R.pv) > 0.05;
}

/* ── drawing, in rig space (the caller has set the transform) ──────────── */
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** Stand, guides and the pistol. `kick` in rig px; `trig` 0..1. */
export function drawGun(g, R, kick, trig) {
  const sx = -150;
  g.fillStyle = C.gunLo; g.fillRect(sx - 9, 96, 18, R.floorY - 96);
  rr(g, sx - 70, R.floorY - 10, 140, 10, 3); g.fill();
  for (const gx of [-40, REAR + 30]) {
    g.fillStyle = C.gunLo; g.fillRect(gx - 3, ROD_Y + 6, 6, gx > sx ? 18 : R.floorY - ROD_Y - 6);
    g.fillStyle = C.gold; rr(g, gx - 11, ROD_Y - 7, 22, 14, 4); g.fill();
  }
  g.fillStyle = C.gunLo; g.fillRect(REAR + 30, ROD_Y + 20, sx - REAR - 30, 6);

  g.save(); g.translate(-kick, 3);
  g.fillStyle = C.gun;
  g.beginPath(); g.moveTo(-114, 16); g.lineTo(-152, 16); g.lineTo(-168, 98); g.lineTo(-126, 98); g.lineTo(-104, 30); g.closePath(); g.fill();
  rr(g, -156, -16, 156, 26, 4); g.fill();
  g.fillRect(-150, 8, 136, 12);
  g.fillStyle = C.gunHi; g.fillRect(-154, -16, 152, 2);
  g.fillStyle = C.gunLo; for (let x = -146; x < -122; x += 5) g.fillRect(x, -11, 2, 16);
  g.fillStyle = '#07080a'; rr(g, -92, -12, 28, 8, 2); g.fill();
  g.beginPath(); g.arc(-2, -3, 2.6, 0, 7); g.fill();
  g.strokeStyle = C.gun; g.lineWidth = 5;
  g.beginPath(); g.moveTo(-104, 20); g.lineTo(-102, 42); g.quadraticCurveTo(-100, 48, -78, 48); g.quadraticCurveTo(-58, 48, -54, 20); g.stroke();
  g.save(); g.translate(-80, 20); g.rotate(-0.55 * trig);
  g.strokeStyle = C.steel; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(4, 9, -1, 18); g.stroke(); g.restore();
  g.restore();
}
/** The rod, its shelf and the trigger wire. */
export function drawRod(g, R) {
  const p = R.p, x0 = REAR - p, x1 = 8 - p, y = ROD_Y;
  g.fillStyle = C.steelLo; g.fillRect(x0, y - 3, x1 - x0, 6);
  g.fillStyle = C.steel; g.fillRect(x0, y - 3, x1 - x0, 2.5);
  g.strokeStyle = C.steel; g.lineWidth = 3; g.beginPath(); g.arc(x0, y, 6, 0, 7); g.stroke();
  const shelfR = DROP_DX - 9 + TRAVEL;
  g.fillStyle = C.steel; g.fillRect(x1 - 3, 12, 6, y - 12);
  g.fillRect(x1 - 3, 12, shelfR - p - x1 + 3, 4);
  const tip = { x: TRIGGER.x - 10 * (p / TRAVEL), y: TRIGGER.y + 18 }, clip = { x: TRIGGER.x + 18 - p, y: y - 3 };
  g.strokeStyle = C.gold; g.lineWidth = 1.6; g.beginPath(); g.moveTo(tip.x, tip.y); g.lineTo(clip.x, clip.y); g.stroke();
  g.fillStyle = C.gold; g.beginPath(); g.arc(clip.x, clip.y, 3, 0, 7); g.fill();
}
/** The cord, flat, with a wooden toggle on the end. */
export function drawString(g, R) {
  const E = eye(R), T = R.T, st = R.stretch || 1;
  const dx = T.x - E.x, dy = T.y - E.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const mx = (E.x + T.x) / 2 + nx * R.w, my = (E.y + T.y) / 2 + ny * R.w;
  const w = clamp(4.4 / Math.sqrt(st), 1.8, 4.4);
  const path = () => { g.beginPath(); g.moveTo(E.x, E.y); g.quadraticCurveTo(mx, my, T.x, T.y); };
  g.save(); g.lineCap = 'round';
  g.save(); g.translate(4, 7); g.globalAlpha = 0.3; path(); g.strokeStyle = '#000'; g.lineWidth = w + 2; g.stroke(); g.restore();
  const glow = clamp((st - 1.4) * 1.6, 0, 1);
  if (glow > 0 || R.hover) { g.shadowColor = `rgba(255,226,170,${Math.max(glow * 0.9, R.hover ? 0.45 : 0)})`; g.shadowBlur = 12; }
  path(); g.strokeStyle = C.string; g.lineWidth = w; g.stroke(); g.shadowBlur = 0;
  g.restore();
  const a = Math.atan2(T.y - my, T.x - mx) + Math.PI / 2;
  g.save(); g.translate(T.x, T.y); g.rotate(a);
  const tg = g.createLinearGradient(0, -7, 0, 7); tg.addColorStop(0, '#d39a5c'); tg.addColorStop(0.5, '#9a6633'); tg.addColorStop(1, '#5a3a18');
  g.fillStyle = tg; rr(g, -18, -7, 36, 14, 7); g.fill();
  g.fillStyle = C.gold; g.fillRect(-2, -7, 4, 14);
  g.restore();
}
/** Where the toggle is, in rig px — for the "pull" hint. */
export const stringEnd = (R) => R.T;
