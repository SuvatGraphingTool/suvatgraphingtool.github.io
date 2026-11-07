// sense.test.mjs — proves everyday sentences just work. Run with:
//     node test/sense.test.mjs
//
// The user, 7 Nov: "why does it give me these errors, can't it just use common
// sense". Each sentence goes through the Worker's stages and the composer with
// the WORST reading the model could give: what moves and nothing else, then the
// engine must run. No model is called. Sentences the question asks a value of
// must leave it blank; values the question gives must never be overwritten.

import { toPlace } from '../worker/src/place.js';
import { toComposed, toFigure, namedPlace, fromRest } from '../worker/src/composeplace.js';
import { composeSensibly, heightSensibly, fromReading } from '../js/compose/recipe.js';
import { KITS } from '../js/kits/index.js';

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}`); }
}
const worker = (x, w) => fromRest(namedPlace(toComposed(toPlace(toFigure(x, w), w), w), w), w);
const text = (x) => `${x.words || ''} ${x.summary || ''}`;
/** What the student ends up with, from one reading. */
function play(reading, words) {
  const x = worker(structuredClone(reading), words);
  const scene = x.scenario === 'compose' ? x : fromReading(x, { always: true });
  if (!scene && x.library === 'from-a-height') {
    // as applyLibrary does (js/app.js): From a height's own stage
    const y = heightSensibly(x), K = KITS.height, s = K.solve(K.read({ place: y.boxes.place || 'cliff', ...y.boxes, g: 9.81 }));
    return { ok: !!s?.ok, why: s?.reason, s, boxes: y.boxes, notes: [] };
  }
  if (!scene) return { ok: false, why: `not composed: ${x.scenario}` };
  const c = composeSensibly(scene.recipe, text(x));
  if (!c.ok) return { ok: false, why: c.reason };
  const s = c.kit.solve(c.kit.read(c.boxes));
  return { ok: !!s?.ok, why: s?.reason, c, s, notes: c.scenario.recipe.notes || [], backdrop: c.scenario.recipe.backdrop };
}
const THINGS = ['ball', 'stone', 'book', 'bottle', 'hammer', 'phone', 'apple', 'football', 'coin', 'brick'];
const DROPPED = ['a {} dropped off a rooftop', 'a {} falls off a cliff', 'a {} is dropped from a bridge', 'a {} falls off a table', 'a {} dropped off a shelf', 'can you show a {} dropped from a tower',
  'a {} is let go from the top of a building', 'a {} falls out of a window', 'someone drops a {} off a balcony', 'a {} is dropped'];
const THROWN = ['a {} thrown off a rooftop', 'a {} thrown off a cliff', 'a {} is thrown from a bridge', 'a {} thrown from a tower', 'someone throws a {} off a balcony', 'a {} is thrown', 'a {} is thrown straight up', 'throw a {} up in the air off a roof'];
const READINGS = (word) => [
  ['the model says compose, with nothing', { understood: true, scenario: 'compose', summary: '', recipe: { engine: 'projectile', objects: [{ figure: word }], numbers: {} } }],
  ['the model says compose, with h 0', { understood: true, scenario: 'compose', summary: '', recipe: { engine: 'projectile', backdrop: 'ground', objects: [{ figure: word }], numbers: { h: 0 } } }],
  ['the model says From a height, with nothing', { understood: true, scenario: 'library', library: 'from-a-height', who: word, summary: '', boxes: {} }],
];

console.log('\nEvery sentence runs, whatever little the model gave');
let n = 0, bad = 0;
for (const thing of THINGS) for (const form of [...DROPPED, ...THROWN]) for (const [how, r] of READINGS(thing)) {
  const words = form.replace('{}', thing);
  const got = play(r, words);
  n++;
  if (!got.ok) { bad++; ok(false, `"${words}" — ${how}: ${got.why}`); }
}
ok(bad === 0, `${n - bad} of ${n} sentence-and-reading pairs run`);

console.log('\nThe readings the model most often gives');
for (const [words, r] of [
  ['a ball is dropped', { understood: true, scenario: 'dropped', who: 'ball', summary: 'A ball is dropped.' }],
  ['a ball is thrown', { understood: true, scenario: 'platform', who: 'ball', summary: 'A ball is thrown.' }],
  ['a ball is kicked', { understood: true, scenario: 'arc', who: 'ball', summary: 'A ball is kicked.' }],
  ['a ball is thrown off a cliff', { understood: true, scenario: 'platform', who: 'ball', summary: 'A ball is thrown off a cliff.' }],
]) { const g = play(r, words); ok(g.ok, `"${words}" as ${r.scenario}: ${g.ok ? 'runs' : g.why}`); }

console.log('\nIt says what it chose, and chooses sensibly');
const blank = (backdrop, numbers = {}) => ({ understood: true, scenario: 'compose', summary: '', recipe: { engine: 'projectile', backdrop, objects: [{ figure: 'ball' }], numbers } });
const roof = play(blank('city'), 'a ball dropped off a rooftop');
ok(roof.ok && roof.c.boxes.h === 30 && roof.c.boxes.u === 0, 'a rooftop: 30 m, from rest');
ok(roof.notes.some((t) => /No height was given.*30 m.*rooftop/.test(t)), 'and the reply says so');
ok(play(blank('table'), 'a book falls off a table').c.boxes.h === 0.8, 'a table: 0.8 m');
ok(play(blank('table'), 'a book falls off a shelf').c.boxes.h === 2, 'a shelf: 2 m');
const cliff = play(blank('cliff'), 'a stone thrown off a cliff');
ok(cliff.c.boxes.h === 50 && cliff.c.boxes.u === 10 && cliff.c.boxes.theta === 0, 'thrown off a cliff: 50 m, flat, at 10 m/s');
ok(cliff.notes.length === 3, 'each of the three said');
const up = play(blank('cliff'), 'a stone thrown straight up off a cliff');
ok(up.c.boxes.theta === 90, '"straight up" is straight up');
const ground = play(blank('ground'), 'a ball is kicked');
ok(ground.c.boxes.u === 20 && ground.c.boxes.theta === 45, 'kicked from the ground: 20 m/s at 45°');

console.log('\nWhat the question gave stands, and what it asks is never made up');
const given = play(blank('cliff', { h: 12, u: 7, theta: 30 }), 'a stone thrown off a 12 m cliff at 7 m/s at 30 degrees');
ok(given.c.boxes.h === 12 && given.c.boxes.u === 7 && given.c.boxes.theta === 30 && given.notes.length === 0, 'all given: nothing assumed, nothing said');
const part = play(blank('cliff', { h: 12 }), 'a stone thrown off a 12 m cliff');
ok(part.c.boxes.h === 12 && part.c.boxes.u === 10, 'the height it gave stands; only the speed is chosen');
const timed = play(blank('cliff', { t: 3, u: 0, theta: -90 }), 'a stone dropped off a cliff lands after 3 s');
ok(timed.ok && timed.c.boxes.h == null && timed.notes.length === 0, 'landing after 3 s: the engine finds the height, none is assumed');
const asked = play(blank('cliff'), 'a stone is dropped off a cliff. how high is the cliff?');
ok(asked.c.boxes.h == null, '"how high is the cliff?": never made up');
ok(play(blank('tower', { h: 20 }), 'a ball is thrown from a 20 m tower: find the initial speed').c.boxes.u == null, '"find the initial speed": never made up');
ok(play(blank('cliff', { h: 20, u: 10 }), 'a ball thrown off a 20 m cliff at 10 m/s: at what angle?').c.boxes.theta == null, '"at what angle?": never made up');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
