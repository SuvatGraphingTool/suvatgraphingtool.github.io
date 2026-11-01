// kitresolve.js — Resolve, for every stage that is not one of the twelve's
// projectiles: the library's kits, the road, and the scenes Ask Suvat
// composes (which run on the same kits).
//
// THE ENGINE SAYS (CLAUDE.md rule 4). Everything on the card is read from the
// motion the engine returned — its position and velocity at the instant —
// and, where the engine gives it, its acceleration. Nothing here works
// anything out beyond reading those and squaring and adding two components
// for a size and an angle, which is what the card is for.
//
// A KIT MAY SAY FOR ITSELF. `kit.resolve(solved, t)` returning the card's
// shape (below) wins. Otherwise this reads the motion `f`:
//   · two objects (`posA`/`posB`, `velA`/`velB`): a block for each, A and B;
//   · one object whose `pos(t)` is { x, y }: the velocity and the displacement,
//     each split into its horizontal and vertical parts — or, when one of the
//     two never moves, the one line it moves along;
//   · `kit.resolveAxis` says how to read it when the coordinates cannot: a
//     lift's height kept in x, a fall measured down, a map seen from above
//     (rowsFor, below).
//
// THE CARD'S SHAPE: { t, blocks: [{ name, hue, rows: [{ name, value, unit,
// formula, sub, note }] }], note } — what js/app.js renderResolve prints.

import { M, num } from './notation.js';

const fin = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p = 2) => num(x, p, { trim: true });
const UNITS = { s: 'm', v: 'm s⁻¹', a: 'm s⁻²' };
const vec = (q) => (typeof q === 'number' ? { x: 0, y: q } : q || { x: 0, y: 0 });

/** Does this motion ever move along x, along y? Sampled over the run. */
function axesOf(pos, tMax) {
  let mx = 0, my = 0;
  const p0 = vec(pos(0));
  for (let i = 1; i <= 24; i++) { const p = vec(pos((i / 24) * tMax)); mx = Math.max(mx, Math.abs(p.x - p0.x)); my = Math.max(my, Math.abs(p.y - p0.y)); }
  const big = Math.max(mx, my, 1e-9);
  return { x: mx > 1e-6 * big, y: my > 1e-6 * big };
}

/** One object's rows at t. `axis` (the kit's `resolveAxis`) says how to read it:
 *   'along' | 'vertical' | 'down'  one line: forwards, up, or down positive;
 *   'map'   from above, i east and j north, with a bearing;
 *   'ij'    from above, in i and j, with the angle to i;
 *   'bank'  a river from above: along the bank, downstream, and across;
 *   blank   whichever of x and y moves: both is a plane side on, y alone up and down. */
function rowsFor(name, pos, vel, acc, t, tMax, axis, U = UNITS) {
  const p = vec(pos(t)), v = vec(vel(t));
  const ax = axesOf(pos, tMax), who = name ? `${name}: ` : '';
  const a = acc ? acc(t) : null;
  const flat = ['map', 'ij', 'bank'].includes(axis);
  if (flat || (!axis && ax.x && ax.y)) {
    // in a plane: each vector split into its two parts, then its size and angle
    const sp = Math.hypot(v.x, v.y), dist = Math.hypot(p.x, p.y);
    const bearing = ((Math.atan2(v.x, v.y) * 180 / Math.PI) % 360 + 360) % 360;
    const angle = Math.atan2(v.y, v.x) * 180 / Math.PI;
    const [nx, ny, wx, wy] = axis === 'map' ? ['East', 'North', 'Dashed: east–west.', 'Solid: north–south. North is positive.']
      : axis === 'ij' ? [`${M`vec i`} part`, `${M`vec j`} part`, `Dashed: along ${M`vec i`}.`, `Solid: along ${M`vec j`}.`]
      : axis === 'bank' ? ['Along the bank', 'Across', 'Dashed: downstream is positive.', 'Solid: away from the start bank.']
      : ['Horizontal component', 'Vertical component', 'Dashed on the stage: across.', 'Solid on the stage: up and down. Up is positive.'];
    const how = axis === 'map' ? `On a bearing of ${String(Math.round(bearing) % 360).padStart(3, '0')}°.`
      : axis === 'ij' ? `At ${d(angle, 1)}° to ${M`vec i`}.`
      : axis === 'bank' ? `At ${d(Math.atan2(v.y, v.x) * 180 / Math.PI, 1)}° to the bank, downstream.`
      : `At ${d(angle, 1)}° to the horizontal.`;
    return [
      { name: `${who}velocity`, hue: 'vel', rows: [
        { name: nx, value: v.x, unit: U.v, formula: M`v_x`, sub: d(v.x), note: wx },
        { name: ny, value: v.y, unit: U.v, formula: M`v_y`, sub: d(v.y), note: wy },
        { name: 'Speed', value: sp, unit: U.v, formula: M`sqrt(v_x^2 + v_y^2)`, sub: d(sp), note: sp > 1e-9 ? how : 'At rest.' },
      ] },
      { name: `${who}displacement`, hue: 'disp', rows: [
        { name: flat ? nx : 'Horizontal', value: p.x, unit: U.s, formula: M`x`, sub: d(p.x), note: flat ? '' : 'From where it started.' },
        { name: flat ? ny : 'Vertical', value: p.y, unit: U.s, formula: M`y`, sub: d(p.y), note: '' },
        { name: 'Distance', value: dist, unit: U.s, formula: M`sqrt(x^2 + y^2)`, sub: d(dist), note: flat ? 'From O.' : '' },
      ] },
    ];
  }
  // along one line: s, v and a, read off whichever coordinate moves
  const k = ax.x && !ax.y ? 'x' : 'y';
  const line = axis || (k === 'y' ? 'vertical' : 'along');
  const s = p[k], vv = v[k], aa = fin(a) ? a : a && typeof a === 'object' ? a[k] : null;
  const [sN, sNote, pos1, neg1, plus] = line === 'vertical' ? ['Height', 'Up from where heights are measured.', 'going up', 'going down', 'Up']
    : line === 'down' ? ['Distance down', 'Down from where it started.', 'going down', 'going up', 'Down']
    : ['Displacement', 'Along the line, from the start.', 'going forwards', 'going backwards', 'Forwards'];
  const dir = vv > 1e-9 ? pos1 : vv < -1e-9 ? neg1 : 'at rest';
  const rows = [
    { name: sN, value: s, unit: U.s, formula: M`s`, sub: d(s), note: sNote },
    { name: 'Velocity', value: vv, unit: U.v, formula: M`v`, sub: d(vv), note: `${dir[0].toUpperCase()}${dir.slice(1)}. ${plus} is positive.` },
  ];
  if (fin(aa)) rows.push({ name: 'Acceleration', value: aa, unit: U.a, formula: M`a`, sub: d(aa), note: Math.abs(aa) < 1e-9 ? 'Steady: no acceleration.' : Math.abs(vv) < 1e-9 ? 'Momentarily at rest.' : aa * vv < 0 ? 'Against the motion: slowing down.' : 'With the motion: speeding up.' });
  return [{ name: `${who}${line === 'along' ? 'along the line' : 'up and down'}`, hue: 'vel', rows }];
}

/**
 * The card for a kit's (or the road's) motion at t.
 * @param K       the kit (or null for the road)
 * @param solved  the engine's answer (may be null)
 * @param f       the motion
 * @param t       the instant
 */
export function resolveKit(K, solved, f, t) {
  if (!f) return null;
  const tMax = fin(f.tMax) ? f.tMax : fin(f.tFlight) ? f.tFlight : 1;
  const tt = Math.min(Math.max(t, 0), tMax);
  if (K?.resolve) { const R = K.resolve(solved, tt, f); if (R) return { t: tt, ...R }; }
  const axis = K?.resolveAxis;
  // a question in letters: the numbers are multiples of its letters, not metres
  const lu = K?.resolveUnits?.(f), U = lu ? { s: lu[0], v: lu[1], a: lu[2] } : UNITS;
  let blocks;
  // two objects, in the three ways the engines name them
  const still = (o) => (o?.v ? () => o.v : null);   // a constant velocity, kept on the object
  const two = f.posA && f.posB ? [['A', f.posA, f.velA || still(f.A), f.accA], ['B', f.posB, f.velB || still(f.B), f.accB]]
    : typeof f.at === 'function' && f.A && f.B ? [['A', (u) => f.at(u).A.x, (u) => f.at(u).A.v, (u) => f.A.acc?.(u)], ['B', (u) => f.at(u).B.x, (u) => f.at(u).B.v, (u) => f.B.acc?.(u)]]
    : f.yP && f.yQ ? [['P', f.yP, f.vP], ['Q', f.yQ, f.vQ]]
    : null;
  if (two) {
    blocks = two.flatMap(([n, p, v, a]) => rowsFor(n, p, v || (() => 0), a, tt, tMax, axis, U).slice(0, 1));
  } else if (f.pos && f.vel) {
    blocks = rowsFor('', f.pos, f.vel, f.accel || f.acc, tt, tMax, axis, U);
  } else return null;
  return { t: tt, tUnit: lu?.[3], blocks, note: lu ? 'In the question’s letters: each number is a multiple of the unit beside it. Drag the time slider to watch it change.' : 'Read from the engine at this instant. Drag the time slider to watch it change.' };
}
