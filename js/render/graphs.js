// graphs.js — displacement, velocity and acceleration against time,
// sharing the animation's time cursor.
//
// Series are told apart by hue (the quantity) and stroke (the component):
// solid is vertical, dashed is horizontal. That keeps the rule consistent with
// the main scene — colour is the quantity, dash is the direction.

import { fitCanvas, palette, stroke, dot, fmt, niceStep, clamp, labels, fade, withAlpha } from './util.js';

const PAD = { l: 52, r: 16, t: 28, b: 34 };

/**
 * The vertical range a graph shows, and its tick step: every series sampled
 * across the run, a little room either side, and zero always in view. Pure,
 * so a test can ask whether a graph will carry enough labels to be read.
 */
export function yScale(series, tMax) {
  let lo = Infinity, hi = -Infinity;
  for (const s of series) {
    for (let i = 0; i <= 120; i++) {
      const y = s.fn((i / 120) * tMax);
      if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    }
  }
  if (!isFinite(lo)) { lo = -1; hi = 1; }
  if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  // The step is chosen from the data, before any padding, so padding never
  // coarsens the scale. Then a little room below, and more above, where the
  // title is: a line along the top of the data stays clear of it.
  const span = Math.max(hi, 0) - Math.min(lo, 0);      // what is shown always includes zero
  const stepY = niceStep(span, 3);
  lo = Math.min(0, lo - span * 0.14); hi = Math.max(0, hi + span * 0.24);
  const ticks = [];
  for (let y = Math.ceil(lo / stepY) * stepY; y <= hi; y += stepY) ticks.push(y);
  return { lo, hi, stepY, ticks };
}

export function drawGraph(canvas, spec) {
  const { ctx, w, h } = fitCanvas(canvas);
  if (w < 60 || h < 60) return;
  const P = palette();
  const L = labels();
  const { series, tMax, t, title, unit, shade } = spec;
  // A graph sits on its card, as the theme's charts do, not on the page.
  ctx.fillStyle = P.card; ctx.fillRect(0, 0, w, h);
  const gw = w - PAD.l - PAD.r, gh = h - PAD.t - PAD.b;

  const { lo, hi, stepY } = yScale(series, tMax);

  const X = (tt) => PAD.l + (tt / (tMax || 1)) * gw;
  const Y = (yy) => PAD.t + gh - ((yy - lo) / (hi - lo)) * gh;

  // gridlines — dotted, both ways, in the theme's chart style
  const stepT0 = niceStep(tMax, 4);
  ctx.save(); ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.beginPath();
  for (let y = Math.ceil(lo / stepY) * stepY; y <= hi; y += stepY) {
    const py = Math.round(Y(y)) + 0.5; ctx.moveTo(PAD.l, py); ctx.lineTo(PAD.l + gw, py);
  }
  for (let tt = stepT0; tt <= tMax + 1e-9; tt += stepT0) {
    const px = Math.round(X(tt)) + 0.5; ctx.moveTo(px, PAD.t); ctx.lineTo(px, PAD.t + gh);
  }
  ctx.stroke(); ctx.restore();
  for (let y = Math.ceil(lo / stepY) * stepY; y <= hi; y += stepY) {
    // clear of the title's box, which starts at the axis: a top tick level
    // with the title must not lose to it
    L.add(fmt(y, stepY < 1 ? 1 : 0), PAD.l - 11, Y(y), { color: P.faint, align: 'right', pri: 1, bg: false, size: 15 });
  }

  const stepT = niceStep(tMax, 4);
  for (let tt = 0; tt <= tMax + 1e-9; tt += stepT) {
    L.add(fmt(tt, stepT < 1 ? 1 : 0), X(tt), PAD.t + gh + 15, { color: P.faint, align: 'center', pri: 1, bg: false, size: 15 });
  }

  // zero line and axes
  stroke(ctx, [{ x: PAD.l, y: Y(0) }, { x: PAD.l + gw, y: Y(0) }], { color: P.axis, width: 2 });
  stroke(ctx, [{ x: PAD.l + .5, y: PAD.t }, { x: PAD.l + .5, y: PAD.t + gh }], { color: P.axis, width: 2 });

  // area under the curve up to the cursor
  if (shade && series[shade.index]) {
    const s = series[shade.index];
    ctx.save(); ctx.beginPath(); ctx.moveTo(X(0), Y(0));
    for (let i = 0; i <= 90; i++) ctx.lineTo(X((i / 90) * t), Y(s.fn((i / 90) * t)));
    ctx.lineTo(X(t), Y(0)); ctx.closePath();
    // in the colour of what the area IS, when the graph says (a displacement
    // under a velocity line), else the line's own
    ctx.fillStyle = fade(ctx, shade.color || s.color, PAD.t, PAD.t + gh); ctx.fill(); ctx.restore();
  }

  for (const s of series) {
    // A series with `breaks` jumps there — an acceleration that changes from
    // one constant to the next — so it is drawn as separate pieces, with no
    // line joining the levels: a step graph has no vertical lines in it.
    const cuts = [0, ...(s.breaks || []).filter((b) => b > 1e-9 && b < tMax - 1e-9), tMax];
    for (let k = 0; k < cuts.length - 1; k++) {
      const a = cuts[k], b = cuts[k + 1], e = (b - a) * 1e-6, pts = [];
      const n = Math.max(2, Math.ceil(160 * (b - a) / (tMax || 1)));
      for (let i = 0; i <= n; i++) {
        const tt = Math.min(b - e, Math.max(a + e, a + (i / n) * (b - a))), y = s.fn(tt);
        if (isFinite(y)) pts.push({ x: X(tt), y: Y(y) });
      }
      stroke(ctx, pts, { color: s.color, width: 2.6, dash: s.dash });
    }
    // round markers at equal steps of time, as the theme's charts carry —
    // lighter on a dashed (horizontal) series, so solid still reads first
    for (let i = 0; i <= 6; i++) {
      const tt = (i / 6) * tMax, y = s.fn(tt);
      if (!isFinite(y)) continue;
      dot(ctx, X(tt), Y(y), 3.4, { fill: s.dash ? withAlpha(s.color, 0.7) : s.color, stroke: P.card, width: 1.6 });
    }
  }

  // A LINE PER OBJECT, when there is more than one, carries its letter
  // beside it, early on — on the side away from the other lines, so the
  // letter is plainly on its own line and never in the axis labels.
  const tagged = series.filter((s) => s.tag);
  if (tagged.length) {
    // A letter sits ON its own line, haloed, at an instant early in the run
    // where no other line comes within reach — so it cannot be read as naming
    // a neighbour, whichever side of it the neighbour is.
    // a label is about 25 px tall: no other line, and no letter already
    // placed, within that of this one
    const placedTags = [];
    const near = (s, tt, py) => series.some((o) => o !== s && isFinite(o.fn(tt)) && Math.abs(Y(o.fn(tt)) - py) < 24)
      || placedTags.some((q) => Math.abs(q.x - X(tt)) < 30 && Math.abs(q.y - py) < 26);
    // clear of the title's row above and the axis labels below, so the
    // label placer never has to push a letter off its line
    const inside = (py) => py >= PAD.t + 16 && py <= PAD.t + gh - 10;
    for (const s of tagged) {
      let spot = null;
      const QS = [0.08, 0.18, 0.3, 0.45, 0.6, 0.75, 0.9];
      for (const q of QS) {
        const tt = q * tMax, y = s.fn(tt);
        if (!isFinite(y)) continue;
        const py = Y(y);
        if (inside(py) && !near(s, tt, py)) { spot = { tt, py }; break; }
      }
      // nowhere fully clear: the instant where it is furthest from everything else
      if (!spot) {
        const room = (tt) => {
          const py = Y(s.fn(tt));
          if (!inside(py)) return -1;
          const ds = [...series.filter((o) => o !== s).map((o) => Math.abs(Y(o.fn(tt)) - py)),
                      ...placedTags.filter((q) => Math.abs(q.x - X(tt)) < 30).map((q) => Math.abs(q.y - py))].filter(isFinite);
          return ds.length ? Math.min(...ds) : 99;
        };
        const tt = QS.map((q) => q * tMax).reduce((b, c) => (room(c) > room(b) ? c : b));
        spot = { tt, py: clamp(Y(s.fn(tt)), PAD.t + 16, PAD.t + gh - 10) };
      }
      placedTags.push({ x: X(spot.tt), y: spot.py });
      L.add(s.tag, X(spot.tt), spot.py, { color: s.color, align: 'center', pri: 7, size: 15, weight: 800, maxPush: 20 });
    }
  }
  if (spec.note) L.add(spec.note, PAD.l + gw - 4, PAD.t + 10, { color: P.muted, align: 'right', pri: 4, size: 14 });
  // EVENTS the engine found — where two lines cross, say — as a ring on the
  // line at that instant, drawn once the cursor has reached it.
  for (const p of spec.points || []) {
    if (!(t >= p.t - 1e-9) || !isFinite(p.y)) continue;
    dot(ctx, X(p.t), Y(p.y), 6.5, { stroke: p.color, width: 2.4 });
    if (p.label) L.add(p.label, X(p.t) - 12, Y(p.y) + 16, { color: p.color, align: 'right', pri: 6, size: 14, weight: 700, maxPush: 20 });
  }

  // time cursor
  const cx = X(clamp(t, 0, tMax));
  stroke(ctx, [{ x: cx, y: PAD.t }, { x: cx, y: PAD.t + gh }], { color: P.muted, width: 1.8, dash: [5, 5] });
  for (const s of series) {
    const y = s.fn(t);
    if (isFinite(y)) dot(ctx, cx, Y(y), 4, { fill: P.surface, stroke: s.color, width: 2.2 });
  }

  L.add(title, PAD.l, 14, { color: P.ink, pri: 9, weight: 600, size: 17 });
  L.add(unit, w - 12, 14, { color: P.faint, align: 'right', pri: 8, bg: false, size: 15 });
  if (shade) L.add(shade.label, PAD.l + gw - 4, PAD.t + 10, { color: P.muted, align: 'right', pri: 5, size: 15 });
  L.draw(ctx, w, h);
}

export function graphSpecs(f, t, P) {
  const tMax = f.tMax;
  // ALONG A ROAD every quantity is horizontal, so every line is dashed and
  // there is one per graph. The velocity–time graph is the one a road
  // question is about: a straight line whose gradient is a, and the area
  // under it — a trapezium — is the distance from A.
  if (f.kind === 'line') {
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t,
        series: [{ label: 'from A', fn: (tt) => f.pos(tt).x, color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
        series: [{ label: 'velocity', fn: (tt) => f.vel(tt).x, color: P.vel, dash: [6, 4] }],
        shade: { index: 0, label: 'area = displacement from A' } },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: [{ label: 'acceleration', fn: () => f.params.a, color: P.acc, dash: [6, 4] }],
        shade: { index: 0, label: 'area = change in velocity' } },
    ];
  }
  return [
    { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t,
      series: [
        { label: 'height',     fn: (tt) => f.pos(tt).y, color: P.disp, dash: null },
        { label: 'horizontal', fn: (tt) => f.pos(tt).x, color: P.disp, dash: [6, 4] },
      ] },
    { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
      series: [
        { label: 'vertical',   fn: (tt) => f.vel(tt).y, color: P.vel, dash: null },
        { label: 'horizontal', fn: () => f.horiz,       color: P.vel, dash: [6, 4] },
      ],
      shade: { index: 0, label: 'area = vertical displacement' } },
    // THE ACCELERATION IS NOT ALWAYS A CONSTANT. For every flight with one
    // acceleration it is −g and the line is flat, which is what it used to
    // assume outright. A parachute descent has three, so the flight is asked
    // what its acceleration is at each instant and the graph draws the step
    // function that comes back — which, next to the v–t graph above, is the
    // whole of what a v–t question is testing.
    { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
      series: [
        { label: 'vertical',   fn: (tt) => (f.accel ? f.accel(tt) : -f.params.g), color: P.acc, dash: null },
        { label: 'horizontal', fn: () => 0,           color: P.acc, dash: [6, 4] },
      ],
      shade: { index: 0, label: 'area = change in vertical velocity' } },
  ];
}
