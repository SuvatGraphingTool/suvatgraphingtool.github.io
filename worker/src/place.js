// place.js — a question that names where the ball starts from is shown THERE.
//
// The twelve draw a drop or a throw from a height on the open pitch. A student
// who says "pushed off a 60 m cliff" expects to see the cliff, and the
// Past-paper library's "from-a-height" draws a cliff, a tower, a bridge, a
// well, a diving board or a balloon to scale, on the same engine. The prompt
// asks the model for it, but the small readers keep reaching for the twelve,
// so the switch is made here, from the words themselves, where it cannot be
// forgotten. Only one ball launched from a height is moved; anything else
// (a ratio angle, a time above a line) is left exactly as it was read.

const PLACES = [
  [/\bcliff/i, 'cliff'], [/\b(tower|building|skyscraper|roof|block of flats)/i, 'tower'],
  [/\bbridge/i, 'bridge'], [/\b(well|mine ?shaft|shaft)\b/i, 'well'],
  [/\b(diving board|springboard|high board)\b/i, 'board'], [/\b(hot.air )?balloon/i, 'balloon'],
];
// the twelve's answer keys, as from-a-height names the same answer
const ANSWER = { top: 'height', flight: 'time', vLand: 'speed', time: 'time', speed: 'speed', height: 'height' };
// each of the twelve's height scenarios, as an angle
const ANGLE = { dropped: () => 0, down: () => -90, platform: () => 0,
  'platform-angle': (x) => x.angleDegrees, 'platform-down': (x) => (x.angleDegrees == null ? null : -Math.abs(x.angleDegrees)),
  up: () => 90 };

const renamed = (parts) => parts.map((p) => {
  const q = { ...p };
  if (q.answer != null) { if (ANSWER[q.answer]) q.answer = ANSWER[q.answer]; else delete q.answer; }
  return q;
});

export function toPlace(x, words = '') {
  // read as from-a-height already: only the twelve's answer names to put right
  if (x?.library === 'from-a-height' && Array.isArray(x.parts)) return { ...x, parts: renamed(x.parts) };
  if (!x || !x.understood || !(x.scenario in ANGLE) || x.ratioFn) return x;
  const text = `${words} ${x.summary || ''}`;
  const hit = PLACES.find(([re]) => re.test(text));
  if (!hit || !(x.h > 0)) return x;
  const theta = ANGLE[x.scenario](x);
  if (theta == null) return x;
  const boxes = { place: hit[1], h: x.h, theta };
  if (x.scenario === 'dropped') boxes.u = 0;
  for (const k of ['u', 's', 'v', 't', 'g']) if (typeof x[k] === 'number' && isFinite(x[k])) boxes[k] = x[k];
  if (x.scenario === 'down' || x.scenario === 'dropped') delete boxes.s;
  const out = { understood: true, confidence: x.confidence, scenario: 'library', library: 'from-a-height',
    summary: x.summary, boxes };
  if (Array.isArray(x.parts)) out.parts = renamed(x.parts);
  return out;
}
