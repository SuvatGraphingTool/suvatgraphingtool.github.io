// boundary.js — a ball struck towards a fielder on the boundary: does it reach
// them on the full, low enough to be caught?
//
// The exam family: a batter hits a cricket ball at a speed and an angle; a
// fielder stands on the boundary a distance away and can catch it only below
// a height above the point it was struck from. The flight is the projectile
// of js/core/target.js — x = uₓt, y = u_y t − ½gt² — read at the boundary:
// t = d ÷ uₓ, then the height there. Three outcomes, each said as an exam
// answer: under the reach (caught), at or over it (it carries the fielder),
// or back at the height it was struck from before the boundary (it never gets
// there on the full). Then, on level ground, its greatest height and where it
// would come down; and the one-step link the papers add: its momentum just
// after the hit, p = mv, with v the speed it is struck at.
//
// CONVENTION. x is horizontal from where it is struck, y is height above that
// point, up positive; θ is above the horizontal; g > 0. The ground is taken
// level with the point it is struck from, as the papers take it.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { flight } from './target.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const DEG = Math.PI / 180;
const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
/** Three significant figures, as an answer is given. */
const s3 = (x) => {
  if (!have(x) || x === 0) return num(x || 0, 0);
  const p = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)) + 1e-9));
  return num(x, p);
};

/**
 * @param k { u: the speed it is struck at; theta: its angle above the horizontal (°);
 *            d: how far away the fielder on the boundary is; L: the greatest height above
 *            the point it was struck from that the fielder can catch it below;
 *            m: its mass (kg), for its momentum; g }
 */
export function solveBoundary(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  if (!have(k.g)) return fail('Choose the value of g the paper uses.');
  if (!(k.g > 0)) return fail(`${M`g`} is the size of the acceleration due to gravity: give it as a positive number.`);
  const g = k.g;
  if (!have(k.u) || !have(k.theta)) return fail('Still needed: the hit — the speed it is struck at and its angle above the horizontal.');
  if (!(k.u > 0)) return fail('The speed it is struck at is a size: give it as a positive number.');
  if (!(k.theta > 0 && k.theta < 90)) return fail('Give the angle above the horizontal, between 0° and 90°: hit level or into the ground it is never in the air, and hit straight up it never travels towards the boundary.');
  if (!have(k.d)) return fail('Still needed: how far away the fielder on the boundary is.');
  if (!(k.d > 0)) return fail('The fielder is out in front of the batter: give the distance to the boundary as a positive number.');
  if (!have(k.L)) return fail('Still needed: the greatest height, above the point it was struck from, that the fielder can catch it below.');
  if (!(k.L > 0)) return fail('The fielder can reach above the height it was struck from: give that height as a positive number.');
  const m = have(k.m) ? k.m : null;
  if (m != null && !(m > 0)) return fail('Give the mass of the ball as a positive number.');

  const u = k.u, theta = k.theta, D = k.d, L = k.L;
  const ux = snap(u * Math.cos(theta * DEG)), uy = snap(u * Math.sin(theta * DEG));
  // the flight read at the boundary, with the reach as the height to beat
  const F = flight({ ux, uy, h0: 0, g }, { d: D, H: L }, 'point');
  const at = F.at;
  // back at the height it was struck from before the boundary: it never gets there on the full
  const reached = at.reached && at.y >= -1e-9;
  // "less than" the reach: at it exactly, it is not caught
  const verdict = !reached ? 'short' : at.y < L - 1e-9 ? 'catch' : 'over';
  const R = snap(ux * F.tGround), H = F.apex.y, tTop = F.apex.t, T = F.tGround;
  const p = m != null ? snap(m * u) : null;
  const tEnd = verdict === 'catch' ? at.t : T;
  const margin = reached ? snap(L - at.y) : null;      // how far under the reach (negative: over it)

  // ── the working, as the mark scheme has it
  const comps = [
    { f: M`u_x = u cos theta`, s: M`${d(u)} cos ${d(theta)}°`, r: M`u_x = ${d(ux)} [m s^-1]` },
    { f: M`u_y = u sin theta`, s: M`${d(u)} sin ${d(theta)}°`, r: M`u_y = ${d(uy)} [m s^-1]` },
  ];
  const yAt = `${d(uy)} * ${d(at.t)} - ½ * ${d(g)} * ${d(at.t)}^2`;
  const toRope = [
    { f: M`t = d/u_x`, s: M`${d(D)}/${d(ux)}`, r: M`t = ${d(at.t)} [s]` },
    { f: M`y = u_y t - ½gt^2`, s: M`${yAt}`, r: M`y = ${d(at.y)} [m]` },
    verdict === 'short'
      ? { f: M`y < 0`, s: M`${d(at.y)} < 0`, r: M`"below where it was struck: it has already come down"` }
      : verdict === 'catch'
        ? { f: M`y < L`, s: M`${d(at.y)} < ${d(L)}`, r: M`"under the reach: it can be caught"` }
        : { f: M`y >= L`, s: M`${d(at.y)} >= ${d(L)}`, r: M`"not under the reach: it carries the fielder"` },
  ];
  const level = [
    { f: M`H = (u_y^2)/(2g)`, s: M`(${d(uy)}^2)/(2 * ${d(g)})`, r: M`H = ${d(H)} [m]` },
    { f: M`T = (2u_y)/g`, s: M`(2 * ${d(uy)})/${d(g)}`, r: M`T = ${d(T)} [s]` },
    { f: M`R = u_x T`, s: M`${d(ux)} * ${d(T)}`, r: M`R = ${d(R)} [m]` },
  ];
  const mom = p == null ? [] : [
    { f: M`p = mv`, s: M`${d(m)} * ${d(u)}`, r: M`p = ${d(p)} [N s]` },
  ];

  // ── the verdict, as an exam answer (a sentence: the parts strip lets it wrap, css/shell.css .verdict)
  const said = verdict === 'catch'
    ? `Yes: at the boundary it is ${M`${s3(at.y)} [m]`} above the height it was struck from, under ${M`${d(L)} [m]`}, so the fielder can catch it.`
    : verdict === 'over'
      ? `No: at the boundary it is ${M`${s3(at.y)} [m]`} above the height it was struck from, not under ${M`${d(L)} [m]`}, so it goes over the fielder’s reach and lands ${M`${s3(R)} [m]`} out, beyond the boundary.`
      : `No: it comes back down to the height it was struck from ${M`${s3(R)} [m]`} out, ${M`${s3(snap(D - R))} [m]`} short of the boundary, so it never reaches the fielder on the full.`;
  const verdictHTML = `<span class="verdict">${said}</span>`;

  const notes = [
    `Struck at ${M`${d(u)} [m s^-1]`} at ${M`${d(theta)}°`}, it travels across at a steady ${M`${d(ux)} [m s^-1]`} and starts up at ${M`${d(uy)} [m s^-1]`}.`,
    verdict === 'short'
      ? `It is back at the height it was struck from after ${M`${d(T)} [s]`}, ${M`${d(R)} [m]`} out, before it reaches the boundary at ${M`${d(D)} [m]`}.`
      : `It reaches the boundary after ${M`${d(at.t)} [s]`}, ${M`${d(at.y)} [m]`} above the height it was struck from, ${verdict === 'catch' ? `${M`${d(margin)} [m]`} under` : `${M`${d(-margin)} [m]`} over`} the fielder’s reach of ${M`${d(L)} [m]`}.`,
    verdict === 'catch'
      ? `Not caught, it would rise to ${M`${d(H)} [m]`} and come down ${M`${d(R)} [m]`} out, ${M`${d(snap(R - D))} [m]`} beyond the boundary.`
      : `It rises to ${M`${d(H)} [m]`} and comes down ${M`${d(R)} [m]`} out.`,
    ...(p == null ? [] : [`Just after the hit its speed is ${M`${d(u)} [m s^-1]`}, so its momentum is ${M`${d(m)} * ${d(u)} = ${d(p)} [N s]`}.`]),
  ];
  const derived = [
    verdict === 'catch' ? `caught, ${M`${d(at.y)} [m]`} up at the boundary` : verdict === 'over' ? `over the fielder, ${M`${d(at.y)} [m]`} up at the boundary` : `down ${M`${d(R)} [m]`} out, short of the boundary`,
    `${M`H = ${d(H)} [m]`}, ${M`R = ${d(R)} [m]`}`,
    ...(p == null ? [] : [M`p = ${d(p)} [N s]`]),
  ];

  // ── the motion, for the transport, the stage and the graphs
  const clampT = (t) => Math.min(Math.max(t, 0), tEnd);
  const f = {
    kind: 'boundary', F, tMax: tEnd, tFlight: tEnd, g, d: D, L, m, verdict, tAt: at.t, yAt: at.y, R, H, tTop, tGround: T,
    params: { u, theta, h: 0, g },
    pos: (t) => ({ x: F.x(clampT(t)), y: F.y(clampT(t)) }),
    // caught, it is at rest in the fielder's hands
    vel: (t) => (verdict === 'catch' && t > tEnd + 1e-9 ? { x: 0, y: 0 } : { x: ux, y: F.vy(clampT(t)) }),
    speed: (t) => (verdict === 'catch' && t > tEnd + 1e-9 ? 0 : snap(Math.hypot(ux, F.vy(clampT(t))))),
    accel: () => ({ x: 0, y: -g }),
    momentum: (t) => (m == null ? 0 : m * f.speed(t)),
    kineticEnergy: () => 0, bounces: 0, segments: [], horiz: null,
    /** Points along the path from 0 to tEnd (by default the motion's end; the
        whole flight to the ground, for the path it would have taken). */
    path(n = 160, tTo = tEnd) {
      const out = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * tTo; out.push({ t, x: F.x(t), y: F.y(t) }); }
      return out;
    },
  };

  return {
    ok: true, mode: 'boundary', f, F, verdict, caught: verdict === 'catch', reached,
    at: { t: at.t, y: at.y, speed: at.speed, vy: at.vy, margin },
    // the moment part (a) is about: at the boundary, or where it came down short of it
    tShow: verdict === 'short' ? T : at.t,
    u, theta, ux, uy, d: D, L, m, p, R, H, tTop, T, g,
    verdictHTML, comps, toRope, level, mom, notes, derived, params: f.params,
    convention: 'Across from where it is struck, and up from that height: up is positive.',
  };
}

export function boundaryWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'The hit, in components', rows: s.comps, note: 'Across, nothing acts: its speed across never changes. Up, gravity slows it at g.' },
    { title: 'At the boundary', rows: s.toRope, note: 'The time to the boundary comes from the steady speed across; the height then from the motion up.' },
    { title: 'Over level ground', rows: s.level, note: 'Its greatest height, and where it would come down level with where it was struck.' },
    ...(s.mom.length ? [{ title: 'Its momentum', rows: s.mom, note: 'Just after the hit it moves at the speed it was struck at.' }] : []),
  ];
}
