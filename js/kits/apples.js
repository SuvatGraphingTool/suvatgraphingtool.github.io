// kits/apples.js — two apples falling from one tree, wired for the app. The
// engine is js/core/apples.js and the stage js/render/apples.js; this file
// says which boxes to show, reads them, and lays out what the engine answered
// (rule 4). See design/components.md.

import { solveApples, applesWorking } from '../core/apples.js';
import * as stage from '../render/apples.js';
import { T, M, num } from '../notation.js';

const tr = (x) => num(x, 3, { trim: true });

export const apples = {
  id: 'apples',
  verb: 'Let them fall',
  voice: {
    h: 'Two apples, one tree',
    sub: 'Two apples hang at rest from different branches and start to fall at the same instant. Give when each hits the ground — or how high it hangs — and the engine finds how far apart they hung.',
  },
  fields: [
    { key: 'A.t', col: 'A', label: 'Time to the ground (s)', placeholder: '—', hint: 'The first apple.' },
    { key: 'A.h', col: 'A', label: 'Or its height (m)', placeholder: '—', hint: 'Above the ground.' },
    { key: 'B.t', col: 'B', label: 'Time to the ground (s)', placeholder: '—', hint: 'The second apple.' },
    { key: 'B.h', col: 'B', label: 'Or its height (m)', placeholder: '—', hint: 'Above the ground.' },
    { key: 'later', col: 'B', label: 'Or: lands this much after the first (s)', placeholder: '—', hint: '“0.1 seconds later”.' },
  ],
  cols: { A: 'The first apple', B: 'The second apple' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['apex', 'ruler', 'range', 'grid', 'components'], extras: ['energy'], bounce: true },

  read(v) {
    return { A: { t: v['A.t'], h: v['A.h'] }, B: { t: v['B.t'], h: v['B.h'] }, later: v.later, g: v.g };
  },
  solve: solveApples,
  working: (solved) => applesWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'First apple, height', v: num(f.posA(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Second apple, height', v: num(f.posB(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Between them', v: num(f.gap(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocities, up positive', v: `${num(f.velA(t), 2)}, ${num(f.velB(t), 2)}`, unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Both apples on each graph: the first in the quantity's hue, the second in
     stone; everything vertical, so every line solid (rule 2). */
  graphs(f, t, P) {
    const two = (fa, fb, c) => [
      { label: 'first', tag: T`1`, fn: fa, color: c, dash: null },
      { label: 'second', tag: T`2`, fn: fb, color: P.second, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Height–time', unit: 'm', tMax: f.tMax, t,
        points: [{ t: f.A.t, y: 0, color: P.mark }, { t: f.B.t, y: 0, color: P.mark }],
        series: two(f.posA, f.posB, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time, up positive', unit: 'm s⁻¹', tMax: f.tMax, t, series: two(f.velA, f.velB, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time, up positive', unit: 'm s⁻²', tMax: f.tMax, t,
        series: two(f.accA, f.accB, P.acc) },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="54" width="120" height="6" fill="#7c9a63" opacity="0.7"/>
      <rect x="57" y="30" width="6" height="24" fill="#6b4f3b"/>
      <circle cx="60" cy="20" r="18" fill="#5d7a3d"/>
      <circle cx="50" cy="30" r="3.5" fill="#c62d2c"/><circle cx="70" cy="22" r="3.5" fill="#c62d2c"/>
      <path d="M50 34 V50 M70 26 V50" stroke="var(--disp)" stroke-width="1.5" stroke-dasharray="3 3"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Both on the ground',
      title: `They hung ${tr(s.dCm)} cm apart.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
