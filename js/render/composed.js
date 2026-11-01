// composed.js — the stage for a scene Ask Suvat composed from the app's own
// pieces (js/compose/): a backdrop, the figures that move in it, and what
// happens when they land.
//
// NOTHING HERE IS NEW ART. The cliff and the sea, the tower among fields, the
// bridge over its river, the house, the orchard's tree, the hall, the road
// and the rails are the library's own scenery (heights.js, target.js,
// apples.js, scenery.js); the car, the lorry, the runner and the thrower are
// figures.js; the splash, the dust, the ring and the flash are effects.js.
// This file only lays them out — side on, at ONE scale both ways, so a 40 m
// cliff is drawn 40 m tall beside a 43 m flight — and plays them on the
// engine's own times.
//
// A thing that is thrown (a ball, a stone) leaves a thrower's hand at the
// edge. A thing that moves by itself (a car, a cyclist) is the moving thing:
// drawn round the engine's point, turned to the way it is moving, its wheels
// turning with the distance it covers. It is drawn at least big enough to
// read; the motion, the heights and the distances are to scale.
//
// The teaching layer is the library's: the path (all of it faint, the part
// flown strong), velocity on the moving thing with its components across
// dashed and up solid (rule 2), the acceleration, the height and the landing
// distance as dimension lines (three significant figures), labels never
// under 13 px (rule 3).
//
// Everything that moves is read from the engine's answer (rule 4).

import { BACKDROPS, FIGURES as PIECES } from '../compose/registry.js';
import { dust, pulse, flash, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, sig3 } from './util.js';
import { thrower, THROWER_MIN, ballAt, drawFigure, phaseFor, particle, fence } from './figures.js';
import { seaScene, riverScene, fields, curtainWall, tree, seaCliff, tower, bridge, bigSplash, pebble, fitClear } from './heights.js';
import { house } from './target.js';
import { appleTree, apple } from './apples.js';
import { grass, tarmac, railBed, floorboards, interior, water, skyscape, softShadow } from './scenery.js';
import { T } from '../notation.js';

const HUD = 250, HUD_H = 290;
const trimmed = (s) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);
/** Half a figure's drawn height, as a fraction of its drawn length L — so it
    is drawn round the engine's point, not standing on it. */
const MIDDLE = { car: 0.16, lorry: 0.2, train: 0.11, cyclist: 0.45, motorcycle: 0.3, runner: 0.5 };
const WET = new Set(['sea', 'river']);

/* ── the stage ───────────────────────────────────────────────────────── */
export function render(canvas, cam, o) {
  const { traj: f, recipe: R } = o;
  if (!f || !R) return null;
  if (R.engine === 'projectile') return launch(canvas, o);
  return null;
}

/** A launch from a place, side on: the projectile engine (js/core/height.js). */
function launch(canvas, o) {
  const { traj: f, t: tRaw, show = {}, fired = true, recipe: R } = o;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const B = BACKDROPS[R.backdrop], kind = R.objects[0].figure, piece = PIECES[kind];
  const H0 = f.params.h, phone = w < 520, wet = WET.has(B.below);
  const thrown = !!piece.thrown && R.backdrop !== 'orchard';
  const apex = f.uy > 0 ? f.apexHeight : H0;

  // ── the whole path, sampled from the engine
  const n = 160, pts = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pts.push({ t: tt, ...f.pos(tt) }); }
  const xMax = Math.max(0, ...pts.map((p) => p.x));
  const yTop = Math.max(apex, H0);

  // ── how big the moving thing is drawn: to scale, but never too small to read
  const size = (k) => Math.min(Math.max(piece.min, piece.m * k), Math.max(piece.min, w * 0.22));
  const TH = (k) => Math.max(phone ? THROWER_MIN * 0.8 : THROWER_MIN, Math.min(96, 1.75 * k));
  // a house to scale: three-metre storeys, a frontage a little wider than it is tall
  const houseW = (k) => clamp(Math.max(8, H0 * 1.1) * k, 90, Math.max(90, w * 0.34));

  // ── the frame: the motion and the room its pieces need, at one scale
  const pads = (k) => {
    const body = thrown ? TH(k) : size(k);
    const place = R.backdrop === 'house' ? houseW(k) : R.backdrop === 'orchard' ? 2.4 * k : 0;
    const head = (thrown ? TH(k) : size(k) * 0.6) + 16 - (yTop - H0) * k;
    return { l: Math.max(body * 0.9, place) + 80, r: 70 + (thrown ? 22 : size(k) * 0.55), t: Math.max(R.backdrop === 'bridge' ? 80 : 36, head) };
  };
  const clear = (fs, p) => {
    const inHud = (x, y) => x < HUD + 8 && y < HUD_H + 8;
    if (pts.some((q) => inHud(fs.X(q.x) + 8, fs.Y(q.y)))) return false;
    return !inHud(fs.X(0) - p.l + 20, (fs.Y(0) + fs.Y(H0)) / 2) && !inHud(fs.X(0), fs.Y(yTop) - p.t + 10);
  };
  let F = null;
  for (let it = 0, k = 4; it < 4; it++) {
    const p = pads(k), box = { xLo: -p.l / k, xHi: xMax + p.r / k, yLo: 0, yHi: yTop + p.t / k };
    F = fitClear(box, w, h, phone, phone ? 0.5 : 0.35, (fs) => clear(fs, p));
    if (!F) return null;
    k = F.k;
  }
  const { k, X, Y } = F, oy = Y(0), x0 = X(0), top = Y(H0);
  const phase = t * 1.3;

  // ── the backdrop, and the place it is launched from
  const horizon = (q) => oy - clamp((oy - 40) * q, 26, 110);
  const ledge = () => { if (H0 > 0) curtainWall(g, -4, x0 + 2, top, oy); };
  switch (R.backdrop) {
    case 'cliff': seaScene(g, w, h, horizon(0.2), phase); seaCliff(g, -4, x0, top, oy, { phase }); break;
    case 'bridge': riverScene(g, w, h, horizon(0.16), phase); bridge(g, -4, x0, top, oy); break;
    case 'tower': {
      fields(g, w, horizon(0.25), oy); grass(g, 0, w, oy, h);
      const tw = clamp(H0 * 0.22 * k, 34, 80);
      curtainWall(g, -4, x0 - tw + 2, oy - clamp((oy - top) * 0.28, 30, 110), oy);
      for (const [dx, s] of [[60, 1], [104, 0.75], [150, 0.9], [-tw - 26, 0.8]]) if (x0 + dx < w - 10 && x0 + dx > 0) tree(g, x0 + dx, oy, clamp((oy - top) * 0.16, 26, 60) * s);
      tower(g, x0, top, oy, tw);
      break;
    }
    case 'house': {
      fields(g, w, horizon(0.25), oy); grass(g, 0, w, oy, h);
      fence(g, x0 + 30, w + 4, oy - 2, clamp(1.2 * k, 16, 34));
      house(g, x0, top, oy, houseW(k), 'roof', P, { storey: Math.max(20, 3 * k) });
      break;
    }
    case 'orchard': {
      fields(g, w, horizon(0.25), oy); grass(g, 0, w, oy, h);
      for (const [dx, s] of [[-2.6 * k - 40, 0.8], [xMax * k + 90, 0.9]]) if (x0 + dx > 0 && x0 + dx < w) tree(g, x0 + dx, oy, clamp(H0 * k * 0.9, 40, 140) * s);
      // the tree it falls from, its crown round the branch it hangs from
      if (H0 > 0) appleTree(g, (x) => X(x - 1.2), Y, k, [1.2, 1.2], [H0, H0], 11);
      break;
    }
    case 'sea': seaScene(g, w, h, horizon(0.2), phase); ledge(); break;
    case 'road': fields(g, w, horizon(0.25), oy); tarmac(g, 0, w, oy, { depth: clamp(0.6 * k, 12, 24), verge: h - oy }); ledge(); break;
    case 'rails': fields(g, w, horizon(0.25), oy); grass(g, 0, w, oy + 18, h); railBed(g, 0, w, oy); ledge(); break;
    case 'hall': interior(g, 0, 0, w, oy); floorboards(g, 0, w, oy, h); ledge(); break;
    default: fields(g, w, horizon(0.25), oy); grass(g, 0, w, oy, h); ledge();
  }

  // ── who throws it: at the edge, wound up before the throw, through after it
  const v0 = f.vel(0), aim = (Math.atan2(v0.y, v0.x) * 180) / Math.PI;
  const th = TH(k), feet = x0 - th * (f.vertical ? 0.5 : 0.2);
  if (thrown) {
    const pose = fired ? clamp(0.55 + t / Math.max(1e-6, 0.08 * f.tMax), 0, 1) : 0;
    thrower(g, feet, top, th, P, { dir: 1, pose, aim });
  }

  // ── the height it starts at, as a dimension line beside the place
  if (H0 > 0) {
    const dx = (thrown ? feet - th * 0.3 : x0 - size(k) * 0.65) - 14;
    stroke(g, [{ x: dx, y: oy }, { x: dx, y: top }], { color: P.ink, width: 1.4, alpha: 0.9 });
    for (const yy of [oy, top]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.4, alpha: 0.9 });
    L.add(T`${trimmed(sig3(H0))} [m]`, dx - 8, (oy + top) / 2, { color: P.ink, align: 'right', pri: 7, size: 15, weight: 700 });
  }

  // keep labels off the path and out from under the readouts
  for (let i = 0; i < pts.length; i += 4) L.reserve({ x: X(pts[i].x) - 5, y: Y(pts[i].y) - 5, w: 10, h: 10 });
  if (!phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H - 40 }); L.reserve({ x: w - 130, y: 0, w: 130, h: 56 }); }

  // ── a height a part asks about: a marker line across, ringed where crossed
  const lv = f.level;
  if (lv) {
    const ly = Y(lv.L), xr = Math.min(w - 10, X(xMax) + 40);
    stroke(g, [{ x: x0 - 10, y: ly }, { x: xr, y: ly }], { color: P.mark, width: 1.6, alpha: 0.9 });
    L.add(Math.abs(lv.rel) < 1e-12 ? 'the height it started at' : T`${sig3(Math.abs(lv.rel))} [m] ${lv.rel >= 0 ? '"above"' : '"below"'} "the start"`, xr, ly - 14, { color: P.mark, align: 'right', pri: 6, size: 13, weight: 700 });
    for (const tc of lv.times) {
      if (t < tc - 1e-9) continue;
      const q = f.pos(tc);
      dot(g, X(q.x), Y(q.y), 7, { stroke: P.mark, width: 2.4 });
      L.add(T`t = ${sig3(tc)} [s]`, X(q.x) + 12, Y(q.y) - 16, { color: P.mark, align: 'left', pri: 8, size: 14, weight: 700 });
    }
  }

  // ── the path: all of it faintly, the part flown strongly
  const at = (p) => ({ x: X(p.x), y: Y(p.y) });
  stroke(g, pts.map(at), { color: P.vel, width: 1.8, alpha: 0.35 });
  stroke(g, pts.filter((p) => p.t <= t).map(at), { color: P.vel, width: 3 });

  if (show.apex && f.uy > 0) {
    const q = at(f.pos(f.tApex));
    dot(g, q.x, q.y, 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H_max = ${sig3(apex)} [m]`, q.x + 12, q.y - 14, { color: P.disp, align: 'left', pri: 6, size: 14, weight: 700 });
  }

  // ── where it lands, once it has: the recipe's effect, at the engine's time
  const landed = t >= f.tMax - 1e-9;
  const end = f.pos(f.tMax), lx = X(end.x);
  const { age, life } = ageOf(t, f.tMax, f.tMax, Math.max(0.35, f.tMax / 6));
  if (landed) {
    for (const e of R.effects) {
      if (e === 'splash' && wet) bigSplash(g, lx, oy, age, life, clamp(k / 5, phone ? 1 : 1.5, phone ? 1.5 : 2.6) * (thrown ? 1 : 1.4));
      else if (e === 'dust' && !wet) dust(g, lx, oy, age, life, { size: thrown ? 1.6 : 2.4, n: 22 });
      else if (e === 'ring') pulse(g, lx, oy, age, life, P.mark);
      else if (e === 'flash') flash(g, lx, oy - 6, age, life);
    }
    if (!f.vertical) {
      const ry = oy + 24;
      stroke(g, [{ x: x0, y: ry }, { x: lx, y: ry }], { color: P.ink, width: 1.4, alpha: 0.9 });
      for (const xx of [x0, lx]) stroke(g, [{ x: xx, y: ry - 5 }, { x: xx, y: ry + 5 }], { color: P.ink, width: 1.4, alpha: 0.9 });
      L.add(T`${sig3(end.x)} [m]`, Math.min((x0 + lx) / 2, lx - 40), ry + 15, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700, maxPush: 20 });
    }
  }

  // ── the moving thing, at the engine's point
  const r = f.pos(t), v = f.vel(t), bx = X(r.x), by = Y(r.y);
  if (thrown) {
    const R0 = clamp(k * piece.m * 0.5, 5.5, 9);
    const gone = landed && wet && age > life * 0.2;
    if (!gone) {
      if (kind === 'ball') ballAt(g, bx, by, R0);
      else if (kind === 'particle') particle(g, bx, by, R0 * 2, P);
      else pebble(g, bx, by, R0);
    }
  } else if (R.backdrop === 'orchard' && kind !== 'particle') {
    apple(g, bx, by, clamp(k * 0.05, 6, 10));
  } else {
    const Lp = size(k), mid = (MIDDLE[kind] ?? 0.2) * Lp;
    // turned to the way it is moving; on the ground before the launch
    const ang = Math.atan2(-v.y, v.x) * (r.y > 1e-6 || t > 0 ? 1 : 0);
    const turns = phaseFor(kind, Lp, Math.abs(bx - x0) + (fired ? t * 40 : 0));
    if (!(fired && t > 0) && H0 > 0) softShadow(g, bx - Lp * 0.5, top + 1, Lp * 0.55, 4, 0.8);
    g.save();
    // in the water, only what is above the surface shows
    if (landed && wet) { g.beginPath(); g.rect(0, 0, w, oy + 2); g.clip(); }
    g.translate(bx, by); g.rotate(ang);
    drawFigure(g, kind, Lp / 2, mid, Lp, P, { dir: 1, phase: turns, brake: false });
    g.restore();
    if (landed && wet) water(g, lx - Lp * 0.7, lx + Lp * 0.7, oy, oy + 3, { phase });
  }

  // ── its velocity and its acceleration, on it
  const pv = pts.map((p) => f.vel(p.t));
  const vMax = Math.max(...pv.map((q) => Math.hypot(q.x, q.y)), 1e-6);
  const room = (c, dv, lo, hi) => (dv > 0 ? (hi - c) / dv : dv < 0 ? (lo - c) / dv : Infinity);
  let vl = clamp(w * 0.08, 46, 100) / vMax;
  pts.forEach((p, i) => { const q = pv[i]; vl = Math.min(vl, room(X(p.x), q.x, 12, w - 12) * 0.9, room(Y(p.y), -q.y, 12, h - 8) * 0.9); });
  const sp = Math.hypot(v.x, v.y);
  if (show.velocity !== false && sp > 1e-6 && !(landed && wet)) {
    const tx = bx + v.x * vl, ty = by - v.y * vl;
    if (show.components && Math.abs(v.x) > 1e-9) {
      arrow(g, bx, by, tx, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, tx, by, tx, ty, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, bx, by, tx, ty, { color: P.velVec, width: 3, head: 12 });
    for (let u = 0, m = Math.ceil(Math.hypot(tx - bx, ty - by) / 10); u <= m; u++) L.reserve({ x: bx + (tx - bx) * u / m - 6, y: by + (ty - by) * u / m - 6, w: 12, h: 12 });
    const near = tx > w - 120, sy = Math.sign(ty - by) || 1;
    L.add(T`${sig3(sp)} [m s^-1]`, near ? tx - 10 : tx + 12, near ? ty + sy * 20 : ty, { color: P.vel, align: near ? 'right' : 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });

  // ── what it lands on, named on it
  const name = { sea: 'the sea', river: 'the river', road: 'the road', rails: 'the track', floor: 'the floor' }[B.below] || 'the ground';
  L.add(name, wet && H0 > 0 ? x0 - 12 : w - 14, wet && H0 > 0 ? oy + 20 : oy - 14, { color: P.ink, align: 'right', pri: 4, size: 13 });

  L.draw(g, w, h);
  return null;
}

/* ── the card's sketch ──────────────────────────────────────────────── */
/** A small picture of the recipe: the place, what is below, and the arc off it. */
export function thumb(R) {
  const B = BACKDROPS[R.backdrop] || BACKDROPS.ground;
  const below = WET.has(B.below) ? '#6f8796' : B.below === 'road' ? '#7d7477' : '#7f9a63';
  const place = B.edge ? '<path d="M0 22 L40 22 L36 54 L0 54 Z" fill="#8b8073" opacity="0.85"/>' : '';
  const y0 = B.edge ? 22 : 52;
  return `<svg viewBox="0 0 120 60" aria-hidden="true">
    <rect x="0" y="54" width="120" height="6" fill="${below}" opacity="0.6"/>${place}
    <path d="M40 ${y0} Q ${B.edge ? 70 : 64} ${B.edge ? 20 : 6} ${B.edge ? 98 : 96} 54" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
}
