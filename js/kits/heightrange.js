// kits/heightrange.js — higher than it goes far: a projectile's greatest
// height against its range, wired for the app. The engine is
// js/core/heightrange.js and the stage js/render/heightrange.js; this file says
// which boxes to show, reads them, and lays out what the engine answered
// (rule 4). See design/components.md.

import { solveHeightRange, heightRangeWorking } from '../core/heightrange.js';
import * as stage from '../render/heightrange.js';
import { T, num } from '../notation.js';

export const heightrange = {
  id: 'heightrange',
  verb: 'Launch it',
  voice: {
    h: 'Higher than it goes far',
    sub: 'A projectile from level ground: its range and its greatest height in terms of the speed and the angle, and every angle at which it goes higher than it goes far. Give one throw to draw.',
  },
  fields: [
    { key: 'u', col: 'throw', label: 'Speed of projection (m s⁻¹)', placeholder: '—', hint: 'Sets the size of the drawing; the angles found do not depend on it.' },
    { key: 'theta', col: 'throw', label: 'Angle above the horizontal (°)', placeholder: '—', hint: 'The throw to draw: try either side of the angle found.' },
    { key: 'ratio', col: 'throw', label: 'Higher than this many times the range', placeholder: '1', hint: 'Blank: the range itself.' },
  ],
  cols: { throw: 'The throw' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(v) { return { u: v.u, theta: v.theta, ratio: v.ratio, g: v.g }; },
  solve: solveHeightRange,
  working: (solved) => heightRangeWorking(solved),
  render: stage.render,

  hud(f, t) {
    const r = f.pos(t), v = f.vel(t);
    return {
      left: [
        { k: 'Across', v: num(r.x, 2), unit: 'm', hue: 'disp' },
        { k: 'Height', v: num(r.y, 2), unit: 'm', hue: 'disp' },
        { k: 'Vertical velocity', v: num(v.y, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Speed', v: num(f.speed(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Across dashed, up solid (rule 2). */
  graphs(f, t, P) {
    const two = (fx, fy, c) => [
      { label: 'across', tag: T`x`, fn: fx, color: c, dash: [6, 4] },
      { label: 'up', tag: T`y`, fn: fy, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: two((tt) => f.pos(tt).x, (tt) => f.pos(tt).y, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: two((tt) => f.vel(tt).x, (tt) => f.vel(tt).y, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: two(() => 0, () => -f.params.g, P.acc) },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="54" width="120" height="6" fill="#7c9a63" opacity="0.7"/>
      <path d="M8 54 Q60 -10 112 54" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4"/>
      <path d="M10 54 Q24 -30 38 54" fill="none" stroke="var(--disp)" stroke-width="2.2"/>
      <path d="M24 54 V10" stroke="var(--disp)" stroke-width="1.4"/><path d="M10 58 H38" stroke="var(--disp)" stroke-width="1.4"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Height against range',
      title: `Higher than it goes far for every angle above ${num(s.thStar, 1)}°.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
