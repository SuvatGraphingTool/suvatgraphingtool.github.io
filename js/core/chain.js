// chain.js — a motion along one line in stages, one after another, each with
// its own constant acceleration: each stage is solved from whatever the paper
// gives for it, with the speed it ends at carried on as the speed the next
// one starts at.
//
// NO NEW PHYSICS. Each stage is the twelve's own five-equation solver
// (js/core/suvat.js `solve`), which picks the equation and shows the working.
// This file only carries the speeds across the joins (backwards too: a stage
// that ends where the next one's given start is), fills a stage's distance or
// time from a total the paper gives, checks a stage given more than three
// numbers is consistent, and adds up the whole.
//
// CONVENTION. Forwards positive along the line; t from the start of stage 1.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solve } from './suvat.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const KEYS = ['s', 'u', 'v', 'a', 't'];
const TOL = 1e-6;
const UNIT = { s: 'm', u: 'm s^-1', v: 'm s^-1', a: 'm s^-2', t: 's' };

/**
 * @param k { stages: [{ s, u, v, a, t }], S, T }
 *   stages  up to four; a blank u is the last stage's v (stage 1 must give its own)
 *   S, T    the whole distance or the whole time, when the paper gives one
 *           instead of a stage's own
 */
export function solveChain(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  // the stages the student used: any with a number in them, up to the last such
  const raw = (k.stages || []).map((st) => Object.fromEntries(KEYS.filter((x) => have(st?.[x])).map((x) => [x, st[x]])));
  let n = raw.length;
  while (n > 0 && !Object.keys(raw[n - 1]).length) n--;
  if (n === 0) return fail('Still needed: what the paper gives for the first stage — any three of its distance, start speed, end speed, acceleration and time.');
  const st = raw.slice(0, n).map((x) => ({ ...x }));
  for (let i = 0; i < n; i++) {
    if (!Object.keys(st[i]).length) return fail(`Stage ${i + 1} is blank: give what the paper says about it, or clear the stages after it.`);
    if (have(st[i].t) && !(st[i].t > 0)) return fail(`Stage ${i + 1}'s time is a positive number.`);
  }
  const how = st.map(() => ({}));              // where a number not typed came from
  for (let i = 0; i < n - 1; i++) if (have(st[i].v) && have(st[i + 1].u) && Math.abs(st[i].v - st[i + 1].u) > TOL * Math.max(1, Math.abs(st[i].v)))
    return fail(`Stage ${i + 1} ends at ${M`${d(st[i].v)} [m s^-1]`} but stage ${i + 2} is given to start at ${M`${d(st[i + 1].u)} [m s^-1]`}: one stage starts where the last ends.`);
  for (const [key, what] of [['S', 'distance'], ['T', 'time']]) if (have(k[key]) && !(k[key] > 0)) return fail(`The whole ${what} is a positive number.`);

  // ── fill across the joins and from the totals, solving each stage as soon as it can be
  const solved = st.map(() => null);
  const carry = () => {
    let moved = false;
    for (let i = 0; i < n - 1; i++) {
      if (have(st[i].v) && !have(st[i + 1].u)) { st[i + 1].u = st[i].v; how[i + 1].u = `stage ${i + 1} ends at it`; moved = true; }
      if (have(st[i + 1].u) && !have(st[i].v)) { st[i].v = st[i + 1].u; how[i].v = `stage ${i + 2} starts at it`; moved = true; }
    }
    for (const [key, tot] of [['s', k.S], ['t', k.T]]) {
      if (!have(tot)) continue;
      const missing = st.map((x, i) => (have(x[key]) ? -1 : i)).filter((i) => i >= 0);
      if (missing.length === 1) {
        const i = missing[0], rest = st.reduce((a, x, j) => a + (j === i ? 0 : x[key]), 0);
        st[i][key] = tot - rest; how[i][key] = `the whole ${key === 's' ? 'distance' : 'time'} less the other stages`; moved = true;
        if (key === 't' && !(st[i].t > 0)) return { error: `The other stages already take ${M`${d(snap(rest))} [s]`}, as long as the whole time or longer.` };
      }
    }
    return moved;
  };
  for (let guard = 0; guard < 4 * n + 4; guard++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      if (solved[i]) continue;
      const given = KEYS.filter((x) => have(st[i][x]));
      if (given.length < 3) continue;
      // prefer the numbers typed for the stage over those carried in
      const typed = given.filter((x) => !how[i][x]), carried = given.filter((x) => how[i][x]);
      const pick = [...typed, ...carried].slice(0, 3);
      const r = solve(Object.fromEntries(pick.map((x) => [x, st[i][x]])));
      if (!r.ok) return fail(`Stage ${i + 1}: ${r.error}`);
      for (const x of given) if (Math.abs(r.values[x] - st[i][x]) > TOL * Math.max(1, Math.abs(st[i][x])))
        return fail(`Stage ${i + 1} has more than it needs, and they disagree: from the other three, ${M`${x} = ${d(snap(r.values[x]))}`}, not ${M`${d(st[i][x])}`}${how[i][x] ? `, which came from ${how[i][x]}` : ''}.`);
      if (!(r.values.t > 0)) return fail(`Stage ${i + 1} would take no time, or negative time: check its numbers.`);
      solved[i] = { ...r, pick };
      for (const x of KEYS) st[i][x] = r.values[x];
      moved = true;
    }
    const c = carry();
    if (c && c.error) return fail(c.error);
    if (!moved && !c) break;
  }
  const open = solved.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
  if (open.length) {
    const i = open[0], given = KEYS.filter((x) => have(st[i][x]));
    return fail(`Stage ${i + 1} has only ${given.length} of the five${given.length ? ` (${given.join(', ')})` : ''}: it needs three. Give another, or the whole distance or time.`);
  }

  // ── every join meets, and a whole the paper gives is what the stages add to
  for (let i = 0; i < n - 1; i++) if (Math.abs(st[i].v - st[i + 1].u) > TOL * Math.max(1, Math.abs(st[i].v)))
    return fail(`Stage ${i + 1} ends at ${M`${d(snap(st[i].v))} [m s^-1]`} but stage ${i + 2} starts at ${M`${d(snap(st[i + 1].u))} [m s^-1]`}: one stage starts where the last ends.`);
  for (const [key, tot, what, u] of [['s', k.S, 'distance', 'm'], ['t', k.T, 'time', 's']]) {
    if (!have(tot)) continue;
    const sum = st.reduce((a, x) => a + x[key], 0);
    if (Math.abs(sum - tot) > TOL * Math.max(1, tot)) return fail(`The stages add up to ${M`${d(snap(sum))} [${u}]`}, not the whole ${what} of ${M`${d(tot)} [${u}]`}: leave one stage's ${what} blank for the whole to fill, or clear the whole.`);
  }
  // ── the whole: one clock, positions added up
  let t0 = 0, x0 = 0;
  const S = st.map((x, i) => {
    // what it does over the stage, and how far it travels (out and back, if it turns)
    const tv = Math.abs(x.a) > 1e-12 ? -x.u / x.a : -1, turns = tv > 1e-9 && tv < x.t - 1e-9;
    const sTurn = turns ? x.u * tv + 0.5 * x.a * tv * tv : 0;
    const travelled = turns ? Math.abs(sTurn) + Math.abs(x.s - sTurn) : Math.abs(x.s);
    const does = Math.abs(x.a) < 1e-12 ? (Math.abs(x.u) < 1e-12 ? 'at rest' : 'steady') : turns ? 'slows, stops and turns back' : (x.a > 0) === (x.u + x.v >= 0) ? 'speeding up' : 'slowing down';
    const twoRoots = solved[i].steps.some((sp) => sp.roots && sp.roots.length === 2);
    const out = { i: i + 1, ...x, travelled, does, twoRoots, t0, x0, t1: t0 + x.t, x1: x0 + x.s, how: how[i], steps: solved[i].steps, pick: solved[i].pick }; t0 += x.t; x0 += x.s; return out; });
  const Ttot = t0, Stot = x0, dist = S.reduce((a, x) => a + x.travelled, 0), back = Math.abs(dist - Math.abs(Stot)) > 1e-9;
  const avg = dist / Ttot, avgV = Stot / Ttot;
  const at = (t) => S.find((x) => t <= x.t1 + 1e-12) || S[S.length - 1];
  const pos = (t) => { const x = at(t), tt = Math.max(0, Math.min(t, x.t1) - x.t0); return x.x0 + x.u * tt + 0.5 * x.a * tt * tt; };
  const vel = (t) => { const x = at(t), tt = Math.max(0, Math.min(t, x.t1) - x.t0); return x.u + x.a * tt; };
  const acc = (t) => at(t).a;
  const f = { kind: 'chain', look: k.look || 'car', S, tMax: Ttot, D: Stot, pos, vel, acc };

  const notes = [back
    ? `It turns back, so the displacement is ${M`${d(snap(Stot))} [m]`} but the distance travelled is ${M`${d(snap(dist))} [m]`}, in ${M`${d(snap(Ttot))} [s]`}: an average speed of ${M`${d(snap(avg))} [m s^-1]`}, an average velocity of ${M`${d(snap(avgV))} [m s^-1]`}.`
    : `In all: ${M`${d(snap(Stot))} [m]`} in ${M`${d(snap(Ttot))} [s]`}, an average speed of ${M`${d(snap(avg))} [m s^-1]`}.`];
  for (const x of S) if (x.twoRoots) notes.push(`Stage ${x.i} has two roots; the first time it reaches that displacement is taken.`);
  const derived = S.map((x) => `stage ${x.i}: ${M`a = ${d(snap(x.a))} [m s^-2]`}, ${M`t = ${d(snap(x.t))} [s]`}`);
  return { ok: true, mode: 'chain', S, Stot, Ttot, dist, back, avg, avgV, f, notes, derived };
}

/** The working: each stage as the five-equation solver wrote it, then the whole. */
export function chainWorking(solved) {
  if (!solved?.ok) return [];
  const out = solved.S.map((x) => {
    const from = Object.entries(x.how).filter(([key]) => x.pick.includes(key)).map(([key, why]) => `${M`${key} = ${d(snap(x[key]))}`}, as ${why}`);
    return {
      title: `Stage ${x.i}: from ${M`${x.pick.map((key) => `${key} = ${d(snap(x[key]))}`).join(', ')}`}`,
      rows: x.steps.map((sp) => ({ f: sp.formula, s: sp.substitution, r: M`${sp.target} = ${d(snap(sp.value))} [${UNIT[sp.target]}]` })),
      note: from.length ? `Carried in: ${from.join('; ')}.` : 'All three from the paper.',
    };
  });
  const terms = (key) => solved.S.map((x) => `${key}_${x.i}`).join(' + ');
  const sum = (key) => solved.S.map((x) => d(snap(x[key]))).join(' + ');
  out.push({ title: 'The whole', rows: [
    { f: M`s = ${terms('s')}`, s: M`${sum('s')}`, r: M`s = ${d(snap(solved.Stot))} [m]` },
    { f: M`t = ${terms('t')}`, s: M`${sum('t')}`, r: M`t = ${d(snap(solved.Ttot))} [s]` },
    ...(solved.back ? [{ f: M`"distance travelled"`, s: M`${solved.S.map((x) => d(snap(x.travelled))).join(' + ')}`, r: M`${d(snap(solved.dist))} [m]` }] : []),
    { f: M`"average speed" = "distance"/t`, s: M`${d(snap(solved.dist))}/${d(snap(solved.Ttot))}`, r: M`${d(snap(solved.avg))} [m s^-1]` },
  ], note: 'The stages run one after another on one clock.' });
  return out;
}
