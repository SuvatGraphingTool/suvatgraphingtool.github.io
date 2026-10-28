// plane.js — a particle moving in a plane with a constant acceleration
// vector: SUVAT in i and j.
//
// The exam family: "a particle starts at the origin with velocity (−i + 3j)
// and moves with constant acceleration (0.1i − 0.2j)": find its velocity at
// a time, when it is due east of the origin, when it is moving south-east or
// parallel to a given vector, when it passes a point with one coordinate
// given, how fast it is going then, how far from the origin. i is east and j
// is north.
//
// The vector forms of two of the five, and nothing else:
//     v = u + at          r = r₀ + ut + ½at²
// each of which is two ordinary SUVAT equations side by side, one per
// component — which is the whole lesson, and why every answer below is found
// by writing one component equation (or the two in one relation) and solving
// it, the way the mark schemes do.
//
// A RELATION CAN HOLD ALWAYS. From rest, a particle moves along its
// acceleration for ever; with no acceleration its speed never changes. Then
// the equation for t is true for every t, not for none, and the answer is
// "always" (or "from t = 2 s on") — said as that, never as "never".
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { quadRoots } from './stages.js';
import { snap } from './numeric.js';
import { poly } from './pair.js';
import { M, T, num } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const sgn = (x) => (x < 0 ? `(${d(x)})` : d(x));
const tiny = (x, scale = 1) => Math.abs(x) <= 1e-9 * Math.max(1, Math.abs(scale));

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
/** A vector with its unit: (28i + 36j) m, 2j m, 0 m — a bracket only round two terms. */
const vunit = (v, unit) => { const src = vsrc(v); return M`${/ /.test(src) ? `(${src})` : src} [${unit}]`; };
/** Where it is, said: "at the origin", or "at (28i + 36j) m". */
const where = (r) => (Math.hypot(r.x, r.y) < EPS ? 'at the origin' : `at ${vunit(r, 'm')}`);

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
    speed: (t) => snap(Math.hypot(vel(clampT(t)).x, vel(clampT(t)).y)),
    /** How far from O, the size of r. */
    dist: (t) => snap(Math.hypot(pos(clampT(t)).x, pos(clampT(t)).y)),
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

/** c0 + c1 t as the i or j part of a vector: (1 + t)i, 2j, −3j — a
    bracket only when there are two terms to hold together. */
function vecSum([ax, bx], [ay, by]) {
  const one = ([c0, c1], e) => {
    if (tiny(c1)) return tiny(c0) ? null : { neg: c0 < 0, body: `${Math.abs(Math.abs(c0) - 1) < EPS ? '' : d(Math.abs(c0))}vec(${e})` };
    if (tiny(c0)) return { neg: c1 < 0, body: `${Math.abs(Math.abs(c1) - 1) < EPS ? '' : d(Math.abs(c1))}t vec(${e})` };
    return { neg: false, body: `(${poly([c0, c1, 0])})vec(${e})` };
  };
  const parts = [one([ax, bx], 'i'), one([ay, by], 'j')].filter(Boolean);
  if (!parts.length) return '0';
  return parts.map((q, i) => (i === 0 ? `${q.neg ? '-' : ''}${q.body}` : `${q.neg ? '-' : '+'} ${q.body}`)).join(' ');
}
/** k·x, written as a student writes it: x, −x, 2x. */
const times = (k, x) => (Math.abs(k - 1) < EPS ? x : Math.abs(k + 1) < EPS ? `-${x}` : `${d(k)}${x}`);

/** Roots in the run, in order: t > 0 (strict), or t ≥ 0. */
const after0 = (roots, strict = true) => roots.map(snap).filter((t) => (strict ? t > 1e-9 : t >= -1e-9)).sort((p, q) => p - q);

/** A direction from the student: a compass point, or a vector p i + q j. */
function direction(key, par) {
  if (key && COMPASS[key]) return { ...COMPASS[key], src: null };
  if (par && (have(par.x) || have(par.y))) {
    const x = have(par.x) ? par.x : 0, y = have(par.y) ? par.y : 0;
    if (Math.hypot(x, y) < EPS) return { zero: true };
    const src = vsrc({ x, y }), shown = / /.test(src) ? `(${src})` : src;
    return { x, y, word: `parallel to ${M`${shown}`}`, plain: `parallel to ${T`${shown}`}`, src, either: true };
  }
  return null;
}

/**
 * The first t ≥ 0 at which a + b t > 0 (the dot product of a velocity with a
 * direction, linear in t), and whether it stays positive after that.
 */
function positiveFrom(c0, c1) {
  if (tiny(c1)) return c0 > EPS ? { from: 0, until: Infinity } : null;
  const t0 = -c0 / c1;
  if (c1 > 0) return { from: Math.max(0, t0), until: Infinity };
  return t0 > EPS ? { from: 0, until: t0 } : null;
}

/* ── each question, answered with its working ─────────────────────────── */
function atTime(P, t) {
  const r = P.pos(t), v = P.vel(t), s = Math.hypot(v.x, v.y);
  return {
    kind: 't', ok: true, t, r, v, speed: snap(s), dist: snap(Math.hypot(r.x, r.y)),
    rows: [
      { f: M`vec v = vec u + vec(a)t`, s: M`(${vsrc(P.u)}) + (${vsrc(P.a)}) * ${d(t)}`, r: M`vec v = ${vsrc(v)} [m s^-1]` },
      { f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: M`${P.r0.x || P.r0.y ? `(${vsrc(P.r0)}) + ` : ''}(${vsrc(P.u)}) * ${d(t)} + ½(${vsrc(P.a)}) * ${d(t)}^2`, r: M`vec r = ${vsrc(r)} [m]` },
      { f: M`abs(vec v) = sqrt(v_x^2 + v_y^2)`, s: M`sqrt(${sgn(v.x)}^2 + ${sgn(v.y)}^2)`, r: M`${d(s)} [m s^-1]` },
    ],
    short: `${M`vec v = ${vsrc(v)}`}, ${M`${d(s)} [m s^-1]`}, at ${M`t = ${d(t)} [s]`}`,
    text: `At ${M`t = ${d(t)} [s]`} its velocity is ${Math.hypot(v.x, v.y) < EPS ? 'zero — it is at rest' : vunit(v, 'm s^-1')}, its speed ${M`${d(s)} [m s^-1]`}, and it is ${where(r)}.`,
  };
}

/** When it is moving in a direction: v parallel to d, the same way round. */
function moving(P, D, key) {
  // v × d = 0:  (uₓ + aₓt)d_y − (u_y + a_yt)dₓ = 0, linear in t
  const c1 = P.a.x * D.y - P.a.y * D.x, c0 = P.u.x * D.y - P.u.y * D.x;
  const dot = positiveFrom(P.u.x * D.x + P.u.y * D.y, P.a.x * D.x + P.a.y * D.y);
  const word = D.word, base = { kind: 'moving', key, D };
  const vx = poly([P.u.x, P.a.x, 0]), vy = poly([P.u.y, P.a.y, 0]);
  const rel = D.src && D.x !== 0 && D.y !== 0 ? { f: M`${times(D.y, 'v_x')} = ${times(D.x, 'v_y')}`, s: M`${times(D.y, `(${vx})`)} = ${times(D.x, `(${vy})`)}`, why: `${word}, its two components are in the same ratio as that vector\u2019s` }
    : D.x === 0 ? { f: M`v_x = 0`, s: M`${vx} = 0`, why: D.src ? `${word}, it has no ${M`vec i`} component` : `due ${word}, it has no ${M`vec i`} component` }
    : D.y === 0 ? { f: M`v_y = 0`, s: M`${vy} = 0`, why: D.src ? `${word}, it has no ${M`vec j`} component` : `due ${word}, it has no ${M`vec j`} component` }
    : D.x === D.y ? { f: M`v_x = v_y`, s: M`${vx} = ${vy}`, why: `${word}, its two components are equal` }
    : { f: M`v_x = -v_y`, s: M`${vx} = -(${vy})`, why: `${word}, its two components are equal and opposite` };
  const head = { f: M`vec v = ${vecSum([P.u.x, P.a.x], [P.u.y, P.a.y])}`, s: '', r: '' };
  // ALWAYS parallel: from rest, or with u along the line of a — the relation
  // is an identity, and what is left is which way along the line it goes
  if (tiny(c1) && tiny(c0)) {
    const sense = D.either ? { from: 0, until: Infinity } : dot;
    if (!sense || sense.until <= sense.from + EPS) return { ...base, ok: false, note: `It never moves ${word}: it moves along that line the other way.` };
    const t = snap(sense.from), until = isFinite(sense.until) ? snap(sense.until) : null;
    const always = t < EPS && until == null;
    // where it turns: v = 0, from the component that changes
    const c = Math.abs(P.a.x) > Math.abs(P.a.y) ? 'x' : 'y';
    const turn = !always && !D.either ? { f: M`v_${c} = 0`, s: M`${c === 'x' ? vx : vy} = 0`, r: M`t = ${d(t || until)} [s]` } : null;
    const text = always ? `It is moving ${word} the whole time: its velocity stays along that line.`
      : until != null ? `It is moving ${word} from the start until ${M`t = ${d(until)} [s]`}, when it stops and turns back.`
      : `It is moving ${word} from ${M`t = ${d(t)} [s]`} on: before that it is moving the opposite way.`;
    const tt = until != null ? until / 2 : t + 1;
    return { ...base, ok: true, always: true, t, until, v: P.vel(tt), r: P.pos(tt), speed: snap(P.speed(tt)),
      rows: [head, { f: rel.f, s: rel.s, r: M`"true for every" t` }, ...(turn ? [turn] : [])],
      why: `The relation holds for every ${M`t`}: ${Math.hypot(P.u.x, P.u.y) < EPS ? 'it starts from rest, so it moves along its acceleration' : 'its velocity is always along the line of its acceleration'}${turn ? ', and it turns round when its velocity is zero' : ''}.`,
      short: always ? `moving ${word} always` : until != null ? `moving ${word} until ${M`t = ${d(until)} [s]`}` : `moving ${word} from ${M`t = ${d(t)} [s]`}`, text };
  }
  const cands = tiny(c1) ? [] : [-c0 / c1];
  // a compass point has a sense; "parallel to a vector" has either
  const ts = after0(cands, false).filter((t) => { const v = P.vel(t); return D.either ? Math.hypot(v.x, v.y) > EPS : v.x * D.x + v.y * D.y > EPS; });
  if (!ts.length) {
    const tr = after0(cands, false)[0];
    return { ...base, ok: false, note: tr != null
      ? `It is never moving ${word}: at ${M`t = ${d(tr)} [s]`}, the one moment its velocity lines up with that direction, it is moving the opposite way.`
      : `It is never moving ${word}.` };
  }
  const t = ts[0], v = P.vel(t), r = P.pos(t), sp = Math.hypot(v.x, v.y), dist = Math.hypot(r.x, r.y);
  return {
    ...base, ok: true, t, v, r, speed: snap(sp), dist: snap(dist),
    rows: [
      head,
      { f: rel.f, s: rel.s, r: M`t = ${d(t)} [s]` },
      { f: M`vec v = ${vsrc(v)}`, s: M`abs(vec v) = sqrt(${sgn(v.x)}^2 + ${sgn(v.y)}^2)`, r: M`${d(sp)} [m s^-1]` },
      { f: M`vec r = ${vsrc(r)}`, s: M`abs(vec r) = sqrt(${sgn(r.x)}^2 + ${sgn(r.y)}^2)`, r: M`${d(dist)} [m]` },
    ],
    why: D.either ? `Moving ${rel.why} — either way along it.` : `Moving ${rel.why}, with its velocity pointing that way and not the opposite way.`,
    short: `moving ${word} at ${M`t = ${d(t)} [s]`}, ${M`${d(sp)} [m s^-1]`}, ${M`${d(dist)} [m]`} from O`,
    text: `It is moving ${word} at ${M`t = ${d(t)} [s]`}, at ${M`${d(sp)} [m s^-1]`}, ${where(r)} — ${M`${d(dist)} [m]`} from O.`,
  };
}

/** When it is due (some direction) of the origin: r parallel to d. */
function dueOf(P, D, key) {
  // r × d = 0: a quadratic in t
  const c2 = 0.5 * (P.a.x * D.y - P.a.y * D.x), c1 = P.u.x * D.y - P.u.y * D.x, c0 = P.r0.x * D.y - P.r0.y * D.x;
  const word = D.word, base = { kind: 'due', key, D };
  const inDir = (t) => { const r = P.pos(t); return r.x * D.x + r.y * D.y > EPS; };
  const rx = poly([P.r0.x, P.u.x, P.a.x / 2]), ry = poly([P.r0.y, P.u.y, P.a.y / 2]);
  const rel = D.src ? { f: M`${times(D.y, 'x')} = ${times(D.x, 'y')}`, s: M`${times(D.y, `(${rx})`)} = ${times(D.x, `(${ry})`)}` }
    : D.x === 0 ? { f: M`x = 0`, s: M`${rx} = 0` } : D.y === 0 ? { f: M`y = 0`, s: M`${ry} = 0` }
    : D.x === D.y ? { f: M`x = y`, s: M`${rx} = ${ry}` } : { f: M`x = -y`, s: M`${rx} = -(${ry})` };
  const head = { f: M`vec r = (${rx})vec(i) + (${ry})vec(j)`, s: '', r: '' };
  const label = D.src ? `in the direction ${M`(${D.src})`} from O` : `due ${word} of O`;
  // ALWAYS on that line through O: the relation is an identity
  if (tiny(c2) && tiny(c1) && tiny(c0)) {
    // r = s(t)·d for a quadratic s: on the right side of O while s(t) > 0
    const q2 = 0.5 * (P.a.x * D.x + P.a.y * D.y), q1 = P.u.x * D.x + P.u.y * D.y, q0 = P.r0.x * D.x + P.r0.y * D.y;
    const s = (t) => q0 + q1 * t + q2 * t * t;
    const cuts = after0(!tiny(q2) ? quadRoots(q2, q1, q0) : !tiny(q1) ? [-q0 / q1] : []);
    const edges = [0, ...cuts, Infinity];
    const spans = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const lo = edges[i], hi = edges[i + 1], mid = isFinite(hi) ? (lo + hi) / 2 : lo + 1;
      if (s(mid) > EPS) spans.push([lo, hi]);
    }
    if (!spans.length) return { ...base, ok: false, note: `It is never ${label}: it moves along that line on the other side of O.` };
    const [lo, hi] = spans[0];
    const text = lo < EPS && !isFinite(hi) ? `It is ${label} the whole time: it moves along that line.`
      : !isFinite(hi) ? `It is ${label} from ${M`t = ${d(lo)} [s]`} on: it moves along that line, and crosses O then.`
      : `It is ${label} ${lo < EPS ? 'from the start' : `from ${M`t = ${d(lo)} [s]`}`} until ${M`t = ${d(hi)} [s]`}, when it comes back through O.`;
    const tt = lo < EPS ? Math.min(1, isFinite(hi) ? hi / 2 : 1) : lo;
    return { ...base, ok: true, always: true, t: lo, r: P.pos(tt), dist: snap(P.dist(tt)),
      rows: [head, { f: rel.f, s: rel.s, r: M`"true for every" t` }],
      why: `The relation holds for every ${M`t`}: it moves along the line through O in that direction, and is on that side of O while ${M`vec r`} points that way.`,
      short: lo < EPS && !isFinite(hi) ? `${label} always` : `${label} ${isFinite(hi) ? `until ${M`t = ${d(hi)} [s]`}` : `from ${M`t = ${d(lo)} [s]`}`}`, text };
  }
  const roots = !tiny(c2) ? quadRoots(c2, c1, c0) : !tiny(c1) ? [-c0 / c1] : [];
  const ts = after0(roots).filter(inDir);
  if (!ts.length) return { ...base, ok: false, note: `It is never ${label} after it sets off.` };
  const t = ts[0], r = P.pos(t), dist = Math.hypot(r.x, r.y);
  return {
    ...base, ok: true, t, r, dist: snap(dist),
    rows: [
      head,
      { f: rel.f, s: rel.s, r: M`t = ${d(t)} [s]` },
      { f: M`vec r = ${vsrc(r)}`, s: M`abs(vec r) = sqrt(${sgn(r.x)}^2 + ${sgn(r.y)}^2)`, r: M`${d(dist)} [m]` },
    ],
    short: `${label} at ${M`t = ${d(t)} [s]`}, ${M`${d(dist)} [m]`} away`,
    text: `It is ${label} at ${M`t = ${d(t)} [s]`}, ${M`${d(dist)} [m]`} away.`,
  };
}

/** When one coordinate takes a value: x = X, or y = Y. */
function passes(P, c, X) {
  const a = P.a[c], u = P.u[c], r0 = P.r0[c];
  const sym = c === 'x' ? 'x' : 'y', o = c === 'x' ? 'y' : 'x', base = { kind: 'passes', c, X };
  if (tiny(a) && tiny(u)) {
    return Math.abs(r0 - X) < EPS
      ? { ...base, ok: true, always: true, t: 0, r: P.pos(0), rows: [{ f: M`u_${sym} = a_${sym} = 0`, s: '', r: M`${sym} = ${d(X)} "for every" t` }], short: `${M`${sym} = ${d(X)}`} always`, text: `Its ${M`${sym}`}-coordinate is ${M`${d(X)}`} the whole time: it does not move that way.` }
      : { ...base, ok: false, note: `Its ${M`${sym}`}-coordinate is ${M`${d(r0)}`} the whole time, never ${M`${d(X)}`}.` };
  }
  const roots = !tiny(a) ? quadRoots(0.5 * a, u, r0 - X) : [(X - r0) / u];
  // the moment it starts on that line is not it passing through it
  const ts = after0(roots, Math.abs(r0 - X) < EPS);
  if (!ts.length) {
    return { ...base, ok: false, note: Math.abs(r0 - X) < EPS
      ? `Its ${M`${sym}`}-coordinate is ${M`${d(X)}`} only at the start, ${M`t = 0`}: it leaves that line and does not come back.`
      : `Its ${M`${sym}`}-coordinate never reaches ${M`${d(X)}`}.` };
  }
  const t = ts[0], r = P.pos(t);
  return {
    ...base, ok: true, t, r, times: ts,
    rows: [
      { f: M`${sym} = ${sym}_0 + u_${sym}t + ½a_${sym}t^2`, s: M`${d(X)} = ${poly([r0, u, a / 2])}`,
        r: ts.length > 1 ? M`t = ${d(ts[0])} [s] "or" t = ${d(ts[1])} [s]` : M`t = ${d(t)} [s]` },
      { f: M`${o} = ${o}_0 + u_${o}t + ½a_${o}t^2`,
        s: M`${[P.r0[o] ? d(P.r0[o]) : '', P.u[o] ? `${sgn(P.u[o])} * ${d(t)}` : '', P.a[o] ? `½ * ${sgn(P.a[o])} * ${d(t)}^2` : ''].filter(Boolean).join(' + ') || '0'}`,
        r: M`${o} = ${d(r[o])} [m]` },
    ],
    short: `${M`${sym} = ${d(X)}`} at ${M`t = ${d(t)} [s]`}, where ${M`${o} = ${d(r[o])}`}`,
    text: `It passes ${M`${sym} = ${d(X)}`} ${ts.length > 1 ? 'first ' : ''}at ${M`t = ${d(t)} [s]`}, where ${M`${o} = ${d(r[o])}`}${ts.length > 1 ? `, and again at ${M`t = ${d(ts[1])} [s]`}` : ''}.`,
  };
}

/** When its speed is S: |u + at|² = S², a quadratic. */
function speedIs(P, S) {
  const A2 = P.a.x ** 2 + P.a.y ** 2, B1 = 2 * (P.u.x * P.a.x + P.u.y * P.a.y), C0 = P.u.x ** 2 + P.u.y ** 2 - S * S;
  const base = { kind: 'speed', S };
  if (tiny(A2)) {
    return tiny(C0, S * S)
      ? { ...base, ok: true, always: true, t: 0, rows: [{ f: M`vec a = vec 0`, s: M`abs(vec u) = sqrt(${sgn(P.u.x)}^2 + ${sgn(P.u.y)}^2)`, r: M`${d(S)} [m s^-1] "for every" t` }], short: `${M`${d(S)} [m s^-1]`} always`, text: `Its speed is ${M`${d(S)} [m s^-1]`} the whole time: with no acceleration, its velocity never changes.` }
      : { ...base, ok: false, note: `With no acceleration its speed is ${M`${d(Math.hypot(P.u.x, P.u.y))} [m s^-1]`} the whole time, never ${M`${d(S)} [m s^-1]`}.` };
  }
  const ts = after0(quadRoots(A2, B1, C0), false);
  if (!ts.length) return { ...base, ok: false, note: `Its speed is never ${M`${d(S)} [m s^-1]`}.` };
  const vx = poly([P.u.x, P.a.x, 0]), vy = poly([P.u.y, P.a.y, 0]);
  return {
    ...base, ok: true, t: ts[0], times: ts,
    rows: [
      { f: M`v_x^2 + v_y^2 = ${d(S)}^2`, s: M`(${vx})^2 + (${vy})^2 = ${d(S * S)}`, r: ts.length > 1 ? M`t = ${d(ts[0])} [s] "or" t = ${d(ts[1])} [s]` : M`t = ${d(ts[0])} [s]` },
    ],
    short: `${M`${d(S)} [m s^-1]`} at ${M`t = ${d(ts[0])} [s]`}${ts.length > 1 ? ` and ${M`${d(ts[1])} [s]`}` : ''}`,
    text: `Its speed is ${M`${d(S)} [m s^-1]`} at ${M`t = ${d(ts[0])} [s]`}${ts.length > 1 ? ` and again at ${M`t = ${d(ts[1])} [s]`}` : ''}.`,
  };
}

/**
 * A particle in a plane.
 * @param k { r0: {x,y}, u: {x,y}, a: {x,y}, vT: {x,y}, T,
 *            at: { t, moving, due, par: {x,y}, x, y, speed } }
 */
export function solvePlane(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const two = (q) => q && (have(q.x) || have(q.y));
  const vec = (q) => ({ x: have(q?.x) ? q.x : 0, y: have(q?.y) ? q.y : 0 });
  if (!two(k.a)) return fail('Still needed: the acceleration, as its two parts. Give 0 for a part that is zero.');
  if (two(k.u) && two(k.vT)) return fail('Give the initial velocity, or a velocity at a later time — not both: one fixes the other.');
  if (have(k.T) && !two(k.vT)) return fail('A time on its own: give the velocity it has at that time too, or clear it.');
  if (two(k.vT) && !have(k.T)) return fail('A later velocity needs the time it has it.');
  if (!two(k.u) && !two(k.vT)) return fail('Still needed: the initial velocity — or a velocity and the time it has it.');
  if (have(k.T) && k.T < 0) return fail('A time cannot be negative.');
  const a = vec(k.a), r0 = vec(k.r0);
  const pre = [];
  let u;
  if (two(k.u)) u = vec(k.u);
  else {
    // u = v − aT: the velocity equation run backwards
    const vT = vec(k.vT);
    u = V(vT.x - a.x * k.T, vT.y - a.y * k.T);
    pre.push({ f: M`vec u = vec v - vec(a)t`, s: M`(${vsrc(vT)}) - (${vsrc(a)}) * ${d(k.T)}`, r: M`vec u = ${vsrc(u)} [m s^-1]` });
    pre.push({ f: M`abs(vec u) = sqrt(u_x^2 + u_y^2)`, s: M`sqrt(${sgn(u.x)}^2 + ${sgn(u.y)}^2)`, r: M`${d(Math.hypot(u.x, u.y))} [m s^-1]` });
  }
  const scale = Math.max(1, Math.hypot(u.x, u.y), Math.hypot(a.x, a.y));
  if (Math.hypot(u.x, u.y) <= 1e-12 * scale && Math.hypot(a.x, a.y) <= 1e-12 * scale) return fail('With no velocity and no acceleration it never moves.');

  const P = planeMotion({ r0, u, a }, Infinity);   // answered as it runs for ever; only the picture stops
  const at = k.at || {};
  const answers = [];
  if (have(at.t)) answers.push(at.t >= 0 ? atTime(P, at.t) : { kind: 't', ok: false, note: 'A time cannot be negative.' });
  const dirM = direction(at.moving, null), dirP = direction(null, at.par);
  if (dirM) answers.push(moving(P, dirM, at.moving));
  if (dirP?.zero) answers.push({ kind: 'moving', ok: false, note: 'The zero vector has no direction, so nothing is parallel to it.' });
  else if (dirP) answers.push(moving(P, dirP, 'par'));
  const dirD = direction(at.due, null);
  if (dirD) answers.push(dueOf(P, dirD, at.due));
  if (have(at.x)) answers.push(passes(P, 'x', at.x));
  if (have(at.y)) answers.push(passes(P, 'y', at.y));
  if (have(at.speed)) answers.push(at.speed >= 0 ? speedIs(P, at.speed) : { kind: 'speed', ok: false, note: 'A speed is a size: give it positive.' });

  // Long enough to show every answer, and a little after the last.
  const times = answers.filter((x) => x.ok).flatMap((x) => x.times || [x.t]).filter(isFinite);
  const tMax = Math.max(4, times.length ? Math.max(...times) * 1.25 + 0.5 : 0, have(k.T) ? k.T * 1.25 : 0);
  const f = planeMotion({ r0, u, a }, tMax);
  f.answers = answers;

  const notes = [];
  if (pre.length) notes.push(`Its initial velocity is ${M`(${vsrc(u)}) [m s^-1]`}, a speed of ${M`${d(Math.hypot(u.x, u.y))} [m s^-1]`}.`);
  notes.push(...answers.map((x) => (x.ok ? x.text : x.note)));
  if (!answers.length && !pre.length) notes.push('Ask it something — a time, a direction, a coordinate or a speed — and the engine answers it here.');
  const derived = [
    ...(pre.length ? [`${M`vec u = ${vsrc(u)}`}, ${M`${d(Math.hypot(u.x, u.y))} [m s^-1]`}`] : []),
    ...answers.filter((x) => x.ok).map((x) => x.short),
  ];
  if (!derived.length) derived.push(answers.length ? 'none of those happens — see below' : 'its path, from O');
  return {
    ok: true, mode: 'plane', axis: 'plane', r0, u, a, pre, answers, f, notes, derived,
    params: { u: Math.hypot(u.x, u.y) },
    convention: `East is the ${M`vec i`} direction and north is ${M`vec j`}; positions are from the origin O.`,
  };
}

/* ── the working ──────────────────────────────────────────────────────── */
const TITLE = {
  t: (a) => `At ${M`t = ${d(a.t)} [s]`}`,
  moving: (a) => `When it is moving ${a.D.word}`,
  due: (a) => (a.D.src ? `When it is in the direction ${M`(${a.D.src})`} from O` : `When it is due ${a.D.word} of O`),
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
      { f: M`vec v = vec u + vec(a)t`, s: '', r: M`vec v = ${vecSum([solved.u.x, solved.a.x], [solved.u.y, solved.a.y])}` },
      { f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: '', r: M`vec r = (${poly([solved.r0.x, solved.u.x, solved.a.x / 2])})vec(i) + (${poly([solved.r0.y, solved.u.y, solved.a.y / 2])})vec(j)` },
    ],
    note: `Each is two SUVAT equations side by side: the ${M`vec i`} parts on their own, and the ${M`vec j`} parts on their own.${solved.pre.length ? ` The velocity at the later time, run back to ${M`t = 0`}, gives ${M`vec u`}.` : ''}`,
  });
  for (const a of solved.answers.filter((x) => x.ok)) {
    out.push({ title: TITLE[a.kind](a), rows: a.rows, note: [a.why, a.text].filter(Boolean).join(' ') });
  }
  return out;
}
