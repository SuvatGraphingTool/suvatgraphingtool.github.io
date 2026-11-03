// course.js — a ship at a constant velocity that changes course: two legs,
// each r = r₀ + vt, on one clock, against a fixed point (a rock, a buoy).
//
// The exam family (Edexcel M1 Jun 2006 Q7): a ship heads straight for a
// submerged rock — at its speed it would hit it at 1500, which fixes where the
// rock is; warned, the captain holds the course until 1400 and then turns due
// north at 5 km h⁻¹. Its speed and bearing; where the rock is; its position t
// hours after the turn; when it is due east of the rock; how far from it at
// 1600. Times on a 24-hour clock ("1400"), or hours from t = 0 when none is.
//
// CONVENTION. i is east and j north; positions from the origin O; bearings
// clockwise from north. Internally every time is hours (or seconds) after the
// first, t = 0.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { COMPASS, vsrc } from './plane.js';
import { UNITS, bearing, vecT, lin } from './twoplane.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const tiny = (x) => Math.abs(x) < 1e-9;
const sgn = (x) => (d(x).startsWith('−') ? `(${d(x)})` : d(x));
const V = (x, y) => ({ x: snap(x), y: snap(y) });
const vec = (o) => ({ x: have(o?.x) ? o.x : 0, y: have(o?.y) ? o.y : 0 });
const given = (o) => o && (have(o.x) || have(o.y));
/** a start to add to, as source: nothing for O, so never (0) + … */
const from = (r) => (vsrc(r) === '0' ? '' : `(${vsrc(r)}) + `);

/** A 24-hour clock time written as the papers do, 1400 or 0930: its hours past midnight, or null. */
export function clockHours(x) {
  if (!have(x) || x < 0 || x >= 2400 || Math.abs(x - Math.round(x)) > 1e-9) return null;
  const mm = Math.round(x) % 100;
  return mm >= 60 ? null : Math.floor(Math.round(x) / 100) + mm / 60;
}
/** Hours past midnight as the papers write a time, 1512: to the nearest minute, round the clock. */
export function clockOf(hours) {
  const m = ((Math.round(hours * 60) % 1440) + 1440) % 1440;
  return Math.floor(m / 60) * 100 + (m % 60);
}
/** 1512 as it is printed: four figures. */
export const clockText = (c) => String(c).padStart(4, '0');

/**
 * @param k {
 *   units: 'km' | 'm',
 *   t0:    the clock time of the start (1200), or blank: times are then hours from t = 0
 *   r0, v1: where it is at the start, and its velocity
 *   R:     the rock, or tHit: the time it would reach it on its first course
 *   tc:    the time it changes course; v2 its new velocity — or sp2 and dir2 (5, 'N': due north at 5)
 *   due:   a compass key: when is the ship due that way of the rock?
 *   T:     a time: where is it then, and how far from the rock?
 * }
 */
export function solveCourse(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const U = UNITS[k.units] || UNITS.km;
  const clocked = have(k.t0);
  const h0 = clocked ? clockHours(k.t0) : 0;
  if (clocked && k.units === 'm') return fail('Clock times go with km and hours: in metres and seconds, give each time as seconds from the start.');
  if (clocked && h0 == null) return fail('Give the start as a time as the paper writes it, in four figures: 1200 for noon, 0930 for half past nine.');
  // a clock time past midnight is on a later day: said so, never passed off as the same day
  const day = (x) => { const n = Math.floor((h0 + x + 1e-9) / 24); return !clocked || n < 1 ? '' : n === 1 ? ' the next day' : ` ${n} days later`; };
  const when = (x) => (clocked ? M`${clockText(clockOf(h0 + x))}` : M`t = ${d(x)} [${U.time}]`);
  const whenAt = (x) => `at ${when(x)}${day(x)}`;
  /** a time given as the paper gives it, as hours after the start */
  const after = (x, what) => {
    if (!have(x)) return { t: null };
    if (!clocked) return x < 0 ? { err: `${what} is after the start: give it as a positive number.` } : { t: x };
    const hx = clockHours(x);
    if (hx == null) return { err: `Give ${what.toLowerCase()} in four figures, as the start is: 1400, 1530.` };
    if (hx < h0 - 1e-9) return { err: `${what} is before the start, ${clockText(k.t0)}: on one day, a later time.` };
    return { t: snap(hx - h0) };
  };
  if (!given(k.v1)) return fail('Give the ship’s velocity on its first course, as its two parts.');
  const r0 = vec(k.r0), v1 = vec(k.v1);
  if (tiny(Math.hypot(v1.x, v1.y))) return fail('The ship must be moving on its first course: a velocity of zero goes nowhere.');
  const C = after(k.tc, 'The change of course');
  if (C.err) return fail(C.err);
  const H = after(k.tHit, 'The time it would reach the rock');
  if (H.err) return fail(H.err);
  const A = after(k.T, 'The time asked about');
  if (A.err) return fail(A.err);
  if (given(k.R) && H.t != null) return fail('Give where the rock is, or the time the ship would reach it on its course — not both: the time fixes where it is.');

  const rows = [], notes = [], derived = [];
  const heads = [];
  const head = (v, who) => {
    const sp = snap(Math.hypot(v.x, v.y));
    if (tiny(sp)) return null;
    const br = bearing(v);
    const bearingSub = tiny(v.x) ? M`${v.y > 0 ? '0°' : '180°'}` : tiny(v.y) ? M`${v.x > 0 ? '90°' : '270°'}`
      : (() => { const a = `tan^-1 (${d(Math.abs(v.x))}/${d(Math.abs(v.y))})`; return v.x > 0 ? (v.y > 0 ? M`${a}` : M`180° - ${a}`) : (v.y < 0 ? M`180° + ${a}` : M`360° - ${a}`); })();
    const o = { who, sp, br, rows: [
      { f: M`abs(vec v) = sqrt(v_x^2 + v_y^2)`, s: M`sqrt(${sgn(v.x)}^2 + ${sgn(v.y)}^2)`, r: M`${d(sp)} [${U.speed}]` },
      { f: M`"bearing"`, s: tiny(v.x) || tiny(v.y) ? M`"due ${tiny(v.x) ? (v.y > 0 ? 'north' : 'south') : v.x > 0 ? 'east' : 'west'}"` : bearingSub, r: M`${num(br, 1, { trim: true })}°` }] };
    heads.push(o);
    return o;
  };
  head(v1, 'first');

  // ── the first course
  const leg1 = [{ f: M`vec r = vec r_0 + vec(v)t`, s: '', r: M`vec r = ${vecT([r0.x, v1.x], [r0.y, v1.y])}` }];

  // ── the rock: given, or where the first course reaches at the time it would hit
  let R = null, tHit = null;
  if (H.t != null) {
    if (!(H.t > 0)) return fail('The ship would reach the rock after the start: give a later time.');
    tHit = H.t;
    R = V(r0.x + v1.x * tHit, r0.y + v1.y * tHit);
    rows.push({ f: M`vec R = vec r_0 + vec(v)t`, s: M`${from(r0)}${d(tHit)}(${vsrc(v1)})`, r: M`vec R = ${vsrc(R)} [${U.len}]` });
    notes.push(`On its first course it would reach the rock ${whenAt(tHit)}, so the rock is at ${M`${vsrc(R)} [${U.len}]`}.`);
    derived.push(M`vec R = ${vsrc(R)}`);
  } else if (given(k.R)) {
    R = vec(k.R);
    // is the rock on the first course? both parts reached at one time
    const tx = tiny(v1.x) ? null : (R.x - r0.x) / v1.x, ty = tiny(v1.y) ? null : (R.y - r0.y) / v1.y;
    const on = tx == null ? tiny(R.x - r0.x) && ty : ty == null ? tiny(R.y - r0.y) && tx : Math.abs(tx - ty) < 1e-9 ? tx : null;
    if (have(on) && on > 1e-9) tHit = snap(on);
  }

  // ── the change of course
  let tc = C.t, Pc = null, v2 = null;
  const newV = [];
  const v2Given = given(k.v2), spGiven = have(k.sp2) || COMPASS[k.dir2];
  if (v2Given && spGiven) return fail('Give the new velocity as its two parts, or as a speed and a direction — not both.');
  if (tc == null && (v2Given || spGiven)) return fail('Say when the ship changes course: the time it turns onto its new velocity.');
  if (tc != null) {
    if (!(tc > 0)) return fail('The change of course comes after the start: give a later time.');
    if (tHit != null && tc > tHit - 1e-9) return fail(`On its first course it reaches the rock ${whenAt(tHit)}${tc > tHit + 1e-9 ? ', before it changes course' : ', the moment it would turn'}: give an earlier change.`);
    if (v2Given) v2 = vec(k.v2);
    else if (spGiven) {
      if (!(have(k.sp2) && k.sp2 >= 0)) return fail('Give the new speed as a number, 0 or more.');
      const D = COMPASS[k.dir2];
      if (!D) return fail('Give the new direction: due north, east, south or west, or between them.');
      const n = Math.hypot(D.x, D.y);
      v2 = V((k.sp2 * D.x) / n, (k.sp2 * D.y) / n);
      newV.push({ f: M`${d(k.sp2)} [${U.speed}] "due ${D.word}"`, s: D.x && D.y ? M`(${d(k.sp2)}/sqrt(2))(${vsrc(D)})` : '', r: M`vec v = ${vsrc(v2)} [${U.speed}]` });
    } else return fail('Give the new velocity: its two parts, or a speed and a direction.');
    Pc = V(r0.x + v1.x * tc, r0.y + v1.y * tc);
  }
  const legs = [{ t0: 0, t1: tc ?? Infinity, r0, v: v1 }];
  if (tc != null) legs.push({ t0: tc, t1: Infinity, r0: Pc, v: v2 });
  const legAt = (t) => (legs.length > 1 && t >= tc - 1e-12 ? legs[1] : legs[0]);
  const pos = (t) => { const L = legAt(t); return { x: L.r0.x + L.v.x * (t - L.t0), y: L.r0.y + L.v.y * (t - L.t0) }; };
  const vel = (t) => legAt(t).v;

  const turn = [];
  let afterExpr = null;
  if (tc != null) {
    turn.push(...newV);
    turn.push({ f: M`vec r = vec r_0 + vec(v)t`, s: M`${from(r0)}${d(tc)}(${vsrc(v1)})`, r: M`vec r = ${vsrc(Pc)} [${U.len}]` });
    afterExpr = M`vec r = ${vecT([Pc.x, v2.x], [Pc.y, v2.y])}`;
    turn.push({ f: M`vec r = vec r_1 + vec(v)t`, s: M`${from(Pc)}t(${vsrc(v2)})`, r: afterExpr });
    notes.push(`It changes course ${whenAt(tc)} at ${M`${vsrc(Pc)} [${U.len}]`}; ${M`t`} ${U.time === 'h' ? 'hours' : 'seconds'} after that it is at ${afterExpr}.`);
    if (!tiny(Math.hypot(v2.x, v2.y))) head(v2, 'new');
    if (tHit != null && H.t == null) notes.push(`Held on its first course, it would have reached the rock ${whenAt(tHit)}.`);
  } else if (tHit != null) notes.push(`Held on this course, it reaches the rock ${whenAt(tHit)}.`);
  // does its new course take it onto the rock? Δ = (r₁ − R) + v₂ s = 0, both parts at one s
  let hitNew = null;
  if (R && tc != null) {
    const c = { x: Pc.x - R.x, y: Pc.y - R.y };
    const sx = tiny(v2.x) ? (tiny(c.x) ? null : NaN) : -c.x / v2.x, sy = tiny(v2.y) ? (tiny(c.y) ? null : NaN) : -c.y / v2.y;
    const s0 = sx == null ? sy : sy == null ? sx : Math.abs(sx - sy) < 1e-9 ? sx : NaN;
    if (have(s0) && s0 > 1e-9) { hitNew = snap(tc + s0); notes.push(`Its new course takes it onto the rock too, ${whenAt(hitNew)}.`); }
  }

  // ── when is the ship due `due` of the rock? On each leg Δ = r − R is linear in t
  const answers = {};
  const dueRows = [];
  if (k.due) {
    const D = COMPASS[k.due];
    if (!D) return fail('Say which way: due north, east, south or west of the rock, or between them.');
    if (!R) return fail(`To find when it is due ${D.word} of the rock, say where the rock is — or when the ship would reach it.`);
    const found = [];
    for (const [i, L] of legs.entries()) {
      const c = { x: L.r0.x - R.x, y: L.r0.y - R.y }, m = L.v;            // Δ = c + m s, s from the leg's start
      const a0 = c.x * D.y - c.y * D.x, a1 = m.x * D.y - m.y * D.x;
      if (tiny(a1)) {
        // the line to the rock never turns on this leg: either it is never that way, or it sails along
        // that line, that way of the rock from the leg's start (it is due that way the whole stretch)
        const q0 = c.x * D.x + c.y * D.y, q1 = m.x * D.x + m.y * D.y;
        if (tiny(a0) && q0 > 1e-9) found.push({ leg: i, s: 0, t: L.t0, dl: V(c.x, c.y), c, m, along: true, until: q1 < -1e-9 ? snap(L.t0 - q0 / q1) : null });
        continue;
      }
      const s = snap(-a0 / a1), t = snap(L.t0 + s);
      if (s < -1e-9 || t > L.t1 + 1e-9) continue;
      const dl = { x: c.x + m.x * s, y: c.y + m.y * s };
      if (Math.hypot(dl.x, dl.y) < 1e-9 || dl.x * D.x + dl.y * D.y <= 1e-9) continue;
      found.push({ leg: i, s, t, dl: V(dl.x, dl.y), c, m });
    }
    const rel = D.x === 0 ? M`x = x_R` : D.y === 0 ? M`y = y_R` : D.x === D.y ? M`x - x_R = y - y_R` : M`x - x_R = -(y - y_R)`;
    if (!found.length) notes.push(`It is never due ${D.word} of the rock${tc != null ? ' on either course' : ''}.`);
    else {
      const a = found[0], L = legs[a.leg], p = V(R.x + a.dl.x, R.y + a.dl.y), dist = snap(Math.hypot(a.dl.x, a.dl.y));
      const cx = lin(L.r0.x - R.x, L.v.x).replace(/t/g, 's'), cy = lin(L.r0.y - R.y, L.v.y).replace(/t/g, 's');
      const sub = D.y === 0 ? M`${lin(L.r0.y, L.v.y)} = ${d(R.y)}` : D.x === 0 ? M`${lin(L.r0.x, L.v.x)} = ${d(R.x)}` : D.x === D.y ? M`${cx.replace(/s/g, 't')} = ${cy.replace(/s/g, 't')}` : M`${cx.replace(/s/g, 't')} = -(${cy.replace(/s/g, 't')})`;
      dueRows.push(a.along ? { f: rel, s: M`"it moves along that line"`, r: a.leg ? M`"from the turn"` : M`"from" t = 0` }
        : { f: rel, s: sub, r: a.leg ? M`t = ${d(a.s)} [${U.time}] "after the turn"` : M`t = ${d(a.s)} [${U.time}]` });
      if (clocked) dueRows.push({ f: M`"the time"`, s: M`${d(a.s)} [h] "after" ${clockText(clockOf(h0 + legs[a.leg].t0))}`, r: when(a.t) });
      dueRows.push({ f: M`abs(vec r - vec R)`, s: M`sqrt(${sgn(a.dl.x)}^2 + ${sgn(a.dl.y)}^2)`, r: M`${d(dist)} [${U.len}]` });
      notes.push(a.along ? `It sails along the line through the rock, due ${D.word} of it from ${whenAt(a.t).replace(/^at /, '')}${a.until != null ? ` until it reaches it ${whenAt(a.until)}` : ''}.`
        : `It is due ${D.word} of the rock ${whenAt(a.t)}, ${M`${d(dist)} [${U.len}]`} from it, at ${M`${vsrc(p)} [${U.len}]`}.`);
      derived.push(`due ${D.word} of the rock ${whenAt(a.t)}`);
      answers.due = { t: a.t, along: !!a.along, day: day(a.t), after: a.leg ? a.s : null, hhmm: clocked ? clockOf(h0 + a.t) : null, pos: p, dist, word: D.word, leg: a.leg };
    }
  }

  // ── where it is at a time asked, and how far from the rock
  const atRows = [];
  if (A.t != null) {
    const t = A.t, L = legAt(t), p = V(pos(t).x, pos(t).y), s = snap(t - L.t0);
    atRows.push({ f: L === legs[0] ? M`vec r = vec r_0 + vec(v)t` : M`vec r = vec r_1 + vec(v)t`, s: M`${from(L.r0)}${d(s)}(${vsrc(L.v)})`, r: M`vec r = ${vsrc(p)} [${U.len}]` });
    const out = { t, hhmm: clocked ? clockOf(h0 + t) : null, day: day(t), pos: p };
    if (R) {
      const dl = V(p.x - R.x, p.y - R.y), dist = snap(Math.hypot(dl.x, dl.y));
      atRows.push({ f: M`vec r - vec R`, s: M`(${vsrc(p)}) - (${vsrc(R)})`, r: M`${vsrc(dl)}` });
      atRows.push({ f: M`abs(vec r - vec R)`, s: M`sqrt(${sgn(dl.x)}^2 + ${sgn(dl.y)}^2)`, r: M`${d(dist)} [${U.len}]` });
      notes.push(`${whenAt(t).replace(/^./, (c) => c.toUpperCase())} it is at ${M`${vsrc(p)} [${U.len}]`}, ${M`${d(dist)} [${U.len}]`} from the rock.`);
      derived.push(`${M`${d(dist)} [${U.len}]`} from the rock ${whenAt(t)}`);
      Object.assign(out, { d: dl, dist });
    } else notes.push(`${whenAt(t).replace(/^./, (c) => c.toUpperCase())} it is at ${M`${vsrc(p)} [${U.len}]`}.`);
    answers.at = out;
  }
  // the speeds and bearings first, in course order
  const speedNotes = heads.map((hd) => `On its ${hd.who} course it moves at ${M`${d(hd.sp)} [${U.speed}]`} on a bearing of ${M`${num(hd.br, 1, { trim: true })}°`}.`);
  if (!derived.length) derived.push(`${M`${d(heads[0].sp)} [${U.speed}]`} on ${M`${num(heads[0].br, 0)}°`}`);

  const times = [tc, tHit, hitNew, answers.due?.t, A.t].filter((x) => have(x) && x >= 0);
  const tMax = Math.max(0.5, ...times.map((x) => x * 1.12));
  const f = {
    kind: 'course', hitNew, tMax, tFlight: tMax, U, clocked, h0, legs, tc, tHit, R, Pc, answers,
    pos, vel, clock: (t) => (clocked ? clockOf(h0 + t) : null),
    dist: (t) => (R ? snap(Math.hypot(pos(t).x - R.x, pos(t).y - R.y)) : null),
    params: { u: 0, theta: 0, h: 0, g: 0 }, bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
    path(n = 200, tEnd = tMax) { const o = []; for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; o.push({ t, ...pos(t) }); } return o; },
  };
  return { ok: true, mode: 'course', axis: 'plane', U, f, R, Pc, tc, tHit, heads, leg1, rows, turn, dueRows, atRows, answers,
    after: afterExpr ? { html: afterExpr } : null, notes: [...speedNotes, ...notes], derived, params: f.params,
    convention: `East is ${M`vec i`} and north is ${M`vec j`}; bearings are measured clockwise from north.` };
}

export function courseWorking(s) {
  if (!s?.ok) return [];
  const out = [];
  out.push({ title: 'On its first course', rows: [...s.leg1, ...s.heads[0].rows], note: 'At a constant velocity, position = start + velocity × time. A bearing is measured clockwise from north.' });
  if (s.rows.length) out.push({ title: 'Where the rock is', rows: s.rows, note: 'Held on its first course the ship would reach the rock at that time, so the rock is where the ship would be then.' });
  if (s.turn.length) out.push({ title: 'After the change of course', rows: [...s.turn, ...(s.heads[1]?.rows || [])], note: 'From where it turns, with its new velocity: t is now counted from the turn.' });
  if (s.dueRows.length) out.push({ title: `Due ${s.answers.due.word} of the rock`, rows: s.dueRows,
    note: s.answers.due.word.includes('-') ? 'In that direction, the two parts of the vector from the rock are in a fixed ratio.' : 'Due east or west, the ship and the rock have the same j part; due north or south, the same i part.' });
  if (s.atRows.length) out.push({ title: 'At the time asked', rows: s.atRows, note: 'Its distance from the rock is the length of the vector between them.' });
  return out;
}
