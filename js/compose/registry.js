// registry.js — every piece a scenario is made of, as data.
//
// The twelve ready-made scenarios in js/scenarios.js were each written by
// hand, as a bag of flags the app reads: lockAngle, dragLine, stage, second…
// This file names the pieces those flags switch on — the engine that solves
// the motion, the stage that draws it, the object, the companion, the markers
// and the controls — so that a scenario can also be ASSEMBLED, from a recipe,
// for a question none of the twelve fits. See design/composer.md.
//
// THE MODEL NAMES PIECES; THE ENGINE CALCULATES. A recipe says which pieces
// and with which settings. assemble() checks it strictly — an unknown piece,
// an unknown setting or a value out of range is refused, with the reason —
// and turns it into a scenario of exactly the shape js/scenarios.js holds, so
// the app runs it through the same stage, graphs, working and values screen
// as a hand-built one. Nothing a recipe carries is a result (rule 4): there
// are no numbers in it that the engine would otherwise work out.
//
// Pure: no DOM, no network. test/compose.test.mjs rebuilds all twelve
// ready-made scenarios from recipes and checks they come out the same.
//
// ADDING A PIECE: one entry in PIECES — its id, kind, the one-line `says`
// the model is told, its settings in `params`, and `apply(sc, p, ctx)`, which
// writes the flags it stands for onto the scenario being built. If the piece
// needs a flag the app does not read yet, that flag is not a piece until the
// app reads it; SCENARIO_KEYS lists every flag the app reads, and the test
// fails when the code reads one this file has not classified.

import { FLAT_SITE, COMPOSED } from '../scenarios.js';
import { SITES } from '../world/world.js';

/* ── the engines ─────────────────────────────────────────────────────────
   What computes. A recipe never names these: it names a motion, and the
   motion says which engines solve it. Listed so the model can be told what
   the app can calculate, and so the test can check each one still exists. */
export const ENGINES = [
  { id: 'suvat', module: 'js/core/suvat.js', exports: ['solve', 'EQUATIONS'],
    says: 'The five constant-acceleration equations, solved for whichever three of s, u, v, a, t are missing from two given.' },
  { id: 'launch', module: 'js/core/solve.js', exports: ['solveLaunch'],
    says: 'A projectile from what the student knows — any of the five, the angle and the height — or the reason it cannot be solved yet.' },
  { id: 'trajectory', module: 'js/core/trajectory.js', exports: ['trajectory'],
    says: 'The flight itself, with the ground it lands on.' },
  { id: 'projectile', module: 'js/core/projectile.js', exports: ['flight', 'timeAbove', 'heightForTime', 'timeAtSpeed'],
    says: 'The idealised projectile: position and velocity at any time, time spent above a line, the line kept above for a time.' },
  { id: 'road', module: 'js/core/road.js', exports: ['solveRoad', 'roadMotion', 'timeToReach'],
    says: 'Motion along a straight level road: the five with no gravity in them, and the time to reach a mark.' },
  { id: 'descent', module: 'js/core/descent.js', exports: ['solveDescent'],
    says: 'A parachute drop: free fall, a constant deceleration once the canopy opens, then a steady speed — each phase SUVAT.' },
  { id: 'intercept', module: 'js/core/intercept.js', exports: ['intercept'],
    says: 'Whether a projectile meets a target that falls from rest the instant it is launched, and where.' },
  { id: 'working', module: 'js/working.js', exports: ['buildWorking'],
    says: 'The worked solution of a launch, with real numbers substituted.' },
  { id: 'road-working', module: 'js/core/road.js', exports: ['roadWorking'],
    says: 'The worked solution along a road.' },
  { id: 'descent-working', module: 'js/core/descent.js', exports: ['descentWorking'],
    says: 'The worked solution of each phase of a drop.' },
];

/* ── what a recipe can hold ──────────────────────────────────────────────
   How many of each kind a scenario has. Kinds with `auto` are filled in from
   the motion and are not named in a recipe: every motion has its graphs, its
   working and its values screen, and the recipe cannot leave them out. */
export const KINDS = {
  motion:    { min: 1, max: 1, says: 'what moves, and which engine solves it' },
  stage:     { min: 1, max: 1, says: 'where it is drawn' },
  body:      { min: 0, max: 1, says: 'what is drawn moving; the stage has its own if none is named' },
  companion: { min: 0, max: 1, says: 'a second object derived from the first, flown beside it on one clock' },
  marker:    { min: 0, max: 2, says: 'a line or a target the question is about' },
  control:   { min: 0, max: 2, says: 'an extra control on the stage' },
  graph:     { auto: true, says: 'displacement, velocity and acceleration against time — always all three' },
  working:   { auto: true, says: 'the worked solution, step by step' },
  values:    { auto: true, says: 'the boxes the student fills in' },
};

const num = (x) => typeof x === 'number' && isFinite(x);
const motionOf = (ctx) => ctx.pieces.find((q) => q.def.kind === 'motion')?.def.id;
const stageOf = (ctx) => ctx.pieces.find((q) => q.def.kind === 'stage')?.def.id;
const has = (ctx, id) => ctx.pieces.some((q) => q.def.id === id);

/* Settings. Each one is checked by its type, and nothing else is accepted.
     number  { min, max, required }   a finite number, in range
     bool                              true or false
     one     { of: [...] }             one of a list of words
     text    { max }                   words, trimmed, at most max characters */

/**
 * The pieces. `apply(sc, p, ctx)` writes onto the scenario being built the
 * same flags a hand-built one carries; `needs(ctx)` returns the reason this
 * piece cannot go with the others, or nothing.
 */
export const PIECES = [

  /* ── motions ────────────────────────────────────────────────────────── */
  { id: 'launch', kind: 'motion', engines: ['launch', 'trajectory', 'projectile', 'working'],
    says: 'A projectile under gravity alone: thrown, fired, kicked or dropped, from the ground or from a height.',
    params: {
      angle:   { type: 'one', of: ['free', 'fixed', 'released'], required: true,
                 says: 'free: the student sets the angle; fixed: it is always `degrees`; released: let go from rest, no angle and no launch speed' },
      degrees: { type: 'number', min: -90, max: 90, says: 'the angle when it is fixed, above the horizontal (negative is below)' },
      min:     { type: 'number', min: -90, max: 90, says: 'the lowest angle the student may set, when it is free' },
      max:     { type: 'number', min: -90, max: 90, says: 'the highest angle the student may set, when it is free' },
      from:    { type: 'one', of: ['ground', 'height'], says: 'where it starts: on the ground, or up on a cliff, tower or building' },
    },
    needs(p) {
      if (p.angle === 'fixed' && !num(p.degrees)) return 'A fixed angle needs its degrees.';
      if (p.angle !== 'fixed' && p.degrees !== undefined) return 'Only a fixed angle takes degrees.';
      if (p.angle !== 'free' && (p.min !== undefined || p.max !== undefined)) return 'Only a free angle takes a min and a max.';
      if (num(p.min) && num(p.max) && p.min >= p.max) return 'The lowest angle must be below the highest.';
      return '';
    },
    apply(sc, p) {
      const h = p.from === 'height' ? 25 : 0;
      if (p.angle === 'released') {
        Object.assign(sc, { noAngle: true, fixedU: 0 });
        sc.params = { u: 0, theta: -90, h: h || 25, g: 9.81 };
      } else if (p.angle === 'fixed') {
        sc.lockAngle = true;
        sc.params = { u: 20, theta: p.degrees, h, g: 9.81 };
      } else {
        if (num(p.min) || num(p.max)) sc.theta = { min: num(p.min) ? p.min : -90, max: num(p.max) ? p.max : 90 };
        sc.params = { u: 20, theta: 45, h, g: 9.81 };
      }
    } },

  { id: 'straight-line', kind: 'motion', engines: ['road', 'suvat', 'road-working'],
    says: 'A vehicle along a straight level road, passing A and then B: the five equations with no gravity in them; braking is a negative acceleration.',
    params: {},
    needs: (p, ctx) => (stageOf(ctx) === 'road' ? '' : 'A straight-line motion is drawn on the road stage.'),
    apply(sc) { sc.road = true; sc.params = { u: 14, theta: 0, h: 0, g: 0, a: 2, s: 240, v: 34, t: 10 }; } },

  { id: 'parachute-phases', kind: 'motion', engines: ['descent', 'suvat', 'descent-working'],
    says: 'A drop in three phases: free fall, a constant deceleration once the canopy opens, then a steady speed.',
    params: {},
    needs: (p, ctx) => (stageOf(ctx) === 'sky' ? '' : 'A parachute drop is drawn on the sky stage.'),
    apply(sc) {
      sc.params = { u: 0, theta: -90, h: 100, g: 9.81 };
      // For the card's sketch only, as in js/scenarios.js: the student types all four.
      sc.descent = { tOpen: 3, aChute: 25, vTerm: 6 };
    } },

  /* ── stages ─────────────────────────────────────────────────────────── */
  { id: 'stadium', kind: 'stage', render: { module: 'js/render/scene.js', exports: ['render'] },
    says: 'The side-on view of the stadium, launched from one of its spots.',
    params: {
      spot: { type: 'one', of: Object.keys(SITES), required: true,
              says: 'where in the stadium: ' + Object.entries(SITES).map(([k, s]) => `${k} (${s.place})`).join('; ') },
    },
    needs: (p, ctx) => (motionOf(ctx) === 'launch' ? '' : 'The stadium is for a launch.'),
    apply(sc, p) { sc.spot = p.spot; } },

  { id: 'plate', kind: 'stage', render: { module: 'js/render/exhibit.js', exports: ['render'] },
    says: 'A strobe photograph of an experiment, away from the stadium: it opens straight onto the flight with its own starting numbers.',
    params: {
      backdrop: { type: 'one', of: ['plain', 'warehouse'], required: true,
                  says: 'plain: open ground with a tree; warehouse: an indoor range' },
      u: { type: 'number', min: 0, max: 1000, required: true, says: 'the launch speed it opens on' },
      h: { type: 'number', min: 0, max: 100, required: true, says: 'the launch height it opens on' },
    },
    needs: (p, ctx) => (motionOf(ctx) === 'launch' ? '' : 'The plate is for a launch.'),
    apply(sc, p) {
      Object.assign(sc, { exhibit: true, plate: true, backdrop: p.backdrop, site: FLAT_SITE,
                          seed: { u: p.u, h: p.h, g: 9.81 } });
    } },

  { id: 'range', kind: 'stage', render: { module: 'js/render/range.js', exports: ['render'] },
    says: 'An indoor range lit by a strobe, with a rifle on a bench and a clamp that lets a second round go at the same instant.',
    params: {
      u: { type: 'number', min: 0, max: 1000, required: true, says: 'the muzzle speed it opens on' },
      h: { type: 'number', min: 0.2, max: 3, required: true, says: 'the height of the bench it opens on' },
    },
    needs: (p, ctx) => (motionOf(ctx) === 'launch' ? '' : 'The range is for a launch.'),
    apply(sc, p) {
      Object.assign(sc, { exhibit: true, stage: 'range', backdrop: 'warehouse', site: FLAT_SITE,
                          seed: { u: p.u, h: p.h, g: 9.81 } });
    } },

  { id: 'road', kind: 'stage', render: { module: 'js/render/road.js', exports: ['render'] },
    says: 'A straight level road from A to B, seen from the side.',
    params: {},
    needs: (p, ctx) => (motionOf(ctx) === 'straight-line' ? '' : 'The road is for a straight-line motion.'),
    apply(sc) { sc.stage = 'road'; } },

  { id: 'sky', kind: 'stage', render: { module: 'js/render/drop.js', exports: ['descentPanes', 'drawJump'] },
    says: 'An open sky with the aircraft, watched in panes beside the three graphs.',
    params: {},
    needs: (p, ctx) => (motionOf(ctx) === 'parachute-phases' ? '' : 'The sky is for a parachute drop.'),
    // The flight still starts from a spot, as every scenario's does: the display jump's.
    apply(sc) { sc.spot = 'parachute'; } },

  /* ── bodies ─────────────────────────────────────────────────────────── */
  { id: 'ball', kind: 'body', says: 'A ball, kicked or thrown.', params: {},
    needs: (p, ctx) => (['stadium'].includes(stageOf(ctx)) ? '' : 'A ball is drawn in the stadium.'),
    apply() {} },
  { id: 'round', kind: 'body', says: 'A bullet.', params: {},
    needs: (p, ctx) => (['range', 'plate'].includes(stageOf(ctx)) ? '' : 'A round is drawn on the range or the plate.'),
    apply() {} },
  { id: 'banana', kind: 'body', says: 'A banana, thrown.', params: {},
    needs: (p, ctx) => (stageOf(ctx) === 'plate' ? '' : 'A banana is drawn on the plate.'),
    apply(sc) { sc.projectile = 'banana'; } },
  { id: 'skydiver', kind: 'body', says: 'A skydiver under a canopy.', params: {},
    needs: (p, ctx) => (stageOf(ctx) === 'sky' ? '' : 'A skydiver is drawn in the sky.'),
    apply() {} },
  { id: 'vehicle', kind: 'body', says: 'A lorry or a car.', params: {},
    needs: (p, ctx) => (stageOf(ctx) === 'road' ? '' : 'A vehicle is drawn on the road.'),
    apply() {} },

  /* ── companions ─────────────────────────────────────────────────────── */
  { id: 'released-beside', kind: 'companion', engines: ['projectile'],
    says: 'The same object let go from rest at the launch height, at the instant the first is launched: which lands first?',
    params: {
      label: { type: 'text', max: 24, required: true, says: 'what it is called on the stage: "released"' },
      pair:  { type: 'text', max: 24, says: 'what the two share, said beside them: "same height"' },
    },
    needs: (p, ctx) => (motionOf(ctx) === 'launch' ? '' : 'A companion flies beside a launch.'),
    apply(sc, p) {
      sc.second = { label: p.label, from: (q) => (q.h > 0.05 ? { u: 0, theta: -90, h: q.h } : null) };
      if (p.pair) sc.pairLabel = p.pair;
    } },

  { id: 'drops-from-target', kind: 'companion', engines: ['projectile', 'intercept'],
    says: 'The target lets go and falls from rest the instant the shot leaves.',
    params: {
      label: { type: 'text', max: 24, required: true, says: 'what it is called: "the monkey"' },
      pair:  { type: 'text', max: 24, says: 'what the two share: "same fall"' },
    },
    needs: (p, ctx) => (has(ctx, 'target') ? '' : 'Something can only drop from a target if there is one.'),
    apply(sc, p) {
      sc.second = { label: p.label, from: (q, markers) => {
        const t = markers?.target;
        return t && t.y > 0.2 ? { u: 0, theta: -90, h: t.y, x0: t.x } : null;
      } };
      if (p.pair) sc.pairLabel = p.pair;
    } },

  /* ── markers ────────────────────────────────────────────────────────── */
  { id: 'height-line', kind: 'marker', engines: ['projectile'],
    says: 'A horizontal line at a height; the engine finds when the flight is above it, and for how long.',
    params: {
      at:   { type: 'number', min: 0, max: 500, required: true, says: 'its height in metres, where it starts' },
      drag: { type: 'bool', says: 'the student can drag it' },
    },
    needs: (p, ctx) => (motionOf(ctx) === 'launch' ? '' : 'A height line is for a launch.'),
    apply(sc, p) {
      sc.markers = { ...(sc.markers || {}), heightLine: p.at };
      if (p.drag) sc.dragLine = true;
    } },

  { id: 'target', kind: 'marker', engines: ['intercept'],
    says: 'A point to aim at, which the student can drag; with aim on, the launcher always points straight at it.',
    params: {
      x:        { type: 'number', min: 0.5, max: 200, required: true, says: 'how far away, in metres' },
      y:        { type: 'number', min: 0, max: 100, required: true, says: 'how high, in metres' },
      drag:     { type: 'bool', says: 'the student can drag it' },
      aim:      { type: 'bool', says: 'the launcher aims straight at it, so the angle is not the student’s' },
      branches: { type: 'bool', says: 'it hangs from a branch of the tree and snaps between them' },
      caught:   { type: 'text', max: 32, says: 'what is said when the shot meets it' },
    },
    needs(p, ctx) {
      if (motionOf(ctx) !== 'launch') return 'A target is for a launch.';
      if (p.branches && !(stageOf(ctx) === 'plate' && ctx.byId.plate?.p.backdrop === 'plain')) {
        return 'Only the plain plate has a tree to hang a target from.';
      }
      if (p.aim && ctx.byId.launch?.p.angle !== 'free') return 'Aiming at a target sets the angle, so the launch angle must be free.';
      return '';
    },
    apply(sc, p) {
      sc.markers = { ...(sc.markers || {}), target: { x: p.x, y: p.y } };
      if (p.drag) sc.dragTarget = true;
      if (p.aim) sc.aimAtTarget = true;
      if (p.branches) sc.branches = true;
      if (p.caught) sc.caughtLabel = p.caught;
    } },

  /* ── controls ───────────────────────────────────────────────────────── */
  { id: 'straight-up', kind: 'control',
    says: 'A one-press 90° beside the angle, for asking the same question of a vertical throw.',
    params: {},
    needs: (p, ctx) => (ctx.byId.launch?.p.angle === 'free' ? '' : 'Straight up is offered beside a free angle.'),
    apply(sc) { sc.straightUp = true; } },

  { id: 'live-sliders', kind: 'control',
    says: 'Speed and angle sliders on the stage itself, for an experiment that is played with rather than solved.',
    params: {
      uMin: { type: 'number', min: 0, max: 1000, required: true, says: 'the slowest speed on the slider, m/s' },
      uMax: { type: 'number', min: 0, max: 1000, required: true, says: 'the fastest speed on the slider, m/s' },
      uStep: { type: 'number', min: 0.01, max: 100, says: 'how far one notch moves the speed' },
      thetaMin: { type: 'number', min: -90, max: 90, says: 'the lowest angle on an angle slider, if there is one' },
      thetaMax: { type: 'number', min: -90, max: 90, says: 'the highest angle on that slider' },
      thetaStep: { type: 'number', min: 0.01, max: 10, says: 'how far one notch moves the angle' },
    },
    needs(p, ctx) {
      if (!['plate', 'range'].includes(stageOf(ctx))) return 'Live sliders belong on an experiment: the plate or the range.';
      if (p.uMin >= p.uMax) return 'The slowest speed must be below the fastest.';
      if (num(p.thetaMin) !== num(p.thetaMax)) return 'An angle slider needs both ends.';
      if (num(p.thetaMin) && p.thetaMin >= p.thetaMax) return 'The lowest angle must be below the highest.';
      return '';
    },
    apply(sc, p) {
      sc.live = { u: { min: p.uMin, max: p.uMax, step: p.uStep ?? 0.5, label: 'speed', unit: 'm s⁻¹' } };
      if (num(p.thetaMin)) {
        sc.live.theta = { min: p.thetaMin, max: p.thetaMax, step: p.thetaStep ?? 0.5, label: 'angle', unit: '°' };
        // The control's range is the slider's, as on Monkey vs Hunter.
        sc.theta = { min: p.thetaMin, max: p.thetaMax };
      }
    } },

  /* ── always there, from the motion ──────────────────────────────────── */
  { id: 'graph-s', kind: 'graph', auto: true, render: { module: 'js/render/graphs.js', exports: ['graphSpecs', 'drawGraph'] },
    says: 'Displacement against time, horizontal dashed and vertical solid.' },
  { id: 'graph-v', kind: 'graph', auto: true, render: { module: 'js/render/graphs.js', exports: ['graphSpecs', 'drawGraph'] },
    says: 'Velocity against time.' },
  { id: 'graph-a', kind: 'graph', auto: true, render: { module: 'js/render/graphs.js', exports: ['graphSpecs', 'drawGraph'] },
    says: 'Acceleration against time.' },
  { id: 'working', kind: 'working', auto: true, engines: ['working', 'road-working', 'descent-working'],
    says: 'The engine’s worked solution, with real numbers substituted — the one its motion uses.' },
  { id: 'values', kind: 'values', auto: true,
    says: 'The boxes: s, u, v, a, t, the angle and the height for a launch; s, u, v, a, t and a mark along a road; the height and three phases for a drop.' },
];

/* ── hand-built only ─────────────────────────────────────────────────────
   Parts of a ready-made scenario that are written, not assembled: the card,
   the words on it, the experiment's opening card and the long ending that
   says where the model stops being the real thing. A composed scenario has
   its name, a line under it and a note, and none of these. */
export const HAND_BUILT = ['ending', 'intro', 'card', 'place', 'group'];

/* ── every flag the app reads ────────────────────────────────────────────
   STRUCTURAL flags are what a piece sets: they change what is solved, drawn
   or offered, and a composed scenario must set them exactly as a hand-built
   one would. WORDS are what the student reads. The test scans js/ for every
   `scenario.<flag>` and fails on one that is in neither list. */
export const SCENARIO_KEYS = {
  structural: ['params', 'lockAngle', 'noAngle', 'fixedU', 'theta', 'markers', 'dragLine', 'straightUp',
               'road', 'stage', 'descent', 'exhibit', 'plate', 'backdrop', 'site', 'seed', 'projectile',
               'second', 'aimAtTarget', 'dragTarget', 'branches', 'live', 'spot', 'recipe',
               // read by the stage, set by no scenario today
               'secondMarks', 'showPerpendicular'],
  words: ['id', 'name', 'sub', 'note', 'pairLabel', 'caughtLabel', 'composed', ...HAND_BUILT],
};

/* ── checking and assembling ─────────────────────────────────────────── */
const PIECE = Object.fromEntries(PIECES.map((p) => [p.id, p]));
const TOP = ['name', 'sub', 'note', 'pieces'];

function checkParam(key, spec, v) {
  if (spec.type === 'number') {
    if (!num(v)) return `${key} must be a number.`;
    if (num(spec.min) && v < spec.min) return `${key} must be at least ${spec.min}.`;
    if (num(spec.max) && v > spec.max) return `${key} must be at most ${spec.max}.`;
  } else if (spec.type === 'bool') {
    if (typeof v !== 'boolean') return `${key} must be true or false.`;
  } else if (spec.type === 'one') {
    if (!spec.of.includes(v)) return `${key} must be one of: ${spec.of.join(', ')}.`;
  } else if (spec.type === 'text') {
    if (typeof v !== 'string' || !v.trim()) return `${key} must be some words.`;
    if (v.trim().length > spec.max) return `${key} must be at most ${spec.max} characters.`;
  }
  return '';
}

/**
 * A recipe, checked and assembled into a scenario of the shape js/scenarios.js holds.
 * @returns {{ok:true, scenario} | {ok:false, error}}
 */
export function assemble(recipe) {
  const no = (error) => ({ ok: false, error });
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) return no('A recipe is one object.');
  for (const k of Object.keys(recipe)) if (!TOP.includes(k)) return no(`A recipe has no "${k}". It has: ${TOP.join(', ')}.`);
  const name = typeof recipe.name === 'string' ? recipe.name.trim() : '';
  if (!name || name.length > 60) return no('A recipe needs a name, at most 60 characters.');
  for (const k of ['sub', 'note']) {
    if (recipe[k] !== undefined && (typeof recipe[k] !== 'string' || recipe[k].length > (k === 'sub' ? 60 : 600))) {
      return no(`${k} must be words, at most ${k === 'sub' ? 60 : 600} characters.`);
    }
  }
  if (!Array.isArray(recipe.pieces) || !recipe.pieces.length) return no('A recipe lists its pieces.');

  // Each piece: one the registry has, with settings it takes, each valid.
  const pieces = [];
  for (const raw of recipe.pieces) {
    if (!raw || typeof raw !== 'object' || typeof raw.piece !== 'string') return no('Each piece is an object naming its "piece".');
    const def = PIECE[raw.piece];
    if (!def) return no(`There is no piece called "${raw.piece}".`);
    if (def.auto) return no(`"${def.id}" is always there; a recipe does not name it.`);
    const { piece, ...p } = raw;
    const specs = def.params || {};
    for (const [k, v] of Object.entries(p)) {
      if (!specs[k]) return no(`"${piece}" has no setting "${k}".${Object.keys(specs).length ? ` It has: ${Object.keys(specs).join(', ')}.` : ' It has none.'}`);
      const bad = checkParam(k, specs[k], v);
      if (bad) return no(`"${piece}": ${bad}`);
    }
    for (const [k, spec] of Object.entries(specs)) if (spec.required && p[k] === undefined) return no(`"${piece}" needs "${k}".`);
    if (pieces.some((q) => q.def.id === def.id)) return no(`"${def.id}" is named twice.`);
    pieces.push({ def, p: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])) });
  }

  // How many of each kind.
  for (const [kind, rule] of Object.entries(KINDS)) {
    if (rule.auto) continue;
    const n = pieces.filter((q) => q.def.kind === kind).length;
    if (n < rule.min) return no(`A recipe needs ${rule.min === 1 ? 'a' : rule.min} ${kind}: ${rule.says}.`);
    if (n > rule.max) return no(`A recipe has at most ${rule.max} ${kind}${rule.max === 1 ? '' : 's'}.`);
  }

  // Whether they go together.
  const ctx = { pieces, byId: Object.fromEntries(pieces.map((q) => [q.def.id, q])) };
  for (const q of pieces) {
    const why = q.def.needs?.(q.p, ctx);
    if (why) return no(why);
  }

  // Built in a fixed order — motion, stage, then the rest — so a later
  // piece can refine what an earlier one set (the live slider's angle range).
  const ORDER = ['motion', 'stage', 'body', 'companion', 'marker', 'control'];
  const sc = { id: `composed-${slug(name)}-${hash(JSON.stringify(recipe.pieces))}`, group: 'composed', composed: true, name,
               sub: recipe.sub?.trim() || '', note: recipe.note?.trim() || '' };
  for (const kind of ORDER) for (const q of pieces.filter((x) => x.def.kind === kind)) q.def.apply(sc, q.p, ctx);
  sc.recipe = JSON.parse(JSON.stringify(recipe));
  return { ok: true, scenario: sc };
}

/**
 * A recipe assembled and kept, so byId() in js/scenarios.js finds it and the
 * app can choose it like any other scenario. The same recipe gives the same id.
 */
export function compose(recipe) {
  const r = assemble(recipe);
  if (r.ok) COMPOSED.set(r.scenario.id, r.scenario);
  return r;
}

/* Two recipes with one name are still two scenarios. */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).slice(0, 5);
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'scenario';
