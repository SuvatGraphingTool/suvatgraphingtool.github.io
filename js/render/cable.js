// cable.js — the stage for a lift on its cable with a passenger, and the
// forces that move them: the lift's own stage (js/render/lift.js — the
// building cut away, the shaft, the car rising), and beside it two
// free-body diagrams on a card, redrawn stage by stage from the engine:
//   the lift and passenger together — the cable's tension up, their weight down;
//   the passenger alone — the floor's push up, their weight down.
// Whichever is bigger shows which way the resultant points: up while it
// speeds up, none at a steady speed, down while it slows.
//
// Everything drawn is read from js/core/cable.js (rule 4).

import { render as liftStage } from './lift.js';
import { palette, arrow, withAlpha, unview, clamp } from './util.js';
import { paper } from './scenery.js';
import { T, num } from '../notation.js';

// as the working prints a force: 3 decimal places at most, trailing zeros dropped
const fN = (x) => num(x, 3, { trim: true });
const STAGE = { up: 'speeding up', hold: 'at a steady speed', down: 'slowing down' };

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'cable') return null;
  const r = canvas.getBoundingClientRect(), w = r.width, h = r.height;
  const side = w >= 760, cw = side ? 288 : Math.min(w - 20, 340), ch = side ? 280 : 186;
  liftStage(canvas, cam, { ...o, keepRight: side ? cw + 24 : 0, keepBottom: side ? 0 : ch + 14 });
  const g = canvas.getContext('2d'); unview(g);
  const P = palette(), t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  // before it sets off, and once it has stopped, it is at rest: the forces just hold the weights
  const still = !fired || t >= f.tMax - 1e-9, st = still ? null : f.cable.find((x) => t < x.t1 - 1e-12) || f.cable[f.cable.length - 1];
  const Tn = still ? f.weight : f.tension(t), R = !f.m ? null : still ? f.weightPassenger : f.floor(t);
  const cx = side ? w - cw - 14 : 10, cy = side ? h - ch - 14 : h - ch - 10;
  paper(g, cx, cy, cw, ch);
  const lab = (txt, x, y, col, al = 'left', wt = 700) => { g.save(); g.font = `${wt} 13px system-ui, sans-serif`; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
  lab(still ? (fired ? 'At rest at the top' : 'At rest at the bottom') : `The forces, ${STAGE[st.kind]}`, cx + 12, cy + 16, P.muted);
  // one scale for every arrow, so the two diagrams compare; the body in the middle of the room left
  const big = Math.max(Tn, f.weight, 1e-9), cols = f.m ? 2 : 1, colW = (cw - 24) / cols;
  const top = cy + 34, bottom = cy + ch - 10, room = (bottom - top - 26 - 2 * 18) / 2, sc = room / big;
  const body = (x, y, label) => {
    g.save(); g.font = '600 13px system-ui, sans-serif';
    const wB = Math.min(colW - 8, Math.max(54, g.measureText(label).width + 14)), hB = 26;
    g.fillStyle = withAlpha(P.ink, 0.1); g.strokeStyle = P.ink; g.lineWidth = 1.4;
    g.beginPath(); g.roundRect?.(x - wB / 2, y - hB / 2, wB, hB, 4); g.fill(); g.stroke(); g.restore();
    lab(label, x, y, P.ink, 'center', 600);
  };
  const diagram = (i, up, down, upTxt, downTxt, name) => {
    const x = cx + 12 + colW * (i + 0.5), y = (top + bottom) / 2, hB = 13;
    body(x, y, name);
    const lu = up * sc, ld = down * sc;
    if (lu > 0.5) arrow(g, x, y - hB, x, y - hB - lu, { color: P.ink, width: 2.4, head: Math.min(9, lu * 0.6) });
    if (ld > 0.5) arrow(g, x, y + hB, x, y + hB + ld, { color: P.ink, width: 2.4, head: Math.min(9, ld * 0.6) });
    lab(upTxt, x, Math.max(top, y - hB - lu - 10), P.ink, 'center');
    lab(downTxt, x, Math.min(bottom, y + hB + ld + 12), P.ink, 'center');
  };
  diagram(0, Tn, f.weight, T`T = ${fN(Tn)} [N]`, T`(M + m)g = ${fN(f.weight)} [N]`, f.m ? 'lift and passenger' : 'lift');
  if (f.m) diagram(1, R, f.weightPassenger, T`R = ${fN(R)} [N]`, T`m g = ${fN(f.weightPassenger)} [N]`, 'passenger');
  return null;
}
