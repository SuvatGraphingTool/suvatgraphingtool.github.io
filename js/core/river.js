// river.js — a boat crossing a river with parallel banks while the water
// flows along them. Relative to the water the boat has a speed V at an angle
// to the bank; the water carries it downstream at w. Straight across (to the
// point directly opposite): what speed and heading, and how long? Or, given
// its speed and heading: where does it land, and when? (AQA MM1B Jun 2009 Q4.)
//
// NO NEW PHYSICS. Constant velocities: the boat's over the ground is its
// velocity through the water plus the water's (a = 0, s = vt in each
// direction). Across, the time is the width over the across component; along,
// the drift is the along component times that time.
//
// CONVENTION. x along the bank, downstream positive; y across, from A; the
// heading angle α to the bank, measured from the upstream direction.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const DEG = Math.PI / 180;

/**
 * @param k { d, w, T, V, alpha }
 *   d      the river's width (m);  w  the water's speed along the banks (m s⁻¹)
 *   T      the time to cross straight over — or V, the boat's speed through the water
 *   alpha  its heading, to the bank, from upstream (°); blank: whatever takes it straight across
 */
export function solveRiver(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  if (!have(k.d) || !(k.d > 0)) return fail('Still needed: the river’s width, a positive number of metres.');
  if (!have(k.w) || !(k.w >= 0)) return fail('Still needed: how fast the water flows along the banks (0 or more).');
  const d = k.d, w = k.w, rows = [], notes = [];
  let V, alpha, vx, vy, T, straight = !have(k.alpha);
  if (straight) {
    // straight across: the boat's along component cancels the current
    if (have(k.T) && have(k.V)) return fail('Straight across, give the time or the boat’s speed, not both: one fixes the other.');
    if (have(k.T)) {
      if (!(k.T > 0)) return fail('The crossing takes a positive time.');
      T = k.T; vy = snap(d / T); V = snap(Math.hypot(vy, w));
      rows.push({ f: M`v = d/t`, s: M`${d3(d)}/${d3(T)}`, r: M`v = ${d3(vy)} [m s^-1] "across"` });
      rows.push({ f: M`V^2 = v^2 + w^2`, s: M`${d3(vy)}^2 + ${d3(w)}^2`, r: M`V = ${d3(V)} [m s^-1]` });
    } else if (have(k.V)) {
      if (!(k.V > w + 1e-9)) return fail(`Through the water the boat must go faster than the ${M`${d3(w)} [m s^-1]`} current to hold a line straight across.`);
      V = k.V; vy = snap(Math.sqrt(V * V - w * w)); T = snap(d / vy);
      rows.push({ f: M`v^2 = V^2 - w^2`, s: M`${d3(V)}^2 - ${d3(w)}^2`, r: M`v = ${d3(vy)} [m s^-1] "across"` });
      rows.push({ f: M`t = d/v`, s: M`${d3(d)}/${d3(vy)}`, r: M`t = ${d3(T)} [s]` });
    } else return fail('Still needed: the time to cross, or the boat’s speed through the water.');
    alpha = snap(Math.atan2(vy, w) / DEG); vx = 0;
    rows.push({ f: M`tan alpha = v/w`, s: M`${d3(vy)}/${d3(w)}`, r: M`alpha = ${num(alpha, 1)}°` });
    if (w === 0) notes.push('With no current, it simply heads straight across.');
    else notes.push(`To go straight across it heads upstream at ${num(alpha, 1)}° to the bank: the current's ${M`${d3(w)} [m s^-1]`} cancels the boat's own along the bank, leaving ${M`${d3(vy)} [m s^-1]`} straight across.`);
  } else {
    if (!have(k.V) || !(k.V > 0)) return fail('With a heading given, still needed: the boat’s speed through the water.');
    if (have(k.T)) return fail('With a heading and a speed, the time follows: leave it blank.');
    if (!(k.alpha > 0 && k.alpha < 180)) return fail('The heading is between 0° and 180° to the bank, measured from upstream.');
    V = k.V; alpha = k.alpha;
    vy = snap(V * Math.sin(alpha * DEG)); vx = snap(w - V * Math.cos(alpha * DEG)); T = snap(d / vy);
    rows.push({ f: M`v_y = V sin alpha`, s: M`${d3(V)} sin ${d3(alpha)}°`, r: M`v_y = ${d3(vy)} [m s^-1]` });
    rows.push({ f: M`v_x = w - V cos alpha`, s: M`${d3(w)} - ${d3(V)} cos ${d3(alpha)}°`, r: M`v_x = ${d3(vx)} [m s^-1]` });
    rows.push({ f: M`t = d/v_y`, s: M`${d3(d)}/${d3(vy)}`, r: M`t = ${d3(T)} [s]` });
    rows.push({ f: M`x = v_x t`, s: M`${d3(vx)} * ${d3(T)}`, r: M`x = ${d3(snap(vx * T))} [m]` });
    notes.push(Math.abs(vx) < 1e-9 ? 'That heading takes it straight across.' : `It lands ${M`${d3(snap(Math.abs(vx * T)))} [m]`} ${vx > 0 ? 'downstream' : 'upstream'} of the point opposite A.`);
  }
  if (Math.abs(vx) < 1e-9) vx = 0;
  const R = snap(Math.hypot(vx, vy));
  notes.unshift(`Over the ground it moves at ${M`${d3(R)} [m s^-1]`} and crosses in ${M`${d3(T)} [s]`}.`);
  const drift = snap(vx * T);
  const f = { kind: 'river', d, w, V, alpha, vx, vy, R, T, drift, tMax: T,
    pos: (t) => { const c = Math.min(Math.max(t, 0), T); return { x: vx * c, y: vy * c }; },
    vel: () => ({ x: vx, y: vy }), accel: () => 0,
    params: { u: R, theta: 0, h: 0, g: 9.8 } };
  const derived = [`${M`V = ${d3(V)} [m s^-1]`}`, `${M`alpha = ${num(alpha, 1)}°`}`];
  return { ok: true, mode: 'river', V, alpha, R, T, vx, vy, drift, straight, rows, notes, derived, f };
}

/** The working: the velocity triangle, the time, the drift. */
export function riverWorking(s) {
  if (!s?.ok) return [];
  return [{ title: s.straight ? 'Straight across: the velocity triangle' : 'Across, along, and where it lands', rows: s.rows,
    note: `The boat's velocity over the ground is its velocity through the water plus the water's. Each part is constant, so ${M`s = vt`} in each direction.` }];
}
