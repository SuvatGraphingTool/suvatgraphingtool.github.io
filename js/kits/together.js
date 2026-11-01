// kits/together.js — two stones from one height that land together, wired for
// the app. The engine is js/core/together.js and the stage
// js/render/together.js; this file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4). See design/components.md.

import { solveTogether, togetherWorking } from '../core/together.js';
import * as stage from '../render/together.js';
import { T, num } from '../notation.js';

const tr = (x) => num(x, 3, { trim: true });

export const together = {
  id: 'together',
  verb: 'Let them go',
  voice: {
    h: 'Land together',
    sub: 'Two stones from the same height: the first let go from rest, the second thrown straight down a moment later, and they hit the ground at the same instant. Give the delay and the second’s speed — or the height — and the engine finds the rest.',
  },
  fields: [
    { key: 'd', col: 'two', label: 'The second goes this much later (s)', placeholder: '—', hint: '“Exactly one second later”.' },
    { key: 'U', col: 'two', label: 'Thrown straight down at (m s⁻¹)', placeholder: '—', hint: 'The second stone. Finds the height.' },
    { key: 'h', col: 'two', label: 'Or the height they start from (m)', placeholder: '—', hint: 'Finds how fast the second must be thrown.' },
  ],
  cols: { two: 'The two stones' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['apex', 'ruler', 'range', 'grid', 'components'], extras: ['energy'], bounce: true },

  read(v) { return { d: v.d, U: v.U, h: v.h, g: v.g }; },
  solve: solveTogether,
  working: (solved) => togetherWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'First stone, height', v: num(f.posA(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Second stone, height', v: num(f.posB(t), 2), unit: 'm', hue: 'disp' },
        { k: 'First, velocity (up +)', v: num(f.velA(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Second, velocity (up +)', v: num(f.velB(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Both stones on each graph, all vertical, so every line solid (rule 2). */
  graphs(f, t, P) {
    const two = (fa, fb, c) => [
      { label: 'first', tag: T`1`, fn: fa, color: c, dash: null },
      { label: 'second', tag: T`2`, fn: fb, color: P.second, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Height–time', unit: 'm', tMax: f.tMax, t, points: [{ t: f.T, y: 0, color: P.mark }], series: two(f.posA, f.posB, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time, up positive', unit: 'm s⁻¹', tMax: f.tMax, t, series: two(f.velA, f.velB, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time, up positive', unit: 'm s⁻²', tMax: f.tMax, t, series: two(f.accA, f.accB, P.acc) },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="54" width="120" height="6" fill="#7c9a63" opacity="0.7"/>
      <rect x="30" y="10" width="22" height="44" fill="#a59a90"/><rect x="30" y="6" width="5" height="5" fill="#a59a90"/><rect x="40" y="6" width="5" height="5" fill="#a59a90"/>
      <circle cx="60" cy="30" r="3" fill="#fff"/><circle cx="70" cy="14" r="3" fill="#fff"/>
      <path d="M60 33 V50 M70 17 V50" stroke="var(--vel)" stroke-width="1.5"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Both on the ground at once',
      title: s.given === 'U' ? `They started ${tr(s.h)} m up.` : `Thrown down at ${tr(s.U)} m s⁻¹.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
