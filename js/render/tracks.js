// tracks.js — every moving thing leaves its trajectory, and all of it resolves.
//
// The user, 8 Nov: "the entire line should be able to resolve anywhere on the
// trajectory after its first run … check every scenario and make it a rule."
// So it is one rule, not one fix a stage. As a motion plays, each stage already
// says where it drew what moves (noteMover, js/render/util.js). This keeps those
// points with their times: that IS the trajectory, wherever and however the stage
// draws it. It is drawn (unless the stage draws its own path), and any point on it
// answers a hover and a click with Resolve at that moment. No physics here: only
// where things were drawn, and when (rule 4). The times are the engine's clock.

import { movers, palette } from './util.js';

/* Stages whose own drawing already shows the path, so a second line would only
   double it. Found by measuring what each stage draws (test/tracks.test.mjs); a
   new stage not listed simply gets the line. */
export const OWN_PATH = new Set(['road', 'over-the-wall', 'bounce', 'in-the-air-over-a-wall', 'from-the-bridge', 'higher-than-far', 'change-of-course', 'into-soft-ground', 'back-off-the-boards', 'down-the-ice', 'over-the-rock', 'from-a-height', 'catch-it', 'two-in-a-plane', 'off-the-bench', 'wall-in-a-letter', 'do-they-collide', 'two-moments', 'thrown-towards', 'vectors-ij', 'pushed-by-a-force']);

const NEAR = 11;           // px either side of the line that still counts as on it
const GAP = 140;           // px between frames that means a jump, not a motion
const key = (c) => `${Math.round(c.clientWidth)}x${Math.round(c.clientHeight)}`;

/** The lines of things that really went somewhere: what only stands by has no trajectory. */
export const moving = (T) => T.lines.filter((l) => l.length > 2);

/** Forget the trajectory: a new motion, or a stage laid out afresh at a new size. */
export function resetTracks(canvas) { canvas._tracks = null; }

/* A POINT IS KEPT WHERE IT IS IN THE PLACE, so the line stays on the place through a
   pan and a zoom (`_view`) and through a stage whose own camera moves as the motion
   runs (`_frame`, the road that scrolls with the car, the plane that widens: the stage
   says it each frame). A stage's frame is { s, x, y }: screen = place × s + (x, y). */
// (`_shown`: the view the stage was just drawn with, which the stage has handed back)
const toPlace = (c, q) => {
  const v = c._view || c._shown, f = c._frame;
  const x = v ? (q.x - v.tx) / v.s : q.x, y = v ? (q.y - v.ty) / v.s : q.y;
  return f ? { x: (x - f.x) / f.s, y: (y - f.y) / f.s } : { x, y };
};
const toScreen = (c, p) => {
  const v = c._view || c._shown, f = c._frame;
  const x = f ? p.x * f.s + f.x : p.x, y = f ? p.y * f.s + f.y : p.y;
  return v ? { x: x * v.s + v.tx, y: y * v.s + v.ty } : { x, y };
};

/**
 * The moments still to be drawn, unseen, to keep the line whole, a few a frame: the
 * stage is laid out afresh at a new size (the Display panel opening, a window turned)
 * and the points are in the old layout, or the student has scrubbed ahead of where the
 * first run has got to, and a straight line across the gap would not be its path. The
 * app draws the stage at each of them and records it, before the frame it shows.
 * @returns the times, or null
 */
export function tracksToFill(canvas, motion, t, tMax, n = 6) {
  let T = canvas._tracks;
  const size = key(canvas);
  if (!T || T.motion !== motion) T = canvas._tracks = { motion, size, lines: [], last: -1, fill: null };
  else if (T.size !== size) T = canvas._tracks = { motion, size, lines: [], last: -1, fill: T.fill || T.last > 0 ? { to: T.fill?.to ?? T.last } : null };
  if (!(tMax > 0)) return null;
  if (!T.fill && t - Math.max(T.last, 0) > tMax / 60) T.fill = { to: t };
  if (!T.fill) return null;
  const step = tMax / 120, out = [];
  for (let u = Math.max(T.last, -step) + step; out.length < n; u += step) {
    if (u >= T.fill.to) { out.push(T.fill.to); break; }
    out.push(u);
  }
  return out;
}

/** Keep where what moves was drawn on this frame, at clock time t. `filling`: a moment tracksToFill asked for. */
export function recordTracks(canvas, motion, t, filling = false) {
  let T = canvas._tracks;
  if (!T || T.motion !== motion || T.size !== key(canvas)) T = canvas._tracks = { motion, size: key(canvas), lines: [], last: -1, fill: null };
  if (T.fill && !filling) return;
  if (filling && t >= T.fill.to) T.fill = null;
  // a replay or a scrub back goes over what is already known
  if (!(t > T.last)) return;
  // what the stage says moves; an arrow's tail only for a stage that says nothing else
  const own = movers.list.filter((q) => !q.arrow), strong = own.filter((q) => q.strong);
  const list = strong.length ? strong : own.length ? own : movers.list;
  const unit = canvas._frame?.s || 1;       // how many px a unit of the place is, for the two px tests below
  // each followed by where it was last, never by its place in the list: arrows and
  // objects come and go as the motion runs
  const free = new Set(T.lines);
  for (const q of list) {
    const p = toPlace(canvas, q);
    let line = null, near = GAP / unit;
    for (const l of free) { const e = l.at(-1), d = Math.hypot(e.x - p.x, e.y - p.y); if (d < near) { near = d; line = l; } }
    if (!line) { T.lines.push([{ ...p, t }]); continue; }
    free.delete(line);
    if (near < 1.5 / unit) line.at(-1).t = t; else line.push({ ...p, t });
  }
  T.last = t;
}

/** The nearest point of the trajectory to (x, y) in canvas px, within reach, with its time. */
export function trackAt(canvas, x, y) {
  const T = canvas._tracks;
  if (!T) return null;
  let best = null;
  for (const line of moving(T)) {
    for (let i = 0; i < line.length; i++) {
      const b = toScreen(canvas, line[i]);
      const a = i ? toScreen(canvas, line[i - 1]) : b;
      const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      const u = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 1;
      const qx = a.x + u * dx, qy = a.y + u * dy, d = Math.hypot(x - qx, y - qy);
      if (d < NEAR && (!best || d < best.d)) {
        const t0 = i ? line[i - 1].t : line[i].t;
        best = { x: qx, y: qy, r: 8, d, t: t0 + u * (line[i].t - t0) };
      }
    }
  }
  return best;
}

/** Draw the trajectory so far, in the place's own coordinates, as the stage's view shows it. */
export function drawTracks(canvas) {
  const T = canvas._tracks;
  if (!T) return;
  const g = canvas.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), P = palette();
  g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.strokeStyle = P.disp || P.ink; g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round'; g.globalAlpha = 0.72;
  g.beginPath();
  for (const line of moving(T)) {
    line.forEach((p, i) => { const s = toScreen(canvas, p); if (!i) g.moveTo(s.x, s.y); else g.lineTo(s.x, s.y); });
  }
  g.stroke();
  g.restore();
}
