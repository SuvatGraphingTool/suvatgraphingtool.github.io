// sink.js — a particle projected vertically upwards from a point A above
// horizontal ground, moving freely under gravity until it reaches the ground;
// the ground is soft, and it sinks into it against a constant resistive force
// until it comes to rest. (Edexcel 6677 M1 Jan 2003 Q7, Jun 2012 Q5.)
//
// SUVAT, with the one-step link the build rules allow: in the ground the
// resultant force is the weight less the resistance, F = ma gives a constant
// deceleration, and SUVAT takes it to rest (design/library/build-rules.md).
// Either the resistance is given and the depth found, or the depth given and
// the resistance found.
//
// CONVENTION. In the air, up is positive, from A (as the papers take it). In
// the ground, down is positive, from the surface, so the weight is positive
// and the resistance negative — the mark schemes' m g − R = m a.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d(x)})` : d(x));
// ut − ½gt², with no 0t term when it is dropped from rest
const ut = (u) => (u === 0 ? '-' : `${d(u)}t - `);

/**
 * @param k { u, H, vL, h, y, m, R, depth, g }
 *   h      A's height above the ground (m), 0 or more
 *   one of u (its speed up at A), H (its greatest height above A) or vL (its speed reaching the ground)
 *   y      a height above A to find the times at (m) — optional, negative below A
 *   m      its mass (kg);  one of R (the ground's resistance, N) or depth (how far it sinks, m)
 */
export function solveSink(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  if (!have(k.h) || k.h < 0) return fail('Still needed: how high A is above the ground, 0 or more.');
  const h = k.h, given = ['u', 'H', 'vL'].filter((q) => have(k[q]));
  if (given.length === 0) return fail('Still needed: its speed up at A, or its greatest height above A, or how fast it reaches the ground.');
  if (given.length > 1) return fail('Give one of the three — the speed at A, the greatest height, the speed at the ground: each fixes the other two.');
  if (have(k.m) && !(k.m > 0)) return fail('The mass is a positive number of kilograms.');
  if (have(k.R) && have(k.depth)) return fail('Give the ground’s resistance or how far it sinks, not both: one fixes the other.');
  if (!have(k.R) && !have(k.depth)) return fail('Still needed: the ground’s resistance, or how far it sinks into the ground.');
  if (have(k.R) && !have(k.m)) return fail('With the resistance given, the mass is needed too: the deceleration is the resistance less the weight, over m.');
  if (have(k.depth) && !(k.depth > 0)) return fail('How far it sinks is a positive distance.');
  const m = have(k.m) ? k.m : null, rows = [], air = [];

  // ── the launch: from what was given, its speed up at A
  let u;
  if (have(k.u)) {
    if (k.u < 0) return fail('It is projected upwards: its speed at A is 0 or more.');
    u = k.u;
  } else if (have(k.H)) {
    if (!(k.H >= 0)) return fail('Its greatest height above A is a distance: 0 or more (0: dropped from rest).');
    u = snap(Math.sqrt(2 * g * k.H));
    if (u > 0) air.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = u^2 + 2 * (-${d(g)}) * ${d(k.H)}`, r: M`u = ${d(u)} [m s^-1]` });
  } else {
    if (!(k.vL > 0)) return fail('Its speed reaching the ground is a speed: give it as a positive number.');
    const low = Math.sqrt(2 * g * h);
    if (!(k.vL >= low - 1e-9)) return fail(`Falling ${num(h, 3, { trim: true })} m from rest it would already reach ${num(low, 3, { trim: true })} m s⁻¹: it cannot land slower than that.`);
    u = snap(Math.sqrt(Math.max(0, k.vL * k.vL - 2 * g * h)));
    air.push({ f: M`v^2 = u^2 + 2as`, s: h > 0 ? M`${d(k.vL)}^2 = u^2 + 2 * (-${d(g)}) * (-${d(h)})` : M`${d(k.vL)}^2 = u^2`, r: M`u = ${d(u)} [m s^-1]` });
  }
  const H = snap((u * u) / (2 * g)), tTop = snap(u / g);

  // ── to the ground: s = ut + ½at² with s = −h, the later root
  const v2 = u * u + 2 * g * h, vL = snap(Math.sqrt(v2));
  const tLand = snap((u + Math.sqrt(v2)) / g);
  if (!(vL > 1e-9)) return fail('From the ground with no speed it never moves: give A a height, or a speed.');
  air.push({ f: M`s = ut + ½at^2`, s: M`${h > 0 ? `-${d(h)}` : '0'} = ${ut(u)}${d(g / 2)}t^2`, r: M`t = ${d(tLand)} [s]` });
  if (!have(k.vL)) air.push({ f: M`v^2 = u^2 + 2as`, s: h > 0 ? M`v^2 = ${d(u)}^2 + 2 * (-${d(g)}) * (-${d(h)})` : M`v^2 = ${d(u)}^2`, r: M`v = -${d(vL)} [m s^-1] "(down)"` });

  // ── a height above A, if one was asked about: the times it is there
  let tAt = null, yAsk = null;
  if (have(k.y)) {
    yAsk = k.y;
    if (yAsk < -h - 1e-9) return fail(`A is ${num(h, 3, { trim: true })} m up: below the ground it is sinking, not flying. Ask about a height above the ground.`);
    const disc = u * u - 2 * g * yAsk;
    if (disc < -1e-9) tAt = [];
    else {
      const r = Math.sqrt(Math.max(0, disc)), t1 = snap((u - r) / g), t2 = snap((u + r) / g);
      // the launch is not a time it comes to a height; two roots that would print alike are one
      tAt = [t1, t2].filter((x) => x > 1e-9 && x <= tLand + 1e-9);
      // a height within a rounding of the top is the top
      if (u > 0 && (Math.abs(t2 - t1) < 1e-3 || d(t1) === d(t2) || Math.abs(yAsk - H) < 1e-3 * Math.max(1, H))) tAt = [tTop];
    }
    air.push({ f: M`s = ut + ½at^2`, s: M`${d(yAsk)} = ${ut(u)}${d(g / 2)}t^2`,
      r: tAt.length === 0 ? (u === 0 && Math.abs(yAsk) < 1e-9 ? 'it starts there, and only falls from it' : `it never rises that high: its greatest height is ${M`${d(H)} [m]`}`) : M`t = ${tAt.map(d).join(' "or" ')} [s]` });
  }

  // ── in the ground: down positive. F = ma, then v² = u² + 2as to rest
  let a, depth, R;
  if (have(k.R)) {
    R = k.R;
    if (!(R > m * g + 1e-9)) return fail(`The ground must push up harder than the weight, ${num(m * g, 3, { trim: true })} N, or it never stops sinking.`);
    a = snap(g - R / m);
    depth = snap(v2 / (-2 * a));
    if (depth > 100) return fail(`It would sink ${num(depth, 0)} m before it stopped: a resistance so close to its weight hardly slows it. Give a larger resistance.`);
    rows.push({ f: M`m g - R = ma`, s: M`${d(m)} * ${d(g)} - ${d(R)} = ${d(m)}a`, r: M`a = ${d(a)} [m s^-2]` });
    rows.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${d(vL)}^2 + 2 * ${sb(a)}s`, r: M`s = ${d(depth)} [m]` });
  } else {
    depth = k.depth;
    if (depth > 100) return fail('A sink of more than 100 m is not soft ground: give how far it sinks in metres, a few centimetres or so.');
    a = snap(-v2 / (2 * depth));
    rows.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${d(vL)}^2 + 2a * ${d(depth)}`, r: M`a = ${d(a)} [m s^-2]` });
    if (m != null) {
      R = snap(m * (g - a));
      rows.push({ f: M`m g - R = ma`, s: M`${d(m)} * ${d(g)} - R = ${d(m)} * ${sb(a)}`, r: M`R = ${d(R)} [N]` });
    } else R = null;
  }
  const tSink = snap(vL / -a);
  rows.push({ f: M`v = u + at`, s: M`0 = ${d(vL)} + ${sb(a)}t`, r: M`t = ${d(tSink)} [s]` });

  // the run: the flight, the sink, then a pause at rest in which the stage replays
  // the sink slowed down — too quick to see at the speed of the flight
  const tRest = snap(tLand + tSink), hold = snap(Math.max(0.8, tLand * 0.35)), tMax = snap(tRest + hold);
  // the replay starts with the ball half its final depth above the ground, and waits a
  // fifth of the pause at rest first, so the stop is seen before it is played again
  const pre = Math.min((0.5 * depth) / vL, tLand), beat = hold * 0.2, play = hold - beat;
  // a sink slow enough to watch at the flight's own pace needs no replay
  const slow = play / (pre + tSink) >= 2 ? play / (pre + tSink) : null;
  const dec = -a;
  const pos = (t) => {
    const c = Math.min(Math.max(t, 0), tMax);
    if (c <= tLand) return u * c - 0.5 * g * c * c;
    if (c <= tRest) { const s = c - tLand; return -h - (vL * s - 0.5 * dec * s * s); }
    return -h - depth;
  };
  // at rest exactly: the sink's line meets zero at tRest, not a rounding off it
  const vel = (t) => { const c = Math.min(Math.max(t, 0), tMax); return c <= tLand ? u - g * c : c < tRest - 1e-12 ? -(vL - dec * (c - tLand)) : 0; };
  const acc = (t) => (t < tLand ? -g : t < tRest ? dec : 0);
  // the slow replay: over the pause, the moment it reaches the ground and sinks, at the
  // real time each instant of the pause stands for
  const replay = (t) => (slow == null || t <= tRest + beat ? null : snap(tLand - pre + (Math.min(t, tMax) - tRest - beat) * ((pre + tSink) / play)));

  const notes = [
    `${u === 0 ? 'Released from rest at A, it' : `It leaves A at ${M`${d(u)} [m s^-1]`}, rises ${M`${d(H)} [m]`} above it, and`} reaches the ground ${M`${d(tLand)} [s]`} after it was ${u === 0 ? 'let go' : 'projected'}, moving at ${M`${d(vL)} [m s^-1]`}.`,
    `In the ground the resistance outweighs the weight: a deceleration of ${M`${d(-a)} [m s^-2]`}${R != null ? `, from a resistance of ${M`${d(R)} [N]`}` : ''}. It sinks ${M`${d(depth)} [m]`} in ${M`${d(tSink)} [s]`} and stops.`,
  ];
  if (tAt) notes.push(tAt.length === 0 ? (u === 0 && Math.abs(yAsk) < 1e-9 ? 'It starts at A and only falls from there: it is never back at A.' : `It never reaches ${M`${d(yAsk)} [m]`} above A: it rises only ${M`${d(H)} [m]`}.`)
    : Math.abs(yAsk) < 1e-9 ? `It is back at A${h > 0 ? '' : ', on the ground,'} at ${M`${d(tAt[0])} [s]`}${h > 0 ? ', on its way down' : ''}.`
      : Math.abs(yAsk + h) < 1e-9 ? `${M`${d(h)} [m]`} below A is the ground: it gets there at ${M`${d(tAt[0])} [s]`}.`
        : tAt.length === 1 ? `It is ${M`${d(Math.abs(yAsk))} [m]`} ${yAsk < 0 ? 'below' : 'above'} A once, at ${M`${d(tAt[0])} [s]`}${Math.abs(tAt[0] - tTop) < 1e-3 ? ', at the top' : ', on its way down'}.`
          : `It is ${M`${d(yAsk)} [m]`} above A twice: at ${M`${d(tAt[0])} [s]`} on the way up and ${M`${d(tAt[1])} [s]`} on the way down.`);
  const derived = [`${M`u = ${d(u)} [m s^-1]`}`, `lands after ${M`${d(tLand)} [s]`}`, R != null ? `${M`R = ${d(R)} [N]`}` : `${M`a = ${d(a)} [m s^-2]`}`, `sinks ${M`${d(depth)} [m]`}`];

  const f = { kind: 'sink', u, h, H, g, m, vL, tTop, tLand, tSink, tRest, tMax, tFlight: tMax, a, R, depth, yAsk, tAt, slow, replay, tReplay: slow == null ? null : snap(tRest + beat),
    pos, vel, acc, W: m != null ? snap(m * g) : null, tMid: snap(tLand / 2),
    params: { u, theta: 90, h, g } };
  return { ok: true, mode: 'sink', u, H, T: tLand, vL, a, decel: snap(-a), R, depth, tSink, tAt, rows: [...air, ...rows], air, ground: rows, notes, derived, f };
}

/** The working: the flight from A to the ground, then into the ground to rest. */
export function sinkWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'In the air: up from A to the ground', rows: s.air,
      note: `Up is positive, from A: the ground is at ${s.f.h > 0 ? M`s = -${d(s.f.h)} [m]` : M`s = 0`}, and the acceleration is ${M`-${d(s.f.g)} [m s^-2]`} throughout.` },
    { title: 'In the ground: the resistance brings it to rest', rows: s.ground,
      note: 'Down is positive now. The resistance acts up, against the sinking, and the weight still acts down: their resultant gives the deceleration.' },
  ];
}
