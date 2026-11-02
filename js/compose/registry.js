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
    top in a title ("A car off a cliff"); `only` lists the figures it takes
    (an apple falls from a tree; a car does not). */
export const BACKDROPS = {
  cliff:   { label: 'A cliff', what: 'a rock cliff with the sea below it (or the ground, or a beach)', place: 'cliff', below: 'sea', edge: true, at: 'a cliff', belows: ['sea', 'ground', 'beach'] },
  tower:   { label: 'A tower', what: 'a stone tower standing on level ground, fields behind', place: 'tower', below: 'ground', edge: true, at: 'a tower', belows: ['ground', 'road'] },
  bridge:  { label: 'A bridge', what: 'a stone arch bridge over a river (or over a road)', place: 'bridge', below: 'river', edge: true, at: 'a bridge', belows: ['river', 'road'] },
  house:   { label: 'A house and a fence', what: 'a house with a garden fence: from a window or the roof', place: 'house', below: 'ground', edge: true, at: 'a house' },
  ground:  { label: 'Level ground', what: 'open grass with fields and trees behind', place: 'ground', below: 'ground' },
  sea:     { label: 'The open sea', what: 'open water to the horizon', place: 'water', below: 'sea' },
  road:    { label: 'A road', what: 'a straight tarmac road with verges', place: 'road', below: 'road' },
  rails:   { label: 'A railway', what: 'a railway line on ballast and sleepers', place: 'track', below: 'rails' },
  orchard: { label: 'An orchard', what: 'apple trees in grass (or on a river bank, over the water)', place: 'tree', below: 'ground', edge: true, at: 'a tree', only: ['apple', 'ball', 'stone', 'particle', 'bird'], belows: ['ground', 'river'] },
  hall:    { label: 'A sports hall', what: 'an indoor hall with a wooden floor and high windows', place: 'floor', below: 'floor' },
  board:   { label: 'A diving board', what: 'a diving platform on its tower over an outdoor pool', place: 'board', below: 'pool', edge: true, at: 'a diving board' },
  table:   { label: 'A table', what: 'a wooden table in a room', place: 'table', below: 'floor', edge: true, at: 'a table' },
  well:    { label: 'A well', what: 'a stone well, its shaft cut away down to the water: it moves straight up or down', place: 'well', below: 'well', edge: true, at: 'a well' },
  mountain: { label: 'Mountains', what: 'a rock ledge high above a valley, snow-capped peaks beyond', place: 'ledge', below: 'ground', edge: true, at: 'a ledge' },
  forest:  { label: 'A forest', what: 'woodland: trees thinning into mist over a forest floor; from a height, a platform among the trunks', place: 'ground', below: 'ground', art: true, high: 'a platform in a forest', lands: 'leaves' },
  harbour: { label: 'A harbour', what: 'a stone quay over the harbour water, boats at their moorings, a lighthouse across the bay', place: 'quay', below: 'sea', edge: true, at: 'a quay' },
  city:    { label: 'A city', what: 'the roof of an office block among the city’s towers, the street below', place: 'building', below: 'road', edge: true, at: 'a building' },
  moon:    { label: 'The Moon', what: 'the Moon’s grey cratered plain under a black sky, the Earth overhead; g is 1.62 there', place: 'moon', below: 'surface', art: true, g: 1.62, on: 'on the Moon', lands: 'crater', high: 'a ledge on the Moon' },
  snow:    { label: 'Snow', what: 'a snowfield under snowy peaks and pines; from a height, a snow-capped rock ledge', place: 'snow', below: 'snow', art: true, on: 'in the snow', lands: 'snow', high: 'a snowy ledge' },
  desert:  { label: 'A desert', what: 'sand dunes under a hot hazy sky; from a height, a sandstone outcrop', place: 'desert', below: 'sand', art: true, on: 'in the desert', lands: 'sand', high: 'a sandstone outcrop' },
  pier:    { label: 'A pier', what: 'a seaside pier on iron piles over the sea, railings and lamps, the beach and its huts behind', place: 'pier', below: 'sea', edge: true, at: 'a pier', art: true },
  site:    { label: 'A building site', what: 'scaffolding up a concrete frame, a tower crane with a load on its hook, mud, a skip and sand', place: 'site', below: 'ground', edge: true, at: 'scaffolding', art: true, lands: 'mud' },
  mars:    { label: 'Mars', what: 'Mars’s red dust and rock under a butterscotch sky; g is 3.71 there', place: 'mars', below: 'surface', art: true, g: 3.71, on: 'on Mars', lands: 'crater', high: 'a ledge on Mars' },
  canyon:  { label: 'A canyon', what: 'the rim of a canyon: walls of banded ochre rock, a river far below in the gorge', place: 'canyon', below: 'river', edge: true, at: 'the rim of a canyon', art: true },
  waterfall: { label: 'A waterfall', what: 'the top of a waterfall in a wooded gorge: the river pours down the rock face into a plunge pool', place: 'waterfall', below: 'river', edge: true, at: 'the top of a waterfall', art: true },
  lighthouse: { label: 'A lighthouse', what: 'a lighthouse on a rock in the sea, white and red; from the gallery round its lantern', place: 'lighthouse', below: 'sea', edge: true, at: 'a lighthouse', art: true },
  pitch:   { label: 'A football pitch', what: 'a football stadium: a striped pitch, the stand across with its crowd and floodlights; from a height, a stand’s upper tier', place: 'pitch', below: 'ground', art: true, on: 'on a football pitch', high: 'the upper tier of a stand', lands: 'divot' },
  golf:    { label: 'A golf course', what: 'a golf course: the fairway, a bunker, the green with its flag, trees and a clubhouse beyond; from a height, a raised tee', place: 'golf', below: 'ground', art: true, on: 'on a golf course', high: 'a raised tee' },
  stadium: { label: 'An athletics stadium', what: 'an athletics stadium: the infield with white arcs every ten metres, red lanes, the stand across; from a height, a stand’s upper tier', place: 'stadium', below: 'ground', art: true, on: 'in an athletics stadium', high: 'the upper tier of a stand', lands: 'divot' },
  ship:    { label: 'A ship', what: 'a ship at sea, side on: from its deck at the stern, the sea below', place: 'ship', below: 'sea', edge: true, at: 'the deck of a ship', art: true },
  dam:     { label: 'A dam', what: 'the crest of a dam, its reservoir behind among wooded hills, the spillway pouring beside it, the river below', place: 'dam', below: 'river', edge: true, at: 'a dam', art: true },
  playground: { label: 'A playground', what: 'a playground: swings, a see-saw, a soft surface, trees behind a fence; from a height, a play tower’s platform', place: 'playground', below: 'ground', art: true, on: 'in a playground', high: 'a play tower' },
  air:     { label: 'In the air', what: 'open sky high above fields: let go from what carries it: a hovering balloon, a helicopter, a plane, a drone or a bird ("carrier")', place: 'air', below: 'ground', edge: true, at: 'a balloon' },
};

/** What moves. `m` is its real length in metres (a ball's diameter, a
    person's height), so it is drawn to scale where the scale allows; `min`
    is the least it is drawn, in px, so it always reads. `thrown` things
    leave a person's hand; a `small` one (an apple) falls by itself; the
    rest move by themselves. `views` are the
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
  apple:    { label: 'an apple', m: 0.08, min: 12, views: ['side'], small: true },
  coin:     { label: 'a coin', m: 0.025, min: 11, views: ['side'], thrown: true },
  marble:   { label: 'a marble', m: 0.016, min: 10, views: ['side'], thrown: true },
  diver:    { label: 'a person', m: 1.75, min: 64, views: ['side'] },
  skateboarder: { label: 'a skateboarder', m: 1.75, min: 60, views: ['side'] },
  parcel:   { label: 'a parcel', m: 0.5, min: 22, views: ['side'] },
  sandbag:  { label: 'a sandbag', m: 0.5, min: 20, views: ['side'] },
  bucket:   { label: 'a bucket', m: 0.35, min: 20, views: ['side'] },
  rocket:   { label: 'a rocket', m: 1, min: 34, views: ['side'] },
  firework: { label: 'a firework', m: 0.8, min: 34, views: ['side'] },
  arrow:    { label: 'an arrow', m: 0.75, min: 34, views: ['side'], verb: 'shot' },
  ship:     { label: 'a ship', m: 60, min: 40, views: ['plan'] },
  robot:    { label: 'a robot', m: 0.6, min: 30, views: ['plan'] },
  // the props (js/render/props.js): each drawn as itself, thrown, kicked or dropped
  football: { label: 'a football', m: 0.22, min: 12, views: ['side'], thrown: true, prop: true, verb: 'kicked' },
  tennisBall: { label: 'a tennis ball', m: 0.067, min: 10, views: ['side'], thrown: true, prop: true },
  golfBall: { label: 'a golf ball', m: 0.043, min: 10, views: ['side'], thrown: true, prop: true, verb: 'hit' },
  basketball: { label: 'a basketball', m: 0.24, min: 12, views: ['side'], thrown: true, prop: true },
  shot:     { label: 'a shot', m: 0.12, min: 11, views: ['side'], thrown: true, prop: true },
  snowball: { label: 'a snowball', m: 0.08, min: 10, views: ['side'], thrown: true, prop: true },
  waterBalloon: { label: 'a water balloon', m: 0.15, min: 11, views: ['side'], thrown: true, prop: true, lands: 'splat' },
  phone:    { label: 'a phone', m: 0.15, min: 10, views: ['side'], thrown: true, prop: true, lands: 'crack' },
  book:     { label: 'a book', m: 0.24, min: 10, views: ['side'], thrown: true, prop: true },
  hammer:   { label: 'a hammer', m: 0.33, min: 11, views: ['side'], thrown: true, prop: true },
  javelin:  { label: 'a javelin', m: 2.6, min: 44, views: ['side'], thrown: true },
  // animals that leap by themselves (js/render/animals.js): `m` is nose to tail
  cat:      { label: 'a cat', m: 0.5, min: 30, views: ['side'], animal: true },
  dog:      { label: 'a dog', m: 0.8, min: 34, views: ['side'], animal: true },
  monkey:   { label: 'a monkey', m: 0.6, min: 30, views: ['side'], animal: true },
  frog:     { label: 'a frog', m: 0.12, min: 24, views: ['side'], animal: true },
  bird:     { label: 'a bird', m: 0.4, min: 46, views: ['side'], flier: true },
};

/** What it is let go from, high in the air (backdrop `air` only): drawn at
    the point it is let go, moving with it across if it moves (a plane keeps
    above what it drops). js/render/carriers.js draws them. */
export const CARRIERS = {
  balloon:    { label: 'a hot-air balloon', words: /\b(hot[- ]air balloon|airship|blimp)\b|(?<!water )\bballoon\b/ },
  helicopter: { label: 'a helicopter', words: /\b(helicopter|chopper)\b/ },
  plane:      { label: 'a plane', words: /\b(aeroplane|airplane|aircraft|plane|glider|jet|bomber)\b/ },
  drone:      { label: 'a drone', words: /\b(drone|quadcopter)\b/ },
  bird:       { label: 'a bird', words: /\b(bird|eagle|seagull|gull|hawk|crow|pelican|heron|osprey|owl)\b/ },
};
/** What a question says it is let go from, or null. */
export function carrierIn(text) {
  const t = String(text ?? '').toLowerCase();
  let best = null;
  for (const [k, C] of Object.entries(CARRIERS)) { const m = t.match(C.words); if (m && (!best || m.index < best.at)) best = { carrier: k, word: m[1], at: m.index }; }
  return best && { carrier: best.carrier, word: best.word };
}

/** What happens, at the engine's own moments (rule 4: the engine says when). */
export const EFFECTS = {
  splash: { label: 'a splash', what: 'where it enters water' },
  dust:   { label: 'dust', what: 'where it lands on the ground' },
  ring:   { label: 'a bounce ring', what: 'where it bounces, or two meet' },
  flash:  { label: 'a collision flash', what: 'where two collide' },
  crater: { label: 'a crater', what: 'where it lands in dust, on the Moon or Mars' },
  snow:   { label: 'snow puffs', what: 'where it lands in snow' },
  divot:  { label: 'a divot', what: 'where it digs into turf' },
  sparks: { label: 'sparks', what: 'where metal or stone strikes a hard surface' },
  confetti: { label: 'confetti', what: 'a hit: on target, a goal, a win' },
  smoke:  { label: 'a smoke trail', what: 'behind a rocket or a firework as it flies' },
  splat:  { label: 'a splat', what: 'a water balloon bursting on dry ground' },
  crack:  { label: 'a crack', what: 'where something hard and heavy strikes a hard surface' },
  leaves: { label: 'leaves', what: 'where it lands on a forest floor' },
  sand:   { label: 'a spray of sand', what: 'where it lands in sand' },
  mud:    { label: 'mud', what: 'where it lands in mud, on a building site' },
  net:    { label: 'a goal net', what: 'a goal where it lands: its net bulges as the ball meets it' },
  burst:  { label: 'a firework burst', what: 'at the top of a firework’s flight' },
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
    // the same boxes as a student reads them, for a refusal
    names: { h: 'the height', u: 'the speed', theta: 'the angle', v: 'the landing speed', s: 'the distance out', t: 'the time in the air',
      tTop: 'the time to the top', level: 'a height asked about', g: 'g' },
  },
  twin: {
    label: 'Two launched from one place', kit: 'twin', view: 'side', objects: [2, 2], ready: true,
    what: 'two launched from the same height — thrown, dropped, driven or jumping off one edge — each at its own speed and angle, one perhaps later than the other: which lands first, and where',
    boxes: {
      h: 'height they both start at above what they land on, m (0 from the ground)',
      'A.u': 'the first object’s (objects[0]) launch speed, m/s', 'A.theta': 'its angle in degrees (0 across, 90 up, −90 down)', 'A.t0': 'when it sets off, s (blank: at once)',
      'B.u': 'the second object’s launch speed, m/s', 'B.theta': 'its angle in degrees', 'B.t0': 'when it sets off, s',
      g: 'g, only if the question states it',
    },
    names: { h: 'the height', 'A.u': 'the first one’s speed', 'A.theta': 'the first one’s angle', 'A.t0': 'when the first one sets off',
      'B.u': 'the second one’s speed', 'B.theta': 'the second one’s angle', 'B.t0': 'when the second one sets off', g: 'g' },
  },
  stages: { label: 'Along a line, in stages', kit: 'journey', view: 'road', objects: [1, 1], ready: false,
    what: 'one vehicle or person along a straight road or track, speeding up, holding a speed and slowing in turn', boxes: {} },
  overtake: { label: 'Two along one line', kit: 'lanes', view: 'road', objects: [2, 2], ready: false,
    what: 'two along a straight road or track, each with its own start, speed and acceleration: when and where they meet or overtake', boxes: {} },
  pair: {
    label: 'Two in one vertical line', kit: 'pair', view: 'side', objects: [2, 2], ready: true,
    what: 'two things thrown up, thrown down or dropped on the same vertical line — one from the top of the place, one from the ground below it, or both: when and where they meet',
    figures: ['ball', 'stone', 'particle', 'football', 'tennisBall', 'golfBall', 'basketball', 'shot', 'snowball', 'waterBalloon', 'phone', 'book', 'hammer'], below: ['ground', 'road', 'floor'],
    boxes: {
      'A.h': 'height the first object (objects[0]) starts at, m (0 on the ground)',
      'A.u': 'its velocity at the start, m/s, up positive (negative thrown down, 0 dropped)',
      'A.t0': 'when it sets off, s (blank: at once)',
      'B.h': 'the same for the second object (objects[1])', 'B.u': 'its velocity at the start, up positive', 'B.t0': 'when it sets off, s',
      g: 'g, only if the question states it',
    },
    names: { 'A.h': 'the first one’s height', 'A.u': 'the first one’s velocity', 'A.t0': 'when the first one sets off',
      'B.h': 'the second one’s height', 'B.u': 'the second one’s velocity', 'B.t0': 'when the second one sets off', g: 'g' },
  },
  bounce: {
    label: 'A ball that bounces', kit: 'bounce', view: 'side', objects: [1, 1], ready: true,
    what: 'a ball dropped, thrown down or thrown up that bounces on the ground or floor, keeping a fraction of its speed at each bounce',
    figures: ['ball', 'particle', 'football', 'tennisBall', 'golfBall', 'basketball'], below: ['ground', 'road', 'floor'],
    boxes: {
      start: 'how it sets off: drop | down | up',
      h: 'height it starts from, m', U: 'speed it is thrown with, m/s (a size)', V: 'speed it hits the ground with, m/s',
      w: 'speed it rebounds with, m/s', H: 'greatest height after the bounce, m',
      e: 'fraction of its speed it keeps at a bounce ("half its speed" is 0.5)',
      n: 'impacts to watch (2 for "until it hits the ground a second time"), up to 6',
      y: 'a height a part asks about, m', T: 'time after the bounce it is at that height, s',
      stop: 'y to stop the run the first time it is back at that height', axis: 'sign convention: up | down (the paper’s)',
      g: 'g, only if the question states it',
    },
    choices: { start: ['drop', 'down', 'up'], stop: ['y'], axis: ['up', 'down'] },
    names: { start: 'how it sets off', h: 'the height', U: 'the speed it is thrown with', V: 'the speed it hits the ground with',
      w: 'the speed it rebounds with', H: 'the height after the bounce', e: 'the fraction it keeps', n: 'the impacts to watch',
      y: 'a height asked about', T: 'the time after the bounce', stop: 'where to stop', axis: 'the sign convention', g: 'g' },
  },
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
  { kind: 'time', say: 'when it is first at the height a part asks about (numbers.level)', find: 'level.times.0', sym: 't', unit: 's', at: 'level.times.0', step: 'above the throw' },
  { kind: 'time', say: 'when it is there again, on the way down', find: 'level.times.1', sym: 't', unit: 's', at: 'level.times.1', step: 'above the throw' },
  { kind: 'graph', say: 'a sketch of the graphs: the stage draws them' },
];
/** Two on one vertical line: the pair engine's answers (js/core/pair.js). */
export const PAIR_ANSWERS = [
  { kind: 'time', say: 'when they meet, on the clock from t = 0', find: 'extras.tMeet', sym: 't', unit: 's', at: 'meet.t', step: 'meet' },
  { kind: 'height', say: 'how high above the ground they meet', find: 'extras.yMeet', sym: 'h', unit: 'm', at: 'meet.t', step: 'meet' },
  { kind: 'speed', say: 'speed of the first when they meet', find: 'extras.speedA', unit: 'm s^-1', at: 'meet.t' },
  { kind: 'speed', say: 'speed of the second when they meet', find: 'extras.speedB', unit: 'm s^-1', at: 'meet.t' },
  { kind: 'speed', say: 'the difference in their speeds when they meet', find: 'extras.dSpeed', unit: 'm s^-1', at: 'meet.t' },
  { kind: 'time', say: 'how long the second has been moving when they meet (when it sets off later)', find: 'extras.tB', sym: 't', unit: 's', at: 'meet.t' },
  { kind: 'time', say: 'how long the first has been moving when they meet (when it sets off later)', find: 'extras.tA', sym: 't', unit: 's', at: 'meet.t' },
  { kind: 'graph', say: 'a sketch of the graphs: the stage draws them' },
];
/** A ball that bounces: the bounce engine's answers (js/core/bounce.js). */
export const BOUNCE_ANSWERS = [
  { kind: 'time', say: 'when it first hits the ground', find: 'extras.t1', sym: 't', unit: 's', at: 'extras.t1' },
  { kind: 'speed', say: 'speed just before the first impact', find: 'extras.vIn1', sym: 'v', unit: 'm s^-1', at: 'extras.t1' },
  { kind: 'speed', say: 'speed just after the first impact (it rebounds with)', find: 'extras.vOut1', sym: 'v', unit: 'm s^-1', at: 'extras.t1' },
  { kind: 'height', say: 'greatest height after the first bounce', find: 'extras.H1', sym: 'H', unit: 'm', at: 'impacts.0.tTop' },
  { kind: 'time', say: 'time from the first impact to the second', find: 'extras.gap1', sym: 't', unit: 's', span: ['extras.t1', 'extras.t2'] },
  { kind: 'time', say: 'when it hits the ground a second time', find: 'extras.t2', sym: 't', unit: 's', at: 'extras.t2' },
  { kind: 'speed', say: 'speed just before the second impact', find: 'extras.vIn2', sym: 'v', unit: 'm s^-1', at: 'extras.t2' },
  { kind: 'height', say: 'greatest height after the second bounce', find: 'extras.H2', sym: 'H', unit: 'm', at: 'impacts.1.tTop' },
  { kind: 'graph', say: 'a sketch of the velocity–time (or another) graph: the stage draws them' },
];
/** Two from one place: the twin engine's answers (js/core/twin.js). */
export const TWIN_ANSWERS = [
  { kind: 'time', say: 'when the first-named one (objects[0]) lands', find: 'extras.tA', sym: 't', unit: 's', at: 'extras.tA' },
  { kind: 'time', say: 'when the second-named one (objects[1]) lands', find: 'extras.tB', sym: 't', unit: 's', at: 'extras.tB' },
  { kind: 'time', say: 'the time between their landings', find: 'extras.gapT', sym: 't', unit: 's', at: 'end' },
  { kind: 'distance', say: 'how far out the first-named one lands', find: 'extras.xA', sym: 'x', unit: 'm', at: 'extras.tA' },
  { kind: 'distance', say: 'how far out the second-named one lands', find: 'extras.xB', sym: 'x', unit: 'm', at: 'extras.tB' },
  { kind: 'distance', say: 'the distance between where they land', find: 'extras.gapX', sym: 'd', unit: 'm', at: 'end' },
  { kind: 'speed', say: 'the speed the first-named one lands at', find: 'extras.vA', sym: 'v', unit: 'm s^-1', at: 'extras.tA' },
  { kind: 'speed', say: 'the speed the second-named one lands at', find: 'extras.vB', sym: 'v', unit: 'm s^-1', at: 'extras.tB' },
  { kind: 'graph', say: 'a sketch of the graphs: the stage draws them' },
];
export const ANSWERS = { projectile: PROJECTILE_ANSWERS, pair: PAIR_ANSWERS, bounce: BOUNCE_ANSWERS, twin: TWIN_ANSWERS };

/** What an engine's moments make, when the recipe names no effect: two
    meeting collide, a bounce rings the ground. */
export const MOMENTS = { pair: 'flash', bounce: 'ring' };

/** The effect a landing makes on what is below, when the recipe names none. */
export const LANDS_WITH = { surface: 'dust', sea: 'splash', river: 'splash', pool: 'splash', well: 'splash', ground: 'dust', road: 'dust', rails: 'dust', beach: 'dust', floor: 'ring', snow: 'snow', sand: 'sand' };

/** What it lands on, in a question's words, as a backdrop's `below`. */
const UNDER = [
  [/\b(ground|grass|rocks?|land|field|earth|floor of the valley|valley)\b/, 'ground'],
  [/\b(sea|ocean)\b/, 'sea'], [/\b(river|stream|canal)\b/, 'river'], [/\b(road|street|tarmac|motorway)\b/, 'road'],
  [/\b(beach|sand)\b/, 'beach'], [/\b(water|lake|pond)\b/, 'water'],
];
/**
 * The surface below a backdrop, from the question's word for it: one the
 * backdrop can stand over (`belows`), or null for its own. "Water" is the sea
 * under a cliff and the river under a bridge.
 */
export function belowOf(backdrop, said) {
  const B = BACKDROPS[backdrop], w = String(said ?? '').toLowerCase();
  if (!B?.belows || !w) return null;
  let hit = UNDER.find(([re]) => re.test(w))?.[1] ?? null;
  if (hit === 'water') hit = B.belows.includes('sea') ? 'sea' : B.belows.includes('river') ? 'river' : null;
  return hit && B.belows.includes(hit) && hit !== B.below ? hit : null;
}
/** A backdrop as a recipe has it: its own, with the surface below the recipe's. */
export const placeOf = (r) => ({ ...BACKDROPS[r.backdrop], below: r.below || BACKDROPS[r.backdrop].below });

/* ── what moves, as the question says it ────────────────────────────────
   The reader names what moves in the question's own word (`who`): "diver",
   "parcel", "skateboarder", "football". figureOf() is the one place that word
   becomes a figure — exactly, or the closest one there is, saying so — so
   what moves is what is drawn, everywhere; never a silent ball. */
const WORDS = [
  [/\b(diver|divers|person|people|man|woman|boy|girl|child|student|athlete|jumper|swimmer|gymnast|stunt ?(man|woman|person)|he|she|someone|acrobat|teenager)\b/, 'diver'],
  [/\b(skateboard(er)?|skater)\b/, 'skateboarder'],
  [/\b(parcel|package|box|crate|packet|supplies|aid)\b/, 'parcel'],
  [/\b(sandbag|sand ?bag|sack|bag of (sand|flour)|ballast)\b/, 'sandbag'], [/\b(bucket|pail)\b/, 'bucket'],
  [/\b(fireworks?|firework rocket|rocket firework)\b/, 'firework'], [/\b(rocket|model rocket)\b/, 'rocket'], [/\b(arrow)\b/, 'arrow'],
  [/\b(car|van|vehicle|taxi|jeep)\b/, 'car'], [/\b(lorry|truck|bus)\b/, 'lorry'], [/\b(train|tram|locomotive)\b/, 'train'],
  [/\b(cyclist|bike|bicycle|cycle)\b/, 'cyclist'], [/\b(motorcycl(e|ist)|motorbike|scooter|moped)\b/, 'motorcycle'],
  [/\b(runner|sprinter|jogger)\b/, 'runner'],
  [/\b(coin|penny|pound coin)\b/, 'coin'], [/\b(marble|ball ?bearing|bead)\b/, 'marble'],
  [/\b(football|soccer ball)\b/, 'football'], [/\b(tennis ?ball)\b/, 'tennisBall'], [/\b(golf ?ball)\b/, 'golfBall'],
  [/\b(basket ?ball|netball)\b/, 'basketball'], [/\b(snowball)\b/, 'snowball'], [/\b(water ?balloon|water bomb)\b/, 'waterBalloon'],
  [/\b(shot ?put|the shot|a shot|cannonball|cannon ball|iron ball|lead shot)\b/, 'shot'],
  // an athlete's hammer is a heavy ball on a wire: drawn as the shot
  [/\b(hammer throw(?:er|ing)?|athletics hammer)\b/, 'shot'],
  [/\b(phone|mobile|smartphone)\b/, 'phone'], [/\b(book|textbook|dictionary)\b/, 'book'], [/\b(hammer|spanner|wrench)\b/, 'hammer'],
  [/\b(javelin)\b/, 'javelin'], [/\b(cat|kitten)\b/, 'cat'], [/\b(dog|puppy)\b/, 'dog'],
  [/\b(monkey|chimp|chimpanzee|lemur)\b/, 'monkey'], [/\b(frog|toad)\b/, 'frog'],
  [/\b(bird|kingfisher|gannet|seagull|gull|eagle|hawk|falcon|osprey|pelican|heron|tern|cormorant|puffin|swallow|pigeon|owl|crow|duck)\b/, 'bird'],
  [/\b(stone|pebble|rock|brick|key|object|mass)\b/, 'stone'],
  [/\b(ball|cricket ball|rugby ball|dart)\b/, 'ball'],
  [/\b(particle|point mass)\b/, 'particle'], [/\b(apple|fruit|coconut)\b/, 'apple'],
];
/** The figures a thing with none of its own is drawn as, and how to say so. */
const NEAREST = [
  [/\b(dart|crossbow bolt|spear)\b/, 'arrow'],
  [/\b(ski(er)?|snowboard(er)?|surfer|horse|rider|bmx)\b/, 'diver'],
  [/\b(missile|projectile|shell|bullet|discus|stick|bottle|can|bag|helmet|bomb|drop of water|raindrop|hailstone|fish|nut|clam|mussel|prey|mouse)\b/, 'particle'],
  [/\b(squirrel|fox|rabbit|hare|leopard|cheetah)\b/, 'cat'], [/\b(flea|grasshopper|kangaroo|locust)\b/, 'frog'],
  [/\b(animal|bat|insect|bee)\b/, 'particle'],
];
/**
 * What moves, found in a question's own words when the reader left it out:
 * a thing that is thrown, dropped or driven first (in "a girl throws a ball"
 * it is the ball), a person only when nothing else is named.
 * @returns the word, or null
 */
export function whoIn(text) {
  const t = String(text ?? '').toLowerCase();
  const person = WORDS[0][0], hits = [];
  for (const [re, f] of [...WORDS.slice(1), ...NEAREST]) { const m = t.match(re); if (m) hits.push({ at: m.index, word: m[1] || m[0], f }); }
  // "a bird drops a fish", "a plane releases a package": what is let go
  // moves, not what lets it go
  const carried = (h) => Object.values(CARRIERS).some((C) => C.words.test(h.word));
  const own = hits.filter((h) => !carried(h));
  if (own.length) return own.sort((a, b) => a.at - b.at)[0].word;
  if (hits.length) return hits.sort((a, b) => a.at - b.at)[0].word;
  const p = t.match(person);
  return p ? p[1] : null;
}

/**
 * @param who  what moves, in the question's word
 * @returns {{ figure, exact: boolean, word: string }} — `exact` false means
 *          it is drawn as the closest figure there is, and the reply says so
 */
export function figureOf(who) {
  const word = String(who ?? '').toLowerCase().replace(/[^a-z \-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!word) return { figure: null, exact: false, word };
  if (FIGURES[word]) return { figure: word, exact: true, word };
  for (const [re, f] of WORDS) if (re.test(word)) return { figure: f, exact: true, word };
  for (const [re, f] of NEAREST) if (re.test(word)) return { figure: f, exact: false, word };
  return { figure: 'particle', exact: false, word };
}

/* ── places only the composer draws ─────────────────────────────────────
   The twelve draw the pitch, From a height its cliff, tower, bridge, board,
   well and balloon. A question about a coin off a table or a ball from a
   balcony names a place neither has: whatever moves, small or not, it is
   composed there (js/compose/recipe.js fromReading). */
// a place only as somewhere it leaves from: "off a table", "from the 6 m
// balcony" — never "a table of results", "a park bench", "table tennis",
// "a window of time", "the house rules"
const FROM = '\\b(?:off|from|on|over the edge of|out of)\\s+(?:a|the|an)\\s+(?:\\d+(?:\\.\\d+)?\\s*m(?:etres?)?\\s+(?:high\\s+|tall\\s+)?)?';
const ONLY_HERE = [
  [/\bon (?:the )?moon\b|\blunar\b|\bmoon'?s (?:surface|gravity)\b/, 'moon', 'moon'],
  // unambiguous wherever they are said
  [/\b(?:ski slope|snowfield|ski jump|ski run|piste|snowy slope)\b|\bin(?:to)? the snow\b/, 'snow', 'snow'],
  [/\b(?:in|across|over|into)\s+(?:a|the)\s+(?:desert|sand dunes?|dunes|sahara)\b/, 'desert', 'desert'],
  [/\bon mars\b|\bmartian\b|\bmars'?s (?:surface|gravity)\b/, 'mars', 'mars'],
  [/\b(?:in|through|across|into)\s+(?:a|the)\s+(forest|wood|woods|woodland)\b/, 'forest'],
  [/\b(skyscraper|office block|tower block|high-rise|rooftop)\b/, 'city'],
  [new RegExp(`${FROM}(?:end of (?:a|the)\\s+)?(pier|seaside pier|boardwalk)\\b`), 'pier'],
  [new RegExp(`${FROM}(?:(?:top|gallery|balcony) of (?:a|the)\\s+)?(lighthouse)\\b`), 'lighthouse'],
  [new RegExp(`(?:${FROM}(?:(?:edge|rim|side|top|lip) of (?:a|the)\\s+)?|\\b(?:into|across|over)\\s+(?:a|the)\\s+)(canyon|gorge|ravine)\\b`), 'canyon'],
  [new RegExp(`${FROM}(?:(?:top|edge|lip) of (?:a|the)\\s+)?(waterfall)\\b`), 'waterfall'],
  [new RegExp(`${FROM}(?:(?:deck|stern|side) of (?:a|the)\\s+)?(ship|ferry|liner|cruise ship|tanker)\\b`), 'ship'],
  [new RegExp(`${FROM}(?:(?:top|crest|wall) of (?:a|the)\\s+)?(dam)\\b`), 'dam'],
  [/\b(playground|climbing frame|play tower|slide in a park|top of (?:a|the) slide)\b/, 'playground'],
  [/\b(building site|construction site|scaffold(?:ing)?|tower crane|crane)\b/, 'site'],
  [/\b(golf course|fairway|golf green|putting green|tee(?:ing)? ground|tee box|raised tee|on(?:to)? (?:a|the) green|chip(?:s|ped)? (?:a|the) (?:golf )?ball|golfer)\b/, 'golf'],
  [/\b(athletics stadium|athletics track|running track|shot put|shot-put|putts? the shot|javelin throw|discus|hammer throw|throws the hammer|olympic stadium|in the stadium)\b/, 'stadium'],
  [new RegExp(`${FROM}(quay|quayside|harbour wall|jetty|dock|harbour)\\b`), 'harbour'],
  [new RegExp(`${FROM}(ledge|mountain|mountainside|peak|crag|mountain ledge)\\b`), 'mountain'],
  [new RegExp(`${FROM}(table|desk|bench|worktop|counter|shelf|workbench)\\b(?!\\s+(?:of|tennis))`), 'table'],
  [new RegExp(`${FROM}(balcony|window|house|bungalow|roof)\\b(?!\\s+of)`), 'house'],
  [/\b(?:in|inside)\s+(?:a|the)\s+(sports hall|gym(?:nasium)?)\b|\b(basketball court|netball court|badminton court|indoor court)\b/, 'hall'],
  [new RegExp(`${FROM}(tree|branch|apple tree|bough)\\b`), 'orchard'],
];
/**
 * The composer's own place a question names as where it leaves from, with
 * the question's own word for it, or null: { backdrop: 'table', word: 'shelf' }.
 */
export function placeIn(text) {
  const t = String(text ?? '').toLowerCase();
  for (const [re, backdrop, word] of ONLY_HERE) { const m = t.match(re); if (m) return { backdrop, word: word ?? m[1] }; }
  return null;
}
