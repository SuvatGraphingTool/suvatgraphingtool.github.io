// rope.js — the stage for a sledge pulled by a rope over snow, on level
// ground or up a slope: a winter sky, pines, the snowfield, the sledge
// (js/render/rough.js's) and the person pulling it, walking ahead with the
// rope in their hand at the rope's angle to the surface. When the rope is
// let go the person stops, the rope drops from the sledge, and the sledge
// slides on to rest, leaving its track; on a slope too steep for the
// friction it then slides back.
//
// A card fixed to the screen is the free-body diagram for the moment: while
// pulled, the tension along the rope, the normal reaction, the weight and
// friction; let go, the rope's arrow is gone and the reaction is the whole
// weight's part across the surface.
//
// Everything drawn is read from js/core/rope.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, unview } from './util.js';
import { skyscape, fitSide, env, paper } from './scenery.js';
import { runner, phaseFor } from './figures.js';
import { sledge, pine } from './rough.js';
import { pulse, ageOf } from './effects.js';
import { T, num } from '../notation.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2;
// 2 dp, but under 0.1 to 3 s.f., never a false 0
const s3 = (x) => (Math.abs(x) >= 0.1 || x === 0 ? num(x, 2) : num(Number(x.toPrecision(3)), 6, { trim: true }));
const sf = (x) => num(Number(x.toPrecision(3)), 6, { trim: true });

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'rope') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const compact = phone || h < 320 || w < 720;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);
  const cardW = compact ? 0 : 236, cardH = 176;
  if (cardW) L.reserve({ x: w - cardW - 16, y: h - cardH - 16, w: cardW, h: cardH });

  // ── the surface in its own plane: from where it starts (0, 0) along the way it is pulled
  const al = f.alpha * D2R, ca = Math.cos(al), sa = Math.sin(al);
  const far = f.s1 + f.s2, back = f.stays ? 0 : Math.min(far, 0.5 * Math.abs(f.aBack) * (f.tMax - f.tRest) ** 2);
  const run = far * 1.18, D = run * ca, H = run * sa;
  const box = { xLo: -far * 0.1, xHi: D + far * 0.04, yLo: -far * 0.08, yHi: H + far * 0.2 };
  const area = { left: phone ? 14 : HB[0].w + 20, right: w - (cardW ? cardW + 30 : 14), top: HB[0].h * (phone ? 1 : 0.55), bottom: h - (compact ? 52 : 26) };
  const { k, X, Y } = fitSide(box, area, { sky: 0.55 });
  const along = (s) => ({ x: X(s * ca), y: Y(s * sa) });
  const o0 = along(0), end = along(run);
  const nx = sa, ny = -ca;                  // the normal out of the surface, on screen (up)

  // ── winter sky, a far snowfield, pines; the snow surface (level, or the hillside)
  skyscape(g, 0, 0, w, Math.min(o0.y, h * 0.8), { seed: 47, far: 'hills', sun: false });
  if (E.night) { g.fillStyle = withAlpha('#ffffff', 0.8); for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 211.7) % w, (i * 37.1) % (o0.y * 0.6), 0.6 + (i % 3) * 0.3, 0, TAU); g.fill(); } }
  const snow = E.night ? '#c9d3dc' : '#f4f7fa', shade = E.night ? '#a9b6c2' : '#dbe4ec';
  const sg = g.createLinearGradient(0, end.y, 0, o0.y + 40); sg.addColorStop(0, snow); sg.addColorStop(1, shade);
  g.fillStyle = sg; g.beginPath(); g.moveTo(-20, o0.y); g.lineTo(o0.x, o0.y); g.lineTo(end.x, end.y); g.lineTo(w + 20, end.y - 2); g.lineTo(w + 20, h + 20); g.lineTo(-20, h + 20); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(120,140,160,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-20, o0.y); g.lineTo(o0.x, o0.y); g.lineTo(end.x, end.y); g.lineTo(w + 20, end.y - 2); g.stroke();
  const Ls = clamp(Math.min(w, h) * 0.13, 46, 84), Lp = Ls * 1.25;
  for (const [x, sz] of [[o0.x - 60, 1], [o0.x - 130, 0.8], [end.x - 40, 0.9], [end.x + 30, 1.1]]) if (x > 8 && x < w - 8 && !(cardW && x > w - cardW - 30 && end.y > h - cardH - 40)) {
    const Yp = x < o0.x ? o0.y : Y(((x - X(0)) / k) * Math.tan(al)), Hp = Lp * 1.3 * sz; pine(g, x, Yp, Hp); L.reserve({ x: x - Hp * 0.36, y: Yp - Hp, w: Hp * 0.72, h: Hp });
  }

  // ── the sledge's track so far, and the marks: let go, at rest
  const s = f.pos(t), q = along(s), reached = f.pos(Math.min(t, f.tRest));
  { const a = along(0), b = along(reached); g.strokeStyle = 'rgba(120,140,165,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(a.x, a.y - 1); g.lineTo(b.x, b.y - 1); g.stroke(); }
  const rel = along(f.s1), stop = along(far);
  if (t >= f.tRel - 1e-9) {
    g.strokeStyle = P.mark; g.lineWidth = 1.6; g.beginPath(); g.moveTo(rel.x, rel.y + 6); g.lineTo(rel.x - nx * 30, rel.y + ny * 30 - 6); g.stroke();
    L.add(T`"let go at" ${s3(f.v)} [m s^-1]`, rel.x - nx * 30, rel.y + ny * 30 - 16, { color: P.mark, pri: 9, size: 13, weight: 700, maxPush: 40 });
  }

  // ── the person pulling: ahead of the sledge, walking, the rope in their hand at θ to the surface;
  //    let go, they stop where they were and the rope hangs from their hand
  const pulled = t < f.tRel - 1e-9, th = (f.theta * Math.PI) / 180;
  const attachH = Ls * 0.16, ropeLen = clamp(f.theta > 0 ? (Lp * 0.42 - attachH) / Math.sin(th) : Ls * 1.6, Ls * 1.2, Ls * 2.6);
  const ropeAt = (sPos) => {
    // the front of the sledge, at the height the rope is tied
    const base = along(sPos), at0 = { x: base.x + ca * Ls * 0.5 + nx * attachH, y: base.y - sa * Ls * 0.5 + ny * attachH };
    const dir = { x: Math.cos(al + th), y: -Math.sin(al + th) };
    return { from: at0, hand: { x: at0.x + dir.x * ropeLen, y: at0.y + dir.y * ropeLen } };
  };
  const rp = ropeAt(pulled ? s : f.s1);
  // the feet on the surface under the hand, a little ahead of it
  const feetS = ((rp.hand.x - X(0)) / k + Lp * 0.12 / k) / ca, feet = along(feetS);
  runner(g, feet.x, feet.y, Lp, P, { dir: 1, still: !pulled, phase: phaseFor('runner', Lp, (pulled ? s : f.s1) * k * 0.6), reach: rp.hand });
  L.reserve({ x: feet.x - Lp * 0.4, y: feet.y - Lp, w: Lp * 0.7, h: Lp });

  // ── the sledge, on the surface
  g.save(); g.translate(q.x, q.y); g.rotate(-al); sledge(g, Ls); g.restore();
  L.reserve({ x: q.x - Ls * 0.55, y: q.y - Ls * 0.45, w: Ls * 1.15, h: Ls * 0.5 });
  // the rope: taut while pulled; let go, it hangs from the hand to the snow
  g.strokeStyle = '#c9a86a'; g.lineWidth = 2;
  if (pulled) { g.beginPath(); g.moveTo(rp.from.x, rp.from.y); g.lineTo(rp.hand.x, rp.hand.y); g.stroke(); }
  else { const gnd = along(feetS - ropeLen * 0.6 / k); g.beginPath(); g.moveTo(rp.hand.x, rp.hand.y); g.quadraticCurveTo(rp.hand.x - 4, gnd.y - 2, gnd.x, gnd.y - 1); g.stroke(); }

  // ── the arrows: the velocity along the surface, the acceleration under it
  const v = f.vel(t), A = f.acc(t);
  if (show.velocity !== false && Math.abs(v) >= 0.05 && (Math.abs(v) / f.v) * 100 >= 4) {
    const dir = Math.sign(v), len = Math.min((Math.abs(v) / f.v) * 90, 90), ax = q.x + dir * ca * Ls * 0.6 + nx * Ls * 0.42, ay = q.y - dir * sa * Ls * 0.6 + ny * Ls * 0.42;
    arrow(g, ax, ay, ax + dir * ca * len, ay - dir * sa * len, { color: P.vel, width: 2.6, head: Math.min(10, len * 0.6) });
    L.add(T`${s3(Math.abs(v))} [m s^-1]`, ax + dir * ca * len + dir * 8, ay - dir * sa * len - 10, { color: P.vel, pri: 8, size: 14, weight: 700, align: dir > 0 ? 'left' : 'right' });
  }
  if (Math.abs(A) > 1e-9) {
    const dir = Math.sign(A), bx = q.x - nx * 24, by = q.y - ny * 24;
    arrow(g, bx, by, bx + dir * ca * 46, by - dir * sa * 46, { color: P.acc, width: 2.2, head: 9 });
    L.add(T`${s3(Math.abs(A))} [m s^-2]`, bx + dir * ca * 56, by - dir * sa * 56 + 4, { color: P.acc, pri: 7, size: 13, weight: 700, align: dir > 0 ? 'left' : 'right' });
  }
  // at rest: a ring, and how far it slid after it was let go
  if (fired && t >= f.tRest - 1e-9) {
    const e = ageOf(t, f.tRest, f.tMax); pulse(g, stop.x, stop.y, e.age, e.life, P.mark, { radius: 30 });
    L.add(T`${sf(f.s2)} [m] "after it was let go"`, stop.x, stop.y - Ls * 0.9 - 14, { color: P.mark, pri: 9, size: 13, weight: 700, maxPush: 60 });
  }
  L.draw(g, w, h);

  // ── the free-body diagram for this moment, on a card (or a caption on a small stage)
  unview(g);
  const ph = f.phase(t), on = ph === 'pull';
  const Rnow = on ? f.R : f.R2, Fnow = ph === 'rest' ? null : f.mu * Rnow;
  if (cardW) {
    const cx = w - cardW - 16, cy = h - cardH - 16;
    paper(g, cx, cy, cardW, cardH);
    const lab = (txt, x, y, col, al2 = 'left') => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = al2; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
    lab(on ? 'Pulled: the forces on it' : ph === 'rest' ? 'At rest' : 'Let go: the forces on it', cx + 12, cy + 16, P.muted);
    const bx = cx + cardW * 0.42, by = cy + 96, big = Math.max(f.W, f.T, 1e-9), sc = 52 / big;
    // the body on its surface, tilted as the surface is
    g.save(); g.translate(bx, by); g.rotate(-al);
    g.strokeStyle = withAlpha(P.ink, 0.5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-60, 12); g.lineTo(60, 12); g.stroke();
    g.fillStyle = withAlpha(P.ink, 0.1); g.strokeStyle = P.ink; g.beginPath(); g.roundRect?.(-16, -12, 32, 24, 3); g.fill(); g.stroke();
    // R square out of the surface, friction along it against the motion, T along the rope
    arrow(g, 0, -12, 0, -12 - Math.max(10, Rnow * sc), { color: P.ink, width: 2.2, head: 8 });
    if (Fnow) { const dirF = ph === 'back' ? 1 : -1; arrow(g, dirF * 16, 6, dirF * (16 + Math.max(8, Fnow * sc)), 6, { color: P.ink, width: 2.2, head: 8 }); }
    if (on) arrow(g, 16, -4, 16 + Math.cos(th) * Math.max(10, f.T * sc), -4 - Math.sin(th) * Math.max(10, f.T * sc), { color: P.ink, width: 2.4, head: 9 });
    g.restore();
    // the weight straight down
    arrow(g, bx, by, bx, by + Math.max(10, f.W * sc * 0.5), { color: P.ink, width: 2.2, head: 8 });
    const right = cx + cardW - 10;
    lab(T`R = ${sf(Rnow)} [N]`, right, cy + 38, P.ink, 'right');
    if (on) lab(T`T = ${sf(f.T)} [N]`, right, cy + 58, P.ink, 'right');
    if (Fnow) lab(T`F = mu R = ${sf(Fnow)} [N]`, cx + 12, cy + cardH - 34, P.ink);
    lab(T`m g = ${sf(f.W)} [N]`, cx + 12, cy + cardH - 14, P.muted);
  } else {
    const parts = [on ? T`T = ${sf(f.T)} [N]` : 'let go', T`R = ${sf(Rnow)} [N]`, Fnow ? T`F = ${sf(Fnow)} [N]` : 'no friction now'];
    g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
    const one = parts.join(', '), lines = g.measureText(one).width + 14 <= w - 20 ? [one] : [parts.slice(0, 2).join(', '), parts[2]];
    const tw = Math.max(...lines.map((x) => g.measureText(x).width)) + 14, bh = 8 + 18 * lines.length;
    g.fillStyle = withAlpha('#101418', 0.78); g.fillRect(10, h - bh - 8, tw, bh);
    g.fillStyle = '#e8eaee'; lines.forEach((x, i) => g.fillText(x, 17, h - bh - 8 + 13 + i * 18)); g.restore();
  }
  return null;
}
