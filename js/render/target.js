// target.js — the stage for a projectile that has to pass one point.
//
// Side on, one scale both ways, so the angle on the screen is the angle on
// the paper: the ground, the launch (on a stand when it leaves from a height)
// with its angle marked, the thing at the point — a wall, a net, a tree, a
// wall it hits, or a target ring — with its height and its distance as
// dimension lines, and a mark on the ground when the paper has one. The path
// flown is in the path colour; of a question with two answers, the other
// path is drawn faintly beside it, with its angle. Once the ball reaches the
// point, what happened there is said: cleared by how much, or hit how far
// below the top. The velocity, with its components (horizontal dashed,
// vertical solid — rule 2), and the acceleration are on the ball.
//
// Everything drawn is read from js/core/target.js (rule 4).

import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, withAlpha } from './util.js';
import { T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const HUD = 250;              // the readouts' column, top left …
const HUD_H = 290;            // … and how far down it reaches

/** The house's shape, as fractions: the eave above a window sill (of the sill's
    height), and the roof's rise (of the house's width). */
const HOUSE = { eave: 0.45, pitch: 0.45 };
/** A house side on, its wall's outer face at x = edge, standing on the ground
    at Y: with 'window', a window whose sill is at y = sill; with 'roof', the
    roof's eave at y = sill, the house below it. Width w px, back from the edge. */
export function house(g, edge, sill, Y, w, from, P) {
  g.save();
  const eave = from === 'roof' ? sill : sill - (Y - sill) * HOUSE.eave;
  g.fillStyle = withAlpha('#d9cbb5', 0.55); g.strokeStyle = P.strong; g.lineWidth = 1.6;
  g.fillRect(edge - w, eave, w, Y - eave); g.strokeRect(edge - w, eave, w, Y - eave);
  // the roof: a pitched slope from the eave back over the house
  g.fillStyle = withAlpha('#8a4b3c', 0.75);
  g.beginPath(); g.moveTo(edge + 6, eave); g.lineTo(edge - w * 0.5, eave - w * HOUSE.pitch); g.lineTo(edge - w - 6, eave); g.closePath(); g.fill(); g.stroke();
  if (from === 'window') {
    // the window open in the wall, its sill at the launch height
    const ww = Math.min(22, w * 0.3), wh = Math.min(26, (Y - eave) * 0.3);
    g.fillStyle = withAlpha('#9fb6c8', 0.7); g.fillRect(edge - ww, sill - wh, ww, wh); g.strokeRect(edge - ww, sill - wh, ww, wh);
    g.lineWidth = 2.4; g.beginPath(); g.moveTo(edge - ww - 3, sill); g.lineTo(edge + 3, sill); g.stroke();
  }
  // a door on the ground floor
  g.lineWidth = 1.4; g.strokeRect(edge - w * 0.75, Y - Math.min(30, (Y - eave) * 0.35), Math.min(16, w * 0.2), Math.min(30, (Y - eave) * 0.35));
  g.restore();
}
/** A garden fence at x, from the ground at Y up to top: posts and rails, solid boards. */
export function fence(g, x, top, Y, P) {
  g.save(); g.fillStyle = withAlpha('#9a7b55', 0.8); g.strokeStyle = P.strong; g.lineWidth = 1.4;
  const hb = Math.max(0, Y - top - 5); g.fillRect(x - 4, top + 5, 8, hb); g.strokeRect(x - 4, top + 5, 8, hb);
  // the boards' pointed tops reach exactly the fence's height
  g.beginPath(); g.moveTo(x - 4, top + 5); g.lineTo(x, top); g.lineTo(x + 4, top + 5); g.closePath(); g.fill(); g.stroke();
  for (const f of [0.3, 0.7]) { g.beginPath(); g.moveTo(x - 7, top + (Y - top) * f); g.lineTo(x + 7, top + (Y - top) * f); g.stroke(); }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'target') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const F = f.F, O = f.other, Pt = f.P, kind = f.kindOf;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;

  // ── the frame: both paths, the point, the mark; one scale both ways
  const paths = [f.path(160), ...(O ? [f.path(160, O.end, O)] : [])];
  const xs = [0, ...paths.flat().map((p) => p.x)], ys = [0, F.h0, ...paths.flat().map((p) => p.y)];
  // a wall it hits stands above where it hits, whether or not its height was given
  const faceTop = kind === 'face' && Pt ? (Pt.H ?? F.at?.y ?? 0) : null;
  if (Pt) { if (Pt.d != null) xs.push(Pt.d); if (Pt.H != null) ys.push(Pt.H); if (faceTop != null) ys.push(faceTop * 1.5); }
  if (f.flag != null) xs.push(f.flag);
  // a house it is thrown from stands behind the launch: room for it, at the same scale both ways
  const houseM = f.from !== 'stand' && F.h0 > 1e-9 ? Math.max(F.h0 * 0.9, 3) : 0;
  if (houseM) ys.push((f.from === 'roof' ? F.h0 : F.h0 * (1 + HOUSE.eave)) + houseM * HOUSE.pitch);
  const xMax = Math.max(...xs) * 1.06 || 1, yMax = Math.max(...ys, xMax * 0.05) * 1.12;
  // The scene goes beside the readouts or below them, whichever draws it
  // larger; on a narrow screen it takes the whole width. Room on the right
  // for the velocity arrow where it lands, and below for the distances.
  const bottom = h - 64;
  const frames = w < 520 ? [{ left: 20, right: w - 40, top: 64 }]
    : [{ left: HUD + 40, right: w - 100, top: 64 }, { left: 40, right: w - 100, top: Math.min(HUD_H, bottom - 120) }];
  let best = null;
  for (const fr of frames) {
    const kk = Math.min((fr.right - fr.left) / (xMax + houseM), (bottom - fr.top) / yMax);
    if (kk > 0 && (!best || kk > best.k)) best = { ...fr, k: kk };
  }
  if (!best) return null;
  const { left, k } = best;
  const ox = left + houseM * k, oy = bottom;
  const X = (x) => ox + x * k, Y = (y) => oy - y * k;

  // ── the ground, with distances along it
  g.save(); g.fillStyle = withAlpha(P.grid, 0.6); g.fillRect(0, oy, w, h - oy); g.restore();
  stroke(g, [{ x: 0, y: oy }, { x: w, y: oy }], { color: P.axis, width: 2 });
  const step = niceStep(xMax, 7);
  for (let x = step; x <= xMax; x += step) {
    stroke(g, [{ x: X(x), y: oy }, { x: X(x), y: oy + 6 }], { color: P.axis, width: 1.4 });
    L.add(fmt(x, step < 1 ? 1 : 0), X(x), oy + 16, { color: P.faint, align: 'center', pri: 1, size: 13, bg: false, maxPush: 0 });
  }
  L.add(T`x [m]`, w - 14, oy + 16, { color: P.muted, align: 'right', pri: 3, size: 13, bg: false });

  // ── where it leaves from: a stand, a window in a house wall, or a roof's edge
  if (F.h0 > 1e-9 && f.from !== 'stand') house(g, X(0), Y(F.h0), oy, houseM * k, f.from, P);
  if (F.h0 > 1e-9) {
    if (f.from === 'stand') {
      g.save(); g.fillStyle = withAlpha(P.faint, 0.35); g.strokeStyle = P.muted; g.lineWidth = 1.4;
      g.fillRect(X(0) - 16, Y(F.h0), 16, F.h0 * k); g.strokeRect(X(0) - 16, Y(F.h0), 16, F.h0 * k); g.restore();
    }
    L.add(T`${tr(F.h0)} [m]`, X(0) - (houseM ? houseM * k + 10 : 22), (Y(F.h0) + oy) / 2, { color: P.muted, align: 'right', pri: 5, size: 14 });
  }

  // ── the thing at the point
  // a height with no distance: where a wall that high would be cleared, as a
  // band along the ground and the height it has to clear
  if (Pt && Pt.d == null && Pt.H != null && F.span) {
    const a = X(F.span.from), b = X(F.span.to), hy = Y(Pt.H);
    g.save(); g.fillStyle = withAlpha(P.mark, 0.14); g.fillRect(a, hy, b - a, oy - hy); g.restore();
    stroke(g, [{ x: a, y: hy }, { x: b, y: hy }], { color: P.mark, width: 1.4, alpha: 0.8 });
    stroke(g, [{ x: a, y: oy + 8 }, { x: b, y: oy + 8 }], { color: P.mark, width: 2 });
    for (const xx of [a, b]) stroke(g, [{ x: xx, y: oy + 4 }, { x: xx, y: oy + 12 }], { color: P.mark, width: 2 });
    L.add(`a ${T`${tr(Pt.H)} [m]`} ${{ wall: 'wall', fence: 'fence', net: 'net', tree: 'tree' }[kind] || 'wall'} is cleared here`, (a + b) / 2, oy + 24, { color: P.mark, align: 'center', pri: 7, size: 13, weight: 700, maxPush: 20 });
    L.add(T`${tr(F.span.to)} [m]`, b, hy - 14, { color: P.mark, align: 'center', pri: 8, size: 14, weight: 700 });
    if (F.span.from > 1e-9) L.add(T`${tr(F.span.from)} [m]`, a, hy - 14, { color: P.mark, align: 'center', pri: 8, size: 14, weight: 700 });
    L.add(T`${tr(Pt.H)} [m]`, a + 8, (hy + oy) / 2, { color: P.mark, align: 'left', pri: 6, size: 14 });
  }
  if (Pt && Pt.d != null) {
    const px = X(Pt.d), H = Pt.H;
    const top = H != null ? Y(H) : null;
    if (kind === 'wall' && H != null) {
      g.save(); g.fillStyle = withAlpha(P.strong, 0.22); g.strokeStyle = P.strong; g.lineWidth = 1.6;
      g.fillRect(px - 5, top, 10, oy - top); g.strokeRect(px - 5, top, 10, oy - top); g.restore();
    } else if (kind === 'face') {
      const ft = Y(Math.min(yMax * 0.92, faceTop * 1.5));
      g.save(); g.fillStyle = withAlpha(P.strong, 0.22); g.strokeStyle = P.strong; g.lineWidth = 1.6;
      g.fillRect(px, ft, 12, oy - ft); g.strokeRect(px, ft, 12, oy - ft); g.restore();
    } else if (kind === 'fence' && H != null) {
      fence(g, px, top, oy, P);
    } else if (kind === 'net' && H != null) {
      stroke(g, [{ x: px, y: oy }, { x: px, y: top }], { color: P.strong, width: 3 });
      for (let yy = top + 6; yy < oy; yy += 7) stroke(g, [{ x: px - 4, y: yy }, { x: px + 4, y: yy }], { color: P.muted, width: 1 });
      stroke(g, [{ x: px - 5, y: top }, { x: px + 5, y: top }], { color: P.strong, width: 2.4 });
    } else if (kind === 'tree' && H != null) {
      const crown = Math.min(40, (oy - top) * 0.45), trunk = top + crown * 1.6;
      stroke(g, [{ x: px, y: oy }, { x: px, y: Math.min(trunk, oy) }], { color: P.muted, width: 5 });
      g.save(); g.fillStyle = withAlpha(P.mark, 0.18); g.strokeStyle = withAlpha(P.mark, 0.7); g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(px, top); g.lineTo(px + crown * 0.8, top + crown * 1.7); g.lineTo(px - crown * 0.8, top + crown * 1.7); g.closePath();
      g.fill(); g.stroke(); g.restore();
    } else if (H != null) {
      // a target: a ring, crossed
      dot(g, px, top, 9, { stroke: P.strong, width: 2 });
      stroke(g, [{ x: px - 14, y: top }, { x: px + 14, y: top }], { color: P.strong, width: 1.2 });
      stroke(g, [{ x: px, y: top - 14 }, { x: px, y: top + 14 }], { color: P.strong, width: 1.2 });
    }
    // its height, as a dimension line just beyond it
    if (H != null && H > 1e-9) {
      const dx = px + (kind === 'face' ? 24 : 16);
      stroke(g, [{ x: dx, y: oy }, { x: dx, y: top }], { color: P.muted, width: 1.2 });
      for (const yy of [oy, top]) stroke(g, [{ x: dx - 4, y: yy }, { x: dx + 4, y: yy }], { color: P.muted, width: 1.2 });
      L.add(T`${tr(H)} [m]`, dx + 6, (oy + top) / 2, { color: P.muted, align: 'left', pri: 5, size: 14 });
    }
    // its distance, along the ground below
    stroke(g, [{ x: X(0), y: oy + 30 }, { x: px, y: oy + 30 }], { color: P.muted, width: 1.2 });
    for (const xx of [X(0), px]) stroke(g, [{ x: xx, y: oy + 26 }, { x: xx, y: oy + 34 }], { color: P.muted, width: 1.2 });
    L.add(T`${tr(Pt.d)} [m]`, (X(0) + px) / 2, oy + 44, { color: P.muted, align: 'center', pri: 6, size: 14 });
  }
  // ── a mark on the ground
  if (f.flag != null) {
    const fx = X(f.flag);
    stroke(g, [{ x: fx, y: oy }, { x: fx, y: oy - 34 }], { color: P.strong, width: 2 });
    g.save(); g.fillStyle = P.mark; g.beginPath(); g.moveTo(fx, oy - 34); g.lineTo(fx + 16, oy - 28); g.lineTo(fx, oy - 22); g.closePath(); g.fill(); g.restore();
    L.add(T`"mark" ${tr(f.flag)} [m]`, fx, oy - 46, { color: P.mark, align: 'center', pri: 6, size: 13 });
  }

  // ── the other answer's path, faint and solid, with its angle
  if (O) {
    const op = paths[1].map((p) => ({ x: X(p.x), y: Y(p.y) }));
    stroke(g, op, { color: P.vel, width: 1.6, alpha: 0.28 });
    // its angle where it is furthest from the path flown, so it names this one
    const mine = paths[0].map((p) => ({ x: X(p.x), y: Y(p.y) }));
    let at = op[Math.floor(op.length / 2)], far = -1;
    for (const q of op.slice(8, -8)) {
      const dmin = Math.min(...mine.map((m) => Math.hypot(m.x - q.x, m.y - q.y)));
      if (dmin > far) { far = dmin; at = q; }
    }
    L.add(T`theta = ${num(O.theta, 2, { trim: true })}°`, at.x, at.y + 14, { color: P.muted, align: 'center', pri: 4, size: 13 });
  }
  // ── the path flown: all of it faintly, the part flown strongly
  stroke(g, paths[0].map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 1.6, alpha: 0.3 });
  stroke(g, f.path(120, t).map((p) => ({ x: X(p.x), y: Y(p.y) })), { color: P.vel, width: 2.8 });

  // ── its angle at the launch
  const th = F.theta * Math.PI / 180, R = 36;
  stroke(g, [{ x: X(0), y: Y(F.h0) }, { x: X(0) + R + 14, y: Y(F.h0) }], { color: P.muted, width: 1.2 });
  if (Math.abs(F.theta) > 0.5) {
    g.save(); g.strokeStyle = P.muted; g.lineWidth = 1.4; g.beginPath();
    g.arc(X(0), Y(F.h0), R, -Math.max(th, 0), -Math.min(th, 0)); g.stroke(); g.restore();
    L.add(T`${num(F.theta, 2, { trim: true })}°`, X(0) + R + 8, Y(F.h0) - (th > 0 ? 14 : -14), { color: P.strong, align: 'left', pri: 7, size: 14, weight: 700 });
  }

  // ── equal steps of time along the path, labelled when asked
  const dt = niceStep(f.tMax, 10);
  for (let i = 1; i * dt <= t + 1e-9 && i * dt < f.tMax - 1e-9; i++) {
    const q = f.pos(i * dt);
    dot(g, X(q.x), Y(q.y), 3.2, { fill: P.vel, stroke: P.surface, width: 1.2 });
    if (show.ticks) L.add(T`${num(i * dt, dt < 1 ? 1 : 0)} [s]`, X(q.x) + 6, Y(q.y) + 14, { color: P.vel, align: 'left', pri: 2, size: 13, bg: false, maxPush: 0 });
  }
  // ── the top of its path, when asked
  if (show.apex && F.apex && !(F.hits && F.apex.t > F.end)) {
    const ax = X(F.apex.x), ay = Y(F.apex.y);
    stroke(g, [{ x: ax, y: ay }, { x: ax, y: oy }], { color: P.disp, width: 1.4, alpha: 0.7 });
    dot(g, ax, ay, 4.5, { fill: P.card, stroke: P.disp, width: 2 });
    L.add(T`H_max = ${tr(F.apex.y)} [m]`, ax, ay - 16, { color: P.disp, align: 'center', pri: 6, size: 14, weight: 700 });
  }

  // ── at the point, once the ball has got there
  const at = F.at;
  if (Pt && at?.reached && t >= at.t - 1e-9) {
    const px = X(Pt.d), py = Y(at.y);
    if (f.kindOf === 'face' || F.hits) {
      dot(g, px, py, 7, { stroke: P.mark, width: 2.4 });
      const txt = f.kindOf === 'face' ? T`"hits at" ${tr(at.y)} [m], t = ${tr(at.t)} [s]` : T`"hits" ${tr(-at.clear)} [m] "below the top"`;
      L.add(txt, px - 12, py - 16, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
    } else if (at.clear != null && Math.abs(at.clear) > 1e-6 && kind !== 'point') {
      // the gap over the top, as a marker beside it
      const gx = px - 12, gy0 = Y(Pt.H);
      stroke(g, [{ x: gx, y: gy0 }, { x: gx, y: py }], { color: P.mark, width: 2 });
      for (const yy of [gy0, py]) stroke(g, [{ x: gx - 4, y: yy }, { x: gx + 4, y: yy }], { color: P.mark, width: 2 });
      L.add(T`"clears by" ${tr(at.clear)} [m]`, gx - 8, (gy0 + py) / 2 - 10, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
    } else {
      dot(g, px, py, 7, { stroke: P.mark, width: 2.4 });
      const txt = kind === 'point' && at.clear != null && Math.abs(at.clear) > 1e-6
        ? T`${tr(Math.abs(at.clear))} [m] ${at.clear > 0 ? '"above"' : '"below"'}, t = ${tr(at.t)} [s]` : T`t = ${tr(at.t)} [s]`;
      L.add(txt, px - 12, py - 16, { color: P.mark, align: 'right', pri: 9, size: 14, weight: 700 });
    }
  }
  // ── where it lands, once it has
  if (!F.hits && t >= F.tGround - 1e-9) {
    L.add(T`${tr(F.R)} [m]`, X(F.R), oy - 14, { color: P.vel, align: 'center', pri: 7, size: 14, weight: 700 });
    // how far short of the mark, or past it, as a bracket along the ground
    if (f.flag != null && Math.abs(f.flagGap) > 1e-6) {
      const a = X(Math.min(F.R, f.flag)), b = X(Math.max(F.R, f.flag)), yy = oy + 8;
      stroke(g, [{ x: a, y: yy }, { x: b, y: yy }], { color: P.mark, width: 2 });
      for (const xx of [a, b]) stroke(g, [{ x: xx, y: yy - 4 }, { x: xx, y: yy + 4 }], { color: P.mark, width: 2 });
      L.add(T`${tr(Math.abs(f.flagGap))} [m] ${f.flagGap > 0 ? '"short"' : '"past"'}`, (a + b) / 2, oy + 22, { color: P.mark, align: 'center', pri: 7, size: 13, weight: 700 });
    }
  }

  // ── the ball, its velocity and its acceleration
  const r = f.pos(t), v = f.vel(t);
  const bx = X(r.x), by = Y(r.y);
  const vMax = Math.max(...paths[0].map((p) => Math.hypot(F.ux, F.vy(p.t))), 1e-6);
  // one scale for the whole flight, so an arrow's length always says its
  // speed — chosen so that no arrow along the path leaves the canvas
  const room = (c, dv, lo, hi) => (dv > 0 ? (hi - c) / dv : dv < 0 ? (lo - c) / dv : Infinity);
  let vl = clamp(w * 0.09, 50, 110) / vMax;
  for (const q of paths[0]) {
    const vq = { x: F.ux, y: F.vy(q.t) };
    vl = Math.min(vl, room(X(q.x), vq.x, 12, w - 8) * 0.9, room(Y(q.y), -vq.y, 12, h - 12) * 0.9);
  }
  if (show.velocity !== false && f.speed(t) > 1e-6) {
    if (show.components) {
      arrow(g, bx, by, bx + v.x * vl, by, { color: P.velVec, width: 2, head: 9, dash: [5, 4] });
      arrow(g, bx + v.x * vl, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 2, head: 9 });
    }
    arrow(g, bx, by, bx + v.x * vl, by - v.y * vl, { color: P.velVec, width: 3, head: 12 });
    L.add(T`${tr(f.speed(t), 2)} [m s^-1]`, bx + v.x * vl + 10, by - v.y * vl, { color: P.vel, align: 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration) arrow(g, bx, by, bx, by + 40, { color: P.acc, width: 2.4, head: 10 });
  dot(g, bx, by, 7, { fill: P.card, stroke: P.ink, width: 2.4 });

  L.draw(g, w, h);
  return null;
}
