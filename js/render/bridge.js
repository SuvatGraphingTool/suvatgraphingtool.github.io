// bridge.js — the stage for a throw from a footbridge to a runner on the road
// below: side on, along the road, at one scale both ways. A concrete footbridge
// crosses the road (seen end on: its deck, parapet and pier); the thrower
// stands on it with her hand at the point of projection; the runner passes
// underneath as she throws and runs on at a steady speed to the catch. The
// ball's path, its velocity (across dashed, up solid — rule 2) and the
// runner's (across, so dashed); the drop to the catch as a bracket.
//
// Everything that moves is read from js/core/bridge.js (rule 4): the ball's
// position relative to the point of projection, the runner's distance along.
// The bridge's height is the stage's: the catch is drawn at a runner's hand.

import { pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, sig3, hudBoxes, withAlpha } from './util.js';
import { skyscape, tarmac, grass, fitSide, env, rng, softShadow } from './scenery.js';
import { thrower, throwerHand, runner, phaseFor, ballAt, lampPost } from './figures.js';
import { T, num } from '../notation.js';

const HAND = 1.3;                      // where a runner catches, m above the road
const PERSON = 1.7;                    // a person's height, m

/** The footbridge end on, at x0..x1 (m along the road), deck at `deck` m: a
    deep fascia beam under the walkway, a balustrade of mesh panels under a
    handrail, a pier on a footing on the far verge, and the steps down to the
    near verge on the side away from the throw (`side` −1 or +1). */
function footbridge(g, X, Y, k, x0, x1, deck, side) {
  const E = env(), r = rng(7);
  const con = E.night ? '#77727a' : '#d3ccc4', conDk = E.night ? '#4b474d' : '#9c948d', conLt = E.night ? '#8c8790' : '#e6e0d9';
  const rail = E.night ? '#3a3d44' : '#4d5560', mesh = E.night ? 'rgba(160,170,185,0.45)' : 'rgba(70,80,95,0.4)';
  const L0 = Math.min(X(x0), X(x1)), R0 = Math.max(X(x0), X(x1)), pc = (L0 + R0) / 2, oy = Y(0);
  // its shadow on the road and the verge
  softShadow(g, pc, oy + 2, (R0 - L0) * 0.7, k * 0.22, 0.5);
  // the pier on a footing, behind the road
  const pw = Math.max(12, k * 0.75), ft = Math.max(5, k * 0.25);
  const pg = g.createLinearGradient(pc - pw / 2, 0, pc + pw / 2, 0);
  pg.addColorStop(0, conLt); pg.addColorStop(0.55, con); pg.addColorStop(1, conDk);
  g.fillStyle = pg; g.fillRect(pc - pw / 2, Y(deck), pw, oy - Y(deck) - ft);
  g.fillStyle = conDk; g.fillRect(pc - pw * 0.8, oy - ft * 1.6, pw * 1.6, ft);
  g.strokeStyle = withAlpha('#000000', 0.1); g.lineWidth = 1;
  for (let y = Y(deck) + 14; y < oy - ft * 1.6; y += Math.max(10, k * 0.6)) { g.beginPath(); g.moveTo(pc - pw / 2, y); g.lineTo(pc + pw / 2, y); g.stroke(); }
  // the steps down to the near verge, beyond the deck on the far side from the throw
  const sx = side > 0 ? L0 : R0, run = Math.max(40, (Y(0) - Y(deck)) * 0.9), n = Math.max(6, Math.round((oy - Y(deck)) / 9));
  const sgr = g.createLinearGradient(0, Y(deck), 0, oy);
  sgr.addColorStop(0, con); sgr.addColorStop(1, conDk);
  g.fillStyle = sgr;
  g.beginPath(); g.moveTo(sx, Y(deck)); for (let i = 1; i <= n; i++) { const xx = sx - side * (run * i) / n, yy = Y(deck) + ((oy - Y(deck)) * i) / n; g.lineTo(xx, yy - (oy - Y(deck)) / n); g.lineTo(xx, yy); } g.lineTo(sx, oy); g.closePath(); g.fill();
  // the treads lit, and a stringer under them
  g.strokeStyle = conLt; g.lineWidth = 1.5;
  for (let i = 1; i <= n; i++) { const xx = sx - side * (run * i) / n, yy = Y(deck) + ((oy - Y(deck)) * i) / n - (oy - Y(deck)) / n; g.beginPath(); g.moveTo(xx + side * (run / n), yy); g.lineTo(xx, yy); g.stroke(); }
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = Math.max(2, k * 0.08);
  g.beginPath(); g.moveTo(sx, Y(deck) + 6); g.lineTo(sx - side * run * 0.92, oy - 3); g.stroke();
  g.strokeStyle = rail; g.lineWidth = Math.max(2, k * 0.06);
  g.beginPath(); g.moveTo(sx, Y(deck + 1.0)); g.lineTo(sx - side * run, oy - k * 1.0); g.stroke();
  // the deck: the walkway's edge, then a deep fascia beam in shade
  const th = Math.max(9, k * 0.35), beam = Math.max(10, k * 0.55);
  g.fillStyle = conLt; g.fillRect(L0 - 4, Y(deck) - 2, R0 - L0 + 8, th * 0.5);
  const fg = g.createLinearGradient(0, Y(deck), 0, Y(deck) + th + beam);
  fg.addColorStop(0, con); fg.addColorStop(1, conDk);
  g.fillStyle = fg; g.fillRect(L0, Y(deck) + th * 0.4, R0 - L0, th + beam * 0.6);
  g.fillStyle = withAlpha('#000000', 0.22); g.fillRect(L0, Y(deck) + th * 1.4 + beam * 0.6 - 3, R0 - L0, 3);
  for (let x = L0 + 10; x < R0 - 6; x += 22 + r() * 6) { g.strokeStyle = withAlpha('#000000', 0.07); g.beginPath(); g.moveTo(x, Y(deck) + th * 0.5); g.lineTo(x, Y(deck) + th * 1.3 + beam * 0.5); g.stroke(); }
  // the balustrade: mesh panels between posts, a handrail on top
  const top = Y(deck + 1.1), nP = Math.max(2, Math.round((x1 - x0) / 1.0));
  for (let i = 0; i < nP; i++) {
    const a = L0 + ((R0 - L0) * i) / nP, b = L0 + ((R0 - L0) * (i + 1)) / nP;
    g.strokeStyle = mesh; g.lineWidth = 1;
    for (let x = a + 4; x < b; x += 5) { g.beginPath(); g.moveTo(x, Y(deck)); g.lineTo(Math.min(b, x + 6), top); g.stroke(); }
  }
  g.strokeStyle = rail; g.lineCap = 'round';
  g.lineWidth = Math.max(2, k * 0.06);
  for (let i = 0; i <= nP; i++) { const x = L0 + ((R0 - L0) * i) / nP; g.beginPath(); g.moveTo(x, Y(deck)); g.lineTo(x, top); g.stroke(); }
  g.lineWidth = Math.max(3, k * 0.09); g.beginPath(); g.moveTo(L0 - 2, top); g.lineTo(R0 + 2, top); g.stroke();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'bridge') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 4); for (const b of HB) L.reserve(b);
  // on a phone the readouts take the top left, so the scene runs the other way:
  // the bridge on the right, the runner heading left, the catch below the readouts
  const s = phone ? -1 : 1, al = (a) => (s > 0 ? a : a === 'left' ? 'right' : a === 'right' ? 'left' : a);

  // ── heights above the road: the catch at a runner's hand, the throw the drop above it
  const Hp = f.drop + HAND;
  const pts = [];
  for (let i = 0; i <= 120; i++) { const q = f.pos((i / 120) * f.tMax); pts.push({ x: q.x, y: Hp + q.y }); }
  const reach = Math.max(f.xCatch + 2.6, ...pts.map((p) => p.x + 1));
  const box = s > 0 ? { xLo: -3.6, xHi: reach, yLo: -1.2, yHi: Math.max(...pts.map((p) => p.y)) + 0.8 }
    : { xLo: -reach, xHi: 3.6, yLo: -1.2, yHi: Math.max(...pts.map((p) => p.y)) + 0.8 };
  const area = { left: phone ? 10 : HB[0].w + 24, right: w - (phone ? 10 : 18), top: phone ? 30 : 26, bottom: h - 14 };
  // on a phone the ground sits low, so the throw and the catch are below the readouts
  const fit = fitSide(box, area, { sky: phone ? 0.97 : 0.35 }), k = fit.k, Y = fit.Y;
  const X = (x) => fit.X(s * x);
  const oy = Y(0), horizon = Y(Math.min(Hp * 0.45, 2.2)), road = Math.max(18, k * 0.9);
  // her feet, on the deck, are a hand's height below the point of projection
  const H = PERSON * k, hand = throwerHand(H, f.alpha), deck = Hp - hand.y / k;

  // ── the place: sky, fields, lamp posts clear of the labels, the road, the footbridge
  skyscape(g, 0, 0, w, horizon, { seed: 61, far: 'trees' });
  grass(g, 0, w, horizon, oy, { seed: 5 });
  tarmac(g, 0, w, oy, { depth: road });
  grass(g, 0, w, oy + road, h, { seed: 9 });
  for (const lx of [-3.0, f.xCatch + 2.3]) lampPost(g, X(lx), oy, k * 4.5, { dir: s });
  footbridge(g, X, Y, k, -1.5, 1.1, deck, s);

  // ── the thrower: her hand at the point of projection, the ball in it until the throw
  thrower(g, X(0) - s * hand.x, Y(deck), H, P, { dir: s, pose: 1, aim: clamp(f.alpha, -60, 80) });

  // ── the ball and where it is
  const b = f.pos(t), v = f.vel(t), bx = X(b.x), by = Y(Hp + b.y);

  // ── the runner: directly below at the throw; reaching for the ball as it comes, holding it at the catch
  const xr = f.runner(t), Lr = PERSON * k, toGo = f.tMax - t;
  const reachTo = toGo < 0.35 * Math.max(1, f.tMax / 2.4) ? { x: bx, y: by } : null;
  // the body an arm's length behind the ball it is reaching for
  runner(g, X(xr) - s * Lr * 0.08, oy, Lr, P, { dir: s, phase: phaseFor('runner', Lr, Math.abs(X(xr) - X(0))), ring: P.second, reach: reachTo });
  if (show.velocity !== false && t < f.tMax - 1e-9) {
    const ax = X(xr) - s * Lr * 0.35, ay = Y(HAND * 0.45), len = Math.max(24, f.V * k * 0.35);
    arrow(g, ax, ay, ax - s * len, ay, { color: P.vel, width: 2.2, head: 8, dash: [6, 4] });
    L.add(T`${sig3(f.V)} [m s^-1]`, ax - s * (len + 6), ay, { color: P.vel, align: al('right'), pri: 7, size: 13, weight: 700 });
  }

  // ── the path: all of it faintly, flown strongly; the ball and its velocity
  const px = pts.map((p) => ({ x: X(p.x), y: Y(p.y) }));
  stroke(g, px, { color: P.disp, width: 1.6, alpha: 0.3 });
  const flown = []; for (let i = 0; i <= 60; i++) { const q = f.pos((i / 60) * t); flown.push({ x: X(q.x), y: Y(Hp + q.y) }); }
  if (t > 0) stroke(g, flown, { color: P.disp, width: 2.6 });
  if (show.velocity !== false && t < f.tMax - 1e-9) {
    const sc = clamp(k * 0.12, 3, 8);
    if (show.components) {
      arrow(g, bx, by, bx + s * v.x * sc, by, { color: P.velVec, width: 2, head: 8, dash: [5, 4] });
      arrow(g, bx + s * v.x * sc, by, bx + s * v.x * sc, by - v.y * sc, { color: P.velVec, width: 2, head: 8 });
    }
    arrow(g, bx, by, bx + s * v.x * sc, by - v.y * sc, { color: P.vel, width: 2.6, head: 10 });
  }
  ballAt(g, bx, by, clamp(k * 0.11, 6, 10));
  for (const p of px.filter((_, i) => i % 6 === 0)) L.reserve({ x: p.x - 4, y: p.y - 4, w: 8, h: 8 });

  // ── the catch: a ring and a burst of chalk-white at the hand, and the drop to it
  const { age, life } = ageOf(t, f.tMax, f.tMax);
  pulse(g, X(f.xCatch), Y(HAND), age, life, P.mark, { radius: 26 });
  pulse(g, X(f.xCatch), Y(HAND), age * 1.4, life, P.second, { radius: 16 });
  const dx = X(f.xCatch) + s * Math.max(26, k * 0.9);
  stroke(g, [{ x: X(0) + s * 6, y: Y(Hp) }, { x: dx + s * 6, y: Y(Hp) }], { color: P.muted, width: 1, alpha: 0.7, dash: [4, 4] });
  stroke(g, [{ x: dx, y: Y(Hp) }, { x: dx, y: Y(HAND) }], { color: P.disp, width: 1.6 });
  for (const yy of [Y(Hp), Y(HAND)]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.disp, width: 1.6 });
  L.add(T`${num(f.drop, 2, { trim: true })} [m] "below"`, dx + s * 8, (Y(Hp) + Y(HAND)) / 2, { color: P.disp, align: al('left'), pri: 8, size: 14, weight: 700 });
  if (t >= f.tMax - 1e-9) {
    L.add(T`"caught," t = ${num(f.T, 2, { trim: true })} [s]`, X(f.xCatch) - s * 14, Y(HAND) - Lr * 0.7, { color: P.mark, align: al('right'), pri: 9, size: 14, weight: 700 });
  }
  // the distance along the road to the catch, held under its own ruler
  const ry = oy + road + 14;
  stroke(g, [{ x: X(0), y: ry }, { x: X(f.xCatch), y: ry }], { color: P.ink, width: 1.2, alpha: 0.8 });
  for (const xx of [X(0), X(f.xCatch)]) stroke(g, [{ x: xx, y: ry - 5 }, { x: xx, y: ry + 5 }], { color: P.ink, width: 1.2, alpha: 0.8 });
  L.add(T`${sig3(f.xCatch)} [m]`, (X(0) + X(f.xCatch)) / 2, ry + 14, { color: P.ink, align: 'center', pri: 10, size: 13, weight: 700 });
  L.draw(g, w, h);
  return null;
}
