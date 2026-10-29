// collide.js — two particles on a horizontal surface, each with its own
// constant acceleration vector in i and j: where each is at a given time, and
// whether they collide — at the same place at the same moment — and where.
//
// NO NEW PHYSICS. Each particle is the library's own constant-acceleration
// motion in a plane (js/core/plane.js `planeMotion`): r = r₀ + ut + ½at². To
// collide, the i parts must be equal and the j parts must be equal AT THE SAME
// t. Each is a quadratic in t (js/core/stages.js `quadRoots`); the paper's way
// is to solve one and check the other at its roots, which is the working here.
//
// CONVENTION. Metres and seconds; i and j at right angles on the surface.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { planeMotion, vsrc } from './plane.js';
import { quadRoots } from './stages.js';
import { poly } from './pair.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const EPS = 1e-6;
const vec = (o) => ({ x: o?.x ?? 0, y: o?.y ?? 0 });
// a vector as a bracket when it has two terms: (4i + 2j), 0.2j
const vb = (v) => { const s = vsrc(v); return / /.test(s) || s.startsWith('-') ? `(${s})` : s; };

/** r = r₀ + ut + ½at² for one particle, as notation source in t, i and j. */
function rOf(p) {
  const part = (k) => [p.r0[k], p.u[k], p.a[k] / 2];
  const term = (c, e) => {
    const s = poly(c);
    if (s === '0') return null;
    const one = !/[+\-] /.test(s.replace(/^-/, ''));
    return { neg: one && s.startsWith('-'), body: one ? `${s.replace(/^-/, '')} vec(${e})` : `(${s})vec(${e})` };
  };
  const ts = [term(part('x'), 'i'), term(part('y'), 'j')].filter(Boolean);
  if (!ts.length) return '0';
  return ts.map((x, i) => (i === 0 ? `${x.neg ? '-' : ''}${x.body}` : `${x.neg ? '-' : '+'} ${x.body}`)).join(' ');
}

/**
 * @param k { A: { r0, u, a }, B: { r0, u, a }, at }
 *   each vector { x, y } in i and j; a blank part is 0
 *   at   a time to give each one's position at
 */
export function solveCollide(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const P = {};
  for (const n of ['A', 'B']) {
    const q = k[n] || {};
    const given = ['r0', 'u', 'a'].some((key) => have(q[key]?.x) || have(q[key]?.y));
    if (!given) return fail(`Still needed: where ${n} starts, its velocity and its acceleration — any part left blank is 0.`);
    P[n] = { r0: vec(q.r0), u: vec(q.u), a: vec(q.a) };
  }
  if (have(k.at) && !(k.at >= 0)) return fail('The time to give their positions at is 0 or later.');
  const A = P.A, B = P.B;

  // ── each one's position, as the paper writes it
  const rows = [
    { f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: M`vec r_A = ${vb(A.r0)} + ${vb(A.u)}t + ½(${vsrc(A.a)})t^2`, r: M`vec r_A = ${rOf(A)}` },
    { f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: M`vec r_B = ${vb(B.r0)} + ${vb(B.u)}t + ½(${vsrc(B.a)})t^2`, r: M`vec r_B = ${rOf(B)}` },
  ];

  // ── when the i parts are equal, and when the j parts are: rA − rB = 0 part by part
  const D = (key) => [A.r0[key] - B.r0[key], A.u[key] - B.u[key], (A.a[key] - B.a[key]) / 2];
  const same = (c) => c.every((x) => Math.abs(x) < 1e-12);
  const rootsOf = (c) => (same(c) ? null : quadRoots(c[2], c[1], c[0]).filter((t) => t >= -1e-9).map((t) => snap(Math.max(0, t))));
  const ri = rootsOf(D('x')), rj = rootsOf(D('y'));
  // solve the part whose roots are fewest (or the one that is not always equal), check the other
  const first = ri === null ? 'y' : rj === null ? 'x' : (rj.length <= ri.length ? 'y' : 'x');
  const other = first === 'x' ? 'y' : 'x', E = { x: 'i', y: 'j' };
  const rf = first === 'x' ? ri : rj, ro = first === 'x' ? rj : ri;
  const collideRows = [];
  const part = (p, key) => poly([p.r0[key], p.u[key], p.a[key] / 2]);
  if (ri === null && rj === null) return fail('They start at the same place with the same velocity and acceleration: they are together the whole time.');
  collideRows.push({ f: M`"the " vec(${E[first]}) " parts equal"`, s: M`${part(A, first)} = ${part(B, first)}`,
    r: rf.length ? M`t = ${rf.map((t) => d(t)).join(', ')}` : M`"no time" t >= 0` });
  const both = rf.filter((t) => ro === null || ro.some((q) => Math.abs(q - t) < EPS * Math.max(1, t)));
  for (const t of rf) {
    const a = A.r0[other] + A.u[other] * t + 0.5 * A.a[other] * t * t, b = B.r0[other] + B.u[other] * t + 0.5 * B.a[other] * t * t;
    collideRows.push({ f: M`"the " vec(${E[other]}) " parts at " t = ${d(t)}`, s: M`${d(snap(a))}, ${d(snap(b))}`,
      r: Math.abs(a - b) < EPS * Math.max(1, Math.abs(a)) ? M`"equal"` : M`"not equal"` });
  }
  const tc = both.length ? both[0] : null;
  const notes = [], derived = [];
  let where = null;
  if (tc != null) {
    where = { x: snap(A.r0.x + A.u.x * tc + 0.5 * A.a.x * tc * tc), y: snap(A.r0.y + A.u.y * tc + 0.5 * A.a.y * tc * tc) };
    collideRows.push({ f: M`vec r_A = ${rOf(A)}`, s: M`t = ${d(tc)}`, r: M`vec r = ${vb(where)} [m]` });
    notes.push(`At ${M`t = ${d(tc)} [s]`} both parts are equal at once: they collide, at ${M`${vb(where)} [m]`}.`);
    derived.push(`collide at ${M`t = ${d(tc)} [s]`}`);
  } else {
    notes.push(rf.length
      ? `The ${M`vec(${E[first]})`} parts are equal only at ${M`t = ${rf.map((t) => d(t)).join(', ')}`}, and the ${M`vec(${E[other]})`} parts are not equal then: they never collide.`
      : `The ${M`vec(${E[first]})`} parts are never equal: they never collide.`);
  }

  // ── where each is at the asked time
  const atRows = [];
  // a collision ends the run; with none, a little past every moment asked about
  const tMax = tc != null ? Math.max(tc, have(k.at) ? k.at : 0) : Math.max(have(k.at) ? k.at : 0, ...rf, 1) * 1.15;
  const mA = planeMotion(A, tMax), mB = planeMotion(B, tMax);
  if (have(k.at)) for (const [n, m, p] of [['A', mA, A], ['B', mB, B]]) {
    const r = m.pos(k.at);
    atRows.push({ f: M`vec r_${n} = ${rOf(p)}`, s: M`t = ${d(k.at)}`, r: M`vec r_${n} = ${vb(r)} [m]` });
  }
  if (have(k.at)) notes.unshift(`At ${M`t = ${d(k.at)} [s]`}, A is at ${M`${vb(mA.pos(k.at))} [m]`} and B at ${M`${vb(mB.pos(k.at))} [m]`}.`);

  const f = { kind: 'collide', tMax, tFlight: tMax, A: { ...A, m: mA }, B: { ...B, m: mB }, posA: mA.pos, posB: mB.pos, velA: mA.vel, velB: mB.vel,
    tc, where, at: have(k.at) ? k.at : null, params: { u: 0, g: 0, h: 0, theta: 0 } };
  return { ok: true, mode: 'collide', A, B, tc, where, rows, collideRows, atRows, notes, derived, f };
}

/** The working: each position in t, then the parts, then the asked time. */
export function collideWorking(s) {
  if (!s?.ok) return [];
  const out = [{ title: 'Where each one is, at time t', rows: s.rows, note: 'Each has a constant acceleration, so each position is a quadratic in t, part by part.' }];
  if (s.atRows.length) out.push({ title: `Where each is at ${M`t = ${d(s.f.at)} [s]`}`, rows: s.atRows, note: 'The time put into each.' });
  out.push({ title: s.tc != null ? 'Do they collide? Yes' : 'Do they collide? No', rows: s.collideRows,
    note: 'To collide they must be at the same place at the same moment: the i parts equal and the j parts equal, at the same t.' });
  return out;
}
