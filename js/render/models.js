// models.js — the stage for one braking question asked under three models:
// three carriageways of the same road, one above the other, the same car on
// each, and on each its own speed-limit sign at the same distance ahead.
//
// Model 1 brakes all the way to the sign; model 2 brakes down to the limit
// and holds it; model 3 does the same after the driver's reaction time. The
// three cars run on one clock, so the one that reaches the sign first is
// seen to: each is marked with its time and speed as it passes its sign,
// and the moment it gets there pulses. A car's brake lights are on while it
// slows. A measuring tape on the verge in front reads the distance to the
// signs. Velocity along the road is dashed (rule 2). Everything is read from
// the library's journey engine, js/core/journey.js (rule 4).

import { landscape } from './scenery.js';
import { fitCanvas, palette, clamp, labels, arrow, cssVar } from './util.js';
import { car, phaseFor } from './figures.js';
import { pulse, ageOf } from './effects.js';
import { road, verge, tape, screen, s3 } from './lanes.js';
import { T } from '../notation.js';

/** A round speed-limit sign standing on y = Y at x: a red-ringed disc of
    radius r on a post, and beside it a plate with the limit's unit — the
    number on a sign is a speed, and a speed carries its unit. */
export function speedSign(g, x, Y, limit, P, r = 14) {
  const cy = Y - 3 - r, font = cssVar('--font', 'system-ui, sans-serif');
  g.save();
  // the post, lit on its left
  g.fillStyle = '#6b6166'; g.fillRect(x - 1.8, cy, 3.6, Y - cy);
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x - 1.8, cy, 1.2, Y - cy);
  // the disc: a shadow, the white face, the red ring
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x + 1.2, cy + 1.6, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fbf8f3'; g.beginPath(); g.arc(x, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#cf3a35'; g.lineWidth = Math.max(2.4, r * 0.2); g.beginPath(); g.arc(x, cy, r - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#141114'; g.font = `700 13px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(limit, x, cy + 0.5);
  // the plate with its unit
  const unit = T`[m s^-1]`;
  g.font = `600 13px ${font}`;
  const pw = g.measureText(unit).width + 8, px = x + r + 3;
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px + 1, cy - 8 + 1.5, pw, 17);
  g.fillStyle = '#fbf8f3'; g.fillRect(px, cy - 8, pw, 17);
  g.strokeStyle = '#3a3236'; g.lineWidth = 1; g.strokeRect(px + 0.5, cy - 7.5, pw - 1, 16);
  g.fillStyle = '#141114'; g.textAlign = 'left'; g.fillText(unit, px + 4, cy + 1);
  g.restore();
  return { top: cy - r, right: px + pw };
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'models') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const D = f.D, sc = screen(w, h, 3, 112, 156), phone = sc.phone;
  const life = Math.max(1e-6, f.tMax / 8);

  // ── where things go: three carriageways stacked under the readouts, each
  // with its verge behind it, and the tape along the bottom
  const L0 = clamp(w * 0.095, 44, 92), tallCar = 0.45 * L0;
  // the top carriageway's verge, where its name goes, starts clear of the
  // readouts: R[0] ≥ hudB + 38, so the pitch is solved from that
  const tapeY = h - 36;
  const pitch = clamp((tapeY - 71 - sc.hudB) / 2.45, 56, 140);
  const d = clamp(pitch * 0.45, 30, 56), v = pitch - d - 4;
  const R = [0, 1, 2].map((i) => Math.round(tapeY - 26 - d - 7 - (2 - i) * pitch));
  const left = L0 + (phone ? 16 : 26), right = w - (phone ? 26 : 50);
  const k = (right - left) / (D * 1.25);
  const X = (x) => left + x * k;
  const rr = clamp((v - 17) / 2, 10, 15);
  L.reserve({ x: 0, y: 0, w: sc.hudR, h: sc.hudB });

  // ── the place
  landscape(g, w, h, R[0] - v + 2, { far: 'trees', seed: 9, clouds: 5, farHeight: clamp((R[0] - v) * 0.32, 40, 96) });
  const signX = X(D) + rr + 3;
  f.models.forEach((m, i) => {
    const Y = R[i];
    verge(g, 0, w, Y - 11, { seed: 17 + i * 7, scale: phone ? 0.75 : 0.9, keep: [[signX - rr - 6, signX + rr + 70], [X(0) - 6, X(0) + 6]] });
    const wy = road(g, 0, w, Y, d, { seed: 23 + i });
    // where it starts, and the line of the sign, across the carriageway
    g.save(); g.fillStyle = 'rgba(243,238,230,0.85)'; g.fillRect(X(0) - 1.5, Y + 3, 3, d - 7); g.restore();
    g.save(); g.fillStyle = 'rgba(243,238,230,0.55)'; for (let y = Y + 4; y < Y + d - 5; y += 7) g.fillRect(X(D) - 1.5, y, 3, 4); g.restore();
    speedSign(g, signX, Y - 11, s3(f.limit), P, rr);
    L.reserve({ x: signX - rr, y: Y - 12 - 2 * rr, w: rr * 2 + 60, h: 2 * rr });

    // the car, its brake lights on while it slows
    const x = m.pos(t), vel = m.vel(t), acc = m.acc ? m.acc(t) : 0;
    const xf = X(x), yw = wy.near;
    // the moment it reaches its sign — or stops short of it: a ring behind it
    const { age } = ageOf(t, m.tSign, f.tMax, life);
    pulse(g, X(m.xEnd) - L0 / 2, yw - tallCar * 0.5, age, life, P.mark, { radius: Math.max(26, L0 * 0.55) });
    car(g, xf, yw, L0, P, { dir: 1, phase: phaseFor('car', L0, xf - X(0)), brake: acc < -1e-9 && vel > 1e-6 });
    L.reserve({ x: xf - L0, y: yw - tallCar, w: L0, h: tallCar });

    // its name, on the verge behind its own carriageway
    L.add(phone ? `Model ${i + 1}` : `Model ${i + 1}: ${m.does}`, X(0) + 8, Y - 24,
      { color: P.ink, align: 'left', pri: 7, size: 13, weight: 700, maxPush: 0 });
    // its velocity, from its front, dashed
    if (show.velocity !== false && vel > 1e-6) {
      const len = (vel / f.u) * clamp(w * 0.08, 40, 72), vy = yw - tallCar * 0.42;
      const x0 = xf + 4, x1 = x0 + len, text = T`${s3(vel)} [m s^-1]`;
      arrow(g, x0, vy, x1, vy, { color: P.velVec, width: 2.6, head: 9, dash: [6, 4] });
      const room = x1 + 8 + (phone ? 62 : 70) < w;
      L.add(text, room ? x1 + 7 : xf - L0 - 6, vy, { color: P.vel, align: room ? 'left' : 'right', pri: 8, size: 13, weight: 700, maxPush: 0 });
    }
    // as it reaches the sign: its time and speed there, on the verge before it
    if (t >= m.tSign - 1e-9) {
      const text = m.xEnd < D - 1e-9 ? `stops, ${T`t = ${s3(m.tSign)} [s]`}` : `${T`t = ${s3(m.tSign)} [s]`}, ${T`${s3(m.vSign)} [m s^-1]`}`;
      L.add(text, X(m.xEnd) - 8, Y - 24, { color: P.mark, align: 'right', pri: 9, size: 13, weight: 700, maxPush: 0 });
    }
  });

  // ── the tape on the verge in front: the distance to the signs
  tape(g, L, X, 0, D * 1.2, tapeY, { minGap: phone ? 40 : 52, marks: [{ s: D, color: P.mark, text: T`${s3(D)} [m]` }] });
  L.draw(g, w, h);
  return null;
}
