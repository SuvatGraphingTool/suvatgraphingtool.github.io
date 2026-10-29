// lanes.js — the stage for two side by side: on one straight road, or on
// parallel railway tracks.
//
// Two pictures of one race, sharing the clock, as for the journey:
//
//   · ABOVE, both speed–time graphs on one pair of axes — the picture every
//     paper in this family draws. A's line in the velocity hue, B's in the
//     second-object stone, both dashed because the motion is along the road
//     (rule 2). The area under each, up to now, is shaded in the displacement
//     hue — A's solid, B's hatched — because that area IS the distance each
//     has gone. Each moment they are level is marked once the clock reaches
//     it: the two areas are equal there, which is what "level" means. Where
//     the lines cross (the same speed, for an instant) is ringed, and the end
//     of a held speed is dropped to the time axis and lettered, as the
//     papers' sketches letter T.
//   · BELOW, the road in two lanes — or two tracks, with the trains on them —
//     A above B, each with its equal-time marks, its velocity arrow and its
//     letter; the start; the line the question names, if it names one (on
//     the tracks, the trackside posts X and Y); the gap between their fronts
//     as a dashed displacement bracket; and each meeting as a line across
//     both with the engine's time.
//
// Everything drawn is read from js/core/overtake.js (rule 4). The view frames
// the whole run and does not pan.

import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, cssVar, withAlpha } from './util.js';
import { T, num } from '../notation.js';
import { drawFigure, train, rails, post, phaseFor, trafficLights, FIGURES } from './figures.js';

const tr = (x, p = 2) => num(x, p, { trim: true });

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'overtake') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const { A, B, events } = f;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const passed = events.filter((e) => e.kind !== 'start' && t >= e.t - 1e-9);

  // ── both speed–time graphs, above
  // clear of the readouts: the four boxes on the left, the clock top right
  // on the tracks the graph gives up a little height to the trackside posts
  const rail = f.where === 'rail', low = rail || f.lights;
  const gx0 = 270, gx1 = w - 60, gy0 = 100, gy1 = Math.round(h * (low ? 0.47 : 0.52));
  const X = (tt) => gx0 + (tt / f.tMax) * (gx1 - gx0);
  const vTop = f.vMax * 1.22;
  const Y = (v) => gy1 - (v / vTop) * (gy1 - gy0);
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx1 + 16, y: gy1 }], { color: P.axis, width: 2 });
  stroke(g, [{ x: gx0, y: gy1 }, { x: gx0, y: gy0 - 16 }], { color: P.axis, width: 2 });
  L.add(T`v [m s^-1]`, gx0 - 10, gy0 - 22, { color: P.muted, align: 'right', pri: 4, size: 14, bg: false });
  L.add(T`t [s]`, gx1 + 20, gy1, { color: P.muted, align: 'left', pri: 4, size: 14, bg: false });
  // the speeds the paper's sketch marks — each one's speeds, held or reached —
  // are numbered on the axis first; the even steps fill in where there is room
  const keyV = [...new Set([A.u, B.u, A.V ?? 0, B.V ?? 0])].filter((v) => v > 1e-9 && v < vTop);
  for (const v of keyV) {
    stroke(g, [{ x: gx0 - 6, y: Y(v) }, { x: gx0, y: Y(v) }], { color: P.muted, width: 1.6 });
    L.add(tr(v, 2), gx0 - 9, Y(v), { color: P.muted, align: 'right', pri: 3, size: 14, bg: false, maxPush: 0 });
  }
  const vstep = niceStep(vTop, 4);
  for (let v = vstep; v < vTop; v += vstep) {
    if (keyV.some((k) => Math.abs(Y(k) - Y(v)) < 16)) continue;
    stroke(g, [{ x: gx0 - 5, y: Y(v) }, { x: gx0, y: Y(v) }], { color: P.faint, width: 1.4 });
    L.add(fmt(v, vstep < 1 ? 1 : 0), gx0 - 9, Y(v), { color: P.faint, align: 'right', pri: 1, size: 14, bg: false, maxPush: 0 });
  }
  L.add('0', gx0 - 9, gy1 + 12, { color: P.muted, align: 'right', pri: 2, size: 13, bg: false, maxPush: 0 });
  // the time axis, numbered, so the times a paper asks about can be read off;
  // the end of each held speed — the paper's T, and its 25 — is numbered
  // first, in its own hue, and an even step too close to one gives way
  const holds = [[A, P.vel], [B, P.second]].map(([p, color]) => ({ p, color, t: p.stages.find((st) => st.kind === 'held')?.t1 }))
    .filter((k) => k.t != null && k.p.tau > 1e-9);
  for (const k of holds) {
    stroke(g, [{ x: X(k.t), y: gy1 }, { x: X(k.t), y: gy1 + 6 }], { color: k.color, width: 1.8 });
    L.add(tr(k.t, 3), X(k.t), gy1 + 14, { color: k.color, align: 'center', pri: 6, size: 13, weight: 700, bg: false, maxPush: 0 });
  }
  // then each one's other moments — setting off, reaching its speed — and the
  // end of the run, where they meet, in the order of importance
  const marks = [...holds.map((k) => X(k.t))];
  const key = [[A, P.vel], [B, P.second]].flatMap(([p, color]) => p.stages.filter((st) => st.kind !== 'held' && isFinite(st.t1) && st.t1 > 1e-9)
    .map((st) => ({ t: st.t1, color }))).concat([{ t: f.tMax, color: P.muted }]);
  for (const k of key) {
    if (k.t > f.tMax + 1e-9 || marks.some((x) => Math.abs(x - X(k.t)) < 34)) continue;
    marks.push(X(k.t));
    stroke(g, [{ x: X(k.t), y: gy1 }, { x: X(k.t), y: gy1 + 6 }], { color: k.color, width: 1.6 });
    L.add(tr(k.t, 3), X(k.t), gy1 + 14, { color: k.color, align: 'center', pri: 5, size: 13, weight: 700, bg: false, maxPush: 0 });
  }
  const tstep = niceStep(f.tMax, 6);
  for (let tt = tstep; tt <= f.tMax + 1e-9; tt += tstep) {
    stroke(g, [{ x: X(tt), y: gy1 }, { x: X(tt), y: gy1 + 5 }], { color: P.faint, width: 1.4 });
    if (marks.some((x) => Math.abs(x - X(tt)) < 34)) continue;
    // fixed under the axis: a tick that would be pushed is dropped instead
    L.add(fmt(tt, tstep < 1 ? 1 : 0), X(tt), gy1 + 14, { color: P.muted, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  const line = (p, t0, t1) => {
    const out = [];
    const cuts = [t0, ...p.stages.flatMap((st) => [st.t0, st.t1]).filter((c) => c > t0 && c < t1), t1].sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const pts = [];
      for (let j = 0; j <= 20; j++) { const tt = cuts[i] + (j / 20) * (cuts[i + 1] - cuts[i]); pts.push({ x: X(tt), y: Y(p.vel(Math.min(tt, cuts[i + 1] - 1e-9))) }); }
      out.push(pts);
    }
    return out;
  };
  // the area under each line so far, in the displacement hue: the distance
  // each has gone. A's filled, B's hatched, so both read where they overlap.
  if (t > 0) {
    const under = (p) => {
      const pts = line(p, 0, t).flat();
      g.beginPath(); g.moveTo(X(0), Y(0));
      for (const q of pts) g.lineTo(q.x, q.y);
      g.lineTo(X(t), Y(0)); g.closePath();
    };
    g.save(); under(A); g.fillStyle = withAlpha(P.disp, 0.16); g.fill(); g.restore();
    g.save(); under(B); g.clip();
    g.strokeStyle = withAlpha(P.disp, 0.55); g.lineWidth = 1.2; g.beginPath();
    for (let x = gx0 - (gy1 - gy0); x < X(t); x += 9) { g.moveTo(x, gy1); g.lineTo(x + (gy1 - gy0), gy0); }
    g.stroke(); g.restore();
    const dist = f.dist(t);
    // inside the graph, over its own shading: what each area is worth so far
    L.add(`area so far, the distance gone:  A ${T`${tr(dist.A, 1)} [m]`},  B (hatched) ${T`${tr(dist.B, 1)} [m]`}`,
      gx0 + 10, gy1 - 16, { color: P.disp, align: 'left', pri: 7, size: 14, weight: 700, maxPush: 0 });
  }
  // a speed held for a while: where it ends, dropped to its number on the
  // time axis, and said in words at the corner (canvas has no subscripts)
  for (const { p, color, t: te } of holds) {
    stroke(g, [{ x: X(te), y: Y(p.u) }, { x: X(te), y: gy1 }], { color, width: 1.4, dash: [3, 4], alpha: 0.8 });
    L.add(`${p.name} ${p.a < 0 ? 'brakes' : 'speeds up'}`, X(te), Y(p.u) - 14, { color, align: 'center', pri: 5, size: 13, weight: 700, maxPush: 20 });
  }
  for (const [p, color] of [[B, P.second], [A, P.vel]]) {
    for (const seg of line(p, 0, f.tMax)) stroke(g, seg, { color, width: 1.6, dash: [6, 4], alpha: 0.35 });
    if (t > 0) for (const seg of line(p, 0, t)) stroke(g, seg, { color, width: 2.8, dash: [6, 4] });
  }
  // each line lettered at its end; two that end at one point share a tag
  // (lifted off the time axis, so the last time on it keeps its number)
  const yEndA = Math.min(Y(A.vel(f.tMax)), gy1 - 14), yEndB = Math.min(Y(B.vel(f.tMax)), gy1 - 14);
  if (Math.abs(yEndA - yEndB) < 18) L.add('A, B', X(f.tMax) + 8, (yEndA + yEndB) / 2, { color: P.ink, align: 'left', pri: 9, size: 15, weight: 700, maxPush: 20 });
  else {
    L.add('B', X(f.tMax) + 8, yEndB, { color: P.second, align: 'left', pri: 8, size: 15, weight: 700, maxPush: 20 });
    L.add('A', X(f.tMax) + 8, yEndA, { color: P.vel, align: 'left', pri: 8, size: 15, weight: 700, maxPush: 20 });
  }
  // under the axis, clear of the readouts in the top corners; moments too
  // close for a label each share one, so neither is lost
  const groups = [];
  for (const e of passed) {
    stroke(g, [{ x: X(e.t), y: gy1 + 8 }, { x: X(e.t), y: gy0 - 4 }], { color: P.mark, width: 1.6, dash: [4, 4] });
    const last = groups[groups.length - 1];
    if (last && X(e.t) - X(last[last.length - 1].t) < 150) last.push(e); else groups.push([e]);
  }
  for (const grp of groups) {
    const ts = grp.map((e) => tr(e.t, 3));
    const word = grp.length === 1 && grp[0].rest ? 'both at rest, level, at' : 'level at';
    const text = ts.length === 1 ? `${word} ${T`t = ${ts[0]} [s]`}`
      : `level at ${T`t = ${ts.slice(0, -1).join(', ')}`} and ${T`${ts[ts.length - 1]} [s]`}`;
    const xm = (X(grp[0].t) + X(grp[grp.length - 1].t)) / 2;
    // at the end of the axis it reads back from its line, not past the edge
    const end = xm > gx1 - 120;
    L.add(text, end ? xm + 6 : xm, gy1 + 36, { color: P.mark, align: end ? 'right' : 'center', pri: 9, size: 14, weight: 700, push: 'down', maxPush: 20 });
  }
  // where the lines cross: the same speed, for an instant
  for (const c of f.crossings || []) {
    if (t < c.t - 1e-9) continue;
    dot(g, X(c.t), Y(c.v), 7, { stroke: P.mark, width: 2.4 });
    L.add(`same speed at ${T`t = ${tr(c.t, 3)} [s]`}`, X(c.t) + 12, Y(c.v) - 18, { color: P.mark, align: 'left', pri: 7, size: 14, weight: 700, maxPush: 40 });
  }
  stroke(g, [{ x: X(t), y: gy1 }, { x: X(t), y: gy0 - 8 }], { color: P.muted, width: 1.6, dash: [5, 5] });
  dot(g, X(t), Y(A.vel(t)), 4.5, { fill: P.surface, stroke: P.vel, width: 2.2 });
  dot(g, X(t), Y(B.vel(t)), 4.5, { fill: P.surface, stroke: P.second, width: 2.2 });

  // ── the road (or the tracks), below: A's lane above B's
  const carPx = rail ? clamp(w * 0.15, 105, 200) : clamp(w * 0.07, 54, 92);
  // each one's figure, drawn at its own size beside a car, and how high its
  // arrows ride: just over its roof (a train of three is long and low)
  const kind = (p) => (rail ? 'train' : FIGURES[f.figs?.[p.name]] ? f.figs[p.name] : 'car');
  const lenOf = (p) => (rail ? carPx : carPx * FIGURES[kind(p)].size / FIGURES.car.size);
  const roofOf = (p) => (rail ? carPx * 0.17 + 8 : FIGURES[kind(p)].top * lenOf(p) / FIGURES[kind(p)].size + 6);
  const roof = Math.max(roofOf(A), roofOf(B));
  const lo = Math.min(0, A.x0, B.x0), hi = Math.max(f.top, 1);
  const sx0 = Math.max(gx0, carPx + 30), sx1 = w - 60;
  const S = (s) => sx0 + ((s - lo) / (hi - lo)) * (sx1 - sx0);
  // the trackside posts and the traffic lights stand above the near lane, so
  // those two settings sit a little lower, clear of the graph's axis
  const yA = Math.round(h * (low ? 0.72 : 0.68)), yB = Math.round(h * (low ? 0.87 : 0.84));
  if (rail) {
    // two parallel tracks, side on: one rails() per track
    for (const y of [yA, yB]) rails(g, 0, w, y + 4, P);
  } else {
    g.save(); g.fillStyle = cssVar('--hover', 'rgba(255,255,255,.06)'); g.fillRect(0, yA - 26, w, yB - yA + 40); g.restore();
    stroke(g, [{ x: 0, y: yA + 6 }, { x: w, y: yA + 6 }], { color: P.axis, width: 1.6 });
    stroke(g, [{ x: 0, y: (yA + yB) / 2 + 2 }, { x: w, y: (yA + yB) / 2 + 2 }], { color: P.faint, width: 1.6, dash: [16, 14] });
    stroke(g, [{ x: 0, y: yB + 6 }, { x: w, y: yB + 6 }], { color: P.axis, width: 1.6 });
  }
  // the start, and the line the question names: on the tracks, the posts X
  // and Y at the side of them, as the papers name them
  // the posts' plates sit over A's track, clear of its arrows and the graph
  const postH = yB + 14 - (yA - roof - 34);
  if (rail) post(g, L, S(0), yB + 14, 'X', P.strong, P, { dashed: true, height: postH });
  else {
    stroke(g, [{ x: S(0), y: yA - 26 }, { x: S(0), y: yB + 14 }], { color: P.ink, width: 2 });
    // the lights at the start line: red until they go, then green
    if (f.lights) trafficLights(g, S(0) - 14, yA - 26, roof + 40, P, { lit: fired && tRaw > 0 ? 'green' : 'red' });
    else L.add('start', S(0), yA - roof - 30, { color: P.muted, align: 'center', pri: 5, size: 14, bg: false });
  }
  if (f.line != null) {
    if (rail) post(g, L, S(f.line), yB + 14, 'Y', P.mark, P, { dashed: true, height: postH });
    else stroke(g, [{ x: S(f.line), y: yA - 30 }, { x: S(f.line), y: yB + 14 }], { color: P.mark, width: 2.4 });
    // on the road, just past the line over the kerb, where nothing stops at it
    L.add(rail ? T`XY = ${tr(f.line)} [m]` : T`${tr(f.line)} [m]`, rail ? S(f.line) - 24 : S(f.line) + 6, rail ? yB + 14 - postH - 12 : yA - 38,
      { color: P.mark, align: rail ? 'right' : 'left', pri: 8, size: 14, weight: 700 });
  }
  // each meeting, across both lanes
  for (const e of passed) {
    stroke(g, [{ x: S(e.x), y: yA - (rail ? 4 : 30) }, { x: S(e.x), y: yB + 14 }], { color: P.mark, width: 1.6, dash: [4, 4] });
  }
  // equal-time marks, each lane its own
  const dt = niceStep(f.tMax, 10);
  for (const [p, y, color] of [[A, yA, P.vel], [B, yB, P.second]]) {
    for (let i = 0; i * dt <= t + 1e-9; i++) {
      const tt = i * dt;
      if (tt < p.t0 - 1e-9) continue;
      dot(g, S(p.pos(tt)), y + 6, 3.6, { fill: color, stroke: P.surface, width: 1.3 });
      if (show.ticks) L.add(T`${num(tt, dt < 1 ? 1 : 0)} [s]`, S(p.pos(tt)), y + 20, { color, align: 'center', pri: 2, size: 13, bg: false, maxPush: 0 });
    }
  }
  // the two of them, their letters, and their velocities
  for (const [p, y, ring, color] of [[A, yA, null, P.vel], [B, yB, P.second, P.second]]) {
    const xf = S(p.pos(t)), Lp = lenOf(p), k = kind(p);
    // wheels (or legs) that turn with the distance gone, and stop when it stops
    const opts = { ring, phase: phaseFor(k, Lp, S(p.pos(t)) - S(p.x0), rail ? { cars: 3 } : {}) };
    if (rail) train(g, xf, y + 4, Lp, P, { ...opts, cars: 3 }); else drawFigure(g, k, xf, y + 4, Lp, P, opts);
    L.add(p.name, xf - Lp - 10, y - 8, { color: P.ink, align: 'right', pri: 9, size: 16, weight: 700 });
    const v = p.vel(t);
    if (show.velocity !== false && v > 1e-6) {
      const len = (v / f.vMax) * clamp(w * 0.1, 50, 120);
      const vy = y - roofOf(p);
      // near the right edge the arrow and its value sit back over the
      // vehicle, the value before it, so neither runs off the canvas
      const edge = xf - Lp * 0.7 + len + 110 > w;
      const ax = edge ? Math.min(xf - Lp * 0.7, w - 16 - len) : xf - Lp * 0.7;
      arrow(g, ax, vy, ax + len, vy, { color: P.velVec, width: 2.6, head: 10 });
      L.add(T`${fmt(v, 2)} [m s^-1]`, edge ? ax - 8 : ax + len + 8, vy, { color: P.vel, align: edge ? 'right' : 'left', pri: 7, size: 14, weight: 700 });
    }
    // a vehicle that has come to rest has no acceleration left to show
    if (show.acceleration && v > 1e-6) {
      const a = p.acc(t);
      if (Math.abs(a) > 1e-9) {
        const len = Math.sign(a) * 36, ay = y - roofOf(p) - 20;
        arrow(g, xf - Lp / 2 - len / 2, ay, xf - Lp / 2 + len / 2, ay, { color: P.acc, width: 2.4, head: 9 });
      }
    }
    void color;
  }
  // the gap between their fronts
  const xa = S(A.pos(t)), xb = S(B.pos(t));
  if (Math.abs(xa - xb) > 12 && !passed.some((e) => Math.abs(e.t - t) < 1e-6)) {
    // under the road, clear of both cars and their arrows
    const by = yB + 26;
    stroke(g, [{ x: Math.min(xa, xb), y: by }, { x: Math.max(xa, xb), y: by }], { color: P.disp, width: 2.4, dash: [7, 5] });
    for (const x of [xa, xb]) stroke(g, [{ x, y: by - 7 }, { x, y: by + 7 }], { color: P.disp, width: 2 });
    L.add(`${A.pos(t) > B.pos(t) ? 'A' : 'B'} ahead by ${T`${fmt(Math.abs(f.gap(t)), 1)} [m]`}`, (xa + xb) / 2, by + 16,
      { color: P.disp, align: 'center', pri: 8, size: 14, weight: 700 });
  }

  L.draw(g, w, h);
  return null;
}
