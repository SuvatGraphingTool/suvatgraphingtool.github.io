// target.js — a projectile that has to pass one point: over a wall, a net or
// a tree, into a wall at a given height, or through a target.
//
// The exam family: a ball just clears a treetop, so which two angles could it
// have been hit at; a golf ball hits a wall 3 m up after 2.4 s, so what was
// its speed; a boy's throw rises to 3 m and comes down on a target, so at what
// angle; a serve passes over the net, by how much. Each is the one projectile
// — x = uₓt, y = h₀ + u_y t − ½gt² — read at one point (d, H), and solved for
// whatever the paper left out: nothing (does it clear?), the angle (a
// quadratic in tan θ, two roots), the speed, or both from a time or from the
// greatest height. A root that cannot be is rejected, and says why.
//
// CONVENTION. x is horizontal from the launch, y is height above the ground,
// up is positive; θ is above the horizontal (negative is below); g > 0.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { quadRoots } from './stages.js';
import { snap, rat } from './numeric.js';
import { poly } from './pair.js';
import { M, num } from '../notation.js';

const EPS = 1e-9;
const DEG = Math.PI / 180;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const sgn = (x) => (d(x).startsWith('−') ? `(${d(x)})` : d(x));
/** An angle to two places, as the papers give one. */
const ang = (x) => num(x, 2, { trim: true });

/** What stands at the point, and how it is said. A solid one stops the ball
    that does not clear it; a point is only passed. */
export const KINDS = {
  wall:  { word: 'wall',  the: 'the wall',  top: 'the top of the wall', solid: true },
  net:   { word: 'net',   the: 'the net',   top: 'the top of the net',  solid: true },
  tree:  { word: 'tree',  the: 'the tree',  top: 'the top of the tree', solid: true },
  fence: { word: 'fence', the: 'the fence', top: 'the top of the fence', solid: true },
  face:  { word: 'wall',  the: 'the wall',  top: 'the point it hits',   solid: true, hits: true },
  point: { word: 'point', the: 'the point', top: 'the point',           solid: false },
};
export const FINDS = { theta: 'the angle', u: 'the speed', time: 'the speed and angle, from the time', apex: 'the speed and angle, from its greatest height' };

/** The roots of a quadratic, with two that differ only by rounding taken as
    the one double root they are: a point at the very top of the path is one
    moment, never two a hundred-millionth of a second apart. */
function roots(a, b, c) {
  const rs = quadRoots(a, b, c).map(snap).sort((p, q) => p - q);
  if (rs.length === 2 && Math.abs(rs[1] - rs[0]) <= 1e-6 * Math.max(1, Math.abs(rs[0]), Math.abs(rs[1]))) return [snap((rs[0] + rs[1]) / 2)];
  return rs;
}

/** The times it is at height H, given the top of its path (tTop, yTop): the
    discriminant is exactly 2g(yTop − H), so it is taken from that difference
    and never from u_y² − 2g(H − h₀), whose rounding can push a point at the
    very top just below zero or split it in two. */
function timesAt(H, tTop, yTop, g) {
  const gap = yTop - H;
  if (Math.abs(gap) <= 1e-7 * Math.max(1, Math.abs(H), Math.abs(yTop))) return [snap(tTop)];
  if (gap < 0) return [];
  const w = Math.sqrt(2 * gap / g);
  return [snap(tTop - w), snap(tTop + w)];
}

/* ── one flight ─────────────────────────────────────────────────────────── */
/**
 * The projectile from (0, h0) with velocity (ux, uy), read at the point P
 * (d, H) when there is one. Everything a question about it asks.
 */
export function flight({ ux, uy, h0, g }, P, kind = 'point') {
  const K = KINDS[kind] || KINDS.point;
  const x = (t) => ux * t, y = (t) => h0 + uy * t - 0.5 * g * t * t;
  const vy = (t) => uy - g * t;
  const tGround = snap((uy + Math.sqrt(uy * uy + 2 * g * h0)) / g);
  const apex = uy > EPS ? { t: snap(uy / g), x: snap(ux * uy / g), y: snap(h0 + uy * uy / (2 * g)) } : null;
  const fl = { ux, uy, h0, g, kind, u: snap(Math.hypot(ux, uy)), theta: snap(Math.atan2(uy, ux) / DEG), x, y, vy, apex, tGround };
  fl.top = apex ? apex.y : h0;
  fl.end = tGround;                    // where the flight stops: the ground, or the thing it hits
  if (P && have(P.d)) {
    const tP = snap(P.d / ux);
    const reached = tP <= tGround + 1e-9;
    const yP = snap(y(tP)), vyP = snap(vy(tP));
    // a clearance within rounding of nothing is nothing: "just clears", never 10⁻¹² m
    const raw = have(P.H) ? yP - P.H : null;
    const clear = raw == null ? null : Math.abs(raw) < 1e-6 * Math.max(1, Math.abs(P.H), Math.abs(yP)) ? 0 : snap(raw);
    fl.at = { t: tP, x: P.d, y: yP, vx: ux, vy: vyP, speed: snap(Math.hypot(ux, vyP)), clear, reached, rising: vyP > EPS };
    // the greatest height on the way to it: the top, if the top comes first
    fl.topBefore = apex && apex.t < tP + 1e-9 ? apex.y : Math.max(h0, yP);
    fl.apexAt = apex ? (Math.abs(apex.t - tP) < 1e-6 ? 'at' : apex.t < tP ? 'before' : 'after') : null;
    // a wall it does not clear, it hits; a wall it is aimed at, it hits
    if (reached && K.solid && (K.hits || (clear != null && clear < 0))) { fl.end = tP; fl.hits = true; }
  }
  if (!fl.hits) {
    fl.R = snap(ux * tGround);
    fl.vLand = { x: ux, y: snap(vy(tGround)) };
    fl.landSpeed = snap(Math.hypot(ux, vy(tGround)));
  }
  // Where a wall of height H would be cleared: between the two places the
  // path is at that height (from the launch, if it starts above it).
  if (P && have(P.H)) {
    // from the top of its path, or (thrown level or down) from the start
    const ts = (apex ? timesAt(P.H, apex.t, apex.y, g) : timesAt(P.H, uy / g, h0 + uy * uy / (2 * g), g))
      .filter((t) => t >= -1e-9 && t <= tGround + 1e-9);
    if (h0 > P.H + 1e-9) fl.span = ts.length ? { from: 0, to: snap(ux * ts[ts.length - 1]), down: ts[ts.length - 1] } : null;
    else if (ts.length === 2 && ts[1] - ts[0] > 1e-9) fl.span = { from: snap(ux * ts[0]), to: snap(ux * ts[1]), up: ts[0], down: ts[1] };
    else fl.span = null;
  }
  return fl;
}

/** The motion, for the transport, the stage and the graphs: the flight shown,
    and the other root of a two-root question drawn faintly beside it. */
export function targetMotion(F, other, P, flag) {
  const tMax = F.end;
  const clampT = (t) => Math.min(Math.max(t, 0), tMax);
  return {
    kind: 'target', F, other, P, flag, tMax, tFlight: tMax, g: F.g,
    params: { u: F.u, theta: F.theta, h: F.h0, g: F.g },
    pos: (t) => ({ x: F.x(clampT(t)), y: F.y(clampT(t)) }),
    vel: (t) => ({ x: F.ux, y: F.vy(clampT(t)) }),
    speed: (t) => snap(Math.hypot(F.ux, F.vy(clampT(t)))),
    accel: () => ({ x: 0, y: -F.g }),
    bounces: 0, segments: [], horiz: null,
    kineticEnergy: () => 0, momentum: () => 0,
    path(n = 160, tEnd = tMax, fl = F) {
      const out = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; out.push({ t, x: fl.x(t), y: fl.y(t) }); }
      return out;
    },
  };
}

/* ── writing it down ────────────────────────────────────────────────────── */
/** a tan²θ + b tanθ + c, as a student writes it. */
function tanQuad(a, b, c) {
  const terms = [];
  const add = (k, tail) => {
    if (Math.abs(k) < 1e-12) return;
    const body = tail && Math.abs(Math.abs(k) - 1) < 1e-9 ? tail : `${d(Math.abs(k))}${tail ? ` ${tail}` : ''}`;
    terms.push({ neg: k < 0, body });
  };
  add(a, 'tan^2 theta'); add(b, 'tan theta'); add(c, '');
  return terms.map((t, i) => (i === 0 ? `${t.neg ? '-' : ''}${t.body}` : `${t.neg ? '-' : '+'} ${t.body}`)).join(' ') || '0';
}
/** The same quadratic in whole numbers, when it has a small common
    denominator — 40, −100, 60 is 2, −5, 3 — or null. */
function whole(a, b, c) {
  const rs = [a, b, c].map((x) => rat(x / a, 12));
  if (rs.some((r) => !r)) return null;
  const lcm = rs.reduce((m, r) => { let p = m, q = r.q; while (q) [p, q] = [q, p % q]; return (m * r.q) / p; }, 1);
  const out = rs.map((r) => (r.p * lcm) / r.q);
  return out.every((x) => Math.abs(x) <= 999) ? out : null;
}
/** An angle to substitute: bracketed when it is below the horizontal. */
const th = (x) => (x < 0 ? `(${ang(x)}°)` : `${ang(x)}°`);
const h0Term = (h0) => (Math.abs(h0) > EPS ? `${d(h0)} + ` : '');

/** h₀ + u_y t − ½gt², substituted, with no zero term and no "+ −": at a
    number t (×), or with t left as the unknown. */
function heightSrc(h0, uy, g, t = null) {
  let out = Math.abs(h0) > EPS ? d(h0) : '';
  if (Math.abs(uy) > EPS) {
    const term = t ? `${d(Math.abs(uy))} * ${t}` : `${d(Math.abs(uy))}t`;
    out = out ? `${out} ${uy < 0 ? '-' : '+'} ${term}` : `${uy < 0 ? '-' : ''}${term}`;
  }
  const grav = t ? `½ * ${d(g)} * ${t}^2` : `½ * ${d(g)}t^2`;
  return out ? `${out} - ${grav}` : `-${grav}`;
}

/** The launch in components, when it was given as a speed and an angle. */
function componentRows(F) {
  return [
    { f: M`u_x = u cos theta`, s: M`${d(F.u)} cos ${th(F.theta)}`, r: M`u_x = ${d(F.ux)} [m s^-1]` },
    { f: M`u_y = u sin theta`, s: M`${d(F.u)} sin ${th(F.theta)}`, r: M`u_y = ${d(F.uy)} [m s^-1]` },
  ];
}
/** Its path as an equation in x — the cartesian equation the papers ask for. */
function pathRow(F) {
  const k = F.g / (2 * F.ux * F.ux), tan = F.uy / F.ux;
  const r = M`y = ${poly([F.h0, snap(tan), -snap(k)], 4, { sym: 'x' })}`;
  // given as components, it is written with them: t = x/uₓ in the height
  if (F.given === 'parts') {
    let lead = Math.abs(F.h0) > EPS ? d(F.h0) : '';
    if (Math.abs(F.uy) > EPS) {
      const term = `(${d(Math.abs(F.uy))}/${d(F.ux)})x`;
      lead = lead ? `${lead} ${F.uy < 0 ? '-' : '+'} ${term}` : `${F.uy < 0 ? '-' : ''}${term}`;
    }
    const grav = `(${d(F.g)}x^2)/(2 * ${d(F.ux)}^2)`;
    return { f: M`y = h_0 + (u_y/u_x)x - (gx^2)/(2u_x^2)`, s: M`${lead ? `${lead} - ${grav}` : `-${grav}`}`, r };
  }
  return { f: M`y = h_0 + x tan theta - (gx^2)/(2u^2 cos^2 theta)`,
    s: M`${h0Term(F.h0)}x tan ${th(F.theta)} - (${d(F.g)}x^2)/(2 * ${d(F.u)}^2 cos^2 ${th(F.theta)})`, r };
}
/** Where it is at the point: the time to get there, then the height then. */
function atRows(F, P, K) {
  const a = F.at;
  const rows = [
    { f: M`t = d/u_x`, s: M`${d(P.d)}/${d(F.ux)}`, r: M`t = ${d(a.t)} [s]` },
    { f: M`y = h_0 + u_y t - ½gt^2`, s: M`${heightSrc(F.h0, F.uy, F.g, d(a.t))}`, r: M`y = ${d(a.y)} [m]` },
  ];
  if (a.clear != null && K.hits !== true) rows.push({ f: M`y - H`, s: M`${d(a.y)} - ${d(P.H)}`, r: M`y - H = ${d(a.clear)} [m]` });
  return rows;
}

/* ── the scenario ───────────────────────────────────────────────────────── */
/**
 * @param k { g, h0, u, theta, ux, uy,  d, H, tAt, kind,  find, T, top,  flag, pick }
 *   d, H   — the point: how far out, and how high above the ground (the top
 *            of the wall, the net, the tree; the target; where it hits)
 *   tAt    — or: the time it is above the point, with the launch known
 *   find   — null (it is all given: where is it at the point?), 'theta' (u
 *            given), 'u' (θ given), 'time' (the time to reach the point, T, given),
 *            'apex' (its greatest height above the ground, `top`, given)
 *   flag   — a mark on the ground: how far short of it, or beyond, it lands
 *   pick   — of two answers, 'steep' (the default) or 'flat' is flown
 */
export function solveTarget(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = k.g, h0 = have(k.h0) ? k.h0 : 0, kind = KINDS[k.kind] ? k.kind : 'wall', K = KINDS[kind];
  const find = FINDS[k.find] ? k.find : null;
  if (!have(g)) return fail('Choose the value of g the paper uses.');
  if (!(g > 0)) return fail(`${M`g`} is the size of the acceleration due to gravity: give it as a positive number.`);
  if (h0 < 0) return fail('The height it leaves from is above the ground: give it as 0 or more.');
  if (have(k.flag) && !(k.flag > 0)) return fail('The mark on the ground is ahead of the launch: give its distance as a positive number.');
  const byAngle = have(k.u) || have(k.theta), byParts = have(k.ux) || have(k.uy);
  if (byAngle && byParts) return fail('Give the launch as a speed and an angle, or as its two components — not both.');

  // a box typed for a different question is said, not quietly ignored
  if (!find && (have(k.T) || have(k.top))) return fail(`You gave ${have(k.T) ? 'a time to reach the point' : 'its greatest height'}: choose what to find from it, or clear that box.`);
  if (find && have(k.tAt)) return fail('With a number to find, give how far out the point is, not a time it is above it.');
  if (find && find !== 'time' && have(k.T)) return fail('You gave a time to reach the point: choose “both, from the time to it”, or clear that box.');
  if (find && find !== 'apex' && have(k.top)) return fail('You gave its greatest height: choose “both, from its greatest height”, or clear that box.');
  const P = { d: k.d, H: k.H };
  const needP = () => {
    if (!have(P.d) || !have(P.H)) return `To find ${FINDS[find]}, give the point: how far out it is, and its height above the ground.`;
    if (!(P.d > 0)) return 'The point is ahead of the launch: give its distance as a positive number.';
    if (P.H < 0) return 'The point is at or above the ground: give its height as 0 or more.';
    if (K.solid && !(P.H > 0)) return `A ${K.word} stands up from the ground: give its height as more than 0, or choose “A target point”.`;
    return null;
  };

  const flights = [];        // { ux, uy } of each answer, steepest first
  const rejected = [];       // { text } — a root that cannot be, and why
  let findRows = [], findTitle = '', found = null;

  if (!find) {
    // ── all given: the launch, then the point (if there is one) ──
    let ux, uy;
    if (byParts) {
      if (!have(k.ux) || !have(k.uy)) return fail('Give both components of the launch velocity: across and up (0 if it is thrown horizontally).');
      ux = k.ux; uy = k.uy;
    } else {
      if (!have(k.u) || !have(k.theta)) return fail('Still needed: the launch — its speed and its angle above the horizontal, or its two components.');
      if (!(k.u > 0)) return fail('The speed it is launched at is a size: give it as a positive number.');
      if (!(k.theta > -90 && k.theta < 90)) return fail('The angle is above (or, negative, below) the horizontal, between −90° and 90°: straight up or down never reaches a point across.');
      ux = k.u * Math.cos(k.theta * DEG); uy = k.u * Math.sin(k.theta * DEG);
      ux = snap(ux); uy = snap(uy);
    }
    if (!(ux > EPS)) return fail('The horizontal component carries it across to the point: give it as a positive number.');
    if (have(k.tAt)) {
      if (!(k.tAt > 0)) return fail('The time it is above the point is after the launch: give it as a positive number.');
      if (have(P.d)) return fail('Give the point’s distance, or the time it is above it — not both: the time fixes the distance.');
      P.d = snap(ux * k.tAt); P.fromT = k.tAt;
      const tDown = (uy + Math.sqrt(uy * uy + 2 * g * h0)) / g;
      if (k.tAt > tDown + 1e-9) return fail(`By ${M`t = ${d(k.tAt)} [s]`} it has already landed, at ${M`t = ${d(snap(tDown))} [s]`}: it ${K.hits ? 'never reaches' : 'is never above'} ${K.the} then.`);
    }
    if (have(P.d) && !(P.d > 0)) return fail('The point is ahead of the launch: give its distance as a positive number.');
    if (have(P.H) && P.H < 0) return fail('The point is at or above the ground: give its height as 0 or more.');
    if (have(P.H) && !have(P.d) && (!K.solid || K.hits)) return fail(`Give how far out ${K.the} is, or the time it is above it.`);
    if (have(P.H) && K.solid && !(P.H > 0)) return fail(`A ${K.word} stands up from the ground: give its height as more than 0.`);
    // a wall it hits, at a height the launch disagrees with, is not quietly ignored
    // (a launch that never leaves the ground is refused below, as that)
    if (kind === 'face' && have(P.H) && have(P.d) && (h0 > EPS || uy > EPS)) {
      const tP = P.d / ux, yP = h0 + uy * tP - 0.5 * g * tP * tP;
      const tDown = (uy + Math.sqrt(uy * uy + 2 * g * h0)) / g;
      if (tP > tDown + 1e-9) return fail(`With that launch it lands ${M`${d(snap(ux * tDown))} [m]`} out, at ${M`t = ${d(snap(tDown))} [s]`}, before it reaches the wall at ${M`${d(P.d)} [m]`}: it never hits it.`);
      if (Math.abs(yP - P.H) > 1e-6 * Math.max(1, Math.abs(P.H))) {
        return fail(`With that launch it is ${M`${d(snap(yP))} [m]`} up when it is ${M`${d(P.d)} [m]`} out, not the ${M`${d(P.H)} [m]`} given. Leave the height blank to see where it hits the wall, or choose “A wall” to see whether it goes over one that high.`);
      }
    }
    flights.push({ ux, uy, given: byParts ? 'parts' : 'angle' });
  } else {
    const bad = needP();
    if (bad) return fail(bad);
    if ((find === 'time' || find === 'apex') && (byAngle || byParts)) {
      return fail(`To find the speed and the angle from ${find === 'time' ? 'the time' : 'its greatest height'}, leave the launch speed, angle and components blank: the engine finds them.`);
    }
    if (byParts) return fail('With a number to find, give the launch as a speed or an angle, not as components.');
    const rise = P.H - h0;
    if (find === 'theta') {
      if (!have(k.u)) return fail('To find the angle, give the speed it is launched at.');
      if (!(k.u > 0)) return fail('The speed it is launched at is a size: give it as a positive number.');
      // y = h₀ + x tan θ − g x²(1 + tan²θ)/(2u²), at (d, H):
      //   k tan²θ − d tanθ + (k + H − h₀) = 0,  k = g d²/(2u²)
      const kk = g * P.d * P.d / (2 * k.u * k.u);
      const [a2, a1, a0] = [kk, -P.d, kk + rise];
      const w = whole(a2, a1, a0);
      const [b2, b1, b0] = w || [1, a1 / a2, a0 / a2];
      // a speed within rounding of the least that reaches the point is one
      // angle, the tangent, not two a hair apart
      const disc = a1 * a1 - 4 * a2 * a0, tol = 1e-7 * a1 * a1;
      const tans = disc < -tol ? [] : disc <= tol ? [snap(-a1 / (2 * a2))]
        : [snap((-a1 + Math.sqrt(disc)) / (2 * a2)), snap((-a1 - Math.sqrt(disc)) / (2 * a2))];
      findTitle = 'The angle, from the point';
      findRows = [
        { f: M`y = h_0 + x tan theta - (gx^2)/(2u^2)(1 + tan^2 theta)`,
          s: M`${d(P.H)} = ${h0Term(h0)}${d(P.d)} tan theta - (${d(g)} * ${d(P.d)}^2)/(2 * ${d(k.u)}^2)(1 + tan^2 theta)`,
          r: M`${tanQuad(a2, a1, a0)} = 0` },
        { f: '', s: M`"dividing by" ${d(a2 / b2)}`, r: M`${tanQuad(b2, b1, b0)} = 0` },
      ].filter((row, i) => i === 0 || Math.abs(a2 / b2 - 1) > 1e-9);
      if (!tans.length) {
        // the highest it can be at that distance, at the best angle
        const best = h0 + P.d * P.d / (4 * kk) - kk;
        if (best < 0) return fail(`At ${M`${d(k.u)} [m s^-1]`} it cannot even get ${M`${d(P.d)} [m]`} out: at every angle it lands before then.`);
        // as many places as it takes to tell the two apart
        let dp = 3;
        const fig = (x, p) => num(x, p, { trim: true });
        while (dp < 8 && fig(best, dp) === fig(P.H, dp)) dp++;
        return fail(`At ${M`${d(k.u)} [m s^-1]`} no angle takes it through that point: the highest it can be ${M`${d(P.d)} [m]`} out is ${M`${fig(best, dp)} [m]`}, at an angle of ${M`${ang(Math.atan(P.d / (2 * kk)) / DEG)}°`}, below the ${M`${fig(P.H, dp)} [m]`} it needs.`);
      }
      findRows.push({ f: M`tan theta = (-b +- sqrt(b^2 - 4ac))/(2a)`, s: M`(${d(-b1)} +- sqrt(${sgn(b1)}^2 - 4 * ${d(b2)} * ${sgn(b0)}))/(2 * ${d(b2)})`,
        r: tans.length > 1 ? M`tan theta = ${d(tans[1])} "or" ${d(tans[0])}` : M`tan theta = ${d(tans[0])}` });
      const th = tans.map((r) => snap(Math.atan(r) / DEG));
      findRows.push({ f: '', s: M`${tans.slice().reverse().map((r) => `tan^-1 ${sgn(r)}`).join(', ')}`, r: th.length > 1 ? M`theta = ${ang(th[1])}° "or" ${ang(th[0])}°` : M`theta = ${ang(th[0])}°` });
      for (const r of tans) {
        const c = 1 / Math.sqrt(1 + r * r), ux = snap(k.u * c), uy = snap(k.u * r * c);
        // a root so near vertical that the arithmetic cannot carry it to the
        // point is left out and said, rather than flown into the wall
        const tP = P.d / ux, yP = h0 + uy * tP - 0.5 * g * tP * tP;
        if (!(Math.abs(yP - P.H) <= 1e-6 * Math.max(1, Math.abs(P.H), P.d))) {
          rejected.push({ text: `${M`theta = ${ang(Math.atan(r) / DEG)}°`} is so close to straight up that it cannot be carried to the point with any accuracy, so it is left out.` });
          continue;
        }
        flights.push({ ux, uy, given: 'found' });
      }
      if (!flights.length) return fail('Both angles are too close to straight up to carry to the point with any accuracy.');
      found = { what: 'theta', values: th };
    } else if (find === 'u') {
      if (!have(k.theta)) return fail('To find the speed, give the angle it is launched at.');
      if (!(k.theta > -90 && k.theta < 90)) return fail('The angle is between −90° and 90° of the horizontal.');
      const tan = Math.tan(k.theta * DEG), cos = Math.cos(k.theta * DEG);
      const lift = h0 + P.d * tan - P.H;
      if (!(lift > 1e-9)) {
        return fail(`At ${M`${ang(k.theta)}°`} no speed takes it through that point: ${h0 + P.d * tan < 0 ? `aimed in a straight line at that angle it would reach the ground before it got ${M`${d(P.d)} [m]`} out` : `aimed in a straight line it would be at ${M`${d(snap(h0 + P.d * tan))} [m]`} there`}, and gravity only pulls it lower — the point at ${M`${d(P.H)} [m]`} is ${lift < -1e-9 ? 'above' : 'on'} that line.`);
      }
      const u2 = g * P.d * P.d / (2 * cos * cos * lift), u = Math.sqrt(u2);
      findTitle = 'The speed, from the point';
      findRows = [
        { f: M`H = h_0 + d tan theta - (gd^2)/(2u^2 cos^2 theta)`,
          s: M`${d(P.H)} = ${h0Term(h0)}${d(P.d)} tan ${th(k.theta)} - (${d(g)} * ${d(P.d)}^2)/(2u^2 cos^2 ${th(k.theta)})`, r: '' },
        { f: M`u^2 = (gd^2)/(2cos^2 theta (h_0 + d tan theta - H))`,
          s: M`(${d(g)} * ${d(P.d)}^2)/(2cos^2 ${th(k.theta)} (${h0Term(h0)}${d(P.d)} tan ${th(k.theta)} - ${d(P.H)}))`, r: M`u^2 = ${d(snap(u2))}` },
        { f: M`u = sqrt(u^2)`, s: M`sqrt(${d(snap(u2))})`, r: M`u = ${d(snap(u))} [m s^-1]` },
      ];
      flights.push({ ux: snap(u * cos), uy: snap(u * Math.sin(k.theta * DEG)), given: 'found' });
      found = { what: 'u', values: [snap(u)] };
    } else if (find === 'time') {
      if (!have(k.T)) return fail('To find the speed and angle from the time, give the time it takes to reach the point.');
      if (!(k.T > 0)) return fail('The time to reach the point is after the launch: give it as a positive number.');
      const ux = snap(P.d / k.T), uy = snap((rise + 0.5 * g * k.T * k.T) / k.T);
      findTitle = 'The speed and angle, from the time';
      findRows = [
        { f: M`u_x = d/t`, s: M`${d(P.d)}/${d(k.T)}`, r: M`u_x = ${d(ux)} [m s^-1]` },
        { f: M`H - h_0 = u_y t - ½gt^2`, s: M`${d(P.H)}${Math.abs(h0) > EPS ? ` - ${d(h0)}` : ''} = ${d(k.T)}u_y - ½ * ${d(g)} * ${d(k.T)}^2`, r: M`u_y = ${d(uy)} [m s^-1]` },
        { f: M`u = sqrt(u_x^2 + u_y^2)`, s: M`sqrt(${d(ux)}^2 + ${sgn(uy)}^2)`, r: M`u = ${d(snap(Math.hypot(ux, uy)))} [m s^-1]` },
        { f: M`theta = tan^-1 (u_y/u_x)`, s: M`tan^-1 (${sgn(uy)}/${d(ux)})`, r: M`theta = ${ang(Math.atan2(uy, ux) / DEG)}°` },
      ];
      flights.push({ ux, uy, given: 'found' });
      found = { what: 'time', values: [] };
    } else if (find === 'apex') {
      if (!have(k.top)) return fail('To find the speed and angle from its greatest height, give that height above the ground.');
      if (k.top < h0 - 1e-9) return fail(`Its greatest height is at least the ${M`${d(h0)} [m]`} it leaves from.`);
      if (P.H > k.top + 1e-9) return fail(`The point, ${M`${d(P.H)} [m]`} up, is higher than its greatest height of ${M`${d(k.top)} [m]`}: it never gets there.`);
      if (!(h0 > EPS) && !(k.top > EPS)) return fail('A greatest height of 0, launched from the ground, means it never leaves the ground.');
      const uy = snap(Math.sqrt(2 * g * (k.top - h0)));
      // the times it is at the point's height: on the way up and on the way down
      const tTop = uy / g, all = timesAt(P.H, tTop, k.top, g);
      let ts = all.filter((t) => t > 1e-9);
      // a wall it hits on the way up stops it before its greatest height, so
      // that root is not a launch with that greatest height
      if (K.hits) {
        for (const t of ts.filter((x) => x < tTop * (1 - 1e-6) - 1e-9)) rejected.push({ text: `${M`t = ${d(t)} [s]`} would have it hit the wall on its way up, before it reaches its greatest height, so it is rejected.` });
        ts = ts.filter((x) => x >= tTop * (1 - 1e-6) - 1e-9);
      }
      if (!ts.length) return fail(K.hits ? 'Every launch with that greatest height would hit the wall on its way up, before reaching it.' : 'It is never at the point’s height after it is launched.');
      findTitle = 'The speed and angle, from its greatest height';
      findRows = [
        { f: M`v_y^2 = u_y^2 - 2gs`, s: M`0 = u_y^2 - 2 * ${d(g)} * ${paren2(k.top, h0)}`, r: M`u_y = ${d(uy)} [m s^-1]` },
        { f: M`H - h_0 = u_y t - ½gt^2`, s: M`${d(P.H)}${Math.abs(h0) > EPS ? ` - ${d(h0)}` : ''} = ${heightSrc(0, uy, g)}`,
          r: M`t = ${all.map((t) => d(t)).join(' "or" ')} [s]` },
      ];
      // a root at or before the launch is the start, not a moment on the way
      for (const t of all) if (!(t > 1e-9)) rejected.push({ text: `${M`t = ${d(t)} [s]`} is ${t < -1e-9 ? 'before it is launched' : 'the moment it is launched'}, so it is rejected.` });
      for (const t of ts) {
        const ux = snap(P.d / t);
        findRows.push({ f: M`u_x = d/t`, s: M`${d(P.d)}/${d(t)}`, r: M`u_x = ${d(ux)} [m s^-1]` });
        findRows.push({ f: M`theta = tan^-1 (u_y/u_x)`, s: M`tan^-1 (${d(uy)}/${d(ux)})`, r: M`theta = ${ang(Math.atan2(uy, ux) / DEG)}°` });
        findRows.push({ f: M`u = sqrt(u_x^2 + u_y^2)`, s: M`sqrt(${d(ux)}^2 + ${d(uy)}^2)`, r: M`u = ${d(snap(Math.hypot(ux, uy)))} [m s^-1]` });
        flights.push({ ux, uy, given: 'found', tP: t });
      }
      found = { what: 'apex', values: [] };
    }
  }

  // Each answer, flown; then the steeper first.
  const PP = have(P.d) || have(P.H) ? P : null;
  let F = flights.map((x) => Object.assign(flight({ ux: x.ux, uy: x.uy, h0, g }, PP, kind), { given: x.given }));
  F.sort((a, b) => b.theta - a.theta);
  if (F.some((x) => !(x.tGround > 1e-9))) return fail('It starts on the ground and is not moving upwards, so it never leaves it: give it an upward component, or a height to leave from.');
  // A found answer that lands before the point never reaches it.
  if (find) {
    const keep = F.filter((x) => x.at.reached);
    for (const x of F.filter((y) => !y.at.reached)) rejected.push({ text: `${M`theta = ${ang(x.theta)}°`} would have it land ${M`${d(x.R)} [m]`} out, before the point, so it is rejected.` });
    if (!keep.length) return fail('Each answer would have it land before it reaches the point.');
    F = keep;
  }
  const pick = F.length > 1 && k.pick === 'flat' ? 1 : 0;
  const S = F[pick], O = F.length > 1 ? F[1 - pick] : null;

  // ── what it says ──
  const notes = [], derived = [];
  if (found?.what === 'theta') {
    notes.push(F.length > 1 ? `Two angles take it through the point: ${M`theta = ${ang(F[1].theta)}°`} and ${M`theta = ${ang(F[0].theta)}°`}. The ${pick ? 'flatter' : 'steeper'} one is flown; the other is drawn faintly.`
      : `One angle takes it through the point: ${M`theta = ${ang(F[0].theta)}°`}${F[0] && found.values.length > 1 ? '' : ' — the most it can reach there'}.`);
    derived.push(F.length > 1 ? `${M`theta = ${ang(F[1].theta)}°`} or ${M`${ang(F[0].theta)}°`}` : M`theta = ${ang(F[0].theta)}°`);
  } else if (find) {
    // the steeper is slower across, so it is later at the point: past its top
    if (F.length > 1) notes.push(`Two launches fit: at ${M`theta = ${ang(F[0].theta)}°`} it passes the point on the way down, and at ${M`theta = ${ang(F[1].theta)}°`} on the way up. The ${pick ? 'flatter' : 'steeper'} one is flown; the other is drawn faintly.`);
    notes.push(`It is launched at ${M`${d(S.u)} [m s^-1]`}, ${Math.abs(S.theta) < 1e-9 ? 'horizontally' : `${M`${ang(Math.abs(S.theta))}°`} ${S.theta < 0 ? 'below' : 'above'} the horizontal`}.`);
    derived.push(`${M`u = ${d(S.u)} [m s^-1]`}`, `${M`theta = ${ang(S.theta)}°`}`);
  }
  for (const r of rejected) notes.push(r.text);
  const sayAt = (x) => {
    const a = x.at;
    if (!a) return null;
    if (!a.reached) return `It lands ${M`${d(x.R)} [m]`} out, before it reaches ${K.the} at ${M`${d(P.d)} [m]`}.`;
    const when = `at ${M`t = ${d(a.t)} [s]`}`;
    if (K.hits) return `It hits ${K.the} ${M`${d(a.y)} [m]`} up, ${when}, moving at ${M`${d(a.speed)} [m s^-1]`}.`;
    if (a.clear == null) return `It is ${M`${d(a.y)} [m]`} up when it is ${M`${d(P.d)} [m]`} out, ${when}.`;
    if (Math.abs(a.clear) < 1e-6) return kind === 'point' ? `It passes through the point ${when}.` : `It just clears ${K.top} ${when}.`;
    if (kind === 'point') return `It passes ${M`${d(Math.abs(a.clear))} [m]`} ${a.clear > 0 ? 'above' : 'below'} the point ${when}.`;
    return a.clear > 0 ? `It clears ${K.the} by ${M`${d(a.clear)} [m]`} ${when}.`
      : `It hits ${K.the} ${M`${d(-a.clear)} [m]`} below the top, ${when}.`;
  };
  const at = sayAt(S);
  if (P.fromT) notes.push(`${K.hits ? 'At' : 'Above'} ${K.the} at ${M`t = ${d(P.fromT)} [s]`}: it is ${M`${d(P.d)} [m]`} out.`);
  if (S.hits && K.hits && S.at && !find) derived.push(`hits ${K.the} ${M`${d(S.at.y)} [m]`} up, ${M`t = ${d(S.at.t)} [s]`}`);
  if (at) notes.push(at);
  if (S.at?.reached && !K.hits && S.at.clear != null && Math.abs(S.at.clear) > 1e-6 && !find) derived.push(S.at.clear > 0 ? `${kind === 'point' ? 'above it' : 'clears'} by ${M`${d(Math.abs(S.at.clear))} [m]`}` : kind === 'point' ? `below it by ${M`${d(-S.at.clear)} [m]`}` : `hits it ${M`${d(-S.at.clear)} [m]`} below the top`);
  if (S.at && find === 'theta') {
    notes.push(`Its greatest height on the way to the point is ${M`${d(S.topBefore)} [m]`}${S.apexAt === 'before' ? ', at the top of its path, before it gets there'
      : S.apexAt === 'at' ? ', at the point itself, which is the top of its path' : ', at the point itself: it is still rising'}.`);
  }
  if (S.apex && (!S.hits || S.apex.t < S.end - 1e-9)) notes.push(`At the top of its path it is ${M`${d(S.apex.y)} [m]`} up, ${M`${d(S.apex.x)} [m]`} out, at ${M`t = ${d(S.apex.t)} [s]`}.`);
  if (!S.hits) {
    notes.push(`It lands ${M`${d(S.R)} [m]`} from the launch at ${M`t = ${d(S.tGround)} [s]`}, at ${M`${d(S.landSpeed)} [m s^-1]`}.`);
    derived.push(`lands at ${M`${d(S.R)} [m]`}, ${M`t = ${d(S.tGround)} [s]`}`);
  }
  let flagGap = null;
  if (have(k.flag) && S.hits) notes.push(`It hits ${K.the}, so it never reaches the mark at ${M`${d(k.flag)} [m]`}.`);
  if (have(k.flag) && !S.hits) {
    flagGap = snap(k.flag - S.R);
    notes.push(Math.abs(flagGap) < 1e-6 ? `It lands on the mark, ${M`${d(k.flag)} [m]`} out.`
      : `It lands ${M`${d(Math.abs(flagGap))} [m]`} ${flagGap > 0 ? 'short of' : 'beyond'} the mark at ${M`${d(k.flag)} [m]`}.`);
    if (O && !O.hits) {
      const g2 = snap(k.flag - O.R);
      notes.push(`At the other angle, ${M`${ang(O.theta)}°`}, it would land ${M`${d(O.R)} [m]`} out, ${M`${d(Math.abs(g2))} [m]`} ${g2 > 0 ? 'short of' : 'beyond'} the mark.`);
      const near = Math.abs(g2) < Math.abs(flagGap) ? O : S, gap = Math.min(Math.abs(g2), Math.abs(flagGap));
      if (Math.abs(Math.abs(g2) - Math.abs(flagGap)) > 1e-6) notes.push(`Of the two, ${M`theta = ${ang(near.theta)}°`} lands nearer the mark: ${M`${d(gap)} [m]`} from it${near === O ? ` — choose “the ${near.theta < S.theta ? 'flatter' : 'steeper'}” to fly it` : ''}.`);
    }
    derived.push(`${M`${d(Math.abs(flagGap))} [m]`} ${flagGap > 0 ? 'short of' : 'past'} the mark`);
  }
  if (S.span && kind !== 'point' && !K.hits && have(P.H)) {
    if (!have(P.d)) derived.unshift(`a ${M`${d(P.H)} [m]`} ${K.word} cleared ${S.span.from < EPS ? `up to ${M`${d(S.span.to)} [m]`}` : `from ${M`${d(S.span.from)} [m]`} to ${M`${d(S.span.to)} [m]`}`} out`);
    notes.push(S.span.from < EPS
      ? `A ${K.word} ${M`${d(P.H)} [m]`} high is cleared anywhere up to ${M`${d(S.span.to)} [m]`} out.`
      : `A ${K.word} ${M`${d(P.H)} [m]`} high is cleared anywhere between ${M`${d(S.span.from)} [m]`} and ${M`${d(S.span.to)} [m]`} out.`);
  }

  if (have(P.H) && !have(P.d) && !S.span && K.solid) {
    notes.push(`It never gets above ${M`${d(P.H)} [m]`}, so a ${K.word} that high is cleared nowhere.`);
    derived.unshift(`never above ${M`${d(P.H)} [m]`}`);
  }
  const f = targetMotion(S, O, PP, have(k.flag) ? k.flag : null);
  f.flights = F; f.pick = pick; f.kindOf = kind; f.flagGap = flagGap;
  // where it is thrown from, for the picture only: a stand, a window, a roof
  f.from = ['window', 'roof'].includes(k.from) ? k.from : 'stand';
  return {
    ok: true, mode: 'target', axis: 'plane', kind, K, find, found, P: PP, h0, g,
    flights: F, pick, shown: S, other: O, rejected, findRows, findTitle, flag: have(k.flag) ? k.flag : null, flagGap,
    f, notes, derived: derived.length ? derived : ['its path'],
    params: { u: S.u, theta: S.theta, h: h0, g },
    convention: `Across from the launch and up from the ground are positive; ${M`g = ${d(g)} [m s^-2]`} downwards.`,
  };
}
const paren2 = (top, h0) => (Math.abs(h0) > EPS ? `(${d(top)} - ${d(h0)})` : d(top));

/* ── the working ──────────────────────────────────────────────────────── */
export function targetWorking(solved) {
  if (!solved?.ok) return [];
  const { find, findRows, findTitle, shown: S, P, K, kind, flights } = solved;
  const out = [];
  if (find) out.push({ title: findTitle, rows: findRows,
    note: find === 'theta' ? `Its path, ${M`y = h_0 + x tan theta - (gx^2)/(2u^2 cos^2 theta)`}, written with ${M`1/(cos^2 theta) = 1 + tan^2 theta`}, is a quadratic in ${M`tan theta`}: two angles, a flatter and a steeper, can pass through the same point.`
      : find === 'apex' ? `At the top of its path the vertical velocity is zero; the time to the point comes from the vertical motion, and the horizontal speed from that time.`
        : find === 'time' ? 'The horizontal motion has no acceleration, so the distance over the time is the horizontal velocity; the vertical motion gives the other component.' : '' });
  const parts = S.given !== 'parts' && find !== 'time' && find !== 'apex';
  out.push({ title: `${find && flights.length > 1 ? 'The flight shown' : parts ? 'The launch' : 'Its path'}${parts ? ', in components' : ''}`,
    // found from the point, its components are worked too, so u_x below has a source
    rows: [...(S.given !== 'parts' && find !== 'time' && find !== 'apex' ? componentRows(S) : []), pathRow(S)],
    note: `Horizontally there is no acceleration; vertically it is ${M`-g`}. Taking ${M`t = x/u_x`} into the height gives the path as an equation in ${M`x`}.` });
  if (P && S.at) {
    const rows = S.at.reached ? atRows(S, P, K) : [];
    // with the time given, the distance comes from it, not the time from the distance
    if (P.fromT) rows.splice(0, 1, { f: M`x = u_x t`, s: M`${d(S.ux)} * ${d(P.fromT)}`, r: M`x = ${d(P.d)} [m]` });
    if (rows.length) out.push({ title: kind === 'point' ? 'At the point' : K.hits ? 'Where it hits the wall' : `At ${K.the}`, rows });
  }
  if (S.apex && (!S.hits || S.apex.t < S.end - 1e-9)) {
    out.push({ title: 'The top of its path', rows: [
      { f: M`t = u_y/g`, s: M`${d(S.uy)}/${d(S.g)}`, r: M`t = ${d(S.apex.t)} [s]` },
      { f: M`H_max = h_0 + (u_y^2)/(2g)`, s: M`${h0Term(S.h0)}(${d(S.uy)}^2)/(2 * ${d(S.g)})`, r: M`H_max = ${d(S.apex.y)} [m]` },
    ] });
  }
  if (!S.hits) {
    out.push({ title: 'Where it lands', rows: [
      { f: M`0 = h_0 + u_y t - ½gt^2`, s: M`0 = ${heightSrc(S.h0, S.uy, S.g)}`, r: M`t = ${d(S.tGround)} [s]` },
      { f: M`x = u_x t`, s: M`${d(S.ux)} * ${d(S.tGround)}`, r: M`x = ${d(S.R)} [m]` },
      { f: M`v_y = u_y - gt`, s: M`${d(S.uy)} - ${d(S.g)} * ${d(S.tGround)}`, r: M`v_y = ${d(S.vLand.y)} [m s^-1]` },
      { f: M`v = sqrt(u_x^2 + v_y^2)`, s: M`sqrt(${d(S.ux)}^2 + ${sgn(S.vLand.y)}^2)`, r: M`v = ${d(S.landSpeed)} [m s^-1]` },
    ] });
  }
  if (solved.flag != null && solved.flagGap != null) {
    out.push({ title: 'The mark on the ground', rows: [
      { f: M`"mark" - x`, s: M`${d(solved.flag)} - ${d(S.R)}`, r: M`"mark" - x = ${d(solved.flagGap)} [m]` },
    ], note: solved.other && !solved.other.hits ? `At the other angle it lands ${M`${d(solved.other.R)} [m]`} out.` : '' });
  }
  if (S.span && kind !== 'point' && !K.hits && P && P.H != null) {
    const rows = [{ f: M`H = h_0 + u_y t - ½gt^2`, s: M`${d(P.H)} = ${heightSrc(S.h0, S.uy, S.g)}`,
      r: S.span.up != null ? M`t = ${d(S.span.up)} "or" ${d(S.span.down)} [s]` : M`t = ${d(S.span.down)} [s]` }];
    rows.push({ f: M`x = u_x t`, s: S.span.up != null ? M`${d(S.ux)} * ${d(S.span.up)}, ${d(S.ux)} * ${d(S.span.down)}` : M`${d(S.ux)} * ${d(S.span.down)}`,
      r: S.span.up != null ? M`x = ${d(S.span.from)} "to" ${d(S.span.to)} [m]` : M`x < ${d(S.span.to)} [m]` });
    out.push({ title: `Where a ${K.word} that high is cleared`, rows,
      note: 'It is above that height between the two times it passes through it — or, launched from higher up, until the one time it comes down through it.' });
  }
  return out;
}
