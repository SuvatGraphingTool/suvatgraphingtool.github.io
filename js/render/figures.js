// figures.js — the things that move, or stand, in a straight-line question.
//
// A paper says "a cyclist", "a train", "a motorcycle", "a girl running a
// race", and the stage should show that, not a lorry standing in for all of
// them. Every figure here is drawn the same way, so any stage can use any of
// them:
//
//     car(g, X, Y, L, P, opts)
//
//   · (X, Y) is the FRONT of the figure, standing on the line y = Y — the
//     road surface, the top of the rail, the track. It faces +x (to the
//     right) unless `opts.dir` is −1, when it is mirrored about X and faces
//     left, still with its front at X.
//   · L is its drawn length in px — for the runner, her height.
//   · P is palette() from ./util.js.
//   · opts.phase ∈ [0, 1) turns the wheels and moves the legs: one whole
//     cycle of the figure's own gait (a turn of a car wheel, a turn of the
//     cranks, a running stride). phaseFor(kind, L, travelled px) gives the
//     phase for a distance, so the wheels roll without slipping and stop when
//     the figure stops (pass { cars } for a train of more than one). Leave
//     it out for a still figure.
//   · opts.ring — an outline colour, to tell B from A (P.second, usually).
//
// The figures are drawn in the page's own ink: a card fill, a strong outline,
// faint glass. They never take a quantity's hue (CLAUDE.md rule 2) — colour
// on this site means velocity, displacement or acceleration, and the vehicle
// is the thing those are about. That is the stadium's ball, and the road's
// lorry, and it is every figure here. They draw no text, so a mirrored one
// never reads backwards; anything they need saying is the stage's label.
//
// Not to scale with one another: a real cyclist is a seventh of a lorry and
// would vanish beside it. SIZE says how long each is drawn next to a lorry of
// length 1, which is what keeps one stage's traveller the same visual weight
// whichever it is.
//
// Also here: the point posts (A, B, X, Y, M), traffic lights, and the three
// surfaces a figure stands on — a road, a railway track, a running track —
// so two parallel tracks are two calls to rails().

import { stroke, dot, ballSprite } from './util.js';

const TAU = Math.PI * 2;

/** Draw `body` in a frame with the figure's front at the origin, facing +x
    (or mirrored about X when dir is −1). */
function at(g, X, Y, dir, body) {
  g.save();
  g.translate(X, Y);
  if (dir === -1) g.scale(-1, 1);
  body();
  g.restore();
}

/** A solid wheel: a dark tyre, a hub in the card colour, and — when `bar` —
    a bar across the hub, which is what shows it turning. */
function solidWheel(g, cx, cy, r, P, angle, bar = true) {
  g.fillStyle = P.strong; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  g.fillStyle = P.card; g.beginPath(); g.arc(cx, cy, r * 0.4, 0, TAU); g.fill();
  if (bar && r >= 4) {
    const c = Math.cos(angle) * r * 0.4, s = Math.sin(angle) * r * 0.4;
    g.strokeStyle = P.strong; g.lineWidth = Math.max(1.2, r * 0.14); g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - c, cy - s); g.lineTo(cx + c, cy + s); g.stroke();
  }
}

/** A spoked wheel: a rim, eight spokes, a hub. The bicycle's. */
function spokedWheel(g, cx, cy, r, P, angle, { tyre = 1 } = {}) {
  g.save();
  g.strokeStyle = P.faint; g.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    const a = angle + (k * Math.PI) / 4;
    const c = Math.cos(a) * r * 0.92, s = Math.sin(a) * r * 0.92;
    g.beginPath(); g.moveTo(cx - c, cy - s); g.lineTo(cx + c, cy + s); g.stroke();
  }
  g.strokeStyle = P.strong; g.lineWidth = Math.max(1.8, r * 0.13 * tyre);
  g.beginPath(); g.arc(cx, cy, r - g.lineWidth / 2, 0, TAU); g.stroke();
  g.fillStyle = P.strong; g.beginPath(); g.arc(cx, cy, Math.max(1.4, r * 0.1), 0, TAU); g.fill();
  g.restore();
}

/** Two-link leg (or arm): from the hip H to the foot F, the knee bent towards
    `side` (+1 ahead of the line, −1 behind). Returns the knee. */
function joint(H, F, l1, l2, side) {
  const dx = F.x - H.x, dy = F.y - H.y;
  const d = Math.min(Math.hypot(dx, dy), (l1 + l2) * 0.999);
  const a0 = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1))));
  const k1 = { x: H.x + l1 * Math.cos(a0 - al), y: H.y + l1 * Math.sin(a0 - al) };
  const k2 = { x: H.x + l1 * Math.cos(a0 + al), y: H.y + l1 * Math.sin(a0 + al) };
  return (k1.x - k2.x) * side >= 0 ? k1 : k2;
}

function limb(g, pts, color, width) {
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.stroke();
}

/* ── vehicles ──────────────────────────────────────────────────────────── */

/** The lorry: a cab and a box trailer. Moved here from js/render/road.js,
    unchanged, pixel for pixel. Its hubs are round, so it shows no turning. */
export function lorry(g, X, Y, L, P, { dir = 1, ring = null } = {}) {
  const H = L * 0.36, cabW = L * 0.26, wheel = L * 0.075;
  // Facing right it is drawn where it stands, with no transform, so it is
  // the road's lorry to the pixel (arcs through a transform anti-alias
  // differently); facing left it goes through at() like every other figure.
  const draw = (X, Y) => {
    const back = X - L;
    // the box
    g.fillStyle = P.card; g.strokeStyle = ring || P.strong; g.lineWidth = ring ? 2.4 : 1.6;
    g.beginPath(); g.roundRect(back, Y - wheel - H, L - cabW - 4, H, 3); g.fill(); g.stroke();
    // the cab
    g.beginPath();
    g.moveTo(X - cabW, Y - wheel); g.lineTo(X - cabW, Y - wheel - H * 0.82);
    g.lineTo(X - cabW * 0.35, Y - wheel - H * 0.82); g.lineTo(X, Y - wheel - H * 0.38);
    g.lineTo(X, Y - wheel); g.closePath(); g.fill(); g.stroke();
    // the window
    g.fillStyle = P.faint;
    g.beginPath();
    g.moveTo(X - cabW * 0.82, Y - wheel - H * 0.72); g.lineTo(X - cabW * 0.4, Y - wheel - H * 0.72);
    g.lineTo(X - cabW * 0.1, Y - wheel - H * 0.44); g.lineTo(X - cabW * 0.82, Y - wheel - H * 0.44);
    g.closePath(); g.fill();
    // wheels
    for (const wx of [back + L * 0.14, back + L * 0.3, X - cabW * 0.5]) solidWheel(g, wx, Y - wheel, wheel, P, 0, false);
  };
  if (dir === -1) at(g, X, Y, dir, () => draw(0, 0));
  else { g.save(); draw(X, Y); g.restore(); }
}

/** A car: a saloon, side on, the shape js/render/lanes.js draws. */
export function car(g, X, Y, L, P, { dir = 1, ring = null, phase = 0 } = {}) {
  const H = L * 0.34, wheel = L * 0.1;
  at(g, X, Y, dir, () => {
    const X = 0, Y = 0, back = -L;
    g.fillStyle = P.card; g.strokeStyle = ring || P.strong; g.lineWidth = ring ? 2.4 : 1.6;
    g.beginPath();
    g.moveTo(back, Y - wheel); g.lineTo(back, Y - wheel - H * 0.55);
    g.lineTo(back + L * 0.24, Y - wheel - H * 0.6); g.lineTo(back + L * 0.38, Y - wheel - H);
    g.lineTo(X - L * 0.3, Y - wheel - H); g.lineTo(X - L * 0.14, Y - wheel - H * 0.58);
    g.lineTo(X, Y - wheel - H * 0.5); g.lineTo(X, Y - wheel); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = P.faint;
    g.beginPath(); g.moveTo(back + L * 0.42, Y - wheel - H * 0.9); g.lineTo(X - L * 0.33, Y - wheel - H * 0.9);
    g.lineTo(X - L * 0.2, Y - wheel - H * 0.62); g.lineTo(back + L * 0.32, Y - wheel - H * 0.62); g.closePath(); g.fill();
    for (const wx of [back + L * 0.22, X - L * 0.22]) solidWheel(g, wx, Y - wheel, wheel, P, phase * TAU);
  });
}

/** A train on rails: `cars` carriages (default 1) in length L, the front one
    with a cab and a sloped nose, the rest with a row of windows; two bogies
    under each. Its wheels sit on y = Y, the top of the rail — draw rails()
    under it. */
function trainSize(L, cars) {
  const n = Math.max(1, Math.round(cars));
  const gap = n > 1 ? Math.max(3, L * 0.025) : 0;
  const c = (L - gap * (n - 1)) / n;
  const H = Math.min(c * 0.42, L * 0.3);
  return { n, gap, c, H, wr: Math.max(2.4, H * 0.16) };
}
const trainWheel = (L, cars) => trainSize(L, cars).wr;
export function train(g, X, Y, L, P, { dir = 1, ring = null, phase = 0, cars = 1 } = {}) {
  const { n, gap, c, H, wr } = trainSize(L, cars);
  at(g, X, Y, dir, () => {
    const base = -wr * 1.4;
    for (let i = 0; i < n; i++) {
      const front = -i * (c + gap), back = front - c;
      // the bogies first, so the body sits over their tops
      for (const bx of [back + c * 0.16, front - c * 0.16]) {
        g.fillStyle = P.strong; g.fillRect(bx - wr * 2.2, base - wr * 0.2, wr * 4.4, wr * 0.9);
        for (const k of [-1, 1]) solidWheel(g, bx + k * wr * 1.15, -wr, wr, P, phase * TAU, wr >= 4);
      }
      g.fillStyle = P.card; g.strokeStyle = ring || P.strong; g.lineWidth = ring ? 2.4 : 1.6;
      g.beginPath();
      if (i === 0) {
        g.moveTo(back, base); g.lineTo(back, base - H);
        g.lineTo(front - c * 0.16, base - H);
        g.quadraticCurveTo(front, base - H, front, base - H * 0.38);
        g.lineTo(front, base);
      } else {
        g.roundRect(back, base - H, c, H, Math.min(4, H * 0.15));
      }
      g.closePath(); g.fill(); g.stroke();
      // a line along the body, under the windows
      stroke(g, [{ x: back + 2, y: base - H * 0.3 }, { x: front - (i === 0 ? c * 0.02 : 2), y: base - H * 0.3 }],
        { color: P.faint, width: Math.max(1, H * 0.05) });
      // the windows, and the cab's windscreen on the front one
      g.fillStyle = P.faint;
      const wEnd = i === 0 ? front - c * 0.24 : front - c * 0.06;
      const ww = Math.max(3, c * 0.075), step = Math.max(ww + 2, c * 0.12);
      for (let wx = back + c * 0.06; wx + ww <= wEnd; wx += step) g.fillRect(wx, base - H * 0.8, ww, H * 0.34);
      if (i === 0) {
        g.beginPath(); g.moveTo(front - c * 0.17, base - H * 0.8); g.lineTo(front - c * 0.065, base - H * 0.8);
        g.lineTo(front - c * 0.02, base - H * 0.46); g.lineTo(front - c * 0.17, base - H * 0.46); g.closePath(); g.fill();
      }
      // the coupling to the one in front
      if (i > 0) stroke(g, [{ x: front, y: base - H * 0.2 }, { x: front + gap, y: base - H * 0.2 }], { color: P.strong, width: 2 });
    }
  });
}

/** A cyclist: a diamond-framed bicycle, spoked wheels, a rider whose legs go
    round with the cranks. phase is a turn of the cranks; the wheels turn
    GEAR times for each. */
const GEAR = 2.5;
export function cyclist(g, X, Y, L, P, { dir = 1, ring = null, phase = 0 } = {}) {
  const r = L * 0.2;
  const ink = ring || P.strong;
  at(g, X, Y, dir, () => {
    const RH = { x: -L + r, y: -r }, FH = { x: -r, y: -r };
    const BB = { x: -L * 0.5, y: -r * 0.95 };
    const SEAT = { x: -L * 0.62, y: -r - L * 0.36 };
    const HT = { x: -L * 0.27, y: -r - L * 0.33 }, HB = { x: -L * 0.3, y: -r - L * 0.2 };
    const BAR = { x: -L * 0.2, y: -r - L * 0.4 };
    const crank = L * 0.085, ca = phase * TAU;
    const HIP = { x: SEAT.x + L * 0.02, y: SEAT.y - L * 0.04 };
    const SH = { x: -L * 0.34, y: -r - L * 0.62 };
    const thigh = L * 0.27, shin = L * 0.27;
    const foot = (a) => ({ x: BB.x + crank * Math.cos(a), y: BB.y + crank * Math.sin(a) });
    const lw = Math.max(2.2, L * 0.045);
    // the far leg, behind the frame
    const F2 = foot(ca + Math.PI);
    limb(g, [HIP, joint(HIP, F2, thigh, shin, 1), F2], P.faint, lw);
    spokedWheel(g, RH.x, RH.y, r, P, -ca * GEAR);
    spokedWheel(g, FH.x, FH.y, r, P, -ca * GEAR);
    // the frame
    g.strokeStyle = ink; g.lineWidth = Math.max(1.8, L * 0.03); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(RH.x, RH.y); g.lineTo(BB.x, BB.y); g.lineTo(SEAT.x, SEAT.y); g.lineTo(RH.x, RH.y);
    g.moveTo(SEAT.x, SEAT.y); g.lineTo(HT.x, HT.y); g.lineTo(HB.x, HB.y); g.lineTo(BB.x, BB.y);
    g.moveTo(HT.x, HT.y); g.lineTo(FH.x, FH.y);
    g.moveTo(HT.x, HT.y); g.lineTo(BAR.x, BAR.y);
    g.stroke();
    // the saddle
    limb(g, [{ x: SEAT.x - L * 0.05, y: SEAT.y - 1 }, { x: SEAT.x + L * 0.05, y: SEAT.y - 1 }], ink, Math.max(2.4, L * 0.04));
    // the rider: trunk, arm to the bars, head
    limb(g, [HIP, SH], ink, lw * 1.5);
    limb(g, [SH, joint(SH, BAR, L * 0.16, L * 0.16, -1), BAR], ink, lw);
    g.fillStyle = ink; g.beginPath(); g.arc(SH.x + L * 0.06, SH.y - L * 0.1, L * 0.07, 0, TAU); g.fill();
    // the near leg, and its crank
    const F1 = foot(ca);
    stroke(g, [BB, F1], { color: ink, width: Math.max(1.6, L * 0.025) });
    limb(g, [HIP, joint(HIP, F1, thigh, shin, 1), F1], ink, lw);
  });
}

/** A motorcycle and its rider: heavy wheels, a tank and seat, the rider
    tucked forward in a helmet. */
export function motorcycle(g, X, Y, L, P, { dir = 1, ring = null, phase = 0 } = {}) {
  const r = L * 0.19;
  const ink = ring || P.strong;
  at(g, X, Y, dir, () => {
    const RH = { x: -L + r, y: -r }, FH = { x: -r, y: -r };
    const wheel = (c) => {
      // a fat tyre as a ring, so it reads as a wheel and not a disc
      const tw = r * 0.34;
      g.strokeStyle = P.strong; g.lineWidth = tw;
      g.beginPath(); g.arc(c.x, c.y, r - tw / 2, 0, TAU); g.stroke();
      g.strokeStyle = P.faint; g.lineWidth = Math.max(1, r * 0.08);
      for (let k = 0; k < 3; k++) {
        const a = phase * TAU + (k * Math.PI) / 3, cx = Math.cos(a) * (r - tw), sy = Math.sin(a) * (r - tw);
        g.beginPath(); g.moveTo(c.x - cx, c.y - sy); g.lineTo(c.x + cx, c.y + sy); g.stroke();
      }
      g.fillStyle = P.strong; g.beginPath(); g.arc(c.x, c.y, r * 0.16, 0, TAU); g.fill();
    };
    wheel(RH); wheel(FH);
    // the fork, and the swing arm
    stroke(g, [{ x: -L * 0.3, y: -r * 2.55 }, FH], { color: ink, width: Math.max(2, L * 0.035) });
    stroke(g, [RH, { x: -L * 0.5, y: -r * 1.2 }], { color: ink, width: Math.max(2, L * 0.03) });
    // the body: tail, seat, tank, down to the engine
    g.fillStyle = P.card; g.strokeStyle = ink; g.lineWidth = ring ? 2.4 : 1.6; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-L * 0.9, -r * 1.75); g.lineTo(-L * 0.84, -r * 2.15);
    g.lineTo(-L * 0.56, -r * 2.1); g.lineTo(-L * 0.47, -r * 2.5);
    g.lineTo(-L * 0.3, -r * 2.45); g.lineTo(-L * 0.33, -r * 1.75);
    g.lineTo(-L * 0.42, -r * 1.05); g.lineTo(-L * 0.62, -r * 1.05);
    g.lineTo(-L * 0.68, -r * 1.7); g.closePath(); g.fill(); g.stroke();
    // the engine, a block under the tank
    g.fillStyle = P.faint; g.fillRect(-L * 0.6, -r * 1.7, L * 0.2, r * 0.55);
    // the rider, leaning into it
    const HIP = { x: -L * 0.64, y: -r * 2.3 }, KNEE = { x: -L * 0.45, y: -r * 2.05 }, FOOT = { x: -L * 0.54, y: -r * 1.25 };
    const SH = { x: -L * 0.45, y: -r * 3.25 }, BAR = { x: -L * 0.27, y: -r * 2.75 };
    const lw = Math.max(2.2, L * 0.04);
    limb(g, [HIP, KNEE, FOOT], ink, lw * 1.2);
    limb(g, [HIP, SH], ink, lw * 1.5);
    limb(g, [SH, joint(SH, BAR, L * 0.13, L * 0.13, -1), BAR], ink, lw);
    const hx = SH.x + L * 0.06, hy = SH.y - L * 0.085, hr = L * 0.068;
    g.fillStyle = ink; g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.fill();
    g.fillStyle = P.faint; g.beginPath(); g.arc(hx, hy, hr * 0.7, -0.6, 0.5); g.lineTo(hx, hy); g.closePath(); g.fill();
  });
}

/* ── people ────────────────────────────────────────────────────────────── */

/** A runner, L tall, mid-stride: legs and arms swing with phase (one stride,
    both feet). `still` stands her upright instead, for a runner at rest. */
export function runner(g, X, Y, L, P, { dir = 1, ring = null, phase = 0, still = false } = {}) {
  const ink = ring || P.strong;
  const thigh = L * 0.25, shin = L * 0.26, upper = L * 0.16, fore = L * 0.15;
  const hx = -L * 0.2;
  // each leg: the thigh's swing from vertical (forward +), the knee's bend
  const leg = (p) => {
    if (still) return { th: 0, bend: 0.05 };
    const th = 0.55 * Math.sin(p);
    // the knee folds most as the leg swings through, behind the body
    const bend = 0.2 + 1.25 * Math.max(0, Math.sin(p - 1.9)) ** 1.4 + 0.25 * Math.max(0, Math.cos(p));
    return { th, bend };
  };
  const pose = (p, hip) => {
    const { th, bend } = leg(p);
    const K = { x: hip.x + thigh * Math.sin(th), y: hip.y + thigh * Math.cos(th) };
    const F = { x: K.x + shin * Math.sin(th - bend), y: K.y + shin * Math.cos(th - bend) };
    return [hip, K, F];
  };
  const a = phase * TAU;
  // the lower foot touches the ground: the body bobs, the feet do not sink
  const probe = { x: hx, y: 0 };
  const low = Math.max(pose(a, probe)[2].y, pose(a + Math.PI, probe)[2].y);
  const HIP = { x: hx, y: -low };
  const lean = still ? 0.02 : 0.16;
  const SH = { x: hx + Math.sin(lean) * L * 0.3, y: HIP.y - Math.cos(lean) * L * 0.3 };
  const arm = (p) => {
    if (still) return [SH, { x: SH.x, y: SH.y + upper }, { x: SH.x + fore * 0.15, y: SH.y + upper + fore }];
    const s = -0.7 * Math.sin(p);
    const E = { x: SH.x + upper * Math.sin(s), y: SH.y + upper * Math.cos(s) };
    const f = s + 1.6;
    return [SH, E, { x: E.x + fore * Math.sin(f), y: E.y + fore * Math.cos(f) }];
  };
  const lw = Math.max(2.4, L * 0.05);
  at(g, X, Y, dir, () => {
    limb(g, pose(a + Math.PI, HIP), P.faint, lw);
    limb(g, arm(a + Math.PI), P.faint, lw * 0.9);
    limb(g, [HIP, SH], ink, lw * 1.6);
    limb(g, pose(a, HIP), ink, lw);
    limb(g, arm(a), ink, lw * 0.9);
    g.fillStyle = ink; g.beginPath();
    g.arc(SH.x + Math.sin(lean) * L * 0.11, SH.y - L * 0.11, L * 0.075, 0, TAU); g.fill();
  });
}

/* ── particles ─────────────────────────────────────────────────────────── */

/** A ball, L across, resting on y = Y with its front at X — the stadium's
    ball (ballSprite), so a ball looks the same everywhere. */
export function ball(g, X, Y, L, P, { dir = 1, ring = null } = {}) {
  ballSprite(g, X - (dir * L) / 2, Y - L / 2, L / 2, { ring });
}

/** A particle: a plain bead, L across, centred on (X, Y) — the "particle P"
    of a paper, which has no shape to speak of. */
export function particle(g, X, Y, L, P, { ring = null } = {}) {
  dot(g, X, Y, Math.max(3, L / 2), { fill: P.ink, stroke: ring || P.surface, width: ring ? 2.4 : 1.6 });
}

/* ── the catalogue ─────────────────────────────────────────────────────── */

/**
 * Every traveller, by name, for a stage that lets the student choose.
 *   draw      the function above
 *   label     its chip on the values screen
 *   noun      "a ___ braking does not turn round"
 *   verb      the launch button
 *   size      how long it is drawn beside a lorry of length 1 (for the
 *             runner, how tall)
 *   top, mid  where its acceleration and velocity arrows go, as fractions of
 *             a lorry's length above the ground — the lorry's are the road's
 *             own numbers, so nothing moved when the lorry became one of six
 *   ground    what it stands on: 'road', 'rail' or 'track'
 *   cycle     px travelled per unit of phase, per px of L (see phaseFor)
 */
export const FIGURES = {
  lorry:      { draw: lorry,      label: 'Lorry',      noun: 'lorry',      verb: 'Drive', size: 1,    top: 0.36, mid: 0.2,  ground: 'road',  cycle: TAU * 0.075 },
  car:        { draw: car,        label: 'Car',        noun: 'car',        verb: 'Drive', size: 0.8,  top: 0.3,  mid: 0.18, ground: 'road',  cycle: TAU * 0.1 },
  cyclist:    { draw: cyclist,    label: 'Cyclist',    noun: 'cyclist',    verb: 'Ride',  size: 0.6,  top: 0.52, mid: 0.12, ground: 'road',  cycle: TAU * 0.2 * GEAR },
  motorcycle: { draw: motorcycle, label: 'Motorcycle', noun: 'motorcycle', verb: 'Ride',  size: 0.66, top: 0.5,  mid: 0.13, ground: 'road',  cycle: TAU * 0.19 },
  train:      { draw: train,      label: 'Train',      noun: 'train',      verb: 'Drive', size: 1.5,  top: 0.4,  mid: 0.22, ground: 'rail',  cycle: TAU * 0.3 * 0.16 },
  runner:     { draw: runner,     label: 'Runner',     noun: 'runner',     verb: 'Run',   size: 0.62, top: 0.56, mid: 0.3,  ground: 'track', cycle: 1.3 },
};

/** The phase for a figure of drawn size L that has travelled `px` pixels:
    wheels that roll without slipping, a stride that covers the ground. */
export function phaseFor(kind, L, px, { cars = 1 } = {}) {
  const k = FIGURES[kind] || FIGURES.car;
  // a train's wheels are sized from one carriage, so they depend on how many
  const per = Math.max(1, kind === 'train' ? TAU * trainWheel(L, cars) : k.cycle * L);
  return (((px / per) % 1) + 1) % 1;
}

/** Any figure by name: drawFigure(g, 'cyclist', X, Y, L, P, opts). */
export function drawFigure(g, kind, X, Y, L, P, opts = {}) {
  const k = FIGURES[kind] || (kind === 'ball' ? { draw: ball } : kind === 'particle' ? { draw: particle } : FIGURES.lorry);
  k.draw(g, X, Y, L, P, opts);
}

/* ── things that stand still ───────────────────────────────────────────── */

/**
 * A roadside or trackside post with its letter on a plate: A, B, X, Y, the
 * mid-point M. Moved here from js/render/road.js, unchanged. `labels` is the
 * stage's label queue (labels() from ./util.js), so the letter is placed with
 * everything else and keeps the 13px floor.
 */
export function post(g, labels, X, Y, letter, color, P, { dashed = false, height = 92 } = {}) {
  stroke(g, [{ x: X, y: Y + 6 }, { x: X, y: Y - height }], { color, width: 2.4, dash: dashed ? [6, 5] : null });
  g.save();
  g.fillStyle = color; g.beginPath(); g.roundRect(X - 15, Y - height - 26, 30, 28, 6); g.fill();
  g.restore();
  labels.add(letter, X, Y - height - 12, { color: P.surface, align: 'center', pri: 10, size: 17, weight: 700, bg: false });
}

/** Traffic lights: a post H tall standing on y = Y at x, a head of three
    lamps at the top, `lit` one of 'red' | 'amber' | 'green' | null. The lit
    lamp is in its real colour — it is the object, not a quantity. */
export const LAMPS = { red: '#e5484d', amber: '#f5a524', green: '#30a46c' };
export function trafficLights(g, x, Y, H, P, { lit = 'red' } = {}) {
  const hw = Math.max(14, H * 0.17), hh = hw * 2.7, lr = hw * 0.32;
  stroke(g, [{ x, y: Y + 4 }, { x, y: Y - H + hh * 0.5 }], { color: P.strong, width: Math.max(2.4, hw * 0.18) });
  g.save();
  g.fillStyle = P.card; g.strokeStyle = P.strong; g.lineWidth = 1.6;
  g.beginPath(); g.roundRect(x - hw / 2, Y - H - hh / 2, hw, hh, hw * 0.22); g.fill(); g.stroke();
  ['red', 'amber', 'green'].forEach((c, i) => {
    const cy = Y - H - hh / 2 + hh * (0.2 + 0.3 * i);
    g.beginPath(); g.arc(x, cy, lr, 0, TAU);
    if (c === lit) {
      g.fillStyle = LAMPS[c]; g.fill();
      g.globalAlpha = 0.25; g.beginPath(); g.arc(x, cy, lr * 1.7, 0, TAU); g.fill(); g.globalAlpha = 1;
    } else {
      g.fillStyle = P.grid; g.fill(); g.strokeStyle = P.faint; g.lineWidth = 1; g.stroke();
    }
  });
  g.restore();
}

/* ── what they stand on ────────────────────────────────────────────────── */

/** A road, side on, between x0 and x1: its surface is y = Y (where the
    wheels stand), 16 px deep, with a dashed centre line. The road stage's own
    road, moved here unchanged. */
export function roadway(g, x0, x1, Y, P) {
  g.save(); g.fillStyle = P.grid; g.fillRect(x0, Y, x1 - x0, 16); g.restore();
  stroke(g, [{ x: x0, y: Y }, { x: x1, y: Y }], { color: P.axis, width: 2 });
  stroke(g, [{ x: x0, y: Y + 16 }, { x: x1, y: Y + 16 }], { color: P.axis, width: 1.4 });
  stroke(g, [{ x: x0, y: Y + 8 }, { x: x1, y: Y + 8 }], { color: P.faint, width: 1.6, dash: [18, 16] });
}

/** A railway track, side on, between x0 and x1: the rail head at y = Y
    (where a train's wheels stand), sleepers under it, ballast under them.
    Two parallel tracks are two calls at two heights. */
export function rails(g, x0, x1, Y, P, { sleeper = 15 } = {}) {
  g.save();
  // the ballast, sloping out at the ends
  g.fillStyle = P.grid;
  g.beginPath(); g.moveTo(x0, Y + 5); g.lineTo(x1, Y + 5); g.lineTo(x1, Y + 14); g.lineTo(x0, Y + 14); g.closePath(); g.fill();
  // the sleepers, end on
  g.fillStyle = P.faint;
  for (let x = x0 + sleeper / 2; x < x1; x += sleeper) g.fillRect(x - 4, Y + 3, 8, 5);
  // the rail: head, web, foot
  g.fillStyle = P.axis;
  g.fillRect(x0, Y, x1 - x0, 2.4);
  g.restore();
  stroke(g, [{ x: x0, y: Y }, { x: x1, y: Y }], { color: P.strong, width: 2 });
  stroke(g, [{ x: x0, y: Y + 14 }, { x: x1, y: Y + 14 }], { color: P.axis, width: 1.2 });
}

/** A running track, side on: its surface at y = Y, 16 px deep like the
    road, with solid lane lines rather than a dashed centre line. */
export function runningTrack(g, x0, x1, Y, P) {
  g.save(); g.fillStyle = P.grid; g.fillRect(x0, Y, x1 - x0, 16); g.restore();
  stroke(g, [{ x: x0, y: Y }, { x: x1, y: Y }], { color: P.axis, width: 2 });
  stroke(g, [{ x: x0, y: Y + 16 }, { x: x1, y: Y + 16 }], { color: P.axis, width: 1.4 });
  for (const dy of [5.5, 10.5]) stroke(g, [{ x: x0, y: Y + dy }, { x: x1, y: Y + dy }], { color: P.faint, width: 1.2 });
}

/** Whichever surface a figure stands on (FIGURES[kind].ground). */
export function surface(g, ground, x0, x1, Y, P) {
  if (ground === 'rail') rails(g, x0, x1, Y, P);
  else if (ground === 'track') runningTrack(g, x0, x1, Y, P);
  else roadway(g, x0, x1, Y, P);
}
