// registry.js — every piece Ask Suvat may compose a scene from.
//
// "A car is driven off a cliff": no one scenario is that, but the app already
// has a car (js/render/figures.js), a cliff over the sea (js/render/heights.js),
// a splash (js/render/effects.js) and an engine for a launch from a height
// (js/core/height.js). The reader names the pieces in a RECIPE
// (js/compose/recipe.js checks it against this list), and the composed stage
// (js/render/composed.js) lays them out to scale and plays them on the
// engine's own times.
//
// This file is the list, as data: a name, what the piece is, and what it
// takes. Nothing here draws or calculates. The pieces themselves are the
// library's own — wrapped, never redrawn.
//
//   backdrops  where it happens: the place it starts from and what is below
//   figures    what moves
//   effects    what happens when it lands, bounces or meets
//   engines    how it moves — each one an engine the library already has,
//              wired through that engine's kit (js/kits/): the same boxes,
//              working, readouts and graphs

/** Where it happens. `place` is the engine's word for it (js/core/height.js
    PLACES); `below` is what it lands on; `edge` says the place has a top
    something is launched from, so it needs a height, and `at` names that
    top in a title ("A car off a cliff"). */
export const BACKDROPS = {
  cliff:   { label: 'A sea cliff', what: 'a rock cliff with the sea below it', place: 'cliff', below: 'sea', edge: true, at: 'a cliff' },
  tower:   { label: 'A tower', what: 'a stone tower standing on level ground, fields behind', place: 'tower', below: 'ground', edge: true, at: 'a tower' },
  bridge:  { label: 'A bridge', what: 'a stone arch bridge over a river', place: 'bridge', below: 'river', edge: true, at: 'a bridge' },
  house:   { label: 'A house and a fence', what: 'a house with a garden fence: from a window or the roof', place: 'ground', below: 'ground', edge: true, at: 'a house' },
  ground:  { label: 'Level ground', what: 'open grass with fields and trees behind', place: 'ground', below: 'ground' },
  sea:     { label: 'The open sea', what: 'open water to the horizon', place: 'ground', below: 'sea' },
  road:    { label: 'A road', what: 'a straight tarmac road with verges', place: 'ground', below: 'road' },
  rails:   { label: 'A railway', what: 'a railway line on ballast and sleepers', place: 'ground', below: 'rails' },
  orchard: { label: 'An orchard', what: 'apple trees in grass', place: 'ground', below: 'ground', edge: true, at: 'a tree' },
  hall:    { label: 'A sports hall', what: 'an indoor hall with a wooden floor and high windows', place: 'ground', below: 'floor' },
};

/** What moves. `m` is its real length in metres (a ball's diameter, a
    person's height), so it is drawn to scale where the scale allows; `min`
    is the least it is drawn, in px, so it always reads. `thrown` things
    leave a person's hand; the rest move by themselves. `views` are the
    views it is drawn in: side on, or from above (a ship, a robot). */
export const FIGURES = {
  car:      { label: 'a car', m: 4.4, min: 58, views: ['side'] },
  lorry:    { label: 'a lorry', m: 10, min: 76, views: ['side'] },
  train:    { label: 'a train', m: 40, min: 110, views: ['side'] },
  cyclist:  { label: 'a cyclist', m: 1.8, min: 46, views: ['side'] },
  runner:   { label: 'a runner', m: 1.75, min: 46, views: ['side'] },
  motorcycle: { label: 'a motorcycle', m: 2.1, min: 48, views: ['side'] },
  ball:     { label: 'a ball', m: 0.22, min: 12, views: ['side'], thrown: true },
  stone:    { label: 'a stone', m: 0.08, min: 11, views: ['side'], thrown: true },
  particle: { label: 'a particle', m: 0.1, min: 10, views: ['side', 'plan'], thrown: true },
  ship:     { label: 'a ship', m: 60, min: 40, views: ['plan'] },
  robot:    { label: 'a robot', m: 0.6, min: 30, views: ['plan'] },
};

/** What happens, at the engine's own moments (rule 4: the engine says when). */
export const EFFECTS = {
  splash: { label: 'a splash', what: 'where it enters water' },
  dust:   { label: 'dust', what: 'where it lands on the ground' },
  ring:   { label: 'a bounce ring', what: 'where it bounces, or two meet' },
  flash:  { label: 'a collision flash', what: 'where two collide' },
};

/** How it moves. `kit` is the library kit whose engine, boxes, working,
    readouts and graphs it uses (js/kits/). `view` is how the stage looks at
    it; `objects` how many move; `boxes` what the recipe's numbers may set,
    keyed as the kit keys its boxes, with what each one is. `ready: false`
    is an engine the composed stage does not draw yet: a recipe naming it is
    refused with that reason. */
export const ENGINES = {
  projectile: {
    label: 'Launched, then falling freely', kit: 'height', view: 'side', objects: [1, 1], ready: true,
    what: 'one thing launched — thrown, kicked, driven or rolled off an edge — moving under gravity alone until it lands',
    boxes: {
      h: 'height it starts at above what it lands on, m (0 from the ground)',
      u: 'launch speed, m/s',
      theta: 'launch angle in degrees: 0 across (horizontally, driven or rolled off an edge), 90 straight up, negative below the horizontal',
      v: 'speed it lands at, m/s (only in place of u)',
      s: 'how far out it lands, m (only in place of u)',
      t: 'time in the air, s (in place of u, or of h)',
      tTop: 'time to the top of its path, s (in place of u)',
      level: 'a height above where it starts that a part asks about, m (negative below it)',
      g: 'g, only if the question states it',
    },
  },
  stages: { label: 'Along a line, in stages', kit: 'journey', view: 'road', objects: [1, 1], ready: false,
    what: 'one vehicle or person along a straight road or track, speeding up, holding a speed and slowing in turn', boxes: {} },
  overtake: { label: 'Two along one line', kit: 'lanes', view: 'road', objects: [2, 2], ready: false,
    what: 'two along a straight road or track, each with its own start, speed and acceleration: when and where they meet or overtake', boxes: {} },
  pair: { label: 'Two in one vertical line', kit: 'pair', view: 'side', objects: [2, 2], ready: false,
    what: 'two thrown up or dropped on the same vertical line: when and where they meet', boxes: {} },
  bounce: { label: 'A ball that bounces', kit: 'bounce', view: 'side', objects: [1, 1], ready: false,
    what: 'a ball dropped or thrown down that bounces, losing speed at each bounce', boxes: {} },
  plane: { label: 'Moving in a plane, in i and j', kit: 'plane', view: 'plan', objects: [1, 1], ready: false,
    what: 'one ship, robot or particle moving across a flat surface with velocity and acceleration in i and j, seen from above', boxes: {} },
};

/** What a composed launch can answer, in the format of design/components.md
    (paths into the height engine's answer). A part from the reader names one
    of these by its key (js/parts/answers.js numbers keys by kind). */
export const PROJECTILE_ANSWERS = [
  { kind: 'time', say: 'time in the air, until it lands', find: 'T', sym: 't', unit: 's', at: 'end', step: 'time of flight' },
  { kind: 'distance', say: 'how far out it lands, horizontally from where it started', find: 'out', sym: 'x', unit: 'm', at: 'end', step: 'horizontal' },
  { kind: 'speed', say: 'speed as it lands (hits the sea, the water or the ground)', find: 'vL', sym: 'v', unit: 'm s^-1', at: 'end', step: 'time of flight' },
  { kind: 'height', say: 'greatest height above what it lands on', find: 'top', sym: 'H', unit: 'm', at: 'f.tApex', step: 'greatest height' },
  { kind: 'height', say: 'greatest height above where it started', find: 'f.apexRise', sym: 'H', unit: 'm', at: 'f.tApex', step: 'greatest height' },
  { kind: 'time', say: 'time to the top of its path', find: 'f.tApex', sym: 't', unit: 's', at: 'f.tApex', step: 'greatest height' },
  { kind: 'speed', say: 'speed it is launched at', find: 'params.u', sym: 'u', unit: 'm s^-1', at: 0 },
  { kind: 'angle', say: 'angle it is launched at', find: 'params.theta', sym: 'theta', suffix: '°', dp: 1, at: 0 },
  { kind: 'height', say: 'height it started from (when found from the time in the air)', find: 'h', sym: 'h', unit: 'm', at: 0 },
];
export const ANSWERS = { projectile: PROJECTILE_ANSWERS };

/** The effect a landing makes on what is below, when the recipe names none. */
export const LANDS_WITH = { sea: 'splash', river: 'splash', ground: 'dust', road: 'dust', rails: 'dust', floor: 'ring' };
