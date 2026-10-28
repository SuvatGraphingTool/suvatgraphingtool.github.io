// compose.test.mjs — the registry, and recipes assembled from it.
//
// The proof that the pieces are the right pieces: every one of the twelve
// ready-made scenarios is written here as a recipe, assembled, and compared
// flag by flag with the one built by hand — and then solved by the engine
// both ways, which must agree to the last digit.
//
//   node test/compose.test.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { assemble, PIECES, ENGINES, KINDS, SCENARIO_KEYS, HAND_BUILT } from '../js/compose/registry.js';
import { SCENARIOS, byId, FLAT_SITE } from '../js/scenarios.js';
import { SITES, siteFor } from '../js/world/world.js';
import { solveLaunch } from '../js/core/solve.js';
import { trajectory } from '../js/core/trajectory.js';
import { flight } from '../js/core/projectile.js';
import { toApp } from '../js/core/question.js';
import { solveObject } from '../js/board/blueprint.js';
import { engineValue } from '../js/core/parts.js';
import { SYSTEM_PROMPT, BOARD_PROMPT, PIECE_GUIDE, SCENARIO_IDS, EXTRACTION_SCHEMA } from '../worker/src/schema.js';

let pass = 0, fail = 0;
const ok = (cond, msg, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.log(`  ✗ ${msg}${detail ? `\n      ${detail}` : ''}`); }
};
const group = (name, fn) => { console.log(`\n${name}`); fn(); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ── the twelve, as recipes ─────────────────────────────────────────── */
const RECIPES = {
  up: { name: 'Thrown straight up', pieces: [
    { piece: 'launch', angle: 'fixed', degrees: 90, from: 'ground' }, { piece: 'stadium', spot: 'up' }] },
  arc: { name: 'Simple arc', pieces: [
    { piece: 'launch', angle: 'free', min: 1, max: 90, from: 'ground' }, { piece: 'stadium', spot: 'arc' }] },
  dropped: { name: 'Dropped', pieces: [
    { piece: 'launch', angle: 'released', from: 'height' }, { piece: 'stadium', spot: 'dropped' }] },
  down: { name: 'Thrown straight down', pieces: [
    { piece: 'launch', angle: 'fixed', degrees: -90, from: 'height' }, { piece: 'stadium', spot: 'down' }] },
  'platform-down': { name: 'Down and off a platform', pieces: [
    { piece: 'launch', angle: 'free', min: -90, max: 0, from: 'height' }, { piece: 'stadium', spot: 'platform-down' }] },
  platform: { name: 'Off a platform', pieces: [
    { piece: 'launch', angle: 'fixed', degrees: 0, from: 'height' }, { piece: 'stadium', spot: 'platform' }] },
  'platform-angle': { name: 'Up and off a platform', pieces: [
    { piece: 'launch', angle: 'free', min: 0, max: 90, from: 'height' }, { piece: 'stadium', spot: 'platform-angle' }] },
  'time-above': { name: 'Time above a line', pieces: [
    { piece: 'launch', angle: 'free', from: 'ground' }, { piece: 'stadium', spot: 'time-above' },
    { piece: 'height-line', at: 6, drag: true }, { piece: 'straight-up' }] },
  parachute: { name: 'Parachute drop', pieces: [
    { piece: 'parachute-phases' }, { piece: 'sky' }, { piece: 'skydiver' }] },
  bullet: { name: 'Dropping vs Firing a Bullet', pieces: [
    { piece: 'launch', angle: 'fixed', degrees: 0 }, { piece: 'range', u: 360, h: 1.5 }, { piece: 'round' },
    { piece: 'released-beside', label: 'released', pair: 'same height' }] },
  monkey: { name: 'Monkey vs Hunter', pieces: [
    { piece: 'launch', angle: 'free' }, { piece: 'plate', backdrop: 'plain', u: 22, h: 1.5 }, { piece: 'banana' },
    { piece: 'target', x: 10.1, y: 9.4, drag: true, aim: true, branches: true, caught: 'caught — every time' },
    { piece: 'drops-from-target', label: 'the monkey', pair: 'same fall' },
    { piece: 'live-sliders', uMin: 4, uMax: 60, uStep: 0.5, thetaMin: -20, thetaMax: 85, thetaStep: 0.5 }] },
  road: { name: 'Along a straight road', pieces: [
    { piece: 'straight-line' }, { piece: 'road' }, { piece: 'vehicle' }] },
};

/* The flags that decide what is solved and drawn. `params` matters only
   where the app reads it — the locked angle — and is otherwise the card's
   sketch, so it is compared where it is read. */
const COMPARED = SCENARIO_KEYS.structural.filter((k) => !['params', 'second', 'descent', 'site', 'spot', 'recipe'].includes(k));

group('All twelve ready-made scenarios, rebuilt from recipes', () => {
  ok(Object.keys(RECIPES).length === SCENARIOS.length && SCENARIOS.every((s) => RECIPES[s.id]),
    `a recipe for every scenario (${SCENARIOS.length})`);
  for (const hand of SCENARIOS) {
    const r = assemble(RECIPES[hand.id]);
    if (!r.ok) { ok(false, `${hand.id} assembles`, r.error); continue; }
    const sc = r.scenario;
    const diff = COMPARED.filter((k) => !same(sc[k], hand[k]));
    ok(!diff.length, `${hand.id}: the same flags as the hand-built one`,
      diff.map((k) => `${k}: ${JSON.stringify(sc[k])} vs ${JSON.stringify(hand[k])}`).join('; '));
    if (hand.lockAngle) ok(sc.params.theta === hand.params.theta, `${hand.id}: the same locked angle`);
    ok(!!sc.descent === !!hand.descent && (!hand.descent || same(Object.keys(sc.descent), Object.keys(hand.descent))),
      `${hand.id}: the same parachute phases, or none`);
    // Where it launches from: a stadium spot, or the flat site of an experiment.
    // The road is drawn on its own and launches from nowhere in the stadium.
    if (hand.road) { ok(!sc.spot && !sc.site, 'road: launched from no stadium spot'); continue; }
    const where = sc.spot ? SITES[sc.spot] : sc.site;
    const handWhere = hand.site || siteFor(hand.id);
    ok(same(where, handWhere), `${hand.id}: launched from the same place`);
    // The companion, compared by what it does with the same inputs.
    if (hand.second || sc.second) {
      ok(sc.second?.label === hand.second?.label, `${hand.id}: the companion has the same name`);
      const samples = [[{ u: 20, theta: 0, h: 1.5, g: 9.81 }, { target: { x: 10.1, y: 9.4 } }],
                       [{ u: 20, theta: 0, h: 0, g: 9.81 }, { target: { x: 4, y: 0.1 } }],
                       [{ u: 5, theta: 30, h: 12, g: 9.81 }, {}]];
      ok(samples.every(([p, m]) => same(sc.second.from(p, m), hand.second.from(p, m))),
        `${hand.id}: the companion starts where the hand-built one does`);
    }
  }
});

group('Assembled, the engine gives the same answers', () => {
  // A launch is solved from the student's values and the scenario's flags —
  // the route js/app.js recompute() takes — so the same flags must give the
  // same flight, to the last digit.
  const solveWith = (sc, given) => {
    const k = { ...given };
    if (sc.noAngle) { k.u = 0; delete k.theta; }
    if (sc.lockAngle) k.theta = sc.params.theta;
    const s = solveLaunch(k, { noAngle: sc.noAngle, lockAngle: sc.lockAngle || sc.aimAtTarget });
    if (!s.ok) return { ok: false, reason: s.reason };
    const f = trajectory({ ...s.params });
    return { ok: true, tMax: f.tMax, range: f.range, apex: f.apex ?? null, end: f.pos(f.tMax) };
  };
  const cases = { up: { u: 14, h: 0 }, arc: { u: 25, theta: 45, h: 0 }, dropped: { h: 80 }, down: { u: 10, h: 45 },
                  'platform-down': { u: 25, theta: -30, h: 25 }, platform: { u: 20, h: 25 },
                  'platform-angle': { u: 28, theta: 45, h: 25 }, 'time-above': { u: 24, theta: 40, h: 0.9 },
                  bullet: { u: 360, h: 1.5 } };
  for (const [id, given] of Object.entries(cases)) {
    const a = solveWith(assemble(RECIPES[id]).scenario, { ...given, g: 9.81 });
    const b = solveWith(byId(id), { ...given, g: 9.81 });
    ok(a.ok && same(a, b), `${id}: the same flight`);
  }
  const m = assemble(RECIPES.monkey).scenario;
  const f = flight({ ...m.second.from({ u: 22, theta: 0, h: 1.5, g: 9.81 }, m.markers), g: 9.81 });
  ok(f && Math.abs(f.pos(0).y - 9.4) < 1e-9, 'the monkey falls from where it hangs');
});

group('A recipe is checked strictly', () => {
  const bad = (recipe, says, msg) => {
    const r = assemble(recipe);
    ok(!r.ok && says.test(r.error), msg, r.ok ? 'it assembled' : r.error);
  };
  const L = { piece: 'launch', angle: 'free' }, S = { piece: 'stadium', spot: 'arc' };
  bad(null, /one object/, 'nothing at all is refused');
  bad({ name: 'x', pieces: [L, S], answer: 42 }, /no "answer"/, 'a field a recipe does not have is refused');
  bad({ pieces: [L, S] }, /name/, 'a recipe without a name is refused');
  bad({ name: 'x', pieces: [L, S, { piece: 'catapult' }] }, /no piece called "catapult"/, 'an unknown piece is refused, by name');
  bad({ name: 'x', pieces: [{ ...L, speed: 20 }, S] }, /no setting "speed"/, 'an unknown setting is refused');
  bad({ name: 'x', pieces: [{ piece: 'launch', angle: 'sideways' }, S] }, /one of: free, fixed, released/, 'a setting out of its list is refused');
  bad({ name: 'x', pieces: [{ piece: 'launch', angle: 'fixed', degrees: 120 }, S] }, /at most 90/, 'a number out of range is refused');
  bad({ name: 'x', pieces: [{ piece: 'launch', angle: 'fixed' }, S] }, /degrees/, 'a fixed angle without its degrees is refused');
  bad({ name: 'x', pieces: [{ piece: 'launch', angle: 'free', min: 60, max: 30 }, S] }, /below the highest/, 'an angle range upside down is refused');
  bad({ name: 'x', pieces: [S] }, /needs a motion/, 'a recipe with nothing moving is refused');
  bad({ name: 'x', pieces: [L] }, /needs a stage/, 'a recipe with nowhere to draw it is refused');
  bad({ name: 'x', pieces: [L, S, { piece: 'sky' }] }, /at most 1 stage/, 'two stages are refused');
  bad({ name: 'x', pieces: [L, S, L] }, /named twice/, 'a piece named twice is refused');
  bad({ name: 'x', pieces: [L, { piece: 'road' }] }, /road is for a straight-line/, 'a launch on the road is refused');
  bad({ name: 'x', pieces: [{ piece: 'straight-line' }, S] }, /drawn on the road stage/, 'a road motion in the stadium is refused');
  bad({ name: 'x', pieces: [L, S, { piece: 'drops-from-target', label: 'it' }] }, /if there is one/, 'something dropping from a target that is not there is refused');
  bad({ name: 'x', pieces: [L, S, { piece: 'target', x: 5, y: 5, branches: true }] }, /tree/, 'a branch with no tree is refused');
  bad({ name: 'x', pieces: [{ piece: 'launch', angle: 'fixed', degrees: 0 }, S, { piece: 'target', x: 5, y: 5, aim: true }] },
    /must be free/, 'aiming with a locked angle is refused');
  bad({ name: 'x', pieces: [L, S, { piece: 'graph-v' }] }, /always there/, 'naming a piece that is always there is refused');
  bad({ name: 'x', pieces: [L, S, { piece: 'live-sliders', uMin: 1, uMax: 9 }] }, /experiment/, 'live sliders in the stadium are refused');
});

group('A new recipe — one no ready-made scenario is', () => {
  // A ball thrown from a height at a free angle, over a line it has to clear:
  // "a ball is thrown from a 20 m cliff… for how long is it more than 25 m up?"
  const r = assemble({ name: 'Above a line, from a cliff', sub: 'thrown up, off a height', pieces: [
    { piece: 'launch', angle: 'free', min: 0, max: 90, from: 'height' }, { piece: 'stadium', spot: 'platform-angle' },
    { piece: 'ball' }, { piece: 'height-line', at: 25, drag: true }] });
  ok(r.ok, 'assembles', r.error);
  const sc = r.scenario;
  ok(/^composed-above-a-line-from-a-cliff-[a-z0-9]+$/.test(sc.id) && sc.group === 'composed' && sc.composed, 'is marked as composed, with its own id');
  ok(!byId(sc.id), 'and does not collide with a ready-made one');
  ok(sc.dragLine && sc.markers.heightLine === 25 && same(sc.theta, { min: 0, max: 90 }), 'carries the flags its pieces stand for');
  ok(!HAND_BUILT.some((k) => k in sc && k !== 'group'), 'and none of the hand-written parts');
  ok(same(sc.recipe.pieces.map((p) => p.piece), ['launch', 'stadium', 'ball', 'height-line']), 'keeps the recipe it was built from');
});

group('A reading that carries a recipe', () => {
  // What the reader sends when none of the twelve fits: scenario "composed",
  // the recipe, and the values the question GIVES — never what it asks for.
  const cliff = { name: 'Above a line, from a cliff', pieces: [
    { piece: 'launch', angle: 'free', min: 0, max: 90, from: 'height' }, { piece: 'stadium', spot: 'platform-angle' },
    { piece: 'height-line', at: 25, drag: true }] };
  const x = { understood: true, confidence: 'high', scenario: 'composed', recipe: cliff,
              summary: 'A ball is thrown at 15 m/s at 40° from a 20 m cliff.', h: 20, u: 15, angleDegrees: 40, heightLine: 22,
              asks: ['time more than 25 m above the ground'] };
  const r = toApp(x);
  ok(r.ok, 'is read', r.error);
  ok(/^composed-/.test(r.id) && byId(r.id)?.composed, 'becomes a scenario the app can choose by its id');
  ok(r.given.u === 15 && r.h === 20 && r.theta === 40 && r.given.g === 9.81, 'with the values the question gave, and g assumed');
  ok(r.markers.heightLine === 22 && r.items.some((it) => it.k === 'line'), 'and its line, because the recipe has one');
  ok(toApp(x).id === r.id, 'the same recipe is the same scenario');

  const o = solveObject(x);
  ok(o.ok && o.above && o.above.above > 0, 'the engine solves it, and finds the time above the line', o.reason);
  ok(o.ok && o.solved.five && o.solved.five.u && Array.isArray(o.solved.extras), 'in the shape a later part carries from (five, extras)');
  ok(engineValue(o.solved, 'tApex') != null && engineValue(o.solved, 'u') === 15, 'and a carry reads it like any other part');

  // Read by its pieces, exactly as the twelve are read by their ids.
  const drop = toApp({ understood: true, scenario: 'composed', recipe: { name: 'Let go over a line', pieces: [
    { piece: 'launch', angle: 'released', from: 'height' }, { piece: 'stadium', spot: 'dropped' }, { piece: 'height-line', at: 10 }] },
    h: 40, u: 7, s: 12, heightLine: 10 });
  ok(drop.ok && drop.given.u === 0 && drop.theta === undefined && drop.given.s === undefined,
    'a released object has no speed, no angle and no horizontal distance');
  const flat = toApp({ understood: true, scenario: 'composed', recipe: { name: 'Fired flat at a target', pieces: [
    { piece: 'launch', angle: 'fixed', degrees: 0 }, { piece: 'stadium', spot: 'bullet' }, { piece: 'target', x: 30, y: 1 }] },
    h: 2, u: 40, angleDegrees: 25, targetX: 30, targetY: 1 });
  ok(flat.ok && flat.theta === 0 && flat.markers.target?.x === 30, 'a fixed angle wins over one the reader sent, and a target is read');
  ok(toApp({ understood: true, scenario: 'composed', recipe: { name: 'Lorry', pieces: [{ piece: 'straight-line' }, { piece: 'road' }] },
    u: 10, v: 20, t: 5 }).given.u === 10, 'a road recipe is read as the road is');

  const bad = toApp({ understood: true, scenario: 'composed', recipe: { name: 'x', pieces: [{ piece: 'trebuchet' }] } });
  ok(!bad.ok && /did not hold together/.test(bad.error) && /trebuchet/.test(bad.error), 'a recipe that does not assemble is refused, with its reason');
  ok(!toApp({ understood: true, scenario: 'composed' }).ok, 'and so is "composed" with no recipe');
});

group('The registry tells the truth about the code', () => {
  // Every engine and every renderer it names exists, exported, in the module it names.
  const src = (m) => readFileSync(new URL(`../${m}`, import.meta.url), 'utf8');
  const exported = (m, name) => new RegExp(`export\\s+(async\\s+)?(function|const|let|class)\\s+${name}\\b`).test(src(m));
  for (const e of ENGINES) ok(e.exports.every((x) => exported(e.module, x)), `engine ${e.id}: ${e.exports.join(', ')} in ${e.module}`);
  for (const p of PIECES.filter((q) => q.render)) {
    ok(p.render.exports.every((x) => exported(p.render.module, x)), `piece ${p.id}: drawn by ${p.render.module}`);
  }
  for (const p of PIECES) {
    ok(KINDS[p.kind] && typeof p.says === 'string' && p.says.length > 8, `piece ${p.id}: a kind, and words for the model`);
    for (const id of p.engines || []) ok(ENGINES.some((e) => e.id === id), `piece ${p.id}: engine ${id} is listed`);
  }
  // Every flag the code reads off a scenario is one the registry has classified.
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (f !== 'compose') walk(p); } else if (f.endsWith('.js')) files.push(p); } };
  walk(new URL('../js', import.meta.url).pathname);
  const read = new Set();
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\b(?:scenario|sc)\??\.([a-zA-Z]+)/g)) read.add(m[1]);
  const known = new Set([...SCENARIO_KEYS.structural, ...SCENARIO_KEYS.words]);
  const unknown = [...read].filter((k) => !known.has(k));
  ok(!unknown.length, `every scenario flag the app reads is classified (${read.size})`, `not in SCENARIO_KEYS: ${unknown.join(', ')}`);
  ok(FLAT_SITE && Object.keys(SITES).length >= 10, 'the stadium spots are the world’s own');
});

group('The reader is told the pieces as the code has them', () => {
  ok(SCENARIO_IDS.includes('composed') && EXTRACTION_SCHEMA.properties.recipe, 'the schema offers "composed" and a recipe');
  for (const p of PIECES.filter((q) => !q.auto)) {
    ok(PIECE_GUIDE.includes(`  ${p.id} — ${p.says}`), `the prompt describes ${p.id} in its own words`);
    for (const [k, v] of Object.entries(p.params || {})) {
      ok(typeof v.says === 'string' && v.says.length > 4 && PIECE_GUIDE.includes(`${k} (`),
         `  and its setting ${k}, with words for the model`);
    }
  }
  ok(!PIECES.some((p) => p.auto && PIECE_GUIDE.includes(`  ${p.id} — `)), 'graphs, working and values are not offered: they always come');
  ok(SYSTEM_PROMPT.includes(PIECE_GUIDE) && BOARD_PROMPT.includes(PIECE_GUIDE), 'the reader and the whiteboard are both told them');
  // Every recipe the prompt shows the model assembles, and its reading goes
  // through — an example that drifted from the code would teach it to fail.
  const shown = [...SYSTEM_PROMPT.matchAll(/^→ (\{.*"scenario":"composed".*\})$/gm)].map((m) => JSON.parse(m[1]));
  ok(shown.length >= 1, `the prompt shows composed examples (${shown.length})`);
  for (const x of shown) {
    const built = assemble(x.recipe);
    ok(built.ok, `example "${x.recipe.name}" assembles`, built.error);
    const r = toApp(x);
    ok(r.ok, `  and its reading reaches the app`, r.error);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
