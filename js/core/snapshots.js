// snapshots.js — a particle moving in a plane with a constant acceleration in
// i and j, known not from its start but from two moments: its velocity at two
// times (so the acceleration is the change over the time between), or where
// it starts and where it is later (so the acceleration, or the starting
// velocity, is what gets it there). At the second moment its acceleration may
// change to another constant one: then it is two stages, the second starting
// with the position and velocity the first ended with.
//
// NO NEW PHYSICS. Each stage is the library's own constant-acceleration motion
// in a plane (js/core/plane.js `planeMotion`): v = u + at and
// r = r₀ + ut + ½at², each two SUVAT equations side by side. This file only
// runs them backwards from what the paper gives, joins the stages, and answers
// the paper's questions: the velocity, speed and position at a time, and when
// it is moving in a compass direction.
//
// CONVENTION. Metres and seconds; i east, j north; t from t = 0 throughout.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { planeMotion, vsrc, COMPASS } from './plane.js';
import { snap } from './numeric.js';
import { poly } from './pair.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const hasV = (o) => o && (have(o.x) || have(o.y));
const vec = (o) => ({ x: snap(o?.x ?? 0), y: snap(o?.y ?? 0) });
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const vb = (v) => { const s = vsrc(v); return / /.test(s) || s.startsWith('-') ? `(${s})` : s; };
const add = (p, q, k = 1) => ({ x: snap(p.x + k * q.x), y: snap(p.y + k * q.y) });
const mag = (v) => snap(Math.hypot(v.x, v.y));
const sq = (x) => (x < 0 ? `(${d(x)})` : d(x));

/**
 * @param k { r0, u, tu, a, at2: { kind: 'r' | 'v', t, v: {x, y} }, a2, ask: { t, dir } }
 *   r0   where it is at t = 0 (blank parts 0)
 *   u    its velocity at time tu (tu blank: 0)
 *   a    its acceleration, when the paper gives it
 *   at2  the second moment: its position ('r') or velocity ('v') at time t
 *   a2   a new acceleration from the second moment on
 *   ask  a time to give the velocity, speed and position at; a compass
 *        direction to find when it is moving in
 */
export function solveSnapshots(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const r0 = vec(k.r0), tu = have(k.tu) ? k.tu : 0;
  const second = k.at2 && have(k.at2.t) && hasV(k.at2.v) ? { kind: k.at2.kind === 'v' ? 'v' : 'r', t: k.at2.t, v: vec(k.at2.v) } : null;
  if (k.at2 && have(k.at2.t) !== hasV(k.at2.v)) return fail(have(k.at2.t) ? 'The second moment has a time but no position or velocity: give its i and j parts, or clear the time.' : 'The second moment has a position or velocity but no time: give when it is.');
  if (second && !(second.t > 0)) return fail('The second moment is at a time after t = 0.');
  if (tu < 0) return fail('The time its velocity is known at is 0 or later.');
  const T = second?.t;
  const rows = [];
  let u, a;

  // ── the first stage, from whatever two moments the paper gives
  const gotU = hasV(k.u), gotA = hasV(k.a);
  if (second?.kind === 'v') {
    if (!gotU) return fail('Still needed: its velocity at another time, to find the acceleration from the change.');
    if (gotA) return fail('Give the acceleration or a second velocity, not both: two velocities fix the acceleration.');
    if (Math.abs(T - tu) < 1e-12) return fail('The two velocities are at the same time: give them at two different times.');
    const v1 = vec(k.u);
    a = { x: snap((second.v.x - v1.x) / (T - tu)), y: snap((second.v.y - v1.y) / (T - tu)) };
    rows.push({ f: M`vec(a) = (vec v_2 - vec v_1)/(t_2 - t_1)`, s: M`(${vb(second.v)} - ${vb(v1)})/(${d(T)} - ${d(tu)})`, r: M`vec(a) = ${vb(a)} [m s^-2]` });
    u = add(v1, a, -tu);
    if (tu > 0) rows.push({ f: M`vec(u) = vec v_1 - vec(a)t_1`, s: M`${vb(v1)} - ${d(tu)}${vb(a)}`, r: M`vec(u) = ${vb(u)} [m s^-1]` });
  } else if (second?.kind === 'r') {
    if (tu !== 0) return fail('With two positions, give the velocity at t = 0.');
    if (gotU && gotA) return fail('Give the velocity or the acceleration, not both: with two positions, one fixes the other.');
    if (!gotU && !gotA) return fail('Still needed: its velocity at t = 0 or its acceleration — with the two positions, either fixes the other.');
    const rT = second.v, dr = add(rT, r0, -1);
    if (gotU) {
      u = vec(k.u);
      a = { x: snap(2 * (dr.x - u.x * T) / (T * T)), y: snap(2 * (dr.y - u.y * T) / (T * T)) };
      rows.push({ f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: M`${vb(rT)} = ${vb(r0)} + ${d(T)}${vb(u)} + ½ * ${d(T)}^2 vec(a)`, r: M`vec(a) = ${vb(a)} [m s^-2]` });
    } else {
      a = vec(k.a);
      u = { x: snap((dr.x - 0.5 * a.x * T * T) / T), y: snap((dr.y - 0.5 * a.y * T * T) / T) };
      rows.push({ f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: M`${vb(rT)} = ${vb(r0)} + ${d(T)}vec(u) + ½ * ${d(T)}^2 ${vb(a)}`, r: M`vec(u) = ${vb(u)} [m s^-1]` });
    }
  } else {
    if (!gotU || !gotA) return fail('Still needed: its velocity and its acceleration — or a second moment (a velocity or a position at a later time) to find one of them.');
    a = vec(k.a); u = add(vec(k.u), a, -tu);
    if (tu > 0) rows.push({ f: M`vec(u) = vec(v) - vec(a)t`, s: M`${vb(vec(k.u))} - ${d(tu)}${vb(a)}`, r: M`vec(u) = ${vb(u)} [m s^-1]` });
  }
  const derived = [`${M`vec(a) = ${vb(a)}`}, ${M`abs(vec a) = ${d(mag(a))} [m s^-2]`}`];
  rows.push({ f: M`abs(vec a) = sqrt(a_x^2 + a_y^2)`, s: M`sqrt(${sq(a.x)}^2 + ${sq(a.y)}^2)`, r: M`abs(vec a) = ${d(mag(a))} [m s^-2]` });

  // ── the second stage, when the acceleration changes at the second moment
  const m1 = planeMotion({ r0, u, a }, Infinity);
  let stage2 = null;
  const switchRows = [];
  if (hasV(k.a2)) {
    if (!second) return fail('A new acceleration starts at the second moment: give that moment.');
    const a2 = vec(k.a2), rS = m1.pos(T), vS = m1.vel(T);
    switchRows.push({ f: M`vec(v) = vec(u) + vec(a)t`, s: M`${vb(u)} + ${d(T)}${vb(a)}`, r: M`vec(v) = ${vb(vS)} [m s^-1]` });
    if (second.kind !== 'r') switchRows.push({ f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: M`${vb(r0)} + ${d(T)}${vb(u)} + ½ * ${d(T)}^2 ${vb(a)}`, r: M`vec r = ${vb(rS)} [m]` });
    stage2 = { t0: T, r0: rS, u: vS, a: a2, m: planeMotion({ r0: rS, u: vS, a: a2 }, Infinity) };
  }
  const pos = (t) => (stage2 && t > T ? stage2.m.pos(t - T) : m1.pos(t));
  const vel = (t) => (stage2 && t > T ? stage2.m.vel(t - T) : m1.vel(t));
  const acc = (t) => (stage2 && t > T ? stage2.a : a);

  // ── the questions
  const askRows = [], notes = [], marks = [];
  if (have(k.ask?.t)) {
    const t = k.ask.t;
    if (!(t >= 0)) return fail('The time asked about is 0 or later.');
    const v = vel(t), r = pos(t), inTwo = stage2 && t > T, tt = inTwo ? t - T : t, base = inTwo ? stage2 : { u, a, r0 };
    askRows.push({ f: M`vec(v) = vec(u) + vec(a)t`, s: M`${vb(base.u)} + ${d(snap(tt))}${vb(base.a)}`, r: M`vec(v) = ${vb(v)} [m s^-1]` });
    askRows.push({ f: M`abs(vec v) = sqrt(v_x^2 + v_y^2)`, s: M`sqrt(${sq(v.x)}^2 + ${sq(v.y)}^2)`, r: M`abs(vec v) = ${d(mag(v))} [m s^-1]` });
    askRows.push({ f: M`vec r = vec r_0 + vec(u)t + ½vec(a)t^2`, s: M`${vb(base.r0)} + ${d(snap(tt))}${vb(base.u)} + ½ * ${d(snap(tt))}^2 ${vb(base.a)}`, r: M`vec r = ${vb(r)} [m]` });
    notes.push(`At ${M`t = ${d(t)} [s]`} its speed is ${M`${d(mag(v))} [m s^-1]`}, at ${M`${vb(r)} [m]`}.`);
    marks.push({ t, what: 'asked' });
  }
  let tDir = null;
  if (k.ask?.dir && COMPASS[k.ask.dir]) {
    const C = COMPASS[k.ask.dir], st = stage2 || { t0: 0, u, a };
    // moving in direction C: v parallel to C and the same way — v_x·C_y − v_y·C_x = 0, linear in t
    const c1 = st.u.x * C.y - st.u.y * C.x, c2 = st.a.x * C.y - st.a.y * C.x;
    // the moment(s) its velocity is along that line; then it must point the right way
    const dot = (t) => (st.u.x + st.a.x * t) * C.x + (st.u.y + st.a.y * t) * C.y;
    let tt = null, from = false;
    if (Math.abs(c2) > 1e-12) tt = snap(-c1 / c2);
    else if (Math.abs(c1) < 1e-12) {
      // always along the line: moving that way once the velocity points that way
      const p0 = st.u.x * C.x + st.u.y * C.y, p1 = st.a.x * C.x + st.a.y * C.y;
      if (p0 > 1e-9) tt = 0; else if (p1 > 1e-12) { tt = snap(-p0 / p1); from = true; }
    }
    const v = tt != null && tt >= 0 ? { x: st.u.x + st.a.x * tt, y: st.u.y + st.a.y * tt } : null;
    const still = v && Math.hypot(v.x, v.y) < 1e-9;
    const ok = v && (dot(tt) > 1e-9 || (from && still));
    const rel = C.x === 0 ? M`v_x = 0` : C.y === 0 ? M`v_y = 0` : C.x === C.y ? M`v_x = v_y` : M`v_x = -v_y`;
    const comp = (p) => poly([st.u[p], st.a[p], 0]);
    askRows.push({ f: rel, s: C.x === 0 ? M`${comp('x')} = 0` : C.y === 0 ? M`${comp('y')} = 0` : C.x === C.y ? M`${comp('x')} = ${comp('y')}` : M`${comp('x')} = -(${comp('y')})`,
      r: tt != null && !from ? M`t = ${d(tt)} [s]` : from ? M`"always along it"` : M`"never"` });
    const when = (t) => (stage2 ? `${M`${d(t)} [s]`} after the acceleration changes, at ${M`t = ${d(snap(st.t0 + t))} [s]`}` : `at ${M`t = ${d(t)} [s]`}`);
    if (ok) {
      tDir = snap(st.t0 + tt);
      notes.push(from ? `Its velocity is always along that line; it is moving ${C.word} from the moment it starts to point that way, ${when(tt)}.`
        : `It is moving ${C.word} ${when(tt)}, with velocity ${M`${vb(vec(v))} [m s^-1]`}.`);
      marks.push({ t: tDir, what: C.word });
    } else notes.push(still ? `${when(tt).replace(/^at/, 'At')} it is at rest, not moving at all: it is never moving ${C.word}${stage2 ? ' after the change' : ''}.`
      : tt != null && tt >= 0 ? `${when(tt).replace(/^at/, 'At')} its velocity is along that line but pointing the other way: it is never moving ${C.word}${stage2 ? ' after the change' : ''}.`
        : `It is never moving ${C.word}${stage2 ? ' after the change' : ''}.`);
  }

  const tEnd = Math.max(T ?? 0, have(k.ask?.t) ? k.ask.t : 0, tDir ?? 0, tu, 1);
  const tMax = snap(tEnd * 1.15);
  const f = { kind: 'snapshots', tMax, tFlight: tMax, pos, vel, acc, T: T ?? null, second, switched: !!stage2, marks, r0,
    params: { u: mag(u), g: 0, h: 0, theta: 0 } };
  return { ok: true, mode: 'snapshots', u, a, a2: stage2?.a ?? null, T, rows, switchRows, askRows, notes, derived, f, tDir, dirWord: tDir != null ? COMPASS[k.ask.dir].word : null, dirAsked: k.ask?.dir && COMPASS[k.ask.dir] ? COMPASS[k.ask.dir].word : null, found: second?.kind === 'r' && hasV(k.a) ? 'u' : 'a', askT: have(k.ask?.t) ? k.ask.t : null, askSpeed: have(k.ask?.t) ? mag(vel(k.ask.t)) : null };
}

/** The working: the first stage from the two moments, the change, the questions. */
export function snapshotsWorking(s) {
  if (!s?.ok) return [];
  const out = [{ title: 'The motion, from what the paper gives', rows: s.rows, note: 'Each vector equation is two SUVAT equations side by side: the i parts and the j parts.' }];
  if (s.switchRows.length) out.push({ title: `Where it is, and how fast, when the acceleration changes at ${M`t = ${d(s.T)} [s]`}`, rows: s.switchRows,
    note: 'The second stage starts from here, with its new acceleration.' });
  if (s.askRows.length) out.push({ title: 'What the paper asks', rows: s.askRows, note: `A direction of motion is the direction of the velocity: one relation between its parts.${s.a2 ? ` After the change, ${M`vec(u)`} is the velocity at the change and ${M`t`} is counted from it.` : ''}` });
  return out;
}
