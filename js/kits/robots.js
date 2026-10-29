// kits/robots.js — two robots on a square floor at constant velocities: when
// are they closest? Wired for the app. Engine js/core/robots.js (the
// two-in-a-plane engine, and the closest approach), stage js/render/robots.js;
// this file says which boxes to show, reads them, and lays out what the engine
// answered (rule 4).

import { solveRobots, robotsWorking } from '../core/robots.js';
import { vsrc } from '../core/plane.js';
import * as stage from '../render/robots.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const two = (key, col, what, unit, hint) => [
  { key: `${key}.x`, col, label: `${M`vec i`} part of ${what} (${unit})`, aria: `${col}: the i part of ${what} (${unit})`, placeholder: '—', hint },
  { key: `${key}.y`, col, label: `${M`vec j`} part of ${what} (${unit})`, aria: `${col}: the j part of ${what} (${unit})`, placeholder: '—', hint: '' },
];

export const robots = {
  id: 'robots',
  verb: 'Start them',
  voice: {
    h: 'Two robots on a floor: when are they closest?',
    sub: `A square floor with centre O, ${M`vec i`} along AB and ${M`vec j`} along AD. Two robots cross it, each at a constant velocity — R’s may come from where it is at two times. `
      + 'A part left blank is 0.',
  },
  fields: [
    ...two('R.r0', 'R', 'where R starts', 'm', 'At t = 0, from O.'),
    ...two('R.v', 'R', 'R’s velocity', 'm s⁻¹', 'Or leave both blank and give a later position below; blank with no later position is at rest.'),
    ...two('S.r0', 'S', 'where S starts', 'm', 'A corner is half the side each way.'),
    ...two('S.v', 'S', 'S’s velocity', 'm s⁻¹', ''),
  ],
  cols: { R: 'Robot R', S: 'Robot S' },
  rows: [
    { title: 'Or R’s velocity from where it is later', fields: [
      ...two('R.r1', 'Later', 'where R is later', 'm', ''),
      { key: 'R.t1', label: 'At time (s)', aria: 'Later: the time R is there (s)', placeholder: '—', hint: '' },
    ] },
    { title: 'The floor', fields: [
      { key: 'side', label: 'Side of the square (m)', aria: 'The floor: the side of the square (m)', placeholder: '50', hint: 'Centred on O. Blank is 50.' },
    ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration'], extras: ['energy'], bounce: true },

  read(v) {
    const vv = (key) => (v[`${key}.x`] != null || v[`${key}.y`] != null ? { x: v[`${key}.x`] ?? 0, y: v[`${key}.y`] ?? 0 } : undefined);
    const R = { r0: vv('R.r0') || { x: 0, y: 0 } };
    if (vv('R.v')) R.v = vv('R.v');
    if (vv('R.r1') || v['R.t1'] != null) { R.r1 = vv('R.r1'); R.t1 = v['R.t1']; }
    // nothing given for its motion: at rest, as a blank part is 0
    if (!R.v && !R.r1 && R.t1 == null) R.v = { x: 0, y: 0 };
    return { R, S: { r0: vv('S.r0') || { x: 0, y: 0 }, v: vv('S.v') || { x: 0, y: 0 } }, side: v.side };
  },
  solve: solveRobots,
  working: (solved) => robotsWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'R at', v: T`${vsrc(f.posA(t), 2)}`, unit: 'm', hue: 'disp' },
        { k: 'S at', v: T`${vsrc(f.posB(t), 2)}`, unit: 'm', hue: 'disp' },
        { k: 'Apart', v: num(f.gap(t), 2), unit: 'm', hue: 'disp' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* i parts dashed, j parts solid (rule 2); R in its hue, S in stone. */
  graphs(f, t, P) {
    const two = (fn, c, who) => [
      { label: `${who} i`, tag: T`${who}, vec(i)`, fn: (tt) => fn(tt).x, color: c, dash: [6, 4] },
      { label: `${who} j`, tag: T`${who}, vec(j)`, fn: (tt) => fn(tt).y, color: c, dash: null },
    ];
    const v = (p) => () => p.v;
    return [
      { canvas: 'g-s', title: 'Position–time', unit: 'm', tMax: f.tMax, t, series: [...two(f.posB, P.second, 'S'), ...two(f.posA, P.disp, 'R')] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [...two(v(f.B), P.second, 'S'), ...two(v(f.A), P.vel, 'R')] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'both', tag: 'R, S', fn: () => 0, color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="32" y="4" width="52" height="52" fill="#c8bfae" opacity="0.35" stroke="var(--strong)"/>
      <line x1="44" y1="44" x2="70" y2="12" stroke="var(--vel)" stroke-width="2.2"/><line x1="82" y1="6" x2="52" y2="36" stroke="var(--second)" stroke-width="2.2"/>
    </svg>`;
  },

  ending(s) {
    return { eyebrow: 'Two robots, constant velocities',
      title: s.same ? `Always ${tr(s.dmin)} m apart.`
        : s.offFloor.length ? `On this floor never that close: ${s.offFloor[0].n} reaches the edge at t = ${tr(s.offFloor[0].t)} s.`
          : `Closest at t = ${tr(s.tc)} s, ${tr(s.dmin)} m apart.`,
      body: s.notes.map((x) => `<p>${x}</p>`).join(''), real: true };
  },
};
