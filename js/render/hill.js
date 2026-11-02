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
  // a short or narrow stage has no room for the force card: a caption line instead
  const compact = phone || h < 380 || w < 760;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);

  // ── the slope in its own plane: the run of length s, from the top at (0, H) to the foot at (D, 0)
  // no angle found (no slope gives that acceleration): a slope drawn, its angle not claimed
  const al = (f.alpha ?? 5) * D2R, D = f.s * Math.cos(al), H = f.s * Math.sin(al);
  const cardW = compact ? 0 : 230;
  const box = { xLo: -f.s * 0.12, xHi: D + f.s * 0.12, yLo: -f.s * 0.05, yHi: H + f.s * 0.22 };
  const area = { left: phone ? 14 : HB[0].w + 20, right: w - (compact ? 14 : cardW + 30), top: HB[0].h * (phone ? 1 : 0.55), bottom: h - (compact ? 40 : 26) };
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
  post(g, L, top.x, top.y - 6, T`0 [m]`, P.disp, P, { height: 56 });
  post(g, L, foot.x, foot.y - 6, T`${s3(f.s)} [m]`, P.disp, P, { height: 56 });

  // ── the angle at the foot, with its arc
  { const R = clamp(k * f.s * 0.35, 46, 120);
    g.strokeStyle = P.ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(foot.x, foot.y); g.lineTo(foot.x - R * 1.2, foot.y); g.stroke();
    g.beginPath(); g.arc(foot.x, foot.y, R, Math.PI, Math.PI + al); g.stroke();
    // under the horizontal, by the arc: clear of the lane and the arrows on it
    const tag = f.alpha == null ? 'angle not found' : f.alphaGiven ? `${num(f.alpha, 2, { trim: true })}°` : T`alpha = ${num(f.alpha, 2)}°`;
    L.add(tag, foot.x - R * 0.8, foot.y + 18, { color: P.ink, pri: 9, size: 14, weight: 700 }); }

  // ── the cyclist, leaning with the slope, and the arrows along it
  const d = f.pos(t), q = along(d), L0 = clamp(Math.min(w, h) * 0.17, 56, 110);
  // on the lane's surface, 6 px above its centre line, square to the slope
  g.save(); g.translate(q.x, q.y); g.rotate(al);
  drawFigure(g, 'cyclist', 0, -6, L0, P, { dir: 1, phase: phaseFor('cyclist', L0, d * k) });
  g.restore();
  L.reserve({ x: q.x - L0 * 0.6, y: q.y - L0 * 1.1, w: L0 * 1.2, h: L0 * 1.1 });
  const ux = Math.cos(al), uy = Math.sin(al), v = f.vel(t);
  if (show.velocity !== false && v > 1e-9) {
    // from the front of the bike, at its middle; short enough to stay on the stage
    const ax = q.x + ux * (L0 * 0.55) + uy * L0 * 0.5, ay = q.y + uy * (L0 * 0.55) - ux * L0 * 0.5;
    const len = Math.min(clamp((v / Math.max(f.v, f.u, 1e-9)) * 100, 18, 100), Math.max(18, (area.right - 70 - ax) / ux));
    arrow(g, ax, ay, ax + ux * len, ay + uy * len, { color: P.vel, width: 2.6, head: 10 });
    L.add(T`${s3(v)} [m s^-1]`, ax + ux * len + 8, ay + uy * len - 6, { color: P.vel, pri: 8, size: 14, weight: 700, align: 'left' });
  }
  if (f.acc(t) !== 0) {
    // under the lane, square off it, pointing the way it speeds up
    const ax = q.x - uy * 26, ay = q.y + ux * 26;
    arrow(g, ax, ay, ax + ux * 48, ay + uy * 48, { color: P.acc, width: 2.2, head: 9 });
    L.add(T`${s3(f.a)} [m s^-2]`, ax + ux * 24, ay + uy * 24 + 18, { color: P.acc, pri: 8, size: 13, weight: 700 });
  }
  // the speeds at each end, once reached
  if (fired && t >= f.tMax - 1e-9) {
    const e = ageOf(t, f.tMax, f.tMax); pulse(g, foot.x, foot.y, e.age, e.life, P.mark, { radius: 40 });
    L.add(T`${s3(f.v)} [m s^-1] "after" ${s3(f.t)} [s]`, foot.x, foot.y - 74, { color: P.mark, pri: 9, size: 13, weight: 700 });
  }
  L.draw(g, w, h);

  // ── the forces along the slope, on a card fixed to the screen
  if (!compact && f.m != null && f.W != null) {
    unview(g);
    const cw = cardW, chh = 160, cx = w - cw - 16, cy = h - chh - 16;
    paper(g, cx, cy, cw, chh);
    const W = f.W ?? 0, lab = (txt, x, y, col, al2 = 'left') => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = al2; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
    lab('Along the slope, down it +', cx + 12, cy + 18, P.muted);
    // every arrow from one origin, down the slope to the right; when something points up
    // the slope the origin moves in so that arrow stays on the card too. Labels under each.
    const lo = Math.min(0, W - (f.R || 0), f.F ?? 0), hi = Math.max(W, f.F ?? 0, 1e-9);
    const sc = (cw - 40) / (hi - lo), x0 = cx + 20 - lo * sc, y0 = cy + 46;
    arrow(g, x0, y0, x0 + W * sc, y0, { color: P.ink, width: 2.4, head: 9 });
    lab(T`m g sin alpha = ${s3(W)} [N]`, cx + 12, y0 + 16, P.ink);
    if (f.R > 0) { arrow(g, x0 + W * sc, y0 + 36, x0 + (W - f.R) * sc, y0 + 36, { color: P.ink, width: 2.4, head: 9 }); lab(T`R = ${s3(f.R)} [N] "up the slope"`, cx + 12, y0 + 52, P.ink); }
    if (f.F != null) { const yF = cy + chh - 30; arrow(g, x0, yF, x0 + f.F * sc, yF, { color: P.acc, width: 3, head: 10 }); lab(T`F = ma = ${s3(f.F)} [N]`, cx + 12, yF + 16, P.acc); }
  }
  // on a phone or a short stage, the forces in one line along the foot of the stage
  if (compact && f.W != null) {
    unview(g);
    const txt = T`m g sin alpha = ${s3(f.W)} [N]${f.R > 0 ? `, R = ${s3(f.R)} [N]` : ''}${f.F != null ? `, F = ${s3(f.F)} [N]` : ''}`;
    g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
    const tw = Math.min(w - 20, g.measureText(txt).width + 14);
    g.fillStyle = withAlpha('#101418', 0.78); g.fillRect(10, h - 30, tw, 22);
    g.fillStyle = '#e8eaee'; g.fillText(txt, 17, h - 19, w - 34); g.restore();
  }
  return null;
}
