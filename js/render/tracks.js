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
export const OWN_PATH = new Set(['road', 'over-the-wall', 'bounce', 'in-the-air-over-a-wall', 'from-the-bridge', 'higher-than-far', 'change-of-course', 'into-soft-ground', 'back-off-the-boards', 'down-the-ice', 'over-the-rock', 'from-a-height', 'catch-it', 'two-in-a-plane', 'off-the-bench', 'wall-in-a-letter', 'do-they-collide', 'two-moments', 'thrown-towards']);

const NEAR = 11;           // px either side of the line that still counts as on it
const GAP = 140;           // px between frames that means a jump, not a motion
const key = (c) => `${Math.round(c.clientWidth)}x${Math.round(c.clientHeight)}`;

/** The lines of things that really went somewhere: what only stands by has no trajectory. */
export const moving = (T) => T.lines.filter((l) => l.length > 2);

/** Forget the trajectory: a new motion, or a stage laid out afresh at a new size. */
export function resetTracks(canvas) { canvas._tracks = null; }

const toPlace = (c, q) => { const v = c._view; return v ? { x: (q.x - v.tx) / v.s, y: (q.y - v.ty) / v.s } : { x: q.x, y: q.y }; };
const toScreen = (c, p) => { const v = c._view; return v ? { x: p.x * v.s + v.tx, y: p.y * v.s + v.ty } : { x: p.x, y: p.y }; };

/** Keep where what moves was drawn on this frame, at clock time t. */
export function recordTracks(canvas, motion, t) {
  let T = canvas._tracks;
  if (!T || T.motion !== motion || T.size !== key(canvas)) T = canvas._tracks = { motion, size: key(canvas), lines: [], last: -1 };
  // a replay or a scrub back goes over what is already known
  if (!(t > T.last)) return;
  // what the stage says moves; an arrow's tail only for a stage that says nothing else
  const own = movers.list.filter((q) => !q.arrow), strong = own.filter((q) => q.strong);
  const list = strong.length ? strong : own.length ? own : movers.list;
  // each followed by where it was last, never by its place in the list: arrows and
  // objects come and go as the motion runs
  const free = new Set(T.lines);
  for (const q of list) {
    const p = toPlace(canvas, q);
    let line = null, near = GAP;
    for (const l of free) { const e = l.at(-1), d = Math.hypot(e.x - p.x, e.y - p.y); if (d < near) { near = d; line = l; } }
    if (!line) { T.lines.push([{ ...p, t }]); continue; }
    free.delete(line);
    if (near < 1.5) line.at(-1).t = t; else line.push({ ...p, t });
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
