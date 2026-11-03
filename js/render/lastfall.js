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

/** Words that must not be lost on a plate of the card colour, in their place, kept inside the stage. */
function plate(g, L, P, txt, x, y, color, { align = 'center', size = 13 } = {}) {
  g.save(); g.font = `700 ${Math.max(13, size)}px system-ui, sans-serif`;
  const tw = g.measureText(txt).width, bh = size + 7, W = g.canvas.clientWidth || Infinity;
  let bx = align === 'left' ? x - 4 : align === 'right' ? x - tw - 4 : x - tw / 2 - 4;
  const shift = clamp(bx, 4, Math.max(4, W - tw - 12)) - bx; bx += shift; x += shift;
  g.fillStyle = withAlpha(P.card, 0.85); g.beginPath(); g.roundRect?.(bx, y - bh / 2, tw + 8, bh, 4); g.fill();
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(txt, x, y + 0.5); g.restore();
  L.reserve({ x: bx, y: y - bh / 2, w: tw + 8, h: bh });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'lastfall') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);

  // ── one vertical scale, from the top to the ground; the drop line right of the wall
  const ground = h - clamp(h * 0.14, 40, 80), top = phone ? HB[0].h + 30 : Math.max(HB[1].h + 34, 40);
  const k = (ground - top) / f.H, Y = (hgt) => ground - hgt * k;   // hgt above the ground
  const wallW = clamp(w * 0.16, 70, 150), edge = phone ? Math.round(w * 0.42) : Math.round(Math.max(HB[0].w + wallW + 40, w * 0.4));
  const x0 = edge + 14, size = 9;
  const horizon = ground - clamp(h * 0.18, 40, 110);

  // ── the place: sky and fields, the ground, the tower or the cliff
  fields(g, w, horizon, ground);
  groundStrip(g, 0, w, ground, h);
  if (f.look === 'cliff') seaCliff(g, -20, edge, Y(f.H), ground, { foam: false, seed: 7 });
  else tower(g, edge, Y(f.H), ground, wallW);

  // the point on the wall: a band of paler stone and a small iron marker, at p above the ground
  const yp = Y(f.p);
  g.fillStyle = withAlpha('#ffffff', E.night ? 0.12 : 0.28); g.fillRect(edge - wallW, yp - 2, wallW, 4);
  g.fillStyle = '#2b2f36'; g.fillRect(edge - 2, yp - 6, 8, 12); g.fillStyle = '#c0392b'; g.fillRect(edge + 6, yp - 3, 10, 6);

  // ── the dimension lines, right of the drop: the height let go from, and the point's height (vertical: solid)
  const dx = x0 + 230, dx2 = x0 + 160;
  const dim = (x, ya, yb, txt) => {
    stroke(g, [{ x, y: ya }, { x, y: yb }], { color: P.disp, width: 1.6 });
    for (const y of [ya, yb]) stroke(g, [{ x: x - 6, y }, { x: x + 6, y }], { color: P.disp, width: 1.6 });
    plate(g, L, P, txt, x + 10, (ya + yb) / 2, P.disp, { align: 'left', size: 14 });
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

  // ── the moments: past the point, and at the ground; the speeds on plates, left of the wall's edge
  if (fired && t >= f.tP - 1e-9) {
    const e = ageOf(t, f.tP, f.tMax, 0.9); pulse(g, x0, yp, e.age, e.life, P.mark, { radius: 22 });
    const tag = f.mode === 'diff' ? T`V - ${sf(f.dv)} = ${sf(f.vP)} [m s^-1] "here"` : T`${sf(f.vP)} [m s^-1] "here"`;
    plate(g, L, P, tag, edge - wallW - 10, yp, P.vel, { align: 'right' });
  }
  const landed = fired && t >= f.tG - 1e-9;
  if (landed) {
    const e = ageOf(t, f.tG, f.tMax); dust(g, x0, ground, e.age, e.life, { size: 1.2, n: 16 });
    plate(g, L, P, T`V = ${sf(f.V)} [m s^-1] "at the ground"`, edge - wallW - 10, ground - 16, P.vel, { align: 'right' });
  }

  // ── its velocity and acceleration, down positive (vertical: solid), between the drop and the dimension lines
  if (!landed) {
    const room = Math.max(0, ground - yNow - 8);
    const col = (bx, val, max, c, unit, wd, right) => {
      const len = Math.min(clamp((val / max) * 70, 22, 70), room); if (len < 22) return;
      arrow(g, bx, yNow, bx, yNow + len, { color: c, width: wd, head: 9 });
      plate(g, L, P, T`${sf(val)} [${unit}]`, right ? bx + 8 : bx - 8, yNow + len * 0.55, c, { align: right ? 'left' : 'right' });
    };
    if (show.velocity !== false && f.vel(t) > 0.05) col(x0, f.vel(t), Math.max(f.V, 1e-9), P.vel, 'm s^-1', 2.6);
    if (fired) col(x0 + 30, f.g, f.g, P.acc, 'm s^-2', 2.2, true);
  }
  L.draw(g, w, h);
  return null;
}
