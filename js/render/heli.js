// heli.js — the stage for a helicopter over the sea, from above, i east and
// j north at one scale: the lighthouse on its rock where it sets off, the
// rock it must pass over in its surf, and the helicopter itself — a red and
// white coastguard machine with its rotor turning, its shadow on the water
// below and the downwash ringing out under it.
//
// The whole path faintly and the part flown strongly (displacement hue: a
// path is where it has been). At each moment the paper asks about, the clock
// stops on the water: the speed and bearing at a time, the circle of the
// distance from the start, the line north–south through the rock where it is
// level with it but not over it, and — over the rock — the straight line from
// the lighthouse that is its average velocity. The velocity arrow at the
// helicopter splits into east (dashed) and north (solid) on request (rule 2).
// The compass belongs to the screen.
//
// Everything drawn is read from js/core/heli.js (rule 4).

import { seaFromAbove, fitPlanAround, planGrid, compassRose, lighthouseAbove, env } from './scenery.js';
import { pulse, ageOf, phaseOf, flash } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha, unview, cssVar, hudBoxes as hudOf } from './util.js';
import { placer, s3 } from './twoplane.js';
import { T, num } from '../notation.js';

const ROWS = 5;
const TAU = Math.PI * 2;
const three = (b) => String(Math.round(((b % 360) + 360) % 360) % 360).padStart(3, '0');

/** A coastguard helicopter from above at (x, y), s px nose to tail rotor,
    its nose along screen angle `ang`; the rotor at angle `rot`; `lift` 0..1
    how high it is, for how far its shadow falls from it. */
export function heliTop(g, x, y, s, ang, rot, lift = 1) {
  const E = env();
  // the shadow on the sea, down and to the right of it
  g.save(); g.translate(x + s * 0.32 * lift, y + s * 0.42 * lift); g.rotate(ang); g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath(); g.ellipse(0, 0, s * 0.3, s * 0.13, 0, 0, TAU); g.fill();
  g.fillRect(-s * 0.72, -s * 0.03, s * 0.46, s * 0.06);
  g.beginPath(); g.arc(0, 0, s * 0.5, 0, TAU); g.globalAlpha = 0.25; g.fill();
  g.restore();

  g.save(); g.translate(x, y); g.rotate(ang);
  const red = E.night ? '#b8392f' : '#d6402f', white = E.night ? '#d9dde2' : '#f6f7f8', dark = '#262b33';
  // the tail boom, fin and tail rotor
  g.fillStyle = white; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-s * 0.18, -s * 0.045); g.lineTo(-s * 0.68, -s * 0.022); g.lineTo(-s * 0.68, s * 0.022); g.lineTo(-s * 0.18, s * 0.045); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = red; g.fillRect(-s * 0.5, -s * 0.03, s * 0.08, s * 0.06);
  g.fillStyle = dark; g.fillRect(-s * 0.7, -s * 0.11, s * 0.05, s * 0.22);
  g.strokeStyle = withAlpha('#30353d', 0.55); g.lineWidth = 2;
  { const tr = rot * 2.3; g.beginPath(); g.moveTo(-s * 0.675 + Math.cos(tr) * s * 0.02, Math.sin(tr) * s * 0.1); g.lineTo(-s * 0.675 - Math.cos(tr) * s * 0.02, -Math.sin(tr) * s * 0.1); g.stroke(); }
  // the skids
  g.strokeStyle = dark; g.lineWidth = 2;
  for (const k of [-1, 1]) { g.beginPath(); g.moveTo(s * 0.2, k * s * 0.12); g.lineTo(-s * 0.2, k * s * 0.12); g.stroke(); }
  // the cabin: red, a white band, the glass at the nose
  const body = g.createLinearGradient(0, -s * 0.12, 0, s * 0.12);
  body.addColorStop(0, red); body.addColorStop(0.5, E.night ? '#d0574b' : '#e8604f'); body.addColorStop(1, '#9c2b22');
  g.fillStyle = body; g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
  g.beginPath(); g.ellipse(0, 0, s * 0.27, s * 0.11, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = white; g.fillRect(-s * 0.12, -s * 0.11, s * 0.06, s * 0.22);
  g.fillStyle = E.night ? '#3d5566' : '#6f9db8';
  g.beginPath(); g.ellipse(s * 0.17, 0, s * 0.09, s * 0.08, 0, -Math.PI / 2, Math.PI / 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(s * 0.19, -s * 0.03, s * 0.035, s * 0.018, 0.4, 0, TAU); g.fill();
  // the main rotor: a blurred disc, and four blades where they are now
  const disc = g.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.5);
  // on a dark sea the blur and the blades are light; on a bright one, dark
  const tone = E.night ? '220,226,232' : '40,44,52';
  disc.addColorStop(0, `rgba(${tone},0.08)`); disc.addColorStop(0.85, `rgba(${tone},0.18)`); disc.addColorStop(1, `rgba(${tone},0)`);
  g.fillStyle = disc; g.beginPath(); g.arc(0, 0, s * 0.5, 0, TAU); g.fill();
  g.strokeStyle = `rgba(${tone},0.8)`; g.lineWidth = Math.max(2, s * 0.03); g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const b = rot + (i * TAU) / 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(b) * s * 0.48, Math.sin(b) * s * 0.48); g.stroke(); }
  g.fillStyle = dark; g.beginPath(); g.arc(0, 0, s * 0.035, 0, TAU); g.fill();
  g.restore();
}

/** A rock in the sea with its surf, at (x, y), r px across. */
function rockTop(g, x, y, r, phase) {
  const E = env();
  g.save();
  for (let i = 0; i < 3; i++) {
    const u = ((phase / 40 + i / 3) % 1), R = r * (0.9 + u * 0.9);
    g.strokeStyle = `rgba(255,255,255,${(1 - u) * 0.55})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  }
  const pts = 9;
  g.beginPath();
  for (let i = 0; i <= pts; i++) { const a = (i / pts) * TAU, k = 0.72 + 0.28 * Math.abs(Math.sin(i * 2.7 + 1.3)); g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.8); }
  const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  rg.addColorStop(0, E.night ? '#6b6560' : '#a49b90'); rg.addColorStop(1, E.night ? '#2e2a27' : '#4f4842');
  g.fillStyle = rg; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.25, r * 0.25, r * 0.12, -0.5, 0, TAU); g.fill();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'heli') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const A = f.answers;

  // ── the frame: the whole path, the lighthouse, the rock and O
  const n = 90, pts = [];
  for (let i = 0; i <= n; i++) pts.push(f.pos((i / n) * f.tMax));
  const all = [...pts, f.r0, { x: 0, y: 0 }, ...(f.rock ? [f.rock] : [])];
  if (A.D) for (let i = 0; i < 16; i++) all.push({ x: f.r0.x + A.D.D * Math.cos((i / 16) * TAU), y: f.r0.y + A.D.D * Math.sin((i / 16) * TAU) });
  const box = { xLo: Math.min(...all.map((p) => p.x)), xHi: Math.max(...all.map((p) => p.x)), yLo: Math.min(...all.map((p) => p.y)), yHi: Math.max(...all.map((p) => p.y)) };
  const sp = Math.max(box.xHi - box.xLo, box.yHi - box.yLo, 1);
  for (const [lo, hi] of [['xLo', 'xHi'], ['yLo', 'yHi']]) { const m = Math.max(0, sp * 0.25 - (box[hi] - box[lo])) / 2; box[lo] -= m; box[hi] += m; }
  const S = clamp(Math.min(w, h) * 0.2, 60, 96), pad = S * 1.1;   // room all round for the helicopter and its arrow
  const hudBoxes = hudOf(w, phone ? 3 : ROWS);   // as js/kits/heli.js shows them
  const cR = phone ? 19 : 24, cX = w - cR - (phone ? 12 : 20), cY = h - cR - (phone ? 14 : 22);
  const compassBox = { x: cX - cR - 4, y: cY - cR - 24, w: cR * 2 + 8, h: cR * 2 + 28 };
  const F = fitPlanAround(box, all, { left: pad, right: w - pad, top: pad, bottom: h - pad }, { avoid: [...hudBoxes.map((b) => ({ ...b, h: b.h + 40 })), compassBox], margin: pad * 0.7 });   // the lighthouse stands 40 px above its point
  const { X, Y } = F, px = (p) => ({ x: X(p.x), y: Y(p.y) });

  // ── the sea, the lighthouse's rock and the rock as islands in it
  const phase = (t / Math.max(f.tMax, 1e-9)) * 160;
  const L0 = px(f.r0), R0 = f.rock ? px(f.rock) : null;
  seaFromAbove(g, 0, 0, w, h, { phase, avoid: [...pts.map(px), { x: X(0), y: Y(0) }, L0, ...(R0 ? [R0] : [])].flatMap((q) => [q, { x: q.x + 50, y: q.y }, { x: q.x - 50, y: q.y }]), coast: true, hud: true, islands: [{ x: L0.x, y: L0.y + 6, r: 30 }] });

  const Q = placer(g, w, h);
  const hold = (b) => { L.reserve(b); Q.box(b); };
  for (const b of [...hudBoxes, compassBox]) hold(b);
  Q.line([{ x: 0, y: Y(0) }, { x: w, y: Y(0) }], 10); Q.line([{ x: X(0), y: 0 }, { x: X(0), y: h }], 10);
  Q.line(pts.map(px));

  // ── the grid and the axes through O
  const step = niceStep(sp, phone ? 5 : 8);
  const Ls = labels(); for (const b of [...hudBoxes, compassBox]) Ls.reserve(b);
  const gridWords = planGrid(g, Ls, F, w, h, P, { step, fmt: (x) => num(x, step < 1 ? 1 : 0), nameI: T`vec(i) [m]`, nameJ: T`vec(j) [m]`, clear: Q.clear,
    jTop: X(0) < hudBoxes[0].x + hudBoxes[0].w + 10 ? hudBoxes[0].h + 14 : 16 });
  for (const b of gridWords) hold(b);

  if (R0) { rockTop(g, R0.x, R0.y, 15, phase); hold({ x: R0.x - 16, y: R0.y - 14, w: 32, h: 28 }); Q.add('the rock', R0.x, R0.y, { color: P.ink, pri: 9, size: 13, weight: 700 }); }
  lighthouseAbove(g, L0.x, L0.y, 34, { beam: (t / Math.max(f.tMax, 1e-9)) * TAU * 3 + 1 });
  hold({ x: L0.x - 16, y: L0.y - 40, w: 32, h: 48 });
  Q.add('lighthouse', L0.x, L0.y - 16, { color: P.ink, pri: 7, size: 13, weight: 700 });

  // ── the path: faint in full, strong to now
  stroke(g, pts.map(px), { color: P.disp, width: 1.8, alpha: 0.45, dash: [5, 5] });
  const so = []; for (let i = 0; i <= 80; i++) so.push(px(f.pos((i / 80) * t)));
  if (t > 0) { stroke(g, so, { color: cssVar('--surface', '#131210'), width: 5.5, alpha: 0.4 }); stroke(g, so, { color: P.disp, width: 3 }); }

  // ── the helicopter, its downwash on the water, and its arrows
  const p = px(f.pos(t)), v = f.vel(t), spd = Math.hypot(v.x, v.y);
  const nose = spd > 1e-9 ? Math.atan2(-v.y, v.x) : Math.atan2(-f.a.y, f.a.x);
  const rot = (t / Math.max(f.tMax, 1e-9)) * TAU * 40;
  for (let i = 0; i < 3; i++) {
    const u = ((phase / 25 + i / 3) % 1), R = S * (0.35 + u * 0.55);
    g.strokeStyle = `rgba(255,255,255,${(1 - u) * 0.4})`; g.lineWidth = 1.6; g.beginPath(); g.arc(p.x + S * 0.3, p.y + S * 0.4, R, 0, TAU); g.stroke();
  }
  heliTop(g, p.x, p.y, S, nose, rot);
  hold({ x: p.x - S * 0.5, y: p.y - S * 0.5, w: S, h: S });

  // ── each asked moment, once the clock reaches it: drawn over the helicopter,
  //    which is over the rock at the very moment the paper asks about
  const at = (ta) => t >= ta - 1e-9 ? ageOf(t, ta, f.tMax) : null;
  if (A.D) {
    const e = at(A.D.t);
    if (e) {
      const u = phaseOf(e.age, e.life * 0.6), grow = u == null ? 1 : 1 - (1 - u) ** 3;
      const R = A.D.D * F.k;
      g.save(); g.strokeStyle = withAlpha(P.mark, 0.9); g.lineWidth = 2; g.setLineDash([7, 5]);
      g.beginPath(); g.arc(L0.x, L0.y, R, -Math.PI / 2, -Math.PI / 2 + TAU * grow); g.stroke(); g.restore();
      const q = px(A.D.r); pulse(g, q.x, q.y, e.age, e.life, P.mark, { radius: 40 });
      stroke(g, [L0, q], { color: P.mark, width: 1.6, dash: [3, 4] });
      Q.add(T`${s3(A.D.D)} [m] "from the start," t = ${s3(A.D.t)} [s]`, (L0.x + q.x) / 2, (L0.y + q.y) / 2, { color: P.mark, pri: 8, size: 14, weight: 700 });
    }
  }
  if (A.P) {
    for (const ta of A.P.times || []) {
      if (A.P.over && Math.abs(ta - A.P.t) < 1e-9) continue;
      const e = at(ta); if (!e || !R0) continue;
      // level with the rock east–west, but not over it: the north–south line
      const q = px(f.pos(ta));
      stroke(g, [{ x: R0.x, y: Math.min(R0.y, q.y) - 30 }, { x: R0.x, y: Math.max(R0.y, q.y) + 30 }], { color: P.mark, width: 1.6, dash: [6, 5], alpha: 0.85 });
      pulse(g, q.x, q.y, e.age, e.life, P.mark, { radius: 34 });
      dot(g, q.x, q.y, 5, { fill: P.mark, stroke: cssVar('--surface', '#131210'), width: 2 });
      Q.add(T`t = ${s3(ta)} [s] ": level, not over"`, q.x, q.y, { color: P.mark, pri: 8, size: 13, weight: 700 });
    }
    if (A.P.over) {
      const e = at(A.P.t);
      if (e && R0) {
        flash(g, R0.x, R0.y, e.age, e.life, { color: P.mark });
        pulse(g, R0.x, R0.y, e.age, e.life, P.mark, { radius: 48 });
        // the average velocity: the straight line from the lighthouse to the rock
        const u = phaseOf(e.age, e.life * 0.6), grow = u == null ? 1 : 1 - (1 - u) ** 3;
        const end = { x: L0.x + (R0.x - L0.x) * grow, y: L0.y + (R0.y - L0.y) * grow };
        arrow(g, L0.x, L0.y, end.x, end.y, { color: P.mark, width: 2.4, head: 11, dash: [9, 5] });   // dashed: not the path it flew
        Q.line([L0, R0], 8);
        Q.add(T`"over the rock," t = ${s3(A.P.t)} [s]`, R0.x, R0.y, { color: P.mark, pri: 9, size: 14, weight: 700 });
        Q.add(T`"average velocity" ${s3(A.P.avs)} [m s^-1]`, (L0.x + R0.x) / 2, (L0.y + R0.y) / 2, { color: P.mark, pri: 10, size: 13, weight: 700 });
      }
    }
  }

  if (A.T) {
    const e = at(A.T.t);
    if (e) {
      const q = px(f.pos(A.T.t)); pulse(g, q.x, q.y, e.age, e.life, P.mark, { radius: 40 }); dot(g, q.x, q.y, 5, { fill: P.mark, stroke: cssVar('--surface', '#131210'), width: 2 });
      Q.add(T`t = ${s3(A.T.t)} [s], ${s3(A.T.speed)} [m s^-1] "on" ${three(A.T.bearing)}°`, q.x, q.y, { color: P.mark, pri: 8, size: 13, weight: 700 });
    }
  }
  if (show.velocity !== false && spd > 1e-9) {
    const len = clamp(S * 0.85, 48, 84), ux = v.x / spd, uy = v.y / spd;
    if (show.components) {
      arrow(g, p.x, p.y, p.x + ux * len, p.y, { color: P.vel, width: 2.4, head: 9, dash: [6, 4] });
      arrow(g, p.x, p.y, p.x, p.y - uy * len, { color: P.vel, width: 2.4, head: 9 });
      Q.add(T`${s3(v.x)}`, p.x + ux * len, p.y, { color: P.vel, pri: 7, size: 13, weight: 700 });
      Q.add(T`${s3(v.y)}`, p.x, p.y - uy * len, { color: P.vel, pri: 7, size: 13, weight: 700 });
    }
    arrow(g, p.x, p.y, p.x + ux * len, p.y - uy * len, { color: P.vel, width: 2.8, head: 11, dash: Math.abs(uy) < 1e-9 ? [6, 4] : null });
    Q.line([p, { x: p.x + ux * len, y: p.y - uy * len }], 8);
    Q.add(T`${s3(spd)} [m s^-1]`, p.x + ux * len, p.y - uy * len, { color: P.vel, pri: 8, size: 14, weight: 700 });
  }
  if (show.acceleration !== false) {
    const am = Math.hypot(f.a.x, f.a.y), len = clamp(S * 0.6, 34, 60);
    if (am > 1e-9) arrow(g, p.x, p.y, p.x + (f.a.x / am) * len, p.y - (f.a.y / am) * len, { color: P.acc, width: 2.2, head: 9, dash: Math.abs(f.a.y) < 1e-9 ? [6, 4] : null });
  }

  Q.flush(L);
  Ls.draw(g, w, h);
  L.draw(g, w, h);
  unview(g);
  compassRose(g, cX, cY, cR, P);
  return null;
}
