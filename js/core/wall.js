// wall.js — a stone sliding on ice against a constant resistance, along A, B
// to C, where it hits the boards and rebounds, then slides back until the
// same resistance brings it to rest. (Edexcel M1 Jan 2005 Q5.)
//
// SUVAT, with the one-step links the paper leans on (design/library/
// build-rules.md): the deceleration from v² = u² − 2as over AB; the speed at C
// from it over AC; the mass from F = ma with the stated resistance; the
// rebound speed from the wall's impulse, I = m(v − u) (js/core/impulse.js,
// shared with the bounce); then back to rest with v = u − at.
//
// CONVENTION. Forwards (towards the wall) positive, from A; the deceleration
// a is its size; the impulse I is its size, acting back towards A.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { impulseLink } from './impulse.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d(x)})` : d(x));

/**
 * @param k { uA, uB, AB, AC, R, m, I, w }
 *   uA, uB   its speeds at A and at B (m s⁻¹);  AB, AC  the distances (m)
 *   R        the resistance (N);  m  its mass (kg) — give one, the other is found
 *   I        the size of the wall's impulse (N s) — or w, the speed it rebounds with
 */
export function solveWall(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  for (const [q, what] of [['uA', 'its speed at A'], ['uB', 'its speed at B'], ['AB', 'the distance AB'], ['AC', 'the distance AC']]) if (!have(k[q])) return fail(`Still needed: ${what}.`);
  const { uA, uB, AB, AC } = k;
  if (!(uA > uB && uB > 0)) return fail('Slowing down against the resistance, its speed at A is more than at B, and at B more than 0.');
  if (!(AB > 0 && AC > AB)) return fail('B lies between A and C: AB is positive and AC longer than it.');
  if (have(k.R) === have(k.m)) return fail('Give the resistance or the mass — one of the two: F = ma finds the other.');
  if (have(k.I) === have(k.w)) return fail('Give the size of the wall’s impulse, or the speed it rebounds with — one of the two.');
  if ((have(k.R) && !(k.R > 0)) || (have(k.m) && !(k.m > 0))) return fail('The resistance and the mass are positive.');
  if ((have(k.I) && !(k.I > 0)) || (have(k.w) && !(k.w > 0))) return fail('The impulse and the rebound speed are positive sizes.');

  const rows = [];
  // ── the deceleration over AB, and the speed it reaches C with
  const a = snap((uA * uA - uB * uB) / (2 * AB));
  rows.push({ f: M`v^2 = u^2 - 2as`, s: M`${d(uB)}^2 = ${d(uA)}^2 - 2a * ${d(AB)}`, r: M`a = ${d(a)} [m s^-2]` });
  const vC2 = uA * uA - 2 * a * AC;
  if (!(vC2 > 1e-12)) {
    const stop = snap((uA * uA) / (2 * a));
    return fail(`At ${M`${d(a)} [m s^-2]`} it comes to rest ${M`${d(stop)} [m]`} past A, before it reaches the wall at C.`);
  }
  const vC = snap(Math.sqrt(vC2));
  rows.push({ f: M`v^2 = u^2 - 2as`, s: M`v^2 = ${d(uA)}^2 - 2 * ${d(a)} * ${d(AC)}`, r: M`v = sqrt(${d(snap(vC2))}) = ${d(vC)} [m s^-1]` });

  // ── F = ma: the mass from the resistance, or the resistance from the mass
  let m, R;
  if (have(k.R)) { R = k.R; m = snap(R / a); rows.push({ f: M`F = ma`, s: M`${d(R)} = m * ${d(a)}`, r: M`m = ${d(m)} [kg]` }); }
  else { m = k.m; R = snap(m * a); rows.push({ f: M`F = ma`, s: M`F = ${d(m)} * ${d(a)}`, r: M`F = ${d(R)} [N]` }); }

  // ── the wall: I = m(v − u), towards the wall positive, the impulse back
  const L = impulseLink({ m, I: have(k.I) ? -k.I : undefined, u: vC, v: have(k.w) ? -k.w : undefined });
  if (!L.ok) return fail(L.reason);
  const w = snap(-L.v), I = snap(-L.I);
  if (Math.abs(w) <= 1e-9) return fail(`An impulse of ${M`${d(I)} [N s]`} stops it dead against the wall: it does not come back.`);
  if (!(w > 1e-9)) return fail(`An impulse of ${M`${d(I)} [N s]`} is not enough to send it back: it would only slow it to ${M`${d(Math.abs(w))} [m s^-1]`} against the wall.`);
  rows.push(L.row.r ? L.row : { f: L.row.f, s: L.row.s, r: M`v = ${d(-w)} [m s^-1]` });

  // ── back, against the same resistance, to rest
  const tC = snap((uA - vC) / a), tBack = snap(w / a), back = snap((w * w) / (2 * a)), stopAt = snap(AC - back);
  // still towards the wall positive: it moves at −w, and the resistance now acts towards the wall, +a
  rows.push({ f: M`v = u + at`, s: M`0 = ${sb(-w)} + ${d(a)}t`, r: M`t = ${d(tBack)} [s]` });
  rows.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${sb(-w)}^2 + 2 * ${d(a)}s`, r: M`s = ${d(-back)} [m]` });
  const tMax = snap(tC + tBack);

  const notes = [
    `Its deceleration is ${M`${d(a)} [m s^-2]`}, from its speeds at A and B; it reaches the wall at ${M`${d(vC)} [m s^-1]`}${have(k.R) ? `, and with a resistance of ${M`${d(R)} [N]`} its mass is ${M`${d(m)} [kg]`}` : `; on ${M`${d(m)} [kg]`} that is a resistance of ${M`${d(R)} [N]`}`}.`,
    `The wall's impulse of ${M`${d(I)} [N s]`} turns it round: it leaves the wall at ${M`${d(w)} [m s^-1]`}, and comes to rest ${M`${d(tBack)} [s]`} later, ${M`${d(back)} [m]`} from the wall — ${stopAt >= 0 ? `${M`${d(stopAt)} [m]`} past A, ${Math.abs(stopAt - AB) < 1e-9 ? 'at B' : stopAt > AB ? 'between B and C' : stopAt > 1e-9 ? 'between A and B' : 'at A'}` : `${M`${d(-stopAt)} [m]`} behind A`}.`,
  ];
  const derived = [`${M`a = ${d(a)} [m s^-2]`}`, `${M`v_C = ${d(vC)} [m s^-1]`}`, have(k.R) ? `${M`m = ${d(m)} [kg]`}` : `${M`F = ${d(R)} [N]`}`, `rebounds at ${M`${d(w)} [m s^-1]`}`, `at rest after ${M`${d(tBack)} [s]`}`];

  // the motion: to the wall, then back
  const pos = (t) => {
    const c = Math.min(Math.max(t, 0), tMax);
    if (c <= tC) return uA * c - 0.5 * a * c * c;
    const s = c - tC; return AC - (w * s - 0.5 * a * s * s);
  };
  const vel = (t) => { const c = Math.min(Math.max(t, 0), tMax); return c <= tC ? uA - a * c : -(w - a * (c - tC)); };
  const acc = (t) => (t <= tC ? -a : t < tMax - 1e-9 ? a : 0);   // at the wall itself, still the way in
  const tB = snap((uA - uB) / a);
  const f = { kind: 'wall', uA, uB, AB, AC, a, vC, w, m, R, I, tB, tC, tBack, back, stopAt, tMax, tFlight: tMax, pos, vel, acc,
    params: { u: uA, theta: 0, h: 0, g: 9.8 } };
  return { ok: true, mode: 'wall', a, vC, m, R, I, w, tC, tBack, back, stopAt, rows, notes, derived, f };
}

/** The working: SUVAT to the wall, F = ma, the impulse, SUVAT back. */
export function wallWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'To the wall: the deceleration, the speed at C, the mass', rows: s.rows.slice(0, 3),
      note: `The resistance is the only force along the line, so it gives the deceleration: ${M`F = ma`}.` },
    { title: 'The wall’s impulse, and back to rest', rows: s.rows.slice(3),
      note: `Towards the wall is positive throughout: it arrives at ${M`+${d(s.vC)}`} and the impulse acts back towards A, so ${M`I`} is negative and it leaves with a negative velocity. On the way back the same resistance acts against its new direction, so its acceleration is now positive, and its displacement back from the wall negative.` },
  ];
}
