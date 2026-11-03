// lastfall.js — the stage for the last stretch of a fall: a stone let go from
// the top of an old stone tower (or over the edge of an inland cliff) falls
// past a point marked on the wall p metres above the ground, then on to the
// ground. Side on, at one scale from the top to the ground; the height it was
// let go from and the point's height as dimension lines; the speeds at the
// point and at the ground on plates when it passes them; its velocity and
// acceleration beside it, down positive.
//
// THE MOMENTS: a ring at the point as it passes, dust where it lands. At the
// engine's own times.
//
// Everything drawn is read from js/core/lastfall.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, stroke } from './util.js';
import { env } from './scenery.js';
import { fields, groundStrip, tower, seaCliff } from './heights.js';
import { pulse, ageOf, dust } from './effects.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const sf = (x) => num(Number(x.toPrecision(3)), 6, { trim: true });

const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Words that must not be lost, on a plate of the card colour, kept inside the stage and clear of
    every plate and readout already placed (`taken`): tried where it belongs, then a row above or
    below, then on the anchor's other side — the nearest free place, never dropped. */
function plate(g, L, P, taken, txt, x, y, color, { align = 'center', size = 13, maxY = Infinity } = {}) {
  g.save(); g.font = `700 ${Math.max(13, size)}px system-ui, sans-serif`;
  const tw = g.measureText(txt).width, bh = size + 7, W = g.canvas.clientWidth || Infinity, H = g.canvas.clientHeight || Infinity;
  const at = (al, ax, ay) => {
    let bx = al === 'left' ? ax - 4 : al === 'right' ? ax - tw - 4 : ax - tw / 2 - 4;
    bx = clamp(bx, 4, Math.max(4, W - tw - 12));
    return { x: bx, y: clamp(ay - bh / 2, 2, H - bh - 2), w: tw + 8, h: bh };
  };
  const flip = align === 'left' ? 'right' : align === 'right' ? 'left' : 'center', fx = align === 'left' ? x - 24 : align === 'right' ? x + 24 : x;
  // nearest first: its own row and the next on either side, then the same on the other side, then further
  const tries = [];
  for (const dy of [0, -22, 22]) tries.push([align, x, y + dy]);
  for (const dy of [0, -22, 22]) tries.push([flip, fx, y + dy]);
  for (const dy of [-44, 44, -66, 66]) tries.push([align, x, y + dy]);
  for (const dy of [-44, 44]) tries.push([flip, fx, y + dy]);
  let box = null;
  for (const [al, ax, ay] of tries) { const b = at(al, ax, ay); if (b.y + b.h > maxY) continue; if (!taken.some((q) => hit(q, b))) { box = b; break; } }
  box ||= at(align, x, y);
  g.fillStyle = withAlpha(P.card, 0.88); g.beginPath(); g.roundRect?.(box.x, box.y, box.w, box.h, 4); g.fill();
  g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, box.x + 4, box.y + bh / 2 + 0.5); g.restore();
  taken.push(box); L.reserve(box);
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'lastfall') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  // on a phone the readouts are two rows (the kit says so too): the fall gets the height
  const HB = hudBoxes(w, phone ? 2 : 3); for (const b of HB) L.reserve(b);
  const taken = [...HB], put = (...a) => plate(g, L, P, taken, ...a);

  // ── one vertical scale, from the top to the ground; the drop line right of the wall
  const ground = h - clamp(h * 0.14, 40, 80), top = phone ? HB[0].h + 30 : Math.max(HB[1].h + 34, 40);
  const k = (ground - top) / f.H, Y = (hgt) => ground - hgt * k;   // hgt above the ground
  const wallW = clamp(w * 0.16, 70, 150), edge = phone ? Math.round(w * 0.42) : Math.round(Math.max(HB[0].w + wallW + 40, w * 0.4));
  // the drop clear of the wall and its marker: the stone never passes through the plaque
  const x0 = edge + 30, size = 9;
  const horizon = ground - clamp(h * 0.18, 40, 110);

  // ── the place: sky and fields, the ground, the tower or the cliff
  fields(g, w, horizon, ground);
  groundStrip(g, 0, w, ground, h);
  if (f.look === 'cliff') seaCliff(g, -20, edge, Y(f.H), ground, { foam: false, seed: 7 });
  else tower(g, edge, Y(f.H), ground, wallW);

  // the point on the wall: a band of paler stone and a small iron marker, at p above the ground
  const yp = Y(f.p);
  if (f.look !== 'cliff' && yp < ground - 34) { g.fillStyle = withAlpha('#ffffff', E.night ? 0.12 : 0.28); g.fillRect(edge - wallW, yp - 2, wallW, 4); }
  // a dark iron bracket and a pale stone plaque: no colour of its own, the hues are the quantities'
  g.fillStyle = '#2b2f36'; g.fillRect(edge - 2, yp - 6, 8, 12); g.fillStyle = E.night ? '#d9d2c4' : '#efe8da'; g.fillRect(edge + 6, yp - 4, 12, 8); g.strokeStyle = '#2b2f36'; g.lineWidth = 1; g.strokeRect(edge + 6, yp - 4, 12, 8);

  // ── the dimension lines, right of the drop: the height let go from, and the point's height (vertical: solid)
  // kept on the stage however narrow: the height's line near the right edge, the point's inside it
  const dx = Math.min(x0 + 230, w - 70), dx2 = Math.min(x0 + 160, dx - 56);
  const dim = (x, ya, yb, txt) => {
    stroke(g, [{ x, y: ya }, { x, y: yb }], { color: P.disp, width: 1.6 });
    for (const y of [ya, yb]) stroke(g, [{ x: x - 6, y }, { x: x + 6, y }], { color: P.disp, width: 1.6 });
    put(txt, x + 10, (ya + yb) / 2, P.disp, { align: 'left', size: 14 });
  };
  dim(dx, Y(f.H), ground, T`H = ${sf(f.H)} [m]`);
  dim(dx2, yp, ground, T`${sf(f.p)} [m]`);
  stroke(g, [{ x: edge + 16, y: yp }, { x: dx2 + 6, y: yp }], { color: P.muted, width: 1, alpha: 0.6 });

  // ── the stone, where it is; a faint trail
  const yNow = Math.min(Y(f.H - f.pos(t)), ground - size * 0.6);
  if (f.pos(t) > 1e-6) stroke(g, [{ x: x0, y: Y(f.H) }, { x: x0, y: yNow }], { color: withAlpha(P.ink, 0.28), width: 1.2 });
  { const gr = g.createRadialGradient(x0 - 3, yNow - 3, 1, x0, yNow, size); gr.addColorStop(0, '#d8d2c8'); gr.addColorStop(1, '#6d665c');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x0, yNow, size, size * 0.8, 0.4, 0, TAU); g.fill(); }
  L.reserve({ x: x0 - size, y: yNow - size, w: size * 2, h: size * 2 });
  // the stone and the marker are kept clear of every plate
  taken.push({ x: x0 - size - 2, y: yNow - size - 2, w: size * 2 + 4, h: size * 2 + 4 }, { x: edge - 4, y: yp - 8, w: 26, h: 16 });

  // ── its velocity and acceleration, down positive (vertical: solid): the arrows first, reserved, so no
  // plate is ever drawn under one; their numbers placed last, each beside its own arrow
  const landed = fired && t >= f.tG - 1e-9, later = [];
  if (!landed) {
    const room = Math.max(0, ground - yNow - 8);
    // below the stone while there is room; in the last metres, above it, pointing down at it
    const col = (bx, val, max, c, unit, wd, right) => {
      const len = clamp((val / max) * 70, 22, 70), below = room >= len;
      const y0 = below ? yNow : yNow - size - len, y1 = below ? yNow + len : yNow - size;
      arrow(g, bx, y0, bx, y1, { color: c, width: wd, head: 9 });
      taken.push({ x: bx - 3, y: y0 - 2, w: 6, h: len + 4 });
      later.push([T`${sf(val)} [${unit}]`, right ? bx + 12 : bx - 12, (y0 + y1) / 2, c, { align: right ? 'left' : 'right' }]);
    };
    if (show.velocity !== false && f.vel(t) > 0.05) col(x0, f.vel(t), Math.max(f.V, 1e-9), P.vel, 'm s^-1', 2.6);
    if (fired) col(x0 + 30, f.g, f.g, P.acc, 'm s^-2', 2.2, true);
  }

  // ── the moments: past the point, and at the ground; the speeds on plates right of the drop
  if (fired && t >= f.tP - 1e-9) {
    const e = ageOf(t, f.tP, f.tMax, 0.9); pulse(g, x0, yp, e.age, e.life, P.mark, { radius: 22 });
    // the paper's own given, on the plate: V − d, V over k, or (a second plate) the last stretch's time
    const tag = f.mode === 'diff' ? T`V - ${sf(f.dv)} = ${sf(f.vP)} [m s^-1] "here"` : f.mode === 'ratio' ? T`V/${sf(f.kk)} = ${sf(f.vP)} [m s^-1] "here"` : T`${sf(f.vP)} [m s^-1] "here"`;
    // never below the ground line, where it would read as the speed there
    put(tag, x0 + 14, yp - 18, P.vel, { align: 'left', maxY: ground - 2 });
    if (f.mode === 'time') put(T`"the last" ${sf(f.p)} [m] "takes" ${sf(f.tau)} [s]`, x0 + 14, yp + 22, P.ink, { align: 'left', maxY: ground - 2 });
  }
  if (landed) {
    const e = ageOf(t, f.tG, f.tMax); dust(g, x0, ground, e.age, e.life, { size: 2, n: 26 });
    // on the grass under the ground line: clear of the point's plate however low the point is
    put(T`V = ${sf(f.V)} [m s^-1] "at the ground"`, x0 + 14, ground + 18, P.vel, { align: 'left' });
  }
  for (const a of later) put(...a);
  L.draw(g, w, h);
  return null;
}
