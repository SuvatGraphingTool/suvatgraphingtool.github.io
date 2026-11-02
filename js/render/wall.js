// wall.js — the stage for a stone that slides down the ice against a
// resistance, hits the boards at C and slides back to rest: the rink from
// above (js/render/ice.js's sheet and stone), the end boards at C drawn thick
// and padded, the lines A and B across the ice, the distances under it.
//
// The moments: B lit with the speed there; at C the boards flash and the
// impulse is drawn as an arrow back towards A, with its size; where it comes
// to rest, a ring. The velocity arrow is dashed (along the line, rule 2) and
// turns round at the wall; the deceleration always points against the motion.
//
// Everything drawn is read from js/core/wall.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes } from './util.js';
import { env } from './scenery.js';
import { pulse, ageOf, flash } from './effects.js';
import { rink, stoneTop } from './ice.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const s3 = (x) => num(x, Math.abs(x) < 10 ? 2 : 1, { trim: true });

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'wall') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);

  // ── the frame: beside the readouts where there is room, else full width below them
  const narrow = w - HB[0].w < w * 0.62;
  const left = narrow ? 26 : HB[0].w + 40, right = w - (narrow ? 44 : 70);
  const k = (right - left) / f.AC, X = (x) => left + x * k;
  const sheetH = clamp(h * (narrow ? 0.26 : 0.34), 90, 170);
  const cy = narrow ? clamp(HB[0].h + 56 + sheetH / 2, 0, h - sheetH / 2 - 54) : clamp(h * 0.58, HB[0].h * 0.35 + sheetH / 2, h - sheetH / 2 - 54);
  const top = cy - sheetH / 2, bot = cy + sheetH / 2;
  rink(g, w, h, top, bot, cy, sheetH, E);

  // ── the end boards at C: wood, a padded face, the rink beyond dark
  const Cx = X(f.AC), r = clamp(sheetH * 0.14, 11, 22);
  g.fillStyle = E.night ? '#10151a' : '#232b34'; g.fillRect(Cx + 14, top - 10, w - Cx, sheetH + 20);
  g.fillStyle = '#5a3b26'; g.fillRect(Cx, top - 10, 14, sheetH + 20);
  g.fillStyle = '#2f6db3'; g.fillRect(Cx - 4, top, 5, sheetH);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(Cx + 2, top - 10, 2, sheetH + 20);
  const hit = fired && t >= f.tC - 1e-9 ? ageOf(t, f.tC, f.tMax) : null;
  if (hit) { flash(g, Cx - 2, cy, hit.age, hit.life, { color: P.mark }); pulse(g, Cx - 2, cy, hit.age, hit.life, P.mark, { radius: 44 }); }
  L.reserve({ x: Cx - 4, y: top - 10, w: 20, h: sheetH + 20 });

  // ── the lines A and B, lit as it crosses them with its speed; C is the wall
  const ink = '#e8eaee';
  for (const m of [{ id: 'A', x: 0, t: 0, v: f.uA }, { id: 'B', x: f.AB, t: f.tB, v: f.uB }]) {
    const x = X(m.x), crossed = t >= m.t - 1e-9;
    g.strokeStyle = crossed ? withAlpha(P.mark, 0.95) : 'rgba(40,60,80,0.55)'; g.lineWidth = crossed ? 3 : 2;
    g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke();
    L.add(m.id, x, top - 24, { color: crossed ? P.mark : ink, pri: 9, size: 16, weight: 800 });
    if (crossed && fired) L.add(T`${s3(m.v)} [m s^-1]`, x, top - 44, { color: P.vel, pri: 8, size: 13, weight: 700 });
  }
  L.add('C', Cx - 2, top - 24, { color: hit ? P.mark : ink, pri: 9, size: 16, weight: 800 });
  if (hit) L.add(T`"into the boards" ${s3(f.vC)} [m s^-1], "out" ${s3(f.w)} [m s^-1]`, Cx - 6, bot + 64, { color: P.vel, pri: 9, size: 13, weight: 700, align: 'right' });

  // ── the distances under the sheet, and where it comes to rest
  const dimY = bot + 30;
  const dim = (x0, x1, txt, y = dimY, col = P.disp) => {
    const a = X(x0), b = X(x1);
    g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); g.moveTo(a, y); g.lineTo(b, y); g.stroke();
    for (const q of [a, b]) { g.beginPath(); g.moveTo(q, y - 6); g.lineTo(q, y + 6); g.stroke(); }
    L.add(txt, (a + b) / 2, y + 16, { color: col, pri: 7, size: 13, weight: 700 });
  };
  dim(0, f.AB, T`${s3(f.AB)} [m]`); dim(f.AB, f.AC, T`${s3(f.AC - f.AB)} [m]`);
  const done = t >= f.tMax - 1e-9;
  if (done && fired) {
    const sx = X(f.stopAt), e = ageOf(t, f.tMax, f.tMax);
    pulse(g, sx, cy, e.age, e.life, P.mark, { radius: 36 });
    if (f.stopAt > 0) dim(f.stopAt, f.AC, T`${s3(f.back)} [m] "back"`, dimY + 34, P.mark);
    L.add('at rest', sx, top - 24, { color: P.mark, pri: 9, size: 13, weight: 700 });
  }

  // ── the stone, its track, its arrows; and the impulse at the wall
  const x = X(f.pos(t)), v = f.vel(t);
  stoneTop(g, x, cy, r, f.pos(t) * 0.12 + 0.4);
  L.reserve({ x: x - r - 4, y: cy - r - 4, w: 2 * r + 8, h: 2 * r + 8 });
  if (Math.abs(v) > 1e-9) {
    const len = clamp((Math.abs(v) / f.uA) * 110, 18, 110), dir = Math.sign(v), y = cy - r - 10;
    arrow(g, x + dir * (r + 2), y, x + dir * (r + 2 + len), y, { color: P.vel, width: 2.6, head: 10, dash: [6, 4] });
    L.add(T`${s3(Math.abs(v))} [m s^-1]`, x + dir * (r + 8 + len), y, { color: P.vel, pri: 8, size: 14, weight: 700, align: dir > 0 ? 'left' : 'right' });
  }
  if (f.acc(t) !== 0) {
    // kept on the ice: near the boards, an arrow towards them starts further back
    const dir = Math.sign(f.acc(t)), y = cy + r + 10, x0 = dir > 0 ? Math.min(x + r + 2, Cx - 58) : x - r - 2;
    arrow(g, x0, y, x0 + dir * 46, y, { color: P.acc, width: 2.2, head: 9, dash: [6, 4] });
    L.add(T`${s3(f.a)} [m s^-2]`, dir > 0 ? x0 - 6 : x0 - 52, y, { color: P.acc, pri: 6, size: 13, weight: 700, align: 'right' });
  }
  if (hit && hit.age < hit.life) {
    arrow(g, Cx - 6, cy + sheetH * 0.3, Cx - 6 - 70, cy + sheetH * 0.3, { color: P.mark, width: 3, head: 11, dash: [6, 4] });   // along the line: dashed
    L.add(T`I = ${s3(f.I)} [N s]`, Cx - 82, cy + sheetH * 0.3, { color: P.mark, pri: 9, size: 14, weight: 800, align: 'right' });
  }

  L.draw(g, w, h);
  return null;
}
