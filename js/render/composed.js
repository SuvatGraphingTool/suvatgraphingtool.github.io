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
import { dust, pulse, flash, squash } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, sig3, withAlpha } from './util.js';
import { thrower, throwerHand, THROWER_MIN, ballAt, drawFigure, phaseFor, particle, fence } from './figures.js';
import { seaScene, riverScene, fields, curtainWall, tree, seaCliff, tower, bridge, bigSplash, pebble, fitClear } from './heights.js';
import { house } from './target.js';
import { appleTree, apple } from './apples.js';
import { grass, tarmac, railBed, floorboards, interior, water, stone, env, rng, softShadow } from './scenery.js';
import { T } from '../notation.js';

const HUD = 250, HUD_H = 290;
const trimmed = (s) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);
/** Half a figure's drawn height, as a fraction of its drawn length L — so it
    is drawn round the engine's point, not standing on it. */
const MIDDLE = { car: 0.16, lorry: 0.2, train: 0.11, cyclist: 0.45, motorcycle: 0.3, runner: 0.5 };
const WET = new Set(['sea', 'river']);

/* ── the landing, played out after the motion stops ───────────────────
   Playback stops at the moment it lands, so an effect timed only by the
   motion's clock would freeze on its first frame. The landing's effect runs
   on the wall clock from the moment the stage first draws it landed: the
   engine says WHEN (t = tMax), the clock only says how far through the splash
   is. The app keeps drawing while it plays (settling) and opens the ending
   card after it (SETTLE seconds). */
export const SETTLE = 1.4;
const clock = { at: null };
export const settling = () => clock.at != null && performance.now() - clock.at < SETTLE * 1000;

/* ── the stage ───────────────────────────────────────────────────────── */
export function render(canvas, cam, o) {
  const { traj: f, recipe: R } = o;
  if (!f || !R) return null;
  if (R.engine === 'projectile') return launch(canvas, o);
  if (R.engine === 'pair' || R.engine === 'bounce') return column(canvas, o);
  return null;
}

/** The backdrop and the place things start from, for either stage: the
    library's own scenery for the recipe's backdrop, its top at `top` (H0 m),
    its edge at x0, the ground or the water at oy. */
function scenery(g, R, { w, h, k, X, Y, oy, x0, top, H0, xMax, phase, houseW, byHand }) {
  const P = palette();
  const horizon = (q) => oy - clamp((oy - 40) * q, 26, 110);
  // the place it is launched from, where the backdrop has no edge of its own:
  // a stone wall to stand on, a jetty over the sea, or the ground itself
  const ledge = () => { if (H0 > 0 && !byHand) wall(g, -4, x0 + 2, top, oy, k); };
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
    case 'sea': seaScene(g, w, h, horizon(0.2), phase); jetty(g, -4, x0 + 2, H0 > 0 ? top : oy - 4, oy, h, k); break;
    case 'road': fields(g, w, horizon(0.25), oy); tarmac(g, 0, w, oy, { depth: clamp(0.6 * k, 12, 24), verge: h - oy }); ledge(); break;
    case 'rails': fields(g, w, horizon(0.25), oy); grass(g, 0, w, oy + 18, h); railBed(g, 0, w, oy); ledge(); break;
    case 'hall': interior(g, 0, 0, w, oy); floorboards(g, 0, w, oy, h); ledge(); break;
    default: fields(g, w, horizon(0.25), oy); grass(g, 0, w, oy, h); ledge();
  }
}

/** A launch from a place, side on: the projectile engine (js/core/height.js). */
function launch(canvas, o) {
  const { traj: f, t: tRaw, show = {}, fired = true, recipe: R } = o;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const B = BACKDROPS[R.backdrop], kind = R.objects[0].figure, piece = PIECES[kind];
  const H0 = f.params.h, phone = w < 520, wet = WET.has(B.below);
  // a person throws it, unless it falls from a tree; small things are drawn
  // as themselves at the point, vehicles and people round it
  const thrown = !!piece.thrown && R.backdrop !== 'orchard';
  const small = !!piece.thrown || !!piece.small;
  // thrown from low down with nothing to stand on: the thrower stands on the
  // ground or the floor and lets go at hand height
  const byHand = thrown && !B.edge && R.backdrop !== 'sea' && H0 > 0 && H0 <= 2.6;
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
    const place = R.backdrop === 'house' ? houseW(k) + 30 : R.backdrop === 'orchard' ? 2.4 * k : 0;
    const head = (thrown && !byHand ? TH(k) : size(k) * 0.6) + 16 - (yTop - H0) * k;
    // an orchard's crown stands well above the branch
    const crown = R.backdrop === 'orchard' ? 1.9 * k + 16 - (yTop - H0) * k : 0;
    return { l: Math.max(body * 0.9, place) + 80, r: 70 + (small ? 22 : size(k) * 0.55), t: Math.max(R.backdrop === 'bridge' ? 80 : 36, head, crown) };
  };
  // the readouts are cards over the stage: the path may pass behind them, but
  // the place's top and its height's label stay clear of them
  const clear = (fs, p) => {
    const inHud = (x, y) => x < HUD + 8 && y < HUD_H + 8;
    return !inHud(fs.X(0) - p.l + 20, (fs.Y(0) + fs.Y(H0)) / 2) && !inHud(fs.X(0), fs.Y(yTop) - p.t + 10);
  };
  let F = null;
  for (let it = 0, k = 4; it < 4; it++) {
    const p = pads(k), box = { xLo: -p.l / k, xHi: xMax + p.r / k, yLo: 0, yHi: yTop + p.t / k };
    // on a phone the readouts sit over the top of the stage: the sky takes the
    // spare height, and the place stands low, clear of them
    F = fitClear(box, w, h, phone, phone ? 0.85 : 0.35, (fs) => clear(fs, p));
    if (!F) return null;
    k = F.k;
  }
  const { k, X, Y } = F, oy = Y(0), x0 = X(0), top = Y(H0);
  const phase = t * 1.3;

  // ── the backdrop, and the place it is launched from
  scenery(g, R, { w, h, k, X, Y, oy, x0, top, H0, xMax, phase, houseW, byHand });

  // ── who throws it: at the edge, wound up before the throw, through after it
  const v0 = f.vel(0), aim = (Math.atan2(v0.y, v0.x) * 180) / Math.PI;
  let th = TH(k), feet = x0 - th * (f.vertical ? 0.5 : 0.2), stand = top;
  if (byHand) {
    // sized so the hand is at the launch point, feet on the floor
    const per = throwerHand(100, aim);
    th = clamp((oy - top) / (per.y / 100), THROWER_MIN * 0.8, 3 * k);
    feet = x0 - th * (per.x / 100); stand = oy;
  }
  if (thrown) {
    const pose = fired ? clamp(0.55 + t / Math.max(1e-6, 0.08 * f.tMax), 0, 1) : 0;
    thrower(g, feet, stand, th, P, { dir: 1, pose, aim });
  }

  // ── the height it starts at, as a dimension line beside the place
  if (H0 > 0) {
    // beside the place, never across it: outside the house's front, behind the thrower
    const dx = R.backdrop === 'house' ? x0 - houseW(k) - 16 : (thrown ? feet - th * 0.3 : x0 - size(k) * 0.65) - 14;
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
  if (!landed) clock.at = null;
  else if (clock.at == null) clock.at = performance.now();
  const life = SETTLE, age = landed ? Math.min(life * 0.999, (performance.now() - clock.at) / 1000) : -1;
  if (landed) {
    for (const e of R.effects) {
      // a car hitting the water at speed throws up a column, not a ripple
      if (e === 'splash' && wet) bigSplash(g, lx, oy, age, life, Math.max(clamp(k / 5, phone ? 1 : 1.5, phone ? 1.5 : 2.6), small ? 0 : size(k) / 26));
      else if (e === 'dust' && !wet) dust(g, lx, oy, age, life, { size: small ? 1.6 : Math.max(2.4, size(k) / 30), n: 22 });
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
  const Lp = small ? 0 : size(k);
  const aloft = fired && t > 0 && !landed;
  if (small) {
    const R0 = clamp(k * piece.m * 0.5, 5.5, 9);
    const gone = landed && wet && age > life * 0.2;
    if (aloft && !wet) softShadow(g, bx, oy + 1, R0 * 1.4, R0 * 0.35, clamp(1 - (oy - by) / (h * 0.7), 0.15, 0.8));
    if (!gone) {
      if (kind === 'apple') apple(g, bx, by, clamp(k * 0.05, 6, 10));
      else if (kind === 'ball') ballAt(g, bx, by, R0);
      else if (kind === 'particle') particle(g, bx, by, R0 * 2, P);
      else pebble(g, bx, by, R0);
    }
  } else {
    const mid = (MIDDLE[kind] ?? 0.2) * Lp;
    // pitched with the path, but only part of the way: a car off a cliff
    // noses down, it does not dive; on the ground before the launch
    const ang = 0.6 * Math.atan2(-v.y, v.x) * (r.y > 1e-6 || t > 0 ? 1 : 0);
    const turns = phaseFor(kind, Lp, Math.abs(bx - x0) + (fired ? t * 40 : 0));
    // in the air its shadow falls on what is below, fainter the higher it is
    if (aloft && !wet) softShadow(g, bx, oy + 1, Lp * 0.45, Math.max(2, Lp * 0.05), clamp(1 - (oy - by) / (h * 0.7), 0.15, 0.8));
    g.save();
    // in the water, only what is above the surface shows
    if (landed && wet) { g.beginPath(); g.rect(0, 0, w, oy + 2); g.clip(); }
    g.translate(bx, by); g.rotate(ang);
    drawFigure(g, kind, Lp / 2, mid, Lp, P, { dir: 1, phase: turns, brake: false, airborne: aloft || (landed && wet) });
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
  if (show.velocity !== false && sp > 1e-6) {
    // from a vehicle's nose, not buried in its door; on a halo, so it reads
    // over the art. The impact velocity stays drawn at the moment of impact.
    const ox = bx + (v.x / sp) * Lp * 0.5, oyv = by - (v.y / sp) * Lp * 0.5;
    const tx = ox + v.x * vl, ty = oyv - v.y * vl;
    const halo = withAlpha(P.card, 0.8);
    if (show.components && Math.abs(v.x) > 1e-9) {
      arrow(g, ox, oyv, tx, oyv, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, tx, oyv, tx, ty, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, ox, oyv, tx, ty, { color: halo, width: 7, head: 15 });
    arrow(g, ox, oyv, tx, ty, { color: P.velVec, width: 3, head: 12 });
    for (let u = 0, m = Math.ceil(Math.hypot(tx - ox, ty - oyv) / 10); u <= m; u++) L.reserve({ x: ox + (tx - ox) * u / m - 6, y: oyv + (ty - oyv) * u / m - 6, w: 12, h: 12 });
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

/** Motion on one vertical line beside a place, side on: two that meet (the
    pair engine, js/core/pair.js) or a ball that bounces (js/core/bounce.js).
    The place stands at x = 0, the line a little beyond its edge; heights are
    to scale. A meeting flashes, a bounce rings the ground and squashes the
    ball — each at the engine's own time. */
function column(canvas, o) {
  const { traj: f, t: tRaw, show = {}, fired = true, recipe: R } = o;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const B = BACKDROPS[R.backdrop], phone = w < 520, pair = R.engine === 'pair';
  // what moves, read off the engine: a height and an upward velocity at t
  const movers = pair
    ? ['A', 'B'].map((n, i) => ({ n, kind: R.objects[i].figure, at: (tt) => { const q = f.at(tt)[n]; return { y: q.x, v: q.v }; } }))
    : [{ n: '', kind: R.objects[0].figure, at: (tt) => { const q = f.at(tt); return { y: q.y, v: q.vUp }; } }];
  const starts = movers.map((m) => m.at(0).y);
  const H0 = Math.max(0, ...starts);               // the top of the place
  const n = 200, ys = [];
  for (let i = 0; i <= n; i++) for (const m of movers) ys.push(m.at((i / n) * f.tMax).y);
  const yTop = Math.max(H0, ...ys);
  const GAP = 1.2;                                  // the line, this far out from the edge (m)
  const byHand = !B.edge && H0 > 0 && H0 <= 2.6;
  const TH = (k) => Math.max(phone ? THROWER_MIN * 0.8 : THROWER_MIN, Math.min(96, 1.75 * k));
  const houseW = (k) => clamp(Math.max(8, H0 * 1.1) * k, 90, Math.max(90, w * 0.34));

  // ── the frame: the place, the line and room for its labels, at one scale
  let F = null;
  for (let it = 0, k = 6; it < 4; it++) {
    const left = (R.backdrop === 'house' ? houseW(k) + 40 : TH(k) + 90) / k;
    // at least five metres of height, so a drop from someone's hand is seen
    // in its room rather than filling the stage
    const box = { xLo: -left, xHi: GAP + 150 / k, yLo: 0, yHi: Math.max(5, yTop + (TH(k) + 24) / k) };
    F = fitClear(box, w, h, phone, phone ? 0.85 : 0.35, () => true);
    if (!F) return null;
    k = F.k;
  }
  const { k, X, Y } = F, oy = Y(0), x0 = X(0), top = Y(H0);
  const phase = t * 1.3, th = TH(k);
  // the line is just past the edge, where a hand held out over it lets go
  const lx = B.edge || H0 > 0 ? x0 + Math.max(10, th * 0.12) : X(GAP);
  scenery(g, R, { w, h, k, X, Y, oy, x0, top, H0, xMax: GAP, phase, houseW, byHand });

  // ── the people who let them go: on the edge for one that starts at the top,
  // on the ground below for one that starts on the ground
  movers.forEach((m, i) => {
    const y0 = starts[i], u0 = m.at(0).v, aim = u0 > 1e-9 ? 90 : -90;
    const pose = fired ? clamp(0.55 + t / Math.max(1e-6, 0.08 * f.tMax), 0, 1) : 0;
    const per = throwerHand(100, aim);
    if (y0 > 0 && byHand) {
      const hh = clamp((oy - Y(y0)) / (per.y / 100), THROWER_MIN * 0.8, 3 * k);
      thrower(g, lx - hh * (per.x / 100), oy, hh, P, { dir: 1, pose, aim });
    } else if (y0 > 0 && Math.abs(y0 - H0) < 1e-9) {
      thrower(g, Math.min(x0 - th * 0.08, lx - th * (per.x / 100)), top, th, P, { dir: 1, pose, aim });
    } else if (y0 === 0) {
      thrower(g, lx + th * 0.55, oy, th, P, { dir: -1, pose, aim });
    }
  });

  // ── the line they move on, faint, and the height of the place
  stroke(g, [{ x: lx, y: oy }, { x: lx, y: Y(yTop) - 8 }], { color: P.ink, width: 1, alpha: 0.25, dash: [3, 5] });
  if (H0 > 0) {
    const dx = (R.backdrop === 'house' ? x0 - houseW(k) : x0 - th * 0.9) - 16;
    stroke(g, [{ x: dx, y: oy }, { x: dx, y: top }], { color: P.ink, width: 1.4, alpha: 0.9 });
    for (const yy of [oy, top]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.4, alpha: 0.9 });
    L.add(T`${trimmed(sig3(H0))} [m]`, dx - 8, (oy + top) / 2, { color: P.ink, align: 'right', pri: 7, size: 15, weight: 700 });
  }
  if (!phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H - 40 }); L.reserve({ x: w - 130, y: 0, w: 130, h: 56 }); }

  // ── the moments: where they meet, or each bounce
  const end = t >= f.tMax - 1e-9;
  if (!end) clock.at = null; else if (clock.at == null) clock.at = performance.now();
  const late = end ? Math.min(SETTLE * 0.999, (performance.now() - clock.at) / 1000) : -1;
  // an earlier moment plays on the motion's own clock; the last on the wall clock
  const ageAt = (tc) => (tc >= f.tMax - 1e-9 ? late : t - tc);
  const short = Math.max(0.25, Math.min(0.8, f.tMax / 6));
  let squashAt = null;
  if (pair && f.meet && t >= f.meet.t - 1e-9) {
    const my = Y(f.meet.x), a = ageAt(f.meet.t), life = f.meet.t >= f.tMax - 1e-9 ? SETTLE : short;
    for (const e of R.effects) {
      if (e === 'flash') flash(g, lx, my, a, life, { radius: 30 });
      else if (e === 'ring') pulse(g, lx, my, a, life, P.mark);
    }
    stroke(g, [{ x: lx - 40, y: my }, { x: lx + 60, y: my }], { color: P.mark, width: 1.6, alpha: 0.9, dash: [5, 4] });
    L.add(T`h = ${sig3(f.meet.x)} [m]`, lx + 66, my - 9, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
    L.add(T`t = ${sig3(f.meet.t)} [s]`, lx + 66, my + 11, { color: P.mark, align: 'left', pri: 8, size: 14, weight: 700 });
  }
  if (!pair) {
    for (const im of f.impacts || []) {
      if (t < im.t - 1e-9) continue;
      const a = ageAt(im.t), life = im.t >= f.tMax - 1e-9 ? SETTLE : short;
      for (const e of R.effects) {
        if (e === 'ring') pulse(g, lx, oy, a, life, P.mark, { radius: 26 });
        else if (e === 'dust') dust(g, lx, oy, a, life, { size: 1.2, n: 12 });
        else if (e === 'flash') flash(g, lx, oy - 4, a, life);
      }
      if (a >= 0 && a < life) squashAt = { a, life };
    }
    // the greatest height after each bounce, marked as it is reached
    for (const im of (f.impacts || []).filter((x) => x.tTop != null && t >= x.tTop - 1e-9 && x.H > 1e-9)) {
      const hy = Y(im.H);
      stroke(g, [{ x: lx - 22, y: hy }, { x: lx + 22, y: hy }], { color: P.disp, width: 1.4, alpha: 0.85 });
      L.add(T`${sig3(im.H)} [m]`, lx + 28, hy, { color: P.disp, align: 'left', pri: 6, size: 13, weight: 700 });
    }
  }

  // ── each one: a trail of where it has just been, the ball, its velocity
  const off = pair ? [-6, 6] : [0];
  const vMax = Math.max(1e-6, ...movers.flatMap((m) => [0, 0.25, 0.5, 0.75, 1].map((q) => Math.abs(m.at(q * f.tMax).v))));
  const vl = clamp(Math.min(h * 0.16, 90), 34, 90) / vMax;
  movers.forEach((m, i) => {
    const x = lx + off[i], q = m.at(t), y = Y(q.y), ring = i === 1 ? P.second : null;
    for (let j = 8; j >= 1; j--) {
      const tt = t - j * f.tMax / 90;
      if (tt < 0 || !fired) continue;
      dot(g, x, Y(m.at(tt).y), 2.2, { fill: withAlpha(i ? P.second : P.vel, 0.08 + 0.05 * (8 - j)) });
    }
    const R0 = clamp(k * PIECES[m.kind].m * 0.5, 5.5, 16);
    g.save();
    if (squashAt) { const s = squash(squashAt.a, squashAt.life); g.translate(x, y + R0); g.scale(s.sx, s.sy); g.translate(-x, -y - R0); }
    if (m.kind === 'stone') pebble(g, x, y, R0);
    else if (m.kind === 'particle') particle(g, x, y, R0 * 2, P, { ring });
    else ballAt(g, x, y, R0, ring);
    g.restore();
    if (pair) L.add(m.n, x + (i ? 14 : -14), y, { color: i ? P.second : P.ink, align: i ? 'left' : 'right', pri: 9, size: 14, weight: 800 });
    if (show.velocity !== false && Math.abs(q.v) > 1e-6 && fired) {
      const ty = y - q.v * vl, ax = x + (pair ? (i ? 16 : -16) : 16);
      arrow(g, ax, y, ax, ty, { color: withAlpha(P.card, 0.8), width: 7, head: 14 });
      arrow(g, ax, y, ax, ty, { color: P.velVec, width: 3, head: 11 });
      L.add(T`${sig3(Math.abs(q.v))} [m s^-1]`, ax + (i || !pair ? 10 : -10), (y + ty) / 2, { color: P.vel, align: i || !pair ? 'left' : 'right', pri: 7, size: 14, weight: 700 });
    }
    if (show.acceleration && fired) arrow(g, x, y, x, y + 36, { color: P.acc, width: 2.4, head: 10 });
  });

  const name = { road: 'the road', floor: 'the floor' }[B.below] || 'the ground';
  L.add(name, w - 14, oy - 14, { color: P.ink, align: 'right', pri: 4, size: 13 });
  L.draw(g, w, h);
  return null;
}

/* ── pieces the composer needed and the library did not have ─────────── */

/** A plain stone wall from x0 to the edge, its top at `top`, on the ground
    at Y: dressed courses lit from the left and a coping along its top — a
    wall to stand on or ride off, where the backdrop has no edge of its own. */
export function wall(g, x0, edge, top, Y, k) {
  const E = env(), H = Y - top;
  if (H < 2) return;
  softShadow(g, (x0 + edge) / 2, Y + 1, (edge - x0) * 0.5, 5, 0.7);
  stone(g, x0, top, edge - x0, H, { course: clamp(0.3 * k, 6, 12), seed: 23, color: E.night ? '#5d5459' : '#b3a597' });
  const cap = clamp(0.25 * k, 4, 9);
  g.fillStyle = E.night ? '#7a6f74' : '#cfc3b6'; g.fillRect(x0, top - cap * 0.4, edge - x0 + 3, cap);
  g.fillStyle = withAlpha('#ffffff', E.night ? 0.08 : 0.3); g.fillRect(x0, top - cap * 0.4, edge - x0 + 3, 1.5);
  g.fillStyle = withAlpha('#000000', 0.22); g.fillRect(x0, top + cap * 0.6, edge - x0 + 3, 2);
  g.fillStyle = withAlpha('#000000', 0.16); g.fillRect(edge - 3, top, 3, H);
}

/** A timber jetty out over the sea, its deck at `deck`, from x0 to the end
    at `edge`: planks with their seams, piles standing in the water at Y down
    to the bottom of the canvas, cross-bracing, and a mooring post at the end. */
export function jetty(g, x0, edge, deck, Y, bottom, k) {
  const E = env(), r = rng(37), n = E.night;
  const wood = n ? '#5e4a3d' : '#8b6b4e', dark = n ? '#3a2d25' : '#5e4734', lit = n ? '#7a6150' : '#b08d6c';
  const th = clamp(0.35 * k, 5, 12), gap = clamp(2.6 * k, 34, 90);
  // the piles, from under the deck down into the water, darker below the surface
  for (let x = edge - 6; x > x0; x -= gap) {
    const pw = clamp(0.3 * k, 5, 10);
    const pg = g.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
    pg.addColorStop(0, lit); pg.addColorStop(1, dark);
    g.fillStyle = pg; g.fillRect(x - pw / 2, deck, pw, Math.max(0, bottom - deck));
    g.fillStyle = withAlpha(n ? '#0d161b' : '#2f4a57', 0.5); g.fillRect(x - pw / 2, Y, pw, Math.max(0, bottom - Y));
    g.strokeStyle = withAlpha('#ffffff', 0.45); g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(x, Y + 1, pw * 0.9, 1.6, 0, 0, Math.PI * 2); g.stroke();
    // a brace to the next pile, where the deck is high enough to need one
    if (Y - deck > th * 3 && x - gap > x0) {
      g.strokeStyle = dark; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, deck + th); g.lineTo(x - gap, Math.min(Y, deck + th + gap * 0.7)); g.stroke();
    }
  }
  // the deck, plank ends showing along its face
  const dg = g.createLinearGradient(0, deck, 0, deck + th);
  dg.addColorStop(0, lit); dg.addColorStop(1, wood);
  g.fillStyle = dg; g.fillRect(x0, deck, edge - x0, th);
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1;
  for (let x = edge - 3; x > x0; x -= 7 + r() * 5) { g.beginPath(); g.moveTo(x, deck + 1); g.lineTo(x, deck + th); g.stroke(); }
  g.fillStyle = withAlpha('#ffffff', n ? 0.06 : 0.25); g.fillRect(x0, deck, edge - x0, 1.5);
  g.fillStyle = dark; g.fillRect(x0, deck + th - 2, edge - x0, 2);
  // the mooring post at the end, with a coil of rope
  const mh = clamp(0.9 * k, 10, 24), mw = clamp(0.3 * k, 5, 10);
  g.fillStyle = dark; g.fillRect(edge - mw - 2, deck - mh, mw, mh);
  g.fillStyle = lit; g.fillRect(edge - mw - 2, deck - mh, mw * 0.4, mh);
  g.strokeStyle = n ? '#a8957a' : '#d8c39a'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(edge - mw / 2 - 2, deck - mh * 0.45, mw * 0.75, 2.2, 0, 0, Math.PI * 2); g.stroke();
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
