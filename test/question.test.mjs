// question.test.mjs — the extraction→engine layer, checked against real questions.
// Run: node test/question.test.mjs

import { toEngine, toApp, APP_SCENARIOS, resolveAngle, speedFromRange, speedFromApex } from '../js/core/question.js';
import { SCENARIO_IDS } from '../worker/src/schema.js';
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
  ok(SCENARIO_IDS.filter((x) => x !== 'other' && x !== 'composed').join() === APP_SCENARIOS.join(),
     "the Worker's schema offers exactly the same list, and a composed one besides");
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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
