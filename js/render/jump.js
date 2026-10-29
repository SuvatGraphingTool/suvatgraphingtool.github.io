// jump.js — the stage for a parachute jump in stages: free fall, the canopy
// opening and braking, then a steady fall to the field.
//
// A column of sky at ONE scale from the aircraft to the ground, so a 550 m
// drop looks like one: the aircraft it leaves at the top, fields at the
// bottom, a height ruler down the side, and the jumper — arms out in free
// fall, under a canopy from the moment it opens. Where each stage begins is a
// marker line with its height above the ground. The velocity is a vertical
// arrow, solid (rule 2), and the fall is drawn in the path colour.
//
// Backdrop pieces: sky from ./heights.js; `aircraft` and `fields` are
// exported here. Everything drawn is read from js/core/journey.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, fmt, withAlpha, cssVar } from './util.js';
import { sky } from './heights.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

/** A light aircraft side on, nose to the right, its belly at y. */
export function aircraft(g, x, y, L, P) {
  g.save(); g.fillStyle = P.card; g.strokeStyle = P.strong; g.lineWidth = 1.6; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x - L / 2, y - L * 0.06); g.quadraticCurveTo(x + L * 0.3, y - L * 0.16, x + L / 2, y - L * 0.06);
  g.quadraticCurveTo(x + L * 0.3, y + L * 0.02, x - L / 2, y); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - L * 0.42, y - L * 0.06); g.lineTo(x - L * 0.5, y - L * 0.24); g.lineTo(x - L * 0.36, y - L * 0.08); g.stroke();
  g.beginPath(); g.moveTo(x - L * 0.05, y - L * 0.09); g.lineTo(x + L * 0.12, y - L * 0.09); g.lineWidth = 3; g.stroke();
  g.restore();
}
/** Fields from their surface at y = Y down: two greens in strips, a hedge line. */
export function fields(g, x0, x1, Y, bottom) {
  const gr = cssVar('--grass', '#7c9a63');
  g.save();
  g.fillStyle = withAlpha(gr, 0.75); g.fillRect(x0, Y, x1 - x0, bottom - Y);
  g.fillStyle = withAlpha(gr, 0.45);
  for (let x = x0; x < x1; x += 120) g.fillRect(x, Y + 3, 60, bottom - Y - 3);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, Y); g.lineTo(x1, Y); g.stroke();
  g.restore();
}
/** The jumper at (x, y): arms and legs out in free fall, or hanging under a canopy. */
function jumper(g, x, y, s, open, P) {
  g.save(); g.strokeStyle = P.strong; g.fillStyle = P.card; g.lineWidth = Math.max(1.6, s * 0.12); g.lineCap = 'round';
  if (!open) {
    g.beginPath(); g.arc(x, y - s * 0.35, s * 0.18, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x, y - s * 0.17); g.lineTo(x, y + s * 0.3);
    g.moveTo(x - s * 0.5, y - s * 0.25); g.lineTo(x, y - s * 0.05); g.lineTo(x + s * 0.5, y - s * 0.25);
    g.moveTo(x - s * 0.35, y + s * 0.65); g.lineTo(x, y + s * 0.3); g.lineTo(x + s * 0.35, y + s * 0.65); g.stroke();
  } else {
    const cy = y - s * 1.6;
    g.beginPath(); g.ellipse(x, cy, s * 1.1, s * 0.6, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 1;
    for (const dx of [-1, -0.4, 0.4, 1]) { g.beginPath(); g.moveTo(x + dx * s * 1.05, cy); g.lineTo(x, y - s * 0.4); g.stroke(); }
    g.lineWidth = Math.max(1.6, s * 0.12);
    g.beginPath(); g.arc(x, y - s * 0.3, s * 0.16, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x, y - s * 0.14); g.lineTo(x, y + s * 0.35); g.moveTo(x, y + s * 0.35); g.lineTo(x - s * 0.15, y + s * 0.7);
    g.moveTo(x, y + s * 0.35); g.lineTo(x + s * 0.15, y + s * 0.7); g.stroke();
  }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || !f.jump) return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const D = f.jump.D, st = f.stages;

  // one scale: the whole drop fits the height of the stage
  const top = 70, bottom = h - 46;
  const k = (bottom - top) / D;
  const Y = (hgt) => bottom - hgt * k;                  // hgt = height above the ground
  const cx = w < 520 ? w * 0.42 : Math.max(HUD + 120, w * 0.5);

  sky(g, 0, 0, w, bottom);
  fields(g, 0, w, bottom, h);
  aircraft(g, cx + 46, Y(D) - 4, 84, P);

  // the height ruler down the right
  const rx = Math.min(w - 50, cx + 170);
  stroke(g, [{ x: rx, y: Y(0) }, { x: rx, y: Y(D) }], { color: P.ink, width: 1.2, alpha: 0.7 });
  const step = niceStep(D, 6);
  for (let hh = 0; hh <= D + 1e-9; hh += step) {
    stroke(g, [{ x: rx - 4, y: Y(hh) }, { x: rx + 4, y: Y(hh) }], { color: P.ink, width: 1.2, alpha: 0.7 });
    L.add(`${fmt(hh, step < 1 ? 1 : 0)} m`, rx + 8, Y(hh), { color: P.ink, align: 'left', pri: 1, size: 13, bg: false, maxPush: 0 });
  }

  // where each stage begins: a marker across, with its height
  const fallen = (tt) => f.pos(tt).x;
  for (const s of st.slice(1)) {
    const hh = D - fallen(s.t0);
    if (hh <= 0) continue;
    stroke(g, [{ x: cx - 70, y: Y(hh) }, { x: rx - 6, y: Y(hh) }], { color: P.mark, width: 1.2, alpha: 0.7 });
    L.add(T`${tr(hh)} [m] "up," t = ${tr(s.t0)} [s]`, cx - 74, Y(hh), { color: P.mark, align: 'right', pri: 6, size: 13, weight: 700 });
  }

  // the fall so far, and the jumper
  const hNow = D - fallen(t);
  stroke(g, [{ x: cx, y: Y(D) }, { x: cx, y: Y(hNow) }], { color: P.vel, width: 2.6 });
  const open = t >= (st[1]?.t0 ?? Infinity) - 1e-9;
  jumper(g, cx, Y(hNow), 18, open, P);
  const v = f.vel(t).x;
  if (show.velocity !== false && v > 1e-6) {
    const vMax = Math.max(...st.flatMap((s) => [Math.abs(s.u), Math.abs(s.u + s.a * ((isFinite(s.t1) ? s.t1 : f.tMax) - s.t0))]), 1e-6);
    arrow(g, cx + 30, Y(hNow), cx + 30, Y(hNow) + (v / vMax) * 70, { color: P.velVec, width: 2.8, head: 11 });
    L.add(T`${tr(v, 2)} [m s^-1]`, cx + 38, Y(hNow) + (v / vMax) * 70, { color: P.vel, align: 'left', pri: 7, size: 14, weight: 700 });
  }
  if (show.acceleration && Math.abs(f.accel(t)) > 1e-9) {
    const a = f.accel(t);
    arrow(g, cx - 30, Y(hNow), cx - 30, Y(hNow) + Math.sign(a) * 40, { color: P.acc, width: 2.4, head: 10 });
  }
  if (t >= f.tMax - 1e-9) L.add(T`"on the ground," t = ${tr(f.tMax)} [s]`, cx, Y(0) - 26, { color: P.mark, align: 'center', pri: 9, size: 14, weight: 700 });
  L.draw(g, w, h);
  return null;
}
