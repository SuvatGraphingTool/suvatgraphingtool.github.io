// standin.test.mjs — what the question says moves is what the stage draws. Run with:
//     node test/standin.test.mjs
//
// The user, 8 Nov: a ski-board sliding down a mountain reads as Freewheeling, and the
// stage must draw the ski-board. A real sweep of every stage looks at the pictures;
// this holds which word gets what, which figure is claimed, and the stage's words.

import { standInFor } from '../js/compose/standins.js';
import { setStandIn, standIn, standInFrame, ownWords } from '../js/render/standin.js';

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) { pass++; console.log(`  ok   ${label}`); } else { fail++; console.log(`  FAIL ${label}`); } };

console.log('\nWhich word gets what');
ok(standInFor('ski-board')?.thing === 'ski-board', 'a ski-board is a picture');
ok(standInFor('a laptop')?.thing === 'laptop', 'a laptop is a picture, without its article');
ok(standInFor('a car')?.figure === 'car', 'a car is the car the app drew by hand');
ok(standInFor('a woman')?.figure === 'runner', 'someone is someone');
for (const w of ['ball', 'a stone', 'particle', 'the object', '', null, undefined, 3]) ok(standInFor(w) === null, `${JSON.stringify(w)} is no one's object: nothing stands in`);

console.log('\nOnly what moves');
const g = { canvas: { id: 'scene' } }, drawn = [];
const S = { word: 'laptop', draw: (kind) => { drawn.push(kind); return true; } };
const frame = (...kinds) => { standInFrame(); drawn.length = 0; return kinds.map((k) => standIn(k, g, 0, 0, 40)); };
setStandIn(S, 'freewheeling');
ok(JSON.stringify(frame('cyclist', 'car')) === '[true,false]', 'the first figure of a frame stands in; a second actor keeps its art');
ok(JSON.stringify(frame('cyclist')) === '[true]', 'and again on the next frame');
ok(standIn('car', { canvas: { id: 'other' } }, 0, 0, 40) === false, 'never on another canvas: the whiteboard has its own stages');
setStandIn(S, 'from-the-bridge');
ok(JSON.stringify(frame('runner', 'ball', 'ball')) === '[false,true,false]', 'the runner under the bridge is not what was thrown');
setStandIn(S, 'two-trains');
ok(JSON.stringify(frame('train', 'runner', 'runner', 'train')) === '[false,false,false,true]', 'A is on the near track, drawn second');
setStandIn(S, 'three-models');
ok(JSON.stringify(frame('car', 'car', 'car')) === '[true,true,true]', 'three models of one object: all of them');
setStandIn(S, 'pulled-by-a-rope');
ok(JSON.stringify(frame('runner')) === '[false]', 'the person pulling the sledge is not the sledge');
setStandIn({ word: 'cyclist', draw: () => false }, 'freewheeling');
ok(JSON.stringify(frame('cyclist')) === '[false]', 'the figure already there declines: it draws itself');
setStandIn(null);
ok(JSON.stringify(frame('cyclist')) === '[false]', 'cleared: the paper’s own');

console.log('\nThe stage says what the question says');
setStandIn({ word: 'snowboard', draw: () => true }, 'freewheeling');
ok(ownWords('Mass of cyclist and bike (kg)') === 'Mass of snowboard (kg)', 'the reply does not say "Mass of cyclist and bike" for a snowboard');
ok(ownWords('A cyclist freewheels') === 'A snowboard freewheels', 'the word is swapped where it stands');
setStandIn({ word: 'watermelon', draw: () => true }, 'from-the-bridge');
ok(ownWords('Ball, along the road') === 'Watermelon, along the road', 'a capital stays a capital');
ok(ownWords('Runner, along the road') === 'Runner, along the road', 'the second actor keeps their name');
setStandIn({ word: 'cyclist', draw: () => false }, 'freewheeling');
ok(ownWords('Mass of cyclist and bike (kg)') === 'Mass of cyclist and bike (kg)', 'the paper’s own object: its words stand');
setStandIn(null);
ok(ownWords('Mass of cyclist and bike (kg)') === 'Mass of cyclist and bike (kg)', 'cleared: its words are back');
ok(ownWords(undefined) === undefined, 'nothing to say stays nothing');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
