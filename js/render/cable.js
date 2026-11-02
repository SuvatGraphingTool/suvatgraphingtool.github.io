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

const s3 = (x) => num(Number(x.toPrecision(4)), 6, { trim: true });
const STAGE = { up: 'speeding up', hold: 'at a steady speed', down: 'slowing down' };

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'cable') return null;
  const r = canvas.getBoundingClientRect(), w = r.width, h = r.height;
  const side = w >= 760, cw = side ? 236 : Math.min(w - 20, 340), ch = side ? 268 : 128;
  liftStage(canvas, cam, { ...o, keepRight: side ? cw + 24 : 0, keepBottom: side ? 0 : ch + 14 });
  const g = canvas.getContext('2d'); unview(g);
  const P = palette(), t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const done = t >= f.tMax - 1e-9, st = done ? null : f.cable.find((x) => t < x.t1 - 1e-12) || f.cable[f.cable.length - 1];
  const Tn = f.tension(t), R = f.floor(t), W = (f.M + (f.m || 0)) * f.g, w2 = (f.m || 0) * f.g;
  const cx = side ? w - cw - 14 : 10, cy = side ? h - ch - 14 : h - ch - 10;
  paper(g, cx, cy, cw, ch);
  const lab = (txt, x, y, col, al = 'left', wt = 700) => { g.save(); g.font = `${wt} 13px system-ui, sans-serif`; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
  lab(done ? 'At rest at the top' : `The forces, ${STAGE[st.kind]}`, cx + 12, cy + 16, P.muted);
  // one scale for every arrow, so the two diagrams compare
  const big = Math.max(Tn, W, 1e-9), boxes = f.m ? 2 : 1;
  const colW = (cw - 24) / boxes, room = side ? 82 : 34, sc = room / big;
  const body = (x, y, wB0, hB, label) => {
    g.save(); g.font = '600 13px system-ui, sans-serif'; const wB = Math.max(wB0, g.measureText(label).width + 14); g.restore();
    g.save(); g.fillStyle = withAlpha(P.ink, 0.1); g.strokeStyle = P.ink; g.lineWidth = 1.4;
    g.beginPath(); g.roundRect?.(x - wB / 2, y - hB / 2, wB, hB, 4); g.fill(); g.stroke(); g.restore();
    lab(label, x, y, P.ink, 'center', 600);
  };
  const diagram = (i, up, down, upTxt, downTxt, name) => {
    const x = cx + 12 + colW * (i + 0.5), y = side ? cy + 30 + (ch - 30) / 2 - 10 : cy + 64;
    const bw = side ? 54 : 46, bh = 26;
    body(x, y, bw, bh, name);
    arrow(g, x, y - bh / 2, x, y - bh / 2 - Math.max(8, up * sc), { color: P.ink, width: 2.4, head: 9 });
    arrow(g, x, y + bh / 2, x, y + bh / 2 + Math.max(8, down * sc), { color: P.ink, width: 2.4, head: 9 });
    lab(upTxt, x, y - bh / 2 - Math.max(8, up * sc) - 10, P.ink, 'center');
    lab(downTxt, x, y + bh / 2 + Math.max(8, down * sc) + 12, P.ink, 'center');
  };
  diagram(0, Tn, W, T`T = ${s3(Tn)} [N]`, T`${s3(W)} [N]`, f.m ? 'lift and passenger' : 'lift');
  if (f.m) diagram(1, R, w2, T`R = ${s3(R)} [N]`, T`${s3(w2)} [N]`, 'passenger');
  return null;
}
