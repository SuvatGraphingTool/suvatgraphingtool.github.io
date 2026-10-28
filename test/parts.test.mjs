// parts.test.mjs — a question in parts. Run: node test/parts.test.mjs
import { splitParts, carryInto, engineValue, labelKey, partName } from '../js/core/parts.js';
import { toApp } from '../js/core/question.js';
import { solveLaunch } from '../js/core/solve.js';
import { solveRoad } from '../js/core/road.js';

let pass = 0, fail = 0;
const near = (a, e, tol, label) => Math.abs(a - e) <= tol
  ? (pass++, console.log(`  ok   ${label} = ${a.toFixed(3)}`))
  : (fail++, console.log(`  FAIL ${label} = ${a}, expected ${e} (±${tol})`));
const ok = (c, label) => c ? (pass++, console.log(`  ok   ${label}`)) : (fail++, console.log(`  FAIL ${label}`));
const group = (n, f) => { console.log(`\n${n}`); f(); };

/** What the app does with a reading, minus the screen: toApp, then the engine. */
function engine(reading) {
  const r = toApp(reading);
  if (!r.ok) return { r, solved: null };
  const g = r.given;
  const solved = r.id === 'road'
    ? solveRoad({ s: g.s, u: g.u, v: g.v, a: g.g, t: g.t, mark: r.mark })
    : solveLaunch({ ...g, theta: r.theta, h: r.h }, { lockAngle: r.theta !== undefined && ['up', 'down', 'platform'].includes(r.id) });
  return { r, solved };
}
/** Apply every part in turn, carrying from the engine's earlier answers. */
function run(parts) {
  const answers = {}, out = [];
  for (const p of parts) {
    const c = carryInto(p, answers);
    const e = engine(c.reading);
    if (e.solved?.ok) for (const l of p.labels) answers[l] = e.solved;
    out.push({ ...c, ...e });
  }
  return out;
}

group('No parts is no parts', () => {
  ok(splitParts({ understood: true, scenario: 'up', u: 20 }).length === 0, 'a plain reading has none');
  ok(splitParts({ understood: false, parts: [{ scenario: 'up' }, { scenario: 'arc' }] }).length === 0, 'nor does a chat reply');
  ok(splitParts({ understood: true, parts: 'a, b' }).length === 0, 'nor a parts field that is not a list');
});

group('Labels', () => {
  ok(labelKey('(B)') === 'b' && labelKey('part c') === 'c' && labelKey('(ii)') === 'ii', '"(B)", "part c", "(ii)"');
  ok(partName(['a']) === '(a)' && partName(['a', 'b']) === '(a) and (b)', 'named as the paper names them');
  const p = splitParts({ understood: true, parts: [{ scenario: 'up', u: 5 }, { label: 'a', scenario: 'up', u: 6 }] });
  ok(p[0].labels[0] === 'a' && p[1].labels[0] === 'b', 'missing or repeated labels fall back to a, b, c');
});

group('M1: (a) time to the top, (b) time above a line — two motions', () => {
  const x = { understood: true, confidence: 'high', scenario: 'up', summary: 'A stone is projected vertically upwards from O at 19.6 m/s.', g: 9.8,
    parts: [
      { label: '(a)', scenario: 'up', h: 0, u: 19.6, asks: ['time to the greatest height'] },
      { label: '(b)', scenario: 'time-above', h: 0, u: 19.6, angleDegrees: 90, heightLine: 14.7, asks: ['time more than 14.7 m above O'] },
    ] };
  const parts = splitParts(x);
  ok(parts.length === 2, 'two parts');
  ok(parts[0].g === 9.8 && parts[1].g === 9.8, 'g said once applies to every part');
  const [a, b] = run(parts);
  ok(a.r.id === 'up' && b.r.id === 'time-above', 'Thrown straight up, then Time above a line');
  near(engineValue(a.solved, 'tApex'), 2, 1e-9, '(a) the engine finds the time to the top');
  ok(b.r.markers.heightLine === 14.7, '(b) the line is at 14.7 m');
});

group('Parts about one motion are one motion', () => {
  const p = splitParts({ understood: true, parts: [
    { label: 'a', scenario: 'arc', h: 0, u: 20, angleDegrees: 30, asks: ['greatest height'] },
    { label: 'b', scenario: 'arc', h: 0, u: 20, angleDegrees: 30, asks: ['range'] },
  ] });
  ok(p.length === 1, 'collapsed to one');
  ok(p[0].labels.join() === 'a,b' && p[0].asks.join() === 'greatest height,range', 'keeping both labels and both asks');
});

group('A lorry in three phases — each carries its speed from the one before', () => {
  const parts = splitParts({ understood: true, parts: [
    { label: 'a', scenario: 'road', u: 0, a: 2, t: 10, asks: ['speed after 10 s'] },
    { label: 'b', scenario: 'road', a: 0, t: 30, u: 99, carries: [{ into: 'u', from: '(a)', take: 'v' }], asks: ['distance at constant speed'] },
    { label: 'c', scenario: 'road', v: 0, s: 50, carries: [{ into: 'u', from: 'b', take: 'v' }], asks: ['deceleration'] },
  ] });
  ok(parts.length === 3, 'three parts');
  const [a, b, c] = run(parts);
  ok(a.solved.ok, '(a) solves');
  near(b.reading.u, 20, 1e-9, '(b) u is the engine\'s speed after (a), not the model\'s 99');
  ok(b.carried.length === 1 && b.carried[0].from === 'a', '(b) says where it came from');
  ok(b.solved.ok, '(b) solves');
  near(engineValue(b.solved, 's'), 600, 1e-9, '(b) 600 m at constant speed');
  near(c.reading.u, 20, 1e-9, '(c) carries the speed out of (b)');
  near(engineValue(c.solved, 'a'), -4, 1e-9, '(c) the deceleration');
  const item = c.r.items.find((it) => it.k === 'u');
  ok(item.how === 'carried' && item.from === 'b' && item.take === 'v', 'the carried value is marked as carried, from (b)');
});

group('A carry with nothing to carry from', () => {
  const parts = splitParts({ understood: true, parts: [
    { label: 'a', scenario: 'road', a: 2 },
    { label: 'b', scenario: 'road', a: -1, t: 5, u: 7, carries: [{ into: 'u', from: 'a', take: 'v' }] },
  ] });
  const [a, b] = run(parts);
  ok(!a.solved.ok, '(a) cannot be solved');
  ok(b.missing.length === 1 && b.reading.u === undefined, '(b) is left without u, not handed the model\'s 7');
  ok(!b.solved.ok, 'and the engine says it needs more');
  const odd = carryInto({ labels: ['b'], scenario: 'road', carries: [{ into: 'theta', from: 'a', take: 'v' }, { into: 'u', from: 'a', take: 'mass' }, null] }, {});
  ok(!odd.carried.length && !odd.missing.length, 'fields and quantities it does not know are ignored');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
