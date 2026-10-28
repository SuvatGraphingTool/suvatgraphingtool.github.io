// plane.js — a particle moving in a plane with a constant acceleration
// vector: SUVAT in i and j.
//
// The exam family: "a particle starts at the origin with velocity (−i + 3j)
// and moves with constant acceleration (0.1i − 0.2j)": find its velocity at
// a time, when it is due east of the origin, when it is moving south-east or
// parallel to a vector, when it passes a point with one coordinate given, how
// fast it is going then, how far from the origin. i is east and j is north.
//
// The vector forms of two of the five, and nothing else:
//     v = u + at          r = r₀ + ut + ½at²
// each of which is two ordinary SUVAT equations side by side, one per
// component — which is the whole lesson, and why every answer below is found
// by writing one component equation (or the two in one relation) and solving
// it, the way the mark schemes do.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { quadRoots } from './stages.js';
import { snap } from './numeric.js';
import { poly } from './pair.js';
import { M, num } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const sgn = (x) => (x < 0 ? `(${d(x)})` : d(x));

/** The eight compass points, as unit-free directions in i (east) and j (north). */
export const COMPASS = {
  N: { x: 0, y: 1, word: 'north' }, E: { x: 1, y: 0, word: 'east' },
  S: { x: 0, y: -1, word: 'south' }, W: { x: -1, y: 0, word: 'west' },
  NE: { x: 1, y: 1, word: 'north-east' }, NW: { x: -1, y: 1, word: 'north-west' },
  SE: { x: 1, y: -1, word: 'south-east' }, SW: { x: -1, y: -1, word: 'south-west' },
};

/** A vector as notation source: (−2i + 2j) → `-2vec(i) + 2vec(j)`. */
export function vsrc({ x, y }, dp) {
  const t = (c, e) => (Math.abs(c) < EPS ? '' : `${Math.abs(Math.abs(c) - 1) < EPS ? '' : d(Math.abs(c), dp)}vec(${e})`);
  const a = t(x, 'i'), b = t(y, 'j');
  if (!a && !b) return '0';
  if (!a) return `${y < 0 ? '-' : ''}${b}`;
  if (!b) return `${x < 0 ? '-' : ''}${a}`;
  return `${x < 0 ? '-' : ''}${a} ${y < 0 ? '-' : '+'} ${b}`;
}
const V = (x, y) => ({ x: snap(x), y: snap(y) });

/** The motion: r(t), v(t), and the questions a flight is asked. */
export function planeMotion({ r0, u, a }, tMax) {
  const pos = (t) => V(r0.x + u.x * t + 0.5 * a.x * t * t, r0.y + u.y * t + 0.5 * a.y * t * t);
  const vel = (t) => V(u.x + a.x * t, u.y + a.y * t);
  const clampT = (t) => Math.min(Math.max(t, 0), tMax);
  return {
    kind: 'plane', r0, u, a, tMax, tFlight: tMax,
    params: { u: Math.hypot(u.x, u.y), a: Math.hypot(a.x, a.y), g: 0, h: 0, theta: 0 },
    pos: (t) => pos(clampT(t)), vel: (t) => vel(clampT(t)),
    r: (t) => pos(clampT(t)),
    speed: (t) => Math.hypot(vel(clampT(t)).x, vel(clampT(t)).y),
    accel: () => a,
    bounces: 0, segments: [], horiz: null,
    kineticEnergy: () => 0, momentum: () => 0,
    path(n = 200, tEnd = tMax) {
      const out = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; out.push({ t, ...pos(t) }); }
      return out;
    },
  };
}

/* ── each question, answered with its working ─────────────────────────── */
const comp = (c) => (c === 'x' ? 'vec(i)' : 'vec(j)');
const name = (c) => (c === 'x' ? 'east' : 'north');

/** Roots of an equation in t that are in the run, t > 0, in order. */
const after0 = (roots, strict = true) => roots.map(snap).filter((t) => (strict ? t > 1e-9 : t >= -1e-9)).sort((p, q) => p - q);

function atTime(P, t) {
  const r = P.pos(t), v = P.vel(t), s = Math.hypot(v.x, v.y), dist = Math.hypot(r.x, r.y);
  return {
    kind: 't', ok: true, t, r, v, speed: snap(s), dist: snap(dist),
    rows: [
      { f: M`vec v = vec u + vec(a)t`, s: M`(${vsrc(P.u)}) + (${vsrc(P.a)}) * ${d(t)}`, r: M`vec v = ${vsrc(v)}` },
      { f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: M`${P.r0.x || P.r0.y ? `(${vsrc(P.r0)}) + ` : ''}(${vsrc(P.u)}) * ${d(t)} + ½(${vsrc(P.a)}) * ${d(t)}^2`, r: M`vec r = ${vsrc(r)}` },
      { f: M`abs(vec v) = sqrt(v_x^2 + v_y^2)`, s: M`sqrt(${sgn(v.x)}^2 + ${sgn(v.y)}^2)`, r: M`${d(s)} [m s^-1]` },
    ],
    text: `At ${M`t = ${d(t)} [s]`} its velocity is ${M`(${vsrc(v)}) [m s^-1]`}, its speed ${M`${d(s)} [m s^-1]`}, and it is ${Math.hypot(r.x, r.y) < EPS ? 'at the origin' : `at ${M`(${vsrc(r)}) [m]`}`}.`,
  };
}

/** When it is moving in a direction: v parallel to d, the same way round. */
function moving(P, key) {
  const D = COMPASS[key];
  // v × d = 0:  (uₓ + aₓt)d_y − (u_y + a_yt)dₓ = 0, linear in t
  const c1 = P.a.x * D.y - P.a.y * D.x, c0 = P.u.x * D.y - P.u.y * D.x;
  const cands = Math.abs(c1) > EPS ? [-c0 / c1] : (Math.abs(c0) < EPS ? [0] : []);
  const ts = after0(cands, false).filter((t) => { const v = P.vel(t); return v.x * D.x + v.y * D.y > EPS; });
  const word = D.word;
  // the one relation, written as the papers write it
  const vx = poly([P.u.x, P.a.x, 0]), vy = poly([P.u.y, P.a.y, 0]);
  const rel = D.x === 0 ? { f: M`v_x = 0`, s: M`${vx} = 0`, why: `due ${word}, it has no ${M`vec i`} component` }
    : D.y === 0 ? { f: M`v_y = 0`, s: M`${vy} = 0`, why: `due ${word}, it has no ${M`vec j`} component` }
    : D.x === D.y ? { f: M`v_x = v_y`, s: M`${vx} = ${vy}`, why: `${word}, its two components are equal` }
    : { f: M`v_x = -v_y`, s: M`${vx} = -(${vy})`, why: `${word}, its two components are equal and opposite` };
  if (!ts.length) {
    const tr = after0(cands, false)[0];
    return { kind: 'moving', key, ok: false, note: tr != null
      ? `It is never moving ${word}: at ${M`t = ${d(tr)} [s]`} it is moving the opposite way.`
      : `It is never moving ${word}.` };
  }
  const t = ts[0], v = P.vel(t), r = P.pos(t);
  return {
    kind: 'moving', key, ok: true, t, v, r, speed: snap(Math.hypot(v.x, v.y)),
    rows: [
      { f: M`vec v = (${vx})vec(i) + (${vy})vec(j)`, s: '', r: '' },
      { f: rel.f, s: rel.s, r: M`t = ${d(t)} [s]` },
      { f: M`vec v = ${vsrc(v)}`, s: M`abs(vec v) = sqrt(${sgn(v.x)}^2 + ${sgn(v.y)}^2)`, r: M`${d(Math.hypot(v.x, v.y))} [m s^-1]` },
      { f: M`vec r = ${vsrc(r)}`, s: M`abs(vec r) = sqrt(${sgn(r.x)}^2 + ${sgn(r.y)}^2)`, r: M`${d(Math.hypot(r.x, r.y))} [m]` },
    ],
    dist: snap(Math.hypot(r.x, r.y)),
    why: `Moving ${rel.why}, with its velocity pointing ${word}, not the opposite way.`,
    text: `It is moving ${word} at ${M`t = ${d(t)} [s]`}, at ${M`${d(Math.hypot(v.x, v.y))} [m s^-1]`}, at ${M`(${vsrc(r)}) [m]`} — ${M`${d(Math.hypot(r.x, r.y))} [m]`} from O.`,
  };
}

/** When it is due (some direction) of the origin: r parallel to d. */
function dueOf(P, key) {
  const D = COMPASS[key];
  // r × d = 0: a quadratic in t
  const c2 = 0.5 * (P.a.x * D.y - P.a.y * D.x), c1 = P.u.x * D.y - P.u.y * D.x, c0 = P.r0.x * D.y - P.r0.y * D.x;
  const roots = Math.abs(c2) > EPS ? quadRoots(c2, c1, c0) : Math.abs(c1) > EPS ? [-c0 / c1] : [];
  const ts = after0(roots).filter((t) => { const r = P.pos(t); return r.x * D.x + r.y * D.y > EPS; });
  const word = D.word;
  const rx = poly([P.r0.x, P.u.x, P.a.x / 2]), ry = poly([P.r0.y, P.u.y, P.a.y / 2]);
  const rel = D.x === 0 ? { f: M`x = 0`, s: M`${rx} = 0` } : D.y === 0 ? { f: M`y = 0`, s: M`${ry} = 0` }
    : D.x === D.y ? { f: M`x = y`, s: M`${rx} = ${ry}` } : { f: M`x = -y`, s: M`${rx} = -(${ry})` };
  if (!ts.length) return { kind: 'due', key, ok: false, note: `It is never due ${word} of the origin after it sets off.` };
  const t = ts[0], r = P.pos(t);
  return {
    kind: 'due', key, ok: true, t, r, dist: snap(Math.hypot(r.x, r.y)),
    rows: [
      { f: M`vec r = (${rx})vec(i) + (${ry})vec(j)`, s: '', r: '' },
      { f: rel.f, s: rel.s, r: M`t = ${d(t)} [s]` },
      { f: M`vec r = ${vsrc(r)}`, s: M`abs(vec r) = sqrt(${sgn(r.x)}^2 + ${sgn(r.y)}^2)`, r: M`${d(Math.hypot(r.x, r.y))} [m]` },
    ],
    text: `It is due ${word} of the origin at ${M`t = ${d(t)} [s]`}, ${M`${d(Math.hypot(r.x, r.y))} [m]`} away.`,
  };
}

/** When one coordinate takes a value: x = X, or y = Y. */
function passes(P, c, X) {
  const a = P.a[c], u = P.u[c], r0 = P.r0[c];
  const roots = Math.abs(a) > EPS ? quadRoots(0.5 * a, u, r0 - X) : Math.abs(u) > EPS ? [(X - r0) / u] : [];
  const ts = after0(roots, false);
  const sym = c === 'x' ? 'x' : 'y';
  if (!ts.length) return { kind: 'passes', c, X, ok: false, note: `Its ${M`${sym}`}-coordinate never reaches ${M`${d(X)}`}.` };
  const t = ts[0], r = P.pos(t), o = c === 'x' ? 'y' : 'x';
  const eq = `${r0 ? `${d(r0)} + ` : ''}${sgn(u)}t + ½ * ${sgn(a)}t^2`;
  return {
    kind: 'passes', c, X, ok: true, t, r, times: ts,
    rows: [
      { f: M`${sym} = ${sym}_0 + u_${sym}t + ½a_${sym}t^2`, s: M`${d(X)} = ${eq}`, r: ts.length > 1 ? M`t = ${d(ts[0])} "or" t = ${d(ts[1])}` : M`t = ${d(t)} [s]` },
      { f: M`${o} = ${o}_0 + u_${o}t + ½a_${o}t^2`, s: M`${P.r0[o] ? `${d(P.r0[o])} + ` : ''}${sgn(P.u[o])} * ${d(t)} + ½ * ${sgn(P.a[o])} * ${d(t)}^2`, r: M`${o} = ${d(r[o])}` },
    ],
    text: `It passes ${M`${sym} = ${d(X)}`} ${ts.length > 1 ? 'first ' : ''}at ${M`t = ${d(t)} [s]`}, where ${M`${o} = ${d(r[o])}`}${ts.length > 1 ? `, and again at ${M`t = ${d(ts[1])} [s]`}` : ''}.`,
  };
}

/** When its speed is S: |u + at|² = S², a quadratic. */
function speedIs(P, S) {
  const A2 = P.a.x ** 2 + P.a.y ** 2, B1 = 2 * (P.u.x * P.a.x + P.u.y * P.a.y), C0 = P.u.x ** 2 + P.u.y ** 2 - S * S;
  const roots = Math.abs(A2) > EPS ? quadRoots(A2, B1, C0) : [];
  const ts = after0(roots, false);
  if (!ts.length) return { kind: 'speed', S, ok: false, note: `Its speed is never ${M`${d(S)} [m s^-1]`}.` };
  const vx = poly([P.u.x, P.a.x, 0]), vy = poly([P.u.y, P.a.y, 0]);
  return {
    kind: 'speed', S, ok: true, t: ts[0], times: ts,
    rows: [
      { f: M`v_x^2 + v_y^2 = ${d(S)}^2`, s: M`(${vx})^2 + (${vy})^2 = ${d(S * S)}`, r: ts.length > 1 ? M`t = ${d(ts[0])} "or" t = ${d(ts[1])}` : M`t = ${d(ts[0])} [s]` },
    ],
    text: `Its speed is ${M`${d(S)} [m s^-1]`} at ${M`t = ${d(ts[0])} [s]`}${ts.length > 1 ? ` and again at ${M`t = ${d(ts[1])} [s]`}` : ''}.`,
  };
}

/**
 * A particle in a plane.
 * @param k { r0: {x,y}, u: {x,y}, a: {x,y}, vT: {x,y}, T,
 *            at: { t, moving, due, x, y, speed } }
 */
export function solvePlane(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const two = (q) => q && (have(q.x) || have(q.y));
  const vec = (q) => ({ x: have(q?.x) ? q.x : 0, y: have(q?.y) ? q.y : 0 });
  if (!two(k.a)) return fail('Still needed: the acceleration, as a vector in i and j. Give 0 for a part that is zero.');
  if (two(k.u) && two(k.vT)) return fail('Give the initial velocity, or a velocity at a later time — not both: one fixes the other.');
  if (!two(k.u) && !(two(k.vT) && have(k.T))) return fail('Still needed: the initial velocity — or a velocity and the time it has it.');
  if (have(k.T) && k.T < 0) return fail('A time cannot be negative.');
  const a = vec(k.a), r0 = vec(k.r0);
  const pre = [];
  let u;
  if (two(k.u)) u = vec(k.u);
  else {
    // u = v − aT: the velocity equation run backwards
    const vT = vec(k.vT);
    u = V(vT.x - a.x * k.T, vT.y - a.y * k.T);
    pre.push({ f: M`vec u = vec v - vec(a)t`, s: M`(${vsrc(vT)}) - (${vsrc(a)}) * ${d(k.T)}`, r: M`vec u = ${vsrc(u)}` });
    pre.push({ f: M`abs(vec u) = sqrt(u_x^2 + u_y^2)`, s: M`sqrt(${sgn(u.x)}^2 + ${sgn(u.y)}^2)`, r: M`${d(Math.hypot(u.x, u.y))} [m s^-1]` });
  }
  if (Math.hypot(u.x, u.y) < EPS && Math.hypot(a.x, a.y) < EPS) return fail('With no velocity and no acceleration it never moves.');

  // answered on the motion as it runs for ever; only the picture stops
  const P = planeMotion({ r0, u, a }, Infinity);
  const at = k.at || {};
  const answers = [];
  if (have(at.t)) answers.push(at.t >= 0 ? atTime(P, at.t) : { kind: 't', ok: false, note: 'A time cannot be negative.' });
  if (at.moving && COMPASS[at.moving]) answers.push(moving(P, at.moving));
  if (at.due && COMPASS[at.due]) answers.push(dueOf(P, at.due));
  if (have(at.x)) answers.push(passes(P, 'x', at.x));
  if (have(at.y)) answers.push(passes(P, 'y', at.y));
  if (have(at.speed)) answers.push(at.speed >= 0 ? speedIs(P, at.speed) : { kind: 'speed', ok: false, note: 'A speed is a size: give it positive.' });

  // Long enough to show every answer, and a little after the last.
  const times = answers.filter((x) => x.ok).flatMap((x) => x.times || [x.t]);
  const tMax = times.length ? Math.max(...times) * 1.25 + 0.5 : Math.max(5, have(k.T) ? k.T * 1.25 : 5);
  const f = planeMotion({ r0, u, a }, tMax);
  f.answers = answers;

  const notes = answers.map((x) => (x.ok ? x.text : x.note));
  if (!answers.length) notes.push('Ask it something — a time, a direction, a coordinate or a speed — and the engine answers it here.');
  const derived = [
    ...(pre.length ? [M`vec u = ${vsrc(u)}`] : []),
    ...answers.filter((x) => x.ok).map((x) => `${x.kind === 'moving' ? `moving ${COMPASS[x.key].word}` : x.kind === 'due' ? `due ${COMPASS[x.key].word} of O`
      : x.kind === 'passes' ? `${M`${x.c} = ${d(x.X)}`}` : x.kind === 'speed' ? `${M`${d(x.S)} [m s^-1]`}` : `${M`vec v = ${vsrc(x.v)}`},`} at ${M`t = ${d(x.t)} [s]`}`),
  ];
  return {
    ok: true, mode: 'plane', axis: 'plane', r0, u, a, pre, answers, f, notes, derived,
    params: { u: Math.hypot(u.x, u.y) },
    convention: `East is the ${M`vec i`} direction and north is ${M`vec j`}; positions are from the origin O.`,
  };
}

/* ── the working ──────────────────────────────────────────────────────── */
const TITLE = {
  t: (a) => `At ${M`t = ${d(a.t)} [s]`}`,
  moving: (a) => `When it is moving ${COMPASS[a.key].word}`,
  due: (a) => `When it is due ${COMPASS[a.key].word} of O`,
  passes: (a) => `When ${M`${a.c} = ${d(a.X)}`}`,
  speed: (a) => `When its speed is ${M`${d(a.S)} [m s^-1]`}`,
};
export function planeWorking(solved) {
  if (!solved?.ok) return [];
  const out = [];
  out.push({
    title: 'The two vector equations',
    rows: [
      ...solved.pre,
      { f: M`vec v = vec u + vec(a)t`, s: '', r: M`vec v = (${poly([solved.u.x, solved.a.x, 0])})vec(i) + (${poly([solved.u.y, solved.a.y, 0])})vec(j)` },
      { f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: '', r: M`vec r = (${poly([solved.r0.x, solved.u.x, solved.a.x / 2])})vec(i) + (${poly([solved.r0.y, solved.u.y, solved.a.y / 2])})vec(j)` },
    ],
    note: `Each is two SUVAT equations side by side: the ${M`vec i`} parts on their own, and the ${M`vec j`} parts on their own.${solved.pre.length ? ` The velocity at the later time, run back to ${M`t = 0`}, gives ${M`vec u`}.` : ''}`,
  });
  for (const a of solved.answers.filter((x) => x.ok)) {
    out.push({ title: TITLE[a.kind](a), rows: a.rows, note: [a.why, a.text].filter(Boolean).join(' ') });
  }
  return out;
}
