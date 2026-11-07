// numeric.js — the small number-handling every engine needs, in one place.
//
// Each of these was written twice before it was written here (js/core/pair.js
// and js/core/journey.js each had a `snap`, and the two fraction finders had
// different rules, so the same fraction was written differently on two
// screens). One copy, one rule.

/**
 * Floating-point dust off a number, and nothing else.
 *
 * 8.749999999999993 is 8.75 — the arithmetic meant 8.75 and missed by a
 * trillionth — but 2⁄3 is 0.6666…, and rounding it to nine places is not
 * removing dust, it is changing the number: a train braking at 0.666666667
 * instead of 2⁄3 is not quite at rest when it reaches B. So a number is moved
 * only onto a value with at most nine significant figures that it is already
 * within a part in 10¹² of.
 */
export function snap(x) {
  if (!isFinite(x) || x === 0) return x;
  for (let p = 1; p <= 9; p++) {
    const r = Number(x.toPrecision(p));
    if (Math.abs(x - r) <= 1e-12 * Math.max(1, Math.abs(x))) return r;
  }
  return x;
}

/**
 * c as p⁄q in lowest terms when it is exactly one with a small q — 3.5 is
 * 7⁄2, 1⁄0.3 is 10⁄3, 2.1428571… is 15⁄7 — or null. A whole number is
 * { p, q: 1 }.
 */
export function rat(c, maxQ = 30) {
  if (!isFinite(c)) return null;
  for (let q = 1; q <= maxQ; q++) {
    const p = c * q;
    if (Math.abs(p - Math.round(p)) < 1e-9 * Math.max(1, Math.abs(p))) return { p: Math.round(p), q };
  }
  return null;
}
