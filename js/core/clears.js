// clears.js — a projectile from the ground that just clears a wall and lands a
// given distance beyond it, every length a multiple of one letter a.
//
// The path through O is 2U²y = 2UVx − gx² (U across, V up). Landing at x = Ra
// gives 2UV = gRa; the top of the wall (Pa, Qa) on the path then gives
// U² = ga·P(R − P)⁄(2Q). So tan θ = V⁄U = RQ⁄(P(R − P)): the angle does not
// depend on a at all. One number more — the speed, or a itself — fixes the
// other, and with it the greatest height V²⁄(2g) and the time Ra⁄U.
//
// Once the launch is known the motion is the twelve's own `flight`
// (js/core/projectile.js); this file only finds the launch from the two
// points and writes each step as working, in the letter where the paper does.
//
// CONVENTION. From O on the ground: x across, y up, g > 0; P, Q, R are the
// wall's distance, its height and where it lands, each as a multiple of a.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { flight } from './projectile.js';
import { snap, rat } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const DEG = Math.PI / 180;

/** A coefficient as notation source: a fraction when it is one, bracketed for a product. */
function co(c, bare = false) {
  const r = rat(snap(c), 24);
  if (!r) return d(c);
  return r.q === 1 ? `${r.p}` : bare ? `${r.p}/${r.q}` : `(${r.p}/${r.q})`;
}
/** c times the letter a: "a", "4a", "(1/2)a". */
export const ka = (c) => (Math.abs(c - 1) < 1e-12 ? 'a' : `${co(c)}a`);
/** The same as a label on one line: "a/2", "3a/2", "4a". */
export function kaLine(c) {
  const r = rat(snap(c), 24);
  if (!r || r.q === 1) return ka(c);
  return `${r.p === 1 ? '' : r.p}a/${r.q}`;
}

/**
 * @param k { P, Q, beyond, u, a, g }
 *   P       how far the wall is from O, as a multiple of a
 *   Q       the wall's height, as a multiple of a
 *   beyond  how far beyond the wall it lands, as a multiple of a
 *   u       the speed of projection — or, in its place,
 *   a       the length a in metres
 */
export function solveClears(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  if (!have(k.g)) return fail('Choose the value of g the paper uses.');
  for (const [key, what] of [['P', 'How far the wall is'], ['Q', 'The wall’s height'], ['beyond', 'How far beyond the wall it lands']]) {
    if (!have(k[key])) return fail(`Still needed: ${what.toLowerCase()}, as a multiple of a.`);
    if (!(k[key] > 0)) return fail(`${what} is a positive multiple of a.`);
  }
  if (have(k.u) && have(k.a)) return fail('Give the speed of projection or the length a, not both: one fixes the other.');
  for (const [key, what] of [['u', 'The speed of projection'], ['a', 'The length a']]) if (have(k[key]) && !(k[key] > 0)) return fail(`${what} is a positive number.`);
  const g = k.g, P = k.P, Q = k.Q, R = P + k.beyond;

  // ── the angle, from the two points alone
  const c = P * (R - P) / (2 * Q);                 // U² = c·g·a
  const tan = R * Q / (P * (R - P));
  const theta = Math.atan(tan) / DEG;
  const angleRows = [
    { f: M`2U^2 y = 2UVx - gx^2`, s: M`y = 0, x = ${ka(R)}`, r: M`2UV = ${ka(R)}g` },
    { f: M`2U^2 y = 2UVx - gx^2`, s: M`2U^2(${ka(Q)}) = ${ka(R)}g(${ka(P)}) - g(${ka(P)})^2`, r: M`U^2 = ${ka(c)}g` },
    { f: M`tan theta = V/U = (2UV)/(2U^2)`, s: M`(${ka(R)}g)/(2 * ${ka(c)}g)`, r: M`tan theta = ${co(tan, true)}, theta = ${d(snap(theta), 3)}°` },
  ];

  // ── the speed or a, whichever the paper does not give
  const cos = Math.cos(theta * DEG);
  const fixRows = [];
  let u = k.u, a = k.a, U;
  if (have(u)) {
    U = u * cos; a = U * U / (c * g);
    fixRows.push({ f: M`U = u cos theta`, s: M`${d(u)} cos ${d(snap(theta), 3)}°`, r: M`U = ${d(snap(U))} [m s^-1]` });
    fixRows.push({ f: M`U^2 = ${ka(c)}g`, s: M`${d(snap(U))}^2 = ${co(c)} * ${d(g)}a`, r: M`a = ${d(snap(a))}` });
  } else if (have(a)) {
    U = Math.sqrt(c * g * a); u = U / cos;
    fixRows.push({ f: M`U^2 = ${ka(c)}g`, s: M`${co(c)} * ${d(g)} * ${d(a)}`, r: M`U = ${d(snap(U))} [m s^-1]` });
    fixRows.push({ f: M`u = U/cos theta`, s: M`${d(snap(U))}/cos ${d(snap(theta), 3)}°`, r: M`u = ${d(snap(u))} [m s^-1]` });
  }
  const notes = [`The angle comes from the two points alone: ${M`tan theta = ${co(tan, true)}`}, whatever ${M`a`} is.`];
  const derived = [`${M`theta = ${d(snap(theta), 3)}°`}`];
  if (!have(u)) return fail(`From the two points alone ${M`tan theta = ${co(tan, true)}`}, so ${M`theta = ${d(snap(theta), 3)}°`} whatever ${M`a`} is. Still needed to draw it: the speed of projection, or the length ${M`a`}.`);

  // ── the greatest height and the time of flight
  const V = U * tan, Hmax = V * V / (2 * g), T = R * a / U;
  const hc = c * tan * tan / 2;                    // Hmax = hc·a
  const heightRows = [
    { f: M`V = U tan theta`, s: M`${d(snap(U))} * ${co(tan)}`, r: M`V = ${d(snap(V))} [m s^-1]` },
    { f: M`H = V^2/(2g)`, s: M`${d(snap(V))}^2/(2 * ${d(g)})`, r: M`H = ${ka(hc)} = ${d(snap(Hmax))} [m]` },
    { f: M`t = x/U`, s: M`(${co(R)} * ${d(snap(a))})/${d(snap(U))}`, r: M`t = ${d(snap(T))} [s]` },
  ];
  notes.push(`With ${M`u = ${d(snap(u))} [m s^-1]`}, ${M`a = ${d(snap(a))}`}: the wall is ${M`${d(snap(P * a))} [m]`} away and ${M`${d(snap(Q * a))} [m]`} high, and it lands ${M`${d(snap(R * a))} [m]`} from O.`);
  notes.push(`Its greatest height is ${M`${ka(hc)}`}, ${M`${d(snap(Hmax))} [m]`} above the ground.`);
  derived.push(have(k.u) ? `${M`a = ${d(snap(a))}`}` : `${M`u = ${d(snap(u))} [m s^-1]`}`, `${M`H = ${d(snap(Hmax))} [m]`}`);

  const f0 = flight({ u, theta, h: 0, g });
  const f = { ...f0, kind: 'clears', a, P, Q, R, wall: { x: P * a, H: Q * a }, Hmax, tWall: P * a / U };
  return { ok: true, mode: 'clears', P, Q, R, theta, tan, c, u, a, U, V, Hmax, T, angleRows, fixRows, heightRows, notes, derived, f };
}

/** The working: the angle in the letter, then the numbers. */
export function clearsWorking(solved) {
  if (!solved?.ok) return [];
  const out = [{ title: 'The angle, from the wall and the landing', rows: solved.angleRows,
    note: `The path through O, with ${M`U`} across and ${M`V`} up: it lands at ${M`x = ${ka(solved.R)}`}, and just clears the top of the wall at ${M`(${ka(solved.P)}, ${ka(solved.Q)})`}.` }];
  if (solved.fixRows.length) out.push({ title: solved.fixRows.some((r) => /a =/.test(r.r.replace(/<[^>]+>/g, ''))) ? 'The length a, from the speed' : 'The speed, from the length a', rows: solved.fixRows,
    note: `The across part of the velocity ties the speed to ${M`a`}.` });
  if (solved.heightRows.length) out.push({ title: 'The greatest height and the time of flight', rows: solved.heightRows,
    note: 'At the top the vertical velocity is zero; across, the speed never changes.' });
  return out;
}
