// kits/collide.js — two particles on a horizontal surface, each with its own
// constant acceleration in i and j: do they collide? Wired for the app.
// Engine js/core/collide.js, stage js/render/collide.js; this file says which
// boxes to show, reads them, and lays out what the engine answered (rule 4).

import { solveCollide, collideWorking } from '../core/collide.js';
import { vsrc } from '../core/plane.js';
import * as stage from '../render/collide.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const part = (n, key, c, what, unit, hint) => ({ key: `${n}.${key}.${c === 'i' ? 'x' : 'y'}`, col: n, label: `${M`vec ${c}`} part of ${what} (${unit})`,
  aria: `${n}: the ${c} part of ${what} (${unit})`, placeholder: '—', hint });
const one = (n) => [
  part(n, 'r0', 'i', 'its start', 'm', 'Where it is at t = 0. Blank is 0.'), part(n, 'r0', 'j', 'its start', 'm', ''),
  part(n, 'u', 'i', 'its velocity', 'm s⁻¹', 'At t = 0.'), part(n, 'u', 'j', 'its velocity', 'm s⁻¹', ''),
  part(n, 'a', 'i', 'its acceleration', 'm s⁻²', 'Constant. A minus sign matters.'), part(n, 'a', 'j', 'its acceleration', 'm s⁻²', ''),
];

export const collide = {
  id: 'collide',
  verb: 'Set them off',
  voice: {
    h: 'Two on a surface: do they collide?',
    sub: `Two particles on a horizontal surface, each with its own constant acceleration, all in ${M`vec i`} and ${M`vec j`}. `
      + 'Give where each starts, its velocity and its acceleration; a part left blank is 0. They collide only if both parts are equal at the same moment.',
  },
  fields: [...one('A'), ...one('B')],
  cols: { A: 'Particle A', B: 'Particle B' },
  rows: [
    { title: 'What the paper asks', fields: [
      { key: 'at', label: 'Where is each at this time? (s)', aria: 'What the paper asks: where is each at this time (s)', placeholder: '—', hint: 'Blank to skip.' },
    ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration'], extras: ['energy'], bounce: true },

  read(vals) {
    const v = (n, key) => ({ x: vals[`${n}.${key}.x`], y: vals[`${n}.${key}.y`] });
    const p = (n) => ({ r0: v(n, 'r0'), u: v(n, 'u'), a: v(n, 'a') });
    return { A: p('A'), B: p('B'), at: vals.at };
  },
  solve: solveCollide,
  working: (solved) => collideWorking(solved),
  render: stage.render,

  hud(f, t) {
    const a = f.posA(t), b = f.posB(t);
    return {
      left: [
        { k: 'A at', v: T`${vsrc(a, 2)}`, unit: 'm', hue: 'disp' },
        { k: 'B at', v: T`${vsrc(b, 2)}`, unit: 'm', hue: 'disp' },
        { k: 'Apart', v: num(Math.hypot(a.x - b.x, a.y - b.y), 2), unit: 'm', hue: 'disp' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* i parts dashed, j parts solid (rule 2); A in its hue, B in stone. The
     collision is ringed on both parts of the position graph. */
  graphs(f, t, P) {
    const two = (fn, c, who) => [
      { label: `${who} i`, tag: T`${who}, vec(i)`, fn: (tt) => fn(tt).x, color: c, dash: [6, 4] },
      { label: `${who} j`, tag: T`${who}, vec(j)`, fn: (tt) => fn(tt).y, color: c, dash: null },
    ];
    const rings = f.tc != null ? [{ t: f.tc, y: f.where.x, color: P.mark }, { t: f.tc, y: f.where.y, color: P.mark }] : [];
    const accel = (p) => () => p.a;
    return [
      { canvas: 'g-s', title: 'Position–time', unit: 'm', tMax: f.tMax, t, points: rings, series: [...two(f.posB, P.second, 'B'), ...two(f.posA, P.disp, 'A')] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [...two(f.velB, P.second, 'B'), ...two(f.velA, P.vel, 'A')] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [...two(accel(f.B), P.second, 'B'), ...two(accel(f.A), P.acc, 'A')] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <path d="M10 52 Q50 10 80 22" fill="none" stroke="var(--vel)" stroke-width="2.2"/>
      <path d="M100 54 Q90 40 80 22" fill="none" stroke="var(--second)" stroke-width="2.2"/>
      <circle cx="80" cy="22" r="6" fill="none" stroke="var(--mark)" stroke-width="2"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Two particles, constant accelerations',
      title: s.tc != null ? `They collide at t = ${tr(s.tc)} s, ${Math.hypot(s.where.x, s.where.y) < 1e-12 ? 'at the origin' : `at ${T`(${vsrc(s.where)})`} m`}.` : 'They never collide.',
      body: s.notes.map((x) => `<p>${x}</p>`).join(''),
      real: true,
    };
  },
};
