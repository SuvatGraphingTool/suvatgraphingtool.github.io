// journey.js — the stage for a journey in stages.
//
// Two pictures of one trip, sharing the clock:
//
//   · ON A CARD, top right, the speed–time graph the paper sketches: a
//     straight piece per stage, each speed at a stage change marked on the
//     speed axis with a dashed line across to its corner, each time it
//     changes marked on the time axis with a dashed line up to it — the way
//     the mark schemes draw it — and each stage bracketed under the axis with
//     its own time. The area under it fills in as the clock runs, in the
//     displacement hue, because that area IS the distance (the card's head
//     says how far, so far), and each stage's piece is named once the clock
//     has passed it. Each corner pulses as the clock reaches it. Speed along
//     the way is horizontal, so its line is dashed. The card belongs to the
//     screen: it is drawn after the place, out of the stage's pan and zoom,
//     with its own labels, clear of the readouts.
//   · BELOW, the way from A to B as the question has it: a road with traffic
//     lights where a car starts or stops, a railway between two stations, a
//     running track from the start line to the finish. Along it, the
//     traveller (js/render/figures.js) in its lane, its brake lights on while
//     it slows; the equal-time marks it leaves — bunched where it is slow,
//     spread where it is fast, the same story as the graph told in distance;
//     where each stage happens, bracketed; its velocity and acceleration as
//     dashed arrows (both horizontal, rule 2); a pulse at each change of stage
//     and at B; and a measuring tape on the verge, from A to B.
//
// Everything drawn is read from js/core/journey.js (rule 4).

import { landscape, env } from './scenery.js';
import { fitCanvas, unview, palette, clamp, labels, stroke, arrow, dot, niceStep, fade, withAlpha } from './util.js';
import { FIGURES, post, phaseFor, trafficLights, rails } from './figures.js';
import { pulse, ageOf } from './effects.js';
import { road, verge, tape, card, screen, s3, BODY, PERSON_MIN } from './lanes.js';
import { T, num } from '../notation.js';

/** A running track side on, from y = top down `d` px: two lanes of red-brown
    surface with white lines, and the kerb at its far edge. */
function track(g, x0, x1, top, d) {
  const E = env();
  g.save();
  g.fillStyle = E.night ? '#5a5054' : '#d8d0cb'; g.fillRect(x0, top - 5, x1 - x0, 5);
  const gr = g.createLinearGradient(0, top, 0, top + d);
  gr.addColorStop(0, E.night ? '#6a4038' : '#bd7562'); gr.addColorStop(1, E.night ? '#4a2c27' : '#94584a');
  g.fillStyle = gr; g.fillRect(x0, top, x1 - x0, d);
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < (x1 - x0) * d / 70; i++) g.fillRect(x0 + ((i * 97.13) % (x1 - x0)), top + ((i * 31.7) % d), 1.3, 1.3);
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.4;
  for (const dy of [1.5, d * 0.5, d - 1.5]) { g.beginPath(); g.moveTo(x0, top + dy); g.lineTo(x1, top + dy); g.stroke(); }
  g.restore();
}

/** A station behind the track, the train standing at it with its front at
    X: a platform as long as the train with its yellow edge, a canopy on
    columns, a lamp under it; the name board, A or B, on a post at the
    platform's front end. Returns how high it reaches. */
function station(g, L, X, Yw, letter, len, tall, P) {
  const E = env(), x0 = X - len - 22, x1 = X + 22;
  const pt = Yw - 16, roof = Yw - tall - 30;
  g.save();
  // the platform: its top face, its edge, its shadowed front
  g.fillStyle = E.night ? '#5d5257' : '#c9bfb9'; g.fillRect(x0, pt, x1 - x0, 6);
  g.fillStyle = '#d9b84a'; g.fillRect(x0, pt + 4, x1 - x0, 2);
  g.fillStyle = E.night ? '#3f363a' : '#9e928c'; g.fillRect(x0, pt + 6, x1 - x0, Yw - pt - 8);
  // the canopy on its columns
  for (const cx of [x0 + 12, x1 - 12, (x0 + x1) / 2]) { g.fillStyle = E.night ? '#7a6e74' : '#6b6166'; g.fillRect(cx - 1.6, roof + 6, 3.2, pt - roof - 6); }
  const cg = g.createLinearGradient(0, roof - 6, 0, roof + 8);
  cg.addColorStop(0, E.night ? '#8a7d84' : '#a39599'); cg.addColorStop(1, E.night ? '#4a4044' : '#6b6166');
  g.fillStyle = cg; g.beginPath(); g.moveTo(x0 - 10, roof + 8); g.lineTo(x0 + 2, roof - 6); g.lineTo(x1 - 2, roof - 6); g.lineTo(x1 + 10, roof + 8); g.closePath(); g.fill();
  g.fillStyle = withAlpha(E.window, E.night ? 0.8 : 0.6); g.fillRect((x0 + x1) / 2 - 8, roof + 8, 16, 3);
  if (E.night) { const gl = g.createRadialGradient((x0 + x1) / 2, roof + 10, 0, (x0 + x1) / 2, roof + 10, 60); gl.addColorStop(0, withAlpha(E.window, 0.25)); gl.addColorStop(1, withAlpha(E.window, 0)); g.fillStyle = gl; g.fillRect(x0, roof, x1 - x0, pt - roof); }
  g.restore();
  const px = x1 + 4;
  post(g, L, px, pt, letter, P.ink, P, { height: pt - roof + 6 });
  L.reserve({ x: px - 3, y: roof + 6, w: 6, h: pt - roof });
  return roof - 26;
}

/** The end of the way, as the question's place has it. Returns the top of
    what it puts up, so the card can keep clear of it. */
function landmark(g, L, X, Yw, letter, atRest, ground, P, { finish = false, len = 60, tall = 40, R, d, lit = 'red' } = {}) {
  if (ground === 'track') {
    // a line across the track, chequered at the finish; its letter on a post
    for (let y = R, k = 0; y < R + d; y += 5, k++) {
      if (finish) for (let c = 0; c < 2; c++) { g.save(); g.fillStyle = (k + c) % 2 ? '#1e1a1c' : '#f3eee6'; g.fillRect(X - 5 + c * 5, y, 5, Math.min(5, R + d - y)); g.restore(); }
    }
    if (!finish) { g.save(); g.fillStyle = '#f3eee6'; g.fillRect(X - 2, R, 4, d); g.restore(); }
    const H = tall + 18;
    post(g, L, X, R - 5, letter, P.ink, P, { height: H });
    L.reserve({ x: X - 3, y: R - 5 - H + 2, w: 6, h: H });
    return R - 5 - H - 28;
  }
  if (ground === 'rail') return station(g, L, X, Yw, letter, len, tall, P);
  // the road: a stop line across it, and lights on the verge when the
  // traveller starts or stops there; the letter by the lamp head
  g.save(); g.fillStyle = 'rgba(243,238,230,0.9)'; g.fillRect(X - 2, R + 3, 4, d - 7); g.restore();
  if (atRest) {
    const H = tall + 22, hw = Math.max(14, H * 0.17), hh = hw * 2.7;
    trafficLights(g, X, R - 11, H, P, { lit });
    const top = R - 11 - H - hh / 2;
    L.reserve({ x: X - hw / 2 - 2, y: top, w: hw + 4, h: R - 11 - top });
    L.add(letter, X + (finish ? 1 : -1) * (hw / 2 + 14), R - 11 - H, { color: P.ink, align: 'center', pri: 10, size: 17, weight: 700 });
    return top - 4;
  }
  const H = tall + 18;
  post(g, L, X, R - 11, letter, P.ink, P, { height: H });
  L.reserve({ x: X - 3, y: R - 11 - H + 2, w: 6, h: H });
  return R - 11 - H - 28;
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'journey') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const J = f.J;
  const who = FIGURES[f.who] ? f.who : 'car', fig = FIGURES[who];
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const sc = screen(w, h, 3, 156, 172), phone = sc.phone;
  const life = Math.max(1e-6, f.tMax / 12);
  // the times each stage ends, from the start
  const ends = [0];
  for (let i = 1; i <= J.n; i++) ends.push(ends[i - 1] + J.t[i]);

  // ── sizes: the traveller at least a tenth of the width (a person at least
  // the figure's own least size), its lane deep enough to stand in
  const lorryPx = clamp(w * (w < 520 ? 0.14 : 0.11), 52, 120);
  // a person or a rider stands nearly its drawn size tall: at least PERSON_MIN
  const bd = BODY[who];
  const figPx = Math.max(fig.min || 0, lorryPx * fig.size, bd && bd.h > 0.6 ? PERSON_MIN(phone) / bd.h : 0);
  const figLen = who === 'runner' ? figPx * 0.55 : figPx;
  const tall = bd ? bd.h * figPx : figPx * fig.top / fig.size;
  const cars = fig.cars || 1;

  // ── where things go, from the bottom up: the tape, the stage brackets, the
  // way, and over it the card beside the readouts, clear of the lights
  const ground = fig.ground;
  const tapeY = h - 34, bracketY = tapeY - 12;
  const d = ground === 'rail' ? 30 : clamp(Math.min(tall, 46) * 1.2, 34, 56);
  const R = Math.round(bracketY - 28 - d - 7);
  const yw = ground === 'rail' ? R + 10 : ground === 'track' ? R + d * 0.78 : R + d * 0.88;
  // past B, room for the velocity arrow it arrives with, head and all
  const vScale = clamp(w * 0.12, 54, 140), wTop = Math.max(...J.w) || 1;
  const sx0 = figLen + (phone ? 18 : 30), sx1 = w - Math.max(phone ? 30 : 60, (Math.abs(f.vel(f.tMax).x) / wTop) * vScale + 24);
  const S = (s) => sx0 + (s / J.D) * (sx1 - sx0);
  L.reserve({ x: 0, y: 0, w: sc.hudR, h: sc.hudB });

  // ── the place
  const horizon = R - (ground === 'road' ? 30 : 24);
  landscape(g, w, h, horizon, { far: 'hills', seed: 35, clouds: 5, farHeight: clamp(horizon * 0.3, 40, 110) });
  const keep = [[S(0) - 30, S(0) + 30], [S(J.D) - 30, S(J.D) + 30]];
  if (ground === 'rail') {
    verge(g, 0, w, R - 6, { seed: 51, scale: phone ? 0.75 : 0.9, keep: [[S(0) - figLen - 40, S(0) + 40], [S(J.D) - figLen - 40, S(J.D) + 40]] });
    rails(g, 0, w, yw, P);
  } else if (ground === 'track') {
    verge(g, 0, w, R - 6, { seed: 51, scale: phone ? 0.75 : 0.9, keep });
    track(g, 0, w, R, d);
  } else {
    verge(g, 0, w, R - 11, { seed: 51, scale: phone ? 0.75 : 0.9, keep });
    road(g, 0, w, R, d, { seed: 29 });
  }
  // lights and posts as tall as a car's, whoever travels
  const lmTall = ground === 'rail' ? tall : Math.min(tall, 44);
  const moving = fired && t > 0;
  const topA = landmark(g, L, S(0), yw, 'A', J.w[0] === 0, ground, P, { len: figLen, tall: lmTall, R, d, lit: moving ? 'green' : 'red' });
  const topB = landmark(g, L, S(J.D), yw, 'B', J.w[J.n] === 0, ground, P, { finish: true, len: figLen, tall: lmTall, R, d, lit: 'red' });

  // where each stage happens: dashed displacement brackets on the verge in front
  for (let i = 1; i <= J.n; i++) {
    if (J.s[i] < 1e-9) continue;
    let s0 = 0; for (let k = 1; k < i; k++) s0 += J.s[k];
    const a = S(s0) + 2, b = S(s0 + J.s[i]) - 2;
    stroke(g, [{ x: a, y: bracketY }, { x: b, y: bracketY }], { color: P.disp, width: 2.2, dash: [7, 5] });
    stroke(g, [{ x: a, y: bracketY - 6 }, { x: a, y: bracketY + 4 }], { color: P.disp, width: 2 });
    stroke(g, [{ x: b, y: bracketY - 6 }, { x: b, y: bracketY + 4 }], { color: P.disp, width: 2 });
    const name = b - a > 110 ? T`s_${i} = ${s3(J.s[i])} [m]` : b - a > 26 ? T`s_${i}` : '';
    if (name) L.add(name, (a + b) / 2, bracketY - 14, { color: P.disp, align: 'center', pri: 6, size: 13, weight: 700, maxPush: 0 });
  }
  // equal-time marks behind the traveller, along the near edge of its way
  const dt = niceStep(J.T, 12);
  const my = ground === 'rail' ? yw + 14 : R + d - 3;
  for (let i = 0; i * dt <= t + 1e-9; i++) {
    const x = S(f.pos(i * dt).x);
    dot(g, x, my, 3.6, { fill: P.vel, stroke: '#f6f1e8', width: 1.2 });
    if (show.ticks) L.add(T`${num(i * dt, dt < 1 ? 2 : 1, { trim: true })} [s]`, x, my + 14, { color: P.vel, align: 'center', pri: 2, size: 13, maxPush: 0 });
  }
  // a pulse at each change of stage, where it happened, and at the end —
  // behind the traveller and wider than it, so it rings round it
  const xs = S(f.pos(t).x), v = f.vel(t).x, acc = f.accel(t);
  for (let i = 1; i <= J.n; i++) {
    if (J.t[i] < 1e-9) continue;
    const { age } = ageOf(t, ends[i], f.tMax, life);
    pulse(g, S(f.pos(ends[i]).x) - figLen / 2, yw - tall * 0.5, age, life, P.mark, { radius: Math.max(i === J.n ? 34 : 24, tall * 0.75) });
  }
  // the traveller, its brake lights on while it slows
  fig.draw(g, xs, yw, figPx, P, { phase: phaseFor(who, figPx, xs - S(0), { cars }), cars, still: who === 'runner' && v < 1e-6,
    brake: acc < -1e-9 && v > 1e-6 && t < f.tMax - 1e-9 });
  L.reserve({ x: xs - figLen - 2, y: yw - tall - 4, w: figLen + 4, h: tall + 4 });
  if (show.velocity !== false && v > 1e-6) {
    // from its front forwards, dashed; its value after the head, or over the
    // arrow where the head is near the edge
    const len = (v / wTop) * vScale;
    const vy = yw - (bd ? figPx * bd.vy : lorryPx * fig.mid), x0 = xs + 5, x1 = x0 + len;
    arrow(g, x0, vy, x1, vy, { color: P.velVec, width: 2.8, head: 11, dash: [7, 5] });
    const text = T`v = ${s3(v)} [m s^-1]`, room = x1 + 10 + (phone ? 92 : 110) < w;
    L.add(text, room ? x1 + 9 : xs - figLen - 8, vy, { color: P.vel, align: room ? 'left' : 'right', pri: 8, size: 14, weight: 700, maxPush: 20 });
  }
  if (show.acceleration !== false && t < f.tMax - 1e-9) {
    const mid = xs - figLen / 2, ay = yw - tall - 16;
    if (Math.abs(acc) > 1e-9) {
      const len = Math.sign(acc) * 40;
      arrow(g, mid - len / 2, ay, mid + len / 2, ay, { color: P.acc, width: 2.6, head: 10, dash: [5, 4] });
      L.add(T`a_${f.stageAt(t).i} = ${s3(Math.abs(acc))} [m s^-2]`, mid, ay - 17, { color: P.acc, align: 'center', pri: 7, size: 13, weight: 700 });
    } else {
      L.add(phone ? 'steady speed' : 'no acceleration: steady speed', mid, ay - 4, { color: P.acc, align: 'center', pri: 5, size: 13, weight: 700, maxPush: 20 });
    }
  }
  // the tape, from A to B
  tape(g, L, S, 0, J.D, tapeY, { minGap: phone ? 46 : 58 });
  L.draw(g, w, h);

  // ── the card, on the screen, clear of the lights or the stations
  unview(g);
  const top = Math.min(topA, topB) - 10;
  const box = { x0: sc.cardX0, y0: sc.cardY0, x1: sc.cardX1, y1: Math.max(sc.cardY0 + 150, Math.min(horizon - 6, top, sc.cardY0 + h * 0.6)) };
  graph(g, f, t, ends, box, P, phone, life);
  return null;
}

/** The speed–time graph on a card in the box, in the screen's pixels. */
function graph(g, f, t, ends, box, P, phone, life) {
  const L = labels(), J = f.J, answers = f.answers || [];
  const top = Math.max(...J.w) || 1;
  card(g, box.x0, box.y0, box.x1, box.y1);
  const gx0 = box.x0 + (phone ? 34 : 46), gx1 = box.x1 - (phone ? 46 : 54);
  const gy0 = box.y0 + 46, gy1 = box.y1 - 50;
  const X = (tt) => gx0 + (tt / J.T) * (gx1 - gx0);
  const vTop = top * 1.22;
  const Y = (v) => gy1 - (v / vTop) * (gy1 - gy0);
  // the head: what the area is worth, so far
  const head = phone ? `area: ${T`${s3(f.pos(t).x)} [m]`}` : `the area so far is the distance from A: ${T`${s3(f.pos(t).x)} [m]`}`;
  L.add(head, box.x1 - 14, box.y0 + 17, { color: P.disp, align: 'right', pri: 10, size: 13, weight: 700, bg: false, maxPush: 0 });
  // the axes
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx1 + 12, y: gy1 }], { color: P.axis, width: 2 });
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx0, y: gy0 - 12 }], { color: P.axis, width: 2 });
  L.add(`${T`v`} (${T`[m s^-1]`})`, box.x0 + 12, box.y0 + 17, { color: P.muted, align: 'left', pri: 8, size: 13, bg: false, maxPush: 0 });
  L.add(`${T`t`} (${T`[s]`})`, gx1 + 15, gy1, { color: P.muted, align: 'left', pri: 8, size: 13, bg: false, maxPush: 0 });
  const pts = (t0, t1) => {
    const out = [];
    for (let i = 0; i <= 80; i++) { const tt = t0 + (i / 80) * (t1 - t0); out.push({ x: X(tt), y: Y(f.speed(tt)) }); }
    return out;
  };
  // the area so far: the distance from A
  if (t > 0) {
    g.save(); g.beginPath(); g.moveTo(X(0), Y(0));
    for (const p of pts(0, t)) g.lineTo(p.x, p.y);
    g.lineTo(X(t), Y(0)); g.closePath();
    g.fillStyle = fade(g, P.disp, gy0, gy1, 0.34, 0.1); g.fill(); g.restore();
  }
  // each speed at a change, on the speed axis, dashed across to the first
  // corner at it; a speed the paper left out named as what was found
  const said = [];
  for (let i = 0; i <= J.n; i++) {
    const v = J.w[i];
    if (v < 1e-9 || said.some((s) => Math.abs(s - v) < 1e-9)) continue;
    said.push(v);
    const tc = ends[i] - (i > 0 && J.kinds[i - 1] === 'hold' ? J.t[i] : 0);
    if (tc > 1e-9) stroke(g, [{ x: gx0, y: Y(v) }, { x: X(tc), y: Y(v) }], { color: P.faint, width: 1.2, dash: [3, 4] });
    stroke(g, [{ x: gx0 - 5, y: Y(v) }, { x: gx0, y: Y(v) }], { color: P.muted, width: 1.6 });
    L.add(s3(v), gx0 - 8, Y(v), { color: P.ink, align: 'right', pri: 7, size: 13, weight: 700, bg: false, maxPush: 0 });
    const nm = Object.entries(f.named || {}).find(([k]) => Math.abs(J.w[k] - v) < 1e-9)?.[1];
    if (nm) L.add(phone ? T`${nm}` : T`${nm} = ${s3(v)} [m s^-1]`, gx0 + 8, Y(v) - 12, { color: P.vel, align: 'left', pri: 9, size: 14, weight: 700, maxPush: 0 });
  }
  L.add('0', gx0 - 8, gy1 + 2, { color: P.muted, align: 'right', pri: 4, size: 13, bg: false, maxPush: 0 });
  // each time a stage changes, on the time axis, dashed up to its corner
  const used = [];
  for (let i = 1; i <= J.n; i++) {
    const tc = ends[i];
    if (i < J.n && J.t[i] < 1e-9) continue;
    const v = J.w[i];
    if (i < J.n && v > 1e-9) stroke(g, [{ x: X(tc), y: gy1 }, { x: X(tc), y: Y(v) }], { color: P.faint, width: 1.2, dash: [3, 4] });
    stroke(g, [{ x: X(tc), y: gy1 }, { x: X(tc), y: gy1 + 5 }], { color: P.muted, width: 1.6 });
    if (used.some((x) => Math.abs(x - X(tc)) < 30)) continue;
    used.push(X(tc));
    L.add(s3(tc), X(tc), gy1 + 13, { color: P.ink, align: 'center', pri: 6, size: 13, bg: false, maxPush: 0 });
  }
  // the whole graph, faint ahead of the clock and strong behind it
  stroke(g, pts(0, J.T), { color: P.vel, width: 1.6, dash: [6, 4], alpha: 0.4 });
  if (t > 0) stroke(g, pts(0, t), { color: P.vel, width: 2.8, dash: [6, 4] });
  // each stage as a bracket under the axis, with its own time
  const tb = gy1 + 28;
  for (let i = 1; i <= J.n; i++) {
    if (J.t[i] < 1e-9) continue;
    const a = X(ends[i - 1]) + 2, b = X(ends[i]) - 2;
    stroke(g, [{ x: a, y: tb - 5 }, { x: a, y: tb }, { x: b, y: tb }, { x: b, y: tb - 5 }], { color: P.faint, width: 1.4 });
    // as much of its name as fits, never a bare number, always with its unit
    const name = b - a > 76 ? T`t_${i} = ${s3(J.t[i])} [s]` : b - a > 22 ? T`t_${i}` : '';
    if (name) L.add(name, (a + b) / 2, tb + 11, { color: P.muted, align: 'center', pri: 5, size: 13, bg: false, maxPush: 0 });
  }
  // each stage's piece of the area, named once the clock has passed it, in
  // the piece if it is wide enough to hold its name
  for (let i = 1; i <= J.n; i++) {
    if (J.t[i] < 1e-9 || t < ends[i] - 1e-9) continue;
    const x0 = X(ends[i - 1]), x1 = X(ends[i]);
    const full = T`s_${i} = ${s3(J.s[i])} [m]`;
    g.save(); g.font = `700 13px ${getComputedStyle(document.documentElement).getPropertyValue('--font') || 'system-ui'}`;
    const fits = g.measureText(full).width + 10 < x1 - x0; g.restore();
    if (x1 - x0 < 24) continue;
    const lowV = Math.min(J.w[i - 1], J.w[i]);
    const tri = lowV < top * 0.3 && J.kinds[i - 1] !== 'hold';
    const cx = tri ? x0 + (J.w[i] > J.w[i - 1] ? 0.62 : 0.38) * (x1 - x0) : (x0 + x1) / 2;
    const cy = Y(tri ? Math.max(J.w[i], J.w[i - 1]) * 0.26 : lowV * 0.5);
    L.add(fits ? full : T`s_${i}`, cx, cy, { color: P.disp, align: 'center', pri: 7, size: 13, weight: 700, maxPush: 0 });
  }
  // each corner pulses as the clock reaches it
  for (let i = 1; i <= J.n; i++) {
    if (J.t[i] < 1e-9) continue;
    const { age } = ageOf(t, ends[i], f.tMax, life);
    pulse(g, X(ends[i]), Y(J.w[i]), age, life, P.mark, { radius: 16 });
  }
  // the cursor, and the instants a question asked about
  stroke(g, [{ x: X(t), y: gy1 }, { x: X(t), y: gy0 - 8 }], { color: P.muted, width: 1.4, dash: [5, 5] });
  dot(g, X(t), Y(f.speed(t)), 5, { fill: P.surface, stroke: P.vel, width: 2.4 });
  for (const ans of answers) {
    for (const ta of ans.times || (ans.t != null ? [ans.t] : [])) {
      if (t < ta - 1e-9) continue;
      dot(g, X(ta), Y(f.speed(ta)), 7, { stroke: P.mark, width: 2.4 });
    }
  }
  L.draw(g, box.x1 + 4, box.y1 + 4);
}
