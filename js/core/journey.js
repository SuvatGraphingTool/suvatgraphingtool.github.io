// journey.js — a journey in three stages, from rest to rest: speed up to a
// top speed V, hold it, brake to a stop. The speed–time graph is a trapezium
// and its area is the distance.
//
// The exam family: a train between two stations, a car between two sets of
// lights. The paper gives some of the eight numbers that describe the trip —
// the top speed V; each stage's time t₁, t₂, t₃; the acceleration a₁ and the
// deceleration a₃; the whole time T and the whole distance D — sometimes
// with a relation between two of them ("the braking time is four times the
// accelerating time", "the deceleration is twice the acceleration"), and asks
// for the rest. Then usually one more thing: the speed at some instant, when
// it is halfway, when it is doing a given speed.
//
// HOW IT IS SOLVED is how it is solved by hand. One quantity is left as the
// unknown — V if the paper does not give it, otherwise one of the times — and
// every stage's time is written in terms of it: t₁ = V⁄a₁, t₃ = 4t₁,
// t₂ = T − t₁ − t₃. One equation is left over, nearly always the area,
// D = ½(T + t₂)V, and it is solved for the unknown: linear when V is given,
// a quadratic in V when it is not, in which case one root makes a time
// negative and is rejected for that reason. Every row of the working is one
// of those steps with the numbers in.
//
// The motion itself is a motion in stages (js/core/stages.js), so the stage,
// the graphs and the questions about a moment all read one object.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { staged, quadRoots } from './stages.js';
import { M, num } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
// three places, or four for a rate under 1: 0.15625 is 0.1563, not 0.156
const d = (x, p) => num(x, p ?? (Math.abs(x) < 1 ? 4 : 3), { trim: true });
const signed = (x) => (x < 0 ? `(${d(x)})` : d(x));
const snap = (x) => { const r = Math.round(x * 1e9) / 1e9; return Math.abs(x - r) < 1e-9 ? r : x; };

/** The eight, in the order a paper usually gives them, with how each is said. */
export const QUANTITIES = {
  V:  { sym: 'V',   name: 'top speed',              unit: 'm s⁻¹', src: 'V' },
  t1: { sym: 't_1', name: 'time accelerating',      unit: 's',     src: 't_1' },
  t2: { sym: 't_2', name: 'time at steady speed',   unit: 's',     src: 't_2' },
  t3: { sym: 't_3', name: 'time braking',           unit: 's',     src: 't_3' },
  a1: { sym: 'a_1', name: 'acceleration',           unit: 'm s⁻²', src: 'a_1' },
  a3: { sym: 'a_3', name: 'deceleration',           unit: 'm s⁻²', src: 'a_3' },
  T:  { sym: 'T',   name: 'whole time',             unit: 's',     src: 'T' },
  D:  { sym: 'D',   name: 'whole distance',         unit: 'm',     src: 'D' },
};
const UNIT_SRC = { V: '[m s^-1]', t1: '[s]', t2: '[s]', t3: '[s]', a1: '[m s^-2]', a3: '[m s^-2]', T: '[s]', D: '[m]' };

/** The relations papers state between two of them: x = k·y. */
export const RELATIONS = {
  // `pivot` is the time the papers leave as their unknown when V is given
  't3=k*t1': { x: 't3', y: 't1', pivot: 't1', say: 'braking time = k × accelerating time' },
  'a3=k*a1': { x: 't1', y: 't3', pivot: 't1', say: 'deceleration = k × acceleration' },   // a₃ = k a₁ ⇔ t₁ = k t₃
  't1=k*t2': { x: 't1', y: 't2', pivot: 't2', say: 'accelerating time = k × steady time' },
};

/* ── a + b·x, the form every time takes in terms of the one unknown ───── */
const F = (c0, c1 = 0) => ({ c0, c1 });
const add = (...fs) => F(fs.reduce((s, f) => s + f.c0, 0), fs.reduce((s, f) => s + f.c1, 0));
const mul = (f, k) => F(f.c0 * k, f.c1 * k);
const isConst = (f) => Math.abs(f.c1) < EPS;
const val = (f, x) => f.c0 + f.c1 * x;

/** c as p/q when it is one, with q small: 1/0.3 is 10/3, 4/3 is 4/3. */
export function rat(c) {
  for (let q = 1; q <= 30; q++) {
    const p = c * q;
    if (Math.abs(p - Math.round(p)) < 1e-9 * Math.max(1, Math.abs(p))) return { p: Math.round(p), q };
  }
  return null;
}
const VULGAR = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/5': '⅕', '2/5': '⅖',
                 '3/5': '⅗', '4/5': '⅘', '1/6': '⅙', '1/8': '⅛' };

/** A coefficient times a symbol, exactly, as a student writes it: 2V, ⅓t₂,
    (10V)/3 — never 0.3333t₂. With no symbol, the number alone. */
function term(mag, sym) {
  // A decimal that ends within three places is written as one (93.3, 62.5);
  // one that recurs is written as the fraction it is (10/3, not 3.333).
  const ends = Math.abs(mag * 1000 - Math.round(mag * 1000)) < 1e-6;
  const r = ends ? null : rat(mag);
  if (r && r.q > 1) {
    const v = VULGAR[`${r.p}/${r.q}`];
    if (v) return `${v}${sym}`;
    return sym ? `(${r.p}${sym})/${r.q}` : `${r.p}/${r.q}`;
  }
  if (sym && Math.abs(mag - 1) < EPS) return sym;
  return `${d(mag)}${sym}`;
}

/** a + b·x as notation source, with the unknown's own symbol: 300 − 6V. */
function formSrc(f, sym) {
  const c0 = snap(f.c0), c1 = snap(f.c1);
  const parts = [];
  if (Math.abs(c0) > EPS) parts.push(d(c0));
  if (Math.abs(c1) > EPS) {
    const body = term(Math.abs(c1), sym);
    parts.push(parts.length ? `${c1 < 0 ? '-' : '+'} ${body}` : `${c1 < 0 ? '-' : ''}${body}`);
  }
  return parts.join(' ') || '0';
}

/** A form as a factor or a term to subtract: bracketed only when it has two terms. */
const br = (f, sym) => {
  const src = formSrc(f, sym);
  return Math.abs(snap(f.c0)) > EPS && Math.abs(snap(f.c1)) > EPS ? `(${src})` : src;
};

/** p x² + q x + r = 0 as source, highest power first, with x's symbol. */
function quadSrc(p, q, r, sym) {
  const terms = [];
  const put = (c, tail) => {
    if (Math.abs(c) < EPS) return;
    const body = tail ? term(Math.abs(c), tail) : d(Math.abs(c));
    terms.push(terms.length ? `${c < 0 ? '-' : '+'} ${body}` : `${c < 0 ? '-' : ''}${body}`);
  };
  put(p, `${sym}^2`); put(q, sym); put(r, '');
  return terms.join(' ') || '0';
}

/**
 * The journey from what the paper gives.
 * @param k { V, t1, t2, t3, a1, a3, T, D, rel: { kind, k }, at: { t, s, v } }
 * @returns { ok, reason?, J (all eight), unknown, steps (for the working),
 *            f (the motion), stages, answers (for `at`), notes, derived, ... }
 */
export function solveJourney(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const given = Object.keys(QUANTITIES).filter((q) => have(k[q]));
  for (const q of given) {
    if (k[q] < 0) return fail(`Give the ${QUANTITIES[q].name} as a size: no part of this journey runs backwards.`);
    if (k[q] === 0 && q !== 't2') return fail(`A ${QUANTITIES[q].name} of zero leaves no journey to describe.`);
  }
  const rel = k.rel && RELATIONS[k.rel.kind] && have(k.rel.k) ? { ...RELATIONS[k.rel.kind], kind: k.rel.kind, k: k.rel.k } : null;
  if (k.rel?.kind && RELATIONS[k.rel.kind] && !have(k.rel.k)) return fail('The relation needs its number k.');
  if (rel && !(rel.k > 0)) return fail('The k in a relation between two times or two accelerations has to be positive.');
  const relK = rel ? rel.k : null;
  if (have(k.rel?.k) && !k.rel?.kind) return fail(`Pick which relation ${M`k`} belongs to, or clear it.`);

  const steps = [];                 // { title, rows } for the working
  const rows = [];                  // the rows of the "in terms of" step
  const used = new Set();
  const V0 = have(k.V) ? k.V : null;
  let V = V0 != null ? F(V0) : null;
  const t = { t1: have(k.t1) ? F(k.t1) : null, t2: have(k.t2) ? F(k.t2) : null, t3: have(k.t3) ? F(k.t3) : null };
  let unknown = null;               // the key the forms are written in

  // V straight from one stage, when that stage gives both its time and its rate
  if (!V) {
    for (const [tk, ak] of [['t1', 'a1'], ['t3', 'a3']]) {
      if (!V && t[tk] && have(k[ak])) {
        V = F(k[ak] * t[tk].c0); used.add(ak);
        rows.push({ f: M`V = ${QUANTITIES[ak].src}${QUANTITIES[tk].src}`, s: M`${d(k[ak])} * ${d(t[tk].c0)}`, r: M`V = ${d(V.c0)} [m s^-1]` });
      }
    }
  }
  if (!V) { unknown = 'V'; V = F(0, 1); }

  const symOf = (key) => QUANTITIES[key].src;
  const sym = () => (unknown ? symOf(unknown) : 'x');
  const say = (key, f, how) => rows.push({ f: how.f, s: how.s, r: M`${symOf(key)} = ${formSrc(f, sym())}${isConst(f) ? ` ${UNIT_SRC[key]}` : ''}` });

  // Fill in every time that the givens fix, in terms of the unknown.
  const propagate = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const [tk, ak] of [['t1', 'a1'], ['t3', 'a3']]) {
        if (!t[tk] && have(k[ak]) && !used.has(ak) && (isConst(V) || unknown === 'V')) {
          t[tk] = mul(V, 1 / k[ak]); used.add(ak); changed = true;
          say(tk, t[tk], { f: M`${symOf(tk)} = V/${symOf(ak)}`, s: isConst(V) ? M`${d(V.c0)}/${d(k[ak])}` : M`V/${d(k[ak])}` });
        }
      }
      if (rel && !used.has('rel')) {
        if (t[rel.y] && !t[rel.x]) {
          t[rel.x] = mul(t[rel.y], relK); used.add('rel'); changed = true;
          say(rel.x, t[rel.x], { f: rel.kind === 'a3=k*a1' ? M`a_3 = ${term(relK, 'a_1')} -> t_1 = ${term(relK, 't_3')}` : M`${symOf(rel.x)} = ${term(relK, symOf(rel.y))}`,
                                 s: M`${term(relK, '')} * ${br(t[rel.y], sym())}` });
        } else if (t[rel.x] && !t[rel.y]) {
          t[rel.y] = mul(t[rel.x], 1 / relK); used.add('rel'); changed = true;
          say(rel.y, t[rel.y], { f: rel.kind === 'a3=k*a1' ? M`a_3 = ${term(relK, 'a_1')} -> ${symOf(rel.y)} = ${symOf(rel.x)}/${term(relK, '')}` : M`${symOf(rel.y)} = ${symOf(rel.x)}/${term(relK, '')}`,
                                 s: M`${br(t[rel.x], sym())}/${term(relK, '')}` });
        }
      }
      const missing = ['t1', 't2', 't3'].filter((q) => !t[q]);
      if (have(k.T) && !used.has('T') && missing.length === 1) {
        const q = missing[0], others = ['t1', 't2', 't3'].filter((x) => x !== q);
        t[q] = add(F(k.T), mul(t[others[0]], -1), mul(t[others[1]], -1)); used.add('T'); changed = true;
        say(q, t[q], { f: M`${symOf(q)} = T - ${symOf(others[0])} - ${symOf(others[1])}`,
                       s: M`${d(k.T)} - ${br(t[others[0]], sym())} - ${br(t[others[1]], sym())}` });
      }
    }
  };
  propagate();
  // V given, and a time still open: that time is the unknown.
  if (!unknown) {
    // the one the paper names: the relation's own, or else the steady time
    const open = [...(rel ? [rel.pivot] : []), 't2', 't1', 't3'].find((q) => !t[q]);
    if (open) { unknown = open; t[open] = F(0, 1); propagate(); }
  }
  if (['t1', 't2', 't3'].some((q) => !t[q])) {
    // What is fixed already is worth saying: V, T and D alone give the
    // steady time from the area, which is often the part asked for.
    let so = '';
    if (isConst(V) && have(k.D) && have(k.T) && !have(k.t2)) {
      const t2 = 2 * k.D / V.c0 - k.T;
      if (t2 >= -1e-9) so = ` What is fixed so far: the area gives ${M`t_2 = (2D)/V - T = ${d(t2)} [s]`}; one more — a rate, or another time — splits the rest between speeding up and braking.`;
    }
    return fail('Not enough to fix the journey yet. A paper gives four things that tie the stages together — '
      + 'say the top speed, one rate, the whole time and the whole distance, or a relation between two stages.' + so);
  }

  // The equations left over, each one an equation in the unknown.
  const Tf = add(t.t1, t.t2, t.t3);
  const eqs = [];
  if (have(k.D)) eqs.push({ key: 'D', area: true });
  if (have(k.T) && !used.has('T')) eqs.push({ key: 'T' });
  for (const [tk, ak] of [['t1', 'a1'], ['t3', 'a3']]) if (have(k[ak]) && !used.has(ak)) eqs.push({ key: ak, tk });
  if (rel && !used.has('rel')) eqs.push({ key: 'rel' });

  // Each as p x² + q x + r = 0 in the unknown (x unused when nothing is unknown).
  const asQuad = (e) => {
    if (e.area) {
      // D = ½(T + t₂)V, with V = V.c0 + V.c1 x and the bracket affine in x
      const B = add(Tf, t.t2);
      return [0.5 * B.c1 * V.c1, 0.5 * (B.c0 * V.c1 + B.c1 * V.c0), 0.5 * B.c0 * V.c0 - k.D];
    }
    if (e.key === 'T') return [0, Tf.c1, Tf.c0 - k.T];
    if (e.key === 'rel') { const X = add(t[rel.x], mul(t[rel.y], -relK)); return [0, X.c1, X.c0]; }
    const X = add(V, mul(t[e.tk], -k[e.key]));                 // V − a t = 0
    return [0, X.c1, X.c0];
  };

  let x = null, rejected = [];
  if (unknown) {
    const solver = eqs.find((e) => { const [p, q] = asQuad(e); return Math.abs(p) > EPS || Math.abs(q) > EPS; });
    if (!solver) return fail('Those fix every stage only in terms of an unknown, with nothing left to find it from. Add the whole time or the whole distance.');
    const [p, q, r] = asQuad(solver);
    let roots = Math.abs(p) > EPS ? quadRoots(p, q, r) : (Math.abs(q) > EPS ? [-r / q] : []);
    // FIGURES ROUNDED FOR PRINT. A triangle — no steady stretch — has its
    // two roots exactly equal, and a paper's three-figure T and D can tip
    // the discriminant a hair below zero. Within that hair it is the
    // triangle the paper meant, not a journey that cannot be.
    let touch = false;
    if (!roots.length && Math.abs(p) > EPS && q * q - 4 * p * r > -2e-3 * q * q) { roots = [-q / (2 * p)]; touch = true; }
    const ok = (xx) => {
      const vv = val(V, xx), tt = ['t1', 't2', 't3'].map((qq) => val(t[qq], xx));
      if (!(vv > EPS)) return `makes ${M`V = ${d(vv)}`}, and the top speed has to be positive`;
      for (const [i, qq] of ['t1', 't2', 't3'].entries()) {
        if (tt[i] < -1e-7 || (qq !== 't2' && !(tt[i] > EPS))) return `makes ${M`${symOf(qq)} = ${d(tt[i])} [s]`}, and no stage takes ${tt[i] < 0 ? 'negative' : 'no'} time`;
      }
      return null;
    };
    const good = roots.map(snap).filter((xx) => !ok(xx));
    rejected = roots.map(snap).filter((xx) => ok(xx)).map((xx) => ({ x: xx, why: ok(xx) }));
    if (!good.length) {
      return fail(roots.length
        ? `No journey fits those numbers: ${rejected.map((rj) => `${M`${sym()} = ${d(rj.x)}`} ${rj.why}`).join('; ')}.`
        : 'No journey fits those numbers: the equation for the unknown has no real solution — the distance is too long for that time at those rates.');
    }
    x = good[0];
    if (good.length > 1) rejected.push(...good.slice(1).map((xx) => ({ x: xx, why: 'is the other root; both fit, and the smaller is taken' })));
    steps.push({ solver, quad: [p, q, r], roots: roots.map(snap), touch });
    used.add(solver.key);
  }

  // Everything, as numbers.
  const Jv = snap(val(V, x ?? 0));
  const J = { V: Jv, t1: snap(val(t.t1, x ?? 0)), t2: snap(val(t.t2, x ?? 0)), t3: snap(val(t.t3, x ?? 0)) };
  J.T = snap(J.t1 + J.t2 + J.t3);
  J.a1 = snap(J.V / J.t1); J.a3 = snap(J.V / J.t3);
  J.s1 = snap(0.5 * J.V * J.t1); J.s2 = snap(J.V * J.t2); J.s3 = snap(0.5 * J.V * J.t3);
  J.D = snap(J.s1 + J.s2 + J.s3);
  if (!(J.t1 > EPS) || !(J.t3 > EPS) || J.t2 < -1e-7 || !(J.V > EPS)) {
    return fail('Those numbers make one of the stages take negative time. Check them against the paper.');
  }

  // Anything given and not used to solve must agree with the answer.
  // Within a hair of each other they agree; within rounding (0.2 %) they are
  // accepted and the note says which figure was used; beyond that, refused.
  const replaced = [];
  for (const q of given) {
    const v = k[q], off = Math.abs(J[q] - v);
    if (off <= Math.max(1e-6, Math.abs(v) * 1e-6)) continue;
    if (off <= Math.abs(v) * 0.002) { replaced.push(q); continue; }
    return fail(`Those do not agree: the rest give ${M`${symOf(q)} = ${d(J[q])} ${UNIT_SRC[q]}`}, but you gave ${M`${d(v)} ${UNIT_SRC[q]}`}. Clear one of them.`);
  }
  if (rel) {
    const lhs = J[rel.x], rhs = relK * J[rel.y];
    if (Math.abs(lhs - rhs) > Math.max(1e-6, Math.abs(lhs) * 0.002)) {
      return fail(`Those do not agree with the relation: ${M`${symOf(rel.x)} = ${d(lhs)}`}, not ${term(relK, '')} × ${d(J[rel.y])}. Clear one of them.`);
    }
  }

  const f = journeyMotion(J);
  const answers = askAt(f, J, k.at || {});
  f.answers = answers;              // the stage rings the instants they name
  const notes = [];
  if (J.t2 < EPS) notes.push('No steady stretch: it starts braking the moment it reaches its top speed, so the graph is a triangle.');
  if (steps[0]?.touch) notes.push('The figures given are rounded, and only just allow the journey: taken as a triangle, as they were meant.');
  for (const q of replaced) notes.push(`You gave ${M`${symOf(q)} = ${d(k[q])} ${UNIT_SRC[q]}`}; the rest fix it at ${M`${d(J[q])} ${UNIT_SRC[q]}`}, and that is what is used — the difference is rounding.`);
  for (const a of answers) notes.push(a.ok ? a.text : a.note);
  const derived = Object.keys(QUANTITIES).filter((q) => !given.includes(q)).map((q) => M`${symOf(q)} = ${d(J[q])} ${UNIT_SRC[q]}`);

  return {
    ok: true, mode: 'journey', axis: 'along', J, given, unknown, x, rejected, rows, steps, rel, f, answers,
    lin: { V, T: Tf, t1: t.t1, t2: t.t2, t3: t.t3 },
    // whether any stage's time had to be written in terms of the unknown
    dependsOn: ['t1', 't2', 't3'].some((q) => !isConst(t[q])),
    // what fixed the unknown, said in words, for the ending
    fixedBy: steps[0] ? { D: 'the area under the speed–time graph, which is the whole distance,', T: 'the whole time',
                          rel: 'the relation between the two stages', a1: 'the acceleration', a3: 'the deceleration' }[steps[0].solver.key] : null,
    params: { V: J.V, T: J.T, D: J.D }, notes, derived, Dgiven: have(k.D) ? k.D : J.D,
    convention: 'From rest at A to rest at B, the direction of travel positive.',
  };
}

/* ── the motion: three stages, one after another ──────────────────────── */
export function journeyMotion(J) {
  const m = staged([
    { t0: 0, t1: J.t1, x0: 0, u: 0, a: J.a1, kind: 'accelerating' },
    { t0: J.t1, t1: J.t1 + J.t2, x0: J.s1, u: J.V, a: 0, kind: 'steady' },
    { t0: J.t1 + J.t2, t1: J.T, x0: J.s1 + J.s2, u: J.V, a: -J.a3, kind: 'braking' },
  ].filter((st) => st.t1 - st.t0 > EPS));
  const clampT = (tt) => Math.min(Math.max(tt, 0), J.T);
  const f = {
    kind: 'journey', J, tMax: J.T, tFlight: J.T, range: J.D,
    params: { u: 0, a: J.a1, s: J.D, v: 0, t: J.T, g: 0, h: 0, theta: 0, V: J.V },
    stages: m.stages,
    pos: (tt) => ({ x: m.pos(clampT(tt)), y: 0 }),
    vel: (tt) => ({ x: m.vel(clampT(tt)), y: 0 }),
    speed: (tt) => Math.abs(m.vel(clampT(tt))),
    accel: (tt) => m.acc(clampT(tt)),
    stageAt: (tt) => m.stageAt(clampT(tt)) || m.stages[m.stages.length - 1],
    bounces: 0, segments: [], horiz: null, uy: 0, ux: 0,
    kineticEnergy: () => 0, momentum: () => 0,
    path(n = 200, tEnd = J.T) {
      const out = [];
      for (let i = 0; i <= n; i++) { const tt = (i / n) * tEnd; out.push({ t: tt, x: m.pos(tt), y: 0 }); }
      return out;
    },
  };
  return f;
}

/* ── the questions asked after the trip is fixed ─────────────────────────
   the speed at an instant; when it has gone a given distance; when it is
   doing a given speed (twice, usually — once speeding up, once braking). */
const STAGE_WORD = { accelerating: 'speeding up', steady: 'at its steady speed', braking: 'braking' };
export function askAt(f, J, at = {}) {
  // Every substitution uses the journey's own V, t₁, t₃ and T — the numbers
  // the paper gives or the working has just found — never a rate rounded
  // for display: 25 × 128⁄160 is exactly 20, 25 − 0.1563 × 32 is not.
  const out = [];
  const t2e = J.t1 + J.t2;
  if (have(at.t)) {
    const tt = at.t;
    if (tt < 0 || tt > J.T + 1e-9) out.push({ kind: 't', ok: false, note: `${M`t = ${d(tt)} [s]`} is outside the journey, which takes ${M`${d(J.T)} [s]`}.` });
    else {
      const st = f.stageAt(tt), v = snap(f.vel(tt).x), s = snap(f.pos(tt).x);
      const rows = st.kind === 'accelerating'
        ? [{ f: M`v = (Vt)/t_1`, s: M`(${d(J.V)} * ${d(tt)})/${d(J.t1)}`, r: M`v = ${d(v)} [m s^-1]` }]
        : st.kind === 'steady'
          ? [{ f: M`v = V`, s: '', r: M`v = ${d(v)} [m s^-1]` }]
          : [{ f: M`v = (V(T - t))/t_3`, s: M`(${d(J.V)} * ${d(J.T - tt)})/${d(J.t3)}`, r: M`v = ${d(v)} [m s^-1]` }];
      out.push({ kind: 't', ok: true, t: tt, v, s, stage: st.kind, rows,
        note: st.kind === 'braking' ? `Braking, the speed falls in a straight line to zero at ${M`T`}, so it is ${M`V`} times the fraction of ${M`t_3`} still to go.`
          : st.kind === 'accelerating' ? `Speeding up, the speed rises in a straight line from zero, so it is ${M`V`} times the fraction of ${M`t_1`} gone.` : '',
        text: `At ${M`t = ${d(tt)} [s]`} it is ${STAGE_WORD[st.kind]}, doing ${M`${d(v)} [m s^-1]`}, ${M`${d(s)} [m]`} from A.` });
    }
  }
  if (have(at.s)) {
    const s = at.s;
    if (s < 0 || s > J.D + 1e-9) out.push({ kind: 's', ok: false, note: `${M`${d(s)} [m]`} is beyond the journey, which is ${M`${d(J.D)} [m]`}.` });
    else {
      let tt, rows;
      if (s <= J.s1 + 1e-9) {
        // s = ½(V/t₁)t², so t = √(2 s t₁ ⁄ V)
        tt = Math.sqrt(2 * s * J.t1 / J.V);
        rows = [{ f: M`t = sqrt((2st_1)/V)`, s: M`sqrt((2 * ${d(s)} * ${d(J.t1)})/${d(J.V)})`, r: M`t = ${d(tt)} [s]` }];
      } else if (s <= J.s1 + J.s2 + 1e-9) {
        tt = J.t1 + (s - J.s1) / J.V;
        rows = [{ f: M`t = t_1 + (s - s_1)/V`, s: M`${d(J.t1)} + (${d(s)} - ${d(J.s1)})/${d(J.V)}`, r: M`t = ${d(tt)} [s]` }];
      } else {
        const left = J.D - s;                          // still to go, braking to rest
        tt = J.T - Math.sqrt(2 * left * J.t3 / J.V);
        rows = [{ f: M`t = T - sqrt((2(D - s)t_3)/V)`, s: M`${d(J.T)} - sqrt((2 * ${d(left)} * ${d(J.t3)})/${d(J.V)})`, r: M`t = ${d(tt)} [s]` }];
      }
      tt = snap(tt);
      out.push({ kind: 's', ok: true, t: tt, s, v: f.vel(tt).x, stage: f.stageAt(tt).kind, rows,
        text: `It has gone ${M`${d(s)} [m]`} at ${M`t = ${d(tt)} [s]`}.` });
    }
  }
  if (have(at.v)) {
    const v = at.v;
    if (v < 0 || v > J.V + 1e-9) out.push({ kind: 'v', ok: false, note: `It never does ${M`${d(v)} [m s^-1]`}: its top speed is ${M`${d(J.V)} [m s^-1]`}.` });
    else if (Math.abs(v - J.V) < 1e-9) {
      out.push({ kind: 'v', ok: true, v, times: J.t2 > EPS ? [J.t1, t2e] : [J.t1], rows: [],
        text: J.t2 > EPS ? `It is at its top speed from ${M`t = ${d(J.t1)} [s]`} to ${M`t = ${d(t2e)} [s]`}.`
          : `It reaches its top speed at ${M`t = ${d(J.t1)} [s]`}, and starts braking at once.` });
    } else if (v < EPS) {
      out.push({ kind: 'v', ok: true, v, times: [0, J.T], rows: [],
        text: `It is at rest only at the two ends: ${M`t = 0`} at A and ${M`t = ${d(J.T)} [s]`} at B.` });
    } else {
      const ta = snap(v * J.t1 / J.V), tb = snap(J.T - v * J.t3 / J.V);
      out.push({ kind: 'v', ok: true, v, times: [ta, tb],
        rows: [{ f: M`t = (vt_1)/V`, s: M`(${d(v)} * ${d(J.t1)})/${d(J.V)}`, r: M`t = ${d(ta)} [s]` },
               { f: M`t = T - (vt_3)/V`, s: M`${d(J.T)} - (${d(v)} * ${d(J.t3)})/${d(J.V)}`, r: M`t = ${d(tb)} [s]` }],
        text: `It is doing ${M`${d(v)} [m s^-1]`} twice: at ${M`t = ${d(ta)} [s]`}, speeding up, and at ${M`t = ${d(tb)} [s]`}, braking.` });
    }
  }
  return out;
}

/* ── the working ──────────────────────────────────────────────────────── */
export function journeyWorking(solved) {
  if (!solved?.ok) return [];
  const { J, unknown, rows, steps, rejected, answers } = solved;
  const out = [];
  const S = (key) => QUANTITIES[key].src;
  if (rows.length) {
    out.push({
      title: unknown ? `Each stage in terms of ${unknown === 'V' ? 'V' : 'the unknown'}` : 'Each stage from what is given',
      rows,
      note: unknown && solved.dependsOn
        ? `${M`${S(unknown)}`} is the one quantity not given, so every time that depends on it is written in terms of it, and one equation is left to find it.`
        : unknown ? `Every time follows from what is given; ${M`${S(unknown)}`} is what is left to find.`
        : 'A time from each rate: the time to reach the top speed is the speed divided by the rate.',
    });
  }
  if (steps.length) {
    const { solver, quad: [p, q, r], roots } = steps[0];
    const sym = S(unknown);
    const eqRows = [];
    // written with a positive leading term, as by hand
    const sg = (Math.abs(p) > EPS ? p : q) < 0 ? -1 : 1;
    const [P, Q, R] = [p * sg, q * sg, r * sg];
    const form = (key) => formSrc(rowsForm(solved, key), sym);
    const brk = (key) => br(rowsForm(solved, key), sym);
    if (solver.area) {
      eqRows.push({ f: M`D = ½(T + t_2)V`, s: M`${d(solved.Dgiven)} = ½(${form('T')} + ${form('t2')}) * ${brk('V')}`, r: M`${quadSrc(P, Q, R, sym)} = 0` });
    } else if (solver.key === 'T') {
      eqRows.push({ f: M`T = t_1 + t_2 + t_3`, s: M`${d(J.T)} = ${brk('t1')} + ${brk('t2')} + ${brk('t3')}`, r: M`${quadSrc(P, Q, R, sym)} = 0` });
    } else if (solver.key === 'rel') {
      const { rel } = solved;
      eqRows.push({ f: M`${S(rel.x)} = ${d(rel.k)}${S(rel.y)}`, s: M`${brk(rel.x)} = ${d(rel.k)} * ${brk(rel.y)}`, r: M`${quadSrc(P, Q, R, sym)} = 0` });
    } else {
      const tk = solver.tk;
      eqRows.push({ f: M`V = ${S(solver.key)}${S(tk)}`, s: M`${brk('V')} = ${d(J[solver.key])} * ${brk(tk)}`, r: M`${quadSrc(P, Q, R, sym)} = 0` });
    }
    const whole = (c) => Math.abs(c - Math.round(c)) < 1e-9;
    if (Math.abs(P) > EPS) {
      // divide through only by a whole number, and only when whole numbers are
      // left, as a student would
      let [a, b, c] = [P, Q, R];
      if (whole(P) && Math.abs(P - 1) > EPS && whole(Q / P) && whole(R / P)) {
        eqRows.push({ f: '', s: M`"÷" ${d(P)}`, r: M`${quadSrc(1, Q / P, R / P, sym)} = 0` });
        [a, b, c] = [1, Q / P, R / P];
      }
      const ints = a === 1 && whole(b) && whole(c) && roots.every(whole);
      if (ints && roots.length > 1) {
        // it factorises, which is how the mark schemes do it
        const fac = roots.map((x) => `(${sym} ${x < 0 ? '+' : '-'} ${d(Math.abs(x))})`).join('');
        eqRows.push({ f: M`${fac} = 0`, s: '', r: M`${sym} = ${d(roots[0])} "or" ${sym} = ${d(roots[1])}` });
      } else {
        const sa = whole(a) ? d(a) : `(${term(a, '')})`, sB = signed(b), sc = signed(c);
        eqRows.push({ f: M`${sym} = (-b +- sqrt(b^2 - 4ac))/(2a)`,
                      s: M`(-${sB} +- sqrt(${sB}^2 - 4 * ${sa} * ${sc}))/(2 * ${sa})`,
                      r: roots.length > 1 ? M`${sym} = ${d(roots[0])} "or" ${sym} = ${d(roots[1])}` : M`${sym} = ${d(solved.x)}` });
      }
    } else {
      const sQ = whole(Q) ? d(Q) : `(${term(Q, '')})`;
      eqRows.push({ f: M`${quadSrc(0, Q, 0, sym)} = ${d(-R)}`, s: M`${sym} = ${d(-R)}/${sQ}`, r: M`${sym} = ${d(solved.x)} ${UNIT_SRC[unknown]}` });
    }
    const why = rejected.map((rj) => `${M`${sym} = ${d(rj.x)}`} ${rj.why}, so it is rejected.`).join(' ');
    out.push({
      title: solver.area ? 'The area under the speed–time graph is the distance' : 'The one equation left',
      rows: eqRows,
      note: (solver.area ? (J.t2 > EPS
        ? 'The graph is a trapezium: the two parallel sides are the whole time and the steady time, and its height is the top speed. '
        : 'With no steady stretch the graph is a triangle, base the whole time and height the top speed: the same formula with t₂ = 0. ') : '')
        + (steps[0].touch ? 'The figures given are rounded and the discriminant comes out a hair below zero: the triangle they describe is the root used. ' : '')
        + why,
    });
  }
  out.push({
    title: 'The whole journey',
    rows: [
      { f: M`T = t_1 + t_2 + t_3`, s: M`${d(J.t1)} + ${d(J.t2)} + ${d(J.t3)}`, r: M`T = ${d(J.T)} [s]` },
      { f: M`a_1 = V/t_1`, s: M`${d(J.V)}/${d(J.t1)}`, r: M`a_1 = ${d(J.a1)} [m s^-2]` },
      { f: M`a_3 = V/t_3`, s: M`${d(J.V)}/${d(J.t3)}`, r: M`a_3 = ${d(J.a3)} [m s^-2]` },
      { f: M`s_1 = ½Vt_1`, s: M`½ * ${d(J.V)} * ${d(J.t1)}`, r: M`s_1 = ${d(J.s1)} [m]` },
      { f: M`s_2 = Vt_2`, s: M`${d(J.V)} * ${d(J.t2)}`, r: M`s_2 = ${d(J.s2)} [m]` },
      { f: M`s_3 = ½Vt_3`, s: M`½ * ${d(J.V)} * ${d(J.t3)}`, r: M`s_3 = ${d(J.s3)} [m]` },
    ],
    note: `Each distance is the area of its own piece of the graph — two triangles and a rectangle — and together they are ${M`D = ${d(J.D)} [m]`}.`,
  });
  for (const a of answers.filter((x) => x.ok)) {
    out.push({
      title: a.kind === 't' ? `At ${M`t = ${d(a.t)} [s]`}` : a.kind === 's' ? `When it has gone ${M`${d(a.s)} [m]`}` : `When it is doing ${M`${d(a.v)} [m s^-1]`}`,
      rows: a.rows, note: [a.note, a.text].filter(Boolean).join(' '),
    });
  }
  return out;
}

/* The form a quantity took in the working (c0 + c1·x), for substituting
   into the area. */
const rowsForm = (solved, key) => solved.lin[key];
