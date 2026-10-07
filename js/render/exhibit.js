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
// ONE FRAME, SQUEEZED SIDEWAYS. The beach keeps this. The banana and the
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
// The stage itself is a dark plate in both themes, because this is a
// photograph: a strobe lamp firing every 50 ms in a blacked-out room. Light
// mode changes the page around it, not the plate.

import { fitCanvas, palette, fmt, clamp, labels } from './util.js';
import { warehouseBack, beachBack, EXTENT } from './backdrops.js';

export const PALM_H = 12.5;      // the tree is a tree, not a function of the monkey

const PLATE = {
  ink: '#f2efe9', inkMid: 'rgba(242,239,233,0.62)', inkFaint: 'rgba(242,239,233,0.34)',
  bg0: '#1c1b18', bg1: '#0e0e0c',
  rule: 'rgba(242,239,233,0.26)', ruleFaint: 'rgba(242,239,233,0.13)',
  brass: '#c6a02e', brassHi: '#f3dd96', brassLo: '#6d5415',
  lead: '#a8adb2', leadHi: '#e7ebee', leadLo: '#4a4f54',
  glow: 'rgba(255,238,196,0.17)',
  pill: '#f6f3ec', pillInk: '#17160f',
};

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
   squeeze and the plate prints it. This is what the beach uses.

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
  // the tree stands beside the monkey, so the frame has to hold it too
  if (markers?.target) {
    xHi = Math.max(xHi, markers.target.x + 4.5);
    // THE FRAME HOLDS THE PHYSICS, AND AS MUCH TREE AS IT TAKES TO READ AS A
    // TREE. It used to hold the whole palm — PALM_H + 1.4, so 13.9 m — and
    // the palm is taller than anything the physics touches, which put about
    // six metres of empty sky above a demonstration happening at nine. The
    // crown is allowed to run out of the top now.
    //
    // What it must NOT do is tie the frame to the monkey's height, which is
    // what backdrops.js warns about: the tree would change height every time
    // the monkey was dragged and the one fixed object in the picture would
    // stop being fixed. The floor here is a constant, so the tree stands at
    // PALM_H whatever the monkey does — it is only the CROP that moves.
    yHi = Math.max(f.apexHeight, f.params.h, markers.target.y + 2.2, PALM_H * 0.62);
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
  const groundY = rect.y + rect.h * 0.92;
  return {
    sx, sy, kx, xLo, xHi, yHi, groundY, originX,
    xSpan: xHi - xLo,                                  // metres actually in view
    X: (x) => originX + x * sx,
    Y: (y) => groundY - y * sy,
    m: (v) => v * sy,                                  // metres → px, vertically
    mx: (v) => v * sx,                                 // metres → px, horizontally
  };
}

/* ── the plate ─────────────────────────────────────────────────────────── */
function plate(g, w, h, pad) {
  const x = pad.l - 18, y = pad.t - 18, pw = w - x - (pad.r - 18), ph = h - y - (pad.b - 18);
  g.save();
  round(g, x, y, pw, ph, 14); g.clip();
  const bg = g.createLinearGradient(0, y, 0, y + ph);
  bg.addColorStop(0, PLATE.bg0); bg.addColorStop(1, PLATE.bg1);
  g.fillStyle = bg; g.fillRect(x, y, pw, ph);
  // a soft vignette, so the corners fall away like a real exposure
  const v = g.createRadialGradient(x + pw * 0.42, y + ph * 0.42, 0, x + pw * 0.5, y + ph * 0.5, pw * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.42)');
  g.fillStyle = v; g.fillRect(x, y, pw, ph);
  return { x, y, w: pw, h: ph };
}

/* ── sprites ───────────────────────────────────────────────────────────── */

/** A round, drawn along its own velocity so it reads as a bullet, not a dot. */
function bullet(g, x, y, L, ang, lit) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const W = Math.max(2.6, L * 0.40);
  const body = g.createLinearGradient(0, -W / 2, 0, W / 2);
  body.addColorStop(0, PLATE.brassHi); body.addColorStop(0.45, PLATE.brass); body.addColorStop(1, PLATE.brassLo);
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
    g.strokeStyle = PLATE.brassLo; g.lineWidth = Math.max(0.7, L * 0.045);
    g.beginPath(); g.moveTo(-L * 0.2, -W * 0.46); g.lineTo(-L * 0.2, W * 0.46); g.stroke();
    g.strokeStyle = PLATE.brassHi; g.lineWidth = Math.max(0.6, L * 0.05); g.globalAlpha = 0.9;
    g.beginPath(); g.moveTo(L * 0.3, -W * 0.2); g.lineTo(-L * 0.36, -W * 0.3); g.stroke();
  }
  g.restore();
}

/** The flash halo. This is what makes it read as a photograph. */
function halo(g, x, y, r) {
  const gl = g.createRadialGradient(x, y, 0, x, y, r);
  gl.addColorStop(0, PLATE.glow); gl.addColorStop(0.55, 'rgba(255,238,196,0.06)');
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

function pill(g, x, y, text, size = 14) {
  g.save();
  g.font = `600 ${size}px ${getComputedStyle(document.documentElement).getPropertyValue('--font') || 'system-ui'}`;
  const tw = g.measureText(text).width, pw = tw + 22, ph = size + 15;
  round(g, x - pw / 2, y - ph / 2, pw, ph, ph / 2);
  g.fillStyle = PLATE.pill; g.fill();
  g.fillStyle = PLATE.pillInk; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x, y + 0.5);
  g.restore();
}

function text(g, x, y, s, { col = PLATE.inkMid, size = 13, align = 'left', weight = 500 } = {}) {
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

function planPanes(o, box, rect) {
  const { scenario, traj: f, second, t, overview } = o;
  const single = (ghosts) => [{
    box, S: stage(o, rect), only: null, rule: true, ghosts, label: null,
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
    g.strokeStyle = PLATE.ruleFaint; g.lineWidth = 1;
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
  g.setLineDash([3, 5]); g.lineWidth = 1.3; g.strokeStyle = PLATE.ink;
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
         { align: 'center', size: 13, col: PLATE.ink, weight: 600 });
  }
}

/* ══ the renderer ═══════════════════════════════════════════════════════ */
export function render(canvas, cam, o) {
  const { traj: f, second, t, show, scenario, fired = true, verdict = null } = o;
  if (!f) return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const L = labels();
  const pad = { l: 34, r: 34, t: 30, b: 54 };
  const box = plate(g, w, h, pad);
  const rect = { x: pad.l, y: pad.t, w: w - pad.l - pad.r, h: h - pad.t - pad.b };

  const panes = planPanes(o, box, rect);
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
           { align: 'center', size: 13, col: PLATE.ink, weight: 600 });
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

  const back = scenario.backdrop === 'beach' ? beachBack : warehouseBack;
  back(g, S, box, { t, fired, markers, PLATE,
                    launchY: f.params.h, theta: f.params.theta });

  /* ── ground line ──────────────────────────────────────────────────── */
  g.strokeStyle = PLATE.rule; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(box.x, S.groundY + 3.5); g.lineTo(box.x + box.w, S.groundY + 3.5); g.stroke();

  /* ── height rule down the right ───────────────────────────────────── */
  if (pane.rule) {
    const rx = box.x + box.w - 30;
    g.strokeStyle = PLATE.ruleFaint; g.lineWidth = 1;
    g.beginPath(); g.moveTo(rx, S.Y(S.yHi * 1.02)); g.lineTo(rx, S.groundY); g.stroke();
    const stepY = S.yHi > 24 ? 10 : S.yHi > 9 ? 5 : S.yHi > 3.5 ? 1 : 0.5;
    for (let y = 0; y <= S.yHi * 1.02; y += stepY / 2) {
      const major = Math.abs(y / stepY - Math.round(y / stepY)) < 1e-9;
      g.beginPath(); g.moveTo(rx - (major ? 9 : 5), S.Y(y)); g.lineTo(rx, S.Y(y)); g.stroke();
      if (major && y > 0) text(g, rx - 13, S.Y(y), `${fmt(y, stepY < 1 ? 1 : 0)} m`,
                              { align: 'right', size: 13, col: PLATE.inkMid });
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
  const Lbul = clamp(gapPx * 0.72, 9, scenario.backdrop === 'beach' ? 30 : 20);
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
      if (scenario.backdrop === 'beach') bananaOrMonkey(g, px, py, Lbul, ang, last, true);
      else bullet(g, px, py, Lbul, ang, last);
      g.restore();
    }

    let qp = null, drewB = false;
    if (second) {   // drawn second, so it sits in front of the tree behind it
      const q = second.pos(Math.min(ti, second.tMax));
      const qx = S.X(q.x), qy = S.Y(q.y);
      const Lsec = scenario.backdrop === 'beach' ? Math.max(Lbul, 26) : Lbul;
      if (wantB && (last || i % stride === 0)) {
        drewB = true;
        g.save(); g.globalAlpha = a;
        halo(g, qx, qy, Lsec * (last ? 1.7 : 1.1));
        if (scenario.backdrop === 'beach') bananaOrMonkey(g, qx, qy, Lsec, Math.PI / 2, last, false);
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
    if (shots[s.i] > grounded + 1e-9) continue;       // it has landed; no shared fall left
    if (!s.drawn && !s.last) continue;                // no line to an exposure nobody can see
    g.globalAlpha = s.last ? 0.95 : 0.6;
    g.strokeStyle = PLATE.ink;                       // near-white: this is the point
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
  } else if (last?.b && gap > 90) {
    labelPair(g, pair, last, scenario, box);
  } else if (last?.b && gap < 14 && done) {
    // they have met. Say so where it happened, not in a corner.
    const cx = (last.a.x + last.b.x) / 2, cy = (last.a.y + last.b.y) / 2;
    halo(g, cx, cy, 34);
    // offset the label clear of the catch itself — a pill over the moment it
    // is naming hides the only thing worth looking at
    const side = cx > box.x + box.w * 0.55 ? -1 : 1;
    const lx = clamp(cx + side * 150, box.x + 90, box.x + box.w - 90);
    g.save(); g.globalAlpha = 0.5; g.strokeStyle = PLATE.ink; g.lineWidth = 1.1;
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
      : `No squeeze — 1 m is 1 m both ways · range ${fmt(real, 1)} m`;
  text(g, box.x + box.w - 14, box.y + box.h - 16, foot,
       { align: 'right', size: 13, col: PLATE.inkMid });
  // Only a frame that KEEPS its exposures has a flash rate worth quoting.
  if (panes.length === 1 && panes[0].ghosts && shot) {
    const every = shot.dt * shot.stride;
    text(g, box.x + box.w - 14, box.y + 18, `Flash every ${fmt(every, every < 0.1 ? 3 : 2)} s`,
         { align: 'right', size: 13, col: PLATE.inkFaint });
  }
}

/** Put the pair label on a mid-flight pair, on a leader, clear of the lines. */
function labelPair(g, pair, last, scenario, box) {
  const mid = pair.filter((s) => s.b && s.drawn && Math.abs(s.a.x - s.b.x) > 110);
  const s = mid.length ? mid[Math.floor(mid.length * 0.45)] : last;
  if (!s?.b) return;
  const cx = (s.a.x + s.b.x) / 2, cy = s.a.y;
  const ly = clamp(cy - 46, box.y + 30, box.y + box.h - 30);
  g.save(); g.globalAlpha = 0.55; g.strokeStyle = PLATE.ink; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, ly + 13); g.stroke(); g.restore();
  pill(g, cx, ly, scenario.pairLabel || 'same height');
}

/** On the beach the projectile is a banana and the second object is a monkey. */
function bananaOrMonkey(g, x, y, L, ang, lit, isBanana) {
  if (isBanana) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath();
    g.moveTo(-L * 0.5, L * 0.16);
    g.quadraticCurveTo(0, -L * 0.42, L * 0.5, L * 0.1);
    g.quadraticCurveTo(0, -L * 0.1, -L * 0.5, L * 0.16);
    g.closePath();
    const gr = g.createLinearGradient(0, -L * 0.3, 0, L * 0.2);
    gr.addColorStop(0, PLATE.brassHi); gr.addColorStop(1, PLATE.brass);
    g.fillStyle = gr; g.fill();
    if (lit) { g.strokeStyle = PLATE.brassLo; g.lineWidth = Math.max(0.6, L * 0.05); g.stroke(); }
    g.restore();
    return;
  }
  monkeyGlyph(g, x, y, L * 0.95, lit);
}

/** A monkey, at a size you can actually see. */
export function monkeyGlyph(g, x, y, s, lit) {
  const b = s * 0.34, hd = s * 0.26;
  g.save();
  // a dark edge first, so the shape survives whatever it is drawn over
  g.strokeStyle = 'rgba(12,10,8,0.85)'; g.lineWidth = Math.max(2, s * 0.14);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.ellipse(x, y, b * 0.82, b, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(x, y - b - hd * 0.6, hd, 0, Math.PI * 2); g.stroke();
  g.fillStyle = lit ? '#9aa7b4' : '#6f7985';
  g.beginPath(); g.ellipse(x, y, b * 0.82, b, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x, y - b - hd * 0.6, hd, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x - hd, y - b - hd * 0.75, hd * 0.44, 0, Math.PI * 2);
  g.arc(x + hd, y - b - hd * 0.75, hd * 0.44, 0, Math.PI * 2); g.fill();
  g.fillStyle = lit ? '#d9e2ea' : '#9aa4af';
  g.beginPath(); g.ellipse(x, y - b - hd * 0.45, hd * 0.6, hd * 0.48, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = lit ? '#9aa7b4' : '#6f7985';
  g.lineWidth = Math.max(1.4, s * 0.1); g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - b * 0.6, y - b * 0.2); g.lineTo(x - b * 1.6, y - b * 1.3);
  g.moveTo(x + b * 0.6, y - b * 0.2); g.lineTo(x + b * 1.6, y - b * 1.3);
  g.moveTo(x - b * 0.4, y + b * 0.8); g.lineTo(x - b * 0.8, y + b * 1.8);
  g.moveTo(x + b * 0.4, y + b * 0.8); g.lineTo(x + b * 0.8, y + b * 1.8);
  g.stroke();
  g.restore();
}
