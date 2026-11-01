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

const PLACES = [
  [/\b(tower|building|block of flats|skyscraper|church|lighthouse|cliff-top tower)\b/i, 'tower'],
  [/\b(house|roof|window of a house|bedroom window)\b/i, 'house'],
  [/\b(sports hall|gym(nasium)?|hall)\b/i, 'hall'],
];
const ENGINE = { 'pair-vertical': 'pair', bounce: 'bounce' };
const BOXES = {
  pair: ['A.h', 'A.u', 'A.t0', 'B.h', 'B.u', 'B.t0', 'g'],
  bounce: ['start', 'h', 'U', 'V', 'w', 'H', 'e', 'T', 'n', 'y', 'stop', 'axis', 'g'],
};
/** The library scenario's answer keys, as the composed engine names the same answer. */
const KEYS = {
  pair: { height: 'height', speed: 'speed3', time1: 'time1', time2: 'time2' },
  bounce: { speed1: 'speed1', speed2: 'speed2', time: 'time3', height1: 'height1' },
};
const TITLE = { pair: { tower: 'Two by a tower', house: 'Two by a house', hall: 'Two in a sports hall' },
  bounce: { tower: 'A ball bouncing by a tower', house: 'A ball off a roof, bouncing', hall: 'A ball bouncing in a sports hall' } };

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
