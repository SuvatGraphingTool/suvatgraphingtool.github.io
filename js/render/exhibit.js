// exhibit.js — the two scenarios that are staged rather than surveyed.
//
// WHY THIS IS NOT scene.js. Everywhere else, one unit is one metre on both
// axes: 45° looks like 45°, and it has to, because reading an angle off the
// screen is half the point. These two cannot both be shown that way in one
// frame. A bullet leaving a barrel at 360 m s⁻¹ falls 1.5 m while it travels
// 180 — at true scale in a single frame that is a horizontal scratch, and the
// thing you are meant to see (two rounds at the same height at every instant)
// is invisible.
//
// There are two answers to that and this file now uses both.
//
// ONE FRAME, SQUEEZED SIDEWAYS. The monkey keeps this. The banana and the
// monkey are metres apart, not hundreds, so the squeeze is mild and the frame
// holds the whole story at once. `kx` is how badly the sideways axis had to be
// squeezed, it is the only number in this file allowed to lie, and the plate
// prints it every time.
//
// TWO FRAMES, NEITHER SQUEEZED. The range uses this. Each round gets its own
// pane and its own window onto the room, both panes at ONE metres-per-pixel
// and 1:1 on both axes — so a millimetre of fall is the same number of pixels
// in both, which is the entire claim the exhibit makes. The fired round's pane
// travels with it; the released round's does not have to, because it does not
// go anywhere. What you give up is seeing the whole 200 m at once, and that was
// never worth having: nobody can read a path squeezed 93×. What you gain is
// that the picture no longer has to be apologised for.
//
// The vertical axis is never touched in either mode, the engine never knows,
// and the numbers on screen are the numbers the engine produced.
//
// THE STAGE IS A PLATE, AND THERE ARE NOW TWO OF THEM.
//
// The range is a strobe lamp firing every 50 ms in a blacked-out room, so its
// plate is dark in both themes and light mode changes the page around it
// rather than the plate. That was the only kind of plate there was, and every
// ink, rule and halo in this file was picked against it.
//
// The jungle is the middle of the day. Near-white text and a white flash halo
// over a lit canopy is the same mistake in the other direction, so the plate
// is a PALETTE now rather than a constant: `PLATES` holds one per backdrop,
// `render` picks the scenario's, and everything downstream reads `PL`. Only
// the two keys that describe the light differ in kind — `ink` and `glow` —
// but every value is stated per plate rather than inherited, because a half-
// inherited palette is how you end up with 34%-opacity white on pale sky.

import { fitCanvas, palette, fmt, clamp, labels } from './util.js';
import { warehouseBack, plainBack, EXTENT } from './backdrops.js';
import { MONKEY_H } from '../core/intercept.js';

const NIGHT = {
  ink: '#f2efe9', inkMid: 'rgba(242,239,233,0.62)', inkFaint: 'rgba(242,239,233,0.34)',
  bg0: '#1c1b18', bg1: '#0e0e0c',
  rule: 'rgba(242,239,233,0.26)', ruleFaint: 'rgba(242,239,233,0.13)',
  brass: '#c6a02e', brassHi: '#f3dd96', brassLo: '#6d5415',
  lead: '#a8adb2', leadHi: '#e7ebee', leadLo: '#4a4f54',
  glow: 'rgba(255,238,196,0.17)',
  pill: '#f6f3ec', pillInk: '#17160f',
};

// Daylight. The ink is a very dark green-brown rather than black: it sits on
// leaves most of the time, and pure black on foliage reads as a hole in it.
// The halo is a soft dark contrast ring — the job it does on the dark plate is
// "separate the round from the background", and on a bright one that is a
// shadow, not a flash.
// Squared paper. `flat` says so: one background colour, no gradient and no
// vignette, because this plate is a diagram rather than an exposure.
const DAY = {
  flat: true,
  ink: '#16211b', inkMid: 'rgba(22,33,27,0.64)', inkFaint: 'rgba(22,33,27,0.34)',
  bg0: '#f7f6f1', bg1: '#f7f6f1',
  rule: 'rgba(22,33,27,0.30)', ruleFaint: 'rgba(22,33,27,0.14)',
  brass: '#e0a81b', brassHi: '#ffd95e', brassLo: '#7d5806',
  lead: '#a8adb2', leadHi: '#e7ebee', leadLo: '#4a4f54',
  glow: 'rgba(22,33,27,0.12)',
  pill: '#ffffff', pillInk: '#17160f',
};

const PLATES = { warehouse: NIGHT, plain: DAY };
const BACKS = { warehouse: warehouseBack, plain: plainBack };

// The plate in force for the frame being drawn. Set once at the top of
// render(); every painter below reads it rather than a module constant.
let PL = NIGHT;

const round = (g, x, y, w, h, r) => {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
};

/* ── the mapping ────────────────────────────────────────────────────────
   One `S` is one window onto the room: a scale on each axis, an origin, and
   the three conversions everything in this file and in backdrops.js goes
   through. There is no coordinate arithmetic anywhere outside it.

   It is built two ways.

   FITTED (no `scale`) — work out what it takes to get the whole flight in,
   squeezing sideways if it has to and never stretching. `kx` reports the
   squeeze and the plate prints it. This is what the monkey uses.

   GIVEN (`scale` supplied) — you have already decided the metres-per-pixel,
   and you say which world x sits at which fraction across the pane. The
   window is then whatever that leaves visible. Two of these built with the
   same `scale` are two panes a student can compare directly, which is the
   whole reason the option exists.

   `m` is vertical metres and `mx` is horizontal ones. They are the same
   number under a GIVEN scale and they are not under a FITTED one, and the
   difference matters: anything drawn across the frame has to use `mx` or it
   comes out stretched by exactly the factor the plate is apologising for. */
function stage(o, rect, opts = {}) {
  const { traj: f, second, markers, scenario } = o;
  const ex = EXTENT[scenario.backdrop] || { x0: 0, x1: 10, yTop: 10 };

  let xHi = Math.max(ex.x1, isFinite(f.range) ? f.range : f.horiz * f.tMax);
  let yHi = Math.max(ex.yTop, f.apexHeight, f.params.h);
  if (second) xHi = Math.max(xHi, second.range ?? 0);
  // THE FRAME HOLDS THE PHYSICS AND THE PLACE THE MONKEY HANGS FROM, and the
  // floor comes from the backdrop's own extent rather than from the monkey:
  // tie it to the marker and the picture rescales every time you pick a
  // different branch, so the one thing that should stay put — the grid — is
  // the thing that moves.
  if (markers?.target) {
    xHi = Math.max(xHi, markers.target.x + 2.5);
    yHi = Math.max(ex.yTop, f.apexHeight, f.params.h, markers.target.y + 1.6);
  }
  let xLo = Math.min(0, ex.x0);
  if (opts.yHi) yHi = opts.yHi;

  const sy = opts.scale ?? (rect.h * 0.92) / (yHi * 1.1);
  let sx, originX;
  if (opts.scale != null) {
    // GIVEN: square pixels, and `centre` metres parked `at` across the pane.
    sx = opts.scale;
    originX = rect.x + rect.w * (opts.at ?? 0.5) - (opts.centre ?? 0) * sx;
    xLo = (rect.x - originX) / sx;
    xHi = (rect.x + rect.w - originX) / sx;
  } else {
    const sxRaw = (rect.w * 0.93) / (xHi - xLo);
    // Never STRETCH sideways: a squeeze is a reading aid, a stretch is a lie
    // with no upside. Beyond that, the sideways scale is whatever fits.
    sx = Math.min(sxRaw, sy);
    originX = rect.x + rect.w * 0.035 - xLo * sx;
  }
  const kx = sx / sy;
  // The ground sits 8% up from the bottom of the pane unless the caller says
  // otherwise, and the caller that says otherwise is the camera: panning up
  // and down is nothing more than moving this one number. See fitPlate.
  const groundY = opts.groundY ?? (rect.y + rect.h * 0.92);
  return {
    sx, sy, kx, xLo, xHi, yHi, groundY, originX,
    xSpan: xHi - xLo,                                  // metres actually in view
    X: (x) => originX + x * sx,
    Y: (y) => groundY - y * sy,
    m: (v) => v * sy,                                  // metres → px, vertically
    mx: (v) => v * sx,                                 // metres → px, horizontally
  };
}

/* ── the camera, on the plate ────────────────────────────────────────────
   THE PLATE USED TO IGNORE THE CAMERA, and that cost it the scenario: it
   could not be dragged, could not be zoomed, and the view button did nothing,
   because this file worked out its own projection from the flight's extents
   on every frame and never read cam. One consistent map everywhere was worth
   more than a prettier one in two places, so the two experiments were moved
   onto the ordinary side-on view and this renderer went unused.

   It reads the camera now, so there is nothing left to choose between: the
   monkey keeps its plate and its strobe exposures, and it drags and zooms
   like every other view on the site.

   SQUARE PIXELS, as a consequence. The fitted plate squeezed sideways when a
   flight was too wide for the frame — `kx` was the only number in this file
   allowed to lie, and the footer printed it every time. With a camera it does
   not have to: you zoom instead, and 45° looks like 45° at every zoom. The
   squeeze survives only in the two-pane mode below, which is not
   camera-driven and does not need to be.

   The three numbers are the same three the side-on view uses — scale in
   pixels per metre, and the world point at the centre of the frame — so
   js/render/scene.js's attachControls, easeCamera and fitView all work on a
   plate without knowing it is one. */
function fitPlate(cam, o, rect) {
  const { traj: f, second, markers, scenario } = o;
  const ex = EXTENT[scenario.backdrop] || { x0: 0, x1: 10, yTop: 10 };

  let xHi = Math.max(ex.x1, isFinite(f.range) ? f.range : f.horiz * f.tMax);
  let yHi = Math.max(ex.yTop, f.apexHeight, f.params.h);
  if (second) xHi = Math.max(xHi, second.range ?? 0);
  if (markers?.target) {
    xHi = Math.max(xHi, markers.target.x + 4.5);
    // Same floor the fitted stage uses: enough palm to read as a palm, and
    // never tied to the monkey's own height — see backdrops.js.
    yHi = Math.max(ex.yTop, f.apexHeight, f.params.h, markers.target.y + 1.6);
  }
  const xLo = Math.min(0, ex.x0);

  // A FRAME WITH NO ROOM IN IT IS NOT A FRAME. The plate reserves 34 px either
  // side and 84 px top and bottom for its own border and footer, so a canvas
  // shorter than that leaves `rect` with a NEGATIVE height — and the fit that
  // came out of it was a negative scale, which draws the beach inside out and
  // upside down. It happens for real: the first frame before the browser has
  // laid the page out, a pane dragged shut, a phone in landscape with the
  // keyboard up.
  //
  // So refuse, and leave `cam.fit` set rather than consuming it. The next
  // frame that has a canvas worth fitting to will fit to it. autoFit in
  // scene.js survives the same case by flooring its scale at 0.004; this one
  // cannot floor, because a wrong-but-positive scale on a plate is a picture
  // of nothing.
  if (!(rect.w > 40) || !(rect.h > 40)) return;

  const scale = Math.min((rect.w * 0.93) / Math.max(1e-6, xHi - xLo),
                         (rect.h * 0.92) / Math.max(1e-6, yHi * 1.1));
  const target = {
    scale,
    cx: (xLo + xHi) / 2,
    // cy is chosen to put the ground where the plate has always put it, 8% up
    // from the bottom: cy·scale is the gap between the pane's centre and the
    // ground line.
    cy: (rect.h * 0.42) / scale,
  };

  // A FIT TRAVELS, as it does in the side-on view — except across a change of
  // renderer, where there is nothing to travel from: the camera arrives
  // holding a scale meant for a stadium 250 m wide, and easing from that to a
  // beach 28 m wide is a long swoop through nothing anybody asked to see.
  cam.want = target;
  if (!cam.placed || cam._plate !== true) {
    cam.scale = target.scale; cam.cx = target.cx; cam.cy = target.cy;
  }
  cam.placed = true;
  cam._plate = true;
  cam.fit = false;
}

/* ── the plate ─────────────────────────────────────────────────────────── */
function plate(g, w, h, pad) {
  const x = pad.l - 18, y = pad.t - 18, pw = w - x - (pad.r - 18), ph = h - y - (pad.b - 18);
  g.save();
  round(g, x, y, pw, ph, 14); g.clip();
  // A GRADIENT AND A VIGNETTE ARE PHOTOGRAPH, NOT DIAGRAM. The range is a
  // photograph and keeps both. The monkey is a drawing on squared paper, and
  // a sky-blue wash with the corners falling away is exactly the atmosphere a
  // diagram should not have — it also makes the grid fade out in the corners,
  // which is where you most want to count squares.
  if (PL.flat) {
    g.fillStyle = PL.bg0; g.fillRect(x, y, pw, ph);
  } else {
    const bg = g.createLinearGradient(0, y, 0, y + ph);
    bg.addColorStop(0, PL.bg0); bg.addColorStop(1, PL.bg1);
    g.fillStyle = bg; g.fillRect(x, y, pw, ph);
    // a soft vignette, so the corners fall away like a real exposure
    const v = g.createRadialGradient(x + pw * 0.42, y + ph * 0.42, 0, x + pw * 0.5, y + ph * 0.5, pw * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.42)');
    g.fillStyle = v; g.fillRect(x, y, pw, ph);
  }
  return { x, y, w: pw, h: ph };
}

/* ── sprites ───────────────────────────────────────────────────────────── */

/** A round, drawn along its own velocity so it reads as a bullet, not a dot. */
function bullet(g, x, y, L, ang, lit) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const W = Math.max(2.6, L * 0.40);
  const body = g.createLinearGradient(0, -W / 2, 0, W / 2);
  body.addColorStop(0, PL.brassHi); body.addColorStop(0.45, PL.brass); body.addColorStop(1, PL.brassLo);
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(L * 0.5, 0);                                 // ogive nose
  g.quadraticCurveTo(L * 0.16, -W / 2, -L * 0.22, -W / 2);
  g.lineTo(-L * 0.5, -W * 0.42);
  g.lineTo(-L * 0.5, W * 0.42);
  g.lineTo(-L * 0.22, W / 2);
  g.quadraticCurveTo(L * 0.16, W / 2, L * 0.5, 0);
  g.closePath(); g.fill();
  if (lit) {                                            // a cannelure and a highlight
    g.strokeStyle = PL.brassLo; g.lineWidth = Math.max(0.7, L * 0.045);
    g.beginPath(); g.moveTo(-L * 0.2, -W * 0.46); g.lineTo(-L * 0.2, W * 0.46); g.stroke();
    g.strokeStyle = PL.brassHi; g.lineWidth = Math.max(0.6, L * 0.05); g.globalAlpha = 0.9;
    g.beginPath(); g.moveTo(L * 0.3, -W * 0.2); g.lineTo(-L * 0.36, -W * 0.3); g.stroke();
  }
  g.restore();
}

/** The flash halo. This is what makes it read as a photograph. */
function halo(g, x, y, r) {
  // ON THE DIAGRAM THERE IS NO FLASH TO HALO. A warm glow around every
  // exposure is what a strobe lamp does in a dark room; on squared paper it
  // is a smudge under the one object the page is about, and it was the thing
  // making the monkey look like it had been rubbed out.
  if (PL.flat) return;
  const gl = g.createRadialGradient(x, y, 0, x, y, r);
  gl.addColorStop(0, PL.glow); gl.addColorStop(0.55, 'rgba(255,238,196,0.06)');
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

function pill(g, x, y, text, size = 14) {
  g.save();
  g.font = `600 ${size}px ${getComputedStyle(document.documentElement).getPropertyValue('--font') || 'system-ui'}`;
  const tw = g.measureText(text).width, pw = tw + 22, ph = size + 15;
  round(g, x - pw / 2, y - ph / 2, pw, ph, ph / 2);
  g.fillStyle = PL.pill; g.fill();
  g.fillStyle = PL.pillInk; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x, y + 0.5);
  g.restore();
}

function text(g, x, y, s, { col = PL.inkMid, size = 13, align = 'left', weight = 600 } = {}) {
  g.save();
  g.font = `${weight} ${size}px ${getComputedStyle(document.documentElement).getPropertyValue('--font') || 'system-ui'}`;
  g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle';
  g.fillText(s, x, y); g.restore();
}

/* ── the strobe ─────────────────────────────────────────────────────────
   A flash every `dt` seconds, every exposure kept. Equal time steps are the
   whole argument: the sideways gaps stay constant because nothing accelerates
   sideways, and the vertical gaps grow as 1, 3, 5, 7 — and the two bullets
   share every one of those vertical gaps. */
function strobeTimes(tMax) {
  for (const dt of [0.005, 0.01, 0.02, 0.025, 0.05, 0.1, 0.2, 0.25, 0.5, 1]) {
    if (tMax / dt <= 14) return { dt, n: Math.floor(tMax / dt) };
  }
  return { dt: tMax / 12, n: 12 };
}

/* ── how many frames, and what each one is looking at ───────────────────
   The beach gets one. Everything that matters there happens inside a few
   metres, the squeeze is mild, and one frame holds the whole story.

   The range gets two, as soon as there is a second round to compare against.
   The two rounds end up hundreds of metres apart and one centimetre apart
   vertically, and no single frame can be honest about both. So: one pane each,
   ONE scale shared between them, square pixels in both.

   The scale is set by the HEIGHT, because the height is what the exhibit is
   about. That decides everything else, including the part that looks like a
   cost: each pane then holds only a couple of metres of floor, so the fired
   round's pane has to travel with it and the floor streams past far too fast
   to read. That is not a flaw in the picture. A round doing 360 m s⁻¹ really
   does cross two metres in six milliseconds, and a frame that let you read it
   would be lying about the speed the way the old one lied about the shape.
   The downrange figure is there to be read instead, and the playback speed
   control is there for anyone who wants to watch it happen.

   Widths are 40/60 because the released round needs only enough floor to fall
   past and the fired one wants as much warning of what is coming as it can
   get. */
const GUTTER = 16;

function planPanes(o, box, rect, view) {
  const { scenario, traj: f, second, t, overview } = o;
  // ONE PANE IS THE CAMERA'S. The two-pane mode below is not: it exists to
  // put two frames at one shared scale beside each other, which is a
  // different problem from a view you can move, and it would need a camera
  // each to be dragged. Nothing reaches it at the moment — see the note on
  // `plate` in js/app.js — and if it ever does, that is the work.
  const single = (ghosts) => [{
    box, S: stage(o, rect, view), only: null, rule: true, ghosts, label: null,
  }];
  // `overview` is the end-of-run view: one frame, both paths, every exposure.
  if (scenario.id !== 'bullet' || !second || overview) return single(true);

  const lw = Math.round((box.w - GUTTER) * 0.40);
  const rw = box.w - GUTTER - lw;
  const yHi = Math.max(EXTENT.warehouse.yTop, f.apexHeight, f.params.h);
  const scale = (rect.h * 0.92) / (yHi * 1.1);          // one scale, both panes

  const pane = (x, w, opts) => ({
    box: { x, y: box.y, w, h: box.h },
    S: stage(o, { x, y: rect.y, w, h: rect.h }, { scale, yHi, ...opts }),
  });

  const at = Math.min(t, f.tMax), bt = Math.min(t, second.tMax);
  return [
    { ...pane(box.x, lw, { centre: second.pos(bt).x, at: 0.5 }),
      only: 'b', rule: false, ghosts: false, label: 'Released  ·  straight down' },
    { ...pane(box.x + lw + GUTTER, rw, { centre: f.pos(at).x, at: 0.3 }),
      only: 'a', rule: true, ghosts: false,
      label: `Fired at ${fmt(f.params.u, 0)} m s⁻¹` },
  ];
}

/** The seam. Two frames on a contact sheet, not one frame with a crack in it. */
function gutter(g, panes, box) {
  for (let i = 1; i < panes.length; i++) {
    const x = panes[i - 1].box.x + panes[i - 1].box.w;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(x, box.y, GUTTER, box.h);
    g.strokeStyle = PL.ruleFaint; g.lineWidth = 1;
    for (const rx of [x + 0.5, x + GUTTER - 0.5]) {
      g.beginPath(); g.moveTo(rx, box.y); g.lineTo(rx, box.y + box.h); g.stroke();
    }
    g.restore();
  }
}

/* ── the argument, drawn across the seam ────────────────────────────────
   In one frame the claim is made with a line joining the two rounds. Two
   panes cannot join anything — but they share a scale and a ground line, so
   a height in one pane is the same screen row as that height in the other,
   and a single rule drawn straight across both lands on both rounds at once.
   That is a stronger version of the same argument, and it only works because
   the two panes really are at one scale. */
function sameHeight(g, panes, o, box) {
  const { traj: f, second, t } = o;
  const ya = f.pos(Math.min(t, f.tMax)).y, yb = second.pos(Math.min(t, second.tMax)).y;
  const S = panes[0].S;
  const Ya = S.Y(ya), Yb = S.Y(yb);
  g.save();
  g.setLineDash([3, 5]); g.lineWidth = 1.3; g.strokeStyle = PL.ink;
  g.globalAlpha = 0.85;
  g.beginPath(); g.moveTo(box.x + 6, Ya); g.lineTo(box.x + box.w - 6, Ya); g.stroke();
  if (Math.abs(Ya - Yb) > 1.5) {                        // they have come apart
    g.globalAlpha = 0.5;
    g.beginPath(); g.moveTo(box.x + 6, Yb); g.lineTo(box.x + box.w - 6, Yb); g.stroke();
  }
  g.restore();
  // Only claim it when it is true. They do stay level — that is the result —
  // but the plate says so because it checked, not because it was told to.
  if (Math.abs(Ya - Yb) <= 1.5) {
    text(g, box.x + box.w / 2, Ya - 13, 'same height',
         { align: 'center', size: 13, col: PL.ink, weight: 600 });
  }
}

/* ══ the renderer ═══════════════════════════════════════════════════════ */
export function render(canvas, cam, o) {
  const { traj: f, second, t, show, scenario, fired = true, verdict = null } = o;
  if (!f) return null;
  PL = PLATES[scenario?.backdrop] || NIGHT;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const L = labels();
  const pad = { l: 34, r: 34, t: 30, b: 54 };
  const box = plate(g, w, h, pad);
  const rect = { x: pad.l, y: pad.t, w: w - pad.l - pad.r, h: h - pad.t - pad.b };

  if (cam.fit) fitPlate(cam, o, rect);
  // What the camera says, in the terms stage() takes. `yHi` is the world
  // height actually visible rather than the flight's own, so the sky gradient
  // and the height rule follow a zoom instead of being drawn for a frame that
  // is no longer on screen.
  const groundY = rect.y + rect.h / 2 + cam.cy * cam.scale;
  const view = { scale: cam.scale, centre: cam.cx, at: 0.5, groundY,
                 yHi: Math.max(1e-6, (groundY - rect.y) / cam.scale) };

  const panes = planPanes(o, box, rect, view);
  const split = panes.length > 1;

  // Nothing in backdrops.js clips itself — a palm crown or a barrel is drawn
  // wherever the maths puts it — so each pane gets its own clip before
  // anything is painted into it. Without this the two panes bleed.
  let shot = null;
  for (const pane of panes) {
    g.save();
    if (split) { round(g, pane.box.x, pane.box.y, pane.box.w, pane.box.h, 10); g.clip(); }
    shot = drawPane(g, pane, o, shot);
    g.restore();
  }

  if (split) {
    gutter(g, panes, box);
    sameHeight(g, panes, o, box);
    // Centred at the top of each pane, because the corners of this canvas
    // belong to the HUD cards, which are DOM and sit over the top of it.
    const down = f.pos(Math.min(t, f.tMax)).x;
    for (const pane of panes) {
      if (!pane.label) continue;
      // A chase pane cannot show you how far it has come by moving — at this
      // scale the floor is a blur — so it says so instead.
      const line = pane.only === 'a' ? `${pane.label}  ·  ${fmt(down, 0)} m downrange` : pane.label;
      text(g, pane.box.x + pane.box.w / 2, pane.box.y + 18, line,
           { align: 'center', size: 13, col: PL.ink, weight: 600 });
    }
  } else if (show.heightLines !== false && second) {
    heightLines(g, shot, o, box);
  }

  footer(g, box, panes, o, shot);
  g.restore();                                          // the plate clip

  // The inverse projections, so a drag on the plate lands in metres. They are
  // the pane's own X and Y turned round — see `toWorld` in scene.js.
  const act = panes[panes.length - 1].S;
  cam._map = {
    sx: act.X, sy: act.Y,
    px: (X) => (X - act.originX) / act.sx,
    py: (Y) => (act.groundY - Y) / act.sy,
    su: act.X, pu: (X) => (X - act.originX) / act.sx, u0: 0,
  };
  // Where the object is on screen, which is what renderResolve reads to put
  // its card on the side the object is NOT on.
  const at = Math.min(t, f.tMax);
  cam._map.ball = { x: act.X(f.pos(at).x), y: act.Y(f.pos(at).y) };
  cam._stage = act;
  L.draw(g, w, h);
  return { sx: act.X, sy: act.Y };
}

/* ── one frame's worth ──────────────────────────────────────────────────
   The place, the floor, the height rule and the exposures. `only` picks which
   object this pane is following; `ghosts` says whether the earlier exposures
   are kept. A pane that is chasing one round has no business showing a trail
   of where it has been — at a 2 m window the trail is off the edge before the
   second flash — so the split panes run with ghosts off and the overview at
   the end turns them back on, which is the only place they earn their keep. */
function drawPane(g, pane, o, prev) {
  const { traj: f, second, t, scenario, fired = true, markers = {} } = o;
  const S = pane.S;
  const box = pane.box;

  // WHAT IS THROWN IS THE SCENARIO'S BUSINESS, NOT THE PLACE'S. These three
  // branches read `scenario.backdrop === 'beach'`, which said the round was a
  // banana because the sand was sand. Move the monkey somewhere else and the
  // hunter went back to firing a bullet — so the scenario names what it
  // throws and the backdrop only says where.
  const thrown = scenario.projectile || 'round';
  const back = BACKS[scenario.backdrop] || warehouseBack;
  // `box` goes through so the aim ray knows how far it has to run to leave
  // the frame; it is a ray along the angle now, not a segment to the marker.
  back(g, S, box, { t, fired, markers, PLATE: PL, box, scenario,
                    launchY: f.params.h, theta: f.params.theta });

  /* ── ground line ──────────────────────────────────────────────────── */
  g.strokeStyle = PL.rule; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(box.x, S.groundY + 3.5); g.lineTo(box.x + box.w, S.groundY + 3.5); g.stroke();

  /* ── height rule down the right ───────────────────────────────────── */
  if (pane.rule) {
    const rx = box.x + box.w - 30;
    g.strokeStyle = PL.ruleFaint; g.lineWidth = 1;
    g.beginPath(); g.moveTo(rx, S.Y(S.yHi * 1.02)); g.lineTo(rx, S.groundY); g.stroke();
    const stepY = S.yHi > 24 ? 10 : S.yHi > 9 ? 5 : S.yHi > 3.5 ? 1 : 0.5;
    for (let y = 0; y <= S.yHi * 1.02; y += stepY / 2) {
      const major = Math.abs(y / stepY - Math.round(y / stepY)) < 1e-9;
      g.beginPath(); g.moveTo(rx - (major ? 9 : 5), S.Y(y)); g.lineTo(rx, S.Y(y)); g.stroke();
      if (major && y > 0) text(g, rx - 13, S.Y(y), `${fmt(y, stepY < 1 ? 1 : 0)} m`,
                              { align: 'right', size: 13, col: PL.inkMid });
    }
  }

  /* ── the exposures ────────────────────────────────────────────────── */
  // Run to whichever finishes last. When the banana lands short, the monkey
  // is still falling, and freezing it in mid-air reads as a rendering fault
  // rather than as the thing that actually happened.
  const tEnd = Math.max(f.tMax, second?.tMax ?? 0);
  const tNow = fired ? Math.min(t, tEnd) : 0;
  const { dt, n } = strobeTimes(tEnd);
  const dt0 = dt;
  const shots = [];
  for (let i = 0; i <= n; i++) {
    const ti = i * dt;
    if (ti > tNow + 1e-9) break;
    shots.push(ti);
  }
  if (!shots.length || shots[shots.length - 1] < tNow - 1e-9) shots.push(tNow);

  // Size the sprite against the GAP between exposures, not against the metre.
  // A round drawn bigger than the distance it moves between flashes paints a
  // smear instead of a sequence, and the sequence is the entire argument.
  const gapPx = Math.max(6, Math.abs(S.Y(f.pos(dt0).y) - S.Y(f.params.h)) || 0,
                         Math.abs(S.X(f.pos(dt0).x) - S.X(0)));
  const Lbul = clamp(gapPx * 0.72, 9, thrown === 'banana' ? 30 : 20);
  const pair = [];                                      // [firedPos, droppedPos] per flash

  // THINNING MUST NOT FLATTEN THE ACCELERATION.
  //
  // Dropping exposures that fall within some distance of the last one drawn
  // produces a column of EVENLY spaced images — which is a picture of
  // constant velocity, and a lie about the one thing the plate is for. Thin
  // by taking every k-th flash instead: gaps under free fall go as 1, 3, 5, 7
  // and a stride multiplies them all by k², so the signature survives intact.
  const firstDrop = second
    ? Math.abs(S.Y(second.pos(Math.min(dt, second.tMax)).y) - S.Y(second.pos(0).y))
    : Infinity;
  let stride = 1;
  while (stride < 8 && firstDrop * stride * stride < 7 && shots.length / (stride + 1) > 4) stride++;

  const wantA = pane.only !== 'b', wantB = pane.only !== 'a';

  for (let i = 0; i < shots.length; i++) {
    const ti = shots[i];
    const last = i === shots.length - 1;
    if (!pane.ghosts && !last) continue;                // this pane keeps one exposure
    const age = shots.length > 1 ? i / (shots.length - 1) : 1;
    const a = fired && pane.ghosts ? 0.28 + 0.72 * age : 1;

    const tA = Math.min(ti, f.tMax);
    const p = f.pos(tA), v = f.pos(Math.min(tA + 0.004, f.tMax));
    const px = S.X(p.x), py = S.Y(p.y);
    const ang = Math.atan2(-(S.Y(v.y) - py), S.X(v.x) - px);

    const showA = wantA && (last || i % stride === 0);
    if (showA) {
      g.save(); g.globalAlpha = a;
      halo(g, px, py, Lbul * (last ? 1.7 : 1.1));
      if (thrown === 'banana') bananaOrMonkey(g, px, py, Lbul, ang, last, true);
      else bullet(g, px, py, Lbul, ang, last);
      g.restore();
    }

    let qp = null, drewB = false;
    if (second) {   // drawn second, so it sits in front of the tree behind it
      const q = second.pos(Math.min(ti, second.tMax));
      const qx = S.X(q.x), qy = S.Y(q.y);
      // THE MONKEY IS MONKEY_H TALL, and the hit test in js/core/intercept.js
      // uses the same number. A sprite sized in pixels — `max(Lbul, 26)` — is
      // a different monkey at every zoom, and none of them the one the
      // physics was testing against. monkeyGlyph's `s` is a scale on which
      // the drawn figure stands about 1.21 s, so that is divided back out.
      const Lsec = thrown === 'banana' ? Math.max(9, S.m(MONKEY_H) / 1.21) : Lbul;
      if (wantB && (last || i % stride === 0)) {
        drewB = true;
        g.save(); g.globalAlpha = a;
        halo(g, qx, qy, Lsec * (last ? 1.7 : 1.1));
        // STILL HOLDING ON, until it isn't. The grip is the whole premise —
        // the monkey drops the instant the throw leaves — so the first
        // exposure is drawn hanging and every one after it falling.
        const holding = !fired || ti <= 1e-9;
        if (thrown === 'banana') bananaOrMonkey(g, qx, qy, Lsec, Math.PI / 2, last, false, holding);
        else bullet(g, qx, qy, Lsec, Math.PI / 2, last);
        g.restore();
      }
      qp = { x: qx, y: qy };
    }
    pair.push({ a: { x: px, y: py }, b: qp, i, last, drawn: showA && drewB });
  }

  return prev || { pair, shots, dt, stride };
}

/* ── the height lines: the argument, drawn, in a single frame ─────────── */
function heightLines(g, shot, o, box) {
  const { traj: f, second, t, scenario, fired = true, verdict = null } = o;
  const { pair, shots } = shot;
  g.save();
  g.setLineDash([2.5, 5]); g.lineWidth = 1.2;
  const grounded = second && isFinite(second.tFlight) ? second.tFlight : Infinity;
  for (const s of pair) {
    if (!s.b) continue;
    // NOT AT t = 0. THIS IS THE SECOND LINE. Before anything is thrown the
    // banana is at the muzzle and the monkey is on its branch, so this drew a
    // connector from one to the other — a line from the hunter straight to
    // the monkey, which is indistinguishable from an aim line and sat there
    // while the real aim ray swung away with the angle. Two lines, one of
    // which was still pointing at the target you had just stopped aiming at.
    //
    // It was never an aim line. It is the pair connector, and what it claims
    // is "these two have fallen the same distance" — which at t = 0 is a
    // claim about nothing, the same reason the "same fall" pill waits.
    if (shots[s.i] <= 1e-9) continue;
    if (shots[s.i] > grounded + 1e-9) continue;       // it has landed; no shared fall left
    if (!s.drawn && !s.last) continue;                // no line to an exposure nobody can see
    g.globalAlpha = s.last ? 0.95 : 0.6;
    g.strokeStyle = PL.ink;                       // near-white: this is the point
    g.beginPath(); g.moveTo(s.b.x, s.b.y); g.lineTo(s.a.x, s.a.y); g.stroke();
  }
  g.restore();
  const last = pair[pair.length - 1];
  const gap = last?.b ? Math.hypot(last.a.x - last.b.x, last.a.y - last.b.y) : Infinity;
  const done = fired && t >= f.tMax - 1e-6;
  // WHAT HAPPENED, in the engine's four words. It used to know one: 'short'.
  // Now the aim can be wrong, so the plate has to be able to say how.
  const SAID = {
    short: 'too slow — it never got there',
    high:  'too high — it passed over',
    low:   'too low — it passed under',
  };
  if (verdict && SAID[verdict.kind] && done) {
    // Saying "same fall" over a miss would be a lie about which one. The
    // lines between the exposures still mean what they always meant, though:
    // both objects fell exactly the same distance, and that is why a miss is
    // a miss of AIM rather than of timing.
    labelPair(g, pair, last, scenario, box);
    pill(g, box.x + box.w / 2, box.y + 56, SAID[verdict.kind], 14);
  } else if (fired && t > 1e-6 && last?.b && gap > 90) {
    // NOT BEFORE IT HAS FALLEN. At t = 0 the banana is at the muzzle and the
    // monkey is on its branch, the gap between them is the whole frame, and
    // this drew "same fall" on a leader pointing into empty sky — a label
    // naming a quantity that is still zero. It says it once there is one.
    labelPair(g, pair, last, scenario, box);
  } else if (last?.b && gap < 14 && done) {
    // they have met. Say so where it happened, not in a corner.
    const cx = (last.a.x + last.b.x) / 2, cy = (last.a.y + last.b.y) / 2;
    halo(g, cx, cy, 34);
    // offset the label clear of the catch itself — a pill over the moment it
    // is naming hides the only thing worth looking at
    const side = cx > box.x + box.w * 0.55 ? -1 : 1;
    const lx = clamp(cx + side * 150, box.x + 90, box.x + box.w - 90);
    g.save(); g.globalAlpha = 0.5; g.strokeStyle = PL.ink; g.lineWidth = 1.1;
    g.setLineDash([3, 4]);
    g.beginPath(); g.moveTo(cx + side * 26, cy); g.lineTo(lx - side * 60, cy); g.stroke();
    g.restore();
    pill(g, lx, cy, scenario.caughtLabel || 'caught');
  }
}

/* ── what the plate is not telling you straight ─────────────────────────
   The whole reason the split exists is so this line can stop apologising. */
function footer(g, box, panes, o, shot) {
  const { traj: f } = o;
  const real = isFinite(f.range) ? f.range : f.horiz * f.tMax;
  const S = panes[0].S;
  const foot = panes.length > 1
    ? `No squeeze — 1 m is 1 m, both panes, same scale · range ${fmt(real, 0)} m`
    : S.kx < 0.92
      ? `Sideways squeezed ${fmt(1 / S.kx, 1)}× to fit — the real path is far flatter than this · range ${fmt(real, 0)} m`
      // Now that the frame can be zoomed, how much of the place is in it is
      // worth as much as the promise that it is not squeezed.
      : `1 m is 1 m both ways · ${fmt(S.xSpan, S.xSpan < 20 ? 1 : 0)} m across · range ${fmt(real, 1)} m`;
  text(g, box.x + box.w - 14, box.y + box.h - 16, foot,
       { align: 'right', size: 13, col: PL.inkMid });
  // Only a frame that KEEPS its exposures has a flash rate worth quoting.
  if (panes.length === 1 && panes[0].ghosts && shot) {
    const every = shot.dt * shot.stride;
    text(g, box.x + box.w - 14, box.y + 18, `Flash every ${fmt(every, every < 0.1 ? 3 : 2)} s`,
         { align: 'right', size: 13, col: PL.inkFaint });
  }
}

/** Put the pair label on a mid-flight pair, on a leader, clear of the lines. */
function labelPair(g, pair, last, scenario, box) {
  const mid = pair.filter((s) => s.b && s.drawn && Math.abs(s.a.x - s.b.x) > 110);
  const s = mid.length ? mid[Math.floor(mid.length * 0.45)] : last;
  if (!s?.b) return;
  const cx = (s.a.x + s.b.x) / 2, cy = s.a.y;
  const ly = clamp(cy - 46, box.y + 30, box.y + box.h - 30);
  g.save(); g.globalAlpha = 0.55; g.strokeStyle = PL.ink; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, ly + 13); g.stroke(); g.restore();
  pill(g, cx, ly, scenario.pairLabel || 'same height');
}

/** In the jungle the projectile is a banana and the second object is a monkey. */
function bananaOrMonkey(g, x, y, L, ang, lit, isBanana, hang = false) {
  if (isBanana) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath();
    g.moveTo(-L * 0.5, L * 0.16);
    g.quadraticCurveTo(0, -L * 0.42, L * 0.5, L * 0.1);
    g.quadraticCurveTo(0, -L * 0.1, -L * 0.5, L * 0.16);
    g.closePath();
    const gr = g.createLinearGradient(0, -L * 0.3, 0, L * 0.2);
    gr.addColorStop(0, PL.brassHi); gr.addColorStop(1, PL.brass);
    g.fillStyle = gr; g.fill();
    if (lit) { g.strokeStyle = PL.brassLo; g.lineWidth = Math.max(0.6, L * 0.05); g.stroke(); }
    g.restore();
    return;
  }
  monkeyGlyph(g, x, y, L * 0.95, lit, hang);
}

/* ── the monkey ─────────────────────────────────────────────────────────
   IT HAS TO READ AS AN ANIMAL LETTING GO OF A BRANCH. The glyph this
   replaces was a grey body, a grey head and four grey sticks — a spider, at
   any size, and on a lit canopy it read as a smudge. The whole scenario turns
   on watching something DROP, and you cannot watch something drop that you
   cannot tell from the leaves behind it.

   So: brown fur against green, a pale face and belly against the fur, a dark
   rim against everything, and limbs that change. Hanging, one arm is up and
   gripping and the body swings under it. Falling, both arms are up and the
   legs are out — the shape of something that has just lost its grip, which is
   the instant the plate exists to show.

   `hang` is the grip; `lit` is the last exposure, where the fur is lit and
   the earlier ghosts are not. */
export function monkeyGlyph(g, x, y, s, lit, hang = false) {
  const FUR = lit ? '#7d5431' : '#5e4026';
  const FUR_D = lit ? '#573821' : '#432b19';
  const SKIN = lit ? '#d6a873' : '#9c7c58';
  const SKIN_HI = lit ? '#efcf9f' : '#b09372';
  const RIM = 'rgba(26,16,8,0.92)';

  const b = s * 0.3;                                   // body half-width
  const bodyY = y + s * 0.06;
  const headY = bodyY - b * 1.42;
  const hd = s * 0.25;                                 // head radius

  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';

  /* ── tail: a long curl, drawn first so it sits behind ─────────────── */
  g.strokeStyle = RIM; g.lineWidth = Math.max(2.4, s * 0.115);
  g.beginPath();
  g.moveTo(x + b * 0.5, bodyY + b * 0.5);
  g.quadraticCurveTo(x + b * 2.3, bodyY + b * 0.9, x + b * 2.0, bodyY - b * 0.6);
  g.stroke();
  g.strokeStyle = FUR; g.lineWidth = Math.max(1.2, s * 0.062);
  g.beginPath();
  g.moveTo(x + b * 0.5, bodyY + b * 0.5);
  g.quadraticCurveTo(x + b * 2.3, bodyY + b * 0.9, x + b * 2.0, bodyY - b * 0.6);
  g.stroke();

  /* ── limbs ────────────────────────────────────────────────────────────
     Hanging: the near arm goes straight up to the branch and the legs tuck.
     Falling: both arms up and back, legs out — it has just let go. */
  const limbs = hang
    ? [[-b * 0.72, -b * 0.2, -b * 0.3, -b * 2.15],     // gripping arm, up
       [b * 0.72, -b * 0.2, b * 1.5, -b * 0.5],        // far arm, out
       [-b * 0.42, b * 0.85, -b * 0.7, b * 1.75],
       [b * 0.42, b * 0.85, b * 0.78, b * 1.72]]
    : [[-b * 0.72, -b * 0.2, -b * 1.75, -b * 1.5],     // both arms thrown up
       [b * 0.72, -b * 0.2, b * 1.7, -b * 1.55],
       [-b * 0.42, b * 0.85, -b * 1.35, b * 1.8],
       [b * 0.42, b * 0.85, b * 1.4, b * 1.78]];
  for (const pass of [0, 1]) {
    g.strokeStyle = pass ? FUR : RIM;
    g.lineWidth = pass ? Math.max(1.6, s * 0.085) : Math.max(3, s * 0.155);
    for (const [ax, ay, ex, ey] of limbs) {
      g.beginPath();
      g.moveTo(x + ax, bodyY + ay);
      g.quadraticCurveTo(x + (ax + ex) * 0.5 + (ex - ax) * 0.18,
                         bodyY + (ay + ey) * 0.5, x + ex, bodyY + ey);
      g.stroke();
    }
  }
  // hands and feet
  g.fillStyle = SKIN;
  for (const [, , ex, ey] of limbs) {
    g.beginPath(); g.arc(x + ex, bodyY + ey, Math.max(1.3, s * 0.062), 0, Math.PI * 2); g.fill();
  }

  /* ── body ─────────────────────────────────────────────────────────── */
  g.strokeStyle = RIM; g.lineWidth = Math.max(2, s * 0.1);
  g.fillStyle = FUR;
  g.beginPath(); g.ellipse(x, bodyY, b * 0.84, b * 1.06, 0, 0, Math.PI * 2);
  g.fill(); g.stroke();
  g.fillStyle = SKIN;                                   // belly
  g.beginPath(); g.ellipse(x, bodyY + b * 0.16, b * 0.5, b * 0.68, 0, 0, Math.PI * 2); g.fill();

  /* ── head ─────────────────────────────────────────────────────────── */
  g.fillStyle = FUR_D; g.strokeStyle = RIM; g.lineWidth = Math.max(2, s * 0.1);
  for (const sx of [-1, 1]) {                           // ears
    g.beginPath(); g.arc(x + sx * hd * 0.94, headY - hd * 0.1, hd * 0.42, 0, Math.PI * 2);
    g.fill(); g.stroke();
  }
  g.fillStyle = FUR;
  g.beginPath(); g.arc(x, headY, hd, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = SKIN_HI;                                // face
  g.beginPath(); g.ellipse(x, headY + hd * 0.16, hd * 0.68, hd * 0.74, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = SKIN;                                   // muzzle
  g.beginPath(); g.ellipse(x, headY + hd * 0.46, hd * 0.42, hd * 0.3, 0, 0, Math.PI * 2); g.fill();
  if (s > 13) {                                         // eyes, once there is room
    g.fillStyle = '#20140a';
    for (const sx of [-1, 1]) {
      g.beginPath(); g.arc(x + sx * hd * 0.3, headY - hd * 0.06, Math.max(1, hd * 0.12),
                           0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#20140a'; g.lineWidth = Math.max(0.8, hd * 0.07);
    g.beginPath(); g.moveTo(x - hd * 0.14, headY + hd * 0.5);
    g.quadraticCurveTo(x, headY + hd * 0.62, x + hd * 0.14, headY + hd * 0.5); g.stroke();
  }
  g.restore();
}
