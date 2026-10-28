// graphs.js — displacement, velocity and acceleration against time,
// sharing the animation's time cursor.
//
// Series are told apart by hue (the quantity) and stroke (the component):
// solid is vertical, dashed is horizontal. That keeps the rule consistent with
// the main scene — colour is the quantity, dash is the direction.

import { fitCanvas, palette, stroke, dot, fmt, niceStep, clamp, labels, fade, withAlpha } from './util.js';

const PAD = { l: 52, r: 16, t: 28, b: 34 };

export function drawGraph(canvas, spec) {
  const { ctx, w, h } = fitCanvas(canvas);
  if (w < 60 || h < 60) return;
  const P = palette();
  const L = labels();
  const { series, tMax, t, title, unit, shade } = spec;
  // A graph sits on its card, as the theme's charts do, not on the page.
  ctx.fillStyle = P.card; ctx.fillRect(0, 0, w, h);
  const gw = w - PAD.l - PAD.r, gh = h - PAD.t - PAD.b;

  let lo = Infinity, hi = -Infinity;
  for (const s of series) {
    for (let i = 0; i <= 120; i++) {
      const y = s.fn((i / 120) * tMax);
      if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    }
  }
  if (!isFinite(lo)) { lo = -1; hi = 1; }
  if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  // A graph whose lines sit along its top (an object held still at its
  // greatest height) asks for more room above them, clear of the title.
  const pad = (hi - lo) * (spec.headroom ?? 0.14);
  lo = Math.min(0, lo - pad); hi = Math.max(0, hi + pad);

  const X = (tt) => PAD.l + (tt / (tMax || 1)) * gw;
  const Y = (yy) => PAD.t + gh - ((yy - lo) / (hi - lo)) * gh;

  // gridlines — dotted, both ways, in the theme's chart style
  const stepY = niceStep(hi - lo, 3);
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
    L.add(fmt(y, stepY < 1 ? 1 : 0), PAD.l - 7, Y(y), { color: P.faint, align: 'right', pri: 1, bg: false, size: 15 });
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
    ctx.fillStyle = fade(ctx, s.color, PAD.t, PAD.t + gh); ctx.fill(); ctx.restore();
  }

  for (const s of series) {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const tt = (i / 160) * tMax, y = s.fn(tt);
      if (isFinite(y)) pts.push({ x: X(tt), y: Y(y) });
    }
    stroke(ctx, pts, { color: s.color, width: 2.6, dash: s.dash });
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
    const tt = tMax * 0.06;
    for (const s of tagged) {
      const y = s.fn(tt);
      if (!isFinite(y)) continue;
      const others = series.filter((o) => o !== s).map((o) => o.fn(tt)).filter(isFinite);
      let above = !others.length || y >= Math.max(...others) - 1e-9;
      // ...unless that side is off the plot, into the title or the axis labels
      const inside = (py) => py >= PAD.t + 10 && py <= PAD.t + gh - 10;
      if (!inside(Y(y) + (above ? -14 : 14))) above = !above;
      L.add(s.tag, X(tt) + 4, Y(y) + (above ? -14 : 14), { color: s.color, align: 'left', pri: 7, size: 15, weight: 700, push: above ? 'up' : 'down', maxPush: 20 });
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
