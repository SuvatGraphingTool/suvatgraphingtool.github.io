// drop.js — the parachute drop's four panes: a sky, and three exact graphs.
//
// This is the whole flight view for ONE scenario. Every other situation in the
// app is an object thrown about a football stadium, and js/render/scene.js is
// the right picture of that: a place, at a scale you can judge a height
// against, with the arc standing in it. A parachute drop is not that. It
// happens a hundred metres up, it has no horizontal part at all, and the
// stadium it was being drawn in contributed a goal, a crowd and a metre grid
// to a question that is about none of them.
//
// WHAT THE FOUR PANES ARE FOR. A parachutist is set as an exam question
// because the acceleration is not one number, and the three graphs are where
// that is visible rather than inferred:
//
//   the jump      what is happening, in metres of sky
//   v–t           rising, then falling hard, then flat — and the area under
//                 it is the height she fell
//   s–t           height above the ground: a steepening curve, a knee where
//                 the canopy opens, then a straight ramp to zero
//   a–t           the step. g down, the canopy up, then nothing — the one
//                 pane where "a is not one number" is the whole picture
//                 rather than a slope you have to read off another graph
//
// THE GRAPHS ARE EXACT, NOT SAMPLED. Inside a phase the acceleration is
// constant, so v is linear, s is a parabola and a is a constant. The segments
// below say exactly that and js/render/plot.js draws exactly that — a
// polyline through the phase boundaries IS the velocity–time graph. See the
// long note at the top of that file.
//
// DOWNWARDS IS POSITIVE on all three, which is the convention
// js/core/descent.js chose and states, the one the ending card's table is in,
// and the one a student is taught to pick for a drop. So free fall is +g, the
// canopy is a negative acceleration, and every speed on the v–t graph is a
// positive number. Each pane's header says so.
//
// NOTHING HERE COMPUTES ANY PHYSICS. Every number drawn or printed comes off
// the engine's phases, its at(), pos(), speed() and accel(). CLAUDE.md rule 4.

import { fitCanvas, palette, stroke, arrow, parachutist, fmt, clamp, labels, cssVar } from './util.js';
import { line, quad, createPlotView, panPlot, zoomPlot, drawPlot } from './plot.js';
import { D } from '../world/dims.js';
import { M, T, num } from '../notation.js';

/* ── the aircraft ───────────────────────────────────────────────────────
   In metres, and declared HERE rather than in js/world/dims.js, because that
   sheet is the stadium and nothing outside it — see the note at the head of
   it. A light jump aircraft is about twelve metres long with a sixteen metre
   span, and it is drawn at that size like everything else in this file, so it
   is honestly about six times the jumper's height.

   It is SCENERY. Its speed is not a number in this model and the jumper
   leaves from rest: the engine is one-dimensional and the ending card says
   so out loud. Nothing below is computed from these figures. */
const PLANE = { len: 12, span: 16, body: 1.6, tail: 2.2 };

/* ── the pre-roll ───────────────────────────────────────────────────────
   Seven beats were asked for, and three of them happen before the clock: the
   aircraft crosses the sky, the door opens, and she leaves. t = 0 is the
   instant of release, so none of that can be inside t.

   IT IS THEATRE AND IT SAYS SO. No numbers are drawn during it, no readout
   moves, and the three graph panes hold at zero with nothing on them — a flat
   line at zero would be a claim about a motion that has not happened. The one
   piece of text on screen names it as the pre-roll. CLAUDE.md rule 4 is about
   the engine being the only thing that calculates, and the cheapest way to
   break it is to let a piece of staging look like a measurement.

   The aircraft keeps a CONSTANT SPEED the whole way across, including while
   the door opens. An aeroplane that stops in mid-air to let a door slide back
   is the one thing in this sequence that would be visibly untrue.

   `exit` is the fraction of the pre-roll at which the door passes over the
   release point. She leaves then, the aircraft carries on, and she stays
   exactly where she was left until the clock starts — which is the picture
   agreeing with the engine: at t = 0 she is at rest at the height she jumped
   from. */
export const PRE = { total: 2.6, open0: 0.28, open1: 0.46, exit: 0.5 };

/**
 * How far off the release point the aircraft runs, in metres of sky.
 *
 * FROM THE FRAME, not from the jump. The beat asked for is the aircraft
 * CROSSING the sky, and anything short of the frame's own half-width has it
 * appearing in mid-air a third of the way in instead. A figure in metres
 * cannot do it: the frame is fitted to the height of the drop, so how many
 * metres of sky are beside her depends on how wide the pane happens to be —
 * three hundred of them in a maximized pane, twice that in a quarter-size
 * one. So the run is the half-width plus an aircraft's length, and she is
 * always entered from just outside whatever is on screen.
 *
 * It is allowed to depend on the view because it is SCENERY. Nothing in the
 * model knows the aircraft exists, let alone how fast it was going — the
 * ending card says so — so there is no quantity here for a changing frame to
 * make dishonest.
 */
const run = (w, scale) => Math.max(5 * PLANE.len, (w / 2) / Math.max(1e-6, scale) + PLANE.len);

/* ── and then it follows her down ───────────────────────────────────────
   It used to fly off the right-hand edge and be gone by the time the clock
   started, which left the top of the pane empty for the whole of a fall and
   made the drop look like it had come from nowhere. A real jump aircraft does
   not vanish either: it flies on, turns, and descends — it has to get down
   and land, usually well before the jumper does.

   So it stays in the picture, drifting out to the side and losing height, and
   three things keep it unmistakably SCENERY rather than a second object with a
   second motion worth reading:

     it goes OUT, to the far side of the pane, while she falls down the middle
     it SINKS far less than she falls, which is what a glide looks like
     it FADES as it goes, so it reads as receding rather than as a subject

   None of it is computed. The aircraft is not in the model — the engine is
   one-dimensional and does not know an aeroplane exists, let alone how fast it
   was flying or how fast it comes down — and the pane's own sentence and the
   ending card's list of what is not modelled both say so. What is drawn here
   is a fraction of the frame and a fraction of the height, never a speed. */
const HOLD = 0.34;      // where it has got to by the time the clock starts
/* AWAY IS SHORT OF THE EDGE ON PURPOSE. `run` is the frame's own half-width
   plus an aircraft's length, so anything near 1 puts the aeroplane on the rim
   with its nose already clipped — and the whole point of keeping it is that it
   stays in the picture while she falls. This holds it inside the frame with
   room to spare at every layout. */
const AWAY = 0.72;      // and where it has drifted by the landing
const SINK = 0.58;      // the share of her height it loses on the way down
const TILT = 0.1;       // nose down through the descent, in radians

/**
 * Where the aircraft is, how far its door has slid, and how solid it looks.
 *
 * One function for the whole sequence, so the run-in, the drop and the descent
 * cannot disagree at the joins: the pre-roll hands over at exactly HOLD and at
 * exactly her jump height, which is where the fall picks it up.
 *
 * @param pre  seconds into the staging, or null once the clock is running
 */
export function planePose(pre, t, tMax, h, R) {
  if (pre != null) {
    const s = clamp(pre / PRE.total, 0, 1);
    return {
      // in to the release point, then on past it, level the whole way
      x: s <= PRE.exit
        ? (-1 + s / PRE.exit) * R
        : (HOLD * (s - PRE.exit)) / (1 - PRE.exit) * R,
      y: h,
      open: clamp((s - PRE.open0) / (PRE.open1 - PRE.open0), 0, 1),
      alpha: 1, tilt: 0,
    };
  }
  const q = clamp(tMax > 0 ? t / tMax : 0, 0, 1);
  // Most of the going happens early, because it is flying and she is not yet.
  const out = 1 - (1 - q) ** 2;
  /* THE SINK EASES IN, AND IT HAS TO. She leaves from rest, so for the first
     second of the fall she is barely moving — and an aeroplane losing height
     at a steady rate from the same instant passes BELOW her and sits there,
     which is both wrong to look at and the one thing in this picture that
     could be read as a second object outrunning the first. Squaring the
     progress starts the descent almost flat and is also what the real thing
     looks like: it flies on level, turns, and then comes down. Her own fall is
     ½gt², so a sink in t² with this coefficient is slower than hers at every
     instant rather than merely at the end — test/scenarios.test.mjs checks it
     over the whole flight. */
  return {
    x: (HOLD + (AWAY - HOLD) * out) * R,
    y: h * (1 - SINK * q * q),
    open: 1,
    alpha: 1 - 0.52 * q,
    tilt: TILT,
  };
}

/* ── how big she is drawn ───────────────────────────────────────────────
   AT HER TRUE SIZE SHE IS A SMUDGE, and so is the canopy, which is the one
   part of this pane that has to be watched happening. A 1.8 m person in a
   quarter-size pane holding a hundred and forty metres is three pixels tall
   and her 7 m canopy eleven across — and since parachutist floors the canopy
   at seven pixels anyway, the inflation that the whole middle phase is about
   grew from seven pixels to eleven and was invisible.

   So the sprite gets a scale of its own, floored against the PANE's height
   rather than against a fixed number of pixels, so she is the same share of a
   quarter-size pane as of a maximized one. It only ever enlarges: zoom in far
   enough and her true size takes over again.

   The person-to-canopy RATIO is untouched, because that ratio is most of why
   the picture reads as a parachute at all — she is still honestly about a
   quarter of the canopy's width. The same decision ballSprite makes for a
   football that is a pixel across, and the ending card says the canopy is
   drawn at a size you can see rather than at the size it is. */
const spriteScale = (scale, hp) =>
  Math.max(scale, Math.max(10, hp * 0.05) / D.prop.person.h);

/* ── the view: metres of sky, panned and zoomed ─────────────────────────
   The same three numbers js/render/scene.js's camera keeps, and the same two
   flags, so the gesture on this pane and the gesture on a graph pane are one
   gesture with one set of words behind it. */
export function createMapView() {
  return { cx: 0, cy: 0, scale: 4, fit: true, touched: false };
}

/* How much of the pane is margin. The flight has to clear the pane's own
   header and the ground label at the bottom of it. */
const MARG = 30;

/**
 * Frame the whole drop: the ground, the height she jumped from, and no more.
 *
 * The width is NOT fitted to the aircraft's run-in. The run-in is scenery and
 * it is allowed to start off-frame; fitting to it would shrink the one thing
 * the pane is for — a hundred metres of fall — to make room for an aeroplane
 * that has already gone. What the width does get is a floor, so that a short,
 * wide pane cannot blow the jumper up to fill it.
 */
export function frameMap(v, h, w, hp) {
  const tall = (hp - MARG * 2) / Math.max(1e-6, h * 1.08);
  const wide = (w - MARG * 2) / Math.max(1e-6, Math.max(3 * D.prop.canopy.w, h * 0.3));
  v.scale = Math.max(1e-4, Math.min(tall, wide));
  v.cx = 0;
  v.cy = h / 2;
  v.fit = false; v.touched = false;
}

export function panMap(v, dxPx, dyPx) {
  v.cx -= dxPx / v.scale;
  v.cy += dyPx / v.scale;
  v.touched = true; v.fit = false;
}

export function zoomMap(v, k, mxPx, myPx, w, hp) {
  // About the pointer, so whatever is under it stays under it.
  const ax = v.cx + (mxPx - w / 2) / v.scale;
  const ay = v.cy - (myPx - hp / 2) / v.scale;
  v.scale = clamp(v.scale * k, 0.02, 400);
  v.cx = ax - (mxPx - w / 2) / v.scale;
  v.cy = ay + (myPx - hp / 2) / v.scale;
  v.touched = true; v.fit = false;
}


/* ── the two kinds of view, as adapters ─────────────────────────────────
   js/render/panes.js knows nothing about metres or seconds; it knows that a
   pane has a view, that a drag pans it and a wheel zooms it. These are the
   two answers this scenario needs, and a scenario moved onto the window later
   would bring its own. */
export const MAP_NAV = { create: createMapView, pan: panMap, zoom: zoomMap };
export const PLOT_NAV = {
  create: createPlotView,
  pan: (v, dx, dy, w, h) => panPlot(v, dx, dy, w, h),
  zoom: (v, k, mx, my, w, h) => zoomPlot(v, k, mx, my, w, h),
};

/* ══ the four panes, as data ═══════════════════════════════════════════
   Pure: no canvas, no DOM, no document. The window in js/render/panes.js
   builds its chrome from this, test/notation.test.mjs sweeps every string in
   it, and the three plot panes hand their `series` straight to
   js/render/plot.js.

   One number appears in a title — the height of the jump, in the jump pane's
   own corner — and it is the engine's own `params.h`. */

/** A quantity's unit, set as a unit rather than typed as one. See notation.js. */
const U = { v: T`[m s^-1]`, s: T`[m]`, a: T`[m s^-2]` };

export function descentPanes(f) {
  const ph = f.phases;
  const h = f.params.h;
  const tMax = f.tMax;

  /* The phase boundaries, which is WHICH stretch you are looking at — the
     whole subject of a motion that has more than one. Named from the engine's
     own phase names, so a descent cut short by the ground is labelled by what
     the engine actually found rather than by what was expected. */
  const rules = ph.slice(0, -1).map((p, i) => ({ t: p.t0 + p.t, name: ph[i + 1].name }));

  /* ── v–t ────────────────────────────────────────────────────────────
     One straight line per phase, from the phase's own u to its own v. Not an
     approximation of the curve: constant acceleration means the speed is
     linear in the time, so this is the curve. */
  const vt = ph.map((p) => line(p.t0, p.u, p.t0 + p.t, p.v));

  /* ── s–t ────────────────────────────────────────────────────────────
     Height above the ground, as one parabola per phase. The three numbers a
     quadratic needs are the two ends and the value at the midpoint of the
     TIME interval, all of them from the phase's own u and a — see `quad` in
     js/render/plot.js for why that draws the exact parabola and not a
     flattering curve through the right endpoints. */
  const st = ph.map((p) => {
    const half = p.t / 2;
    const mid = p.y0 - (p.u * half + 0.5 * p.a * half * half);
    return quad(p.t0, p.y0, p.t0 + half, mid, p.t0 + p.t, p.y1);
  });

  /* ── a–t ────────────────────────────────────────────────────────────
     A flat per phase. The vertical risers between them are drawn by the
     plotter joining one flat to the next, and that is the honest picture: the
     model's acceleration changes from one constant to another with nothing in
     between, which is a discontinuity and not a ramp. The ending card is
     equally plain that a real canopy takes a few tenths of a second over it. */
  const at = ph.map((p) => line(p.t0, p.a, p.t0 + p.t, p.a));

  const vHi = Math.max(...ph.map((p) => Math.max(p.u, p.v)));
  const aLo = Math.min(0, ...ph.map((p) => p.a));
  const aHi = Math.max(0, ...ph.map((p) => p.a));
  const aPad = Math.max(1, (aHi - aLo) * 0.16);

  const panes = [
    { id: 'jump', kind: 'map', nav: MAP_NAV,
      draw: (canvas, view, o) => drawJump(canvas, view, o),
      title: 'The jump', tab: 'The jump', aria: 'The jump, in metres of sky',
      corner: `0–${num(h, 0)} ${U.s}`,
      say: 'The aircraft, the door and the aircraft\u2019s own way down after the drop '
        + 'are all scenery. She leaves from rest and falls straight down; the model has '
        + 'no sideways motion in it at all.' },

    { id: 'vt', kind: 'plot', nav: PLOT_NAV,
      title: 'Velocity – time', tab: `${M`v`}–${M`t`}`, aria: 'Velocity against time',
      corner: `${U.v} · downwards positive`,
      say: 'Straight lines, because the acceleration is constant inside each phase. '
        + 'The area under it is how far she has fallen.',
      unit: U.v,
      bounds: { t0: 0, t1: tMax, lo: -vHi * 0.07, hi: vHi * 1.12 },
      series: [{ hue: 'vel', dash: null, segs: vt }],
      rules, shade: true,
      fallen: (t) => h - f.pos(t).y },

    { id: 'st', kind: 'plot', nav: PLOT_NAV,
      title: 'Height – time', tab: `${M`s`}–${M`t`}`, aria: 'Height against time',
      corner: `${U.s} above the ground`,
      say: 'Steepest in free fall, a knee where the canopy opens, then a straight '
        + 'ramp down at constant speed.',
      unit: U.s,
      bounds: { t0: 0, t1: tMax, lo: -h * 0.07, hi: h * 1.06 },
      series: [{ hue: 'disp', dash: null, segs: st }],
      rules },

    { id: 'at', kind: 'plot', nav: PLOT_NAV,
      title: 'Acceleration – time', tab: `${M`a`}–${M`t`}`, aria: 'Acceleration against time',
      corner: `${U.a} · downwards positive`,
      say: 'A step, not a number. Gravity alone, then the canopy pulling back harder '
        + 'than gravity pulls down, then nothing at all.',
      unit: U.a,
      bounds: { t0: 0, t1: tMax, lo: aLo - aPad, hi: aHi + aPad },
      series: [{ hue: 'acc', dash: null, segs: at }],
      rules, shade: true },
  ];

  /* A plot pane draws itself by handing its own series to the plotter, with
     the app's single `t` folded in. The closure is added here rather than
     written into each entry because all three do the identical thing — what
     differs between them is entirely the data above. */
  for (const p of panes) {
    if (p.kind === 'plot') p.draw = (canvas, view, o) => drawPlot(canvas, view, plotSpec(p, f, o.t, o.pre));
  }
  return panes;
}

/** What a graph pane says instead of a curve, before the clock has started. */
export const PRE_SAY = 'The clock starts when she leaves the aircraft.';

/**
 * The spec one plot pane needs for this frame.
 *
 * Everything time-dependent is decided here rather than stored, so the four
 * panes and the scrub bar cannot drift: there is one `t`, and it is the app's.
 */
export function plotSpec(pane, f, t, pre) {
  const spec = {
    bounds: pane.bounds, series: pane.series, rules: pane.rules,
    t: pre == null ? t : 0,
    shade: pane.shade, tick: pane.unit,
    pre: pre == null ? null : PRE_SAY,
  };
  if (pane.shade && pane.id === 'vt') {
    spec.shadeSay = `area = ${fmt(pane.fallen(t), 1)} ${U.s} fallen`;
  } else if (pane.shade) {
    spec.shadeSay = `area = ${fmt(f.speed(t), 1)} ${U.v} gained`;
  }
  return spec;
}

/* ══ the jump ══════════════════════════════════════════════════════════ */

/**
 * Sky, ground, an aircraft, and a jumper.
 *
 * @param view  metres of sky — see createMapView
 * @param o     { f, t, pre, fired }
 */
export function drawJump(canvas, view, o) {
  const { ctx, w, h: hp } = fitCanvas(canvas);
  if (w < 60 || hp < 60) return;
  const P = palette();
  const L = labels();
  const f = o.f;
  const H = f.params.h;
  if (view.fit) frameMap(view, H, w, hp);

  const X = (x) => w / 2 + (x - view.cx) * view.scale;
  const Y = (y) => hp / 2 - (y - view.cy) * view.scale;

  sky(ctx, w, hp, Y(0));
  ground(ctx, w, hp, Y(0));

  /* ── the aircraft, before the clock and all the way through it ─────── */
  const t = o.pre == null ? o.t : 0;
  const R = run(w, view.scale);
  // The pose is the DOOR's, because the door is the point the aeroplane is
  // drawn around — so "the door passes over the release point" is one number
  // rather than an offset applied in two places.
  const pl = planePose(o.pre, t, f.tMax, H, R);
  aircraft(ctx, X(pl.x), Y(pl.y), view.scale, pl, P);

  // Before the exit she is in the doorway; after it she is where she was left,
  // which is the release point, which is where the engine says she is at t = 0.
  const atDoor = o.pre != null && clamp(o.pre / PRE.total, 0, 1) < PRE.exit;
  const px = atDoor ? X(pl.x) : X(0);
  const py = atDoor ? Y(H) : Y(f.pos(t).y);

  /* ── the fall already flown ───────────────────────────────────────── */
  if (o.pre == null && t > 1e-6) {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const tt = (i / 160) * t;
      pts.push({ x: X(0), y: Y(f.pos(tt).y) });
    }
    stroke(ctx, pts, { color: P.vel, width: 3.2, alpha: 0.9 });
  }

  /* ── the two heights worth naming, both of them the engine's ──────── */
  const openY = f.phases[0].y1;
  for (const [y, name] of [[H, 'she leaves the aircraft'], [openY, f.phases[1]?.name]]) {
    if (!name) continue;
    const py2 = Y(y);
    if (py2 < -40 || py2 > hp + 40) continue;
    stroke(ctx, [{ x: 8, y: py2 }, { x: w - 8, y: py2 }],
           { color: P.faint, width: 1.3, dash: [5, 5], alpha: 0.7 });
    // No height is printed during the pre-roll: the whole of it is outside the
    // clock and nothing there has been measured.
    L.add(o.pre == null ? `${name} · ${fmt(y, 1)} ${U.s}` : name,
          12, py2 - 11, { color: P.muted, pri: 4, size: 13 });
  }
  L.add('ground', w - 12, Y(0) - 12, { color: P.muted, align: 'right', pri: 4, size: 13 });

  /* ── her, and what she is doing ───────────────────────────────────── */
  // HER FEET ARE ON THE POSITION, not her middle. The engine treats her as a
  // point, and the point a landing is about is the one that reaches the
  // ground — so the drawn body stands on it rather than straddling it, the
  // trail ends at her feet, and the last frame is not a person whose legs go
  // through the ground.
  const sS = spriteScale(view.scale, hp);
  const stand = py - Math.max(3, D.prop.person.h * sS) * 0.4;
  if (o.pre == null) {
    const v = f.speed(t);
    if (v > 0.05) {
      const len = clamp(v * view.scale * 0.22, 16, Math.max(18, hp * 0.3));
      arrow(ctx, px, py, px, py + len, { color: P.velVec, width: 2.6, head: 12 });
    }
  }
  parachutist(ctx, px, stand, sS, f, t, P);

  if (o.pre != null) {
    // The one line of text the pre-roll is allowed, and it names itself as
    // staging rather than describing a motion.
    L.add(PRE_SAY, w / 2, 20, { color: P.muted, align: 'center', pri: 9, size: 13 });
  } else {
    const here = f.at(t);
    L.add(`${here.name.toLowerCase()} · ${fmt(f.speed(t), 1)} ${U.v}`,
          px + 18, stand, { color: P.vel, pri: 10, size: 15, weight: 700, maxPush: 44 });
  }

  L.draw(ctx, w, hp);
}

/* ── the sky ────────────────────────────────────────────────────────────
   The page's own sky, from css/tokens.css, which is a late afternoon on the
   light theme and a floodlit night on the dark one. No new colours: the three
   stops are the ones the stadium's sky is already built from, so the two views
   are lit by the same weather.

   It is painted from the TOP OF THE WORLD rather than from the top of the
   canvas, so panning upwards does not drag a horizon band into the
   stratosphere with it. */
function sky(ctx, w, hp, groundY) {
  const top = Math.min(0, groundY - hp);
  const g = ctx.createLinearGradient(0, top, 0, Math.max(groundY, 1));
  g.addColorStop(0, cssVar('--sky-top', '#4a86bd'));
  g.addColorStop(0.55, cssVar('--sky-mid', '#a6c8e2'));
  g.addColorStop(1, cssVar('--sky-bottom', '#f0cfa8'));
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, w, hp); ctx.restore();
}

/** Where the drop ends. A band of ground and the line she lands on. */
function ground(ctx, w, hp, groundY) {
  if (groundY > hp + 2) return;
  ctx.save();
  ctx.fillStyle = cssVar('--terrain', '#9fae86');
  ctx.fillRect(0, groundY, w, hp - groundY);
  ctx.restore();
  stroke(ctx, [{ x: 0, y: groundY + .5 }, { x: w, y: groundY + .5 }],
         { color: cssVar('--grass-alt', '#5e8b4d'), width: 2 });
}

/**
 * The aircraft, with a door that slides open.
 *
 * Drawn at its real metres like everything else, with a pixel floor so that
 * at a frame holding a hundred metres it is still an aeroplane rather than a
 * smear — the same decision ballSprite makes for a football and parachutist
 * makes for a canopy.
 *
 * It takes the scenery's own grey (--prop), NOT a quantity's hue. Orange,
 * cyan and violet mean velocity, displacement and acceleration on this site,
 * and an aeroplane is none of the three: it is the thing she stepped out of.
 */
function aircraft(ctx, dx, dy, scale, pose, P) {
  /* A PIXEL FLOOR, and a generous one. At its real twelve metres in a
     quarter-size pane holding a hundred and forty of them, the aircraft is
     twenty pixels long and its door is three — and "the door opens" is one of
     the three beats the pre-roll exists to show. The floors below are what it
     measures in a MAXIMIZED pane, so the aeroplane is drawn at its true size
     wherever there is room for it and never shrinks below readable. It is the
     same decision ballSprite makes for a football and parachutist makes for a
     canopy, and it is honest for the same reason it is honest there: this is
     scenery, there is no quantity in it, and the ending card says the
     aircraft was not modelled at all. */
  const len = Math.max(44, PLANE.len * scale);
  const body = Math.max(8, PLANE.body * scale);
  const span = Math.max(30, PLANE.span * scale);
  const tail = Math.max(7, PLANE.tail * scale);
  // The door is the reference point, a third of the way back along the hull.
  const nose = dx + len * 0.68, back = dx - len * 0.32;

  ctx.save();
  // Fading as it goes, and nose down once it is descending. Both rotate and
  // fade about the door, so everything below keeps its own coordinates.
  ctx.globalAlpha = clamp(pose.alpha, 0, 1);
  if (pose.tilt) { ctx.translate(dx, dy); ctx.rotate(pose.tilt); ctx.translate(-dx, -dy); }
  ctx.fillStyle = cssVar('--prop', '#5d564e');
  ctx.strokeStyle = cssVar('--structure-dark', '#4a4238');
  ctx.lineWidth = Math.max(1, body * 0.14);

  // the wing, behind the hull, seen almost edge-on from the side
  const solid = ctx.globalAlpha;
  ctx.globalAlpha = solid * 0.85;
  ctx.beginPath();
  ctx.ellipse(dx + len * 0.1, dy - body * 0.1, span * 0.42, Math.max(1.2, body * 0.22), 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = solid;

  // the hull
  ctx.beginPath();
  ctx.moveTo(nose, dy);
  ctx.quadraticCurveTo(nose - len * 0.1, dy - body * 0.62, dx + len * 0.1, dy - body * 0.6);
  ctx.lineTo(back + len * 0.06, dy - body * 0.52);
  ctx.quadraticCurveTo(back, dy - body * 0.3, back, dy + body * 0.1);
  ctx.quadraticCurveTo(back + len * 0.2, dy + body * 0.52, nose - len * 0.2, dy + body * 0.46);
  ctx.closePath();
  ctx.fill();

  // the fin
  ctx.beginPath();
  ctx.moveTo(back + len * 0.04, dy - body * 0.5);
  ctx.lineTo(back - len * 0.02, dy - body * 0.5 - tail);
  ctx.lineTo(back + len * 0.2, dy - body * 0.5 - tail * 0.2);
  ctx.closePath();
  ctx.fill();

  /* THE DOOR, which is the beat between the aircraft arriving and her
     leaving. It slides back, so it is a gap that grows rather than a panel
     that swings — and what shows through it is the unlit interior, from the
     same token the stadium's cut volumes use. */
  const dw = Math.max(2, body * 0.95) * pose.open;
  if (dw > 0.4) {
    ctx.fillStyle = cssVar('--roof-under', '#7b8086');
    ctx.fillRect(dx - dw / 2, dy - body * 0.44, dw, Math.max(2, body * 0.8));
  }
  ctx.restore();
}
