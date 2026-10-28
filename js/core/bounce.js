// bounce.js — a ball released, thrown down or thrown up from a height, which
// hits horizontal ground and rebounds, once or several times.
//
// The exam family (Edexcel M1 Jun 2014 Q3, Jun 2018 Q4 and their kind): how
// fast is it going just before it hits, how fast just after, how high does it
// rise again, when is it at a given height, how long between bounces, and how
// long until it hits the ground the second (or n-th) time — with a sketch of
// the velocity–time graph, which jumps at every impact.
//
// None of it is new physics. Each flight between impacts is SUVAT with the
// one acceleration g, and the bounce itself is not modelled at all: the paper
// GIVES what comes out of it — a rebound speed, the height it rises to, or the
// fraction of its speed it keeps — and the impact takes no time. (Finding the
// rebound from an impulse is momentum, another chapter; it is out of scope.)
// So the whole motion is a staged motion (js/core/stages.js) whose position
// is continuous and whose velocity jumps at every impact: `toLevel` for the
// first flight, `rebound` for each one after it.
//
// CONVENTION. Heights are always measured up from the ground. The engine works
// with up as positive and reports every velocity and acceleration in the
// direction the student chose — up positive, or down positive as many papers
// take it — and says which, everywhere it says a signed number.
//
// LATER BOUNCES. A paper gives one rebound. Every later one keeps the same
// fraction of the speed it arrives with: the same ball on the same ground.
// The engine says so whenever it uses that.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4). The stage, the graphs, the HUD,
// the working and the ending only read what this file returns — including the
// sentences that say what happened.

import { staged, toLevel, rebound, timesAt, quadRoots } from './stages.js';
import { snap } from './numeric.js';
import { M, num, signed } from '../notation.js';

const EPS = 1e-9;
export const MAX_IMPACTS = 6;
const TOL = 0.01;                // two given numbers that should agree, to 1 %
const have = (x) => typeof x === 'number' && isFinite(x);
// three significant figures, as a paper with g = 9.8 asks for its answers
const sf = (x) => num(x, x === 0 || !isFinite(x) ? 0 : Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)) + 1e-9)), { trim: true });
// a given number as it was given; a small one keeps its figures
const d = (x, p = 2) => num(x, x !== 0 && Math.abs(x) < 0.1 ? Math.max(p, 2 - Math.floor(Math.log10(Math.abs(x)))) : p, { trim: true });
const sb = (x, p = 3) => signed(x, p, { trim: true });
// a worked result: a minus sign, never a bracket
const nm = (x, p = 3) => num(x, p, { trim: true });
const agree = (a, b) => Math.abs(a - b) <= TOL * Math.max(Math.abs(a), Math.abs(b), 1e-6);
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
export const ordinal = (k) => ORD[k - 1] || `${k}th`;

/**
 * The motion itself, up positive: from height h with velocity u (signed),
 * acceleration −g, rebounding off the ground (height 0) at e times the speed
 * it arrives with, until it has hit the ground `impacts` times.
 */
export function bounceMotion({ h, u, g, e, impacts }) {
  const stages = [toLevel({ t0: 0, x0: h, u, a: -g, kind: 'fall' }, 0)];
  while (stages.length < impacts) stages.push(rebound(stages[stages.length - 1], e, 0));
  return staged(stages);
}

/**
 * A ball, a height, the ground, and a bounce.
 * @param k {
 *   start: 'drop' | 'down' | 'up'   how it sets off
 *   h      the height it starts from (m)
 *   U      the speed it is thrown with (a size; 0 when released)
 *   V      the speed it hits the ground with, the first time
 *   w      the speed it rebounds with, the first time
 *   H      the greatest height it rises to after the first bounce
 *   e      the fraction of its speed it keeps at a bounce
 *   n      how many impacts to watch (blank: 2)
 *   y      a height to ask about: every time it is there
 *   stop   'y': end the run the first time it is at y after the first bounce
 *   axis   'up' | 'down' — which way is positive (blank: up)
 *   g }
 * Any two of h, U, V fix the throw (one, when it is released); any one of
 * w, H, e fixes the bounce. More than that is cross-checked.
 */
export function solveBounce(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const { g, start } = k;
  const axis = k.axis === 'down' ? 'down' : 'up', sg = axis === 'down' ? -1 : 1;
  const missing = [];
  if (!start) missing.push('how it sets off — released, thrown down or thrown up');
  if (!have(g)) missing.push('the value of g');
  if (missing.length) return fail(`Still needed: ${missing.join(', ')}.`);
  if (!(g > EPS)) return fail('A bounce needs gravity to bring the ball back down: give g as a size, such as 9.8.');
  for (const [key, what] of [['h', 'The height it starts from'], ['U', 'The speed it is thrown with'], ['V', 'The speed it hits the ground with'],
    ['w', 'The speed it rebounds with'], ['H', 'The height it rises to'], ['e', 'The fraction of its speed it keeps']]) {
    if (have(k[key]) && k[key] < 0) {
      return fail(`${what} is a size, so it cannot be negative.${/U|V|w/.test(key) ? ' The direction is set by how it sets off, and by the convention you choose.' : ''}`);
    }
  }
  const notes = [];

  /* ── the throw: any two of h, U, V (released: U is 0) ────────────────── */
  let h = k.h, U = k.U, V = k.V;
  const found = {};
  if (start === 'drop') {
    if (have(U) && U > EPS) return fail(`Released from rest means it starts with no speed, so the speed it is thrown with is 0. Clear that box, or choose thrown down or thrown up.`);
    U = 0;
  }
  const known = [have(h), have(U), have(V)].filter(Boolean).length;
  if (known < 2) {
    return fail(start === 'drop'
      ? 'Still needed: the height it is released from, or the speed it hits the ground with.'
      : 'Still needed: two of the height it starts from, the speed it is thrown with and the speed it hits the ground with.');
  }
  if (have(h) && have(U)) {
    const V2 = U * U + 2 * g * h;
    if (have(V) && !agree(V, Math.sqrt(V2))) {
      return fail(`Those three do not agree. From ${M`${d(h)} [m]`} at ${M`${d(U)} [m s^-1]`} it hits the ground at ${M`${sf(Math.sqrt(V2))} [m s^-1]`}, not ${M`${d(V)} [m s^-1]`}. Leave one of them blank.`);
    }
    if (have(V)) notes.push(`The speed it hits the ground with, ${M`${d(V)} [m s^-1]`}, agrees with the height and the throw.`);
    V = Math.sqrt(V2);
    found.V = true;
  } else if (have(V) && have(U)) {
    if (V < U - EPS) return fail(`It cannot hit the ground slower than it was thrown: with ${M`a = g`} the whole way down, it only gains speed. The impact speed must be at least ${M`${d(U)} [m s^-1]`}.`);
    h = (V * V - U * U) / (2 * g);
    found.h = true;
  } else {
    const U2 = V * V - 2 * g * h;
    if (U2 < -TOL * V * V) {
      return fail(`Released from rest at ${M`${d(h)} [m]`} it would already hit the ground at ${M`${sf(Math.sqrt(2 * g * h))} [m s^-1]`}, so it cannot arrive at only ${M`${d(V)} [m s^-1]`}.`);
    }
    U = Math.sqrt(Math.max(0, U2));
    found.U = true;
    if (start !== 'drop' && U < 1e-6) notes.push('That height and impact speed mean it was in fact released from rest: the speed it was thrown with is 0.');
  }
  h = snap(h); U = snap(U); V = snap(V);
  if (h < EPS && start !== 'up') {
    return fail(start === 'drop' ? 'Released from rest on the ground, it never leaves it. Give the height it is released from.'
      : 'Thrown down from the ground, it is already there. Give the height it is thrown from.');
  }
  if (start === 'up' && h < EPS && U < EPS) return fail('Thrown up from the ground with no speed, it never leaves it.');
  const u = start === 'up' ? U : -U;                       // up positive

  /* ── the bounce: any one of w, H, e ──────────────────────────────────── */
  const asked = [];
  if (have(k.w)) asked.push({ key: 'w', w: k.w, say: `rebounds at ${M`${d(k.w)} [m s^-1]`}` });
  if (have(k.H)) asked.push({ key: 'H', w: Math.sqrt(2 * g * k.H), say: `rises to ${M`${d(k.H)} [m]`}` });
  if (have(k.e)) asked.push({ key: 'e', w: k.e * V, say: `keeps ${M`${d(k.e, 3)}`} of its speed` });
  if (!asked.length) return fail('Still needed: how it bounces — the speed it rebounds with, the greatest height it rises to after the bounce, or the fraction of its speed it keeps.');
  for (const q of asked.slice(1)) {
    if (!agree(q.w, asked[0].w)) {
      return fail(`Those do not agree: a ball that ${asked[0].say} leaves the ground at ${M`${sf(asked[0].w)} [m s^-1]`}, but one that ${q.say} leaves it at ${M`${sf(q.w)} [m s^-1]`}. Give one of them.`);
    }
  }
  const w = snap(asked[0].w), e = snap(w / V), by = asked[0].key;
  if (!(w > EPS)) return fail('With no rebound it stays on the ground: there is no bounce to show. Give the speed it rebounds with, or the height it rises to.');
  if (e > 1 + TOL) {
    return fail(`It would leave the ground faster than it hit it: it arrives at ${M`${sf(V)} [m s^-1]`} and leaves at ${M`${sf(w)} [m s^-1]`}. A bounce keeps some of the speed; it cannot add to it.`);
  }

  /* ── how far to watch ────────────────────────────────────────────────── */
  const y = have(k.y) ? k.y : null;
  if (y != null && y < 0) return fail('A height is measured up from the ground, so the one asked about cannot be below it.');
  const stopAtY = k.stop === 'y';
  if (stopAtY && y == null) return fail('Give the height to stop at: the run stops the first time the ball is there after the bounce.');
  let n = have(k.n) ? k.n : 2;
  if (have(k.n) && (Math.abs(n - Math.round(n)) > 1e-9 || n < 1)) return fail('The number of impacts is a whole number: 1 for the first time it hits the ground, 2 for the second.');
  n = Math.round(n);
  if (n > MAX_IMPACTS) return fail(`Up to ${MAX_IMPACTS} impacts: after that each bounce is too small to see, and a real ball has stopped behaving like this model.`);
  const H1 = snap(w * w / (2 * g));
  if (stopAtY && y > H1 + 1e-9) {
    return fail(`After the bounce it rises only to ${M`${sf(H1)} [m]`}, so it is never ${M`${d(y)} [m]`} up again. Choose a lower height, or let the run end at an impact.`);
  }
  if (stopAtY && have(k.n)) notes.push('The run stops at the height asked about, so the number of impacts is not used.');

  const m = bounceMotion({ h, u, g, e, impacts: stopAtY ? 2 : n });
  const impacts = m.stages.map((st, i) => {
    const vIn = -m.state(st.t1).v;                        // a size: it arrives going down
    const out = snap(i === 0 ? w : e * vIn);
    return { k: i + 1, t: snap(st.t1), vIn: snap(vIn), vOut: out, H: snap(out * out / (2 * g)),
             gap: i + 1 < m.stages.length ? snap(m.stages[i + 1].t1 - st.t1) : snap(2 * out / g) };
  });

  // Every instant it is at the height asked about, in the run.
  const allY = y == null ? [] : timesAt(m, y, { from: 0, to: m.end }).map((c) => describe(c, impacts));
  let tMax = m.end, stopAt = null;
  if (stopAtY) {
    stopAt = allY.find((c) => c.after >= 1 && c.t > impacts[0].t + 1e-9);
    tMax = stopAt.t;
  }
  const crossings = allY.filter((c) => c.t <= tMax + 1e-9);
  const shown = impacts.filter((x) => x.t <= tMax + 1e-9);
  const last = shown[shown.length - 1];
  // The top of the first flight, when it is thrown up and so rises first.
  const top0 = u > EPS ? { t: snap(u / g), H: snap(h + u * u / (2 * g)) } : null;

  if (by === 'w') notes.push(`It rebounds at ${M`${sf(w)} [m s^-1]`}, so it keeps ${M`${sf(e)}`} of the ${M`${sf(V)} [m s^-1]`} it hit the ground with.`);
  if (by === 'H') notes.push(`Rising to ${M`${d(k.H)} [m]`} means it left the ground at ${M`${sf(w)} [m s^-1]`}.`);
  if (shown.length > 2 || (!stopAtY && n > 2)) notes.push(`Each later bounce keeps the same fraction, ${M`${sf(e)}`}, of the speed it arrives with: the same ball on the same ground.`);
  if (y != null && !crossings.length) {
    const highest = Math.max(h, top0 ? top0.H : 0, ...shown.map((x) => x.H));
    notes.push(`It is never ${M`${d(y)} [m]`} up in this run: the highest it gets is ${M`${sf(highest)} [m]`}.`);
  }

  const say = (c) => c.after === 0 ? `${M`${sf(c.t)} [s]`} after it sets off`
    : `${M`${sf(c.since)} [s]`} after the ${ordinal(c.after)} impact (${M`t = ${sf(c.t)} [s]`})`;
  const watched = stopAt ? `Stopped as it first passes ${M`${d(y)} [m]`} up after the bounce`
    : `Watched to the ${ordinal(n)} impact`;
  const moment = stopAt
    ? { t: stopAt.t, text: `It first passes ${M`${d(y)} [m]`} up after the bounce ${say(stopAt)}.` }
    : { t: last.t, text: `It hits the ground the ${ordinal(last.k)} time at ${M`t = ${sf(last.t)} [s]`}.` };

  const derived = [
    `hits at ${M`${sf(V)} [m s^-1]`}`,
    `leaves at ${M`${sf(w)} [m s^-1]`}`,
    ...(stopAt ? [`${M`${sf(stopAt.since)} [s]`} from the bounce to ${M`${d(y)} [m]`} up`]
      : [`${ordinal(n)} impact at ${M`t = ${sf(last.t)} [s]`}`]),
  ];
  if (found.h) derived.unshift(`starts ${M`${sf(h)} [m]`} up`);
  if (found.U && U > 1e-6) derived.unshift(`thrown at ${M`${sf(U)} [m s^-1]`}`);

  const extras = [
    ...(found.U ? [{ key: 'U', label: 'speed it is thrown with', value: U, unit: 'm s⁻¹' }] : []),
    ...(found.h ? [{ key: 'h', label: 'height it starts from', value: h, unit: 'm' }] : []),
    ...(top0 ? [{ key: 'top0', label: 'greatest height before the first impact', value: top0.H, unit: 'm' }] : []),
    ...shown.flatMap((x) => [
      { key: `t${x.k}`, label: `${ordinal(x.k)} impact at`, value: x.t, unit: 's' },
      { key: `vIn${x.k}`, label: `speed just before it`, value: x.vIn, unit: 'm s⁻¹' },
      { key: `vOut${x.k}`, label: `speed just after it`, value: x.vOut, unit: 'm s⁻¹' },
      { key: `H${x.k}`, label: `greatest height after it`, value: x.H, unit: 'm' },
      ...(x.k < shown.length ? [{ key: `gap${x.k}`, label: `time to the ${ordinal(x.k + 1)} impact`, value: x.gap, unit: 's' }] : []),
    ]),
    ...crossings.map((c, i) => ({ key: `y${i}`, label: `at ${d(y)} m, ${c.dir === 'up' ? 'going up' : c.dir === 'down' ? 'coming down' : c.dir === 'top' ? 'at the top' : 'at the start'}`, value: c.t, unit: 's', since: c.since, after: c.after })),
  ];

  const convention = axis === 'down'
    ? 'Taking down as positive, as many papers do here. Heights are still measured up from the ground.'
    : 'Taking up as positive, with heights measured up from the ground.';

  const f = motion(m, { h, u, g, e, w, V, sg, impacts: shown, crossings, y, top0, tMax, stopAt });
  return {
    ok: true, mode: 'bounce', axis, sign: sg,
    params: { g, h, u, U, V, w, e, H1, n, y, start, by, stopAtY, found },
    f, m, impacts: shown, crossings, top0, stopAt, moment, derived, notes, extras, convention, watched,
    say: moment.text,
  };
}

/** Where a crossing of the asked height falls: after which impact, how long
    after it, and which way the ball is going. */
function describe(c, impacts) {
  const before = impacts.filter((x) => x.t < c.t - 1e-9);
  const after = before.length, from = after ? before[after - 1].t : 0;
  const dir = c.t < 1e-9 ? 'start' : c.v > 1e-7 ? 'up' : c.v < -1e-7 ? 'down' : 'top';
  return { t: snap(c.t), v: snap(c.v), after, since: snap(c.t - from), dir };
}

/* ── the motion, in the shape the transport asks for ────────────────────
   The clock, the scrubber and the replay need a tMax and a path; the stage,
   the graphs and the HUD read `at(t)`, which gives the height, and the
   velocity and acceleration in the chosen convention. */
function motion(m, o) {
  const { g, sg, tMax } = o;
  const clampT = (t) => Math.min(Math.max(t, 0), tMax);
  // The highest it gets in the run — a top it reaches before the run ends,
  // or where it is when the run ends — and the height asked about. Not a
  // top it would have reached had the run gone on.
  const tops = [o.top0 && o.top0.t <= tMax ? o.top0.H : 0,
    ...o.impacts.filter((x) => x.t + x.vOut / g <= tMax + 1e-9).map((x) => x.H)];
  const top = Math.max(o.h, ...tops, Math.max(0, m.state(tMax).x), o.y ?? 0);
  const flightAt = (t) => m.stages.findIndex((st) => t <= st.t1 + 1e-12);
  const at = (t) => {
    const c = clampT(t), s = m.state(c);
    return { y: Math.max(0, s.x), vUp: s.v, v: sg * s.v, a: -sg * g, flight: flightAt(c), stage: s.stage };
  };
  return {
    kind: 'bounce', m, tMax, tFlight: tMax, top, sign: sg, g,
    h: o.h, u: o.u, e: o.e, impacts: o.impacts, crossings: o.crossings, y: o.y, top0: o.top0, stopAt: o.stopAt,
    params: { g, h: o.h, u: Math.abs(o.u), theta: o.u < 0 ? -90 : 90 },
    pos: (t) => ({ x: 0, y: at(t).y }),
    vel: (t) => ({ x: 0, y: at(t).vUp }),
    speed: (t) => Math.abs(at(t).vUp),
    accel: () => -g,
    bounces: 0, segments: [], horiz: 0, range: 0,
    kineticEnergy: () => 0, momentum: () => 0,
    /** Height, the velocity and acceleration in the chosen convention, and which flight. */
    at,
    /** The impacts up to t: where the velocity graph jumps. */
    jumps: o.impacts.filter((x) => x.t < tMax - 1e-9).map((x) => x.t),
    path(n = 200, tEnd = tMax) {
      const out = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; out.push({ t, x: 0, y: at(t).y }); }
      return out;
    },
  };
}

/* ── the working ────────────────────────────────────────────────────────
   In the student's convention throughout: down to the ground, the bounce,
   up and down again, each later bounce, the whole time, and every time it
   is at the height asked about. */
export function bounceWorking(solved) {
  if (!solved?.ok) return [];
  const { params: P, impacts, crossings, stopAt, sign: s } = solved;
  const { g, h, u, w, V, e, y, found, by } = P;
  const a = -s * g, word = s > 0 ? 'up' : 'down';
  const out = [];
  const pos = s > 0 ? 'positive upwards' : 'positive downwards';

  // 1 — the first flight
  const u1 = s * u, v1 = -s * V, s1 = -s * h;
  const rows = [];
  if (found.h) {
    rows.push({ f: M`v^2 = u^2 + 2as`, s: M`${sb(v1)}^2 = ${sb(u1)}^2 + 2 * ${sb(a)} * s`,
                r: M`s = ${nm(s1)} [m]` });
  } else if (found.U) {
    rows.push({ f: M`u^2 = v^2 - 2as`, s: M`u^2 = ${sb(v1)}^2 - 2 * ${sb(a)} * ${sb(s1)}`,
                r: M`u = ${nm(u1)} [m s^-1]` });
  } else {
    rows.push({ f: M`v^2 = u^2 + 2as`, s: M`v^2 = ${sb(u1)}^2 + 2 * ${sb(a)} * ${sb(s1)}`,
                r: M`v^2 = ${sf(V * V)}` });
    rows.push({ f: M`v = ${s > 0 ? '-' : ''}sqrt(${sf(V * V)})`, s: '', r: M`v = ${nm(v1)} [m s^-1]` });
  }
  const t1 = impacts[0].t;
  rows.push({ f: M`v = u + at`, s: M`t = (${sb(v1)} - ${sb(u1)})/(${sb(a)})`, r: M`t = ${sf(t1)} [s]` });
  const how = u > 1e-9 ? 'Thrown up, it rises, stops and comes back down' : u < -1e-9 ? 'Thrown down, it speeds up all the way' : 'Released from rest, it speeds up all the way';
  out.push({
    title: 'Down to the ground, the first time',
    rows,
    note: `${how}. With ${pos}, ${M`u = ${nm(u1)}`}, ${M`a = ${nm(a)}`} and the displacement to the ground is ${M`s = ${nm(s1)} [m]`}. `
      + `It is moving down as it hits, so ${M`v`} is ${s > 0 ? 'negative' : 'positive'}: the speed just before the impact is ${M`${sf(V)} [m s^-1]`}.`,
  });

  // 2 — the bounce
  const u2 = s * w;
  const brow = by === 'w' ? { f: M`u = ${nm(u2)} [m s^-1]`, s: '', r: '' }
    : by === 'H' ? { f: M`v^2 = u^2 + 2as`, s: M`0 = u^2 + 2 * ${sb(a)} * ${sb(s * P.H1)}`, r: M`u = ${nm(u2)} [m s^-1]` }
    : { f: M`u = e * v`, s: M`${d(e, 3)} * ${sf(V)}`, r: M`u = ${nm(u2)} [m s^-1]` };
  out.push({
    title: 'The bounce',
    rows: [brow],
    note: (by === 'w' ? 'The paper gives the speed it leaves the ground with. '
      : by === 'H' ? `At its greatest height, ${M`${sf(P.H1)} [m]`} up, it is momentarily at rest, so ${M`v = 0`} there. `
      : `It keeps ${M`${d(e, 3)}`} of the speed it arrives with. `)
      + `The velocity jumps from ${M`${nm(v1)}`} to ${M`${nm(u2)} [m s^-1]`} at the instant of the impact, which the model takes to last no time at all: `
      + `that jump is the vertical step on the velocity–time graph. The speed just after the impact is ${M`${sf(w)} [m s^-1]`}.`,
  });

  // 3 — each flight after a bounce, to the next impact
  const flights = impacts.slice(1);
  if (flights.length) {
    const fr = flights.map((_, i) => {
      const uk = s * impacts[i].vOut;
      return { f: i === 0 ? M`s = ut + ½at^2` : M`u = ${nm(uk)} [m s^-1]`,
               s: M`0 = ${sb(uk)}t + ½ * ${sb(a)}t^2`, r: M`t = ${sf(impacts[i].gap)} [s]` };
    });
    out.push({
      title: flights.length > 1 ? 'Up and down again, bounce by bounce' : 'Up and down again, to the second impact',
      rows: fr,
      note: `Back at the ground the displacement is ${M`s = 0`}, so ${M`t = 0`} or ${M`t = -2u/a`}. `
        + (flights.length > 1 ? `It lands as fast as it left, and each bounce keeps ${M`${sf(e)}`} of that, so the next rebound speed is ${M`${sf(e)}`} times the last.` : 'It lands again as fast as it left.'),
    });
  }

  // 4 — the whole time
  if (impacts.length > 1 && !stopAt) {
    // the time down, then each flight between two impacts
    const terms = [sf(impacts[0].t), ...impacts.slice(0, -1).map((x) => sf(x.gap))];
    out.push({
      title: `From the start to the ${ordinal(impacts.length)} impact`,
      rows: [{ f: M`T = ${terms.map((_, i) => `t_${i + 1}`).join(' + ')}`, s: M`${terms.join(' + ')}`,
               r: M`T = ${sf(impacts[impacts.length - 1].t)} [s]` }],
      note: `The time down to the first impact, then each flight between impacts. (Each is rounded here; the total is worked from the exact values.)`,
    });
  }

  // 5 — the height asked about
  if (y != null) {
    const byFlight = new Map();
    for (const c of crossings) {
      if (c.dir === 'start') continue;
      if (!byFlight.has(c.after)) byFlight.set(c.after, []);
      byFlight.get(c.after).push(c);
    }
    const yr = [];
    for (const [k, cs] of byFlight) {
      const uk = k === 0 ? s * u : s * impacts[k - 1].vOut;
      const sk = k === 0 ? s * (y - h) : s * y;
      // ½a t² + u t − s = 0, both roots, the ones in this flight kept
      const roots = quadRoots(0.5 * a, uk, -sk).filter((r) => r > -1e-9).map(snap);
      yr.push({
        f: k === 0 ? M`s = ut + ½at^2` : M`u = ${nm(uk)} [m s^-1]`,
        s: M`${sb(sk)} = ${sb(uk)}t + ½ * ${sb(a)}t^2`,
        r: roots.length > 1 ? M`t = ${sf(roots[0])} "or" ${sf(roots[1])} [s]` : M`t = ${sf(roots[0] ?? cs[0].since)} [s]`,
      });
    }
    const lines = crossings.filter((c) => c.dir !== 'start').map((c) => (c.after === 0
      ? `${M`${sf(c.t)} [s]`} after it sets off, ${c.dir === 'up' ? 'going up' : c.dir === 'down' ? 'coming down' : 'at the top'}`
      : `${M`${sf(c.since)} [s]`} after the ${ordinal(c.after)} impact, ${c.dir === 'up' ? 'going up' : c.dir === 'down' ? 'coming down' : 'at the top'} (${M`t = ${sf(c.t)} [s]`} from the start)`));
    out.push({
      title: `When it is ${d(y)} m up`,
      rows: yr,
      note: yr.length
        ? `Each ${M`t`} is timed from the start of that flight: from when it set off, or from the impact before. `
          + `A negative root is before that flight began, and is dropped. It is there: ${lines.join('; ')}.`
          + (stopAt ? ` The run stops at the first time after the bounce, ${M`${sf(stopAt.since)} [s]`} after the impact — the time the paper asks for.` : '')
        : `It is never ${M`${d(y)} [m]`} up in this run.`,
    });
  }
  return out;
}
