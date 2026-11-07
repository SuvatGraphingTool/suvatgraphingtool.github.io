// thing.js — an object drawn in a scene: its picture, or its name on a shape.
//
// The object is drawn round a point, turned by an angle, `px` long on its longest
// side. It comes from js/compose/pictures.js, measured, so it can be stood on a
// surface exactly at any angle: never half buried, never floating. Nothing here
// is a quantity: an object keeps its own colours, and the label's colours are
// neutral, held away from the physics hues (rule 2). 13 px is the floor (rule 3).

import { reachBelow } from '../compose/pictures.js';
import { softShadow, env } from './scenery.js';

/** Its label's box, for the last rung: wide enough for the name, at 13 px or more. */
function labelBox(g, e, px) {
  const size = Math.max(13, Math.min(17, px * 0.3));
  g.save(); g.font = `700 ${size}px Inter, system-ui, sans-serif`;
  const words = e.shown.split(' ');
  // two lines, if the name is long
  const lines = e.shown.length > 14 && words.length > 1
    ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [e.shown];
  const tw = Math.max(...lines.map((l) => g.measureText(l).width));
  g.restore();
  return { lines, size, w: Math.max(px * 0.8, tw + size * 1.6), h: Math.max(px * 0.5, lines.length * size * 1.25 + size * 1) };
}

/** The last rung: a rounded shape with the object's name on it, made to look meant. */
function label(g, e, px) {
  const { lines, size, w, h } = labelBox(g, e, px), r = Math.min(h / 2, 12), n = env().night;
  const body = g.createLinearGradient(0, -h / 2, 0, h / 2);
  body.addColorStop(0, n ? '#f4f6fa' : '#ffffff'); body.addColorStop(1, n ? '#c9cfd8' : '#dfe4ea');
  g.fillStyle = body; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, r); g.fill();
  g.strokeStyle = 'rgba(20,24,30,0.55)'; g.lineWidth = 1.4; g.stroke();
  // a highlight along the top, so it reads as a thing and not a tooltip
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.roundRect(-w / 2 + 3, -h / 2 + 2.5, w - 6, Math.max(2, h * 0.14), r * 0.5); g.fill();
  g.fillStyle = '#1b1f26'; g.font = `700 ${size}px Inter, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.25 + 0.5));
}

/** The size the last rung really takes, for what is drawn round it. */
export function shapeOf(g, e, px) {
  if (e.img) return { w: px, h: px };
  const { w, h } = labelBox(g, e, px);
  return { w, h };
}

/** Draw it round (x, y), `px` on its longest side, turned by `ang`. */
export function drawThing(g, e, x, y, px, ang = 0, { sx = 1, sy = 1, ring = null, alpha = 1 } = {}) {
  g.save();
  g.translate(x, y); g.rotate(ang); g.scale(sx, sy);
  if (alpha < 1) g.globalAlpha *= alpha;
  if (e.img && e.fit) {
    const D = px / e.fit.long;
    g.drawImage(e.img, -e.fit.cx * D, -e.fit.cy * D, D, D);
  } else label(g, e, px);
  g.restore();
  // told apart from another by a ring, as every figure is
  if (ring) { g.save(); g.strokeStyle = ring; g.lineWidth = 2.4; g.beginPath(); g.arc(x, y, px * 0.62, 0, Math.PI * 2); g.stroke(); g.restore(); }
}

/** How far below its centre it reaches at an angle, in px: what lifts it clear of a surface. */
export function below(g, e, px, ang = 0) {
  if (e.img && e.fit) return reachBelow(e.fit, ang) * px;
  const { w, h } = labelBox(g, e, px);
  return Math.abs(Math.sin(ang)) * w / 2 + Math.abs(Math.cos(ang)) * h / 2;
}

/** The angle it lies at when flat on a surface: its long way along it, or as drawn. */
export const restAngle = (e) => (e.long && e.fit ? flatAngle(e.fit.axis) : 0);
function flatAngle(axis) { let a = -axis; while (a > Math.PI / 2) a -= Math.PI; while (a < -Math.PI / 2) a += Math.PI; return a; }

/** The soft shadow on the surface under it: tight and dark at rest, wide and faint from high up. */
export function contact(g, x, surface, px, height, reach = 300) {
  const q = Math.max(0, Math.min(1, height / Math.max(1, reach)));
  softShadow(g, x, surface + 1, px * (0.42 + 0.25 * q), Math.max(2, px * (0.09 + 0.03 * q)), Math.max(0.15, 0.85 * (1 - q)));
}
