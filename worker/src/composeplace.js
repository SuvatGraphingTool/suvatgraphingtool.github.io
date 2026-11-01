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
   The app draws what moves (js/compose/registry.js figureOf). This makes sure
   the reading says what that is, from the question's own words when the model
   left it out, and reads a person who JUMPS with no angle given the way exam
   questions mean it: straight up, θ = 90 — marked `assumed`, so the reply
   says so. Nothing is calculated: an angle the question did not give is set
   to the one it means, and said. */
const PERSON = /\b(divers?|person|man|woman|boy|girl|child|athlete|jumper|swimmer|gymnast|acrobat|skateboarder|skier|student)\b/i;
const JUMP = /\b(jump|jumps|jumped|jumping|leaps?|leapt|springs|sprang)\b/i;
const ANGLE_SAID = /°|\bdegrees?\b|\bangle\b|horizontal|vertical|upward|downward|straight (up|down)|\b(tan|sin|cos)\b|\bflat\b|\bacross\b/i;
const LAUNCHES = new Set(['dropped', 'down', 'platform', 'platform-angle', 'platform-down', 'up', 'arc']);
const isNum = (v) => typeof v === 'number' && isFinite(v);

export function toFigure(x, words = '') {
  if (!x || typeof x !== 'object' || !x.understood) return x;
  const text = `${words} ${x.summary || ''}`;
  const out = { ...x };
  if (!out.who) { const m = text.match(PERSON); if (m) out.who = m[1].toLowerCase(); }
  // "no angle given" says there is none
  const said = String(words || text).replace(/\b(no|without an?|not given an?|unknown)\s+(launch\s+)?angle\b[^.,;]*/gi, '');
  if (!(JUMP.test(text) && PERSON.test(`${out.who || ''} ${text}`) && !ANGLE_SAID.test(said))) return out;
  if (LAUNCHES.has(out.scenario) && isNum(out.u) && out.u > 0 && !out.ratioFn) {
    out.scenario = 'up'; out.angleDegrees = 90; delete out.belowHorizontal; out.assumed = ['angle'];
  } else if (out.scenario === 'library' && out.library === 'from-a-height' && out.boxes && isNum(out.boxes.u) && out.boxes.u > 0) {
    out.boxes = { ...out.boxes, theta: 90 }; out.assumed = ['angle'];
  } else if (out.scenario === 'compose' && out.recipe?.engine === 'projectile' && isNum(out.recipe.numbers?.u) && out.recipe.numbers.u > 0) {
    out.recipe = { ...out.recipe, numbers: { ...out.recipe.numbers, theta: 90 } }; out.assumed = ['angle'];
  }
  return out;
}
