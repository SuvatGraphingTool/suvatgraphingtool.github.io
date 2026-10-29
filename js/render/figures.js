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

import { stroke, dot, ballSprite, withAlpha } from './util.js';
import { env, softShadow, tarmac, railBed } from './scenery.js';

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


/** A road wheel: a dark tyre with a sidewall, a bright rim, five spokes that
    turn with `angle`, a hub. Detailed enough to read as a wheel at any size. */
function roadWheel(g, cx, cy, r, angle) {
  const E = env();
  g.fillStyle = '#1d1a1b'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = Math.max(1, r * 0.12); g.beginPath(); g.arc(cx, cy, r * 0.84, 0, TAU); g.stroke();
  const rim = g.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r * 0.62);
  rim.addColorStop(0, '#f2eee9'); rim.addColorStop(1, E.night ? '#7d7478' : '#a59c98');
  g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, r * 0.6, 0, TAU); g.fill();
  if (r >= 3.5) {
    g.strokeStyle = 'rgba(40,34,36,0.75)'; g.lineWidth = Math.max(1, r * 0.11); g.lineCap = 'round';
    for (let k = 0; k < 5; k++) { const a = angle + (k * TAU) / 5; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16); g.lineTo(cx + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.52); g.stroke(); }
  }
  g.fillStyle = '#3a3436'; g.beginPath(); g.arc(cx, cy, r * 0.15, 0, TAU); g.fill();
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

/** A car: a saloon, side on — painted body with a sheen, glass with a
    highlight, a door seam, wheels in their arches turning with the distance,
    a headlight at the front and a tail light that glows when `brake` (the
    stage says when it is slowing). A soft shadow under it. `ring` outlines it
    in a hue when it must be told apart. */
export function car(g, X, Y, L, P, { dir = 1, ring = null, phase = 0, brake = false, paint = null } = {}) {
  const H = L * 0.34, wheel = L * 0.1, E = env();
  softShadow(g, X - L * 0.5 * dir, Y + 1, L * 0.55, L * 0.07, 0.9);
  at(g, X, Y, dir, () => {
    const X = 0, Y = 0, back = -L, base = Y - wheel * 0.55;
    const body = () => {
      g.beginPath();
      g.moveTo(back + L * 0.02, base); g.lineTo(back, base - H * 0.18);
      g.quadraticCurveTo(back - L * 0.005, base - H * 0.55, back + L * 0.06, base - H * 0.6);
      g.lineTo(back + L * 0.24, base - H * 0.62);
      g.quadraticCurveTo(back + L * 0.32, base - H * 1.02, back + L * 0.42, base - H * 1.02);
      g.lineTo(X - L * 0.33, base - H * 1.02);
      g.quadraticCurveTo(X - L * 0.24, base - H * 1.0, X - L * 0.15, base - H * 0.62);
      g.quadraticCurveTo(X - L * 0.02, base - H * 0.56, X, base - H * 0.32);
      g.lineTo(X, base - H * 0.1); g.quadraticCurveTo(X, base, X - L * 0.03, base); g.closePath();
    };
    const c = paint || (E.night ? '#7d8796' : '#7f90a6');
    const gr = g.createLinearGradient(0, base - H, 0, base);
    gr.addColorStop(0, withAlpha('#ffffff', 0.0)); gr.addColorStop(0, c); gr.addColorStop(0.55, c); gr.addColorStop(1, '#3d4350');
    body(); g.fillStyle = gr; g.fill();
    g.strokeStyle = ring || 'rgba(20,18,22,0.55)'; g.lineWidth = ring ? 2.4 : 1.2; g.stroke();
    // a sheen along the shoulder
    g.save(); body(); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(back, base - H * 0.62, L, H * 0.08);
    g.restore();
    // glass: one shape split by a pillar, with a highlight
    const glass = g.createLinearGradient(0, base - H * 0.98, 0, base - H * 0.62);
    glass.addColorStop(0, E.night ? '#5f6a7a' : '#c9d6e2'); glass.addColorStop(1, E.night ? '#2c323c' : '#7f93a6');
    g.fillStyle = glass;
    g.beginPath(); g.moveTo(back + L * 0.27, base - H * 0.64); g.quadraticCurveTo(back + L * 0.34, base - H * 0.95, back + L * 0.43, base - H * 0.95);
    g.lineTo(X - L * 0.34, base - H * 0.95); g.quadraticCurveTo(X - L * 0.27, base - H * 0.93, X - L * 0.19, base - H * 0.64); g.closePath(); g.fill();
    g.fillStyle = c; g.fillRect(back + L * 0.55, base - H * 0.96, L * 0.035, H * 0.33);
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = Math.max(1, L * 0.01); g.beginPath(); g.moveTo(back + L * 0.45, base - H * 0.9); g.lineTo(back + L * 0.4, base - H * 0.7); g.stroke();
    // the door seam and handle
    g.strokeStyle = 'rgba(20,18,22,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(back + L * 0.56, base - H * 0.62); g.lineTo(back + L * 0.55, base - H * 0.12); g.stroke();
    g.fillStyle = 'rgba(20,18,22,0.45)'; g.fillRect(back + L * 0.6, base - H * 0.5, L * 0.05, Math.max(1.5, H * 0.04));
    // lights: the headlight at the front, the tail light at the back
    g.fillStyle = E.night ? '#fff3cf' : '#fff8e2'; g.beginPath(); g.ellipse(X - L * 0.02, base - H * 0.36, L * 0.018, H * 0.07, 0, 0, TAU); g.fill();
    if (E.night) { const hl = g.createRadialGradient(X, base - H * 0.36, 0, X, base - H * 0.36, L * 0.3); hl.addColorStop(0, 'rgba(255,240,200,0.35)'); hl.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = hl; g.beginPath(); g.moveTo(X, base - H * 0.36); g.lineTo(X + L * 0.3, base - H * 0.55); g.lineTo(X + L * 0.3, base - H * 0.05); g.closePath(); g.fill(); }
    g.fillStyle = brake ? '#ff3b30' : '#8c2f2a'; g.beginPath(); g.ellipse(back + L * 0.012, base - H * 0.4, L * 0.014, H * 0.08, 0, 0, TAU); g.fill();
    if (brake) { const bl = g.createRadialGradient(back, base - H * 0.4, 0, back, base - H * 0.4, L * 0.16); bl.addColorStop(0, 'rgba(255,70,50,0.55)'); bl.addColorStop(1, 'rgba(255,70,50,0)'); g.fillStyle = bl; g.beginPath(); g.arc(back, base - H * 0.4, L * 0.16, 0, TAU); g.fill(); }
    // wheels in their arches
    for (const wx of [back + L * 0.21, X - L * 0.21]) {
      g.fillStyle = 'rgba(15,13,15,0.65)'; g.beginPath(); g.arc(wx, base, wheel * 1.18, Math.PI, 0); g.fill();
      roadWheel(g, wx, Y - wheel, wheel, phase * TAU);
    }
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
export function train(g, X, Y, L, P, { dir = 1, ring = null, phase = 0, cars = 1, brake = false } = {}) {
  const { n, gap, c, H, wr } = trainSize(L, cars), E = env();
  softShadow(g, X - L * 0.5 * dir, Y + 2, L * 0.52, Math.max(3, H * 0.12), 0.8);
  at(g, X, Y, dir, () => {
    const base = -wr * 1.75;
    for (let i = 0; i < n; i++) {
      const front = -i * (c + gap), back = front - c;
      // the bogies first, so the body sits over their tops
      for (const bx of [back + c * 0.16, front - c * 0.16]) {
        g.fillStyle = '#2e292b'; g.beginPath(); g.roundRect(bx - wr * 2.4, base - wr * 0.2, wr * 4.8, wr * 0.95, wr * 0.3); g.fill();
        for (const k of [-1, 1]) roadWheel(g, bx + k * wr * 1.15, -wr, wr, phase * TAU);
      }
      const shape = () => {
        g.beginPath();
        if (i === 0) {
          g.moveTo(back, base); g.lineTo(back, base - H + 3); g.quadraticCurveTo(back, base - H, back + 3, base - H);
          g.lineTo(front - c * 0.2, base - H);
          g.bezierCurveTo(front - c * 0.02, base - H, front, base - H * 0.55, front, base - H * 0.3);
          g.lineTo(front, base);
        } else g.roundRect(back, base - H, c, H, Math.min(5, H * 0.15));
        g.closePath();
      };
      const gr = g.createLinearGradient(0, base - H, 0, base);
      gr.addColorStop(0, E.night ? '#d9d0c6' : '#f3ece2'); gr.addColorStop(0.75, E.night ? '#b8ada3' : '#dcd2c6'); gr.addColorStop(1, E.night ? '#7d736c' : '#a99d92');
      shape(); g.fillStyle = gr; g.fill();
      g.strokeStyle = ring || 'rgba(30,26,28,0.55)'; g.lineWidth = ring ? 2.4 : 1.2; g.stroke();
      g.save(); shape(); g.clip();
      // a livery stripe low along the body, and the roof darker
      g.fillStyle = E.night ? '#5d6f86' : '#6f8199'; g.fillRect(back, base - H * 0.3, c + 2, H * 0.1);
      g.fillStyle = 'rgba(40,36,38,0.25)'; g.fillRect(back, base - H, c + 2, H * 0.1);
      // windows with glass and a glint, doors between them
      const glass = g.createLinearGradient(0, base - H * 0.78, 0, base - H * 0.44);
      glass.addColorStop(0, E.night ? withAlpha(E.window, 0.85) : '#c9d6e2'); glass.addColorStop(1, E.night ? withAlpha(E.window, 0.5) : '#7f93a6');
      const wEnd = i === 0 ? front - c * 0.26 : front - c * 0.06;
      const ww = Math.max(3, c * 0.075), step = Math.max(ww + 2, c * 0.12);
      let k = 0;
      for (let wx = back + c * 0.06; wx + ww <= wEnd; wx += step, k++) {
        if (k % 4 === 2) { g.strokeStyle = 'rgba(30,26,28,0.45)'; g.lineWidth = 1; g.strokeRect(wx, base - H * 0.82, ww, H * 0.74); continue; }
        g.fillStyle = glass; g.beginPath(); g.roundRect(wx, base - H * 0.78, ww, H * 0.34, Math.min(2, ww * 0.25)); g.fill();
      }
      if (i === 0) {
        g.fillStyle = glass; g.beginPath(); g.moveTo(front - c * 0.2, base - H * 0.84); g.lineTo(front - c * 0.07, base - H * 0.84);
        g.quadraticCurveTo(front - c * 0.02, base - H * 0.7, front - c * 0.015, base - H * 0.5); g.lineTo(front - c * 0.2, base - H * 0.5); g.closePath(); g.fill();
        g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(front - c * 0.02, base - H * 0.22, Math.max(1.5, H * 0.05), 0, TAU); g.fill();
      }
      g.restore();
      if (brake && i === n - 1) { g.fillStyle = '#ff3b30'; g.fillRect(back - 1, base - H * 0.3, 2.5, H * 0.1); }
      // a pantograph on the leading car's roof
      if (i === 0 && H > 10) { g.strokeStyle = E.night ? '#9a9096' : '#5e5157'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(back + c * 0.45, base - H); g.lineTo(back + c * 0.52, base - H - H * 0.35); g.lineTo(back + c * 0.6, base - H); g.moveTo(back + c * 0.45, base - H - H * 0.35); g.lineTo(back + c * 0.6, base - H - H * 0.35); g.stroke(); }
      // the coupling to the one in front
      if (i > 0) stroke(g, [{ x: front, y: base - H * 0.2 }, { x: front + gap, y: base - H * 0.2 }], { color: '#2e292b', width: 2 });
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
    // clockwise on the canvas is rolling forward, as for every wheel here
    spokedWheel(g, RH.x, RH.y, r, P, ca * GEAR);
    spokedWheel(g, FH.x, FH.y, r, P, ca * GEAR);
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
    g.fillStyle = ink; g.beginPath(); g.arc(SH.x + L * 0.045, SH.y - L * 0.075, L * 0.068, 0, TAU); g.fill();
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
    stroke(g, [{ x: -L * 0.24, y: -r * 2.8 }, FH], { color: ink, width: Math.max(2.4, L * 0.04) });
    stroke(g, [RH, { x: -L * 0.5, y: -r * 1.2 }], { color: ink, width: Math.max(2, L * 0.03) });
    // the exhaust, low along the side to the back
    stroke(g, [{ x: -L * 0.48, y: -r * 1.1 }, { x: -L * 0.86, y: -r * 1.35 }], { color: P.faint, width: Math.max(2.4, r * 0.22) });
    // the body: tail, seat, tank and a front fairing, down to the engine
    g.fillStyle = P.card; g.strokeStyle = ink; g.lineWidth = ring ? 2.4 : 1.6; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-L * 0.92, -r * 1.8); g.lineTo(-L * 0.86, -r * 2.25);
    g.lineTo(-L * 0.56, -r * 2.2); g.lineTo(-L * 0.5, -r * 2.65);
    g.lineTo(-L * 0.34, -r * 2.7); g.lineTo(-L * 0.2, -r * 2.95);
    g.lineTo(-L * 0.16, -r * 2.2); g.lineTo(-L * 0.3, -r * 1.7);
    g.lineTo(-L * 0.4, -r * 1.0); g.lineTo(-L * 0.64, -r * 1.0);
    g.lineTo(-L * 0.7, -r * 1.7); g.closePath(); g.fill(); g.stroke();
    // the engine, a block under the tank, and the headlamp
    g.fillStyle = P.faint; g.fillRect(-L * 0.6, -r * 1.75, L * 0.2, r * 0.65);
    g.beginPath(); g.arc(-L * 0.165, -r * 2.45, Math.max(1.6, r * 0.18), 0, TAU); g.fill();
    // the rider, leaning into it
    const HIP = { x: -L * 0.64, y: -r * 2.45 }, KNEE = { x: -L * 0.44, y: -r * 2.2 }, FOOT = { x: -L * 0.54, y: -r * 1.25 };
    const SH = { x: -L * 0.45, y: -r * 3.45 }, BAR = { x: -L * 0.25, y: -r * 3.0 };
    const lw = Math.max(2.8, L * 0.055);
    limb(g, [HIP, KNEE, FOOT], ink, lw * 1.2);
    limb(g, [HIP, SH], ink, lw * 1.5);
    limb(g, [SH, joint(SH, BAR, L * 0.13, L * 0.13, -1), BAR], ink, lw);
    const hx = SH.x + L * 0.05, hy = SH.y - L * 0.075, hr = L * 0.075;
    g.fillStyle = ink; g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.fill();
    g.fillStyle = P.faint; g.beginPath(); g.arc(hx, hy, hr * 0.7, -0.6, 0.5); g.lineTo(hx, hy); g.closePath(); g.fill();
  });
}

/* ── people ────────────────────────────────────────────────────────────── */

/** A runner, L tall, mid-stride: legs and arms swing with phase (one stride,
    both feet). The foot on the ground moves BACK under the hip at the speed
    the ground goes by (FIGURES.runner.cycle is matched to the sweep), so she
    neither skates nor moonwalks. `still` stands her upright, for a runner at
    rest. */
export function runner(g, X, Y, L, P, { dir = 1, ring = null, phase = 0, still = false } = {}) {
  const ink = ring || P.strong;
  const thigh = L * 0.25, shin = L * 0.26, upper = L * 0.16, fore = L * 0.15;
  const hx = -L * 0.2;
  // each leg: the thigh's swing from vertical (forward +) and the knee's bend.
  // Stance is p ∈ (0, π): the thigh sweeps from ahead to behind with the leg
  // nearly straight. Swing is p ∈ (π, 2π): the knee folds and the leg comes
  // through, folded most as it passes under the body.
  const leg = (p) => {
    if (still) return { th: 0.07 * Math.cos(p), bend: 0.04 };
    const q = ((p % TAU) + TAU) % TAU;
    // the thigh sweeps back at a steady rate in stance, so the planted foot
    // stays planted, and comes through at a steady rate in swing
    const th = q < Math.PI ? SWING * (1 - (2 * q) / Math.PI) : SWING * (-1 + (2 * (q - Math.PI)) / Math.PI);
    return { th, bend: STANCE_BEND + 1.45 * Math.max(0, -Math.sin(q)) ** 1.2 };
  };
  const pose = (p, hip) => {
    const { th, bend } = leg(p);
    const K = { x: hip.x + thigh * Math.sin(th), y: hip.y + thigh * Math.cos(th) };
    const F = { x: K.x + shin * Math.sin(th - bend), y: K.y + shin * Math.cos(th - bend) };
    return [hip, K, F];
  };
  const a = phase * TAU;
  // the leg in stance carries her: its foot is on the ground and the body
  // rides on it (the other foot is in the air); standing, both are down
  const probe = { x: hx, y: 0 };
  const inStance = (((a % TAU) + TAU) % TAU) < Math.PI;
  const low = still ? Math.max(pose(a, probe)[2].y, pose(a + Math.PI, probe)[2].y)
    : pose(inStance ? a : a + Math.PI, probe)[2].y;
  const HIP = { x: hx, y: -low };
  const lean = still ? 0 : 0.14;
  const SH = { x: hx + Math.sin(lean) * L * 0.3, y: HIP.y - Math.cos(lean) * L * 0.3 };
  // arms swing against the leg on their own side, elbows bent
  const arm = (p, side) => {
    if (still) return [SH, { x: SH.x + side * L * 0.025, y: SH.y + upper }, { x: SH.x + side * L * 0.035, y: SH.y + upper + fore }];
    const sw = -0.75 * Math.cos(p);
    const E = { x: SH.x + upper * Math.sin(sw), y: SH.y + upper * Math.cos(sw) };
    const f = sw + 1.5;
    return [SH, E, { x: E.x + fore * Math.sin(f), y: E.y + fore * Math.cos(f) }];
  };
  const lw = Math.max(3, L * 0.075);
  // a foot coming through never goes into the ground
  const onTop = ([H, K, F]) => [H, K, { x: F.x, y: Math.min(F.y, 0) }];
  // dressed: a shirt, shorts, skin; the far limbs in shade; a soft shadow
  const E = env(), skin = E.night ? '#b08a74' : '#d9a988', skinFar = E.night ? '#7d6253' : '#b5876a';
  const shirt = ring || (E.night ? '#6c7f9a' : '#5f7392'), shorts = '#2f3340';
  softShadow(g, X + hx * dir, Y + 1, L * 0.22, L * 0.04, 0.8);
  at(g, X, Y, dir, () => {
    const far = onTop(pose(a + Math.PI, HIP)), near = onTop(pose(a, HIP));
    limb(g, far, skinFar, lw); limb(g, far.slice(0, 2), withAlpha(shorts, 0.85), lw * 1.15);
    limb(g, arm(a + Math.PI, -1), skinFar, lw * 0.8);
    limb(g, [HIP, SH], shirt, lw * 2.1);
    limb(g, [HIP, { x: HIP.x + (SH.x - HIP.x) * 0.18, y: HIP.y + (SH.y - HIP.y) * 0.18 }], shorts, lw * 2.15);
    limb(g, near, skin, lw); limb(g, near.slice(0, 2), shorts, lw * 1.15);
    const A = arm(a, 1); limb(g, A, skin, lw * 0.8); limb(g, A.slice(0, 2), shirt, lw * 0.95);
    // shoes
    for (const leg of [far, near]) { g.fillStyle = '#2b2628'; g.beginPath(); g.ellipse(leg[2].x + lw * 0.4, leg[2].y - lw * 0.2, lw * 0.75, lw * 0.4, 0, 0, TAU); g.fill(); }
    // the head, lit from the left, with hair
    const hx2 = SH.x + Math.sin(lean) * L * 0.1, hy2 = SH.y - L * 0.095, hr = L * 0.08;
    const hg = g.createRadialGradient(hx2 - hr * 0.3, hy2 - hr * 0.3, hr * 0.1, hx2, hy2, hr); hg.addColorStop(0, skin); hg.addColorStop(1, skinFar);
    g.fillStyle = hg; g.beginPath(); g.arc(hx2, hy2, hr, 0, TAU); g.fill();
    g.fillStyle = '#3a2c26'; g.beginPath(); g.arc(hx2 - hr * 0.15, hy2 - hr * 0.25, hr * 0.85, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    if (ring) { g.strokeStyle = ring; g.lineWidth = 1.5; g.beginPath(); g.arc(hx2, hy2, hr + 1, 0, TAU); g.stroke(); }
  });
}
/**
 * A person throwing (or kicking off, or dropping): standing side on, feet at
 * (X, Y), H tall, facing +x (or −x when dir is −1). `pose` runs the throw: 0
 * is wound up, the throwing arm back and high and the weight on the back
 * foot; 1 is the release, the arm through and pointing along the throw, the
 * weight onto the front foot. `aim` is the throw's angle above the
 * horizontal, in degrees, so the arm at release points where the ball goes.
 * Dressed like the runner; `ring` dresses the shirt in a second colour to
 * tell B from A. Draw it at least 50 px tall (THROWER_MIN) so a face, an arm
 * and a stance read on a phone.
 */
export const THROWER_MIN = 50;
export function thrower(g, X, Y, H, P, { dir = 1, pose = 0, aim = 45, ring = null } = {}) {
  H = Math.max(THROWER_MIN * 0.8, H);
  const u = Math.max(0, Math.min(1, pose)), e = u * u * (3 - 2 * u);
  const E = env(), skin = E.night ? '#b08a74' : '#d9a988', skinFar = E.night ? '#7d6253' : '#b5876a';
  const shirt = ring || (E.night ? '#6c7f9a' : '#5f7392'), shorts = '#2f3340', lw = Math.max(3, H * 0.075);
  const thigh = H * 0.25, shin = H * 0.26, upper = H * 0.17, fore = H * 0.16;
  softShadow(g, X, Y + 1, H * 0.3, H * 0.05, 0.8);
  at(g, X, Y, dir, () => {
    // the stance: feet apart, the weight moving from the back foot to the front
    const back = { x: -H * 0.17, y: 0 }, front = { x: H * 0.15, y: 0 };
    const HIP = { x: -H * 0.04 + e * H * 0.07, y: -(thigh + shin) * 0.95 };
    const lean = -0.18 + e * 0.38;                       // back, then into the throw
    const SH = { x: HIP.x + Math.sin(lean) * H * 0.3, y: HIP.y - Math.cos(lean) * H * 0.3 };
    const legOf = (F, side) => [HIP, joint(HIP, F, thigh, shin, side), F];
    const farLeg = legOf(back, 1), nearLeg = legOf(front, 1);
    // the throwing arm (near): from behind and high to along the aim
    const a0 = Math.PI * 1.15, a1 = -(aim * Math.PI) / 180;      // angle from +x, y down
    const ang = a0 + (a1 - a0 + (a1 < a0 - Math.PI ? 2 * Math.PI : 0)) * e;
    const EL = { x: SH.x + Math.cos(ang - 0.35 * (1 - e)) * upper, y: SH.y + Math.sin(ang - 0.35 * (1 - e)) * upper };
    const HA = { x: EL.x + Math.cos(ang) * fore, y: EL.y + Math.sin(ang) * fore };
    // the other arm out in front for balance, dropping as the throw comes through
    const bal = 0.15 + e * 1.1;
    const EL2 = { x: SH.x + Math.cos(bal) * upper, y: SH.y + Math.sin(bal) * upper };
    const HA2 = { x: EL2.x + Math.cos(bal + 0.5) * fore, y: EL2.y + Math.sin(bal + 0.5) * fore };
    limb(g, farLeg, skinFar, lw); limb(g, farLeg.slice(0, 2), withAlpha(shorts, 0.85), lw * 1.15);
    limb(g, [SH, EL2, HA2], skinFar, lw * 0.8);
    limb(g, [HIP, SH], shirt, lw * 2.1);
    limb(g, [HIP, { x: HIP.x + (SH.x - HIP.x) * 0.18, y: HIP.y + (SH.y - HIP.y) * 0.18 }], shorts, lw * 2.15);
    limb(g, nearLeg, skin, lw); limb(g, nearLeg.slice(0, 2), shorts, lw * 1.15);
    limb(g, [SH, EL, HA], skin, lw * 0.8); limb(g, [SH, EL], shirt, lw * 0.95);
    for (const F of [back, front]) { g.fillStyle = '#2b2628'; g.beginPath(); g.ellipse(F.x + lw * 0.4, F.y - lw * 0.25, lw * 0.8, lw * 0.42, 0, 0, TAU); g.fill(); }
    // the head, turned to the throw, with hair and an eye
    const hx = SH.x + Math.sin(lean) * H * 0.1, hy = SH.y - H * 0.095, hr = H * 0.08;
    const hg = g.createRadialGradient(hx - hr * 0.3, hy - hr * 0.3, hr * 0.1, hx, hy, hr); hg.addColorStop(0, skin); hg.addColorStop(1, skinFar);
    g.fillStyle = hg; g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.fill();
    g.fillStyle = '#3a2c26'; g.beginPath(); g.arc(hx - hr * 0.2, hy - hr * 0.25, hr * 0.85, Math.PI * 1.0, Math.PI * 1.9); g.fill();
    g.fillStyle = '#2b2628'; g.beginPath(); g.arc(hx + hr * 0.45, hy - hr * 0.1, Math.max(0.8, hr * 0.12), 0, TAU); g.fill();
  });
}

/** Where a thrower's hand is at release, relative to the feet (for a stage
    that wants the ball to leave from the hand): x along `dir`, y up. */
export function throwerHand(H, aim = 45) {
  H = Math.max(THROWER_MIN * 0.8, H);
  const HIPx = H * 0.03, HIPy = (H * 0.51) * 0.95, lean = 0.2;
  const SHx = HIPx + Math.sin(lean) * H * 0.3, SHy = HIPy + Math.cos(lean) * H * 0.3, a = (aim * Math.PI) / 180;
  return { x: SHx + Math.cos(a) * H * 0.33, y: SHy + Math.sin(a) * H * 0.33 };
}

/** A ball in flight, `r` px in radius: the stadium's shaded ball, with a
    ring in `color` round it when there are two to tell apart (A, B). */
export function ballAt(g, x, y, r, color = null) {
  ballSprite(g, x, y, Math.max(5.5, r));
  if (color) { g.save(); g.strokeStyle = color; g.lineWidth = 2.4; g.beginPath(); g.arc(x, y, Math.max(5.5, r) + 3, 0, TAU); g.stroke(); g.restore(); }
}

const SWING = 0.5, STANCE_BEND = 0.1;
// ground covered per stride, per px of height: twice the stance foot's sweep
// under the hip, from the thigh SWING ahead to SWING behind
const sweep = (th) => 0.25 * Math.sin(th) + 0.26 * Math.sin(th - STANCE_BEND);
const STRIDE = 2 * (sweep(SWING) - sweep(-SWING));

/* ── particles ─────────────────────────────────────────────────────────── */

/**
 * A dog, side on, running (or standing, `still`): L is its length, nose to
 * tail; its front (the nose) is at X. Four legs in a gallop — the front pair
 * and the back pair reach and gather in turn — a long body, a head with an
 * ear, and a tail out behind. Drawn in the page's ink like every figure here.
 */
export function dog(g, X, Y, L, P, { dir = 1, ring = null, phase = 0, still = false } = {}) {
  const ink = ring || P.strong, w = Math.max(1.6, L * 0.045);
  at(g, X, Y, dir, () => {
    const hgt = L * 0.42, leg = hgt * 0.55, bodyY = -leg - L * 0.05;
    const a = phase * TAU, spread = still ? 0.05 : 0.55;
    // the legs: front pair at the shoulder, back pair at the hip; in a gallop
    // the pairs swing out of step with each other
    const legs = [[-L * 0.3, a, 1], [-L * 0.36, a + 0.6, 1], [-L * 0.74, a + Math.PI, -1], [-L * 0.8, a + Math.PI + 0.6, -1]];
    for (const [hx, ph, side] of legs) {
      const sw = Math.sin(ph) * spread;
      const K = { x: hx + Math.sin(sw) * leg * 0.55, y: bodyY + leg * 0.5 };
      const F = { x: hx + Math.sin(sw) * leg * 1.05 + side * (still ? 0 : leg * 0.08), y: still ? 0 : -Math.max(0, Math.cos(ph)) * leg * 0.18 };
      limb(g, [{ x: hx, y: bodyY }, K, F], ink, w);
    }
    // the body, the neck and head, the ear, the tail
    g.fillStyle = P.card; g.strokeStyle = ink; g.lineWidth = w; g.lineJoin = 'round';
    g.beginPath(); g.ellipse(-L * 0.55, bodyY - L * 0.04, L * 0.3, L * 0.1, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-L * 0.3, bodyY - L * 0.08); g.lineTo(-L * 0.16, bodyY - L * 0.2); g.stroke();
    g.beginPath(); g.ellipse(-L * 0.1, bodyY - L * 0.22, L * 0.1, L * 0.065, 0.15, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-L * 0.01, bodyY - L * 0.2); g.lineTo(0, bodyY - L * 0.19); g.stroke();
    g.beginPath(); g.moveTo(-L * 0.14, bodyY - L * 0.27); g.lineTo(-L * 0.18, bodyY - L * 0.16); g.stroke();
    g.beginPath(); g.moveTo(-L * 0.84, bodyY - L * 0.06); g.quadraticCurveTo(-L * 0.95, bodyY - L * 0.12, -L * 1.0, bodyY - L * 0.2 + (still ? 0 : Math.sin(a) * L * 0.03)); g.stroke();
    dot(g, -L * 0.07, bodyY - L * 0.24, Math.max(1, L * 0.012), { fill: ink });
  });
}

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
 *             own numbers, so nothing moved when the lorry became one of six,
 *             and every top is the lorry's, which keeps the arrow under the
 *             letter plates of the posts
 *   ground    what it stands on: 'road', 'rail' or 'track'
 *   cycle     px travelled per unit of phase, per px of L (see phaseFor)
 *   brakes    whether slowing down is "braking" (a runner just slows down)
 *   min       the least drawn size, px, so a person stays readable on a phone
 *   cars      carriages, for the train
 *   turns     it turns round to go back (a runner, a bike); the rest reverse
 *   tall      taller than the lorry's arrow height: its acceleration arrow
 *             goes behind it, not over its head
 */
export const FIGURES = {
  lorry:      { draw: lorry,      label: 'Lorry',      noun: 'lorry',      verb: 'Drive', size: 1,    top: 0.36, mid: 0.2,  ground: 'road',  cycle: TAU * 0.075, brakes: true },
  car:        { draw: car,        label: 'Car',        noun: 'car',        verb: 'Drive', size: 0.8,  top: 0.36, mid: 0.18, ground: 'road',  cycle: TAU * 0.1, brakes: true },
  cyclist:    { draw: cyclist,    label: 'Cyclist',    noun: 'cyclist',    verb: 'Ride',  size: 0.6,  top: 0.36, mid: 0.12, ground: 'road',  cycle: TAU * 0.2 * GEAR, brakes: true, min: 52, turns: true, tall: true },
  motorcycle: { draw: motorcycle, label: 'Motorcycle', noun: 'motorcycle', verb: 'Ride',  size: 0.7,  top: 0.36, mid: 0.13, ground: 'road',  cycle: TAU * 0.19, brakes: true, min: 52, turns: true, tall: true },
  train:      { draw: train,      label: 'Train',      noun: 'train',      verb: 'Drive', size: 1.6,  top: 0.36, mid: 0.16, ground: 'rail',  cycle: TAU * 0.3 * 0.16, brakes: true, cars: 2 },
  runner:     { draw: runner,     label: 'Runner',     noun: 'runner',     verb: 'Run',   size: 0.62, top: 0.36, mid: 0.3,  ground: 'track', cycle: STRIDE, brakes: false, min: 52, turns: true, tall: true },
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
export function roadway(g, x0, x1, Y, P) { tarmac(g, x0, x1, Y, { depth: 16, verge: false }); }

/** A railway track, side on, between x0 and x1: the rail head at y = Y
    (where a train's wheels stand), sleepers under it, ballast under them.
    Two parallel tracks are two calls at two heights. */
export function rails(g, x0, x1, Y, P, { sleeper = 15 } = {}) { railBed(g, x0, x1, Y); }

/** A running track, side on: its surface at y = Y, 16 px deep like the
    road, with solid lane lines rather than a dashed centre line. */
export function runningTrack(g, x0, x1, Y, P) {
  const E = env();
  const gr = g.createLinearGradient(0, Y, 0, Y + 16);
  gr.addColorStop(0, E.night ? '#6a4038' : '#b9705e'); gr.addColorStop(1, E.night ? '#4a2c27' : '#94584a');
  g.fillStyle = gr; g.fillRect(x0, Y, x1 - x0, 16);
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2;
  for (const dy of [0.5, 8, 15.5]) { g.beginPath(); g.moveTo(x0, Y + dy); g.lineTo(x1, Y + dy); g.stroke(); }
  g.restore();
}

/** Whichever surface a figure stands on (FIGURES[kind].ground). */
export function surface(g, ground, x0, x1, Y, P) {
  if (ground === 'rail') rails(g, x0, x1, Y, P);
  else if (ground === 'track') runningTrack(g, x0, x1, Y, P);
  else roadway(g, x0, x1, Y, P);
}
