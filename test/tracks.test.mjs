// tracks.test.mjs — proves the rule: every moving thing leaves a trajectory, and
// all of it answers with its moment. Run with:
//     node test/tracks.test.mjs
//
// The user, 8 Nov: "the entire line should be able to resolve anywhere on the
// trajectory after its first run … make it a rule". A real-mouse sweep of every
// scene checks the same thing on screen; this holds the arithmetic. Also the words
// a student hands a value over with, and the bare answers that need no AI call.

import { movers, clearMovers } from '../js/render/util.js';
import { recordTracks, trackAt, resetTracks, OWN_PATH, moving } from '../js/render/tracks.js';
import { wantsOwn, saysNumber } from '../js/compose/sense.js';
import { answered } from '../worker/src/composeplace.js';
import { LIBRARY } from '../js/library.js';

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}`); }
}
const canvas = () => ({ clientWidth: 800, clientHeight: 600 });
const frame = (c, motion, t, pts) => { clearMovers(); for (const [x, y, o] of pts) movers.list.push({ x, y, r: 20, strong: false, arrow: false, ...o }); recordTracks(c, motion, t); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

console.log('\nA motion leaves its line, and every point of it has its moment');
{
  const c = canvas(), m = {};
  for (let i = 0; i <= 10; i++) frame(c, m, i / 10, [[100, 100 + i * 30]]);
  const at = trackAt(c, 103, 250);
  ok(at && near(at.t, 0.5), 'halfway down the line: halfway through the motion');
  ok(at && near(trackAt(c, 100, 265).t, 0.55), 'between two frames: the moment between them');
  ok(trackAt(c, 200, 250) === null, 'away from the line: nothing');
  frame(c, m, 0.2, [[100, 160]]);
  ok(moving(c._tracks)[0].length === 11, 'a replay goes over what is known, adding nothing');
  frame(c, {}, 0.1, [[50, 50]]);
  ok(c._tracks.lines.length === 1 && c._tracks.lines[0].length === 1, 'a new motion starts a new line');
  resetTracks(c);
  ok(trackAt(c, 100, 250) === null, 'forgotten when asked');
}
{
  const c = canvas(), m = {};
  for (let i = 0; i <= 10; i++) frame(c, m, i, [[100, i * 30], [300, i * 30]]);
  ok(moving(c._tracks).length === 2 && near(trackAt(c, 300, 150).t, 5), 'two objects: a line each');
}
{
  const c = canvas(), m = {};
  for (let i = 0; i <= 10; i++) { const pts = [[100, i * 30]]; if (i % 2) pts.unshift([120, i * 30, { arrow: true }]); frame(c, m, i, pts); }
  ok(moving(c._tracks).length === 1 && c._tracks.lines[0].length === 11, 'arrows that come and go do not break it, or count as objects');
}
{
  const c = canvas(), m = {};
  for (let i = 0; i <= 5; i++) frame(c, m, i, [[100, 200], [100 + i * 40, 300]]);
  ok(moving(c._tracks).length === 1, 'what only stands by has no trajectory');
}
{
  const c = canvas(), m = {};
  c._view = { tx: 50, ty: 20, s: 2 };
  for (let i = 0; i <= 10; i++) frame(c, m, i, [[100, 100 + i * 20]]);
  c._view = { tx: 0, ty: 0, s: 1 };
  ok(near(trackAt(c, 25, 90).t, 5), 'it stays on the place through a pan and a zoom');
}
const ids = new Set(LIBRARY.map((s) => s.id));
ok([...OWN_PATH].every((id) => ids.has(id) || ['road', 'bullet', 'monkey'].includes(id)), `every stage listed as drawing its own path exists (${OWN_PATH.size})`);
ok(!OWN_PATH.has('two-apples') && !OWN_PATH.has('freewheeling'), 'the falling apples and the slope get the line');

console.log('\nHanding it over, in the student\'s own words');
for (const s of ["i don't know", 'i dont know the rest', 'you pick', 'use your own', 'use your own values', 'whatever you like', 'make it up', 'fill in the rest', 'complete it', 'surprise me', 'up to you', 'لا أعرف', 'من عندك']) ok(wantsOwn(s), `"${s}"`);
for (const s of ['a ball dropped off a rooftop', 'how high is it', 'a stone is thrown at 20 m/s', 'i know the speed']) ok(!wantsOwn(s), `not "${s}"`);
ok(saysNumber('from 20 m') && saysNumber('من ٢٠ م') && !saysNumber('off a rooftop'), 'a number, in either set of digits');

console.log('\nA bare answer fills the gap, with no AI call');
const P = (numbers) => [{ role: 'user', parts: [{ text: 'q' }] }, { role: 'model', parts: [{ text: JSON.stringify({ understood: true, scenario: 'compose', recipe: { engine: 'projectile', backdrop: 'cliff', objects: [{ figure: 'ball' }], numbers } }) }] }];
ok(answered('10 m/s', P({ h: 20 }))?.recipe.numbers.u === 10, 'a speed');
ok(answered('30 degrees', P({ h: 20, u: 10 }))?.recipe.numbers.theta === 30, 'an angle');
{ const r = answered('20 m and 10 m/s at 30°', P({}))?.recipe.numbers; ok(r?.h === 20 && r?.u === 10 && r?.theta === 30, 'all three at once'); }
ok(answered('٢٠ م', P({}))?.recipe.numbers.h === 20, 'in Arabic digits');
ok(answered('10 m/s', P({ h: 20, u: 5 })) === null, 'a value it already has goes to the model');
ok(answered('make it 10 m/s please and change the angle', P({ h: 20 })) === null, 'anything more goes to the model');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
