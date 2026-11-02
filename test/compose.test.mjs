// compose.test.mjs — the composer: recipes held to the registry, refused with
// reasons, and played by the engine's own kit. Run: node test/compose.test.mjs
import fs from 'node:fs';
import { BACKDROPS, FIGURES, EFFECTS, ENGINES, ANSWERS, figureOf, whoIn, placeIn } from '../js/compose/registry.js';
import { check, compose, scenesOf, fromReading, titleOf } from '../js/compose/recipe.js';
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
  no({ ...CAR, backdrop: 'atlantis' }, /no backdrop called “atlantis”/, 'an unknown backdrop');
  no({ ...CAR, engine: 'warp' }, /no engine called/, 'an unknown engine');
  ok(check({ ...CAR, objects: [{ figure: 'dragon' }] }).recipe.notes[0] === 'Drawn as a particle: there is no dragon figure yet.', 'a thing with no figure: the closest, said so');
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
  ok(check({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { start: 'drop', h: 2, e: '1/3' } }).recipe.numbers.e === '1/3', 'a fraction as the paper writes it stays as typed in the box');
  const half = run({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { start: 'up', h: 1.2, U: 5, e: '1/2', g: 9.8 } });
  ok(half.solved.ok, 'and the engine solves with it: e = 1/2 is a half');
  near(half.solved.extras.find((x) => x.key === 'vOut1').value, half.solved.extras.find((x) => x.key === 'vIn1').value / 2, 1e-9, 'it rebounds with half its speed');
  no({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { e: '3/2' } }, /between 0 and 1/, 'a fraction more than 1');
  no({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { e: '1/0' } }, /nothing below the line/, 'a fraction over 0');
  ok(check({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'ball' }], numbers: { h: '2', n: '2' } }).recipe.numbers.h === 2, 'a number written as text is that number');
  no({ backdrop: 'tower', engine: 'pair', objects: [{ figure: 'ball' }, { figure: 'ball' }], numbers: { 'B.t0': -1 } }, /a time from the start/, 'a start before the clock');
  ok(check({ backdrop: 'tower', engine: 'pair', objects: [{ figure: 'ball' }, { figure: 'ball' }] }).recipe.objects.map((o) => o.name).join() === 'the first ball,the second ball', 'two unnamed are told apart');
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
  const sk = toComposed({ understood: true, scenario: 'library', library: 'bounce', summary: 'A ball is dropped in a sports hall from a roof beam 8 m up.', boxes: { start: 'drop', h: 8 }, parts: [{ label: 'd', asks: 'sketch the velocity–time graph', answer: 'graph' }] });
  ok(sk.recipe.backdrop === 'hall' && sk.parts[0].answer === 'graph', 'a hall before a roof; a sketch part keeps its answer');
  ok(toComposed({ ...lib, summary: 'A ball is thrown up past the roof of a car.' }).scenario === 'library' && toComposed({ ...lib, summary: 'Mr Hall drops a ball 40 m above another.' }).scenario === 'library', 'a car’s roof, or Mr Hall, is no place');
}

group('A part in a scene of its own', () => {
  const { main, scenes } = scenesOf([
    { label: 'a', asks: 'time in the air', answer: 'time1' },
    { label: 'b', asks: 'how far out', answer: 'distance' },
    { label: 'c', asks: 'cyclist lands', answer: 'distance', recipe: { backdrop: 'road', engine: 'projectile', objects: [{ figure: 'cyclist' }], numbers: { h: 3, u: 6, theta: 0, g: 9.8 } } },
    { label: 'd', asks: 'nonsense', answer: 'time1', recipe: { backdrop: 'atlantis', engine: 'projectile', objects: [{ figure: 'car' }] } },
  ]);
  ok(main.map((p) => p.label).join() === 'a,b', 'the main scene keeps (a) and (b)');
  ok(scenes.length === 2 && !('recipe' in scenes[0].part), '(c) and (d) each a scene of their own, the recipe taken off the part');
  const c = scenes[0].c, sv = c.kit.solve(c.kit.read(c.boxes));
  COMPOSED.push(c.scenario);
  const p = fromReader(c.scenario.id, [scenes[0].part], Object.keys(c.boxes))[0];
  near(answerOf(p, sv).values[0], 6 * Math.sqrt(6 / 9.8), 1e-9, '(c) the cyclist lands 6 √(2h / g) out');
  COMPOSED.length = 0;
  ok(!scenes[1].c.ok && /no backdrop called/.test(scenes[1].c.reason), '(d) refused with its reason, the rest still stand');
  ok(scenesOf(undefined).main.length === 0 && scenesOf([null]).main.length === 1, 'no parts, or a broken one, does not throw');
});

group('What moves is what is drawn', () => {
  const f = (w) => figureOf(w);
  ok(f('diver').figure === 'diver' && f('a person').figure === 'diver' && f('she').figure === 'diver', 'a diver, a person, she: a person');
  ok(f('skateboarder').figure === 'skateboarder' && f('parcel').figure === 'parcel' && f('football').figure === 'football' && f('pebble').figure === 'stone', 'skateboarder, parcel, football, pebble');
  ok(!f('missile').exact && f('missile').figure === 'particle' && f('rocket').figure === 'rocket', 'a missile has no figure yet: the closest, and not exact; a rocket has its own');
  ok(f('').figure === null, 'nothing named: nothing assumed');
  // the user's own question, as the Worker hands it on
  const d = fromReading({ understood: true, scenario: 'library', library: 'from-a-height', summary: 'A person jumps off a 10 m diving board at 7 m/s.',
    boxes: { place: 'board', h: 10, theta: 90, u: 7 }, who: 'person', assumed: ['angle'] });
  ok(d.recipe.backdrop === 'board' && d.recipe.objects[0].figure === 'diver', 'a person off a diving board: a diver, over the pool');
  ok(/taken as straight up/.test(d.notes.join(' ')), 'and the reply says the jump is taken as straight up');
  const dv = compose(d.recipe), sv = dv.kit.solve(dv.kit.read(dv.boxes));
  near(sv.top, 10 + 49 / (2 * 9.81), 1e-9, 'it rises to 10 + u²/2g above the water');
  ok(fromReading({ understood: true, scenario: 'platform', h: 20, u: 5, who: 'stone' }) === null, 'a stone stays where it was: the twelve, or From a height');
  const p = fromReading({ understood: true, scenario: 'dropped', summary: 'A parcel is dropped from a helicopter.', who: 'parcel' });
  ok(p.recipe.backdrop === 'air' && !('h' in p.recipe.numbers) && p.recipe.carrier === 'helicopter' && !/no helicopter yet/.test(p.notes.join(' ')), 'a parcel from a helicopter: from the air, its height asked for, the helicopter drawn');
  const sk = fromReading({ understood: true, scenario: 'platform', h: 2, u: 4, who: 'skateboarder' });
  ok(sk.recipe.objects[0].figure === 'skateboarder' && compose(sk.recipe).scenario.name === 'A skateboarder off a wall', 'a skateboarder off a 2 m wall');
  const r = fromReading({ understood: true, scenario: 'up', h: 0, u: 30, who: 'missile', parts: [{ label: 'a', asks: 'top', answer: 'top' }] });
  ok(/no missile figure yet/.test(r.notes.join(' ')) && r.parts[0].answer === 'height1', 'a missile drawn as a particle, said; the twelve’s answer key renamed');
});

console.log('\nThe Worker reads a jump with no angle as straight up, and says so');
{
  const { toFigure } = await import('../worker/src/composeplace.js');
  const { toPlace } = await import('../worker/src/place.js');
  const words = 'a person jumping off a diving board, no angle given, the board is 10 m high and they jump at 7 m/s';
  const x = toPlace(toFigure({ understood: true, scenario: 'platform', h: 10, u: 7, summary: 'A person jumps off a 10 m diving board at 7 m/s.' }, words), words);
  ok(x.library === 'from-a-height' && x.boxes.place === 'board' && x.boxes.theta === 90, 'the user’s question: From a height’s board, straight up');
  ok(x.who === 'person' && x.assumed?.[0] === 'angle', 'who moves and what was assumed go along with it');
  const at = toFigure({ understood: true, scenario: 'platform-angle', h: 10, u: 7, angleDegrees: 30, who: 'diver' }, 'a diver jumps at 30° from a 10 m board at 7 m/s');
  ok(at.angleDegrees === 30 && !at.assumed, 'an angle the question gives is kept');
  const sk = toFigure({ understood: true, scenario: 'platform', h: 2, u: 4, who: 'skateboarder' }, 'a skateboarder rolls off a 2 m wall at 4 m/s');
  ok(sk.scenario === 'platform' && !sk.assumed, 'rolling off is not a jump: across, as read');
  const aw = 'a stone is flicked off a 1.2 m wall at 2 m/s. Find the time, as well as the distance';
  ok(toPlace(toFigure({ understood: true, scenario: 'platform', h: 1.2, u: 2, summary: 'A stone is flicked off a wall.', who: 'stone' }, aw), aw).scenario === 'platform', '“as well as” is no well');
  const dw = 'a stone is thrown at 5 m/s at 30° below the horizontal down a 20 m well';
  const kept = toPlace(toFigure({ understood: true, scenario: 'platform-down', h: 20, u: 5, angleDegrees: 30, belowHorizontal: true, summary: 'A stone is thrown down a 20 m well at 30° below the horizontal.', who: 'stone' }, dw), dw);
  ok(kept.boxes.theta === -30, 'an angle the question gives down a well is kept, for the engine to answer in words');
  const chain = (x, words) => fromReading(toPlace(toFigure(x, words), words));
  const girl = toFigure({ understood: true, scenario: 'platform', h: 20, u: 8, summary: 'A girl throws a ball from a 20 m tower.' }, 'a girl throws a ball horizontally from a 20 m tower at 8 m/s');
  ok(girl.who === 'ball', 'a girl throws a ball: the ball is what moves, not the girl');
  const she = toFigure({ understood: true, scenario: 'platform', h: 3, u: 2, who: 'she' }, 'she leaps from a 3 m ledge at 2 m/s');
  const stunt = toFigure({ understood: true, scenario: 'platform', h: 15, u: 3, who: 'stuntman' }, 'a stuntman jumps off a 15 m bridge at 3 m/s');
  ok(she.angleDegrees === 90 && she.assumed && stunt.angleDegrees === 90 && stunt.assumed, '“she” and “a stuntman” are people: their jumps are straight up, said');
  const car = toFigure({ understood: true, scenario: 'platform', h: 5, u: 20, who: 'car' }, 'a car jumps off a 5 m ramp at 20 m/s while a man watches');
  ok(car.scenario === 'platform' && !car.assumed, 'a car that “jumps”, with a man watching: still across');
  const ups = toFigure({ understood: true, scenario: 'platform', h: 10, u: 5, who: 'she' }, 'she jumps upwards at 5 m/s from a 10 m diving board');
  ok(ups.angleDegrees === 90 && !ups.assumed, '“upwards” is given: straight up, nothing assumed');
  const ng = toFigure({ understood: true, scenario: 'platform', h: 10, u: 5, who: 'diver' }, 'a diver jumps at 5 m/s from a 10 m board, angle not given');
  ok(ng.assumed?.[0] === 'angle', '“angle not given” is no angle');
  const d = chain({ understood: true, scenario: 'platform-angle', h: 10, u: 7, who: 'diver', summary: 'A diver dives off a 10 m diving board at 7 m/s at an angle.' }, 'a diver dives off a 10 m diving board at 7 m/s at an angle');
  ok(d && !('theta' in d.recipe.numbers), 'an angle the question leaves to find is left for the values screen, never straight down');
  const top = chain({ understood: true, scenario: 'up', h: 10, u: 7, who: 'diver', summary: 'A diver jumps up off a 10 m diving board.', parts: [{ label: 'a', asks: 'rise above the board', answer: 'rise' }] }, 'a diver jumps straight up at 7 m/s off a 10 m diving board. (a) How high above the board does she rise?');
  ok(top.recipe.backdrop === 'board' && top.parts[0].answer === 'height2', 'the twelve’s “rise” survives From a height to the composed height above the board');
}

console.log('\nWhat it lands on follows the question');
{
  const { toFigure } = await import('../worker/src/composeplace.js');
  const { toPlace } = await import('../worker/src/place.js');
  const w = 'ball kicked up from a cliff at 8 m/s, then hits the ground. at the bottom is the GROUND, not sea, and its 50 m high';
  const x = toPlace(toFigure({ understood: true, scenario: 'up', h: 50, u: 8, summary: 'A ball is kicked up from a 50 m cliff at 8 m/s.', who: 'ball' }, w), w);
  ok(x.library === 'from-a-height' && x.below === 'ground', 'the Worker reads the ground from the words and carries it along');
  const f = fromReading(x);
  ok(f && f.recipe.backdrop === 'cliff' && f.recipe.below === 'ground' && f.recipe.objects[0].figure === 'ball', 'a ball off a cliff over the ground: composed, the ball kept');
  const c = compose(f.recipe), sv = c.kit.solve(c.kit.read(c.boxes));
  ok(/hits the ground at the foot of the cliff/.test(sv.notes.join(' ')) && !/sea/.test(sv.notes.join(' ')), 'it hits the ground, and nothing says sea');
  ok(c.scenario.recipe.effects[0] === 'dust', 'dust where it lands, not a splash');
  const sea = toPlace(toFigure({ understood: true, scenario: 'platform', h: 30, u: 12, summary: 'A stone is thrown from a cliff into the sea.', who: 'stone' }, 'a stone thrown from a 30 m cliff into the sea'), 'a stone thrown from a 30 m cliff into the sea');
  ok(fromReading(sea) === null, 'a cliff over the sea stays From a height’s own');
  const road = check({ backdrop: 'bridge', below: 'road', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 12, u: 5, theta: 0 } });
  ok(road.recipe.below === 'road' && road.recipe.effects[0] === 'dust', 'a bridge over a road lands in dust');
  ok(!('below' in check({ backdrop: 'tower', below: 'sea', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 12 } }).recipe), 'a surface a place cannot stand over is the place’s own');
  ok(check({ backdrop: 'bridge', below: 'water', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 12 } }).recipe.below === undefined, 'water under a bridge is its river, as drawn');
}

group('Places only the composer draws, and more of what students name', () => {
  const coin = fromReading({ understood: true, scenario: 'platform', h: 0.8, u: 2, summary: 'A coin is flicked off a 0.8 m table at 2 m/s.', who: 'coin' });
  ok(coin && coin.recipe.backdrop === 'table' && coin.recipe.objects[0].figure === 'coin', 'a coin flicked off a table: the coin, off the table (never the bare pitch)');
  const cs = compose(coin.recipe), sv = cs.kit.solve(cs.kit.read(cs.boxes));
  ok(sv.ok && /hits the floor/.test(sv.notes.join(' ')) && cs.scenario.name === 'A coin off a table', 'it hits the floor; “A coin off a table”');
  ok(fromReading({ understood: true, scenario: 'platform', h: 6, u: 4, summary: 'A ball is thrown horizontally from a balcony.', who: 'ball' }).recipe.backdrop === 'house', 'a ball from a balcony: the house');
  ok(fromReading({ understood: true, scenario: 'platform', h: 20, u: 5, summary: 'A ball thrown from a 20 m cliff.', who: 'ball' }) === null, 'a ball from a cliff stays From a height’s');
  const well = fromReading({ understood: true, scenario: 'library', library: 'from-a-height', summary: 'A bucket falls down a 20 m well.', boxes: { place: 'well', h: 20, u: 0, theta: -90 }, who: 'bucket' });
  ok(well.recipe.backdrop === 'well' && well.recipe.objects[0].figure === 'bucket' && compose(well.recipe).scenario.name === 'A bucket down a well', 'a bucket down a well: drawn as a bucket, down the well');
  const ws = compose(well.recipe), wv = ws.kit.solve(ws.kit.read(ws.boxes));
  near(wv.T, Math.sqrt(2 * 20 / 9.81), 1e-9, 'and it falls for √(2h/g)');
  const slant = compose({ backdrop: 'well', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 20, u: 5, theta: 30 } });
  const sr = slant.kit.solve(slant.kit.read(slant.boxes));
  ok(!sr.ok && /straight up or down/.test(sr.reason), 'down a well at an angle: the engine says, in words, it moves straight up or down');
  ok(fromReading({ understood: true, scenario: 'up', h: 0, u: 4, summary: 'A coin is tossed up at 4 m/s.', who: 'coin' }).recipe.objects[0].figure === 'coin', 'a coin tossed up is drawn as a coin, wherever it is');
  const shelf = fromReading({ understood: true, scenario: 'platform', h: 2, u: 1, summary: 'A book slides off a shelf 2 m high at 1 m/s.', who: 'book' });
  ok(shelf.recipe.backdrop === 'table' && compose(shelf.recipe).scenario.name === 'A book off a shelf' && /shelf is drawn as a table/.test(shelf.notes.join(' ')), 'a shelf: drawn as a table, named a shelf, and said');
  ok(compose(fromReading({ understood: true, scenario: 'platform', h: 6, u: 4, summary: 'A ball is thrown from a balcony 6 m up.', who: 'ball' }).recipe).scenario.name === 'A ball off a balcony', '“A ball off a balcony”');
  ok(fromReading({ understood: true, scenario: 'arc', h: 0, u: 20, angleDegrees: 30, summary: 'Using the table of g values, a ball is kicked at 20 m/s at 30°.', who: 'ball' }) === null, 'a table of values is no table');
  const ap = fromReading({ understood: true, scenario: 'dropped', h: 3.2, summary: 'An apple falls from a branch 3.2 m up.', who: 'apple' });
  ok(ap.recipe.backdrop === 'orchard' && ap.recipe.objects[0].figure === 'apple' && !ap.notes.some((n) => /no place/.test(n)), 'an apple from a branch: the orchard’s tree, never a wall');
  ok(/above the floor/.test(check({ backdrop: 'table', engine: 'projectile', objects: [{ figure: 'coin' }], numbers: { h: 0 } }).reason), 'a table with no height: it starts above the floor');
  ok(placeIn('A skier leaves a ski jump at 20 m/s')?.backdrop === 'snow' && placeIn('a stone thrown across the desert')?.backdrop === 'desert' && placeIn('a snowball thrown in the snow')?.backdrop === 'snow', 'snow and desert named by the question');
  const eff = (r) => check(r).recipe?.effects.join();
  ok(eff({ backdrop: 'moon', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 0, u: 5, theta: 45 } }) === 'crater', 'a landing on the Moon leaves a crater');
  ok(eff({ backdrop: 'snow', engine: 'projectile', objects: [{ figure: 'snowball' }], numbers: { h: 0, u: 5, theta: 45 } }) === 'snow', 'a landing in snow throws up snow');
  ok(eff({ backdrop: 'desert', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 0, u: 5, theta: 45 } }) === 'sand', 'a landing on sand sprays sand');
  ok(eff({ backdrop: 'forest', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 0, u: 5, theta: 45 } }) === 'leaves' && eff({ backdrop: 'site', engine: 'projectile', objects: [{ figure: 'hammer' }], numbers: { h: 15, u: 0, theta: -90 } }) === 'mud', 'leaves on a forest floor, mud on a building site');
  ok(eff({ backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'firework' }], numbers: { h: 0, u: 30, theta: 80 } }) === 'dust,smoke,burst', 'a firework trails smoke and bursts at the top');
  for (const [q, b] of [['A stone is thrown from the top of a lighthouse 30 m high', 'lighthouse'], ['a pebble is kicked over the edge of a canyon', 'canyon'], ['a rock is thrown into the gorge', 'canyon'], ['a ball is thrown from the top of the waterfall', 'waterfall']]) ok(placeIn(q)?.backdrop === b, `“${q}”: ${b}`);
  ok(eff({ backdrop: 'pitch', engine: 'projectile', objects: [{ figure: 'football' }], numbers: { h: 0, u: 20, theta: 25 } }) === 'net' && eff({ backdrop: 'pitch', engine: 'projectile', objects: [{ figure: 'javelin' }], numbers: { h: 0, u: 20, theta: 25 } }) === 'divot', 'a football on a pitch goes in the goal; anything else digs in');
  ok(eff({ backdrop: 'stadium', engine: 'projectile', objects: [{ figure: 'shot' }], numbers: { h: 2.1, u: 13, theta: 40 } }) === 'divot' && check({ backdrop: 'golf', engine: 'projectile', objects: [{ figure: 'golfBall' }], numbers: { h: 5, u: 40, theta: 15 } }).ok, 'a shot digs into the infield; a golf ball off a raised tee');
  ok(titleOf(check({ backdrop: 'golf', engine: 'projectile', objects: [{ figure: 'golfBall' }], numbers: { h: 5, u: 40, theta: 15 } }).recipe) === 'A golf ball off a raised tee' && titleOf(check({ backdrop: 'pitch', engine: 'projectile', objects: [{ figure: 'football' }], numbers: { h: 0, u: 20, theta: 25 } }).recipe) === 'A football kicked on a football pitch', 'off a raised tee; kicked on a pitch');
  for (const [q, b] of [['A golf ball is struck from the tee box', 'golf'], ['a ball lands on the fairway', 'golf'], ['An athlete putts the shot from 2.1 m', 'stadium'], ['in a shot put competition', 'stadium']]) ok(placeIn(q)?.backdrop === b, `“${q}”: ${b}`);
  for (const [q, b] of [['A stone is thrown from the deck of a ship', 'ship'], ['a ball is dropped from the crest of the dam', 'dam'], ['a child jumps from the top of a slide', 'playground'], ['a ball thrown from the ferry', 'ship']]) ok(placeIn(q)?.backdrop === b, `“${q}”: ${b}`);
  ok(titleOf(check({ backdrop: 'ship', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 12, u: 6, theta: 10 } }).recipe) === 'A stone off the deck of a ship' && check({ backdrop: 'dam', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 50, u: 0, theta: -90 } }).recipe?.effects.join() === 'splash' && titleOf(check({ backdrop: 'playground', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 3, u: 4, theta: 20 } }).recipe) === 'A ball off a play tower', 'off a ship’s deck, a dam into the river, off a play tower');
  ok(placeIn('A footballer takes a free kick') == null, 'a football question keeps the app’s own pitch');
  ok(placeIn('A ship sails 5 km due east of a lighthouse') == null, 'a lighthouse a ship sails past is not where anything is thrown from');
  for (const b of ['canyon', 'waterfall', 'lighthouse']) ok(check({ backdrop: b, engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 40, u: 8, theta: 15 } }).recipe?.effects.join() === 'splash', `off ${BACKDROPS[b].at}, into the water`);
  ok(eff({ backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'rocket' }], numbers: { h: 0, u: 30, theta: 80 } }) === 'dust,smoke', 'a rocket trails smoke');
  ok(eff({ backdrop: 'road', engine: 'projectile', objects: [{ figure: 'hammer' }], numbers: { h: 10, u: 0, theta: -90 }, effects: ['sparks', 'confetti', 'divot'] }) === 'sparks,confetti,divot', 'sparks, confetti and a divot when the recipe asks');
  ok(eff({ backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'waterBalloon' }], numbers: { h: 6, u: 0, theta: -90 } }) === 'splat' && eff({ backdrop: 'bridge', engine: 'projectile', objects: [{ figure: 'waterBalloon' }], numbers: { h: 6, u: 0, theta: -90 } }) === 'splash', 'a water balloon bursts on the ground, splashes in a river');
  ok(eff({ backdrop: 'road', engine: 'projectile', objects: [{ figure: 'phone' }], numbers: { h: 1.2, u: 0, theta: -90 } }) === 'crack', 'a dropped phone cracks');
  ok(check({ backdrop: 'snow', engine: 'projectile', objects: [{ figure: 'diver' }], numbers: { h: 12, u: 8, theta: 10 } }).ok, 'off a snowy ledge');
  for (const [w, f, ex] of [['cat', 'cat', true], ['puppy', 'dog', true], ['chimpanzee', 'monkey', true], ['toad', 'frog', true], ['javelin', 'javelin', true], ['squirrel', 'cat', false], ['flea', 'frog', false], ['kangaroo', 'frog', false]]) ok(figureOf(w).figure === f && figureOf(w).exact === ex, `“${w}” is drawn as ${f}${ex ? '' : ', and the reply says so'}`);
  ok(whoIn('a cat jumps from a wall 2 m high') === 'cat' && whoIn('an athlete throws a javelin at 25 m/s') === 'javelin', 'the animal or the javelin, never the person');
  ok(check({ backdrop: 'house', engine: 'projectile', objects: [{ figure: 'cat' }], numbers: { h: 3, u: 4, theta: 20 } }).ok, 'a cat leaps off a roof');
  ok(placeIn('A stone is dropped from the end of the pier')?.backdrop === 'pier' && placeIn('a brick falls from scaffolding 15 m high')?.backdrop === 'site' && placeIn('thrown from the jetty')?.backdrop === 'harbour', 'a pier, a building site, and a jetty still the harbour');
  ok(check({ backdrop: 'pier', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 8, u: 5, theta: 10 } }).recipe?.effects.join() === 'splash' && check({ backdrop: 'site', engine: 'projectile', objects: [{ figure: 'hammer' }], numbers: { h: 15, u: 0, theta: -90 } }).ok, 'off a pier into the sea; off the scaffolding');
  ok(titleOf(check({ backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'golfBall' }], numbers: { h: 0, u: 40, theta: 15 } }).recipe) === 'A golf ball hit from the ground' && titleOf(check({ backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'football' }], numbers: { h: 0, u: 20, theta: 30 } }).recipe) === 'A football kicked from the ground', 'a golf ball is hit, a football kicked');
  ok(whoIn('A bird drops a fish from 12 m') === 'fish' && whoIn('a package is released from a plane flying at 50 m/s') === 'package', 'what a carrier lets go is what moves');
  const air = (w2) => { const x = fromReading({ understood: true, scenario: 'dropped', h: 80, summary: w2, who: whoIn(w2) })?.recipe; return x && check(x).recipe; };
  ok(air('A helicopter hovering 80 m up drops a parcel.')?.carrier === 'helicopter' && air('A plane flying at 80 m drops a package.')?.carrier === 'plane' && air('A seagull drops a shell from 80 m.')?.carrier === 'bird', 'let go from a helicopter, a plane, a bird: drawn as each');
  const gull = air('A seagull drops a stone from 80 m.');
  ok(gull?.carrier === 'bird' && titleOf(gull) === 'A stone let go from a seagull' && air('A drone drops a ball from 80 m.')?.carrier === 'drone', 'a stone or a ball let go from a seagull or a drone is still drawn with what lets it go, in the question’s word');
  ok(air('A stone is dropped from a hot-air balloon 80 m up.') == null, 'from a balloon, the twelve’s own balloon draws it');
  ok(!/carrier|a drone or a bird/.test(compose(gull).scenario.place), 'the caption names its own carrier, not the list of them: ' + compose(gull).scenario.place);
  ok(check({ backdrop: 'air', carrier: 'zeppelin', engine: 'projectile', objects: [{ figure: 'parcel' }], numbers: { h: 50, u: 0, theta: -90 } }).recipe.carrier === 'balloon' && check({ backdrop: 'air', engine: 'projectile', objects: [{ figure: 'parcel' }], numbers: { h: 50, u: 0, theta: -90 } }).recipe.carrier === 'balloon', 'an unknown carrier, or none, is a balloon');
  ok(!fromReading({ understood: true, scenario: 'arc', h: 0, u: 10, angleDegrees: 40, summary: 'A water balloon is thrown at 10 m/s at 40°.', who: 'water balloon' })?.recipe?.carrier, 'a water balloon is never a carrier');
  const hm = fromReading({ understood: true, scenario: 'arc', h: 1.8, u: 25, angleDegrees: 42, summary: 'A hammer thrower releases the hammer at 25 m/s at 42° from 1.8 m.', who: 'hammer' });
  ok(hm === null || (hm.recipe.objects[0].figure === 'shot' && !hm.notes.some((n) => /wall/.test(n))), 'a hammer thrower’s hammer is the athlete’s, never off a wall');
  const bk = fromReading({ understood: true, scenario: 'arc', h: 2, u: 8, angleDegrees: 50, summary: 'A phone is thrown up from 2 m at 8 m/s at 50°.', who: 'phone' });
  ok(bk.recipe.backdrop === 'ground' && bk.notes.some((n) => /from the thrower’s hand/.test(n)) && !bk.notes.some((n) => /wall/.test(n)) && compose(bk.recipe).scenario.name === 'A phone thrown', 'a release height a hand reaches: the thrower’s hand, no wall');
  for (const [w, f] of [['football', 'football'], ['tennis ball', 'tennisBall'], ['golf ball', 'golfBall'], ['basketball', 'basketball'], ['shot put', 'shot'], ['cannonball', 'shot'], ['snowball', 'snowball'], ['water balloon', 'waterBalloon'], ['mobile phone', 'phone'], ['textbook', 'book'], ['hammer', 'hammer'], ['cricket ball', 'ball']]) ok(figureOf(w).figure === f && figureOf(w).exact, `prop: “${w}” is drawn as ${f}`);
  ok(whoIn('a builder drops a hammer from scaffolding') === 'hammer' && whoIn('a girl throws a tennis ball up') === 'tennis ball', 'props: the thing named, never the person');
  ok(fromReading({ understood: true, scenario: 'dropped', h: 20, summary: 'A phone is dropped from a bridge 20 m up.', who: 'phone' })?.recipe.objects[0].figure === 'phone', 'a dropped phone is drawn as a phone');
  ok(fromReading({ understood: true, scenario: 'arc', h: 0, u: 20, angleDegrees: 30, summary: 'A football is kicked at 20 m/s at 30°.', who: 'football' }) === null, 'a football kicked on a pitch stays on the twelve’s pitch');
  ok(check({ backdrop: 'house', engine: 'twin', objects: [{ figure: 'tennisBall' }, { figure: 'golfBall' }], numbers: { h: 6, 'A.u': 8, 'A.theta': 40, 'B.u': 5, 'B.theta': 10 } }).recipe?.objects.map((o) => o.figure).join() === 'tennisBall,golfBall', 'a recipe naming tennisBall and golfBall gets them, not particles');
  ok(check({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'tennisBall' }], numbers: { start: 'drop', h: 2, e: 0.5 } }).ok, 'a tennis ball bounces as itself');
  for (const [w, f] of [['rocket', 'rocket'], ['firework', 'firework'], ['fireworks', 'firework'], ['model rocket', 'rocket'], ['arrow', 'arrow'], ['sandbag', 'sandbag'], ['bag of flour', 'sandbag'], ['pail', 'bucket'], ['marble', 'marble'], ['penny', 'coin']]) ok(figureOf(w).figure === f && figureOf(w).exact, `“${w}” is drawn as ${f}`);
});

group('Two from one place', () => {
  const c = compose({ backdrop: 'cliff', engine: 'twin', objects: [{ figure: 'car', name: 'the car' }, { figure: 'stone', name: 'the stone' }],
    numbers: { h: 40, 'A.u': 15, 'A.theta': 0, 'B.u': 0, 'B.theta': -90, 'B.t0': 1, g: 9.8 } });
  ok(c.ok && c.scenario.name === 'A car and a stone off a cliff', '“A car and a stone off a cliff”');
  const s = c.kit.solve(c.kit.read(c.boxes));
  // car: 40 = 4.9 t² → t = 20/7; stone, a second later, straight down from rest: the same fall
  near(s.extras.find((e) => e.key === 'tA').value, 20 / 7, 1e-9, 'the car lands at 20/7 s');
  near(s.extras.find((e) => e.key === 'tB').value, 1 + 20 / 7, 1e-9, 'the stone a second later');
  near(s.extras.find((e) => e.key === 'gapX').value, 300 / 7, 1e-9, 'they land 15 × 20/7 m apart');
  ok(s.first === 'the car' && s.f.B.name === 'the stone', 'the car first; each named as the question names it');
  const w = c.kit.working(s, s.f.tMax);
  ok(w.some((x) => /^The car: /.test(x.title)) && w.some((x) => /^The stone, timed from when it sets off/.test(x.title)) && w[w.length - 1].title === 'The two together', 'each launch worked in its own name, then the two together');
  COMPOSED.push(c.scenario);
  const parts = fromReader(c.scenario.id, [{ label: 'a', asks: 'how far apart', answer: 'distance3' }, { label: 'b', asks: 'which first, by how long', answer: 'time3' }], Object.keys(c.boxes));
  near(answerOf(parts[1], s).values[0], 1, 1e-9, '(b) the time between landings is the engine’s');
  COMPOSED.length = 0;
  ok(!check({ backdrop: 'cliff', engine: 'twin', objects: [{ figure: 'ball' }], numbers: { h: 40 } }).ok, 'two from one place needs two');
  ok(/between −90°/.test(check({ backdrop: 'cliff', engine: 'twin', objects: [{ figure: 'ball' }, { figure: 'ball' }], numbers: { h: 40, 'B.theta': 120 } }).reason), 'an angle past straight up is refused in words');
});

console.log('\nFrom a height shows its working when the height is given');
{
  const { solveHeight } = await import('../js/core/height.js');
  const { height } = await import('../js/kits/height.js');
  ok(height.working(solveHeight({ place: 'cliff', g: 9.8, h: 40, u: 15, theta: 0 }), 1).length >= 3, 'the working panel is never left empty');
}

group('The veil names only the recipe’s own pieces', () => {
  const c = check(CAR).recipe, s = steps(c).map((x) => x.say);
  ok(s[0] === 'Placing a cliff' && s.includes('Laying out the sea') && s.includes('Bringing in a car') && s.includes('Adding a splash'), s.join(' / '));
  ok(steps(check({ ...CAR, backdrop: 'road', numbers: { h: 3, u: 6, theta: 0 } }).recipe).some((x) => x.say === 'Adding dust'), 'a road gets dust, not a splash');
});

console.log('\nThe reader’s list of pieces is current');
const { source } = await import('../tools/compose-catalogue.mjs');
ok(fs.readFileSync(new URL('../worker/src/compose.js', import.meta.url), 'utf8') === source(),
   'worker/src/compose.js is what tools/compose-catalogue.mjs makes today (run it after changing the registry)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
