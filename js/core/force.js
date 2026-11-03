// force.js — a particle on a smooth horizontal plane, moved by one constant
// force F, everything in i and j. Newton's second law in vector form,
// F = ma, gives the acceleration — or the acceleration gives the force —
// and the motion is then SUVAT in i and j (js/core/plane.js), each component
// on its own.
//
// The exam family (Edexcel M1 Jan 2011 Q4): a 2 kg particle has velocity
// (2i − 5j) m s⁻¹ at t = 0 and (7i + 10j) m s⁻¹ at t = 5 s. Its speed at the
// start is √29 = 5.39 m s⁻¹; a = ((7i + 10j) − (2i − 5j)) ÷ 5 = i + 3j, so
// F = 2(i + 3j) = 2i + 6j N; it moves parallel to i when −5 + 3t = 0,
// t = 5⁄3 s. And (Edexcel M1 Jun 2008 Q3) a 0.4 kg particle accelerating at
// (6i + 8j) m s⁻²: at 53° to i, F = 2.4i + 3.2j, |F| = 4 N, and from 9i − 10j
// its velocity at t = 5 is 39i + 30j.
//
// What the paper gives fixes the acceleration in one of three ways — two
// velocities and the time between them, the force (with the mass), or the
// acceleration itself — and asking for more than one of them is asking the
// same thing twice, so the engine says so rather than pick one.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solvePlane, planeWorking, planeMotion, vsrc } from './plane.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const sgn = (x) => (x < 0 && d(x) !== '0' ? `(${d(x)})` : d(x));
const two = (q) => q && (have(q.x) || have(q.y));
const vec = (q) => ({ x: have(q?.x) ? q.x : 0, y: have(q?.y) ? q.y : 0 });
const V = (x, y) => ({ x: snap(x), y: snap(y) });
const br = (v) => { const s = vsrc(v); return / /.test(s) ? `(${s})` : s; };
const mag = (v) => snap(Math.hypot(v.x, v.y));

/** The angle a vector makes with i, 0° to 180°. */
const withI = (v) => snap((Math.acos(Math.max(-1, Math.min(1, v.x / Math.hypot(v.x, v.y)))) * 180) / Math.PI);

/**
 * @param k { m: the mass (kg); u: {x,y} the velocity at t = 0;
 *            vT: {x,y} the velocity at time T, with T — or F: {x,y} the force (N) — or a: {x,y};
 *            r0: {x,y}; at: as js/core/plane.js — { t, moving, due, par: {x,y}, x, y, speed } }
 */
export function solveForce(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const m = have(k.m) ? k.m : null;
  if (m != null && !(m > 0)) return fail('Give the mass as a positive number.');
  const byV = two(k.vT) || have(k.T), byF = two(k.F), byA = two(k.a);
  if (have(k.T) && !two(k.vT)) return fail('A time on its own: give the velocity it has at that time too, or clear it.');
  if (two(k.vT) && !have(k.T)) return fail('A later velocity needs the time it has it.');
  if (have(k.T) && !(k.T > 0)) return fail('The later time is after the start: give it as more than 0.');
  if (byF && byA) return fail('Give the force or the acceleration — one of them: with the mass, F = ma gives the other.');
  if (byV && two(k.u) && (byF || byA)) return fail('Two velocities and the time between them already fix the acceleration: give the force (or the acceleration) or the later velocity — not both.');
  if (!byF && !byA && !(byV && two(k.u))) {
    return fail(byV ? 'Still needed: the velocity at the start too — two velocities and the time between them give the acceleration.'
      : 'Still needed: what fixes the acceleration — the force (with the mass), the acceleration, or the velocity at a later time.');
  }
  if (byF && m == null) return fail('With the force in newtons, give the mass too: F = ma needs it.');
  if (!two(k.u) && !byV) return fail('Still needed: the velocity at the start — or a velocity and the time it has it.');

  const rows = [];
  let a, u = two(k.u) ? vec(k.u) : null, how;
  if (byV && u) {
    const vT = vec(k.vT), dv = V(vT.x - u.x, vT.y - u.y);
    a = V(dv.x / k.T, dv.y / k.T); how = 'velocities';
    rows.push({ f: M`vec a = (vec v - vec u)/t`, s: M`(${br(vT)} - ${br(u)})/${d(k.T)} = ${br(dv)}/${d(k.T)}`, r: M`vec a = ${vsrc(a)} [m s^-2]` });
  } else if (byF) {
    const F = vec(k.F);
    a = V(F.x / m, F.y / m); how = 'force';
    rows.push({ f: M`vec F = m vec a`, s: M`${br(F)} = ${d(m)}vec a`, r: M`vec a = ${vsrc(a)} [m s^-2]` });
  } else { a = vec(k.a); how = 'given'; }
  const F = m != null ? V(m * a.x, m * a.y) : null;
  if (F && how !== 'force') rows.push({ f: M`vec F = m vec a`, s: M`${d(m)}${br(a)}`, r: M`vec F = ${vsrc(F)} [N]` });
  const big = F || a, isF = !!F, still = mag(a) < EPS;
  let angle = null;
  if (!still) {
    angle = withI(big);
    rows.push(isF ? { f: M`abs(vec F) = sqrt(F_x^2 + F_y^2)`, s: M`sqrt(${sgn(F.x)}^2 + ${sgn(F.y)}^2)`, r: M`${d(mag(F))} [N]` }
      : { f: M`abs(vec a) = sqrt(a_x^2 + a_y^2)`, s: M`sqrt(${sgn(a.x)}^2 + ${sgn(a.y)}^2)`, r: M`${d(mag(a))} [m s^-2]` });
    // the angle it makes with i, from its components (the same for F and a: F = ma, m > 0)
    rows.push(isF ? { f: M`cos theta = F_x/abs(vec F)`, s: M`${d(F.x)}/${d(mag(F))}`, r: M`theta = ${d(angle, 1)}° "to" vec i` }
      : { f: M`cos theta = a_x/abs(vec a)`, s: M`${d(a.x)}/${d(mag(a))}`, r: M`theta = ${d(angle, 1)}° "to" vec i` });
  }

  // the motion: SUVAT in i and j, from the plane's own engine
  const run = solvePlane({ r0: k.r0, ...(u ? { u } : { vT: k.vT, T: k.T }), a, at: k.at });
  if (!run.ok) return fail(still ? 'With no force and no velocity it never moves.' : run.reason);
  u = run.u;
  const speed0 = mag(u);
  const start = { f: M`abs(vec u) = sqrt(u_x^2 + u_y^2)`, s: M`sqrt(${sgn(u.x)}^2 + ${sgn(u.y)}^2)`, r: M`${d(speed0)} [m s^-1]` };

  // the later velocity is a moment the paper names: the run goes on a little past it
  const f = byV && run.f.tMax < k.T * 1.15 ? Object.assign(planeMotion({ r0: run.r0, u, a }, snap(k.T * 1.15)), { answers: run.f.answers }) : run.f;
  f.kind = 'force';
  Object.assign(f, { m, F, force: F || null, angle, vT: byV ? vec(k.vT) : null, T: byV ? k.T : null });

  const notes = [];
  if (still) notes.push('With no resultant force there is no acceleration: it keeps the velocity it started with.');
  else if (F) notes.push(`The force is ${M`${br(F)} [N]`}, of size ${M`${d(mag(F))} [N]`} at ${M`${d(angle, 1)}°`} to ${M`vec i`}; the acceleration ${M`${br(a)} [m s^-2]`} is in the same direction (${M`vec F = m vec a`}, with ${M`m > 0`}).`);
  else notes.push(`The acceleration is ${M`${br(a)} [m s^-2]`}, at ${M`${d(angle, 1)}°`} to ${M`vec i`}${how === 'velocities' ? ' — the change in velocity over the time it took' : ''}. Give the mass and the force follows: ${M`vec F = m vec a`}.`);
  notes.push(`At the start its speed is ${M`${d(speed0)} [m s^-1]`}.`);
  notes.push(...run.notes.filter((n) => !/^Its initial velocity is/.test(n)));
  const derived = [
    F ? `${M`vec F = ${vsrc(F)} [N]`}, ${M`${d(mag(F))} [N]`}` : `${M`vec a = ${vsrc(a)} [m s^-2]`}`,
    ...run.derived,
  ];
  return {
    ...run, ok: true, mode: 'force', F, a, m, angle, speed0, how, rows, start,
    forceMag: F ? mag(F) : null, accMag: mag(a), f, notes, derived,
    exprs: { F: F ? M`vec F = ${vsrc(F)} [N]` : M`vec a = ${vsrc(a)} [m s^-2]` },
    convention: `${M`vec i`} and ${M`vec j`} are perpendicular unit vectors in the horizontal plane; positions are from the origin O.`,
  };
}

export function forceWorking(solved) {
  if (!solved?.ok) return [];
  return [
    { title: 'The force and the acceleration', rows: solved.rows,
      note: solved.how === 'velocities' ? `The force is constant, so the acceleration is too: the change in velocity over the time it took. Then ${M`vec F = m vec a`}, a vector equation — each component on its own.`
        : `Newton’s second law, ${M`vec F = m vec a`}, as a vector equation: each component on its own. The force and the acceleration point the same way.` },
    { title: 'At the start', rows: [...solved.pre, solved.start], note: 'Its speed is the size of its velocity: Pythagoras on the two components.' },
    // the motion's own sections: the two vector equations, and each answer
    ...planeWorking({ ...solved, pre: [] }),
  ];
}
