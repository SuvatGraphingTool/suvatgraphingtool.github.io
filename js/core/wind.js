// wind.js — an aircraft flying through moving air: its velocity relative to
// the air (a speed, on a heading) plus the wind's gives its velocity over the
// ground: how fast, and on what bearing? Or the other way: what heading keeps
// it on a given track? (AQA MM1B Jun 2010 Q5.)
//
// NO NEW PHYSICS. Constant velocities, added as vectors in east (i) and north
// (j): a bearing θ is the direction (sin θ, cos θ). Over the ground, s = vt.
//
// CONVENTION. x east, y north, bearings clockwise from north in degrees; the
// wind is given by the bearing it blows TOWARDS ("moving due east" is 090).
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d3 = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d3(x)})` : d3(x));
const R2D = 180 / Math.PI, D2R = Math.PI / 180;
const bearing = (x, y) => { const b = snap(((Math.atan2(x, y) * R2D) % 360 + 360) % 360); return b >= 360 - 1e-9 ? 0 : b; };
const norm = (b) => ((b % 360) + 360) % 360;
const three = (b) => String(Math.round(norm(b)) % 360).padStart(3, '0');
const tiny = (x) => (Math.abs(x) < 1e-9 ? 0 : x);

/**
 * @param k { V, heading, W, wind, track, T }
 *   V        the aircraft's speed relative to the air (m s⁻¹)
 *   heading  the bearing it points (°) — or, in its place, track: the bearing it must go over the ground
 *   W, wind  the wind's speed (m s⁻¹) and the bearing it blows towards (°)
 *   T        how long to watch (s; blank: 60)
 */
export function solveWind(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  for (const [q, what] of [['V', 'its speed relative to the air'], ['W', 'the wind’s speed'], ['wind', 'the bearing the wind blows towards']]) if (!have(k[q])) return fail(`Still needed: ${what}.`);
  if (!(k.V > 0)) return fail('The aircraft moves through the air: give its air speed as a positive number.');
  if (!(k.W >= 0)) return fail('The wind’s speed is 0 or more.');
  if (have(k.heading) === have(k.track)) return fail('Give the heading it points on, or the track it must follow over the ground: one of the two.');
  const V = k.V, W = k.W, wb = norm(k.wind), wx = W * Math.sin(wb * D2R), wy = W * Math.cos(wb * D2R), rows = [];
  let hb;
  if (have(k.heading)) hb = k.heading;
  else {
    // the heading whose air velocity plus the wind lies along the track:
    // the wind's part across the track must be cancelled by the aircraft's
    const tr = norm(k.track), gam = snap(norm(wb - tr)), across = W * Math.sin(gam * D2R);
    if (Math.abs(across) > V) return fail(`The wind blows ${M`${d3(snap(Math.abs(across)))} [m s^-1]`} across that track, more than the aircraft’s ${M`${d3(V)} [m s^-1]`}: no heading holds it.`);
    const beta = snap(Math.asin(across / V) * R2D), along = V * Math.cos(beta * D2R) + W * Math.cos(gam * D2R);
    if (!(along > 1e-9)) return fail(`Against that wind it cannot make headway along ${three(tr)}°: whatever its heading, it is carried backwards.`);
    hb = snap(norm(tr - beta));
    rows.push({ f: M`V sin beta = W sin gamma`, s: M`${d3(V)} sin beta = ${d3(W)} sin ${d3(gam)}°`, r: M`beta = ${d3(beta)}°` });
    rows.push({ f: M`"heading" = "track" - beta`, s: M`${d3(tr)}° - ${beta < 0 ? `(${d3(beta)})` : d3(beta)}°`, r: M`"heading" ${three(hb)}°` });
  }
  const ax = V * Math.sin(hb * D2R), ay = V * Math.cos(hb * D2R);
  const vx = tiny(snap(ax + wx)), vy = tiny(snap(ay + wy)), R = snap(Math.hypot(vx, vy)), rb = bearing(vx, vy);
  if (!(R > 1e-9)) return fail('With that wind it hangs still over one spot: there is no track to follow.');
  rows.push({ f: M`vec v = V(sin theta vec i + cos theta vec j) + W(sin phi vec i + cos phi vec j)`, s: M`(${sb(tiny(snap(ax)))} + ${sb(tiny(snap(wx)))})vec i + (${sb(tiny(snap(ay)))} + ${sb(tiny(snap(wy)))})vec j`, r: M`vec v = ${d3(vx)}vec i ${vy < 0 ? '-' : '+'} ${d3(Math.abs(vy))}vec j` });
  rows.push({ f: M`abs(vec v) = sqrt(v_x^2 + v_y^2)`, s: M`sqrt(${sb(vx)}^2 + ${sb(vy)}^2)`, r: M`abs(vec v) = ${d3(R)} [m s^-1]` });
  rows.push({ f: M`tan theta = v_x/v_y`, s: M`${sb(vx)}/${sb(vy)}`, r: M`theta = ${three(rb)}°` });
  const T = have(k.T) && k.T > 0 ? k.T : 60;
  const notes = [
    `Pointing on ${three(hb)}° at ${M`${d3(V)} [m s^-1]`} through the air, with the wind blowing towards ${three(wb)}° at ${M`${d3(W)} [m s^-1]`}, it goes over the ground at ${M`${d3(R)} [m s^-1]`} on a bearing of ${three(rb)}°.`,
    `In ${M`${d3(T)} [s]`} it covers ${M`${d3(snap(R * T))} [m]`} over the ground.`,
  ];
  const f = { kind: 'wind', V, W, hb, wb, vx, vy, R, rb, ax: snap(ax), ay: snap(ay), wx: snap(wx), wy: snap(wy), tMax: T,
    pos: (t) => { const c = Math.min(Math.max(t, 0), T); return { x: vx * c, y: vy * c }; },
    vel: () => ({ x: vx, y: vy }), accel: () => 0, params: { u: R, theta: 0, h: 0, g: 9.8 } };
  const derived = [`${M`abs(vec v) = ${d3(R)} [m s^-1]`}`, `bearing ${three(rb)}°`];
  return { ok: true, mode: 'wind', R, bearing: rb, heading: hb, rows, notes, derived, f, given: have(k.heading) ? 'heading' : 'track' };
}

/** The working: the two velocities added in i and j, the speed and the bearing. */
export function windWorking(s) {
  if (!s?.ok) return [];
  return [{ title: s.given === 'heading' ? 'Through the air, plus the wind' : 'The heading that holds the track, then the sum', rows: s.rows,
    note: `A bearing ${M`theta`} is the direction ${M`sin theta vec i + cos theta vec j`}, with ${M`vec i`} east and ${M`vec j`} north. The velocity over the ground is the velocity through the air plus the wind's. The bearing is the angle from north whose tangent is east over north, taken in the quarter where the velocity points.${s.given === 'track' ? ` ${M`gamma`} is the angle from the track round to the wind; ${M`beta`} how far the nose turns into the wind.` : ''}` }];
}
