// kits/snapshots.js — a particle moving in a plane with a constant
// acceleration, known from two moments, perhaps changing its acceleration at
// the second; wired for the app. Engine js/core/snapshots.js, stage
// js/render/snapshots.js; this file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4).

import { solveSnapshots, snapshotsWorking } from '../core/snapshots.js';
import { COMPASS, vsrc } from '../core/plane.js';
import * as stage from '../render/snapshots.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const two = (key, col, what, unit, hint) => [
  { key: `${key}.x`, col, label: `${M`vec i`} part of ${what} (${unit})`, aria: `${col}: the i part of ${what} (${unit})`, placeholder: '—', hint },
  { key: `${key}.y`, col, label: `${M`vec j`} part of ${what} (${unit})`, aria: `${col}: the j part of ${what} (${unit})`, placeholder: '—', hint: '' },
];
const compass = [{ v: '', label: '—' }, ...Object.entries(COMPASS).map(([v, c]) => ({ v, label: c.word.replace(/^./, (x) => x.toUpperCase()) }))];

export const snapshots = {
  id: 'snapshots',
  verb: 'Set it off',
  voice: {
    h: 'Known from two moments',
    sub: `A particle in a plane with a constant acceleration, ${M`vec i`} east and ${M`vec j`} north — known from two moments: its velocity at two times, or where it starts and where it is later. `
      + 'Its acceleration may change at the second moment. Leave the acceleration blank to have it found.',
  },
  fields: [
    ...two('r0', 'First', 'where it is at t = 0', 'm', 'Blank is the origin.'),
    ...two('u', 'First', 'its velocity', 'm s⁻¹', 'At the time below; blank time is t = 0. A part left blank is 0.'),
    { key: 'tu', col: 'First', label: 'That velocity is at time (s)', placeholder: '0', hint: 'For a velocity known at t = 1, say.' },
    ...two('a', 'First', 'its acceleration', 'm s⁻²', 'Both blank to find it from the second moment; one blank part is 0.'),
  ],
  cols: { First: 'The first moment' },
  rows: [
    { title: 'The second moment', fields: [
      { key: 'k2', type: 'choice', label: 'Known then', default: 'r', hint: '', options: [{ v: 'r', label: 'Where it is' }, { v: 'v', label: 'Its velocity' }] },
      { key: 't2', label: 'At time (s)', aria: 'The second moment: the time (s)', placeholder: '—', hint: '' },
      { key: 'p2.x', label: `${M`vec i`} part`, aria: 'The second moment: the i part', placeholder: '—', hint: 'Of the position (m) or the velocity (m s⁻¹). A part left blank is 0.' },
      { key: 'p2.y', label: `${M`vec j`} part`, aria: 'The second moment: the j part', placeholder: '—', hint: '' },
    ] },
    { title: 'From the second moment, a new acceleration', fields: [
      { key: 'a2.x', label: `${M`vec i`} part (m s⁻²)`, aria: 'The new acceleration: the i part (m s⁻²)', placeholder: '—', hint: 'Both blank: it keeps the first. One blank part is 0.' },
      { key: 'a2.y', label: `${M`vec j`} part (m s⁻²)`, aria: 'The new acceleration: the j part (m s⁻²)', placeholder: '—', hint: '' },
    ] },
    { title: 'What the paper asks', fields: [
      { key: 'askT', label: 'Velocity, speed and position at time (s)', aria: 'What the paper asks: the velocity, speed and position at this time (s)', placeholder: '—', hint: '' },
      { key: 'dir', type: 'choice', label: 'When is it moving', default: '', hint: 'After the change, if there is one.', options: compass },
    ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(v) {
    const vv = (key) => ({ x: v[`${key}.x`], y: v[`${key}.y`] });
    return { r0: vv('r0'), u: vv('u'), tu: v.tu, a: vv('a'), at2: { kind: v.k2 || 'r', t: v.t2, v: vv('p2') }, a2: vv('a2'), ask: { t: v.askT, dir: v.dir || null } };
  },
  solve: solveSnapshots,
  working: (solved) => snapshotsWorking(solved),
  render: stage.render,

  hud(f, t) {
    const r = f.pos(t), v = f.vel(t);
    return {
      left: [
        { k: 'Position', v: T`${vsrc(r, 2)}`, unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: T`${vsrc(v, 2)}`, unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Speed', v: num(Math.hypot(v.x, v.y), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* i parts dashed, j parts solid (rule 2); the acceleration breaks at the change. */
  graphs(f, t, P) {
    const pair = (fn, c, breaks) => [
      { label: 'i part', tag: T`vec(i)`, fn: (tt) => fn(tt).x, color: c, dash: [6, 4], breaks },
      { label: 'j part', tag: T`vec(j)`, fn: (tt) => fn(tt).y, color: c, dash: null, breaks },
    ];
    const cut = f.switched ? [f.T] : undefined;
    const rings = f.marks.flatMap((m) => [{ t: m.t, y: f.pos(m.t).x, color: P.mark }, { t: m.t, y: f.pos(m.t).y, color: P.mark }]);
    return [
      { canvas: 'g-s', title: 'Position–time', unit: 'm', tMax: f.tMax, t, points: rings, series: pair(f.pos, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: pair(f.vel, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: pair(f.acc, P.acc, cut) },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <path d="M12 50 Q40 52 56 30 Q70 8 108 12" fill="none" stroke="var(--disp)" stroke-width="2.2"/>
      <circle cx="56" cy="30" r="4" fill="none" stroke="var(--ink)" stroke-width="1.6"/>
    </svg>`;
  },

  ending(s) {
    const title = s.tDir != null ? `Moving ${s.dirWord} at t = ${tr(s.tDir)} s.`
      : s.dirAsked ? `Never moving ${s.dirAsked}.`
        : s.askT != null ? `At t = ${tr(s.askT)} s its speed is ${tr(s.askSpeed)} m s⁻¹.`
          : s.found === 'u' ? `Starting velocity ${T`${vsrc(s.u)}`} m s⁻¹.`
            : `Acceleration ${T`${vsrc(s.a)}`} m s⁻², of size ${tr(Math.hypot(s.a.x, s.a.y))} m s⁻².`;
    return { eyebrow: 'Known from two moments', title, body: s.notes.map((x) => `<p>${x}</p>`).join(''), real: true };
  },
};
