// recipe.js — a recipe from Ask Suvat, checked, and turned into a scenario.
//
// The reader (worker/src/schema.js, COMPOSING A SCENE) answers a question no
// library scenario fits with a RECIPE: which backdrop, which figures, which
// engine they follow and the numbers the question gives.
//
//   { "title": "A car off a cliff", "backdrop": "cliff", "engine": "projectile",
//     "objects": [{ "figure": "car" }], "numbers": { "h": 40, "u": 15, "theta": 0 } }
//
// check() holds it to the registry (js/compose/registry.js): a piece that is
// not there, a figure the engine's view cannot draw, a number that is not a
// number or not one of the engine's boxes, is refused with a reason a student
// can read. compose() turns a good recipe into a scenario of the library's
// own shape, with a kit made from the engine's kit (js/kits/): the same boxes,
// solve, working, readouts and graphs — only the stage is the composed one
// (js/render/composed.js). So the app plays it by the route every library
// scenario takes, and a question in parts steps through it the same way
// (js/parts/).
//
// Nothing here calculates (CLAUDE.md rule 4). The engine solves; this file
// only says which engine, with which boxes.

import { BACKDROPS, FIGURES, EFFECTS, ENGINES, ANSWERS, LANDS_WITH, MOMENTS, CARRIERS, LAUNCHERS, figureOf, belowOf, placeOf, placeIn, carrierIn, launcherIn } from './registry.js';
import { toApp } from '../core/question.js';
import { KITS } from '../kits/index.js';
import { GRAVITY } from '../scenarios.js';
import { num, M } from '../notation.js';
import * as stage from '../render/composed.js';

const isNum = (x) => typeof x === 'number' && isFinite(x);
/** "1/3" as the paper writes it: [1, 3], or null. */
const FRAC = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/;
const parts = (v) => { const m = typeof v === 'string' && v.match(FRAC); return m ? [Number(m[1]), Number(m[2])] : null; };
/** The kit reads a fraction as the flighttime kit does: the number it stands for. */
const frac = (v) => { const p = parts(v); return p ? p[0] / p[1] : v; };
const word = (x) => (typeof x === 'string' ? x.trim().toLowerCase() : '');
// what the reader wrote is shown as text: no markup gets through
const clip = (x, n) => String(x ?? '').replace(/[<>&"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const listOf = (o) => Object.keys(o).join(', ');
/** A sentence's first letter up. */
const Up = (s) => s.replace(/^./, (c) => c.toUpperCase());
// what skids on landing, and what sinks
const WHEELS = ['car', 'lorry', 'motorcycle', 'bus', 'tractor', 'monsterTruck'];
const SINKS = ['stone', 'shot', 'hammer', 'coin', 'marble', 'particle', 'phone', 'book', 'sandbag', 'bucket', 'parcel', 'car', 'lorry', 'motorcycle', 'bus', 'tractor', 'monsterTruck', 'snowmobile', 'cyclist'];
/** What it is let go from, in the question's own word: "a seagull", "a helicopter". */
const carrierName = (r) => (r.carrierWord ? `${/^[aeiou]/.test(r.carrierWord) ? 'an' : 'a'} ${r.carrierWord}` : CARRIERS[r.carrier || 'balloon'].label);

/** The biggest number any box takes: past this a value is a misreading. */
const HUGE = 1e5;
/** Earth's g, as the app's own gravity chooser has it. */
const EARTH = GRAVITY.find((x) => x.label === 'Earth').g;

/**
 * Hold a recipe to the registry.
 * @returns {{ ok: true, recipe } | { ok: false, reason }} — `recipe` normalised:
 *          names lower-cased, numbers only those the engine takes
 */
export function check(raw) {
  const no = (reason) => ({ ok: false, reason });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return no('There is no scene to compose: the recipe is empty.');
  const engine = word(raw.engine), E = ENGINES[engine];
  if (!E) return no(`There is no engine called “${clip(raw.engine, 30) || 'nothing'}”. The engines are: ${listOf(ENGINES)}.`);
  if (!E.ready) return no(`${Up(E.label)} is one of the app’s engines, but the composed stage does not draw it yet.`);
  const backdrop = word(raw.backdrop) || (E.view === 'side' ? 'ground' : '');
  if (!BACKDROPS[backdrop]) return no(`There is no backdrop called “${clip(raw.backdrop, 30)}”. The backdrops are: ${listOf(BACKDROPS)}.`);
  // what it lands on, when the question says it is not the place's own
  const below = belowOf(backdrop, raw.below);
  const B = placeOf({ backdrop, below });
  // an engine whose motion ends on solid ground (a bounce, one thrown up from
  // the foot of the place) is not set over water
  if (E.below && !E.below.includes(B.below)) {
    return no(`${Up(E.label)} needs solid ground below: ${B.label.toLowerCase()} has ${({ sea: 'the sea', river: 'a river' })[B.below] || B.below} under it.`);
  }

  const objs = Array.isArray(raw.objects) ? raw.objects.filter((o) => o && typeof o === 'object') : [];
  const [lo, hi] = E.objects;
  if (objs.length < lo || objs.length > hi) {
    return no(`${Up(E.label)} moves ${lo === hi ? lo : `${lo} to ${hi}`} ${lo === 1 && hi === 1 ? 'thing' : 'things'}; the recipe has ${objs.length}.`);
  }
  const objects = [], notes = [];
  for (const o of objs) {
    // the question's own word for it, drawn as itself or as the closest figure
    // there is — and then the reply says so
    // a registry name as it is (tennisBall), else the question's word
    let figure = FIGURES[o.figure] ? o.figure : word(o.figure);
    if (!FIGURES[figure]) {
      const m = figureOf(figure);
      if (!m.figure) return no(`The recipe does not say what moves. The figures are: ${listOf(FIGURES)}.`);
      if (!m.exact) notes.push(nearest(m));
      figure = m.figure;
    }
    const F = FIGURES[figure];
    if (B.only && !B.only.includes(figure)) {
      const can = B.only.map((k) => FIGURES[k].label);
      return no(`From ${B.at} only ${can.slice(0, -1).join(', ')} or ${can[can.length - 1]} can fall: not ${F.label}.`);
    }
    if (E.figures && !E.figures.includes(figure)) {
      const can = E.figures.map((k) => FIGURES[k].label);
      return no(`${Up(E.label)} is for ${can.slice(0, -1).join(', ')} or ${can[can.length - 1]}: not ${F.label}.`);
    }
    if (!F.views.includes(E.view)) {
      return no(`${Up(F.label)} is drawn ${F.views.includes('plan') ? 'from above' : 'side on'}, and ${E.label.toLowerCase()} is seen ${E.view === 'plan' ? 'from above' : 'side on'}.`);
    }
    objects.push({ figure, name: clip(o.name, 30) });
  }
  // unnamed, they are told apart: "the first ball", "the second ball" — or,
  // two different things, by what they are: "the car", "the stone"
  const same = new Set(objects.map((o) => o.figure)).size < objects.length;
  objects.forEach((o, i) => {
    const noun = FIGURES[o.figure].label.replace(/^an? /, '');
    if (!o.name) o.name = same ? `the ${['first', 'second'][i]} ${noun}` : `the ${noun}`;
  });

  const numbers = {};
  const given = raw.numbers && typeof raw.numbers === 'object' ? raw.numbers : {};
  for (let [k, v] of Object.entries(given)) {
    const say = E.names?.[k];
    if (!(k in E.boxes)) return no(`The scene was given a value ${E.label.toLowerCase()} does not use (${clip(k, 20)}). It uses ${Object.values(E.names || {}).join(', ')}.`);
    if (v == null) continue;
    // a choice box takes only its own words
    if (E.choices?.[k]) {
      const w = word(String(v));
      if (!E.choices[k].includes(w)) return no(`${Up(say)} is one of: ${E.choices[k].join(', ')}; the recipe has “${clip(v, 20)}”.`);
      numbers[k] = w;
      continue;
    }
    // a fraction as the paper writes it ("1/3") goes to the kit as typed,
    // which reads it as its number; a number written as text is that number
    const pq = parts(v);
    if (pq) {
      if (!(pq[1] > 0)) return no(`${Up(say)} has nothing below the line: check the question.`);
      numbers[k] = v.replace(/\s+/g, '');
      continue;
    }
    if (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v)) v = Number(v);
    if (!isNum(v)) return no(`${Up(say)} should be a number; the recipe has “${clip(v, 20)}”.`);
    if (Math.abs(v) > HUGE) return no(`${num(v)} for ${say} is far too big to be right: check the question.`);
    numbers[k] = v;
  }
  // what each engine cannot do without, said in its own words
  if (engine === 'projectile') {
    if (isNum(numbers.h) && numbers.h < 0) return no('The height it starts at is above what it lands on: give it as a positive number.');
    // (a dolphin or a fish leaps from the water below: from there, h is 0)
    const leaps = objects.every((o) => FIGURES[o.figure]?.swims) && ['sea', 'river', 'pool'].includes(B.below);
    if (B.edge && isNum(numbers.h) && numbers.h === 0 && !leaps) return no(`Launched from ${B.at.replace(/^an? /, 'the ')}, it starts above ${({ floor: 'the floor', sea: 'the sea', river: 'the river', pool: 'the water', well: 'the water' })[B.below] || 'the ground'}: the height cannot be 0.`);
    // from the ground itself it has to leave it: upwards, and moving
    if (!B.edge && numbers.h === 0 && ((isNum(numbers.theta) && numbers.theta <= 0) || numbers.u === 0)) {
      return no('From the ground it must be launched upwards: give a speed, and an angle above 0°.');
    }
    if (isNum(numbers.theta) && Math.abs(numbers.theta) > 90) return no('The angle is between −90° (straight down) and 90° (straight up).');
  }
  if (engine === 'twin') {
    if (isNum(numbers.h) && numbers.h < 0) return no('The height they start at is above what they land on: give it as a positive number.');
    for (const k of ['A.theta', 'B.theta']) if (isNum(numbers[k]) && Math.abs(numbers[k]) > 90) return no(`${Up(E.names[k])} is between −90° (straight down) and 90° (straight up).`);
    for (const k of ['A.t0', 'B.t0']) if (isNum(numbers[k]) && numbers[k] < 0) return no(`${Up(E.names[k])} is a time from the start: give it as 0 or more.`);
    // from the ground itself, each has to leave it: upwards, and moving
    if (!B.edge && numbers.h === 0) for (const n of ['A', 'B']) {
      if ((isNum(numbers[`${n}.theta`]) && numbers[`${n}.theta`] <= 0) || numbers[`${n}.u`] === 0) return no(`From the ground ${n === 'A' ? 'the first' : 'the second'} must be launched upwards: give it a speed, and an angle above 0°.`);
    }
  }
  if (engine === 'pair' || engine === 'bounce') {
    for (const k of ['h', 'A.h', 'B.h']) if (isNum(numbers[k]) && numbers[k] < 0) return no(`${Up(E.names[k])} is measured up from the ground: give it as a positive number.`);
    for (const k of ['A.t0', 'B.t0']) if (isNum(numbers[k]) && numbers[k] < 0) return no(`${Up(E.names[k])} is a time from the start: give it as 0 or more.`);
    for (const k of ['e', 'n', 'U', 'V', 'w', 'H', 'T']) if (isNum(numbers[k]) && numbers[k] < 0) return no(`${Up(E.names[k])} is a size: give it as a positive number.`);
    const e = parts(numbers.e);
    if ((isNum(numbers.e) && numbers.e > 1) || (e && e[0] > e[1])) return no('A ball keeps at most all its speed at a bounce: the fraction is between 0 and 1.');
    if (isNum(numbers.n) && !(Number.isInteger(numbers.n) && numbers.n >= 1 && numbers.n <= 6)) return no('The impacts to watch are a whole number from 1 to 6.');
  }
  if (isNum(numbers.g) && !(numbers.g > 0)) return no('g is the size of the acceleration: a positive number.');

  const effects = [];
  for (const e of Array.isArray(raw.effects) ? raw.effects : []) {
    const n = word(e);
    if (!EFFECTS[n]) return no(`There is no effect called “${clip(e, 20)}”. The effects are: ${listOf(EFFECTS)}.`);
    if (!effects.includes(n)) effects.push(n);
  }
  // what its moments make, unless the recipe says: a meeting flashes, a
  // bounce rings, a landing splashes or kicks up dust
  // (a place's own: a crater on the Moon); a rocket trails smoke as it flies
  // (or what it is: a water balloon bursts, a dropped phone cracks — on dry ground;
  // leaves on a forest floor, sand in a desert, mud on a building site)
  const dry = !['sea', 'river', 'pool', 'well'].includes(B.below), own = dry && objects.map((o) => FIGURES[o.figure].lands).find(Boolean);
  // a ball kicked on a football pitch goes in the goal: its net bulges
  const goalward = backdrop === 'pitch' && objects.some((o) => ['football', 'ball'].includes(o.figure)) ? 'net' : null;
  // a long jumper lands in the stadium's sand pit
  const pit = backdrop === 'stadium' && objects.some((o) => o.figure === 'diver') && !(numbers.h > 0) ? 'sand' : null;
  // off a trampoline with heights from its mat, it comes down on the mat: no dust
  const mat = /trampolin/i.test(String(raw.launcher ?? '')) && !(numbers.h > 0);
  const lands = mat ? null : MOMENTS[engine] || own || goalward || pit || B.lands || LANDS_WITH[B.below];
  if (!effects.length && lands) effects.push(lands);
  if (objects.some((o) => o.figure === 'rocket' || o.figure === 'firework') && !effects.includes('smoke') && !(raw.effects || []).length) effects.push('smoke');
  // with nothing asked: a vehicle down on dry ground skids and smokes as it
  // brakes; something heavy that goes into water sinks, bubbles coming up
  if (!(raw.effects || []).length && MOMENTS[engine] == null) {
    if (dry && objects.some((o) => WHEELS.includes(o.figure)) && !effects.includes('skid')) effects.push('skid');
    if (!dry && objects.some((o) => SINKS.includes(o.figure)) && !effects.includes('bubbles')) effects.push('bubbles');
  }
  // the moment it leaves: a leap from dry level ground kicks up dust; leaving a branch shakes leaves down
  if (!(raw.effects || []).length && engine === 'projectile') {
    // (never off a synthetic runway or a rider gliding over snow)
    const leaper = objects.some((o) => FIGURES[o.figure]?.animal || o.figure === 'diver');
    if (leaper && !mat && !(numbers.h > 0) && dry && backdrop !== 'stadium' && !effects.includes('kick')) effects.push('kick');
    if (backdrop === 'orchard' && !effects.includes('rustle')) effects.push('rustle');
    // a shot, a brick or a hammer down on tarmac, a floor or concrete: a shockwave of dust and cracks
    if (['road', 'floor'].includes(B.below) && objects.some((o) => ['shot', 'brick', 'hammer'].includes(o.figure)) && effects.length === 1 && ['dust', 'crack', 'ring'].includes(effects[0])) effects[0] = 'shockwave';
  }
  // a volcanic bomb trails smoke as it flies
  if (backdrop === 'volcano' && !(raw.effects || []).length && !effects.includes('smoke')) effects.push('smoke');
  // a firework bursts at the top of its flight, when it goes up at all
  if (objects.some((o) => o.figure === 'firework') && !effects.includes('burst') && !(raw.effects || []).length) effects.push('burst');
  // a place with its own gravity says so
  if (B.g && !isNum(numbers.g)) notes.push(`${Up(B.on || B.label)} g is ${M`${num(B.g, 2, { trim: true })} [m s^-2]`}, not Earth’s ${M`9.81 [m s^-2]`}: the engine uses it.`);

  // let go high in the air: from what the recipe says, or a balloon
  let carrier, carrierWord;
  if (backdrop === 'air') {
    const said = typeof raw.carrier === 'string' ? raw.carrier.toLowerCase().trim() : '';
    carrier = CARRIERS[said] ? said : carrierIn(said)?.carrier || 'balloon';
    // the question's own word for it, when it is not the key: a seagull, a chopper
    const cw = !CARRIERS[said] && carrierIn(said)?.word;
    if (cw && cw !== carrier) carrierWord = cw;
    if (said && carrier === 'balloon' && !CARRIERS.balloon.words.test(said)) notes.push(`Drawn let go from a balloon: there is no ${clip(said, 20)} yet. Only where it is let go, and how fast it is moving then, matter to the motion.`);
  }
  // what sends it off: a cannon, a ramp, a catapult (a launch only, from a place, not the air)
  let launcher;
  if (raw.launcher != null && (engine === 'projectile') && backdrop !== 'air') {
    const said = String(raw.launcher).toLowerCase().trim();
    launcher = LAUNCHERS[said] ? said : launcherIn(said)?.launcher;
    if (!launcher) return no(`There is no launcher called “${clip(raw.launcher, 20)}”. The launchers are: ${listOf(LAUNCHERS)}.`);
  }
  // let go from rest it has no angle to give: it falls straight down
  if (engine === 'projectile' && numbers.u === 0 && numbers.theta == null) numbers.theta = 0;
  // a bullet is fired, never thrown: from a rifle unless something else is named
  if (!launcher && engine === 'projectile' && backdrop !== 'air' && objects.some((o) => o.figure === 'bullet')) launcher = 'rifle';
  // and a jet of water leaves a hose
  if (!launcher && engine === 'projectile' && backdrop !== 'air' && objects.some((o) => o.figure === 'water')) launcher = 'hose';
  // (a title that says thrown or off for something let go from rest is the reader's slip: the app's own is used)
  const slip = numbers.u === 0 && numbers.h > 0 && /\b(?:off|thrown|launched)\b/i.test(String(raw.title ?? ''));
  return { ok: true, recipe: { title: slip ? undefined : clip(raw.title, 60), backdrop, ...(below ? { below } : {}), ...(carrier ? { carrier } : {}), ...(carrierWord ? { carrierWord } : {}), ...(launcher ? { launcher } : {}), engine, objects, numbers, effects, notes } };
}

/** "A car off a cliff" — a title for a recipe that brought none. */
export function titleOf(r) {
  const F = FIGURES[r.objects[0].figure], B = BACKDROPS[r.backdrop];
  if (r.title) return Up(r.title);
  const what = Up(F.label);
  const where = B.on || `${{ hall: 'in', sea: F.swims ? 'from' : 'over', forest: 'in' }[r.backdrop] || 'on'} ${B.label.toLowerCase().replace(/^an? /, 'a ')}`;
  if (r.engine === 'projectile') {
    if (r.backdrop === 'air') return `${what} ${r.carrier === 'cloud' ? 'falling from' : 'let go from'} ${r.carrier && r.carrier !== 'balloon' ? carrierName(r) : 'the air'}`;
    if (r.backdrop === 'well') return `${what} down a well`;
    if (r.launcher) return `${what} ${LAUNCHERS[r.launcher].verb} ${LAUNCHERS[r.launcher].label}`;
    if (r.backdrop === 'volcano') return `${what} thrown out of a volcano’s crater`;
    if (B.edge && r.numbers.h === 0 && F.swims) return `${what} leaping from the water below ${B.at.replace(/^the (?:top|rim|edge|end|deck|crest|gallery) of /, '')}`;
    // let go from rest it falls, never 'thrown': dropped from the hand, falling from a height
    const rest = r.numbers.u === 0 && r.numbers.h > 0;
    if (B.edge) return rest ? `${what} falling from ${B.at}` : `${what} off ${B.at}`;
    // from a height with no edge of its own, it is a wall that is drawn
    // (a place that draws a ledge of its own says so)
    // thrown from a hand's height, the thrower stands on the ground: no wall
    // (an archer's arrow is loosed from the hand's height too)
    const byHand = (F.thrown || r.objects[0].figure === 'arrow') && r.objects[0].figure !== 'golfBall' && r.numbers.h > 0 && r.numbers.h <= (r.objects[0].figure === 'tennisBall' ? 3.4 : 2.6);
    if (byHand && r.backdrop === 'ground') return rest ? `${what} dropped` : `${what} ${F.verb || 'thrown'}`;
    // a person leaping off level ground in a stadium is a long jumper
    if (r.backdrop === 'stadium' && r.objects[0].figure === 'diver' && !(r.numbers.h > 0)) return 'A long jumper in an athletics stadium';
    // (a coconut let go from rest falls from its palm)
    if (r.backdrop === 'island' && r.objects[0].figure === 'coconut' && r.numbers.h > 0 && !(r.numbers.u > 0)) return `${what} falling from a palm tree`;
    if (!byHand && r.numbers.h > 0 && r.backdrop !== 'hall' && r.backdrop !== 'sea') return `${what} ${rest ? 'falling from' : 'off'} ${(B.higher && r.numbers.h > B.higher[0] ? B.higher[1] : B.high) || 'a wall'}`;
    if (rest) return `${what} dropped ${where}`;
    const how = F.verb || (F.thrown ? 'thrown' : F.animal || F.swims ? 'leaping' : 'launched');
    return r.backdrop === 'ground' ? `${what} ${how} from the ground` : `${what} ${how} ${where}`;
  }
  const by = B.edge ? `by ${B.at}` : where;
  if (r.engine === 'pair') return `Two on one line ${by}: when do they meet?`;
  if (r.engine === 'twin') {
    const two = r.objects.map((o) => FIGURES[o.figure].label);
    const plural = { person: 'people', lorry: 'lorries', bus: 'buses', ball: 'balls', marble: 'marbles', box: 'boxes' };
    const many = (l) => { const n = l.replace(/^an? /, ''); return plural[n] || `${n}s`; };
    const what2 = two[0] === two[1] ? `Two ${many(two[0])}` : `${Up(two[0])} and ${two[1]}`;
    return B.edge ? `${what2} off ${B.at}` : `${what2} ${where}`;
  }
  if (r.engine === 'bounce') return `${what} bouncing ${by}`;
  return `${what}: ${ENGINES[r.engine].label.toLowerCase()}`;
}

/** The same recipe always gets the same id, so asking twice opens one scene. */
function idOf(r) {
  // what it is let go from is part of the scene (only when there is one, so
  // every other recipe keeps the id it had)
  const s = JSON.stringify([r.title, r.backdrop, r.engine, r.objects, r.numbers, ...(r.carrier ? [r.carrier, r.carrierWord ?? null] : []), ...(r.launcher ? [r.launcher] : [])]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `composed-${(h >>> 0).toString(36)}`;
}

/**
 * A checked recipe as a scenario the app plays by the library's route.
 * @returns {{ ok: true, scenario, kit, boxes } | { ok: false, reason }}
 */
export function compose(raw) {
  const c = check(raw);
  if (!c.ok) return c;
  const r = c.recipe, E = ENGINES[r.engine], B = placeOf(r), base = KITS[E.kit];
  const id = idOf(r), name = titleOf(r);
  const who = r.objects.map((o) => FIGURES[o.figure].label).join(' and ');
  const what = r.backdrop === 'air' ? `open sky high above fields, ${carrierName(r)} ${r.carrier === 'cloud' ? 'it falls from' : 'letting it go'}` : B.what;
  // on Earth unless the question says otherwise — the reader leaves g out
  // then — at the app's own Earth value, as the twelve are
  // on the Moon or Mars, its own g unless the question gives one
  const boxes = { ...r.numbers, g: r.numbers.g ?? B.g ?? EARTH };
  if (r.engine === 'projectile' || r.engine === 'twin') boxes.place = B.place;
  // leaping from the water at the foot of a place with an edge (a salmon at a waterfall): level, from the water
  if (r.engine === 'projectile' && B.edge && r.numbers.h === 0 && r.objects.every((o) => FIGURES[o.figure]?.swims)) boxes.place = 'pool';

  // the engine's kit, as it is, with the composed stage in place of its own;
  // the place is the backdrop's, so its choice is not offered
  const kit = {
    ...base,
    id,
    voice: { h: name, sub: `Composed by Ask Suvat from the app’s own pieces: ${B.label.toLowerCase()}, ${who}, ${E.label.toLowerCase()}. Change any number and the engine works it out again.` },
    rows: (base.rows || []).filter((row) => !(row.fields || []).some((f) => f.key === 'place')),
    read: (vals) => ({ ...base.read({ ...Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, frac(v)])), place: boxes.place ?? vals.place }),
      // a thing that is not thrown started somewhere, it was not thrown from it
      ...(r.engine === 'projectile' && !FIGURES[r.objects[0].figure].thrown ? { from: ['diver', 'skateboarder'].includes(r.objects[0].figure) ? 'where they started' : 'where it started' } : {}),
      // two from one place: each named as the question names it
      ...(r.engine === 'twin' ? (({ A, B }) => ({ A: { ...A, name: r.objects[0].name }, B: { ...B, name: r.objects[1].name } }))(base.read(vals)) : {}),
      // the surface below in the engine's words: a cliff over the ground hits the ground
      ...(r.below ? { below: r.below } : {}) }),
    // the engine's sentences say what moves by its name: "The diver enters
    // the water…", "The car hits the sea…", not "It …"
    solve: (k) => {
      const out = base.solve(k);
      if (out?.ok && r.engine === 'projectile') {
        const name = r.objects[0].name;
        if (Array.isArray(out.notes)) out.notes = out.notes.map((n) => n.replace(/^It /, `${Up(name)} `));
        if (Array.isArray(out.derived)) out.derived = out.derived.map((n) => n.replace(/^it /, `${name} `));
      }
      return out;
    },
    render: (canvas, cam, o) => stage.render(canvas, cam, { ...o, recipe: r }),
    // the landing plays out on the clock after the motion stops, and the
    // ending card waits for it
    busy: () => stage.settling(),
    settle: stage.SETTLE,
    // the readouts are the engine kit's, in the words of the place: launched
    // from level ground or a ledge there is no edge to be out from
    hud: (f, t, o) => {
      const out = base.hud(f, t, o);
      const from = !B.edge ? 'Across from the start' : r.backdrop === 'air' ? 'Across from where it was let go' : ['house', 'tree'].includes(B.place) ? `Out from the ${B.at.replace(/^an? /, '')}` : null;
      if (from) for (const row of out.left) if (/edge/.test(row.k)) row.k = from;
      // on a phone the readouts cover the stage's top: the height and the speed
      if (typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches && out.left.length > 2) {
        out.left = [out.left[0], out.left[out.left.length - 1]];
      }
      return out;
    },
    // launched from the ground, the card says so rather than "from 0 m"
    ending: (solved, e) => {
      const out = base.ending(solved, e);
      if (r.engine === 'projectile' && solved?.h === 0) out.eyebrow = `From ${solved.Pl.below}`;
      return out;
    },
    thumb: () => stage.thumb(r),
  };
  const scenario = {
    id, group: 'composed', kit: id, composed: true, recipe: r,
    name,
    sub: `${B.label} · ${who}`,
    note: `Composed by Ask Suvat: ${what}, ${who}, ${E.what}.`,
    place: `Side on: ${what}, and ${who}`,
    params: boxes, example: boxes,
    parts: [],
    answers: ANSWERS[r.engine] || [],
    ending: {
      close: 'See the scene',
      realTitle: 'What the model leaves out',
      realLead: 'The model the scene is drawn from. None of this was computed; it is what the numbers were taken to mean.',
      why: [
        [`${Up(r.objects.map((o) => o.name).join(' and '))} ${r.objects.length > 1 ? 'are particles' : 'is a particle'}`, {
          projectile: 'it has no size and does not spin or tumble: only g acts on it once it is launched. The drawing turns it to face the way it moves; the engine does not.',
          pair: 'no size, no spin: only g acts on them in the air, and they meet when they are at the same height.',
          bounce: 'no size, no spin: only g acts on it in the air, and it bounces straight back up.',
        }[r.engine]],
        ['No air resistance', 'nothing slows it but gravity, however fast or far it goes.'],
        ...(r.engine === 'bounce' ? [['An instant bounce', 'the ball is in contact with the ground for no time at all, and keeps the same fraction of its speed every time.']] : []),
        [`${Up(B.label.toLowerCase())} is drawn to the scale of the motion`, 'the heights and distances on the stage are the engine’s own.'],
      ],
      caveat: 'What the engine did compute is above, from what you gave: every moment and speed is its own.',
    },
  };
  return { ok: true, scenario, kit, boxes };
}

/**
 * A question whose parts are not all one scene. Most parts are about the
 * scene the recipe composes; a part that is another place or another motion
 * ("(c) a second ball is now kicked from the ground…") carries a recipe of
 * its own. This splits them: the parts for the main scene, and each part
 * with a scene of its own, composed — or refused, with its reason.
 * @returns {{ main: object[], scenes: [{ part, c }] }}
 */
export function scenesOf(parts) {
  const main = [], scenes = [];
  for (const p of Array.isArray(parts) ? parts : []) {
    if (p && typeof p === 'object' && p.recipe && typeof p.recipe === 'object') {
      const { recipe, ...part } = p;
      scenes.push({ part, c: composeKindly(recipe) });
    } else main.push(p);
  }
  return { main, scenes };
}

/* ── never a flat no ─────────────────────────────────────────────────────
   The user, 7 Nov: "the AI should see what we need first, not straight up
   give us a NO" — "a ball dropped off a rooftop" was refused because the model
   wrote a height of 0 for one the question never gave. check() stays strict:
   it is what proves a recipe sound. mend() makes the most of what the model
   wrote, using check() as its guide so every rule it holds is covered: a value
   check() objects to is left blank, for the reply to ask for; a thing the place
   or the engine cannot draw becomes the nearest it can, and says so. */
export function mend(raw) {
  const clean = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  let r = { ...clean, numbers: { ...(clean.numbers && typeof clean.numbers === 'object' ? clean.numbers : {}) } };
  const notes = [];
  // a height written as a depth is still that height
  for (const k of ['h', 'A.h', 'B.h']) if (isNum(r.numbers[k]) && r.numbers[k] < 0) r.numbers[k] = -r.numbers[k];
  const reasonOf = (x) => { const c = check(x); return c.ok ? null : c.reason; };
  const without = (keys) => { const n = { ...r.numbers }; for (const k of keys) delete n[k]; return { ...r, numbers: n }; };
  const named = Array.isArray(clean.objects) ? clean.objects : [];
  const firstFigure = named[0] && typeof named[0] === 'object' ? named[0].figure : named[0];
  for (let pass = 0; pass < 16; pass++) {
    const why = reasonOf(r);
    if (why === null) break;
    const keys = Object.keys(r.numbers);
    const pairs = keys.flatMap((a, i) => keys.slice(i + 1).map((b) => [a, b]));
    const E = ENGINES[word(r.engine)], count = named.length;
    const lo = E?.objects?.[0] ?? 1;
    const tries = [
      ...keys.map((k) => without([k])), ...pairs.map((p) => without(p)),
      { ...r, effects: undefined }, { ...r, launcher: undefined }, { ...r, carrier: undefined }, { ...r, below: undefined },
      ...(count ? [{ ...r, objects: named.slice(0, 1) }, { ...r, objects: [named[0], named[0]] }] : [{ ...r, objects: Array(lo).fill({ figure: 'ball' }) }]),
      { ...r, objects: (r.objects || [{}]).map((o) => ({ ...(o && typeof o === 'object' ? o : {}), figure: 'ball' })) },
      { ...r, objects: (r.objects || [{}]).map((o) => ({ ...(o && typeof o === 'object' ? o : {}), figure: 'particle' })) },
      { ...r, backdrop: 'ground', below: undefined },
      { ...r, engine: 'projectile', backdrop: BACKDROPS[word(r.backdrop)] ? r.backdrop : 'ground', objects: (r.objects || [{ figure: 'ball' }]).slice(0, 1) },
      { ...r, numbers: {} },
    ];
    const next = tries.find((t) => reasonOf(t) === null) || tries.find((t) => reasonOf(t) !== why);
    if (!next) break;
    r = next;
  }
  const said = r.objects?.[0] && typeof r.objects[0] === 'object' ? r.objects[0].figure : null;
  if (firstFigure && said && word(firstFigure) !== said && FIGURES[word(firstFigure)]) notes.push(`Drawn as ${FIGURES[said].label} here: ${FIGURES[word(firstFigure)].label} does not fit this scene.`);
  return { recipe: r, notes };
}
/** compose(), never refusing what it can make sense of. */
export function composeKindly(raw) {
  const first = compose(raw);
  if (first.ok) return first;
  const { recipe, notes } = mend(raw);
  const c = compose(recipe);
  if (c.ok && notes.length && c.scenario?.recipe) c.scenario.recipe.notes = [...(c.scenario.recipe.notes || []), ...notes];
  return c;
}

/** "Drawn as a particle: there is no rocket figure yet." */
function nearest(m) {
  return `Drawn as ${FIGURES[m.figure].label}: there is no ${clip(m.word, 30)} figure yet.`;
}

/* ── a reading whose mover is not a ball ─────────────────────────────────
   The twelve draw a ball on the pitch, and From a height a stone from a
   thrower's hand. When the question says a diver, a parcel or a skateboarder
   moves, that is what must be drawn: the reading is made a composed scene
   with that figure, in that place, on the same height engine (CLAUDE.md
   rule 4: the numbers are moved, never changed). A ball or a stone stays
   where it was. */
const LAUNCHES = ['up', 'arc', 'dropped', 'down', 'platform-down', 'platform', 'platform-angle'];
/** The answer keys of the twelve, and of From a height, as the composed projectile names the same answer. */
const TWELVE_KEYS = { flight: 'time1', range: 'distance', vLand: 'speed1', top: 'height1', rise: 'height2', tTop: 'time2', u: 'speed2', theta: 'angle' };
// From a height's answer keys (js/library.js, numbered by js/parts/answers.js)
// as the composed launch's: the greatest height, the landing speed, the time
// in the air, how far out it lands, how far out it passes a hoop, the height
// found from the time (the older single keys kept for readings that use them)
const HEIGHT_KEYS = { height: 'height1', height1: 'height1', speed: 'speed1', time: 'time1', distance: 'distance', distance1: 'distance', distance2: 'distance2', height2: 'height3', graph: 'graph' };
/** From a height's places, as the composer's backdrops (a well is From a height's alone). */
const BALLISH = ['ball', 'stone', 'particle', 'football', 'tennisBall', 'golfBall', 'basketball', 'shot', 'snowball', 'rugbyBall', 'cricketBall', 'baseball', 'volleyball'];
// From a height's own places, and every place the composer draws, by the
// engine's place name or the backdrop's own (a reading may give either:
// "ground", "snow", "ledge", "branch")
const TWELVE_PLACES = { cliff: 'cliff', tower: 'tower', bridge: 'bridge', board: 'board', well: 'well', balloon: 'air' };
const HEIGHT_PLACES = {
  // (a backdrop's own name wins over another's place: "ground" is the ground's, not the forest's)
  ...Object.fromEntries(Object.entries(BACKDROPS).reverse().map(([key, B]) => [B.place, key])),
  ...Object.fromEntries(Object.keys(BACKDROPS).map((key) => [key, key])),
  branch: 'orchard', green: 'golf', gym: 'hall', ...TWELVE_PLACES,
};
const JUMPS = /\b(jump|jumps|jumped|leaps?|leapt)\b/i;
/** What the reading assumed, said: a jump with no angle taken as straight up. */
export function assumedNotes(x) {
  return Array.isArray(x?.assumed) && x.assumed.includes('angle')
    ? [`No angle was given for the jump, so it is taken as straight up, ${M`theta = 90°`}, as an exam would take it. Change ${M`theta`} on the values screen to try another.`]
    : [];
}
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o?.[k] != null).map((k) => [k, o[k]]));

/**
 * @param x  the reader's extraction, with `who` (what moves) and perhaps
 *           `assumed` (['angle'] when a jump's angle was not given)
 * @returns a compose reading { scenario: 'compose', recipe, parts, notes, … },
 *          or null to leave the reading as it was
 */
export function fromReading(x) {
  if (!x || typeof x !== 'object' || x.understood === false) return null;
  // "a hammer thrower releases…": an athlete's hammer, not a claw hammer
  let m = figureOf(x.who);
  if (m.figure === 'hammer' && /\bhammer throw|\bathletics hammer/i.test(`${x.summary || ''} ${x.words || ''}`)) m = figureOf('hammer thrower');
  // From a height draws its places over their own surface (a cliff over the
  // sea); a question that says otherwise ("the ground at the bottom") is
  // composed, whatever moves — a ball thrown by its thrower included
  const fromHeight = x.scenario === 'library' && x.library === 'from-a-height' && x.boxes && typeof x.boxes === 'object';
  const under = fromHeight && HEIGHT_PLACES[x.boxes.place] ? belowOf(HEIGHT_PLACES[x.boxes.place], x.below) : null;
  // a ball, a stone or a particle is the twelve's own, unless a place only
  // the composer draws (a table, a balcony) or a surface the place does not
  // have says otherwise; a coin or a marble is always drawn as itself, and
  // so is a phone, a book, a hammer or a water balloon. A ball of any sport
  // stays: the twelve's pitch is a ball's own place
  const small = !m.figure || (m.exact && BALLISH.includes(m.figure));
  const words = `${x.summary || ''} ${x.words || ''}`;
  const where = fromHeight || LAUNCHES.includes(x.scenario) ? placeIn(words) : null;
  const own = where?.backdrop ?? null;
  // let go from a helicopter, a plane, a drone or a bird: drawn as that, so composed
  // (a bird that dives is what moves, not what lets it go)
  const lifted = !own && !under && LAUNCHES.includes(x.scenario) && m.figure !== 'bird' && !['balloon', undefined].includes(carrierIn(words)?.carrier);
  // a place From a height does not draw itself (level ground, snow, a ledge) is composed
  const elsewhere = fromHeight && HEIGHT_PLACES[x.boxes.place] && !TWELVE_PLACES[x.boxes.place];
  // fired from a cannon, off a ramp, flung from a catapult: drawn with it, so composed
  const sent = LAUNCHES.includes(x.scenario) && !!launcherIn(words);
  if (small && !under && !own && !lifted && !elsewhere && !sent) return null;
  const figure = m.figure || 'ball';
  let backdrop, numbers, keys;
  if (fromHeight) {
    // a place only the composer draws, named in the words, wins over From a height's
    backdrop = own ?? HEIGHT_PLACES[x.boxes.place];
    if (!backdrop) return null;
    numbers = pick(x.boxes, ['h', 'u', 'theta', 'v', 's', 't', 'tTop', 'level', 'g']);
    keys = HEIGHT_KEYS;
  } else if (LAUNCHES.includes(x.scenario)) {
    const r = toApp(x);
    if (!r.ok) return null;
    // dropped: straight down, from rest
    // a height left out stays out: the values screen asks for it; an angle
    // too — straight down only for what is dropped or thrown down
    numbers = { ...pick(r.given, ['u', 'v', 's', 't']) };
    const theta = r.theta ?? (['dropped', 'down'].includes(x.scenario) ? -90 : undefined);
    if (theta != null) numbers.theta = theta;
    if (r.h != null) numbers.h = r.h;
    if (typeof x.g === 'number') numbers.g = x.g;
    // a named place stands; one with an edge to leave from needs a height to stand on it
    backdrop = own && (numbers.h !== 0 || !BACKDROPS[own].edge) ? own
      : !(numbers.h === 0) && carrierIn(words) && m.figure !== 'bird' ? 'air' : 'ground';
    keys = TWELVE_KEYS;
  } else return null;
  const notes = [];
  if (m.figure && !m.exact) notes.push(nearest(m));
  // the question's own word for the place, in the title and said if it is drawn as another
  const at = own && BACKDROPS[own].edge && where.word && !['table', 'house'].includes(where.word) ? where.word : null;
  if (at && own === 'table') notes.push(`The ${at} is drawn as a table: only its height matters to the motion.`);
  // what it is let go from, drawn as itself; what sends it off
  const carrier = backdrop === 'air' ? carrierIn(words)?.word : null;
  const launcher = backdrop !== 'air' ? launcherIn(words)?.launcher : null;
  // a release height a hand can reach is the thrower's hand above the
  // ground, not a wall: a hammer, a shot, a basketball from 2 m
  const fromHand = FIGURES[figure].thrown && figure !== 'golfBall' && numbers.h > 0 && numbers.h <= (figure === 'tennisBall' ? 3.4 : 2.6);
  if (backdrop === 'ground' && fromHand && !launcher && figure !== 'bullet') notes.push(`${figure === 'tennisBall' ? 'Struck' : 'Let go'} ${num(numbers.h, 2, { trim: true })} m above the ground, ${{ tennisBall: 'by the racquet', baseball: 'by the bat', cricketBall: 'by the bat' }[figure] || 'from the thrower’s hand'}.`);
  else if (backdrop === 'ground' && numbers.h > 0 && !/\b(wall|ledge)\b/i.test(words)) notes.push(`The question names no place, so it is drawn off a wall ${num(numbers.h, 2, { trim: true })} m high: only the height matters to the motion.`);
  notes.push(...assumedNotes(x));
  if (x.scenario === 'dropped' && JUMPS.test(`${x.summary || ''} ${x.words || ''}`)) notes.push('No speed was given for the jump, so it is taken as stepping off from rest. Give the speed on the values screen if the question has one.');
  const rekey = (p) => {
    if (!p || typeof p !== 'object') return p;
    // the twelve's own key, kept by the Worker when From a height had no name for it
    const { answer, twelve, ...rest } = p;
    const key = (twelve && TWELVE_KEYS[twelve]) || keys[answer];
    return key ? { ...rest, answer: key } : rest;
  };
  const parts = Array.isArray(x.parts) ? x.parts.map(rekey) : undefined;
  // what a question with no parts asks goes with it, for the reply to answer
  const asked = Array.isArray(x.asked) ? { asked: x.asked.map(rekey) } : Array.isArray(x.asks) ? { asks: x.asks } : {};
  return {
    understood: true, confidence: x.confidence, scenario: 'compose', summary: x.summary, parts, notes, ...asked,
    recipe: { backdrop, ...(under ? { below: under } : {}), ...(carrier ? { carrier } : {}), ...(launcher ? { launcher } : {}), ...(at && backdrop === own ? { title: `${Up(FIGURES[figure].label)} ${numbers.u === 0 && numbers.h > 0 ? 'falling from' : 'off'} ${/^[aeiou]/.test(at) ? 'an' : 'a'} ${at}` } : {}), engine: 'projectile', objects: [{ figure, name: m.exact ? `the ${m.word.replace(/^(an?|the) /, '')}` : undefined }], numbers },
  };
}
