// fit.test.mjs — a reading has to fit the question it was read from. Run with:
//     node test/fit.test.mjs
//
// worker/src/fit.js holds three rules for every reading of a typed question:
// a number only in a box of its own kind, every number one the question gives,
// and a speed or an angle the question gives with somewhere to go. The case
// that made them (13 Nov): a cricket ball hit at speed and angle towards a
// fielder on the boundary, read as From the bridge, to the runner — the ball's
// speed as the runner's, the distance to the fielder as seconds, the angle
// dropped. Questions here are in our own words, never a paper's.

import { misfit, feedback, strip, plainThrow, numbersIn, BOX_KINDS } from '../worker/src/fit.js';
import { LIBRARY_IDS } from '../worker/src/library.js';
import reader from '../worker/src/index.js';

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); } };

const CRICKET = 'A batter hits a cricket ball at 23.8 m s-1 at 50.0° above the horizontal towards a fielder on the boundary, 55.0 m away. '
  + 'The fielder can catch it if it is less than 3 m above the height it was hit from. Can the fielder catch it? Its mass is 0.140 kg.';
const BRIDGE = { understood: true, scenario: 'library', library: 'from-the-bridge', title: 'Cricket boundary catch', boxes: { V: 23.8, T: 55, drop: 3 } };

console.log('\nThe numbers a question gives, and their kinds');
{
  const n = numbersIn(CRICKET);
  const kind = (v) => n.find((x) => x.value === v)?.kind;
  ok(kind(23.8) === 'speed' && kind(50) === 'angle' && kind(55) === 'length' && kind(3) === 'length' && kind(0.14) === 'mass', 'speed, angle, lengths and a mass');
  ok(numbersIn('speeds up at 0.9 metres a second squared for 3 seconds').map((x) => x.kind).join() === 'accel,time', 'metres a second squared is an acceleration');
  ok(numbersIn('at 72 km/h, then 20 m/s').map((x) => x.kind).join() === 'speed,speed', 'km/h and m/s are speeds');
}

console.log('\nEvery library box knows its kind');
{
  ok(LIBRARY_IDS.every((id) => BOX_KINDS[id]), 'every scenario has an entry');
  ok(BOX_KINDS['from-the-bridge'].T === 'time' && BOX_KINDS['from-the-bridge'].V === 'speed', 'From the bridge: T is a time, V a speed');
}

console.log('\nThe cricket ball read as the bridge');
{
  const p = misfit(BRIDGE, CRICKET);
  ok(p.some((q) => q.rule === 'kind' && q.key === 'T'), '55 m in a box of seconds is the wrong kind');
  ok(p.some((q) => q.rule === 'unused' && q.value === 50), 'the 50° has nowhere to go');
  ok(/55 is a length/.test(feedback(p, BRIDGE)) && /from-the-bridge/.test(feedback(p, BRIDGE)), 'the model is told what was wrong');
  ok(!('T' in strip(BRIDGE, p).boxes) && strip(BRIDGE, p).boxes.V === 23.8, 'what is wrong is taken out, the rest kept');
  const plain = plainThrow(BRIDGE, p, CRICKET);
  ok(plain && plain.scenario === 'arc' && plain.u === 23.8 && plain.angleDegrees === 50 && plain.h === 0, 'still wrong: the plain throw the question describes');
  ok(plain.title === 'Cricket boundary catch' && /from the ground/.test(plain.note), 'with its name, saying what it assumed');
}

console.log('\nReadings that fit are left alone');
{
  const fits = [
    ['A ball is projected from the top of a 25 m cliff at 45° above the horizontal and lands 100 m from the foot of the cliff. Take g = 9.8.',
      { understood: true, scenario: 'library', library: 'from-a-height', boxes: { place: 'cliff', h: 25, theta: 45, s: 100, g: 9.8 } }],
    ['A stone is dropped from a tower 45 m high.', { understood: true, scenario: 'library', library: 'from-a-height', boxes: { place: 'tower', h: 45, u: 0, theta: 0 } }],
    ['A lorry passes A at u m/s and 10 seconds later B at 34 m/s; AB = 240 m.', { understood: true, scenario: 'road', v: 34, t: 10, s: 240 }],
    ['A car travels at 72 km/h and brakes to rest in 50 m.', { understood: true, scenario: 'road', u: 20, v: 0, s: 50 }],
    ['Someone on a footbridge throws a ball as a runner at 4 m/s passes below; the runner catches it 2.4 s later, 3.6 m below the throw.',
      { understood: true, scenario: 'library', library: 'from-the-bridge', boxes: { V: 4, T: 2.4, drop: 3.6 } }],
    ['A ball is kicked at 20 m/s at 35 degrees.', { understood: true, scenario: 'arc', u: 20, angleDegrees: 35, h: 0 }],
    ['Show me an example of two trains', { understood: true, scenario: 'library', library: 'two-trains', example: true }],
    ['hello', { understood: false, note: 'Hi!' }],
  ];
  for (const [text, x] of fits) ok(misfit(x, text).length === 0, `fits: ${text.slice(0, 60)}…`);
  ok(misfit({ understood: true, scenario: 'library', library: 'from-a-height', boxes: { h: 25, u: 12 } }, 'From a 25 m cliff, thrown.').some((q) => q.rule === 'given' && q.key === 'u'),
    'a number the question never gave is caught');
}

/* The Worker itself, with a model that reads the bridge first and the throw
   when told what was wrong — no real model is asked. */
console.log('\nThe Worker, end to end');
{
  const asked = [];
  const env = {
    MODELS: '@cf/test/model', ALLOWED_ORIGINS: '',
    AI: { run: async (model, input) => {
      const last = input.messages[input.messages.length - 1].content;
      asked.push(last);
      return { response: JSON.stringify(/It does not fit/.test(last)
        ? { understood: true, scenario: 'arc', title: 'Cricket boundary catch', u: 23.8, angleDegrees: 50, h: 0 }
        : BRIDGE) };
    } },
  };
  const res = await reader.fetch(new Request('https://reader.test/extract', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: CRICKET }),
  }), env, { waitUntil() {} });
  const data = await res.json();
  const told = asked.filter((a) => /It does not fit/.test(a));
  ok(told.length === 1 && /55 is a length/.test(told[0]), 'the misfit is sent back once, saying what was wrong');
  ok(data.ok && data.extraction.scenario === 'arc' && data.extraction.u === 23.8 && data.extraction.angleDegrees === 50, 'and the reading that fits is the one returned');

  const stubborn = [];
  const env2 = { ...env, AI: { run: async (model, input) => { stubborn.push(input.messages[input.messages.length - 1].content); return { response: JSON.stringify(BRIDGE) }; } } };
  const res2 = await reader.fetch(new Request('https://reader.test/extract', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: CRICKET }),
  }), env2, { waitUntil() {} });
  const d2 = await res2.json();
  ok(stubborn.filter((a) => /It does not fit/.test(a)).length === 1 && d2.extraction.scenario === 'arc' && d2.extraction.u === 23.8, 'asked again and still wrong: the plain throw, never the bridge');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
