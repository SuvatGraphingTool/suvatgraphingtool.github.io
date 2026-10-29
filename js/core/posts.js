// posts.js — one constant acceleration past a row of posts: a car passes P,
// then Q, then R, the distance and the time between each pair given, its
// speed at P and its acceleration hidden. Two stretches give two equations in
// u and a; a third, if given, is checked against them.
//
// NO NEW PHYSICS. Every equation is s = ut + ½at², from P to each later post
// (the way the mark schemes write it: from the start, so each one is in u and
// a alone); the pair is solved by elimination, then each post's speed is
// v = u + at. The motion is the stage-by-stage road's (js/core/chain.js
// shape), so its stage draws it.
//
// CONVENTION. Metres and seconds; forwards positive; t from passing P.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const NAMES = ['P', 'Q', 'R', 'S'];
const sgn = (x) => (x < 0 ? `- ${d(-x)}` : `+ ${d(x)}`);
// a coefficient of a: 2a, a, −a; more figures where a rounded one would not multiply out
const ca = (x, p) => (Math.abs(Math.abs(x) - 1) < 1e-12 ? (x < 0 ? '- a' : '+ a') : `${sgn(snap(x)).replace(/[\d.]+$/, (m) => d(Math.abs(snap(x)), p))}a`);

/**
 * @param k { gaps: [{ s, t }], u, a, look }
 *   gaps  the stretches P to Q, Q to R, R to S: each its distance and time
 *   u, a  the speed at P and the acceleration, when the paper gives either
 */
export function solvePosts(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const all = (k.gaps || []).map((g) => g && (have(g.s) || have(g.t)));
  const last = all.lastIndexOf(true);
  if (all.slice(0, last + 1).some((x) => !x)) return fail('Fill the stretches in order, P to Q first: a stretch left blank before a later one leaves the posts after it unplaced.');
  const gaps = (k.gaps || []).slice(0, last + 1);
  if (gaps.some((g) => !have(g.s) || !have(g.t))) return fail('Give each stretch both its distance and its time.');
  if (gaps.some((g) => !(g.t > 0))) return fail('Each stretch takes a positive time.');
  const n = gaps.length, gu = have(k.u), ga = have(k.a);
  const need = 2 - (gu ? 1 : 0) - (ga ? 1 : 0);
  if (n < need) return fail(`Still needed: ${need - n === 2 ? 'two stretches' : 'another stretch'} — each with its distance and time — to find ${gu ? 'the acceleration' : ga ? 'the speed at P' : 'the speed at P and the acceleration'}.`);
  if (!n) return fail('Still needed: the stretches between the posts.');

  // from P to each post: S_k = u T_k + ½ a T_k²
  let T = 0, S = 0;
  const cum = gaps.map((g) => { T += g.t; S += g.s; return { T: snap(T), S: snap(S) }; });
  const eqRow = (c, j) => ({ f: M`s = ut + ½at^2`, s: M`${d(c.S)} = ${d(c.T)}u + ½a(${d(c.T)})^2`, r: M`${d(c.S)} = ${d(c.T)}u + ${d(snap(c.T * c.T / 2))}a` , post: NAMES[j + 1] });
  const rows = [];
  let u, a;
  if (gu && ga) { u = k.u; a = k.a; }
  else if (gu) { u = k.u; const c = cum[0]; a = snap(2 * (c.S - u * c.T) / (c.T * c.T)); rows.push(eqRow(c, 0)); rows.push({ f: M`a = (2(s - ut))/t^2`, s: M`(2(${d(c.S)} - ${d(u)} * ${d(c.T)}))/${d(c.T)}^2`, r: M`a = ${d(a)} [m s^-2]` }); }
  else if (ga) { a = k.a; const c = cum[0]; u = snap((c.S - 0.5 * a * c.T * c.T) / c.T); rows.push(eqRow(c, 0)); rows.push({ f: M`u = (s - ½at^2)/t`, s: M`(${d(c.S)} - ½ * ${d(a)} * ${d(c.T)}^2)/${d(c.T)}`, r: M`u = ${d(u)} [m s^-1]` }); }
  else {
    const [c1, c2] = cum;
    const A1 = c1.T, B1 = c1.T * c1.T / 2, A2 = c2.T, B2 = c2.T * c2.T / 2;
    const det = A1 * B2 - A2 * B1;
    if (Math.abs(det) < 1e-12) return fail('Those two stretches do not fix u and a separately.');
    a = snap((A1 * c2.S - A2 * c1.S) / det);
    u = snap((c1.S - B1 * a) / A1);
    rows.push(eqRow(c1, 0), eqRow(c2, 1));
    // eliminate u: the first equation for u, into the second
    const p = snap(c1.S / A1), q = snap(B1 / A1);
    const P6 = (x) => d(snap(x), 6);
    rows.push({ f: M`"from the first"`, s: M`u = ${P6(p)} ${ca(-q, 6)}`, r: '' });
    rows.push({ f: M`"into the second"`, s: M`${d(c2.S)} = ${d(A2)}(${P6(p)} ${ca(-q, 6)}) + ${d(snap(B2))}a`, r: M`a = ${P6(a)} [m s^-2]` });
    rows.push({ f: M`u = ${P6(p)} ${ca(-q, 6)}`, s: M`${P6(p)} ${sgn(-q).replace(/[\d.]+$/, (m) => P6(Math.abs(q)))} * ${a < 0 ? `(${P6(a)})` : P6(a)}`, r: M`u = ${P6(u)} [m s^-1]` });
  }
  if (u < -1e-9) return fail(`Those stretches need it moving backwards at P (${M`u = ${d(u)} [m s^-1]`}): the posts are passed going forwards.`);
  if (gu && ga) rows.push(...cum.map((c, j) => ({ f: M`s = ut + ½at^2`, s: M`${d(u)} * ${d(c.T)} + ½ * ${a < 0 ? `(${d(a)})` : d(a)} * ${d(c.T)}^2`, r: M`${d(snap(u * c.T + 0.5 * a * c.T * c.T))} [m]` })));
  // a further stretch must agree
  for (let j = 0; j < n; j++) {
    const c = cum[j], want = u * c.T + 0.5 * a * c.T * c.T;
    if (Math.abs(want - c.S) > 1e-6 * Math.max(1, Math.abs(c.S))) return fail(`One acceleration does not fit every stretch: with ${M`u = ${d(u)}`} and ${M`a = ${d(a)}`}, ${NAMES[j + 1]} would be ${M`${d(snap(want))} [m]`} from P, not ${M`${d(c.S)} [m]`}.`);
  }
  // the speed at each post
  const speedRows = [{ f: M`v = u + at`, s: M`v_P = ${d(u)}`, r: M`v_P = ${d(u)} [m s^-1]` }];
  const vs = [u];
  cum.forEach((c, j) => { const v = snap(u + a * c.T); vs.push(v); speedRows.push({ f: M`v = u + at`, s: M`${d(u)} ${sgn(a)} * ${d(c.T)}`, r: M`v_${NAMES[j + 1]} = ${d(v)} [m s^-1]` }); });
  if (vs.some((v) => v < -1e-9)) return fail('With that acceleration it would stop and turn back before the last post: the posts are passed going forwards.');

  // the motion, in the stage-by-stage road's shape: each stretch one stage
  let t0 = 0, x0 = 0;
  const St = gaps.map((g, j) => { const o = { i: j + 1, name: NAMES[j], end: NAMES[j + 1], s: g.s, t: g.t, u: vs[j], v: vs[j + 1], a, t0, x0, t1: t0 + g.t, x1: x0 + g.s,
    does: Math.abs(a) < 1e-12 ? 'steady' : a > 0 ? 'speeding up' : 'slowing down', xTurn: null }; t0 += g.t; x0 += g.s; return o; });
  const at = (t) => St.find((x) => t <= x.t1 + 1e-12) || St[St.length - 1];
  const pos = (t) => u * t + 0.5 * a * t * t, vel = (t) => u + a * t;
  const f = { kind: 'chain', look: k.look || 'car', S: St, tMax: t0, D: x0, pos, vel, acc: () => a, names: NAMES.slice(0, n + 1), at };
  const notes = [`One constant acceleration all the way: ${M`a = ${d(a)} [m s^-2]`}, and it passes P at ${M`${d(u)} [m s^-1]`}.`, `Its speed at each post: ${vs.map((v, j) => `${NAMES[j]} ${M`${d(v)} [m s^-1]`}`).join(', ')}.`];
  const derived = [`${M`u = ${d(u)} [m s^-1]`}`, `${M`a = ${d(a)} [m s^-2]`}`];
  return { ok: true, mode: 'posts', u, a, vs, St, rows, speedRows, notes, derived, f, given: { u: gu, a: ga } };
}

/** The working: each post's equation from P, the pair solved, each post's speed. */
export function postsWorking(s) {
  if (!s?.ok) return [];
  const out = [];
  if (s.rows.length) out.push({ title: s.given.u && s.given.a ? 'Each post, checked against the speed and acceleration given' : 'From P to each post, one acceleration', rows: s.rows,
    note: 'Measured from P, every equation has the same u and a: two of them are a pair of simultaneous equations.' });
  out.push({ title: 'Its speed at each post', rows: s.speedRows, note: 'Timed from P.' });
  return out;
}
