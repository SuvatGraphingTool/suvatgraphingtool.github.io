// blueprint.test.mjs — the whiteboard's half of the bargain: whatever the
// model lays out, every number on the board is the engine's.
// Run: node test/blueprint.test.mjs
import { readBlueprint, solveObject, solveBoard, FRAMES } from '../js/board/blueprint.js';
import { BOARD_FRAMES } from '../worker/src/schema.js';
import { flight } from '../js/core/projectile.js';
import { solveRoad } from '../js/core/road.js';

let pass = 0, fail = 0;
const near = (a, e, tol, label) => Math.abs(a - e) <= tol
  ? (pass++, console.log(`  ok   ${label} = ${a.toFixed(4)}`))
  : (fail++, console.log(`  FAIL ${label} = ${a}, expected ${e} (±${tol})`));
const ok = (c, label) => c ? (pass++, console.log(`  ok   ${label}`)) : (fail++, console.log(`  FAIL ${label}`));
const group = (n, f) => { console.log(`\n${n}`); f(); };
const read = (x) => readBlueprint({ understood: true, confidence: 'high', summary: 'A test.', ...x });

group('The Worker offers exactly the frames the board can build', () => {
  ok(BOARD_FRAMES.length === FRAMES.length && BOARD_FRAMES.every((f) => FRAMES.includes(f)),
     'worker/src/schema.js and js/board/blueprint.js name the same frames');
});

group('What the model lays out is checked, not trusted', () => {
  const bp = read({ scenario: 'arc', u: 20, angleDegrees: 35, frames: ['graph-v', 'banana', 'graph-v'], notes: [] });
  ok(bp.ok, 'a reading with a layout is a board');
  ok(bp.frames[0] === 'scene', 'the motion itself always comes first');
  ok(bp.frames.includes('given') && bp.frames.includes('answers'), 'given and answers are always there');
  ok(!bp.frames.includes('banana'), 'a frame the board does not have is dropped');
  ok(new Set(bp.frames).size === bp.frames.length, 'and none is put up twice');
  ok(!bp.frames.includes('notes'), 'no notes written, no empty sticky');

  const all = read({ scenario: 'arc', u: 20, angleDegrees: 35 });
  ok(FRAMES.filter((f) => f !== 'notes').every((f) => all.frames.includes(f)), 'no layout at all gets every piece');

  const many = read({ scenario: 'arc', u: 20, angleDegrees: 35, notes: ['a', 'b', 'c', 'd', 'e', 'f', 'x'.repeat(900)],
                      others: [{ scenario: 'arc', u: 1 }, { scenario: 'arc', u: 2 }, { scenario: 'arc', u: 3 }] });
  ok(many.notes.length === 4, 'at most four sticky notes');
  ok(many.frames.includes('notes'), 'and a note written is a note shown');
  ok(many.objects.length === 3, 'at most three objects on one board');

  const chat = readBlueprint({ understood: false, note: 'Hello! Tell me what is thrown.' });
  ok(!chat.ok && chat.chat && /Hello/.test(chat.error), 'a hello is answered, not built');
  ok(!readBlueprint(null).ok, 'nothing back is not a board');
});

group('Every number on the board is the engine\'s', () => {
  const b = solveBoard(read({ scenario: 'platform', h: 30, u: 12 }));
  const o = b.objects[0], f = flight({ u: 12, theta: 0, h: 30, g: 9.81 });
  ok(o.ok, 'a stone off a bridge solves');
  near(o.traj.tFlight, f.tFlight, 1e-9, 'its time of flight is flight()\'s');
  near(o.traj.range, f.range, 1e-9, 'and so is where it lands');
  near(b.tMax, f.tMax, 1e-9, 'the board\'s clock runs to the end of it');

  const ratio = solveBoard(read({ scenario: 'arc', u: 35, ratioFn: 'tan', ratioNum: 3, ratioDen: 4, h: 0 })).objects[0];
  near(ratio.solved.params.theta, Math.atan(3 / 4) * 180 / Math.PI, 1e-9, 'tan θ = 3/4 is resolved in code, not by the model');

  const back = solveBoard(read({ scenario: 'platform-angle', h: 25, angleDegrees: 45, s: 100, g: 9.8 })).objects[0];
  near(back.solved.params.u, 28, 0.01, 'a launch speed worked back from the range, by solveLaunch');

  const road = solveBoard(read({ scenario: 'road', u: 25, v: 0, s: 40 })).objects[0];
  near(road.traj.params.a, solveRoad({ u: 25, v: 0, s: 40 }).f.params.a, 1e-12, 'a braking car, by solveRoad');

  const chute = solveBoard(read({ scenario: 'parachute', h: 1200, tOpen: 4, aChute: 20, vTerm: 5 })).objects[0];
  ok(chute.ok && chute.steps.length >= 3, 'a parachute, by solveDescent, with its working');

  const monkey = solveBoard(read({ scenario: 'monkey', u: 22, h: 1.5, targetX: 10, targetY: 9 })).objects[0];
  ok(monkey.verdict?.kind === 'caught' && monkey.second, 'aimed at the monkey, it is caught — by intercept()');

  const two = solveBoard(read({ scenario: 'arc', u: 15, angleDegrees: 30, h: 0,
                                others: [{ label: '60°', scenario: 'arc', u: 15, angleDegrees: 60, h: 0 }] }));
  near(two.objects[0].traj.range, two.objects[1].traj.range, 1e-9, 'complementary angles land together');
  near(two.tMax, Math.max(...two.objects.map((x) => x.traj.tMax)), 1e-12, 'and the clock runs to the longer flight');
});

group('A board with something missing says what, and an edit fills it', () => {
  const x = { understood: true, scenario: 'road', u: 20 };
  const short = solveObject(x);
  ok(!short.ok && typeof short.reason === 'string' && short.reason.length > 0, 'two short of three, it says so');
  const filled = solveObject(x, { given: { v: 0, s: 50 } });
  ok(filled.ok, 'two values typed on the board and it solves');
  near(filled.traj.params.a, -4, 1e-9, 'to the engine\'s answer');

  const stone = { understood: true, scenario: 'platform', h: 30, u: 12 };
  const higher = solveObject(stone, { h: 80 });
  near(higher.traj.tFlight, flight({ u: 12, theta: 0, h: 80, g: 9.81 }).tFlight, 1e-9, 'a changed height is solved again');
  const cleared = solveObject(stone, { given: { u: null } });
  ok(cleared.given.u === undefined, 'a cleared box is empty, not zero');
  const g10 = solveObject(stone, { given: { g: 10 } });
  near(g10.traj.tFlight, flight({ u: 12, theta: 0, h: 30, g: 10 }).tFlight, 1e-9, 'and g = 10, where the paper says so');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
