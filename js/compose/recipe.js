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

import { BACKDROPS, FIGURES, EFFECTS, ENGINES, ANSWERS, LANDS_WITH, MOMENTS, figureOf } from './registry.js';
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
  const B = BACKDROPS[backdrop];
  if (!B) return no(`There is no backdrop called “${clip(raw.backdrop, 30)}”. The backdrops are: ${listOf(BACKDROPS)}.`);
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
    let figure = word(o.figure);
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
  // unnamed, they are told apart: "the first ball", "the second ball"
  objects.forEach((o, i) => {
    const noun = FIGURES[o.figure].label.replace(/^an? /, '');
    if (!o.name) o.name = objects.length > 1 ? `the ${['first', 'second'][i]} ${noun}` : `the ${noun}`;
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
    if (B.edge && isNum(numbers.h) && numbers.h === 0) return no(`Launched from ${B.at.replace(/^an? /, 'the ')}, it starts above the ground: the height cannot be 0.`);
    // from the ground itself it has to leave it: upwards, and moving
    if (!B.edge && numbers.h === 0 && ((isNum(numbers.theta) && numbers.theta <= 0) || numbers.u === 0)) {
      return no('From the ground it must be launched upwards: give a speed, and an angle above 0°.');
    }
    if (isNum(numbers.theta) && Math.abs(numbers.theta) > 90) return no('The angle is between −90° (straight down) and 90° (straight up).');
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
  if (!effects.length && (MOMENTS[engine] || LANDS_WITH[B.below])) effects.push(MOMENTS[engine] || LANDS_WITH[B.below]);

  return { ok: true, recipe: { title: clip(raw.title, 60), backdrop, engine, objects, numbers, effects, notes } };
}

/** "A car off a cliff" — a title for a recipe that brought none. */
export function titleOf(r) {
  const F = FIGURES[r.objects[0].figure], B = BACKDROPS[r.backdrop];
  if (r.title) return Up(r.title);
  const what = Up(F.label);
  const where = `${{ hall: 'in', sea: 'over' }[r.backdrop] || 'on'} ${B.label.toLowerCase().replace(/^an? /, 'a ')}`;
  if (r.engine === 'projectile') {
    if (r.backdrop === 'air') return `${what} let go from the air`;
    if (B.edge) return `${what} off ${B.at}`;
    // from a height with no edge of its own, it is a wall that is drawn
    if (r.numbers.h > 0 && r.backdrop !== 'hall' && r.backdrop !== 'sea') return `${what} off a wall`;
    return `${what} ${F.thrown ? 'thrown' : 'launched'} ${where}`;
  }
  const by = B.edge ? `by ${B.at}` : where;
  if (r.engine === 'pair') return `Two on one line ${by}: when do they meet?`;
  if (r.engine === 'bounce') return `${what} bouncing ${by}`;
  return `${what}: ${ENGINES[r.engine].label.toLowerCase()}`;
}

/** The same recipe always gets the same id, so asking twice opens one scene. */
function idOf(r) {
  const s = JSON.stringify([r.title, r.backdrop, r.engine, r.objects, r.numbers]);
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
  const r = c.recipe, E = ENGINES[r.engine], B = BACKDROPS[r.backdrop], base = KITS[E.kit];
  const id = idOf(r), name = titleOf(r);
  const who = r.objects.map((o) => FIGURES[o.figure].label).join(' and ');
  // on Earth unless the question says otherwise — the reader leaves g out
  // then — at the app's own Earth value, as the twelve are
  const boxes = { ...r.numbers, g: r.numbers.g ?? EARTH };
  if (r.engine === 'projectile') boxes.place = B.place;

  // the engine's kit, as it is, with the composed stage in place of its own;
  // the place is the backdrop's, so its choice is not offered
  const kit = {
    ...base,
    id,
    voice: { h: name, sub: `Composed by Ask Suvat from the app’s own pieces: ${B.label.toLowerCase()}, ${who}, ${E.label.toLowerCase()}. Change any number and the engine works it out again.` },
    rows: (base.rows || []).filter((row) => !(row.fields || []).some((f) => f.key === 'place')),
    read: (vals) => base.read({ ...Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, frac(v)])), place: boxes.place ?? vals.place }),
    render: (canvas, cam, o) => stage.render(canvas, cam, { ...o, recipe: r }),
    // the landing plays out on the clock after the motion stops, and the
    // ending card waits for it
    busy: () => stage.settling(),
    settle: stage.SETTLE,
    // the readouts are the engine kit's, in the words of the place: launched
    // from level ground or a ledge there is no edge to be out from
    hud: (f, t, o) => {
      const out = base.hud(f, t, o);
      const from = !B.edge ? 'Across from the start' : ['house', 'tree'].includes(B.place) ? `Out from the ${B.at.replace(/^an? /, '')}` : null;
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
    note: `Composed by Ask Suvat: ${B.what}, ${who}, ${E.what}.`,
    place: `Side on: ${B.what}, and ${who}`,
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
      scenes.push({ part, c: compose(recipe) });
    } else main.push(p);
  }
  return { main, scenes };
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
const HEIGHT_KEYS = { height: 'height1', speed: 'speed1', time: 'time1', graph: 'graph' };
/** From a height's places, as the composer's backdrops (a well is From a height's alone). */
const HEIGHT_PLACES = { cliff: 'cliff', tower: 'tower', bridge: 'bridge', board: 'board', balloon: 'air' };
const CARRIER = /\b(helicopter|aeroplane|airplane|aircraft|plane|drone|airship|glider)\b/i;
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o?.[k] != null).map((k) => [k, o[k]]));

/**
 * @param x  the reader's extraction, with `who` (what moves) and perhaps
 *           `assumed` (['angle'] when a jump's angle was not given)
 * @returns a compose reading { scenario: 'compose', recipe, parts, notes, … },
 *          or null to leave the reading as it was
 */
export function fromReading(x) {
  if (!x || typeof x !== 'object' || x.understood === false) return null;
  const m = figureOf(x.who);
  if (!m.figure || (m.exact && ['ball', 'stone', 'particle'].includes(m.figure))) return null;
  let backdrop, numbers, keys;
  if (x.scenario === 'library' && x.library === 'from-a-height' && x.boxes && typeof x.boxes === 'object') {
    backdrop = HEIGHT_PLACES[x.boxes.place];
    if (!backdrop) return null;
    numbers = pick(x.boxes, ['h', 'u', 'theta', 'v', 's', 't', 'tTop', 'level', 'g']);
    keys = HEIGHT_KEYS;
  } else if (LAUNCHES.includes(x.scenario)) {
    const r = toApp(x);
    if (!r.ok) return null;
    // dropped: straight down, from rest
    // a height left out stays out: the values screen asks for it
    numbers = { ...pick(r.given, ['u', 'v', 's', 't']), theta: r.theta ?? -90 };
    if (r.h != null) numbers.h = r.h;
    if (typeof x.g === 'number') numbers.g = x.g;
    backdrop = !(numbers.h === 0) && CARRIER.test(`${x.summary || ''} ${x.words || ''}`) ? 'air' : 'ground';
    keys = TWELVE_KEYS;
  } else return null;
  const notes = [];
  if (!m.exact) notes.push(nearest(m));
  const carrier = `${x.summary || ''} ${x.words || ''}`.match(CARRIER);
  if (backdrop === 'air' && carrier) notes.push(`Drawn let go from a balloon: there is no ${carrier[1].toLowerCase()} yet. Only where it is let go matters to the motion.`);
  if (Array.isArray(x.assumed) && x.assumed.includes('angle')) {
    notes.push(`No angle was given for the jump, so it is taken as straight up, ${M`theta = 90°`}, as exam questions mean. Change ${M`theta`} on the values screen to try another.`);
  }
  const parts = Array.isArray(x.parts) ? x.parts.map((p) => {
    if (!p || typeof p !== 'object') return p;
    const { answer, ...rest } = p;
    return keys[answer] ? { ...rest, answer: keys[answer] } : rest;
  }) : undefined;
  return {
    understood: true, confidence: x.confidence, scenario: 'compose', summary: x.summary, parts, notes,
    recipe: { backdrop, engine: 'projectile', objects: [{ figure: m.figure, name: m.exact ? `the ${m.word.replace(/^(an?|the) /, '')}` : undefined }], numbers },
  };
}
