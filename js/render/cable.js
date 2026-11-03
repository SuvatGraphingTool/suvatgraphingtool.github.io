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
  // which diagrams there are masses for: the lift with its cable (M), the passenger on the floor (m)
  const panels = [...(f.M != null ? ['lift'] : []), ...(f.m ? ['passenger'] : [])], n = panels.length;
  // the card's place, from the room there is: beside the building on the right if that leaves it
  // ~300 px, else the column under the readouts (which the lift's stage keeps clear); where neither
  // fits, the forces go in a caption line along the foot of the stage
  let card = null, keep = { keepBottom: 34 };
  const cwR = n === 2 ? 300 : 180, colH = h - HB[0].h - 28;
  if (w - cwR - 24 - HB[0].w >= 300 || (colH < 230 && w - cwR - 24 - HB[0].w >= 180 && h - HB[1].h - 30 >= 150)) {
    const ch = Math.min(h - HB[1].h - 30, 250);
    card = { x: w - cwR - 14, y: h - ch - 14, w: cwR, h: ch, stack: false };
    keep = { keepRight: cwR + 24 };
  } else if (colH >= 150) {
    const cw = HB[0].w - 16, ch = Math.min(colH, n === 2 ? 300 : 170);
    card = { x: 10, y: HB[0].h + 8, w: cw, h: ch, stack: n === 2 };
    keep = { keepRect: { x: card.x, y: card.y, w: card.w, h: card.h } };
  }
  const out = {};
  liftStage(canvas, cam, { ...o, ...keep, out });
  const g = canvas.getContext('2d'); unview(g);
  const P = palette(), t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  // once it has stopped it is at rest: the forces just hold the weights. Before it sets off the
  // card shows the first stage, as the readouts do: the forces as it sets off
  const still = fired && t >= f.tMax - 1e-9, st = still ? null : f.cable.find((x) => t < x.t1 - 1e-12) || f.cable[f.cable.length - 1];
  const Tn = f.M == null ? null : still ? f.weight : f.tension(t), R = !f.m ? null : still ? f.weightPassenger : f.floor(t), a = still ? 0 : st.a;
  // a part that asks for one of the forces has it marked, in the stage it is asked about
  const ask = askPart?.find === 'T1' || askPart?.find === 'T3' ? 'T' : askPart?.find === 'R3' || askPart?.find === 'R1' ? 'R' : null;
  const wSrc = f.m ? '(M + m)g' : 'M g';   // notation source, typeset once where it is used

  if (!card) {
    // no room for a card: the forces in one line along the foot of the stage
    const parts = [...(Tn != null ? [T`T = ${fN(Tn)} [N]`] : []), ...(R != null ? [T`R = ${fN(R)} [N]`] : []), Math.abs(a) < 1e-9 ? T`a = 0` : T`a = ${fN(a)} [m s^-2]`];
    g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
    const txt = parts.join(', '), tw = Math.min(w - 20, g.measureText(txt).width + 14);
    g.fillStyle = withAlpha('#101418', 0.78); g.fillRect(10, h - 30, tw, 22);
    g.fillStyle = '#e8eaee'; g.fillText(txt, 17, h - 19, w - 34); g.restore();
    return null;
  }
  // a faint leader from the card to the building's wall, level with the car (the inset leads on to it)
  if (out.car) {
    const right = card.x > out.car.x, ex = right ? card.x : card.x + card.w, ey = clamp(out.car.y, card.y + 20, card.y + card.h - 20);
    const wx = right ? out.wallR + 4 : out.wallL - 4;
    if (Math.abs(ex - wx) > 12) stroke(g, [{ x: ex, y: ey }, { x: wx, y: out.car.y }], { color: P.muted, width: 1, alpha: 0.6, dash: [3, 4] });
  }
  const { x: cx, y: cy, w: cw, h: ch } = card;
  paper(g, cx, cy, cw, ch);
  const lab = (txt, x, y, col, al = 'left', wt = 700) => { g.save(); g.font = `${wt} 13px system-ui, sans-serif`; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
  lab(still ? 'At rest at the top' : !fired ? 'As it sets off' : card.w < 260 ? `${STAGE[st.kind][0].toUpperCase()}${STAGE[st.kind].slice(1)}` : `The forces, ${STAGE[st.kind]}`, cx + 12, cy + 16, P.muted);
  // a narrow card puts the acceleration on a row of its own
  const narrow = card.w < 260, head = narrow ? 46 : 30;
  const pw = card.stack ? cw : (cw - 12) / n, ph = card.stack ? (ch - head) / n : ch - head;
  const short = ph < 110;

  // ── each panel's body, and where its two forces start and how much room they have
  const geo = panels.map((kind, i) => {
    const px = cx + (card.stack ? 0 : 6 + pw * i), py = cy + head - 2 + (card.stack ? ph * i : 0);
    const x = card.stack ? px + 34 : px + Math.min(pw * 0.3, 60), y = py + (short ? 0 : 22) + (ph - (short ? 0 : 22)) / 2;
    const top = py + (short ? 6 : 26), bot = py + ph - 10;
    if (kind === 'lift') {
      const bh = 28, hTop = y - bh / 2 - 9, hBot = y + bh / 2;
      return { kind, px, py, x, y, upAt: hTop, downAt: hBot, up: Tn, down: f.weight, upRoom: hTop - top, downRoom: bot - hBot };
    }
    const H = card.stack ? 30 : 44;
    // both of the passenger's forces from the middle of the body, beside it
    return { kind, px, py, x, y, H, upAt: y, downAt: y, up: R, down: f.weightPassenger, upRoom: y - top, downRoom: bot - y };
  });
  // one scale for every arrow on the card, so every pair keeps its ratio and the panels compare
  const big = Math.max(...geo.flatMap((q) => [q.up, q.down]), 1e-9);
  const sc = Math.min(...geo.flatMap((q) => [q.upRoom / Math.max(q.up, 1e-9), q.downRoom / Math.max(q.down, 1e-9)]), 90 / big);

  geo.forEach((q, i) => {
    const { kind, px, py, x, y } = q;
    if (i > 0) stroke(g, card.stack ? [{ x: cx + 10, y: py }, { x: cx + cw - 10, y: py }] : [{ x: px, y: py + 6 }, { x: px, y: py + ph - 8 }], { color: P.muted, width: 1, alpha: 0.35 });
    const name = kind === 'lift' ? (f.m ? 'lift + passenger' : 'lift') : 'passenger';
    let upTxt, downTxt, mark;
    if (kind === 'lift') {
      cab(g, x, y, 34, 28, P);
      g.strokeStyle = '#9aa0a8'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y - 14 - 3); g.lineTo(x, y - 14 - 9); g.stroke();
      upTxt = T`T = ${fN(q.up)} [N]`; downTxt = T`${wSrc} = ${fN(q.down)} [N]`; mark = ask === 'T';
    } else {
      g.strokeStyle = withAlpha(P.ink, 0.6); g.lineWidth = 2; g.beginPath(); g.moveTo(x - 16, y + q.H / 2); g.lineTo(x + 16, y + q.H / 2); g.stroke();
      runner(g, x, y + q.H / 2, q.H, P, { still: true });
      upTxt = T`R = ${fN(q.up)} [N]`; downTxt = T`m g = ${fN(q.down)} [N]`; mark = ask === 'R';
    }
    const lu = q.up * sc, ld = q.down * sc, ux = kind === 'lift' ? x : x - 14, dx = kind === 'lift' ? x + 12 : x + 14, upCol = mark ? P.mark : P.ink;
    // a force the part asks for: drawn over a soft glow, its label on a pill
    if (mark) { g.save(); g.strokeStyle = withAlpha(P.mark, 0.25); g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(ux, q.upAt); g.lineTo(ux, q.upAt - lu); g.stroke(); g.restore(); }
    if (lu > 0.5) arrow(g, ux, q.upAt, ux, q.upAt - lu, { color: upCol, width: 2.6, head: Math.min(9, lu * 0.6) });
    g.fillStyle = P.ink; g.beginPath(); g.arc(ux, q.upAt, 2.4, 0, Math.PI * 2); g.fill();
    if (ld > 0.5) arrow(g, dx, q.downAt, dx, q.downAt + ld, { color: P.ink, width: 2.6, head: Math.min(9, ld * 0.6) });
    // each label beside its arrow's tip, never across an arrow, never past the card's edge
    const fit = (txt, x0) => { g.save(); g.font = '700 13px system-ui, sans-serif'; const tw = g.measureText(txt).width; g.restore(); return x0 + tw > cx + cw - 8 ? [cx + cw - 8, 'right', tw] : [x0, 'left', tw]; };
    const [ul, ua, utw] = fit(upTxt, ux + 8), uy = Math.max(py + (short ? 8 : 30), q.upAt - lu + 6);
    if (mark) { g.save(); g.fillStyle = withAlpha(P.mark, 0.15); g.beginPath(); g.roundRect?.((ua === 'left' ? ul : ul - utw) - 5, uy - 10, utw + 10, 20, 6); g.fill(); g.restore(); }
    lab(upTxt, ul, uy, upCol, ua);
    const [dl, da] = fit(downTxt, dx + 8);
    lab(downTxt, dl, Math.min(py + ph - 10, q.downAt + ld - 6), P.ink, da);
    // the panel's name: above, or on a short panel on the body's own row, clear of the labels
    if (short) lab(name, px + cw - 10, kind === 'lift' ? y : py + 10, P.muted, 'right', 600);
    else lab(name, px + 10, py + 10, P.muted, 'left', 600);
  });
  // the acceleration the difference makes — the same for both — once, on the title row:
  // a short solid arrow (it is vertical, rule 2) and its value
  { const ax = cx + cw - 16, ay = narrow ? cy + 34 : cy + 16, sgn = Math.sign(a);
    if (sgn) arrow(g, ax, ay + sgn * 7, ax, ay - sgn * 7, { color: P.acc, width: 2.4, head: 7 });
    lab(sgn ? T`a = ${fN(a)} [m s^-2]` : still ? T`a = 0` : `${T`a = 0`}, steady`, ax - (sgn ? 10 : -6), ay, P.acc, 'right'); }
  return null;
}
