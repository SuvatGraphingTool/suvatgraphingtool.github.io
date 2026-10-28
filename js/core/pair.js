// pair.js — two particles in one vertical line, set off at different times:
// when do they meet, and where?
//
// The exam family: A is projected upwards from the ground, and some time
// later B is dropped from a height above it — or projected from the same
// point two seconds after the first — and the question is when and how high
// they collide, and how fast each is moving then. None of it is new physics:
// each particle is SUVAT with a = −g, and the collision is the one moment
// both equations give the same height. What is new is that there are two
// clocks, and the second starts late.
//
// CONVENTION. Up is positive, heights are measured up from the ground, and
// the clock starts at t = 0; each particle sets off at its own time (0 unless
// it says otherwise) and until then it is held still where it starts. Once
// it reaches the ground it stays there.
//
// Each particle is a motion in stages (js/core/stages.js): held, then free,
// then at rest on the ground. The meeting is the first root of the difference
// of the two heights while both are above the ground — so a pair that never
// meets says so, and why, instead of being steered into meeting. (The old
// "Two that collide" card derived the second launch FROM the meeting, so it
// could not fail; see design/presets.md. This one can.)
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4). The stage, the graphs, the HUD
// and the working only read what this file returns.

import { staged, meetings, quadRoots } from './stages.js';
import { M, num, signed } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p = 2) => num(x, p, { trim: true });
const sb = (x, p = 2) => signed(x, p, { trim: true });
const NAMES = ['A', 'B'];

/* ── one particle ───────────────────────────────────────────────────────
   held at h until t0, then free with a = −g, then on the ground. */
export function particle({ h, u, t0 = 0, g }, name = 'A') {
  // the time in the air: h + uτ − ½gτ² = 0, the positive root
  let tau;
  if (g > EPS) tau = (u + Math.sqrt(u * u + 2 * g * h)) / g;
  else tau = u < -EPS ? h / -u : Infinity;
  if (!(tau > EPS)) tau = 0;                 // on the ground and not thrown up: never leaves it
  const stages = [];
  if (t0 > EPS) stages.push({ t0: 0, t1: t0, x0: h, u: 0, a: 0, kind: 'held' });
  stages.push({ t0, t1: t0 + tau, x0: h, u, a: -g, kind: 'free' });
  const m = staged(stages);
  const tLand = t0 + tau;
  const vLand = isFinite(tau) ? u - g * tau : NaN;
  const tTop = g > EPS && u > EPS ? t0 + u / g : null;
  return { ...m, name, h, u, t0, g, tLand, vLand, tTop, yTop: tTop != null ? h + u * u / (2 * g) : h };
}

/* ── the heights as polynomials in t, for the working ───────────────────
   y = h + u(t − t0) − ½g(t − t0)², multiplied out:
     c0 = h − u t0 − ½g t0²,  c1 = u + g t0,  c2 = −½g                   */
function coeffs(p, held) {
  if (held) return [p.h, 0, 0];
  return [p.h - p.u * p.t0 - 0.5 * p.g * p.t0 * p.t0, p.u + p.g * p.t0, -0.5 * p.g];
}

/** c0 + c1 t + c2 t², as source for M``: `35 + 10t - 5t^2`. */
export function poly([c0, c1, c2], dp = 3, { desc = false } = {}) {
  const terms = [];
  const add = (c, tail) => {
    if (Math.abs(c) < 1e-9) return;
    const mag = Math.abs(c);
    const body = tail && Math.abs(mag - 1) < 1e-9 ? tail : `${d(mag, dp)}${tail}`;
    terms.push({ neg: c < 0, body });
  };
  add(c2, 't^2'); add(c1, 't'); add(c0, '');
  // A height reads constant first, h + ut − ½gt²; an equation to solve reads
  // highest power first, 10t − 35 = 0.
  if (!desc) terms.reverse();
  if (!terms.length) return '0';
  return terms.map((x, i) => (i === 0 ? (x.neg ? `-${x.body}` : x.body) : `${x.neg ? '-' : '+'} ${x.body}`)).join(' ');
}

/** Where each particle is, in words, for a reason or a note. */
const word = (p) => (p.u > EPS ? 'thrown up' : p.u < -EPS ? 'thrown down' : 'released from rest');

/**
 * Two particles, one vertical line.
 * @param k { A: {h, u, t0}, B: {h, u, t0}, g }
 * @returns the shape js/core/road.js answers in: { ok, reason?, mode, params,
 *          f, derived, notes, moment, convention, ... } plus { A, B, meet,
 *          rows } — `rows` is each particle's five at the meeting.
 */
export function solvePair(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g;
  const missing = [];
  for (const n of NAMES) {
    const q = k[n] || {};
    if (!have(q.h)) missing.push(`the height ${n} starts from`);
    if (!have(q.u)) missing.push(`${n}’s initial velocity`);
  }
  if (!have(g)) missing.push('the value of g');
  if (missing.length) {
    return fail(`Still needed: ${missing.join(', ')}.`);
  }
  if (g < 0) return fail('Give g as a size: the engine takes up as positive, so the acceleration is −g.');
  for (const n of NAMES) {
    const q = k[n];
    if (q.h < 0) return fail(`Heights are measured up from the ground, so ${n} cannot start below it.`);
    if (have(q.t0) && q.t0 < 0) return fail(`${n} sets off at a negative time. Start the clock at the first one to move.`);
  }

  const A = particle({ ...k.A, t0: have(k.A.t0) ? k.A.t0 : 0, g }, 'A');
  const B = particle({ ...k.B, t0: have(k.B.t0) ? k.B.t0 : 0, g }, 'B');
  for (const p of [A, B]) {
    if (p.tLand - p.t0 < EPS) {
      return fail(`${p.name} starts on the ground with no upward velocity, so it never leaves it.`);
    }
  }

  // How long to look: until both are down. With no gravity one may never come
  // down, and the meeting can be as late as the numbers make it, so the
  // search runs on regardless; only the run that is shown stops sooner.
  const down = Math.max(A.tLand, B.tLand);
  const tEndLook = isFinite(down) ? down : 1e7;

  // When they are level: roots of yA − yB, while both are above the ground
  // and at least one is moving. Two that start level start together; that
  // instant is not a meeting.
  const all = meetings(A, B, { from: 0, to: tEndLook });
  if (all.some((m) => m.together && m.until - m.t > 1e-6 && m.t >= Math.max(A.t0, B.t0) - 1e-9)) {
    return fail('Those are the same motion twice: the same start, the same velocity, at the same time. '
      + 'They move as one particle and never meet.');
  }
  const air = (m) => m.x > 1e-6 && m.t > 1e-7 && m.t < tEndLook + 1e-9
    && !(A.stageAt(m.t)?.kind !== 'free' && B.stageAt(m.t)?.kind !== 'free')
    && !(Math.abs(m.t - Math.max(A.t0, B.t0)) < 1e-9 && Math.abs(A.h - B.h) < 1e-9 && Math.abs(m.x - A.h) < 1e-9);
  const meet = all.find(air) || null;

  const notes = [];
  const tA = A.t0, tB = B.t0;
  if (!have(k.A.t0) && !have(k.B.t0)) notes.push('Both set off at the same instant, t = 0.');

  let moment = null, rows = null, tMax;
  if (meet) {
    const heldA = A.stageAt(meet.t)?.kind === 'held', heldB = B.stageAt(meet.t)?.kind === 'held';
    if (heldA || heldB) {
      notes.push(`${heldA ? 'A' : 'B'} is still being held when the other reaches it: they meet before it is let go.`);
    }
    const sA = meet.x - A.h, sB = meet.x - B.h;
    rows = [A, B].map((p, i) => {
      const held = i === 0 ? heldA : heldB;
      const tIn = held ? 0 : meet.t - p.t0;
      return {
        name: p.name, held,
        u: held ? 0 : p.u, v: i === 0 ? meet.vA : meet.vB, a: held ? 0 : -g,
        s: i === 0 ? sA : sB, t: tIn,
      };
    });
    moment = {
      t: meet.t, y: meet.x, vA: meet.vA, vB: meet.vB,
      text: `They meet ${M`${d(meet.x)} [m]`} above the ground, at ${M`t = ${d(meet.t, 3)} [s]`}.`,
    };
    tMax = meet.t;
  } else {
    tMax = isFinite(down) ? down : Math.max(A.t0, B.t0, isFinite(A.tLand) ? A.tLand : 0, isFinite(B.tLand) ? B.tLand : 0) + 10;
    notes.push(neverSay(A, B, g));
  }

  const f = pairMotion(A, B, tMax, meet);
  const derived = meet
    ? [M`t = ${d(meet.t, 3)} [s]`, `${M`${d(meet.x)} [m]`} up`]
    : ['they never meet'];

  const extras = meet ? [
    { key: 'tMeet', label: 'they meet at', value: meet.t, unit: 's' },
    { key: 'yMeet', label: 'height then', value: meet.x, unit: 'm' },
    { key: 'speedA', label: 'speed of A', value: Math.abs(meet.vA), unit: 'm s⁻¹' },
    { key: 'speedB', label: 'speed of B', value: Math.abs(meet.vB), unit: 'm s⁻¹' },
    { key: 'dSpeed', label: 'difference in speeds', value: Math.abs(Math.abs(meet.vA) - Math.abs(meet.vB)), unit: 'm s⁻¹' },
    { key: 'closing', label: 'closing speed', value: Math.abs(meet.vA - meet.vB), unit: 'm s⁻¹' },
  ] : [];

  return {
    ok: true, mode: 'pair', axis: 'up', params: { g, A: { h: A.h, u: A.u, t0: A.t0 }, B: { h: B.h, u: B.u, t0: B.t0 } },
    f, A, B, meet, moment, rows, extras, derived, notes,
    convention: 'Taking up as positive, with heights measured from the ground.',
  };
}

/* Why two particles never met — the honest reason, from the engine. */
function neverSay(A, B, g) {
  const lo = Math.max(A.t0, B.t0), hi = Math.min(A.tLand, B.tLand);
  const first = A.tLand <= B.tLand ? A : B, other = first === A ? B : A;
  if (hi <= lo + 1e-9) {
    return `They are never in the air together: ${first.name} is on the ground at ${M`t = ${d(first.tLand)} [s]`}, `
      + `and ${other.name} does not set off until ${M`t = ${d(other.t0)} [s]`}.`;
  }
  const mid = (lo + Math.min(hi, lo + 1)) / 2;
  const top = A.pos(mid) > B.pos(mid) ? A : B, low = top === A ? B : A;
  const end = isFinite(first.tLand)
    ? `${first.name} reaches the ground first, at ${M`t = ${d(first.tLand)} [s]`}.`
    : 'neither ever comes back down.';
  return `They never meet. ${low.name} stays below ${top.name} for as long as both are in the air, and ${end}`
    + (g < EPS ? ' With no gravity, nothing turns them round.' : '');
}

/* ── the motion, in the shape the transport asks for ────────────────────
   The clock, the scrubber and the replay need a tMax and a path; the stage
   and the graphs read the two particles themselves. */
function pairMotion(A, B, tMax, meet) {
  const clampT = (t) => Math.min(Math.max(t, 0), tMax);
  // The highest either gets before the run ends: a start, an apex reached in
  // time, or where it is at the end. The stage frames this, not the apex a
  // particle would have reached had nothing stopped the run.
  const top = Math.max(...[A, B].map((p) => Math.max(p.h, p.pos(tMax),
    p.tTop != null && p.tTop <= tMax ? p.yTop : -Infinity)));
  const f = {
    kind: 'pair', A, B, meet, tMax, tFlight: tMax, top,
    params: { g: A.g, h: Math.max(A.h, B.h), u: A.u, theta: 90 },
    pos: (t) => ({ x: 0, y: A.pos(clampT(t)) }),
    vel: (t) => ({ x: 0, y: A.vel(clampT(t)) }),
    speed: (t) => Math.abs(A.vel(clampT(t))),
    accel: (t) => A.acc(clampT(t)),
    bounces: 0, segments: [], horiz: 0, range: 0,
    kineticEnergy: () => 0, momentum: () => 0,
    /** How far apart they are, B above A positive — the gap the stage brackets. */
    gap: (t) => B.pos(clampT(t)) - A.pos(clampT(t)),
    /** Each particle's height, velocity and stage at t, read by the stage and the HUD. */
    at: (t) => ({ A: A.state(clampT(t)), B: B.state(clampT(t)) }),
    path(n = 200, tEnd = tMax) {
      const out = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; out.push({ t, x: 0, y: A.pos(t) }); }
      return out;
    },
  };
  return f;
}

/* ── the working ────────────────────────────────────────────────────────
   Each height as a function of t, multiplied out; the two set equal; the t²
   terms cancel when both are falling freely, which is the point worth
   noticing; then the height and the velocities at that instant. */
export function pairWorking(solved) {
  if (!solved?.ok) return [];
  const { A, B, meet, params: { g } } = solved;
  const late = B.t0 > EPS ? 'B' : A.t0 > EPS ? 'A' : null;
  const out = [{
    title: 'Where each one is',
    rows: [A, B].map((p) => {
      const held = meet && p.stageAt(meet.t)?.kind === 'held';
      const n = p.name;
      if (held) {
        return { f: M`y_${n} = h_${n}`, s: M`${d(p.h)}`, r: M`y_${n} = ${d(p.h)} [m]` };
      }
      if (Math.abs(p.t0) < EPS) {
        return { f: M`y_${n} = h_${n} + u_${n}t - ½gt^2`,
                 s: M`${d(p.h)} + ${sb(p.u)}t - ½ * ${d(g)}t^2`,
                 r: M`y_${n} = ${poly(coeffs(p, false))}` };
      }
      return { f: M`y_${n} = h_${n} + u_${n}(t - t_${n}) - ½g(t - t_${n})^2`,
               s: M`${d(p.h)} + ${sb(p.u)}(t - ${d(p.t0)}) - ½ * ${d(g)}(t - ${d(p.t0)})^2`,
               r: M`y_${n} = ${poly(coeffs(p, false))}` };
    }),
    note: `${M`y`} is the height above the ground, ${M`t`} is time on the one clock, and each `
      + `particle’s own ${M`t`} only starts once it is moving${late ? ` — hence ${late === 'A' ? M`t - t_A` : M`t - t_B`}` : ''}.`,
  }];
  if (!meet) return out;

  const heldA = A.stageAt(meet.t)?.kind === 'held', heldB = B.stageAt(meet.t)?.kind === 'held';
  const cA = coeffs(A, heldA), cB = coeffs(B, heldB);
  let dc = [cA[0] - cB[0], cA[1] - cB[1], cA[2] - cB[2]];
  const linear = Math.abs(dc[2]) < 1e-9;
  // written with a positive leading term, the way it is written by hand
  if ((linear ? dc[1] : dc[2]) < 0) dc = dc.map((c) => -c);
  const rows = [{ f: M`y_A = y_B`, s: M`${poly(cA)} = ${poly(cB)}`, r: M`${poly(dc, 3, { desc: true })} = 0` }];
  if (linear) {
    rows.push({ f: M`t = ${d(-dc[0], 3)}/${d(dc[1], 3)}`, s: '', r: M`t = ${d(meet.t, 3)} [s]` });
  } else {
    const roots = quadRoots(dc[2], dc[1], dc[0]);
    rows.push({
      f: M`t = (-b +- sqrt(b^2 - 4ac))/(2a)`,
      s: M`(-${sb(dc[1], 3)} +- sqrt(${sb(dc[1], 3)}^2 - 4 * ${sb(dc[2], 3)} * ${sb(dc[0], 3)}))/(2 * ${sb(dc[2], 3)})`,
      r: roots.length > 1
        ? M`t = ${d(roots[0], 3)} [s] "or" t = ${d(roots[1], 3)} [s]`
        : M`t = ${d(meet.t, 3)} [s]`,
    });
  }
  out.push({
    title: 'They meet when the heights are equal',
    rows,
    note: linear && !heldA && !heldB
      ? `The ${M`t^2`} terms cancel: both fall with the same ${M`g`}, so relative to each other neither accelerates, and the gap between them closes at a steady rate. That is why one equation in ${M`t`} is enough.`
      : linear ? 'Neither height has a squared term left in it, so this is a straight line in t.'
      : `A quadratic: the root wanted is the first one at which both are in the air${heldA || heldB ? ' — here, before the held one is let go' : ''}.`,
  });

  const p = heldA ? B : A, n = p.name;
  out.push({
    title: 'The height they meet at',
    rows: [Math.abs(p.t0) < EPS
      ? { f: M`y_${n} = h_${n} + u_${n}t - ½gt^2`, s: M`${d(p.h)} + ${sb(p.u)} * ${d(meet.t, 3)} - ½ * ${d(g)} * ${d(meet.t, 3)}^2`, r: M`y = ${d(meet.x)} [m]` }
      : { f: M`y_${n} = h_${n} + u_${n}(t - t_${n}) - ½g(t - t_${n})^2`, s: M`${d(p.h)} + ${sb(p.u)} * ${d(meet.t - p.t0, 3)} - ½ * ${d(g)} * ${d(meet.t - p.t0, 3)}^2`, r: M`y = ${d(meet.x)} [m]` }],
  });

  const vrow = (q, held, v) => {
    const m = q.name;
    if (held) return { f: M`v_${m} = 0`, s: '', r: M`v_${m} = 0 [m s^-1]` };
    return Math.abs(q.t0) < EPS
      ? { f: M`v_${m} = u_${m} - gt`, s: M`${sb(q.u)} - ${d(g)} * ${d(meet.t, 3)}`, r: M`v_${m} = ${d(v)} [m s^-1]` }
      : { f: M`v_${m} = u_${m} - g(t - t_${m})`, s: M`${sb(q.u)} - ${d(g)} * ${d(meet.t - q.t0, 3)}`, r: M`v_${m} = ${d(v)} [m s^-1]` };
  };
  out.push({
    title: 'How fast each is going then',
    rows: [vrow(A, heldA, meet.vA), vrow(B, heldB, meet.vB)],
    note: `Negative is downwards. The speeds are ${M`${d(Math.abs(meet.vA))}`} and ${M`${d(Math.abs(meet.vB))} [m s^-1]`}, `
      + `so they differ by ${M`${d(Math.abs(Math.abs(meet.vA) - Math.abs(meet.vB)))} [m s^-1]`}, and they close on each other at `
      + `${M`${d(Math.abs(meet.vA - meet.vB))} [m s^-1]`}.`,
  });
  return out;
}

export { word as howSetOff };
