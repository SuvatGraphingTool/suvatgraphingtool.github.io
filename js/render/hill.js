// hill.js — the stage for a cyclist freewheeling down a straight slope, side
// on and at the slope's true angle: the sky and the far trees, the hillside,
// the lane down it with posts at the top and at the end of the run, and the
// cyclist on a road bike leaning into it, wheels turning.
//
// The angle is marked at the foot with its arc — the paper's, or the one the
// engine found from the acceleration. A card fixed to the screen shows the
// forces along the slope: the weight's component down it, the resistance up
// it, and their resultant, F = ma — the numbers the engine worked out.
//
// Everything drawn is read from js/core/hill.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, unview } from './util.js';
import { skyscape, fitSide, env, paper } from './scenery.js';
import { drawFigure, phaseFor, post, tree } from './figures.js';
import { pulse, ageOf } from './effects.js';
import { T, num } from '../notation.js';

const D2R = Math.PI / 180;
const s3 = (x) => num(x, Math.abs(x) < 10 ? 2 : 1, { trim: true });

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'hill') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);

  // ── the slope in its own plane: the run of length s, from the top at (0, H) to the foot at (D, 0)
  const al = f.alpha * D2R, D = f.s * Math.cos(al), H = f.s * Math.sin(al);
  const cardW = phone ? 0 : 230;
  const box = { xLo: -f.s * 0.12, xHi: D + f.s * 0.12, yLo: -f.s * 0.05, yHi: H + f.s * 0.22 };
  const area = { left: phone ? 14 : HB[0].w * 0.4, right: w - (phone ? 14 : cardW + 30), top: HB[0].h * (phone ? 1 : 0.55), bottom: h - 26 };
  const { k, X, Y } = fitSide(box, area, { sky: 0.7 });
  const along = (d) => ({ x: X(d * Math.cos(al)), y: Y(H - d * Math.sin(al)) });

  // ── the sky, far trees, and the hillside under the lane
  const top = along(0), foot = along(f.s);
  skyscape(g, 0, 0, w, Math.min(top.y + 40, h * 0.7), { seed: 61, far: 'trees', sun: false });
  const land = E.night ? '#2f4a2c' : '#6f9a4f', dark = E.night ? '#243a22' : '#5a8440';
  g.fillStyle = land; g.beginPath(); g.moveTo(-20, top.y); g.lineTo(top.x, top.y);
  g.lineTo(foot.x, foot.y); g.lineTo(w + 20, foot.y); g.lineTo(w + 20, h + 20); g.lineTo(-20, h + 20); g.closePath(); g.fill();
  g.fillStyle = dark; g.fillRect(-20, foot.y + 20, w + 40, h);
  for (const [x, s] of [[top.x - 60, 0.9], [top.x - 130, 1.1], [foot.x + 70, 1]]) if (x > 0 && x < w) tree(g, x, x < foot.x ? top.y : foot.y, 46 * s, { seed: Math.round(x) });

  // ── the lane: tarmac along the slope, a centre line, the posts at each end
  g.save(); g.lineCap = 'round';
  g.strokeStyle = E.night ? '#3a3d42' : '#5b5f66'; g.lineWidth = 12; g.beginPath(); g.moveTo(-20, top.y); g.lineTo(top.x, top.y); g.lineTo(foot.x, foot.y); g.lineTo(w + 20, foot.y); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.6; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(top.x, top.y - 1); g.lineTo(foot.x, foot.y - 1); g.stroke();
  g.restore();
  post(g, L, top.x, top.y - 6, 'top', P.ink, P, { height: 56 });
  post(g, L, foot.x, foot.y - 6, T`${s3(f.s)} [m]`, P.ink, P, { height: 56 });

  // ── the angle at the foot, with its arc
  { const R = clamp(k * f.s * 0.35, 46, 120);
    g.strokeStyle = P.ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(foot.x, foot.y); g.lineTo(foot.x - R * 1.2, foot.y); g.stroke();
    g.beginPath(); g.arc(foot.x, foot.y, R, Math.PI, Math.PI + al); g.stroke();
    const tag = f.alphaGiven ? `${num(f.alpha, 1, { trim: true })}°` : T`alpha = ${num(f.alpha, 2)}°`;
    // beside its arc, outside it, halfway round
    L.add(tag, foot.x - (R + 16) * Math.cos(al / 2), foot.y - (R + 16) * Math.sin(al / 2) - 8, { color: P.ink, pri: 9, size: 14, weight: 700, align: 'right' }); }

  // ── the cyclist, leaning with the slope, and the arrows along it
  const d = f.pos(t), q = along(d), L0 = clamp(k * 1.8, 54, 96);
  g.save(); g.translate(q.x, q.y - 6); g.rotate(al);
  drawFigure(g, 'cyclist', 0, 0, L0, P, { dir: 1, phase: phaseFor('cyclist', L0, d * k) });
  g.restore();
  L.reserve({ x: q.x - L0 * 0.6, y: q.y - L0 * 1.1, w: L0 * 1.2, h: L0 * 1.1 });
  const ux = Math.cos(al), uy = Math.sin(al), v = f.vel(t);
  if (show.velocity !== false && v > 1e-9) {
    const len = clamp((v / Math.max(f.v, f.u, 1e-9)) * 100, 18, 100), ax = q.x + ux * (L0 * 0.55) + uy * L0 * 0.5, ay = q.y + uy * (L0 * 0.55) - ux * L0 * 0.5;   // from the front of the bike, at its middle
    arrow(g, ax, ay, ax + ux * len, ay + uy * len, { color: P.vel, width: 2.6, head: 10 });
    L.add(T`${s3(v)} [m s^-1]`, ax + ux * len + 8, ay + uy * len - 6, { color: P.vel, pri: 8, size: 14, weight: 700, align: 'left' });
  }
  if (f.acc(t) !== 0) {
    const ax = q.x + ux * 10, ay = q.y + 16 + uy * 10;
    arrow(g, ax, ay, ax + ux * 48, ay + uy * 48, { color: P.acc, width: 2.2, head: 9 });
    L.add(T`${s3(f.a)} [m s^-2]`, ax + ux * 54, ay + uy * 54 + 8, { color: P.acc, pri: 6, size: 13, weight: 700, align: 'left' });
  }
  // the speeds at each end, once reached
  L.add(T`${s3(f.u)} [m s^-1]`, top.x, top.y - 74, { color: P.vel, pri: 7, size: 13, weight: 700 });
  if (fired && t >= f.tMax - 1e-9) {
    const e = ageOf(t, f.tMax, f.tMax); pulse(g, foot.x, foot.y, e.age, e.life, P.mark, { radius: 40 });
    L.add(T`${s3(f.v)} [m s^-1] "after" ${s3(f.t)} [s]`, foot.x, foot.y - 74, { color: P.mark, pri: 9, size: 13, weight: 700 });
  }
  L.draw(g, w, h);

  // ── the forces along the slope, on a card fixed to the screen
  if (!phone && f.m != null) {
    unview(g);
    const cw = cardW, chh = 150, cx = w - cw - 16, cy = h - chh - 16;
    paper(g, cx, cy, cw, chh);
    const W = f.m * f.g * Math.sin(al), lab = (txt, x, y, col, al2 = 'left') => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = al2; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
    lab('Along the slope, down it +', cx + 12, cy + 18, P.muted);
    const sc = (cw - 90) / Math.max(W, f.R, Math.abs(f.F ?? 0), 1e-9), y0 = cy + 50, x0 = cx + 30;
    arrow(g, x0, y0, x0 + W * sc, y0, { color: P.ink, width: 2.4, head: 9 });
    lab(T`m g sin alpha = ${s3(W)} [N]`, x0, y0 + 16, P.ink);
    if (f.R > 0) { arrow(g, x0 + W * sc, y0 + 40, x0 + W * sc - f.R * sc, y0 + 40, { color: P.ink, width: 2.4, head: 9 }); lab(T`R = ${s3(f.R)} [N]`, x0 + W * sc, y0 + 56, P.ink, 'right'); }
    if (f.F != null) { const yF = cy + chh - 20; arrow(g, x0, yF - 10, x0 + f.F * sc, yF - 10, { color: P.acc, width: 3, head: 10 }); lab(T`F = ma = ${s3(f.F)} [N]`, x0 + f.F * sc + 8, yF - 10, P.acc); }
  }
  return null;
}
