// plot.js — one quantity against time, in a window you can pan and zoom.
//
// WHY THIS IS NOT graphs.js. That file draws the three small graphs in the
// options sidebar, and it draws them by SAMPLING: 160 points of f.fn(t) across
// the whole flight, every time, in a frame that is always the whole flight.
// That is the right answer for a thumbnail of a parabola.
//
// It is the wrong answer for a motion built out of phases of constant
// acceleration. Inside such a phase:
//
//   the acceleration is a CONSTANT, so a–t is a step — two points
//   the velocity is LINEAR in t,  so v–t is a straight line — two points
//   the displacement is QUADRATIC, so s–t is a parabola — and a parabola is
//     exactly what a quadratic Bézier curve is, so three points
//
// None of those needs sampling, and sampling them is a lie of a particular
// kind: it draws a curve through points that happen to be right and leaves
// the student to assume the shape between them was measured. A polyline
// through the phase boundaries IS the velocity–time graph. The step IS the
// acceleration–time graph. Drawing them any other way would be this file
// claiming less than the engine knows.
//
// And the frame is no longer always the whole flight. A canopy does its whole
// job in under a second of a fall lasting twenty, so the window is a window:
// drag to pan, wheel to zoom, and a button to come back out. See the note
// above createPlotView.
//
// NOTHING HERE COMPUTES ANY PHYSICS. The segments are handed in, already
// worked out by an engine in js/core/, and every number printed on an axis is
// one of those. See CLAUDE.md rule 4.

import { fitCanvas, palette, stroke, dot, fmt, niceStep, clamp, labels, fade } from './util.js';

/* The gutters. `l` has to hold a four-character axis number at 13 px with its
   own breathing room; `b` holds one line of the same. They are the same at
   every pane size, which is the point of the 13 px floor: a quarter-size pane
   gives up plot area, never legibility. */
const PAD = { l: 56, r: 18, t: 16, b: 32 };

/* ── the view ────────────────────────────────────────────────────────────
   A window in the plot's own two units: seconds across, and whatever the
   quantity is up. Not pixels, and not a zoom factor — the window is the
   thing, so a pane can say exactly what it is showing and so two panes
   showing the same seconds are genuinely aligned.

   `fit` asks for the whole flight on the next frame; `touched` records that a
   pan or a zoom has happened, which is what dims the pane's own Whole flight
   button. The pair is the same arrangement js/render/scene.js's camera uses,
   deliberately: there is one gesture on this screen and it should have one
   set of words behind it. */
export function createPlotView() {
  return { t0: 0, t1: 1, lo: 0, hi: 1, fit: true, touched: false };
}

/** Frame the whole of it: the bounds the series were built with. */
export function framePlot(v, b) {
  v.t0 = b.t0; v.t1 = b.t1; v.lo = b.lo; v.hi = b.hi;
  v.fit = false; v.touched = false;
}

/** The pixel rectangle the curve lives in, for a canvas of this size. */
function box(w, h) {
  return { x: PAD.l, y: PAD.t, w: Math.max(10, w - PAD.l - PAD.r), h: Math.max(10, h - PAD.t - PAD.b) };
}

/**
 * Drag to pan.
 *
 * In the plot's own units, which is why this takes the canvas size: a drag of
 * forty pixels across is a different number of seconds in a pane showing
 * twenty of them than in one showing one.
 */
export function panPlot(v, dxPx, dyPx, w, h) {
  const r = box(w, h);
  const dt = (v.t1 - v.t0) / r.w, dy = (v.hi - v.lo) / r.h;
  v.t0 -= dxPx * dt; v.t1 -= dxPx * dt;
  v.lo += dyPx * dy; v.hi += dyPx * dy;
  v.touched = true; v.fit = false;
}

/**
 * Wheel to zoom, about the pointer — both axes together.
 *
 * BOTH, and about the pointer, because that is what the gesture means
 * everywhere else on this screen: the jump pane zooms the sky about the
 * pointer and keeps the thing under it still. A plot that zoomed only time
 * would be a second gesture wearing the first one's clothes.
 */
export function zoomPlot(v, k, mxPx, myPx, w, h) {
  const r = box(w, h);
  const ft = clamp((mxPx - r.x) / r.w, 0, 1);
  const fy = clamp(1 - (myPx - r.y) / r.h, 0, 1);
  const at = v.t0 + ft * (v.t1 - v.t0);
  const ay = v.lo + fy * (v.hi - v.lo);
  const spanT = (v.t1 - v.t0) / k, spanY = (v.hi - v.lo) / k;
  v.t0 = at - ft * spanT; v.t1 = v.t0 + spanT;
  v.lo = ay - fy * spanY; v.hi = v.lo + spanY;
  v.touched = true; v.fit = false;
}

/* ── exact segments ──────────────────────────────────────────────────────
   A series is a list of segments, each one of which is exact over its own
   stretch of time. Two kinds are enough for every motion this app models:

     line   from (t0, y0) to (t1, y1) — constant acceleration's v–t, and the
            flats and the risers of a step
     quad   a parabola through (t0, y0) and (t1, y1) with the value at the
            midpoint of the TIME interval given as `ym` — constant
            acceleration's s–t

   The quadratic is drawn as a quadratic Bézier, which is not an approximation
   of a parabola: with the control point's time at the midpoint, the curve's
   own parameter runs linearly in t, and a quadratic Bézier in that
   parameterisation is a parabola. The control value falls out of wanting the
   curve to pass through ym at the halfway point:

     B(½) = (y0 + 2c + y1)/4 = ym   ⇒   c = 2 ym − (y0 + y1)/2

   so three numbers from the engine draw the exact curve. */
export const line = (t0, y0, t1, y1) => ({ kind: 'line', t0, t1, y0, y1 });
export const quad = (t0, y0, tm, ym, t1, y1) =>
  ({ kind: 'quad', t0, t1, y0, y1, c: 2 * ym - (y0 + y1) / 2 });

/** The y of a segment at one instant — used for the cursor's own dot. */
function atSeg(s, t) {
  const l = (t - s.t0) / Math.max(1e-12, s.t1 - s.t0);
  if (s.kind === 'line') return s.y0 + l * (s.y1 - s.y0);
  const m = 1 - l;
  return m * m * s.y0 + 2 * l * m * s.c + l * l * s.y1;
}

/** The value of a whole series at one instant, clamped to its ends. */
export function valueAt(segs, t) {
  if (!segs.length) return NaN;
  if (t <= segs[0].t0) return segs[0].y0;
  for (const s of segs) if (t <= s.t1 + 1e-12) return atSeg(s, t);
  return segs[segs.length - 1].y1;
}

/**
 * A segment cut short at `t`, exactly.
 *
 * De Casteljau on the quadratic, so the shaded area under a curve stops where
 * the time cursor does without the boundary becoming a chord. The straight
 * kind needs no such care.
 */
function cut(s, t) {
  if (t >= s.t1) return s;
  const l = clamp((t - s.t0) / Math.max(1e-12, s.t1 - s.t0), 0, 1);
  if (s.kind === 'line') return { ...s, t1: t, y1: s.y0 + l * (s.y1 - s.y0) };
  const a = s.y0 + l * (s.c - s.y0);
  const b = s.c + l * (s.y1 - s.c);
  return { ...s, t1: t, c: a, y1: a + l * (b - a) };
}

/** Lay one series onto a path, in pixels. Nothing is stroked or filled here. */
function trace(ctx, segs, X, Y, tEnd = Infinity) {
  let open = false;
  for (const raw of segs) {
    if (raw.t0 > tEnd) break;
    const s = cut(raw, tEnd);
    if (!open) { ctx.moveTo(X(s.t0), Y(s.y0)); open = true; }
    else ctx.lineTo(X(s.t0), Y(s.y0));
    if (s.kind === 'line') ctx.lineTo(X(s.t1), Y(s.y1));
    else ctx.quadraticCurveTo(X((s.t0 + s.t1) / 2), Y(s.c), X(s.t1), Y(s.y1));
  }
  return open;
}

/**
 * Draw one plot.
 *
 * @param spec  series, bounds, the phase boundaries worth ruling, the cursor's
 *              instant, and — before the clock has started — `pre`, which
 *              draws the axes and nothing else. See the note in js/render/
 *              drop.js about why a pre-roll may not put numbers on a graph.
 */
export function drawPlot(canvas, view, spec) {
  const { ctx, w, h } = fitCanvas(canvas);
  if (w < 80 || h < 70) return;
  const P = palette();
  const L = labels();
  const r = box(w, h);
  if (view.fit) framePlot(view, spec.bounds);

  const spanT = Math.max(1e-9, view.t1 - view.t0);
  const spanY = Math.max(1e-9, view.hi - view.lo);
  const X = (t) => r.x + ((t - view.t0) / spanT) * r.w;
  const Y = (y) => r.y + r.h - ((y - view.lo) / spanY) * r.h;

  /* gridlines, in the units of whatever window is on screen — so zooming in
     on the canopy's second gives you a finer scale to read it off, which is
     the whole reason the window moves */
  const stepY = niceStep(spanY, 4), stepT = niceStep(spanT, 4);
  const dpY = stepY < 1 ? (stepY < 0.1 ? 2 : 1) : 0;
  const dpT = stepT < 1 ? (stepT < 0.1 ? 2 : 1) : 0;
  ctx.save(); ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.beginPath();
  for (let y = Math.ceil(view.lo / stepY) * stepY; y <= view.hi; y += stepY) {
    const py = Math.round(Y(y)) + 0.5;
    ctx.moveTo(r.x, py); ctx.lineTo(r.x + r.w, py);
  }
  for (let t = Math.ceil(view.t0 / stepT) * stepT; t <= view.t1; t += stepT) {
    const px = Math.round(X(t)) + 0.5;
    ctx.moveTo(px, r.y); ctx.lineTo(px, r.y + r.h);
  }
  ctx.stroke(); ctx.restore();

  for (let y = Math.ceil(view.lo / stepY) * stepY; y <= view.hi; y += stepY) {
    L.add(fmt(y, dpY), r.x - 8, Y(y), { color: P.faint, align: 'right', pri: 2, bg: false, size: 13 });
  }
  for (let t = Math.ceil(view.t0 / stepT) * stepT; t <= view.t1; t += stepT) {
    L.add(fmt(t, dpT), X(t), r.y + r.h + 15, { color: P.faint, align: 'center', pri: 2, bg: false, size: 13 });
  }

  // the two axes, and zero if zero is on screen
  if (view.lo < 0 && view.hi > 0) {
    stroke(ctx, [{ x: r.x, y: Y(0) }, { x: r.x + r.w, y: Y(0) }], { color: P.axis, width: 2 });
  }
  stroke(ctx, [{ x: r.x, y: r.y + r.h + .5 }, { x: r.x + r.w, y: r.y + r.h + .5 }], { color: P.axis, width: 2 });
  stroke(ctx, [{ x: r.x + .5, y: r.y }, { x: r.x + .5, y: r.y + r.h }], { color: P.axis, width: 2 });
  L.add('t / s', r.x + r.w, r.y + r.h + 15, { color: P.faint, align: 'right', pri: 1, bg: false, size: 13 });

  /* THE CLOCK HAS NOT STARTED, so there is nothing to draw and the pane says
     so in words rather than drawing a flat line at zero — a flat line is a
     claim about a motion, and no motion has happened yet. */
  if (spec.pre) {
    L.add(spec.pre, r.x + r.w / 2, r.y + r.h / 2,
          { color: P.muted, align: 'center', pri: 9, size: 13 });
    L.draw(ctx, w, h);
    return;
  }

  // Everything from here is inside the plot rectangle: zoomed in, a curve
  // leaves the frame, and it may not cross the axis numbers on its way out.
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();

  // the phase boundaries, because WHICH stretch you are looking at is the
  // whole subject of a motion that has more than one
  for (const b of spec.rules || []) {
    if (b.t < view.t0 || b.t > view.t1) continue;
    stroke(ctx, [{ x: X(b.t), y: r.y }, { x: X(b.t), y: r.y + r.h }],
           { color: P.faint, width: 1.4, dash: [4, 4], alpha: 0.75 });
  }

  /* the area under the first series, up to the cursor. On a v–t graph that
     area is the distance travelled, which is half of what the graph is for —
     so it is shaded, and the figure quoted beside it is the engine's own
     rather than one measured off the picture. */
  const main = spec.series[0];
  if (spec.shade && main && spec.t > 1e-9) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(X(main.segs[0].t0), Y(0));
    trace(ctx, main.segs, X, Y, spec.t);
    ctx.lineTo(X(Math.min(spec.t, main.segs[main.segs.length - 1].t1)), Y(0));
    ctx.closePath();
    ctx.fillStyle = fade(ctx, P[main.hue], r.y, r.y + r.h); ctx.fill();
    ctx.restore();
  }

  for (const s of spec.series) {
    ctx.save();
    ctx.beginPath();
    if (trace(ctx, s.segs, X, Y)) {
      ctx.strokeStyle = P[s.hue]; ctx.lineWidth = 2.8;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.setLineDash(s.dash || []);
      ctx.stroke();
    }
    ctx.restore();
  }

  // the time cursor, shared with every other pane and with the scrub bar
  const cx = X(spec.t);
  if (spec.t >= view.t0 && spec.t <= view.t1) {
    stroke(ctx, [{ x: cx, y: r.y }, { x: cx, y: r.y + r.h }], { color: P.muted, width: 1.6, dash: [5, 5] });
  }
  ctx.restore();

  for (const s of spec.series) {
    const y = valueAt(s.segs, spec.t);
    if (!isFinite(y)) continue;
    if (spec.t < view.t0 || spec.t > view.t1) continue;
    if (y < view.lo || y > view.hi) continue;
    dot(ctx, cx, Y(y), 4.5, { fill: P.surface, stroke: P[s.hue], width: 2.4 });
  }

  /* THE NUMBER ON THE CURSOR, which is the one a student is actually reading
     off. It comes from the engine through valueAt on an exact segment, so it
     is the same figure the working panel would print for this instant. */
  const now = main ? valueAt(main.segs, spec.t) : NaN;
  if (isFinite(now) && spec.t >= view.t0 && spec.t <= view.t1) {
    L.add(`${fmt(now, 2)}${spec.tick ? ` ${spec.tick}` : ''}`,
          clamp(cx + 10, r.x + 4, r.x + r.w - 4), clamp(Y(now) - 16, r.y + 10, r.y + r.h - 10),
          { color: P[main.hue], pri: 10, size: 15, weight: 700 });
  }
  if (spec.shade && spec.shadeSay && spec.t > 1e-9) {
    L.add(spec.shadeSay, r.x + r.w - 6, r.y + 12,
          { color: P.muted, align: 'right', pri: 4, size: 13 });
  }
  for (const b of spec.rules || []) {
    if (b.t < view.t0 || b.t > view.t1 || !b.name) continue;
    L.add(b.name, X(b.t) + 5, r.y + r.h - 10, { color: P.faint, pri: 3, size: 13, maxPush: 40 });
  }
  L.draw(ctx, w, h);
}
