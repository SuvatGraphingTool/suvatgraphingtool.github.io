// projectile.js — the idealised A-level projectile.
//
// THE MODEL, stated plainly:
//   • no air resistance, no drag, no wind
//   • gravity is uniform and vertical
//   • the projectile is a point mass; it does not spin
//   • the ground is flat
// Horizontal motion therefore has a = 0 (constant velocity) and vertical
// motion has a = −g. The two are completely independent — which is the single
// most important idea in the topic, and the one this playground exists to show.

import { M, num, signed } from '../notation.js';

export const GRAVITY = {
  earth:  { g: 9.81,  label: 'Earth',   sub: '9.81' },
  moon:   { g: 1.62,  label: 'Moon',    sub: '1.62' },
  mars:   { g: 3.72,  label: 'Mars',    sub: '3.72' },
  jupiter:{ g: 24.79, label: 'Jupiter', sub: '24.79' },
  zero:   { g: 0,     label: 'Zero-g',  sub: '0' },
};

const DEG = Math.PI / 180;

/**
 * Build a full description of one projectile's flight.
 * @param {{u:number, theta:number, h:number, g:number}} p
 *   u       launch speed        (m s⁻¹)
 *   theta   angle of elevation  (degrees, may be negative for a downward throw)
 *   h       launch height       (m)
 *   g       gravitational field strength (m s⁻², positive downwards)
 */
export function flight({ u, theta, h, g }) {
  const th = theta * DEG;

  // Resolve the launch velocity into components. This is step one of every
  // projectile question and the reason cos/sin appear at all.
  const horiz = u * Math.cos(th);          // speed across the ground
  const ux = horiz;                        // the flight stays in one vertical plane
  const uy = u * Math.sin(th);             // vertical component

  // Time of flight: solve h + uy·t − ½g·t² = 0 for the positive root.
  let tFlight;
  if (g > 1e-9) {
    tFlight = (uy + Math.sqrt(Math.max(0, uy * uy + 2 * g * h))) / g;
  } else if (uy < -1e-9) {
    tFlight = h / -uy;                     // no gravity, thrown downwards
  } else {
    tFlight = Infinity;                    // no gravity, never comes back
  }

  const bounded = isFinite(tFlight) ? tFlight : Math.max(8, (2 * u) / 9.81);
  const tApex = g > 1e-9 ? uy / g : (uy > 0 ? bounded : 0);
  const apexInFlight = tApex > 0 && tApex < bounded;
  const apexHeight = g > 1e-9 ? h + (uy * uy) / (2 * g) : h + uy * bounded;
  const range = horiz * bounded;

  const pos = (t) => ({
    x: ux * t,
    y: h + uy * t - 0.5 * g * t * t,
  });
  const vel = (t) => ({ x: ux, y: uy - g * t });
  const speed = (t) => { const v = vel(t); return Math.hypot(v.x, v.y); };

  const vLanding = speed(bounded);
  const angleAt = (t) => {
    const v = vel(t);
    return (Math.atan2(v.y, Math.abs(v.x)) / DEG);
  };

  return {
    params: { u, theta, h, g },
    ux, uy, horiz,
    tFlight, tMax: bounded, infinite: !isFinite(tFlight),
    tApex: apexInFlight ? tApex : (uy > 0 ? tApex : 0),
    apexHeight: Math.max(h, apexHeight),
    apexInFlight,
    range,
    vLanding,
    landingAngle: angleAt(bounded),
    pos, vel, speed, angleAt,
    /** Sample the path as an array of points — used by every renderer. */
    path(n = 240, tEnd = bounded) {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * tEnd;
        out.push({ t, ...pos(t) });
      }
      return out;
    },
    /** Equally-spaced-in-TIME markers. Their spacing is the whole lesson:
     *  horizontal gaps stay constant, vertical gaps shrink then grow. */
    ticks(count = 10, tEnd = bounded) {
      const out = [];
      for (let i = 0; i <= count; i++) {
        const t = (i / count) * tEnd;
        out.push({ t, ...pos(t), v: vel(t) });
      }
      return out;
    },
  };
}

/** The working, written out — shown beside the playground so the numbers are never magic. */
export function derivation(f) {
  const { u, theta, h, g } = f.params;
  const d = (x, p = 2) => num(x, p);
  const sg = (x, p = 2) => signed(x, p);
  const steps = [
    {
      title: 'Resolve the launch velocity',
      lines: [
        { tex: M`u_x = u cos theta`, sub: M`u_x = ${d(u)} * cos ${sg(theta, 1)}° = ${d(f.horiz)} [m s^-1]` },
        { tex: M`u_y = u sin theta`, sub: M`u_y = ${d(u)} * sin ${sg(theta, 1)}° = ${d(f.uy)} [m s^-1]` },
      ],
      note: 'Horizontal and vertical are now two separate 1D problems.',
    },
    {
      title: `Time of flight — vertical, ${M`s = ut + ½at^2`}`,
      lines: [
        { tex: M`0 = h + u_y t - ½g t^2`, sub: M`0 = ${d(h)} + ${sg(f.uy)}t - ½ * ${d(g)}t^2` },
        { tex: M`t = (u_y + sqrt(u_y^2 + 2gh))/g`, sub: M`t = ${d(f.tFlight, 3)} [s]` },
      ],
      note: h > 0 ? 'Launched from a height, so the flight is not symmetric.' : 'Level ground, so the path is symmetric.',
    },
    {
      title: `Greatest height — vertical, ${M`v^2 = u^2 + 2as`}`,
      lines: [
        { tex: `At the top, ${M`v_y = 0`}`, sub: M`0 = ${sg(f.uy)}^2 - 2 * ${d(g)} * (H - ${d(h)})` },
        { tex: M`H = h + u_y^2/(2g)`, sub: `${M`H = ${d(f.apexHeight, 2)} [m]`} at ${M`t = ${d(f.tApex, 3)} [s]`}` },
      ],
      note: 'Uses only vertical quantities — the horizontal motion is irrelevant here.',
    },
    {
      title: `Range — horizontal, ${M`a = 0`} so ${M`s = u_x t`}`,
      lines: [
        { tex: M`R = u_x * t_{flight}`, sub: M`R = ${d(f.horiz)} * ${d(f.tFlight, 3)} = ${d(f.range, 2)} [m]` },
      ],
      note: 'No acceleration horizontally, so distance is just speed × time.',
    },
  ];
  return steps;
}

/* ── a line across the flight ───────────────────────────────────────────
   "How long is it above 6 m?" is one of the questions this model answers
   exactly, and it is the one the Time above a line scenario is for. Both
   directions live here rather than in the renderer, because both are
   arithmetic on the model and the renderer's job is to draw what came back.

   Two cases, and which one applies is decided by where the line sits:

     the line is ABOVE the launch — it crosses twice, and the interval is the
       gap between the two roots of  h + u_y t − ½g t² = L
     the line is BELOW the launch — it starts above the line already, so the
       interval runs from t = 0 to the single downward crossing

   They agree where they meet, at L = h, so the result is continuous and
   strictly decreasing in L. That is what makes the inverse single-valued. */

/** The interval during which the flight is at or above the height `L`. */
export function timeAbove(f, L) {
  const { h, g } = f.params;
  const uy = f.uy, tEnd = f.tMax;
  const none = { above: 0, t1: 0, t2: 0, crosses: 0 };
  if (!isFinite(L)) return none;

  if (g <= 1e-9) {
    // No gravity: the height is linear in t, so there is at most one crossing.
    if (Math.abs(uy) < 1e-9) return (h >= L) ? { above: tEnd, t1: 0, t2: tEnd, crosses: 0 } : none;
    const tc = (L - h) / uy;
    if (uy > 0) return tc >= tEnd ? none
      : { above: tEnd - Math.max(0, tc), t1: Math.max(0, tc), t2: tEnd, crosses: tc > 0 ? 1 : 0 };
    return tc <= 0 ? none
      : { above: Math.min(tc, tEnd), t1: 0, t2: Math.min(tc, tEnd), crosses: tc < tEnd ? 1 : 0 };
  }

  if (L >= h) {
    const disc = uy * uy - 2 * g * (L - h);
    if (disc <= 0) return none;                        // never gets that high
    const r = Math.sqrt(disc);
    const t1 = Math.max(0, (uy - r) / g), t2 = Math.min(tEnd, (uy + r) / g);
    return t2 <= t1 ? none : { above: t2 - t1, t1, t2, crosses: 2 };
  }
  // Below the launch point: it is already above the line when the clock starts.
  const t2 = Math.min(tEnd, (uy + Math.sqrt(uy * uy + 2 * g * (h - L))) / g);
  return { above: t2, t1: 0, t2, crosses: 1 };
}

/**
 * The inverse: which line height gives exactly `want` seconds above it.
 *
 * Above the launch point the flight is symmetric about its apex, so the
 * interval is the free-fall time across 2(H − L) and the line falls out as
 *   L = H − g(Δt)²⁄8
 * Below the launch point there is only one crossing, and the line that gives
 * Δt seconds is simply the height the object is at after Δt seconds.
 *
 * Returns `{ ok: false, reason }` rather than a number when the flight cannot
 * do it. A refusal is a result, not an error.
 */
export function heightForTime(f, want) {
  const { h, g } = f.params;
  const uy = f.uy, tEnd = f.tMax;
  const d = (x, p = 2) => num(x, p);

  if (!isFinite(want) || want <= 0) {
    return { ok: false, reason: 'A time above the line has to be a positive number of seconds.' };
  }
  if (g <= 1e-9) {
    return { ok: false, reason: 'With no gravity the flight never comes back down, so there is no interval above a line to match.' };
  }
  if (want > tEnd + 1e-9) {
    return { ok: false,
      reason: `The whole flight lasts ${d(tEnd)} s, so it cannot spend ${d(want)} s above anything. The longest it can manage is ${d(tEnd)} s, above the ground itself.` };
  }

  const atLaunch = uy > 0 ? (2 * uy) / g : 0;          // the interval when L = h
  const L = want <= atLaunch
    ? f.apexHeight - (g * want * want) / 8             // two crossings, symmetric
    : h + uy * want - 0.5 * g * want * want;           // one crossing, from t = 0

  if (L < -1e-9) {
    return { ok: false,
      reason: `Nothing in this flight stays up for ${d(want)} s. Even a line on the ground gives only ${d(tEnd)} s.` };
  }
  return { ok: true, height: Math.max(0, L), ...timeAbove(f, Math.max(0, L)) };
}

/** The complementary-angle result: θ and (90° − θ) give the same range on level ground. */
export function complement(theta) {
  return 90 - theta;
}

/** Launch angle that maximises range from height h. Reduces to 45° when h = 0. */
export function optimumAngle(u, h, g) {
  if (g <= 1e-9 || u <= 0) return 45;
  if (h <= 0) return 45;
  const r = Math.asin(1 / Math.sqrt(2 + (2 * g * h) / (u * u)));
  return (r * 180) / Math.PI;
}
