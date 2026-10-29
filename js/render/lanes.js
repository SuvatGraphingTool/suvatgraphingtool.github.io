// lanes.js — the stage for two side by side: on one straight road, or on
// parallel railway tracks.
//
// Two pictures of one race, sharing the clock, as for the journey:
//
//   · ON A CARD, top right, both speed–time graphs on one pair of axes — the
//     picture every paper in this family draws. A's line in the velocity
//     hue, B's in the second-object stone, both dashed because the motion is
//     along the road (rule 2). The area under each, up to now, is shaded in
//     the displacement hue — A's solid, B's hatched — because that area IS
//     the distance each has gone; the card's key says what each is worth.
//     Each moment they are level is marked once the clock reaches it, where
//     the lines cross (the same speed, for an instant) is ringed, and the end
//     of a held speed is dropped to the time axis and numbered, as the
//     papers' sketches letter T. The card belongs to the screen: it is drawn
//     after the place, out of the stage's pan and zoom (unview), with its own
//     labels, clear of the readouts.
//   · BELOW, the place: a two-lane road with its kerbs, footway and verge —
//     or two tracks, with the trains on them — A in the far lane, B in the
//     near one, each with its equal-time marks, its velocity arrow and its
//     letter; the start (lights, when it leaves them); the line the question
//     names (on the tracks, the trackside posts X and Y); the gap between
//     their fronts as a dashed displacement bracket; and each meeting as a
//     line across both, which pulses at the engine's time.
//
// THE ROADSIDE is here too, and models.js and journey.js stand on it: the
// footway and kerbs, bushes and marker posts along the verge, a street lamp,
// a measuring tape laid on the grass, the graph card's place beside the
// readouts, and three significant figures.
//
// Everything drawn is read from js/core/overtake.js (rule 4).

import { landscape, paper, tarmac, env, rng, softShadow } from './scenery.js';
import { fitCanvas, unview, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha, cssVar } from './util.js';
import { T, num } from '../notation.js';
import { drawFigure, train, rails, post, phaseFor, trafficLights, FIGURES } from './figures.js';
import { pulse, ageOf } from './effects.js';

const TAU = Math.PI * 2;

/* ── shared by the road stages ─────────────────────────────────────────── */

/** Three significant figures, with no trailing zeros: 12, 11, 15.4, 0.4. */
export function s3(x) {
  if (!isFinite(x) || Math.abs(x) < 1e-9) return num(0, 0);
  const dp = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x))));
  return num(x, dp, { trim: true });
}

/** Where the readouts sit over the canvas — a column of `n` boxes top left,
    `wide` px wide on a phone and `wideL` on a laptop (as wide as their
    longest name), the clock top right — and the place beside them for a
    graph card. */
export function screen(w, h, n, wide = 146, wideL = 196) {
  const phone = w < 520;
  const hudR = 16 + (phone ? wide : wideL) + 4, hudB = 16 + n * (phone ? 55 : 64) + (n - 1) * 8;
  return { phone, hudR, hudB, cardX0: hudR + (phone ? 4 : 44), cardY0: phone ? 80 : 90, cardX1: w - (phone ? 8 : 12) };
}

/** Each road figure's true shape, per px of its drawn size L: how tall it
    stands (a rider or a runner is nearly L tall, a car under half), where a
    badge sits on it (back from its front, up from the ground) and how high its
    velocity arrow rides. */
export const BODY = {
  car: { h: 0.46, bx: 0.62, by: 0.22, vy: 0.2 },
  lorry: { h: 0.5, bx: 0.5, by: 0.25, vy: 0.2 },
  cyclist: { h: 0.97, bx: 0.46, by: 0.43, vy: 0.32 },
  motorcycle: { h: 0.82, bx: 0.5, by: 0.4, vy: 0.3 },
  runner: { h: 0.97, bx: 0.2, by: 0.62, vy: 0.45 },
};

/** The least height a person or a rider is drawn at, so it reads. */
export const PERSON_MIN = (phone) => (phone ? 46 : 56);

/** A sheet for a graph, in the screen's pixels: the scenery's paper card. */
export function card(g, x0, y0, x1, y1) {
  paper(g, x0, y0, x1 - x0, y1 - y0, { step: 14 });
}

/** A bush standing on y = Y at x, about s px tall: overlapping clumps lit
    from the upper left, a soft shadow under it. */
export function bush(g, x, Y, s, seed = 1) {
  const E = env(), r = rng(seed);
  softShadow(g, x, Y + 1, s * 0.75, s * 0.14, 0.6);
  const lit = E.night ? '#5e6a45' : '#a0ad74', deep = E.night ? '#232a1a' : '#55623a';
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), rad = s * (0.28 + r() * 0.14);
    const cx = x + (u - 0.5) * s * 1.05 + (r() - 0.5) * s * 0.12;
    const cy = Y - rad * 0.9 - s * 0.32 * Math.sin(Math.PI * u);
    const gr = g.createRadialGradient(cx - rad * 0.4, cy - rad * 0.45, rad * 0.08, cx, cy, rad);
    gr.addColorStop(0, lit); gr.addColorStop(1, deep);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.fill();
  }
}

/** A white roadside marker post on y = Y, `hh` px tall, with its black band
    and reflector, shaded on the side away from the light. */
export function markerPost(g, x, Y, hh) {
  const pw = Math.max(3, hh * 0.18);
  g.save();
  g.fillStyle = '#efe9e1'; g.fillRect(x - pw / 2, Y - hh, pw, hh);
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + pw * 0.1, Y - hh, pw * 0.4, hh);
  g.fillStyle = '#1e1a1c'; g.fillRect(x - pw / 2, Y - hh * 0.9, pw, hh * 0.2);
  g.fillStyle = '#c94b40'; g.fillRect(x - pw * 0.28, Y - hh * 0.86, pw * 0.56, hh * 0.12);
  g.restore();
}

/** A street lamp on y = Y, `hh` px tall, its arm reaching over the road;
    by night its lamp glows and lights a pool under it. */
export function lampPost(g, x, Y, hh, dir = 1) {
  const E = env(), top = Y - hh, arm = hh * 0.24;
  g.save();
  if (E.night) {
    const gl = g.createRadialGradient(x + arm * dir, top + 6, 0, x + arm * dir, top + 6, hh * 0.55);
    gl.addColorStop(0, withAlpha(E.window, 0.32)); gl.addColorStop(1, withAlpha(E.window, 0));
    g.fillStyle = gl; g.beginPath(); g.arc(x + arm * dir, top + 6, hh * 0.55, 0, TAU); g.fill();
  }
  const metal = E.night ? '#7a6e74' : '#6b6166';
  g.strokeStyle = metal; g.lineCap = 'round';
  g.lineWidth = 3.2; g.beginPath(); g.moveTo(x, Y); g.lineTo(x, top + 8); g.quadraticCurveTo(x, top, x + arm * 0.5 * dir, top); g.lineTo(x + arm * dir, top); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - 1.6, top + 8, 1, hh - 8);
  g.fillStyle = '#3a3236'; g.beginPath(); g.roundRect(x + arm * dir - 7, top - 2, 14, 6, 2); g.fill();
  g.fillStyle = E.night ? '#fff1cf' : '#efe4cf'; g.fillRect(x + arm * dir - 5, top + 3, 10, 2);
  g.fillStyle = '#4a4044'; g.fillRect(x - 3, Y - 6, 6, 6);
  g.restore();
}

/** A road side on, from its far edge at y = top to its near kerb `d` px
    below: a footway and kerb behind it, tarmac with its centre line and edge
    lines, a kerb in front. Returns where wheels stand in the far lane and in
    the near one — inside each lane, not on its lines. */
export function road(g, x0, x1, top, d, { seed = 11, centre = 0.55 } = {}) {
  const E = env(), r = rng(seed);
  g.save();
  // the footway: paving slabs, and the kerb's lit face
  g.fillStyle = E.night ? '#3f363a' : '#bdb2ac'; g.fillRect(x0, top - 11, x1 - x0, 8);
  g.strokeStyle = withAlpha(E.night ? '#000000' : '#7d716c', 0.35); g.lineWidth = 1;
  for (let x = x0 + r() * 20; x < x1; x += 22) { g.beginPath(); g.moveTo(x, top - 11); g.lineTo(x - 3, top - 3); g.stroke(); }
  g.fillStyle = E.night ? '#5a4f54' : '#ddd4cf'; g.fillRect(x0, top - 4, x1 - x0, 4);
  g.restore();
  if (Math.abs(centre - 0.55) < 1e-9) tarmac(g, x0, x1, top, { depth: d, verge: false, seed });
  else {
    // the same tarmac, its centre line where this road wants it: a narrow far
    // lane behind, so a vehicle in the near one is wholly inside it
    g.save();
    const gr = g.createLinearGradient(0, top, 0, top + d);
    gr.addColorStop(0, E.night ? '#3a3236' : '#7d7477'); gr.addColorStop(1, E.night ? '#241e21' : '#5f575a');
    g.fillStyle = gr; g.fillRect(x0, top, x1 - x0, d);
    g.fillStyle = withAlpha(E.night ? '#ffffff' : '#000000', 0.07);
    for (let i = 0; i < (x1 - x0) * d / 90; i++) g.fillRect(x0 + r() * (x1 - x0), top + r() * d, 1.2, 1.2);
    g.strokeStyle = withAlpha(E.line, 0.8); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x0, top + 2.5); g.lineTo(x1, top + 2.5); g.stroke();
    g.setLineDash([22, 18]); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, top + d * centre); g.lineTo(x1, top + d * centre); g.stroke(); g.setLineDash([]);
    g.fillStyle = E.night ? '#4a4044' : '#b8aeae'; g.fillRect(x0, top + d, x1 - x0, 4);
    g.restore();
  }
  // the near edge line, and the kerb's face in shadow under the kerb
  g.save();
  g.strokeStyle = withAlpha(E.line, 0.8); g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(x0, top + d - 3.5); g.lineTo(x1, top + d - 3.5); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x0, top + d + 4, x1 - x0, 3);
  g.restore();
  return { far: top + d * 0.42, near: top + d * 0.88 };
}

/** The verge behind a road, along y = Y: bushes and marker posts, seeded,
    kept clear of the x ranges in `keep` (a sign, a light, a post). */
export function verge(g, x0, x1, Y, { seed = 5, scale = 1, keep = [], lamps = false } = {}) {
  const r = rng(seed), clear = (x, half) => !keep.some(([a, b]) => x + half > a && x - half < b);
  if (lamps) for (let x = x0 + 150 + r() * 80; x < x1; x += 300 + r() * 60) if (clear(x, 20)) lampPost(g, x, Y - 2, 62 * scale, 1);
  for (let x = x0 + r() * 60; x < x1 + 20; x += (70 + r() * 70) * scale) {
    const s = (12 + r() * 9) * scale;
    if (clear(x, s)) bush(g, x, Y - 1, s, seed * 31 + Math.round(x));
  }
  for (let x = x0 + 40 + r() * 30; x < x1; x += 120 * scale) if (clear(x, 6)) markerPost(g, x, Y - 1, 15 * scale);
}

/** A measuring tape laid on the grass along y (its top edge), from metre s0
    to s1 through X: a cream strip with ink ticks and numbers on it, so it
    reads on any ground in either theme. Its numbers go through L at a fixed
    place; `marks` ([{ s, color, text }]) are notches in their own colour,
    their text just above it, so the even steps keep their numbers. */
export function tape(g, L, X, s0, s1, y, { marks = [], minGap = 48, pri = 4 } = {}) {
  const x0 = X(s0) - 20, x1 = X(s1) + 20, hh = 22;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 4; g.shadowOffsetY = 1.5;
  g.fillStyle = '#efe6d4'; g.beginPath(); g.roundRect(x0, y, x1 - x0, hh, 3); g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = '#b3a487'; g.lineWidth = 1; g.stroke();
  g.restore();
  let step = niceStep(s1 - s0, 6);
  while (X(step) - X(0) < minGap) step = niceStep(step * 2.2, 1);
  const minor = step / (String(step).startsWith('2') ? 4 : 5);
  for (let s = Math.ceil(s0 / minor - 1e-9) * minor; s <= s1 + 1e-9; s += minor) {
    const major = Math.abs(s / step - Math.round(s / step)) < 1e-6;
    stroke(g, [{ x: X(s), y }, { x: X(s), y: y + (major ? 7 : 4) }], { color: '#2b2226', width: major ? 1.4 : 1 });
    if (major) L.add(T`${s3(s)} [m]`, X(s), y + 14, { color: '#2b2226', align: 'center', pri, size: 13, bg: false, maxPush: 0 });
  }
  for (const m of marks) {
    g.save(); g.fillStyle = m.color;
    g.beginPath(); g.moveTo(X(m.s), y + 1); g.lineTo(X(m.s) - 6, y - 7); g.lineTo(X(m.s) + 6, y - 7); g.closePath(); g.fill();
    g.restore();
    stroke(g, [{ x: X(m.s), y }, { x: X(m.s), y: y + 4 }], { color: m.color, width: 2.4 });
    if (m.text) L.add(m.text, X(m.s), y - 16, { color: m.color, align: 'center', pri: pri + 4, size: 13, weight: 700, maxPush: 0 });
  }
  return hh;
}

/** A round badge with a letter or number on it, on the side of a vehicle. */
export function badge(g, x, y, text, ring, r = 9.5) {
  g.save();
  g.fillStyle = '#f6f1e8'; g.strokeStyle = ring || '#2b2226'; g.lineWidth = ring ? 2.4 : 1.4;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#1e1a1c'; g.font = `700 13px ${cssVar('--font', 'system-ui, sans-serif')}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 0.5);
  g.restore();
}

/* ── the stage ─────────────────────────────────────────────────────────── */

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'overtake') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const { A, B, events } = f;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const passed = events.filter((e) => e.kind !== 'start' && t >= e.t - 1e-9);
  const rail = f.where === 'rail';
  const sc = screen(w, h, 4, 128, 176), phone = sc.phone;
  const life = Math.max(1e-6, f.tMax / 9);

  // ── sizes: each one's figure at its own size beside a car, at least a
  // tenth of the width; a train of three long enough to read as one
  const kind = (p) => (rail ? 'train' : FIGURES[f.figs?.[p.name]] ? f.figs[p.name] : 'car');
  const base = rail ? clamp(w * 0.24, 130, 230) : clamp(w * 0.1, 46, 100);
  // a car at its length; a person or a rider at a height that reads, a little
  // taller than the car, never under PERSON_MIN
  const body = (p) => BODY[kind(p)] || BODY.car;
  const lenOf = (p) => {
    if (rail) return base;
    const k = kind(p), b = body(p);
    if (b.h < 0.6) return base * FIGURES[k].size / FIGURES.car.size;
    return Math.max(PERSON_MIN(phone), base * 0.62) / b.h;
  };
  const tallOf = (p) => (rail ? Math.min(base / 3 * 0.42, base * 0.3) + 8 : body(p).h * lenOf(p));
  const tall = Math.max(tallOf(A), tallOf(B)), maxLen = Math.max(lenOf(A), lenOf(B));

  // ── where things go: the road along the bottom, the card above it beside
  // the readouts, the start clear of them
  // the road deep enough that B, in the near lane, stands clear of A's feet
  const lane = Math.max(phone ? 30 : 36, tall * 1.08);
  const d = rail ? 2 * (tall + 18) : Math.max(2 * lane, tallOf(A) * 0.75 + tallOf(B) + 22);
  const below = phone ? 66 : 54;
  const R = Math.round(h - below - d - 4);               // the road's far edge
  const horizon = R - (rail ? 24 : 30);
  // room past the furthest point for its velocity arrow and its value, so
  // neither is pushed back over the vehicle at the end
  const vLen = clamp(w * 0.08, 34, 80), vText = phone ? 70 : 92;
  const sx0 = maxLen + (phone ? 14 : 24), sx1 = w - vLen - vText - 18;
  const lo = Math.min(0, A.x0, B.x0), hi = Math.max(f.top, 1);
  const S = (s) => sx0 + ((s - lo) / (hi - lo)) * (sx1 - sx0);
  const cardY1 = Math.min(horizon - 8, sc.cardY0 + Math.max(170, h * 0.62));
  const box = { x0: sc.cardX0, y0: sc.cardY0, x1: sc.cardX1, y1: cardY1 };
  L.reserve({ x: 0, y: 0, w: sc.hudR, h: sc.hudB });
  L.reserve({ x: box.x0, y: box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0 });

  // ── the place
  landscape(g, w, h, horizon, { far: rail ? 'hills' : 'trees', seed: 39, clouds: 5 });
  const startX = S(0), lineX = f.line != null ? S(f.line) : null;
  const keep = [[startX - 30, startX + 20], ...(lineX != null ? [[lineX - 20, lineX + 20]] : [])];
  let yA, yB;
  if (rail) {
    // two tracks on one bed of ballast, a lineside fence behind them
    yA = R + tall + 4; yB = yA + tall + 22;
    const E = env();
    g.save(); g.fillStyle = E.night ? '#3a3236' : '#9d938e'; g.fillRect(0, R + 2, w, yB + 22 - R); g.restore();
    for (let x = 0; x < w; x += 46) { stroke(g, [{ x, y: R + 4 }, { x, y: R - 12 }], { color: E.night ? '#6b5f64' : '#7a6e6a', width: 2 }); }
    stroke(g, [{ x: 0, y: R - 8 }, { x: w, y: R - 8 }], { color: E.night ? '#6b5f64' : '#7a6e6a', width: 1.4 });
    stroke(g, [{ x: 0, y: R - 2 }, { x: w, y: R - 2 }], { color: E.night ? '#6b5f64' : '#7a6e6a', width: 1.4 });
    verge(g, 0, w, R - 12, { seed: 41, scale: phone ? 0.8 : 1, keep });
    for (const y of [yA, yB]) rails(g, 0, w, y, P);
  } else {
    verge(g, 0, w, R - 11, { seed: 41, scale: phone ? 0.8 : 1, keep });
    road(g, 0, w, R, d, { seed: 23 });
    // each in its own lane: B's feet near the kerb, A's in the far lane,
    // above the centre line and above B's head
    yB = R + d - 6;
    yA = Math.min(R + d * 0.55 - 4, yB - tallOf(B) - 16);
  }

  // the start: a stop line across both lanes, and the lights when it leaves them
  if (rail) post(g, L, startX, yB + 12, 'X', P.strong, P, { dashed: true, height: yB + 12 - (R - 2) });
  else {
    g.save(); g.fillStyle = withAlpha(env().line, 0.9); g.fillRect(startX - 2, R + 3, 4, d - 7); g.restore();
    // green whenever anyone is moving; red only while both stand at rest
    // before they set off
    const going = (fired && tRaw > 0) || Math.abs(A.vel(t)) > 1e-9 || Math.abs(B.vel(t)) > 1e-9;
    if (f.lights) trafficLights(g, startX - 18, R - 10, Math.min(tall, base * 0.46) + 6, P, { lit: going ? 'green' : 'red' });
    else L.add('start', startX, R - 22, { color: P.ink, align: 'center', pri: 5, size: 13 });
  }
  // the line the question names: chequered across the road, or the post Y
  if (lineX != null) {
    if (rail) post(g, L, lineX, yB + 12, 'Y', P.mark, P, { dashed: true, height: yB + 12 - (R - 2) });
    else {
      g.save();
      for (let y = R + 3, k = 0; y < R + d - 4; y += 6, k++) for (let c = 0; c < 2; c++) { g.fillStyle = (k + c) % 2 ? '#1e1a1c' : '#f3eee6'; g.fillRect(lineX - 6 + c * 6, y, 6, Math.min(6, R + d - 4 - y)); }
      g.restore();
    }
    L.add(rail ? T`XY = ${s3(f.line)} [m]` : T`${s3(f.line)} [m]`, lineX + (rail ? -24 : 10), rail ? R - 14 : R - 22,
      { color: P.mark, align: rail ? 'right' : 'left', pri: 8, size: 14, weight: 700, maxPush: 20 });
  }
  // each meeting, across both lanes, and its pulse at the engine's time
  for (const e of passed) {
    stroke(g, [{ x: S(e.x), y: R - (rail ? 6 : 2) }, { x: S(e.x), y: R + d + 2 }], { color: P.mark, width: 2, dash: [5, 4] });
    const { age } = ageOf(t, e.t, f.tMax, life);
    pulse(g, S(e.x), yA - tallOf(A) * 0.5, age, life, P.mark, { radius: Math.max(30, tallOf(A) * 0.7) });
    pulse(g, S(e.x), yB - tallOf(B) * 0.5, age, life, P.mark, { radius: Math.max(30, tallOf(B) * 0.7) });
  }
  // equal-time marks, each along its own lane, under its wheels
  const dt = niceStep(f.tMax, 10);
  for (const [p, y, color] of [[A, yA, P.vel], [B, yB, P.second]]) {
    const my = rail ? y + 12 : y + 5;
    for (let i = 0; i * dt <= t + 1e-9; i++) {
      const tt = i * dt;
      if (tt < p.t0 - 1e-9) continue;
      dot(g, S(p.pos(tt)), my, 3.4, { fill: color, stroke: '#f6f1e8', width: 1.2 });
      if (show.ticks) L.add(T`${num(tt, dt < 1 ? 1 : 0)} [s]`, S(p.pos(tt)), my + 14, { color, align: 'center', pri: 2, size: 13, maxPush: 0 });
    }
  }
  // the two of them: A in the far lane first, B in front of it
  for (const [p, y, ring] of [[A, yA, null], [B, yB, P.second]]) {
    const xf = S(p.pos(t)), Lp = lenOf(p), k = kind(p), ht = tallOf(p), bd = body(p);
    const v = p.vel(t), a = p.acc(t);
    // it comes to rest: a pulse where it stops, behind it
    const stop = p.stages.find((st) => st.kind === 'changing' && isFinite(st.t1) && Math.abs(p.vel(st.t1 + 1e-6)) < 1e-9);
    if (stop) { const { age } = ageOf(t, stop.t1, f.tMax, life); pulse(g, xf - Lp / 2, y - ht * 0.5, age, life, P.muted, { radius: Math.max(26, ht * 0.7) }); }
    const opts = { ring, phase: phaseFor(k, Lp, xf - S(p.x0), rail ? { cars: 3 } : {}), brake: a < -1e-9 && v > 1e-6,
      paint: p === B ? (env().night ? '#9a8a74' : '#b8a27c') : null };
    if (rail) train(g, xf, y, Lp, P, { ...opts, cars: 3 }); else drawFigure(g, k, xf, y, Lp, P, opts);
    badge(g, xf - Lp * (rail ? 0.2 : bd.bx), y - (rail ? ht * 0.62 : Lp * bd.by), p.name, ring, clamp(Math.min(Lp, ht * 2) * 0.11, 7.5, 10));
    const wide = k === 'runner' ? Lp * 0.55 : Lp;
    L.reserve({ x: xf - wide, y: y - ht, w: wide, h: ht });
    // its velocity, from its front, dashed: along the road is horizontal
    if (show.velocity !== false && v > 1e-6) {
      const len = (v / f.vMax) * vLen, vy = y - (rail ? ht * 0.55 : Lp * bd.vy);
      const x0 = xf + 5, x1 = x0 + len;
      arrow(g, x0, vy, x1, vy, { color: P.velVec, width: 2.6, head: 10, dash: [6, 4] });
      const text = T`${s3(v)} [m s^-1]`, room = x1 + vText < w;
      L.add(text, room ? x1 + 8 : xf - wide - 8, vy, { color: P.vel, align: room ? 'left' : 'right', pri: 7, size: 14, weight: 700, maxPush: 20 });
    }
    // its acceleration over its roof, dashed for the same reason
    if (show.acceleration && v > 1e-6 && Math.abs(a) > 1e-9) {
      const len = Math.sign(a) * 36, ay = y - ht - 10;
      arrow(g, xf - Lp / 2 - len / 2, ay, xf - Lp / 2 + len / 2, ay, { color: P.acc, width: 2.4, head: 9, dash: [5, 4] });
    }
  }
  // the gap between their fronts, on the verge in front of the road
  const xa = S(A.pos(t)), xb = S(B.pos(t));
  if (Math.abs(xa - xb) > 12 && !passed.some((e) => Math.abs(e.t - t) < 1e-6)) {
    const by = R + d + 18;
    stroke(g, [{ x: Math.min(xa, xb), y: by }, { x: Math.max(xa, xb), y: by }], { color: P.disp, width: 2.4, dash: [7, 5] });
    for (const x of [xa, xb]) stroke(g, [{ x, y: by - 7 }, { x, y: by + 7 }], { color: P.disp, width: 2 });
    L.add(`${A.pos(t) > B.pos(t) ? 'A' : 'B'} ahead by ${T`${s3(Math.abs(f.gap(t)))} [m]`}`, (xa + xb) / 2, by + 17,
      { color: P.disp, align: 'center', pri: 8, size: 14, weight: 700, maxPush: 20 });
  }
  L.draw(g, w, h);

  // ── the card, on the screen
  unview(g);
  graph(g, f, t, box, P, phone, passed, life);
  return null;
}

/** Both speed–time graphs on a card in the box, in the screen's pixels. */
function graph(g, f, t, box, P, phone, passed, life) {
  const L = labels(), { A, B } = f;
  card(g, box.x0, box.y0, box.x1, box.y1);
  const gx0 = box.x0 + (phone ? 34 : 46), gx1 = box.x1 - (phone ? 46 : 54);
  const gy0 = box.y0 + 64, gy1 = box.y1 - 30;
  const X = (tt) => gx0 + (tt / f.tMax) * (gx1 - gx0);
  const vTop = f.vMax * 1.25;
  const Y = (v) => gy1 - (v / vTop) * (gy1 - gy0);
  const font = `600 13px ${cssVar('--font', 'system-ui, sans-serif')}`;
  const width = (s) => { g.save(); g.font = font; const m = g.measureText(s).width; g.restore(); return m; };

  // the key, which is also what each area is worth so far
  const dist = f.dist(t), ky = box.y0 + 17;
  let kx = box.x0 + 14;
  if (!phone) { const lead = 'distance gone, the area so far:'; L.add(lead, kx, ky, { color: P.muted, pri: 9, size: 13, bg: false, maxPush: 0 }); kx += width(lead) + 14; }
  for (const [p, hatch] of [[A, false], [B, true]]) {
    g.save();
    g.fillStyle = withAlpha(P.disp, 0.22); g.fillRect(kx, ky - 7, 16, 14);
    if (hatch) { g.beginPath(); g.rect(kx, ky - 7, 16, 14); g.clip(); g.strokeStyle = withAlpha(P.disp, 0.8); g.lineWidth = 1.2; g.beginPath(); for (let x = kx - 14; x < kx + 16; x += 5) { g.moveTo(x, ky + 7); g.lineTo(x + 14, ky - 7); } g.stroke(); }
    g.restore();
    stroke(g, [{ x: kx, y: ky - 7 }, { x: kx + 16, y: ky - 7 }], { color: p === A ? P.vel : P.second, width: 2.4, dash: [4, 3] });
    const text = `${p.name} ${T`${s3(dist[p.name])} [m]`}`;
    L.add(text, kx + 22, ky, { color: P.disp, pri: 9, size: 13, weight: 700, bg: false, maxPush: 0 });
    kx += 22 + width(text) + 16;
  }

  // the axes
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx1 + 12, y: gy1 }], { color: P.axis, width: 2 });
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx0, y: gy0 - 12 }], { color: P.axis, width: 2 });
  L.add(`${T`v`} (${T`[m s^-1]`})`, gx0 - 8, gy0 - 24, { color: P.muted, align: 'left', pri: 8, size: 13, bg: false, maxPush: 0 });
  L.add(`${T`t`} (${T`[s]`})`, gx1 + 15, gy1, { color: P.muted, align: 'left', pri: 8, size: 13, bg: false, maxPush: 0 });
  // the speeds the paper's sketch marks, then the even steps where there is room
  const keyV = [...new Set([A.u, B.u, A.V ?? 0, B.V ?? 0])].filter((v) => v > 1e-9 && v < vTop);
  const vs = [...keyV.map((v) => ({ v, key: true }))];
  const vstep = niceStep(vTop, 4);
  for (let v = vstep; v < vTop * 0.98; v += vstep) if (!keyV.some((k) => Math.abs(Y(k) - Y(v)) < 18)) vs.push({ v, key: false });
  for (const { v, key } of vs) {
    stroke(g, [{ x: gx0 - 5, y: Y(v) }, { x: gx0, y: Y(v) }], { color: key ? P.muted : P.faint, width: 1.5 });
    L.add(s3(v), gx0 - 8, Y(v), { color: key ? P.ink : P.muted, align: 'right', pri: key ? 5 : 2, size: 13, bg: false, maxPush: 0 });
  }
  L.add('0', gx0 - 8, gy1 + 2, { color: P.muted, align: 'right', pri: 4, size: 13, bg: false, maxPush: 0 });
  // the time axis: the end of each held speed first, in its own hue, then
  // each one's other moments and the end of the run, then even steps;
  // fixed under the axis — a number with no room is left out, never moved
  const ticks = [];
  const holds = [[A, P.vel], [B, P.second]].map(([p, color]) => ({ p, color, t: p.stages.find((st) => st.kind === 'held')?.t1 }))
    .filter((k) => k.t != null && k.p.tau > 1e-9);
  for (const k of holds) ticks.push({ t: k.t, color: k.color, pri: 7 });
  for (const [p, color] of [[A, P.vel], [B, P.second]]) for (const st of p.stages) if (st.kind !== 'held' && isFinite(st.t1) && st.t1 > 1e-9) ticks.push({ t: st.t1, color, pri: 6 });
  ticks.push({ t: f.tMax, color: P.muted, pri: 5 });
  const tstep = niceStep(f.tMax, phone ? 4 : 6);
  for (let tt = tstep; tt <= f.tMax + 1e-9; tt += tstep) ticks.push({ t: tt, color: P.muted, pri: 2, faint: true });
  const used = [X(0)];
  for (const k of ticks.sort((a, b) => b.pri - a.pri)) {
    if (k.t > f.tMax + 1e-9) continue;
    stroke(g, [{ x: X(k.t), y: gy1 }, { x: X(k.t), y: gy1 + 5 }], { color: k.faint ? P.faint : k.color, width: 1.5 });
    if (used.some((x) => Math.abs(x - X(k.t)) < (phone ? 28 : 32))) continue;
    used.push(X(k.t));
    L.add(s3(k.t), X(k.t), gy1 + 14, { color: k.color, align: 'center', pri: k.pri, size: 13, weight: k.faint ? 600 : 700, bg: false, maxPush: 0 });
  }
  const line = (p, t0, t1) => {
    const out = [];
    const cuts = [t0, ...p.stages.flatMap((st) => [st.t0, st.t1]).filter((c) => c > t0 && c < t1), t1].sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const pts = [];
      for (let j = 0; j <= 20; j++) { const tt = cuts[i] + (j / 20) * (cuts[i + 1] - cuts[i]); pts.push({ x: X(tt), y: Y(p.vel(Math.min(tt, cuts[i + 1] - 1e-9))) }); }
      out.push(pts);
    }
    return out;
  };
  // the area under each line so far: A's filled, B's hatched
  if (t > 0) {
    const under = (p) => {
      g.beginPath(); g.moveTo(X(0), Y(0));
      for (const q of line(p, 0, t).flat()) g.lineTo(q.x, q.y);
      g.lineTo(X(t), Y(0)); g.closePath();
    };
    g.save(); under(A); g.fillStyle = withAlpha(P.disp, 0.18); g.fill(); g.restore();
    g.save(); under(B); g.clip();
    g.strokeStyle = withAlpha(P.disp, 0.6); g.lineWidth = 1.2; g.beginPath();
    for (let x = gx0 - (gy1 - gy0); x < X(t); x += 8) { g.moveTo(x, gy1); g.lineTo(x + (gy1 - gy0), gy0); }
    g.stroke(); g.restore();
  }
  // a speed held for a while: where it ends, dropped to its time
  for (const { p, color, t: te } of holds) {
    stroke(g, [{ x: X(te), y: Y(p.u) }, { x: X(te), y: gy1 }], { color, width: 1.4, dash: [3, 4], alpha: 0.8 });
    if (!phone) {
      // beside the corner, on the side the line leaves clear
      const brakes = p.a < 0;
      L.add(`${p.name} ${brakes ? 'brakes' : 'speeds up'}`, X(te) + (brakes ? 8 : -8), Y(p.u) - 13,
        { color, align: brakes ? 'left' : 'right', pri: 4, size: 13, weight: 700, maxPush: 0 });
    }
  }
  for (const [p, color] of [[B, P.second], [A, P.vel]]) {
    for (const seg of line(p, 0, f.tMax)) stroke(g, seg, { color, width: 1.6, dash: [6, 4], alpha: 0.35 });
    if (t > 0) for (const seg of line(p, 0, t)) stroke(g, seg, { color, width: 2.8, dash: [6, 4] });
  }
  // each line lettered at its end; two that end at one point share a tag
  const yEndA = Math.min(Y(A.vel(f.tMax)), gy1 - 12), yEndB = Math.min(Y(B.vel(f.tMax)), gy1 - 12);
  if (Math.abs(yEndA - yEndB) < 18) L.add('A, B', gx1 + 6, (yEndA + yEndB) / 2, { color: P.ink, align: 'left', pri: 9, size: 14, weight: 700, bg: false, maxPush: 20 });
  else {
    L.add('B', gx1 + 6, yEndB, { color: P.second, align: 'left', pri: 9, size: 15, weight: 700, bg: false, maxPush: 20 });
    L.add('A', gx1 + 6, yEndA, { color: P.vel, align: 'left', pri: 9, size: 15, weight: 700, bg: false, maxPush: 20 });
  }
  // each moment they are level: a line up the graph, its time at the top,
  // in the band above the lines where nothing else is drawn; moments too
  // close for a tag each share one
  const groups = [];
  for (const e of passed) {
    stroke(g, [{ x: X(e.t), y: gy1 }, { x: X(e.t), y: gy0 - 4 }], { color: P.mark, width: 1.6, dash: [4, 4] });
    const { age } = ageOf(t, e.t, f.tMax, life);
    pulse(g, X(e.t), gy1, age, life, P.mark, { radius: 18 });
    const last = groups[groups.length - 1];
    if (last && X(e.t) - X(last[last.length - 1].t) < (phone ? 90 : 150)) last.push(e); else groups.push([e]);
  }
  for (const grp of groups) {
    const ts = grp.map((e) => s3(e.t));
    const word = grp.length === 1 && grp[0].rest ? (phone ? 'at rest' : 'both at rest, level') : 'level';
    const when = ts.length === 1 ? T`t = ${ts[0]} [s]` : `${T`t = ${ts.slice(0, -1).join(', ')}`} and ${T`${ts[ts.length - 1]} [s]`}`;
    const text = phone ? when : `${word} at ${when}`;
    const xr = X(grp[grp.length - 1].t), xl = X(grp[0].t);
    const right = xr + 6 + width(text) < box.x1 - 8;
    L.add(text, right ? xr + 6 : xl - 6, gy0 + 4, { color: P.mark, align: right ? 'left' : 'right', pri: 9, size: 13, weight: 700, maxPush: 20, push: 'down' });
  }
  // where the lines cross: the same speed, for an instant
  for (const c of f.crossings || []) {
    if (t < c.t - 1e-9) continue;
    dot(g, X(c.t), Y(c.v), 7, { stroke: P.mark, width: 2.4 });
    if (!phone) L.add(`same speed at ${T`t = ${s3(c.t)} [s]`}`, X(c.t) + 12, Y(c.v) - 17, { color: P.mark, align: 'left', pri: 6, size: 13, weight: 700, maxPush: 0 });
  }
  // the clock
  stroke(g, [{ x: X(t), y: gy1 }, { x: X(t), y: gy0 - 6 }], { color: P.muted, width: 1.4, dash: [5, 5] });
  dot(g, X(t), Y(A.vel(t)), 4.5, { fill: P.surface, stroke: P.vel, width: 2.2 });
  dot(g, X(t), Y(B.vel(t)), 4.5, { fill: P.surface, stroke: P.second, width: 2.2 });
  L.draw(g, box.x1 + 4, box.y1 + 4);
}
