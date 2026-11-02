// cable.js — the stage for a lift on its cable with a passenger, and the
// forces that move them: the lift's own stage (js/render/lift.js — the
// building cut away, the shaft, the car rising), and beside it two
// free-body diagrams on a card, redrawn stage by stage from the engine:
//   the lift and passenger together — a little steel cab on its cable, the
//     cable's tension up from the roof, their weight down;
//   the passenger alone — standing on a strip of floor, the floor's push up
//     under the feet, their weight down;
// and by each, the acceleration the difference makes (none at a steady speed).
// The card sits beside the building where there is room, else in the column
// under the readouts; a faint leader joins it to the car. A part that asks
// for one of the forces has that arrow marked.
//
// Everything drawn is read from js/core/cable.js (rule 4).

import { render as liftStage } from './lift.js';
import { palette, arrow, withAlpha, unview, clamp, hudBoxes, stroke } from './util.js';
import { paper } from './scenery.js';
import { runner } from './figures.js';
import { T, num } from '../notation.js';

// as the working prints a force: 3 decimal places at most, trailing zeros dropped
const fN = (x) => num(x, 3, { trim: true });
const STAGE = { up: 'speeding up', hold: 'at a steady speed', down: 'slowing down' };

/** A little lift cab, w × h px, centred on (x, y): brushed steel, a lit inside, a passenger, a roof bar. */
function cab(g, x, y, w, h, P) {
  const x0 = x - w / 2, y0 = y - h / 2;
  const st = g.createLinearGradient(x0, 0, x0 + w, 0); st.addColorStop(0, '#d9dde2'); st.addColorStop(0.5, '#aeb4bb'); st.addColorStop(1, '#8c939b');
  g.fillStyle = st; g.fillRect(x0, y0, w, h);
  g.fillStyle = '#fbf3de'; g.fillRect(x0 + 3, y0 + 3, w - 6, h - 6);
  runner(g, x + w * 0.1, y0 + h - 4, h * 0.78, P, { still: true });
  g.strokeStyle = withAlpha('#3c3f45', 0.8); g.lineWidth = 1.5; g.strokeRect(x0, y0, w, h);
  g.fillStyle = '#3c3f45'; g.fillRect(x0, y0 - 3, w, 3);
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, askPart } = o;
  if (!f || f.kind !== 'cable') return null;
  const r = canvas.getBoundingClientRect(), w = r.width, h = r.height;
  const HB = hudBoxes(w, 3);
  // the card's place, from the room there is: beside the building on the right if that
  // leaves it ~300 px, else the column under the readouts (which the lift's stage keeps clear)
  const two = !!f.m;
  let card, keep;
  const cwR = two ? 300 : 180;
  if (w - cwR - 24 - HB[0].w >= 300) {
    const ch = Math.min(h - HB[1].h - 30, 250);
    card = { x: w - cwR - 14, y: h - ch - 14, w: cwR, h: ch, stack: false };
    keep = { keepRight: cwR + 24 };
  } else {
    const cw = HB[0].w - 16, ch = Math.max(140, h - HB[0].h - 20);
    card = { x: 10, y: HB[0].h + 8, w: cw, h: ch, stack: two };
    keep = { keepRect: { x: card.x, y: card.y, w: card.w, h: card.h } };
  }
  const out = {};
  liftStage(canvas, cam, { ...o, ...keep, out });
  const g = canvas.getContext('2d'); unview(g);
  const P = palette(), t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  // before it sets off, and once it has stopped, it is at rest: the forces just hold the weights
  const still = !fired || t >= f.tMax - 1e-9, st = still ? null : f.cable.find((x) => t < x.t1 - 1e-12) || f.cable[f.cable.length - 1];
  const Tn = still ? f.weight : f.tension(t), R = !two ? null : still ? f.weightPassenger : f.floor(t), a = still ? 0 : st.a;
  // a part that asks for one of the forces has it marked, in the stage it is asked about
  const ask = askPart?.find === 'T1' || askPart?.find === 'T3' ? 'T' : askPart?.find === 'R3' || askPart?.find === 'R1' ? 'R' : null;

  // a faint leader from the card to the car it describes
  if (out.car) {
    const ex = card.x < out.car.x ? card.x + card.w : card.x, ey = clamp(out.car.y, card.y + 20, card.y + card.h - 20);
    stroke(g, [{ x: ex, y: ey }, { x: card.x < out.car.x ? out.car.x0 - 4 : out.car.x1 + 4, y: out.car.y }], { color: P.muted, width: 1, alpha: 0.6, dash: [3, 4] });
  }
  const { x: cx, y: cy, w: cw, h: ch } = card;
  paper(g, cx, cy, cw, ch);
  const lab = (txt, x, y, col, al = 'left', wt = 700) => { g.save(); g.font = `${wt} 13px system-ui, sans-serif`; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
  lab(still ? (fired ? 'At rest at the top' : 'At rest at the bottom') : card.w < 260 ? `${STAGE[st.kind][0].toUpperCase()}${STAGE[st.kind].slice(1)}` : `The forces, ${STAGE[st.kind]}`, cx + 12, cy + 16, P.muted);

  // the diagrams: side by side, or stacked in a narrow column; one scale for every force
  const panels = two ? 2 : 1, pw = card.stack ? cw : (cw - 12) / panels, ph = card.stack ? (ch - 30) / panels : ch - 30;
  const big = Math.max(Tn, f.weight, 1e-9);
  const draw = (i, kind) => {
    const px = cx + (card.stack ? 0 : 6 + pw * i), py = cy + 28 + (card.stack ? ph * i : 0);
    if (i > 0) stroke(g, card.stack ? [{ x: cx + 10, y: py }, { x: cx + cw - 10, y: py }] : [{ x: px, y: py + 6 }, { x: px, y: py + ph - 8 }], { color: P.muted, width: 1, alpha: 0.35 });
    // room above and below the body for an arrow each, after the panel's name and the two labels
    const x = px + Math.min(pw * 0.3, 60), room = Math.max(22, (ph - 28 - 22 - 2 * 18) / 2), sc = (room * 0.9) / big, y = py + 22 + (ph - 22) / 2;
    const name = kind === 'lift' ? (two ? 'lift + passenger' : 'lift') : 'passenger';
    lab(name, px + 10, py + 10, P.muted, 'left', 600);
    let up, down, upTxt, downTxt, hTop, hBot, mark;
    if (kind === 'lift') {
      const bw = 34, bh = 28; cab(g, x, y, bw, bh, P);
      g.strokeStyle = '#9aa0a8'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y - bh / 2 - 3); g.lineTo(x, y - bh / 2 - 9); g.stroke();
      up = Tn; down = f.weight; upTxt = T`T = ${fN(Tn)} [N]`; downTxt = T`(M + m)g = ${fN(f.weight)} [N]`; hTop = y - bh / 2 - 9; hBot = y + bh / 2; mark = ask === 'T';
    } else {
      const H = 30; g.strokeStyle = withAlpha(P.ink, 0.6); g.lineWidth = 2; g.beginPath(); g.moveTo(x - 16, y + H / 2); g.lineTo(x + 16, y + H / 2); g.stroke();
      runner(g, x, y + H / 2, H, P, { still: true });
      up = R; down = f.weightPassenger; upTxt = T`R = ${fN(R)} [N]`; downTxt = T`m g = ${fN(f.weightPassenger)} [N]`; hTop = y - H / 2; hBot = y + H / 2; mark = ask === 'R';
    }
    // the push up starts where it acts: the cable on the roof; for the passenger, under the feet (drawn beside them)
    const lu = Math.max(22, up * sc), ld = Math.max(22, down * sc), ux = kind === 'lift' ? x : x - 12;
    const upCol = mark ? P.mark : P.ink;
    arrow(g, ux, kind === 'lift' ? hTop : hBot, ux, (kind === 'lift' ? hTop : hTop) - lu, { color: upCol, width: 2.6, head: 9 });
    g.fillStyle = P.ink; g.beginPath(); g.arc(ux, kind === 'lift' ? hTop : hBot, 2.4, 0, Math.PI * 2); g.fill();
    arrow(g, x + 12, hBot, x + 12, hBot + ld, { color: P.ink, width: 2.6, head: 9 });
    if (mark) { g.save(); g.strokeStyle = withAlpha(P.mark, 0.5); g.lineWidth = 2; g.beginPath(); g.arc(ux, hTop - lu - 10, 14, 0, Math.PI * 2); g.stroke(); g.restore(); }
    // each label beside its arrow's tip, never across an arrow
    lab(upTxt, ux + 8, Math.max(py + 30, hTop - lu + 6), upCol, 'left');
    lab(downTxt, x + 20, Math.min(py + ph - 10, hBot + ld - 6), P.ink, 'left');
  };
  // the acceleration the difference makes — the same for both — once, on the title row:
  // a short solid arrow (it is vertical, rule 2) and its value
  { const ax = cx + cw - 16, sgn = Math.sign(a);
    if (sgn) arrow(g, ax, cy + 16 + sgn * 7, ax, cy + 16 - sgn * 7, { color: P.acc, width: 2.4, head: 7 });
    lab(sgn ? T`a = ${fN(a)} [m s^-2]` : still ? T`a = 0` : `${T`a = 0`}, steady`, ax - (sgn ? 10 : -6), cy + 16, P.acc, 'right'); }
  draw(0, 'lift');
  if (two) draw(1, 'passenger');
  return null;
}
