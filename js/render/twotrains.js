// twotrains.js — the stage for two trains on parallel tracks between the same
// two stations: side on at one scale, two tracks (`rails`), a station at each
// end spanning both (`station`, exported: a platform under a canopy, its name
// board), and each train (`train` from figures.js) where it is now — A on the
// near track in the quantity's hue, B on the far one in stone. The gap
// between them is a dimension line with its length; at a time asked it is
// written out; each moment they move at the same speed is marked as it passes.
// Velocities along the track are dashed (rule 2).
//
// Everything drawn is read from js/core/twotrains.js (rule 4).

import { fitCanvas, palette, clamp, labels, stroke, arrow, withAlpha } from './util.js';
import { rails, train, phaseFor } from './figures.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });

/** A station across both tracks at x: a platform behind them under a canopy, its name board. */
export function station(g, L, x, top, bottom, name, P, { side = 1 } = {}) {
  const w = 90, x0 = side > 0 ? x : x - w, roof = top - 46;
  g.save(); g.fillStyle = withAlpha(P.grid, 0.9); g.fillRect(x0, top - 14, w, 14); g.restore();
  stroke(g, [{ x: x0, y: top - 14 }, { x: x0 + w, y: top - 14 }], { color: P.axis, width: 2 });
  for (const cx of [x0 + 10, x0 + w - 10]) stroke(g, [{ x: cx, y: top - 14 }, { x: cx, y: roof }], { color: P.faint, width: 2.4 });
  g.save(); g.fillStyle = P.faint; g.beginPath(); g.moveTo(x0 - 8, roof + 2); g.lineTo(x0 + 6, roof - 10); g.lineTo(x0 + w - 6, roof - 10); g.lineTo(x0 + w + 8, roof + 2); g.closePath(); g.fill(); g.restore();
  stroke(g, [{ x, y: top - 14 }, { x, y: bottom + 16 }], { color: P.ink, width: 1.4, dash: [4, 4] });
  L.add(name, x0 + w / 2, roof - 22, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700 });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'twotrains') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── one scale: station to station, room for a train at each
  const trainL = Math.max(70, Math.min(130, w * 0.1));
  // the tracks low, the stations' canopies clear of the readouts; room for station 2's platform
  const left = 40 + trainL, right = w - 110, yB = Math.max(h * 0.6, 290), yA = yB + 80;
  const k = (right - left) / f.D, X = (x) => left + x * k;
  rails(g, 0, w, yB, P); rails(g, 0, w, yA, P);
  station(g, L, X(0), yB - 40, yA, 'Station 1', P, { side: -1 });
  station(g, L, X(f.D), yB - 40, yA, 'Station 2', P, { side: 1 });
  L.add('B', 12, yB - 10, { color: P.second, align: 'left', pri: 6, size: 15, weight: 700, bg: false });
  L.add('A', 12, yA - 10, { color: P.vel, align: 'left', pri: 6, size: 15, weight: 700, bg: false });

  // ── each train, its front at its position
  const xa = f.posA(t), xb = f.posB(t);
  for (const [x, y, c, v] of [[xb, yB, P.second, f.velB(t)], [xa, yA, P.vel, f.velA(t)]]) {
    train(g, X(x), y, trainL, P, { dir: 1, phase: phaseFor('train', trainL, X(x) - X(0)) });
    stroke(g, [{ x: X(x), y: y - 30 }, { x: X(x), y }], { color: c, width: 2.4 });
    if (show.velocity !== false && v > 1e-6) {
      const vMax = f.vMax;
      arrow(g, X(x) + 6, y - 40, X(x) + 6 + Math.min(70, (v / vMax) * 70), y - 40, { color: P.velVec, width: 2.4, head: 9, dash: [6, 4] });
      L.add(T`${tr(v, 2)} [m s^-1]`, X(x) + 14 + Math.min(70, (v / vMax) * 70), y - 40, { color: c, align: 'left', pri: 7, size: 13, weight: 700 });
    }
  }
  // ── the gap between their fronts, and the moments asked about
  const gx0 = X(Math.min(xa, xb)), gx1 = X(Math.max(xa, xb)), gy = yA + 34;
  if (gx1 - gx0 > 2) {
    stroke(g, [{ x: gx0, y: gy }, { x: gx1, y: gy }], { color: P.mark, width: 1.6 });
    for (const xx of [gx0, gx1]) stroke(g, [{ x: xx, y: gy - 5 }, { x: xx, y: gy + 5 }], { color: P.mark, width: 1.6 });
    L.add(T`${tr(f.gapAt(t), 3)} [m] "apart"`, (gx0 + gx1) / 2, gy + 16, { color: P.mark, align: 'center', pri: 8, size: 13, weight: 700 });
  }
  const passed = f.eq.filter((te) => t >= te - 1e-9);
  if (passed.length) L.add(`same speed at ${passed.map((te) => T`t = ${tr(te)} [s]`).join(', ')}`, w / 2, yB - 120, { color: P.mark, align: 'center', pri: 6, size: 13, weight: 700 });
  if (f.ask != null && t >= f.ask - 1e-9) L.add(`at ${T`t = ${tr(f.ask)} [s]`}, ${T`${tr(f.gap)} [m]`} apart`, w / 2, yA + 72, { color: P.mark, align: 'center', pri: 9, size: 14, weight: 700 });
  L.draw(g, w, h);
  return null;
}
