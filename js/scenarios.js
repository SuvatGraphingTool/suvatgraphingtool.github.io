// scenarios.js — the situations the playground can set up.
//
// Two of them happen somewhere other than the stadium and say so with
// `backdrop`; see js/render/backdrops.js.
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
    params: { u: 25, theta: 45, h: 0, g: 9.81 } },

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
    params: { u: 25, theta: -30, h: 25, g: 9.81 } },

  { id: 'platform', group: 'platform', name: 'Off a platform',
    sub: 'thrown flat',
    note: 'Falls in the same time as if dropped — try it against Dropped.',
    params: { u: 20, theta: 0, h: 25, g: 9.81 }, lockAngle: true },

  { id: 'platform-angle', group: 'platform', name: 'Up and off a platform',
    sub: 'thrown up, at an angle',
    note: 'Thrown up, lands lower, so the two halves differ. The commonest exam setup.',
    params: { u: 28, theta: 45, h: 25, g: 9.81 } },

  /* ── interesting ones ─────────────────────────────────────────────── */
  { id: 'time-above', group: 'look', name: 'Time above a line',
    sub: 'how long is it up there?',
    note: 'It crosses the line twice. The gap between those times is the answer. Drag the line.',
    params: { u: 24, theta: 40, h: 0.9, g: 9.81 },
    markers: { heightLine: 6 }, dragLine: true },

  /* ── the two that are not at the stadium ──────────────────────────── */
  { id: 'bullet', group: 'look', name: 'Dropping vs Firing a Bullet',
    sub: 'which lands first?',
    note: 'Two identical rounds leave the bench at the same instant: one fired flat, one simply released. Vertically they are the same problem — neither starts with any upward speed, and both are pulled down at the same rate — because firing adds velocity sideways only, and the two components are independent. The horizontal push buys no hang time at all, at any muzzle speed.',
    params: { u: 360, theta: 0, h: 1.5, g: 9.81 }, lockAngle: true,
    exhibit: true, backdrop: 'warehouse', site: FLAT_SITE, secondSprite: true,
    card: 'range',
    place: 'An indoor range, lit by a strobe',
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
    note: 'The hunter aims directly AT the monkey; the monkey drops the instant the shot leaves. In the time the banana takes to cover the horizontal gap, both have fallen the same ½gt² below where they would have been without gravity — so the aim that would have been right without gravity is still right with it. Drag the monkey anywhere: it only fails if the monkey reaches the sand first.',
    params: { u: 22, theta: 0, h: 1.5, g: 9.81 },
    exhibit: true, backdrop: 'beach', site: FLAT_SITE, secondSprite: true,
    card: 'dusk',
    place: 'A beach at dusk',
    pairLabel: 'same fall',
    caughtLabel: 'caught — every time',
    seed: { u: 22, h: 1.5, g: 9.81 },
    markers: { target: { x: 12, y: 9 } }, dragTarget: true, aimAtTarget: true,
    intro: {
      title: 'How hard do you throw?',
      body: 'Speed decides whether the banana arrives before the monkey lands. It does not decide whether the aim is right — aimed straight at the monkey, every one of these connects.',
      field: 'u', unit: 'm s⁻¹',
      models: [
        { name: 'Lob', u: 13, note: 'only just gets there' },
        { name: 'Throw', u: 22, note: 'comfortable' },
        { name: 'Hurl', u: 38, note: 'barely time to fall' },
      ],
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
];

export const byId = (id) => SCENARIOS.find((s) => s.id === id);
export const DEFAULT_SCENARIO = 'platform-angle';

/** Only three fields, as asked: Earth, the Moon, and none at all. */
export const GRAVITY = [
  { label: 'Earth', g: 9.81 },
  { label: 'Moon',  g: 1.62 },
  { label: 'None',  g: 0 },
];
