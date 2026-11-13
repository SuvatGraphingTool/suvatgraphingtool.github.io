// standins.js — the art for js/render/standin.js: the object a question names,
// drawn where a shared figure would have been.
//
// A person or a vehicle the app has by hand is drawn by hand; anything else comes
// down the composer's ladder (js/compose/pictures.js): an icon, a drawing, its name on
// a clean shape. An exam's "ball" or "particle" is no one's object: nothing stands in.

import { figureOf } from './registry.js';
import { thingName, isPerson } from './things.js';
import { entryOf } from './pictures.js';
import { FIGURES as ROAD, drawFigure } from '../render/figures.js';
import { drawThing, below, restAngle, contact } from '../render/thing.js';
import { palette } from '../render/util.js';

const GENERAL = new Set(['ball', 'stone', 'particle']);
/** Figures whose (x, y) is the front of it, on the ground: the rest are centred. */
const ON_GROUND = new Set(['lorry', 'car', 'train', 'cyclist', 'motorcycle', 'runner']);

/**
 * What stands in for a question's `who`, or null when the stage's own figure will do.
 * @returns {{ draw, word: string, figure: string|null, thing: string|null }|null}
 */
export function standInFor(who) {
  if (typeof who !== 'string' || !who.trim()) return null;
  const f = figureOf(who), name = thingName(who);
  if (!f.figure || GENERAL.has(f.figure) || !name) return null;
  // someone, in the app's word for someone; a figure on the road, as itself
  const figure = isPerson(name) || f.figure === 'diver' ? 'runner' : ROAD[f.figure] ? f.figure : null;
  if (figure) return { word: name, figure, thing: null, draw: (kind, g, x, y, size, o) => handBuilt(figure, kind, g, x, y, size, o) };
  return { word: name, figure: null, thing: name, draw: (kind, g, x, y, size, o) => picture(name, kind, g, x, y, size, o) };
}

/** The hand-built figure asked for, where the stage would have drawn another. */
function handBuilt(figure, kind, g, x, y, size, o) {
  if (kind === figure) return false;              // it is already what the question says
  const round = !ON_GROUND.has(kind), r = o.r ?? size / 2;
  const L = round ? Math.max(46, r * 5) : Math.max(46, size), { dir = 1, ring = null, phase = 0, airborne = round } = o;
  // (a person's x is their middle, a vehicle's its front)
  const front = figure === 'runner' ? 0 : (dir * L) / 2;
  drawFigure(g, figure, round ? x + front : x, round ? y + r : y, L, palette(), { dir, ring, phase, airborne });
  return true;
}

/** Its picture, easy to read and in proportion with the stage, resting where what it replaces rested. */
function picture(name, kind, g, x, y, size, { dir = 1, ring = null, airborne = false, r = null } = {}) {
  const E = entryOf(name), ang = restAngle(E);
  // (a mirrored picture is the same object going the other way; mirrored words are not)
  const look = { sx: E.img && dir < 0 ? -1 : 1, ring };
  if (ON_GROUND.has(kind)) {
    const px = Math.max(44, Math.min(96, size * 0.85));
    // the stage's x is the front of a vehicle, the middle of a person
    const cx = kind === 'runner' ? x : x - (dir * Math.min(size, 130)) / 2;
    if (!airborne) contact(g, cx, y, px, 0);
    drawThing(g, E, cx, y - below(g, E, px, ang), px, ang, look);
    return true;
  }
  // a ball is turned as it rolls, and spun as it flies; this is not, and it stays the
  // way up it was drawn. Its lowest point goes where the ball's was: it touches down,
  // and is never half buried.
  const rr = r ?? size / 2, px = Math.max(40, rr * 2.6);
  g.save();
  const m = g.getTransform(), s = Math.hypot(m.a, m.b), c = Math.hypot(m.c, m.d) / s;
  const px0 = m.a * x + m.c * y + m.e, py0 = m.b * x + m.d * y + m.f;
  g.setTransform(s, 0, 0, s, px0, py0);
  drawThing(g, E, 0, (rr - below(g, E, px, ang)) * Math.min(1, c || 1), px, ang, look);
  g.restore();
  return true;
}
