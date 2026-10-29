// clears.js — the stage for a projectile that just clears a wall and lands
// beyond it, every length a multiple of a.
//
// Side on at one scale both ways, fitted to the flight (fitSide): a layered
// sky over a field seen a little from above, the thrower at O winding up and
// releasing on the engine's clock, the angle marked, and a solid garden wall —
// brick courses, a stone coping — standing on the motion's plane and running
// away from it towards the horizon, so it reads as a wall and not a post. Its
// near end is the wall the paper draws: the path just grazes its top. Each
// length is a dimension line labelled twice — in the letter, as the paper
// gives it, and in metres, as the engine found it (3 s.f.). The greatest
// height is marked at the top of the path; the landing kicks up dust. The ball
// is the stadium's shaded ball with its velocity and components (across
// dashed, up solid — rule 2).
//
// `brickWall` is exported here. Everything drawn is read from
// js/core/clears.js (rule 4).

import { dust, pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha, sig3 } from './util.js';
import { thrower, ballAt } from './figures.js';
import { skyscape, grass, softShadow, fitSide, env, rng } from './scenery.js';
import { farField, nearGrass, parkTree } from './towards.js';
import { kaLine } from '../core/clears.js';
import { T, num } from '../notation.js';

const HUD = 250, HUD_H = 290;
const lerp = (a, b, s) => ({ x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s });

/**
 * A brick wall standing on the ground at Y, its near end centred on x with
 * its top at `top` and its end face `wPx` wide; it runs away from the viewer
 * towards the vanishing point `vp` ({ x, y }, on the horizon) for a fraction
 * `depth` of the way there. Brick courses in stretcher bond on the long face
 * (foreshortened), header bricks on the end, a stone coping along the top,
 * lit from the left. Without `vp` it is drawn end on.
 */
export function brickWall(g, x, top, Y, wPx, P, { vp = null, depth = 0.45, seed = 5 } = {}) {
  const E = env(), r = rng(seed), H0 = Y - top;
  const brick = E.night ? ['#7a4234', '#6c3a2e', '#83493a', '#5f3329'] : ['#94452f', '#863d29', '#a0503a', '#7a3826'];
  const mortar = E.night ? '#4a3c38' : '#a8998c';
  // the coping stone is the wall's top: the bricks stop under it
  const cope = clamp(H0 * 0.08, 4, 8), H = H0 - cope;
  top += cope;
  const course = clamp(H / Math.max(3, Math.round(H / 7)), 4, 9);
  const nc = Math.max(1, Math.round(H / course)), ch = H / nc;
  const L0 = x - wPx / 2, R0 = x + wPx / 2;
  g.save();
  softShadow(g, x - (vp ? 10 : 0), Y + 1, wPx * 1.6 + 18, 6, 0.9);
  // ── the long face, running back towards the vanishing point
  // the side face runs back about as far as the wall is tall, so a short
  // wall on a long throw stays a wall and never reads as a ramp
  if (vp) depth = Math.min(depth, (H0 * 1.1) / Math.max(1, Math.hypot(vp.x - x, vp.y - Y)));
  if (vp && depth > 0.03) {
    const nT = { x: L0, y: top }, nB = { x: L0, y: Y };
    const fT = lerp(nT, vp, depth), fB = lerp(nB, vp, depth);
    g.fillStyle = mortar; g.beginPath(); g.moveTo(nT.x, nT.y); g.lineTo(nB.x, nB.y); g.lineTo(fB.x, fB.y); g.lineTo(fT.x, fT.y); g.closePath(); g.fill();
    // bricks: equal lengths in depth, foreshortened on screen (d = z / (z + z0))
    const near = Math.hypot(vp.x - nB.x, vp.y - nB.y), z0 = 1, zF = depth / (1 - depth);
    const dz = (ch * 2.3 / near) * z0;
    for (let i = 0; i < nc; i++) {
      const y0 = Y - (i + 1) * ch, y1 = Y - i * ch;
      for (let z = -(i % 2) * dz / 2; z < zF; z += dz) {
        const za = Math.max(0, z), zb = Math.min(zF, z + dz);
        if (zb <= za) continue;
        const da = za / (za + z0), db = zb / (zb + z0);
        const a0 = lerp({ x: L0, y: y0 }, vp, da), a1 = lerp({ x: L0, y: y1 }, vp, da);
        const b0 = lerp({ x: L0, y: y0 }, vp, db), b1 = lerp({ x: L0, y: y1 }, vp, db);
        const gap = Math.max(0.5, 1.2 * (1 - da));
        g.fillStyle = brick[Math.floor(r() * brick.length)];
        g.beginPath(); g.moveTo(a0.x - gap * 0.3, a0.y + gap * 0.5); g.lineTo(a1.x - gap * 0.3, a1.y - gap * 0.5); g.lineTo(b1.x + gap * 0.3, b1.y - gap * 0.5); g.lineTo(b0.x + gap * 0.3, b0.y + gap * 0.5); g.closePath(); g.fill();
      }
    }
    // the light from the left, fading into the distance
    const lg = g.createLinearGradient(nB.x, 0, fB.x, 0);
    lg.addColorStop(0, 'rgba(255,240,225,0.10)'); lg.addColorStop(1, withAlpha(E.haze, 0.45));
    g.fillStyle = lg; g.beginPath(); g.moveTo(nT.x, nT.y); g.lineTo(nB.x, nB.y); g.lineTo(fB.x, fB.y); g.lineTo(fT.x, fT.y); g.closePath(); g.fill();
    // the coping along the top: a pale stone band, its edge catching the light
    const cT = { x: L0, y: top - cope }, fCT = lerp(cT, vp, depth);
    g.fillStyle = E.night ? '#8d8186' : '#d8cfc6'; g.beginPath(); g.moveTo(cT.x - 2, cT.y); g.lineTo(nT.x - 2, nT.y); g.lineTo(fT.x, fT.y); g.lineTo(fCT.x, fCT.y); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#ffffff', E.night ? 0.25 : 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(cT.x - 2, cT.y + 0.5); g.lineTo(fCT.x, fCT.y + 0.5); g.stroke();
    g.strokeStyle = withAlpha('#000000', 0.25); g.beginPath(); g.moveTo(nT.x - 2, nT.y + 0.5); g.lineTo(fT.x, fT.y + 0.5); g.stroke();
  }
  // ── the near end: header bricks, darker (it faces us, away from the light)
  g.fillStyle = mortar; g.fillRect(L0, top, wPx, H);
  for (let i = 0; i < nc; i++) {
    const y0 = Y - (i + 1) * ch, off = i % 2 ? wPx / 2 : 0;
    for (let bx = L0 - off; bx < R0; bx += wPx) {
      const a = Math.max(L0, bx) + 0.6, b = Math.min(R0, bx + wPx) - 0.6;
      if (b <= a) continue;
      g.fillStyle = brick[Math.floor(r() * brick.length)]; g.fillRect(a, y0 + 0.6, b - a, ch - 1.2);
    }
  }
  const sh = g.createLinearGradient(L0, 0, R0, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.05)'); sh.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = sh; g.fillRect(L0, top, wPx, H);
  // the coping stone on the end, overhanging a little each side
  const cg = g.createLinearGradient(0, top - cope, 0, top);
  cg.addColorStop(0, E.night ? '#a69aa0' : '#eee6de'); cg.addColorStop(1, E.night ? '#776c71' : '#bdb1a7');
  g.fillStyle = cg; g.beginPath(); g.roundRect(L0 - 2.5, top - cope, wPx + 5, cope, 1.5); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; g.strokeRect(L0 - 2.5, top - cope, wPx + 5, cope);
  g.restore();
  return cope;
}

/** A dimension line from (x0, y0) to (x1, y1) with end ticks, and its label. */
function dim(g, L, P, x0, y0, x1, y1, text, { align = 'center', dx = 0, dy = 0, pri = 7, maxPush } = {}) {
  const vert = Math.abs(x1 - x0) < 1;
  stroke(g, [{ x: x0, y: y0 }, { x: x1, y: y1 }], { color: P.ink, width: 1.3, alpha: 0.85 });
  for (const [x, y] of [[x0, y0], [x1, y1]]) stroke(g, vert ? [{ x: x - 5, y }, { x: x + 5, y }] : [{ x, y: y - 5 }, { x, y: y + 5 }], { color: P.ink, width: 1.3, alpha: 0.85 });
  L.add(text, (x0 + x1) / 2 + dx, (y0 + y1) / 2 + dy, { color: P.ink, align, pri, size: 14, weight: 700, push: 'down', maxPush });
}

/** A magnified view of O in a round inset at (cx, cy), radius r: the
    thrower large enough to read, the first of the path leaving at θ with the
    angle marked, and a leader back to O itself at (X0, oy). */
function magnifiedO(g, cx, cy, r, P, { pose, aim, th, t, X0, oy }) {
  const E = env(), gy = cy + r * 0.42, H = r * 1.05, feet = cx - r * 0.42, O = { x: feet + H * 0.2, y: gy };
  // the leader from the rim to O, and O ringed
  const a = Math.atan2(oy - cy, X0 - cx);
  g.save(); g.strokeStyle = withAlpha(P.strong, 0.75); g.lineWidth = 1.3; g.setLineDash([4, 3]);
  g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(X0, oy); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.arc(X0, oy, 6, 0, Math.PI * 2); g.stroke(); g.restore();
  // the view itself
  g.save();
  g.shadowColor = E.shadow; g.shadowBlur = 10; g.shadowOffsetY = 3;
  g.fillStyle = E.skyBottom; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.shadowColor = 'transparent';
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  skyscape(g, cx - r, cy - r, cx + r, gy, { seed: 3, clouds: 1, sun: false, far: 'trees', farHeight: r * 0.25 });
  grass(g, cx - r, cx + r, gy, cy + r, { seed: 8 });
  // the path leaving O at θ: faint ahead, strong once thrown
  const L = r * 1.6, ex = O.x + Math.cos(th) * L, ey = O.y - Math.sin(th) * L;
  stroke(g, [O, { x: ex, y: ey }], { color: P.vel, width: 2, alpha: 0.4 });
  if (t > 0) stroke(g, [O, { x: O.x + (ex - O.x) * Math.min(1, pose), y: O.y + (ey - O.y) * Math.min(1, pose) }], { color: P.vel, width: 3 });
  g.strokeStyle = P.strong; g.lineWidth = 1.6; g.beginPath(); g.arc(O.x, O.y, r * 0.42, -th, 0); g.stroke();
  thrower(g, feet, gy, H, P, { dir: 1, pose, aim });
  g.restore();
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.restore();
}

/** Keep labels off a drawn line: a small box reserved round every few px of it. */
function keepOff(L, pts, pad = 7) {
  let last = null;
  for (const p of pts) {
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < pad * 1.4) continue;
    L.reserve({ x: p.x - pad, y: p.y - pad, w: pad * 2, h: pad * 2 }); last = p;
  }
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'clears') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const phone = w < 520;
  const a = f.a, xLand = f.R * a, W = f.wall;

  // ── the frame, fitted to the flight; one scale both ways
  const back = 22;
  // beside the readouts, or (on a laptop) under them across the whole width: whichever is larger
  const box = { xLo: 0, xHi: xLand, yLo: 0, yHi: Math.max(f.Hmax, W.H) }, bottom = h - 74, right = w - (phone ? 24 : 40);
  const fits = (phone ? [{ left: 16 + back, right, top: 104, bottom }]
    : [{ left: HUD + 30 + back, right, top: 84, bottom }, { left: 30 + back, right, top: Math.min(HUD_H, bottom - 120), bottom }])
    .map((area) => fitSide(box, area, { sky: phone ? 0.85 : 0.5 }));
  const fit = fits.reduce((p, q) => (q.k > p.k * 1.15 ? q : p));
  const { k, X, Y } = fit, oy = fit.oy;
  // the thrower TO SCALE (a person about 1.7 m tall): beside a wall of tens of
  // metres that is a speck, so a magnified view of O shows who throws and the angle
  const fig = Math.min(100, 1.7 * k), inset = fig < 40;

  // ── the place: sky, a field running back to a tree line, trees at its edge
  const horizon = oy - clamp(oy * 0.3, 24, 110);
  skyscape(g, 0, 0, w, horizon, { far: 'trees', seed: 17, farHeight: Math.min(50, horizon * 0.22) });
  farField(g, 0, w, horizon, oy);
  // trees about 14 m tall, standing back in the field, so smaller with distance
  for (const [x, s, sd] of [[X(0) - back - 60, 0.45, 4], [X(xLand) + 50, 0.3, 6], [X(0) - back - 150, 0.2, 9]]) {
    const d = 1 - s * 0.5, size = clamp(14 * k, 14, 150) * (1 - d * 0.75);
    parkTree(g, x, horizon + (oy - horizon) * s * 0.5, size, sd);
  }
  grass(g, 0, w, oy, h, { seed: 14 });
  nearGrass(g, 0, w, oy, h, 31);

  // ── the wall, running back from the motion's plane
  const wPx = clamp(k * 0.45, 12, 22), vp = { x: X(0) + (X(W.x) - X(0)) * 0.25, y: Math.max(horizon, Y(W.H) - 14) };   // eye level near the wall's top: its coping runs back near level
  brickWall(g, X(W.x), Y(W.H), oy, wPx, P, { vp, depth: 0.5 });
  L.reserve({ x: X(W.x) - wPx / 2 - 3, y: Y(W.H), w: wPx + 6, h: oy - Y(W.H) });

  // ── the thrower at O, winding up and letting go on the engine's clock
  const pose = clamp(t / Math.max(1e-6, f.tMax * 0.08), 0, 1), aim = f.params.theta;
  if (fig >= 40) {
    thrower(g, X(0) - fig * 0.2, oy, fig, P, { dir: 1, pose, aim });
    L.reserve({ x: X(0) - fig * 0.6, y: oy - fig * 1.05, w: fig * 0.7, h: fig * 1.05 });
  } else {
    // drawn at its true size (never under 4 px), scaled down whole
    const px = Math.max(4, fig), s = px / 40;
    g.save(); g.translate(X(0) - px * 0.2, oy); g.scale(s, s); thrower(g, 0, 0, 40, P, { dir: 1, pose, aim }); g.restore();
  }
  L.add('O', X(0) - 13, oy + 16, { color: P.ink, align: 'right', pri: 8, size: 15, weight: 700 });
  // ── the lengths, in the letter and in metres
  // in the paper's letter (a, or d for a launch given by its flight time)
  const inLetter = (c) => (f.letter ? kaLine(c).replace(/a/g, f.letter) : kaLine(c));
  const both = (c, m) => T`${inLetter(c)} = ${sig3(m)} [m]`;
  const dy = oy + 40;
  // the two lengths along the ground: placed first and held under their own ruler
  dim(g, L, P, X(0), dy, X(W.x), dy, both(f.P, W.x), { dy: 18, pri: 10, maxPush: 20 });
  dim(g, L, P, X(W.x), dy, X(xLand), dy, both(f.R - f.P, xLand - W.x), { dy: 18, pri: 10, maxPush: 20 });
  keepOff(L, [{ x: X(0), y: dy }, { x: X(xLand), y: dy }].flatMap((p, i, a) => i ? Array.from({ length: 24 }, (_, j) => ({ x: a[0].x + (p.x - a[0].x) * (j + 1) / 24, y: dy })) : [p]), 5);
  // the wall's height down its far side, clear of the rising path
  const hx = X(W.x) + wPx / 2 + 12;
  dim(g, L, P, hx, oy, hx, Y(W.H), f.heightMetres ? T`${sig3(W.H)} [m]` : both(f.Q, W.H), { align: 'left', dx: 14, pri: 8 });
  keepOff(L, [{ x: hx, y: oy - 8 }, { x: hx, y: (oy + Y(W.H)) / 2 }, { x: hx, y: Y(W.H) }], 5);

  // ── the path: all of it faintly, flown strongly; the top ringed
  const n = 160, pts = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pts.push({ t: tt, x: X(f.pos(tt).x), y: Y(f.pos(tt).y) }); }
  stroke(g, pts, { color: P.vel, width: 1.8, alpha: 0.35 }); keepOff(L, pts);
  stroke(g, pts.filter((p) => p.t <= t).concat(t > 0 ? [{ x: X(f.pos(t).x), y: Y(f.pos(t).y) }] : []), { color: P.vel, width: 3 });
  if (t >= f.tWall - 1e-9) {
    const { age, life } = ageOf(t, f.tWall, f.tMax);
    pulse(g, X(W.x), Y(W.H), age, life, P.mark, { radius: 26 });
    dot(g, X(W.x), Y(W.H), 7, { stroke: P.mark, width: 2.4 });
    L.add('just clears', X(W.x) - 16, Y(W.H) - 28, { color: P.mark, align: 'right', pri: 8, size: 14, weight: 700 });
  }
  if (show.apex !== false && t >= f.tApex - 1e-9) {
    const ax = X(f.pos(f.tApex).x), ay = Y(f.Hmax);
    dot(g, ax, ay, 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H = ${sig3(f.Hmax)} [m]`, ax, ay - 20, { color: P.disp, align: 'center', pri: 7, size: 14, weight: 700 });
  }

  // ── the angle at O; with the thrower a speck, in a magnified view of O as well
  const th = f.params.theta * Math.PI / 180, Ra = clamp(k * 6, 30, 46), thLabel = T`theta = ${num(f.params.theta, 1)}°`;
  g.save(); g.strokeStyle = P.strong; g.lineWidth = 1.6; g.beginPath(); g.arc(X(0), oy, Ra, -th, 0); g.stroke(); g.restore();
  if (inset) {
    const r = phone ? 46 : 54;
    const hud = phone ? { x: 0, y: 0, w: w * 0.6, h: 80 } : { x: 0, y: 0, w: HUD, h: HUD_H };
    const wallBox = { x: X(W.x) - wPx, y: Y(W.H) - 30, w: wPx * 2 + 120, h: oy - Y(W.H) + 30 };
    const clearsBox = { x: X(W.x) - 120, y: Y(W.H) - 46, w: 120, h: 34 };          // where "just clears" goes
    const clear = (c) => c.x - r > 4 && c.x + r < w - 4 && c.y - r > 4
      && !pts.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < r + 12)
      && ![hud, wallBox, clearsBox].some((b) => c.x + r > b.x && c.x - r < b.x + b.w && c.y + r > b.y && c.y - r < b.y + b.h);
    const cx0 = clamp(X(0) + r * 0.1, r + 6, w - r - 6);
    const cands = [{ x: cx0, y: oy - r - 44 }, { x: cx0, y: oy - 2 * r - 70 }, { x: Math.max(r + 8, X(0) - r - 34), y: oy - r - 20 }, { x: cx0, y: oy - 2 * r - 130 }, { x: cx0 + r, y: oy - 2 * r - 130 }];
    const c = cands.find(clear) ?? cands[0];
    magnifiedO(g, c.x, c.y, r, P, { pose, aim, th, t, X0: X(0), oy });
    L.reserve({ x: c.x - r - 3, y: c.y - r - 3, w: 2 * r + 6, h: 2 * r + 6 });
    L.add(thLabel, c.x + r + 8, c.y + r * 0.2, { color: P.strong, align: 'left', pri: 7, size: 14, weight: 700 });
    const capUp = c.y - r - 26 > hud.y + hud.h || c.x - 70 > hud.x + hud.w;
    L.add('the thrower, enlarged', c.x, capUp ? c.y - r - 13 : c.y + r + 13, { color: P.muted, align: 'center', pri: 6, size: 13, maxPush: 20 });
  } else {
    // in the angle's opening when there is room before the wall, else just under the ground there
    const roomy = X(W.x) - X(0) > Ra + 110;
    L.add(thLabel, X(0) + Ra + 8, roomy ? oy - 12 : oy + 13, { color: P.strong, align: 'left', pri: 7, size: 14, weight: 700 });
  }

  // ── the landing
  { const { age, life } = ageOf(t, f.tMax, f.tMax); if (t >= f.tMax - 1e-9) dust(g, X(xLand), oy, age, life, { size: 0.9 }); }

  // ── the ball, its shadow, its velocity and its acceleration
  const q = f.pos(t), v = f.vel(t), bx = X(q.x), by = Y(q.y), R = phone ? 7 : 8;
  const hgt = oy - by;
  softShadow(g, bx, oy + 1, R * clamp(1.4 - hgt / 300, 0.6, 1.4), R * 0.35, clamp(1 - hgt / 260, 0.25, 0.8));
  const vl = clamp(w * 0.08, 46, 100) / f.params.u;
  if (show.velocity !== false && t < f.tMax) {
    const ex = bx + v.x * vl, ey = by - v.y * vl;
    if (show.components) {
      arrow(g, bx, by, ex, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      if (Math.abs(v.y) * vl > 4) arrow(g, ex, by, ex, ey, { color: P.velVec, width: 2, head: 9 });
      keepOff(L, [{ x: bx, y: by }, { x: (bx + ex) / 2, y: by }, { x: ex, y: by }, { x: ex, y: (by + ey) / 2 }, { x: ex, y: ey }], 6);
    }
    arrow(g, bx, by, ex, ey, { color: P.velVec, width: 3, head: 12 });
    keepOff(L, [{ x: bx, y: by }, { x: (bx + ex) / 2, y: (by + ey) / 2 }, { x: ex, y: ey }], 8);
    L.add(T`${sig3(Math.hypot(v.x, v.y))} [m s^-1]`, ex + 12, ey, { color: P.vel, align: 'left', pri: 6, size: 14, weight: 700 });
  }
  if (show.acceleration && t < f.tMax) { arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 }); keepOff(L, [{ x: bx, y: by + 20 }, { x: bx, y: by + 40 }], 7); }
  ballAt(g, bx, by, R);
  L.reserve({ x: bx - R - 4, y: by - R - 4, w: 2 * R + 8, h: 2 * R + 8 });

  // the readouts: top-left (and on a laptop the top-right clock)
  if (!phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H }); L.reserve({ x: w - 150, y: 0, w: 150, h: 60 }); }
  else L.reserve({ x: 0, y: 0, w: w * 0.6, h: 80 });
  L.draw(g, w, h);
  return null;
}
