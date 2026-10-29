// bounce.js — the stage for a ball that hits the ground and bounces.
//
// Side-on and tall, like the vertical line of js/render/column.js: a paved
// courtyard under a city sky, a height scale, and the person who lets the
// ball go — standing on the paving and reaching up, or out on the balcony of
// a brick building when it starts higher than anyone can reach. The ball is
// the stadium's football, drawn at a size you can see, sitting ON the paving
// when it hits rather than half sunk into it: the model's point is the
// bottom of the ball, and every height is measured to that.
//
// What the question is about is marked on the stage, from js/core/bounce.js
// and nothing else (rule 4):
//   · the height it starts from, and the greatest height after each bounce
//     once it has risen there, as solid displacement brackets (vertical);
//   · the height a question asks about, as point B, with the engine's time
//     ringed at every instant the ball is there;
//   · each impact as it happens, with the speed it hit at and left at;
//   · the velocity as a solid arrow in the velocity hue, labelled with its
//     sign in the convention the student chose, which the stage states.
// And, as drawing only: the ball's shadow, which shrinks and fades as it
// rises, and at each of the engine's impact times a squash, a ring spreading
// over the paving and a little dust. The model's impact takes no time and
// the ball never deforms; the effects only mark WHEN, which the engine says.
//
// Reusable: `court()` (the paving) and `balcony()` (a building with a
// balcony at a height) take a canvas and pixel geometry, and know nothing
// about balls.

import { skyscape, env, rng, softShadow } from './scenery.js';
import { dust, squash, ageOf, phaseOf } from './effects.js';
import { thrower, throwerHand, ballAt, THROWER_MIN } from './figures.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha, sig3 } from './util.js';
import { T, num } from '../notation.js';
import { sf } from '../core/bounce.js';

// The readouts this kit shows (js/kits/bounce.js): three boxes down the top
// left, the clock and the impact count side by side top right.
const HUD_L = { w: 200, h: 232 }, HUD_L_PHONE = { w: 165, h: 205 };
const HUD_R = { w: 280, h: 90 }, HUD_R_PHONE = { w: 252, h: 82 };
const LANE = { arrow: 18, down: 36, up: 52, acc: 70, dim: 104, label: 118 };
const tr = (x, p = 2) => num(x, p, { trim: true });
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
const TAU = Math.PI * 2;

/* ── materials ─────────────────────────────────────────────────────────── */

/** Brickwork in the box: courses, staggered joints, a tint per brick, the light from the left. */
function bricks(g, x, y, w, h, { course = 6, seed = 5, base = null } = {}) {
  if (w <= 0 || h <= 0) return;
  const E = env(), r = rng(seed);
  const c = Math.max(3.5, course), bw = c * 2.3;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = base || (E.night ? '#7a473c' : '#b4644d'); g.fillRect(x, y, w, h);
  for (let row = 0, yy = y + h; yy > y - c; row++, yy -= c) {
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += bw) {
      const v = r();
      g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.2 * (0.5 - v)})` : `rgba(255,236,220,${0.16 * (v - 0.5)})`;
      g.fillRect(xx + 0.6, yy - c + 0.6, bw - 1.2, c - 1.2);
    }
  }
  g.strokeStyle = E.night ? 'rgba(25,15,12,0.5)' : 'rgba(236,222,206,0.55)'; g.lineWidth = 1;
  g.beginPath();
  for (let row = 0, yy = y + h; yy > y; row++, yy -= c) {
    g.moveTo(x, Math.round(yy) + 0.5); g.lineTo(x + w, Math.round(yy) + 0.5);
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += bw) { g.moveTo(Math.round(xx) + 0.5, yy); g.lineTo(Math.round(xx) + 0.5, yy - c); }
  }
  g.stroke();
  const lg = g.createLinearGradient(x, 0, x + w, 0);
  lg.addColorStop(0, 'rgba(255,238,220,0.12)'); lg.addColorStop(0.6, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = lg; g.fillRect(x, y, w, h);
  g.restore();
}

/** A stone band (a coping, a sill, a slab edge): lit on top, a shadow under. */
function band(g, x, y, w, h) {
  const E = env();
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, E.night ? '#cbbdb5' : '#f1e9df'); gr.addColorStop(1, E.night ? '#857770' : '#b9ab9f');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = E.shadow; g.fillRect(x, y + h, w, Math.min(3, h * 0.6));
}

/** A glazed window in the box: a painted frame, glazing bars, the sky (or a lit room) in the glass, a sill. */
function windowPane(g, x, y, w, h, { lit = false } = {}) {
  if (w < 4 || h < 4) return;
  const E = env(), fr = clamp(Math.min(w, h) * 0.12, 1.5, 4);
  g.save();
  g.fillStyle = E.night ? '#d9cfc5' : '#f6f1ea'; g.fillRect(x, y, w, h);
  const gx = x + fr, gy = y + fr, gw = w - 2 * fr, gh = h - 2 * fr;
  const gl = g.createLinearGradient(gx, gy, gx + gw * 0.6, gy + gh);
  if (lit) { gl.addColorStop(0, '#ffd9a8'); gl.addColorStop(1, '#d9925c'); }
  else if (E.night) { gl.addColorStop(0, '#4c5868'); gl.addColorStop(1, '#262b35'); }
  else { gl.addColorStop(0, '#cfe3ee'); gl.addColorStop(1, '#6f93ab'); }
  g.fillStyle = gl; g.fillRect(gx, gy, gw, gh);
  g.save(); g.beginPath(); g.rect(gx, gy, gw, gh); g.clip();
  g.fillStyle = `rgba(255,255,255,${E.night && !lit ? 0.12 : 0.28})`;
  g.beginPath(); g.moveTo(gx + gw * 0.15, gy); g.lineTo(gx + gw * 0.45, gy); g.lineTo(gx, gy + gh * 0.55); g.lineTo(gx, gy + gh * 0.25); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = E.night ? '#d9cfc5' : '#f6f1ea';
  if (w > 14) g.fillRect(x + w / 2 - fr * 0.4, y, fr * 0.8, h);
  if (h > 14) g.fillRect(x, y + h * 0.42 - fr * 0.4, w, fr * 0.8);
  g.strokeStyle = E.night ? 'rgba(0,0,0,0.5)' : 'rgba(60,40,30,0.45)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.restore();
  band(g, x - 2, y + h, w + 4, clamp(h * 0.07, 2.5, 5));
}

/* ── the place ─────────────────────────────────────────────────────────── */

/** Hard, horizontal ground seen side on and a little from above: a band of
    paving slabs (their joints running back), the slabs' front edge, and the
    earth under them fading into the page so what is written below stays
    legible. The surface the ball bounces on is y = groundY. */
export function court(g, x0, x1, groundY, bottom, P, pxPerM = 60) {
  const E = env(), r = rng(7);
  g.save();
  // the earth, fading out
  const eg = g.createLinearGradient(0, groundY, 0, bottom);
  eg.addColorStop(0, E.earth); eg.addColorStop(1, withAlpha(E.earth, 0));
  g.fillStyle = eg; g.fillRect(x0, groundY, x1 - x0, bottom - groundY);
  // the paving's top surface, a strip seen from a little above
  const top = clamp(pxPerM * 0.12, 10, 16), edge = 5;
  const pg = g.createLinearGradient(0, groundY, 0, groundY + top);
  pg.addColorStop(0, E.night ? '#5d5257' : '#cdbfb4'); pg.addColorStop(1, E.night ? '#4a4045' : '#b4a598');
  g.fillStyle = pg; g.fillRect(x0, groundY, x1 - x0, top);
  // slab joints: across the strip, and running back towards a far point
  g.strokeStyle = E.night ? 'rgba(0,0,0,0.45)' : 'rgba(80,60,50,0.35)'; g.lineWidth = 1;
  const joint = clamp(pxPerM * 0.9, 34, 90), vx = (x0 + x1) / 2;
  g.beginPath();
  g.moveTo(x0, groundY + top * 0.5 + 0.5); g.lineTo(x1, groundY + top * 0.5 + 0.5);
  for (let x = x0 - joint; x < x1 + joint; x += joint) {
    const xf = vx + (x - vx) * 0.86;
    g.moveTo(xf, groundY); g.lineTo(x, groundY + top);
  }
  g.stroke();
  // texture: flecks in the stone
  for (let i = 0; i < (x1 - x0) / 3; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.10)';
    g.fillRect(x0 + r() * (x1 - x0), groundY + 1 + r() * (top - 2), 1.3, 1.3);
  }
  // the slabs' front edge, in shade
  const fg = g.createLinearGradient(0, groundY + top, 0, groundY + top + edge);
  fg.addColorStop(0, E.night ? '#3a3135' : '#9a897d'); fg.addColorStop(1, E.night ? '#2a2326' : '#7f6e63');
  g.fillStyle = fg; g.fillRect(x0, groundY + top, x1 - x0, edge);
  g.restore();
  // the surface line itself, where the ball's bottom meets the ground
  stroke(g, [{ x: x0, y: groundY }, { x: x1, y: groundY }], { color: withAlpha(E.night ? '#ffffff' : '#3a2c26', 0.35), width: 1.2 });
}

/** A brick building whose right-hand wall stands at x = xWall1 (from
    xWall0), with a balcony slab at y = yPx reaching out to `tip`: a railing
    with balusters along its edge, windows to each storey, a door, a parapet. */
export function balcony(g, xWall0, xWall1, tip, yPx, groundY, pxPerM, P, { rail = null } = {}) {
  const E = env();
  const w = xWall1 - xWall0;
  const storey = clamp(3 * pxPerM, 46, 120);
  const top = Math.max(-10, yPx - storey * 0.95);       // a storey above the balcony, then the roof
  softShadow(g, (xWall0 + xWall1) / 2, groundY + 1, w * 0.62, 6, 0.9);
  bricks(g, xWall0, top, w, groundY - top, { course: clamp(storey / 9, 4, 7), seed: 13 });
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(xWall0, groundY - 6, w, 6);
  band(g, xWall0 - 3, top - 5, w + 6, 6);
  // the balcony door behind the person, and windows on each storey below
  const ww = clamp(w * 0.32, 14, 40), wh = clamp(storey * 0.5, 20, 60);
  const dh = clamp(storey * 0.68, 26, 80), dw = clamp(w * 0.34, 16, 44);
  if (yPx < groundY - 20) {
    const dx = xWall0 + w * 0.42 - dw / 2;
    windowPane(g, dx, yPx - dh, dw, dh, { lit: E.night });
  }
  for (let yb = yPx + storey * 0.62; yb < groundY - 8; yb += storey) {
    if (groundY - yb < storey * 0.5) {
      // the ground floor: a door with a step
      const dx = xWall0 + w * 0.5 - dw * 0.45;
      const gg = g.createLinearGradient(dx, 0, dx + dw * 0.9, 0);
      gg.addColorStop(0, E.night ? '#3b4a5c' : '#3d5a78'); gg.addColorStop(1, E.night ? '#23303e' : '#2a4058');
      g.fillStyle = gg; g.fillRect(dx, groundY - dh, dw * 0.9, dh);
      g.fillStyle = '#d9b26a'; g.beginPath(); g.arc(dx + dw * 0.9 - 4, groundY - dh * 0.48, 1.6, 0, TAU); g.fill();
      band(g, dx - 2, groundY - dh - 3, dw * 0.9 + 4, 3);
      break;
    }
    windowPane(g, xWall0 + w * 0.5 - ww / 2, yb - wh / 2, ww, wh, { lit: E.night && Math.round(yb) % 2 === 0 });
  }
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(xWall1 - 3, top, 3, groundY - top);
  // the slab, out to the edge, its underside in shade, and a bracket under it
  const slab = clamp(pxPerM * 0.2, 6, 10);
  g.fillStyle = E.shadow;
  g.beginPath(); g.moveTo(xWall1, yPx + slab); g.lineTo(tip, yPx + slab); g.lineTo(xWall1, yPx + slab + clamp((tip - xWall1) * 0.6, 8, 40)); g.closePath(); g.fill();
  band(g, xWall1 - 1, yPx, tip - xWall1 + 1, slab);
  // the railing along its outer edge: balusters and a handrail
  const rh = rail ?? clamp(pxPerM * 1, 16, 40);
  const metal = E.night ? '#c9c0bb' : '#4a4145';
  g.strokeStyle = metal; g.lineWidth = 1.4;
  g.beginPath();
  for (let x = xWall1 + 5; x <= tip - 2; x += 6) { g.moveTo(x, yPx); g.lineTo(x, yPx - rh); }
  g.stroke();
  g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(xWall1, yPx - rh); g.lineTo(tip - 1, yPx - rh); g.lineTo(tip - 1, yPx); g.stroke();
}

/** A displacement bracket up the side: ground to a height, ends capped. */
function bracket(g, x, y0, y1, P) {
  stroke(g, [{ x, y: y0 }, { x, y: y1 }], { color: P.disp, width: 2.4 });
  for (const y of [y0, y1]) stroke(g, [{ x: x - 6, y }, { x: x + 6, y }], { color: P.disp, width: 2 });
}

/** A ring spreading over the paving from x: flattened, because the paving is seen nearly edge on. */
function floorRing(g, x, y, age, life, color) {
  const u = phaseOf(age, life); if (u == null) return;
  const e = 1 - (1 - u) ** 3;
  g.save();
  for (const k of [1, 0.6]) {
    g.strokeStyle = withAlpha(color, 0.8 * (1 - u) * k); g.lineWidth = 2.2 * k;
    g.beginPath(); g.ellipse(x, y + 4, (10 + 40 * e) * k, (3 + 8 * e) * k, 0, 0, TAU); g.stroke();
  }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'bounce') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), E = env();
  const L = labels();
  const phone = w < 520;
  const hl = phone ? HUD_L_PHONE : HUD_L, hr = phone ? HUD_R_PHONE : HUD_R;
  L.reserve({ x: 0, y: 0, w: hl.w, h: hl.h });
  L.reserve({ x: w - hr.w, y: 0, w: hr.w, h: hr.h });
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const now = f.at(t);

  // ── the frame: the ground to a little above the highest it gets, and room
  // over the start for the head of whoever lets it go
  const top = Math.max(f.top, 0.5);
  const groundY = Math.round(h - (phone ? 100 : 84)), topY = phone ? hr.h + 14 : 60;
  // The person is drawn at their real size when the frame is wide enough to
  // hold a few metres, and otherwise between 50 px (the floor that keeps a
  // face and an arm readable) and a size that leaves the ball the subject:
  // a figure, not to scale, as every figure on this site is.
  const ky = (groundY - topY - (f.h > 1e-6 ? THROWER_MIN * 0.3 : 0)) / (top * 1.08);
  const TH = clamp(1.8 * ky, THROWER_MIN, phone ? 78 : 104);
  const Y = (y) => groundY - y * ky;
  const R = clamp(0.11 * ky, 7, 14);                   // a ball you can see; real size when the frame allows

  // ── who lets it go, and from where: reaching up from the paving when the
  // start is within reach, otherwise out on a balcony
  const ballC = Y(f.h) - R;                            // the ball's centre at the start
  const reach = groundY - ballC;                       // how high the hand must be
  const standing = f.h < 1e-6 || reach <= TH * 1.1;
  let aim, hand, fyFeet;
  if (standing) {
    aim = clamp(Math.asin(clamp((reach / TH - 0.78) / 0.33, -1, 1)) * 180 / Math.PI, -60, 88);
    hand = throwerHand(TH, aim); fyFeet = groundY;
  } else {
    aim = f.u > 1e-9 ? 70 : f.u < -1e-9 ? -50 : -5;
    hand = throwerHand(TH, aim);
    fyFeet = Math.min(ballC + hand.y, Y(f.h) + (groundY - Y(f.h)) / 3);
  }
  const personW = hand.x + R * 0.8;                   // from the feet to the ball's line
  const bw = standing ? 0 : clamp(TH * 1.5, 70, 150);  // the building
  const leftRaw = standing ? personW + TH * 0.35 : personW + TH * 0.45 + bw;
  const rightRaw = LANE.label + 112;

  // ── across: the scale (left on a laptop, right on a phone), the place, the line, the labels
  const k = phone ? 0.6 : 1;
  const lane = (n) => cx + LANE[n] * k;
  let cx, rx;
  if (phone) {
    // the line clear of the readouts, the scale on the right edge
    rx = w - 8;
    cx = Math.round(Math.max(hl.w + 22, Math.min(16 + leftRaw, w * 0.55)));
  } else {
    rx = hl.w + 60;
    cx = Math.round(Math.max(rx + 22 + leftRaw, Math.min(w * 0.44, w - 24 - rightRaw)));
  }

  skyscape(g, 0, 0, w, groundY, { far: 'skyline', seed: 25 });
  court(g, 0, w, groundY, h, P, ky);

  // ── the height scale
  const step = niceStep(top * 1.1, 6);
  stroke(g, [{ x: rx, y: Y(0) }, { x: rx, y: Y(top * 1.06) }], { color: P.faint, width: 1.4 });
  for (let m = 0; m <= top * 1.06 + 1e-9; m += step) {
    stroke(g, [{ x: rx - 7, y: Y(m) }, { x: rx, y: Y(m) }], { color: P.faint, width: 1.4 });
    L.add(`${num(m, step < 1 ? 1 : 0, { trim: m >= 1e5 })} m`, rx - 11, Y(m),
      { color: P.muted, align: 'right', pri: 1, bg: false, size: 14, maxPush: 0 });
    if (show.grid && m > 0) stroke(g, [{ x: phone ? 0 : rx, y: Y(m) }, { x: phone ? rx : w - 20, y: Y(m) }], { color: P.grid, width: 1 });
  }

  // ── where it starts from, and who lets it go
  const fx = cx - hand.x - R * 0.8;
  if (!standing) {
    const xWall1 = fx - TH * 0.42, xWall0 = xWall1 - bw;
    balcony(g, xWall0, xWall1, cx - R - 4, fyFeet, groundY, ky, P, { rail: clamp(TH * 0.42, 14, 40) });
  }
  const pose = fired ? 1 : 0.15;
  thrower(g, fx, fyFeet, TH, P, { pose, aim });
  if (f.h > 1e-6) L.add('A', cx - R - 10, ballC - R - 8, { color: P.ink, align: 'right', pri: 9, size: 16, weight: 700, maxPush: 20 });

  // ── the line it moves along
  stroke(g, [{ x: cx, y: groundY }, { x: cx, y: topY - 14 }], { color: P.faint, width: 1.2, dash: [4, 6] });

  // ── its height at the start, as a bracket up the side
  const dimX = lane('dim');
  if (f.h > 1e-6) {
    bracket(g, dimX, Y(0), Y(f.h), P);
    stroke(g, [{ x: cx + R + 3, y: Y(f.h) }, { x: dimX - 8, y: Y(f.h) }], { color: P.disp, width: 1, dash: [2, 4], alpha: 0.6 });
    L.add(T`${tr(f.h)} [m]`, dimX + 12, Y(f.h / 2), { color: P.disp, align: 'left', pri: 8, size: 16, weight: 700 });
  }

  // ── the greatest height of each flight, once it has been there
  const tops = [];
  if (f.top0 && t >= f.top0.t - 1e-9) tops.push({ H: f.top0.H, t: f.top0.t, first: true });
  f.impacts.forEach((x) => {
    if (x.tTop < f.tMax - 1e-9 && t >= x.tTop - 1e-9) tops.push({ H: x.H, t: x.tTop, k: x.k });
  });
  if (show.apex !== false) {
    tops.forEach((q, i) => {
      const yy = Y(q.H), last = i === tops.length - 1;
      stroke(g, [{ x: cx - 18, y: yy }, { x: dimX + 22, y: yy }], { color: P.disp, width: 1.2, dash: [5, 4], alpha: last ? 0.9 : 0.45 });
      // the latest one is bracketed and named; the ones before keep a level line
      // (and only when it stands clear of the paving: a bounce of a few
      // millimetres keeps its level line and is named in the HUD and the ending)
      if (last && Y(0) - yy > 18) {
        const bx = dimX + 22;
        if (q.k) bracket(g, bx, Y(0), yy, P);
        const v = T`${sf(q.H, { trim: true })} [m]`;
        L.add(phone ? v : q.first ? `top ${v}` : `rises to ${v}`, bx + 12, yy, {
          color: P.disp, align: 'left', pri: 8, size: 15, weight: 700, maxPush: 20 });
      }
    });
  }

  // ── B, the height asked about, and every instant it is there
  if (f.y != null) {
    const yy = Y(f.y);
    stroke(g, [{ x: cx - 30, y: yy }, { x: w - 24, y: yy }], { color: P.mark, width: 1.6, dash: [8, 6], alpha: 0.85 });
    L.add(`B, ${T`${tr(f.y)} [m]`} up`, w - (phone ? 52 : 28), yy - 14, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
    // Every instant it has been there is ringed, in the lane of the way it
    // was going; the latest is named beside its ring, with which way and
    // when, and the earlier ones fade. The whole list is in the working and
    // on the ending card.
    const seen = f.crossings.filter((c) => c.dir !== 'start' && t >= c.t - 1e-9);
    seen.forEach((c, i) => {
      const last = i === seen.length - 1;
      const side = c.dir === 'up' ? lane('up') : lane('down');
      g.save(); g.globalAlpha = last ? 1 : 0.4;
      dot(g, side, yy, 7, { stroke: P.mark, width: 2.4 });
      g.restore();
      if (!last) return;
      const way = c.dir === 'up' ? 'going up' : c.dir === 'down' ? 'coming down' : 'at the top';
      const when = c.after === 0 ? T`t = ${sf(c.t)} [s]` : `${T`${sf(c.since)} [s]`} after the ${ORD[c.after - 1] || `${c.after}th`} impact`;
      const below = yy + 20 < groundY - 12;
      L.add(`${when}, ${way}`, lane('dim') + 14, below ? yy + 18 : yy - 34, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
    });
  }

  // ── the history: a mark at equal steps of time, the way down in one lane
  // and the way up in the next; earlier flights fainter
  const dt = niceStep(f.tMax, 10);
  const dp = dt >= 1 ? 0 : dt >= 0.1 ? 1 : 2;
  for (let i = 0; i * dt <= t + 1e-9; i++) {
    const tt = i * dt, s = f.at(tt);
    const up = s.vUp > 1e-9;
    const x = up ? lane('up') : lane('down');
    const old = s.flight < now.flight;
    g.save(); g.globalAlpha = old ? 0.4 : 1;
    dot(g, x, Y(s.y), 3.6, { fill: P.vel, stroke: P.surface, width: 1.3 });
    g.restore();
    if (show.ticks && !old) {
      L.add(T`${num(tt, dp)} [s]`, x + (up ? 10 : -10), Y(s.y), { color: P.vel, align: up ? 'left' : 'right', pri: 2, size: 13, bg: false, maxPush: 20 });
    }
  }

  // ── the impacts so far: the latest one's speeds, under the paving
  const hit = f.impacts.filter((x) => t >= x.t - 1e-9);
  const latest = hit[hit.length - 1];
  const life = clamp(f.tMax * 0.08, 0.06, 0.4);
  for (const x of hit) {
    const { age } = ageOf(t, x.t, f.tMax, life);
    floorRing(g, cx, groundY, age, life * 1.4, P.mark);
    dust(g, cx, groundY + 3, age, life * 1.6, { size: 0.55, n: 10, seed: 29 + x.k });
  }
  if (latest) {
    const leaves = latest.t < f.tMax - 1e-9;
    const head = `${ORD[latest.k - 1] || `${latest.k}th`} impact, ${T`t = ${sf(latest.t)} [s]`}`;
    const speeds = `hits at ${T`${sf(latest.vIn)} [m s^-1]`}` + (leaves ? `, leaves at ${T`${sf(latest.vOut)} [m s^-1]`}` : '');
    // one line where there is room for it, two on a phone
    if (!phone) L.add(`${head}: ${speeds}`, hl.w + 10, groundY + 36, { color: P.ink, align: 'left', pri: 9, size: 14, weight: 700 });
    else {
      L.add(head, 10, groundY + 30, { color: P.ink, align: 'left', pri: 9, size: 14, weight: 700 });
      L.add(speeds, 10, groundY + 54, { color: P.ink, align: 'left', pri: 9, size: 14, weight: 700 });
    }
  }

  // ── the convention and g, said where the signed numbers are: on the
  // ground beyond the marks, a line of their own
  const dirUp = f.sign > 0;
  const cy0 = phone ? groundY + 80 : groundY + 60;
  const sx = w - 22;
  arrow(g, sx, dirUp ? cy0 + 8 : cy0 - 8, sx, dirUp ? cy0 - 8 : cy0 + 8, { color: P.strong, width: 2.2, head: 8 });
  L.add(`${dirUp ? 'up' : 'down'} is positive`, sx - 12, cy0, { color: P.strong, align: 'right', pri: 8, size: 14 });
  if (Math.abs(f.g) > 1e-9) {
    L.add(`${T`g = ${tr(f.g)} [m s^-2]`}, downwards`, phone ? 10 : hl.w + 10, cy0,
      { color: show.acceleration ? P.acc : P.muted, align: 'left', pri: 3, size: 14 });
  }

  // ── the ball: its shadow, the ball itself (squashed at each impact the
  // engine names, springing back), its velocity and its acceleration
  const yb = Y(now.y);
  const lift = clamp(now.y / top, 0, 1);
  softShadow(g, cx, groundY + 2, R * (1.5 - 0.7 * lift), R * 0.32, 1 - 0.75 * lift);
  let sq = { sx: 1, sy: 1 };
  if (latest && fired) sq = squash(ageOf(t, latest.t, f.tMax, life).age, life);
  g.save();
  g.translate(cx, yb);
  g.scale(sq.sx, sq.sy);
  ballAt(g, 0, -R, R);
  g.restore();

  if (show.velocity !== false && Math.abs(now.vUp) > 1e-6) {
    const vMax = Math.max(1e-6, ...f.impacts.map((x) => x.vIn), Math.abs(f.u));
    const len = clamp(Math.abs(now.vUp) / vMax * clamp(h * 0.18, 50, 120), 14, 140) * Math.sign(now.vUp);
    // From the ball, the way it is going — but never through the ground: a
    // downward arrow that would reach it is lifted so its tip stops at the
    // paving, still beside the ball.
    const ax = lane('arrow');
    let y0 = yb - R, y1 = y0 - len;
    if (y1 > groundY - 3) { y0 -= y1 - (groundY - 3); y1 = groundY - 3; }
    arrow(g, ax, y0, ax, y1, { color: P.velVec, width: 3, head: 11 });
    // the label at the arrow's tip when it points up, its tail when down
    const ly = len > 0 ? y1 - 12 : y0 - 14;
    L.add(T`v = ${sig3(now.v)} [m s^-1]`, ax + 8, ly, { color: P.vel, align: 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration && t < f.tMax - 1e-9) {
    const ax = lane('acc');
    arrow(g, ax, yb - R - 16, ax, yb - R + 16, { color: P.acc, width: 2.6, head: 10 });
  }
  L.draw(g, w, h);
  return null;
}

/** A sketch for a card: the ball's height against time, as dots. */
export function sketch(f) {
  const X = (t) => 8 + (t / f.tMax) * 104, Y = (y) => 50 - (y / (f.top * 1.1)) * 42;
  const dots = Array.from({ length: 29 }, (_, i) => {
    const t = (i / 28) * f.tMax;
    return `<circle cx="${X(t).toFixed(1)}" cy="${Y(f.at(t).y).toFixed(1)}" r="2" fill="var(--vel)"/>`;
  }).join('');
  const wall = f.h > 0 ? `<rect x="2" y="${Y(f.h).toFixed(1)}" width="5" height="${(50 - Y(f.h)).toFixed(1)}" fill="var(--border-soft)" stroke="var(--border)" stroke-width="1"/>` : '';
  return `<svg viewBox="0 0 120 60" aria-hidden="true">
    <line x1="2" y1="50.5" x2="118" y2="50.5" stroke="var(--border)" stroke-width="1.6"/>${wall}${dots}
    ${f.impacts.map((x) => `<circle cx="${X(x.t).toFixed(1)}" cy="50.5" r="3.6" fill="none" stroke="var(--mark)" stroke-width="1.4"/>`).join('')}
  </svg>`;
}
