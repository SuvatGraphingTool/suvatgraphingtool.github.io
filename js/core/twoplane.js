// twoplane.js — two moving in a plane at constant velocities, in i and j:
// two ships, two boats, two birds.
//
// The exam family: when is P due west of Q, and how far apart are they then;
// when are the ships 10 km apart; at t = 4 the second bird is south-west of
// the first, so how fast is it flying. Each moves as r = r₀ + vt; everything
// asked is about the one vector between them, Δ = r_A − r_B, which is linear
// in t: a direction is one relation between its two parts (linear in t), a
// distance is |Δ|² = d² (a quadratic), and an unknown multiplier on B's
// velocity is fixed by a direction at a given time (linear in it).
//
// CONVENTION. i is east and j north; positions from the origin O; bearings
// clockwise from north.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { quadRoots } from './stages.js';
import { snap } from './numeric.js';
import { COMPASS, vsrc } from './plane.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const EPS = 1e-9;
const tiny = (x) => Math.abs(x) < 1e-9;
/** A part to square: bracketed when it has two terms or a minus. */
const sq = (s) => (/^[-−]|\s[+\-−]\s/.test(s) ? `(${s})` : s);
const sgn = (x) => (d(x).startsWith('−') ? `(${d(x)})` : d(x));
export const UNITS = { km: { len: 'km', time: 'h', speed: 'km h^-1', speedText: 'km h⁻¹' }, m: { len: 'm', time: 's', speed: 'm s^-1', speedText: 'm s⁻¹' } };

/** c0 + c1 t as the coefficient of one unit vector: (2 − 4t). */
function lin(c0, c1) {
  const parts = [];
  if (!tiny(c0)) parts.push(d(c0));
  if (!tiny(c1)) {
    const body = `${Math.abs(Math.abs(c1) - 1) < EPS ? '' : d(Math.abs(c1))}t`;
    parts.push(parts.length ? `${c1 < 0 ? '-' : '+'} ${body}` : `${c1 < 0 ? '-' : ''}${body}`);
  }
  return parts.length ? parts.join(' ') : '0';
}
/** (c0 + c1 t)i + (e0 + e1 t)j, as notation source. */
function vecT(cx, cy) {
  const one = ([c0, c1], e) => {
    const s = lin(c0, c1);
    if (s === '0') return null;
    const two = !tiny(c0) && !tiny(c1);
    return { neg: !two && s.startsWith('-'), body: two ? `(${s})vec(${e})` : `${s.replace(/^-/, '').replace(/^1(?=t)/, '')}vec(${e})`.replace(/^vec/, 'vec') };
  };
  const a = one(cx, 'i'), b = one(cy, 'j');
  if (!a && !b) return '0';
  if (!a) return `${b.neg ? '-' : ''}${b.body}`;
  if (!b) return `${a.neg ? '-' : ''}${a.body}`;
  return `${a.neg ? '-' : ''}${a.body} ${b.neg ? '-' : '+'} ${b.body}`;
}
/** The direction relation between the two parts of Δ = c + m·(t or p), substituted. */
function relSub(D, c, m, sym = 'p') {
  const X = lin(c.x, m.x).replace(/t/g, sym), Yy = lin(c.y, m.y).replace(/t/g, sym);
  if (D.x === 0) return `${X} = 0`;
  if (D.y === 0) return `${Yy} = 0`;
  return D.x === D.y ? `${X} = ${Yy}` : `${X} = -(${Yy})`;
}
/** The bearing of a velocity, clockwise from north, 0–360. */
export function bearing(v) {
  const b = (Math.atan2(v.x, v.y) * 180) / Math.PI;
  return snap((b + 360) % 360);
}

/**
 * @param k { units, A: { r0, v }, B: { r0, v, w }, find, at: { due, dueT, apart } }
 *   B.w — with find 'p': B's velocity is p·w, p to find
 *   at.due — a compass key: when is A that way of B? (with find 'p': at time at.dueT)
 *   at.apart — a distance: when are they that far apart?
 */
export function solveTwoPlane(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const U = UNITS[k.units] || UNITS.km;
  const vec = (o) => ({ x: have(o?.x) ? o.x : 0, y: have(o?.y) ? o.y : 0 });
  const given = (o) => o && (have(o.x) || have(o.y));
  const A = { r0: vec(k.A?.r0), v: vec(k.A?.v) }, B = { r0: vec(k.B?.r0), v: vec(k.B?.v) };
  const at = k.at || {}, findP = k.find === 'p';
  // "B is south-west of A" is "A is north-east of B": the engine works with A from B
  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E', NE: 'SW', SW: 'NE', NW: 'SE', SE: 'NW' };
  const dueKey = COMPASS[at.due] ? (at.bOfA ? OPP[at.due] : at.due) : null;
  const say = (D) => (at.bOfA ? `B is ${COMPASS[at.due].word} of A` : `A is ${D.word} of B`);
  if (!given(k.A?.v)) return fail('Give A’s velocity, as its two parts.');
  if (findP) {
    if (given(k.B?.v)) return fail('With p to find, leave B\u2019s velocity blank: it is p times the vector below.');
    if (!given(k.B?.w)) return fail('To find p, give B’s velocity as p times a vector: that vector’s two parts.');
    if (!dueKey || !have(at.dueT)) return fail('To find p, say where A is from B, and at what time.');
    if (!(at.dueT > 0)) return fail('The time is after the start: give it as a positive number.');
  } else if (!given(k.B?.v)) return fail('Give B’s velocity, as its two parts (0 and 0 for something that stays still).');
  const rows = [], notes = [], derived = [], answers = [];
  let p = null;
  if (findP) {
    // Δ(T) = (A.r0 + A.v T) − (B.r0 + p w T); A is `dir` of B: Δ × dir = 0, linear in p
    const D = COMPASS[dueKey], w = vec(k.B.w), T = at.dueT;
    const c = { x: A.r0.x + A.v.x * T - B.r0.x, y: A.r0.y + A.v.y * T - B.r0.y };   // Δ at p = 0
    const m = { x: -w.x * T, y: -w.y * T };                                          // its rate in p
    const den = m.x * D.y - m.y * D.x;
    if (tiny(den)) return fail(`Whatever p is, B moves along that same line: the direction from B to A cannot fix it.`);
    p = snap(-(c.x * D.y - c.y * D.x) / den);
    const dl = { x: c.x + m.x * p, y: c.y + m.y * p };
    if (Math.hypot(dl.x, dl.y) < 1e-9 * Math.max(1, Math.hypot(c.x, c.y))) return fail(`The only p that puts them on that line puts them at the same place at that time: they would meet, with no direction between them.`);
    if (dl.x * D.x + dl.y * D.y <= EPS) return fail(`The only p that puts them on that line has them the other way round: not “${say(D)}”.`);
    B.v = { x: snap(p * w.x), y: snap(p * w.y) };
    const rel = D.x === 0 ? M`x_A = x_B` : D.y === 0 ? M`y_A = y_B` : D.x === D.y ? M`x_A - x_B = y_A - y_B` : M`x_A - x_B = -(y_A - y_B)`;
    rows.push({ f: M`vec r_B = vec r_0 + p(${vsrc(w)})t`, s: M`(${vsrc(B.r0)}) + ${d(T)}p(${vsrc(w)})`, r: M`"at" t = ${d(T)} [${U.time}]` });
    rows.push({ f: rel, s: M`${relSub(D, c, m)}`, r: M`p = ${d(p)}` });
    rows.push({ f: M`abs(vec v_B) = abs(p) sqrt(w_x^2 + w_y^2)`, s: M`${d(Math.abs(p))} sqrt(${sgn(w.x)}^2 + ${sgn(w.y)}^2)`, r: M`${d(snap(Math.hypot(B.v.x, B.v.y)))} [${U.speed}]` });
    notes.push(`${say(D)} at ${M`t = ${d(T)} [${U.time}]`} when ${M`p = ${d(p)}`}: B flies at ${M`${d(snap(Math.hypot(B.v.x, B.v.y)))} [${U.speed}]`}.`);
    derived.push(M`p = ${d(p)}`, `B’s speed ${M`${d(snap(Math.hypot(B.v.x, B.v.y)))} [${U.speed}]`}`);
    answers.push({ kind: 'p', t: T });
  }
  const pos = (P, t) => ({ x: P.r0.x + P.v.x * t, y: P.r0.y + P.v.y * t });
  // Δ = r_A − r_B = c + m t
  const c = { x: A.r0.x - B.r0.x, y: A.r0.y - B.r0.y }, m = { x: A.v.x - B.v.x, y: A.v.y - B.v.y };
  const motion = [
    { f: M`vec r_A = vec r_0 + vec(v)t`, s: '', r: M`vec r_A = ${vecT([A.r0.x, A.v.x], [A.r0.y, A.v.y])}` },
    { f: M`vec r_B = vec r_0 + vec(v)t`, s: '', r: M`vec r_B = ${vecT([B.r0.x, B.v.x], [B.r0.y, B.v.y])}` },
    { f: M`vec r_A - vec r_B`, s: '', r: M`${vecT([c.x, m.x], [c.y, m.y])}` },
  ];
  // the bearing and speed of each
  const bearingSub = (v) => {
    if (tiny(v.x)) return M`${v.y > 0 ? '0°' : '180°'}`;
    if (tiny(v.y)) return M`${v.x > 0 ? '90°' : '270°'}`;
    const a = `tan^-1 (${d(Math.abs(v.x))}/${d(Math.abs(v.y))})`;
    return v.x > 0 ? (v.y > 0 ? M`${a}` : M`180° - ${a}`) : (v.y < 0 ? M`180° + ${a}` : M`360° - ${a}`);
  };
  const heads = [A, B].map((P, i) => {
    const sp = snap(Math.hypot(P.v.x, P.v.y));
    if (sp < EPS) return null;
    const br = bearing(P.v);
    return { who: i ? 'B' : 'A', sp, br,
      rows: [{ f: M`abs(vec v) = sqrt(v_x^2 + v_y^2)`, s: M`sqrt(${sgn(P.v.x)}^2 + ${sgn(P.v.y)}^2)`, r: M`${d(sp)} [${U.speed}]` },
        { f: M`"bearing"`, s: bearingSub(P.v), r: M`${num(br, 0)}°` }] };
  }).filter(Boolean);
  for (const hd of heads) notes.push(`${hd.who} moves at ${M`${d(hd.sp)} [${U.speed}]`} on a bearing of ${M`${num(hd.br, 0)}°`}.`);

  // when is A `due` of B? (with p given, or found)
  const dueRows = [];
  if (dueKey && !findP) {
    const D = COMPASS[dueKey];
    // (c + m t) × D = 0
    const a0 = c.x * D.y - c.y * D.x, a1 = m.x * D.y - m.y * D.x;
    const rel = D.x === 0 ? M`x_A = x_B` : D.y === 0 ? M`y_A = y_B` : D.x === D.y ? M`x_A - x_B = y_A - y_B` : M`x_A - x_B = -(y_A - y_B)`;
    if (tiny(a1) && tiny(a0)) {
      // always on one line in that direction: which way round, and when, is
      // the sign of Δ·D = q0 + q1 t; where it is zero they are at one place
      const q0 = c.x * D.x + c.y * D.y, q1 = m.x * D.x + m.y * D.y;
      const tz = tiny(q1) ? null : snap(-q0 / q1);
      notes.push(tiny(q0) && tiny(q1) ? 'They are at the same place the whole time: there is no direction between them.'
        : tiny(q0) ? (q1 > 0 ? `“${say(D)}” from the start on: they set off from the same place.` : `Never “${say(D)}”: they set off from the same place and part the other way.`)
        : tz == null ? (q0 > 0 ? `“${say(D)}” the whole time: ${tiny(Math.hypot(A.v.x, A.v.y)) && tiny(Math.hypot(B.v.x, B.v.y)) ? 'neither moves' : 'they move along that line together'}.` : `Never “${say(D)}”: they stay on that line the other way round.`)
          : q0 > 0 ? (tz > 0 ? `“${say(D)}” from the start until ${M`t = ${d(tz)} [${U.time}]`}, when they are at the same place; after that, the other way round.` : `“${say(D)}” the whole time.`)
            : (tz > 0 ? `“${say(D)}” from ${M`t = ${d(tz)} [${U.time}]`} on, when they pass the same place; before that, the other way round.` : `Never “${say(D)}”.`));
    } else if (tiny(a1)) {
      notes.push(`Never “${say(D)}”: the line between them never turns that way.`);
    } else {
      const t = snap(-a0 / a1), dl = { x: c.x + m.x * t, y: c.y + m.y * t };
      if (t < -1e-9) notes.push(`“${say(D)}” only before the start, at ${M`t = ${d(t)} [${U.time}]`}.`);
      else if (Math.hypot(dl.x, dl.y) < 1e-9 * Math.max(1, Math.hypot(c.x, c.y))) notes.push(`At ${M`t = ${d(t)} [${U.time}]`} they are at the same place: they meet, and there is no direction between them.`);
      else if (dl.x * D.x + dl.y * D.y <= EPS) notes.push(`At ${M`t = ${d(t)} [${U.time}]`} they line up the other way round: never “${say(D)}”.`);
      else {
        const dist = snap(Math.hypot(dl.x, dl.y));
        dueRows.push({ f: rel, s: M`${relSub(D, c, m, 't')}`, r: M`t = ${d(t)} [${U.time}]` });
        dueRows.push({ f: M`abs(vec r_A - vec r_B)`, s: M`sqrt(${sgn(snap(dl.x))}^2 + ${sgn(snap(dl.y))}^2)`, r: M`${d(dist)} [${U.len}]` });
        notes.push(`${say(D)} at ${M`t = ${d(t)} [${U.time}]`}, ${M`${d(dist)} [${U.len}]`} apart.`);
        derived.push(`${at.bOfA ? COMPASS[at.due].word : D.word} at ${M`t = ${d(t)} [${U.time}]`}, ${M`${d(dist)} [${U.len}]`} apart`);
        answers.push({ kind: 'due', t, dist });
      }
    }
  }
  // when are they `apart` apart? |c + m t|² = d²
  const apartRows = [];
  if (have(at.apart)) {
    if (!(at.apart >= 0)) return fail('A distance apart is a size: give it as 0 or more.');
    const q2 = m.x * m.x + m.y * m.y, q1 = 2 * (c.x * m.x + c.y * m.y), q0 = c.x * c.x + c.y * c.y - at.apart * at.apart;
    // the same velocity: the gap never changes, so it is that far apart always or never
    const always = tiny(q2) && tiny(q0);
    const ts = tiny(q2) ? (tiny(q0) ? [0] : []) : quadRoots(q2, q1, q0).map(snap).filter((t) => t >= -1e-9);
    apartRows.push({ f: M`(abs(vec r_A - vec r_B))^2 = d^2`, s: M`${sq(lin(c.x, m.x))}^2 + ${sq(lin(c.y, m.y))}^2 = ${d(at.apart)}^2`,
      r: ts.length ? M`t = ${ts.map((t) => d(t)).join(' "or" ')} [${U.time}]` : M`"no time from the start"` });
    notes.push(always ? `They are ${M`${d(at.apart)} [${U.len}]`} apart the whole time: with the same velocity, the gap between them never changes.`
      : ts.length ? `They are ${M`${d(at.apart)} [${U.len}]`} apart at ${ts.map((t) => M`t = ${d(t)} [${U.time}]`).join(' and ')}.`
        : at.apart < 1e-12 ? 'They never meet.' : `They are never ${M`${d(at.apart)} [${U.len}]`} apart after the start.`);
    if (ts.length) derived.push(`${M`${d(at.apart)} [${U.len}]`} apart at ${M`t = ${ts.map((t) => d(t)).join(', ')} [${U.time}]`}`);
    answers.push({ kind: 'apart', times: ts });
  }
  if (!derived.length) derived.push(`A at ${M`${d(heads.find((h) => h.who === 'A')?.sp ?? 0)} [${U.speed}]`}`);

  const times = answers.flatMap((a) => a.times || [a.t]).filter((t) => have(t) && t >= 0);
  // long enough to show every moment asked about, and a little after
  const tMax = times.length ? Math.max(0.2, ...times.map((t) => t * 1.4 + 0.05)) : 1;
  const f = {
    kind: 'twoplane', tMax, tFlight: tMax, A, B, U, answers, due: dueKey ? COMPASS[dueKey] : null,
    posA: (t) => pos(A, t), posB: (t) => pos(B, t), gap: (t) => snap(Math.hypot(c.x + m.x * t, c.y + m.y * t)),
    pos: (t) => pos(A, t), vel: () => A.v,
    params: { u: 0, theta: 0, h: 0, g: 0 }, bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
    path(n = 200, tEnd = tMax) { const o = []; for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; o.push({ t, ...pos(A, t) }); } return o; },
  };
  return { ok: true, mode: 'twoplane', axis: 'plane', A, B, U, p, f, heads, rows, motion, dueRows, apartRows, notes, derived, answers,
    params: f.params, convention: `East is ${M`vec i`} and north is ${M`vec j`}; bearings are measured clockwise from north.` };
}

export function twoPlaneWorking(solved) {
  if (!solved?.ok) return [];
  const out = [];
  if (solved.rows.length) out.push({ title: 'p, from where A is at that time', rows: solved.rows,
    note: 'B’s velocity is p times a known vector, so its position is linear in p; one direction between them at one time fixes it.' });
  out.push({ title: 'Where each is', rows: solved.motion, note: 'Each moves at a constant velocity: position = start + velocity × time.' });
  for (const hd of solved.heads) out.push({ title: `${hd.who}’s speed and bearing`, rows: hd.rows, note: 'A bearing is measured clockwise from north.' });
  if (solved.dueRows.length) out.push({ title: 'When A is in that direction from B', rows: solved.dueRows,
    note: 'In a compass direction, the two parts of the vector between them are in a fixed ratio: one equation in t.' });
  if (solved.apartRows.length) out.push({ title: 'When they are that far apart', rows: solved.apartRows,
    note: 'The length of the vector between them, squared, is a quadratic in t.' });
  return out;
}
