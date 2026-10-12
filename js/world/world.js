// world.js — the stadium and the district around it, built once.
//
// ONE MODEL, ONE PROJECTION. Everything below is stored in world metres and
// nothing is stored twice. The side-on view takes a CROSS-SECTION of it along
// the plane the flight happens in. Keeping the model in three dimensions and
// cutting it is what lets the section move with the launch site instead of
// being drawn once per scenario, so it is worth the indirection.
//
// Record kinds:
//   ground   a flat surface at one height          {x0,x1,z0,z1,y,tone}
//   solid    an axis-aligned box, optional ridge   {x0,x1,z0,z1,y0,y1,tone}
//   paint    a marking lying on a surface          {kind,...,tone}
//   prop     a point instance of a fitting            {type,x,z,rot}
//   sides    the four seating decks, as sections
//   roof     the cable net on its elliptical ring
//
// There is nothing here that is placed at random. The district that used to
// stand outside the bowl needed a hash of each item's own index to keep the
// same tree in the same spot between two slices; the stadium is all measured
// geometry, so the hash went with it. The one population still drawn from a
// hash is the crowd, and it is seeded from its own row in js/render/world2d.js.

import { D, tierSteps } from './dims.js';

/* ── plan helpers ───────────────────────────────────────────────────── */

/** Half-extent of a rounded rectangle along `axis`, at perpendicular p. */
export function roundedHalf(halfAlong, halfPerp, r, p) {
  const a = Math.abs(p);
  if (a <= halfPerp - r) return halfAlong;
  const d = a - (halfPerp - r);
  if (d >= r) return null;                       // the cut misses this side
  return halfAlong - r + Math.sqrt(r * r - d * d);
}

/** Outline of a rounded rectangle, for plan maps. */
export function roundedRect(halfL, halfW, r, n = 10) {
  const pts = [];
  const corner = (cx, cz, a0) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push({ x: cx + r * Math.cos(a), z: cz + r * Math.sin(a) });
    }
  };
  corner(halfL - r, halfW - r, 0);
  corner(-(halfL - r), halfW - r, Math.PI / 2);
  corner(-(halfL - r), -(halfW - r), Math.PI);
  corner(halfL - r, -(halfW - r), -Math.PI / 2);
  return pts;
}

/* ── the build ──────────────────────────────────────────────────────── */
let WORLD = null;
export function world() { return WORLD || (WORLD = build()); }

function build() {
  const ground = [], solids = [], paint = [], props = [];
  const G = (x0, x1, z0, z1, y, tone, tag) => ground.push({ x0, x1, z0, z1, y, tone, tag });
  const S = (x0, x1, z0, z1, y0, y1, tone, tag, extra) =>
    solids.push({ x0, x1, z0, z1, y0, y1, tone, tag, ...extra });
  const PR = (type, x, z, rot = 0, extra) => props.push({ type, x, z, rot, ...extra });

  /* ── the ground the stadium stands on ─────────────────────────────── */
  //
  // NOTHING OUTSIDE THE STADIUM. There used to be a district out here: two
  // parks with ponds and trees on a jittered grid, four terraces of houses
  // stored as rows, four car parks full of cars, a dual carriageway with its
  // street trees and traffic, a west-side street, a rail station with four
  // tracks and forty people waiting on the platform. It was built as scale
  // reference — a 1.5 m car and a 4.4 m bus next to a flight tells you how
  // big the flight is — and on a section it did not pay for itself.
  //
  // Every one of those props is a POINT instance gathered by the cut inside a
  // 9 m band, drawn one sprite at a time, and the sprite pass is one of the
  // three loops that `A.cheap` skips while the camera moves. At pitch level
  // the camera follows the ball, so it is moving for the whole flight: the
  // trees and the people blinked out, came back when it settled, and blinked
  // out again on the next drag. A scale reference that is not there whenever
  // anything is happening is not a scale reference, and a scenery that
  // flickers reads as a fault in the physics.
  //
  // The crowd in the stands is the reference that was always doing the work —
  // forty thousand people, inside the frame, at a known 1.8 m, and part of a
  // deck rather than a loose instance. The ground beyond the podium is left
  // as ground.
  const FAR = 26000;
  G(-FAR, FAR, -FAR, FAR, 0, 'ground', 'ground');

  /* ── podium plaza ────────────────────────────────────────────────── */
  // The plaza is a RING round the bowl, not a disc under it. Drawn as a disc
  // it paves over the pitch, which is exactly the sort of thing that only
  // shows up when the same record has to serve a section and a bird's eye.
  const PD = D.podium, BW = D.bowl;
  S(-PD.halfL, -BW.halfL, -PD.halfW, PD.halfW, 0, PD.y, 'concrete', 'podium');
  S(BW.halfL, PD.halfL, -PD.halfW, PD.halfW, 0, PD.y, 'concrete', 'podium');
  S(-BW.halfL, BW.halfL, -PD.halfW, -BW.halfW, 0, PD.y, 'concrete', 'podium');
  S(-BW.halfL, BW.halfL, BW.halfW, PD.halfW, 0, PD.y, 'concrete', 'podium');
  // steps down to the forecourt and to the south
  for (let i = 0; i < PD.stepN; i++) {
    const t = i / PD.stepN, y = PD.y * (1 - t);
    S(-70, 70, -PD.halfW - (i + 1) * 0.9, -PD.halfW - i * 0.9, 0, y, 'concrete', 'steps');
    S(-70, 70, PD.halfW + i * 0.9, PD.halfW + (i + 1) * 0.9, 0, y, 'concrete', 'steps');
  }
  /* ── the grass, the lines, the goals, the hoardings ──────────────── */
  const P = D.pitch, SU = D.surface;
  G(-SU.halfL, SU.halfL, -SU.halfW, SU.halfW, 0, 'runoff', 'run-off');
  G(-P.halfL, P.halfL, -P.halfW, P.halfW, 0, 'grass', 'pitch');
  for (let i = 0; i < P.stripes; i++) {
    if (i % 2) continue;
    G(-P.halfL + i * P.stripeW, -P.halfL + (i + 1) * P.stripeW, -P.halfW, P.halfW, 0, 'grassAlt', 'mowing stripe');
  }
  const L = P.lineW;
  const box = (x0, x1, z0, z1) => {
    paint.push({ kind: 'line', axis: 'x', a: [x0, x1], p: z0, w: L, tone: 'pitchline' });
    paint.push({ kind: 'line', axis: 'x', a: [x0, x1], p: z1, w: L, tone: 'pitchline' });
    paint.push({ kind: 'line', axis: 'z', a: [z0, z1], p: x0, w: L, tone: 'pitchline' });
    paint.push({ kind: 'line', axis: 'z', a: [z0, z1], p: x1, w: L, tone: 'pitchline' });
  };
  box(-P.halfL, P.halfL, -P.halfW, P.halfW);                      // touch and goal lines
  paint.push({ kind: 'line', axis: 'z', a: [-P.halfW, P.halfW], p: 0, w: L, tone: 'pitchline', tag: 'halfway' });
  paint.push({ kind: 'circle', x: 0, z: 0, r: P.centreCircleR, w: L, tone: 'pitchline', tag: 'centre circle' });
  paint.push({ kind: 'disc', x: 0, z: 0, r: P.centreSpotR, tone: 'pitchline', tag: 'centre spot' });
  for (const s of [-1, 1]) {
    const gl = s * P.halfL;
    box(gl, gl - s * P.penaltyDepth, -P.penaltyHalfW, P.penaltyHalfW);
    box(gl, gl - s * P.goalAreaDepth, -P.goalAreaHalfW, P.goalAreaHalfW);
    paint.push({ kind: 'disc', x: gl - s * P.penaltySpot, z: 0, r: P.centreSpotR, tone: 'pitchline' });
    paint.push({ kind: 'arc', x: gl - s * P.penaltySpot, z: 0, r: P.penaltyArcR, w: L, tone: 'pitchline',
                 clipX: s > 0 ? { max: gl - s * P.penaltyDepth } : { min: gl - s * P.penaltyDepth } });
    for (const t of [-1, 1]) paint.push({ kind: 'arc', x: gl, z: t * P.halfW, r: P.cornerArcR, w: L, tone: 'pitchline' });
    // the goal
    const gw = D.goal.width / 2, gh = D.goal.height, pr = D.goal.postR;
    for (const t of [-1, 1]) S(gl - s * pr, gl + s * pr, t * gw - pr, t * gw + pr, 0, gh, 'white', 'goalpost');
    S(gl - s * pr, gl + s * pr, -gw, gw, gh - pr * 2, gh, 'white', 'crossbar');
    S(gl, gl + s * D.goal.netDepth, -gw - 0.1, gw + 0.1, 0, gh, 'net', 'goal net', { net: true, mesh: D.goal.netMesh });
    PR('flag', gl, P.halfW, 0); PR('flag', gl, -P.halfW, 0);
  }
  // hoardings all the way round, in 2.4 m panels
  const B = D.boards;
  for (const s of [-1, 1]) {
    S(-B.atX, B.atX, s * B.atZ, s * B.atZ + s * B.depth, 0, B.height, 'board', 'hoarding', { panel: B.panel, axis: 'x' });
    S(s * B.atX, s * B.atX + s * B.depth, -B.atZ, B.atZ, 0, B.height, 'board', 'hoarding', { panel: B.panel, axis: 'z' });
  }
  // The dugout, as a thing rather than a pane: a solid back and seats, with
  // the glass canopy over it. One translucent box on its own read as a sheet
  // of blue hanging at the touchline.
  S(-D.bench.length / 2, D.bench.length / 2, D.bench.atZ - D.bench.depth, D.bench.atZ,
    0, D.bench.roofH * 0.52, 'board', 'technical area');
  S(-D.bench.length / 2, D.bench.length / 2, D.bench.atZ - D.bench.depth, D.bench.atZ,
    D.bench.roofH * 0.52, D.bench.roofH, 'glass', 'dugout canopy');

  /* NOBODY ON THE PITCH. A figure 1.8 m tall seen from the touchline is about
     the size of the ball's velocity arrow, and twenty-three of them stand in
     a field the flight has to cross — so the one thing the eye is meant to
     follow had twenty-three decoys the same size and nearly the same value.
     The scale reference is the crowd, which is in the stands where it costs
     nothing. The grass is left empty for the ball. */

  /* ── the bowl: four sides, each a section swept along its front ───── */
  const sides = [
    { id: 'N', axis: 'z', sign: -1, spec: D.sides.NS },
    { id: 'S', axis: 'z', sign: +1, spec: D.sides.NS },
    { id: 'W', axis: 'x', sign: -1, spec: D.sides.W },
    { id: 'E', axis: 'x', sign: +1, spec: D.sides.E },
  ];

  /* ── the roof ────────────────────────────────────────────────────── */
  const roof = { ...D.roof, bowl: D.bowl };

  /* floodlighting: a continuous strip under the inner ring, plus corners.

     The four corner clusters were placed on `D.roof.ringA` / `ringB`, the
     semi-axes of an elliptical opening that stopped existing when the roof
     and the bowl were made to share one rounded-rectangle family. Both read
     `undefined`, so every cluster has been sitting at x = NaN — and NaN fails
     the band test and the visibility test alike, which is why four
     floodlights went missing without anything ever looking wrong.

     The opening is the front row inset by `ringInset`, which is what the
     renderer derives it from too. A cluster goes at 45° on each corner arc:
     the arc centre, plus the radius resolved onto both axes. */
  const RO = { a: D.bowl.frontL - D.roof.ringInset,
               b: D.bowl.frontW - D.roof.ringInset,
               r: D.bowl.frontR - D.roof.ringInset };
  for (const sgnX of [-1, 1]) for (const sgnZ of [-1, 1]) {
    const d = RO.r / Math.SQRT2;
    PR('lightCluster', sgnX * (RO.a - RO.r + d), sgnZ * (RO.b - RO.r + d), 0, { y: D.roof.ringBottom });
  }

  return { dims: D, ground, solids, paint, props, sides, roof,
           counts: { ground: ground.length, solids: solids.length, paint: paint.length, props: props.length } };
}

/* ── the cross-section ───────────────────────────────────────────────── */

/**
 * Cut the world along one axis and return everything the 2D view needs, all of
 * it already in section coordinates: u runs along the cut, y is height.
 *
 *   u = dir × (world coordinate along `axis`)
 *
 * so `dir = -1` simply mirrors the section, which is what a free kick shooting
 * west needs. `at` is the perpendicular coordinate of the cutting plane.
 */
export function slice({ axis, at, dir = 1, band = 9 }) {
  const W = world();
  const perpAxis = axis === 'x' ? 'z' : 'x';
  const U = (v) => dir * v;
  const span = (r) => {                                   // the cut's interval, or null
    const lo = r[axis + '0'], hi = r[axis + '1'];
    const p0 = r[perpAxis + '0'], p1 = r[perpAxis + '1'];
    if (at < Math.min(p0, p1) || at > Math.max(p0, p1)) return null;
    const a = U(lo), b = U(hi);
    return a <= b ? [a, b] : [b, a];
  };

  const surfaces = [];
  for (const g of W.ground) { const s = span(g); if (s) surfaces.push({ u0: s[0], u1: s[1], y: g.y, tone: g.tone, tag: g.tag }); }

  const blocks = [];
  for (const s of W.solids) {
    const iv = span(s);
    if (!iv) continue;
    // `ridge`, `eaves`, `row` and a `gable` flag — "a house row cut ACROSS
    // shows its gable, cut ALONG shows the eaves" — were carried here too. No
    // solid has a ridge any more.
    blocks.push({ u0: iv[0], u1: iv[1], y0: s.y0, y1: s.y1, tone: s.tone, tag: s.tag,
                  net: s.net, mesh: s.mesh, glazed: s.glazed,
                  panel: s.panel, panelAxis: s.axis, canopy: s.canopy });
  }

  const marks = [];
  for (const m of W.paint) {
    if (m.kind === 'line' || m.kind === 'dashed') {
      if (m.axis === axis) {                              // parallel: a long run at p
        if (Math.abs(at - m.p) > m.w / 2 + 1e-9) continue;
        marks.push({ u0: U(m.a[0]), u1: U(m.a[1]), tone: m.tone, run: true, tag: m.tag });
      } else {                                            // perpendicular: a single tick
        if (at < Math.min(...m.a) || at > Math.max(...m.a)) continue;
        marks.push({ u: U(m.p), w: m.w, tone: m.tone, tag: m.tag });
      }
    } else if (m.kind === 'circle' || m.kind === 'arc') {
      const d = at - m[perpAxis];
      if (Math.abs(d) > m.r) continue;
      const q = Math.sqrt(m.r * m.r - d * d);
      for (const sgn of [-1, 1]) {
        const v = m[axis] + sgn * q;
        if (m.clipX && ((m.clipX.max != null && v > m.clipX.max) || (m.clipX.min != null && v < m.clipX.min))) continue;
        marks.push({ u: U(v), w: m.w ?? 0.12, tone: m.tone, tag: m.tag });
      }
    } else if (m.kind === 'disc') {
      if (Math.abs(at - m[perpAxis]) > m.r) continue;
      marks.push({ u: U(m[axis]), w: m.r * 2, tone: m.tone, tag: m.tag });
    }
  }

  const near = [];
  for (const p of W.props) {
    const off = p[perpAxis] - at;
    if (Math.abs(off) > band) continue;
    near.push({ ...p, u: U(p[axis]), off: Math.abs(off) / band });
  }
  near.sort((a, b) => b.off - a.off);                     // far from the plane first

  // Things the plane misses but that stand just beyond it — the hoardings
  // running parallel to the cut, the goal frame, a bench — drawn lighter and
  // behind. A pure zero-thickness cut is honest and almost empty; "beyond the
  // cut, lighter" is how every building section has handled this for a century.
  const BEYOND = 46;
  const behind = [];
  for (const sld of W.solids) {
    const p0 = sld[perpAxis + '0'], p1 = sld[perpAxis + '1'];
    if (at >= Math.min(p0, p1) && at <= Math.max(p0, p1)) continue;   // already cut
    const off = Math.min(Math.abs(at - p0), Math.abs(at - p1));
    if (off > BEYOND) continue;
    const a = U(sld[axis + '0']), b = U(sld[axis + '1']);
    behind.push({ u0: Math.min(a, b), u1: Math.max(a, b), y0: sld.y0, y1: sld.y1,
                  tone: sld.tone, tag: sld.tag, off: off / BEYOND });
  }
  behind.sort((a, b) => b.off - a.off);

  /* the bowl sides this cut actually crosses, as (u,y) profiles */
  const decks = [];
  for (const s of W.sides) {
    if (s.axis !== axis) continue;                        // parallel to the cut: not crossed
    const half = roundedHalf(s.spec.front, axis === 'x' ? D.bowl.halfW : D.bowl.halfL,
                            0, at);                       // fronts are straight in the middle
    if (half == null) continue;
    decks.push({ id: s.id, sign: s.sign, dirSign: U(s.sign) >= 0 ? 1 : -1,
                 u0: U(s.sign * s.spec.front), spec: s.spec });
  }

  /* the roof, as a section: two wings unless the cut misses the opening */
  const R = W.roof, bw = D.bowl;
  // the same offset rounded rectangle the bowl is generated from
  const outer = roundedHalf(axis === 'x' ? bw.frontL + bw.depth : bw.frontW + bw.depth,
                            axis === 'x' ? bw.frontW + bw.depth : bw.frontL + bw.depth,
                            bw.frontR + bw.depth, at);
  const ringHalf = (() => {
    const k = bw.frontR - R.ringInset;
    const a = (axis === 'x' ? bw.frontL : bw.frontW) - R.ringInset;
    const b = (axis === 'x' ? bw.frontW : bw.frontL) - R.ringInset;
    return roundedHalf(a, b, k, at) || 0;                 // the cut may miss the opening
  })();
  const wings = outer == null ? [] : [-1, 1].map((sgn) => ({
    inner: U(sgn * ringHalf), outerU: U(sgn * outer), open: ringHalf > 0,
  }));

  return { axis, at, dir, band, surfaces, blocks, behind, marks, props: near, decks,
           roof: { wings, ...R }, dims: D };
}

/** The stepped (u,y) polyline of one deck, outward from its front. */
export function deckProfile(deck) {
  const out = [];
  const s = deck.dirSign;                                 // which way "outward" is in u
  const u = (d) => deck.u0 + s * d;
  for (const el of deck.spec.el) {
    if (el.t === 'tier') {
      const steps = tierSteps(el);
      const pts = [{ u: u(el.d0), y: el.y0 }];
      for (const st of steps) { pts.push({ u: u(st.d2), y: st.y }); pts.push({ u: u(st.d2), y: st.y2 }); }
      out.push({ t: 'tier', el, pts, u0: u(el.d0), u1: u(el.d1), y0: el.y0, y1: el.y1, rows: el.rows,
                 rowD: el.rowD, rise: el.rise, name: el.name, s });
    } else {
      out.push({ t: el.t, el, u0: u(el.d0), u1: u(el.d1), y0: el.y0, y1: el.y1, name: el.name, s });
    }
  }
  return out;
}

/* ── where every scenario launches from ──────────────────────────────── */
//
// `axis`/`at` choose the cutting plane, `dir` which way the section reads, and
// `origin` is the launch point in world metres. Flight x maps to
//   u = dir·origin[axis] + x
// which is why a free kick shooting west can share one world with a goal kick
// shooting east without either of them being drawn backwards.

export const SITES = {
  dropped: { axis: 'z', at: 0, dir: 1, origin: { x: 0, z: 0 },
    place: 'A camera drone, 80 m above the centre circle', view: 'across the pitch' },

  up: { axis: 'z', at: 0, dir: 1, origin: { x: 0, z: 0 },
    place: 'The centre spot', view: 'across the pitch',
    note: '14 m s⁻¹ reaches 9.99 m — level with the back of the lower tier.' },

  down: { axis: 'z', at: 0, dir: 1, origin: { x: 0, z: -41 },
    place: 'The roof edge, at the inner compression ring', view: 'across the pitch' },

  platform: { axis: 'z', at: 0, dir: 1, origin: { x: 0, z: -78 },
    place: 'Front row of the north upper tier, 25 m up', view: 'across the pitch',
    note: 'Lands 45.2 m out, just inside the touchline.' },

  arc: { axis: 'x', at: 0, dir: 1, origin: { x: -52.5, z: 0 },
    place: 'A goal kick from the west goal line', view: 'along the pitch' },

  'platform-down': { axis: 'z', at: 0, dir: 1, origin: { x: 0, z: -78 },
    place: 'Front row of the north upper tier, 25 m up', view: 'across the pitch',
    note: 'The same platform as the other two — thrown down at 30° instead of flat or up.' },

  'platform-angle': { axis: 'z', at: 0, dir: 1, origin: { x: 0, z: -78 },
    place: 'Front row of the north upper tier, 25 m up', view: 'across the pitch',
    note: 'Peaks at 45.0 m, three metres under the roof.' },

  // A display jump, which is a real thing that happens in a stadium before a
  // match: the team drops into the centre circle. The cut is across the pitch
  // so the bowl is behind her the whole way down, which is what makes a
  // hundred metres legible as a height rather than as a number.
  parachute: { axis: 'z', at: 0, dir: 1, origin: { x: 0, z: 0 },
    place: 'A display jump into the centre circle', view: 'across the pitch',
    note: 'The roof is at 48 m and the back of the lower tier at 10 m — two heights to judge an opening against.' },

  'time-above': { axis: 'x', at: 0, dir: 1, origin: { x: -52.5, z: 0 },
    place: 'A clearance from the west goal line', view: 'along the pitch',
    note: 'The line snaps to the crossbar at 2.44 m and the roof at 48 m.' },

  // The two experiments used to be drawn as strobe photographs of somewhere
  // else entirely — a shooting range and a beach — on a plate of their own
  // with its own squeezed axes. They are drawn by the side-on view now, so
  // they need somewhere real to happen, measured in the same metres as every
  // other scenario and reached by the same draggable camera.
  //
  // Both go DOWN THE PITCH rather than across it, because both need width:
  // the fired round covers a couple of hundred metres at a service load, and
  // the aimed shot wants room between the launch and whatever it is aimed at.
  bullet: { axis: 'x', at: 0, dir: 1, origin: { x: -52.5, z: 0 },
    place: 'A bench on the west goal line, 1.5 m up', view: 'along the pitch',
    note: 'The far goal line is 105 m away.' },

  monkey: { axis: 'x', at: 0, dir: 1, origin: { x: -52.5, z: 0 },
    place: 'The west goal line, aimed down the pitch', view: 'along the pitch',
    note: 'Drag the target; the angle follows.' },
};

export const siteFor = (id) => SITES[id] || SITES.arc;

/** Flight x → section u, and back. */
export function siteMap(site) {
  const u0 = site.dir * site.origin[site.axis];
  return { u0, toU: (x) => u0 + x, toX: (u) => u - u0 };
}

/** Flight (x, y) → world (x, y, z). The flight plane is the cutting plane. */
export function siteWorld(site) {
  const { axis, dir, origin } = site;
  return (x, y) => (axis === 'x'
    ? { x: origin.x + dir * x, y, z: origin.z }
    : { x: origin.x, y, z: origin.z + dir * x });
}
