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

import { BACKDROPS, FIGURES as PIECES, placeOf } from '../compose/registry.js';
import { dust, pulse, flash, squash } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, sig3, withAlpha } from './util.js';
import { thrower, throwerHand, THROWER_MIN, ballAt, drawFigure, phaseFor, particle, fence, diver, DIVER_FEET, skateboarder, SKATE_FEET, parcel } from './figures.js';
import { seaScene, riverScene, poolScene, fields, curtainWall, tree, seaCliff, tower, bridge, divingBoard, balloon, well, bigSplash, pebble, fitClear } from './heights.js';
import { table, labWall } from './bench.js';
import { PLACE_ART, cityWidth } from './places.js';
import { drawProp } from './props.js';
import { crater, snowPuff, divot, sparks, confetti, smokeTrail, splat, crack } from './impacts.js';
import { ANIMALS, FEET, javelin } from './animals.js';
import { golfer, kicker, GOLF_BALL_AT, KICK_BALL_AT } from './athletes.js';
import { CARRIER_ART, carrierSize } from './carriers.js';
import { house } from './target.js';
import { appleTree, apple } from './apples.js';
import { grass, sandGround, tarmac, railBed, floorboards, interior, water, stone, skyscape, env, rng, softShadow } from './scenery.js';
import { T } from '../notation.js';

const HUD = 250, HUD_H = 290;
const trimmed = (s) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);
/** Half a figure's drawn height, as a fraction of its drawn length L — so it
    is drawn round the engine's point, not standing on it. */
const BALLS = new Set(['football', 'tennisBall', 'golfBall', 'basketball', 'shot', 'snowball']);
const MIDDLE = { car: 0.16, lorry: 0.2, train: 0.11, cyclist: 0.45, motorcycle: 0.3, runner: 0.5 };
const WET = new Set(['sea', 'river', 'pool', 'well']);

/* ── the landing, played out after the motion stops ───────────────────
   Playback stops at the moment it lands, so an effect timed only by the
   motion's clock would freeze on its first frame. The landing's effect runs
   on the wall clock from the moment the stage first draws it landed: the
   engine says WHEN (t = tMax), the clock only says how far through the splash
   is. The app keeps drawing while it plays (settling) and opens the ending
   card after it (SETTLE seconds). */
export const SETTLE = 1.4;
const clock = { at: null }, clocks = [{ at: null }, { at: null }];
export const settling = () => [clock, ...clocks].some((c) => c.at != null && performance.now() - c.at < SETTLE * 1000);

/* ── the stage ───────────────────────────────────────────────────────── */
export function render(canvas, cam, o) {
  const { traj: f, recipe: R } = o;
  if (!f || !R) return null;
  if (R.engine === 'projectile' || R.engine === 'twin') return launch(canvas, o);
  if (R.engine === 'pair' || R.engine === 'bounce') return column(canvas, o);
  return null;
}

/** How wide a table is drawn: about a metre and a half, to scale. */
const tableW = (k, w = 1e9) => clamp(1.5 * k, 50, w * 0.45);
/** How long a diving stand's board is drawn, for its height in px. */
const boardLen = (k, drop) => clamp(Math.max(1.6 * k, drop * 0.5), 70, 160);

/** The backdrop and the place things start from, for either stage: the
    library's own scenery for the recipe's backdrop, its top at `top` (H0 m),
    its edge at x0, the ground or the water at oy. */
function scenery(g, R, { w, h, k, X, Y, oy, x0, top, H0, xMax, phase, houseW, byHand, clearX = [] }) {
  const P = palette();
  // the places in js/render/places.js draw themselves and what they launch from
  if (PLACE_ART[R.backdrop]) { PLACE_ART[R.backdrop](g, { w, h, k, X, Y, oy, x0, top, H0: byHand ? 0 : H0, phase, P, clearX }); return; }
  const horizon = (q) => oy - clamp((oy - 40) * q, 26, 110);
  // the place it is launched from, where the backdrop has no edge of its own:
  // a stone wall to stand on, a jetty over the sea, or the ground itself
  const ledge = () => { if (H0 > 0 && !byHand) wall(g, -4, x0 + 2, top, oy, k); };
  switch (R.backdrop) {
    case 'cliff':
      if (R.below === 'ground' || R.below === 'beach') {
        // the same cliff, with dry land at its foot: fields to the horizon,
        // grass or sand below, scree where the face meets it
        fields(g, w, horizon(0.22), oy);
        seaCliff(g, -4, x0, top, oy, { phase, foam: false });
        if (R.below === 'beach') sandGround(g, 0, w, oy, h); else grass(g, 0, w, oy, h);
        scree(g, x0, oy, k);
      } else { seaScene(g, w, h, horizon(0.2), phase); seaCliff(g, -4, x0, top, oy, { phase }); }
      break;
    case 'bridge':
      if (R.below === 'road') {
        // over a road: the verge, the carriageway, the bridge on its piers
        fields(g, w, horizon(0.16), oy);
        tarmac(g, 0, w, oy, { depth: clamp(0.6 * k, 12, 24), verge: h - oy });
      } else riverScene(g, w, h, horizon(0.16), phase);
      bridge(g, -4, x0, top, oy);
      break;
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
    case 'board': {
      // From a height's own diving stand over its pool, the board's tip at the edge
      const len = boardLen(k, oy - top), sx = x0 - len;
      poolScene(g, w, h, oy - clamp((oy - 40) * 0.18, 26, 80), sx + clamp(len * 0.18, 12, 26) + 10, phase);
      divingBoard(g, sx, x0, top, oy, h);
      break;
    }
    case 'table': {
      // a room: the wall with its shelf, the floor, the table its own size
      labWall(g, w, oy, h, { x0: x0 - tableW(k, w), x1: x0, top });
      table(g, x0 - tableW(k, w), x0, top, oy);
      break;
    }
    case 'well': {
      // From a height's own well: the head on level ground, the shaft cut
      // away down to its water, the line down its middle
      skyscape(g, 0, 0, w, top, { far: 'trees', seed: 14 });
      well(g, -4, w + 4, x0 + 3.5, 26, top, oy, h, { rise: 0 });
      break;
    }
    case 'air': {
      // high over fields, let go from beside a hovering balloon's basket; a
      // helicopter, a plane, a drone or a bird is drawn with the motion
      fields(g, w, horizon(0.3), oy); grass(g, 0, w, oy, h);
      if (CARRIER_ART[R.carrier]) break;
      const bs = Math.max(26, 0.75 * k);
      balloon(g, x0 - bs * 0.31 - Math.max(10, size(k) * 0.5), top, bs, P, { groundY: oy });
      break;
    }
    case 'road': fields(g, w, horizon(0.25), oy); tarmac(g, 0, w, oy, { depth: clamp(0.6 * k, 12, 24), verge: h - oy }); ledge(); break;
    case 'rails': fields(g, w, horizon(0.25), oy); grass(g, 0, w, oy + 18, h); railBed(g, 0, w, oy); ledge(); break;
    case 'hall': interior(g, 0, 0, w, oy); floorboards(g, 0, w, oy, h); ledge(); break;
    default: fields(g, w, horizon(0.25), oy); grass(g, 0, w, oy, h); ledge();
  }
}

/** A launch from a place, side on: the projectile engine (js/core/height.js),
    or two launched from it (the twin engine, js/core/twin.js) — each drawn as
    what it is, on its own clock from when it sets off. */
function launch(canvas, o) {
  const { traj: F0, t: tRaw, show = {}, fired = true, recipe: R } = o;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels();
  const B = placeOf(R);
  const twin = F0.kind === 'twin';
  const H0 = (twin ? F0.A.f : F0).params.h, phone = w < 520, wet = WET.has(B.below);
  const movers = (twin ? [[F0.A, 0], [F0.B, 1]] : [[{ f: F0, t0: 0 }, 0]]).map(([m, i]) => {
    const kind = R.objects[i].figure, piece = PIECES[kind], f = m.f;
    // a person throws it, unless it falls from a tree; small things are drawn
    // as themselves at the point, vehicles and people round it; off a table,
    // it leaves the table's edge: no one stands on the table
    const thrown = (!!piece.thrown || kind === 'arrow') && R.backdrop !== 'orchard' && R.backdrop !== 'table';
    const small = !!piece.thrown || !!piece.small || kind === 'arrow';
    // thrown from low down with nothing to stand on: the thrower stands on the
    // ground or the floor and lets go at hand height
    const byHand = thrown && !B.edge && R.backdrop !== 'sea' && H0 > 0 && H0 <= 2.6;
    const n = 160, pts = [];
    for (let j = 0; j <= n; j++) { const tt = (j / n) * f.tMax; pts.push({ t: tt, ...f.pos(tt) }); }
    return { i, f, kind, piece, thrown, small, byHand, pts, t0: m.t0 || 0, tag: twin ? 'AB'[i] : null, ring: i ? P.second : null,
      t: fired ? clamp(tRaw - (m.t0 || 0), 0, f.tMax) : 0, going: fired && tRaw > (m.t0 || 0) };
  });
  const thrownAny = movers.some((m) => m.thrown), byHand = movers.some((m) => m.byHand);
  const apex = Math.max(...movers.map((m) => (m.f.uy > 0 ? m.f.apexHeight : H0)));
  const xMax = Math.max(0, ...movers.flatMap((m) => m.pts.map((p) => p.x)));
  const yTop = Math.max(apex, H0);
  const lead = movers[0], piece = lead.piece, kind = lead.kind, small = movers.every((m) => m.small), thrown = thrownAny;

  // ── how big the moving thing is drawn: to scale, but never too small to read
  const size = (k, piece = lead.piece) => {
    const s0 = Math.min(Math.max(piece.min, piece.m * k), Math.max(piece.min, w * 0.22));
    // never taller than a fifth of the place it starts from (a phone's small stage)
    return H0 > 0 && !piece.thrown ? Math.min(s0, Math.max(26, piece.m * k, 0.2 * H0 * k)) : s0;
  };
  const TH = (k) => Math.max(phone ? THROWER_MIN * 0.8 : THROWER_MIN, Math.min(96, 1.75 * k));
  // a house to scale: three-metre storeys, a frontage a little wider than it is tall
  const houseW = (k) => clamp(Math.max(8, H0 * 1.1) * k, 90, Math.max(90, w * 0.34));
  // the second of two waits behind the first, clear of it: a thrower an arm
  // span back, or a vehicle's length; it eases onto the engine's point as it goes
  const behind = (k) => (!twin ? 0 : (movers[0].thrown ? TH(k) : size(k, movers[0].piece))
    + (movers[1].thrown ? TH(k) * 0.4 : size(k, movers[1].piece) * 0.6));

  // let go from a helicopter, a plane, a drone or a bird, not a balloon
  const carried = R.backdrop === 'air' && !!CARRIER_ART[R.carrier];

  // ── the frame: the motion and the room its pieces need, at one scale
  const pads = (k) => {
    const body = Math.max(...movers.map((m) => (m.thrown ? TH(k) : size(k, m.piece))));
    const place = R.backdrop === 'house' ? houseW(k) + 30 : R.backdrop === 'orchard' ? 2.4 * k
      : R.backdrop === 'board' ? boardLen(k, H0 * k) + 30 : R.backdrop === 'air' ? (carried ? carrierSize(R.carrier, k, w).s * 0.6 : Math.max(26, 0.75 * k) * 1.4)
      : R.backdrop === 'table' ? tableW(k, w) + 20 : R.backdrop === 'well' ? 90
      : R.backdrop === 'city' && H0 > 0 ? cityWidth(H0, k, w) + 30 : 0;
    // a person stands upright on the edge before the off: room for all of them
    const upright = movers.some((m) => m.kind === 'diver' || m.kind === 'skateboarder');
    const head = (thrown && !byHand ? TH(k) : size(k) * (upright ? 1.05 : 0.6)) + 16 - (yTop - H0) * k;
    // an orchard's crown stands well above the branch
    const crown = R.backdrop === 'orchard' ? 1.9 * k + 16 - (yTop - H0) * k
      : R.backdrop === 'air' ? (carried ? carrierSize(R.carrier, k, w).up + size(k) + 16 : Math.max(26, 0.75 * k) * 2.95 + 12) - (yTop - H0) * k : 0;
    // a well's head and winch stand well above its mouth
    const winch = R.backdrop === 'well' ? 130 - (yTop - H0) * k : 0;
    // on a phone a table takes only its own room, so the motion has the rest
    if (phone && R.backdrop === 'table') return { l: tableW(k, w) + 12, r: 40, t: Math.max(36, head) };
    return { l: Math.max(body * 0.9, place) + 80 + behind(k), r: 70 + Math.max(...movers.map((m) => (m.small ? 22 : size(k, m.piece) * 0.55))), t: Math.max(R.backdrop === 'bridge' ? 80 : 36, head, crown, winch) };
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
    F = fitClear(box, w, h, phone, R.backdrop === 'table' ? 0.75 : phone ? 0.6 : 0.35, (fs) => clear(fs, p), 76);
    if (!F) return null;
    k = F.k;
  }
  const { k, X, Y } = F, oy = Y(0), x0 = X(0), top = Y(H0);
  const phase = (fired ? tRaw : 0) * 1.3;

  // ── the backdrop, and the place it is launched from
  // where each lands, and where the surface is named, kept clear of the place's props
  const clearX = [...movers.map((m) => X(m.f.pos(m.f.tMax).x)), w - 60];
  scenery(g, R, { w, h, k, X, Y, oy, x0, top, H0, xMax, phase, houseW, byHand, clearX });

  // ── the height it starts at, as a dimension line beside the place
  if (H0 > 0) {
    // beside the place, never across it: outside the house's front, behind the thrower
    const dx = R.backdrop === 'house' ? x0 - houseW(k) - 16 : R.backdrop === 'board' ? x0 - boardLen(k, oy - top) - 26
      : R.backdrop === 'air' ? x0 - (carried ? carrierSize(R.carrier, k, w).s * 0.55 : Math.max(26, 0.75 * k) * 1.25) - 20
      : R.backdrop === 'table' ? x0 - tableW(k, w) - 16 : R.backdrop === 'well' ? x0 - 26 - 30
      // beside the block, not across its windows, where the frame has room
      : R.backdrop === 'city' && x0 - cityWidth(H0, k, w) - 16 > 60 ? x0 - cityWidth(H0, k, w) - 16
      : (thrownAny ? x0 - TH(k) * 0.5 : x0 - size(k) * 0.65) - behind(k) - 14;
    stroke(g, [{ x: dx, y: oy }, { x: dx, y: top }], { color: P.ink, width: 1.4, alpha: 0.9 });
    for (const yy of [oy, top]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.4, alpha: 0.9 });
    L.add(T`${trimmed(sig3(H0))} [m]`, dx - 8, (oy + top) / 2, { color: P.ink, align: 'right', pri: 7, size: 15, weight: 700 });
  }

  {
  // keep labels off the path and out from under the readouts
  for (const m of movers) for (let i = 0; i < m.pts.length; i += 4) L.reserve({ x: X(m.pts[i].x) - 5, y: Y(m.pts[i].y) - 5, w: 10, h: 10 });
  if (!phone) { L.reserve({ x: 0, y: 0, w: HUD, h: HUD_H - 40 }); L.reserve({ x: w - 130, y: 0, w: 130, h: 56 }); }

  // ── a height a part asks about: a marker line across, ringed where crossed
  const lv = lead.f.level, t = lead.t;
  if (lv) {
    const ly = Y(lv.L), xr = Math.min(w - 10, X(xMax) + 40);
    stroke(g, [{ x: x0 - 10, y: ly }, { x: xr, y: ly }], { color: P.mark, width: 1.6, alpha: 0.9 });
    L.add(Math.abs(lv.rel) < 1e-12 ? 'the height it started at' : T`${sig3(Math.abs(lv.rel))} [m] ${lv.rel >= 0 ? '"above"' : '"below"'} "the start"`, xr, ly - 14, { color: P.mark, align: 'right', pri: 6, size: 13, weight: 700 });
    for (const tc of lv.times) {
      if (t < tc - 1e-9) continue;
      const q = lead.f.pos(tc);
      dot(g, X(q.x), Y(q.y), 7, { stroke: P.mark, width: 2.4 });
      L.add(T`t = ${sig3(tc)} [s]`, X(q.x) + 12, Y(q.y) - 16, { color: P.mark, align: 'left', pri: 8, size: 14, weight: 700 });
    }
  }

  }
  for (const m of movers) {
    const { f, t, kind, piece, thrown, small, pts, byHand } = m;
    const clock = clocks[m.i];
  // ── who throws it: at the edge, wound up before the throw, through after it
  const v0 = f.vel(0), aim = (Math.atan2(v0.y, v0.x) * 180) / Math.PI;
  // at a well, the thrower stands at the well head, clear of the shaft
  let th = TH(k), feet = R.backdrop === 'well' ? x0 - 26 - 13 - 10 - th * 0.18 : x0 - th * (f.vertical ? 0.5 : 0.2), stand = top;
  if (byHand) {
    // sized so the hand is at the launch point, feet on the floor
    const per = throwerHand(100, aim);
    th = clamp((oy - top) / (per.y / 100), THROWER_MIN * 0.8, 3 * k);
    feet = x0 - th * (per.x / 100); stand = oy;
  }
  // the second of two stands behind the first, holding what it throws
  const sh = m.i ? behind(k) : 0;
  feet -= sh;
  // a golf ball is struck by a golfer, a football kicked: the ball where
  // the engine starts it, at the club's head or the boot
  const striker = !byHand && (kind === 'golfBall' ? golfer : kind === 'football' ? kicker : null);
  if (thrown && striker) {
    const pose = m.going ? clamp(0.5 + t / Math.max(1e-6, 0.12 * f.tMax), 0, 1) : 0;
    striker(g, x0 - th * (kind === 'golfBall' ? GOLF_BALL_AT : KICK_BALL_AT) - sh, stand, th, P, { pose, ring: m.ring });
  } else if (thrown) {
    // a javelin is held along the throw, its grip in the hand, until it goes
    // (and so is anything thrown from the hand's own height: it leaves the hand)
    const pose = kind === 'javelin' || byHand ? 1 : m.going ? clamp(0.55 + t / Math.max(1e-6, 0.08 * f.tMax), 0, 1) : 0;
    thrower(g, feet, stand, th, P, { dir: 1, pose, aim, ring: m.ring, suit: R.backdrop === 'moon' || R.backdrop === 'mars' });
  }

  // ── the path: all of it faintly, the part flown strongly
  const at = (p) => ({ x: X(p.x), y: Y(p.y) });
  stroke(g, pts.map(at), { color: P.vel, width: 1.8, alpha: 0.35 });
  const body = ['diver', 'skateboarder', 'parcel', 'sandbag', 'bucket', 'rocket', 'arrow', 'javelin'].includes(kind) || !!piece.animal;
  stroke(g, pts.filter((p) => p.t <= t).map(at), { color: P.vel, width: body ? 2.4 : 3, alpha: body ? 0.5 : 1 });

  // a rocket's smoke, left along the way it has come, under the marks
  if (R.effects.includes('smoke') && m.going && !(t >= f.tMax - 1e-9 && wet)) smokeTrail(g, (tt) => at(f.pos(tt)), t, { dt: f.tMax / 130, n: 46, size: clamp(k / 12, 0.8, 2) });

  if (show.apex && f.uy > 0) {
    const q = at(f.pos(f.tApex));
    dot(g, q.x, q.y, 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    // each its own top, the engine's (rule 4)
    L.add(`${m.tag ? `${m.tag}: ` : ''}${T`H_max = ${sig3(f.apexHeight)} [m]`}`, q.x + 12, q.y - 14 - m.i * 20, { color: P.disp, align: 'left', pri: 6, size: 14, weight: 700 });
  }

  // ── where it lands, once it has: the recipe's effect, at the engine's time
  const later = [];
  const landed = t >= f.tMax - 1e-9;
  const end = f.pos(f.tMax), lx = X(end.x);
  if (!landed) clock.at = null;
  else if (clock.at == null) clock.at = performance.now();
  const life = SETTLE, age = landed ? Math.min(life * 0.999, (performance.now() - clock.at) / 1000) : -1;
  if (landed) {
    for (const e of R.effects) {
      // a car hitting the water at speed throws up a column, not a ripple
      if (e === 'splash' && wet) {
        bigSplash(g, lx, oy, age, life, Math.max(clamp(k / 5, phone ? 1 : 1.5, phone ? 1.5 : 2.6), small ? 0 : size(k, piece) / 26));
        ripples(g, lx, oy, age, life, Math.max(1, (small ? 12 : size(k, piece) * 0.5) / 18));
      }
      else if (e === 'dust' && !wet) dust(g, lx, oy, age, life, { size: small ? 1.6 : Math.max(2.4, size(k, piece) / 30), n: 22 });
      else if (e === 'ring') pulse(g, lx, oy, age, life, P.mark);
      else if (e === 'flash') flash(g, lx, oy - 6, age, life);
      else if (wet) continue;
      // what a landing does to dry ground, sized to what lands and drawn over
      // it, so it is seen: it sits in its crater, half in the snow
      else if (['crater', 'snow', 'divot'].includes(e)) {
        const sz = clamp((small ? 10 : size(k, piece) * 0.5) / 12, 1.4, 3.2);
        later.push(() => (e === 'crater' ? crater(g, lx, oy, age, life, { size: sz, ...(R.backdrop === 'mars' ? { dark: '#5e2e1d', light: '#e2a77a', blanket: true } : {}) })
          : e === 'snow' ? snowPuff(g, lx, oy, age, life, { size: sz }) : divot(g, lx, oy, age, life, { size: sz })));
      }
      else if (e === 'sparks') {
        // on the open side, never across the face it fell beside
        g.save(); if (H0 > 0) { g.beginPath(); g.rect(x0 + 1, 0, w, h); g.clip(); }
        sparks(g, lx, oy - 2, age, life, { size: clamp((small ? 10 : size(k, piece) * 0.5) / 16, 0.7, 2) });
        g.restore();
      }
      else if (e === 'confetti') confetti(g, lx, oy - 10, age, life, { size: phone ? 0.8 : 1.1 });
      else if (e === 'splat') { g.save(); if (H0 > 0) { g.beginPath(); g.rect(x0 + 1, 0, w, h); g.clip(); } splat(g, lx, oy, age, life, { size: clamp(k / 14, 1, 3) }); g.restore(); }
      else if (e === 'crack') crack(g, lx, oy, age, life, { size: phone ? 0.8 : 1 });
    }
    if (!f.vertical) {
      const ry = oy + 24 + m.i * 24;
      stroke(g, [{ x: x0, y: ry }, { x: lx, y: ry }], { color: P.ink, width: 1.4, alpha: 0.9 });
      for (const xx of [x0, lx]) stroke(g, [{ x: xx, y: ry - 5 }, { x: xx, y: ry + 5 }], { color: P.ink, width: 1.4, alpha: 0.9 });
      L.add(T`${sig3(end.x)} [m]`, Math.min((x0 + lx) / 2, lx - 40), ry + 15, { color: P.ink, align: 'center', pri: 7, size: 14, weight: 700, maxPush: 20 });
    }
  }

  // what it is let go from: holding it before, flying on above it after
  // (a plane keeps over what it drops: across at the engine's speed), and
  // fading once it has landed
  if (carried && m.i === 0) {
    const C = carrierSize(R.carrier, k, w), above = small ? 10 : size(k, piece) * 0.85;
    const cx = Math.abs(v0.x) > 1e-9 ? X(f.pos(t).x) : X(0);
    g.save(); g.globalAlpha = landed ? clamp(1 - age / life, 0, 1) : 1;
    CARRIER_ART[R.carrier](g, cx, top - above, C.s, P, { phase: tRaw * 1.3, groundY: oy });
    g.restore();
  }

  // ── the moving thing, at the engine's point
  const r = f.pos(t), v = f.vel(t);
  const held = sh ? 1 - clamp(t / Math.max(1e-6, 0.1 * f.tMax), 0, 1) : 0;
  let bx = X(r.x) - sh * held * held * (3 - 2 * held), by = Y(r.y);
  // thrown from the hand: a thrower drawn larger than the scale (so it can be
  // seen) holds it in its hand, and it eases onto the engine's path as it goes
  if (byHand && thrown && small) {
    const hp = throwerHand(th, aim), q = 1 - clamp(t / Math.max(1e-6, 0.08 * f.tMax), 0, 1), e = q * q * (3 - 2 * q);
    bx += (feet + hp.x - X(0)) * e; by += (stand - hp.y - Y(H0)) * e;
  }
  const Lp = small ? 0 : size(k, piece);
  const aloft = m.going && t > 0 && !landed;
  if (small) {
    const R0 = clamp(k * piece.m * 0.5, 5.5, 9);
    // gone under water, or burst: a water balloon is not there once it lands
    const gone = landed && ((wet && age > life * 0.2) || (kind === 'waterBalloon' && age > 0.04));
    if (aloft && !wet) softShadow(g, bx, oy + 1, R0 * 1.4, R0 * 0.35, clamp(1 - (oy - by) / (h * 0.7), 0.15, 0.8));
    if (!gone) {
      if (kind === 'apple') apple(g, bx, by, clamp(k * 0.05, 6, 10));
      // resting on the surface, not sunk in it: lifted by its own radius
      // while it sits there, easing to the engine's point as it goes
      else if (kind === 'coin') coin(g, bx, by - (fired && t > 0 ? 0 : 3), 8, fired ? t * 9 : 0.25);
      else if (kind === 'marble') marble(g, bx, by - (fired && t > 0 ? 0 : 7), 7);
      else if (kind === 'javelin') {
        // stuck in point first where it lands, most of it standing clear
        const L = size(k, piece), ang = fired ? Math.atan2(-v.y, v.x) : Math.atan2(-v0.y, v0.x), back = landed ? L * 0.35 : 0;
        javelin(g, bx - Math.cos(ang) * back, by - Math.sin(ang) * back, L, ang);
      }
      else if (kind === 'arrow') arrowShaft(g, bx, by, Math.max(44, size(k, piece)), fired ? Math.atan2(-v.y, v.x) : Math.atan2(-v0.y, v0.x));
      else if (piece.prop) {
        // a ball to scale, never smaller than reads; resting on the turf or the
        // tee one radius up before it is struck and once it has landed
        const ball = BALLS.has(kind), Rp = clamp(k * piece.m * 0.5, ball ? (kind === 'golfBall' ? 3.5 : 4) : 7, 10);
        const lift = ball && !aloft && !(landed && wet) ? Rp : 0;
        drawProp(g, kind, bx, by - lift, Rp, fired ? t * 7 : 0.3, m.ring, { cracked: landed && R.effects.includes('crack') });
      }
      else if (kind === 'ball') ballAt(g, bx, by, R0, m.ring);
      else if (kind === 'particle') particle(g, bx, by, R0 * 2, P, { ring: m.ring });
      else { pebble(g, bx, by, R0); if (m.ring) dot(g, bx, by, R0 + 3, { stroke: m.ring, width: 2.4 }); }
    }
  } else if (kind === 'rocket') {
    // pointed along its path all the way, as a real arrow or a coasting rocket flies
    const ang = fired ? Math.atan2(-v.y, v.x) : Math.atan2(-v0.y, v0.x);
    g.save();
    if (landed && wet) { g.beginPath(); g.rect(0, 0, w, oy + 1); g.clip(); }
    if (aloft && !wet) softShadow(g, bx, oy + 1, Lp * 0.3, Math.max(2, Lp * 0.04), clamp(1 - (oy - by) / (h * 0.7), 0.15, 0.8));
    // on its rod at the start, its tail at the launch point, then the engine's point
    const p0 = fired ? clamp(t / (f.tMax * 0.06), 0, 1) : 0, a0 = Math.atan2(-v0.y, v0.x);
    if (!fired || p0 < 1) {
      const lx0 = X(0), ly0 = Y(H0);
      stroke(g, [{ x: lx0, y: ly0 + 2 }, { x: lx0 + Math.cos(a0) * Lp * 1.1, y: ly0 + Math.sin(a0) * Lp * 1.1 }], { color: P.ink, width: 1.6, alpha: 0.7 });
      g.fillStyle = withAlpha(P.ink, 0.55); g.fillRect(lx0 - 9, ly0 - 1, 18, 4);
    }
    const lift = (1 - p0) * Lp * 0.5;
    rocket(g, bx + Math.cos(ang) * lift, by + Math.sin(ang) * lift, Lp, ang, !fired || t < f.tMax * 0.04);
    g.restore();
  } else if (kind === 'diver' || kind === 'skateboarder' || kind === 'parcel' || kind === 'sandbag' || kind === 'bucket' || piece.animal) {
    const p = fired ? t / f.tMax : 0, ease = (a0, b0, x) => { const u = clamp((x - a0) / (b0 - a0), 0, 1); return u * u * (3 - 2 * u); };
    const after = landed ? clamp(age / life, 0, 1) : 0;
    let cx = bx, cy = by;
    m.body = null;
    g.save();
    if (landed && wet) { g.beginPath(); g.rect(0, 0, w, oy + 1); g.clip(); }
    if (kind === 'diver') {
      // stands on the board's end, then the hip carries the engine's point;
      // a jump upwards tucks and turns one and a half times to go in head
      // first, a dive out tips over gently; in the water it is gone under
      // on dry ground it comes down on its feet again, never buried head first
      cy = by - DIVER_FEET * Lp * (1 - ease(0, 0.12, p) + (wet ? 0 : ease(0.82, 1, p))) + (landed && wet ? Lp * 1.4 * ease(0, 0.3, after) : 0);
      // at a well they stand on the stone beside the shaft, and step off over it
      if (R.backdrop === 'well') cx = bx - (26 + 10 + Lp * 0.15) * (1 - ease(0, 0.12, p));
      if (aloft && !wet) softShadow(g, bx, oy + 1, Lp * 0.3, Math.max(2, Lp * 0.04), clamp(1 - (oy - by) / (h * 0.7), 0.15, 0.8));
      // dropped, or sent straight down, a person falls feet first, upright;
      // a jump upwards tucks and somersaults; a dive out tips over gently
      const down = Math.hypot(v0.x, v0.y) < 1e-6 || (v0.y < 0 && Math.abs(v0.x) < Math.abs(v0.y) * 0.25);
      const steep = !down && Math.atan2(v0.y, v0.x) > Math.PI / 4;
      const tuck = steep ? ease(0.15, 0.35, p) * (1 - ease(0.6, 0.8, p)) : 0;
      // into water: one and a half turns to go in head first; onto dry ground:
      // a full turn (or a lean and back) so it lands upright
      const spin = down ? 0 : steep ? ease(0.15, 0.85, p) * Math.PI * (wet ? 3 : 2) : wet ? ease(0.05, 1, p) * Math.PI * 0.85 : Math.sin(ease(0.05, 0.95, p) * Math.PI) * 0.6;
      m.body = { x: cx, y: cy - (fired ? 0 : Lp * 0.25) };
      diver(g, cx, cy, Lp, P, { ring: m.ring, tuck, arms: !fired ? 0.15 : p < 0.04 ? ease(0, 0.04, p) : 1 - tuck, spin, stand: !fired });
    } else if (piece.animal) {
      // crouched on the edge, its feet at the engine's point; it springs,
      // stretches out in the air, and reaches down to land
      // its body on the path in the air, its feet on the edge and the ground
      cx = bx - Lp * 0.3 * (1 - ease(0, 0.1, p)); cy = by - Lp * FEET[kind] * (1 - ease(0, 0.12, p) + (landed && wet ? 0 : ease(0.85, 1, p)));
      if (aloft && !wet) softShadow(g, bx, oy + 1, Lp * 0.4, Math.max(2, Lp * 0.05), clamp(1 - (oy - by) / (h * 0.7), 0.15, 0.8));
      const pitch = aloft ? 0.35 * Math.atan2(-v.y, v.x) : 0;
      m.body = { x: cx, y: cy };
      ANIMALS[kind](g, cx, cy, Lp, P, { leap: fired ? ease(0, 0.08, p) : 0, land: fired ? ease(0.8, 1, p) : 0, spin: pitch, ring: m.ring });
    } else if (kind === 'skateboarder') {
      // the wheels carry the engine's point all the way down, the deck's front
      // at the edge before the off, landing level on all four wheels
      const half = Lp * 0.34;
      cx = bx - half * (1 - ease(0, 0.1, p)); cy = by - (SKATE_FEET + 0.08) * Lp;
      if (aloft && !wet) softShadow(g, bx, oy + 1, Lp * 0.35, Math.max(2, Lp * 0.04), clamp(1 - (oy - by) / (h * 0.7), 0.15, 0.8));
      const pitch = 0.4 * Math.atan2(-v.y, v.x) * (fired ? 1 : 0) * (1 - ease(0.88, 1, p));
      m.body = { x: cx, y: cy - Lp * 0.2 };
      skateboarder(g, cx, cy, Lp, P, { spin: pitch, phase: phaseFor('car', Lp, Math.abs(bx - x0)) });
    } else {
      // hangs on a line from the basket until it is let go; a quarter turn as
      // it falls, so it lands flat on its base
      // hung by its top until it is let go: from the basket's edge in the
      // air, from the well's rope over the shaft
      const half = kind === 'sandbag' ? 0.5 : kind === 'bucket' ? 0.4 : 0.36;
      cy = by - Lp * half;
      // on an edge, it sits on it before the off rather than past the corner
      const hung = R.backdrop === 'air' || R.backdrop === 'well';
      if (!hung && H0 > 0) cx = bx - Lp * 0.5 * (1 - ease(0, 0.1, p));
      m.body = { x: cx, y: cy };
      if (!fired && (R.backdrop === 'air' || R.backdrop === 'well')) {
        const end = carried ? { x: bx, y: top - Lp * 0.85 } : R.backdrop === 'air' ? { x: bx - Lp * 0.5 - 4, y: top - 2 } : { x: bx, y: Math.max(8, top - 70) };
        stroke(g, [{ x: bx, y: cy - Lp * half }, end], { color: P.ink, width: 1.3, alpha: 0.75 });
      }
      if (aloft && !wet) softShadow(g, bx, oy + 1, Lp * 0.5, Math.max(2, Lp * 0.06), clamp(1 - (oy - by) / (h * 0.7), 0.15, 0.8));
      const spin = ease(0, 1, p) * Math.PI / 2;
      if (kind === 'parcel') parcel(g, cx, cy, Lp, P, { spin });
      else if (kind === 'sandbag') sandbag(g, cx, cy, Lp, spin * 0.6);
      else bucket(g, cx, cy, Lp, Math.sin(ease(0, 1, p) * Math.PI) * 0.6);
    }
    g.restore();
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
    drawFigure(g, kind, Lp / 2, mid, Lp, P, { dir: 1, phase: turns, brake: false, ring: m.ring, airborne: aloft || (landed && wet) });
    g.restore();
    if (landed && wet) water(g, lx - Lp * 0.7, lx + Lp * 0.7, oy, oy + 3, { phase });
  }

  for (const draw of later) draw();
  // labels keep off the figure itself
  if (!small) { const cb = m.body ?? { x: bx, y: by - Lp * 0.3 }; L.reserve({ x: cb.x - Lp * 0.55, y: cb.y - Lp * 0.6, w: Lp * 1.1, h: Lp * 1.1 }); }

  // ── its velocity and its acceleration, on it
  const pv = pts.map((p) => f.vel(p.t));
  const vMax = Math.max(...pv.map((q) => Math.hypot(q.x, q.y)), 1e-6);
  const room = (c, dv, lo, hi) => (dv > 0 ? (hi - c) / dv : dv < 0 ? (lo - c) / dv : Infinity);
  // one scale for the whole flight, so the arrow grows and shrinks with the
  // speed; never shorter than 30 px while it moves, cut at the canvas's edge
  const vl = clamp(w * 0.08, 46, 100) / vMax;
  void room;
  const sp = Math.hypot(v.x, v.y);
  if (show.velocity !== false && sp > 1e-6) {
    // from a vehicle's nose, not buried in its door; on a halo, so it reads
    // over the art. The impact velocity stays drawn at the moment of impact.
    // a person or a parcel has it beside them, never across the body
    const person = ['diver', 'skateboarder', 'parcel', 'sandbag', 'bucket'].includes(kind) || !!piece.animal;
    // a small thing has it from its edge, so the thing itself shows
    const lead = small ? 11 : Lp * 0.5;
    // a person or a parcel: from just in front of its body, so it reads as its own
    const ox = person ? (m.body?.x ?? bx) + Lp * (piece.animal ? 0.55 : 0.22) : bx + (v.x / sp) * lead, oyv = person ? (m.body?.y ?? by) : by - (v.y / sp) * lead;
    const len = Math.max(30, sp * vl), ux = v.x / sp, uy = -v.y / sp;
    let tx = ox + ux * len, ty = oyv + uy * len;
    tx = clamp(tx, 10, w - 10); ty = clamp(ty, 10, h - 8);
    const halo = withAlpha(P.card, 0.45);
    if (show.components && Math.abs(v.x) > 1e-9) {
      arrow(g, ox, oyv, tx, oyv, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, tx, oyv, tx, ty, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, ox, oyv, tx, ty, { color: halo, width: 6, head: 14 });
    arrow(g, ox, oyv, tx, ty, { color: P.velVec, width: 3, head: 12 });
    for (let u = 0, m = Math.ceil(Math.hypot(tx - ox, ty - oyv) / 10); u <= m; u++) L.reserve({ x: ox + (tx - ox) * u / m - 6, y: oyv + (ty - oyv) * u / m - 6, w: 12, h: 12 });
    const near = tx > w - 120, sy = Math.sign(ty - by) || 1;
    L.add(`${m.tag ? `${m.tag}: ` : ''}${T`${sig3(sp)} [m s^-1]`}`, near ? tx - 10 : tx + 12, near ? ty + sy * 20 : ty, { color: P.vel, align: near ? 'right' : 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
    // its letter on it, up and back from it, away from the path ahead: placed
    // first, and never sent off to float
    if (m.tag) L.add(m.tag, bx - (small ? 10 : Lp * 0.35) - 4, by - (small ? 14 : Lp * 0.45), { color: m.ring || P.ink, align: 'right', pri: 10, size: 14, weight: 800, maxPush: 20 });
  }

  // ── what it lands on, named on it
  const name = { surface: 'the surface', sea: 'the sea', river: 'the river', pool: 'the water', well: 'the water', beach: 'the beach', road: 'the road', rails: 'the track', floor: 'the floor', snow: 'the snow', sand: 'the sand' }[B.below] || 'the ground';
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
  const B = placeOf(R), phone = w < 520, pair = R.engine === 'pair';
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
    // a house is cropped at the frame's edge: its corner is what matters
    const left = (R.backdrop === 'house' ? Math.min(houseW(k), 150) + 40 : TH(k) + 90) / k;
    // at least five metres of height, so a drop from someone's hand is seen
    // in its room rather than filling the stage
    const box = { xLo: -left, xHi: GAP + 150 / k, yLo: 0, yHi: Math.max(5, yTop + (TH(k) + 24) / k) };
    F = fitClear(box, w, h, phone, phone ? 0.85 : 0.35, () => true);
    if (!F) return null;
    k = F.k;
  }
  const { k, X, Y } = F, oy = Y(0), x0 = X(0), top = Y(H0);
  const phase = t * 1.3, th = TH(k);
  const R0 = Math.max(8, Math.min(16, k * 0.11));     // a ball you can see, to scale where it can be
  // held at arm's length at hand height, the arm is straight out in front;
  // otherwise the line is clear of the edge, room for a ball each side
  const held = byHand ? starts.findIndex((y0) => y0 > 0) : -1;
  const aimOf = (u0) => (u0 > 1e-9 ? 60 : u0 < -1e-9 ? -30 : 0);
  let hh = th, feet = 0;
  if (held >= 0) {
    const per = throwerHand(100, aimOf(movers[held].at(0).v));
    hh = clamp((oy - Y(starts[held])) / (per.y / 100), THROWER_MIN * 0.8, 3 * k);
    feet = X(GAP * 0.4);
  }
  // from the top: a person stands behind the parapet, an arm held out over
  // the edge, the hand at the top's height — so the line is that far out
  const topper = held < 0 ? starts.findIndex((y0) => y0 > 0 && Math.abs(y0 - H0) < 1e-9) : -1;
  const reach = topper >= 0 ? throwerHand(100, aimOf(movers[topper].at(0).v)) : null;
  const lx = held >= 0 ? feet + hh * (throwerHand(100, aimOf(movers[held].at(0).v)).x / 100)
    : reach ? x0 - 4 + th * (reach.x / 100) + Math.max(0, 2 * R0 + 8 - th * (reach.x / 100))
    : B.edge || H0 > 0 ? x0 + 4 * R0 + 12 : X(GAP);
  scenery(g, R, { w, h, k, X, Y, oy, x0, top, H0, xMax: GAP, phase, houseW, byHand });

  // ── who lets them go. Held at hand height: a person, the ball in the hand
  // held out in front. Thrown from the top or the ground: the thrower, as the
  // library's stages draw one, wound up and then through. Simply dropped from
  // the top: no one — it rests on the edge until it falls.
  movers.forEach((m, i) => {
    const u0 = m.at(0).v;
    if (i === held) thrower(g, feet, oy, hh, P, { dir: 1, pose: 1, aim: aimOf(u0) });
    else if (i === topper) {
      // standing behind the parapet: only what is above the roof line shows
      g.save(); g.beginPath(); g.rect(0, 0, w, top + R0 + 2); g.rect(x0, 0, w, top + th * 0.2); g.clip();
      const fx = lx - th * (reach.x / 100), fy = top + th * (reach.y / 100);
      thrower(g, Math.min(fx, x0 - 4), fy, th, P, { dir: 1, pose: 1, aim: aimOf(u0) });
      g.restore();
    }
    // launched from the ground: the ball alone, as a textbook draws it
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
      if (e === 'flash') { flash(g, lx, my, a, life, { radius: 52 }); pulse(g, lx, my, a, life, P.second, { radius: 48 }); }
      else if (e === 'ring') pulse(g, lx, my, a, life, P.mark, { radius: 48 });
    }
    // where they met stays marked: a ring, a dashed level across the stage,
    // and its height as a dimension from the ground
    dot(g, lx, my, R0 + 7, { stroke: P.mark, width: 2.6 });
    stroke(g, [{ x: x0 - 30, y: my }, { x: w - 12, y: my }], { color: P.mark, width: 1.4, alpha: 0.75, dash: [6, 5] });
    const dx = lx + R0 * 2 + 70;
    stroke(g, [{ x: dx, y: oy }, { x: dx, y: my }], { color: P.mark, width: 1.4, alpha: 0.9 });
    for (const yy of [oy, my]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.mark, width: 1.4, alpha: 0.9 });
    L.add(T`h = ${sig3(f.meet.x)} [m]`, dx + 10, (oy + my) / 2, { color: P.mark, align: 'left', pri: 9, size: 15, weight: 700 });
    L.add(T`t = ${sig3(f.meet.t)} [s]`, dx + 10, my - 14, { color: P.mark, align: 'left', pri: 8, size: 14, weight: 700 });
  }
  if (!pair) {
    for (const im of f.impacts || []) {
      if (t < im.t - 1e-9) continue;
      const a = ageAt(im.t), life = im.t >= f.tMax - 1e-9 ? SETTLE : short;
      for (const e of R.effects) {
        if (e === 'ring') { pulse(g, lx, oy, a, life, P.mark, { radius: 40 }); dust(g, lx, oy, a, life, { size: 1, n: 10 }); }
        else if (e === 'dust') dust(g, lx, oy, a, life, { size: 1.4, n: 14 });
        else if (e === 'flash') flash(g, lx, oy - 4, a, life);
      }
      if (a >= 0 && a < life) squashAt = { a, life };
    }
    // the greatest height after each bounce, marked as it is reached
    // each on its own tick, its label pinned beside it at its own height
    for (const im of (f.impacts || []).filter((x) => x.tTop != null && t >= x.tTop - 1e-9 && x.H > 1e-9)) {
      const hy = Y(im.H), tx = lx + R0 * 2 + 40;
      stroke(g, [{ x: lx - 14, y: hy }, { x: tx, y: hy }], { color: P.disp, width: 1.4, alpha: 0.85, dash: [4, 3] });
      L.add(T`${sig3(im.H)} [m]`, tx + 6, hy, { color: P.disp, align: 'left', pri: 6, size: 13, weight: 700, maxPush: 6 });
    }
  }

  // ── each one: a trail of where it has just been, the ball, its velocity
  // two on one line: side by side, touching where they meet, both clear of the wall
  const off = pair ? [-R0 - 1, R0 + 1] : [0];
  const vMax = Math.max(1e-6, ...movers.flatMap((m) => [0, 0.25, 0.5, 0.75, 1].map((q) => Math.abs(m.at(q * f.tMax).v))));
  const vl = clamp(Math.min(h * 0.16, 90), 34, 90) / vMax;
  movers.forEach((m, i) => {
    const x = lx + off[i], q = m.at(t), y = Y(q.y), ring = i === 1 ? P.second : null;
    for (let j = 8; j >= 1; j--) {
      const tt = t - j * f.tMax / 90;
      if (tt < 0 || !fired) continue;
      dot(g, x, Y(m.at(tt).y), 2.2, { fill: withAlpha(i ? P.second : P.vel, 0.08 + 0.05 * (8 - j)) });
    }
    g.save();
    // a bounce squashes it flat against the floor and it springs back
    if (squashAt) { const s = squash(squashAt.a, squashAt.life); g.translate(x, y + R0); g.scale(1 + (s.sx - 1) * 2.2, 1 + (s.sy - 1) * 2.2); g.translate(-x, -y - R0); }
    if (m.kind === 'stone') { pebble(g, x, y, R0); if (ring) dot(g, x, y, R0 + 3, { stroke: ring, width: 2.4 }); }
    else if (m.kind === 'particle') particle(g, x, y, R0 * 2, P, { ring });
    else if (PIECES[m.kind]?.prop) drawProp(g, m.kind, x, y, R0, fired ? t * 5 : 0.3, ring);
    else ballAt(g, x, y, R0, ring);
    g.restore();
    // letters and arrows on the open side, away from the wall
    if (pair) L.add(m.n, i ? x + R0 + 6 : x - R0 - 6, y - R0 - 8, { color: i ? P.second : P.ink, align: i ? 'left' : 'right', pri: 9, size: 14, weight: 800 });
    if (show.velocity !== false && Math.abs(q.v) > 1e-6 && fired) {
      const ax = lx + R0 * 2 + 14 + (pair ? i * 18 : 0);
      // never through the ground: at a bounce the arrow is cut at the floor
      const ty = Math.min(oy - 2, y - q.v * vl);
      arrow(g, ax, y, ax, ty, { color: withAlpha(P.card, 0.8), width: 7, head: 14 });
      arrow(g, ax, y, ax, ty, { color: P.velVec, width: 3, head: 11 });
      if (Math.abs(ty - y) > 6) L.add(T`${sig3(Math.abs(q.v))} [m s^-1]`, ax + 10, (y + ty) / 2, { color: P.vel, align: 'left', pri: 7, size: 14, weight: 700 });
    }
    if (show.acceleration && fired) arrow(g, x, y, x, y + 36, { color: P.acc, width: 2.4, head: 10 });
  });

  const name = { road: 'the road', floor: 'the floor' }[B.below] || 'the ground';
  L.add(name, w - 14, oy - 14, { color: P.ink, align: 'right', pri: 4, size: 13 });
  L.draw(g, w, h);
  return null;
}

/* ── pieces the composer needed and the library did not have ─────────── */

/** A coin edge-on and face-on as it flips: a gold disc `R` px across whose
    width follows the flip, a rim, a highlight. `turn` is the flip, in turns. */
export function coin(g, x, y, R, turn = 0) {
  const E = env(), c = Math.cos(turn * Math.PI * 2), sx = Math.max(0.45, Math.abs(c));
  g.save(); g.translate(x, y); g.scale(sx, 1);
  const gr = g.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.1, 0, 0, R);
  gr.addColorStop(0, E.night ? '#f2e2a6' : '#fff2b8'); gr.addColorStop(0.6, E.night ? '#c8a24a' : '#d9b04c'); gr.addColorStop(1, E.night ? '#8d6e2a' : '#9c7a2c');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(70,48,12,0.95)'; g.lineWidth = 1.8; g.stroke();
  g.strokeStyle = 'rgba(255,245,210,0.55)'; g.beginPath(); g.arc(0, 0, R * 0.68, 0, Math.PI * 2); g.stroke();
  g.restore();
}

/** A model rocket `L` px long round its middle, nose along `ang` (radians,
    canvas): a white body with a red nose cone, three fins, a window; a short
    flame from the nozzle only at the launch (`burning`). */
export function rocket(g, x, y, L, ang, burning = false) {
  const E = env(), r = L * 0.09;
  g.save(); g.translate(x, y); g.rotate(ang);
  if (burning) {
    const fl = g.createLinearGradient(-L * 0.5, 0, -L * 0.85, 0);
    fl.addColorStop(0, 'rgba(255,220,120,0.95)'); fl.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = fl; g.beginPath(); g.moveTo(-L * 0.48, -r * 0.7); g.lineTo(-L * 0.85, 0); g.lineTo(-L * 0.48, r * 0.7); g.closePath(); g.fill();
  }
  g.fillStyle = E.night ? '#8f3b35' : '#c6463c';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-L * 0.28, s * r); g.lineTo(-L * 0.48, s * r * 2.6); g.lineTo(-L * 0.5, s * r); g.closePath(); g.fill(); }
  const bg = g.createLinearGradient(0, -r, 0, r); bg.addColorStop(0, E.night ? '#eeeae6' : '#ffffff'); bg.addColorStop(1, E.night ? '#8f8a86' : '#bdb8b2');
  g.fillStyle = bg; g.fillRect(-L * 0.5, -r, L * 0.78, r * 2);
  g.fillStyle = E.night ? '#8f3b35' : '#c6463c';
  g.beginPath(); g.moveTo(L * 0.28, -r); g.quadraticCurveTo(L * 0.46, -r * 0.6, L * 0.5, 0); g.quadraticCurveTo(L * 0.46, r * 0.6, L * 0.28, r); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#5d7f97' : '#7fb0d4'; g.beginPath(); g.arc(L * 0.12, 0, r * 0.55, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.strokeRect(-L * 0.5, -r, L * 0.78, r * 2);
  g.restore();
}

/** An arrow `L` px long round its middle, point along `ang`: a wooden shaft,
    a steel point, three fletches at the tail. */
export function arrowShaft(g, x, y, L, ang) {
  const E = env(), t = Math.max(1.6, L * 0.035);
  g.save(); g.translate(x, y); g.rotate(ang);
  g.strokeStyle = E.night ? '#a3825f' : '#b8915f'; g.lineWidth = t; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-L * 0.5, 0); g.lineTo(L * 0.42, 0); g.stroke();
  g.fillStyle = E.night ? '#9aa1a8' : '#6f767d';
  g.beginPath(); g.moveTo(L * 0.5, 0); g.lineTo(L * 0.4, -t * 1.8); g.lineTo(L * 0.4, t * 1.8); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#c9a24a' : '#e3b04b';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-L * 0.36, 0); g.lineTo(-L * 0.5, s * t * 3); g.lineTo(-L * 0.47, 0); g.closePath(); g.fill(); }
  g.restore();
}

/** A sandbag `L` px tall round its middle, tipped by `spin`: an upright
    hessian sack, full and rounded at the bottom, gathered and tied at the
    neck, its weave shown, lit from the left. */
export function sandbag(g, x, y, L, spin = 0) {
  const E = env(), w = L * 0.62, h = L;
  g.save(); g.translate(x, y); g.rotate(spin);
  const bg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  bg.addColorStop(0, E.night ? '#b39e7a' : '#e2cfa5'); bg.addColorStop(1, E.night ? '#6b5c44' : '#a68e63');
  g.fillStyle = bg; g.beginPath();
  g.moveTo(-w * 0.18, -h * 0.34);
  g.quadraticCurveTo(-w * 0.62, -h * 0.05, -w * 0.5, h * 0.3);
  g.quadraticCurveTo(-w * 0.4, h * 0.5, 0, h * 0.5);
  g.quadraticCurveTo(w * 0.4, h * 0.5, w * 0.5, h * 0.3);
  g.quadraticCurveTo(w * 0.62, -h * 0.05, w * 0.18, -h * 0.34);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(70,50,25,0.3)'; g.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * w * 0.14, -h * 0.25); g.lineTo(i * w * 0.18, h * 0.45); g.stroke(); }
  // the gathered neck and its tie
  g.fillStyle = E.night ? '#9c8866' : '#cdb88c';
  g.beginPath(); g.moveTo(-w * 0.18, -h * 0.34); g.lineTo(-w * 0.26, -h * 0.5); g.lineTo(w * 0.26, -h * 0.5); g.lineTo(w * 0.18, -h * 0.34); g.closePath(); g.fill();
  g.strokeStyle = E.night ? '#4a3a28' : '#6b5134'; g.lineWidth = Math.max(1.6, L * 0.05);
  g.beginPath(); g.moveTo(-w * 0.2, -h * 0.36); g.lineTo(w * 0.2, -h * 0.36); g.stroke();
  g.restore();
}

/** A metal bucket `L` px tall round its middle, tipped by `tilt`: a tapered
    pail with a rim, a bail handle and a sheen. */
export function bucket(g, x, y, L, tilt = 0) {
  const E = env(), top = L * 0.42, bot = L * 0.3, hh = L * 0.8;
  g.save(); g.translate(x, y); g.rotate(tilt);
  const bg = g.createLinearGradient(-top, 0, top, 0);
  bg.addColorStop(0, E.night ? '#b7bec5' : '#e6ebef'); bg.addColorStop(0.5, E.night ? '#7f878f' : '#a9b2ba'); bg.addColorStop(1, E.night ? '#5a6168' : '#7b848c');
  g.fillStyle = bg; g.beginPath(); g.moveTo(-top, -hh / 2); g.lineTo(top, -hh / 2); g.lineTo(bot, hh / 2); g.lineTo(-bot, hh / 2); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = E.night ? '#3e444a' : '#5d656c'; g.beginPath(); g.ellipse(0, -hh / 2, top, L * 0.07, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = E.night ? '#9aa1a8' : '#6f767d'; g.lineWidth = Math.max(1.2, L * 0.03);
  g.beginPath(); g.arc(0, -hh / 2, top * 0.95, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  g.restore();
}

/** A glass marble: a clear sphere with a coloured twist inside and a hard highlight. */
export function marble(g, x, y, R) {
  g.save();
  const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R);
  gr.addColorStop(0, 'rgba(235,245,250,0.95)'); gr.addColorStop(1, 'rgba(120,160,190,0.9)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
  // two coloured ribbons crossing inside the glass
  g.lineWidth = Math.max(1.2, R * 0.26); g.lineCap = 'round';
  g.strokeStyle = 'rgba(40,90,160,0.85)'; g.beginPath(); g.moveTo(x - R * 0.6, y + R * 0.3); g.quadraticCurveTo(x, y - R * 0.5, x + R * 0.6, y + R * 0.2); g.stroke();
  g.strokeStyle = 'rgba(200,70,60,0.8)'; g.beginPath(); g.moveTo(x - R * 0.5, y - R * 0.35); g.quadraticCurveTo(x, y + R * 0.55, x + R * 0.55, y - R * 0.3); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x - R * 0.35, y - R * 0.4, R * 0.22, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(30,50,70,0.6)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.stroke();
  g.restore();
}

/** Scree at a cliff's foot on dry land: fallen rocks, larger near the face,
    lit from the left, so the face meets the ground rather than floating. */
export function scree(g, x0, Y, k) {
  const E = env(), r = rng(53), n = 14;
  g.save();
  for (let i = 0; i < n; i++) {
    const d = r() ** 1.6, x = x0 - 6 + d * clamp(3 * k, 30, 110), R = clamp((1 - d) * 0.5 * k, 3, 14) * (0.6 + r() * 0.6);
    softShadow(g, x + R * 0.3, Y + 1, R * 1.2, R * 0.3, 0.7);
    const gr = g.createLinearGradient(x - R, Y - R, x + R, Y);
    gr.addColorStop(0, E.night ? '#7b6f68' : '#b9ab9e'); gr.addColorStop(1, E.night ? '#4a403c' : '#7f7369');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, Y - R * 0.45, R, R * 0.62, (r() - 0.5) * 0.6, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/** Rings spreading out over the water from where something went in, one
    after another, flattened by the angle we see the surface at. */
export function ripples(g, x, y, age, life, size = 1) {
  if (!(age >= 0) || age > life) return;
  g.save();
  for (let i = 0; i < 4; i++) {
    const u = (age / life) * 1.3 - i * 0.16;
    if (u <= 0 || u >= 1) continue;
    const R = (14 + 70 * (1 - (1 - u) ** 2)) * size;
    g.strokeStyle = `rgba(255,255,255,${0.85 * (1 - u)})`; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(x, y + 1, R, R * 0.16, 0, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

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
