// kits/course.js — a ship that changes course, wired for the app. The engine
// is js/core/course.js (two legs at constant velocities, on one clock, against
// a rock) and the stage js/render/course.js (the sea from above: the coast
// with its radar station, the submerged rock and its danger buoy, the ship).
// This file says which boxes to show, reads them, and lays out what the
// engine answered (rule 4).

import { solveCourse, courseWorking, clockText } from '../core/course.js';
import { COMPASS, vsrc } from '../core/plane.js';
import * as stage from '../render/course.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? 3, { trim: true });
const ij = (key, col, c, what, hint) => ({ key, col, label: `${what}: its ${M`vec ${c}`} part`, aria: `${what}: its ${c} part`, placeholder: '—', hint });
const compass = Object.entries(COMPASS).map(([v, c]) => ({ v, label: c.word.replace(/^./, (x) => x.toUpperCase()) }));

const FIELDS = [
  { key: 't0', col: 'first', label: 'The time it starts, as the paper writes it', placeholder: '—', hint: '1200 for noon. Blank: times are hours from t = 0.' },
  ij('r0.x', 'first', 'i', 'Where it is then', 'East of O is positive.'), ij('r0.y', 'first', 'j', 'Where it is then', 'Blank is 0.'),
  ij('v1.x', 'first', 'i', 'Its velocity', 'East is positive.'), ij('v1.y', 'first', 'j', 'Its velocity', 'North is positive.'),
  { key: 'tHit', col: 'rock', label: 'It would reach the rock at', placeholder: '—', hint: 'If it held its course: this fixes where the rock is.' },
  ij('R.x', 'rock', 'i', 'Or where the rock is', 'Leave the time above blank.'), ij('R.y', 'rock', 'j', 'Or where the rock is', ''),
  { key: 'tc', col: 'turn', label: 'It changes course at', placeholder: '—', hint: 'On the same clock: 1400.' },
  ij('v2.x', 'turn', 'i', 'Its new velocity', 'Or a speed and a direction, below.'), ij('v2.y', 'turn', 'j', 'Its new velocity', ''),
  { key: 'sp2', col: 'turn', label: 'Or its new speed', placeholder: '—', hint: '“Due north at 5 km h⁻¹”: 5 here …' },
  { key: 'dir2', col: 'turn', type: 'choice', label: '… due', hint: '… and north here.', options: compass },
];

export const course = {
  id: 'course',
  verb: 'Sail',
  voice: {
    h: 'Where is it heading, and when does it turn?',
    sub: `A ship at a constant velocity, ${M`vec i`} east and ${M`vec j`} north, on course for a rock. Give where it is when the clock starts and its velocity; `
      + 'where the rock is (or when it would reach it); when it changes course, and its new velocity. Then ask when it is due some direction of the rock, and how far from it at a time.',
  },
  fields: FIELDS,
  cols: { first: 'Its first course', rock: 'The rock', turn: 'The change of course' },
  rows: [
    { title: 'Units', fields: [
      { key: 'units', type: 'choice', label: 'Units', default: 'km', hint: '', options: [{ v: 'km', label: 'km and hours' }, { v: 'm', label: 'metres and seconds' }] },
    ] },
    { title: 'What the paper asks', fields: [
      { key: 'due', type: 'choice', label: 'When is the ship due …', hint: '… of the rock.', options: compass },
      { key: 'T', label: 'Where is it, and how far from the rock, at', aria: 'A time: where is it then, and how far from the rock', placeholder: '—', hint: 'On the same clock: 1600.' },
    ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration', 'ticks'], extras: ['energy'], bounce: true },

  resolveAxis: 'ij',
  resolveBearing: true,   // i east, j north
  resolveUnits: (f) => [f.U.len, f.U.speedText, '', f.U.time],
  read(v) {
    const pair = (p) => ({ x: v[`${p}.x`], y: v[`${p}.y`] });
    return { units: v.units || 'km', t0: v.t0, r0: pair('r0'), v1: pair('v1'), tHit: v.tHit, R: pair('R'),
      tc: v.tc, v2: pair('v2'), sp2: v.sp2, dir2: v.dir2 || null, due: v.due || null, T: v.T };
  },
  solve: solveCourse,
  working: (s) => courseWorking(s),
  render: stage.render,

  hud(f, t) {
    const p = f.pos(t), v = f.vel(t), sp = Math.hypot(v.x, v.y), U = f.U;
    const br = sp > 1e-9 ? String(Math.round(((Math.atan2(v.x, v.y) * 180) / Math.PI + 360) % 360) % 360).padStart(3, '0') : '—';
    const left = [
      { k: 'East of O', v: num(p.x, 2), unit: U.len, hue: 'disp' },
      { k: 'North of O', v: num(p.y, 2), unit: U.len, hue: 'disp' },
      ...(f.R ? [{ k: 'From the rock', v: num(f.dist(t), 2), unit: U.len, hue: 'disp' }] : []),
      { k: 'Speed', v: num(sp, 2), unit: U.speedText, hue: 'vel' },
      { k: 'Bearing', v: br, unit: '°', hue: 'vel' },
    ];
    // three on a phone, where the sea needs the room: where it is, east and north, is on the Resolve card
    const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches;
    return { left: phone ? left.slice(-3) : left, right: [f.clocked ? { k: 'Clock', v: clockText(f.clock(t)), unit: '' } : { k: 'Time', v: num(t, 2), unit: U.time }] };
  },

  /* East dashed (horizontal), north solid (vertical): rule 2. The velocity
     jumps at the turn; between the turns it is constant, and so a = 0. */
  graphs(f, t, P) {
    const U = f.U, two = (fn, c) => [
      { label: 'east', tag: T`x`, fn: (tt) => fn(tt).x, color: c, dash: [6, 4] },
      { label: 'north', tag: T`y`, fn: (tt) => fn(tt).y, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Position–time', unit: U.len, tMax: f.tMax, t, series: two(f.pos, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: U.speedText, tMax: f.tMax, t, series: two(f.vel, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: U.len === 'km' ? 'km h⁻²' : 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'on each course', tag: 'each course', fn: () => 0, color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#6f98a6"/>
      <path d="M0 0 H40 Q30 10 22 8 Q12 14 0 12 Z" fill="#b9ad8f"/>
      <circle cx="40" cy="14" r="9" fill="#9fd0cf" opacity="0.6"/><circle cx="40" cy="14" r="3.5" fill="#3d4a4c"/>
      <path d="M96 52 L66 28" stroke="var(--disp)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M66 28 L48 21" stroke="var(--disp)" stroke-width="1.2" stroke-dasharray="1 4" stroke-linecap="round" opacity="0.7"/>
      <path d="M66 28 L66 8" stroke="var(--disp)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M62 14 L66 6 L70 14 Z" fill="#20242b"/>
    </svg>`;
  },

  ending(s) {
    const a = s.answers, at = (x) => (x.hhmm != null ? `at ${clockText(x.hhmm)}${x.day}` : `at ${T`t = ${tr(x.t)} [${s.U.time}]`}`);
    return {
      eyebrow: s.tc != null ? 'A change of course' : 'On course',
      title: a.due ? `Due ${a.due.word} of the rock ${at(a.due)}.`
        : a.at?.dist != null ? `${T`${tr(a.at.dist)} [${s.U.len}]`} from the rock.` : s.R ? `The rock is at ${vsrc(s.R) === '0' ? 'O' : T`${vsrc(s.R)}`}.` : 'Its course, from O.',
      body: s.notes.map((x) => `<p>${x}</p>`).join(''),
      real: true,
    };
  },
};
