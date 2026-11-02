// question.test.mjs — the extraction→engine layer, checked against real questions.
// Run: node test/question.test.mjs

import { toEngine, toApp, APP_SCENARIOS, resolveAngle, speedFromRange, speedFromApex } from '../js/core/question.js';
import { SCENARIO_IDS } from '../worker/src/schema.js';
import { toPlace } from '../worker/src/place.js';
import { solveHeight } from '../js/core/height.js';
import { solveLaunch } from '../js/core/solve.js';
import { solveRoad } from '../js/core/road.js';
import { flight, timeAbove } from '../js/core/projectile.js';
import { GRAVITY, SCENARIOS } from '../js/scenarios.js';
import { GRAVITY as GRAV } from '../js/core/projectile.js';

let pass = 0, fail = 0;
const near = (a, e, tol, label) => {
  const ok = Math.abs(a - e) <= tol;
  ok ? (pass++, console.log(`  ok   ${label} = ${a.toFixed(3)}`))
     : (fail++, console.log(`  FAIL ${label} = ${a.toFixed(3)}, expected ${e} (±${tol})`));
};
const ok = (cond, label) => cond ? (pass++, console.log(`  ok   ${label}`))
                                 : (fail++, console.log(`  FAIL ${label}`));
const group = (n, f) => { console.log(`\n${n}`); f(); };

group('Angles given as ratios — how papers actually write them', () => {
  near(resolveAngle({ ratio: { fn: 'tan', num: 3, den: 4 } }).degrees, 36.8699, 1e-3, 'tan θ = 3/4');
  near(resolveAngle({ ratio: { fn: 'sin', num: 3, den: 5 } }).degrees, 36.8699, 1e-3, 'sin θ = 3/5');
  near(resolveAngle({ ratio: { fn: 'cos', num: 4, den: 5 } }).degrees, 36.8699, 1e-3, 'cos θ = 4/5');
  near(resolveAngle({ ratio: { fn: 'tan', num: 7, den: 24 } }).degrees, 16.2602, 1e-3, 'tan θ = 7/24');
  near(resolveAngle({ degrees: 30, belowHorizontal: true }).degrees, -30, 1e-9, '30° below horizontal');
  ok(!resolveAngle({ ratio: { fn: 'sin', num: 5, den: 3 } }).ok, 'sin θ = 5/3 is refused, not clamped');
  ok(!resolveAngle(null).ok, 'missing angle is refused');
});

group('Working backwards — "show that U = 28" (PMT Year 2 Q4)', () => {
  // 25 m cliff, 45°, lands 100 m from the foot. The paper's answer is U = 28.
  const r = speedFromRange(100, 45, 25, 9.8);
  near(r.u, 28, 1e-6, 'u from R=100, θ=45°, h=25');

  // and it must round-trip through the engine
  const f = flight({ u: r.u, theta: 45, h: 25, g: 9.8 });
  near(f.range, 100, 1e-6, 'engine agrees: range back to 100 m');
});

group('Working backwards — golf ball off a cliff (June 07 Q6)', () => {
  // 35 m s-1, tan α = 3/4, lands 168 m away. Paper's cliff height is 50.4 m.
  const a = resolveAngle({ ratio: { fn: 'tan', num: 3, den: 4 } });
  const f = flight({ u: 35, theta: a.degrees, h: 50.4, g: 9.8 });
  near(f.range, 168, 1e-2, 'range comes out at 168 m');
  // so inverting the range must return 35
  const back = speedFromRange(168, a.degrees, 50.4, 9.8);
  near(back.u, 35, 1e-6, 'u recovered from the range');
});

group('Working backwards from the apex (June 10 Q7)', () => {
  // "The highest point of the path is 12 m above the level of P", u = 40.
  // Round-trip it through the engine rather than trusting a typed-in angle:
  // find the angle that gives a 12 m rise, then check we recover u = 40.
  const theta = Math.asin(Math.sqrt(2 * 9.8 * 12) / 40) * 180 / Math.PI;
  near(theta, 22.54, 0.01, 'angle giving a 12 m rise at u = 40');

  const f = flight({ u: 40, theta, h: 36, g: 9.8 });
  near(f.apexHeight - 36, 12, 1e-6, 'engine confirms the rise is 12 m');

  const r = speedFromApex(12, theta, 9.8);
  near(r.u, 40, 1e-6, 'u recovered from the rise');
  ok(!speedFromApex(12, 0, 9.8).ok, 'a horizontal launch never rises — refused');
  ok(!speedFromApex(-5, 30, 9.8).ok, 'a negative rise is refused');
});

group('Full extraction → engine', () => {
  // The most common shape in the whole sample.
  const r = toEngine({
    understood: true, scenario: 'angled_from_height',
    u: 28, angle: { degrees: 45 }, h: 25, g: 9.8,
    asks: ['time of flight', 'speed on landing'],
  });
  ok(r.ok, 'cliff at 45° is accepted');
  near(r.params.u, 28, 1e-9, 'u passed through');
  near(r.params.theta, 45, 1e-9, 'θ passed through');
  const f = flight(r.params);
  near(f.range, 100, 1e-6, 'engine lands it 100 m out');

  // Ratio angle plus an unknown speed recovered from the range.
  const r2 = toEngine({
    understood: true, scenario: 'angled_from_height',
    angle: { ratio: { fn: 'tan', num: 3, den: 4 } }, h: 50.4, range: 168, g: 9.8,
  });
  ok(r2.ok, 'unknown speed is recovered from the range');
  near(r2.params.u, 35, 1e-4, 'recovered u = 35');
  ok(r2.derived.length >= 2, 'it reports what it calculated rather than pretending it was given');

  // Dropped: no angle needed, u forced to zero.
  const r3 = toEngine({ understood: true, scenario: 'dropped', h: 80, g: 9.8 });
  ok(r3.ok, 'dropped needs no angle');
  near(r3.params.u, 0, 1e-9, 'dropped has u = 0');
  near(flight(r3.params).tFlight, 4.0406, 1e-3, 'falls 80 m in 4.04 s');

  // Thrown down at an angle (June 08 Q7) — the sign trap.
  const r4 = toEngine({
    understood: true, scenario: 'angled_from_height',
    u: 25, angle: { degrees: 30, belowHorizontal: true }, h: 12, g: 9.8,
  });
  near(r4.params.theta, -30, 1e-9, '30° below horizontal stays negative');
  ok(flight(r4.params).apexInFlight === false, 'a downward throw never rises');
});

group('Refusing rather than guessing', () => {
  const r = toEngine({ understood: true, scenario: 'angled_from_ground', h: 0, g: 9.8 });
  ok(!r.ok && r.needsInput, 'missing speed and angle asks the student instead of inventing them');
  ok(r.missing.includes('angle') && r.missing.includes('launch speed'), 'names what is missing');

  ok(!toEngine({ understood: false, note: 'blurry' }).ok, 'an unreadable image is reported, not faked');
  ok(!toEngine(null).ok, 'null input is handled');

  // g defaults to 9.81, the value the rest of the app uses — but the paper's
  // own value wins, and several papers state 10. The explicit 9.8 arguments
  // elsewhere in this file stay as they are: they are testing that a stated
  // value beats the default, which needs a value that differs from it.
  near(toEngine({ understood: true, scenario: 'dropped', h: 10 }).params.g, 9.81, 1e-9, 'g defaults to 9.81');
  near(toEngine({ understood: true, scenario: 'dropped', h: 10, g: 10 }).params.g, 10, 1e-9, "g = 10 is honoured");
  near(toEngine({ understood: true, scenario: 'dropped', h: 10, g: 9.8 }).params.g, 9.8, 1e-9,
       "and a paper that says 9.8 still gets 9.8");
});

group('Markers the scene should draw', () => {
  const r = toEngine({
    understood: true, scenario: 'angled_from_ground', u: 12, angle: { degrees: 45 }, g: 9.8,
    markers: { obstacleDistance: 10, obstacleHeight: 2, heightLine: 4 },
  });
  ok(r.markers.obstacle.x === 10 && r.markers.obstacle.height === 2, 'fence at 10 m, 2 m high');
  ok(r.markers.heightLine === 4, 'height line at 4 m');
});

/* ── one value of g, across the whole app ───────────────────────────────
   Three modules carry an idea of what Earth's gravity is: the scenario data
   every card is seeded from, the GRAVITY list the chips are built from, and
   this reader's default for a question that does not state one. They drifted:
   the reader said 9.8 while everything else said 9.81, so the same question
   typed in and photographed in gave different answers in the last decimal.
   A paper's own stated value still beats all three. */
group('Every part of the app means the same thing by g', () => {
  const fromReader = toEngine({ understood: true, scenario: 'dropped', h: 10 }).params.g;
  const fromChips = GRAVITY.find((x) => x.label === 'Earth').g;
  const fromModel = GRAV.earth.g;
  ok(fromReader === fromChips && fromReader === fromModel,
     `the reader, the chips and the model all say ${fromReader}`);
  ok(fromReader === 9.81, 'and that value is 9.81');
  const seeded = SCENARIOS.map((x) => x.params.g).filter((g) => g > 1);
  ok(seeded.length > 0 && seeded.every((g) => g === 9.81),
     `every scenario on Earth is seeded at 9.81 (${seeded.length} of them)`);
});


/* ── Ask Suvat: the reading, dropped into the app's own screens ─────────── */
group('Ask Suvat — every scenario the reader can choose is one the app has', () => {
  const ids = SCENARIOS.map((x) => x.id);
  ok(APP_SCENARIOS.every((id) => ids.includes(id)), 'toApp only names real scenarios');
  ok(ids.every((id) => APP_SCENARIOS.includes(id)), 'and every scenario can be chosen');
  ok(SCENARIO_IDS.filter((x) => x !== 'other' && x !== 'library' && x !== 'compose').join() === APP_SCENARIOS.join(),
     "the Worker's schema offers exactly the same list");
});

// What the student would have typed, through the same solver Launch uses.
const run = (r) => {
  const sc = SCENARIOS.find((x) => x.id === r.id);
  const k = { ...r.given, theta: r.theta, h: r.h };
  if (sc.noAngle) { k.u = 0; delete k.theta; }
  if (sc.lockAngle) k.theta = sc.params.theta;
  return solveLaunch(k, { noAngle: sc.noAngle, lockAngle: sc.lockAngle });
};

group('Ask Suvat — the cliff question, read and then SOLVED BY THE ENGINE', () => {
  // exactly what Gemini returned for "25 m cliff, 45°, lands 100 m away, g = 9.8"
  const r = toApp({ understood: true, confidence: 'high', scenario: 'platform-angle', summary: '',
                    angle: { belowHorizontal: false, degrees: 45 }, asks: ['speed of projection'],
                    g: 9.8, h: 25, s: 100 });
  ok(r.ok && r.id === 'platform-angle', 'picks Up and off a platform');
  ok(r.given.u === undefined, 'the speed it was asked to find is left for the engine');
  const f = run(r);
  ok(f.ok, 'the engine can run it from what was given');
  near(f.params.u, 28, 1e-6, 'and finds the paper\'s own U = 28');
});

group('Ask Suvat — what the reader must not be trusted with', () => {
  const flat = toApp({ understood: true, scenario: 'platform', summary: '', h: 20, u: 15, v: 0 });
  ok(flat.given.v === undefined, 'a landing speed of 0 is dropped, not believed');
  ok(flat.theta === 0, 'thrown flat is 0°, whatever the reader said');
  near(run(flat).params.u, 15, 1e-9, 'and it still runs');
  const same = toApp({ understood: true, scenario: 'platform', summary: '', h: 20, u: 15, v: 15 });
  ok(same.given.v === undefined, 'nothing off a cliff lands at the speed it left');
  const ratio = toApp({ understood: true, scenario: 'arc', summary: '', u: 35,
                        angle: { ratio: { fn: 'tan', num: 3, den: 4 } } });
  near(ratio.theta, 36.8699, 1e-3, 'tan α = 3/4 is resolved here, not by the model');
  ok(ratio.items.find((i) => i.k === 'theta').how === 'worked', 'and says it was worked out');
  ok(ratio.h === 0 && ratio.items.find((i) => i.k === 'h').how === 'assumed', 'from the ground, said as assumed');
  ok(ratio.given.g === 9.81 && ratio.items.find((i) => i.k === 'g').how === 'assumed', 'g assumed when unstated');
  ok(run(ratio).ok, 'and the engine runs it');
  const down = toApp({ understood: true, scenario: 'platform-down', summary: '', h: 25, u: 25, angle: { degrees: 30 } });
  ok(down.theta === -30, 'a down-and-off throw keeps its sign even when the reader drops it');
  const up = toApp({ understood: true, scenario: 'up', summary: '', u: 14, v: 0 });
  ok(up.theta === 90 && up.h === 0 && run(up).ok, 'thrown straight up from the ground runs from u alone');
  const apex = toApp({ understood: true, scenario: 'up', summary: '', apexAboveLaunch: 10 });
  near(apex.given.u, Math.sqrt(2 * 9.81 * 10), 1e-9, 'u from a greatest height, worked here');
});

group('Ask Suvat — the parachute, however the reader filed it', () => {
  const a = toApp({ understood: true, scenario: 'parachute', summary: '', h: 100, t: 3, v: 6 });
  ok(a.descent.tOpen === 3 && a.descent.vTerm === 6, 'free-fall time and steady speed from t and v');
  ok(a.given.t === undefined && a.given.v === undefined, 'and not left in the five as well');
  const b = toApp({ understood: true, scenario: 'parachute', summary: '', h: 100, tOpen: 3, aChute: 25, vTerm: 6 });
  ok(b.descent.aChute === 25 && b.descent.tOpen === 3, 'or from its own fields');
});

group('Ask Suvat — refusing, not guessing', () => {
  ok(!toApp({ understood: false, scenario: 'other', summary: '', note: 'Not a motion question.' }).ok, 'not a motion question');
  ok(!toApp({ understood: true, scenario: 'other', summary: '' }).ok, 'a motion this app cannot set up');
  ok(!toApp({ understood: true, scenario: 'arc', summary: '', angle: { ratio: { fn: 'sin', num: 5, den: 3 } } }).ok,
     'an impossible ratio');
  ok(!toApp(null).ok, 'nothing at all');
});

group('Ask Suvat — the lorry question, read and then SOLVED BY THE ENGINE', () => {
  // the reading the Worker's own example teaches the model to give
  const r = toApp({ understood: true, confidence: 'high', scenario: 'road', summary: '',
                    v: 34, t: 10, s: 240, atMidpoint: true,
                    asks: ['the value of u', 'time from A to the mid-point of AB'] });
  ok(r.ok && r.id === 'road', 'picks Along a straight road');
  ok(r.given.u === undefined && r.given.g === undefined, 'u and a are left for the engine');
  ok(r.mark === 'mid', 'and the mid-point is the point to time it at');
  ok(!r.items.some((i) => i.how === 'assumed'), 'nothing is assumed — no g on a road');
  const f = solveRoad({ s: r.given.s, u: r.given.u, v: r.given.v, a: r.given.g, t: r.given.t, mark: r.mark });
  near(f.params.u, 14, 1e-9, '(a) u');
  near(f.params.a, 2, 1e-9, 'a');
  near(f.moment.t, 6, 1e-9, '(b) to the mid-point');
  const stop = toApp({ understood: true, scenario: 'road', summary: '', u: 20, v: 0, s: 50 });
  ok(stop.given.v === 0, 'on a road, coming to rest is a real zero');
  const brake = toApp({ understood: true, scenario: 'road', summary: '', u: 20, a: -4, t: 3, atDisplacement: 30 });
  ok(brake.given.g === -4 && brake.mark === 30, 'a braking acceleration keeps its sign, and a named point is kept');
  // what is moving, so the stage draws it
  ok(r.who === undefined, 'a summary that names nothing leaves the lorry');
  const said = (summary) => toApp({ understood: true, scenario: 'road', summary, s: 40, v: 10, t: 5 }).who;
  ok(said('A cyclist moves from A to B with constant acceleration') === 'cyclist', 'a cyclist is a cyclist');
  ok(said('A car leaves the lights; a motorcycle leaves 10 s later') === 'car', 'the first-named traveller wins');
  ok(said('A motorbike passes A') === 'motorcycle' && said('a train between two stations') === 'train', 'a motorbike, and a train');
  ok(said('A girl runs a 400 m race') === 'runner' && said('a girl rides her bicycle') === 'cyclist', 'a person runs unless she rides');
  ok(said('A lorry passes a car') === 'lorry', 'a lorry named first is the lorry');
  ok(said('A girl cycles along a straight road') === 'cyclist' && said('A motorcyclist starts from rest') === 'motorcycle',
     'a girl who cycles is a cyclist, a motorcyclist rides a motorcycle');
});

group('Ask Suvat — M1 June 2015 Q2: straight up, and how long above 14.7 m', () => {
  const asked = { understood: true, confidence: 'high', summary: '', h: 0, u: 19.6, g: 9.8,
                  asks: ['greatest height above O', 'time more than 14.7 m above O'] };
  // what the reader is now taught to say, and what it used to say
  const good = toApp({ ...asked, scenario: 'time-above', angleDegrees: 90, heightLine: 14.7 });
  const old = toApp({ ...asked, scenario: 'up', heightLine: 14.7 });
  for (const [r, label] of [[good, 'read as Time above a line'], [old, 'read as Thrown straight up']]) {
    ok(r.ok && r.id === 'time-above', `${label} → lands on Time above a line`);
    ok(r.theta === 90 && r.markers.heightLine === 14.7, `${label} → at 90°, with the line at 14.7 m`);
    const f = run(r);
    ok(f.ok, `${label} → the engine runs it`);
    const fl = flight(f.params);
    const a = timeAbove(fl, r.markers.heightLine);
    near(a.above, 2, 1e-9, `${label} → above the line for the paper's 2 s`);
    near(fl.uy * fl.uy / (2 * 9.8), 19.6, 1e-9, `${label} → and the greatest height is 19.6 m`);
  }
  ok(good.items.find((i) => i.k === 'theta').vertical, 'the card says it was thrown straight up');
  ok(good.items.some((i) => i.k === 'line'), 'and shows where the line is');
  const plain = toApp({ ...asked, scenario: 'up' });
  ok(plain.id === 'up', 'straight up with no line stays Thrown straight up');
});

/* ── Ask Suvat: a question in parts, and the Past-paper library ─────────── */
{
  const fs = await import('node:fs');
  const { source } = await import('../tools/reader-catalogue.mjs');
  const { LIBRARY_IDS } = await import('../worker/src/library.js');
  const { LIBRARY } = await import('../js/library.js');
  const { KITS } = await import('../js/kits/index.js');
  const { fromReader, answersFor, boxesOf } = await import('../js/parts/answers.js');
  const { walk } = await import('../js/parts/parts.js');
  const { byId } = await import('../js/scenarios.js');
  group('Ask Suvat — the reader is told the library as it is, and its parts come back as the app’s', () => {
    ok(fs.readFileSync(new URL('../worker/src/library.js', import.meta.url), 'utf8') === source(),
       'worker/src/library.js is what tools/reader-catalogue.mjs makes today (run it after changing a scenario)');
    ok(LIBRARY_IDS.join() === LIBRARY.map((s) => s.id).join(), 'it names every library scenario, and nothing else');
    for (const s of LIBRARY) {
      const keys = answersFor(s).map((a) => a.key);
      ok(new Set(keys).size === keys.length && keys.every((k) => /^[a-z]+\d*$/.test(k)), `${s.id}: its answer keys are its own, and look like no box or label`);
      const K = KITS[s.kit];
      const r = K.solve(K.read(s.example));
      for (const a of answersFor(s).filter((x) => x.part.find && !s.parts.includes(x.part))) {
        const [p] = fromReader(s.id, [{ label: 'a', asks: a.say, answer: a.key }]);
        // an answer from another paper is solved with that paper's own boxes
        const run = walk(() => (a.part.example ? K.solve(K.read(a.part.example)) : r), {}, [p])[0];
        ok(run.answer.ok, `${s.id}: its extra answer “${a.say}” is there in the engine’s solution`);
      }
    }
    // a reading Gemma returned for CIE 9709/43 J17 Q5, replayed
    const rd = [{ label: 'i', asks: 'time after B is projected when they collide', answer: 'time2' }, { label: 'ii', asks: 'height above O at which they collide', answer: 'height' }];
    const ps = fromReader('pair-vertical', rd, boxesOf(KITS.pair).map((f) => f.key));
    const K = KITS.pair, runs = walk((b) => K.solve(K.read(b)), { 'A.h': 0, 'A.u': 12, 'B.h': 0, 'B.u': 20, 'B.t0': 2, g: 10 }, ps);
    ok(Math.abs(runs[0].answer.values[0] - 1 / 7) < 1e-9, 'CIE 9709/43 J17 Q5 (i), read by the reader: 1/7 s after B — as the mark scheme');
    // and the original twelve: a kicked ball, three parts
    const arc = fromReader('arc', [{ label: 'a', asks: 'greatest height', answer: 'top' }, { label: 'b', asks: 'time of flight', answer: 'flight' }, { label: 'c', asks: 'the impulse', answer: 'nope' }]);
    ok(arc.length === 3 && arc[0].find === 'f.apexHeight' && arc[1].find === 'f.tFlight' && !arc[2].find && arc[2].say, 'a projectile’s parts map to the flight’s own answers; one it cannot give says so');
    ok(fromReader('arc', [{ label: 'b', asks: 'x', answer: 'top', uses: ['zz'] }])[0].uses === undefined, 'a part cannot lean on a part that is not there');
    ok(fromReader('pair-vertical', [{ label: 'a', asks: 'x', given: { 'B.t0': 2, evil: 1, 'A.u': {} } }], ['B.t0', 'A.u'])[0].given['B.t0'] === 2
       && Object.keys(fromReader('pair-vertical', [{ label: 'a', asks: 'x', given: { 'B.t0': 2, evil: 1 } }], ['B.t0'])[0].given).length === 1, 'a part’s given only sets boxes the scenario has');
    ok(byId('arc') && fromReader('nope', []) === null, 'an unknown scenario reads as no parts');
  });
}


// A question that names where it starts from is shown there: the cliff scene, not the pitch.
{
  const cliff = toPlace({ understood: true, scenario: 'dropped', summary: 'A ball falls from a 60 m cliff.', h: 60 }, 'pushed off a 60 m cliff');
  ok(cliff.library === 'from-a-height' && cliff.boxes.place === 'cliff' && cliff.boxes.u === 0 && cliff.boxes.theta === 0, 'pushed off a cliff: the cliff scene, from rest');
  const r = solveHeight({ ...cliff.boxes, g: 9.81 });
  ok(r.ok, 'and the engine runs it once g is the app\u2019s 9.81');
  const up = toPlace({ understood: true, scenario: 'platform-angle', summary: 'Thrown up from a 30 m tower.', h: 30, u: 14, angleDegrees: 90,
    parts: [{ label: 'a', answer: 'top' }, { label: 'b', answer: 'flight' }, { label: 'c', answer: 'vLand' }] });
  ok(up.boxes.place === 'tower' && up.boxes.theta === 90 && up.parts.map((p) => p.answer).join() === 'height,time,speed', 'a tower throw straight up keeps its three parts, renamed');
  ok(toPlace({ understood: true, scenario: 'arc', summary: 'From the ground.', h: 0, u: 20, angleDegrees: 30 }).scenario === 'arc', 'no place named: left as read');
  ok(toPlace({ understood: true, scenario: 'platform-angle', summary: 'From a cliff.', h: 20, u: 10, ratioFn: 'tan', ratioNum: 3, ratioDen: 4 }).scenario === 'platform-angle', 'an angle given as a ratio stays with the twelve');
}


// A diving board, a well, a balloon: From a height's places, never a composer refusal.
{
  const w = 'a person jumping off a diving board no angle given, the board is 10 m high and jumps at 7 m/s';
  // the diving board is the composer's own place now (a person, the pool): the
  // recipe stays composed, the jump straight up, and the reply says so
  const { toFigure } = await import('../worker/src/composeplace.js');
  const { check: checkRecipe, assumedNotes } = await import('../js/compose/recipe.js');
  const r = toPlace(toFigure({ understood: true, scenario: 'compose', summary: 'A person jumps off a 10 m board.', recipe: { backdrop: 'board', engine: 'projectile', objects: [{ figure: 'person' }], numbers: { h: 10, u: 7 } } }, w), w);
  ok(r.scenario === 'compose' && checkRecipe(r.recipe).ok && r.recipe.numbers.theta === 90 && /straight up/.test(assumedNotes(r).join(' ')),
     'a board recipe is drawn, never "no backdrop called board"; the angle-less jump straight up and said');
  const wl = toPlace({ understood: true, scenario: 'compose', summary: 'A stone dropped down a well.', recipe: { backdrop: 'well', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 20, u: 0 } } }, 'a stone dropped down a 20 m well');
  ok(wl.scenario === 'compose' && checkRecipe(wl.recipe).ok, 'a well recipe is drawn by the composer, never refused');
  const l = toPlace({ understood: true, scenario: 'library', library: 'from-a-height', summary: 'A person jumps.', boxes: { place: 'board', h: 10, u: 7, theta: 0 } }, w);
  ok(l.boxes.theta === 90 && /straight up/.test(l.summary), 'read as a flat launch, the jump is put straight up');
  ok(toPlace({ understood: true, scenario: 'library', library: 'from-a-height', summary: 'x', boxes: { place: 'board', h: 10, u: 7, theta: 30 } }, 'a diver jumps at 7 m/s at 30 degrees').boxes.theta === 30, 'an angle the student gave is kept');
  ok(solveHeight({ place: 'board', h: 10, u: 7, theta: 90, g: 9.81 }).ok, 'and the engine runs the jump');
  ok(toPlace({ understood: true, scenario: 'compose', recipe: { backdrop: 'cliff', engine: 'projectile', numbers: { h: 40, u: 15, theta: 0 } } }, 'car off a cliff').scenario === 'compose', 'a recipe the composer can draw is left to it');
}

// QA 1 Nov: a composed scene with no parts showed "This question has no parts. Each one stops the motion…"
{
  const { stripHTML } = await import('../js/parts/strip.js');
  ok(stripHTML([], [], -1, []) === '', 'a scene with no parts has no parts strip at all');
  ok(!/no part/.test(stripHTML([{ label: 'a', out: 'mechanics' }], [null], -1, [])), 'nor one whose only part is out of scope');
}

// QA 1 Nov: "a stone dropped down a 20 m well" read as u = 0, θ = 0 was refused ("give the angle as 90 or −90")
{
  const w = solveHeight({ place: 'well', h: 20, u: 0, theta: 0, g: 9.81 });
  ok(w.ok, 'a stone let go at rest down a well is a drop, whatever angle it was read with');
  near(w.f.tFlight, Math.sqrt(40 / 9.81), 1e-9, 'and it takes the drop\'s time, √(2h/g)');
  ok(!solveHeight({ place: 'well', h: 20, u: 5, theta: 0, g: 9.81 }).ok, 'thrown across at 5 m s⁻¹ in a well is still refused');
}

// QA 1 Nov: what From a height still needs, settled from the student's words
{
  const balloon = toPlace({ understood: true, scenario: 'dropped', summary: 'A sandbag is released from a balloon at 100 m rising at 4 m/s.', h: 100, u: 4 },
    'sandbag dropped from a hot air balloon at 100 m rising at 4 m/s');
  ok(balloon.boxes.place === 'balloon' && balloon.boxes.theta === 90 && solveHeight({ ...balloon.boxes, g: 9.81 }).ok, 'a balloon rising at 4 m s⁻¹ carries the sandbag up, and the engine runs it (it was refused, read flat)');
  const down = toPlace({ understood: true, scenario: 'library', library: 'from-a-height', summary: 'x', boxes: { place: 'balloon', h: 50, u: 3, theta: 0 } }, 'a balloon descending at 3 m/s drops a bag from 50 m');
  ok(down.boxes.theta === -90, 'one descending carries it down');
  const well = toPlace({ understood: true, scenario: 'platform', summary: 'x', h: 30, u: 5 }, 'stone chucked into a 30m well at 5 m/s');
  ok(well.boxes.place === 'well' && well.boxes.theta === -90, 'thrown into a well, it goes down the well');
  const board = toPlace({ understood: true, scenario: 'up', summary: 'A diver jumps up at 3 m/s from a 10 m board.', h: 10, u: 3 }, 'diver jumps up off 10m board at 3 m/s');
  ok(board.library === 'from-a-height' && board.boxes.place === 'board', '"off a 10m board" is the diving board');
  ok(toPlace({ understood: true, scenario: 'up', summary: 'x', h: 2, u: 3 }, 'ball thrown up from a 2 m high whiteboard shelf').library === undefined, 'a whiteboard is not a diving board');
  const pushed = toPlace({ understood: true, scenario: 'platform', summary: 'A ball is pushed off a 60 m cliff.', h: 60 }, 'ball pushed off a 60 m cliff');
  ok(pushed.boxes.u === 0 && /from rest/.test(pushed.summary) && solveHeight({ ...pushed.boxes, g: 9.81 }).ok, 'pushed off with no speed anywhere, it starts from rest, said, and runs');
  ok(toPlace({ understood: true, scenario: 'platform', summary: 'x', h: 60, s: 30 }, 'ball pushed off a 60 m cliff, it lands 30 m out').boxes.u === undefined, 'a landing distance given instead is never overruled by a speed of zero');
  ok(toPlace({ understood: true, scenario: 'platform', summary: 'x', h: 60 }, 'ball pushed off a 60 m cliff, how fast was it pushed if it lands 30 m out').boxes.u === undefined, 'nor a question asking how fast');
}

// QA 1 Nov: "A starts from rest at 2 m/s², B passes at 6 m/s: when does A catch B, how far have they gone" —
// read with answer "time" and "distance", both parts said "Not one this app works out for you"
{
  const { fromReader } = await import('../js/parts/answers.js');
  const ps = fromReader('two-on-a-road', [
    { label: 'a', asks: 'when does A catch B', answer: 'time' },
    { label: 'b', asks: 'how far have they gone', answer: 'distance' },
    { label: 'c', asks: 'how fast is A going when it passes B', answer: 'speed' },
  ]);
  ok(ps[0].find === 'events.overtake.t', 'a "time" for when one catches the other is the meeting');
  ok(ps[1].find === 'events.overtake.x', 'and how far, where it happens');
  ok(!ps[2].find, 'a speed asked "when it passes" is never answered with the time it passes');
  ok(fromReader('two-on-a-road', [{ label: 'a', asks: 'when are they level', answer: 'meeting2' }])[0].find === 'events.overtake.t', 'a numbered key that is not there is read as its kind');
}

// The user, 1 Nov: "why does it give me 3 part options its just one" — parts only when the question is marked in parts
{
  const x = { understood: true, scenario: 'library', library: 'from-a-height', summary: 'x', boxes: { place: 'board', h: 10, u: 7, theta: 90 },
    parts: [{ label: 'a', asks: 'time', answer: 'time' }, { label: 'b', asks: 'speed', answer: 'speed' }, { label: 'c', asks: 'height', answer: 'height' }] };
  ok(!toPlace(x, 'a person jumping off a 10 m board at 7 m/s').parts, 'a one-line question keeps no parts a reader made up');
  ok(!toPlace(x, 'how long does it take and how fast does it hit the water').parts, 'nor two asks in one sentence');
  ok(toPlace(x, '(a) find the time (b) find the speed (c) the height').parts?.length === 3, '(a) (b) (c) keep their parts');
  ok(toPlace(x, 'i) time ii) speed').parts && toPlace(x, 'a) time b) speed').parts && toPlace(x, 'do part b').parts, 'and i), a) and "part b"');
  ok(toPlace(x, '').parts?.length === 3, 'a photo or a PDF (no words) is trusted to have its parts');
  ok(!toPlace(x, 'a ball (mass 2 kg) is thrown up').parts, 'a bracket that is not a label is not a part');
}
// The user, 1 Nov: "give me one scenario, then … an option to see the second one" — a part with a set-up of its own
{
  const { sceneOf, ownScene, labelOf } = await import('../js/parts/parts.js');
  const lib = { understood: true, confidence: 'high', scenario: 'library', library: 'from-a-height', summary: 'A stone from a 20 m tower.', boxes: { place: 'tower', h: 20, u: 0, theta: 0 } };
  const b = { label: '(b)', asks: 'time when thrown up at 5 m/s', answer: 'time', scene: { boxes: { u: 5, theta: 90 } } };
  const s = sceneOf(lib, b);
  ok(ownScene(b) && !ownScene({ label: 'a' }) && labelOf(b) === 'b', 'a part with a scene has a set-up of its own');
  ok(s.library === 'from-a-height' && s.boxes.h === 20 && s.boxes.u === 5 && s.boxes.theta === 90 && s.parts.length === 1 && !s.parts[0].scene, 'its reading is the question\'s, with what it changes, and only its own part');
  ok(solveHeight({ ...s.boxes, g: 9.81 }).ok, 'and the engine runs it');
  const up = sceneOf({ understood: true, scenario: 'up', summary: 'x', h: 0, u: 20, example: true }, { label: 'b', asks: 'at 30', scene: { u: 30 } });
  ok(up.scenario === 'up' && up.u === 30 && up.h === 0 && !up.example, 'one of the twelve takes the changed field');
  const rc = sceneOf({ scenario: 'compose', recipe: { engine: 'projectile', numbers: { h: 40, u: 15 } } }, { label: 'c', recipe: { engine: 'projectile', numbers: { h: 0, u: 20, theta: 30 } } });
  ok(rc.scenario === 'compose' && rc.recipe.numbers.h === 0, 'a part with a recipe of its own is that composed scene');
  const other = sceneOf(lib, { label: 'b', scene: { scenario: 'up', u: 12 } });
  ok(other.scenario === 'up' && other.u === 12 && !other.boxes, 'a whole reading of its own is another situation, not the question\'s');
}

// QA 2 Nov: "pushed off a 60 m cliff" replied "t = (v − u)/a → t = 3.5 · t = 3.497 s in the air": each result said once
{
  const d = solveHeight({ place: 'cliff', h: 60, u: 0, theta: 0, g: 9.81 }).derived.join(' ').replace(/<[^>]+>/g, '');
  ok(!/→/.test(d) && (d.match(/t=/g) || []).length === 1 && /3\.497/.test(d), 'From a height says its time once, to the paper\'s places, with its unit');
}

// QA 2 Nov: "a train accelerates from rest to 20 m/s in 40 s, travels at 20 m/s for 2 min, then decelerates to rest in 30 s"
// read with the held speed in the hold stage's v2 and no v3: "Not enough to fix the journey yet"
{
  const w = 'a train accelerates from rest to 20 m/s in 40 s, travels at 20 m/s for 2 min, then decelerates to rest in 30 s. (a) total distance';
  const j = toPlace({ understood: true, scenario: 'library', library: 'journey-stages', summary: 'A train.', boxes: { n: 3, u: 0, k1: 'up', t1: 40, v2: 20, k2: 'hold', t2: 120, k3: 'down', t3: 30 } }, w);
  ok(j.boxes.v1 === 20 && j.boxes.v2 === undefined && j.boxes.v3 === 0, 'the held speed is the speed stage 1 ends at, and "to rest" ends stage 3 at 0');
  const { byId } = await import('../js/scenarios.js'), { KITS } = await import('../js/kits/index.js');
  const K = KITS[byId('journey-stages').kit], sv = K.solve(K.read({ ...j.boxes, g: 9.81 }));
  ok(sv.ok && Math.abs(sv.J.D - 3100) < 1e-6, 'and the engine finds the whole distance, 400 + 2400 + 300 = 3100 m');
  const kept = toPlace({ understood: true, scenario: 'library', library: 'journey-stages', summary: 'x', boxes: { n: 3, u: 0, k1: 'up', v1: 20, t1: 40, k2: 'hold', t2: 120, k3: 'down', v3: 0, t3: 30 } }, w);
  ok(kept.boxes.v1 === 20 && kept.boxes.v3 === 0 && kept.boxes.v2 === undefined, 'a reading already right is left as it was');
}

// QA 2 Nov: "a coin is flicked off a 0.8 m table at 2 m/s" replied "The engine works out the rest: nothing else was needed." — and no answer
{
  const { readoutHTML } = await import('../js/ai/readout.js');
  const r = toApp({ understood: true, confidence: 'high', scenario: 'platform', summary: 'A coin is flicked off a 0.8 m table at 2 m/s.', h: 0.8, u: 2 });
  const sv = solveLaunch({ u: 2, theta: 0, h: 0.8, g: 9.81 });
  const html = readoutHTML(r, { name: 'Off a platform', solved: sv, flight: sv.f });
  const said = html.replace(/<[^>]+>/g, '');
  ok(/in the air for t=0\.4/.test(said) && /0\.81\s*m out/.test(said) && /4\.44\s*m s/.test(said), 'the reply says what the engine found: 0.40 s, 0.81 m out, 4.44 m s⁻¹');
  ok(!/sqrt|\^|\*|<=/.test(said), 'set as maths');
}

// QA 2 Nov: "skater rolls off a 1.2m wall at 4 m/s, how far does he land" — the reply gave the time and the speed, never how far
{
  const d = solveHeight({ place: 'ground', h: 1.2, u: 4, theta: 0, g: 9.81 }).derived.join(' ').replace(/<[^>]+>/g, '');
  ok(/1\.978\s*m out/.test(d), 'the reply says how far out it lands: 1.978 m');
  ok(!/m out/.test(solveHeight({ place: 'tower', h: 20, u: 0, theta: 0, g: 9.81 }).derived.join(' ')), 'and says nothing of it for a drop, which lands at the foot');
}

// UI critic, 2 Nov: the engine's box said t twice, gave v with no unit, and wrapped badly on a phone
{
  const { readoutHTML, resultsHTML } = await import('../js/ai/readout.js');
  const r = toApp({ understood: true, confidence: 'high', scenario: 'up', summary: 'A ball is thrown up at 20 m/s.', h: 0, u: 20 });
  const sv = solveLaunch({ u: 20, theta: 90, h: 0, g: 9.81 });
  const said = readoutHTML(r, { name: 'Thrown straight up', solved: sv, flight: sv.f }).replace(/<[^>]+>/g, '');
  ok(!/→/.test(said) && (said.match(/t=/g) || []).length === 1 && /lands at 20\s*m s/.test(said), 'the twelve say t once, and every speed with its unit');
  const list = resultsHTML(['it hits the water', 'x']);
  ok(/<ul class="ro-res"><li>It hits the water<\/li><li>X<\/li><\/ul>/.test(list), 'what the engine found is a list, one result to a line, each a sentence');
}

// QA 2 Nov: "a ball is dropped from 2 m and rebounds with half its speed, how high does it go after" — never answered.
// A one-line question's made-up parts are dropped (they are not parts), but what they ask is kept, with its answer key
{
  const one = toPlace({ understood: true, scenario: 'library', library: 'bounce', summary: 'x', boxes: { start: 'drop', h: 2, e: 0.5 },
    parts: [{ label: 'a', asks: 'how high it goes after', answer: 'height' }] }, 'a ball is dropped from 2 m and rebounds with half its speed, how high does it go after');
  ok(!one.parts && one.asked?.[0]?.answer === 'height', 'no parts, but what it asks is kept, with its answer key');
  const { fromReader } = await import('../js/parts/answers.js');
  const { answerOf } = await import('../js/parts/parts.js');
  const { byId } = await import('../js/scenarios.js'), { KITS } = await import('../js/kits/index.js');
  const p = fromReader('bounce', [{ label: 'a', ...one.asked[0] }])[0];
  const K = KITS[byId('bounce').kit], sv = K.solve(K.read({ start: 'drop', h: 2, e: 0.5, g: 9.81 }));
  ok(p.find === 'extras.H1' && Math.abs(answerOf(p, sv).values[0] - 0.5) < 1e-9, 'and the engine answers it: 0.5 m after the bounce');
}

// THE USER, 2 Nov: Edexcel M1 June 2018 Q4 from a photo — "Not enough to run it yet", and w = 10, y = 1 in the values.
// The bounce scenario's own paper: 0.2 kg projected down at U from A, 2.5 m up; rebounds at 10 m/s; impulse 7 N s;
// (a) U = 24 (b) from the bounce to first passing B, 1 m up: 0.11 s (c) the v–t graph from A to B
{
  const read = { understood: true, confidence: 'high', scenario: 'library', library: 'bounce', paper: 'Edexcel M1',
    summary: 'A 0.2 kg ball is projected vertically downwards at U m/s from A, 2.5 m above the ground, and rebounds at 10 m/s; the impulse from the ground is 7 N s.',
    boxes: { start: 'down', h: 2.5, w: 10, m: 0.2, I: 7, y: 1, axis: 'down' },
    parts: [{ label: 'a', asks: 'find U', answer: 'speed3' }, { label: 'b', asks: 'time from hitting the ground to first passing B', answer: 'time2' },
      { label: 'c', asks: 'sketch the velocity-time graph from A to B', answer: 'graph' }] };
  const x = toPlace(read, '');                          // a photo: no words typed
  ok(x.boxes.g === 9.8 && x.gFrom === 'Edexcel', 'an Edexcel M1 paper takes its rubric\'s g = 9.8, and says whose it is');
  ok(x.boxes.stop === 'y' && x.parts?.length === 3, 'a sketch "from A to B" runs to B, and a photo keeps its three parts');
  ok(toPlace({ ...read, paper: undefined }, '').boxes.g === undefined, 'no paper named: g is left to the app, Earth\'s, assumed');
  const { fromReader } = await import('../js/parts/answers.js');
  const { walk } = await import('../js/parts/parts.js');
  const { byId } = await import('../js/scenarios.js'), { KITS } = await import('../js/kits/index.js');
  const K = KITS[byId('bounce').kit], sv = K.solve(K.read(x.boxes));
  const runs = walk(() => sv, {}, fromReader('bounce', x.parts, Object.keys(x.boxes)));
  ok(sv.ok && runs[0].answer.values[0] === 24, '(a) U = 24 m s⁻¹, from the impulse');
  ok(Math.abs(runs[1].answer.values[0] - 0.105448) < 1e-5, '(b) 0.11 s from the bounce to first passing B');
  ok(runs[2].part.kind === 'graph' && Math.abs(runs[2].moment.t - sv.f.tMax) < 1e-9 && Math.abs(sv.f.tMax - sv.yAfter.t) < 1e-9, '(c) the graph, the run ending at B');
}

// QA 2 Nov: the lorry, "(b) the time from A to the mid-point of AB", read with answer "t" — answered 10 s, the whole time; the mid-point is 6 s
{
  const { fromReader } = await import('../js/parts/answers.js');
  const ps = fromReader('road', [{ label: 'a', asks: 'the value of u', answer: 'u' }, { label: 'b', asks: 'time from A to the midpoint of AB', answer: 't' }, { label: 'c', asks: 'speed at the mid-point', answer: 'v' }]);
  ok(ps[0].find === 'five.u.value' && ps[1].find === 'moment.t' && ps[2].find === 'moment.v', 'a time or a speed at the mid-point is the moment the engine timed, not the whole run');
  const r = solveRoad({ v: 34, t: 10, s: 240, mark: 'mid' });
  ok(r.ok && Math.abs(r.moment.t - 6) < 1e-9 && Math.abs(r.moment.v - 26) < 1e-9, 'and the engine times it: 6 s, at 26 m s⁻¹');
}

// QA 2 Nov: "a cyclist slows from 12 m/s to 4 m/s over 40 m, find the deceleration" — the ask was never answered: "deceleration" is not "acceleration"
{
  const { fromReader } = await import('../js/parts/answers.js');
  ok(fromReader('road', [{ label: 'a', asks: 'the deceleration' }])[0].find === 'five.a.value' && fromReader('road', [{ label: 'a', asks: 'its retardation' }])[0].find === 'five.a.value', 'a deceleration or a retardation asked is the acceleration the engine found');
}

// THE USER, 2 Nov: "a button to choose gravity … 9.81 and 9.8 and 10, and then just a text box"
{
  const { parseG, loadG, saveG, withChosenG, G_CHIPS } = await import('../js/ai/gchoice.js');
  ok(G_CHIPS.join() === '9.81,9.8,10', 'the three chips: 9.81, 9.8, 10');
  ok(parseG('9.78') === 9.78 && parseG(' 9,8 ') === 9.8 && parseG('10 m s^-2') === 10, 'a value typed in the box is read');
  ok([0, -9.8, '', 'abc', '9.8.1', '1e3', 'NaN', '-0'].every((v) => parseG(v) === null), '0, negative and nonsense are refused');
  // the choice outlives a reload: it is kept in the viewer's storage, and a storage that throws is survived
  const mem = new Map(), store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  ok(loadG(store) === null, 'never chosen: no choice');
  saveG(9.8, store);
  ok(loadG(store) === 9.8, 'chosen once, it is there after a reload');
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  ok(loadG(broken) === null && (saveG(10, broken), true), 'a private window that refuses storage is survived');
  // a reading with no g takes the choice; a g the question states wins; Edexcel's rule gives way to it
  const twelve = withChosenG({ understood: true, scenario: 'up', u: 20 }, 9.8);
  ok(twelve.g === 9.8 && twelve.gFrom === 'choice' && toApp(twelve).given.g === 9.8 && toApp(twelve).items.find((i) => i.k === 'g').how === 'chosen', 'one of the twelve with no g takes the chosen 9.8, said as your choice');
  ok(withChosenG({ understood: true, scenario: 'up', u: 20, g: 10 }, 9.8).g === 10, 'a g the question states wins over the choice');
  const lib = withChosenG({ understood: true, scenario: 'library', library: 'bounce', boxes: { h: 2 } }, 10);
  ok(lib.boxes.g === 10 && lib.gFrom === 'choice', 'a library reading with no g takes it in its boxes');
  ok(withChosenG({ understood: true, scenario: 'library', library: 'bounce', boxes: { h: 2, g: 9.8 }, gFrom: 'Edexcel' }, 10).boxes.g === 10, 'Edexcel’s 9.8 gives way to a choice the student made');
  const comp = withChosenG({ understood: true, scenario: 'compose', recipe: { engine: 'projectile', numbers: { h: 5 } } }, 9.8);
  ok(comp.recipe.numbers.g === 9.8, 'a composed scene with no g takes it in its numbers');
  ok(withChosenG({ understood: true, scenario: 'up', u: 20 }, null).g === undefined, 'never chosen: the reading is left to Earth’s 9.81, assumed');
  ok(withChosenG({ understood: false, note: 'hi' }, 9.8).g === undefined, 'a chat reply is left alone');
}

// QA 2 Nov: "a firework accelerates up at 6 m/s² for 3 s — max height", read with answer "height": two heights, so none was given.
// Of several answers of one kind, the one whose words the part shares is chosen; a tie is never guessed
{
  const { fromReader } = await import('../js/parts/answers.js');
  ok(fromReader('firework-rocket', [{ label: 'a', asks: 'the greatest height it reaches', answer: 'height' }])[0].find === 'Htop', 'the greatest height is the greatest height, not the height at 5 s');
  ok(fromReader('firework-rocket', [{ label: 'a', asks: 'how long until it lands', answer: 'time' }])[0].find === 'tLand', 'and the time until it lands, of two times');
  ok(!fromReader('firework-rocket', [{ label: 'a', asks: 'a time', answer: 'time' }])[0].find, 'with nothing to tell them apart, none is guessed');
}

// QA 2 Nov: "a car at 30 m/s passes a lorry doing a steady 20 m/s and brakes at 2 m/s²: when does the lorry catch it" —
// refused, "A would slow to a stop and go backwards". A braking car brakes to rest
{
  const x = toPlace({ understood: true, scenario: 'library', library: 'two-on-a-road', summary: 'x', boxes: { 'A.u': 30, 'A.a': -2, 'B.u': 20 } }, 'car brakes at 2 m/s^2');
  ok(x.boxes['A.V'] === 0, 'braking with nothing said of where it ends: to rest');
  const { byId } = await import('../js/scenarios.js'), { KITS } = await import('../js/kits/index.js');
  const K = KITS[byId('two-on-a-road').kit], sv = K.solve(K.read(x.boxes));
  const pass = sv.ok && sv.events.find((e) => e.kind === 'overtake');
  ok(pass && Math.abs(pass.t - 10) < 1e-6 && Math.abs(pass.x - 200) < 1e-6, 'and the lorry catches it at 10 s, 200 m on, before it stops');
  ok(toPlace({ understood: true, scenario: 'library', library: 'two-on-a-road', summary: 'x', boxes: { 'A.u': 30, 'A.a': -2, 'A.V': 10, 'B.u': 20 } }, '').boxes['A.V'] === 10, 'a speed it slows to that the question gives is kept');
}

// THE USER, 2 Nov: "the AI should ask for gravity right there when it says Show me the flight … some questions have nothing to do with gravity"
{
  const { gStated, gAskHTML } = await import('../js/ai/gchoice.js');
  const { KITS } = await import('../js/kits/index.js');
  // 1 · a motion under gravity, no g in the question: asked
  ok(!gStated({ understood: true, scenario: 'up', u: 20 }) && !gStated({ understood: true, scenario: 'library', library: 'bounce', boxes: { h: 2 } }), 'no g in the question: it is not stated, so the reply may ask');
  const html = gAskHTML({ g: 9.81, from: '' });
  ok(/Which/.test(html) && (html.match(/class="chip"/g) || []).length === 3 && /aria-pressed="true">9\.81/.test(html) && /assumed · Earth’s 9\.81/.test(html) && /ask-gq-in/.test(html), 'the question: 9.81, 9.8, 10 and a box, with 9.81 pressed and said to be assumed');
  ok(/aria-pressed="true">9\.8</.test(gAskHTML({ g: 9.8, from: 'choice' })) && /your choice/.test(gAskHTML({ g: 9.8, from: 'choice' })), 'the last choice is pressed, and said to be theirs');
  ok(/assumed · Edexcel’s 9\.8/.test(gAskHTML({ g: 9.8, from: 'Edexcel' })) && /value="9\.78"/.test(gAskHTML({ g: 9.78, from: 'choice' })), 'an Edexcel paper’s 9.8 is assumed; a value of their own sits in the box');
  // 2 · g stated in the question: not asked — but a rule's 9.8 or a choice is not the question's
  ok(gStated({ understood: true, scenario: 'up', u: 20, g: 10 }) && gStated({ understood: true, scenario: 'library', library: 'bounce', boxes: { g: 9.8 } }) && gStated({ understood: true, scenario: 'compose', recipe: { numbers: { g: 9.8 } } }), 'a g the question states: never asked');
  ok(!gStated({ understood: true, scenario: 'library', library: 'bounce', boxes: { g: 9.8 }, gFrom: 'Edexcel' }) && !gStated({ understood: true, scenario: 'up', g: 9.8, gFrom: 'choice' }), 'Edexcel’s rule or an earlier choice is not the question stating it');
  // 3 · gravity-free motion: the kit says so — a lift, two on a road, a journey, vectors, a graph to read
  ok(['lift', 'lanes', 'journey', 'plane', 'vtgraph', 'xtgraph', 'twotrains'].every((k) => KITS[k] && !KITS[k].g), 'a lift, two on a road, a journey, i and j, a graph read: no g in the kit, so never asked');
  ok(['height', 'bounce', 'pair', 'target', 'rocket'].every((k) => KITS[k]?.g), 'a fall, a bounce, two in a vertical line, a projectile, a firework: g in the kit, so asked when not stated');
  ok(gAskHTML(null) === '', 'nothing asked, nothing shown');
}

// QA, 2 Nov: a ramp's 6 s, a net to clear, and a student's "how high", "how far", "how long"
{
  const { toPlace } = await import('../worker/src/place.js');
  const { fromReader } = await import('../js/parts/answers.js');
  const { byId } = await import('../js/scenarios.js'), { KITS } = await import('../js/kits/index.js');
  const ramp = 'A skateboarder starts from rest and accelerates at 1.5 m/s² for 6 s. (a) how fast at the bottom (b) how long is the ramp';
  ok(toPlace({ understood: true, scenario: 'road', summary: 'x', u: 0, a: 1.5 }, ramp).t === 6, 'a time the reader left out of a road question is the one time in its words');
  ok(toPlace({ understood: true, scenario: 'road', summary: 'x', u: 0, a: 1.5 }, 'from rest at 1.5 m/s² for 6 s, then 4 s more').t == null, 'two times in the words: neither is guessed');
  ok(toPlace({ understood: true, scenario: 'road', summary: 'x', u: 0, a: 1.5, v: 9 }, ramp).t == null, 'three of the five already: nothing added');
  const serve = 'a tennis ball is served horizontally at 30 m/s from 2.8 m above the court. the net is 0.9 m high and 12 m away. does it clear the net';
  const x = toPlace({ understood: true, scenario: 'compose', summary: 'x', who: 'tennis ball', recipe: { backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'tennisBall' }], numbers: { h: 2.8, u: 30, theta: 0 } }, asked: [{ asks: 'does it clear the net', answer: 'height' }] }, serve);
  ok(x.library === 'over-the-wall' && x.boxes.h0 === 2.8 && x.boxes.u === 30 && x.boxes.theta === 0 && x.boxes.d === 12 && x.boxes.H === 0.9 && x.boxes.kind === 'net', 'a net to clear, composed by the reader: over the wall, with the net 0.9 m high and 12 m away');
  ok(x.asked?.length === 1 && !x.asked[0].answer, 'and "does it clear" is the engine’s own line, not a height');
  const K = KITS[byId('over-the-wall').kit], sv = K.solve(K.read({ ...x.boxes, g: 9.81 }));
  ok(sv.ok && /clears by .*1\.115/.test(sv.derived[0]), 'it clears by 1.115 m');
  ok(toPlace({ understood: true, scenario: 'arc', summary: 'x', u: 20, angleDegrees: 30 }, 'a ball is kicked at 20 m/s at 30° over a 2 m wall 15 m away').boxes?.kind === 'wall', 'one of the twelve, with a wall in the words: over the wall too');
  ok(toPlace({ understood: true, scenario: 'arc', summary: 'x', u: 20, angleDegrees: 30 }, 'a ball is kicked at 20 m/s at 30° from a wall').scenario === 'arc', 'a wall with no height or distance: left as it was');
  const one = (id, asks) => fromReader(id, [{ label: 'a', asks }])?.[0];
  ok(one('road', 'how long is the ramp')?.find === 'five.s.value' && one('up', 'how long until it lands')?.find === 'f.tFlight', '"how long is the ramp" is a distance; "how long until it lands" a time');
  ok(one('from-a-height', 'how far out does it land')?.find === 'out' && one('from-a-height', 'horizontal distance')?.find === 'out', 'From a height answers how far out it lands');
  ok(one('the-lift', 'how far it rises')?.kind === 'distance' && one('from-a-height', 'how fast is it going when it lands')?.find === 'vL', '"how far" and "how fast" name their kind');
  const C = (await import('../js/compose/recipe.js')).compose({ title: 'A rock on the Moon', backdrop: 'moon', engine: 'projectile', objects: [{ figure: 'stone' }], numbers: { h: 0, u: 4, theta: 90, g: 1.6 } });
  const { COMPOSED } = await import('../js/scenarios.js');
  if (C?.ok) COMPOSED.push(C.scenario);
  const moon = C?.ok ? fromReader(C.scenario.id, [{ label: 'a', asks: 'how high does it go' }])?.[0] : null;
  if (C?.ok) COMPOSED.splice(COMPOSED.indexOf(C.scenario), 1);
  ok(moon && moon.either?.length === 2 && moon.either.every((q) => /greatest/.test(q.say)), '"how high does it go", composed: the greatest height — above the ground or the start, which from the ground are one — never the height it started from');
  const { fromReading } = await import('../js/compose/recipe.js');
  const lunar = fromReading({ understood: true, scenario: 'up', summary: 'An astronaut throws a rock straight up on the Moon at 4 m/s.', h: 0, u: 4, angleDegrees: 90, g: 1.6, who: 'rock', asks: ['how high does it go'], words: 'on the moon an astronaut throws a rock straight up at 4 m/s. how high does it go' });
  ok(lunar?.scenario === 'compose' && lunar.asks?.[0] === 'how high does it go', 'composed from one of the twelve, what the question asks goes with it');
  ok(fromReading({ understood: true, scenario: 'platform', summary: 'x', h: 0.8, u: 2, who: 'coin', asked: [{ asks: 'how far out', answer: 'range' }] })?.asked?.[0]?.answer === 'distance', 'and its answer key is the composed scene’s own');
  const tot = one('journey-stages', 'total time to run 100 m');
  ok(tot?.either?.length === 2 && tot.either.every((q) => /whole/.test(q.ask || q.say)), 'a "total" time is the whole time (the journey asks it two ways; the reply says it when both agree)');
  const sprint = toPlace({ understood: true, scenario: 'library', library: 'journey-stages', summary: 'x', boxes: { n: 2, u: 0, k1: 'up', v1: 10, t1: 4, k2: 'hold', t2: 0, D: 100 } }, 'a sprinter accelerates from rest to 10 m/s in 4 s and then runs at that speed. how long to run 100 m');
  ok(sprint.boxes.t2 == null && sprint.boxes.t1 === 4, 'a stage the reader gave 0 s is a time it did not know, left to the engine');
  const phone = toPlace({ understood: true, scenario: 'compose', summary: 'A phone is dropped from a descending hot air balloon at 40 m.', recipe: { backdrop: 'air', carrier: 'balloon', engine: 'projectile', objects: [{ figure: 'phone' }], numbers: { h: 40, u: -3 } } }, 'a hot air balloon is descending at 3 m/s when a passenger drops a phone from 40 m up');
  ok(phone.recipe.numbers.u === 3 && phone.recipe.numbers.theta === -90, 'from a descending balloon, u = −3 with no angle: 3 m/s straight down');
  ok(toPlace({ understood: true, scenario: 'compose', summary: 'x', recipe: { backdrop: 'air', carrier: 'balloon', engine: 'projectile', objects: [{ figure: 'phone' }], numbers: { h: 40, u: 3 } } }, 'a balloon rising at 3 m/s lets go a phone at 40 m').recipe.numbers.theta === 90, 'from a rising one: straight up');
  ok(one('arc', 'how long was it in the air')?.find === 'f.tFlight', '"how long was it in the air" is the time of flight');
  ok(one('from-a-height', 'how deep is the well')?.find === 'h', '"how deep is the well" is the height it was let go from');
  const well = toPlace({ understood: true, scenario: 'library', library: 'from-a-height', summary: 'x', boxes: { place: 'well', h: 0, u: 0, theta: 0, t: 2.5 } }, 'a stone is dropped down a well and hits the water 2.5 s later. how deep is the well');
  ok(!('h' in well.boxes) && well.boxes.t === 2.5, 'a well 0 m deep with a time: the depth is what is asked, left to the engine');
  const bike = toPlace({ understood: true, scenario: 'compose', summary: 'x', recipe: { backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'motorcycle' }], numbers: { h: 0, u: 25, theta: 20 } }, asked: [{ asks: 'whether he reaches the platform', answer: 'distance' }] }, 'a stuntman rides a motorbike off a ramp at 25 m/s at 20 degrees. the landing platform is 2 m lower and 40 m away. does he reach it');
  ok(bike.recipe.numbers.h === 2, 'a platform "2 m lower": launched 2 m above where it lands');
  const desk = toPlace({ understood: true, scenario: 'compose', summary: 'x', recipe: { backdrop: 'table', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 1.2, s: 0.9 } } }, 'a ball rolls off a 1.2 m high desk and lands 0.9 m from the foot of the desk');
  ok(desk.recipe.numbers.theta === 0, 'what rolls off a desk leaves it flat');
  const light = toPlace({ understood: true, scenario: 'road', summary: 'x', u: 22, a: -6, s: 50 }, 'a car at 22 m/s sees a red light 50 m ahead. the driver reacts after 0.6 s and then brakes at 6 m/s². does it stop before the light');
  ok(light.library === 'journey-stages' && light.boxes.k1 === 'hold' && light.boxes.t1 === 0.6 && light.boxes.k2 === 'down' && light.boxes.a2 === 6 && light.boxes.v2 === 0 && light.boxes['at.s'] === 50, 'a reaction time, then braking: two stages, steady then braking to rest, timed at the light');
  const JK = KITS[byId('journey-stages').kit], jv = JK.solve(JK.read(light.boxes));
  ok(jv.ok && Math.abs(jv.J.D - 53.533) < 1e-3, 'and it needs 53.53 m: it does not stop before the light');
  const { solveRoad } = await import('../js/core/road.js');
  ok(/stops before it has gone/.test(solveRoad({ u: 22, a: -6, s: 50 }).reason) && /40\.33/.test(solveRoad({ u: 22, a: -6, s: 50 }).reason), 'braking that stops short of the distance says where it stops, not that the three do not fix it');
  const hi = one('up', 'how high does it go');
  ok(!hi.find && hi.either?.length === 2 && hi.either.every((q) => q.kind === 'height'), '"how high", with two heights it cannot choose between: both kept, for the reply to say when they agree');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
