// beach.js — the stage for a ball thrown and caught by someone who sets off
// after it along the ground: a dog on a beach.
//
// Side on, ONE scale both ways, fitted to the motion (scenery.fitSide) so the
// beach fills the canvas. The beach is drawn as one: the sea running out to
// the horizon, a breaking wave and its foam, the wet sand shining below it,
// then the dry sand the action happens on, with shells, a parasol, and the
// dog's paw prints left behind it. The thrower (figures.thrower) winds up and
// lets go; the dog — a golden retriever, filled and shaded, drawn here —
// waits beside them until the engine's set-off time, gallops out along the
// sand, and in the last moment before the catch reaches up (or down) for the
// ball, which is then in its mouth; the catch pulses at the engine's time.
//
// The ball's path is the path colour; the catch is ringed in the marker
// colour with its time, set clear of the path. The launch and catch heights
// are dimension lines; the distance to the catch is measured along the sand
// (three significant figures). Velocity on the ball, across dashed and up
// solid (rule 2); the dog's velocity is an arrow along its line of running —
// dashed, it is horizontal.
//
// Everything drawn is read from js/core/catch.js (rule 4): where the ball is,
// where the dog is, when it sets off, when and where the catch is.

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha, niceStep, fmt, sig3 } from './util.js';
import { thrower, throwerHand, ballAt, THROWER_MIN } from './figures.js';
import { T } from '../notation.js';
import { skyscape, water, sandGround, env, rng, softShadow } from './scenery.js';
import { pulse, ageOf } from './effects.js';
import { fitClear } from './heights.js';

const TAU = Math.PI * 2;
const HUD = 250, HUD_H = 290;

/** Level sand from its surface at Y down. */
export function sand(g, x0, x1, Y, bottom) { sandGround(g, x0, x1, Y, bottom); }

/* ── the beach ─────────────────────────────────────────────────────────── */

/** The beach from the horizon down: the sea, a breaking wave with its foam
    and swash, the wet sand shining, and the dry sand from `dry` down. */
function shore(g, w, h, hz, dry, phase) {
  const E = env(), r = rng(71), D = dry - hz;
  skyscape(g, 0, 0, w, hz, { far: 'none', seed: 21 });
  // a far headland on the left, misted
  g.fillStyle = E.night ? '#3b3239' : '#b9a3a0';
  const hh = clamp(hz * 0.07, 8, 28);
  g.beginPath(); g.moveTo(0, hz); g.lineTo(0, hz - hh); g.quadraticCurveTo(w * 0.12, hz - hh * 1.25, w * 0.24, hz - hh * 0.4); g.lineTo(w * 0.28, hz); g.closePath(); g.fill();
  const surf = hz + D * 0.48, wet = hz + D * 0.74;
  water(g, 0, w, hz, surf + 4, { phase });
  // a sail far out
  const sx = w * 0.7, sy = hz - 2;
  g.fillStyle = E.night ? '#cfc6bf' : '#ffffff'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy - 14); g.lineTo(sx + 8, sy); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#4a3f45' : '#6d5f5a'; g.fillRect(sx - 5, sy, 15, 2);
  // the wet sand, shining with the sky
  const wg = g.createLinearGradient(0, surf, 0, wet);
  wg.addColorStop(0, E.night ? '#4a4038' : '#b8a483'); wg.addColorStop(1, E.night ? '#54473a' : '#c9b48e');
  g.fillStyle = wg; g.fillRect(0, surf, w, wet - surf + 1);
  g.save();
  for (let i = 0; i < 14; i++) { g.fillStyle = withAlpha(E.night ? E.skyBottom : '#ffffff', E.night ? 0.25 : 0.22); g.fillRect(r() * w, surf + 4 + r() * (wet - surf - 6), 20 + r() * 60, 1.2); }
  g.restore();
  // the swash: a lace of foam running up the wet sand, drifting with the phase
  g.save();
  const lace = (y0, amp, a) => {
    g.fillStyle = withAlpha('#ffffff', a); g.beginPath(); g.moveTo(0, surf);
    for (let x = 0; x <= w + 10; x += 10) g.lineTo(x, y0 + Math.sin(x * 0.03 + phase * 0.8) * amp + Math.sin(x * 0.011 + 1.3) * amp * 1.4);
    g.lineTo(w, surf); g.closePath(); g.fill();
  };
  lace(surf + (wet - surf) * 0.45, 3, E.night ? 0.16 : 0.32);
  lace(surf + (wet - surf) * 0.22, 2, E.night ? 0.28 : 0.5);
  // the breaking wave: a darker face, its curling crest, the foam on top
  g.fillStyle = withAlpha(E.night ? '#2c434c' : '#5f8593', 0.9); g.fillRect(0, surf - 6, w, 6);
  g.fillStyle = withAlpha('#ffffff', E.night ? 0.6 : 0.85);
  g.beginPath(); g.moveTo(0, surf - 6);
  for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, surf - 7 - Math.abs(Math.sin(x * 0.05 + phase)) * 2.5);
  for (let x = w + 8; x >= 0; x -= 8) g.lineTo(x, surf - 3 + Math.sin(x * 0.08) * 1.2);
  g.closePath(); g.fill();
  for (let x = r() * 20; x < w; x += 6 + r() * 14) { g.fillStyle = withAlpha('#ffffff', 0.4 + r() * 0.4); g.beginPath(); g.arc(x, surf - 1 + r() * 4, 0.8 + r() * 1.6, 0, TAU); g.fill(); }
  g.restore();
  // the dry sand
  sandGround(g, 0, w, wet, h);
  g.save();
  const lip = g.createLinearGradient(0, wet - 2, 0, wet + 6); lip.addColorStop(0, withAlpha('#000000', 0.12)); lip.addColorStop(1, withAlpha('#000000', 0));
  g.fillStyle = lip; g.fillRect(0, wet - 2, w, 8);
  g.restore();
}

/** Shells and pebbles strewn on the sand between y0 and y1, avoiding a band. */
function strewn(g, w, y0, y1, skip) {
  const E = env(), r = rng(83);
  for (let i = 0; i < w / 26; i++) {
    const x = r() * w, y = y0 + r() * (y1 - y0), s = 1.6 + ((y - y0) / Math.max(1, y1 - y0)) * 2.4;
    if (Math.abs(y - skip) < 8) continue;
    if (r() < 0.45) {
      g.fillStyle = E.night ? '#b9a99a' : '#f2e6d8'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, s * 1.3, Math.PI * 1.1, Math.PI * 1.9); g.closePath(); g.fill();
      g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 0.8; g.beginPath(); for (let k = 0; k < 4; k++) { const a = Math.PI * (1.15 + k * 0.23); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * s * 1.2, y + Math.sin(a) * s * 1.2); } g.stroke();
    } else {
      g.fillStyle = withAlpha(E.night ? '#3a332e' : '#8d7f70', 0.8); g.beginPath(); g.ellipse(x, y, s, s * 0.6, 0, 0, TAU); g.fill();
    }
  }
}

/** A beach parasol planted at (x, Y), tilted a little, `s` px tall: a dome
    of stripes with a scalloped rim, its pole, its shadow on the sand. */
function parasol(g, x, Y, s) {
  const E = env(), R = s * 0.6, px = x + s * 0.08, cy = Y - s, peak = cy - R * 0.42;
  softShadow(g, x + s * 0.25, Y + 1, R * 1.15, R * 0.16, 0.7);
  g.strokeStyle = E.night ? '#b8ad9f' : '#f4efe6'; g.lineWidth = Math.max(1.6, s * 0.03);
  g.beginPath(); g.moveTo(x, Y); g.lineTo(px, peak); g.stroke();
  const cols = E.night ? ['#33466e', '#d8cdb5'] : ['#2f4677', '#efe5cd'], N = 6;
  g.save(); g.translate(px, cy); g.rotate(0.08); g.translate(-px, -cy);
  for (let i = 0; i < N; i++) {
    const xa = px - R + (2 * R * i) / N, xb = px - R + (2 * R * (i + 1)) / N;
    g.fillStyle = cols[i % 2]; g.beginPath(); g.moveTo(px, peak);
    g.quadraticCurveTo(px + (xa - px) * 0.85, peak + (cy - peak) * 0.1, xa, cy);
    g.quadraticCurveTo((xa + xb) / 2, cy + R * 0.09, xb, cy);
    g.quadraticCurveTo(px + (xb - px) * 0.85, peak + (cy - peak) * 0.1, px, peak);
    g.closePath(); g.fill();
  }
  const sh = g.createLinearGradient(px - R, 0, px + R, 0); sh.addColorStop(0, 'rgba(255,255,255,0.2)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.32)');
  g.fillStyle = sh; g.beginPath(); g.moveTo(px, peak); g.quadraticCurveTo(px - R * 0.85, peak + (cy - peak) * 0.1, px - R, cy); g.lineTo(px + R, cy); g.quadraticCurveTo(px + R * 0.85, peak + (cy - peak) * 0.1, px, peak); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#b8ad9f' : '#f4efe6'; g.beginPath(); g.arc(px, peak - 1.5, 2, 0, TAU); g.fill();
  g.restore();
}

/* ── the dog ───────────────────────────────────────────────────────────── */

/**
 * A golden retriever, side on, its nose at (X, ·), its feet on y = Y, L px
 * nose to tail, facing +x. `phase` (0..1) runs the gallop; `still` stands it;
 * `lift` raises it off the sand (a leap) and `pitch` tilts it nose-up; `head`
 * lowers (+) or raises (−) the head alone, by px, to reach the ball.
 */
function retriever(g, X, Y, L, { phase = 0, still = false, lift = 0, pitch = 0, head = 0, wag = 0 } = {}) {
  const E = env();
  const coat = E.night ? '#b98a52' : '#d4a062', coatLo = E.night ? '#7d5a33' : '#a77a43', coatHi = E.night ? '#d8ad75' : '#efc68c';
  const legL = L * 0.27, bodyY = -legL - L * 0.1, a = phase * TAU;
  softShadow(g, X - L * 0.5, Y + 1, L * 0.45 * (1 - Math.min(0.5, lift / (L * 2))), L * 0.07, 0.8);
  g.save();
  g.translate(X, Y - lift);
  g.rotate(-pitch);
  // legs: far pair first, darker; a gallop swings the front and back pairs in turn
  const legAt = (hx, ph, far) => {
    const back = hx < -L * 0.5, sw = still ? 0 : Math.sin(ph) * 0.55, up = still ? 0 : Math.max(0, Math.cos(ph)) * legL * 0.3;
    const tuck = lift > 2 ? (back ? -L * 0.14 : L * 0.12) : 0;
    const col = far ? coatLo : coat;
    g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    const F = { x: hx + Math.sin(sw) * legL * 1.0 + tuck, y: -up + (lift > 2 ? -legL * 0.2 : 0) };
    if (back) {
      // the hind leg: a thick thigh forward to the stifle, back to the hock, down to the paw
      const S = { x: hx + L * 0.06 + Math.sin(sw) * legL * 0.3, y: bodyY + legL * 0.42 };
      const Hk = { x: (S.x + F.x) / 2 - L * 0.07, y: bodyY + legL * 0.82 - up * 0.5 };
      g.lineWidth = L * (far ? 0.09 : 0.1); g.beginPath(); g.moveTo(hx, bodyY - L * 0.02); g.lineTo(S.x, S.y); g.stroke();
      g.lineWidth = L * 0.05; g.beginPath(); g.moveTo(S.x, S.y); g.lineTo(Hk.x, Hk.y); g.lineTo(F.x, F.y); g.stroke();
    } else {
      // the foreleg: a straight forearm from the elbow, a little give at the wrist
      const El = { x: hx + Math.sin(sw) * legL * 0.35, y: bodyY + legL * 0.35 };
      const Wr = { x: El.x + (F.x - El.x) * 0.8 + L * 0.01, y: El.y + (F.y - El.y) * 0.8 };
      g.lineWidth = L * (far ? 0.07 : 0.08); g.beginPath(); g.moveTo(hx, bodyY); g.lineTo(El.x, El.y); g.stroke();
      g.lineWidth = L * 0.048; g.beginPath(); g.moveTo(El.x, El.y); g.lineTo(Wr.x, Wr.y); g.lineTo(F.x, F.y); g.stroke();
    }
    g.fillStyle = col; g.beginPath(); g.ellipse(F.x + L * 0.02, F.y - L * 0.014, L * 0.04, L * 0.022, 0, 0, TAU); g.fill();
  };
  legAt(-L * 0.24, a + 0.5, true); legAt(-L * 0.72, a + Math.PI + 0.5, true);
  // the tail: a feathered plume, wagging
  g.strokeStyle = coatLo; g.lineWidth = L * 0.06; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-L * 0.82, bodyY - L * 0.06);
  g.quadraticCurveTo(-L * 0.95, bodyY - L * 0.16 - wag * L * 0.05, -L * 1.0, bodyY - L * 0.06 - wag * L * 0.12 + (still ? 0 : Math.sin(a) * L * 0.04)); g.stroke();
  g.strokeStyle = withAlpha(coatHi, 0.8); g.lineWidth = L * 0.025; g.stroke();
  // the body: a deep chest, a tucked belly, shaded from the light on the left-top
  const bg = g.createLinearGradient(0, bodyY - L * 0.16, 0, bodyY + L * 0.12);
  bg.addColorStop(0, coatHi); bg.addColorStop(0.55, coat); bg.addColorStop(1, coatLo);
  g.fillStyle = bg; g.beginPath();
  g.moveTo(-L * 0.86, bodyY - L * 0.06);
  g.bezierCurveTo(-L * 0.8, bodyY - L * 0.17, -L * 0.45, bodyY - L * 0.16, -L * 0.22, bodyY - L * 0.14);
  g.bezierCurveTo(-L * 0.12, bodyY - L * 0.1, -L * 0.12, bodyY + L * 0.08, -L * 0.26, bodyY + L * 0.1);
  g.bezierCurveTo(-L * 0.42, bodyY + L * 0.05, -L * 0.6, bodyY + L * 0.04, -L * 0.74, bodyY + L * 0.07);
  g.bezierCurveTo(-L * 0.86, bodyY + L * 0.06, -L * 0.9, bodyY, -L * 0.86, bodyY - L * 0.06);
  g.closePath(); g.fill();
  // feathering under the chest and belly
  g.strokeStyle = withAlpha(coatHi, 0.6); g.lineWidth = 1; g.beginPath();
  for (let x = -L * 0.66; x < -L * 0.28; x += L * 0.04) { g.moveTo(x, bodyY + L * 0.07); g.lineTo(x - L * 0.015, bodyY + L * 0.11); }
  g.stroke();
  // near legs over the body
  legAt(-L * 0.2, a, false); legAt(-L * 0.68, a + Math.PI, false);
  // the neck and head, lowered or raised by `head`
  const hx = -L * 0.12, hy = bodyY - L * 0.24 + head;
  g.fillStyle = coat; g.beginPath(); g.moveTo(-L * 0.3, bodyY - L * 0.1); g.quadraticCurveTo(-L * 0.24, hy - L * 0.02, hx - L * 0.02, hy - L * 0.05);
  g.lineTo(hx + L * 0.02, hy + L * 0.08); g.quadraticCurveTo(-L * 0.18, bodyY - L * 0.0, -L * 0.18, bodyY + L * 0.04); g.closePath(); g.fill();
  const hg = g.createRadialGradient(hx - L * 0.03, hy - L * 0.04, L * 0.01, hx, hy, L * 0.11);
  hg.addColorStop(0, coatHi); hg.addColorStop(1, coat);
  g.fillStyle = hg; g.beginPath(); g.ellipse(hx, hy, L * 0.085, L * 0.07, 0, 0, TAU); g.fill();
  // the muzzle out to the nose at x = 0, a little open for the ball
  g.fillStyle = coat; g.beginPath(); g.moveTo(hx + L * 0.03, hy - L * 0.04); g.lineTo(-L * 0.005, hy - L * 0.012); g.lineTo(0, hy + L * 0.02); g.lineTo(hx + L * 0.04, hy + L * 0.05); g.closePath(); g.fill();
  g.fillStyle = '#2b2220'; g.beginPath(); g.arc(-L * 0.004, hy - L * 0.01, L * 0.018, 0, TAU); g.fill();
  g.strokeStyle = '#3a2c26'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx + L * 0.05, hy + L * 0.03); g.lineTo(-L * 0.01, hy + L * 0.018); g.stroke();
  // the ear, hanging, and the eye
  g.fillStyle = coatLo; g.beginPath(); g.ellipse(hx - L * 0.045, hy + L * 0.02, L * 0.035, L * 0.06, 0.25, 0, TAU); g.fill();
  g.fillStyle = '#1e1715'; g.beginPath(); g.arc(hx + L * 0.03, hy - L * 0.025, Math.max(1.1, L * 0.012), 0, TAU); g.fill();
  // a collar, navy
  g.strokeStyle = E.night ? '#41557e' : '#2f4677'; g.lineWidth = Math.max(2, L * 0.03); g.beginPath(); g.moveTo(-L * 0.24, hy + L * 0.05); g.lineTo(-L * 0.17, hy + L * 0.12); g.stroke();
  g.restore();
}
/** The mouth's height above the feet, standing with its head up: the leg,
    the body's drop and the head's rise in retriever(), less the jaw. */
const MOUTH = (L) => L * 0.27 + L * 0.1 + L * 0.24 - L * 0.02;

/* ── the stage ───────────────────────────────────────────────────────── */
export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'catch') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const C = f.catchAt, phone = w < 520;
  const v0 = f.vel(0), aim = (Math.atan2(v0.y, v0.x) * 180) / Math.PI;

  // ── the frame: the thrower, the whole arc, the catch; one scale both ways
  const n = 140, path = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; path.push({ t: tt, ...f.pos(tt) }); }
  const xEnd = Math.max(C.x, f.dog.pos(f.tMax));
  let F = null;
  for (let it = 0, k = 20; it < 4; it++) {
    const TH = Math.max(THROWER_MIN, Math.min(110, 1.8 * k));
    const pl = TH * 0.75 + 64, pr = 96, pt = 34;
    const box = { xLo: -pl / k, xHi: xEnd + pr / k, yLo: 0, yHi: f.apex.y + pt / k };
    const inHud = (x, y) => x < HUD + 8 && y < HUD_H + 8;
    F = fitClear(box, w, h, phone, phone ? 0.5 : 0.3, (fs) => !path.some((q) => inHud(fs.X(q.x) + 8, fs.Y(q.y) - 8))
      && !inHud(fs.X(0) - pl + 10, fs.Y(0) - TH - 10), 62);
    if (!F) return null;
    k = F.k;
  }
  const { k, X, Y } = F, oy = Y(0);
  const TH = Math.max(phone ? THROWER_MIN * 0.8 : THROWER_MIN, Math.min(110, 1.8 * k));
  const dogL = clamp(1.5 * k, phone ? 44 : 64, 150);

  // ── the place: the sea to the horizon, the surf, wet sand, dry sand
  const top = F.Y(f.apex.y);
  const hz = Math.max(top + 30, oy - clamp((oy - 40) * 0.5, 70, 220));
  const dry = hz + (oy - hz) * 0.62;
  shore(g, w, h, hz, dry, t * 1.2);
  strewn(g, w, dry + 4, h - 4, oy);
  parasol(g, X(C.x * 0.62), dry + (oy - dry) * 0.22, clamp((oy - hz) * 0.3, 34, 80));

  // ticks along the sand
  const step = niceStep(xEnd * 1.05, 7);
  for (let x = step; x < xEnd * 1.05; x += step) {
    stroke(g, [{ x: X(x), y: oy }, { x: X(x), y: oy + 5 }], { color: P.ink, width: 1, alpha: 0.5 });
    L.add(fmt(x, step < 1 ? 1 : 0), X(x), oy + 14, { color: P.ink, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }

  // ── keep labels off the path and the top corners
  for (let i = 0; i < path.length; i += 3) { const p = path[i]; L.reserve({ x: X(p.x) - 6, y: Y(p.y) - 6, w: 12, h: 12 }); }
  if (!phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H - 40 }); L.reserve({ x: w - 130, y: 0, w: 130, h: 56 }); }

  // ── the thrower: the hand lets go where the engine starts the ball
  const hand = throwerHand(TH, aim);
  const feet = X(0) - hand.x;
  const pose = fired ? clamp(0.55 + t / Math.max(1e-6, 0.08 * f.tMax), 0, 1) : 0;

  // the height the ball leaves the hand at, beside the thrower
  const dh = feet - TH * 0.32 - 14;
  stroke(g, [{ x: dh, y: oy }, { x: dh, y: Y(f.h) }], { color: P.ink, width: 1.4, alpha: 0.9 });
  for (const yy of [oy, Y(f.h)]) stroke(g, [{ x: dh - 4, y: yy }, { x: dh + 4, y: yy }], { color: P.ink, width: 1.4, alpha: 0.9 });
  L.add(T`${sig3(f.h)} [m]`, dh - 7, (oy + Y(f.h)) / 2, { color: P.ink, align: 'right', pri: 6, size: 14, weight: 700 });

  // ── the ball's path: all of it faintly, the part flown strongly
  stroke(g, path.map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 1.8, alpha: 0.35 });
  stroke(g, path.filter((p) => p.t <= t).map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 3 });
  if (show.apex) {
    dot(g, X(f.apex.x), Y(f.apex.y), 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H_max = ${sig3(f.apex.y)} [m]`, X(f.apex.x), Y(f.apex.y) - 16, { color: P.disp, align: 'center', pri: 6, size: 14, weight: 700 });
  }

  // ── the dog: waits, gallops, and in the last moment reaches for the ball
  const dx = f.dog.pos(t), dv = f.dog.vel(t);
  const caught = Math.abs(f.gap) < 1e-3 * Math.max(1, C.x);
  // paw prints behind it, along the run it has made
  g.save(); g.fillStyle = withAlpha(env().night ? '#000000' : '#6e5a3e', 0.28);
  for (let x = 0.6; x < dx - dogL / k * 0.9; x += dogL / k * 0.45) { const px = X(x); g.beginPath(); g.ellipse(px, oy + 3 + ((x * 7) % 2), 2.2, 1.1, 0, 0, TAU); g.fill(); }
  g.restore();
  const tl = Math.min(0.4, Math.max(0.12, C.t * 0.22)), reach = clamp((t - (C.t - tl)) / tl, 0, 1), e = reach * reach * (3 - 2 * reach);
  const mouthUp = MOUTH(dogL), want = C.y * k;
  const lift = want > mouthUp ? (want - mouthUp) * e : 0;
  const head = want < mouthUp ? Math.min(mouthUp - want, mouthUp - dogL * 0.04) * e : 0;
  const runPx = dx * k, gait = (((runPx / (dogL * 1.15)) % 1) + 1) % 1;
  const r = f.pos(t), v = f.vel(t), bx = X(r.x), by = Y(r.y), br = clamp(0.1 * k, 5.5, 8);
  const done = t >= C.t - 1e-9;
  // caught, the ball is drawn first so the dog's jaws close over it
  if (done && caught) ballAt(g, bx, by, br);
  retriever(g, X(dx), oy, dogL, { phase: gait, still: dv < 1e-9 && t < f.dog.t0 + 1e-9, lift, pitch: lift > 0 ? 0.06 * e : 0, head, wag: t >= C.t - 1e-9 && caught ? 1 : 0 });
  L.reserve({ x: X(dx) - dogL, y: oy - mouthUp - lift - dogL * 0.12, w: dogL * 1.05, h: mouthUp + lift + dogL * 0.12 });
  if (show.velocity !== false && dv > 1e-6) {
    const vl = clamp(w * 0.06, 34, 80) / Math.max(f.dog.vel(f.tMax), 1e-6), ay = oy - mouthUp - lift - 14;
    arrow(g, X(dx) + 4, ay, X(dx) + 4 + dv * vl, ay, { color: P.velVec, width: 2.4, head: 9, dash: [5, 4] });
  }
  if (t < f.dog.t0 - 1e-9) L.add('sets off at ' + T`t = ${sig3(f.dog.t0)} [s]`, X(0) + dogL * 0.2, oy - mouthUp - 26, { color: P.ink, align: 'left', pri: 5, size: 13 });

  // the thrower stands in front of the waiting dog
  thrower(g, feet, oy, TH, P, { dir: 1, pose, aim });

  // ── the catch, once it happens: a pulse, ringed, its height and its distance
  if (done) {
    const cx = X(C.x), cy = Y(C.y);
    if (caught) { const { age, life } = ageOf(t, C.t, f.tMax, Math.max(0.3, f.tMax / 6)); pulse(g, cx, cy, age, life, P.mark, { radius: 46 }); }
    dot(g, cx, cy, br + 9, { stroke: P.mark, width: 2.2 });
    L.add(T`${caught ? '"caught"' : '"at the catch height"'}, t = ${sig3(C.t)} [s]`, cx + 16, cy - 40, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
    const hx = cx + 22;
    stroke(g, [{ x: hx, y: oy }, { x: hx, y: cy }], { color: P.ink, width: 1.4, alpha: 0.9 });
    for (const yy of [oy, cy]) stroke(g, [{ x: hx - 4, y: yy }, { x: hx + 4, y: yy }], { color: P.ink, width: 1.4, alpha: 0.9 });
    L.add(T`${sig3(C.y)} [m]`, hx + 7, (oy + cy) / 2 - 2, { color: P.ink, align: 'left', pri: 6, size: 14, weight: 700 });
    const ry = oy + 30;
    stroke(g, [{ x: X(0), y: ry }, { x: cx, y: ry }], { color: P.ink, width: 1.4, alpha: 0.9 });
    for (const xx of [X(0), cx]) stroke(g, [{ x: xx, y: ry - 5 }, { x: xx, y: ry + 5 }], { color: P.ink, width: 1.4, alpha: 0.9 });
    L.add(T`${sig3(C.x)} [m]`, (X(0) + cx) / 2, ry + 15, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700 });
  }

  // ── the ball, with its velocity; once caught, in the dog's mouth
  const vMax = Math.max(...path.map((p) => Math.hypot(f.vel(p.t).x, f.vel(p.t).y)), 1e-6);
  let vl = clamp(w * 0.07, 40, 90) / vMax;
  vl = Math.min(vl, (w - 16 - bx) / Math.max(1e-6, v.x));
  if (show.velocity !== false && !done) {
    const tx = bx + v.x * vl, ty = by - v.y * vl;
    if (show.components) {
      arrow(g, bx, by, tx, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, tx, by, tx, ty, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, bx, by, tx, ty, { color: P.velVec, width: 3, head: 12 });
    const near = tx > w - 120, sy = Math.sign(ty - by) || -1;
    L.add(T`${sig3(Math.hypot(v.x, v.y))} [m s^-1]`, near ? tx - 10 : tx + 12, near ? ty + sy * 20 : ty, { color: P.vel, align: near ? 'right' : 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
  // the ball is where the engine puts it; at the catch the dog's mouth has come to it
  if (!(done && caught)) ballAt(g, bx, by, br);

  L.draw(g, w, h);
  return null;
}
