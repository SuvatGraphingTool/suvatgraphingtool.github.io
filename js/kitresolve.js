// kitresolve.js — Resolve, for every stage that is not one of the twelve's
// projectiles: the library's kits, the road, and the scenes Ask Suvat
// composes (which run on the same kits).
//
// THE ENGINE SAYS (CLAUDE.md rule 4). Everything on the card is read from the
// motion the engine returned — its position and velocity at the instant —
// and, where the engine gives it, its acceleration. Nothing here works
// anything out beyond reading those, taking the start away for a
// displacement, and squaring and adding two components for a size and an
// angle, which is what the card is for.
//
// THE OBJECTS. A kit may list them itself — `kit.resolveObjects(f)` returning
// [{ name, pos, vel, acc, axis?, sign?, from? }] — or they are found in the
// motion `f`: `posA`/`posB` (with `velA`/`velB`, or a constant `A.v`/`B.v`),
// the pair's `at(t)`, `yP`/`yQ`, or one `pos`/`vel`. Each gets its blocks.
//
// HOW EACH IS READ. `kit.resolveAxis` (or an object's own `axis`):
//   'along' | 'vertical' | 'down'  one line: forwards, up, or down positive;
//   'ij'    from above, in i and j, with the angle to i — or, with
//           `kit.resolveBearing`, the bearing (i east, j north);
//   'map'   from above, east and north, with a bearing;
//   'bank'  a river from above: along the bank, downstream, and across;
//   blank   whichever of x and y moves: both is a plane side on, one a line.
// `sign` −1 says the engine's v and a are already down positive (the bounce's
// chosen convention); `from` names where a displacement is measured from.
// `kit.resolveUnits(f)` gives [s, v, a, t] units for a question in letters or
// in kilometres and hours; `kit.resolveNames` the two objects' names.
//
// THE CARD'S SHAPE: { t, tUnit?, blocks: [{ name, hue, rows: [{ name, value,
// unit, formula, sub, note, hue, part }] }], note } — what js/app.js
// renderResolve prints. `hue` is the quantity, `part` 'x' (dashed) or 'y'.

import { M, num } from './notation.js';

const fin = (x) => typeof x === 'number' && isFinite(x);
const d = (x, p = 2) => num(x, p, { trim: true });
const UNITS = { s: 'm', v: 'm s⁻¹', a: 'm s⁻²' };
const vec = (q) => (typeof q === 'number' ? { x: 0, y: q } : q || { x: 0, y: 0 });
const three = (b) => String(Math.round(((b % 360) + 360) % 360) % 360).padStart(3, '0');

/** Side on, as the twelve's card says it: an angle above or below the horizontal, and which way. */
function side(v) {
  const up = Math.atan2(Math.abs(v.y), Math.abs(v.x)) * 180 / Math.PI;
  const way = v.x < -1e-9 ? ', moving to the left' : '';
  return Math.abs(v.y) < 1e-9 ? `Horizontal${way}.` : Math.abs(v.x) < 1e-9 ? `Straight ${v.y > 0 ? 'up' : 'down'}.` : `${d(up, 1)}° ${v.y > 0 ? 'above' : 'below'} the horizontal${way}.`;
}

/** Does this motion ever move along x, along y? Sampled over the run. */
function axesOf(pos, tMax) {
  let mx = 0, my = 0;
  const p0 = vec(pos(0));
  for (let i = 1; i <= 24; i++) { const p = vec(pos((i / 24) * tMax)); mx = Math.max(mx, Math.abs(p.x - p0.x)); my = Math.max(my, Math.abs(p.y - p0.y)); }
  const big = Math.max(mx, my, 1e-9);
  return { x: mx > 1e-6 * big, y: my > 1e-6 * big };
}

/** One object's blocks at t. */
function blocksFor(o, t, tMax, K, U) {
  const axis = o.axis ?? K?.resolveAxis, who = o.name ? `${o.name}: ` : '';
  const p = vec(o.pos(t)), v = vec(o.vel ? o.vel(t) : 0), p0 = vec(o.pos(0));
  const ax = axesOf(o.pos, tMax);
  const flat = ['map', 'ij', 'bank'].includes(axis);
  if (flat || (!axis && ax.x && ax.y)) {
    // in a plane: each vector split into its two parts, then its size and angle
    const sp = Math.hypot(v.x, v.y);
    const angle = Math.atan2(v.y, v.x) * 180 / Math.PI;
    const bearing = (Math.atan2(v.x, v.y) * 180 / Math.PI + 360) % 360;
    const map = axis === 'map', ij = axis === 'ij', bank = axis === 'bank';
    const [nx, ny, wx, wy] = map ? ['East', 'North', 'Dashed: east–west.', 'Solid: north–south. North is positive.']
      : ij ? [`${M`vec i`} part`, `${M`vec j`} part`, `Dashed: along ${M`vec i`}.`, `Solid: along ${M`vec j`}.`]
      : bank ? ['Along the bank', 'Across', 'Dashed: downstream is positive.', 'Solid: away from the bank it set off from.']
      : ['Horizontal component', 'Vertical component', 'Dashed on the stage: across.', 'Solid on the stage: up and down. Up is positive.'];
    const how = sp < 1e-9 ? 'At rest.'
      : map || (ij && K?.resolveBearing) ? `On a bearing of ${three(bearing)}°.`
      : ij ? `At ${d((angle + 360) % 360, 1)}° to ${M`vec i`}, measured anticlockwise from ${M`vec i`}.`
      : bank ? (Math.abs(v.x) < 1e-9 ? 'Straight across.' : `At ${d(Math.abs(Math.atan2(v.y, Math.abs(v.x)) * 180 / Math.PI), 1)}° to the bank, carried ${v.x > 0 ? 'downstream' : 'upstream'}.`)
      : side(v);
    // from above, the position vector r from the origin the question names;
    // side on, the displacement from where it started, as the twelve's card
    const r = flat ? p : { x: p.x - p0.x, y: p.y - p0.y }, dist = Math.hypot(r.x, r.y);
    const acc0 = o.acc ? o.acc(t) : null, acc = acc0 && typeof acc0 === 'object' && fin(acc0.x) && fin(acc0.y) ? acc0 : null;
    const from = o.from ?? K?.resolveFrom ?? 'O';
    return [
      { name: `${who}velocity`, hue: 'vel', rows: [
        { name: nx, value: v.x, unit: U.v, formula: M`v_x`, sub: d(v.x), note: wx, hue: 'vel', part: 'x' },
        { name: ny, value: v.y, unit: U.v, formula: M`v_y`, sub: d(v.y), note: wy, hue: 'vel', part: 'y' },
        { name: 'Speed', value: sp, unit: U.v, formula: M`sqrt(v_x^2 + v_y^2)`, sub: d(sp), note: how, hue: 'vel', part: 'r' },
      ] },
      { name: `${who}${flat ? 'position' : 'displacement'}`, hue: 'disp', rows: [
        { name: flat ? nx : 'Horizontal', value: r.x, unit: U.s, formula: M`x`, sub: d(r.x), note: flat ? `From ${from}.` : 'From where it started.', hue: 'disp', part: 'x' },
        { name: flat ? ny : 'Vertical', value: r.y, unit: U.s, formula: M`y`, sub: d(r.y), note: flat ? `From ${from}.` : 'Up from where it started.', hue: 'disp', part: 'y' },
        { name: 'Distance', value: dist, unit: U.s, formula: M`sqrt(x^2 + y^2)`, sub: d(dist), note: flat ? `In a straight line from ${from}.` : 'In a straight line from where it started.', hue: 'disp', part: 'r' },
        // from above, where it set off is not O: how far it is from there too
        ...(flat && Math.hypot(p0.x, p0.y) > 1e-9 ? [(() => { const s0 = Math.hypot(p.x - p0.x, p.y - p0.y); return { name: 'From where it started', value: s0, unit: U.s, formula: M`abs(vec r - vec r_0)`, sub: d(s0), note: 'The size of its displacement.', hue: 'disp', part: 'r' }; })()] : []),
      ] },
      // from above, a constant acceleration in two parts too, where the engine gives one
      ...(flat && acc && Math.hypot(acc.x, acc.y) > 1e-9 ? [{ name: `${who}acceleration`, hue: 'acc', rows: [
        { name: nx, value: acc.x, unit: U.a, formula: M`a_x`, sub: d(acc.x), note: '', hue: 'acc', part: 'x' },
        { name: ny, value: acc.y, unit: U.a, formula: M`a_y`, sub: d(acc.y), note: '', hue: 'acc', part: 'y' },
        { name: 'Size', value: Math.hypot(acc.x, acc.y), unit: U.a, formula: M`sqrt(a_x^2 + a_y^2)`, sub: d(Math.hypot(acc.x, acc.y)), hue: 'acc', part: 'r',
          note: `Constant: ${map || (ij && K?.resolveBearing) ? `on a bearing of ${three((Math.atan2(acc.x, acc.y) * 180 / Math.PI + 360) % 360)}°` : ij ? `at ${d((Math.atan2(acc.y, acc.x) * 180 / Math.PI + 360) % 360, 1)}° to ${M`vec i`}, measured anticlockwise` : 'the same at every instant'}.` },
      ] }] : []),
    ];
  }
  // along one line: s, v and a, read off whichever coordinate moves
  const k = ax.y ? 'y' : ax.x ? 'x' : typeof o.pos(0) === 'number' ? 'y' : 'x';
  const line = axis || (k === 'y' ? 'vertical' : 'along');
  const a = o.acc ? o.acc(t) : null;
  const s = p[k], vv = v[k];
  const aa = fin(a) ? a : a && typeof a === 'object' ? a[k] : null;
  const down = line === 'down' || (line === 'vertical' && o.sign < 0);
  const from = o.from ?? K?.resolveFrom;
  const [sN, sNote] = line === 'vertical' ? ['Height', from ? `Up from ${from}.` : 'Up from where heights are measured.']
    : line === 'down' ? ['Distance down', 'Down from where it started.']
    : [from ? `Displacement from ${from}` : 'Displacement', from ? `Along the line, from ${from}.` : 'Along the line, from the start.'];
  const [pos1, neg1, plus] = down ? ['going down', 'going up', 'Down'] : line === 'along' ? ['going forwards', 'going backwards', 'Forwards'] : ['going up', 'going down', 'Up'];
  const dir = vv > 1e-9 ? pos1 : vv < -1e-9 ? neg1 : 'at rest';
  const part = line === 'along' ? 'x' : 'y';
  // the engine follows it no further from here: an impact, or the end of its run
  const before = (u) => { const b = o.acc?.(u); return fin(b) ? b : b && typeof b === 'object' ? b[k] : 0; };
  const ended = Math.abs(vv) > 1e-9 && (t < tMax - 1e-9
    ? Math.abs(vec(o.pos(Math.min(tMax, t + tMax * 1e-3)))[k] - s) < 1e-12
    : Math.abs(vec(o.pos(t - tMax * 1e-3))[k] - s) < 1e-12 || (fin(aa) && Math.abs(aa) < 1e-9 && Math.abs(before(t - tMax * 1e-3)) > 1e-9));
  const rows = [
    { name: sN, value: s, unit: U.s, formula: M`s`, sub: d(s), note: sNote, hue: 'disp', part },
    { name: 'Velocity', value: vv, unit: U.v, formula: M`v`, sub: d(vv), note: `${dir[0].toUpperCase()}${dir.slice(1)}. ${plus} is positive.`, hue: 'vel', part },
  ];
  if (fin(aa)) {
    rows.push({ name: 'Acceleration', value: aa, unit: U.a, formula: M`a`, sub: d(aa), hue: 'acc', part,
      note: ended ? 'Its motion ends here: the engine follows it no further.'
        : Math.abs(vv) < 1e-9 ? (Math.abs(aa) < 1e-9 ? 'At rest.' : t < 1e-9 ? 'Starting from rest.' : t >= tMax - 1e-9 ? 'Coming to rest.' : 'Momentarily at rest.')
        : Math.abs(aa) < 1e-9 ? 'Steady: no acceleration.' : aa * vv < 0 ? 'Against the motion: slowing down.' : 'With the motion: speeding up.' });
  }
  return [{ name: `${who}${line === 'along' ? 'along the line' : 'up and down'}`, hue: '', rows }];
}

/** The objects to resolve, from the kit or the motion. */
function objectsOf(K, f) {
  if (K?.resolveObjects) return K.resolveObjects(f);
  const [nA, nB] = K?.resolveNames || ['A', 'B'];
  const still = (o) => (o?.v ? () => o.v : null);   // a constant velocity, kept on the object
  if (f.posA && f.posB) return [{ name: nA, pos: f.posA, vel: f.velA || still(f.A), acc: f.accA }, { name: nB, pos: f.posB, vel: f.velB || still(f.B), acc: f.accB }];
  if (typeof f.at === 'function' && f.A && f.B) {
    return ['A', 'B'].map((w, i) => ({ name: [nA, nB][i], pos: (u) => f.at(u)[w].x, vel: (u) => f.at(u)[w].v, acc: f[w].acc ? (u) => f[w].acc(u) : null }));
  }
  if (f.yP && f.yQ) {
    // each falls freely once it is moving; Q waits on the ground until it is launched
    const g = fin(f.g) ? f.g : null;
    return [{ name: 'P', pos: f.yP, vel: f.vP, acc: g == null ? null : () => -g }, { name: 'Q', pos: f.yQ, vel: f.vQ, acc: g == null ? null : (t) => (t < (f.t0 ?? 0) ? 0 : -g) }];
  }
  if (f.pos && f.vel) return [{ name: '', pos: f.pos, vel: f.vel, acc: f.accel || f.acc || (K?.resolveG ? () => ({ x: 0, y: -f.params.g }) : null) }];
  return null;
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
  K = K || { resolveAxis: 'along', resolveFrom: 'A' };   // the road: along A to B
  const objs = objectsOf(K, f);
  if (!objs?.length) return null;
  // in letters, or in km and hours: the numbers are in the question's own units
  const lu = K?.resolveUnits?.(f), U = lu ? { s: lu[0], v: lu[1], a: lu[2] } : UNITS;
  const blocks = objs.flatMap((o) => blocksFor(o, tt, tMax, K, U));
  const letters = lu && /×/.test(lu[0]);
  return { t: tt, tUnit: lu?.[3], blocks, note: letters ? 'In the question’s letters: each number is a multiple of the unit beside it. Drag the time slider to watch it change.' : 'Read from the engine at this instant. Drag the time slider to watch it change.' };
}
