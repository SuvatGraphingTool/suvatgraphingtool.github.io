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
// and the working only read what this file returns — including the sentences
// that say what happened, which are decided here and nowhere else.

import { staged, meetings, quadRoots } from './stages.js';
import { flight } from './projectile.js';
import { snap, rat } from './numeric.js';
import { M, num, signed } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
// two places, or enough significant figures for a small one: 0.004 m is not 0 m
const d = (x, p = 2) => num(x, x !== 0 && Math.abs(x) < 0.1 ? Math.max(p, 2 - Math.floor(Math.log10(Math.abs(x)))) : p, { trim: true });
const sb = (x, p = 2) => signed(x, p, { trim: true });
const NAMES = ['A', 'B'];
const LOOK = 10;            // s shown after the later start, when nothing ever comes down


/* ── one particle ───────────────────────────────────────────────────────
   held at h until t0, then free with a = −g, then on the ground. The time in
   the air is the projectile engine's own, thrown straight up or down. */
export function particle({ h, u, t0 = 0, g }, name = 'A') {
  let tau = flight({ u: Math.abs(u), theta: u < 0 ? -90 : 90, h, g }).tFlight;
  if (!(tau > EPS)) tau = 0;                 // on the ground and not thrown up: never leaves it
  const stages = [];
  if (t0 > EPS) stages.push({ t0: 0, t1: t0, x0: h, u: 0, a: 0, kind: 'held' });
  stages.push({ t0, t1: t0 + tau, x0: h, u, a: -g, kind: 'free' });
  const m = staged(stages);
  const tTop = g > EPS && u > EPS ? t0 + u / g : null;
  return { ...m, name, h, u, t0, g, tLand: t0 + tau, vLand: isFinite(tau) ? u - g * tau : NaN,
           tTop, yTop: tTop != null ? h + u * u / (2 * g) : h };
}

/* ── the heights as polynomials in t, for the working ───────────────────
   y = h + u(t − t0) − ½g(t − t0)², multiplied out:
     c0 = h − u t0 − ½g t0²,  c1 = u + g t0,  c2 = −½g                   */
function coeffs(p, held) {
  if (held) return [p.h, 0, 0];
  return [p.h - p.u * p.t0 - 0.5 * p.g * p.t0 * p.t0, p.u + p.g * p.t0, -0.5 * p.g].map(snap);
}

/** c0 + c1 t + c2 t², as source for M``: `35 + 10t - 5t^2`. */
export function poly([c0, c1, c2], dp = 3, { desc = false, sym = 't' } = {}) {
  const terms = [];
  const add = (c, tail) => {
    if (Math.abs(c) < 1e-9) return;
    const mag = Math.abs(c);
    const body = tail && Math.abs(mag - 1) < 1e-9 ? tail : `${d(mag, dp)}${tail}`;
    terms.push({ neg: c < 0, body });
  };
  add(c2, `${sym}^2`); add(c1, sym); add(c0, '');
  // A height reads constant first, h + ut − ½gt²; an equation to solve reads
  // highest power first, 10t − 35 = 0.
  if (!desc) terms.reverse();
  if (!terms.length) return '0';
  return terms.map((x, i) => (i === 0 ? (x.neg ? `-${x.body}` : x.body) : `${x.neg ? '-' : '+'} ${x.body}`)).join(' ');
}

/** p⁄q in lowest terms when it is a fraction a student would write — 7⁄2,
    1⁄7, 15⁄7, never 451⁄202 — or null. The one fraction rule (js/core/numeric.js). */
export function ratio(p, q) {
  if (!(Math.abs(q) > 1e-12)) return null;
  const r = rat(p / q, 20);
  return r && r.q > 1 && Math.abs(r.p) <= 400 ? r : null;
}

/** Each particle's height as written by hand, with the numbers in. Zero terms
    are left out, as a student leaves them out: dropped from 40 m is
    40 − ½ × 10(t − 1)², not 40 + 0(t − 1) − … */
function heightRow(p, g, held) {
  const n = p.name, late = Math.abs(p.t0) > EPS;
  if (held) return { f: M`y_${n} = h_${n}`, s: M`${d(p.h)}`, r: M`y_${n} = ${d(p.h)} [m]` };
  const T = late ? `(t - ${d(p.t0)})` : 't';
  const parts = [];
  if (Math.abs(p.h) > EPS) parts.push(d(p.h));
  if (Math.abs(p.u) > EPS) parts.push(`${parts.length ? '+ ' : ''}${sb(p.u)}${T}`);
  if (g > EPS) parts.push(`- ½ * ${d(g)}${T}^2`);
  const f = g > EPS
    ? (late ? M`y_${n} = h_${n} + u_${n}(t - t_${n}) - ½g(t - t_${n})^2` : M`y_${n} = h_${n} + u_${n}t - ½gt^2`)
    : (late ? M`y_${n} = h_${n} + u_${n}(t - t_${n})` : M`y_${n} = h_${n} + u_${n}t`);
  return { f, s: M`${parts.join(' ') || '0'}`, r: M`y_${n} = ${poly(coeffs(p, false))}` };
}

/**
 * Two particles, one vertical line.
 * @param k { A: {h, u, t0}, B: {h, u, t0}, g }
 * @returns the shape js/core/road.js answers in: { ok, reason?, mode, params,
 *          f, derived, notes, moment, convention, ... } plus { A, B, meet,
 *          rows, outcome, say, watched } — `rows` is each particle's five at
 *          the meeting; `say` the sentence that explains the outcome.
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
  if (missing.length) return fail(`Still needed: ${missing.join(', ')}.`);
  if (g < 0) return fail('Give g as a size: the engine takes up as positive, so the acceleration is −g.');
  for (const n of NAMES) {
    const q = k[n];
    if (q.h < 0) return fail(`Heights are measured up from the ground, so ${n} cannot start below it.`);
    if (have(q.t0) && q.t0 < 0) return fail(`${n} sets off at a negative time. Start the clock at the first one to move.`);
  }

  const A = particle({ ...k.A, t0: have(k.A.t0) ? k.A.t0 : 0, g }, 'A');
  const B = particle({ ...k.B, t0: have(k.B.t0) ? k.B.t0 : 0, g }, 'B');
  for (const p of [A, B]) {
    if (p.tLand - p.t0 < EPS || (p.h < EPS && p.u < EPS)) {
      return fail(`${p.name} starts on the ground with no upward velocity, so it never leaves it.`);
    }
  }

  // How long to look: until both are down. With no gravity one may never come
  // down and the meeting can be as late as the numbers make it, so the search
  // runs on regardless; only the run that is shown stops sooner.
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
  const free = (p, t) => p.stageAt(t)?.kind === 'free';
  // Two that are level and still together (both held at one height, or
  // sharing a start) part at the end of that stretch; the parting is not a
  // meeting, and neither is a root a hair after it.
  const parting = all.filter((m) => m.together).map((m) => m.until);
  const air = (m) => m.x > 1e-6 && m.t > 1e-7 && m.t < tEndLook + 1e-9
    && (free(A, m.t) || free(B, m.t))
    && !m.together && !parting.some((u) => Math.abs(m.t - u) < 1e-6)
    && !(Math.abs(m.t - Math.max(A.t0, B.t0)) < 1e-9 && Math.abs(A.h - B.h) < 1e-9 && Math.abs(m.x - A.h) < 1e-9)
    && !(Math.abs(A.h - B.h) < 1e-9 && Math.abs(m.x - A.h) < 1e-9 && Math.abs(m.t - Math.min(A.t0, B.t0)) < 1e-6);
  const hit = all.find(air);
  const meet = hit ? { ...hit, t: snap(hit.t), x: snap(hit.x), vA: snap(hit.vA), vB: snap(hit.vB) } : null;

  const notes = [];
  if (!have(k.A.t0) && !have(k.B.t0)) notes.push(`Both set off at the same instant, ${M`t = 0`}.`);

  let moment = null, rows = null, tMax, outcome, say, why, watched;
  if (meet) {
    outcome = 'met';
    const heldA = A.stageAt(meet.t)?.kind === 'held', heldB = B.stageAt(meet.t)?.kind === 'held';
    if (heldA || heldB) {
      notes.push(`${heldA ? 'A' : 'B'} is still being held when the other reaches it: they meet before it is let go.`);
    }
    rows = [A, B].map((p, i) => {
      const held = i === 0 ? heldA : heldB;
      return {
        name: p.name, held, t0: p.t0,
        u: held ? 0 : p.u, v: i === 0 ? meet.vA : meet.vB, a: held ? 0 : -g,
        s: snap(meet.x - p.h), t: held ? 0 : snap(meet.t - p.t0),
      };
    });
    // The time on each late particle's own clock: what most papers ask for.
    const own = rows.filter((r) => !r.held && r.t0 > EPS);
    const ownSay = own.map((r) => `${M`${d(r.t, 3)} [s]`} after ${r.name} sets off`).join(', and ');
    moment = {
      t: meet.t, y: meet.x, vA: meet.vA, vB: meet.vB, own,
      text: `They meet ${M`${d(meet.x)} [m]`} above the ground, at ${M`t = ${d(meet.t, 3)} [s]`}`
        + (ownSay ? ` — ${ownSay}.` : '.'),
    };
    say = moment.text;
    watched = 'Stopped at the collision';
    tMax = meet.t;
  } else {
    ({ outcome, say, why, watched, tMax } = neverMet(A, B, g));
    notes.push(say);
  }

  const f = pairMotion(A, B, tMax, meet);
  const derived = meet
    ? [M`t = ${d(meet.t, 3)} [s]`, ...moment.own.map((r) => `${M`${d(r.t, 3)} [s]`} after ${r.name} sets off`),
       `${M`${d(meet.x)} [m]`} up`]
    : [outcome === 'ground' ? 'level only at the ground' : 'they never meet'];

  const extras = meet ? [
    { key: 'tMeet', label: 'they meet at', value: meet.t, unit: 's' },
    ...moment.own.map((r) => ({ key: `t${r.name}`, label: `${r.name} has been moving for`, value: r.t, unit: 's' })),
    { key: 'yMeet', label: 'height then', value: meet.x, unit: 'm' },
    { key: 'speedA', label: 'speed of A', value: Math.abs(meet.vA), unit: 'm s⁻¹' },
    { key: 'speedB', label: 'speed of B', value: Math.abs(meet.vB), unit: 'm s⁻¹' },
    { key: 'dSpeed', label: 'difference in speeds', value: snap(Math.abs(Math.abs(meet.vA) - Math.abs(meet.vB))), unit: 'm s⁻¹' },
    { key: 'closing', label: 'closing speed', value: snap(Math.abs(meet.vA - meet.vB)), unit: 'm s⁻¹' },
  ] : [];

  return {
    ok: true, mode: 'pair', axis: 'up', params: { g, A: { h: A.h, u: A.u, t0: A.t0 }, B: { h: B.h, u: B.u, t0: B.t0 } },
    f, A, B, meet, moment, rows, extras, derived, notes, outcome, say, why, watched,
    convention: 'Taking up as positive, with heights measured from the ground.',
  };
}

/* ── when they never meet in the air: what did happen, and for how long it
   was watched. Every clause is a fact the engine checked. */
function neverMet(A, B, g) {
  const t = (x) => M`t = ${d(x)} [s]`;
  const finite = isFinite(A.tLand) && isFinite(B.tLand);
  // Level only on the ground: both arrive at the same instant.
  if (finite && Math.abs(A.tLand - B.tLand) < 1e-7) {
    const why = `Both land at the same instant, ${t(A.tLand)}. `
      + 'Until then one is always above the other, so there is no meeting in the air.';
    return { outcome: 'ground', tMax: A.tLand, watched: 'Both reached the ground together',
      why, say: `They are level only on the ground. ${why}` };
  }
  const first = A.tLand <= B.tLand ? A : B, other = first === A ? B : A;
  // The first is down before the other has even been let go.
  if (first.tLand <= other.t0 + 1e-9) {
    const where = other.h > EPS ? `, held ${M`${d(other.h)} [m]`} up until then` : ', waiting on the ground until then';
    const why = `${first.name} ${first.h > EPS ? 'reaches' : 'is back on'} the ground at ${t(first.tLand)}, `
      + `before ${other.name} is let go at ${t(other.t0)}${where}.`;
    return { outcome: 'never', tMax: finite ? Math.max(A.tLand, B.tLand) : other.t0 + LOOK,
      watched: finite ? 'Watched until both were down' : `Watched for ${LOOK} s after ${other.name} set off`,
      why, say: `They never meet. ${why}` };
  }
  // Both off the ground together for a while, and one stays above throughout.
  const lo = Math.max(A.t0, B.t0), hi = Math.min(first.tLand, lo + 1);
  const mid = (lo + hi) / 2;
  const top = A.pos(mid) > B.pos(mid) ? A : B, low = top === A ? B : A;
  if (!isFinite(first.tLand)) {
    const why = `With no gravity neither comes back down, and ${low.name} stays below ${top.name} `
      + 'all the way: the gap between them never closes.';
    return { outcome: 'never', tMax: lo + LOOK, watched: `Watched for ${LOOK} s after the later start`,
      why, say: `They never meet. ${why}` };
  }
  const why = `${low.name} stays below ${top.name} for as long as both are off the ground, `
    + `and ${first.name} lands first, at ${t(first.tLand)}.`
    + (g < EPS ? ' With no gravity, nothing turns either of them round.' : '');
  return { outcome: 'never', tMax: finite ? Math.max(A.tLand, B.tLand) : first.tLand + LOOK,
    watched: finite ? 'Watched until both were down' : `Watched for ${LOOK} s after ${first.name} landed`,
    why, say: `They never meet. ${why}` };
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
  // At the collision both are exactly where the engine says they meet.
  const at = (t) => {
    const c = clampT(t);
    const s = { A: A.state(c), B: B.state(c) };
    if (meet && c >= meet.t - 1e-12) {
      s.A = { ...s.A, x: meet.x, v: meet.vA };
      s.B = { ...s.B, x: meet.x, v: meet.vB };
    }
    return s;
  };
  const f = {
    kind: 'pair', A, B, meet, tMax, tFlight: tMax, top,
    params: { g: A.g, h: Math.max(A.h, B.h), u: A.u, theta: 90 },
    pos: (t) => ({ x: 0, y: at(t).A.x }),
    vel: (t) => ({ x: 0, y: at(t).A.v }),
    speed: (t) => Math.abs(at(t).A.v),
    accel: (t) => A.acc(clampT(t)),
    bounces: 0, segments: [], horiz: 0, range: 0,
    kineticEnergy: () => 0, momentum: () => 0,
    /** How far apart they are, B above A positive — the gap the stage brackets. */
    gap: (t) => { const s = at(t); return s.B.x - s.A.x; },
    /** Each particle's height, velocity and stage at t, read by the stage and the HUD. */
    at,
    /** Going up or coming down at t: the stage puts the two halves of a
        throw in two lanes, so the marks of the way down do not sit on top
        of the marks of the way up. */
    rising: (p, t) => p.vel(t) > 0 || (p.stageAt(t)?.kind !== 'free'),
    path(n = 200, tEnd = tMax) {
      const out = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; out.push({ t, x: 0, y: at(t).A.x }); }
      return out;
    },
  };
  return f;
}

/* ── the working ────────────────────────────────────────────────────────
   Each height as a function of t, multiplied out; the two set equal; the t²
   terms cancel when both are falling freely, which is the point worth
   noticing; then the height, each late particle's own time, and the
   velocities at that instant. */
export function pairWorking(solved) {
  if (!solved?.ok) return [];
  const { A, B, meet, params: { g } } = solved;
  const heldAt = (p) => !!meet && p.stageAt(meet.t)?.kind === 'held';
  const heldA = heldAt(A), heldB = heldAt(B);
  const lateFree = [A, B].filter((p) => p.t0 > EPS && !heldAt(p));
  const out = [{
    title: 'Where each one is',
    rows: [heightRow(A, g, heldA), heightRow(B, g, heldB)],
    note: (`${M`y`} is the height above the ground and ${M`t`} is time on the one clock. `
      + (lateFree.length
        ? `${lateFree.map((p) => p.name).join(' and ')} only ${lateFree.length > 1 ? 'start' : 'starts'} moving at ${lateFree.map((p) => M`t = ${d(p.t0)} [s]`).join(' and ')}, `
          + `so ${lateFree.length > 1 ? 'their' : 'its'} own time is ${lateFree.map((p) => (p.name === 'A' ? M`t - t_A` : M`t - t_B`)).join(' and ')}.`
        : (heldA || heldB) ? `${heldA ? 'A' : 'B'} has not been let go yet, so its height is simply where it is held.` : '')).trim(),
  }];
  if (!meet) return out;

  const cA = coeffs(A, heldA), cB = coeffs(B, heldB);
  let dc = [cA[0] - cB[0], cA[1] - cB[1], cA[2] - cB[2]].map(snap);
  const linear = Math.abs(dc[2]) < 1e-9;
  // written with a positive leading term, the way it is written by hand
  if ((linear ? dc[1] : dc[2]) < 0) dc = dc.map((c) => -c);
  const rows = [{ f: M`y_A = y_B`, s: M`${poly(cA)} = ${poly(cB)}`, r: M`${poly(dc, 3, { desc: true })} = 0` }];
  // The stretch of time this equation is true for: both particles in the
  // stages they are in at the meeting.
  const span = [A, B].map((p) => p.stageAt(meet.t)).filter(Boolean);
  const lo = Math.max(0, ...span.map((st) => st.t0)), hi = Math.min(...span.map((st) => st.t1));
  const why = (t) => (t < -EPS ? 'is before the clock starts'
    : t < meet.t - 1e-7 && Math.abs(t - Math.min(A.t0, B.t0)) < 1e-7 && Math.abs(A.h - B.h) < 1e-9 ? 'is the instant they start, level with each other — not a meeting'
    : t < lo - 1e-7 ? (heldA || heldB ? 'is before both are moving' : `is before ${A.t0 > B.t0 ? 'A' : 'B'} sets off`)
    : t > hi + 1e-7 ? (heldA || heldB ? `is after ${heldA ? 'A' : 'B'} is let go, when its height is no longer fixed` : 'is after one of them has landed')
    : t < meet.t ? 'is earlier, before the meeting the run stops at' : 'is a later crossing; the first one is the collision');
  let rejected = [];
  if (linear) {
    const fr = ratio(-dc[0], dc[1]);
    rows.push({ f: M`t = ${d(-dc[0], 3)}/${d(dc[1], 3)}`, s: fr && fr.q !== Math.abs(dc[1]) ? M`${fr.p}/${fr.q}` : '',
                r: M`t = ${d(meet.t, 3)} [s]` });
  } else if (Math.abs(dc[1]) < 1e-9) {
    const rhs = snap(-dc[0] / dc[2]);
    rows.push({ f: M`t^2 = ${d(-dc[0], 3)}/${d(dc[2], 3)}`, s: M`t^2 = ${d(rhs, 4)}`, r: M`t = ${d(meet.t, 3)} [s]` });
    rejected = [-Math.sqrt(Math.max(0, rhs))];
  } else {
    const roots = quadRoots(dc[2], dc[1], dc[0]).map(snap);
    rows.push({
      f: M`t = (-b +- sqrt(b^2 - 4ac))/(2a)`,
      s: M`(-${sb(dc[1], 3)} +- sqrt(${sb(dc[1], 3)}^2 - 4 * ${sb(dc[2], 3)} * ${sb(dc[0], 3)}))/(2 * ${sb(dc[2], 3)})`,
      r: roots.length > 1 ? M`t = ${d(roots[0], 3)} [s] "or" t = ${d(roots[1], 3)} [s]` : M`t = ${d(meet.t, 3)} [s]`,
    });
    rejected = roots.filter((r) => Math.abs(r - meet.t) > 1e-6);
  }
  const notes = [];
  if (linear && g < EPS) notes.push(`No gravity, so each height is a straight line in ${M`t`} and they close at a steady rate.`);
  else if (linear && !heldA && !heldB) notes.push(`The ${M`t^2`} terms cancel: both fall with the same ${M`g`}, so relative to each other neither accelerates, and the gap between them closes at a steady rate. That is why one equation in ${M`t`} is enough.`);
  for (const r of rejected) notes.push(`${M`t = ${d(r, 3)} [s]`} ${why(r)}, so it is not the one wanted.`);
  if (!linear && !rejected.length) notes.push('A quadratic with one root: they just touch.');
  out.push({ title: 'They meet when the heights are equal', rows, note: notes.join(' ') });

  const p = heldA ? B : A, n = p.name;
  const T = Math.abs(p.t0) > EPS ? d(meet.t - p.t0, 3) : d(meet.t, 3);
  const hs = [];
  if (Math.abs(p.h) > EPS) hs.push(d(p.h));
  if (Math.abs(p.u) > EPS) hs.push(`${hs.length ? '+ ' : ''}${sb(p.u)} * ${T}`);
  if (g > EPS) hs.push(`- ½ * ${d(g)} * ${T}^2`);
  out.push({
    title: 'The height they meet at',
    rows: [{ f: heightRow(p, g, false).f, s: M`${hs.join(' ') || '0'}`, r: M`y = ${d(meet.x)} [m]` }],
  });

  if (lateFree.length) {
    out.push({
      title: lateFree.length > 1 ? 'On each one’s own clock' : `On ${lateFree[0].name}’s own clock`,
      rows: lateFree.map((q) => {
        const tau = snap(meet.t - q.t0);
        const fr = linear ? ratio(-dc[0] - q.t0 * dc[1], dc[1]) : null;
        return { f: q.name === 'A' ? M`t - t_A` : M`t - t_B`, s: M`${d(meet.t, 3)} - ${d(q.t0)}`,
                 r: fr ? M`${fr.p}/${fr.q} = ${d(tau, 3)} [s]` : M`${d(tau, 3)} [s]` };
      }),
      note: `How long ${lateFree.length > 1 ? 'each' : lateFree[0].name} had been moving when they met — the time a paper usually asks for.`,
    });
  }

  const vrow = (q, held, v) => {
    const m = q.name;
    if (held) return { f: M`v_${m} = 0`, s: '', r: M`v_${m} = 0 [m s^-1]` };
    if (g < EPS) return { f: M`v_${m} = u_${m}`, s: '', r: M`v_${m} = ${d(v)} [m s^-1]` };
    return Math.abs(q.t0) < EPS
      ? { f: M`v_${m} = u_${m} - gt`, s: M`${sb(q.u)} - ${d(g)} * ${d(meet.t, 3)}`, r: M`v_${m} = ${d(v)} [m s^-1]` }
      : { f: M`v_${m} = u_${m} - g(t - t_${m})`, s: M`${sb(q.u)} - ${d(g)} * ${d(meet.t - q.t0, 3)}`, r: M`v_${m} = ${d(v)} [m s^-1]` };
  };
  const ex = (key) => solved.extras.find((x) => x.key === key).value;
  out.push({
    title: 'How fast each is going then',
    rows: [vrow(A, heldA, meet.vA), vrow(B, heldB, meet.vB)],
    note: `Negative is downwards. The speeds are ${M`${d(Math.abs(meet.vA))}`} and ${M`${d(Math.abs(meet.vB))} [m s^-1]`}, `
      + `so they differ by ${M`${d(ex('dSpeed'))} [m s^-1]`}, and they close on each other at `
      + `${M`${d(ex('closing'))} [m s^-1]`}.`,
  });
  return out;
}
