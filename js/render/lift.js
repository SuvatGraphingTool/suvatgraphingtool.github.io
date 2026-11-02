// lift.js — the stage for a lift: a building cut away to show its shaft, at
// one scale, floors every 3 m with their landings and doors; the car (a lit
// steel cabin with a passenger) rising on its cables from the pulley at the
// top, the counterweight going down as it goes up; the height risen as a
// bracket, the velocity and acceleration as arrows (vertical, so solid —
// rule 2); a ring at each change of stage and a chime-glow when it stops.
//
// Everything that moves is read from the journey engine (js/core/journey.js,
// rule 4): `f.pos(t).x` is the height risen, `f.vel(t).x` the velocity,
// `f.accel(t)` the acceleration, `f.stages` the moments it changes.

import { pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, sig3, hudBoxes, withAlpha } from './util.js';
import { skyscape, grass, fitSide, env, rng, softShadow } from './scenery.js';
import { runner } from './figures.js';
import { T, num } from '../notation.js';

const SHAFT = 3.2, CAR = [-1.5, 0.6], CW = [0.95, 1.4];   // the shaft, the car and the counterweight across it, m

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind == null || !f.stages) return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520, E = env(), r = rng(13);
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);

  // ── the frame: the building around the shaft, from the ground floor to above the top landing
  // floors about 3 m apart, so many that the lift stops level with a landing
  const D = f.range, STOREY = D / Math.max(1, Math.round(D / 3)), floors = Math.round(D / STOREY) + 2, Hb = floors * STOREY + 1.2;
  const box = { xLo: -5.5, xHi: 6.5, yLo: -1.2, yHi: Hb + 1 };
  // a stage drawn over this one (the forces on a card) may keep room on the right: `o.keepRight`
  const area = { left: HB[0].w + (phone ? 8 : 24), right: w - (phone ? 10 : 18) - (o.keepRight || 0), top: phone ? HB[1].h + 8 : 24, bottom: h - 12 - (o.keepBottom || 0) };
  const { k, X, Y } = fitSide(box, area, { sky: 0.5 });
  const oy = Y(0);
  skyscape(g, 0, 0, w, oy - 30, { seed: 91, far: 'skyline' });
  grass(g, 0, w, oy, h, { seed: 31 });

  // the building's outer wall in section: brick either side, floors cut through
  const wx0 = X(-5), wx1 = X(5.6), top = Y(Hb);
  softShadow(g, (wx0 + wx1) / 2, oy + 2, (wx1 - wx0) * 0.6, 8, 0.7);
  const wall = g.createLinearGradient(wx0, 0, wx1, 0);
  wall.addColorStop(0, E.night ? '#3b3234' : '#d8c8b8'); wall.addColorStop(1, E.night ? '#2b2426' : '#c4b2a1');
  g.fillStyle = wall; g.fillRect(wx0, top, wx1 - wx0, oy - top);
  // inside: warm rooms on each floor, the shaft dark in the middle
  for (let i = 0; i < floors; i++) {
    const y0 = Y((i + 1) * STOREY), y1 = Y(i * STOREY);
    const room = g.createLinearGradient(0, y0, 0, y1);
    room.addColorStop(0, E.night ? '#5a4a3c' : '#f3e7d6'); room.addColorStop(1, E.night ? '#3e3229' : '#e6d4bd');
    g.fillStyle = room; g.fillRect(wx0 + 6, y0 + 4, X(-SHAFT / 2) - wx0 - 6, y1 - y0 - 4); g.fillRect(X(SHAFT / 2), y0 + 4, wx1 - 6 - X(SHAFT / 2), y1 - y0 - 4);
    // a window each side, lit at night
    for (const xw of [X(-3.4), X(3.6)]) {
      const wy = y0 + (y1 - y0) * 0.25, wh = (y1 - y0) * 0.45;
      g.fillStyle = E.night ? '#e9c77a' : '#a9c6d8'; g.fillRect(xw - k * 0.5, wy, k, wh);
      g.strokeStyle = E.night ? '#2a2326' : '#f7f1e8'; g.lineWidth = 2; g.strokeRect(xw - k * 0.5, wy, k, wh);
      g.beginPath(); g.moveTo(xw, wy); g.lineTo(xw, wy + wh); g.stroke();
      g.fillStyle = E.night ? '#4a4044' : '#efe6da'; g.fillRect(xw - k * 0.6, wy + wh, k * 1.2, 3);
    }
    // the floor slab
    g.fillStyle = E.night ? '#6e6466' : '#9a8f86'; g.fillRect(wx0, y1 - 4, wx1 - wx0, 4);
    // the landing doors at this floor, and its number
    g.fillStyle = E.night ? '#8d939c' : '#b9c0c8'; g.fillRect(X(-SHAFT / 2) - 5, y0 + 6, 5, y1 - y0 - 10); g.fillRect(X(SHAFT / 2), y0 + 6, 5, y1 - y0 - 10);
    L.add(`${i === 0 ? 'G' : i}`, wx0 - 8, (y0 + y1) / 2, { color: P.muted, align: 'right', pri: 2, size: 13, maxPush: 0 });
  }
  // the shaft, the roof and the motor room
  const sg = g.createLinearGradient(X(-SHAFT / 2), 0, X(SHAFT / 2), 0);
  sg.addColorStop(0, '#1d1b1f'); sg.addColorStop(0.5, '#2c2a30'); sg.addColorStop(1, '#1d1b1f');
  g.fillStyle = sg; g.fillRect(X(-SHAFT / 2), top, X(SHAFT / 2) - X(-SHAFT / 2), oy - top);
  g.fillStyle = E.night ? '#4a4044' : '#8c7f74'; g.fillRect(wx0 - 4, top - 6, wx1 - wx0 + 8, 8);
  const py = top + 10, px = X(0.3);
  // guide rails down the shaft
  g.strokeStyle = '#4d5158'; g.lineWidth = 2;
  for (const xr of [X(CAR[0]) - 2, X(CAR[1]) + 2, X(CW[1]) + 3]) { g.beginPath(); g.moveTo(xr, top); g.lineTo(xr, oy); g.stroke(); }
  g.fillStyle = '#9aa0a8'; g.beginPath(); g.arc(px, py, Math.max(5, k * 0.35), 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3c3f45'; g.lineWidth = 2; g.stroke();

  // ── the car and the counterweight, both read from the height risen
  const s = f.pos(t).x, v = f.vel(t).x, a = f.accel(t);
  const carH = 2.3, cy0 = Y(s), cy1 = Y(s + carH), cm = (CAR[0] + CAR[1]) / 2;
  // cables: from the pulley to the car's roof, and down the far side to the weight
  const cwY = Y(Math.max(0.5, Hb - 3 - s));
  g.strokeStyle = '#c9ccd2'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(X(cm), py); g.lineTo(X(cm), cy1); g.moveTo(X((CW[0] + CW[1]) / 2), py); g.lineTo(X((CW[0] + CW[1]) / 2), cwY); g.stroke();
  // the counterweight, beside the car in the shaft: a frame of stacked plates
  const cwh = k * 1.8;
  g.fillStyle = '#3e4248'; g.fillRect(X(CW[0]), cwY, X(CW[1]) - X(CW[0]), cwh);
  g.fillStyle = '#6b7078'; for (let i = 0; i < 6; i++) g.fillRect(X(CW[0]) + 2, cwY + 3 + i * (cwh - 6) / 6, X(CW[1]) - X(CW[0]) - 4, (cwh - 6) / 6 - 2);
  // the cabin: brushed steel, a lit interior, the doors, a passenger
  const cx0 = X(CAR[0]), cx1 = X(CAR[1]);
  const cab = g.createLinearGradient(cx0, 0, cx1, 0);
  cab.addColorStop(0, '#d9dde2'); cab.addColorStop(0.5, '#aeb4bb'); cab.addColorStop(1, '#8c939b');
  g.fillStyle = cab; g.fillRect(cx0, cy1, cx1 - cx0, cy0 - cy1);
  g.fillStyle = E.night ? '#fff1c9' : '#fbf3de'; g.fillRect(cx0 + 4, cy1 + 4, cx1 - cx0 - 8, cy0 - cy1 - 8);
  // the passenger, when the car is big enough to show one
  const ph = Math.min(cy0 - cy1 - 10, k * 1.7);
  if (ph > 8) runner(g, (cx0 + cx1) / 2 + k * 0.2, cy0 - 4, ph, P, { still: true });
  g.strokeStyle = withAlpha('#3c3f45', 0.8); g.lineWidth = 2; g.strokeRect(cx0, cy1, cx1 - cx0, cy0 - cy1);
  g.fillStyle = '#3c3f45'; g.fillRect(cx0, cy1 - 4, cx1 - cx0, 4);

  // ── the moments it changes, and the stop
  const marks = (f.stages || []).map((st) => st.t1).filter((x) => x > 1e-9);
  for (const tt of marks) {
    const { age, life } = ageOf(t, tt, f.tMax, Math.max(0.6, f.tMax / 12));
    pulse(g, (cx0 + cx1) / 2, (cy0 + cy1) / 2, age, life, tt >= f.tMax - 1e-9 ? P.mark : P.acc, { radius: 30 });
  }

  // ── the height risen, and the arrows
  const bx = wx1 + 22;
  stroke(g, [{ x: bx, y: oy }, { x: bx, y: cy0 }], { color: P.disp, width: 2 });
  for (const yy of [oy, cy0]) stroke(g, [{ x: bx - 6, y: yy }, { x: bx + 6, y: yy }], { color: P.disp, width: 2 });
  L.reserve({ x: bx - 8, y: cy0, w: 16, h: oy - cy0 });
  L.add(T`s = ${num(s, 2, { trim: true })} [m]`, bx + 18, (oy + cy0) / 2, { color: P.disp, align: 'left', pri: 9, size: 14, weight: 700 });
  const ax = cx1 + 18, ymid = (cy0 + cy1) / 2;
  if (show.velocity !== false && Math.abs(v) > 1e-6) {
    const len = clamp(Math.abs(v) * k * 1.2, 16, 90) * Math.sign(v);
    arrow(g, ax, ymid, ax, ymid - len, { color: P.vel, width: 2.6, head: 10 });
    L.add(T`${sig3(v)} [m s^-1]`, ax + 10, ymid - len * 0.6, { color: P.vel, align: 'left', pri: 8, size: 13, weight: 700 });
  }
  if (Math.abs(a) > 1e-9 && t < f.tMax - 1e-9) {
    const len = clamp(Math.abs(a) * k * 4, 14, 60) * Math.sign(a), axx = cx0 - 18;
    arrow(g, axx, ymid, axx, ymid - len, { color: P.acc, width: 2.4, head: 9 });
    L.add(T`${sig3(a)} [m s^-2]`, axx - 10, ymid - len * 0.6, { color: P.acc, align: 'right', pri: 7, size: 13, weight: 700 });
  }
  if (t >= f.tMax - 1e-9) L.add(T`"at rest," ${num(f.range, 2, { trim: true })} [m] "up"`, (cx0 + cx1) / 2, cy1 - 18, { color: P.mark, align: 'center', pri: 9, size: 14, weight: 700 });
  // ── on a laptop, the car enlarged in the space beside the building: the
  // floor it is passing, the passenger, and the doors opening when it stops
  if (!phone) {
    const ix1 = wx0 - 40, iw = Math.min(170, ix1 - (HB[0].w + 30)), ih = iw * 1.15;
    if (iw > 110) {
      const ix0 = ix1 - iw, iy0 = clamp((cy0 + cy1) / 2 - ih / 2, 30, oy - ih - 10);
      g.save();
      g.fillStyle = withAlpha('#000000', 0.18); g.fillRect(ix0 + 4, iy0 + 5, iw, ih);
      const ig = g.createLinearGradient(ix0, 0, ix0 + iw, 0);
      ig.addColorStop(0, '#dfe3e8'); ig.addColorStop(1, '#9aa1a9');
      g.fillStyle = ig; g.fillRect(ix0, iy0, iw, ih);
      const fl = Math.min(floors - 1, Math.round(s / STOREY - 0.5 + 0.5)), m = 8;
      // the floor indicator over the doors
      g.fillStyle = '#1e2024'; g.fillRect(ix0 + iw / 2 - 22, iy0 + m, 44, 20);
      // the indicator's digit is part of the drawing, set inside its own panel
      g.fillStyle = '#ffb347'; g.font = '700 15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(fl === 0 ? 'G' : `${fl}`, ix0 + iw / 2, iy0 + m + 10);
      // inside: lit, the passenger
      const dx0 = ix0 + m, dy0 = iy0 + 36, dw = iw - 2 * m, dh = ih - 44;
      g.fillStyle = E.night ? '#fff1c9' : '#fbf3de'; g.fillRect(dx0, dy0, dw, dh);
      runner(g, dx0 + dw * 0.58, dy0 + dh - 2, dh * 0.85, P, { still: true });
      // the doors: shut while it moves, sliding open after it stops
      const open = t >= f.tMax - 1e-9 ? 1 : 0;
      const { age, life } = ageOf(t, f.tMax, f.tMax, f.tMax / 6), op = open ? clamp(age / life * 1.6, 0, 0.8) : 0;
      const half = dw / 2 * (1 - op);
      g.fillStyle = '#b8bec6';
      g.fillRect(dx0, dy0, half, dh); g.fillRect(dx0 + dw - half, dy0, half, dh);
      g.strokeStyle = '#7d848c'; g.lineWidth = 1.5; g.strokeRect(dx0, dy0, half, dh); g.strokeRect(dx0 + dw - half, dy0, half, dh);
      g.strokeStyle = '#3c3f45'; g.lineWidth = 2; g.strokeRect(ix0, iy0, iw, ih);
      // a fine line from the inset to the car it shows
      stroke(g, [{ x: ix1, y: iy0 + ih / 2 }, { x: cx0, y: (cy0 + cy1) / 2 }], { color: P.muted, width: 1, alpha: 0.6, dash: [3, 4] });
      g.restore();
      L.reserve({ x: ix0, y: iy0, w: iw, h: ih });
    }
  }
  L.draw(g, w, h);
  return null;
}
