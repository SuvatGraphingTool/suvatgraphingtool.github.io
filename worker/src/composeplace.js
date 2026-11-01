// composeplace.js — two on one vertical line, or a ball that bounces, shown
// in the place the question names.
//
// The library draws these two on stages of their own (pair-vertical, bounce):
// a bare vertical line, a court. When the question says WHERE — "dropped
// from the top of a 40 m tower", "from the roof of a house", "in a sports
// hall" — the student should see that place. The model tends to answer with
// the library scenario all the same, so, as toPlace does for a single throw
// (place.js), this moves such a reading onto a composed scene in code: the
// same boxes (the composer's pair and bounce engines are those very kits),
// the place as the backdrop, the part answer keys renamed to the composed
// engine's. The app checks the recipe against its registry (js/compose/).
//
// Nothing is calculated here: values are moved, never changed (rule 4).

// indoors first ("in the sports hall … a roof 8 m high" is a hall); a roof
// only as a house's or a building's, never a car's
const PLACES = [
  [/\b(sports hall|school hall|indoor hall|gym(nasium)?)\b/i, 'hall'],
  [/\b(tower|building|block of flats|skyscraper|church|lighthouse)\b/i, 'tower'],
  [/\b(house|bungalow|cottage|roof of (a|the) (house|home|building|garage))\b/i, 'house'],
  [/\b(tree|branch)\b/i, 'orchard'],
];
const ENGINE = { 'pair-vertical': 'pair', bounce: 'bounce' };
const BOXES = {
  pair: ['A.h', 'A.u', 'A.t0', 'B.h', 'B.u', 'B.t0', 'g'],
  bounce: ['start', 'h', 'U', 'V', 'w', 'H', 'e', 'T', 'n', 'y', 'stop', 'axis', 'g'],
};
/** The library scenario's answer keys, as the composed engine names the same answer. */
const KEYS = {
  pair: { height: 'height', speed: 'speed3', time1: 'time1', time2: 'time2', graph: 'graph' },
  bounce: { speed1: 'speed1', speed2: 'speed2', time: 'time3', graph: 'graph' },
};
const TITLE = { pair: { tower: 'Two by a tower', house: 'Two by a house', hall: 'Two in a sports hall', orchard: 'Two by a tree' },
  bounce: { tower: 'A ball bouncing by a tower', house: 'A ball off a roof, bouncing', hall: 'A ball bouncing in a sports hall', orchard: 'A ball from a tree, bouncing' } };

/** A library pair-vertical or bounce reading that names its place, composed in that place. */
export function toComposed(x, words = '') {
  if (!x || !x.understood || x.scenario !== 'library' || !ENGINE[x.library] || !x.boxes || typeof x.boxes !== 'object') return x;
  const text = `${words} ${x.summary || ''}`;
  const hit = PLACES.find(([re]) => re.test(text));
  if (!hit) return x;
  const engine = ENGINE[x.library], backdrop = hit[1];
  const numbers = {};
  for (const k of BOXES[engine]) if (x.boxes[k] != null) numbers[k] = x.boxes[k];
  const thing = /\bstone/i.test(text) ? 'stone' : /\bparticle/i.test(text) ? 'particle' : 'ball';
  const objects = engine === 'pair'
    ? [{ figure: thing }, { figure: thing }]
    : [{ figure: thing === 'stone' ? 'ball' : thing }];
  const out = { understood: true, confidence: x.confidence, scenario: 'compose', summary: x.summary,
    recipe: { title: TITLE[engine][backdrop], backdrop, engine, objects, numbers } };
  if (Array.isArray(x.parts)) {
    out.parts = x.parts.map((p) => {
      if (!p || typeof p !== 'object') return p;
      const { answer, ...rest } = p;
      const key = KEYS[engine][answer];
      return key ? { ...rest, answer: key } : rest;
    });
  }
  return out;
}

/* ── what moves, and a jump with no angle ────────────────────────────────
   The app draws what moves (js/compose/registry.js figureOf — the same list
   here, so a person is a person in both). This makes sure the reading says
   what moves, from the question's own words when the model left it out, and
   reads a person who JUMPS with no angle given the way exam questions mean
   it: straight up, θ = 90 — marked `assumed`, so the reply says so. A jump
   "upwards" or "vertically" IS given: straight up, and nothing assumed.
   Nothing is calculated: an angle the question did not give is set to the
   one it means, and said. */
import { figureOf, whoIn } from '../../js/compose/registry.js';

const JUMP = /\b(jump|jumps|jumped|jumping|leaps?|leapt|springs|sprang)\b/i;
const UP = /\b(straight up|upwards?|vertically( up(wards)?)?|directly up)\b/i;
const ANGLE_SAID = /°|\bdegrees?\b|\bangle\b|horizontal|vertical|downward|straight (up|down)|\b(tan|sin|cos)\b|\bflat\b|\bacross\b/i;
// "no angle given", "angle not stated", "an unspecified angle": none given
const NO_ANGLE = /\b(no|without an?|not given an?)\s+(launch\s+)?angle\b[^.,;]*|\bangle\s+(is\s+)?(not\s+(given|stated|known)|unknown|unspecified|unstated)\b|\b(an?\s+)?(unspecified|unknown|unstated)\s+angle\b/gi;
const LAUNCHES = new Set(['dropped', 'down', 'platform', 'platform-angle', 'platform-down', 'up', 'arc']);
const LANDS_ON = /\b(?:hits?|lands?(?: on| in)?|onto|into|falls? (?:on|into)|reaches|bottom(?: of the \w+)? is|below (?:it )?is|at the (?:bottom|foot)(?: of the \w+)?(?: is)?)\s+(?:the\s+|a\s+)?(ground|grass|rocks?|land|sea|ocean|water|river|road|street|beach|sand)\b/i;
const isNum = (v) => typeof v === 'number' && isFinite(v);

export function toFigure(x, words = '') {
  if (!x || typeof x !== 'object' || !x.understood) return x;
  const text = `${words} ${x.summary || ''}`;
  const out = { ...x };
  if (!out.who) { const w = whoIn(text); if (w) out.who = w; }
  // what it lands on, when the words say and the model did not: "hits the
  // ground", "at the bottom is the GROUND, not sea", "lands on the road"
  if (!out.below) { const b = String(words || text).match(LANDS_ON); if (b) out.below = b[1].toLowerCase(); }
  // only a person jumps: what moves says so, not a bystander in the sentence
  if (figureOf(out.who).figure !== 'diver' || !JUMP.test(text)) return out;
  const said = String(words || text).replace(NO_ANGLE, '');
  const up = UP.test(said);
  if (!up && ANGLE_SAID.test(said)) return out;
  const theta = 90, mark = up ? {} : { assumed: ['angle'] };
  if (LAUNCHES.has(out.scenario) && isNum(out.u) && out.u > 0 && !out.ratioFn) {
    Object.assign(out, { scenario: 'up', angleDegrees: theta, ...mark }); delete out.belowHorizontal;
  } else if (out.scenario === 'library' && out.library === 'from-a-height' && out.boxes && isNum(out.boxes.u) && out.boxes.u > 0) {
    Object.assign(out, { boxes: { ...out.boxes, theta }, ...mark });
  } else if (out.scenario === 'compose' && out.recipe?.engine === 'projectile' && isNum(out.recipe.numbers?.u) && out.recipe.numbers.u > 0) {
    Object.assign(out, { recipe: { ...out.recipe, numbers: { ...out.recipe.numbers, theta } }, ...mark });
  }
  return out;
}
