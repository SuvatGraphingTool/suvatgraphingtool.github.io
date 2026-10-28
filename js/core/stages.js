// stages.js — a motion along one straight line, in stages of constant
// acceleration, and the moments two such motions are at the same place.
//
// Every SUVAT question about two objects is this: each object's position is
// a quadratic in t for as long as its acceleration holds, and the questions
// "when do they meet", "when does B overtake A", "when do they collide" are
// all the same equation — position of one equals position of the other —
// solved stage by stage. Between two consecutive stage changes (of EITHER
// object) the difference of the two positions is itself a quadratic, so the
// meetings are its roots and nothing is found by searching.
//
// A stage is { t0, t1, x0, u, a, kind }: from time t0 to t1 the object starts
// at x0 with velocity u and accelerates at a. Before the first stage it is
// where the first stage starts, at rest; after the last it is where the last
// one ends, at rest. `kind` is a word the caller chooses ('held', 'free',
// 'rest', 'accelerating'...) and is carried, never interpreted.
//
// Nothing here knows which way is up, or that there is a ground. The callers
// (js/core/pair.js) decide what the axis means.

const EPS = 1e-9;

/** Where a stage has the object at a time inside it. */
const at = (st, t) => {
  const tau = t - st.t0;
  return { x: st.x0 + st.u * tau + 0.5 * st.a * tau * tau, v: st.u + st.a * tau, a: st.a };
};

/**
 * A motion made of stages, asked the questions a flight is asked.
 * @param {Array<{t0:number,t1:number,x0:number,u:number,a:number,kind?:string}>} stages
 *        in order, each starting where (and when) the one before ended
 */
export function staged(stages) {
  if (!stages.length) throw new Error('A motion needs at least one stage.');
  const first = stages[0], last = stages[stages.length - 1];
  const stageAt = (t) => {
    if (t < first.t0) return null;                        // before it starts
    for (const st of stages) if (t <= st.t1 + EPS) return st;
    return undefined;                                     // after it ends
  };
  const end = at(last, last.t1);
  const state = (t) => {
    const st = stageAt(t);
    if (st === null) return { x: first.x0, v: 0, a: 0, stage: null };
    if (st === undefined) return { x: end.x, v: 0, a: 0, stage: undefined };
    return { ...at(st, t), stage: st };
  };
  return {
    stages,
    start: first.t0,
    end: last.t1,
    state,
    pos: (t) => state(t).x,
    vel: (t) => state(t).v,
    acc: (t) => state(t).a,
    stageAt,
  };
}

/** Every time a stage of a motion begins or ends: where its quadratic changes. */
const breaks = (m) => m.stages.flatMap((st) => [st.t0, st.t1]).filter(isFinite);

/**
 * Every moment in [from, to] that two motions are at the same place.
 *
 * Between consecutive breakpoints both are quadratics in t, so their
 * difference D(τ) = Δx + Δv τ + ½ Δa τ² is too, and its roots in the interval
 * are the meetings. An interval over which D is identically zero means they
 * are moving together; that is reported once, as `together`, rather than as
 * infinitely many meetings.
 *
 * @returns {Array<{t:number, x:number, vA:number, vB:number, together?:boolean, until?:number}>}
 */
export function meetings(A, B, { from = 0, to } = {}) {
  const ts = [...new Set([from, to, ...breaks(A), ...breaks(B)])]
    .filter((t) => t >= from - EPS && t <= to + EPS).sort((p, q) => p - q);
  const out = [];
  const push = (t, extra = {}) => {
    if (out.some((m) => Math.abs(m.t - t) < 1e-7)) return;
    const a = A.state(t), b = B.state(t);
    out.push({ t, x: a.x, vA: a.v, vB: b.v, ...extra });
  };
  for (let i = 0; i < ts.length - 1; i++) {
    const p = ts[i], q = ts[i + 1], len = q - p;
    if (len < EPS) continue;
    // Which stage each is in, read from just inside the interval, so a stage
    // that changes exactly at p contributes its NEW acceleration — and then
    // the position and velocity at p from that stage's own formula, exactly,
    // rather than extrapolated back from the middle of a long interval.
    const mid = (p + q) / 2;
    const atP = (m) => {
      const st = m.stageAt(mid);
      if (st === null) return { x: m.stages[0].x0, v: 0, a: 0 };
      if (st === undefined) { const e = m.state(Infinity); return { x: e.x, v: 0, a: 0 }; }
      const r = at(st, p);
      return { x: r.x, v: r.v, a: st.a };
    };
    const a = atP(A), b = atP(B);
    const dA = a.a - b.a;
    const xAp = a.x, xBp = b.x, vAp = a.v, vBp = b.v;
    const c0 = xAp - xBp, c1 = vAp - vBp, c2 = 0.5 * dA;
    const scale = Math.max(1, Math.abs(xAp), Math.abs(xBp));
    if (Math.abs(c0) < 1e-9 * scale && Math.abs(c1) < 1e-9 && Math.abs(c2) < 1e-9) {
      push(p, { together: true, until: q });
      continue;
    }
    for (const tau of quadRoots(c2, c1, c0)) {
      if (tau >= -1e-9 && tau <= len + 1e-9) push(p + Math.min(Math.max(tau, 0), len));
    }
  }
  return out.sort((m, n) => m.t - n.t);
}

/** Real roots of c2 τ² + c1 τ + c0 = 0, a tangent counted once. */
export function quadRoots(c2, c1, c0) {
  if (Math.abs(c2) < 1e-12) {
    if (Math.abs(c1) < 1e-12) return [];
    return [-c0 / c1];
  }
  const disc = c1 * c1 - 4 * c2 * c0;
  if (disc < -1e-12 * Math.max(1, c1 * c1)) return [];
  const r = Math.sqrt(Math.max(0, disc));
  if (r < 1e-12) return [-c1 / (2 * c2)];
  // the numerically stable pair
  const qq = -0.5 * (c1 + Math.sign(c1 || 1) * r);
  return [qq / c2, c0 / qq].sort((p, q) => p - q);
}
