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

import { BACKDROPS, FIGURES, EFFECTS, ENGINES, ANSWERS, LANDS_WITH } from './registry.js';
import { KITS } from '../kits/index.js';
import { GRAVITY } from '../scenarios.js';
import { num } from '../notation.js';
import * as stage from '../render/composed.js';

const isNum = (x) => typeof x === 'number' && isFinite(x);
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

  const objs = Array.isArray(raw.objects) ? raw.objects.filter((o) => o && typeof o === 'object') : [];
  const [lo, hi] = E.objects;
  if (objs.length < lo || objs.length > hi) {
    return no(`${Up(E.label)} moves ${lo === hi ? lo : `${lo} to ${hi}`} ${lo === 1 && hi === 1 ? 'thing' : 'things'}; the recipe has ${objs.length}.`);
  }
  const objects = [];
  for (const o of objs) {
    const figure = word(o.figure), F = FIGURES[figure];
    if (!F) return no(`There is no figure called “${clip(o.figure, 30)}”. The figures are: ${listOf(FIGURES)}.`);
    if (B.only && !B.only.includes(figure)) {
      const can = B.only.map((k) => FIGURES[k].label);
      return no(`From ${B.at} only ${can.slice(0, -1).join(', ')} or ${can[can.length - 1]} can fall: not ${F.label}.`);
    }
    if (!F.views.includes(E.view)) {
      return no(`${Up(F.label)} is drawn ${F.views.includes('plan') ? 'from above' : 'side on'}, and ${E.label.toLowerCase()} is seen ${E.view === 'plan' ? 'from above' : 'side on'}.`);
    }
    objects.push({ figure, name: clip(o.name, 30) || F.label.replace(/^an? /, 'the ') });
  }

  const numbers = {};
  const given = raw.numbers && typeof raw.numbers === 'object' ? raw.numbers : {};
  for (const [k, v] of Object.entries(given)) {
    const say = E.names?.[k];
    if (!(k in E.boxes)) return no(`The scene was given a value ${E.label.toLowerCase()} does not use (${clip(k, 20)}). It uses ${Object.values(E.names || {}).join(', ')}.`);
    if (v == null) continue;
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
    if (isNum(numbers.g) && !(numbers.g > 0)) return no('g is the size of the acceleration: a positive number.');
  }

  const effects = [];
  for (const e of Array.isArray(raw.effects) ? raw.effects : []) {
    const n = word(e);
    if (!EFFECTS[n]) return no(`There is no effect called “${clip(e, 20)}”. The effects are: ${listOf(EFFECTS)}.`);
    if (!effects.includes(n)) effects.push(n);
  }
  if (!effects.length && LANDS_WITH[B.below]) effects.push(LANDS_WITH[B.below]);

  return { ok: true, recipe: { title: clip(raw.title, 60), backdrop, engine, objects, numbers, effects } };
}

/** "A car off a cliff" — a title for a recipe that brought none. */
export function titleOf(r) {
  const F = FIGURES[r.objects[0].figure], B = BACKDROPS[r.backdrop];
  if (r.title) return Up(r.title);
  const what = Up(F.label);
  const where = `${{ hall: 'in', sea: 'over' }[r.backdrop] || 'on'} ${B.label.toLowerCase().replace(/^an? /, 'a ')}`;
  if (r.engine === 'projectile') return B.edge ? `${what} off ${B.at}` : `${what} ${F.thrown ? 'thrown' : 'launched'} ${where}`;
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
    read: (vals) => base.read({ ...vals, place: boxes.place ?? vals.place }),
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
      if (solved?.h === 0) out.eyebrow = `From ${solved.Pl.below}`;
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
        [`${Up(r.objects[0].name)} is a particle`, 'it has no size and does not spin or tumble: only g acts on it once it is launched. The drawing turns it to face the way it moves; the engine does not.'],
        ['No air resistance', 'nothing slows it but gravity, however fast or far it goes.'],
        [`${Up(B.label.toLowerCase())} is drawn to the scale of the motion`, 'the heights and distances on the stage are the engine’s own.'],
      ],
      caveat: 'What the engine did compute is above: the launch from what you gave, the time in the air, where it lands and how fast.',
    },
  };
  return { ok: true, scenario, kit, boxes };
}
