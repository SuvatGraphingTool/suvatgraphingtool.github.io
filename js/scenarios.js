// scenarios.js — the situations the playground can set up.
//
// `backdrop` and `site` belong to the STROBE PLATE renderer in
// js/render/exhibit.js, which nothing currently reaches — see the note on
// `plate` in js/app.js's draw(). Both exhibits are drawn by the ordinary
// side-on view now, like every other scenario, so they launch from a place in
// js/world/world.js's SITES like every other scenario does. The two fields
// are kept because the plate renderer is kept.
//
// A scenario chooses the SITUATION and nothing else. It decides which boxes
// apply, which markers appear and what the card says it is for. Every number
// is typed by the student; nothing here is pre-filled.
//
// Three groups, by where the object starts:
//   from the ground · from a platform · and the ones worth a detour.
//
// `card` names a palette for the scenario's picture on the chooser, defined in
// css/tokens.css. It is a NAME, not a colour — no hex belongs in this file.

/** A scenario away from the stadium stands at the world origin. */
export const FLAT_SITE = { axis: 'x', at: 0, dir: 1, origin: { x: 0, z: 0 }, place: '', view: '' };

export const GROUPS = [
  { id: 'ground',   label: 'From the ground',
    blurb: 'Starts and lands at the same level, so the path is symmetrical.' },
  { id: 'platform', label: 'From a platform',
    blurb: 'Five ways off one platform. All land lower, so none is symmetrical.' },
  { id: 'look',     label: 'Interesting ones',
    blurb: 'Questions about a moment mid-flight, not the end of it.' },
  { id: 'line',     label: 'Along a straight road',
    blurb: 'No gravity in it at all. The acceleration is the vehicle\u2019s own, and it is one of the five.' },
];

export const SCENARIOS = [

  /* ── from the ground ──────────────────────────────────────────────── */
  { id: 'up', group: 'ground', name: 'Thrown straight up',
    sub: 'no angle to enter',
    note: 'Up, stops, back down at the speed it left. Time up equals time down.',
    params: { u: 14, theta: 90, h: 0, g: 9.81 }, lockAngle: true },

  { id: 'arc', group: 'ground', name: 'Simple arc',
    sub: 'at an angle',
    note: 'An angle, landing at the same level. Gives you range and greatest height.',
    params: { u: 25, theta: 45, h: 0, g: 9.81 },
    // UPWARDS ONLY. Launched from the ground, a downward angle has nowhere to
    // go: it puts the object under the floor before it has travelled
    // anything, and the flight it describes does not exist. Flat is the same
    // refusal one degree later — it never leaves the ground — so the control
    // starts at 1°. See `theta` in js/app.js for how a range is enforced.
    theta: { min: 1, max: 90 } },

  /* ── from a platform ──────────────────────────────────────────────── */
  { id: 'dropped', group: 'platform', name: 'Dropped',
    sub: 'straight down, from rest',
    note: 'Released, not thrown. No angle, no launch speed — height and g are the whole question.',
    params: { u: 0, theta: -90, h: 80, g: 9.81 }, noAngle: true, fixedU: 0 },

  { id: 'down', group: 'platform', name: 'Thrown straight down',
    sub: 'straight down, with a push',
    note: 'A drop with a head start. Lands sooner and faster than if released.',
    params: { u: 10, theta: -90, h: 45, g: 9.81 }, lockAngle: true },

  { id: 'platform-down', group: 'platform', name: 'Down and off a platform',
    sub: 'thrown down, at an angle',
    note: 'Aimed below the horizontal, so it is falling before it has gone anywhere. No upward half, no greatest height — and a negative angle, which is where the marks go.',
    params: { u: 25, theta: -30, h: 25, g: 9.81 },
    // THE ONE SCENARIO WHERE A NEGATIVE ANGLE IS THE QUESTION. Everywhere
    // else the control refuses them, because everywhere else they describe a
    // throw that cannot happen or a card that already exists. Here the sign
    // of u_y is the whole examinable point, so the range runs the other way.
    theta: { min: -90, max: 0 } },

  { id: 'platform', group: 'platform', name: 'Off a platform',
    sub: 'thrown flat',
    note: 'Falls in the same time as if dropped — try it against Dropped.',
    params: { u: 20, theta: 0, h: 25, g: 9.81 }, lockAngle: true },

  { id: 'platform-angle', group: 'platform', name: 'Up and off a platform',
    sub: 'thrown up, at an angle',
    note: 'Thrown up, lands lower, so the two halves differ. The commonest exam setup.',
    params: { u: 28, theta: 45, h: 25, g: 9.81 },
    // The card says UP and off a platform, so the control says the same. A
    // downward angle from here is a different question and has its own card.
    // Flat is allowed, because flat off a platform is a real throw — and it
    // too has its own card, which is the point of being able to compare them.
    theta: { min: 0, max: 90 } },

  /* ── interesting ones ─────────────────────────────────────────────── */
  { id: 'time-above', group: 'look', name: 'Time above a line',
    sub: 'how long is it up there?',
    note: 'It crosses the line twice. The gap between those times is the answer. Drag the line. Thrown straight up works too — the same two crossings, one above the other.',
    params: { u: 24, theta: 40, h: 0.9, g: 9.81 },
    // `straightUp` offers a one-press 90° beside the angle: the question is
    // asked of vertical throws as often as of arcs.
    markers: { heightLine: 6 }, dragLine: true, straightUp: true },

  /* ── the one the idealised model cannot do on its own ─────────────────
     A parachute is the single situation in the syllabus where "no air
     resistance" is not a simplification but a refusal to describe the thing,
     so air comes in the way the exams let it in: as a stated constant for
     each stretch of the fall, never as a drag law. Three stretches, constant
     acceleration within each, and the five equations applied to each in
     turn — which is the lesson. See js/core/descent.js.

     `descent` here is ILLUSTRATION ONLY, for the card's sketch. Nothing on
     this screen is pre-filled; the student types all four. */
  { id: 'parachute', group: 'look', name: 'Parachute drop',
    sub: 'free fall, then the canopy',
    note: 'Three phases, and SUVAT applies to each one separately: free fall under gravity alone, a hard deceleration as the canopy opens, then a steady descent at constant speed. The equations never described the whole fall — only a stretch of it at a time, which is what this one is for.',
    params: { u: 0, theta: -90, h: 100, g: 9.81 },
    descent: { tOpen: 3, aChute: 25, vTerm: 6 },
    card: 'sky',
    ending: {
      close: 'See the drop',
      title: 'Three phases, and SUVAT three times over.',
      realTitle: 'Where this stops being the real thing',
      realLead: 'Two of the simplifications are the exam\u2019s, and they are the reason the question is answerable at all. Neither is hidden here, and neither was computed: they are what the numbers you typed were taken to mean.',
      why: [
        ['Free fall has no air in it at all', 'this phase is the ordinary model, so she keeps gaining speed for as long as you let her. A real skydiver levels off near 55 m s\u207b\u00b9 after about twelve seconds, because drag grows with speed until it balances weight — exactly what phase three does here, but at a hundred times the speed.'],
        ['The canopy opens instantly', 'at the moment you chose, the acceleration changes from one constant to another with nothing in between. A real opening takes a few tenths of a second and the force rises and falls through it, peaking well above the average. The average is what a constant deceleration gives you.'],
        ['The deceleration is a number you gave', 'it was not worked out from the size of the canopy, her mass, or the density of the air. Nothing here models any of those. It is the figure the question states, and the engine took it at its word.'],
        ['The aircraft is scenery, and so is the door', 'she leaves from rest and falls vertically \u2014 the engine is one-dimensional and knows nothing about how fast the aeroplane was flying. A real jumper carries the aircraft\u2019s speed out of the door with her, which bends the first second or two of the fall into an arc; none of that is in any of these numbers. The aeroplane crossing the sky, the door sliding open and the step out all happen before the clock starts, and the graphs hold at zero until it does. It then flies on and descends, which is what a jump aircraft really does — it has to get down and land — but that way down was not computed either, any more than its speed was. Both the aeroplane and the canopy are drawn at a size you can see rather than at the size they are.'],
        ['She is a point, and the air is still', 'no wind, no drift across the ground, no swinging under the lines, and the canopy is drawn at a size you can see rather than at the size it is.'],
      ],
      caveat: 'What the engine did compute is on the left: each phase solved on its own with the five equations, and the three stitched together. Every number in the table came out of that. Nothing on this card accounted for air density, canopy area or mass, because the model does not contain them.',
    } },

  /* ── the two that are not at the stadium ──────────────────────────── */
  { id: 'bullet', group: 'look', name: 'Dropping vs Firing a Bullet',
    sub: 'which lands first?',
    note: 'Two identical rounds leave the bench at the same instant: one fired flat, one simply released. Vertically they are the same problem — neither starts with any upward speed, and both are pulled down at the same rate — because firing adds velocity sideways only, and the two components are independent. The horizontal push buys no hang time at all, at any muzzle speed.',
    params: { u: 360, theta: 0, h: 1.5, g: 9.81 }, lockAngle: true,
    exhibit: true, backdrop: 'warehouse', site: FLAT_SITE,
    // Its own stage: an indoor range with a rifle, a release clamp and a
    // strobe. See js/render/range.js.
    stage: 'range',
    place: 'An indoor range, lit by a strobe',
    card: 'range',
    pairLabel: 'same height',
    seed: { u: 360, h: 1.5, g: 9.81 },
    intro: {
      title: 'Pick a round',
      body: 'Muzzle speed sets how far the fired round goes before it lands. It does not change WHEN it lands — that is the whole experiment, so try to break it.',
      field: 'u', unit: 'm s⁻¹',
      models: [
        { name: 'Air rifle', u: 170, note: '.177 pellet' },
        { name: 'Pistol', u: 360, note: '9 mm, typical service load' },
        { name: 'Service rifle', u: 920, note: '5.56 mm' },
      ],
    },
    ending: {
      close: 'See the diagram',
      title: 'Both hit the ground at the same time.',
      realTitle: 'In the real world there is a difference. It is small.',
      realLead: 'Careful experiments with a real rifle have timed the fired round landing a few tens of milliseconds after the dropped one — a few per cent of a fall lasting about half a second. Every reason for it is something this app does not model.',
      why: [
        ['Air resistance', 'the fired round meets drag along its whole path, and the moment it pitches even slightly, that drag gets a vertical component. This is the dominant term.'],
        ['Lift from a spinning round', 'a rifled bullet is stabilised and does not sit perfectly along its own velocity, so it generates a small lift force.'],
        ['The Magnus effect', 'that same spin, in moving air, pushes it sideways and a little upwards.'],
        ['The Earth is round', 'over a long enough shot the ground curves away underneath, so "the same height" slowly stops meaning the same thing.'],
        ['The Coriolis effect', 'on a fast, long shot the rotation of the Earth deflects it measurably.'],
        ['g falls with altitude', 'very slightly — so a round that rises at all is pulled a shade less hard.'],
      ],
      caveat: 'None of that is in the picture you just watched. This app implements the idealised A-level model — no air, no wind, no spin, flat ground, uniform g — and it has computed none of those six effects. They are listed because they are the honest reason a slow-motion video does not quite match, not because anything here accounted for them.',
    },
    second: {
      label: 'released',
      /** The same round, let go rather than fired. Nothing else changes. */
      from(p) {
        if (!(p.h > 0.05)) return null;        // needs a height to fall from
        return { u: 0, theta: -90, h: p.h };
      },
    } },

  { id: 'monkey', group: 'look', name: 'Monkey vs Hunter',
    sub: 'aim straight at it',
    note: 'The hunter aims directly AT the monkey; the monkey drops the instant the shot leaves. In the time the banana takes to cover the horizontal gap, both have fallen the same ½gt² below where they would have been without gravity — so the aim that would have been right without gravity is still right with it. Drag the monkey anywhere: it only fails if the monkey reaches the ground first.',
    params: { u: 22, theta: 0, h: 1.5, g: 9.81 },
    // BACK ON THE PLATE. It was moved onto the ordinary side-on view when the
    // plate could not be dragged or zoomed; the plate reads the camera now,
    // so the place comes back with the dragging, the zoom, the view button
    // and the graphs rather than instead of them. See fitPlate in
    // js/render/exhibit.js.
    exhibit: true, plate: true, backdrop: 'plain', site: FLAT_SITE,
    // WITHOUT THIS THE CAPTION READS "The west goal line, aimed down the
    // pitch". An exhibit has no site in js/world/world.js, so siteFor() falls
    // through to the goal kick — see renderHud, whose comment says exactly
    // this and then had its two `place` strings removed from under it.
    place: 'A branch, a throw, and nothing else in the way',
    // The hunter throws a banana, and says so here rather than leaving the
    // renderer to infer it from the sand.
    projectile: 'banana',
    card: 'dusk',
    pairLabel: 'same fall',
    caughtLabel: 'caught — every time',
    seed: { u: 22, h: 1.5, g: 9.81 },
    // The monkey hangs from a BRANCH, and this is one of them — see BRANCHES
    // in js/render/backdrops.js, which is the one list both the tree and the
    // drag read. A marker in mid-air would be a monkey holding nothing.
    markers: { target: { x: 10.1, y: 9.4 } }, dragTarget: true, aimAtTarget: true,
    branches: true,
    // Live, on the scene. Three preset buttons were a menu; this is a toy.
    live: { u: { min: 4, max: 60, step: 0.5, label: 'speed', unit: 'm s⁻¹' },
            theta: { min: -20, max: 85, step: 0.5, label: 'angle', unit: '°' } },
    // Matched to the live slider above. This is the second place a negative
    // angle is allowed, and for a different reason: the hunter aims AT the
    // monkey, and a monkey dragged below the muzzle has to be aimed down at.
    theta: { min: -20, max: 85 },
    ending: {
      kind: 'monkey',
      close: 'See the diagram',
      caught: { title: 'Caught.' },
      high:   { title: 'It passed above the monkey.' },
      low:    { title: 'It passed below the monkey.' },
      short:  { title: 'The monkey reached the ground first.' },
      why: {
        aimed: ['Aimed straight at it, it cannot miss',
          'Not because the banana was quick, and not because the numbers were kind. In the time it takes to cover the horizontal gap, both have fallen the same amount below where they would have been without gravity — and that amount is the same for both because it does not depend on what either of them weighs or how fast either was going. So it cancels, and the aim that would have been right with no gravity is still right with it. Move the speed slider: the answer does not change.'],
        slow: ['Too slow — and this is the only real failure there is',
          'The aim was never wrong. The banana simply ran out of flight before it covered the gap, and the monkey was on the ground by the time it arrived. Nothing here contradicts the rule; the demonstration just needs both of them to still be in the air when they meet. Throw harder, or drag the monkey closer or higher.'],
        fast: ['Too fast to see anything',
          'It connected, and the rule held perfectly — but the banana arrived so quickly that neither object had time to fall anything worth looking at. The whole demonstration is about a distance they share, and at this speed that distance is a few millimetres. The picture stops showing it long before the physics stops working. Slow the throw down.'],
        nog: ['No gravity, and it still hits',
          'Nothing falls, so the banana travels in a dead straight line — and it still arrives exactly where the monkey is, because the aim pointed straight at it and neither of them moved off that line. This is worth sitting with: the result does not depend on the value of g at all. It works at 9.81, it works on the Moon, and it works at zero.'],
      },
      caveat: 'The idealised A-level model, as everywhere else on this site: no air resistance, no wind, a point mass, flat ground and uniform g. The banana and the monkey are drawn at a size you can see rather than at the size they are.',
    },
    second: {
      label: 'the monkey',
      /** It drops from where it hung — no throw, no angle, just gravity. */
      from(p, markers) {
        const t = markers?.target;
        if (!t || !(t.y > 0.2)) return null;
        return { u: 0, theta: -90, h: t.y, x0: t.x };
      },
    } },

  /* ── along a straight road ────────────────────────────────────────────
     The one scenario with no gravity in it. A lorry passing two points on a
     level road is the five equations with nothing added — the acceleration
     is its own, given or found like any other of the five, and braking is a
     negative one. Solved by js/core/road.js, drawn by js/render/road.js.
     `params` is for the card's sketch only; nothing on the screen is
     pre-filled. */
  { id: 'road', group: 'line', name: 'Along a straight road',
    sub: 'speeding up, or braking',
    note: 'A vehicle passes A, and some time later passes B. Its acceleration is its own, so a is one of the five like the rest — and the area under the velocity\u2013time line is the distance AB.',
    params: { u: 14, theta: 0, h: 0, g: 0, a: 2, s: 240, v: 34, t: 10 },
    road: true, stage: 'road',
    place: 'A straight, level road from A to B' },
];

/** Scenarios assembled from a recipe (js/compose/registry.js), by id, for this visit. */
export const COMPOSED = new Map();
export const byId = (id) => SCENARIOS.find((s) => s.id === id) || COMPOSED.get(id);
export const DEFAULT_SCENARIO = 'platform-angle';

/** Only three fields, as asked: Earth, the Moon, and none at all. */
export const GRAVITY = [
  { label: 'Earth', g: 9.81 },
  { label: 'Moon',  g: 1.62 },
  { label: 'None',  g: 0 },
];
