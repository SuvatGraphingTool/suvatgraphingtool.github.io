// journey.js — a journey along a straight line in any number of stages, each
// one either "change speed at a constant rate" or "hold a speed". The speed–
// time graph is a chain of straight pieces and the area under it is the
// distance.
//
// The exam family: a train between two stations (rest, up to V, steady,
// brake to rest — the trapezium); a car that holds 20 m s⁻¹, brakes to 8,
// holds that, then speeds up again; a runner who speeds up, holds a pace and
// fades over the line. The paper gives some of the speeds at the stage
// changes, each stage's time or rate, the whole time T and the whole
// distance D — sometimes with a relation between two stages ("the braking
// time is four times the accelerating time", "the deceleration is twice the
// acceleration") — and asks for the one thing it leaves out. Then usually
// one more: the speed at some instant, how far it has gone by then, when it
// is halfway, when it is doing a given speed.
//
// HOW IT IS SOLVED is how it is solved by hand. Every stage is SUVAT on its
// own: v = u ± at for a change, v = u for a hold. What the paper gives fixes
// some speeds and times; one quantity is left as the unknown — a speed, V, if
// the paper leaves one out, otherwise a time — and every other speed and time
// is written in terms of it. One equation is left over, nearly always the
// area, and it is solved for the unknown: linear when the unknown is a time,
// often a quadratic when it is a speed, in which case a root that makes a
// time negative is rejected for that reason. Every row of the working is one
// of those steps with the numbers in.
//
// The three-stage trapezium, rest to rest, is the commonest case and keeps
// its own way of being written — D = ½(T + t₂)V, as the mark schemes write
// it — and its own way of being asked (solveJourney takes V, t1…t3, a1, a3).
//
// The motion itself is a motion in stages (js/core/stages.js), so the stage,
// the graphs and the questions about a moment all read one object.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { staged, quadRoots } from './stages.js';
import { snap, rat } from './numeric.js';
import { M, num } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
// three places, or four for a rate under 1: 0.15625 is 0.1563, not 0.156
const d = (x, p) => num(x, p ?? (Math.abs(x) < 1 ? 4 : 3), { trim: true });
const signed = (x) => (x < 0 ? `(${d(x)})` : d(x));
/** How every figure of a journey is written, on every screen: the working,
    the readouts and the stage all use this one rule. */
export const figure = (x) => d(x);

export const MAX_STAGES = 6;
/** What a stage does, in the paper's words. */
export const KINDS = { up: 'speeds up', hold: 'holds its speed', down: 'slows down' };

/* ── a + b·x, the form every speed and time takes in the one unknown ─── */
const F = (c0, c1 = 0) => ({ c0, c1 });
const add = (...fs) => F(fs.reduce((s, f) => s + f.c0, 0), fs.reduce((s, f) => s + f.c1, 0));
const mul = (f, k) => F(f.c0 * k, f.c1 * k);
const sub = (f, g) => add(f, mul(g, -1));
const isConst = (f) => Math.abs(f.c1) < EPS;
const val = (f, x) => f.c0 + f.c1 * x;
// a product of two forms, and sums of them, as [x², x, 1]
const prod = (f, g) => [f.c1 * g.c1, f.c0 * g.c1 + f.c1 * g.c0, f.c0 * g.c0];
const qadd = (...qs) => qs.reduce((s, q) => [s[0] + q[0], s[1] + q[1], s[2] + q[2]], [0, 0, 0]);
const qmul = (q, k) => q.map((c) => c * k);
/** c when f = c·g exactly, else null. */
function ratio(f, g) {
  const c = Math.abs(g.c1) > EPS ? f.c1 / g.c1 : Math.abs(g.c0) > EPS ? f.c0 / g.c0 : null;
  if (c == null) return null;
  return Math.abs(f.c0 - c * g.c0) < 1e-9 * Math.max(1, Math.abs(f.c0)) && Math.abs(f.c1 - c * g.c1) < 1e-9 * Math.max(1, Math.abs(f.c1)) ? c : null;
}

export { rat };
const VULGAR = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/5': '⅕', '2/5': '⅖',
                 '3/5': '⅗', '4/5': '⅘', '1/6': '⅙', '1/8': '⅛' };

/** A coefficient times a symbol, exactly, as a student writes it: 2V, ⅓t₂,
    (10V)/3 — never 0.3333t₂. With no symbol, the number alone. */
function term(mag, sym, nice = false) {
  // A decimal that ends within three places is written as one (93.3, 62.5);
  // one that recurs is written as the fraction it is (10/3, not 3.333). A
  // coefficient the working arrived at (`nice`) is ½V and ¼V², not 0.5V —
  // but a rate the paper gave as 0.25 stays 0.25.
  const ends = Math.abs(mag * 1000 - Math.round(mag * 1000)) < 1e-6;
  const rn = nice && sym ? rat(mag, 4) : null;
  const r = rn && rn.q > 1 ? rn : ends ? null : rat(mag);
  if (r && r.q > 1) {
    const v = VULGAR[`${r.p}/${r.q}`];
    if (v) return `${v}${sym}`;
    return sym ? `(${r.p}${sym})/${r.q}` : `${r.p}/${r.q}`;
  }
  if (sym && Math.abs(mag - 1) < EPS) return sym;
  return `${d(mag)}${sym}`;
}
/** A number exactly, for substituting: 0.625 and 0.15625 as they are, ⅔
    rather than 0.6667 — so the numbers on screen multiply out to the answer. */
function ex(x) {
  if (x < 0) return `-${ex(-x)}`;
  for (let p = 0; p <= 6; p++) if (Math.abs(x * 10 ** p - Math.round(x * 10 ** p)) < 1e-9 * Math.max(1, x * 10 ** p)) return num(x, p, { trim: true });
  return term(x, '');
}

/** a + b·x as notation source, with the unknown's own symbol: 300 − 6V. */
function formSrc(f, sym) {
  const c0 = snap(f.c0), c1 = snap(f.c1);
  const parts = [];
  if (Math.abs(c0) > EPS) parts.push(d(c0));
  if (Math.abs(c1) > EPS) {
    const body = term(Math.abs(c1), sym, true);
    parts.push(parts.length ? `${c1 < 0 ? '-' : '+'} ${body}` : `${c1 < 0 ? '-' : ''}${body}`);
  }
  return parts.join(' ') || '0';
}

/** A form as a factor or a term to subtract: bracketed when it has two terms
    or is negative. */
const br = (f, sym) => {
  const src = formSrc(f, sym);
  return (Math.abs(snap(f.c0)) > EPS && Math.abs(snap(f.c1)) > EPS) || src.startsWith('-') ? `(${src})` : src;
};

/** p x² + q x + r as source, highest power first, with x's symbol. */
function quadSrc(p, q, r, sym) {
  const terms = [];
  const put = (c, tail) => {
    if (Math.abs(c) < EPS) return;
    const body = tail ? term(Math.abs(c), tail, true) : d(Math.abs(c));
    terms.push(terms.length ? `${c < 0 ? '-' : '+'} ${body}` : `${c < 0 ? '-' : ''}${body}`);
  };
  put(p, `${sym}^2`); put(q, sym); put(r, '');
  return terms.join(' ') || '0';
}

/* ── names ─────────────────────────────────────────────────────────────── */
const tS = (i) => `t_${i}`;
const aS = (i) => `a_${i}`;
const sS = (i) => `s_${i}`;
const vS = (i) => (i === 0 ? 'u' : `v_${i}`);
const UNIT = { v: '[m s^-1]', u: '[m s^-1]', t: '[s]', a: '[m s^-2]', s: '[m]', T: '[s]', D: '[m]' };
const unitOf = (key) => UNIT[key[0]];
/** A given's symbol: u, v_2, t_3, a_1, T, D. */
const symOf = (key) => (key === 'u' || key === 'T' || key === 'D' ? key : `${key[0]}_${key.slice(1)}`);
/** And how it is said in a sentence. */
function nameOf(key) {
  if (key === 'u') return 'speed at A';
  if (key === 'T') return 'whole time';
  if (key === 'D') return 'whole distance';
  const i = key.slice(1);
  return { v: `speed at the end of stage ${i}`, t: `time of stage ${i}`, a: `rate of stage ${i}` }[key[0]];
}

/* ── the three-stage journey, as the papers ask it ─────────────────────── */
const LEGACY_REL = { 't3=k*t1': { kind: 't', x: 3, y: 1 }, 'a3=k*a1': { kind: 'a', x: 3, y: 1 }, 't1=k*t2': { kind: 't', x: 1, y: 2 } };
/** From rest, up to V, steady, braking to rest — in the eight names a paper
    uses for it (V, t1, t2, t3, a1, a3, T, D) — as a journey in stages. */
export function threeStages(k = {}) {
  const r = k.rel;
  const rel = r && (r.kind || have(r.k)) ? { ...(LEGACY_REL[r.kind] || { kind: r.kind }), k: r.k } : null;
  return { u: 0, stages: [{ kind: 'up', v: k.V, t: k.t1, a: k.a1 }, { kind: 'hold', t: k.t2 }, { kind: 'down', v: 0, t: k.t3, a: k.a3 }],
           T: k.T, D: k.D, rel, at: k.at };
}

/**
 * The journey from what the paper gives.
 * @param k  either { u, stages: [{ kind: 'up'|'hold'|'down', v, t, a }], T, D,
 *           rel: { kind: 't'|'a', x, y, k }, at: { t, s, v } } — stage x's time
 *           (or rate) is k times stage y's; v is the speed at a stage's end —
 *           or the three-stage names { V, t1, t2, t3, a1, a3, T, D, rel, at }.
 * @returns { ok, reason?, J, unknown, rows, steps, f (the motion), answers, notes, derived, ... }
 */
export function solveJourney(k = {}) {
  return solveStages(Array.isArray(k.stages) ? k : threeStages(k));
}

export function solveStages(spec) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const S = spec.stages || [];
  const n = S.length;
  if (!n) return fail('A journey needs at least one stage.');
  if (n > MAX_STAGES) return fail(`Up to ${MAX_STAGES} stages: no paper uses more.`);
  for (const [j, st] of S.entries()) {
    if (!KINDS[st?.kind]) return fail(`Say what stage ${j + 1} does: speeds up, holds its speed, or slows down.`);
  }
  const idx = S.map((_, j) => j + 1);
  const kindOf = (i) => S[i - 1].kind;
  const sg = (i) => (kindOf(i) === 'down' ? -1 : 1);

  // What the paper gives, by name.
  const given = {};
  const put = (key, v) => { if (have(v)) given[key] = v; };
  put('u', spec.u);
  for (const i of idx) {
    put(`t${i}`, S[i - 1].t);
    if (kindOf(i) !== 'hold') { put(`v${i}`, S[i - 1].v); put(`a${i}`, S[i - 1].a); }
  }
  put('T', spec.T); put('D', spec.D);
  for (const [key, v] of Object.entries(given)) {
    if (v < 0) return fail(`Give the ${nameOf(key)} as a size: no part of this journey runs backwards.`);
    if (v !== 0) continue;
    if (key === 'T' || key === 'D') return fail(`A ${nameOf(key)} of zero leaves no journey to describe.`);
    if (key[0] === 'a') return fail(`A rate of zero in stage ${key.slice(1)} would not change its speed: make that stage a steady one.`);
    if (key[0] === 't' && kindOf(+key.slice(1)) !== 'hold') return fail(`Stage ${key.slice(1)} would take no time: leave it out, or give it a time.`);
  }

  // A relation between two stages.
  let rel = null;
  const R = spec.rel;
  if (R && (R.kind || have(R.k) || have(R.x) || have(R.y))) {
    if (!R.kind) return fail(`Pick which relation ${M`k`} belongs to, or clear it.`);
    if (!have(R.k)) return fail(`The relation needs its number ${M`k`}.`);
    if (!(R.k > 0)) return fail(`The ${M`k`} in a relation between two stages has to be positive.`);
    if (!idx.includes(R.x) || !idx.includes(R.y)) return fail(`Say which two stages the relation is between: two stage numbers from 1 to ${n}.`);
    if (R.x === R.y) return fail('A relation is between two different stages.');
    if (R.kind === 'a' && (kindOf(R.x) === 'hold' || kindOf(R.y) === 'hold')) return fail('A steady stage has no rate to compare: a relation between rates is between two stages that change speed.');
    rel = { kind: R.kind, x: R.x, y: R.y, k: R.k };
  }

  // Every boundary speed w[0…n], time t[1…n] and rate a[1…n] — a form, or null.
  const w = Array(n + 1).fill(null), t = Array(n + 1).fill(null), a = Array(n + 1).fill(null);
  if (have(spec.u)) w[0] = F(spec.u);
  for (const i of idx) {
    const st = S[i - 1];
    if (have(st.t)) t[i] = F(st.t);
    if (kindOf(i) === 'hold') a[i] = 0;
    else { if (have(st.v)) w[i] = F(st.v); if (have(st.a)) a[i] = st.a; }
  }

  const rows = [];                  // the rows of the "each stage" step
  const used = new Set();           // givens already spent fixing something
  const how = new Set();            // which kinds of step fixed them, for the note
  let unknown = null;               // { key: 'V' | 't3', sym, at }
  const sym = () => (unknown ? unknown.sym : 'x');
  const fs = (f) => formSrc(f, sym());
  const fb = (f) => br(f, sym());
  const u_ = (f, U) => (isConst(f) ? ` ${U}` : '');
  const gain = (i) => (w[i - 1] && w[i] ? mul(sub(w[i], w[i - 1]), sg(i)) : null);

  // Fill in everything the givens fix, in terms of the unknown once there is one.
  const propagate = () => {
    for (let changed = true; changed;) {
      changed = false;
      for (const i of idx) {
        if (kindOf(i) === 'hold') {
          // a steady stage ends at the speed it started at
          if (w[i - 1] && !w[i]) { w[i] = w[i - 1]; changed = true; }
          else if (w[i] && !w[i - 1]) { w[i - 1] = w[i]; changed = true; }
          continue;
        }
        if (a[i] == null || used.has(`a${i}`)) continue;
        const g = sg(i), A = a[i], op = g > 0 ? '+' : '-', law = M`v = u ${op} at`;
        if (w[i - 1] && w[i] && !t[i]) {
          t[i] = mul(sub(w[i], w[i - 1]), g / A);
          rows.push({ f: law, s: M`${fb(w[i])} = ${fb(w[i - 1])} ${op} ${term(A, tS(i))}`, r: M`${tS(i)} = ${fs(t[i])}${u_(t[i], '[s]')}` });
        } else if (w[i - 1] && t[i] && !w[i]) {
          w[i] = add(w[i - 1], mul(t[i], g * A));
          rows.push({ f: law, s: M`${vS(i)} = ${fb(w[i - 1])} ${op} ${ex(A)} * ${fb(t[i])}`, r: M`${vS(i)} = ${fs(w[i])}${u_(w[i], '[m s^-1]')}` });
        } else if (w[i] && t[i] && !w[i - 1]) {
          w[i - 1] = sub(w[i], mul(t[i], g * A));
          rows.push({ f: law, s: M`${fb(w[i])} = ${vS(i - 1)} ${op} ${ex(A)} * ${fb(t[i])}`, r: M`${vS(i - 1)} = ${fs(w[i - 1])}${u_(w[i - 1], '[m s^-1]')}` });
        } else continue;
        used.add(`a${i}`); how.add('rate'); changed = true;
      }
      if (rel && !used.has('rel')) {
        const { x, y, k: K } = rel;
        let done = false;
        if (rel.kind === 't') {
          if (t[y] && !t[x]) {
            t[x] = mul(t[y], K); done = true;
            rows.push({ f: M`${tS(x)} = ${term(K, tS(y))}`, s: M`${term(K, '')} * ${fb(t[y])}`, r: M`${tS(x)} = ${fs(t[x])}${u_(t[x], '[s]')}` });
          } else if (t[x] && !t[y]) {
            t[y] = mul(t[x], 1 / K); done = true;
            rows.push({ f: M`${tS(y)} = ${tS(x)}/${term(K, '')}`, s: M`${fb(t[x])}/${term(K, '')}`, r: M`${tS(y)} = ${fs(t[y])}${u_(t[y], '[s]')}` });
          }
        } else if (a[y] != null && a[x] == null) {
          a[x] = K * a[y]; done = true;
          rows.push({ f: M`${aS(x)} = ${term(K, aS(y))}`, s: M`${term(K, '')} * ${ex(a[y])}`, r: M`${aS(x)} = ${ex(a[x])} [m s^-2]` });
        } else if (a[x] != null && a[y] == null) {
          a[y] = a[x] / K; done = true;
          rows.push({ f: M`${aS(y)} = ${aS(x)}/${term(K, '')}`, s: M`${ex(a[x])}/${term(K, '')}`, r: M`${aS(y)} = ${ex(a[y])} [m s^-2]` });
        } else if (a[x] == null && a[y] == null && ((gain(x) && gain(y)) || rel.m != null)) {
          // a = (change of speed) ÷ time, so with changes of speed in a fixed
          // ratio c, a_x = k a_y is a ratio of times: t_x = (c ⁄ k) t_y
          const c = gain(x) && gain(y) ? ratio(gain(x), gain(y)) : rel.m * K;
          if (c != null) {
            const m = c / K;
            const say = Math.abs(c - 1) < EPS ? 'same' : 'ratio';
            if (t[y] && !t[x]) {
              t[x] = mul(t[y], m); done = true;
              rows.push({ f: M`${aS(x)} = ${term(K, aS(y))} -> ${tS(x)} = ${term(m, tS(y), true)}`, s: M`${term(m, '')} * ${fb(t[y])}`, r: M`${tS(x)} = ${fs(t[x])}${u_(t[x], '[s]')}`, say });
            } else if (t[x] && !t[y]) {
              t[y] = mul(t[x], 1 / m); done = true;
              rows.push({ f: M`${aS(x)} = ${term(K, aS(y))} -> ${tS(y)} = ${term(1 / m, tS(x), true)}`, s: M`${term(1 / m, '')} * ${fb(t[x])}`, r: M`${tS(y)} = ${fs(t[y])}${u_(t[y], '[s]')}`, say });
            }
          }
        }
        if (done) { used.add('rel'); how.add('rel'); changed = true; }
      }
      const open = idx.filter((i) => !t[i]);
      if (have(spec.T) && !used.has('T') && open.length === 1) {
        const q = open[0], others = idx.filter((i) => i !== q);
        t[q] = sub(F(spec.T), add(F(0), ...others.map((i) => t[i])));
        rows.push({ f: M`${tS(q)} = T${others.map((i) => ` - ${tS(i)}`).join('')}`,
                    s: M`${d(spec.T)}${others.map((i) => ` - ${fb(t[i])}`).join('')}`, r: M`${tS(q)} = ${fs(t[q])}${u_(t[q], '[s]')}` });
        used.add('T'); how.add('T'); changed = true;
      }
    }
  };
  propagate();

  // A stage whose speeds, rate and time are all given says at once whether
  // they add up, before anything else is asked of the student.
  for (const i of idx) {
    if (kindOf(i) === 'hold' || !w[i - 1] || !w[i] || !isConst(w[i - 1]) || !isConst(w[i])) continue;
    const du = sg(i) * (w[i].c0 - w[i - 1].c0);
    if (!(du > EPS)) return fail(`Stage ${i} ${KINDS[kindOf(i)]}, but it goes from ${M`${d(w[i - 1].c0)}`} to ${M`${d(w[i].c0)} [m s^-1]`}. Check which way it changes, or the speeds.`);
    if (a[i] != null && t[i] && isConst(t[i]) && !used.has(`a${i}`) && Math.abs(du - a[i] * t[i].c0) > Math.max(1e-6, du * 0.002)) {
      return fail(`Stage ${i} does not add up: from ${M`${d(w[i - 1].c0)}`} to ${M`${d(w[i].c0)} [m s^-1]`} at ${M`${d(a[i])} [m s^-2]`} takes ${M`${d(du / a[i])} [s]`}, not ${M`${d(t[i].c0)} [s]`}. Clear one of them.`);
    }
  }

  // A relation between two rates is a relation between two times once the
  // two changes of speed are in a known ratio — both V, say, even before V
  // is known. That ratio is found by writing the open speed as V for a moment.
  if (rel?.kind === 'a' && a[rel.x] == null && a[rel.y] == null && !(gain(rel.x) && gain(rel.y))) {
    const keep = { w: w.slice(), t: t.slice(), a: a.slice(), used: [...used], how: [...how], n: rows.length };
    const open = [...w.keys()].find((i) => !w[i]);
    if (open != null) {
      unknown = { sym: 'V' }; w[open] = F(0, 1);
      const tx = t[rel.x], ty = t[rel.y]; t[rel.x] = t[rel.y] = null;
      propagate();
      const c = gain(rel.x) && gain(rel.y) ? ratio(gain(rel.x), gain(rel.y)) : null;
      keep.w.forEach((f, i) => { w[i] = f; }); keep.t.forEach((f, i) => { t[i] = f; }); keep.a.forEach((f, i) => { a[i] = f; });
      used.clear(); keep.used.forEach((k) => used.add(k)); how.clear(); keep.how.forEach((k) => how.add(k)); rows.length = keep.n;
      unknown = null; void tx; void ty;
      if (c != null) rel.m = c / rel.k;
    }
  }

  const openList = () => [...[...w.keys()].filter((i) => !w[i]).map((i) => (i ? `v${i}` : 'u')), ...idx.filter((i) => !t[i]).map((i) => `t${i}`)];
  // The equations a set of forms makes, each as [x², x, 1] in the unknown —
  // only those whose every quantity is already written down.
  const pieceArea = (i) => (kindOf(i) === 'hold' ? prod(w[i], t[i]) : qmul(prod(add(w[i - 1], w[i]), t[i]), 0.5));
  const equations = () => {
    const eqs = [], allT = idx.every((i) => t[i]), allW = w.every(Boolean);
    if (have(spec.D) && !used.has('D') && allT && allW) eqs.push({ key: 'D', area: true, q: qadd(...idx.map(pieceArea), [0, 0, -spec.D]) });
    if (have(spec.T) && !used.has('T') && allT) { const Tf = add(F(0), ...idx.map((i) => t[i])); eqs.push({ key: 'T', q: [0, Tf.c1, Tf.c0 - spec.T] }); }
    for (const i of idx) {
      if (kindOf(i) === 'hold' || a[i] == null || used.has(`a${i}`) || !w[i - 1] || !w[i] || !t[i]) continue;
      const X = sub(sub(w[i], w[i - 1]), mul(t[i], sg(i) * a[i]));
      eqs.push({ key: `a${i}`, i, q: [0, X.c1, X.c0] });
    }
    if (rel && !used.has('rel')) {
      if (rel.kind === 't' && t[rel.x] && t[rel.y]) { const X = sub(t[rel.x], mul(t[rel.y], rel.k)); eqs.push({ key: 'rel', q: [0, X.c1, X.c0] }); }
      else if (rel.kind === 'a' && a[rel.x] == null && a[rel.y] == null && rel.m != null && !(gain(rel.x) && gain(rel.y)) && t[rel.x] && t[rel.y]) {
        const X = sub(t[rel.x], mul(t[rel.y], rel.m)); eqs.push({ key: 'rel', q: [0, X.c1, X.c0] });
      } else if (rel.kind === 'a' && (a[rel.x] == null || a[rel.y] == null) && gain(rel.x) && gain(rel.y) && t[rel.x] && t[rel.y]) {
        // gain_x ⁄ t_x = k gain_y ⁄ t_y, multiplied out
        eqs.push({ key: 'rel', q: qadd(prod(gain(rel.x), t[rel.y]), qmul(prod(gain(rel.y), t[rel.x]), -rel.k)) });
      }
    }
    return eqs.filter((e) => Math.abs(e.q[0]) > EPS || Math.abs(e.q[1]) > EPS);
  };

  // What makes a value of the unknown impossible, said as the reason. Only
  // what is already written down is judged.
  const verdict = (xx) => {
    const W = w.map((f) => f && val(f, xx)), Tt = t.map((f) => f && val(f, xx));
    const tol = 1e-7 * Math.max(1, ...Tt.slice(1).filter((v) => v != null).map(Math.abs));
    if (unknown?.speed && !(W[unknown.at] >= -1e-9)) return 'is negative, and a speed cannot be';
    for (const i of w.keys()) if (W[i] != null && W[i] < -1e-7) return `makes ${M`${vS(i)} = ${d(W[i])} [m s^-1]`}, and a speed cannot be negative`;
    for (const i of idx) {
      if (Tt[i] == null) continue;
      if (Tt[i] < -tol || (kindOf(i) !== 'hold' && !(Tt[i] > EPS))) return `makes ${M`${tS(i)} = ${d(Tt[i])} [s]`}, and no stage takes ${Tt[i] < 0 ? 'negative' : 'no'} time`;
    }
    for (const i of idx) {
      if (kindOf(i) === 'hold' || W[i] == null || W[i - 1] == null) continue;
      if (!(sg(i) * (W[i] - W[i - 1]) > EPS)) {
        return `makes stage ${i} end at ${M`${d(W[i])} [m s^-1]`} from ${M`${d(W[i - 1])} [m s^-1]`}, and it ${KINDS[kindOf(i)]}`;
      }
    }
    return null;
  };

  // ONE UNKNOWN AT A TIME, as by hand. Whatever is open, one of its
  // quantities is taken as the unknown and everything that follows is
  // written in terms of it. If that leaves nothing open, the equation left
  // over (the area, nearly always) finds it. If something is still open but
  // an equation already has only this unknown in it — the whole time, when a
  // relation ties two times and the speed is still to find — that finds it
  // first, and the next unknown is taken from there.
  const steps = [];
  let rejected = [], rowStart = 0;
  const snap0 = () => ({ w: w.slice(), t: t.slice(), a: a.slice(), used: [...used], how: [...how], n: rows.length });
  const restore = (s) => {
    s.w.forEach((f, i) => { w[i] = f; }); s.t.forEach((f, i) => { t[i] = f; }); s.a.forEach((f, i) => { a[i] = f; });
    used.clear(); s.used.forEach((k) => used.add(k)); how.clear(); s.how.forEach((k) => how.add(k)); rows.length = s.n;
  };
  const speedSyms = () => steps.filter((s) => s.unknown.speed).map((s) => s.unknown.sym);
  const candidates = () => {
    const out = [];
    for (const i of w.keys()) {
      if (w[i]) continue;
      // the speed at A keeps its own name; a speed the paper leaves out
      // later in the journey is its V
      const sym = i === 0 ? 'u' : ['V', 'W', 'U'].find((s) => !speedSyms().includes(s));
      out.push({ key: i === 0 ? 'u' : 'V', sym, at: i, speed: true });
    }
    for (const i of [...(rel ? [rel.y, rel.x] : []), ...idx.filter((j) => kindOf(j) === 'hold'), ...idx]) {
      if (!t[i] && !out.some((c) => !c.speed && c.at === i)) out.push({ key: `t${i}`, sym: tS(i), at: i });
    }
    return out;
  };
  for (let guard = 0; openList().length && guard <= 2 * n + 2; guard++) {
    const base = snap0();
    let pick = null;
    restore(base);
    const cands = candidates();
    for (const whole of [true, false]) {
      for (const c of cands) {
        restore(base);
        unknown = c;
        if (c.speed) w[c.at] = F(0, 1); else t[c.at] = F(0, 1);
        propagate();
        const solver = equations()[0];
        if (!solver || (whole && openList().length)) continue;
        pick = { c, solver }; break;
      }
      if (pick) break;
    }
    if (!pick) {
      restore(base); unknown = null;
      // What is fixed already is worth saying: for the trapezium, V, T and D
      // alone give the steady time from the area, often the part asked for.
      let so = '';
      const trapez = n === 3 && kindOf(1) === 'up' && kindOf(2) === 'hold' && kindOf(3) === 'down' && spec.u === 0 && S[2].v === 0;
      const V = S[0].v;
      if (trapez && have(V) && have(spec.D) && have(spec.T) && !have(S[1].t)) {
        const t2 = 2 * spec.D / V - spec.T;
        if (t2 >= -1e-9) so = ` What is fixed so far: the area gives ${M`t_2 = (2D)/V - T = ${d(t2)} [s]`}; one more — a rate, or another time — splits the rest between speeding up and braking.`;
      }
      const list = openList().map((key) => M`${symOf(key)}`);
      return fail(`Not enough to fix the journey yet: ${list.join(', ')} ${list.length > 1 ? 'are' : 'is'} still open, and nothing given ties ${list.length > 1 ? 'them' : 'it'} down. `
        + 'A paper gives enough that the whole distance — the area under the speed–time graph — or the whole time finds what is left.' + so);
    }
    const { c, solver } = pick;
    const [p, q, r] = solver.q;
    // FIGURES ROUNDED FOR PRINT. A triangle — no steady stretch — has its
    // two roots exactly equal, and a paper's three-figure T and D can tip
    // the discriminant a hair below zero. Within that hair it is the
    // triangle the paper meant, not a journey that cannot be. And a
    // discriminant that is zero in exact arithmetic is one root, not two a
    // hair apart from floating-point dust.
    let roots, touch = false;
    if (Math.abs(p) > EPS) {
      const disc = q * q - 4 * p * r;
      if (Math.abs(disc) <= 1e-9 * Math.max(q * q, Math.abs(4 * p * r))) roots = [-q / (2 * p)];
      else if (disc < 0 && disc > -2e-3 * q * q) { roots = [-q / (2 * p)]; touch = true; }
      else roots = quadRoots(p, q, r);
    } else roots = [-r / q];
    roots = roots.map(snap);
    const good = roots.filter((xx) => !verdict(xx));
    const rj = roots.filter((xx) => verdict(xx)).map((xx) => ({ x: xx, why: verdict(xx), sym: c.sym }));
    if (!good.length) {
      return fail(roots.length
        ? `No journey fits those numbers: ${rj.map((z) => `${M`${c.sym} = ${d(z.x)}`} ${z.why}`).join('; ')}.`
        : 'No journey fits those numbers: the equation for the unknown has no real solution — the distance is too long for that time at those rates.');
    }
    const x = good[0];
    if (good.length > 1) rj.push(...good.slice(1).map((xx) => ({ x: xx, why: 'is the other root; both fit, and the smaller is taken', sym: c.sym })));
    rejected.push(...rj);
    steps.push({ solver, quad: [p, q, r], roots, touch, unknown: c, x, rejected: rj, from: rowStart, to: rows.length, how: [...how],
      lin: { w: w.slice(), t: t.slice(), T: idx.every((i) => t[i]) ? add(F(0), ...idx.map((i) => t[i])) : null },
      // whether anything had to be written in terms of the unknown (a speed
      // held from V is V itself, not a speed that depends on it)
      dependsOn: [...w, ...t.slice(1)].some((fm) => fm && !isConst(fm) && !(Math.abs(fm.c0) < EPS && Math.abs(fm.c1 - 1) < EPS)) });
    used.add(solver.key);
    // the unknown is a number now: everything written in it is too
    for (const i of w.keys()) if (w[i]) w[i] = F(snap(val(w[i], x)));
    for (const i of idx) if (t[i]) t[i] = F(snap(val(t[i], x)));
    unknown = null; rowStart = rows.length;
    propagate();
  }
  if (!steps.length) {
    const bad = verdict(0);
    if (bad) return fail(`Those numbers cannot be: what is given ${bad}.`);
  }
  const last = steps[steps.length - 1];

  // Everything, as numbers.
  const J = { n, kinds: S.map((st) => st.kind), w: w.map((f) => snap(f.c0)), t: [null], a: [null], s: [null] };
  const Tsum = idx.reduce((s, i) => s + t[i].c0, 0);
  // a steady stretch within dust of nothing is nothing: the triangle
  for (const i of idx) { const ti = snap(t[i].c0); J.t[i] = Math.abs(ti) < 1e-6 * Math.max(1, Math.abs(Tsum)) ? 0 : ti; }
  for (const i of idx) {
    J.a[i] = kindOf(i) === 'hold' ? 0 : snap(sg(i) * (J.w[i] - J.w[i - 1]) / J.t[i]);
    J.s[i] = snap(kindOf(i) === 'hold' ? J.w[i] * J.t[i] : 0.5 * (J.w[i - 1] + J.w[i]) * J.t[i]);
  }
  J.T = snap(idx.reduce((s, i) => s + J.t[i], 0));
  J.D = snap(idx.reduce((s, i) => s + J.s[i], 0));
  J.u = J.w[0];
  for (const i of idx) Object.assign(J, { [`v${i}`]: J.w[i], [`t${i}`]: J.t[i], [`a${i}`]: J.a[i], [`s${i}`]: J.s[i] });
  const vStep = steps.find((s) => s.unknown.key === 'V');
  J.V = vStep ? J.w[vStep.unknown.at] : Math.max(...J.w);
  if (!(J.T > EPS)) return fail('Every stage takes no time: there is no journey to describe.');
  if (verdict(0)) return fail('Those numbers make one of the stages impossible. Check them against the paper.');

  // Anything given and not used to solve must agree with the answer.
  // Within a hair of each other they agree; within rounding (0.2 %) they are
  // accepted and the note says which figure was used; beyond that, refused.
  const replaced = [];
  for (const [q, v] of Object.entries(given)) {
    const off = Math.abs(J[q] - v);
    if (off <= Math.max(1e-6, Math.abs(v) * 1e-6)) continue;
    if (off <= Math.abs(v) * 0.002) { replaced.push(q); continue; }
    return fail(`Those do not agree: the rest give ${M`${symOf(q)} = ${d(J[q])} ${unitOf(q)}`}, but you gave ${M`${d(v)} ${unitOf(q)}`}. Clear one of them.`);
  }
  if (rel) {
    const Lr = rel.kind === 't' ? J.t : J.a, sy = rel.kind === 't' ? tS : aS;
    const lhs = Lr[rel.x], rhs = rel.k * Lr[rel.y];
    if (Math.abs(lhs - rhs) > Math.max(1e-6, Math.abs(lhs) * 0.002)) {
      return fail(`Those do not agree with the relation: ${M`${sy(rel.x)} = ${d(lhs)}`}, not ${term(rel.k, '')} × ${d(Lr[rel.y])}. Clear one of them.`);
    }
  }

  const trapezium = n === 3 && J.kinds.join() === 'up,hold,down' && J.w[0] === 0 && J.w[3] === 0;
  const f = journeyMotion(J);
  const answers = askAt(f, J, spec.at || {});
  f.answers = answers;              // the stage rings the instants they name
  // and names the speeds that were found on the speed axis: V = 4, u = 7.5
  f.named = Object.fromEntries(steps.filter((s) => s.unknown.speed).map((s) => [s.unknown.at, s.unknown.sym]));
  const notes = [];
  if (trapezium && J.t[2] < EPS) notes.push('No steady stretch: it starts braking the moment it reaches its top speed, so the graph is a triangle.');
  if (steps.some((s) => s.touch)) notes.push('The figures given are rounded, and only just allow the journey: taken as a triangle, as they were meant.');
  for (const q of replaced) notes.push(`You gave ${M`${symOf(q)} = ${d(given[q])} ${unitOf(q)}`}; the rest fix it at ${M`${d(J[q])} ${unitOf(q)}`}, and that is what is used — the difference is rounding.`);
  for (const ans of answers) notes.push(ans.ok ? ans.text : ans.note);
  // what the paper did not give, worked out — a found speed by its own name
  const derived = [];
  for (const s of steps.filter((z) => z.unknown.speed)) derived.push(M`${s.unknown.sym} = ${d(J.w[s.unknown.at])} [m s^-1]`);
  for (const i of w.keys()) {
    const key = i ? `v${i}` : 'u';
    if (!(key in given) && !(i in f.named) && (i === 0 || kindOf(i) !== 'hold')) derived.push(M`${vS(i)} = ${d(J.w[i])} [m s^-1]`);
  }
  for (const i of idx) if (!(`t${i}` in given)) derived.push(M`${tS(i)} = ${d(J.t[i])} [s]`);
  for (const i of idx) if (kindOf(i) !== 'hold' && !(`a${i}` in given)) derived.push(M`${aS(i)} = ${d(J.a[i])} [m s^-2]`);
  if (!('T' in given)) derived.push(M`T = ${d(J.T)} [s]`);
  if (!('D' in given)) derived.push(M`D = ${d(J.D)} [m]`);
  const BY = { D: 'the area under the speed–time graph, which is the whole distance,', T: 'the whole time', rel: 'the relation between the two stages' };
  for (const s of steps) s.fixedBy = BY[s.solver.key] || `stage ${s.solver.i}'s rate`;

  return {
    ok: true, mode: 'journey', axis: 'along', J, given: Object.keys(given),
    // the last unknown found (the only one, nearly always)
    unknown: last?.unknown.key ?? null, sym: last?.unknown.sym ?? null, x: last?.x ?? null,
    rejected, rows, steps, rel, f, answers, trapezium,
    dependsOn: !!last?.dependsOn,
    fixedBy: last?.fixedBy ?? null,
    params: { V: J.V, T: J.T, D: J.D }, notes, derived, Dgiven: have(spec.D) ? spec.D : J.D,
    convention: 'From A to B, the direction of travel positive.',
  };
}

/* ── the motion: the stages, one after another ────────────────────────── */
export function journeyMotion(J) {
  const list = [];
  let t0 = 0, x0 = 0;
  for (let i = 1; i <= J.n; i++) {
    if (J.t[i] > EPS) list.push({ t0, t1: t0 + J.t[i], x0, u: J.w[i - 1], a: J.kinds[i - 1] === 'down' ? -J.a[i] : J.a[i], kind: J.kinds[i - 1], i });
    t0 += J.t[i]; x0 += J.s[i];
  }
  const m = staged(list);
  const clampT = (tt) => Math.min(Math.max(tt, 0), J.T);
  const end = J.w[J.n];
  return {
    kind: 'journey', J, tMax: J.T, tFlight: J.T, range: J.D,
    params: { u: J.w[0], a: J.a[1], s: J.D, v: end, t: J.T, g: 0, h: 0, theta: 0, V: J.V },
    stages: m.stages,
    // at B it is at B, at its last speed: exactly, not a rounding error from it
    pos: (tt) => ({ x: tt >= J.T - 1e-12 ? J.D : tt <= 0 ? 0 : m.pos(clampT(tt)), y: 0 }),
    vel: (tt) => ({ x: tt >= J.T - 1e-12 ? end : tt <= 0 ? J.w[0] : m.vel(clampT(tt)), y: 0 }),
    speed: (tt) => Math.abs(tt >= J.T - 1e-12 ? end : tt <= 0 ? J.w[0] : m.vel(clampT(tt))),
    accel: (tt) => m.acc(clampT(tt)),
    stageAt: (tt) => m.stageAt(clampT(tt)) || m.stages[m.stages.length - 1],
    /** When each stage starts, by stage number: t₁ + … + t_{i−1}. */
    startOf: (i) => { let s = 0; for (let j = 1; j < i; j++) s += J.t[j]; return s; },
    bounces: 0, segments: [], horiz: null, uy: 0, ux: 0,
    kineticEnergy: () => 0, momentum: () => 0,
    path(nn = 200, tEnd = J.T) {
      const out = [];
      for (let i = 0; i <= nn; i++) { const tt = (i / nn) * tEnd; out.push({ t: tt, x: m.pos(tt), y: 0 }); }
      return out;
    },
  };
}

/* ── the questions asked after the trip is fixed ─────────────────────────
   the speed at an instant, and how far it has gone; when it has gone a given
   distance; when it is doing a given speed. Each one is SUVAT inside the
   stage it falls in, timed from that stage's start, then added on to the
   stages before it — how it is done by hand. */
const WORD = { up: 'speeding up', hold: 'at a steady speed', down: 'slowing down' };
const sumSym = (i) => Array.from({ length: i - 1 }, (_, j) => tS(j + 1)).join(' + ');
const sumS = (i) => Array.from({ length: i - 1 }, (_, j) => sS(j + 1)).join(' + ');
export function askAt(f, J, at = {}) {
  // Every substitution uses the stage's own speeds and its exact rate — ⅔,
  // not 0.6667 — so the numbers on screen multiply out to the answer.
  const out = [];
  const startOf = f.startOf;
  const before = (i) => { let s = 0; for (let j = 1; j < i; j++) s += J.s[j]; return snap(s); };
  /** "t = t₁ + t₂ + 22.5" — the time into a stage, added to the stages before. */
  const total = (i, tau, tt) => (i > 1 ? [{ f: M`t = ${sumSym(i)} + ${d(tau)}`, s: M`${Array.from({ length: i - 1 }, (_, j) => d(J.t[j + 1])).join(' + ')} + ${d(tau)}`, r: M`t = ${d(tt)} [s]` }] : []);
  const opOf = (i) => (J.kinds[i - 1] === 'down' ? '-' : '+');
  if (have(at.t)) {
    const tt = at.t;
    if (tt < 0 || tt > J.T + 1e-9) out.push({ kind: 't', ok: false, note: `${M`t = ${d(tt)} [s]`} is outside the journey, which takes ${M`${d(J.T)} [s]`}.` });
    else if (tt <= 1e-12) {
      out.push({ kind: 't', ok: true, t: 0, v: J.w[0], s: 0, stage: 'start', rows: [{ f: M`v = u`, s: '', r: M`v = ${d(J.w[0])} [m s^-1]` }],
        text: J.w[0] === 0 ? `At ${M`t = 0`} it is at rest at A.` : `At ${M`t = 0`} it is passing A at ${M`${d(J.w[0])} [m s^-1]`}.` });
    } else {
      const st = f.stageAt(tt), i = st.i, tau = snap(tt - st.t0);
      const v = snap(f.vel(tt).x), s = snap(f.pos(tt).x), whole = Math.abs(tau - J.t[i]) < 1e-9;
      const k = J.kinds[i - 1], op = opOf(i);
      const rows = k === 'hold'
        ? [{ f: M`v = u`, s: '', r: M`v = ${d(v)} [m s^-1]` }]
        : [{ f: M`v = u ${op} at`, s: M`${d(J.w[i - 1])} ${op} ${ex(J.a[i])} * ${d(tau)}`, r: M`v = ${d(v)} [m s^-1]` }];
      // how far: the stages already finished, plus this one so far
      const piece = whole ? sS(i) : k === 'hold' ? 'ut' : `ut ${op} ½at^2`;
      const pieceNum = whole ? d(J.s[i]) : k === 'hold' ? `${d(J.w[i - 1])} * ${d(tau)}` : `${d(J.w[i - 1])} * ${d(tau)} ${op} ½ * ${ex(J.a[i])} * ${d(tau)}^2`;
      rows.push(i > 1 || whole
        ? { f: M`s = ${i > 1 ? `${sumS(i)} + ` : ''}${whole && i === 1 ? sS(1) : whole ? sS(i) : `(${piece})`}`,
            s: M`${Array.from({ length: i - 1 }, (_, j) => `${d(J.s[j + 1])} + `).join('')}${whole ? pieceNum : `(${pieceNum})`}`, r: M`s = ${d(s)} [m]` }
        : { f: M`s = ${piece}`, s: M`${pieceNum}`, r: M`s = ${d(s)} [m]` });
      const end = tt >= J.T - 1e-9;
      out.push({ kind: 't', ok: true, t: tt, v, s, stage: k, i, rows,
        note: i > 1 ? `In stage ${i}, timed from its start at ${M`t = ${d(st.t0)} [s]`}: ${M`${d(tau)} [s]`} into it. The distance is the stages before it, the areas under their pieces of the graph, and this one so far.` : '',
        text: end ? (v === 0 ? `At ${M`t = ${d(tt)} [s]`} it is at rest at B, ${M`${d(J.D)} [m]`} from A.`
          : `At ${M`t = ${d(tt)} [s]`} it is passing B, ${M`${d(J.D)} [m]`} from A, at ${M`${d(v)} [m s^-1]`}.`)
          : `At ${M`t = ${d(tt)} [s]`} it is ${WORD[k]}, doing ${M`${d(v)} [m s^-1]`}, ${M`${d(s)} [m]`} from A.` });
    }
  }
  if (have(at.s)) {
    const s = at.s;
    if (s < 0 || s > J.D + 1e-9) out.push({ kind: 's', ok: false, note: `${M`${d(s)} [m]`} is beyond the journey, which is ${M`${d(J.D)} [m]`}.` });
    else if (s < 1e-12) out.push({ kind: 's', ok: true, t: 0, s: 0, v: J.w[0], rows: [], text: `It is at A at ${M`t = 0`}.` });
    else {
      // the stage it is in when it has gone s
      let i = 1;
      while (i < J.n && (J.s[i] < EPS || before(i + 1) < s - 1e-9)) i++;
      while (i > 1 && J.t[i] < EPS) i--;
      const rem = snap(s - before(i)), k = J.kinds[i - 1], u = J.w[i - 1], A = J.a[i];
      let tau;
      if (k === 'hold') tau = rem / u;
      else {
        // ½(±a)τ² + uτ − rem = 0: the first time in the stage it has gone that far
        const c2 = (k === 'down' ? -0.5 : 0.5) * A;
        tau = quadRoots(c2, u, -rem).filter((r) => r >= -1e-9 && r <= J.t[i] + 1e-6).sort((p, q) => p - q)[0] ?? J.t[i];
      }
      tau = snap(Math.min(Math.max(tau, 0), J.t[i]));
      const tt = snap(startOf(i) + tau);
      const lhs = i > 1 ? `${d(s)} - ${i > 2 ? `(${Array.from({ length: i - 1 }, (_, j) => d(J.s[j + 1])).join(' + ')})` : d(J.s[1])}` : d(s);
      const rows = [k === 'hold'
        ? { f: M`s = ut`, s: M`${lhs} = ${d(u)}t`, r: M`t = ${d(tau)} [s]` }
        : { f: M`s = ut ${opOf(i)} ½at^2`, s: M`${lhs} = ${u ? `${d(u)}t ` : ''}${u ? opOf(i) : (opOf(i) === '-' ? '-' : '')} ½ * ${ex(A)}t^2`, r: M`t = ${d(tau)} [s]` },
        ...total(i, tau, tt)];
      out.push({ kind: 's', ok: true, t: tt, s, v: f.vel(tt).x, stage: k, i, rows,
        note: i > 1 ? `It has gone ${M`${d(before(i))} [m]`} by the end of stage ${i - 1}, so the rest is in stage ${i}, timed from its start.` : '',
        text: `It has gone ${M`${d(s)} [m]`} at ${M`t = ${d(tt)} [s]`}.` });
    }
  }
  if (have(at.v)) {
    const v = at.v, top = Math.max(...J.w), low = Math.min(...J.w);
    if (v < 0 || v > top + 1e-9 || v < low - 1e-9) {
      out.push({ kind: 'v', ok: false, note: `It never does ${M`${d(v)} [m s^-1]`}: its speed is always between ${M`${d(low)}`} and ${M`${d(top)} [m s^-1]`}.` });
    } else {
      // every stage that passes through v, or holds it — one occasion each:
      // reaching v and then holding it is one occasion, not two
      const occ = [], rows = [];
      const at = (tt) => (tt < 1e-9 ? `at ${M`t = 0`}, at A` : Math.abs(tt - J.T) < 1e-9 ? `at ${M`t = ${d(tt)} [s]`}, at B` : `at ${M`t = ${d(tt)} [s]`}`);
      for (let i = 1; i <= J.n; i++) {
        if (J.t[i] < EPS) continue;
        const u = J.w[i - 1], w = J.w[i], t0 = snap(startOf(i)), t1 = snap(t0 + J.t[i]), k = J.kinds[i - 1];
        const prev = occ[occ.length - 1];
        if (k === 'hold') {
          if (Math.abs(u - v) > 1e-9) continue;
          if (prev && Math.abs((prev.to ?? prev.t) - t0) < 1e-7) { prev.to = t1; prev.say = `from ${M`t = ${d(prev.t)} [s]`} to ${M`t = ${d(t1)} [s]`}, holding it`; }
          else occ.push({ t: t0, to: t1, say: `from ${M`t = ${d(t0)} [s]`} to ${M`t = ${d(t1)} [s]`}, holding it` });
          continue;
        }
        if ((v - u) * (v - w) > 1e-9) continue;
        const tau = snap(Math.abs(v - u) / J.a[i]), tt = snap(t0 + tau);
        if (prev && Math.abs((prev.to ?? prev.t) - tt) < 1e-7) continue;
        if (tau > 1e-9) rows.push({ f: M`v = u ${opOf(i)} at`, s: M`${d(v)} = ${d(u)} ${opOf(i)} ${term(J.a[i], 't')}`, r: M`t = ${d(tau)} [s]` }, ...total(i, tau, tt));
        const where = tt < 1e-9 ? (v === 0 ? `${at(tt)}, at rest` : `${at(tt)}, passing it`) : `${at(tt)}, ${WORD[k]}${J.n > 1 ? ` in stage ${i}` : ''}`;
        occ.push({ t: tt, say: Math.abs(tt - J.T) < 1e-9 && v === 0 ? `${at(tt)}, at rest` : where });
      }
      const times = [...new Set(occ.flatMap((o) => (o.to != null ? [o.t, o.to] : [o.t])))].sort((p, q) => p - q);
      const N = occ.length;
      out.push({ kind: 'v', ok: true, v, times, rows,
        text: !N ? `It is doing ${M`${d(v)} [m s^-1]`} only at the change between two stages.`
          : `It is doing ${M`${d(v)} [m s^-1]`} ${N === 1 ? '' : N === 2 ? 'twice: ' : `${N} times: `}${occ.map((o) => o.say).join(N > 2 ? '; ' : ', and ')}.` });
    }
  }
  return out;
}

/* ── the working ──────────────────────────────────────────────────────── */
export function journeyWorking(solved) {
  if (!solved?.ok) return [];
  const { J, rows, steps, answers } = solved;
  const out = [];
  const idx = Array.from({ length: J.n }, (_, j) => j + 1);
  const kindOf = (i) => J.kinds[i - 1];
  const noteFor = (how, rs, lead) => [
    lead,
    how.includes('rate') ? `Each stage that changes speed is ${M`v = u + at`} on its own, with ${M`u`} its speed at the start and ${M`v`} at the end; slowing down, ${M`v = u - at`}.` : '',
    how.includes('rel') ? (rs.some((r) => r.say === 'same') ? 'The two stages change speed by the same amount, so the rates are in the opposite ratio to the times.' : 'The relation gives one stage from another.') : '',
    how.includes('T') ? 'The last time is what is left of the whole time.' : '',
  ].filter(Boolean).join(' ');
  if (!steps.length && rows.length) out.push({ title: 'Each stage from what is given', rows, note: noteFor(solved.how ?? [], rows, '') });
  steps.forEach((st, k) => {
    const sym = st.unknown.sym, lin = st.lin;
    const fs = (f) => formSrc(f, sym), fb = (f) => br(f, sym);
    const rs = rows.slice(st.from, st.to);
    const after = k ? `With ${M`${steps[k - 1].unknown.sym} = ${d(steps[k - 1].x)}`} found, ` : '';
    if (rs.length) {
      out.push({
        title: st.dependsOn ? `Each stage in terms of ${sym === 'V' || sym === 'u' ? sym : 'the unknown'}` : k ? 'What that fixes' : 'Each stage from what is given',
        rows: rs,
        note: noteFor(st.how, rs, st.dependsOn
          ? `${after}${M`${sym}`} is the one quantity ${k ? 'still to find' : 'not given'}, so everything that depends on it is written in terms of it, and one equation is left to find it.`
          : `${after}every other time follows from what is given; ${M`${sym}`} is what is left to find.`.replace(/^every/, k ? 'every' : 'Every')),
      });
    }
    const { solver, quad: [p, q, r], roots } = st;
    const eqRows = [];
    // written with a positive leading term, as by hand
    const sgn = (Math.abs(p) > EPS ? p : q) < 0 ? -1 : 1;
    const [P, Q, R] = [p * sgn, q * sgn, r * sgn];
    const lhs = Math.abs(P) > EPS ? M`${quadSrc(P, Q, R, sym)} = 0` : M`${quadSrc(0, Q, 0, sym)} = ${d(-R)}`;
    if (solver.area && solved.trapezium) {
      eqRows.push({ f: M`D = ½(T + t_2)V`, s: M`${d(solved.Dgiven)} = ½(${fs(lin.T)} + ${fs(lin.t[2])}) * ${fb(lin.w[1])}`, r: lhs });
    } else if (solver.area) {
      // each stage's piece of the area, then the pieces added up
      const one = (x) => { const n0 = [x[0], x[1], x[2]].filter((c) => Math.abs(c) > EPS).length; return n0 === 0 ? '0' : Math.abs(x[0]) < EPS && Math.abs(x[1]) < EPS ? d(x[2]) : n0 > 1 ? `(${quadSrc(...x, sym)})` : quadSrc(...x, sym); };
      const pcs = [];
      for (const i of idx) {
        const W0 = lin.w[i - 1], W1 = lin.w[i], Ti = lin.t[i];
        const piece = kindOf(i) === 'hold' ? prod(W1, Ti) : qmul(prod(add(W0, W1), Ti), 0.5);
        const known = Math.abs(piece[0]) < EPS && Math.abs(piece[1]) < EPS;
        pcs.push(piece);
        eqRows.push(kindOf(i) === 'hold'
          ? { f: M`${sS(i)} = ut`, s: M`${fb(W1)} * ${fb(Ti)}`, r: M`${sS(i)} = ${known ? d(piece[2]) : quadSrc(...piece, sym)}${known ? ' [m]' : ''}` }
          : { f: M`${sS(i)} = ½(u + v)t`, s: M`½(${fs(W0)} + ${fs(W1)}) * ${fb(Ti)}`, r: M`${sS(i)} = ${known ? d(piece[2]) : quadSrc(...piece, sym)}${known ? ' [m]' : ''}` });
      }
      eqRows.push({ f: M`D = ${idx.map(sS).join(' + ')}`, s: M`${d(solved.Dgiven)} = ${pcs.map(one).join(' + ')}`, r: lhs });
    } else if (solver.key === 'T') {
      eqRows.push({ f: M`T = ${idx.map(tS).join(' + ')}`, s: M`${d(J.T)} = ${idx.map((i) => fb(lin.t[i])).join(' + ')}`, r: lhs });
    } else if (solver.key === 'rel') {
      const { rel } = solved;
      if (rel.kind === 't') eqRows.push({ f: M`${tS(rel.x)} = ${term(rel.k, tS(rel.y))}`, s: M`${fb(lin.t[rel.x])} = ${term(rel.k, '')} * ${fb(lin.t[rel.y])}`, r: lhs });
      else {
        const G = (i) => mul(sub(lin.w[i], lin.w[i - 1]), kindOf(i) === 'down' ? -1 : 1);
        eqRows.push({ f: M`${aS(rel.x)} = ${term(rel.k, aS(rel.y))}`, s: M`(${fs(G(rel.x))})/(${fs(lin.t[rel.x])}) = ${term(rel.k, '')} * (${fs(G(rel.y))})/(${fs(lin.t[rel.y])})`, r: lhs });
      }
    } else {
      const i = solver.i, op = kindOf(i) === 'down' ? '-' : '+';
      eqRows.push({ f: M`v = u ${op} at`, s: M`${fb(lin.w[i])} = ${fb(lin.w[i - 1])} ${op} ${ex(J.a[i])} * ${fb(lin.t[i])}`, r: lhs });
    }
    const whole = (c) => Math.abs(c - Math.round(c)) < 1e-9;
    const unitX = st.unknown.speed ? '[m s^-1]' : '[s]';
    if (Math.abs(P) > EPS) {
      let [a, b, c] = [P, Q, R];
      // decimals cleared first, by the smallest whole number that clears them
      if (![a, b, c].every(whole)) {
        const m = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 40, 50, 100, 1000].find((z) => [a, b, c].every((y) => whole(snap(y * z))));
        if (m) { [a, b, c] = [a, b, c].map((y) => snap(y * m)); eqRows.push({ f: '', s: M`"×" ${m}`, r: M`${quadSrc(a, b, c, sym)} = 0` }); }
      }
      // then divided through by a whole number that leaves whole numbers
      const gcd = (x, y) => (y ? gcd(y, x % y) : Math.abs(x));
      const gg = [a, b, c].every(whole) ? [a, b, c].map(Math.round).reduce(gcd) : 1;
      if (gg > 1) { [a, b, c] = [a, b, c].map((y) => y / gg); eqRows.push({ f: '', s: M`"÷" ${gg}`, r: M`${quadSrc(a, b, c, sym)} = 0` }); }
      if (Math.abs(b) < EPS) {
        // no middle term: a square root, as by hand
        eqRows.push({ f: '', s: M`${sym}^2 = ${d(-c / a)}`, r: roots.length > 1 ? M`${sym} = ${d(roots[1])} "or" ${sym} = ${d(roots[0])}` : M`${sym} = ${d(st.x)} ${unitX}` });
      } else if (a === 1 && whole(b) && whole(c) && roots.every(whole) && roots.length > 1) {
        // it factorises, which is how the mark schemes do it
        const fac = roots.map((x) => `(${sym} ${x < 0 ? '+' : '-'} ${d(Math.abs(x))})`).join('');
        eqRows.push({ f: M`${fac} = 0`, s: '', r: M`${sym} = ${d(roots[0])} "or" ${sym} = ${d(roots[1])}` });
      } else {
        const sa = whole(a) ? d(a) : `(${term(a, '')})`, sB = signed(b), sc = signed(c);
        eqRows.push({ f: M`${sym} = (-b +- sqrt(b^2 - 4ac))/(2a)`,
                      s: M`(-${sB} +- sqrt(${sB}^2 - 4 * ${sa} * ${sc}))/(2 * ${sa})`,
                      r: roots.length > 1 ? M`${sym} = ${d(roots[0])} "or" ${sym} = ${d(roots[1])}` : M`${sym} = ${d(st.x)}` });
      }
    } else {
      const sQ = whole(Q) ? d(Q) : `(${term(Q, '')})`;
      eqRows.push({ f: '', s: M`${sym} = ${d(-R)}/${sQ}`, r: M`${sym} = ${d(st.x)} ${unitX}` });
    }
    const why = st.rejected.map((rj) => `${M`${sym} = ${d(rj.x)}`} ${rj.why}, so it is rejected.`).join(' ');
    out.push({
      title: solver.area ? 'The area under the speed–time graph is the distance' : solver.key === 'T' ? 'The whole time' : 'The one equation left',
      rows: eqRows,
      note: (solver.area ? (solved.trapezium ? (J.t[2] > EPS
        ? 'The graph is a trapezium: the two parallel sides are the whole time and the steady time, and its height is the top speed. '
        : `With no steady stretch the graph is a triangle, base the whole time and height the top speed: the same formula with ${M`t_2 = 0`}. `)
        : `Each stage is one piece of the area: a rectangle where the speed holds, ${M`ut`}; a trapezium where it changes, ${M`½(u + v)t`} — a triangle when it starts or ends at rest. Together they are the whole distance. `) : '')
        + (st.touch ? 'The figures given are rounded and the discriminant comes out a hair below zero: the triangle they describe is the root used. ' : '')
        + why,
    });
  });
  const opOf = (i) => (J.kinds[i - 1] === 'down' ? '-' : '+');
  out.push({
    title: 'The whole journey',
    rows: [
      { f: M`T = ${idx.map(tS).join(' + ')}`, s: M`${idx.map((i) => d(J.t[i])).join(' + ')}`, r: M`T = ${d(J.T)} [s]` },
      ...idx.filter((i) => J.kinds[i - 1] !== 'hold').map((i) => ({
        f: M`${aS(i)} = (${opOf(i) === '+' ? 'v - u' : 'u - v'})/t`,
        s: M`(${opOf(i) === '+' ? `${d(J.w[i])} - ${d(J.w[i - 1])}` : `${d(J.w[i - 1])} - ${d(J.w[i])}`})/${d(J.t[i])}`, r: M`${aS(i)} = ${d(J.a[i])} [m s^-2]` })),
      ...idx.map((i) => (J.kinds[i - 1] === 'hold'
        ? { f: M`${sS(i)} = ut`, s: M`${d(J.w[i])} * ${d(J.t[i])}`, r: M`${sS(i)} = ${d(J.s[i])} [m]` }
        : { f: M`${sS(i)} = ½(u + v)t`, s: M`½(${d(J.w[i - 1])} + ${d(J.w[i])}) * ${d(J.t[i])}`, r: M`${sS(i)} = ${d(J.s[i])} [m]` })),
    ],
    note: `Each rate is the size of the stage's change of speed over its time. Each distance is the area of its own piece of the graph, and together they are ${M`D = ${d(J.D)} [m]`}.`,
  });
  for (const ans of answers.filter((x) => x.ok)) {
    out.push({
      title: ans.kind === 't' ? `At ${M`t = ${d(ans.t)} [s]`}` : ans.kind === 's' ? `When it has gone ${M`${d(ans.s)} [m]`}` : `When it is doing ${M`${d(ans.v)} [m s^-1]`}`,
      rows: ans.rows, note: [ans.note, ans.text].filter(Boolean).join(' '),
    });
  }
  return out;
}
