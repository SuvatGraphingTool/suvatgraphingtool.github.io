// overtake.js — two on one straight road: when is one level with the other?
//
// The exam family: a car and a motorbike leave the lights ten seconds apart;
// a car slowing down is overtaken by a lorry going steadily; two children
// race and cross the line together; one train overtakes another on parallel
// tracks and both brake to rest beside the same post at the same instant.
// Each of the two does the same simple thing — starts at some speed, may hold
// it for a while, changes speed at a constant rate until it reaches a speed it
// then holds (or comes to rest) — and the question is the moment they are
// level, or, run the other way, the one number (a rate, a top speed, a time
// spent speeding up, a time spent holding the first speed) that makes them
// level at a given line or a given time.
//
// "It comes to rest at the line" is a condition of its own (`ends`): its
// change of speed ends exactly there, so the area under its speed–time graph
// — a rectangle while it holds, then a trapezium or triangle — is the
// distance to the line, and that fixes whichever of its figures is missing.
//
// Each is a motion in stages (js/core/stages.js): waiting where it starts
// until its own start time, holding its first speed, changing speed, then
// steady. When they are level
// is the stages engine's `meetings`, found exactly. The unknown, when there is
// one, is found as it is by hand: the other one's time at the line (or place
// at the time) is worked out first, and then the one equation for the unknown
// — linear in a rate, a quadratic in a top speed — whose root that makes the
// change of speed take longer than the time available is rejected, and says
// why.
//
// CONVENTION. Along the road from the start is positive; both start at the
// start line unless one is given a head start; time is one clock, t = 0 when
// the first sets off.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { staged, meetings, quadRoots } from './stages.js';
import { snap } from './numeric.js';
import { poly } from './pair.js';
import { M, num, paren } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const sgn = (x) => (d(x).startsWith('−') ? `(${d(x)})` : d(x));
const NAMES = ['A', 'B'];
export const FINDABLE = { a: 'acceleration', V: 'final speed', tau: 'time spent changing speed', hold: 'time at its first speed' };
/** The hidden number, said as a noun phrase about whose it is: "B's final speed V". */
export const named = (who, what) => `${who}\u2019s ${FINDABLE[what]}`;
const UNIT_OF = { a: '[m s^-2]', V: '[m s^-1]', tau: '[s]', hold: '[s]' };
/** The letter a found number is written with: T_A for the time A holds its speed. */
const symOf = (who, what) => (what === 'tau' ? `t_${who}` : what === 'hold' ? `T_${who}` : what === 'V' ? 'V' : 'a');

/** On the tracks the papers' words are the trackside points: the start is X
    and the line is Y, and it is a track, not a road. Everything the engine
    says goes through this when it is drawn as trains. */
const RAIL = [
  [/say how far along the line is/g, 'say how far Y is from X'],
  [/a line along the road/g, 'a point beside the track'],
  [/Along the road from the start/g, 'Along the track from X'],
  [/\bthe start line\b/g, 'X'],
  [/\bfrom the start\b/g, 'from X'],
  [/\bAt the line\b/g, 'At Y'],
  [/\bthe line\b/g, 'Y'],
  [/\bThe line\b/g, 'Y'],
  [/\bthe road\b/g, 'the track'],
  [/\bThe road\b/g, 'The track'],
];
export const railWords = (x) => (typeof x === 'string' ? RAIL.reduce((s, [re, w]) => s.replace(re, w), x) : x);

/* ── one of the two ───────────────────────────────────────────────────── */
/**
 * @param q { t0, x0, u, hold, a, V, tau } — it holds u for `hold` seconds
 *          first (blank is none); then any two of a, V, tau fix the change of
 *          speed; a alone means it keeps accelerating; none means steady at u.
 */
export function mover(q, name) {
  const t0 = have(q.t0) ? q.t0 : 0, x0 = have(q.x0) ? q.x0 : 0, u = have(q.u) ? q.u : 0;
  const hold = have(q.hold) ? q.hold : 0;
  let { a, V, tau } = q;
  if (!have(a) && have(V) && have(tau)) a = tau > EPS ? (V - u) / tau : 0;
  if (!have(V) && have(a) && have(tau)) V = u + a * tau;
  if (!have(tau) && have(a) && have(V)) tau = Math.abs(a) > EPS ? (V - u) / a : 0;
  if (!have(a)) a = 0;
  const forever = !have(V) && Math.abs(a) > EPS;           // a alone: it never stops accelerating
  if (!have(V)) V = u;
  if (!have(tau)) tau = forever ? Infinity : 0;
  const stages = [];
  if (t0 > EPS) stages.push({ t0: 0, t1: t0, x0, u: 0, a: 0, kind: 'waiting' });
  // it holds its first speed, and changes speed from where that leaves it
  const tc = t0 + hold, xc = x0 + u * hold;
  if (hold > EPS) stages.push({ t0, t1: tc, x0, u, a: 0, kind: 'held' });
  if (tau > EPS) stages.push({ t0: tc, t1: tc + tau, x0: xc, u, a, kind: 'changing' });
  if (isFinite(tau)) {
    const xs = xc + u * tau + 0.5 * a * tau * tau;
    stages.push({ t0: tc + tau, t1: Infinity, x0: xs, u: V, a: 0, kind: 'steady' });
  }
  const m = staged(stages.length ? stages : [{ t0, t1: Infinity, x0, u, a: 0, kind: 'steady' }]);
  return { ...m, name, t0, x0, u, hold, a, V: forever ? null : V, tau, forever, ends: !!q.ends };
}

/** The same mover seen from the moment it stops holding its first speed: its
    working after a hold is the working of one that sets off then, from there. */
const afterHold = (p) => mover({ t0: p.t0 + p.hold, x0: p.x0 + p.u * p.hold, u: p.u, a: p.a,
  ...(p.forever ? {} : { V: p.V, tau: p.tau }) }, p.name);

/** When a mover reaches a place: the first t at which its position is X. */
export function timeAt(p, X) {
  const tol = 1e-9 * Math.max(1, Math.abs(X));
  for (const st of p.stages) {
    const s = X - st.x0;
    let roots;
    if (Math.abs(st.a) < EPS) roots = Math.abs(st.u) > EPS ? [s / st.u] : (Math.abs(s) < tol ? [0] : []);
    else roots = quadRoots(0.5 * st.a, st.u, -s);
    const len = st.t1 - st.t0;
    const ok = roots.filter((r) => r >= -1e-9 && r <= len + 1e-9).sort((x, y) => x - y);
    // coming to rest exactly at X is a tangent, which rounding can push to
    // no root at all, or to two either side of the end: it is the end
    const endsThere = isFinite(len) && Math.abs(at0(st, len) - X) < tol;
    if (endsThere && (!ok.length || ok[0] > len - 1e-6)) return snap(st.t1);
    if (ok.length) return snap(st.t0 + Math.max(0, ok[0]));
  }
  return null;
}

const at0 = (st, tau) => st.x0 + st.u * tau + 0.5 * st.a * tau * tau;

/* ── the working for one mover: where it is at a time, or when it reaches a place ── */
function reachRows(p, X, less = null) {
  const n = p.name, t = timeAt(p, X);
  // one that comes to rest at the line gets there as its change of speed ends
  if (p.ends && t != null) {
    const parts = [p.t0 > EPS ? ['t_0', d(p.t0)] : null, p.hold > EPS ? [`T_${n}`, d(p.hold)] : null, [`t_${n}`, d(p.tau)]].filter(Boolean);
    return { t, rows: [{ f: M`t = ${parts.map((x) => x[0]).join(' + ')}`, s: parts.length > 1 ? M`${parts.map((x) => x[1]).join(' + ')}` : '', r: M`t = ${d(t)} [s]` }] };
  }
  // after a hold: the distance it covers holding, then the rest from there
  if (p.hold > EPS) {
    const xh = p.x0 + p.u * p.hold;
    if (X <= xh + 1e-9) {
      return { t, rows: [{ f: M`t = ${p.t0 > EPS ? `${d(p.t0)} + ` : ''}s/u`, s: M`${p.t0 > EPS ? `${d(p.t0)} + ` : ''}${d(X - p.x0)}/${d(p.u)}`, r: M`t = ${d(t)} [s]` }] };
    }
    // what is left after the hold is written as what it is, s − s₁
    const s1 = snap(p.u * p.hold);
    const r = reachRows(afterHold(p), X, { s1, full: X - p.x0 });
    return { t, rows: [{ f: M`s_1 = uT_${n}`, s: M`${d(p.u)} * ${d(p.hold)}`, r: M`s_1 = ${d(s1)} [m]` }, ...r.rows] };
  }
  const rows = [];
  // the distance still to go, and its symbol: all of it, or what the hold left
  const D = less ? `(${d(less.full)} - ${d(less.s1)})` : d(X - p.x0), Sf = less ? '(s - s_1)' : 's';
  const late = p.t0 > EPS;
  const ch = p.stages.find((st) => st.kind === 'changing');
  if (ch && t <= ch.t1 + 1e-9) {
    // still changing speed when it gets there: s = ut + ½at²
    const T = late ? `(t - ${d(p.t0)})` : 't';
    rows.push({ f: M`${Sf} = ut + ½at^2`, s: M`${D} = ${Math.abs(p.u) > EPS ? `${sgn(p.u)}${T} + ` : ''}½ * ${sgn(p.a)}${T}^2`, r: M`t = ${d(t)} [s]` });
  } else if (ch) {
    const sCh = ch.u * (ch.t1 - ch.t0) + 0.5 * ch.a * (ch.t1 - ch.t0) ** 2;
    const z = Math.abs(p.u) < EPS;
    // (its time changing speed is in the step before, with the rest of its figures)
    const sc = less ? 's_2' : 's';
    rows.push({ f: M`${sc} = ½(u + V)t_${n}`, s: z ? M`½ * ${d(p.V)} * ${d(p.tau)}` : M`½(${d(p.u)} + ${d(p.V)}) * ${d(p.tau)}`, r: M`${sc} = ${d(sCh)} [m]` });
    rows.push(less
      ? { f: M`t = ${late ? `${d(p.t0)} + ` : ''}t_${n} + (s - s_1 - s_2)/V`,
          s: M`${late ? `${d(p.t0)} + ` : ''}${d(p.tau)} + (${d(less.full)} - ${d(less.s1)} - ${d(sCh)})/${d(p.V)}`, r: M`t = ${d(t)} [s]` }
      : { f: M`t = ${late ? `${d(p.t0)} + ` : ''}t_${n} + (${d(X - p.x0)} - s)/V`,
          s: M`${late ? `${d(p.t0)} + ` : ''}${d(p.tau)} + (${d(X - p.x0)} - ${d(sCh)})/${d(p.V)}`, r: M`t = ${d(t)} [s]` });
  } else {
    rows.push({ f: M`t = ${late ? `${d(p.t0)} + ` : ''}${Sf}/u`, s: M`${late ? `${d(p.t0)} + ` : ''}${D}/${d(p.u)}`, r: M`t = ${d(t)} [s]` });
  }
  return { t, rows };
}

/** Where a mover is at a time, worked: the twin of reachRows. */
function placeRows(p, t) {
  const n = p.name, x = snap(p.pos(t)), te = t - p.t0;
  if (p.hold > EPS && te > 0) {
    if (te <= p.hold + 1e-9) return [{ f: M`s_${n} = ut`, s: M`${d(p.u)} * ${d(te)}`, r: M`s_${n} = ${d(x - p.x0)} [m]` }];
    const rest = placeRows(afterHold(p), t);
    // the held part is a rectangle; the rest is measured from where it left off
    return [{ f: M`s_1 = uT_${n}`, s: M`${d(p.u)} * ${d(p.hold)}`, r: M`s_1 = ${d(snap(p.u * p.hold))} [m]` },
      ...rest.map((row, i) => (i === rest.length - 1 ? { ...row, r: M`s_${n} = ${d(snap(p.u * p.hold))} + ${d(snap(x - p.x0 - p.u * p.hold))} = ${d(x - p.x0)} [m]` } : row))];
  }
  const ch = p.stages.find((st) => st.kind === 'changing');
  const z = Math.abs(p.u) < EPS;
  if (te <= 0) return [{ f: M`s_${n} = 0`, s: '', r: M`s_${n} = 0 [m]` }];
  if (ch && t <= ch.t1 + 1e-9) {
    return [{ f: M`s_${n} = ut + ½at^2`, s: M`${z ? '' : `${sgn(p.u)} * ${d(te)} + `}½ * ${sgn(p.a)} * ${d(te)}^2`, r: M`s_${n} = ${d(x - p.x0)} [m]` }];
  }
  if (ch) {
    return [{ f: M`s_${n} = ½(u + V)t_${n} + V(t - t_${n})`,
              s: M`${z ? `½ * ${d(p.V)}` : `½(${d(p.u)} + ${d(p.V)})`} * ${d(p.tau)} + ${d(p.V)}(${d(te)} - ${d(p.tau)})`, r: M`s_${n} = ${d(x - p.x0)} [m]` }];
  }
  return [{ f: M`s_${n} = ut`, s: M`${d(p.u)} * ${d(te)}`, r: M`s_${n} = ${d(x - p.x0)} [m]` }];
}

/** A mover's change of speed, from the two of a, V and its time that are
    given: the third, worked — so a paper's "find the deceleration" is a row. */
function changeRows(q, p) {
  const n = p.name, z = Math.abs(p.u) < EPS;
  if (p.forever || !(p.tau > EPS)) return [];
  if (!have(q.a)) return [{ f: M`a_${n} = (V - u)/t_${n}`, s: z ? M`${d(p.V)}/${d(p.tau)}` : M`(${d(p.V)} - ${d(p.u)})/${d(p.tau)}`, r: M`a_${n} = ${d(p.a)} [m s^-2]` }];
  if (!have(q.tau)) {
    return [p.a < 0
      ? { f: M`t_${n} = (u - V)/abs(a)`, s: M`(${d(p.u)} - ${d(p.V)})/${d(-p.a)}`, r: M`t_${n} = ${d(p.tau)} [s]` }
      : { f: M`t_${n} = (V - u)/a`, s: z ? M`${d(p.V)}/${d(p.a)}` : M`(${d(p.V)} - ${d(p.u)})/${d(p.a)}`, r: M`t_${n} = ${d(p.tau)} [s]` }];
  }
  if (!have(q.V)) return [{ f: M`V_${n} = u + at_${n}`, s: M`${d(p.u)} + ${sgn(p.a)} * ${d(p.tau)}`, r: M`V_${n} = ${d(p.V)} [m s^-1]` }];
  return [];
}

/** What is wrong with one mover's figures, or null. */
function whatsWrong(q, n) {
  const u = have(q.u) ? q.u : 0;
  if (have(q.a) && have(q.V)) {
    if (Math.abs(q.a) < EPS && Math.abs(q.V - u) > EPS) return `${n} cannot change from ${M`${d(u)}`} to ${M`${d(q.V)} [m s^-1]`} with no acceleration.`;
    if (q.a * (q.V - u) < -EPS) {
      return q.V < u
        ? `${n} slows from ${M`${d(u)}`} to ${M`${d(q.V)} [m s^-1]`}, so its acceleration is negative: ${M`${d(-Math.abs(q.a))}`}, not ${M`${d(Math.abs(q.a))}`}.`
        : `${n} speeds up from ${M`${d(u)}`} to ${M`${d(q.V)} [m s^-1]`}, so its acceleration is positive: ${M`${d(Math.abs(q.a))}`}, not ${M`${d(-Math.abs(q.a))}`}.`;
    }
  }
  if (have(q.a) && have(q.tau) && u + q.a * q.tau < -1e-9) return `${n} would be going backwards by the end of those ${M`${d(q.tau)} [s]`}: it stops after ${M`${d(u / -q.a)} [s]`}.`;
  if (have(q.V) && !have(q.a) && !have(q.tau) && Math.abs(q.V - u) > EPS) return `${n} changes speed to ${M`${d(q.V)} [m s^-1]`}: give the rate or how long it takes.`;
  if (have(q.tau) && !have(q.a) && !have(q.V) && q.tau > EPS) return `${n} changes speed for ${M`${d(q.tau)} [s]`}: give the rate or the speed it changes to.`;
  if (have(q.V) && have(q.tau) && q.tau < EPS && Math.abs(q.V - u) > EPS) return `${n} cannot change speed in no time at all.`;
  return null;
}

/**
 * One that comes to rest at the line (or reaches its V there): its change of
 * speed ends exactly at X, so the area under its speed–time graph — the
 * rectangle while it holds u, then the trapezium (a triangle, to rest) while
 * it changes — is the distance, and fixes the one of its hold, rate and time
 * changing that is missing. Answers its whole spec and the working, or why not.
 */
function toLine(q, n, X) {
  const u = have(q.u) ? q.u : 0, V = have(q.V) ? q.V : 0, x0 = have(q.x0) ? q.x0 : 0, S = X - x0;
  const given = ['hold', 'a', 'tau'].filter((x) => have(q[x]));
  const m = (x) => M`${d(snap(x))} [m]`;
  const rest = Math.abs(V) < EPS;
  const stops = rest ? 'come to rest' : `reach ${M`${d(V)} [m s^-1]`}`;
  if (Math.abs(u - V) < EPS) return { fail: `${n} starts at ${M`${d(u)} [m s^-1]`} and ends at it, so it has no change of speed to end at the line. Give it a different ${M`V`}${rest ? ', or a speed to start at' : ''}.` };
  if (!(S > EPS)) return { fail: `The line is not ahead of ${n}, so it cannot ${stops} there.` };
  if (given.length > 1) return { fail: `${n} ${rest ? 'comes to rest' : 'reaches its speed'} at the line, and that fixes one of its time at ${M`u`}, its rate and its time changing speed. Give only one of them.` };
  const half = rest ? `½ * ${d(u)}` : `½(${d(u)} + ${d(V)})`;
  const halfF = rest ? '½u' : '½(u + V)';
  const rows = [];
  let hold, tau, a;
  if (have(q.a) || have(q.tau)) {
    if (have(q.a)) {
      if (Math.abs(q.a) < EPS || q.a * (V - u) < 0) {
        return { fail: `${n} ${V < u ? 'slows' : 'speeds up'} from ${M`${d(u)}`} to ${M`${d(V)} [m s^-1]`}, so its acceleration is ${V < u ? 'negative' : 'positive'}${Math.abs(q.a) < EPS ? '' : `: ${M`${d(-q.a)}`}, not ${M`${d(q.a)}`}`}.` };
      }
      a = q.a; tau = snap((V - u) / a);
      rows.push(a < 0 ? { f: M`t_${n} = (u - V)/abs(a)`, s: M`(${d(u)} - ${d(V)})/${d(-a)}`, r: M`t_${n} = ${d(tau)} [s]` }
        : { f: M`t_${n} = (V - u)/a`, s: M`(${d(V)} - ${d(u)})/${d(a)}`, r: M`t_${n} = ${d(tau)} [s]` });
    } else tau = q.tau;
    if (!(tau > EPS)) return { fail: `${n} cannot change speed in no time at all.` };
    const sCh = 0.5 * (u + V) * tau;
    if (Math.abs(u) < EPS) {
      if (Math.abs(sCh - S) > 1e-9 * Math.max(1, S)) return { fail: `From rest, ${n} covers ${m(sCh)} changing speed, not the ${m(S)} to the line: those figures do not fit together.` };
      hold = 0;
    } else {
      hold = snap((S - sCh) / u);
      if (hold < -1e-9) return { fail: `${n} covers ${m(sCh)} just changing speed, more than the ${m(S)} to the line: it cannot ${stops} there.` };
      hold = Math.max(0, hold);
      rows.push({ f: M`s = uT_${n} + ${halfF}t_${n}`, s: M`${d(S)} = ${d(u)}T_${n} + ${half} * ${d(tau)}`, r: M`T_${n} = ${d(hold)} [s]` });
    }
    if (!a) {
      a = snap((V - u) / tau);
      rows.push({ f: M`a_${n} = (V - u)/t_${n}`, s: M`(${d(V)} - ${d(u)})/${d(tau)}`, r: M`a_${n} = ${d(a)} [m s^-2]` });
    }
  } else {
    hold = have(q.hold) ? q.hold : 0;
    const sHold = u * hold;
    if (sHold > S - 1e-9) return { fail: `Holding ${M`${d(u)} [m s^-1]`} for ${M`${d(hold)} [s]`} takes ${n} ${m(sHold)}, ${sHold > S + 1e-9 ? 'past' : 'all the way to'} the line, with no room to ${stops} before it.` };
    tau = snap(2 * (S - sHold) / (u + V));
    rows.push(hold > EPS
      ? { f: M`s = uT_${n} + ${halfF}t_${n}`, s: M`${d(S)} = ${d(u)} * ${d(hold)} + ${half}t_${n}`, r: M`t_${n} = ${d(tau)} [s]` }
      : { f: M`s = ${halfF}t_${n}`, s: M`${d(S)} = ${half}t_${n}`, r: M`t_${n} = ${d(tau)} [s]` });
    a = snap((V - u) / tau);
    rows.push({ f: M`a_${n} = (V - u)/t_${n}`, s: M`(${d(V)} - ${d(u)})/${d(tau)}`, r: M`a_${n} = ${d(a)} [m s^-2]` });
  }
  return { spec: { ...q, u, V, hold, a, tau, ends: true }, rows };
}

/**
 * The one whose number is found, when it comes to rest (or reaches its V) at
 * the line at the moment the other gets there: te after it set off, S along.
 * Its time at u and its time changing speed add up to te, and the area under
 * its speed–time graph is S — two equations, so with u and V known they fix
 * both times and so its rate, as the mark schemes do it:
 *   S = uT + ½(u + V)(te − T).
 */
function findToLine(q, who, what, te, S, other, tt) {
  const u = have(q.u) ? q.u : 0, Ts = `T_${who}`, ts = `t_${who}`, T = d(te);
  const has = (x) => have(q[x]) && x !== what;
  const m = (x) => M`${d(snap(x))} [m]`;
  const late = Math.abs(tt - te) > EPS;
  const when = `at ${M`t = ${d(tt)} [s]`}, when ${other} gets there${late ? ` (${M`${T} [s]`} after ${who} sets off)` : ''}`;
  const tauRow = (h, tau) => ({ f: M`${ts} = t - ${Ts}`, s: M`${T} - ${d(h)}`, r: M`${ts} = ${d(tau)} [s]` });
  const aRow = (V, tau, a) => ({ f: M`a_${who} = (V - u)/${ts}`, s: M`(${d(V)} - ${d(u)})/${d(tau)}`, r: M`a_${who} = ${d(a)} [m s^-2]` });
  // a late starter's t is on its own clock, and the working says so first
  const own = late ? [{ f: M`t = ${d(tt)} - t_0`, s: M`${d(tt)} - ${d(tt - te)}`, r: M`t = ${T} [s]` }] : [];
  const done = (value, rows, then, h, tau, V) => {
    const a = snap((V - u) / tau);
    if (!(tau > 1e-9)) return { fail: `${who} would have no time left to change speed: no ${FINDABLE[what]} makes it stop at the line ${when}.` };
    return { value, rows: [...own, ...rows], then: then(a), spec: { ...q, u, V, hold: h, tau, a, ends: true } };
  };
  if (what === 'V') {
    const giv = ['hold', 'tau', 'a'].filter(has);
    if (giv.length > 1) return { fail: `To find ${named(who, 'V')}, give only one of its time at ${M`u`}, its rate and its time changing speed: the line and the time fix the rest.` };
    if (has('a')) {
      // V = u + a t_B and T = t − t_B: then S = ut + ½a t_B², one root
      const a = q.a, r2 = 2 * (S - u * te) / a;
      if (!(r2 > 0) || Math.sqrt(r2) > te + 1e-9) return { fail: `No ${FINDABLE.V} makes ${who} reach it at the line ${when}: at ${M`a = ${d(a)} [m s^-2]`} it covers ${S > u * te ? 'too little' : 'too much'} in that time.` };
      const tau = snap(Math.sqrt(r2)), h = snap(te - tau), V = snap(u + a * tau);
      if (V < -1e-9) return { fail: `That would have ${who} slow below rest: no ${FINDABLE.V} makes it stop at the line ${when}.` };
      return done(V, [{ f: M`s = ut + ½a${ts}^2`, s: M`${d(S)} = ${d(u)} * ${T} + ½ * ${sgn(a)}${ts}^2`, r: M`${ts} = ${d(tau)} [s]` },
        { f: M`V = u + a${ts}`, s: M`${d(u)} + ${sgn(a)} * ${d(tau)}`, r: M`V = ${d(V)} [m s^-1]` }],
      () => (h > EPS ? [{ f: M`${Ts} = t - ${ts}`, s: M`${T} - ${d(tau)}`, r: M`${Ts} = ${d(h)} [s]` }] : []), h, tau, V);
    }
    const h = has('tau') ? snap(te - q.tau) : has('hold') ? q.hold : 0, tau = snap(te - h);
    if (h < -1e-9 || !(tau > EPS)) return { fail: `${who} has only ${M`${T} [s]`} until ${other} reaches the line, not enough for those times.` };
    const V = snap(2 * (S - u * h) / tau - u);
    if (V < -1e-9) return { fail: `No ${FINDABLE.V} makes ${who} reach the line just then: even slowing to rest it covers ${m(u * h + 0.5 * u * tau)}, more than the ${m(S)} to it.` };
    const row = h > EPS
      ? { f: M`s = u${Ts} + ½(u + V)(t - ${Ts})`, s: M`${d(S)} = ${d(u)} * ${d(h)} + ½(${d(u)} + V)(${T} - ${d(h)})`, r: M`V = ${d(V)} [m s^-1]` }
      : { f: M`s = ½(u + V)t`, s: M`${d(S)} = ½(${d(u)} + V) * ${T}`, r: M`V = ${d(V)} [m s^-1]` };
    return done(V, [row], (a) => [...(has('tau') ? [{ f: M`${Ts} = t - ${ts}`, s: M`${T} - ${d(q.tau)}`, r: M`${Ts} = ${d(h)} [s]` }] : h > EPS ? [tauRow(h, tau)] : []), aRow(V, tau, a)], h, tau, V);
  }
  const V = have(q.V) ? q.V : 0;
  const giv = ['hold', 'tau', 'a'].filter(has);
  if (giv.length) {
    const word = { hold: `its time at ${M`u`}`, tau: 'its time changing speed', a: 'its rate' };
    return { fail: `${who} stops at the line ${when}: with its two speeds, that fixes its time at ${M`u`}, its time changing speed and its rate together. Leave ${giv.map((x) => word[x]).join(' and ')} blank.` };
  }
  if (Math.abs(u - V) < EPS) return { fail: `${who} starts at ${M`${d(u)} [m s^-1]`} and ends at it, so it has no change of speed: give it a different ${M`V`}.` };
  // T runs from 0 (changing speed all the way) to te (holding u all the way)
  const sAll = 0.5 * (u + V) * te, sHold = u * te;
  const [lo, hi] = [sAll, sHold].sort((x, y) => x - y);
  if (S < lo - 1e-9 || S > hi + 1e-9) {
    const howLo = lo === sAll ? 'changing speed from the start' : `holding ${M`${d(u)} [m s^-1]`} all the way`;
    const howHi = hi === sAll ? 'changing speed from the start' : `holding ${M`${d(u)} [m s^-1]`} all the way`;
    return { fail: `No ${FINDABLE[what]} makes ${who} ${Math.abs(V) < EPS ? 'come to rest' : 'reach its speed'} at the line ${when}. `
      + (S > hi ? `Even ${howHi}, it covers only ${m(hi)}, short of the ${m(S)} to the line.` : `Even ${howLo}, it still covers ${m(lo)}, more than the ${m(S)} to the line.`) };
  }
  const h = snap(Math.min(te, Math.max(0, (2 * S - (u + V) * te) / (u - V)))), tau = snap(te - h);
  const half = Math.abs(V) < EPS ? `½ * ${d(u)}` : `½(${d(u)} + ${d(V)})`;
  const halfF = Math.abs(V) < EPS ? '½u' : '½(u + V)';
  const hRow = { f: M`s = u${Ts} + ${halfF}(t - ${Ts})`, s: M`${d(S)} = ${d(u)}${Ts} + ${half}(${T} - ${Ts})`, r: M`${Ts} = ${d(h)} [s]` };
  if (what === 'hold') return done(h, [hRow], (a) => [tauRow(h, tau), aRow(V, tau, a)], h, tau, V);
  if (what === 'tau') {
    return done(tau, [{ f: M`s = u(t - ${ts}) + ${halfF}${ts}`, s: M`${d(S)} = ${d(u)}(${T} - ${ts}) + ${half}${ts}`, r: M`${ts} = ${d(tau)} [s]` }],
      (a) => [{ f: M`${Ts} = t - ${ts}`, s: M`${T} - ${d(tau)}`, r: M`${Ts} = ${d(h)} [s]` }, aRow(V, tau, a)], h, tau, V);
  }
  // the rate: its time at u first, then the time left to change speed in
  const a = snap((V - u) / tau);
  return done(a, [hRow, tauRow(h, tau), aRow(V, tau, a)], () => [], h, tau, V);
}

/**
 * Two on one road.
 * @param k { A: {t0,x0,u,a,V,tau}, B: {...}, line, at, find: 'B.V' | 'A.a' | ... }
 *   line — a place along the road (the finish, the point where one passes the
 *          other); at — a time. With `find`, the unknown makes them level at
 *          the line (or at the time).
 */
export function solveOvertake(k = {}) {
  const say = k.where === 'rail' ? railWords : (x) => x;
  const fail = (reason) => ({ ok: false, reason: say(reason), derived: [], notes: [] });
  const find = k.find ? { who: k.find.split('.')[0], what: k.find.split('.')[1] } : null;
  for (const n of NAMES) {
    const q = k[n] || {};
    for (const key of ['t0', 'tau', 'hold']) if (have(q[key]) && q[key] < 0) return fail(`${n}’s times cannot be negative.`);
    if (have(q.u) && q.u < 0 || have(q.V) && q.V < 0) return fail('Speeds along the road are sizes: give them as positive numbers.');
    if (q.ends && !have(k.line)) return fail(`${n} comes to rest (or reaches its speed) at the line: say how far along the line is.`);
    const n3 = ['a', 'V', 'tau'].filter((x) => have(q[x]) && !(find && find.who === n && find.what === x)).length;
    if (n3 > 2 && !q.ends) return fail(`${n} has an acceleration, a speed to reach and a time to reach it — two of those fix the third. Clear one.`);
  }
  for (const n of NAMES) {
    const q = { ...(k[n] || {}) };
    if (find && find.who === n) delete q[find.what];
    const wrong = q.ends ? null : whatsWrong(q, n);
    if (wrong && !(find && find.who === n)) return fail(wrong);
    if (!['u', 'a', 'V', 'tau'].some((x) => have(q[x])) && !(find && find.who === n)) {
      return fail(`Still needed: how ${n} moves — its speed, or its acceleration.`);
    }
  }
  if (find) {
    if (!have(k.line) && !have(k.at)) return fail('To find an unknown, say where they are level (a line along the road) or when.');
    const q = k[find.who] || {};
    const others = ['a', 'V', 'tau'].filter((x) => x !== find.what && have(q[x]));
    if (q.ends && !have(k.line)) return fail(`${find.who} comes to rest at the line: say how far along the line is.`);
    // an acceleration can be found with nothing else given — it keeps
    // accelerating — but a top speed or a time needs one of the other two
    // (one that stops at the line, or holds its speed first, is worked out
    // differently and says what it needs as it goes)
    if (!q.ends && find.what !== 'hold' && (others.length > 1 || (others.length === 0 && find.what !== 'a'))) {
      return fail(`To find ${named(find.who, find.what)}, give exactly one of the other two of its acceleration, final speed and time for ${find.who}.`);
    }
  }

  const notes = [];
  let found = null, rejected = [], findRows = [], refRows = [], tLevel = null;
  const spec = { A: { ...(k.A || {}) }, B: { ...(k.B || {}) } };
  // one that comes to rest at the line has its missing figure fixed by it —
  // except the one whose number is being found, which is worked out below
  const lineRows = { A: null, B: null };
  for (const n of NAMES) {
    if (!spec[n].ends || (find && find.who === n)) continue;
    const r = toLine(spec[n], n, k.line);
    if (r.fail) return fail(r.fail);
    spec[n] = r.spec; lineRows[n] = r.rows;
  }

  if (find) {
    const who = find.who, other = who === 'A' ? 'B' : 'A';
    const R = mover(spec[other], other);
    // the other one first: when it is at the line, or where it is at the time
    let X, tt;
    if (have(k.line)) {
      const r = reachRows(R, k.line);
      if (r.t == null) return fail(`${other} never reaches ${M`${d(k.line)} [m]`}, so there is no moment to be level at.`);
      X = k.line; tt = r.t; refRows = r.rows;
    } else {
      tt = k.at; X = snap(R.pos(tt));
      refRows = placeRows(R, tt);
    }
    tLevel = tt;
    // the unknown one: one equation in the unknown, by the regime it is in at tt
    const q = spec[who], u = have(q.u) ? q.u : 0;
    if (!(tt - (have(q.t0) ? q.t0 : 0) > EPS)) return fail(`${who} has not set off by then, so nothing about it can make them level.`);
    if (q.ends) {
      const r = findToLine(q, who, find.what, tt - (have(q.t0) ? q.t0 : 0), X - (have(q.x0) ? q.x0 : 0), other, tt);
      if (r.fail) return fail(r.fail);
      found = { who, what: find.what, sym: symOf(who, find.what), value: r.value, rows: r.rows };
      spec[who] = r.spec; lineRows[who] = r.then;
    } else {
    // one that holds its first speed for a given time is worked from the
    // moment it stops holding: the same as one that sets off then, from there
    const h0 = find.what !== 'hold' && have(q.hold) ? q.hold : 0;
    const t0 = (have(q.t0) ? q.t0 : 0) + h0, x0 = (have(q.x0) ? q.x0 : 0) + u * h0;
    const te = tt - t0, S = X - x0;
    if (!(te > EPS)) return fail(`${who} is still holding its first speed then, so its ${FINDABLE[find.what]} makes no difference to where it is.`);
    const cands = [];                 // { value, rows, why? }
    // how far it can get by then, whatever the unknown, when that is limited
    let bound = null;
    // with a final speed fixed: from barely changing speed to changing to it at once
    const vBound = (V) => {
      const ends = [{ s: u * te, how: `barely changing speed in those ${M`${T} [s]`}` }, { s: V * te, how: `changing to ${M`${d(V)} [m s^-1]`} at once and holding it for the ${M`${T} [s]`}` }].sort((x, y) => x.s - y.s);
      return { lo: ends[0].s, loHow: ends[0].how, hi: ends[1].s, hiHow: ends[1].how };
    };
    const sym = symOf(who, find.what);
    const T = `${d(te)}`;
    if (find.what === 'hold') {
      // how long it holds u before its change of speed: the rectangle, the
      // change, and (if it is over by then) the rectangle at V after it
      const p0 = mover({ u, a: q.a, V: q.V, tau: q.tau }, who);
      if (!(p0.tau > EPS)) return fail(`${who} never changes speed, so how long it holds its first speed makes no difference. Give its change of speed.`);
      const Ts = `T_${who}`;
      if (isFinite(p0.tau)) {
        const D = 0.5 * (u + p0.V) * p0.tau, V = p0.V;
        if (Math.abs(u - V) > EPS) {
          const h = (S - D - V * (te - p0.tau)) / (u - V);
          cands.push({ value: snap(h), rows: [{ f: M`s = uT_${who} + ½(u + V)t_${who} + V(t - T_${who} - t_${who})`,
            s: M`${d(S)} = ${d(u)}${Ts} + ½(${d(u)} + ${d(V)}) * ${d(p0.tau)} + ${d(V)}(${T} - ${Ts} - ${d(p0.tau)})`, r: M`${Ts} = ${d(h)} [s]` }],
            check: (v) => v >= -1e-9 && v <= te - p0.tau + 1e-9 });
        }
      }
      // or still changing speed then: s = ut + ½a(t − T)²
      const r2 = 2 * (S - u * te) / p0.a;
      if (r2 >= -1e-12) {
        const h = te - Math.sqrt(Math.max(0, r2));
        cands.push({ value: snap(h), rows: [{ f: M`s = ut + ½a(t - T_${who})^2`, s: M`${d(S)} = ${Math.abs(u) > EPS ? `${d(u)} * ${T} + ` : ''}½ * ${sgn(p0.a)}(${T} - ${Ts})^2`, r: M`${Ts} = ${d(h)} [s]` }],
          check: (v) => v >= -1e-9 && te - v <= p0.tau + 1e-9 });
      }
      const s0 = snap(p0.pos(te)), sAll = u * te;
      bound = s0 < sAll ? { lo: s0, loHow: 'changing speed from the start', hi: sAll, hiHow: `holding ${M`${d(u)} [m s^-1]`} the whole ${M`${T} [s]`}` }
        : { lo: sAll, loHow: `holding ${M`${d(u)} [m s^-1]`} the whole ${M`${T} [s]`}`, hi: s0, hiHow: 'changing speed from the start' };
    } else if (find.what === 'a') {
      if (have(q.V)) {
        bound = vBound(q.V);
        // steady by then: S = V te − (V − u)²/(2a)
        const a = (q.V - u) ** 2 / (2 * (q.V * te - S));
        cands.push({ value: snap(a), rows: [{ f: M`s = Vt - (V - u)^2/(2a)`, s: M`${d(S)} = ${d(q.V)} * ${T} - (${d(q.V)} - ${d(u)})^2/(2a)`, r: M`a = ${d(a)} [m s^-2]` }],
          check: (v) => (q.V - u) / v <= te + 1e-9 && (q.V - u) / v >= -1e-9 });
        // still changing at that time
        const a2 = 2 * (S - u * te) / (te * te);
        cands.push({ value: snap(a2), rows: [{ f: M`s = ut + ½at^2`, s: M`${d(S)} = ${Math.abs(u) > EPS ? `${d(u)} * ${T} + ` : ''}½a * ${T}^2`, r: M`a = ${d(a2)} [m s^-2]` }],
          check: (v) => (q.V - u) / v >= te - 1e-9 });
      } else if (have(q.tau)) {
        // S = u te + ½ a τ² + a τ (te − τ)  (changes for τ, then holds u + aτ)
        const tau = q.tau;
        const a = tau <= te ? (S - u * te) / (0.5 * tau * tau + tau * (te - tau)) : 2 * (S - u * te) / (te * te);
        cands.push({ value: snap(a), rows: tau <= te
          ? [{ f: M`s = ut + ½a${'t_' + who}^2 + a${'t_' + who}(t - ${'t_' + who})`, s: M`${d(S)} = ${Math.abs(u) > EPS ? `${d(u)} * ${T} + ` : ''}½a * ${d(tau)}^2 + a * ${d(tau)}(${T} - ${d(tau)})`, r: M`a = ${d(a)} [m s^-2]` }]
          : [{ f: M`s = ut + ½at^2`, s: M`${d(S)} = ½a * ${T}^2`, r: M`a = ${d(a)} [m s^-2]` }], check: () => true });
      } else {
        // keeps accelerating — or, slowing, slows until it stops and stays
        // stopped, which must not be before the moment they are level
        const a = 2 * (S - u * te) / (te * te);
        const stop = a < 0 ? u / -a : Infinity;
        cands.push({ value: snap(a), rows: [{ f: M`s = ut + ½at^2`, s: M`${d(S)} = ${Math.abs(u) > EPS ? `${d(u)} * ${T} + ` : ''}½a * ${T}^2`, r: M`a = ${d(a)} [m s^-2]` }],
          check: () => stop >= te - 1e-9, why: stop < te - 1e-9 ? `would stop it after ${M`${d(stop)} [s]`}, before the ${M`${T} [s]`} are up` : '' });
        bound = { lo: u * te / 2, loHow: `slowing to a stop just as the ${M`${T} [s]`} are up`, hi: Infinity };
      }
    } else {
      // V or tau, with a given, or with the other of the two given
      if (have(q.a) && Math.abs(q.a) > EPS) {
        // It changes speed for τ at rate a and then holds V = u + aτ, so the
        // area under its speed–time graph is s = u t + a t τ − ½ a τ²
        // (with t its time moving). Written in whichever the paper asks for:
        //   in τ:  τ² − 2tτ + 2(s − ut)/a = 0
        //   in V:  V² − 2(u + at)V + u² + 2as = 0
        const a = q.a, inTau = find.what === 'tau', ts = `t_${who}`;
        const [c2, c1, c0] = inTau ? [1, -2 * te, 2 * (S - u * te) / a] : [1, -(2 * u + 2 * a * te), u * u + 2 * a * S];
        const roots = quadRoots(c2, c1, c0).map(snap);
        for (const r of roots) {
          const tau = inTau ? r : (r - u) / a;
          const value = r;
          // a speed below zero is no speed; then a time it cannot have
          const why = !inTau && r < -1e-9 ? 'is negative, and a speed along the road cannot be'
            : tau > te + 1e-9 ? (inTau ? `is longer than the ${M`${T} [s]`} there is` : `would take ${M`${d(tau)} [s]`} to reach, longer than the ${M`${T} [s]`} there is`)
            : tau < -1e-9 ? (inTau ? 'is negative'
              : a > 0 ? `is below its starting ${M`${d(u)} [m s^-1]`}, so it would have to slow down, against its acceleration`
                : `is above its starting ${M`${d(u)} [m s^-1]`}, so it would have to speed up, against its deceleration`) : '';
          cands.push({ value, Vr: r, rows: [], check: () => !why, why });
        }
        // how far it can get in that time, whatever the unknown: its distance
        // grows (or shrinks, slowing) steadily with how long it changes speed
        const tEnd = a < 0 ? Math.min(te, u / -a) : te;
        const sAt = (tau) => u * te + a * te * tau - 0.5 * a * tau * tau;
        const keep = `keeping its starting speed for the ${M`${T} [s]`}`, change = a > 0 ? `speeding up the whole ${M`${T} [s]`}`
          : tEnd < te - 1e-9 ? `slowing until it stops, ${M`${d(tEnd)} [s]`} in` : `slowing the whole ${M`${T} [s]`}`;
        bound = a > 0 ? { lo: sAt(0), loHow: keep, hi: sAt(tEnd), hiHow: change }
          : { lo: sAt(tEnd), loHow: change, hi: sAt(0), hiHow: keep };
        // the area, as the mark schemes write it: the triangle (or trapezium)
        // while it changes speed, and the rectangle after
        // V written in the unknown: t_B itself when a = 1 from rest, as the papers have it
        const Vraw = inTau ? `${Math.abs(u) > EPS ? `${d(u)} + ` : ''}${Math.abs(a - 1) > EPS ? d(a) : ''}${ts}` : 'V';
        const Vt = paren(Vraw);
        // slowing down, (V − u)/a is written (u − V)/|a|, as by hand; over 1 it is not written over anything
        const over = (top, b) => (Math.abs(b - 1) < EPS ? top : `(${top})/${d(b)}`);
        const tauS = inTau ? ts : a < 0 ? over(`${d(u)} - V`, -a)
          : (Math.abs(u) > EPS ? over(`V - ${d(u)}`, a) : over('V', a).replace(/^\((V)\)/, '$1'));
        // in a product a fraction is bracketed too, so the × reads as it should
        const tauB = inTau ? tauS : /\//.test(tauS) ? `(${tauS})` : paren(tauS);
        const half = Math.abs(u) > EPS ? `½(${d(u)} + ${Vraw})` : /^\d/.test(Vraw) ? `½ * ${Vraw}` : `½${Vt}`;
        findRows = [
          { f: inTau ? M`s = ½(u + V)${ts} + V(t - ${ts})` : M`s = ½(u + V)${ts} + V(t - ${ts})`,
            s: M`${d(S)} = ${half} * ${tauB} + ${Vt}(${T} - ${paren(tauS)})`,
            r: M`${poly([c0, c1, c2], 4, { desc: true, sym: inTau ? ts : 'V' })} = 0` },
          { f: M`${inTau ? ts : 'V'} = (-b +- sqrt(b^2 - 4ac))/(2a)`, s: M`(${d(-c1)} +- sqrt(${sgn(c1)}^2 - 4 * ${sgn(c0)}))/2`,
            r: roots.length > 1 ? M`${inTau ? ts : 'V'} = ${d(roots[0])} "or" ${d(roots[1])}` : roots.length ? M`${inTau ? ts : 'V'} = ${d(roots[0])}` : M`"no real root"` },
        ];
      } else if (have(q.V) && find.what === 'tau') {
        const tau = 2 * (q.V * te - S) / (q.V - u);
        cands.push({ value: snap(tau), rows: [{ f: M`s = Vt - ½(V - u)t_${who}`, s: M`${d(S)} = ${d(q.V)} * ${T} - ½(${d(q.V)} - ${d(u)})t_${who}`, r: M`t_${who} = ${d(tau)} [s]` }],
          check: (v) => v >= -1e-9 && v <= te + 1e-9 });
        // or still changing speed then, at the rate (V − u)/t_B
        const tau2 = (q.V - u) * te * te / (2 * (S - u * te));
        cands.push({ value: snap(tau2), rows: [{ f: M`s = ut + ((V - u)t^2)/(2t_${who})`, s: M`${d(S)} = ${Math.abs(u) > EPS ? `${d(u)} * ${T} + ((${d(q.V)} - ${d(u)})` : `(${d(q.V)}`} * ${T}^2)/(2t_${who})`, r: M`t_${who} = ${d(tau2)} [s]` }],
          check: (v) => v >= te - 1e-9 });
        bound = vBound(q.V);
      } else if (have(q.tau) && find.what === 'V') {
        const tau = q.tau;
        if (tau <= te + 1e-9) {
          const Vv = (S - 0.5 * u * tau) / (te - 0.5 * tau);
          cands.push({ value: snap(Vv), rows: [{ f: M`s = ½(u + V)t_${who} + V(t - t_${who})`, s: M`${d(S)} = ½(${d(u)} + V) * ${d(tau)} + V(${T} - ${d(tau)})`, r: M`V = ${d(Vv)} [m s^-1]` }],
            check: (v) => v >= -1e-9 });
        } else {
          // still changing speed then: s = ut + (V − u)t²/(2t_B)
          const Vv = u + 2 * tau * (S - u * te) / (te * te);
          cands.push({ value: snap(Vv), rows: [{ f: M`s = ut + ((V - u)t^2)/(2t_${who})`, s: M`${d(S)} = ${Math.abs(u) > EPS ? `${d(u)} * ${T} + ((V - ${d(u)})` : '(V'} * ${T}^2)/(2 * ${d(tau)})`, r: M`V = ${d(Vv)} [m s^-1]` }],
            check: (v) => v >= -1e-9 });
        }
        // slowest is slowing to a stop over its t_B; there is no fastest
        const sStop = tau <= te ? 0.5 * u * tau : u * te - 0.5 * (u / tau) * te * te;
        bound = { lo: sStop, loHow: `slowing to a stop over its ${M`${d(tau)} [s]`}`, hi: Infinity };
        if (tau > te) bound.loHow += ` (${M`${T} [s]`} of which have gone by then)`;
      } else return fail(`To find ${named(who, find.what)}, give its acceleration or its other figure.`);
    }
    const good = cands.filter((c) => isFinite(c.value) && c.check(c.value) && (find.what !== 'a' || true));
    rejected = cands.filter((c) => !good.includes(c) && isFinite(c.value) && (c.why || c.Vr != null));
    if (!good.length) {
      const m = (x) => M`${d(snap(x))} [m]`;
      const reach = bound && S > bound.hi + 1e-9 ? ` Even ${bound.hiHow}, ${who} covers only ${m(bound.hi)}, short of the ${m(S)} it needs.`
        : bound && S < bound.lo - 1e-9 ? ` Even ${bound.loHow}, ${who} still covers ${m(bound.lo)}, more than the ${m(S)} it needs.` : '';
      const roots = rejected.filter((c) => c.why);
      return fail(`No ${FINDABLE[find.what]} makes ${who} level with ${other} there.${reach}`
        + (!reach && roots.length ? ` ${roots.map((c) => `${M`${sym} = ${d(c.value)}`} ${c.why}`).join('; ')}.` : ''));
    }
    const pick = good.sort((x, y) => Math.abs(x.value) - Math.abs(y.value))[0];
    found = { who, what: find.what, sym, value: pick.value, rows: pick.rows.length ? pick.rows : findRows };
    // after a given hold, the distance it covered holding comes first
    if (h0 > EPS) found.rows = [{ f: M`s_1 = uT_${who}`, s: M`${d(u)} * ${d(h0)}`, r: M`s_1 = ${d(snap(u * h0))} [m]` }, ...found.rows];
    spec[who] = { ...q, [find.what]: pick.value };
    }
    // slowing with nothing else given, it slows until it stops, and stays
    if (find.what === 'a' && found.value < 0 && !have(q.V) && !have(q.tau)) spec[who].V = 0;
    const wrong = whatsWrong(spec[who], who);
    if (wrong) return fail(`That ${FINDABLE[find.what]} does not work: ${wrong}`);
  }

  const A = mover(spec.A, 'A'), B = mover(spec.B, 'B');
  for (const p of [A, B]) {
    if (Math.abs(p.u) < EPS && Math.abs(p.a) < EPS && !(p.V > EPS)) return fail(`${p.name} never moves: give it a speed or an acceleration.`);
    if (found && p.name === found.who && ((p.V ?? 1) < -1e-9 || (p.forever && p.a < 0))) {
      return fail(`The only ${FINDABLE[found.what]} that would do it, ${M`${found.sym} = ${d(found.value)}`}, has ${p.name} slow to a stop and go backwards before then: no ${FINDABLE[found.what]} makes them level there.`);
    }
    if ((p.V ?? 1) < -1e-9 || (p.forever && p.a < 0)) return fail(`${p.name} would slow to a stop and go backwards: give it a speed to slow to, and the road ahead does the rest.`);
  }

  // When they are level, looked for well beyond what is shown, so that
  // "never level again" is a fact and not the edge of the search.
  const met = meetings(A, B, { from: 0, to: 1e4 });
  if (met.some((m) => m.together && m.until - m.t > 1e-6 && m.t >= Math.max(A.t0, B.t0) - 1e-9 && Math.abs(m.vA) > 1e-9)) {
    return fail('Those are the same motion twice: they set off together and never part.');
  }
  // Both at rest in the same place is the moment they stopped together: one
  // meeting, not a stretch of them — and the tangent root found as each comes
  // to rest is that same moment, so it is not counted twice.
  // Its time is when the later of the two stops, from its own stages.
  const stopOf = (p) => (Math.abs(p.V ?? 1) < EPS && isFinite(p.tau) ? p.t0 + p.hold + p.tau : null);
  const sA = stopOf(A), sB = stopOf(B);
  const rest = sA != null && sB != null && Math.abs(A.pos(sA) - B.pos(sB)) < 1e-9 * Math.max(1, Math.abs(A.pos(sA)))
    ? { t: snap(Math.max(sA, sB)), x: snap(A.pos(sA)), vA: 0, vB: 0, rest: true, first: Math.abs(sA - sB) < 1e-6 ? null : sA < sB ? 'A' : 'B', tFirst: snap(Math.min(sA, sB)) } : null;
  const all = [...met.filter((m) => !(rest && (m.together || Math.abs(m.t - rest.t) < 1e-4 * Math.max(1, rest.t)))), ...(rest ? [rest] : [])]
    .sort((m, n) => m.t - n.t);
  // Both still at the start line is the start, whoever has set off: two that
  // wait there are not "level" with each other in any way a paper means.
  const atStart = (m) => Math.abs(m.x - A.x0) < 1e-9 && Math.abs(m.x - B.x0) < 1e-9 && m.t <= Math.max(A.t0, B.t0) + 1e-9;
  const later = all.filter((m) => !m.together && !atStart(m) && m.t > 1e-7);
  // How long to watch: until both pass the line, or the time asked about, or
  // a little past the last time they are level, or long enough to see them
  // part when they never are.
  let tMax;
  const tLine = have(k.line) ? Math.max(timeAt(A, k.line) ?? 0, timeAt(B, k.line) ?? 0) : null;
  if (have(k.line)) tMax = tLine;
  else if (have(k.at)) tMax = k.at;
  else if (later.length) tMax = later[later.length - 1].t * 1.2 + 2;
  else tMax = Math.max(A.t0, B.t0) + Math.max(...[A.tau, B.tau].filter(isFinite), 0) + 15;
  if (!isFinite(tMax) || tMax <= 0) tMax = Math.max(A.t0, B.t0) + 20;
  const inRun = (m) => m.t <= tMax * (1 + 1e-9) + 1e-9;
  const shown = [...all.filter((m) => !m.together && atStart(m)).slice(0, 1).map((m) => ({ ...m, t: 0, x: m.x, start: true })),
                 ...later.filter(inRun)].map((m) => ({ ...m, t: snap(m.t), x: snap(m.x) }));
  const after = later.filter((m) => !inRun(m));

  // Who is ahead just after each crossing: that is who has overtaken.
  const lead = (t) => (A.pos(t) > B.pos(t) + 1e-9 ? 'A' : B.pos(t) > A.pos(t) + 1e-9 ? 'B' : null);
  const events = shown.map((m) => {
    // who draws ahead from the start: read once the first has set off, and
    // before they could next be level
    const go = Math.min(A.t0, B.t0), next = later.length ? later[0].t : Infinity;
    const at = m.start ? go + Math.min(1, tMax * 0.05, (next - go) / 2) : m.t + 1e-4;
    const ahead = lead(at), before = m.t > 1e-6 ? lead(m.t - 1e-4) : null;
    const atLine = have(k.line) && Math.abs(m.x - k.line) < 1e-6 * Math.max(1, k.line);
    const atTime = have(k.at) && Math.abs(m.t - k.at) < 1e-6 * Math.max(1, k.at);
    const kind = m.start ? 'start' : atLine ? 'line' : atTime ? 'time' : ahead && before && ahead !== before ? 'overtake' : 'level';
    const first = ahead;
    return { ...m, kind, ahead,
      text: kind === 'start' ? (first ? `They start level, and ${first} draws ahead.` : 'They start level.')
        : m.rest && !m.first ? `They come to rest ${kind === 'line' ? 'at the line' : 'side by side'}, ${M`${d(m.x)} [m]`} from the start, at the same instant: ${M`t = ${d(m.t)} [s]`}.`
        : m.rest ? `${m.first === 'A' ? 'B' : 'A'} comes to rest beside ${m.first} at ${M`t = ${d(m.t)} [s]`}, ${M`${d(m.x)} [m]`} from the start; ${m.first} stopped there earlier, at ${M`t = ${d(m.tFirst)} [s]`}.`
        : kind === 'line' && ahead && before && ahead !== before ? `${ahead} passes ${ahead === 'A' ? 'B' : 'A'} at the line, ${M`${d(m.x)} [m]`} from the start, at ${M`t = ${d(m.t)} [s]`}.`
        : kind === 'line' ? `They are level at the line, ${M`${d(m.x)} [m]`} from the start, at ${M`t = ${d(m.t)} [s]`}.`
        : kind === 'time' ? `They are level at ${M`t = ${d(m.t)} [s]`}, ${M`${d(m.x)} [m]`} from the start.`
        : kind === 'overtake' ? `${ahead} overtakes ${ahead === 'A' ? 'B' : 'A'} at ${M`t = ${d(m.t)} [s]`}, ${M`${d(m.x)} [m]`} from the start.`
          : `They are level at ${M`t = ${d(m.t)} [s]`}, ${M`${d(m.x)} [m]`} from the start.` };
  });

  if (found) {
    notes.push(`${named(found.who, found.what)} is ${M`${found.sym} = ${d(found.value)} ${UNIT_OF[found.what]}`}.`);
  }
  for (const e of events) notes.push(e.text);
  if (!events.filter((e) => e.kind !== 'start').length) {
    const ah = lead(tMax);
    if (after.length) {
      notes.push(`They are not level ${have(k.line) ? 'before the line' : 'by then'}: ${ah} is ahead. They are level later, at ${M`t = ${d(after[0].t)} [s]`}, ${M`${d(after[0].x)} [m]`} from the start.`);
    } else if (ah) notes.push(`They are never level again: ${ah} stays ahead.`);
  }

  // Answers at the line or the time.
  const extras = [];
  if (have(k.line)) {
    const ta = timeAt(A, k.line), tb = timeAt(B, k.line);
    if (ta != null) extras.push({ key: 'tA', label: `A reaches the line at`, value: ta, unit: 's' });
    if (tb != null) extras.push({ key: 'tB', label: `B reaches the line at`, value: tb, unit: 's' });
    if (ta != null && tb != null) {
      const va = A.vel(ta), vb = B.vel(tb);
      // the time a paper asks for is often on the late one's own clock
      for (const [p, tt] of [[A, ta], [B, tb]]) {
        if (p.t0 > EPS) extras.push({ key: `own${p.name}`, label: `${p.name} has been moving for`, value: snap(tt - p.t0), unit: 's' });
      }
      extras.push({ key: 'vA', label: 'A’s speed there', value: snap(va), unit: 'm s⁻¹' });
      extras.push({ key: 'vB', label: 'B’s speed there', value: snap(vb), unit: 'm s⁻¹' });
      extras.push({ key: 'dv', label: 'difference in speeds', value: snap(Math.abs(va - vb)), unit: 'm s⁻¹' });
      if (Math.abs(ta - tb) > 1e-6) notes.push(`${ta < tb ? 'A' : 'B'} reaches ${M`${d(k.line)} [m]`} first, by ${M`${d(Math.abs(ta - tb))} [s]`}.`);
    }
  }

  const f = overtakeMotion(A, B, tMax, events, k.line);
  f.where = k.where === 'rail' ? 'rail' : 'road';
  f.crossings = sameSpeed(A, B, tMax);
  const own = extras.filter((x) => x.key.startsWith('own'));
  const derived = [
    // t_B already says whose it is
    ...(found ? [`${found.what === 'tau' || found.what === 'hold' ? '' : `${found.who}\u2019s `}${M`${found.sym} = ${d(found.value)}`}`] : []),
    ...own.map((x) => `${x.key.slice(3)} has been moving ${M`${d(x.value)} [s]`}`),
    ...events.filter((e) => e.kind !== 'start').map((e) => `${e.kind === 'overtake' ? `${e.ahead} passes` : 'level'} at ${M`t = ${d(e.t)} [s]`}`),
  ];
  if (!derived.length) derived.push(after.length ? `level later, at ${M`t = ${d(after[0].t)} [s]`}` : 'never level after the start');

  // the papers' extremes are a few m s⁻² at most: a figure far beyond any real
  // vehicle is a fact of the numbers given, and is said so, not hidden
  for (const p of [A, B]) {
    if (Math.abs(p.a) > 15 && isFinite(p.tau) && p.tau > EPS) {
      notes.push(`${p.name}\u2019s ${p.a < 0 ? 'deceleration' : 'acceleration'} comes out at ${M`${d(Math.abs(p.a))} [m s^-2]`}, ${p.a < 0 ? 'stopping' : 'changing speed'} in ${M`${d(p.tau)} [s]`} — far beyond any real vehicle (hard braking is about ${M`10 [m s^-2]`}). The model allows it; the numbers are worth a second look.`);
    }
  }
  for (const e of events) e.text = say(e.text);
  for (const x of extras) x.label = say(x.label);
  return {
    ok: true, mode: 'overtake', axis: 'along', A, B, found, rejected, refRows, tLevel, line: have(k.line) ? k.line : null,
    events: events.map((e) => ({ ...e, own: { A: snap(Math.max(0, e.t - A.t0)), B: snap(Math.max(0, e.t - B.t0)) } })),
    later: after.length ? { t: snap(after[0].t), x: snap(after[0].x) } : null, before: have(k.line) ? 'the line' : have(k.at) ? 'then' : null,
    change: [lineRows.A ?? changeRows(spec.A, A), lineRows.B ?? changeRows(spec.B, B)], given: spec,
    lineRows, where: f.where,
    f, extras, notes: notes.map(say), derived: derived.map(say),
    convention: say('Along the road from the start is positive, on one clock.'),
  };
}

/** Each moment after the start that the two are going at the same speed —
    where their speed–time graphs cross. Within a stretch where neither
    changes stage both speeds are linear in t, so each crossing is the root
    of one linear equation; a stretch where they share a speed throughout
    (both at rest, or both steady at one speed) is not a crossing. */
export function sameSpeed(A, B, tMax) {
  const cuts = [...new Set([0, tMax, ...[A, B].flatMap((p) => p.stages.flatMap((st) => [st.t0, st.t1]))])]
    .filter((t) => isFinite(t) && t >= 0 && t <= tMax).sort((p, q) => p - q);
  const out = [];
  const add = (t) => {
    const v = snap(A.vel(t));
    // both reaching rest at once is stopping together, not a crossing
    if (v > 1e-6 && !out.some((c) => Math.abs(c.t - t) < 1e-7)) out.push({ t: snap(t), v });
  };
  for (let i = 0; i < cuts.length - 1; i++) {
    const p = cuts[i], q = cuts[i + 1];
    if (q - p < EPS) continue;
    // from the middle of the stretch, where each is inside one stage
    const mid = (p + q) / 2, dm = A.vel(mid) - B.vel(mid), slope = A.acc(mid) - B.acc(mid);
    if (Math.abs(slope) < EPS) continue;
    const t = mid - dm / slope;
    if (t > p + 1e-9 && t < q - 1e-9) add(t);
    // a corner of one graph exactly on the other, with the lead in speed
    // changing hands there, is a crossing too
    const after = cuts[i + 2];
    if (after != null && Math.abs(A.vel(q) - B.vel(q)) < 1e-9) {
      const m2 = (q + after) / 2;
      if (Math.sign(dm) * Math.sign(A.vel(m2) - B.vel(m2)) < 0) add(q);
    }
  }
  return out.sort((x, y) => x.t - y.t);
}

/* ── the motion, for the transport and the stage ─────────────────────── */
function overtakeMotion(A, B, tMax, events, line) {
  const clampT = (t) => Math.min(Math.max(t, 0), tMax);
  const top = Math.max(A.pos(tMax), B.pos(tMax), line ?? 0, 1);
  return {
    kind: 'overtake', A, B, events, line, tMax, tFlight: tMax, top,
    vMax: Math.max(...[0, tMax / 2, tMax].flatMap((t) => [A.vel(t), B.vel(t)]), A.u, B.u, A.V ?? 0, B.V ?? 0, 1),
    params: { u: A.u, a: A.a, s: top, v: 0, t: tMax, g: 0, h: 0, theta: 0 },
    pos: (t) => ({ x: A.pos(clampT(t)), y: 0 }),
    vel: (t) => ({ x: A.vel(clampT(t)), y: 0 }),
    speed: (t) => Math.abs(A.vel(clampT(t))),
    accel: (t) => A.acc(clampT(t)),
    at: (t) => ({ A: A.state(clampT(t)), B: B.state(clampT(t)) }),
    gap: (t) => snap(B.pos(clampT(t)) - A.pos(clampT(t))),
    // each one's distance so far: the area under its speed–time graph
    dist: (t) => ({ A: snap(A.pos(clampT(t)) - A.x0), B: snap(B.pos(clampT(t)) - B.x0) }),
    bounces: 0, segments: [], horiz: null,
    kineticEnergy: () => 0, momentum: () => 0,
    path(n = 200, tEnd = tMax) {
      const out = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; out.push({ t, x: A.pos(t), y: 0 }); }
      return out;
    },
  };
}

/* ── the working ──────────────────────────────────────────────────────── */
export function overtakeWorking(solved) {
  if (!solved?.ok) return [];
  if (solved.where === 'rail') {
    return working(solved).map((st) => ({ ...st, title: railWords(st.title), note: railWords(st.note) }));
  }
  return working(solved);
}

function working(solved) {
  const { A, B, events, found, refRows, tLevel, rejected, line, extras, change } = solved;
  const out = [];
  // the one whose number is found has its other figures worked after it
  const first = found ? change[found.who === 'A' ? 1 : 0] : change.flat();
  const then = found ? change[found.who === 'A' ? 0 : 1] : [];
  const late = (n) => (n === 'A' ? A : B).t0 > EPS;
  // finding how long it holds its speed, its change of speed is known first
  // and is used in the equation, so it is worked before it, not after
  const thenFirst = found && found.what === 'hold' && !(found.who === 'A' ? A : B).ends;
  // one that comes to rest at the line: the line fixes its change of speed
  const area = (p) => `${p.name} ${p.hold > EPS ? `holds ${M`${d(p.u)} [m s^-1]`} for ${found && found.who === p.name ? M`T_${p.name}` : M`T_${p.name} = ${d(p.hold)} [s]`}, then ` : ''}${p.V < EPS ? 'slows to rest' : `changes to ${M`${d(p.V)} [m s^-1]`}`} at the line: the area under its speed–time graph — ${p.hold > EPS ? 'a rectangle, then ' : ''}${p.V < EPS || Math.abs(p.u) < EPS ? 'a triangle' : 'a trapezium'} — is the ${M`${d(line - p.x0)} [m]`} to the line.`;
  const ruled = (p) => solved.lineRows?.[p.name] && !(found && found.who === p.name);
  if (first.length) {
    const ps = found ? [found.who === 'A' ? B : A] : [A, B];
    const ln = ps.filter(ruled);
    out.push({ title: found ? `${ps[0].name}\u2019s change of speed` : 'Each one\u2019s change of speed', rows: first,
      note: [ln.map(area).join(' '), ln.length < ps.length && ps.some((p) => !ruled(p) && changeRows(solved.given[p.name], p).length)
        ? 'Of a rate, the speed it changes to and how long that takes, any two give the third.' : ''].filter(Boolean).join(' ') });
  }
  if (found) {
    const other = found.who === 'A' ? 'B' : 'A';
    out.push({ title: line != null ? `When ${other} reaches the line` : `Where ${other} is then`, rows: refRows,
      note: line != null ? `They are level at the line, so ${found.who} must reach it at the same time: ${M`t = ${d(tLevel)} [s]`}.` : '' });
    if (then.length && thenFirst) out.push({ title: `${found.who}\u2019s change of speed`, rows: then });
    out.push({ title: `${named(found.who, found.what)}, from that`, rows: found.rows,
      note: [
        (found.who === 'A' ? A : B).ends ? `${area(found.who === 'A' ? A : B)} ${(found.who === 'A' ? A : B).V < EPS ? 'It stops there at the same instant' : `It gets there at the same instant as ${found.who === 'A' ? 'B' : 'A'}`}, so it takes the same time${late(found.who) ? `, ${M`t`} on its own clock` : ''}.`
          : found.what === 'hold' ? `${found.who} holds its first speed for ${M`T_${found.who}`} seconds and then changes speed: the area under its speed–time graph — a rectangle, then a triangle or trapezium${(found.who === 'A' ? A : B).forever ? '' : ', then a rectangle again'} — is the distance.`
          : found.what !== 'a' ? `${found.who} changes speed for ${M`t_${found.who}`} seconds and then holds its speed: the area under its speed–time graph — a triangle or trapezium while it changes speed, then a rectangle — is the distance.` : '',
        ...rejected.map((c) => `${M`${found.sym} = ${d(c.value)}`} ${c.why}, so it is rejected.`),
      ].filter(Boolean).join(' ') });
    if (then.length && !thenFirst) out.push({ title: `And so ${found.who}\u2019s change of speed`, rows: then });
  }
  // Each crossing after the start: both positions as polynomials in t in the
  // stages they are in, set equal.
  for (const e of events.filter((x) => x.kind !== 'start' && !(found && (x.kind === 'line' || x.kind === 'time')))) {
    // two that come to rest together: each one's time to stop, the same
    if (e.rest) {
      const rows = [A, B].map((p) => {
        const parts = [p.t0 > EPS ? ['t_0', d(p.t0)] : null, p.hold > EPS ? [`T_${p.name}`, d(p.hold)] : null, [`t_${p.name}`, d(p.tau)]].filter(Boolean);
        return { f: M`${parts.map((x) => x[0]).join(' + ')}`, s: parts.length > 1 ? M`${parts.map((x) => x[1]).join(' + ')}` : '', r: M`${d(snap(p.t0 + p.hold + p.tau))} [s]` };
      });
      out.push({ title: e.first ? 'Each comes to rest at the line' : 'They come to rest together', rows, note: `Each stops when its change of speed ends. ${e.text}` });
      continue;
    }
    const form = (p) => {
      const st = p.stageAt(e.t);
      if (!st || st.kind === 'waiting') return [p.x0, 0, 0];
      // x = x0 + u(t − ts) + ½a(t − ts)², multiplied out
      return [st.x0 - st.u * st.t0 + 0.5 * st.a * st.t0 * st.t0, st.u - st.a * st.t0, 0.5 * st.a].map(snap);
    };
    const cA = form(A), cB = form(B);
    let dc = cA.map((c, i) => snap(c - cB[i]));
    const lin = Math.abs(dc[2]) < EPS;
    if ((lin ? dc[1] : dc[2]) < 0) dc = dc.map((c) => -c);
    const rows = [
      { f: M`s_A`, s: '', r: M`s_A = ${poly(cA, 4)}` },
      { f: M`s_B`, s: '', r: M`s_B = ${poly(cB, 4)}` },
      { f: M`s_A = s_B`, s: M`${poly(cA, 4)} = ${poly(cB, 4)}`, r: M`${poly(dc, 4, { desc: true })} = 0` },
      { f: '', s: '', r: M`t = ${d(e.t)} [s]` },
    ];
    out.push({ title: e.kind === 'overtake' ? `${e.ahead} overtakes` : 'They are level',
      rows, note: `Each position written for the stage it is in at that moment, multiplied out in ${M`t`}, the one clock. ${e.text}` });
  }
  // the times and speeds at the line the papers ask for, worked
  const ex = (key) => extras.find((x) => x.key === key)?.value;
  const rows = [];
  for (const p of [A, B]) {
    const own = ex(`own${p.name}`), tl = ex(`t${p.name}`);
    if (own != null) rows.push({ f: M`t - t_0`, s: M`${d(tl)} - ${d(p.t0)}`, r: M`${d(own)} [s]` });
  }
  // two at rest there have no difference in speed worth a row
  const stopped = ex('vA') < EPS && ex('vB') < EPS;
  if (ex('dv') != null && !stopped) {
    const va = ex('vA'), vb = ex('vB');
    rows.push({ f: M`abs(v_A - v_B)`, s: M`abs(${d(va)} - ${d(vb)})`, r: M`${d(ex('dv'))} [m s^-1]` });
  }
  if (rows.length) {
    out.push({ title: 'At the line', rows,
      note: `${rows.length > 1 || ex('dv') == null ? 'The time on a late starter\u2019s own clock is the one papers ask for. ' : ''}`
        + (ex('dv') != null && !stopped ? `Their speeds there are ${M`${d(ex('vA'))}`} and ${M`${d(ex('vB'))} [m s^-1]`}.` : '') });
  }
  return out;
}
