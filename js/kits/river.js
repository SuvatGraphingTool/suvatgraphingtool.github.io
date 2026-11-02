// kits/river.js — a boat crossing a river against the current, wired for the
// app. The engine is js/core/river.js and the stage js/render/river.js (the
// river from above, the velocity triangle beside it). See design/components.md.

import { solveRiver, riverWorking } from '../core/river.js';
import * as stage from '../render/river.js';
import { T, num } from '../notation.js';

const tr = (x) => num(x, 3, { trim: true });

export const river = {
  id: 'river',
  verb: 'Cross',
  voice: {
    h: 'Across the river',
    sub: 'A boat crosses a river while the water flows along the banks. Give the width and the current; then the time to cross straight over, or the boat’s speed — and a heading, to see where it lands.',
  },
  fields: [
    { key: 'd', col: 'river', label: 'Width of the river (m)', placeholder: '—', hint: '' },
    { key: 'w', col: 'river', label: 'The water flows at (m s⁻¹)', placeholder: '—', hint: 'Along the banks.' },
    { key: 'T', col: 'boat', label: 'Straight across in (s)', placeholder: '—', hint: 'To the point directly opposite.' },
    { key: 'V', col: 'boat', label: 'Or its speed through the water (m s⁻¹)', placeholder: '—', hint: '' },
    { key: 'alpha', col: 'boat', label: 'Heading to the bank, from upstream (°)', placeholder: '—', hint: 'Blank: whatever takes it straight across.' },
  ],
  cols: { river: 'The river', boat: 'The boat' },
  rows: [],
  hides: { shows: ['apex', 'ruler', 'range', 'grid', 'components'], extras: ['energy'], bounce: true },

  resolveAxis: 'bank',
  resolveFrom: 'A',
  read(v) { return { d: v.d, w: v.w, T: v.T, V: v.V, alpha: v.alpha }; },
  solve: solveRiver,
  working: (solved) => riverWorking(solved),
  render: stage.render,

  hud(f, t) {
    const p = f.pos(t);
    return {
      left: [
        { k: 'Across, from A', v: num(p.y, 2), unit: 'm', hue: 'disp' },
        { k: 'Along, downstream', v: num(p.x, 2), unit: 'm', hue: 'disp' },
        { k: 'Speed over the ground', v: num(f.R, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Heading, from upstream', v: num(f.alpha, 1), unit: '°', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Along dashed, across solid (rule 2). */
  graphs(f, t, P) {
    const two = (fx, fy, c) => [
      { label: 'along', tag: T`x`, fn: fx, color: c, dash: [6, 4] },
      { label: 'across', tag: T`y`, fn: fy, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: two((tt) => f.pos(tt).x, (tt) => f.pos(tt).y, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: two(() => f.vx, () => f.vy, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: two(() => 0, () => 0, P.acc) },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#7f9a5e"/><rect x="0" y="12" width="120" height="36" fill="#4f93bd"/>
      <path d="M60 44 V16" stroke="var(--disp)" stroke-width="1.4" stroke-dasharray="3 3"/>
      <path d="M52 34 l12 -8 l2 3 l-12 8 z" fill="#fff" stroke="#2f5d9b"/><path d="M78 40 h16" stroke="var(--vel)" stroke-width="1.6" stroke-dasharray="4 3"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: s.straight ? 'Straight across' : 'Across, and carried along',
      title: s.straight ? `Steer upstream at ${num(s.alpha, 1)}° to the bank, at ${tr(s.V)} m s⁻¹.` : s.drift === 0 ? 'It lands directly opposite A.' : `It lands ${tr(Math.abs(s.drift))} m ${s.drift > 0 ? 'down' : 'up'}stream.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
