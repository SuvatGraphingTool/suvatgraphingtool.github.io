// letters.js — two particles projected straight up from the same point O,
// every answer in terms of U and g: P with speed U, and Q, a moment later,
// with speed kU. The paper asks for P's greatest height, when they collide,
// and where — all in letters.
//
// NO NEW PHYSICS. Each particle is s = ut + ½at² with a = −g, up positive,
// from O (a fixed point, not the ground: they may pass below it). Measured in
// U⁄g for time and U²⁄g for length, every quantity is a pure number times
// those, so the engine runs the motion with U = g = 1 and writes each answer
// as that number times its letters. Given numbers for U and g, it also gives
// each answer in metres and seconds.
//
// CONVENTION. Up positive, from O; t from when P is projected; τ from when Q is.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap, rat } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const EPS = 1e-9;

/** c times a letter group as notation source: c·U²⁄g → (3U^2)/(8g), −U/g, 0. */
export function inLetters(c, top, bottom) {
  c = snap(c);
  if (Math.abs(c) < EPS) return '0';
  const r = rat(Math.abs(c), 2000), sg = c < 0 ? '-' : '';
  if (!r) return `${sg}${d(Math.abs(c))}${top}/${bottom}`;
  const p = r.p === 1 ? '' : r.p;
  return `${sg}(${p}${top})/(${r.q === 1 ? '' : r.q}${bottom})`;
}
const len = (c) => inLetters(c, 'U^2', 'g');
const tim = (c) => inLetters(c, 'U', 'g');
const spd = (c) => { c = snap(c); const r = rat(Math.abs(c), 2000); if (Math.abs(c) < EPS) return '0'; const sg = c < 0 ? '-' : ''; if (!r) return `${sg}${d(Math.abs(c))}U`; return r.q === 1 ? `${sg}${r.p === 1 ? '' : r.p}U` : `${sg}(${r.p}/${r.q})U`; };

/**
 * @param k { k, when, c, U, g }
 *   k     Q's speed as a multiple of U (½ for half P's speed)
 *   when  'top' — Q is projected when P is at its greatest height — or 'after'
 *   c     with 'after': Q is projected c·U⁄g after P
 *   U, g  optional numbers, to give each answer in metres and seconds too
 */
export function solveLetters(k0 = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const kq = k0.k;
  if (!have(kq)) return fail('Still needed: Q’s speed as a multiple of U — ½ for half P’s speed.');
  if (!(kq >= 0)) return fail('Q is projected upwards: give its speed as 0 or a positive multiple of U.');
  const top = k0.when !== 'after';
  if (top && have(k0.c)) return fail('Q goes when P is at the top, so there is no time to give: clear it, or choose a given time after P.');
  const c = top ? 1 : k0.c;
  if (!have(c) || !(c > 0)) return fail('Still needed: how long after P that Q is projected, as a multiple of U⁄g — a positive number.');
  const num2 = have(k0.U) && have(k0.g);
  if ((have(k0.U) || have(k0.g)) && !num2) return fail('To give the answers in numbers too, give both U and g — or neither, for letters alone.');
  if (num2 && !(k0.U > 0 && k0.g > 0)) return fail('U and g are positive numbers.');

  // ── in units of U/g and U²/g: P at Q's launch
  const y0 = c - c * c / 2, v0 = 1 - c;                 // P's height and velocity when Q is projected
  const rows = [];
  if (top) rows.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = U^2 - 2gH`, r: M`H = ${len(0.5)}` });
  else {
    rows.push({ f: M`s = ut + ½at^2`, s: M`s_P = U(${tim(c)}) - ½g(${tim(c)})^2`, r: M`s_P = ${len(y0)}` });
    rows.push({ f: M`v = u + at`, s: M`v_P = U - g(${tim(c)})`, r: M`v_P = ${spd(v0)}` });
  }
  // after Q is projected, τ later: y_P = y0 + v0 τ − ½gτ², y_Q = kUτ − ½gτ²; the ½gτ² cancel
  const rel = kq - v0;                                    // closing speed, in U
  const meetRows = [
    { f: M`s = ut + ½at^2`, s: M`s_P = ${top ? 'H' : len(y0)} ${v0 ? `+ ${spd(v0).startsWith('-') ? `(${spd(v0)})` : spd(v0)} tau` : ''} - ½g tau^2`, r: M`s_Q = ${spd(kq)} tau - ½g tau^2` },
  ];
  let tau = null, yc = null;
  if (Math.abs(y0) < EPS) return fail('P is back at O just as Q is projected: they are together at that instant, not a collision afterwards.');
  if (Math.abs(rel) < EPS) {
    meetRows.push({ f: M`s_P - s_Q`, s: M`${top ? 'H' : len(y0)}`, r: M`"the gap never changes"` });
  } else {
    tau = snap(y0 / rel);
    meetRows.push({ f: M`s_P = s_Q`, s: M`${top ? 'H' : len(y0)} = ${spd(rel)} tau`, r: tau > EPS ? M`tau = ${tim(tau)}` : M`tau = ${tim(tau)} "(before Q is projected)"` });
    if (tau > EPS) {
      yc = snap(kq * tau - tau * tau / 2);
      meetRows.push({ f: M`s_Q = ${spd(kq)} tau - ½g tau^2`, s: M`tau = ${tim(tau)}`, r: M`s_Q = ${len(yc)}` });
    }
  }
  const met = tau != null && tau > EPS;
  const where = !met ? null : Math.abs(yc) < EPS ? 'at O' : yc > 0 ? `${M`${len(yc)}`} above O` : `${M`${len(-yc)}`} below O`;
  const notes = [];
  if (top) notes.push(`P’s greatest height is ${M`H = ${len(0.5)}`}.`);
  notes.push(met ? `They collide ${M`${tim(tau)}`} after Q is projected, ${where}.` : 'They never collide: once both are moving they never meet.');
  // ── and in numbers, when U and g are given
  const U = num2 ? k0.U : 1, g = num2 ? k0.g : 1, T = U / g, Lu = U * U / g;
  if (num2) notes.push(`With ${M`U = ${d(U)} [m s^-1]`} and ${M`g = ${d(g)} [m s^-2]`}: ${top ? `${M`H = ${d(snap(0.5 * Lu))} [m]`}; ` : ''}${met ? `they collide ${M`${d(snap(tau * T))} [s]`} after Q is projected, ${Math.abs(yc) < EPS ? 'at O' : `${M`${d(snap(Math.abs(yc) * Lu))} [m]`} ${yc > 0 ? 'above' : 'below'} O`}.` : 'they never collide.'}`);
  const derived = [met ? `${M`tau = ${tim(tau)}`}` : 'never collide'];

  // ── the motion, in the units chosen (U = g = 1 without numbers)
  const t0 = c * T, tMax = met ? t0 + tau * T : Math.max(2 * T, t0 + 2 * T);
  const yP = (t) => U * t - 0.5 * g * t * t, vP = (t) => U - g * t;
  const yQ = (t) => (t < t0 ? 0 : kq * U * (t - t0) - 0.5 * g * (t - t0) ** 2), vQ = (t) => (t < t0 ? 0 : kq * U - g * (t - t0));
  const f = { kind: 'letters', tMax, t0, tc: met ? t0 + tau * T : null, yc: met ? yc * Lu : null, H: 0.5 * Lu, top, num: num2, U, g, yP, vP, yQ, vQ, kq, cLaunch: c };
  return { ok: true, mode: 'letters', kq, c, top, tau, yc, met, where, rows, meetRows, notes, derived, f };
}

/** The working: P where Q is projected, then the two heights, equal. */
export function lettersWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: s.top ? 'P’s greatest height' : 'Where P is, and how fast, when Q is projected', rows: s.rows,
      note: s.top ? 'At the top P stops rising, so its velocity there is zero.' : 'Up positive, from O; a = −g.' },
    { title: 'When they collide, and where', rows: s.meetRows,
      note: 'Both have the same acceleration, so the ½gτ² terms cancel: the gap between them closes at a steady rate.' },
  ];
}
