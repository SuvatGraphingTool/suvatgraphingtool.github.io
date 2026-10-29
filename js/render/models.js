// models.js — the stage for one braking question asked under three models:
// three lanes of the same road, the same car in each, the same speed-limit
// sign at the same distance ahead.
//
// Model 1 brakes all the way to the sign; model 2 brakes down to the limit
// and holds it; model 3 does the same after the driver's reaction time. The
// three cars run on one clock, so the one that reaches the sign first is
// seen to, and each is marked with its time and speed as it passes the sign.
// Velocity along the road is dashed (rule 2). Everything is read from the
// library's journey engine, js/core/journey.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, niceStep, fmt, withAlpha } from './util.js';
import { car, roadway, phaseFor } from './figures.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;

/** A round speed-limit sign on a post, its post foot at (x, Y). */
export function speedSign(g, x, Y, limit, P) {
  g.save();
  stroke(g, [{ x, y: Y }, { x, y: Y - 46 }], { color: P.strong, width: 2.4 });
  g.fillStyle = '#ffffff'; g.strokeStyle = '#d33a3a'; g.lineWidth = 4;
  g.beginPath(); g.arc(x, Y - 60, 15, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#111111'; g.font = `700 14px ${getComputedStyle(document.documentElement).getPropertyValue('--font') || 'system-ui'}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(limit), x, Y - 60);
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'models') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const D = f.D;

  // the road: the sign at D, a little road beyond it; one scale across
  // clear of the readouts; on a phone, room for the car's length at the start
  const left = w < 520 ? 70 : HUD + 40, right = w - 60;
  const k = (right - left) / (D * 1.15);
  const X = (x) => left + x * k;
  const colors = [P.vel, P.second, P.strong];
  const top = w < 520 ? Math.max(150, h * 0.3) : Math.max(250, h * 0.36), gap = Math.min(110, (h - top - 70) / 3);
  // the distance ruler under the last lane
  const step = niceStep(D, 6);
  const lastY = top + gap * 2 + 40;
  for (let x = 0; x <= D * 1.15; x += step) {
    stroke(g, [{ x: X(x), y: lastY + 20 }, { x: X(x), y: lastY + 26 }], { color: P.axis, width: 1.2 });
    L.add(`${fmt(x, 0)} m`, X(x), lastY + 38, { color: P.faint, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  f.models.forEach((m, i) => {
    const Y = top + gap * i;
    roadway(g, 0, w, Y, P);
    speedSign(g, X(D), Y, f.limit, P);
    stroke(g, [{ x: X(0), y: Y - 4 }, { x: X(0), y: Y + 20 }], { color: P.mark, width: 2 });
    const x = m.pos(t), v = m.vel(t), L0 = 56;
    car(g, X(x), Y, L0, P, { dir: 1, ring: i ? colors[i] : null, phase: phaseFor('car', L0, X(x) - X(0)) });
    // its name under its own lane, clear of the readouts and of the car
    L.add(`Model ${i + 1}: ${m.say}`, X(0), Y + 30, { color: colors[i], align: 'left', pri: 7, size: 13, weight: 700 });
    if (show.velocity !== false && v > 1e-6) {
      arrow(g, X(x) + 6, Y - 34, X(x) + 6 + (v / f.u) * 60, Y - 34, { color: P.velVec, width: 2.4, head: 9, dash: [5, 4] });
      L.add(T`${tr(v, 2)} [m s^-1]`, X(x) + 12 + (v / f.u) * 60, Y - 34, { color: P.vel, align: 'left', pri: 6, size: 13, weight: 700 });
    }
    // as it passes the sign: its time and speed there
    if (t >= m.tSign - 1e-9) {
      if (m.xEnd < D - 1e-9) L.add(T`"stops," t = ${tr(m.tSign)} [s]`, X(m.xEnd) + 8, Y - 22, { color: P.mark, align: 'left', pri: 8, size: 13, weight: 700 });
      else L.add(T`t = ${tr(m.tSign)} [s], ${tr(m.vSign)} [m s^-1]`, X(D) + 22, Y - 22, { color: P.mark, align: 'left', pri: 8, size: 13, weight: 700 });
    }
  });
  L.add(T`${tr(D)} [m]`, X(D), top - 84, { color: P.ink, align: 'center', pri: 5, size: 13 });
  L.draw(g, w, h);
  return null;
}
