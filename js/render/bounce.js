// bounce.js — the stage for a ball that hits the ground and bounces.
//
// Side-on and tall, like the vertical line of js/render/column.js: a hard
// court surface with earth under it, a height scale, and — when the ball
// starts above the ground — a wall with a balcony at the height it leaves
// from. The ball is drawn at a size you can see, sitting ON the ground when
// it hits it rather than half sunk into it: the model's point is the bottom
// of the ball, and every height is measured to that.
//
// What the question is about is marked on the stage, from js/core/bounce.js
// and nothing else (rule 4):
//   · the height it starts from, and the greatest height after each bounce
//     once it has risen there, as solid displacement brackets (vertical);
//   · the height a question asks about, as point B, with the engine's time
//     ringed at every instant the ball is there;
//   · each impact as it happens, with the speed it hit at and left at;
//   · the ball's shadow on the ground, which shrinks and fades as it rises,
//     and a squash at the instant it lands. These two are drawing, not
//     physics: the model's impact takes no time and the ball never deforms.
//   · the velocity as a solid arrow in the velocity hue, labelled with its
//     sign in the convention the student chose, which the stage states.
//
// Reusable: `court()` (the ground) and `balcony()` (a wall with a ledge at a
// height) take a canvas and pixel geometry, and know nothing about balls.

import { skyscape } from './scenery.js';
import { fitCanvas, palette, fmt, clamp, labels, stroke, arrow, dot, niceStep, cssVar, ballSprite } from './util.js';
import { T, num } from '../notation.js';
import { sf } from '../core/bounce.js';

const HUD = 250;             // the readouts' column, top left
const LABELS = 170;          // room for the labels right of the marks
const LANE = { arrow: 16, down: 34, up: 50, acc: 66, dim: 128, label: 140 };
const tr = (x, p = 2) => num(x, p, { trim: true });
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

/** Hard, horizontal ground seen edge-on: paving slabs on earth, in the
    stadium's own scene tones, so it reads as a place and not as an axis. */
export function court(g, x0, x1, groundY, bottom, P, pxPerM = 60) {
  g.save();
  // earth under it, fading into the page so what is written below stays legible
  g.fillStyle = cssVar('--earth', '#221A1D');
  for (let y = groundY, n = bottom - groundY; y < bottom; y += 2) {
    g.globalAlpha = 1 - (y - groundY) / n;
    g.fillRect(x0, y, x1 - x0, 2);
  }
  g.globalAlpha = 1;
  // the paving: a slab's depth, jointed every metre or so, flecked
  const band = clamp(pxPerM * 0.1, 7, 12);
  g.fillStyle = cssVar('--concrete', '#3C3237');
  g.fillRect(x0, groundY, x1 - x0, band);
  g.strokeStyle = cssVar('--scene-shadow', 'rgba(0,0,0,.4)'); g.lineWidth = 1;
  const joint = clamp(pxPerM * 1.2, 40, 140);
  g.beginPath();
  for (let x = x0 + joint * 0.37; x < x1; x += joint) { g.moveTo(Math.round(x) + 0.5, groundY + 1); g.lineTo(Math.round(x) + 0.5, groundY + band); }
  g.moveTo(x0, groundY + band + 0.5); g.lineTo(x1, groundY + band + 0.5);
  g.stroke();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = cssVar('--scene-shadow', 'rgba(0,0,0,.4)');
  for (let x = x0; x < x1; x += 6) g.fillRect(x + rnd() * 5, groundY + 2 + rnd() * (band - 4), 1.3, 1.3);
  g.restore();
  stroke(g, [{ x: x0, y: groundY }, { x: x1, y: groundY }], { color: P.axis, width: 2.4 });
}

/** A brick wall rising to a balcony at height yPx, its floor reaching right
    to `tip`, with a railing a metre high and a window to each storey. */
export function balcony(g, xWall0, xWall1, tip, yPx, groundY, pxPerM, P) {
  const rail = clamp(pxPerM * 1, 12, 34);
  const top = yPx - rail;
  g.save();
  g.fillStyle = cssVar('--structure', '#A3939A');
  g.fillRect(xWall0, top, xWall1 - xWall0, groundY - top);
  // courses of brick, in the wall's own darker tone
  g.strokeStyle = cssVar('--structure-dark', '#8E7E85'); g.lineWidth = 1; g.globalAlpha = 0.45;
  const course = clamp(pxPerM * 0.15, 5, 10);
  g.beginPath();
  for (let y = groundY - course, i = 0; y > top; y -= course, i++) {
    g.moveTo(xWall0, Math.round(y) + 0.5); g.lineTo(xWall1, Math.round(y) + 0.5);
    for (let x = xWall0 + (i % 2 ? course : 2 * course); x < xWall1; x += 3 * course) {
      g.moveTo(Math.round(x) + 0.5, y); g.lineTo(Math.round(x) + 0.5, Math.min(y + course, groundY));
    }
  }
  g.stroke();
  g.globalAlpha = 1;
  // a window to each three-metre storey, when a storey is tall enough to see
  const storey = 3 * pxPerM;
  if (storey > 40) {
    const ww = Math.min((xWall1 - xWall0) * 0.42, 1.0 * pxPerM), wh = Math.min(storey * 0.42, 1.3 * pxPerM);
    for (let yb = groundY - storey * 0.3; yb - wh > top + 6; yb -= storey) {
      g.fillStyle = cssVar('--window', '#FEC9A0'); g.globalAlpha = 0.8;
      g.fillRect((xWall0 + xWall1) / 2 - ww / 2, yb - wh, ww, wh);
      g.globalAlpha = 1; g.strokeStyle = cssVar('--structure-dark', '#8E7E85'); g.lineWidth = 2;
      g.strokeRect((xWall0 + xWall1) / 2 - ww / 2, yb - wh, ww, wh);
    }
  }
  g.strokeStyle = cssVar('--structure-dark', '#8E7E85'); g.lineWidth = 1.6;
  g.strokeRect(xWall0, top, xWall1 - xWall0, groundY - top);
  g.restore();
  // the balcony floor, out to the edge the ball leaves from, a brace, a railing
  stroke(g, [{ x: xWall0, y: yPx }, { x: tip, y: yPx }], { color: P.strong, width: 4 });
  stroke(g, [{ x: xWall1, y: Math.min(yPx + 24, groundY) }, { x: xWall1 + (tip - xWall1) * 0.55, y: yPx + 2 }], { color: P.strong, width: 1.8 });
  stroke(g, [{ x: xWall1, y: top }, { x: tip - 16, y: top }], { color: P.strong, width: 2 });
  for (let x = xWall1 + 7; x <= tip - 16; x += 7) stroke(g, [{ x, y: top }, { x, y: yPx }], { color: P.faint, width: 1.2 });
}

/** A displacement bracket up the side: ground to a height, ends capped. */
function bracket(g, x, y0, y1, P) {
  stroke(g, [{ x, y: y0 }, { x, y: y1 }], { color: P.disp, width: 2.4 });
  for (const y of [y0, y1]) stroke(g, [{ x: x - 6, y }, { x: x + 6, y }], { color: P.disp, width: 2 });
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'bounce') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const now = f.at(t);

  // ── the frame: the ground to a little above the highest it gets
  const top = Math.max(f.top, 0.5);
  const groundY = Math.round(h - 78), topY = 52;
  const ky = (groundY - topY) / (top * 1.1);
  const Y = (y) => groundY - y * ky;

  // ── across: scale, wall, the line, the marks and the labels
  const wallW = 92;
  const leftRaw = f.h > 1e-6 ? wallW + 40 : 30;
  const rightRaw = LANE.label + 10;
  const k = clamp((w - HUD - 60 - LABELS) / (leftRaw + rightRaw), 0.55, 1);
  const cx = Math.round(Math.max(HUD + 60 + leftRaw * k, Math.min(w * 0.42, w - LABELS - rightRaw * k)));
  const lane = (n) => cx + LANE[n] * k;
  const rx = Math.max(HUD - 20, cx - leftRaw * k - 46);
  const R = clamp(0.11 * ky, 7, 14);                   // a ball you can see; real size when the frame allows

  skyscape(g, 0, 0, w, groundY, { far: 'skyline', seed: 25 });
  court(g, 0, w, groundY, groundY + 34, P, ky);

  // ── the height scale, on the left
  const step = niceStep(top * 1.1, 6);
  stroke(g, [{ x: rx, y: Y(0) }, { x: rx, y: Y(top * 1.06) }], { color: P.faint, width: 1.4 });
  for (let m = 0; m <= top * 1.06 + 1e-9; m += step) {
    stroke(g, [{ x: rx - 7, y: Y(m) }, { x: rx, y: Y(m) }], { color: P.faint, width: 1.4 });
    L.add(`${num(m, step < 1 ? 1 : 0, { trim: m >= 1e5 })} m`, rx - 12, Y(m), { color: P.muted, align: 'right', pri: 1, bg: false, size: 15 });
    if (show.grid && m > 0) stroke(g, [{ x: rx, y: Y(m) }, { x: w - 20, y: Y(m) }], { color: P.grid, width: 1 });
  }

  // ── where it starts from
  const edge = cx - R - 3;
  if (f.h > 1e-6) {
    const x1 = cx - 28 * k - R, x0 = x1 - wallW * k;
    balcony(g, x0, x1, edge, Y(f.h), groundY, ky, P);
  }
  if (f.h > 1e-6) L.add('A', edge - 12, Y(f.h) - 16, { color: P.ink, align: 'right', pri: 9, size: 16, weight: 700 });

  // ── the line it moves along
  stroke(g, [{ x: cx, y: groundY }, { x: cx, y: topY - 14 }], { color: P.faint, width: 1.2, dash: [4, 6] });

  // ── its height at the start, as a bracket up the side
  const dimX = lane('dim');
  if (f.h > 1e-6) {
    bracket(g, dimX, Y(0), Y(f.h), P);
    stroke(g, [{ x: edge, y: Y(f.h) }, { x: dimX - 8, y: Y(f.h) }], { color: P.disp, width: 1, dash: [2, 4], alpha: 0.6 });
    L.add(T`${tr(f.h)} [m]`, dimX + 12, Y(f.h / 2), { color: P.disp, align: 'left', pri: 8, size: 16, weight: 700 });
  }

  // ── the greatest height of each flight, once it has been there
  const tops = [];
  if (f.top0 && t >= f.top0.t - 1e-9) tops.push({ H: f.top0.H, t: f.top0.t, first: true });
  f.impacts.forEach((x) => {
    if (x.tTop < f.tMax - 1e-9 && t >= x.tTop - 1e-9) tops.push({ H: x.H, t: x.tTop, k: x.k });
  });
  if (show.apex !== false) {
    tops.forEach((q, i) => {
      const yy = Y(q.H), last = i === tops.length - 1;
      stroke(g, [{ x: cx - 18, y: yy }, { x: dimX + 22, y: yy }], { color: P.disp, width: 1.2, dash: [5, 4], alpha: last ? 0.9 : 0.45 });
      // the latest one is bracketed and named; the ones before keep a level line
      // (and only when it stands clear of the paving: a bounce of a few
      // millimetres keeps its level line and is named in the HUD and the ending)
      if (last && Y(0) - yy > 18) {
        const bx = dimX + 26;
        if (q.k) bracket(g, bx + 18, Y(0), yy, P);
        L.add(q.first ? `top ${T`${sf(q.H, { trim: true })} [m]`}` : `rises to ${T`${sf(q.H, { trim: true })} [m]`}`, bx + 32, yy, {
          color: P.disp, align: 'left', pri: last ? 8 : 6, size: last ? 16 : 14, weight: 700, maxPush: 20 });
      }
    });
  }

  // ── B, the height asked about, and every instant it is there
  if (f.y != null) {
    const yy = Y(f.y);
    stroke(g, [{ x: rx, y: yy }, { x: w - 24, y: yy }], { color: P.mark, width: 1.6, dash: [8, 6], alpha: 0.85 });
    L.add(`B, ${T`${tr(f.y)} [m]`} up`, w - 28, yy - 14, { color: P.mark, align: 'right', pri: 9, size: 15, weight: 700 });
    // Every instant it has been there is ringed, in the lane of the way it
    // was going; the latest is named beside its ring, with which way and
    // when, and the earlier ones fade. The whole list is in the working and
    // on the ending card: a stack of them here lost labels to the ground.
    const seen = f.crossings.filter((c) => c.dir !== 'start' && t >= c.t - 1e-9);
    seen.forEach((c, i) => {
      const last = i === seen.length - 1;
      const side = c.dir === 'up' ? lane('up') : lane('down');
      g.save(); g.globalAlpha = last ? 1 : 0.4;
      dot(g, side, yy, 7, { stroke: P.mark, width: 2.4 });
      g.restore();
      if (!last) return;
      const way = c.dir === 'up' ? 'going up' : c.dir === 'down' ? 'coming down' : 'at the top';
      const when = c.after === 0 ? T`t = ${sf(c.t)} [s]` : `${T`${sf(c.since)} [s]`} after the ${ORD[c.after - 1] || `${c.after}th`} impact`;
      const below = yy + 20 < groundY - 12;
      L.add(`${when}, ${way}`, lane('dim') + 14, below ? yy + 18 : yy - 34, { color: P.mark, align: 'left', pri: 9, size: 14, weight: 700 });
    });
  }

  // ── the history: a mark at equal steps of time, the way down in one lane
  // and the way up in the next; earlier flights fainter
  const dt = niceStep(f.tMax, 10);
  const dp = dt >= 1 ? 0 : dt >= 0.1 ? 1 : 2;
  for (let i = 0; i * dt <= t + 1e-9; i++) {
    const tt = i * dt, s = f.at(tt);
    const up = s.vUp > 1e-9;
    const x = up ? lane('up') : lane('down');
    const old = s.flight < now.flight;
    g.save(); g.globalAlpha = old ? 0.4 : 1;
    dot(g, x, Y(s.y), 3.6, { fill: P.vel, stroke: P.surface, width: 1.3 });
    g.restore();
    if (show.ticks && !old) {
      L.add(T`${num(tt, dp)} [s]`, x + (up ? 10 : -10), Y(s.y), { color: P.vel, align: up ? 'left' : 'right', pri: 2, size: 13, bg: false, maxPush: 20 });
    }
  }

  // ── the impacts so far: a burst at the ground, and the latest one's speeds
  const hit = f.impacts.filter((x) => t >= x.t - 1e-9);
  for (const x of hit) {
    // a burst for a moment: a fixed share of the run, so a short run is not all burst
    const age = t - x.t, fresh = clamp(1 - age / clamp(f.tMax * 0.06, 0.02, 0.35), 0, 1);
    if (fresh > 0) {
      for (let i = 0; i < 7; i++) {
        const an = Math.PI + (i / 6) * Math.PI;
        const r0 = R + 4 + (1 - fresh) * 10, r1 = r0 + 8;
        stroke(g, [{ x: cx + Math.cos(an) * r0, y: groundY + Math.sin(an) * r0 * 0.6 },
                   { x: cx + Math.cos(an) * r1, y: groundY + Math.sin(an) * r1 * 0.6 }], { color: P.mark, width: 2, alpha: fresh });
      }
    }
  }
  const latest = hit[hit.length - 1];
  if (latest) {
    const leaves = latest.t < f.tMax - 1e-9;
    const head = `${ORD[latest.k - 1] || `${latest.k}th`} impact, ${T`t = ${sf(latest.t)} [s]`}`;
    const speeds = `hits at ${T`${sf(latest.vIn)} [m s^-1]`}` + (leaves ? `, leaves at ${T`${sf(latest.vOut)} [m s^-1]`}` : '');
    // one line where there is room for it, two on a phone
    if (w >= 520) L.add(`${head}: ${speeds}`, cx - R, groundY + 36, { color: P.ink, align: 'left', pri: 9, size: 14, weight: 700 });
    else {
      L.add(head, 8, groundY + 30, { color: P.ink, align: 'left', pri: 9, size: 14, weight: 700 });
      L.add(speeds, 8, groundY + 48, { color: P.ink, align: 'left', pri: 9, size: 14, weight: 700 });
    }
  }

  // ── the convention, said where the signed numbers are
  const sx = w - 30, sy0 = groundY + 62;
  const dirUp = f.sign > 0;
  arrow(g, sx, dirUp ? sy0 + 9 : sy0 - 9, sx, dirUp ? sy0 - 9 : sy0 + 9, { color: P.strong, width: 2.2, head: 8 });
  L.add(`${dirUp ? 'up' : 'down'} is positive`, sx - 12, sy0, { color: P.strong, align: 'right', pri: 8, size: 14 });
  if (Math.abs(f.g) > 1e-9) {
    L.add(`${T`g = ${tr(f.g)} [m s^-2]`}, downwards`, Math.max(12, rx - 40), groundY + 62,
      { color: show.acceleration ? P.acc : P.muted, align: 'left', pri: 3, size: 14 });
  }

  // ── the ball: its shadow, the ball itself (squashed for an instant as it
  // lands), its velocity and its acceleration
  const yb = Y(now.y);
  const lift = clamp(now.y / top, 0, 1);
  g.save();
  g.globalAlpha = 0.45 * (1 - 0.75 * lift);
  g.fillStyle = cssVar('--ink', '#000');
  g.beginPath(); g.ellipse(cx, groundY + 1.5, R * (1.25 - 0.5 * lift), R * 0.28, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  const near = hit.length ? t - latest.t : Infinity;
  const squash = fired && near < 0.04 && now.y < 0.02 * top ? 1 - near / 0.04 : 0;
  g.save();
  g.translate(cx, yb);
  g.scale(1 + 0.22 * squash, 1 - 0.22 * squash);
  ballSprite(g, 0, -R, R, { fired });
  g.restore();

  if (show.velocity !== false && Math.abs(now.vUp) > 1e-6) {
    const vMax = Math.max(1e-6, ...f.impacts.map((x) => x.vIn), Math.abs(f.u));
    const len = clamp(Math.abs(now.vUp) / vMax * clamp(h * 0.18, 50, 120), 14, 140) * Math.sign(now.vUp);
    // From the ball, the way it is going — but never through the ground: a
    // downward arrow that would reach it is lifted so its tip stops at the
    // paving, still beside the ball.
    const ax = lane('arrow') - 2;
    let y0 = yb - R, y1 = y0 - len;
    if (y1 > groundY - 3) { y0 -= y1 - (groundY - 3); y1 = groundY - 3; }
    arrow(g, ax, y0, ax, y1, { color: P.velVec, width: 3, head: 11 });
    // the label at the arrow's tail end when it points down, its tip when up
    const ly = len > 0 ? y1 - 12 : y0 - 14;
    L.add(T`v = ${fmt(now.v, 2)} [m s^-1]`, ax + 8, ly, { color: P.vel, align: 'left', pri: 7, size: 15, weight: 700 });
  }
  if (show.acceleration && t < f.tMax - 1e-9) {
    const ax = lane('acc');
    arrow(g, ax, yb - R - 16, ax, yb - R + 16, { color: P.acc, width: 2.6, head: 10 });
  }
  L.draw(g, w, h);
  return null;
}

/** A sketch for a card: the ball's height against time, as dots. */
export function sketch(f) {
  const X = (t) => 8 + (t / f.tMax) * 104, Y = (y) => 50 - (y / (f.top * 1.1)) * 42;
  const dots = Array.from({ length: 29 }, (_, i) => {
    const t = (i / 28) * f.tMax;
    return `<circle cx="${X(t).toFixed(1)}" cy="${Y(f.at(t).y).toFixed(1)}" r="2" fill="var(--vel)"/>`;
  }).join('');
  const wall = f.h > 0 ? `<rect x="2" y="${Y(f.h).toFixed(1)}" width="5" height="${(50 - Y(f.h)).toFixed(1)}" fill="var(--border-soft)" stroke="var(--border)" stroke-width="1"/>` : '';
  return `<svg viewBox="0 0 120 60" aria-hidden="true">
    <line x1="2" y1="50.5" x2="118" y2="50.5" stroke="var(--border)" stroke-width="1.6"/>${wall}${dots}
    ${f.impacts.map((x) => `<circle cx="${X(x.t).toFixed(1)}" cy="50.5" r="3.6" fill="none" stroke="var(--mark)" stroke-width="1.4"/>`).join('')}
  </svg>`;
}
