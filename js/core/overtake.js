// overtake.js — two on one straight road: when is one level with the other?
//
// The exam family: a car and a motorbike leave the lights ten seconds apart;
// a car slowing down is overtaken by a lorry going steadily; two children
// race and cross the line together. Each of the two does the same simple
// thing — starts at some speed, changes speed at a constant rate until it
// reaches a speed it then holds — and the question is the moment they are
// level, or, run the other way, the one number (a rate, a top speed, a time
// spent speeding up) that makes them level at a given line or a given time.
//
// Each is a motion in stages (js/core/stages.js): waiting where it starts
// until its own start time, changing speed, then steady. When they are level
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
import { M, num } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const sgn = (x) => (x < 0 ? `(${d(x)})` : d(x));
const NAMES = ['A', 'B'];
export const FINDABLE = { a: 'acceleration', V: 'final speed', tau: 'time spent changing speed' };
/** The hidden number, said as a noun phrase about whose it is: "B's final speed V". */
export const named = (who, what) => `${who}\u2019s ${FINDABLE[what]}`;
const UNIT_OF = { a: '[m s^-2]', V: '[m s^-1]', tau: '[s]' };

/* ── one of the two ───────────────────────────────────────────────────── */
/**
 * @param q { t0, x0, u, a, V, tau } — any two of a, V, tau fix the change of
 *          speed; a alone means it keeps accelerating; none means steady at u.
 */
export function mover(q, name) {
  const t0 = have(q.t0) ? q.t0 : 0, x0 = have(q.x0) ? q.x0 : 0, u = have(q.u) ? q.u : 0;
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
  if (tau > EPS) stages.push({ t0, t1: t0 + tau, x0, u, a, kind: 'changing' });
  if (isFinite(tau)) {
    const xs = x0 + u * tau + 0.5 * a * tau * tau;
    stages.push({ t0: t0 + tau, t1: Infinity, x0: xs, u: V, a: 0, kind: 'steady' });
  }
  const m = staged(stages.length ? stages : [{ t0, t1: Infinity, x0, u, a: 0, kind: 'steady' }]);
  return { ...m, name, t0, x0, u, a, V: forever ? null : V, tau, forever };
}

/** When a mover reaches a place: the first t at which its position is X. */
export function timeAt(p, X) {
  for (const st of p.stages) {
    const s = X - st.x0;
    let roots;
    if (Math.abs(st.a) < EPS) roots = Math.abs(st.u) > EPS ? [s / st.u] : (Math.abs(s) < EPS ? [0] : []);
    else roots = quadRoots(0.5 * st.a, st.u, -s);
    const len = st.t1 - st.t0;
    const ok = roots.filter((r) => r >= -1e-9 && r <= len + 1e-9).sort((x, y) => x - y);
    if (ok.length) return snap(st.t0 + Math.max(0, ok[0]));
  }
  return null;
}

/* ── the working for one mover: where it is at a time, or when it reaches a place ── */
function reachRows(p, X) {
  const n = p.name, t = timeAt(p, X);
  const rows = [];
  const late = p.t0 > EPS;
  const ch = p.stages.find((st) => st.kind === 'changing');
  if (ch && t <= ch.t1 + 1e-9) {
    // still changing speed when it gets there: s = ut + ½at²
    const T = late ? `(t - ${d(p.t0)})` : 't';
    rows.push({ f: M`s = ut + ½at^2`, s: M`${d(X - p.x0)} = ${Math.abs(p.u) > EPS ? `${sgn(p.u)}${T} + ` : ''}½ * ${sgn(p.a)}${T}^2`, r: M`t = ${d(t)} [s]` });
  } else if (ch) {
    const sCh = ch.u * (ch.t1 - ch.t0) + 0.5 * ch.a * (ch.t1 - ch.t0) ** 2;
    const z = Math.abs(p.u) < EPS;
    // (its time changing speed is in the step before, with the rest of its figures)
    rows.push({ f: M`s = ½(u + V)t_${n}`, s: z ? M`½ * ${d(p.V)} * ${d(p.tau)}` : M`½(${d(p.u)} + ${d(p.V)}) * ${d(p.tau)}`, r: M`s = ${d(sCh)} [m]` });
    rows.push({ f: M`t = ${late ? `${d(p.t0)} + ` : ''}t_${n} + (${d(X - p.x0)} - s)/V`,
                s: M`${late ? `${d(p.t0)} + ` : ''}${d(p.tau)} + (${d(X - p.x0)} - ${d(sCh)})/${d(p.V)}`, r: M`t = ${d(t)} [s]` });
  } else {
    rows.push({ f: M`t = ${late ? `${d(p.t0)} + ` : ''}s/u`, s: M`${late ? `${d(p.t0)} + ` : ''}${d(X - p.x0)}/${d(p.u)}`, r: M`t = ${d(t)} [s]` });
  }
  return { t, rows };
}

/** Where a mover is at a time, worked: the twin of reachRows. */
function placeRows(p, t) {
  const n = p.name, x = snap(p.pos(t)), te = t - p.t0;
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
 * Two on one road.
 * @param k { A: {t0,x0,u,a,V,tau}, B: {...}, line, at, find: 'B.V' | 'A.a' | ... }
 *   line — a place along the road (the finish, the point where one passes the
 *          other); at — a time. With `find`, the unknown makes them level at
 *          the line (or at the time).
 */
export function solveOvertake(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const find = k.find ? { who: k.find.split('.')[0], what: k.find.split('.')[1] } : null;
  for (const n of NAMES) {
    const q = k[n] || {};
    for (const key of ['t0', 'tau']) if (have(q[key]) && q[key] < 0) return fail(`${n}’s times cannot be negative.`);
    if (have(q.u) && q.u < 0 || have(q.V) && q.V < 0) return fail('Speeds along the road are sizes: give them as positive numbers.');
    const n3 = ['a', 'V', 'tau'].filter((x) => have(q[x]) && !(find && find.who === n && find.what === x)).length;
    if (n3 > 2) return fail(`${n} has an acceleration, a speed to reach and a time to reach it — two of those fix the third. Clear one.`);
  }
  for (const n of NAMES) {
    const q = { ...(k[n] || {}) };
    if (find && find.who === n) delete q[find.what];
    const wrong = whatsWrong(q, n);
    if (wrong && !(find && find.who === n)) return fail(wrong);
    if (!['u', 'a', 'V', 'tau'].some((x) => have(q[x])) && !(find && find.who === n)) {
      return fail(`Still needed: how ${n} moves — its speed, or its acceleration.`);
    }
  }
  if (find) {
    if (!have(k.line) && !have(k.at)) return fail('To find an unknown, say where they are level (a line along the road) or when.');
    const q = k[find.who] || {};
    const others = ['a', 'V', 'tau'].filter((x) => x !== find.what && have(q[x]));
    // an acceleration can be found with nothing else given — it keeps
    // accelerating — but a top speed or a time needs one of the other two
    if (others.length > 1 || (others.length === 0 && find.what !== 'a')) {
      return fail(`To find ${named(find.who, find.what)}, give exactly one of the other two of its acceleration, final speed and time for ${find.who}.`);
    }
  }

  const notes = [];
  let found = null, rejected = [], findRows = [], refRows = [], tLevel = null;
  const spec = { A: { ...(k.A || {}) }, B: { ...(k.B || {}) } };

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
    const q = spec[who], t0 = have(q.t0) ? q.t0 : 0, x0 = have(q.x0) ? q.x0 : 0, u = have(q.u) ? q.u : 0;
    const te = tt - t0, S = X - x0;
    if (!(te > EPS)) return fail(`${who} has not set off by then, so nothing about it can make them level.`);
    const cands = [];                 // { value, rows, why? }
    const sym = find.what === 'tau' ? `t_${who}` : find.what === 'V' ? 'V' : 'a';
    const T = `${d(te)}`;
    if (find.what === 'a') {
      if (have(q.V)) {
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
        const a = 2 * (S - u * te) / (te * te);          // keeps accelerating
        cands.push({ value: snap(a), rows: [{ f: M`s = ut + ½at^2`, s: M`${d(S)} = ${Math.abs(u) > EPS ? `${d(u)} * ${T} + ` : ''}½a * ${T}^2`, r: M`a = ${d(a)} [m s^-2]` }], check: () => true });
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
          const why = tau > te + 1e-9 ? (inTau ? `is longer than the ${M`${T} [s]`} there is` : `would take ${M`${d(tau)} [s]`} to reach, longer than the ${M`${T} [s]`} there is`)
            : tau < -1e-9 ? (inTau ? 'is negative' : 'would need it to slow down to reach, against its acceleration') : '';
          cands.push({ value, Vr: r, rows: [], check: () => tau >= -1e-9 && tau <= te + 1e-9, why });
        }
        // the area, as the mark schemes write it: the triangle (or trapezium)
        // while it changes speed, and the rectangle after
        // V written in the unknown: t_B itself when a = 1 from rest, as the papers have it
        const Vraw = inTau ? `${Math.abs(u) > EPS ? `${d(u)} + ` : ''}${Math.abs(a - 1) > EPS ? d(a) : ''}${ts}` : 'V';
        const Vt = /[+-]/.test(Vraw) ? `(${Vraw})` : Vraw;
        // slowing down, (V − u)/a is written (u − V)/|a|, as by hand
        const tauS = inTau ? ts : a < 0 ? (Math.abs(a + 1) < EPS ? `${d(u)} - V` : `(${d(u)} - V)/${d(-a)}`)
          : (Math.abs(u) > EPS ? `(V - ${d(u)})/${d(a)}` : Math.abs(a - 1) > EPS ? `V/${d(a)}` : 'V');
        const tauB = /[+/-]/.test(tauS) && !inTau ? `(${tauS})` : tauS;
        const half = Math.abs(u) > EPS ? `½(${d(u)} + ${Vraw})` : /^\d/.test(Vraw) ? `½ * ${Vraw}` : `½${Vt}`;
        findRows = [
          { f: inTau ? M`s = ½(u + V)${ts} + V(t - ${ts})` : M`s = ½(u + V)${ts} + V(t - ${ts})`,
            s: M`${d(S)} = ${half} * ${tauB} + ${Vt}(${T} - ${tauS})`,
            r: M`${poly([c0, c1, c2], 4, { desc: true, sym: inTau ? ts : 'V' })} = 0` },
          { f: M`${inTau ? ts : 'V'} = (-b +- sqrt(b^2 - 4ac))/(2a)`, s: M`(${d(-c1)} +- sqrt(${sgn(c1)}^2 - 4 * ${sgn(c0)}))/2`,
            r: roots.length > 1 ? M`${inTau ? ts : 'V'} = ${d(roots[0])} "or" ${d(roots[1])}` : roots.length ? M`${inTau ? ts : 'V'} = ${d(roots[0])}` : M`"no real root"` },
        ];
      } else if (have(q.V) && find.what === 'tau') {
        const tau = 2 * (q.V * te - S) / (q.V - u);
        cands.push({ value: snap(tau), rows: [{ f: M`s = Vt - ½(V - u)t_${who}`, s: M`${d(S)} = ${d(q.V)} * ${T} - ½(${d(q.V)} - ${d(u)})t_${who}`, r: M`t_${who} = ${d(tau)} [s]` }],
          check: (v) => v >= -1e-9 && v <= te + 1e-9 });
      } else if (have(q.tau) && find.what === 'V') {
        const tau = q.tau;
        const Vv = (S - 0.5 * u * tau) / (te - 0.5 * tau);
        cands.push({ value: snap(Vv), rows: [{ f: M`s = ½(u + V)t_${who} + V(t - t_${who})`, s: M`${d(S)} = ½(${d(u)} + V) * ${d(tau)} + V(${T} - ${d(tau)})`, r: M`V = ${d(Vv)} [m s^-1]` }],
          check: (v) => v >= 0 && tau <= te + 1e-9 });
      } else return fail(`To find ${named(who, find.what)}, give its acceleration or its other figure.`);
    }
    const good = cands.filter((c) => isFinite(c.value) && c.check(c.value) && (find.what !== 'a' || true));
    rejected = cands.filter((c) => !good.includes(c) && isFinite(c.value) && (c.why || c.Vr != null));
    if (!good.length) {
      return fail(`No ${FINDABLE[find.what]} makes ${who} level with ${other} there`
        + (rejected.length ? `: ${rejected.map((c) => `${M`${sym} = ${d(c.value)}`} ${c.why}`).join('; ')}.` : '.'));
    }
    const pick = good.sort((x, y) => Math.abs(x.value) - Math.abs(y.value))[0];
    found = { who, what: find.what, sym, value: pick.value, rows: pick.rows.length ? pick.rows : findRows };
    spec[who] = { ...q, [find.what]: pick.value };
    const wrong = whatsWrong(spec[who], who);
    if (wrong) return fail(`That ${FINDABLE[find.what]} does not work: ${wrong}`);
  }

  const A = mover(spec.A, 'A'), B = mover(spec.B, 'B');
  for (const p of [A, B]) {
    if (Math.abs(p.u) < EPS && Math.abs(p.a) < EPS && !(p.V > EPS)) return fail(`${p.name} never moves: give it a speed or an acceleration.`);
    if ((p.V ?? 1) < -1e-9 || (p.forever && p.a < 0)) return fail(`${p.name} would slow to a stop and go backwards: give it a speed to slow to, and the road ahead does the rest.`);
  }

  // When they are level, looked for well beyond what is shown, so that
  // "never level again" is a fact and not the edge of the search.
  const all = meetings(A, B, { from: 0, to: 1e4 });
  if (all.some((m) => m.together && m.until - m.t > 1e-6 && m.t >= Math.max(A.t0, B.t0) - 1e-9)) {
    return fail('Those are the same motion twice: they set off together and never part.');
  }
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
    const probe = m.start ? Math.min(1, tMax * 0.05) : 1e-4;
    const ahead = lead(m.t + probe), before = m.t > 1e-6 ? lead(m.t - 1e-4) : null;
    const atLine = have(k.line) && Math.abs(m.x - k.line) < 1e-6 * Math.max(1, k.line);
    const atTime = have(k.at) && Math.abs(m.t - k.at) < 1e-6 * Math.max(1, k.at);
    const kind = m.start ? 'start' : atLine ? 'line' : atTime ? 'time' : ahead && before && ahead !== before ? 'overtake' : 'level';
    const first = ahead;
    return { ...m, kind, ahead,
      text: kind === 'start' ? (first ? `They start level, and ${first} draws ahead.` : 'They start level.')
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
  const own = extras.filter((x) => x.key.startsWith('own'));
  const derived = [
    ...(found ? [`${found.who}\u2019s ${M`${found.sym} = ${d(found.value)}`}`] : []),
    ...own.map((x) => `${x.key.slice(3)} has been moving ${M`${d(x.value)} [s]`}`),
    ...events.filter((e) => e.kind !== 'start').map((e) => `${e.kind === 'overtake' ? `${e.ahead} passes` : 'level'} at ${M`t = ${d(e.t)} [s]`}`),
  ];
  if (!derived.length) derived.push(after.length ? `level later, at ${M`t = ${d(after[0].t)} [s]`}` : 'never level after the start');

  return {
    ok: true, mode: 'overtake', axis: 'along', A, B, found, rejected, refRows, tLevel, line: have(k.line) ? k.line : null,
    events: events.map((e) => ({ ...e, own: { A: snap(Math.max(0, e.t - A.t0)), B: snap(Math.max(0, e.t - B.t0)) } })),
    later: after.length ? { t: snap(after[0].t), x: snap(after[0].x) } : null, before: have(k.line) ? 'the line' : have(k.at) ? 'then' : null,
    change: [changeRows(spec.A, A), changeRows(spec.B, B)], given: spec,
    f, extras, notes, derived,
    convention: 'Along the road from the start is positive, on one clock.',
  };
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
  const { A, B, events, found, refRows, tLevel, rejected, line, extras, change } = solved;
  const out = [];
  // the one whose number is found has its other figures worked after it
  const first = found ? change[found.who === 'A' ? 1 : 0] : change.flat();
  const then = found ? change[found.who === 'A' ? 0 : 1] : [];
  if (first.length) {
    out.push({ title: found ? `${found.who === 'A' ? 'B' : 'A'}\u2019s change of speed` : 'Each one\u2019s change of speed', rows: first,
      note: 'Of a rate, the speed it changes to and how long that takes, any two give the third.' });
  }
  if (found) {
    const other = found.who === 'A' ? 'B' : 'A';
    out.push({ title: line != null ? `When ${other} reaches the line` : `Where ${other} is then`, rows: refRows,
      note: line != null ? `They are level at the line, so ${found.who} must reach it at the same time: ${M`t = ${d(tLevel)} [s]`}.` : '' });
    out.push({ title: `${named(found.who, found.what)}, from that`, rows: found.rows,
      note: [
        found.what !== 'a' ? `${found.who} changes speed for ${M`t_${found.who}`} seconds and then holds its speed: the area under its speed–time graph — a triangle or trapezium while it changes speed, then a rectangle — is the distance.` : '',
        ...rejected.map((c) => `${M`${found.sym} = ${d(c.value)}`} ${c.why}, so it is rejected.`),
      ].filter(Boolean).join(' ') });
    if (then.length) out.push({ title: `And so ${found.who}\u2019s change of speed`, rows: then });
  }
  // Each crossing after the start: both positions as polynomials in t in the
  // stages they are in, set equal.
  for (const e of events.filter((x) => x.kind !== 'start' && !(found && (x.kind === 'line' || x.kind === 'time')))) {
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
  if (ex('dv') != null) {
    const va = ex('vA'), vb = ex('vB');
    rows.push({ f: M`abs(v_A - v_B)`, s: M`abs(${d(va)} - ${d(vb)})`, r: M`${d(ex('dv'))} [m s^-1]` });
  }
  if (rows.length) {
    out.push({ title: 'At the line', rows,
      note: `${rows.length > 1 || ex('dv') == null ? 'The time on a late starter\u2019s own clock is the one papers ask for. ' : ''}`
        + (ex('dv') != null ? `Their speeds there are ${M`${d(ex('vA'))}`} and ${M`${d(ex('vB'))} [m s^-1]`}.` : '') });
  }
  return out;
}
