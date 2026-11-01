// compose.test.mjs — the composer: recipes held to the registry, refused with
// reasons, and played by the engine's own kit. Run: node test/compose.test.mjs
import fs from 'node:fs';
import { BACKDROPS, FIGURES, EFFECTS, ENGINES, ANSWERS } from '../js/compose/registry.js';
import { check, compose } from '../js/compose/recipe.js';
import { steps } from '../js/compose/reveal.js';
import { answersFor, fromReader } from '../js/parts/answers.js';
import { answerOf } from '../js/parts/parts.js';
import { COMPOSED, byId } from '../js/scenarios.js';
import { KITS } from '../js/kits/index.js';

let pass = 0, fail = 0;
const ok = (c, label) => c ? (pass++, console.log(`  ok   ${label}`)) : (fail++, console.log(`  FAIL ${label}`));
const near = (a, e, tol, label) => ok(Math.abs(a - e) <= tol, `${label} = ${typeof a === 'number' ? a.toFixed(4) : a} (want ${e})`);
const group = (n, f) => { console.log(`\n${n}`); f(); };

const CAR = { title: 'A car off a cliff', backdrop: 'cliff', engine: 'projectile', objects: [{ figure: 'car', name: 'the car' }], numbers: { h: 40, u: 15, theta: 0, g: 9.8 } };
/** The engine's answer for a composed recipe, as the app reaches it: the kit reads the boxes and solves. */
const run = (recipe) => { const c = compose(recipe); return { c, solved: c.ok ? c.kit.solve(c.kit.read(c.boxes)) : null }; };

group('The registry: every piece is described, every ready engine has a kit', () => {
  for (const [k, B] of Object.entries(BACKDROPS)) ok(B.label && B.what && B.place && B.below, `backdrop ${k}`);
  for (const [k, F] of Object.entries(FIGURES)) ok(F.label && F.m > 0 && F.min >= 10 && F.views.length, `figure ${k}`);
  for (const [k, E] of Object.entries(EFFECTS)) ok(E.label && E.what, `effect ${k}`);
  for (const [k, E] of Object.entries(ENGINES)) ok(KITS[E.kit] && (!E.ready || (Object.keys(E.boxes).length && ANSWERS[k]?.length)), `engine ${k} → kit ${E.kit}${E.ready ? ', with boxes and answers' : ' (not drawn yet)'}`);
});

group('A car off a 40 m cliff at 15 m/s: the engine answers, the paper agrees', () => {
  const { c, solved } = run(CAR);
  ok(c.ok, 'composes');
  ok(solved.ok, 'the height engine solves it');
  // 40 = ½ · 9.8 · t²  →  t = 20/7;  x = 15t;  v = √(15² + (9.8t)²)
  near(solved.T, 20 / 7, 1e-9, 'time to the sea');
  near(solved.out, 300 / 7, 1e-9, 'how far out');
  near(solved.vL, Math.hypot(15, 28), 1e-9, 'speed at impact');
  ok(c.boxes.place === 'cliff', 'the place is the backdrop’s');
  ok(compose({ ...CAR, numbers: { h: 40, u: 15, theta: 0 } }).boxes.g === 9.81, 'g left out: on Earth, at the app’s 9.81');
  ok(c.kit.render !== KITS.height.render && c.kit.working === KITS.height.working, 'the composed stage, the engine kit’s own working');
  ok(!c.kit.rows.some((r) => r.fields.some((f) => f.key === 'place')), 'no choice of place: the recipe chose it');
});

group('Parts from the reader step through the composed scene', () => {
  const { c, solved } = run(CAR);
  COMPOSED.push(c.scenario);
  ok(byId(c.scenario.id) === c.scenario, 'found by byId, like the library');
  const keys = answersFor(c.scenario).map((a) => a.key);
  ok(['time1', 'distance', 'speed1', 'height1', 'time2', 'speed2', 'angle'].every((k) => keys.includes(k)), `answer keys: ${keys.join(', ')}`);
  const parts = fromReader(c.scenario.id, [
    { label: 'a', asks: 'time to hit the sea', answer: 'time1' },
    { label: 'b', asks: 'how far out', answer: 'distance' },
    { label: 'c', asks: 'speed at impact', answer: 'speed1' },
  ], Object.keys(c.boxes));
  ok(parts?.length === 3 && parts.map((p) => p.label).join('') === 'abc', 'exactly (a) (b) (c)');
  near(answerOf(parts[0], solved).values[0], 20 / 7, 1e-9, '(a) is the engine’s time');
  near(answerOf(parts[2], solved).values[0], Math.hypot(15, 28), 1e-9, '(c) is the engine’s speed');
  COMPOSED.length = 0;
});

group('From level ground, and from a house: the place word fits', () => {
  const g = run({ backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 0, u: 20, theta: 30, g: 9.8 } });
  ok(g.c.ok && g.solved.ok, 'a ball kicked from the ground (h = 0) solves');
  near(g.solved.T, 2 * 20 * 0.5 / 9.8, 1e-9, 'its time of flight, 2u sin θ / g');
  const h = run({ backdrop: 'house', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 8, u: 10, theta: 0 } });
  ok(h.solved.ok && /hits the ground/.test(h.solved.notes.join(' ')) && /from the house/.test(h.solved.notes.join(' ')) && !/tower|cliff/.test(h.solved.notes.join(' ')), 'from a house roof it hits the ground, out from the house — never a tower');
});

group('Refused, with a reason a student can read', () => {
  const no = (r, re, label) => { const x = check(r); ok(!x.ok && re.test(x.reason), `${label}: “${x.reason}”`); };
  no({ ...CAR, backdrop: 'moon' }, /no backdrop called “moon”/, 'an unknown backdrop');
  no({ ...CAR, engine: 'warp' }, /no engine called/, 'an unknown engine');
  no({ ...CAR, objects: [{ figure: 'dragon' }] }, /no figure called/, 'an unknown figure');
  no({ ...CAR, objects: [{ figure: 'ship' }] }, /from above/, 'a ship side on');
  no({ ...CAR, objects: [] }, /moves 1 thing/, 'nothing that moves');
  no({ ...CAR, objects: [{ figure: 'car' }, { figure: 'lorry' }] }, /moves 1 thing/, 'two things for a one-thing engine');
  no({ ...CAR, numbers: { h: 40, mass: 900 } }, /does not use \(mass\)\. It uses the height, the speed/, 'a number the engine does not take, in words');
  no({ ...CAR, numbers: { h: 'forty' } }, /should be a number/, 'a word for a number');
  no({ ...CAR, numbers: { h: -40 } }, /positive/, 'a negative height');
  no({ ...CAR, numbers: { h: 0, u: 15 } }, /cannot be 0/, 'a cliff with no height');
  no({ ...CAR, numbers: { theta: 120 } }, /between −90°/, 'an angle past straight up');
  no({ ...CAR, numbers: { h: 1e9 } }, /far too big/, 'a misread number');
  no({ ...CAR, effects: ['fireworks'] }, /no effect called/, 'an unknown effect');
  no({ ...CAR, engine: 'plane', objects: [{ figure: 'ship' }] }, /does not draw it yet/, 'an engine the stage does not draw yet');
  no(null, /empty/, 'no recipe at all');
  no({ backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 0, u: 10, theta: 0 } }, /launched upwards/, 'along the ground, it never leaves it');
  no({ backdrop: 'orchard', engine: 'projectile', objects: [{ figure: 'car' }], numbers: { h: 3 } }, /only an apple, a ball, a stone or a particle can fall: not a car/, 'a car falling from a tree');
  no({ ...CAR, numbers: { h: -150000 } }, /−1.500 × 10⁵ for the height/, 'a huge number said as a number, with a real minus sign');
  ok(check({ ...CAR, title: 'A <img src=x onerror=alert(1)>', objects: [{ figure: 'car', name: '<b>x</b>' }] }).recipe.title.indexOf('<') < 0, 'markup from the reader never gets through');
});

group('Each place in its own words', () => {
  const words = (backdrop, numbers) => run({ backdrop, engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { u: 10, theta: 40, g: 9.8, ...numbers } }).solved.notes.join(' ');
  ok(/hits the sea/.test(words('sea', { h: 0 })), 'over the open sea it hits the sea');
  ok(/on the road/.test(words('road', { h: 0 })), 'on a road it lands on the road');
  ok(/on the floor/.test(words('hall', { h: 1 })), 'in a hall it lands on the floor');
  const g = run({ backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { u: 10, theta: 90, t: 1.5, g: 9.8 } });
  ok(!g.solved.ok && /not back down/.test(g.solved.reason), 'a time in the air the launch does not take is refused, not replaced');
  const lv = run({ backdrop: 'tower', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 20, u: 15, theta: 60, level: 5, g: 9.8 } });
  const c = lv.c; COMPOSED.push(c.scenario);
  const parts = fromReader(c.scenario.id, [{ label: 'a', asks: 'when 5 m above', answer: 'time3' }, { label: 'b', asks: 'and again', answer: 'time4' }], Object.keys(c.boxes));
  ok(answerOf(parts[0], lv.solved).ok && answerOf(parts[1], lv.solved).values[0] > answerOf(parts[0], lv.solved).values[0], 'a height a part asks about is answered twice, up then down');
  COMPOSED.length = 0;
});

group('Two on one line by a tower, and a ball bouncing off a roof', () => {
  const P = run({ backdrop: 'tower', engine: 'pair', objects: [{ figure: 'ball' }, { figure: 'ball' }], numbers: { 'A.h': 0, 'A.u': 20, 'B.h': 40, 'B.u': 0, 'B.t0': 1, g: 10 } });
  ok(P.c.ok && P.solved.ok, 'the pair engine solves it, through its own kit');
  // A: 20t − 5t²; B: 40 − 5(t − 1)²  →  level at t = 3.5, 8.75 m up (the paper's)
  near(P.solved.meet.t, 3.5, 1e-9, 'they meet at');
  near(P.solved.meet.x, 8.75, 1e-9, 'that high');
  COMPOSED.push(P.c.scenario);
  const pp = fromReader(P.c.scenario.id, [{ label: 'i', asks: 'height', answer: 'height' }, { label: 'ii', asks: 'difference in speeds', answer: 'speed3' }], Object.keys(P.c.boxes));
  near(answerOf(pp[1], P.solved).values[0], 10, 1e-9, '(ii) the difference in their speeds, 25 − 15');
  const Bo = run({ backdrop: 'house', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { start: 'drop', h: 6, e: 0.7, g: 9.8 } });
  ok(Bo.c.ok && Bo.solved.ok, 'the bounce engine solves a ball off a roof');
  near(Bo.solved.extras.find((x) => x.key === 'vIn1').value, Math.sqrt(2 * 9.8 * 6), 1e-9, 'it hits the ground at √(2gh)');
  near(Bo.solved.extras.find((x) => x.key === 'H1').value, 6 * 0.49, 1e-9, 'and rises to e² h');
  COMPOSED.length = 0;
  const no = (r, re, label) => { const x = check(r); ok(!x.ok && re.test(x.reason), `${label}: “${x.reason}”`); };
  no({ backdrop: 'cliff', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { h: 5 } }, /solid ground/, 'a bounce over the sea');
  no({ backdrop: 'tower', engine: 'pair', objects: [{ figure: 'car' }, { figure: 'ball' }] }, /not a car/, 'a car on a vertical line');
  no({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { start: 'sideways' } }, /one of: drop, down, up/, 'a start that is not a word it knows');
  no({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { e: 1.5 } }, /between 0 and 1/, 'keeping more than all its speed');
  ok(check({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { start: 'drop', h: 2, e: '1/3' } }).recipe.numbers.e === '1/3', 'a fraction as the paper writes it goes to the engine as typed');
});

console.log('\nThe Worker moves a placed pair or bounce onto a composed scene');
{
  const { toComposed } = await import('../worker/src/composeplace.js');
  const lib = { understood: true, scenario: 'library', library: 'pair-vertical', summary: 'A ball dropped from a 40 m tower as another is thrown up.', boxes: { 'A.h': 0, 'A.u': 20, 'B.h': 40, 'B.u': 0, g: 10 },
    parts: [{ label: 'a', asks: 'height', answer: 'height' }, { label: 'b', asks: 'difference', answer: 'speed' }] };
  const x = toComposed(lib);
  ok(x.scenario === 'compose' && x.recipe.backdrop === 'tower' && x.recipe.engine === 'pair', 'a tower named: composed by the tower');
  ok(x.recipe.numbers['B.h'] === 40 && x.parts[1].answer === 'speed3', 'the boxes moved as they were, the answer keys renamed');
  ok(check(x.recipe).ok, 'and the app takes the recipe');
  ok(toComposed({ ...lib, summary: 'A is thrown up; B is dropped 40 m above it.' }) .scenario === 'library', 'no place named: the library’s own stage');
  const b = toComposed({ understood: true, scenario: 'library', library: 'bounce', summary: 'A ball is dropped from the roof of a house.', boxes: { start: 'drop', h: 6, e: 0.7 }, parts: [{ label: 'a', asks: 'x', answer: 'time' }] });
  ok(b.recipe.backdrop === 'house' && b.parts[0].answer === 'time3' && check(b.recipe).ok, 'a bounce off a roof, by the house');
}

group('The veil names only the recipe’s own pieces', () => {
  const c = check(CAR).recipe, s = steps(c).map((x) => x.say);
  ok(s[0] === 'Placing a sea cliff' && s.includes('Bringing in a car') && s.includes('Adding a splash'), s.join(' / '));
  ok(steps(check({ ...CAR, backdrop: 'road', numbers: { h: 3, u: 6, theta: 0 } }).recipe).some((x) => x.say === 'Adding dust'), 'a road gets dust, not a splash');
});

console.log('\nThe reader’s list of pieces is current');
const { source } = await import('../tools/compose-catalogue.mjs');
ok(fs.readFileSync(new URL('../worker/src/compose.js', import.meta.url), 'utf8') === source(),
   'worker/src/compose.js is what tools/compose-catalogue.mjs makes today (run it after changing the registry)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
